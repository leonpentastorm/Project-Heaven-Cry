// Enemy Sigil casting and Sigil-aware movement, rules revision 1.4 (spec: Mana, Sigils 8 "Enemy casters"; Leon's answer
// 8: "build the AI"). The AI only chooses: every spell it weighs is a real plan from the engine's own planner
// (planEvoke, on a hypothetical Line that is put back afterwards), and every step it takes is a real action (drawGlyph,
// moveUnit, evoke, vent, swapCore, scuff, strikeTurret, shootCover) that the engine refuses or resolves by the rules.
// It reads nothing a player's side hides from it: Hidden PCs are ignored, a player's trap counts only once spotted.
// Deterministic: no dice are rolled to decide; ties break by the engine's unit order.
//
// What it does, in the enemy turn (combat.ts enemyTurn):
//  · every enemy (caster or not): steps out of a field of the other side, scuffs a turret it stands on (aiAvoid); walks
//    around known fields and spotted traps (aiRouteRisk, added to the move score); when no player is in reach, attacks
//    a turret that threatens its side or a RAISE wall that blocks its way (aiClearBlock).
//  · a caster (an Evoker: FoeSpec.sigils, or FoeSpec.caster naming an enemies.json `casters` entry): weighs every spell
//    it can draw, walk and Evoke this turn by situation (aiSigilCast): damage on clustered players (a Burst; KIN when
//    its own side is in the area), MEND or WARD on a hurt ally, BIND or SLOW on a player charging in with a melee
//    weapon, COMMAND with the order that fits its target (aiCommandOrder: walk it out of melee, halt a charger, drop a
//    shooter's weapon, else kneel; item 490), NULL on player fields, turrets, traps, walls and Lines near its side, STEP out of melee, traps on the
//    tiles players will cross, turrets and fields where players stand. It respects AP, charge (a core swap first),
//    Flux (a vent first, never an overload), friendly fire (it holds a spell that hits more of its own than of yours)
//    and casts only when the spell's value per AP beats its weapon's.
import enemiesJ from '../../../data/enemies.json';
import { WEAPON } from './data';
import { type Combat, type Unit, dist, xy, key, paths, moveUnit, apForTiles, previewAttack, isMelee, effectiveRange, lineOfSight, unitSees, objectsOf, shootCover } from './combat';
import { type Rng } from './rng';
import {
  type EvokePreview, type EvokeOpts, type Affected, type Dir, type Spell,
  planEvoke, drawGlyph, evoke, findPattern, glyphCost, sigilReady, freeTile, dir8, secretFrom, scuff, strikeTurret, compileSpell, grammarError,
  enemyMagic, W, isElement, isAffliction, isBoonWord, around, MAX_GLYPHS, SIGIL_REV, sigilPower,
} from './sigil';
import { type Glyph, vent, swapCore, SPELL_AP, FLUX_MAX, CORE_CHARGE, unitSave, condOn, ventAp, coreAp } from './magic';
import { fooledBy } from './illusion';

// ---------- caster archetypes (data/enemies.json `casters`) ----------
export interface CasterDef { id: string; name: string; tier: string; weapon: string; sigils: string[]; spell_bias?: number; text?: string; provisional?: boolean }
export const CASTERS: CasterDef[] = ((enemiesJ as any).casters || []) as CasterDef[];
export const CASTER: Record<string, CasterDef> = Object.fromEntries(CASTERS.map((c) => [c.id, c]));
/** Arm a fight's foe with its Evoker (startCombat): its own `sigils` (true: its tier's default set), else the words of
 * the caster archetype it names. A caster's spell_bias (enemies.json; default 1) weighs its spells against its weapon. */
export function armFoe(u: Unit, f: { sigils?: string[] | true; caster?: string }) {
  const c = f.caster ? CASTER[f.caster] : undefined, words = f.sigils || c?.sigils;
  if (!words) return;
  u.mg = enemyMagic(u, words);
  if (c) { (u as any).caster = c.id; (u.mg as any).aiBias = c.spell_bias ?? 1; }
}

// ---------- reading the field (what its side knows) ----------
type Side = 'pc' | 'foe';
const live = (t: Unit) => !t.dead && !t.downed && !t.surrendered;
const counts = (a: Affected) => !a.kinSpared && !a.skipped;
const unitOf = (cb: Combat, id: string) => cb.units.find((x) => x.id === id)!;
/** Damage a placed spell deals per bite, for the risk map: its words' damage with its owner's multipliers (×0.5 for a
 * field, ×1 for a trap), an affliction counted as 6. An estimate: the engine's numbers decide. */
function biteOf(cb: Combat, z: { words: string[]; by: string }, mult: number): number {
  const o = cb.units.find((x) => x.id === z.by), m = o?.mg; let d = 0;
  for (const w of z.words) { const x: any = W(w); if (x?.damage) d += x.damage * sigilPower(m, x.damage_type === 'elemental' ? 'elemental' : 'sigil'); if (isAffliction(w)) d += 6; }
  return Math.round(d * mult);
}
/** How bad it is for u to step on tile k (an expected-damage scale; the move score adds it): a field of the other side
 * (10 + 3 × its bite), a trap of the other side its side has spotted (150), and 200 more when the bite would kill it.
 * The other side's traps it hasn't spotted are unknown to it (0). */
export function aiTileRisk(cb: Combat, u: Unit, k: string): number {
  let r = 0;
  for (const z of cb.zones || []) {
    if (!z.tiles.includes(k) || z.side === u.side) continue;
    if (z.kind === 'field' || z.kind === 'wall') { const b = Math.max(6, biteOf(cb, z, 0.5)); r += 10 + 3 * b + (b >= u.hp ? 200 : 0); }
    else if (z.kind === 'trap' && !secretFrom(z, u.side)) r += 150 + (biteOf(cb, z, 1) >= u.hp ? 200 : 0);
  }
  return r;
}
/** The risk of the walk paths() would take to k (every tile after the start). Added to the enemy's move score. */
export function aiRouteRisk(cb: Combat, u: Unit, P: { prev: Record<string, string> }, k: string): number {
  if (!(cb.zones || []).length) return 0;
  let r = 0; for (let t = k; t && t !== u.pos; t = P.prev[t]) r += aiTileRisk(cb, u, t);
  return r;
}
// A False Image's fooled enemy doesn't know where its owner really is (illusion.ts): it aims no spell at them.
const players = (cb: Combat, u: Unit) => cb.units.filter((t) => t.side !== u.side && live(t) && !t.hidden && !fooledBy(cb, u, t));
const friendsOf = (cb: Combat, u: Unit) => cb.units.filter((t) => t.side === u.side && !t.dead);

// ---------- every enemy: avoid, and clear what blocks ----------
/** Step out of a field of the other side it stands in (the cheapest safe tile, at most 2 AP), and scuff a turret of
 * the other side it stands on. Any enemy, caster or not. True when it acted. Once a turn. */
export function aiAvoid(cb: Combat, rng: Rng, u: Unit): boolean {
  if ((u as any).aiAvoid === cb.round || !(cb.zones || []).length) return false;
  const tur = (cb.zones || []).find((z) => z.kind === 'turret' && z.side !== u.side && !secretFrom(z, u.side) && z.tiles[0] === u.pos);
  if (tur && u.ap >= SPELL_AP.scuff) { (u as any).aiAvoid = cb.round; return !scuff(cb, u); }
  if (aiTileRisk(cb, u, u.pos) <= 0 || u.ap < 1) return false;
  (u as any).aiAvoid = cb.round;
  const P = paths(cb, u.pos, u.id), adj = players(cb, u).filter((t) => dist(t.pos, u.pos) <= 1);
  const out = Object.entries(P.dist).filter(([k, n]) => k !== u.pos && aiRouteRisk(cb, u, P, k) <= 0 && apForTiles(n, u.bank, u.movement) <= Math.min(2, u.ap))
    // stay in reach of whoever it fights (no opportunity attack), else the nearest tile
    .sort((a, b) => (adj.some((t) => dist(t.pos, b[0]) > 1) ? 1 : 0) - (adj.some((t) => dist(t.pos, a[0]) > 1) ? 1 : 0) || a[1] - b[1] || (a[0] < b[0] ? -1 : 1))[0];
  return !!out && !moveUnit(cb, u, out[0], rng);
}
/** When no player is in its reach: strike a turret of the other side it can see that threatens its side (in the
 * turret's reach of one of them), or break a RAISE wall of the other side that blocks its way to the nearest player
 * (no tile it can reach gets it closer, and the wall stands between). True when it acted. */
export function aiClearBlock(cb: Combat, rng: Rng, u: Unit): boolean {
  const w = WEAPON[u.weapon]; if (!w) return false;
  const mine = friendsOf(cb, u);
  for (const z of cb.zones || []) {
    if (z.kind !== 'turret' || z.side === u.side || secretFrom(z, u.side)) continue;
    const sp = compileSpell(z.words), reach = sp.reach && sp.missile !== 'relay' ? sp.range : 1;
    if (!mine.some((t) => dist(t.pos, z.tiles[0]) <= reach)) continue;
    if (!strikeTurret(cb, rng, u, z.tiles[0])) return true;
  }
  const walls = objectsOf(cb).filter((o) => o.kind === 'sigil_wall' && (o as any).side !== u.side && (o.hp ?? 1) > 0);
  if (!walls.length) return false;
  const pcs = cb.units.filter((t) => t.side !== u.side && live(t)); if (!pcs.length) return false;
  const near = pcs.reduce((a, b) => (dist(u.pos, b.pos) < dist(u.pos, a.pos) ? b : a));
  const P = paths(cb, u.pos, u.id), now = dist(u.pos, near.pos);
  const closer = Object.entries(P.dist).some(([k, n]) => k !== u.pos && apForTiles(n, u.bank, u.movement) <= u.ap && dist(k, near.pos) < now);
  if (closer) return false;
  const between = (k: string) => { const [ax, ay] = xy(u.pos), [bx, by] = xy(near.pos), [x, y] = xy(k); return dist(k, u.pos) + dist(k, near.pos) <= now + 1 && (x - ax) * (bx - ax) + (y - ay) * (by - ay) >= 0; };
  const wall = walls.filter((o) => between(o.pos)).sort((a, b) => dist(u.pos, a.pos) - dist(u.pos, b.pos) || (a.pos < b.pos ? -1 : 1))[0];
  if (!wall) return false;
  if (isMelee(w) && dist(u.pos, wall.pos) > 1) return false;
  return !shootCover(cb, u, wall.pos, null);
}

// ---------- the caster: candidates ----------
const DIRS: Dir[] = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const rot = (d: Dir, n: number): Dir => DIRS[(DIRS.findIndex((x) => x[0] === d[0] && x[1] === d[1]) + n + 8) % 8];
const step = (k: string, d: Dir, n = 1) => { const [x, y] = xy(k); return key(x + d[0] * n, y + d[1] * n); };
type Kind = 'harm' | 'boon' | 'null' | 'blink' | 'place';
interface Combo { words: string[]; kind: Kind; sp: Spell; est: number }
const COMBO_CACHE = new Map<string, Combo[]>();
/** The spells an enemy could write with its words (unique words, 2 to its Max Sigil words, grammar-valid), sorted and
 * pruned to the strongest few of each kind and Reach (the AI weighs these, not every subset). */
export function casterCombos(words: string[], max: number): Combo[] {
  const ws = [...new Set(words)].filter((w) => W(w)).sort(), k = ws.join(' ') + '|' + max;
  const hit = COMBO_CACHE.get(k); if (hit) return hit;
  const all: string[][] = [], m = Math.min(MAX_GLYPHS, max);
  const rec = (s: number, cur: string[]) => { if (cur.length >= 2 && !grammarError(cur, m)) all.push([...cur]); if (cur.length >= m) return; for (let i = s; i < ws.length; i++) { cur.push(ws[i]); rec(i + 1, cur); cur.pop(); } };
  rec(0, []);
  const groups: Record<string, Combo[]> = {};
  for (const c of all) {
    const sp = compileSpell(c), subj = sp.uniqueSubjects;
    if (subj.length > 2) continue;
    const kind: Kind | null = sp.stay || sp.wait || sp.watch ? (sp.harmful ? 'place' : null) : subj.every(isBoonWord) ? 'boon' : subj.length === 1 && subj[0] === 'null' ? 'null'
      : subj.length === 1 && subj[0] === 'step' ? 'blink' : sp.harmful && subj.every((w) => isElement(w) || isAffliction(w)) ? 'harm' : null;
    if (!kind) continue;
    let dmg = 0, heal = 0; for (const w of subj) { const d: any = W(w); dmg += d?.damage || 0; heal += (d?.heal || 0) + (d?.shield || 0); }
    const area = 1 + (sp.spread ? sp.radius * 1.2 * sp.radiusMult : 0) + (sp.push ? sp.coneLen * 0.6 * sp.coneMult : 0) + (sp.condense ? sp.coreMult - 1 : 0) + sp.chain * 0.6 + (sp.missiles - 1);
    const est = (dmg + heal) * sp.reachMult * area + subj.filter(isAffliction).length * 10 + (sp.reach ? sp.range * 0.3 : 0) - c.length * 0.5;
    // Grouped by length too (item 491): a long spell outscores a short one on paper but may not fit in one turn (4
    // glyphs, 3 steps and the Evoke are 8 AP), so each length keeps its own strongest few.
    (groups[kind + ':' + (sp.reach || '-') + ':' + (sp.kin ? 'k' : '') + ':' + c.length] ||= []).push({ words: c, kind, sp, est });
  }
  const out: Combo[] = [];
  for (const [g, list] of Object.entries(groups).sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const n = g.startsWith('harm') ? 4 : g.startsWith('boon') ? 2 : 2;
    const sorted = list.sort((a, b) => b.est - a.est || (a.words.join() < b.words.join() ? -1 : 1)), keep = sorted.slice(0, n);
    // Every Affliction it knows keeps its strongest spell in each group (item 490): a COMMAND or BLIND that scores
    // low on damage is still weighed by the situation, not pruned behind the damage words.
    if (g.startsWith('harm')) for (const w of [...new Set(sorted.flatMap((c) => c.sp.uniqueSubjects.filter(isAffliction)))].sort()) {
      if (!keep.some((c) => c.sp.uniqueSubjects.includes(w))) { const b = sorted.find((c) => c.sp.uniqueSubjects.includes(w)); if (b) keep.push(b); }
    }
    out.push(...keep);
  }
  COMBO_CACHE.set(k, out);
  return out;
}
/** Plan an Evoke of a Line not yet drawn (glyphs on `tiles`, in order, the caster standing on the last), then put the
 * fight back exactly as it was. Uses the engine's own planner, so nothing it finds breaks a rule. */
function planLine(cb: Combat, u: Unit, words: string[], tiles: string[], aim: string, opts: EvokeOpts): EvokePreview | null {
  const was = u.pos, glyphs = cb.glyphs, seq = cb.glyphSeq || 0, ap = u.ap, m = u.mg!, charge = m.charge;
  try {
    cb.glyphs = [...(glyphs || []), ...tiles.map((k, i) => ({ id: 'gl' + (seq + 1 + i), word: words[i], pos: k, by: u.id, side: u.side, left: 2, who: u.name, v: SIGIL_REV } as Glyph))];
    u.pos = tiles[tiles.length - 1]; u.ap = 99; m.charge = 99;
    const pv = planEvoke(cb, u, tiles[0], aim, opts);
    return pv.ok && !pv.fizzle && findLineOk(cb, tiles) ? pv : null;
  } finally { u.pos = was; cb.glyphs = glyphs; cb.glyphSeq = seq; u.ap = ap; m.charge = charge; }
}
/** The Line read is exactly the tiles drawn (no older glyph of its side joined it). */
function findLineOk(cb: Combat, tiles: string[]) { const p = findPattern(cb, tiles[0]); return typeof p !== 'string' && p.tiles.length === tiles.length; }

// ---------- the caster: what a plan is worth ----------
const COND_WORD: Record<string, string> = {};
function condWord(cond: string): string {
  if (!Object.keys(COND_WORD).length) for (const w of ['freeze', 'acid', 'bind', 'blind', 'slow', 'muddle', 'dread', 'silence', 'command']) { const a: any = (W(w) as any)?.applies; if (a?.condition) COND_WORD[a.condition] ||= w; }
  return COND_WORD[cond] || cond;
}
/** A player charging in: a melee weapon, not yet in reach of the caster's side, close enough to get there soon. */
function charging(cb: Combat, u: Unit, t: Unit): boolean {
  const w = WEAPON[t.weapon]; if (!w || !isMelee(w)) return false;
  const d = Math.min(...friendsOf(cb, u).filter(live).map((f) => dist(f.pos, t.pos)));
  return d >= 2 && d <= 2 + Math.ceil((t.movement || 1.5) * 6);
}
/** What a condition on a player is worth to the caster (an expected-damage scale): BIND or SLOW on a charging melee
 * player, BLIND on a shooter, SILENCE on a caster count double; COMMAND by the order it would give (aiCommandOrder).
 * single: the spell has one target (no Burst, one missile, no CHAIN), so COMMAND may give the move order. */
function condValue(cb: Combat, u: Unit, cond: string, t: Unit, single = true): number {
  if (condOn(t, cond)) return 0;
  const w = condWord(cond), wp = WEAPON[t.weapon];
  if (w === 'bind' || w === 'slow' || w === 'freeze') return charging(cb, u, t) ? 22 : 9;
  if (w === 'blind') return wp && !isMelee(wp) ? 16 : 8;
  if (w === 'silence') return t.mg && (t.mg.evoker || t.mg.emanator) ? 20 : 2;
  if (w === 'command') return aiCommandOrder(cb, u, t, single).value;
  if (w === 'acid') return 8;
  return 9;
}
/** The order a caster gives a creature of the other side it COMMANDs (spec 14 item 490), and what it is worth (an
 * expected-damage scale). In this order: **move** (one target only) a player standing next to the caster's side to
 * the tile it can walk to in move_tiles (3) that is farthest from the caster's side (at least 2 away: out of melee),
 * never onto a field, trap, turret or wall of either side (the order never sends it into harm), 18 + 2 for each of
 * the caster's side it was next to; **halt** a player charging in with a melee weapon, 20; **drop** an armed player's
 * weapon when it could shoot one of the caster's side (a ranged weapon, one of them in its range and sight) 16, or
 * when it stands next to one of them 14; else **kneel** (Prone: it spends AP to get up), 9. Ties break by tile key.
 * Deterministic. */
export function aiCommandOrder(cb: Combat, u: Unit, t: Unit, single = true): { order: 'halt' | 'kneel' | 'drop' | 'move'; orderTo?: string; value: number } {
  const own = friendsOf(cb, u).filter(live), adj = own.filter((f) => dist(f.pos, t.pos) <= 1);
  if (single && adj.length && !t.prone && !condOn(t, 'pinned') && !condOn(t, 'grappled')) {
    const max = (W('command') as any)?.move_tiles ?? 3, P = paths(cb, t.pos, t.id);
    const harm = new Set<string>(); for (const z of cb.zones || []) if (['field', 'trap', 'turret', 'wall'].includes(z.kind)) for (const k of z.tiles) harm.add(k);
    let to: string | null = null, td = -1;
    for (const [k, n] of Object.entries(P.dist)) {
      if (k === t.pos || n > max || harm.has(k)) continue;
      const d = Math.min(...own.map((f) => dist(f.pos, k)));
      if (d > td || (d === td && to !== null && k < to)) { td = d; to = k; }
    }
    if (to && td >= 2) return { order: 'move', orderTo: to, value: 18 + 2 * adj.length };
  }
  if (charging(cb, u, t)) return { order: 'halt', value: 20 };
  const w = WEAPON[t.weapon];
  if (w && w.id !== 'fists' && !condOn(t, 'disarmed')) {
    if (!isMelee(w) && own.some((f) => dist(f.pos, t.pos) <= effectiveRange(w) && lineOfSight(cb, t.pos, f.pos))) return { order: 'drop', value: 16 };
    if (adj.length) return { order: 'drop', value: 14 };
  }
  return { order: 'kneel', value: 9 };
}
const failChance = (t: Unit, fam: 'body' | 'brain' | 'heart', tn: number) => 1 - Math.max(0.05, Math.min(0.95, (21 - (tn - unitSave(t, fam))) / 20));
/** What NULL unmakes on these tiles, by side: the other side's magic is worth unmaking (more when it is near the
 * caster's side), its own is a loss. */
function nullValue(cb: Combat, u: Unit, tiles: string[]): number {
  const T = new Set(tiles), mine = friendsOf(cb, u); let v = 0;
  const near = (ks: string[]) => mine.some((f) => ks.some((k) => dist(f.pos, k) <= 3));
  for (const g of cb.glyphs || []) if (T.has(g.pos) && !(g as any).keystone) v += g.side === u.side ? -3 : 3;
  for (const z of cb.zones || []) {
    if (!z.tiles.some((k) => T.has(k)) || !['field', 'trap', 'turret', 'wall', 'veil', 'light'].includes(z.kind)) continue;
    if (z.side !== u.side && secretFrom(z, u.side)) continue; // a trap it hasn't spotted: it doesn't know to aim there
    const base = z.kind === 'turret' ? 16 : z.kind === 'field' || z.kind === 'wall' ? 12 : z.kind === 'trap' ? 10 : 4;
    v += z.side === u.side ? -base : base + (near(z.tiles) ? 8 : 0);
  }
  for (const o of objectsOf(cb)) if (o.kind === 'sigil_wall' && T.has(o.pos)) v += (o as any).side === u.side ? -6 : 8;
  return v;
}
/** The best place to blink to from `from`: a free tile within STEP's reach, out of every player's reach and off any
 * known danger, in sight of a player if it shoots. */
function blinkDest(cb: Combat, u: Unit, from: string): string | null {
  const pcs = players(cb, u), max = (W('step') as any)?.teleport_tiles ?? 4, shoots = !!WEAPON[u.weapon] && !isMelee(WEAPON[u.weapon]);
  let best: string | null = null, bs = -Infinity;
  for (const k of around(from, max)) {
    if (k === from || !freeTile(cb, k, u) || aiTileRisk(cb, u, k) > 0) continue;
    const md = pcs.length ? Math.min(...pcs.map((t) => dist(t.pos, k))) : 9; if (md <= 1) continue;
    const s = Math.min(md, 6) + (shoots && pcs.some((t) => lineOfSight(cb, k, t.pos) && dist(k, t.pos) <= effectiveRange(WEAPON[u.weapon])) ? 5 : 0) - dist(from, k) * 0.1;
    if (s > bs) { bs = s; best = k; }
  }
  return best;
}
/** A plan's worth to the caster (positive: worth casting), by what it does to each creature it affects and to the
 * magic on the ground. −Infinity: it would hit more of its own side than of the other (the AI holds it). */
export function aiPlanValue(cb: Combat, u: Unit, pv: EvokePreview): number {
  const sp = pv.spell!, livea = pv.affected.filter(counts);
  const harmFoes = livea.filter((a) => !a.ally && (a.dmg > 0 || a.saves.length)), harmOwn = livea.filter((a) => a.ally && sp.harmful && (a.dmg > 0 || a.saves.length));
  if (harmOwn.length && harmOwn.length >= harmFoes.length) return -Infinity;
  let s = 0;
  for (const a of livea) {
    const t = unitOf(cb, a.unit);
    const exp = Math.min(t.hp, a.roll ? a.dmgAfterArmour * a.roll.pct / 100 : a.dmgAfterArmour);
    let cv = 0; for (const sv of a.saves) cv += failChance(t, sv.fam, sv.tn) * (sv.cond === 'teleport' ? 5 : condValue(cb, u, sv.cond, t, singleTarget(sp)));
    if (!a.ally) { s += exp + cv + (exp >= t.hp * 0.9 ? 10 : 0); continue; }
    if (sp.harmful) s -= 1.5 * (exp + cv);
    const miss = t.maxHp - t.hp, threatened = players(cb, u).some((p) => dist(p.pos, t.pos) <= 8);
    if (a.heal) s += Math.min(a.heal, miss) * (t.hp < t.maxHp * 0.5 ? 1.3 : 1);
    if (a.shield) s += a.shield * (threatened ? (t.hp < t.maxHp * 0.7 ? 0.7 : 0.35) : 0.1) * ((t.shield || 0) >= a.shield ? 0.2 : 1);
    for (const w of sp.uniqueSubjects) {
      if ((w === 'quicken' || w === 'sharpen') && threatened && !condOn(t, w === 'quicken' ? 'quickened' : 'sharpened') && t !== u) s += 7;
      if (w === 'cleanse') s += Object.keys(t.conds || {}).filter((c) => !['quickened', 'sharpened', 'hidden'].includes(c)).length ? 9 : 0;
    }
  }
  for (const m of pv.missiles) {
    if (m.nulls) s += nullValue(cb, u, sp.burst ? m.burst.tiles : [m.impact]);
    if (m.placed) s += placedValue(cb, u, sp, m.placed, m.impact, m.burst.tiles);
    if (m.step.some((x) => x.unit === u.id)) s += blinkValue(cb, u);
  }
  return s;
}
/** A spell with one target: no Burst, one missile, no CHAIN (COMMAND's move order needs one). */
const singleTarget = (sp: Spell) => !sp.burst && sp.missiles <= 1 && !sp.chain;
/** A blink out of melee: worth more the more players stand next to it, and when it is hurt or shoots. */
function blinkValue(cb: Combat, u: Unit): number {
  const adj = players(cb, u).filter((t) => dist(t.pos, u.pos) <= 1).length; if (!adj) return 0;
  const w = WEAPON[u.weapon];
  return 10 + 5 * adj + (u.hp < u.maxHp * 0.5 ? 10 : 0) + (w && !isMelee(w) ? 6 : 0);
}
/** What a field, trap or turret it would place is worth: a field on the players standing in it (they take its bite
 * next turn unless they walk out), a trap on the tiles they'll cross toward its side, a turret with players in reach. */
function placedValue(cb: Combat, u: Unit, sp: Spell, kind: 'field' | 'trap' | 'turret', at: string, tiles: string[]): number {
  const pcs = players(cb, u), own = friendsOf(cb, u).filter(live);
  let dmg = 0; for (const w of sp.uniqueSubjects) dmg += ((W(w) as any)?.damage || 0) * (sp.counts[w] || 1); dmg = dmg * sp.repMult * sp.reachMult;
  const aff = sp.uniqueSubjects.filter(isAffliction).length * 6;
  if (kind === 'field') {
    const T = new Set(tiles), hit = pcs.filter((t) => T.has(t.pos)).length, mine = sp.kin ? 0 : own.filter((t) => T.has(t.pos)).length;
    return hit * (dmg * 0.5 + aff) * 1.1 - mine * 1.5 * (dmg * 0.5 + aff);
  }
  if (kind === 'trap') {
    if (own.some((f) => dist(f.pos, at) <= 0)) return 0;
    const onWay = pcs.filter((t) => dist(t.pos, at) <= 2 && dist(t.pos, at) >= 1 && own.some((f) => dist(f.pos, at) < dist(f.pos, t.pos))).length;
    return onWay ? (dmg + aff) * 0.45 : 0;
  }
  const reach = sp.reach && sp.missile !== 'relay' ? sp.range + (u.mg?.rangeBonus || 0) : 1;
  const inReach = pcs.filter((t) => dist(t.pos, at) <= reach && (dist(t.pos, at) <= 1 || lineOfSight(cb, at, t.pos)));
  if (!inReach.length) return 0;
  const nearestPc = Math.min(...inReach.map((t) => dist(t.pos, at))), ownNearer = !sp.kin && own.some((f) => f !== u && dist(f.pos, at) < nearestPc);
  return ownNearer ? -10 : (dmg * 0.5 + aff) * Math.min(2, sp.turretRounds || 2) * sp.missiles;
}

// ---------- the caster: decide and act ----------
interface Choice { score: number; cost: number; words: string[]; tiles: string[]; aim: string; opts: EvokeOpts; pre: ('vent' | 'core')[]; existing?: string }
/** Expected weapon damage per AP against the best player it can attack now (0 when none is in reach). */
function weaponPerAp(cb: Combat, u: Unit): number {
  const w = WEAPON[u.weapon], mode = !w || isMelee(w) ? 'melee' : 'shot'; let best = 0;
  for (const t of players(cb, u)) { const pv = previewAttack(cb, u, t, mode as any); if (pv.ok && pv.dmg) best = Math.max(best, (pv.pct / 100) * Math.max(1, pv.dmg.total - pv.dmg.armour) / Math.max(1, pv.ap)); }
  return best;
}
/** The price of drawing and walking a Line on these tiles and Evoking it: AP (glyphs, steps with the move bank, Evoke,
 * and a vent or core swap first when needed), or null when it can't be done this turn. */
function linePrice(cb: Combat, u: Unit, words: string[], tiles: string[], evokeAp: number, evokeCharge: number): { ap: number; pre: ('vent' | 'core')[] } | null {
  const m = u.mg!; let ap = 0, charge = 0, fx = 0, bank = u.bank || 0;
  for (let i = 0; i < words.length; i++) {
    const gc = glyphCost(cb, u, words[i], true, tiles[i]); if (gc.fail) return null;
    ap += gc.ap; charge += gc.charge; fx += gc.flux;
    if (i < words.length - 1) { const a = apForTiles(1, bank, u.movement); bank = bank + a * u.movement - 1; ap += a; }
  }
  const pre: ('vent' | 'core')[] = [];
  if (fx > FLUX_MAX) return null;
  if (m.flux + fx > FLUX_MAX) { pre.push('vent'); ap += ventAp(u); }
  if (charge + evokeCharge > m.charge) { if (m.cores < 1 || charge + evokeCharge > CORE_CHARGE) return null; pre.push('core'); ap += coreAp(u); }
  ap += evokeAp;
  return ap <= u.ap ? { ap, pre } : null;
}
/** The tiles a Line of n glyphs walks, starting on the caster's tile and going `d`: each free, unmarked, off any
 * known danger and a straight step on from the last; null if any isn't. */
function lineTiles(cb: Combat, u: Unit, n: number, d: Dir, P: { dist: Record<string, number> }): string[] | null {
  const out = [u.pos];
  if ((cb.glyphs || []).some((g) => g.pos === u.pos)) return null;
  for (let i = 1; i < n; i++) {
    const k = step(u.pos, d, i);
    if (!freeTile(cb, k, u) || (cb.glyphs || []).some((g) => g.pos === k) || P.dist[k] === undefined || P.dist[k] > i || aiTileRisk(cb, u, k) > 0) return null;
    out.push(k);
  }
  return out;
}
/** Opportunity attacks the walk would draw: players next to the caster it would leave the reach of. */
function oaPenalty(cb: Combat, u: Unit, tiles: string[]): number {
  let p = 0, at = u.pos;
  for (const k of tiles.slice(1)) { for (const t of players(cb, u)) { const tw = WEAPON[t.weapon]; if (tw && isMelee(tw) && dist(t.pos, at) <= 1 && dist(t.pos, k) > 1) p += 10; } at = k; }
  return p;
}
/** The caster's Sigil decision for this turn (spec: Sigils 8): every spell it can finish this turn (a Line it stands by,
 * or a new one it draws and walks), each planned by the engine and scored; the best per AP is cast if it beats the
 * weapon. Once a turn. True when it acted. */
export function aiSigilCast(cb: Combat, rng: Rng, u: Unit): boolean {
  const m = u.mg; if (!m || !m.evoker || !m.words.length || sigilReady(cb, u) || (u as any).aiSigil === cb.round) return false;
  const pcs = players(cb, u); if (!pcs.length) return false;
  (u as any).aiSigil = cb.round; // one decision a turn
  const bias = (m as any).aiBias ?? 1, weapon = weaponPerAp(cb, u), own = friendsOf(cb, u);
  let best: Choice | null = null;
  // The turn's worth: the spell, plus what the AP left could still do with the weapon (a cheap spell leaves room for a
  // shot; an expensive one must be worth it). Ties: the cheaper.
  const worth = (c: Choice) => c.score + weapon * Math.max(0, u.ap - c.cost) - 0.01 * c.cost;
  const consider = (c: Choice) => { if (!(c.score > 4)) return; if (!best || worth(c) > worth(best) + 1e-9) best = c; };
  const optsFor = (sp: Spell, aim: string, end: string): EvokeOpts | null => {
    if (sp.uniqueSubjects.includes('command')) {
      // The order fits the creature at the aim (item 490); an aim with nobody on it halts whoever the burst catches.
      const t = cb.units.find((x) => x.pos === aim && live(x) && x.side !== u.side);
      if (!t) return { order: 'halt' };
      const o = aiCommandOrder(cb, u, t, singleTarget(sp));
      return o.order === 'move' ? { order: 'move', orderTo: o.orderTo } : { order: o.order };
    }
    if (sp.uniqueSubjects.includes('step')) { if (aim !== end) return null; const d = blinkDest(cb, u, end); return d ? { dest: d } : null; }
    return {};
  };
  // A Line already on the ground it stands by and can read (its own unfinished one, or a player's).
  const seen = new Set<string>();
  for (const g of cb.glyphs || []) {
    if (dist(g.pos, u.pos) > 1 || seen.has(g.pos)) continue; const p = findPattern(cb, g.pos, u.pos); if (typeof p === 'string') continue;
    for (const k of p.tiles) seen.add(k);
    const sp = compileSpell(p.words);
    for (const t of [...pcs, ...own]) {
      const o = optsFor(sp, t.pos, u.pos); if (!o) continue;
      const pv = planEvoke(cb, u, g.pos, t.pos, o); if (!pv.ok || pv.fizzle) continue;
      consider({ score: aiPlanValue(cb, u, pv) * bias, cost: Math.max(1, pv.ap), words: [], tiles: [g.pos], aim: t.pos, opts: o, pre: [], existing: g.pos });
    }
  }
  // New Lines: drawn from its own tile, walked away from the aim, Evoked back past the first glyph.
  const P = paths(cb, u.pos, u.id), hurt = own.filter((t) => live(t) && t.hp < t.maxHp * 0.85).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp).slice(0, 4);
  const threatened = own.filter((t) => live(t) && pcs.some((p) => dist(p.pos, t.pos) <= 6)).slice(0, 4);
  const nearPcs = [...pcs].sort((a, b) => dist(u.pos, a.pos) - dist(u.pos, b.pos)).slice(0, 6);
  const magicTiles: string[] = [];
  for (const z of cb.zones || []) if (z.side !== u.side && !secretFrom(z, u.side) && ['field', 'trap', 'turret', 'wall'].includes(z.kind)) magicTiles.push(z.kind === 'field' || z.kind === 'wall' ? z.tiles.slice().sort((a, b) => dist(u.pos, a) - dist(u.pos, b))[0] : z.tiles[0]);
  for (const o of objectsOf(cb)) if (o.kind === 'sigil_wall' && (o as any).side !== u.side) magicTiles.push(o.pos);
  for (const g of cb.glyphs || []) if (g.side !== u.side) magicTiles.push(g.pos);
  const trapTiles: string[] = [];
  for (const t of nearPcs.slice(0, 3)) { const f = own.filter(live).sort((a, b) => dist(a.pos, t.pos) - dist(b.pos, t.pos))[0]; if (!f) continue; const d = dir8(t.pos, f.pos); for (const k of [step(t.pos, d, 1), step(t.pos, d, 2)]) if (freeTile(cb, k) && !trapTiles.includes(k)) trapTiles.push(k); }
  const adjPcs = pcs.filter((t) => dist(t.pos, u.pos) <= 1);
  const turretTiles: string[] = [];
  if (nearPcs[0]) { const d = dir8(u.pos, nearPcs[0].pos); for (const n of [2, 3]) { const k = step(u.pos, d, n); if (freeTile(cb, k) && dist(k, nearPcs[0].pos) >= 2) turretTiles.push(k); } }
  for (const c of casterCombos(m.words, m.maxWords)) {
    const L = c.words.length;
    const aims: string[] = c.kind === 'harm' ? nearPcs.map((t) => t.pos) : c.kind === 'boon' ? [...new Set([...hurt, ...(c.sp.uniqueSubjects.some((w) => w === 'ward') ? threatened : [])].map((t) => t.pos))]
      : c.kind === 'null' ? [...new Set(magicTiles)].sort((a, b) => dist(u.pos, a) - dist(u.pos, b)).slice(0, 4) : c.kind === 'blink' ? (adjPcs.length ? ['self'] : [])
      : c.sp.wait ? trapTiles : c.sp.watch ? turretTiles : nearPcs.slice(0, 3).map((t) => t.pos);
    for (const aim0 of aims) {
      const self = aim0 === 'self' || aim0 === u.pos;
      // Directions: away from the aim (and the two beside it); for a blink, sideways steps that stay in reach of whoever
      // stands next to it first (no opportunity attack), then the rest.
      const dirs: Dir[] = self ? [...DIRS].sort((a, b) => oaPenalty(cb, u, [u.pos, step(u.pos, a)]) - oaPenalty(cb, u, [u.pos, step(u.pos, b)])) : (() => { const d = dir8(aim0, u.pos); return [d, rot(d, 1), rot(d, -1)]; })();
      for (const d of dirs) {
        const tiles = lineTiles(cb, u, L, d, P); if (!tiles) continue;
        const end = tiles[L - 1], aim = self ? end : aim0;
        const o = optsFor(c.sp, aim, end); if (!o) continue;
        const pv = planLine(cb, u, c.words, tiles, aim, o); if (!pv) continue;
        const price = linePrice(cb, u, c.words, tiles, pv.ap, pv.charge); if (!price) continue;
        const v = aiPlanValue(cb, u, pv) - oaPenalty(cb, u, tiles);
        consider({ score: v * bias, cost: price.ap, words: c.words, tiles, aim, opts: o, pre: price.pre });
        if (self || v > 0) break; // the first workable direction is enough
      }
    }
  }
  const b = best as Choice | null;
  if (!b || b.score < weapon * b.cost) return false; // the weapon would do more with the same AP
  return castChoice(cb, rng, u, b);
}
/** Carry out the chosen spell with the engine's own actions. Stops (having acted) if anything interrupts the walk. */
function castChoice(cb: Combat, rng: Rng, u: Unit, c: Choice): boolean {
  if (c.existing) { evoke(cb, rng, u, c.existing, c.aim, c.opts); return true; }
  for (const p of c.pre) if ((p === 'vent' ? vent(cb, u) : swapCore(cb, u))) return false;
  const aimUnit = cb.units.find((x) => x.pos === c.aim && !x.dead && x !== u);
  for (let i = 0; i < c.words.length; i++) {
    if (i) { if (moveUnit(cb, u, c.tiles[i], rng) || u.pos !== c.tiles[i] || u.dead || u.downed) return true; }
    if (drawGlyph(cb, rng, u, c.words[i])) return i > 0 || c.pre.length > 0;
  }
  // The aim may have moved (a reaction, a push): fire at it where it is if it still stands in the plan's area.
  const aim = c.aim === c.tiles[c.tiles.length - 1] ? u.pos : aimUnit && !aimUnit.dead ? aimUnit.pos : c.aim;
  evoke(cb, rng, u, c.tiles[0], aim, c.opts);
  return true;
}

/** The enemy turn's Sigil step (combat.ts enemyTurn, one call): avoid what it knows of the other side's magic, then, for
 * a caster, its spell. True when it acted. */
export function aiSigilStep(cb: Combat, rng: Rng, u: Unit): boolean {
  if (aiAvoid(cb, rng, u)) return true;
  return !!u.mg?.evoker && aiSigilCast(cb, rng, u);
}
/** The words a caster archetype knows (for tools and the Narrator's context). */
export const casterWords = (id: string): string[] => [...(CASTER[id]?.sigils || [])];
