// Sigil magic, rules revision 1.4 (spec: Mana, "Sigil magic: commands written on the map"; data/sigils.json). Words are
// glyphs drawn on the caster's own tile, one a tile; the only shape is the Line (2–4 glyphs in a straight row); a spell
// is 1+ Subject and 1+ other word, at most 4 glyphs and the caster's Max Sigil words. Where you stand when you Evoke sets
// which way the area opens (the facing rule); Reach words set how deep it reaches (Touch: 1 tile) and how it flies;
// Delivery, Burst and Filter words shape what it does. Every number comes from sigils.json; everything is
// deterministic (rolls from the rng passed in). The planner (planEvoke) is pure and is shared by the preview, the
// enemy AI and the real Evoke, so what the screen shows is what happens.
import { WEAPON, type SigilDef } from './data';
import {
  type Spell, type SigilFam, type Dir, G, ENEMY_AI, LIM, W, isSubject, isReach, isElement, isAffliction, isBoonWord, count, compileSpell, grammarError, MAX_GLYPHS, SIGIL_REV, STARTING_DEFAULT,
} from './sigilwords';
export * from './sigilwords';
import {
  type Combat, type Unit, dist, xy, key, refOf, standable, lineOfSight, unitSees, objectsOf, objectsAt, coverTileFor, emitFx,
  active, paths, moveUnit, apForTiles, previewAttack, attackApCost, isMelee, effectiveRange,
} from './combat';
import { type Rng, d20 } from './rng';
import { emit } from './effects/hooks';
import { healUnit, grantShield } from './effects/damage';
import { AP_MAX } from './effects/ap';
import {
  type Glyph, type Zone, harm, heal, applyCond, condOn, endCond, isBoon, magicShove, flux, condSkillMod, condHit, unitSave, unitDebuff,
  SPELL_AP, FLUX_MAX, CORE_CHARGE, swapCore, vent, withElement, magicSpellWords, condName,
} from './magic';
import { makeObject, OBJ } from './objects';

type Fam = SigilFam;
/** Enemy notice by tier (tactics.ts TIER_NOTICE; copied here so this module doesn't import tactics, which reads magic.ts
 * at load). */
const NOTICE: Record<string, number> = { minion: 0, soldier: 2, elite: 4, boss: 6 };
/** Hidden (tactics.ts hide/reveal, the same steps): not while Marked; each entry gives one ambush. */
function hideUnit(cb: Combat, u: Unit, why: string): string {
  if (condOn(u, 'marked')) return ' · ' + u.name + ' is Marked and can\'t hide';
  if (!u.hidden) { u.hidden = true; u.hideEntry = (u.hideEntry || 0) + 1; for (const side of ['pc', 'foe']) if (side !== u.side) ((cb.lastSeen ||= {})[side] ||= {})[u.id] = u.pos; emit(cb, 'hide', { u, why, cb }); }
  return ' · ' + u.name + ' is Hidden (' + why + ')';
}
function revealUnit(cb: Combat, u: Unit, why: string): string {
  if (!u.hidden) return '';
  u.hidden = false; for (const side of Object.keys(cb.lastSeen || {})) delete cb.lastSeen![side][u.id];
  cb.log.push(u.name + ' is revealed (' + why + ').'); emit(cb, 'spotted', { u, why, cb }); return ' · revealed';
}
// ---------- ready, costs ----------
const canCast = (u: Unit): string | null => (u.dead || u.downed ? 'Downed.' : condOn(u, 'silenced') ? 'Silenced: no magic this round.' : null);
export function sigilReady(cb: Combat, u: Unit): string | null {
  const m = u.mg; if (!m || !m.evoker) return 'You need an Evoker for Sigils.';
  if (m.lockRound != null && cb.round <= m.lockRound) return 'Your Evoker is locked after an overload until next round.';
  return canCast(u);
}
export const glyphApOf = (u: Unit) => (u.mg?.glyphAp || 1) + (condOn(u, 'ldebuff') ? 1 : 0);
/** A glyph's price for this unit: 'glyph_cost' {u, word, tile, ap, charge, flux, preview, fail} (mutable), after
 * word_cost items. fail = 'why' refuses the draw (hooks gap D2/K5). Flux is the word's (TWICE 2). */
export function glyphCost(cb: Combat, u: Unit, word: string, preview = false, tile?: string): { ap: number; charge: number; flux: number; fail?: string } {
  const w = W(word), base = { u, word, ap: glyphApOf(u) + ((cb.zones || []).some((z) => z.kind === 'scramble' && z.tiles.includes(tile || u.pos)) ? 1 : 0), charge: Math.max(0, (w?.charge || 0) + (u.mg?.wordCost?.[word] || 0)), flux: w?.flux ?? 1, preview, tile: tile || u.pos, fail: '', cb };
  const c: any = emit(cb, 'glyph_cost', base);
  return { ap: Math.max(0, Math.round(c.ap * 10) / 10), charge: Math.max(0, Math.round(c.charge)), flux: Math.max(0, c.flux), ...(c.fail ? { fail: c.fail } : {}) };
}
/** How many glyphs one tile may hold for this caster: 1, unless an item raises it ('glyphs_per_tile' {u, tile, n};
 * the two-glyph hook) or the unit carries mg.glyphsPerTile. */
export function glyphsPerTile(cb: Combat, u: Unit, tile: string): number {
  const r: any = emit(cb, 'glyphs_per_tile', { u, tile, n: (u.mg as any)?.glyphsPerTile ?? G.draw?.glyphs_per_tile ?? 1, cb });
  return Math.max(1, Math.floor(r.n || 1));
}
/** Glyphs of yours the ground holds at most: Max Sigil words (Hold the Stroke pools its own, tagged by '#pool'). */
export const groundCap = (u: Unit) => u.mg?.maxWords || 2;
const myGlyphs = (cb: Combat, u: Unit) => (cb.glyphs || []).filter((g) => g.by === u.id);
export const evokeCharge = (p: { glyphs: Glyph[] }, u: Unit) => Math.max(1, p.glyphs.length - (u.mg?.coreSave || 0));

// ---------- shapes ----------
export interface Pattern {
  shape: 'stack' | 'line' | 'ring'; tiles: string[]; glyphs: Glyph[]; words: string[]; side: 'pc' | 'foe';
  /** The Line's axis from tiles[0] to its last tile (a Stack: none). */
  axis?: Dir;
  /** Old fields kept for callers: the end nearer `from`, the far end, the direction near → far. */
  near?: string; far?: string; dir?: Dir; centre?: string;
}
const add = (k: string, d: Dir, n = 1) => { const [x, y] = xy(k); return key(x + d[0] * n, y + d[1] * n); };
const onMap = (cb: Combat, k: string) => { const [x, y] = xy(k); return x >= 0 && y >= 0 && x < cb.map.w && y < cb.map.h; };
const neg = (d: Dir): Dir => [d[0] ? -d[0] : 0, d[1] ? -d[1] : 0];
const sgn = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0);
/** Group the glyphs of one side that touch (diagonals too) and read the shape (spec: Drawing, 3). */
function groupAt(glyphs: Glyph[], tile: string, side: 'pc' | 'foe'): string[] {
  const at = new Set(glyphs.filter((g) => g.side === side).map((g) => g.pos)), comp: string[] = [], todo = [tile];
  while (todo.length) { const k = todo.pop()!; if (comp.includes(k) || !at.has(k)) continue; comp.push(k); for (const n of at) if (!comp.includes(n) && dist(n, k) === 1) todo.push(n); }
  return comp;
}
/** A straight row of neighbouring tiles, ordered, with its unit step; null when the tiles bend or have gaps. */
function straight(tiles: string[]): { tiles: string[]; axis: Dir } | null {
  if (tiles.length < 2) return null;
  const pts = tiles.map(xy);
  for (const d of [[1, 0], [0, 1], [1, 1], [1, -1]] as Dir[]) {
    const s = [...pts].sort((a, b) => (a[0] * d[0] + a[1] * d[1]) - (b[0] * d[0] + b[1] * d[1]));
    if (s.every((p, i) => i === 0 || (p[0] - s[i - 1][0] === d[0] && p[1] - s[i - 1][1] === d[1]))) return { tiles: s.map((p) => key(p[0], p[1])), axis: d };
  }
  return null;
}
const glyphOrder = (a: Glyph, b: Glyph) => (+String(a.id).replace(/\D/g, '') || 0) - (+String(b.id).replace(/\D/g, '') || 0);
function readShape(glyphs: Glyph[], comp: string[], side: 'pc' | 'foe', from?: string): Pattern | string {
  const on = (k: string) => glyphs.filter((g) => g.pos === k && g.side === side).sort(glyphOrder);
  if (comp.length === 1) {
    const gs = on(comp[0]);
    if (gs.length >= 2) return { shape: 'stack', tiles: comp, glyphs: gs, words: gs.map((g) => g.word), side };
    return 'One glyph alone is no spell: step to a tile next to it and draw a second, in a straight row.';
  }
  if (comp.length > MAX_GLYPHS) return 'No shape: ' + comp.length + ' glyphs touch here, and a Line is 2 to ' + MAX_GLYPHS + '. Scuff one or let it fade.';
  const s = straight(comp); if (!s) return 'No shape: these glyphs bend or cluster. A Line is one straight row (across, down or diagonal).';
  // Read the Line from the end drawn first, so its words come in the order they were written.
  const first = (k: string) => on(k)[0];
  if (glyphOrder(first(s.tiles[s.tiles.length - 1]), first(s.tiles[0])) < 0) { s.tiles.reverse(); s.axis = neg(s.axis); }
  const gs = s.tiles.flatMap(on), A = s.tiles[0], Z = s.tiles[s.tiles.length - 1];
  const near = from && dist(from, Z) < dist(from, A) ? Z : A, far = near === A ? Z : A;
  return { shape: 'line', tiles: s.tiles, glyphs: gs, words: gs.map((g) => g.word), side, axis: s.axis, near, far, dir: near === A ? s.axis : neg(s.axis) };
}
/** The pattern a glyph belongs to (spec: Drawing, 3): a Line of 2–4, or a Stack with the two-glyph hook. */
export function findPattern(cb: Combat, tile: string, from?: string): Pattern | string {
  migrateSigil(cb);
  const start = (cb.glyphs || []).find((g) => g.pos === tile); if (!start) return 'No glyph there.';
  return readShape(cb.glyphs || [], groupAt(cb.glyphs || [], tile, start.side), start.side, from);
}

// ---------- the facing rule ----------
export interface Facing { mode: 'along' | 'across' | 'stack'; dir: Dir; far?: string; away?: Dir }
/** Which way a pattern's area opens for a caster on tile s (spec: Evoking, the facing rule), or why s is refused. */
export function facingFrom(p: Pattern, s: string): Facing | string {
  if (p.shape === 'stack') return { mode: 'stack', dir: [0, 0] };
  const L = p.tiles, n = L.length, d = p.axis!, i = L.indexOf(s);
  if (i > 0 && i < n - 1) return 'Standing on a middle glyph: step off the Line, or onto an end.';
  if (i === 0) return { mode: 'along', dir: d, far: L[n - 1] };
  if (i === n - 1) return { mode: 'along', dir: neg(d), far: L[0] };
  const [sx, sy] = xy(s), [ax, ay] = xy(L[0]), rx = sx - ax, ry = sy - ay, proj = (rx * d[0] + ry * d[1]) / (d[0] * d[0] + d[1] * d[1]);
  if (proj < 0) return { mode: 'along', dir: d, far: L[n - 1] };
  if (proj > n - 1) return { mode: 'along', dir: neg(d), far: L[0] };
  const c = d[0] * ry - d[1] * rx; // which side of the Line the caster stands on
  let away: Dir;
  if (d[0] && d[1]) { const v: Dir = [0, 1]; away = sgn(d[0] * v[1] - d[1] * v[0]) === -sgn(c) ? v : [0, -1]; } // a diagonal: the north or south step away
  else { const p1: Dir = [d[1] ? -d[1] : 0, d[0]]; away = c < 0 ? p1 : [d[1], d[0] ? -d[0] : 0]; }
  return { mode: 'across', dir: away, away };
}
/** The lanes of an along band: offsets across the firing direction, one per glyph, the middle on the axis, the extra
 * lane on the right of the firing direction for an even count; a diagonal fires with lanes one step east or west apart. */
function laneStep(f: Dir): Dir { const r: Dir = [f[1] ? -f[1] : 0, f[0]]; return f[0] && f[1] ? [r[0], 0] : r; }
const laneOffsets = (n: number) => { const lo = n % 2 ? -(n - 1) / 2 : -(n / 2 - 1), out: number[] = []; for (let j = lo; j < lo + n; j++) out.push(j); return out; };
/** The tiles a caster may aim at (the area), for a pattern, a facing and a depth. */
function areaTiles(cb: Combat, p: Pattern, f: Facing, depth: number): { tiles: string[]; lane: Record<string, string> } {
  const tiles: string[] = [], lane: Record<string, string> = {};
  const put = (k: string, origin: string) => { if (onMap(cb, k) && !lane[k]) { tiles.push(k); lane[k] = origin; } };
  if (f.mode === 'stack') { const s = p.tiles[0]; for (const k of around(s, depth)) if (k !== s && onMap(cb, k) && lineOfSight(cb, s, k)) put(k, s); return { tiles, lane }; }
  if (f.mode === 'along') { const ls = laneStep(f.dir); for (let k = 1; k <= depth; k++) { const c = add(f.far!, f.dir, k); for (const j of laneOffsets(p.tiles.length)) put(add(c, ls, j), f.far!); } return { tiles, lane }; }
  for (let k = 1; k <= depth; k++) for (const g of p.tiles) put(add(g, f.dir, k), g);
  return { tiles, lane };
}
export const around = (k: string, r: number) => { const [x, y] = xy(k), out: string[] = []; for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) out.push((x + i) + ',' + (y + j)); return out; };
/** The spell's depth: the Reach word's range + the caster's range bonus (once), or 1 for Touch (spec: Reach). Items
 * may change it ('evoke_area' {u, spell, pattern, depth}). */
export function spellRange(cb: Combat, u: Unit, sp: Spell, p?: Pattern | null): number {
  const base = sp.reach ? sp.range + (u.mg?.rangeBonus || 0) : (G.touch?.depth ?? 1);
  const r: any = emit(cb, 'evoke_area', { u, spell: sp, pattern: p || null, depth: base, cb });
  return Math.max(1, Math.floor(r.depth ?? base));
}

// ---------- paths, bursts, who is affected ----------
const liveAt = (cb: Combat, k: string, not?: Unit) => cb.units.find((x) => x.pos === k && !x.dead && x !== not);
/** Does a tile stop a SEEK bolt (full cover, a wall, a solid tile, a RAISE wall, a closed door)? */
function stopsBolt(cb: Combat, k: string): boolean {
  if (!onMap(cb, k) || cb.map.solid.includes(k) || (cb.map.full || []).includes(k)) return true;
  return objectsAt(cb, k).some((o) => (o.hp == null || o.hp > 0) && !(o as any).open && ((o as any).sigilWall || ['pillar', 'barricade', 'door', 'sigil_wall'].includes(o.kind)));
}
function line(a: string, b: string): string[] {
  let [x0, y0] = xy(a); const [x1, y1] = xy(b), out: string[] = [];
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy;
  while (!(x0 === x1 && y0 === y1)) { const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } out.push(key(x0, y0)); }
  return out;
}
/** A bolt from a tile toward an aim: the tiles it crosses, and where it stops (the first creature, or the tile before
 * full cover). Downed and dead bodies don't stop it; anyone else does, allies too (KIN changes who it affects, not how
 * it flies). */
export function boltPath(cb: Combat, from: string, to: string, caster?: Unit): { path: string[]; impact: string; stoppedBy: 'creature' | 'cover' | null; blockedAt: string | null } {
  const path: string[] = []; let last = from;
  for (const k of line(from, to)) {
    if (stopsBolt(cb, k)) return { path, impact: last, stoppedBy: 'cover', blockedAt: k };
    path.push(k); last = k;
    const v = cb.units.find((x) => x.pos === k && !x.dead && !x.downed && x !== caster);
    if (v) return { path, impact: k, stoppedBy: k === to ? null : 'creature', blockedAt: k === to ? null : k };
  }
  return { path, impact: to, stoppedBy: null, blockedAt: null };
}
/** The nearest of the 8 directions from a to b. */
export function dir8(a: string, b: string): Dir {
  const [ax, ay] = xy(a), [bx, by] = xy(b), dx = bx - ax, dy = by - ay; if (!dx && !dy) return [0, 1];
  const ang = Math.atan2(dy, dx), o = Math.round(ang / (Math.PI / 4));
  return [Math.round(Math.cos(o * Math.PI / 4)), Math.round(Math.sin(o * Math.PI / 4))] as Dir;
}
/** A Burst's tiles with their multipliers, around where it lands (spec: Burst). PUSH carries on the way the spell
 * faced: a cone from the landing tile, as long as its length and widening like the full-auto cone. */
export function burstTiles(cb: Combat, sp: Spell, impact: string, f: Dir): { tiles: string[]; mult: Record<string, number>; core: string } {
  const mult: Record<string, number> = {};
  const put = (k: string, m: number) => { if (!onMap(cb, k)) return; mult[k] = Math.max(mult[k] ?? 0, m); };
  if (!sp.burst) put(impact, 1);
  if (sp.spread) for (const k of around(impact, sp.radius)) put(k, sp.radiusMult);
  if (sp.push) {
    const apex = add(impact, f, -1), [px, py] = xy(apex), fl = Math.hypot(f[0], f[1]) || 1;
    for (const k of around(apex, sp.coneLen)) { const [x, y] = xy(k), ax = x - px, ay = y - py, l = Math.hypot(ax, ay); if (!l || dist(apex, k) > sp.coneLen) continue; if ((ax * f[0] + ay * f[1]) / (l * fl) >= 0.7) put(k, sp.coneMult); }
    put(impact, sp.coneMult);
  }
  if (sp.condense) mult[impact] = Math.max(mult[impact] ?? 0, sp.coreMult);
  if (!(impact in mult)) put(impact, 1);
  return { tiles: Object.keys(mult), mult, core: impact };
}
export interface Affected {
  unit: string; name: string; at: string; ally: boolean; enemy: boolean; self: boolean; mult: number; via: 'burst' | 'direct' | 'chain' | 'field' | 'turret' | 'trap';
  kinSpared?: boolean; skipped?: string; missile: number; jump?: number;
  dmg: number; dmgAfterArmour: number; heal: number; shield: number;
  roll: { bonus: number; need: number; pct: number; cover: boolean } | null; saves: { cond: string; fam: Fam; tn: number }[];
}
const SAVES: Record<string, Fam> = { body: 'body', brain: 'brain', heart: 'heart' };
/** The numbers a spell would put on one creature, after multipliers (spec: Grammar 6). */
function numbersFor(cb: Combat, caster: Unit | null, sp: Spell, t: Unit, m: number, roll: boolean, origin: string | null): Pick<Affected, 'dmg' | 'dmgAfterArmour' | 'heal' | 'shield' | 'roll' | 'saves'> {
  const mg = caster?.mg, sm = mg?.sigilMult || 1, em = mg?.elemMult || 1, hm = mg?.healMult || 1;
  let el = 0, sg = 0, hl = 0, sh = 0;
  for (const w of sp.subjects) { const d: any = W(w); if (!d) continue; if (d.damage) { if (d.damage_type === 'elemental') el += d.damage; else sg += d.damage; } if (d.heal) hl += d.heal; if (d.shield) sh += d.shield; }
  const sharp = caster && condOn(caster, 'sharpened') && roll ? (W('sharpen') as any)?.damage_mult ?? 1.25 : 1;
  const hook = (kind: string, v: number) => (caster ? (emit(cb, 'spell_mult', { u: caster, t, spell: sp, kind, mult: 1, cb }) as any).mult ?? 1 : 1) * v;
  const E = Math.round(hook('damage', el * m * sm * em * sharp)), S = Math.round(hook('damage', sg * m * sm * sharp));
  const arm = (S ? Math.max(1, S - t.armour) : 0) + (E ? Math.max(1, E - Math.floor(t.armour / 2)) : 0);
  const cover = !!origin && sp.missile === 'bolt' && !sp.uniqueSubjects.includes('shock') && !!coverTileFor(cb, origin, t.pos);
  const bonus = caster ? (mg?.brain ?? 0) + (caster.sk?.brain_power ?? 0) + condSkillMod(caster, 'brain_power') + condHit(caster, t, cb) - (cover ? 5 : 0) : 0;
  const saves: Affected['saves'] = [];
  for (const w of sp.uniqueSubjects) { const a: any = (W(w) as any)?.applies; if (a && a.save && SAVES[a.save]) saves.push({ cond: a.condition, fam: SAVES[a.save], tn: 12 + (caster ? unitDebuff(caster, SAVES[a.save]) : 0) }); }
  if (sp.uniqueSubjects.includes('step') && caster && t.side !== caster.side) saves.push({ cond: 'teleport', fam: 'body', tn: 12 + unitDebuff(caster, 'body') });
  return { dmg: E + S, dmgAfterArmour: arm, heal: Math.round(hook('heal', hl * m * sm * hm)), shield: Math.round(hook('shield', sh * m * sm * hm)),
    roll: sp.damaging && roll ? { bonus, need: t.def, pct: Math.max(5, Math.min(95, (21 - (t.def - bonus)) * 5)), cover } : null, saves };
}
/** Who a spell affects on a set of tiles, with every one it spares or skips flagged (spec: Filter KIN; Grammar 9). */
function affectedOn(cb: Combat, caster: Unit | null, side: 'pc' | 'foe', sp: Spell, mult: Record<string, number>, base: number, via: Affected['via'], missile: number, origin: string | null, roll: boolean): Affected[] {
  const out: Affected[] = [];
  for (const t of cb.units) {
    if (t.dead || !(t.pos in mult)) continue;
    const ally = t.side === side, self = !!caster && t === caster, m = Math.round(base * mult[t.pos] * 1000) / 1000;
    const a: Affected = { unit: t.id, name: t.name, at: t.pos, ally, enemy: !ally, self, mult: m, via, missile, ...numbersFor(cb, caster, sp, t, m, roll, origin) };
    if (sp.kin && ally) a.kinSpared = true;
    else if ((t.downed || t.surrendered) && sp.harmful && !sp.subjects.some(isBoonWord) && !sp.workings.length) a.skipped = t.downed ? 'downed' : 'surrendered';
    else if (self && sp.uniqueSubjects.length === 1 && sp.uniqueSubjects[0] === 'quicken') a.skipped = 'quicken_self';
    else if (sp.uniqueSubjects.length === 1 && sp.uniqueSubjects[0] === 'quicken' && t.quickRound === cb.round) a.skipped = 'quicken_round';
    else if (sp.uniqueSubjects.length === 1 && sp.uniqueSubjects[0] === 'mask' && condOn(t, 'marked')) a.skipped = 'marked';
    out.push(a);
  }
  return out;
}
const counts = (a: Affected) => !a.kinSpared && !a.skipped;
/** CHAIN's jumps (spec: Delivery): the next creature within 3 tiles of the last hit, no closer to the source, never one
 * already hit; nearest first, ties by the engine's order; skips the Downed, the surrendered and (with KIN) your side. */
function chainJumps(cb: Combat, sp: Spell, side: 'pc' | 'foe', source: string, first: Unit | null, hit: Set<string>): { unit: Unit; from: string; mult: number }[] {
  const out: { unit: Unit; from: string; mult: number }[] = []; if (!sp.chain || !first) return out;
  let last = first; const seen = new Set(hit); seen.add(first.id);
  for (let j = 1; j <= sp.chain; j++) {
    const c = cb.units.map((v, i) => ({ v, i })).filter(({ v }) => !v.dead && !v.downed && !v.surrendered && !seen.has(v.id) && !(sp.kin && v.side === side) && dist(v.pos, last.pos) <= sp.chainRadius && dist(source, v.pos) >= dist(source, last.pos))
      .sort((a, b) => dist(a.v.pos, last.pos) - dist(b.v.pos, last.pos) || a.i - b.i)[0];
    if (!c) break;
    out.push({ unit: c.v, from: last.pos, mult: Math.pow(sp.chainMult, j) }); seen.add(c.v.id); last = c.v;
  }
  return out;
}
/** Where a forced move would leave a creature (preview only; magicShove does the real one). */
function shoveEnd(cb: Combat, t: Unit, from: string, n: number): string {
  const [fx, fy] = xy(from); let [x, y] = xy(t.pos); let dx = sgn(x - fx), dy = sgn(y - fy); if (n < 0) { dx = -dx; dy = -dy; } if (!dx && !dy) return t.pos;
  for (let i = 0; i < Math.abs(n); i++) { const k = key(x + dx, y + dy); if (!standable(cb.map, k) || cb.units.some((u) => u !== t && !u.dead && u.pos === k) || objectsAt(cb, k).some((o) => o.hp == null ? false : o.hp > 0 && ['pillar', 'barricade', 'door', 'crate', 'sigil_wall'].includes(o.kind) && !o.open)) break; x += dx; y += dy; }
  return key(x, y);
}
/** A free tile a creature may land on (STEP): standable, nobody there, nothing blocking. */
export function freeTile(cb: Combat, k: string, not?: Unit): boolean {
  return onMap(cb, k) && standable(cb.map, k) && !cb.units.some((u) => u !== not && !u.dead && u.pos === k) && !objectsAt(cb, k).some((o) => (o.hp == null || o.hp > 0) && !(o as any).open && ['crate', 'low_wall', 'pillar', 'barricade', 'door', 'hole', 'barrel', 'container', 'terminal', 'turret', 'sigil_wall'].includes(o.kind));
}
/** Is a tile empty for RAISE: no creature, object, glyph or placed Sigil magic. */
function emptyForRaise(cb: Combat, k: string): boolean {
  return onMap(cb, k) && standable(cb.map, k) && !cb.units.some((u) => !u.dead && u.pos === k) && !objectsAt(cb, k).length && !(cb.glyphs || []).some((g) => g.pos === k)
    && !(cb.zones || []).some((z) => PLACED.has(z.kind) && z.tiles.includes(k));
}
const PLACED = new Set(['field', 'trap', 'turret', 'wall']);
/** NULL's catch on a set of tiles (spec: NULL): glyphs (Keystones spared), fields, traps, turrets, smoke, light and
 * RAISE walls. Grand forms and class zones stay. */
function nullCatch(cb: Combat, tiles: string[]): { glyphs: Glyph[]; zones: Zone[]; walls: any[] } {
  const T = new Set(tiles);
  return {
    glyphs: (cb.glyphs || []).filter((g) => T.has(g.pos) && !(g as any).keystone),
    zones: (cb.zones || []).filter((z) => (PLACED.has(z.kind) || z.kind === 'veil' || z.kind === 'light') && z.tiles.some((k) => T.has(k))),
    walls: objectsOf(cb).filter((o) => o.kind === 'sigil_wall' && T.has(o.pos)),
  };
}

// ---------- planning (the preview and the real Evoke share it) ----------
export interface EvokeOpts { /** TWICE: the tiles of the second and later missiles (aims[0] = aim). */ aims?: string[]; /** STEP: where the target lands. */ dest?: string; /** COMMAND: halt | kneel | drop | move. */ order?: string; /** COMMAND move: the tile. */ orderTo?: string;
  /** A stand-in Subject a class move puts in the spell's Subject place (the Circuit Mage's Fusion: the Outburst). It counts toward the 4-glyph cap but not Max Sigil words or the charge, and only shapes the plan (additive, lane classes-k). */ subject?: string }
export interface MissilePlan {
  i: number; aim: string; kind: Spell['missile']; origin: string; impact: string; dir: Dir;
  path: string[]; blockedAt: string | null; stoppedBy: 'creature' | 'cover' | null; arc: { from: string; to: string } | null; hops: string[];
  burst: { tiles: string[]; mult: Record<string, number>; core: string }; chain: { unit: string; from: string; to: string; mult: number }[];
  pull: { unit: string; from: string; to: string }[]; step: { unit: string; from: string; to: string }[]; stepTo: string[]; placed: 'field' | 'trap' | 'turret' | null;
  raise: string[]; nulls: number; veil: string[]; light: string[]; mainTarget: string | null; self: boolean;
  /** Why this missile can't go yet (STEP needs a landing tile). */ why?: string;
}
export interface EvokePreview {
  ok: boolean; why?: string; pattern?: Pattern; spell?: Spell; charge: number; ap: number; flux: number;
  /** The units it would affect (not spared or skipped), across every missile. */
  targets: string[]; impact?: string | null; range?: number; needsAim: boolean;
  facing?: Facing; area: string[]; pickable: string[]; missiles: MissilePlan[]; affected: Affected[]; fizzle: boolean; refusedAim?: string;
  /** The expected direct damage to the other side and to yours (the AI weighs these). */
  value?: { foe: number; own: number; boon: number; nulls: number };
}
/** The relay allies a caster may hop through (spec: RELAY): an ally within range, in sight; each extra copy one more ally
 * within range of the last, in its sight. Returns ally ids with their hop chains. */
function relayChains(cb: Combat, u: Unit, sp: Spell, depth: number): { ally: Unit; hops: string[] }[] {
  const out: { ally: Unit; hops: string[] }[] = [], start = { pos: u.pos, chain: [] as string[] };
  let frontier = [start]; const seen = new Set<string>([u.id]);
  for (let h = 0; h < sp.relayHops; h++) {
    const next: typeof frontier = [];
    for (const f of frontier) for (const a of cb.units) {
      if (a.side !== u.side || a.dead || seen.has(a.id) || dist(f.pos, a.pos) > depth || !lineOfSight(cb, f.pos, a.pos)) continue;
      seen.add(a.id); const chain = [...f.chain, a.pos]; out.push({ ally: a, hops: chain }); next.push({ pos: a.pos, chain });
    }
    frontier = next;
  }
  return out;
}
/** Where a caster may stand to Evoke a pattern, each tile with its facing or why it's refused (spec: Evoking). Items may
 * widen how far ('evoke_reach' {u, pattern, reach}: past 1 needs sight of the glyph). */
export function evokeOrigins(cb: Combat, u: Unit, p: Pattern | string): { tile: string; ok: boolean; why?: string; mode?: Facing['mode']; dir?: Dir }[] {
  const pat = typeof p === 'string' ? findPattern(cb, p, u.pos) : p; if (typeof pat === 'string') return [];
  const er: any = emit(cb, 'evoke_reach', { u, pattern: pat, reach: 1, cb }), reach = Math.max(1, er.reach || 1), out: { tile: string; ok: boolean; why?: string; mode?: Facing['mode']; dir?: Dir }[] = [];
  const seen = new Set<string>();
  for (const g of pat.tiles) for (const k of around(g, reach)) {
    if (seen.has(k) || !onMap(cb, k)) continue; seen.add(k);
    const d = Math.min(...pat.tiles.map((t) => dist(t, k)));
    if (d > 1 && !pat.tiles.some((t) => dist(t, k) <= reach && lineOfSight(cb, k, t))) continue;
    const blocked = !standable(cb.map, k) || cb.units.some((x) => x !== u && !x.dead && x.pos === k);
    const f = facingFrom(pat, k);
    if (typeof f === 'string') out.push({ tile: k, ok: false, why: f });
    else if (blocked) out.push({ tile: k, ok: false, why: 'Nobody can stand there.', mode: f.mode, dir: f.dir });
    else out.push({ tile: k, ok: true, mode: f.mode, dir: f.dir });
  }
  return out;
}
/** Plan an Evoke from where the caster stands: everything the screen shows before it is confirmed (spec: Mana, Sigils 9).
 * tile: any glyph of the pattern. aim: the target tile (TWICE: opts.aims for the rest). Pure: no dice, no changes. */
export function planEvoke(cb: Combat, u: Unit, tile: string, aim?: string, opts: EvokeOpts = {}): EvokePreview {
  const no = (why: string, extra: Partial<EvokePreview> = {}): EvokePreview => ({ ok: false, why, charge: 0, ap: SPELL_AP.evoke, flux: 0, targets: [], needsAim: false, area: [], pickable: [], missiles: [], affected: [], fizzle: false, ...extra });
  const e = sigilReady(cb, u); if (e) return no(e);
  const p = findPattern(cb, tile, u.pos); if (typeof p === 'string') return no(p);
  const words = opts.subject ? [...p.words, opts.subject] : p.words;
  const ge = grammarError(words, u.mg!.maxWords + (opts.subject ? 1 : 0)); if (ge) return no(ge, { pattern: p });
  if (p.side !== u.side && !p.words.every((w) => u.mg!.words.includes(w))) return no('You can\'t read all of those words.', { pattern: p });
  // 'spell_shape' {u, pattern, spell, cb} (mutable spell: a fresh copy per plan): items that reshape the compiled spell
  // before it is aimed (the Mage's Payload). Additive hook (lane classes-i).
  const sp = ((emit(cb, 'spell_shape', { u, pattern: p, spell: compileSpell(words), cb }) as any).spell || compileSpell(words)) as Spell;
  // Where you stand: within reach of a glyph, not on a middle glyph (the facing rule).
  const er: any = emit(cb, 'evoke_reach', { u, pattern: p, reach: 1, cb }), reach = Math.max(1, er.reach || 1);
  const near = p.tiles.some((k) => dist(u.pos, k) <= 1 || (dist(u.pos, k) <= reach && lineOfSight(cb, u.pos, k)));
  if (!near) return no('Stand within 1 tile of a glyph of the Line to Evoke it.', { pattern: p, spell: sp });
  const facing = facingFrom(p, u.pos); if (typeof facing === 'string') return no(facing, { pattern: p, spell: sp });
  // 'evoke_cost' {u, pattern, ap, charge, preview, fail} (mutable): items change what firing costs; fail refuses it.
  const ec: any = emit(cb, 'evoke_cost', { u, pattern: p, ap: SPELL_AP.evoke + (condOn(u, 'ldebuff') ? 1 : 0), charge: evokeCharge(p, u), preview: true, fail: '', cb });
  if (ec.fail) return no(ec.fail, { pattern: p, spell: sp });
  const charge = Math.max(0, ec.charge), eap = Math.max(0, ec.ap), depth = spellRange(cb, u, sp, p);
  const base = { pattern: p, spell: sp, charge, ap: eap, flux: 0, facing, range: depth, targets: [] as string[] };
  if (u.mg!.charge < charge) return no('Firing needs ' + charge + ' charge (' + u.mg!.charge + ' left): swap a core.', base);
  if (u.ap < eap) return no('Needs ' + eap + ' AP.', base);
  // The area (spec: the facing rule) and what may be picked in it.
  let area: string[] = [], laneOf: Record<string, string> = {}, relays: { ally: Unit; hops: string[] }[] = [];
  if (sp.missile === 'relay') {
    relays = relayChains(cb, u, sp, depth);
    for (const r of relays) for (const k of around(r.ally.pos, 1)) if (onMap(cb, k) && !laneOf[k]) { area.push(k); laneOf[k] = r.ally.pos; }
  } else { const a = areaTiles(cb, p, facing, depth); area = a.tiles; laneOf = a.lane; }
  const emptyOk = !!(sp.spread || sp.push || sp.workings.length || sp.stay || sp.wait || sp.watch);
  const pickable = [u.pos, ...area.filter((k) => emptyOk || cb.units.some((x) => x.pos === k && !x.dead))].filter((k, i, s) => s.indexOf(k) === i && !(sp.push && k === u.pos));
  const aims = [aim, ...(opts.aims || []).slice(aim && opts.aims?.[0] === aim ? 1 : 0)].filter(Boolean) as string[];
  const needsAim = true;
  if (!aims.length) return { ...base, ok: false, why: 'Pick a target in the area (or yourself).', targets: [], needsAim, area, pickable, missiles: [], affected: [], fizzle: false };
  // Each missile (TWICE: more): its flight, its Burst, then what happens after.
  const missiles: MissilePlan[] = [], affected: Affected[] = [];
  const nMiss = sp.watch ? 1 : sp.missiles; // WATCH + TWICE: one turret, two shots a round
  while (aims.length < nMiss) { const auto = autoAim(cb, u, sp, pickable, aims); if (!auto) break; aims.push(auto); }
  for (let i = 0; i < Math.min(nMiss, aims.length); i++) {
    const a = aims[i], self = a === u.pos;
    if (self && sp.push) return { ...base, ok: false, why: 'PUSH is refused on your own tile: a cone needs a way to face.', needsAim, area, pickable, missiles, affected, fizzle: false, refusedAim: a };
    if (!self && !laneOf[a]) return { ...base, ok: false, why: 'Out of the area: pick a tinted tile' + (sp.reach ? '' : ' (Touch reaches 1 tile)') + ', or yourself.', needsAim, area, pickable, missiles, affected, fizzle: false, refusedAim: a };
    if (!self && !emptyOk && !cb.units.some((x) => x.pos === a && !x.dead)) return { ...base, ok: false, why: 'Pick a creature: only a Working, SPREAD or PUSH may land on empty ground.', needsAim, area, pickable, missiles, affected, fizzle: false, refusedAim: a };
    let origin = self ? u.pos : laneOf[a], impact = a, path: string[] = [], blockedAt: string | null = null, stoppedBy: MissilePlan['stoppedBy'] = null, arc: MissilePlan['arc'] = null, hops: string[] = [];
    let f: Dir = facing.mode === 'stack' ? dir8(origin, a) : facing.dir;
    if (!self) {
      if (sp.missile === 'relay') { const r = relays.find((x) => dist(x.ally.pos, a) <= 1)!; hops = r.hops; origin = r.ally.pos; f = a === origin ? dir8(u.pos, origin) : dir8(origin, a); }
      else if (sp.missile === 'bolt') {
        if (!unitSees(cb, u, a) && !lineOfSight(cb, origin, a)) return { ...base, ok: false, why: 'SEEK needs sight of the target.', needsAim, area, pickable, missiles, affected, fizzle: false, refusedAim: a };
        const b = boltPath(cb, origin, a, u); path = b.path; impact = b.impact; blockedAt = b.blockedAt; stoppedBy = b.stoppedBy; if (impact !== origin) f = dir8(origin, impact);
      } else if (sp.missile === 'lob') {
        if (!unitSees(cb, u, a) && !lineOfSight(cb, origin, a)) return { ...base, ok: false, why: 'ARC needs sight of the tile it lands on.', needsAim, area, pickable, missiles, affected, fizzle: false, refusedAim: a };
        arc = { from: origin, to: a };
      }
    }
    const mp = missileEffects(cb, u, u.side, sp, { i, aim: a, origin, impact, f, self, kind: sp.missile, source: u.pos, deliveryMult: 1, roll: true, hops, path, blockedAt, stoppedBy, arc, opts, reachMult: self ? 1 : sp.reachMult });
    if (typeof mp === 'string') return { ...base, ok: false, why: mp, needsAim, area, pickable, missiles, affected, fizzle: false, refusedAim: a };
    missiles.push(mp.plan); affected.push(...mp.affected);
    if (mp.plan.why) return { ...base, ok: false, why: mp.plan.why, needsAim, area, pickable, missiles, affected, fizzle: false };
  }
  const live = affected.filter(counts), world = missiles.some((m) => m.placed || m.raise.length || m.nulls || m.veil.length || m.light.length || m.step.length);
  const fizzle = !live.length && !world;
  const targets = [...new Set(live.map((a) => a.unit))];
  const value = { foe: 0, own: 0, boon: 0, nulls: missiles.reduce((t, m) => t + m.nulls, 0) };
  for (const a of live) { const exp = a.roll ? a.dmgAfterArmour * a.roll.pct / 100 : a.dmgAfterArmour; if (a.ally) value.own += exp; else value.foe += exp; if (a.ally) value.boon += a.heal + a.shield; }
  return { ...base, ok: true, targets, impact: missiles[0]?.impact ?? null, needsAim, area, pickable, missiles, affected, fizzle, value };
}
/** The best tile for an extra missile nobody picked (TWICE): the nearest creature of the right kind in the area not already
 * picked (an enemy for harm, an ally for Boons). */
function autoAim(cb: Combat, u: Unit, sp: Spell, pickable: string[], taken: string[]): string | null {
  const boon = sp.subjects.every((w) => isBoonWord(w));
  const c = cb.units.filter((x) => !x.dead && pickable.includes(x.pos) && !taken.includes(x.pos) && (boon ? x.side === u.side : x.side !== u.side)).sort((a, b) => dist(u.pos, a.pos) - dist(u.pos, b.pos))[0];
  return c ? c.pos : null;
}
interface MissileCtx { i: number; aim: string; origin: string; impact: string; f: Dir; self: boolean; kind: Spell['missile']; source: string; deliveryMult: number; roll: boolean; hops: string[]; path: string[]; blockedAt: string | null; stoppedBy: MissilePlan['stoppedBy']; arc: MissilePlan['arc']; opts: EvokeOpts; reachMult: number; via?: Affected['via']; victim?: Unit | null }
/** One missile's whole effect, planned: its Burst, who it affects, the chain, the pull and the step, Workings. */
function missileEffects(cb: Combat, caster: Unit | null, side: 'pc' | 'foe', sp: Spell, c: MissileCtx): { plan: MissilePlan; affected: Affected[] } | string {
  const bt = burstTiles(cb, sp, c.impact, c.f);
  // A trap or turret going off strikes now: only an Evoke places (fields, traps, turrets).
  const placed: MissilePlan['placed'] = c.via === 'trap' || c.via === 'turret' ? null : sp.watch ? 'turret' : sp.wait ? 'trap' : sp.stay ? 'field' : null;
  const plan: MissilePlan = { i: c.i, aim: c.aim, kind: c.kind, origin: c.origin, impact: c.impact, dir: c.f, path: c.path, blockedAt: c.blockedAt, stoppedBy: c.stoppedBy, arc: c.arc, hops: c.hops,
    burst: bt, chain: [], pull: [], step: [], stepTo: [], placed, raise: [], nulls: 0, veil: [], light: [], mainTarget: null, self: c.self };
  if (placed) return { plan, affected: [] }; // fields, traps and turrets don't strike when Evoked (item 422)
  const base = c.reachMult * c.deliveryMult * sp.repMult;
  let aff = affectedOn(cb, caster, side, sp, bt.mult, base, c.via || (sp.burst ? 'burst' : 'direct'), c.i, c.origin, c.roll);
  if (c.self && !sp.burst && caster) aff = aff.filter((a) => a.unit === caster.id);
  const main = c.victim || (c.self && caster ? caster : liveAt(cb, c.impact)) || null;
  plan.mainTarget = main && aff.some((a) => a.unit === main.id && counts(a)) ? main.id : null;
  // CHAIN: jumps forward from the one it hit (spec: Delivery), each at ×0.75 of the last.
  if (sp.chain && plan.mainTarget) {
    for (const j of chainJumps(cb, sp, side, c.source, main, new Set(aff.filter(counts).map((a) => a.unit)))) {
      const one = affectedOn(cb, caster, side, sp, { [j.unit.pos]: 1 }, base * j.mult, 'chain', c.i, j.from, c.roll).filter((a) => a.unit === j.unit.id);
      for (const a of one) a.jump = plan.chain.length + 1;
      aff.push(...one); plan.chain.push({ unit: j.unit.id, from: j.from, to: j.unit.pos, mult: Math.round(base * j.mult * 1000) / 1000 });
    }
  }
  const live = aff.filter(counts);
  // PULL: each one it affected, toward the caster (a turret: toward the turret).
  if (sp.pull) for (const a of live) { const t = cb.units.find((x) => x.id === a.unit)!; if (t === caster) continue; const to = shoveEnd(cb, t, c.source, -sp.pull); if (to !== t.pos) plan.pull.push({ unit: t.id, from: t.pos, to }); }
  // Workings (spec: Workings; with a Burst they widen).
  const tiles = bt.tiles;
  if (sp.workings.includes('veil')) plan.veil = [...new Set([...around(c.impact, (W('veil') as any)?.blocks_sight_radius ?? 1), ...(sp.burst ? tiles : [])])].filter((k) => onMap(cb, k));
  if (sp.workings.includes('light')) plan.light = [...new Set([...around(c.impact, (W('light') as any)?.reveals_hidden_radius ?? 4), ...(sp.burst ? tiles : [])])].filter((k) => onMap(cb, k));
  if (sp.workings.includes('raise')) plan.raise = (sp.burst ? tiles : [c.impact]).filter((k) => emptyForRaise(cb, k));
  if (sp.workings.includes('null')) { const n = nullCatch(cb, sp.burst ? tiles : [c.impact]); plan.nulls = n.glyphs.length + n.zones.length + n.walls.length; }
  if (sp.workings.includes('step')) {
    const movers = live.map((a) => cb.units.find((x) => x.id === a.unit)!).filter(Boolean);
    const dest = c.opts.dest, max = (W('step') as any)?.teleport_tiles ?? 4;
    plan.stepTo = movers.length ? around(sp.burst ? c.impact : (main ? main.pos : c.impact), max).filter((k) => freeTile(cb, k, sp.burst ? undefined : main || undefined)) : [];
    if (!dest && movers.length) plan.why = 'Pick where STEP lands them: a free tile up to ' + max + ' away.';
    if (dest && movers.length) {
      const anchor = sp.burst ? c.impact : (main ? main.pos : c.impact), [ax, ay] = xy(anchor), [dx, dy] = xy(dest), off: Dir = [dx - ax, dy - ay];
      if (Math.max(Math.abs(off[0]), Math.abs(off[1])) > max) plan.why = 'STEP moves at most ' + max + ' tiles: pick a landing tile closer.';
      else if (!sp.burst && !freeTile(cb, dest, main || undefined)) plan.why = 'That landing tile isn\'t free.';
      else for (const t of movers) { const to = add(t.pos, off); if (to !== t.pos && freeTile(cb, to, t)) plan.step.push({ unit: t.id, from: t.pos, to }); }
    }
  }
  return { plan, affected: aff };
}

// ---------- drawing ----------
export interface DrawPreview { ok: boolean; why?: string; tile: string; cost: { ap: number; charge: number; flux: number }; effect: 'starts' | 'extends' | 'breaks' | 'stacks' | null; words: string[]; fades: Glyph | null; overload: boolean; capLeft: number }
/** Before drawing (spec: Mana, Sigils 9.1): the tile (yours), the cost, and whether the glyph starts a Line, extends one,
 * stacks on a tile (the two-glyph hook) or breaks a shape. Refusals cost nothing (item 447). */
export function previewDraw(cb: Combat, u: Unit, word: string, tile?: string): DrawPreview {
  migrateSigil(cb);
  const at = tile || u.pos, m = u.mg;
  const no = (why: string, extra: Partial<DrawPreview> = {}): DrawPreview => ({ ok: false, why, tile: at, cost: { ap: 0, charge: 0, flux: 0 }, effect: null, words: [], fades: null, overload: false, capLeft: 0, ...extra });
  const e = sigilReady(cb, u); if (e) return no(e);
  const w = W(word); if (!w) return no('No such word.');
  if (!m!.words.includes(word)) return no('You don\'t know ' + w.word + '.');
  if (at !== u.pos) return no('Draw on your own tile: step onto the tile first.');
  if (!standable(cb.map, at)) return no('Nothing can be drawn there.');
  const here = (cb.glyphs || []).filter((g) => g.pos === at), cap = glyphsPerTile(cb, u, at);
  if (here.length >= cap) return no(cap === 1 ? 'One glyph per tile: this tile already holds ' + here.map((g) => g.word.toUpperCase()).join(', ') + '.' : 'This tile holds ' + cap + ' glyphs at most.');
  const gc = glyphCost(cb, u, word, true, at);
  const cost = { ap: gc.ap, charge: gc.charge, flux: gc.flux };
  if (gc.fail) return no(gc.fail, { cost });
  // The shape it would make with the glyphs of your side it touches.
  const fake: Glyph = { id: 'gl' + ((cb.glyphSeq || 0) + 1), word, pos: at, by: u.id, side: u.side, left: 1, who: u.name, v: SIGIL_REV } as Glyph;
  const all = [...(cb.glyphs || []), fake], comp = groupAt(all, at, u.side), s = readShape(all, comp, u.side, u.pos);
  let effect: DrawPreview['effect'] = comp.length === 1 ? (here.length ? 'stacks' : 'starts') : typeof s === 'string' ? 'breaks' : 'extends';
  const words = typeof s === 'string' ? comp.flatMap((k) => all.filter((g) => g.pos === k && g.side === u.side).map((g) => g.word)) : s.words;
  const collinear = comp.length > 1 && !!straight(comp);
  if (collinear || effect === 'stacks') {
    const ws = typeof s === 'string' ? words : s.words, cnt = count(ws), reaches = Object.keys(cnt).filter(isReach);
    const drawers = [...new Set((typeof s === 'string' ? [] : s.glyphs).map((g) => g.by))].map((id) => cb.units.find((x) => x.id === id)?.mg?.maxWords || 0);
    const cap4 = Math.min(MAX_GLYPHS, Math.max(m!.maxWords, ...drawers));
    if (ws.length > MAX_GLYPHS || comp.length > MAX_GLYPHS) return no('Past the cap: a spell holds at most ' + MAX_GLYPHS + ' glyphs.', { cost, effect, words: ws });
    if (ws.length > cap4) return no('Past your cap: ' + ws.length + ' glyphs, and your Max Sigil words is ' + m!.maxWords + '.', { cost, effect, words: ws });
    if (reaches.length > 1) return no('A second Reach word is refused: one Reach word per spell (' + reaches.map((r) => r.toUpperCase()).join(', ') + ').', { cost, effect, words: ws });
    if ((cnt.kin || 0) > 1) return no('KIN takes one copy.', { cost, effect, words: ws });
    if (cnt.watch && cnt.stay) return no('WATCH and STAY are refused together: a turret already lasts.', { cost, effect, words: ws });
  } else if (comp.length > MAX_GLYPHS) effect = 'breaks';
  if (u.ap < gc.ap) return no('Needs ' + gc.ap + ' AP.', { cost, effect, words });
  if (m!.charge < gc.charge) return no('Not enough charge in the core (' + m!.charge + ' left, ' + w.word + ' needs ' + gc.charge + '): swap a core (2 AP).', { cost, effect, words });
  const mine = myGlyphs(cb, u), capG = groundCap(u), fades = mine.length + 1 > capG ? mine[0] : null;
  return { ok: true, tile: at, cost, effect, words, fades, overload: m!.flux + gc.flux > FLUX_MAX, capLeft: Math.max(0, capG - mine.length - 1) };
}
/** Draw one glyph on your own tile (spec: Drawing): Glyph AP, the word's charge, its Flux. The oldest of yours fades past
 * your cap of glyphs on the ground. tile defaults to (and must be) your own. */
export function drawGlyph(cb: Combat, rng: Rng, u: Unit, word: string, tile?: string): string | null {
  const pv = previewDraw(cb, u, word, tile); if (!pv.ok) return pv.why || 'Can\'t draw that.';
  const gc = glyphCost(cb, u, word, false, pv.tile); if (gc.fail) return gc.fail;
  const m = u.mg!, w = W(word)!;
  u.ap = Math.round((u.ap - gc.ap) * 10) / 10; m.charge -= gc.charge;
  const g: Glyph = { id: 'gl' + (cb.glyphSeq = (cb.glyphSeq || 0) + 1), word, pos: pv.tile, by: u.id, side: u.side, left: 2 + Math.floor(m.durBonus || 0), who: u.name, v: SIGIL_REV } as Glyph;
  cb.glyphs = [...(cb.glyphs || []), g]; cb.sigilV = SIGIL_REV;
  emitFx(cb, 'draw', { unit: u.id, at: u.pos, tile: pv.tile, word, side: u.side, group: w.group, cls: w.class, element: isElement(word) ? word : null, effect: pv.effect, words: pv.words });
  let faded = '';
  const mine = myGlyphs(cb, u);
  if (mine.length > groundCap(u)) { const old = mine[0]; cb.glyphs = cb.glyphs.filter((x) => x !== old); emitFx(cb, 'glyph_fade', { tile: old.pos, word: old.word, side: old.side, why: 'cap' }); faded = ' (' + old.word.toUpperCase() + ' at ' + refOf(old.pos) + ' fades: ' + groundCap(u) + ' glyphs at most)'; }
  cb.log.push(u.name + ' draws ' + w.word + ' at ' + refOf(pv.tile) + ' (' + gc.charge + ' charge, ' + gc.ap + ' AP' + (pv.effect === 'extends' ? ', the Line reads ' + pv.words.map((x) => x.toUpperCase()).join(' · ') : pv.effect === 'breaks' ? ', no shape now' : '') + ')' + faded + '.' + (gc.flux ? flux(cb, rng, u, gc.flux) : ''));
  emit(cb, 'glyph_drawn', { u, glyph: g, cb, rng });
  return null;
}
/** Scuff (1 AP): wipe the glyphs on your tile, and a turret standing there (spec: Drawing 7; WATCH). */
export function scuff(cb: Combat, u: Unit): string | null {
  migrateSigil(cb);
  const here = (cb.glyphs || []).filter((g) => g.pos === u.pos && !(g as any).keystone), tur = (cb.zones || []).filter((z) => z.kind === 'turret' && z.tiles[0] === u.pos);
  if (!here.length && !tur.length) return (cb.glyphs || []).some((g) => g.pos === u.pos) ? 'A Keystone can\'t be scuffed.' : 'No glyphs under you.';
  if (u.ap < SPELL_AP.scuff) return 'Needs 1 AP.';
  u.ap -= SPELL_AP.scuff; cb.glyphs = (cb.glyphs || []).filter((g) => g.pos !== u.pos || (g as any).keystone);
  emitFx(cb, 'scuff', { unit: u.id, at: u.pos });
  for (const z of tur) destroyPlaced(cb, z, u.name + ' scuffs it out');
  cb.log.push(u.name + ' scuffs out ' + [...here.map((g) => g.word.toUpperCase()), ...tur.map(() => 'a turret')].join(' and ') + ' at ' + refOf(u.pos) + '.');
  return null;
}

// ---------- Evoke ----------
export function previewEvoke(cb: Combat, u: Unit, tile: string, aim?: string, opts: EvokeOpts = {}): EvokePreview { return planEvoke(cb, u, tile, aim, opts); }
/** Evoke (spec: Evoking): fire the pattern from where you stand at the tile you pick. */
export function evoke(cb: Combat, rng: Rng, u: Unit, tile: string, aim?: string, opts: EvokeOpts = {}): string | null {
  const pv = planEvoke(cb, u, tile, aim, opts); if (!pv.ok) return pv.why || 'Can\'t fire that.';
  return magicSpellWords(pv.pattern!.glyphs.length, () => evokeInner(cb, rng, u, pv, opts));
}
function evokeInner(cb: Combat, rng: Rng, u: Unit, pv: EvokePreview, opts: EvokeOpts): string | null {
  const p = pv.pattern!, sp = pv.spell!, m = u.mg!, name = p.words.map((w) => w.toUpperCase()).join(' · ');
  u.ap = Math.round((u.ap - pv.ap) * 10) / 10; m.charge -= pv.charge; m.cast = true;
  const head = u.name + ' evokes ' + name + ' (' + (p.shape === 'stack' ? 'a Stack' : 'a Line of ' + p.tiles.length + ', ' + pv.facing!.mode) + ', ' + pv.charge + ' charge)';
  emitFx(cb, 'evoke', { unit: u.id, at: u.pos, shape: p.shape, tiles: p.tiles, words: p.words, element: sp.element, side: u.side, facing: pv.facing!.mode, dir: pv.facing!.dir, area: pv.area,
    src: pv.missiles[0]?.origin, impact: pv.missiles[0]?.impact ?? null, targets: pv.targets, targetAt: pv.targets.map((id) => cb.units.find((x) => x.id === id)?.pos),
    missiles: pv.missiles.map((x) => ({ origin: x.origin, kind: x.kind, path: x.path, blockedAt: x.blockedAt, impact: x.impact, arc: x.arc, hops: x.hops, burst: x.burst.tiles, core: x.burst.core, chain: x.chain, placed: x.placed })),
    stay: sp.stay, placed: pv.missiles[0]?.placed || null, fizzle: pv.fizzle });
  // The glyphs fade as the spell fires (a Keystone survives).
  const used = new Set(p.glyphs.filter((g) => !(g as any).keystone).map((g) => g.id)); cb.glyphs = (cb.glyphs || []).filter((g) => !used.has(g.id));
  if (pv.fizzle) {
    emitFx(cb, 'fizzle', { unit: u.id, at: u.pos, tiles: pv.missiles.flatMap((x) => x.burst.tiles), words: p.words, element: sp.element });
    cb.log.push(head + ': nothing it may affect, and it fizzles (the charge, AP and Flux are spent).');
    emit(cb, 'spell_fizzle', { u, pattern: p, spell: sp, cb });
    emit(cb, 'evoked', { u, pattern: p, spell: sp, plan: pv, targets: [], impact: pv.impact, fizzle: true, charge: pv.charge, ap: pv.ap, cb, rng });
    return null;
  }
  let line = '', dealt = 0; const hitIds: string[] = [];
  for (const mp of pv.missiles) {
    if (pv.missiles.length > 1) line += ' · missile ' + (mp.i + 1) + ' at ' + refOf(mp.impact) + ':';
    if (mp.placed) { line += place(cb, u, sp, mp); continue; }
    const r = strike(cb, rng, u, u.side, sp, mp, pv.affected.filter((a) => a.missile === mp.i), { roll: true, source: u.pos, opts });
    line += r.line; dealt += r.dealt; hitIds.push(...r.hit);
  }
  // LEECH (spec: Delivery): you heal a share of the spell's direct damage, in all (not × Healing given).
  if (sp.leech && dealt > 0 && !u.dead) { const n = Math.floor(dealt * sp.leech), r = healUnit(cb, u, n, u, 'leech'); emitFx(cb, 'leech', { unit: u.id, to: u.pos, from: pv.missiles.map((x) => x.impact), amount: r.restored, element: sp.element }); line += ' · ' + u.name + ' drinks ' + r.restored + ' HP (LEECH)'; }
  if (sp.damaging && condOn(u, 'sharpened')) endCond(u, 'sharpened', cb); // Sharpened is spent on the next attack
  if (u.hidden && sp.harmful) line += revealUnit(cb, u, 'cast a spell'); // MASK lasts until you attack
  cb.log.push(head + (line || ' · it strikes and finds no one') + '.');
  emit(cb, 'evoked', { u, pattern: p, spell: sp, plan: pv, targets: hitIds.map((id) => cb.units.find((x) => x.id === id)).filter(Boolean), impact: pv.impact, stay: sp.stay, zone: (cb.zones || [])[(cb.zones || []).length - 1], dealt, charge: pv.charge, ap: pv.ap, cb, rng });
  return null;
}
/** Apply one Subject set to one creature: one hit roll for the damage, saves for the Afflictions, Boons and the creature
 * Workings. Returns the log and the direct damage dealt (after armour). */
function applyTo(cb: Combat, rng: Rng, by: Unit | null, side: 'pc' | 'foe', sp: Spell, t: Unit, a: Affected, o: { roll: boolean; origin: string; opts: EvokeOpts; skipHarm?: boolean }): { line: string; dealt: number } {
  let line = '', dealt = 0; const harmOk = !(t.downed || t.surrendered);
  if (sp.damaging && harmOk) {
    let crit = false, r = 0;
    if (o.roll && by) {
      r = d20(rng); const add = (emit(cb, 'spell_roll', { u: by, t, die: r, add: 0, kind: 'sigil', cb }) as any).add || 0, tot = r + (a.roll?.bonus ?? 0) + add;
      crit = r === 20;
      if (r === 1 || (!crit && tot < t.def)) { emitFx(cb, 'miss', { unit: by.id, target: t.id, at: t.pos, by: 'sigil', element: sp.element }); line += ' · ' + sp.uniqueSubjects.filter(isElement).map((w) => w.toUpperCase()).join('·') + ' misses ' + t.name + ' (d20 ' + r + ' → ' + tot + ' vs ' + t.def + (a.roll?.cover ? ', cover' : '') + ')'; return { line: line + nonDamage(cb, rng, by, side, sp, t, a, o, harmOk), dealt }; }
    }
    const hp0 = t.hp + (t.shield || 0), sm = by?.mg?.sigilMult || 1, em = by?.mg?.elemMult || 1, sharp = by && condOn(by, 'sharpened') && o.roll && !['turret', 'trap', 'field'].includes(a.via) ? (W('sharpen') as any)?.damage_mult ?? 1.25 : 1;
    const parts: { w: string; type: 'elemental' | 'sigil'; n: number }[] = [];
    for (const w of sp.subjects) { const d: any = W(w); if (!d?.damage) continue; const type = d.damage_type === 'elemental' ? 'elemental' : 'sigil', p = parts.find((x) => x.type === type); if (p) p.n += d.damage; else parts.push({ w, type, n: d.damage }); }
    line += ' · ' + sp.uniqueSubjects.filter(isElement).map((w) => w.toUpperCase()).join('·') + (r ? ' hits ' + t.name + ' (d20 ' + r + (crit ? ', CRITICAL' : '') + ')' : ' catches ' + t.name);
    for (const p of parts) {
      const hk = by ? (emit(cb, 'spell_mult', { u: by, t, spell: sp, kind: 'damage', mult: 1, cb }) as any).mult ?? 1 : 1;
      const raw = Math.round(p.n * a.mult * sm * (p.type === 'elemental' ? em : 1) * sharp * hk * (crit ? 2 : 1));
      line += withElement(sp.element, () => harm(cb, rng, by, t, raw, p.type, DMG_TYPE[p.w]));
    }
    dealt += Math.max(0, hp0 - (t.hp + (t.shield || 0)));
    if (!t.dead) {
      if (crit && sp.uniqueSubjects.includes('fire')) line += applyCond(cb, rng, by, t, 'burning');
      for (const w of sp.uniqueSubjects) { const d: any = W(w); if (!isElement(w) || !d?.applies) continue; line += withElement(w, () => applyCond(cb, rng, by, t, condKey(d.applies.condition), d.applies.rounds, (d.applies.save || undefined) as Fam | undefined, { skipSave: !d.applies.save })); }
      if (sp.uniqueSubjects.includes('gale')) line += magicShove(cb, t, o.origin, (W('gale') as any)?.push_tiles || 2, by);
    }
  }
  return { line: line + nonDamage(cb, rng, by, side, sp, t, a, o, harmOk), dealt };
}
const DMG_TYPE: Record<string, string | undefined> = { shock: 'lightning', spark: 'lightning', fire: 'fire', freeze: 'frost', acid: 'acid' };
const condKey = (id: string) => (id === 'left_brain_debuff' ? 'ldebuff' : id === 'right_brain_debuff' ? 'rdebuff' : id);
/** The Afflictions, Boons and creature Workings of a spell on one creature. */
function nonDamage(cb: Combat, rng: Rng, by: Unit | null, side: 'pc' | 'foe', sp: Spell, t: Unit, a: Affected, o: { opts: EvokeOpts }, harmOk: boolean): string {
  let line = '';
  for (const w of sp.uniqueSubjects) {
    if (t.dead) break; const d: any = W(w);
    if (isAffliction(w) && harmOk) {
      if (w === 'command') {
        const order = (o.opts.order && (d.orders || []).includes(o.opts.order) ? o.opts.order : 'halt');
        const arg = order === 'move' && o.opts.orderTo ? 'move:' + o.opts.orderTo : order === 'move' ? 'halt' : order;
        const r = applyCond(cb, rng, by, t, 'commanded', 1, 'brain', { arg }); line += r;
        if (condOn(t, 'commanded')) emitFx(cb, 'command', { target: t.id, at: t.pos, order: arg.split(':')[0], to: arg.startsWith('move:') ? arg.slice(5) : null, by: by?.id });
        continue;
      }
      line += applyCond(cb, rng, by, t, condKey(d.applies.condition), d.applies.rounds, (d.applies.save || undefined) as Fam | undefined);
      continue;
    }
    if (isBoonWord(w)) {
      if (w === 'ward') { const s = grantShield(cb, t, a.shield, by); emitFx(cb, 'boon', { target: t.id, at: t.pos, word: 'ward', amount: s }); line += ' · ' + t.name + ' is warded (' + s + ' shield)'; }
      else if (w === 'mend') { line += heal(t, a.heal, cb, by, 'sigil'); emitFx(cb, 'boon', { target: t.id, at: t.pos, word: 'mend', amount: a.heal }); }
      else if (w === 'quicken') {
        if (by && t === by) { line += ' · QUICKEN never takes its caster'; continue; }
        if (t.quickRound === cb.round) { line += ' · ' + t.name + ' was already Quickened this round'; continue; }
        t.quickRound = cb.round; line += applyCond(cb, rng, by, t, 'quickened', 99, undefined, { skipSave: true }); emitFx(cb, 'boon', { target: t.id, at: t.pos, word: 'quicken', amount: d.ap ?? 2 });
      } else if (w === 'sharpen') { line += applyCond(cb, rng, by, t, 'sharpened', 1, undefined, { skipSave: true }); emitFx(cb, 'boon', { target: t.id, at: t.pos, word: 'sharpen' }); }
      else if (w === 'cleanse') { for (let i = 0; i < (sp.counts.cleanse || 1); i++) { const id = newestCondition(t); if (!id) { if (!i) line += ' · ' + t.name + ' has nothing to cleanse'; break; } endCond(t, id, cb); line += ' · ' + t.name + ' is cleansed of ' + condName(id); emitFx(cb, 'boon', { target: t.id, at: t.pos, word: 'cleanse', cond: id }); } }
      continue;
    }
    if (w === 'mask') {
      if (condOn(t, 'marked')) { line += ' · ' + t.name + ' is Marked: MASK fizzles on them'; continue; }
      const r = hideUnit(cb, t, 'MASK'); t.maskLeft = (d.applies?.rounds ?? 2); t.maskFresh = active(cb) === t && !cb.overworld; emitFx(cb, 'mask', { target: t.id, at: t.pos }); line += r || ' · ' + t.name + ' is Hidden';
    }
  }
  return line;
}
/** CLEANSE's pick: the newest condition on the creature (a debuff; boons and states stay). */
export function newestCondition(t: Unit): string | null {
  const at = t.condAt || {};
  const ids = [...Object.keys(t.conds || {}).filter((id) => (t.conds![id] || 0) > 0 && !isBoon(id)), ...(t.bleed ? ['bleeding'] : []), ...(t.prone ? ['prone'] : []), ...(t.dazedNext ? ['dazed'] : [])];
  return ids.sort((a, b) => (at[b] || 0) - (at[a] || 0))[0] || null;
}
/** A missile that strikes: every affected creature, then the chain, pull and step, then the Workings on the ground. */
function strike(cb: Combat, rng: Rng, by: Unit | null, side: 'pc' | 'foe', sp: Spell, mp: MissilePlan, aff: Affected[], o: { roll: boolean; source: string; opts: EvokeOpts }): { line: string; dealt: number; hit: string[] } {
  let line = '', dealt = 0; const hit: string[] = [];
  for (const a of aff) {
    const t = cb.units.find((x) => x.id === a.unit); if (!t || t.dead) continue;
    if (a.kinSpared) { line += ' · KIN spares ' + t.name; continue; }
    if (a.skipped) { line += ' · ' + t.name + ' is skipped (' + a.skipped.replace('_', ' ') + ')'; continue; }
    if (a.via === 'chain') emitFx(cb, 'chain', { from: mp.chain[(a.jump || 1) - 1]?.from, to: t.pos, target: t.id, jump: a.jump, mult: a.mult, element: sp.element });
    const r = applyTo(cb, rng, by, side, sp, t, a, { roll: o.roll, origin: a.via === 'chain' ? mp.chain[(a.jump || 1) - 1]?.from || mp.origin : mp.origin, opts: o.opts });
    line += r.line; dealt += r.dealt; hit.push(t.id);
  }
  for (const pl of mp.pull) { const t = cb.units.find((x) => x.id === pl.unit); if (t && !t.dead) line += magicShove(cb, t, o.source, -sp.pull, by); }
  for (const st of mp.step) {
    const t = cb.units.find((x) => x.id === st.unit); if (!t || t.dead || !freeTile(cb, st.to, t)) continue;
    if (by && t.side !== by.side) { const sv = teleportSave(cb, rng, by, t); if (sv) { line += sv; continue; } }
    const from = t.pos; t.pos = st.to; emitFx(cb, 'blink', { target: t.id, from, to: st.to, element: 'step' }); line += ' · ' + t.name + ' steps to ' + refOf(st.to);
    sigilEnter(cb, rng, t, st.to);
  }
  if (mp.veil.length) { addZone(cb, { kind: 'veil', tiles: mp.veil, words: ['veil'], by: by?.id || '', side, left: ((W('veil') as any)?.lasts_rounds ?? 2) + Math.floor(by?.mg?.durBonus || 0), mult: 1, who: by?.name || '' }); emitFx(cb, 'veil', { at: mp.impact, tiles: mp.veil, side }); line += ' · smoke-bots fill ' + refOf(mp.impact); }
  if (mp.light.length) { addZone(cb, { kind: 'light', tiles: mp.light, words: ['light'], by: by?.id || '', side, left: 99, mult: 1, who: by?.name || '' }); emitFx(cb, 'light', { at: mp.impact, tiles: mp.light, side }); for (const v of cb.units) if (v.hidden && mp.light.includes(v.pos)) line += revealUnit(cb, v, 'LIGHT') && ' · LIGHT reveals ' + v.name; line += ' · light floods around ' + refOf(mp.impact); }
  if (mp.raise.length) line += raiseWalls(cb, by, side, mp.raise.filter((k) => emptyForRaise(cb, k)));
  if (sp.workings.includes('null')) line += nullWave(cb, sp.burst ? mp.burst.tiles : [mp.impact], mp.impact);
  return { line, dealt, hit };
}
function teleportSave(cb: Combat, rng: Rng, by: Unit, t: Unit): string {
  const ca: any = emit(cb, 'cond_apply', { by, t, id: 'teleport', fam: 'body', rounds: 0, skipSave: false, cancel: false, why: '', tnAdd: 0, saveAdd: 0, cb, rng });
  if (ca.cancel) return ' · ' + t.name + ' can\'t be moved' + (ca.why ? ' (' + ca.why + ')' : '');
  if (ca.skipSave) return '';
  const r = d20(rng), m = unitSave(t, 'body') + (ca.saveAdd || 0), tn = 12 + unitDebuff(by, 'body') + (ca.tnAdd || 0);
  return r === 20 || (r !== 1 && r + m >= tn) ? ' · ' + t.name + ' holds its place (body save ' + (r + m) + ' vs ' + tn + ')' : '';
}

// ---------- what stays: fields, traps, turrets, walls ----------
function addZone(cb: Combat, z: Omit<Zone, 'id'> & Record<string, any>): Zone { const full = { id: 'z' + (cb.glyphSeq = (cb.glyphSeq || 0) + 1), ...z } as Zone; cb.zones = [...(cb.zones || []), full]; return full; }
/** Place a missile's field, trap or turret (spec: Delivery, what stays), with the caster's limits. */
function place(cb: Combat, u: Unit, sp: Spell, mp: MissilePlan): string {
  const dur = Math.floor(u.mg?.durBonus || 0), el = sp.element;
  if (sp.watch) {
    const old = (cb.zones || []).filter((z) => z.kind === 'turret' && z.by === u.id); while (old.length >= LIM.turrets) destroyPlaced(cb, old.shift()!, 'a new turret takes its place');
    const z = addZone(cb, { kind: 'turret', tiles: [mp.impact], words: sp.words, by: u.id, side: u.side, left: sp.turretRounds + dur, mult: sp.placedMult, who: u.name, hp: sp.turretHp, def: sp.turretDef, hidden: sp.wait, spotted: [], element: el, kin: sp.kin });
    emitFx(cb, 'turret_placed', { id: z.id, tile: mp.impact, side: u.side, by: u.id, words: sp.words, element: el, hidden: sp.wait, ...(sp.wait ? { only: u.side } : {}) });
    emit(cb, 'sigil_placed', { u, zone: z, cb });
    return ' · a ' + (sp.wait ? 'hidden ' : '') + 'turret stands at ' + refOf(mp.impact) + ' for ' + z.left + ' rounds';
  }
  if (sp.wait) {
    const old = (cb.zones || []).filter((z) => z.kind === 'trap' && z.by === u.id); while (old.length >= LIM.traps) destroyPlaced(cb, old.shift()!, 'a new trap takes its place');
    const z = addZone(cb, { kind: 'trap', tiles: [mp.impact], words: sp.words, by: u.id, side: u.side, left: sp.trapRounds + dur, mult: 1, who: u.name, triggers: sp.triggers, hidden: true, spotted: [], element: el, dir: mp.dir, reachMult: sp.reachMult });
    emitFx(cb, 'trap_set', { id: z.id, tile: mp.impact, side: u.side, by: u.id, words: sp.words, element: el, only: u.side });
    emit(cb, 'sigil_placed', { u, zone: z, cb });
    return ' · a hidden trap waits at ' + refOf(mp.impact) + ' (' + z.left + ' rounds)';
  }
  const z = placeField(cb, u.id, u.name, u.side, sp, mp.burst, mp.dir, dur, sp.reachMult);
  emit(cb, 'sigil_placed', { u, zone: z, cb });
  return ' · a field stands on ' + z.tiles.length + ' tile' + (z.tiles.length === 1 ? '' : 's') + ' around ' + refOf(mp.impact) + ' for ' + z.left + ' rounds';
}
function placeField(cb: Combat, by: string, who: string, side: 'pc' | 'foe', sp: Spell, bt: { tiles: string[]; mult: Record<string, number> }, f: Dir, dur: number, reachMult: number): Zone {
  const z = addZone(cb, { kind: 'field', tiles: bt.tiles, tileMult: bt.mult, words: sp.words, by, side, left: (sp.fieldRounds || (W('stay') as any)?.lasts_rounds || 2) + dur, mult: (W('stay') as any)?.mult ?? 0.5, who, hit: {}, element: sp.element, kin: sp.kin, dir: f, reachMult });
  emitFx(cb, 'field', { id: z.id, tiles: z.tiles, words: sp.words, element: sp.element, side, by, rounds: z.left });
  return z;
}
function raiseWalls(cb: Combat, by: Unit | null, side: 'pc' | 'foe', tiles: string[]): string {
  if (!tiles.length) return ' · RAISE finds no empty tile';
  const b: any = (W('raise') as any)?.barrier || {}, left = (b.rounds ?? 3) + (b.duration_bonus ? Math.floor(by?.mg?.durBonus || 0) : 0);
  const old = objectsOf(cb).filter((o) => o.kind === 'sigil_wall' && (o as any).by === (by?.id || '')); // one RAISE working per caster
  if (old.length) { cb.objects = objectsOf(cb).filter((o) => !old.includes(o)); emitFx(cb, 'wall_crumbled', { tiles: old.map((o) => o.pos), why: 'replaced' }); }
  const objs = objectsOf(cb);
  for (const k of tiles) objs.push(makeObject('sw' + (cb.glyphSeq = (cb.glyphSeq || 0) + 1), 'sigil_wall', k, { hp: b.hp ?? 30, max: b.hp ?? 30, by: by?.id || '', side, left, who: by?.name || '', sigilWall: true } as any));
  emitFx(cb, 'wall_raised', { tiles, by: by?.id, side, hp: b.hp ?? 30, rounds: left });
  return ' · walls rise on ' + tiles.map(refOf).join(', ') + (old.length ? ' (the old ones crumble)' : '');
}
function nullWave(cb: Combat, tiles: string[], at: string): string {
  const n = nullCatch(cb, tiles), T = new Set(tiles);
  const gl = new Set(n.glyphs.map((g) => g.id)); cb.glyphs = (cb.glyphs || []).filter((g) => !gl.has(g.id));
  for (const z of n.zones) { const keep = z.kind === 'field' || z.kind === 'veil' || z.kind === 'light' || z.kind === 'wall' ? z.tiles.filter((k) => !T.has(k)) : []; if (keep.length) z.tiles = keep; else cb.zones = (cb.zones || []).filter((x) => x !== z); }
  if (n.walls.length) cb.objects = objectsOf(cb).filter((o) => !n.walls.includes(o));
  emitFx(cb, 'null_wave', { at, tiles, removed: n.glyphs.length + n.zones.length + n.walls.length, glyphs: n.glyphs.map((g) => g.pos), zones: n.zones.map((z) => z.id), walls: n.walls.map((o) => o.pos) });
  const what = [n.glyphs.length && n.glyphs.length + ' glyph' + (n.glyphs.length === 1 ? '' : 's'), ...n.zones.map((z) => (z.kind === 'wall' ? 'field' : z.kind)), n.walls.length && n.walls.length + ' wall' + (n.walls.length === 1 ? '' : 's')].filter(Boolean);
  return ' · NULL unmakes ' + (what.length ? what.join(', ') : 'nothing');
}
export function destroyPlaced(cb: Combat, z: Zone, why: string) {
  cb.zones = (cb.zones || []).filter((x) => x !== z);
  emitFx(cb, z.kind === 'turret' ? 'turret_destroyed' : z.kind === 'trap' ? 'trap_gone' : 'field_gone', { id: z.id, tile: z.tiles[0], tiles: z.tiles, side: z.side, why, ...(z.kind === 'trap' || (z.kind === 'turret' && (z as any).hidden) ? { only: z.side } : {}) });
  cb.log.push((z.who ? z.who + '\'s ' : '') + (z.kind === 'wall' ? 'field' : z.kind) + ' at ' + refOf(z.tiles[0]) + ' is gone (' + why + ').');
}
const ownerOf = (cb: Combat, z: { by: string }) => cb.units.find((x) => x.id === z.by) || null;
/** A field bites whoever enters it or starts a turn in it, once per creature per round, at ×0.5 (spec: STAY). Old
 * 1.2 wall zones bite the same way. KIN fields spare their side. With PULL (a whirlpool) it drags them toward its owner. */
function fieldBite(cb: Combat, rng: Rng, z: Zone, t: Unit) {
  const zz: any = z; if (t.dead || (zz.hit ||= {})[t.id] === cb.round) return;
  const words = z.kind === 'wall' ? [...z.words, 'stay'] : z.words, sp = compileSpell(words);
  if (sp.kin && t.side === z.side) return;
  if (sp.harmful && (t.downed || t.surrendered) && !sp.subjects.some(isBoonWord)) return;
  zz.hit[t.id] = cb.round;
  const by = ownerOf(cb, z), m = (zz.tileMult?.[t.pos] ?? 1) * (z.mult ?? 0.5) * (zz.reachMult ?? 1) * sp.repMult;
  const a: Affected = { unit: t.id, name: t.name, at: t.pos, ally: t.side === z.side, enemy: t.side !== z.side, self: by === t, mult: m, via: 'field', missile: 0, ...numbersFor(cb, by, sp, t, m, false, null) };
  const r = applyTo(cb, rng, by, z.side, sp, t, a, { roll: false, origin: z.tiles[0], opts: {} });
  let line = r.line;
  if (sp.pull && by && !by.dead && t !== by) line += magicShove(cb, t, by.pos, -sp.pull, by);
  emitFx(cb, 'field_tick', { id: z.id, target: t.id, at: t.pos, element: sp.element, side: z.side });
  if (line) cb.log.push(t.name + ' is caught in ' + (z.who ? z.who + '\'s ' : 'the ') + sp.subjects.map((w) => w.toUpperCase()).join('·') + ' field' + line + '.');
}
/** A trap goes off on someone of the other side (spec: WAIT): the spell resolves at its tile with the owner's numbers;
 * with STAY it leaves a field there instead. */
function springTrap(cb: Combat, rng: Rng, z: Zone, t: Unit) {
  const zz: any = z, sp = compileSpell(z.words), by = ownerOf(cb, z);
  zz.triggers = (zz.triggers ?? 1) - 1; zz.hidden = false;
  emitFx(cb, 'trap_sprung', { id: z.id, tile: z.tiles[0], target: t.id, element: sp.element, side: z.side, words: z.words });
  emit(cb, 'sigil_trap_sprung', { u: t, trap: z, owner: by, cb, rng });
  const head = t.name + ' sets off ' + (z.who ? z.who + '\'s ' : 'a ') + 'trap at ' + refOf(z.tiles[0]) + ' (' + z.words.map((w) => w.toUpperCase()).join(' · ') + ')';
  const f: Dir = zz.dir || [0, 1];
  if (sp.stay) { const bt = burstTiles(cb, sp, z.tiles[0], f); placeField(cb, z.by, z.who, z.side, sp, bt, f, Math.floor(by?.mg?.durBonus || 0), zz.reachMult ?? 1); cb.log.push(head + ': a field springs up.'); }
  else {
    const src = by && !by.dead ? by.pos : z.tiles[0]; // PULL and CHAIN measure from the trap's owner (Snare: dragged toward you)
    const mp = missileEffects(cb, by, z.side, sp, { i: 0, aim: z.tiles[0], origin: z.tiles[0], impact: z.tiles[0], f, self: false, kind: sp.missile, source: src, deliveryMult: 1, roll: !!by, hops: [], path: [], blockedAt: null, stoppedBy: null, arc: null, opts: {}, reachMult: zz.reachMult ?? 1, via: 'trap', victim: t });
    if (typeof mp !== 'string') { const r = magicSpellWords(z.words.length, () => strike(cb, rng, by, z.side, sp, mp.plan, mp.affected, { roll: !!by, source: src, opts: {} })); cb.log.push(head + (r.line || ': it finds no one') + '.'); }
  }
  if (zz.triggers <= 0) cb.zones = (cb.zones || []).filter((x) => x !== z);
}
/** A turret casts at the start of each of its owner's turns at the nearest creature it can reach, ×0.5 (spec: WATCH; item
 * 423: ties the lowest HP, then the engine's order), for no charge, with the owner's numbers. */
function turretFire(cb: Combat, rng: Rng, z: Zone) {
  const zz: any = z, sp = compileSpell(z.words), by = ownerOf(cb, z); if (!by) return;
  const at = z.tiles[0], range = sp.reach && sp.missile !== 'relay' ? sp.range + (by.mg?.rangeBonus || 0) : 1;
  const reach = (t: Unit) => dist(at, t.pos) <= range && (sp.missile === 'appear' || dist(at, t.pos) <= 1 || lineOfSight(cb, at, t.pos));
  const pool = cb.units.map((v, i) => ({ v, i })).filter(({ v }) => !v.dead && v.pos !== at && !(sp.kin && v.side === z.side) && !(sp.harmful && (v.downed || v.surrendered) && !sp.subjects.some(isBoonWord)) && !(v.hidden && v.side !== z.side) && reach(v))
    .sort((a, b) => dist(at, a.v.pos) - dist(at, b.v.pos) || a.v.hp - b.v.hp || a.i - b.i).slice(0, sp.missiles);
  if (!pool.length) return;
  if (zz.hidden) { zz.hidden = false; } // a hidden turret shows when it first fires
  let line = '';
  for (const [i, { v }] of pool.entries()) {
    let impact = v.pos, path: string[] = [], blockedAt: string | null = null, stoppedBy: MissilePlan['stoppedBy'] = null;
    if (sp.missile === 'bolt') { const b = boltPath(cb, at, v.pos, by); path = b.path; impact = b.impact; blockedAt = b.blockedAt; stoppedBy = b.stoppedBy; }
    const mp = missileEffects(cb, by, z.side, sp, { i, aim: v.pos, origin: at, impact, f: dir8(at, impact), self: false, kind: sp.missile, source: at, deliveryMult: (W('watch') as any)?.mult ?? 0.5, roll: true, hops: [], path, blockedAt, stoppedBy, arc: sp.missile === 'lob' ? { from: at, to: impact } : null, opts: {}, reachMult: sp.reachMult, via: 'turret' });
    if (typeof mp === 'string') continue;
    emitFx(cb, 'turret_shot', { id: z.id, from: at, to: impact, target: v.id, element: sp.element, side: z.side, path, kind: sp.missile, burst: mp.plan.burst.tiles, chain: mp.plan.chain });
    emit(cb, 'turret_shot', { turret: z, owner: by, target: v, cb, rng });
    const r = magicSpellWords(z.words.length, () => strike(cb, rng, by, z.side, sp, mp.plan, mp.affected, { roll: true, source: at, opts: {} }));
    line += r.line;
    if (sp.leech && r.dealt > 0 && !by.dead) { const h = healUnit(cb, by, Math.floor(r.dealt * sp.leech), by, 'leech'); line += ' · ' + by.name + ' drinks ' + h.restored + ' HP'; }
  }
  cb.log.push((z.who ? z.who + '\'s ' : 'A ') + 'turret at ' + refOf(at) + ' fires (' + z.words.map((w) => w.toUpperCase()).join(' · ') + ')' + (line || ': nothing') + '.');
}
/** Strike a turret with your weapon (a hit destroys it: Defense 10, 10 HP; spec: WATCH). The weapon's attack AP. */
export function strikeTurret(cb: Combat, rng: Rng, u: Unit, tile: string): string | null {
  const z = (cb.zones || []).find((x) => x.kind === 'turret' && x.tiles[0] === tile && x.side !== u.side && (!(x as any).hidden || ((x as any).spotted || []).includes(u.side)));
  if (!z) return 'No turret you can see there.';
  const w = WEAPON[u.weapon], melee = !w || isMelee(w), ap = attackApCost(w || WEAPON.fists, melee ? 'melee' : 'shot');
  if (u.ap < ap) return 'Needs ' + ap + ' AP.';
  if (melee ? dist(u.pos, tile) > 1 : dist(u.pos, tile) > effectiveRange(w) * 3 || !lineOfSight(cb, u.pos, tile)) return melee ? 'Walk up to it first.' : 'Out of range or no line of sight.';
  u.ap -= ap; const r = d20(rng), tot = r + (u.attack || 0), def = (z as any).def ?? 10, hit = r === 20 || (r !== 1 && tot >= def);
  emitFx(cb, melee ? 'melee' : 'shot', { unit: u.id, target: null, from: u.pos, to: tile, weapon: u.weapon, cat: w?.category, mode: melee ? 'melee' : 'shot', hit, crit: r === 20, fumble: r === 1, dmg: 0, killed: hit, object: true });
  if (hit) destroyPlaced(cb, z, u.name + ' hits it (d20 ' + r + ' → ' + tot + ' vs ' + def + ')'); else cb.log.push(u.name + ' misses the turret at ' + refOf(tile) + ' (d20 ' + r + ' → ' + tot + ' vs ' + def + ').');
  return null;
}
/** Moving onto a tile: fields bite, traps of the other side go off (spec: STAY, WAIT). Called on each step of a walk and
 * after a teleport. */
export function sigilEnter(cb: Combat, rng: Rng, u: Unit, k: string): boolean {
  migrateSigil(cb);
  let stop = false;
  for (const z of [...(cb.zones || [])]) {
    if (u.dead || !z.tiles.includes(k)) continue;
    if (z.kind === 'field' || z.kind === 'wall') fieldBite(cb, rng, z, u);
    else if (z.kind === 'trap' && z.side !== u.side && !cb.overworld) { springTrap(cb, rng, z, u); stop = true; }
  }
  return stop || u.pos !== k; // a trap went off, or the field moved them: the walk ends here
}
/** The start of a unit's turn for Sigil magic: Quickened's AP, Corroded's bite, fields and traps on its tile, and its
 * turrets fire (spec: Mana; conditions). */
export function sigilTurnStart(cb: Combat, rng: Rng, u: Unit) {
  migrateSigil(cb);
  if (u.dead) return;
  if (condOn(u, 'quickened')) { const add = (W('quicken') as any)?.ap ?? 2, was = u.ap; if (!cb.overworld) u.ap = Math.min(AP_MAX, u.ap + add); endCond(u, 'quickened', cb); cb.log.push(u.name + ' is Quickened: +' + (u.ap - was) + ' AP this turn.'); }
  if (condOn(u, 'corroded') && !u.downed) { const by = u.condBy?.corroded; cb.log.push(u.name + ' corrodes' + withElement('acid', () => harm(cb, rng, by ? cb.units.find((x) => x.id === by) || null : null, u, 5, 'true', 'acid'))); }
  for (const z of [...(cb.zones || [])]) {
    if (u.dead || !z.tiles.includes(u.pos)) continue;
    if (z.kind === 'field' || z.kind === 'wall') fieldBite(cb, rng, z, u);
    else if (z.kind === 'trap' && z.side !== u.side && !cb.overworld) springTrap(cb, rng, z, u);
  }
  if (!cb.overworld) for (const z of [...(cb.zones || [])]) if (z.kind === 'turret' && z.by === u.id && (cb.zones || []).includes(z)) turretFire(cb, rng, z);
}
/** Once per round: glyphs, fields, traps, turrets and RAISE walls run down (spec: Drawing 5; Delivery). */
export function sigilRoundTick(cb: Combat) {
  migrateSigil(cb);
  for (const g of cb.glyphs || []) if (!(g as any).keystone) g.left--; // a Keystone never fades (Glyph Mason)
  const gone = (cb.glyphs || []).filter((g) => g.left <= 0);
  if (gone.length) { cb.log.push(gone.map((g) => g.word.toUpperCase()).join(', ') + ' fade' + (gone.length === 1 ? 's' : '') + ' at ' + [...new Set(gone.map((g) => refOf(g.pos)))].join(', ') + '.'); for (const g of gone) emitFx(cb, 'glyph_fade', { tile: g.pos, word: g.word, side: g.side, why: 'time' }); }
  cb.glyphs = (cb.glyphs || []).filter((g) => g.left > 0);
  for (const z of cb.zones || []) z.left--;
  for (const z of (cb.zones || []).filter((x) => x.left <= 0)) emitFx(cb, x2fx(z.kind), { id: z.id, tile: z.tiles[0], tiles: z.tiles, side: z.side, why: 'time', ...(z.kind === 'trap' || (z.kind === 'turret' && (z as any).hidden) ? { only: z.side } : {}) });
  cb.zones = (cb.zones || []).filter((z) => z.left > 0);
  const walls = objectsOf(cb).filter((o) => o.kind === 'sigil_wall');
  for (const o of walls) (o as any).left = ((o as any).left ?? 1) - 1;
  const down = walls.filter((o) => (o as any).left <= 0 || (o.hp ?? 1) <= 0);
  if (down.length) { cb.objects = objectsOf(cb).filter((o) => !down.includes(o)); emitFx(cb, 'wall_crumbled', { tiles: down.map((o) => o.pos), why: 'time' }); cb.log.push('The RAISE wall' + (down.length === 1 ? '' : 's') + ' at ' + down.map((o) => refOf(o.pos)).join(', ') + ' crumble' + (down.length === 1 ? 's' : '') + '.'); }
}
const x2fx = (k: string) => (k === 'turret' ? 'turret_destroyed' : k === 'trap' ? 'trap_gone' : k === 'field' || k === 'wall' ? 'field_gone' : k + '_gone');
/** Spotting hidden Sigil traps and turrets (spec: WAIT, "like any hidden trap"): a unit of the other side within the
 * trap object's detect range spots it on a passive of 10 + Vigilant − 1 (a PC) or 10 + its tier's notice (an enemy)
 * against the trap's TN. */
export function sigilSpot(cb: Combat, u: Unit) {
  if (u.dead || u.downed) return;
  const td = OBJ.trap?.trap, tr = { range: td?.detect_range ?? 2, tn: td?.detect_tn ?? 12 }; // the trap object's numbers (objects.json)
  const passive = u.side === 'pc' ? 10 + ((u.vigilant || 0) <= 0 ? -2 : (u.vigilant || 0) - 1) : 10 + (NOTICE[u.tier || 'minion'] || 0);
  for (const z of cb.zones || []) {
    const zz: any = z; if (z.side === u.side || !(z.kind === 'trap' || (z.kind === 'turret' && zz.hidden))) continue;
    if ((zz.spotted ||= []).includes(u.side) || dist(z.tiles[0], u.pos) > tr.range || passive < tr.tn) continue;
    zz.spotted.push(u.side); emitFx(cb, 'trap_spotted', { id: z.id, tile: z.tiles[0], by: u.id, side: u.side, only: u.side, kind: z.kind });
    cb.log.push(u.name + ' spots a hidden ' + (z.kind === 'turret' ? 'turret' : 'Sigil trap') + ' at ' + refOf(z.tiles[0]) + ' (' + (u.side === 'pc' ? 'Vigilant ' : 'notice ') + passive + ' vs ' + tr.tn + ').');
  }
}
/** The placed Sigil magic a side can see (spec: Mana, Sigils 9.9): fields, traps, turrets, smoke, light and RAISE walls,
 * with their tiles, rounds left and owner. Traps (and hidden turrets) show to their own side, or once spotted. */
export function placedMagic(cb: Combat, side: 'pc' | 'foe') {
  migrateSigil(cb);
  const out: { id: string; kind: string; tiles: string[]; left: number; by: string; who: string; side: 'pc' | 'foe'; words: string[]; element: string | null; mine: boolean; hidden: boolean; hp?: number; triggers?: number }[] = [];
  for (const z of cb.zones || []) {
    const zz: any = z; if (!['field', 'trap', 'turret', 'wall', 'veil', 'light'].includes(z.kind)) continue;
    const secret = z.kind === 'trap' || (z.kind === 'turret' && zz.hidden);
    if (secret && z.side !== side && !(zz.spotted || []).includes(side)) continue;
    out.push({ id: z.id, kind: z.kind === 'wall' ? 'field' : z.kind, tiles: z.tiles, left: z.left, by: z.by, who: z.who, side: z.side, words: z.words, element: zz.element ?? (z.words.find(isElement) || null), mine: z.side === side, hidden: !!secret, ...(zz.hp != null ? { hp: zz.hp } : {}), ...(zz.triggers != null ? { triggers: zz.triggers } : {}) });
  }
  for (const o of objectsOf(cb)) if (o.kind === 'sigil_wall') { const oo: any = o; out.push({ id: o.id, kind: 'raise', tiles: [o.pos], left: oo.left ?? 0, by: oo.by || '', who: oo.who || '', side: oo.side || 'pc', words: ['raise'], element: null, mine: oo.side === side, hidden: false, hp: o.hp }); }
  return out;
}
/** Is this zone hidden from a side (for views: a trap or hidden turret of the other side, not spotted)? */
export const secretFrom = (z: any, side: 'pc' | 'foe') => (z.kind === 'trap' || (z.kind === 'turret' && z.hidden)) && z.side !== side && !(z.spotted || []).includes(side);

/** The pattern under a glyph as the screen shows it while building (spec: Mana, Sigils 9.2). */
export function patternAt(cb: Combat, tile: string, u?: Unit | null) {
  migrateSigil(cb);
  const p = findPattern(cb, tile, u?.pos), m = u?.mg;
  const start = (cb.glyphs || []).find((g) => g.pos === tile);
  const comp = start ? groupAt(cb.glyphs || [], tile, start.side) : [];
  const words = typeof p === 'string' ? comp.flatMap((k) => (cb.glyphs || []).filter((g) => g.pos === k && g.side === start!.side).map((g) => g.word)) : p.words;
  const why = typeof p === 'string' ? p : grammarError(p.words, m?.maxWords ?? MAX_GLYPHS);
  const charge = typeof p === 'string' || !u ? 0 : evokeCharge(p, u);
  const mine = u ? myGlyphs(cb, u).length : 0;
  return {
    words, shape: typeof p === 'string' ? (comp.length ? 'none' : null) : p.shape, tiles: typeof p === 'string' ? comp : p.tiles, valid: !why, why: why || null,
    side: start?.side || null, readable: !!u && words.every((w) => u.mg?.words.includes(w)),
    capLeft: u ? Math.max(0, groundCap(u) - mine) : 0, lineLeft: Math.max(0, Math.min(MAX_GLYPHS, m?.maxWords ?? MAX_GLYPHS) - words.length),
    costNow: { charge: m?.charge ?? 0, ap: u?.ap ?? 0, flux: m?.flux ?? 0 }, costAfter: { charge: (m?.charge ?? 0) - charge, ap: (u?.ap ?? 0) - SPELL_AP.evoke, flux: m?.flux ?? 0, evokeCharge: charge },
    overloadWarning: !!m && m.flux >= FLUX_MAX ? 'Your Evoker is at ' + m.flux + ' Flux: the next glyph overloads it. Vent first (1 AP).' : null,
    spell: typeof p === 'string' || why ? null : compileSpell(p.words),
  };
}

// ---------- old saves (item 441) ----------
/** A 1.2 fight's Sigil state under 1.4: glyphs with no revision stamp are dropped (no refund), wall zones become fields,
 * other zones stay. Runs once per fight (cb.sigilV). */
export function migrateSigil(cb: Combat) {
  if ((cb as any).sigilV === SIGIL_REV) return;
  const old = (cb.glyphs || []).filter((g) => (g as any).v !== SIGIL_REV);
  if (old.length) { cb.glyphs = (cb.glyphs || []).filter((g) => (g as any).v === SIGIL_REV); cb.log?.push('The old glyphs (' + old.map((g) => g.word.toUpperCase()).join(', ') + ') fade: Sigil magic works by the new rules (1.4).'); }
  for (const z of cb.zones || []) if (z.kind === 'wall') { (z as any).kind = 'field'; z.words = [...z.words.filter((w) => W(w) && isSubject(w)), 'stay']; (z as any).hit ||= {}; }
  cb.zones = (cb.zones || []).filter((z) => z.kind !== 'field' || z.words.some(isSubject));
  (cb as any).sigilV = SIGIL_REV;
}
/** The same for the story's stored glyphs and zones (g.story.glyphs / zones). */
export function migrateStorySigil(s: { glyphs?: any[]; zones?: any[]; sigilV?: number }) {
  if (s.sigilV === SIGIL_REV) return;
  s.glyphs = (s.glyphs || []).filter((g) => g.v === SIGIL_REV);
  for (const z of s.zones || []) if (z.kind === 'wall') { z.kind = 'field'; z.words = [...(z.words || []).filter((w: string) => W(w) && isSubject(w)), 'stay']; z.hit ||= {}; }
  s.zones = (s.zones || []).filter((z) => z.kind !== 'field' || (z.words || []).some(isSubject));
  s.sigilV = SIGIL_REV;
}

// ---------- the compat subject effect (class handlers) ----------
/** One Subject's effect on one creature, as 1.2's subjectEffect did (class handlers still call it): damage rolls Brain
 * Power against Defense unless auto; mult is the spell's multiplier. TODO(sigil-1.4): lanes move to planEvoke/strike. */
export function subjectEffect(cb: Combat, rng: Rng, by: Unit | null, t: Unit, w: SigilDef | undefined, mult: number, sm: number, em: number, auto: boolean, src: string, opts: { seek?: boolean } = {}): string {
  if (!w || t.dead) return '';
  const sp = compileSpell([w.id, opts.seek ? 'seek' : 'condense']); sp.reachMult = 1; sp.coreMult = 1; sp.burst = false; sp.repMult = 1;
  const a: Affected = { unit: t.id, name: t.name, at: t.pos, ally: !!by && t.side === by.side, enemy: !by || t.side !== by.side, self: by === t, mult, via: 'direct', missile: 0, ...numbersFor(cb, by, sp, t, mult, !auto, src) };
  void sm; void em;
  return applyTo(cb, rng, by, by?.side || 'pc', sp, t, a, { roll: !auto, origin: src, opts: {} }).line;
}
/** Who a spell would affect, hit or miss (a spell at an NPC on the story map starts a fight). */
export function evokeTargets(cb: Combat, u: Unit, tile: string, aim?: string, opts: EvokeOpts = {}): string[] { return planEvoke(cb, u, tile, aim, opts).targets; }
export const glyphsAt = (cb: Combat, k: string) => (cb.glyphs || []).filter((g) => g.pos === k);

// ---------- enemy casters (spec: Mana, Sigils 8; item 439) ----------
/** Default enemy Sigil words by tier (sigils.json enemy_ai). */
export const enemyDefaultWords = (tier: string): string[] => [...(ENEMY_AI.default_words?.[tier] || ENEMY_AI.default_words?.minion || STARTING_DEFAULT)];
/** Max Sigil words for an enemy by tier (sigils.json enemy_ai.max_words; spec item 453, provisional). */
export const ENEMY_MAX_WORDS: Record<string, number> = ENEMY_AI.max_words || { minion: 2, soldier: 3, elite: 4, boss: 4 };
const TIER_SAVE: Record<string, number> = { minion: 0, soldier: 1, elite: 2, boss: 3 };
const TIER_DEBUFF: Record<string, number> = { minion: 0, soldier: 1, elite: 2, boss: 2 };
/** An enemy's Evoker and words (FoeSpec.sigils: its words, or true for its tier's default set). */
export function enemyMagic(u: Unit, words: string[] | true): NonNullable<Unit['mg']> {
  const tier = u.tier || 'minion', list = (words === true ? enemyDefaultWords(tier) : words).filter((w) => W(w));
  const s = TIER_SAVE[tier] ?? 0, d = TIER_DEBUFF[tier] ?? 0;
  return { words: list, designs: [], evoker: true, emanator: false, charge: CORE_CHARGE, cores: 2, coresMade: 0, flux: 0, mp: 0, mpMax: 0, strain: 0, held: null, cast: false,
    brain: u.attack || 0, will: 0, sigilMult: 1, soulMult: 1, elemMult: 1, healMult: 1, maxWords: ENEMY_MAX_WORDS[tier] ?? 2, glyphAp: 1, coreSave: 0, rangeBonus: 0, durBonus: 0,
    soulAp: 2, costSave: 0, soulRange: 0, syphon: 1, strainLimit: 5, saves: { body: s, brain: s, heart: s }, debuff: { body: d, brain: d, heart: d } } as any;
}
function combos(words: string[], max: number): string[][] {
  const out: string[][] = [], w = [...new Set(words)];
  const rec = (start: number, cur: string[]) => { if (cur.length >= 2 && !grammarError(cur, max)) out.push([...cur]); if (cur.length >= max) return; for (let i = start; i < w.length; i++) { cur.push(w[i]); rec(i + 1, cur); cur.pop(); } };
  rec(0, []); return out;
}
/** Try a hypothetical Line (glyphs not yet drawn) and plan its Evoke, then put everything back. */
function tryLine(cb: Combat, u: Unit, words: string[], tiles: string[], aim: string, opts: EvokeOpts = {}): EvokePreview | null {
  const was = u.pos, glyphs = cb.glyphs, seq = cb.glyphSeq, ap = u.ap, charge = u.mg!.charge;
  try {
    cb.glyphs = [...(glyphs || []), ...tiles.map((k, i) => ({ id: 'gl' + ((seq || 0) + 1 + i), word: words[i], pos: k, by: u.id, side: u.side, left: 2, who: u.name, v: SIGIL_REV } as Glyph))];
    u.pos = tiles[tiles.length - 1]; u.ap = 9; u.mg!.charge = 99;
    const pv = planEvoke(cb, u, tiles[0], aim, opts); return pv.ok ? pv : null;
  } finally { u.pos = was; cb.glyphs = glyphs; cb.glyphSeq = seq; u.ap = ap; u.mg!.charge = charge; }
}
/** Score a plan for an enemy: expected damage to the other side, less 1.5 × its own side's; Boons by what they mend;
 * NULL by what it unmakes. Held (−Infinity) if it would hit more of its own than of the other. */
function scorePlan(cb: Combat, u: Unit, pv: EvokePreview): number {
  const live = pv.affected.filter(counts), foes = live.filter((a) => a.enemy && (a.dmg > 0 || a.saves.length)), own = live.filter((a) => a.ally && (a.dmg > 0 || (a.saves.length && pv.spell!.harmful)));
  if (own.length > foes.length && own.length) return -Infinity;
  let s = 0;
  for (const a of live) {
    const t = cb.units.find((x) => x.id === a.unit)!, exp = a.roll ? a.dmgAfterArmour * a.roll.pct / 100 : a.dmgAfterArmour;
    const sv = a.saves.length ? 8 * a.saves.length : 0;
    if (a.enemy) s += exp + sv; else s -= 1.5 * (exp + (pv.spell!.harmful ? sv : 0));
    if (a.ally) s += Math.min(a.heal, t.maxHp - t.hp) * 0.8 + (t.hp < t.maxHp * 0.6 ? a.shield * 0.5 : 0);
  }
  const playerMagic = pv.missiles.reduce((t, m) => t + m.nulls, 0); s += playerMagic * 6;
  if (pv.spell!.wait) s += pv.missiles.some((m) => cb.units.some((v) => v.side !== u.side && !v.dead && dist(v.pos, m.impact) <= 2)) ? 10 : 0;
  return s;
}
/** An enemy's Sigil turn step (spec: Mana, Sigils 8): weigh a spell it can finish this turn against its weapon by expected
 * damage, walk the Line on its own tiles away from the target, and Evoke it back past the first glyph. Also Evokes a
 * Line it can read that it already stands by. True when it acted. The AI only chooses; the engine resolves. */
export function enemyCast(cb: Combat, rng: Rng, u: Unit): boolean {
  const m = u.mg; if (!m || !m.evoker || !m.words.length || sigilReady(cb, u) || (u as any).aiCast === cb.round) return false;
  const foes = cb.units.filter((t) => t.side !== u.side && !t.dead && !t.surrendered && !t.hidden);
  const friends = cb.units.filter((t) => t.side === u.side && !t.dead);
  if (!foes.length) return false;
  // The weapon's best: expected damage per AP.
  const w = WEAPON[u.weapon], mode = !w || isMelee(w) ? 'melee' : 'shot';
  let weapon = 0;
  for (const t of foes) { const pv = previewAttack(cb, u, t, mode as any); if (pv.ok && pv.dmg) weapon = Math.max(weapon, (pv.pct / 100) * Math.max(1, pv.dmg.total - pv.dmg.armour) / Math.max(1, pv.ap)); }
  let best: { score: number; words: string[]; tiles: string[]; aim: string; cost: number; pre: 'vent' | 'core' | null } | null = null;
  // A Line already on the ground it stands by and can read (yours or a player's).
  for (const g of cb.glyphs || []) {
    if (dist(g.pos, u.pos) > 1) continue; const p = findPattern(cb, g.pos, u.pos); if (typeof p === 'string') continue;
    for (const t of [...foes, ...friends]) { const pv = planEvoke(cb, u, g.pos, t.pos); if (!pv.ok) continue; const s = scorePlan(cb, u, pv); if (s > 0 && (!best || s / pv.ap > best.score / best.cost)) best = { score: s, words: [], tiles: [g.pos], aim: t.pos, cost: pv.ap, pre: null }; }
  }
  const P = paths(cb, u.pos, u.id), maxW = Math.min(MAX_GLYPHS, m.maxWords);
  for (const words of combos(m.words, maxW)) {
    const sp = compileSpell(words), L = words.length, charge = words.reduce((t, x) => t + glyphCost(cb, u, x, true, u.pos).charge, 0) + Math.max(1, L - (m.coreSave || 0));
    const fluxIn = words.reduce((t, x) => t + ((W(x) as any)?.flux ?? 1), 0), needVent = m.flux + fluxIn > FLUX_MAX, needCore = charge > m.charge;
    if (needCore && m.cores < 1) continue;
    const cost = L * glyphApOf(u) + apForTiles(L - 1, u.bank, u.movement) + SPELL_AP.evoke + (needVent ? SPELL_AP.vent : 0) + (needCore ? SPELL_AP.core : 0);
    if (cost > u.ap) continue;
    const boon = sp.subjects.every((x) => isBoonWord(x)), pool = boon ? friends.filter((t) => t.hp < t.maxHp || (t.shield || 0) < 10) : foes;
    for (const t of pool.slice(0, 6)) {
      const self = t === u, f = self ? ([0, 1] as Dir) : dir8(u.pos, t.pos), tiles = [u.pos];
      for (let i = 1; i < L; i++) tiles.push(add(u.pos, f, -i));
      if (tiles.slice(1).some((k, i) => !freeTile(cb, k, u) || (cb.glyphs || []).some((g) => g.pos === k) || P.dist[k] === undefined || P.dist[k] > i + 1)) continue;
      const pv = tryLine(cb, u, words, tiles, t.pos); if (!pv || pv.fizzle) continue;
      const s = scorePlan(cb, u, pv); if (!(s > 0)) continue;
      if (!best || s / cost > best.score / best.cost) best = { score: s, words, tiles, aim: t.pos, cost, pre: needVent ? 'vent' : needCore ? 'core' : null };
    }
  }
  (u as any).aiCast = cb.round; // one decision a turn (the AI weighs it once)
  if (!best || (weapon > 0 && best.score / best.cost < weapon)) return false;
  if (!best.words.length) return !evoke(cb, rng, u, best.tiles[0], best.aim);
  if (best.pre === 'vent' && vent(cb, u)) return false;
  if (best.pre === 'core' && swapCore(cb, u)) return false;
  for (let i = 0; i < best.words.length; i++) {
    if (i) { if (moveUnit(cb, u, best.tiles[i], rng) || u.pos !== best.tiles[i] || u.dead || u.downed) return true; }
    if (drawGlyph(cb, rng, u, best.words[i])) return i > 0;
  }
  const target = cb.units.find((x) => x.pos === best!.aim && !x.dead);
  evoke(cb, rng, u, best.tiles[0], target ? target.pos : best.aim);
  return true;
}
/** An enemy steps out of a field of the other side it stands in, and scuffs a turret of the other side it stands by
 * (spec: Sigils 8). True when it acted. */
export function enemyAvoidMagic(cb: Combat, rng: Rng, u: Unit): boolean {
  if ((u as any).aiDodge === cb.round) return false;
  const bad = (k: string) => (cb.zones || []).some((z) => (z.kind === 'field' || z.kind === 'wall') && z.side !== u.side && z.tiles.includes(k));
  const tur = (cb.zones || []).find((z) => z.kind === 'turret' && z.side !== u.side && !secretFrom(z, u.side) && z.tiles[0] === u.pos);
  if (tur && u.ap >= SPELL_AP.scuff) { (u as any).aiDodge = cb.round; return !scuff(cb, u); }
  if (!bad(u.pos) || u.ap < 1) return false;
  const P = paths(cb, u.pos, u.id), out = Object.entries(P.dist).filter(([k, n]) => k !== u.pos && !bad(k) && apForTiles(n, u.bank, u.movement) <= Math.min(1, u.ap)).sort((a, b) => a[1] - b[1])[0];
  (u as any).aiDodge = cb.round;
  return !!out && !moveUnit(cb, u, out[0], rng);
}

// ---------- a spell cast straight at a point (class moves) ----------
export interface CastAtResult { ok: boolean; why?: string; line: string; dealt: number; hit: string[]; fizzle: boolean; plan?: MissilePlan; affected: Affected[]; spell: Spell }
/** A spell's words resolved straight at one tile with no glyphs and no Evoke, for class moves that carry a spell some
 * other way (Three-Cut Script, Spell Magazine, Stored Spell). It goes off as Touch from `origin` (default the caster's
 * tile): Reach words are ignored (no flight, no Reach multiplier, no cover), the Burst centres on `impact` (PUSH's cone
 * points from origin through it), CHAIN jumps from the one it hits, PULL drags toward `source` (default origin), and
 * STAY / WAIT / WATCH place their field, trap or turret on `impact`. Repeats (×0.9), KIN, friendly fire and the caster's
 * multipliers apply as in an Evoke. roll false: Elements hit without a roll (a bullet already hit). mult multiplies
 * the whole spell. The caller pays every cost and emits its own fx; nothing here spends charge, AP or Flux. Additive
 * helper (lane classes-j). */
export function castAt(cb: Combat, rng: Rng, u: Unit, words: string[], impact: string, o: { origin?: string; source?: string; roll?: boolean; victim?: Unit | null; mult?: number; opts?: EvokeOpts } = {}): CastAtResult {
  const base = compileSpell(words);
  const sp: Spell = { ...base, reach: null, missile: 'touch', range: 1, reachMult: 1, relayHops: 0, blocked: false, needsSight: false };
  const origin = o.origin || u.pos, source = o.source || origin, f: Dir = origin === impact ? [0, 1] : dir8(origin, impact);
  const victim = o.victim === undefined ? liveAt(cb, impact) : o.victim;
  const mp = missileEffects(cb, u, u.side, sp, { i: 0, aim: impact, origin, impact, f, self: false, kind: 'touch', source, deliveryMult: o.mult ?? 1, roll: o.roll ?? true, hops: [], path: [], blockedAt: null, stoppedBy: null, arc: null, opts: o.opts || {}, reachMult: 1, victim });
  if (typeof mp === 'string') return { ok: false, why: mp, line: '', dealt: 0, hit: [], fizzle: false, affected: [], spell: sp };
  if (mp.plan.why) return { ok: false, why: mp.plan.why, line: '', dealt: 0, hit: [], fizzle: false, plan: mp.plan, affected: mp.affected, spell: sp };
  const pl = mp.plan, live = mp.affected.filter(counts);
  const fizzle = !pl.placed && !live.length && !(pl.raise.length || pl.nulls || pl.veil.length || pl.light.length || pl.step.length);
  if (fizzle) return { ok: true, line: ' · it finds nothing it may affect and fizzles', dealt: 0, hit: [], fizzle: true, plan: pl, affected: mp.affected, spell: sp };
  if (pl.placed) return { ok: true, line: place(cb, u, sp, pl), dealt: 0, hit: [], fizzle: false, plan: pl, affected: mp.affected, spell: sp };
  const r = magicSpellWords(words.length, () => strike(cb, rng, u, u.side, sp, pl, mp.affected, { roll: o.roll ?? true, source, opts: o.opts || {} }));
  let line = r.line;
  if (sp.leech && r.dealt > 0 && !u.dead) { const h = healUnit(cb, u, Math.floor(r.dealt * sp.leech), u, 'leech'); emitFx(cb, 'leech', { unit: u.id, to: u.pos, from: [impact], amount: h.restored, element: sp.element }); line += ' · ' + u.name + ' drinks ' + h.restored + ' HP (LEECH)'; }
  if (sp.damaging && (o.roll ?? true) && condOn(u, 'sharpened')) endCond(u, 'sharpened', cb);
  return { ok: true, line, dealt: r.dealt, hit: r.hit, fizzle: false, plan: pl, affected: mp.affected, spell: sp };
}
