import './game/debug'; // first, so it hears every error
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { mountActionTips } from './game/actionTip';
mountActionTips(); // the one hover card of the game (every [data-tip] / [data-tip-text] element)
import PD from './game/protodata.json';
import ASSETS from './game/assets.json';

// The prototypes' shared CSS (keyframes, icon hover zoom, reduced motion), from design/canvas-build/build.py HELMET.
const style = document.createElement('style');
style.textContent = '@keyframes phcPulse{0%,100%{opacity:.35}50%{opacity:1}}.phc-pulse{animation:phcPulse 1.2s ease-in-out infinite}body{margin:0;background:#0A0D13;color:#E7EBF3;font-family:\'Chakra Petch\',sans-serif}*{box-sizing:border-box}.phc-col-scroll{scrollbar-width:thin;scrollbar-color:#2E3A50 transparent}.phc-col-scroll::-webkit-scrollbar{width:8px}.phc-col-scroll::-webkit-scrollbar-thumb{background:#2E3A50;border-radius:4px}@media (max-width:1000px){.phc-play{height:auto!important;overflow:visible!important}.phc-play-row{flex-wrap:wrap!important;overflow:visible!important}.phc-col-scroll{overflow:visible!important}.phc-input{position:sticky;bottom:0;z-index:2}}@keyframes phcScreenIn{from{transform:translateX(60px);opacity:0}to{transform:none;opacity:1}}.phc-screen-in{animation:phcScreenIn .4s cubic-bezier(.2,.8,.2,1)}button:disabled{cursor:not-allowed!important;opacity:.55}.phc-tok{position:relative;display:block;width:100%;height:100%;outline:none;cursor:default}.phc-tok .phc-pop{display:none}.phc-tok:hover,.phc-tok:focus-visible{z-index:20}.phc-tok:hover .phc-pop,.phc-tok:focus-visible .phc-pop{display:flex}.phc-tok:focus-visible>span:first-child{box-shadow:0 0 0 2px #FFFFFF}.phc-mini .phc-tok>span:first-child{transform:scale(1.7)}.phc-nw-short{display:none}@media (max-width:1100px){.phc-head{flex-wrap:wrap!important;row-gap:8px!important}.phc-head [data-phc-narr-chip]{max-width:100%!important;min-width:0;overflow:hidden}.phc-head .phc-nw-long{display:none}.phc-head .phc-nw-short{display:inline}.phc-shell{flex-wrap:wrap;margin-left:auto}}@media (max-width:600px){.phc-head{padding:10px 12px!important;gap:8px!important}}.phc-modes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.phc-mode:focus-visible{outline:2px solid #FFFFFF;outline-offset:3px}@media (min-width:1700px){.phc-mode .phc-mode-art{height:auto!important;aspect-ratio:4/3;max-height:380px}}@media (max-width:900px){.phc-modes{grid-template-columns:1fr}.phc-mode{flex-direction:row!important}.phc-mode .phc-mode-art{width:132px!important;height:auto!important;min-height:96px;flex:none;border-bottom:0!important;border-right:1px solid #232D3F}}.phc-rig::-webkit-scrollbar{width:6px}.phc-rig::-webkit-scrollbar-thumb{background:#2E3A50;border-radius:3px}' + (PD as any).helmetCss;
document.head.appendChild(style);

// Shared motion (the transitions pass). Every overlay and screen slides in and out with these; other code can use them:
//   Screens (App.tsx puts them on the screen wrapper and on the outgoing screen's snapshot):
//     .phc-slide-in-right / .phc-slide-out-left   forward (the new screen arrives from the right)
//     .phc-slide-in-left  / .phc-slide-out-right  back (to the title)
//     .phc-combat-in  (3D flip in, after the blur)    .phc-combat-ghost (the old screen blurs and darkens)
//     .phc-story-in   (combat ends: a soft rise)      .phc-story-ghost (the fight fades and blurs out)
//   In-and-out pairs: put the base class on the element; add .phc-closing while it leaves (keep it mounted ~200 ms;
//   game/presence.ts usePresence() does that):
//     .phc-a-right (from/to the right) · .phc-a-left · .phc-a-drop (from/to the top) · .phc-a-rise (from/to the
//     bottom) · .phc-a-pop (scale) · .phc-a-fade
//   One-shot entrances: .phc-drop-in · .phc-rise-in · .phc-pop-in · .phc-fade-in · .phc-slide-in-right
//   .phc-stagger: its children rise in one after another (first 10).
//   Reduce motion: App.tsx puts .phc-reduce on <html>; every slide becomes a short fade, the flip and blur are cut.
const MOTION = [
  '@keyframes phcInR{from{transform:translateX(64px);opacity:0}to{transform:none;opacity:1}}@keyframes phcOutL{from{transform:none;opacity:1}to{transform:translateX(-64px);opacity:0}}',
  '@keyframes phcInL{from{transform:translateX(-64px);opacity:0}to{transform:none;opacity:1}}@keyframes phcOutR{from{transform:none;opacity:1}to{transform:translateX(64px);opacity:0}}',
  '@keyframes phcDropIn{from{transform:translateY(-28px);opacity:0}to{transform:none;opacity:1}}@keyframes phcDropOut{from{transform:none;opacity:1}to{transform:translateY(-28px);opacity:0}}',
  '@keyframes phcRiseIn{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}@keyframes phcSinkOut{from{transform:none;opacity:1}to{transform:translateY(24px);opacity:0}}',
  '@keyframes phcPopIn{0%{transform:scale(.88);opacity:0}70%{transform:scale(1.02);opacity:1}100%{transform:none;opacity:1}}@keyframes phcPopOut{from{transform:none;opacity:1}to{transform:scale(.92);opacity:0}}',
  '@keyframes phcFadeIn{from{opacity:0}to{opacity:1}}@keyframes phcFadeOut{from{opacity:1}to{opacity:0}}',
  // Combat in: the old screen blurs and darkens, then the fight flips in around the vertical axis.
  '@keyframes phcGhostBlur{0%{filter:none;transform:none;opacity:1}55%{filter:blur(10px) brightness(.45) saturate(.6);transform:scale(1.03);opacity:1}100%{filter:blur(16px) brightness(.2);transform:scale(1.05) perspective(1400px) rotateY(18deg);opacity:0}}',
  '@keyframes phcFlipIn{0%{transform:perspective(1400px) rotateY(-70deg) scale(.92);opacity:0;filter:brightness(2.2)}55%{opacity:1;filter:brightness(1.3)}100%{transform:none;opacity:1;filter:none}}',
  '@keyframes phcSlash{0%{transform:translateX(-120%) skewX(-24deg);opacity:0}25%{opacity:1}100%{transform:translateX(120%) skewX(-24deg);opacity:0}}',
  '@keyframes phcFlash{0%{opacity:0}30%{opacity:.85}100%{opacity:0}}',
  '@keyframes phcGhostSoft{from{filter:none;opacity:1}to{filter:blur(6px) brightness(.6);opacity:0}}',
  '.phc-slide-in-right{animation:phcInR .42s cubic-bezier(.2,.8,.2,1) both}.phc-slide-out-left{animation:phcOutL .32s cubic-bezier(.5,0,.75,0) both}',
  '.phc-slide-in-left{animation:phcInL .42s cubic-bezier(.2,.8,.2,1) both}.phc-slide-out-right{animation:phcOutR .32s cubic-bezier(.5,0,.75,0) both}',
  '.phc-combat-ghost{animation:phcGhostBlur .62s cubic-bezier(.4,0,.6,1) both}.phc-combat-in{animation:phcFlipIn .55s cubic-bezier(.2,.8,.2,1) .38s both;transform-origin:50% 40%}',
  '.phc-story-ghost{animation:phcGhostSoft .5s ease-in both}.phc-story-in{animation:phcRiseIn .6s cubic-bezier(.2,.8,.2,1) .15s both}',
  '.phc-a-right{animation:phcInR .3s cubic-bezier(.2,.8,.2,1) both}.phc-a-right.phc-closing{animation:phcOutR .2s ease-in both;pointer-events:none}',
  '.phc-a-left{animation:phcInL .3s cubic-bezier(.2,.8,.2,1) both}.phc-a-left.phc-closing{animation:phcOutL .2s ease-in both;pointer-events:none}',
  '.phc-a-drop{animation:phcDropIn .3s cubic-bezier(.2,.8,.2,1) both}.phc-a-drop.phc-closing{animation:phcDropOut .2s ease-in both;pointer-events:none}',
  '.phc-a-rise{animation:phcRiseIn .3s cubic-bezier(.2,.8,.2,1) both}.phc-a-rise.phc-closing{animation:phcSinkOut .2s ease-in both;pointer-events:none}',
  '.phc-a-pop{animation:phcPopIn .32s cubic-bezier(.2,.8,.2,1) both}.phc-a-pop.phc-closing{animation:phcPopOut .2s ease-in both;pointer-events:none}',
  '.phc-a-fade{animation:phcFadeIn .22s ease-out both}.phc-a-fade.phc-closing{animation:phcFadeOut .2s ease-in both;pointer-events:none}',
  '.phc-drop-in{animation:phcDropIn .3s cubic-bezier(.2,.8,.2,1) both}.phc-rise-in{animation:phcRiseIn .36s cubic-bezier(.2,.8,.2,1) both}',
  '.phc-pop-in{animation:phcPopIn .34s cubic-bezier(.2,.8,.2,1) both}.phc-fade-in{animation:phcFadeIn .25s ease-out both}',
  '.phc-stagger>*{animation:phcRiseIn .4s cubic-bezier(.2,.8,.2,1) both}',
  Array.from({ length: 10 }, (_, i) => '.phc-stagger>*:nth-child(' + (i + 1) + '){animation-delay:' + i * 60 + 'ms}').join(''),
  // Reduce motion: everything becomes a fade; the combat flip and blur are skipped.
  '.phc-reduce .phc-slide-in-right,.phc-reduce .phc-slide-in-left,.phc-reduce .phc-combat-in,.phc-reduce .phc-story-in,.phc-reduce .phc-a-right,.phc-reduce .phc-a-left,.phc-reduce .phc-a-drop,.phc-reduce .phc-a-rise,.phc-reduce .phc-a-pop,.phc-reduce .phc-drop-in,.phc-reduce .phc-rise-in,.phc-reduce .phc-pop-in,.phc-reduce .phc-stagger>*{animation:phcFadeIn .15s ease-out both!important}',
  '.phc-reduce .phc-slide-out-left,.phc-reduce .phc-slide-out-right,.phc-reduce .phc-combat-ghost,.phc-reduce .phc-story-ghost,.phc-reduce .phc-closing{animation:phcFadeOut .15s ease-in both!important}',
].join('');
// Painted gear icons (game/gearIcons.ts) are full colour and never tinted; much of their metal is charcoal, so a faint
// light lift sits behind them to keep the silhouette off the dark panel at 24 to 32 px (background only: no layout moves).
const gearLift = document.createElement('style'); gearLift.id = 'phc-gear-lift';
gearLift.textContent = 'img[src^="/assets/gear-"]{background:radial-gradient(closest-side,rgba(231,235,243,.16),rgba(231,235,243,.05) 70%,rgba(231,235,243,0));border-radius:8px}';
document.head.appendChild(gearLift);
const motion = document.createElement('style'); motion.id = 'phc-global-motion'; motion.textContent = MOTION; document.head.appendChild(motion);

// Every image the game uses: thumbnails first, then the large (zoom) sizes. Failed loads count as done.
// The painted gear icons (gear-<item id>, game/gearIcons.ts) don't hold the title: the small ones (about 260 KB) load
// after the zoom sizes, and their -lg sizes (hand cards, hover cards; about 1.5 MB) load only when a screen shows one.
const isGear = (k: string) => k.startsWith('gear-');
const all = Object.entries(ASSETS as Record<string, string>).filter(([k]) => !(isGear(k) && k.endsWith('-lg')));
const URLS = [...all.filter(([k]) => !k.endsWith('-lg') && !isGear(k)), ...all.filter(([k]) => k.endsWith('-lg')), ...all.filter(([k]) => isGear(k))].map(([, u]) => u);
/** The title opens once the small sizes are in; the large (zoom) sizes keep loading in the background. */
const SMALL = all.filter(([k]) => !k.endsWith('-lg') && !isGear(k)).length;
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
  return Promise.all(Array.from({ length: 16 }, one)).then(() => {});
}

function Loader() {
  const [n, setN] = useState(0), [ready, setReady] = useState(false);
  useEffect(() => { let open = false; const go = () => { if (!open) { open = true; setTimeout(() => setReady(true), 250); } }; preload((k) => { setN(k); if (k >= SMALL) go(); }).then(go); }, []);
  if (ready) return <App />;
  const total = SMALL || URLS.length, pct = total ? Math.min(100, Math.round((n / total) * 100)) : 100;
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
          <span>LOADING ART · {Math.min(n, total)} / {total}</span><span>{pct}%</span>
        </div>
        <button onClick={() => setReady(true)} style={{ minHeight: 42, padding: '0 16px', borderRadius: 10, border: '1px solid #232D3F', background: 'transparent', color: '#A3AEC2', fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer' }}>
          Skip, load as I go
        </button>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Loader />);
