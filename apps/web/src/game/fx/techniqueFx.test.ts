// @vitest-environment jsdom
// Every physical technique has its own animation (fx/techniqueFx.ts, the table; fx/techniqueParts.ts, the parts). Leon,
// 12 Nov 2026: "every technique that doesn't have its own unique SVG animation to have one", with "an attack effect
// and a result effect so you feel something if it misses". So: every technique in the data and every base-class move
// that makes a physical attack has a row; every part a row names exists; no two rows are the same; every row has an
// attack and a result for a hit and (when it can miss) for a miss; a hit, a miss and a crit draw different things; the
// parts draw, follow the clock and leave nothing behind.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { refOf, TECHNIQUES } from '@engine';
import { setLayer } from './dom';
import { playFx, setContext, clearFx } from './play';
import { resetRanged } from './ranged';
import { TECH_FX, PART_NAMES, partsOf, rowKey, techPrepass, inkOf, ATTR_INK, playRow } from './techniqueFx';
import { PARTS } from './techniqueParts';
import * as sfxMod from '../sfx';

const ROOT = resolve(__dirname, '../../../../..');
const classes = JSON.parse(readFileSync(resolve(ROOT, 'data/classes.json'), 'utf8'));
/** The base-class moves whose engine handler makes a physical attack (as tools/technique_fx_inventory.py finds them). */
function physicalMoves(): string[] {
  const src = ['i', 'j', 'k', 'rev3'].map((f) => readFileSync(resolve(ROOT, 'packages/engine/src/classes/' + f + '.ts'), 'utf8')).join('\n');
  const blocks = new Map<string, string>(); const starts = [...src.matchAll(/register\(\{/g)].map((m) => m.index!);
  starts.forEach((s, i) => { const t = src.slice(s, starts[i + 1] ?? src.length), m = /id: '([a-z_.]+)'/.exec(t.slice(0, 200)); if (m) blocks.set(m[1], t); });
  const out: string[] = [];
  for (const cl of classes.base) for (const r of Object.values(cl.ranks) as any[]) for (const m of r.moves) {
    const key = m.ref || (m.origin || cl.id) + '.' + m.id, b = blocks.get(key) || '';
    if (/resolveAttack\(|opportunityStrike\(|emitFx\(cb, 'shove'/.test(b) && !b.includes('interpose: true')) out.push('move:' + key);
  }
  return out;
}

function grid(w = 10, h = 7) {
  document.body.innerHTML = '';
  const root = document.createElement('div'); root.id = 'root'; const scr = document.createElement('div'); root.appendChild(scr); document.body.appendChild(root);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const b = document.createElement('button'); b.className = 'phc-tok'; b.setAttribute('aria-label', refOf(x + ',' + y) + ' · open');
    const img = document.createElement('img'); img.setAttribute('style', 'position: relative; z-index: 2; width: 38px'); b.appendChild(img);
    (b as any).getBoundingClientRect = () => ({ left: x * 40, top: y * 40, width: 40, height: 40, right: x * 40 + 40, bottom: y * 40 + 40 });
    scr.appendChild(b);
  }
  const layer = document.createElement('div'); document.body.appendChild(layer); setLayer(layer);
  setContext({ code: 'X', characters: { a: { id: 'a', name: 'Vel' } }, story: { positions: { a: '1,3' }, npcs: [{ id: 'f1', name: 'Raider', pos: '4,3' }] }, combat: null } as any, 'main');
  return layer;
}
let N = 5000;
const pieces = (layer: HTMLElement) => Array.from(layer.querySelectorAll('[data-tech-fx]')).map((e) => e.getAttribute('data-tech-fx'));

beforeEach(() => { vi.useFakeTimers(); resetRanged(); clearFx(); (window as any).__phcTechFx = []; });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('the table: a row for every physical technique', () => {
  it('every technique in data/techniques.json has a row (a new technique cannot ship with only the lunge)', () => {
    const missing = (TECHNIQUES as any[]).map((t) => t.id).filter((id) => !TECH_FX[id]);
    expect(missing).toEqual([]);
  });
  it('every base-class move that makes a physical attack has a row', () => {
    const moves = physicalMoves();
    expect(moves.length).toBeGreaterThanOrEqual(5);
    expect(moves.filter((k) => !TECH_FX[k])).toEqual([]);
  });
  it('every part a row names exists; every row has an attack and a result for a hit; one that rolls has a miss too', () => {
    for (const [k, r] of Object.entries(TECH_FX)) {
      for (const n of partsOf(r)) expect(PART_NAMES, k + ' names ' + n).toContain(n);
      expect(r.attack.length, k + ': no attack').toBeGreaterThan(0);
      expect(r.hit.length, k + ': no hit result').toBeGreaterThan(0);
      const rolls = r.on === 'strike' && !r.noRoll, resists = r.on === 'use' && !['guard', 'sidestep', 'raise_shield', 'shield_wall', 'interpose', 'bead', 'spot', 'brace', 'load_special', 'shift', 'vent', 'head_down'].includes(k);
      if (rolls || resists || r.on === 'shove') expect(r.miss.length, k + ': no miss result').toBeGreaterThan(0);
    }
  });
  it('no two rows are the same (each technique is recognisable), and the table is not padded with rows for nothing', () => {
    const sig = Object.values(TECH_FX).map((r) => JSON.stringify(r));
    expect(new Set(sig).size).toBe(sig.length);
    const known = new Set([...(TECHNIQUES as any[]).map((t) => t.id), ...physicalMoves()]);
    expect(Object.keys(TECH_FX).filter((k) => !known.has(k))).toEqual([]);
  });
  it('a miss never draws the hit\'s mark, and a crit adds to the hit (three different results)', () => {
    for (const [k, r] of Object.entries(TECH_FX)) {
      if (!r.miss.length) continue;
      expect(JSON.stringify(r.miss), k).not.toBe(JSON.stringify(r.hit));
      if (r.on === 'strike' && !r.noRoll) expect(r.crit.length, k + ': a crit adds nothing').toBeGreaterThan(0);
    }
  });
  it('which row an event plays: its technique, its class move, else Cut or Shot', () => {
    expect(rowKey({ k: 'melee', tech: 'sunder' })).toBe('sunder');
    expect(rowKey({ k: 'melee', move: 'fighter.finisher' })).toBe('move:fighter.finisher');
    expect(rowKey({ k: 'melee' })).toBe('cut');
    expect(rowKey({ k: 'shot', mode: 'burst' })).toBe('burst');
    expect(rowKey({ k: 'shot' })).toBe('shot');
    expect(rowKey({ k: 'shot', thrown: true })).toBe('throw');
    expect(rowKey({ k: 'technique', id: 'guard' })).toBe('guard');
    expect(rowKey({ k: 'technique', id: 'sunder' })).toBeNull(); // a strike row plays on its strikes
    expect(rowKey({ k: 'shove', unit: 'u', ok: true })).toBe('move:fighter.shove');
    expect(rowKey({ k: 'shove', unit: 'u', ok: true, _tech: 'shove' })).toBeNull();
  });
  it('the ink is the weapon\'s attribute: Dexterity guns and blades Agility, Raw Power weapons Strength', () => {
    expect(inkOf('service_pistol', true)).toBe(ATTR_INK.agility);
    expect(inkOf('maul', false)).toBe(ATTR_INK.strength);
    expect(inkOf(undefined, false)).toBe(ATTR_INK.strength);
  });
});

describe('the pre-pass: rounds to their rolls, a use read ahead', () => {
  it('a Burst\'s third round goes on its last roll; a Mag Dump stream and full auto keep theirs; a use\'s outcome is read from its save', () => {
    const v = { k: 'volley', n: 1, unit: 'u', mode: 'burst', loose: 1 }, s1 = { k: 'shot', n: 2, unit: 'u' }, s2 = { k: 'shot', n: 3, unit: 'u' };
    const out = techPrepass([v, s1, s2]);
    expect((out[2] as any)._loose).toBe(1); expect((out[1] as any)._loose).toBeUndefined();
    expect((v as any)._loose).toBeUndefined(); // the saved events are never changed
    const auto = techPrepass([{ k: 'volley', n: 1, unit: 'u', mode: 'auto', loose: 8 }, s1]);
    expect((auto[0] as any)._drawLoose).toBe(true); expect((auto[1] as any)._loose).toBeUndefined();
    const trip = techPrepass([{ k: 'technique', n: 1, unit: 'u', id: 'trip' }, { k: 'save', n: 2, unit: 't', ok: true, tech: 'trip' }]);
    expect((trip[0] as any)._out).toBe('miss');
    const trip2 = techPrepass([{ k: 'technique', n: 1, unit: 'u', id: 'trip' }, { k: 'save', n: 2, unit: 't', ok: false, tech: 'trip' }]);
    expect((trip2[0] as any)._out).toBe('hit');
    expect((techPrepass([{ k: 'technique', n: 1, unit: 'u', id: 'guard' }])[0] as any)._out).toBe('use');
  });
});

describe('the parts draw, keep the clock and clean up', () => {
  const ctx = (outcome: 'hit' | 'miss' | 'crit' | 'use') => ({ a: { x: 60, y: 140, s: 40 }, b: { x: 180, y: 140, s: 40 }, dir: { x: 1, y: 0 }, s: 40, ink: '#F68A38', weapon: 'war_axe', strikes: 2 });
  it('every row draws its attack, then its result at the landing time, and every node is gone after', () => {
    const layer = grid();
    for (const [k, r] of Object.entries(TECH_FX)) for (const out of ['hit', 'miss', 'crit'] as const) {
      playRow(k, r, ctx(out), out, 120);
      const attackNow = pieces(layer).length;
      expect(attackNow, k + ' ' + out + ': no attack drawn').toBeGreaterThan(0);
      vi.advanceTimersByTime(130);
      vi.advanceTimersByTime(3000);
      expect(pieces(layer).length, k + ' ' + out + ': nodes left').toBe(0);
    }
  });
  it('a hit, a miss and a crit draw different results; a miss is never empty', () => {
    const layer = grid();
    for (const [k, r] of Object.entries(TECH_FX)) {
      if (r.on !== 'strike' || r.noRoll) continue;
      const seen: Record<string, string> = {};
      for (const out of ['hit', 'miss', 'crit'] as const) {
        playRow(k, r, ctx(out), out, 100); vi.advanceTimersByTime(105);
        seen[out] = pieces(layer).sort().join(','); vi.advanceTimersByTime(3000);
      }
      expect(seen.miss, k).not.toBe(seen.hit); expect(seen.crit, k).not.toBe(seen.hit);
      expect(seen.miss.length, k).toBeGreaterThan(0);
    }
  });
  it('nothing of the result lands before the impact: a melee strike\'s result waits for its 120 ms', () => {
    const layer = grid();
    playFx({ k: 'melee', n: ++N, unit: 'pc-a', target: 'f1', from: '1,3', to: '4,3', weapon: 'war_axe', cat: 'heavy_melee', mode: 'melee', hit: true, crit: false, dmg: 9, tech: 'sunder' } as any);
    expect(pieces(layer)).toContain('weapon'); // the weapon's icon bites (Sunder's attack)
    expect(pieces(layer)).not.toContain('crack');
    vi.advanceTimersByTime(125);
    expect(pieces(layer)).toContain('crack');
    expect((window as any).__phcTechFx.at(-1)).toMatchObject({ key: 'sunder', outcome: 'hit' });
  });
  it('a missed shot plays its wide result; a plain swing plays Cut\'s row; reduced motion still shows the end state', () => {
    const layer = grid();
    playFx({ k: 'shot', n: ++N, unit: 'pc-a', target: 'f1', from: '1,3', to: '4,3', weapon: 'service_pistol', cat: 'pistol', mode: 'shot', hit: false, crit: false, dmg: 0 } as any);
    vi.advanceTimersByTime(400);
    expect((window as any).__phcTechFx.at(-1)).toMatchObject({ key: 'shot', outcome: 'miss' });
    vi.advanceTimersByTime(3000);
    vi.spyOn(sfxMod, 'reducedMotion').mockReturnValue(true);
    playFx({ k: 'melee', n: ++N, unit: 'pc-a', target: 'f1', from: '1,3', to: '4,3', weapon: 'combat_knife', cat: 'light_melee', mode: 'melee', hit: true, crit: true, dmg: 9 } as any);
    vi.advanceTimersByTime(130);
    expect(pieces(layer)).toEqual(expect.arrayContaining(['slash', 'cross', 'star']));
    expect((window as any).__phcTechFx.at(-1)).toMatchObject({ key: 'cut', outcome: 'crit' });
  });
  it('every part survives a missing attacker (fog) without throwing', () => {
    grid();
    for (const n of PART_NAMES) expect(() => PARTS[n]({ a: null, b: { x: 100, y: 100, s: 40 }, dir: { x: 1, y: 0 }, s: 40, ink: '#FFF', scale: 1, delay: 0, outcome: 'hit' }, {})).not.toThrow();
  });
});
