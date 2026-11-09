// The title screen (spec: docs/design/title-screen.md; art: art/briefs/title-screen.md). Full bleed, the painted layers
// (back: sky, city and the Celestial; mid: the battlefield; front: the squad, when the remade one lands) placed by the
// art's safe rect and moved by the pointer, the big title fitted to the window, a menu with Wick as the selector,
// press -> Wick says hello -> slide. Wick is the artist's five clips (art/mascot/wick-anim): run, stop, idle, hello, wave.
import React from 'react';
import { ART } from '../screens/shared';
import { startProvingGround } from '../game/sandbox';
import { forgetSession, getState, go, hostRoom, joinRoom, lastRoom, listSessions, removeFromLibrary, resumeSession, setName, subscribe } from '../game/store';
import { exportCharacter, importCharacter } from '../game/charfile';
import { openReport } from '../game/report';
import { GAME_VERSION } from '../version';
import { sfx, uiPrefs, setUiPrefs, onUiPrefs, reducedMotion } from '../game/sfx';
import { voicePrefs, onVoice, loadVoice, detectInstalled } from '../game/voice';
import { VoiceSettings } from '../game/voiceSettings';
import { resetTips } from '../game/tips';
import { CREDITS } from '../game/credits';
import { playTitleMusic, stopTitleMusic } from '../game/titleMusic';
import { LAYERS, clamp, layerShift, titleGeometry } from './geometry';

type Panel = null | 'name' | 'join' | 'proving' | 'characters' | 'saved' | 'settings' | 'credits';
type Item = { id: string; label: string; sub?: string; start?: boolean; bubble: string; run: () => void };

const ink = { text: '#E7EBF3', muted: '#A3AEC2', dim: '#7F8BA1', line: '#232D3F', panel: 'rgba(13, 17, 25, 0.86)' };
const ago = (t: number) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
const PRESSED = 'phc.pressedAnyKey', BACK_TO = 'phc.titlePanel';
/** A ?room= invite opens Join once per page load, not every time the title comes back. */
let inviteUsed = false;
const toCreate = (draft: any) => { try { sessionStorage.setItem(BACK_TO, 'characters'); } catch { /* */ } go('create', { draft }); };

/** The image set for a layer: 1600, 2560 and 3840 px wide (tools/build_web_assets.py); the browser picks by size. */
const srcSet = (l: string) => [['', 1600], ['-lg', 2560], ['-xl', 3840]].map(([k, w]) => ART('title-' + l + k) && ART('title-' + l + k) + ' ' + w + 'w').filter(Boolean).join(', ');

// ---------- Wick (art/mascot/wick-anim/manifest.json; presentation strips, the hello's jump baked in) ----------
/** Wick's frame on screen, px: the drawing is ~200 of 256, so Wick stands about 47 px tall. */
const F = 60;
type Clip = 'run' | 'stop' | 'idle' | 'hello' | 'wave';
const FRAMES: Record<Clip, number> = { run: 8, stop: 4, idle: 4, hello: 16, wave: 4 };
type Act = 'run' | 'stop' | 'idle' | 'hello' | 'greet';
/** What each act plays: [clip, first frame, last frame, fps, times (0 = loop)]. The press hello is the native 16
 *  frames sped up to fit the slide (the art leaves that to us); the greeting holds the apex with the wave loop. */
type Seg = [Clip, number, number, number, number];
const PROGRAM: Record<Act, Seg[]> = {
  run: [['run', 0, 7, 12, 0]],
  stop: [['stop', 0, 3, 12, 1], ['idle', 0, 3, 8, 0]],
  idle: [['idle', 0, 3, 8, 0]],
  hello: [['hello', 0, 15, 20, 1], ['idle', 0, 3, 8, 0]],
  greet: [['hello', 0, 10, 12, 1], ['wave', 0, 3, 10, 3], ['hello', 11, 15, 12, 1], ['idle', 0, 3, 8, 0]],
};
const GREET_MS = Math.round((11 / 12 + (3 * 4) / 10 + 5 / 12) * 1000), GREET_APEX_MS = Math.round((7 / 12) * 1000);
const STOP_MS = Math.round((4 / 12) * 1000), HELLO_APEX_MS = Math.round((6 / 20) * 1000);
/** Wick idles this long on one item before waving at you (once per item). */
const WAVE_AFTER_MS = 14000;
const hasStrips = () => !!ART('wick-run') && !!ART('wick-idle');

export function Title() {
  const st = React.useSyncExternalStore(subscribe, getState);
  const [, rerender] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => { const a = onUiPrefs(rerender), b = onVoice(rerender); return () => { a(); b(); }; }, []);
  // The Narrator's voice: a player who opted in gets it downloading (or loading from the cache) here, before any game.
  React.useEffect(() => { detectInstalled().then(() => { if (voicePrefs().install) loadVoice(); }); }, []);
  const roomParam = React.useMemo(() => (new URLSearchParams(location.search).get('room') || '').toUpperCase().slice(0, 6), []);
  const [pressed, setPressed] = React.useState(() => { try { return sessionStorage.getItem(PRESSED) === '1'; } catch { return false; } });
  // Coming back from the creation screen reopens Characters.
  const [panel, setPanel] = React.useState<Panel>(() => { try { const p = sessionStorage.getItem(BACK_TO) as Panel; sessionStorage.removeItem(BACK_TO); return p || null; } catch { return null; } });
  const [after, setAfter] = React.useState<null | string>(null); // what the name prompt continues into: 'host' or 'resume:CODE'
  const [code, setCode] = React.useState(roomParam);
  const [sel, setSel] = React.useState(0);
  /** The item being pressed (Wick says hello beside it) until the slide finishes; hover keeps working meanwhile. */
  const [pressIdx, setPressIdx] = React.useState<number | null>(null);
  const [bubble, setBubble] = React.useState<null | string>(null);
  const [leaving, setLeaving] = React.useState(false);
  const [wickY, setWickY] = React.useState<number | null>(null);
  const [wickX, setWickX] = React.useState(0);
  const [moveMs, setMoveMs] = React.useState(0);
  const wickYRef = React.useRef<number | null>(null); wickYRef.current = wickY;
  const [act, setAct] = React.useState<Act>('idle');
  const [nonce, setNonce] = React.useState(0);
  const [burst, setBurst] = React.useState<null | { x: number; y: number; k: number }>(null);
  const [geo, setGeo] = React.useState(() => titleGeometry(innerWidth, innerHeight));
  const [titlePx, setTitlePx] = React.useState<number | null>(null);
  const pending = React.useRef<null | (() => void)>(null);
  const timers = React.useRef<number[]>([]);
  const wickTimers = React.useRef<number[]>([]);
  const menuRef = React.useRef<HTMLDivElement>(null), colRef = React.useRef<HTMLDivElement>(null), titleRef = React.useRef<HTMLHeadingElement>(null), tagRef = React.useRef<HTMLSpanElement>(null);
  const greetNext = React.useRef(false), wavedOn = React.useRef(-1);
  const motion = !reducedMotion();
  React.useEffect(() => () => { timers.current.forEach(clearTimeout); wickTimers.current.forEach(clearTimeout); }, []);
  const later = (ms: number, f: () => void) => { timers.current.push(window.setTimeout(f, ms)); };
  /** Wick's own timers (arrive, stop, wave) are separate from the press, so a press never strands him mid-act. */
  const wickLater = (ms: number, f: () => void) => { wickTimers.current.push(window.setTimeout(f, ms)); };
  const wickClear = () => { wickTimers.current.forEach(clearTimeout); wickTimers.current = []; };
  const play = (a: Act) => { setAct(a); setNonce((n) => n + 1); };
  // The tap that begins must not also press a menu item (touch fires the click after pointerdown).
  const armedAt = React.useRef(0);

  // ---------- press any key ----------
  React.useEffect(() => {
    if (pressed) return;
    const begin = () => { armedAt.current = performance.now() + 450; greetNext.current = true; setPressed(true); try { sessionStorage.setItem(PRESSED, '1'); } catch { /* */ } later(30, () => sfx('start')); };
    window.addEventListener('keydown', begin, { once: true }); window.addEventListener('pointerdown', begin, { once: true });
    return () => { window.removeEventListener('keydown', begin); window.removeEventListener('pointerdown', begin); };
  }, [pressed]);
  // The title theme: from the first key press (browsers allow sound only after one), out when the title goes.
  React.useEffect(() => { if (!pressed) return; playTitleMusic(); const retry = () => playTitleMusic(); window.addEventListener('pointerup', retry, { once: true }); return () => window.removeEventListener('pointerup', retry); }, [pressed]);
  React.useEffect(() => () => stopTitleMusic(), []);
  // A ?room= link opens straight on Join.
  React.useEffect(() => { if (pressed && roomParam && !panel && !inviteUsed) { inviteUsed = true; setPanel('join'); } }, [pressed]);

  // ---------- the menu ----------
  // CONTINUE: the room you were last in, else the newest saved one.
  const sessions = listSessions(), last = lastRoom(), lastInfo = (last && sessions.find((s) => s.code === last.code)) || [...sessions].sort((a, b) => b.savedAt - a.savedAt)[0];
  const needName = (then: string) => { if (st.me.name.trim()) return false; setAfter(then); return true; };
  const items: Item[] = [
    ...(lastInfo ? [{ id: 'continue', label: 'CONTINUE', sub: 'Room ' + lastInfo.code + ' · ' + ago(lastInfo.savedAt), start: true, bubble: 'Welcome back!', run: () => (needName('resume:' + lastInfo.code) ? setPanel('name') : resumeSession(lastInfo.code)) }] : []),
    { id: 'new', label: 'NEW GAME', start: true, bubble: "Let's go!", run: () => (needName('host') ? setPanel('name') : hostRoom()) },
    { id: 'proving', label: 'PROVING GROUND', sub: 'Practice fights · endless waves · no Narrator', bubble: 'Fight me!', run: () => setPanel('proving') },
    { id: 'join', label: 'JOIN A FRIEND', bubble: 'Who\'s there?', run: () => setPanel('join') },
    { id: 'chars', label: 'CHARACTERS', bubble: 'Hello!', run: () => setPanel('characters') },
    ...(sessions.length ? [{ id: 'saved', label: 'SAVED GAMES', bubble: 'Hello!', run: () => setPanel('saved') }] : []),
    { id: 'settings', label: 'SETTINGS', bubble: 'Tweaks!', run: () => setPanel('settings') },
    { id: 'credits', label: 'CREDITS', bubble: 'Thank you!', run: () => setPanel('credits') },
  ];
  const selIdx = Math.min(sel, items.length - 1);
  /** Wick stays beside the pressed item through its hello; otherwise he follows the selection. */
  const wickIdx = pressIdx ?? selIdx;
  const itemEl = (i: number) => menuRef.current?.querySelectorAll<HTMLElement>('[data-item]')[i];
  const yFor = (i: number) => { const el = itemEl(i); return el ? Math.round(el.offsetTop + el.offsetHeight / 2 - F * 0.56) : null; };

  // ---------- Wick ----------
  /** Arrived: the skid, then idle (the stop clip runs into the idle loop by itself); the first time after the key
   *  press, a hello with a held wave as the greeting. */
  const arrive = () => {
    play('stop');
    if (greetNext.current && motion) { greetNext.current = false; wavedOn.current = selIdx; wickLater(STOP_MS + 250, () => greet('Hi!', true)); }
  };
  const greet = (text: string | null, chirp: boolean) => {
    wickClear(); play('greet'); setBubble(text);
    if (chirp) wickLater(GREET_APEX_MS, () => sfx('wick_hello'));
    wickLater(GREET_MS, () => { setBubble(null); play('idle'); });
  };
  React.useLayoutEffect(() => {
    if (!pressed || panel) return;
    const y = yFor(wickIdx); if (y == null) return;
    if (wickY === null) {
      // The first time: Wick runs in from off-screen left (about 900 px/s), stops beside the item.
      if (!motion) { setMoveMs(0); setWickY(y); setWickX(0); play('idle'); return; }
      const off = -Math.round((menuRef.current?.getBoundingClientRect().left || 0) + F + 24), ms = clamp(-off / 0.9, 350, 900);
      setMoveMs(0); setWickY(y); setWickX(off); play('run');
      requestAnimationFrame(() => requestAnimationFrame(() => { setMoveMs(ms); setWickX(0); sfx('wick_steps'); }));
      wickClear(); wickLater(ms + 40, arrive);
      return;
    }
    if (Math.abs(y - wickY) < 1) return;
    if (!motion) { setMoveMs(0); setWickY(y); return; }
    const ms = clamp(Math.abs(y - wickY) / 0.9, 180, 500);
    setMoveMs(ms); setWickY(y);
    if (pressIdx !== null) return; // mid-hello he hops over without changing clip
    setBubble(null); wickClear(); play('run'); sfx('wick_steps'); wickLater(ms, arrive);
  }, [pressed, panel, wickIdx, items.length]);
  // Fonts loading or the window resizing move the items: Wick follows quietly.
  React.useEffect(() => {
    const nav = menuRef.current; if (!pressed || panel || !nav || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => { const y = yFor(wickIdx), p = wickYRef.current; if (y != null && p !== null && Math.abs(p - y) >= 1) { setMoveMs(0); setWickY(y); } });
    ro.observe(nav); return () => ro.disconnect();
  }, [pressed, panel, wickIdx]);
  // Waiting on one item a while: Wick waves at you (once per item).
  React.useEffect(() => {
    if (!motion || panel || pressIdx !== null || (act !== 'idle' && act !== 'stop') || wavedOn.current === selIdx) return;
    const t = window.setTimeout(() => { wavedOn.current = selIdx; greet(null, false); }, WAVE_AFTER_MS);
    return () => clearTimeout(t);
  }, [act, nonce, panel, pressIdx, selIdx, motion]);
  // The strips are small: fetch them all up front so no clip starts blank.
  React.useEffect(() => { (Object.keys(FRAMES) as Clip[]).forEach((c) => { const u = ART('wick-' + c); if (u) new Image().src = u; }); }, []);

  /** Hover and focus always respond, even during a press's hello and slide: only Wick stays put until it ends. */
  const choose = (i: number, focus = false) => { if (focus) itemEl(i)?.focus({ preventScroll: true }); if (i === selIdx) return; setSel(i); sfx('hover'); };
  /** The press: click effect, Wick says hello, then the slide (spec §4). Pressing the same item again skips ahead;
   *  pressing another one during the hello switches to it. */
  const press = (it: Item, i: number, e?: React.MouseEvent | React.KeyboardEvent) => {
    if (performance.now() < armedAt.current) return;
    if (pressIdx !== null) {
      if (i === pressIdx) { finish(); return; }
      timers.current.forEach(clearTimeout); timers.current = []; setLeaving(false);
    }
    sfx(it.start ? 'start' : 'click');
    const r = (e && 'clientX' in e && e.clientX) ? { x: e.clientX, y: e.clientY } : (() => { const b = (e?.currentTarget as HTMLElement | undefined)?.getBoundingClientRect() || itemEl(i)?.getBoundingClientRect(); return b ? { x: b.left + 40, y: b.top + b.height / 2 } : { x: 200, y: 400 }; })();
    setBurst({ ...r, k: Date.now() });
    setSel(i); setPressIdx(i); setBubble(it.bubble); pending.current = it.run;
    if (!motion) { finish(); return; }
    wickClear(); play('hello');
    later(HELLO_APEX_MS, () => sfx('wick_hello'));
    later(550, () => { setLeaving(true); sfx('slide'); });
    later(950, finish);
  };
  const finish = () => {
    timers.current.forEach(clearTimeout); timers.current = [];
    const f = pending.current; pending.current = null;
    setPressIdx(null); setBubble(null); setLeaving(false); play('idle');
    if (f) f();
  };
  const back = () => { sfx('back'); sfx('slide_back'); setPanel(null); setAfter(null); later(30, () => itemEl(selIdx)?.focus({ preventScroll: true })); };

  // Keyboard: arrows move Wick, Enter presses (native on the focused button), Escape goes back.
  React.useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (!pressed) return;
      // The Report and Spend dialogs own the keyboard while open; so do text fields.
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      const t = e.target as HTMLElement | null, typing = !!t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
      if (e.key === 'Escape' && panel) { e.preventDefault(); back(); return; }
      if (panel || typing) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); const n = (selIdx + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length;
        choose(n, true);
      } else if (e.key === 'Enter' && !(t && t.hasAttribute('data-item'))) { e.preventDefault(); press(items[selIdx], selIdx); }
    };
    window.addEventListener('keydown', k, true); return () => window.removeEventListener('keydown', k, true);
  });

  // ---------- the title always fits ----------
  // Measured, not guessed: the widest word at 100 px against the column's width, and the room the menu leaves in the
  // column's height (before the key press, the menu's height is estimated so the title doesn't jump when it appears).
  const fitTitle = React.useCallback(() => {
    const col = colRef.current, h = titleRef.current; if (!col || !h) return;
    const words = Array.from(h.querySelectorAll<HTMLElement>('.phc-word')); if (!words.length) return;
    const was = h.style.fontSize; h.style.fontSize = '100px';
    const widest = Math.max(...words.map((w) => w.getBoundingClientRect().width));
    h.style.fontSize = was;
    const cs = getComputedStyle(col), padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight), padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const nav = menuRef.current, rowPx = clamp(innerWidth * 0.017, 19, 26) * 1.25 + 18;
    const menuH = nav ? nav.offsetHeight : items.length * rowPx + items.filter((x) => x.sub).length * 16;
    const tagH = (tagRef.current?.offsetHeight || 18) + 16, gap = parseFloat(cs.rowGap) || 28;
    const byW = widest > 0 ? ((col.clientWidth - padX) / widest) * 100 * 0.98 : 128;
    const byH = (col.clientHeight - padY - gap - menuH - tagH - 8) / (3 * 0.92);
    const px = Math.floor(clamp(Math.min(byW, byH), 28, 128));
    setTitlePx((p) => (p === px ? p : px));
  }, [items.length, pressed]);
  React.useLayoutEffect(() => { fitTitle(); }, [fitTitle, pressed, panel, items.length]);
  React.useEffect(() => {
    const col = colRef.current; if (!col) return;
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => fitTitle()) : null;
    ro?.observe(col); if (menuRef.current) ro?.observe(menuRef.current);
    const fonts = (document as any).fonts; fonts?.ready?.then(() => fitTitle()); fonts?.addEventListener?.('loadingdone', fitTitle);
    addEventListener('resize', fitTitle);
    return () => { ro?.disconnect(); fonts?.removeEventListener?.('loadingdone', fitTitle); removeEventListener('resize', fitTitle); };
  }, [fitTitle, pressed]);

  // ---------- the art: geometry and parallax ----------
  React.useEffect(() => { const r = () => setGeo(titleGeometry(innerWidth, innerHeight)); addEventListener('resize', r); return () => removeEventListener('resize', r); }, []);
  const geoRef = React.useRef(geo); geoRef.current = geo;
  const stage = React.useRef<HTMLDivElement>(null), layers = React.useRef<Record<string, HTMLDivElement | null>>({});
  React.useEffect(() => {
    if (!motion) {
      Object.values(layers.current).forEach((el) => { if (el) el.style.transform = 'none'; });
      if (stage.current) stage.current.style.transform = 'none';
      return;
    }
    if (panel) return; // a sub-screen holds the picture where it is
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0, idle = 0, lastMove = performance.now();
    const move = (e: PointerEvent) => { tx = (e.clientX / innerWidth) * 2 - 1; ty = (e.clientY / innerHeight) * 2 - 1; lastMove = performance.now(); };
    const tilt = (e: DeviceOrientationEvent) => { if (e.gamma == null) return; tx = clamp(e.gamma / 25, -1, 1); ty = clamp(((e.beta || 45) - 45) / 25, -1, 1); lastMove = performance.now(); };
    const tick = (t: number) => {
      const resting = t - lastMove > 2500; idle = t / 20000 * Math.PI * 2;
      const gx = resting ? Math.sin(idle) * 0.35 : tx, gy = resting ? Math.cos(idle * 0.7) * 0.2 : ty;
      x += (gx - x) * 0.08; y += (gy - y) * 0.08;
      const g = geoRef.current;
      for (const [l, d] of LAYERS) {
        const el = layers.current[l]; if (!el) continue;
        const [mx, my] = layerShift(g, d);
        el.style.transform = `translate3d(${(-x * mx).toFixed(2)}px, ${(-y * my).toFixed(2)}px, 0)`;
      }
      if (stage.current) stage.current.style.transform = `rotateY(${(x * 1.5).toFixed(3)}deg) rotateX(${(-y * 1.5).toFixed(3)}deg)`;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('pointermove', move); window.addEventListener('deviceorientation', tilt);
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', move); window.removeEventListener('deviceorientation', tilt); };
  }, [motion, panel]);

  // ---------- embers and rising motes, between the middle and front layers ----------
  const canvas = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    const c = canvas.current; if (!c || !motion || panel) return;
    const g = c.getContext('2d'); if (!g) return; let raf = 0;
    const fit = () => { c.width = innerWidth; c.height = innerHeight; }; fit(); addEventListener('resize', fit);
    const P = Array.from({ length: 70 }, (_, i) => ({ x: Math.random(), y: Math.random(), v: 0.0006 + Math.random() * 0.0016, s: 1 + Math.random() * 2.5, sq: i % 3 === 0, a: Math.random() * Math.PI * 2 }));
    const draw = () => {
      g.clearRect(0, 0, c.width, c.height);
      for (const p of P) {
        p.y -= p.v; p.a += 0.01; p.x += Math.sin(p.a) * 0.0004; if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
        const X = p.x * c.width, Y = p.y * c.height, fade = Math.min(1, (1 - p.y) * 3, p.y * 4);
        g.globalAlpha = 0.55 * fade;
        if (p.sq) { g.fillStyle = '#F4E6C8'; g.fillRect(X, Y, p.s, p.s); } // a bot: square
        else { g.fillStyle = '#F6A050'; g.beginPath(); g.arc(X, Y, p.s * 0.7, 0, 7); g.fill(); } // an ember
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', fit); };
  }, [motion, panel]);

  const present = LAYERS.map(([l]) => l).filter((l) => ART('title-' + l));
  const layer = (l: string) => (
    <div key={l} ref={(el) => { layers.current[l] = el; }} className={'phc-layer phc-l-' + l} style={{ mixBlendMode: l === 'fx' ? 'screen' : undefined }}>
      <img src={ART('title-' + l)} srcSet={srcSet(l)} sizes={Math.ceil(geo.w) + 'px'} alt="" draggable={false} decoding="async" className="phc-layer-img"
        ref={(el) => { if (el?.complete && el.naturalWidth) el.style.opacity = '1'; }} onLoad={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '1'; }} />
    </div>
  );

  return (
    <div className="phc-title" style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: 'radial-gradient(ellipse at 68% 30%, #1A1C22 0%, #05070B 70%)', color: ink.text, fontFamily: "'Chakra Petch', sans-serif", perspective: 1200 }}>
      <style>{CSS}</style>
      {/* the art: the whole painted canvas, placed so its safe rect covers the window */}
      <div ref={stage} aria-hidden className={leaving && motion ? 'phc-leaving' : ''} style={{ position: 'absolute', left: geo.left, top: geo.top, width: geo.w, height: geo.h, transformStyle: 'preserve-3d', transformOrigin: `${geo.cx * geo.s}px ${geo.cy * geo.s}px` }}>
        {present.filter((l) => l === 'back' || l === 'mid').map(layer)}
        <canvas ref={canvas} style={{ position: 'absolute', left: -geo.left, top: -geo.top, width: geo.vw, height: geo.vh, pointerEvents: 'none' }} />
        {present.filter((l) => l === 'front' || l === 'fx').map(layer)}
      </div>
      {/* keep the left third dark for the title */}
      <div aria-hidden className="phc-shade" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(5,7,11,0.86) 0%, rgba(5,7,11,0.6) 32%, rgba(5,7,11,0.0) 58%), linear-gradient(0deg, rgba(5,7,11,0.7) 0%, rgba(5,7,11,0) 30%)', pointerEvents: 'none' }} />
      {panel && <div aria-hidden style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(6px)', background: 'rgba(5,7,11,0.45)' }} />}

      {/* the title and menu: the column starts at the window's edge (its padding is the margin), so Wick can run in
          from off-screen and the column's scroll fallback never clips him at the margin */}
      <div ref={colRef} inert={!!panel} className={'phc-col' + (leaving && motion ? ' phc-col-out' : '') + (panel ? ' phc-col-away' : '')} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, paddingLeft: 'clamp(24px, 6vw, 120px)', width: 'calc(clamp(24px, 6vw, 120px) + min(560px, 100vw - clamp(24px, 6vw, 120px) - 16px))', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', overflowY: 'auto', overflowX: 'hidden', paddingTop: 16, paddingBottom: 56, boxSizing: 'border-box', gap: 28 }}>
        <h1 ref={titleRef} className={'phc-wordmark' + (pressed ? ' phc-wordmark-up' : '')} style={{ margin: 0, marginTop: 'auto', fontFamily: "'Spectral', serif", fontWeight: 600, lineHeight: 0.92, letterSpacing: '0.06em', fontSize: titlePx ? titlePx + 'px' : 'clamp(28px, min(6.2vw, 10vh), 112px)', color: '#F4ECDD' }}>
          <span className="phc-word">PROJECT</span>
          <span className="phc-word">HEAVEN</span>
          <span className="phc-word" style={{ letterSpacing: '0.22em' }}>CRY</span>
          <span ref={tagRef} style={{ display: 'block', marginTop: 16, fontFamily: "'Chakra Petch', sans-serif", fontSize: 'clamp(12px, 1vw, 15px)', fontWeight: 500, letterSpacing: '0.24em', lineHeight: 1.3, color: ink.muted }}>A TACTICAL RPG WITH AN AI NARRATOR</span>
        </h1>
        {!pressed && <div className="phc-press" role="status" style={{ marginBottom: 'auto', fontSize: 16, letterSpacing: '0.32em', color: '#FFFFFF' }}>{'ontouchstart' in window ? 'TAP TO BEGIN' : 'PRESS ANY KEY'}</div>}
        {pressed && (
          <nav aria-label="Main menu" ref={menuRef} style={{ marginBottom: 'auto', position: 'relative', display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 64, flexShrink: 0 }}>
            {items.map((it, i) => (
              <button key={it.id} type="button" data-item={it.id} data-sfx="none" className={'phc-item' + (i === selIdx ? ' on' : '') + (i === pressIdx ? ' pressed' : '')} style={{ animationDelay: (i * 40) + 'ms' }}
                onMouseEnter={() => choose(i, true)} onFocus={() => choose(i)} onClick={(e) => press(it, i, e)}>
                <span className="phc-label">{it.label}</span>
                {it.sub && <span style={{ display: 'block', fontSize: 12, letterSpacing: '0.12em', color: ink.dim, marginTop: 2 }}>{it.sub}</span>}
              </button>
            ))}
            {wickY !== null && (
              <div className={'phc-wick' + (act === 'run' ? ' run' : '') + (pressIdx !== null ? ' hello' : '') + (act === 'greet' ? ' greet' : '')} data-act={act}
                style={{ top: wickY, transform: `translateX(${wickX}px)`, transitionDuration: `${moveMs}ms, ${moveMs}ms` }} aria-hidden>
                {hasStrips() ? <WickSprite act={act} nonce={nonce} still={!motion} /> : <img src={ART('wick-welcome')} alt="" className={'phc-wick-img s-' + (act === 'greet' ? 'hello' : act === 'stop' ? 'idle' : act)} />}
                {bubble && <span key={bubble + nonce} className="phc-bubble">{bubble}</span>}
              </div>
            )}
          </nav>
        )}
      </div>

      {burst && motion && <Burst key={burst.k} x={burst.x} y={burst.y} />}

      {/* sub-screens */}
      {panel && (
        <section className="phc-panel" aria-label={panel} style={{ position: 'absolute', left: 'clamp(16px, 6vw, 120px)', top: '6vh', bottom: '6vh', width: 'min(760px, 92vw)', overflowY: 'auto', padding: '22px 24px', borderRadius: 16, background: ink.panel, border: '1px solid #2E3A50', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <button type="button" data-sfx="none" autoFocus={panel !== 'name' && panel !== 'join' && panel !== 'proving'} onClick={back} style={{ ...btn, alignSelf: 'flex-start', minHeight: 36 }}>‹ Back</button>
          {panel === 'name' && <NamePanel after={after} />}
          {panel === 'join' && <JoinPanel code={code} setCode={setCode} />}
          {panel === 'proving' && <ProvingPanel />}
          {panel === 'characters' && <CharactersPanel />}
          {panel === 'saved' && <SavedPanel />}
          {panel === 'settings' && <SettingsPanel />}
          {panel === 'credits' && <CreditsPanel />}
        </section>
      )}

      <footer style={{ position: 'absolute', left: 'clamp(24px, 6vw, 120px)', bottom: 16, display: 'flex', gap: 16, alignItems: 'center', fontSize: 12, color: ink.dim, flexWrap: 'wrap' }}>
        <button type="button" onClick={openReport} style={{ padding: 0, border: 0, background: 'none', color: ink.dim, fontFamily: 'inherit', fontSize: 12, textDecoration: 'underline', cursor: 'pointer' }}>⚑ Report a problem</button>
        <span>Your API key stays in your browser and goes only to the AI service you pick.</span>
      </footer>
      <div className="phc-version" title="Game version (CHANGELOG.md)" style={{ position: 'absolute', right: 16, bottom: 16, fontSize: 11, letterSpacing: '0.08em', color: ink.dim, pointerEvents: 'none' }}>v{GAME_VERSION}</div>
    </div>
  );
}

/** Wick from the artist's strips: one element, frames stepped by requestAnimationFrame (no React render per frame),
 *  so the menu's hover state never waits on him. */
function WickSprite({ act, nonce, still }: { act: Act; nonce: number; still: boolean }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  React.useEffect(() => {
    const el = ref.current; if (!el) return;
    let shown = '', raf = 0;
    const show = (clip: Clip, f: number) => {
      const k = clip + f; if (k === shown) return; shown = k;
      el.style.backgroundImage = `url(${ART('wick-' + clip)})`;
      el.style.backgroundSize = `${FRAMES[clip] * F}px ${F}px`;
      el.style.backgroundPosition = `${-f * F}px 0`;
    };
    if (still) { show('idle', 0); return; }
    const prog = PROGRAM[act], t0 = performance.now();
    const tick = (now: number) => {
      let t = (now - t0) / 1000, done = true;
      for (const [clip, a, b, fps, times] of prog) {
        const n = b - a + 1, dur = n / fps;
        if (times === 0 || t < dur * times) { show(clip, a + (Math.floor(t * fps) % n)); done = false; break; }
        t -= dur * times;
      }
      if (done) { const [clip, , b] = prog[prog.length - 1]; show(clip, b); return; }
      raf = requestAnimationFrame(tick);
    };
    show(prog[0][0], prog[0][1]);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [act, nonce, still]);
  return <span ref={ref} className={'phc-sprite s-' + act} />;
}

/** The press burst: a handful of square bots jumping out from the pointer. */
function Burst({ x, y }: { x: number; y: number }) {
  const bits = React.useMemo(() => Array.from({ length: 12 }, (_, i) => ({ a: (i / 12) * Math.PI * 2 + Math.random() * 0.4, d: 26 + Math.random() * 30, s: 3 + Math.random() * 3 })), []);
  return <div aria-hidden style={{ position: 'fixed', left: x, top: y, pointerEvents: 'none', zIndex: 5 }}>{bits.map((b, i) => <span key={i} className="phc-bit" style={{ width: b.s, height: b.s, ['--dx' as any]: Math.cos(b.a) * b.d + 'px', ['--dy' as any]: Math.sin(b.a) * b.d + 'px' }} />)}</div>;
}

// ---------- the sub-screens ----------
const btn: React.CSSProperties = { minHeight: 42, padding: '0 16px', borderRadius: 10, border: '1px solid #2E3A50', background: 'transparent', color: ink.text, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' };
const primary: React.CSSProperties = { ...btn, border: 0, background: '#E7EBF3', color: '#0A0D13' };
const h2: React.CSSProperties = { margin: 0, fontFamily: "'Spectral', serif", fontSize: 32, fontWeight: 600 };
const lab: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, letterSpacing: '0.14em', color: ink.muted };
const field: React.CSSProperties = { minHeight: 46, padding: '0 14px', borderRadius: 10, border: '1px solid #2E3A50', background: '#0A0D13', color: ink.text, fontFamily: 'inherit', fontSize: 17, letterSpacing: 0 };

function NameInput() {
  const st = getState();
  return <label style={lab}>YOUR NAME (THE OTHER PLAYERS SEE IT)<input autoFocus value={st.me.name} onChange={(e) => setName(e.target.value)} placeholder="Leon" style={field} /></label>;
}
function NamePanel({ after }: { after: null | string }) {
  const resume = after && after.startsWith('resume:') ? after.slice(7) : null, prove = after === 'proving';
  return <>
    <h2 style={h2}>Who's playing?</h2>
    <NameInput />
    <button type="button" data-sfx="start" style={{ ...primary, alignSelf: 'flex-start' }} onClick={() => (resume ? resumeSession(resume) : prove ? startProvingGround() : hostRoom())}>{resume ? 'Continue ›' : prove ? 'To the Proving Ground ›' : 'Open a room ›'}</button>
    <span style={{ fontSize: 13, color: ink.muted, lineHeight: 1.5 }}>You run the Narrator with your own API key (Anthropic, OpenRouter, OpenAI, Gemini, local or another site). Share the room code; friends join from anywhere.</span>
  </>;
}
/** PROVING GROUND: alone (as it always was), or with friends (the room code shown big once inside). */
function ProvingPanel() {
  const st = React.useSyncExternalStore(subscribe, getState), named = !!st.me.name.trim();
  const card: React.CSSProperties = { ...btn, minHeight: 92, flex: '1 1 220px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 4, padding: '12px 16px', textAlign: 'left' };
  return <>
    <h2 style={h2}>The Proving Ground</h2>
    <span style={{ fontSize: 14, color: ink.muted, lineHeight: 1.5 }}>Practice fights: gear up, then fight endless waves of drill units. No Narrator, nothing carried out.</span>
    <NameInput />
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <button type="button" data-sfx="start" disabled={!named} style={{ ...card, ...(named ? {} : { opacity: 0.5, cursor: 'default' }) }} onClick={() => startProvingGround()}>
        <span style={{ fontSize: 18 }}>Solo ›</span><span style={{ fontSize: 12, fontWeight: 600, color: ink.muted }}>Just you and a test fighter.</span></button>
      <button type="button" data-sfx="start" disabled={!named} style={{ ...card, border: '1px solid #E7EBF3', ...(named ? {} : { opacity: 0.5, cursor: 'default' }) }} onClick={() => startProvingGround(undefined, { friends: true })}>
        <span style={{ fontSize: 18 }}>With friends ›</span><span style={{ fontSize: 12, fontWeight: 600, color: ink.muted }}>Share a room code: up to 4 players, co-op waves or a team fight.</span></button>
    </div>
    {!named && <span style={{ fontSize: 13, color: ink.muted }}>Enter your name first.</span>}
  </>;
}
function JoinPanel({ code, setCode }: { code: string; setCode: (c: string) => void }) {
  return <>
    <h2 style={h2}>Join a friend</h2>
    <NameInput />
    <label style={lab}>ROOM CODE<input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ROOM CODE" maxLength={6} style={{ ...field, fontSize: 22, letterSpacing: '0.3em', maxWidth: 260 }} onKeyDown={(e) => { if (e.key === 'Enter') joinRoom(code); }} /></label>
    <button type="button" data-sfx="start" style={{ ...primary, alignSelf: 'flex-start' }} onClick={() => joinRoom(code)}>Join ›</button>
  </>;
}
function CharactersPanel() {
  const st = React.useSyncExternalStore(subscribe, getState);
  return <>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <h2 style={{ ...h2, marginRight: 'auto' }}>Your characters · {st.library.length}</h2>
      <button type="button" style={btn} onClick={() => importCharacter()} title="Add a character file (.phc.zip) a friend sent you">Import</button>
      <button type="button" style={primary} onClick={() => toCreate(null)}>Make a character</button>
    </div>
    {!st.library.length && <p style={{ margin: 0, color: ink.muted, lineHeight: 1.5 }}>None yet. Characters you lock in are kept in this browser and can be brought into any room. ⬇ downloads one as a file you can keep or send to a friend; Import adds one.</p>}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
      {st.library.map((c) => (
        <div key={c.name} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 10, borderRadius: 12, background: '#10151F', border: '1px solid ' + ink.line }}>
          <img src={ART(c.portrait) || c.portrait} alt="" style={{ width: 56, height: 70, objectFit: 'cover', borderRadius: 8, background: '#000' }} />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontWeight: 700 }}>{c.name}{(c as any).draft ? ' (draft)' : ''}</span><span style={{ fontSize: 12, color: ink.muted }}>{c.origin || 'no origin'} · Classless</span></div>
          <button type="button" style={{ ...btn, minHeight: 36, padding: '0 10px' }} onClick={() => toCreate(c)}>Open</button>
          <button type="button" style={{ ...btn, minHeight: 36, padding: '0 10px' }} aria-label={'Download ' + c.name + ' as a file'} title="Download as a file to keep or send to a friend" onClick={() => exportCharacter(c)}>⬇</button>
          <button type="button" style={{ ...btn, minHeight: 36, padding: '0 10px', color: ink.muted }} aria-label={'Delete ' + c.name} onClick={() => { if (confirm('Delete ' + c.name + ' from this browser?')) removeFromLibrary(c.name); }}>✕</button>
        </div>
      ))}
    </div>
  </>;
}
function SavedPanel() {
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  const last = lastRoom();
  return <>
    <h2 style={h2}>Saved games</h2>
    <p style={{ margin: 0, color: ink.muted, fontSize: 14, lineHeight: 1.5 }}>A room you host is saved after every action, in this browser and on the room server. Leave any time and resume it here.</p>
    {listSessions().map((x) => (
      <div key={x.code} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', padding: '12px 14px', borderRadius: 12, background: '#10151F', border: '1px solid ' + (last?.code === x.code ? '#FFFFFF' : ink.line) }}>
        <div style={{ flex: '1 1 260px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.16em' }}>ROOM {x.code}</span>
          <span style={{ fontFamily: "'Spectral', serif", fontSize: 18, fontWeight: 600 }}>{x.title}</span>
          <span style={{ fontSize: 13 }}>{[x.chars || 'no characters yet', x.players].filter(Boolean).join(' · ')}</span>
          <span style={{ fontSize: 10, letterSpacing: '0.12em', color: ink.muted }}>{(x.role === 'host' ? 'YOU HOST · SAVED IN THIS BROWSER' : 'YOU JOINED · THE HOST KEEPS THE SAVE') + ' · ' + (x.phase === 'lobby' ? 'LOBBY' : x.phase === 'combat' ? 'IN A FIGHT' : 'ROUND ' + x.round) + ' · ' + ago(x.savedAt).toUpperCase()}</span>
        </div>
        <button type="button" data-sfx="start" style={{ ...btn, borderColor: '#FFFFFF' }} onClick={() => resumeSession(x.code)}>{last?.code === x.code ? 'Continue ›' : 'Resume ›'}</button>
        <button type="button" style={{ ...btn, padding: '0 12px', color: ink.muted }} aria-label={'Remove room ' + x.code} onClick={() => { if (confirm('Remove room ' + x.code + ' from this list?' + (x.role === 'host' ? ' This deletes the save in this browser.' : ''))) { forgetSession(x.code); force(); } }}>✕</button>
      </div>
    ))}
  </>;
}
function SettingsPanel() {
  const p = uiPrefs();
  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 14 };
  return <>
    <h2 style={h2}>Settings</h2>
    <NameInput />
    <span style={lab}>SOUND</span>
    <label style={row}>Interface sounds <input type="range" min={0} max={100} value={p.sfx} onChange={(e) => setUiPrefs({ sfx: Number(e.target.value) })} aria-label="Interface sounds volume" /> <span style={{ color: ink.muted }}>{p.sfx}%</span></label>
    <label style={row}>Title music <input type="range" min={0} max={100} value={p.music} onChange={(e) => setUiPrefs({ music: Number(e.target.value) })} aria-label="Title music volume" /> <span style={{ color: ink.muted }}>{p.music}%</span></label>
    <label style={row}><input type="checkbox" checked={p.mute} onChange={(e) => setUiPrefs({ mute: e.target.checked })} /> Mute interface sounds and title music</label>
    <span style={lab}>VOICE</span>
    <VoiceSettings />
    <span style={lab}>COMFORT</span>
    <label style={row}><input type="checkbox" checked={p.reduceMotion} onChange={(e) => setUiPrefs({ reduceMotion: e.target.checked })} /> Reduce motion (no parallax, no running)</label>
    {/* Spotlight cut-ins (decision 111): the torn strips for a big moment, and the slowed attack after them. */}
    <div role="group" aria-label="Cut-ins" style={row}>Cut-ins
      {([['all', 'All'], ['scene', 'Once per scene'], ['off', 'Off']] as const).map(([v, label]) => (
        <button key={v} type="button" data-phc-cutins={v} aria-pressed={(p.cutins || 'all') === v} onClick={() => setUiPrefs({ cutins: v })}
          style={{ ...btn, ...((p.cutins || 'all') === v ? { background: '#1C2536', borderColor: '#E7EBF3', color: '#FFFFFF' } : { color: ink.muted }) }}>{(p.cutins || 'all') === v ? '● ' : ''}{label}</button>
      ))}
    </div>
    <div style={row}><button type="button" style={btn} onClick={() => { resetTips(); alert('Tips will show again.'); }}>Show tips again</button></div>
  </>;
}
function CreditsPanel() {
  return <>
    <h2 style={h2}>Credits</h2>
    {CREDITS.map((g) => (
      <div key={g.group} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={lab}>{g.group.toUpperCase()}</span>
        {g.items.map((c, i) => <span key={i} style={{ fontSize: 14, lineHeight: 1.5 }}>{c.what} · <span style={{ color: ink.muted }}>{c.who}{c.licence ? ' · ' + c.licence : ''}</span>{c.url && <> · <a href={c.url} target="_blank" rel="noreferrer" style={{ color: '#8BDEEE' }}>source</a></>}</span>)}
      </div>
    ))}
  </>;
}

const CSS = `
.phc-layer { position: absolute; top: 0; bottom: 0; left: 0; right: 0; transition: left 0.4s cubic-bezier(.65,0,.35,1), right 0.4s cubic-bezier(.65,0,.35,1); will-change: transform; }
.phc-layer-img { position: absolute; inset: 0; width: 100%; height: 100%; display: block; opacity: 0; transition: opacity 0.6s ease-out; user-select: none; pointer-events: none; }
.phc-leaving .phc-l-back { left: -0.8vw; right: 0.8vw; }
.phc-leaving .phc-l-mid { left: -2.5vw; right: 2.5vw; }
.phc-leaving .phc-l-front, .phc-leaving .phc-l-fx { left: -6vw; right: 6vw; }
.phc-wordmark { text-shadow: 0 0 28px rgba(255,230,190,0.25), 0 2px 0 rgba(0,0,0,0.6); transition: transform 0.6s cubic-bezier(.2,.8,.2,1); }
.phc-wordmark .phc-word { display: block; width: max-content; max-width: none; white-space: nowrap; }
.phc-wordmark-up { transform: translateY(-6px); }
.phc-press { animation: phc-pulse 1.6s ease-in-out infinite; }
@keyframes phc-pulse { 0%,100% { opacity: 0.35 } 50% { opacity: 1 } }
.phc-item { position: relative; display: block; text-align: left; padding: 6px 0; border: 0; background: none; color: #A3AEC2; font-family: 'Chakra Petch', sans-serif;
  font-size: clamp(19px, 1.7vw, 26px); font-weight: 600; letter-spacing: 0.14em; cursor: pointer; opacity: 0; animation: phc-in 0.4s ease-out forwards; outline: none; }
.phc-item .phc-label { position: relative; transition: color 0.15s, letter-spacing 0.15s, text-shadow 0.15s; }
.phc-item .phc-label::after { content: ''; position: absolute; left: 0; right: 0; bottom: -4px; height: 2px; background: #FFFFFF; transform: scaleX(0); transform-origin: left; transition: transform 0.2s ease-out; }
.phc-item.on .phc-label, .phc-item.pressed .phc-label { color: #FFFFFF; letter-spacing: 0.18em; text-shadow: 0 0 18px rgba(255,255,255,0.35); }
.phc-item.on .phc-label::after, .phc-item.pressed .phc-label::after { transform: scaleX(1); }
.phc-item.pressed .phc-label::after { animation: phc-flash 0.3s ease-out; }
@keyframes phc-flash { 0% { box-shadow: 0 0 0 rgba(255,255,255,0) } 30% { box-shadow: 0 0 12px rgba(255,255,255,0.9) } 100% { box-shadow: 0 0 0 rgba(255,255,255,0) } }
.phc-item:active .phc-label { display: inline-block; transform: scale(0.97); }
.phc-item:focus-visible .phc-label { color: #FFFFFF; }
@keyframes phc-in { from { opacity: 0; transform: translateX(-12px) } to { opacity: 1; transform: none } }
.phc-wick { position: absolute; left: 0; width: ${F}px; height: ${F}px; transition-property: top, transform; transition-timing-function: cubic-bezier(.4,0,.2,1), linear; pointer-events: none; }
.phc-sprite { display: block; width: ${F}px; height: ${F}px; background-repeat: no-repeat; image-rendering: auto; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.7)); }
.phc-wick-img { width: ${F - 12}px; height: ${F - 12}px; margin: 6px; display: block; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.6)); }
.phc-wick-img.s-idle { animation: phc-idle 1.2s ease-in-out infinite; }
.phc-wick-img.s-run { animation: phc-run 0.18s linear infinite; }
.phc-wick-img.s-hello { animation: phc-hello 0.7s cubic-bezier(.3,.7,.3,1) forwards; }
@keyframes phc-idle { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-2px) } }
@keyframes phc-run { 0% { transform: translateY(0) rotate(-6deg) } 50% { transform: translateY(-4px) rotate(6deg) } 100% { transform: translateY(0) rotate(-6deg) } }
@keyframes phc-hello { 0% { transform: translateY(0) scale(1, 1) } 15% { transform: translateY(3px) scale(1.12, 0.86) } 45% { transform: translateY(-26px) rotate(-8deg) } 60% { transform: translateY(-26px) rotate(8deg) } 75% { transform: translateY(-20px) rotate(-6deg) } 92% { transform: translateY(2px) scale(1.1, 0.9) } 100% { transform: none } }
.phc-bubble { position: absolute; left: 36px; top: -26px; white-space: nowrap; padding: 4px 10px; border-radius: 10px; background: #FFFFFF; color: #0A0D13; font-size: 13px; font-weight: 700; letter-spacing: 0.04em;
  animation: phc-pop 0.25s cubic-bezier(.3,1.6,.5,1) both; }
.phc-bubble::after { content: ''; position: absolute; left: 8px; bottom: -6px; border: 6px solid transparent; border-top-color: #FFFFFF; border-bottom: 0; }
@keyframes phc-pop { from { transform: scale(0.3); opacity: 0 } to { transform: none; opacity: 1 } }
.phc-col { transition: transform 0.4s cubic-bezier(.65,0,.35,1), opacity 0.4s; }
.phc-col-out { transform: translateX(-110%); opacity: 0; }
.phc-col-away { transform: translateX(-115%); opacity: 0; pointer-events: none; }
.phc-panel { animation: phc-slide-in 0.4s cubic-bezier(.2,.8,.2,1); }
@keyframes phc-slide-in { from { transform: translateX(40px); opacity: 0 } to { transform: none; opacity: 1 } }
.phc-bit { position: absolute; left: 0; top: 0; background: #FFFFFF; animation: phc-bit 0.5s ease-out forwards; }
@keyframes phc-bit { from { transform: translate(0, 0); opacity: 1 } to { transform: translate(var(--dx), var(--dy)); opacity: 0 } }
@media (max-width: 760px) { .phc-shade { background: linear-gradient(180deg, rgba(5,7,11,0.5) 0%, rgba(5,7,11,0.76) 30%, rgba(5,7,11,0.86) 70%, rgba(5,7,11,0.92) 100%) !important; } }
@media (prefers-reduced-motion: reduce) { .phc-item, .phc-panel { animation: none; opacity: 1 } .phc-col { transition: opacity 0.15s } .phc-layer { position: absolute; top: 0; bottom: 0; left: 0; right: 0; transition: none } }
`;
