// The Narrator fallback (plan 4.3). The engine owns numbers; the Narrator owns judgement. Whatever an item does that
// the engine doesn't run reaches the Narrator, cheaply:
//  - in a fight, one short line in cb.notes (it rides the single end-of-fight call, combatReport);
//  - in the story, a Pending rulings entry (g.story.rulings), sent in the next turn prompt only while non-empty;
//  - in every prompt, characterBrief lists items as "Name [perk:id] (II)" with a "*" when the Narrator rules part of it,
//    and brief() remainders where a lane wrote one; the full text is one wiki_lookup away.
import type { Combat, Unit } from '../combat';
import type { Character } from '../character';
import type { Holder, ItemInfo, PendingRuling } from './types';
import { handlerOf, ownerOf, holdersOf, boundGame } from './hooks';
import { rawItem } from './collect';
import { overworld } from '../kit';

const KIND_TAG: Record<string, string> = { perk: 'PERK', trait: 'TRAIT', class: 'CLASS', skill: 'SKILL' };
const short = (s: string, n = 220) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const whoOf = (h: Holder) => h.c?.name || h.u?.name || 'someone';

/** One line for the Narrator about an item that fired: in a fight cb.notes, on the story side a pending ruling. */
export function note(h: Holder, text: string): void {
  if (h.cb && !overworld(h.cb)) { noteFight(h.cb, h, text); return; }
  const g = h.g ?? boundGame(); if (g && h.c) pendRuling(g, h.c, h.key, text);
}
export function noteFight(cb: Combat, h: Pick<Holder, 'key' | 'kind' | 'info' | 'c' | 'u'>, text: string) {
  const line = KIND_TAG[h.kind] + ' ' + h.info.name + ' (' + h.key + ', ' + (h.c?.name || h.u?.name || '?') + ', r' + cb.round + '): ' + short(text) + ' — yours to rule';
  const notes = (cb.notes ||= []); if (!notes.includes(line)) notes.push(line);
}
/** A story item use or effect the Narrator must rule (refunded if it says no: perkRulings). */
export function pendRuling(g: any, c: Character, key: string, text: string, entryId?: string): PendingRuling {
  const list: PendingRuling[] = ((g.story ||= {}).rulings ||= []);
  const r: PendingRuling = { id: 'r' + (++g.seq), charId: c.id, key, text: short(text, 300), ...(entryId ? { entryId } : {}), scene: g.story.scene?.n };
  list.push(r); if (list.length > 12) list.splice(0, list.length - 12);
  g.story.needs = true;
  return r;
}
// ---------- story lines (the game's push is injected by game.ts, so this module needs no game import) ----------
let poster: ((g: any, e: any) => string) | null = null;
export const setStoryPoster = (f: (g: any, e: any) => string) => { poster = f; };
/** Post a story line for an item use: a player line headed "[Name · key]", private to the owner (and the Narrator) when
 * asked. Returns the entry id. */
/** The label of the action being run (runPerkAction sets it), so a story line is headed "MPAT · Manifest the twin". */
let acting: string | null = null;
export const actingAs = (label: string | null) => { const was = acting; acting = label; return was; };
/** An action label as a heading: no trailing ellipsis or AP note ("Open Hand: offer mercy…" → "Open Hand: offer mercy"). */
const asHead = (label: string) => label.replace(/…$/, '').replace(/\s*\((?:\d+ AP|all AP)\)$/, '').trim();
/** A story line from an item use. Players see "Name · action label" and the text; the item key rides as ref (never
 *  shown to players: the Narrator's transcript tags the line with it, for its rulings and wiki lookups). */
export function postStory(h: Holder, text: string, opts: { private?: boolean; kind?: string } = {}): string | null {
  const g = h.g ?? boundGame(); if (!g || !poster || !h.c) return null;
  return poster(g, { kind: opts.kind || 'player', who: h.c.owner, head: h.c.name + ' · ' + asHead(acting || h.info.name), charId: h.c.id, ref: h.key, text, ...(opts.private ? { to: h.c.owner } : {}) });
}

/** The Pending rulings block for the next turn prompt (empty string when there is nothing owed). */
export function rulingsPrompt(g: any): string {
  const list: PendingRuling[] = g?.story?.rulings || []; if (!list.length) return '';
  return 'Pending rulings (perks and traits; answer each with perkRulings {id, accepted} where it asks for a yes or no):\n' +
    list.map((r) => '- ' + r.id + ' ' + (g.characters?.[r.charId]?.name || r.charId) + ' [' + r.key + ']: ' + r.text).join('\n');
}

/** Effects of an item the engine doesn't run (the gaps), as indices. */
export const gapsOf = (info: ItemInfo) => info.effects.map((_, i) => i).filter((i) => ownerOf(info, i) === 'gap');
/** Does the Narrator rule any part of this item (narrator ops, listed effects, gaps, or an action run on its text)? */
export function narratorPart(info: ItemInfo): boolean {
  return info.effects.some((_, i) => ['narrator', 'gap', 'action'].includes(ownerOf(info, i))) || (info.effects.length === 0 && !handlerOf(info.key));
}
/** The Narrator-ruled remainder for the brief: a lane's brief(), else null (fully engine-run) or '' (see the wiki). */
export function briefOf(h: Holder): string | null {
  const hd = handlerOf(h.key);
  if (hd?.brief) return hd.brief(h);
  // an item written in data only (engine foundations 3) keeps its Narrator line in its data: `brief`
  const d = rawItem(h.key)?.brief; if (typeof d === 'string') return d || null;
  return narratorPart(h.info) ? '' : null;
}
/** At the start of a fight: one line per fighter naming the items whose effects the engine won't run (so the Narrator
 * can rule them after the fight if they mattered). Never silent; one line each, ids only. */
export function noteFallbacks(cb: Combat) {
  for (const u of cb.units) {
    if (!u.charId && !u.held) continue;
    const gaps = holdersOf({ u, cb }).filter((h) => gapsOf(h.info).length).map((h) => h.key);
    if (gaps.length) (cb.notes ||= []).push('Not engine-run for ' + u.name + ' (rule from the wiki if it mattered): ' + gaps.join(', '));
  }
}
export type { Unit };
void whoOf;
