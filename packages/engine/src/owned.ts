// OWNED UNITS (Classes 3.0 P9; docs/design/rev4-primitives.md). A unit one unit owns: a drone, a beast, the twin, and
// later the Figments and the Scrap Turret. The record is the tie `owned` (kit.ts, P8: owner → unit) plus the unit's own
// block: `owned` {turn, eyes, upkeep, cover, lure}:
//   turn    own: it takes its own turn in the order, right after its owner (the drone, the beast, the twin: rules 1.3);
//           owner: it has no turn of its own (its owner's verbs move it); auto: no turn of its own, the engine drives it.
//           (the lead's ruling at step 1b's integration: an owner or auto unit never enters cb.order; its verbs are
//           offered to its OWNER during the owner's turn (descriptors.ts, the system OWNED) and run by the reducer's
//           combat/owned {unitId: owner, owned, verb, targetId?, tile?}: runOwned below, priced on the owned unit
//           and paid by its owner. An auto unit acts once at the start of its owner's turn through the same door,
//           the verb and target chosen by its block's `auto` {verb, target: nearest_foe | weakest_foe}.)
//   kind    what it is, for the rules that tell owned units apart (one tie kind, `owned`, for all of them: the
//           lead's ruling): the block's `owned_kind`, default companion (the drone, the beast); a Figment's `figment`.
//   eyes    false: it sees nothing of its own (combat.ts unitSees, P7).
//   upkeep  {res, n}: what its owner pays at the start of each of its turns to keep it (a row of data/actions.json
//           resources); one it can't pay unmakes it.
//   cover   it is standing cover for those behind it (combat.ts coverOf); lure: the Double's, read by its system.
// Ops `spawn` (a unit from a data block at the owner's level, through combat.ts levelCompanion; the tie made) and
// `unmake` (refund: the resources its spawn took come back) are effects/triggers.ts's; spawnOwned and unmakeOwned are
// the doors.
import './datatext'; // fills the texts' {=placeholders} before any data is read
import enemiesJ from '../../../data/enemies.json';
import figmentsJ from '../../../data/figments.json';
import type { Combat, Unit } from './combat';
import { unitFromEnemy, levelCompanion, say, emitFx, moveUnit, previewAttack, resolveAttack, dist, isMelee, unitSees, sideSeesUnit, type AttackMode } from './combat';
import { canStand } from './kit';
import { WEAPON } from './data';
import { apFor, pay, withAp, price, whyNot } from './effects/cost';
import { tie, untie, tiesOf, tieKind } from './kit';
import { onHook, runOwnEffects } from './effects/hooks';
import { resGive, resLeft } from './effects/cost';
import { charOfUnit } from './effects/hooks';
import type { Rng } from './rng';

/** How an owned unit takes its turn. */
export const OWNED_TURNS = ['own', 'owner', 'auto'] as const;
/** An owned unit's own block (P9). `spent`: what its spawn took (unmake's refund). */
export interface OwnedBlock { turn: (typeof OWNED_TURNS)[number]; /** companion (default) or a system's word (figment): one tie kind, the record tells them apart */ kind?: string; eyes?: boolean; upkeep?: { res: string; n: number }; cover?: boolean | 'full'; lure?: boolean; spent?: Record<string, number>; /** turn auto: what it does at its owner's turn start */ auto?: { verb: string; target: (typeof AUTO_TARGETS)[number] };
  /** Classes 3.0 step 8 (rules 1.34): made outside its owner's held count (the Rigger's Double, a Scrap Turret) */ free?: boolean;
  /** rules 1.34: it is unmade at its owner's turn start in this round (a lifetime in rounds) */ until?: number }
/** The fields of a block a spawn copies onto the unit's record. */
export const OWNED_FIELDS = ['turn', 'owned_kind', 'eyes', 'upkeep', 'cover', 'lure', 'auto'];
/** The verbs an owned unit of turn owner or auto can be given: the engine's own move and plain attacks, run with the
 * owned unit as the actor (its block's `actions` picks among them; none named: move and its weapon's plain attack). */
export const OWNED_VERBS = ['move', 'shot', 'aimed', 'melee'] as const;
/** How an auto unit picks its target (its block's auto.target). */
export const AUTO_TARGETS = ['nearest_foe', 'weakest_foe'] as const;
/** The tie kind that makes a unit owned (data/rules.json ties.kinds). */
export const OWNED_TIE = 'owned';
/** The data blocks a spawn may name: enemies.json companions (and each system's forms, one line here as they come). */
const BLOCKS: Record<string, any> = Object.fromEntries([...(((enemiesJ as any).companions || []) as any[]), ...(((figmentsJ as any).forms || []) as any[]), (figmentsJ as any).turret].filter(Boolean).map((k) => [k.id, k]));
/** The data verbs an owned unit of turn owner can be given besides OWNED_VERBS (rules 1.34: figments.json verbs: Strike,
 * Pounce, Cut, Stare, Let go): `site` (its cost site, priced on the owner), `attack` (the plain attack it makes: melee or
 * shot), `dash` (tiles in a straight line before it), `reach` {tiles, side, eyes: the unit itself must see it},
 * `on_hit` and `effects` (item ops run with the owned unit as the holder, its owner's sheet behind it), `unmake`
 * (refund_share: what share of its making comes back). One line here as each system's file comes. */
export const OWNED_DATA_VERBS: Record<string, any> = Object.fromEntries((((figmentsJ as any).verbs || []) as any[]).map((v) => [v.id, v]));
/** Each system's gate on giving its owned units orders (figments.ts: the Visualizer in hand, not Silenced, in range). */
const GATES: ((cb: Combat, owner: Unit, u: Unit, verb: string) => string | null)[] = [];
/** Add a gate (a system's rule on acting through its owned units): its reason refuses the order. */
export const addOwnedGate = (f: (cb: Combat, owner: Unit, u: Unit, verb: string) => string | null) => { GATES.push(f); };
let ADDED: Record<string, any> = {};
/** A block by id (the data's, then those added at run time: a test's). */
export const ownedBlock = (id: string): any => ADDED[id] || BLOCKS[id] || null;
/** Add blocks at run time (tests); clearOwnedBlocks takes them away. */
export function addOwnedBlocks(rows: any[]) { for (const r of rows) ADDED[r.id] = r; }
/** Forget the blocks added at run time. */
export function clearOwnedBlocks() { ADDED = {}; }

/** The record of an owned unit, from its block (turn own unless the block says). */
export function ownedRecord(block: any): OwnedBlock {
  const o: OwnedBlock = { turn: OWNED_TURNS.includes(block?.turn) ? block.turn : 'own' };
  if (block?.eyes === false) o.eyes = false;
  if (block?.upkeep) o.upkeep = { res: block.upkeep.res, n: block.upkeep.n };
  if (block?.cover) o.cover = block.cover === 'full' ? 'full' : true; // rules 1.34: "full" (the Wall), else half cover
  if (block?.lure) o.lure = true;
  if (typeof block?.owned_kind === 'string' && block.owned_kind !== 'companion') o.kind = block.owned_kind;
  if (o.turn === 'auto' && block?.auto && (OWNED_VERBS as readonly string[]).includes(block.auto.verb)) o.auto = { verb: block.auto.verb, target: (AUTO_TARGETS as readonly string[]).includes(block.auto.target) ? block.auto.target : 'nearest_foe' };
  return o;
}
/** Its owner: the far end of its `owned` tie, else (a fight saved before P9, the area map) its controller's unit or
 * the twin's owner. */
export function ownerOf(cb: Combat, u: Unit): Unit | null {
  const t = tiesOf(cb, u, OWNED_TIE, 'to')[0]; if (t) return cb.units.find((x) => x.id === t.from) || null;
  const tw = (u as any).twinOf; if (tw) return cb.units.find((x) => x.id === tw) || null;
  if (u.companion && u.ctrl) return cb.units.find((x) => x.charId === u.ctrl && !x.companion) || null;
  return null;
}
/** The units a unit owns (alive or not, in the fight's order). */
export const ownedBy = (cb: Combat, owner: Unit): Unit[] => tiesOf(cb, owner, OWNED_TIE, 'from').map((t) => cb.units.find((x) => x.id === t.to)!).filter(Boolean);
/** Tie a fight's companions to their owners (combat.ts startCombat): the record of every unit built with a block. */
export function tieCompanions(cb: Combat): void {
  if (!tieKind(OWNED_TIE)) return;
  for (const u of cb.units) if (u.companion && !tiesOf(cb, u, OWNED_TIE, 'to').length) { const o = ownerOf(cb, u); if (o) tie(cb, o, u, OWNED_TIE); }
}

/** THE door that makes an owned unit: from a block (its stat line: hp, defense, attack_bonus, armour, movement, weapon;
 * its record), at the owner's level, on a tile; tied to its owner. Refused (a reason) when the owner holds as many as
 * its cap (ties_max:owned) or the block is unknown. `spent`: the resources its maker paid (unmake's refund). */
export function spawnOwned(cb: Combat, owner: Unit, blockId: string, at: string, rng: Rng, o: { spent?: Record<string, number>; /** the block itself, worked out by its system (a Figment's design: its form with its traits) */ block?: any } = {}): Unit | string {
  const k = o.block || ownedBlock(blockId); if (!k) return 'No such thing to make (' + blockId + ').';
  const n = ((cb as any).ownedSeq = ((cb as any).ownedSeq || 0) + 1), id = 'ow-' + owner.id + '-' + blockId + '-' + n;
  const u = unitFromEnemy(id, k.name, 'minion', k.weapon || 'fists', at, rng);
  Object.assign(u, { side: owner.side, tier: undefined, def: k.defense, armour: k.armour, attack: k.attack_bonus, movement: k.movement ?? 1, strength: k.attack_bonus, init: owner.init - 0.5, agility: 1, ctrl: owner.charId || owner.ctrl, companion: k.id, kind: k.kind || k.id, tags: [...(k.tags || [])], short: (k.name || '').slice(0, 2).toUpperCase(), img: k.portrait || undefined });
  u.mags = undefined;
  levelCompanion(u, k, owner.level ?? 1);
  if (Array.isArray(k.actions) && k.actions.length) u.allowedActions = [...k.actions];
  if (Array.isArray(k.verbs) && k.verbs.length) (u as any).dataVerbs = k.verbs.filter((v: string) => OWNED_DATA_VERBS[v]);
  if (k.infinite_ammo) u.infiniteAmmo = true;
  const rec = ownedRecord(k); if (o.spent) rec.spent = { ...o.spent };
  (u as any).owned = rec; if (rec.eyes === false) u.eyes = false;
  cb.units = [...cb.units, u];
  if (!tie(cb, owner, u, OWNED_TIE)) { cb.units = cb.units.filter((x) => x !== u); return owner.name + ' holds as many as it can.'; }
  if (rec.turn === 'own') { const i = cb.order.indexOf(owner.id); cb.order = [...cb.order.slice(0, i + 1), u.id, ...cb.order.slice(i + 1)]; if (i < cb.turn) cb.turn++; }
  emitFx(cb, 'spawn', { unit: u.id, at, owner: owner.id, block: k.id });
  return u;
}
/** THE door that unmakes an owned unit: it leaves the fight (no Down, no kill, no bots); its tie ends; with `refund`,
 * what its spawn took goes back to its owner. */
export function unmakeOwned(cb: Combat, u: Unit, o: { refund?: boolean; /** the share of what it took that comes back (rounded down; default all) */ share?: number; quiet?: boolean } = {}): void {
  if (!cb.units.includes(u)) return;
  const owner = ownerOf(cb, u), rec: OwnedBlock | undefined = (u as any).owned;
  const i = cb.order.indexOf(u.id); cb.units = cb.units.filter((x) => x !== u); cb.order = cb.order.filter((x) => x !== u.id); if (i >= 0 && i < cb.turn) cb.turn--;
  untie(cb, (t) => t.kind === OWNED_TIE && t.to === u.id);
  if (o.refund && owner && rec?.spent) for (const [id, n] of Object.entries(rec.spent)) { const back = Math.floor(n * (o.share ?? 1)); if (back > 0) resGive(cb, owner, id, back, { c: charOfUnit(owner), why: 'unmade' }); }
  emitFx(cb, 'unmake', { unit: u.id, at: u.pos });
  if (!o.quiet) say(cb, u.name + ' is gone.');
}
// ---------- the owned action system (the lead's ruling at step 1b's integration) ----------
/** The record of a unit that has no turn of its own (turn owner or auto), else null. */
export const turnless = (u: Unit): OwnedBlock | null => { const r: OwnedBlock | undefined = (u as any).owned; return r && (r.turn === 'owner' || r.turn === 'auto') ? r : null; };
/** The verbs this owned unit can be given (its block's `actions` among OWNED_VERBS; none: move and its weapon's plain attack). */
export function ownedVerbs(u: Unit): string[] {
  const w: any = (WEAPON as any)[u.weapon], plain = w && isMelee(w) ? 'melee' : 'shot';
  const a = Array.isArray(u.allowedActions) && u.allowedActions.length ? u.allowedActions : ['move', plain];
  return [...a.filter((v) => (OWNED_VERBS as readonly string[]).includes(v)), ...(((u as any).dataVerbs || []) as string[])];
}
const VERB_NAMES: Record<string, string> = { move: 'Move', shot: 'Shot', aimed: 'Aimed shot', melee: 'Strike' };
/** A data verb's name, its AP for this owner now (its site, priced on the owner), and what it is aimed at: the
 * descriptors' row. null: one of OWNED_VERBS (the descriptors price those from the weapon). */
export function ownedVerbInfo(cb: Combat, owner: Unit, u: Unit, verb: string): { name: string; ap: number; pick: 'tile' | 'enemy' | 'none'; text: string } | null {
  const dv = OWNED_DATA_VERBS[verb]; if (!dv) return null;
  return { name: dv.name || VERB_NAMES[verb] || verb, ap: price({ cb, u: owner }, dv.site, undefined, { owned: u.id }).ap, pick: dv.reach ? 'enemy' : 'none', text: dv.text || '' };
}
/** The units its owner may give orders to now: its owned units with no turn of their own, standing. */
export const orderable = (cb: Combat, owner: Unit): Unit[] => (cb.ties?.length ? ownedBy(cb, owner).filter((u) => !!turnless(u) && !u.dead && !u.downed && cb.units.includes(u)) : []);
/** Why the owner can't give this verb to this owned unit now (null: it can): not its owned unit, no turn-less record,
 * out of the fight, a verb it does not have. */
export function ownedWhy(cb: Combat, owner: Unit, u: Unit | undefined, verb: string): string | null {
  if (!u || !cb.units.includes(u) || ownerOf(cb, u) !== owner) return 'Pick one of your own.';
  if (!turnless(u)) return u.name + ' takes its own turn.';
  if (u.dead || u.downed) return u.name + ' is out of the fight.';
  if (!ownedVerbs(u).includes(verb)) return u.name + ' can only ' + ownedVerbs(u).join(', ') + '.';
  for (const g of GATES) { const no = g(cb, owner, u, verb); if (no) return no; }
  return null;
}
/** THE door an owned unit acts through (combat/owned; the auto driver): the verb runs with the owned unit as the actor,
 * on as many AP as its owner has left; what it took is priced on the owned unit and paid by its owner (P9's payer).
 * Returns the refusal, or null. */
export function runOwned(cb: Combat, rng: Rng, owner: Unit, u: Unit | undefined, verb: string, o: { targetId?: string | null; tile?: string | null } = {}): string | null {
  const no = ownedWhy(cb, owner, u, verb); if (no) return no;
  if (OWNED_DATA_VERBS[verb]) return runDataVerb(cb, rng, owner, u!, OWNED_DATA_VERBS[verb], o);
  const me = u!, avail = apFor(cb, owner);
  let err: string | null = null, spent = 0;
  withAp(me, avail, () => {
    const before = apFor(cb, me);
    if (verb === 'move') err = o.tile ? moveUnit(cb, me, o.tile, rng, 'move') : 'Pick a tile.';
    else {
      const t = o.targetId ? cb.units.find((x) => x.id === o.targetId) : undefined;
      if (!t || t.dead || t === me) err = 'Pick a target.';
      else { const pv = previewAttack(cb, me, t, verb as AttackMode); if (!pv.ok) err = pv.why || 'Not now.'; else resolveAttack(cb, rng, me, t, verb as AttackMode, null); }
    }
    spent = Math.max(0, before - apFor(cb, me));
  });
  if (err) return err;
  if (spent > 0) pay(cb, me, spent, { payer: owner, c: charOfUnit(owner) });
  return null;
}
/** A data verb (OWNED_DATA_VERBS) run with the owned unit as the actor, priced at its site on the owner and paid by it.
 * `free`: Overclock's (no AP, a verb of up to that many AP). Returns the refusal, or null. */
export function runDataVerb(cb: Combat, rng: Rng, owner: Unit, me: Unit, dv: any, o: { targetId?: string | null; tile?: string | null; free?: number } = {}): string | null {
  const c = charOfUnit(owner), pr = price({ cb, u: owner }, dv.site, undefined, { owned: me.id });
  if (o.free != null && pr.ap > o.free) return dv.name + ' costs more than ' + o.free + ' AP.';
  const cost = o.free != null ? 0 : pr.ap;
  { const no = whyNot(cb, owner, cost, { c }); if (no) return no; }
  if (dv.unmake) { pay(cb, me, cost, { payer: owner, c }); unmakeOwned(cb, me, { refund: true, share: dv.refund_share ?? 1, quiet: true }); say(cb, owner.name + ' lets ' + me.name + ' go.'); return null; }
  let t: Unit | null = null;
  if (dv.reach) {
    t = o.targetId ? cb.units.find((x) => x.id === o.targetId) || null : null;
    if (!t || t.dead || t === me) return 'Pick a target.';
    if (dv.reach.side === 'foe' && t.side === owner.side) return 'Pick an enemy.';
    if (dist(me.pos, t.pos) > (dv.reach.tiles ?? 1)) return 'Out of reach (' + (dv.reach.tiles ?? 1) + ' tiles from ' + me.name + ').';
    if (dv.reach.eyes ? !unitSees(cb, me, t.pos) : t.side !== owner.side && !sideSeesUnit(cb, owner.side, t)) return 'It can\'t see them.';
  }
  const holder: any = { key: 'verb:' + dv.id, itemId: dv.id, kind: 'verb', tier: 'I', info: { key: 'verb:' + dv.id, kind: 'verb', id: dv.id, name: dv.name, tier: 'I', effects: [], effTier: [], text: dv.text || '', adjudication: 'engine', active: false, bound: false, ap: null, uses: 'at_will' }, c, u: me, cb };
  if (dv.dash && t && dist(me.pos, t.pos) > 1) {
    // a straight line (a row, a column or a diagonal) of free tiles, up to dash, to the tile next to the target
    const [ax, ay] = me.pos.split(',').map(Number), [bx, by] = t.pos.split(',').map(Number), dx = Math.sign(bx - ax), dy = Math.sign(by - ay), n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
    if (!(ax === bx || ay === by || Math.abs(bx - ax) === Math.abs(by - ay))) return 'Not in a straight line.';
    if (n - 1 > dv.dash) return 'Too far to ' + String(dv.name).toLowerCase() + ' (' + dv.dash + ' tiles).';
    let to = me.pos;
    for (let i = 1; i < n; i++) { const k = (ax + dx * i) + ',' + (ay + dy * i); if (!canStand(cb, k, me)) return 'Something is in the way.'; to = k; }
    const err = withAp(me, 99, () => moveUnit(cb, me, to, rng, 'move')); if (err) return err;
    if (me.dead || me.downed || !cb.units.includes(me)) { pay(cb, me, cost, { payer: owner, c }); return null; }
  }
  if (dv.attack && t) {
    const tt = t;
    const no = withAp(me, 99, (): string | null => { const pv = previewAttack(cb, me, tt, dv.attack as AttackMode); if (!pv.ok) return pv.why || 'Not now.'; const r = resolveAttack(cb, rng, me, tt, dv.attack as AttackMode, null, { noAp: true }); if (r.hit && dv.on_hit?.length) runOwnEffects(holder, dv.on_hit, { u: me, t: tt, action: dv.site, tile: null, toggles: [], mode: null }); return null; });
    if (no) return no;
  }
  if (dv.effects?.length) runOwnEffects(holder, dv.effects, { u: me, t, action: dv.site, tile: o.tile || null, toggles: [], mode: null });
  pay(cb, me, cost, { payer: owner, c });
  return null;
}
/** An auto unit's target: the nearest standing foe (ties: the order of the fight's units), or the most hurt. */
function autoTarget(cb: Combat, u: Unit, how: string): Unit | null {
  const foes = cb.units.filter((x) => x.side !== u.side && !x.dead && !x.downed && !x.surrendered && !x.hidden);
  let best: Unit | null = null;
  for (const f of foes) {
    if (!best) { best = f; continue; }
    const better = how === 'weakest_foe' ? f.hp / f.maxHp < best.hp / best.maxHp : dist(u.pos, f.pos) < dist(u.pos, best.pos);
    if (better) best = f;
  }
  return best;
}
onHook('tie_end', (ctx: any, cb: Combat) => { if (!ctx.unmake) return; const u = cb.units.find((x) => x.id === ctx.tie.to); if (u) unmakeOwned(cb, u); }); // a tie whose kind says unmake (kit.ts untie)
// Upkeep: at the start of its owner's turn, each owned unit with an upkeep is paid for, or unmade.
onHook('turn_start', (ctx: any, cb: Combat) => {
  const owner: Unit = ctx.u; if (!owner || !cb.ties?.length) return;
  for (const u of ownedBy(cb, owner)) {
    const up = (u as any).owned?.upkeep as OwnedBlock['upkeep']; if (!up || u.dead) continue; // (a destroyed one pays nothing: rules 1.34)
    const c = charOfUnit(owner);
    if (resLeft(owner, up.res, c) >= up.n) resGive(cb, owner, up.res, -up.n, { c, why: 'upkeep' }); else unmakeOwned(cb, u);
  }
  // turn auto: once, after the upkeep, each acts through runOwned (paid by its owner); a refusal is said, nothing paid
  for (const u of orderable(cb, owner)) {
    const a = turnless(u)?.auto; if (!a) continue;
    const t = a.verb === 'move' ? null : autoTarget(cb, u, a.target); if (!t) continue;
    const no = runOwned(cb, ctx.rng, owner, u, a.verb, { targetId: t.id });
    if (no) say(cb, u.name + ' holds (' + no.replace(/\.$/, '') + ').');
  }
});
