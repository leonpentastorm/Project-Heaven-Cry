// @vitest-environment jsdom
// The settings cog's plumbing (docs/design/ui-pass-shell.md 6 and 7): every sound has a bus, the old one-slider
// settings move onto the new mix, the buses multiply as they say, the combat-speed agreement with the combat track,
// and the floating buttons' opacity.
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { busOf, busLevel, musicLevel, parseUiPrefs, DEFAULT_UI_PREFS, SFX_FILES, type Sfx } from './sfx';
import { getCombatSpeed, setCombatSpeed, COMBAT_SPEED_EVENT } from './combatSpeed';
import { floatOpacity, distToRect } from './floaters';

describe('the two effect buses', () => {
  it('every sound name the game knows sits on a bus; interface sounds on ui, the world on combat', () => {
    // Every name in the Sfx type: read from the source so a new name is checked too.
    const src = readFileSync(join(__dirname, 'sfx.ts'), 'utf8');
    const names = new Set<string>([...src.matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1]).filter((n) => n in SFX_FILES || /^(hover|click|start|back|slide|slide_back|error|toggle|tab|stamp|wick_hello|wick_steps|shot|hit|miss|reload|melee|down|draw|evoke|overload|outburst|release|short)$/.test(n)));
    expect(names.size).toBeGreaterThan(100);
    for (const n of names) expect(['combat', 'ui']).toContain(busOf(n as Sfx));
    for (const n of ['hover', 'click', 'start', 'back', 'tab', 'toggle', 'error', 'stamp'] as Sfx[]) expect(busOf(n)).toBe('ui');
    for (const n of ['gun_rifle', 'burst_smg', 'explosion', 'hit_flesh', 'reload_mag', 'sigil_evoke', 'el_fire', 'soul_thump', 'feel_pump_warm', 'shot', 'hit', 'step', 'door_open', 'miracle_sting'] as Sfx[]) expect(busOf(n)).toBe('combat');
  });
  it('a bus is master × its volume; mute silences both and the music', () => {
    const p = { ...DEFAULT_UI_PREFS, master: 80, combat: 150, ui: 35, music: 50 };
    expect(busLevel('combat', p)).toBeCloseTo(1.2);
    expect(busLevel('ui', p)).toBeCloseTo(0.28);
    expect(musicLevel(p)).toBeCloseTo(0.4);
    const m = { ...p, mute: true };
    expect(busLevel('combat', m)).toBe(0); expect(busLevel('ui', m)).toBe(0); expect(musicLevel(m)).toBe(0);
  });
  it('the new mix by default: a gunshot\'s bus is well above a click\'s', () => {
    const d = parseUiPrefs(null);
    expect(d).toEqual(DEFAULT_UI_PREFS);
    expect(busLevel('combat', d) / busLevel('ui', d)).toBeGreaterThan(2.5);
  });
  it('an old save (one effects slider) moves onto the new mix and keeps the rest', () => {
    const p = parseUiPrefs(JSON.stringify({ sfx: 60, music: 40, mute: false, reduceMotion: true, cutins: 'scene' }));
    expect(p).toMatchObject({ combat: 100, ui: 35, master: 100, music: 40, reduceMotion: true, cutins: 'scene', float: 55, floatFade: true });
    expect((p as any).sfx).toBeUndefined();
  });
  it('bad values are clamped or replaced', () => {
    const p = parseUiPrefs(JSON.stringify({ combat: 900, ui: -5, master: 'loud', float: 3, cutins: 'sometimes' }));
    expect(p).toMatchObject({ combat: 150, ui: 0, master: 100, float: 20, cutins: 'all' });
    expect(parseUiPrefs('{not json')).toEqual(DEFAULT_UI_PREFS);
  });
});

describe('combat speed (the agreement with the combat track)', () => {
  it('normal by default; set stores it and fires the event', () => {
    localStorage.removeItem('phc.combatSpeed');
    expect(getCombatSpeed()).toBe('normal');
    const seen = vi.fn(); window.addEventListener(COMBAT_SPEED_EVENT, seen);
    setCombatSpeed('fast');
    expect(getCombatSpeed()).toBe('fast'); expect(localStorage.getItem('phc.combatSpeed')).toBe('fast'); expect(seen).toHaveBeenCalledTimes(1);
    setCombatSpeed('normal'); expect(getCombatSpeed()).toBe('normal');
    window.removeEventListener(COMBAT_SPEED_EVENT, seen);
    expect(COMBAT_SPEED_EVENT).toBe('phc:combat-speed');
  });
});

describe('the floating buttons', () => {
  it('rest at the chosen opacity, full when near, focused or open; fade off keeps them at the opacity', () => {
    expect(floatOpacity(0.55, true, false, false, false)).toBe(0.55);
    expect(floatOpacity(0.55, true, true, false, false)).toBe(1);
    expect(floatOpacity(0.55, true, false, true, false)).toBe(1);
    expect(floatOpacity(0.55, true, false, false, true)).toBe(1);
    expect(floatOpacity(0.55, false, true, false, false)).toBe(0.55);
    expect(floatOpacity(0.55, false, false, false, true)).toBe(1);
  });
  it('distance to a button: 0 inside, straight-line outside', () => {
    const r = { left: 10, top: 10, right: 50, bottom: 50 };
    expect(distToRect(20, 20, r)).toBe(0);
    expect(distToRect(53, 54, r)).toBe(5);
    expect(distToRect(10, 0, r)).toBe(10);
  });
});
