// Rules 1.53 in Survival: a quiver is graded gear for an archer. The shop's counter has a plain quiver for a party that
// carries a bow, the grade step grades a carried quiver (its Relic step has no named property: a quiver's grade gives
// arrows held and nothing else), the Forge stocks the enchantments for a party with quivers, and a reward pick may offer
// a quiver as the archer's own offer. Two Celestial quivers: nothing blocks them.
import { describe, expect, it } from 'vitest';
import { type GameState, apply, runOptions, weaponOffer, quiversOf, setQuivers, quiverHolds, counterLines, lastingFor, runWorth } from '../src';
import { survivalRoom, ownerOf } from './helpers/survival';
import type { Pc } from './helpers/replay';

const DUO: Pc[] = [{ build: 'plain_gun', level: 1 }, { build: 'sigil', level: 1 }];
const clone = (g: GameState): GameState => JSON.parse(JSON.stringify(g));
const started = (seed = 'PHC-0001') => apply(survivalRoom(seed, DUO, { test: true }), { type: 'run/start', seed }, 'host');
const archer = (g: GameState) => { const c = Object.values(g.characters)[0]; c.weapon = 'recurve_bow'; c.weaponState = {}; c.loaded = quiverHolds(); delete c.quivers; return c; };
function visit(kind: string, o: { stage?: number; prep?: (g: GameState) => void } = {}): GameState {
  const g0 = clone(started()), r = g0.run!;
  const n = r.nodes.find((x) => x.depth === 5 && !x.gate)!, prev = r.nodes.find((x) => x.links.includes(n.id))!;
  n.kind = kind as any; r.at = prev.id; r.state = 'map'; if (o.stage) r.stage = o.stage;
  for (const c of Object.values(g0.characters)) c.credits = 100000;
  o.prep?.(g0);
  let g = g0; for (let i = 0; i < DUO.length && g.run!.at !== n.id; i++) g = apply(g, { type: 'run/move', node: n.id }, ownerOf(i));
  return g;
}

describe('rules 1.53: quivers in a Survival run', () => {
  it('the shop\'s counter sells a plain quiver to a party with an archer, and only then', () => {
    const g = clone(started()); expect(counterLines(Object.values(g.characters)).some((l) => l.id === 'quiver')).toBe(false);
    archer(g); expect(counterLines(Object.values(g.characters)).some((l) => l.id === 'quiver')).toBe(true);
  });
  it('the grade step grades a carried quiver at the shop, and the Relic step at the Forge asks no named property; worth nothing on the cap', () => {
    let g = visit('shop', { stage: 2, prep: (x) => archer(x) }); const c = Object.values(g.characters)[0];
    const o = runOptions(g, c.id).find((x) => x.group === 'grade' && (x.action as any).where === 'quiver:0')!;
    expect(o).toBeTruthy(); expect(o.why).toBeNull(); expect(o.detail).toMatch(/worn quiver/);
    g = apply(g, o.action as any, c.owner);
    expect(quiversOf(g.characters[c.id])[0].rarity).toBe('fine');
    const f = visit('forge', { stage: 9, prep: (x) => { const a = archer(x); setQuivers(a, [{ id: 'quiver', rarity: 'masterwork', arrows: {} }]); } }); const fc = Object.values(f.characters)[0];
    const relic = runOptions(f, fc.id).find((x) => (x.action as any).where === 'quiver:0')!;
    expect(relic).toBeTruthy(); expect(relic.why).toBeNull();
    const before = runWorth(fc), g2 = apply(f, relic.action as any, fc.owner);
    expect(quiversOf(g2.characters[fc.id])[0].rarity).toBe('relic'); expect(runWorth(g2.characters[fc.id])).toBe(before);
    expect(quiverHolds('quiver', 'relic')).toBeGreaterThan(quiverHolds('quiver', 'masterwork'));
  });
  it('the Forge offers the enchantments to a party that carries quivers (a quiver\'s slot free), not to one that carries none', () => {
    const g = clone(started()), c = Object.values(g.characters)[0];
    expect(lastingFor(c).some((id) => /^ench_/.test(id))).toBe(false);
    archer(g); expect(lastingFor(c).some((id) => /^ench_/.test(id))).toBe(true);
  });
  it('a reward pick may offer an archer a quiver as its own offer; never one who carries no bow', () => {
    const g = clone(started()), c = Object.values(g.characters)[0];
    const seeds = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    expect(seeds.some((s) => weaponOffer(c, { id: 'n5', depth: 5 }, 'fight', 1, s).weapons.some((w) => w.id === 'quiver'))).toBe(false);
    archer(g);
    expect(seeds.some((s) => weaponOffer(c, { id: 'n5', depth: 5 }, 'fight', 1, s).weapons.some((w) => w.id === 'quiver'))).toBe(true);
    const v = weaponOffer(c, { id: 'n9', depth: 9 }, 'vault', 9, 'V', { grade: 'celestial' });
    for (const w of v.weapons) if (w.id === 'quiver') expect(w.rarity).toBe('celestial'); // the vault's chest grade, no property rolled
  });
});
