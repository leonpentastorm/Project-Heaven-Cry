// Decoys on the grid (Class Roster Revision 3: the Trickster's False Image; spec section 14 item 559 on). An image is
// not a unit: it stands on a tile (cb.images), has no HP and takes no turn. Each enemy it fooled (a failed Brain save
// when it appeared) sees the image where its owner stands: the AI attacks and closes on the image instead of the real
// one (combat.ts enemyTurn, enemyIntent; the Sigil and Soul planners leave a fooled enemy's real owner alone). An
// attack on an image passes through it and it scatters. Images fade at the start of their owner's turn two rounds on.
// Everything here is deterministic: no die is rolled (the saves are rolled by the class move with the game's rng).
import type { Combat, Unit } from './combat';
import { emitFx, previewAttack, isMelee, refOf } from './combat';
import { WEAPON } from './data';
import { calmFight } from './magic';

export interface Image {
  id: string; owner: string; pos: string; side: 'pc' | 'foe';
  /** The round it appeared (it fades at its owner's turn start in round + 2). */
  round: number;
  /** Enemy unit ids that failed their Brain save: they take the image for its owner. */
  fooled: string[];
}
export const imagesOf = (cb: Combat): Image[] => cb.images || [];
export const imageOfOwner = (cb: Combat, ownerId: string): Image | null => imagesOf(cb).find((i) => i.owner === ownerId) || null;
/** The image an enemy takes for this unit, if it was fooled by one. */
export function fooledBy(cb: Combat, enemy: Unit, t: Unit): Image | null {
  const i = imageOfOwner(cb, t.id);
  return i && i.fooled.includes(enemy.id) && !t.dead ? i : null;
}
/** The stand-in an AI aims at: the owner's numbers on the image's tile (never added to cb.units). */
export function ghostOf(img: Image, owner: Unit): Unit {
  return { ...owner, id: img.id, pos: img.pos, hidden: false, downed: false, ghostOf: owner.id } as Unit;
}
export const isGhost = (t: Unit | null | undefined) => !!t && !!(t as any).ghostOf;
/** The other side as this unit believes it stands: each one it was fooled about is its image, the rest as they are
 * (not dead, Hidden or surrendered). */
export function perceivedFoes(cb: Combat, u: Unit): Unit[] {
  const out: Unit[] = [];
  for (const t of cb.units) {
    if (t.side === u.side || t.dead || t.surrendered) continue;
    const img = fooledBy(cb, u, t);
    if (img) out.push(ghostOf(img, t)); else if (!t.hidden) out.push(t);
  }
  return out;
}
/** Place an image (one per owner: a new one replaces the old). */
export function addImage(cb: Combat, img: Image) {
  const old = imageOfOwner(cb, img.owner); if (old) dropImage(cb, old, 'replaced');
  (cb.images ||= []).push(img);
  emitFx(cb, 'image', { id: img.id, owner: img.owner, at: img.pos, side: img.side, fooled: [...img.fooled] });
}
export function dropImage(cb: Combat, img: Image, why: string) {
  if (!imagesOf(cb).includes(img)) return;
  cb.images = imagesOf(cb).filter((x) => x !== img);
  emitFx(cb, 'image_gone', { id: img.id, owner: img.owner, at: img.pos, why });
}
/** An enemy attacks an image it took for its owner: the attack's AP (and a round, Heat) are spent, it passes through,
 * and the image scatters. */
export function strikeImage(cb: Combat, att: Unit, ghost: Unit, mode: 'melee' | 'shot') {
  const img = imagesOf(cb).find((i) => i.id === ghost.id); const owner = cb.units.find((x) => x.id === (ghost as any).ghostOf);
  const pv = previewAttack(cb, att, ghost, mode);
  if (!pv.ok || !img) { cb.log.push('(' + att.name + ' can\'t attack the image: ' + (pv.why || 'gone') + ')'); return; }
  const w = WEAPON[att.weapon], melee = isMelee(w) || mode === 'melee';
  att.ap -= pv.ap;
  if (att.mg) calmFight(cb, att);
  if (!melee) { if (w.magazine != null && !att.infiniteAmmo) att.ammo = Math.max(0, att.ammo - 1); if (w.heat_limit && !att.infiniteAmmo) att.heat += 1; att.shotsThisTurn++; }
  att.firstShotDone = true; att.firstShotTurn = true; att.attackedTurn = true;
  emitFx(cb, melee ? 'melee' : 'shot', { unit: att.id, target: img.id, from: att.pos, to: img.pos, weapon: att.weapon, cat: w.category, mode, hit: false, crit: false, fumble: false, dmg: 0, killed: false, image: true });
  cb.log.push(att.name + (melee ? ' strikes at ' : ' fires at ') + (owner ? owner.name : 'someone') + ' at ' + refOf(img.pos) + ': it passes through a False Image, which scatters.');
  dropImage(cb, img, 'struck');
}
/** An image fades at its owner's turn start two rounds after it appeared, or when its owner falls. */
export function imageTurnStart(cb: Combat, u: Unit) {
  const img = imageOfOwner(cb, u.id); if (!img) return;
  if (u.dead || cb.round >= img.round + 2) { dropImage(cb, img, u.dead ? 'owner down' : 'faded'); cb.log.push(u.name + '\'s False Image fades.'); }
}
