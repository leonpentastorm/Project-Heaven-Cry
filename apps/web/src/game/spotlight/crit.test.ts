// @vitest-environment jsdom
// Critical hits in a fight cut in (Leon, 9 Nov 2026: "play it when a critical hit appear in combat too"; decision 113):
// the short form (one strip, about 0.9 s), one cut-in per action (the bigger moment leads), the action 15% slower,
// and the brass (casings, the bow's draw) in step with the slowed shot.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { newGame, apply, ARCHETYPES, refOf, type GameState, type Sheet } from '@engine';
import { cutInFromFx, captionOf } from './spec';
import { CUTIN_MS, holdUntil, CUTIN_TEMPO, CRIT_READ_MS, CRIT_TEXT_IN, CUTIN_MAX_MS } from './timing';
import { cutInActive, cutInNow, skipCutIn } from './index';
import { resetStage } from '../stage';
import { queueFx, clearFx, gatesOf, slowedIn, setContext, playFx } from '../fx/play';
import { setLayer } from '../fx/dom';
import { DRAW_MS } from '../fx/brass';
import { setUiPrefs } from '../sfx';
import * as sfxMod from '../sfx';

const sheet = (name: string): Sheet => {
  const a = ARCHETYPES.find((x) => x.id === 'sharpshooter') || ARCHETYPES[0];
  return { name, portrait: '/assets/char-arch-bulwark.webp', origin: 'Thousand-Planet frontier', kit: 'soldier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} };
};
function room(): { g: GameState; a: string } {
  let g = newGame('CRIT', { id: 'host', name: 'Host' }, 'crit-seed');
  g = apply(g, { type: 'char/add', sheet: sheet('Mallow Vey') }, 'host');
  return { g, a: Object.keys(g.characters)[0] };
}
const crit = (n: number, char: string, x: any = {}) => ({ n, k: 'spotlight', kind: 'crit', via: 'weapon', char, unit: 'u1', target: 'e1', targetName: 'Rook', reason: 'a critical hit on Rook', scene: 'fight1', from: n - 2, ...x });

describe('the crit cut-in: short, one strip', () => {
  it('label CRITICAL HIT · the attribute, caption "Critical hit on Rook", one strip, short', () => {
    const { g, a } = room();
    const s = cutInFromFx(g, [crit(12, a)] as any, 'cb|x')!;
    expect(s.kind).toBe('crit'); expect(s.short).toBe(true); expect(s.strips).toHaveLength(1);
    expect(s.label).toMatch(/^CRITICAL HIT · [A-Z]+$/); expect(s.caption).toBe('Critical hit on Rook');
    expect(captionOf(crit(1, a, { via: 'sigil' }))).toBe('Critical hit on Rook · Sigil');
    expect(captionOf(crit(1, a, { reason: 'Rex: a critical hit on Rook', by: 'Rex' }))).toBe('Rex: critical hit on Rook');
  });
  it('a check\'s crit (out of a fight) keeps its full form', () => {
    const { g, a } = room();
    const s = cutInFromFx(g, [{ n: 3, k: 'spotlight', kind: 'crit', char: a, tn: 20, skill: 'composure', reason: 'x', scene: 'scene1' }] as any)!;
    expect(s.short).toBeUndefined(); expect(s.label).toMatch(/^CRITICAL SUCCESS/);
  });
  it('a crit with a bigger moment in the same action: one cut-in, the bigger one leads (not short)', () => {
    const { g, a } = room();
    const s = cutInFromFx(g, [crit(12, a), { n: 13, k: 'spotlight', kind: 'takedown', char: a, targetName: 'Warden', reason: 'took down Warden', scene: 'fight1', from: 10 }] as any, 'cb|x')!;
    expect(s.kind).toBe('takedown'); expect(s.short).toBeUndefined(); expect(s.label).toMatch(/^TAKEDOWN/);
  });
  it('timing (at Fast): the words fully in at 340 ms and held 1.6 s to read, the way out from 1940, 2240 in all (reduced motion: in at 120, 2020)', () => {
    expect(CRIT_READ_MS).toBe(1600);
    expect(CUTIN_MS(1, false, false, true)).toBe(2240); expect(CUTIN_MS(1, false, true, true)).toBe(2020);
    expect(holdUntil(1, false, false, true)).toBe(1940); expect(holdUntil(1, false, true, true)).toBe(1720);
    expect(holdUntil(1, false, false, true) - CRIT_TEXT_IN()).toBe(CRIT_READ_MS); expect(CUTIN_MS(1)).toBe(1400);
    expect(CUTIN_MAX_MS).toBeGreaterThan(CUTIN_MS(1, false, false, true));
  });
});

describe('the crit in the effects queue', () => {
  beforeEach(() => { clearFx(); resetStage(); setUiPrefs({ cutins: 'all', reduceMotion: false } as any); });
  it('the gate stands before the shot; the shot plays slowed; the cut-in is the short one', async () => {
    const { g, a } = room();
    setContext(g, 'main');
    const evs: any[] = [{ n: 10, k: 'shot', unit: 'u1', target: 'e1', from: '1,1', to: '5,1', weapon: 'service_pistol', cat: 'pistol', hit: true, crit: true, dmg: 30 }, { n: 11, k: 'hurt', unit: 'e1', amount: 30 }, crit(12, a, { from: 10 })];
    const [gate] = gatesOf(evs);
    expect(gate).toMatchObject({ at: 0, from: 10, to: 12 });
    expect(slowedIn(evs[0], gate)).toBe(true); expect(slowedIn(evs[1], gate)).toBe(true); expect(slowedIn(evs[2], gate)).toBe(false);
    queueFx(evs, 'cb|crit');
    expect(cutInActive()).toBe(true); expect(cutInNow()!.ms).toBe(2240); expect(cutInNow()!.spec.short).toBe(true);
    skipCutIn(); clearFx();
  });
  it('Off: no gate, no cut-in', () => {
    const { g, a } = room(); setContext(g, 'main'); setUiPrefs({ cutins: 'off' } as any);
    queueFx([{ n: 10, k: 'hurt', unit: 'e1', amount: 3 }, crit(11, a, { from: 10 })] as any, 'cb|off');
    expect(cutInActive()).toBe(false); clearFx();
  });
});

function grid(w = 8, h = 6) {
  document.body.innerHTML = '';
  const root = document.createElement('div'); root.id = 'root'; const scr = document.createElement('div'); root.appendChild(scr); document.body.appendChild(root);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const b = document.createElement('button'); b.className = 'phc-tok'; b.setAttribute('aria-label', refOf(x + ',' + y) + ' · open');
    const img = document.createElement('img'); img.setAttribute('style', 'position: relative; z-index: 2; width: 38px; border-radius: 50%'); b.appendChild(img);
    (b as any).getBoundingClientRect = () => ({ left: x * 40, top: y * 40, width: 40, height: 40, right: x * 40 + 40, bottom: y * 40 + 40 });
    (img as any).getBoundingClientRect = () => ({ left: x * 40 + 1, top: y * 40 + 1, width: 38, height: 38, right: x * 40 + 39, bottom: y * 40 + 39 });
    scr.appendChild(b);
  }
  const layer = document.createElement('div'); document.body.appendChild(layer); setLayer(layer);
  setContext({ code: 'X', characters: {}, story: { positions: {}, npcs: [] }, combat: null } as any, 'main');
  return layer;
}
const pieces = (layer: HTMLElement) => Array.from(layer.querySelectorAll('[data-fx-piece]')).map((e) => e.getAttribute('data-fx-piece'));

describe('the brass keeps step with a slowed shot (tempo 0.85)', () => {
  it('a pump gun\'s hull comes a beat later, and its animation and its box last 1/0.85 as long', () => {
    vi.useFakeTimers();
    const durations: number[] = [];
    (Element.prototype as any).animate = vi.fn((_k: any, o: any) => { if (o && typeof o.duration === 'number') durations.push(o.duration); return { cancel() {}, finished: Promise.resolve() }; });
    const normal = grid();
    playFx({ k: 'shot', unit: 'u', target: 't', from: '1,1', to: '5,1', weapon: 'lumeri_scattergun', cat: 'shotgun', hit: true, dmg: 5 } as any);
    let tNormal = 0; for (let t = 0; t < 1000 && !pieces(normal).includes('shell:hull'); t += 10) { vi.advanceTimersByTime(10); tNormal = t; }
    clearFx(); vi.advanceTimersByTime(8000);
    const slowed = grid();
    playFx({ k: 'shot', unit: 'u', target: 't', from: '1,1', to: '5,1', weapon: 'lumeri_scattergun', cat: 'shotgun', hit: true, dmg: 5 } as any, 'cb|x', CUTIN_TEMPO);
    let tSlow = 0; for (let t = 0; t < 1000 && !pieces(slowed).includes('shell:hull'); t += 10) { vi.advanceTimersByTime(10); tSlow = t; }
    expect(tSlow).toBeGreaterThan(tNormal); expect(tSlow).toBeLessThanOrEqual(Math.ceil(tNormal / CUTIN_TEMPO) + 20);
    // every piece is gone in the end (the slowed removals still clean up)
    vi.advanceTimersByTime(8000); expect(slowed.querySelectorAll('[data-fx-piece]').length).toBe(0);
    clearFx(); vi.advanceTimersByTime(8000); delete (Element.prototype as any).animate; vi.useRealTimers();
  });
  it('a bow\'s draw: the loose waits DRAW_MS / 0.85; the draw\'s clip comes off at the slowed apex', () => {
    vi.useFakeTimers();
    (Element.prototype as any).animate = vi.fn(() => ({ cancel() {}, finished: Promise.resolve() }));
    const spy = vi.spyOn(sfxMod, 'sfx').mockImplementation(() => {});
    const layer = grid();
    playFx({ k: 'shot', unit: 'u', target: 't', from: '1,1', to: '5,1', weapon: 'longbow', cat: 'bow', hit: true, dmg: 5 } as any, 'cb|x', CUTIN_TEMPO);
    const box = () => layer.querySelector('[data-fx="brass"]') as HTMLElement | null;
    expect(box()!.style.clipPath).not.toBe('none');
    vi.advanceTimersByTime(DRAW_MS * 0.5 + 5); expect(box()!.style.clipPath).not.toBe('none'); // the normal apex: not yet
    vi.advanceTimersByTime(DRAW_MS * 0.5 / CUTIN_TEMPO - DRAW_MS * 0.5 + 10); expect(box()!.style.clipPath).toBe('none');
    const swish = () => spy.mock.calls.filter((c) => c[0] === 'swish').length;
    expect(swish()).toBe(1);
    vi.advanceTimersByTime(DRAW_MS / CUTIN_TEMPO - DRAW_MS * 0.5 / CUTIN_TEMPO - 30); expect(swish()).toBe(1); // DRAW_MS has passed: still drawing
    vi.advanceTimersByTime(60); expect(swish()).toBe(2); // the loose, at DRAW_MS / 0.85
    spy.mockRestore(); clearFx(); vi.advanceTimersByTime(5000); delete (Element.prototype as any).animate; vi.useRealTimers();
  });
});

describe('the crit strip reads smaller', () => {
  it('a short strip is 22vh (120–220 px), a full one 29vh', async () => {
    const { stackLayout } = await import('./layout');
    expect(stackLayout(1, 1440, 1000, [], true)[0].h).toBe(220); expect(stackLayout(1, 1440, 1000)[0].h).toBe(290);
    expect(stackLayout(1, 1440, 700, [], true)[0].h).toBe(154);
  });
});

describe('the gate and its cut-in keep one pace (review fix: a Fast -> Normal change while the gate waited cut the crit short)', () => {
  beforeEach(() => { clearFx(); resetStage(); setUiPrefs({ cutins: 'all', reduceMotion: false } as any); });
  it('the speed changed behind a backlog: the cut-in plays its whole Normal length and is not cancelled by the cap', async () => {
    const { setCombatSpeed, setInBattle, combatTempo, battlePace } = await import('../combatSpeed');
    const { cutInUntil } = await import('./index');
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] });
    try {
      setCombatSpeed('fast');
      const { g, a } = room(); setContext({ ...g, combat: { units: [] } } as any, 'combat'); expect(battlePace()).toBe(1);
      // a backlog: a run of hits already queued, so the crit's gate closes later than now
      queueFx(Array.from({ length: 6 }, (_, i) => ({ n: 1 + i, k: 'hurt', unit: 'e1', amount: 3 })) as any, 'cb|crit');
      queueFx([{ n: 10, k: 'shot', unit: 'u1', target: 'e1', from: '1,1', to: '5,1', weapon: 'service_pistol', cat: 'pistol', hit: true, crit: true, dmg: 30 }, crit(12, a, { from: 10 })] as any, 'cb|crit');
      expect(cutInActive()).toBe(false);
      setCombatSpeed('normal'); // the cog, while the gate waits
      let t = 0; while (!cutInActive() && t < 20000) { vi.advanceTimersByTime(20); t += 20; }
      expect(cutInActive()).toBe(true);
      const ms = cutInNow()!.ms, log = (window as any).__phcCutins as any[], id = cutInNow()!.id;
      expect(ms).toBeCloseTo(2240 * combatTempo('normal'), 0);
      // still on just before its own end (the old cap, 2500 × the Fast pace, would have cleared it)
      vi.advanceTimersByTime(ms - 60); expect(cutInActive()).toBe(true); expect(cutInUntil()).toBeGreaterThan(0);
      vi.advanceTimersByTime(200); expect(cutInActive()).toBe(false);
      const l = [...log].reverse().find((x) => x.id === id); expect(l.skipped).toBe(false); expect(l.end - l.at).toBeGreaterThanOrEqual(ms - 20);
    } finally { clearFx(); setInBattle(false); setCombatSpeed('fast'); vi.useRealTimers(); }
  });
});
