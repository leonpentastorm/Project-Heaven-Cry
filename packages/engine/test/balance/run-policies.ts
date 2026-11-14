// @ts-nocheck (a measuring tool, like the rest of test/balance)
// THE CASTER POLICIES OF THE RUN SIMULATOR (rules 1.51 item 8; survival-spec section 13.6). What a sensible caster does
// each turn in a Survival run. They wrap the balance pass's policies (policies.ts), which stay as they are: the golden
// tables, the replays and the balance contract are played by those, so nothing they measure moves. Every choice here
// is a player's, made from the engine's own previews; every number is the engine's.
//
//   sigilRun    the Sigil policy, and never a pass with AP to spend: a whole Line is Evoked as soon as it is (the Sigil
//               policy does), and when it has nothing to draw or fire this turn the AP left goes to the pistol (walking
//               into its range if it must), else to venting Flux.
//   outburstRun the Outburst policy, but a held Outburst is Released at the stage that drops a foe (the engine's plan
//               preview: the damage after armour at least the foe's HP), and at stage 0 or 1 at a Vermin or a Minion; it
//               picks the foe it can drop this turn first. Else as the Outburst policy (Pump, carry, Release at its best).
//   healerRun   the healer when it matters: a held Mend is played out; else Mend an ally under 60% of max HP (or down),
//               alone itself only under 50%; else the Outburst caster above.
//   rigger      the Figments door (ported from figments-measure.ts): picture a Beast (else the best form opened) next to
//               the nearest foe and a Wall (else a Double) when the charge allows, swap a core when the charge is short,
//               strike with the Figment (it walks to the foe first), then the pistol with the AP left.
// Echo stays unplayed by every policy (survival-spec 13.9.6).
import { previewAttack, previewOutburstPlan, dist, alive, WEAPON, bindGame, heldMax, ladderAt, figmentsOf, heldFigments, figmentCharge, projectionRange, canStand, unitSees, sideSeesUnit } from '../../src';
import { POLICIES, sigil, sigilAfter, outburst, plain, type Policy, type Ctx, type Step } from './policies';
import { obHeal } from './heal-measure';

const W = <T>(g: any, f: () => T): T => { const was = bindGame(g); try { return f(); } finally { bindGame(was); } };
const ok = (x: Ctx, s: Step | null) => (s && !x.banned.has(JSON.stringify(s.action)) ? s : null);

// ---------------------------------------------------------------------------------------------- Sigil
/** The Sigil caster that never passes a turn with AP left (spec 13.6 (3)). */
export const sigilRun: Policy = (x) => {
  const s = sigil(x); if (s) return s;
  const u = x.u, m = u.mg; if (u.ap < 1 || !x.foes.length) return null;
  // a Line under way waits where it is for the next turn's AP (spare AP still shoots); with none, it may walk to shoot
  const p = plain(x); if (p && (p.kind === 'attack' || (p.kind === 'move' && !x.memo.plan && u.ap >= 3))) return p;
  if (m && (m.flux || 0) > 0) return ok(x, { action: { type: 'combat/vent' }, kind: 'setup', label: 'vent Flux' });
  return null;
};
(sigilRun as any).after = sigilAfter;

// ---------------------------------------------------------------------------------------------- Outburst
const SMALL = new Set(['vermin', 'minion']);
/** The Outburst caster that Releases at the stage that kills (spec 13.6 (4)). */
export const outburstRun: Policy = (x) => {
  const u = x.u, m = u.mg;
  if (m?.held) {
    const d = m.designs.find((q: any) => q.id === m.held.design);
    if (d && d.school === 'damage') {
      let kill: any = null, small: any = null;
      for (const t of x.foes) {
        const pl = W(x.g, () => previewOutburstPlan(x.cb, u, 'held', t.pos)); if (!pl.ok || pl.ap > u.ap) continue;
        const hit = (pl.affected || []).find((a: any) => a.enemy && a.id === t.id) || (pl.affected || []).find((a: any) => a.enemy);
        if (!hit) continue;
        const p = hit.roll ? hit.roll.pct / 100 : 1;
        if (hit.dmgAfterArmour >= t.hp && p >= 0.5 && (!kill || p > kill.p)) kill = { aim: t.pos, p };
        if (SMALL.has(t.tier) && m.held.stage >= 0 && p >= 0.5 && !small) small = { aim: t.pos, p };
      }
      const pick = kill || (m.held.stage <= 1 ? small : null);
      if (pick) { const s = ok(x, { action: { type: 'combat/release', aim: pick.aim }, kind: 'spell', label: 'Release (it drops)', seq: 'end' }); if (s) return s; }
    }
  }
  return outburst(x);
};

// ---------------------------------------------------------------------------------------------- the healer
/** The healer that heals when it matters (spec 13.6 (2)). */
export const healerRun: Policy = (x) => {
  const u = x.u, m = u.mg, held = m?.held ? m.designs.find((q: any) => q.id === m.held.design) : null;
  if (held && held.school === 'buff') return obHeal(x) || (u.ap >= 1 ? ok(x, { action: { type: 'combat/release', aim: u.pos }, kind: 'spell', label: 'Release', seq: 'end' }) : null);
  if (held) return outburstRun(x);
  const alone = !x.allies.length, low = (v: any) => v.downed || v.hp < v.maxHp * (v.id === u.id ? (alone ? 0.5 : 0.6) : 0.6);
  const needs = [u, ...x.allies].some(low);
  if (needs) { const s = obHeal(x); if (s) return s; }
  return outburstRun(x);
};

// ---------------------------------------------------------------------------------------------- Figments
/** A free tile within projection range that the owner sees, nearest `to` (figments-measure.ts tileNear). */
function tileNear(cb: any, u: any, to: string): string | null {
  const r = projectionRange(u); let best: string | null = null, bd = 1e9;
  for (let x = 0; x < cb.map.w; x++) for (let y = 0; y < cb.map.h; y++) {
    const k = x + ',' + y; if (dist(u.pos, k) > r || !canStand(cb, k) || !unitSees(cb, u, k)) continue;
    const d = dist(k, to); if (d < 1) continue; if (d < bd) { bd = d; best = k; }
  }
  return best;
}
/** The free tile within `tiles` of the unit nearest `to`, no nearer than `keep` (figments-measure.ts stepToward). */
function stepToward(cb: any, u: any, to: string, tiles: number, keep = 1): string | null {
  let best: string | null = null, bd = dist(u.pos, to); const [x0, y0] = u.pos.split(',').map(Number);
  for (let dx = -tiles; dx <= tiles; dx++) for (let dy = -tiles; dy <= tiles; dy++) {
    const k = (x0 + dx) + ',' + (y0 + dy); if (k === u.pos || !canStand(cb, k, u)) continue;
    const d = dist(k, to); if (d < keep) continue; if (d < bd) { bd = d; best = k; }
  }
  return best;
}
/** The Rigger plays its door (spec 13.6 (1)). */
export const rigger: Policy = (x) => {
  const u = x.u, cb = x.cb, c = x.c; if (!x.foes.length) return null;
  const vis = c?.skills?.visualization || 0, opened = ladderAt(vis).forms || [];
  const near = [...x.foes].sort((a, b) => dist(u.pos, a.pos) - dist(u.pos, b.pos))[0];
  if (u.mg?.vcarry) {
    const want = [opened.includes('beast') ? 'beast' : opened.includes('blade') ? 'blade' : 'double', opened.includes('wall') ? 'wall' : 'double'];
    const held = W(x.g, () => heldFigments(cb, u)), forms = held.map((f: any) => f.figment?.form || f.owned?.form);
    const next = want.find((f, j) => forms.filter((q: string) => q === f).length < want.slice(0, j + 1).filter((q) => q === f).length);
    if (next && held.length < W(x.g, () => heldMax(u))) {
      if ((u.mg.vcharge ?? 0) < figmentCharge(next, [])) { const s = ok(x, { action: { type: 'combat/perk', id: 'verb:visualizer_core' }, kind: 'setup', label: 'swap the Visualizer core' }); if (s) return s; }
      else { const at = W(x.g, () => tileNear(cb, u, near.pos)); if (at) { const s = ok(x, { action: { type: 'combat/perk', id: 'verb:picture', choice: next, tile: at }, kind: 'setup', label: 'Picture a ' + next }); if (s) return s; } }
    }
    // its side must see the foe for a Figment to act on it
    if (!W(x.g, () => sideSeesUnit(cb, u.side, near)) && u.ap >= 3 && x.memo.seeStep !== cb.round) { x.memo.seeStep = cb.round; const to = W(x.g, () => stepToward(cb, u, near.pos, Math.floor((u.movement || 1) * 2), 5)); if (to) { const s = ok(x, { action: { type: 'combat/move', to }, kind: 'move', label: 'step up to see' }); if (s) return s; } }
    const f = W(x.g, () => figmentsOf(cb, u)).find((q: any) => (q.dataVerbs || []).some((v: string) => /strike|cut/.test(v)));
    if (f && u.ap >= 1) {
      const verb = f.dataVerbs.find((v: string) => /strike|cut/.test(v)), foe = [...x.foes].sort((a, b) => dist(f.pos, a.pos) - dist(f.pos, b.pos))[0];
      if (dist(f.pos, foe.pos) <= 1) { const s = ok(x, { action: { type: 'combat/owned', owned: f.id, verb, targetId: foe.id }, kind: 'attack', label: 'the Figment strikes' }); if (s) return s; }
      else { const to = W(x.g, () => stepToward(cb, f, foe.pos, Math.max(1, Math.floor(f.movement || 1)))); if (to) { const s = ok(x, { action: { type: 'combat/owned', owned: f.id, verb: 'move', tile: to }, kind: 'move', label: 'the Figment closes' }); if (s) return s; } }
    }
  }
  return plain(x);
};

Object.assign(POLICIES, { sigilRun, outburstRun, healerRun, rigger });
