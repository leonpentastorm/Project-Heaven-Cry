// Decoys on the grid (Class Roster Revision 3: the Trickster's False Image; spec section 14 items 573 and 575). An image is
// not a unit: it stands on a tile (cb.images), has no HP and takes no turn. Each enemy it fooled (a failed Brain save
// when it appeared) sees the image where its owner stands: the AI attacks and closes on the image instead of the real
// one (combat.ts enemyTurn, enemyIntent; the Sigil and Soul planners leave a fooled enemy's real owner alone). An
// attack on an image passes through it and it scatters. Images fade at the start of their owner's turn two rounds on.
// Everything here is deterministic: no die is rolled (the saves are rolled by the class move with the game's rng).
import type { Combat, Unit } from './combat';
import { say, emitFx, previewAttack, isMelee, refOf, sideSeesUnit, sightBlockers, resolveAttack } from './combat';
import type { Rng } from './rng';
import { WEAPON } from './data';
import { calmFight } from './magic';
import { pay } from './effects/cost';

export interface FalseImage {
  id: string; owner: string; pos: string; side: 'pc' | 'foe';
  /** The round it appeared (it fades at its owner's turn start in round + 2). */
  round: number;
  /** Enemy unit ids that failed their Brain save: they take the image for its owner. */
  fooled: string[];
  /** Rules 1.34 (Figments): the Double whose body this image is (a unit of cb.units): a fooled enemy sees the owner
   * where the body stands, and its attack lands on the body (it is found out). */
  body?: string;
}
export const imagesOf = (cb: Combat): FalseImage[] => cb.images || [];
export const imageOfOwner = (cb: Combat, ownerId: string): FalseImage | null => imagesOf(cb).find((i) => i.owner === ownerId) || null;
/** The image an enemy takes for this unit, if it was fooled by one. */
export function fooledBy(cb: Combat, enemy: Unit, t: Unit): FalseImage | null {
  const i = imageOfOwner(cb, t.id);
  return i && i.fooled.includes(enemy.id) && !t.dead ? i : null;
}
/** The stand-in an AI aims at: the owner's numbers on the image's tile (never added to cb.units). */
export function ghostOf(img: FalseImage, owner: Unit): Unit {
  return { ...owner, id: img.id, pos: img.pos, hidden: false, downed: false, ghostOf: owner.id } as Unit;
}
export const isGhost = (t: Unit | null | undefined) => !!t && !!(t as any).ghostOf;
/** The other side as this unit believes it stands: each one it was fooled about is its image, the rest as they are,
 * and only those its side sees now (rules 1.37: an enemy acts on what its side perceives, the fog's answer: not dead,
 * surrendered or Hidden, in some eye's reach and line, or always seen). One it can't see is no target: it searches
 * where its side last saw it (combat.ts enemySearchTile). */
export function perceivedFoes(cb: Combat, u: Unit): Unit[] {
  const out: Unit[] = [], walls = sightBlockers(cb);
  for (const t of cb.units) {
    if (t.side === u.side || t.dead || t.surrendered) continue;
    if (cb.images?.length && imagesOf(cb).some((i) => i.body === t.id && i.fooled.includes(u.id))) continue; // a Double it was fooled by is its owner to it (rules 1.34)
    const img = fooledBy(cb, u, t);
    if (img) out.push(ghostOf(img.body ? { ...img, pos: cb.units.find((x) => x.id === img.body)?.pos || img.pos } : img, t)); else if (sideSeesUnit(cb, u.side, t, false, walls)) out.push(t); // its side's sight (a Hidden unit that is always seen, P7, is seen)
  }
  return out;
}
/** Place an image (one per owner: a new one replaces the old). */
export function addImage(cb: Combat, img: FalseImage) {
  const old = imageOfOwner(cb, img.owner); if (old) dropImage(cb, old, 'replaced');
  (cb.images ||= []).push(img);
  emitFx(cb, 'image', { id: img.id, owner: img.owner, at: img.pos, side: img.side, fooled: [...img.fooled] });
}
export function dropImage(cb: Combat, img: FalseImage, why: string) {
  if (!imagesOf(cb).includes(img)) return;
  cb.images = imagesOf(cb).filter((x) => x !== img);
  emitFx(cb, 'image_gone', { id: img.id, owner: img.owner, at: img.pos, why });
}
/** An enemy attacks an image it took for its owner: the attack's AP (and a round, Heat) are spent, it passes through,
 * and the image scatters. */
export function strikeImage(cb: Combat, att: Unit, ghost: Unit, mode: 'melee' | 'shot', rng?: Rng) {
  const img = imagesOf(cb).find((i) => i.id === ghost.id); const owner = cb.units.find((x) => x.id === (ghost as any).ghostOf);
  // Rules 1.34: a Double has a body: the attack lands on it, and the lie is found out
  const body = img?.body ? cb.units.find((x) => x.id === img.body && !x.dead) : null;
  if (body && img && rng) { img.fooled = img.fooled.filter((x) => x !== att.id); ((cb as any).doubleFound ||= {})[att.id] = true; say(cb, att.name + ' attacks ' + (owner ? owner.name : 'someone') + ' and finds a Double.'); resolveAttack(cb, rng, att, body, mode, null); return; }
  const pv = previewAttack(cb, att, ghost, mode);
  if (!pv.ok || !img) { say(cb, '(' + att.name + ' can\'t attack the image: ' + (pv.why || 'gone') + ')'); return; }
  const w = WEAPON[att.weapon], melee = isMelee(w) || mode === 'melee';
  pay(cb, att, pv.ap);
  if (att.mg) calmFight(cb, att);
  if (!melee) { if (w.magazine != null && !att.infiniteAmmo) att.ammo = Math.max(0, att.ammo - 1); if (w.heat_limit && !att.infiniteAmmo) att.heat += 1; att.shotsThisTurn++; }
  att.firstShotDone = true; att.firstShotTurn = true; att.attackedTurn = true;
  emitFx(cb, melee ? 'melee' : 'shot', { unit: att.id, target: img.id, from: att.pos, to: img.pos, weapon: att.weapon, cat: w.category, mode, hit: false, crit: false, fumble: false, dmg: 0, killed: false, image: true });
  say(cb, att.name + (melee ? ' strikes at ' : ' fires at ') + (owner ? owner.name : 'someone') + ' at ' + refOf(img.pos) + ': it passes through a False Image, which scatters.');
  dropImage(cb, img, 'struck');
}
/** An image fades at its owner's turn start two rounds after it appeared, or when its owner falls. */
export function imageTurnStart(cb: Combat, u: Unit) {
  const img = imageOfOwner(cb, u.id); if (!img) return;
  if (u.dead || cb.round >= img.round + 2) { dropImage(cb, img, u.dead ? 'owner down' : 'faded'); say(cb, u.name + '\'s False Image fades.'); }
}
