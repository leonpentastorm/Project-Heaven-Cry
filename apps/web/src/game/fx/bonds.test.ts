// @vitest-environment jsdom
// Bonds and Tending on the fight map (fx/bonds.ts; 0.28.3, Leon: "bond have the same problem as visualizer, no effect,
// no animation"). The engine's own events map to the moments, through play.ts's real handlers: the condition that is a
// tie kind's mark is the TIE (the Bonder's wind-up first, the thread, then the standing line drawn in and the plain word),
// resisted it is a REACH that frays; a heal by a Bonder to its Bonded unit is a pulse down the line before the plain heal;
// a shove between two of one side is a GUIDE; a tie gone from the view between two states is a BREAK. The kind, its mark
// and its ink come from data/rules.json (ties.kinds).
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { refOf, tieKinds } from '@engine';
import { setLayer, slow } from './dom';
import { playFx, setContext, clearFx } from './play';
import { bondFxOf, bondExtraBeat, goneTies, BOND_MS } from './bonds';

const KIND: any = tieKinds().find((k) => k.mark && k.line?.ink); // the Bond (the one kind that draws a line today)
function grid(w = 10, h = 6) {
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
const MED = { id: 'pc-c1', charId: 'c1', side: 'pc', name: 'Medic', pos: '1,1', hp: 100, maxHp: 100 };
const GUN = { id: 'pc-c2', charId: 'c2', side: 'pc', name: 'Gun', pos: '1,3', hp: 40, maxHp: 100 };
const FOE = { id: 'foe-0', side: 'foe', name: 'Soldier', pos: '5,1', hp: 60, maxHp: 60 };
const tie = (to: string) => ({ kind: KIND.id, from: MED.id, to });
const game = (ties: any[], units: any[] = [MED, GUN, FOE]) => ({ code: 'X', characters: {}, story: { positions: {}, npcs: [] }, combat: { name: 'F', round: 1, units, order: units.map((u) => u.id), turn: 0, log: [], fx: [], ties, map: { w: 10, h: 6 } } } as any);
const LINE = (to: any, side: 'ally' | 'foe') => ({ key: KIND.id + ':' + MED.id + ':' + to.id, kind: KIND.id, from: MED.id, to: to.id, fromPos: MED.pos, toPos: to.pos, side, ink: KIND.line.ink, dash: side === 'foe' ? String(KIND.line.foe_dash || '') : '' });
const traces = () => ((window as any).__phcFxTrace as any[]).filter((t) => t.w === 'bond').map((t) => t.what);
const floats = () => ((window as any).__phcFxTrace as any[]).filter((t) => t.w === 'float').map((t) => t.text);

describe('the mapping (bondFxOf), per event', () => {
  const lines = [LINE(GUN, 'ally'), LINE(FOE, 'foe')];
  it('the mark of a tie kind with a line: a TIE from its Bonder (ally and enemy), in the kind\'s ink', () => {
    expect(bondFxOf({ k: 'cond', id: KIND.mark, target: GUN.id }, lines, MED.id)).toEqual({ what: 'tie', from: MED.id, to: GUN.id, ink: KIND.line.ink, side: 'ally' });
    expect(bondFxOf({ k: 'cond', id: KIND.mark, target: FOE.id }, lines, MED.id)).toMatchObject({ what: 'tie', from: MED.id, side: 'foe' });
  });
  it('resisted: a REACH from the acting unit; another condition: nothing of ours', () => {
    expect(bondFxOf({ k: 'cond', id: KIND.mark, target: FOE.id, resisted: true }, [], MED.id)).toMatchObject({ what: 'reach', from: MED.id, to: FOE.id });
    expect(bondFxOf({ k: 'cond', id: 'stunned', target: FOE.id }, lines, MED.id)).toBeNull();
  });
  it('a heal by the Bonder to its Bonded ally: a HEAL down the line; to an un-Bonded unit, or to itself (Mend Yourself): the plain heal', () => {
    expect(bondFxOf({ k: 'heal', target: GUN.id, amount: 12 }, lines, MED.id)).toMatchObject({ what: 'heal', from: MED.id, to: GUN.id });
    expect(bondFxOf({ k: 'heal', target: GUN.id, amount: 12 }, [], MED.id)).toBeNull();
    expect(bondFxOf({ k: 'heal', target: MED.id, amount: 12 }, lines, MED.id)).toBeNull();
  });
  it('a shove between two of one side (Guide) is a GUIDE; a shove of an enemy is not', () => {
    const side = (id: string) => [MED, GUN, FOE].find((u) => u.id === id)?.side || null;
    expect(bondFxOf({ k: 'shove', unit: MED.id, target: GUN.id, from: '1,3', to: '2,3', ok: true }, [], MED.id, side)).toMatchObject({ what: 'guide', from: MED.id, to: GUN.id });
    expect(bondFxOf({ k: 'shove', unit: MED.id, target: FOE.id, from: '5,1', to: '6,1', ok: true }, [], MED.id, side)).toBeNull();
  });
  it('a tie gone from the view while both ends are still in it is a BREAK; one whose far end left the view (fog) is not', () => {
    expect(goneTies(lines, [lines[0]], [MED, GUN, FOE])).toEqual([lines[1]]);
    expect(goneTies(lines, [lines[0]], [MED, GUN])).toEqual([]);
  });
});

describe('the moments, through play.ts\'s handlers', () => {
  let g: { root: HTMLElement; layer: HTMLElement };
  beforeEach(() => { vi.useFakeTimers(); g = grid(); (window as any).__phcFxTrace = []; });
  afterEach(() => { clearFx(); vi.useRealTimers(); g.root.remove(); g.layer.remove(); delete (window as any).__phcFxTrace; });

  it('TIE: the Bonder\'s wind-up and thread first, then the line draws in and the word (the plain cond) after the thread', () => {
    setContext(game([tie(GUN.id)]), 'combat');
    const e = { k: 'cond', id: KIND.mark, target: GUN.id, at: GUN.pos, n: 1 };
    expect(bondExtraBeat(bondFxOf(e, [LINE(GUN, 'ally')], MED.id))).toBe(BOND_MS.cast + BOND_MS.travel);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('data-tie-layer', '1');
    const l = document.createElementNS('http://www.w3.org/2000/svg', 'line'); l.setAttribute('data-tie-from', MED.id); l.setAttribute('data-tie-to', GUN.id); l.setAttribute('x1', '10'); l.setAttribute('y1', '10'); svg.appendChild(l); document.body.appendChild(svg);
    const before = g.layer.childElementCount;
    playFx(e as any);
    expect(traces()).toEqual(['tie']); expect(g.layer.childElementCount).toBeGreaterThan(before); // the wind-up at once
    expect(floats()).toEqual([]); // the word waits for the thread
    vi.advanceTimersByTime(slow(BOND_MS.cast + BOND_MS.travel) + 20);
    expect(traces()).toEqual(['tie', 'line-in']);
    vi.advanceTimersByTime(400); expect(floats().length).toBe(1);
    vi.advanceTimersByTime(3000); expect(g.layer.childElementCount).toBe(0);
    svg.remove();
  });
  it('HEAL down a Bond: the pulse, then the plain heal\'s one +N', () => {
    setContext(game([tie(GUN.id)]), 'combat');
    playFx({ k: 'heal', target: GUN.id, at: GUN.pos, amount: 14, n: 2 } as any);
    expect(traces()).toEqual(['heal']); expect(floats()).toEqual([]);
    vi.advanceTimersByTime(slow(BOND_MS.pulse) + 20);
    expect(floats().filter((t) => /\+14/.test(String(t))).length).toBe(1);
  });
  it('BREAK: a tie gone between two views of the fight parts on the map, with its word', () => {
    setContext(game([tie(GUN.id), tie(FOE.id)]), 'combat');
    setContext(game([tie(GUN.id)]), 'combat');
    vi.advanceTimersByTime(50);
    expect(traces()).toEqual(['break']);
    vi.advanceTimersByTime(400);
    expect(floats()).toEqual([KIND.id.toUpperCase() + ' BROKEN']);
  });
  it('rules 1.72 item 5701: the engine stance untie (Let go) plays the BREAK from the event, and the view does not play it again', () => {
    setContext(game([tie(GUN.id)]), 'combat');
    const ev = { k: 'stance', what: 'untie', unit: MED.id, target: GUN.id, how: KIND.id, at: MED.pos, n: 3 };
    playFx(ev as any);
    expect(traces()).toEqual(['break']);
    const after = game([]); after.combat.fx = [ev]; setContext(after, 'combat'); // the next view: the tie is gone, the event names it
    vi.advanceTimersByTime(500);
    expect(traces()).toEqual(['break']); expect(floats()).toEqual([KIND.id.toUpperCase() + ' BROKEN']);
  });
});

describe('0.32: Tending down a Bond that is not a heal', () => {
  it('a shield (boon) or a condition the Bonder puts on its Bonded ally is a TEND down the line; on an enemy Bond, or resisted, it is not', () => {
    const lines = [LINE(GUN, 'ally'), LINE(FOE, 'foe')];
    expect(bondFxOf({ k: 'boon', word: 'ward', target: GUN.id, amount: 30 } as any, lines, MED.id)).toMatchObject({ what: 'tend', from: MED.id, to: GUN.id });
    expect(bondFxOf({ k: 'cond', id: 'settled', target: GUN.id } as any, lines, MED.id)).toMatchObject({ what: 'tend' });
    expect(bondFxOf({ k: 'cond', id: 'settled', target: GUN.id, resisted: true } as any, lines, MED.id)).toBeNull();
    expect(bondFxOf({ k: 'boon', word: 'ward', target: FOE.id } as any, lines, MED.id)).toBeNull();
  });
});
