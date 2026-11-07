// Campaigns (spec: Campaigns): a premade package of zones (maps with notes, objects and points of interest), an arc the
// Narrator steers by (beginning, middle, end, secrets), an opening, a cast and suggested fights. Built-in campaigns live
// in data/campaigns/; a host can load their own file in the same format (docs/design/campaign-format.md).
import { type MapDef, keyOf } from './combat';
import { OBJ } from './objects';
import type { Track } from './music';
import { type Mission, type BoardNpc, validateMissions } from './missions';
import { SKILL, TN_LADDER, ENEMY, WEAPON } from './data';
import { CASTER } from './ai-sigil';
import m813J from '../../../data/campaigns/m813.json';
import godplotJ from '../../../data/campaigns/godplot.json';
import curseJ from '../../../data/campaigns/curse.json';
import summoningJ from '../../../data/campaigns/summoning.json';
import ownJ from '../../../data/campaigns/own.json';

export interface CampaignObject {
  kind: string; at: string; name?: string; text?: string; hidden?: boolean; locked?: boolean;
  /** Art: a sprite asset id (else the campaign's sprite for its kind), its box in tiles if bigger than one, an NPC portrait. */
  sprite?: string; spriteBox?: { w: number; h: number; dx: number; dy: number }; portrait?: string;
  approaches?: { label: string; skills: string[]; tn: number; stakes: string; success?: '' | 'remove' | 'open' | 'reveal' | 'disarm' }[];
}
export interface CampaignZone {
  id: string; name: string; summary: string; w: number; h: number;
  /** Grid references or ranges ("N1–P6"). */
  solid?: string[]; difficult?: string[]; start: string[]; enemyStart?: string[];
  notes?: { at: string; text: string }[]; objects?: CampaignObject[];
  /** Where you can go from here (the Narrator moves the party with travel). */
  exits?: { to: string; at?: string; text: string }[];
  /** Dark zones halve sight except near light sources (spec: Vision). */
  dark?: boolean;
  /** People and enemies standing on this zone's overworld map (spec: Overworld rounds). Facing: N, E, S or W. */
  npcs?: { name: string; side: 'hostile' | 'neutral'; tier: string; weapon: string; at: string; portrait?: string; facing?: 'N' | 'E' | 'S' | 'W'; kind?: string; tags?: string[] }[];
  /** Art: the map painting under the grid and the zone's banner (asset ids). */
  art?: { map?: string; banner?: string };
  /** Area and fight music for this zone (spec: Music). */
  music?: { ambient?: Track; combat?: Track };
  /** Zone tags items read (rules 1.3): free tags, terrain (open, forest, urban…), inside a city or not, urban,
   * frightening (fear), the upper realm, the faction that holds it. */
  tags?: string[]; terrain?: string; in_city?: boolean; urban?: boolean; fear?: boolean; upper_realm?: boolean; faction?: string;
}
export interface Campaign {
  id: string; title: string; short: string; kicker: string; art?: string; artNote?: string; focus?: string;
  /** What the players read in the Room. */
  pitch: string[]; meta: string; tone?: string;
  /** Narrator only. */
  arc: { beginning: string; middle: string; end: string }; secrets?: string[]; opening: string;
  cast?: { name: string; role: string; text: string }[];
  encounters?: { name: string; zone: string; when: string; difficulty: string; music?: Track; enemies: { name: string; tier: string; weapon: string; at?: string }[] }[];
  startZone: string; zones: CampaignZone[];
  /** Extra lore the Narrator reads (built-in campaigns name repo lore docs here; custom ones can inline text). */
  lore?: string;
  /** Which World Bible chunks and lore docs the Narrator reads (keys like "truth", "worlds/timeline", "sector-earth"; docs/design/campaign-format.md). Default: truth and worlds. */
  narratorLore?: string[];
  /** Plot essentials pinned in the Narrator's memory from the start (spec: The Narrator's memory). */
  pins?: string[];
  /** Acts of a long campaign: the Narrator's context carries the current act's zones and fights in full and only a
   * line for the rest (spec: The Narrator's memory). The act is the one holding the party's zone. */
  acts?: { id: string; title: string; summary: string; zones: string[] }[];
  /** A campaign the host loaded from a file: never refreshed from the built-ins. */
  custom?: boolean;
  /** false hides a built-in campaign from the Room (sketches kept for later). */
  listed?: boolean;
  /** Art: a sprite per object kind ("door:open" for an open door), portraits by name for NPCs and enemies (a list
   * alternates between same-named enemies), and story moments the Narrator can show (zone-gated spoilers). */
  sprites?: Record<string, string>; portraits?: Record<string, string | string[]>;
  moments?: { id: string; art: string; caption: string; zone?: string; when: string }[];
  /** Campaign-wide music, used where a zone has none (spec: Music). */
  music?: { ambient?: Track; combat?: Track };
  /** Missions and objectives the players can see on the mission board (spec: OOC, missions and end states). */
  missions?: Mission[];
  /** An NPC who offers side jobs in character, for open campaigns. */
  board_npc?: BoardNpc;
  /** Lines shown on the campaign's end screen. */
  credits?: string[];
}

/** "N1–P6", "F4–F5, H2" or "C7" to tile keys. */
export function expandRefs(list: string[] | undefined, w: number, h: number): string[] {
  const out = new Set<string>();
  for (const item of list || []) for (const part of item.split(',')) {
    const [a, b] = part.split(/[–-]/).map((r) => keyOf(r.trim()));
    if (!a) continue;
    const [x1, y1] = a.split(',').map(Number), [x2, y2] = (b || a).split(',').map(Number);
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) if (x < w && y < h) out.add(x + ',' + y);
  }
  return [...out];
}

/** A zone as the engine's map. Cover comes from objects (crates, pillars…), so the cover lists stay empty. */
export function zoneToMap(z: CampaignZone, names: Record<string, string> = {}): MapDef {
  const keys = (l?: string[]) => expandRefs(l, z.w, z.h);
  return {
    id: z.id, name: z.name, w: z.w, h: z.h, dark: !!z.dark, solid: keys(z.solid), cover: [], full: [], difficult: keys(z.difficult),
    pcStart: keys(z.start), foeStart: keys(z.enemyStart).length ? keys(z.enemyStart) : keys(z.start).map((k) => { const [x, y] = k.split(',').map(Number); return (z.w - 1 - x) + ',' + y; }),
    notes: [...(z.notes || []), ...(z.exits || []).filter((e) => e.at).map((e) => ({ at: e.at!, text: 'Way out: ' + e.text }))],
    objects: [...(z.objects || []).map((o) => ({ ...o })), ...(z.exits || []).filter((e) => e.at).map((e) => ({ kind: 'exit', at: e.at!, name: 'To ' + (names[e.to] || e.to), text: e.text, to: e.to }))] as any,
  };
}

/** Everything wrong with a campaign file, in plain words (empty when it's good). */
export function validateCampaign(c: any): string[] {
  const errs: string[] = [], need = (cond: any, msg: string) => { if (!cond) errs.push(msg); };
  if (!c || typeof c !== 'object') return ['Not a campaign file.'];
  for (const f of ['id', 'title', 'opening', 'startZone']) need(typeof c[f] === 'string' && c[f], 'Missing "' + f + '".');
  need(c.arc && typeof c.arc.beginning === 'string' && typeof c.arc.middle === 'string' && typeof c.arc.end === 'string', 'The arc needs beginning, middle and end.');
  need(Array.isArray(c.zones) && c.zones.length, 'Needs at least one zone.');
  const ids = new Set((c.zones || []).map((z: any) => z.id));
  need(ids.has(c.startZone), 'startZone "' + c.startZone + '" is not a zone.');
  for (const z of c.zones || []) {
    const at = (r: string, what: string) => { const k = keyOf(String(r || '').split(/[–-]/)[0].split(',')[0], { w: z.w, h: z.h } as MapDef); if (!k) errs.push(z.id + ': ' + what + ' "' + r + '" is off the map.'); };
    need(z.id && z.name, 'Every zone needs id and name.');
    need(Number.isInteger(z.w) && Number.isInteger(z.h) && z.w >= 6 && z.h >= 6 && z.w <= 40 && z.h <= 40, z.id + ': size must be 6–40 by 6–40.');
    need(Array.isArray(z.start) && z.start.length, z.id + ': needs start tiles.');
    for (const r of z.start || []) at(r, 'start');
    for (const o of z.objects || []) {
      need(OBJ[o.kind], z.id + ': unknown object kind "' + o.kind + '".'); at(o.at, (o.name || o.kind));
      for (const a of o.approaches || []) {
        need(a.label && Array.isArray(a.skills) && a.skills.length && a.skills.every((s: string) => SKILL[s]), z.id + ': an approach on "' + (o.name || o.kind) + '" has unknown skills.');
        need(TN_LADDER.includes(a.tn), z.id + ': approach "' + a.label + '" needs a TN of 8, 12, 16 or 20.');
      }
    }
    for (const e of z.exits || []) need(ids.has(e.to), z.id + ': exit to unknown zone "' + e.to + '".');
  }
  const track = (t: any, where: string) => { if (t && !(typeof t.yt === 'string' && /^[\w-]{11}$/.test(t.yt) && t.title)) errs.push(where + ': music needs a YouTube id (11 characters) and a title.'); };
  track(c.music?.ambient, 'Campaign ambient'); track(c.music?.combat, 'Campaign combat');
  for (const z of c.zones || []) { track(z.music?.ambient, z.id + ' ambient'); track(z.music?.combat, z.id + ' combat'); }
  for (const e of c.encounters || []) track(e.music, 'Encounter "' + e.name + '"');
  need(c.narratorLore == null || (Array.isArray(c.narratorLore) && c.narratorLore.every((k: any) => typeof k === 'string' && /^[a-z0-9-]+(\/[a-z0-9-]+)?$/.test(k))), 'narratorLore must be a list of lore keys like "truth" or "worlds/timeline".');
  for (const e of c.encounters || []) {
    need(ids.has(e.zone), 'Encounter "' + e.name + '" is in unknown zone "' + e.zone + '".');
    for (const f of e.enemies || []) need(ENEMY[f.tier] && WEAPON[f.weapon], 'Encounter "' + e.name + '": enemy "' + f.name + '" needs a known tier and weapon.');
    for (const f of e.enemies || []) if ((f as any).caster) need(!!CASTER[(f as any).caster] && CASTER[(f as any).caster].tier === f.tier, 'Encounter "' + e.name + '": enemy "' + f.name + '" names an unknown Sigil caster, or one of another tier (enemies.json casters).');
  }
  for (const z of c.zones || []) for (const n of z.npcs || []) if ((n as any)?.caster) need(!!CASTER[(n as any).caster] && CASTER[(n as any).caster].tier === n.tier, z.id + ': npc "' + n.name + '" names an unknown Sigil caster, or one of another tier (enemies.json casters).');
  for (const z of c.zones || []) for (const n of z.npcs || []) need(n && n.name && ['hostile', 'neutral'].includes(n.side) && ENEMY[n.tier] && WEAPON[n.weapon] && n.at, z.id + ': npc "' + (n?.name || '?') + '" needs name, side (hostile or neutral), a known tier and weapon, and at.');
  for (const m of c.moments || []) { need(m && m.id && m.art && m.caption, 'Every moment needs id, art and caption.'); if (m?.zone) need(ids.has(m.zone), 'Moment "' + m.id + '" names unknown zone "' + m.zone + '".'); }
  errs.push(...validateMissions(c));
  return errs;
}

/** The campaigns that ship with the game, in the order the Room offers them. */
export const BUILT_IN_CAMPAIGNS: Campaign[] = [m813J, godplotJ, curseJ, summoningJ, ownJ] as any;
export const builtInCampaign = (id: string): Campaign | null => { const c = BUILT_IN_CAMPAIGNS.find((x) => x.id === id); return c ? JSON.parse(JSON.stringify(c)) : null; };
