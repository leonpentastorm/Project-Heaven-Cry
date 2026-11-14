// Rules 1.46: the place this browser walked out of ('To the path map ›'; closed on this screen only, the squad walks on
// from the map). Kept here, not in a component: the middle (RunScreen.tsx) and the right panel's phase control
// (runPanels.tsx) both read and close it. Keyed by the run's seed and the visited node: node ids repeat from run to run.
import type { RunState } from '@engine';
import { poke } from './store';

let closedKey: string | null = null;
const visitKey = (r: RunState | null | undefined): string | null => (r && r.visit?.node ? r.seed + '|' + r.visit.node : null);
/** This visit's place was closed here. */
export const placeClosed = (r: RunState | null | undefined): boolean => closedKey !== null && closedKey === visitKey(r);
/** Close this visit's place here (the place's leave button, the right panel's 'To the path map ›'). */
export function closePlace(r: RunState | null | undefined) { closedKey = visitKey(r); poke?.(); }
