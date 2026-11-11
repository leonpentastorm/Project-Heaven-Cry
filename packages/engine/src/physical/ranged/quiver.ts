// Physical 2.0, ranged: the quiver (Leon: a quiver gets its own loading menu, and a bow can't be reloaded in a fight).
// Rules 1.12, Weapons point 10: a Drawn weapon has a quiver, filled out of a fight from the arrows you carry, in any mix
// of types up to the weapon's capacity. Each shot names its arrow type. A quiver can't be refilled in a fight.
//
// The character side is c.phys.quiver[weaponId] (a count per arrow type: loadQuiver below, run by the phys/quiver
// action). The unit's copy for the fight is u.quiver, built when the fight starts (combat_start) or, for a unit that
// joins later or draws a bow mid-fight, the first time it shoots. u.ammo is always the quiver's total, so the engine's
// round counting (resolveAttack, spendRounds, the gates for rounds and the last round) needs nothing new. Between
// shots u.ammoType is the arrow on the string: the type with the most left, the default for a shot that names none.
// The type's rider (rules.json ammo_types) applies to the shot through the engine's own ammo code.
import type { Character, PackItem } from '../../character';
import { packOf, loadedOf, roundsOf } from '../../character';
import { packAdd } from '../../containers';
import { WEAPON } from '../../data';
import { AMMO_TYPES, ammoId } from '../../tactics';
import { type Combat, type Unit, isMelee, reloadRefuser } from '../../combat';
import { charOfUnit } from '../../effects/hooks';
import { physOf, ensurePhys, weaponProps } from '../data';
import { onHook, strikeRound, strikingWith, techState, techStateOf } from './shared';
import type { Tech } from './shared';

type Loader = (c: Character, weaponId: string, load: Record<string, number>) => string | null;
let LOADER: Loader | null = null;
/** The ranged lane registers its loadQuiver here; the phys/quiver action runs it. */
export const quiverLoader = (f: Loader) => { LOADER = f; };
export const loadQuiverWith = (c: Character, weaponId: string, load: Record<string, number>): string | null => (LOADER ? LOADER(c, weaponId, load) : 'Quivers aren\'t in the game yet.');

// ---------- arrows ----------
export type Quiver = Record<string, number>;
/** The arrow types, in the order a tie is broken: standard first, then rules.json ammo_types. */
const ORDER = ['standard', ...Object.keys(AMMO_TYPES).filter((k) => k !== 'standard')];
const NAME: Record<string, string> = { standard: 'standard', armor_piercing: 'armour-piercing', hollow_point: 'hollow-point', incendiary: 'incendiary', enhanced: 'enhanced' };
/** An arrow type's name in a sentence ("armour-piercing"). */
export const arrowName = (type: string) => NAME[type] || type.replace(/_/g, '-');
/** An arrow type id from what a player or a menu sends ('ap', 'armour_piercing', 'standard'…); null if there is none. */
export const arrowId = (x: string | null | undefined): string | null => { const t = ammoId(x || null); return !t ? null : t === 'standard' || AMMO_TYPES[t] ? t : null; };
/** Does this weapon have a quiver (the Drawn property)? Crossbows are not Drawn: they keep their reload. */
export const isDrawn = (weaponId: string | null | undefined) => !!weaponId && weaponProps(weaponId).includes('drawn');
/** The quiver's capacity: the weapon's magazine (20 for both bows in the data). */
export const quiverCap = (weaponId: string) => WEAPON[weaponId]?.magazine ?? 0;
export const quiverTotal = (q: Quiver | null | undefined) => Object.values(q || {}).reduce((t, n) => t + Math.max(0, n || 0), 0);
/** The type with the most left (ties: standard, then the ammo_types order). With none left: standard. */
export function defaultArrow(q: Quiver | null | undefined): string {
  let best = 'standard', n = 0;
  for (const k of [...ORDER, ...Object.keys(q || {}).filter((x) => !ORDER.includes(x))]) if ((q?.[k] || 0) > n) { best = k; n = q![k]; }
  return best;
}
/** A copy with no empty or unknown entries. */
const clean = (q: Quiver): Quiver => { const o: Quiver = {}; for (const [k, n] of Object.entries(q || {})) { const t = arrowId(k); if (t && n > 0) o[t] = (o[t] || 0) + Math.floor(n); } return o; };
/** Bring a quiver to n arrows: too many come off the type with the most left, one at a time; too few are standard. */
function toCount(q0: Quiver, n: number): Quiver {
  const q = clean(q0); let have = quiverTotal(q);
  while (have > n) { const k = defaultArrow(q); q[k]--; if (!q[k]) delete q[k]; have--; }
  if (have < n) q.standard = (q.standard || 0) + (n - have);
  return q;
}
const asType = (k: string) => (k === 'standard' ? null : k);

// ---------- the unit's quiver ----------
/** Technique state on the unit: w, the weapon u.quiver belongs to; by, the quivers of bows it has put away. */
const QS = '_quiver';
/** The quiver the unit's held weapon has now, without writing anything (the preview, the screen). Null: not Drawn. */
export function quiverView(u: Unit): Quiver | null {
  if (!isDrawn(u.weapon) || u.infiniteAmmo) return null;
  const st = techStateOf(u, QS);
  let q: Quiver | undefined;
  if (u.quiver && (!st.w || st.w === u.weapon)) q = u.quiver;
  else if (st.by?.[u.weapon]) q = st.by[u.weapon];
  else {
    const c = u.companion ? null : charOfUnit(u), rec = c ? physOf(c).quiver[u.weapon] : undefined;
    q = rec ? { ...rec } : { [arrowId(u.ammoType) || 'standard']: u.ammo }; // no load set yet: what is in the weapon
  }
  return quiverTotal(q) === u.ammo ? clean(q || {}) : toCount(q || {}, Math.max(0, u.ammo));
}
/** The same, written onto the unit (u.quiver) so a shot can draw from it. */
export function ensureQuiver(u: Unit): Quiver | null {
  const q = quiverView(u); if (!q) return null;
  const st = techState(u, QS);
  if (u.quiver && st.w && st.w !== u.weapon) (st.by ||= {})[st.w] = u.quiver; // a bow put away keeps its arrows
  if (st.by) delete st.by[u.weapon];
  st.w = u.weapon; u.quiver = q;
  return q;
}
/** Put the arrow on the string: the default type for the next shot. */
const nock = (u: Unit | null | undefined) => { if (u?.quiver && isDrawn(u.weapon) && techStateOf(u, QS).w === u.weapon) u.ammoType = asType(defaultArrow(u.quiver)); };
/** Take n arrows: the type asked for first, then the type with the most left. */
function draw(u: Unit, n: number, want: string | null) {
  const q = u.quiver; if (!q) return;
  for (let i = 0; i < n && quiverTotal(q) > 0; i++) { const k = want && (q[want] || 0) > 0 ? want : defaultArrow(q); q[k]--; if (!q[k]) delete q[k]; }
}
/** The quiver at the start of a fight: a character's load (its count is what the bow holds, c.loaded: it travels with
 * the weapon), or what the bow holds before any load was set; an enemy archer's standard arrows at capacity. */
export function armQuiver(u: Unit): void {
  if (!isDrawn(u.weapon) || u.infiniteAmmo) return;
  if (!u.charId) { u.ammo = quiverCap(u.weapon); u.quiver = { standard: u.ammo }; techState(u, QS).w = u.weapon; nock(u); return; }
  ensureQuiver(u); nock(u);
}
onHook('combat_start', (ctx: any) => { for (const u of (ctx.cb as Combat).units) armQuiver(u); });

// ---------- shots ----------
// A technique's strike (core strikeRound): the arrow it names (args.ammo) goes on the string for that shot, the preview
// included (so the card shows its rider); a type with none left is refused, unless an earlier shot of the same use
// emptied it (a volley then goes on with the type with the most left). Afterwards the arrow on the string is the
// default again.
const FAIL = new Map<Unit, string>();
const WRAPPED = new Set<Unit>();
const SHOT = new WeakSet<Tech>();
const NOTED = new WeakSet<Tech>();
strikeRound({
  pick(t) {
    const u = t.u; if (t.def.system !== 'ranged' || !isDrawn(u.weapon) || u.infiniteAmmo) return null;
    const q = t.preview ? quiverView(u) : ensureQuiver(u); if (!q) return null;
    const want = arrowId(t.args.ammo);
    let type = defaultArrow(q), fail: string | null = null;
    if (t.args.ammo && !want) fail = 'No such arrow.';
    else if (want && (q[want] || 0) > 0) type = want;
    else if (want && !SHOT.has(t)) fail = 'No ' + arrowName(want) + ' arrows left in the quiver.';
    WRAPPED.add(u); if (fail) FAIL.set(u, fail);
    if (!fail && quiverTotal(q) > 0 && !NOTED.has(t)) { NOTED.add(t); t.note('Arrow: ' + arrowName(type) + ' (' + (q[type] || 0) + ' in the quiver).'); }
    return { type: asType(type) };
  },
  done(t) {
    const u = t.u; FAIL.delete(u); WRAPPED.delete(u);
    if (!t.preview) { SHOT.add(t); nock(u); }
  },
  // Rounds a technique burns beyond its roll (Suppress's 3): arrows of the type it names, then the type with the most left.
  spent(t, n) { if (t.hand === 'main' && t.u.quiver && isDrawn(t.u.weapon) && techStateOf(t.u, QS).w === t.u.weapon) { draw(t.u, n, arrowId(t.args.ammo)); if (!WRAPPED.has(t.u)) nock(t.u); } },
});
// Every ranged attack with a Drawn weapon: a named arrow with none left, or an empty quiver, can't be loosed.
onHook('attack_preview', (ctx: any) => {
  const u: Unit = ctx.att; if (!u || ctx.melee || !isDrawn(u.weapon) || u.infiniteAmmo) return;
  const f = FAIL.get(u); if (f) { ctx.fail ||= f; return; }
  const q = quiverView(u); if (q && !quiverTotal(q)) { ctx.fail ||= 'The quiver is empty.'; return; }
  // canStrike (a Watch's test) has no wrap: it asks the same of the arrow its technique names
  const t = WRAPPED.has(u) ? null : strikingWith(u);
  if (t?.args.ammo) { const want = arrowId(t.args.ammo); if (!want) ctx.fail ||= 'No such arrow.'; else if (!(q?.[want] || 0)) ctx.fail ||= 'No ' + arrowName(want) + ' arrows left in the quiver.'; }
});
// A plain attack (the Attack button, the enemy's plain shot, the old Overwatch) looses the arrow on the string.
onHook('attack_target', (ctx: any) => { const u: Unit = ctx.att; if (u && !WRAPPED.has(u) && ensureQuiver(u)) nock(u); });
// The arrow leaves the quiver as the engine counts the round (resolveAttack takes 1 from u.ammo right after this hook).
onHook('attack_roll', (ctx: any) => {
  const u: Unit = ctx.att, w = u && WEAPON[u.weapon]; if (!w || ctx.mode === 'melee' || isMelee(w) || !isDrawn(u.weapon) || u.infiniteAmmo) return;
  if (!ensureQuiver(u)) return;
  draw(u, 1, arrowId(u.ammoType) || 'standard');
});
onHook('on_hit', (ctx: any) => { if (ctx.att && !WRAPPED.has(ctx.att)) nock(ctx.att); });
onHook('on_miss', (ctx: any) => { if (ctx.att && !WRAPPED.has(ctx.att)) nock(ctx.att); });

// ---------- no plain reload: in a fight none, out of one only through the quiver menu ----------
// The engine's reload() and reloadHands() ask (combat.ts reloadRefuser), so every path is refused: the Reload action,
// the area map's reload, Running Reload, Between Heartbeats and Resupply (review fix: only the action was). Out of a
// fight the plain reload would top the bow up with untyped arrows and lose the quiver's types, so it goes to the menu.
reloadRefuser((u, weaponId, cb) => {
  if (!isDrawn(weaponId) || u.infiniteAmmo) return null;
  return cb?.overworld ? 'Fill the quiver from the quiver menu.' : cb ? 'A quiver is filled before the fight.' : 'A quiver is filled from its own menu, out of a fight.';
});

// ---------- after the fight ----------
// The quiver is written back to the character (c.loaded is already the unit's u.ammo, its total).
onHook('combat_end', (ctx: any) => {
  const g = ctx.g, cb: Combat = ctx.cb; if (!g || !cb) return;
  for (const u of cb.units) {
    const c: Character | undefined = u.charId ? g.characters?.[u.charId] : undefined; if (!c) continue;
    const st = techStateOf(u, QS); if (!st.w && !st.by) continue;
    const p = ensurePhys(c);
    for (const [w, q] of Object.entries((st.by || {}) as Record<string, Quiver>)) p.quiver[w] = clean(q);
    if (st.w && u.quiver) { p.quiver[st.w] = clean(u.quiver); if (c.weapon === st.w) { c.loaded = quiverTotal(u.quiver); c.loadedType = null; } }
  }
});

// ---------- loading (out of a fight) ----------
const arrowsOf = (it: PackItem, cal: string) => !!it.calibre && it.calibre === cal && !it.mags && it.qty > 0;
const typeOf = (it: PackItem) => arrowId(it.ammoType) || 'standard';
/** Fill a Drawn weapon's quiver from the arrows the character carries (the phys/quiver action, out of a fight). The
 * load is a count per arrow type; what the quiver held goes back to the pack first, so an empty load unloads it.
 * A refusal in plain words, or null. */
export function loadQuiver(c: Character, weaponId: string, load: Record<string, number>): string | null {
  const w = WEAPON[weaponId]; if (!w) return 'No such weapon.';
  const name = w.name.toLowerCase();
  if (!isDrawn(weaponId)) return 'The ' + name + ' has no quiver: it loads as it always has.';
  const pack = packOf(c).map((x) => ({ ...x })), held = c.weapon === weaponId, stowed = held ? -1 : pack.findIndex((x) => x.kind === 'weapon' && x.weapon === weaponId);
  if (!held && stowed < 0) return 'You don\'t carry a ' + name + '.';
  const want: Quiver = {};
  for (const [k, n] of Object.entries(load || {})) {
    const t = arrowId(k); if (!t) return 'No such arrow: ' + String(k).replace(/_/g, ' ') + '.';
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 0) return 'Count arrows in whole numbers.';
    if (n) want[t] = (want[t] || 0) + n;
  }
  const cap = quiverCap(weaponId); if (quiverTotal(want) > cap) return 'The ' + name + '\'s quiver holds ' + cap + ' arrows.';
  // What is in it now: the load set before, to the count the weapon holds (before any load: the rounds loaded in it).
  const now = held ? Math.min(cap, loadedOf(c)) : Math.min(cap, pack[stowed].loaded ?? 0), rec = physOf(c).quiver[weaponId];
  const prev = toCount(rec ? { ...rec } : { [arrowId(held ? c.loadedType : pack[stowed].ammoType) || 'standard']: now }, now);
  const cal = w.ammo || 'arrow';
  for (const [t, n] of Object.entries(want)) {
    const have = pack.filter((x) => arrowsOf(x, cal) && typeOf(x) === t).reduce((s, x) => s + x.qty, 0) + (prev[t] || 0);
    if (have < n) return 'You carry only ' + have + ' ' + arrowName(t) + (have === 1 ? ' arrow.' : ' arrows.');
  }
  // the old load back into the pack, then the new one out of it
  for (const [t, n] of Object.entries(prev)) if (n > 0) packAdd(pack, { ...roundsOf(cal, n), ...(t !== 'standard' ? { ammoType: t } : {}) });
  for (const [t, n0] of Object.entries(want)) {
    let n = n0;
    for (const x of pack) { if (!n) break; if (!arrowsOf(x, cal) || typeOf(x) !== t) continue; const k = Math.min(n, x.qty); x.qty -= k; n -= k; }
  }
  const total = quiverTotal(want);
  if (held) { c.loaded = total; c.loadedType = null; }
  else { const e = pack[stowed]; if (total) e.loaded = total; else delete e.loaded; delete e.ammoType; }
  c.pack = pack.filter((x) => x.qty > 0 || x.mags);
  ensurePhys(c).quiver[weaponId] = want;
  return null;
}
quiverLoader(loadQuiver);
