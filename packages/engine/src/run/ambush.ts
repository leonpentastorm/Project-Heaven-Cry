// THE AMBUSH (rules 1.90 items 7800 to 7812; Leon, 20 Nov 2026: "every combat node have a frontal attack or try
// ambushing option, if you go frontal you get normal initiative roll, if you try ambush the squad roll some how, if you
// win you get a free turn, if you lost the enemy get a free turn. The approach phase is out entirely.").
// A fight node of a run asks before the fight (run.state 'engage'): Walk in, or Try an ambush. This file is the roll's
// one copy: the squad's modifier and its terms (ambushOdds), the roll (rollAmbush, on the game's dice through rolls.ts
// rollVs), the scout (scoutOf: who goes ahead, the line-up shown before the choice) and the view the node's screen draws
// (engageView). Every number and word is data/survival.json `ambush` (and rules.json output.amounts.ambush_fumble).
// What a won or lost roll does to the fight is combat.ts startCombat's extra.freeTurn (rules 1.90 item 7805), called by
// game.ts runFight with this roll's result.
import '../datatext';
import svJ from '../../../../data/survival.json';
import { SKILL } from '../data';
import { type Character, checkMod, carriesVisualizer, maxHp } from '../character';
import { skillRollMod } from '../effects/core';
import { statQuery } from '../effects/hooks';
import { rollVs, passFaces, TN, type RollPart, type RollResult } from '../rolls';
import { FORM, formWhy, figmentCharge } from '../figments';
import { itemAmount } from '../effects/amounts';
import { visChargeNow } from '../magic';
import { composeEncounter } from './encounter';
import { type RunState, type RunNode, runSetting } from './state';
import type { Rng } from '../rng';

/** survival.json `ambush`: the node kinds that ask, the skills a character rolls with, the TN by node, the solo fumble, the words. */
export const AMBUSH: { kinds: string[]; skills: string[]; tn: Record<string, keyof typeof TN>; fumble: { squad_max: number; floor_hp: number }; words: Record<string, string> } = (svJ as any).ambush;
/** Does this node ask Walk in or Try an ambush (a fight node)? */
export const asksEngage = (n: RunNode | null | undefined): boolean => !!n && AMBUSH.kinds.includes(n.kind);
/** The node's ambush TN: the TN name its kind (or the gate) names in data, on the spec's ladder (rolls.ts TN). */
export const ambushTn = (n: RunNode): number => TN[AMBUSH.tn[n.gate ? 'gate' : n.kind] || 'standard'];
/** The data's words with their {fields} filled. */
export const fillAmbush = (t: string, v: Record<string, string | number>): string => t.replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? String(v[k]) : m));

/** One character's number on the roll: its best check modifier among the data's skills (the check rule, character.ts
 * checkMod: a gamma skill adds its full points; the skill's item mods, effects/core.ts skillRollMod). */
export function memberMod(c: Character): { mod: number; skill: string } {
  let best: { mod: number; skill: string } | null = null;
  for (const s of AMBUSH.skills) { const m = checkMod(c, s) + skillRollMod({ c }, s, { roll: 'check', tags: ['ambush'] }).add; if (!best || m > best.mod) best = { mod: m, skill: s }; }
  return best || { mod: 0, skill: AMBUSH.skills[0] };
}
/** Who scouts ahead, if anyone: the character and the thing that goes, its bonus, its line. A held item answering the
 * stat `ambush_scout` (the Ingenuity door at 5: the character goes in person), or a Figment form with `scouts` the
 * character knows and could picture now (the Visualizer carried, the form's charge loaded; nothing spent). Scouts never
 * stack: the best bonus is the squad's (ties: the first character, items before forms). */
export function scoutOf(chars: Character[]): { charId: string; name: string; form?: string; bonus: number; line: string } | null {
  let best: { charId: string; name: string; form?: string; bonus: number; line: string } | null = null;
  const take = (x: NonNullable<typeof best>) => { if (!best || x.bonus > best.bonus) best = x; };
  for (const c of chars) {
    const own = statQuery({ c }, 'ambush_scout').add;
    if (own > 0) take({ charId: c.id, name: c.name, bonus: own, line: fillAmbush(AMBUSH.words.scout, { name: c.name }) });
    for (const f of Object.values(FORM) as any[]) {
      const sc = f?.scouts; if (!sc || !(sc.bonus > 0)) continue;
      if (formWhy(c, f.id) || !carriesVisualizer(c) || visChargeNow(c) < figmentCharge(f.id, [])) continue; // the Picture rule's needs, nothing spent
      take({ charId: c.id, name: c.name, form: f.name, bonus: sc.bonus, line: fillAmbush(AMBUSH.words.scout_form, { name: c.name, form: f.name }) });
    }
  }
  return best;
}
/** The squad's roll before it is made: each living character's number, the average rounded down, the best Tremor
 * (`ambush_roll`) and the best scout, each its own term; the TN; the chance to win (the 20 faces judged, rolls.ts passFaces). */
export function ambushOdds(chars: Character[], n: RunNode): { parts: RollPart[]; mod: number; tn: number; chance: number; members: { charId: string; name: string; skill: string; mod: number }[]; scout: ReturnType<typeof scoutOf> } {
  const live = chars.filter((c) => !c.dead);
  const members = live.map((c) => { const m = memberMod(c); return { charId: c.id, name: c.name, skill: m.skill, mod: m.mod }; });
  const avg = members.length ? Math.floor(members.reduce((t, m) => t + m.mod, 0) / members.length) : 0;
  const tremor = Math.max(0, ...live.map((c) => statQuery({ c }, 'ambush_roll').add)), scout = scoutOf(live);
  const parts: RollPart[] = [{ add: avg, label: AMBUSH.words.squad }];
  if (tremor > 0) parts.push({ add: tremor, label: 'Tremor' });
  if (scout) parts.push({ add: scout.bonus, label: AMBUSH.words.scout_term });
  const mod = parts.reduce((t, p) => t + p.add, 0), tn = ambushTn(n);
  return { parts, mod, tn, chance: passFaces(mod, tn) / 20, members, scout };
}
/** Is this squad small enough that a lost roll is a fumble (no free turn, damage) rather than the hostiles' free turn? */
export const fumbles = (chars: Character[]): boolean => chars.filter((c) => !c.dead).length <= AMBUSH.fumble.squad_max;
/** The fumble's damage to this character (rules.json output.amounts.ambush_fumble), before its floor; 0 with ambush_immune (Tremor). */
export const fumbleDamage = (c: Character): number => (statQuery({ c }, 'ambush_immune').add > 0 ? 0 : Math.floor(itemAmount('rule:ambush_fumble', 'damage', [], { max_hp: maxHp(c) })));
/** The roll itself: one d20 for the squad on the game's dice (no effects event: nobody stands on a grid yet). */
export function rollAmbush(chars: Character[], n: RunNode, rng: Rng): RollResult & { odds: ReturnType<typeof ambushOdds> } {
  const odds = ambushOdds(chars, n);
  return { ...rollVs(null, rng, { mod: odds.parts, tn: odds.tn, why: 'ambush', fx: false }), odds };
}
/** The line-up a scout shows (each foe's name and tier, the count): the encounter the node will compose (it is the
 * same pure function of the run's seed that runFight calls, so what is shown is what waits). */
export function lineUp(r: RunState, n: RunNode, chars: Character[]): { name: string; tier: string }[] {
  const enc = composeEncounter({ levels: chars.filter((c) => !c.dead).map((c) => c.level), node: n, stage: r.stage, setting: runSetting(r), seed: r.seed, last: r.last });
  return enc.foes.map((f) => ({ name: f.name, tier: f.tier || 'soldier' }));
}
/** What the fight node's screen draws (rules 1.90 item 7811): the two choices, the roll's terms, TN and chance in words
 * and numbers, the scout's line and the line-up when a scout goes ahead, and whether this viewer chooses. */
export function engageView(g: { run?: RunState | null; characters: Record<string, Character>; hostId: string }, viewer: string): {
  node: string; kind: string; walk: { label: string; text: string }; ambush: { label: string; text: string; parts: RollPart[]; mod: number; tn: number; chance: number; pct: number; words: string };
  members: { charId: string; name: string; skill: string; skillName: string; mod: number }[]; scout: { line: string; foes: { name: string; tier: string }[]; text: string } | null; chooses: boolean; waiting: string; head: string; ask: string } | null {
  const r = g.run; if (!r || r.state !== 'engage' || !r.at) return null;
  const n = r.nodes.find((x) => x.id === r.at); if (!n) return null;
  const chars = Object.values(g.characters), o = ambushOdds(chars, n), pct = Math.round(o.chance * 100), W = AMBUSH.words;
  const solo = fumbles(chars), dmg = solo ? Math.max(0, ...chars.filter((c) => !c.dead).map(fumbleDamage)) : 0;
  const foes = o.scout ? lineUp(r, n, chars) : [];
  return { node: n.id, kind: n.gate ? 'gate' : n.kind, head: W.head, ask: W.ask, walk: { label: W.walk, text: W.walk_text },
    ambush: { label: W.try, text: solo ? fillAmbush(W.try_text_solo, { dmg }) : W.try_text, parts: o.parts, mod: o.mod, tn: o.tn, chance: o.chance, pct, words: fillAmbush(W.chance, { pct }) },
    members: o.members.map((m) => ({ ...m, skillName: SKILL[m.skill]?.name || m.skill })),
    scout: o.scout ? { line: o.scout.line, foes, text: fillAmbush(W.lineup, { foes: foes.length + ': ' + foes.map((f) => f.name + ' (' + f.tier + ')').join(', ') }) } : null,
    chooses: viewer === g.hostId, waiting: W.waiting };
}
