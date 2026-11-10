// Calls on the combat screen (the nine talking skills' actions in a fight): the Calls tab's chips, what a picked Call
// still needs from the map, its preview in words and its reach on the grid. Every cost, range, step text, save TN and
// refusal is the engine's (callPad, previewCall): this module only arranges them.
//
// Action id: cl:<call id>   (a Call picked on the Calls tab; Confirm sends combat/call)
import { callPad, previewCall, dist, type CallPadEntry, type CallPreview } from '@engine';

export const CL = 'cl:';
export const callAction = (id: string) => CL + id;
export const parseCall = (a: string | null | undefined): string | null => (a && a.startsWith(CL) ? a.slice(CL.length) : null);

const SAVE_NAME: Record<string, string> = { body: 'Body', brain: 'Brain', heart: 'Heart' };
const AIM_WORD: Record<string, string> = { ally: 'an ally', enemy: 'an enemy', 'self-or-ally': 'you or an ally' };
const tiles = (n: number) => n + (n === 1 ? ' tile' : ' tiles');

export interface CallChip {
  key: string; id: string; action: string; name: string; skillName: string; ap: number; apText: string; range: number; reach: string; step: number; stepText: string;
  /** the text of the step the speaker has */ text: string; ok: boolean; why: string; aim: string; aimWord: string; kind: string;
  /** a hindering Call's save and its TN from this speaker ('' when it has none) */ save: string;
  /** the next step and the points it opens at ('' at the last) */ next: string; reaction: boolean; free: boolean;
  /** everything, for the hover */ title: string;
}
const chipOf = (e: CallPadEntry): CallChip => {
  const why = e.ok ? '' : (e.why || 'Not now.').replace(/\.+$/, '') + '.';
  const save = e.save ? SAVE_NAME[e.save.family] + ' save, TN ' + e.save.tn : '';
  const nx = e.steps.find((s) => !s.has), next = nx ? 'At ' + nx.at + ' ' + e.skillName + ': ' + nx.text : '';
  const apText = e.free ? 'free' : e.ap + ' AP', reach = tiles(e.range);
  return { key: e.id, id: e.id, action: callAction(e.id), name: e.name, skillName: e.skillName, ap: e.ap, apText, range: e.range, reach, step: e.step, stepText: 'STEP ' + e.step, text: e.text, ok: e.ok, why,
    aim: e.aim, aimWord: AIM_WORD[e.aim] || e.aim, kind: e.kind, save, next, reaction: e.reaction, free: e.free,
    title: e.name + ' (' + e.skillName + ') · ' + apText + ' · within ' + reach + ' · to ' + (AIM_WORD[e.aim] || e.aim) + '. ' + e.text + (save ? ' ' + save + '.' : '') + (next ? ' ' + next : '') + (why ? ' (' + why + ')' : '') };
};
/** The Calls this unit can make (one chip per Call it has a point for), as the engine lists them. Empty: no Calls tab. */
export function callChips(g: any, cb: any, u: any): CallChip[] {
  if (!cb || !u || u.side !== 'pc' || u.companion) return [];
  try { return callPad(cb, u, g).map(chipOf); } catch { return []; }
}
/** The Calls tab's rows for the action list: [id, label, cost, text, why]. */
export function callItems(g: any, cb: any, u: any): [string, string, string, string, (string | null)?][] {
  return callChips(g, cb, u).map((c) => [c.action, c.name, c.apText + ' · ' + c.reach, c.text + (c.save ? ' ' + c.save + '.' : ''), c.ok ? null : c.why]);
}

// ---------- Order's things ----------
/** What an Order can tell an ally to do: [id, label, what it means, the step it opens at]. */
export const ORDER_THINGS: [string, string, string, number][] = [
  ['reload', 'RELOAD', 'They reload now, for none of their AP.', 1], ['stand', 'STAND UP', 'They stand up now, for none of their AP.', 1],
  ['pickup', 'PICK UP', 'They pick up the pile under or next to them, for none of their AP.', 1], ['move', 'MOVE', 'They move to the tile you name, as far as 1 AP walks them.', 2],
];
/** How many things one Order holds at this step (two at step 3). */
export const orderMax = (step: number) => (step >= 3 ? 2 : 1);
/** The picked things, cleaned for this step (move only from step 2; one thing, two at step 3), in the order picked. */
export function orderPicks(picked: string[] | null | undefined, step: number): string[] {
  const ok = (picked || []).filter((x, i, a) => a.indexOf(x) === i && ORDER_THINGS.some(([id, , , at]) => id === x && step >= at));
  return ok.slice(-orderMax(step));
}
/** Toggle one thing: picking past the limit drops the oldest pick. */
export function orderToggle(picked: string[] | null | undefined, id: string, step: number): string[] {
  const cur = orderPicks(picked, step);
  return cur.includes(id) ? cur.filter((x) => x !== id) : orderPicks([...cur, id], step);
}
export const orderOpt = (picked: string[] | null | undefined, step: number): string => orderPicks(picked, step).join('+');

// ---------- what a picked Call needs from the map ----------
/** Whether this Call takes a tile: 'need' (Order's move), 'may' (Cue's step from step 2, Warn's named tile), or null. */
export function callTile(id: string, step: number, opt: string): 'need' | 'may' | null {
  if (id === 'call.order') return opt.split('+').includes('move') ? 'need' : null;
  if (id === 'call.cue') return step >= 2 ? 'may' : null;
  if (id === 'call.warn') return 'may';
  return null;
}
/** May this unit be the Call's target, by its aim (the engine still checks range and the rest)? */
export function callTakes(aim: string, me: any, u: any): boolean {
  if (!u || u.dead) return false;
  if (aim === 'enemy') return u.side !== me.side;
  if (u.side !== me.side) return false;
  return u.id !== me.id || aim === 'self-or-ally';
}
/** What to ask for next, in words (null: nothing more is needed). */
export function callPrompt(c: CallChip, have: { target?: any; tile?: string | null }, opt: string): string | null {
  if (c.id === 'call.order' && !opt) return 'Pick what to order below.';
  if (!have.target && c.aim !== 'self-or-ally') return c.aim === 'enemy' ? 'Click an enemy within ' + c.reach + '.' : 'Click an ally within ' + c.reach + '.';
  if (callTile(c.id, c.step, opt) === 'need' && !have.tile) return 'Now click the tile they move to.';
  return null;
}
/** The engine's preview of the Call (never throws). */
export function callPreviewOf(g: any, cb: any, u: any, id: string, args: { targetId?: string; tile?: string | null; opt?: string | null }): CallPreview {
  try { return previewCall(cb, u, id, { ...(args.targetId ? { targetId: args.targetId } : {}), ...(args.tile ? { tile: args.tile } : {}), ...(args.opt ? { opt: args.opt } : {}) }, g); }
  catch (e) { return { ok: false, why: String((e as any)?.message || e), id, ap: 0, range: 0, level: 0, step: 0, kind: 'helping', aim: 'ally', target: null, react: false, notes: [] }; }
}
/** The preview as lines for the selected card: its notes, the save and its TN, the AP it gives and when. */
export function callLines(cb: any, pv: CallPreview | null): { notes: string[]; save: string; gives: string } {
  const out = { notes: [] as string[], save: '', gives: '' };
  if (!pv) return out;
  const nameOf = (id: string) => cb.units.find((x: any) => x.id === id)?.name || id;
  out.notes = [...(pv.notes || [])];
  if (pv.save) out.save = nameOf(pv.save.unit) + ' rolls a ' + SAVE_NAME[pv.save.family] + ' save against TN ' + pv.save.tn;
  if (pv.gives) out.gives = nameOf(pv.gives.unit) + ' gets ' + pv.gives.ap + ' AP ' + pv.gives.when;
  return out;
}
/** The tiles a Call reaches from the speaker (its own tile included: a Call to yourself). */
export function callReach(cb: any, u: any, range: number): Set<string> {
  const out = new Set<string>(); if (!cb || !u || !cb.map) return out;
  for (let y = 0; y < cb.map.h; y++) for (let x = 0; x < cb.map.w; x++) { const k = x + ',' + y; if (dist(u.pos, k) <= range) out.add(k); }
  return out;
}
