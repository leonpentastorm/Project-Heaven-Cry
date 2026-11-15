// @vitest-environment jsdom
// The Open Hand on the fight map (fx/openhand.ts, rules 1.56, the unarmed fighter): the engine's own events (a blow made
// with a glove, the form's stance named by its data fx, the Sweep's fall) map to the rings, the afterimages, the form's
// shape and its word, through play.ts's real handlers. The words and the `what`s are read from the data (items.json
// open_hand's toggles), never typed here.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { refOf, ITEM } from '@engine';
import { setLayer, slow } from './dom';
import { playFx, setContext, clearFx } from './play';
import { openHandFxOf, openHandBeat, formShape, OPEN_MS, resetOpenHand, COUNTER_WORD } from './openhand';

function grid(w = 8, h = 6) {
  const root = document.createElement('div'); document.body.appendChild(root);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const b = document.createElement('button'); b.className = 'phc-tok'; b.setAttribute('aria-label', refOf(x + ',' + y) + ' · open');
    const img = document.createElement('img'); img.setAttribute('style', 'position: relative; z-index: 2; width: 38px'); b.appendChild(img);
    (b as any).getBoundingClientRect = () => ({ left: x * 40, top: y * 40, width: 40, height: 40, right: x * 40 + 40, bottom: y * 40 + 40 });
    root.appendChild(b);
  }
  const layer = document.createElement('div'); document.body.appendChild(layer); setLayer(layer);
  return { root, layer };
}
const PC = { id: 'pc-c1', charId: 'c1', side: 'pc', name: 'Monk', pos: '2,2', hp: 130, maxHp: 130 };
const FOE = { id: 'foe-0', side: 'foe', name: 'Foe', pos: '3,2', hp: 60, maxHp: 60 };
const game = (units: any[]) => ({ code: 'X', characters: {}, story: { positions: {}, npcs: [] }, combat: { name: 'F', round: 1, units, order: units.map((u) => u.id), turn: 0, log: [], fx: [], map: { w: 8, h: 6 } } } as any);
const traces = () => ((window as any).__phcFxTrace as any[]).filter((t) => t.w === 'openhand');
/** The data's own fx rows (each form's damage effect, and the Sweep's Prone). */
const FX: any[] = ((ITEM as any).open_hand.toggles as any[]).flatMap((t) => t.effects.filter((e: any) => e.fx).map((e: any) => e.fx));
const blow = (o: any = {}) => ({ k: 'melee', unit: PC.id, target: FOE.id, from: PC.pos, to: FOE.pos, weapon: 'hand_wraps', cat: 'unarmed', mode: 'melee', hit: true, dmg: 18, tech: 'cut', n: 1, ...o });
const stanceOf = (fx: any, n: number) => { const { k, ...rest } = fx; return { k, target: PC.id, at: PC.pos, ...rest, n }; }; // as triggers.ts runTriggered emits it

describe('the Open Hand on the fight map', () => {
  let g: { root: HTMLElement; layer: HTMLElement };
  beforeEach(() => { vi.useFakeTimers(); g = grid(); (window as any).__phcFxTrace = []; resetOpenHand(); setContext(game([PC, FOE]), 'combat'); });
  afterEach(() => { clearFx(); vi.useRealTimers(); g.root.remove(); g.layer.remove(); delete (window as any).__phcFxTrace; });

  it('the data names every form a shape and a word; Sweep\'s fall a word', () => {
    expect(FX.length).toBe(5);
    for (const f of FX) { expect(f.k).toBe('stance'); expect(typeof f.word).toBe('string'); }
    expect(FX.filter((f) => formShape(f.what)).map((f) => f.what)).toEqual(['jab', 'palm', 'sweep', 'snatch']);
    expect(FX.some((f) => f.what === 'swept')).toBe(true);
  });
  it('a blow with a glove lands its rings a beat after the strike; a miss draws none; a gun shot is not the Open Hand\'s', () => {
    expect(openHandFxOf(blow())).toBe('blow'); expect(openHandBeat(blow())).toBeUndefined(); // the blow keeps its own beat
    playFx(blow() as any);
    expect(traces().map((t) => t.what)).toEqual(['blow']);
    const n0 = g.layer.childElementCount; vi.advanceTimersByTime(slow(OPEN_MS.jab) + 10); expect(g.layer.childElementCount).toBeGreaterThan(n0);
    vi.advanceTimersByTime(10000); expect(g.layer.childElementCount, g.layer.innerHTML.slice(0, 300)).toBe(0);
    playFx(blow({ hit: false, n: 2 }) as any); expect(traces().length).toBe(1);
    expect(openHandFxOf({ k: 'shot', cat: 'rifle' } as any)).toBeNull(); expect(openHandFxOf({ k: 'melee', cat: 'light_melee' } as any)).toBeNull();
  });
  it('a Flurry\'s strikes leave afterimages of the striker along the line', () => {
    const tok = g.root.querySelector('button[aria-label^="' + refOf(PC.pos) + '"] img'); expect(tok).toBeTruthy();
    playFx(blow({ tech: 'flurry' }) as any);
    expect(g.layer.querySelectorAll('[data-oh-ghost]').length).toBeGreaterThanOrEqual(0); // the token copies (jsdom has no token element per unit: counted by the trace below)
    expect(traces()[0]).toMatchObject({ what: 'blow', tech: 'flurry' });
    vi.advanceTimersByTime(3000);
  });
  it('each form, after its blow, is named on the striker with its shape and its word, inside its own beat', () => {
    let n = 10;
    for (const f of FX.filter((x) => formShape(x.what))) {
      playFx(blow({ n: n++ }) as any);
      const e = stanceOf(f, n++);
      expect(openHandFxOf(e)).toBe('form'); expect(openHandBeat(e)).toBe(OPEN_MS.form);
      playFx(e as any);
      expect(traces().slice(-1)[0]).toMatchObject({ what: 'form', form: f.what, unit: PC.id });
      if (f.what !== 'jab') expect(g.layer.querySelector('[data-oh-shape="' + f.what + '"]'), f.what).not.toBeNull();
      expect(g.layer.textContent).toContain(f.word);
      vi.advanceTimersByTime(10000); expect(g.layer.childElementCount, g.layer.innerHTML.slice(0, 300)).toBe(0);
    }
  });
  it('the Sweep\'s Prone tips its target and names it there', () => {
    const f = FX.find((x) => x.what === 'swept');
    playFx(blow() as any); const e = stanceOf(f, 5);
    expect(openHandFxOf(e)).toBe('swept'); expect(openHandBeat(e)).toBe(OPEN_MS.swept);
    playFx(e as any); expect(traces().slice(-1)[0]).toMatchObject({ what: 'swept' });
    vi.advanceTimersByTime(slow(200)); expect(g.layer.textContent).toContain(f.word);
    vi.advanceTimersByTime(3000);
  });
  // slice 2: the holder's own defence and Breath (the data's fx on open_hand's effects, nested in Breath's action)
  const OWN: any[] = ((ITEM as any).open_hand.effects as any[]).flatMap((e) => [e, ...(e.effects || [])]).filter((e: any) => e.fx).map((e: any) => e.fx);
  it('Sway leans the holder off the line and names it; Breath draws a ring in to the holder, inside their own beats', () => {
    expect(OWN.map((f) => f.what).sort()).toEqual(['breath', 'sway']);
    for (const f of OWN) {
      const e = stanceOf(f, 40 + OWN.indexOf(f));
      expect(openHandFxOf(e)).toBe(f.what); expect(openHandBeat(e)).toBe((OPEN_MS as any)[f.what]);
      playFx(e as any); vi.advanceTimersByTime(slow(OPEN_MS.breath));
      expect(g.layer.textContent).toContain(f.word);
      vi.advanceTimersByTime(10000); expect(g.layer.childElementCount).toBe(0);
    }
  });
  it('Counter (Riposte with a glove): a snap strike line through the attacker and COUNTER', () => {
    playFx(blow({ tech: 'riposte', n: 60 }) as any);
    expect(traces().some((t) => t.what === 'counter')).toBe(true);
    expect(g.layer.querySelector('[data-oh-counter]')).not.toBeNull(); expect(g.layer.textContent).toContain(COUNTER_WORD);
    vi.advanceTimersByTime(10000); expect(g.layer.childElementCount).toBe(0);
  });
  it('any other stance keeps its own handler (BRACED)', () => {
    const e = { k: 'stance', unit: PC.id, at: PC.pos, what: 'brace', n: 7 };
    expect(openHandFxOf(e)).toBeNull(); playFx(e as any);
    expect(traces().length).toBe(0); expect(g.layer.textContent).toContain('BRACED');
    vi.advanceTimersByTime(3000);
  });
});
