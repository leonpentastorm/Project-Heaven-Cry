// Test helpers for the ranged lane of Physical 2.0 (rules 1.12): the ones more than one phys-ranged-*.test.ts file
// uses. The fight itself is helpers/physfight.ts (the lead's; not changed here).
import { expect } from 'vitest';
import { WEAPON, type TechPreview } from '../../src';
import type { physFight } from './physfight';
import { armQuiver, isDrawn } from '../../src/physical/ranged/quiver';

export type PhysF = ReturnType<typeof physFight>;
/** The whole game as text: a preview must leave it exactly as it was. */
export const gameText = (f: PhysF) => JSON.stringify(f.g);
/** Run fn and check the whole game state is byte for byte the same after (a preview changes nothing). */
export function unchanged(f: PhysF, fn: () => void) { const before = gameText(f); fn(); expect(gameText(f)).toBe(before); }
/** A to-hit term of the i-th attack in a technique's preview, by its label (undefined: no such term). */
export const term = (pv: TechPreview, i: number, label: string) => pv.attacks[i]?.pv.terms?.find((t) => t.label === label)?.v;
/** Put a weapon in the off hand of the first PC, on the character and the unit alike (a reducer swap such as Snap
 * Shot's reads both; physfight's `off` sets only the unit). */
export function offHand(f: PhysF, weaponId: string) {
  const c: any = f.char(f.pc), u = f.unit(f.pc.id), n = WEAPON[weaponId].magazine ?? 0;
  c.offHand = { id: weaponId, loaded: n }; u.offWeapon = weaponId; u.offAmmo = n;
}
/** Undo whatever the fight's opening enemy turns did (they run before the first PC's turn when the seed's initiative
 * puts an enemy first): every meter at 0; nobody hit, Stopped, holding a shot or marking anyone this turn; full HP, no
 * conditions, standing and seen; every reaction unused; every barrel cool; each enemy's weapon loaded as the fight
 * gave it (its quiver at capacity, as armQuiver makes it). Positions are the fixture's to set. A fixture calls it once
 * its units stand where it wants them, then hands the turn to the PC (review fix: tests leaned on the seed's
 * initiative). */
export function calm(f: PhysF) {
  for (const u of f.cb.units) {
    f.press(u, 0);
    for (const k of ['hitRound', 'hitWith', 'pressedThis', 'stopped', 'watch', 'coveredBy', 'caughtFirst', 'nailed', 'setUp', 'reactUsed', 'freeReload', 'noWatch']) delete (u as any)[k]; delete (u as any).uses?.['reaction|reaction'];
    for (const k of ['bead', 'spotted', 'suppress', 'brace', 'load_special', '_take']) delete (u.tech || {})[k];
    u.hp = u.maxHp; u.conds = {}; u.prone = false; u.hidden = false; u.braced = false; u.overwatch = null; u.jammed = false; u.shotsThisTurn = 0; u.heat = 0;
    if (u.side !== 'pc' && !u.charId && WEAPON[u.weapon]?.magazine != null) { u.ammo = WEAPON[u.weapon].magazine!; if (isDrawn(u.weapon)) { delete u.quiver; delete (u.tech || {})._quiver; armQuiver(u); } }
  }
  for (const u of f.cb.units) for (const v of f.cb.units) if ((v.tech as any)?.spotted?.by === u.id) delete (v.tech as any).spotted;
}
