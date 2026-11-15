// Rules 1.55 (15 Nov 2026; Leon: "no refill mag between fight", "make what rare actually rare", "when you kill enemies
// they used to drop fuck tons of guns on the ground"): what a won run fight pays and what its foes leave on the ground,
// every case through the one reducer (run/move into a fight, run/skip or a fight played by the simulator's policies,
// run/pick). Numbers are read from data.
import { describe, expect, it } from 'vitest';
import { type GameState, apply, nodeCredits, sellValue, stageCeiling, WEAPON } from '../src';
import svJ from '../../../data/survival.json';
import { survivalRoom, startRun, ownerOf, leaveField } from './helpers/survival';
import { Rec, type Pc } from './helpers/replay';

const SV: any = svJ;
const SOLO: Pc[] = [{ build: 'plain_gun', level: 1 }];
const DUO: Pc[] = [{ build: 'plain_gun', level: 1 }, { build: 'sigil', level: 1 }];
const DEPTHS = [2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14]; // the rows with more than the gate
const RANK = ['standard', 'fine', 'masterwork', 'relic', 'celestial'];
const clone = (g: GameState): GameState => JSON.parse(JSON.stringify(g));
/** The squad walks into a node of this kind at `depth` (as survival-materials.test.ts walks). */
function at(base: GameState, kind: string, depth: number, pcs: Pc[]): GameState {
  const g0 = clone(base), r = g0.run!;
  const n = r.nodes.find((x) => x.depth === depth && !x.gate)!, prev = r.nodes.find((x) => x.links.includes(n.id))!;
  n.kind = kind as any; r.at = prev.id; r.state = 'map';
  let g = g0; for (let i = 0; i < pcs.length && g.run!.at !== n.id; i++) g = apply(g, { type: 'run/move', node: n.id }, ownerOf(i));
  return g;
}
const runs: Record<string, GameState> = {};
const started = (seed: string, pcs: Pc[]) => (runs[seed + pcs.length] ||= startRun(survivalRoom(seed, pcs, { test: true }), seed));
/** What lies on the ground after a fight: the entries that came from foes (the players' own speed-dropped magazines and
 * thrown weapons are theirs), and what they sell for by the one sell rule. */
function ground(g: GameState) {
  const all = (g.combat?.objects || []).filter((o: any) => o.kind === 'pile').flatMap((p: any) => p.items || []);
  const own = (e: any) => !!e.pack?.mags || (e.pack?.kind === 'weapon' && (WEAPON as any)[e.pack.weapon]?.category === 'thrown');
  const foes = all.filter((e: any) => !own(e));
  return { foes, worth: foes.reduce((t: number, e: any) => t + (e.pack ? sellValue(e.pack) || 0 : 0), 0) };
}

describe('rules 1.55: no free magazines, a rare weapon card, scarce residue (through run/skip and run/pick)', () => {
  it('no ammunition line is paid after any fight; the REWARDS line does not promise one', () => {
    for (const kind of ['fight', 'elite', 'boss', 'vault_guard']) {
      const g = apply(at(started('L-1', DUO), kind, 5, DUO), { type: 'run/skip' }, 'host');
      for (const l of Object.values(g.run!.note!.ammo || {})) expect(l, kind).toEqual([]);
      for (const o of Object.values(g.run!.offers!)) expect(o.ammo, kind).toBe(0);
      expect(g.story.entries.find((e) => e.head === 'REWARDS')!.text).not.toMatch(/supply pack/);
    }
  });

  it('400 ordinary stage-1 fights: the weapon card in 15% to 25%, residue in 20% to 30% of cards, no grade above Fine, Standard 90%', () => {
    let card = 0, residue = 0, std = 0, weapons = 0, same = 0;
    const res = SV.rewards.materials.items.find((x: any) => x.by)!;
    for (let i = 0; i < 400; i++) {
      const seed = 'L-' + Math.floor(i / 10), depth = DEPTHS[i % 10], g = apply(at(started(seed, DUO), 'fight', depth, DUO), { type: 'run/skip' }, 'host');
      const o1 = g.run!.offers!.c1, o2 = g.run!.offers!.c2;
      if (o1.weapons.length) card++;
      if ((o1.weapons.length > 0) === (o2.weapons.length > 0)) same++;
      const r = o1.materials!.find((m) => m.item === res.item);
      if (r) { residue++; expect(r.n).toBeGreaterThanOrEqual(res.by.fight.qty[0]); expect(r.n).toBeLessThanOrEqual(res.by.fight.qty[1]); }
      for (const w of [...o1.weapons, ...o2.weapons]) { weapons++; if (w.rarity === 'standard') std++; expect(RANK.indexOf(w.rarity)).toBeLessThanOrEqual(RANK.indexOf('fine')); }
      // the pick is still a pick: the Materials card alone is taken through the reducer
      if (!o1.weapons.length && i < 10) expect(() => apply(leaveField(g), { type: 'run/pick', charId: 'c1', choice: 'materials' }, 'host')).not.toThrow(); // rules 1.55 item 9: the pick waits until the field is left
    }
    expect(same).toBe(400); // every player sees the same card
    expect(card / 400).toBeGreaterThanOrEqual(0.15); expect(card / 400).toBeLessThanOrEqual(0.25);
    expect(residue / 400).toBeGreaterThanOrEqual(0.2); expect(residue / 400).toBeLessThanOrEqual(0.3);
    expect(std / weapons).toBeGreaterThanOrEqual(0.85);
    expect(stageCeiling(1)).toBe('fine');
  });

  it('an Elite, the gate\'s kind, a vault guard and a Boss always offer a weapon; stage 1 Elites: no Masterwork, Fine about 1 in 4', () => {
    let fine = 0, n = 0;
    for (let i = 0; i < 60; i++) for (const kind of ['elite', 'vault_guard', 'boss']) {
      const g = apply(at(started('L-' + i, DUO), kind, 5, DUO), { type: 'run/skip' }, 'host');
      for (const o of Object.values(g.run!.offers!)) {
        expect(o.weapons.length, kind).toBeGreaterThan(0);
        for (const w of o.weapons) { expect(RANK.indexOf(w.rarity)).toBeLessThanOrEqual(RANK.indexOf('fine')); if (kind === 'elite') { n++; if (w.rarity === 'fine') fine++; } }
        const r = o.materials!.find((m) => m.item === 'mana_residue'), row = SV.rewards.materials.items.find((x: any) => x.by).by[kind === 'vault_guard' ? 'vault_guard' : kind];
        expect(r!.n).toBeGreaterThanOrEqual(row.qty[0]); expect(r!.n).toBeLessThanOrEqual(row.qty[1]);
      }
    }
    expect(fine / n).toBeGreaterThan(0.15); expect(fine / n).toBeLessThan(0.35);
  });

  it('the Materials card: gunpowder and casings from an ordinary fight\'s credits, an Elite x2, a Boss x4', () => {
    const m = SV.rewards.materials, base = (d: number) => nodeCredits('fight', d, 1);
    for (const [kind, k] of [['fight', 1], ['elite', m.mult.elite], ['boss', m.mult.boss]] as [string, number][]) {
      const g = apply(at(started('L-1', DUO), kind, 5, DUO), { type: 'run/skip' }, 'host');
      for (const it of m.items.filter((x: any) => x.per_credits)) expect(g.run!.offers!.c1.materials!.find((x) => x.item === it.item)!.n, kind).toBe(Math.ceil(base(5) * k / it.per_credits));
    }
  });
});

describe('rules 1.55 item 26: what a killed foe leaves on the ground (fights played through the reducer)', () => {
  it('no pile holds a weapon, magazine or rounds from a foe; over 300 ordinary fights the ground is under 30% of the pay', () => {
    let worth = 0, pay = 0;
    for (let i = 0; i < 300; i++) {
      const g = at(started('G-' + Math.floor(i / 10), SOLO), 'fight', DEPTHS[i % 10], SOLO), n = g.run!.nodes.find((x) => x.id === g.run!.at)!;
      const r = new Rec(g, SOLO); r.fight(20);
      const gr = ground(r.g);
      for (const e of gr.foes) { expect(e.pack?.kind).not.toBe('weapon'); expect(e.pack?.mags).toBeUndefined(); expect(e.pack?.calibre).toBeUndefined(); }
      worth += gr.worth; pay += nodeCredits('fight', n.depth, 1);
    }
    expect(worth / pay).toBeLessThan(0.3);
  }, 600_000);
});

describe.runIf((globalThis as any).process?.env?.LOOT_MEASURE)('rules 1.55: the ground measured (opt-in, LOOT_MEASURE=1)', () => {
  it('prints the ground\'s worth and contents against the pay, by kind', () => {
    for (const kind of ['fight', 'elite', 'boss']) {
      let worth = 0, pay = 0, rounds = 0; const items: Record<string, number> = {};
      for (let i = 0; i < 20; i++) {
        const g = at(started('G-' + (i % 10), SOLO), kind, kind === 'fight' ? DEPTHS[i % 8] : 5, SOLO), n = g.run!.nodes.find((x) => x.id === g.run!.at)!;
        const r = new Rec(g, SOLO); r.fight(20); rounds += r.g.combat?.round || 0;
        const gr = ground(r.g); worth += gr.worth; pay += nodeCredits(kind as any, n.depth, 1);
        for (const e of gr.foes) items[e.item || e.pack?.id] = (items[e.item || e.pack?.id] || 0) + (e.qty || 1);
      }
      (globalThis as any).console.log('LOOT', kind, 'ground', worth / 20, 'pay', pay / 20, 'share', (worth / pay).toFixed(3), 'rounds', rounds / 20, JSON.stringify(items));
    }
  }, 600_000);
});
