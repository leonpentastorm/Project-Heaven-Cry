// What each player's view of a fight holds (engine review 4, finding 4: fog of war in the engine). PINNED FIRST on the
// code before the change (the "today" block), so the change is a known diff: before it, every guest received every
// unseen hostile's tile, HP and name, and its browser hid them.
import { describe, expect, it } from 'vitest';
import { viewFor, emitFx, visibility, type Unit } from '../src';
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
  const f = fightWith([{ name: 'Ada' }, { name: 'Bo' }, { name: 'Cy' }], [{ name: 'Seen' }, { name: 'Lurker' }, { name: 'Creeper' }, { name: 'Far' }, { name: 'Body' }], { classic: true });
  const [a, b, c] = f.pcs, [seen, lurker, creeper, far, body] = f.foes;
  f.turn(a);
  a.pos = '1,2'; b.pos = '1,6'; c.pos = '2,5';
  a.vision = 1; a.sensory = 6; b.vision = 2; c.vision = 2; b.sensory = 0; c.sensory = 0;
  seen.pos = '4,5'; lurker.pos = '4,6'; lurker.hidden = true; creeper.pos = '3,0'; far.pos = '12,5'; body.pos = '12,7'; body.dead = true; body.hp = 0;
  const cb = f.cb;
  cb.glyphs = [
    { id: 'gFar', word: 'FIRE', pos: '12,4', by: far.id, side: 'foe', left: 3, who: far.name },
    { id: 'gNear', word: 'MEND', pos: '4,4', by: seen.id, side: 'foe', left: 3, who: seen.name },
  ] as any;
  cb.zones = [...(cb.zones || []), { id: 'zFar', kind: 'field', tiles: ['13,5'], words: ['FIRE'], by: far.id, side: 'foe', left: 3, mult: 1, who: far.name }] as any;
  cb.images = [
    { id: 'imgFar', owner: far.id, pos: '13,6', side: 'foe', round: cb.round, fooled: [] },
    { id: 'imgNear', owner: far.id, pos: '3,5', side: 'foe', round: cb.round, fooled: [] },
  ];
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

describe('today (before fog moved into the engine): what each view holds', () => {
  it('a guest\'s view holds every unseen hostile: id, name, tile and HP', () => {
    const s = fogScene(), v = viewFor(s.f.g, GUEST), js = JSON.stringify(v.combat);
    expect(units(v)).toEqual(expect.arrayContaining(['Seen', 'Lurker', 'Creeper', 'Far', 'Body']));
    const far = v.combat!.units.find((u) => u.id === s.far.id)!;
    expect(far.pos).toBe('12,5'); expect(far.hp).toBe(s.far.hp);
    expect(js).toContain('"' + s.far.id + '"');
  });
  it('the host\'s view (AI Narrator) holds the same units', () => {
    const s = fogScene();
    expect(units(viewFor(s.f.g, H))).toEqual(units(viewFor(s.f.g, GUEST)));
  });
  it('the human Narrator (the host in "I\'ll narrate") holds everything', () => {
    const s = fogScene(); s.f.g.settings.mode = 'human';
    expect(units(viewFor(s.f.g, H))).toEqual(expect.arrayContaining(['Seen', 'Lurker', 'Creeper', 'Far', 'Body']));
  });
  it('the other side\'s glyphs, field and False Images ride along out of sight', () => {
    const v = viewFor(fogScene().f.g, GUEST).combat!;
    expect((v.glyphs || []).map((x) => x.id)).toEqual(['gFar', 'gNear']);
    expect((v.zones || []).map((z) => z.id)).toContain('zFar');
    expect((v.images || []).map((i) => i.id)).toEqual(['imgFar', 'imgNear']);
  });
  it('the fx name and locate the unseen walker and shooter; the HP stamp names the guest\'s character', () => {
    const s = fogScene(), fx = viewFor(s.f.g, GUEST).combat!.fx || [];
    const mv = fx.find((e) => e.k === 'move' && e.unit === s.far.id)!;
    expect(mv.path).toEqual(['13,5', '12,5']);
    const shot = fx.filter((e) => e.k === 'shot').pop()!;
    expect(shot.unit).toBe(s.far.id); expect(shot.from).toBe('12,5');
    expect(Object.keys(shot.hp || {})).toContain(s.c.id);
  });
  it('the log names the unseen hostile and its tile', () => {
    const s = fogScene(), log = viewFor(s.f.g, GUEST).combat!.log.join('\n');
    expect(log).toContain('Far moves to M6');
  });
});
