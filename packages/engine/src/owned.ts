// OWNED UNITS (Classes 3.0 P9; docs/design/rev4-primitives.md). A unit one unit owns: a drone, a beast, the twin, and
// later the Figments and the Scrap Turret. The record is the tie `owned` (kit.ts, P8: owner → unit) plus the unit's own
// block: `owned` {turn, eyes, upkeep, cover, lure}:
//   turn    own: it takes its own turn in the order, right after its owner (the drone, the beast, the twin: rules 1.3);
//           owner: it has no turn of its own (its owner's verbs move it); auto: no turn of its own, the engine drives it.
//           (owner and auto are recorded and kept out of the order here; the verbs that drive them are the Figments
//           step's: see docs/design/handoffs/classes-3.0-step-1b.md.)
//   eyes    false: it sees nothing of its own (combat.ts unitSees, P7).
//   upkeep  {res, n}: what its owner pays at the start of each of its turns to keep it (a row of data/actions.json
//           resources); one it can't pay unmakes it.
//   cover   it is standing cover for those behind it (combat.ts coverOf); lure: the Double's, read by its system.
// Ops `spawn` (a unit from a data block at the owner's level, through combat.ts levelCompanion; the tie made) and
// `unmake` (refund: the resources its spawn took come back) are effects/triggers.ts's; spawnOwned and unmakeOwned are
// the doors.
import './datatext'; // fills the texts' {=placeholders} before any data is read
import enemiesJ from '../../../data/enemies.json';
import type { Combat, Unit } from './combat';
import { unitFromEnemy, levelCompanion, say, emitFx } from './combat';
import { tie, untie, tiesOf, tieKind } from './kit';
import { onHook } from './effects/hooks';
import { resGive, resLeft } from './effects/cost';
import { charOfUnit } from './effects/hooks';
import type { Rng } from './rng';

/** How an owned unit takes its turn. */
export const OWNED_TURNS = ['own', 'owner', 'auto'] as const;
/** An owned unit's own block (P9). `spent`: what its spawn took (unmake's refund). */
export interface OwnedBlock { turn: (typeof OWNED_TURNS)[number]; eyes?: boolean; upkeep?: { res: string; n: number }; cover?: boolean; lure?: boolean; spent?: Record<string, number> }
/** The fields of a block a spawn copies onto the unit's record. */
export const OWNED_FIELDS = ['turn', 'eyes', 'upkeep', 'cover', 'lure'];
/** The tie kind that makes a unit owned (data/rules.json ties.kinds). */
export const OWNED_TIE = 'owned';
/** The data blocks a spawn may name: enemies.json companions (and each system's forms, one line here as they come). */
const BLOCKS: Record<string, any> = Object.fromEntries((((enemiesJ as any).companions || []) as any[]).map((k) => [k.id, k]));
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
  if (block?.cover) o.cover = true;
  if (block?.lure) o.lure = true;
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
export function spawnOwned(cb: Combat, owner: Unit, blockId: string, at: string, rng: Rng, o: { spent?: Record<string, number> } = {}): Unit | string {
  const k = ownedBlock(blockId); if (!k) return 'No such thing to make (' + blockId + ').';
  const n = ((cb as any).ownedSeq = ((cb as any).ownedSeq || 0) + 1), id = 'ow-' + owner.id + '-' + blockId + '-' + n;
  const u = unitFromEnemy(id, k.name, 'minion', k.weapon || 'fists', at, rng);
  Object.assign(u, { side: owner.side, tier: undefined, def: k.defense, armour: k.armour, attack: k.attack_bonus, movement: k.movement ?? 1, strength: k.attack_bonus, init: owner.init - 0.5, agility: 1, ctrl: owner.charId || owner.ctrl, companion: k.id, kind: k.kind || k.id, tags: [...(k.tags || [])], short: (k.name || '').slice(0, 2).toUpperCase(), img: k.portrait || undefined });
  u.mags = undefined;
  levelCompanion(u, k, owner.level ?? 1);
  if (Array.isArray(k.actions) && k.actions.length) u.allowedActions = [...k.actions];
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
export function unmakeOwned(cb: Combat, u: Unit, o: { refund?: boolean } = {}): void {
  if (!cb.units.includes(u)) return;
  const owner = ownerOf(cb, u), rec: OwnedBlock | undefined = (u as any).owned;
  const i = cb.order.indexOf(u.id); cb.units = cb.units.filter((x) => x !== u); cb.order = cb.order.filter((x) => x !== u.id); if (i >= 0 && i < cb.turn) cb.turn--;
  untie(cb, (t) => t.kind === OWNED_TIE && t.to === u.id);
  if (o.refund && owner && rec?.spent) for (const [id, n] of Object.entries(rec.spent)) resGive(cb, owner, id, n, { c: charOfUnit(owner), why: 'unmade' });
  emitFx(cb, 'unmake', { unit: u.id, at: u.pos });
  say(cb, u.name + ' is gone.');
}
onHook('tie_end', (ctx: any, cb: Combat) => { if (!ctx.unmake) return; const u = cb.units.find((x) => x.id === ctx.tie.to); if (u) unmakeOwned(cb, u); }); // a tie whose kind says unmake (kit.ts untie)
// Upkeep: at the start of its owner's turn, each owned unit with an upkeep is paid for, or unmade.
onHook('turn_start', (ctx: any, cb: Combat) => {
  const owner: Unit = ctx.u; if (!owner || !cb.ties?.length) return;
  for (const u of ownedBy(cb, owner)) {
    const up = (u as any).owned?.upkeep as OwnedBlock['upkeep']; if (!up) continue;
    const c = charOfUnit(owner);
    if (resLeft(owner, up.res, c) >= up.n) resGive(cb, owner, up.res, -up.n, { c, why: 'upkeep' }); else unmakeOwned(cb, u);
  }
});
