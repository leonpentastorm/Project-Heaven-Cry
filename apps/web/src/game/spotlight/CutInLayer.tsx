// The spotlight cut-in overlay (docs/design/cutin-spec.md 3, decision 113): the screen behind blurs and dims, and torn
// strips of painted eyes cross it, inked in each character's colour (a god's in its accent). Mounted once in App.tsx
// over every in-room screen, z-index 64 (over the turn intro's 57–58 and the effects layer's 45, under the Miracle's 66).
//
// It draws whatever spotlight/index.ts says is showing (a fight's moment comes from fx/play.ts's gate; anything else from
// showSpotlight). It also watches the story's own fx stream (out of a fight: a crit, an Ultimate, a deed, Play my song) and
// plays those moments on any in-room screen. Any click or key skips; the skipping click never reaches the game.
import React from 'react';
import type { FxEvent, GameState } from '@engine';
import { bigPortrait } from '../charfile';
import { reducedMotion } from '../sfx';
import { stripShape } from './tear';
import { stackLayout, cropOf, NARROW_PX } from './layout';
export { stackLayout, cropOf, tornStripMarkup, NARROW_PX } from './layout';
import { type CutInSpec, type CutInStrip, type Showing, GOD_WORD_INK, cutInNow, onCutIn, skipCutIn, cutInForFx, showSpotlight, stripForChar, stripForPatron } from './index';
import { CUTIN_ARM_MS } from './timing';

const BODY = '#10151F', GROUND = '#0A0D13', TEXT = '#E7EBF3';

/** A portrait's source width, as far as it is known before it loads: the room's copy of an upload is 320 px wide, the
 *  art library's large copies 800. Measured once it loads. */
const natGuess = (src: string) => (/^data:/.test(src) ? 320 : 800);
/** words: where the strip's words go: 'side' (one wide strip: beside the eyes), 'chip' (a stack: the name in the torn-off
 *  end), 'none' (a narrow screen: all of it in the plate under the strips). */
/** A CSS time at the combat speed's pace (k: Showing.pace, 1 outside a fight). */
const T = (ms: number, k: number) => Math.round(ms * k) + 'ms';
function Strip({ s, i, w, h, seed, frac, windowLeft, rm, out, words, spec, dx = 0, k = 1 }: { s: CutInStrip; i: number; w: number; h: number; seed: string; frac: number; windowLeft: boolean; rm: boolean; out: boolean; words: 'side' | 'chip' | 'none'; spec: CutInSpec; dx?: number; k?: number }) {
  const [img, setImg] = React.useState(s.img);
  const [natW, setNatW] = React.useState(() => natGuess(s.img));
  React.useEffect(() => { setImg(s.img); setNatW(natGuess(s.img)); if (/^data:/.test(s.img)) bigPortrait(s.img).then((b) => setImg(b)).catch(() => {}); }, [s.img]);
  React.useEffect(() => { if (!img) return; const im = new Image(); im.onload = () => { if (im.naturalWidth) setNatW(im.naturalWidth); }; im.src = img; }, [img]);
  const over = w * 0.0833; // the strip overhangs the screen by 10% of the screen's width on each side (w = 1.2 vw)
  // The image reaches past what the screen shows of the window's outer side: the strip is shifted by dx and tilted, so
  // the screen's edge can sit further out than `over` (never a flat untorn slab at the edge).
  const cropFor = (edgeX: number) => {
    const x0 = windowLeft ? over : edgeX, x1 = windowLeft ? edgeX : w - over;
    return cropOf(s.eye, x0, x1, h, 0.17, windowLeft ? { l: over - Math.max(0, dx) - 24, r: x1 + 20, natW, anchor: 'l' } : { l: x0 - 20, r: w - over + Math.max(0, -dx) + 24, natW, anchor: 'r' });
  };
  // A capped crop (a small source, an upload's room copy, on a wide screen) can't fill the window: the window narrows to
  // the image (its torn side 24 px inside the image's end) and the strip's body and its words take the rest.
  const first = cropFor(windowLeft ? w * frac : w * (1 - frac));
  // A whole avatar (a small square face: Wick's placeholder robot) is drawn whole at 1.3 × the strip's height, in a
  // window fitted to it with room either side (where the same picture, blurred and dimmed, fills in).
  const side = Math.round(h * 1.3);
  const fitWhole = Math.min(frac, Math.max(0.3, (over + side + 2 * Math.max(60, h * 0.45)) / w));
  const fit = s.whole ? fitWhole : first.capped ? Math.min(frac, Math.max(0.3, windowLeft ? (first.x + first.w - 24) / w : 1 - (first.x + 24) / w)) : frac;
  const shape = React.useMemo(() => stripShape(seed + '|' + i + '|' + s.key, w, h, { windowFrac: fit, windowLeft }), [seed, i, s.key, w, h, fit, windowLeft]);
  const winX0 = windowLeft ? over : shape.edgeX, winX1 = windowLeft ? shape.edgeX : w - over;
  const crop = fit === frac ? first : cropFor(shape.edgeX);
  const id = 'ci' + i + '-' + String(seed).replace(/[^\w]/g, '').slice(-10);
  const inkEdgeA = windowLeft ? shape.edgeX - w * 0.18 : shape.edgeX, inkEdgeB = windowLeft ? shape.edgeX : shape.edgeX + w * 0.18;
  const textSide = windowLeft ? { left: shape.edgeX + 28, right: over + 24 } : { left: over + 24, right: w - shape.edgeX + 28 };
  // The name on one line where it can be: its size from the column's width (Spectral 600 is about 0.52 em a letter).
  const colW = w - textSide.left - textSide.right, nameSize = Math.round(Math.max(24, Math.min(44, colW / Math.max(6, s.name.length * 0.52))));
  const labelInk = s.god ? GOD_WORD_INK : s.ink;
  // The stack's name chip (in the torn-off end): one line at 14 px where it fits (Chakra Petch with .12em tracking is
  // about 0.72 em a letter), down to 12 px, then two lines; never cut off ('THE COUNTING WEAVER' at 1280 px).
  const chipSide = windowLeft ? { left: shape.edgeX + 22, right: over + 16 + Math.max(0, dx) } : { left: over + 16 + Math.max(0, -dx), right: w - shape.edgeX + 22 };
  const chipW = Math.max(40, w - chipSide.left - chipSide.right), chipSize = Math.round(Math.max(12, Math.min(14, chipW / Math.max(4, s.name.length * 0.72))));
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <svg width={w} height={h} viewBox={'0 0 ' + w + ' ' + h} style={{ position: 'absolute', inset: 0, overflow: 'visible' }} aria-hidden="true">
        <defs>
          <clipPath id={id + 'b'}><polygon points={shape.body} /></clipPath>
          <clipPath id={id + 'w'}><polygon points={shape.window} /></clipPath>
          <linearGradient id={id + 'g'} x1={windowLeft ? '1' : '0'} y1="0" x2={windowLeft ? '0' : '1'} y2="0">
            <stop offset="0" stopColor={s.ink} stopOpacity=".55" /><stop offset=".35" stopColor={s.ink} stopOpacity=".18" /><stop offset="1" stopColor={s.ink} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={id + 'l'} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" /><stop offset=".5" stopColor="#FFFFFF" stopOpacity=".28" /><stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
          <filter id={id + 'f'} x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation={Math.max(8, h * 0.06)} /></filter>
          <linearGradient id={id + 'e'} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#FFFFFF" stopOpacity="0" /><stop offset=".14" stopColor="#FFFFFF" stopOpacity="1" /><stop offset=".86" stopColor="#FFFFFF" stopOpacity="1" /><stop offset="1" stopColor="#FFFFFF" stopOpacity="0" /></linearGradient>
          <mask id={id + 'm'} maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill={'url(#' + id + 'e)'} /></mask>
          <linearGradient id={id + 'v'} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={GROUND} stopOpacity=".55" /><stop offset=".22" stopColor={GROUND} stopOpacity="0" /><stop offset=".78" stopColor={GROUND} stopOpacity="0" /><stop offset="1" stopColor={GROUND} stopOpacity=".6" />
          </linearGradient>
        </defs>
        <polygon points={shape.lip} fill={s.ink} />
        <polygon points={shape.body} fill={s.god ? GROUND : BODY} stroke={GROUND} strokeWidth="2" strokeLinejoin="round" />
        <g clipPath={'url(#' + id + 'b)'} data-phc-spotlight-window={Math.round(winX1 - winX0)}>
          <g clipPath={'url(#' + id + 'w)'}>
            <rect x="0" y="0" width={w} height={h} fill="#1C2536" />
            {img && !s.whole && <image data-phc-spotlight-face="crop" href={img} x={crop.x} y={crop.y} width={crop.w} height={crop.h} preserveAspectRatio="xMidYMid slice" />}
            {img && s.whole && (() => {
              // Centred in what the screen shows of the window; the eyes on the strip's middle line where the picture allows.
              const vx0 = windowLeft ? winX0 - Math.min(0, dx) : winX0, vx1 = windowLeft ? winX1 : Math.min(winX1, w - over - dx);
              const cx = (vx0 + vx1) / 2, y = Math.min(h * 0.12, Math.max(h - side, h / 2 - s.eye.y * side)); // the eyes on the middle line, the whole head in
              return <>
                <image href={img} x={winX0 - 40} y={-h} width={winX1 - winX0 + 80} height={h * 3} preserveAspectRatio="xMidYMid slice" filter={'url(#' + id + 'f)'} opacity=".5" />
                <image data-phc-spotlight-face="whole" href={img} x={cx - side / 2} y={y} width={side} height={side} preserveAspectRatio="xMidYMid meet" mask={'url(#' + id + 'm)'} />
              </>;
            })()}
            {!img && s.badge && <text x={(winX0 + winX1) / 2} y={h / 2} textAnchor="middle" dominantBaseline="central" data-phc-spotlight-face="badge"
              style={{ fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: Math.round(h * 0.42), letterSpacing: '.06em' }} fill={s.ink}>{s.badge}</text>}
            <rect x={inkEdgeA} y="0" width={inkEdgeB - inkEdgeA} height={h} fill={'url(#' + id + 'g)'} style={{ mixBlendMode: 'screen' }} />
            <rect x="0" y="0" width={w} height={h} fill={'url(#' + id + 'v)'} />
            {!rm && <rect className="phc-ci-light" x={windowLeft ? over : shape.edgeX} y="-10" width={w * 0.16} height={h + 20} fill={'url(#' + id + 'l)'}
              style={{ animation: 'phcCiLight ' + T(400, k) + ' ease-out ' + T(300 + 70 * i, k) + ' both', ['--ci-run' as any]: (winX1 - winX0) + 'px' }} />}
          </g>
          <polyline points={shape.window.split(' ').slice(1, -1).join(' ')} fill="none" stroke={s.ink} strokeWidth="3" strokeLinejoin="round" />
        </g>
      </svg>
      {words === 'side' ? (
        <div data-phc-spotlight-words="" style={{ position: 'absolute', top: 0, bottom: 0, ...textSide, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, minWidth: 0, textAlign: windowLeft ? 'left' : 'right',
          opacity: out ? 0 : 1, transition: 'opacity ' + T(150, k), animation: rm ? 'none' : spec.short ? 'phcCiText ' + T(200, k) + ' ease-out ' + T(140, k) + ' both' : 'phcCiText ' + T(300, k) + ' ease-out ' + T(220, k) + ' both' }}>
          <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '.22em', color: labelInk, textTransform: 'uppercase', overflowWrap: 'anywhere' }}>{spec.label}</span>
          <span style={{ fontFamily: "'Spectral', serif", fontWeight: 600, fontSize: nameSize, lineHeight: 1.05, color: '#FFFFFF', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.name}</span>
          {spec.line && <span style={{ fontFamily: "'Spectral', serif", fontStyle: 'italic', fontSize: 18, lineHeight: 1.35, color: TEXT, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>“{spec.line}”</span>}
          {spec.caption && <span style={{ fontFamily: "'Spectral', serif", fontStyle: 'italic', fontSize: spec.line ? 16 : 20, lineHeight: 1.35, color: spec.line ? '#A3AEC2' : TEXT, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{spec.caption}</span>}
        </div>
      ) : words === 'none' ? null : (
        // The name sits in the torn-off end, inside what the screen shows of it (the strip is shifted by dx).
        // A god's name is in Virtue ink like its other words (colour-system.md): the patron's accent is the lip's alone.
        <div style={{ position: 'absolute', top: 0, bottom: 0, ...chipSide, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: windowLeft ? 'flex-start' : 'flex-end', gap: 2, minWidth: 0 }}>
          <span data-phc-cut-chip={s.key} style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: chipSize, lineHeight: 1.15, fontWeight: 700, letterSpacing: '.12em', color: labelInk, textTransform: 'uppercase', textAlign: windowLeft ? 'left' : 'right', overflowWrap: 'break-word', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', maxWidth: '100%' }}>{s.name}</span>
          <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '.22em', color: s.god ? GOD_WORD_INK : '#A3AEC2', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{s.god ? 'PATRON' : s.word}</span>
        </div>
      )}
    </div>
  );
}

const CSS = [
  '@keyframes phcCiVeil{from{opacity:0}to{opacity:1}}',
  '@keyframes phcCiInL{0%{transform:translateX(-115%) scaleY(.35);opacity:0}55%{opacity:1}100%{transform:translateX(0) scaleY(1);opacity:1}}',
  '@keyframes phcCiInR{0%{transform:translateX(115%) scaleY(.35);opacity:0}55%{opacity:1}100%{transform:translateX(0) scaleY(1);opacity:1}}',
  '@keyframes phcCiFade{from{opacity:0}to{opacity:1}}',
  '@keyframes phcCiOutU{to{transform:translateY(-36px) scaleY(.6);opacity:0}}',
  '@keyframes phcCiOutD{to{transform:translateY(36px) scaleY(.6);opacity:0}}',
  '@keyframes phcCiOutF{to{opacity:0}}',
  '@keyframes phcCiText{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:none}}',
  '@keyframes phcCiLight{from{transform:translateX(0)}to{transform:translateX(var(--ci-run))}}',
  '.phc-ci-veil{position:absolute;inset:0;background:rgba(5,7,11,.55)}',
  '@supports ((backdrop-filter:blur(3px)) or (-webkit-backdrop-filter:blur(3px))){.phc-ci-veil{background:rgba(5,7,11,.18);backdrop-filter:blur(3px) brightness(.55) saturate(.85);-webkit-backdrop-filter:blur(3px) brightness(.55) saturate(.85)}}',
].join('\n');

export function CutInView({ show }: { show: Showing }) {
  const { spec, rm, out, skipped } = show;
  const [size, setSize] = React.useState(() => ({ vw: innerWidth, vh: innerHeight }));
  React.useEffect(() => { const f = () => setSize({ vw: innerWidth, vh: innerHeight }); addEventListener('resize', f); return () => removeEventListener('resize', f); }, []);
  const { vw, vh } = size, n = spec.strips.length, single = n === 1, narrow = vw < NARROW_PX;
  // A narrow screen: the eye window runs nearly the strip's width and every word goes in the plate under the strips.
  const words: 'side' | 'chip' | 'none' = narrow ? 'none' : single ? 'side' : 'chip', frac = narrow ? 0.86 : single ? 0.62 : 0.76;
  const lay = stackLayout(n, vw, vh, spec.strips.map((s) => !!s.god), !!spec.short);
  const w = vw * 1.2, seed = String(spec.seed ?? spec.id ?? 'cutin');
  const k = show.pace || 1, outMs = (skipped ? 150 : spec.short ? 200 : 250) * k, lead = spec.strips[0];
  const plate = words !== 'side', plateTop = lay[n - 1].top + lay[n - 1].h + vh * 0.025;
  return (
    <div data-phc-spotlight={spec.kind} data-phc-spotlight-id={show.id} style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
      <style>{CSS}</style>
      <div className="phc-ci-veil" data-phc-spotlight-blur="" style={{ animation: out ? 'phcCiOutF ' + T(outMs / k + 100, k) + ' ease-in ' + T(skipped ? 0 : 100, k) + ' both' : 'phcCiVeil ' + T(rm ? 120 : 160, k) + ' ease-out both' }} />
      {spec.strips.map((s, i) => {
        const L = lay[i], delay = T(40 + 70 * i, k);
        const inAnim = rm ? 'phcCiFade ' + T(120, k) + ' ease-out both' : (L.fromLeft ? 'phcCiInL' : 'phcCiInR') + ' ' + T(240, k) + ' cubic-bezier(.2,.9,.25,1) ' + delay + ' both';
        const outAnim = rm ? 'phcCiOutF ' + T(outMs, 1) + ' ease-in both' : (i % 2 ? 'phcCiOutD' : 'phcCiOutU') + ' ' + T(outMs, 1) + ' ease-in both';
        return (
          <div key={s.key + i} data-phc-spotlight-strip={s.key} style={{ position: 'absolute', left: -vw * 0.1 + L.dx, top: L.top, width: w, height: L.h, transform: 'rotate(' + L.tilt + 'deg)', transformOrigin: '50% 50%', filter: 'drop-shadow(0 10px 24px rgba(0,0,0,.55))' }}>
            <div style={{ position: 'absolute', inset: 0, animation: out ? outAnim : inAnim, transformOrigin: '50% 50%' }}>
              <Strip s={s} i={i} w={w} h={L.h} seed={seed} frac={frac} windowLeft={L.windowLeft} rm={rm} out={out} words={words} spec={spec} dx={L.dx} k={k} />
            </div>
          </div>
        );
      })}
      {plate && (
        <div data-phc-spotlight-plate="" style={{ position: 'absolute', left: 'calc(50% - min(360px, 46vw))', top: Math.min(plateTop, vh - (narrow ? 180 : 120)), width: 'min(720px, 92vw)', boxSizing: 'border-box', padding: '12px 18px 14px', background: 'rgba(10,13,19,.92)', borderTop: '3px solid ' + (lead.god ? lead.ink : lead.ink), boxShadow: '0 10px 30px rgba(0,0,0,.5)',
          display: 'flex', flexDirection: 'column', gap: 4, opacity: out ? 0 : 1, transition: 'opacity ' + T(150, k), animation: rm ? 'phcCiFade ' + T(120, k) + ' ease-out both' : spec.short ? 'phcCiText ' + T(200, k) + ' ease-out ' + T(140, k) + ' both' : 'phcCiText ' + T(300, k) + ' ease-out ' + T(260 + 70 * (n - 1), k) + ' both' }}>
          <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: narrow ? '.14em' : '.3em', color: lead.god ? GOD_WORD_INK : lead.ink, overflowWrap: 'anywhere' }}>{spec.label}</span>
          {narrow && single && <span style={{ fontFamily: "'Spectral', serif", fontWeight: 600, fontSize: 30, lineHeight: 1.1, color: '#FFFFFF', overflowWrap: 'anywhere' }}>{lead.name}</span>}
          {narrow && !single && (
            // Who is in the moment: each name in its ink with its word (colour is never the only signal).
            <span data-phc-spotlight-names="" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', fontFamily: "'Chakra Petch', sans-serif", fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>
              {spec.strips.map((x) => <span key={x.key} style={{ whiteSpace: 'nowrap' }}><span style={{ color: x.god ? GOD_WORD_INK : x.ink }}>{x.name}</span> <span style={{ fontSize: 10, letterSpacing: '.16em', color: x.god ? GOD_WORD_INK : '#A3AEC2' }}>{x.god ? 'PATRON' : x.word.toUpperCase()}</span></span>)}
            </span>
          )}
          {spec.line && <span style={{ fontFamily: "'Spectral', serif", fontStyle: 'italic', fontSize: 19, lineHeight: 1.35, color: TEXT }}>“{spec.line}”</span>}
          {spec.caption && <span style={{ fontFamily: "'Spectral', serif", fontStyle: 'italic', fontSize: spec.line ? 15 : 19, lineHeight: 1.35, color: spec.line ? '#A3AEC2' : TEXT }}>{spec.caption}</span>}
        </div>
      )}
      <div role="status" aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{spec.aria || spec.label + (spec.caption ? ': ' + spec.caption : '')}</div>
    </div>
  );
}

/** The story's spotlight moments (out of a fight) wait this long, so the dice verdict comes first. */
const storyDelay = (evs: any[]) => (evs.some((e) => e.kind === 'crit') ? (evs.some((e) => e.echo) ? 1100 : 350) : 200);
const IN_ROOM = new Set(['room', 'main', 'combat', 'levelup', 'ultimate']);

export function CutInLayer({ game, screen }: { game: GameState | null; screen: string }) {
  const [show, setShow] = React.useState<Showing | null>(() => cutInNow());
  React.useEffect(() => onCutIn(() => setShow(cutInNow() ? { ...cutInNow()! } : null)), []);
  // Any click or key skips (armed a beat late, so the click that made the action never skips its own cut-in). The
  // skipping click is swallowed: it never also gives a grid order. A key typed into a field skips but is not swallowed.
  React.useEffect(() => {
    if (!show || show.skipped) return;
    const swallowClick = () => { const f = (e: Event) => { e.preventDefault(); e.stopPropagation(); }; addEventListener('click', f, true); setTimeout(() => removeEventListener('click', f, true), 400); };
    const onDown = (e: PointerEvent) => { e.preventDefault(); e.stopPropagation(); swallowClick(); skipCutIn(); };
    const onKey = (e: KeyboardEvent) => { const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName || ''); if (!typing) { e.preventDefault(); e.stopPropagation(); } skipCutIn(); };
    const arm = setTimeout(() => { addEventListener('pointerdown', onDown, true); addEventListener('keydown', onKey, true); }, CUTIN_ARM_MS);
    return () => { clearTimeout(arm); removeEventListener('pointerdown', onDown, true); removeEventListener('keydown', onKey, true); };
  }, [show?.id, show?.skipped]);

  // ----- the story stream (out of a fight): moments play on any in-room screen -----
  const seen = React.useRef<{ code: string | null; n: number }>({ code: null, n: 0 });
  const fx = (game?.story as any)?.fx as FxEvent[] | undefined, top = fx?.length ? fx[fx.length - 1].n : 0;
  const latest = React.useRef(game); latest.current = game;
  React.useEffect(() => {
    if (!game) { seen.current = { code: null, n: 0 }; return; }
    const h = seen.current;
    if (h.code !== game.code || top < h.n) { seen.current = { code: game.code, n: top }; return; } // a new or loaded game: sync silently
    const fresh = (fx || []).filter((e) => e.n > h.n && e.k === 'spotlight');
    seen.current = { code: game.code, n: top };
    if (!fresh.length || !IN_ROOM.has(screen) || document.hidden) return;
    const t = setTimeout(() => { const g = latest.current; const c = cutInForFx(g, fresh, 'st|' + game.code); if (c) showSpotlight(c.spec, { prefApplied: true }); }, storyDelay(fresh));
    return () => { /* a moment that has landed still plays */ void t; };
  }, [top, game?.code]);

  // ----- preload: the party's and their patrons' large portraits when a fight starts (a cut-in never waits on the network) -----
  const fightKey = game?.combat ? game.code + '|' + game.combat.name : '';
  React.useEffect(() => {
    if (!fightKey || !game) return;
    for (const c of Object.values(game.characters || {}) as any[]) {
      const s = stripForChar(game, c.id); if (s?.img && !/^data:/.test(s.img)) { const im = new Image(); im.src = s.img; }
      if (c.patron) { const p = stripForPatron(c.patron); if (p?.img) { const im = new Image(); im.src = p.img; } }
    }
  }, [fightKey]);

  if (!show) return null;
  return <div aria-hidden={false} style={{ position: 'fixed', inset: 0, zIndex: 64, pointerEvents: 'auto', cursor: 'pointer' }}><CutInView key={show.id} show={show} /></div>;
}

