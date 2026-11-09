// Combat speed (UI pass, docs/design/ui-pass-shell.md 6.4): a player's own setting, Normal or Fast. This module is
// the agreement between the settings cog (game/settings.tsx, which shows the control) and the combat screen's
// animation timings (the combat-polish track decides what each speed does): storage and an event, no behaviour.
export type CombatSpeed = 'normal' | 'fast';
const LS = 'phc.combatSpeed';
export const COMBAT_SPEED_EVENT = 'phc:combat-speed';

export function getCombatSpeed(): CombatSpeed {
  try { return localStorage.getItem(LS) === 'fast' ? 'fast' : 'normal'; } catch { return 'normal'; }
}
export function setCombatSpeed(v: CombatSpeed) {
  try { localStorage.setItem(LS, v === 'fast' ? 'fast' : 'normal'); } catch { /* */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(COMBAT_SPEED_EVENT));
}
