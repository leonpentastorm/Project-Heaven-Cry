// Rules 1.14 in the host's browser: when an attempt is waiting in a fight and the Narrator is an AI, the host calls it
// once with the small fight call and applies the answer; an error or a 20 s silence gives the attempt back and says so
// in the log; a browser with no key tells the game so (attempts are refused); a human Narrator is never called.
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, active, fightRulingOf } from '@engine';

{ const kept = new Map<string, string>(); // a browser's storage, so a room can be closed and opened again
  (globalThis as any).localStorage = { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, v: string) => { kept.set(k, String(v)); }, removeItem: (k: string) => { kept.delete(k); }, clear: () => kept.clear(), key: (i: number) => [...kept.keys()][i] ?? null, get length() { return kept.size; } }; }
(globalThis as any).location = { search: '', origin: 'http://localhost', protocol: 'http:', host: 'localhost' };
vi.mock('./net', () => ({ connect: () => ({ send: () => {}, close: () => {}, state: 'open' }) }));
const usage = { input: 0, output: 0, cacheRead: 0, costUsd: 0 };
const turn = vi.fn(async () => ({ usage, turn: { narration: 'Guns.', sceneTitle: 'The rear pad', combat: { name: 'The rear pad', difficulty: 'easy', enemies: [{ name: 'Engineer', tier: 'minion', weapon: 'service_pistol' }] } } }));
const fight = vi.fn();
vi.mock('../narrator/anthropic', () => ({ anthropicProvider: () => ({ turn, fight }), scriptedProvider: () => ({ turn, fight }), polish: async () => '', MODELS: [{ id: 'claude-opus-5-5', label: 'Opus', input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 }] }));
const store = await import('./store');
const tick = async (n = 4) => { for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0)); };
const host = () => store.reportState()!;
const cb = () => host().combat!;
const me = () => cb().units.find((u) => u.side === 'pc')!;
/** A fresh turn for the test's character: theirs to act, full AP, no attempt made yet. */
function myTurn() { const c = cb() as any, u = me(); c.turn = c.order.indexOf(u.id); delete c.window; u.ap = 6; u.hp = u.maxHp; u.downed = false; c.attempted = {}; delete c.over; for (const f of c.units) if (f.side === 'foe') { f.hp = f.maxHp; f.dead = false; f.downed = false; f.surrendered = false; f.conds = {}; } expect(active(cb())!.id).toBe(u.id); return u; }
const attempt = (text: string) => store.act({ type: 'combat/attempt', unitId: me().id, text });

describe('the host answers an attempt in a fight with the AI Narrator', () => {
  it('setup: a room with the scripted Narrator, straight into a fight', async () => {
    store.setName('Host'); store.setNarrator({ scripted: true });
    store.hostRoom('FTTEST'); await tick();
    const a = ARCHETYPES[0];
    store.act({ type: 'char/add', sheet: { name: 'MPAT', portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any });
    store.act({ type: 'session/start' }); await tick(8);
    expect(host().phase).toBe('combat'); expect(host().narrator.offline).toBeFalsy();
  });
  it('calls the Narrator once with the pending ruling and applies its answer; the cost is counted, not as a turn', async () => {
    myTurn(); const calls = host().narrator.usage.calls, foe = cb().units.find((u) => u.side === 'foe')!;
    fight.mockReset(); fight.mockImplementation(async (_g: any, r: any) => ({ usage: { input: 640, output: 60, cacheRead: 0, costUsd: 0.004 }, answer: { lines: ['The engineer swallows.'], effect: { condition: { target: foe.id, id: 'shaken' } } }, r }));
    attempt('Put it down. Nobody is paying you for this.'); await tick();
    expect(fight).toHaveBeenCalledTimes(1); expect(fight.mock.calls[0][1].text).toBe('Put it down. Nobody is paying you for this.');
    expect(fightRulingOf(cb())).toBeNull(); expect(cb().log).toContain('Narrator: The engineer swallows.');
    expect(cb().units.find((u) => u.id === foe.id)!.conds!.shaken).toBe(1); expect(me().ap).toBe(5);
    expect(host().narrator.usage.calls).toBe(calls); expect((host().narrator.usage as any).fights).toBe(1); expect(host().narrator.usage.costUsd).toBeCloseTo(0.004, 6);
    expect(store.getState().game!.combat!.log).toContain('Narrator: The engineer swallows.'); // the host's own screen has it
  });
  it('asks once for a ruling, however much happens while it waits', async () => {
    myTurn(); let answer: (v: any) => void = () => {};
    fight.mockReset(); fight.mockImplementation(() => new Promise((res) => { answer = res; }));
    attempt('Listen to me.'); await tick();
    store.act({ type: 'combat/say', charId: me().charId!, text: 'Well?' }); await tick();
    store.act({ type: 'combat/say', charId: me().charId!, text: 'I am waiting.' }); await tick();
    expect(fight).toHaveBeenCalledTimes(1); expect(fightRulingOf(cb())).toBeTruthy();
    answer({ usage, answer: { lines: ['A long silence.'] } }); await tick();
    expect(fightRulingOf(cb())).toBeNull(); expect(cb().log.at(-1)).toBe('Narrator: A long silence.');
  });
  it('an error gives the AP and the attempt back, and the log says so', async () => {
    myTurn(); fight.mockReset(); fight.mockImplementation(async () => { throw Object.assign(new Error('Anthropic rejected the API key.'), { usage: { input: 10, output: 0, cacheRead: 0, costUsd: 0.001 } }); });
    const cost = host().narrator.usage.costUsd;
    attempt('Stand down!'); await tick();
    expect(fightRulingOf(cb())).toBeNull(); expect(me().ap).toBe(6);
    expect(cb().log.at(-1)).toBe('The Narrator could not be reached. MPAT gets 1 AP back.');
    expect(host().narrator.usage.costUsd).toBeCloseTo(cost + 0.001, 6); // a failed call that was billed still counts
    fight.mockImplementation(async () => ({ usage, answer: { lines: ['This time it hears you.'] } }));
    attempt('Stand down!'); await tick(); expect(cb().log.at(-1)).toBe('Narrator: This time it hears you.'); // the turn's attempt came back too
  });
  it('an answer the game can\'t use gives the attempt back', async () => {
    myTurn(); fight.mockReset(); fight.mockImplementation(async () => ({ usage, answer: { lines: [], effect: { damage: 99 } as any } }));
    attempt('Explode.'); await tick();
    expect(fightRulingOf(cb())).toBeNull(); expect(me().ap).toBe(6); expect(cb().log.at(-1)).toMatch(/The Narrator's answer could not be used\. MPAT gets 1 AP back\./);
  });
  it('no answer in about 20 seconds gives it back', async () => {
    myTurn(); fight.mockReset(); fight.mockImplementation(() => new Promise(() => {}));
    vi.useFakeTimers();
    try {
      attempt('Anyone?'); await vi.advanceTimersByTimeAsync(19000);
      expect(fightRulingOf(cb())).toBeTruthy();
      await vi.advanceTimersByTimeAsync(1500);
      expect(fightRulingOf(cb())).toBeNull(); expect(me().ap).toBe(6); expect(cb().log.at(-1)).toBe('The Narrator took too long to answer. MPAT gets 1 AP back.');
    } finally { vi.useRealTimers(); }
  });
  it('a late answer after the host ended the wait changes nothing', async () => {
    myTurn(); let answer: (v: any) => void = () => {};
    fight.mockReset(); fight.mockImplementation(() => new Promise((res) => { answer = res; }));
    attempt('Hello?'); await tick();
    store.act({ type: 'narrator/fight-skip', id: fightRulingOf(cb())!.id, note: 'The host ended the wait.' }); await tick();
    const n = cb().log.length; answer({ usage, answer: { lines: ['Too late.'] } }); await tick();
    expect(cb().log.length).toBe(n); expect(cb().log.at(-1)).toBe('The host ended the wait. MPAT gets 1 AP back.');
  });
  it('no key in this browser: the game is told, an attempt is refused and costs nothing; with a key it works again', async () => {
    myTurn(); fight.mockReset(); fight.mockImplementation(async () => ({ usage, answer: { lines: ['Yes.'] } }));
    store.setNarrator({ scripted: false, key: '' }); await tick();
    expect(host().narrator.offline).toBe(true);
    attempt('Hear me.'); await tick();
    expect(fight).not.toHaveBeenCalled(); expect(fightRulingOf(cb())).toBeNull(); expect(me().ap).toBe(6); expect(store.getState().toast?.text).toBe('No Narrator is connected.');
    store.act({ type: 'combat/say', charId: me().charId!, text: 'Fine. I will just say it.' }); expect(cb().log.at(-1)).toContain('Fine. I will just say it.');
    store.setNarrator({ scripted: true }); await tick();
    expect(host().narrator.offline).toBeFalsy();
    attempt('Hear me.'); await tick(); expect(cb().log.at(-1)).toBe('Narrator: Yes.');
  });
  it('a room opened again while an attempt waits (the host reloaded) asks the Narrator for it', async () => {
    myTurn(); fight.mockReset(); fight.mockImplementation(() => new Promise(() => {})); // the first call dies with the page
    attempt('Is anyone listening?'); await tick();
    expect(fight).toHaveBeenCalledTimes(1); const id = fightRulingOf(cb())!.id;
    store.saveNow?.(); store.leaveRoom(); await tick();
    fight.mockReset(); fight.mockImplementation(async () => ({ usage, answer: { lines: ['Someone is.'] } }));
    store.hostRoom('FTTEST'); await tick(8);
    expect(fight).toHaveBeenCalledTimes(1); expect(fight.mock.calls[0][1].id).toBe(id);
    expect(fightRulingOf(cb())).toBeNull(); expect(cb().log.at(-1)).toBe('Narrator: Someone is.');
  });
  it('a human Narrator is never called: the fight waits for their own answer', async () => {
    myTurn(); fight.mockReset(); host().settings.mode = 'human';
    attempt('I wave the white rag.'); await tick();
    expect(fight).not.toHaveBeenCalled(); expect(fightRulingOf(cb())!.text).toBe('I wave the white rag.');
    store.act({ type: 'narrator/fight-ruling', id: fightRulingOf(cb())!.id, lines: ['They hold their fire.'] }); await tick();
    expect(cb().log.at(-1)).toBe('Narrator: They hold their fire.');
    host().settings.mode = 'ai';
  });
});
