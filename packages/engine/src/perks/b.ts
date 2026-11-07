// Lane B: movement, stealth and vision. Perks: Into the Dark, Wall Run, Roll With It, Shadow Step, Got You in My
// Sight, Eyes in the Back, Wind on the Skin; Mastered: Skin Map, Never There, Before the Blink, Vanishing Act;
// Achieved: Charge!, Make Way, Sixth Sense, Just the Repairman, Silent Partner, Dead Signal; Ultimates: War Footing,
// Last Charge. Traits: Forlorn Hope, Drill Echo, Ghost Soldier, Lowland Born, Live to Fight Another Day.
//
// Every number the data or the spec doesn't give is provisional and listed in docs/rules/pending/lane-b.md (the open
// items for spec section 14). Randomness comes from the rng the hook passes, else the bound game's rng (g.rng), so the
// engine stays deterministic. What the engine can't run goes to the Narrator: a fight note, a pending ruling, or the
// item's brief() remainder in the character brief.
import { register, stateOf, uses, has, note, postStory, grantPerkAp, bankAp, pushAp, grantShield, boundGame, skillRollMod, type Holder } from '../effects';
import { SKILL, WEAPON } from '../data';
import { type Combat, type Unit, dist, xy, key, refOf, keyOf as refKey, coverOf, coverTileFor, objectsOf, unitSees, visibility, active, alive, sideSees, moveUnit, resolveAttack, previewAttack, apForTiles, isMelee } from '../combat';
import { hide, reveal, seenByFoes, TIER_NOTICE } from '../tactics';
import { applyCond, condOn } from '../magic';
import { type Character, ARMOUR, gearBonus, packOf, mod } from '../character';
import { blocksMove, blocksSight, coverKind, kindOf, type MapObject } from '../objects';
import { d20, die, type Rng } from '../rng';
import { RuleError, zoneTags, positionsOf, npcsOf } from '../game';

// ---------- shared helpers ----------
const ow = (cb: Combat | null | undefined) => !!cb && (cb.overworld || cb.name === 'overworld');
const gameOf = (h: Holder): any => h.g ?? boundGame();
const rngOf = (h: Holder, ctx?: any): Rng | null => ctx?.rng || gameOf(h)?.rng || null;
const turnKey = (cb: Combat) => cb.round + '.' + cb.turn;
const myTurn = (cb: Combat, u: Unit | null | undefined) => !!u && active(cb) === u && !cb.window;
const log = (cb: Combat | null | undefined, s: string) => { if (cb) cb.log.push(s); };
const foesOf = (cb: Combat, u: Unit) => cb.units.filter((v) => v.side !== u.side && alive(v) && !v.companion);
/** The zone the story stands in carries this tag (terrain:open, urban, fear…; campaign zones set them). */
const zoneHas = (g: any, ...tags: string[]) => { if (!g?.story) return false; try { const z = zoneTags(g); return tags.some((t) => z.includes(t)); } catch { return false; } };
/** Is this overworld unit a hostile NPC (storyCb makes every NPC a 'foe' unit)? In a fight every foe is hostile. */
function hostile(h: Holder, cb: Combat, e: Unit): boolean {
  if (!ow(cb)) return e.side !== h.u?.side;
  const g = gameOf(h), n = g ? npcsOf(g).find((x: any) => x.id === e.id) : null;
  return !!n && n.side === 'hostile';
}
const storySneaking = (g: any, c: Character | null | undefined) => !!c && !!g?.story?.sneak?.[c.id] && !!g?.story?.hidden?.[c.id];

/** A Charge! (spec: Charge!; shared by Last Charge and the Lance's charge): every step in the same one of the 8
 * directions, ending next to a visible enemy that the move closed on. Returns the tiles walked and that enemy. */
export function straightCharge(cb: Combat, u: Unit, from: string, route: string[], h?: Holder): { tiles: number; target: Unit } | null {
  if (!route.length) return null;
  const pts = [from, ...route], [x0, y0] = xy(pts[0]), [x1, y1] = xy(pts[1]), dx = x1 - x0, dy = y1 - y0;
  for (let i = 1; i < pts.length - 1; i++) { const [ax, ay] = xy(pts[i]), [bx, by] = xy(pts[i + 1]); if (bx - ax !== dx || by - ay !== dy) return null; }
  const end = pts[pts.length - 1];
  const target = cb.units.find((e) => e.side !== u.side && alive(e) && dist(end, e.pos) <= 1 && dist(from, e.pos) > dist(end, e.pos) && sideSees(cb, u.side, e) && (!h || hostile(h, cb, e)));
  return target ? { tiles: route.length, target } : null;
}
/** Line of sight that sees through smoke (veil zones) and darkness: walls and sight-blocking objects only. */
function losNoVeil(cb: Combat, a: string, b: string): boolean {
  const solid = new Set([...cb.map.solid, ...objectsOf(cb).filter(blocksSight).map((o) => o.pos)]);
  let [x0, y0] = xy(a); const [x1, y1] = xy(b);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy;
  while (!(x0 === x1 && y0 === y1)) { const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } const k = key(x0, y0); if (k !== b && solid.has(k)) return false; }
  return true;
}
/** Hidden enemies within r tiles of a holder are revealed (Skin Map through smoke and dark; Sixth Sense through anything). */
function sweep(h: Holder, cb: Combat, r: number, needLos: boolean, why: string) {
  const u = h.u; if (!u || !alive(u) || ow(cb)) return;
  for (const v of cb.units) if (v.side !== u.side && v.hidden && !v.dead && dist(u.pos, v.pos) <= r && (!needLos || losNoVeil(cb, u.pos, v.pos))) reveal(cb, v, why + ': ' + u.name + ' knows where they are');
}
/** Bank-tile fix after a move whose AP an item cut: the tiles bought stay in the bank as if the AP had been paid. */
function fixBank(h: Holder, ctx: any) { const s = stateOf(h); if (ctx.u === h.u && s.bankFix) { if (ctx.how === 'move') h.u!.bank = (h.u!.bank || 0) + s.bankFix; s.bankFix = 0; } }
const carriesToolbox = (c: Character | null | undefined) => !!c && packOf(c).some((x) => (x.item || x.id) === 'toolbox' && x.qty > 0);

// =====================================================================================================================
// Into the Dark (Guts). I: the first move into ground the squad hasn't seen this fight costs 1 AP less (one Movement of
// tiles free, not Sprint, once a fight; provisional). Overworld: the first move in a zone this character hasn't moved
// in yet. II: +1 AP on the first turn in a place that causes Fear (the Narrator's start_fight fear flag or a zone tag).
// =====================================================================================================================
function noteExplored(h: Holder, cb: Combat) {
  if (!h.u || ow(cb)) return; const s = stateOf(h); if (s.used) return;
  const seen = new Set<string>(s.seen || []); for (const k of visibility(cb, h.u.side).tiles) seen.add(k); s.seen = [...seen];
}
register({
  id: 'into_the_dark', claims: 'all',
  on: {
    combat_start: (ctx, h) => noteExplored(h, ctx.cb),
    turn_start: (ctx, h) => noteExplored(h, ctx.cb),
    move_cost: (ctx, h) => {
      if (ctx.u !== h.u || ctx.how !== 'move' || ctx.ap <= 0) return;
      const cb: Combat = ctx.cb, s = stateOf(h);
      if (ow(cb)) {
        const g = gameOf(h), z = g?.story?.zone || 'start'; const zones: string[] = (s.zones ||= []);
        if (zones.includes(z)) return; zones.push(z);
      } else {
        if (s.used || (s.seen || []).includes(ctx.to)) return;
        if (!uses(h).take('per_combat')) return; s.used = true;
      }
      ctx.ap -= 1; s.bankFix = (s.bankFix || 0) + h.u!.movement;
      log(cb, h.u!.name + ' strides into the dark first (Into the Dark: 1 AP of the move is free).');
    },
    moved: (ctx, h) => {
      fixBank(h, ctx); if (ctx.u === h.u) noteExplored(h, ctx.cb);
      // II on the area map: the first move in a frightening zone gives the +1 AP (no hook for the round's AP yet).
      if (ctx.u === h.u && h.tier === 'II' && ow(ctx.cb)) {
        const g = gameOf(h), s = stateOf(h), z = g?.story?.zone || 'start';
        if (zoneHas(g, 'fear') && !(s.fearZones ||= []).includes(z)) { s.fearZones.push(z); h.u!.ap += 1; log(ctx.cb, h.u!.name + ' +1 AP (Into the Dark: a place that causes Fear).'); }
      }
    },
    turn_start_pre: (ctx, h) => {
      if (ctx.u !== h.u || h.tier !== 'II' || ow(ctx.cb)) return;
      if (!(ctx.cb.fear || zoneHas(gameOf(h), 'fear'))) return;
      if (uses(h).take('per_combat', 1, h.key + '#fear')) pushAp(ctx, 1, 'Into the Dark');
    },
  },
  brief: () => 'Narrator: let them stride into the unknown first; mark frightening places with fear.',
});

// =====================================================================================================================
// Wall Run (Athletics). I: a move may cross up to 2 tiles in a row of wall faces, low obstacles or holes, ending on
// floor. II: up to 4, and one attack from a tile of the run (the Perks tab: Wall Run strike). Never through the inside
// of a building (a blocked tile with every neighbour blocked) or a door. Story: parkour within 3 m / 6 m needs no check.
// =====================================================================================================================
const wallMax = (h: Holder) => (h.tier === 'II' ? 4 : 2);
function runnableTiles(cb: Combat): Set<string> {
  const objs = objectsOf(cb), blocked = new Set<string>([...cb.map.solid, ...objs.filter(blocksMove).map((o) => o.pos)]), out = new Set<string>();
  const doors = new Set(objs.filter((o) => kindOf(o).door).map((o) => o.pos));
  for (const k of blocked) {
    if (doors.has(k)) continue;
    const o = objs.find((x) => x.pos === k && blocksMove(x));
    if (o && coverKind(o) === 'full' && !cb.map.solid.includes(k)) continue; // a pillar is not a wall face
    const [x, y] = xy(k); let open = false;
    for (let dx = -1; dx <= 1 && !open; dx++) for (let dy = -1; dy <= 1; dy++) { if (!dx && !dy) continue; const n = key(x + dx, y + dy), [nx, ny] = xy(n); if (nx >= 0 && ny >= 0 && nx < cb.map.w && ny < cb.map.h && !blocked.has(n)) { open = true; break; } }
    if (open) out.add(k);
  }
  for (const o of objs) if (/hole|pit|gap/.test(o.kind)) out.add(o.pos);
  return out;
}
register({
  id: 'wall_run', claims: 'all',
  on: {
    path_opts: (o, h) => {
      if (o.u !== h.u || !h.u) return;
      const run = runnableTiles(o.cb); for (const k of run) o.runnable.add(k);
      (o.noStop ||= new Set<string>()); for (const k of run) o.noStop.add(k); // for paths() once it honours noStop (lane B notes)
    },
    move_cost: (ctx, h) => {
      if (ctx.u !== h.u) return;
      const s = stateOf(h), run = runnableTiles(ctx.cb); if (!run.size) return;
      let n = s.carry || 0, max = 0; for (const k of ctx.route) { n = run.has(k) ? n + 1 : 0; max = Math.max(max, n); }
      if (!max) return;
      if (max > wallMax(h)) throw new RuleError('Wall Run: at most ' + wallMax(h) + ' tiles of wall or gap in a row.');
      if (run.has(ctx.to) && !s.mid) throw new RuleError('Wall Run: you can\'t stop on a wall or over a gap.');
      s.carry = run.has(ctx.to) ? n : 0;
    },
  },
  actions: [{
    id: 'wall_strike', label: 'Wall Run strike', scope: ['combat'], ap: 0, target: 'enemy',
    text: 'Run up to the tile you pick (it may be on the wall), attack from there, then finish the move on the tile in your choice.',
    available: (h) => (h.tier !== 'II' ? false : true),
    preview: (h, a) => {
      if (!h.cb || !h.u) return {}; if (!a.tile) return { ok: false, why: 'Pick the tile to strike from.' };
      const k = /,/.test(a.tile) ? a.tile : refKey(a.tile, h.cb.map); if (!k) return { ok: false, why: 'Pick the tile to strike from.' };
      return { lines: ['Run to ' + refOf(k) + ', attack, then finish the move' + (a.choice ? ' at ' + refOf(/,/.test(a.choice) ? a.choice : refKey(a.choice, h.cb.map) || a.choice) : '') + '. Each leg pays its own AP.'] };
    },
    run: (h, a, rng) => {
      const cb = h.cb!, u = h.u!, t = cb.units.find((x) => x.id === a.targetId);
      const k = a.tile && (/,/.test(a.tile) ? a.tile : refKey(a.tile, cb.map)); if (!k || !t) return 'Pick a tile and a target.';
      const end = a.choice ? (/,/.test(a.choice) ? a.choice : refKey(a.choice, cb.map)) : null;
      const s = stateOf(h); s.mid = true; s.carry = 0;
      let e: string | null = null;
      try { if (k !== u.pos) e = moveUnit(cb, u, k, rng, 'move'); } finally { s.mid = false; }
      if (e) return e;
      const mode = isMelee(WEAPON[u.weapon]) ? 'melee' : 'shot';
      const pv = previewAttack(cb, u, t, mode); if (!pv.ok) return 'Wall Run strike: ' + pv.why;
      log(cb, u.name + ' strikes mid-run (Wall Run).');
      resolveAttack(cb, rng, u, t, mode, null);
      if (end && end !== u.pos && !u.dead && !u.downed) { e = moveUnit(cb, u, end, rng, 'move'); if (e) return 'Wall Run: can\'t finish the run (' + e + ')'; }
      else if (runnableTiles(cb).has(u.pos)) return 'Wall Run: finish the run on floor (pick the end tile).';
      s.carry = 0;
      return null;
    },
  }],
  brief: (h) => 'Story: runs walls and leaps gaps to ' + (h.tier === 'II' ? '6' : '3') + ' m without a check.',
});

// =====================================================================================================================
// Roll With It (Athletics). A successful dodge is an attack against you that misses. I: 1 free tile (no AP, no
// opportunity attacks); II: 2, and your next attack gets +0.1 on the critical multiplier. Once a round. A miss on your
// own turn (Overwatch on your move) gives the tiles at once; on an enemy's turn they wait for your next turn.
// =====================================================================================================================
register({
  id: 'roll_with_it', claims: 'all',
  on: {
    on_miss: (ctx, h) => {
      if (ctx.tgt !== h.u || !h.u || ctx.att.side === h.u.side || !alive(h.u)) return;
      if (!uses(h).take('per_round')) return;
      const s = stateOf(h), n = h.tier === 'II' ? 2 : 1, now = myTurn(ctx.cb, h.u);
      if (now) { h.u.bank = (h.u.bank || 0) + n; s.free = (s.free || 0) + n; s.freeTurn = turnKey(ctx.cb); } else s.next = n;
      if (h.tier === 'II') s.crit = now ? 'this' : 'next';
      log(ctx.cb, h.u.name + ' rolls with it: ' + n + ' free ' + (n === 1 ? 'tile' : 'tiles') + (now ? '' : ' next turn') + (h.tier === 'II' ? ', +10% Critical damage on the next attack' : '') + '.');
    },
    turn_start: (ctx, h) => {
      if (ctx.u !== h.u) return; const s = stateOf(h);
      if (s.next) { h.u!.bank = (h.u!.bank || 0) + s.next; s.free = s.next; s.freeTurn = turnKey(ctx.cb); s.next = 0; } else s.free = 0;
      if (s.crit === 'next') s.crit = 'this';
    },
    turn_end: (ctx, h) => { if (ctx.u !== h.u) return; const s = stateOf(h); if (s.crit === 'this') s.crit = null; s.free = 0; },
    move_cost: (ctx, h) => {
      if (ctx.u !== h.u || ctx.how !== 'move') return; const s = stateOf(h);
      if (s.free && s.freeTurn === turnKey(ctx.cb) && ctx.ap === 0 && ctx.tiles <= s.free) { ctx.skipOA = true; s.free -= ctx.tiles; }
    },
    damage_out: (ctx, h) => {
      if (ctx.att !== h.u || !ctx.crit || stateOf(h).crit !== 'this') return;
      const m = ctx.mults.find((x: any) => x.label === 'critical'); if (m) { m.v = Math.round((m.v + 0.1) * 100) / 100; m.label = 'critical (+0.1 Roll With It)'; }
    },
    on_hit: (ctx, h) => { if (ctx.att === h.u && stateOf(h).crit === 'this') stateOf(h).crit = null; },
  },
  brief: () => null,
});
// The attacker's own miss also spends the armed crit bonus (registered as a second handler so on_miss stays one rule).
register({ id: 'roll_with_it', on: { on_miss: (ctx, h) => { if (ctx.att === h.u && stateOf(h).crit === 'this') stateOf(h).crit = null; } } });

// =====================================================================================================================
// Shadow Step (Ingenuity). I: while Hidden, a move from a tile next to cover to a tile next to cover counts half its
// tiles (AP rounded up). Area map: sneaking cover to cover halves the tiles for both the move and the sneak surcharge.
// II: when an attack reveals you, roll Ingenuity (d20 + mod) against 10 + the best notice among enemies who can see
// you, +2 for each earlier success this fight (plan 6a-8); on a success you stay Hidden (no new ambush).
// =====================================================================================================================
const nextToCover = (cb: Combat, k: string) => { const cov = coverOf(cb); return Object.keys(cov).some((c) => dist(c, k) === 1); };
register({
  id: 'shadow_step', claims: 'all',
  on: {
    world_move_cost: (ctx, h) => { if (ctx.c === h.c) stateOf(h).owHow = ctx.how; },
    move_cost: (ctx, h) => {
      if (ctx.u !== h.u || ctx.how !== 'move') return;
      const cb: Combat = ctx.cb, g = gameOf(h), s = stateOf(h);
      const hidden = ow(cb) ? storySneaking(g, h.c) && s.owHow === 'sneak' : !!h.u!.hidden;
      if (!hidden || !nextToCover(cb, ctx.from) || !nextToCover(cb, ctx.to)) return;
      const half = Math.ceil(ctx.tiles / 2), ap = ow(cb) ? apForTiles(half, 0, h.u!.movement) : apForTiles(half, h.u!.bank || 0, h.u!.movement);
      if (ap < ctx.ap) { s.bankFix = (s.bankFix || 0) + (ctx.ap - ap) * h.u!.movement; ctx.ap = ap; }
      if (ow(cb)) s.refund = ctx.tiles - half; // the sneak surcharge is 1 AP a tile: half the tiles, half the surcharge
      log(cb, h.u!.name + ' slips from cover to cover (Shadow Step: half the tiles).');
    },
    moved: (ctx, h) => { fixBank(h, ctx); const s = stateOf(h); if (ctx.u === h.u && s.refund) { h.u!.ap += s.refund; s.refund = 0; } if (ctx.u === h.u) s.owHow = null; },
    spotted: (ctx, h) => {
      if (h.tier !== 'II' || ctx.u !== h.u || ctx.why !== 'attacked' || !h.u || h.u.dead) return;
      const cb: Combat = ctx.cb, rng = rngOf(h); if (!rng) return;
      const eyes = foesOf(cb, h.u).filter((v) => unitSees(cb, v, h.u!.pos)), s = stateOf(h);
      const best = eyes.reduce((m, v) => Math.max(m, TIER_NOTICE[v.tier || 'minion'] ?? 0), 0), tn = 10 + best + 2 * (s.stayed || 0);
      const m = (h.u.ingMod ?? (h.c ? mod(h.c.skills.ingenuity || 0) : -2)) + (h.u.sk?.ingenuity || 0);
      let ok = true, line = '';
      if (eyes.length) { const d = d20(rng); ok = d === 20 || (d !== 1 && d + m >= tn); line = ': d20 ' + d + ' ' + (m >= 0 ? '+' : '−') + Math.abs(m) + ' vs ' + tn; }
      if (!ok) { log(cb, h.u.name + ' tries to melt back into cover (Shadow Step' + line + ' · seen).'); return; }
      s.stayed = (s.stayed || 0) + 1;
      h.u.hidden = true; // the same Hidden entry: no new ambush
      for (const side of ['pc', 'foe']) if (side !== h.u.side) ((cb.lastSeen ||= {})[side] ||= {})[h.u.id] = h.u.pos;
      log(cb, h.u.name + ' melts back into cover (Shadow Step' + line + ' · stays Hidden).');
    },
  },
  actions: [{ id: 'use', label: 'Shadow Step', scope: ['combat'], ap: 0, target: 'none', available: () => false, run: () => null }],
  brief: () => null,
});

// =====================================================================================================================
// Got You in My Sight (Vigilant). I: an enemy you see hide, or one that leaves your sight: +2 AP now on your turn,
// banked if your turn is still to come this round (once a round, provisional). A sneak attack (an ambush) that hits
// you: −2 AP next turn. II: no penalty, and the squad keeps the enemy's last position (cb.lastSeen).
// =====================================================================================================================
function gotYou(h: Holder, cb: Combat, foe: Unit, at: string) {
  const u = h.u!;
  if (h.tier === 'II') ((cb.lastSeen ||= {})[u.side] ||= {})[foe.id] = at;
  if (myTurn(cb, u)) { if (uses(h).take('per_round')) grantPerkAp(cb, u, 2, 'Got You in My Sight: ' + foe.name); return; }
  const mine = cb.order.indexOf(u.id);
  if (mine > cb.turn && uses(h).take('per_round')) bankAp(u, 2, 'Got You in My Sight: ' + foe.name, cb);
}
function sightSnap(h: Holder, cb: Combat): Record<string, string> { const out: Record<string, string> = {}; for (const f of foesOf(cb, h.u!)) if (!f.hidden && unitSees(cb, h.u!, f.pos)) out[f.id] = f.pos; return out; }
register({
  id: 'got_you_in_my_sight', claims: 'all',
  on: {
    combat_start: (ctx, h) => { if (h.u && !ow(ctx.cb)) stateOf(h).saw = sightSnap(h, ctx.cb); },
    turn_start: (ctx, h) => { if (h.u && !ow(ctx.cb) && alive(h.u)) stateOf(h).saw = sightSnap(h, ctx.cb); },
    moved: (ctx, h) => {
      const cb: Combat = ctx.cb; if (!h.u || ow(cb) || !alive(h.u)) return;
      const s = stateOf(h), was: Record<string, string> = s.saw || {}, now = sightSnap(h, cb);
      for (const [id, at] of Object.entries(was)) { const f = cb.units.find((x) => x.id === id); if (f && alive(f) && !now[id]) { gotYou(h, cb, f, at); break; } }
      s.saw = now;
    },
    hide: (ctx, h) => {
      const cb: Combat = ctx.cb; if (!h.u || ow(cb) || !alive(h.u) || ctx.u.side === h.u.side) return;
      if (unitSees(cb, h.u, ctx.u.pos)) gotYou(h, cb, ctx.u, ctx.u.pos);
    },
    attack_roll: (ctx, h) => { if (ctx.tgt === h.u && ctx.ambush && h.tier !== 'II') stateOf(h).sneak = true; },
    on_hit: (ctx, h) => { if (ctx.tgt === h.u) { const s = stateOf(h); if (s.sneak) { s.pen = 2; s.sneak = false; log(ctx.cb, h.u!.name + ' is caught by a sneak attack: −2 AP next turn (Got You in My Sight).'); } } },
    on_miss: (ctx, h) => { if (ctx.tgt === h.u) stateOf(h).sneak = false; },
    turn_start_pre: (ctx, h) => { if (ctx.u !== h.u) return; const s = stateOf(h); if (s.pen) { pushAp(ctx, -s.pen, 'sneak attack (Got You in My Sight)'); s.pen = 0; } },
  },
  brief: () => 'Area map: an NPC slipping from their sight gives +2 AP that round (Narrator).',
});

// =====================================================================================================================
// Eyes in the Back (Vigilant). I: you can't be flanked: half cover next to you counts against a ranged attack from
// any direction. II: allies next to you too. (A carried shield's frontal cover is not built yet: see the notes.)
// =====================================================================================================================
register({
  id: 'eyes_in_the_back', claims: 'all',
  on: {
    attack_preview: (ctx, h) => {
      const t: Unit = ctx.tgt, cb: Combat = ctx.cb, u = h.u; if (!u || ctx.melee || ctx.ignoreCover || ctx.att.side === t.side) return;
      if (t !== u && !(h.tier === 'II' && t.side === u.side && alive(u) && dist(t.pos, u.pos) <= 1)) return;
      if ((WEAPON[ctx.att.weapon]?.properties || []).includes('ignores_half_cover')) return;
      if (coverTileFor(cb, ctx.att.pos, t.pos)) return; // the cover already faces the shot
      if (ctx.terms.some((x: any) => /Eyes in the Back/.test(x.label))) return;
      const cov = coverOf(cb); if (!Object.entries(cov).some(([k, c]) => c.kind === 'half' && dist(k, t.pos) === 1)) return;
      ctx.terms.push({ v: -5, label: 'half cover (Eyes in the Back: no flanking)' });
    },
  },
  brief: () => null,
});

// =====================================================================================================================
// Wind on the Skin (Sensory). When a fight starts, I: the squad learns where the nearest enemy it can't see within
// your Vision range is; II: every one. A known position (cb.lastSeen), not sight: you still can't target it.
// =====================================================================================================================
register({
  id: 'wind_on_the_skin', claims: 'all',
  on: {
    combat_start: (ctx, h) => {
      const cb: Combat = ctx.cb, u = h.u; if (!u || ow(cb) || !alive(u)) return;
      const seen = visibility(cb, u.side).seen, range = u.vision || 12;
      const cand = foesOf(cb, u).filter((f) => !seen.has(f.id) && dist(u.pos, f.pos) <= range).sort((a, b) => dist(u.pos, a.pos) - dist(u.pos, b.pos));
      const pick = h.tier === 'II' ? cand : cand.slice(0, 1); if (!pick.length) return;
      const ls = ((cb.lastSeen ||= {})[u.side] ||= {}); for (const f of pick) ls[f.id] = f.pos;
      log(cb, u.name + ' feels the air move (Wind on the Skin): ' + pick.map((f) => 'an enemy at ' + refOf(f.pos)).join(', ') + '.');
    },
  },
  brief: () => 'Area map: on arrival, hidden hostiles in sight range are sensed (Narrator).',
});

// =====================================================================================================================
// Skin Map (Mastered, Sensory 10). Within 6 tiles nothing hides from you: Hidden enemies there are revealed when you
// have a line to them through smoke and dark (walls still stop it). Sixth Sense (Achieved): within 3 tiles, through
// anything. Both run at every turn start, after every move and the moment someone hides near you.
// =====================================================================================================================
const SKIN = 6, SIXTH = 3;
register({
  id: 'skin_map', claims: 'all',
  on: { turn_start: (ctx, h) => sweep(h, ctx.cb, SKIN, true, 'Skin Map'), moved: (ctx, h) => sweep(h, ctx.cb, SKIN, true, 'Skin Map'), hide: (ctx, h) => sweep(h, ctx.cb, SKIN, true, 'Skin Map'), combat_start: (ctx, h) => sweep(h, ctx.cb, SKIN, true, 'Skin Map') },
  brief: () => 'Nothing within 9 m surprises them; they know who is in a dark room.',
});
register({
  id: 'sixth_sense', claims: 'all',
  on: { turn_start: (ctx, h) => sweep(h, ctx.cb, SIXTH, false, 'Sixth Sense'), moved: (ctx, h) => sweep(h, ctx.cb, SIXTH, false, 'Sixth Sense'), hide: (ctx, h) => sweep(h, ctx.cb, SIXTH, false, 'Sixth Sense'), combat_start: (ctx, h) => sweep(h, ctx.cb, SIXTH, false, 'Sixth Sense') },
  brief: () => 'No ambush or tail within 4 m of them goes unnoticed (Narrator reveals it).',
});

// =====================================================================================================================
// Never There (Mastered, Athletics 10). The first move action of each turn (Move, Sprint, Disengage) draws no
// opportunity attacks and no Overwatch; during any later move that turn, ranged reactions against you take −4.
// =====================================================================================================================
register({
  id: 'never_there', claims: 'all',
  on: {
    move_cost: (ctx, h) => {
      if (ctx.u !== h.u) return; const s = stateOf(h);
      if (uses(h).take('per_turn', 1, h.key + '#first')) { ctx.skipOA = true; ctx.skipOW = true; s.moving = false; return; }
      s.moving = true;
    },
    moved: (ctx, h) => { if (ctx.u === h.u) stateOf(h).moving = false; },
    attack_preview: (ctx, h) => { if (ctx.tgt === h.u && !ctx.melee && stateOf(h).moving) ctx.terms.push({ v: -4, label: 'Never There' }); },
  },
  brief: () => null,
});

// =====================================================================================================================
// Before the Blink (Mastered, Reaction Speed 10). Round 1: holders act first, in their initiative order; from round 2
// the normal order. A second reaction each round.
// =====================================================================================================================
register({
  id: 'before_the_blink', claims: 'all',
  stat: (h, stat) => (stat === 'reactions' ? 1 : 0),
  on: {
    combat_start: (ctx, h) => {
      const cb: Combat = ctx.cb; if (!h.u || ow(cb)) return;
      const s = stateOf(h); s.orig = [...cb.order];
      const first = ctx.order.filter((id: string) => { const u = cb.units.find((x) => x.id === id); return !!u && has(u, 'before_the_blink'); });
      ctx.order = [...first, ...ctx.order.filter((id: string) => !first.includes(id))];
      if (first[0] === h.u.id) log(cb, first.map((id: string) => cb.units.find((x) => x.id === id)!.name).join(', ') + ' moves before the blink: first in round 1.');
    },
    round_start: (ctx, h) => {
      const cb: Combat = ctx.cb, s = stateOf(h); if (ctx.round !== 2 || !s.orig) return;
      const ids = new Set(cb.order), orig = (s.orig as string[]).filter((id) => ids.has(id));
      cb.order = [...orig, ...cb.order.filter((id) => !orig.includes(id))]; delete s.orig;
    },
  },
  brief: () => null,
});

// =====================================================================================================================
// Vanishing Act (Mastered, Ingenuity 10). 2 AP, once a fight: become Hidden where you stand, even in plain view (your
// next attack is an ambush). Any attack reveals you, even a silent one (the perk wins over the silent-weapon rule;
// provisional), as does a shove, a released Outburst, taking damage, or an enemy ending a move next to you. Area map:
// once a scene, 2 AP: you are sneaking and hidden, and only someone who walks up to you can notice you.
// =====================================================================================================================
const vanished = (h: Holder) => { const s = stateOf(h); return !!h.u?.hidden && s.entry != null && s.entry === h.u.hideEntry; };
register({
  id: 'vanishing_act', claims: 'all',
  on: {
    on_hit: (ctx, h) => { if (ctx.att === h.u && vanished(h)) reveal(ctx.cb, h.u!, 'attacked'); },
    on_miss: (ctx, h) => { if (ctx.att === h.u && vanished(h)) reveal(ctx.cb, h.u!, 'attacked'); },
    forced_move: (ctx, h) => { if (ctx.by === h.u && vanished(h)) reveal(ctx.cb, h.u!, 'shoved'); },
    outburst_release: (ctx, h) => { if (ctx.u === h.u && vanished(h)) reveal(ctx.cb, h.u!, 'released an Outburst'); },
    moved: (ctx, h) => { if (h.u && ctx.u.side !== h.u.side && vanished(h) && dist(ctx.to, h.u.pos) <= 1) reveal(ctx.cb, h.u, ctx.u.name + ' walks into them'); },
    notice: (ctx, h) => {
      if (ctx.c !== h.c) return; const g = gameOf(h), s = stateOf(h);
      if (s.scene != null && s.scene === g?.story?.scene?.n && storySneaking(g, h.c)) ctx.range = 0; // only someone next to you
    },
  },
  actions: [
    {
      id: 'vanishing_act', label: 'Vanishing Act', scope: ['combat'], ap: 2, uses: { per: 'per_combat', n: 1 }, target: 'none',
      text: 'Drop out of sight where you stand, even in plain view. Hidden until you attack or someone touches you.',
      available: (h) => (h.u?.hidden ? 'Already Hidden.' : h.u && condOn(h.u, 'marked') ? 'Marked: you can\'t hide.' : true),
      run: (h) => { const cb = h.cb!, u = h.u!; const out = hide(cb, u, 'Vanishing Act'); if (!u.hidden) return 'You can\'t hide now.'; stateOf(h).entry = u.hideEntry; log(cb, u.name + ' is simply gone' + out + '.'); return null; },
    },
    {
      id: 'vanish', label: 'Vanishing Act', scope: ['world'], ap: 2, uses: { per: 'per_scene', n: 1 }, target: 'none',
      text: 'Once a scene: vanish in plain view. Sneaking and hidden; only someone who walks up to you can notice you.',
      run: (h) => {
        const g = gameOf(h), c = h.c; if (!g || !c) return 'Not here.';
        (g.story.sneak ||= {})[c.id] = true; (g.story.hidden ||= {})[c.id] = true; stateOf(h).scene = g.story.scene?.n;
        log(h.cb, c.name + ' is simply gone (Vanishing Act).'); return null;
      },
    },
  ],
  brief: () => null,
});

// =====================================================================================================================
// Charge! (Achieved). Once a turn, a normal move of 3+ tiles in one straight line ending next to a visible enemy it
// closed on: up to 3 AP of the move is free (plan: the +3 cap; provisional), the rest is paid.
// =====================================================================================================================
const CHARGE_AP_CAP = 3;
register({
  id: 'charge', claims: 'all',
  on: {
    move_cost: (ctx, h) => {
      if (ctx.u !== h.u || ctx.how !== 'move' || ctx.ap <= 0) return;
      const sc = straightCharge(ctx.cb, h.u!, ctx.from, ctx.route, h); if (!sc || sc.tiles < 3) return;
      if (!uses(h).take('per_turn')) return;
      const save = Math.min(ctx.ap, CHARGE_AP_CAP); ctx.ap -= save; const s = stateOf(h); s.bankFix = (s.bankFix || 0) + save * h.u!.movement;
      log(ctx.cb, h.u!.name + ' charges ' + sc.target.name + ' (Charge!: ' + save + ' AP of the move is free).');
    },
    moved: (ctx, h) => fixBank(h, ctx),
  },
  brief: () => null,
});

// =====================================================================================================================
// Make Way (Achieved). No opportunity attacks (the generic immunity op runs it; Overwatch still fires, provisional).
// Area map: neutral NPC tokens don't block your path (through, never onto). Crowds part: the Narrator.
// =====================================================================================================================
register({
  id: 'make_way',
  on: {
    path_opts: (o, h) => {
      if (o.u !== h.u || !ow(o.cb)) return; const g = gameOf(h); if (!g) return;
      for (const n of npcsOf(g)) if (n.side === 'neutral') o.pass.add(n.id);
    },
  },
  brief: () => 'Crowds part for them.',
});

// =====================================================================================================================
// War Footing (Ultimate: Charge! + Make Way). Any enemy that ends a move (not a Disengage) next to you loses 2 AP at
// once, once per enemy a turn. A failed Intimidation check costs nothing: no complication, a natural 1 is just a
// failure, and the target is simply unmoved; no second try on the same target this scene (provisional). In a fight a
// Threaten already can't backfire (it's the target's save).
// =====================================================================================================================
const intimidates = (ck: any) => (ck?.skills || []).includes('intimidation');
register({
  id: 'war_footing', claims: 'all',
  on: {
    moved: (ctx, h) => {
      const u = h.u, m: Unit = ctx.u; if (!u || !alive(u) || m.side === u.side || ctx.how === 'disengage' || ctx.forced || dist(ctx.to, u.pos) > 1) return;
      if (!uses(h).take('per_turn', 1, h.key + '|' + m.id)) return;
      const lost = Math.min(2, Math.max(0, m.ap)); m.ap = Math.max(0, m.ap - 2);
      log(ctx.cb, m.name + ' steps into ' + u.name + '\'s reach and falters: −' + lost + ' AP (War Footing).');
    },
    check_post: (ctx, h) => {
      if (ctx.c !== h.c || !intimidates(ctx.ck)) return;
      const g = gameOf(h), s = stateOf(h), who = String(ctx.ck.target || ctx.ck.npc || ''), scene = g?.story?.scene?.n;
      if (who && s.unmoved?.[who] === scene && ctx.auto !== 'success') { ctx.auto = 'fail'; ctx.labels.push('War Footing: ' + who + ' is unmoved this scene'); return; }
      const ok = ctx.auto === 'success' || (ctx.auto !== 'fail' && (ctx.die === 20 || (ctx.die !== 1 && ctx.die + ctx.mod >= ctx.tn)));
      if (!ok) ctx.labels.push('costs nothing (War Footing)');
    },
    check_result: (ctx, h) => {
      if (ctx.c !== h.c || !intimidates(ctx.ck) || !ctx.roll || ctx.roll.ok) return;
      ctx.roll.fumble = false; ctx.roll.noCost = true;
      const g = gameOf(h), who = String(ctx.ck.target || ctx.ck.npc || ''); if (who) (stateOf(h).unmoved ||= {})[who] = g?.story?.scene?.n;
      note(h, 'This failed Intimidation costs nothing: no complication; ' + (who || 'the target') + ' is simply unmoved.');
    },
  },
  brief: () => 'A failed Intimidation never backfires: narrate no complication.',
});

// =====================================================================================================================
// Last Charge (Ultimate: Charge! + Cultured). A straight charge (Charge!'s rule) of 5+ tiles at an enemy: a shield of
// max(15, 15 × Armour Class) until your next turn starts, once a fight (the fix for the per-turn loop; provisional),
// and melee hits for the rest of that turn deal ×1.5.
// =====================================================================================================================
register({
  id: 'last_charge', claims: 'all',
  on: {
    moved: (ctx, h) => {
      if (ctx.u !== h.u || ctx.how !== 'move' || ow(ctx.cb)) return;
      const sc = straightCharge(ctx.cb, h.u!, ctx.from, ctx.route, h); if (!sc || sc.tiles < 5) return;
      const s = stateOf(h), cb: Combat = ctx.cb; s.melee = turnKey(cb);
      let line = h.u!.name + ' hits the line at full tilt (Last Charge: ×1.5 melee this turn';
      if (uses(h).take('per_combat', 1, h.key + '#shield')) {
        const ac = h.c?.armourClass || 0, n = Math.max(15, 15 * ac), before = h.u!.shield || 0;
        grantShield(cb, h.u!, n, h.u!); s.shield = Math.max(0, (h.u!.shield || 0) - before); line += ', a ' + s.shield + ' shield until next turn';
      }
      log(cb, line + ').');
    },
    damage_out: (ctx, h) => { if (ctx.att === h.u && ctx.melee && stateOf(h).melee === turnKey(ctx.cb)) ctx.mults.push({ v: 1.5, label: 'Last Charge' }); },
    turn_start: (ctx, h) => {
      if (ctx.u !== h.u) return; const s = stateOf(h); s.melee = null;
      if (s.shield) { const take = Math.min(s.shield, h.u!.shield || 0); h.u!.shield = Math.max(0, (h.u!.shield || 0) - take); s.shield = 0; }
    },
  },
  brief: () => null,
});

// =====================================================================================================================
// Just the Repairman (Achieved). Spotted while sneaking with a toolbox in the pack: 50% the observer takes you for
// maintenance staff: you stay hidden to them and they don't check again this scene (in a fight: this fight) unless you
// attack. The d100 is rolled before the Ingenuity roll and a 50 or less passes it (the same odds; see the notes).
// =====================================================================================================================
register({
  id: 'just_the_repairman', claims: 'all',
  on: {
    stay_hidden: (ctx, h) => {
      if (ctx.c !== h.c || !carriesToolbox(h.c)) return;
      const g = gameOf(h); if (!g) return; const s = stateOf(h), scene = g.story?.scene?.n, nid = ctx.npc?.id;
      if (nid && (s.passed ||= {})[nid] === scene) { ctx.tn = -99; return; }
      const r = die(g.rng, 100); if (r > 50) return;
      if (nid) s.passed[nid] = scene; ctx.tn = -99;
      postStory(h, (ctx.npc?.name || 'The guard') + ' takes them for maintenance staff (d100 ' + r + ' ≤ 50).', { kind: 'system' });
      note(h, (ctx.npc?.name || 'a guard') + ' took ' + h.c!.name + ' for maintenance staff: the cover holds until they act unlike a repairman.');
    },
    spot: (ctx, h) => {
      if (ctx.u !== h.u || !carriesToolbox(h.c)) return; const s = stateOf(h), by: Unit = ctx.by;
      if ((s.passed ||= {})[by.id]) { ctx.cancel = true; return; }
      const r = die(ctx.rng, 100); if (r > 50) return;
      s.passed[by.id] = true; ctx.cancel = true; log(ctx.cb, by.name + ' sees ' + h.u!.name + ' and takes them for maintenance staff (Just the Repairman, d100 ' + r + ' ≤ 50).');
    },
    attack_roll: (ctx, h) => { if (ctx.att === h.u) stateOf(h).passed = {}; },
  },
  brief: () => 'Narrator: how long the maintenance-staff cover holds when they talk.',
});

// =====================================================================================================================
// Silent Partner (Achieved). One ally next to you shares your stealth. Fight: when you hide, the nearest ally next to
// you hides with you; they lose it when they end a move away from you, and when you are found. Area map: while you
// sneak hidden, your partner (the nearest sneaking ally next to you) uses your Dexterity for notice range and your
// Ingenuity to stay hidden; a fight from ambush opens with both hidden.
// =====================================================================================================================
function storyPartner(h: Holder): Character | null {
  const g = gameOf(h), c = h.c; if (!g || !c || !storySneaking(g, c)) return null;
  const pos = positionsOf(g), me = pos[c.id]; if (!me) return null;
  const allies = Object.values(g.characters as Record<string, Character>).filter((x) => x.id !== c.id && !x.dead && pos[x.id] && dist(pos[x.id], me) <= 1).sort((a, b) => a.id.localeCompare(b.id));
  return allies[0] || null;
}
register({
  id: 'silent_partner', claims: 'all', priority: 160,
  on: {
    hide: (ctx, h) => {
      const cb: Combat = ctx.cb, u = h.u, s = stateOf(h); if (!u || ctx.u !== u || ow(cb) || s.busy) return;
      const ally = cb.units.filter((v) => v !== u && v.side === u.side && alive(v) && !v.hidden && dist(v.pos, u.pos) <= 1).sort((a, b) => cb.units.indexOf(a) - cb.units.indexOf(b))[0];
      if (!ally) return;
      s.busy = true; try { const out = hide(cb, ally, 'Silent Partner'); if (ally.hidden) { s.partner = ally.id; log(cb, ally.name + ' moves with ' + u.name + out + '.'); } } finally { s.busy = false; }
    },
    moved: (ctx, h) => {
      const s = stateOf(h), cb: Combat = ctx.cb; if (!h.u) return;
      if (ow(cb)) {
        // Area map: a sneaking partner next to you while you sneak hidden is hidden with you.
        const p = storyPartner(h), g = gameOf(h);
        if (p && (ctx.u === h.u || ctx.u.charId === p.id) && g?.story?.sneak?.[p.id]) (g.story.hidden ||= {})[p.id] = true;
        return;
      }
      if (!s.partner) return; const p = cb.units.find((x) => x.id === s.partner);
      if (p && p.hidden && (ctx.u === p || ctx.u === h.u) && dist(p.pos, h.u.pos) > 1) { reveal(cb, p, 'left ' + h.u.name + '\'s side'); s.partner = null; }
    },
    spotted: (ctx, h) => {
      const s = stateOf(h), cb: Combat = ctx.cb; if (ctx.u !== h.u || !s.partner || h.u!.hidden) return;
      const p = cb.units.find((x) => x.id === s.partner); if (p?.hidden) reveal(cb, p, 'found with ' + h.u!.name); s.partner = null;
    },
    notice: (ctx, h) => {
      if (ctx.c === h.c) return; const p = storyPartner(h); if (!p || p.id !== ctx.c.id) return;
      const diff = mod(ctx.c.skills.dexterity || 0) - mod(h.c!.skills.dexterity || 0);
      ctx.range = Math.max(1, Math.floor(ctx.range + (ctx.dark ? diff / 2 : diff)));
    },
    stay_hidden: (ctx, h) => {
      if (ctx.c === h.c) return; const p = storyPartner(h); if (!p || p.id !== ctx.c.id) return;
      ctx.mod = mod(h.c!.skills.ingenuity || 0) + skillRollMod({ c: h.c! }, 'ingenuity', { roll: 'stealth' }).add;
    },
  },
  brief: () => null,
});

// =====================================================================================================================
// Dead Signal (Achieved). In stealth (Hidden, or seen by no enemy; area map: sneaking hidden), 1 AP: silently disable
// one electronic device within 3 tiles (terminal, lamp, camera, alarm, emplaced turret, electronic lock). A lamp goes
// dark, a lock opens; what else the device did is the Narrator's.
// =====================================================================================================================
function inStealth(h: Holder): boolean | string {
  const cb = h.cb, u = h.u; if (!u) return 'Not here.';
  if (cb && ow(cb)) return storySneaking(gameOf(h), h.c) ? true : 'Only while sneaking unseen.';
  if (!cb) return 'Not here.';
  return u.hidden || !seenByFoes(cb, u) ? true : 'Only while in stealth (Hidden, or out of every enemy\'s sight).';
}
function deviceAt(h: Holder, a: any): MapObject | null {
  const cb = h.cb; if (!cb) return null; const objs = objectsOf(cb);
  const id = a.choice; if (id) { const o = objs.find((x) => x.id === id); if (o) return o; }
  const k = a.tile && (/,/.test(a.tile) ? a.tile : refKey(a.tile, cb.map)); if (!k) return null;
  return objs.find((x) => x.pos === k && (kindOf(x) as any).electronic && !(x as any).disabled) || objs.find((x) => x.pos === k) || null;
}
register({
  id: 'dead_signal', claims: 'all',
  actions: [{
    id: 'disable_device', label: 'Dead Signal', scope: ['combat', 'world'], ap: 1, target: 'object', range: 3,
    text: 'In stealth, 1 AP: silently disable one electronic device within 3 tiles.',
    available: (h) => inStealth(h),
    preview: (h, a) => {
      const o = deviceAt(h, a); if (!o) return { ok: false, why: 'Pick an electronic device.' };
      if (!(kindOf(o) as any).electronic) return { ok: false, why: o.name + ' isn\'t electronic.' };
      if ((o as any).disabled) return { ok: false, why: o.name + ' is already dead.' };
      if (h.u && dist(h.u.pos, o.pos) > 3) return { ok: false, why: 'Out of range (3 tiles).' };
      return { lines: ['Disable the ' + o.name.toLowerCase() + ' at ' + refOf(o.pos) + ', silently.'], tiles: [o.pos] };
    },
    run: (h, a) => {
      const o = deviceAt(h, a)!, cb = h.cb!, k: any = o; k.disabled = true;
      if (kindOf(o).light) k.hp = 0; // a dead lamp lights nothing (lightOf reads hp; see the notes)
      if (o.locked) o.locked = false;
      log(cb, (h.c?.name || h.u!.name) + ' kills the ' + o.name.toLowerCase() + ' at ' + refOf(o.pos) + ' without a sound (Dead Signal).');
      note(h, 'Dead Signal: the ' + o.name.toLowerCase() + ' at ' + refOf(o.pos) + ' is silently disabled; nobody noticed. What it ran is yours.');
      return null;
    },
  }],
  brief: () => null,
});

// =====================================================================================================================
// Forlorn Hope (trait). Charge: end a turn nearer the nearest living enemy than you started it: +2 AP next turn
// (banked: it shares the +3 cap). No Way Back: no Disengage (the generic forbid), no Retreat; armour past Class I
// gives nothing (the unit's armour is capped at Class I's 5, slot pieces included; see the notes for equip).
// =====================================================================================================================
const nearestFoe = (cb: Combat, u: Unit) => foesOf(cb, u).reduce((m, f) => Math.min(m, dist(u.pos, f.pos)), Infinity);
register({
  id: 'forlorn_hope', kind: 'trait', claims: [0, 1, 2],
  stat: (h, stat) => {
    if (stat !== 'armor' || !h.c) return 0;
    const base = (ARMOUR[h.c.armourClass]?.value || 0) + gearBonus(h.c, 'armour_bonus'), cap = ARMOUR[1]?.value ?? 5;
    return base > cap ? cap - base : 0;
  },
  on: {
    turn_start: (ctx, h) => { if (ctx.u === h.u && !ow(ctx.cb)) stateOf(h).d0 = nearestFoe(ctx.cb, h.u!); },
    turn_end: (ctx, h) => {
      if (ctx.u !== h.u || ow(ctx.cb) || !alive(h.u!)) return; const s = stateOf(h), d1 = nearestFoe(ctx.cb, h.u!);
      if (Number.isFinite(s.d0) && d1 < s.d0) bankAp(h.u!, 2, 'Forlorn Hope: closer to the enemy', ctx.cb);
    },
  },
  brief: () => 'Never offer them a retreat or a way to fall back.',
});

// =====================================================================================================================
// Live to Fight Another Day (trait). Disengage is free once a turn (plan 6a: unlimited free Disengage was unlimited
// movement; provisional); Retreat (the Perks tab) is a Sprint that ends farther from every enemy you can see, 0 AP,
// no opportunity attacks, once a fight (provisional). Either gives Withdrawing (+2 Defense until your next turn ends).
// Yellow: allies within 3 tiles (not you) take −1 on saves against Fear.
// =====================================================================================================================
register({
  id: 'live_to_fight_another_day', kind: 'trait', claims: 'all',
  stat: (h, stat, ctx) => (stat === 'ap_cost:disengage' && uses(h).left('per_turn', 1, h.key + '#dis') > 0 ? -(ctx?.base ?? 1) : 0),
  on: {
    move_cost: (ctx, h) => { if (ctx.u === h.u && stateOf(h).retreat) { ctx.ap = 0; ctx.skipOA = true; } },
    moved: (ctx, h) => {
      if (ctx.u !== h.u || ow(ctx.cb)) return; const s = stateOf(h);
      if (ctx.how === 'disengage') uses(h).take('per_turn', 1, h.key + '#dis');
      if ((ctx.how === 'disengage' || s.retreat) && ctx.rng && !h.u!.dead) { const out = applyCond(ctx.cb, ctx.rng, h.u!, h.u!, 'withdrawing', undefined, undefined, { skipSave: true }); if (out) log(ctx.cb, h.u!.name + ' falls back' + out + ' (Live to Fight Another Day).'); }
    },
    cond_apply: (ctx, h) => {
      const t: Unit = ctx.t; if (ctx.id !== 'fear' || !h.u || t === h.u || t.side !== h.u.side || !alive(h.u) || dist(t.pos, h.u.pos) > 3) return;
      ctx.saveAdd -= 1; ctx.why = (ctx.why ? ctx.why + ', ' : '') + 'Yellow';
    },
  },
  actions: [{
    id: 'retreat', label: 'Retreat', scope: ['combat'], ap: 0, uses: { per: 'per_combat', n: 1 }, target: 'tile',
    text: 'Sprint to a tile farther from every enemy you can see: 0 AP, no opportunity attacks, then +2 Defense.',
    available: (h) => (h.u && has(h.u, 'forlorn_hope') ? 'No Way Back.' : h.u?.sprinted ? 'One Sprint a turn.' : true),
    preview: (h, a) => {
      if (!h.cb || !h.u || !a.tile) return {}; const k = /,/.test(a.tile) ? a.tile : refKey(a.tile, h.cb.map); if (!k) return { ok: false, why: 'Pick a tile.' };
      const seen = foesOf(h.cb, h.u).filter((f) => sideSees(h.cb!, h.u!.side, f)), bad = seen.find((f) => dist(k, f.pos) <= dist(h.u!.pos, f.pos));
      if (bad) return { ok: false, why: 'A retreat ends farther from every enemy you can see (' + bad.name + ').' };
      return { lines: ['Retreat to ' + refOf(k) + ': 0 AP, no opportunity attacks, Withdrawing.'] };
    },
    run: (h, a, rng) => {
      const cb = h.cb!, u = h.u!, k = /,/.test(a.tile!) ? a.tile! : refKey(a.tile!, cb.map)!; const s = stateOf(h); s.retreat = true;
      let e: string | null = null; try { e = moveUnit(cb, u, k, rng, 'sprint'); } finally { s.retreat = false; }
      return e;
    },
  }],
  brief: () => 'Narrator: the squad remembers who ran last time.',
});

// =====================================================================================================================
// Drill Echo (trait). Best Time: Sprint −1 AP (generic); running, climbing and endurance checks (Athletics, the
// Endurance skills, or tagged running / climbing) can't roll below 10 on the d20. The Count: before a Brain Power or
// Rumination check, d6: a 1 fails it with the action lost; before drawing a Sigil glyph, d6: a 1 spends the AP, draws
// nothing and uses no charge.
// =====================================================================================================================
const enduranceCheck = (ck: any) => (ck?.skills || []).some((s: string) => s === 'athletics' || SKILL[s]?.attribute === 'endurance') || (ck?.tags || []).some((t: string) => t === 'running' || t === 'climbing');
/** Glyphs the Count wiped before they were drawn: a filtering accessor on cb.glyphs for the rest of this action. */
function voidGlyph(cb: Combat, id: string) {
  const anyCb: any = cb, doomed: string[] = (anyCb.__voidGlyphs ||= []); doomed.push(id);
  const d = Object.getOwnPropertyDescriptor(cb, 'glyphs');
  if (d && d.get) return;
  let store = cb.glyphs || [];
  Object.defineProperty(cb, 'glyphs', { configurable: true, enumerable: true, get: () => store, set: (v: any[]) => { store = (v || []).filter((g) => !doomed.includes(g.id)); } });
  Object.defineProperty(cb, '__voidGlyphs', { configurable: true, enumerable: false, writable: true, value: doomed });
}
register({
  id: 'drill_echo', kind: 'trait', claims: [1, 2],
  on: {
    check_post: (ctx, h) => {
      if (ctx.c !== h.c) return; const g = gameOf(h);
      if (((ctx.ck?.skills || []) as string[]).some((s) => s === 'brain_power' || s === 'rumination') && g) {
        const r = die(g.rng, 6); if (r === 1) { ctx.auto = 'fail'; ctx.labels.push('THE COUNT · d6 1 · the count starts again, the action is lost'); return; }
      }
      if (enduranceCheck(ctx.ck) && ctx.die < 10) { ctx.labels.push('Best Time: d20 ' + ctx.die + ' → 10'); ctx.die = 10; }
    },
    glyph_cost: (ctx, h) => {
      if (ctx.u !== h.u || ctx.preview) return; const rng = rngOf(h); if (!rng) return;
      const cb: Combat = ctx.cb; if (die(rng, 6) !== 1) return;
      ctx.charge = 0; ctx.flux = 0; voidGlyph(cb, 'gl' + ((cb.glyphSeq || 0) + 1));
      log(cb, h.u!.name + ': THE COUNT · d6 1 · the count starts again: the AP is spent and no glyph is drawn (Drill Echo).');
    },
  },
  brief: () => null,
});

// =====================================================================================================================
// Ghost Soldier (trait). Unseen: the first attack from stealth each fight (an ambush) deals ×1.5 and makes no sound
// (the Narrator). The prosthetic arm is a start item (creation puts it in the pack). The War Never Ended: resting in
// a settlement takes Vigilant vs TN 12 (provisional), or no rest benefit; when your stealth is broken (found, touched,
// or hurt; not your own attack) −2 AP next turn. −1 Eloquence, Charisma, Implication, Composure (generic).
// =====================================================================================================================
register({
  id: 'ghost_soldier', kind: 'trait', claims: [0, 2, 3, 4], priority: 150,
  on: {
    attack_roll: (ctx, h) => { if (ctx.att === h.u && ctx.ambush && uses(h).take('per_combat')) stateOf(h).now = true; },
    damage_out: (ctx, h) => {
      if (ctx.att !== h.u) return; const s = stateOf(h);
      if (ctx.preview ? !!h.u!.hidden && uses(h).left('per_combat') > 0 : s.now) ctx.mults.push({ v: 1.5, label: 'Ghost Soldier (unseen)' });
    },
    on_hit: (ctx, h) => { if (ctx.att === h.u && stateOf(h).now) { stateOf(h).now = false; note(h, 'Ghost Soldier\'s first strike from stealth made no sound.'); } },
    on_miss: (ctx, h) => { if (ctx.att === h.u) stateOf(h).now = false; },
    spotted: (ctx, h) => { if (ctx.u === h.u && ctx.why !== 'attacked' && !h.u!.hidden && !/^threw/.test(ctx.why || '')) { stateOf(h).pen = 2; log(ctx.cb, h.u!.name + '\'s cover is blown: −2 AP next turn (Ghost Soldier).'); } },
    damage_in: (ctx, h) => { if (ctx.t === h.u && ctx.phase === 'reduce') stateOf(h).wasHidden = !!h.u!.hidden; },
    on_damaged: (ctx, h) => { const s = stateOf(h); if (ctx.t === h.u && s.wasHidden && !h.u!.hidden) { s.pen = 2; log(ctx.cb, h.u!.name + '\'s cover is blown: −2 AP next turn (Ghost Soldier).'); } s.wasHidden = false; },
    turn_start_pre: (ctx, h) => { if (ctx.u !== h.u) return; const s = stateOf(h); if (s.pen) { pushAp(ctx, -s.pen, 'stealth broken (Ghost Soldier)'); s.pen = 0; } },
    rest: (ctx, h) => {
      if (!ctx.settlement || !h.c || !ctx.chars.includes(h.c)) return; const g = gameOf(h) || ctx.g; if (!g) return;
      const d = d20(g.rng), m = mod(h.c.skills.vigilant || 0) + skillRollMod({ c: h.c }, 'vigilant', { roll: 'check', tags: (() => { try { return zoneTags(g); } catch { return []; } })() }).add, ok = d === 20 || (d !== 1 && d + m >= 12);
      postStory(h, 'VIGILANT · d20 ' + d + ' ' + (m >= 0 ? '+' : '−') + Math.abs(m) + ' = ' + (d + m) + ' vs 12 · ' + (ok ? 'sleeps, for once.' : 'spends the night watching the doors: no rest benefit.'), { kind: 'system' });
      if (!ok) { const i = ctx.chars.indexOf(h.c); if (i >= 0) ctx.chars.splice(i, 1); }
    },
  },
  brief: () => 'Area map: a failed stay-hidden roll costs 2 AP next round (Narrator).',
});

// =====================================================================================================================
// Lowland Born (trait). Concrete Forest: in a zone tagged urban or terrain ruins / urban, +1 Movement; always knows one
// way out (the Narrator). Open Sky: in terrain open, −2 Vigilant (generic in the story; here for fight rolls) and half
// Detection range: in a fight the holder spots Hidden enemies only within half their Vision (provisional).
// =====================================================================================================================
const concrete = (g: any) => zoneHas(g, 'terrain:ruins', 'terrain:urban', 'urban');
const openSky = (g: any) => zoneHas(g, 'terrain:open');
register({
  id: 'lowland_born', kind: 'trait', claims: [0, 3],
  stat: (h, stat, ctx) => {
    const g = gameOf(h);
    if (stat === 'move') return concrete(g) ? 1 : 0;
    if (stat === 'skill:vigilant' && ctx?.combat) return openSky(g) ? -2 : 0;
    return 0;
  },
  on: {
    spot: (ctx, h) => {
      if (ctx.by !== h.u || !openSky(gameOf(h))) return;
      if (dist(ctx.by.pos, ctx.u.pos) > Math.floor((h.u!.vision || 12) / 2)) ctx.cancel = true;
    },
  },
  brief: () => 'Always knows one way out of ruins and dense city.',
});
