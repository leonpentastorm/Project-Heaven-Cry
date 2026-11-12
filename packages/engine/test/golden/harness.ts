// @ts-nocheck (a recording tool: it drives the engine's own rules and is checked by golden-damage.test.ts)
// THE GOLDEN TABLES of the damage-formula migration (docs/design/proposals/2026-11-unified-damage.md, stage (a), step
// a0). What the engine does today, action by action, exact: every amount an action produces and every amount that
// lands. This file is the harness (the tap, the fight, the dice); record.ts lists the actions.
//
// HOW AN ACTION IS READ. Nothing in the engine is changed or wrapped: the numbers are read from the hooks every item
// already listens on, and from the units before and after.
//   o:<type>/<mode>:<base>+<flat>x<own mults>v<target bonuses>   'damage_out' (the amount before armour; pv = a preview)
//   i:<unit>:<type>/<damage type>:<n>                            'damage_in', phase 'reduce' (after armour and the
//                                                                derived and item reductions, before the shield)
//   h:<unit>:<kind>:<n>   's:<unit>:<n>'                         'heal_in' and 'shield_grant' (after the receiver's multiplier)
//   then, after '=>', what changed on each unit: hp, shield, Downed, dead.
// Units are named by their place in the fight (P1, P2… the squad; F1, F2… the enemy; X… anything made in the fight).
//
// WHAT KEEPS IT STILL. Every fight is seeded; attack dice are forced ('attack_roll'); spell rolls are given +100 to
// hit ('spell_roll') and their natural die comes from a seed chosen for it; the enemy AI never acts (every enemy action
// is skipped at 'enemy_action_start', as the simulator's range target does), so a change to WHO an enemy picks cannot
// move a number here: every action is a fixed attacker on a fixed target.
import * as E from '../../src';
import { onHook, bindGame } from '../../src/effects/hooks';
import { fightWith } from '../helpers/perkfight';

export const A: any = E;
export const W = <T>(g: any, f: () => T): T => { const was = bindGame(g); try { return f(); } finally { bindGame(was); } };

// ---------- the dice ----------
export const DICE: { die?: number; hit?: boolean; spell?: boolean } = {};
/** Run f with forced attack dice ({die: 10, hit: true}: a plain hit; {die: 20}: a critical) and sure spell rolls. */
export function dice<T>(d: { die?: number; hit?: boolean; spell?: boolean } | null, f: () => T): T {
  const was = { ...DICE }; for (const k of Object.keys(DICE)) delete DICE[k]; Object.assign(DICE, d || {});
  try { return f(); } finally { for (const k of Object.keys(DICE)) delete DICE[k]; Object.assign(DICE, was); }
}
export const HIT = { die: 10, hit: true, spell: true }, CRIT = { die: 20, spell: true };
/** An RNG state whose next d20 is n (a spell's natural 20 cannot be forced through a hook). */
const ROLL_STATE: Record<number, number> = {};
export function rollState(n: number): number {
  if (ROLL_STATE[n]) return ROLL_STATE[n];
  for (let s = 1; s < 400000; s++) { if (A.d20({ state: s }) === n) return (ROLL_STATE[n] = s); }
  throw new Error('no seed rolls ' + n);
}

/** A stand-in for an item on 'damage_out' (see the hook below): bend({add, mults, vs}, f) runs f with it on. It pins
 * the order in which an amount is multiplied when own multipliers and target bonuses are both there. */
export const BEND: { on?: boolean; add?: number; mults?: number[]; vs?: number[] } = {};
export function bend<T>(b: { add?: number; mults?: number[]; vs?: number[] }, f: () => T): T { Object.assign(BEND, { add: 0, mults: [], vs: [] }, b, { on: true }); try { return f(); } finally { BEND.on = false; } }
/** A second reading of the same actions (the rules tables of engine foundations 1: test/golden/rules.ts). When set,
 * act() and run() return its line in place of the damage line: `snap` before the action, `line` after it (`again`
 * replays the action from another seed), `one` reads one replay. Unset (the default), nothing here changes. */
export const ALSO: { /** the seed of a replay (record.ts's own closures set the seed themselves) */ seed?: number; snap?: (cb: any) => any; line?: (before: any, cb: any, seed: number, rngAfter: number, again: (seed: number) => string) => string; one?: (before: any, cb: any, seed: number, rngAfter: number) => string } = {};
// ---------- the tap ----------
let TAP: string[] | null = null, TAP_CB: any = null;
const n3 = (v: any) => (typeof v === 'number' && Number.isFinite(v) ? String(Math.round(v * 1000) / 1000) : String(v));
export function label(cb: any, u: any): string {
  if (!u || !cb) return '?';
  const side = cb.units.filter((x: any) => x.side === u.side && !x.companion && !x.summoned), i = side.indexOf(u);
  return i >= 0 ? (u.side === 'pc' ? 'P' : 'F') + (i + 1) : 'X' + (cb.units.indexOf(u) + 1);
}
if (!(globalThis as any).__goldenTap) {
  (globalThis as any).__goldenTap = true;
  onHook('attack_roll', (ctx: any) => { if (DICE.die != null) ctx.die = DICE.die; if (DICE.hit != null) ctx.hit = DICE.hit; });
  onHook('spell_roll', (ctx: any) => { if (DICE.spell) ctx.add = (ctx.add || 0) + 100; });
  onHook('enemy_action_start', (ctx: any) => { ctx.skip = true; if (ctx.u) ctx.u.ap = 0; });
  onHook('damage_out', (ctx: any) => {
    // a stand-in for an item (test only): flat damage, own multipliers and target bonuses put on the amount as a perk would
    if (BEND.on && !ctx.preview) { if (BEND.add) ctx.add += BEND.add; for (const v of BEND.mults || []) ctx.mults.push({ v, label: 'golden' }); for (const v of BEND.vs || []) ctx.vs.push({ v, label: 'golden' }); }
    if (!TAP || ctx.preview) return; // a preview's number is read from the preview itself
    const m = (ctx.mults || []).reduce((t: number, x: any) => t * x.v, 1), v = (ctx.vs || []).reduce((t: number, x: any) => t + x.v, 0);
    TAP.push('o:' + (ctx.src?.type || '?') + '/' + (ctx.mode || '') + ':' + n3(ctx.base) + '+' + n3(ctx.add || 0) + 'x' + n3(m) + 'v' + n3(v)
      + (ctx.pierce ? 'p' + n3(ctx.pierce) : '') + (ctx.ignoreArmour ? 'I' : '') + (ctx.critBonus ? 'c' + n3(ctx.critBonus) : ''));
  });
  onHook('damage_in', (ctx: any, cb: any) => {
    if (!TAP || ctx.phase !== 'reduce') return;
    TAP.push('i:' + label(cb, ctx.t) + ':' + (ctx.src?.type || '?') + '/' + (ctx.src?.dmgType || '') + ':' + n3(ctx.dmg));
  });
  onHook('heal_in', (ctx: any, cb: any) => { if (TAP) TAP.push('h:' + label(cb, ctx.t) + ':' + (ctx.kind || '') + ':' + n3(ctx.n)); });
  onHook('shield_grant', (ctx: any, cb: any) => { if (TAP) TAP.push('s:' + label(cb, ctx.t) + ':' + n3(ctx.n)); });
}
const snap = (cb: any) => cb.units.map((u: any) => ({ u, id: u.id, l: label(cb, u), hp: u.hp, sh: u.shield || 0, downed: !!u.downed, dead: !!u.dead }));
function delta(before: any[], cb: any): string[] {
  const out: string[] = [];
  for (const u of cb.units) {
    const b = before.find((x) => x.id === u.id), l = label(cb, u);
    if (!b) { out.push(l + ' new hp' + u.hp + (u.shield ? ' sh' + u.shield : '')); continue; }
    const p: string[] = [];
    if (b.hp !== u.hp) p.push('hp' + b.hp + '>' + u.hp);
    if (b.sh !== (u.shield || 0)) p.push('sh' + b.sh + '>' + (u.shield || 0));
    if (!b.downed && u.downed) p.push('Downed'); if (!b.dead && u.dead) p.push('dead');
    if (p.length) out.push(b.l + ' ' + p.join(' '));
  }
  for (const b of before) if (!cb.units.some((u: any) => u.id === b.id)) out.push(b.l + ' gone');
  return out;
}
const isRule = (e: any) => e instanceof A.RuleError || e?.name === 'RuleError';
const short = (s: any, n = 90) => String(s?.message ?? s).replace(/\s+/g, ' ').slice(0, n);

/** A copy of the game to act on (the campaign's own data is shared: nothing in a fight writes to it). */
export function copy(g: any): any { const { campaign, ...rest } = g; const c = JSON.parse(JSON.stringify(rest)); c.campaign = campaign; return c; }
/** One action through the reducer on a copy of g (g itself is not changed). Returns the line for the table and the new state. */
export function act(g: any, action: any, d: any = HIT, seed = 4242): { line: string; g: any; ok: boolean } {
  const g0 = g; g0.rng.state = seed; // apply() copies the state it is given: g is not changed
  const before = snap(g0.combat); let g1: any = null, err = '';
  const also = ALSO.snap ? ALSO.snap(g0.combat) : null;
  TAP = [];
  try { g1 = dice(d, () => A.apply(g0, action, 'host')); } catch (e: any) { err = (isRule(e) ? 'REFUSED ' : 'THREW ') + short(e); }
  const tap = TAP; TAP = null;
  if (!g1) return { line: err, g: g0, ok: false };
  if (ALSO.line) return { line: ALSO.line(also, g1.combat, seed, g1.rng.state, (s2) => { g0.rng.state = s2; const a2 = ALSO.snap!(g0.combat); try { const g2 = dice(d, () => A.apply(g0, action, 'host')); return ALSO.one!(a2, g2.combat, s2, g2.rng.state); } catch (e: any) { return 'X ' + short(e, 40); } finally { g0.rng.state = seed; } }), g: g1, ok: true };
  // the units of the new state, matched to the old ones by id
  const b2 = before.map((b) => ({ ...b }));
  return { line: (tap.join(' ') + ' => ' + (g1.combat ? delta(b2, g1.combat).join(', ') : 'the fight is over')).trim(), g: g1, ok: true };
}
/** Engine code run directly on a copy of g with the game bound (an enemy's attack, a hazard, a tick). f gets the copy. */
export function run(g: any, f: (g: any, cb: any) => any, d: any = HIT, seed = 4242): { line: string; g: any; ok: boolean; ret?: any } {
  const g0 = copy(g); g0.rng.state = seed;
  const before = snap(g0.combat); let err = '', ret: any;
  const also = ALSO.snap ? ALSO.snap(g0.combat) : null;
  TAP = [];
  try { ret = dice(d, () => W(g0, () => f(g0, g0.combat))); } catch (e: any) { err = (isRule(e) ? 'REFUSED ' : 'THREW ') + short(e); }
  const tap = TAP; TAP = null;
  if (err) return { line: err, g: g0, ok: false };
  if (typeof ret === 'string' && ret) return { line: 'REFUSED ' + short(ret), g: g0, ok: false, ret };
  if (ALSO.line) return { line: ALSO.line(also, g0.combat, seed, g0.rng.state, (s2) => { const g2 = copy(g); g2.rng.state = s2; const a2 = ALSO.snap!(g2.combat); ALSO.seed = s2; try { const r2 = dice(d, () => W(g2, () => f(g2, g2.combat))); return typeof r2 === 'string' && r2 ? 'X ' + short(r2, 40) : ALSO.one!(a2, g2.combat, s2, g2.rng.state); } catch (e: any) { return 'X ' + short(e, 40); } finally { delete ALSO.seed; } }), g: g0, ok: true, ret };
  return { line: (tap.join(' ') + ' => ' + delta(before, g0.combat).join(', ')).trim(), g: g0, ok: true, ret };
}
/** Try an action with each set of arguments in turn; the first the rules accept is the one recorded. */
export function tryAct(g: any, base: any, tries: any[], d: any = HIT, seed = 4242): { line: string; g: any; ok: boolean; args?: any } {
  let first = '';
  for (const t of tries) { const r = act(g, { ...base, ...t }, d, seed); if (r.ok) return { ...r, args: t }; first ||= r.line; if (/^THREW/.test(r.line)) return r; }
  return { line: first || 'REFUSED', g, ok: false };
}

// ---------- the ground and the fight ----------
// 24 × 14 of bare ground: nothing to hide behind, nothing in the way, no objects. Test only.
A.MAPS.golden = { id: 'golden', name: 'Golden ground (test only)', w: 24, h: 14, solid: [], cover: [], full: [], difficult: [],
  pcStart: ['2,5', '2,7', '2,9', '2,3'], foeStart: ['20,1', '20,3', '20,5', '20,7', '20,9', '20,11'] };
export const TIER_WEAPON: Record<string, string> = { vermin: 'beast_bite', minion: 'service_pistol', soldier: 'hellraiser_service_rifle', elite: 'legion_bullpup', boss: 'hellraiser_lmg' };
export const TIERS = ['vermin', 'minion', 'soldier', 'elite', 'boss'];
export const units = (g: any) => g.combat.units as any[];
export const pcs = (g: any) => units(g).filter((u) => u.side === 'pc' && !u.companion);
export const foes = (g: any) => units(g).filter((u) => u.side === 'foe');
export const charOf = (g: any, u: any) => g.characters[u.charId];
/** Tidy a fight that has just begun: nothing on the ground, everyone whole, nobody Hidden, the air Normal. */
export function tidy(g: any) {
  const cb = g.combat; cb.objects = []; if (cb.piles) cb.piles = Array.isArray(cb.piles) ? [] : {};
  for (const u of cb.units) { u.hp = u.maxHp; u.shield = 0; u.hidden = false; }
  return g;
}
/** Make it this unit's turn (beginTurn with the game bound: its AP and turn_start hooks), with AP to spare. */
export function turn(g: any, u: any, ap = 9) {
  const cb = g.combat; cb.turn = cb.order.indexOf(u.id); delete cb.window;
  W(g, () => A.beginTurn(cb, g.rng)); u.ap = ap; return u;
}
/** A fight on the golden ground from finished characters (the reference builds), through the reducer. */
export function fightOf(chars: any[], foeSpecs: { tier: string; weapon?: string; level?: number; name?: string }[], o: { level?: number; seed?: string } = {}) {
  let g = A.newGame(o.seed || 'GOLDEN', { id: 'host', name: 'Host' });
  chars.forEach((c, i) => { c.id = 'c' + (i + 1); c.owner = 'host'; c.name = c.name || 'PC ' + (i + 1); g.characters[c.id] = c; });
  g = A.apply(g, { type: 'session/start' }, 'host');
  g = A.apply(g, { type: 'narrator/turn', turn: { narration: 'The record begins.', sceneTitle: 'Golden' } }, 'host');
  g = A.apply(g, { type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'Golden fight', map: 'golden', difficulty: 'standard', ...(o.level != null ? { level: o.level } : {}),
    enemies: foeSpecs.map((f, i) => ({ name: f.name || f.tier[0].toUpperCase() + f.tier.slice(1) + ' ' + (i + 1), tier: f.tier, weapon: f.weapon || TIER_WEAPON[f.tier] || 'service_pistol', no_surrender: true, ...(f.level != null ? { level: f.level } : {}) })) } } }, 'host');
  return tidy(g);
}
/** A fight on the golden ground from character specs (test/helpers/perkfight.ts: skills, perks, traits, class set by hand). */
export function fightSpec(specs: any[], foeSpecs: { tier?: string; weapon?: string; level?: number; name?: string }[], o: { level?: number; seed?: string } = {}) {
  const f = fightWith(specs, foeSpecs.map((x) => ({ tier: x.tier || 'soldier', weapon: x.weapon || TIER_WEAPON[x.tier || 'soldier'], ...(x.level != null ? { level: x.level } : {}), ...(x.name ? { name: x.name } : {}) })), { map: 'golden', seed: o.seed || 'GOLDEN', ...(o.level != null ? { level: o.level } : {}) });
  return tidy(f.g);
}
/** Stand units: place(g, [[unit, '3,5'], …]); everyone not named goes to the far corner rows, apart from each other. */
export function place(g: any, at: [any, string][]) {
  const named = new Set(at.map(([u]) => u.id)); let k = 0;
  for (const u of units(g)) if (!named.has(u.id)) { u.pos = (4 + 3 * (k % 6)) + ',' + (k < 6 ? 13 : 0); k++; }
  for (const [u, p] of at) u.pos = p;
}
export const isMeleeW = (id: string) => !!A.WEAPON[id] && A.meleeArm(A.WEAPON[id]);
/** A plain attack made directly (previewAttack, then resolveAttack: what the reducer's combat/attack does), on a copy. */
export function strike(g: any, uId: string, tId: string, mode: string, d: any = HIT, seed = 4242) {
  return run(g, (g2, cb) => {
    const u = cb.units.find((x: any) => x.id === uId), t = cb.units.find((x: any) => x.id === tId), pv = A.previewAttack(cb, u, t, mode);
    if (!pv.ok) return pv.why || 'Refused';
    const r = A.resolveAttack(cb, g2.rng, u, t, mode, u.charId ? g2.characters[u.charId] : null); return r.refused || null;
  }, d, seed);
}
/** A technique used directly (useTechnique: what the reducer's combat/technique does), on a copy. */
export function useTech(g: any, uId: string, id: string, args: any, d: any = HIT, seed = 4242) {
  return run(g, (g2, cb) => A.useTechnique(cb, cb.units.find((x: any) => x.id === uId), id, { ...args }, g2.rng), d, seed);
}
