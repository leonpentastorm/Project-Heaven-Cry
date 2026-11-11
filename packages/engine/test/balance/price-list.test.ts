// @ts-nocheck (a tool run by hand: it reads the data pack and the engine by name and writes a table)
// The balance pass, instrument 3 (docs/design/proposals/2026-11-balance-pass.md, angle B and the peak rule of
// section 10): THE ACTION PRICE LIST. Every thing a character can do in a fight, with its full price and what it buys.
//   PRICE_LIST_OUT=docs/design/handoffs/action-price-list.md npx vitest run --root packages/engine test/balance/price-list.test.ts
// (the path is taken from where you run it; give an absolute path to be safe). Without the variable it only checks
// that the table builds. Nothing here changes the game.
//
// WHERE EVERY NUMBER COMES FROM
//   AP, rounds, Momentum, Guard, Pressure, saves ... the engine's own card for the action (previewAttack,
//     previewTechnique, callAp, perkActionsFor) where it has one; else the data file (data/*.json); else the engine's
//     source (the base AP written at each actionAp(...) call). The "read from" column says which.
//   "What it buys" ... the item's own numbers (techniques.json `numbers`, calls.json `numbers`, effects in
//     classes.json / perks.json / traits.json / patrons.json, sigils.json, soul_modules.json).
//   The value in plain attacks ... a PROPOSED conversion, all of it in K below and printed at the top of the report.
//     Change a line in K and run again: every flag is recomputed.
//
// TO ADD AN ACTION: a technique, Call, class move, perk, trait, Sigil word or prayer added to the data shows up by
// itself. Give it a price in TECH_VALUE / CALL_VALUE / MOVE_VALUE / ITEM_VALUE (a few lines down) or it is listed as
// "not priced" (and never flagged).
import { describe, it, expect } from 'vitest';
import { writeFileSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import * as E from '../../src';
import { fightWith, withGame } from '../helpers/perkfight';
import { physFight } from '../helpers/physfight';

const A: any = E as any;
const R: any = A.RULES, TR: any = A.PHYS_RULES, CR: any = A.CALL_RULES, SOUL: any = A.SOUL_RULES;

// ------------------------------------------------------------------------------------------------ the conversion (PROPOSED)
/** Every line here is a proposal for Leon (the report lists them). Nothing in the game reads this. */
const K = {
  AP: 0.5,            // the yardstick (balance pass, angle B target 1): 1 AP = half a plain attack
  PCT: 0.65,          // an attack lands 65% of the time (Leon, section 8 item 8)
  SAVE: 0.5,          // an enemy at equal level fails a save half the time (angle F target: 45 to 55%)
  PRESSURE: 0.25,     // 1 Pressure on an enemy (4 Pressure is Broken: 2 AP gone)
  MOMENTUM_AP: 0.5,   // 1 Momentum spent counts as half an AP of price (a Finisher turns 1 Momentum into +20 to +25% of an attack)
  REACTION_AP: 1,     // the turn's one reaction counts as 1 AP of price
  ENEMY_ATTACKS: 2,   // an enemy makes about 2 attacks on its turn (4 AP of attacks, 2 AP of moving)
  ROUNDS: 5,          // a standard fight (Leon: 4 to 6 rounds)
  REF: 4,             // "a normal share of points": 4 in the skill and 4 in its attribute (the yardstick build)
  CHEAP: 1.5,         // flagged cheap at 1.5 times the yardstick or more
  DEAR: 0.67,         // flagged dear at two thirds of the yardstick or less
  FREE_WORTH: 0.25,   // a 0 AP action is flagged cheap when it is worth a quarter of an attack or more
  ARMOUR_HITS: 4,     // armour broken on a target matters for about 4 later hits
  MARK_ATTACKS: 6,    // a to-hit bonus that lasts the fight is used by about 6 squad attacks
  ALLIES: 3,          // an area that helps "every ally" reaches about 3
};
/** +1 to hit, as a share of one attack. */
const HIT = 0.05 / K.PCT;
/** Conditions, as certain effects, in plain attacks (PROPOSED; the reasoning is printed in the report). */
const COND: Record<string, [number, string]> = {
  stunned: [6 * K.AP, 'a whole turn: 6 AP'],
  dazed: [2 * K.AP, '2 AP'],
  suppressed: [1 * K.AP, '1 AP'],
  nausea: [2 * K.AP, '1 AP a turn for 2 rounds'],
  prone: [1 * K.AP, '1 AP to stand up'],
  lowered: [1 * K.AP, '1 AP to raise the weapon'],
  disarmed: [2 * K.AP, '2 AP to recover the weapon'],
  grappled: [2 * K.AP, '2 AP to break free'],
  pinned: [0.5, "can't move and −2 to hit for a round"],
  nailed: [2 * K.AP, '2 AP to pull free'],
  slowed: [0.5, 'half Movement for 2 rounds: about 1 AP of walking'],
  weakened: [0.25 * K.ENEMY_ATTACKS * 2, '25% off about 2 attacks a turn for 2 rounds'],
  blinded: [4 * HIT * K.ENEMY_ATTACKS, '−4 to hit on about 2 attacks'],
  fear: [1.0, "can't attack the source for 2 rounds: about 1 attack redirected or lost"],
  taunted: [0.5, 'one attack forced onto the taunter'],
  shaken: [0.1, '−2 on Heart saves'],
  silenced: [1.0, 'a caster loses a turn of magic; nothing against anyone else'],
  confused: [0.5, 'half of its attacks go astray for a round'],
  left_brain_debuff: [0.25, '+1 AP on glyphs and Evokes; casters only'],
  right_brain_debuff: [0.25, '+20% MP; casters only'],
  commanded: [1.0, 'one order obeyed on its next turn'],
};
const condV = (id: string) => COND[id]?.[0] ?? null;

// ------------------------------------------------------------------------------------------------ small tools
const round2 = (n: number) => Math.round(n * 100) / 100;
const num = (n: number | null | undefined, d = 2) => (n == null || !isFinite(n) ? '' : String(Math.round(n * 10 ** d) / 10 ** d));
const cell = (s: any) => String(s ?? '').replace(/\|/g, '/').replace(/\s*\n\s*/g, ' ').trim();
const short = (s: string, n = 150) => { s = cell(s); return s.length <= n ? s : s.slice(0, n - 1).replace(/[\s,;:.]+\S*$/, '') + '…'; };
const USES: Record<string, string> = { at_will: '', per_turn: 'a turn', per_round: 'a round', per_combat: 'a fight', per_scene: 'a scene', per_session: 'a session', per_rest: 'a rest', per_campaign: 'a campaign', reaction: 'as a reaction', out_of_combat: 'out of a fight only' };
const usesWord = (per?: string, n = 1) => (!per || per === 'at_will' || per === 'undefined' ? '' : per === 'reaction' ? 'a reaction' : per === 'out_of_combat' ? 'out of a fight only' : (n === 1 ? 'once ' : n + ' times ') + (USES[per] || per));
const SRC = fileURLToPath(new URL('../../src', import.meta.url));
const walk = (d: string): string[] => readdirSync(d).flatMap((n) => { const f = join(d, n); return statSync(f).isDirectory() ? walk(f) : /\.ts$/.test(n) ? [f] : []; });
const SOURCES = walk(SRC).map((f) => ({ file: f.slice(SRC.length + 1), text: readFileSync(f, 'utf8') }));
/** The base AP the engine's code gives an action: the number written at its actionAp({ u }, '<name>', <n>) call. */
function codeAp(name: string): number | null {
  const re = new RegExp("actionAp\\(\\{[^}]*\\}, '" + name + "', (\\d+)\\)");
  for (const s of SOURCES) { const m = re.exec(s.text); if (m) return Number(m[1]); }
  return null;
}
const dataAction = (id: string): any => (R.combat.actions as any[]).find((a) => a.id === id) || null;

interface Row {
  fam: string; name: string;
  /** AP as shown, and as a number for the sums (null: no single number) */ ap: string; apN: number | null;
  /** every other cost, in words */ price: string;
  /** the other costs that are counted as price, in AP (Momentum, a reaction) */ extraAp: number;
  /** how often */ limit: string;
  buys: string;
  /** damage dealt / damage prevented or HP restored / enemy AP or turn removed / AP given to the squad / position / upkeep / information / judgement */ cur: string;
  /** worth, in plain attacks (null: not priced) */ v: number | null;
  /** how the worth was reached */ how: string;
  /** where the price was read */ from: string;
  /** set when part of what it does has no price: never flagged */ partial?: boolean;
  /** not an action: always on, or automatic */ passive?: boolean;
  /** what the engine's own card showed, where it differs or adds */ engine?: string;
  note?: string;
  cls?: string;
  // derived
  full?: number | null; perAp?: number | null; ratio?: number | null; surplus?: number | null; flag?: string;
}
const rows: Row[] = [];
const problems: string[] = []; // prices that could not be read, and places where the data and the engine disagree
function add(r: Partial<Row> & { fam: string; name: string }) {
  rows.push({ ap: '', apN: null, price: '', extraAp: 0, limit: '', buys: '', cur: '', v: null, how: '', from: 'data', ...r } as Row);
}
function derive(r: Row) {
  r.full = r.apN == null ? null : r.apN + (r.extraAp || 0);
  r.flag = ''; r.perAp = null; r.ratio = null; r.surplus = null;
  if (r.v == null || r.full == null || r.passive) return;
  r.surplus = r.v - K.AP * r.full;
  if (r.full > 0) { r.perAp = r.v / r.full; r.ratio = r.perAp / K.AP; }
  if (r.partial) return;
  if (r.full === 0) { if (r.v >= K.FREE_WORTH) r.flag = 'cheap for what it does'; return; }
  r.flag = r.ratio! >= K.CHEAP ? 'cheap for what it does' : r.ratio! <= K.DEAR ? 'dear for what it does' : '';
}

// ------------------------------------------------------------------------------------------------ the yardstick, measured
const YARD_GUN = 'hellraiser_service_rifle';
const net = (p: any) => Math.max(0, Math.round(p.dmg.total - Math.max(0, p.dmg.armour - p.dmg.pierce)));
function yardstick() {
  const f = fightWith([{ weapon: YARD_GUN, level: 1, skills: { dexterity: K.REF }, attrs: { agility: K.REF } }], [{ tier: 'soldier', at: 'H6', weapon: YARD_GUN }]);
  const pc = f.pc, foe = f.foe; pc.pos = '3,5'; foe.pos = '7,5'; foe.ap = 6; // off its turn a unit has no AP, and the card would only say so
  const out = withGame(f.g, () => A.previewAttack(f.cb, pc, foe, 'shot')), back = withGame(f.g, () => A.previewAttack(f.cb, foe, pc, 'shot'));
  return { hit: net(out), pct: out.pct, ap: out.ap, enemyHit: net(back), enemyPct: back.pct, foeHp: foe.maxHp, pcHp: pc.maxHp, pcArmour: pc.armour, foeArmour: foe.armour };
}
/** Numbers of the reference character: 4 points in each skill and attribute it uses (the engine's own formulas). */
function reference() {
  const f = fightWith([{ level: 1, skills: { brain_power: K.REF, will_power: K.REF, faith: K.REF, empathy: K.REF, ingenuity: K.REF, durability: K.REF, rumination: K.REF },
    attrs: { intelligence: K.REF, expression: K.REF, determination: K.REF, insight: K.REF, virtue: K.REF, agility: K.REF, endurance: K.REF, perception: K.REF } }], [{}]);
  const c = f.g.characters[f.pc.charId];
  const g = (name: string, fallback: number) => { try { const v = A[name](c); return typeof v === 'number' && isFinite(v) ? v : fallback; } catch { problems.push('The engine could not give ' + name + ' for the reference character; ' + fallback + ' was used.'); return fallback; } };
  return { sigilMult: g('sigilMult', 1), soulMult: g('soulMult', 1), glyphAp: g('glyphAp', 1), blessing: g('blessingPower', 1), healing: g('healingMult', 1), ambush: g('ambushMult', 1.5), movement: g('movement', 2.5), strainLimit: g('strainLimit', 3), maxMp: g('maxMp', 100), elemental: g('elementalMult', 1), maxWords: g('maxSigilWords', 3), coreSaving: g('sigilCoreSaving', 0) };
}

// ------------------------------------------------------------------------------------------------ what each thing buys (PROPOSED prices)
// Each entry turns the item's OWN numbers (n, from the data) into a worth in plain attacks. d: the damage part (a
// multiple of the same weapon's plain attack); x: everything else, already weighted by its chance; how: the sum in
// words; partial: part of it has no price (it is then never flagged); cur: the currency; set: a set-up it needs.
type Val = { d?: number; x?: number; how: string; partial?: boolean; cur?: string; set?: string; extraAp?: number; max?: string };
let Y: ReturnType<typeof yardstick>, REF: ReturnType<typeof reference>;
const hpOut = (h: number) => h / (K.PCT * Y.hit);       // damage dealt for certain, in plain attacks
const hpIn = (h: number) => h / (K.PCT * Y.hit);        // damage prevented or HP restored: a point of HP is a point of HP, whose side it is on
const tile = () => K.AP / REF.movement;                  // one tile of movement
const onHit = (v: number) => v * K.PCT, onSave = (v: number) => v * K.SAVE, onHitSave = (v: number) => v * K.PCT * K.SAVE;
const TECH_VALUE: Record<string, (n: any) => Val> = {
  // ---- melee: Openers
  lunge: (n) => ({ d: 1, x: n.step * tile(), how: '1 strike + a free step of ' + n.step + ' tile' }),
  charge: (n) => ({ d: 1 + (n.min_run * n.per_tile_pct) / 100, how: '1 strike at +' + n.min_run * n.per_tile_pct + '% (a ' + n.min_run + '-tile run; up to +' + n.max_pct + '%)', set: 'a straight run of ' + n.min_run + '+ tiles this turn', max: '×' + (1 + n.max_pct / 100) }),
  feint: (n) => ({ x: onSave(n.hit * HIT), how: 'no damage; +' + n.hit + ' to hit on your next technique if it fails a Brain save', cur: 'damage dealt' }),
  draw_cut: () => ({ d: 1, x: K.AP, how: '1 strike + the 1 AP draw it replaces', set: 'the weapon stowed at the start of the turn' }),
  ambush: () => ({ d: REF.ambush, how: '1 strike at the Ambush multiplier (×' + num(REF.ambush) + ' at Ingenuity ' + K.REF + '); a critical on 19 or 20', set: 'the 2 AP Hide before it is counted in the price', extraAp: codeAp('hide') ?? 2 }),
  // ---- melee: Strikes
  cut: () => ({ d: 1, how: 'the plain attack' }),
  sweep: (n) => ({ d: n.mult * 2, how: '×' + n.mult + ' on each of 2 enemies (up to 3)', max: '×' + round2(n.mult * 3) + ' on 3 enemies' }),
  bash: (n) => ({ d: n.mult, x: onHitSave(condV('dazed')!), how: '×' + n.mult + ' + Dazed on a failed Body save' }),
  sunder: (n) => ({ d: n.mult, x: onHit(hpOut(n.lower) * K.ARMOUR_HITS), how: '×' + n.mult + ' + armour −' + n.lower + ' for the fight (about ' + K.ARMOUR_HITS + ' later hits)' }),
  flurry: (n) => ({ d: n.mult * n.strikes * (1 + (n.later_hit * HIT) / 2), how: n.strikes + ' strikes at ×' + n.mult + ', the second at ' + n.later_hit + ' to hit', max: n.light_strikes + ' strikes with a light weapon (×' + round2(n.mult * n.light_strikes) + ')' }),
  hamstring: (n) => ({ d: n.damage_mult, x: onHitSave(condV('slowed')!), how: '×' + n.damage_mult + ' + Slowed ' + n.slow_rounds + ' rounds on a failed Body save' }),
  bind: (n) => ({ x: n.penalty * HIT * K.ENEMY_ATTACKS, how: 'no damage; the target attacks anyone but you at −' + n.penalty + ' until your next turn, and can\'t walk away without a save', cur: 'damage prevented', partial: true }),
  half_sword: (n) => ({ d: n.damage_mult, x: hpOut(Math.min(n.armour_ignore, A.ENEMY.soldier.armour)), how: '×' + n.damage_mult + ', ignoring ' + n.armour_ignore + ' armour (a soldier has ' + A.ENEMY.soldier.armour + ')' }),
  throw: (n) => ({ d: n.unthrown_mult * (1 - n.unthrown_hit * HIT), how: 'a weapon not made for throwing: ×' + n.unthrown_mult + ' at −' + n.unthrown_hit + ' to hit; a throwing weapon: ×1. The weapon leaves your hand until you Pull Out (see "Throw, then Pull Out")', max: '×1 with a throwing weapon', partial: true }),
  pull_out: (n) => ({ d: n.damage_pct / 100 / K.PCT, x: hpOut(15), how: n.damage_pct + '% of the weapon\'s damage with no roll + Bleeding (15 damage); only after a Throw that hit (see "Throw, then Pull Out")', set: 'your thrown weapon stuck in the target, and you next to it', partial: true }),
  // ---- melee: Links
  sidestep: (n) => ({ x: n.tiles * tile(), how: 'a free step of ' + n.tiles + ' tile; your next Strike ignores a shield and counts as flanking (not priced)', cur: 'position', partial: true }),
  guard: (n) => ({ x: n.defense * HIT * K.ENEMY_ATTACKS + hpIn(TR.guard.soak * (TR.guard.gain_base + TR.guard.gain_per_point * (K.REF - 1))), how: '+' + n.defense + ' Defense against melee until your next turn + ' + (TR.guard.gain_base + TR.guard.gain_per_point * (K.REF - 1)) + ' Guard at Durability ' + K.REF + ' (each soaks ' + TR.guard.soak + ' damage)', cur: 'damage prevented' }),
  shove: (n) => ({ x: n.tiles * tile(), how: 'the enemy is pushed ' + n.tiles + ' tile (it walks back), or Prone if it can\'t move back; what the push sets up is not priced', cur: 'position', partial: true }),
  trip: () => ({ x: onSave(condV('prone')! + 2 * HIT), how: 'Prone on a failed Body save (1 AP to stand, and melee attacks on it at +2)', cur: 'enemy AP removed' }),
  drag: (n) => ({ x: n.tiles * tile(), how: 'the target is pulled ' + n.tiles + ' tile, or you swap tiles (Body save)', cur: 'position', partial: true }),
  // ---- melee: Finishers (they spend all Momentum; priced at the 2 they need)
  coup: (n) => ({ d: 1 + (2 * n.per_momentum_pct) / 100, how: '1 strike at +' + n.per_momentum_pct + '% per Momentum (2 spent)', max: '×' + (1 + (TR.momentum.fighter_max * n.per_momentum_pct) / 100) + ' at ' + TR.momentum.fighter_max + ' Momentum (a Fighter)' }),
  cleave: (n) => ({ d: 2, how: '1 strike, repeated at full damage on 1 more adjacent enemy (up to 1 more per Momentum)', max: '×3 with 2 Momentum and 3 enemies adjacent' }),
  break: (n) => ({ d: 1, x: K.PCT * (K.SAVE + 0.05 * 2 * n.save_per_momentum) * condV('stunned')!, how: '1 strike + Stunned (a lost turn) on a failed Body save at −' + n.save_per_momentum + ' per Momentum; a boss is Dazed instead' }),
  run_through: (n) => ({ d: 1 + (2 * n.per_momentum_pct) / 100, x: onHit(n.pull_free_ap * K.AP), how: '1 strike at +' + n.per_momentum_pct + '% per Momentum (2 spent) + Pinned with no save until it spends ' + n.pull_free_ap + ' AP' }),
  throw_down: (n) => ({ d: 1 + (2 * n.per_momentum_pct) / 100, x: onHit(condV('prone')!), how: '×' + (1 + (2 * n.per_momentum_pct) / 100) + ' (2 Momentum) + Prone, no save', set: 'the target Grappled or Bound by you' }),
  // ---- melee: Answers (worth when the trigger happens)
  parry: (n) => ({ x: K.SAVE * (1 - n.halve), how: 'an opposed roll; if you win, the hit does half damage', cur: 'damage prevented' }),
  riposte: () => ({ d: 1, how: 'a free strike when a melee attack misses you' }),
  keep_back: () => ({ d: 1, x: onHitSave(K.AP), how: 'a free strike at an enemy entering your reach; on a hit it saves or stops there' }),
  // ---- ranged: Fire
  shot: () => ({ d: 1, how: 'the plain attack' }),
  snap_shot: (n) => ({ d: 1 - n.penalty * HIT, x: K.AP, how: '1 shot at −' + n.penalty + ' to hit + the 1 AP draw it replaces', set: 'the weapon stowed' }),
  burst: (n) => ({ d: 1 + (1 - n.later_penalty * HIT), how: n.rolls + ' shots, the second at −' + n.later_penalty + ' to hit', max: n.auto_rolls + ' shots with an automatic weapon' }),
  aimed_shot: (n) => ({ d: 1 + n.hit * HIT, how: '1 shot at +' + n.hit + ' to hit' }),
  called_shot: (n) => ({ d: 1 - n.penalty * HIT, x: onHitSave(condV('dazed')!), how: '1 shot at −' + n.penalty + ' to hit + Dazed (head), Slowed (leg) or a lowered weapon (arm) on a failed Body save; priced for the head' }),
  walking_fire: (n) => ({ d: 1, x: n.tiles * tile(), how: '1 shot + ' + n.tiles + ' tiles of movement' }),
  punch_through: (n) => ({ d: 1 + (5 - n.half_cover) * HIT, how: '1 shot; half cover gives the target −' + n.half_cover + ' instead of −5, and the cover takes the damage too', set: 'only better than a Shot against a target in half cover' }),
  lob: (n) => ({ d: 1 + n.hit * HIT, how: '1 shot at ' + n.hit + ' to hit at a target you can\'t see (an ally must)', set: 'an ally who sees the target' }),
  heavy_bolt: (n) => ({ d: 1 + n.damage_pct / 100, x: hpOut(Math.min(n.pierce, A.ENEMY.soldier.armour)) + onHitSave(n.push * tile()), how: '1 bolt at +' + n.damage_pct + '%, ignoring ' + n.pierce + ' armour; a pushed tile on a failed save' }),
  // ---- ranged: Press
  suppress: (n) => ({ d: n.damage_mult * (1 + n.hit * HIT), x: (K.PCT * n.pressure_hit + (1 - K.PCT) * n.pressure_miss) * K.PRESSURE, how: 'half damage at +' + n.hit + ' to hit + ' + n.pressure_hit + ' Pressure on a hit, ' + n.pressure_miss + ' on a miss' }),
  rake: (n) => ({ d: 2 * (1 + n.hit * HIT), x: 2 * K.PCT * n.pressure * K.PRESSURE, how: 'a shot at ' + n.hit + ' to hit at each of 2 enemies standing together (up to ' + n.targets + '), ' + n.pressure + ' Pressure per hit', max: '×' + round2(n.targets * (1 + n.hit * HIT)) + ' on ' + n.targets + ' enemies' }),
  warning_shot: (n) => ({ x: onSave(n.pressure * K.PRESSURE), how: 'no damage; ' + n.pressure + ' Pressure on a failed Heart save', cur: 'enemy AP removed' }),
  flush: (n) => ({ x: n.pressure * K.PRESSURE, how: 'no roll: ' + n.pressure + ' Pressure, and the cover takes double the weapon\'s damage (the cover is not priced)', cur: 'enemy AP removed', partial: true }),
  mag_dump: (n) => ({ d: [0, 1, 2, 3].slice(0, n.max_rolls).reduce((t, i) => t + (1 - i * n.step * HIT), 0), x: n.max_rolls * K.PCT * n.pressure * K.PRESSURE, how: n.max_rolls + ' shots (a full magazine), each at −' + n.step + ' more, +' + n.pressure + ' Pressure per hit; the weapon is empty afterwards', extraAp: dataAction('reload')?.ap ?? 2, set: 'one shot per ' + n.per_roll + ' rounds left, so ' + n.per_roll * n.max_rolls + ' or more for all ' + n.max_rolls + '; the 2 AP reload after it is counted in the price' }),
  crossfire: (n) => ({ d: 1 + n.hit * HIT, x: onHit(n.extra_pressure * K.PRESSURE), how: '1 shot at +' + n.hit + ' to hit, +' + n.extra_pressure + ' Pressure on a hit', set: 'an ally has hit the target this round' }),
  // ---- ranged: Sets
  bead: (n) => ({ x: 2 * HIT, how: 'your shots at one target ignore ' + n.range_bands + ' range band (−2 to hit beyond effective range), and its Pressure doesn\'t fall; priced as one shot helped', cur: 'damage dealt', partial: true }),
  spot: (n) => ({ x: K.ALLIES * n.hit * HIT + onHit(n.first_hit_pressure * K.PRESSURE), how: 'allies get +' + n.hit + ' to hit the target until your next turn (about ' + K.ALLIES + ' attacks), +' + n.first_hit_pressure + ' Pressure on the first hit', cur: 'damage dealt' }),
  brace: () => ({ how: 'Recoil halved until you move (worth more the more you fire)', cur: 'damage dealt', partial: true }),
  load_special: () => ({ how: 'one special round for your next shot (worth what the round is worth)', cur: 'damage dealt', partial: true }),
  shift: (n) => ({ x: n.tiles * tile(), how: n.tiles + ' tile from cover to cover without setting off a held shot', cur: 'position', partial: true }),
  vent: (n) => ({ x: (n.heat / 2) * HIT * 2, how: '−' + n.heat + ' Heat: +' + n.heat / 2 + ' to hit on your next shots (2 counted), and further from a jam', cur: 'damage dealt', partial: true }),
  head_down: (n) => ({ x: n.pressure * K.PRESSURE, how: '−' + n.pressure + ' Pressure on yourself (−' + n.full_cover_pressure + ' behind full cover); no held shot this round', cur: 'damage prevented', max: num(n.full_cover_pressure * K.PRESSURE) + ' behind full cover' }),
  // ---- ranged: Takes (the target must be Pressed)
  dead_centre: (n) => ({ d: 1 + n.damage_pct / 100, how: '1 shot at +' + n.damage_pct + '%' }),
  pin_down: (n) => ({ d: n.damage_mult, x: onHitSave(condV('pinned')!), how: '×' + n.damage_mult + ' + Pinned ' + n.pinned_rounds + ' round on a failed save' }),
  rout: (n) => ({ x: onSave(n.run_ap * K.AP), how: 'no damage; on a failed Heart save the target runs its full move away (' + n.run_ap + ' AP of its turn), drawing opportunity attacks and held shots', cur: 'enemy turn removed' }),
  stopping_shot: (n) => ({ d: 1, x: onHitSave(n.ap_loss * K.AP + n.push * tile()), how: '1 shot + −' + n.ap_loss + ' AP next turn and a ' + n.push + '-tile push on a failed save' }),
  storm: (n) => ({ d: 1, x: n.move * tile(), how: '1 shot + up to ' + n.move + ' tiles toward the target with no reaction from it' }),
  last_round: (n) => ({ d: 1 + n.hit * HIT, how: '1 shot at +' + n.hit + ' to hit; a free speed reload if it takes the target out (not priced). The +' + n.damage_pct + '% is a revolver\'s line (Quick or Precise weapons), not the rifle\'s', set: 'the last round in the weapon', partial: true, max: '×' + round2((1 + n.damage_pct / 100) * (1 + n.hit * HIT)) + ' with a revolver' }),
  // ---- ranged: held shots (worth when the trigger happens)
  overwatch: () => ({ d: 1, how: '1 shot at the first enemy that moves in your sight, on its turn' }),
  deny: () => ({ d: 1, x: onHit(K.AP), how: '1 shot at the first enemy onto a tile you picked; on a hit it stops and loses the rest of its move' }),
  cover_me: (n) => ({ x: n.attack_penalty * HIT + n.pressure * K.PRESSURE, how: 'the first enemy to attack one ally does it at −' + n.attack_penalty + ' to hit and gains ' + n.pressure + ' Pressure', cur: 'damage prevented' }),
  dead_to_rights: (n) => ({ d: 1 + n.hit * HIT, how: '1 shot at +' + n.hit + ' to hit, before a Pressed enemy acts' }),
  // ---- shield and grapple
  shield_bash: (n) => ({ x: onHit(n.momentum_on_hit * K.MOMENTUM_AP * K.AP) + onHitSave(n.push * tile()), how: 'a bare-hand strike at ×' + n.mult + ' (fist damage, not the weapon\'s: not priced) + ' + n.momentum_on_hit + ' Momentum on a hit, a push on a failed save', partial: true, cur: 'damage dealt' }),
  raise_shield: (n) => ({ x: n.ranged_defense * HIT * K.ENEMY_ATTACKS, how: 'ranged attacks from the front at −' + n.ranged_defense + ' to hit you until your next turn; turns Momentum into Guard 1 for 1', cur: 'damage prevented' }),
  grapple: () => ({ x: onSave(condV('grappled')!), how: 'Grappled on a failed Body save (2 AP to break free); sets up Throw Down', cur: 'enemy AP removed' }),
  shield_wall: (n) => ({ x: n.half_cover * HIT, how: 'a shot at an ally next to you is at −' + n.half_cover + ' to hit', cur: 'damage prevented' }),
  interpose: () => ({ how: 'you take a hit meant for an ally next to you, with your armour and Guard (worth the difference between the two of you)', cur: 'damage prevented', partial: true }),
};
/** Techniques with a set-up whose card in the test fight is still the true one (the set-up is staged, or the card's own penalty is the point). */
const CARD_ANYWAY = new Set(['last_round', 'lob', 'mag_dump']);
const CALL_VALUE: Record<string, (n: any) => Val> = {
  'call.order': (n) => ({ x: (n.things >= 2 ? 3 : 2) * K.AP, how: 'an ally does ' + n.things + ' thing' + (n.things > 1 ? 's' : '') + ' for none of their AP (a reload is 2 AP' + (n.move ? ', a move 1 AP' : '') + '); it uses their reaction, counted in the price', cur: 'AP given to the squad', extraAp: K.REACTION_AP, set: 'the ally\'s reaction' }),
  'call.rally': (n) => ({ x: n.ap * K.AP + n.pressure * K.PRESSURE, how: '+' + n.ap + ' AP to an ally' + (n.pressure ? ' and −' + n.pressure + ' Pressure' : ''), cur: 'AP given to the squad' }),
  'call.brief': (n) => ({ x: (n.first + n.second) * K.AP, how: 'an ally\'s next action' + (n.second ? 's cost' : ' costs') + ' ' + (n.first + n.second) + ' AP less in all', cur: 'AP given to the squad' }),
  'call.name_it': (n) => ({ x: n.saves * 0.05 * 1.0 + (n.fresh_save ? K.SAVE * 0.5 : 0), how: '+' + n.saves + ' on saves until your next turn (priced against one condition worth 1 attack)' + (n.fresh_save ? ' + a new save against a condition they carry' : '') + (n.ends_fear ? ' + ends Shaken and Afraid' : ''), cur: 'damage prevented', partial: !!n.ends_fear }),
  'call.cue': (n) => ({ x: K.REACTION_AP * K.AP, how: 'an ally gets one more reaction' + (n.step ? ', or a free step' : ''), cur: 'AP given to the squad' }),
  'call.spot': (n) => ({ x: n.allies * (5 * HIT + n.hit * HIT), how: 'the next ' + (n.allies > 1 ? n.allies + ' allies' : 'ally') + ' to attack it ignore' + (n.allies > 1 ? '' : 's') + ' its cover (−5 to hit in half cover)' + (n.hit ? ' and get +' + n.hit + ' to hit' : '') + '; no save', cur: 'damage dealt', set: 'only worth it against a target in cover' }),
  'call.warn': (n) => ({ x: 0.5 + Math.abs(n.hit) * HIT, how: 'an ally steps ' + n.tiles + ' tile' + (n.tiles > 1 ? 's' : '') + ' out of the next weapon attack on them (priced as wasting it half the time)' + (n.hit ? '; that attack is at ' + n.hit + ' to hit' : ''), cur: 'damage prevented' }),
  'call.threaten': (n) => ({ x: onSave(condV('shaken')! + n.ap_loss * K.AP + (n.no_approach ? tile() : 0)), how: 'on a failed Heart save: Shaken 3 rounds, −' + n.ap_loss + ' AP next turn' + (n.no_approach ? ', can\'t close on you' : ''), cur: 'enemy AP removed' }),
  'call.taunt': (n) => ({ x: onSave(condV('taunted')! + n.attack_ap * K.AP), how: 'on a failed Heart save: its next attack must be at you' + (n.attack_ap ? ' and costs it ' + n.attack_ap + ' AP more' : ''), cur: 'enemy AP removed' }),
};
/** Class moves, by "<origin>.<moveId>" (the key the engine runs them under). m: the move's data. */
const MOVE_VALUE: Record<string, (m: any) => Val> = {
  'defender.brace': () => ({ x: hpIn(TR.guard.soak * K.REF) + 2 * HIT * K.ENEMY_ATTACKS, how: K.REF + ' Guard at Durability ' + K.REF + ' (each soaks ' + TR.guard.soak + ' damage) + 2 Defense until you move', cur: 'damage prevented' }),
  'defender.draw_fire': () => ({ x: condV('taunted')! + 2 * HIT, how: 'Taunted with no save: its next attack must be at you, −2 to hit anyone else', cur: 'damage prevented' }),
  'adamantile_knight.unbroken': () => ({ how: 'once a fight you stay at 1 HP instead of going down, and gain 3 Guard', cur: 'damage prevented', partial: true }),
  'defender.shrug_it_off': () => ({ how: 'Bleeding, Slowed, Weakened or Prone ends at once (worth the condition it ends)', cur: 'damage prevented', partial: true }),
  'defender.reactive_plate': () => ({ x: hpIn(TR.guard.soak), how: 'each Guard takes ' + TR.guard.soak + ' off a hit, for no AP and no reaction (priced per Guard)', cur: 'damage prevented' }),
  'defender.anchor': () => ({ how: "while Braced you can't be moved or knocked Prone; an opportunity attack even on a Disengage", cur: 'position', partial: true }),
  'fighter.lunge': () => ({ d: 1, x: 2 * tile(), how: '1 strike + a free move of up to 2 tiles' }),
  'fighter.shove': () => ({ x: onSave(condV('prone')!), how: 'a 1-tile push or Prone, your choice, on a failed Body save', cur: 'enemy AP removed' }),
  'fighter.riposte': () => ({ d: 1, how: 'a free strike when a melee attack misses you' }),
  'shade.lingering_dread': () => ({ how: 'on a kill, enemies within 3 tiles save or are Shaken', cur: 'enemy AP removed', partial: true }),
  'fighter.finisher': () => ({ d: 1 + 0.2 * 3, how: '1 strike at +20% per Momentum spent (3 counted)', max: '×2 at 5 Momentum' }),
  'fighter.unstoppable': () => ({ x: 2 * K.MOMENTUM_AP * K.AP, how: '+2 Momentum; Fear, Shaken, Slowed and Pinned set aside and no opportunity attacks on you until your next turn (not priced)', cur: 'position', partial: true }),
  'marksman.fire_discipline': () => ({ how: 'once a turn a Burst costs 2 AP instead of 3; Aimed shots add no Heat', cur: 'AP given to the squad', partial: true }),
  'marksman.speed_loader': () => ({ how: 'your first reload each turn costs 1 AP less', cur: 'AP given to the squad', partial: true }),
  'marksman.special_ammo': () => ({ how: 'a magazine of armour-piercing (×0.8, ignores armour), hollow-point (×1.3 against doubled armour) or incendiary (×0.9 + Burning)', cur: 'damage dealt', partial: true }),
  'marksman.duck_and_roll': () => ({ x: 2 * HIT, how: 'a free step when shot at: the shot is at −2 if you reach cover, and not made at all if you leave its sight', cur: 'damage prevented', partial: true }),
  'marksman.killzone': () => ({ d: 2 * (1 + 2 * HIT), how: '2 held shots at +2 to hit, at the first two enemies that move in your line' }),
  'gunslinger.called_shot': () => ({ d: 1 - 2 * HIT, x: onHit(condV('dazed')!), how: '1 shot at −2 to hit + an injury with no save on a hit (head: Dazed; priced for the head)' }),
  'assassin.mark': () => ({ x: K.MARK_ATTACKS * HIT, how: 'the squad has +1 to hit it for the fight (about ' + K.MARK_ATTACKS + ' attacks), and it can\'t hide', cur: 'damage dealt' }),
  'infiltrator.vanish': () => ({ x: REF.ambush - 1, how: 'Hidden: can\'t be targeted (not priced), and your next attack is an Ambush (×' + num(REF.ambush) + ')', cur: 'damage dealt', partial: true, set: 'no enemy can see you' }),
  'assassin.toxin': () => ({ x: onSave(condV('weakened')!), how: 'your next hit forces a Body save or Weakened (or Slowed, or Bleeding)', cur: 'damage prevented' }),
  'infiltrator.field_fix': () => ({ how: "an ally's jam cleared, their weapon mended, or a machine repaired for 20 HP", cur: 'upkeep', partial: true }),
  'assassin.execution': () => ({ how: 'a Marked enemy at a quarter of its HP or less dies to your hit (not bosses)', cur: 'damage dealt', partial: true }),
  'infiltrator.sabotage': () => ({ x: hpOut(30) + onSave(condV('pinned')!), how: 'a rigged tile: 30 damage, the enemy stops, and is Pinned on a failed save (priced as if it is stepped on)', cur: 'damage dealt', partial: true }),
  'mage.barrage': () => ({ how: 'FIRE, FREEZE, SHOCK, STONE and ACID cost 1 charge instead of 2', cur: 'upkeep', partial: true }),
  'mage.core_change': () => ({ how: 'a core swap costs 1 AP less', cur: 'AP given to the squad', partial: true }),
  'mage.overcharge': () => ({ x: REF.glyphAp * K.AP, how: 'your next glyph costs no AP and no charge (' + num(REF.glyphAp, 1) + ' AP saved), and its spell may hold 1 word more', cur: 'AP given to the squad' }),
  'mage.bleed_the_flux': () => ({ how: 'Vent costs 1 AP less (free)', cur: 'AP given to the squad', partial: true }),
  'mage.payload': () => ({ how: 'an Evoke with double area (or one more missile); + Flux equal to its glyphs', cur: 'damage dealt', partial: true }),
  'scribe.stored_spell': () => ({ how: 'a whole spell written before the fight goes off for 1 AP (worth the spell; it saves every glyph\'s AP)', cur: 'damage dealt', partial: true }),
  'trickster.read': () => ({ how: 'Analyze costs 1 AP and shows the target\'s next move', cur: 'information', partial: true }),
  'trickster.false_image': () => ({ x: onSave(1.0), how: 'a decoy for 2 rounds: an enemy that fails a Brain save attacks it instead of you (priced as one attack wasted)', cur: 'damage prevented' }),
  'trickster.blind_and_slow': () => ({ how: 'BLIND, SLOW and MUDDLE learned; MUDDLE costs 1 charge less', cur: 'upkeep', partial: true }),
  'trickster.silver_tongue': () => ({ x: onSave(2 * K.AP), how: '−2 AP on its next turn on a failed Brain save (a boss: −1)', cur: 'enemy AP removed' }),
  'trickster.rewrite': () => ({ how: 'one helpful state on an enemy flips into its opposite on a failed Brain save (worth the state)', cur: 'enemy AP removed', partial: true }),
  'trickster.sleight': () => ({ how: 'swap places with your decoy or an ally within 6 tiles, no opportunity attacks', cur: 'position', partial: true }),
  'medic.triage': () => ({ x: hpIn(20 * REF.healing), how: 'heals 20 × Healing given (×' + num(REF.healing) + ': Empathy is a Bard skill) and ends Bleeding; no Supplies', cur: 'HP restored' }),
  'bard.inspire': () => ({ x: 2 * HIT, how: '+2 on an ally\'s next d20', cur: 'damage dealt' }),
  'medic.stim_throw': () => ({ x: hpIn(30 * REF.healing), how: 'heals 30 × Healing given at 4 tiles and ends Bleeding', cur: 'HP restored' }),
  'bard.mend': () => ({ how: 'healing Outbursts heal from 40 instead of 30', cur: 'HP restored', partial: true }),
  'medic.field_surgery': () => ({ how: 'out of a fight only', cur: 'upkeep', partial: true }),
  'bard.rally': () => ({ x: K.ALLIES * hpIn(20 * REF.healing), how: 'every ally within 4 tiles heals 20 × Healing given (' + K.ALLIES + ' allies counted, all of them hurt; the Bard is not healed) and loses Fear and Shaken', cur: 'HP restored' }),
  'channeler.shape': () => ({ how: 'your first paid Pump each turn on a Damage Outburst is free', cur: 'AP given to the squad', partial: true }),
  'channeler.iron_heart': () => ({ how: 'Strain limit +1', cur: 'upkeep', partial: true }),
  'channeler.storm_front': () => ({ how: 'a Bolt or Lance arcs to up to 2 more enemies (up to ×3 the damage) for 10 MP', cur: 'damage dealt', partial: true }),
  'channeler.occult_library': () => ({ how: 'one more ready design and one more tone', cur: 'upkeep', partial: true }),
  'channeler.heart_surge': () => ({ how: 'a Release fires one stage higher (×2.6 past stage 4) for double Strain', cur: 'damage dealt', partial: true }),
  'channeler.eye_of_the_storm': () => ({ how: 'your next Release adds no Strain and its rider counts one stage higher', cur: 'upkeep', partial: true }),
  'guardian.will_shield': () => ({ x: hpIn(30), how: 'a shield of 30 × Healing given for the fight (×1 here: Empathy is not a Guardian skill; ×' + num(REF.healing) + ' with Empathy and Insight ' + K.REF + ')', cur: 'damage prevented', max: Math.round(30 * REF.healing) + ' with Empathy and Insight ' + K.REF }),
  'guardian.command': () => ({ x: 2 * tile(), how: 'an ally moves up to 2 tiles for none of their AP', cur: 'AP given to the squad' }),
  'lumeri_templar.under_the_eye': () => ({ how: 'while you are Witnessed, allies within 3 tiles have +2 to hit', cur: 'damage dealt', partial: true }),
  'lumeri_templar.blessed_shells': () => ({ how: 'a Hymn waits in your weapon and lands with your next hit', cur: 'damage dealt', partial: true }),
  'guardian.sanctuary': () => ({ x: 0.5 * K.ALLIES, how: 'allies on 3×3 tiles take half damage until your next turn (about ' + K.ALLIES + ' enemy attacks halved)', cur: 'damage prevented' }),
  'lumeri_templar.judgement': () => ({ d: 1 + REF.blessing, how: '1 attack at × (1 + Blessing power): ×' + num(1 + REF.blessing) + ' at Faith ' + K.REF, max: '×3 at Faith 10' }),
};
/** Perk and trait actions and switches the data lets us price, by item key + '#' + action id (or the key alone). */
const ITEM_VALUE: Record<string, (tier?: string) => Val> = {
  'perk:footnote': (t) => ({ x: K.ALLIES * (t === 'II' ? 2 : 1) * HIT, how: 'allies get +' + (t === 'II' ? 2 : 1) + ' to hit one enemy for the rest of the round (about ' + K.ALLIES + ' attacks)', cur: 'damage dealt' }),
  'perk:double_meaning': () => ({ x: K.ALLIES * 2 * HIT, how: "each squad member's next attack on one enemy gets +2 to hit (about " + K.ALLIES + ' attacks)', cur: 'damage dealt' }),
  'trait:holo_drama_addict': () => ({ x: 3 * HIT, how: '+3 to hit on your next attack this turn, if the Narrator buys it', cur: 'damage dealt' }),
  'perk:the_twin_pays#twin': () => ({ x: A.SPELL_AP.begin * K.AP, how: 'a Begin for 0 AP, no mana and no Strain (' + A.SPELL_AP.begin + ' AP saved; the mana and Strain are not priced)', cur: 'AP given to the squad', partial: true }),
  'perk:heart_overload#again': () => ({ x: A.SPELL_AP.begin * K.AP, how: 'a second Begin for 0 AP right after a Release at stage 2+ (' + A.SPELL_AP.begin + ' AP saved); mana and Strain as usual', cur: 'AP given to the squad' }),
  'trait:daggerfall_veteran#shake_it_off': () => ({ how: 'removes one Heart debuff from yourself (worth the debuff)', cur: 'damage prevented', partial: true }),
  'perk:earthbreaker': () => ({ x: 2 / K.PCT + 2 * condV('prone')!, how: 'your melee damage with no attack roll to everyone on 3×3 tiles (2 enemies counted) + Prone with no save; allies in the area are hit too', cur: 'damage dealt', max: 'more with more enemies in the area' }),
  'perk:supreme_command': () => ({ x: K.ALLIES * 2 * K.AP, how: 'every ally takes 2 AP of free actions (about ' + K.ALLIES + ' allies)', cur: 'AP given to the squad' }),
  'perk:between_heartbeats': () => ({ x: 2 * K.AP, how: '2 AP to act with when an enemy in your sight starts an action', cur: 'AP given to the squad' }),
  'perk:judgement_day': () => ({ x: 1.0, how: "the judged enemy's next attack on an ally fails outright; your attacks on it deal ×1.5 (not priced)", cur: 'damage prevented', partial: true }),
  'perk:bone_talk#bone_talk': () => ({ x: onSave(condV('shaken')!), how: 'Shaken on a failed Heart save', cur: 'enemy AP removed' }),
  'perk:lay_down_arms': () => ({ x: onSave(condV('lowered')! + 1.0), how: 'on a failed Heart save a humanoid lowers its weapon for a round (about 1 attack lost, 1 AP to raise it)', cur: 'enemy AP removed' }),
  'perk:vanishing_act': () => ({ x: REF.ambush - 1, how: 'Hidden even while seen; your next attack is an Ambush (×' + num(REF.ambush) + ')', cur: 'damage dealt', partial: true }),
  'trait:old_school': () => ({ how: 'every round left in the revolver at one target (worth the rounds left)', cur: 'damage dealt', partial: true }),
};

// ------------------------------------------------------------------------------------------------ 1. plain attacks
const ATTR_OF: Record<string, string> = { dexterity: 'agility', raw_power: 'strength', athletics: 'strength' };
const FAMILY_NAME: Record<string, string> = { pistol: 'Pistols', revolver: 'Revolvers', smg: 'Submachine guns', rifle: 'Rifles', shotgun: 'Shotguns', heavy: 'Heavy weapons', bow: 'Bows', light_melee: 'Light melee', heavy_melee: 'Heavy melee', unarmed: 'Unarmed', thrown: 'Thrown', mana: 'Foci (Evokers and Emanators)' };
function plainAttacks() {
  const yardEv = Y.hit * Y.pct;
  for (const w of A.WEAPONS as any[]) {
    const fam = 'Plain attack · ' + (FAMILY_NAME[w.category] || w.category);
    try {
      const melee = ['light_melee', 'heavy_melee', 'unarmed'].includes(w.category), skill = w.skill;
      const f = fightWith([{ weapon: w.id, level: 1, skills: w.category === 'bow' ? { [skill]: K.REF, raw_power: K.REF } : { [skill]: K.REF }, attrs: w.category === 'bow' ? { agility: K.REF, strength: K.REF } : { [ATTR_OF[skill] || 'agility']: K.REF } }], [{ tier: 'soldier', at: 'H6' }]);
      const pc = f.pc, foe = f.foe; pc.pos = melee ? '6,5' : '3,5'; foe.pos = '7,5';
      const mode = melee ? 'melee' : w.modes?.includes('single') === false ? 'burst' : 'shot';
      const p = withGame(f.g, () => A.previewAttack(f.cb, pc, foe, mode));
      if (!p.ok || !p.dmg) { add({ fam, name: w.name, ap: String(w.ap_cost?.single ?? w.ap_cost?.attack ?? '?'), buys: 'not an attack the engine could preview here: ' + (p.why || 'no damage'), cur: 'damage dealt', from: 'data', how: 'not priced' }); continue; }
      const hit = net(p), ev = hit * p.pct;
      add({ fam, name: w.name, ap: String(p.ap), apN: p.ap, price: melee ? '' : [w.magazine != null ? '1 round of ' + w.magazine : '', w.heat_limit ? '+1 Heat (limit ' + w.heat_limit + ')' : ''].filter(Boolean).join(', '),
        buys: hit + ' damage to a soldier (' + p.pct + '% to hit)', cur: 'damage dealt', v: ev / yardEv, how: 'its expected damage ÷ the service rifle\'s (' + Y.hit + ' at ' + Y.pct + '%)', from: 'engine (the attack card)' });
    } catch (e: any) { add({ fam, name: w.name, ap: '?', buys: 'could not be set up: ' + short(String(e?.message || e), 80), from: 'data' }); problems.push('Plain attack with ' + w.name + ': the test fight could not be set up.'); }
  }
}

// ------------------------------------------------------------------------------------------------ 2. techniques
const GROUP_NAME: Record<string, string> = TR.group_names || {};
function techniqueRows() {
  const all = (A.TECHNIQUES as any[]).map((t) => t.id);
  const mk = (weapon: string, melee: boolean, off?: string) => {
    const f = physFight([{ weapon, off, known: all, level: 1, skills: { dexterity: K.REF, raw_power: K.REF, durability: K.REF, athletics: K.REF }, attrs: { agility: K.REF, strength: K.REF, endurance: K.REF } }, { name: 'Squadmate' }],
      [{ tier: 'soldier', name: 'Soldier A' }, { tier: 'soldier', name: 'Soldier B' }, { tier: 'soldier', name: 'Soldier C' }], { seed: 'PRICE1' });
    const [pc, ally] = f.pcs, [a, b, c] = f.foes;
    pc.pos = '5,5'; ally.pos = '4,5';
    // two enemies stand together, as every "each of 2 enemies" price counts them; the third stands apart
    if (melee) { a.pos = '6,5'; b.pos = '6,4'; c.pos = '2,9'; } else { a.pos = '9,5'; b.pos = '9,4'; c.pos = '2,9'; }
    f.turn(f.pc); f.momentum(f.pc, 2);
    try { if (f.pc.res && 'guard' in f.pc.res) f.pc.res.guard = Math.max(f.pc.res.guard || 0, 2); } catch { /* no Guard pool */ }
    if (!melee) try { f.press(f.foes[0], 2, f.pc); } catch { /* the target stays unpressed */ }
    return f;
  };
  let fm: any, fr: any, fs: any;
  try { fm = mk('sabre', true); } catch (e: any) { problems.push('Techniques: the melee test fight could not be set up (' + short(String(e?.message || e), 80) + '); melee prices come from the data only.'); }
  try { fr = mk(YARD_GUN, false); } catch (e: any) { problems.push('Techniques: the ranged test fight could not be set up (' + short(String(e?.message || e), 80) + '); ranged prices come from the data only.'); }
  try { fs = mk('sabre', true, 'riot_shield'); } catch { fs = null; }
  const ev = (pv: any) => (pv?.attacks || []).reduce((t: number, x: any) => t + (x.pv?.dmg ? net(x.pv) * x.pv.pct : 0), 0);
  const plain = { melee: fm ? ev(fm.pv('cut', { targetId: fm.foes[0].id })) : 0, ranged: fr ? ev(fr.pv('shot', { targetId: fr.foes[0].id })) : 0 };
  for (const def of A.TECHNIQUES as any[]) {
    const melee = def.system === 'melee', needsShield = !!def.needs?.shield, f = needsShield ? fs || fm : melee ? fm : fr, weaponId = melee ? 'sabre' : YARD_GUN;
    const fam = 'Technique · ' + (melee ? 'melee' : 'ranged') + ' · ' + (GROUP_NAME[def.group] || def.group);
    const reaction = def.ap?.base === 'reaction', watch = def.group === 'watch';
    // the engine's card: tried on the first enemy, then on its tile, then with no target
    let pv: any = null, why = '';
    // a set-up the test fight can give by hand: Last Round wants one round left in the weapon
    const staged = f && def.id === 'last_round' ? f.unit(f.pc.id) : null, ammo0 = staged?.ammo;
    if (staged) staged.ammo = 1;
    if (f) for (const args of [{ targetId: f.foes[0].id }, { tile: f.foes[0].pos }, { targetId: f.foes[0].id, tile: f.foes[0].pos }, { allyId: f.pcs[1].id }, {}]) {
      try { const p = f.pv(def.id, args); if (p?.ok) { pv = p; break; } why ||= p?.why || ''; } catch (e: any) { why ||= String(e?.message || e); }
    }
    if (staged) staged.ammo = ammo0;
    let apN: number; try { apN = pv ? pv.ap : A.techniqueAp(def, weaponId); } catch { apN = def.ap?.value ?? 0; }
    const dataAp = reaction ? 0 : def.ap?.base === 'flat' ? def.ap.value : null;
    if (pv && dataAp != null && pv.ap !== dataAp && def.id !== 'shot') problems.push('Technique ' + def.name + ': the data says ' + dataAp + ' AP, the engine\'s card says ' + pv.ap + ' AP (with a ' + (melee ? 'sabre' : 'service rifle') + ').');
    const mSpend = pv?.momentum ? Math.max(0, pv.momentum.now - pv.momentum.after) : def.group === 'finisher' ? def.needs?.momentum || 2 : (def.numbers?.momentum_cost ?? (def.free || !melee || reaction || def.group === 'link' ? 0 : TR.momentum.strike_cost));
    const finisher = def.group === 'finisher';
    const mPrice = finisher ? (def.needs?.momentum || 2) : mSpend;
    const gSpend = pv?.guard ? Math.max(0, pv.guard.now - pv.guard.after) : def.numbers?.guard_cost || 0;
    const rounds = pv?.rounds ?? def.rounds;
    const val = TECH_VALUE[def.id]?.(def.numbers || {});
    const price = [
      finisher ? 'all your Momentum (at least ' + (def.needs?.momentum || 2) + ')' : mSpend ? mSpend + ' Momentum' + (def.group === 'opener' && TR.momentum.first_opener_free ? ' (the first Opener of a fight is free)' : '') : '',
      gSpend ? gSpend + ' Guard' : '', rounds ? (rounds === 'all' ? 'every round in the weapon' : rounds + ' round' + (rounds === 1 ? '' : 's')) : '',
      reaction || watch ? 'your reaction' : '', def.needs?.pressed ? 'the target must be Pressed (2 Pressure)' : '', def.needs?.hidden ? 'you must be Hidden' : '', def.needs?.stowed ? 'the weapon must be stowed' : '',
      def.needs?.shield ? 'a shield in the off hand' : '', def.needs?.held ? 'the target Grappled or Bound' : '', def.needs?.last_round ? 'the last round in the weapon' : '', def.perk ? 'the perk ' + (A.PERK[def.perk]?.name || def.perk) : '',
      def.innate ? (A.SKILL[def.innate.skill]?.name || def.innate.skill) + ' ' + def.innate.min : '', val?.set && !/Pressed|Hidden|stowed|last round|Grappled/.test(val.set) ? val.set : '',
    ].filter(Boolean).join('; ');
    const measured = pv && plain[melee ? 'melee' : 'ranged'] && !needsShield ? ev(pv) / plain[melee ? 'melee' : 'ranged'] : null;
    const engine = pv ? [measured != null && (pv.attacks || []).length ? 'damage ×' + num(measured) + ' of the plain attack over ' + pv.attacks.length + ' roll' + (pv.attacks.length > 1 ? 's' : '') : '',
      (pv.pressure || []).length ? 'Pressure ' + pv.pressure.map((x: any) => (x.add >= 0 ? '+' : '−') + Math.abs(x.add)).join(', ') : '', (pv.saves || []).length ? 'save TN ' + pv.saves[0].tn : ''].filter(Boolean).join('; ') : 'no card in the test fight' + (why ? ' ("' + short(why, 70) + '")' : '');
    // the engine's own card is the damage part wherever it shows attack rolls: it carries the test weapon's own lines
    // (an automatic rifle Bursts 3 times, a light blade Flurries 3 times) and its to-hit. A technique whose set-up the
    // test fight does not have (a 3-tile run, cover in the way, a stowed weapon) keeps the sum from its data.
    let dNote = '', cardNote = '';
    if (val && val.d != null && measured != null && (pv.attacks || []).length >= 1 && (!val.set || CARD_ANYWAY.has(def.id))) {
      if (Math.abs(measured - val.d) > 0.1) { dNote = ' (the data\'s numbers alone give ×' + num(val.d) + ')'; cardNote = ' · with the ' + (melee ? 'sabre' : 'service rifle') + ' the engine rolls ' + pv.attacks.length + ' time' + (pv.attacks.length > 1 ? 's' : '') + ' (' + pv.attacks.map((x: any) => x.pv?.pct + '%').join(', ') + '): ×' + num(measured) + ' of its plain attack'; }
      val.d = measured;
    }
    // a technique that waits for the enemy to do something is worth its number only when that happens; how often it
    // happens is the fight simulator's to measure, so these are listed and never flagged
    const waits = reaction || watch;
    const v = val ? (val.d || 0) + (val.x || 0) : null;
    if (!val) problems.push('Technique ' + def.name + ' has no price in TECH_VALUE: it is listed as not priced.');
    add({ fam, name: def.name, ap: reaction ? '0 (reaction)' : def.ap?.base === 'weapon' ? apN + ' (the weapon\'s attack' + (def.ap.add ? (def.ap.add > 0 ? ' +' : ' −') + Math.abs(def.ap.add) : '') + ')' : String(apN), apN: reaction ? 0 : apN,
      price, extraAp: mPrice * K.MOMENTUM_AP + (reaction || watch ? K.REACTION_AP : 0) + (val?.extraAp || 0), limit: reaction || watch ? 'once a round (the reaction)' : def.id === 'guard' ? 'once a turn (you stay on Guard until your next turn); the pool holds your Durability points, 5 at most' : '',
      buys: (val?.how || short(def.text, 160)) + cardNote + (waits ? ' · only if the trigger comes' : '') + (val?.max ? ' [at most: ' + val.max + ']' : ''), cur: val?.cur || 'damage dealt', v: v != null && (val.d != null || val.x != null) ? v : null,
      how: val ? [val.d != null ? 'damage ×' + num(val.d) + dNote : '', val.x ? 'the rest ' + num(val.x) : ''].filter(Boolean).join(' + ') || 'not priced' : 'not priced', partial: val?.partial || waits || undefined, from: pv ? 'engine (the technique card) + data' : 'data', engine });
  }
  // Throw and Pull Out are two halves of one play: priced alone, the first looks dear and the second cheap.
  { const th = rows.find((r) => r.fam.startsWith('Technique') && r.name === 'Throw'), po = rows.find((r) => r.fam.startsWith('Technique') && r.name === 'Pull Out');
    if (th && po && th.v != null && po.v != null && th.apN != null && po.apN != null) {
      const landed = K.PCT - 2 * 0.05; // the Throw is at −2 with a weapon not made for it
      add({ fam: 'Pair of techniques', name: 'Throw, then Pull Out', ap: String(th.apN + po.apN) + ' (' + th.apN + ' + ' + po.apN + ')', apN: th.apN + po.apN, price: th.price + '; you must be next to the target for the Pull Out, and have no weapon in between', extraAp: th.extraAp,
        buys: 'the Throw (' + num(th.v) + ' attack), then, if it hit (' + Math.round(landed * 100) + '%), the Pull Out (' + num(po.v) + ' attack, no roll)', cur: 'damage dealt', v: th.v + landed * po.v, how: num(th.v) + ' + ' + Math.round(landed * 100) + '% × ' + num(po.v), from: 'the two rows above it', note: 'the walk to the target is not counted' });
    }
  }
}

// ------------------------------------------------------------------------------------------------ 3. Calls
function callRows() {
  const pts = [1, 3, 7];
  for (const def of A.CALLS as any[]) {
    const fam = 'Call · ' + (A.SKILL[def.skill]?.name || def.skill);
    def.steps.forEach((st: any, i: number) => {
      const p = pts[i] ?? st.at, ap = p >= CR.cheap_at ? CR.cheap_ap : CR.ap;
      const val = CALL_VALUE[def.id]?.(st.numbers || {});
      if (!val) problems.push('Call ' + def.name + ' has no price in CALL_VALUE.');
      add({ fam, name: def.name + ', step ' + (i + 1) + ' (' + st.at + ' point' + (st.at > 1 ? 's' : '') + ')', ap: String(ap) + (i === 1 ? ' (1 from ' + CR.cheap_at + ' points)' : ''), apN: ap,
        price: [def.kind === 'hindering' && def.id !== 'call.spot' ? 'the enemy saves against ' + CR.save_tn + ' + your strength' : '', val?.set || ''].filter(Boolean).join('; '), extraAp: val?.extraAp || 0, limit: 'a unit takes one ' + def.kind + ' Call a round',
        buys: val?.how || short(st.text), cur: val?.cur || '', v: val && val.x != null ? val.x : null, how: val ? 'worth ' + num(val.x) : 'not priced', partial: val?.partial, from: 'data (calls.json)' });
    });
  }
  add({ fam: 'Call · every skill', name: 'Any Call as a reaction (' + CR.reaction_at + ' points)', ap: String(CR.reaction_ap) + ' (reaction)', apN: CR.reaction_ap, extraAp: K.REACTION_AP, price: 'your reaction', limit: CR.reactions_per_round + ' a round',
    buys: 'the Call\'s step 3, off your turn', cur: 'as the Call', how: 'as the Call at step 3', from: 'data (calls.json)' });
  add({ fam: 'Call · every skill', name: 'The first Call of your turn (' + CR.free_at + ' points)', ap: '0', apN: 0, limit: CR.free_per_turn + ' a turn', buys: 'the Call\'s step 3, for nothing', cur: 'as the Call', how: 'as the Call at step 3', from: 'data (calls.json)' });
}

// ------------------------------------------------------------------------------------------------ 4. class moves
const tiersOf = (p: any): string[] => (p.tiers ? Object.keys(p.tiers) : [p.tier === 'acquired' ? 'I' : p.tier]);
/** Class moves that spend the turn's reaction when they fire (their own text says so). */
const REACTION_MOVES = new Set(['defender.shrug_it_off', 'fighter.riposte', 'marksman.duck_and_roll', 'marksman.killzone', 'defender.anchor']);
/** Costs a class move's text names and its data effects don't carry: [the words, the part counted as AP of price]. */
const MOVE_COST: Record<string, [string, number]> = {
  'fighter.finisher': ['all your Momentum (at least 1; 3 counted)', 3 * 0.5], 'lumeri_templar.judgement': ['that is about a third of a level at Devotion 4 (32 XP to the next) and a seventh at Devotion 7 (70 XP)', 0], 'trickster.rewrite': ['3 charge, 1 Flux', 0], 'guardian.will_shield': ['20 MP; Strain as a cast', 0],
  'guardian.sanctuary': ['60 MP; a cast\'s Strain + 1', 0], 'channeler.heart_surge': ['double Strain', 0], 'mage.payload': ['Flux equal to its glyphs, on top', 0],
  'scribe.stored_spell': ['its charge, paid before the fight', 0], 'channeler.eye_of_the_storm': ['lost if you don\'t Release this turn', 0],
};
const SETTING = /\b(off|on)$|: (spend what it takes|keep 1 Guard)$|^Interpose (on|only|off)/i;
/** The action buttons an item really shows in a fight, with the AP on the button (the perk audit's way). */
function buttons(spec: any, key: string): { list: any[]; err?: string } {
  try {
    const f = fightWith([spec, { name: 'Squadmate' }], [{ tier: 'soldier', name: 'Soldier' }], { seed: 'PRICE2' });
    const [pc, ally] = f.pcs; pc.pos = '3,6'; f.foe.pos = '4,6'; ally.pos = '2,6'; f.turn(pc);
    const list = withGame(f.g, () => A.perkActionsFor({ u: f.pc, c: f.g.characters[f.pc.charId], cb: f.cb, g: f.g }, 'combat')).filter((e: any) => e.id === key);
    return { list };
  } catch (e: any) { return { list: [], err: String(e?.message || e) }; }
}
function classRows() {
  for (const c of A.CLASSES as any[]) {
    for (const [rank, rv] of Object.entries(c.ranks) as [string, any][]) for (const m of rv.moves) {
      const key: string = m.key, ref = key.replace(/^class:/, ''), info = A.itemInfo(key, rank), hd = A.handlerOf(key);
      const defs: any[] = info ? A.actionDefs(info).filter((d: any) => d.scope.includes('combat') && !SETTING.test(d.label)) : [];
      const toggles = hd?.toggles || [];
      const shown = buttons({ classId: c.id, level: 12, attrs: { [c.attribute]: 8 }, skills: Object.fromEntries(c.skills.map((s: string) => [s, K.REF])) }, key).list.filter((e: any) => !SETTING.test(e.label));
      const btnAp = shown.length ? shown[0].ap : defs.length && typeof defs[0].ap === 'number' ? defs[0].ap : null;
      const val = MOVE_VALUE[ref]?.(m);
      if (!val) problems.push('Class move ' + c.name + ' / ' + m.name + ' (' + ref + ') has no price in MOVE_VALUE.');
      const txt: string = m.text || '';
      const passive = !defs.length && !toggles.length && !/^Costs? \d|^Costs the AP/.test(txt) && !(m.ap_cost > 0);
      const weaponAp = /Costs the AP of your melee attack/.test(txt), soulAp = /costs your Soul cast AP/.test(txt), owAp = ref === 'marksman.killzone';
      let apN: number | null = passive ? null : btnAp ?? (typeof m.ap_cost === 'number' ? m.ap_cost : null), ap = apN == null ? (passive ? 'none (always on)' : '?') : String(apN);
      if (weaponAp) { apN = 2; ap = '2 or 3 (your melee attack)'; } else if (soulAp) { apN = A.SPELL_AP.begin; ap = apN + ' (a Soul cast)'; } else if (owAp) { apN = 4; ap = '4 (twice the shot)'; }
      else if (ref === 'marksman.special_ammo') { apN = A.RULES.combat.actions.find((x: any) => x.id === 'reload')?.ap ?? 2; ap = apN + ' (a reload)'; }
      else if (passive && REACTION_MOVES.has(ref)) ap = '0 (by itself, on your reaction)';
      if (!passive && btnAp != null && typeof m.ap_cost === 'number' && m.ap_cost > 0 && btnAp !== m.ap_cost) problems.push('Class move ' + m.name + ': the data says ' + m.ap_cost + ' AP, its button says ' + btnAp + ' AP.');
      // the class resource it spends: the data's own `resource` effects, then what only its text carries (MOVE_COST)
      const costs: string[] = []; let extraAp = 0;
      const RES: Record<string, string> = { guard: 'Guard', momentum: 'Momentum', mp: 'MP', supplies: 'Supply', toxin: 'toxin dose', devotion: 'Devotion XP', charge: 'charge', flux: 'Flux' };
      for (const e of m.effects || []) {
        const spend = e.op === 'resource' && typeof e.value === 'number' && e.value < 0 && !/^vent$/.test(e.when || '') ? { r: e.resource, n: -e.value } : e.cost?.resource && typeof e.cost.value === 'number' ? { r: e.cost.resource, n: e.cost.value } : null;
        if (!spend) continue;
        costs.push(spend.n + ' ' + (RES[spend.r] || spend.r)); if (spend.r === 'momentum') extraAp += spend.n * K.MOMENTUM_AP;
      }
      const hand = MOVE_COST[ref]; if (hand) { costs.push(hand[0]); extraAp += hand[1]; }
      if (REACTION_MOVES.has(ref)) { costs.push('your reaction'); extraAp += K.REACTION_AP; }
      if (m.uses === 'reaction' && /no reaction/.test(txt)) problems.push('Class move ' + m.name + ': its data says it is used as a reaction, its text says it costs no reaction.');
      if (m.uses === 'per_scene' && /[Oo]nce per fight/.test(txt)) problems.push('Class move ' + m.name + ': its data says once a scene, its text says once a fight.');
      const limit = usesWord(shown[0]?.uses?.per, shown[0]?.uses?.n || 1) || usesWord(defs[0]?.uses?.per, defs[0]?.uses?.n || 1) || (m.uses === 'reaction' ? '' : usesWord(m.uses)) || (/[Oo]nce per turn/.test(txt) ? 'once a turn' : /[Oo]nce per fight/.test(txt) ? 'once a fight' : /[Oo]nce per scene/.test(txt) ? 'once a scene' : '');
      add({ fam: 'Class move · ' + c.name, cls: c.name, name: m.name + ' (rank ' + rank + ')', ap, apN: passive ? null : apN, price: costs.join('; '), extraAp, limit, passive,
        buys: val?.how || short(txt, 170) + (val?.max ? ' [at most: ' + val.max + ']' : ''), cur: val?.cur || (val?.d != null ? 'damage dealt' : ''), v: val && (val.d != null || val.x != null) ? (val.d || 0) + (val.x || 0) : null,
        how: val && (val.d != null || val.x != null) ? [val.d != null ? 'damage ×' + num(val.d) : '', val.x ? 'the rest ' + num(val.x) : ''].filter(Boolean).join(' + ') + (REACTION_MOVES.has(ref) ? ', only if the trigger comes' : '') : 'not priced', partial: (val?.partial ?? !val) || REACTION_MOVES.has(ref),
        from: shown.length ? 'engine (its button) + data' : defs.length ? 'engine (the registry) + data' : 'data (classes.json)', note: toggles.length ? 'a switch on ' + toggles.map((t: any) => t.on.map((o: string) => o.replace('combat/', '')).join(' or ')).join(', ') : '' });
    }
  }
}

// ------------------------------------------------------------------------------------------------ 5. perks and traits
const PERKS: any[] = A.PERKS, TRAITS: any[] = A.TRAITS, PERK_BY: Record<string, any> = Object.fromEntries(PERKS.map((p) => [p.id, p]));
function needs(p: any, tier: string, skills: Record<string, number> = {}, perks: Record<string, string> = {}) {
  const req = [...(p.requires || []), ...(p.tiers?.[tier]?.requires || [])];
  for (const r of req) { if (r.skill) skills[r.skill] = Math.max(skills[r.skill] || 0, r.min || 1); if (r.perk && PERK_BY[r.perk]) { perks[r.perk] = PERK_BY[r.perk].tier === 'acquired' ? 'I' : PERK_BY[r.perk].tier; needs(PERK_BY[r.perk], perks[r.perk], skills, perks); } }
  for (const s of p.skills || []) skills[s] = Math.max(skills[s] || 0, p.tier === 'mastered' ? 10 : p.tier === 'achieved' ? 5 : tier === 'II' ? 5 : 3);
  return { skills, perks };
}
/** A worth for effects the data states plainly (heal, shield, damage, a roll bonus, AP, a condition); null when nothing is priced. */
function priceEffects(effects: any[], scale = 1): { v: number; how: string[]; all: boolean } | null {
  let v = 0, all = true; const how: string[] = [];
  for (const e of effects || []) {
    if (!e || typeof e !== 'object') continue;
    if (e.op === 'heal' && typeof e.value === 'number') { v += hpIn(e.value * scale); how.push('heals ' + round2(e.value * scale)); }
    else if (e.op === 'shield' && typeof e.value === 'number') { v += hpIn(e.value * scale); how.push('a shield of ' + round2(e.value * scale)); }
    else if (e.op === 'stat_mod' && e.stat === 'hp' && typeof e.value === 'number' && e.value < 0 && !e.when) { v += hpOut(-e.value * scale); how.push(round2(-e.value * scale) + ' damage, no roll'); }
    else if (e.op === 'roll_bonus' && typeof e.value === 'number') { v += e.value * HIT; how.push('+' + e.value + ' on one roll'); }
    else if (e.op === 'cleanse' || e.op === 'reveal' || e.op === 'narrator') { all = false; }
    else all = false;
  }
  return how.length ? { v, how, all } : null;
}
const noAp: string[] = [];
/** "Once per turn" and the like, from a card's own words (for a switch or an action the registry gives no limit). */
const limitFromText = (t: string) => { const m = /[Oo]nce (?:per|a) (turn|round|fight|scene|session|being|enemy)/.exec(t || ''); return m ? 'once a ' + m[1] : ''; };
function itemRows() {
  const one = (kind: 'perk' | 'trait', it: any, tier: string | undefined) => {
    const key = kind + ':' + it.id, info = A.itemInfo(key, tier), hd = A.handlerOf(key); if (!info) return;
    const defs: any[] = A.actionDefs(info).filter((d: any) => d.scope.includes('combat'));
    const toggles: any[] = hd?.toggles || [];
    if (!defs.length && !toggles.length) return;
    const nd = kind === 'perk' ? needs(it, tier!) : { skills: {}, perks: {} };
    const attrs: Record<string, number> = {}; for (const [s, n] of Object.entries(nd.skills)) { const at = A.SKILL[s]?.attribute; if (at) attrs[at] = Math.max(attrs[at] || 0, n as number); }
    const spec: any = { skills: nd.skills, attrs, perks: { ...nd.perks }, traits: [] };
    if (kind === 'perk') spec.perks[it.id] = tier; else spec.traits = [it.id];
    const shown = defs.length ? buttons(spec, key).list : [];
    const fam = (kind === 'perk' ? 'Perk' : 'Trait') + ' · ' + (kind === 'trait' ? 'traits' : it.tier === 'acquired' ? 'skill perks' : it.tier + ' perks');
    const tierTag = kind === 'perk' && it.tiers ? ' (Tier ' + tier + ')' : '';
    const text = kind === 'perk' ? it.tiers?.[tier!]?.text || it.text : it.text || info.text;
    for (const d of defs) {
      const b = shown.find((e: any) => e.actionId === d.id);
      const dataAp = typeof info.ap === 'number' ? info.ap : null;
      let apN: number | null = b ? b.ap : typeof d.ap === 'number' ? d.ap : dataAp;
      const guessed = !b && typeof d.ap !== 'number' && dataAp != null;
      const allAp = /all the AP you have left/.test(d.text || text); if (allAp) apN = null;
      const val = (ITEM_VALUE[key + '#' + d.id] || ITEM_VALUE[key])?.(tier);
      const eff = !val ? priceEffects(info.effects.flatMap((e: any) => [e, ...(e.effects || [])])) : null;
      const reaction = /reaction/i.test(d.text || '') && /uses? (your|their|a) reaction/i.test(text);
      add({ fam, name: it.name + tierTag + (d.label && d.label !== it.name ? ': "' + d.label + '"' : ''), ap: allAp ? 'all the AP you have left' : apN == null ? 'set by the code, by the situation' : String(apN), apN,
        price: reaction ? 'your reaction' : '', extraAp: reaction ? K.REACTION_AP : 0, limit: (usesWord(b?.uses?.per || d.uses?.per, b?.uses?.n || d.uses?.n || 1) || limitFromText(d.text || text)) + (d.arm ? ' (armed ahead, fires by itself)' : ''),
        buys: val?.how || short(d.text || text, 170), cur: val?.cur || (val?.d != null ? 'damage dealt' : eff ? 'see the text' : info.adjudication === 'narrator' ? 'judgement' : ''),
        v: val && (val.d != null || val.x != null) ? (val.d || 0) + (val.x || 0) : eff && eff.all ? eff.v : null,
        how: val && (val.d != null || val.x != null) ? [val.d != null ? 'damage ×' + num(val.d) : '', val.x ? 'the rest ' + num(val.x) : ''].filter(Boolean).join(' + ') : eff && eff.all ? eff.how.join(', ') : 'not priced: its worth is not a number in the data',
        partial: val ? !!val.partial : !(eff && eff.all), from: b ? 'engine (its button)' : guessed ? 'data (its button did not show in the test fight, and the code can change this AP)' : 'engine (the registry)' + (apN == null ? '; the button did not show in the test fight' : ''),
        note: info.adjudication !== 'engine' ? 'run by: ' + info.adjudication : '' });
      if (apN == null && !allAp) noAp.push(it.name + tierTag + ' ("' + d.label + '")');
    }
    for (const t of toggles) {
      if (!t.on.some((o: string) => o.startsWith('combat/'))) continue;
      add({ fam, name: it.name + tierTag + ': switch "' + t.label + '"', ap: '0 (rides ' + t.on.filter((o: string) => o.startsWith('combat/')).map((o: string) => o.replace('combat/', '')).join(' or ') + ')', apN: 0,
        limit: usesWord(info.uses, 1) || limitFromText(text), ...(() => { const v = ITEM_VALUE[key + '#' + t.id]?.(tier); return v ? { buys: v.how, cur: v.cur || '', v: v.x ?? null, how: 'the rest ' + num(v.x), partial: v.partial } : { buys: short(text, 170), cur: '', how: 'not priced: it changes another action', partial: true }; })(), from: 'engine (the registry)' });
    }
  };
  const start = rows.length;
  for (const p of PERKS) for (const t of tiersOf(p)) one('perk', p, t);
  for (const t of TRAITS) one('trait', t, undefined);
  // a perk whose two tiers show the same button at the same price takes one row; exact doubles (one switch on two actions) too
  const mine = rows.splice(start), kept: Row[] = [];
  for (const r of mine) {
    const base = r.name.replace(' (Tier II)', ' (Tier I)'), twin = kept.find((k) => (k.name === base || k.name === r.name) && k.fam === r.fam && String(k.apN) === String(r.apN) && k.buys === r.buys && k.limit === r.limit && k.v === r.v);
    if (twin) { if (twin.name !== r.name) twin.name = twin.name.replace(' (Tier I)', ' (Tier I and II)'); continue; }
    kept.push(r);
  }
  rows.push(...kept);
  if (noAp.length) problems.push('No AP could be read for ' + noAp.length + ' perk and trait buttons: the code works their AP out from the situation, the data gives none, and the button did not show in the test fight (it needs a drone, a caught grenade, a glyph on the ground…): ' + [...new Set(noAp.map((n) => n.replace(/ \(Tier I+\)/, '')))].join(', ') + '.');
}

// ------------------------------------------------------------------------------------------------ 6. the basic actions
function coreRows() {
  const fam = 'Basic action';
  const both = (id: string, code: string | null, fallback: number): { ap: number; from: string } => {
    const d = dataAction(id), c = code ? codeAp(code) : null, dn = typeof d?.ap === 'number' ? d.ap : null;
    if (dn != null && c != null && dn !== c) problems.push('Basic action "' + id + '": rules.json says ' + dn + ' AP, the engine\'s code says ' + c + ' AP.');
    if (dn == null && c == null) problems.push('Basic action "' + id + '": no AP in rules.json or at an actionAp call; ' + fallback + ' AP was read from the function itself.');
    return { ap: c ?? dn ?? fallback, from: c != null && dn != null ? 'data + engine code' : c != null ? 'engine code' : dn != null ? 'data (rules.json)' : 'engine code (read by hand)' };
  };
  // moving
  for (const agi of [1, 2, 4, 6, 8, 10]) {
    const t = 1 + 0.5 * (agi - 1);
    add({ fam: 'Moving', name: 'Walk, Agility ' + agi, ap: '1', apN: 1, buys: t + ' tiles (' + t * R.combat.grid.tile_m + ' m)', cur: 'position', how: 'not priced: the yardstick itself says 1 AP of walking is worth half an attack', from: 'data (rules.json: 1 + 0.5 × (Agility − 1) tiles per AP)',
      note: agi === 1 ? '' : 'the same AP covers ' + num(t, 1) + ' times the ground of Agility 1' });
  }
  { const s = both('sprint', 'sprint', 2); add({ fam: 'Moving', name: 'Sprint', ap: String(s.ap), apN: s.ap, limit: 'once a turn', buys: '3 × Movement in tiles (1.5 times what the same AP walks)', cur: 'position', how: 'not priced', from: s.from, note: 'not in Juggernaut armour' }); }
  { const s = both('disengage', 'disengage', 1); add({ fam: 'Moving', name: 'Disengage', ap: String(s.ap), apN: s.ap, buys: '1 tile with no opportunity attack', cur: 'damage prevented', v: 1.0, how: 'one free enemy attack avoided', from: s.from }); }
  { const d = dataAction('prone_toggle'); add({ fam: 'Moving', name: 'Go prone / stand up', ap: String(d?.ap ?? 1), apN: d?.ap ?? 1, buys: 'ranged attacks on you at −2 to hit, melee attacks at +2; 1 more AP to stand', cur: 'damage prevented', v: 2 * HIT * K.ENEMY_ATTACKS, how: '−2 to hit on about 2 shots; the AP to stand again is not counted', from: 'data + engine code (toggleProne: 1 AP)' }); }
  add({ fam: 'Moving', name: 'Pull free (yourself or an ally next to you)', ap: String(TR.pressure ? (A.TECHNIQUE.run_through?.numbers?.pull_free_ap ?? 2) : 2), apN: A.TECHNIQUE.run_through?.numbers?.pull_free_ap ?? 2, buys: 'ends being nailed in place', cur: 'upkeep', how: 'not priced: a tax an enemy put on you', from: 'data (techniques.json)' });
  { const c = codeAp('escape'); add({ fam: 'Moving', name: 'Break a grapple', ap: String(c ?? 2), apN: c ?? 2, buys: 'an opposed roll to get free', cur: 'upkeep', how: 'not priced: a tax an enemy put on you', from: 'engine code' }); }
  // weapons and gear
  { const s = both('reload', null, 2); add({ fam: 'Weapon upkeep', name: 'Speed reload', ap: String(s.ap) + ' (the weapon\'s reload; 1 with a quick-release mod)', apN: s.ap, buys: 'a full magazine; the old one drops on your tile', cur: 'upkeep', how: 'not priced: it buys the next shots', from: 'data + engine code (reloadAp)' });
    const x = dataAction('reload_tactical')?.extra_ap ?? 1; add({ fam: 'Weapon upkeep', name: 'Tactical reload', ap: String(s.ap + x) + ' (reload +' + x + ')', apN: s.ap + x, buys: 'a full magazine; the old one goes in the pack with its rounds', cur: 'upkeep', how: 'not priced', from: 'data (rules.json)' }); }
  { const c = codeAp('reload_both'); if (c != null) add({ fam: 'Weapon upkeep', name: 'Reload both guns', ap: String(c), apN: c, buys: 'both magazines', cur: 'upkeep', how: 'not priced', from: 'engine code' }); }
  { const s = both('clear_jam', 'clear_jam', 2); add({ fam: 'Weapon upkeep', name: 'Clear a jam', ap: String(s.ap), apN: s.ap, buys: 'the gun works again; Heat back to 0', cur: 'upkeep', how: 'not priced', from: s.from }); }
  add({ fam: 'Weapon upkeep', name: 'Load loose rounds into a magazine', ap: '1 per ' + (A.ROUNDS_PER_AP ?? 5) + ' rounds', apN: 1, price: 'loose rounds in the pack', buys: (A.ROUNDS_PER_AP ?? 5) + ' rounds into a spare magazine', cur: 'upkeep', how: 'not priced', from: 'engine code (loadMagazine)' });
  add({ fam: 'Weapon upkeep', name: 'Brace the weapon (the basic action, any weapon that can)', ap: '1', apN: 1, buys: 'Recoil halved until you move; a character with Durability also gains ' + (TR.guard.brace_gain ?? 2) + ' Guard (' + (TR.guard.brace_shield_gain != null ? (TR.guard.brace_gain ?? 2) + TR.guard.brace_shield_gain : 3) + ' with a shield)', cur: 'damage prevented', v: hpIn((TR.guard.brace_gain ?? 2) * TR.guard.soak), how: (TR.guard.brace_gain ?? 2) + ' Guard at ' + TR.guard.soak + ' HP each; the Recoil is not priced', partial: true, from: 'engine code (brace) + data (techniques.json guard rules)', note: 'Guard holds at most your Durability points, 5 at most; 1 point is kept back unless the hit would take you down' });
  { const c = codeAp('field_repair'); add({ fam: 'Weapon upkeep', name: 'Field Repair', ap: String(c ?? 2), apN: c ?? 2, price: '1 spare-parts charge; Proficiency 3', buys: 'restores weapon durability', cur: 'upkeep', how: 'not priced', from: 'engine code' }); }
  { const G = A.GEAR || {}; const g = (k: string, id: string) => (typeof G[k] === 'number' ? G[k] : dataAction(id)?.ap);
    add({ fam: 'Gear', name: 'Draw into a hand (one-handed)', ap: String(g('hand_ap', 'draw')), apN: g('hand_ap', 'draw'), buys: 'a weapon, focus, torch or shield from the pack; what the hand held goes to the pack', cur: 'upkeep', how: 'not priced', from: 'data (world_play.json) + engine' });
    add({ fam: 'Gear', name: 'Draw a two-handed weapon', ap: String(g('two_handed_draw_ap', 'draw_two_handed')), apN: g('two_handed_draw_ap', 'draw_two_handed'), buys: 'it fills both hands', cur: 'upkeep', how: 'not priced', from: 'data + engine' });
    add({ fam: 'Gear', name: 'Swap main hand and off hand', ap: String(g('swap_hands_ap', 'swap_hands')), apN: g('swap_hands_ap', 'swap_hands'), buys: 'the other weapon leads', cur: 'upkeep', how: 'not priced', from: 'data + engine' });
    add({ fam: 'Gear', name: 'Put away what a hand holds', ap: String(g('put_away_ap_per_hand', 'put_away')) + ' a hand', apN: g('put_away_ap_per_hand', 'put_away'), buys: 'into the pack (2 AP for a two-handed weapon)', cur: 'upkeep', how: 'not priced', from: 'data + engine' });
    add({ fam: 'Gear', name: 'Drop what a hand holds', ap: String(g('drop_ap', 'drop_held')), apN: g('drop_ap', 'drop_held'), buys: 'it lands in the pile on your tile', cur: 'upkeep', how: 'not priced', from: 'data + engine' });
    add({ fam: 'Gear', name: 'Put on or take off light armour', ap: String(g('light_armour_ap', 'light_armour')), apN: g('light_armour_ap', 'light_armour'), buys: 'a piece of ' + (G.light_armour_max_kg ?? 1.2) + ' kg or less; heavier armour can\'t be changed in a fight', cur: 'upkeep', how: 'not priced', from: 'data + engine' }); }
  { const d = dataAction('fit_mod'); add({ fam: 'Gear', name: 'Fit a mod', ap: String(d?.ap ?? 1), apN: d?.ap ?? 1, buys: 'a mod on the main-hand weapon', cur: 'upkeep', how: 'not priced', from: 'data (rules.json)' }); }
  add({ fam: 'Gear', name: 'Pick up from a pile', ap: String(A.PICKUP_AP), apN: A.PICKUP_AP, buys: 'any or all of the pile on your tile or the next one', cur: 'upkeep', how: 'not priced', from: 'data (world_play.json) + engine' });
  { const d = dataAction('interact'); add({ fam: 'Gear', name: 'Use an item, open a door', ap: String(d?.ap ?? 1), apN: d?.ap ?? 1, buys: 'what the item or the door does', cur: 'upkeep', how: 'not priced', from: 'data (rules.json)' }); }
  { const s = both('throw', 'throw', 2); add({ fam: 'Gear', name: 'Throw an item (a grenade, a bottle)', ap: String(s.ap), apN: s.ap, price: 'the item', buys: 'what the item does where it lands', cur: 'damage dealt', how: 'not priced: it depends on the item', from: s.from }); }
  // tactics
  add({ fam, name: 'Attack with both hands (a weapon in each)', ap: 'the dearer weapon\'s attack + 1', apN: 3, price: 'a round from each gun; main hand −1 to hit, off hand −3 (−1 at best, with points)', buys: 'both weapons attack, at one target or two', cur: 'damage dealt', how: 'not priced here: dual wielding is its own question in the balance pass (section 9)', partial: true, from: 'engine code (pairedAttack)' });
  add({ fam, name: 'A weapon\'s own skill (the weapons that grant one)', ap: 'set by the weapon', apN: null, buys: 'what the weapon\'s card says', cur: 'damage dealt', how: 'not priced: one per weapon, in weapons.json', partial: true, from: 'data (weapons.json grants)' });
  add({ fam, name: 'Read a glyph or a trace', ap: 'as Analyze: ' + (dataAction('analyze')?.ap ?? 2) + ' (1 from Analysis 3)', apN: dataAction('analyze')?.ap ?? 2, buys: 'you learn the word (study toward a new Sigil word)', cur: 'information', how: 'not priced', partial: true, from: 'engine code (readGlyph)' });
  add({ fam, name: 'Spend an Echo on a roll', ap: '0', apN: 0, price: '1 Echo (you hold 3 at most; 1 at the start of a session)', limit: 'once a roll', buys: 'the d20 is rolled again', cur: 'damage dealt', v: (1 - K.PCT) * K.PCT, how: 'a missed attack hits after all 65% of the time: ' + num((1 - K.PCT) * K.PCT) + ' of an attack per Echo held', from: 'engine code (check/reroll) + rules.json', note: 'paid in Echo, not AP' });
  { const c = codeAp('hide'); add({ fam, name: 'Hide', ap: String(c ?? 2), apN: c ?? 2, price: 'no enemy may see you', buys: 'Hidden: you can\'t be targeted until spotted (not priced), and your first attack is an Ambush (×' + num(REF.ambush) + ' at Ingenuity ' + K.REF + ')', cur: 'damage dealt', v: REF.ambush - 1, how: 'the Ambush\'s extra damage only', partial: true, from: 'engine code (not in rules.json\'s action list)' });
    if (!dataAction('hide')) problems.push('Hide (2 AP in the engine\'s code) is not in the action list of rules.json.'); }
  { const d = dataAction('analyze'); add({ fam, name: 'Analyze', ap: String(d?.ap ?? 2) + ' (1 from Analysis 3)', apN: d?.ap ?? 2, buys: 'shows the enemy\'s HP, Defense and armour; from Analysis 5 it deals 15% less damage to the squad', cur: 'information', v: null, how: 'not priced below Analysis 5; from 5: 15% off its attacks for the fight', partial: true, from: 'data + engine code (analyzeCost)' }); }
  { const d = dataAction('overwatch'); add({ fam, name: 'Overwatch (hold a shot)', ap: 'the AP of the shot (2, or 3 aimed)', apN: 2, extraAp: K.REACTION_AP, price: 'your reaction; not while Pressed', limit: 'one held shot', buys: '1 shot at the first enemy that moves in your sight', cur: 'damage dealt', v: 1, how: 'damage ×1, if it fires', partial: true, from: 'data + engine code (setOverwatch)' }); void d; }
  { const c = codeAp('shove'); add({ fam, name: 'Shove (anyone, no technique)', ap: String(c ?? 2), apN: c ?? 2, buys: 'a 1-tile push on an opposed roll (your Raw Power against its Raw Power or Athletics)', cur: 'position', v: K.SAVE * tile(), how: 'one pushed tile, half the time', partial: true, from: 'engine code (not in rules.json\'s action list)', note: 'the Shove technique and the Fighter\'s Shove cost 1 AP' }); }
  { const c = codeAp('stim'), c2 = dataAction('stabilise'); add({ fam, name: 'Stim an ally next to you', ap: String(c ?? 1), apN: c ?? 1, price: '1 stim', buys: 'heals 30 × Healing given and stops Bleeding', cur: 'HP restored', v: hpIn(30), how: '30 HP, at the rifle\'s rate', from: 'engine code (useStim)' });
    add({ fam, name: 'Stabilise a Downed ally', ap: String(c2?.ap ?? 2) + ' (' + (c2?.ap_combat_medic ?? 1) + ' for a medic)', apN: c2?.ap ?? 2, price: '1 stim', buys: 'the ally is up at 1 HP', cur: 'HP restored', how: 'not priced: it gives a character their turns back', partial: true, from: 'data + engine code' }); }
  { const s = both('extinguish', 'extinguish', 1); add({ fam, name: 'Put out Burning', ap: String(s.ap), apN: s.ap, buys: 'ends 10 damage a turn on you or someone next to you', cur: 'damage prevented', v: hpIn(10 * 2), how: '2 turns of burning avoided', from: s.from }); }
  { const c = codeAp('recover'); add({ fam, name: 'Recover a dropped weapon / raise a lowered one', ap: '2 / 1', apN: 2, buys: 'you can attack with it again', cur: 'upkeep', how: 'not priced: a tax an enemy put on you', from: 'engine code' }); void c; }
  { const d = dataAction('shoot_cover') || R.combat.attack?.cover; add({ fam, name: 'Shoot cover', ap: 'the AP of the attack', apN: 2, price: 'the round', buys: 'the weapon\'s damage to the cover, no roll (half cover has ' + (R.combat.attack.cover.half.hp) + ' HP, full ' + R.combat.attack.cover.full.hp + ')', cur: 'position', how: 'not priced', from: 'data (rules.json)' }); void d; }
  { const s = both('social_in_combat', 'parley', 2); add({ fam: 'Speaking', name: 'Parley (persuade, threaten, ask for surrender)', ap: String(s.ap), apN: s.ap, buys: 'a skill check; what it wins is the Narrator\'s', cur: 'judgement', how: 'not priced: judgement', from: s.from }); }
  add({ fam: 'Speaking', name: 'Speak (rules 1.14)', ap: '0', apN: 0, limit: 'no limit', buys: 'words to the table and the Narrator; nothing happens by rule', cur: 'judgement', how: 'not priced: no effect by rule', partial: true, from: 'engine code (fighttalk.ts)' });
  add({ fam: 'Speaking', name: 'An attempt (rules 1.14)', ap: String(A.ATTEMPT_AP), apN: A.ATTEMPT_AP, limit: 'once a turn', buys: 'the Narrator may answer with one of: ' + (A.FIGHT_CONDS || []).map((c: string) => A.FIGHT_COND_NAME[c]).join(', ') + ' for ' + A.FIGHT_COND_ROUNDS + ' round, a skill check for one of them, or a surrender', cur: 'judgement', how: 'not priced: judgement (at most it ends an enemy\'s fight)', partial: true, from: 'engine code (fighttalk.ts)' });
  add({ fam: 'Reaction', name: 'Your reaction', ap: '0', apN: 0, extraAp: K.REACTION_AP, limit: R.combat.reactions.per_round + ' a round', buys: 'one of: an opportunity attack (a free melee attack when an enemy leaves your reach without Disengaging), a held shot, an Answer technique, a Call from ' + CR.reaction_at + ' points, a perk marked reaction', cur: 'damage dealt', v: 1, how: 'an opportunity attack: damage ×1, if it fires', partial: true, from: 'data (rules.json)' });
  if (A.SONG_AP != null) add({ fam: 'Speaking', name: 'Start a song (music traits)', ap: String(A.SONG_AP), apN: A.SONG_AP, buys: 'the song\'s bonus while it plays', cur: 'see the trait', how: 'not priced', partial: true, from: 'engine code (music.ts)' });
}

// ------------------------------------------------------------------------------------------------ 7. Sigil magic
function sigilRows() {
  const G = A.SIGIL_GRAMMAR || {}, sp = A.SPELL_AP;
  const gAp = REF.glyphAp;
  add({ fam: 'Sigil magic · the cycle', name: 'Draw a glyph', ap: '1 at Expression 1, ' + num(gAp, 1) + ' at Expression ' + K.REF + ', 0.5 at Expression 6+', apN: gAp, price: 'the word\'s charge (1 to 3) and 1 Flux (TWICE: 2); the next glyph of the Line needs a step to the next tile', buys: 'one word of a Line (2 to 4 make a spell)', cur: 'set-up', how: 'not priced alone: see the sample spells', partial: true, from: 'engine (glyphAp) + data (sigils.json)' });
  add({ fam: 'Sigil magic · the cycle', name: 'Evoke', ap: String(sp.evoke), apN: sp.evoke, price: '1 charge per glyph (1 less at Brain Power 3, 2 less at 6, 3 less at 9; at least 1)', buys: 'the Line fires, from within 1 tile of it, aimed by where you stand', cur: 'see the sample spells', how: 'not priced alone', partial: true, from: 'data + engine (SPELL_AP)' });
  add({ fam: 'Sigil magic · the cycle', name: 'Vent', ap: String(sp.vent), apN: sp.vent, buys: 'all your Flux into the air (the Evoker holds ' + A.FLUX_MAX + '; over it you take 10 damage a point and it locks for a round)', cur: 'upkeep', how: 'not priced', from: 'engine (SPELL_AP)' });
  add({ fam: 'Sigil magic · the cycle', name: 'Swap a mana core', ap: String(sp.core), apN: sp.core, price: '1 spare core', buys: A.CORE_CHARGE + ' charge', cur: 'upkeep', how: 'not priced', from: 'engine (SPELL_AP)' });
  add({ fam: 'Sigil magic · the cycle', name: 'Scuff out a glyph', ap: String(sp.scuff), apN: sp.scuff, buys: 'removes a glyph on your tile', cur: 'upkeep', how: 'not priced', from: 'engine (SPELL_AP)' });
  // every word, with its own price
  for (const w of A.SIGILS as any[]) {
    const g = w.group || w.class;
    const buys = w.damage ? w.damage + ' damage × your Sigil multiplier' : w.heal ? 'heals ' + w.heal + ' × Sigil multiplier × Healing given' : w.shield ? 'a shield of ' + w.shield + ' × Sigil multiplier × Healing given' : w.mult != null && w.mult !== 1 ? 'the spell at ×' + w.mult + (w.range ? ', range ' + w.range : '') + (w.radius ? ', radius ' + w.radius : '') : short(w.text, 110);
    add({ fam: 'Sigil magic · words (' + String(g).replace('subject_', 'Subject: ').replace(/^reach$/, 'Reach').replace(/^delivery$/, 'Delivery').replace(/^burst$/, 'Burst').replace(/^filter$/, 'Filter') + ')', name: String(w.word || w.id).toUpperCase(), ap: num(gAp, 1) + ' (a glyph)', apN: gAp,
      price: w.charge + ' charge, ' + (w.flux ?? 1) + ' Flux', buys, cur: w.damage ? 'damage dealt' : w.heal || w.shield ? 'HP restored' : '', how: 'not priced alone: a word only works in a Line', partial: true, from: 'data (sigils.json)' });
  }
  // sample Lines: Subject(s) + other words, by the grammar's multiplier rule. Checked against the engine's own Evoke
  // card (11 Nov 2026): the price of a Line is its glyphs, the WALK between them (one glyph to a tile), and the Evoke;
  // Elemental words also take the Elemental multiplier (Expression), and armour counts half against them; a heal or a
  // shield takes Healing given, which is Empathy's: ×1 for a caster whose points are in the Mind.
  const W = A.SIGIL, sm = REF.sigilMult, rep = G.repeats?.mult_per_repeated_glyph ?? 0.9, armour = A.ENEMY.soldier.armour;
  const walkAp = (tiles: number) => Math.ceil(tiles / REF.movement);
  const sample = (name: string, words: string[], targets = 1, note = '') => {
    const ws = words.map((id) => W[id]).filter(Boolean); if (ws.length !== words.length) { problems.push('Sample spell ' + name + ': a word is missing from sigils.json.'); return; }
    const mult = ws.reduce((t, w) => t * (w.group !== 'subject' && w.mult != null ? w.mult : 1), 1) * rep ** (words.length - new Set(words).size);
    const raw = ws.reduce((t, w) => t + (w.damage || 0) * (w.damage_type === 'elemental' ? REF.elemental : 1), 0) * mult * sm;
    const off = ws.some((w) => w.damage && w.damage_type === 'elemental') ? Math.floor(armour / 2) : armour;
    const dmg = raw ? Math.max(0, Math.floor(raw) - off) : 0, heal = ws.reduce((t, w) => t + (w.heal || 0) + (w.shield || 0), 0) * mult * sm;
    const walk = walkAp(words.length - 1), ap = round2(words.length * gAp + walk + sp.evoke);
    const charge = ws.reduce((t, w) => t + w.charge, 0) + Math.max(1, words.length - REF.coreSaving), flux = ws.reduce((t, w) => t + (w.flux ?? 1), 0);
    const quick = words.includes('quicken') ? 2 * K.AP : 0;
    const condId = words.includes('bind') ? 'pinned' : words.includes('blind') ? 'blinded' : words.includes('silence') ? 'silenced' : null;
    const v = (dmg ? (dmg * targets) / Y.hit : 0) + (heal ? hpIn(heal) : 0) + quick + (condId ? onSave(condV(condId)!) * targets : 0);
    const over = words.length > REF.maxWords, dry = charge > A.CORE_CHARGE;
    add({ fam: 'Sigil magic · sample spells (Intelligence ' + K.REF + ', Brain Power ' + K.REF + ', Expression ' + K.REF + ', Agility ' + K.REF + ')', name, ap: num(ap, 1) + ' (' + words.length + ' glyphs at ' + num(gAp, 1) + ', ' + (words.length - 1) + ' tile' + (words.length > 2 ? 's' : '') + ' of walking: ' + walk + ', Evoke ' + sp.evoke + ')', apN: ap,
      price: charge + ' charge (of ' + A.CORE_CHARGE + ' in a core), ' + flux + ' Flux (of ' + A.FLUX_MAX + ')' + (ap > A.AP_BASE ? '; more than a 6 AP turn: drawn over 2 turns' : '') + (over ? '; NOT castable at these points: this character holds ' + REF.maxWords + ' words in a Line (4 needs Intelligence 5)' : '') + (dry ? '; more charge than one core holds' : ''),
      buys: [dmg ? dmg + ' damage to a soldier' + (targets > 1 ? ', each of ' + targets : '') + ' (a rolled hit; ' + Math.floor(raw) + ' before armour)' : '', heal ? Math.round(heal) + ' HP healed or shielded (×' + num(REF.healing) + ' more with Empathy and Insight ' + K.REF + ')' : '', quick ? '+2 AP to an ally next turn' : '', condId ? COND[condId][1] + ' on a failed save' : ''].filter(Boolean).join('; ') + (note ? ' · ' + note : ''),
      cur: dmg ? 'damage dealt' : heal ? 'HP restored' : quick ? 'AP given to the squad' : 'enemy AP removed', v, how: (dmg ? dmg + ' ÷ the rifle\'s ' + Y.hit : heal ? Math.round(heal) + ' HP, at the rifle\'s rate' : quick ? '2 AP' : 'the condition, half the time') + (targets > 1 ? ' × ' + targets + ' targets' : ''), partial: over || undefined,
      from: 'data (sigils.json) + engine (Sigil multiplier ×' + num(sm) + ', Elemental ×' + num(REF.elemental) + '); FIRE + SEEK, FIRE + CONDENSE + SEEK, SPARK, WARD, MEND, BIND and QUICKEN + SEEK were cast in the engine and agree to within 2 points of damage', note: 'at Agility 1 every tile of the walk is 1 AP; at Expression 1 a glyph is 1 AP' });
  };
  sample('SPARK + SEEK (the cheapest attack)', ['spark', 'seek']);
  sample('FIRE + SEEK', ['fire', 'seek']);
  sample('FIRE + CONDENSE + SEEK', ['fire', 'condense', 'seek']);
  sample('FIRE + FIRE + CONDENSE + SEEK (4 glyphs)', ['fire', 'fire', 'condense', 'seek']);
  sample('FIRE + SPREAD + ARC on 3 enemies', ['fire', 'spread', 'arc'], 3);
  sample('STONE + CONDENSE (Touch)', ['stone', 'condense']);
  sample('MEND + SEEK', ['mend', 'seek']);
  sample('WARD + SEEK', ['ward', 'seek']);
  sample('QUICKEN + SEEK', ['quicken', 'seek'], 1, 'never on yourself; a target once a round');
  sample('BIND + SEEK', ['bind', 'seek']);
  sample('BLIND + SPREAD + ARC on 3 enemies', ['blind', 'spread', 'arc'], 3);
}

// ------------------------------------------------------------------------------------------------ 8. Soul magic
function soulRows() {
  const C = SOUL.cycle, S = A.SOUL_AP, fam = 'Soul magic · the cycle', st: number[] = C.stage_mult, sm = REF.soulMult, base = SOUL.damage.base;
  add({ fam, name: 'Begin', ap: String(S.begin) + ' (' + S.swiftBegin + ' with the Swift module)', apN: S.begin, price: 'the design\'s MP; +' + C.begin_strain + ' Strain (+' + C.flooded_strain + ' in Flooded air)', buys: 'the Outburst held at stage 0 (×' + st[0] + ')', cur: 'set-up', how: 'not priced alone: see the sample Outbursts', partial: true, from: 'data (soul_modules.json) + engine (SOUL_AP)' });
  add({ fam, name: 'Pump', ap: String(S.pump), apN: S.pump, price: 'a feeling\'s own Strain, if one is poured in', limit: 'to stage ' + C.max_stage, buys: '+1 stage: ×' + st.join(' → ×'), cur: 'damage dealt', v: ((st[2] - st[1]) * base * sm) / Y.hit, how: 'a Damage Bolt from stage 1 to 2: +' + Math.round((st[2] - st[1]) * base * sm) + ' damage', from: 'data + engine', note: 'the first Pump of a fight is free; Empathy 3 gives 1 free Pump a round, Empathy 7 gives 2' });
  add({ fam, name: 'Release', ap: String(S.release), apN: S.release, buys: 'the Outburst fires at its stage', cur: 'see the sample Outbursts', how: 'not priced alone', partial: true, from: 'data + engine' });
  add({ fam, name: 'Hold it over a turn (swell)', ap: '0', apN: 0, price: '+' + C.swell_strain + ' Strain (+' + C.flooded_strain + ' in Flooded air)', limit: 'once a turn, by itself', buys: '+1 stage at the start of your next turn', cur: 'damage dealt', v: ((st[2] - st[1]) * base * sm) / Y.hit, how: 'the same as a Pump', from: 'data', note: 'a free Pump every turn you wait' });
  add({ fam, name: 'Revert Pump', ap: '0', apN: 0, buys: 'undoes your last Pump this turn (the AP comes back)', cur: 'upkeep', how: 'not priced', from: 'data' });
  add({ fam, name: 'Steady the heart', ap: String(S.steady), apN: S.steady, price: 'only while holding', buys: '−1 Strain, and no swell next turn', cur: 'upkeep', how: 'not priced', from: 'data + engine' });
  add({ fam, name: 'Let go', ap: '0', apN: 0, buys: 'drops the held Outburst; you lose Strain equal to its stage (no more than its swells added); the mana meter +1', cur: 'upkeep', how: 'not priced', from: 'data' });
  add({ fam, name: 'Feed a glyph into the Outburst', ap: String(S.feed), apN: S.feed, price: 'a glyph on your tile', buys: '+1 stage', cur: 'damage dealt', how: 'the same as a Pump, paid with a glyph', partial: true, from: 'data + engine' });
  add({ fam, name: 'Syphon', ap: String(A.SPELL_AP.syphon), apN: A.SPELL_AP.syphon, buys: 'MP from the air (' + A.MANA_BANDS.map((b: any) => b.id + ' ' + b.syphon_mp).join(', ') + ' MP × your Syphon); the meter −2', cur: 'upkeep', how: 'not priced: it buys later casts', from: 'engine + data (rules.json mana bands)' });
  add({ fam, name: 'Crystallise', ap: String(A.SPELL_AP.crystallise), apN: A.SPELL_AP.crystallise, price: 'the mana meter at 10+ (it drops 10)', buys: '1 mana core', cur: 'upkeep', how: 'not priced: a core is ' + A.CORE_CHARGE + ' charge for a Sigil caster', from: 'engine + data' });
  add({ fam, name: 'Strain over your limit', ap: '0', apN: null, passive: true, buys: 'you take ' + SOUL.strain.burn_per_point + ' damage a point over; ' + SOUL.strain.short_at_over + ' over is a Mana Short (Stunned ' + SOUL.strain.short_stun_rounds + ' round). Limit ' + SOUL.strain.limit + ' (' + REF.strainLimit + ' at Will Power ' + K.REF + '). Strain falls 1 a turn, and 1 more for a still turn, your first weapon attack, or tending an ally', cur: 'the price of Strain', how: 'not priced', from: 'data' });
  for (const fl of (A.FEELINGS || []) as any[]) {
    const st1 = fl.step || {}, flat = typeof st1.base === 'number' ? st1.base : null, plainStep = st[2] - st[1];
    add({ fam: 'Soul magic · feelings (a Pump poured with a feeling; ' + (A.FEELINGS || []).length + ' of them)', name: fl.name, ap: String(S.pump) + ' (a Pump)', apN: S.pump, price: (fl.pour?.strain ? '+' + fl.pour.strain + ' Strain; ' : '') + 'unlocked the first time it happens to you: ' + short(fl.trigger?.text || '', 90), limit: 'once a hold',
      buys: (flat != null ? 'a step of +' + flat + ' (a plain Pump: +' + round2(plainStep) + ')' : 'a step that depends: ' + Object.entries(st1).map(([k, x]) => k.replace(/_/g, ' ') + ' ' + x).join(', ')) + '; ' + short(fl.pour?.text || '', 120) + ' Residue on the tiles: ' + short(fl.residue?.text || 'none', 60), cur: 'damage dealt',
      v: flat != null ? (flat * base * sm) / Y.hit : null, how: flat != null ? 'the step alone on a Damage Bolt: +' + Math.round(flat * base * sm) + ' damage; what else it does is not priced' : 'not priced', partial: true, from: 'data (feelings.json)' });
  }
  // sample Outbursts: a Damage Bolt and a heal, stage by stage
  const school = (id: string) => A.SCHOOL[id], famS = 'Soul magic · sample Outbursts (Will Power ' + K.REF + ', Determination ' + K.REF + ')';
  for (let stage = 0; stage <= C.max_stage; stage++) {
    const ap = S.begin + stage * S.pump + S.release, dmg = base * sm * st[stage], mp = school('damage').base_cost;
    add({ fam: famS, name: 'Damage Bolt, stage ' + stage + ', all in one turn', ap: String(ap) + ' (Begin + ' + stage + ' Pump' + (stage === 1 ? '' : 's') + ' + Release)', apN: ap, price: mp + ' MP (of ' + REF.maxMp + '), ' + C.begin_strain + ' Strain' + (ap > 6 ? '; more than a 6 AP turn: needs a free Pump or a held turn' : ''),
      buys: Math.round(dmg) + ' Soul damage (ignores armour; a rolled hit)', cur: 'damage dealt', v: dmg / Y.hit, how: Math.round(dmg) + ' ÷ the rifle\'s ' + Y.hit, from: 'data (20 × Soul multiplier ×' + num(sm) + ' × stage ×' + st[stage] + ')' });
  }
  { const stage = 2, ap = S.begin + S.release, dmg = base * sm * st[stage];
    add({ fam: famS, name: 'Damage Bolt, begun, held 2 turns, released at stage 2', ap: String(ap) + ' over 3 turns', apN: ap, price: school('damage').base_cost + ' MP, ' + (C.begin_strain + 2 * C.swell_strain) + ' Strain', buys: Math.round(dmg) + ' Soul damage', cur: 'damage dealt', v: dmg / Y.hit, how: Math.round(dmg) + ' ÷ the rifle\'s ' + Y.hit, from: 'data', note: 'the swells are free AP; the price is Strain and time' }); }
  for (const stage of [0, 2, 4]) {
    const ap = S.begin + stage * S.pump + S.release, heal = 30 * REF.healing * st[stage];
    add({ fam: famS, name: 'Mend (Buff: heal), stage ' + stage, ap: String(ap), apN: ap, price: school('buff').base_cost + ' MP, ' + C.begin_strain + ' Strain', buys: Math.round(heal) + ' HP to one ally', cur: 'HP restored', v: hpIn(heal), how: Math.round(heal) + ' HP, at the rifle\'s rate', from: 'data (30 × Healing given ×' + num(REF.healing) + ' × stage)' });
  }
  { const ap = S.begin + S.release; add({ fam: famS, name: 'Control: Pinned, stage 0', ap: String(ap), apN: ap, price: school('control').base_cost + ' MP, ' + C.begin_strain + ' Strain', buys: 'Pinned 2 rounds on a failed Body save (or Slowed, a 3-tile push or pull)', cur: 'enemy AP removed', v: onSave(condV('pinned')! * 2), how: 'Pinned for 2 rounds, half the time', from: 'data (schools)' }); }
  for (const m of A.MODULES as any[]) {
    if (m.family === 'advanced') continue;
    add({ fam: 'Soul magic · modules (added to a design; paid in MP at Begin)', name: m.name, ap: m.id === 'swift' ? '−1 on Begin' : '0', apN: null, passive: true, price: (m.cost >= 0 ? '+' : '') + m.cost + ' MP', buys: short(m.text, 150), cur: '', how: 'not priced: it changes the design', from: 'data (soul_modules.json)' });
  }
}

// ------------------------------------------------------------------------------------------------ 9. prayers
/** Hymns whose worth is plain from their own text, by name (the rest are priced from their effects, or not at all). bp: Blessing power. */
const HYMN_VALUE: Record<string, (bp: number) => Val> = {
  Foreknowing: () => ({ x: 1.0, how: 'one enemy attack misses', cur: 'damage prevented' }),
  'Coin for the Ferry': (bp) => ({ how: 'a Downed ally stands up with ' + Math.round(10 * bp) + ' HP (not priced: it gives a character their turns back, like Stabilise)', cur: 'HP restored', partial: true }),
  'Cut Short': () => ({ x: onSave(condV('stunned')!), how: 'Stunned (a lost turn) on a failed Heart save; a boss loses 2 AP with no save', cur: 'enemy turn removed' }),
  'Feed the Fire': () => ({ x: 1 * K.AP, how: '+1 AP to an ally now; ends Weakened and Slowed (not priced)', cur: 'AP given to the squad', partial: true }),
  Pratfall: () => ({ x: onSave(condV('prone')! + condV('disarmed')!), how: 'Prone and disarmed on a failed Body save', cur: 'enemy AP removed' }),
  'Covering Fire': () => ({ x: 2 * onSave(condV('pinned')!), how: 'Pinned 1 round on a failed save, each enemy on 3×3 tiles (2 counted)', cur: 'enemy AP removed' }),
  Judgement: (bp) => ({ x: hpOut(40 * bp), how: Math.round(40 * bp) + ' Soul damage, no roll (double against one that harmed the helpless)', cur: 'damage dealt' }),
  'Lightning Rod': (bp) => ({ x: hpOut(50 * bp * 1.5), how: Math.round(50 * bp) + ' lightning damage, no roll, and half to 1 more enemy', cur: 'damage dealt' }),
  Absolution: (bp) => ({ x: hpIn(30 * bp), how: 'heals ' + Math.round(30 * bp) + ' and ends every harmful condition (the conditions are not priced)', cur: 'HP restored', partial: true }),
  Together: () => ({ x: 2 * (2 * HIT * 2 + 2 * HIT * K.ENEMY_ATTACKS), how: 'two allies each get +2 to hit (2 attacks) and +2 Defense (2 attacks on them) until your next turn', cur: 'damage dealt' }),
};
function prayerRows() {
  const P = A.AP_COST, FR = A.FAITH_RULES || {}, pj = FR.prayer || {};
  const whispers: any[] = A.WHISPERS || [];
  const bp = REF.blessing;
  for (const w of whispers) {
    const e = priceEffects(w.effects, w.scales_with === 'blessing_power' ? bp : 1);
    add({ fam: 'Prayer · Whispers (any patron)', name: 'Whisper: ' + w.name, ap: String(P.whisper), apN: P.whisper, price: 'Faith 3; the mana meter −5', limit: 'once a turn', buys: short(w.text, 150), cur: e ? 'see the text' : '', v: e && e.all ? e.v : null, how: e && e.all ? e.how.join(', ') + (w.scales_with ? ' (Blessing power ×' + num(bp) + ' at Faith ' + K.REF + ')' : '') : 'not priced', partial: !(e && e.all), from: 'data (patrons.json) + engine (AP_COST)' });
  }
  for (const p of (A.FAITH_PATRONS || A.PATRONS || []) as any[]) {
    for (const h of p.hymns || []) {
      const hv = HYMN_VALUE[h.name]?.(bp), gate = [3, 5, 7][h.tier - 1];
      const e = hv ? (hv.x == null ? null : { v: hv.x || 0, how: [hv.how], all: !hv.partial }) : priceEffects(h.effects, h.scales_with === 'blessing_power' ? bp : 1);
      add({ fam: 'Prayer · Hymns · ' + p.name, name: 'Hymn ' + 'I'.repeat(h.tier) + ': ' + h.name, ap: String(P.hymn), apN: P.hymn, price: 'Devotion ' + gate + ' (above your standing: a roll, and −3 Devotion XP on a miss); the mana meter −5', limit: 'a cooldown between Hymns (your prayer cooldown)', buys: short(h.text, 170), cur: hv?.cur || (e ? 'see the text' : ''), v: e && (e.all || hv) ? e.v : null,
        how: e && e.all ? e.how.join(', ') + ' (Blessing power ×' + num(bp) + ')' : e ? e.how.join(', ') + ' + a part with no price' : hv ? hv.how : 'not priced', partial: !(e && e.all), from: 'data (patrons.json)' });
    }
    if (p.miracle) add({ fam: 'Prayer · Miracles', name: p.name + ': ' + p.miracle.name, ap: String(P.miracle), apN: P.miracle, price: 'Faith ' + (A.MIRACLE_FAITH ?? 7) + ' and Devotion 10; it lowers Devotion by ' + A.MIRACLE_COST_LEVELS + ' levels', limit: 'once a session', buys: short(p.miracle.text, 200), cur: 'the class of its own: a peak', how: 'not priced: a once-a-session event', partial: true, from: 'data (patrons.json)' });
    if (p.intervention) add({ fam: 'Prayer · interventions (the patron acts by itself)', name: p.name, ap: '0', apN: null, passive: true, price: 'you must be Witnessed (Faith 5; a Hymn or Miracle this fight)', limit: 'once a fight (twice from Devotion 7)', buys: short(p.intervention.text, 170), cur: '', how: 'not an action', from: 'data (patrons.json)' });
  }
  void pj;
}

// ------------------------------------------------------------------------------------------------ AP sources, refunds, discounts
/** How often the action a discount applies to comes up in a fight (PROPOSED assumptions, printed in the report): a
 * discount on clearing a jam is not worth 2 AP every turn. An action not listed is taken to be done every turn. */
const RARE: Record<string, number> = { clear_jam: 1, retreat: 1, field_repair: 1, swap_core: 1, stabilise: 1, analyze: 2, vent: 2, swap_weapon_or_mod: 2, disengage: 2, reload: 2, heal: 3, break: 2 };
interface Source { id?: string; who: string; kind: string; what: string; cond: string; often: string; per: number; fires: number; fight: number; cooled: number; back: string }
function apSources(): Source[] {
  const out: Source[] = [];
  const firesOf = (e: any, parentUses?: string): [number, string] => {
    const s = [e.limit, e.uses, e.duration, e.per, parentUses].filter(Boolean).join(' ');
    const c = String(e.when || e.context || e.trigger || '');
    // the card's own words, where the data wrote no limit (Sweet Talker: "once per turn" is in its text and its code)
    if (!s && !/each[_ ]turn|next_turn|first/.test(c)) {
      const m = /[Oo]nce (?:per|a) (turn|round|fight|scene|session)/.exec(curText);
      if (m) return /turn|round/.test(m[1]) ? [K.ROUNDS, 'once a ' + m[1] + ' (its card says so; the data writes no limit)'] : [1, 'once a ' + m[1] + ' (its card says so)'];
    }
    if (/per_combat|per_scene|per_session|per_rest|once_per_combat/.test(s)) return [1, 'once a fight'];
    if (/each[_ ]turn/.test(c)) return [K.ROUNDS, 'once a turn'];
    if (/next_turn/.test(s + ' ' + c) || /first/.test(c)) return [1, 'once a fight (its trigger comes once, or rarely)'];
    if (/twice_per_turn/.test(s)) return [2 * K.ROUNDS, 'twice a turn'];
    if (/once_per_turn|per_turn|per_round|round/.test(s)) return [K.ROUNDS, 'once a turn'];
    if (/combat/.test(s)) return [K.ROUNDS, 'every turn of the fight'];
    return [K.ROUNDS, 'every time its condition holds (no limit written)'];
  };
  let curId = '', curText = '';
  /** the use limit of the item's own action, for an effect that says it happens when that action is used */
  const actionUses = (effs: any[], e: any) => effs.find((x) => x.op === 'grant_action' && x.uses && (e.when === x.action || e.when === 'on_use'))?.uses;
  const visit = (who: string, e: any, backOf: (v: number) => string, parentUses?: string) => {
    if (!e || typeof e !== 'object') return;
    const cond = cell(e.when || e.context || e.trigger || '');
    const push = (kind: string, what: string, per: number, action?: string) => { if (per <= 0) return; let [fires, often] = firesOf(e, parentUses);
      const rare = action ? RARE[action] : undefined; if (rare != null && rare < fires) { fires = rare; often = 'whenever you do it: about ' + (rare === 1 ? 'once' : rare + ' times') + ' a fight (assumed)'; }
      const capped = Math.min(per, A.PERK_AP_CAP); out.push({ id: curId, who, kind, what, cond, often, per, fires, fight: capped * fires, cooled: capped * Math.min(fires, Math.ceil(K.ROUNDS / 3)), back: backOf(per) }); };
    if (e.op === 'stat_mod' && e.stat === 'ap' && typeof e.value === 'number' && e.value > 0 && !e.target) push('extra AP', '+' + e.value + ' AP', e.value);
    else if (e.op === 'stat_mod' && e.stat === 'ap' && typeof e.value === 'number' && e.value > 0 && e.target) push('extra AP (to ' + e.target + ')', '+' + e.value + ' AP', e.value);
    else if (e.op === 'ap_carry') push('carried AP', 'carry ' + e.value + ' unspent AP into the next turn', e.value);
    else if (e.op === 'shared_ap') push('shared AP', e.value + ' AP passed to or from the sibling', e.value);
    else if (e.op === 'free_action' && typeof e.ap === 'number') push('free actions (to ' + (e.target || 'you') + ')', e.ap + ' AP of free actions', e.ap * (/all_allies/.test(e.target || '') ? K.ALLIES : 1));
    else if (e.op === 'interrupt' && typeof e.ap === 'number' && e.ap > 0) push('an extra turn slice', e.ap + ' AP to act out of turn', e.ap);
    else if (e.op === 'action_cost' && (typeof e.value === 'number' ? e.value < 0 : typeof e.set === 'number')) push('discount', (e.action || 'an action') + (typeof e.set === 'number' ? ' costs ' + e.set + ' AP' : ' costs ' + Math.abs(e.value) + ' AP less'), typeof e.set === 'number' ? Math.max(0, (codeAp(e.action) ?? dataAction(e.action)?.ap ?? 2) - e.set) : Math.abs(e.value), e.action);
    else if (e.op === 'cost_mod' && e.value === 'zero') push('discount', (e.action || 'an action') + ' is free', 1, e.action);
    else if (e.op === 'free_attack') push('a free attack', 'an attack for 0 AP (' + (e.kind || e.attack || 'attack') + ')', 2);
    else if (e.op === 'free_move') push('a free move', (e.tiles || '?') + ' tiles for 0 AP (' + (e.target || 'you') + ')', 1);
    else if (e.op === 'stat_mod' && e.stat === 'pump_ap' && e.value < 0) push('discount', 'a Pump costs ' + Math.abs(e.value) + ' AP less', Math.abs(e.value));
    for (const sub of [...(e.effects || []), ...(e.effect ? [e.effect] : []), ...(e.penalty ? [] : [])]) visit(who, sub, backOf, e.uses || parentUses);
  };
  const negOf = (effects: any[]) => { const n = (effects || []).filter((e) => e.op === 'stat_mod' && e.stat === 'ap' && typeof e.value === 'number' && e.value < 0 && !e.target); return n.length ? n.map((e) => e.value + ' AP when ' + cell(e.when || e.context || '?')).join('; ') : ''; };
  for (const p of PERKS) for (const t of tiersOf(p)) { const effs = p.tiers?.[t]?.effects || p.effects || []; curId = p.id; curText = p.tiers?.[t]?.text || p.text || ''; for (const e of effs) visit(p.name + (p.tiers ? ' (Tier ' + t + ')' : '') + ' [perk]', e, () => negOf(effs), actionUses(effs, e)); }
  for (const t of TRAITS) { curId = t.id; curText = t.text || ''; for (const e of t.effects || []) visit(t.name + ' [trait]', e, () => negOf(t.effects || []), actionUses(t.effects || [], e)); }
  for (const c of A.CLASSES as any[]) for (const [rank, rv] of Object.entries(c.ranks) as [string, any][]) for (const m of rv.moves) { curId = String(m.key).replace(/^class:/, ''); curText = m.text || ''; for (const e of m.effects || []) visit(c.name + ': ' + m.name + ' (rank ' + rank + ') [class move]', e, () => '', m.uses === 'at_will' ? undefined : m.uses); }
  curId = ''; curText = '';
  // sources that are rules, not effects on an item (read from the data files by name)
  const rally = (A.CALL['call.rally']?.steps || []).map((s: any) => s.numbers.ap), brief = (A.CALL['call.brief']?.steps || []).map((s: any) => s.numbers.first + s.numbers.second);
  const rule = (who: string, kind: string, what: string, cond: string, often: string, per: number, fires: number) => out.push({ who, kind, what, cond, often, per, fires, fight: per * fires, cooled: per * fires, back: 'not a perk: the 3-turn cooldown ruling does not name it' });
  if (rally.length) rule('Rally [Call, Charisma]', 'AP given to an ally', '+' + rally.join(' / +') + ' AP by step', 'costs the caller ' + CR.ap + ' AP (' + CR.cheap_ap + ' from ' + CR.cheap_at + ' points, 0 as a reaction from ' + CR.reaction_at + ', the first of a turn free at ' + CR.free_at + ')', 'each ally once a round; it counts in the ally\'s +3 a turn and never takes them past 9', Math.max(...rally), K.ROUNDS);
  if (brief.length) rule('Brief [Call, Eloquence]', 'discount for an ally', brief.join(' / ') + ' AP off their next actions by step', 'the same Call prices', 'each ally once a round (one helping Call a round: Rally or Brief, not both); it counts in the ally\'s +3 a turn', Math.max(...brief), K.ROUNDS);
  rule('Order [Call, Authority]', 'free actions for an ally', 'a reload, a stand-up, a pick-up or a move for 0 AP (two of them at step 3)', 'it uses the ally\'s reaction', 'each ally once a round', 3, K.ROUNDS);
  rule('Any Call at ' + CR.free_at + ' points', 'discount', 'the first Call of each turn costs 0 AP', 'a Mastered gamma skill', 'once a turn', CR.cheap_ap, K.ROUNDS);
  rule('Any Call at ' + CR.reaction_at + ' points', 'an extra action', 'a Call as a reaction, 0 AP', 'your reaction', 'once a round', CR.cheap_ap, K.ROUNDS);
  if (A.SIGIL.quicken) rule('QUICKEN [Sigil word]', 'AP given to an ally', '+' + (A.SIGIL.quicken.ap ?? 2) + ' AP on their next turn', 'a Line with QUICKEN (' + A.SIGIL.quicken.charge + ' charge for the word); never on the caster', 'each target once a round', A.SIGIL.quicken.ap ?? 2, K.ROUNDS - 1);
  for (const fp of SOUL.cycle.free_pumps || []) rule('Free Pumps from Empathy ' + fp.empathy, 'discount', fp.pumps + ' Pump' + (fp.pumps > 1 ? 's' : '') + ' a round cost 0 AP', 'holding an Outburst', 'every round', fp.pumps, K.ROUNDS);
  if (SOUL.cycle.first_pump_free) rule('The first Pump of a fight', 'discount', '1 Pump for 0 AP', 'every Soul caster', 'once a fight', 1, 1);
  rule('A held Outburst swelling', 'a free Pump', '+1 stage at the start of each turn you hold it', '+' + SOUL.cycle.swell_strain + ' Strain a turn', 'every turn held', 1, K.ROUNDS - 1);
  { const d = A.TECHNIQUE.draw_cut, l = A.TECHNIQUE.last_round;
    if (d) rule('Draw Cut [technique]', 'discount', 'a strike for the weapon\'s AP ' + d.ap.add + ', drawing included', 'the weapon stowed at the start of the turn', 'once per stowed weapon', 2, 1);
    if (l) rule('Last Round [technique]', 'refund', 'your next speed reload is free', 'the shot with the last round takes the target out', 'once a magazine', 2, 2); }
  { const perk = (id: string, what: string, cond: string, often: string, per: number, fires: number) => { const p = A.PERK[id]; if (p) out.push({ id, who: p.name + ' [perk]', kind: 'discount', what, cond, often, per, fires, fight: per * fires, cooled: per * Math.min(fires, Math.ceil(K.ROUNDS / 3)), back: '' }); };
    perk('heart_overload', 'a second Begin for 0 AP (' + A.SPELL_AP.begin + ' AP saved)', 'right after you Release at stage 2 or higher', 'once a turn', A.SPELL_AP.begin, K.ROUNDS);
    perk('the_twin_pays', 'a Begin for 0 AP, no mana, no Strain', 'your choice', 'once a fight', A.SPELL_AP.begin, 1); }
  for (const p of (A.FAITH_PATRONS || A.PATRONS || []) as any[]) {
    const scan = (what: string, text: string, often: string, fires: number) => {
      const m = /\+(\d) AP/.exec(text || ''), per = m ? Number(m[1]) : /reload is free/.test(text || '') ? (dataAction('reload')?.ap ?? 2) : /another full turn/.test(text || '') ? A.AP_BASE : /repeat the last action/.test(text || '') ? 2 : 0;
      if (per) rule(p.name + ': ' + what + ' [prayer]', /everyone|whole squad|[Ee]very ally/.test(text) ? 'AP for the whole squad (each)' : 'AP or a refund', short(text, 110), what.startsWith('the Miracle') ? 'Faith 7 and Devotion 10; −5 Devotion levels' : what.startsWith('its intervention') ? 'you are Witnessed' : '3 AP to pray it', often, per, fires);
    };
    scan('its intervention', p.intervention?.text, 'once a fight (twice from Devotion 7)', 1);
    for (const h of p.hymns || []) scan('Hymn ' + 'I'.repeat(h.tier) + ' ' + h.name, h.text, 'a cooldown between Hymns', 2);
    if (p.miracle) scan('the Miracle ' + p.miracle.name, p.miracle.text, 'once a session', 1);
  }
  rule('A held shot or an opportunity attack', 'an attack off your turn', 'one attack on the enemy\'s turn', 'Overwatch is paid on your turn; an opportunity attack is free', 'once a round (the reaction)', 2, K.ROUNDS);
  // a perk whose two tiers give the same thing takes one line
  const merged: Source[] = [];
  for (const s of out) {
    const base = s.who.replace(/ \(Tier I+\)/, ''), twin = merged.find((m) => m.who.replace(/ \(Tier I(?: and II)?\)/, '') === base && m.what === s.what && m.cond === s.cond && m.fight === s.fight && m.kind === s.kind);
    if (twin && / \(Tier II\)/.test(s.who)) { twin.who = twin.who.replace(' (Tier I)', ' (Tier I and II)'); if (s.back !== twin.back) twin.back = [twin.back && 'Tier I: ' + twin.back, s.back && 'Tier II: ' + s.back].filter(Boolean).join('; ') || ''; continue; }
    merged.push(s);
  }
  return merged.sort((a, b) => b.fight - a.fight || b.per - a.per);
}
/** Items whose code hands out AP (grantPerkAp, bankAp, pushAp, a direct u.ap +=) : a cross-check on the data scan. */
function codeApGivers(): string[] {
  const out = new Set<string>();
  for (const s of SOURCES) {
    if (!/^(perks|classes)\//.test(s.file)) continue;
    for (const block of s.text.split(/\bregister\(\{/).slice(1)) {
      const id = /\bid: ['"`]([\w.]+)['"`]/.exec(block)?.[1]; if (!id) continue;
      if (/grantPerkAp\(|bankAp\(|pushAp\(|\.ap \+= /.test(block)) out.add(id);
    }
  }
  return [...out].sort();
}

// ------------------------------------------------------------------------------------------------ the report
function table(head: string[], lines: string[][]): string[] {
  return ['| ' + head.join(' | ') + ' |', '|' + head.map(() => '---').join('|') + '|', ...lines.map((l) => '| ' + l.map(cell).join(' | ') + ' |')];
}
const perApCell = (r: Row) => (r.passive ? '' : r.v == null ? 'not priced' : r.full === 0 ? 'free' : num(r.ratio, 1) + '×');
const flagCell = (r: Row) => (r.flag ? r.flag + (r.limit && /once|a fight|a scene|a session/.test(r.limit) && !/a round|a turn|reaction/.test(r.limit) ? ' (' + r.limit + ')' : '') : r.partial && r.v != null ? 'part priced' : '');
function report(sources: Source[], givers: string[]): string {
  const L: string[] = [];
  const priced = rows.filter((r) => r.v != null && !r.passive), flaggable = priced.filter((r) => !r.partial);
  const actions = rows.filter((r) => !r.passive);
  const apCount: Record<string, number> = {}; const single = actions.filter((r) => !/sample/.test(r.fam));
  for (const r of single) { const k = r.apN == null ? 'varies' : r.apN === 0 ? '0' : r.apN < 1 ? 'under 1' : String(Math.round(r.apN)); apCount[k] = (apCount[k] || 0) + 1; }
  const cheap = flaggable.filter((r) => r.flag.startsWith('cheap')).sort((a, b) => b.surplus! - a.surplus!), dear = flaggable.filter((r) => r.flag.startsWith('dear')).sort((a, b) => a.ratio! - b.ratio! || a.surplus! - b.surplus!);
  // the two top lists: weapons have their own table (their spread is angle A's question), and a Call's three steps or
  // an Outburst's five stages take one line (the most extreme one)
  const stem = (r: Row) => r.fam.split(' · ')[0] + ':' + r.name.replace(/, (stage|step) \d.*$/, '').replace(/ \(Tier I+\)/, '');
  const firstOfEach = (list: Row[]) => { const seen = new Set<string>(); return list.filter((r) => !r.fam.startsWith('Plain attack') && !seen.has(stem(r)) && !!seen.add(stem(r))); };
  const cheapTop = firstOfEach(cheap).slice(0, 20), dearTop = firstOfEach(dear).slice(0, 20);
  const guns = rows.filter((r) => r.fam.startsWith('Plain attack') && r.ratio != null).sort((a, b) => b.ratio! - a.ratio!);
  const dearest = Math.max(...single.map((r) => r.apN || 0));
  const fams = [...new Set(rows.map((r) => r.fam))];
  const top = (fam: string) => fam.split(' · ')[0];
  const tops = [...new Set(fams.map(top))];

  L.push('# The action price list (balance pass, instrument 3)', '',
    'Written by a tool (`packages/engine/test/balance/price-list.test.ts`); run it again after any change:', '', '```', 'PRICE_LIST_OUT=$PWD/docs/design/handoffs/action-price-list.md npx vitest run --root packages/engine test/balance/price-list.test.ts', '```', '',
    'It lists every thing a character can do in a fight, what it costs and what it buys, read from the data files and from the engine. **No number in the game was changed.** Every price is today\'s. Every *worth* is my proposal: the game has never said what an AP is worth, so the conversion below had to be chosen. It is one small table in the tool; change a line and every flag is worked out again.', '');

  // ---- summary
  L.push('## Summary', '');
  L.push('1. **' + actions.length + ' actions and switches are listed**, plus ' + (rows.length - actions.length) + ' always-on rows that set a price (class moves that work by themselves, Outburst modules, interventions). By family: ' + tops.map((t) => t + ' ' + rows.filter((r) => top(r.fam) === t).length).join(', ') + '.');
  L.push('2. **The price spread:** ' + Object.entries(apCount).sort((a, b) => (a[0] === 'varies' ? 99 : Number(a[0]) || 0.5) - (b[0] === 'varies' ? 99 : Number(b[0]) || 0.5)).map(([k, n]) => (k === 'varies' ? n + ' with no single number (always on, or set by the situation)' : n + ' at ' + k + ' AP')).join(', ') + '. (The sample spells and Outbursts, which are several actions in a row, are not counted here.) The dearest single action is ' + dearest + ' AP: nothing a character does in one action costs more, while a turn is 6.');
  L.push('3. **' + priced.length + ' of them have a worth in plain attacks** (' + flaggable.length + ' in full, ' + (priced.length - flaggable.length) + ' in part). The rest buy position, upkeep, information or a Narrator\'s judgement, and are listed with their price and no flag.');
  L.push('4. **Against the yardstick (1 AP = half a plain attack): ' + cheap.length + ' are cheap for what they do** (1.5 times the yardstick or more) **and ' + dear.length + ' are dear** (two thirds or less). ' + (flaggable.length - cheap.length - dear.length) + ' sit inside the band.');
  L.push('5. **The yardstick, measured:** a service rifle shot from a character with ' + K.REF + ' points in Dexterity and Agility does **' + Y.hit + ' damage to a soldier** (' + Y.foeHp + ' HP) at ' + Y.pct + '% to hit, for ' + Y.ap + ' AP. "One plain attack" below means that shot landing 65% of the time. For scale, the same soldier\'s rifle shot does **' + Y.enemyHit + ' damage to that character** (' + Y.pcHp + ' HP, armour ' + Y.pcArmour + ' from the soldier kit) at ' + Y.enemyPct + '%: about ' + Math.round(Y.pcHp / Y.enemyHit) + ' hits to put them down, against ' + Math.ceil(Y.foeHp / Y.hit) + ' the other way.');
  const free = actions.filter((r) => r.apN === 0), chain = free.filter((r) => !r.limit || /no limit/.test(r.limit));
  L.push('6. **' + free.length + ' actions cost 0 AP.** ' + chain.length + ' of them have no limit on how often they can be used in a turn (section "Free actions").');
  L.push('7. **' + sources.length + ' ways to get AP beyond the 6 a turn, a refund or a discount** are listed and ranked (section "AP sources"). The engine caps AP gained from perks at +' + A.PERK_AP_CAP + ' a turn and a turn at ' + A.AP_MAX + ' AP; no source has a cooldown today.');
  if (problems.length) L.push('8. **' + problems.length + ' prices could not be read with confidence, or the data and the engine disagree** (section "Could not be read"). Those rows say so and are not flagged.');
  L.push('');

  // does the yardstick hold? the middle action of each family against it
  { const med = (xs: number[]) => { const a = [...xs].sort((x, y) => x - y); return a.length ? (a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2) : null; };
    const groups: [string, (r: Row) => boolean][] = [['Plain attacks (60 weapons)', (r) => r.fam.startsWith('Plain attack')], ['Techniques, melee', (r) => r.fam.startsWith('Technique · melee')], ['Techniques, ranged', (r) => r.fam.startsWith('Technique · ranged')],
      ['Calls, step 1 (1 point, 2 AP)', (r) => r.fam.startsWith('Call ·') && /step 1/.test(r.name)], ['Calls, step 2 (3 points, 2 AP)', (r) => r.fam.startsWith('Call ·') && /step 2/.test(r.name)], ['Calls, step 3 (7 points, 1 AP)', (r) => r.fam.startsWith('Call ·') && /step 3/.test(r.name)],
      ['Class moves', (r) => r.fam.startsWith('Class move')], ['Perk and trait actions', (r) => r.fam.startsWith('Perk') || r.fam.startsWith('Trait')], ['Sigil sample spells', (r) => r.fam.startsWith('Sigil magic · sample')], ['Soul sample Outbursts', (r) => r.fam.startsWith('Soul magic · sample')],
      ['Whispers', (r) => r.fam.startsWith('Prayer · Whispers')], ['Hymns', (r) => r.fam.startsWith('Prayer · Hymns')]];
    L.push('### Does the yardstick hold up?', '', 'If "1 AP = half a plain attack" is a fair yardstick, the middle action of each family should sit near 1.0× and the families should not all lean one way. Only rows priced in full and paid in AP are counted (a row that waits for a trigger, or with a part that has no number, is left out).', '');
    L.push(...table(['Family', 'Rows priced in full', 'The middle one', 'Lowest', 'Highest', 'Cheap', 'Dear'], groups.map(([name, f]) => { const rs = flaggable.filter((r) => f(r) && r.ratio != null), xs = rs.map((r) => r.ratio!); return [name, String(rs.length), xs.length ? num(med(xs), 1) + '×' : '', xs.length ? num(Math.min(...xs), 1) + '×' : '', xs.length ? num(Math.max(...xs), 1) + '×' : '', String(rs.filter((r) => r.flag.startsWith('cheap')).length), String(rs.filter((r) => r.flag.startsWith('dear')).length)]; })), '');
    const allX = flaggable.filter((r) => r.ratio != null && !r.fam.startsWith('Plain attack')).map((r) => r.ratio!);
    L.push('Over every action priced in full (weapons aside), the middle one pays **' + num(med(allX), 1) + '×** the yardstick. Read with the table: the yardstick holds for weapon techniques and class moves; talk (the Calls at low points, Whispers, saves) sits well under it, and that is the conversion speaking as much as the game, because every effect that goes through a save is halved and a +1 to hit is counted as a thirteenth of an attack.', ''); }
  L.push('### The twenty most "cheap for what it does"', '', 'Ranked by how much more they give than the yardstick pays for (worth minus half an attack per AP of full price). "Full price" is AP plus the Momentum and the reaction it spends (see the conversion). A once-a-fight or once-a-scene action is expected here: the peak rule lets a class go past the targets with its dearest move, so read those against section "Each class\'s dearest move".', '');
  L.push(...table(['#', 'Action', 'Family', 'AP', 'Other costs', 'How often', 'Worth (plain attacks)', 'Against the yardstick', 'Why'], cheapTop.map((r, i) => [String(i + 1), r.name, r.fam, r.ap, r.price, r.limit, num(r.v), perApCell(r), r.buys])), '');
  L.push('### The twenty most "dear for what it does"', '', 'Ranked by how little of the yardstick they pay (the lowest first). An Outburst\'s stages and a Call\'s steps take one line each: the worst one.', '');
  L.push(...table(['#', 'Action', 'Family', 'AP', 'Other costs', 'How often', 'Worth (plain attacks)', 'Against the yardstick', 'Why'], dearTop.map((r, i) => [String(i + 1), r.name, r.fam, r.ap, r.price, r.limit, num(r.v), perApCell(r), r.buys])), '');

  L.push('### The plain attack, weapon by weapon', '', 'Not in the two lists above: every weapon\'s plain attack against the service rifle\'s, per AP, at ' + K.REF + ' points. This is angle A\'s question (what each weapon family is for), shown here because the plain attack is the yardstick everything else is priced with. The six best and the six worst:', '');
  L.push(...table(['Weapon', 'Family', 'AP', 'What it does', 'Per AP, against the service rifle'], [...guns.slice(0, 6), ...guns.slice(-6)].map((r) => [r.name, r.fam.split(' · ')[1], r.ap, r.buys, num(r.ratio, 1) + '×'])), '');
  // ---- the same thing at two prices
  const find = (fam: string, name: string) => rows.find((r) => r.fam.startsWith(fam) && r.name.startsWith(name));
  const PAIRS: [string, [string, string][]][] = [
    ['Gaining Guard', [['Technique · melee · Links', 'Guard'], ['Class move · Defender', 'Brace']]],
    ['A shove', [['Technique · melee · Links', 'Shove'], ['Class move · Fighter', 'Shove'], ['Basic action', 'Shove']]],
    ['Going Hidden', [['Basic action', 'Hide'], ['Class move · Infiltrator', 'Vanish'], ['Perk · mastered', 'Vanishing Act']]],
    ['Spending Momentum on one big strike', [['Technique · melee · Finishers', 'Coup'], ['Class move · Fighter', 'Finisher']]],
    ['A strike with a free step', [['Technique · melee · Openers', 'Lunge'], ['Class move · Fighter', 'Lunge']]],
    ['A shot that injures', [['Technique · ranged · Fire', 'Called Shot'], ['Class move · Marksman', 'Called Shot']]],
    ['Taking AP from an enemy', [['Call · Intimidation', 'Threaten, step 1'], ['Call · Intimidation', 'Threaten, step 3'], ['Class move · Trickster', 'Silver Tongue'], ['Technique · ranged · Takes', 'Stopping Shot'], ['Technique · melee · Strikes', 'Bash']]],
    ['Giving AP to an ally', [['Call · Charisma', 'Rally, step 1'], ['Call · Charisma', 'Rally, step 3'], ['Call · Eloquence', 'Brief, step 3'], ['Sigil magic · sample', 'QUICKEN + SEEK'], ['Prayer · Hymns', 'Hymn III: Feed the Fire']]],
    ['Healing one ally', [['Basic action', 'Stim an ally'], ['Class move · Bard', 'Triage'], ['Class move · Bard', 'Stim Throw'], ['Prayer · Whispers', 'Whisper: Health'], ['Prayer · Hymns', 'Hymn I: Warm Hands'], ['Sigil magic · sample', 'MEND + SEEK'], ['Soul magic · sample', 'Mend (Buff: heal), stage 0']]],
    ['A shield on one ally', [['Prayer · Whispers', 'Whisper: Protection'], ['Class move · Guardian', 'Will Shield'], ['Prayer · Hymns', 'Hymn I: Saint'], ['Sigil magic · sample', 'WARD + SEEK']]],
    ['One attack, three ways', [['Technique · ranged · Fire', 'Shot'], ['Sigil magic · sample', 'FIRE + SEEK'], ['Soul magic · sample', 'Damage Bolt, stage 0']]],
    ['A held shot', [['Technique · ranged · Hold a shot', 'Overwatch'], ['Technique · ranged · Hold a shot', 'Deny'], ['Technique · ranged · Hold a shot', 'Dead to Rights'], ['Class move · Marksman', 'Killzone']]],
  ];
  L.push('### The same thing at different prices', '', 'Rows from the full table set side by side: things that do the same job and are priced differently today. This needs no conversion to read: look at the AP and what it buys.', '');
  const pairLines: string[][] = [];
  for (const [job, list] of PAIRS) for (const [fam, name] of list) { const r = find(fam, name); if (r) pairLines.push([job, r.name, r.fam, r.ap, [r.price, r.limit].filter(Boolean).join('; '), r.buys, r.v == null ? 'not priced' : num(r.v), perApCell(r)]); else problems.push('The comparison "' + job + '" names a row that is not in the table: ' + fam + ' / ' + name + '.'); }
  L.push(...table(['The job', 'Action', 'Family', 'AP', 'Other costs and limits', 'What it buys', 'Worth', 'Against the yardstick'], pairLines), '');
  // ---- AP sources
  L.push('## AP sources: more than 6 AP, refunds and discounts', '',
    'Ranked by the most AP one of them can add in a ' + K.ROUNDS + '-round fight if its condition holds every time it can (an upper bound, with the engine\'s cap of +' + A.PERK_AP_CAP + ' a turn applied). "With the ruling" is the same with Leon\'s ruling applied: a cooldown of 3 turns, so it fires at most ' + Math.ceil(K.ROUNDS / 3) + ' times in ' + K.ROUNDS + ' rounds. The condition is the data\'s own wording. A discount on an action that does not come up every turn is counted for the times it does (assumed, proposed: ' + Object.entries(RARE).map(([k, n]) => k.replace(/_/g, ' ') + ' ' + n).join(', ') + ' times a fight). AP from a Call (Rally, Brief) goes through the same +3 a turn as perk AP; an Order, a QUICKEN, a free Pump and a held shot do not.', '');
  L.push(...table(['#', 'Source', 'Kind', 'What it gives', 'Condition (as the data writes it)', 'How often today', 'AP a fight, at most', 'With the ruling (3-turn cooldown)', 'The other side of it'],
    sources.map((s, i) => [String(i + 1), s.who, s.kind, s.what, s.cond, s.often, String(s.fight), /\[(perk|trait)\]/.test(s.who) ? String(s.cooled) : 'not a perk', s.back])), '');
  { const inTable = new Set(sources.map((s) => s.id).filter(Boolean)), nameOf = (id: string) => A.PERK[id]?.name || TRAITS.find((t) => t.id === id)?.name || id;
    const both = givers.filter((g) => inTable.has(g)), codeOnly = givers.filter((g) => !inTable.has(g));
    L.push('**Cross-check against the code.** ' + givers.length + ' perks, traits and class moves touch AP in their own code (they bank it, grant it, add it at the start of a turn, or hand it back). ' + both.length + ' of them are in the table above. **These ' + codeOnly.length + ' are not**, because their data does not describe what they do as an AP effect; each has to be read by hand before the cooldown is built (some only give AP back on a refused action, or run a companion\'s own AP): ' + codeOnly.map(nameOf).join(', ') + '.', ''); }

  // ---- free actions
  L.push('## Free actions (0 AP)', '', 'Target 3 of angle B (proposed): a turn\'s free actions together are worth no more than 2 AP. The first table is the ones with **no limit a turn**: they can be chained.', '');
  L.push(...table(['Action', 'Family', 'Other costs', 'What it buys', 'Worth'], chain.map((r) => [r.name, r.fam, r.price, r.buys, r.v == null ? 'not priced' : num(r.v)])), '');
  L.push('Limited free actions:', '');
  L.push(...table(['Action', 'Family', 'How often', 'Other costs', 'What it buys', 'Worth'], free.filter((r) => !chain.includes(r)).map((r) => [r.name, r.fam, r.limit, r.price, r.buys, r.v == null ? 'not priced' : num(r.v)])), '');

  // ---- the peak rule
  L.push('## Each class\'s dearest move (the peak rule)', '', 'For each class, the move with the highest full price (AP, then the resource it spends, then how rarely it can be used), with what it buys. The peak rule says this is the move that may pass the targets. For the three Mind and the three Soul classes the dearest thing they do is not a class move but a spell: a 4-glyph Line, or an Outburst pumped to stage 4 (see the sample spells and Outbursts in the full table); their class moves mostly change what a spell costs.', '');
  const byClass: Record<string, Row[]> = {}; for (const r of rows.filter((x) => x.cls && !x.passive)) (byClass[r.cls!] ||= []).push(r);
  const rarity = (r: Row) => (/session/.test(r.limit) ? 3 : /scene|fight|rest/.test(r.limit) ? 2 : 0) + (/rank III/.test(r.name) ? 0.2 : /rank II/.test(r.name) ? 0.1 : 0);
  L.push(...table(['Class', 'Dearest move', 'AP', 'Other costs', 'How often', 'What it buys', 'Worth', 'Against the yardstick'],
    Object.entries(byClass).map(([c, rs]) => { const r = [...rs].sort((a, b) => (b.full ?? 0) + rarity(b) - ((a.full ?? 0) + rarity(a)))[0]; return [c, r.name, r.ap, r.price, r.limit, r.buys, r.v == null ? 'not priced' : num(r.v), perApCell(r)]; })), '');

  // ---- the conversion
  L.push('## The conversion (all of it proposed)', '', 'Nothing here is in the game. These are the lines a worth is built from; each is one constant at the top of the tool.', '');
  L.push(...table(['#', 'Proposed line', 'Value', 'Where it comes from'], [
    ['1', '1 AP is worth', K.AP + ' plain attack', 'angle B, target 1 (the yardstick)'],
    ['2', 'An attack lands', K.PCT * 100 + '% of the time', "Leon's answer 8 (about 65% at equal level)"],
    ['3', 'An enemy fails a save', K.SAVE * 100 + '% of the time', 'angle F, proposed target (45 to 55%)'],
    ['4', '+1 to hit on one attack', num(HIT, 3) + ' attack', '5 points on a 65% chance'],
    ['5', 'Damage with no roll', 'damage ÷ (' + K.PCT + ' × ' + Y.hit + ')', 'a plain attack lands 65% of the time for ' + Y.hit],
    ['6', 'HP healed, shielded or soaked', 'HP ÷ (' + K.PCT + ' × ' + Y.hit + ')', 'a point of HP is worth the same on either side. (Counted in enemy attacks it would be worth ' + num(Y.hit / Y.enemyHit, 1) + ' times more: a soldier\'s shot does only ' + Y.enemyHit + ' to this character)'],
    ['7', '1 Pressure on an enemy', K.PRESSURE + ' attack', '4 Pressure is Broken: −2 AP'],
    ['8', '1 Momentum spent', K.MOMENTUM_AP + ' AP of price', 'a Finisher turns 1 Momentum into +20 to +25% of an attack'],
    ['9', 'Your reaction spent', K.REACTION_AP + ' AP of price', 'one a round; it fires only if the trigger comes'],
    ['10', 'An enemy\'s turn', K.ENEMY_ATTACKS + ' attacks', '6 AP: about 4 on attacks, 2 on moving'],
    ['11', 'One tile of movement', num(K.AP / REF.movement, 2) + ' attack', '1 AP walks ' + REF.movement + ' tiles at Agility ' + K.REF],
    ['12', '"A normal share of points"', K.REF + ' in the skill and its attribute', "Leon's answer 2 (the yardstick weapon in normal hands); the number 4 is mine"],
    ['13', 'Cheap / dear', K.CHEAP + '× or more / ' + K.DEAR + '× or less', 'a band of one half either way'],
    ['14', 'A free action is "cheap" from', K.FREE_WORTH + ' attack', 'half an AP of worth for nothing'],
    ['15', 'A fight lasts', K.ROUNDS + ' rounds', "Leon's answer 1 (4 to 6)"],
    ['16', '"Every ally" / "the squad\'s attacks on it" / "later hits on broken armour"', K.ALLIES + ' allies / ' + K.MARK_ATTACKS + ' attacks / ' + K.ARMOUR_HITS + ' hits', 'a squad of four'],
    ['17', 'One enemy attack prevented (a forced miss, a Disengage, an attack drawn onto a decoy)', '1 plain attack', 'true once enemies scale: Leon\'s ruling of 3 enemy turns of focus to drop a character puts an enemy attack at about ' + Math.round(Y.pcHp / 6) + ' HP. **Today it is ' + num((Y.enemyHit * Y.enemyPct) / 100, 0) + ' HP** (a soldier\'s shot, ' + Y.enemyHit + ' at ' + Y.enemyPct + '%), so today every "enemy attack prevented" row is worth about ' + num((Y.enemyHit * Y.enemyPct) / 100 / (K.PCT * Y.hit), 1) + ' of what is listed, while the rows counted in HP (heals, shields, Guard) are worth what is listed'],
    ['18', 'A row that waits for a trigger (an Answer, a held shot, a move that fires on your reaction)', 'listed, never flagged', 'its worth is "if it fires"; how often it fires is the fight simulator\'s to measure'],
    ['19', 'Healing given', '×1 for a Sigil caster, a Guardian, a stim; ×' + num(REF.healing) + ' for a Bard and a Soul heal', 'Healing given is Empathy and Insight: counted only where those are the family\'s own points'],
  ]), '');
  L.push('Conditions, as a certain effect (then × 65% if it rides a hit, × 50% if the target saves):', '');
  L.push(...table(['Condition', 'Worth (plain attacks)', 'Why'], Object.entries(COND).map(([id, [v, why]]) => [id.replace(/_/g, ' '), num(v), why])), '');
  L.push('What the conversion does **not** price, on purpose: ammunition, Heat, MP, Strain, charge, Flux, cores, Devotion and supplies. They are in the "Other costs" column of every row, and they are the real price of magic and prayer: a spell that looks cheap in AP is paid in those. Position, information and a Narrator\'s judgement have no worth here either.', '');

  // ---- the check against the game
  L.push('## Checked against the game (11 Nov 2026)', '', 'A second pass played 46 of these rows in the engine (the real rules, forced dice where a hit was needed) and read the code that runs them: AP before and after, the resource spent, the damage against the same weapon\'s plain attack.', '');
  L.push(...table(['Family', 'Rows played', 'Result'], [
    ['Techniques', 'Guard, Cut, Coup, Break, Flurry, Sweep, Cleave, Shot, Burst, Suppress, Mag Dump, Last Round, Dead Centre, Lob', 'AP, Momentum and rounds as listed. Three rows were wrong and are fixed: Last Round (its +50% belongs to revolvers; the rifle gets +3 to hit only), Burst and Flurry (the test weapons roll 3 times, not 2: the engine\'s card is now the damage for every technique that rolls)'],
    ['Class moves', 'Brace, Draw Fire, Finisher, Lunge, Shove, Triage, Stim Throw, Rally, Will Shield, Judgement, Killzone, Mark, Silver Tongue', 'AP and costs as listed. Will Shield was priced with Empathy the Guardian does not have (30 HP, not 51). Judgement costs 10 Devotion XP, which is a fraction of a level, not a level. Rally does not heal the Bard'],
    ['Perk actions', 'Earthbreaker, Supreme Command, Bone Talk, Vanishing Act; the AP perks read in code', 'Earthbreaker has no attack roll and no save: it was under-priced, and is now 2 certain hits'],
    ['Calls', 'Rally, Brief, Order (code and data, all three steps)', 'As listed. An Order spends the ally\'s reaction: now counted in its price. Rally and Brief count in the ally\'s +3 AP a turn'],
    ['Sigil magic', 'FIRE + SEEK, FIRE + CONDENSE + SEEK, SPARK + SEEK, WARD + SEEK, MEND + SEEK, BIND + SEEK, QUICKEN + SEEK, Vent, core swap', 'Every sample spell was wrong on price: the walk between glyphs was missing (1 AP for a 2-glyph Line at Agility 4), fire damage missed the Elemental multiplier (65, not 51), heals were multiplied by Empathy a Sigil caster does not have (WARD 51, not 87), and the 4-glyph Line cannot be cast at these points. All fixed'],
    ['Soul magic', 'Begin, Pump (the free first one and Empathy\'s), Release, a heal at stage 0, Control at stage 0, Syphon', 'As listed'],
    ['Prayers', 'Whisper: Luck, Hymn II: Lightning Rod (and the wait before the next Hymn)', 'As listed: 68 and 33 damage with no roll for 3 AP at Faith 4'],
    ['Basic actions', 'Speed and tactical reload, walking and sprinting at Agility 4, prone, Shove, Analyze, Overwatch, an attempt', 'As listed. Walking is paid in whole AP: one tile costs 1 AP and leaves 1.5 tiles in hand'],
  ]), '');
  L.push('What the check added: the 25 feelings, the basic Brace, loading loose rounds, attacking with both hands, reading a glyph, spending an Echo, and the pair "Throw, then Pull Out". What it took out of the two top lists, and why: rows that wait for a trigger (Riposte, Keep Back, Overwatch, Killzone, Cover Me) are no longer flagged, because their worth depends on how often the trigger comes, which only the fight simulator can measure; Throw and Pull Out are one play and are judged as the pair; a Hymn that stands a Downed ally up is not priced by its 14 HP.', '');
  // ---- could not be read
  L.push('## Could not be read, or the data and the engine disagree', '');
  if (problems.length) problems.forEach((p, i) => L.push(i + 1 + '. ' + p)); else L.push('Nothing.');
  L.push('');

  // ---- the full table
  L.push('## The full table', '', 'One row per action. **AP** is the number on the action\'s own card where the engine has one. **Worth** is in plain attacks. **Against the yardstick**: 1.0× means it pays exactly half an attack per AP of full price. "Part priced" means part of what it does has no number, so it is never flagged. For techniques, "The engine\'s card" is what the game itself showed in a test fight (a sabre against three soldiers next to you; a service rifle against three soldiers 4 tiles off, the first one Pressed; 2 Momentum, 2 Guard). Where that card shows one attack roll, its damage is the one used.', '');
  for (const t of tops) {
    L.push('### ' + t, '');
    for (const fam of fams.filter((f) => top(f) === t)) {
      const rs = rows.filter((r) => r.fam === fam);
      if (fam !== t) L.push('**' + fam.split(' · ').slice(1).join(' · ') + '**', '');
      const hasEngine = rs.some((r) => r.engine);
      L.push(...table(['Action', 'AP', 'Other costs', 'How often', 'What it buys', 'Currency', 'Worth', 'How it was priced', 'Against the yardstick', 'Flag', ...(hasEngine ? ['The engine\'s card'] : []), 'Read from', 'Note'],
        rs.map((r) => [r.name, r.ap, r.price, r.limit, r.buys, r.cur, r.v == null ? '' : num(r.v), r.how, perApCell(r), flagCell(r), ...(hasEngine ? [r.engine || ''] : []), r.from, r.note || ''])), '');
    }
  }
  return L.join('\n') + '\n';
}

describe('the action price list', () => {
  it('builds the table', () => {
    Y = yardstick(); REF = reference();
    expect(Y.hit).toBeGreaterThan(0); expect(Y.enemyHit).toBeGreaterThan(0);
    plainAttacks(); techniqueRows(); callRows(); classRows(); itemRows(); coreRows(); sigilRows(); soulRows(); prayerRows();
    rows.forEach(derive);
    const sources = apSources(), givers = codeApGivers();
    // every list in the data is in the table
    expect(rows.filter((r) => r.fam.startsWith('Technique')).length).toBe(A.TECHNIQUES.length);
    expect(rows.filter((r) => r.fam.startsWith('Call ·') && /step/.test(r.name)).length).toBe(A.CALLS.reduce((t: number, c: any) => t + c.steps.length, 0));
    expect(rows.filter((r) => r.fam.startsWith('Class move')).length).toBe(A.CLASSES.reduce((t: number, c: any) => t + Object.values(c.ranks).reduce((n: number, v: any) => n + v.moves.length, 0), 0));
    expect(rows.filter((r) => r.fam.startsWith('Plain attack')).length).toBe(A.WEAPONS.length);
    expect(rows.filter((r) => r.fam.startsWith('Sigil magic · words')).length).toBe(A.SIGILS.length);
    for (const r of rows) { expect(r.fam && r.name && r.ap !== undefined).toBeTruthy(); if (r.flag) expect(r.v).not.toBeNull(); }
    expect(sources.length).toBeGreaterThan(20);
    const md = report(sources, givers);
    expect(md).toContain('## The full table');
    if (process.env.PRICE_LIST_OUT) writeFileSync(process.env.PRICE_LIST_OUT, md);
  });
});
