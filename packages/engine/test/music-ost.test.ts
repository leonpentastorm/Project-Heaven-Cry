// The game's own fight music (spec: Music): which of Gunline, Heaven Falls and Last Rounds plays, and what still wins
// over them (a player's spotlight or pinned song; a campaign's theme for a named encounter).
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, OST, fightTheme, musicFor, startSong, trackKey, newGame, apply, type Sheet, type GameState, type Unit } from '../src';

const unit = (id: string, side: 'pc' | 'foe', x: Partial<Unit> = {}) => ({ id, side, tier: side === 'foe' ? 'soldier' : undefined, downed: false, dead: false, ...x }) as Unit;
const fight = (units: Unit[], difficulty = 'standard') => ({ units, difficulty });

describe('fightTheme: the fight track', () => {
  it('a normal fight plays Gunline', () => {
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
    expect(musicFor(r.g)).toMatchObject({ layer: 'combat', key: 'c:gunline', track: OST.gunline });
    expect(OST.gunline.artist).toBe('Project Heaven Cry OST');
    expect(trackKey(musicFor(r.g).track)).toBe('ost:gunline');
  });
  it('an elite plays Heaven Falls; half the party Downed plays Last Rounds', () => {
    const r = room();
    r.act(brawl([{ name: 'Captain', tier: 'elite', weapon: 'service_pistol' }]));
    expect(musicFor(r.g).track!.title).toBe('Heaven Falls');
    r.g.combat!.units.find((u) => u.side === 'pc')!.downed = true;
    expect(musicFor(r.g)).toMatchObject({ layer: 'combat', track: { title: 'Last Rounds' }, reason: 'Last rounds: half the party is down' });
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
    // Gearing up (the story phase on the Proving Ground map) is quiet; a wave on plays the fight music.
    if (g.phase !== 'combat') { expect(musicFor(g)).toMatchObject({ layer: 'ambient', track: null }); g = JSON.parse(JSON.stringify(g)); g.phase = 'combat'; }
    if (!g.combat) return;
    expect(musicFor(g)).toMatchObject({ layer: 'combat', track: { artist: 'Project Heaven Cry OST' } });
  });
});
