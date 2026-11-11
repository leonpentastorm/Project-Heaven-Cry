// The game's own fight music (spec: Music): which of the fight's song (one of the pool of nine, picked per fight),
// Heaven Falls and Last Rounds plays, what still wins over them (a player's spotlight or pinned song; a campaign's
// theme for a named encounter), and Gearing Up in the Proving Ground.
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, OST, FIGHT_POOL, GEARING_UP, noteFightSong, fightTheme, musicFor, startSong, trackKey, newGame, apply, visibility, noteSighted, viewFor, type Sheet, type GameState, type Unit } from '../src';

const unit = (id: string, side: 'pc' | 'foe', x: Partial<Unit> = {}) => ({ id, side, tier: side === 'foe' ? 'soldier' : undefined, downed: false, dead: false, ...x }) as Unit;
/** A fight where the party has seen every hostile (sighted), unless told which ones it has seen. */
const fight = (units: Unit[], difficulty = 'standard', sighted = units.filter((u) => u.side === 'foe').map((u) => u.id)) => ({ units, difficulty, sighted });

describe('fightTheme: the fight track', () => {
  it('a normal fight plays its own song (Gunline for a fight without one)', () => {
    expect(fightTheme({ ...fight([unit('a', 'pc'), unit('e1', 'foe')]), song: 'mag_check' })).toEqual({ id: 'mag_check', why: 'Fight' });
    // Only a song of the pool is a fight's song; an elite, a Hard fight and Last Rounds still win over it.
    expect(fightTheme({ ...fight([unit('a', 'pc'), unit('e1', 'foe')]), song: 'gearing_up' }).id).toBe('gunline');
    expect(fightTheme({ ...fight([unit('a', 'pc'), unit('e1', 'foe', { tier: 'elite' })]), song: 'mag_check' }).id).toBe('heaven_falls');
    expect(fightTheme({ ...fight([unit('a', 'pc'), unit('e1', 'foe')], 'hard'), song: 'mag_check' }).id).toBe('heaven_falls');
    expect(fightTheme({ ...fight([unit('a', 'pc', { downed: true }), unit('e1', 'foe')]), song: 'mag_check' }).id).toBe('last_rounds');
    expect(fightTheme(fight([unit('a', 'pc'), unit('b', 'pc'), unit('e1', 'foe'), unit('e2', 'foe', { tier: 'minion' })])).id).toBe('gunline');
    expect(fightTheme(fight([unit('a', 'pc'), unit('e1', 'foe')], 'easy')).id).toBe('gunline');
  });
  it('an elite or a boss (or a Hard or Boss fight) plays Heaven Falls, for the whole fight', () => {
    expect(fightTheme(fight([unit('a', 'pc'), unit('e1', 'foe', { tier: 'elite' })]))).toEqual({ id: 'heaven_falls', why: 'Fight: an elite' });
    expect(fightTheme(fight([unit('a', 'pc'), unit('e1', 'foe', { tier: 'boss' })])).why).toBe('Fight: a boss');
    expect(fightTheme(fight([unit('a', 'pc'), unit('e1', 'foe')], 'hard')).id).toBe('heaven_falls');
    expect(fightTheme(fight([unit('a', 'pc'), unit('e1', 'foe')], 'boss')).id).toBe('heaven_falls');
    // The elite is down: the theme holds.
    expect(fightTheme(fight([unit('a', 'pc'), unit('e1', 'foe', { tier: 'elite', dead: true })])).id).toBe('heaven_falls');
  });
  it('an elite or boss in the fog of war changes nothing: Gunline and a plain "Fight" until the party sees it', () => {
    const units = [unit('a', 'pc'), unit('e1', 'foe'), unit('e2', 'foe', { tier: 'boss' })];
    expect(fightTheme(fight(units, 'standard', ['e1']))).toEqual({ id: 'gunline', why: 'Fight' });
    expect(fightTheme(fight(units, 'standard', []))).toEqual({ id: 'gunline', why: 'Fight' });
    expect(fightTheme(fight(units, 'standard', ['e1', 'e2']))).toEqual({ id: 'heaven_falls', why: 'Fight: a boss' });
    // A Hard or Boss fight is known to everyone: Heaven Falls from the start, and the label still names no unseen boss.
    expect(fightTheme(fight(units, 'boss', []))).toEqual({ id: 'heaven_falls', why: 'Fight: a hard one' });
    expect(fightTheme(fight(units, 'hard', ['e1']))).toEqual({ id: 'heaven_falls', why: 'Fight: a hard one' });
    // Seen once, then killed or back out of sight: it stays seen (sighted only grows), so the theme holds.
    expect(fightTheme(fight([unit('a', 'pc'), unit('e2', 'foe', { tier: 'boss', dead: true })], 'standard', ['e2'])).id).toBe('heaven_falls');
  });
  it('half the party Downed plays Last Rounds, over Heaven Falls, and hands back when they get up', () => {
    const units = [unit('a', 'pc', { downed: true }), unit('b', 'pc'), unit('e1', 'foe', { tier: 'boss' })];
    expect(fightTheme(fight(units)).id).toBe('last_rounds');
    expect(fightTheme(fight([unit('a', 'pc', { dead: true }), unit('b', 'pc', { downed: true }), unit('c', 'pc'), unit('e1', 'foe')])).id).toBe('last_rounds');
    expect(fightTheme(fight([unit('a', 'pc', { downed: true }), unit('b', 'pc'), unit('c', 'pc'), unit('e1', 'foe')])).id).toBe('gunline'); // 1 of 3
    units[0].downed = false;
    expect(fightTheme(fight(units)).id).toBe('heaven_falls');
    // Enemies going down never count.
    expect(fightTheme(fight([unit('a', 'pc'), unit('e1', 'foe', { downed: true }), unit('e2', 'foe', { dead: true })])).id).toBe('gunline');
  });
});

const sheetFrom = (archId: string, name: string, song?: string): Sheet => {
  const a = ARCHETYPES.find((x) => x.id === archId)!;
  return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'soldier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: song ? { song, songTitle: 'My Song', songArtist: 'Me' } : {} };
};
const room = () => {
  let g: GameState = newGame('OST1', { id: 'host', name: 'Leon' }, 'ost-seed');
  const act = (a: any, by = 'host') => { g = apply(g, a, by); };
  act({ type: 'player/join', id: 'p2', name: 'Friend' });
  act({ type: 'char/add', sheet: sheetFrom('field_medic', 'MPAT', 'https://youtu.be/aaaaaaaaaaa') });
  act({ type: 'char/add', sheet: sheetFrom('field_medic', 'Seven') }, 'p2');
  act({ type: 'session/start' });
  act({ type: 'narrator/turn', turn: { narration: 'Begin.', sceneTitle: 'Shield line' } });
  return { get g() { return g; }, act };
};
const brawl = (enemies: { name: string; tier: string; weapon: string }[], name = 'Odd fight', difficulty = 'easy') =>
  ({ type: 'narrator/turn', turn: { narration: 'Guns.', combat: { name, difficulty, enemies } } });

describe('musicFor in a fight', () => {
  it('plays the OST, never the campaign\'s generic combat track', () => {
    const r = room();
    r.g.campaign!.music = { ...(r.g.campaign!.music || {}), combat: { yt: 'bbbbbbbbbbb', title: 'Old fight', artist: '' } };
    r.act(brawl([{ name: 'E', tier: 'minion', weapon: 'service_pistol' }]));
    const song = r.g.combat!.song!;
    expect(FIGHT_POOL).toContain(song);
    expect(musicFor(r.g)).toMatchObject({ layer: 'combat', key: 'c:' + song, track: OST[song], reason: 'Fight' });
    expect(OST[song].artist).toBe('Project Heaven Cry OST');
    expect(trackKey(musicFor(r.g).track)).toBe('ost:' + song);
  });
  it('a seen elite plays Heaven Falls; half the party Downed plays Last Rounds', () => {
    const r = room();
    r.act(brawl([{ name: 'Captain', tier: 'elite', weapon: 'service_pistol' }]));
    r.g.combat!.sighted = r.g.combat!.units.filter((u) => u.side === 'foe').map((u) => u.id); // the party has seen it
    expect(musicFor(r.g).track!.title).toBe('Heaven Falls');
    r.g.combat!.units.find((u) => u.side === 'pc')!.downed = true;
    expect(musicFor(r.g)).toMatchObject({ layer: 'combat', track: { title: 'Last Rounds' }, reason: 'Last rounds: half the party is down' });
  });
  it('the engine keeps what the party has seen, the same for every player; an unseen elite plays the fight\'s song', () => {
    const r = room();
    r.act(brawl([{ name: 'Captain', tier: 'elite', weapon: 'service_pistol' }]));
    const cb = r.g.combat!, cap = cb.units.find((u) => u.side === 'foe')!;
    // After every action the engine notes the hostiles the party sees now; the list only grows.
    expect(cb.sighted).toEqual([...visibility(cb, 'pc').seen]);
    const fogged: GameState = JSON.parse(JSON.stringify(r.g)); fogged.combat!.sighted = [];
    expect(musicFor(fogged)).toMatchObject({ layer: 'combat', track: OST[cb.song!], reason: 'Fight' });
    expect(FIGHT_POOL).toContain(cb.song);
    fogged.combat!.sighted = [cap.id];
    expect(musicFor(fogged)).toMatchObject({ layer: 'combat', track: { title: 'Heaven Falls' }, reason: 'Fight: an elite' });
    noteSighted(fogged.combat!); expect(fogged.combat!.sighted).toContain(cap.id);
    // Every player's view reads the same.
    const host = viewFor(fogged, 'host'), guest = viewFor(fogged, 'p2');
    expect(musicFor(host)).toEqual(musicFor(guest));
  });
  it('a player\'s spotlight song wins over all of it', () => {
    const r = room();
    r.act(brawl([{ name: 'Captain', tier: 'boss', weapon: 'service_pistol' }]));
    r.g.combat!.units.find((u) => u.side === 'pc')!.downed = true;
    const mpat = Object.values(r.g.characters).find((c) => c.name === 'MPAT')!;
    expect(startSong(r.g, mpat, 'took down a boss', 'spotlight', () => {})).toBe(true);
    expect(musicFor(r.g)).toMatchObject({ layer: 'spotlight', charId: mpat.id, track: { title: 'My Song' } });
  });
  it('a campaign\'s theme for a named encounter keeps its fight, until Last Rounds', () => {
    const r = room();
    const camp = r.g.campaign!;
    camp.encounters = [...(camp.encounters || []), { name: 'The ramp', zone: camp.zones[0].id, when: '', difficulty: 'hard', music: { yt: 'ccccccccccc', title: 'Red', artist: 'Someone' }, enemies: [] }];
    r.act(brawl([{ name: 'Engineer', tier: 'minion', weapon: 'service_pistol' }], 'The ramp'));
    expect(musicFor(r.g)).toMatchObject({ layer: 'encounter', track: { title: 'Red' } });
    for (const u of r.g.combat!.units) if (u.side === 'pc') u.downed = true;
    expect(musicFor(r.g).track!.title).toBe('Last Rounds');
  });
  it('the Proving Ground plays the OST', () => {
    let g: GameState = newGame('PROVE2', { id: 'host', name: 'Host' }, 'seed-proving');
    g = apply(g, { type: 'char/add', sheet: sheetFrom('sharpshooter', 'Vel') }, 'host');
    g = apply(g, { type: 'sandbox/start' }, 'host');
    // Gearing up (the story phase on the Proving Ground map) plays Gearing Up; a wave on plays the fight music.
    if (g.phase !== 'combat') { expect(musicFor(g)).toMatchObject({ layer: 'ambient', track: OST.gearing_up }); g = JSON.parse(JSON.stringify(g)); g.phase = 'combat'; }
    if (!g.combat) return;
    expect(musicFor(g)).toMatchObject({ layer: 'combat', track: { artist: 'Project Heaven Cry OST' } });
  });
});

/** A Proving Ground with one character and the drill units switched off, driven through apply(). */
const ground = (seed: string, code = 'POOL1') => {
  let g: GameState = newGame(code, { id: 'host', name: 'Host' }, seed);
  const act = (a: any) => { g = apply(g, a, 'host'); };
  act({ type: 'char/add', sheet: sheetFrom('sharpshooter', 'Vel') });
  act({ type: 'sandbox/start' });
  act({ type: 'sandbox/ai', on: false });
  /** One ordinary fight (wave 1 again each time): begun, its song read, stopped. */
  const fightOnce = () => { act({ type: 'sandbox/fight' }); const song = g.combat!.song!; const th = musicFor(g); act({ type: 'sandbox/stop' }); return { song, th }; };
  return { get g() { return g; }, set g(x: GameState) { g = x; }, act, fightOnce };
};

describe('the fight\'s song: one of the pool, picked per fight (spec: Music, The fight\'s song)', () => {
  it('the pool is Gunline and the eight new songs, each with its title; Heaven Falls, Last Rounds and Gearing Up are not in it', () => {
    expect([...FIGHT_POOL].sort()).toEqual(['brass_on_the_floor', 'danger_close', 'flank_left', 'gunline', 'held_breath', 'hold_the_line', 'line_of_four', 'mag_check', 'suppressing_fire']);
    expect(FIGHT_POOL.map((id) => OST[id].title).sort()).toEqual(['Brass on the Floor', 'Danger Close', 'Flank Left', 'Gunline', 'Held Breath', 'Hold the Line', 'Line of Four', 'Mag Check', 'Suppressing Fire']);
    for (const id of Object.keys(OST) as (keyof typeof OST)[]) { expect(OST[id].ost).toBe(id); expect(OST[id].artist).toBe('Project Heaven Cry OST'); expect(OST[id].length).toBeGreaterThan(30); }
    expect(OST.gearing_up.title).toBe('Gearing Up'); expect(GEARING_UP).toBe('gearing_up');
  });
  it('every fight plays a song of the pool, never the one the fight before had, and over many fights uses them all', () => {
    const p = ground('pool-seed');
    const songs: string[] = [];
    for (let i = 0; i < 60; i++) {
      const { song, th } = p.fightOnce();
      expect(FIGHT_POOL).toContain(song);
      expect(th).toMatchObject({ layer: 'combat', key: 'c:' + song, track: { ost: song, title: OST[song as keyof typeof OST].title }, reason: 'Fight' });
      if (songs.length) expect(song).not.toBe(songs[songs.length - 1]);
      songs.push(song);
    }
    expect(new Set(songs).size).toBe(FIGHT_POOL.length);
  });
  it('the same seed and actions give the same songs; another seed gives another run', () => {
    const run = (seed: string) => { const p = ground(seed); return Array.from({ length: 12 }, () => p.fightOnce().song); };
    expect(run('seed-a')).toEqual(run('seed-a'));
    expect(run('seed-a')).not.toEqual(run('seed-b'));
  });
  it('the pick rolls no dice: the game\'s rolls are what they were without it', () => {
    const p = ground('dice-seed');
    p.act({ type: 'sandbox/fight' });
    const after = p.g.rng.state, picks = p.g.music!.picks;
    const q: GameState = JSON.parse(JSON.stringify(p.g)); delete q.combat!.song;
    noteFightSong(q);
    expect(q.rng.state).toBe(after); expect(q.music!.picks).toBe(picks! + 1); expect(FIGHT_POOL).toContain(q.combat!.song);
  });
  it('the song holds for the whole fight: through actions, a reconnect (the saved state), every player\'s view, and Heaven Falls or Last Rounds handing back', () => {
    const r = room();
    r.act(brawl([{ name: 'E', tier: 'minion', weapon: 'service_pistol' }, { name: 'F', tier: 'minion', weapon: 'service_pistol' }]));
    const song = r.g.combat!.song!, key = musicFor(r.g).key;
    expect(key).toBe('c:' + song);
    // The view re-renders: musicFor is a pure read.
    for (let i = 0; i < 5; i++) expect(musicFor(r.g).key).toBe(key);
    // Turns go by.
    for (let i = 0; i < 6 && r.g.combat && !r.g.combat.over; i++) {
      const cb = r.g.combat!, cur = cb.units.find((u) => u.id === cb.order[cb.turn])!;
      if (cur.side !== 'pc') break;
      r.act({ type: 'combat/end-turn', unitId: cur.id }, r.g.characters[cur.charId!].owner);
      if (r.g.combat && !r.g.combat.over) { expect(r.g.combat.song).toBe(song); if (musicFor(r.g).track?.ost !== 'last_rounds') expect(musicFor(r.g).key).toBe(key); }
    }
    // A reconnect is the state sent again; a guest's view carries the same song.
    const back: GameState = JSON.parse(JSON.stringify(r.g));
    expect(back.combat!.song).toBe(song);
    expect(viewFor(back, 'p2').combat!.song).toBe(song);
    expect(musicFor(viewFor(back, 'host'))).toEqual(musicFor(viewFor(back, 'p2')));
    // Last Rounds takes over while half the party is down, and hands back to the same song.
    const pcs = back.combat!.units.filter((u) => u.side === 'pc'); for (const u of pcs) { u.downed = false; u.dead = false; }
    pcs[0].downed = true;
    expect(musicFor(back).track!.ost).toBe('last_rounds');
    pcs[0].downed = false;
    expect(musicFor(back).key).toBe(key);
    // So does Heaven Falls in the one case it lets go (an encounter never does: it holds once an elite is seen).
    noteFightSong(back); expect(back.combat!.song).toBe(song);
  });
  it('Heaven Falls and Last Rounds keep their rules; a fight that begins on Heaven Falls is not "the last fight\'s song"', () => {
    const p = ground('boss-seed');
    const a = p.fightOnce().song;
    expect(p.g.music!.lastSong).toBe(a);
    // A boss on the field: Heaven Falls from the start (the party sees it), whatever the fight's own song is.
    p.act({ type: 'sandbox/clear' });
    let placed = false;
    for (const at of ['M6', 'L6', 'N6', 'M8', 'L8', 'K6']) { try { p.act({ type: 'sandbox/spawn', tier: 'boss', weapon: 'drifter_revolver', at }); placed = true; break; } catch { /* next tile */ } }
    expect(placed).toBe(true);
    p.act({ type: 'sandbox/fight' });
    const cb = p.g.combat!;
    cb.sighted = cb.units.filter((u) => u.side === 'foe').map((u) => u.id);
    expect(FIGHT_POOL).toContain(cb.song);
    expect(musicFor(p.g).track!.ost).toBe('heaven_falls');
    cb.units.filter((u) => u.side === 'pc').forEach((u) => { u.downed = true; });
    expect(musicFor(p.g).track!.ost).toBe('last_rounds');
  });
  it('a Hard fight plays Heaven Falls and leaves the last ordinary song as it was', () => {
    const r = room();
    r.g.music = { seq: 0, now: null, fight: 0, used: {}, silent: {}, lastSong: 'flank_left', picks: 3 };
    r.act(brawl([{ name: 'E', tier: 'minion', weapon: 'service_pistol' }], 'Hard one', 'hard'));
    expect(musicFor(r.g)).toMatchObject({ layer: 'combat', track: { ost: 'heaven_falls' }, reason: 'Fight: a hard one' });
    expect(FIGHT_POOL).toContain(r.g.combat!.song); expect(r.g.combat!.song).not.toBe('flank_left');
    expect(r.g.music!.lastSong).toBe('flank_left'); expect(r.g.music!.picks).toBe(4);
  });
  it('a fight saved before the pool (no song) keeps Gunline: picked once on the next action, and it counts as the last song', () => {
    const r = room();
    r.act(brawl([{ name: 'E', tier: 'minion', weapon: 'service_pistol' }, { name: 'F', tier: 'minion', weapon: 'service_pistol' }]));
    const old: GameState = JSON.parse(JSON.stringify(r.g));
    delete old.combat!.song; delete old.music!.lastSong; delete old.music!.picks;
    expect(musicFor(old)).toMatchObject({ layer: 'combat', key: 'c:gunline', track: OST.gunline });
    const cb = old.combat!, cur = cb.units.find((u) => u.id === cb.order[cb.turn])!;
    const next = apply(old, { type: 'combat/end-turn', unitId: cur.id }, cur.charId ? old.characters[cur.charId].owner : 'host');
    expect(next.combat!.song).toBe('gunline'); expect(next.music!.lastSong).toBe('gunline'); expect(next.music!.picks).toBeUndefined();
    expect(musicFor(next).key).toBe('c:gunline');
  });
});

describe('the Proving Ground plays Gearing Up while gearing up (spec: Music, The Proving Ground)', () => {
  it('before the first fight, between fights and after one: Gearing Up; a fight plays its song and hands back', () => {
    const p = ground('gear-seed');
    const gearing = { key: 'pg:gearing_up', layer: 'ambient', track: OST.gearing_up, reason: 'Proving Ground: gearing up' };
    expect(p.g.phase).toBe('story'); expect(p.g.sandbox!.state).toBe('ready');
    expect(musicFor(p.g)).toEqual(gearing);
    expect(trackKey(musicFor(p.g).track)).toBe('ost:gearing_up');
    p.act({ type: 'sandbox/fight' });
    expect(musicFor(p.g)).toMatchObject({ layer: 'combat', track: { ost: p.g.combat!.song } });
    p.act({ type: 'sandbox/stop' });
    expect(musicFor(p.g)).toEqual(gearing);
    // A fight that ran to its end stays on the screen (the wave card) while the squad gears up again: Gearing Up.
    p.act({ type: 'sandbox/fight' });
    const done: GameState = JSON.parse(JSON.stringify(p.g)); done.phase = 'story'; done.combat!.over = 'win'; done.sandbox!.state = 'cleared';
    expect(musicFor(done)).toEqual(gearing);
  });
  it('standalone and in a room alike, the same for every player; outside the Proving Ground the area\'s music plays', () => {
    let g: GameState = newGame('PGSOLO', { id: 'host', name: 'Host' }, 'solo-seed');
    g = apply(g, { type: 'sandbox/start', standalone: true, archetype: 'sharpshooter' } as any, 'host');
    expect(g.sandbox?.standalone).toBe(true);
    expect(musicFor(g).track).toEqual(OST.gearing_up);
    let m: GameState = newGame('PGROOM', { id: 'host', name: 'Host' }, 'room-seed');
    m = apply(m, { type: 'player/join', id: 'p2', name: 'Friend' }, 'host');
    m = apply(m, { type: 'char/add', sheet: sheetFrom('sharpshooter', 'Vel') }, 'host');
    m = apply(m, { type: 'char/add', sheet: sheetFrom('field_medic', 'Seven') }, 'p2');
    m = apply(m, { type: 'sandbox/start' }, 'host');
    expect(musicFor(viewFor(m, 'host')).track).toEqual(OST.gearing_up);
    expect(musicFor(viewFor(m, 'p2'))).toEqual(musicFor(viewFor(m, 'host')));
    const r = room();
    expect(musicFor(r.g).track?.ost).toBeUndefined();
  });
  it('a spotlight song still plays over it', () => {
    const p = ground('gear-song');
    const c = Object.values(p.g.characters)[0]; c.identity = { song: 'https://youtu.be/aaaaaaaaaaa', songTitle: 'My Song', songArtist: 'Me' };
    expect(startSong(p.g, c, 'did something', 'spotlight', () => {})).toBe(true);
    expect(musicFor(p.g)).toMatchObject({ layer: 'spotlight', track: { title: 'My Song' } });
  });
});
