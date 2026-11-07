// The combat screen's adjustable layout: two zones split by a draggable bar, and four panels you drag by their grip.
//   - The map zone holds the map; the action zone holds the action menu (the turn column). Each can also hold the
//     legend and the combat log, in any order. Dragging the map or the action menu into the other zone swaps the zones.
//   - The splitter between the zones sets the map zone's width (drag, arrow keys; double-click or Home resets it).
// The layout is a per-browser preference (localStorage), never game state. Pure functions first (tested in
// combatLayout.test.ts), then the pointer handling the screen (screens/combat.js) calls.
export type PanelId = 'map' | 'legend' | 'log' | 'actions';
export type ZoneId = 'mapZone' | 'sideZone';
export interface CombatLayout {
  /** The map zone's width in px (null: the screen's own fit). */
  width: number | null;
  /** The action zone sits on the left (the map zone on the right). */
  swap: boolean;
  /** Panels in the map zone, top to bottom: always the map, plus any of legend and log. */
  mapZone: PanelId[];
  /** Panels in the action zone, top to bottom: always the action menu, plus any of legend and log. */
  sideZone: PanelId[];
}
export const DEFAULT_LAYOUT: CombatLayout = { width: null, swap: false, mapZone: ['map', 'legend', 'log'], sideZone: ['actions'] };
export const LAYOUT_KEY = 'phc.combatLayout';
/** The narrowest either zone may get (px): the map zone, and the action zone (screens/combat.js ASIDE_MIN is 410). */
export const MAP_MIN = 320, SIDE_MIN = 360, SPLIT_W = 12, KEY_STEP = 24;

/** Any stored value, made sound: every panel exactly once, the map in the map zone, the action menu in the other. */
export function normalise(x: any): CombatLayout {
  const ok = (l: any): PanelId[] => (Array.isArray(l) ? l.filter((p: any) => p === 'legend' || p === 'log') : []);
  const seen = new Set<PanelId>();
  const take = (list: PanelId[]) => list.filter((p) => !seen.has(p) && (seen.add(p), true));
  const m = take(ok(x?.mapZone)), s = take(ok(x?.sideZone));
  for (const p of ['legend', 'log'] as PanelId[]) if (!seen.has(p)) m.push(p);
  const mapAt = Array.isArray(x?.mapZone) ? Math.max(0, x.mapZone.indexOf('map')) : 0;
  // The action menu always heads its zone (its Say row and turn card stay on top); extras sit under it.
  m.splice(Math.min(mapAt, m.length), 0, 'map'); s.unshift('actions');
  const w = Number(x?.width);
  return { width: Number.isFinite(w) && w > 0 ? Math.round(w) : null, swap: !!x?.swap, mapZone: m, sideZone: s };
}
export const isDefault = (l: CombatLayout) => JSON.stringify(normalise(l)) === JSON.stringify(DEFAULT_LAYOUT);

/** Drop a panel into a zone at an index (among that zone's panels, before the drop). The map or the action menu
 * dropped into the other zone swaps the zones (the action zone moves to the other side); the rest just moves. */
export function movePanel(l0: CombatLayout, panel: PanelId, zone: ZoneId, index: number): CombatLayout {
  const l = normalise(l0);
  const home: ZoneId = panel === 'map' ? 'mapZone' : panel === 'actions' ? 'sideZone' : l.mapZone.includes(panel) ? 'mapZone' : 'sideZone';
  if ((panel === 'map' || panel === 'actions') && zone !== home) return { ...l, swap: !l.swap };
  const from = l[home].filter((p) => p !== panel), to = home === zone ? from : l[zone].slice();
  const at = Math.max(0, Math.min(index - (home === zone && l[home].indexOf(panel) < index ? 1 : 0), to.length));
  to.splice(at, 0, panel);
  return normalise({ ...l, [home]: home === zone ? to : from, [zone]: to });
}
/** The map zone's width, kept inside the row so both zones keep their minimum. */
export function clampWidth(w: number, rowW: number): number {
  return Math.round(Math.max(MAP_MIN, Math.min(w, rowW - SIDE_MIN - SPLIT_W)));
}
/** Where each panel renders now: with the action menu hidden (key H), everything sits in the map zone. */
export function placement(l0: CombatLayout, sideHidden: boolean) {
  const l = normalise(l0);
  const map = sideHidden ? [...l.mapZone, ...l.sideZone.filter((p) => p !== 'actions')] : l.mapZone;
  const side = sideHidden ? [] : l.sideZone;
  const order = (list: PanelId[], p: PanelId) => list.indexOf(p);
  return {
    swap: l.swap && !sideHidden,
    /** CSS order of each panel inside its zone (the zones are flex columns). */
    order: { map: order(map, 'map'), legend: Math.max(order(map, 'legend'), order(side, 'legend')), log: Math.max(order(map, 'log'), order(side, 'log')) },
    legendIn: (map.includes('legend') ? 'mapZone' : 'sideZone') as ZoneId,
    logIn: (map.includes('log') ? 'mapZone' : 'sideZone') as ZoneId,
    width: l.width,
  };
}

// ---------- the stored preference ----------
export function readLayout(): CombatLayout { try { return normalise(JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null')); } catch { return normalise(null); } }
export function saveLayout(l: CombatLayout) { try { if (isDefault(l)) localStorage.removeItem(LAYOUT_KEY); else localStorage.setItem(LAYOUT_KEY, JSON.stringify(normalise(l))); } catch { /* private mode: kept for this visit */ } }

// ---------- dragging a panel by its grip ----------
const PANEL_NAME: Record<PanelId, string> = { map: 'Map', legend: 'Legend', log: 'Combat log', actions: 'Action menu' };
/** Start dragging a panel (pointerdown on its grip). A ghost follows the pointer; the zone and the gap it would drop
 * into light up; letting go moves it, Escape cancels. onDrop gets the new layout. */
export function startPanelDrag(e: PointerEvent, panel: PanelId, layout: CombatLayout, onDrop: (l: CombatLayout) => void) {
  if (e.button !== 0) return;
  e.preventDefault();
  const ghost = document.createElement('div');
  ghost.textContent = '⠿ ' + PANEL_NAME[panel];
  ghost.setAttribute('aria-hidden', 'true');
  Object.assign(ghost.style, { position: 'fixed', zIndex: '90', pointerEvents: 'none', padding: '6px 12px', borderRadius: '8px', background: '#1C2536', border: '1px solid #FFFFFF', color: '#FFFFFF', font: "700 12px 'Chakra Petch', sans-serif", letterSpacing: '0.12em', boxShadow: '0 8px 24px rgba(0,0,0,.5)' });
  const line = document.createElement('div');
  line.setAttribute('aria-hidden', 'true');
  Object.assign(line.style, { position: 'fixed', zIndex: '89', pointerEvents: 'none', height: '3px', borderRadius: '2px', background: '#FFFFFF', display: 'none', boxShadow: '0 0 12px rgba(255,255,255,.6)' });
  document.body.append(ghost, line);
  document.documentElement.classList.add('phc-dragging');
  const src = document.querySelector('[data-phc-panel="' + panel + '"]') as HTMLElement | null;
  src?.classList.add('phc-drag-src');
  let target: { zone: ZoneId; index: number } | null = null;
  const zones = () => [...document.querySelectorAll('[data-phc-zone]')] as HTMLElement[];
  const move = (x: number, y: number) => {
    ghost.style.left = x + 14 + 'px'; ghost.style.top = y + 10 + 'px';
    zones().forEach((z) => z.classList.remove('phc-drop-on'));
    const z = zones().find((el) => { const r = el.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; });
    if (!z) { target = null; line.style.display = 'none'; return; }
    const zone = z.dataset.phcZone as ZoneId, zr = z.getBoundingClientRect();
    z.classList.add('phc-drop-on');
    // The gap nearest the pointer, among the zone's panels in their visual order.
    // (In the action zone the action menu is the zone itself and always first: the gaps are among the extras under it.)
    const panels = ([...z.querySelectorAll('[data-phc-panel]')] as HTMLElement[]).filter((p) => p !== z && p.closest('[data-phc-zone]') === z && p.offsetParent !== null)
      .map((p) => ({ p, r: p.getBoundingClientRect() })).sort((a, b) => a.r.top - b.r.top);
    let index = panels.length, y0 = panels.length ? panels[panels.length - 1].r.bottom + 4 : z.getBoundingClientRect().top + 8;
    for (let i = 0; i < panels.length; i++) if (y < panels[i].r.top + panels[i].r.height / 2) { index = i; y0 = panels[i].r.top - 5; break; }
    const swapsSides = (panel === 'map' && zone === 'sideZone') || (panel === 'actions' && zone === 'mapZone');
    if (zone === 'sideZone') { index += 1; if (!panels.length) y0 = zr.bottom - 10; }
    target = { zone, index };
    if (swapsSides) { line.style.display = 'none'; ghost.textContent = '⇄ Swap sides'; }
    else { ghost.textContent = '⠿ ' + PANEL_NAME[panel]; Object.assign(line.style, { display: 'block', left: zr.left + 8 + 'px', width: Math.max(40, zr.width - 16) + 'px', top: y0 + 'px' }); }
  };
  const end = (drop: boolean) => {
    removeEventListener('pointermove', onMove); removeEventListener('pointerup', onUp); removeEventListener('pointercancel', onCancel); removeEventListener('keydown', onKey, true);
    ghost.remove(); line.remove(); src?.classList.remove('phc-drag-src');
    document.documentElement.classList.remove('phc-dragging'); zones().forEach((z) => z.classList.remove('phc-drop-on'));
    if (drop && target) onDrop(movePanel(layout, panel, target.zone, target.index));
  };
  const onMove = (ev: PointerEvent) => move(ev.clientX, ev.clientY);
  const onUp = () => end(true), onCancel = () => end(false);
  const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); end(false); } };
  addEventListener('pointermove', onMove); addEventListener('pointerup', onUp); addEventListener('pointercancel', onCancel); addEventListener('keydown', onKey, true);
  move(e.clientX, e.clientY);
}
/** Keyboard on a grip: arrow up and down move the panel within its zone; left and right move it to the zone on that
 * side (the map and the action menu swap the sides). */
export function keyMovePanel(e: KeyboardEvent, panel: PanelId, layout: CombatLayout): CombatLayout | null {
  const l = normalise(layout), zone: ZoneId = l.mapZone.includes(panel) ? 'mapZone' : 'sideZone', i = l[zone].indexOf(panel);
  if (e.key === 'ArrowUp' && i > 0) return movePanel(l, panel, zone, i - 1);
  if (e.key === 'ArrowDown' && i < l[zone].length - 1) return movePanel(l, panel, zone, i + 2);
  const leftZone: ZoneId = l.swap ? 'sideZone' : 'mapZone', rightZone: ZoneId = l.swap ? 'mapZone' : 'sideZone';
  if (e.key === 'ArrowLeft' && zone !== leftZone) return movePanel(l, panel, leftZone, l[leftZone].length);
  if (e.key === 'ArrowRight' && zone !== rightZone) return movePanel(l, panel, rightZone, l[rightZone].length);
  return null;
}

// ---------- the splitter ----------
/** Drag the bar between the zones: live width while dragging (onLive), the final one on release (onDone). */
export function startSplit(e: PointerEvent, bar: HTMLElement, row: HTMLElement, swap: boolean, onLive: (w: number) => void, onDone: (w: number) => void) {
  if (e.button !== 0) return;
  e.preventDefault();
  const box = () => { const r = row.getBoundingClientRect(), cs = getComputedStyle(row); return { left: r.left + (parseFloat(cs.paddingLeft) || 0), right: r.right - (parseFloat(cs.paddingRight) || 0) }; };
  let w = 0, raf = 0;
  const at = (x: number) => { const b = box(); return clampWidth(swap ? b.right - x - SPLIT_W / 2 : x - b.left - SPLIT_W / 2, b.right - b.left); };
  document.documentElement.classList.add('phc-splitting'); bar.classList.add('phc-split-on');
  const onMove = (ev: PointerEvent) => { w = at(ev.clientX); if (!raf) raf = requestAnimationFrame(() => { raf = 0; onLive(w); }); };
  const end = () => { removeEventListener('pointermove', onMove); removeEventListener('pointerup', end); removeEventListener('pointercancel', end);
    document.documentElement.classList.remove('phc-splitting'); bar.classList.remove('phc-split-on'); if (raf) cancelAnimationFrame(raf); if (w) onDone(w); };
  addEventListener('pointermove', onMove); addEventListener('pointerup', end); addEventListener('pointercancel', end);
}
/** Arrow keys on the focused splitter move it by KEY_STEP px (towards the map zone shrinks it); Home resets. */
export function splitKey(e: KeyboardEvent, current: number, rowW: number, swap: boolean): number | null | 'reset' {
  if (e.key === 'Home') return 'reset';
  const dir = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0; if (!dir) return null;
  return clampWidth(current + (swap ? -dir : dir) * KEY_STEP * (e.shiftKey ? 4 : 1), rowW);
}

/** The layout's own CSS: grips, drop highlights, the splitter. Narrow windows (the stacked layout) hide the controls. */
export const LAYOUT_CSS = [
  '.phc-grip{position:absolute;top:6px;right:6px;z-index:6;width:26px;height:22px;display:grid;place-items:center;padding:0;border-radius:6px;border:1px solid #2E3A50;background:#10151F;color:#A3AEC2;font:700 13px/1 \'Chakra Petch\',sans-serif;cursor:grab;touch-action:none;opacity:.55;transition:opacity .15s}',
  '.phc-grip:hover,.phc-grip:focus-visible,[data-phc-panel]:hover>.phc-grip{opacity:1;color:#FFFFFF;border-color:#A3AEC2}.phc-grip:focus-visible{outline:2px solid #FFFFFF;outline-offset:2px}',
  '.phc-dragging,.phc-dragging *{cursor:grabbing!important;user-select:none!important}.phc-splitting,.phc-splitting *{cursor:col-resize!important;user-select:none!important}',
  '.phc-drag-src{opacity:.4;outline:2px dashed #A3AEC2;outline-offset:2px;border-radius:12px}',
  '[data-phc-zone].phc-drop-on{outline:2px dashed rgba(255,255,255,.55);outline-offset:-2px;border-radius:12px}',
  '.phc-cb-split{flex:none;width:12px;margin:0 2px;align-self:stretch;display:flex;justify-content:center;cursor:col-resize;touch-action:none;border-radius:6px;outline:none}',
  '.phc-cb-split>span{width:3px;height:100%;border-radius:2px;background:#232D3F;transition:background .15s,width .15s}',
  '.phc-cb-split:hover>span,.phc-cb-split:focus-visible>span,.phc-cb-split.phc-split-on>span{width:4px;background:#6FEA77}',
  '.phc-cb-split:focus-visible{box-shadow:0 0 0 2px #FFFFFF}',
  '@media (max-width:999px){.phc-cb-split,.phc-grip,.phc-cb-layout-reset{display:none!important}.phc-cb-row{flex-direction:row!important}}',
  '.phc-reduce .phc-grip,.phc-reduce .phc-cb-split>span{transition:none}',
].join('');

/** The template keeps one copy of the legend and the log (marked PANEL); the action zone's slots get the same markup,
 * so a panel renders in whichever zone it is in (only one of the two sc-if blocks is ever on). */
export function expandLayout(tpl: string): string {
  let t = tpl;
  for (const id of ['legend', 'log']) {
    const m = t.match(new RegExp('<!--PANEL:' + id + '-->([\\s\\S]*?)<!--/PANEL:' + id + '-->'));
    if (m) t = t.replace('<!--SLOT:' + id + '-->', () => m[1]);
  }
  return t.replace(/<!--\/?(PANEL|SLOT):\w+-->/g, '');
}
