// Echo's home on the character (UI pass, docs/design/ui-pass-shell.md 4): a row on the sheet next to HP and MP, with the
// diamonds, the count and what it does, and an explainer that opens from the row: what Echo is, how you get it, how much
// you can hold, and where you spend it. Every number comes from the rules data (rules.json echo and overreach); the
// engine owns the meter (gainEcho). Pure, so it is tested without a browser (echoView.test.ts).
import { RULES } from '@engine';

const E = (): any => RULES?.resolution?.echo || {};
const OR = (): any => RULES?.resolution?.overreach || {};
export const echoMax = (): number => Number(E().max) || 3;
/** The resist price: the plain one and the Mastered one (rules.json overreach.choice.resist.echo_cost_by_mastery). */
function resistCost(): { plain: number; mastered: number } {
  const t = OR()?.choice?.resist?.echo_cost_by_mastery || {};
  return { plain: Number(t['2'] ?? 1) || 1, mastered: Number(t.mastered ?? 2) || 2 };
}

export interface EchoLine { text: string; style: string }
export interface EchoView {
  has: boolean; n: number; max: number; count: string; short: string; aria: string;
  pips: { key: string; full: boolean; style: string; cls: string }[];
  lead: string; sections: { key: string; head: string; lines: EchoLine[] }[];
}
const LINE = 'font-size: 12px; line-height: 1.4; color: #E7EBF3';
const MUTED = 'font-size: 12px; line-height: 1.4; color: #A3AEC2';

/** The Echo row and its explainer for a character's Echo (n). flare: 'up' or 'down' while a change is showing. */
export function echoView(n: number | null | undefined, flare: '' | 'up' | 'down' = ''): EchoView {
  const max = echoMax(), have = Math.max(0, Math.min(max, Math.round(Number(n) || 0))), start = Number(E().session_start ?? 1), rc = resistCost();
  const pips = Array.from({ length: max }, (_, i) => {
    const full = i < have, edge = flare === 'up' ? i === have - 1 : flare === 'down' ? i === have : false;
    return { key: 'p' + i, full, cls: edge ? (flare === 'up' ? 'phc-echo-gain' : 'phc-echo-spend') : '',
      style: 'flex: none; width: 13px; height: 13px; transform: rotate(45deg); box-sizing: border-box; ' + (full ? 'background: #FFFFFF; box-shadow: 0 0 6px rgba(255, 255, 255, 0.55)' : 'border: 1.5px solid #FFFFFF; opacity: 0.7') };
  });
  return {
    has: true, n: have, max, count: have + ' / ' + max, short: 'reroll a d20',
    aria: 'Echo: ' + have + ' of ' + max + '. What is Echo?',
    pips,
    lead: 'A second chance. Spend 1 Echo to throw a d20 again; the new throw stands. One Echo per roll.',
    sections: [
      { key: 'get', head: 'GET IT', lines: [
        { text: start + ' at the start of every session', style: LINE },
        { text: '+1 when you indulge an Overreach (a skill pushes and you let it)', style: LINE },
        { text: 'now and then from the Narrator, for a moment that earns it', style: LINE }] },
      { key: 'hold', head: 'HOLD', lines: [{ text: 'at most ' + max + ' (the diamonds on this row)', style: LINE }] },
      { key: 'spend', head: 'SPEND IT', lines: [
        { text: 'on a check, in the dice table: "◆ Spend 1 Echo · throw again"', style: LINE },
        { text: 'to resist an Overreach: ' + rc.plain + ' Echo, ' + rc.mastered + ' if the skill is Mastered', style: LINE },
        { text: 'in a fight: not yet', style: MUTED }] },
    ],
  };
}
