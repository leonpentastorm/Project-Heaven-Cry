// The Narrator's wiki (spec: The Narrator's wiki). Every rule-bearing thing in the data pack has an entry the AI
// Narrator can look up by key ("weapon:service_pistol", "condition:bleeding") when a moment needs it, instead of
// carrying all of it in every prompt. Entries describe what a thing is and does in words; the engine still owns
// every number in play, so entries carry only the few numbers that help the Narrator describe it.
import { SKILLS, TRAITS, PERKS, WEAPONS, CLASSES, ENEMIES, ITEM, SKILL } from './data';
import { OBJECT_KINDS } from './objects';
import conditionsJ from '../../../data/conditions.json';
import patronsJ from '../../../data/patrons.json';
import classesJ from '../../../data/classes.json';

export interface WikiEntry { key: string; name: string; text: string }
const str = (x: any) => (x == null ? '' : typeof x === 'string' ? x : JSON.stringify(x));
const line = (...parts: any[]) => parts.map(str).filter(Boolean).join(' ');

function build(): WikiEntry[] {
  const out: WikiEntry[] = [];
  const add = (key: string, name: string, text: string) => out.push({ key, name, text: text.trim() });
  for (const s of SKILLS as any[]) add('skill:' + s.id, s.name, line(s.name + ' (' + s.core + ', ' + s.attribute + ').', s.summary,
    s.voice ? 'Voice: ' + s.voice.persona + ' Wants: ' + s.voice.wants + ' Style: ' + s.voice.style : '',
    s.overreach ? 'Overreach at ' + s.overreach.from_points + '+: ' + (s.overreach.text || s.overreach.trigger || '') : ''));
  for (const t of TRAITS as any[]) add('trait:' + t.id, t.name, line(t.name + '.', t.text, t.narrator_hook ? 'Hooks: ' + t.narrator_hook : ''));
  for (const p of PERKS as any[]) if (p.tier !== 'ultimate') add('perk:' + p.id, p.name, line(p.name + ' (' + p.tier + (p.skills?.length ? ', ' + p.skills.map((x: string) => SKILL[x]?.name || x).join(' + ') : '') + ').', p.text, p.deed ? 'Deed: ' + p.deed : ''));
  for (const w of WEAPONS as any[]) add('weapon:' + w.id, w.name, line(w.name + ': a ' + (w.hands || '') + ' ' + w.category + (w.ammo ? ' firing ' + w.ammo : '') + ', used with ' + (SKILL[w.skill]?.name || w.skill) + '.',
    w.grants ? 'Grants ' + w.grants.name + ': ' + w.grants.text : '', w.text, w.lore ? 'Lore: ' + w.lore : '', w.price_credits ? 'Price ' + w.price_credits + ' credits.' : ''));
  for (const [id, it] of Object.entries(ITEM) as [string, any][]) add('item:' + id, it.name, line(it.name + ' (' + (it.category || 'item') + (it.slot ? ', ' + it.slot.replace(/_/g, ' ') : '') + ').', it.text, it.price_credits ? 'Price ' + it.price_credits + ' credits.' : ''));
  for (const c of (conditionsJ as any).items) add('condition:' + c.id, c.name, line(c.name + ' (' + c.kind + ').', c.text));
  for (const c of CLASSES as any[]) add('class:' + c.id, c.name, line(c.name + ' (' + c.core + ' class).', c.tagline, 'Signature skills: ' + (c.signature || []).map((x: string) => SKILL[x]?.name || x).join(', ') + '.'));
  for (const c of (classesJ as any).advanced || []) add('class:' + c.id, c.name, line(c.name + ' (advanced; from ' + (c.parents || []).join(' and ') + ').', c.summary, c.tutor ? 'Tutor: ' + c.tutor : ''));
  for (const p of (patronsJ as any).items) add('patron:' + p.id, p.name, line(p.name + ' (' + p.domain + ').', 'Costume: ' + str(p.costume), 'Tenets: ' + (p.tenets || []).join('; ') + '.', 'Taboos: ' + (p.taboos || []).join('; ') + '.', 'Blessings: ' + (p.blessings || []).map((b: any) => b.name).join(', ') + '.'));
  for (const e of ENEMIES as any[]) add('enemy:' + e.id, e.name, e.name + ' tier enemy. The engine sets its numbers.');
  for (const k of OBJECT_KINDS as any[]) add('object:' + k.id, k.name, line(k.name + '.', k.text));
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
  for (const e of wikiEntries()) (kinds[e.key.split(':')[0]] ||= []).push(e.key.split(':')[1]);
  return kinds;
}
