// Calls on the combat screen (the nine talking skills' actions in a fight): the Calls tab's chips (the row's look: its
// aim, skill and step). A picked Call is on the one action flow (game/actionFlow.ts): what it still needs from the
// map, its preview in words, its reach and what Confirm sends are the engine's descriptor (descriptors.ts).
//
// Action id: cl:<call id>   (the engine's descriptor id)
import { callPad, type CallPadEntry } from '@engine';
import { assetFor } from './faithArt';

export const CL = 'cl:';
const callAction = (id: string) => CL + id;

const SAVE_NAME: Record<string, string> = { body: 'Body', brain: 'Brain', heart: 'Heart' };
const AIM_WORD: Record<string, string> = { ally: 'an ally', enemy: 'an enemy', 'self-or-ally': 'you or an ally' };
/** A Call's painted icon (art/icons/calls/<name>.png, built as call-<name>; the id `call.name_it` is `name-it`), or '' (the chip shows no icon). */
export const callIconKey = (id: string) => 'call-' + id.replace(/^call\./, '').replace(/_/g, '-');
export const callIcon = (id: string): string => assetFor(callIconKey(id)) || '';
const tiles = (n: number) => n + (n === 1 ? ' tile' : ' tiles');

export interface CallChip {
  key: string; id: string; action: string; name: string; skillName: string; ap: number; apText: string; range: number; reach: string; step: number; stepText: string;
  /** the text of the step the speaker has */ text: string; ok: boolean; why: string; aim: string; aimWord: string; kind: string;
  /** a hindering Call's save and its TN from this speaker ('' when it has none) */ save: string;
  /** the next step and the points it opens at ('' at the last) */ next: string; reaction: boolean; free: boolean;
  /** the painted icon's URL ('' when there is none) */ icon: string;
  /** everything, for the hover */ title: string;
}
const chipOf = (e: CallPadEntry): CallChip => {
  const why = e.ok ? '' : (e.why || 'Not now.').replace(/\.+$/, '') + '.';
  const save = e.save ? SAVE_NAME[e.save.family] + ' save, TN ' + e.save.tn : '';
  const nx = e.steps.find((s) => !s.has), next = nx ? 'At ' + nx.at + ' ' + e.skillName + ': ' + nx.text : '';
  const apText = e.free ? 'free' : e.ap + ' AP', reach = tiles(e.range);
  return { key: e.id, id: e.id, action: callAction(e.id), name: e.name, skillName: e.skillName, ap: e.ap, apText, range: e.range, reach, step: e.step, stepText: 'STEP ' + e.step, text: e.text, ok: e.ok, why,
    icon: callIcon(e.id), aim: e.aim, aimWord: AIM_WORD[e.aim] || e.aim, kind: e.kind, save, next, reaction: e.reaction, free: e.free,
    title: e.name + ' (' + e.skillName + ') · ' + apText + ' · within ' + reach + ' · to ' + (AIM_WORD[e.aim] || e.aim) + '. ' + e.text + (save ? ' ' + save + '.' : '') + (next ? ' ' + next : '') + (why ? ' (' + why + ')' : '') };
};
/** The Calls this unit can make (one chip per Call it has a point for), as the engine lists them. Empty: no Calls tab. */
export function callChips(g: any, cb: any, u: any): CallChip[] {
  if (!cb || !u || u.side !== 'pc' || u.companion) return [];
  try { return callPad(cb, u, g).map(chipOf); } catch { return []; }
}
