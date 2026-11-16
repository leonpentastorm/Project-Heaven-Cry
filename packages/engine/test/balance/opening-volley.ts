// @ts-nocheck (a measuring tool, like the rest of test/balance)
// THE OPENING VOLLEY (docs/design/proposals/2026-11-party-fit.md, "The opening volley"; the lead's note, items 1, 5, 6).
// Measures only; it changes no rule and no number. Two instruments:
//
// 1. ROWS (`rowTable`): one enemy turn against a level-1 character, through the reducer. A fight is opened in the
//    story's own way (sim.ts startFight) with one foe of a row (tier + weapon, or a caster), on seeds where the
//    character has the first turn; the two are placed (test staging, as sim.ts plainPreview does), the character ends
//    its turn (combat/end-turn) and the enemy AI plays its own turn. Counted on the hook bus: the attack rolls, hits,
//    crits, damage. Stances: `open` (bare ground), `half` (a crate beside the character, between it and the foe),
//    `full_beside` (a pillar beside the character, diagonally in front: nearer the foe than the character, but not on
//    the straight line between them), `full_line` (a pillar on the line: the foe has no line of sight and must move).
// 2. RUNS (`openingRun`): Survival's stage 1 for a party (survival-run.ts simRun, the doors' policies), every enemy attack
//    roll on a character recorded with what the character stood next to at that moment (engine's coverTileFor, the
//    pillars beside it, the tiles the client draws), who rolled it (gun, melee, caster; tier, weapon), the die, the
//    round, whether the character had had a turn yet; Downs from full HP between two of the victim's own turns, and
//    who did it; the opening's geometry at combat_start (initiative, the tiles to the nearest tile that no gun foe can
//    shoot without cover, per Agility 1, 3, 5); the targets the foes chose and why. Lever `cover`: a policy wrapper that
//    walks to such a tile first every turn when a visible gun foe has a clean shot (what a human does), then plays.
import { onHook } from '../../src/effects/hooks';
import { apply, bindGame, ENEMY, OBJ, litAt, fightSight, WEAPON, MAPS, isMelee, dist, coverTileFor, nextToCover, lineOfSight, paths, apForTiles, objectsOf, coverKind, unitSees, sideSeesUnit, coverFor, sightBlockers, standable, CASTER, HEART_CASTER, previewAttack } from '../../src';
import svJ from '../../../../data/survival.json';
import techJ from '../../../../data/techniques.json';
import { Rec } from '../helpers/replay';
import { simRun, PARTIES } from './survival-run';
import { POLICIES } from './policies';
import { startFight, yardPc } from './sim';
import './door-policies';
import { CELLS } from './party-fit';
void CELLS;

const env = (globalThis as any).process?.env || {};
const pcOf = (u: any) => u && u.side === 'pc' && !u.companion;
const gunArmed = (u: any) => { const w: any = WEAPON[u.weapon]; return !!w && !isMelee(w) && !!w.ammo; };
const foeKind = (u: any) => (!u ? 'other' : u.caster ? 'caster' : gunArmed(u) ? 'gun' : 'melee');
const xy = (k: string) => k.split(',').map(Number);
const adj = (a: string, b: string) => { const [ax, ay] = xy(a), [bx, by] = xy(b); return Math.max(Math.abs(ax - bx), Math.abs(ay - by)) === 1; };
/** What the target stands next to, seen from the shooter: 'half' (the engine counts a half-cover tile: −5), 'full_beside'
 * (a pillar beside it, nearer the shooter than the target, that the line misses: nothing counts), 'wrong_side' (cover
 * beside it, none facing the shot), 'open'. */
export function coverClass(cb: any, from: string, to: string): string {
  const cf = coverFor(cb, from, to); if (cf) return cf.grade; // rules 1.57 item 4560: the one cover rule (half or full counted)
  const far = dist(from, to), near = objectsOf(cb).filter((o: any) => coverKind(o) && adj(o.pos, to));
  if (near.some((o: any) => coverKind(o) === 'full' && dist(from, o.pos) < far)) return 'full_beside';
  return near.length ? 'wrong_side' : 'open';
}

// ------------------------------------------------------------------------------------------- 1. the rows
const W = <T>(g: any, f: () => T): T => { const was = bindGame(g); try { return f(); } finally { bindGame(was); } };
// test-only grounds (as sim.ts registers sim_open): bare 26 x 26 with one crate or one pillar
const PC_AT = '10,12', FOE_AT = '16,12';
const base = { w: 26, h: 26, solid: [], difficult: [], pcStart: [...MAPS.yard.pcStart], foeStart: [...MAPS.yard.foeStart] };
MAPS.ov_open = { ...base, id: 'ov_open', name: 'ov open', cover: [], full: [] };
MAPS.ov_half = { ...base, id: 'ov_half', name: 'ov half', cover: ['11,12'], full: [] };
MAPS.ov_full_beside = { ...base, id: 'ov_full_beside', name: 'ov full beside', cover: [], full: ['11,11'] };
MAPS.ov_full_line = { ...base, id: 'ov_full_line', name: 'ov full line', cover: [], full: ['11,12'] };
// the line-of-sight asymmetry: a pillar two tiles up-left of the character, the foe at FOE_ASYM (its line in is clear, the line back is not)
MAPS.ov_asym = { ...base, id: 'ov_asym', name: 'ov asym', cover: [], full: ['8,10'] };
const FOE_ASYM = '6,9';
let ROW_ON = false; const ROW: any = { rolls: 0, hits: 0, crits: 0, dmg: 0, moved: 0 };
onHook('attack_roll', (ctx: any) => { if (ROW_ON && pcOf(ctx.tgt) && ctx.att?.side !== 'pc') ROW.rolls++; });
onHook('on_hit', (ctx: any) => { if (ROW_ON && pcOf(ctx.tgt) && ctx.att?.side !== 'pc') { ROW.hits++; if (ctx.crit) ROW.crits++; } });
/** Two enemy turns of a row against the target build, over `n` seeds, on a stance (the character stands still and ends
 * its turns). `armour`: the character's armour for the staging (the Survival camp's, read from the runs). Per turn:
 * rolls, hits, crits, damage; and whether the foe moved. */
export function rowTurn(row: { tier: string; weapon?: string; caster?: string }, stance: string, n: number, o: { pc?: any; armour?: number; turns?: number; count?: number } = {}) {
  const NF = o.count || 1, AT = [FOE_AT, '16,10', '16,14', '15,8'];
  const pc = o.pc || yardPc(1), K = o.turns || 2, T = () => ({ rolls: 0, hits: 0, crits: 0, dmg: 0, moved: 0, downs: 0, fromFullDown: 0 });
  const out: any = { seeds: 0, hp: 0, def: 0, armour: 0, atk: 0, need: 0, pct: 0, turn: Array.from({ length: K }, T) };
  const c = row.caster ? CASTER[row.caster] || HEART_CASTER[row.caster] : null;
  for (let i = 0, ok = 0; ok < n && i < n * 20; i++) {
    const map = 'ov_' + stance;
    let st: any; try { st = startFight({ pcs: [pc], foes: Array.from({ length: NF }, () => ({ tier: c ? c.tier : row.tier, weapon: c ? c.weapon : row.weapon })), map: 'open', seed: 'OV-' + row.tier + '-' + (row.weapon || row.caster) + '-' + (NF > 1 ? NF + 'x-' : '') + i }, false); } catch { continue; }
    const open = JSON.parse(JSON.stringify(st.open)); open.turn.combat.map = map; if (c) for (const e of open.turn.combat.enemies) e.caster = row.caster;
    let g = st.g; g = apply(g, open, 'host');
    const cb = g.combat, u = cb.units.find((q: any) => pcOf(q)), t = cb.units.find((q: any) => q.side === 'foe');
    if (!cb || cb.round !== 1 || cb.turn !== 0 || cb.order[0] !== u.id || u.hp !== u.maxHp) continue;
    ok++; out.seeds++; u.pos = PC_AT; cb.units.filter((q: any) => q.side === 'foe').forEach((q: any, j: number) => { q.pos = AT[j]; q.hidden = false; }); if (o.armour != null) u.armour = o.armour;
    out.hp = u.maxHp; out.def = u.def; out.armour = u.armour || 0;
    if (!row.caster) { const pv = W(g, () => previewAttack(cb, Object.assign({}, t, { ap: 6 }), u, isMelee(WEAPON[t.weapon]) ? 'melee' : 'shot')); if (pv.ok) { out.atk = pv.toHit; out.need = pv.need; out.pct = pv.pct; } }
    for (let k = 0; k < K; k++) {
      const c1 = g.combat; if (!c1 || c1.over) break; const u1 = c1.units.find((q: any) => q.id === u.id), t1 = c1.units.find((q: any) => q.id === t.id); if (!u1 || !t1 || u1.downed || u1.dead || t1.dead) break;
      if (c1.order[c1.turn] !== u1.id) break;
      const hp0 = u1.hp, full = u1.hp >= u1.maxHp, pos0 = t1.pos; Object.assign(ROW, { rolls: 0, hits: 0, crits: 0 });
      ROW_ON = true; try { g = apply(g, { type: 'combat/end-turn', unitId: u1.id }, 'host'); } finally { ROW_ON = false; }
      const u2 = g.combat?.units.find((q: any) => q.id === u.id) || u1, t2 = g.combat?.units.find((q: any) => q.id === t.id), R = out.turn[k];
      R.rolls += ROW.rolls; R.hits += ROW.hits; R.crits += ROW.crits; R.dmg += Math.max(0, hp0 - Math.max(0, u2.hp)); if (u2.downed || u2.dead || u2.hp <= 0) { R.downs++; if (full) R.fromFullDown++; } if (t2 && t2.pos !== pos0) R.moved++; R.left = (R.left || 0) + Math.max(0, u2.hp) / u2.maxHp;
    }
  }
  return out;
}
/** The fight log of one staged case (the first seed from `skip` on where the character has the first turn): the
 * character stands at PC_AT and ends two turns; what the foe does, and the preview of its shot at that moment. */
export function caseLog(row: { tier: string; weapon: string }, stance: string, skip = 0, armour = 5): string[] {
  const out: string[] = [];
  for (let i = 0, ok = 0; i < 400; i++) {
    const st: any = startFight({ pcs: [yardPc(1)], foes: [{ tier: row.tier, weapon: row.weapon }], map: 'open', seed: 'OV-' + row.tier + '-' + row.weapon + '-' + i }, false);
    const open = JSON.parse(JSON.stringify(st.open)); open.turn.combat.map = 'ov_' + stance; let g = apply(st.g, open, 'host');
    const cb = g.combat, u = cb.units.find((q: any) => pcOf(q)), t = cb.units.find((q: any) => q.side === 'foe');
    if (cb.round !== 1 || cb.turn !== 0 || cb.order[0] !== u.id) continue; if (ok++ < skip) continue;
    u.pos = PC_AT; t.pos = stance === 'asym' ? FOE_ASYM : FOE_AT; u.armour = armour;
    out.push('seed OV-' + row.tier + '-' + row.weapon + '-' + i + ' · map ' + stance + ' · objects ' + (cb.objects || []).map((o: any) => o.kind + '@' + o.pos).join(', ') + ' · character at ' + PC_AT + ', foe at ' + t.pos);
    out.push('line foe->character ' + lineOfSight(cb, t.pos, u.pos) + ' · line character->foe ' + lineOfSight(cb, u.pos, t.pos) + ' · the fog (fightSight, what the client draws) shows the foe tile: ' + fightSight(cb).tiles.has(t.pos));
    out.push('cover class from the foe: ' + coverClass(cb, t.pos, u.pos) + ' · coverTileFor ' + coverTileFor(cb, t.pos, u.pos) + ' · line of sight ' + lineOfSight(cb, t.pos, u.pos) + ' · preview ' + JSON.stringify((({ toHit, need, pct, cover }) => ({ toHit, need, pct, cover }))(W(g, () => previewAttack(cb, Object.assign({}, t, { ap: 6 }), u, 'shot')))));
    for (let k = 0; k < 2; k++) { const n0 = g.combat.log.length, me = g.combat.units.find((q: any) => q.id === u.id); if (g.combat.order[g.combat.turn] !== me.id) break; g = apply(g, { type: 'combat/end-turn', unitId: me.id }, 'host');
      out.push('-- enemy turn ' + (k + 1) + ':', ...g.combat.log.slice(n0).map((l: any) => '   ' + (typeof l === 'string' ? l : l.text || JSON.stringify(l))).filter((l: string) => !/^\s*$/.test(l))); }
    return out;
  }
  return ['no seed'];
}
/** The stage-1 rows (data/survival.json pools at the first setting; the Boss's and the vault guard's weapons) and the
 * references (melee, a close gun, the casters). */
export function stageOneRows(): { label: string; row: any; kind: string }[] {
  const SV: any = svJ, P = SV.pools, set = SV.settings.find((s: any) => s.id === SV.run.first_setting), out: any[] = [];
  for (const tier of ['minion', 'soldier', 'elite']) for (const w of P[tier].ranged) out.push({ label: tier + ' ' + w, row: { tier, weapon: w }, kind: 'gun' });
  out.push({ label: 'boss ' + set.boss.weapon, row: { tier: 'boss', weapon: set.boss.weapon }, kind: 'gun' });
  for (const tier of ['minion', 'soldier']) for (const w of P[tier].close) if (!isMelee(WEAPON[w])) out.push({ label: tier + ' ' + w + ' (close)', row: { tier, weapon: w }, kind: 'gun' });
  for (const tier of ['minion', 'soldier', 'elite']) for (const w of P[tier].melee) out.push({ label: tier + ' ' + w, row: { tier, weapon: w }, kind: 'melee' });
  for (const k of ['sigil_novice', 'sigil_adept', 'heart_adept']) out.push({ label: k, row: { tier: (CASTER[k] || HEART_CASTER[k]).tier, caster: k }, kind: 'caster' });
  return out;
}

// ------------------------------------------------------------------------------------------- 2. the runs
let ON = false; let PEND: (() => void)[] = []; let CUR: any = null; let FIGHTS: any[] = [];
const fightOf = () => CUR;
onHook('combat_start', (ctx: any) => { if (!ON) return; const cb = ctx.cb; const snap = openingOf(cb); PEND.push(() => { CUR = snap; FIGHTS.push(CUR); }); });
onHook('round_start', (ctx: any) => { if (!ON) return; const cb = ctx.cb, r = ctx.round, hp = Object.fromEntries(cb.units.filter(pcOf).map((u: any) => [u.id, u.hp])); PEND.push(() => { const F = fightOf(); if (F) { F.round = r; F.hpRound = hp; } }); });
onHook('turn_start', (ctx: any) => { if (!ON || !pcOf(ctx.u)) return; const id = ctx.u.id, hp = ctx.u.hp, max = ctx.u.maxHp; PEND.push(() => { const F = fightOf(); if (!F) return; const p = F.pc[id]; if (!p) return; const L = p.mark ? Object.values(p.mark.by).reduce((t: number, v: any) => t + v, 0) as number : 0; if (L > 0) F.win.push({ id, r: F.round, first: p.turns === 0, lost: L / p.max, by: { ...p.mark.by } }); p.turns++; p.mark = { hp, max, by: {} }; }); });
onHook('turn_end', (ctx: any) => { if (!ON || !pcOf(ctx.u)) return; const id = ctx.u.id, hp = ctx.u.hp; PEND.push(() => { const F = fightOf(); if (!F) return; const p = F.pc[id]; if (p) p.mark = { hp, max: p.max, by: {} }; }); });
let LAST: any = null;
onHook('attack_roll', (ctx: any) => {
  if (!ON || !pcOf(ctx.tgt) || !ctx.att || ctx.att.side === 'pc') return;
  const cb = ctx.cb, a = ctx.att, t = ctx.tgt, melee = isMelee(WEAPON[a.weapon]) || ctx.mode === 'melee';
  const rec: any = { tgt: t.id, kind: foeKind(a), tier: a.tier, weapon: a.weapon, mode: ctx.mode, volley: ctx.volley || null, die: ctx.die, toHit: ctx.toHit, need: ctx.need, crit: ctx.die >= ctx.critMin, melee,
    cover: melee ? 'melee' : coverClass(cb, a.pos, t.pos), d: dist(a.pos, t.pos), backBlocked: !melee && !lineOfSight(cb, t.pos, a.pos), from: a.pos, to: t.pos, dark: !!cb.map.dark, litFrom: litAt(cb, a.pos), pcSees: cb.units.some((q: any) => pcOf(q) && unitSees(cb, q, a.pos)), pcShown: sideSeesUnit(cb, 'pc', a), hid: !!a.hidden, shownTo: a.shownTo || null, hit: false, dmg: 0, stopped: true };
  // the choice of target (rules 1.25, enemyRank): was it the nearest standing character, the most hurt, the likeliest hit?
  const alive = cb.units.filter((q: any) => pcOf(q) && !q.dead && !q.downed), sh = (q: any) => q.hp / Math.max(1, q.maxHp);
  if (alive.length > 1) { const dm = Math.min(...alive.map((q: any) => dist(a.pos, q.pos))), hm = Math.min(...alive.map(sh)); rec.alive = alive.length; rec.nearest = dist(a.pos, t.pos) === dm; rec.mostHurt = sh(t) <= hm + 1e-9; rec.fresh = alive.every((q: any) => sh(q) >= 1);
    rec.gap = Math.round(10 * (sh(t) - hm)) / 10; rec.could = alive.filter((q: any) => q === t || (!q.hidden && previewAttack(cb, Object.assign({}, a, { ap: 9 }), q, melee ? 'melee' : 'shot').ok)).length; rec.farther = dist(a.pos, t.pos) - dm; rec.doctrine = a.tier; }
  LAST = rec;
  PEND.push(() => { const F = fightOf(); if (!F) return; rec.r = F.round; const p = F.pc[rec.tgt]; rec.before = p ? p.turns === 0 : false; rec.tgtAg = p?.ag; F.shots.push(rec); });
});
onHook('on_hit', (ctx: any) => { if (!ON || !pcOf(ctx.tgt) || !LAST || LAST.tgt !== ctx.tgt.id) return; LAST.hit = true; LAST.dmg = ctx.dmg || 0; LAST.stopped = false; });
onHook('on_miss', (ctx: any) => { if (!ON || !pcOf(ctx.tgt) || !LAST || LAST.tgt !== ctx.tgt.id) return; LAST.stopped = false; });
onHook('damage_in', (ctx: any) => {
  if (!ON || ctx.phase !== 'after') return; const t = ctx.t, by = ctx.src?.by, d = ctx.dealt || 0; if (!pcOf(t) || d <= 0 || (by && by.side === 'pc')) return;
  const k = foeKind(by), who = by ? (by.tier || '?') + ' ' + k + ' ' + (by.weapon || '') : 'other';
  PEND.push(() => { const F = fightOf(); if (!F) return; F.dmg[k] = (F.dmg[k] || 0) + d; const rk = Math.min(F.round, 3); F.dmgR[rk] = (F.dmgR[rk] || 0) + d; const p = F.pc[t.id]; if (p) { p.dmg += d; if (p.mark) p.mark.by[who] = (p.mark.by[who] || 0) + d; } });
});
onHook('on_downed', (ctx: any) => { if (!ON || !pcOf(ctx.victim)) return; const id = ctx.victim.id;
  PEND.push(() => { const F = fightOf(); if (!F) return; const p = F.pc[id]; if (!p) return; F.downs.push({ id, r: F.round, before: p.turns === 0, fromFull: !!p.mark && p.mark.hp >= p.mark.max, hpMark: p.mark ? p.mark.hp : null, max: p.max, by: p.mark ? { ...p.mark.by } : {}, ag: p.ag }); }); });

/** The opening at combat_start: initiative, distances, the tiles to the nearest tile safe from every gun foe. */
function openingOf(cb: any) {
  const pcs = cb.units.filter(pcOf), foes = cb.units.filter((u: any) => u.side !== 'pc' && !u.companion), guns = foes.filter((f: any) => foeKind(f) === 'gun');
  const walls = sightBlockers(cb), order: string[] = [...(cb.order || [])];
  const safe = (k: string) => guns.every((f: any) => !lineOfSight(cb, f.pos, k, false, walls) || !!coverTileFor(cb, f.pos, k));
  const pc: any = {};
  for (const u of pcs) {
    const P: any = paths(cb, u.pos, u.id); let best = Infinity, bestAdj = Infinity;
    if (safe(u.pos)) best = 0; if (nextToCover(cb, u.pos)) bestAdj = 0;
    for (const [k, tiles] of Object.entries(P.dist || {})) { const n = Number(tiles); if (!(n > 0) || !standable(cb.map, k) || cb.units.some((q: any) => q.pos === k && !q.dead)) continue;
      if (n < best && safe(k)) best = n; if (n < bestAdj && nextToCover(cb, k)) bestAdj = n; }
    const gunsAhead = order.slice(0, Math.max(0, order.indexOf(u.id))).filter((id) => guns.some((f: any) => f.id === id)).length;
    pc[u.id] = { armour: u.armour || 0, def: u.def, ag: (cb.units.find((q: any) => q.id === u.id) as any).agility || 1, max: u.maxHp, safeTiles: best, coverTiles: bestAdj, gunsAhead, foesAhead: order.slice(0, Math.max(0, order.indexOf(u.id))).filter((id) => foes.some((f: any) => f.id === id)).length,
      nearGun: guns.length ? Math.min(...guns.map((f: any) => dist(u.pos, f.pos))) : NaN, turns: 0, dmg: 0, mark: { hp: u.hp, max: u.maxHp, by: {} } };
  }
  return { n: pcs.length, foes: foes.length, guns: guns.length, gunTiers: guns.map((f: any) => f.tier), round: 1, hpRound: {}, pc, shots: [], downs: [], win: [], dmg: {}, dmgR: {}, map: cb.map.w };
}

// the lever `cover`: walk to the nearest tile that no visible gun foe can shoot without cover, first thing each turn
const COVER = { on: false };
const coverWrap = (pol: any) => { const w = (x: any) => {
  if (!COVER.on) return pol(x);
  const key = x.cb.round + ':' + x.cb.turn; if (x.memo.coverAt === key) return pol(x);
  x.memo.coverAt = key;
  const cb = x.cb, u = x.u, guns = x.foes.filter((f: any) => foeKind(f) === 'gun'), walls = sightBlockers(cb);
  const safe = (k: string) => guns.every((f: any) => !lineOfSight(cb, f.pos, k, false, walls) || !!coverTileFor(cb, f.pos, k));
  if (!guns.length || safe(u.pos)) return pol(x);
  const P: any = paths(cb, u.pos, u.id); let best: string | null = null, bn = Infinity;
  for (const [k, tiles] of Object.entries(P.dist || {})) { const n = Number(tiles); if (!(n > 0) || n >= bn || !standable(cb.map, k) || cb.units.some((q: any) => q.pos === k && !q.dead)) continue; if (apForTiles(n, u.bank || 0, u.movement) > u.ap || !safe(k)) continue; best = k; bn = n; }
  return best ? { action: { type: 'combat/move', to: best }, kind: 'move', label: 'take cover' } : pol(x);
}; (w as any).after = pol.after; return w; };
for (const k of Object.keys(POLICIES)) if (!(POLICIES[k] as any).__cover) { const w = coverWrap(POLICIES[k]); (w as any).__cover = true; POLICIES[k] = w; }

/** How many stages a run may play (OV_STAGES, default 1); `cleared` is stage 1. */
const STAGES = Number(env.OV_STAGES || 1);
/** Stage 1 of one party on one seed (lever: none | cover), every fight's opening and every enemy roll on it recorded. */
export function openingRun(cell: string, seed: string, lever = 'none') {
  const P: any = Rec.prototype, act0 = P.act; FIGHTS = []; CUR = null;
  P.act = function (this: any, a: any, who?: string) { PEND = []; ON = true; let e; try { e = act0.call(this, a, who); } finally { ON = false; } if (!e) for (const f of PEND) f(); PEND = []; LAST = null; return e; };
  let res: any;
  // levers `set:` (data in memory for this run only, restored after; `+` joins several, and `cover` may be one of them):
  // sv.<path> (survival.json), en.<tier>.<field> (enemies.json items), obj.<kind>.<field> (objects.json items),
  // tj.<technique>.<path> (techniques.json items: tj.burst.numbers.enemy_same=1 gives enemies the characters' Burst)
  const parts = lever.split('+'), undo: (() => void)[] = [];
  for (const q of parts) if (q.startsWith('set:')) for (const kv of q.slice(4).split(';')) {
    const [path, v] = kv.split('='), ks = path.split('.'), root: any = ks[0] === 'sv' ? svJ : ks[0] === 'en' ? ENEMY : ks[0] === 'obj' ? OBJ : ks[0] === 'tj' ? Object.fromEntries((techJ as any).items.map((x: any) => [x.id, x])) : null; if (!root) throw new Error('lever root ' + ks[0]);
    let o = root; for (const k of ks.slice(1, -1)) o = o[k]; const last = ks[ks.length - 1], was = o[last]; o[last] = Number(v); undo.push(() => { o[last] = was; });
  }
  try { COVER.on = parts.includes('cover'); res = simRun({ party: cell, route: 'gear', seed, maxStages: STAGES, maxFightRounds: 20 }); }
  finally { P.act = act0; COVER.on = false; ON = false; for (const f of undo.reverse()) f(); }
  res.fights.forEach((f: any, i: number) => { if (FIGHTS[i]) { FIGHTS[i].kind = f.kind; FIGHTS[i].won = f.won; FIGHTS[i].rounds = f.rounds; FIGHTS[i].stage = f.stage; FIGHTS[i].depth = f.depth; } });
  return { cell, seed, lever, n: PARTIES[cell].length, cleared: res.cleared >= 1, stages: res.cleared, how: res.how, fights: FIGHTS };
}

// ------------------------------------------------------------------------------------------- the tables
const pc0 = (x: number) => (Number.isFinite(x) ? Math.round(100 * x) + '%' : '-'), f1 = (x: number) => (Number.isFinite(x) ? (Math.round(x * 10) / 10).toString() : '-'), f2 = (x: number) => (Number.isFinite(x) ? (Math.round(x * 100) / 100).toString() : '-');
const mean = (xs: number[]) => { const v = xs.filter((q) => Number.isFinite(q)); return v.length ? v.reduce((t, q) => t + q, 0) / v.length : NaN; };
export function runReport(runs: any[]): string {
  if (env.OV_STAGE) { const st = Number(env.OV_STAGE); runs = runs.map((r) => ({ ...r, fights: r.fights.filter((f: any) => (f.stage || 1) === st) })).filter((r) => r.fights.length); }
  const out: string[] = [], by = new Map<string, any[]>(); for (const r of runs) { const k = r.cell + '|' + r.lever; if (!by.has(k)) by.set(k, []); by.get(k)!.push(r); }
  out.push('| Cell | Lever | Clear | Fights | Gun foes a fight a head | Gun foes ahead of a character in initiative | Foes ahead | Tiles to the nearest gun | Tiles to a safe tile (0: starts safe; never: none) | AP to it at Agility 1 / 3 / 5 | Enemy rolls on a character before its first turn (gun) | Of them hits | Damage before the first turn, share of max HP | Damage in round 1 / 2 / 3+ |');
  out.push('|' + ' --- |'.repeat(14));
  for (const [k, rs] of by) {
    const fs = rs.flatMap((r) => r.fights), pcs = fs.flatMap((f: any) => Object.values(f.pc)) as any[], shots = fs.flatMap((f: any) => f.shots);
    const st = pcs.map((p) => p.safeTiles), fin = st.filter((x) => Number.isFinite(x));
    const ap = (ag: number) => mean(fin.map((t) => apForTiles(t, 0, 1 + 0.5 * (ag - 1))));
    const pre = shots.filter((s: any) => s.before && s.kind === 'gun'), preDmg = mean(fs.flatMap((f: any) => Object.entries(f.pc).map(([id, p]: any) => f.shots.filter((s: any) => s.before && s.tgt === id).reduce((t: number, s: any) => t + s.dmg, 0) / p.max)));
    const dT = fs.reduce((t: number, f: any) => t + Object.values(f.dmgR).reduce((a: number, b: any) => a + b, 0), 0) || 1, dr = (i: number) => fs.reduce((t: number, f: any) => t + (f.dmgR[i] || 0), 0) / dT;
    out.push('| ' + rs[0].cell + ' | ' + rs[0].lever + ' | ' + pc0(rs.filter((r) => r.cleared).length / rs.length) + ' | ' + f1(mean(rs.map((r) => r.fights.length))) + ' | ' + f2(mean(fs.map((f: any) => f.guns / f.n))) + ' | ' + f2(mean(pcs.map((p) => p.gunsAhead))) + ' | ' + f2(mean(pcs.map((p) => p.foesAhead)))
      + ' | ' + f1(mean(pcs.map((p) => p.nearGun))) + ' | ' + f1(mean(fin)) + ' (0: ' + pc0(st.filter((x) => x === 0).length / Math.max(1, st.length)) + ', never: ' + pc0(st.filter((x) => !Number.isFinite(x)).length / Math.max(1, st.length)) + ') | ' + [1, 3, 5].map((a) => f1(ap(a))).join(' / ')
      + ' | ' + f2(pre.length / Math.max(1, pcs.length)) + ' | ' + pc0(pre.filter((s: any) => s.hit).length / Math.max(1, pre.length)) + ' | ' + pc0(preDmg) + ' | ' + [1, 2, 3].map((i) => pc0(dr(i))).join(' / ') + ' |');
  }
  // the rolls by what the target stood next to
  out.push('', '| Cell | Lever | Gun rolls on a character: open / half cover counted / full cover counted / pillar beside, facing, not counted / cover on the wrong side | Hit % in each | Nat 20s among hits behind half cover | Gun rolls from a tile no character sees | Gun rolls whose line back is blocked | Gun rolls from a shooter the screen does not draw (rules 1.57 item 4563) |', '|' + ' --- |'.repeat(8));
  for (const [, rs] of by) {
    const sh = rs.flatMap((r) => r.fights).flatMap((f: any) => f.shots).filter((s: any) => s.kind === 'gun'), C = ['open', 'half', 'full', 'full_beside', 'wrong_side'];
    const n = (c: string) => sh.filter((s: any) => s.cover === c), hp = (c: string) => { const a = n(c); return pc0(a.filter((s: any) => s.hit).length / Math.max(1, a.length)); };
    const halfHits = n('half').filter((s: any) => s.hit);
    out.push('| ' + rs[0].cell + ' | ' + rs[0].lever + ' | ' + C.map((c) => n(c).length).join(' / ') + ' | ' + C.map(hp).join(' / ') + ' | ' + halfHits.filter((s: any) => s.crit).length + ' of ' + halfHits.length + ' | ' + pc0(sh.filter((s: any) => !s.pcSees).length / Math.max(1, sh.length)) + ' | ' + pc0(sh.filter((s: any) => s.backBlocked).length / Math.max(1, sh.length)) + ' | ' + pc0(sh.filter((s: any) => s.pcShown === false).length / Math.max(1, sh.length)) + ' |');
  }
  // Downs from full HP between two of the victim's own turns
  out.push('', '| Cell | Lever | Downs a fight | Of them from full HP between the victim\'s own turns | Before the victim\'s first turn | Who did the from-full Downs (damage share) | Foes in on a from-full Down |', '|' + ' --- |'.repeat(7));
  for (const [, rs] of by) {
    const fs = rs.flatMap((r) => r.fights), dn = fs.flatMap((f: any) => f.downs), full = dn.filter((d: any) => d.fromFull), who: Record<string, number> = {};
    let tot = 0; for (const d of full) for (const [k, v] of Object.entries(d.by)) { const kk = k.replace(/ \S+$/, ''); who[kk] = (who[kk] || 0) + (v as number); tot += v as number; }
    const W = fs.flatMap((f: any) => f.win || []), big = W.filter((w: any) => w.lost >= 0.5), heads = fs.reduce((t: number, f: any) => t + f.n, 0) || 1, bigWho: Record<string, number> = {}; let bt = 0;
    for (const w of big) for (const [k, v] of Object.entries(w.by)) { const kk = k.replace(/ \S+$/, ''); bigWho[kk] = (bigWho[kk] || 0) + (v as number); bt += v as number; }
    (rs as any).bigLine = '| ' + rs[0].cell + ' | ' + rs[0].lever + ' | ' + f2(big.length / heads) + ' | ' + f2(W.filter((w: any) => w.lost >= 0.3).length / heads) + ' | ' + pc0(big.filter((w: any) => w.first).length / Math.max(1, big.length)) + ' | ' + f1(mean(big.map((w: any) => Object.keys(w.by).length))) + ' | ' + Object.entries(bigWho).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => k + ' ' + pc0(v / bt)).join(', ') + ' |';
    out.push('| ' + rs[0].cell + ' | ' + rs[0].lever + ' | ' + f2(dn.length / Math.max(1, fs.length)) + ' | ' + full.length + ' of ' + dn.length + ' (' + f2(full.length / Math.max(1, fs.length)) + ' a fight) | ' + full.filter((d: any) => d.before).length + ' | ' + Object.entries(who).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => k + ' ' + pc0(v / tot)).join(', ') + ' | ' + f1(mean(full.map((d: any) => Object.keys(d.by).length))) + ' |');
  }
  out.push('', '| Cell | Lever | Between two of its own turns a character lost half its max HP or more: a fight a head | ... 30% or more | Of the half-or-more, before its first turn | Foes that hurt it in that window | Who dealt it (damage share) |', '|' + ' --- |'.repeat(7));
  for (const [, rs] of by) if ((rs as any).bigLine) out.push((rs as any).bigLine);
  // the damage by foe kind, and the targets
  out.push('', '| Cell | Lever | Damage taken: gun / melee / caster | Gun rolls a fight a head | Gun hit % | Gun crits | Focus: share of the foes\' rolls on the most-rolled character |', '|' + ' --- |'.repeat(7));
  for (const [, rs] of by) {
    const fs = rs.flatMap((r) => r.fights), D = ['gun', 'melee', 'caster'], dT = fs.reduce((t: number, f: any) => t + D.reduce((a, k) => a + (f.dmg[k] || 0), 0), 0) || 1, sh = fs.flatMap((f: any) => f.shots).filter((s: any) => s.kind === 'gun');
    const focus = mean(fs.filter((f: any) => f.n > 1 && f.shots.length).map((f: any) => { const c: Record<string, number> = {}; for (const s of f.shots) c[s.tgt] = (c[s.tgt] || 0) + 1; return Math.max(...Object.values(c)) / f.shots.length; }));
    out.push('| ' + rs[0].cell + ' | ' + rs[0].lever + ' | ' + D.map((k) => pc0(fs.reduce((t: number, f: any) => t + (f.dmg[k] || 0), 0) / dT)).join(' / ') + ' | ' + f1(sh.length / Math.max(1, fs.reduce((t: number, f: any) => t + f.n, 0))) + ' | ' + pc0(sh.filter((s: any) => s.hit).length / Math.max(1, sh.length)) + ' | ' + pc0(sh.filter((s: any) => s.hit && s.crit).length / Math.max(1, sh.length)) + ' | ' + pc0(focus) + ' |');
  }
  // the choice of target in parties
  out.push('', '| Cell | Lever | Party rolls where the foe could also have hit another standing character (line, range; full AP) | Of those, on the nearest | Rolls where the target was the only one it could hit |', '|' + ' --- |'.repeat(5));
  for (const [, rs] of by) { const sh = rs.flatMap((r) => r.fights).flatMap((f: any) => f.shots).filter((s: any) => s.alive > 1 && s.could != null); if (!sh.length) continue; const ch = sh.filter((s: any) => s.could > 1);
    out.push('| ' + rs[0].cell + ' | ' + rs[0].lever + ' | ' + pc0(ch.length / sh.length) + ' | ' + pc0(ch.filter((s: any) => s.nearest).length / Math.max(1, ch.length)) + ' | ' + pc0(sh.filter((s: any) => s.could === 1).length / sh.length) + ' |'); }
  out.push('', '| Cell | Lever | Rolls by tier (party fights) | On the nearest standing character | On the most hurt | Both | Neither | With everyone at full HP: on the nearest | The most-rolled character was the one nearest the foes at the start | ... the one with the least Defense |', '|' + ' --- |'.repeat(10));
  for (const [, rs] of by) {
    const fs = rs.flatMap((r) => r.fights).filter((f: any) => f.n > 1), sh = fs.flatMap((f: any) => f.shots).filter((s: any) => s.alive > 1); if (!sh.length) continue;
    const tiers: Record<string, number> = {}; for (const s of sh) tiers[s.doctrine || '?'] = (tiers[s.doctrine || '?'] || 0) + 1;
    const fr = sh.filter((s: any) => s.fresh);
    let front = 0, lowDef = 0, nf = 0; for (const f of fs) { if (!f.shots.length) continue; const c: Record<string, number> = {}; for (const s of f.shots) c[s.tgt] = (c[s.tgt] || 0) + 1; const top = Object.entries(c).sort((a, b) => b[1] - a[1])[0][0], P = Object.entries(f.pc) as any[];
      const fr0 = P.slice().sort((a, b) => a[1].nearGun - b[1].nearGun)[0][0], ld = P.slice().sort((a, b) => a[1].def - b[1].def)[0][0]; nf++; if (top === fr0) front++; if (top === ld && P.some((q) => q[1].def !== P[0][1].def)) lowDef++; }
    out.push('| ' + rs[0].cell + ' | ' + rs[0].lever + ' | ' + Object.entries(tiers).map(([k, v]) => k + ' ' + v).join(', ') + ' | ' + pc0(sh.filter((s: any) => s.nearest).length / sh.length) + ' | ' + pc0(sh.filter((s: any) => s.mostHurt).length / sh.length) + ' | ' + pc0(sh.filter((s: any) => s.nearest && s.mostHurt).length / sh.length) + ' | ' + pc0(sh.filter((s: any) => !s.nearest && !s.mostHurt).length / sh.length)
      + ' | ' + pc0(fr.filter((s: any) => s.nearest).length / Math.max(1, fr.length)) + ' (' + fr.length + ') | ' + pc0(front / Math.max(1, nf)) + ' | ' + pc0(lowDef / Math.max(1, nf)) + ' |');
  }
  return out.join('\n');
}
