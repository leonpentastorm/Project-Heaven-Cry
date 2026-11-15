// @vitest-environment jsdom
// Rules 1.55 items 45 and 51 (0.28.3): the field after a won Survival fight is the fight screen, because it is the
// fight itself, still running with no enemies left. Rendered with its template beside the effects layer, as the game
// does (combat-health-word.test.ts's setup): End turn is not offered, the words say why, the initiative strip has no
// NOW, the field's header holds Take all and the vote, and a field action's events (a heal) reach the effect player on
// the fight's own stream.
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, reachable, NO_TURNS, type GameState, type Sheet } from '@engine';

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
  expect((G as any).run.state).toBe('field'); expect(G.combat!.field).toBe(true); expect(G.phase).toBe('combat');
}
function App() {
  const st = React.useSyncExternalStore((f) => { listeners.add(f); return () => { listeners.delete(f); }; }, () => snap);
  return React.createElement(React.Fragment, null, React.createElement(Screen as any, { tick: st }), React.createElement(FxLayer, { game: st.game, screen: 'combat' }));
}
const shown = (b: Element) => !(b as HTMLElement).hidden && !b.closest('[aria-hidden="true"]') && !b.closest('[hidden]');

describe('the field is the fight screen (rules 1.55 items 45 and 51)', () => {
  it('no End turn, the words instead; no NOW on the strip; the header with the vote; a heal on the field plays on the fight\'s own stream', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div'); document.body.appendChild(el); const root = createRoot(el);
    field();
    await React.act(async () => { root.render(React.createElement(App)); });
    await React.act(async () => { vi.advanceTimersByTime(15000); });
    expect(Array.from(el.querySelectorAll('button')).filter((b) => /End turn/.test(b.textContent || '') && shown(b))).toEqual([]);
    expect(Array.from(el.querySelectorAll('[data-phc-no-turns]')).some((s) => s.textContent === NO_TURNS)).toBe(true);
    expect(Array.from(el.querySelectorAll('.phc-init')).some((s) => /\bNOW\b/.test(s.textContent || ''))).toBe(false);
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
