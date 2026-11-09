// Spotlight cut-ins (docs/design/cutin-spec.md, decision 110): the client door and the one overlay's state.
//
// Two doors, one look. Anything every player should see goes through the ENGINE door (packages/engine/src/spotlight.ts
// spotlight(g, {...}) on the host: a 'spotlight' fx event in the shared state). This file is the CLIENT door, for this
// browser only (previews, the Proving Ground's test button, devtools):
//
//   import { showCutIn } from './game/cutin';
//   showCutIn({ kind: 'god', strips: [stripForPatron('nerukhan')!], label: 'NERUKHAN', caption: 'Speaks' })
//     → Promise<'shown' | 'skipped' | 'off'>                 resolves when it has cleared
//   window.dispatchEvent(new CustomEvent('phc:cutin', { detail: spec }))     the same, from .js screens and devtools
//   window.dispatchEvent(new CustomEvent('phc:cutin', { detail: { kind: 'god', patron: 'nerukhan', char, line } }))
//                                                            a shorthand: the strips are built here (patron, char, group)
// Out: 'phc:cutin-start' {id, kind} and 'phc:cutin-end' {id, kind, skipped}.
//
// showCutIn honours the player's Settings (All / Once per scene / Off) and reduced motion. It never slows anything: only
// the effects queue does, for a fight's own stream (fx/play.ts).
import type { FxEvent, GameState } from '@engine';
import { uiPrefs, reducedMotion, sfx, SFX_FILES, type Sfx } from '../sfx';
import { getState } from '../store';
import { type CutInSpec, type CutInStrip, cutInFromFx, stripForChar, stripForPatron, patronData } from './spec';
import { CUTIN_MS, CUTIN_MAX_MS, CUTIN_SKIP_MS, holdUntil } from './timing';

export * from './spec';
export * from './timing';
export const EV_CUTIN = 'phc:cutin', EV_CUTIN_START = 'phc:cutin-start', EV_CUTIN_END = 'phc:cutin-end';
export type CutInResult = 'shown' | 'skipped' | 'off';

// ---------- the player's setting (All / Once per scene / Off) ----------
export const cutinPref = (): 'all' | 'scene' | 'off' => { const v = (uiPrefs() as any).cutins; return v === 'scene' || v === 'off' ? v : 'all'; };
const SEEN_KEY = 'phc.cutins.';
/** Strips already shown this scene (Once per scene), kept per game code in sessionStorage. */
function seenOf(code: string): Record<string, string[]> { try { return JSON.parse(sessionStorage.getItem(SEEN_KEY + code) || '{}') || {}; } catch { return {}; } }
function saveSeen(code: string, v: Record<string, string[]>) { try { sessionStorage.setItem(SEEN_KEY + code, JSON.stringify(v)); } catch { /* */ } }
/**
 * Apply the setting to a spec: Off → null; Once per scene → only the strips not yet shown in its scene (and they are
 * marked shown); null when none are left. Pure apart from the sessionStorage memory.
 */
export function applyPref(spec: CutInSpec | null, code: string, pref = cutinPref()): CutInSpec | null {
  if (!spec || pref === 'off' || !spec.strips.length) return null;
  if (pref !== 'scene' || !spec.scene) return spec;
  const all = seenOf(code), had = new Set(all[spec.scene] || []);
  const strips = spec.strips.filter((s) => !had.has(s.key));
  if (!strips.length) return null;
  for (const s of strips) had.add(s.key);
  // Only the current scene and the one before are kept.
  const keep = Object.keys(all).filter((k) => k !== spec.scene).slice(-1);
  saveSeen(code, { ...Object.fromEntries(keep.map((k) => [k, all[k]])), [spec.scene]: [...had] });
  return { ...spec, strips };
}

/** The cut-in for a moment from the engine's spotlight events (one action or one state update), after this player's
 *  setting. slow: whether a fight's action after it plays slowed (never under reduced motion). */
export function cutInForFx(g: GameState | null | undefined, events: FxEvent[], stream = ''): { spec: CutInSpec; slow: boolean } | null {
  const spec = applyPref(cutInFromFx(g, events, stream), g?.code || '');
  return spec ? { spec, slow: !reducedMotion() } : null;
}

// ---------- the overlay's state ----------
export interface Showing { spec: CutInSpec; id: string; t0: number; ms: number; hold: number; rm: boolean; out: boolean; skipped: boolean }
interface Item { spec: CutInSpec; resolve: (r: CutInResult) => void }
let current: (Showing & { resolve: (r: CutInResult) => void; timers: ReturnType<typeof setTimeout>[] }) | null = null;
const queue: Item[] = [];
const subs = new Set<() => void>();
export const onCutIn = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
const notify = () => { for (const f of subs) try { f(); } catch { /* */ } };
export const cutInNow = (): Showing | null => current;
/** Is a cut-in on screen? (The turn intro waits for it.) */
export const cutInActive = () => !!current;
/** When the cut-in on screen will have cleared (performance.now() clock), 0 if none. */
export const cutInUntil = () => (current ? current.t0 + current.ms : 0);
const fire = (name: string, detail: any) => { try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch { /* */ } };

/** For the e2e suites: every cut-in shown ({kind, at, ms, slow, strips, label, caption, skipped, slowed: [{n, k, at}]}). */
export interface CutInLog { id: string; kind: string; at: number; ms: number; end?: number; slow: boolean; strips: string[]; label: string; caption?: string; skipped?: boolean; tempo?: number; slowed: { n: number; k: string; at: number; beat: number }[]; rm: boolean }
const LOG: CutInLog[] = [];
if (typeof window !== 'undefined') {
  (window as any).__phcCutins = LOG;
  (window as any).__phcCutin = { get count() { return LOG.length; }, get last() { return LOG[LOG.length - 1] || null; }, get showing() { return !!current; }, skip: () => skipCutIn() };
}
/** play.ts notes the slowed action's events as they play (the e2e measures them). */
export function noteSlowed(id: string, e: { n: number; k: string }, beat: number, tempo: number) {
  const l = [...LOG].reverse().find((x) => x.id === id); if (!l) return;
  l.slow = true; l.tempo = tempo; l.slowed.push({ n: e.n, k: e.k, at: Math.round(performance.now()), beat: Math.round(beat) });
}

/** The cut-in's sounds: the tear (with a low sting), and for a god the choir under it. */
function sound(spec: CutInSpec) {
  try {
    if ((SFX_FILES as any).spotlight_tear) sfx('spotlight_tear' as Sfx); else { sfx('swish' as Sfx, { rate: 0.8 }); sfx('stamp' as Sfx, { gain: 0.6, delay: 90 }); }
    if (spec.strips.some((s) => s.god)) sfx('soul_choir' as Sfx, { gain: 0.5, rate: 0.85, delay: 60 });
  } catch { /* sound never breaks the game */ }
}

function start(it: Item) {
  const rm = reducedMotion(), n = it.spec.strips.length, god = it.spec.strips.some((s) => s.god);
  const ms = CUTIN_MS(n, god, rm), id = it.spec.id || 'cutin-' + Math.random().toString(36).slice(2, 8);
  const timers: ReturnType<typeof setTimeout>[] = [];
  current = { spec: { ...it.spec, id }, id, t0: performance.now(), ms, hold: holdUntil(n, god, rm), rm, out: false, skipped: false, resolve: it.resolve, timers };
  LOG.push({ id, kind: it.spec.kind, at: Math.round(performance.now()), ms, slow: false, strips: it.spec.strips.map((s) => s.name), label: it.spec.label, caption: it.spec.caption, slowed: [], rm });
  if (LOG.length > 50) LOG.splice(0, LOG.length - 50);
  sound(it.spec);
  fire(EV_CUTIN_START, { id, kind: it.spec.kind });
  timers.push(setTimeout(() => { if (current?.id === id) { current.out = true; notify(); } }, current.hold));
  timers.push(setTimeout(() => finish(id, 'shown'), ms));
  timers.push(setTimeout(() => finish(id, 'shown'), CUTIN_MAX_MS)); // the cap, whatever happens
  notify();
}
function finish(id: string, r: CutInResult) {
  const c = current; if (!c || c.id !== id) return;
  for (const t of c.timers) clearTimeout(t);
  current = null;
  const l = [...LOG].reverse().find((x) => x.id === id); if (l) { l.end = Math.round(performance.now()); l.skipped = r === 'skipped'; }
  fire(EV_CUTIN_END, { id, kind: c.spec.kind, skipped: r === 'skipped' });
  notify();
  c.resolve(r);
  const next = queue.shift(); if (next) start(next);
}
/** Skip the cut-in on screen: straight to its way out (150 ms), then it clears. */
export function skipCutIn() {
  const c = current; if (!c || c.skipped) return;
  c.skipped = true; c.out = true; notify();
  c.timers.push(setTimeout(() => finish(c.id, 'skipped'), CUTIN_SKIP_MS));
}
/** Drop everything (the effects were cleared: the room was left, the tab hidden). */
export function dropCutIns() {
  while (queue.length) queue.shift()!.resolve('off');
  if (current) finish(current.id, 'skipped');
}

/** Show a cut-in in this browser. Honours Settings (Off resolves 'off' at once; Once per scene drops strips already
 *  shown in spec.scene) and a hidden tab. Queued behind one already on screen. */
export function showCutIn(spec: CutInSpec, o: { code?: string; prefApplied?: boolean } = {}): Promise<CutInResult> {
  const s = o.prefApplied ? spec : applyPref(spec, o.code ?? (getState().game?.code || ''));
  if (!s || !s.strips?.length || (typeof document !== 'undefined' && document.hidden)) return Promise.resolve('off');
  return new Promise((resolve) => { const it = { spec: s, resolve }; if (current) queue.push(it); else start(it); });
}

/** The shorthand trigger's spec ({kind:'god', patron, char, line, reason, group}), built from the game on screen. */
export function specFromTrigger(d: any, g: GameState | null = getState().game || null): CutInSpec | null {
  if (!d) return null;
  if (Array.isArray(d.strips)) return d as CutInSpec;
  const ev: any = { n: Date.now(), k: 'spotlight', kind: d.kind || (d.patron ? 'god' : 'crit'), char: d.char ?? null, patron: d.patron ?? null, reason: d.reason || (d.patron ? 'speaks' : ''),
    line: d.line, group: d.group, targetChar: d.targetChar, targetName: d.targetName, tn: d.tn, skill: d.skill, scene: d.scene };
  const spec = cutInFromFx(g, [ev], 'local');
  if (spec) return spec;
  const strips = [stripForPatron(d.patron), stripForChar(g, d.char)].filter(Boolean) as CutInStrip[];
  return strips.length ? { kind: ev.kind, strips, label: d.label || (patronData(d.patron)?.name || '').toUpperCase(), caption: d.caption || d.reason, line: d.line } : null;
}
if (typeof window !== 'undefined') window.addEventListener(EV_CUTIN, (e: Event) => { const s = specFromTrigger((e as CustomEvent).detail); if (s) showCutIn(s); });
