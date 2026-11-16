// @vitest-environment jsdom
// Rules 1.62 item 4746 (0.31; it supersedes rules 1.55 items 69 and 70): the field is turns, so a player with two
// characters acts with the one whose turn it is, as in a fight: a tile click walks it, End turn hands the turn to the
// other; a Downed one's turn passes by itself; the AP pips are the fight's. Rendered with the screen's template and
// driven through its own handlers (a tile clicked, End turn), as the game does.
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, reachable, paths, refOf, type GameState, type Sheet } from '@engine';

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
  expect((G as any).run.state).toBe('field'); expect(G.combat!.field).toMatchObject({ round: 1 });
  for (const c of Object.values(G.characters)) c.owner = ME; snap = view();
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

describe('the field with two characters (rules 1.62 item 4746)', () => {
  it('the one whose turn it is walks on a tile click; End turn hands the turn to the other, which then walks', async () => {
    vi.useFakeTimers(); field();
    const { el, done } = await render();
    const first = G.combat!.units.find((u) => u.id === G.combat!.order[G.combat!.turn])!, other = first.name === 'Medic' ? unitOf('Gun') : unitOf('Medic');
    const o0 = other.pos;
    expect(el.querySelector('[data-phc-ap-free]')).toBeNull(); expect(el.querySelector('[data-phc-act-as]')).toBeNull(); // the fight's pips; nobody to pick
    const to = freeNear(el, first.id);
    await click(tileBtn(el, to)); // the default action is a move: it goes for the unit whose turn it is
    expect(unitOf(first.name).pos).toBe(to); expect(unitOf(other.name).pos).toBe(o0);
    await click(Array.from(el.querySelectorAll('button')).find((b) => /End turn/.test(b.textContent || '') && !(b as HTMLButtonElement).disabled && !b.closest('[aria-hidden="true"]')));
    expect(G.combat!.order[G.combat!.turn]).toBe(other.id);
    await React.act(async () => { vi.advanceTimersByTime(15000); });
    const to2 = freeNear(el, other.id);
    await click(tileBtn(el, to2));
    expect(unitOf(other.name).pos).toBe(to2); expect(unitOf(first.name).pos).toBe(to);
    await done(); vi.useRealTimers();
  }, 60_000);

  it('with the Medic Downed, its turn passes by itself: the Gunner is up and a tile click walks it', async () => {
    vi.useFakeTimers(); field();
    const m = G.combat!.units.find((u) => u.name === 'Medic' && !u.companion)!; m.hp = 0; m.downed = true;
    if (G.combat!.order[G.combat!.turn] === m.id) doAct({ type: 'combat/end-turn', unitId: m.id }); // its turn passes
    expect(G.combat!.order[G.combat!.turn]).toBe(unitOf('Gun').id); snap = view();
    const { el, done } = await render();
    const gun = unitOf('Gun'), to = freeNear(el, gun.id);
    await click(tileBtn(el, to));
    expect(unitOf('Gun').pos).toBe(to); expect(unitOf('Medic').pos).toBe(m.pos);
    await done(); vi.useRealTimers();
  }, 60_000);
});
