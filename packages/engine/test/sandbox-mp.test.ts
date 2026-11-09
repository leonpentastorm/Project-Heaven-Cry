// The Proving Ground with friends: a fighter for everyone who joins, READY, permissions, waves scaled by the party,
// Retry for all, leaving, team fights, and never any Narrator work.
import { describe, expect, it } from 'vitest';
import {
  ARCHETYPES, type Sheet, type GameState, type Action, newGame, apply, RuleError, sandboxWave, sandboxScale, sandboxReady, viewFor, maxHp, npcsOf, SANDBOX_PORTRAIT, active, visibility, standable, zoneMap,
} from '../src';

const sheetFrom = (archId: string, name: string, kit = 'soldier'): Sheet => {
  const a = ARCHETYPES.find((x) => x.id === archId)!;
  return { name, portrait: '', origin: 'Thousand-Planet frontier', kit, traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} };
};
const HOST = 'h1', P2 = 'p2', P3 = 'p3';
/** From the title, with friends: a fresh room, the Proving Ground opened standalone (the host gets "Recruit"). */
const open = () => apply(newGame('PROVE2', { id: HOST, name: 'Host' }, 'seed-mp'), { type: 'sandbox/start', standalone: true }, HOST);
const join = (g: GameState, id: string, name = id) => apply(g, { type: 'player/join', id, name }, HOST);
const refused = (g: GameState, a: Action, by = HOST) => { try { apply(g, a, by); } catch (e) { expect(e).toBeInstanceOf(RuleError); return (e as Error).message; } throw new Error('expected a refusal: ' + a.type); };
const fighters = (g: GameState, pid: string) => Object.values(g.characters).filter((c) => c.owner === pid);
/** Narrator work is never queued and the Narrator is never busy. */
const quiet = (g: GameState) => { expect(g.story.work).toBeNull(); expect(g.narrator.busy).toBe(false); };
const killFoes = (g: GameState) => { const x: GameState = JSON.parse(JSON.stringify(g)); for (const u of x.combat!.units) if (u.side === 'foe') { u.hp = 0; u.dead = true; } return x; };
const downPcs = (g: GameState) => { const x: GameState = JSON.parse(JSON.stringify(g)); for (const u of x.combat!.units) if (u.side === 'pc') { u.hp = 0; u.downed = true; } return x; };
/** Pass the active turn as whoever owns it (the next action re-checks the fight). */
const pass = (g: GameState) => { const u = active(g.combat!)!; const owner = g.characters[u.charId!]?.owner || HOST; return apply(g, { type: 'combat/end-turn', unitId: u.id } as Action, owner); };

describe('joining the Proving Ground', () => {
  it('a friend who joins gets their own Recruit with Wick\'s face on a free start tile; a rejoin keeps it', () => {
    let g = open();
    expect(fighters(g, HOST).map((c) => c.name)).toEqual(['Recruit']);
    g = join(g, P2, 'Mai');
    const r2 = fighters(g, P2); expect(r2.map((c) => c.name)).toEqual(['Recruit 2']);
    expect(r2[0].portrait).toBe(SANDBOX_PORTRAIT); expect(r2[0].hp).toBe(maxHp(r2[0]));
    expect(g.sandbox!.temp).toContain(r2[0].id);
    const pos = g.story.positions!; expect(pos[r2[0].id]).toBeTruthy(); expect(pos[r2[0].id]).not.toBe(pos[fighters(g, HOST)[0].id]);
    g = join(g, P3, 'Ona'); expect(fighters(g, P3)[0].name).toBe('Recruit 3');
    // Drops and comes back: same fighter, same READY.
    g = apply(g, { type: 'sandbox/ready', on: true }, P2);
    g = apply(g, { type: 'player/online', id: P2, online: false }, HOST);
    g = join(g, P2, 'Mai');
    expect(fighters(g, P2).map((c) => c.id)).toEqual([r2[0].id]); expect(g.sandbox!.ready![P2]).toBe(true);
    quiet(g);
  });
  it('up to 4 players: the room limit', () => {
    let g = join(join(join(open(), P2), P3), 'p4');
    expect(refused(g, { type: 'player/join', id: 'p5', name: 'Five' })).toMatch(/full/);
    expect(g.players.length).toBe(4); expect(Object.keys(g.characters).length).toBe(4);
  });
  it('bringing a saved character makes a copy: it replaces the Recruit, and the sheet sent is never changed', () => {
    let g = join(open(), P2);
    const sheet = sheetFrom('field_medic', 'Ona', 'medic'), before = JSON.stringify(sheet);
    g = apply(g, { type: 'sandbox/bring', sheet }, P2);
    const mine = fighters(g, P2); expect(mine.map((c) => c.name)).toEqual(['Ona']);
    expect(g.sandbox!.temp).toContain(mine[0].id);
    g = apply(g, { type: 'sandbox/give', charId: mine[0].id, item: 'sabre' }, P2);
    g = apply(g, { type: 'sandbox/level', charId: mine[0].id, level: 9 }, P2);
    expect(JSON.stringify(sheet)).toBe(before);
    // Leaving the Proving Ground removes the copy (it was never the room's).
    g = apply(g, { type: 'sandbox/end' }, HOST);
    expect(Object.values(g.characters).some((c) => c.name === 'Ona')).toBe(false);
    expect(refused(join(open(), P2), { type: 'sandbox/bring', sheet: { ...sheet, skills: { firearms: 99 } } }, P2)).toBeTruthy();
  });
  it('a player with no fighter can take a Recruit', () => {
    let g = join(open(), P2);
    g = apply(g, { type: 'sandbox/leave' }, P2); g = apply(g, { type: 'player/join', id: P2, name: 'Mai' }, HOST);
    expect(fighters(g, P2).length).toBe(1);
    expect(refused(g, { type: 'sandbox/recruit' }, P2)).toMatch(/already/);
  });
});

describe('ready-up and starting the fight', () => {
  it('READY toggles per player; the host starts whenever; a guest only once everyone is ready', () => {
    let g = join(open(), P2);
    expect(sandboxReady(g)).toMatchObject({ ready: 0, of: 2 });
    g = apply(g, { type: 'sandbox/ready' }, P2);
    expect(sandboxReady(g)).toMatchObject({ ready: 1, of: 2 });
    expect(refused(g, { type: 'sandbox/fight' }, P2)).toMatch(/host starts/);
    const anyway = apply(g, { type: 'sandbox/fight' }, HOST); // the host can start anyway
    expect(anyway.phase).toBe('combat'); expect(anyway.sandbox!.ready).toEqual({});
    g = apply(g, { type: 'sandbox/ready', on: true }, HOST);
    const go = apply(g, { type: 'sandbox/fight' }, P2);
    expect(go.phase).toBe('combat'); quiet(go);
    expect(refused(go, { type: 'sandbox/ready' }, P2)).toMatch(/already on/);
  });
  it('attacking a drill unit starts the fight at once, and the log says who was ready', () => {
    const g = join(open(), P2), c = fighters(g, P2)[0], me = g.story.positions![c.id];
    const x: GameState = JSON.parse(JSON.stringify(g)); const [mx, my] = me.split(',').map(Number);
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => (mx + dx) + ',' + (my + dy)).find((k) => standable(zoneMap(x), k) && !(x.story.objects || []).some((o) => o.pos === k) && !Object.values(x.story.positions!).includes(k))!;
    x.story.npcs = [{ ...npcsOf(x)[0], pos: near }];
    const hit = apply(x, { type: 'world/act', charId: c.id, act: 'attack', targetId: npcsOf(x)[0].id, mode: 'melee' } as Action, P2);
    expect(hit.combat).toBeTruthy();
    expect(hit.combat!.log.join('\n')).toMatch(/attacked a drill unit: the fight starts at once \(0 \/ 2 were ready\)/);
    quiet(hit);
  });
});

describe('permissions', () => {
  it('everyone: gear on their own fighter only; host only: the field, waves, mana, AI, endless, settings, end', () => {
    let g = join(open(), P2);
    const hosts = fighters(g, HOST)[0], mine = fighters(g, P2)[0];
    g = apply(g, { type: 'sandbox/give', charId: mine.id, item: 'sabre', equip: true }, P2);
    g = apply(g, { type: 'sandbox/kit', charId: mine.id }, P2);
    g = apply(g, { type: 'sandbox/learn', charId: mine.id, word: 'fire' }, P2);
    expect(refused(g, { type: 'sandbox/give', charId: hosts.id, item: 'sabre' }, P2)).toMatch(/Not your/);
    for (const a of [{ type: 'sandbox/spawn', tier: 'minion', weapon: 'fists', at: 'H6' }, { type: 'sandbox/clear' }, { type: 'sandbox/stage', wave: 3 }, { type: 'sandbox/wave', wave: 4 }, { type: 'sandbox/mana', value: 30 }] as Action[])
      expect(refused(g, a, P2), a.type).toMatch(/host/);
    for (const a of [{ type: 'sandbox/ai', on: false }, { type: 'sandbox/auto', on: true }, { type: 'sandbox/settings', spawnAll: true }, { type: 'sandbox/end' }, { type: 'player/kick', id: HOST }] as Action[])
      expect(refused(g, a, P2), a.type).toMatch(/host|Host/);
    // "Everyone can spawn" opens the field tools to all, not the room's settings.
    g = apply(g, { type: 'sandbox/settings', spawnAll: true }, HOST);
    g = apply(g, { type: 'sandbox/spawn', tier: 'minion', weapon: 'fists', at: 'H6' }, P2);
    g = apply(g, { type: 'sandbox/mana', value: 30 }, P2);
    g = apply(g, { type: 'sandbox/clear' }, P2);
    expect(refused(g, { type: 'sandbox/ai', on: false }, P2)).toMatch(/host/);
    quiet(g);
  });
  it('Retry on a fallen wave: guests may, unless the host turns it off', () => {
    let g = apply(join(open(), P2), { type: 'sandbox/fight' }, HOST);
    g = pass(downPcs(g));
    expect(g.sandbox!.state).toBe('fallen');
    const r = apply(g, { type: 'sandbox/retry' }, P2);
    expect(r.phase).toBe('combat'); expect(r.sandbox!.attempt).toBe(2);
    // Retry is for everyone at once: both fighters are back in the fight, refilled.
    expect(r.combat!.units.filter((u) => u.charId).map((u) => u.hp)).toEqual(Object.values(r.characters).map((c) => maxHp(c)));
    g = apply(g, { type: 'sandbox/settings', guestRetry: false }, HOST);
    expect(refused(g, { type: 'sandbox/retry' }, P2)).toMatch(/turned off/);
    quiet(r);
  });
});

describe('waves scale with the party', () => {
  it('the budget is × (0.6 + 0.4 × players); one player is the solo wave', () => {
    expect(sandboxScale(1)).toBe(1); expect(sandboxScale(2)).toBeCloseTo(1.4); expect(sandboxScale(4)).toBeCloseTo(2.2);
    const pts = (n: number, p: number) => sandboxWave(n, p).reduce((t, f) => t + ({ minion: 1, soldier: 2, elite: 4, boss: 8 } as any)[f.tier], 0);
    for (let n = 1; n <= 12; n++) { expect(sandboxWave(n, 1)).toEqual(sandboxWave(n)); expect(pts(n, 3)).toBeGreaterThanOrEqual(pts(n, 1)); expect(sandboxWave(n, 4).length).toBeLessThanOrEqual(8); }
    expect(pts(6, 4)).toBeGreaterThan(pts(6, 1));
  });
  it('the wave on the map follows the party: a friend joining re-places it', () => {
    let g = open();
    expect(npcsOf(g).length).toBe(sandboxWave(1, 1).length);
    g = join(join(g, P2), P3);
    expect(npcsOf(g).map((n) => n.name)).toEqual(sandboxWave(1, 3).map((f) => f.name));
    // A fight then a clear: the next wave comes in at the party's size, and the best wave is kept per player.
    g = apply(g, { type: 'sandbox/fight' }, HOST); g = pass(killFoes(g));
    expect(g.sandbox!.state).toBe('cleared');
    expect(g.sandbox!.bestBy).toEqual({ [HOST]: 1, [P2]: 1, [P3]: 1 });
    const next = apply(g, { type: 'sandbox/wave' }, P3); // Next wave: anyone, for everyone
    expect(next.combat!.units.filter((u) => u.side === 'foe').length).toBe(Math.min(9, sandboxWave(2, 3).length));
    expect(next.combat!.units.filter((u) => u.charId).length).toBe(3);
  });
});

describe('leaving', () => {
  it('a guest who leaves takes their fighter with them, in a fight too; the turn moves on', () => {
    let g = apply(join(open(), P2), { type: 'sandbox/ai', on: false }, HOST);
    g = apply(g, { type: 'sandbox/fight' }, HOST);
    while (g.characters[active(g.combat!)!.charId || '']?.owner !== P2) g = pass(g);
    const left = apply(g, { type: 'sandbox/leave' }, P2);
    expect(fighters(left, P2)).toEqual([]); expect(left.players.some((p) => p.id === P2)).toBe(false);
    expect(left.combat!.units.some((u) => u.charId && !left.characters[u.charId])).toBe(false);
    expect(left.combat!.units.find((u) => u.id === active(left.combat!)!.id)).toBeTruthy();
    expect(refused(left, { type: 'sandbox/leave' }, HOST)).toMatch(/host ends/);
    quiet(left);
  });
  it('the host removing a player: their fighter goes, and they stay out of the room it returns to', () => {
    let g = newGame('PROVE3', { id: HOST, name: 'Host' }, 'seed-mp');
    g = join(g, P2); g = apply(g, { type: 'char/add', sheet: sheetFrom('sharpshooter', 'Vel') }, HOST); g = apply(g, { type: 'char/add', sheet: sheetFrom('bulwark', 'Tam') }, P2);
    g = apply(g, { type: 'sandbox/start' }, HOST);
    g = join(g, P3);
    g = apply(g, { type: 'player/kick', id: P3 }, HOST);
    expect(fighters(g, P3)).toEqual([]);
    g = join(g, 'p4'); g = apply(g, { type: 'sandbox/leave' }, P2);
    const back = apply(g, { type: 'sandbox/end' }, HOST);
    // The room as it was: its players (P2 is offline now, having left), its characters; the newcomer stays, the removed one does not.
    expect(back.phase).toBe('lobby'); expect(back.sandbox).toBeNull();
    expect(back.players.map((p) => p.id)).toEqual([HOST, P2, 'p4']);
    expect(back.players.find((p) => p.id === P2)!.online).toBe(false);
    expect(Object.values(back.characters).map((c) => c.name).sort()).toEqual(['Tam', 'Vel']);
    quiet(back);
  });
  it('from the title the Proving Ground is standalone (the client closes the room when the host leaves)', () => {
    expect(open().sandbox!.standalone).toBe(true);
    expect(viewFor(join(open(), P2), P2).sandbox!.standalone).toBe(true);
  });
});

describe('team fight', () => {
  const teams = () => {
    let g = join(open(), P2);
    g = apply(g, { type: 'sandbox/settings', mode: 'teams' }, HOST);
    return g;
  };
  it('no drill units; players pick teams; each team needs a fighter', () => {
    let g = teams();
    expect(npcsOf(g).filter((n) => n.side === 'hostile')).toEqual([]);
    expect(g.sandbox!.team).toEqual({ [HOST]: 'A', [P2]: 'B' });
    expect(refused(g, { type: 'sandbox/spawn', tier: 'minion', weapon: 'fists', at: 'H6' })).toMatch(/Team fight/);
    expect(refused(g, { type: 'sandbox/team', team: 'A', playerId: HOST }, P2)).toMatch(/own team/);
    const one = apply(g, { type: 'sandbox/team', team: 'A' }, P2);
    expect(refused(one, { type: 'sandbox/fight' })).toMatch(/Each team/);
  });
  it('starts at opposite start areas; Team B is player-run on the foe side and sees the fight from its side', () => {
    const g = apply(teams(), { type: 'sandbox/fight' }, HOST);
    expect(g.phase).toBe('combat'); quiet(g);
    const a = g.combat!.units.find((u) => g.characters[u.charId!]?.owner === HOST)!, b = g.combat!.units.find((u) => g.characters[u.charId!]?.owner === P2)!;
    expect(a.side).toBe('pc'); expect(b.side).toBe('foe'); expect(b.charId).toBeTruthy();
    expect(Number(a.pos.split(',')[0])).toBeLessThan(4); expect(Number(b.pos.split(',')[0])).toBeGreaterThan(11);
    // The active unit is a player's (no enemy AI ran Team B).
    expect(active(g.combat!)!.charId).toBeTruthy();
    const vb = viewFor(g, P2), va = viewFor(g, HOST);
    expect(vb.combat!.units.find((u) => u.id === b.id)!.side).toBe('pc'); expect(vb.combat!.units.find((u) => u.id === a.id)!.side).toBe('foe');
    expect(va.combat!.units.find((u) => u.id === b.id)!.side).toBe('foe');
    // Fog per team: Team B's eyes are its own units.
    const vis = visibility(vb.combat!, 'pc'); expect(vis.tiles.has(b.pos)).toBe(true);
    // Team B's player acts on their own turn; Team A's player can't move Team B.
    const turnB = (() => { let x = g; while (active(x.combat!)!.id !== b.id) x = pass(x); return x; })();
    expect(refused(turnB, { type: 'combat/end-turn', unitId: b.id } as Action, HOST)).toMatch(/Not your unit/);
    const after = apply(turnB, { type: 'combat/end-turn', unitId: b.id } as Action, P2);
    expect(active(after.combat!)!.id).not.toBe(b.id);
  });
  it('a player who left mid-fight: the host may pass their unit\'s turn (and only end it); a guest may not', () => {
    const g = apply(teams(), { type: 'sandbox/fight' }, HOST);
    const b = g.combat!.units.find((u) => g.characters[u.charId!]?.owner === P2)!;
    let turnB = g; while (active(turnB.combat!)!.id !== b.id) turnB = pass(turnB);
    turnB = apply(turnB, { type: 'player/online', id: P2, online: false }, HOST);
    expect(refused(turnB, { type: 'combat/overwatch', unitId: b.id } as Action, HOST)).toMatch(/Not your unit/);
    const after = apply(turnB, { type: 'combat/end-turn', unitId: b.id } as Action, HOST);
    expect(active(after.combat!)!.id).not.toBe(b.id);
    expect(after.combat!.log.some((l) => /passes .*turn: .* is away/.test(l))).toBe(true);
  });
  it('a team wins when the other is all Downed or out; everyone is back to gearing up with full HP', () => {
    let g = apply(teams(), { type: 'sandbox/fight' }, HOST);
    const x: GameState = JSON.parse(JSON.stringify(g)); for (const u of x.combat!.units) if (u.side === 'foe') { u.hp = 0; u.dead = true; }
    g = pass(x);
    expect(g.phase).toBe('story'); expect(g.combat!.over).toBe('win'); expect(g.sandbox!.lastWin).toBe('A');
    expect(g.sandbox!.wins).toEqual({ [HOST]: 1 }); expect(g.sandbox!.state).toBe('ready');
    for (const c of Object.values(g.characters)) { expect(c.hp).toBe(maxHp(c)); expect(c.dead).toBe(false); }
    expect(viewFor(g, P2).combat!.over).toBe('loss'); expect(viewFor(g, HOST).combat!.over).toBe('win');
    quiet(g);
    // Team B wins the next one.
    let h = apply(g, { type: 'sandbox/fight' }, HOST);
    h = pass(downPcs(h));
    expect(h.sandbox!.lastWin).toBe('B'); expect(h.sandbox!.wins).toEqual({ [HOST]: 1, [P2]: 1 });
  });
  it('Downed is out in a team fight (both sides alike)', () => {
    let g = join(apply(join(open(), P2), { type: 'sandbox/settings', mode: 'teams' }, HOST), P3);
    g = apply(g, { type: 'sandbox/team', team: 'A' }, P3);
    g = apply(g, { type: 'sandbox/fight' }, HOST);
    const x: GameState = JSON.parse(JSON.stringify(g)); const a = x.combat!.units.find((u) => x.characters[u.charId!]?.owner === P3)!; a.hp = 0; a.downed = true;
    const y = pass(x);
    const u = y.combat!.units.find((v) => v.id === a.id)!; expect(u.dead).toBe(true); expect(u.downed).toBe(false);
  });
});

describe('never the Narrator', () => {
  it('no path in the multiplayer Proving Ground queues Narrator work', () => {
    let g = join(open(), P2); quiet(g);
    g = apply(g, { type: 'sandbox/ready' }, P2); quiet(g);
    g = apply(g, { type: 'sandbox/fight' }, HOST); quiet(g);
    g = pass(killFoes(g)); quiet(g);
    g = apply(g, { type: 'sandbox/wave' }, P2); quiet(g);
    g = pass(downPcs(g)); quiet(g);
    g = apply(g, { type: 'sandbox/retry' }, P2); quiet(g);
    g = apply(g, { type: 'sandbox/leave' }, P2); quiet(g);
    g = apply(g, { type: 'sandbox/stop' }, HOST); quiet(g);
    g = apply(g, { type: 'sandbox/settings', mode: 'teams' }, HOST); quiet(g);
    expect(refused(g, { type: 'narrator/retry' } as Action)).toMatch(/no Narrator/);
  });
});
