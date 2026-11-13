// THE ROLLS (engine foundations 1, review finding F1). Every d20 the engine rolls goes through this file. Nothing
// else calls d20() (test/lint-foundations.test.ts fails on a raw d20 anywhere else).
//
//   rollSave(cb, rng, spec)   a unit's save against something done to it. It asks every item (the 'cond_apply' hook,
//                             then the 'save' hook), rolls, emits the 'roll' effect and returns the result.
//   rollVs(cb, rng, spec)     a plain d20 + modifier against a number (a check, a to-hit that is not a weapon attack).
//   contest(cb, rng, a, b)    two rollers, each a d20 + modifier; the higher total wins, the defender wins a tie.
//   rollD20(rng, {adv})       the bare die, for the two roll pipelines that own their hooks (the weapon attack in
//                             combat.ts, the story check in game.ts) and for the few rolls that are not d20 + mod vs TN.
//   judge(...)                turns a die already rolled into a result (when a hook must see the die before the modifier).
//
// A RollResult is the ONE description of a roll: the log sentence (`text`), the effect event and the numbers a screen
// shows are all made from it here. A caller never formats a die or compares it with a TN by hand.
//
// THE RULING BUILT HERE ("a save is a save", Leon, 12 Nov 2026): whatever asks for a save (a condition, a technique's
// Stop, a hazard, a Hymn, a class move, a perk), the same items change it. rollSave fires 'cond_apply' for every save
// (the 28 item handlers that add to a save, make it harder, pass it or cancel it listen there), so an item that says
// "+2 to Heart saves" is +2 to every Heart save.
import './datatext'; // fills the texts' {=placeholders} before any data is read
import rulesJ from '../../../data/rules.json';
import type { Combat, Unit } from './combat';
import { emitFx } from './combat';
import { emit, hookUsed } from './effects/hooks';
import { d20, type Rng } from './rng';

const R: any = (rulesJ as any).rolls || {}, LADDER: any = (rulesJ as any).resolution?.tn_ladder || {};
/** The base TN of every save: 12 (data/rules.json conditions_rules.save_base_tn). A save's TN is this + the strength
 * of the skill that delivered what is saved against. */
export const SAVE_TN: number = (rulesJ as any).conditions_rules?.save_base_tn ?? 12;
/** The TN ladder of a check (data/rules.json resolution.tn_ladder): Easy 8, Standard 12, Hard 16, Heroic 20. */
export const TN: { easy: number; standard: number; hard: number; heroic: number } = { easy: LADDER.easy ?? 8, standard: LADDER.standard ?? 12, hard: LADDER.hard ?? 16, heroic: LADDER.heroic ?? 20 };
/** What an opposed number starts from (a Shove's "10 + the target's Raw Power", a spotter's "10 + its Ingenuity"). */
export const CONTEST_BASE: number = R.contest_base ?? 10;
/** A death save passes on this total or more. */
export const DEATH_SAVE_TN: number = R.death_save_tn ?? 10;
const NPC_SAVE: Record<string, number> = R.npc_save_by_tier || { vermin: 0, minion: 0, soldier: 1, elite: 2, boss: 3 };
const NPC_STRENGTH: Record<string, number> = R.npc_strength_by_tier || { vermin: 0, minion: 0, soldier: 1, elite: 2, boss: 2 };
/** The save bonus of someone with no sheet, by tier (data/rules.json rolls.npc_save_by_tier): a Minion 0, a Soldier
 * 1, an Elite 2, a Boss 3. An unknown tier saves as a Minion. */
export const tierSave = (tier?: string | null): number => NPC_SAVE[tier || 'minion'] ?? 0;
/** How hard what someone with no sheet does is to save against, by tier (rolls.npc_strength_by_tier). */
export const tierStrength = (tier?: string | null): number => NPC_STRENGTH[tier || 'minion'] ?? 0;

/** A save's family: Body, Brain or Heart. */
export type Fam = 'body' | 'brain' | 'heart';
/** One labelled term of a roll's modifier. */
export interface RollPart { add: number; label: string }
/** What a roll did: the die (and dice), the modifier and its parts, the total, the TN, ok, the natural, the sentence. */
export interface RollResult {
  kind: 'save' | 'roll' | 'contest';
  /** The natural die kept (0: nothing was rolled). */ die: number;
  /** Every die rolled, when more than one was (advantage keeps the highest). */ dice?: number[];
  /** The modifier in all, and what it is made of. */ mod: number; parts: RollPart[];
  total: number; tn: number;
  /** The roller made it. For a save: it RESISTS (what was done to it does not land). */ ok: boolean;
  /** A natural 1 or 20 (null otherwise, and always null when the roll does not use them). */ nat: 1 | 20 | null;
  /** Nothing was rolled: 'immune' (an item cancelled it: ok is true), 'auto' (an item passed it: ok is true),
   * 'no_save' (there is no save against it: ok is false). `why` says which item. */
  skipped?: 'immune' | 'no_save' | 'auto'; why?: string;
  fam?: Fam;
  /** The one sentence for the log: "body save d20 12 +2 = 14 vs 15", "d20 7 −1 = 6 vs 12, natural 1"… */
  text: string;
}
const sign = (n: number) => (n >= 0 ? '+' : '−') + Math.abs(n);
/** "d20 12 +2 = 14 vs 15" (with ", natural 20" or ", natural 1" when that decided it). */
export function rollText(r: { die: number; mod: number; total: number; tn: number; nat?: 1 | 20 | null; dice?: number[] }, lead = ''): string {
  return (lead ? lead + ' ' : '') + 'd20 ' + (r.dice && r.dice.length > 1 ? r.dice.join('/') + ' → ' : '') + r.die + ' ' + sign(r.mod) + ' = ' + r.total + ' vs ' + r.tn + (r.nat === 20 ? ', natural 20' : r.nat === 1 ? ', natural 1' : '');
}

/** THE die. `adv`: roll two and keep the higher (both are drawn, in order). The only d20() call in the engine. */
export function rollD20(rng: Rng, o: { adv?: boolean } = {}): { die: number; dice: number[] } {
  const a = d20(rng); if (!o.adv) return { die: a, dice: [a] };
  const b = d20(rng); return { die: Math.max(a, b), dice: [a, b] };
}
const partsOf = (m: number | RollPart[] | undefined): RollPart[] => (Array.isArray(m) ? m.filter((p) => p.add) : m ? [{ add: m, label: '' }] : []);
/** A die already rolled, judged: d20 + modifier against a TN. `nat` (default true): a natural 20 always passes and a
 * natural 1 always fails; false: only the total counts (a death save, a Shove's opposed roll). `over`: the total must
 * BEAT the number (a contest the roller has to win outright), not meet it. */
export function judge(kind: RollResult['kind'], rolled: { die: number; dice?: number[] }, mod: number | RollPart[] | undefined, tn: number, o: { nat?: boolean; over?: boolean; fam?: Fam; lead?: string } = {}): RollResult {
  const parts = partsOf(mod), m = parts.reduce((t, p) => t + p.add, 0), die = rolled.die, total = die + m, useNat = o.nat !== false;
  const nat = useNat && die === 20 ? 20 : useNat && die === 1 ? 1 : null;
  const ok = nat === 20 || (nat !== 1 && (o.over ? total > tn : total >= tn));
  const res: RollResult = { kind, die, ...(rolled.dice && rolled.dice.length > 1 ? { dice: rolled.dice } : {}), mod: m, parts, total, tn, ok, nat, ...(o.fam ? { fam: o.fam } : {}), text: '' };
  res.text = rollText(res, o.lead ?? (o.fam ? o.fam + ' save' : ''));
  return res;
}
/** The effect event of a roll (kind 'roll'): the numbers a screen needs to show the dice. `only`: a side that alone
 * may see it. Emitted by rollSave / rollVs / contest; call it yourself only after judge(). */
export function rollFx(cb: Combat | null | undefined, r: RollResult, who: Unit | null | undefined, x: { by?: Unit | null; why?: string } = {}): void {
  if (!cb || !who) return;
  emitFx(cb, 'roll', { roll: r.kind, unit: who.id, at: who.pos, ...(x.by ? { by: x.by.id } : {}), ...(r.fam ? { fam: r.fam } : {}), ...(x.why ? { why: x.why } : {}),
    die: r.die, ...(r.dice ? { dice: r.dice } : {}), mod: r.mod, total: r.total, tn: r.tn, ok: r.ok, ...(r.nat ? { nat: r.nat } : {}), ...(r.skipped ? { skipped: r.skipped } : {}) });
}

/** What rollVs needs: who rolls, the modifier, the TN, why, and how the natural and the effect event are treated. */
export interface RollSpec {
  /** Who rolls (for the effect event; null: nobody on the grid, a story roll). */ by?: Unit | null;
  /** The modifier: a number, or its parts with labels. */ mod?: number | RollPart[];
  tn: number;
  /** What the roll is, in a word or two, for the event ('spot', 'parley', 'turret shot'). */ why?: string;
  /** false: a natural 20 and a natural 1 are not special (default: they are). */ nat?: boolean;
  /** The total must beat the TN, not meet it. */ over?: boolean;
  /** Roll two dice and keep the higher. */ adv?: boolean;
  /** The words before "d20" in the sentence ('Heart check'). */ lead?: string;
  /** false: no effect event (a roll nobody on the grid sees). */ fx?: boolean;
}
/** A plain roll: d20 + modifier against a TN. One die is drawn (two with `adv`). */
export function rollVs(cb: Combat | null | undefined, rng: Rng, s: RollSpec): RollResult {
  const res = judge('roll', rollD20(rng, { adv: s.adv }), s.mod, s.tn, { nat: s.nat, over: s.over, lead: s.lead });
  if (s.fx !== false) rollFx(cb, res, s.by, { why: s.why });
  return res;
}

/** What rollSave needs: who forces it, the target, the family, the TN or the source it comes from, the condition id. */
export interface SaveSpec {
  /** Who did it (null: nobody, a hazard or the world). */ by: Unit | null;
  /** Who saves. */ target: Unit;
  fam: Fam;
  /** The TN in full (before items' tnAdd). Use saveTn(by, via) for "12 + the strength of the skill that delivered it". */ tn: number;
  /** The save's own modifier before items (unitSave(target, fam) for a unit; tierSave(tier) for someone with no sheet). */ mod: number;
  /** What is saved against: a condition id ('pinned'), or a word for a save that is not a condition ('shoved',
   * 'teleport', 'stop', 'hazard', 'hymn'). Items read it as `id` on 'cond_apply' and 'save'. */ id: string;
  /** The skill it was delivered by (rules 1.13), for items that read it. */ via?: string;
  /** Roll two dice and keep the higher (a Boss against Dominate…). */ adv?: boolean;
  /** applyCond has already fired 'cond_apply' for this condition: its context (the save reads saveAdd, tnAdd,
   * skipSave and cancel from it and does not fire it again). */ ca?: any;
  /** Harder (+) or easier (−), from the caller. */ tnAdd?: number;
  /** The words before "d20" in the sentence (default: '<family> save'; a technique names the skills it lets the target use). */ lead?: string;
  /** false: no effect event. */ fx?: boolean;
}
/** A unit's save. It RESISTS when `ok`. In order: every item is asked ('cond_apply' unless `ca` is given, then
 * 'save'): one may cancel it (`skipped: 'immune'`, ok), pass it (`'auto'`, ok), say there is no save (`'no_save'`, not
 * ok), add to the save (saveAdd) or to the TN (tnAdd). Then ONE d20 is drawn (two with adv), a natural 20 resists and a
 * natural 1 fails. Nothing is drawn when it was skipped. The 'roll' effect is emitted. The caller writes its own
 * sentence around `text`. */
export function rollSave(cb: Combat, rng: Rng, s: SaveSpec): RollResult {
  const t = s.target;
  const ca: any = s.ca || emit(cb, 'cond_apply', { by: s.by, t, id: s.id, fam: s.fam, rounds: 0, skipSave: false, cancel: false, why: '', tnAdd: s.tnAdd || 0, saveAdd: 0, via: s.via, save: true, cb, rng });
  const skip = (how: 'immune' | 'no_save' | 'auto', ok: boolean, why: string): RollResult => {
    const res: RollResult = { kind: 'save', die: 0, mod: 0, parts: [], total: 0, tn: s.tn, ok, nat: null, skipped: how, ...(why ? { why } : {}), fam: s.fam, text: how === 'immune' ? 'untouched' + (why ? ' (' + why + ')' : '') : how === 'auto' ? 'shrugs it off' + (why ? ' (' + why + ')' : '') : 'no save' };
    if (s.fx !== false) rollFx(cb, res, t, { by: s.by, why: s.id }); return res;
  };
  if (ca.cancel) return skip('immune', true, ca.why || '');
  if (ca.skipSave) return skip('no_save', false, '');
  // 'save' {by, t, id, fam, via, saveAdd, tnAdd, pass, fail, why}: the hook of EVERY save, after the condition's own.
  const sv: any = emit(cb, 'save', { by: s.by, t, id: s.id, fam: s.fam, via: s.via, saveAdd: ca.saveAdd || 0, tnAdd: (s.ca ? s.tnAdd || 0 : 0) + (ca.tnAdd || 0), pass: false, fail: false, why: '', cb, rng });
  // Defiance poured into a release (rules 1.8): "your next save passes". It is the next save, whatever asks for it.
  if ((t as any).feelSaveNext && !sv.fail) { delete (t as any).feelSaveNext; return skip('auto', true, 'Defiance'); }
  if (sv.pass) return skip('auto', true, sv.why || '');
  if (sv.fail) return skip('no_save', false, sv.why || '');
  const parts: RollPart[] = [{ add: s.mod, label: s.fam + ' save' }, ...(sv.saveAdd ? [{ add: sv.saveAdd, label: 'items' }] : [])];
  const res = judge('save', rollD20(rng, { adv: s.adv }), parts, s.tn + (sv.tnAdd || 0), { fam: s.fam, ...(s.lead ? { lead: s.lead } : {}) });
  if (s.fx !== false) rollFx(cb, res, t, { by: s.by, why: s.id });
  return res;
}

/** Two rollers against each other: each a d20 + modifier, `a` first. `a` wins on the higher total; a tie goes to `b`
 * (the defender: data/rules.json resolution.opposed_check). No natural 1 or 20. Two dice are drawn, a's then b's. */
export function contest(cb: Combat | null | undefined, rng: Rng, a: { by?: Unit | null; mod: number }, b: { by?: Unit | null; mod: number }, why = ''): { a: RollResult; b: RollResult; won: boolean; text: string } {
  const da = rollD20(rng), db = rollD20(rng), tb = db.die + b.mod;
  const ra = judge('contest', da, a.mod, tb, { nat: false, over: true }), rb = judge('contest', db, b.mod, ra.total, { nat: false });
  rollFx(cb, ra, a.by, { by: b.by, why }); rollFx(cb, rb, b.by, { by: a.by, why });
  return { a: ra, b: rb, won: ra.ok, text: 'd20 ' + ra.die + ' ' + sign(ra.mod) + ' = ' + ra.total + ' vs d20 ' + rb.die + ' ' + sign(rb.mod) + ' = ' + rb.total };
}

/** What kind of roll to hit: a weapon attack, a Sigil's hit roll, an Outburst's (a Bolt or a Lance). */
export type HitKind = 'weapon' | 'sigil' | 'soul';
/** THE hook of every roll to hit a target (Leon, 13 Nov 2026: "one hook"; Classes 3.0 step 1b): 'to_hit' {att, tgt,
 * type ('weapon', 'sigil', 'soul': the item-op predicate `damage` reads it), mode (a weapon's), terms, preview, cb}.
 * A weapon attack's preview (combat.ts previewAttack), a Sigil's hit (sigil.ts) and an Outburst's (magic.ts rollFor,
 * classes/soul.ts soulStrike) all ask here, so an item or a condition that changes "a roll to hit this target" reaches
 * all three. Pure: a listener only adds terms ({v, label}). Returns the terms added (none while nobody listens). */
export function toHitTerms(cb: Combat | null | undefined, att: Unit | null | undefined, tgt: Unit, type: HitKind, o: { mode?: string; preview?: boolean } = {}): { v: number; label: string }[] {
  if (!cb || !att || !hookUsed('to_hit')) return [];
  const ctx: any = emit(cb, 'to_hit', { att, tgt, type, mode: o.mode ?? null, terms: [] as { v: number; label: string }[], preview: o.preview !== false, cb });
  return (ctx.terms as { v: number; label: string }[]).filter((t) => t && t.v);
}
/** The sum of toHitTerms. */
export const toHitAdd = (cb: Combat | null | undefined, att: Unit | null | undefined, tgt: Unit, type: HitKind, o: { mode?: string; preview?: boolean } = {}): number => toHitTerms(cb, att, tgt, type, o).reduce((n, t) => n + t.v, 0);
/** How many of the 20 faces pass d20 + mod against a TN (a natural 20 passes, a natural 1 fails): the odds a card shows. */
export const passFaces = (mod: number, tn: number): number => { let n = 0; for (let f = 1; f <= 20; f++) if (judge('roll', { die: f }, mod, tn).ok) n++; return n; };
/** Does this attack roll hit, by the attack's own rule (a natural 1 misses, the critical range hits, else the total
 * against the Defense)? For an item inside the 'attack_roll' hook, before resolveAttack settles it. */
export const attackHits = (rc: { die: number; hit?: boolean; critMin: number; toHit: number; need: number }): boolean => rc.hit ?? (rc.die !== 1 && (rc.die >= rc.critMin || rc.die + rc.toHit >= rc.need));
/** Reroll an attack's die inside the 'attack_roll' hook (Lucky Break, Lucky Foot): the new die replaces the old one.
 * With a `bonus` the hit is settled here, by the attack's own rule with the bonus added (a natural 1 misses, the
 * critical range hits); without one resolveAttack settles it from the new die. Returns the new die. */
export function rerollAttack(rc: { die: number; hit?: boolean; critMin: number; toHit: number; need: number }, rng: Rng, bonus = 0): number {
  const r = rollD20(rng).die; rc.die = r;
  delete rc.hit; if (bonus) rc.hit = attackHits({ ...rc, toHit: rc.toHit + bonus });
  return r;
}
