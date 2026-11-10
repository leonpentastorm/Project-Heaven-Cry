// @vitest-environment jsdom
// The melee technique effects (fx/melee-techniques.ts; docs/design/handoffs/physical-2.0-A-FX.md): each beat the engine
// emits draws its own element, nothing for a tile in the fog, durations follow the combat speed, reduced motion moves
// nothing, the beats stay inside the budget, a multi-strike technique's later strikes play quick, and the standing marks
// follow the saved state.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { refOf } from '@engine';
import { setLayer, centre, resetFloats } from './dom';
import * as sfxMod from '../sfx';
import { setCombatSpeed, setInBattle } from '../combatSpeed';
import { meleeTechHandlers, meleeTechBeat, quickStrikes, leadMoves, meleePrepass, meleeMarksOf, syncMeleeMarks, clearMeleeMarks, meleeMarkCount, MELEE_BEAT_NORMAL, MELEE_BEAT_MAX, type MeleeKit } from './melee-techniques';
import { physBeat } from './physical';

function grid(w = 12, h = 10) {
  document.body.innerHTML = ''; resetFloats(); // a float of the same word from an earlier test is not "the same news"
  const root = document.createElement('div'); root.id = 'root'; const scr = document.createElement('div'); root.appendChild(scr); document.body.appendChild(root);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const b = document.createElement('button'); b.className = 'phc-tok'; b.setAttribute('aria-label', refOf(x + ',' + y) + ' · open');
    const img = document.createElement('img'); img.setAttribute('style', 'position: relative; z-index: 2; width: 38px'); b.appendChild(img);
    (b as any).getBoundingClientRect = () => ({ left: x * 40, top: y * 40, width: 40, height: 40, right: x * 40 + 40, bottom: y * 40 + 40 });
    scr.appendChild(b);
  }
  const layer = document.createElement('div'); document.body.appendChild(layer); setLayer(layer);
  return layer;
}
/** Every Web Animation started (jsdom has none): its frames and its duration. */
let anims: { frames: Keyframe[]; duration: number }[] = [];
function fakeAnimate() {
  anims = [];
  const f = function (this: Element, frames: Keyframe[], o: KeyframeAnimationOptions) { anims.push({ frames, duration: Number(o?.duration) || 0 }); return { cancel() {}, finish() {}, onfinish: null } as any; };
  (HTMLElement.prototype as any).animate = f; (SVGElement.prototype as any).animate = f;
}
const UNITS: Record<string, { pos: string; side: string }> = { me: { pos: '2,5', side: 'pc' }, ally: { pos: '3,4', side: 'pc' }, foe: { pos: '3,5', side: 'foe' }, foe2: { pos: '3,6', side: 'foe' }, far: { pos: '7,5', side: 'foe' } };
function kit(fog: Set<string> = new Set(), saw = true): MeleeKit {
  return {
    at: (k) => (!k || fog.has(k) ? null : centre(k)), tokOf: () => null, posOf: (id) => (id ? UNITS[id]?.pos : undefined), sideOf: (id) => (id ? UNITS[id]?.side : undefined),
    play: () => {}, sawThen: () => saw,
  };
}
/** One example event per beat (what the engine's handlers emit). */
const EX: Record<string, any> = {
  arc: { id: 'sweep', beat: 'arc', unit: 'me', at: '2,5', tiles: ['3,4', '3,5', '3,6'], struck: ['ally', 'foe', 'foe2'], dir: [1, 0] },
  cleave: { id: 'cleave', beat: 'arc', cleave: true, unit: 'me', at: '2,5', tiles: ['3,5', '3,6'], struck: ['foe', 'foe2'] },
  throw: { id: 'throw', beat: 'throw', unit: 'me', at: '2,5', from: '2,5', to: '7,5', target: 'far', weapon: 'combat_knife' },
  bind: { id: 'bind', beat: 'bind', unit: 'me', at: '2,5', target: 'foe', to: '3,5', kind: 'bind', pen: 2 },
  slam: { id: 'throw_down', beat: 'slam', unit: 'me', at: '2,5', target: 'foe', from: '3,5', path: ['3,5', '2,4'], land: '2,4', occupant: null, prone: true },
  force: { id: 'shove', beat: 'force', unit: 'me', at: '2,5', target: 'foe', path: ['3,5', '4,5', '5,5'], how: 'push' },
  fall: { id: 'trip', beat: 'fall', unit: 'me', at: '2,5', target: 'foe', to: '3,5' },
  parry: { id: 'parry', beat: 'parry', unit: 'me', at: '2,5', from: '3,5', to: '2,5', attacker: 'foe', ally: null, won: true },
  pin: { id: 'run_through', beat: 'pin', unit: 'me', at: '2,5', target: 'foe', to: '3,5', line: ['2,5', '3,5'], weapon: 'lance', behind: null },
  feint: { id: 'feint', beat: 'feint', unit: 'me', at: '2,5', target: 'foe', to: '3,5', ok: true },
  guard: { id: 'guard', beat: 'guard', unit: 'me', at: '2,5', front: [1, 0], reach: true, heavy: true },
  sidestep: { id: 'sidestep', beat: 'sidestep', unit: 'me', at: '2,6', from: '2,5', to: '2,6', foe: 'foe' },
  halt: { id: 'keep_back', beat: 'halt', unit: 'me', at: '2,5', target: 'foe', to: '3,5', reach: 1 },
  thrust: { id: 'half_sword', beat: 'thrust', unit: 'me', at: '2,5', target: 'foe', to: '3,5', point: false },
  sunder: { id: 'sunder', beat: 'sunder', unit: 'me', at: '2,5', target: 'foe', to: '3,5', was: 12, now: 2, broken: false },
  flurry: { id: 'flurry', beat: 'flurry', unit: 'me', at: '2,5', targets: ['foe'], tiles: ['3,5'], strikes: 3, thrown: false, weapon: 'sabre' },
  draw: { id: 'draw_cut', beat: 'draw', unit: 'me', at: '2,5', target: 'foe', to: '3,5', weapon: 'sabre' },
  ambush: { id: 'ambush', beat: 'ambush', unit: 'me', at: '2,5', target: 'foe', to: '3,5', fromHidden: true, bare: false },
  break: { id: 'break', beat: 'break', unit: 'me', at: '2,5', target: 'foe', to: '3,5', stun: 'stunned', armour: true, disarm: false },
  charge: { id: 'charge', beat: 'charge', unit: 'me', at: '6,5', route: ['2,5', '3,5', '4,5', '5,5', '6,5'], tiles: 4, target: 'far' },
};
const fxEls = (layer: HTMLElement) => Array.from(layer.querySelectorAll('[data-melee-fx]')).map((x) => x.getAttribute('data-melee-fx'));

beforeEach(() => { vi.useFakeTimers(); fakeAnimate(); (window as any).__phcMeleeFx = []; setInBattle(false); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); clearMeleeMarks(); });

describe('the beats (pure)', () => {
  it('every beat is in the table, stored at Fast (× 0.85), and none is longer than one short beat', () => {
    for (const [k, ms] of Object.entries(MELEE_BEAT_NORMAL)) {
      const e = k === 'cleave' ? { k: 'melee_fx', beat: 'arc', cleave: true } : { k: 'melee_fx', beat: k };
      expect(meleeTechBeat(e), k).toBe(Math.round(ms * 0.85)); expect(ms).toBeLessThanOrEqual(MELEE_BEAT_MAX);
    }
    expect(meleeTechBeat({ k: 'melee_fx', beat: 'slam', refused: true } as any)).toBe(0);
    expect(meleeTechBeat({ k: 'melee' })).toBeUndefined(); expect(physBeat({ k: 'melee_fx', n: 1 } as any)).toBeUndefined();
  });
  it('quick strikes: after an arc or a Flurry, the later strikes of that use play at the chained beat; the saved events are untouched', () => {
    const evs: any[] = [
      { k: 'technique', n: 1, unit: 'me', id: 'sweep' }, { k: 'melee_fx', n: 2, unit: 'me', beat: 'arc', struck: ['a', 'b', 'c'] },
      { k: 'melee', n: 3, unit: 'me' }, { k: 'hurt', n: 4 }, { k: 'melee', n: 5, unit: 'me' }, { k: 'melee', n: 6, unit: 'other' }, { k: 'melee', n: 7, unit: 'me' },
      { k: 'technique', n: 8, unit: 'me', id: 'cut' }, { k: 'melee', n: 9, unit: 'me' },
    ];
    const q = quickStrikes(evs);
    expect(q.map((e) => !!e._quick)).toEqual([false, false, false, false, true, false, true, false, false]);
    expect(evs.some((e) => e._quick)).toBe(false); expect(q[4]).not.toBe(evs[4]);
    const f: any[] = [{ k: 'melee_fx', n: 1, unit: 'me', beat: 'flurry', strikes: 2 }, { k: 'shot', n: 2, unit: 'me', thrown: true }, { k: 'shot', n: 3, unit: 'me', thrown: true }];
    expect(quickStrikes(f).map((e) => !!e._quick)).toEqual([false, false, true]);
    const plain = [{ k: 'melee', n: 1, unit: 'me' }]; expect(quickStrikes(plain)).toBe(plain); // nothing to change: the same list
  });
});

describe('each technique\'s event draws its effect', () => {
  it('one element for each beat, recorded for the e2e hook', () => {
    const layer = grid(), H = meleeTechHandlers(kit());
    for (const [name, e] of Object.entries(EX)) {
      (window as any).__phcMeleeFx = [];
      H.melee_fx({ k: 'melee_fx', n: 1, ...e } as any); vi.advanceTimersByTime(250);
      expect(fxEls(layer).length, name).toBeGreaterThan(0);
      expect((window as any).__phcMeleeFx.map((r: any) => [r.id, r.kind, r.drawn]), name).toEqual([[e.id, e.beat, true]]);
      vi.advanceTimersByTime(3000); expect(fxEls(layer), name + ' cleans up').toEqual([]);
    }
  });
  it('the right look: an arc over the struck, an HP ring on a struck ally; Throw flies the weapon\'s icon; Bind a link; Parry the word', () => {
    const layer = grid(), H = meleeTechHandlers(kit());
    H.melee_fx({ k: 'melee_fx', n: 1, ...EX.arc } as any);
    expect(fxEls(layer)).toContain('arc'); expect(layer.innerHTML).toContain('#F65157'); // the ally's warning ring
    H.melee_fx({ k: 'melee_fx', n: 2, ...EX.throw } as any);
    const img = layer.querySelector('[data-melee-fx="throw"] img') as HTMLImageElement; expect(img?.src).toMatch(/^data:image\/svg\+xml/);
    H.melee_fx({ k: 'melee_fx', n: 3, ...EX.bind } as any); expect(layer.querySelector('[data-melee-fx="bind"] path')?.getAttribute('stroke')).toBe('#F68A38');
    H.melee_fx({ k: 'melee_fx', n: 4, ...EX.parry } as any); expect(layer.textContent).toContain('PARRIED');
    H.melee_fx({ k: 'melee_fx', n: 5, ...EX.parry, won: false } as any); expect(layer.textContent).toContain('THROUGH');
    H.melee_fx({ k: 'melee_fx', n: 6, ...EX.sunder } as any); expect(layer.textContent).toContain('ARMOUR 12 → 2');
    H.melee_fx({ k: 'melee_fx', n: 7, ...EX.feint, ok: false } as any); expect(layer.textContent).toContain('NOT FOOLED');
  });
  it('nothing in the fog: a beat whose tiles the squad can\'t see draws nothing; a link needs both ends', () => {
    const layer = grid(), all = new Set<string>();
    for (const e of Object.values(EX)) for (const v of Object.values(e)) for (const k of [v].flat()) if (typeof k === 'string' && /^\d+,\d+$/.test(k)) all.add(k);
    const H = meleeTechHandlers(kit(all, false));
    for (const e of Object.values(EX)) H.melee_fx({ k: 'melee_fx', n: 1, ...e } as any);
    vi.advanceTimersByTime(300);
    expect(fxEls(layer)).toEqual([]); expect(layer.querySelectorAll('div').length).toBe(0);
    expect((window as any).__phcMeleeFx.every((r: any) => !r.drawn)).toBe(true);
    const half = meleeTechHandlers(kit(new Set(['3,5'])));
    half.melee_fx({ k: 'melee_fx', n: 2, ...EX.bind } as any); expect(fxEls(layer)).toEqual([]);
  });
  it('the user\'s own part needs the engine\'s seen stamp: an unseen user\'s guard or draw flash shows nothing', () => {
    const layer = grid(), H = meleeTechHandlers(kit(new Set(), false));
    H.melee_fx({ k: 'melee_fx', n: 1, ...EX.guard } as any); H.melee_fx({ k: 'melee_fx', n: 2, ...EX.draw } as any); H.melee_fx({ k: 'melee_fx', n: 3, ...EX.sidestep } as any);
    expect(fxEls(layer)).toEqual([]);
  });
  it('a refused beat plays nothing', () => {
    const layer = grid(); meleeTechHandlers(kit()).melee_fx({ k: 'melee_fx', n: 1, ...EX.throw, refused: true } as any);
    expect(fxEls(layer)).toEqual([]); expect((window as any).__phcMeleeFx).toEqual([]);
  });
});

describe('time and motion', () => {
  const durations = () => { grid(); fakeAnimate(); const H = meleeTechHandlers(kit()); for (const e of Object.values(EX)) H.melee_fx({ k: 'melee_fx', n: 1, ...e } as any); return anims.map((a) => a.duration); };
  it('every duration follows the combat speed (Normal is Fast ÷ 0.85)', () => {
    setInBattle(true); setCombatSpeed('fast'); const fast = durations();
    setCombatSpeed('normal'); const normal = durations();
    expect(fast.length).toBeGreaterThan(20); expect(normal.length).toBe(fast.length);
    normal.forEach((d, i) => expect(d).toBeCloseTo(fast[i] / 0.85, 3));
    setCombatSpeed('fast'); setInBattle(false);
  });
  it('reduced motion: nothing travels, rotates or shakes (opacity only)', () => {
    vi.spyOn(sfxMod, 'reducedMotion').mockReturnValue(true);
    durations();
    const moving = anims.filter((a) => a.frames.some((f) => 'transform' in f || 'translate' in f || 'rotate' in f || 'scale' in f || 'strokeDashoffset' in f));
    expect(moving.map((a) => JSON.stringify(a.frames))).toEqual([]); expect(anims.length).toBeGreaterThan(5);
  });
});

describe('the standing marks', () => {
  const game = (units: any[], extra: any = {}) => ({ combat: { round: 1, turn: 0, order: units.map((u) => u.id), units, ...extra } }) as any;
  it('reads Bind, a grapple, a nailed weapon, a Guard and a Feint mark from the saved state', () => {
    const g = game([
      { id: 'me', side: 'pc', pos: '2,5', tech: { bind: { target: 'foe' }, guard: { on: true, front: [1, 0], heavy: true } } },
      { id: 'foe', side: 'foe', pos: '3,5', nailed: { by: 'me', ap: 2, weapon: 'lance' } },
      { id: 'foe2', side: 'foe', pos: '3,6', conds: { grappled: 1 }, condBy: { grappled: 'me' } },
    ]);
    const kinds = meleeMarksOf(g).map((m) => m.kind).sort();
    expect(kinds).toEqual(['bind', 'grapple', 'guard', 'nailed']);
    expect(meleeMarksOf(g).find((m) => m.kind === 'nailed')).toMatchObject({ weapon: 'lance', ap: 2, a: '3,5' });
  });
  it('a Bind ends when they move apart or one falls; an enemy in the fog shows nothing', () => {
    const g = game([{ id: 'me', side: 'pc', pos: '2,5', tech: { bind: { target: 'foe' } } }, { id: 'foe', side: 'foe', pos: '5,5' }]);
    expect(meleeMarksOf(g)).toEqual([]);
    const h = game([{ id: 'me', side: 'pc', pos: '2,5', tech: { bind: { target: 'foe' } } }, { id: 'foe', side: 'foe', pos: '3,5', dead: true }]);
    expect(meleeMarksOf(h)).toEqual([]);
    const f = game([{ id: 'x', side: 'foe', pos: '3,5', tech: { guard: { on: true, front: [-1, 0] } } }]);
    expect(meleeMarksOf(f, new Set(['2,5']))).toEqual([]); expect(meleeMarksOf(f, new Set(['3,5']))).toHaveLength(1);
    const hid = game([{ id: 'x', side: 'foe', pos: '3,5', hidden: true, nailed: { ap: 2 } }]); expect(meleeMarksOf(hid)).toEqual([]);
  });
  it('sync draws the marks and takes gone ones away (the standing layer is never in the queue)', () => {
    const layer = grid();
    const g = game([{ id: 'me', side: 'pc', pos: '2,5', tech: { bind: { target: 'foe' } } }, { id: 'foe', side: 'foe', pos: '3,5', nailed: { ap: 2, weapon: 'lance' } }]);
    syncMeleeMarks(meleeMarksOf(g));
    expect(meleeMarkCount()).toBe(2);
    expect(layer.querySelectorAll('[data-melee-mark="bind"]').length).toBe(1);
    expect(layer.querySelector('[data-melee-mark="nailed"] image')?.getAttribute('href')).toMatch(/^data:image\/svg\+xml/);
    syncMeleeMarks(meleeMarksOf(game([{ id: 'me', side: 'pc', pos: '2,5' }, { id: 'foe', side: 'foe', pos: '3,5' }])));
    expect(meleeMarkCount()).toBe(0); expect(layer.querySelectorAll('[data-melee-mark]').length).toBe(0);
    expect(layer.querySelectorAll('[data-melee-gone]').length).toBe(2); // fading out
    vi.advanceTimersByTime(2000); expect(layer.querySelectorAll('[data-melee-gone]').length).toBe(0);
  });
});

// Review fixes (docs/design/handoffs/physical-2.0-A-FX.md section 9).
describe('review fixes', () => {
  const game = (units: any[]) => ({ combat: { round: 1, turn: 0, order: units.map((u) => u.id), units } }) as any;
  it('the movement beats play over their moves: a skid before the first shove, a fall before PRONE, a sidestep before its step (beat 0); saved events untouched', () => {
    const evs: any[] = [
      { k: 'technique', n: 1, unit: 'me', id: 'shove' }, { k: 'shove', n: 2, unit: 'me', target: 'foe', ok: true, from: '3,5', to: '4,5' },
      { k: 'shove', n: 3, unit: 'me', target: 'foe', ok: true, from: '4,5', to: '5,5' }, { k: 'momentum', n: 4, unit: 'me' },
      { k: 'melee_fx', n: 5, unit: 'me', beat: 'force', target: 'foe', path: ['3,5', '4,5', '5,5'], how: 'push' },
      { k: 'technique', n: 6, unit: 'me', id: 'trip' }, { k: 'stance', n: 7, unit: 'foe', what: 'prone' }, { k: 'stopped', n: 8, unit: 'foe' },
      { k: 'melee_fx', n: 9, unit: 'me', beat: 'fall', target: 'foe', to: '5,5' },
      { k: 'technique', n: 10, unit: 'me', id: 'sidestep' }, { k: 'move', n: 11, unit: 'me', from: '2,5', to: '2,6' },
      { k: 'melee_fx', n: 12, unit: 'me', beat: 'sidestep', from: '2,5', to: '2,6' },
    ];
    const out = leadMoves(evs);
    expect(out.map((e) => e.n)).toEqual([1, 5, 2, 3, 4, 6, 9, 7, 8, 10, 12, 11]);
    for (const e of out.filter((x) => x.k === 'melee_fx')) { expect(e._early).toBe(true); expect(meleeTechBeat(e)).toBe(0); }
    expect(evs.some((e) => e._early)).toBe(false); expect(evs.map((e) => e.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    // never across a use: a skid whose shoves aren't in its own use stays where it is
    const lone: any[] = [{ k: 'shove', n: 1, target: 'foe', ok: true }, { k: 'technique', n: 2, unit: 'me' }, { k: 'melee_fx', n: 3, beat: 'force', target: 'foe' }];
    expect(leadMoves(lone)).toBe(lone);
  });
  it('quick strikes end at the use\'s upto and at a turn: a later plain attack is never quick', () => {
    const evs: any[] = [
      { k: 'technique', n: 1, unit: 'me', id: 'sweep' }, { k: 'melee_fx', n: 2, unit: 'me', beat: 'arc', struck: ['a', 'b', 'c'], upto: 5 },
      { k: 'melee', n: 3, unit: 'me' }, { k: 'melee', n: 4, unit: 'me' }, { k: 'hurt', n: 5 }, { k: 'melee', n: 6, unit: 'me' },
    ];
    expect(quickStrikes(evs).map((e) => !!e._quick)).toEqual([false, false, false, true, false, false]);
    const t: any[] = [{ k: 'melee_fx', n: 1, unit: 'me', beat: 'arc', struck: ['a', 'b', 'c'] }, { k: 'melee', n: 2, unit: 'me' }, { k: 'turn', n: 3, unit: 'x' }, { k: 'melee', n: 4, unit: 'me' }];
    expect(quickStrikes(t).map((e) => !!e._quick)).toEqual([false, false, false, false]);
  });
  it('a Thrown Flurry: no cut lines; each thrown shot flies the weapon, the last lands in the pile', () => {
    const evs: any[] = [
      { k: 'melee_fx', n: 1, unit: 'me', beat: 'flurry', thrown: true, strikes: 2, weapon: 'combat_knife', land: '7,5', upto: 4 },
      { k: 'shot', n: 2, unit: 'me', thrown: true, from: '2,5', to: '3,5' }, { k: 'shot', n: 3, unit: 'me', thrown: true, from: '2,5', to: '7,5' }, { k: 'hurt', n: 4 },
      { k: 'shot', n: 5, unit: 'me', thrown: true },
    ];
    const out = meleePrepass(evs);
    expect(out.map((e) => e._fly || null)).toEqual([null, { weapon: 'combat_knife', land: null }, { weapon: 'combat_knife', land: '7,5' }, null, null]);
    const layer = grid(), H = meleeTechHandlers(kit());
    H.melee_fx({ ...evs[0] } as any);
    expect(layer.querySelectorAll('[data-melee-fx="flurry"]').length).toBe(0); // no sword cuts on a target at range
    window.dispatchEvent(new CustomEvent('phc-fx', { detail: out[1] })); window.dispatchEvent(new CustomEvent('phc-fx', { detail: out[2] }));
    expect(layer.querySelectorAll('[data-melee-fx="throw"]').length).toBe(2);
    expect((window as any).__phcMeleeFx.filter((r: any) => r.id === 'flurry' && r.kind === 'flurry-throw' && r.drawn)).toHaveLength(2);
  });
  it('Parry\'s word floats below the token (C\'s technique name floats above it)', () => {
    const layer = grid(), H = meleeTechHandlers(kit());
    H.melee_fx({ k: 'melee_fx', n: 1, ...EX.parry } as any);
    const w = [...layer.querySelectorAll('div')].find((d) => d.textContent === 'PARRIED' && !!d.style.top) as HTMLElement;
    const c = centre('2,5')!, top = parseFloat(w.style.top), h = parseFloat(w.style.height);
    expect(top + h / 2).toBeGreaterThan(c.y);
  });
  it('a Charge by an unseen (Hidden) runner draws no trail and no dust', () => {
    const layer = grid(), H = meleeTechHandlers(kit(new Set(), false));
    H.melee_fx({ k: 'melee_fx', n: 1, id: 'charge', beat: 'charge', unit: 'foe', at: '2,5', route: ['6,5', '5,5', '4,5', '3,5'], seen: { pc: 0 } } as any);
    expect(layer.querySelectorAll('[data-melee-fx]').length).toBe(0); expect(layer.querySelectorAll('img').length).toBe(0);
  });
  it('the standing layer redraws a mark only when it moved (not every frame), and Throw Down takes the hold it tears', () => {
    const layer = grid(), H = meleeTechHandlers(kit());
    syncMeleeMarks(meleeMarksOf(game([{ id: 'me', side: 'pc', pos: '2,5', tech: { bind: { target: 'foe' } } }, { id: 'foe', side: 'foe', pos: '3,5', nailed: { ap: 2, weapon: 'lance' } }])));
    const g = layer.querySelector('[data-melee-mark="nailed"]') as SVGGElement, d = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML')!;
    let sets = 0; Object.defineProperty(g, 'innerHTML', { get() { return d.get!.call(this); }, set(v) { sets++; d.set!.call(this, v); } });
    vi.advanceTimersByTime(200); // a dozen frames
    expect(sets).toBe(0);
    const tile = [...document.querySelectorAll('button')].find((b) => /· open/.test(b.getAttribute('aria-label') || '') && (b as any).getBoundingClientRect().left === 120 && (b as any).getBoundingClientRect().top === 200)!;
    (tile as any).getBoundingClientRect = () => ({ left: 130, top: 200, width: 40, height: 40, right: 170, bottom: 240 }); // the board scrolled
    vi.advanceTimersByTime(50); expect(sets).toBe(1);
    H.melee_fx({ k: 'melee_fx', n: 2, ...EX.slam } as any);
    expect(layer.querySelectorAll('[data-melee-mark="bind"]').length).toBe(0); expect(meleeMarkCount()).toBe(1);
  });
});
