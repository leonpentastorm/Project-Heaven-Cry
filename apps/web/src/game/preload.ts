// The art preloader (docs/design/title-screen.md, section 8, "The title comes up at once"). The title screen shows at
// once; this only warms the browser's cache behind it, so a screen's pictures are there when the player reaches it.
//  · First, only what the title itself draws (Title.tsx TITLE_ART), several at a time.
//  · Then everything else, a few at a time and at low priority, in the order a player meets it (MEET_ORDER): the lobby,
//    character creation, the first mode's screens, then the rest; the small sizes before the zoom sizes.
// Nothing waits on it: an <img> whose file is not in yet shows its usual fallback and swaps in when it lands. The set of
// files is the one the old loading screen fetched (every asset but the painted gear's -lg sizes, which a screen loads
// when it shows one), under the same names.
import ASSETS from './assets.json';

/** After the title, the art in the order a player meets it: groups of asset-name prefixes (art/catalog.json ids). Art
 *  that no group names comes after them all. */
export const MEET_ORDER: string[][] = [
  ['emblem-', 'world-', 'survival-card'], // the lobby: the seal, the mode cards
  ['char-', 'skill-', 'wick-trait-'], // character creation: the portraits and archetypes, the skills, the traits
  ['survival-', 'gear-', 'kit-', 'sprite-'], // Survival: the path map, its markers and backdrops, the camp's and the shop's gear, the fight's kit
];
const isLarge = (k: string) => k.endsWith('-lg') || k.endsWith('-xl');
/** The painted gear's zoom sizes load only when a screen shows one (game/gearIcons.ts), as before. */
const preloaded = (k: string) => !(k.startsWith('gear-') && isLarge(k));

/** The asset names in loading order: the title's own first, then the rest by MEET_ORDER, small sizes before large. Pure. */
export function preloadPlan(assets: Record<string, string>, first: string[], order: string[][] = MEET_ORDER): { first: string[]; rest: string[] } {
  const keys = Object.keys(assets).filter(preloaded), head = first.filter((k) => k in assets && preloaded(k)), inHead = new Set(head);
  const rank = (k: string) => { const i = order.findIndex((g) => g.some((p) => k.startsWith(p))); return i < 0 ? order.length : i; };
  const rest = keys.filter((k) => !inHead.has(k)).map((k, i) => ({ k, i, big: isLarge(k) ? 1 : 0, r: rank(k) }))
    .sort((a, b) => a.big - b.big || a.r - b.r || a.i - b.i).map((x) => x.k);
  return { first: head, rest };
}

/** Load these files into the browser's cache, `at` at a time; a file that fails counts as done. */
function warm(urls: string[], at: number, low: boolean, onOne: () => void): Promise<void> {
  let next = 0;
  const one = (): Promise<void> => {
    if (next >= urls.length) return Promise.resolve();
    const img = new Image() as HTMLImageElement & { fetchPriority?: string };
    if (low) img.fetchPriority = 'low';
    img.decoding = 'async';
    const done = new Promise<void>((ok) => { img.onload = () => ok(); img.onerror = () => ok(); });
    img.src = urls[next++];
    return done.then(() => { onOne(); return one(); });
  };
  return Promise.all(Array.from({ length: Math.min(at, urls.length) }, one)).then(() => {});
}

/** How long the rest waits for the title's own art before it starts anyway (ms). */
const TITLE_WAIT_MS = 3000;
let started = false;
/** Start the preload (once per page): the title's art (asset names), then the rest in the background. */
export function startPreload(titleArt: string[]) {
  if (started || typeof window === 'undefined') return; started = true;
  const A = ASSETS as Record<string, string>, plan = preloadPlan(A, titleArt);
  const state = { first: plan.first.length, rest: plan.rest.length, done: 0, titleDone: false };
  (window as any).__phcPreload = state; // for the browser checks (title.mjs)
  const tick = () => { state.done++; };
  const head = warm(plan.first.map((k) => A[k]), 6, false, tick).then(() => { state.titleDone = true; });
  Promise.race([head, new Promise<void>((ok) => setTimeout(ok, TITLE_WAIT_MS))]).then(() => warm(plan.rest.map((k) => A[k]), 4, true, tick));
}
