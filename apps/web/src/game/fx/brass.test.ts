// @vitest-environment jsdom
// What weapons throw off (fx/brass.ts): every ranged weapon in the data has its casing, magazine or draw; casings fly
// behind the shooter (away from the target); a bow's shot waits for the draw; a reload drops its magazine straight down
// (a tactical one takes it back); guns with no magazine load their own way; an Evoker throws its spent core.
import { describe, expect, it, vi } from 'vitest';
import { refOf, WEAPONS } from '@engine';
import { setLayer } from './dom';
import { playFx, setContext, clearFx } from './play';
import { DRAW_MS, arcFrames, behindOf, brassOf, coreOf } from './brass';
import * as sfxMod from '../sfx';

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
/** The pieces on the layer now, by tag (shell:pistol, mag:curved_mag, core:evoker, arrow, round:hull …). */
const pieces = (layer: HTMLElement) => Array.from(layer.querySelectorAll('[data-fx-piece]')).map((e) => e.getAttribute('data-fx-piece'));
/** The ranged weapons in the data (guns, bows, the enchanted guns). */
const ranged = () => (WEAPONS as any[]).filter((w) => ['pistol', 'revolver', 'smg', 'rifle', 'shotgun', 'heavy', 'bow'].includes(w.category) || ['core_rifle', 'spellslinger_pistol', 'lumeri_censer_gun'].includes(w.id));

describe('what each weapon throws off', () => {
  it('every gun in the data has a casing (per shot, or at the reload), every magazine gun a magazine, every bow a draw', () => {
    for (const w of ranged()) {
      const b = brassOf(w.id, w.category);
      if (w.category === 'bow') { expect(b.bow, w.id).toBe(/crossbow/.test(w.id) ? 'crossbow' : 'bow'); expect(b.shell, w.id).toBeNull(); continue; }
      if (w.id === 'breacher_tube' || w.id === 'purifier_flamer') { expect(b.shell, w.id).toBeNull(); continue; } // a rocket, a jet of fire
      expect(b.shell, w.id).not.toBeNull();
      // a magazine gun drops its magazine; a revolver, a break-action, a pump or a lever loads its own way
      if (w.reload === 'magazine' && b.load !== 'cylinder') expect(b.mag, w.id).not.toBeNull();
      else expect(b.load, w.id).not.toBeNull();
    }
  });
  it('the special cases: revolvers dump their brass at the reload, break-actions kick theirs out, pumps and bolts work the action first', () => {
    expect(brassOf('drifter_revolver', 'revolver')).toMatchObject({ shell: 'pistol', when: 'reload', load: 'cylinder', mag: null });
    expect(brassOf('frontier_hand_cannon', 'revolver')).toMatchObject({ shell: 'magnum', when: 'reload', load: 'cylinder' });
    expect(brassOf('coach_gun', 'shotgun')).toMatchObject({ shell: 'hull', when: 'reload', load: 'break', mag: null });
    expect(brassOf('lumeri_scattergun', 'shotgun')).toMatchObject({ shell: 'hull', when: 'shot', load: 'pump' });
    expect(brassOf('lumeri_scattergun', 'shotgun').cycle).toBeGreaterThan(100);
    expect(brassOf('long_rifle', 'rifle').cycle).toBeGreaterThan(brassOf('lever_carbine', 'rifle').cycle);
    expect(brassOf('service_pistol', 'pistol')).toMatchObject({ shell: 'pistol', when: 'shot', mag: 'pistol_mag', cycle: 0 });
    expect(brassOf('hellraiser_rotary', 'heavy')).toMatchObject({ shell: 'linked_rifle', mag: 'belt_box' });
    // the enchanted guns: an etched casing, a blessed hull, a spent core charge
    expect(brassOf('spellslinger_pistol', 'mana')).toMatchObject({ shell: 'etched', mag: 'etched_mag' });
    expect(brassOf('lumeri_censer_gun', 'mana').shell).toBe('censer_hull');
    expect(brassOf('core_rifle', 'mana').shell).toBe('charge');
    // melee and thrown weapons throw nothing off
    for (const id of ['combat_knife', 'frag_grenade', 'evoker_blade']) expect(brassOf(id, (WEAPONS as any[]).find((w) => w.id === id).category)).toMatchObject({ shell: null, mag: null, bow: null });
    expect([coreOf('evoker'), coreOf('evoker_blade'), coreOf('grand_staff'), coreOf(undefined)]).toEqual(['evoker', 'blade', 'staff', 'evoker']);
  });
  it('the throw: it ends behind the shooter (the way opposite the aim), back on the ground, faded out', () => {
    for (const aim of [0, Math.PI / 2, Math.PI, -Math.PI / 4]) {
      const dir = behindOf(aim), f = arcFrames({ dir, dist: 40, height: 20, ms: 360, hop: 6, spin: 720, rest: 200, fade: 250 });
      expect(f.end.x * Math.cos(aim) + f.end.y * Math.sin(aim)).toBeCloseTo(-46, 5); // 46 px straight back
      const last = f.piece[f.piece.length - 1], offs = f.piece.map((k) => k.offset as number);
      expect(last.opacity).toBe(0); expect(offs[offs.length - 1]).toBe(1);
      expect(offs.every((o, i) => i === 0 || o >= offs[i - 1])).toBe(true);
      // mid-flight it is up off the ground (its lift shows on screen; its shadow stays down)
      const mid = f.piece[6].transform as string, sh = f.shadow[6].transform as string;
      expect(Number(/translate\([-\d.]+px,([-\d.]+)px/.exec(mid)![1])).toBeLessThan(Number(/translate\([-\d.]+px,([-\d.]+)px/.exec(sh)![1]));
    }
  });
});

describe('the pictures over the grid', () => {
  const run = (ev: any, ms = 3000) => { const layer = grid(); playFx(ev); const seen = new Set<string>(); for (let t = 0; t < ms; t += 50) { vi.advanceTimersByTime(50); for (const p of pieces(layer)) seen.add(p!); } return { layer, seen: [...seen] }; };
  it('a shot throws its casing out from behind the portrait (cut out where the portrait covers it); a pump gun a beat later', () => {
    vi.useFakeTimers();
    const animate = vi.fn(() => ({ cancel() {}, finished: Promise.resolve() }));
    (Element.prototype as any).animate = animate;
    const layer = grid();
    playFx({ k: 'shot', unit: 'u', target: 't', from: '1,1', to: '5,1', weapon: 'service_pistol', cat: 'pistol', hit: true, dmg: 5 } as any);
    vi.advanceTimersByTime(20);
    expect(pieces(layer)).toContain('shell:pistol');
    const box = layer.querySelector('[data-fx="brass"]') as HTMLElement;
    expect(box.style.clipPath || box.getAttribute('style')).toMatch(/evenodd|clip-path/);
    // the target is to the right: the casing's flight ends to the left of where it started
    const call = animate.mock.calls.find((c: any) => ((c as any)[0]?.length || 0) > 10 && /rotate/.test(String((c as any)[0][1]?.transform))) as any;
    const end = /translate\(([-\d.]+)px/.exec(call[0][call[0].length - 1].transform)!;
    expect(Number(end[1])).toBeLessThan(0);
    vi.advanceTimersByTime(4000); expect(layer.childElementCount).toBe(0);
    const pump = grid();
    playFx({ k: 'shot', unit: 'u', target: 't', from: '1,1', to: '5,1', weapon: 'lumeri_scattergun', cat: 'shotgun', hit: true, dmg: 5 } as any);
    vi.advanceTimersByTime(20); expect(pieces(pump)).not.toContain('shell:hull');
    vi.advanceTimersByTime(300); expect(pieces(pump)).toContain('shell:hull');
    clearFx(); vi.advanceTimersByTime(5000); delete (Element.prototype as any).animate; vi.useRealTimers();
  });
  it('a bow draws an arrow from behind before the shot flies: the sound waits for the draw', () => {
    vi.useFakeTimers(); grid();
    const spy = vi.spyOn(sfxMod, 'sfx').mockImplementation(() => {});
    const layer = grid();
    playFx({ k: 'shot', unit: 'u', target: 't', from: '1,1', to: '5,1', weapon: 'longbow', cat: 'bow', hit: true, dmg: 5 } as any);
    expect(pieces(layer)).toContain('arrow');
    expect(spy.mock.calls.filter((c) => c[0] === 'swish').length).toBe(1); // the draw, not the loose
    vi.advanceTimersByTime(DRAW_MS + 10);
    expect(spy.mock.calls.filter((c) => c[0] === 'swish').length).toBe(2);
    // a crossbow has its bolt on: no draw
    spy.mockClear(); const l2 = grid();
    playFx({ k: 'shot', unit: 'u', target: 't', from: '1,1', to: '5,1', weapon: 'crossbow', cat: 'bow', hit: true, dmg: 5 } as any);
    expect(pieces(l2)).not.toContain('arrow'); expect(spy.mock.calls.filter((c) => c[0] === 'swish').length).toBe(1);
    spy.mockRestore(); clearFx(); vi.advanceTimersByTime(5000); vi.useRealTimers();
  });
  it('reloads: a magazine drops; a revolver dumps its brass and loads; a double barrel kicks its hulls out and takes two; a pump feeds shells', () => {
    vi.useFakeTimers();
    expect(run({ k: 'reload', unit: 'u', at: '1,1', weapon: 'legion_bullpup', cat: 'rifle', how: 'mag', dur: 1200 }).seen).toContain('mag:curved_mag');
    expect(run({ k: 'reload', unit: 'u', at: '1,1', weapon: 'legion_bullpup', cat: 'rifle', how: 'mag', dur: 1200, tactical: true }).seen).toContain('mag:curved_mag');
    const rev = run({ k: 'reload', unit: 'u', at: '1,1', weapon: 'drifter_revolver', cat: 'revolver', how: 'mag', dur: 1200 }).seen;
    expect(rev).toEqual(expect.arrayContaining(['shell:pistol', 'round:pistol'])); expect(rev.some((p) => /^mag:/.test(p))).toBe(false);
    expect(run({ k: 'reload', unit: 'u', at: '1,1', weapon: 'coach_gun', cat: 'shotgun', how: 'loose', rounds: 2, dur: 1400 }).seen).toEqual(expect.arrayContaining(['shell:hull', 'round:hull']));
    const pump = run({ k: 'reload', unit: 'u', at: '1,1', weapon: 'lumeri_scattergun', cat: 'shotgun', how: 'loose', rounds: 4, dur: 1400 }).seen;
    expect(pump).toContain('round:hull'); expect(pump).not.toContain('shell:hull');
    expect(run({ k: 'reload', unit: 'u', at: '1,1', weapon: 'purifier_flamer', cat: 'heavy', how: 'loose', rounds: 10, dur: 1400 }).seen).toContain('mag:fuel_can');
    expect(run({ k: 'reload', unit: 'u', at: '1,1', weapon: 'crossbow', cat: 'bow', how: 'loose', rounds: 1, dur: 1400 }).seen).toContain('bolt');
    expect(run({ k: 'reload', unit: 'u', at: '1,1', weapon: 'longbow', cat: 'bow', how: 'loose', rounds: 3, dur: 1400 }).seen).toContain('arrow');
    // both guns: each drops its own
    expect(run({ k: 'reload', unit: 'u', at: '1,1', weapon: 'service_pistol', cat: 'pistol', how: 'mag', dur: 1200, off: { weapon: 'decrkm_smg', cat: 'smg', how: 'mag' } }).seen).toEqual(expect.arrayContaining(['mag:pistol_mag', 'mag:stick_mag']));
    clearFx(); vi.advanceTimersByTime(5000); vi.useRealTimers();
  });
  it('an Evoker taking a fresh core throws out the spent one, shaped by the Evoker that held it', () => {
    vi.useFakeTimers();
    expect(run({ k: 'core', unit: 'u', at: '1,1', dur: 1000, focus: 'evoker' }).seen).toContain('core:evoker');
    expect(run({ k: 'core', unit: 'u', at: '1,1', dur: 1000, focus: 'evoker_blade' }).seen).toContain('core:blade');
    expect(run({ k: 'core', unit: 'u', at: '1,1', dur: 1000, focus: 'grand_staff' }).seen).toContain('core:staff');
    expect(run({ k: 'core', unit: 'u', at: '1,1', dur: 1000 }).seen).toContain('core:evoker');
    clearFx(); vi.advanceTimersByTime(5000); vi.useRealTimers();
  });
});
