// The title screen (spec: docs/design/title-screen.md; art: art/briefs/title-screen.md). Full bleed, three painted
// layers that follow the pointer, the big title, a menu with Wick as the selector, press -> Wick says hello -> slide.
// Until the painted layers and Wick's frames are delivered it runs on stand-ins (an approved illustration, a drawn
// Celestial glow, Wick's welcome mark).
import React from 'react';
import { ART } from '../screens/shared';
import { forgetSession, getState, go, hostRoom, joinRoom, lastRoom, listSessions, removeFromLibrary, resumeSession, setName, subscribe } from '../game/store';
import { exportCharacter, importCharacter } from '../game/charfile';
import { openReport } from '../game/report';
import { sfx, uiPrefs, setUiPrefs, onUiPrefs, reducedMotion } from '../game/sfx';
import { NARRATOR_VOICES, voicePrefs, setVoicePrefs, onVoice } from '../game/voice';
import { resetTips } from '../game/tips';
import { CREDITS } from '../game/credits';

type Panel = null | 'name' | 'join' | 'characters' | 'saved' | 'settings' | 'credits';
type Item = { id: string; label: string; sub?: string; start?: boolean; bubble: string; run: () => void };

const ink = { text: '#E7EBF3', muted: '#A3AEC2', dim: '#7F8BA1', line: '#232D3F', panel: 'rgba(13, 17, 25, 0.86)' };
const ago = (t: number) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
const PRESSED = 'phc.pressedAnyKey', BACK_TO = 'phc.titlePanel';
/** A ?room= invite opens Join once per page load, not every time the title comes back. */
let inviteUsed = false;
const toCreate = (draft: any) => { try { sessionStorage.setItem(BACK_TO, 'characters'); } catch { /* */ } go('create', { draft }); };
const WICK_H = 48;
/** A sprite strip if the artist's frames are in, else null (the stand-in is used). */
const strip = (seq: string) => ART('wick-' + seq) || null;

export function Title() {
  const st = React.useSyncExternalStore(subscribe, getState);
  const [, rerender] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => { const a = onUiPrefs(rerender), b = onVoice(rerender); return () => { a(); b(); }; }, []);
  const roomParam = React.useMemo(() => (new URLSearchParams(location.search).get('room') || '').toUpperCase().slice(0, 6), []);
  const [pressed, setPressed] = React.useState(() => { try { return sessionStorage.getItem(PRESSED) === '1'; } catch { return false; } });
  // Coming back from the creation screen reopens Characters.
  const [panel, setPanel] = React.useState<Panel>(() => { try { const p = sessionStorage.getItem(BACK_TO) as Panel; sessionStorage.removeItem(BACK_TO); return p || null; } catch { return null; } });
  const [after, setAfter] = React.useState<null | string>(null); // what the name prompt continues into: 'host' or 'resume:CODE'
  const [code, setCode] = React.useState(roomParam);
  const [sel, setSel] = React.useState(0);
  const [hello, setHello] = React.useState<null | string>(null);
  const [leaving, setLeaving] = React.useState(false);
  const [wickY, setWickY] = React.useState<number | null>(null);
  const [running, setRunning] = React.useState(false);
  const [burst, setBurst] = React.useState<null | { x: number; y: number; k: number }>(null);
  const pending = React.useRef<null | (() => void)>(null);
  const timers = React.useRef<number[]>([]);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const motion = !reducedMotion();
  React.useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);
  const later = (ms: number, f: () => void) => { timers.current.push(window.setTimeout(f, ms)); };
  // The tap that begins must not also press a menu item (touch fires the click after pointerdown).
  const armedAt = React.useRef(0);

  // ---------- press any key ----------
  React.useEffect(() => {
    if (pressed) return;
    const begin = () => { armedAt.current = performance.now() + 450; setPressed(true); try { sessionStorage.setItem(PRESSED, '1'); } catch { /* */ } later(30, () => sfx('start')); };
    window.addEventListener('keydown', begin, { once: true }); window.addEventListener('pointerdown', begin, { once: true });
    return () => { window.removeEventListener('keydown', begin); window.removeEventListener('pointerdown', begin); };
  }, [pressed]);
  // A ?room= link opens straight on Join.
  React.useEffect(() => { if (pressed && roomParam && !panel && !inviteUsed) { inviteUsed = true; setPanel('join'); } }, [pressed]);

  // ---------- the menu ----------
  // CONTINUE: the room you were last in, else the newest saved one.
  const sessions = listSessions(), last = lastRoom(), lastInfo = (last && sessions.find((s) => s.code === last.code)) || [...sessions].sort((a, b) => b.savedAt - a.savedAt)[0];
  const needName = (then: string) => { if (st.me.name.trim()) return false; setAfter(then); return true; };
  const items: Item[] = [
    ...(lastInfo ? [{ id: 'continue', label: 'CONTINUE', sub: 'Room ' + lastInfo.code + ' · ' + ago(lastInfo.savedAt), start: true, bubble: 'Welcome back!', run: () => (needName('resume:' + lastInfo.code) ? setPanel('name') : resumeSession(lastInfo.code)) }] : []),
    { id: 'new', label: 'NEW GAME', start: true, bubble: "Let's go!", run: () => (needName('host') ? setPanel('name') : hostRoom()) },
    { id: 'join', label: 'JOIN A FRIEND', bubble: 'Who\'s there?', run: () => setPanel('join') },
    { id: 'chars', label: 'CHARACTERS', bubble: 'Hello!', run: () => setPanel('characters') },
    ...(sessions.length ? [{ id: 'saved', label: 'SAVED GAMES', bubble: 'Hello!', run: () => setPanel('saved') }] : []),
    { id: 'settings', label: 'SETTINGS', bubble: 'Tweaks!', run: () => setPanel('settings') },
    { id: 'credits', label: 'CREDITS', bubble: 'Thank you!', run: () => setPanel('credits') },
  ];
  const selIdx = Math.min(sel, items.length - 1);

  // Wick runs along the gutter to the selected item.
  const place = React.useCallback((i: number, silent = false) => {
    const el = menuRef.current?.querySelectorAll<HTMLElement>('[data-item]')[i]; if (!el) return;
    const y = el.offsetTop + el.offsetHeight / 2 - WICK_H / 2 - 2;
    setWickY((prev) => { if (!silent && prev !== y && motion) { setRunning(true); sfx('wick_steps'); } return y; });
  }, [motion]);
  React.useLayoutEffect(() => { if (pressed && !panel) place(selIdx); }, [pressed, panel, selIdx, items.length, place]);
  // Fonts loading or the window resizing move the items: Wick follows quietly.
  React.useEffect(() => {
    const nav = menuRef.current; if (!pressed || panel || !nav || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => place(selIdx, true)); ro.observe(nav); return () => ro.disconnect();
  }, [pressed, panel, selIdx, place]);
  const runMs = 260;
  React.useEffect(() => { if (!running) return; const t = window.setTimeout(() => setRunning(false), runMs); return () => clearTimeout(t); }, [running, wickY]);

  const itemEl = (i: number) => menuRef.current?.querySelectorAll<HTMLElement>('[data-item]')[i];
  // Keep DOM focus on the highlighted item, so Enter always presses what Wick stands beside.
  const choose = (i: number, focus = false) => { if (focus) itemEl(i)?.focus({ preventScroll: true }); if (i === selIdx) return; setSel(i); sfx('hover'); };
  /** The press: click effect, Wick says hello, then the slide (spec §4). A second press skips ahead. */
  const press = (it: Item, e?: React.MouseEvent | React.KeyboardEvent) => {
    if (performance.now() < armedAt.current) return;
    if (hello) { finish(); return; }
    sfx(it.start ? 'start' : 'click');
    const r = (e && 'clientX' in e && e.clientX) ? { x: e.clientX, y: e.clientY } : (() => { const b = (e?.currentTarget as HTMLElement | undefined)?.getBoundingClientRect(); return b ? { x: b.left + 40, y: b.top + b.height / 2 } : { x: 200, y: 400 }; })();
    setBurst({ ...r, k: Date.now() });
    setHello(it.bubble); pending.current = it.run;
    if (!motion) { finish(); return; }
    later(260, () => sfx('wick_hello'));
    later(550, () => { setLeaving(true); sfx('slide'); });
    later(950, finish);
  };
  const finish = () => {
    timers.current.forEach(clearTimeout); timers.current = [];
    const f = pending.current; pending.current = null;
    setHello(null); setLeaving(false);
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
      } else if (e.key === 'Enter' && !(t && t.hasAttribute('data-item'))) { e.preventDefault(); press(items[selIdx]); }
    };
    window.addEventListener('keydown', k, true); return () => window.removeEventListener('keydown', k, true);
  });

  // ---------- parallax ----------
  const stage = React.useRef<HTMLDivElement>(null), layers = React.useRef<(HTMLDivElement | null)[]>([]);
  React.useEffect(() => {
    if (!motion || panel) return;
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0, idle = 0, lastMove = performance.now();
    const move = (e: PointerEvent) => { tx = (e.clientX / innerWidth) * 2 - 1; ty = (e.clientY / innerHeight) * 2 - 1; lastMove = performance.now(); };
    const tilt = (e: DeviceOrientationEvent) => { if (e.gamma == null) return; tx = Math.max(-1, Math.min(1, e.gamma / 25)); ty = Math.max(-1, Math.min(1, ((e.beta || 45) - 45) / 25)); lastMove = performance.now(); };
    const depth = [0.008, 0.025, 0.05];
    const tick = (t: number) => {
      const resting = t - lastMove > 2500; idle = t / 20000 * Math.PI * 2;
      const gx = resting ? Math.sin(idle) * 0.35 : tx, gy = resting ? Math.cos(idle * 0.7) * 0.2 : ty;
      x += (gx - x) * 0.08; y += (gy - y) * 0.08;
      layers.current.forEach((el, i) => { if (el) el.style.transform = `translate3d(${(-x * depth[i] * 100).toFixed(3)}vw, ${(-y * depth[i] * 50).toFixed(3)}vh, 0) scale(${[1.02, 1.05, 1.08][i]})`; });
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
    const g = c.getContext('2d')!; let raf = 0;
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

  const back0 = ART('title-back-lg') || ART('title-back') || ART('world-outpost813-lg') || ART('world-outpost813');
  const mid = ART('title-mid'), front = ART('title-front'), fx = ART('title-fx');
  const standIn = !ART('title-back');

  return (
    <div className="phc-title" style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#05070B', color: ink.text, fontFamily: "'Chakra Petch', sans-serif", perspective: 1200 }}>
      <style>{CSS}</style>
      {/* the art */}
      <div ref={stage} aria-hidden style={{ position: 'absolute', inset: '-4%', transformStyle: 'preserve-3d', transition: motion ? undefined : 'none' }}>
        <div ref={(el) => { layers.current[0] = el; }} style={{ position: 'absolute', inset: 0, backgroundImage: `url(${back0})`, backgroundSize: 'cover', backgroundPosition: standIn ? '60% center' : 'center top', filter: standIn ? 'brightness(0.62) saturate(0.85)' : undefined, transition: 'transform 0.4s ease-out' }}>
          {standIn && <div className="phc-celestial" />}
        </div>
        <div ref={(el) => { layers.current[1] = el; }} style={{ position: 'absolute', inset: 0, backgroundImage: mid ? `url(${mid})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <canvas ref={canvas} style={{ position: 'absolute', inset: '4%', width: '92%', height: '92%' }} />
        <div ref={(el) => { layers.current[2] = el; }} className={leaving && motion ? 'phc-front-out' : ''} style={{ position: 'absolute', inset: 0, backgroundImage: front ? `url(${front})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        {fx && <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${fx})`, backgroundSize: 'cover', mixBlendMode: 'screen' }} />}
      </div>
      {/* keep the left third dark for the title */}
      <div aria-hidden className="phc-shade" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(5,7,11,0.88) 0%, rgba(5,7,11,0.62) 32%, rgba(5,7,11,0.0) 58%), linear-gradient(0deg, rgba(5,7,11,0.7) 0%, rgba(5,7,11,0) 30%)', pointerEvents: 'none' }} />
      {panel && <div aria-hidden style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(6px)', background: 'rgba(5,7,11,0.45)' }} />}

      {/* the title and menu */}
      <div inert={!!panel} className={'phc-col' + (leaving && motion ? ' phc-col-out' : '') + (panel ? ' phc-col-away' : '')} style={{ position: 'absolute', left: 'clamp(24px, 6vw, 120px)', top: 0, bottom: 0, width: 'min(560px, 88vw)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', overflowY: 'auto', paddingTop: 16, paddingBottom: 56, boxSizing: 'border-box', gap: 28 }}>
        <h1 className={'phc-wordmark' + (pressed ? ' phc-wordmark-up' : '')} style={{ margin: 0, marginTop: 'auto', fontFamily: "'Spectral', serif", fontWeight: 600, lineHeight: 0.92, letterSpacing: '0.06em', fontSize: 'clamp(36px, min(7.4vw, 13vh), 128px)', color: '#F4ECDD' }}>
          PROJECT<br />HEAVEN<br /><span style={{ letterSpacing: '0.22em' }}>CRY</span>
          <span style={{ display: 'block', marginTop: 16, fontFamily: "'Chakra Petch', sans-serif", fontSize: 'clamp(12px, 1vw, 15px)', fontWeight: 500, letterSpacing: '0.24em', color: ink.muted }}>A TACTICAL RPG WITH AN AI NARRATOR</span>
        </h1>
        {!pressed && <div className="phc-press" role="status" style={{ marginBottom: 'auto', fontSize: 16, letterSpacing: '0.32em', color: '#FFFFFF' }}>{'ontouchstart' in window ? 'TAP TO BEGIN' : 'PRESS ANY KEY'}</div>}
        {pressed && (
          <nav aria-label="Main menu" ref={menuRef} style={{ marginBottom: 'auto', position: 'relative', display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 64 }}>
            {items.map((it, i) => (
              <button key={it.id} type="button" data-item data-sfx="none" className={'phc-item' + (i === selIdx ? ' on' : '')} style={{ animationDelay: (i * 40) + 'ms' }}
                onMouseEnter={() => choose(i, true)} onFocus={() => choose(i)} onClick={(e) => press(it, e)}>
                <span className="phc-label">{it.label}</span>
                {it.sub && <span style={{ display: 'block', fontSize: 12, letterSpacing: '0.12em', color: ink.dim, marginTop: 2 }}>{it.sub}</span>}
              </button>
            ))}
            {wickY !== null && (
              <div className={'phc-wick' + (running ? ' run' : '') + (hello ? ' hello' : '')} style={{ top: wickY, transitionDuration: motion ? runMs + 'ms' : '0ms' }} aria-hidden>
                <Wick seq={hello ? 'hello' : running ? 'run' : 'idle'} />
                {hello && <span className="phc-bubble">{hello}</span>}
              </div>
            )}
          </nav>
        )}
      </div>

      {burst && motion && <Burst key={burst.k} x={burst.x} y={burst.y} />}

      {/* sub-screens */}
      {panel && (
        <section className="phc-panel" aria-label={panel} style={{ position: 'absolute', left: 'clamp(16px, 6vw, 120px)', top: '6vh', bottom: '6vh', width: 'min(760px, 92vw)', overflowY: 'auto', padding: '22px 24px', borderRadius: 16, background: ink.panel, border: '1px solid #2E3A50', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <button type="button" data-sfx="none" autoFocus={panel !== 'name' && panel !== 'join'} onClick={back} style={{ ...btn, alignSelf: 'flex-start', minHeight: 36 }}>‹ Back</button>
          {panel === 'name' && <NamePanel after={after} />}
          {panel === 'join' && <JoinPanel code={code} setCode={setCode} />}
          {panel === 'characters' && <CharactersPanel />}
          {panel === 'saved' && <SavedPanel />}
          {panel === 'settings' && <SettingsPanel />}
          {panel === 'credits' && <CreditsPanel />}
        </section>
      )}

      <footer style={{ position: 'absolute', left: 'clamp(24px, 6vw, 120px)', bottom: 16, display: 'flex', gap: 16, alignItems: 'center', fontSize: 12, color: ink.dim, flexWrap: 'wrap' }}>
        <button type="button" onClick={openReport} style={{ padding: 0, border: 0, background: 'none', color: ink.dim, fontFamily: 'inherit', fontSize: 12, textDecoration: 'underline', cursor: 'pointer' }}>⚑ Report a problem</button>
        <span>Your API key stays in your browser and goes only to Anthropic.</span>
      </footer>
    </div>
  );
}

/** Wick: the artist's sprite strip when delivered, else the welcome mark doing its best. */
function Wick({ seq }: { seq: 'run' | 'idle' | 'hello' }) {
  const sheet = strip(seq), frames = { run: 8, idle: 4, hello: 16 }[seq], fps = { run: 12, idle: 8, hello: 12 }[seq];
  if (sheet) return <span className={'phc-sprite s-' + seq} style={{ backgroundImage: `url(${sheet})`, backgroundSize: `${frames * WICK_H}px ${WICK_H}px`, animation: `phc-frames-${frames} ${frames / fps}s steps(${frames}) ${seq === 'hello' ? 1 : 'infinite'}` }} />;
  return <img src={ART('wick-welcome')} alt="" className={'phc-wick-img s-' + seq} />;
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
  const resume = after && after.startsWith('resume:') ? after.slice(7) : null;
  return <>
    <h2 style={h2}>Who's playing?</h2>
    <NameInput />
    <button type="button" data-sfx="start" style={{ ...primary, alignSelf: 'flex-start' }} onClick={() => (resume ? resumeSession(resume) : hostRoom())}>{resume ? 'Continue ›' : 'Open a room ›'}</button>
    <span style={{ fontSize: 13, color: ink.muted, lineHeight: 1.5 }}>You run the Narrator with your Anthropic key. Share the room code; friends join from anywhere.</span>
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
  const p = uiPrefs(), v = voicePrefs();
  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 14 };
  return <>
    <h2 style={h2}>Settings</h2>
    <NameInput />
    <span style={lab}>SOUND</span>
    <label style={row}>Interface sounds <input type="range" min={0} max={100} value={p.sfx} onChange={(e) => setUiPrefs({ sfx: Number(e.target.value) })} aria-label="Interface sounds volume" /> <span style={{ color: ink.muted }}>{p.sfx}%</span></label>
    <label style={row}><input type="checkbox" checked={p.mute} onChange={(e) => setUiPrefs({ mute: e.target.checked })} /> Mute interface sounds</label>
    <span style={lab}>THE NARRATOR'S VOICE</span>
    <label style={row}><input type="checkbox" checked={v.auto} onChange={(e) => setVoicePrefs({ auto: e.target.checked })} /> Read new lines aloud</label>
    <label style={row}>Voice <select value={v.voice} onChange={(e) => setVoicePrefs({ voice: e.target.value })} style={{ ...field, minHeight: 36, fontSize: 14 }}>{NARRATOR_VOICES.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></label>
    <label style={row}>Voice volume <input type="range" min={0} max={100} value={v.volume} onChange={(e) => setVoicePrefs({ volume: Number(e.target.value) })} aria-label="Voice volume" /></label>
    <span style={lab}>COMFORT</span>
    <label style={row}><input type="checkbox" checked={p.reduceMotion} onChange={(e) => setUiPrefs({ reduceMotion: e.target.checked })} /> Reduce motion (no parallax, no running)</label>
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
.phc-celestial { position: absolute; left: 58%; top: 2%; width: 30vw; height: 52vh; pointer-events: none;
  background: radial-gradient(ellipse 22% 38% at 50% 42%, rgba(255,246,222,0.95), rgba(255,226,170,0.55) 35%, rgba(255,210,150,0.12) 65%, transparent 72%);
  filter: blur(2px); animation: phc-breathe 6s ease-in-out infinite; }
.phc-celestial::before, .phc-celestial::after { content: ''; position: absolute; left: 50%; top: 42%; width: 70%; aspect-ratio: 1; border: 2px solid rgba(255,236,200,0.35); border-radius: 50%;
  transform: translate(-50%, -50%) rotateX(70deg); animation: phc-spin 18s linear infinite; }
.phc-celestial::after { width: 95%; border-style: dashed; animation-duration: 30s; animation-direction: reverse; }
@keyframes phc-breathe { 0%,100% { opacity: 0.85 } 50% { opacity: 1 } }
@keyframes phc-spin { to { transform: translate(-50%, -50%) rotateX(70deg) rotateZ(360deg) } }
.phc-wordmark { text-shadow: 0 0 28px rgba(255,230,190,0.25), 0 2px 0 rgba(0,0,0,0.6); transition: transform 0.6s cubic-bezier(.2,.8,.2,1); }
.phc-wordmark-up { transform: translateY(-6px); }
.phc-press { animation: phc-pulse 1.6s ease-in-out infinite; }
@keyframes phc-pulse { 0%,100% { opacity: 0.35 } 50% { opacity: 1 } }
.phc-item { position: relative; display: block; text-align: left; padding: 6px 0; border: 0; background: none; color: #A3AEC2; font-family: 'Chakra Petch', sans-serif;
  font-size: clamp(19px, 1.7vw, 26px); font-weight: 600; letter-spacing: 0.14em; cursor: pointer; opacity: 0; animation: phc-in 0.4s ease-out forwards; outline: none; }
.phc-item .phc-label { position: relative; transition: color 0.15s, letter-spacing 0.15s, text-shadow 0.15s; }
.phc-item .phc-label::after { content: ''; position: absolute; left: 0; right: 0; bottom: -4px; height: 2px; background: #FFFFFF; transform: scaleX(0); transform-origin: left; transition: transform 0.2s ease-out; }
.phc-item.on .phc-label { color: #FFFFFF; letter-spacing: 0.18em; text-shadow: 0 0 18px rgba(255,255,255,0.35); }
.phc-item.on .phc-label::after { transform: scaleX(1); }
.phc-item:active .phc-label { display: inline-block; transform: scale(0.97); }
.phc-item:focus-visible .phc-label { color: #FFFFFF; }
@keyframes phc-in { from { opacity: 0; transform: translateX(-12px) } to { opacity: 1; transform: none } }
.phc-wick { position: absolute; left: 0; width: ${WICK_H}px; height: ${WICK_H}px; transition-property: top; transition-timing-function: cubic-bezier(.4,0,.2,1); pointer-events: none; }
.phc-wick-img { width: ${WICK_H}px; height: ${WICK_H}px; display: block; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.6)); }
.phc-wick-img.s-idle { animation: phc-idle 1.2s ease-in-out infinite; }
.phc-wick-img.s-run { animation: phc-run 0.18s linear infinite; }
.phc-wick-img.s-hello { animation: phc-hello 0.7s cubic-bezier(.3,.7,.3,1) forwards; }
@keyframes phc-idle { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-2px) } }
@keyframes phc-run { 0% { transform: translateY(0) rotate(-6deg) } 50% { transform: translateY(-4px) rotate(6deg) } 100% { transform: translateY(0) rotate(-6deg) } }
@keyframes phc-hello { 0% { transform: translateY(0) scale(1, 1) } 15% { transform: translateY(3px) scale(1.12, 0.86) } 45% { transform: translateY(-26px) rotate(-8deg) } 60% { transform: translateY(-26px) rotate(8deg) } 75% { transform: translateY(-20px) rotate(-6deg) } 92% { transform: translateY(2px) scale(1.1, 0.9) } 100% { transform: none } }
.phc-sprite { display: block; width: ${WICK_H}px; height: ${WICK_H}px; background-repeat: no-repeat; image-rendering: auto; }
${[4, 8, 16].map((n) => `@keyframes phc-frames-${n} { to { background-position: -${n * WICK_H}px 0 } }`).join('\n')}
.phc-bubble { position: absolute; left: 30px; top: -30px; white-space: nowrap; padding: 4px 10px; border-radius: 10px; background: #FFFFFF; color: #0A0D13; font-size: 13px; font-weight: 700; letter-spacing: 0.04em;
  animation: phc-pop 0.25s cubic-bezier(.3,1.6,.5,1) both; }
.phc-bubble::after { content: ''; position: absolute; left: 8px; bottom: -6px; border: 6px solid transparent; border-top-color: #FFFFFF; border-bottom: 0; }
@keyframes phc-pop { from { transform: scale(0.3); opacity: 0 } to { transform: none; opacity: 1 } }
.phc-col { transition: transform 0.4s cubic-bezier(.65,0,.35,1), opacity 0.4s; }
.phc-col-out { transform: translateX(-110%); opacity: 0; }
.phc-col-away { transform: translateX(-115%); opacity: 0; pointer-events: none; }
.phc-front-out { margin-left: -8vw; transition: margin 0.4s cubic-bezier(.65,0,.35,1); }
.phc-panel { animation: phc-slide-in 0.4s cubic-bezier(.2,.8,.2,1); }
@keyframes phc-slide-in { from { transform: translateX(40px); opacity: 0 } to { transform: none; opacity: 1 } }
.phc-bit { position: absolute; left: 0; top: 0; background: #FFFFFF; animation: phc-bit 0.5s ease-out forwards; }
@keyframes phc-bit { from { transform: translate(0, 0); opacity: 1 } to { transform: translate(var(--dx), var(--dy)); opacity: 0 } }
@media (max-width: 760px) { .phc-shade { background: linear-gradient(180deg, rgba(5,7,11,0.35) 0%, rgba(5,7,11,0.72) 30%, rgba(5,7,11,0.86) 70%, rgba(5,7,11,0.92) 100%) !important; } }
@media (prefers-reduced-motion: reduce) { .phc-item, .phc-panel { animation: none; opacity: 1 } .phc-col { transition: opacity 0.15s } .phc-celestial, .phc-celestial::before, .phc-celestial::after { animation: none } }
`;
