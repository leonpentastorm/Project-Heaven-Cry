// Rules 1.84 (items 7200, 7201): the human Narrator's seat sees what the story hides from the players; the players never
// do. Everything goes through the reducer (apply: the Narrator's own narrator/turn, the room's settings) and the view the
// room sends each screen (viewFor).
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { viewFor, narratorSeat, npcsOf, positionsOf, standable, zoneMap, storyObjects, refOf, type GameState } from '../src';
import { storyWith } from './helpers/perkfight';

function freeTiles(g: GameState, n: number): string[] {
  const map = zoneMap(g), taken = new Set([...Object.values(positionsOf(g)), ...npcsOf(g).map((x) => x.pos), ...storyObjects(g).map((o) => o.pos)]), out: string[] = [];
  for (let y = 1; y < map.h - 1 && out.length < n; y++) for (let x = map.w - 2; x > 0 && out.length < n; x--) { const k = x + ',' + y; if (standable(map, k) && !taken.has(k)) out.push(k); }
  return out;
}
/** A room whose one character is a guest's (p1); the host only narrates. The Narrator's turn hides a trap, a lurker, a
 * hazard and a trigger, and writes a voice hook. */
function room(mode: 'human' | 'ai') {
  const s = storyWith([{ owner: 'p1' }]);
  s.act({ type: 'settings', patch: { mode } });
  const [a, b, c, d] = freeTiles(s.g, 4);
  s.act({ type: 'narrator/turn', turn: { narration: 'The yard is quiet.',
    hooks: [{ skill: 'conscience', tn: 12, truth: 'misleading', line: 'Nothing moves behind the crates.' }],
    objects: [{ action: 'place', id: 'wire', kind: 'trap', at: refOf(a), name: 'Trip wire', text: 'A wire at ankle height.', hidden: true, approaches: [] }],
    npcs: [{ action: 'place', name: 'Knife in the dark', side: 'hostile', tier: 'minion', weapon: 'service_pistol', at: refOf(b), hidden: true, wants: 'The squad\'s boots.' }],
    hazards: [{ action: 'place', id: 'gas', kind: 'gas', severity: 'light', tiles: [refOf(c)], hidden: true }],
    triggers: [{ action: 'place', id: 'bell', when: 'enter', tiles: [refOf(d)], then: 'reveal', reveal: ['wire'], text: 'A bell rings.' }] } } as any);
  return s;
}
const secrets = (v: GameState) => ({
  hooks: v.story.scene.hooks.map((h) => h.truth + ' ' + h.tn),
  trap: (v.story.objects || []).some((o) => o.name === 'Trip wire'),
  lurker: (v.story.npcs || []).some((n) => n.name === 'Knife in the dark'),
  hazard: ((v.story as any).hazards || []).some((h: any) => h.hidden),
  trigger: ((v.story as any).triggers || []).length > 0,
});

describe('rules 1.84: the human Narrator\'s private view in the story', () => {
  it('the seat is the host of a narrated room only', () => {
    const s = room('human');
    expect(narratorSeat(s.g, 'host')).toBe(true);
    expect(narratorSeat(s.g, 'p1')).toBe(false);
    s.act({ type: 'settings', patch: { mode: 'ai' } });
    expect(narratorSeat(s.g, 'host')).toBe(false);
  });
  it('the human Narrator sees the hook\'s truth and TN, the hidden trap, the lurker, the hidden hazard and the trigger', () => {
    const s = room('human'), v = viewFor(s.g, 'host');
    expect(secrets(v)).toEqual({ hooks: ['misleading 12'], trap: true, lurker: true, hazard: true, trigger: true });
    expect((v.story.npcs || []).find((n) => n.hidden)?.wants).toBe('The squad\'s boots.');
  });
  it('the guest who plays sees none of it: not even the lurker in the view the room sends', () => {
    const s = room('human'), v = viewFor(s.g, 'p1');
    expect(secrets(v)).toEqual({ hooks: [], trap: false, lurker: false, hazard: false, trigger: false });
    // the skill that has a voice to speak still shows Ask (which skill, never the hook)
    const cid = Object.keys(s.g.characters)[0];
    expect(v.story.scene.voiced![cid]).toEqual(['conscience']);
  });
  it('with the AI Narrator the host is a player like the others: nothing hidden shows', () => {
    const s = room('ai'), v = viewFor(s.g, 'host');
    expect(secrets(v)).toEqual({ hooks: [], trap: false, lurker: false, hazard: false, trigger: false });
  });
});
