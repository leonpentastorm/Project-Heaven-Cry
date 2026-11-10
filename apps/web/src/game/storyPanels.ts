// The story screen's right column as four movable modules (Leon, 10 Nov 2026: "make the 4 elements in the right panel
// modules like the stuff in the combat panel and moveable: mission board, player card, map and mana forecast"). Each has
// a grip: drag it up or down the column, or focus it and use the arrow keys; Home puts it first, End last. The order is
// a per-browser preference (localStorage), never game state, as the combat screen's layout is (combatLayout.ts).
// Pure functions first (tested in storyPanels.test.ts), then the pointer handling the screen (screens/main.js) calls.
export type StoryPanelId = 'mana' | 'map' | 'quests' | 'squad';
export const STORY_PANELS: StoryPanelId[] = ['mana', 'map', 'quests', 'squad'];
export const STORY_PANEL_NAME: Record<StoryPanelId, string> = { mana: 'Mana forecast', map: 'Map', quests: 'Quest board', squad: 'Player card' };
export const STORY_PANELS_KEY = 'phc.storyPanels';
/** The player card always has room for this many seats: four players and the Narrator. */
export const SQUAD_SEATS = 5;

/** Any stored value, made sound: every panel exactly once, unknown ids dropped, missing ones in their default place. */
export function normaliseOrder(x: any): StoryPanelId[] {
  const seen = new Set<StoryPanelId>();
  const out = (Array.isArray(x) ? x : []).filter((p: any): p is StoryPanelId => STORY_PANELS.includes(p) && !seen.has(p) && (seen.add(p), true));
  for (const p of STORY_PANELS) if (!seen.has(p)) out.splice(Math.min(STORY_PANELS.indexOf(p), out.length), 0, p);
  return out;
}
export const isDefaultOrder = (o: StoryPanelId[]) => normaliseOrder(o).join() === STORY_PANELS.join();
/** Move a panel to an index (counted among the panels before the move, as a drop gap is). */
export function moveStoryPanel(order: StoryPanelId[], panel: StoryPanelId, index: number): StoryPanelId[] {
  const o = normaliseOrder(order), from = o.indexOf(panel), rest = o.filter((p) => p !== panel);
  rest.splice(Math.max(0, Math.min(index - (from < index ? 1 : 0), rest.length)), 0, panel);
  return rest;
}
/** Keyboard on a grip: up and down move the panel one place; Home puts it first, End last. null: nothing to do. */
export function keyMoveStoryPanel(key: string, panel: StoryPanelId, order: StoryPanelId[]): StoryPanelId[] | null {
  const o = normaliseOrder(order), i = o.indexOf(panel);
  if (key === 'ArrowUp' && i > 0) return moveStoryPanel(o, panel, i - 1);
  if (key === 'ArrowDown' && i < o.length - 1) return moveStoryPanel(o, panel, i + 2);
  if (key === 'Home' && i > 0) return moveStoryPanel(o, panel, 0);
  if (key === 'End' && i < o.length - 1) return moveStoryPanel(o, panel, o.length);
  return null;
}
/** Rows the player card keeps for its seats at two a row (five seats: three rows), and the height that takes. */
export const squadRows = (seats = SQUAD_SEATS, perRow = 2) => Math.ceil(seats / perRow);
export const SQUAD_ROW_PX = 40, SQUAD_GAP_PX = 6;
export const squadMinHeight = (seats = SQUAD_SEATS) => squadRows(seats) * SQUAD_ROW_PX + (squadRows(seats) - 1) * SQUAD_GAP_PX;

// ---------- the stored preference ----------
export function readStoryPanels(): StoryPanelId[] { try { return normaliseOrder(JSON.parse(localStorage.getItem(STORY_PANELS_KEY) || 'null')); } catch { return normaliseOrder(null); } }
export function saveStoryPanels(o: StoryPanelId[]) { try { if (isDefaultOrder(o)) localStorage.removeItem(STORY_PANELS_KEY); else localStorage.setItem(STORY_PANELS_KEY, JSON.stringify(normaliseOrder(o))); } catch { /* private mode: kept for this visit */ } }

// ---------- dragging a panel by its grip ----------
/** Start dragging a panel (pointerdown on its grip). A ghost follows the pointer and a line shows the gap it would
 * drop into; letting go moves it, Escape cancels. onDrop gets the new order. Panels are the column's
 * [data-story-panel] elements; the column is [data-story-zone]. */
export function startStoryDrag(e: PointerEvent, panel: StoryPanelId, order: StoryPanelId[], onDrop: (o: StoryPanelId[]) => void) {
  if (e.button !== 0) return;
  e.preventDefault();
  const zone = document.querySelector('[data-story-zone]') as HTMLElement | null; if (!zone) return;
  const ghost = document.createElement('div');
  ghost.textContent = '⠿ ' + STORY_PANEL_NAME[panel];
  ghost.setAttribute('aria-hidden', 'true');
  Object.assign(ghost.style, { position: 'fixed', zIndex: '90', pointerEvents: 'none', padding: '6px 12px', borderRadius: '8px', background: '#1C2536', border: '1px solid #FFFFFF', color: '#FFFFFF', font: "700 12px 'Chakra Petch', sans-serif", letterSpacing: '0.12em', boxShadow: '0 8px 24px rgba(0,0,0,.5)' });
  const line = document.createElement('div');
  line.setAttribute('aria-hidden', 'true');
  Object.assign(line.style, { position: 'fixed', zIndex: '89', pointerEvents: 'none', height: '3px', borderRadius: '2px', background: '#FFFFFF', display: 'none', boxShadow: '0 0 12px rgba(255,255,255,.6)' });
  document.body.append(ghost, line);
  document.documentElement.classList.add('phc-rp-dragging');
  const src = zone.querySelector('[data-story-panel="' + panel + '"]') as HTMLElement | null;
  src?.classList.add('phc-rp-src');
  let target: number | null = null, px = e.clientX, py = e.clientY, raf = 0;
  /** The panels on screen, top to bottom, each with its place in the order. */
  const shown = () => ([...zone.querySelectorAll('[data-story-panel]')] as HTMLElement[]).filter((p) => p.offsetParent !== null)
    .map((p) => ({ id: p.dataset.storyPanel as StoryPanelId, r: p.getBoundingClientRect() })).sort((a, b) => a.r.top - b.r.top);
  const move = (x: number, y: number) => {
    ghost.style.left = x + 14 + 'px'; ghost.style.top = y + 10 + 'px';
    const zr = zone.getBoundingClientRect(), o = normaliseOrder(order), ps = shown();
    if (x < zr.left - 40 || x > zr.right + 40 || !ps.length) { target = null; line.style.display = 'none'; return; }
    // the gap nearest the pointer: before the first panel whose middle is under it, else after the last
    let at = o.length, y0 = ps[ps.length - 1].r.bottom + 5;
    for (const p of ps) if (y < p.r.top + p.r.height / 2) { at = o.indexOf(p.id); y0 = p.r.top - 7; break; }
    target = at;
    Object.assign(line.style, { display: 'block', left: zr.left + 8 + 'px', width: Math.max(40, zr.width - 16) + 'px', top: Math.max(zr.top + 2, Math.min(zr.bottom - 4, y0)) + 'px' });
  };
  // held near the top or bottom of the column, the column scrolls, and the drop gap follows
  const edge = () => {
    if (zone.scrollHeight > zone.clientHeight) {
      const r = zone.getBoundingClientRect(), band = 48;
      const dy = py < r.top + band ? -Math.ceil((r.top + band - py) / 4) : py > r.bottom - band ? Math.ceil((py - (r.bottom - band)) / 4) : 0;
      if (dy) { const before = zone.scrollTop; zone.scrollTop += dy; if (zone.scrollTop !== before) move(px, py); }
    }
    raf = requestAnimationFrame(edge);
  };
  const end = (drop: boolean) => {
    if (raf) cancelAnimationFrame(raf);
    removeEventListener('pointermove', onMove); removeEventListener('pointerup', onUp); removeEventListener('pointercancel', onCancel); removeEventListener('keydown', onKey, true);
    ghost.remove(); line.remove(); src?.classList.remove('phc-rp-src');
    document.documentElement.classList.remove('phc-rp-dragging');
    if (drop && target != null) onDrop(moveStoryPanel(order, panel, target));
  };
  const onMove = (ev: PointerEvent) => { px = ev.clientX; py = ev.clientY; move(px, py); };
  const onUp = () => end(true), onCancel = () => end(false);
  const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); end(false); } };
  addEventListener('pointermove', onMove); addEventListener('pointerup', onUp); addEventListener('pointercancel', onCancel); addEventListener('keydown', onKey, true);
  move(e.clientX, e.clientY);
  raf = requestAnimationFrame(edge);
}

/** The modules' own CSS: the grip (the combat panels' look, in the header's flow so it never covers a button), the
 * dragged panel, the reset link. */
export const STORY_PANELS_CSS = [
  '.phc-rp-grip{flex:none;width:26px;height:22px;display:grid;place-items:center;padding:0;border-radius:6px;border:1px solid #2E3A50;background:#10151F;color:#A3AEC2;font:700 13px/1 \'Chakra Petch\',sans-serif;cursor:grab;touch-action:none;opacity:.55;transition:opacity .15s}',
  '.phc-rp-grip:hover,.phc-rp-grip:focus-visible,[data-story-panel]:hover .phc-rp-grip{opacity:1;color:#FFFFFF;border-color:#A3AEC2}.phc-rp-grip:focus-visible{outline:2px solid #FFFFFF;outline-offset:2px}',
  '.phc-rp-dragging,.phc-rp-dragging *{cursor:grabbing!important;user-select:none!important}',
  '.phc-rp-src{opacity:.4;outline:2px dashed #A3AEC2;outline-offset:2px;border-radius:12px}',
  '.phc-rp-reset{flex:none;align-self:flex-end;min-height:24px;padding:0 8px;border-radius:6px;border:1px solid #2E3A50;background:transparent;color:#A3AEC2;font:600 11px \'Chakra Petch\',sans-serif;cursor:pointer}.phc-rp-reset:hover,.phc-rp-reset:focus-visible{color:#FFFFFF;border-color:#A3AEC2}',
  '.phc-reduce .phc-rp-grip{transition:none}',
].join('');
