// Physical 2.0, ranged: the quiver (Leon: a quiver gets its own loading menu, and a bow can't be reloaded in a fight).
// Rules 1.12, Weapons point 10: a Drawn weapon shoots from a quiver, filled out of a fight from the arrows you carry, in
// any mix of types up to what it holds. Each shot names its arrow type. A quiver can't be refilled in a fight.
// Rules 1.53 (Leon, 14 Nov 2026): a quiver is graded gear the character carries (character.ts QuiverInst, quiversOf):
// every archer may carry two, one worn and one ready. Loosing an arrow draws it from the worn quiver as part of the shot
// (there is no "Nock an arrow": that was the bow's reload, dead since the quiver could not be refilled in a fight).
// "Switch quiver" is a Drawn weapon's reload (the reload's price, combat.ts reloadWay), and it makes the ready quiver the
// worn one. A quiver's grade gives arrows held and nothing else; its one enchantment (an items.json mod, mod_slot
// `enchantment`) rides every arrow drawn from it: an Outburst tone's riders at the enchantment's stage
// (magic.ts applyToneRiders, the same rider Storm Hand's Infusion puts on a weapon hit), at its damage_mult.
//
// The unit's copy for the fight: u.quiver (the worn quiver's arrows), u.quiverGear (its item, grade and enchantment) and
// u.quiverReady (the ready quiver, arrows and all), built when the fight starts (combat_start) or, for a unit that joins
// later, the first time it shoots. While a Drawn weapon is held u.ammo is the worn quiver's total, so the engine's round
// counting (resolveAttack, spendRounds, the gates for rounds and the last round) needs nothing new. Between shots
// u.ammoType is the arrow taken next: the type with the most left, the default for a shot that names none.
import type { Character, PackItem, QuiverInst } from '../../character';
import { packOf, roundsOf, quiversOf, setQuivers, quiverHolds, QUIVER_ITEM } from '../../character';
import { packAdd } from '../../containers';
import { WEAPON, ITEM } from '../../data';
import { AMMO_TYPES, ammoId } from '../../tactics';
import { type Combat, type Unit, isMelee, reloadRefuser, reloadWay, emitFx, say } from '../../combat';
import { pay } from '../../effects/cost';
import { charOfUnit } from '../../effects/hooks';
import { applyToneRiders, toneRiders, toneElement, withElement } from '../../magic';
import { weaponProps } from '../data';
import { onHook, strikeRound, strikingWith, techState, techStateOf } from './shared';
import type { Tech } from './shared';

type Loader = (c: Character, weaponId: string, load: Record<string, number>, which?: number) => string | null;
let LOADER: Loader | null = null;
/** The ranged lane registers its loadQuiver here; the phys/quiver action runs it. */
export const quiverLoader = (f: Loader) => { LOADER = f; };
export const loadQuiverWith = (c: Character, weaponId: string, load: Record<string, number>, which?: number): string | null => (LOADER ? LOADER(c, weaponId, load, which) : 'Quivers aren\'t in the game yet.');

// ---------- arrows ----------
export type Quiver = Record<string, number>;
/** The arrow types, in the order a tie is broken: standard first, then rules.json ammo_types. */
const ORDER = ['standard', ...Object.keys(AMMO_TYPES).filter((k) => k !== 'standard')];
const NAME: Record<string, string> = { standard: 'standard', armor_piercing: 'armour-piercing', hollow_point: 'hollow-point', incendiary: 'incendiary', enhanced: 'enhanced' };
/** An arrow type's name in a sentence ("armour-piercing"). */
export const arrowName = (type: string) => NAME[type] || type.replace(/_/g, '-');
/** An arrow type id from what a player or a menu sends ('ap', 'armour_piercing', 'standard'…); null if there is none. */
export const arrowId = (x: string | null | undefined): string | null => { const t = ammoId(x || null); return !t ? null : t === 'standard' || AMMO_TYPES[t] ? t : null; };
/** Does this weapon shoot from a quiver (the Drawn property)? Crossbows are not Drawn: they keep their reload. */
export const isDrawn = (weaponId: string | null | undefined) => !!weaponId && weaponProps(weaponId).includes('drawn');
/** What the unit's worn quiver holds (rules 1.53: its grade's arrows, items.json quiver.arrows); an enemy's is Standard. */
export const quiverCap = (u?: Unit | null) => quiverHolds(u?.quiverGear?.id || QUIVER_ITEM, u?.quiverGear?.rarity || 'standard');
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

// ---------- enchantments ----------
/** An enchantment (items.json, mod_slot `enchantment`): the tone whose riders it puts on each arrow, at which stage, and
 * the damage the arrow keeps (its price for the rider, as an incendiary round's ×0.9). */
export interface Enchantment { id: string; name: string; tone: string; stage: number; damage_mult: number }
export const enchantmentOf = (mods: string[] | null | undefined): Enchantment | null => {
  for (const m of mods || []) { const it: any = ITEM[m]; if (it?.mod_slot === 'enchantment' && it.tone) return { id: it.id, name: it.name, tone: it.tone, stage: Number(it.stage ?? 1), damage_mult: Number(it.damage_mult ?? 1) }; }
  return null;
};
/** The riders an enchanted arrow carries after its hit (the ones a tone puts on damage itself are the damage's: skipped). */
const SKIP = ['armour_full', 'bonus_damage', 'ignore_cover', 'chain'];
/** The element an enchantment's hit looks like on screen (the tone's element: fire, shock, freeze, stone, gale, acid). */
export const enchantElement = (e: Enchantment | null) => (e ? toneElement(e.tone) : null);
/** The enchantment on the arrows this unit looses now (its worn quiver's), or null: a Drawn weapon held, a quiver armed. */
const enchanted = (u: Unit | null | undefined): Enchantment | null => (u && isDrawn(u.weapon) && !u.infiniteAmmo && u.quiver ? enchantmentOf(u.quiverGear?.mods) : null);

// ---------- the unit's quivers ----------
/** Technique state on the unit: w, the Drawn weapon u.ammo was last made equal to the quiver for; armed, the quivers
 * are on the unit. */
const QS = '_quiver';
/** The character's quivers as the fight starts (a copy), or one Standard quiver at capacity (an enemy, a companion). */
function quiversFor(u: Unit): QuiverInst[] {
  const c = u.companion ? null : charOfUnit(u);
  if (!c) return [{ id: QUIVER_ITEM, arrows: { standard: quiverHolds() } }];
  return quiversOf(c).map((q) => ({ ...q, arrows: clean(q.arrows || {}) }));
}
const gearOf = (q: QuiverInst | undefined) => { if (!q) return { id: QUIVER_ITEM }; const { arrows: _a, ...g } = q; void _a; return g; };
/** Put the quivers on the unit (the fight's start, or the first shot of a unit that joined later). */
function arm(u: Unit) {
  const qs = quiversFor(u), st = techState(u, QS);
  u.quiver = qs[0] ? clean(qs[0].arrows) : {}; u.quiverGear = gearOf(qs[0]); u.quiverReady = qs[1] ? { ...qs[1], arrows: clean(qs[1].arrows) } : null;
  st.armed = true; delete st.w;
}
/** The worn quiver of the unit's held weapon now, without writing anything (the preview, the screen). Null: not Drawn. */
export function quiverView(u: Unit): Quiver | null {
  if (!isDrawn(u.weapon) || u.infiniteAmmo) return null;
  const st = techStateOf(u, QS);
  if (!st.armed || !u.quiver) { const q = quiversFor(u)[0]; return q ? clean(q.arrows) : {}; }
  if (st.w !== u.weapon) return clean(u.quiver); // a bow just drawn: the quiver is what it holds
  return quiverTotal(u.quiver) === u.ammo ? clean(u.quiver) : toCount(u.quiver, Math.max(0, u.ammo));
}
/** The same, written onto the unit so a shot can draw from it: u.ammo follows the quiver when a Drawn weapon has just
 * come into the hand, and the quiver follows u.ammo after that (the engine counts rounds on u.ammo). */
export function ensureQuiver(u: Unit): Quiver | null {
  if (!isDrawn(u.weapon) || u.infiniteAmmo) return null;
  const st = techState(u, QS);
  if (!st.armed || !u.quiver) arm(u);
  if (st.w !== u.weapon) { st.w = u.weapon; u.quiver = clean(u.quiver!); u.ammo = quiverTotal(u.quiver); return u.quiver; }
  u.quiver = quiverTotal(u.quiver) === u.ammo ? clean(u.quiver!) : toCount(u.quiver!, Math.max(0, u.ammo));
  return u.quiver;
}
/** Take the next arrow: the default type for the next shot. */
const nock = (u: Unit | null | undefined) => { if (u?.quiver && isDrawn(u.weapon) && techStateOf(u, QS).w === u.weapon) u.ammoType = asType(defaultArrow(u.quiver)); };
/** Take n arrows: the type asked for first, then the type with the most left. */
function draw(u: Unit, n: number, want: string | null) {
  const q = u.quiver; if (!q) return;
  for (let i = 0; i < n && quiverTotal(q) > 0; i++) { const k = want && (q[want] || 0) > 0 ? want : defaultArrow(q); q[k]--; if (!q[k]) delete q[k]; }
}
/** The quivers at the start of a fight: a character's (character.ts quiversOf); an enemy archer's, one Standard quiver
 * of standard arrows at capacity. */
export function armQuiver(u: Unit): void {
  if (u.infiniteAmmo) return;
  if (!isDrawn(u.weapon) && !(u.charId && !u.companion && quiversOf(charOfUnit(u)!).length)) return;
  arm(u); if (isDrawn(u.weapon)) { ensureQuiver(u); nock(u); }
}
onHook('combat_start', (ctx: any) => { for (const u of (ctx.cb as Combat).units) armQuiver(u); });

// ---------- Switch quiver: a Drawn weapon's reload (rules 1.53) ----------
const quiverWord = (g: { name?: string; mods?: string[] } | null | undefined, n: number) => { const e = enchantmentOf(g?.mods); return n + (n === 1 ? ' arrow' : ' arrows') + (e ? ', ' + e.name.toLowerCase() : ''); };
reloadWay((u) => {
  if (!isDrawn(u.weapon) || u.infiniteAmmo) return null;
  const ready = u.quiverReady ?? (techStateOf(u, QS).armed ? null : quiversFor(u)[1] || null), worn = quiverView(u);
  if (!ready) return { offered: false, label: 'Switch quiver', text: '', why: 'You carry one quiver: it is filled before the fight.' };
  const n = quiverTotal(ready.arrows), left = quiverTotal(worn);
  return {
    offered: true, label: 'Switch quiver',
    text: 'Put the worn quiver away and wear the other: ' + quiverWord(ready, n) + '. A quiver is never refilled in a fight.' + (!left && n ? ' Your quiver is empty: the other holds ' + n + '.' : ''),
    why: !n ? 'The other quiver is empty.' : null,
    run: (cb: Combat, x: Unit, ap: number) => {
      ensureQuiver(x); if (!x.quiverReady) arm(x);
      const r = x.quiverReady!, now = { ...(x.quiverGear || { id: QUIVER_ITEM }), arrows: clean(x.quiver || {}) } as QuiverInst;
      if (!quiverTotal(r.arrows)) return 'The other quiver is empty.';
      pay(cb, x, ap);
      x.quiver = clean(r.arrows); x.quiverGear = gearOf(r); x.quiverReady = now;
      x.ammo = quiverTotal(x.quiver); techState(x, QS).w = x.weapon; nock(x);
      emitFx(cb, 'reload', { unit: x.id, at: x.pos, weapon: x.weapon, cat: WEAPON[x.weapon]?.category, how: 'quiver', dur: 1000, left: quiverTotal(now.arrows), ammo: x.ammo, cap: quiverCap(x), ...(enchantElement(enchanted(x)) ? { element: enchantElement(enchanted(x)) } : {}) });
      say(cb, x.name + ' switches quiver: ' + quiverWord(x.quiverGear, x.ammo) + ' (the other keeps ' + quiverTotal(now.arrows) + ').');
      return null;
    },
  };
});

// ---------- shots ----------
// A technique's strike (core strikeRound): the arrow it names (args.ammo) is taken for that shot, the preview included
// (so the card shows its rider); a type with none left is refused, unless an earlier shot of the same use emptied it (a
// volley then goes on with the type with the most left). Afterwards the next arrow is the default again.
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
    if (!fail && quiverTotal(q) > 0 && !NOTED.has(t)) { NOTED.add(t); const e = enchanted(u) || (!techStateOf(u, QS).armed ? enchantmentOf(quiversFor(u)[0]?.mods) : null); t.note('Arrow: ' + arrowName(type) + ' (' + (q[type] || 0) + ' in the quiver)' + (e ? ', ' + e.name.toLowerCase() : '') + '.'); }
    return { type: asType(type) };
  },
  done(t) {
    const u = t.u; FAIL.delete(u); WRAPPED.delete(u);
    if (!t.preview) { SHOT.add(t); nock(u); }
  },
  // Rounds a technique burns beyond its roll (Suppress's 3): arrows of the type it names, then the type with the most left.
  spent(t, n) { if (t.hand === 'main' && t.u.quiver && isDrawn(t.u.weapon) && techStateOf(t.u, QS).w === t.u.weapon) { draw(t.u, n, arrowId(t.args.ammo)); if (!WRAPPED.has(t.u)) nock(t.u); } },
});
/** The refusal for an empty worn quiver, naming the ready one when it holds arrows (rules 1.53). */
const emptyWhy = (u: Unit) => { const n = quiverTotal(u.quiverReady?.arrows); return n ? 'The quiver is empty: Switch quiver (' + n + ' in the other).' : 'The quiver is empty.'; };
// Every ranged attack with a Drawn weapon: a named arrow with none left, or an empty quiver, can't be loosed. A storm
// enchantment's arrow ignores half cover (the tone's ignore_cover rider, read before the roll).
onHook('attack_preview', (ctx: any) => {
  const u: Unit = ctx.att; if (!u || ctx.melee || ctx.mode === 'thrown' || !isDrawn(u.weapon) || u.infiniteAmmo) return;
  const f = FAIL.get(u); if (f) { ctx.fail ||= f; return; }
  const q = quiverView(u); if (q && !quiverTotal(q)) { ctx.fail ||= emptyWhy(u); return; }
  const e = enchanted(u); if (e && toneRiders(e.tone, e.stage).riders.some((r) => r.rider === 'ignore_cover')) ctx.ignoreCover = true;
  // canStrike (a Watch's test) has no wrap: it asks the same of the arrow its technique names
  const t = WRAPPED.has(u) ? null : strikingWith(u);
  if (t?.args.ammo) { const want = arrowId(t.args.ammo); if (!want) ctx.fail ||= 'No such arrow.'; else if (!(q?.[want] || 0)) ctx.fail ||= 'No ' + arrowName(want) + ' arrows left in the quiver.'; }
});
// A plain attack (the Attack button, the enemy's plain shot, the old Overwatch) looses the next arrow.
onHook('attack_target', (ctx: any) => { const u: Unit = ctx.att; if (u && !WRAPPED.has(u) && ensureQuiver(u)) nock(u); });
// The arrow leaves the quiver as the engine counts the round (resolveAttack takes 1 from u.ammo right after this hook);
// an enchanted arrow's shot carries its element for the screen.
onHook('attack_roll', (ctx: any) => {
  const u: Unit = ctx.att, w = u && WEAPON[u.weapon]; if (!w || ctx.mode === 'melee' || ctx.mode === 'thrown' || isMelee(w) || !isDrawn(u.weapon) || u.infiniteAmmo) return;
  if (!ensureQuiver(u)) return;
  draw(u, 1, arrowId(u.ammoType) || 'standard');
  const el = enchantElement(enchanted(u)); if (el) ctx.fx = { ...(ctx.fx || {}), element: el };
});
// An enchanted arrow deals its damage_mult (the price of the rider, as an incendiary round's).
onHook('damage_out', (ctx: any) => {
  if (ctx.melee || ctx.mode === 'thrown' || ctx.src?.weapon !== ctx.att?.weapon) return;
  const e = enchanted(ctx.att); if (e && e.damage_mult !== 1) ctx.mults.push({ v: e.damage_mult, label: e.name.toLowerCase() });
});
onHook('on_hit', (ctx: any) => {
  const u: Unit = ctx.att;
  if (u && !ctx.melee && ctx.mode !== 'thrown' && ctx.tgt && !ctx.tgt.dead && ctx.tgt.side !== u.side) {
    const e = enchanted(u);
    if (e) { const s = withElement(toneElement(e.tone), () => applyToneRiders(ctx.cb, ctx.rng, u, ctx.tgt, e.tone, e.stage, u.pos, SKIP)).replace(/^ · /, ''); if (s) say(ctx.cb, '  ' + e.name + ': ' + s); }
  }
  if (u && !WRAPPED.has(u)) nock(u);
});
onHook('on_miss', (ctx: any) => { if (ctx.att && !WRAPPED.has(ctx.att)) nock(ctx.att); });

// ---------- out of a fight: the quiver menu fills a quiver; the plain reload is refused ----------
// Out of a fight the plain reload would top the bow up with untyped arrows and lose the quiver's types, so it goes to
// the menu. In a fight a Drawn weapon's reload is Switch quiver (above).
reloadRefuser((u, weaponId, cb) => {
  if (!isDrawn(weaponId) || u.infiniteAmmo) return null;
  return cb?.overworld ? 'Fill the quiver from the quiver menu.' : cb ? null : 'A quiver is filled from its own menu, out of a fight.';
});

// ---------- after the fight ----------
// The quivers are written back to the character (setQuivers keeps the held bow's loaded count equal to the worn one).
onHook('combat_end', (ctx: any) => {
  const g = ctx.g, cb: Combat = ctx.cb; if (!g || !cb) return;
  for (const u of cb.units) {
    const c: Character | undefined = u.charId && !u.companion ? g.characters?.[u.charId] : undefined; if (!c) continue;
    if (!techStateOf(u, QS).armed || !u.quiver) continue;
    const list: QuiverInst[] = [{ ...(u.quiverGear || { id: QUIVER_ITEM }), arrows: clean(u.quiver) } as QuiverInst, ...(u.quiverReady ? [{ ...u.quiverReady, arrows: clean(u.quiverReady.arrows) }] : [])];
    setQuivers(c, list);
  }
});

// ---------- loading (out of a fight) ----------
const arrowsOf = (it: PackItem, cal: string) => !!it.calibre && it.calibre === cal && !it.mags && it.qty > 0;
const typeOf = (it: PackItem) => arrowId(it.ammoType) || 'standard';
/** Fill a carried quiver (which: 0 the worn one, 1 the ready one) from the arrows the character carries (the phys/quiver
 * action, out of a fight). `weaponId` names the Drawn weapon the arrows are for (one you carry). The load is a count per
 * arrow type; what the quiver held goes back to the pack first, so an empty load unloads it. A refusal in plain words,
 * or null. */
export function loadQuiver(c: Character, weaponId: string, load: Record<string, number>, which = 0): string | null {
  const w = WEAPON[weaponId]; if (!w) return 'No such weapon.';
  const name = w.name.toLowerCase();
  if (!isDrawn(weaponId)) return 'The ' + name + ' has no quiver: it loads as it always has.';
  const pack = packOf(c).map((x) => ({ ...x })), held = c.weapon === weaponId, stowed = held ? -1 : pack.findIndex((x) => x.kind === 'weapon' && x.weapon === weaponId);
  if (!held && stowed < 0) return 'You don\'t carry a ' + name + '.';
  const qs = quiversOf(c), q = qs[which]; if (!q) return which ? 'You carry one quiver.' : 'You carry no quiver.';
  const want: Quiver = {};
  for (const [k, n] of Object.entries(load || {})) {
    const t = arrowId(k); if (!t) return 'No such arrow: ' + String(k).replace(/_/g, ' ') + '.';
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 0) return 'Count arrows in whole numbers.';
    if (n) want[t] = (want[t] || 0) + n;
  }
  const cap = quiverHolds(q.id, q.rarity || 'standard'); if (quiverTotal(want) > cap) return 'The quiver holds ' + cap + ' arrows.';
  const prev = toCount(q.arrows || {}, Math.min(cap, quiverTotal(q.arrows)));
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
  c.pack = pack.filter((x) => x.qty > 0 || x.mags);
  setQuivers(c, qs.map((x, i) => (i === which ? { ...x, arrows: want } : x)));
  return null;
}
quiverLoader(loadQuiver);
