// Spotlight cut-ins (docs/design/cutin-spec.md, decision 113): the engine's `spotlight` presentation event. Every test
// goes through apply() (the path a player's click takes), except the direct calls that check the trigger API itself.
import { describe, expect, it } from 'vitest';
import { apply, d20, spotlight, critMoment, SPOTLIGHT_FX, musicOf, viewFor, npcsOf, positionsOf, standable, zoneMap, storyObjects, refOf, type Combat, type GameState } from '../src';
import { applyDamage } from '../src/effects/damage';
import { soulStrike } from '../src/classes/soul';
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
function takedown(tier: 'boss' | 'elite' | 'minion', o: { song?: boolean; traits?: string[]; before?: (g: GameState, charId: string) => void } = {}) {
  const f = fightWith([{ name: 'Mallow' }, { name: 'Ana' }], [{ tier, at: 'C5', name: tier === 'minion' ? 'Grunt' : 'Warden' }, { tier: 'soldier', at: 'L9' }]);
  if (o.song) f.g.characters[f.pc.charId!].identity = { song: 'https://youtu.be/aaaaaaaaaaa', songTitle: 'Mine', songArtist: 'Me' } as any;
  if (o.traits) f.g.characters[f.pc.charId!].traits = o.traits;
  o.before?.(f.g, f.pc.charId!);
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
  it('enemy turns carry their own from: a Toll-Keeper intervention in an enemy\'s turn, through apply()', () => {
    // A Witnessed Toll-Keeper fighter at 1 HP next to an enemy; the player ends the turn and the enemy's shot would drop
    // them: the patron keeps them at 1 HP inside the enemy's turn. Seeds are tried until the enemy hits.
    const f = fightWith([{ name: 'Priest', skills: { faith: 7 } }], [{ at: 'F6' }]);
    const c = f.g.characters[f.pc.charId!];
    c.belief = { kind: 'faithful', patron: 'toll_keeper' } as any; c.patron = 'toll_keeper'; c.devotion = 3;
    const me = f.turn(f.pc);
    for (const u of f.cb.units) u.conds = {};
    me.conds = { witnessed: 2 } as any; me.hp = 1; me.armour = 0;
    f.foe.pos = me.pos.split(',').map(Number).map((v, i) => (i === 0 ? v + 1 : v)).join(',');
    for (let s = 1; s < 600; s++) {
      const g = clone(f.g); g.rng = { state: s };
      const mine = (g.combat!.fxSeq || 0); // the player's own action (the end of the turn) starts after this
      const g2 = apply(g, { type: 'combat/end-turn', unitId: me.id } as any, 'host');
      const cb = g2.combat!, e = spots(cb.fx).find((x) => x.kind === 'god');
      if (!e) continue;
      // The end-turn's own fx (its 'turn' banners) come first; the enemy's turn is marked after them.
      const endTurnFx = cb.fx!.filter((x) => x.n > mine && x.n < e.from!);
      expect(e).toMatchObject({ kind: 'god', patron: 'toll_keeper', char: c.id, unit: me.id });
      expect(e.from).toBeGreaterThan(mine + 1);
      expect(endTurnFx.length).toBeGreaterThan(0);
      const foeShot = cb.fx!.find((x) => x.n >= e.from! && x.n < e.n && x.unit === f.foe.id);
      expect(foeShot).toBeTruthy(); // the slowed segment is the enemy's own shot
      expect(cb.actFrom).toBeUndefined(); // cleared after the enemies' turns
      return;
    }
    throw new Error('the enemy never hit');
  });
  it('a music trait\'s "a kill" never fires on a boss or elite kill (the music\'s old chain), and still does on a minion', () => {
    // The spotlight song was already used this fight and nothing is playing: before the fix the trait's "a kill" started.
    const used = (g: GameState, id: string) => { const m = musicOf(g); m.used[id] = 'fight' + m.fight; m.now = null; };
    const big = takedown('elite', { song: true, traits: ['headbanger'], before: used });
    expect(spots(big.g.combat!.fx)).toHaveLength(1);
    expect(big.g.music!.now).toBeNull();
    expect(big.g.combat!.log.some((l) => l.startsWith('♪'))).toBe(false);
    const small = takedown('minion', { song: true, traits: ['headbanger'], before: used });
    expect(small.g.music!.now).toMatchObject({ charId: small.me.charId, reason: 'a kill' });
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
    // Faith 2.2 (rules 1.6.3, item 742): the Quartermaster refunds any reload of yours while you are Witnessed.
    const me = f.turn(f.pc); me.conds = { ...(me.conds || {}), witnessed: 2 } as any; me.ammo = 0;
    f.act({ type: 'combat/reload', unitId: me.id } as any);
    const e = spots(f.cb.fx).find((x) => x.kind === 'god');
    expect(e).toMatchObject({ kind: 'god', patron: 'the_quartermaster', char: c.id, unit: me.id });
    expect(e.reason).toMatch(/reloads|reload/);
    expect(typeof e.from).toBe('number'); expect(e.from).toBeLessThan(e.n);
    const said = f.cb.fx!.find((x) => x.k === 'patron_line' && x.event === 'intervention');
    if (said) expect(e.line).toBe(said.text);
  });
  it('a view for another player keeps the event (every player sees it)', () => {
    const { s } = checkWith(20, 20);
    s.act({ type: 'player/join', id: 'guest', name: 'Guest' } as any, 'host');
    expect(s.g.players.some((p) => p.id === 'guest')).toBe(true);
    const v: GameState = viewFor(s.g, 'guest'); // a guest's view, not the host's
    expect(v.hostId).not.toBe('guest');
    expect(spots((v.story as any).fx)).toHaveLength(1);
    expect(spots((v.story as any).fx)[0]).toMatchObject({ kind: 'crit' });
  });
  it('the interjection flag rides on a god moment only', () => {
    const s = storyWith([{}]);
    expect(spotlight(s.g, { kind: 'god', patron: 'toll_keeper', char: s.chars[0].id, reason: 'speaks', line: 'Not yet.', interject: true })).toMatchObject({ interject: true });
    expect(spotlight(s.g, { kind: 'crit', char: s.chars[0].id, reason: 'x', interject: true } as any)!.interject).toBeUndefined();
  });
});

describe('spotlight: never from the area map\'s dry run', () => {
  /** A Witnessed Toll-Keeper priest and an ally; a copy of the fight's map marked dry, as game.ts makes for an area-map
   *  evoke or release; the ally takes a hit that would drop them on that copy. */
  function dryHit(dry: boolean, phase: 'combat' | 'story') {
    const f = fightWith([{ name: 'Priest', skills: { faith: 7 } }, { name: 'Ally' }], [{ at: 'F6' }]);
    const c = f.g.characters[f.pc.charId!];
    c.belief = { kind: 'faithful', patron: 'toll_keeper' } as any; c.patron = 'toll_keeper'; c.devotion = 3;
    const [pr] = f.pcs; pr.conds = { witnessed: 2 } as any;
    const g = f.g, real = g.combat!, copy: Combat = clone(real); if (dry) (copy as any).dry = true;
    if (phase === 'story') g.phase = 'story';
    const was = { cb: spots(real.fx).length, st: spots((g.story as any).fx).length };
    const ally = copy.units.find((u) => u.side === 'pc' && u.id !== pr.id)!, foe = copy.units.find((u) => u.side === 'foe')!;
    withGame(g, () => applyDamage(copy, ally, 9999, { by: foe, type: 'physical' } as any));
    expect(ally.hp).toBe(1); // the intervention itself ran on the copy
    return { cb: spots(real.fx).length - was.cb, st: spots((g.story as any).fx).length - was.st };
  }
  it('an intervention on the dry copy emits no spotlight (on the area map or in a fight)', () => {
    expect(dryHit(true, 'story')).toEqual({ cb: 0, st: 0 });
    expect(dryHit(true, 'combat')).toEqual({ cb: 0, st: 0 });
  });
  it('the real run\'s does, exactly one', () => {
    expect(dryHit(false, 'story')).toEqual({ cb: 0, st: 1 });
    expect(dryHit(false, 'combat')).toEqual({ cb: 1, st: 0 });
  });
});

// ---------- critical hits in a fight (Leon, 9 Nov 2026: "play it when a critical hit appear in combat too") ----------
/** Seeds are tried (through apply(), on copies) until the action gives what `ok` wants. */
function untilSeed(g0: GameState, a: any, ok: (g: GameState) => boolean, by = 'host'): GameState {
  for (let s = 1; s < 3000; s++) { const g = clone(g0); g.rng = { state: s }; let g2: GameState; try { g2 = apply(g, a, by); } catch { continue; } if (ok(g2)) return g2; }
  throw new Error('no seed');
}
const shotOf = (g: GameState, unit: string) => g.combat!.fx!.filter((x) => (x.k === 'shot' || x.k === 'melee') && x.unit === unit);
describe('spotlight: a party crit in a fight (decision 113)', () => {
  /** The first PC on its turn beside a sturdy soldier (the shot never kills it). */
  function crit(tier: 'soldier' | 'boss' = 'soldier', hp = 999) {
    const f = fightWith([{ name: 'Mallow' }, { name: 'Ana' }], [{ tier, at: 'C5', name: tier === 'boss' ? 'Warden' : 'Rook' }, { tier: 'soldier', at: 'L9' }]);
    const me = f.turn(f.pc), t = f.foe; t.hp = t.maxHp = hp; t.armour = 0; t.conds = {};
    return { f, me, t };
  }
  it('a weapon crit by a player character: one crit spotlight, from the shot, short (via weapon), the target named', () => {
    const { f, me, t } = crit();
    const before = (f.cb.fxSeq || 0);
    const g = untilSeed(f.g, { type: 'combat/attack', unitId: me.id, targetId: t.id, mode: 'shot' }, (x) => shotOf(x, me.id).some((s) => s.crit && s.hit));
    const cb = g.combat!, ss = spots(cb.fx), shot = shotOf(g, me.id)[0];
    expect(ss).toHaveLength(1);
    expect(ss[0]).toMatchObject({ kind: 'crit', via: 'weapon', char: me.charId, unit: me.id, target: t.id, song: false });
    expect(ss[0].reason).toMatch(/^a critical hit on (Rook|an unseen hostile)$/);
    expect(ss[0].from).toBe(before + 1); expect(ss[0].from).toBeLessThanOrEqual(shot.n); expect(ss[0].n).toBeGreaterThan(shot.n);
    expect(ss[0].tn).toBeUndefined();
    expect(cb.critNotes).toBeUndefined(); expect(cb.actFrom).toBeUndefined();
  });
  it('a plain hit is no spotlight; neither is a miss', () => {
    const { f, me, t } = crit();
    const g = untilSeed(f.g, { type: 'combat/attack', unitId: me.id, targetId: t.id, mode: 'shot' }, (x) => shotOf(x, me.id).some((s) => s.hit && !s.crit));
    expect(spots(g.combat!.fx)).toHaveLength(0);
  });
  it('a crit that takes down a boss is one moment: the takedown, no crit event', () => {
    const { f, me, t } = crit('boss', 1);
    const g = untilSeed(f.g, { type: 'combat/attack', unitId: me.id, targetId: t.id, mode: 'shot' }, (x) => shotOf(x, me.id).some((s) => s.crit && s.hit));
    const ss = spots(g.combat!.fx);
    expect(ss.map((x) => x.kind)).toEqual(['takedown']);
  });
  it('an enemy\'s crit never cuts in', () => {
    const f = fightWith([{ name: 'Mallow' }], [{ at: 'F6' }]);
    const me = f.turn(f.pc); me.hp = me.maxHp = 999; me.armour = 0;
    f.foe.pos = me.pos.split(',').map(Number).map((v, i) => (i === 0 ? v + 1 : v)).join(',');
    const g = untilSeed(f.g, { type: 'combat/end-turn', unitId: me.id }, (x) => shotOf(x, f.foe.id).some((s) => s.crit && s.hit));
    expect(spots(g.combat!.fx).filter((x) => x.kind === 'crit')).toHaveLength(0);
  });
  it('a companion\'s crit: its owner\'s strip, its name in the words', () => {
    const { f, me, t } = crit();
    const g0 = clone(f.g), cb = g0.combat!, u = cb.units.find((x) => x.id === me.id)!;
    // The companion is a pc-side unit with no character of its own (ctrl: its owner).
    delete (u as any).charId; (u as any).companion = 'rex'; (u as any).ctrl = me.charId; u.name = 'Rex';
    const e = withGame(g0, () => { cb.actFrom = (cb.fxSeq || 0) + 1; (cb as any).critNotes = [{ unit: u.id, target: t.id, via: 'weapon', n: cb.fxSeq || 0 }]; return critMoment(g0); });
    expect(e).toMatchObject({ kind: 'crit', char: me.charId, unit: u.id, by: 'Rex' }); expect(e!.reason).toMatch(/^Rex: a critical hit on /);
  });
  it('a Sigil spell that crits: one crit spotlight, via sigil', () => {
    const f = fightWith([{ archetype: 'stormcaller', kit: 'soul' } as any], [{ tier: 'minion' }] as any);
    const cb = f.cb; cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; cb.mana = 15;
    f.pc.pos = '3,5'; f.foe.pos = '8,5';
    for (const x of [...f.pcs, ...f.foes]) { x.hp = x.maxHp = 5000; x.armour = 0; x.hidden = false; x.conds = {}; }
    const c = f.g.characters[f.pc.charId!]; c.sigils = ['fire', 'seek'];
    const u = f.turn(f.pc); u.ap = 60;
    Object.assign(u.mg!, { evoker: true, words: ['fire', 'seek'], charge: 999, cores: 5, glyphAp: 1, maxWords: 4, flux: -99, sigilMult: 1, elemMult: 1, healMult: 1, rangeBonus: 0, durBonus: 0, coreSave: 0, inflect: [] });
    f.act({ type: 'combat/draw', unitId: u.id, word: 'fire', tile: '3,5' } as any);
    f.unit(u.id).pos = '4,5'; f.unit(u.id).ap = 60;
    f.act({ type: 'combat/draw', unitId: u.id, word: 'seek', tile: '4,5' } as any);
    f.unit(u.id).pos = '2,5'; f.unit(u.id).ap = 60;
    const g = untilSeed(f.g, { type: 'combat/evoke', unitId: u.id, tile: '3,5', aim: '8,5' }, (x) => x.combat!.log.some((l) => /CRITICAL/.test(l)));
    const ss = spots(g.combat!.fx);
    expect(ss).toHaveLength(1); expect(ss[0]).toMatchObject({ kind: 'crit', via: 'sigil', char: c.id, target: f.foe.id });
  });
  it('never from the area map\'s dry run, and a stale note from another action is dropped', () => {
    const { f, me, t } = crit();
    const g = clone(f.g), cb = g.combat!;
    cb.actFrom = (cb.fxSeq || 0) + 10; (cb as any).critNotes = [{ unit: me.id, target: t.id, via: 'weapon', n: (cb.fxSeq || 0) }];
    expect(withGame(g, () => critMoment(g))).toBeNull();
    (cb as any).dry = true; cb.actFrom = (cb.fxSeq || 0) + 1; (cb as any).critNotes = [{ unit: me.id, target: t.id, via: 'weapon', n: (cb.fxSeq || 0) }];
    expect(withGame(g, () => critMoment(g))).toBeNull();
  });
});

// ---------- the strike that opens a fight from the area map (review: it never went through combatAction) ----------
describe('spotlight: the strike that opens a fight from the area map (decision 113)', () => {
  function freeNear(g: GameState, from: string, d: number): string {
    const [x, y] = from.split(',').map(Number), map = zoneMap(g), taken = new Set([...Object.values(positionsOf(g)), ...npcsOf(g).map((n) => n.pos), ...storyObjects(g).map((o) => o.pos)]);
    for (let i = -d; i <= d; i++) for (let j = -d; j <= d; j++) { if (Math.max(Math.abs(i), Math.abs(j)) !== d) continue; const k = (x + i) + ',' + (y + j); if (standable(map, k) && !taken.has(k)) return k; }
    throw new Error('no free tile');
  }
  /** One character on the area map with a hostile one tile away (its back turned when hidden) and a second far off, so
   *  the fight stays open; `hidden`: sneaking unseen (the ambush, where 19–20 crits). */
  function opening(o: { hidden: boolean; tier?: string; hp?: number }) {
    const s = storyWith([{ name: 'Mallow', weapon: 'combat_knife' }]); const c = s.chars[0], here = positionsOf(s.g)[c.id];
    const put = (at: string, name: string, tier: string) => { s.act({ type: 'narrator/turn', turn: { narration: 'Someone.', npcs: [{ action: 'place', name, side: 'hostile', tier, weapon: 'service_pistol', at: refOf(at) }] } } as any); return npcsOf(s.g)[npcsOf(s.g).length - 1]; };
    const n = put(freeNear(s.g, here, 1), 'Sentry', o.tier || 'soldier'), t = npcsOf(s.g).find((x) => x.id === n.id)!;
    t.facing = [Math.sign(+t.pos.split(',')[0] - +here.split(',')[0]) || 1, Math.sign(+t.pos.split(',')[1] - +here.split(',')[1])] as any; (t as any).hp = o.hp ?? 999;
    put(freeNear(s.g, here, 6), 'Watcher', 'minion');
    if (o.hidden) { s.g.story.sneak = { [c.id]: true }; s.g.story.hidden = { [c.id]: true }; }
    return { g0: s.g, c, n };
  }
  const melee = (g: GameState, unit: string) => (g.combat?.fx || []).filter((x) => (x.k === 'melee' || x.k === 'shot') && x.unit === unit);
  for (const hidden of [false, true]) it((hidden ? 'an ambush from Hidden' : 'an attack in the open') + ': a crit on the opening strike is one crit spotlight whose from covers it', () => {
    const { g0, c, n } = opening({ hidden });
    const a = { type: 'world/act', charId: c.id, act: 'attack', targetId: n.id, mode: 'melee' };
    const g = untilSeed(g0, a, (x) => x.phase === 'combat' && !!x.combat && melee(x, x.combat.units.find((u) => u.charId === c.id)!.id).some((e) => e.crit && e.hit));
    const me = g.combat!.units.find((u) => u.charId === c.id)!, hit = melee(g, me.id).find((e) => e.crit && e.hit)!;
    const ss = spots(g.combat!.fx).filter((x) => x.kind === 'crit');
    expect(ss).toHaveLength(1);
    expect(ss[0]).toMatchObject({ kind: 'crit', via: 'weapon', char: c.id, unit: me.id });
    expect(ss[0].from).toBeLessThanOrEqual(hit.n); expect(ss[0].n).toBeGreaterThan(hit.n);
  });
  it('an ambush from Hidden crits on a 19 as well (the aimed / Hidden range)', () => {
    const { g0, c, n } = opening({ hidden: true });
    const a = { type: 'world/act', charId: c.id, act: 'attack', targetId: n.id, mode: 'melee' };
    const g = untilSeed(g0, a, (x) => x.phase === 'combat' && /d20 19\b[^\n]*CRIT|CRIT[^\n]*d20 19\b/i.test((x.combat?.log || []).join('\n')) && melee(x, x.combat!.units.find((u) => u.charId === c.id)!.id).some((e) => e.crit && e.hit));
    expect(spots(g.combat!.fx).filter((x) => x.kind === 'crit')).toHaveLength(1);
  });
  it('a boss downed by the opening ambush is a takedown spotlight (one moment, not a crit too)', () => {
    const { g0, c, n } = opening({ hidden: true, tier: 'boss', hp: 1 });
    const a = { type: 'world/act', charId: c.id, act: 'attack', targetId: n.id, mode: 'melee' };
    const g = untilSeed(g0, a, (x) => x.phase === 'combat' && !!x.combat?.units.find((u) => u.npcId === n.id)?.dead);
    const me = g.combat!.units.find((u) => u.charId === c.id)!, first = melee(g, me.id)[0];
    const ss = spots(g.combat!.fx);
    expect(ss.map((x) => x.kind)).toEqual(['takedown']);
    expect(ss[0].from).toBeLessThanOrEqual(first.n);
  });
});

describe('spotlight: Storm Front\'s rolled arcs (soulStrike) note their crit like the primary strike', () => {
  it('a natural 20 on an arc notes an outburst crit, which the action\'s end turns into one crit spotlight', () => {
    const f = fightWith([{ archetype: 'stormcaller', kit: 'soul' } as any], [{ tier: 'soldier' }] as any);
    const g = clone(f.g), cb = g.combat!, u = cb.units.find((x) => x.side === 'pc')!, t = cb.units.find((x) => x.side === 'foe')!;
    t.hp = t.maxHp = 5000; t.armour = 0; t.def = 5; t.conds = {};
    Object.assign(u.mg!, { emanator: true, mp: 999, mpMax: 999, soulMult: 1, healMult: 1, will: 0 });
    const d = { id: 'x1', name: 'Arc', school: 'damage', modules: [] } as any;
    cb.actFrom = (cb.fxSeq || 0) + 1;
    const line = withGame(g, () => soulStrike(cb, { state: rngFor(20) }, u, d, t, 1, 0, true));
    expect(line).toMatch(/CRITICAL/);
    expect(cb.critNotes).toEqual([expect.objectContaining({ unit: u.id, target: t.id, via: 'outburst' })]);
    expect(withGame(g, () => critMoment(g))).toMatchObject({ kind: 'crit', via: 'outburst', char: u.charId, target: t.id });
    // A plain hit notes nothing.
    cb.actFrom = (cb.fxSeq || 0) + 1;
    withGame(g, () => soulStrike(cb, { state: rngFor(15) }, u, d, t, 1, 0, true));
    expect(cb.critNotes).toBeUndefined();
  });
});
