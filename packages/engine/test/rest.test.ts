// Rest (spec: Rest) from the buttons: the host's rest, a player's request, the Proving Ground's rest while gearing up,
// and once-per-rest uses (Storm Hand's Gauntlet Infusion) coming back after one.
import { describe, expect, it } from 'vitest';
import './helpers/yard16'; // the 16 × 11 practice square these tests name tiles on
import { apply, newGame, perkActionsFor, bindGame, RuleError, ARCHETYPES, REST_INFO, type Action, type GameState, type Sheet } from '../src';
import { storyWith } from './helpers/perkfight';
import { useRevision2Classes, SIG } from './helpers/legacy';
useRevision2Classes(); // Revision 2 classes and advanced classes for this file's handler tests (Class Roster Rev 3)

const INFUSE = 'class:storm_hand.gauntlet_infusion';
const refused = (fn: () => unknown) => { try { fn(); } catch (e) { expect(e).toBeInstanceOf(RuleError); return (e as Error).message; } throw new Error('expected a refusal'); };
const infuseEntry = (g: GameState, charId: string, scope: 'story' | 'world' = 'story') => {
  const was = bindGame(g); try { return perkActionsFor({ c: g.characters[charId], g }, scope).find((e) => e.id === INFUSE && e.actionId === 'infuse')!; } finally { bindGame(was); }
};

describe('rest in the story', () => {
  it('Gauntlet Infusion: used → refused until the next rest → a long rest → available again', () => {
    const s = storyWith([{ advancedClass: 'storm_hand' } as any]); const c = s.chars[0];
    const e0 = infuseEntry(s.g, c.id);
    expect(e0.why).toBeNull(); expect(e0.uses.left).toBe(1); expect(e0.options!.map((o) => o.id)).toEqual(['fire', 'freeze', 'shock', 'spark']);
    s.act({ type: 'story/perk', charId: c.id, id: INFUSE, actionId: 'infuse', choice: 'shock' } as Action);
    expect(s.g.characters[c.id].state![INFUSE].element).toBe('shock');
    expect(infuseEntry(s.g, c.id).why).toBe('Used until the next rest.');
    expect(refused(() => s.act({ type: 'story/perk', charId: c.id, id: INFUSE, actionId: 'infuse', choice: 'fire' } as Action))).toBe('Used until the next rest.');
    s.act({ type: 'rest', kind: 'long' });
    const e1 = infuseEntry(s.g, c.id); expect(e1.why).toBeNull(); expect(e1.uses.left).toBe(1);
    s.act({ type: 'story/perk', charId: c.id, id: INFUSE, actionId: 'infuse', choice: 'fire' } as Action);
    expect(s.g.characters[c.id].state![INFUSE].element).toBe('fire');
    // A short rest opens a new window too.
    s.act({ type: 'rest', kind: 'short' });
    expect(infuseEntry(s.g, c.id).why).toBeNull();
  });
  it('only the host calls a rest; a player asks for one (a line the Narrator sees, once a round)', () => {
    const s = storyWith([{}, { owner: 'p2' } as any]); const guest = s.chars.find((c) => c.owner === 'p2')!;
    expect(refused(() => s.act({ type: 'rest', kind: 'long' }, 'p2'))).toMatch(/Only the host calls a rest/);
    s.act({ type: 'story/ask-rest', charId: guest.id, kind: 'long' } as Action, 'p2');
    const last = s.g.story.entries[s.g.story.entries.length - 1];
    expect(last.kind).toBe('player'); expect(last.text).toContain('asks for a long rest'); expect(last.text).toContain('[rest:long]'); expect(last.text).toContain(REST_INFO.long);
    expect(s.g.story.needs).toBe(true);
    expect(refused(() => s.act({ type: 'story/ask-rest', charId: guest.id, kind: 'long' } as Action, 'p2'))).toMatch(/Already asked/);
    // The Narrator grants it with a turn's rest field.
    const before = s.g.restN || 0;
    s.act({ type: 'narrator/turn', turn: { narration: 'You sleep.', rest: { kind: 'long' } } } as any);
    expect(s.g.restN).toBe(before + 1);
  });
  it('no rest in a fight', () => {
    const s = storyWith([{}]);
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'T', map: 'yard16', difficulty: 'standard', enemies: [{ name: 'Foe', tier: 'minion', weapon: 'service_pistol', at: '' }] } } } as any);
    expect(s.g.phase).toBe('combat');
    expect(refused(() => s.act({ type: 'rest', kind: 'short' }))).toMatch(/No resting in a fight/);
  });
});

describe('rest in the Proving Ground', () => {
  const sheet = (): Sheet => { const a = ARCHETYPES.find((x) => x.id === 'sharpshooter')!; return { name: 'Vel', portrait: '', origin: 'x', kit: 'soldier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} }; };
  it('the host rests while gearing up (no Narrator), per-rest uses come back; refused in a fight', () => {
    let g = newGame('PROVE1', { id: 'h1', name: 'Host' }, 'seed-proving');
    g = apply(g, { type: 'player/join', id: 'p2', name: 'Guest' }, 'h1');
    g = apply(g, { type: 'char/add', sheet: sheet() }, 'h1');
    g = apply(g, { type: 'sandbox/start' }, 'h1');
    const c = Object.values(g.characters).find((x) => x.owner === 'h1')!;
    g = apply(g, { type: 'sandbox/class', charId: c.id, classId: 'storm_hand' }, 'h1');
    expect(infuseEntry(g, c.id, 'world').why).toBeNull();
    g = apply(g, { type: 'world/act', charId: c.id, act: 'perk', id: INFUSE, actionId: 'infuse', choice: 'shock' } as Action, 'h1');
    expect(g.characters[c.id].state![INFUSE].element).toBe('shock');
    expect(infuseEntry(g, c.id, 'world').why).toBe('Used until the next rest.');
    expect(refused(() => apply(g, { type: 'rest', kind: 'long' }, 'p2'))).toMatch(/Only the host/);
    g.characters[c.id].hp = 5;
    g = apply(g, { type: 'rest', kind: 'long' }, 'h1');
    expect(g.characters[c.id].hp).toBeGreaterThan(5);
    expect(infuseEntry(g, c.id, 'world').why).toBeNull();
    expect(g.phase).toBe('story');
    g = apply(g, { type: 'sandbox/fight' }, 'h1');
    expect(g.phase).toBe('combat');
    expect(refused(() => apply(g, { type: 'rest', kind: 'short' }, 'h1'))).toMatch(/stop the fight/);
  });
});
