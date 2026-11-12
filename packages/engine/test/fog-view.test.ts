// What each player's view of a fight holds (engine review 4, finding 4: fog of war in the engine; fog.ts). Pinned first
// on the code before the change (commit 04ea1b3, "Fog pins"): then every guest, and the host, received every unseen
// hostile's id, name, tile and HP, the other side's glyphs, field and False Images out of sight, and fx that named and
// located the unseen; the browser hid them. Now the view holds only what the viewer's side sees.
import { describe, expect, it } from 'vitest';
import { viewFor, emitFx, visibility, fightSight, isUnseenId, active, UNSEEN, musicFor, type Unit } from '../src';
import { fightWith } from './helpers/perkfight';

const H = 'host', GUEST = 'p2';
/**
 * A fight on the 16 × 11 yard with three player characters (two the host's, one the guest's) and five hostiles:
 *   Seen     at E6, in sight;
 *   Lurker   at E7, Hidden (in range and line of sight, not seen; nobody's Sensory reaches it);
 *   Creeper  at D1, sensed, not seen (the first character's Sensory reaches it, nobody's eyes do);
 *   Far      at M6, out of everyone's sight;
 *   Body     at M8, dead (a body is no secret).
 * The players' eyes are cut short (Vision 1 or 2) so the yard has a fog. The far side has a glyph, a field and a False
 * Image out of sight, and a glyph and a False Image in sight; Far has walked (in the fog) and shot the guest's
 * character from the fog, with a log line that names it and its tile.
 */
export function fogScene() {
  const f = fightWith([{ name: 'Ada' }, { name: 'Bo' }, { name: 'Cy' }], [{ name: 'Qorsa' }, { name: 'Lurkzil' }, { name: 'Crepzan' }, { name: 'Farzul' }, { name: 'Bodvar' }], { classic: true });
  const [a, b, c] = f.pcs, [seen, lurker, creeper, far, body] = f.foes;
  f.turn(a);
  a.pos = '1,2'; b.pos = '1,6'; c.pos = '2,5';
  a.vision = 1; a.sensory = 6; b.vision = 2; c.vision = 2; b.sensory = 0; c.sensory = 0;
  seen.pos = '4,5'; lurker.pos = '4,6'; lurker.hidden = true; creeper.pos = '3,0'; far.pos = '12,5'; body.pos = '12,7'; body.dead = true; body.hp = 0;
  const cb = f.cb;
  cb.fx = []; // the opening's effects were seen with the old eyes: the scene's own start here
  cb.glyphs = [
    { id: 'gFar', word: 'FIRE', pos: '12,4', by: far.id, side: 'foe', left: 3, who: far.name },
    { id: 'gNear', word: 'MEND', pos: '4,4', by: seen.id, side: 'foe', left: 3, who: seen.name },
  ] as any;
  cb.zones = [...(cb.zones || []), { id: 'zFar', kind: 'field', tiles: ['13,5'], words: ['FIRE'], by: far.id, side: 'foe', left: 3, mult: 1, who: far.name }] as any;
  cb.images = [
    { id: 'imgFar', owner: far.id, pos: '13,6', side: 'foe', round: cb.round, fooled: [] },
    { id: 'imgNear', owner: far.id, pos: '3,5', side: 'foe', round: cb.round, fooled: [] },
  ];
  // Qorsa walked into sight from the fog (unseen at G6 and F6, seen at E6)
  emitFx(cb, 'move', { unit: seen.id, from: '6,5', to: '4,5', path: ['6,5', '5,5', '4,5'], how: 'move', sight: { pc: '001', foe: '111' } });
  // Far's walk, wholly in the fog, then its shot from the fog at Cy (the HP it takes is stamped on the next effect)
  emitFx(cb, 'move', { unit: far.id, from: '13,5', to: '12,5', path: ['13,5', '12,5'], how: 'move', sight: { pc: '00', foe: '11' } });
  cb.log.push(far.name + ' moves to ' + 'M6' + ' (1 tile).');
  emitFx(cb, 'shot', { unit: far.id, from: far.pos, to: c.pos, target: c.id, weapon: 'service_pistol' });
  c.hp -= 5;
  cb.log.push(far.name + ' shoots ' + c.name + ' from M6: 5 damage.');
  emitFx(cb, 'hurt', { target: c.id, at: c.pos, n: 5 });
  return { f, cb, a, b, c, seen, lurker, creeper, far, body };
}
const units = (v: any) => (v.combat.units as Unit[]).map((u) => u.name);

describe('the scene is what it says (the sight rules, not the view)', () => {
  it('Seen is seen; Lurker, Creeper and Far are not; Creeper is sensed', () => {
    const s = fogScene(), v = visibility(s.cb, 'pc');
    expect(v.seen.has(s.seen.id)).toBe(true);
    for (const u of [s.lurker, s.creeper, s.far]) expect(v.seen.has(u.id)).toBe(false);
    expect([...v.sensed]).toEqual([s.creeper.id]);
    expect(v.tiles.has('12,4')).toBe(false); expect(v.tiles.has('4,4')).toBe(true); expect(v.tiles.has('3,5')).toBe(true);
  });
});

const js = (x: unknown) => JSON.stringify(x);
const secret = (s: ReturnType<typeof fogScene>) => [s.lurker, s.creeper, s.far];

describe('a player\'s view holds only what that side sees', () => {
  it('a guest\'s serialised view never holds an unseen hostile\'s id, name, tile or HP; the seen, the dead and the own side stay', () => {
    // (the log is the known gap below: its lines are strings that name whom they like)
    const s = fogScene(), v = viewFor(s.f.g, GUEST), all = js({ ...v, combat: { ...v.combat, log: [], images: [] } }); // (and the decoy, which wears Farzul's face on purpose: below)
    expect(units(v).sort()).toEqual(['Ada', 'Bo', 'Bodvar', 'Cy', 'Qorsa']);
    for (const u of secret(s)) { expect(all).not.toContain('"' + u.id + '"'); expect(all).not.toContain(u.name); }
    // Lurkzil's tile is in sight (it is Hidden there) and Crepzan's is sensed: both are in cb.fog, as tiles
    for (const k of ['12,5', '12,4', '13,5', '13,6']) expect(js({ ...v.combat, map: null })).not.toContain('"' + k + '"'); // (the yard's own lists name 13,6: a start tile)
    expect(all).not.toContain('Hidden'); // nobody's Hidden condition rides along for an absent unit
  });
  it('the host with an AI Narrator is a player: the same fight as the guest', () => {
    const s = fogScene();
    expect(units(viewFor(s.f.g, H)).sort()).toEqual(units(viewFor(s.f.g, GUEST)).sort());
    const hv = viewFor(s.f.g, H).combat!;
    for (const u of secret(s)) expect(js({ ...hv, log: [] })).not.toContain('"' + u.id + '"');
  });
  it('the human Narrator (the host in "I\'ll narrate") keeps the whole fight, with the players\' sight for shading', () => {
    const s = fogScene(); s.f.g.settings.mode = 'human';
    const v = viewFor(s.f.g, H).combat!;
    expect(v.units.map((u) => u.name)).toEqual(expect.arrayContaining(['Qorsa', 'Lurkzil', 'Crepzan', 'Farzul', 'Bodvar']));
    expect(v.fog!.full).toBe(true); expect(v.fog!.tiles).toContain('4,5'); expect(v.fog!.tiles).not.toContain('12,5');
    expect((v.glyphs || []).map((x) => x.id)).toEqual(['gFar', 'gNear']);
    expect(viewFor(s.f.g, GUEST).combat!.units.map((u) => u.name)).not.toContain('Farzul'); // the guest still doesn't
  });
  it('a sensed hostile is a tile and nothing else; the screen\'s sight comes from the view', () => {
    const s = fogScene(), cb = viewFor(s.f.g, GUEST).combat!, sight = fightSight(cb);
    expect(cb.fog!.sensed).toEqual(['3,0']); expect(sight.sensed.has('3,0')).toBe(true); expect(sight.full).toBe(false);
    expect(sight.tiles.has('4,5')).toBe(true); expect(sight.tiles.has('12,5')).toBe(false);
  });
  it('the turn order keeps each unseen hostile\'s place as an opaque mark; its turn is no unit', () => {
    const s = fogScene(), cb = viewFor(s.f.g, GUEST).combat!;
    expect(cb.order.length).toBe(s.cb.order.length);
    expect(cb.order.filter(isUnseenId).length).toBe(3);
    s.cb.turn = s.cb.order.indexOf(s.far.id);
    expect(active(viewFor(s.f.g, GUEST).combat!)).toBeUndefined();
  });
  it('the other side\'s glyph, field and False Image show only where the side sees; an image of an unseen owner wears its look, not its id', () => {
    const s = fogScene(), v = viewFor(s.f.g, GUEST).combat!;
    expect((v.glyphs || []).map((x) => x.id)).toEqual(['gNear']);
    expect((v.zones || []).map((z) => z.id)).not.toContain('zFar');
    const imgs = v.images || []; expect(imgs.map((i) => i.id)).toEqual(['imgNear']);
    expect(imgs[0].owner).toBe(UNSEEN); expect((imgs[0] as any).look.name).toBe('Farzul'); // the decoy wears its owner's face
  });
  it('fx: a walk into sight is cut at the fog edge; a walk never seen is gone; a shot from the fog has no shooter and no tile', () => {
    const s = fogScene(), fx = viewFor(s.f.g, GUEST).combat!.fx || [];
    const walk = fx.find((e) => e.k === 'move' && e.unit === s.seen.id)!;
    expect(walk.path).toEqual(['5,5', '4,5']); expect(walk.sight).toEqual({ pc: '01' }); expect(walk.from).toBe('5,5');
    expect(fx.some((e) => e.k === 'move' && e.unit === s.far.id)).toBe(false);
    const shot = fx.filter((e) => e.k === 'shot').pop()!;
    expect(shot.unit).toBe(UNSEEN); expect(shot.from).toBeNull(); expect(shot.to).toBe(s.c.pos); expect(shot.target).toBe(s.c.id);
    expect(Object.keys(shot.hp || {})).toContain(s.c.id); // the guest's own character's wound still plays
  });
  it('it appears the moment it is seen', () => {
    const s = fogScene(); s.far.pos = '3,4';
    const v = viewFor(s.f.g, GUEST).combat!, far = v.units.find((u) => u.id === s.far.id)!;
    expect(far.name).toBe('Farzul'); expect(far.pos).toBe('3,4'); expect(far.hp).toBe(s.far.hp);
    expect(v.order).toContain(s.far.id);
  });
  it('the view never writes on the host\'s fight', () => {
    const s = fogScene(), before = js(s.f.g);
    viewFor(s.f.g, GUEST); viewFor(s.f.g, H);
    expect(js(s.f.g)).toBe(before);
  });
  it('the music is the whole fight\'s (an unseen hostile picks nothing it wouldn\'t have)', () => {
    const s = fogScene();
    expect(musicFor(viewFor(s.f.g, GUEST))).toEqual(musicFor(s.f.g));
  });
  // KNOWN GAP (docs/design/handoffs/client-boundary-2-fog.md, item 1600 a): log lines are strings with no record of whom
  // 12 Nov 2026: they name; it waits for a per-line mark in the state (and the replays re-recorded on purpose).
  it.todo('the log withholds the lines of a hostile\'s turn its viewer\'s side never saw (needs a per-line mark in the state)');
});
