// A Survival stage through the one reducer (rules 1.41; survival-spec rules 2, 4, 5, 8, 11, 13 to 26; build step 3):
// the path map on run/start, a node marked and taken (solo at once, co-op by leans and the host's tie), a fight started
// on the composed encounter, its rewards (XP, credits, the ammunition pack, the weapon pick), death and the return at
// 1 HP, a loss ending the run, the rest and the cache, the panels of the nodes still to be built, the Boss clearing the
// stage, retiring to the lobby. Numbers are read from data/survival.json. Then the replay guard: a seeded stage played
// by the simulator's policies gives the same hash twice, and a save and load in the middle changes nothing.
import { describe, expect, it } from 'vitest';
import { type GameState, apply, RuleError, mapNodes, pathMap, reachable, runNode, nodeXp, nodeCredits, ENC_BUDGET, creditsOf, priceOf, maxHp, NODE_TEXT, type RunNode } from '../src';
import { Rec, type Pc } from './helpers/replay';
import { survivalRoom, startRun, ownerOf, playStage } from './helpers/survival';
import svJ from '../../../data/survival.json';

const SV: any = svJ;
const SOLO: Pc[] = [{ build: 'plain_gun', level: 1 }];
const DUO: Pc[] = [{ build: 'plain_gun', level: 1 }, { build: 'sigil', level: 1 }];
const SQUAD: Pc[] = [{ build: 'plain_gun', level: 1 }, { build: 'tank', level: 1 }, { build: 'sigil', level: 1 }, { build: 'outburst', level: 1 }];
const refused = (g: GameState, a: any, by = 'host') => { try { apply(g, a, by); } catch (e) { expect(e).toBeInstanceOf(RuleError); return (e as Error).message; } throw new Error('expected a refusal: ' + a.type); };
const started = (pcs: Pc[], seed = 'PHC-0001', test = true) => startRun(survivalRoom(seed, pcs, { test }), seed);
/** Take a node: every player marks it (rules 1.48: where the way forks; on a lane with one way the first click goes). */
const take = (g: GameState, node: RunNode | string, n: number) => { let x = g; const id = typeof node === 'string' ? node : node.id; for (let i = 0; i < n && x.run!.at !== id; i++) x = apply(x, { type: 'run/move', node: id }, ownerOf(i)); return x; };
const firstOf = (g: GameState, kind: string) => g.run!.nodes.find((n) => n.kind === kind)!;
/** A copy with the run standing on `id` (as if the path there was walked), on its map. */
const standOn = (g: GameState, id: string | null): GameState => { const x: GameState = JSON.parse(JSON.stringify(g)); x.run!.at = id; x.run!.state = 'map'; return x; };
/** The node before `n` on the map: one that links to it. */
const before = (g: GameState, n: RunNode) => g.run!.nodes.find((x) => x.links.includes(n.id))!;

describe('Survival, one stage (rules 1.41)', () => {
  it('run/start: the stage\'s path map from the seed, stage 1\'s tile, every purse at start_credits, the first row reachable', () => {
    const g = started(DUO);
    expect(g.run!.nodes).toEqual(mapNodes(pathMap('PHC-0001', 1, undefined, SV.run.first_setting)));
    expect(g.run!.world[0].setting).toBe(SV.run.first_setting);
    for (const c of Object.values(g.characters)) expect(creditsOf(c)).toBe(SV.run.start_credits);
    expect(reachable(g.run!).map((n) => n.depth)).toEqual(g.run!.nodes.filter((n) => n.depth === 1).map(() => 1));
    expect(g.run!.state).toBe('map'); expect(g.phase).toBe('story');
  });

  it('run/move refuses in words: a node out of reach, a non-player; solo, a mark is the move', () => {
    const g = started(SOLO), far = g.run!.nodes.find((n) => n.depth === 3)!;
    expect(refused(g, { type: 'run/move', node: far.id })).toMatch(/^You can't reach .+ at depth 3 from here: pick a lit node\.$/);
    expect(refused(g, { type: 'run/move', node: 'nowhere' })).toBe('No such node on this map.');
    expect(refused(g, { type: 'run/move', node: reachable(g.run!)[0].id }, 'stranger')).toBe('Only a player in the room picks the way.');
    const f = take(g, reachable(g.run!)[0], 1);
    expect(f.run!.at).toBe(reachable(g.run!)[0].id); expect(f.phase).toBe('combat'); expect(f.run!.state).toBe('fight');
    expect(refused(f, { type: 'run/move', node: f.run!.nodes[0].id })).toBe('The fight is on.');
  });

  it('co-op (rule 11): the squad waits for every mark; a tie goes to the host\'s; the host may go at once, a guest may not', () => {
    const g = started(DUO), [a, b] = reachable(g.run!);
    const one = apply(g, { type: 'run/move', node: a.id }, 'host');
    expect(one.run!.at).toBeNull(); expect(one.run!.leans).toEqual({ host: a.id });
    expect(refused(one, { type: 'run/go' }, 'p2')).toBe('Only the host sends the squad on before everyone has marked a node.');
    const tie = apply(one, { type: 'run/move', node: b.id }, 'p2');
    expect(tie.run!.at).toBe(a.id); expect(tie.run!.leans).toEqual({});
    const guestLed = apply(apply(g, { type: 'run/move', node: b.id }, 'p2'), { type: 'run/go' }, 'host');
    expect(guestLed.run!.at).toBe(b.id); // the host goes at once: the only mark is the guest's
    expect(refused(g, { type: 'run/go' })).toBe('Mark a node first.');
  });

  it('a fight node starts the composed fight on the fight\'s dice, and records its budget', () => {
    const g = take(started(DUO), reachable(started(DUO).run!)[0], 2), f = g.run!.stats.fights[0];
    expect(g.combat!.units.filter((u) => u.side === 'foe').length).toBe(f.foes.length);
    expect(g.combat!.map.w).toBeGreaterThanOrEqual(16);
    expect(Math.abs(f.spent.bulk - f.target.bulk)).toBeLessThanOrEqual(f.target.bulk * ENC_BUDGET.bulkBand + 1e-9);
    expect(g.combat!.noXp).toBe(true);
  });

  it('run/skip is the test room\'s only; a won fight pays XP, credits, the ammunition pack and a pick of three capped at Fine in stage 1', () => {
    const plain = take(started(DUO, 'PHC-0001', false), reachable(started(DUO).run!)[0], 2);
    expect(refused(plain, { type: 'run/skip' })).toBe('Skipping a fight is for the test room only.');
    const g0 = take(started(DUO), reachable(started(DUO).run!)[0], 2);
    expect(refused(g0, { type: 'run/skip' }, 'p2')).toBe('Only the host skips a fight.');
    const mags0 = g0.characters.c1.pack!.find((p) => p.mags && p.weapon === g0.characters.c1.weapon)!.mags!.length;
    const g = apply(g0, { type: 'run/skip' }, 'host'), n = runNode(g.run!, g.run!.at)!;
    expect(g.run!.state).toBe('reward'); expect(g.phase).toBe('story');
    expect(g.characters.c1.xp).toBe(nodeXp('fight', n.depth, 1));
    expect(creditsOf(g.characters.c1)).toBe(SV.run.start_credits + nodeCredits('fight', n.depth, 1));
    expect(nodeXp('fight', 2, 1)).toBe(SV.xp.base + SV.xp.per_depth); expect(nodeCredits('fight', 1, 1)).toBe(SV.credits.base + SV.credits.per_depth);
    expect(g.characters.c1.pack!.find((p) => p.mags && p.weapon === g.characters.c1.weapon)!.mags!.length).toBe(mags0 + SV.ammo_pack.fight);
    for (const id of ['c1', 'c2']) {
      const o = g.run!.offers![id];
      expect(o.weapons).toHaveLength(SV.rewards.offer);
      for (const w of o.weapons) { expect(['standard', 'fine']).toContain(w.rarity); expect(w.price).toBe(priceOf(w.id, w.rarity)); expect(priceOf(w.id)!).toBeLessThanOrEqual(SV.rewards.price_band.base + SV.rewards.price_band.per_depth * n.depth); }
      expect(o.instead).toBe(Math.round(Math.min(...o.weapons.map((w) => w.price)) * SV.rewards.instead_rate));
    }
    // the picks: owner (or host) only; a weapon into the pack at its rarity; credits instead; then back to the map
    expect(refused(g, { type: 'run/pick', charId: 'c1', choice: 0 }, 'p2')).toMatch(/^Only .+'s player picks for /);
    const w = g.run!.offers!.c1.weapons[1];
    const p1 = apply(g, { type: 'run/pick', charId: 'c1', choice: 1 }, 'host');
    expect(p1.characters.c1.pack!.some((x) => (x.weapon || x.item || x.id) === w.id && (x.rarity || 'standard') === w.rarity)).toBe(true);
    expect(p1.run!.state).toBe('reward');
    expect(refused(p1, { type: 'run/move', node: p1.run!.nodes[0].id })).toBe('Take your picks first: the squad moves on when everyone has.');
    const p2 = apply(p1, { type: 'run/pick', charId: 'c2', choice: 'credits' }, 'p2');
    expect(creditsOf(p2.characters.c2)).toBe(creditsOf(g.characters.c2) + g.run!.offers!.c2.instead);
    expect(p2.run!.state).toBe('map'); expect(p2.run!.offers).toBeNull();
    expect(reachable(p2.run!).map((x) => x.id)).toEqual(runNode(p2.run!, p2.run!.at)!.links);
  });

  it('rule 5: a character dead in a won fight stands at 1 HP and takes its full share', () => {
    const g0 = take(started(DUO), reachable(started(DUO).run!)[0], 2), x: GameState = JSON.parse(JSON.stringify(g0));
    const u = x.combat!.units.find((v) => v.charId === 'c2')!; u.dead = true; u.hp = 0;
    const g = apply(x, { type: 'run/skip' }, 'host');
    // back at 1 HP, then the level its share of XP gives adds its HP as any level does
    expect(g.characters.c2.dead).toBe(false); expect(g.characters.c2.hp).toBe(SV.run.dead_return_hp + maxHp(g.characters.c2) - maxHp(g0.characters.c2));
    expect(g.characters.c2.xp).toBe(g.characters.c1.xp); expect(g.run!.offers!.c2).toBeTruthy(); expect(g.run!.note!.back).toEqual(['c2']);
  });

  it('rule 4: the whole party down loses the run: it is over with its score and the room is back in its lobby', () => {
    const g0 = take(started(SOLO), reachable(started(SOLO).run!)[0], 1), x: GameState = JSON.parse(JSON.stringify(g0));
    for (const u of x.combat!.units) if (u.side === 'pc') { u.dead = true; u.hp = 0; }
    const cur = x.combat!.order[x.combat!.turn], unit = x.combat!.units.find((u) => u.id === cur)!;
    const g = apply(x, { type: 'combat/end-turn', unitId: unit.id }, 'host');
    expect(g.run!.state).toBe('over'); expect(g.run!.end).toMatchObject({ how: 'lost', stage: 1, cleared: 0, nodes: 1 });
    expect(g.phase).toBe('lobby'); expect(g.run!.stats.fights[0].outcome).toBe('loss');
    expect(refused(g, { type: 'run/start', seed: 'X' })).toBe('Plain gun 1 fell in the last run: take Plain gun 1 back and bring a fresh level 1 character.');
  });

  it('a rest heals in full and begins a session; a cache pays its XP, credits and ammunition; the others say what will be there', () => {
    const g = started(DUO), rest = firstOf(g, 'rest'), at = standOn(g, before(g, rest).id);
    for (const c of Object.values(at.characters)) c.hp = 5;
    const r = take(at, rest, 2);
    for (const c of Object.values(r.characters)) expect(c.hp).toBe(maxHp(c));
    expect(r.sessionN).toBe((at.sessionN || 0) + 1); expect(r.run!.state).toBe('map'); expect(r.run!.note!.text).toBe(NODE_TEXT.rest);
    const cache = firstOf(g, 'cache'), c0 = standOn(g, before(g, cache).id), cg = take(c0, cache, 2);
    expect(cg.characters.c1.xp).toBe(nodeXp('cache', cache.depth, 1)); expect(creditsOf(cg.characters.c1)).toBe(SV.run.start_credits + nodeCredits('cache', cache.depth, 1));
    expect(cg.run!.note!.ammo!.c1.length).toBeGreaterThan(0);
    for (const k of ['forge', 'training', 'shrine', 'event']) { // the shop opens full screen (rules 1.42: survival-shop.test.ts)
      const n = g.run!.nodes.find((x) => x.kind === k); if (!n) continue;
      const t = take(standOn(g, before(g, n).id), n, 2);
      expect(t.run!.note!.text).toBe(NODE_TEXT[k]); expect(t.run!.state).toBe('map'); expect(reachable(t.run!).length).toBeGreaterThan(0);
    }
  });

  it('the Boss clears the stage: after its picks the run stands at the boon, and the host retires it back to the lobby', () => {
    const g = started(DUO), boss = firstOf(g, 'boss'), at = standOn(g, before(g, boss).id);
    let x = apply(take(at, boss, 2), { type: 'run/skip' }, 'host');
    expect(x.run!.state).toBe('reward'); expect(x.characters.c1.xp).toBe(nodeXp('boss', 15, 1));
    expect(refused(x, { type: 'run/retire' })).toBe('You retire after a Boss: beat this stage\'s Boss first.');
    x = apply(apply(x, { type: 'run/pick', charId: 'c1', choice: 0 }, 'host'), { type: 'run/pick', charId: 'c2', choice: 0 }, 'p2');
    expect(x.run!.state).toBe('boon');
    expect(refused(x, { type: 'run/retire' }, 'p2')).toBe('Only the host retires the run.');
    const done = apply(x, { type: 'run/retire' }, 'host');
    expect(done.phase).toBe('lobby'); expect(done.run!.end).toMatchObject({ how: 'retired', cleared: 1 });
  });

  it('a whole stage walked through the reducer by run/skip reaches the Boss and clears it, every step accepted', () => {
    const r = new Rec(survivalRoom('PHC-0002', DUO, { test: true }), DUO);
    r.must({ type: 'run/start', seed: 'PHC-0002' });
    playStage(r, 2, { skip: true });
    expect(r.errors).toEqual([]);
    expect(r.g.run.state).toBe('boon'); expect(r.g.run.path).toHaveLength(SV.map.rows);
    expect(r.g.characters.c1.level).toBeGreaterThanOrEqual(3); // the class is earned at level 3 on the way (the level-up screen picks it)
  });

  // The "try it" of a stage (build step 3's npm run try equivalent): SURVIVAL_STAGE_REPORT=1 plays whole stages by the
  // simulator's policies (solo and a squad of four, six seeds each) and prints each fight's budget, rounds and result.
  it.runIf((globalThis as any).process?.env?.SURVIVAL_STAGE_REPORT)('report: stages played by the policies', () => {
    const lines: string[] = [];
    for (const [name, pcs] of [['solo plain gun', SOLO], ['squad of four', SQUAD]] as [string, Pc[]][]) for (let s = 1; s <= 6; s++) {
      const r = new Rec(survivalRoom('PHC-T' + s, pcs, { test: true }), pcs); r.must({ type: 'run/start', seed: 'PHC-T' + s }); playStage(r, pcs.length);
      const run = r.g.run, fs = run.stats.fights;
      lines.push(name + ' PHC-T' + s + ': ' + (run.state === 'boon' ? 'STAGE CLEARED' : 'lost at node ' + run.path.length) + ', levels ' + Object.values(r.g.characters).map((c: any) => c.level).join('/') + (r.errors.length ? ' ERR ' + r.errors[0] : ''));
      for (const f of fs) lines.push('   d' + f.depth + ' ' + f.kind + ' ' + f.template + ' L' + f.level + ': bulk ' + f.spent.bulk.toFixed(2) + '/' + f.target.bulk.toFixed(2) + ', pressure ' + f.spent.pressure.toFixed(2) + '/' + f.target.pressure.toFixed(2) + ', ' + f.foes.length + ' foes, ' + f.outcome + ' in ' + f.rounds + ' (R ' + f.target.rounds + ')');
    }
    (globalThis as any).console.log(lines.join('\n'));
  }, 1_200_000);

  it('the replay guard: a seeded stage played by the simulator\'s policies gives the same hash twice, and a save and load in the middle changes nothing', () => {
    const play = (reload: number[] = []) => { const r = new Rec(survivalRoom('PHC-0003', SQUAD, { test: true }), SQUAD, reload); r.must({ type: 'run/start', seed: 'PHC-0003' }); playStage(r, SQUAD.length); return r; };
    const a = play(), b = play(), c = play([40]);
    expect(a.errors).toEqual([]);
    expect(a.done()).toEqual(b.done());
    expect(c.done().state).toBe(a.done().state); expect(c.done().stream).toBe(a.done().stream);
    expect(['boon', 'over']).toContain(a.g.run.state);
    expect(a.g.run.stats.fights.length).toBeGreaterThan(0);
  }, 600_000);
});
