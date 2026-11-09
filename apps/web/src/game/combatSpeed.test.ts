// @vitest-environment jsdom
// The combat speed (game/combatSpeed.ts): Normal ≈ 15% slower than Fast, Fast = the written timings, one tempo source
// for the effects layer, the cut-ins and the turn intro; the spotlight's slow-mo stacks on top.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { COMBAT_SPEED_KEY, EV_COMBAT_SPEED, NORMAL_RATE, battlePace, combatTempo, fightPace, getCombatSpeed, inBattle, setCombatSpeed, setInBattle } from './combatSpeed';
import { fxScale, slow, withTempo, after, anim, setLayer } from './fx/dom';
import { combatTempoInfo, clearFx, setContext, playFx } from './fx/play';
import { feltCard } from './fx/feelings';
import * as sfxMod from './sfx';
import { CUTIN_MS, CUTIN_TEMPO, cutInCap, cutInNow, showSpotlight, skipCutIn, holdUntil } from './spotlight';
import { resetStage } from './stage';

const fight = { code: 'X', characters: {}, story: { positions: {}, npcs: [] }, combat: { units: [] } } as any;

describe('the tempo math', () => {
  it('normal is 1/0.85 (about 15% slower), fast is exactly 1; anything else reads as normal', () => {
    expect(NORMAL_RATE).toBe(0.85);
    expect(combatTempo('fast')).toBe(1);
    expect(combatTempo('normal')).toBeCloseTo(1 / 0.85, 10);
    expect(combatTempo('normal')).toBeCloseTo(1.1765, 3);
    expect(combatTempo(undefined)).toBe(combatTempo('normal'));
    expect(combatTempo('warp')).toBe(combatTempo('normal'));
  });
});

describe('the setting', () => {
  beforeEach(() => { localStorage.clear(); window.dispatchEvent(new CustomEvent(EV_COMBAT_SPEED, { detail: {} })); setInBattle(false); });
  it('defaults to normal; set stores phc.combatSpeed and fires phc:combat-speed', () => {
    expect(getCombatSpeed()).toBe('normal');
    const seen: any[] = []; const f = (e: Event) => seen.push((e as CustomEvent).detail); window.addEventListener(EV_COMBAT_SPEED, f);
    setCombatSpeed('fast');
    window.removeEventListener(EV_COMBAT_SPEED, f);
    expect(localStorage.getItem(COMBAT_SPEED_KEY)).toBe('fast'); expect(getCombatSpeed()).toBe('fast'); expect(seen).toEqual([{ speed: 'fast' }]);
    setCombatSpeed('normal'); expect(getCombatSpeed()).toBe('normal');
  });
  it('a key written by hand is read again on the event (no reload)', () => {
    setCombatSpeed('normal');
    localStorage.setItem(COMBAT_SPEED_KEY, 'fast'); expect(getCombatSpeed()).toBe('normal'); // cached until told
    window.dispatchEvent(new CustomEvent(EV_COMBAT_SPEED)); expect(getCombatSpeed()).toBe('fast');
  });
  it('the pace is the speed in a fight and 1 outside one; the CSS variable follows the fight pace', () => {
    setCombatSpeed('normal');
    expect(inBattle()).toBe(false); expect(battlePace()).toBe(1); expect(fightPace()).toBeCloseTo(1 / 0.85, 10);
    setInBattle(true); expect(battlePace()).toBeCloseTo(1 / 0.85, 10);
    expect(Number(document.documentElement.style.getPropertyValue('--phc-k'))).toBeCloseTo(1.1765, 3);
    setCombatSpeed('fast'); expect(battlePace()).toBe(1); expect(document.documentElement.style.getPropertyValue('--phc-k')).toBe('1');
    setInBattle(false);
  });
  it('the effects layer turns it on for a fight on the combat screen only', () => {
    setContext(fight, 'combat'); expect(inBattle()).toBe(true);
    setContext(fight, 'main'); expect(inBattle()).toBe(false);
    setContext(null, 'combat'); expect(inBattle()).toBe(false);
  });
});

describe('the effects layer follows it (fx/dom.ts, fx/play.ts)', () => {
  beforeEach(() => { localStorage.clear(); setCombatSpeed('normal'); setInBattle(true); vi.useFakeTimers(); });
  afterEach(() => { setInBattle(false); vi.useRealTimers(); });
  it('durations, delays and waits: × 1/0.85 at normal, × 1 at fast; the spotlight slow-mo stacks on top', () => {
    expect(slow(1000)).toBeCloseTo(1176.47, 1);
    expect(withTempo(CUTIN_TEMPO, () => slow(1000))).toBeCloseTo(1000 / 0.85 / 0.85, 1);
    setCombatSpeed('fast');
    expect(slow(1000)).toBe(1000); expect(fxScale()).toBe(1);
    expect(withTempo(CUTIN_TEMPO, () => slow(1000))).toBeCloseTo(1000 / 0.85, 1);
  });
  it('after() waits at the pace', () => {
    const f = vi.fn(); after(f, 850);
    vi.advanceTimersByTime(990); expect(f).not.toHaveBeenCalled();
    vi.advanceTimersByTime(20); expect(f).toHaveBeenCalledTimes(1); // 850 / 0.85 = 1000
  });
  it('anim() lengthens its duration and delay', () => {
    const el = document.createElement('div'); let got: any = null;
    (el as any).animate = (_f: any, o: any) => { got = o; return null; };
    anim(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 340, delay: 170 });
    expect(got.duration).toBeCloseTo(400, 6); expect(got.delay).toBeCloseTo(200, 6);
    setCombatSpeed('fast'); anim(el, [{ opacity: 0 }], { duration: 340, delay: 170 });
    expect(got.duration).toBe(340); expect(got.delay).toBe(170);
  });
  it('the queue\'s beats: a shot holds 400 ms at fast, 470.6 at normal (the hook reads the same)', () => {
    setLayer(document.createElement('div'));
    expect(combatTempoInfo().beat('shot', { hit: true })).toBeCloseTo(400 / 0.85, 1);
    expect(combatTempoInfo()).toMatchObject({ speed: 'normal', battle: true, tempo: 1 });
    setCombatSpeed('fast');
    expect(combatTempoInfo().beat('shot', { hit: true })).toBe(400);
    expect((window as any).__phcCombatTempo()).toMatchObject({ speed: 'fast', mult: 1, pace: 1, shotBeat: 400 });
    setLayer(null);
  });
});

describe('the cut-ins follow it (game/spotlight)', () => {
  beforeEach(() => { localStorage.clear(); clearFx(); resetStage(); vi.useFakeTimers(); });
  afterEach(() => { skipCutIn(); vi.advanceTimersByTime(3000); setInBattle(false); vi.useRealTimers(); });
  const crit = { kind: 'crit', short: true, strips: [{ key: 'a', name: 'Recruit', img: '', eye: { x: 0.5, y: 0.3 }, ink: '#F65157', word: 'Crit' }], label: 'CRITICAL HIT · RECRUIT', caption: 'Critical hit on Rook' } as any;
  it('in a fight at normal: the crit cut-in and its words\' hold are × 1/0.85; at fast they are the written 2240 / 1940', () => {
    setCombatSpeed('normal'); setInBattle(true);
    showSpotlight(crit, { prefApplied: true });
    expect(cutInNow()!.ms).toBeCloseTo(CUTIN_MS(1, false, false, true) / 0.85, 6);
    expect(cutInNow()!.hold).toBeCloseTo(holdUntil(1, false, false, true) / 0.85, 6);
    expect(cutInNow()!.pace).toBeCloseTo(1 / 0.85, 10);
    skipCutIn(); vi.advanceTimersByTime(3000);
    setCombatSpeed('fast');
    showSpotlight({ ...crit, id: 'b' }, { prefApplied: true });
    expect(cutInNow()!.ms).toBe(2240); expect(cutInNow()!.hold).toBe(1940);
  });
  it('outside a fight the speed never applies', () => {
    setCombatSpeed('normal'); setInBattle(false);
    showSpotlight({ ...crit, id: 'c' }, { prefApplied: true });
    expect(cutInNow()!.ms).toBe(2240); expect(cutInNow()!.pace).toBe(1);
  });
});

describe('review fixes (9 Nov 2026): what still ran at the old speed', () => {
  beforeEach(() => { localStorage.clear(); clearFx(); setCombatSpeed('normal'); setInBattle(true); vi.useFakeTimers(); });
  afterEach(() => { clearFx(); setInBattle(false); vi.useRealTimers(); });
  it('a volley\'s silent window follows the pace: at Normal a chained shot 2.7 s in is still silent (it was 2.5 s flat)', () => {
    const spy = vi.spyOn(sfxMod, 'sfx').mockImplementation(() => {});
    playFx({ k: 'volley', unit: 'u', from: '1,1', to: '5,1', cat: 'smg', mode: 'auto' } as any);
    const auto = spy.mock.calls.length; expect(auto).toBeGreaterThan(0);
    vi.advanceTimersByTime(2700);
    playFx({ k: 'shot', unit: 'u', target: 't', from: '1,1', to: '5,1', weapon: 'decrkm_smg', cat: 'smg', hit: true, dmg: 4, chain: true } as any);
    expect(spy.mock.calls.length).toBe(auto); // silent: inside 2500 / 0.85 ≈ 2941 ms
    vi.advanceTimersByTime(400);
    playFx({ k: 'shot', unit: 'u', target: 't', from: '1,1', to: '5,1', weapon: 'decrkm_smg', cat: 'smg', hit: true, dmg: 4, chain: true } as any);
    expect(spy.mock.calls.length).toBeGreaterThan(auto); // past the window: its own sound
    spy.mockRestore();
  });
  it('the A NEW FEELING card holds and fades at the pace (removed at (3200 + 420) / 0.85, not 3620)', () => {
    (Element.prototype as any).animate = () => ({ cancel() {}, finished: Promise.resolve() });
    feltCard('anger');
    vi.advanceTimersByTime(3700); expect(document.querySelector('[data-felt-card]')).not.toBeNull();
    vi.advanceTimersByTime(600); expect(document.querySelector('[data-felt-card]')).toBeNull();
    setCombatSpeed('fast'); feltCard('anger');
    vi.advanceTimersByTime(3610); expect(document.querySelector('[data-felt-card]')).not.toBeNull();
    vi.advanceTimersByTime(20); expect(document.querySelector('[data-felt-card]')).toBeNull();
    delete (Element.prototype as any).animate;
  });
  it('the safety cap is per cut-in: 1700 ms as before, 2400 only for a crit\'s short one (which holds its words)', () => {
    expect(cutInCap(false)).toBe(1700); expect(cutInCap(true)).toBe(2400);
    expect(cutInCap(false)).toBeGreaterThan(CUTIN_MS(4, true)); expect(cutInCap(true)).toBeGreaterThan(CUTIN_MS(1, false, false, true));
  });
});
