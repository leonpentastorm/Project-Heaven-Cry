// What each player's view of a fight holds (engine review 4, finding 4: fog of war in the engine; fog.ts). Pinned first
// on the code before the change (commit 04ea1b3, "Fog pins"): then every guest, and the host, received every unseen
// hostile's id, name, tile and HP, the other side's glyphs, field and False Images out of sight, and fx that named and
// located the unseen; the browser hid them. Now the view holds only what the viewer's side sees.
import { describe, expect, it } from 'vitest';
import { viewFor, emitFx, visibility, fightSight, isUnseenId, active, UNSEEN, musicFor, say, sayAt, unsay, fogFight, type Unit } from '../src';
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
  cb.log.length = 0; delete cb.logSee; // and its log lines: the scene's log opens with the initiative line, as a fight's does
  say(cb, 'Initiative: ' + cb.order.map((id) => cb.units.find((u) => u.id === id)!.name).join(' · '));
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
  say(cb, far.name + ' moves to ' + 'M6' + ' (1 tile).');
  emitFx(cb, 'shot', { unit: far.id, from: far.pos, to: c.pos, target: c.id, weapon: 'service_pistol' });
  c.hp -= 5;
  say(cb, far.name + ' shoots ' + c.name + ' from M6: 5 damage.');
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
    // (the log too: each line carries who saw what it names, say(); below)
    const s = fogScene(), v = viewFor(s.f.g, GUEST), all = js({ ...v, combat: { ...v.combat, images: [] } }); // (and the decoy, which wears Farzul's face on purpose: below)
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
    for (const u of secret(s)) { expect(js(hv)).not.toContain('"' + u.id + '"'); expect(js({ ...hv, images: [] })).not.toContain(u.name); } // (the decoy wears Farzul's face on purpose)
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
});

// Item 1600 (a): the fight log. Each line is written by say() (combat.ts), which records, per side, whether that side saw
// the units it names when it was written (cb.logSee); fogFight sends a side only what it saw.
describe('the log: a player reads only the lines about what their side saw', () => {
  it('a hostile\'s line its viewer never saw is not sent; a line about the viewer\'s own unit names the unseen as "something unseen"', () => {
    const s = fogScene(), log = viewFor(s.f.g, GUEST).combat!.log;
    expect(log.join('\n')).not.toContain('Farzul'); expect(log.join('\n')).not.toContain('M6');
    expect(log.some((l) => / moves to /.test(l) && /Farzul|unseen/i.test(l))).toBe(false); // the walk in the fog: gone
    expect(log).toContain('Something unseen shoots Cy from somewhere unseen: 5 damage.');
    expect(log.length).toBe(s.cb.log.length - 1);
    expect(log[0]).toMatch(/^Initiative: .*something unseen/); expect(log[0]).toContain('Qorsa'); // the opening names the unseen as unseen
  });
  it('a real fight\'s opening: a hostile set up Hidden is unseen in the initiative line', () => {
    const s = fogScene(), raw = s.cb.log[0];
    expect(raw).toContain('Lurkzil'); expect(viewFor(s.f.g, GUEST).combat!.log[0]).not.toContain('Lurkzil');
  });
  it('the same lines are there, whole, for the side that saw them, and for the human Narrator; the host\'s truth keeps them', () => {
    const s = fogScene();
    const foe = fogFight(s.f.g, s.cb, s.cb, 'foe');
    expect(foe.log).toEqual(s.cb.log.filter(() => true).map((l) => l)); // the hostiles see Farzul; Cy is in their sight
    expect(s.cb.log).toContain('Farzul moves to M6 (1 tile).');
    s.f.g.settings.mode = 'human';
    expect(viewFor(s.f.g, H).combat!.log).toEqual(s.cb.log);
    expect((viewFor(s.f.g, H).combat as any).logSee).toBeUndefined();
  });
  it('sight is the sight when the line was written: a hostile that steps into sight later does not bring its old lines', () => {
    const s = fogScene(); s.far.pos = '3,4';
    const log = viewFor(s.f.g, GUEST).combat!.log;
    expect(log).not.toContain('Farzul moves to M6 (1 tile).');
    say(s.cb, 'Farzul steps out of the fog.');
    expect(viewFor(s.f.g, GUEST).combat!.log).toContain('Farzul steps out of the fog.');
  });
  it('an fx\'s L counts the lines the viewer is sent', () => {
    const s = fogScene(), v = viewFor(s.f.g, GUEST).combat!;
    const hurt = (v.fx || []).filter((e) => e.k === 'hurt').pop()!, real = (s.cb.fx || []).filter((e) => e.k === 'hurt').pop()!;
    expect(real.L).toBe(s.cb.log.length); expect(hurt.L).toBe(v.log.length);
  });
  it('a line that names nobody, or only the seen, reaches everyone', () => {
    const s = fogScene();
    say(s.cb, 'The wind turns.', s.seen.name + ' snarls at ' + s.a.name + '.');
    const log = viewFor(s.f.g, GUEST).combat!.log;
    expect(log.slice(-2)).toEqual(['The wind turns.', 'Qorsa snarls at Ada.']);
  });
  it('an old save (plain lines, no marks) loads, and every line is sent as it is', () => {
    const s = fogScene(); delete (s.cb as any).logSee;
    const saved = JSON.parse(JSON.stringify(s.f.g));
    s.cb.log.length = 0; s.cb.log.push(...saved.combat.log);
    expect(viewFor(saved, GUEST).combat!.log).toEqual(saved.combat.log);
  });
  it('sayAt and unsay keep each line\'s mark beside it', () => {
    const s = fogScene();
    sayAt(s.cb, 0, 'WAVE 2');
    expect(viewFor(s.f.g, GUEST).combat!.log[0]).toBe('WAVE 2');
    expect(viewFor(s.f.g, GUEST).combat!.log.join('\n')).not.toContain('Farzul');
    const at = s.cb.log.indexOf('Farzul moves to M6 (1 tile).'); unsay(s.cb, at);
    expect(viewFor(s.f.g, GUEST).combat!.log).toContain('Something unseen shoots Cy from somewhere unseen: 5 damage.');
    expect(s.cb.logSee!.length).toBeLessThanOrEqual(s.cb.log.length);
  });
});
