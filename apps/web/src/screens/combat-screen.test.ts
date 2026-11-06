// @vitest-environment jsdom
// The combat screen (combat feel v1): Fan the Hammer from pick to the end of its volley, rendered for real with the
// effects layer and the turn intro mounted; the your-turn panel and the waiting card; the attack's red reach and the
// odds chip; spent AP draining; the initiative strip turning over; the turn intro's command tiles selecting an action.
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, active, type GameState, type Sheet } from '@engine';

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

describe('combat screen', () => {
  it('Fan the Hammer: pick it, hover and click a hostile, confirm; the volley resolves and the screen keeps working', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div'); document.body.appendChild(el); const root = createRoot(el);
    let fans = 0;
    for (const seed of ['fan-a', 'fan-b', 'fan-c', 'fan-d']) {
      fight(seed);
      await React.act(async () => { root.render(React.createElement(App, { key: seed })); });
      await React.act(async () => { vi.advanceTimersByTime(4000); });
      for (let i = 0; i < 8 && G.combat && !G.combat.over; i++) {
        const u = active(G.combat)!; if (u.side !== 'pc') break;
        expect(el.textContent).toContain('YOUR TURN');
        const pick = buttons(el, /Fan the Hammer/)[0]; expect(pick).toBeTruthy();
        await React.act(async () => { pick.click(); });
        const foe = G.combat.units.find((t) => t.side === 'foe' && !t.dead)!;
        const tile = Array.from(el.querySelectorAll('button.phc-tok')).find((b) => (b.getAttribute('aria-label') || '').includes(foe.name)) as HTMLElement | undefined;
        if (tile) await React.act(async () => { tile.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); tile.click(); });
        const n0 = G.combat.log.length;
        const conf = buttons(el, /^Confirm$/)[0];
        await React.act(async () => { conf.click(); });
        if (G.combat.log.slice(n0).some((l) => /uses Fan the Hammer/.test(l))) fans++;
        expect(G.combat.log.some((l) => /NaN|undefined/.test(l))).toBe(false);
        await React.act(async () => { vi.advanceTimersByTime(5000); });
        expect(el.querySelector('pre')).toBeNull(); // the screen's error view never shows
        try { doAct({ type: 'combat/reload', unitId: u.id }); } catch { /* full or nothing to load */ }
        await React.act(async () => { vi.advanceTimersByTime(2500); });
        if (G.combat.over) break;
        try { doAct({ type: 'combat/end-turn', unitId: active(G.combat)!.id }); } catch { /* */ }
        await React.act(async () => { vi.advanceTimersByTime(8000); });
      }
    }
    await React.act(async () => { root.unmount(); });
    vi.useRealTimers();
    expect(fans).toBeGreaterThan(2);
    expect(errors).toEqual([]);
  }, 60000);

  it('your turn: the YOUR TURN panel, the red reach of a shot, the odds chip, AP draining; then the waiting card', () => {
    fight('panel', 'service_pistol');
    const L = new CombatLogic({}) as any;
    let r = L.renderVals();
    expect(r.turnPanels[0]).toMatchObject({ mine: true, waiting: false, cls: 'phc-a-right' });
    expect(r.turnPanels[0].ytSub).toMatch(/^ROUND \d+ · \d+ AP$/);
    expect(r.initiative[0]).toMatchObject({ tag: 'NOW', key: active(G.combat!)!.id });
    // Move: the reachable tiles as a white overlay; Shot: the weapon's reach in red.
    expect(r.tiles.filter((t: any) => t.hasPlan && /231, 235, 243/.test(t.planStyle)).length).toBeGreaterThan(0);
    L.setState({ action: 'shot' }); r = L.renderVals();
    const reach = r.tiles.filter((t: any) => t.hasPlan && /246, 81, 87/.test(t.planStyle));
    expect(reach.length).toBeGreaterThan(8);
    const foe = G.combat!.units.find((u) => u.side === 'foe' && !u.dead)!;
    L.setState({ hover: foe.pos }); r = L.renderVals();
    const chip = r.tiles.find((t: any) => t.key === foe.pos);
    if (chip.t) expect(chip.cost).toMatch(/^(HIT \d+% · \d+ AP|[A-Z’' ]+)$/);
    // Spending AP drains pips (keyed afresh so the animation plays once).
    const u = active(G.combat!)!;
    L.setState({ action: 'move', hover: null }); r = L.renderVals();
    const step = r.tiles.find((t: any) => t.isTile && t.hasPlan && /231, 235, 243/.test(t.planStyle));
    doAct({ type: 'combat/move', unitId: u.id, to: step.key, how: 'move' });
    r = L.renderVals();
    expect(active(G.combat!)!.ap).toBeLessThan(6);
    expect(r.turnPanels[0].apPips.some((p: any) => p.cls === 'phc-pip-drain' && /-\d+$/.test(p.key))).toBe(true);
    // End the turn: the YOUR TURN panel leaves (marked closing, hidden from assistive tech) while the next one arrives.
    doAct({ type: 'combat/end-turn', unitId: u.id });
    r = L.renderVals();
    if (!G.combat!.over && active(G.combat!)!.side === 'pc') expect(r.turnPanels[0].mine).toBe(true);
    else expect(r.turnPanels[0].waiting).toBe(true);
  });

  it('a command tile on the your-turn card selects that action here', () => {
    fight('cmd', 'service_pistol');
    const L = new CombatLogic({}) as any; L.renderVals();
    const u = active(G.combat!)!;
    L.pickAction('reload', u.id); expect(L.state.action).toBe('reload');
    L.pickAction('shot', 'someone-else'); expect(L.state.action).toBe('reload');
    L.pickAction('no-such-action', u.id); expect(L.state.action).toBe('reload');
    L.pickAction('shot', u.id); expect(L.state.action).toBe('shot');
  });
});
