// Rules 1.55 items 34 to 37 (0.28.2, the lead's rulings on the reviewer's points): on the field nothing grows (practice,
// study and word uses: the one gate, effects/hooks.ts growthHeld), nothing a character does harms a friend (the one
// check where harm is applied, harmHeld), the fight screen's own actions (combat/*, through its descriptors) are the
// field's, an old save's field counts every once-a-fight use as spent, and the counted items are read from data.
// Everything through the reducer with real actions.
import { describe, expect, it } from 'vitest';
import { type GameState, apply, RuleError, reachable, magazineWorth, actionsFor, sendDescriptor, fieldCombat, COUNTED } from '../src';
import { survivalRoom, startRun, ownerOf } from './helpers/survival';
import type { Pc } from './helpers/replay';
import itemsJ from '../../../data/items.json';

const clone = (g: GameState): GameState => JSON.parse(JSON.stringify(g));
const tryApply = (g: GameState, a: any, by = 'host'): GameState | string => { try { return apply(g, a, by); } catch (e) { expect(e).toBeInstanceOf(RuleError); return (e as Error).message; } };
function field(pcs: Pc[], prep?: (g: GameState) => void, seed = 'PHC-GROW1'): GameState {
  let g = clone(startRun(survivalRoom(seed, pcs, { test: true }), seed));
  for (const c of Object.values(g.characters)) { c.weapon = 'service_pistol'; c.pack = [...(c.pack || []), ...magazineWorth('service_pistol')]; }
  prep?.(g);
  const n = reachable(g.run!).find((x) => x.kind === 'fight')!;
  for (let i = 0; i < pcs.length && g.run!.at !== n.id; i++) g = apply(g, { type: 'run/move', node: n.id }, ownerOf(i));
  g = apply(g, { type: 'run/skip' }, 'host'); expect(g.run!.state).toBe('field');
  return g;
}
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const step = (k: string, [dx, dy]: number[], n = 1) => { const [x, y] = k.split(',').map(Number); return (x + dx * n) + ',' + (y + dy * n); };
/** A two-glyph Line FIRE · SEEK on the field: SEEK on the caster's own tile (`at`), FIRE one tile on (`fire`), in the
 * first direction the map takes (walls vary by map). Evoked from FIRE's end it fires along `dir` (away from SEEK). */
function line(g0: GameState): { g: GameState; at: string; fire: string; dir: number[] } {
  for (const dir of DIRS) {
    let g = clone(g0); const at = g.story.positions!.c1, next = step(at, dir);
    const a = tryApply(g, { type: 'world/act', charId: 'c1', act: 'move', to: next, how: 'move' }); if (typeof a === 'string') continue; g = a;
    const b = tryApply(g, { type: 'world/act', charId: 'c1', act: 'draw', word: 'fire', tile: next }); if (typeof b === 'string') continue; g = b;
    const c = tryApply(g, { type: 'world/act', charId: 'c1', act: 'move', to: at, how: 'move' }); if (typeof c === 'string') continue; g = c;
    const d = tryApply(g, { type: 'world/act', charId: 'c1', act: 'draw', word: 'seek', tile: at }); if (typeof d === 'string') continue; g = d;
    return { g, at, fire: next, dir };
  }
  throw new Error('no room on this map for a Line');
}
const SIGIL: Pc[] = [{ build: 'sigil', level: 1 }, { build: 'plain_gun', level: 1 }];
const SOUL: Pc[] = [{ build: 'outburst', level: 1 }, { build: 'plain_gun', level: 1 }];
const sigilPrep = (g: GameState) => { const c = g.characters.c1; c.sigils = [...new Set([...(c.sigils || []), 'fire', 'seek'])]; };
/** The first aim the reducer takes for this action (aims along `dir` at these distances), or null. */
function firstTaken(g: GameState, a: (aim: string) => any, at: string, dir: number[], ns = [3, 2, 4, 5]): GameState | null {
  for (const n of ns) { const r = tryApply(g, a(step(at, dir, n))); if (typeof r !== 'string') return r; }
  return null;
}

describe('rules 1.55 item 34: no growth on the field', () => {
  it('an Evoke on the field goes off (on yourself) but adds no study and no word use', () => {
    const { g, at, fire } = line(field(SIGIL, sigilPrep));
    const sg0 = JSON.stringify((g.characters.c1 as any).sigilGrowth || null);
    const done = apply(g, { type: 'world/act', charId: 'c1', act: 'evoke', tile: fire, aim: at } as any, 'host');
    expect(done.story.entries.slice(-3).some((e) => /evokes FIRE · SEEK/.test(e.text))).toBe(true);
    expect(JSON.stringify((done.characters.c1 as any).sigilGrowth || null)).toBe(sg0);
  });

  it('a Release on the field adds no practice; Crystallise still makes cores from the meter', () => {
    const f = field(SOUL), c = f.characters.c1, d = c.outbursts![0];
    const p0 = c.soulPractice || 0;
    const g = apply(f, { type: 'world/act', charId: 'c1', act: 'outburst', design: d.id, hold: true } as any, 'host');
    expect(g.story.magic?.c1?.held).toBeTruthy();
    g.story.positions!.c2 = step(g.story.positions!.c1, [0, 1], 6);
    let rel: GameState | null = null;
    for (const dir of DIRS) { rel = firstTaken(g, (aim) => ({ type: 'world/act', charId: 'c1', act: 'release', aim }), g.story.positions!.c1, dir, [2, 3]); if (rel) break; }
    expect(rel).toBeTruthy(); expect(rel!.story.magic?.c1?.held || null).toBeNull();
    expect(rel!.characters.c1.soulPractice || 0).toBe(p0);
    const m = clone(f); m.story.mana = 20;
    const cr = apply(m, { type: 'world/act', charId: 'c1', act: 'crystallise' } as any, 'host');
    expect(cr.story.mana).toBeLessThan(20);
  });
});

describe('rules 1.55 item 35: on the field nothing harms a friend', () => {
  it('an Evoke at a friend is refused in words whenever it would hurt them, and nothing that goes off hurts them', () => {
    const { g, fire, dir } = line(field(SIGIL, sigilPrep));
    const hp = g.characters.c2.hp; let refusedForFriend = 0, tries = 0;
    for (const n of [1, 2, 3]) for (let k = 0; k < 8; k++) {
      const x = clone(g); x.story.positions!.c2 = step(fire, dir, n); (x.rng as any).state = ((x.rng as any).state + k * 7919) >>> 0;
      const r = tryApply(x, { type: 'world/act', charId: 'c1', act: 'evoke', tile: fire, aim: step(fire, dir, n) }); tries++;
      if (typeof r === 'string') { if (/is a friend/.test(r)) refusedForFriend++; continue; }
      expect(r.characters.c2.hp).toBe(hp); // a miss: it went off and hurt nobody
    }
    expect(tries).toBeGreaterThan(0); expect(refusedForFriend).toBeGreaterThan(0);
  });
});

describe('rules 1.55 item 36: the fight screen\'s actions on the field', () => {
  it('the descriptors list on the field, and a fight-screen reload, sent as the screen sends it, is done on the field', () => {
    const g = field(SIGIL); g.characters.c1.loaded = 0;
    expect(fieldCombat(g)!.units.some((u) => u.id === 'pc-c1')).toBe(true);
    const list = actionsFor(g, 'pc-c1', 'host'); expect(list.length).toBeGreaterThan(0);
    expect(list.some((d) => d.group === 'sigils')).toBe(true);
    const a = sendDescriptor(g, 'pc-c1', 'reload', {}, 'host')!; expect(a.type).toBe('combat/reload');
    const after = apply(g, a, 'host'); expect(after.characters.c1.loaded).toBeGreaterThan(0); expect(after.run!.state).toBe('field');
    expect(tryApply(g, { type: 'combat/end-turn', unitId: 'pc-c1' })).toMatch(/fight action, and the fight is over/);
    expect(tryApply(g, { type: 'combat/reload', unitId: 'pc-c2' })).toBe('Not your character.');
  });
});

describe('rules 1.55 item 31: a field from a 0.28.1 save', () => {
  it('every once-a-fight use counts as spent there (the Thrown Stim); the same field opened by 0.28.2 throws it', () => {
    const prep = (x: GameState) => { const c = x.characters.c1; c.traits = [...(c.traits || []), 'field_medic'] as any; c.stims = 3; };
    const f = field(SOUL, prep), pos = f.story.positions!;
    const free = DIRS.map((d) => step(pos.c1, d)).find((k) => !Object.values(pos).includes(k) && !(f.story.objects || []).some((o: any) => o.pos === k && o.kind !== 'pile'))!;
    pos.c2 = free;
    const t = { type: 'world/act', charId: 'c1', act: 'perk', id: 'trait:field_medic', actionId: 'thrown_stim', targetId: 'pc-c2' } as any;
    const down = clone(f); down.characters.c2.hp = 0;
    expect(typeof tryApply(down, t)).not.toBe('string');
    const old = clone(down); delete (old.story as any).ps; delete (old.story as any).fieldLimits;
    expect(tryApply(old, t)).toMatch(/Used/);
  });
});

describe('rules 1.55 item 28: the counted items are data', () => {
  it('COUNTED is items.json `counted`, row by row', () => {
    const rows = (itemsJ as any).items.filter((x: any) => x.counted);
    expect(rows.length).toBeGreaterThan(0);
    expect({ ...COUNTED }).toEqual(Object.fromEntries(rows.map((x: any) => [x.id, x.counted])));
  });
});
