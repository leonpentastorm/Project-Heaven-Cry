// Casting NPC faces (spec: Character portraits are cards): every NPC shows a card from the same pool players pick
// from. A card a player has taken is theirs: any NPC that would show it gets another card that fits the same role
// instead (as Pathfinder: Kingmaker does). An NPC with no portrait of its own is cast from the pool by role.
// Pure and deterministic: every player's screen casts the same faces from the same state.
import type { GameState } from '@engine';
import PD from './protodata.json';

interface Card { id: string; img: string; skill?: string | null; tags?: string[]; archetype?: string | null }
const POOL: Card[] = (PD as any).portraits;
const THING_KINDS = new Set(['robot', 'drone', 'machine', 'beast']);
const NOT_PEOPLE = /\b(drone|turret|bot|robot|mech|rats?|dogs?|hound|beast|swarm|spider|creature|machine|camera|vehicle)\b/i;

/** What kind of person each historical skill's painting shows (for cards without tags of their own). */
const SKILL_ROLES: Record<string, string[]> = {
  durability: ['soldier', 'guard', 'tank', 'veteran'], 'pain-threshold': ['soldier', 'veteran', 'labourer'], sensory: ['scout', 'hunter', 'medic'],
  'raw-power': ['labourer', 'thug', 'melee', 'dockworker'], guts: ['soldier', 'melee', 'raider'], intimidation: ['thug', 'enforcer', 'guard', 'gang'],
  athletics: ['scout', 'runner', 'melee'], dexterity: ['gunner', 'soldier', 'sniper'], 'reaction-speed': ['duellist', 'gunner', 'pilot'],
  ingenuity: ['thief', 'smuggler', 'spy'], proficiency: ['engineer', 'mechanic', 'tech', 'crew'], vigilant: ['scout', 'guard', 'sentry'],
  'brain-power': ['scholar', 'caster', 'sigil'], rumination: ['scholar', 'clerk', 'archivist'], eloquence: ['merchant', 'diplomat', 'face'],
  visualization: ['artist', 'caster', 'sigil'], analysis: ['investigator', 'analyst', 'officer', 'doctor'], charisma: ['merchant', 'face', 'noble', 'performer'],
  empathy: ['healer', 'medic', 'civilian'], camaraderie: ['medic', 'soldier', 'civilian', 'cadet'], implication: ['spy', 'noble', 'schemer'],
  'will-power': ['caster', 'soul', 'monk'], 'lore-master': ['scholar', 'occult', 'priest'], composure: ['officer', 'guard', 'pilot'],
  faith: ['priest', 'faith', 'nun'], conscience: ['priest', 'noble', 'judge'], authority: ['officer', 'captain', 'commander', 'boss'],
};
const tagsOf = (c: Card) => (c.tags && c.tags.length ? c.tags : SKILL_ROLES[(c.skill || '').replace(/_/g, '-')] || []);

/** Role words an NPC's name, tier and weapon suggest. */
const WORDS: [RegExp, string[]][] = [
  [/guard|sentry|watch|security|warden/, ['guard', 'soldier', 'sentry']], [/soldier|trooper|rifleman|infantry|private|corporal|legion/, ['soldier']],
  [/sergeant|captain|colonel|lieutenant|officer|commander|major|chief/, ['officer', 'captain', 'commander']],
  [/engineer|mechanic|tech|crew|pilot|operator/, ['engineer', 'mechanic', 'crew', 'pilot']], [/medic|doctor|nurse|surgeon|healer/, ['medic', 'healer', 'doctor']],
  [/priest|nun|sister|brother|father|cleric|saint|preacher|faith/, ['priest', 'faith', 'nun']], [/merchant|trader|vendor|shop|broker|bartender|barkeep/, ['merchant', 'face', 'civilian']],
  [/thief|smuggler|pickpocket|rogue|cutpurse/, ['thief', 'smuggler']], [/spy|agent|informant/, ['spy', 'agent']], [/thug|bruiser|raider|bandit|ganger|enforcer|heavy/, ['thug', 'raider', 'enforcer', 'gang']],
  [/scholar|clerk|archivist|professor|teacher|scribe/, ['scholar', 'clerk', 'archivist']], [/hunter|scout|ranger|tracker|sniper/, ['hunter', 'scout', 'sniper']],
  [/noble|lord|lady|baron|countess|duke/, ['noble']], [/witch|occult|mystic|oracle|seer/, ['occult', 'caster']], [/caster|mage|sigil|evoker|emanator/, ['caster', 'sigil', 'soul']],
  [/worker|labourer|laborer|dock|miner|farmer|civilian|refugee|villager|kid|child/, ['civilian', 'labourer']],
];
export function npcTags(name: string, tier?: string, weapon?: string): string[] {
  const n = (name || '').toLowerCase(), out = new Set<string>();
  if (NOT_PEOPLE.test(n)) return ['thing'];
  for (const [re, t] of WORDS) if (re.test(n)) t.forEach((x) => out.add(x));
  if (tier === 'boss' || tier === 'elite') out.add('officer');
  if (/rifle|pistol|smg|carbine|shotgun|gun/.test(weapon || '')) out.add('soldier');
  if (!out.size) out.add('civilian');
  return [...out];
}

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
/** The cards players hold (their portraits), as image URLs. */
export function takenCards(g: GameState | null): Set<string> { return new Set(Object.values(g?.characters || {}).map((c) => c.portrait).filter(Boolean)); }

/**
 * The face an NPC shows. `current` is its own portrait (an image URL), if it has one; `key` is anything stable for the
 * NPC (its id); `tags` the roles it plays. A portrait a player holds, or none, is cast from the pool: the best-fitting
 * free card, the same one on every screen.
 */
export function npcFace(g: GameState | null, key: string, current: string | null | undefined, tags: string[], taken = takenCards(g), used?: Set<string>): string {
  if (current && !taken.has(current)) return current;
  // Things that aren't people (drones, turrets, beasts) keep their own art, or none.
  if (!current && tags.includes('thing')) return '';
  { const kept = KEPT.get((g?.code || '') + '|' + key); if (kept && !taken.has(kept)) return kept; } // once cast, kept (see KEPT)
  // Keep the role of the card it lost: a guard stays a guard.
  const lost = current ? POOL.find((c) => c.img === current) : null, want = new Set([...tags, ...(lost ? tagsOf(lost) : [])]);
  const score = (c: Card) => tagsOf(c).filter((t) => want.has(t)).length;
  // Rank every free card by fit, then by a hash of (NPC, card): taking or freeing some other card never changes the
  // pick, and two NPCs on one screen avoid sharing a face while there are cards to go round.
  const pickFrom = (skip: Set<string>) => { let pick: Card | null = null, ps = -1, ph = -1;
    for (const c of POOL) { if (taken.has(c.img) || skip.has(c.img)) continue; const sc = score(c), h = hash(key + '|' + c.id); if (sc > ps || (sc === ps && h > ph)) { pick = c; ps = sc; ph = h; } }
    return pick; };
  const pick = (used && pickFrom(used)) || pickFrom(new Set());
  return pick ? pick.img : current || '';
}

/** Cast a whole screen's NPCs at once, in a fixed order, so no two share a face while cards last. */
/** The face each NPC was given, by game and NPC: once cast, a face is kept (Leon, 11 Nov 2026: portraits changed between
 *  turns and scenes, because the pick depended on who else was on screen, and fog of war changes that every turn). */
const KEPT = new Map<string, string>();
export function castMany(g: GameState | null, list: { key: string; current: string | null | undefined; tags: string[] }[], taken = takenCards(g)): Map<string, string> {
  const out = new Map<string, string>(), used = new Set<string>(), room = (g?.code || '') + '|';
  for (const n of list) if (n.current && !taken.has(n.current)) used.add(n.current);
  // Faces already given come first, so a newcomer never takes one.
  for (const n of list) { const k = KEPT.get(room + n.key); if (k && !(n.current && !taken.has(n.current)) && !taken.has(k)) { used.add(k); out.set(n.key, k); } }
  for (const n of [...list].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))) {
    if (out.has(n.key)) continue;
    const f = npcFace(g, n.key, n.current, n.tags, taken, used); if (f) used.add(f); out.set(n.key, f);
    if (f && f !== n.current) { if (KEPT.size > 4000) KEPT.clear(); KEPT.set(room + n.key, f); }
  }
  return out;
}

/** A fight's units with every non-player face cast (images as URLs). Returns the same fight when nothing changes. */
export function castFight<T extends { units: any[] }>(g: GameState | null, cb: T | null | undefined, art: (n: string) => string): T | null | undefined {
  if (!cb) return cb;
  // World Play 1.7: robots, drones, machines and beasts keep their own art (a robot looks like a robot); only people are cast.
  const npcs = cb.units.filter((u) => u.side !== 'pc' && !THING_KINDS.has(u.kind));
  const faces = castMany(g, npcs.map((u) => ({ key: u.npcId || u.id, current: (u.img && (art(u.img) || u.img)) || null, tags: npcTags(u.name, u.tier, u.weapon) })));
  let changed = false;
  const units = cb.units.map((u) => { if (u.side === 'pc' || THING_KINDS.has(u.kind)) return u; const img = faces.get(u.npcId || u.id) || ''; if (img === (u.img || '')) return u; changed = true; return { ...u, img }; });
  return changed ? { ...cb, units } : cb;
}
