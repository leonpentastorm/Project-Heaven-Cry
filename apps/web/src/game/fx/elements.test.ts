// @vitest-environment jsdom
// The element effect system (fx/elements.ts) and the rules 1.4 Sigil effects (fx/play.ts, fx/ambient.ts): every element
// of the data has a look, a trail, a field, a decal and sounds that exist; both families (Sigil, Soul) draw it; every
// event the engine emits for Sigils plays, and the real engine's events do too; the standing fields and turrets follow
// the game state, with their sound beds; events for the other side's eyes draw nothing.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ARCHETYPES, MAPS, SIGIL, SIGIL_ELEMENTS, newCharacter, startCombat, refOf, d20, drawGlyph, evoke,
  type Sheet, type Combat, type Unit, type MapDef,
} from '@engine';
import { ELEMENTS, ELEMENT_IDS, FAMILY, colourAt, elementFx, elementId, familyStyle, elementImpact, elementTrail, fieldNode, turretNode, shardCss } from './elements';
import { ambientOf, loopsFor, syncAmbient, clearAmbient, ambientCount } from './ambient';
import { setLayer } from './dom';
import { playFx, setContext, clearFx, queueFx, fxBusyUntil } from './play';
import * as sfxMod from '../sfx';
import { SFX_FILES, LOOP_SFX } from '../sfx';
import { SFX_CREDITS } from '../sfxCredits';
import { SIGIL_INK, SOUL_INK } from '../glyphs';

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
const HEX = /^#[0-9A-F]{6}$/i;

describe('the element system', () => {
  it('every element in the data has a full look in both families, and its sounds are real files', () => {
    const dataEls = Object.keys(SIGIL_ELEMENTS);
    expect(dataEls.length).toBeGreaterThanOrEqual(7);
    for (const id of [...dataEls, 'raw']) {
      const el = elementFx(id);
      expect(el.id).toBe(id);
      for (const c of [el.ink, el.core, el.dark]) expect(c).toMatch(HEX);
      expect(el.sprites.length).toBeGreaterThan(0);
      for (const s of el.sprites) expect(existsSync(resolve(PUBLIC, 'fx', s.name + (/^(boom|fireflash|smoke_black|puff)/.test(s.name) ? '.webp' : '.png')))).toBe(true);
      if (el.decal) expect(existsSync(resolve(PUBLIC, 'fx', el.decal.name + '.png'))).toBe(true);
      for (const snd of [el.sound.impact, el.sound.tick, el.sound.extra, el.sound.loop].filter(Boolean) as sfxMod.Sfx[]) {
        const f = SFX_FILES[snd]; expect(f, id + ' ' + snd).toBeTruthy();
        for (const x of Array.isArray(f) ? f : [f!]) expect(existsSync(resolve(PUBLIC, x.slice(1))), x).toBe(true);
      }
      if (el.sound.loop) expect(LOOP_SFX).toContain(el.sound.loop);
      // Both families can draw it.
      expect(shardCss(el, 'sigil')).toContain('background');
      expect(shardCss(el, 'soul')).toContain('border-radius:50%');
    }
    // The motion follows the data's identity table.
    for (const id of dataEls) expect(elementFx(id).motion).toBe((SIGIL_ELEMENTS as any)[id].motion);
  });
  it('every element Subject word maps to its own element; aliases land on the same ids; anything else is raw', () => {
    for (const w of Object.keys(SIGIL)) if (SIGIL[w].class === 'subject_element') expect(elementId(w)).toBe(w);
    expect(elementId('ice')).toBe('freeze'); expect(elementId('lightning')).toBe('shock'); expect(elementId('earth')).toBe('stone');
    expect(elementId('wind')).toBe('gale'); expect(elementId('corroded')).toBe('acid'); expect(elementId('FIRE')).toBe('fire');
    for (const x of [null, undefined, '', 'mend', 'ward', 'step', 'bind', 'nonsense']) expect(elementId(x as any)).toBe('raw');
    expect(ELEMENT_IDS).toEqual(Object.keys(ELEMENTS));
  });
  it('Sigils are cyan squares that snap; Soul is violet smoke that swells and warms into the element', () => {
    const sg = familyStyle('sigil'), so = familyStyle('soul');
    expect(sg.edge).toBe(SIGIL_INK); expect(sg.radius).not.toBe('50%'); expect(sg.easing).toMatch(/^steps/); expect(sg.swell).toBe(false); expect(sg.turn).toBe(90);
    expect(so.edge).toBe(SOUL_INK); expect(so.radius).toBe('50%'); expect(so.easing).not.toMatch(/steps/); expect(so.swell).toBe(true); expect(so.tempo).toBeGreaterThan(1);
    expect(familyStyle(undefined)).toBe(FAMILY.sigil);
    // A Soul particle starts violet and ends as the element; a Sigil one is the element from the first frame.
    expect(colourAt(ELEMENTS.fire, 'soul', 0).toUpperCase()).toBe(SOUL_INK.toUpperCase());
    expect(colourAt(ELEMENTS.fire, 'soul', 1).toUpperCase()).toBe(ELEMENTS.fire.ink.toUpperCase());
    expect(colourAt(ELEMENTS.fire, 'sigil', 0)).toBe(ELEMENTS.fire.ink);
    // Nothing in the Sigil family is Soul violet.
    for (const id of ELEMENT_IDS) expect(shardCss(ELEMENTS[id], 'sigil').toUpperCase()).not.toContain(SOUL_INK.toUpperCase());
  });
  it('the new sound files are all credited, small and mono-sized', () => {
    const names = Object.entries(SFX_FILES).filter(([k]) => /^(el|sg)_/.test(k)).flatMap(([, f]) => (Array.isArray(f) ? f : [f!]));
    expect(names.length).toBeGreaterThan(30);
    const credited = SFX_CREDITS.map((c) => c.what + ' ' + (c.url || '')).join(' ');
    for (const k of ['catching-fire', 'fire-crackling', 'ice-spells', 'electricity-game-sound-pack', 'breaking-rock', 'wind-whoosh-loop', '40-cc0-water-splash-slime-sfx', 'energy-drain', 'magic-spell-sfx', 'rpg-sound-pack', 'spell-sounds']) expect(credited).toContain(k);
    for (const c of SFX_CREDITS) if (c.licence) expect(c.licence).toMatch(/^(CC0|CC-BY [0-9.]+)$/);
  });
  it('impacts, trails, fields and turrets draw in both families and clean up', () => {
    vi.useFakeTimers(); const layer = grid();
    const p = { x: 200, y: 200, s: 40 }, q = { x: 400, y: 120, s: 40 };
    const heard: string[] = [];
    for (const id of ELEMENT_IDS) for (const fam of ['sigil', 'soul'] as const) {
      elementImpact(p, id, fam, { power: 1, crit: true, decalKey: '5,5', sound: (s) => heard.push(s) });
      for (const k of ['bolt', 'lob', 'touch', 'appear'] as const) elementTrail(p, q, id, fam, k, { glyph: '<svg></svg>' });
      expect(fieldNode(id, fam).dataset.field).toBe(id);
      expect(turretNode(id, fam === 'sigil').dataset.turret).toBe(id);
    }
    expect(heard).toContain('el_fire'); expect(heard).toContain('el_acid'); expect(heard).toContain('el_shatter'); // freeze crits shatter
    expect(layer.childElementCount).toBeGreaterThan(50);
    vi.advanceTimersByTime(12000); expect(layer.childElementCount).toBe(0);
    vi.useRealTimers();
  });
});

describe('the 1.4 Sigil effects', () => {
  let spy: any;
  beforeEach(() => { vi.useFakeTimers(); grid(); setContext(story(), 'main'); spy = vi.spyOn(sfxMod, 'sfx').mockImplementation(() => {}); });
  afterEach(() => { spy.mockRestore(); clearFx(); clearAmbient(); vi.advanceTimersByTime(20000); vi.useRealTimers(); });
  const names = () => spy.mock.calls.map((c: any[]) => c[0]);
  const M = (o: any) => ({ origin: '2,5', kind: 'bolt', path: ['3,5', '4,5'], blockedAt: null, impact: '6,5', arc: null, hops: [], burst: ['6,5'], core: '6,5', chain: [], placed: null, ...o });

  it('every event the engine documents for Sigils plays without an error and draws something', () => {
    const layer = document.body.lastElementChild as HTMLElement;
    const evs: any[] = [
      { k: 'draw', unit: 'u', at: '2,5', tile: '2,5', word: 'fire', side: 'pc', group: 'subject', cls: 'subject_element', element: 'fire', effect: 'starts', words: ['fire'] },
      { k: 'draw', unit: 'u', at: '3,5', tile: '3,5', word: 'seek', side: 'pc', group: 'reach', effect: 'extends', words: ['fire', 'seek'] },
      { k: 'glyph_fade', tile: '4,4', word: 'fire', side: 'pc', why: 'cap' },
      { k: 'evoke', unit: 'u', at: '2,5', shape: 'line', tiles: ['2,5', '3,5'], words: ['fire', 'seek'], element: 'fire', side: 'pc', facing: 'along', missiles: [M({ kind: 'bolt', blockedAt: '5,5' })] },
      { k: 'evoke', unit: 'u', at: '2,5', tiles: ['2,5', '3,5', '4,5'], words: ['freeze', 'arc', 'spread'], element: 'freeze', missiles: [M({ kind: 'lob', arc: { from: '2,5', to: '8,5' }, impact: '8,5', burst: ['8,5', '7,5', '9,5', '8,4', '8,6'], core: '8,5' })] },
      { k: 'evoke', unit: 'u', at: '2,5', tiles: ['2,5', '3,5'], words: ['shock', 'sense'], element: 'shock', missiles: [M({ kind: 'appear', impact: '9,3' })] },
      { k: 'evoke', unit: 'u', at: '2,5', tiles: ['2,5', '3,5'], words: ['quicken', 'relay'], element: null, missiles: [M({ kind: 'relay', hops: ['4,6'], impact: '7,6' })] },
      { k: 'evoke', unit: 'u', at: '2,5', tiles: ['2,5', '3,5', '4,5'], words: ['fire', 'twice', 'seek'], element: 'fire', missiles: [M({}), M({ impact: '6,7', burst: ['6,7'] })] },
      { k: 'evoke', unit: 'u', at: '2,5', tiles: ['2,5', '3,5'], words: ['acid', 'push'], element: 'acid', missiles: [M({ kind: 'touch', impact: '3,5', burst: ['3,5', '4,4', '4,5', '4,6'] })] },
      { k: 'evoke', unit: 'u', at: '2,5', tiles: ['2,5'], words: ['fire', 'stay'], element: 'fire', stay: true, missiles: [M({ placed: 'field' })] },
      { k: 'evoke', unit: 'u', at: '2,5', tiles: ['2,5'], words: ['bind', 'seek'], element: null, fizzle: true, missiles: [M({})] },
      { k: 'evoke', unit: 'u', at: '1,1', shape: 'line', tiles: ['1,2', '2,2'], src: '2,2', impact: '6,2', targets: ['t'], element: 'shock' }, // a 1.2 event in an old log
      { k: 'chain', from: '6,5', to: '7,6', target: 't', jump: 1, mult: 0.75, element: 'shock' }, { k: 'chain', from: '7,6', to: '8,5', target: 't2', jump: 2, mult: 0.56, element: 'shock' },
      { k: 'fizzle', unit: 'u', at: '2,5', tiles: ['6,5'], words: ['bind', 'seek'], element: null },
      { k: 'field', id: 'z1', tiles: ['6,5', '7,5', '6,6'], words: ['fire', 'stay', 'spread'], element: 'fire', side: 'pc', by: 'u', rounds: 2 },
      { k: 'field_tick', id: 'z1', target: 't', at: '6,5', element: 'fire', side: 'pc' }, { k: 'field_gone', id: 'z1', tiles: ['6,5', '7,5'], side: 'pc', why: 'time' },
      { k: 'trap_set', id: 'z2', tile: '5,7', side: 'pc', by: 'u', words: ['fire', 'wait'], element: 'fire', only: 'pc' },
      { k: 'trap_spotted', id: 'z9', tile: '9,8', by: 'u', side: 'pc', only: 'pc', kind: 'trap' },
      { k: 'trap_sprung', id: 'z2', tile: '5,7', target: 't', element: 'fire', side: 'pc', words: ['fire', 'wait'] }, { k: 'trap_gone', id: 'z2', tile: '5,7', side: 'pc', why: 'sprung', only: 'pc' },
      { k: 'turret_placed', id: 'z3', tile: '4,2', side: 'pc', by: 'u', words: ['shock', 'watch', 'seek'], element: 'shock', hidden: false },
      { k: 'turret_shot', id: 'z3', from: '4,2', to: '9,2', target: 't', element: 'shock', side: 'pc', path: ['5,2'], kind: 'bolt', burst: ['9,2'], chain: [] },
      { k: 'turret_shot', id: 'z3', from: '4,2', to: '9,4', target: 't', element: 'stone', side: 'pc', path: [], kind: 'lob', burst: ['9,4'], chain: [] },
      { k: 'turret_destroyed', id: 'z3', tile: '4,2', side: 'pc', why: 'hit' },
      { k: 'wall_raised', tiles: ['6,3', '6,4'], by: 'u', side: 'pc', hp: 30, rounds: 3 }, { k: 'wall_crumbled', tiles: ['6,3'], why: 'time' },
      { k: 'null_wave', at: '7,7', tiles: ['7,7', '8,7'], removed: 3, glyphs: ['8,7'], zones: ['z1'], walls: ['6,4'] },
      { k: 'blink', target: 'u', from: '2,5', to: '5,7', element: 'step' }, { k: 'mask', target: 'u', at: '5,7' }, { k: 'mask', target: 'u', at: '5,7', fade: true },
      { k: 'leech', unit: 'u', to: '2,5', from: ['6,5'], amount: 9, element: 'fire' },
      { k: 'command', target: 't', at: '8,5', order: 'move', to: '9,7', by: 'u' },
      ...['ward', 'mend', 'quicken', 'sharpen', 'cleanse'].map((w) => ({ k: 'boon', target: 'a', at: '3,7', word: w, amount: 25, cond: 'slowed' })),
      { k: 'veil', at: '8,5', tiles: ['8,5', '9,5'], side: 'pc' }, { k: 'light', at: '9,8', tiles: ['9,8'], side: 'pc' },
      { k: 'hurt', target: 't', at: '6,5', dmg: 12, why: 'sigil', element: 'fire' }, { k: 'hurt', target: 't', at: '6,5', dmg: 5, why: 'acid', element: 'acid' },
      { k: 'miss', unit: 'u', target: 't', at: '6,5', by: 'sigil', element: 'freeze' }, { k: 'cond', target: 't', at: '6,5', id: 'corroded', element: 'acid' },
      { k: 'shove', target: 't', from: '6,5', to: '4,5', ok: true, magic: true, pull: true }, { k: 'shove', target: 't', from: '6,5', to: '8,5', ok: true, magic: true },
      { k: 'overload', unit: 'u', at: '2,5' },
      { k: 'release', unit: 'u', at: '2,5', to: '7,5', stage: 2, area: 1, school: 'harm', element: 'fire', tiles: ['7,5', '8,5'] }, // a later elemental Outburst
    ];
    const warn = vi.spyOn(console, 'warn');
    for (const e of evs) { const before = layer.childElementCount; playFx(e); vi.advanceTimersByTime(1); if (!['glyph_fade', 'field_gone', 'trap_gone'].includes(e.k)) expect(layer.childElementCount + spy.mock.calls.length, e.k).toBeGreaterThan(before); }
    vi.advanceTimersByTime(1500);
    expect(warn).not.toHaveBeenCalled();
    const n = names();
    for (const s of ['sigil_draw', 'sigil_evoke', 'el_fire', 'el_freeze', 'el_zap', 'sg_fizzle', 'sg_trap_set', 'sg_trap_sprung', 'sg_turret', 'sg_turret_break', 'el_stone_rise', 'el_stone_crumble', 'sg_null', 'sg_blink', 'sg_mask', 'sg_leech', 'sg_command', 'sg_ward', 'sg_mend', 'sg_quicken', 'sg_sharpen', 'sg_cleanse', 'el_shatter', 'sg_light', 'sigil_overload']) expect(n, s).toContain(s);
    // Queued, they take their turns; a lobbed Evoke holds the stage longer than a bolt.
    queueFx(evs.slice(0, 6).map((e, i) => ({ n: i + 1, ...e }))); expect(fxBusyUntil()).toBeGreaterThan(performance.now() + 1500);
    vi.advanceTimersByTime(20000); expect(layer.childElementCount).toBe(0);
  });
  it('each element sounds like itself when a field goes down or a spell lands', () => {
    for (const el of ['fire', 'freeze', 'shock', 'stone', 'gale', 'spark', 'acid']) {
      spy.mockClear(); playFx({ k: 'field', id: 'z', tiles: ['6,5'], words: [el, 'stay'], element: el, side: 'pc', rounds: 2 });
      expect(names()).toContain(ELEMENTS[el as 'fire'].sound.impact);
      spy.mockClear(); playFx({ k: 'evoke', unit: 'u', at: '2,5', tiles: ['2,5', '3,5'], words: [el, 'seek'], element: el, missiles: [M({})] }); vi.advanceTimersByTime(1500);
      expect(names()).toContain(ELEMENTS[el as 'fire'].sound.impact);
    }
    spy.mockClear(); playFx({ k: 'chain', from: '6,5', to: '7,6', target: 't', jump: 3, element: 'shock' });
    const z = spy.mock.calls.find((c: any[]) => c[0] === 'el_zap'); expect(z?.[1]?.rate).toBeGreaterThan(1.3); // each jump rings higher
  });
  it('an event for the other side\'s eyes (an enemy trap going down) draws and sounds nothing here', () => {
    const layer = document.body.lastElementChild as HTMLElement;
    for (const k of ['trap_set', 'trap_spotted', 'trap_gone', 'turret_placed']) playFx({ k, id: 'z', tile: '5,5', side: 'foe', element: 'fire', only: 'foe' });
    expect(layer.childElementCount).toBe(0); expect(spy).not.toHaveBeenCalled();
    queueFx([{ n: 1, k: 'trap_set', tile: '5,5', only: 'foe' } as any]); // and takes no beat
    expect(fxBusyUntil()).toBeLessThan(performance.now() + 5);
  });
  it('under reduced motion every Sigil effect still plays, briefly', () => {
    const rm = vi.spyOn(sfxMod, 'reducedMotion').mockReturnValue(true);
    const warn = vi.spyOn(console, 'warn');
    playFx({ k: 'evoke', unit: 'u', at: '2,5', tiles: ['2,5', '3,5'], words: ['fire', 'arc'], element: 'fire', missiles: [M({ kind: 'lob' })] });
    playFx({ k: 'blink', target: 'u', from: '2,5', to: '5,7' }); playFx({ k: 'boon', target: 'a', at: '3,7', word: 'quicken' });
    playFx({ k: 'wall_raised', tiles: ['6,3'] }); playFx({ k: 'overload', unit: 'u', at: '2,5' });
    vi.advanceTimersByTime(2000); expect(warn).not.toHaveBeenCalled();
    rm.mockRestore();
  });
});

describe('standing fields and turrets', () => {
  const game = (zones: any[], screen: 'combat' | 'main' = 'combat') => (screen === 'combat' ? { code: 'X', characters: {}, story: { zones: [] }, combat: { zones, units: [] } } : { code: 'X', characters: {}, story: { zones }, combat: null }) as any;
  const Z = (o: any) => ({ id: 'z1', kind: 'field', tiles: ['5,5', '6,5'], words: ['fire', 'stay'], by: 'u', side: 'pc', left: 2, mult: 0.5, who: 'Ilse', element: 'fire', ...o });
  it('reads every field tile and turret the squad may see, and leaves secrets and unseen enemy magic out', () => {
    const zones = [Z({}), Z({ id: 'z2', kind: 'turret', tiles: ['8,8'], element: 'shock' }), Z({ id: 'z3', kind: 'trap', tiles: ['3,3'], side: 'foe' }),
      Z({ id: 'z4', kind: 'turret', tiles: ['9,9'], side: 'foe', hidden: true }), Z({ id: 'z5', side: 'foe', tiles: ['1,1', '2,2'], element: 'acid' }), Z({ id: 'z6', kind: 'wall', tiles: ['4,4'], element: null, words: ['stone', 'seek'] })];
    const items = ambientOf(game(zones), 'combat', new Set(['1,1']));
    expect(items.map((i) => i.key).sort()).toEqual(['z1|5,5', 'z1|6,5', 'z2|8,8', 'z5|1,1', 'z6|4,4']);
    expect(items.find((i) => i.key === 'z2|8,8')).toMatchObject({ kind: 'turret', element: 'shock', mine: true });
    expect(items.find((i) => i.key === 'z6|4,4')?.element).toBe('stone'); // an old 1.2 wall reads its element from its words
    expect(ambientOf(game(zones), 'main')).toEqual([]); // the area map reads the story's zones, not the fight's
    expect(ambientOf(game([Z({})], 'main'), 'main').length).toBe(2);
    expect(ambientOf(null, 'combat')).toEqual([]);
  });
  it('one sound bed per element with a field, a little louder for more tiles; turrets and stone have none', () => {
    const items = ambientOf(game([Z({}), Z({ id: 'a', element: 'acid', tiles: ['1,1'] }), Z({ id: 's', element: 'stone', tiles: ['2,2'] }), Z({ id: 't', kind: 'turret', tiles: ['8,8'], element: 'gale' })]), 'combat');
    const l = loopsFor(items);
    expect(Object.keys(l).sort()).toEqual(['el_acid_loop', 'el_fire_loop']);
    expect(l.el_fire_loop!).toBeGreaterThan(l.el_acid_loop!);
    expect(loopsFor([])).toEqual({});
  });
  it('keeps one standing look per item, drops it when the zone is gone, and sets the loops to match', () => {
    vi.useFakeTimers(); grid();
    const loops = vi.spyOn(sfxMod, 'setSfxLoops');
    syncAmbient(ambientOf(game([Z({}), Z({ id: 'z2', kind: 'turret', tiles: ['8,8'], element: 'shock' })]), 'combat'));
    expect(ambientCount()).toBe(3); expect(loops).toHaveBeenLastCalledWith({ el_fire_loop: expect.any(Number) });
    syncAmbient(ambientOf(game([Z({})]), 'combat')); expect(ambientCount()).toBe(2); // same fire field: the same nodes stay
    syncAmbient([]); expect(ambientCount()).toBe(0); expect(loops).toHaveBeenLastCalledWith({});
    loops.mockRestore(); vi.useRealTimers();
  });
});

// ---------- the real engine's events ----------
const arch = (id: string) => ARCHETYPES.find((a: any) => a.id === id)!;
const sheet = (name: string): Sheet => { const a = arch('sigilist'); return { name, portrait: '', origin: 'Central City', kit: 'sigil', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any; };
const open = (): MapDef => ({ ...MAPS.yard, w: 14, h: 10, cover: [], full: [], solid: [], difficult: [], pcStart: ['2,5', '2,6', '2,7', '2,8'], foeStart: ['9,5', '9,6', '9,7', '9,8'] } as any);
function seed(n = 16): { state: number } { for (let s = 1; s < 200000; s++) { const r = { state: s }; let ok = true; for (let i = 0; i < n && ok; i++) { const v = d20(r); ok = v > 1 && v < 20; } if (ok) return { state: s }; } throw new Error('no seed'); }
function fight(words: string[]) {
  const c = newCharacter('c1', 'p1', sheet('Ilse')), a = newCharacter('a1', 'p1', sheet('Ally'));
  const cb: Combat = startCombat('t', open(), [{ c, pos: '2,5' }, { c: a, pos: '2,7' }], [{ name: 'Foe', tier: 'minion', weapon: 'service_pistol', at: refOf('7,5') }, { name: 'Foe 2', tier: 'minion', weapon: 'service_pistol', at: refOf('8,6') }] as any, 'easy', { state: 7 }, []);
  cb.objects = [];
  const u = cb.units.find((x) => x.charId === 'c1')!;
  for (const x of cb.units.filter((v) => v.side === 'pc')) { x.ap = 99; x.mg!.words = [...words]; x.mg!.maxWords = 4; x.mg!.charge = 999; x.mg!.flux = -99; x.hp = x.maxHp = 500; }
  for (const e of cb.units.filter((v) => v.side === 'foe')) { (e as any).def = -99; e.hp = e.maxHp = 500; (e as any).sv = { body: -99, brain: -99, heart: -99 }; }
  return { cb, u, rng: seed() };
}
function cast(words: string[], tiles: string[], at: string, target: (cb: Combat, u: Unit) => string, opts: any = {}) {
  const { cb, u, rng } = fight(words);
  for (let i = 0; i < words.length; i++) { u.pos = tiles[i]; const e = drawGlyph(cb, rng, u, words[i]); if (e) throw new Error(words.join('·') + ': ' + e); }
  const err = evoke(cb, rng, u, at, target(cb, u), opts);
  if (err) throw new Error(words.join('·') + ': ' + err);
  return cb;
}
describe('the engine\'s own Sigil events play', () => {
  it('spells cast through the real engine give events this layer draws, every one', () => {
    vi.useFakeTimers(); grid();
    const foe = (cb: Combat) => cb.units.find((x) => x.side === 'foe')!.pos, ally = (cb: Combat, u: Unit) => { const a = cb.units.find((x) => x.side === 'pc' && x !== u)!; a.pos = '6,5'; return a.pos; };
    const spells: [string[], string[], string, (cb: Combat, u: Unit) => string, any?][] = [
      [['fire', 'seek'], ['4,5', '3,5'], '3,5', foe], [['freeze', 'spread', 'arc'], ['5,5', '4,5', '3,5'], '3,5', foe], [['shock', 'seek', 'chain', 'chain'], ['5,5', '4,5', '3,5', '2,5'], '2,5', foe],
      [['fire', 'twice', 'seek'], ['5,5', '4,5', '3,5'], '3,5', foe], [['bind', 'pull', 'seek'], ['5,5', '4,5', '3,5'], '3,5', foe], [['fire', 'leech', 'seek'], ['5,5', '4,5', '3,5'], '3,5', foe],
      [['acid', 'seek'], ['4,5', '3,5'], '3,5', foe], [['fire', 'push'], ['4,5', '3,5'], '3,5', () => '5,5'], [['ward', 'seek'], ['4,5', '3,5'], '3,5', ally], [['cleanse', 'seek'], ['4,5', '3,5'], '3,5', ally],
      [['veil', 'seek'], ['4,5', '3,5'], '3,5', () => '8,5'], [['step', 'condense'], ['3,5', '2,5'], '2,5', (_c, u) => u.pos, { dest: '4,8' }],
      [['raise', 'seek'], ['4,5', '3,5'], '3,5', () => '5,5'], [['fire', 'stay'], ['4,5', '3,5'], '3,5', () => '5,5'], [['fire', 'wait'], ['4,5', '3,5'], '3,5', () => '5,5'],
      [['shock', 'watch', 'seek'], ['5,5', '4,5', '3,5'], '3,5', () => '6,5'], [['mask', 'condense'], ['3,5', '2,5'], '2,5', (_c, u) => u.pos],
    ];
    const kinds = new Set<string>(), warn = vi.spyOn(console, 'warn'), snd = vi.spyOn(sfxMod, 'sfx').mockImplementation(() => {});
    for (const [w, t, at, tg, o] of spells) {
      const cb = cast(w, t, at, tg, o);
      setContext({ code: 'X', characters: {}, story: { positions: {}, npcs: [] }, combat: cb } as any, 'combat');
      for (const e of cb.fx || []) { kinds.add(e.k); playFx(e); }
      vi.advanceTimersByTime(2000);
    }
    expect(warn).not.toHaveBeenCalled();
    for (const k of ['draw', 'evoke', 'chain', 'leech', 'boon', 'veil', 'blink', 'wall_raised', 'field', 'trap_set', 'turret_placed', 'mask', 'hurt']) expect(kinds, k).toContain(k);
    // Every kind the engine sent has a handler here.
    const handled = new Set(['turn', 'move', 'shot', 'melee', 'volley', 'reload', 'load', 'clear', 'repair', 'core', 'crystallise', 'stim', 'heal', 'hurt', 'shield', 'down', 'explode', 'object', 'door', 'trap', 'shove', 'stance', 'analyze', 'pickup', 'cover', 'draw', 'glyph_fade', 'scuff', 'evoke', 'chain', 'fizzle', 'field', 'field_tick', 'field_gone', 'trap_set', 'trap_spotted', 'trap_sprung', 'trap_gone', 'turret_placed', 'turret_shot', 'turret_destroyed', 'wall_raised', 'wall_crumbled', 'null_wave', 'blink', 'mask', 'leech', 'command', 'boon', 'veil', 'light', 'miss', 'cond', 'overload', 'vent', 'outburst', 'grow', 'release', 'short', 'syphon', 'mana', 'song']);
    for (const k of kinds) expect(handled, k).toContain(k);
    snd.mockRestore(); clearFx(); vi.advanceTimersByTime(20000); vi.useRealTimers();
  });
});
