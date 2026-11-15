// The camp's starting boon cards, as data (survival-spec 13.8; rules 1.51, drawn on the camp's one screen,
// LoadoutScreen.tsx, after the loadout): three large cards a character (the line glyph, the name, the one sentence with
// its number from data, the line's word in its attribute's ink, the worth against the cap). Every word and number is
// the engine's (loadoutView's `boon` block: startOffer read from what the character holds, relicRow, worthOf).
import { type LoadoutViewV, type LoadoutCardV, START_BOON, SKILLS } from '@engine';
import { ATTR_INK } from './classView';
import { askConfirm } from './dialog';

/** A line's words and its attribute's ink (the alpha skill's attribute), from the data's line map. */
export function lineWord(line: string): { word: string; attr: string; ink: string } {
  const skill = Object.entries(START_BOON.lines).find(([, l]) => l === line)?.[0] || '', s = SKILLS.find((k) => k.id === skill);
  const attr = s?.attribute || '', name = s?.name || skill;
  return { word: (START_BOON.names[line] || line) + ' · ' + name, attr, ink: ATTR_INK[attr] || '#E7EBF3' };
}
export interface CampCardV { i: number; id: string; name: string; text: string; worth: number; worthLine: string; line: string; lineWord: string; ink: string; chosen: boolean }
/** The starting boon cards of the camp's view: each with its line's words and ink. */
export function boonCards(v: LoadoutViewV): CampCardV[] {
  return v.boon.cards.map((k) => { const line = k.lines[0] || '', lw = lineWord(line);
    return { i: k.i, id: k.id, name: k.name, text: k.text, worth: k.worth, worthLine: k.worth + ' of your ' + k.cap, line, lineWord: lw.word, ink: lw.ink, chosen: k.chosen }; });
}

// ---------------------------------------------------------------- the camp as a checklist (rules 1.55 item 49)
// Leon, 15 Nov 2026: "nobody understand shit, i have players only realizing you can take a free weapon 3 runs in". The
// place header is a checklist of what a player does at the camp; every fact is the engine's (`freePicks`, `left`,
// `budget`, `boon`); these only put it in words.
/** A chip of the camp's checklist: its number, title, its state in words, done or still to do, and the section it opens. */
export interface CampCheckV { n: number; key: 'weapon' | 'focus' | 'budget' | 'boon'; title: string; hint: string; state: string; done: boolean; glyph: string; meter?: { left: number; total: number } }
/** The checklist: 1 the free weapon, 2 the free focus (only when the engine offers one), the budget, the starting boon. */
export function campChecklist(v: LoadoutViewV): CampCheckV[] {
  const out: CampCheckV[] = [], f = v.freePicks;
  const pick = (key: 'weapon' | 'focus', title: string, p: typeof f.weapon): CampCheckV =>
    ({ n: out.length + 1, key, title, hint: 'pick one, costs nothing', state: p.open || !p.id ? 'NOT PICKED' : p.name || '', done: !p.open && !!p.id, glyph: !p.open && p.id ? '✓' : '○' });
  out.push(pick('weapon', 'FREE WEAPON', f.weapon));
  if (f.focus.offered) out.push(pick('focus', 'FREE FOCUS', f.focus));
  out.push({ n: out.length + 1, key: 'budget', title: 'BUDGET', hint: 'everything else costs credits', state: v.left + ' of ' + v.budget + ' cr left', done: false, glyph: '', meter: { left: v.left, total: v.budget } });
  if (v.boon.cards.length) { const k = v.boon.cards.find((x) => x.chosen); out.push({ n: out.length + 1, key: 'boon', title: 'STARTING BOON', hint: 'choose one of three', state: k ? k.name : 'NOT CHOSEN', done: !!k, glyph: k ? '✓' : '○' }); }
  return out;
}
/** The one sentence of help under the camp's title. */
export const campHelp = (v: LoadoutViewV): string => 'Before the run: take one free weapon' + (v.freePicks.focus.offered ? ', one free focus' : '') + ' and spend your budget on anything else.';
/** What a free pick's button says: the one taken, a swap, or the first take. */
export function freeAction(c: LoadoutCardV, v: LoadoutViewV, slot: 'weapon' | 'focus'): string {
  if (c.picked) return '✓ YOURS';
  return v.freePicks[slot].id ? 'Swap to this (free)' : 'Take (free)';
}
/** The confirm before moving on with a free pick not taken (null: nothing to ask). `next`: the button goes to the starting
 * boon (not the start). The engine allows starting without; this only asks. */
export function campConfirm(v: LoadoutViewV, next = false): { open: ('weapon' | 'focus')[]; text: string; back: string; go: string } | null {
  if (v.ready) return null;
  const open = (['weapon', 'focus'] as const).filter((k) => v.freePicks[k].offered && v.freePicks[k].open);
  if (!open.length) return null;
  const what = open.map((k) => 'your free ' + k).join(' or ');
  return { open: [...open], text: 'You have not taken ' + what + '. ' + (open.length > 1 ? 'They cost' : 'It costs') + ' nothing.', back: 'Go back and pick',
    go: (next ? 'Go on without ' : 'Start without ') + (open.length > 1 ? 'them' : 'it') };
}

/** Ask before moving on (the camp's header Next, the right panel's Ready) when a free pick is still open, in the house
 * dialog (dialog.tsx askConfirm; the safe answer, Escape and the backdrop included, is Go back and pick, which runs
 * `back`); `then` runs at once when nothing is open, or once the player goes on without. Once passed for the same open
 * picks of the same character it is not asked again. */
let waived = '';
export function campGuard(v: LoadoutViewV | null, next: boolean, then: () => void, back?: (first: 'weapon' | 'focus') => void): void {
  const q = v ? campConfirm(v, next) : null, key = v ? v.me.id + ':' + v.seed + ':' + (q?.open.join() || '') : '';
  if (!q || waived === key) { then(); return; }
  void askConfirm({ title: 'Before you go on', body: q.text, confirm: q.go, cancel: q.back, danger: true }).then((go) => { if (go) { waived = key; then(); } else back?.(q.open[0]); });
}
