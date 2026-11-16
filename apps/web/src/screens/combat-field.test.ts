// @vitest-environment jsdom
// Rules 1.55 item 61 (0.28.3): the field after a won Survival fight is the fight screen, because it is the fight
// itself, still running with no enemies left; rules 1.62 items 4741 and 4746 (0.31): it is turns. Rendered with its
// template beside the effects layer, as the game does (combat-health-word.test.ts's setup): End turn is offered, the
// initiative strip has its NOW, the AP pips are the fight's, a hovered tile two steps away draws the path arrow and the
// "−N AP · N tiles" chip (Leon on live 0.29.0: "Moving in timeout draw no arrow and highlight no square"), the field's
// header says FREE ROAM and its round, and a field action's events (a heal) reach the effect player on the fight's
// own stream.
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, reachable, paths, type GameState, type Sheet } from '@engine';

let G: GameState; const ME = 'host';
const listeners = new Set<() => void>();
let snap: any = null;
const view = () => ({ game: viewFor(G, ME), me: { id: ME, name: 'Leon' }, role: 'host', screen: 'combat', toast: null, savedAt: 0 });
const doAct = (a: any) => { G = apply(G, a, ME); snap = view(); listeners.forEach((f) => f()); };
vi.mock('../game/store', () => ({ getState: () => snap || (snap = view()), subscribe: (f: any) => { listeners.add(f); return () => listeners.delete(f); },
  act: (a: any) => { try { doAct(a); } catch (e: any) { if (e?.name !== 'RuleError' && e?.constructor?.name !== 'RuleError') throw e; } }, go: () => {}, toast: () => {}, polishText: async () => '', retryNarrator: () => {}, saveNow: () => {}, poke: () => {}, homeScreen: () => 'main' }));
vi.mock('../game/report', () => ({ openReport: () => {}, PlaytestTools: () => null }));
const origErr = console.error;
console.error = (...a: any[]) => { const t = a.map(String).join(' '); if (!/not wrapped in act|act\(\.\.\.\)/.test(t)) origErr(...a); };
const { CombatLogic } = await import('./combat.js');
const React = await import('react'); const { createRoot } = await import('react-dom/client');
const { makeScreen } = await import('../dc/runtime'); const { expand } = await import('./shared');
const { FxLayer, combatStreamKey } = await import('../game/fx/FxLayer'); const { fxDebug } = await import('../game/fx/play');
const tpl = (await import('../templates/combat.template.html?raw')).default;
const Screen = makeScreen(expand(tpl), CombatLogic as any);
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const sheetFrom = (archId: string, name: string): Sheet => { const a = ARCHETYPES.find((x) => x.id === archId)!;
  return { name, portrait: '', origin: 'Thousand-Planet frontier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any; };
/** A Survival test room, solo: the Empath through the camp into the first fight, won at once (run/skip): the field. */
function field() {
  snap = null; G = newGame('FIELD', { id: ME, name: 'Leon' }, 'field-web'); (G as any).settings.play = 'survival'; (G as any).settings.test = true;
  doAct({ type: 'char/add', sheet: sheetFrom('mender', 'Medic') });
  doAct({ type: 'run/start', seed: 'PHC-0003' }); doAct({ type: 'run/ready', close: true });
  doAct({ type: 'run/move', node: reachable((G as any).run).find((n: any) => n.kind === 'fight')!.id });
  doAct({ type: 'run/skip' });
  expect((G as any).run.state).toBe('field'); expect(G.combat!.field).toMatchObject({ round: 1, of: 3 }); expect(G.phase).toBe('combat');
}
function App() {
  const st = React.useSyncExternalStore((f) => { listeners.add(f); return () => { listeners.delete(f); }; }, () => snap);
  return React.createElement(React.Fragment, null, React.createElement(Screen as any, { tick: st }), React.createElement(FxLayer, { game: st.game, screen: 'combat' }));
}
const shown = (b: Element) => !(b as HTMLElement).hidden && !b.closest('[aria-hidden="true"]') && !b.closest('[hidden]');

describe('the field is the fight screen, with turns (rules 1.55 item 61; rules 1.62 items 4741 and 4746)', () => {
  it('the path arrow, the cost chip and the AP pips as in a fight; a move drains the pips', () => {
    field();
    const u = G.combat!.units.find((x) => x.side === 'pc' && !x.companion)!, cb = G.combat!, P = paths(cb, u.pos, u.id);
    const taken = new Set(cb.units.filter((x) => !x.dead).map((x) => x.pos)), two = Object.keys(P.dist).find((k) => P.dist[k] === 2 && !taken.has(k))!;
    expect(two).toBeTruthy();
    const L = new CombatLogic({}) as any; L.setState({ action: 'move', hover: two });
    const r = L.renderVals(), T = r.turnPanels[0];
    expect(T.apPips.length).toBeGreaterThanOrEqual(6); // the pips, not the word "free"
    expect(r.tiles.find((t: any) => t.key === two).hasCost).toBe(true);
    expect(r.tiles.find((t: any) => t.key === two).cost).toMatch(/^−\d+(\.\d+)? AP · 2 tiles$/);
    expect(r.tiles.some((t: any) => t.hasArrow)).toBe(true);
    const ap0 = G.combat!.units.find((x) => x.id === u.id)!.ap;
    doAct({ type: 'combat/move', unitId: u.id, to: two });
    expect(G.combat!.units.find((x) => x.id === u.id)!.ap).toBeLessThan(ap0);
  });
  it('End turn offered; NOW on the strip; the header FREE ROAM with its round and the vote; a heal on the field plays on the fight\'s own stream', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div'); document.body.appendChild(el); const root = createRoot(el);
    field();
    await React.act(async () => { root.render(React.createElement(App)); });
    await React.act(async () => { vi.advanceTimersByTime(15000); });
    expect(Array.from(el.querySelectorAll('button')).filter((b) => /End turn/.test(b.textContent || '') && shown(b)).length).toBeGreaterThan(0);
    expect(el.querySelector('[data-phc-no-turns]')).toBeNull(); expect(el.querySelector('[data-phc-ap-free]')).toBeNull();
    expect(el.querySelector('[data-phc-field-head]')?.textContent).toBe('FREE ROAM · ROUND 1 OF 3');
    expect(el.querySelector('[data-phc-field-leave]')).toBeTruthy();
    expect(el.querySelector('[role="dialog"][aria-label="The fight is over"]')).toBeNull();
    // a heal on the field: the fight's own action, its effect queued on the fight's stream (the same stream as the fight)
    const key = combatStreamKey(G)!, u = G.combat!.units.find((x) => x.side === 'pc' && !x.companion)!;
    u.hp = 30; snap = view(); await React.act(async () => { listeners.forEach((f) => f()); });
    const before = (G.combat!.fxSeq || 0);
    await React.act(async () => { doAct({ type: 'combat/perk', unitId: u.id, id: 'verb:tend.mend_self' }); });
    const heal = (G.combat!.fx || []).find((e: any) => e.n > before && e.k === 'heal');
    expect(heal, 'the engine emitted the heal').toBeTruthy();
    expect(combatStreamKey(G)).toBe(key);
    await React.act(async () => { vi.advanceTimersByTime(20000); });
    expect(fxDebug().queuedTo[key]).toBeGreaterThanOrEqual(heal!.n);
    await React.act(async () => { root.unmount(); }); el.remove(); vi.useRealTimers();
  }, 60_000); // a whole screen rendered: slow on a busy machine
});
