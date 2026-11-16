// @vitest-environment jsdom
// 0.29.0, faults seen on live 0.28.3 tonight, on the field (the fight still running, rules 1.55 items 61 to 70), two
// players (the host's Medic, p2's Gun): (a) the field's Backpack has the path map's Give and "Use on…" (GiveTab.tsx,
// mounted there: the fight screen has no sheet), and the reward pick waits for the vote; (c) a Shot picked on a friend
// shows the engine's refusal on the target card, never a hit chance; (d) the field's words (rules 1.62 item 4906: the
// field is turns): YOUR TURN with the field's round, the Backpack's AP as in a fight. Rendered with the screen's template and driven through its own handlers.
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, reachable, paths, refOf, type GameState, type Sheet } from '@engine';

let G: GameState; const ME = 'host';
const TOASTS: string[] = [];
const listeners = new Set<() => void>();
let snap: any = null;
const view = () => ({ game: viewFor(G, ME), me: { id: ME, name: 'Leon' }, role: 'host', screen: 'combat', toast: null, savedAt: 0 });
const doAct = (a: any) => { G = apply(G, a, ME); snap = view(); listeners.forEach((f) => f()); };
vi.mock('../game/store', () => ({ getState: () => snap || (snap = view()), subscribe: (f: any) => { listeners.add(f); return () => listeners.delete(f); },
  act: (a: any) => { try { doAct(a); } catch (e: any) { if (e?.name !== 'RuleError' && e?.constructor?.name !== 'RuleError') throw e; } }, go: () => {}, toast: (t: string) => { TOASTS.push(t); }, polishText: async () => '', retryNarrator: () => {}, saveNow: () => {}, poke: () => {}, homeScreen: () => 'main' }));
vi.mock('../game/report', () => ({ openReport: () => {}, PlaytestTools: () => null }));
const origErr = console.error;
console.error = (...a: any[]) => { const t = a.map(String).join(' '); if (!/not wrapped in act|act\(\.\.\.\)/.test(t)) origErr(...a); };
const { CombatLogic } = await import('./combat.js');
const React = await import('react'); const { createRoot } = await import('react-dom/client');
const { makeScreen } = await import('../dc/runtime'); const { expand } = await import('./shared');
const tpl = (await import('../templates/combat.template.html?raw')).default;
const Screen = makeScreen(expand(tpl), CombatLogic as any);
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const sheetFrom = (archId: string, name: string): Sheet => { const a = ARCHETYPES.find((x) => x.id === archId)!;
  return { name, portrait: '', origin: 'Thousand-Planet frontier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any; };
/** A Survival test room of two (Medic for the host, Gun for p2) into the first fight, won at once: the field. Survival
 * starts with one character a player; the fixture then gives Gun to the host (the state after a character changes
 * hands), so the host has two characters on the field. */
function field() {
  snap = null; G = newGame('FIELD2', { id: ME, name: 'Leon' }, 'field-two'); (G as any).settings.play = 'survival'; (G as any).settings.test = true;
  doAct({ type: 'char/add', sheet: sheetFrom('mender', 'Medic') });
  G = apply(G, { type: 'player/join', id: 'p2', name: 'M' } as any, ME); G = apply(G, { type: 'char/add', sheet: sheetFrom('sharpshooter', 'Gun') } as any, 'p2');
  doAct({ type: 'run/start', seed: 'PHC-0003' }); doAct({ type: 'run/ready', close: true });
  const node = reachable((G as any).run).find((n: any) => n.kind === 'fight')!.id;
  for (const by of [ME, 'p2']) if ((G as any).run.state === 'map') G = apply(G, { type: 'run/move', node } as any, by);
  doAct({ type: 'run/skip' });
  expect((G as any).run.state).toBe('field'); expect(G.combat!.field).toMatchObject({ round: 1, of: 3 });
  const gun = G.combat!.units.find((u) => u.name === 'Gun' && !u.companion)!;
  if (G.combat!.order[G.combat!.turn] === gun.id) G = apply(G, { type: 'combat/end-turn', unitId: gun.id } as any, 'p2'); // the Medic's turn (rules 1.62 item 4906)
  snap = view();
}
function App() {
  const st = React.useSyncExternalStore((f) => { listeners.add(f); return () => { listeners.delete(f); }; }, () => snap);
  return React.createElement(Screen as any, { tick: st });
}
const unitOf = (name: string) => G.combat!.units.find((u) => u.name === name && !u.companion)!;
const tileBtn = (el: HTMLElement, k: string) => Array.from(el.querySelectorAll('button.phc-tok')).find((b) => (b.getAttribute('aria-label') || '').startsWith(refOf(k) + ' · ')) as HTMLElement | undefined;
/** A free tile two steps from the unit, with its button on the screen. */
function freeNear(el: HTMLElement, id: string): string {
  const u = G.combat!.units.find((x) => x.id === id)!, P = paths(G.combat!, u.pos, u.id), taken = new Set(G.combat!.units.filter((x) => !x.dead).map((x) => x.pos));
  const k = Object.keys(P.dist).find((t) => P.dist[t] === 2 && !taken.has(t) && tileBtn(el, t)); expect(k).toBeTruthy(); return k!;
}
async function render() {
  const el = document.createElement('div'); document.body.appendChild(el); const root = createRoot(el);
  await React.act(async () => { root.render(React.createElement(App)); });
  await React.act(async () => { vi.advanceTimersByTime(15000); });
  return { el, done: async () => { await React.act(async () => { root.unmount(); }); el.remove(); } };
}
const click = async (b: Element | null | undefined) => { expect(b).toBeTruthy(); await React.act(async () => { (b as HTMLElement).click(); }); };


describe("0.29.0: the field's Backpack, the friend target card and the field's words", () => {
  it('(a) the Backpack holds Give with Use on…, and the reward pick is refused before the vote', async () => {
    vi.useFakeTimers(); field(); const r = await render();
    expect(() => apply(G, { type: 'run/pick', charId: unitOf('Medic').charId, choice: 'materials' } as any, ME)).toThrow(/nothing to pick/);
    await click(r.el.querySelector('[data-backpack="card"]') || r.el.querySelector('[data-backpack="mini"]'));
    const sec = r.el.querySelector('[data-bp-section="give"]') as HTMLElement; expect(sec).toBeTruthy();
    expect(sec.querySelector('[data-phc-give]')).toBeTruthy();
    expect(sec.textContent).toMatch(/Give/);
    // (d) the Backpack's AP as in a fight (rules 1.62 item 4906)
    expect(r.el.textContent).toMatch(/1 AP a hand/); expect(r.el.textContent).not.toMatch(/gear changes cost nothing/);
    await r.done(); vi.useRealTimers();
  });
  it("(c) a Shot picked on a friend: the target card says the engine's refusal, no hit chance; (d) YOUR TURN with the field's round", async () => {
    vi.useFakeTimers(); field();
    const L: any = new CombatLogic({}); L.setState = (p: any) => { Object.assign(L.state, p); };
    L.state = { ...L.state, action: 'shot', target: unitOf('Gun').id };
    const v = L.renderVals();
    expect(v.target.odds).toMatch(/is a friend/); expect(v.target.odds).not.toMatch(/Hit \d+%/);
    expect(v.ytWord).toBe('YOUR TURN'); expect(v.turnChip).toBe('YOUR TURN'); expect(v.turnPanels[0].ytSub).toMatch(/^ROUND 1 OF 3 · \d+ AP$/);
    vi.useRealTimers();
  });
  it("(b) Bond on a machine on the field: the data's reason for that unit, never the step's prompt", async () => {
    vi.useFakeTimers(); field();
    const foe = G.combat!.units.find((u) => u.side === 'foe')!; foe.kind = 'robot'; delete (foe as any).hidden;
    const m = unitOf('Medic'), [x, y] = m.pos.split(',').map(Number); foe.pos = (x + 2) + ',' + y; snap = view();
    const L: any = new CombatLogic({}); L.setState = (p: any) => { Object.assign(L.state, p); };
    const row = L.renderVals().groups.flatMap((g: any) => g.items).find((i: any) => i.name === 'Bond'); expect(row).toBeTruthy(); row.pick();
    L.renderVals(); L.tileClick(foe.pos);
    expect(TOASTS.at(-1)).toBe('✕ ' + foe.name + ': A machine has no heart to Bond.');
    vi.useRealTimers();
  });
});
