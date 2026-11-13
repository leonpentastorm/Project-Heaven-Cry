// @vitest-environment jsdom
// Every physical technique has its own animation (fx/techniqueFx.ts, the table; fx/techniqueParts.ts, the parts). Leon,
// 12 Nov 2026: "every technique that doesn't have its own unique SVG animation to have one". So: every technique in the
// data and every base-class move that makes a physical attack has a row; every part a row names exists; no two rows are
// the same; every row has a result for a hit; the parts draw, follow the clock and leave nothing behind.
// Leon, 13 Nov 2026 (live 0.25.0): no tracer lines, no half circle on a swing, no miss effects; a shot that hits leaves
// a bullet hole. So a miss draws no result (its word MISS is the whole of it), and a shot's hit is the weapon's mark,
// chosen by the weapon's family (its ammunition in the data): every gun × every shooting technique it can use is
// walked here and must leave its family's mark.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { refOf, TECHNIQUES, WEAPONS } from '@engine';
import { setLayer } from './dom';
import { playFx, setContext, clearFx } from './play';
import { resetRanged } from './ranged';
import { TECH_FX, PART_NAMES, partsOf, rowKey, techPrepass, inkOf, ATTR_INK, playRow, shotMarkOf, LOOSE_GAP } from './techniqueFx';
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
  it('every part a row names exists; every row has a result for a hit (an attack part is the technique\'s own, and optional)', () => {
    for (const [k, r] of Object.entries(TECH_FX)) {
      for (const n of partsOf(r)) expect(PART_NAMES, k + ' names ' + n).toContain(n);
      expect(r.hit.length, k + ': no hit result').toBeGreaterThan(0);
    }
  });
  it('the removed parts are gone for good: no tracer, no swept arc, no miss marks (Leon, 13 Nov 2026)', () => {
    for (const n of ['tracer', 'slash', 'whiff', 'deflect', 'wide']) expect(PART_NAMES, n).not.toContain(n);
    expect(Object.values(TECH_FX).some((r) => 'miss' in r)).toBe(false);
  });
  it('a shooting row\'s hit is the weapon\'s mark (`round`), unless its round misses on purpose or lands as a blast', () => {
    for (const t of (TECHNIQUES as any[]).filter((x) => x.system === 'ranged')) {
      const r = TECH_FX[t.id]; if (r.on !== 'strike') continue;
      const has = r.hit.some(([n]) => n === 'round');
      if (r.noRoll || t.id === 'lob') expect(has, t.id).toBe(false); else expect(has, t.id).toBe(true);
    }
  });
  it('no two rows are the same (each technique is recognisable), and the table is not padded with rows for nothing', () => {
    const sig = Object.values(TECH_FX).map((r) => JSON.stringify(r));
    expect(new Set(sig).size).toBe(sig.length);
    const known = new Set([...(TECHNIQUES as any[]).map((t) => t.id), ...physicalMoves()]);
    expect(Object.keys(TECH_FX).filter((k) => !known.has(k))).toEqual([]);
  });
  it('a crit adds to the hit on every strike that rolls', () => {
    for (const [k, r] of Object.entries(TECH_FX)) if (r.on === 'strike' && !r.noRoll) expect(r.crit.length, k + ': a crit adds nothing').toBeGreaterThan(0);
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
  const ctx = (outcome: 'hit' | 'miss' | 'crit' | 'use') => ({ a: { x: 60, y: 140, s: 40 }, b: { x: 180, y: 140, s: 40 }, dir: { x: 1, y: 0 }, s: 40, ink: '#F68A38', weapon: 'war_axe', strikes: 2, mark: 'hole' });
  it('every row draws its attack now and its result only at the landing time, and every node is gone after', () => {
    const layer = grid();
    for (const [k, r] of Object.entries(TECH_FX)) for (const out of ['hit', 'crit'] as const) {
      playRow(k, r, ctx(out), out, 120);
      expect(pieces(layer).length > 0, k + ' ' + out + ': the attack drawn now').toBe(r.attack.length > 0);
      vi.advanceTimersByTime(130);
      expect(pieces(layer).length, k + ' ' + out + ': the result drawn at the landing').toBeGreaterThan(0);
      vi.advanceTimersByTime(3000);
      expect(pieces(layer).length, k + ' ' + out + ': nodes left').toBe(0);
    }
  });
  it('a miss draws no result at all: only the technique\'s own attack, if it has one; a crit differs from a hit', () => {
    const layer = grid();
    for (const [k, r] of Object.entries(TECH_FX)) {
      const seen: Record<string, string> = {};
      for (const out of ['hit', 'miss', 'crit'] as const) {
        playRow(k, r, ctx(out), out, 100); const now = pieces(layer).sort().join(','); vi.advanceTimersByTime(105);
        seen[out] = pieces(layer).sort().join(','); if (out === 'miss') seen.missAttack = now; vi.advanceTimersByTime(3000);
      }
      const attackParts = new Set(r.attack.map(([n]) => n));
      expect(seen.miss.split(',').filter(Boolean).every((n) => attackParts.has(n)), k + ': a miss drew ' + seen.miss).toBe(true);
      if (!r.attack.length) expect(seen.miss, k).toBe('');
      if (r.on === 'strike' && !r.noRoll) expect(seen.crit, k).not.toBe(seen.hit);
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
  it('a missed shot and a missed swing draw nothing on the layer (the word MISS only); a plain swing plays Cut\'s row', () => {
    const layer = grid();
    const floats = () => Array.from(layer.querySelectorAll('span')).map((x) => x.textContent);
    playFx({ k: 'shot', n: ++N, unit: 'pc-a', target: 'f1', from: '1,3', to: '4,3', weapon: 'service_pistol', cat: 'pistol', mode: 'shot', hit: false, crit: false, dmg: 0 } as any);
    for (let t = 0; t < 600; t += 20) { vi.advanceTimersByTime(20); expect(pieces(layer), 'a shot\'s miss at ' + t + ' ms').toEqual([]); }
    expect((window as any).__phcTechFx.at(-1)).toMatchObject({ key: 'shot', outcome: 'miss' });
    expect(floats()).toContain('MISS');
    vi.advanceTimersByTime(3000);
    playFx({ k: 'melee', n: ++N, unit: 'pc-a', target: 'f1', from: '1,3', to: '2,3', weapon: 'sabre', cat: 'light_melee', mode: 'melee', hit: false, crit: false, dmg: 0 } as any);
    for (let t = 0; t < 600; t += 20) { vi.advanceTimersByTime(20); expect(pieces(layer), 'a swing\'s miss at ' + t + ' ms').toEqual([]); }
    expect(floats()).toContain('MISS');
    vi.advanceTimersByTime(3000);
    // a hit: no arc swept with the swing, the cut (Cut's mark) on the target as it lands
    playFx({ k: 'melee', n: ++N, unit: 'pc-a', target: 'f1', from: '1,3', to: '2,3', weapon: 'sabre', cat: 'light_melee', mode: 'melee', hit: true, crit: false, dmg: 9 } as any);
    expect(pieces(layer)).toEqual([]);
    expect(Array.from(layer.querySelectorAll('[data-fx-sprite]')).length + Array.from(layer.querySelectorAll('img')).filter((i) => /slash/.test(i.getAttribute('src') || '')).length).toBe(0);
    vi.advanceTimersByTime(125);
    expect(pieces(layer)).toEqual(['cross']);
    vi.advanceTimersByTime(3000);
    vi.spyOn(sfxMod, 'reducedMotion').mockReturnValue(true);
    playFx({ k: 'melee', n: ++N, unit: 'pc-a', target: 'f1', from: '1,3', to: '4,3', weapon: 'combat_knife', cat: 'light_melee', mode: 'melee', hit: true, crit: true, dmg: 9 } as any);
    vi.advanceTimersByTime(130);
    expect(pieces(layer)).toEqual(expect.arrayContaining(['cross', 'star']));
    expect((window as any).__phcTechFx.at(-1)).toMatchObject({ key: 'cut', outcome: 'crit' });
  });
  it('a shot that hits puts its bullet hole on the target as the round lands (not before), and it fades in about a second', () => {
    const layer = grid();
    playFx({ k: 'shot', n: ++N, unit: 'pc-a', target: 'f1', from: '1,3', to: '4,3', weapon: 'service_pistol', cat: 'pistol', mode: 'shot', hit: true, crit: false, dmg: 9 } as any);
    expect(pieces(layer)).not.toContain('hole');
    vi.advanceTimersByTime(40);
    expect(pieces(layer)).not.toContain('hole');
    vi.advanceTimersByTime(200);
    expect(pieces(layer)).toEqual(['hole']);
    vi.advanceTimersByTime(1400);
    expect(pieces(layer)).toEqual([]);
  });

  it('every part survives a missing attacker (fog) without throwing', () => {
    grid();
    for (const n of PART_NAMES) expect(() => PARTS[n]({ a: null, b: { x: 100, y: 100, s: 40 }, dir: { x: 1, y: 0 }, s: 40, ink: '#FFF', scale: 1, delay: 0, outcome: 'hit' }, {})).not.toThrow();
  });
});

// Leon, 13 Nov 2026: "Rake and Mag Dump on a shotgun also use the shoot effect even though it says right on the card:
// double barrel." A shot's mark is the weapon's family's, whatever the technique: walked here for every gun in the data
// × every shooting technique its properties allow (the data's lines and not_with), hit by a synthetic shot of it.
describe('every gun family × every shooting technique it can use leaves its family\'s mark', () => {
  /** What the data says the family's mark is: a shell's pellets, an arrow's or a bolt's shaft, nothing for a grenade, a
   *  rocket, fuel or a thrown weapon, a bullet hole for any other cartridge. */
  const familyMark = (w: any): string | null => (w.category === 'thrown' || !w.ammo ? null : w.ammo === 'shell' ? 'pellets' : ['arrow', 'bolt'].includes(w.ammo) ? 'shaft' : ['40 mm grenade', 'rocket', 'fuel canister'].includes(w.ammo) ? null : 'hole');
  const guns = (WEAPONS as any[]).filter((w) => w.phys?.system === 'ranged' && w.category !== 'thrown');
  const props = (w: any): string[] => w.phys?.props || [];
  const usable = (w: any) => (TECHNIQUES as any[]).filter((t) => t.system === 'ranged' && TECH_FX[t.id]?.on === 'strike' && !(t.not_with || []).some((p: string) => props(w).includes(p)) && !(t.lines || []).some((l: any) => /can.t be used/.test(l.text || '') && l.props.some((p: string) => props(w).includes(p))));
  it('the walk covers every family: bullets, shells, arrows and bolts, and the ones with no mark', () => {
    const fams = new Set(guns.map(familyMark));
    expect([...fams].sort()).toEqual(['hole', 'pellets', 'shaft', null].sort() as any);
    expect(guns.length).toBeGreaterThan(25);
  });
  for (const w of guns) it(w.id + ' (' + (familyMark(w) || 'no mark') + ')', () => {
    const layer = grid();
    expect(shotMarkOf(w.id, w.category), w.id).toBe(familyMark(w));
    for (const t of usable(w)) {
      (window as any).__phcFxTrace = [];
      playFx({ k: 'shot', n: ++N, unit: 'pc-a', target: 'f1', from: '1,3', to: '4,3', weapon: w.id, cat: w.category, mode: 'shot', hit: true, crit: false, dmg: 9, tech: t.id } as any);
      vi.advanceTimersByTime(1200);
      const marks = ((window as any).__phcFxTrace as any[]).filter((x) => x.w === 'hole').map((x) => x.kind);
      const want = TECH_FX[t.id].noRoll || t.id === 'lob' ? null : familyMark(w);
      expect(marks, w.id + ' · ' + t.id).toEqual(want ? [want] : []);
      vi.advanceTimersByTime(3000); clearFx(); layer.innerHTML = '';
    }
    (window as any).__phcFxTrace = undefined;
  });
  it('a double barrel firing both barrels: two blasts one-two, two pellet clusters, one LOOSE_GAP apart; a miss draws none', () => {
    grid();
    for (const hit of [true, false]) {
      (window as any).__phcFxTrace = [];
      playFx({ k: 'shot', n: ++N, unit: 'pc-a', target: 'f1', from: '1,3', to: '4,3', weapon: 'coach_gun', cat: 'shotgun', mode: 'shot', hit, crit: false, dmg: hit ? 9 : 0, tech: 'mag_dump', _loose: 1 } as any);
      vi.advanceTimersByTime(1500);
      const T: any[] = (window as any).__phcFxTrace, holes = T.filter((x) => x.w === 'hole'), blasts = T.filter((x) => x.w === 'muzzle');
      expect(blasts.length).toBe(2); expect(blasts.every((b) => b.wide)).toBe(true);
      if (hit) { expect(holes.map((x) => x.kind)).toEqual(['pellets', 'pellets']); expect(holes[1].rt - holes[0].rt).toBeGreaterThanOrEqual(LOOSE_GAP * 0.9); }
      else expect(holes).toEqual([]);
      vi.advanceTimersByTime(3000); clearFx();
    }
    (window as any).__phcFxTrace = undefined;
  });
});
