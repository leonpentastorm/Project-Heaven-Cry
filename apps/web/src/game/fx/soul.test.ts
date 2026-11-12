// @vitest-environment jsdom
// Outburst 2.0 effects (fx/soul.ts, rules 1.5): every heart event the engine emits maps to its effect and sound; the
// pump rises with the stage, a free one shimmers, stage 4 throbs the screen edge; each release form draws its own way;
// the held heart stands over its holder (glow by stage, aura by tone, the overwatch eye) and hums its aura's bed; the
// Short stops the sound; the real engine's events all play; the sound files exist and are credited.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { ARCHETYPES, MAPS, newCharacter, startCombat, refOf, beginOutburst, pumpOutburst, releaseOutburst, letGo, steadyHeart, setHeartWatch, magicTurnStart, addStrain, type Sheet } from '@engine';
import { setLayer } from './dom';
import { playFx, setContext, clearFx, queueFx, fxBusyUntil } from './play';
import { ambientOf, loopsFor, syncAmbient, clearAmbient, ambientCount } from './ambient';
import { heartNode, pumpLook, releaseLook, stageColour, soulBeat, toneEl } from './soul';
import { ELEMENTS } from './elements';
import * as sfxMod from '../sfx';
import { SFX_FILES, LOOP_SFX, LOOP_OPTS } from '../sfx';
import { SFX_CREDITS } from '../sfxCredits';
import { SOUL_INK } from '../glyphs';

const PUBLIC = resolve(__dirname, '../../../public');
function grid(w = 14, h = 10) {
  document.body.innerHTML = '';
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
const story = () => ({ code: 'X', characters: {}, story: { positions: {}, npcs: [] }, combat: null }) as any;
const SOUL_EVENTS: any[] = [
  { k: 'outburst', unit: 'u', at: '2,5', design: 'd1', school: 'damage', form: 'burst', tone: 'fire', element: 'fire', hold: true, stage: 0, watch: false },
  { k: 'pump', unit: 'u', at: '2,5', stage: 1, mult: 1, free: false, max: false, tone: 'fire' },
  { k: 'pump', unit: 'u', at: '2,5', stage: 2, mult: 1.4, free: true, max: false, tone: 'fire' },
  { k: 'pump', unit: 'u', at: '2,5', stage: 4, mult: 2.2, free: false, max: true, tone: 'storm' },
  { k: 'swell', unit: 'u', at: '2,5', stage: 3, mult: 1.8, tone: 'frost' },
  { k: 'hold', unit: 'u', at: '2,5', stage: 3, tone: 'frost', form: 'bolt', watch: true },
  { k: 'aura_tick', unit: 'u', at: '2,5', tone: 'acid', element: 'acid', targets: ['t'], riderStage: 1 },
  { k: 'heart_overwatch', unit: 'u', at: '2,5', target: 't', to: '6,5', stage: 2, tone: 'gale' },
  { k: 'resonance', unit: 'u', at: '2,5', with: ['a'], bonus: 0.2 },
  { k: 'feed', unit: 'u', at: '2,5', word: 'fire', glyph: 'g1', stage: 2, mult: 1.4 },
  { k: 'calm', unit: 'u', at: '2,5', way: 'still', by: 1, strain: 2 }, { k: 'calm', unit: 'u', at: '2,5', way: 'turn', by: 1, strain: 1 },
  { k: 'letgo', unit: 'u', at: '2,5', stage: 2, by: 2, strain: 1 }, { k: 'steady', unit: 'u', at: '2,5', by: 1, strain: 2, stage: 2 },
  { k: 'strain', unit: 'u', at: '2,5', strain: 2, limit: 6, by: 1, why: 'pump', over: 0 }, { k: 'strain', unit: 'u', at: '2,5', strain: 7, limit: 6, by: 1, why: 'pump', over: 1 },
  { k: 'burn', unit: 'u', at: '2,5', over: 1, dmg: 8 }, { k: 'short', unit: 'u', at: '2,5', held: true, tone: 'fire', element: 'fire', strain: 9, limit: 6 },
  { k: 'chain', unit: 'u', from: '6,5', to: '7,6', target: 't2', element: 'shock' },
  { k: 'infusion', unit: 'u', target: 't', at: '3,5', element: 'shock' }, { k: 'charge', unit: 'u', at: '2,5', charges: 2 },
  { k: 'explode', at: '6,5', radius: 1, what: 'discharge', element: 'fire', charges: 3, shake: true },
  ...['bolt', 'wave', 'burst', 'aura', 'lance'].map((form, i) => ({ k: 'release', unit: 'u', at: '2,5', to: '6,5', design: 'd1', school: 'damage', form, tone: i % 2 ? 'raw' : 'fire', element: i % 2 ? null : 'fire', stage: i, mult: 1, riderStage: 1, wild: false, reaction: false, resonance: 0, area: ['6,5', '7,5', '6,6'], targets: ['t'] })),
  { k: 'release', unit: 'u', at: '2,5', to: '2,5', school: 'damage', form: 'burst', tone: 'raw', element: null, stage: 2, wild: true, area: [], targets: [], air: true },
];
const ctx = () => setContext({ code: 'X', characters: {}, story: { positions: {}, npcs: [] }, combat: { units: [
  { id: 'u', pos: '2,5', name: 'Wren', side: 'pc' }, { id: 'a', pos: '2,7', name: 'Ally', side: 'pc' }, { id: 't', pos: '3,5', name: 'Foe', side: 'foe' }, { id: 't2', pos: '7,6', name: 'Foe 2', side: 'foe' }] } } as any, 'combat');

describe('the heart\'s effects (Outburst 2.0)', () => {
  let spy: any;
  beforeEach(() => { vi.useFakeTimers(); grid(); setContext(story(), 'main'); spy = vi.spyOn(sfxMod, 'sfx').mockImplementation(() => {}); });
  afterEach(() => { spy.mockRestore(); clearFx(); clearAmbient(); vi.advanceTimersByTime(20000); vi.useRealTimers(); });
  const names = () => spy.mock.calls.map((c: any[]) => c[0]);
  const callsOf = (n: string) => spy.mock.calls.filter((c: any[]) => c[0] === n);

  it('every Soul event plays without an error, draws or sounds something, takes its beat, and cleans up', () => {
    ctx();
    const layer = document.body.lastElementChild as HTMLElement, warn = vi.spyOn(console, 'warn');
    for (const e of SOUL_EVENTS) {
      const before = layer.childElementCount, heard = spy.mock.calls.length;
      playFx(e); vi.advanceTimersByTime(1);
      expect(layer.childElementCount - before + spy.mock.calls.length - heard, e.k).toBeGreaterThan(0);
      if (e.k !== 'chain' && e.k !== 'explode') expect(soulBeat(e), e.k).toBeGreaterThan(0);
    }
    vi.advanceTimersByTime(2000);
    expect(warn).not.toHaveBeenCalled();
    for (const s of ['soul_breath_in', 'soul_thump', 'crystal', 'soul_choir', 'soul_gasp', 'heartbeat', 'sigil_draw', 'soul_breath_out', 'soul_sigh', 'soul_crack', 'soul_release', 'el_fire', 'el_zap']) expect(names(), s).toContain(s);
    queueFx(SOUL_EVENTS.slice(0, 5).map((e, i) => ({ n: i + 1, ...e }))); expect(fxBusyUntil()).toBeGreaterThan(performance.now() + 2000);
    vi.advanceTimersByTime(20000); expect(layer.childElementCount).toBe(0);
  });
  it('Pump: the thump rises in pitch and weight with the stage; a free Pump shimmers; stage 4 throbs the screen edge', () => {
    const a = pumpLook(1), b = pumpLook(4);
    expect(b.rate).toBeGreaterThan(a.rate); expect(b.gain).toBeGreaterThan(a.gain); expect(b.ringTo).toBeGreaterThan(a.ringTo); expect(b.motes).toBeGreaterThan(a.motes);
    expect(a.edge).toBe(false); expect(b.edge).toBe(true); expect(pumpLook(2, true).shimmer).toBe(true);
    const rates: number[] = [];
    for (const st of [1, 2, 3, 4]) { spy.mockClear(); playFx({ k: 'pump', unit: 'u', at: '2,5', stage: st, mult: 1, free: false, max: st === 4, tone: 'raw' }); rates.push(callsOf('soul_thump')[0][1].rate); }
    expect([...rates].sort((x, y) => x - y)).toEqual(rates); expect(new Set(rates).size).toBe(4);
    spy.mockClear(); playFx({ k: 'pump', unit: 'u', at: '2,5', stage: 2, free: true, tone: 'raw' }); expect(names()).toContain('crystal');
    spy.mockClear(); playFx({ k: 'pump', unit: 'u', at: '2,5', stage: 2, free: false, tone: 'raw' }); expect(names()).not.toContain('crystal'); expect(names()).not.toContain('soul_choir');
    const layer = document.body.lastElementChild as HTMLElement; layer.innerHTML = '';
    playFx({ k: 'pump', unit: 'u', at: '2,5', stage: 4, free: false, max: true, tone: 'fire' });
    expect([...layer.children].some((c) => /position:\s*fixed/.test((c as HTMLElement).style.cssText) && /inset/.test((c as HTMLElement).style.boxShadow))).toBe(true);
  });
  it('each release form draws its own way, scaled by stage; an elemental tone sounds its element, softened; raw does not', () => {
    const layer = document.body.lastElementChild as HTMLElement, counts: Record<string, number> = {};
    for (const form of ['bolt', 'wave', 'burst', 'aura', 'lance']) {
      layer.innerHTML = ''; spy.mockClear();
      playFx({ k: 'release', unit: 'u', at: '2,5', to: '6,5', form, tone: 'fire', element: 'fire', stage: 3, area: ['6,5', '7,5', '6,6'], targets: ['t'] }); vi.advanceTimersByTime(700);
      counts[form] = layer.childElementCount;
      expect(names(), form).toContain('soul_release'); expect(names(), form).toContain('soul_choir'); expect(names(), form).toContain('el_fire');
      expect(spy.mock.calls.find((c: any[]) => c[0] === 'el_fire')?.[1]?.lowpass, form).toBeGreaterThan(0);
      vi.advanceTimersByTime(3000);
    }
    for (const f of Object.keys(counts)) expect(counts[f], f).toBeGreaterThan(3);
    spy.mockClear(); playFx({ k: 'release', unit: 'u', at: '2,5', to: '6,5', form: 'burst', tone: 'raw', element: null, stage: 1, area: ['6,5'] }); vi.advanceTimersByTime(800);
    expect(names()).not.toContain('el_fire'); expect(names()).not.toContain('soul_choir');
    expect(releaseLook(4, ELEMENTS.stone).shake).toBeGreaterThan(releaseLook(2, ELEMENTS.stone).shake); expect(releaseLook(1, ELEMENTS.fire).shake).toBe(0);
    expect(releaseLook(4, ELEMENTS.fire).power).toBeGreaterThan(releaseLook(0, ELEMENTS.fire).power);
    // An old 1.2 release (area as a number, tiles listed) still plays.
    const warn = vi.spyOn(console, 'warn'); playFx({ k: 'release', unit: 'u', at: '2,5', to: '7,5', stage: 3, area: 1, school: 'buff', wild: true, tiles: ['7,5'] }); vi.advanceTimersByTime(1500); expect(warn).not.toHaveBeenCalled();
  });
  it('colour: violet that warms into the element with the stage; raw stays violet', () => {
    expect(stageColour(0, ELEMENTS.raw).toUpperCase()).toBe(SOUL_INK.toUpperCase());
    expect(stageColour(4, ELEMENTS.fire)).not.toBe(stageColour(0, ELEMENTS.fire));
    expect(toneEl({ tone: 'storm' }).id).toBe('shock'); expect(toneEl({ tone: 'frost' }).id).toBe('freeze'); expect(toneEl({ tone: 'raw' }).id).toBe('raw'); expect(toneEl({ element: 'acid', tone: 'acid' }).id).toBe('acid');
  });
  it('the Short stops the heart: the sound ducks to near silence, then a crack', () => {
    const duck = vi.spyOn(sfxMod, 'duckSfx').mockImplementation(() => {});
    playFx({ k: 'short', unit: 'u', at: '2,5', held: false, tone: 'raw', strain: 9, limit: 6 });
    expect(names()).not.toContain('soul_crack'); vi.advanceTimersByTime(400); expect(duck).toHaveBeenCalled(); expect(duck.mock.calls[0][0]).toBeLessThan(0.2);
    vi.advanceTimersByTime(800); expect(names()).toContain('soul_crack');
    duck.mockRestore();
  });
  it('Strain far from the limit is only a number; near it, the beat tightens', () => {
    playFx({ k: 'strain', unit: 'u', at: '2,5', strain: 1, limit: 6, by: 1, over: 0 }); expect(names()).toEqual([]);
    playFx({ k: 'strain', unit: 'u', at: '2,5', strain: 5, limit: 6, by: 1, over: 0 }); expect(callsOf('soul_thump')[0][1].rate).toBeGreaterThan(1.2);
  });
  it('turn-start calm is silent; the others breathe out; let go sighs; calm under let go does not breathe twice', () => {
    playFx({ k: 'calm', unit: 'u', at: '2,5', way: 'turn', by: 1 }); expect(names()).toEqual([]);
    playFx({ k: 'calm', unit: 'u', at: '2,5', way: 'letgo', by: 2 }); expect(names()).toEqual([]);
    playFx({ k: 'calm', unit: 'u', at: '2,5', way: 'fight', by: 1 }); expect(names()).toEqual(['soul_breath_out']);
  });
  it('under reduced motion every heart effect still plays, briefly', () => {
    const rm = vi.spyOn(sfxMod, 'reducedMotion').mockReturnValue(true), warn = vi.spyOn(console, 'warn');
    ctx(); for (const e of SOUL_EVENTS) playFx(e);
    expect(heartNode(3, 'fire', true).dataset.heart).toBe('3');
    vi.advanceTimersByTime(3000); expect(warn).not.toHaveBeenCalled(); rm.mockRestore();
  });
});

describe('the held heart stands over its holder', () => {
  const U = (o: any) => ({ id: 'u', pos: '2,5', side: 'pc', name: 'Wren', mg: { held: { design: 'd', stage: 2, tone: 'fire', form: 'burst', watch: false } }, ...o });
  const game = (units: any[]) => ({ code: 'X', characters: {}, story: { zones: [] }, combat: { zones: [], units } }) as any;
  it('reads every holder (an enemy only in sight), with stage, tone and the overwatch eye; follows the holder', () => {
    const items = ambientOf(game([U({}), U({ id: 'f', side: 'foe', pos: '9,9', mg: { held: { stage: 4, tone: 'storm', watch: true } } }), U({ id: 'g', side: 'foe', pos: '1,1', mg: { held: { stage: 1, tone: 'raw' } } }), U({ id: 'd', dead: true }), U({ id: 'n', mg: { held: null } })]), 'combat', new Set(['1,1']));
    expect(items.map((i) => i.unit).sort()).toEqual(['g', 'u']);
    expect(items.find((i) => i.unit === 'u')).toMatchObject({ kind: 'heart', element: 'fire', stage: 2, watch: false, tile: '2,5', mine: true });
    expect(items.find((i) => i.unit === 'g')).toMatchObject({ element: 'raw', mine: false });
    expect(ambientOf(game([U({ id: 'f', side: 'foe', pos: '9,9', mg: { held: { stage: 4, tone: 'storm', watch: true } } })]), 'combat')[0]).toMatchObject({ element: 'shock', watch: true, stage: 4 });
    expect(ambientOf(game([U({})]), 'main')).toEqual([]);
  });
  it('an elemental heart hums its aura\'s bed (softened), louder as it grows; raw has none', () => {
    const l2 = loopsFor(ambientOf(game([U({})]), 'combat')), l4 = loopsFor(ambientOf(game([U({ mg: { held: { stage: 4, tone: 'fire' } } })]), 'combat'));
    expect(Object.keys(l2)).toEqual(['soul_fire_loop']); expect(l4.soul_fire_loop!).toBeGreaterThan(l2.soul_fire_loop!);
    expect(loopsFor(ambientOf(game([U({ mg: { held: { stage: 3, tone: 'raw' } } })]), 'combat'))).toEqual({});
    for (const t of ['fire', 'storm', 'frost', 'stone', 'gale', 'acid']) { const l = loopsFor(ambientOf(game([U({ mg: { held: { stage: 1, tone: t } } })]), 'combat')); const k = Object.keys(l)[0] as sfxMod.Sfx; expect(LOOP_SFX, t).toContain(k); expect(LOOP_OPTS[k]?.lowpass, t).toBeGreaterThan(0); }
  });
  it('one node per holder; a new stage or the eye rebuilds it; moving keeps it; letting go drops it', () => {
    vi.useFakeTimers(); grid();
    syncAmbient(ambientOf(game([U({})]), 'combat')); expect(ambientCount()).toBe(1);
    const node = () => document.querySelector('[data-heart]') as HTMLElement;
    expect(node().dataset.heart).toBe('2'); expect(node().dataset.aura).toBe('fire'); expect(node().dataset.watch).toBeUndefined();
    const first = node(); syncAmbient(ambientOf(game([U({ pos: '3,5' })]), 'combat')); expect(node()).toBe(first);
    syncAmbient(ambientOf(game([U({ mg: { held: { stage: 3, tone: 'fire', watch: true } } })]), 'combat')); expect(ambientCount()).toBe(1); expect(node().dataset.heart).toBe('3'); expect(node().dataset.watch).toBe('1');
    syncAmbient(ambientOf(game([U({ mg: { held: null } })]), 'combat')); expect(ambientCount()).toBe(0);
    clearAmbient(); vi.useRealTimers();
  });
  it('every tone has its aura in the node', () => {
    for (const t of ['fire', 'shock', 'freeze', 'stone', 'gale', 'acid', 'raw']) { const n = heartNode(2, t, false); expect(n.dataset.aura).toBe(t); expect(n.querySelector('[data-core]')).toBeTruthy(); expect(n.childElementCount).toBeGreaterThan(t === 'raw' ? 2 : 3); }
  });
});

describe('the heart\'s sounds are real files, small, mono and credited', () => {
  it('each Soul sound has its file; the new ones are under 40 KB; the CC-BY one is credited with its licence', () => {
    for (const k of Object.keys(SFX_FILES).filter((x) => x.startsWith('soul_'))) {
      const f = SFX_FILES[k as sfxMod.Sfx]!; for (const x of Array.isArray(f) ? f : [f]) { const p = resolve(PUBLIC, x.slice(1)); expect(existsSync(p), x).toBe(true); if (x.includes('/soul_')) expect(statSync(p).size, x).toBeLessThan(40000); }
    }
    const credited = SFX_CREDITS.map((c) => c.what + ' ' + (c.url || '') + ' ' + (c.licence || '')).join(' ');
    for (const k of ['heartbeat-single-sound', 'sound-effects-pack', 'ghost-breath', 'wisdom-magic', 'deep-bone-crackbreak-sfx']) expect(credited).toContain(k);
    expect(SFX_CREDITS.find((c) => /wisdom-magic/.test(c.url || ''))?.licence).toBe('CC-BY 3.0');
    // Credited as the authors ask: Wisdom Magic "by Iwan Gabovitch http://opengameart.org/users/qubodup"; the heartbeat is Independent.nu's.
    expect(SFX_CREDITS.find((c) => /wisdom-magic/.test(c.url || ''))?.who).toMatch(/Iwan Gabovitch.*opengameart\.org\/users\/qubodup/);
    expect(SFX_CREDITS.find((c) => /heartbeat-single-sound/.test(c.url || ''))?.who).toMatch(/^Independent\.nu/);
  });
});

// ---------- the real engine's heart ----------
const arch = (id: string) => ARCHETYPES.find((a: any) => a.id === id)!;
const sheet = (name: string): Sheet => { const a = arch('stormcaller'); return { name, portrait: '', origin: 'Central City', kit: 'soul', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any; };
describe('the engine\'s own heart events play', () => {
  it('Begin, Pump ×3, swell, watch, release (each form and tone), let go, steady and a Short through the real engine all draw, every kind handled', () => {
    vi.useFakeTimers(); grid();
    const kinds = new Set<string>(), warn = vi.spyOn(console, 'warn'), snd = vi.spyOn(sfxMod, 'sfx').mockImplementation(() => {});
    for (const [form, tone] of [['burst', 'fire'], ['bolt', 'storm'], ['wave', 'frost'], ['aura', 'stone'], ['lance', 'gale'], ['burst', 'acid'], ['bolt', 'raw']] as const) {
      const c = newCharacter('c1', 'p1', sheet('Wren'));
      const yard = { ...MAPS.yard, cover: [], full: [], solid: [], difficult: [] };
      const cb = startCombat('t', yard as any, [{ c, pos: '2,5' }], [{ name: 'Guard', tier: 'minion', weapon: 'service_pistol', at: refOf('4,5') }, { name: 'Guard 2', tier: 'minion', weapon: 'service_pistol', at: refOf('3,5') }] as any, 'easy', { state: 7 }, []);
      const u = cb.units.find((x) => x.side === 'pc')!, rng = { state: 7 };
      for (const e of cb.units.filter((v) => v.side === 'foe')) { e.hp = e.maxHp = 500; (e as any).def = -99; }
      u.hp = u.maxHp = 500; u.mg!.mp = u.mg!.mpMax = 999;
      const d = u.mg!.designs[0]; d.tone = tone as any; d.modules = [...d.modules.filter((m: string) => !['wave', 'burst', 'aura', 'lance'].includes(m)), ...(form === 'bolt' ? [] : [form])];
      u.ap = 99; const aim = form === 'aura' ? u.pos : '4,5';
      expect(beginOutburst(cb, rng, u, d.id, undefined, true), form + tone).toBeNull();
      if (form === 'burst' && tone === 'fire') { setHeartWatch(cb, u, true); setHeartWatch(cb, u, false); }
      for (let i = 0; i < 3; i++) { u.ap = 99; pumpOutburst(cb, rng, u); }
      magicTurnStart(cb, rng, u); u.ap = 99;
      if (form === 'lance') { u.mg!.strain = 0; cb.turn = cb.order!.indexOf(u.id); expect(steadyHeart(cb, u), 'steady').toBeNull(); expect(letGo(cb, u), 'letgo').toBeNull(); } else expect(releaseOutburst(cb, rng, u, aim), form + tone).toBeNull();
      if (tone === 'raw') { u.mg!.strain = u.mg!.strainLimit + 2; beginOutburst(cb, rng, u, d.id, undefined, true); addStrain(cb, rng, u, 3, 'test'); }
      setContext({ code: 'X', characters: {}, story: { positions: {}, npcs: [] }, combat: cb } as any, 'combat');
      for (const e of cb.fx || []) { kinds.add(e.k); playFx(e); }
      vi.advanceTimersByTime(3000);
    }
    expect(warn).not.toHaveBeenCalled();
    for (const k of ['outburst', 'pump', 'swell', 'hold', 'release', 'letgo', 'steady', 'strain', 'short']) expect(kinds, k).toContain(k);
    const handled = new Set(['roll' /* a roll's numbers: no drawing, no beat */, 'turn', 'hurt', 'heal', 'down', 'cond', 'mana', 'miss', 'shove', 'chain', 'explode', 'outburst', 'pump', 'swell', 'hold', 'aura_tick', 'release', 'heart_overwatch', 'resonance', 'feed', 'calm', 'letgo', 'steady', 'strain', 'burn', 'short', 'infusion', 'charge', 'shield']);
    for (const k of kinds) expect(handled, k).toContain(k);
    snd.mockRestore(); clearFx(); vi.advanceTimersByTime(20000); vi.useRealTimers();
  });
});
