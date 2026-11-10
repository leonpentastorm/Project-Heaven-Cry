// Test helpers for the ranged lane of Physical 2.0 (rules 1.12): the ones more than one phys-ranged-*.test.ts file
// uses. The fight itself is helpers/physfight.ts (the lead's; not changed here).
import { expect } from 'vitest';
import { WEAPON, type TechPreview } from '../../src';
import type { physFight } from './physfight';

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
