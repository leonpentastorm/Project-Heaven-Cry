// The doors' forks on the screens (rules 1.60, Doors 3.0; the lead's N1). Every place that shows a fork reads the ONE
// engine view (doorForkView / doorForkViews: each step at its points, offered or not, its options with their rules, the
// one picked, what is still to choose), and every pick is the reducer's door/pick, refused there in a fight and for any
// reason the engine has. This file is screen glue only: words, styles, icons. Three readers: the level-up skill card
// (screens/levelup.js), the sheet's SKILLS tab (screens/main.js), the door's fight tab header and its meter card
// (screens/combat.js, game/resources.ts). Colour (docs/design/colour-system.md): a pick still to make is white with
// "still to do"; a pick made is the door's attribute ink with "kept for good"; a step not offered yet is muted.
import { doorForkView, doorForkViews, SKILL } from '@engine';
import { act, toast } from './store';
import { ATTR_INK } from './classView';
import { forkChipsLine } from './forkLine';
export { forkChipsLine };

const MUTED = '#7F8BA1', TEXT = '#E7EBF3', WHITE = '#FFFFFF';
import { forkIconOf } from './forkIcon';
export { forkIconOf };
const inkOf = (skill: string): string => ATTR_INK[(SKILL as any)[skill]?.attribute] || TEXT;

export interface ForkOptView { key: string; name: string; text: string; icon: string; picked: boolean; canPick: boolean; label: string; style: string; nameStyle: string; btnStyle: string; pick: () => void }
export interface ForkStepView { key: string; head: string; headStyle: string; why: string; hasWhy: boolean; opts: ForkOptView[]; pending: boolean; style: string }
export interface ForkCardView { key: string; door: string; head: string; headStyle: string; runsOn: string; steps: ForkStepView[]; pending: boolean; chips: string;
  /** The folded card's one line (the SKILLS tab): "Forks · 1 chosen · 1 to pick"; a pick still to make makes it white. */
  chosen: number; toPick: number; summary: string; summaryStyle: string }

/** The option a player has asked to choose and not yet confirmed (character id | option id): a pick is kept for good,
 *  so the first press arms it and the second sends door/pick (the pick is confirmed once). */
let ARMED: string | null = null;
/** A door's fork card for this character: every step (picked, still to do, opening at N, not offered yet), each option
 *  side by side with its rule and (still to do, out of a fight) its Choose button. `only`: the steps at these points. */
export function forkCard(c: any, door: string, o: { inFight?: boolean; only?: number[]; rerender?: () => void } = {}): ForkCardView | null {
  const v = c ? doorForkView(c, door) : null; if (!v) return null;
  const ink = inkOf(v.skill), skillName = (SKILL as any)[v.skill]?.name || v.skill;
  const steps = v.steps.filter((s) => !o.only || o.only.includes(s.at)).map((s) => {
    const state = s.pending ? 'pending' : s.picked ? 'picked' : !s.offered ? 'off' : 'locked';
    const head = 'Fork at ' + s.at + (state === 'pending' ? ': choose one' : state === 'picked' ? ': chosen' : state === 'off' ? ': not offered yet' : '');
    // an option not built yet shows its rule in words like any other (its data `why` is a designer's note, never a player's line)
    const opts = s.options.map((op) => {
      const can = s.pending && op.built, armKey = c.id + '|' + op.id, armed = ARMED === armKey;
      return { key: op.id, name: op.name + (op.picked ? ' ✓' : ''), text: op.text, icon: forkIconOf(op.id, v.skill), picked: op.picked, canPick: can,
        label: o.inFight ? 'After the fight' : armed ? 'Confirm: keep ' + op.name + ' for good' : 'Choose ' + op.name,
        pick: () => {
          if (!can) return; if (o.inFight) { toast('Choose after the fight.'); return; }
          if (!armed) { ARMED = armKey; o.rerender?.(); return; }
          ARMED = null; act({ type: 'door/pick', charId: c.id, door, option: op.id } as any);
        },
        btnStyle: 'align-self: flex-start; min-height: 32px; padding: 0 12px; border-radius: 999px; font-family: inherit; font-size: var(--fs-sub); font-weight: 700; cursor: pointer; '
          + (armed ? 'border: 0; background: #FFFFFF; color: #0A0D13' : 'border: 1px solid #FFFFFF; background: transparent; color: #FFFFFF'),
        nameStyle: 'font-size: var(--fs-sub); font-weight: 700; color: ' + (op.picked ? ink : !op.built ? MUTED : TEXT),
        style: 'flex: 1 1 200px; min-width: 0; display: flex; flex-direction: column; gap: 6px; padding: 8px 10px; border-radius: 8px; '
          + (op.picked ? 'border: 1px solid ' + ink + '; background: #10151F' : can ? 'border: 1px solid ' + WHITE + '; background: #1C2536' : 'border: 1px dashed #2E3A50; background: transparent; opacity: ' + (op.built ? '0.85' : '0.6')) };
    });
    return { key: v.door + ':' + s.id, head, headStyle: 'font-size: var(--fs-sub); font-weight: 700; letter-spacing: 0.08em; color: ' + (state === 'pending' ? WHITE : state === 'picked' ? ink : MUTED),
      why: s.why, hasWhy: !!s.why && state !== 'picked', opts, pending: s.pending,
      style: 'display: flex; flex-direction: column; gap: 6px; padding: 8px; border-radius: 10px; ' + (s.pending ? 'border: 1px solid ' + WHITE + '; background: rgba(255, 255, 255, 0.04)' : 'border: 1px solid #232D3F') };
  });
  if (!steps.length) return null;
  const chosen = v.steps.filter((s) => s.picked).length, toPick = v.pending, later = v.steps.filter((s) => s.open && !s.offered).length;
  const summary = ['Forks', chosen ? chosen + ' chosen' : '', toPick ? toPick + ' to pick' : '', later ? later + ' coming in a later version' : '', !chosen && !toPick && !later ? 'none open yet' : ''].filter(Boolean).join(' · ');
  return { key: door, door, head: (v.name === skillName ? skillName : v.name + ' · ' + skillName).toUpperCase() + ' · FORKS',
    headStyle: 'font-size: var(--fs-sub); font-weight: 700; letter-spacing: 0.1em; color: ' + (v.pending ? WHITE : ink), runsOn: v.runsOn ? 'Every option runs on ' + v.runsOn + '.' : '', steps, pending: v.pending > 0, chips: forkChipsLine(c, door),
    chosen, toPick, summary, summaryStyle: 'font-size: var(--fs-sub); font-weight: 700; letter-spacing: 0.06em; color: ' + (toPick ? WHITE : chosen ? ink : MUTED) };
}

/** Every door's fork card a character has reached (its alpha at a step's points, or a pick made), pending ones first. */
export function forkCards(c: any, o: { inFight?: boolean; rerender?: () => void } = {}): ForkCardView[] {
  if (!c) return [];
  const out = doorForkViews(c).filter((v) => v.steps.some((s) => s.open || s.picked)).map((v) => forkCard(c, v.door, o)).filter((x): x is ForkCardView => !!x);
  return [...out.filter((x) => x.pending), ...out.filter((x) => !x.pending)];
}

/** The SKILLS tab's fork card for one skill (its door), under that skill's row: null when the skill is no door or the
 *  character has reached none of its steps (no step open, nothing picked). */
export function forkSheetCard(c: any, skill: string, o: { inFight?: boolean; rerender?: () => void } = {}): ForkCardView | null {
  const v = c ? doorForkView(c, skill) : null; if (!v || !v.steps.some((s) => s.open || s.picked)) return null;
  return forkCard(c, v.door, o);
}

/** The level-up skill card's fork block: the steps of this skill's door at these points (a step just reached, to choose
 *  now; or reached and sealed, which says so: row 16 of the outside playtest, Ingenuity's level-up showed no fork
 *  section at all) and the next one (opening at N), or none. */
export function forkLevelUp(c: any, skill: string, p: number, inFight = false, rerender?: () => void): ForkCardView | null {
  const v = c ? doorForkView(c, skill) : null; if (!v) return null;
  const at = v.steps.filter((s) => s.at <= p && (s.pending || s.picked || !s.offered)).map((s) => s.at), next = v.steps.find((s) => s.at > p);
  return forkCard(c, skill, { inFight, rerender, only: [...at, ...(next ? [next.at] : [])] });
}
