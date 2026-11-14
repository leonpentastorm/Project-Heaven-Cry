// Stages, boons and the world (rules 1.44; survival-spec rules 3, 4, 6, 19, 30 to 32, 35; build step 5). Each of the
// thirteen boons does what its sentence says, in the item-op runner's own doors (the item-ops style: a fight, the
// relic carried, the number read from data), and its worth lands on the run's cap; the boon pick after the Boss (three
// from the tile's pool, a utility one in place of what would pass the cap, refusals in words); the next tile (settings
// not yet played, ready ones only, leaned like a node, the host's go); stage 2's fresh map, its fights composed with the
// stage term; retire and the loss keep the score (renown, boons, the stages' log); a character kept as a draft; and the
// replay guard over a seeded two-stage run, a save and load in the middle changing nothing.
import { describe, expect, it } from 'vitest';
import { type GameState, apply, RuleError, BOONS, BOON_CAP, worthOf, runWorth, capRoom, relicRow, previewAttack, toHitTerms, applyDamage, price, emit, bindGame,
  ammoPack, ammoMult, creditsFor, nodeCredits, nodeXp, budgetFor, foeLevel, ENC_BUDGET, SETTING, settingReady, boonOffer, boonProblem, nextTiles, nextPools, BOON_PICK, WORLD,
  renownOf, keptDraft, xpForLevel, devotionXpOf, setDevotionXp, devotionThreshold, maxHp, graftFor, mapNodes, pathMap, eliteUp, type RunNode } from '../src';
import { fightWith } from './helpers/perkfight';
import { Rec, type Pc } from './helpers/replay';
import { survivalRoom, ownerOf, playStage } from './helpers/survival';
import svJ from '../../../data/survival.json';

const SV: any = svJ;
const DUO: Pc[] = [{ build: 'plain_gun', level: 1 }, { build: 'sigil', level: 1 }];
const W = <T,>(g: GameState, f: () => T): T => { const was = bindGame(g); try { return f(); } finally { bindGame(was); } };
const refused = (g: GameState, a: any, by = 'host') => { try { apply(g, a, by); } catch (e) { expect(e).toBeInstanceOf(RuleError); return (e as Error).message; } throw new Error('expected a refusal: ' + a.type); };
const boon = (id: string) => BOONS.find((b) => b.id === id)! as any;
const started = (pcs: Pc[] = DUO, seed = 'PHC-0001') => apply(survivalRoom(seed, pcs, { test: true }), { type: 'run/start', seed }, 'host');
const clone = (g: GameState): GameState => JSON.parse(JSON.stringify(g));
/** Take a node: every player marks it (rules 1.48: where the way forks; on a lane with one way the first click goes). */
const take = (g: GameState, id: string, n: number) => { let x = g; for (let i = 0; i < n && x.run!.at !== id; i++) x = apply(x, { type: 'run/move', node: id }, ownerOf(i)); return x; };
/** The squad on a fight node (depth 3), its fight under way; `prep` changes the state first (relics, HP). */
function inFight(prep: (g: GameState) => void = () => {}, pcs: Pc[] = DUO): GameState {
  const g0 = clone(started(pcs)), r = g0.run!, n = r.nodes.find((x) => x.depth === 3)!, prev = r.nodes.find((x) => x.links.includes(n.id))!;
  n.kind = 'fight'; r.at = prev.id; r.state = 'map'; prep(g0);
  return take(g0, n.id, pcs.length);
}
/** The squad after its Boss, at the boon pick: the Boss node taken and won (run/skip), the weapon picks taken. */
function afterBoss(pcs: Pc[] = DUO, prep: (g: GameState) => void = () => {}, seed = 'PHC-0001'): GameState {
  const g0 = clone(started(pcs, seed)), r = g0.run!, boss = r.nodes.find((x) => x.kind === 'boss')!, prev = r.nodes.find((x) => x.links.includes(boss.id))!;
  r.at = prev.id; prep(g0);
  let g = apply(take(g0, boss.id, pcs.length), { type: 'run/skip' }, 'host');
  for (let i = 0; i < pcs.length; i++) g = apply(g, { type: 'run/pick', charId: 'c' + (i + 1), choice: 'credits' }, ownerOf(i));
  return g;
}

describe('rules 1.44: the thirteen boons, each through the item-op runner (spec section 3.5)', () => {
  it('thirteen boons in data, each a relic with one sentence and a worth; every setting\'s pool has one', () => {
    expect(BOONS).toHaveLength(13);
    for (const b of BOONS) { expect(b.kind).toBe('relic'); expect(b.text).not.toMatch(/\{=/); expect(typeof b.worth).toBe('number'); }
    for (const s of SV.settings) expect(BOONS.some((b) => (b.pools || []).includes(s.pool)), s.id).toBe(true);
  });
  it('Honed: +10% on what you deal (a damage term named for it, its value from data)', () => {
    const f = fightWith([{ kit: 'soldier', relics: ['boon.edge'] }], [{ tier: 'soldier' }]);
    const t = W(f.g, () => previewAttack(f.cb, f.pc, f.foe, 'shot')).dmg!.mults.find((m: any) => m.label === 'Honed');
    expect(t!.v).toBe(boon('boon.edge').effects[0].value);
  });
  it('Second Wind: +1 AP at the turn\'s start', () => {
    const ap = (relics: string[]) => { const f = fightWith([{ kit: 'soldier', relics }], [{ tier: 'soldier', at: '15,15' }]); return f.turn(f.pc).ap; };
    expect(ap(['boon.second_wind']) - ap([])).toBe(boon('boon.second_wind').effects[0].value);
  });
  it('True Aim: +1 on every roll to hit (the one to-hit hook)', () => {
    const terms = (relics: string[]) => { const f = fightWith([{ kit: 'soldier', relics }], [{ tier: 'soldier' }]); return W(f.g, () => toHitTerms(f.cb, f.pc, f.foe, 'weapon')); };
    expect(terms(['boon.true_aim']).find((t) => t.label === 'True Aim')!.v).toBe(boon('boon.true_aim').effects[0].value);
    expect(terms([]).some((t) => t.label === 'True Aim')).toBe(false);
  });
  it('Hardened: 10% less damage taken', () => {
    const lost = (relics: string[]) => { const f = fightWith([{ kit: 'soldier', relics }], [{ tier: 'soldier' }]), u = f.pc, was = u.hp; W(f.g, () => applyDamage(f.cb, u, 40, { by: f.foe, type: 'weapon', ranged: true })); return was - u.hp; };
    const a = lost([]), b = lost(['boon.hardened']);
    expect(b).toBe(Math.round(a * boon('boon.hardened').effects[0].value) === b ? b : Math.floor(a * boon('boon.hardened').effects[0].value)); expect(b).toBeLessThan(a);
  });
  it('Lifeline: the first blow each fight that would drop you leaves 1 HP; the second does not', () => {
    const f = fightWith([{ kit: 'soldier', relics: ['boon.lifeline'] }], [{ tier: 'soldier' }]), u = f.pc;
    W(f.g, () => applyDamage(f.cb, u, 9999, { by: f.foe, type: 'weapon', ranged: true })); expect(u.hp).toBe(boon('boon.lifeline').effects[0].value);
    W(f.g, () => applyDamage(f.cb, u, 9999, { by: f.foe, type: 'weapon', ranged: true })); expect(u.hp).toBeLessThanOrEqual(0);
  });
  it('Steady Breath: +1 Echo at the fight\'s start', () => {
    const f = fightWith([{ kit: 'soldier', relics: ['boon.echo'] }], [{ tier: 'soldier' }]);
    expect(f.g.characters[f.pc.charId!].echo).toBe(1 + boon('boon.echo').effects[0].value);
  });
  it('Primed: the door\'s meter starts the fight a step up (Guard +2 for a Durability user), only for the doors it serves', () => {
    const f = fightWith([{ kit: 'soldier', relics: ['boon.primed'], skills: { durability: 3, raw_power: 0, ingenuity: 0 } }], [{ tier: 'soldier' }]);
    const g0 = fightWith([{ kit: 'soldier', skills: { durability: 3, raw_power: 0, ingenuity: 0 } }], [{ tier: 'soldier' }]);
    expect(((f.pc as any).res?.guard ?? 0) - ((g0.pc as any).res?.guard ?? 0)).toBe(boon('boon.primed').effects[0].value);
    const c: any = { id: 'x', name: 'X', skills: { brain_power: 4 }, relics: [] };
    expect(boonOffer(c, 'war', 'S', 'n').includes('boon.primed')).toBe(false); // it serves no door this one has
  });
  it('Quick Hands: the first reload each turn 1 AP less, and a swap then pays full (one shared use a turn)', () => {
    const f = fightWith([{ kit: 'soldier', relics: ['boon.reflexes'] }], [{ tier: 'soldier' }]), plain = fightWith([{ kit: 'soldier' }], [{ tier: 'soldier' }]);
    const rl = (x: any) => W(x.g, () => price({ cb: x.cb, u: x.pc }, 'reload').ap);
    expect(rl(f)).toBe(Math.max(boon('boon.reflexes').effects[0].min, rl(plain) + boon('boon.reflexes').effects[0].value));
    const sw = (x: any) => W(x.g, () => (emit(x.cb, 'swap', { u: x.pc, c: x.g.characters[x.pc.charId], ap: 1, cb: x.cb }) as any).ap);
    expect(sw(f)).toBe(0); expect(sw(plain)).toBe(1); // the first swap of the turn
    expect(sw(f)).toBe(1); // the turn's one use is spent
  });
  it('Deep Well: +20% on the heals and shields you give (a mend_mult on heal and shield, actor self)', () => {
    const b = boon('boon.deep_well');
    expect(b.effects.map((e: any) => [e.op, e.when, e.if.actor, e.value])).toEqual([['mend_mult', 'heal', 'self', 1.2], ['mend_mult', 'shield', 'self', 1.2]]);
  });
  it('Field Mending: at the fight\'s end you heal 20% of your max HP, and it goes home with you (the combat_over trigger)', () => {
    const g = inFight((g0) => { g0.characters.c1.relics = ['boon.mending']; });
    const u = g.combat!.units.find((x) => x.charId === 'c1')!, u2 = g.combat!.units.find((x) => x.charId === 'c2')!;
    u.hp = 10; u2.hp = 10;
    const done = apply(g, { type: 'run/skip' }, 'host'), units = done.combat!.units, at = (id: string) => units.find((x) => x.charId === id)!;
    expect(at('c1').hp).toBe(10 + Math.floor(u.maxHp * boon('boon.mending').effects[0].amount.per[0].value)); // the fight's end, before the write-back
    expect(at('c2').hp).toBe(10);
    expect(done.characters.c1.hp).toBe(at('c1').hp + (maxHp(done.characters.c1) - u.maxHp)); // it went home (the level-up after the pay adds its own HP)
  });
  it('Bandolier: the ammunition pack x2, its magazines and its cores (the stat run_ammo)', () => {
    const g = started(DUO), c: any = clone(g).characters.c2;
    const before = ammoPack(c, 1); c.relics = ['boon.bandolier'];
    expect(ammoMult(c)).toBe(boon('boon.bandolier').effects[0].value);
    const after = ammoPack(c, 1), cores = (l: any[]) => l.filter((x) => (x.item || x.id) === 'standard_core').reduce((t, x) => t + (x.qty || 1), 0);
    expect(after.length - cores(after) && after.length).toBeGreaterThan(before.length);
    expect(cores(after)).toBe(cores(before) * 2);
  });
  it('Tithe: +50% credits from every node that pays (the stat run_credits), paid through the reducer', () => {
    const g = inFight((g0) => { g0.characters.c1.relics = ['boon.tithe']; });
    const was = { c1: g.characters.c1.credits!, c2: g.characters.c2.credits! }, done = apply(g, { type: 'run/skip' }, 'host');
    const cr = nodeCredits('fight', 3, 1);
    expect(done.characters.c1.credits! - was.c1).toBe(creditsFor(done.characters.c1, cr)); expect(creditsFor(done.characters.c1, cr)).toBe(Math.round(cr * boon('boon.tithe').effects[0].value));
    expect(done.characters.c2.credits! - was.c2).toBe(cr);
  });
  it('Devout: +1 Devotion XP at each fight\'s end for the Faithful, inside the session\'s cap (the resource devotion_xp)', () => {
    const g = inFight((g0) => { const c: any = g0.characters.c1; c.relics = ['boon.devout']; c.belief = { kind: 'faithful', patron: 'mother_ember' }; c.patron = 'mother_ember'; setDevotionXp(c, devotionThreshold(3)); });
    const was = devotionXpOf(g.characters.c1), done = apply(g, { type: 'run/skip' }, 'host');
    expect(devotionXpOf(done.characters.c1) - was).toBe(boon('boon.devout').effects[0].value);
  });
  it('every boon\'s worth lands on the cap when it is taken', () => {
    for (const b of BOONS) { const c: any = { relics: [b.id], weapon: 'service_pistol', pack: [] }; expect(runWorth(c)).toBe(b.worth); expect(capRoom(c)).toBe(BOON_CAP - b.worth); }
  });
});

describe('rules 1.44: the boon pick after the Boss (spec rules 30, 31)', () => {
  it('after the Boss\'s picks every character is offered three boons, from the tile\'s pool first; one is taken through the reducer; then the tiles', () => {
    const g = afterBoss();
    expect(g.run!.state).toBe('boon');
    const pool = SETTING.ahoc.pool, offer = g.run!.boons!.c1;
    expect(offer).toHaveLength(BOON_PICK.offer); expect(new Set(offer).size).toBe(offer.length);
    expect(offer.filter((id) => (relicRow(id) as any).pools.includes(pool)).length).toBe(Math.min(BOON_PICK.offer, BOONS.filter((b) => (b.pools || []).includes(pool)).length));
    expect(offer).toEqual(boonOffer(g.characters.c1, pool, g.run!.seed, g.run!.at!)); // from the seed: the same on a second look
    let x = apply(g, { type: 'run/boon', charId: 'c1', choice: 1 }, 'host');
    expect(x.characters.c1.relics).toContain(offer[1]); expect(runWorth(x.characters.c1)).toBe(worthOf(offer[1]));
    expect(x.run!.state).toBe('boon');
    expect(refused(x, { type: 'run/boon', charId: 'c2', choice: 0 }, 'p3')).toBe('Only Player 2\'s player picks for Player 2 (or the host, for an away player).'.replace(/Player 2/g, x.characters.c2.name));
    x = apply(x, { type: 'run/boon', charId: 'c2', choice: 0 }, 'p2');
    expect(x.run!.state).toBe('tile'); expect(x.run!.boons).toBeNull();
    expect(x.run!.stages![0].boons).toEqual({ c1: offer[1], c2: g.run!.boons!.c2[0] });
    expect(refused(x, { type: 'run/boon', charId: 'c1', choice: 0 })).toBe('There is no boon to pick for that character now.');
  });
  it('the cap: a boon that would pass it is replaced by a utility boon (worth 0); none held is offered twice; a pick past the cap is refused in words', () => {
    const c: any = { id: 'c9', name: 'Nine', skills: { durability: 1 }, relics: ['boon.second_wind', 'boon.hardened', 'boon.edge'], weapon: 'service_pistol', pack: [] }; // 40 of 50
    for (let i = 0; i < 20; i++) {
      const o = boonOffer(c, 'discipline', 'CAP-' + i, 's1.d15.0');
      for (const id of o) { expect(worthOf(id)).toBeLessThanOrEqual(capRoom(c)); expect(c.relics).not.toContain(id); }
      expect(o.length).toBeGreaterThan(0);
    }
    expect(boonProblem(c, ['boon.lifeline', 'boon.true_aim'], 'boon.true_aim')).toBeNull();
    c.relics.push('boon.lifeline'); // 48 of 50
    expect(boonProblem(c, ['boon.true_aim'], 'boon.true_aim')).toBe('True Aim is worth ' + worthOf('boon.true_aim') + ' of the run\'s ' + BOON_CAP + '; Nine has ' + (BOON_CAP - 48) + ' left.');
    expect(boonProblem(c, ['boon.edge'], 'boon.edge')).toBe('Nine already has Honed.');
    expect(boonOffer(c, 'discipline', 'CAP-0', 's1.d15.0').every((id) => worthOf(id) === 0)).toBe(true);
  });
  it('boons cannot be given: a boon is a relic on the character, never a pack entry, and the kept draft leaves it behind', () => {
    const g = apply(afterBoss(), { type: 'run/boon', charId: 'c1', choice: 0 }, 'host'), c = g.characters.c1, id = c.relics![0];
    expect((c.pack || []).some((p: any) => (p.item || p.id) === id)).toBe(false);
    expect((keptDraft(c, 'S', 1) as any).relics).toBeUndefined();
  });
});

describe('rules 1.44: the next tile and stage 2 (spec rules 3, 19, 32)', () => {
  it('two or three tiles, ready settings, none played yet where possible, each with its pool; the graft reads their pools', () => {
    const g = started();
    const t = nextTiles(g.run!);
    expect(t.length).toBeGreaterThanOrEqual(WORLD.min); expect(t.length).toBeLessThanOrEqual(WORLD.offer);
    for (const x of t) { expect(settingReady(SETTING[x.setting])).toBe(true); expect(x.setting).not.toBe('ahoc'); expect(x.stage).toBe(2); expect(x.boons.length).toBeGreaterThan(0); }
    expect(nextPools(g.run!)).toEqual([...new Set(t.map((x) => SETTING[x.setting].pool))]);
    const c = g.characters.c1, gid = W(g, () => graftFor({ ...g, run: { ...g.run!, at: g.run!.nodes[0].id } } as any, c));
    if (gid) expect(nextPools(g.run!).some((p) => (relicRow(gid) as any).pools.includes(p))).toBe(true);
  });
  it('the tile is leaned like a node: the squad waits for every mark, a tie to the host; the host may go; stage 2 starts on a fresh map from the seed', () => {
    let g = afterBoss();
    g = apply(apply(g, { type: 'run/boon', charId: 'c1', choice: 0 }, 'host'), { type: 'run/boon', charId: 'c2', choice: 0 }, 'p2');
    const tiles = g.run!.tiles!;
    expect(refused(g, { type: 'run/tile', tile: 'nope' })).toBe('No such tile on offer.');
    let x = apply(g, { type: 'run/tile', tile: tiles[1].id }, 'p2'); expect(x.run!.state).toBe('tile');
    x = apply(x, { type: 'run/tile', tile: tiles[0].id }, 'host');
    expect(x.run!.stage).toBe(2); expect(x.run!.world.at(-1)!.setting).toBe(tiles[0].setting); // a tie: the host's
    expect(x.run!.world[0].links).toEqual(tiles.map((t) => t.id));
    expect(x.run!.nodes.map((n) => n.id)).toEqual(mapNodes(pathMap(g.run!.seed, 2, undefined, tiles[0].setting)).map((n) => n.id));
    expect(x.run!.state).toBe('map'); expect(x.run!.at).toBeNull(); expect(x.run!.stages).toHaveLength(2);
    const y = apply(apply(g, { type: 'run/tile', tile: tiles[1].id }, 'p2'), { type: 'run/go' }, 'host');
    expect(y.run!.world.at(-1)!.setting).toBe(tiles[1].setting);
    expect(refused(g, { type: 'run/go' }, 'p2')).toBe('Only the host sends the squad on before everyone has marked a node.');
  });
  it('stage 2\'s fights are composed with the stage term: the budget x the stage\'s bulk and pressure, Elites and Bosses the stage\'s lead up, XP and credits x the stage\'s', () => {
    const r = new Rec(survivalRoom('PHC-0005', DUO, { test: true }), DUO);
    r.must({ type: 'run/start', seed: 'PHC-0005' });
    playStage(r, 2, { skip: true, through: 2 });
    expect(r.errors).toEqual([]);
    const s2 = r.g.run.stats.fights.filter((f: any) => f.stage === 2);
    expect(s2.length).toBeGreaterThan(0);
    for (const f of s2) {
      const want = budgetFor(2, f.kind, f.depth, 2);
      expect(f.target.bulk).toBeCloseTo(want.bulk, 6); expect(f.target.pressure).toBeCloseTo(want.pressure, 6);
      expect(Math.abs(f.spent.bulk - f.target.bulk)).toBeLessThanOrEqual(f.target.bulk * ENC_BUDGET.bulkBand + 1e-6);
      expect(f.spent.pressure).toBeLessThanOrEqual(f.target.pressure * (1 + ENC_BUDGET.pressureBand) + 1e-6);
      for (const foe of f.foes) expect(foe.level).toBe(foeLevel(foe.tier, f.level, 2));
      if (f.kind !== 'fight') expect(f.foes.some((x: any) => (x.tier === 'elite' || x.tier === 'boss') && x.level === Math.min(20, f.level + eliteUp(2)))).toBe(true); // rules 1.49: the stage's lead from data
    }
    expect(nodeXp('fight', 3, 2)).toBe(Math.round(nodeXp('fight', 3, 1) * SV.stage.xp[1]));
    expect(nodeCredits('fight', 3, 2)).toBe(Math.round(nodeCredits('fight', 3, 1) * (1 + SV.stage.credits)));
    expect(r.g.run.stage).toBe(2); expect(r.g.run.state).toBe('boon'); expect(r.g.run.stages).toHaveLength(2);
    const l2 = r.g.run.stages[1]; expect(l2.nodes).toBe(SV.map.rows); expect(l2.fights).toBe(s2.length); expect(l2.won).toBe(s2.length);
  });
});

describe('rules 1.44: the end of a run and its score (spec rules 4, 6, 35)', () => {
  it('retire after a Boss keeps the score: stages cleared, nodes, renown, each character\'s boons and the stages\' log', () => {
    let g = apply(afterBoss(), { type: 'run/boon', charId: 'c1', choice: 0 }, 'host');
    g = apply(g, { type: 'run/retire' }, 'host');
    const e = g.run!.end!;
    expect(e).toMatchObject({ how: 'retired', cleared: 1, renown: 0 });
    expect(e.boons!.c1).toEqual(g.characters.c1.relics); expect(e.boons!.c2).toEqual([]);
    expect(e.stages![0]).toMatchObject({ stage: 1, setting: 'ahoc', fights: 1, won: 1, boons: { c1: g.characters.c1.relics![0] } });
    expect(e.stages![0].credits).toBeGreaterThan(0);
  });
  it('the wipe: a lost fight ends the run with its score; the run is not retired', () => {
    const x = clone(inFight());
    for (const u of x.combat!.units) if (u.side === 'pc') { u.dead = true; u.hp = 0; }
    const cur = x.combat!.order[x.combat!.turn], unit = x.combat!.units.find((u) => u.id === cur)!;
    const g = apply(x, { type: 'combat/end-turn', unitId: unit.id }, 'host'), e = g.run!.end!;
    expect(e).toMatchObject({ how: 'lost', stage: 1, cleared: 0, renown: 0 });
    expect(e.stages![0]).toMatchObject({ fights: 1, won: 0 }); expect(e.boons).toEqual({ c1: [], c2: [] });
    expect(g.phase).toBe('lobby');
  });
  it('renown: the XP past level 20 counts only to the score (rule 6)', () => {
    const c: any = { xp: xpForLevel(20) + 345 }, d: any = { xp: 100 };
    expect(renownOf([c, d])).toBe(345);
  });
  it('a character kept as a draft keeps its level, gear and perks, and leaves the run\'s purse and relics', () => {
    const g = afterBoss(), c = g.characters.c1, k: any = keptDraft(c, g.run!.seed, g.run!.stage);
    expect(k.level).toBe(c.level); expect(k.xp).toBe(c.xp); expect(k.weapon).toBe(c.weapon); expect(k.draft).toBe(true);
    expect(k.kept).toEqual({ from: 'survival', seed: g.run!.seed, stage: 1, level: c.level, name: c.name }); expect(k.name).toBe(c.name + ' (level ' + c.level + ')');
    expect(k.credits).toBeUndefined(); expect(k.id).toBeUndefined(); expect(k.owner).toBeUndefined();
  });
});

describe('rules 1.44: the replay guard over two stages', () => {
  it('a seeded two-stage run through the reducer gives the same hash twice, and a save and load in the middle changes nothing', () => {
    const play = (reload: number[] = []) => { const r = new Rec(survivalRoom('PHC-0006', DUO, { test: true }), DUO, reload); r.must({ type: 'run/start', seed: 'PHC-0006' }); playStage(r, 2, { skip: true, through: 2 }); return r; };
    const a = play(), b = play(), c = play([30]);
    expect(a.errors).toEqual([]);
    expect(a.g.run.stage).toBe(2); expect(a.g.run.state).toBe('boon');
    expect(a.done()).toEqual(b.done());
    expect(c.done().state).toBe(a.done().state); expect(c.done().stream).toBe(a.done().stream);
  }, 600_000);
});
