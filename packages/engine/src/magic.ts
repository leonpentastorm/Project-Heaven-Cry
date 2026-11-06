// Magic (spec: Mana, rules 1.2). Sigils are words drawn as glyphs onto tiles; a spell is the words plus the shape they
// make (Stack, Line, Ring), fired with Evoke. Outbursts are held in the heart, grow each turn and are released when
// the caster chooses. The ambient mana meter, conditions with saves, shields and standing wall zones live here too.
// Everything is deterministic: rolls come from the rng passed in.
import { SIGIL, SCHOOL, MODULE, MANA_BANDS, type SigilDef } from './data';
import {
  type Character, type OutburstDesign, mod, maxMp, healingMult, packOf,
  sigilMult, soulMult, elementalMult, maxSigilWords, glyphAp, sigilCoreSaving, sigilRangeBonus, sigilDurationBonus,
  soulCastAp, soulCostSaving, soulRangeBonus, syphonMult, strainLimit, saveBonus, debuffStrength, hasEvoker, hasEmanator, coresCarried, mpNow, evoChargeNow,
} from './character';
import { type Combat, type Unit, dist, lineOfSight, standable, refOf, coverTileFor } from './combat';
import { type Rng, d20, die } from './rng';

type Fam = 'body' | 'brain' | 'heart';
export interface Glyph { id: string; word: string; pos: string; by: string; side: 'pc' | 'foe'; left: number; who: string }
export interface Zone { id: string; kind: 'wall' | 'veil' | 'light'; tiles: string[]; words: string[]; by: string; side: 'pc' | 'foe'; left: number; mult: number; who: string; hit?: Record<string, number> }
/** A unit's magic: what it knows and carries, and its running state. */
export interface MagicUnit {
  words: string[]; designs: OutburstDesign[]; evoker: boolean; emanator: boolean;
  charge: number; cores: number; coresMade: number; flux: number; lockRound?: number;
  mp: number; mpMax: number; strain: number; held: { design: string; stage: number; cost: number } | null; cast: boolean;
  brain: number; will: number; sigilMult: number; soulMult: number; elemMult: number; healMult: number;
  maxWords: number; glyphAp: number; coreSave: number; rangeBonus: number; durBonus: number;
  soulAp: number; costSave: number; soulRange: number; syphon: number; strainLimit: number;
  saves: Record<Fam, number>; debuff: Record<Fam, number>;
}

export const MANA_START = 15;
export const FLUX_MAX = 6;
export const CORE_CHARGE = 10;
/** Line range by length (Leon: two-tile lines were too cheap). */
export const LINE_RANGE: Record<number, number> = { 2: 4, 3: 8, 4: 12 };
export const PUSH_RANGE = 8;
export const SOUL_REACH = 4;
export const SPELL_AP = { evoke: 1, scuff: 1, vent: 1, core: 2, release: 1, syphon: 1, crystallise: 3 };
const CONDS: Record<string, { name: string; fam: Fam; rounds: number }> = {
  slowed: { name: 'Slowed', fam: 'body', rounds: 2 }, pinned: { name: 'Pinned', fam: 'body', rounds: 2 }, blinded: { name: 'Blinded', fam: 'body', rounds: 2 },
  burning: { name: 'Burning', fam: 'body', rounds: 2 }, shaken: { name: 'Shaken', fam: 'heart', rounds: 2 }, fear: { name: 'Afraid', fam: 'heart', rounds: 2 },
  confused: { name: 'Confused', fam: 'brain', rounds: 2 }, ldebuff: { name: 'Left Brain Debuff', fam: 'brain', rounds: 2 }, rdebuff: { name: 'Right Brain Debuff', fam: 'heart', rounds: 2 },
  silenced: { name: 'Silenced', fam: 'brain', rounds: 1 }, guarded: { name: 'Guarded (+2 Defense)', fam: 'body', rounds: 2 }, inspired: { name: 'Inspired (+2 to hit)', fam: 'heart', rounds: 2 },
};
export const condName = (id: string) => CONDS[id]?.name || id;
const BOOST = new Set(['guarded', 'inspired']);

// ---------- the meter ----------
export const manaBand = (m: number) => MANA_BANDS.find((b) => m >= b.min && m <= b.max) || MANA_BANDS[1];
export const manaOf = (cb: Combat) => (cb.mana ??= MANA_START);
export function shiftMana(cb: Combat, by: number, why?: string) {
  const was = manaOf(cb), now = Math.max(0, Math.min(40, was + by)); cb.mana = now;
  const a = manaBand(was).id, b = manaBand(now).id;
  if (a !== b) cb.log.push('The air turns ' + b.toUpperCase() + ' (mana ' + now + ')' + (why ? ': ' + why : '') + '.');
}
/** Deaths release bots (spec: the meter): +5 a person, +2 a robot. Called once per turn; each death counts once. */
export function noteDeaths(cb: Combat) {
  const seen = new Set(cb.deadSeen || []);
  for (const u of cb.units) if (u.dead && !seen.has(u.id)) { seen.add(u.id); shiftMana(cb, /drone|robot|automaton|\bbot\b|turret/i.test(u.name) ? 2 : 5, u.name + ' fell'); }
  cb.deadSeen = [...seen];
}

// ---------- units ----------
export function magicOf(c: Character): MagicUnit | undefined {
  const words = c.sigils || [], designs = c.outbursts || [], evoker = hasEvoker(c), emanator = hasEmanator(c);
  if (!words.length && !designs.length && !evoker && !emanator) return undefined;
  return {
    words: [...words], designs: designs.map((d) => ({ ...d, modules: [...d.modules] })), evoker, emanator,
    charge: evoChargeNow(c), cores: coresCarried(c), coresMade: 0, flux: 0, mp: mpNow(c), mpMax: maxMp(c), strain: 0, held: null, cast: false,
    brain: mod(c.skills.brain_power || 0), will: mod(c.skills.will_power || 0), sigilMult: sigilMult(c), soulMult: soulMult(c), elemMult: elementalMult(c), healMult: healingMult(c),
    maxWords: maxSigilWords(c), glyphAp: glyphAp(c), coreSave: sigilCoreSaving(c), rangeBonus: sigilRangeBonus(c), durBonus: sigilDurationBonus(c),
    soulAp: soulCastAp(c), costSave: soulCostSaving(c), soulRange: soulRangeBonus(c), syphon: syphonMult(c), strainLimit: strainLimit(c),
    saves: { body: saveBonus(c, 'body'), brain: saveBonus(c, 'brain'), heart: saveBonus(c, 'heart') },
    debuff: { body: debuffStrength(c, 'body'), brain: debuffStrength(c, 'brain'), heart: debuffStrength(c, 'heart') },
  };
}
/** Write a unit's magic back to its character (after a fight, or after an overworld action). */
export function magicToCharacter(c: Character, u: Unit) {
  const m = u.mg; if (!m) return;
  if (m.emanator) c.mp = Math.max(0, Math.min(m.mpMax, Math.round(m.mp)));
  if (m.evoker) c.evoCharge = m.charge;
  const had = coresCarried(c), want = m.cores + m.coresMade;
  if (want !== had) {
    let left = had - want; // positive: cores spent; negative: cores made
    const pack = packOf(c).map((x) => ({ ...x }));
    if (left > 0) for (const it of pack) { if ((it.item || it.id) !== 'standard_core' || !left) continue; const n = Math.min(left, it.qty); it.qty -= n; left -= n; }
    else { const it = pack.find((x) => (x.item || x.id) === 'standard_core'); if (it) it.qty += -left; else pack.push({ id: 'standard_core', item: 'standard_core', name: 'Standard mana core', qty: -left, kind: 'ammo' }); }
    c.pack = pack.filter((x) => x.qty > 0 || x.mags);
    m.cores = want; m.coresMade = 0;
  }
}
const saveOf = (u: Unit, fam: Fam) => (u.mg ? u.mg.saves[fam] : ({ minion: 0, soldier: 1, elite: 2, boss: 3 } as Record<string, number>)[u.tier || 'minion'] ?? 0);
const debuffOf = (u: Unit, fam: Fam) => (u.mg ? u.mg.debuff[fam] : ({ minion: 0, soldier: 1, elite: 2, boss: 2 } as Record<string, number>)[u.tier || 'minion'] ?? 0);
export const condOn = (u: Unit, id: string) => !!(u.conds && u.conds[id] > 0);
/** To-hit change from conditions: Shaken, Afraid and Confused −2 each; Inspired +2. */
export const condHit = (u: Unit) => (condOn(u, 'shaken') ? -2 : 0) + (condOn(u, 'fear') ? -2 : 0) + (condOn(u, 'confused') ? -2 : 0) + (condOn(u, 'inspired') ? 2 : 0);

// ---------- conditions, shields, harm ----------
/** Apply a condition: the target saves (d20 + its save) against 12 + the caster's debuff strength (spec: Conditions
 * and saves). Boons (Guarded, Inspired) need no save. No stacking: a second dose resets to the longer duration. */
export function applyCond(cb: Combat, rng: Rng, by: Unit | null, t: Unit, id: string, rounds?: number, fam?: Fam): string {
  const def = CONDS[id]; if (!def || t.dead) return '';
  const f = fam || def.fam;
  if (!BOOST.has(id)) {
    const r = d20(rng), m = saveOf(t, f), tn = 12 + (by ? debuffOf(by, f) : 0), ok = r === 20 || (r !== 1 && r + m >= tn);
    if (ok) return ' · ' + t.name + ' resists (' + f + ' save ' + (r + m) + ' vs ' + tn + ')';
  }
  const n = rounds || def.rounds, had = condOn(t, id);
  (t.conds ||= {})[id] = Math.max(t.conds[id] || 0, n);
  if (!had) {
    if (id === 'slowed') { t.baseMove ??= t.movement; t.movement = t.baseMove / 2; }
    if (id === 'blinded') { t.baseVision ??= t.vision || 12; t.vision = 1; }
    if (id === 'guarded') t.def += 2;
  }
  return ' · ' + t.name + ' is ' + def.name + ' (' + n + ' round' + (n === 1 ? '' : 's') + ')';
}
function endCond(u: Unit, id: string) {
  if (id === 'slowed' && u.baseMove != null) { u.movement = u.baseMove; delete u.baseMove; }
  if (id === 'blinded' && u.baseVision != null) { u.vision = u.baseVision; delete u.baseVision; }
  if (id === 'guarded') u.def -= 2;
  delete u.conds![id];
}
/** Damage from magic (or a wall zone): the shield first, then armour (Sigil damage takes full armour, Elemental half,
 * Soul none), then HP, Downed or dead, kill credit. A held Outburst may slip. Returns a log suffix. */
export function harm(cb: Combat, rng: Rng, att: Unit | null, t: Unit, raw: number, type: 'sigil' | 'elemental' | 'soul' | 'true'): string {
  if (t.dead) return '';
  let dmg = Math.floor(raw), out = '';
  const arm = type === 'sigil' ? t.armour : type === 'elemental' ? Math.floor(t.armour / 2) : 0;
  dmg = Math.max(1, dmg - arm);
  if (t.shield && t.shield > 0) { const s = Math.min(t.shield, dmg); t.shield -= s; dmg -= s; out += ' (' + s + ' on the shield)'; if (dmg <= 0) return ' · ' + t.name + "'s shield takes it" + out; }
  if (t.downed) { t.saves.fail += 1; if (t.saves.fail >= 3) t.dead = true; return ' · ' + t.name + ' takes a hit while Downed' + (t.dead ? ' and dies' : ''); }
  t.hp = Math.max(0, t.hp - dmg);
  let killed = false;
  if (t.hp === 0) { if (t.side === 'foe') t.dead = true; else t.downed = true; killed = true; }
  if (killed && att && att.side !== t.side) att.kills += t.tier === 'boss' ? 3 : 1;
  out = ' · ' + dmg + ' damage to ' + t.name + out + (t.hp === 0 ? (t.side === 'foe' ? ', down for good' : ', Downed') : '');
  if (!t.dead && !t.downed && t.mg?.held) out += slip(cb, rng, t, dmg);
  return out;
}
export function heal(t: Unit, n: number): string {
  if (t.dead) return '';
  n = Math.floor(n);
  if (t.downed) { t.downed = false; t.saves = { ok: 0, fail: 0 }; t.hp = Math.min(t.maxHp, Math.max(1, n)); return ' · ' + t.name + ' is back up at ' + t.hp + ' HP'; }
  const was = t.hp; t.hp = Math.min(t.maxHp, t.hp + n); return ' · ' + t.name + ' heals ' + (t.hp - was);
}
function shove(cb: Combat, t: Unit, from: string, n: number): string {
  if (t.dead || n === 0) return '';
  const [fx, fy] = from.split(',').map(Number); let [x, y] = t.pos.split(',').map(Number);
  let dx = Math.sign(x - fx), dy = Math.sign(y - fy); if (n < 0) { dx = -dx; dy = -dy; } if (!dx && !dy) return '';
  let moved = 0;
  for (let i = 0; i < Math.abs(n); i++) {
    const k = (x + dx) + ',' + (y + dy);
    if (!standable(cb.map, k) || cb.units.some((u) => u !== t && !u.dead && u.pos === k) || (cb.objects || []).some((o) => o.pos === k && /barricade|pillar|door|crate/.test(o.kind) && !o.open)) break;
    x += dx; y += dy; moved++;
  }
  if (!moved) return '';
  t.pos = x + ',' + y; return ' · ' + t.name + (n > 0 ? ' is thrown' : ' is dragged') + ' to ' + refOf(t.pos);
}

// ---------- turns ----------
/** Start of a unit's turn: conditions tick (Burning burns), a held Outburst grows and strains the heart, Strain eases
 * after a turn with no cast, wall zones bite whoever starts inside. */
export function magicTurnStart(cb: Combat, rng: Rng, u: Unit) {
  if (u.dead) return;
  noteDeaths(cb);
  if (u.conds) for (const id of Object.keys(u.conds)) {
    if (id === 'burning' && !u.downed) cb.log.push(u.name + ' burns' + harm(cb, rng, null, u, 5, 'true'));
    u.conds[id]--; if (u.conds[id] <= 0) { endCond(u, id); cb.log.push(u.name + ' is no longer ' + condName(id) + '.'); }
  }
  const m = u.mg;
  if (m && !u.downed) {
    if (m.held) {
      if (m.held.stage < 4) { m.held.stage++; cb.log.push(u.name + "'s Outburst grows to stage " + m.held.stage + ' (×' + stageMult(m.held.stage) + ').'); }
      addStrain(cb, rng, u, manaBand(manaOf(cb)).id === 'flooded' ? 2 : 1, 'holding');
    } else if (!m.cast && m.strain > 0) m.strain--;
    m.cast = false;
  }
  for (const z of cb.zones || []) if (z.kind === 'wall' && z.tiles.includes(u.pos)) zoneBite(cb, rng, z, u);
}
/** Once per round: glyphs and zones run down. */
export function magicRoundTick(cb: Combat) {
  for (const g of cb.glyphs || []) g.left--;
  const gone = (cb.glyphs || []).filter((g) => g.left <= 0); if (gone.length) cb.log.push(gone.map((g) => g.word.toUpperCase()).join(', ') + ' fade' + (gone.length === 1 ? 's' : '') + ' at ' + [...new Set(gone.map((g) => refOf(g.pos)))].join(', ') + '.');
  cb.glyphs = (cb.glyphs || []).filter((g) => g.left > 0);
  for (const z of cb.zones || []) z.left--;
  cb.zones = (cb.zones || []).filter((z) => z.left > 0);
}
/** Moving into a wall zone. */
export function zoneEnter(cb: Combat, rng: Rng, u: Unit, k: string) { for (const z of cb.zones || []) if (z.kind === 'wall' && z.tiles.includes(k)) zoneBite(cb, rng, z, u); }
function zoneBite(cb: Combat, rng: Rng, z: Zone, u: Unit) {
  if (u.dead || ((z.hit ||= {})[u.id] === cb.round)) return;
  z.hit[u.id] = cb.round;
  const by = cb.units.find((x) => x.id === z.by) || null; let line = '';
  for (const w of z.words) line += subjectEffect(cb, rng, by, u, SIGIL[w], z.mult, by?.mg?.sigilMult || 1, by?.mg?.elemMult || 1, true, z.tiles[0]);
  if (line) cb.log.push(u.name + ' crosses the ' + z.words.map((w) => w.toUpperCase()).join('·') + ' wall' + line + '.');
}
/** Sight blockers and light from magic (VEIL smoke, LIGHT). */
export const veilTiles = (cb: Combat) => (cb.zones || []).filter((z) => z.kind === 'veil').flatMap((z) => z.tiles);
export const magicLit = (cb: Combat, k: string) => (cb.zones || []).some((z) => z.kind === 'light' && z.tiles.includes(k));

// ---------- Sigils ----------
const canCast = (u: Unit, cb: Combat): string | null => (u.dead || u.downed ? 'Downed.' : condOn(u, 'silenced') ? 'Silenced: no magic this round.' : null);
function sigilReady(cb: Combat, u: Unit): string | null {
  const m = u.mg; if (!m || !m.evoker) return 'You need an Evoker for Sigils.';
  if (m.lockRound != null && cb.round <= m.lockRound) return 'Your Evoker is locked after an overload until next round.';
  return canCast(u, cb);
}
export const glyphApOf = (u: Unit) => (u.mg?.glyphAp || 1) + (condOn(u, 'ldebuff') ? 1 : 0);
/** Draw one glyph (spec: Sigils, 1): own tile or adjacent, 2 per tile, the word's charge, Glyph AP, 1 Flux. */
export function drawGlyph(cb: Combat, rng: Rng, u: Unit, word: string, tile: string): string | null {
  const e = sigilReady(cb, u); if (e) return e;
  const m = u.mg!, w = SIGIL[word]; if (!w) return 'No such word.';
  if (!m.words.includes(word)) return 'You don\'t know ' + w.word + '.';
  if (dist(u.pos, tile) > 1) return 'Draw on your own tile or one next to you.';
  if (!standable(cb.map, tile)) return 'Nothing can be drawn there.';
  if ((cb.glyphs || []).filter((g) => g.pos === tile).length >= 2) return 'A tile holds at most 2 glyphs.';
  const ap = glyphApOf(u); if (u.ap < ap) return 'Needs ' + ap + ' AP.';
  if (m.charge < w.charge) return 'Not enough charge in the core (' + m.charge + ' left, ' + w.word + ' needs ' + w.charge + '): swap a core (2 AP).';
  u.ap = Math.round((u.ap - ap) * 10) / 10; m.charge -= w.charge;
  const g: Glyph = { id: 'gl' + (cb.glyphSeq = (cb.glyphSeq || 0) + 1), word, pos: tile, by: u.id, side: u.side, left: 2 + m.durBonus, who: u.name };
  cb.glyphs = [...(cb.glyphs || []), g];
  // Only so many glyphs of yours on the ground: the oldest fades.
  const mine = cb.glyphs.filter((x) => x.by === u.id);
  let faded = '';
  if (mine.length > m.maxWords) { const old = mine[0]; cb.glyphs = cb.glyphs.filter((x) => x !== old); faded = ' (' + old.word.toUpperCase() + ' at ' + refOf(old.pos) + ' fades: ' + m.maxWords + ' glyphs at most)'; }
  cb.log.push(u.name + ' draws ' + w.word + ' at ' + refOf(tile) + ' (' + w.charge + ' charge, ' + ap + ' AP)' + faded + '.' + flux(cb, rng, u, 1));
  return null;
}
function flux(cb: Combat, rng: Rng, u: Unit, n: number): string {
  const m = u.mg!; m.flux += n;
  if (m.flux <= FLUX_MAX) return '';
  const over = m.flux - FLUX_MAX, all = m.flux; m.flux = 0; m.lockRound = cb.round; shiftMana(cb, all, 'an Evoker overloads');
  return ' OVERLOAD: the Evoker bursts' + harm(cb, rng, null, u, 10 * over, 'true') + ', locked until next round';
}
export function vent(cb: Combat, u: Unit): string | null {
  const m = u.mg; if (!m || !m.evoker) return 'You need an Evoker.';
  if (u.ap < SPELL_AP.vent) return 'Needs 1 AP.'; if (!m.flux) return 'No Flux to vent.';
  u.ap -= SPELL_AP.vent; const n = m.flux; m.flux = 0; cb.log.push(u.name + ' vents ' + n + ' Flux into the air.'); shiftMana(cb, n, 'vented Flux');
  return null;
}
export function swapCore(cb: Combat, u: Unit): string | null {
  const m = u.mg; if (!m || !m.evoker) return 'You need an Evoker.';
  if (u.ap < SPELL_AP.core) return 'Needs 2 AP.'; if (m.cores < 1) return 'No spare cores.';
  u.ap -= SPELL_AP.core; m.cores--; m.charge = CORE_CHARGE; cb.log.push(u.name + ' loads a fresh core into the Evoker (' + CORE_CHARGE + ' charge).');
  return null;
}
/** Scuff (1 AP): wipe the glyphs on the tile you stand on. */
export function scuff(cb: Combat, u: Unit): string | null {
  const here = (cb.glyphs || []).filter((g) => g.pos === u.pos); if (!here.length) return 'No glyphs under you.';
  if (u.ap < SPELL_AP.scuff) return 'Needs 1 AP.';
  u.ap -= SPELL_AP.scuff; cb.glyphs = (cb.glyphs || []).filter((g) => g.pos !== u.pos);
  cb.log.push(u.name + ' scuffs out ' + here.map((g) => g.word.toUpperCase()).join(' and ') + ' at ' + refOf(u.pos) + '.');
  return null;
}

export interface Pattern { shape: 'stack' | 'line' | 'ring'; tiles: string[]; glyphs: Glyph[]; words: string[]; centre?: string; near?: string; far?: string; dir?: [number, number]; side: 'pc' | 'foe' }
const xy = (k: string) => k.split(',').map(Number) as [number, number];
/** The pattern a glyph belongs to: its connected glyph tiles (same side) as a Stack, a Line or a Ring. */
export function findPattern(cb: Combat, tile: string, from?: string): Pattern | string {
  const start = (cb.glyphs || []).find((g) => g.pos === tile); if (!start) return 'No glyph there.';
  const side = start.side, at = new Map<string, Glyph[]>();
  for (const g of cb.glyphs || []) if (g.side === side) at.set(g.pos, [...(at.get(g.pos) || []), g]);
  const comp: string[] = [], todo = [tile];
  while (todo.length) { const k = todo.pop()!; if (comp.includes(k)) continue; comp.push(k); if (comp.length > 4) return 'Too many glyphs touch here: a pattern is 2 to 4 tiles.';
    for (const n of at.keys()) if (!comp.includes(n) && dist(n, k) === 1) todo.push(n); }
  const glyphs = comp.flatMap((k) => at.get(k)!), words = glyphs.map((g) => g.word), base = { tiles: comp, glyphs, words, side };
  if (comp.length === 1) return glyphs.length >= 2 ? { shape: 'stack', ...base } : 'One glyph alone is no spell: draw a second on the same tile, or a row.';
  // A Line: every tile on one straight row of consecutive tiles.
  const pts = comp.map(xy);
  for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]] as [number, number][]) {
    const sorted = [...pts].sort((a, b) => (a[0] * dx + a[1] * dy) - (b[0] * dx + b[1] * dy));
    const ok = sorted.every((p, i) => i === 0 || (p[0] - sorted[i - 1][0] === dx && p[1] - sorted[i - 1][1] === dy));
    if (ok) {
      const A = sorted[0].join(','), Z = sorted[sorted.length - 1].join(',');
      const near = from && dist(from, Z) < dist(from, A) ? Z : A, far = near === A ? Z : A;
      const d: [number, number] = near === A ? [dx, dy] : [-dx, -dy];
      return { shape: 'line', ...base, near, far, dir: d };
    }
  }
  // A Ring: 3–4 tiles all touching one empty centre tile.
  if (comp.length >= 3) {
    const [x0, y0] = pts[0];
    for (let cx = x0 - 2; cx <= x0 + 2; cx++) for (let cy = y0 - 2; cy <= y0 + 2; cy++) {
      const c = cx + ',' + cy; if (comp.includes(c) || !standable(cb.map, c)) continue;
      if (comp.every((k) => dist(k, c) === 1)) return { shape: 'ring', ...base, centre: c };
    }
  }
  return 'Those glyphs make no shape: a Stack (2 on a tile), a Line (a straight row) or a Ring (around one tile).';
}
const cls = (w: string) => SIGIL[w]?.class || '';
export function grammarError(words: string[], maxWords: number): string | null {
  if (words.length > maxWords) return 'Too many words for you: ' + words.length + ' of at most ' + maxWords + '.';
  if (!words.some((w) => /^subject/.test(cls(w)))) return 'A spell needs a Subject: an element or an effect.';
  if (!words.some((w) => cls(w) === 'form' || cls(w) === 'motion')) return 'A spell needs a Form or a Motion word too.';
  return null;
}
export const evokeCharge = (p: Pattern, u: Unit) => Math.max(1, p.glyphs.length - (u.mg?.coreSave || 0));
/** Where a pattern's spell goes, given the caster's aim. Returns the impact tile, the targets and the source tile. */
function spellPath(cb: Combat, u: Unit, p: Pattern, aim: string | undefined): { impact: string | null; targets: Unit[]; src: string; why?: string; cone?: boolean } {
  const has = (w: string) => p.words.includes(w), live = (k: string) => cb.units.find((x) => x.pos === k && !x.dead);
  const within = (k: string, r: number) => cb.units.filter((x) => !x.dead && dist(x.pos, k) <= r);
  if (p.shape === 'ring') return { impact: p.centre!, src: p.centre!, targets: has('return') || p.words.every((w) => cls(w) !== 'subject_element' && !['bind', 'blind', 'slow', 'muddle', 'dread', 'silence'].includes(w)) ? [live(p.centre!)].filter(Boolean) as Unit[] : within(p.centre!, 1) };
  if (p.shape === 'line') {
    const range = (LINE_RANGE[p.tiles.length] || 4) + (u.mg?.rangeBonus || 0), [dx, dy] = p.dir!;
    let [x, y] = xy(p.far!), impact: string | null = null, last = p.far!;
    if (has('spread')) { // a cone from the far end
      const t = cb.units.filter((v) => { if (v.dead) return false; const [vx, vy] = xy(v.pos), [fx, fy] = xy(p.far!), ax = vx - fx, ay = vy - fy, l = Math.hypot(ax, ay); return l > 0 && l <= 3.5 && (ax * dx + ay * dy) / (l * Math.hypot(dx, dy)) >= 0.7; });
      return { impact: p.far!, src: p.far!, targets: t, cone: true };
    }
    for (let i = 1; i <= range; i++) {
      x += dx; y += dy; const k = x + ',' + y;
      if (!standable(cb.map, k) && !(cb.map.cover.includes(k) && has('seek'))) break;
      last = k; const v = live(k); if (v) { impact = k; break; }
    }
    return { impact: impact || last, src: p.far!, targets: impact ? [live(impact)!] : [] };
  }
  // Stack: an adjacent tile, or with PUSH out to 8 + range bonus with sight.
  const s = p.tiles[0], reach = has('push') ? PUSH_RANGE + (u.mg?.rangeBonus || 0) : 1;
  if (!aim) return { impact: null, src: s, targets: [], why: has('push') ? 'Pick a tile within ' + reach + ' of the stack.' : 'Pick a tile next to the stack.' };
  if (dist(s, aim) > reach) return { impact: null, src: s, targets: [], why: 'Out of reach: ' + reach + ' tile' + (reach === 1 ? '' : 's') + ' from the stack.' };
  if (aim !== s && !has('seek') && !lineOfSight(cb, s, aim)) return { impact: null, src: s, targets: [], why: 'The stack has no line of sight there.' };
  return { impact: aim, src: s, targets: has('spread') ? within(aim, 2) : [live(aim)].filter(Boolean) as Unit[] };
}
/** One Subject's effect on one target. Damage rolls Brain Power against Defense (walls hit automatically at half). */
function subjectEffect(cb: Combat, rng: Rng, by: Unit | null, t: Unit, w: SigilDef | undefined, mult: number, sm: number, em: number, auto: boolean, src: string, opts: { seek?: boolean } = {}): string {
  if (!w || t.dead) return '';
  if (w.class === 'subject_element') {
    let roll = 0, crit = false;
    if (!auto && by) {
      const r = d20(rng), cover = !opts.seek && w.id !== 'shock' && coverTileFor(cb, src, t.pos) ? 5 : 0, tot = r + (by.mg?.brain ?? 0) + condHit(by) - cover;
      crit = r === 20; roll = r;
      if (r === 1 || (!crit && tot < t.def)) return ' · ' + w.word + ' misses ' + t.name + ' (d20 ' + r + ' → ' + tot + ' vs ' + t.def + (cover ? ', cover' : '') + ')';
    }
    const dmg = (w.damage || 0) * mult * sm * (w.damage_type === 'elemental' ? em : 1) * (crit ? 2 : 1);
    let line = ' · ' + w.word + (roll ? ' hits (d20 ' + roll + (crit ? ', CRITICAL' : '') + ')' : '') + harm(cb, rng, by, t, dmg, w.damage_type === 'elemental' ? 'elemental' : 'sigil');
    if (!t.dead && w.id === 'fire' && crit) line += applyCond(cb, rng, by, t, 'burning');
    if (!t.dead && w.id === 'freeze') line += applyCond(cb, rng, by, t, 'slowed');
    if (!t.dead && w.id === 'gale') line += shove(cb, t, src, w.push_tiles || 2);
    return line;
  }
  switch (w.id) {
    case 'ward': { const s = Math.floor(30 * sm * mult); t.shield = Math.max(t.shield || 0, s); return ' · ' + t.name + ' is warded (' + s + ' shield)'; }
    case 'mend': return heal(t, 25 * sm * mult * (by?.mg?.healMult || 1));
    case 'bind': return applyCond(cb, rng, by, t, 'pinned');
    case 'blind': return applyCond(cb, rng, by, t, 'blinded');
    case 'slow': return applyCond(cb, rng, by, t, 'slowed');
    case 'muddle': return applyCond(cb, rng, by, t, 'ldebuff');
    case 'dread': return applyCond(cb, rng, by, t, 'shaken');
    case 'silence': return applyCond(cb, rng, by, t, 'silenced');
  }
  return '';
}
const around = (k: string, r: number) => { const [x, y] = xy(k), out: string[] = []; for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) out.push((x + i) + ',' + (y + j)); return out; };
export interface EvokePreview { ok: boolean; why?: string; pattern?: Pattern; charge: number; ap: number; targets: string[]; impact?: string | null; range?: number; needsAim: boolean }
export function previewEvoke(cb: Combat, u: Unit, tile: string, aim?: string): EvokePreview {
  const no = (why: string, extra: Partial<EvokePreview> = {}): EvokePreview => ({ ok: false, why, charge: 0, ap: SPELL_AP.evoke, targets: [], needsAim: false, ...extra });
  const e = sigilReady(cb, u); if (e) return no(e);
  const p = findPattern(cb, tile, u.pos); if (typeof p === 'string') return no(p);
  const ge = grammarError(p.words, Math.max(u.mg!.maxWords, p.words.length > u.mg!.maxWords ? 0 : 0) || u.mg!.maxWords); if (ge) return no(ge, { pattern: p });
  if (p.side !== u.side && !p.words.every((w) => u.mg!.words.includes(w))) return no('You can\'t read all of those words.', { pattern: p });
  const touch = p.shape === 'line' ? dist(u.pos, p.near!) <= 1 : p.tiles.some((k) => dist(u.pos, k) <= 1);
  if (!touch) return no(p.shape === 'line' ? 'Stand behind the near end of the line to fire it.' : 'Stand on or next to the pattern.', { pattern: p });
  const charge = evokeCharge(p, u); if (u.mg!.charge < charge) return no('Firing needs ' + charge + ' charge (' + u.mg!.charge + ' left): swap a core.', { pattern: p, charge });
  if (u.ap < SPELL_AP.evoke) return no('Needs 1 AP.', { pattern: p, charge });
  const needsAim = p.shape === 'stack';
  if (p.words.includes('stay')) return { ok: true, pattern: p, charge, ap: SPELL_AP.evoke, targets: [], impact: null, needsAim: false };
  const path = spellPath(cb, u, p, aim);
  if (path.why) return { ok: false, why: path.why, pattern: p, charge, ap: SPELL_AP.evoke, targets: [], needsAim, range: p.words.includes('push') ? PUSH_RANGE + (u.mg!.rangeBonus || 0) : 1 };
  return { ok: true, pattern: p, charge, ap: SPELL_AP.evoke, targets: path.targets.map((t) => t.id), impact: path.impact, needsAim, range: p.shape === 'line' ? (LINE_RANGE[p.tiles.length] || 4) + u.mg!.rangeBonus : undefined };
}
/** Evoke (spec: Sigils, 6): fire the pattern at that tile. */
export function evoke(cb: Combat, rng: Rng, u: Unit, tile: string, aim?: string): string | null {
  const pv = previewEvoke(cb, u, tile, aim); if (!pv.ok) return pv.why || 'Can\'t fire that.';
  const p = pv.pattern!, m = u.mg!, has = (w: string) => p.words.includes(w), name = p.words.map((w) => w.toUpperCase()).join(' · ');
  u.ap -= SPELL_AP.evoke; m.charge -= pv.charge; m.cast = true;
  const subjects = p.words.filter((w) => /^subject/.test(cls(w)));
  const head = u.name + ' evokes ' + name + ' (' + p.shape + (p.shape === 'line' ? ' of ' + p.tiles.length : '') + ', ' + pv.charge + ' charge)';
  // STAY: the pattern stands as a wall (Line), a zone at the centre (Ring) or on the tile (Stack); the glyphs remain.
  if (has('stay')) {
    const tiles = p.shape === 'line' ? p.tiles : p.shape === 'ring' ? [p.centre!] : p.tiles;
    const left = Math.max(...p.glyphs.map((g) => g.left));
    const veil = subjects.includes('veil'), light = subjects.includes('light');
    cb.zones = [...(cb.zones || []), { id: 'z' + (cb.glyphSeq = (cb.glyphSeq || 0) + 1), kind: veil ? 'veil' : light ? 'light' : 'wall', tiles: veil ? tiles.flatMap((k) => around(k, 1)) : light ? tiles.flatMap((k) => around(k, 4)) : tiles, words: subjects, by: u.id, side: u.side, left, mult: 0.5, who: u.name }];
    cb.log.push(head + ': it stands' + (veil ? ' as smoke' : light ? ' as light' : ' as a wall') + ' at ' + tiles.map(refOf).join(', ') + ' for ' + left + ' round' + (left === 1 ? '' : 's') + '.');
    return null;
  }
  const path = spellPath(cb, u, p, aim);
  const formMult = path.cone ? 0.6 : has('spread') ? 0.6 : p.shape === 'ring' ? 0.8 : 1;
  let line = '';
  const hitAll = (targets: Unit[], src: string) => {
    for (const t of targets) {
      if (has('pull')) line += shove(cb, t, p.shape === 'line' ? p.near! : p.centre || p.tiles[0], -3);
      for (const w of subjects) line += subjectEffect(cb, rng, u, t, SIGIL[w], formMult, m.sigilMult, m.elemMult, false, src, { seek: has('seek') });
    }
  };
  // Area words land on the tile even with nobody there.
  if (path.impact && subjects.includes('veil')) { cb.zones = [...(cb.zones || []), { id: 'z' + (cb.glyphSeq = (cb.glyphSeq || 0) + 1), kind: 'veil', tiles: around(path.impact, 1), words: ['veil'], by: u.id, side: u.side, left: 2 + m.durBonus, mult: 1, who: u.name }]; line += ' · smoke-bots fill ' + refOf(path.impact); }
  if (path.impact && subjects.includes('light')) { cb.zones = [...(cb.zones || []), { id: 'z' + (cb.glyphSeq = (cb.glyphSeq || 0) + 1), kind: 'light', tiles: around(path.impact, 4), words: ['light'], by: u.id, side: u.side, left: 99, mult: 1, who: u.name }]; line += ' · light floods around ' + refOf(path.impact); }
  hitAll(path.targets, path.src);
  if (!path.targets.length && !line) line = ' · it strikes ' + (path.impact ? refOf(path.impact) : 'nothing') + ' and finds no one';
  if (has('twice')) {
    const first = path.targets[0], second = cb.units.filter((v) => !v.dead && v.side !== u.side && v !== first && dist(v.pos, path.impact || u.pos) <= 6 && lineOfSight(cb, path.impact || u.pos, v.pos)).sort((a, b) => dist(a.pos, path.impact || u.pos) - dist(b.pos, path.impact || u.pos))[0];
    if (second) { line += ' · TWICE:'; hitAll([second], path.impact || path.src); }
  }
  // The glyphs fade as the spell fires.
  const used = new Set(p.glyphs.map((g) => g.id)); cb.glyphs = (cb.glyphs || []).filter((g) => !used.has(g.id));
  cb.log.push(head + line + '.');
  return null;
}

// ---------- Outbursts ----------
export const stageMult = (stage: number) => 1 + 0.5 * (stage - 1);
export function designCost(m: MagicUnit, d: OutburstDesign, mana: number): number {
  const base = (SCHOOL[d.school]?.base_cost || 20) + (d.school2 ? 20 : 0) + d.modules.reduce((t, x) => t + (MODULE[x]?.cost || 0), 0);
  return Math.max(5, Math.round(base * manaBand(mana).soul_cost_mult * (1 - m.costSave)));
}
export const designAp = (m: MagicUnit, d: OutburstDesign) => Math.max(1, m.soulAp - (d.modules.includes('swift') ? 1 : 0));
export const designRange = (m: MagicUnit, d: OutburstDesign) => (d.modules.includes('move') ? 8 : SOUL_REACH) + m.soulRange;
function addStrain(cb: Combat, rng: Rng, u: Unit, n: number, why: string) {
  const m = u.mg!; m.strain += n;
  if (m.strain > m.strainLimit) manaShort(cb, rng, u);
}
/** The Mana Short (spec: Soul magic, 5): d20 + Will Power vs 10 + 2 × the excess. A natural 1 bursts the heart: Downed,
 * never dead (Leon). A failure hurts and stuns, and anything held releases wild. */
function manaShort(cb: Combat, rng: Rng, u: Unit) {
  const m = u.mg!, over = m.strain - m.strainLimit, r = d20(rng), tn = 10 + 2 * over, tot = r + m.will;
  if (r === 1) {
    u.hp = 0; if (u.side === 'foe') u.dead = true; else u.downed = true;
    cb.log.push('MANA SHORT: ' + u.name + "'s heart bursts (d20 1 vs " + tn + '): ' + (u.side === 'foe' ? 'dead' : 'Downed') + '.');
    m.held = null; return;
  }
  if (r !== 20 && tot < tn) {
    cb.log.push('MANA SHORT: ' + u.name + ' (d20 ' + r + ' → ' + tot + ' vs ' + tn + ')' + harm(cb, rng, null, u, 15 * m.strain, 'true') + ', Stunned.');
    u.stunnedNext = 1;
    if (m.held && !u.dead && !u.downed) wildRelease(cb, rng, u);
  } else cb.log.push(u.name + ' holds the Strain together (d20 ' + r + ' → ' + tot + ' vs ' + tn + ').');
}
function slip(cb: Combat, rng: Rng, u: Unit, dmg: number): string {
  const r = d20(rng), tn = 10 + Math.floor(dmg / 10), tot = r + (u.mg?.will || 0);
  if (r === 20 || (r !== 1 && tot >= tn)) return ' · ' + u.name + ' keeps hold of the Outburst';
  return ' · the Outburst slips' + (wildRelease(cb, rng, u) ? '' : '');
}
function wildRelease(cb: Combat, rng: Rng, u: Unit): boolean {
  const m = u.mg!, d = m.designs.find((x) => x.id === m.held?.design); if (!d) { m.held = null; return false; }
  const near = cb.units.filter((v) => !v.dead && v !== u && dist(v.pos, u.pos) <= designRange(m, d));
  if (!near.length) { cb.log.push(u.name + "'s Outburst bursts into the air."); m.held = null; return true; }
  const t = near[die(rng, near.length) - 1];
  cb.log.push(u.name + "'s Outburst releases wild at " + t.name + '.');
  releaseAt(cb, rng, u, d, t.pos, true);
  return true;
}
export interface OutburstPreview { ok: boolean; why?: string; cost: number; ap: number; range: number; strain: number; stage: number }
export function previewOutburst(cb: Combat, u: Unit, designId: string, aim?: string, release = true): OutburstPreview {
  const m = u.mg, no = (why: string): OutburstPreview => ({ ok: false, why, cost: 0, ap: 0, range: 0, strain: 0, stage: 1 });
  if (!m) return no('You have no Outbursts.');
  const e = canCast(u, cb); if (e) return no(e);
  if (m.held) return no('You are already holding an Outburst: release it first.');
  const d = m.designs.find((x) => x.id === designId); if (!d) return no('No such design.');
  const cost = designCost(m, d, manaOf(cb)), ap = designAp(m, d), range = designRange(m, d);
  const strain = (manaBand(manaOf(cb)).id === 'flooded' ? 2 : 1) + (m.emanator ? 0 : 2);
  if (u.ap < ap) return { ok: false, why: 'Needs ' + ap + ' AP.', cost, ap, range, strain, stage: 1 };
  if (m.emanator && m.mp < cost) return { ok: false, why: 'Needs ' + cost + ' MP (' + m.mp + '): Syphon first.', cost, ap, range, strain, stage: 1 };
  if (release) { const why = aimError(cb, u, d, aim); if (why) return { ok: false, why, cost, ap, range, strain, stage: 1 }; }
  return { ok: true, cost, ap, range, strain, stage: 1 };
}
function aimError(cb: Combat, u: Unit, d: OutburstDesign, aim?: string): string | null {
  if (!aim) return 'Pick a target tile.';
  const r = designRange(u.mg!, d);
  if (dist(u.pos, aim) > r) return 'Out of reach (' + r + ' tiles).';
  if (!d.modules.includes('ether') && !d.modules.includes('teleport') && aim !== u.pos && !lineOfSight(cb, u.pos, aim)) return 'No line of sight.';
  return null;
}
/** Begin an Outburst (spec: Soul magic, 1-2): pay MP, take Strain, hold it, or release it at once (free). */
export function beginOutburst(cb: Combat, rng: Rng, u: Unit, designId: string, aim: string | undefined, hold: boolean): string | null {
  const pv = previewOutburst(cb, u, designId, aim, !hold); if (!pv.ok) return pv.why || 'Can\'t.';
  const m = u.mg!, d = m.designs.find((x) => x.id === designId)!;
  u.ap -= pv.ap; if (m.emanator) m.mp -= pv.cost; m.cast = true;
  shiftMana(cb, -Math.ceil(pv.cost / 10));
  m.held = { design: d.id, stage: 1, cost: pv.cost };
  cb.log.push(u.name + (hold ? ' begins ' + d.name + ' and holds it: the heart glows' : ' lets ' + d.name + ' go') + ' (' + pv.cost + ' MP' + (m.emanator ? '' : ' from the air') + ').');
  addStrain(cb, rng, u, pv.strain, 'cast');
  if (!hold && m.held && !u.dead && !u.downed) releaseAt(cb, rng, u, d, aim!, false);
  return null;
}
/** Release a held Outburst (1 AP). */
export function releaseOutburst(cb: Combat, rng: Rng, u: Unit, aim?: string): string | null {
  const m = u.mg; if (!m || !m.held) return 'Nothing held.';
  const e = canCast(u, cb); if (e) return e;
  const d = m.designs.find((x) => x.id === m.held!.design); if (!d) { m.held = null; return 'That design is gone.'; }
  if (u.ap < SPELL_AP.release) return 'Needs 1 AP.';
  const why = aimError(cb, u, d, aim); if (why) return why;
  u.ap -= SPELL_AP.release; m.cast = true;
  releaseAt(cb, rng, u, d, aim!, false);
  return null;
}
function releaseAt(cb: Combat, rng: Rng, u: Unit, d: OutburstDesign, aim: string, wild: boolean) {
  const m = u.mg!, stage = m.held?.stage || 1, sm = stageMult(stage), has = (x: string) => d.modules.includes(x);
  m.held = null;
  const range = designRange(m, d);
  if (has('random') && !wild) { const pool = cb.units.filter((v) => !v.dead && v !== u && dist(v.pos, u.pos) <= range); if (pool.length) aim = pool[die(rng, pool.length) - 1].pos; }
  const radius = has('rain') ? 2 : 0, size = has('size') ? 1 : 0, area = radius + size;
  let targets = area ? cb.units.filter((v) => !v.dead && dist(v.pos, aim) <= area) : cb.units.filter((v) => !v.dead && v.pos === aim);
  const school = d.school, line: string[] = [];
  const one = (t: Unit, f: number) => {
    if (school === 'damage') {
      const base = (SCHOOL.damage.damage || 25) * m.soulMult * sm * f * (has('rain') ? 0.6 : 1) * (has('at_once') ? 0.5 : 1);
      if (has('inverse') && t.side === u.side) { const s = Math.floor(base); t.shield = Math.max(t.shield || 0, s); line.push(t.name + ' is shielded (' + s + ')'); return; }
      if (!has('at_once')) {
        const r = d20(rng), cover = !has('homing') && coverTileFor(cb, u.pos, t.pos) ? 5 : 0, tot = r + m.will + (has('homing') ? 2 : 0) + condHit(u) - cover;
        if (r === 1 || (r !== 20 && tot < t.def)) { line.push('misses ' + t.name + ' (d20 ' + r + ' → ' + tot + ' vs ' + t.def + ')'); return; }
        line.push('hits ' + t.name + ' (d20 ' + r + (r === 20 ? ', CRITICAL' : '') + ')' + harm(cb, rng, u, t, base * (r === 20 ? 2 : 1), 'soul'));
      } else line.push(harm(cb, rng, u, t, base, 'soul').replace(/^ · /, ''));
    } else if (school === 'buff') {
      const opt = d.option || 'heal';
      if (opt === 'defense') line.push(applyCond(cb, rng, u, t, 'guarded', 2 + (has('time') ? 2 : 0)).replace(/^ · /, ''));
      else if (opt === 'hit') line.push(applyCond(cb, rng, u, t, 'inspired', 2 + (has('time') ? 2 : 0)).replace(/^ · /, ''));
      else line.push(heal(t, 30 * m.healMult * sm * f).replace(/^ · /, ''));
    } else if (school === 'control') {
      const opt = d.option || 'push';
      if (opt === 'push' || opt === 'pull') { const r = d20(rng), ok = r === 20 || (r !== 1 && r + saveOf(t, 'body') >= 12 + m.debuff.body); line.push(ok ? t.name + ' holds its ground (Body save)' : (shove(cb, t, u.pos, opt === 'push' ? 3 : -3).replace(/^ · /, '') || t.name + ' can\'t be moved')); }
      else line.push(applyCond(cb, rng, u, t, opt === 'pinned' ? 'pinned' : 'slowed', 2 + (has('time') ? 2 : 0)).replace(/^ · /, ''));
    } else if (school === 'status') {
      const opt = d.option || 'shaken', id = opt === 'left_brain_debuff' ? 'ldebuff' : opt === 'right_brain_debuff' ? 'rdebuff' : opt;
      line.push(applyCond(cb, rng, u, t, id, 2 + (has('time') ? 2 : 0), has('left') ? 'brain' : has('right') ? 'heart' : undefined).replace(/^ · /, ''));
    }
  };
  for (const t of targets) one(t, 1);
  if (!targets.length) line.push('nobody at ' + refOf(aim));
  if (has('duplicate') || has('bounce')) {
    const t0 = targets[0], next = cb.units.filter((v) => !v.dead && v !== u && v !== t0 && v.side !== u.side && dist(v.pos, aim) <= 3)[0];
    if (next) { line.push(has('duplicate') ? 'a second copy finds ' + next.name : 'it bounces to ' + next.name); one(next, has('bounce') ? 0.5 : 1); }
  }
  const narr = d.modules.filter((x) => ['periodic', 'proximity', 'expire', 'mastery', 'teleport'].includes(x));
  if (narr.length) (cb.notes ||= []).push(u.name + "'s Outburst " + d.name + ' carries ' + narr.join(', ') + ': rule what it does.');
  cb.log.push(u.name + ' releases ' + d.name + (stage > 1 ? ' at stage ' + stage + ' (×' + sm + ')' : '') + (wild ? ' (wild)' : '') + ': ' + line.filter(Boolean).join(' · ') + '.');
}
/** Syphon (1 AP): MP from the air by the band, × the Syphon bonus; the meter drops 2. */
export function syphon(cb: Combat, u: Unit): string | null {
  const m = u.mg; if (!m || !m.emanator) return 'You need an Emanator to Syphon.';
  if (u.ap < SPELL_AP.syphon) return 'Needs 1 AP.'; if (m.mp >= m.mpMax) return 'Your Emanator is full.';
  u.ap -= SPELL_AP.syphon; const gain = Math.round(manaBand(manaOf(cb)).syphon_mp * m.syphon), was = m.mp; m.mp = Math.min(m.mpMax, m.mp + gain);
  shiftMana(cb, -2); cb.log.push(u.name + ' syphons ' + (m.mp - was) + ' MP from the air (' + m.mp + '/' + m.mpMax + ').');
  return null;
}
/** Crystallise (3 AP, the meter at 10+): the meter drops 10 and you make one standard core. */
export function crystallise(cb: Combat, u: Unit): string | null {
  const m = u.mg; if (!m || !m.emanator) return 'You need an Emanator to Crystallise.';
  if (u.ap < SPELL_AP.crystallise) return 'Needs 3 AP.'; if (manaOf(cb) < 10) return 'The air is too thin (mana ' + manaOf(cb) + ', needs 10).';
  u.ap -= SPELL_AP.crystallise; m.coresMade++; shiftMana(cb, -10); cb.log.push(u.name + ' crystallises a mana core from the air.');
  return null;
}
/** Enemies scuff a player's glyph they stand on (spec: Sigils, 4). */
export function enemyScuff(cb: Combat, u: Unit): boolean {
  if (u.ap < SPELL_AP.scuff || !(cb.glyphs || []).some((g) => g.pos === u.pos && g.side !== u.side)) return false;
  return !scuff(cb, u);
}
export const glyphsAt = (cb: Combat, k: string) => (cb.glyphs || []).filter((g) => g.pos === k);
/** Who a spell would affect, hit or miss (used to decide whether a spell on the story map starts a fight). */
export function spellTargets(cb: Combat, u: Unit, act: string, tile?: string, aim?: string, designId?: string): string[] {
  if (act === 'evoke') return tile ? previewEvoke(cb, u, tile, aim).targets : [];
  const m = u.mg; if (!m || !aim) return [];
  const d = m.designs.find((x) => x.id === (act === 'release' ? m.held?.design : designId)); if (!d) return [];
  const area = (d.modules.includes('rain') ? 2 : 0) + (d.modules.includes('size') ? 1 : 0);
  return cb.units.filter((v) => !v.dead && (area ? dist(v.pos, aim) <= area : v.pos === aim)).map((v) => v.id);
}
