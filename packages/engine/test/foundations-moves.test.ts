// Forced movement (combat.ts displace / swapUnits, engine foundations 1, F2): one function, one rule
// (data/rules.json forced_movement; spec: "Forced movement"). The table of every mover against every case is
// test/golden/moves.json; these are the rule's own sentences.
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { displace, swapUnits, forcedRule, setOverwatch, makeObject, RULES, type Unit } from '../src';
import { onHook, onStat } from '../src/effects/hooks';
import { fightWith, withGame } from './helpers/perkfight';

// stand-ins for an item on the two doors (test only): the knockback immunity (a stat) and the 'forced_move' hook
const DOOR: { immune?: string; cancel?: string; double?: string; seen: any[]; after: any[] } = { seen: [], after: [] };
onStat('immune:knockback', (x: any) => (DOOR.immune && x.u?.id === DOOR.immune ? 1 : 0));
onHook('forced_move', (ctx: any) => { DOOR.seen.push({ how: ctx.how, kind: ctx.kind, tiles: ctx.tiles }); if (DOOR.cancel === ctx.u?.id) ctx.cancel = true; if (DOOR.double === ctx.u?.id) ctx.tiles *= 2; });
onHook('displaced', (ctx: any) => { DOOR.after.push({ how: ctx.how, from: ctx.from, to: ctx.to, stoppedBy: typeof ctx.stoppedBy === 'object' && ctx.stoppedBy ? 'unit' : ctx.stoppedBy }); });
const clear = () => { delete DOOR.immune; delete DOOR.cancel; delete DOOR.double; DOOR.seen = []; DOOR.after = []; };

/** A squad of two and two foes on bare ground: the mover on 5,5, the target on 6,5. */
function field() {
  const f = fightWith([{}, { weapon: 'hellraiser_service_rifle' }], [{ tier: 'soldier', classic: true }, { tier: 'soldier', classic: true }]);
  const cb = f.cb; cb.objects = []; cb.map = { ...cb.map, solid: [], cover: [], full: [], difficult: [] } as any; cb.zones = []; cb.hazards = [];
  const [a, w] = f.pcs, [t, o] = f.foes; a.pos = '5,5'; t.pos = '6,5'; w.pos = '1,9'; o.pos = '14,9';
  for (const u of cb.units) { u.hp = u.maxHp; u.braced = false; }
  clear();
  const go = (to: any, opts: any = {}, who: Unit = t) => withGame(f.g, () => displace(cb, f.g.rng, who, to, { by: a, how: 'push', source: 'test', ...opts }));
  return { f, cb, a, w, t, o, go };
}
const PUSH2 = { away: '5,5', tiles: 2 };

describe('displace: the one forced move', () => {
  it('the table is data: every kind enters tiles "each" (a push, a pull) or "landing" (a throw, a teleport, a swap), and nobody reacts', () => {
    const d: any = (RULES as any).forced_movement;
    for (const how of ['push', 'pull', 'throw', 'teleport', 'swap'] as const) { expect(forcedRule(how)).toMatchObject(d[how]); expect(forcedRule(how).reactions).toBe(false); expect(forcedRule(how).immunity).toBe(true); }
    expect(forcedRule('push').tiles).toBe('each'); expect(forcedRule('pull').tiles).toBe('each'); expect(forcedRule('throw').tiles).toBe('landing'); expect(forcedRule('teleport').tiles).toBe('landing'); expect(forcedRule('swap').tiles).toBe('landing');
  });
  it('a push slides tile by tile, ends Braced, fires forced_move once (an item may change the distance) and displaced after, and draws one shove with its path', () => {
    const x = field(); x.t.braced = true;
    const r = x.go(PUSH2);
    expect(r).toMatchObject({ moved: 2, from: '6,5', to: '8,5', path: ['7,5', '8,5'], stoppedBy: null }); expect(x.t.pos).toBe('8,5'); expect(x.t.braced).toBe(false);
    expect(DOOR.seen).toEqual([{ how: 'test', kind: 'push', tiles: 2 }]); expect(DOOR.after).toEqual([{ how: 'test', from: '6,5', to: '8,5', stoppedBy: null }]);
    expect((x.cb.fx || []).filter((e: any) => e.k === 'shove').pop()).toMatchObject({ unit: x.a.id, target: x.t.id, from: '6,5', to: '8,5', ok: true, path: ['6,5', '7,5', '8,5'] });
    const y = field(); DOOR.double = y.t.id; expect(y.go({ away: '5,5', tiles: 1 }).moved).toBe(2);
    const z = field(); expect(z.go({ toward: '6,1', tiles: 2 }, { how: 'pull' }).to).toBe('6,3'); // a pull goes toward a tile
    const q = field(); expect(q.go({ toward: '5,5', tiles: 3 }, { how: 'pull' })).toMatchObject({ moved: 0, blockedAt: '5,5' }); // and stops next to whoever stands there
  });
  it('what stops it: Nailed, the knockback immunity and the hook, each for every kind of move; a move the unit chose itself is not stopped', () => {
    for (const how of ['push', 'pull', 'throw', 'teleport'] as const) {
      const to = how === 'push' ? PUSH2 : how === 'pull' ? { toward: '9,5', tiles: 2 } : { tile: '9,7' };
      let x = field(); x.t.nailed = { by: x.a.id, id: 'n', ap: 2 } as any; expect(x.go(to, { how }), how + ' nailed').toMatchObject({ moved: 0, stoppedBy: 'nailed' }); expect(x.t.pos).toBe('6,5');
      x = field(); DOOR.immune = x.t.id; expect(x.go(to, { how }), how + ' immune').toMatchObject({ moved: 0, stoppedBy: 'immune' });
      x = field(); DOOR.cancel = x.t.id; expect(x.go(to, { how }), how + ' hook').toMatchObject({ moved: 0, stoppedBy: 'held' });
      x = field(); x.t.nailed = { by: x.a.id, id: 'n', ap: 2 } as any; DOOR.immune = x.t.id; DOOR.cancel = x.t.id;
      expect(x.go(to, { how, willing: true }).moved, how + ' willing').toBeGreaterThan(0); expect(DOOR.seen).toEqual([]); // not forced: the hook is not even asked
    }
    clear();
  });
  it('where it can land: the walking rule. A wall, an object, a body and the edge stop it and are named; a broken crate does not', () => {
    let x = field(); x.cb.objects = [makeObject('c', 'barrel', '8,5')]; expect(x.go(PUSH2)).toMatchObject({ moved: 1, to: '7,5', stoppedBy: 'object', blockedAt: '8,5' });
    x = field(); x.o.pos = '7,5'; const r = x.go(PUSH2); expect(r.moved).toBe(0); expect(r.stoppedBy).toBe(x.o); expect(r.blockedAt).toBe('7,5');
    x = field(); x.a.pos = '14,5'; x.t.pos = '15,5'; expect(x.go({ away: '14,5', tiles: 1 })).toMatchObject({ moved: 0, stoppedBy: 'edge' });
    x = field(); x.cb.objects = [{ ...makeObject('c', 'crate', '7,5'), hp: 0 }]; expect(x.go(PUSH2).to).toBe('8,5');
    x = field(); x.cb.objects = [makeObject('c', 'crate', '9,7')]; expect(x.go({ tile: '9,7' }, { how: 'throw' })).toMatchObject({ moved: 0, stoppedBy: 'object', blockedAt: '9,7' });
  });
  it('what the tiles do: a trap, a field and a hazard act on every tile of a push (a trap ends it there) and on the landing tile of a throw', () => {
    let x = field(); x.cb.objects = [makeObject('tr', 'trap', '7,5')]; let hp = x.t.hp;
    let r = x.go(PUSH2); expect(r).toMatchObject({ moved: 1, to: '7,5', stoppedBy: 'trap' }); expect(x.t.hp).toBeLessThan(hp); expect(r.text).toMatch(/lands on a trap/); expect(x.cb.objects).toEqual([]);
    expect((x.cb.fx || []).filter((e: any) => e.k === 'shove').pop()).toMatchObject({ to: '7,5' }); // the shove drawn is the one that happened
    x = field(); x.cb.hazards = [{ id: 'hz', kind: 'fire', severity: 'light', zone: 'z', tiles: ['7,5'], approaches: [] } as any]; hp = x.t.hp;
    r = x.go(PUSH2); expect(r.to).toBe('8,5'); expect(x.t.hp).toBeLessThan(hp); // pushed THROUGH the fire: it burns and goes on
    x = field(); x.cb.hazards = [{ id: 'hz', kind: 'fire', severity: 'light', zone: 'z', tiles: ['7,5'], approaches: [] } as any]; hp = x.t.hp;
    r = x.go({ tile: '8,5' }, { how: 'throw' }); expect(r.to).toBe('8,5'); expect(x.t.hp).toBe(hp); // thrown OVER it: only the landing tile acts
    x = field(); x.cb.hazards = [{ id: 'hz', kind: 'fire', severity: 'light', zone: 'z', tiles: ['8,5'], approaches: [] } as any]; hp = x.t.hp;
    x.go({ tile: '8,5' }, { how: 'throw' }); expect(x.t.hp).toBeLessThan(hp);
    x = field(); x.cb.zones = [{ id: 'zf', kind: 'field', tiles: ['7,5'], words: ['fire', 'stay'], by: x.a.id, side: 'pc', left: 3, mult: 0.5, first: 1, who: 'A', hit: {}, ever: {}, element: 'fire', str: 0 } as any]; hp = x.t.hp;
    x.go(PUSH2); expect(x.t.hp).toBeLessThan(hp);
  });
  it('who reacts: nobody. A held Overwatch does not fire at a unit that is pushed past it', () => {
    const x = field(); x.w.pos = '7,8'; x.w.ap = 9; expect(withGame(x.f.g, () => setOverwatch(x.cb, x.w, 'shot'))).toBeNull();
    const ammo = x.w.ammo, hp = x.t.hp; x.go(PUSH2);
    expect(x.t.pos).toBe('8,5'); expect(x.w.overwatch).toBeTruthy(); expect(x.w.ammo).toBe(ammo); expect(x.t.hp).toBe(hp);
  });
  it('the reactions flag is read: turned on for a kind (data/rules.json), a held Overwatch answers the pushed unit as it answers a walk', () => {
    const rule = forcedRule('push'); rule.reactions = true;
    try {
      const x = field(); x.w.pos = '7,8'; x.w.ap = 9; x.w.attack = 60; expect(withGame(x.f.g, () => setOverwatch(x.cb, x.w, 'shot'))).toBeNull();
      const ammo = x.w.ammo; x.go(PUSH2);
      expect(x.w.ammo).toBeLessThan(ammo); expect(x.w.overwatch).toBeFalsy();
    } finally { rule.reactions = false; }
  });
  it('a preview changes nothing and fires nothing', () => {
    const x = field(); x.cb.objects = [makeObject('tr', 'trap', '7,5')]; const fx0 = (x.cb.fx || []).length, hp = x.t.hp;
    expect(x.go(PUSH2, { preview: true })).toMatchObject({ moved: 2, to: '8,5' });
    expect(x.t.pos).toBe('6,5'); expect(x.t.hp).toBe(hp); expect((x.cb.fx || []).length).toBe(fx0); expect(DOOR.seen).toEqual([]); expect(x.cb.objects).toHaveLength(1);
    x.t.nailed = { by: x.a.id, id: 'n', ap: 2 } as any; expect(x.go(PUSH2, { preview: true })).toMatchObject({ moved: 0, stoppedBy: 'nailed' });
  });
});

describe('swapUnits: two units trade tiles', () => {
  it('the unwilling one can refuse (Nailed, immunity, the hook) and then nobody moves; the willing one cannot', () => {
    let x = field(); x.t.braced = true;
    let r = withGame(x.f.g, () => swapUnits(x.cb, x.f.g.rng, x.a, x.t, { by: x.a, source: 'test', willing: [x.a] }));
    expect(r.ok).toBe(true); expect(x.a.pos).toBe('6,5'); expect(x.t.pos).toBe('5,5'); expect(x.t.braced).toBe(false); expect(DOOR.seen).toEqual([{ how: 'test', kind: 'swap', tiles: 1 }]);
    x = field(); x.t.nailed = { by: x.a.id, id: 'n', ap: 2 } as any;
    r = withGame(x.f.g, () => swapUnits(x.cb, x.f.g.rng, x.a, x.t, { by: x.a, source: 'test', willing: [x.a] }));
    expect(r).toMatchObject({ ok: false, stoppedBy: 'nailed' }); expect(r.who).toBe(x.t); expect(x.a.pos).toBe('5,5'); expect(x.t.pos).toBe('6,5');
    x = field(); DOOR.immune = x.a.id; // the caster's own immunity does not stop the swap it chose
    expect(withGame(x.f.g, () => swapUnits(x.cb, x.f.g.rng, x.a, x.t, { by: x.a, source: 'test', willing: [x.a] })).ok).toBe(true);
    clear();
  });
  it('each lands on the other\'s tile and the tile acts on it', () => {
    const x = field(); x.cb.objects = [makeObject('tr', 'trap', '5,5')]; (x.cb.objects[0] as any).side = 'pc'; // the squad's own rigged tile
    const hp = x.t.hp; let drawn = 0;
    const r = withGame(x.f.g, () => swapUnits(x.cb, x.f.g.rng, x.a, x.t, { by: x.a, source: 'test', willing: [x.a], drawn: () => { drawn++; expect(x.t.pos).toBe('5,5'); expect(x.t.hp).toBe(hp); } }));
    expect(r.ok).toBe(true); expect(drawn).toBe(1); expect(x.t.hp).toBeLessThan(hp); expect(r.text).toMatch(/lands on a trap/);
  });
});
