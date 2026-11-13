// Rules 1.37 (Classes 3.0 step 9): what enemies do about the four new systems (Shadow, Bonds, Figments, the Chaplain)
// and the reaction rule. Each test is a small scripted fight that asserts the CHOICE the AI makes (its real target
// ranking through enemyIntent / enemyTurn, its route score), with the numbers read from data. No HP or damage number
// above level 1 is pinned (step 7b re-scales them).
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { figFight } from './helpers/figfight';
import { withGame } from './helpers/perkfight';
import ENEMIESJ from '../../../data/enemies.json';
import FIGJ from '../../../data/figments.json';
import { ARCHETYPES, MAPS, newCharacter, startCombat, refOf, enemyTurn, enemyIntent, dist, noteSeenAt, healerMark, paths, aiRouteRisk, aiTileRisk, makeZone, emit, hide, startHidden, applyCond, canReact, react, unitSees, type Sheet, type MapDef, type Combat, type Unit } from '../src';
import { ENEMY_AI } from '../src/data';

const AI: any = (ENEMIESJ as any).ai;
const a0 = ARCHETYPES[0];
const sheet: Sheet = { name: 'P', portrait: '', origin: 'Central City', kit: 'medic', traits: [], skills: { ...a0.preset }, attrs: { ...a0.attributes }, cores: { ...a0.cores }, identity: {} } as any;
const open = (solid: string[] = []): MapDef => ({ ...MAPS.yard16, w: 26, h: 12, cover: [], full: [], solid, difficult: [], pcStart: ['2,5'], foeStart: ['20,5'] });
const rng = (n = 3) => ({ state: n });
/** A fight on open ground: characters at the tiles given, foes {at, tier, weapon, tags}; everyone sees far; HP large. */
function fight(pcAt: string[], foes: { at: string; tier?: string; weapon?: string; tags?: string[] }[], map = open()) {
  const cb = startCombat('t', map, pcAt.map((at, i) => ({ c: newCharacter('c' + i, 'p1', { ...sheet, name: 'P' + (i + 1) } as any), pos: at })),
    foes.map((f, i) => ({ name: 'Foe ' + (i + 1), at: refOf(f.at), tier: f.tier || 'soldier', weapon: f.weapon || 'service_pistol', ...(f.tags ? { tags: f.tags } : {}) } as any)), 'easy', { state: 5 }, []);
  cb.objects = [];
  const pcs = cb.units.filter((x) => x.side === 'pc'), es = cb.units.filter((x) => x.side === 'foe');
  for (const p of pcs) { p.hp = p.maxHp = 9999; p.vision = 30; }
  for (const e of es) { e.vision = 30; e.ap = 6; }
  noteSeenAt(cb);
  return { cb, pcs, es, p: pcs[0], e: es[0] };
}
const act = (cb: Combat, e: Unit) => { cb.turn = cb.order.indexOf(e.id); e.ap = 6; e.bank = 0; };

describe('the data (enemies.json ai)', () => {
  it('is behaviour only: tiers, zone kinds, a tie kind and weights; every tier it names exists', () => {
    const tiers = (ENEMIESJ as any).items.map((t: any) => t.id);
    for (const t of AI.figments_last) expect(tiers).toContain(t);
    expect(AI.figments_last).not.toContain('minion'); expect(AI.figments_last).not.toContain('vermin');
    expect(AI.shelter.sanctuary).toBeGreaterThan(1);
    expect(AI.held_risk).toBeGreaterThan(0); expect(AI.skulk_open).toBeGreaterThan(0);
    expect(AI.healer_tie).toBe('bond'); expect(AI.provisional).toBe(true);
    expect(ENEMY_AI.boss_hidden_rounds).toBe(AI.boss_hidden_rounds);
  });
});

describe('Shadow (shadow-spec 8)', () => {
  // a wall down column 8 from row 4 to the bottom: the open top is in the character's sight, the tiles behind the wall
  // (x 9 and on, rows 4 and down) are not; the enemy sees the character over the top
  const WALL = ['8,4', '8,5', '8,6', '8,7', '8,8', '8,9', '8,10', '8,11'];
  const close = (tags?: string[]) => { const f = fight(['2,5'], [{ at: '14,1', weapon: 'combat_knife', tags }], open(WALL)); act(f.cb, f.e); expect(unitSees(f.cb, f.e, f.p.pos)).toBe(true); enemyTurn(f.cb, rng()); return f; };
  it('a skulker closing in keeps to tiles the other side can\'t see; a plain Soldier walks into the open', () => {
    const plain = close(); expect(unitSees(plain.cb, plain.p, plain.e.pos)).toBe(true);
    const sk = close(['skulk']); expect(sk.e.tags).toContain('skulk'); expect(unitSees(sk.cb, sk.p, sk.e.pos)).toBe(false);
  });
  it('a Boss is never Hidden after its first round: it can\'t hide, and one placed Hidden is revealed as the next round starts', () => {
    const { cb, es } = fight(['2,5'], [{ at: '14,5', tier: 'boss' }]); const b = es[0];
    startHidden(b); expect(b.hidden).toBe(true);
    cb.round = AI.boss_hidden_rounds + 1; emit(cb, 'round_start', { round: cb.round, cb });
    expect(b.hidden).toBe(false);
    expect(hide(cb, b)).toMatch(/can't hide/); expect(b.hidden).toBe(false);
    expect(applyCond(cb, rng(), null, b, 'hidden')).toMatch(/can't hide/);
  });
  it('the spot-back is the enemy\'s at once: a Hidden character spotted by any of its side is a target (ai-perceives.test.ts); a Hidden one is not', () => {
    const { cb, p, e } = fight(['10,5'], [{ at: '14,5' }]); hide(cb, p);
    expect(enemyIntent(cb, e).kind).not.toBe('attack');
  });
});

describe('Bonds (bonds-spec 8)', () => {
  const bonded = (tier: string) => {
    const f = fight(['4,4', '4,6'], [{ at: '12,5', tier }]);
    const [bonder, hurt] = f.pcs; hurt.hp = Math.floor(hurt.maxHp / 10); // the other one is far more hurt
    f.cb.ties = [{ kind: 'bond', from: bonder.id, to: f.e.id }]; act(f.cb, f.e);
    return { ...f, bonder, hurt };
  };
  it('an Elite or a Boss Bonded to a character takes that character for the healer and turns on it first', () => {
    for (const tier of ['elite', 'boss']) {
      const { cb, e, bonder } = bonded(tier);
      expect(healerMark(cb, e)?.id, tier).toBe(bonder.id);
      expect(enemyIntent(cb, e), tier).toMatchObject({ targetId: bonder.id, why: 'healer' });
    }
  });
  it('unbonded, the same Elite goes for the most hurt (the doctrine as before)', () => {
    const { cb, e, hurt } = bonded('elite'); delete cb.ties;
    expect(healerMark(cb, e)).toBeNull(); expect(enemyIntent(cb, e).targetId).toBe(hurt.id);
  });
  it('a Minion (healer_focus 0) does not look', () => {
    const { cb, e } = bonded('minion'); expect(healerMark(cb, e)).toBeNull();
  });
  it('enemies do not Bond or Tend: no tier, caster or companion carries a door of the new systems, and an enemy unit holds no Attuner, Visualizer or Shadow', () => {
    const txt = JSON.stringify({ items: (ENEMIESJ as any).items, casters: (ENEMIESJ as any).casters, soul: (ENEMIESJ as any).soul_casters, comp: (ENEMIESJ as any).companions });
    for (const w of ['attuner', 'visualizer', '"shadow"', 'tend.', 'empathy', 'visualization']) expect(txt.includes(w), w).toBe(false);
    const { cb, e } = fight(['4,5'], [{ at: '12,5', tier: 'elite' }]);
    expect(e.mg?.attuner).toBeFalsy(); expect(e.mg?.visualizer).toBeFalsy(); expect(e.res?.shadow).toBeUndefined();
    act(cb, e); enemyTurn(cb, rng()); expect((cb.ties || []).filter((t) => t.from === e.id)).toHaveLength(0);
  });
});

describe('Figments (figments-spec 2 and 8): the tiers through the AI\'s own choice', () => {
  const SPOT = '3,4';
  const withDouble = (tier: string, at: string) => {
    const f = figFight([{ skills: { visualization: 1 }, weapon: 'service_pistol' }], [{ tier, at, classic: true }]); let u = f.turn(f.pc);
    f.picture(u, 'double', SPOT); u = f.unit(u.id); return { f, u, d: f.figments(u)[0] };
  };
  it('a Minion (no save) is fooled: its attack goes at the Double and finds it out', () => {
    const { f, d } = withDouble('minion', '6,4'); const m = f.foe; m.pos = '5,4';
    expect((ENEMIESJ as any).items.find((t: any) => t.id === 'minion').double_save).toBeNull();
    const it0 = withGame(f.g, () => enemyIntent(f.cb, m)); expect(it0.image).toBeTruthy();
    withGame(f.g, () => { act(f.cb, m); enemyTurn(f.cb, f.g.rng); });
    expect(f.cb.log.some((l: any) => /finds a Double/.test(String(l)))).toBe(true); void d;
  });
  it('a Boss is fooled through one of its turns at most: at its next turn start it sees through', () => {
    const { f, d } = withDouble('boss', '9,4'); const b = f.foe;
    const img = (f.cb.images || []).find((i) => i.body === d.id)!; if (!img.fooled.includes(b.id)) img.fooled.push(b.id);
    withGame(f.g, () => emit(f.cb, 'turn_start', { u: b, cb: f.cb, rng: f.g.rng })); expect(img.fooled).toContain(b.id);
    withGame(f.g, () => emit(f.cb, 'turn_start', { u: b, cb: f.cb, rng: f.g.rng })); expect(img.fooled).not.toContain(b.id);
  });
  for (const tier of AI.figments_last as string[]) it('a ' + tier + ' with a character in reach shoots the character, not the nearer Figment (and previews none)', () => {
    const f = figFight([{ skills: { visualization: 5 }, level: 5, weapon: 'service_pistol' }], [{ tier, at: '9,4', classic: true }]); let u = f.turn(f.pc);
    f.picture(u, 'beast', '7,4'); u = f.unit(u.id); const e = f.foe; e.pos = '9,4'; u.pos = '3,4';
    const it0 = withGame(f.g, () => { act(f.cb, e); return enemyIntent(f.cb, e); });
    expect(it0).toMatchObject({ kind: 'attack', targetId: u.id });
  });
  it('a Soldier with no character in reach shoots the Figment (an Eye spotting for the squad)', () => {
    const f = figFight([{ skills: { visualization: 3 }, level: 3, weapon: 'service_pistol' }], [{ tier: 'soldier', at: '9,4', classic: true }]); let u = f.turn(f.pc);
    f.picture(u, 'eye', '6,4'); u = f.unit(u.id); const eye = f.figments(u)[0], e = f.foe;
    const solid = ['5,0', '5,1', '5,2', '5,3', '5,4', '5,5', '5,6', '5,7', '5,8', '5,9', '5,10', '5,11'].filter((k) => k !== '5,4');
    f.cb.map = { ...f.cb.map, solid: [...f.cb.map.solid, ...solid] }; u.pos = '1,1'; e.pos = '9,4'; // the character behind a wall, out of the Soldier's sight
    const it0 = withGame(f.g, () => { act(f.cb, e); return enemyIntent(f.cb, e); });
    expect(withGame(f.g, () => unitSees(f.cb, e, u.pos))).toBe(false);
    expect(it0).toMatchObject({ kind: 'attack', targetId: eye.id });
  });
  it('a Minion takes the nearest thing, a Figment included', () => {
    const f = figFight([{ skills: { visualization: 5 }, level: 5, weapon: 'service_pistol' }], [{ tier: 'minion', at: '9,4', classic: true }]); let u = f.turn(f.pc);
    f.picture(u, 'beast', '8,4'); u = f.unit(u.id); const b = f.figments(u)[0], e = f.foe; e.pos = '9,4'; u.pos = '3,4';
    expect(withGame(f.g, () => { act(f.cb, e); return enemyIntent(f.cb, e); }).targetId).toBe(b.id);
  });
  it('a Wall plugging the only way: an enemy with nothing else in reach breaks it', () => {
    const f = figFight([{ skills: { visualization: 3 }, level: 3, weapon: 'service_pistol' }], [{ tier: 'soldier', weapon: 'combat_knife', at: '9,4', classic: true }]); let u = f.turn(f.pc);
    const solid = Array.from({ length: f.cb.map.h }, (_, y) => '8,' + y).filter((k) => k !== '8,4');
    f.cb.map = { ...f.cb.map, solid: [...f.cb.map.solid, ...solid] };
    f.picture(u, 'wall', '8,4'); u = f.unit(u.id); const w = f.figments(u)[0], e = f.foe; e.pos = '9,4'; u.pos = '3,4';
    expect(withGame(f.g, () => { act(f.cb, e); return enemyIntent(f.cb, e); })).toMatchObject({ kind: 'attack', targetId: w.id });
  });
  it('a Blade\'s Hold it can see is a risk on a walk that steps into or out of its reach; a Volatile Figment\'s burst on a tile next to it', () => {
    const f = figFight([{ skills: { visualization: 5 }, level: 5, weapon: 'service_pistol' }], [{ tier: 'soldier', at: '12,4', classic: true }]); let u = f.turn(f.pc);
    f.picture(u, 'blade', '6,4'); u = f.unit(u.id); const e = f.foe; e.pos = '9,4';
    const P = withGame(f.g, () => paths(f.cb, e.pos, e.id));
    expect(withGame(f.g, () => aiRouteRisk(f.cb, e, P, '7,4'))).toBe(AI.held_risk); // into its reach
    expect(withGame(f.g, () => aiRouteRisk(f.cb, e, P, '9,8'))).toBe(0); // round it
    expect((FIGJ as any).traits.find((t: any) => t.id === 'volatile').within).toBeGreaterThan(0);
  });
});

describe('the Chaplain (chaplain-spec 8)', () => {
  it('a Warded target is a worse target: its shield counts as HP to the doctrine\'s "most hurt"', () => {
    const { cb, pcs, e } = fight(['4,4', '4,6'], [{ at: '12,5', tier: 'elite' }]);
    for (const p of pcs) p.hp = Math.floor(p.maxHp / 2);
    act(cb, e); const first = enemyIntent(cb, e).targetId!; const warded = pcs.find((p) => p.id === first)!;
    warded.shield = warded.maxHp; // a Ward layer
    expect(enemyIntent(cb, e).targetId).not.toBe(first);
  });
  it('a target inside its side\'s Sanctuary is a worse target (half damage: ai.shelter); walking into it is fine (no tile risk)', () => {
    const { cb, pcs, e } = fight(['4,4', '4,6'], [{ at: '12,5', tier: 'elite' }]);
    for (const p of pcs) p.hp = Math.floor(p.maxHp / 2);
    act(cb, e); const first = enemyIntent(cb, e).targetId!; const inside = pcs.find((p) => p.id === first)!;
    makeZone(cb, inside, { kind: 'sanctuary', tiles: [inside.pos], rounds: 2, pool: 1 });
    expect(enemyIntent(cb, e).targetId).not.toBe(first);
    expect(aiTileRisk(cb, e, inside.pos)).toBe(0);
  });
  it('the healer hunt counts a Ward as tending (a shield given to an ally goes through grantShield)', async () => {
    const { grantShield } = await import('../src/effects/damage');
    const { cb, pcs, e } = fight(['4,4', '4,6'], [{ at: '12,5', tier: 'elite' }]);
    grantShield(cb, pcs[1], pcs[1].maxHp, pcs[0], { layer: 'ward' } as any);
    expect(healerMark(cb, e)?.id).toBe(pcs[0].id);
  });
});

describe('reactions (reactions-spec 8, rules 1.28)', () => {
  it('an Overwatch it can see being held is a risk on a walk into the holder\'s view; held from Hidden, it is unknown', () => {
    const { cb, p, e } = fight(['4,5'], [{ at: '16,5' }]);
    p.overwatch = 'shot';
    expect(aiRouteRisk(cb, e, paths(cb, e.pos, e.id), '12,5')).toBe(AI.held_risk); // the holder sees that walk
    p.overwatch = null; expect(aiRouteRisk(cb, e, paths(cb, e.pos, e.id), '12,5')).toBe(0);
    p.overwatch = 'shot'; p.hidden = true; expect(aiRouteRisk(cb, e, paths(cb, e.pos, e.id), '12,5')).toBe(0);
  });
  it('an enemy never reacts off a reaction, and Suppressed leaves it its protective reactions only', () => {
    const { cb, e } = fight(['4,5'], [{ at: '12,5' }]);
    let inner: boolean | null = null;
    expect(react(cb, cb.units.find((x) => x.side === 'pc')!, { kind: 'attack' }, () => { inner = canReact(cb, e, 'attack') || canReact(cb, e, 'protect'); })).toBe(true);
    expect(inner).toBe(false);
    applyCond(cb, rng(), null, e, 'suppressed', 1, undefined, { skipSave: true } as any);
    expect(canReact(cb, e, 'attack')).toBe(false); expect(canReact(cb, e, 'move')).toBe(false); expect(canReact(cb, e, 'protect')).toBe(true);
  });
});
