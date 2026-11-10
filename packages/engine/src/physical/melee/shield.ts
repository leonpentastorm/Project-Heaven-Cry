// Rules 1.13: a shield's own techniques (docs/design/proposals/2026-11-nine-doors.md, section 20 item 9; numbers
// provisional, in techniques.json). They are the off hand's while it holds a shield (an item with the Shield property),
// whatever the main hand holds, and every one works with both Momentum and Guard:
//   Shield Bash  (Strike, 2 AP)  1 Guard in place of the Strike's Momentum (the core charges it); a hit gives 1 Momentum
//   Raise Shield (Link, 1 AP)    Momentum into Guard, 1 for 1; ranged attacks from the front −2 until your next turn
//   Shield Wall  (Answer, 1 Guard) an ally next to you is shot at: −2 to hit, and half cover counts for them
// The strike is the bare hand behind the shield (Raw Power; the core swaps it in as it does an off-hand weapon).
import { technique, strike, landed, stop, answer, momentumOf, turnStamp, onHook, meleeFx, fxMark, movedSince } from './shared';
import { guardOf, guardMax, addGuard, spendGuard, loseMomentum } from '../core';
import { inFront } from './links';
import { type Unit, alive, dist, xy, isMelee, previewAttack, coverTileFor } from '../../combat';
import { WEAPON } from '../../data';

// ---------- Shield Bash ----------
technique({
  id: 'shield_bash',
  run(t) {
    const tgt = t.tgt; if (!tgt) return 'Pick a target.';
    const r = strike(t, { mult: t.num('mult', 1.5), label: 'Shield Bash' });
    if (!r.ok) return r.why || 'Can\'t attack that.';
    const v = r.target || tgt;
    if (t.preview) t.note('On a hit: +' + t.num('momentum_on_hit', 1) + ' Momentum.');
    else if (r.hit) landed(t, t.num('momentum_on_hit', 1));
    if (t.preview || (r.hit && !r.killed && alive(v))) {
      const mk = fxMark(t);
      stop(t, v, 'push', { tiles: t.num('push', 1), save: ['body'] });
      const path = movedSince(t, v.id, mk); if (path.length > 1) meleeFx(t, 'force', { target: v.id, path, how: 'push' });
    }
    return null;
  },
  ai: (t) => (t.tgt ? 5 : 0),
});

// ---------- Raise Shield ----------
const raisedOf = (u: Unit): Record<string, any> | null => { const g = (u as any).tech?.raise_shield; return g?.on ? g : null; };
/** How much Momentum the user turns into Guard: what it chose (args.opt, a number), all of it by default, never more
 * than it has or than the pool has room for. */
function raiseAmount(t: { u: Unit; args: { opt?: string } }): number {
  const room = Math.max(0, guardMax(t.u) - guardOf(t.u)), most = Math.min(momentumOf(t.u), room);
  const want = t.args.opt != null && /^\d+$/.test(String(t.args.opt)) ? Number(t.args.opt) : most;
  return Math.max(0, Math.min(most, want));
}
technique({
  id: 'raise_shield',
  check(t) { return raisedOf(t.u) && raisedOf(t.u)!.t === turnStamp(t.cb) ? 'Your shield is already raised.' : null; },
  run(t) {
    const n = raiseAmount(t), def = t.num('ranged_defense', 2), m0 = momentumOf(t.u), g0 = guardOf(t.u);
    const foes = t.cb.units.filter((v) => v.side !== t.u.side && alive(v)).sort((a, b) => dist(a.pos, t.u.pos) - dist(b.pos, t.u.pos) || (a.id < b.id ? -1 : 1));
    const face = t.args.tile && t.args.tile !== t.u.pos ? t.args.tile : foes[0]?.pos || null;
    const [ux, uy] = xy(t.u.pos), front = face ? (() => { const [x, y] = xy(face); return [x - ux, y - uy]; })() : [0, 0];
    if (t.preview) {
      t.note(n ? n + ' Momentum becomes ' + n + ' Guard.' : guardMax(t.u) ? (m0 ? 'Your Guard is full: no Momentum is turned.' : 'No Momentum to turn into Guard.') : 'No Guard pool (Durability): no Momentum is turned.');
      t.note('Ranged attacks from the front are at −' + def + ' to hit you until your next turn.');
      t.pv.momentum = { now: m0, after: m0 - n }; t.pv.guard = { now: g0, after: g0 + n };
      return null;
    }
    if (n) { loseMomentum(t.cb, t.u, n); addGuard(t.cb, t.u, n); }
    Object.assign(t.state(), { on: true, t: turnStamp(t.cb), def, front });
    meleeFx(t, 'guard', { front, shield: true, turned: n });
    t.cb.log.push(t.u.name + ' raises the shield' + (n ? ': ' + n + ' Momentum into Guard (' + guardOf(t.u) + '/' + guardMax(t.u) + ')' : '') + ' (−' + def + ' to ranged attacks from the front).');
    return null;
  },
  fx: (t) => ({ turned: raiseAmount(t) }),
  ai: (t) => (t.u.ap <= 1 && t.cb.units.some((v) => v.side !== t.u.side && alive(v)) ? 3 : 0),
});
onHook('turn_start_pre', (ctx: any) => { const g = ctx.u && (ctx.u as any).tech?.raise_shield; if (g?.on) delete g.on; }); // until your next turn

// ---------- Shield Wall ----------
// The wall covers one attack: every roll of it (a burst's three rounds are one attack). The mark is transient (it lives
// from the attack being called to its last roll, inside one action), so it is kept here and never saved.
let WALL: { att: string; tgt: string; by: string; def: number; cover: number; ctx: any } | null = null;
const isRanged = (att: Unit, mode: string) => mode === 'thrown' || !(isMelee(WEAPON[att.weapon]) || mode === 'melee');
technique({
  id: 'shield_wall',
  run: () => 'Shield Wall is a reaction: it fires when an ally next to you is the target of a ranged attack.',
  react: {
    attack_target(ctx, t) {
      const me = t.u, att: Unit = ctx.att, v: Unit = ctx.locked || ctx.tgt, cost = t.num('guard_cost', 1);
      if (!att || !v || v === me || v.side !== me.side || att.side === me.side || !alive(me) || !alive(v) || !alive(att)) return;
      if (!isRanged(att, ctx.mode) || dist(me.pos, v.pos) > t.num('reach', 1) || guardOf(me) < cost) return;
      if (WALL && WALL.att === att.id && WALL.tgt === v.id) return; // a later roll of an attack already walled
      if (!previewAttack(t.cb, att, v, ctx.mode, { free: true }).ok) return; // an attack that can't be made costs nothing
      answer(t, att, () => {
        spendGuard(t.cb, me, cost);
        WALL = { att: att.id, tgt: v.id, by: me.id, def: t.num('defense', 2), cover: t.num('half_cover', 5), ctx };
        t.cb.log.push(me.name + '\'s shield covers ' + v.name + ' (' + cost + ' Guard): −' + WALL.def + ' to hit, and half cover counts.');
      });
    },
  },
  ai: () => 0,
});
// A new attack is called: an older wall is over (unless this is a later roll of the volley it covers).
onHook('attack_target', (ctx: any) => {
  if (!WALL || WALL.ctx === ctx) return;
  const v: Unit | undefined = ctx.locked || ctx.tgt;
  if (ctx.att?.id === WALL.att && v?.id === WALL.tgt && (ctx.vi || 0) > 0) return;
  WALL = null;
});
const wallOver = (ctx: any) => { if (WALL && !ctx.volley && ctx.att?.id === WALL.att) WALL = null; };
onHook('on_hit', wallOver); onHook('on_miss', wallOver);
onHook('turn_end', () => { WALL = null; });
onHook('attack_preview', (ctx: any, cb) => {
  const att: Unit = ctx.att, tgt: Unit = ctx.tgt; if (!att || !tgt || ctx.melee) return;
  // Raise Shield: −2 to ranged attacks from the front
  const r = raisedOf(tgt); if (r && inFront(r, att.pos, tgt.pos)) ctx.terms.push({ v: -(r.def || 0), label: 'Raised shield' });
  // Shield Wall, for the attack it answered
  const w = WALL; if (!w || w.att !== att.id || w.tgt !== tgt.id) return;
  ctx.terms.push({ v: -w.def, label: 'Shield Wall' });
  // half cover counts: the −5 of half cover, unless the target already has cover facing the shot or the attack ignores cover
  const ignores = ctx.ignoreCover || (WEAPON[att.weapon]?.properties || []).includes('ignores_half_cover');
  if (w.cover && !ignores && !ctx.coverTile && !coverTileFor(cb, att.pos, tgt.pos)) ctx.terms.push({ v: -w.cover, label: 'half cover (Shield Wall)' });
});
