// Spotlight cut-ins (docs/design/cutin-spec.md, decision 110): the engine's `spotlight` presentation event. Every test
// goes through apply() (the path a player's click takes), except the direct calls that check the trigger API itself.
import { describe, expect, it } from 'vitest';
import { apply, d20, spotlight, SPOTLIGHT_FX, type Combat, type GameState } from '../src';
import { fightWith, storyWith, withGame } from './helpers/perkfight';

function rngFor(...ns: number[]): number { for (let s = 1; s < 5_000_000; s++) { const r = { state: s }; if (ns.every((n) => d20(r) === n)) return s; } throw new Error('no seed'); }
const spots = (list: any[] | undefined) => (list || []).filter((e) => e.k === SPOTLIGHT_FX);
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

/** A story check at this TN for the first character, rolled with a natural `die` and accepted (or rerolled). */
function checkWith(tn: number, die: number, o: { song?: boolean } = {}) {
  const s = storyWith([{ name: 'Mallow' }, { name: 'Ana' }]);
  const c = s.chars[0];
  if (o.song) s.g.characters[c.id].identity = { song: 'https://youtu.be/aaaaaaaaaaa', songTitle: 'Mine', songArtist: 'Me' } as any;
  s.act({ type: 'narrator/turn', turn: { narration: 'A locked door.', checks: [{ charId: c.id, skills: ['composure'], tn, stakes: 'Hold steady.' }] } } as any);
  const ck = s.g.checks.find((k) => !k.done)!;
  s.g.rng = { state: rngFor(die) };
  s.act({ type: 'check/roll', checkId: ck.id });
  expect(s.g.checks.find((k) => k.id === ck.id)!.roll!.die).toBe(die);
  s.act({ type: 'check/accept', checkId: ck.id });
  return { s, c };
}

describe('spotlight: a critical success on a Hard or Heroic check', () => {
  it('a Heroic natural 20 puts a crit spotlight on the story stream', () => {
    const { s, c } = checkWith(20, 20);
    const [e] = spots((s.g.story as any).fx);
    expect(e).toMatchObject({ k: 'spotlight', kind: 'crit', char: c.id, tn: 20, skill: 'composure', reason: 'a critical success on a Heroic check', scene: 'scene' + s.g.story.scene.n, song: false });
    expect(e.from).toBeUndefined(); // no slow-mo out of a fight
  });
  it('a Hard natural 20 too, and the song flag says whether the song started', () => {
    const { s } = checkWith(16, 20, { song: true });
    expect(spots((s.g.story as any).fx)[0]).toMatchObject({ kind: 'crit', tn: 16, song: true });
  });
  it('a Standard natural 20, or a Heroic 19, is no spotlight', () => {
    expect(spots((checkWith(12, 20).s.g.story as any).fx)).toHaveLength(0);
    expect(spots((checkWith(20, 19).s.g.story as any).fx)).toHaveLength(0);
  });
});

/** A fight: the first PC next to a boss (or a minion) at 1 HP, on its turn; shoots until the target is down. */
function takedown(tier: 'boss' | 'elite' | 'minion', o: { song?: boolean } = {}) {
  const f = fightWith([{ name: 'Mallow' }, { name: 'Ana' }], [{ tier, at: 'C5', name: tier === 'minion' ? 'Grunt' : 'Warden' }, { tier: 'soldier', at: 'L9' }]);
  if (o.song) f.g.characters[f.pc.charId!].identity = { song: 'https://youtu.be/aaaaaaaaaaa', songTitle: 'Mine', songArtist: 'Me' } as any;
  const me = f.turn(f.pc);
  const t = f.foe; t.hp = 1; t.armour = 0; t.conds = {};
  for (let s = 1; s < 400; s++) {
    const g = clone(f.g); g.rng = { state: s };
    const g2 = apply(g, { type: 'combat/attack', unitId: me.id, targetId: t.id, mode: 'shot' } as any, 'host');
    if (g2.combat!.units.find((u) => u.id === t.id)!.dead) return { g: g2, before: f.g, me, t };
  }
  throw new Error('no hit');
}

describe('spotlight: in a fight', () => {
  it('taking down a boss: a takedown spotlight whose from is the first event of the shot', () => {
    const { g, before, me, t } = takedown('boss');
    const cb = g.combat as Combat, [e] = spots(cb.fx);
    expect(e).toMatchObject({ kind: 'takedown', char: me.charId, unit: me.id, target: t.id, reason: 'took down Warden', scene: 'fight' + g.music!.fight });
    const first = (before.combat!.fxSeq || 0) + 1;
    expect(e.from).toBe(first);
    const shot = cb.fx!.find((x) => x.k === 'shot' && x.unit === me.id)!;
    expect(e.from).toBeLessThanOrEqual(shot.n); expect(e.n).toBeGreaterThan(shot.n);
    expect(e.targetName === 'Warden' || e.targetName === 'an unseen hostile').toBe(true);
    expect(cb.actFrom).toBeUndefined(); // the reducer clears its mark
  });
  it('the event comes whether or not the song starts (no song on the sheet; the second in a fight)', () => {
    const a = takedown('boss'); expect(spots(a.g.combat!.fx)[0].song).toBe(false);
    const b = takedown('boss', { song: true }); expect(spots(b.g.combat!.fx)[0].song).toBe(true);
    // The song is once per fight; the spotlight event isn't (the player's setting decides how often it shows).
    const g = clone(b.g); const cb = g.combat!;
    const e2 = withGame(g, () => spotlight(g, { kind: 'takedown', char: b.me.charId!, reason: 'took down another' }));
    expect(e2).toMatchObject({ kind: 'takedown', song: false }); expect(spots(cb.fx)).toHaveLength(2);
  });
  it('an elite counts; a minion kill is no spotlight', () => {
    expect(spots(takedown('elite').g.combat!.fx)).toHaveLength(1);
    expect(spots(takedown('minion').g.combat!.fx)).toHaveLength(0);
  });
  it('bringing a Downed ally back: a revive spotlight naming the ally, with their character for the second strip', () => {
    const f = fightWith([{ name: 'Mallow' }, { name: 'Ana' }], [{ at: 'L9' }]);
    const [me, ally] = f.pcs;
    ally.pos = me.pos.split(',').map(Number).map((v, i) => (i === 0 ? v + 1 : v)).join(',');
    Object.assign(ally, { hp: 0, downed: true, saves: { ok: 0, fail: 0 } });
    f.g.characters[me.charId!].stims = 2;
    f.turn(me);
    f.act({ type: 'combat/stim', unitId: me.id, targetId: ally.id } as any);
    const e = spots(f.cb.fx).find((x) => x.kind === 'revive');
    expect(e).toMatchObject({ kind: 'revive', char: me.charId, target: ally.id, targetName: 'Ana', targetChar: ally.charId, reason: 'brought Ana back' });
    expect(e.from).toBeLessThan(e.n);
  });
  it('enemy turns carry their own from', () => {
    const f = fightWith([{ name: 'Mallow' }], [{ at: 'F6' }]);
    const me = f.turn(f.pc);
    const was = f.cb.fxSeq || 0;
    f.act({ type: 'combat/end-turn', unitId: me.id } as any);
    // A spotlight raised in the enemies' turn would carry a mark after the player's own action.
    const g = clone(f.g); const cb = g.combat!; cb.actFrom = (cb.fxSeq || 0) + 1;
    const e = withGame(g, () => spotlight(g, { kind: 'god', patron: 'nerukhan', char: me.charId!, reason: 'x' }))!;
    expect(e.from).toBeGreaterThan(was);
  });
});

describe('spotlight: the trigger API (the god interjection system calls it)', () => {
  it('fills from and scene itself, never touches the dice, never fails on odd input', () => {
    const f = fightWith([{ name: 'Mallow' }], [{ at: 'F6' }]);
    const g = clone(f.g), cb = g.combat!; cb.actFrom = 7;
    const rng = { ...g.rng };
    const e = withGame(g, () => spotlight(g, { kind: 'god', patron: 'toll_keeper', char: f.pc.charId!, reason: 'interjects', line: 'Not yet. You haven\'t paid.', group: [f.pc.charId!] }))!;
    expect(e).toMatchObject({ k: 'spotlight', kind: 'god', patron: 'toll_keeper', from: 7, line: 'Not yet. You haven\'t paid.', scene: 'fight' + g.music!.fight });
    expect(g.rng).toEqual(rng);
    expect(spotlight(g, { kind: 'god', char: 'x', reason: 'no patron' } as any)).toBeNull();
    expect(spotlight(g, { kind: 'nope', char: 'x', reason: '' } as any)).toBeNull();
    expect(spotlight(g, { kind: 'crit', char: null, reason: 'nobody' })).toBeNull();
    // A patron alone is one strip.
    expect(spotlight(g, { kind: 'god', patron: 'nerukhan', char: null, reason: 'speaks' })).toMatchObject({ char: null, patron: 'nerukhan' });
  });
  it('out of a fight it goes on the story stream (capped like every fx list)', () => {
    const s = storyWith([{}]);
    for (let i = 0; i < 45; i++) spotlight(s.g, { kind: 'god', patron: 'nerukhan', char: s.chars[0].id, reason: 'speaks ' + i });
    const list = spots((s.g.story as any).fx);
    expect(list.length).toBeLessThanOrEqual(40); expect(list[list.length - 1].reason).toBe('speaks 44');
  });
  it('a patron intervention is a god spotlight with the patron, the fighter and the patron\'s line', () => {
    const f = fightWith([{ name: 'Priest', skills: { faith: 7 } }, { name: 'Ally' }], [{ at: 'F6' }, { at: 'G6' }]);
    const c = f.g.characters[f.pc.charId!];
    c.belief = { kind: 'faithful', patron: 'the_quartermaster' } as any; c.patron = 'the_quartermaster'; c.devotion = 3;
    const me = f.turn(f.pc); me.conds = { ...(me.conds || {}), witnessed: 2 } as any; me.ammo = 1;
    for (const u of f.cb.units) if (u.side === 'foe') { u.hp = u.maxHp; }
    f.act({ type: 'combat/attack', unitId: me.id, targetId: f.foe.id, mode: 'shot' } as any);
    const e = spots(f.cb.fx).find((x) => x.kind === 'god');
    expect(e).toMatchObject({ kind: 'god', patron: 'the_quartermaster', char: c.id, unit: me.id });
    expect(e.reason).toMatch(/reloads|reload/);
    expect(typeof e.from).toBe('number'); expect(e.from).toBeLessThan(e.n);
    const said = f.cb.fx!.find((x) => x.k === 'patron_line' && x.event === 'intervention');
    if (said) expect(e.line).toBe(said.text);
  });
  it('a view for another player keeps the event (every player sees it)', async () => {
    const { s } = checkWith(20, 20);
    const { viewFor } = await import('../src');
    const v: GameState = viewFor(s.g, 'host');
    expect(spots((v.story as any).fx)).toHaveLength(1);
  });
});
