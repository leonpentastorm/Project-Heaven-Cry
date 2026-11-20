// The preloader (docs/design/title-screen.md, section 8, "The title comes up at once"; the roadmap's "Preloader: wait
// for load, only the next screen's art"). The title screen shows at once; this only warms the browser's cache:
//  · First, only what the title itself draws (Title.tsx TITLE_ART), several at a time.
//  · Nothing else starts before the page has loaded (the window's load event, and the title's art or TITLE_WAIT_MS):
//    the page's own code, fonts and title art never compete with art the player may not see for minutes.
//  · Then only the next screens' code and art: on every screen the player reaches (App.tsx calls warmNext), the code
//    chunks of the screens they can reach from it (screenLoad.ts; from the load event on: a screen waits for its chunk)
//    and their art (NEXT, SCREEN_ART; once the title's art is in too), a few files at a time at low priority, small
//    sizes only. A screen change replaces what was still waiting: the player has
//    moved on. Art no screen names here loads when a screen shows it, as every <img> does.
// Nothing waits on it: an <img> whose file is not in yet shows its usual fallback and swaps in when it lands.
import ASSETS from './assets.json';
import type { Screen } from './store';
import { loadScreen, loadSandbox } from '../screenLoad';

/** The screens a player can reach from each one (where the art and code are warmed ahead). */
export const NEXT: Record<Screen, Screen[]> = {
  home: ['room', 'create'],
  room: ['create', 'main'],
  create: ['room', 'main'],
  main: ['combat', 'levelup'],
  run: ['combat', 'levelup'],
  combat: ['main', 'levelup', 'ultimate'],
  levelup: ['main', 'combat'],
  ultimate: ['main', 'combat'],
};
/** Code reached from a screen beyond NEXT's (its chunk only, not its art): the title's Continue and the Proving Ground
 *  open the play screen straight away. */
export const CODE_NEXT: Partial<Record<Screen, Screen[]>> = { home: ['main'] };
/** The art each screen draws (asset-name prefixes: art/catalog.json ids), the part worth warming ahead. */
export const SCREEN_ART: Record<Screen, string[]> = {
  home: ['title-', 'wick-run', 'wick-stop', 'wick-idle', 'wick-hello', 'wick-wave', 'wick-welcome'],
  room: ['emblem-', 'world-', 'survival-card', 'roguelike-'],
  create: ['char-arch-', 'skill-', 'wick-trait-', 'class-', 'patron-'],
  main: ['survival-', 'camp-', 'shop-', 'place-', 'boon-', 'forge-', 'rest-', 'shrine-', 'train', 'crossroads-', 'event-', 'gear-'],
  run: [],
  combat: ['kit-', 'sprite-', 'cond-', 'tech-', 'move-', 'call-', 'door-'],
  levelup: ['skill-', 'wick-perk-', 'door-', 'class-'],
  ultimate: ['skill-', 'wick-perk-'],
};
const isLarge = (k: string) => k.endsWith('-lg') || k.endsWith('-xl');

/** The asset names a screen's next screens draw (small sizes, each once, in NEXT's order), minus those in `skip`. Pure. */
export function nextArt(assets: Record<string, string>, screen: Screen, skip: ReadonlySet<string> = new Set()): string[] {
  const keys = Object.keys(assets).filter((k) => !isLarge(k)), out: string[] = [], seen = new Set(skip);
  for (const s of NEXT[screen] || []) for (const p of SCREEN_ART[s === 'run' ? 'main' : s]) for (const k of keys) if (k.startsWith(p) && !seen.has(k)) { seen.add(k); out.push(k); }
  return out;
}
/** The title's own art, as asset names in the build. Pure. */
export const titlePlan = (assets: Record<string, string>, first: string[]) => first.filter((k) => k in assets);

/** Load one file into the browser's cache; a file that fails counts as done. */
function warmOne(url: string, low: boolean): Promise<void> {
  const img = new Image() as HTMLImageElement & { fetchPriority?: string };
  if (low) img.fetchPriority = 'low';
  img.decoding = 'async';
  const done = new Promise<void>((ok) => { img.onload = () => ok(); img.onerror = () => ok(); });
  img.src = url;
  return done;
}
/** Load these files, `at` at a time. */
function warmAll(urls: string[], at: number, onOne: () => void): Promise<void> {
  let next = 0;
  const one = (): Promise<void> => (next >= urls.length ? Promise.resolve() : warmOne(urls[next++], false).then(() => { onOne(); return one(); }));
  return Promise.all(Array.from({ length: Math.min(at, urls.length) }, one)).then(() => {});
}

/** How long the rest waits for the title's own art before it starts anyway (ms). */
const TITLE_WAIT_MS = 3000;
/** Files warmed at once: the title's own art, and the next screens' behind a screen. */
const AT_FIRST = 6, AT_NEXT = 4;
const P = { started: false, loaded: false, ready: false, warmed: new Set<string>(), queue: [] as string[], running: 0, screen: 'home' as Screen };
/** For the browser checks (title.mjs): the title's files, the files queued since, how many are in, and the screen. */
const state = { first: 0, rest: 0, done: 0, titleDone: false, ready: false, screen: 'home' as Screen };
function pump() {
  const A = ASSETS as Record<string, string>;
  while (P.ready && P.running < AT_NEXT && P.queue.length) {
    const k = P.queue.shift()!; P.running++;
    warmOne(A[k], true).then(() => { state.done++; P.running--; pump(); });
  }
}
/** The next screens' code chunks, once the page has loaded (small, and a screen waits for its chunk: never held for art). */
function warmCode(screen: Screen) {
  if (!P.loaded) return;
  for (const s of [...(NEXT[screen] || []), ...(CODE_NEXT[screen] || [])]) loadScreen(s).catch(() => { /* loaded again when the screen is reached */ });
  if (screen === 'home' || screen === 'room') loadSandbox().catch(() => { /* the Proving Ground opens from both */ });
}
/** Warm what the player can reach next from this screen: the screens' code once the page has loaded, then their art
 *  once the title's art is in too (replacing the art still waiting from the screen before). */
export function warmNext(screen: Screen) {
  P.screen = screen; state.screen = screen;
  warmCode(screen);
  if (!P.ready) return;
  P.queue.forEach((k) => P.warmed.delete(k)); // (dropped from the queue: warmed later if a screen asks again)
  const add = nextArt(ASSETS as Record<string, string>, screen, P.warmed);
  add.forEach((k) => P.warmed.add(k));
  P.queue = add; state.rest += add.length;
  pump();
}
/** Start the preloader (once per page): the title's art at once, then, once the page has loaded, the next screens'. */
export function startPreload(titleArt: string[]) {
  if (P.started || typeof window === 'undefined') return; P.started = true;
  const A = ASSETS as Record<string, string>, first = titlePlan(A, titleArt);
  first.forEach((k) => P.warmed.add(k));
  state.first = first.length;
  (window as any).__phcPreload = state;
  const head = warmAll(first.map((k) => A[k]), AT_FIRST, () => { state.done++; }).then(() => { state.titleDone = true; });
  const loaded = document.readyState === 'complete' ? Promise.resolve() : new Promise<void>((ok) => window.addEventListener('load', () => ok(), { once: true }));
  loaded.then(() => { P.loaded = true; warmCode(P.screen); });
  Promise.all([loaded, Promise.race([head, new Promise<void>((ok) => setTimeout(ok, TITLE_WAIT_MS))])]).then(() => {
    P.ready = true; state.ready = true; warmNext(P.screen);
  });
}
