// Routes between the screens. Each screen is a prototype template plus its logic (src/screens/*), rendered by the
// Design Component runtime (src/dc/runtime.tsx). A thin bar shows the connection and any rule message.
import React from 'react';
import { makeScreen } from './dc/runtime';
import { expand } from './screens/shared';
import { getState, subscribe, type Screen } from './game/store';
import createT from './templates/create.template.html?raw';
import roomT from './templates/room.template.html?raw';
import mainT from './templates/main.template.html?raw';
import combatT from './templates/combat.template.html?raw';
import levelupT from './templates/levelup.template.html?raw';
import ultimateT from './templates/ultimate.template.html?raw';
import { CreateLogic } from './screens/create';
import { RoomLogic } from './screens/room';
import { MainLogic } from './screens/main';
import { CombatLogic } from './screens/combat';
import { expandLayout } from './game/combatLayout';
import { LevelUpLogic } from './screens/levelup';
import { UltimateLogic } from './screens/ultimate';
import { Music } from './game/music';
import { Title } from './title/Title';
import { installButtonSounds, sfx, sfxForLine, hasSfx, reducedMotion, onUiPrefs } from './game/sfx';
import { MemoryPanel } from './game/memory';
import { VotePanel } from './game/vote';
import { NarratorVoice } from './game/narratorVoice';
import { onVoice } from './game/voice';
import { poke } from './game/store';
import { PlaytestTools } from './game/report';
import { Tips } from './game/tips';
import { StoryScroll } from './game/storyScroll';
import { FxLayer } from './game/fx/FxLayer';
import { TurnIntro, cue } from './game/turnIntro';
import { usePresence, presenceCls, COMBAT_IN_MS } from './game/presence';
import { SandboxPanel } from './game/sandbox';
import { playCreateMusic, stopCreateMusic } from './game/createMusic';
import { MissionLayer } from './game/missionBoard';

const SCREENS: Record<Screen, React.ComponentType<any>> = {
  home: Title as any,
  create: makeScreen(expand(createT), CreateLogic as any),
  room: makeScreen(expand(roomT), RoomLogic as any),
  main: makeScreen(expand(mainT), MainLogic as any),
  combat: makeScreen(expandLayout(expand(combatT)), CombatLogic as any),
  levelup: makeScreen(expand(levelupT), LevelUpLogic as any),
  ultimate: makeScreen(expand(ultimateT), UltimateLogic as any),
};

onVoice(poke);
installButtonSounds();
export function App() {
  const st = React.useSyncExternalStore(subscribe, getState);
  const Screen = SCREENS[st.screen];
  const tr = useScreenTransition(st.screen, st.game?.phase);
  // --- SOUNDS FROM LOG LINES (owned by the FX pass) ---
  // Combat and area-map sounds now come from the engine's presentation events, played by the effects layer (game/fx)
  // in sync with what is seen. Log lines only sound for a fight or a story that has no events at all: a save from
  // before the effects existed. Keyed on the last line's id (the story is capped at 400 lines); a newly loaded or
  // joined game is synced silently.
  const cbLog = st.game?.combat?.log || [], cbN = cbLog.length, ents = st.game?.story.entries || [], lastId = ents[ents.length - 1]?.id;
  const heard = React.useRef<{ cb: number; st?: string; fight?: string; over: boolean; code?: string }>({ cb: 0, over: false });
  React.useEffect(() => {
    const h = heard.current, g = st.game;
    if (!g) { heard.current = { cb: 0, over: false }; return; }
    const cb = g.combat, now = { cb: cbN, st: lastId, fight: cb?.name, over: !!cb?.over, code: g.code };
    if (h.code !== g.code) { heard.current = now; return; }
    const fresh = !!cb && (h.fight !== cb.name || cbN < h.cb || (h.over && !cb.over)), from = fresh ? 0 : h.cb;
    if (cb && !cb.fx && cbN > from) cbLog.slice(from).filter(hasSfx).slice(-4).forEach((l, k) => setTimeout(() => sfxForLine(l), k * 140));
    if (lastId && lastId !== h.st && !g.story.fx) { const at = h.st ? ents.findIndex((e) => e.id === h.st) : -1; const add = at >= 0 ? ents.slice(at + 1) : [];
      add.filter((e) => e.act && hasSfx(e.text)).slice(-3).forEach((e, k) => setTimeout(() => sfxForLine(e.text), k * 140)); }
    heard.current = now;
  }, [cbN, lastId, st.game?.code, st.game?.combat?.name]);
  // --- END SOUNDS FROM LOG LINES ---
  // A refused action gets the error sound.
  React.useEffect(() => { if (st.toast && !st.toast.ok) sfx('error'); }, [st.toast?.at]);
  React.useEffect(() => { window.scrollTo(0, 0); }, [st.screen]);
  // Character creation has its own theme, "Intake" (fades in on arrival, out on leaving).
  React.useEffect(() => { if (st.screen === 'create') playCreateMusic(); else stopCreateMusic(); }, [st.screen]);
  const n = st.game?.story.entries.length || 0;
  const bar = st.role && st.conn !== 'online' ? (st.conn === 'host-away' ? 'The host is offline. Your screen will update when they return.' : st.conn === 'error' ? 'Can\'t join: ' + (st.connNote || 'connection refused') : 'Connecting to room ' + st.code + '…') : null;
  const barP = usePresence(bar), toastP = usePresence(st.toast);
  return (
    <>
      {/* key: a fresh logic instance per screen and character, so local state never leaks between them */}
      <div key={'w' + st.screen} ref={tr.wrap} className={tr.inCls || undefined}><Screen key={st.screen + (st.levelupChar || '')} tick={st} /></div>
      {/* The screen that just left: a frozen copy playing its out animation (never clickable). */}
      <div ref={tr.ghostHolder} aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 55, pointerEvents: 'none', overflow: 'hidden', display: tr.ghost ? 'block' : 'none' }} />
      {tr.ghost === 'combat-in' && !reducedMotion() && <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 56, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: '#FFFFFF', animation: 'phcFlash .5s ease-out .3s both' }} />
        <div style={{ position: 'absolute', top: '-20%', bottom: '-20%', left: '30%', width: '22%', background: 'linear-gradient(90deg, transparent, rgba(246, 81, 87, 0.85) 40%, #FFFFFF 50%, rgba(246, 81, 87, 0.85) 60%, transparent)', animation: 'phcSlash .5s cubic-bezier(.5,0,.3,1) .22s both' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', transform: 'translateY(-50%)', display: 'grid', placeItems: 'center', animation: 'phcFlash .7s ease-out .25s both' }}>
          <span style={{ padding: '10px 36px', background: '#0A0D13', borderTop: '3px solid #F65157', borderBottom: '3px solid #F65157', color: '#FFFFFF', fontFamily: "'Chakra Petch', sans-serif", fontSize: 'clamp(28px, 6vw, 64px)', fontWeight: 700, letterSpacing: '0.3em', fontStyle: 'italic' }}>COMBAT</span>
        </div>
      </div>}
      {st.role && <Music game={st.game || null} meId={st.me.id} isHost={st.role === 'host'} />}
      {st.role && <NarratorVoice game={st.game || null} />}
      {st.role && <VotePanel game={st.game || null} meId={st.me.id} isHost={st.role === 'host'} />}
      {st.role === 'host' && <MemoryPanel game={st.game || null} isHost side={st.game?.phase === 'combat' ? 'left' : 'right'} />}
      {st.screen === 'main' && <StoryScroll count={n} lastId={lastId} busy={!!st.game?.narrator.busy} />}
      {st.role && <FxLayer game={st.game || null} screen={st.screen} />}
      {st.role && <TurnIntro game={st.game || null} meId={st.me.id} screen={st.screen} />}
      {st.role && <SandboxPanel game={st.game || null} meId={st.me.id} isHost={st.role === 'host'} screen={st.screen} />}
      {st.role && <MissionLayer game={st.game || null} screen={st.screen} />}
      <PlaytestTools />
      <Tips />
      {barP.shown && <div role="status" className={presenceCls('phc-a-drop', barP.closing)} style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60, padding: '8px 16px', background: '#1C2536', borderBottom: '1px solid #2E3A50', color: '#E7EBF3', fontSize: 13, textAlign: 'center' }}>{barP.shown}</div>}
      {toastP.shown && <div style={{ position: 'fixed', bottom: 20, left: 0, right: 0, zIndex: 70, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
        <div key={toastP.shown.at} role={toastP.shown.ok ? 'status' : 'alert'} className={presenceCls('phc-a-rise', toastP.closing)} style={{ pointerEvents: 'auto', maxWidth: 'min(640px, 92vw)', padding: '12px 18px', borderRadius: 10, background: '#10151F', border: '1px solid ' + (toastP.shown.ok ? '#6FEA77' : '#F65157'), color: '#E7EBF3', fontSize: 14, boxShadow: '0 8px 30px rgba(0,0,0,.5)' }}>{toastP.shown.ok ? '✓ ' : ''}{toastP.shown.text}</div>
      </div>}
    </>
  );
}

// ---------- screen transitions (the transitions pass) ----------
// Every screen change animates: the new screen mounts at once (input is never held), and a frozen copy of the old
// one plays its out animation on top, never clickable. Kinds:
//   forward: old out to the left, new in from the right · back to the title: the reverse
//   combat-in (the story turns into a fight, for everyone, from the shared game state): the old screen blurs and
//     darkens, a red slash and a white flash, then the fight flips in; a sting plays; music.tsx starts the fight music
//     after it (COMBAT_IN_MS)
//   combat-out (back to the story): the fight blurs and fades, the story rises in softly
// Reduce motion: plain fades, no flip, no blur.
type Ghost = null | 'forward' | 'back' | 'combat-in' | 'combat-out';
const GHOST_CLS: Record<Exclude<Ghost, null>, string> = { forward: 'phc-slide-out-left', back: 'phc-slide-out-right', 'combat-in': 'phc-combat-ghost', 'combat-out': 'phc-story-ghost' };
const IN_CLS: Record<Exclude<Ghost, null>, string> = { forward: 'phc-slide-in-right', back: 'phc-slide-in-left', 'combat-in': 'phc-combat-in', 'combat-out': 'phc-story-in' };
// combat-in keeps its holder up until the slash and the COMBAT title are done (the copy itself is gone by 620 ms).
const GHOST_MS: Record<Exclude<Ghost, null>, number> = { forward: 340, back: 340, 'combat-in': COMBAT_IN_MS, 'combat-out': 520 };
const IN_MS: Record<Exclude<Ghost, null>, number> = { forward: 450, back: 450, 'combat-in': COMBAT_IN_MS, 'combat-out': 780 };

/** A CSS animation on the old screen when it was copied: [element index (−1: the root), name, pseudo-element, time]. */
type AnimRec = [number, string, string | null, number | null];
const indexOf = (root: HTMLElement) => { const m = new Map<Element, number>([[root, -1]]); root.querySelectorAll('*').forEach((el, i) => m.set(el, i)); return m; };
const animKey = (i: number | undefined, name: string, pseudo: string | null | undefined) => i + '|' + name + '|' + (pseudo || '');
function cssAnims(root: HTMLElement): { a: Animation; key: string }[] {
  if (typeof root.getAnimations !== 'function') return [];
  const idx = indexOf(root), out: { a: Animation; key: string }[] = [];
  for (const a of root.getAnimations({ subtree: true })) {
    const name = (a as any).animationName as string | undefined, ef = a.effect as KeyframeEffect | null;
    if (!name || !ef || !ef.target || !idx.has(ef.target)) continue; // Web Animations (the page shake) aren't copied
    out.push({ a, key: animKey(idx.get(ef.target), name, ef.pseudoElement) });
  }
  return out;
}
/** The old screen's CSS animations and how far along each one was. */
export function animsOf(root: HTMLElement): AnimRec[] {
  return cssAnims(root).map(({ a, key }) => { const [i, name, pseudo] = key.split('|'); return [Number(i), name, pseudo || null, a.currentTime == null ? null : Number(a.currentTime)] as AnimRec; });
}
/** The copy's CSS animations, set to where the old screen's were (finished ones jump to their end, never replay). */
export function carryAnims(copy: HTMLElement, rec: AnimRec[]) {
  const was = new Map(rec.map(([i, n, p, t]) => [animKey(i, n, p), t]));
  const seen: { name: string; t: number | null }[] = [];
  for (const { a, key } of cssAnims(copy)) {
    if (was.has(key)) { const t = was.get(key); if (t != null) a.currentTime = t; }
    else { try { a.finish(); } catch { a.cancel(); } } // done before the copy (no fill): end it; an endless one just stops
    seen.push({ name: (a as any).animationName, t: a.currentTime == null ? null : Number(a.currentTime) });
  }
  (globalThis as any).__phcGhostAnims = seen; // for the e2e (the copy lives in a closed shadow root)
}
const roots = new WeakMap<HTMLElement, ShadowRoot | HTMLElement>();
/** The holder's closed shadow root (made once), or the holder itself where shadow DOM is missing. */
function ghostRoot(holder: HTMLElement): ShadowRoot | HTMLElement {
  let r = roots.get(holder);
  if (!r) { try { r = holder.attachShadow({ mode: 'closed' }); } catch { r = holder; } roots.set(holder, r); }
  return r;
}
function useScreenTransition(screen: Screen, phase: string | undefined) {
  const wrap = React.useRef<HTMLDivElement>(null), ghostHolder = React.useRef<HTMLDivElement>(null);
  const prev = React.useRef(screen), kind = React.useRef<Ghost>(null), snap = React.useRef<{ node: HTMLElement; y: number; scrolls: [number, number, number][]; anims: AnimRec[] } | null>(null);
  const [ghost, setGhost] = React.useState<Ghost>(null), [inCls, setInCls] = React.useState('');
  // combat-in is for a fight that has just begun (the phase turned to combat), not for going back to a fight already on
  // (the combat header's STORY tab and back): the flag is raised when the phase changes and spent by the next screen change.
  const lastPhase = React.useRef(phase), fightBegan = React.useRef(false);
  if (lastPhase.current !== phase) { if (phase === 'combat') fightBegan.current = true; else if (lastPhase.current === 'combat') fightBegan.current = false; lastPhase.current = phase; }
  // Decided during render, before React swaps the screens, so the old screen's DOM can still be copied.
  if (prev.current !== screen) {
    const from = prev.current; prev.current = screen;
    const began = fightBegan.current; fightBegan.current = false;
    const k: Ghost = screen === 'combat' && phase === 'combat' && began && (from === 'main' || from === 'room' || from === 'create') ? 'combat-in'
      : from === 'combat' && screen === 'main' ? 'combat-out' : screen === 'home' ? 'back' : 'forward';
    kind.current = k; snap.current = null;
    const old = wrap.current;
    // The title animates its own way out; a hidden tab skips the copy (nothing would be seen).
    if (old && from !== 'home' && typeof document !== 'undefined' && !document.hidden) {
      try {
        const all = old.querySelectorAll('*'), scrolls: [number, number, number][] = [];
        all.forEach((el, i) => { if (el.scrollTop || el.scrollLeft) scrolls.push([i, el.scrollTop, el.scrollLeft]); });
        snap.current = { node: old.cloneNode(true) as HTMLElement, y: window.scrollY, scrolls, anims: animsOf(old) };
      } catch { snap.current = null; }
    }
  }
  React.useLayoutEffect(() => {
    const k = kind.current; if (!k) return; kind.current = null;
    const holder = ghostHolder.current, s = snap.current; snap.current = null;
    const rm = reducedMotion();
    if (k === 'combat-in') { cue('combat_in'); }
    if (k === 'combat-out') { cue('combat_out'); }
    setInCls(IN_CLS[k]);
    const tIn = setTimeout(() => setInCls(''), (rm ? 200 : IN_MS[k]) + 60);
    let tG: ReturnType<typeof setTimeout> | undefined;
    const root = holder ? ghostRoot(holder) : null;
    if (root && s) {
      // The copy lives in a closed shadow root: page queries (tests, getElementById) never find a second copy of the
      // screen. The page's stylesheets are copied in, so it looks the same.
      const box = document.createElement('div');
      if (rm) box.style.animation = 'phcFadeOut .15s ease-in both'; else box.className = GHOST_CLS[k];
      box.style.position = 'absolute'; box.style.left = '0'; box.style.right = '0'; box.style.top = '0'; box.style.transformOrigin = '50% 40%'; box.style.marginTop = -s.y + 'px';
      box.appendChild(s.node);
      root.replaceChildren(...[...document.querySelectorAll('style, link[rel="stylesheet"]')].map((n) => n.cloneNode(true)), box);
      try { const all = s.node.querySelectorAll('*'); for (const [i, t, l] of s.scrolls) { const el = all[i] as HTMLElement | undefined; if (el) { el.scrollTop = t; el.scrollLeft = l; } } } catch { /* */ }
      // A copy restarts every CSS animation from zero (the Approved stamp slammed twice, cards rose in again): carry
      // each one on from where it was, and end the ones that had already finished.
      // The holder shows now, not on the next render: under display none there is no animation to carry.
      if (holder) holder.style.display = 'block';
      try { carryAnims(s.node, s.anims); } catch { /* */ }
      setGhost(k);
      tG = setTimeout(() => { root.replaceChildren(); setGhost(null); }, rm ? 180 : GHOST_MS[k]);
    } else { root?.replaceChildren(); setGhost(k === 'combat-in' && !rm ? k : null); if (k === 'combat-in' && !rm) tG = setTimeout(() => setGhost(null), GHOST_MS[k]); }
    return () => { clearTimeout(tIn); if (tG) clearTimeout(tG); root?.replaceChildren(); setGhost(null); };
  }, [screen]);
  // Reduce motion is a class on <html> (main.tsx's motion CSS reads it).
  React.useEffect(() => { const f = () => document.documentElement.classList.toggle('phc-reduce', reducedMotion()); f(); return onUiPrefs(f); }, []);
  return { wrap, ghostHolder, ghost, inCls };
}
