// The Narrator's wiki (spec: The Narrator's wiki). Every rule-bearing thing in the data pack has an entry the AI
// Narrator can look up by key ("weapon:service_pistol", "condition:bleeding") when a moment needs it, instead of
// carrying all of it in every prompt. Entries describe what a thing is and does in words; the engine still owns
// every number in play, so entries carry only the few numbers that help the Narrator describe it.
import { SKILLS, TRAITS, PERKS, WEAPONS, CLASSES, ENEMIES, ITEM, SKILL, SIGILS, SCHOOLS, MODULES } from './data';
import { OBJECT_KINDS } from './objects';
import conditionsJ from '../../../data/conditions.json';
import patronsJ from '../../../data/patrons.json';
import classesJ from '../../../data/classes.json';
import sigilsJ from '../../../data/sigils.json';
import enemiesJ from '../../../data/enemies.json';
import { verdictFor } from './effects/coverage';

export interface WikiEntry { key: string; name: string; text: string }
const str = (x: any) => (x == null ? '' : typeof x === 'string' ? x : JSON.stringify(x));
const line = (...parts: any[]) => parts.map(str).filter(Boolean).join(' ');

function build(): WikiEntry[] {
  const out: WikiEntry[] = [];
  const add = (key: string, name: string, text: string) => out.push({ key, name, text: text.trim() });
  for (const s of SKILLS as any[]) add('skill:' + s.id, s.name, line(s.name + ' (' + s.core + ', ' + s.attribute + ').', s.summary,
    s.voice ? 'Voice: ' + s.voice.persona + ' Wants: ' + s.voice.wants + ' Style: ' + s.voice.style : '',
    s.overreach ? 'Overreach at ' + s.overreach.from_points + '+: ' + (s.overreach.text || s.overreach.trigger || '') : ''));
  // Perks, traits and class moves say who runs them (effects/coverage.ts): the Narrator rules only what the engine doesn't.
  const who = (key: string, tier?: string) => '[' + verdictFor(key, tier).label + ']';
  for (const t of TRAITS as any[]) add('trait:' + t.id, t.name, line(t.name + '.', who('trait:' + t.id), t.text, t.narrator_hook ? 'Hooks: ' + t.narrator_hook : ''));
  for (const p of PERKS as any[]) if (p.tier !== 'ultimate') add('perk:' + p.id, p.name, line(p.name + ' (' + p.tier + (p.skills?.length ? ', ' + p.skills.map((x: string) => SKILL[x]?.name || x).join(' + ') : '') + ').', who('perk:' + p.id, p.tier === 'acquired' ? 'II' : p.tier), p.text, p.deed ? 'Deed: ' + p.deed : ''));
  for (const w of WEAPONS as any[]) add('weapon:' + w.id, w.name, line(w.name + ': a ' + (w.hands || '') + ' ' + w.category + (w.ammo ? ' firing ' + w.ammo : '') + ', used with ' + (SKILL[w.skill]?.name || w.skill) + '.',
    w.grants ? 'Grants ' + w.grants.name + ': ' + w.grants.text : '', w.text, w.lore ? 'Lore: ' + w.lore : '', w.price_credits ? 'Price ' + w.price_credits + ' credits.' : ''));
  for (const [id, it] of Object.entries(ITEM) as [string, any][]) add('item:' + id, it.name, line(it.name + ' (' + (it.category || 'item') + (it.slot ? ', ' + it.slot.replace(/_/g, ' ') : '') + ').', it.text, it.price_credits ? 'Price ' + it.price_credits + ' credits.' : ''));
  for (const c of (conditionsJ as any).items) add('condition:' + c.id, c.name, line(c.name + ' (' + c.kind + ').', c.text));
  for (const c of CLASSES as any[]) add('class:' + c.id, c.name, line(c.name + ' (' + c.core + ' class).', c.tagline, 'Signature skills: ' + (c.signature || []).map((x: string) => SKILL[x]?.name || x).join(', ') + '.'));
  for (const c of (classesJ as any).advanced || []) add('class:' + c.id, c.name, line(c.name + ' (advanced; from ' + (c.parents || []).join(' and ') + ').', c.summary, c.tutor ? 'Tutor: ' + c.tutor : ''));
  // Class moves, "class:<classId>.<moveId>", as characterBrief names them.
  for (const c of CLASSES as any[]) for (const r of ['I', 'II', 'III']) for (const m of c.ranks?.[r]?.moves || []) add('class:' + c.id + '.' + m.id, m.name, line(m.name + ' (' + c.name + ' rank ' + r + ').', who('class:' + c.id + '.' + m.id), m.text));
  for (const c of (classesJ as any).advanced || []) for (const m of c.moves || []) add('class:' + c.id + '.' + m.id, m.name, line(m.name + ' (' + c.name + ', advanced).', who('class:' + c.id + '.' + m.id), m.text));
  for (const p of (patronsJ as any).items) add('patron:' + p.id, p.name, line(p.name + ' (' + p.domain + ').', 'Costume: ' + str(p.costume), 'Tenets: ' + (p.tenets || []).join('; ') + '.', 'Taboos: ' + (p.taboos || []).join('; ') + '.', 'Blessings: ' + (p.blessings || []).map((b: any) => b.name).join(', ') + '.'));
  for (const e of ENEMIES as any[]) add('enemy:' + e.id, e.name, e.name + ' tier enemy. The engine sets its numbers.');
  for (const k of OBJECT_KINDS as any[]) add('object:' + k.id, k.name, line(k.name + '.', k.text));
  // Magic (spec: Magic; Sigils rules 1.4, Soul rules 1.2): Sigil words by group, the grammar, Soul schools and modules.
  const sg: any = (sigilsJ as any).grammar || {}, els: any = (sigilsJ as any).elements || {};
  for (const w of SIGILS as any[]) {
    const kind = w.group === 'subject' ? 'Subject, ' + String(w.class).replace('subject_', '') : String(w.group), el = w.element ? els[w.element] : null;
    add('sigil:' + w.id, w.word, line(w.word + ' (Sigil word, ' + kind + '; ' + w.charge + ' charge to draw' + (w.max_copies === 1 ? '; one copy a spell' : '') + ').', w.text,
      el ? 'Looks: ' + el.look + ' Sounds: ' + el.sound : '', w.grand ? 'Grand form: ' + w.grand : ''));
  }
  // The grammar in one entry (sigil:grammar), so the prompt carries one line of it.
  const groups = ['subject', 'reach', 'delivery', 'burst', 'filter'].map((gr) => gr[0].toUpperCase() + gr.slice(1) + ': ' + (SIGILS as any[]).filter((w) => w.group === gr).map((w) => w.word).join(', ')).join('. ');
  add('sigil:grammar', 'Sigil grammar', line('How Sigil words make a spell (rules 1.4).', groups + '.',
    'A spell is 2 to 4 glyphs: one or more Subjects plus at least one other word; at most one Reach word (none = Touch, 1 tile deep); KIN once. Words may repeat (each repeated glyph x0.9 to damage, healing and shields).',
    'Drawing: one glyph on the caster\'s own tile; step and draw again to walk a Line, 2 to 4 tiles in a straight row (diagonals too). Glyphs fade after a few rounds.',
    'Evoking (1 AP): stand at an end or behind it to fire along the Line, beside it to fire across; the Line\'s length is the spell\'s width, the Reach its depth. A finished Line fires back the way the caster walked. Middle glyphs can\'t fire.',
    'Reach: SEEK a straight bolt (cover stops it), ARC a lob over everything, SENSE appears with no sight, RELAY casts from an ally. Delivery: STAY strikes, then leaves a field (full the first time, half after), WAIT a hidden trap, WATCH a turret, TWICE two missiles, PULL, CHAIN, LEECH. Burst: CONDENSE one target, SPREAD 5x5, PUSH a cone.',
    'A Stack (two glyphs on one tile, a perk\'s hook) fires all around its caster. Every save is in the log. Skill unlocks the engine runs: Overclock (one word past Max Sigil words, +2 charge), Twin Draw (two spells for the longer one\'s Glyph AP, once a fight), Proven Formula (a spell Evoked again this fight: 1 AP less), Paint the Field (a free SPREAD or PUSH on a spell with no Burst). The Evoker blade\'s Edge Word: after a hit, the next glyph that turn costs 0 AP.',
    'Spells hit friends too unless KIN is in them; a spell that finds nothing it may affect fizzles. Refused: ' + (sg.refused || []).map((r: any) => r.why).join(' ') ,
    'Starting magic: ' + (sg.starting?.words ?? 2) + ' words that make a spell, one of them a Reach word. Retired 1.2 words and shapes (RETURN, Rings, Stacks) are gone.'));
  // Enemy Sigil casters (enemies.json casters; items 469, 490, 491): what a fight's foe may name by `caster`.
  const casters = ((enemiesJ as any).casters || []) as any[];
  if (casters.length) add('enemy:casters', 'Enemy Sigil casters', line('Enemy Sigil casters (rules 1.4): a foe of the same tier may name one by caster; it fights with an Evoker and these words.',
    casters.map((c) => c.name + ' (' + c.tier + '): ' + (c.sigils || []).map((w: string) => String(w).toUpperCase()).join(', ') + '.').join(' '),
    'COMMAND from an enemy fits its target: it walks a player out of its guards\' reach (up to 3 tiles, never into harm), halts one charging in, makes a shooter drop its weapon, else makes it kneel.'));
  for (const s of SCHOOLS as any[]) add('school:' + s.id, s.name, line(s.name + ' (Soul school, ' + s.base_cost + ' MP base).', s.text));
  for (const m of MODULES as any[]) add('module:' + m.id, m.name, line(m.name + ' (Soul module, ' + m.family + ', +' + m.cost + ' MP).', m.text));
  return out;
}
let cache: WikiEntry[] | null = null;
export const wikiEntries = () => (cache ||= build());
export function wikiLookup(key: string): WikiEntry | null {
  const k = key.trim().toLowerCase();
  return wikiEntries().find((e) => e.key === k) || wikiEntries().find((e) => e.key.split(':')[0] === k.split(':')[0] && e.name.toLowerCase() === k.split(':').slice(1).join(':').trim()) || null;
}
/** The wiki's index: the kinds and how to name an entry (the long id lists live in the entries, not the prompt). */
export function wikiKinds(): Record<string, string[]> {
  const kinds: Record<string, string[]> = {};
  for (const e of wikiEntries()) if (!(e.key.startsWith('class:') && e.key.includes('.')) && e.key !== 'sigil:grammar') (kinds[e.key.split(':')[0]] ||= []).push(e.key.split(':')[1]);
  return kinds;
}
