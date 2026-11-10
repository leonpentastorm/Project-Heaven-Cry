// Physical 2.0, ranged: grenades and thrown weapons, and Lob (7), whose Blast line shares the grenade code.
//   Lob: a shot at a target only your side can see (through smoke or dark), at −4. Arc: over full cover, at −2.
//        Blast: aim at the tile; no roll, today's blast damage and radius, +2 Pressure to everyone in the radius. A
//        Blast from something that also has Arc (the thumper, every grenade) goes over full cover ("Lob a frag over the
//        wall"); without Arc (the breacher tube) its path must be clear of walls. Smoke and dark never stop Lob.
//   Explosive grenades are ammunition for it (args.ammo names the grenade: frag, incendiary): the grenade's own Blast.
//   Smoke, a flashbang or the bot-scrambler landing on a unit (thrown through Lob or today's Throw) ends its held Watch
//   and its Bead; anyone standing in smoke at the end of a turn sheds 2 Pressure (a pressureDecay rule).
// Today's Throw (tactics.ts throwItem) is untouched: it stays for a character who knows no techniques, and keeps every
// grenade effect (Blinded, the scrambler's Stun on machines, burning tiles). Lob goes through the same blast().
import { technique, strike, canStrike, spendRounds, addPressure, endWatch, pressureDecay, onHook, strikingWith, TECHNIQUE, type Tech } from './shared';
import { type Combat, type Unit, alive, dist, lineOfSight, unitSees, effectiveRange, emitFx, refOf, xy, key, heatLimit } from '../../combat';
import { WEAPON, type WeaponDef } from '../../data';
import { blast, radiusOf, throwRangeOf, isSilent, reveal } from '../../tactics';
import { condOn } from '../../magic';
import { emit } from '../../effects/hooks';
import { endBead } from './sets';

/** Lob's numbers outside a use (the smoke rule): its data, else the fallback. */
const lobNum = (k: string, fb: number): number => (typeof TECHNIQUE.lob?.numbers?.[k] === 'number' ? TECHNIQUE.lob.numbers[k] : fb);
const nameOf = (w: WeaponDef) => w.name.toLowerCase();
const an = (s: string) => (/^[aeiou]/.test(s) ? 'an ' : 'a ') + s;
const propsOf = (id: string): string[] => (WEAPON[id] as any)?.phys?.props || [];
/** A thrown item that goes off over an area (a grenade, a satchel). */
const isGrenade = (id: string | undefined): boolean => !!id && WEAPON[id]?.category === 'thrown' && radiusOf(WEAPON[id]) > 0;
/** It hurts (frag, incendiary, satchel); smoke, flashbangs and the scrambler deal none and act on other people's fire. */
const hurts = (w: WeaponDef | undefined): boolean => typeof w?.damage === 'number' && w.damage > 0;
/** Does anyone on this side see the tile? (Lob's whole point: the user needn't.) */
const sideSeesTile = (cb: Combat, side: Unit['side'], tile: string) => cb.units.some((v) => v.side === side && unitSees(cb, v, tile));
const tilesWithin = (cb: Combat, at: string, r: number) => { const [x0, y0] = xy(at), out: string[] = []; for (let x = x0 - r; x <= x0 + r; x++) for (let y = y0 - r; y <= y0 + r; y++) if (x >= 0 && y >= 0 && x < cb.map.w && y < cb.map.h) out.push(key(x, y)); return out; };
const onMap = (cb: Combat, tile: string) => { const [x, y] = xy(tile); return x >= 0 && y >= 0 && x < cb.map.w && y < cb.map.h; };
const caught = (cb: Combat, tile: string, r: number) => cb.units.filter((v) => alive(v) && dist(v.pos, tile) <= r);
const inSmoke = (cb: Combat, u: Unit) => (cb.zones || []).some((z) => z.kind === 'veil' && z.tiles.includes(u.pos));

/** Where a Blast lands: the named tile, else the named target's tile. */
const aimTile = (t: Tech): string | null => t.args.tile || t.tgt?.pos || null;
/** The checks every Blast shares: on the map, in range, seen by the user's side, and a path clear of walls (smoke and
 * dark don't stop it). Something with Arc goes over full cover: "Lob a frag over the wall" (the proposal's Grenadier, section 2). */
function blastCheck(t: Tech, tile: string | null, range: number, rangeWhy: string, arc: boolean): string | null {
  if (!tile) return 'Name a tile.';
  if (!onMap(t.cb, tile)) return 'Off the map.';
  if (dist(t.u.pos, tile) > range) return rangeWhy;
  if (!sideSeesTile(t.cb, t.u.side, tile)) return 'No one on your side can see that tile.';
  if (!arc && tile !== t.u.pos && !lineOfSight(t.cb, t.u.pos, tile, true)) return 'No clear line to that tile: walls in the way.';
  return null;
}
const tilesWord = (n: number) => n + (n === 1 ? ' tile' : ' tiles');
/** The preview of a blast: the tiles, what it does, and the Pressure each enemy in it would gain. */
function previewBlast(t: Tech, tile: string, radius: number, w: WeaponDef, pressure: boolean): void {
  t.pv.area = tilesWithin(t.cb, tile, radius);
  t.note('No roll: ' + (hurts(w) ? w.damage + ' to everyone within ' + tilesWord(radius) : 'its effect within ' + tilesWord(radius)) + ' of ' + refOf(tile)
    + (pressure ? ', and +' + t.num('blast_pressure', 2) + ' Pressure to every enemy there' : '') + '.');
  if (pressure) blastPressure(t, tile, radius);
}
/** +2 Pressure to everyone still standing in the radius (addPressure skips the user's own side). */
function blastPressure(t: Tech, tile: string, radius: number): void {
  for (const v of caught(t.cb, tile, radius)) addPressure(t, v, t.num('blast_pressure', 2), 'a blast');
}

// ---------- Lob, a grenade (args.ammo): the grenade's own Blast, in throwing range ----------
function lobGrenade(t: Tech, id: string): string | null {
  const u = t.u, cb = t.cb, w = WEAPON[id];
  if ((w.properties || []).includes('placed')) return an(nameOf(w)) + ' is placed, not lobbed: use Throw.';
  if (!((u.throwables?.[id] ?? 0) > 0)) return 'You carry no ' + nameOf(w) + '.';
  const tile = aimTile(t), range = throwRangeOf(u);
  const why = blastCheck(t, tile, range, 'Out of throwing range (' + range + ' tiles).', propsOf(id).includes('arc')); if (why) return why;
  const explosive = hurts(w);
  if (t.preview) { previewBlast(t, tile!, radiusOf(w), w, explosive); return null; }
  // The same 'throw' moment today's Throw has (Catch takes it out of the air; Jacked In; the shell-shocked veteran).
  // Its AP is the technique's, already paid.
  const ctx: any = emit(cb, 'throw', { u, item: id, tile, ap: t.pv.ap, radius: radiusOf(w), cancel: false, caughtBy: null, preview: false, cb, rng: t.rng, technique: t.def.id });
  u.throwables![id]--;
  emitFx(cb, 'shot', { unit: u.id, target: null, from: u.pos, to: tile, weapon: id, cat: 'thrown', mode: 'shot', hit: true, crit: false, fumble: false, dmg: 0, killed: false, object: true, technique: t.def.id });
  cb.log.push(u.name + ' lobs ' + an(nameOf(w)) + ' at ' + refOf(tile!) + (ctx.cancel ? (ctx.caughtBy ? ' · ' + ctx.caughtBy.name + ' catches it' : ' · it never goes off') : blast(cb, t.rng, u, tile!, id, ctx.radius)) + '.');
  if (!ctx.cancel && explosive) blastPressure(t, tile!, ctx.radius);
  if (u.hidden && !isSilent(u)) reveal(cb, u, 'threw ' + nameOf(w));
  return null;
}

// ---------- Lob, Blast with the weapon in hand (a launcher): one round onto a tile, no roll ----------
function lobBlast(t: Tech): string | null {
  const u = t.u, cb = t.cb, w = t.w, radius = radiusOf(w);
  if (!radius) return 'This weapon has no blast radius.';
  if (condOn(u, 'disarmed')) return 'Disarmed: recover your weapon (2 AP).';
  if (condOn(u, 'lowered')) return 'Your weapon is lowered: raise it (1 AP).';
  if ((w.properties || []).includes('requires_braced_or_prone') && !u.braced && !u.prone) return 'Brace it first (1 AP), or go prone.';
  if (t.hand === 'main' && u.maxDur && (u.dur ?? 1) <= 0) return 'Broken: Field Repair first.';
  const tile = aimTile(t);
  const why = blastCheck(t, tile, effectiveRange(w) * t.num('blast_range_bands', 3), 'Out of range.', t.holds('arc')); if (why) return why;
  // the round (the core's gate has already refused an empty weapon; a preview only counts it)
  if (!spendRounds(t, typeof t.def.rounds === 'number' ? t.def.rounds : 1)) return 'Empty: reload first.';
  if (t.preview) { previewBlast(t, tile!, radius, w, true); return null; }
  // It fires as a shot does today: Heat (and the jam at the limit), and Recoil for the shots after it.
  if (t.hand === 'main' && w.heat_limit && !u.infiniteAmmo) { u.heat += 1; if (u.heat >= heatLimit(u, w)) u.jammed = true; }
  u.shotsThisTurn = (u.shotsThisTurn || 0) + 1; u.firstShotDone = true; u.firstShotTurn = true; u.attackedTurn = true;
  emitFx(cb, 'shot', { unit: u.id, target: null, from: u.pos, to: tile, weapon: w.id, cat: w.category, mode: 'shot', hit: true, crit: false, fumble: false, dmg: 0, killed: false, object: true, technique: t.def.id });
  cb.log.push(u.name + ' lobs a round from the ' + w.name + ' onto ' + refOf(tile!) + blast(cb, t.rng, u, tile!, w.id, radius) + (u.jammed && t.hand === 'main' ? ' · the weapon jams' : '') + '.');
  blastPressure(t, tile!, radius);
  if (u.hidden && !isSilent(u)) reveal(cb, u, 'fired');
  return null;
}

// ---------- Lob, a shot (no Blast): at −4 at a target your side sees; Arc: over full cover, at −2 ----------
function lobShot(t: Tech): string | null {
  const tgt = t.tgt || (t.args.tile ? t.cb.units.find((v) => v.pos === t.args.tile && v.side !== t.u.side && alive(v)) || null : null);
  if (!tgt) return t.args.tile ? 'No enemy on that tile.' : 'Pick a target.';
  const arc = t.line('arc') === 'arc';
  const r = strike(t, { target: tgt, extra: arc ? t.num('arc_hit', -2) : t.num('hit', -4), label: 'Lob' });
  if (t.preview && r.ok) t.note(arc ? 'Over full cover: your side must see the target.' : 'Through smoke or dark: your side must see the target.');
  return r.ok ? null : r.why || 'Can\'t attack that.';
}
// The shot's path: through smoke always; with Arc over full cover too. Someone on the side must still see the target
// (the engine's own sight check stays).
onHook('attack_preview', (ctx: any) => {
  const t = strikingWith(ctx.att); if (!t || t.def.id !== 'lob' || ctx.melee) return;
  ctx.seeVeil = true;
  if (t.line('arc') === 'arc') ctx.noLos = true;
});

technique({
  id: 'lob',
  run(t) {
    if (isGrenade(t.args.ammo)) return lobGrenade(t, t.args.ammo!);
    if (t.args.ammo && WEAPON[t.args.ammo]?.category === 'thrown') return 'That isn\'t something to lob.';
    return t.line('blast', 'arc') === 'blast' ? lobBlast(t) : lobShot(t);
  },
  // An enemy lobs a launcher round where it catches the most of the squad and none of its own side; otherwise it lobs
  // a shot only at someone it has no line to. (Enemies don't throw grenades yet: spec item 95.)
  ai(t) {
    const u = t.u, cb = t.cb, foes = cb.units.filter((v) => v.side !== u.side && alive(v));
    const r = radiusOf(t.w);
    if (t.holds('blast') && r) {
      let best: { score: number; args: { tile: string; line: string } } | null = null;
      for (const v of foes) {
        if (dist(u.pos, v.pos) <= r || dist(u.pos, v.pos) > effectiveRange(t.w) * t.num('blast_range_bands', 3) || !sideSeesTile(cb, u.side, v.pos) || (!t.holds('arc') && !lineOfSight(cb, u.pos, v.pos, true))) continue;
        const near = caught(cb, v.pos, r); if (near.some((x) => x.side === u.side)) continue;
        const score = 4 + 2 * near.length;
        if (!best || score > best.score) best = { score, args: { tile: v.pos, line: 'blast' } };
      }
      if (best) return best;
    }
    for (const v of foes) if (!lineOfSight(cb, u.pos, v.pos) && canStrike(t, v)) return { score: 6, args: { targetId: v.id } };
    return 0;
  },
});

// ---------- smoke, flashbangs and the scrambler act on other people's fire ----------
// Landing on a unit (anyone in the radius, either side) ends its held Watch, the old held shot, and its Bead.
onHook('blast_landed', (ctx: any, cb) => {
  const w = WEAPON[ctx.item]; if (!w || w.category !== 'thrown' || hurts(w)) return;
  const why = nameOf(w);
  for (const v of (ctx.who || []) as Unit[]) {
    if (!alive(v)) continue;
    endWatch(cb, v, why);
    if (v.overwatch) { v.overwatch = null; v.owShots = 0; cb.log.push(v.name + ' loses the held shot (' + why + ').'); emitFx(cb, 'watch_end', { unit: v.id, at: v.pos, id: 'overwatch', why }); }
    endBead(cb, v, why); // sets.ts owns the Bead's state (techState(u, 'bead').targetId) and its bead_end fx
  }
});
// Smoke: anyone standing in it at the end of a turn sheds at least 2 Pressure (grenade smoke and VEIL's smoke alike).
pressureDecay((cb, u, fall) => (inSmoke(cb, u) ? Math.max(fall, lobNum('smoke_decay', 2)) : fall));
