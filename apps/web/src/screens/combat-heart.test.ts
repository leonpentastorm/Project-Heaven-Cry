// @vitest-environment jsdom
// The combat Outbursts tab under rules 1.5 (Outburst 2.0): design cards with Begin and Snap, the HEART panel while
// holding (Pump, Release, Steady, Let go, Heart Overwatch), the grid preview of an area release, and the 1.2 Hold/Now
// toggle gone. Rendered for real once, to check the template binds.
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, active, magicOf, type GameState, type Sheet } from '@engine';

let G: GameState; const ME = 'host';
const listeners = new Set<() => void>();
let snap: any = null;
const view = () => ({ game: viewFor(G, ME), me: { id: ME, name: 'Leon' }, role: 'host', screen: 'combat', toast: null, savedAt: 0 });
const doAct = (a: any) => { G = apply(G, a, ME); snap = view(); listeners.forEach((f) => f()); };
vi.mock('../game/store', () => ({ getState: () => snap || (snap = view()), subscribe: (f: any) => { listeners.add(f); return () => listeners.delete(f); },
  act: (a: any) => { try { doAct(a); } catch (e: any) { if (e?.name !== 'RuleError' && e?.constructor?.name !== 'RuleError') throw e; } }, go: () => {}, toast: () => {}, polishText: async () => '', retryNarrator: () => {}, saveNow: () => {}, poke: () => {} }));
vi.mock('../game/report', () => ({ openReport: () => {}, PlaytestTools: () => null }));
const errors: string[] = [];
const origErr = console.error;
console.error = (...a: any[]) => { const t = a.map(String).join(' '); if (!/not wrapped in act|act\(\.\.\.\)/.test(t)) errors.push(t); };
const { CombatLogic } = await import('./combat.js');
const React = await import('react'); const { createRoot } = await import('react-dom/client');
const { makeScreen } = await import('../dc/runtime'); const { expand } = await import('./shared');
const { FxLayer } = await import('../game/fx/FxLayer'); const { TurnIntro } = await import('../game/turnIntro');
const tpl = (await import('../templates/combat.template.html?raw')).default;
const Screen = makeScreen(expand(tpl), CombatLogic as any);
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const sheetFrom = (archId: string, name: string): Sheet => { const a = ARCHETYPES.find((x) => x.id === archId)!;
  return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any; };
function fight(seed: string, weapon = 'drifter_revolver') {
  snap = null; G = newGame('ROOM', { id: 'host', name: 'Leon' }, seed);
  doAct({ type: 'char/add', sheet: sheetFrom(ARCHETYPES[0].id, 'MPAT') }); doAct({ type: 'session/start' }); doAct({ type: 'narrator/begin' });
  const c = Object.values(G.characters)[0]; (G.characters[c.id] as any).weapon = weapon;
  doAct({ type: 'narrator/turn', turn: { narration: 'Guns.', combat: { name: 'Pad', difficulty: 'easy', enemies: [{ name: 'Engineer', tier: 'minion', weapon: 'service_pistol' }, { name: 'Keel', tier: 'soldier', weapon: 'drifter_revolver' }] } } });
  return c;
}
function App() {
  const st = React.useSyncExternalStore((f) => { listeners.add(f); return () => { listeners.delete(f); }; }, () => snap);
  return React.createElement(React.Fragment, null, React.createElement(Screen as any, { tick: st }),
    React.createElement(FxLayer, { game: st.game, screen: 'combat' }), React.createElement(TurnIntro as any, { game: st.game, meId: ME, screen: 'combat' }));
}
const buttons = (el: HTMLElement, re: RegExp) => Array.from(el.querySelectorAll('button')).filter((b) => re.test(b.textContent || '') && !b.closest('[aria-hidden="true"]'));


function soulFight(seed: string) {
  const c = fight(seed, 'fists'); const ch: any = G.characters[c.id];
  ch.outbursts = [{ id: 'fb', name: 'Heartfire', school: 'damage', modules: ['burst'], tone: 'fire' }, { id: 'sb', name: 'Soul Bolt', school: 'damage', modules: [] }];
  ch.soulKnown = { schools: ['damage'], modules: ['burst'], tones: ['fire'] };
  // Rebuild the fight's unit magic from the character (the fight started before the designs were set).
  const u: any = G.combat!.units.find((x) => x.charId === c.id); u.mg = magicOf(ch); u.mg.mp = 400; u.mg.mpMax = 400;
  // Our turn, 6 AP, two foes side by side within reach.
  G.combat!.turn = G.combat!.order.indexOf(u.id); u.ap = 6; snap = view();
  const [x, y] = u.pos.split(',').map(Number), foes = G.combat!.units.filter((v) => v.side === 'foe');
  const free = (k: string) => !G.combat!.units.some((v) => v.pos === k && !v.dead) && !(G.combat!.map as any).solid.includes(k);
  const spots: string[] = []; for (const dx of [3, 2, -2, -3]) for (const dy of [0, 1, -1]) { const a = (x + dx) + ',' + (y + dy), b = (x + dx) + ',' + (y + dy + 1); if (spots.length < 2 && free(a) && free(b) && x + dx >= 0 && y + dy >= 0 && y + dy + 1 < G.combat!.map.h && x + dx < G.combat!.map.w) spots.push(a, b); }
  foes[0].pos = spots[0]; foes[1].pos = spots[1]; foes.forEach((f) => { f.hidden = false; (f as any).analyzedBy = 'x'; });
  snap = view();
  return { c, u };
}

describe('the Outbursts tab (rules 1.5)', () => {
  it('not holding: design cards with a shape icon and line, Begin acts, Snap aims with a preview', () => {
    const { u } = soulFight('heart-a');
    const L = new CombatLogic({}) as any;
    L.setState({ action: 'outburst', design: 'fb' });
    let r = L.renderVals();
    const pad = r.turnPanels[0].pad;
    expect(pad.designList.map((d: any) => d.key)).toEqual(['fb', 'sb']);
    expect(pad.designList[0].line).toMatch(/^BURST · radius 1 · reach \d+ · Fire · \d+ MP$/);
    expect(pad.designList[0].icon).toMatch(/^data:image\/svg\+xml/);
    expect(pad.beginLabel).toBe('Begin · 2 AP'); expect(pad.snapLabel).toBe('Snap · 3 AP ×0.6');
    expect(pad.nowStyle).toBeUndefined(); // the 1.2 Hold / Release-now toggle is gone
    // Snap: hover a foe, the area is hatched and both foes carry their expected numbers.
    const foe = G.combat!.units.find((v) => v.side === 'foe')!;
    L.setState({ obMode: 'snap', hover: foe.pos }); r = L.renderVals();
    const ft = r.tiles.find((t: any) => t.key === foe.pos);
    expect(ft.hasHz).toBe(true); expect(ft.hzText).toMatch(/^ENEMY −\d+$/);
    expect(r.tiles.filter((t: any) => t.hasMark && /repeating-linear-gradient/.test(t.markStyle)).length).toBeGreaterThan(3);
    expect(ft.cost).toBe('BURST R1 · 2 ENEMIES');
    // Begin: the design is held at stage 0.
    L.setState({ obMode: 'begin', hover: null }); r = L.renderVals();
    r.turnPanels[0].pad.begin();
    expect(G.combat!.units.find((v) => v.id === u.id)!.mg!.held).toMatchObject({ design: 'fb', stage: 0 });
  });

  it('holding: the HEART panel at the top of the tab; Pump from the panel; Release previews and fires', () => {
    const { u } = soulFight('heart-b');
    doAct({ type: 'combat/outburst', unitId: u.id, design: 'fb', hold: true });
    const L = new CombatLogic({}) as any;
    L.renderVals(); L.pickAction('pump');
    let r = L.renderVals();
    const tp = r.turnPanels[0].tabPanel[0];
    expect(tp.heart).toBe(true);
    expect(tp.hv.stageText).toBe('STAGE 0 / 4');
    expect(tp.hv.btns.map((b: any) => b.key)).toEqual(['pump', 'release', 'steady', 'letgo', 'heartwatch']);
    expect(tp.items.map((a: any) => a.key)).not.toContain('pump'); // the panel holds them
    for (let i = 0; i < 3; i++) { r = L.renderVals(); r.turnPanels[0].tabPanel[0].hv.btns[0].pick(); }
    expect(G.combat!.units.find((v) => v.id === u.id)!.mg!.held!.stage).toBe(3);
    r = L.renderVals(); expect(r.turnPanels[0].tabPanel[0].hv.multText).toMatch(/^×1.8/);
    // Release: aim at a foe, the preview shows them, Confirm fires it.
    const foe = G.combat!.units.find((v) => v.side === 'foe')!;
    L.pickAction('release'); L.setState({ aim: foe.pos }); r = L.renderVals();
    expect(r.turnPanels[0].cantConfirm).toBe(false);
    expect(r.turnPanels[0].sel.text).toMatch(/Raider|Keel|Engineer/);
    const hp0 = foe.hp; r.turnPanels[0].confirm();
    expect(G.combat!.units.find((v) => v.id === u.id)!.mg!.held).toBeNull();
    expect(G.combat!.units.find((v) => v.id === foe.id)!.hp).toBeLessThan(hp0);
  });

  it('renders: the panel and the design cards bind in the real template', async () => {
    const { u } = soulFight('heart-c');
    const el = document.createElement('div'); document.body.appendChild(el); const root = createRoot(el);
    await React.act(async () => { root.render(React.createElement(App)); });
    doAct({ type: 'combat/outburst', unitId: u.id, design: 'fb', hold: true });
    window.dispatchEvent(new CustomEvent('phc:combat-action', { detail: { action: 'pump' } }));
    await React.act(async () => { snap = view(); listeners.forEach((f) => f()); });
    const panel = el.querySelector('.phc-heart-panel');
    expect(panel).toBeTruthy();
    expect(panel!.textContent).toMatch(/HEART · BURST · FIRE/);
    expect(panel!.textContent).toMatch(/STRAIN \d+ \/ \d+/);
    await React.act(async () => { root.unmount(); });
    expect(errors.filter((e) => !/act\(/.test(e))).toEqual([]);
  });
});
