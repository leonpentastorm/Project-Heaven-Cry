// @vitest-environment jsdom
// The health word on the fight screen (rules 1.55 item 27): a token draws the engine's healthView, nothing of its own.
// (The setup is combat-screen.test.ts's: a real room, a real fight, the screen rendered with its template.)
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, healthView, type GameState, type Sheet } from '@engine';

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

describe("an un-Analyzed foe shows the engine's word, not a bar (rules 1.55 item 27)", () => {
  it('a Soldier of 140 HP at 97, 54 and 11 HP: its token reads HURT, BADLY HURT, NEAR DEATH with no bar; Analyzed it has the bar', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div'); document.body.appendChild(el); const root = createRoot(el);
    fight('bar-a');
    await React.act(async () => { root.render(React.createElement(App)); });
    await React.act(async () => { vi.advanceTimersByTime(15000); });
    const foe = () => G.combat!.units.find((t) => t.name === 'Keel')!;
    const tok = () => { const b = Array.from(el.querySelectorAll('button.phc-tok')).find((x) => (x.getAttribute('aria-label') || '').includes('Keel')) as HTMLElement; expect(b, "Keel's token").toBeTruthy(); return b; };
    const set = async (hp: number, analyzed = false) => { const u: any = foe(); u.maxHp = 140; u.hp = hp; if (analyzed) u.analyzedBy = 'MPAT'; else delete u.analyzedBy; snap = view(); await React.act(async () => { listeners.forEach((f) => f()); }); };
    const got: string[] = [];
    for (const hp of [97, 54, 11]) {
      await set(hp); const t = tok(), w = t.querySelector('[data-health-look]') as HTMLElement;
      expect(w, 'the word chip').toBeTruthy(); expect(t.querySelector('.phc-hp-fill'), 'no bar').toBeNull();
      expect(w.textContent).toBe(healthView(foe()).word.toUpperCase()); expect(parseFloat(w.style.fontSize)).toBeGreaterThanOrEqual(13);
      got.push(w.textContent || '');
    }
    expect(got).toEqual(['HURT', 'BADLY HURT', 'NEAR DEATH']);
    await set(11, true);
    expect(tok().querySelector('[data-health-look]')).toBeNull(); expect(parseFloat((tok().querySelector('.phc-hp-fill') as HTMLElement).style.width)).toBeCloseTo(11 / 140 * 100, 3);
    await React.act(async () => { root.unmount(); }); el.remove(); vi.useRealTimers();
  });
});
