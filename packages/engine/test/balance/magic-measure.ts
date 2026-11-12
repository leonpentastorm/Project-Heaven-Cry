// @ts-nocheck (a measuring tool; see magic-measure.test.ts)
// The magic step of the balance pass (rules 1.17): what a Sigil Line and an Outburst are worth against the plain rifle,
// on the simulator's shooting range (sim.ts: a target with a Soldier's numbers at the character's level and 5,000 HP
// that never acts). One row is one PATTERN, played for 8 turns by the policy held to it:
//   Sigil      Lines of exactly 2, 3 or 4 glyphs (drawn walking away from the target, Evoked from the last glyph)
//   Outburst   released at exactly stage 0, 1, 2, 3 or 4 with plain Pumps; stage 4 with the best feeling in every Pump
//              (all 25 felt); and steady play (the policy itself, with the feelings a new caster has)
// What is printed for each: the damage of one cast (misses counted: total spell damage ÷ casts), the turns and AP one
// cast took (turns played ÷ casts: a cast that needs 8 AP takes 1.33 turns), the Strain it added, and the cast as a
// percent of what the plain rifle (normal share, same level) deals over those same turns. That percent is the same
// number as "spell damage a turn ÷ rifle damage a turn".
import { runCell, freshFight } from './sim';
import { BUILD } from './builds';

export const M_LEVELS = [1, 3, 6, 9, 12, 20];
const r1 = (n: number) => Math.round(n * 10) / 10, pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
const sumIf = (o: Record<string, number>, re: RegExp) => Object.entries(o || {}).filter(([k]) => re.test(k)).reduce((n, [, v]) => n + v, 0);

export interface Row { what: string; level: number; variant: string; casts: number; perCast: number; turnsPerCast: number; apPerCast: number; strainPerCast: number; spellPerTurn: number; allPerTurn: number; bigHit: number; bigWhat: string; pctRifle: number; pctAll: number; pctOwnRifle: number; errors: number; note?: string }
export interface Yard { level: number; normal: number; allin: number }

/** The plain rifle's damage a turn on the range (normal share and all in). */
export function rifle(level: number, n: number): Yard {
  const f = (v: string) => { const c = runCell({ build: 'plain_gun', variant: v as any, level }, 'sim_range_soldier', 'open', n, { maxRounds: 8, tag: 'mm' }); return c.dmg / Math.max(1, c.turns); };
  return { level, normal: f('normal'), allin: f('allin') };
}
/** One pattern, n fights of 8 turns. `cast` matches the labels of the action that lands the spell. */
export function pattern(what: string, build: string, variant: string, level: number, n: number, opts: any, cast: RegExp, y: Yard, tier = 'sim_range_soldier', rounds = 8): Row {
  const c = runCell({ build, variant: variant as any, level, ...(opts ? { opts } : {}) }, tier, 'open', n, { maxRounds: rounds, tag: 'mm' + rounds });
  const casts = sumIf(c.actions, cast), spell = c.dmg - c.attackDmg, ap = (c.apSpent.setup || 0) + (c.apSpent.spell || 0);
  const strain = c.res?.strain?.earned || 0;
  return { what, level, variant, casts: r1(casts / c.n), perCast: casts ? r1(spell / casts) : 0, turnsPerCast: casts ? Math.round((c.turns / casts) * 100) / 100 : 0, apPerCast: casts ? r1(ap / casts) : 0, strainPerCast: casts ? r1(strain / casts) : 0,
    spellPerTurn: r1(spell / Math.max(1, c.turns)), allPerTurn: r1(c.dmg / Math.max(1, c.turns)), bigHit: c.bigHit, bigWhat: c.bigHitWhat,
    pctRifle: pct(spell / Math.max(1, c.turns), y.normal), pctAll: pct(c.dmg / Math.max(1, c.turns), y.normal), pctOwnRifle: pct(spell / Math.max(1, c.turns), y[variant]), errors: c.errors };
}
export const SIGIL_PATTERNS = [2, 3, 4].map((g) => ({ what: g + ' glyphs', opts: { glyphs: g } }));
export const OUTBURST_PATTERNS = [
  ...[0, 1, 2, 3, 4].map((s) => ({ what: 'stage ' + s + ', plain Pumps', opts: { stage: s } })),
  { what: 'stage 4, best feelings', opts: { feel: true, feelings: 'all' } },
  { what: 'steady play (a new caster: Rage and Love)', opts: null },
  { what: 'steady play (the early feelings)', opts: { feelings: 'early' } },
  { what: 'steady play (all 25 feelings)', opts: { feelings: 'all' } },
  // the peak: from a quiet heart, everything poured in. Rules 1.19: one free Pump a turn, so it takes the whole turn; a caster that
  // steps into reach first Releases on turn 2 and the row is over both turns (measureLevel notes it).
  { what: 'THE PEAK: the biggest Release, one turn', opts: { feel: true, feelings: 'all' }, rounds: 1, n: 10 },
  { what: 'the biggest Release with the early feelings, one turn', opts: { feel: true, feelings: 'early' }, rounds: 1, n: 10 },
];
/** The feelings a caster has usually felt after a session or two (their triggers are everyday: a quiet heart, an enemy's
 * hit, a natural 20 or 1, a heavy hit, an Elite, an ally Down). */
export const EARLY_FEELINGS = ['rage', 'love', 'calm', 'spite', 'joy', 'shame', 'fear', 'grief'];
export function measureLevel(level: number, variant: string, n: number, log: (s: string) => void = () => {}) {
  const y = rifle(level, n); log('rifle L' + level + ' ' + r1(y.normal) + ' / all in ' + r1(y.allin));
  const sig = SIGIL_PATTERNS.map((p) => { const r = pattern(p.what, 'sigil', variant, level, n, p.opts, /^Evoke /, y); log('sigil ' + variant + ' L' + level + ' ' + line(r)); return r; });
  const out = OUTBURST_PATTERNS.map((p: any) => { let r = pattern(p.what, 'outburst', variant, level, n * (p.n || 1), p.opts, /^Release /, y, 'sim_range_soldier', p.rounds || 8);
    // a one-turn peak that could not be cast in turn 1 (the caster had to walk into reach first): the same over two turns
    if (p.rounds === 1 && !r.casts) { r = pattern(p.what, 'outburst', variant, level, n * (p.n || 1), p.opts, /^Release /, y, 'sim_range_soldier', 2); r.note = 'two turns: it walks into reach first'; } log('outburst ' + variant + ' L' + level + ' ' + line(r)); return r; });
  return { level, variant, rifle: y, sigil: sig, outburst: out };
}
export const line = (r: Row) => r.what + ': ' + (r.casts ? r.perCast + ' a cast · ' + r.turnsPerCast + ' turns · ' + r.apPerCast + ' AP · Strain ' + r.strainPerCast + ' · ' + r.pctRifle + '% of the rifle (with the sidearm ' + r.pctAll + '%; of its own share\'s rifle ' + r.pctOwnRifle + '%) · biggest hit ' + r.bigHit : 'out of reach (no cast in 8 turns)') + (r.errors ? ' · ERRORS ' + r.errors : '');

/** Hits to kill: the biggest Evoke of a 4-glyph Line (the best seen in n fights, a critical included when one fell)
 * against each tier's HP at the character's level. Rule: an Elite and a Boss are never taken out by one. */
export function sigilVsTiers(level: number, variant: string, n: number, glyphs = 4) {
  const out: any = { level, variant };
  for (const tier of ['minion', 'soldier', 'elite', 'boss']) {
    const st = freshFight({ build: 'sigil', variant: variant as any, level }, tier, 'MMT'), foe = st.g.combat.units.find((q: any) => q.side === 'foe');
    const c = runCell({ build: 'sigil', variant: variant as any, level, opts: { glyphs } }, tier, 'open', n, { maxRounds: 8, tag: 'mmt' });
    const big = c.bigAction?.dmg || c.bigHit || 0, casts = sumIf(c.actions, /^Evoke /), avg = casts ? (c.dmg - c.attackDmg) / casts : 0;
    out[tier] = { hp: foe.maxHp, armour: foe.armour, def: foe.def, biggest: big, biggestWhat: c.bigAction?.what || c.bigHitWhat, avgCast: r1(avg), castsToKillAvg: avg ? r1(foe.maxHp / avg) : null, hitsToKillBiggest: big ? Math.ceil(foe.maxHp / big) : null };
  }
  return out;
}
export function table(rows: Row[][], head: string[]): string {
  // rows[pattern][level]
  let s = '| Pattern | ' + head.join(' | ') + ' |\n|---|' + head.map(() => '---').join('|') + '|\n';
  for (const r of rows) s += '| ' + r[0].what + ' | ' + r.map((c) => (c.casts ? c.perCast + ' · ' + c.turnsPerCast + ' t · ' + c.apPerCast + ' AP' + (c.strainPerCast ? ' · S' + c.strainPerCast : '') + ' · **' + c.pctRifle + '%**' + (c.note ? ' (' + c.note + ')' : '') : 'out of reach')).join(' | ') + ' |\n';
  return s;
}
void BUILD;
