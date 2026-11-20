// @vitest-environment jsdom
// A Figment's face (rules 1.34, ART-REQUESTS C6): a form's `portrait` in data/figments.json is a catalog id; the engine
// puts it on the unit (owned.ts spawnOwned) and the web build ships it under the same id. Pictured through the reducer,
// the Figment's map token (and its card) and its group header on the FIGMENTS tab show that painting, chosen by the
// data field; a form with no portrait keeps its glyph.
import { describe, expect, it, vi } from 'vitest';
import { viewFor, FORM, type GameState } from '@engine';
import { figFight } from '../../../../packages/engine/test/helpers/figfight';
import ASSETS from '../game/assets.json';

let G: GameState; const ME = 'host';
const listeners = new Set<() => void>();
let snap: any = null;
const view = () => ({ game: viewFor(G, ME), me: { id: ME, name: 'Leon' }, role: 'host', screen: 'combat', toast: null, savedAt: 0 });
vi.mock('../game/store', () => ({ getState: () => snap || (snap = view()), subscribe: (f: any) => { listeners.add(f); return () => listeners.delete(f); },
  act: () => {}, go: () => {}, toast: () => {}, polishText: async () => '', retryNarrator: () => {}, saveNow: () => {}, poke: () => {} }));
vi.mock('../game/report', () => ({ openReport: () => {}, PlaytestTools: () => null }));
const { CombatLogic } = await import('./combat.js');
const React = await import('react'); const { createRoot } = await import('react-dom/client');
const { makeScreen } = await import('../dc/runtime'); const { expand, faceOf } = await import('./shared');
const tpl = (await import('../templates/combat.template.html?raw')).default;
const Screen = makeScreen(expand(tpl), CombatLogic as any);
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
function App() {
  const st = React.useSyncExternalStore((f) => { listeners.add(f); return () => { listeners.delete(f); }; }, () => snap);
  return React.createElement(Screen as any, { tick: st });
}

describe('a Figment\'s face', () => {
  it('every form that names a portrait resolves to a built web asset; the turret and the unbuilt forms do not ship one', () => {
    const named = Object.values(FORM as Record<string, any>).filter((f) => f.portrait);
    expect(named.length).toBeGreaterThan(0);
    for (const f of named) expect((ASSETS as any)[f.portrait], f.id).toMatch(/^\/assets\/figment-/);
    const built = Object.keys(ASSETS).filter((k) => /^figment-/.test(k) && !k.endsWith('-lg')).sort();
    expect(built).toEqual(named.map((f) => f.portrait).sort()); // only what data names ships
  });
  it('pictured through the reducer, its token on the map and its FIGMENTS group header show the form\'s painting', async () => {
    const f = figFight([{ skills: { visualization: 5 }, level: 5, weapon: 'service_pistol' }], [{ tier: 'soldier', at: '9,4', classic: true }]);
    const u = f.turn(f.pc); f.picture(u, 'beast', '3,4');
    const fig: any = f.figments(f.unit(u.id))[0]; expect(fig.img).toBe(FORM.beast.portrait);
    const url = (ASSETS as any)[FORM.beast.portrait];
    expect(faceOf(fig)).toBe(url);
    G = f.g; snap = view();
    const el = document.createElement('div'); document.body.appendChild(el); const root = createRoot(el);
    await React.act(async () => { root.render(React.createElement(App)); });
    const imgs = () => Array.from(el.querySelectorAll('img')).filter((i) => i.getAttribute('src') === url);
    expect(imgs().length).toBeGreaterThan(0); // the map token (and the HUD's rows)
    const tab = el.querySelector('[role="tab"][data-tab="figments"]') as HTMLElement | null;
    expect(tab).toBeTruthy(); await React.act(async () => { tab!.click(); });
    expect(el.querySelector('[role="tabpanel"] img[src="' + url + '"]')).toBeTruthy(); // the held Figment's group header
    await React.act(async () => { root.unmount(); }); el.remove();
  });
  // 0.33 (Leon on live 0.32.0: "Figment movement do not have the pathdrawing like normal movement"): a held Figment's Move
  // row, a tile hovered two steps from it, draws the route arrows a unit's own Move draws, from the Figment's tile
  it('a Figment\'s Move draws its path as a unit\'s Move does (the same arrows, from where the Figment stands)', () => {
    const f = figFight([{ skills: { visualization: 5 }, level: 5, weapon: 'service_pistol' }], [{ tier: 'soldier', at: '9,4', classic: true }]);
    const u = f.turn(f.pc); f.picture(u, 'beast', '3,4');
    const fig: any = f.figments(f.unit(u.id))[0];
    G = f.g; snap = view();
    const L = new CombatLogic({}) as any; L.setState({ action: 'ow:' + fig.id + ':move', hover: null }); L.renderVals();
    expect(L._flow?.d.id).toBe('ow:' + fig.id + ':move');
    // a tile the flow offers two steps from the Figment (the engine's choices)
    const cheb = (k: string) => Math.max(Math.abs(+k.split(',')[0] - 3), Math.abs(+k.split(',')[1] - 4));
    const two = [...L._flow.marks.choice].find((k: any) => cheb(k) === 2) as string; expect(two).toBeTruthy();
    L.setState({ hover: two });
    const r = L.renderVals();
    const arrows = r.tiles.filter((t: any) => t.hasArrow);
    expect(arrows.length).toBeGreaterThan(0);
    expect(arrows.some((t: any) => t.key === fig.pos)).toBe(false); // none on the Figment's own token
    expect(arrows.every((t: any) => cheb(t.key) <= 2)).toBe(true);
    L.setState({ action: 'ow:' + fig.id + ':move', hover: null });
    expect(L.renderVals().tiles.some((t: any) => t.hasArrow)).toBe(false);
  });
});
