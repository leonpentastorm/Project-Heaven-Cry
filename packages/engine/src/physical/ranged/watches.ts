// Physical 2.0, ranged Watches: paid for on your turn with holdWatch(); the core calls `react` on the hook for the unit
// holding it; the handler checks the trigger and calls fireWatch(), which spends the reaction (never while Pressed).
// Overwatch and Deny are the lead's references; the ranged lane builds Cover Me and Dead to Rights here.
import { technique, strike, canStrike, holdWatch, fireWatch, stop, spendRounds, addPressure, isPressed, atCover, turnStamp, onHook, strikingWith, type Tech } from './shared';
import { alive, dist, burstRolls, lineOfSight, unitSees, sideSees, effectiveRange, xy, key, type Combat, type Unit } from '../../combat';
import type { HeldWatch } from '../types';
import { looseRound } from './press';

// 27. Overwatch: the first enemy to move in your sight: the held shot. Precise: +2. Auto: it is a Burst (rules 1.18: a character's two rolls, the second at −4; an
//     enemy's old three, each later one −1). Spread: anyone coming within 4 tiles (instead of anyone moving in sight).
technique({
  id: 'overwatch',
  run(t) { holdWatch(t, { trigger: 'moves' }); return null; },
  react: {
    move_step(ctx, t) {
      const m = ctx.u; if (!m || m.side === t.u.side || !alive(m) || m.hidden || ctx.skipOW || !unitSees(t.cb, t.u, m.pos)) return;
      const p = t.line('precise', 'auto', 'spread');
      if (p === 'spread' && dist(t.u.pos, m.pos) > t.num('spread_range', 4)) return;
      if (!canStrike(t, m)) return;
      fireWatch(t, ctx, m, () => {
        const burst = p === 'auto' ? burstRolls(t.u, t.w) : null, shots = burst ? burst.length : Math.max(1, t.u.owShots || 1); t.u.owShots = 0; // rules 1.18: an Auto weapon's held shot is a Burst, with the Burst's rolls
        for (let i = 0; i < shots && alive(m); i++) if (!strike(t, { target: m, extra: (p === 'precise' ? t.num('precise_hit', 2) : 0) + (burst ? burst[i] : 0) }).ok) break;
      }, 'overwatch');
    },
  },
  ai: () => 2,
});

// 28. Deny: the first enemy to enter a tile you name: the shot; on a hit it stops there. Heavy, Braced: any tile in a
//     straight line of 3 (across your line of fire, the named tile in the middle). Blast: the tile takes the blast
//     (the weapon's own blast on a hit).
technique({
  id: 'deny',
  check(t) {
    const k = t.args.tile; if (!k) return 'Name a tile.';
    if (!lineOfSight(t.cb, t.u.pos, k)) return 'You can\'t see that tile.';
    if (dist(t.u.pos, k) > effectiveRange(t.w) * 3) return 'Out of range.';
    return null;
  },
  run(t) {
    const k = t.args.tile!, [x, y] = xy(k), [ux, uy] = xy(t.u.pos);
    const across = Math.abs(x - ux) >= Math.abs(y - uy) ? [0, 1] : [1, 0], n = t.line('heavy') ? t.num('heavy_line', 3) : 1, half = Math.floor(n / 2);
    const tiles: string[] = []; for (let i = -half; i <= half; i++) { const tx = x + across[0] * i, ty = y + across[1] * i; if (tx >= 0 && ty >= 0 && tx < t.cb.map.w && ty < t.cb.map.h) tiles.push(key(tx, ty)); }
    holdWatch(t, { trigger: 'enters_tile', tile: k, tiles });
    return null;
  },
  react: {
    move_step(ctx, t) {
      const m = ctx.u, w = (t.u as any).watch; if (!m || m.side === t.u.side || !alive(m) || !(w.tiles || [w.tile]).includes(ctx.at) || !canStrike(t, m)) return;
      fireWatch(t, ctx, m, () => { const r = strike(t, { target: m }); if (r.hit && r.target === m && alive(m) && stop(t, m, 'halt', { save: false })) ctx.stop = 'denied'; });
    },
  },
  ai: () => 0,
});

// ---------- Cover Me and Dead to Rights ----------
const held = (t: Tech): HeldWatch | undefined => (t.u as any).watch;
/** A round in the weapon to fire (a bow or a unit with endless ammunition always has one). */
const loaded = (t: Tech): boolean => t.u.infiniteAmmo || t.w.magazine == null || (t.hand === 'off' ? t.u.offAmmo ?? 0 : t.u.ammo) >= 1;
/** A held shot fired at an attacker as its attack was about to go: if the shot fells it, the attack never happens. */
const caught = (cb: Combat, m: Unit) => { (m as any).caughtFirst = turnStamp(cb); };

// 29. Cover Me: the first enemy to attack an ally you name: that attack is at −2, and the enemy gains +1 Pressure.
//     Auto: two allies. Precise: you also take the shot.
const coverAllies = (t: Tech): string[] => [...new Set(t.args.allyIds?.length ? t.args.allyIds : t.args.allyId ? [t.args.allyId] : [])];
technique({
  id: 'cover_me',
  check(t) {
    const ids = coverAllies(t); if (!ids.length) return 'Name an ally to cover.';
    const max = t.line('auto', 'precise') === 'auto' ? t.num('auto_allies', 2) : 1;
    if (ids.length > max) return max === 1 ? 'You can cover one ally: two need an Auto weapon.' : 'You can cover ' + max + ' allies at most.';
    for (const id of ids) {
      const a = t.cb.units.find((x) => x.id === id);
      if (id === t.u.id) return 'Name an ally, not yourself.';
      if (!a || a.side !== t.u.side) return 'That isn\'t one of your allies.';
      if (!alive(a)) return a.name + ' is out of the fight.';
    }
    return null;
  },
  run(t) {
    const ids = coverAllies(t), p = t.line('auto', 'precise');
    if (t.preview) {
      const names = ids.map((id) => t.cb.units.find((x) => x.id === id)!.name).join(' and ');
      t.note('Covering ' + names + ': the first enemy you can see attack ' + (ids.length > 1 ? 'either' : 'them') + ' is at −' + t.num('attack_penalty', 2) + ' and gains ' + t.num('pressure', 1) + ' Pressure.');
      if (p === 'precise') t.note('Precise: you also take the shot at it, before its attack.');
    }
    holdWatch(t, { trigger: 'attacks_ally', allyId: ids[0], ...(ids.length > 1 ? { allyIds: ids } : {}) });
    return null;
  },
  react: {
    attack_target(ctx, t) {
      const att: Unit = ctx.att, tgt: Unit = ctx.locked || ctx.tgt, w = held(t); if (!att || !tgt || !w || w.id !== 'cover_me') return;
      const ids = w.allyIds || (w.allyId ? [w.allyId] : []);
      // an enemy of the holder, attacking a named ally, in the holder's sight; the covering fire is a held shot, so it
      // needs a round and a shot it could make: in range and line of sight (review fix: it went off at any distance seen)
      if (att.side === t.u.side || !alive(att) || att.hidden || !ids.includes(tgt.id) || !unitSees(t.cb, t.u, att.pos) || !loaded(t) || !canStrike(t, att)) return;
      const shoot = t.line('auto', 'precise') === 'precise';
      fireWatch(t, ctx, att, () => {
        const pen = t.num('attack_penalty', 2);
        caught(t.cb, att);
        (att as any).coveredBy = { t: turnStamp(t.cb), tgt: tgt.id, v: pen, by: t.u.id, volley: ctx.volley ?? null };
        const use = strikingWith(att); if (use) COVERED_USE.set(att, use); else COVERED_USE.delete(att);
        t.cb.log.push('  Covering fire: ' + att.name + '\'s attack on ' + tgt.name + ' is at −' + pen + '.');
        addPressure(t, att, t.num('pressure', 1), 'Cover Me');
        if (shoot && alive(att)) strike(t, { target: att, label: 'Cover Me' }); // a round, Heat and a hit's Pressure, as any shot
        else { spendRounds(t, t.def.rounds as number); looseRound(t, att.pos, { covering: true }); } // the covering burst: the round goes, nothing is rolled; still a shot (Heat, the report)
      });
    },
  },
  // An enemy names the ally standing nearest a player. Held shots stay below a plain attack (5), as Overwatch does.
  ai(t) {
    const foes = t.cb.units.filter((v) => v.side !== t.u.side && alive(v)), mates = t.cb.units.filter((v) => v.side === t.u.side && v !== t.u && alive(v));
    let best: Unit | null = null, bd = 99;
    for (const a of mates) for (const v of foes) { const d = dist(a.pos, v.pos); if (d < bd) { bd = d; best = a; } }
    return best ? { score: bd <= 2 ? 4 : 1, args: { allyId: best.id } } : 0;
  },
});
// The covering fire's −2, on the attack it caught (each round of it, when it is a volley); spent when that attack rolls.
// A technique's volley made of separate strikes (fire.ts's Burst and Walking Fire carry no engine volley) is one attack
// too: every roll of that same use of the technique gets it (COVERED_USE: the use the mark was made on; not saved).
const COVERED_USE = new WeakMap<Unit, Tech>();
onHook('attack_preview', (ctx: any, cb) => {
  const att = ctx.att as Unit, cm = (att as any).coveredBy, use = COVERED_USE.get(att);
  if (cm && cm.t === turnStamp(cb) && cm.tgt === ctx.tgt?.id && (ctx.volley ?? null) === cm.volley && (!use || strikingWith(att) === use)) ctx.terms.push({ v: -cm.v, label: 'Cover Me' });
  // a held shot that felled the attacker as it attacked: the attack doesn't go off
  if ((att as any).caughtFirst === turnStamp(cb) && !alive(att) && !ctx.fail) ctx.fail = att.name + ' is down before the attack goes off.';
});
onHook('attack_roll', (ctx: any) => { const cm = (ctx.att as any)?.coveredBy; if (cm && cm.volley == null && !COVERED_USE.has(ctx.att)) delete (ctx.att as any).coveredBy; });
onHook('volley_end', (ctx: any) => { if ((ctx.u as any)?.coveredBy) delete (ctx.u as any).coveredBy; });
onHook('turn_end', (ctx: any) => { if ((ctx.u as any)?.coveredBy) delete (ctx.u as any).coveredBy; });

// 30. Dead to Rights: when a Pressed enemy you name attacks, stands up, reloads or leaves cover: the shot lands first,
//     at +2. Precise: a critical on 18–20. Silent: you stay Hidden.
function rights(t: Tech, ctx: any, why: string): void { // why: 'attacks' | 'stands up' | 'reloads' | 'leaves cover' (the watch_fire event carries it)
  const m = t.tgt, w = held(t); if (!m || !w || w.id !== 'dead_to_rights' || w.targetId !== m.id) return;
  if (!alive(m) || m.hidden || !isPressed(m) || !canStrike(t, m)) return;
  const p = t.line('precise', 'silent');
  fireWatch(t, ctx, m, () => {
    caught(t.cb, m);
    t.cb.log.push('  ' + m.name + ' ' + why + ': the shot lands first.');
    const was = !!t.u.hidden;
    strike(t, { target: m, extra: t.num('hit', 2), critMin: p === 'precise' ? t.num('precise_crit_min', 18) : undefined, quiet: p === 'silent', label: 'Dead to Rights' });
    if (p === 'silent' && was && t.u.hidden) t.cb.log.push('  ' + t.u.name + ' stays Hidden.');
  }, 'watch', { why });
}
technique({
  id: 'dead_to_rights',
  check(t) {
    const m = t.tgt; if (!m) return 'Name an enemy.';
    if (m.side === t.u.side) return 'Name an enemy, not an ally.';
    if (!alive(m)) return m.name + ' is out of the fight.';
    if (!sideSees(t.cb, t.u.side as 'pc' | 'foe', m, t.u)) return 'You can\'t see ' + m.name + '.';
    return null;
  },
  run(t) {
    const m = t.tgt!, p = t.line('precise', 'silent');
    if (t.preview) {
      t.note('When ' + m.name + ' attacks, stands up, reloads or leaves cover while Pressed: your shot lands first, at +' + t.num('hit', 2) + '.');
      if (!isPressed(m)) t.note(m.name + ' isn\'t Pressed now: the shot waits until it is.');
      if (p === 'precise') t.note('Precise: a critical on ' + t.num('precise_crit_min', 18) + '–20.');
      if (p === 'silent') t.note('Silent: you stay Hidden.');
    }
    holdWatch(t, { trigger: 'acts', targetId: m.id });
    return null;
  },
  react: {
    attack_target(ctx, t) { if (ctx.att && ctx.att === t.tgt) rights(t, ctx, 'attacks'); },
    stood_up(ctx, t) { if (ctx.u && ctx.u === t.tgt) rights(t, ctx, 'stands up'); },
    reload(ctx, t) { if (ctx.u && ctx.u === t.tgt) rights(t, ctx, 'reloads'); },
    move_step(ctx, t) {
      // leaving cover: from a tile against cover to one that isn't (the same "in cover" the Pressure rules use)
      if (!ctx.u || ctx.u !== t.tgt || ctx.skipOW || !ctx.from || !atCover(t.cb, { pos: ctx.from } as Unit) || atCover(t.cb, ctx.u)) return;
      rights(t, ctx, 'leaves cover');
    },
  },
  // A patient shooter names a Pressed enemy and waits for it; never over a Watch it already holds.
  ai: (t) => (t.tgt && isPressed(t.tgt) && !(t.u as any).watch ? 6 : 0),
});
