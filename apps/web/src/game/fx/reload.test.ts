// @vitest-environment jsdom
// The reload card (fx/reload.ts): what it shows for each kind of reload (a magazine swapped at speed or tactically, a
// revolver's cylinder, rounds fed one by one, arrows, a canister, both guns, the off hand), drawn over the unit on the
// effects layer, on top of it, with the count ending at what the gun holds; still under reduced motion.
import { describe, expect, it, vi, afterEach } from 'vitest';
import { refOf, WEAPONS } from '@engine';
import { setLayer } from './dom';
import { playFx, setContext, clearFx } from './play';
import { countText, reloadPlan } from './reload';
import * as sfxMod from '../sfx';

function grid(w = 8, h = 6) {
  document.body.innerHTML = '';
  const root = document.createElement('div'); root.id = 'root'; const scr = document.createElement('div'); root.appendChild(scr); document.body.appendChild(root);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const b = document.createElement('button'); b.className = 'phc-tok'; b.setAttribute('aria-label', refOf(x + ',' + y) + ' · open');
    const img = document.createElement('img'); img.setAttribute('style', 'position: relative; z-index: 2; width: 38px; border-radius: 50%'); b.appendChild(img);
    (b as any).getBoundingClientRect = () => ({ left: x * 52, top: 200 + y * 52, width: 52, height: 52, right: x * 52 + 52, bottom: 252 + y * 52 });
    (img as any).getBoundingClientRect = () => ({ left: x * 52 + 2, top: 202 + y * 52, width: 48, height: 48, right: x * 52 + 50, bottom: 250 + y * 52 });
    scr.appendChild(b);
  }
  const layer = document.createElement('div'); document.body.appendChild(layer); setLayer(layer);
  setContext({ code: 'X', characters: {}, story: { positions: {}, npcs: [] }, combat: null } as any, 'main');
  return layer;
}
const ev = (o: Record<string, any>) => ({ k: 'reload', unit: 'u1', at: '3,3', dur: 1200, ...o });
afterEach(() => { clearFx(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('what the reload card shows', () => {
  it('a magazine swap: speed drops the old one in the pile, tactical puts it in the pack; the counts come from the event', () => {
    const s = reloadPlan(ev({ weapon: 'hellraiser_service_rifle', cat: 'rifle', how: 'mag', left: 7, ammo: 24, cap: 24 }));
    expect(s).toMatchObject({ mode: 'speed', title: 'SPEED RELOAD' });
    expect(s.guns).toEqual([expect.objectContaining({ hand: 'main', look: 'mag', mag: 'curved_mag', from: 0, to: 24, cap: 24, left: 7, out: 'pile' })]);
    const t = reloadPlan(ev({ weapon: 'hellraiser_service_rifle', cat: 'rifle', how: 'mag', left: 7, ammo: 24, cap: 24, tactical: true }));
    expect(t).toMatchObject({ mode: 'tactical', title: 'TACTICAL RELOAD' });
    expect(t.guns[0].out).toBe('pack');
    // a partly spent spare goes in: the count ends at what it holds
    expect(reloadPlan(ev({ weapon: 'service_pistol', cat: 'pistol', how: 'mag', left: 0, ammo: 9, cap: 12 })).guns[0]).toMatchObject({ to: 9, cap: 12 });
  });
  it("a reload with unlimited spares (a companion's, a twin's: the event's noDrop): a speed swap with no pile, no +1, nothing under the portrait", () => {
    const s = reloadPlan(ev({ weapon: 'service_pistol', cat: 'pistol', how: 'mag', left: 0, ammo: 12, cap: 12, noDrop: true }));
    expect(s).toMatchObject({ mode: 'speed', title: 'SPEED RELOAD' });
    expect(s.guns[0]).toMatchObject({ look: 'mag', swap: true, out: null, left: 0, to: 12 });
    // a revolver's speedloader the same; an off-hand gun with no pool of its own (reloadHands' noDrop) too
    expect(reloadPlan(ev({ weapon: 'drifter_revolver', cat: 'revolver', how: 'mag', left: 1, ammo: 6, cap: 6, noDrop: true })).guns[0]).toMatchObject({ look: 'cylinder', swap: true, out: null });
    expect(reloadPlan(ev({ weapon: 'service_pistol', cat: 'pistol', how: 'mag', hand: 'off', left: 3, ammo: 12, cap: 12, noDrop: true })).guns[0]).toMatchObject({ hand: 'off', out: null });
    vi.useFakeTimers();
    const layer = grid();
    playFx(ev({ unit: 'e1', weapon: 'service_pistol', cat: 'pistol', how: 'mag', left: 0, ammo: 12, cap: 12, noDrop: true }) as any);
    const seen = new Set<string>();
    for (let t = 0; t < 1500; t += 50) { vi.advanceTimersByTime(50); for (const p of layer.querySelectorAll('[data-fx-piece]')) seen.add(p.getAttribute('data-fx-piece') || ''); }
    const card = layer.querySelector('[data-fx="reload"]')!;
    expect(card).toBeTruthy(); expect(card.getAttribute('data-reload-mode')).toBe('speed');
    expect(card.querySelector('[data-reload-drop]')).toBeNull(); expect(card.querySelector('[data-reload-badge]')).toBeNull();
    expect(card.textContent).not.toMatch(/PILE/);
    expect([...seen].filter((t) => t.startsWith('mag:'))).toEqual([]);
    vi.advanceTimersByTime(4000);
  });
  it('without the counts (an older event, a class move) it falls back to the data: a full gun, nothing left', () => {
    expect(reloadPlan(ev({ weapon: 'service_pistol', cat: 'pistol', how: 'mag' })).guns[0]).toMatchObject({ to: 12, cap: 12, left: 0, out: 'pile' });
    expect(reloadPlan(ev({ weapon: 'lumeri_scattergun', cat: 'shotgun', how: 'loose', rounds: 2 })).guns[0]).toMatchObject({ look: 'rounds', from: 4, to: 6, cap: 6, out: null });
  });
  it('rounds loaded by hand, a revolver, arrows, a canister: each its own look; none of them drops anything', () => {
    expect(reloadPlan(ev({ weapon: 'lumeri_scattergun', cat: 'shotgun', how: 'loose', rounds: 4, ammo: 6, cap: 6 }))).toMatchObject({ mode: 'load', title: 'LOADING', guns: [{ look: 'rounds', shell: 'hull', from: 2, to: 6, each: true }] });
    expect(reloadPlan(ev({ weapon: 'coach_gun', cat: 'shotgun', how: 'loose', rounds: 2, ammo: 2, cap: 2 })).guns[0]).toMatchObject({ look: 'rounds', from: 0, to: 2 });
    expect(reloadPlan(ev({ weapon: 'lever_carbine', cat: 'rifle', how: 'loose', rounds: 5, ammo: 8, cap: 8 })).guns[0]).toMatchObject({ look: 'rounds', from: 3, to: 8 });
    // a revolver's speedloader: a swap (it goes in the pile, or the pack); loose rounds go in one by one
    expect(reloadPlan(ev({ weapon: 'drifter_revolver', cat: 'revolver', how: 'mag', left: 1, ammo: 6, cap: 6 })).guns[0]).toMatchObject({ look: 'cylinder', left: 1, out: 'pile', each: false });
    expect(reloadPlan(ev({ weapon: 'longbow', cat: 'bow', how: 'loose', rounds: 6, ammo: 20, cap: 20 })).guns[0]).toMatchObject({ look: 'arrows', from: 14, to: 20 });
    expect(reloadPlan(ev({ weapon: 'crossbow', cat: 'bow', how: 'loose', rounds: 1, ammo: 1, cap: 1 })).guns[0].look).toBe('arrows');
    expect(reloadPlan(ev({ weapon: 'repeating_crossbow', cat: 'bow', how: 'mag', ammo: 6, cap: 6 })).guns[0]).toMatchObject({ look: 'mag', mag: 'bolt_box' });
    expect(reloadPlan(ev({ weapon: 'purifier_flamer', cat: 'heavy', how: 'loose', rounds: 7, ammo: 10, cap: 10 }))).toMatchObject({ title: 'REFUEL', guns: [{ look: 'fuel', from: 3, to: 10, out: null }] });
  });
  it('every gun that reloads in the data gets a card with a picture (or at least its count)', () => {
    for (const w of (WEAPONS as any[]).filter((x) => x.magazine != null && x.reload)) {
      const g = reloadPlan(ev({ weapon: w.id, cat: w.category, how: w.reload === 'loose' ? 'loose' : 'mag' })).guns[0];
      expect(g.cap, w.id).toBe(w.magazine);
      if (g.look === 'mag' || g.look === 'fuel') expect(g.mag, w.id).not.toBeNull();
      if (g.look === 'rounds') expect(g.shell, w.id).not.toBeNull();
      expect(g.look === 'count' ? w.id : 'ok', w.id).toMatch(/^(ok|breacher_tube)$/); // only the breacher's single rocket has no picture
    }
  });
  it('both guns: two columns, main then off; the off hand alone: one, marked off', () => {
    const b = reloadPlan(ev({ weapon: 'service_pistol', cat: 'pistol', how: 'mag', left: 0, ammo: 12, cap: 12, off: { weapon: 'decrkm_smg', cat: 'smg', how: 'mag', left: 2, ammo: 30, cap: 30, tactical: true }, tactical: true }));
    expect(b.mode).toBe('tactical');
    expect(b.guns.map((g) => [g.hand, g.mag, g.to, g.out])).toEqual([['main', 'pistol_mag', 12, 'pack'], ['off', 'stick_mag', 30, 'pack']]);
    expect(reloadPlan(ev({ weapon: 'decrkm_smg', cat: 'smg', how: 'mag', hand: 'off', ammo: 30, cap: 30 })).guns.map((g) => g.hand)).toEqual(['off']);
  });
  it('the count reads n/size', () => { expect(countText(7, 24)).toBe('7/24'); });
});

describe('the card on the layer', () => {
  it('a reload shows the card over the unit, on top of the layer, and its count ends at what the gun holds', () => {
    vi.useFakeTimers();
    const layer = grid();
    playFx(ev({ weapon: 'hellraiser_service_rifle', cat: 'rifle', how: 'mag', left: 7, ammo: 24, cap: 24 }) as any);
    const card = layer.querySelector('[data-fx="reload"]') as HTMLElement;
    expect(card).toBeTruthy();
    expect(card.getAttribute('data-reload-mode')).toBe('speed');
    expect(card.style.zIndex).toBe('4');
    expect(card.querySelector('[data-reload-title]')!.textContent).toBe('SPEED RELOAD');
    expect(card.querySelector('[data-reload-drop]')).toBeTruthy(); expect(card.querySelector('[data-reload-pack]')).toBeNull();
    // above the unit's tile (D4: top 356): the card ends over it
    expect(parseFloat(card.style.top) + parseFloat(card.style.height)).toBeLessThanOrEqual(356);
    expect(card.querySelector('[data-reload-count]')!.textContent).toBe('7/24');
  });
  it('the count runs up and is marked done; the card leaves afterwards', () => {
    vi.useFakeTimers();
    const layer = grid();
    playFx(ev({ weapon: 'service_pistol', cat: 'pistol', how: 'mag', left: 2, ammo: 12, cap: 12, tactical: true }) as any);
    const card = layer.querySelector('[data-fx="reload"]') as HTMLElement;
    expect(card.querySelector('[data-reload-pack]')).toBeTruthy();
    vi.advanceTimersByTime(1250);
    const c = card.querySelector('[data-reload-count]')!;
    expect(c.getAttribute('data-reload-count')).toBe('12'); expect(c.getAttribute('data-reload-done')).toBe('1');
    expect(card.querySelector('[data-reload-badge]')!.textContent).toBe('+1');
    vi.advanceTimersByTime(3000);
    expect(layer.querySelector('[data-fx="reload"]')).toBeNull();
  });
  it('speed and tactical read apart to the end: frame, title chip, the extra AP; the fresh magazine lit, the old one dim; the count over a falling one', () => {
    vi.useFakeTimers();
    const layer = grid();
    const look = () => { const c = layer.querySelector('[data-fx="reload"]') as HTMLElement; return {
      frame: c.querySelector('[data-reload-frame]')!.getAttribute('style') || '', chip: c.querySelector('[data-reload-chip]')!.getAttribute('data-reload-chip'),
      chipStyle: c.querySelector('[data-reload-chip]')!.getAttribute('style') || '', ap: c.querySelector('[data-reload-ap]')?.textContent || '',
      fresh: c.querySelector('[data-reload-piece="new"]')?.getAttribute('data-reload-lit'), old: c.querySelector('[data-reload-old]')?.getAttribute('data-reload-lit'),
      oldZ: (c.querySelector('[data-reload-old]') as HTMLElement | null)?.style.zIndex, countZ: (c.querySelector('[data-reload-count]') as HTMLElement).style.zIndex } };
    playFx(ev({ unit: 'a', weapon: 'hellraiser_service_rifle', cat: 'rifle', how: 'mag', left: 7, ammo: 24, cap: 24 }) as any);
    const sp = look(); vi.advanceTimersByTime(4000);
    playFx(ev({ unit: 'b', weapon: 'hellraiser_service_rifle', cat: 'rifle', how: 'mag', left: 7, ammo: 24, cap: 24, tactical: true }) as any);
    const tc = look(); vi.advanceTimersByTime(4000);
    expect(sp.chip).toBe('speed'); expect(tc.chip).toBe('tactical');
    expect(sp.frame).toMatch(/solid (#A3AEC2|rgb\(163, 174, 194\))/i); expect(tc.frame).toMatch(/solid (#FFFFFF|rgb\(255, 255, 255\))/i);
    expect(tc.chipStyle).toMatch(/background: ?(#FFFFFF|rgb\(255, 255, 255\))/i); expect(sp.chipStyle).not.toMatch(/background: ?(#FFFFFF|rgb\(255, 255, 255\))/i);
    expect(tc.ap).toBe('+1 AP'); expect(sp.ap).toBe('');
    expect(sp.fresh).toBe('1'); expect(sp.old).toBe('0'); expect(tc.fresh).toBe('1');
    expect(Number(sp.countZ)).toBeGreaterThan(Number(sp.oldZ)); // the falling old magazine passes behind the count
  });
  it('a tactical reload drops nothing under the portrait (its magazine goes to the pack on the card); a speed one does', () => {
    vi.useFakeTimers();
    const layer = grid(), mags = () => [...layer.querySelectorAll('[data-fx-piece]')].map((p) => p.getAttribute('data-fx-piece') || '').filter((t) => t.startsWith('mag:'));
    const seen = (e: any) => { const all = new Set<string>(); playFx(e); for (let t = 0; t < 1500; t += 50) { vi.advanceTimersByTime(50); for (const m of mags()) all.add(m); } vi.advanceTimersByTime(4000); return [...all]; };
    expect(seen(ev({ unit: 'a', weapon: 'hellraiser_service_rifle', cat: 'rifle', how: 'mag', left: 7, ammo: 24, cap: 24, tactical: true }))).toEqual([]);
    expect(seen(ev({ unit: 'b', weapon: 'hellraiser_service_rifle', cat: 'rifle', how: 'mag', left: 7, ammo: 24, cap: 24 })).length).toBeGreaterThan(0);
  });
  it("a unit's new reload replaces its card; reduced motion shows a still card with the end count at once", () => {
    vi.useFakeTimers();
    const layer = grid();
    playFx(ev({ weapon: 'service_pistol', cat: 'pistol', how: 'mag', left: 2, ammo: 12, cap: 12 }) as any);
    playFx(ev({ weapon: 'service_pistol', cat: 'pistol', how: 'mag', left: 2, ammo: 12, cap: 12 }) as any);
    expect(layer.querySelectorAll('[data-fx="reload"]').length).toBe(1);
    vi.advanceTimersByTime(4000);
    vi.spyOn(sfxMod, 'reducedMotion').mockReturnValue(true);
    playFx(ev({ weapon: 'lumeri_scattergun', cat: 'shotgun', how: 'loose', rounds: 4, ammo: 6, cap: 6 }) as any);
    const card = layer.querySelector('[data-fx="reload"]')!;
    expect(card.querySelector('[data-reload-count]')!.getAttribute('data-reload-count')).toBe('6');
    expect(card.querySelectorAll('[data-reload-piece="round"]').length).toBe(6);
    expect(card.querySelector('[data-reload-old]')).toBeNull();
  });
});
