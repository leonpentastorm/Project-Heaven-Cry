// The Survival path map as a themed overland map (rules 1.48, Leon 13 Nov: "theme it"; survival-spec 4.3 and 8.2). It
// draws runView's nodes and links and builds nothing of its own: where a node sits comes from the generator's depth (left
// to right, the camp at the far left, the Boss at the far right) and its lane (top to bottom), plus a small jitter seeded
// by the node's id so the trails look hand-drawn; trails are dashed curves between them; nodes are inked markers on the
// trail. Under it the setting's painted backdrop (`survival-map-<setting>`, 2560 x 1440, the artist's: the art contract
// in survival-spec 4.3) or, while it is missing, a dark field chart drawn here (a parchment-toned panel and faint
// contour lines). Every action is the caller's (`onPick`); every word and number is the engine's (runView.ts).
// The markers are the artist's inked node markers (`survival-node-<kind>`, catalog survival_art's marker sheet, white flat
// ink on transparent), drawn as a mask in the marker's state colour; a kind with no marker (the camp, the vault's guard
// and its chest) keeps its SVG line icon (runIcons.ts), as does every kind while its marker is missing.
import React from 'react';
import ASSETS from './assets.json';
import { nodeIconSvg } from './runIcons';
import { tipProps } from './actionTip';
import type { RunNodeV, RunViewV } from './runView';

const A = ASSETS as Record<string, string>;
/** The map's own coordinates (a 16:9 box; the backdrop's 2560 x 1440 scaled). */
const W = 1600, H = 900;
/** How far from the top and bottom edges the vault's spur may sit (map units: half a marker and its label). */
const SPUR_MARGIN = 48;
/** The backdrops too busy across the lanes' band for the trails to read (looked at in the game, 14 Nov: rooftops,
 * gantries and lit windows run through the middle): a dark band under the trails, this strong in its middle. The calm
 * ones (field, shrine) have none. A new backdrop is drawn without one until someone looks at it. */
const SCRIM: Record<string, number> = { city: 0.42, rim: 0.38, ahoc: 0.3, works: 0.3 };
const ink = { white: '#FFFFFF', text: '#E7EBF3', muted: '#A3AEC2', trail: 'rgba(231,235,243,0.42)', quiet: 'rgba(214,200,170,0.30)', quietArt: 'rgba(236,226,204,0.62)', disc: '#14110C', discWalked: '#221D15' };

/** A number from a string, the same every time (the jitter's seed): FNV-1a. */
function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const jit = (id: string, k: string, amp: number) => ((hash(id + k) % 1000) / 1000 - 0.5) * 2 * amp;

/** The artist's marker for each node kind (art/icons/survival/markers/<file>.png, built as survival-node-<file>); the
 * gate is an Elite. Kinds not here (start, vault_guard, vault) have no inked marker yet: the line icon draws them. */
const MARKER: Record<string, string> = { fight: 'fight', elite: 'elite', gate: 'elite', boss: 'boss', shop: 'shop', forge: 'forge', training: 'training', shrine: 'shrine', rest: 'rest', cache: 'cache', event: 'crossroads' };
/** A node kind's glyph at `size` css px in the current colour: the inked marker (a CSS mask, so the state colours still
 * apply) or, with none, the SVG line icon. `data-phc-marker` says which ("art" or "line"). */
export function NodeGlyph({ kind, size }: { kind: string; size: number }) {
  const url = MARKER[kind] ? A['survival-node-' + MARKER[kind]] : undefined;
  if (url) {
    const m = 'url("' + url + '") center / contain no-repeat';
    return <span aria-hidden="true" data-phc-marker="art" style={{ display: 'block', width: size, height: size, background: 'currentColor', WebkitMask: m, mask: m }} />;
  }
  return <span aria-hidden="true" data-phc-marker="line" style={{ display: 'inline-grid', placeItems: 'center' }} dangerouslySetInnerHTML={{ __html: nodeIconSvg(kind === 'gate' ? 'elite' : kind, size) }} />;
}

/** Where every node sits on the map, by its depth and column (rules 1.48), with the jitter; the camp's spot too. */
export function layoutPathMap(v: Pick<RunViewV, 'nodes' | 'rows' | 'lanes'>): { pos: Record<string, { x: number; y: number }>; camp: { x: number; y: number }; dx: number } {
  const x0 = 175, x1 = W - 90, dx = (x1 - x0) / Math.max(1, v.rows - 1), mid = Math.max(0, v.lanes - 1);
  const gap = Math.min(180, 560 / Math.max(1, v.lanes - 1)) / 2; // half a lane's spacing: a column step
  const yOf = (col: number) => H / 2 + (col - mid) * gap;
  const pos: Record<string, { x: number; y: number }> = {};
  const byId: Record<string, RunNodeV> = {}; for (const n of v.nodes) byId[n.id] = n;
  for (const n of v.nodes) {
    if (n.spur) continue;
    const fixed = n.gate || n.kind === 'boss' || n.depth === v.rows - 1;
    pos[n.id] = { x: x0 + (n.depth - 1) * dx + (fixed ? 0 : jit(n.id, 'x', dx * 0.12)), y: yOf(n.col) + (fixed ? 0 : jit(n.id, 'y', gap * 0.16)) };
  }
  for (const n of v.nodes) {
    if (!n.spur) continue;
    const at = n.from ? pos[n.from] : null, from = n.from ? byId[n.from] : null; if (!at || !from) continue;
    const side = Math.sign(n.col - from.col) || 1, off = Math.min(gap * 1.1, 95);
    // the spur leaves its edge lane outward; it is kept inside the map's own box (a marker's half and its label's height
    // from the edge: SPUR_MARGIN), so the frame never clips the guard or the chest (rules 1.48; survival suite)
    const y = (k: number) => Math.max(SPUR_MARGIN, Math.min(H - SPUR_MARGIN, at.y + side * off * k));
    pos[n.id] = n.spur === 'guard' ? { x: at.x + dx * 0.6, y: y(0.85) } : { x: at.x + dx * 1.25, y: y(1.25) };
  }
  return { pos, camp: { x: 62, y: H / 2 }, dx };
}

/** A trail between two points: a gentle curve (handles along the line of travel), bent a little by the seed. */
function trailPath(a: { x: number; y: number }, b: { x: number; y: number }, key: string): string {
  const mx = (b.x - a.x) * 0.5, bend = jit(key, 'b', 10);
  return 'M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + ' C' + (a.x + mx).toFixed(1) + ' ' + (a.y + bend).toFixed(1) + ' ' + (b.x - mx).toFixed(1) + ' ' + (b.y - bend).toFixed(1) + ' ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1);
}

/** The fallback backdrop (no painting yet for this setting): a dark field chart, faint contour rings in the top and
 * bottom margins (never across the lanes' band), a faint graticule and a vignette. Seeded by the setting. */
function FieldChart({ setting }: { setting: string }) {
  const hills: React.ReactNode[] = [];
  for (let i = 0; i < 7; i++) {
    const cx = 120 + (hash(setting + 'hx' + i) % 1360), top = i % 2 === 0, cy = top ? 40 + (hash(setting + 'hy' + i) % 90) : H - 40 - (hash(setting + 'hy' + i) % 90);
    const r0 = 40 + (hash(setting + 'hr' + i) % 70);
    for (let k = 0; k < 5; k++) {
      const r = r0 + k * 22, pts: string[] = [];
      for (let a = 0; a <= 24; a++) { const t = (a / 24) * Math.PI * 2, w = 1 + 0.12 * Math.sin(t * 3 + i + k * 0.7); pts.push((cx + Math.cos(t) * r * 1.6 * w).toFixed(1) + ' ' + (cy + Math.sin(t) * r * 0.75 * w).toFixed(1)); }
      hills.push(<path key={i + '-' + k} d={'M' + pts.join(' L') + ' Z'} fill="none" stroke="rgba(214,196,160,0.10)" strokeWidth={1.2} />);
    }
  }
  const grid: React.ReactNode[] = [];
  for (let x = 100; x < W; x += 100) grid.push(<line key={'gx' + x} x1={x} y1={0} x2={x} y2={H} stroke="rgba(214,196,160,0.035)" strokeWidth={1} />);
  for (let y = 100; y < H; y += 100) grid.push(<line key={'gy' + y} x1={0} y1={y} x2={W} y2={y} stroke="rgba(214,196,160,0.035)" strokeWidth={1} />);
  return (
    <svg viewBox={'0 0 ' + W + ' ' + H} preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
      <defs>
        <radialGradient id="phc-chart-ground" cx="50%" cy="48%" r="75%"><stop offset="0%" stopColor="#2A2419" /><stop offset="70%" stopColor="#17130D" /><stop offset="100%" stopColor="#0B0A07" /></radialGradient>
      </defs>
      <rect x={0} y={0} width={W} height={H} fill="url(#phc-chart-ground)" />
      {grid}
      {hills}
      <rect x={10} y={10} width={W - 20} height={H - 20} fill="none" stroke="rgba(214,196,160,0.12)" strokeWidth={2} />
    </svg>
  );
}

function Marker({ n, p, onPick, labelBelow }: { n: RunNodeV; p: { x: number; y: number }; onPick: (n: RunNodeV, el: HTMLElement) => void; /** the vault's fork: its label on the side away from the spur */ labelBelow?: boolean }) {
  const lit = n.state === 'reachable', here = n.state === 'here', walked = n.state === 'walked', passed = n.state === 'passed';
  const big = n.kind === 'boss' ? 64 : n.gate ? 50 : n.junction ? 42 : n.spur ? 40 : 36;
  const col = here || lit ? ink.white : walked ? ink.text : passed ? ink.muted : '#D9DCE3';
  const ring = here ? '3px solid ' + ink.white : lit ? '2px solid ' + ink.white : walked ? '2px solid ' + ink.text : n.spur ? '2px dashed rgba(231,235,243,0.55)' : '1.5px solid rgba(214,200,170,0.55)';
  const label = n.word + (here ? ', you are here' : lit ? ', reachable' : walked ? ', walked' : '') + (n.junction ? ', a junction' : '') + (n.spur ? ', a dead end' : '') + (n.leans.length ? ', marked by ' + n.leans.map((l) => l.name).join(' and ') : '');
  const below = labelBelow ?? (n.depth % 2 === 1 || n.kind === 'boss' || !!n.gate); // labels alternate above and below, so neighbours never collide (the vault's spur: beside)
  return (
    <button type="button" data-phc-node={n.id} data-phc-kind={n.kind} data-phc-state={n.state} data-phc-junction={n.junction ? '' : undefined} data-phc-spur={n.spur || undefined}
      aria-label={label} {...tipProps(n.tip + (n.why ? ' ' + n.why : ''))} onClick={(e) => onPick(n, e.currentTarget)}
      style={{ position: 'absolute', left: (p.x / W) * 100 + '%', top: (p.y / H) * 100 + '%', width: big, height: big, transform: 'translate(-50%, -50%)', padding: 0, border: 0, background: 'transparent', fontFamily: 'inherit', cursor: lit ? 'pointer' : 'default', opacity: passed ? 0.45 : 1, zIndex: here || lit ? 4 : 3 }}>
      {here ? <span aria-hidden="true" className="phc-pm-here" style={{ position: 'absolute', inset: -9, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.55)' }} /> : null}
      <span aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', borderRadius: n.junction ? 10 : '50%', transform: n.junction ? 'rotate(45deg)' : undefined, border: ring, background: walked || here ? ink.discWalked : ink.disc, boxShadow: lit ? '0 0 0 5px rgba(255,255,255,0.14), 0 0 18px rgba(255,255,255,0.25)' : '0 2px 6px rgba(0,0,0,0.6)' }} />
      <span aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: col }}><NodeGlyph kind={n.gate ? 'gate' : n.kind} size={Math.round(big * (n.kind === 'boss' ? 0.62 : 0.6))} /></span>
      <span style={{ position: 'absolute', ...(n.spur ? { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 5 } : { left: '50%', [below ? 'top' : 'bottom']: '100%', transform: 'translateX(-50%)', marginTop: below ? 3 : 0, marginBottom: below ? 0 : 3 }), fontSize: n.kind === 'boss' ? 12 : 10, fontWeight: 700, letterSpacing: '0.04em', color: col, textTransform: 'uppercase', whiteSpace: 'nowrap', textShadow: '0 1px 2px #000, 0 0 6px #000' }}>{n.word}</span>
      {n.leans.length ? <span style={{ position: 'absolute', top: -10, right: -14, display: 'flex', gap: 2 }}>{n.leans.map((l) => <span key={l.initials} style={{ display: 'grid', placeItems: 'center', width: 20, height: 20, borderRadius: '50%', fontSize: 9, fontWeight: 700, background: l.color, color: '#0A0D13' }}>{l.initials}</span>)}</span> : null}
    </button>
  );
}

/** The legend: each kind on this map with its marker and word, then what the trails and rings mean. */
function Legend({ v }: { v: RunViewV }) {
  const seen = new Map<string, string>();
  for (const n of v.nodes) { const k = n.gate ? 'gate' : n.kind; if (!seen.has(k)) seen.set(k, n.word); }
  const order = ['fight', 'elite', 'gate', 'shop', 'forge', 'training', 'shrine', 'rest', 'cache', 'event', 'vault_guard', 'vault', 'boss'];
  const kinds = order.filter((k) => seen.has(k));
  const item = (icon: string, word: string) => (
    <span key={word} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
      <span aria-hidden="true" style={{ display: 'inline-grid', placeItems: 'center', color: ink.text }}><NodeGlyph kind={icon} size={16} /></span>{word}
    </span>
  );
  return (
    <div data-phc-pathmap-legend="" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', alignItems: 'center', padding: '6px 10px', borderRadius: 8, background: '#10151F', border: '1px solid #232D3F', fontSize: 11, color: ink.text }}>
      {item('start', 'Camp')}
      {kinds.map((k) => item(k, seen.get(k)!))}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><svg width="26" height="8" aria-hidden="true"><line x1="1" y1="4" x2="25" y2="4" stroke={ink.text} strokeWidth="3" strokeLinecap="round" /></svg>walked</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><svg width="26" height="8" aria-hidden="true"><line x1="1" y1="4" x2="25" y2="4" stroke={ink.white} strokeWidth="3" strokeDasharray="6 5" strokeLinecap="round" /></svg>open now</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><svg width="14" height="14" aria-hidden="true"><rect x="3" y="3" width="8" height="8" transform="rotate(45 7 7)" fill="none" stroke={ink.text} strokeWidth="1.5" /></svg>junction: trails meet and part</span>
    </div>
  );
}

/** The path map (rules 1.48): the backdrop, the trails, the camp, the markers and the legend. */
export function PathMap({ v, onPick }: { v: RunViewV; onPick: (n: RunNodeV, el: HTMLElement) => void }) {
  const { pos, camp } = React.useMemo(() => layoutPathMap(v), [v.nodes, v.rows, v.lanes]);
  const art = A['survival-map-' + v.settingId + '-lg'] || A['survival-map-' + v.settingId];
  const byId: Record<string, RunNodeV> = {}; for (const n of v.nodes) byId[n.id] = n;
  const firsts = v.nodes.filter((n) => n.depth === 1 && !n.spur);
  const walkedFirst = firsts.find((n) => n.state === 'walked' || n.state === 'here');
  const trail = (key: string, a: { x: number; y: number }, b: { x: number; y: number }, kind: 'walked' | 'lit' | 'quiet' | 'spur') => (
    <path key={key} d={trailPath(a, b, key)} fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke"
      stroke={kind === 'walked' ? ink.text : kind === 'lit' ? ink.white : kind === 'spur' ? 'rgba(231,235,243,0.38)' : art ? ink.quietArt : ink.quiet}
      strokeWidth={kind === 'walked' ? 3.5 : kind === 'lit' ? 3 : 2} strokeDasharray={kind === 'walked' ? undefined : kind === 'lit' ? '7 6' : '2 8'}
      className={kind === 'lit' ? 'phc-pm-lit' : undefined} data-phc-trail={kind} />
  );
  return (
    <div style={{ flex: 1, minHeight: 380, display: 'flex', flexDirection: 'column', gap: 8 }}>
    <div data-phc-pathmap="" data-tip-avoid='[data-phc-state="reachable"], [data-phc-state="here"]' style={{ position: 'relative', flex: 1, minHeight: 0, display: 'grid', placeItems: 'center', borderRadius: 14, background: '#0B0A07', border: '1px solid #232D3F', overflow: 'hidden', containerType: 'size' }}>
      <style>{'@keyframes phc-pm-dash{to{stroke-dashoffset:-26}}.phc-pm-lit{animation:phc-pm-dash 1.2s linear infinite}@keyframes phc-pm-pulse{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.12);opacity:.25}}.phc-pm-here{animation:phc-pm-pulse 2s ease-in-out infinite}@media (prefers-reduced-motion: reduce){.phc-pm-lit,.phc-pm-here{animation:none}}'}</style>
      {/* the 16:9 map fits the frame both ways (the frame is a size container): as wide as the frame, or as wide as its
          height allows, whichever is smaller, so nothing on it is ever cut off at 1280 x 720 (survival suite) */}
      <div data-phc-pathmap-box="" style={{ position: 'relative', width: 'min(100cqw, calc(100cqh * 16 / 9))', aspectRatio: '16 / 9' }}>
        {art ? <img src={art} alt="" loading="lazy" decoding="async" data-phc-pathmap-art="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} /> : <FieldChart setting={v.settingId} />}
        {art && SCRIM[v.settingId] ? <div aria-hidden="true" data-phc-pathmap-scrim="" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 4%, rgba(8,7,5,' + SCRIM[v.settingId] + ') 22%, rgba(8,7,5,' + SCRIM[v.settingId] + ') 78%, transparent 96%)' }} /> : null}
        {/* on a painting the trails carry a dark edge (a drop shadow), so a dotted quiet trail still reads on lit ground */}
        <svg viewBox={'0 0 ' + W + ' ' + H} preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', filter: art ? 'drop-shadow(0 0 1.5px rgba(0,0,0,0.95)) drop-shadow(0 0 3px rgba(0,0,0,0.6))' : undefined }} aria-hidden="true">
          {firsts.map((n) => trail('camp>' + n.id, camp, pos[n.id], walkedFirst ? (walkedFirst.id === n.id ? 'walked' : 'quiet') : v.atStart && n.state === 'reachable' ? 'lit' : 'quiet'))}
          {v.links.filter((l) => !l.back && pos[l.from] && pos[l.to]).map((l) => trail(l.from + '>' + l.to, pos[l.from], pos[l.to], l.walked ? 'walked' : l.lit ? 'lit' : byId[l.to]?.spur ? 'spur' : 'quiet'))}
        </svg>
        <span data-phc-node-camp="" aria-label={v.atStart ? 'The camp, you are here' : 'The camp'} {...tipProps('The camp. The stage starts here: every trail can be taken from it.')}
          style={{ position: 'absolute', left: (camp.x / W) * 100 + '%', top: (camp.y / H) * 100 + '%', width: 44, height: 44, transform: 'translate(-50%, -50%)', display: 'grid', placeItems: 'center', borderRadius: '50%', border: v.atStart ? '3px solid #FFFFFF' : '2px solid ' + ink.text, background: ink.discWalked, color: ink.white, zIndex: 3 }}>
          <NodeGlyph kind="start" size={26} />
          <span style={{ position: 'absolute', top: '100%', marginTop: 3, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', textShadow: '0 1px 2px #000' }}>Camp</span>
        </span>
        {v.nodes.map((n) => { const sp = v.nodes.find((x) => x.spur === 'guard' && x.from === n.id);
          return pos[n.id] ? <Marker key={n.id} n={n} p={pos[n.id]} onPick={onPick} labelBelow={sp && pos[sp.id] ? pos[sp.id].y < pos[n.id].y : undefined} /> : null; })}
      </div>
    </div>
    <Legend v={v} />
    </div>
  );
}
