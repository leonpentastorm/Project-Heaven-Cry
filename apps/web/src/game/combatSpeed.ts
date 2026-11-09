// Combat speed (Leon, 9 Nov 2026: "reduce all animation, pop up UI speed in battle by about 15% … add a UI in the config
// that lets you tweak combat speed to fast which is now"). The ONE tempo source for everything timed in a fight: the
// effects layer (fx/dom.ts and fx/play.ts: every duration, delay, beat and hold), the spotlight cut-ins (game/spotlight),
// the Miracle's cut-in (game/cutIn.ts), the turn banners and the your-turn card (turnIntro.tsx), the combat screen's own
// motion (screens/combat.js, through the CSS variable --phc-k) and toasts in a fight.
//
//   Normal (the default): every battle duration × 1/0.85 ≈ 1.176 (about 15% slower than Fast).
//   Fast: exactly the timings the game had before this setting (× 1).
//
// The spotlight cut-in's own slow-mo on the special action (tempo 0.85, fx/dom.ts withTempo) stacks on top of this.
// The settings cog (game/settings.tsx, Combat tab) calls setCombatSpeed; anything may listen to the window event 'phc:combat-speed'
// (detail: { speed }). The change applies at once, no reload. Outside a fight the pace is 1 (the area map, the title).
export type CombatSpeed = 'normal' | 'fast';
export const COMBAT_SPEED_KEY = 'phc.combatSpeed';
export const EV_COMBAT_SPEED = 'phc:combat-speed';
/** The same event name under the settings cog's name for it (game/settings.tsx). */
export const COMBAT_SPEED_EVENT = EV_COMBAT_SPEED;
/** Normal plays at this rate of Fast (durations ÷ it). */
export const NORMAL_RATE = 0.85;

/** The duration multiplier for a speed: normal 1/0.85 ≈ 1.176, fast 1. Pure (tests). */
export function combatTempo(speed: CombatSpeed | string | null | undefined): number {
  return speed === 'fast' ? 1 : 1 / NORMAL_RATE;
}
const valid = (v: unknown): CombatSpeed => (v === 'fast' ? 'fast' : 'normal');

let cached: CombatSpeed | null = null;
/** The player's combat speed (localStorage 'phc.combatSpeed'; 'normal' when unset or unreadable). */
export function getCombatSpeed(): CombatSpeed {
  if (cached) return cached;
  let v: unknown = null;
  try { v = typeof localStorage !== 'undefined' ? localStorage.getItem(COMBAT_SPEED_KEY) : null; } catch { /* */ }
  return (cached = valid(v));
}
/** Set the combat speed: stored, applied at once, and announced on window 'phc:combat-speed'. */
export function setCombatSpeed(v: CombatSpeed): void {
  const s = valid(v);
  try { localStorage.setItem(COMBAT_SPEED_KEY, s); } catch { /* */ }
  cached = s; applyCss();
  try { window.dispatchEvent(new CustomEvent(EV_COMBAT_SPEED, { detail: { speed: s } })); } catch { /* */ }
}

// ---------- in a fight or not ----------
let battle = false;
/** Called by the effects layer (fx/play.ts setContext) with whether a fight is on screen. */
export function setInBattle(on: boolean) { if (battle === on) return; battle = on; applyCss(); }
export const inBattle = () => battle;
/** The multiplier every battle timing goes through now: the speed's in a fight, 1 elsewhere. */
export const battlePace = (): number => (battle ? combatTempo(getCombatSpeed()) : 1);
/** The pace for something that only ever plays in a fight (the turn banners, the your-turn card, the combat screen's
 *  own motion): the speed's multiplier, without waiting for the effects layer to say a fight is on screen. */
export const fightPace = (): number => combatTempo(getCombatSpeed());
/** ms at the battle pace (a convenience for timers and CSS strings). */
export const paced = (ms: number): number => ms * battlePace();

/** The CSS side: --phc-k on <html>, the fight pace (combat.js writes its animation times as calc(… * var(--phc-k, 1));
 *  only the combat screen uses it). */
function applyCss() {
  try { if (typeof document !== 'undefined') document.documentElement.style.setProperty('--phc-k', String(Math.round(fightPace() * 10000) / 10000)); } catch { /* */ }
}

if (typeof window !== 'undefined') {
  // Another tab, or a script that wrote the key itself and fired the event: read it again.
  window.addEventListener(EV_COMBAT_SPEED, (e: Event) => { const d = (e as CustomEvent).detail; cached = d && d.speed ? valid(d.speed) : null; applyCss(); });
  window.addEventListener('storage', (e: StorageEvent) => { if (e.key === COMBAT_SPEED_KEY || e.key === null) { cached = null; applyCss(); } });
  applyCss();
  // For the e2e suites and devtools (combat-speed.mjs): read and set it as the Settings UI does.
  (window as any).__phcCombatSpeed = { get: getCombatSpeed, set: setCombatSpeed };
}
