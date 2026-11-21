// @ts-nocheck (a measuring tool, like the rest of test/balance)
// THE CASTER POLICIES OF THE RUN SIMULATOR (rules 1.51 item 8; survival-spec section 13.6). What a sensible caster does
// each turn in a Survival run. They wrap the balance pass's policies (policies.ts), which stay as they are: the golden
// tables, the replays and the systems measure are played by those, so nothing they measure moves. Every choice here
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
import { coverBonus, lineOfSight, isPressed, SIGIL, previewAttack, previewPerkAction, glyphApOf, groundCap, previewOutburstPlan, dist, alive, WEAPON, bindGame, heldMax, formsOf, figmentsOf, heldFigments, figmentCharge, projectionRange, canStand, unitSees, sideSeesUnit, isMelee, paths, apForTiles, objectsOf, isPile, entryPack, PICKUP_AP, hasTag } from '../../src';
import { POLICIES, sigil, sigilAfter, sigilLines, outburst, plain, plainCands, best, gunner, optimised, fixOrMove, type Policy, type Ctx, type Step } from './policies';
import { pickedFork } from '../../src/doorpicks';
import { obHeal } from './heal-measure';

const W = <T>(g: any, f: () => T): T => { const was = bindGame(g); try { return f(); } finally { bindGame(was); } };
const ok = (x: Ctx, s: Step | null) => (s && !x.banned.has(JSON.stringify(s.action)) ? s : null);

// ---------------------------------------------------------------------------------------------- Sigil
/** Balance 2.0 section 6 fix 1 (P2, 0.29): the area words. When the Sigil policy starts a new Line of 3 or 4 glyphs
 * (its first draw) and two or more foes stand within the area word's reach of one another, the Line is rewritten to
 * carry SPREAD (radius 2), else CHAIN (its jump radius), in place of a repeated element or CONDENSE: [element, the
 * element repeated as the length needs, the area word, SEEK]. The Evoke then picks its aim by the engine's own preview
 * (planEvoke: every foe the shape catches), as before. A Line of 2 glyphs has no room for it and stays as it is. */
const AREA = ['spread', 'chain'];
const areaReach = (w: string) => Number((SIGIL[w] as any)?.radius ?? (SIGIL[w] as any)?.jump_radius ?? 2);
export const AREA_LINES = { rewritten: 0 };
function areaLine(x: Ctx, words: string[]): string[] | null {
  const known: string[] = x.u.mg?.words || [], n = words.length; if (n < 3) return null;
  const w = AREA.find((q) => known.includes(q)); if (!w) return null;
  const r = areaReach(w), cluster = x.foes.some((a) => x.foes.some((b) => b !== a && dist(a.pos, b.pos) <= r)); if (!cluster) return null;
  const el = words.find((q) => Number((SIGIL[q] as any)?.damage) > 0); if (!el) return null;
  return [el, ...Array(n - 3).fill(el), w, 'seek'];
}
/** The Sigil caster that never passes a turn with AP left (spec 13.6 (3)), played as a player plays it (0.32 simulator
 * lane: the 0.31.11 bot cleared stage 1 on 0 of 40 seeds; its turn logs showed why, docs/design/handoffs/0.32-MEASURES.md):
 *   1. a foe with a blade beside it: no step (each step drew an opportunity attack from every foe beside it, 4 to 16
 *      damage a step): the pistol at the weakest of them; with Clean Vent (the Brain Power fork) and Flux in the Evoker,
 *      the Vent throws them back first;
 *   2. small game (a Vermin, or a foe the pistol drops in one expected hit) is shot, not drawn for: a Line of four did
 *      about 180 at level 1 to a rat of 15 HP and took a whole turn;
 *   3. a new Line is as long as the target needs and as the turn pays for: the shortest that drops the target on its
 *      estimate (the Line's number times what the last Evoke dealt for its number, LINE_K at first), else the longest
 *      that is drawn, walked and Evoked inside this turn's AP (a Line left over a turn was scuffed and its glyphs faded);
 *   4. the core is swapped BEFORE a Line whose charge and Evoke the Evoker can't pay (it was swapped mid-Line, or after
 *      the last glyph with no AP left, and the Line waited a turn);
 *   5. Overclock (Brain Power 2): with Max Sigil words under a full Line, the Line may be one glyph longer, paid in
 *      core charge (the Overclock verb before that glyph).
 * Each step is the engine's own preview (planEvoke, glyphCost, previewAttack, previewPerkAction); a refusal falls back
 * to the Sigil policy (policies.ts sigil), which is unchanged. */
const LINE_K = 3; // a measuring tool's first guess (level 1 all in: 119 to 126 dealt by STONE · SEEK, numbered 35); learned per fight after the first Evoke
const SMALL_T = new Set(['vermin']);
const W2 = W;
function lineCost(x: Ctx, n: number): number { const u = x.u; return W2(x.g, () => glyphApOf(u)) * n + (n - 1) * apForTiles(1, 0, u.movement) + 1; }
function lineCharge(x: Ctx, words: string[]): number { const m = x.u.mg; return words.reduce((t, w) => t + (Number((SIGIL[w] as any)?.charge) || 1), 0) + Math.max(1, words.length - (m.coreSave || 0)); }
/** Measured switches of the run's Sigil policy (0.32): `along` draws every Line straight away from the target and fires it back along itself (no step off the end). */
export const SIGIL_RUN_OPTS = { along: ((globalThis as any).process?.env || {}).SIG_ALONG !== '0' };
/** Measured (0.33): SIG_LONG=1 draws the longest Line the turn pays for, never the shortest that drops the target. */
const SIG_LONG = ((globalThis as any).process?.env || {}).SIG_LONG === '1';
export const SIGIL_RUN = { pistolSmall: 0, meleeShot: 0, cleanVent: 0, preSwap: 0, overclock: 0, short: 0 };
export const sigilRun: Policy = (x) => {
  const u = x.u, m = u.mg, M = x.memo;
  if (m?.evoker && (m.words || []).length && x.foes.length && u.ap >= 1) {
    const plan = M.plan, pistolOn = (ts: any[]) => { const p = plainCands({ ...x, foes: ts }), b = best(x, p.cands, (c) => c.value / Math.max(0.5, c.ap)); return b ? b.step : null; };
    const adj = x.foes.filter((f) => dist(f.pos, u.pos) <= 1 && isMelee(WEAPON[f.weapon]));
    const knows = (id: string) => pickedFork(x.c, id);
    // 1. a blade beside it: the next glyph on its own tile is still drawn; any step is not taken
    if (adj.length && !(plan && plan.i < plan.words.length && plan.tiles[plan.i] === u.pos) && !(plan && plan.i >= plan.words.length)) {
      if ((m.flux || 0) > 0 && knows('fork.sigil.clean_vent') && x.memo.cleanVent !== x.cb.round) { x.memo.cleanVent = x.cb.round; const s = ok(x, { action: { type: 'combat/vent' }, kind: 'setup', label: 'Clean Vent (throws them back)' }); if (s) { SIGIL_RUN.cleanVent++; return s; } }
      const s = pistolOn([...adj].sort((a, b) => a.hp - b.hp)); if (s) { SIGIL_RUN.meleeShot++; return s; }
    }
    if (!plan) {
      // 2. small game: the pistol
      const tgt = [...x.foes].sort((a, b) => dist(u.pos, a.pos) - dist(u.pos, b.pos))[0];
      const pc = plainCands({ ...x, foes: [tgt] }).cands[0];
      if (pc && (SMALL_T.has(tgt.tier) || pc.value >= tgt.hp)) { const s = pistolOn([tgt]); if (s) { SIGIL_RUN.pistolSmall++; return s; } }
      // 5. Overclock: one glyph past Max Sigil words (the verb is sent before the glyph that needs it, below)
      const over = (m.maxWords || 2) < 4 && !!verbOk(x, 'skill:brain_power.2', 'overclock');
      const cap = Math.min(4, (m.maxWords || 2) + (over ? 1 : 0), W2(x.g, () => groundCap(u, x.cb)) + (over ? 1 : 0));
      // 3. the Line's length: the shortest that drops the target, else the longest the turn pays for
      const K = M.lineK || LINE_K, byN: Record<number, any> = {};
      for (const l of sigilLines(m.words, cap)) if (!byN[l.words.length] || l.est > byN[l.words.length].est) byN[l.words.length] = l;
      const ns = Object.keys(byN).map(Number).sort((a, b) => a - b), fits = ns.filter((n) => lineCost(x, n) <= u.ap + 1e-9);
      let n = (SIG_LONG ? undefined : fits.find((q) => byN[q].est * K >= tgt.hp)) ?? fits[fits.length - 1];
      if (n == null) { const s = pistolOn(x.foes); if (s) return s; n = ns[0]; }
      if (n != null) {
        // 4. the core swapped before the Line, when the Evoker can't pay for it
        if (lineCharge(x, byN[n].words) > (m.charge || 0) && m.cores > 0) {
          if (u.ap >= 2) { const s = ok(x, { action: { type: 'combat/core' }, kind: 'setup', label: 'swap the core (before the Line)' }); if (s) { SIGIL_RUN.preSwap++; return s; } }
          const s = pistolOn(x.foes); if (s) return s;
        }
        if (n < (ns[ns.length - 1] || n)) SIGIL_RUN.short++;
        const mw = m.maxWords; if (over) { u.mg.maxWords = Math.min(4, mw + 1); M.overAt = mw; }
        try { return sigilRunBase({ ...x, opts: { ...(x.opts || {}), glyphs: n, noCover: true, along: x.opts?.along ?? SIGIL_RUN_OPTS.along } }); } finally { u.mg.maxWords = mw; }
      }
    }
    // Overclock before the glyph past Max Sigil words
    if (plan && plan.i < plan.words.length && M.overAt != null && plan.i >= M.overAt && plan.tiles[plan.i] === u.pos && M.overStamp !== plan.sid + ':' + plan.i) {
      const v = verbOk(x, 'skill:brain_power.2', 'overclock'); M.overStamp = plan.sid + ':' + plan.i; if (v) { SIGIL_RUN.overclock++; return v; }
    }
  }
  return sigilRunBase(x);
};
/** After each action: the Sigil policy's plan, and K learned from an Evoke (what it dealt over the Line's number). */
function sigilRunAfter(x: Ctx, step: Step, okd: boolean) {
  const M = x.memo;
  if (step.action.type === 'combat/evoke' && okd && M.evoking?.est) {
    const pre: Record<string, number> = M.preHp || {}; let dealt = 0, dropped = false;
    for (const [id, hp] of Object.entries(pre)) { const f = x.cb.units.find((q: any) => q.id === id), now = f && !f.dead && !f.downed ? f.hp : 0; if (!now && hp > 0) dropped = true; dealt += Math.max(0, hp - now); }
    // a foe it dropped hides the overkill: then the number only rises
    if (dealt > 0) M.lineK = dropped ? Math.max(M.lineK || LINE_K, dealt / M.evoking.est) : Math.max(1, dealt / M.evoking.est);
  }
  sigilAfter(x, step, okd);
}
function verbOk(x: Ctx, id: string, actionId: string): Step | null {
  let pv: any; try { pv = W(x.g, () => previewPerkAction({ u: x.u, c: x.c, cb: x.cb, g: x.g }, id, { actionId }, 'combat')); } catch { return null; }
  if (!pv?.ok || (pv.ap ?? 0) > x.u.ap) return null;
  return ok(x, { action: { type: 'combat/perk', id, actionId }, kind: 'other', label: actionId });
}
/** The run's Sigil policy as it was (0.31): the Sigil policy, the area words, and the pistol or a Vent with AP left. */
const sigilRunBase: Policy = (x) => {
  const s = sigilRunCore(x);
  if (s && s.action.type === 'combat/evoke') x.memo.preHp = Object.fromEntries(x.foes.map((f) => [f.id, f.hp]));
  return s;
};
const sigilRunCore: Policy = (x) => {
  const s = sigil(x), plan = x.memo.plan;
  if (s && s.action.type === 'combat/draw' && s.seq === 'start' && plan && plan.i === 0 && !plan.area) {
    plan.area = true; const a = areaLine(x, plan.words);
    if (a) { plan.words = a; AREA_LINES.rewritten++; return { ...s, action: { ...s.action, word: a[0] }, label: 'draw ' + a[0].toUpperCase() }; }
  }
  if (s) return s;
  const u = x.u, m = u.mg; if (u.ap < 1 || !x.foes.length) return null;
  // a Line under way waits where it is for the next turn's AP (spare AP still shoots); with none, it may walk to shoot
  const p = plain(x); if (p && (p.kind === 'attack' || (p.kind === 'move' && !x.memo.plan && u.ap >= 3))) return p;
  if (m && (m.flux || 0) > 0) return ok(x, { action: { type: 'combat/vent' }, kind: 'setup', label: 'vent Flux' });
  return null;
};
(sigilRun as any).after = sigilRunAfter;

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
/** How many Pictures the Rigger policy has asked for (the measure counts the fights it pictured in). */
export const RIG = { pictures: 0 };
/** The Rigger plays its door (spec 13.6 (1)). */
export const rigger: Policy = (x) => {
  const u = x.u, cb = x.cb, c = x.c; if (!x.foes.length) return null;
  const opened = formsOf(c); // rules 1.56: the forms the ladder gave and the forks chose
  const near = [...x.foes].sort((a, b) => dist(u.pos, a.pos) - dist(u.pos, b.pos))[0];
  if (u.mg?.vcarry) {
    const want = [opened.includes('beast') ? 'beast' : opened.includes('blade') ? 'blade' : 'double', opened.includes('wall') ? 'wall' : 'double'];
    const held = W(x.g, () => heldFigments(cb, u)), forms = held.map((f: any) => f.figment?.form || f.owned?.form);
    const next = want.find((f, j) => forms.filter((q: string) => q === f).length < want.slice(0, j + 1).filter((q) => q === f).length);
    if (next && held.length < W(x.g, () => heldMax(u))) {
      if ((u.mg.vcharge ?? 0) < figmentCharge(next, [])) { const s = ok(x, { action: { type: 'combat/perk', id: 'verb:visualizer_core' }, kind: 'setup', label: 'swap the Visualizer core' }); if (s) return s; }
      else { const at = W(x.g, () => tileNear(cb, u, near.pos)); if (at) { const s = ok(x, { action: { type: 'combat/perk', id: 'verb:picture', choice: next, tile: at }, kind: 'setup', label: 'Picture a ' + next }); if (s) { RIG.pictures++; return s; } } }
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

// ---------------------------------------------------------------------------------------------- the tactical reload
/** P2 (0.29): a policy whose reloads are tactical (rules 1.9: +1 AP, the magazine goes back in the pack) instead of
 * speed (the magazine drops on the tile); when the tactical one is refused (AP short), the speed one. */
export const tactical = (pol: Policy): Policy => (x) => {
  const s = pol(x); if (!s || s.action?.type !== 'combat/reload' || s.action.tactical) return s;
  const t = { ...s, action: { ...s.action, tactical: true }, label: 'tactical reload' };
  return x.banned.has(JSON.stringify(t.action)) ? s : t;
};
export const gunnerTac = tactical(gunner), optimisedTac = tactical(optimised);

// ---------------------------------------------------------------------------------------------- the dry gun
/** The fallback a player has when the gun runs dry (the 0.30 fit; the lead's ruling R4, 16 Nov 2026: the tank and Mender
 * policies ran their revolver dry and ended the turn for 14 rounds and more). Asked only when the gun in the main hand
 * is empty and the policy has nothing but a walk, a reload, a set-up or nothing to offer (its heals, Bonds, spells and
 * door verbs still come first). In order, each through the reducer's own actions:
 *   1. reload (tactical, else speed) if it has not been refused this turn; load a spare magazine from loose rounds;
 *   2. draw a weapon from the pack that can fight now (a melee weapon, or a gun with rounds in it): combat/equip;
 *   3. pick up from a pile it sees on its tile or next to it the entries that hold rounds or magazines for its gun or a
 *      weapon that can fight (combat/pickup, those entries only); else walk to such a pile it reaches this turn with
 *      the AP for the pick-up left;
 *   4. the fists (combat/attack, mode melee: the engine's strikeWeapon swaps them in for a gun) on the weakest foe in
 *      reach; else the walk to the nearest foe that brings one.
 * So it never ends a turn with AP and a foe it can reach. */
const emptyGun = (u: any): boolean => { const w: any = WEAPON[u.weapon]; return !!w && !isMelee(w) && w.magazine != null && (u.ammo ?? 0) <= 0; };
const refused = (x: Ctx, a: any) => x.banned.has(JSON.stringify(a));
/** A pack or pile item the character can fight with now: rounds or magazines for the gun in hand, a melee weapon, a gun with rounds in it. */
function fightsWith(u: any, it: any): 'ammo' | 'weapon' | null {
  const w: any = WEAPON[u.weapon];
  if (it.mags && it.weapon === u.weapon && it.mags.some((n: number) => n > 0)) return 'ammo';
  if (it.calibre && !it.mags && w?.ammo && it.calibre === w.ammo && (it.qty || 0) > 0) return 'ammo';
  const iw: any = it.kind === 'weapon' ? WEAPON[it.weapon || it.id] : null;
  if (iw && !hasTag(iw.id, 'kind:thrown') && !hasTag(iw.id, 'kind:mana') && (isMelee(iw) || (it.loaded ?? 0) > 0)) return 'weapon'; // rules 1.92 item 8042: the kind tag
  return null;
}
export const fallback = (pol: Policy): Policy => (x) => {
  const s = pol(x), u = x.u;
  if ((s && !['move', 'reload', 'setup'].includes(s.kind)) || !emptyGun(u) || !x.foes.length || u.ap < 1) return s;
  // 1. the reloads, then a magazine filled from loose rounds
  for (const a of [{ type: 'combat/reload', tactical: true }, { type: 'combat/reload' }] as any[]) if (!refused(x, a)) return { action: a, kind: 'reload', label: a.tactical ? 'tactical reload (gun dry)' : 'reload (gun dry)' };
  if ((u.loose || 0) > 0 && !refused(x, { type: 'combat/load' })) return { action: { type: 'combat/load' }, kind: 'reload', label: 'load a magazine (gun dry)' };
  // 2. a weapon in the pack that fights now
  const pack: any[] = x.c?.pack || [];
  for (let i = 0; i < pack.length; i++) if (fightsWith(u, pack[i]) === 'weapon') { const a = { type: 'combat/equip', item: i, to: 'main' }; if (!refused(x, a)) return { action: a, kind: 'setup', label: 'draw ' + (pack[i].name || pack[i].id) + ' (gun dry)' }; }
  // 3. a pile it sees with something to fight with: picked up from beside it, else walked to
  const piles = objectsOf(x.cb).filter((o: any) => isPile(o) && !o.hidden && (o.items || []).length)
    .map((o: any) => ({ o, take: (o.items || []).map((e: any, i: number) => (entryPack(e).some((it: any) => fightsWith(u, it)) ? i : -1)).filter((i: number) => i >= 0) })).filter((p: any) => p.take.length);
  for (const p of piles.filter((q: any) => dist(q.o.pos, u.pos) <= 1)) { const a = { type: 'combat/pickup', tile: p.o.pos, take: p.take }; if (!refused(x, a)) return { action: a, kind: 'setup', label: 'pick up (gun dry)' }; }
  if (piles.length && x.memo.pileWalk !== x.cb.round) {
    const P = W(x.g, () => paths(x.cb, u.pos, u.id)), taken = new Set(x.cb.units.filter((v: any) => !v.dead && v.id !== u.id).map((v: any) => v.pos));
    const to = Object.entries(P.dist as Record<string, number>).filter(([k, n]) => n > 0 && !taken.has(k) && piles.some((p: any) => dist(k, p.o.pos) <= 1))
      .map(([k, n]) => ({ k, ap: apForTiles(n, u.bank || 0, u.movement) })).filter((q) => q.ap + PICKUP_AP <= u.ap).sort((a, b) => a.ap - b.ap)[0];
    if (to) { x.memo.pileWalk = x.cb.round; const a = { type: 'combat/move', to: to.k }; if (!refused(x, a)) return { action: a, kind: 'move', label: 'to a pile (gun dry)' }; }
  }
  // 4. the fists on the weakest foe in reach, else the walk to one
  const inReach = x.foes.map((t) => ({ t, pv: W(x.g, () => previewAttack(x.cb, u, t, 'melee')) })).filter((q) => q.pv.ok && q.pv.ap <= u.ap).sort((a, b) => a.t.hp - b.t.hp);
  for (const q of inReach) { const f = ok(x, { action: { type: 'combat/attack', targetId: q.t.id, mode: 'melee' }, kind: 'attack', label: 'the fists (gun dry)' }); if (f) return f; }
  if (s && s.kind !== 'move') return s;
  const test = (k: string, apLeft: number) => x.foes.some((t) => { const p0 = u.pos, a0 = u.ap; u.pos = k; u.ap = apLeft; try { return W(x.g, () => previewAttack(x.cb, u, t, 'melee')).ok; } finally { u.pos = p0; u.ap = a0; } });
  return fixOrMove(x, [], test) || s;
};
/** A policy with the dry-gun fallback, keeping its plan hook (`after`). */
export const withFallback = (pol: Policy): Policy => { const t = fallback(pol); (t as any).after = (pol as any).after; return t; };

// ---------------------------------------------------------------------------------------------- the Sigilist keeps its range
/** The lead's ruling R4 (16 Nov 2026: 60% of the Sigilist's damage taken was melee; it walked its Lines into the blades).
 * The plain habit of a caster who draws on its own tile: when it plans a new Line while a foe with a melee weapon stands
 * within KEEP tiles, it walks that Line straight away from its target (the Sigil policy's `along` Line: each step to the
 * next glyph is a step back) instead of across the way to it. Measured on the solo Sigilist, 40 seeds (16 Nov 2026):
 * stepping back first to the farthest tile (half its AP) cleared 0% (melee 67% of its damage taken); the Line walked
 * away, KEEP 3 / 5 / always: 3% each, melee 58 / 57 / 55% (was 60%). Kept at 5. A Line under way is not broken off. */
const KEEP = 5;
export const keepRange = (pol: Policy): Policy => { const t: Policy = (x) => {
  const melee = x.foes.filter((f) => isMelee(WEAPON[f.weapon]));
  if (melee.length && !x.memo.plan && Math.min(...melee.map((f) => dist(x.u.pos, f.pos))) <= KEEP) return pol({ ...x, opts: { ...(x.opts || {}), along: true } });
  return pol(x);
}; (t as any).after = (pol as any).after; return t; };

// ---------------------------------------------------------------------------------------------- the Sigilist holds cover (0.33)
/** The 0.33 balance lane (docs/design/handoffs/0.33-LANE-BALANCE.md section 1): the Sigilist from cover, a stand-off
 * under Suppress. Turn logs of the 0.33 solo Sigilist (5 of 40) showed: a caster knocked Prone (a Stopping Shot) asked
 * to walk every turn and was refused "Stand up first" for ten rounds; Lines were walked out of cover into a sentry's
 * Suppress and Burst (41 to 11 HP in one turn); the turn ended in the open with AP left. Each switch is measured
 * (SIG_STAND, SIG_FROMCOVER, SIG_STANDOFF, SIG_ENDCOVER: 0 turns it off):
 *   stand      Prone with AP and a foe: stand up first (the engine's own prone toggle);
 *   fromCover  a new Line's last tile (where it Evokes and waits out the foes' turn) is first sought in cover from every
 *              gun-armed foe that sees it (policies.ts sigil opts.fromCover);
 *   standoff   Pressed (Pressure 2 or more), a step from a covered tile to one in the open is not taken: the Line is
 *              drawn from where it stands, else the pistol, else a Vent or a core;
 *   endCover   a turn that would end in the open, no Line under way, with the AP for it: a step to the nearest covered
 *              tile that still sees no blade beside it. */
const E33 = ((globalThis as any).process?.env || {});
export const SIG033 = { predraw: E33.SIG_PREDRAW !== '0', poor: Number(E33.SIG_POOR ?? 30), stand: E33.SIG_STAND !== '0', fromCover: E33.SIG_FROMCOVER === '1', standoff: E33.SIG_STANDOFF !== '0', endCover: E33.SIG_ENDCOVER !== '0' };
export const SIG033_N = { stood: 0, held: 0, endCover: 0, predraw: 0 };
const gunFoe = (f: any) => { const w: any = WEAPON[f.weapon]; return !!f.caster || (!!w && !isMelee(w) && !!w.ammo); };
/** Is this tile in cover from every gun-armed foe that sees it (none sees it: yes)? */
export function coveredAt(x: Ctx, k: string): boolean {
  return x.foes.filter(gunFoe).every((f) => !W(x.g, () => lineOfSight(x.cb, f.pos, k)) || W(x.g, () => coverBonus(x.cb, f.pos, k)) > 0);
}
const poorShot = (x: Ctx, s: Step): boolean => { const t = x.foes.find((f) => f.id === s.action.targetId); if (!t) return false; const pv: any = W(x.g, () => previewAttack(x.cb, x.u, t, s.action.mode || 'shot')); return !!pv?.ok && pv.pct < SIG033.poor; };
export const sigilHold = (pol: Policy): Policy => { const t: Policy = (x) => {
  const u = x.u;
  if (SIG033.stand && u.prone && u.ap >= 1 && x.foes.length) { const s = ok(x, { action: { type: 'combat/prone' }, kind: 'setup', label: 'stand up' }); if (s) { SIG033_N.stood++; return s; } }
  const x2 = SIG033.fromCover ? { ...x, opts: { ...(x.opts || {}), fromCover: (k: string) => coveredAt(x, k) } } : x;
  let s = pol(x2);
  if (SIG033.standoff && s && s.action.type === 'combat/move' && !x.memo.plan && isPressed(u) && coveredAt(x, u.pos) && !coveredAt(x, s.action.to)) {
    SIG033_N.held++; x.banned.add(JSON.stringify(s.action));
    const p = plainCands(x), b = best(x, p.cands, (c) => c.value); if (b) return b.step;
    if ((u.mg?.flux || 0) > 0) { const v = ok(x, { action: { type: 'combat/vent' }, kind: 'setup', label: 'vent Flux (holding cover)' }); if (v) return v; }
    return null;
  }
  // predraw: a turn that would end (or spend its AP on a pistol shot under SIG033.poor %) with no Line under way starts
  // the next Line on the tile it stands on, when one fits there (Written in Advance: an Evoke after a turn ended with
  // glyphs drawn deals more; the caster stays where it is)
  if (SIG033.predraw && !x.memo.plan && x.foes.length && (!s || (s.action.type === 'combat/attack' && poorShot(x, s)))) {
    const plan0 = x.memo.plan; let d: Step | null = null;
    try { d = pol({ ...x2, opts: { ...(x2.opts || {}), hereOnly: true } }); } catch { d = null; }
    if (d && d.action.type === 'combat/draw' && d.action.tile === u.pos) { SIG033_N.predraw++; return d; }
    x.memo.plan = plan0;
  }
  if (SIG033.endCover && !s && !x.memo.plan && x.foes.length && u.ap >= 1 && !coveredAt(x, u.pos) && x.memo.endCover !== x.cb.round + ':' + x.cb.turn) {
    x.memo.endCover = x.cb.round + ':' + x.cb.turn;
    const P = W(x.g, () => paths(x.cb, u.pos, u.id)), taken = new Set(x.cb.units.filter((v: any) => v.id !== u.id && !v.dead).map((v: any) => v.pos));
    const blade = (k: string) => x.foes.some((f) => isMelee(WEAPON[f.weapon]) && dist(f.pos, k) <= 1);
    const to = Object.entries(P.dist as Record<string, number>).filter(([k, n]) => n > 0 && !taken.has(k) && apForTiles(n, u.bank || 0, u.movement) <= u.ap && !blade(k))
      .sort((a, b) => a[1] - b[1]).find(([k]) => coveredAt(x, k));
    if (to) { const m = ok(x, { action: { type: 'combat/move', to: to[0] }, kind: 'move', label: 'to cover (turn end)' }); if (m) { SIG033_N.endCover++; return m; } }
  }
  return s;
}; (t as any).after = (pol as any).after; return t; };

export const gunnerRun = withFallback(gunner);
Object.assign(POLICIES, { sigilRun: withFallback(keepRange(sigilRun)), outburstRun: withFallback(outburstRun), healerRun: withFallback(healerRun), rigger: withFallback(rigger), gunnerTac: withFallback(gunnerTac), optimisedTac: withFallback(optimisedTac), gunnerRun });
