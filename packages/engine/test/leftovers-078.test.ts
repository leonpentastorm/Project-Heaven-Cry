// Rules 1.78 (0.32, the leftovers lane): things designed in earlier versions and never built. Each through the reducer
// (a real action), numbers read from the data.
//   item 6601  two Sanctuaries on one tile do not stack (spec item 1908): one side's zones of a kind, the first laid acts
//   item 6602  NULL unmakes a Figment on the tiles it covers (figments-spec rule 12; sigils.json null.dispel)
//   item 6603  the fight joined is an effects event (the alarm's, joined: true) at the first character the foes learn of
//   item 6604  aim marks on a Bonded ally: at the Bonder's turn start, each seen enemy aiming at a Bonded ally is Read
//   item 6605  the Breaker's Into the Wall: a foe it drives into a wall, the edge or a body takes the slam, the body too
//   item 6607  Hallow: a Chaplain's Hymn lays hallowed ground; allies starting a turn on it carry the verse, foes on it -1
//   item 6608  the attack preview lists what rides on a hit (Smite), from the technique run as a hit on a copy
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { CLASS_MOVE_POOL, applyDamage, setDevotionXp, devotionThreshold, zonesAt, type Unit, type Action } from '../src';
import { fightWith, withGame, storyWith, type CharSpec } from './helpers/perkfight';
import { beginTurn, condOn, enemyIntent, previewAttack, CLASS, previewDescriptor } from '../src';
import { figFight } from './helpers/figfight';
import { previewEvoke, apply, reachable, active, type GameState } from '../src';
import { survivalRoom, startRun, ownerOf } from './helpers/survival';

const CHAP: CharSpec = { name: 'Chaplain', skills: { faith: 6 }, attrs: { virtue: 8 }, level: 12, classId: 'guardian' };
/** Two Chaplains (Faithful, Old Overcast) and a gunner against two soldiers. */
function twoChaplains() {
  const f = fightWith([CHAP, { ...CHAP, name: 'Second' }, { name: 'Gunner' }], [{ at: 'F6' }, { at: 'G6' }], { level: 12 });
  for (const u of f.pcs) { const c = f.g.characters[u.charId!]; c.belief = { kind: 'faithful', patron: 'old_overcast' }; c.patron = 'old_overcast'; setDevotionXp(c, devotionThreshold(6)); c.devotion = 6; }
  const [me, two, gun] = f.pcs, [f0, f1] = f.foes;
  me.pos = '2,5'; two.pos = '4,5'; gun.pos = '3,5'; f0.pos = '8,5'; f1.pos = '9,5';
  for (const u of f.cb.units) { u.hp = u.maxHp; u.conds = {}; u.shield = 0; delete u.shields; }
  for (const u of f.foes) { u.hp = u.maxHp = 2000; }
  return { f, me: me.id, two: two.id, gun: gun.id, foe: f0.id };
}
const perkAs = (f: ReturnType<typeof fightWith>, id: string, item: string, a: any) => f.act({ type: 'combat/perk', unitId: id, id: item, ...a } as Action, 'host');

describe('item 6601: two Sanctuaries on one tile do not stack (spec item 1908)', () => {
  it('a gunner standing in two Chaplains\' Sanctuaries takes half, not a quarter; the first laid acts', () => {
    const h = twoChaplains();
    h.f.turn(h.me); perkAs(h.f, h.me, 'class:guardian.sanctuary', { actionId: 'sanctuary', tile: '2,5' });
    h.f.turn(h.two); perkAs(h.f, h.two, 'class:guardian.sanctuary', { actionId: 'sanctuary', tile: '4,5' });
    expect(zonesAt(h.f.cb, '3,5', 'sanctuary', 'any').length).toBe(2); // both lie on the gunner's tile
    const gun = h.f.unit(h.gun), hp = gun.hp, foe = h.f.unit(h.foe);
    withGame(h.f.g, () => applyDamage(h.f.cb, gun, 9, { by: foe, type: 'weapon', shield: true, credit: 'hp' } as any));
    expect(hp - h.f.unit(h.gun).hp).toBe(Math.ceil(9 * 0.5)); // once halved (the data's 0.5), not twice
    const first = zonesAt(h.f.cb, '3,5', 'sanctuary', 'any').find((z) => z.by === h.me)!, second = zonesAt(h.f.cb, '3,5', 'sanctuary', 'any').find((z) => z.by === h.two)!;
    expect(first.pool).toBeLessThan(second.pool!); // the first laid gave what was prevented; the second gave nothing
    void CLASS_MOVE_POOL; void (null as unknown as Unit);
  });
});

describe('item 6602: NULL unmakes a Figment (figments-spec rule 12)', () => {
  function setup() {
    const f = figFight([{ skills: { visualization: 1 }, weapon: 'service_pistol', forms: [], level: 5 }, { name: 'Ilse', archetype: 'sigilist', kit: 'sigil', visualizer: null, level: 5 }], [{ at: '14,14' }]);
    const [owner, sig] = f.pcs; owner.pos = '3,4'; sig.pos = '2,8';
    let o = f.turn(owner); o.ap = 9; f.picture(o, 'double', '6,8');
    const fig = f.figments(f.unit(owner.id))[0]; expect(fig).toBeTruthy();
    const u = f.turn(sig); u.ap = 9; const m = u.mg!; m.evoker = true; m.words = ['null', 'seek']; m.charge = 30; m.glyphAp = 1; m.maxWords = 4; m.flux = 0; m.rangeBonus = 0;
    f.unit(sig.id).pos = '3,8'; f.act({ type: 'combat/draw', unitId: sig.id, word: 'null', tile: '3,8' } as any);
    f.unit(sig.id).pos = '2,8'; f.act({ type: 'combat/draw', unitId: sig.id, word: 'seek', tile: '2,8' } as any);
    return { f, sig: sig.id, fig: fig.id };
  }
  it("the preview names the Figment among what NULL unmakes; the Evoke takes it out of the fight (anyone's, the caster's own side too)", () => {
    const h = setup();
    const pv = withGame(h.f.g, () => previewEvoke(h.f.cb, h.f.unit(h.sig), '2,8', '6,8'));
    expect(pv.missiles[0].nullHits.map((x: any) => [x.kind, x.id])).toContainEqual(['figment', h.fig]);
    expect(pv.fizzle).toBe(false);
    h.f.act({ type: 'combat/evoke', unitId: h.sig, tile: '2,8', aim: '6,8' } as any);
    expect(h.f.cb.units.some((v) => v.id === h.fig)).toBe(false);
    expect(h.f.cb.log.some((l) => /NULL unmakes .*Double/i.test(l))).toBe(true);
  });
});

describe('item 6603: the fight joined is an effects event (spec item 5010 c)', () => {
  it("a Survival fight opened unseen: no alarm event before contact; at contact one, joined, on a character's tile", () => {
    let g: GameState | null = null;
    for (let s = 1; s <= 40 && !g; s++) {
      const seed = 'PHC-' + String(s).padStart(4, '0');
      let x = startRun(survivalRoom(seed, [{ build: 'plain_gun', level: 1 }] as any, { test: true }), seed);
      const n = reachable(x.run!).find((y) => y.kind === 'fight'); if (!n) continue;
      x = apply(x, { type: 'run/move', node: n.id } as any, ownerOf(0));
      if (x.combat?.approach) g = x;
    }
    expect(g).toBeTruthy();
    const alarms = (x: GameState) => (x.combat!.fx || []).filter((e: any) => e.k === 'alarm');
    expect(alarms(g!).length).toBe(0);
    for (let k = 0; k < 8 && g!.combat!.approach; k++) g = apply(g!, { type: 'combat/end-turn', unitId: active(g!.combat!)!.id } as any, ownerOf(0));
    expect(g!.combat!.approach).toBeUndefined();
    const a = alarms(g!); expect(a.length).toBe(1); expect(a[0].joined).toBe(true);
    if (a[0].at) expect(g!.combat!.units.some((u) => u.side === 'pc' && u.pos === a[0].at)).toBe(true);
  });
});

describe('item 6604: who aims at a Bonded ally is read (bonds-spec section 2 rule 8)', () => {
  function rig() {
    const s: any = storyWith([{ name: 'Medic', level: 5, skills: { empathy: 5 }, attrs: { insight: 5 }, weapon: 'service_pistol' }, { name: 'Gun', level: 5 }, { name: 'Far', level: 5 }]);
    s.g.characters[s.chars[0].id].offHand = { id: 'attuner' };
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight', combat: { name: 'Aim', map: 'yard16', difficulty: 'standard', level: 5,
      enemies: [{ name: 'Soldier 1', tier: 'soldier', weapon: 'service_pistol', at: '', no_surrender: true, level: 5 }, { name: 'Soldier 2', tier: 'soldier', weapon: 'service_pistol', at: '', no_surrender: true, level: 5 }] } } });
    const cb = () => s.g.combat, U = (n: string) => cb().units.find((u: any) => u.name === n);
    U('Medic').pos = '2,6'; U('Gun').pos = '3,9'; U('Far').pos = '13,2'; U('Soldier 1').pos = '4,9'; U('Soldier 2').pos = '13,3';
    const turn = (n: string) => { const c = cb(); c.turn = c.order.indexOf(U(n).id); delete c.window; withGame(s.g, () => beginTurn(c, s.g.rng)); };
    turn('Medic'); U('Medic').ap = 9;
    s.act({ type: 'combat/perk', unitId: U('Medic').id, id: 'verb:tend.bond', targetId: U('Gun').id });
    return { s, cb, U, turn };
  }
  it("at the Medic's next turn start the enemy aiming at the Bonded ally is Read (its intent shown to the squad); the one aiming at an unbonded ally is not", () => {
    const h = rig(); h.turn('Medic');
    const gun = h.U('Gun').id, foes = h.cb().units.filter((u: any) => u.side === 'foe');
    const aims = foes.map((u: any) => withGame(h.s.g, () => enemyIntent(h.cb(), u)).targetId === gun);
    expect(aims.some(Boolean)).toBe(true); // the yard puts someone on the Bonded ally
    foes.forEach((u: any, i: number) => { expect(condOn(u, 'read'), u.name).toBe(aims[i]); if (aims[i]) expect(u.readIntent?.targetId).toBe(gun); });
  });
});

describe('item 6605: Into the Wall (momentum-2.0 item 15, P13)', () => {
  function shoveRig(cls: string | null, behind: 'edge' | 'body' | 'none') {
    const f = fightWith([{ name: 'Breaker', level: 5, ...(cls ? { classId: cls } : {}) }], [{ at: 'F6' }, { at: 'G6' }], { level: 5 });
    const me = f.pc, [a, b] = f.foes;
    if (behind === 'edge') { me.pos = '1,5'; a.pos = '0,5'; b.pos = '9,9'; }
    else if (behind === 'body') { me.pos = '4,5'; a.pos = '5,5'; b.pos = '6,5'; }
    else { me.pos = '4,5'; a.pos = '5,5'; b.pos = '9,9'; }
    for (const u of f.foes) { u.hp = u.maxHp = 500; u.armour = 0; u.strength = -30; u.athleticsPts = 0; u.conds = {}; }
    const u = f.turn(me); u.ap = 6; u.strength = 30;
    const hp = () => f.foes.map((x) => f.unit(x.id).hp);
    const was = hp(); f.act({ type: 'combat/shove', unitId: me.id, targetId: a.id } as Action, 'host');
    const now = hp(); return { f, lost: was.map((h, i) => h - now[i]), a: a.id };
  }
  it("a Breaker shoving a foe against the map's edge: the foe takes the slam (and lands Prone, as any blocked Shove)", () => {
    const r = shoveRig('fighter', 'edge'); expect(r.lost[0]).toBeGreaterThan(0); expect(r.lost[1]).toBe(0);
    expect(r.f.cb.log.some((l) => /Into the Wall/.test(l))).toBe(true);
  });
  it('into another foe: both take the same slam', () => {
    const r = shoveRig('fighter', 'body'); expect(r.lost[0]).toBeGreaterThan(0); expect(r.lost[1]).toBe(r.lost[0]);
  });
  it('a push with room behind it, and anyone not a Breaker, deal no slam', () => {
    expect(shoveRig('fighter', 'none').lost).toEqual([0, 0]);
    expect(shoveRig(null, 'body').lost).toEqual([0, 0]);
  });
});

describe('item 6607: Hallow (prayer-2.0 item 16)', () => {
  const HALLOW: any = (CLASS.guardian as any).gain.find((m: any) => m.id === 'hallow');
  function rig() {
    const h = twoChaplains(); const f = h.f;
    f.turn(h.me); f.unit(h.me).ap = 6;
    f.act({ type: 'combat/perk', unitId: h.me, id: 'class:guardian.hallow', actionId: 'hallow', tile: '3,5' } as Action, 'host');
    return h;
  }
  it('a Hymn: its AP, the Hymn wait starts; the ground is a zone of the data kind hallowed, the tile and every tile within its reach', () => {
    const h = rig();
    expect(h.f.unit(h.me).ap).toBe(6 - HALLOW.effects[0].ap);
    expect(() => h.f.act({ type: 'faith/pray', unitId: h.me, kind: 'hymn', id: 'thunderclap' } as any, 'host')).toThrow(/wait/);
    const z = zonesAt(h.f.cb, '3,5', 'hallowed', 'any'); expect(z.length).toBe(1);
    expect(z[0].tiles.length).toBe((2 * HALLOW.effects[0].effects[0].within + 1) ** 2); expect(z[0].left).toBe(HALLOW.effects[0].effects[0].rounds);
  });
  it('an ally starting a turn on it carries the patron verse; one off it does not', () => {
    const h = rig();
    h.f.turn(h.gun); expect(condOn(h.f.unit(h.gun), 'canticle_old_overcast')).toBe(true);
    h.f.unit(h.two).pos = '12,12'; h.f.turn(h.two); expect(condOn(h.f.unit(h.two), 'canticle_old_overcast')).toBe(false);
  });
  it('an enemy standing on it is at the row value to hit; off it, not', () => {
    const h = rig(); const foe = h.f.unit(h.foe), gun = h.f.unit(h.gun);
    const term = () => withGame(h.f.g, () => previewAttack(h.f.cb, h.f.unit(h.foe), gun, 'shot', { free: true })).terms.filter((t: any) => /Hallow/.test(t.label)).map((t: any) => t.v);
    expect(term()).toEqual([]);
    foe.pos = '4,4'; expect(term()).toEqual([HALLOW.effects[1].value]);
  });
});

describe('item 6608: riders on the attack card', () => {
  const note = (g: any, u: string, foe: string) => (previewDescriptor(g, u, 'tq:main:shot', { targetId: foe }, 'host')?.lines || []).filter((l: any) => l.k === 'note').map((l: any) => l.text);
  it("a Chaplain's Shot names Smite and Judged; once Smite is spent this turn only Judged; for a gunner nothing rides", () => {
    const h = twoChaplains(); h.f.turn(h.me); h.f.unit(h.me).ap = 9;
    expect(note(h.f.g, h.me, h.foe)).toContain('On a hit: Smite, Judged');
    expect(h.f.cb.riders).toBeUndefined(); // the live fight is never written
    h.f.unit(h.foe).def = -40; h.f.act({ type: 'combat/attack', unitId: h.me, targetId: h.foe, mode: 'shot' } as Action, 'host');
    expect(h.f.cb.log.some((l) => /\(Smite\)/.test(l))).toBe(true);
    expect(note(h.f.g, h.me, h.foe)).toContain('On a hit: Judged'); // once a turn: Smite's blow is spent, its Judged still rides
    h.f.turn(h.gun); expect(note(h.f.g, h.gun, h.foe).some((t: string) => /On a hit/.test(t))).toBe(false);
  });
});
