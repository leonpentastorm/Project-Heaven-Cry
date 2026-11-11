// @vitest-environment jsdom
// The way out of a stalled fight (docs/design/handoffs/coop-stall.md): the combat screen shows the turn as far as the
// effects have played (fx/play.ts fxShownTurn), so effects that are counted as waiting but never play must not lock it
// for good. After STUCK_MS with nothing moving and nothing left to play, the stream is settled and the real state shows.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearFx, fxDebug, fxShownHp, fxShownLog, fxShownTurn, noteQueued, queueFx, setProcessed, turnsBusyUntil, STUCK_MS, STUCK_HARD_MS, TURN_TAIL_MS } from './play';
import { setLayer } from './dom';

let fight = 0, settledAtStart = 0;
/** How many streams this test has seen settled. */
const settledNow = () => fxDebug().settled - settledAtStart;
/** A fight as the screen holds it: its effects list, and the stream key the layer files it under. */
function game(fx: any[]) {
  const g: any = { code: 'ROOM01', combat: { name: 'Stall ' + fight, log: ['The fight begins.'], round: 1, turn: 0, order: ['p1'], units: [], fx, over: false } };
  return { g, key: 'cb|ROOM01|Stall ' + fight + '|The fight begins.' };
}
const foePhase = () => [
  { n: 1, k: 'turn', unit: 'f1', side: 'foe', at: '1,1', L: 1 }, { n: 2, k: 'hurt', target: 'p1', at: '4,5', dmg: 5, hp: { p1: [100, 95] }, L: 1 },
  { n: 3, k: 'turn', unit: 'p1', side: 'pc', at: '4,5', L: 2 },
];

beforeEach(() => { fight++; vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance', 'Date'] }); clearFx(); const layer = document.createElement('div'); document.body.appendChild(layer); setLayer(layer); vi.spyOn(console, 'warn').mockImplementation(() => {}); settledAtStart = fxDebug().settled; });
afterEach(() => { clearFx(); setLayer(null); document.body.innerHTML = ''; vi.useRealTimers(); vi.restoreAllMocks(); });

describe('a fight\'s screen never waits for good on effects that will not play', () => {
  it('a batch that was counted as queued but never reached the queue: the turn, the log and the HP wait, then show the real state', () => {
    const { g, key } = game(foePhase());
    setProcessed(key, 3); noteQueued(key, 3); // FxLayer took the batch up and was about to queue it; it never did
    expect(fxShownTurn(g)).not.toBeNull(); expect(fxShownLog(g)).toBe(1); expect(fxShownHp(g).get('p1')).toBe(100);
    vi.advanceTimersByTime(STUCK_MS - 500);
    expect(fxShownTurn(g), 'still inside the wait').not.toBeNull();
    vi.advanceTimersByTime(1000);
    expect(fxShownTurn(g), 'past the wait: the real state').toBeNull();
    expect(fxShownLog(g)).toBeNull(); expect(fxShownHp(g).size).toBe(0);
    expect(settledNow()).toBe(1); expect(console.warn).toHaveBeenCalled();
  });
  it('effects the layer never took up at all are settled the same way', () => {
    const { g, key } = game(foePhase());
    setProcessed(key, 0);
    expect(fxShownTurn(g)).not.toBeNull();
    vi.advanceTimersByTime(STUCK_MS + 500);
    expect(fxShownTurn(g)).toBeNull();
  });
  it('a long enemy phase that is playing is never cut short: the wait lasts as long as the effects do', () => {
    const fx: any[] = []; let n = 0;
    for (const who of ['f1', 'f2', 'f3']) { fx.push({ n: ++n, k: 'turn', unit: who, side: 'foe', at: '1,1' }); for (let i = 0; i < 12; i++) fx.push({ n: ++n, k: 'hurt', target: 'p1', at: '4,5', dmg: 5 }); }
    fx.push({ n: ++n, k: 'turn', unit: 'p1', side: 'pc', at: '4,5' });
    const { g, key } = game(fx);
    setProcessed(key, n); queueFx(fx, key);
    const t0 = performance.now(); let waited = 0;
    for (let i = 0; i < 400 && fxShownTurn(g); i++) { vi.advanceTimersByTime(250); waited = performance.now() - t0; }
    expect(waited).toBeGreaterThan(STUCK_MS + 1000); // 36 hits at 260 ms and four banners: over 9 s, all of it waited for
    expect(settledNow(), 'played out, not settled').toBe(0);
    expect(fxShownTurn(g)).toBeNull();
  });
  it('new effects after a long quiet spell wait their turn: the quiet before them does not count', () => {
    const first = game(foePhase());
    setProcessed(first.key, 3); queueFx(first.g.combat.fx, first.key); vi.advanceTimersByTime(5000);
    expect(fxShownTurn(first.g)).toBeNull();
    vi.advanceTimersByTime(STUCK_HARD_MS * 3); // the player thinks for a while
    const next = { ...first.g, combat: { ...first.g.combat, fx: [...first.g.combat.fx, { n: 4, k: 'turn', unit: 'f1', side: 'foe', at: '1,1' }, { n: 5, k: 'turn', unit: 'p1', side: 'pc', at: '4,5' }] } };
    expect(fxShownTurn(next), 'the new state\'s effects are not taken up yet: they wait').not.toBeNull();
    expect(settledNow()).toBe(0);
    setProcessed(first.key, 5); queueFx(next.combat.fx.slice(3), first.key); vi.advanceTimersByTime(2000);
    expect(fxShownTurn(next)).toBeNull(); expect(settledNow()).toBe(0);
  });
  it('a phase longer than the engine keeps (its first effects dropped from the list): what is left plays, and the turn comes back', () => {
    const first = game(foePhase());
    setProcessed(first.key, 3); queueFx(first.g.combat.fx, first.key); vi.advanceTimersByTime(5000);
    // one host action wrote effects 4 to 63; the list keeps the last 40 (packages/engine combat.ts FX_CAP), so 4 to 23,
    // with the first hostile's turn banner among them, never reach this screen
    const kept: any[] = [];
    for (let n = 24; n <= 63; n++) kept.push(n === 40 ? { n, k: 'turn', unit: 'f2', side: 'foe', at: '1,1' } : n === 63 ? { n, k: 'turn', unit: 'p1', side: 'pc', at: '4,5' } : { n, k: 'hurt', target: 'p1', at: '4,5', dmg: 1 });
    const next = { ...first.g, combat: { ...first.g.combat, fx: kept } };
    expect(fxShownTurn(next)).not.toBeNull();
    setProcessed(first.key, 63); queueFx(kept, first.key);
    vi.advanceTimersByTime(3000); expect(fxShownTurn(next), 'still playing').toEqual({ unit: 'p1' });
    vi.advanceTimersByTime(20000);
    expect(fxShownTurn(next)).toBeNull(); expect(settledNow()).toBe(0);
  });
  it('whatever is still scheduled, nothing moving for STUCK_HARD_MS settles the stream', () => {
    const { g, key } = game([{ n: 1, k: 'turn', unit: 'f1', side: 'foe', at: '1,1' }, { n: 2, k: 'turn', unit: 'p1', side: 'pc', at: '4,5' }]);
    setProcessed(key, 2); noteQueued(key, 2);
    queueFx([{ n: 9, k: 'hurt', target: 'x', at: '1,1', dmg: 1 }] as any, 'cb|other', { from: performance.now() + STUCK_HARD_MS * 4 }); // a timer far off in another stream keeps the queue "busy"
    vi.advanceTimersByTime(STUCK_MS + 500);
    expect(fxShownTurn(g)).not.toBeNull();
    vi.advanceTimersByTime(STUCK_HARD_MS);
    expect(fxShownTurn(g)).toBeNull();
  });
  it('the input hold after the other turns ends with the queue: with nothing left to play it is a banner\'s tail at most', () => {
    queueFx([{ n: 1, k: 'turn', unit: 'f1', side: 'foe', at: '1,1' }, { n: 2, k: 'hurt', target: 'p1', at: '4,5', dmg: 5 }, { n: 3, k: 'turn', unit: 'p1', side: 'pc', at: '4,5' }] as any, 'cb|hold');
    expect(turnsBusyUntil() - performance.now()).toBeGreaterThan(TURN_TAIL_MS);
    vi.advanceTimersByTime(3000);
    expect(fxDebug().timers).toBe(0);
    expect(turnsBusyUntil() - performance.now()).toBeLessThanOrEqual(TURN_TAIL_MS * 2);
  });
});
