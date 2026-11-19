// @vitest-environment jsdom
// Figments on the fight map (fx/figments.ts): the engine's own events (spawn, an attack by a Figment, unmake) map to the
// summon (the caster first, a thread, then the forming), the act (the command, then the attack with its trail) and the
// unmaking, through play.ts's real handlers; which kind it is comes from its row in data/figments.json.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { refOf, FORM } from '@engine';
import { setLayer, slow } from './dom';
import { playFx, setContext, clearFx } from './play';
import { figmentFxOf, figmentBeat, figmentExtraBeat, figLook, figMarkSvg, FIG_MS, resetFigments } from './figments';

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
const FORM_ID = Object.keys(FORM).find((k) => (FORM as any)[k].weapon !== 'fists') || Object.keys(FORM)[0]; // a form that strikes, from the data
const PC = { id: 'pc-c1', charId: 'c1', side: 'pc', name: 'Rigger', pos: '1,1', hp: 100, maxHp: 100 };
const FIG = { id: 'ow-pc-c1-' + FORM_ID + '-1', side: 'pc', ctrl: 'c1', name: (FORM as any)[FORM_ID].name, pos: '3,1', hp: 40, maxHp: 40, companion: FORM_ID, owned: { kind: 'figment' }, figment: { form: FORM_ID } };
const FOE = { id: 'foe-0', side: 'foe', name: 'Foe', pos: '4,1', hp: 60, maxHp: 60 };
const game = (units: any[]) => ({ code: 'X', characters: {}, story: { positions: {}, npcs: [] }, combat: { name: 'F', round: 1, units, order: units.map((u) => u.id), turn: 0, log: [], fx: [], map: { w: 8, h: 6 } } } as any);
const traces = () => ((window as any).__phcFxTrace as any[]).filter((t) => t.w === 'figment').map((t) => t.what);

describe('figments on the fight map', () => {
  let g: { root: HTMLElement; layer: HTMLElement };
  beforeEach(() => { vi.useFakeTimers(); g = grid(); (window as any).__phcFxTrace = []; resetFigments(); });
  afterEach(() => { clearFx(); vi.useRealTimers(); g.root.remove(); g.layer.remove(); delete (window as any).__phcFxTrace; });

  it('the kind comes from its row: every form in data/figments.json has a look (its name and glyph); a block that is no Figment has none', () => {
    for (const [id, f] of Object.entries(FORM as Record<string, any>)) expect(figLook(id)).toEqual({ name: f.name, glyph: f.glyph || '◇', icon: f.icon || '' });
    expect(figLook('scrap_turret')).toBeNull(); expect(figLook(null)).toBeNull();
  });
  it('summon: the spawn event plays the caster wind-up, the thread and then the forming, in that order, inside its beat', () => {
    setContext(game([PC, FIG, FOE]), 'combat');
    const e = { k: 'spawn', unit: FIG.id, at: FIG.pos, owner: PC.id, block: FORM_ID, n: 1 };
    expect(figmentFxOf(e)).toBe('summon');
    expect(figmentBeat(e)).toBe(FIG_MS.cast + FIG_MS.travel + FIG_MS.form);
    const before = g.layer.childElementCount;
    playFx(e as any);
    expect(traces()).toEqual(['summon']); // the caster's wind-up is drawn at once…
    expect(g.layer.childElementCount).toBeGreaterThan(before);
    vi.advanceTimersByTime(slow(FIG_MS.cast + FIG_MS.travel) - 20); expect(traces()).toEqual(['summon']); // …the thread travels…
    vi.advanceTimersByTime(60); expect(traces()).toEqual(['summon', 'formed']); // …then it forms
    vi.advanceTimersByTime(3000); expect(g.layer.childElementCount).toBe(0); // and leaves nothing behind
  });
  it('act: a Figment\'s attack is commanded first, then struck (lunge, hit) with its trail; an attack by anyone else is untouched', () => {
    setContext(game([PC, FIG, FOE]), 'combat');
    const hit = { k: 'melee', unit: FIG.id, target: FOE.id, from: FIG.pos, to: FOE.pos, weapon: (FORM as any)[FORM_ID].weapon, cat: 'unarmed', mode: 'melee', hit: true, dmg: 20, n: 2 };
    expect(figmentFxOf(hit)).toBe('act'); expect(figmentExtraBeat(hit)).toBe(FIG_MS.command);
    playFx(hit as any);
    expect(traces()).toEqual(['command']);
    vi.advanceTimersByTime(slow(FIG_MS.command) + 10); expect(traces()).toEqual(['command', 'act']);
    const sw = ((window as any).__phcFxTrace as any[]).filter((t) => t.w === 'swing'); expect(sw.length).toBe(1); // the ordinary strike played
    const other = { ...hit, unit: PC.id, from: PC.pos, n: 3 }; expect(figmentFxOf(other)).toBeNull(); expect(figmentExtraBeat(other)).toBe(0);
    vi.advanceTimersByTime(3000);
  });
  it("the forming draws the form's own line icon (its row's `icon`), not a text glyph", () => {
    setContext(game([PC, FIG, FOE]), 'combat');
    playFx({ k: 'spawn', unit: FIG.id, at: FIG.pos, owner: PC.id, block: FORM_ID, n: 11 } as any);
    vi.advanceTimersByTime(slow(FIG_MS.cast + FIG_MS.travel) + 40);
    const mark = g.layer.querySelector('[data-fig-mark]') as HTMLElement;
    expect(mark.getAttribute('data-fig-mark')).toBe((FORM as any)[FORM_ID].icon); expect(mark.querySelector('path')).not.toBeNull(); expect(mark.querySelector('text')).toBeNull();
    expect(figMarkSvg({ icon: (FORM as any)[FORM_ID].icon, glyph: 'x' })).not.toContain('currentColor');
    vi.advanceTimersByTime(3000);
  });
  it('a walk it is ordered on is a command too (and the strike right after it is not commanded twice)', () => {
    setContext(game([PC, FIG, FOE]), 'combat');
    const mv = { k: 'move', unit: FIG.id, from: '3,1', to: '3,2', path: ['3,1', '3,2'], how: 'move', n: 4 };
    expect(figmentFxOf(mv)).toBe('command');
    playFx(mv as any); playFx({ k: 'melee', unit: FIG.id, target: FOE.id, from: '3,2', to: FOE.pos, cat: 'unarmed', hit: false, n: 5 } as any);
    vi.advanceTimersByTime(10); expect(traces()).toEqual(['command', 'act']); // no second command: the strike plays at once
    vi.advanceTimersByTime(3000);
  });
  it('unmake: a Figment gone from the board comes apart where it stood (known from the fight it was in); another owned unit just fades', () => {
    setContext(game([PC, FIG, FOE]), 'combat');
    setContext(game([PC, FOE]), 'combat'); // let go: the next state has no Figment
    const e = { k: 'unmake', unit: FIG.id, at: FIG.pos, n: 6 };
    expect(figmentFxOf(e)).toBe('unmake'); expect(figmentBeat(e)).toBe(FIG_MS.unmake);
    playFx(e as any); expect(traces()).toEqual(['unmake']);
    const t = { k: 'unmake', unit: 'ow-pc-c1-turret-2', at: '5,5', n: 7 }; expect(figmentFxOf(t)).toBeNull();
    playFx(t as any); expect(traces()).toEqual(['unmake']);
    vi.advanceTimersByTime(3000); expect(g.layer.childElementCount).toBe(0);
  });
});

// 0.32 effects lane: an order from data (figments.json verbs' fx) and a Figment's ordered move.
import { figmentBatch } from './figments';
import FJ032 from '../../../../../data/figments.json';
describe('0.32: Figment orders from data', () => {
  it('every order row that runs ops says what it did and names a figment_* stance (so the order link and the word show)', () => {
    for (const v of (FJ032 as any).verbs) {
      if (!v.effects?.length) continue;
      const first = v.effects[0];
      expect(typeof first.say, v.id).toBe('string');
      expect(first.fx?.k, v.id).toBe('stance'); expect(String(first.fx?.what), v.id).toMatch(/^figment_/); expect(first.fx?.word, v.id).toBeTruthy();
    }
  });
  it('figmentBatch marks a shove of a Figment with the row\'s move (blink, step); a plain shove stays a shove', () => {
    const evs: any[] = [{ k: 'shove', target: 'f1', from: '1,1', to: '3,1', ok: true }, { k: 'stance', target: 'f1', what: 'figment_blink' }, { k: 'shove', target: 'foe', from: '4,1', to: '5,1', ok: true }];
    figmentBatch(evs); expect(evs[0]._how).toBe('figment_blink'); expect(evs[2]._how).toBeUndefined();
  });
});
