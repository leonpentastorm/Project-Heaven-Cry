// The standing look of placed Sigil magic (rules 1.4): a STAY field's tiles live (lava cracks, ice sheen, acid bubbles,
// storm static, dust, a wind swirl) and a WATCH turret stands as a small glyph pillar with a turning eye, for as long as
// the engine keeps them. It is kept in step with the game state on every render, not with the event stream, so a
// field seen on joining, after a reload or a hidden tab looks the same as one watched being cast, and nothing outlives
// its zone. The fields' sound beds (fire crackle, static, wind, bubbling) follow the same state.
// The combat screen draws each placed tile's tint, edge and badge (game/sigilView.ts); this only animates on top.
import type { GameState } from '@engine';
import { type Sfx, setSfxLoops } from '../sfx';
import { centre, layerEl, put, tileEl } from './dom';
import { type ElementId, elementFx, elementId, fieldNode, turretNode } from './elements';

export interface AmbientItem { key: string; kind: 'field' | 'turret'; tile: string; element: ElementId; mine: boolean }
/** What stands on the map on screen: every field tile and turret the viewer may see (the view already drops secret
 *  ones; this drops them again, and an enemy's out of sight). Pure. */
export function ambientOf(g: GameState | null | undefined, screen: string, seen?: Set<string> | null, side: 'pc' | 'foe' = 'pc'): AmbientItem[] {
  if (!g) return [];
  let zones: any[] = [];
  if (screen === 'combat' && g.combat) zones = g.combat.zones || [];
  else if (screen === 'main' && !g.combat) zones = (g.story as any).zones || [];
  const out: AmbientItem[] = [];
  for (const z of zones) {
    if (!z || !Array.isArray(z.tiles)) continue;
    const mine = z.side === side, secret = z.kind === 'trap' || (z.kind === 'turret' && z.hidden);
    if (secret && !mine && !(z.spotted || []).includes(side)) continue;
    const el = elementId(z.element ?? (z.words || []).find((w: string) => elementId(w) !== 'raw'));
    // A 1.2 wall still standing in an old save is a field now (the engine converts it the same way).
    if (z.kind === 'field' || z.kind === 'wall') { for (const t of z.tiles) if (mine || !seen || seen.has(t)) out.push({ key: z.id + '|' + t, kind: 'field', tile: t, element: el, mine }); }
    else if (z.kind === 'turret') { const t = z.tiles[0]; if (t && (mine || !seen || seen.has(t))) out.push({ key: z.id + '|' + t, kind: 'turret', tile: t, element: el, mine }); }
  }
  return out;
}
/** The sound beds for what stands: one loop per element with a field, a little louder for more tiles (capped). Pure. */
export function loopsFor(items: AmbientItem[]): Partial<Record<Sfx, number>> {
  const n: Partial<Record<ElementId, number>> = {};
  for (const it of items) if (it.kind === 'field') n[it.element] = (n[it.element] || 0) + 1;
  const out: Partial<Record<Sfx, number>> = {};
  for (const [el, c] of Object.entries(n) as [ElementId, number][]) { const loop = elementFx(el).sound.loop; if (loop) out[loop] = Math.max(out[loop] || 0, Math.min(1, 0.45 + 0.12 * c)); }
  return out;
}

// ---------- the nodes ----------
interface Node { item: AmbientItem; box: HTMLElement; shown: boolean; checked: number }
const nodes = new Map<string, Node>();
let raf = 0;
/** Keep the standing looks in step with the items (add new ones, drop gone ones) and their sound beds. */
export function syncAmbient(items: AmbientItem[]) {
  const want = new Map(items.map((i) => [i.key + '|' + i.kind + '|' + i.element, i]));
  for (const [k, n] of [...nodes]) if (!want.has(k) || !n.box.isConnected) { n.box.remove(); nodes.delete(k); }
  if (layerEl()) for (const [k, it] of want) {
    if (nodes.has(k)) continue;
    const p = centre(it.tile), s = p?.s || 40;
    const el = it.kind === 'field' ? fieldNode(it.element, 'sigil') : turretNode(it.element, it.mine);
    const box = put(el, p || { x: -999, y: -999 }, it.kind === 'turret' ? s * 0.7 : s * 0.92, it.kind === 'turret' ? s * 0.9 : s * 0.92, 864e5);
    box.style.zIndex = '0'; box.style.opacity = '0';
    // A field brightens its tile (screen blend) rather than covering who stands on it.
    if (it.kind === 'field') box.style.mixBlendMode = 'screen';
    nodes.set(k, { item: it, box, shown: false, checked: 0 });
  }
  setSfxLoops(loopsFor(items));
  if (nodes.size && !raf) raf = requestAnimationFrame(track);
}
/** Drop every standing look and sound bed (leaving the room, a hidden tab). */
export function clearAmbient() { for (const n of nodes.values()) n.box.remove(); nodes.clear(); setSfxLoops({}); }
/** How many standing looks are up (tests). */
export const ambientCount = () => nodes.size;
/** Follow the map (scroll, zoom, re-layout), and hide a look whose tile is covered (a panel, a dialog) or off screen. */
function track() {
  raf = 0;
  const now = performance.now();
  for (const n of nodes.values()) {
    const p = centre(n.item.tile);
    if (!p) { n.box.style.opacity = '0'; continue; }
    const w = n.item.kind === 'turret' ? p.s * 0.7 : p.s * 0.92, h = n.item.kind === 'turret' ? p.s * 0.9 : p.s * 0.92;
    n.box.style.width = w + 'px'; n.box.style.height = h + 'px';
    n.box.style.left = p.x - w / 2 + 'px'; n.box.style.top = p.y - h / 2 - (n.item.kind === 'turret' ? p.s * 0.12 : 0) + 'px';
    if (now - n.checked > 200) { n.checked = now; n.shown = uncovered(n.item.tile, p); }
    n.box.style.opacity = n.shown ? '1' : '0';
  }
  if (nodes.size) raf = requestAnimationFrame(track);
}
/** Is the tile itself what's on screen at its centre? (The effects layer takes no pointer events, so it isn't hit.) */
function uncovered(k: string, p: { x: number; y: number }): boolean {
  if (p.x < 0 || p.y < 0 || p.x > innerWidth || p.y > innerHeight) return false;
  if (typeof document.elementFromPoint !== 'function') return true;
  const hit = document.elementFromPoint(p.x, p.y), t = tileEl(k);
  return !hit || !t || t === hit || t.contains(hit);
}
