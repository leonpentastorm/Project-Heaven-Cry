// Survival's lanes and the vault through the reducer (rules 1.48, Leon 13 Nov): a lean matters only where the way forks
// (the start, a junction, the vault's fork); the vault's guard is a fight stronger than an Elite of its depth with the
// setting's named guard; its chest pays credits and a pick a grade above the stage's; after it the squad is back on its
// lane. Every number is read from data/survival.json.
import { describe, expect, it } from 'vitest';
import { type GameState, apply, reachable, runNode, budgetFor, composeEncounter, nodeCredits, nodeXp, creditsOf, stageCeiling, vaultGrade, SETTING, ENC_BUDGET } from '../src';
import { type Pc } from './helpers/replay';
import { survivalRoom, ownerOf } from './helpers/survival';
import svJ from '../../../data/survival.json';

const SV: any = svJ;
const DUO: Pc[] = [{ build: 'plain_gun', level: 1 }, { build: 'sigil', level: 1 }];
const started = (pcs: Pc[] = DUO, seed = 'PHC-0001') => apply(survivalRoom(seed, pcs, { test: true }), { type: 'run/start', seed, camp: 'recommended' }, 'host');
const clone = (g: GameState): GameState => JSON.parse(JSON.stringify(g));
const standOn = (g: GameState, id: string): GameState => { const x = clone(g); x.run!.at = id; x.run!.state = 'map'; return x; };

describe('rules 1.48: lanes through the reducer', () => {
  it('the start lets every lane be chosen; co-op leans there as before (the squad waits for every mark)', () => {
    const g = started(), first = reachable(g.run!);
    expect(first.length).toBe(g.run!.nodes.filter((n) => n.depth === 1).length);
    expect(first.length).toBeGreaterThanOrEqual(3);
    const one = apply(g, { type: 'run/move', node: first[0].id }, 'host');
    expect(one.run!.at).toBeNull(); expect(one.run!.leans.host).toBe(first[0].id);
  });

  it('on a lane with one way forward, the first player\'s click walks the squad on (no lean, no wait)', () => {
    const g = started(), lane = g.run!.nodes.find((n) => n.lane != null && n.links.length === 1 && n.depth > 1 && n.depth < 7)!;
    const x = standOn(g, lane.id), next = reachable(x.run!);
    expect(next).toHaveLength(1);
    const y = apply(x, { type: 'run/move', node: next[0].id }, 'p2');
    expect(y.run!.at).toBe(next[0].id); expect(y.run!.leans).toEqual({});
  });

  it('a junction offers its lanes, and co-op leans there; the vault\'s fork offers the lane and the guard', () => {
    const g = started(), j = g.run!.nodes.find((n) => n.junction && !n.gate && n.depth < 8)!;
    const x = standOn(g, j.id);
    expect(reachable(x.run!).length).toBe(j.links.length); expect(j.links.length).toBeGreaterThanOrEqual(2);
    const y = apply(x, { type: 'run/move', node: j.links[0] }, 'host');
    expect(y.run!.at).toBe(j.id); expect(y.run!.leans.host).toBe(j.links[0]);
    const guard = g.run!.nodes.find((n) => n.kind === 'vault_guard')!, fork = runNode(g.run!, guard.from)!;
    const f = standOn(g, fork.id);
    expect(reachable(f.run!).map((n) => n.kind)).toContain('vault_guard');
    expect(reachable(f.run!)).toHaveLength(2);
  });
});

describe('rules 1.48: the vault', () => {
  it('its guard\'s budget is an Elite fight\'s x guard_factor, and its anchor is the setting\'s named guard, an Elite', () => {
    const g = started(), guard = g.run!.nodes.find((n) => n.kind === 'vault_guard')!;
    for (const n of [1, 2, 3, 4]) {
      const e = budgetFor(n, 'elite', guard.depth, 1), v = budgetFor(n, 'vault_guard', guard.depth, 1);
      expect(v.bulk).toBeCloseTo(e.bulk * SV.vault.guard_factor, 6); expect(v.pressure).toBeCloseTo(e.pressure * SV.vault.guard_factor, 6);
    }
    expect(ENC_BUDGET.rounds.vault_guard).toBe(ENC_BUDGET.rounds.elite);
    const enc = composeEncounter({ levels: [3, 3], node: guard, stage: 1, setting: 'ahoc', seed: 'PHC-0001' });
    expect(enc.template).toBe('vault_watch');
    const named = enc.foes.find((f) => f.name === SETTING.ahoc.vault_guard!.name)!;
    expect(named.tier).toBe('elite'); expect(named.weapon).toBe(SETTING.ahoc.vault_guard!.weapon);
  });

  it('the guard fight pays as an Elite (XP, credits, pick), the chest pays credits and a pick a grade above the stage\'s, then the squad is back on its lane', () => {
    const g = started(), guard = g.run!.nodes.find((n) => n.kind === 'vault_guard')!, chest = runNode(g.run!, guard.links[0])!, fork = runNode(g.run!, guard.from)!;
    let x = standOn(g, fork.id);
    for (let i = 0; i < 2 && x.run!.at !== guard.id; i++) x = apply(x, { type: 'run/move', node: guard.id }, ownerOf(i));
    expect(x.run!.state).toBe('fight'); expect(x.run!.stats.fights.at(-1)!.kind).toBe('vault_guard');
    const before = creditsOf(x.characters.c1);
    x = apply(x, { type: 'run/skip' }, 'host');
    expect(x.characters.c1.xp).toBe(nodeXp('vault_guard', guard.depth, 1));
    expect(creditsOf(x.characters.c1)).toBe(before + nodeCredits('vault_guard', guard.depth, 1));
    for (let i = 0; i < 2; i++) x = apply(x, { type: 'run/pick', charId: 'c' + (i + 1), choice: 'credits' }, ownerOf(i));
    expect(reachable(x.run!).map((n) => n.id)).toEqual([chest.id]);
    const c0 = creditsOf(x.characters.c1);
    x = apply(x, { type: 'run/move', node: chest.id }, 'p2'); // one way: one click
    expect(x.run!.at).toBe(chest.id); expect(x.run!.state).toBe('reward');
    expect(creditsOf(x.characters.c1)).toBe(c0 + nodeCredits('vault', chest.depth, 1));
    expect(vaultGrade(1)).toBe('masterwork'); expect(stageCeiling(1)).toBe('fine'); expect(vaultGrade(2)).toBe('relic'); expect(vaultGrade(5)).toBe('relic');
    for (const w of x.run!.offers!.c1.weapons) expect(['masterwork']).toContain(w.rarity);
    const w0 = x.run!.offers!.c1.weapons[0];
    x = apply(x, { type: 'run/pick', charId: 'c1', choice: 0 }, 'host');
    x = apply(x, { type: 'run/pick', charId: 'c2', choice: 'credits' }, 'p2');
    expect(x.run!.state).toBe('map');
    expect((x.characters.c1.pack || []).some((p: any) => (p.weapon || p.item || p.id) === w0.id && p.rarity === 'masterwork')).toBe(true);
    expect(reachable(x.run!).map((n) => n.id)).toEqual(fork.links.filter((l) => l !== guard.id));
    expect(x.run!.path.slice(-2)).toEqual([guard.id, chest.id]);
  });
});
