// @ts-nocheck (a measuring tool; see figments-measure.test.ts)
// FIGMENTS (Classes 3.0 step 8, rules 1.34; docs/design/figments-spec.md section 7). A Figment's worth a turn =
//   D  the damage the owner's side deals through its AP (the Figments' attacks and the owner's own shots with the AP left)
//   S  the damage enemies spent on its Figments (each Soldier-turn of it is one rifle-turn: the soak), capped at 0.6 of
//      what the enemies dealt in all (the contract's cap: enemy fire is finite)
// as a percent of the normal-share plain rifle's turn at the same level (refit-measure.ts yardOf; S through
// soldierTurnAt). The policy (the spec's): picture a Beast (else the best form opened) next to the nearest enemy and a
// Wall (else a Double) between the owner and it, strike with the Beast, Overclock it when the class has it, shoot with
// what AP is left; swap the core when it runs short. Fights: the build against two Soldiers on open ground, 5 rounds.
import { startFight, TIER_WEAPON } from './sim';
import { yardOf, soldierTurnAt } from './refit-measure';
import { apply, withGame, beginTurn, previewAttack, dist, heldMax, ladderAt, figmentsOf, heldFigments, FORM, figmentCharge, projectionRange, canStand, unitSees } from '../../src';
import { onHook } from '../../src/effects/hooks';

const W = (g: any, f: () => any) => withGame(g, f);
let TRACK: { on: boolean; D: number; S: number; F: number; pc: string } = { on: false, D: 0, S: 0, F: 0, pc: '' };
onHook('on_damaged', (ctx: any, cb: any) => {
  if (!TRACK.on) return; const t = ctx.t, by = ctx.src?.by; if (!t || !by) return;
  const mine = (u: any) => u && (u.id === TRACK.pc || u.ctrl === TRACK.pc.replace(/^pc-/, ''));
  if (t.side === 'foe' && mine(by)) TRACK.D += ctx.dmg;
  if (by.side === 'foe') { TRACK.F += ctx.dmg; if (t.owned?.kind === 'figment') TRACK.S += ctx.dmg; }
});

const act = (g: any, a: any) => { try { return { g: apply(g, a, 'host'), ok: true }; } catch (e) { return { g, ok: false, why: String(e) }; } };
/** A free tile within projection range that the owner sees, nearest `to` (and at least `minFrom` from the owner). */
function tileNear(cb: any, u: any, to: string, o: { adj?: boolean } = {}): string | null {
  const r = projectionRange(u); let best: string | null = null, bd = 1e9;
  for (let x = 0; x < cb.map.w; x++) for (let y = 0; y < cb.map.h; y++) {
    const k = x + ',' + y; if (dist(u.pos, k) > r || !canStand(cb, k) || !unitSees(cb, u, k)) continue;
    const d = dist(k, to); if (o.adj && d < 1) continue; if (d < bd) { bd = d; best = k; }
  }
  return best;
}
/** One PC turn of the policy. */
function pcTurn(g: any, rigger: boolean): any {
  const cb = () => g.combat, me = () => cb().units.find((x: any) => x.id === TRACK.pc), foes = () => cb().units.filter((x: any) => x.side === 'foe' && !x.dead && !x.downed);
  const u0 = me(); if (!u0 || u0.dead || u0.downed) return g;
  const c = g.characters[u0.charId], vis = c.skills.visualization || 0, opened = ladderAt(vis).forms;
  const near = () => foes().sort((a: any, b: any) => dist(me().pos, a.pos) - dist(me().pos, b.pos))[0];
  const want = [opened.includes('beast') ? 'beast' : opened.includes('blade') ? 'blade' : 'double', opened.includes('wall') ? 'wall' : 'double'];
  // the core, when what is wanted can't be paid
  for (let i = 0; i < 4 && near(); i++) {
    const u = me(), held = W(g, () => heldFigments(cb(), u)), forms = held.map((f: any) => f.figment?.form);
    const next = want.find((f, j) => forms.filter((x: string) => x === f).length < want.slice(0, j + 1).filter((x) => x === f).length);
    if (!next || held.length >= W(g, () => heldMax(u))) break;
    if ((u.mg?.vcharge ?? 0) < figmentCharge(next, [])) { const r = act(g, { type: 'combat/perk', unitId: u.id, id: 'verb:visualizer_core' }); g = r.g; if (!r.ok) break; continue; }
    const n = near(), at = next === 'wall' ? W(g, () => tileNear(cb(), u, u.pos === n.pos ? n.pos : n.pos, {})) : W(g, () => tileNear(cb(), u, n.pos));
    if (!at) break;
    const r = act(g, { type: 'combat/perk', unitId: u.id, id: 'verb:picture', choice: next, tile: at }); g = r.g; if (!r.ok) break;
  }
  // the striker: Overclock (the Rigger), then its own verbs on the owner's AP
  for (let i = 0; i < 6; i++) {
    const u = me(), f = W(g, () => figmentsOf(cb(), u)).find((x: any) => x.dataVerbs?.some((v: string) => /strike|cut/.test(v))); const n = near(); if (!f || !n) break;
    const verb = f.dataVerbs.find((v: string) => /strike|cut/.test(v)), foe = foes().sort((a: any, b: any) => dist(f.pos, a.pos) - dist(f.pos, b.pos))[0];
    if (rigger && c.classId === 'trickster' && dist(f.pos, foe.pos) <= 1 && !u.__oc) { const r = act(g, { type: 'combat/perk', unitId: u.id, id: 'class:trickster.overclock', targetId: f.id }); g = r.g; if (r.ok) { me().__oc = 1; continue; } }
    if (dist(f.pos, foe.pos) <= 1) { const r = act(g, { type: 'combat/owned', unitId: u.id, owned: f.id, verb, targetId: foe.id }); g = r.g; if (!r.ok) break; continue; }
    const to = W(g, () => tileNear(cb(), u, foe.pos)); if (!to || dist(to, foe.pos) > 1 || dist(to, f.pos) > f.movement * Math.max(1, me().ap - 2)) break;
    const r = act(g, { type: 'combat/owned', unitId: u.id, owned: f.id, verb: 'move', tile: to }); g = r.g; if (!r.ok) break;
  }
  // the AP left: the owner's own shots
  for (let i = 0; i < 6; i++) {
    const u = me(), n = near(); if (!n) break; const pv = W(g, () => previewAttack(cb(), u, n, 'shot')); if (!pv.ok) break;
    const r = act(g, { type: 'combat/attack', unitId: u.id, targetId: n.id, mode: 'shot' }); g = r.g; if (!r.ok) break;
  }
  return g;
}
/** One fight; the totals and the turns. */
export function figmentFight(build: string, variant: 'normal' | 'allin', level: number, seed: string, door = false, rounds = 5) {
  const spec = { pcs: [{ build, variant, level }], foes: [{ tier: 'soldier', weapon: TIER_WEAPON.soldier }, { tier: 'soldier', weapon: TIER_WEAPON.soldier }], map: 'open', seed, maxRounds: rounds };
  const st = startFight(spec as any, false); let g = st.g;
  if (door) for (const c of Object.values(g.characters) as any[]) c.classId = null;
  TRACK = { on: true, D: 0, S: 0, F: 0, pc: 'pc-c1' };
  let turns = 0;
  try {
    g = apply(g, st.open, 'host');
    for (let guard = 0; guard < 80 && g.combat && !g.combat.over && g.combat.round <= rounds; guard++) {
      const cb = g.combat, cur = cb.units.find((x: any) => x.id === cb.order[cb.turn]);
      if (cur?.id === TRACK.pc) { turns++; g = pcTurn(g, !door); }
      if (!g.combat || g.combat.over) break;
      const cur2 = g.combat.units.find((x: any) => x.id === g.combat.order[g.combat.turn]);
      g = apply(g, { type: 'combat/end-turn', unitId: cur2.id }, 'host');
    }
  } finally { TRACK.on = false; }
  return { D: TRACK.D, S: Math.min(TRACK.S, 0.6 * TRACK.F), turns: Math.max(1, turns) };
}
/** A cell: n fights; the worth a turn as a percent of the rifle-turn (D, S and the sum). */
export function figmentCell(build: string, variant: 'normal' | 'allin', level: number, n: number, door = false) {
  let D = 0, S = 0, T = 0;
  for (let i = 0; i < n; i++) { const r = figmentFight(build, variant, level, 'FIG-' + variant + '-' + level + '-' + i + (door ? 'd' : ''), door); D += r.D; S += r.S; T += r.turns; }
  const yard = yardOf(level, 24), st = soldierTurnAt(level);
  const d = (D / T) / yard * 100, s = (S / T) / st * 100;
  return { d: Math.round(d), s: Math.round(s), all: Math.round(d + s) };
}
