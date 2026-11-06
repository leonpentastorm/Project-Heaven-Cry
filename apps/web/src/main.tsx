import './game/debug'; // first, so it hears every error
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import PD from './game/protodata.json';
import ASSETS from './game/assets.json';

// The prototypes' shared CSS (keyframes, icon hover zoom, reduced motion), from design/canvas-build/build.py HELMET.
const style = document.createElement('style');
style.textContent = '@keyframes phcPulse{0%,100%{opacity:.35}50%{opacity:1}}.phc-pulse{animation:phcPulse 1.2s ease-in-out infinite}body{margin:0;background:#0A0D13;color:#E7EBF3;font-family:\'Chakra Petch\',sans-serif}*{box-sizing:border-box}@keyframes phcScreenIn{from{transform:translateX(60px);opacity:0}to{transform:none;opacity:1}}.phc-screen-in{animation:phcScreenIn .4s cubic-bezier(.2,.8,.2,1)}button:disabled{cursor:not-allowed!important;opacity:.55}.phc-tok{position:relative;display:block;width:100%;height:100%;outline:none;cursor:default}.phc-tok .phc-pop{display:none}.phc-tok:hover,.phc-tok:focus-visible{z-index:20}.phc-tok:hover .phc-pop,.phc-tok:focus-visible .phc-pop{display:flex}.phc-tok:focus-visible>span:first-child{box-shadow:0 0 0 2px #FFFFFF}.phc-mini .phc-tok>span:first-child{transform:scale(1.7)}.phc-rig::-webkit-scrollbar{width:6px}.phc-rig::-webkit-scrollbar-thumb{background:#2E3A50;border-radius:3px}' + (PD as any).helmetCss;
document.head.appendChild(style);

// Every image the game uses: thumbnails first, then the large (zoom) sizes. Failed loads count as done.
const all = Object.entries(ASSETS as Record<string, string>);
const URLS = [...all.filter(([k]) => !k.endsWith('-lg')), ...all.filter(([k]) => k.endsWith('-lg'))].map(([, u]) => u);
const MARK = (ASSETS as Record<string, string>)['wick-welcome'];

function preload(onTick: (n: number) => void): Promise<void> {
  let next = 0, done = 0;
  const one = (): Promise<void> => {
    if (next >= URLS.length) return Promise.resolve();
    const url = URLS[next++], img = new Image();
    img.src = url;
    return (img.decode ? img.decode() : new Promise<void>((ok, bad) => { img.onload = () => ok(); img.onerror = bad; }))
      .catch(() => {}).then(() => { onTick(++done); return one(); });
  };
  return Promise.all(Array.from({ length: 8 }, one)).then(() => {});
}

function Loader() {
  const [n, setN] = useState(0), [ready, setReady] = useState(false);
  useEffect(() => { preload(setN).then(() => setTimeout(() => setReady(true), 250)); }, []);
  if (ready) return <App />;
  const pct = URLS.length ? Math.round((n / URLS.length) * 100) : 100;
  return (
    <div role="progressbar" aria-label="Loading the game's art" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
      style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, width: 'min(420px, 100%)' }}>
        {MARK && <img src={MARK} alt="" style={{ width: 120, height: 120, objectFit: 'contain' }} />}
        <div style={{ fontFamily: 'Spectral, serif', fontSize: 28, fontWeight: 600, letterSpacing: '0.04em', textAlign: 'center' }}>Project Heaven Cry</div>
        <div style={{ width: '100%', height: 8, borderRadius: 999, background: '#1C2536', border: '1px solid #232D3F', overflow: 'hidden' }}>
          <div style={{ width: pct + '%', height: '100%', background: '#FFFFFF', transition: 'width 120ms linear' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: '#A3AEC2' }}>
          <span>LOADING ART · {n} / {URLS.length}</span><span>{pct}%</span>
        </div>
        <button onClick={() => setReady(true)} style={{ minHeight: 42, padding: '0 16px', borderRadius: 10, border: '1px solid #232D3F', background: 'transparent', color: '#A3AEC2', fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer' }}>
          Skip, load as I go
        </button>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Loader />);
