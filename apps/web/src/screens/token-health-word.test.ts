// @vitest-environment jsdom
// 0.29 wave-2 review MF2: the token's hover card (tokenVals, every map) and the AI Narrator's fight summary (fightAsk)
// read the engine's healthView word; neither keeps a ladder of its own. A real room, a real fight (through apply).
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, apply, newGame, healthView, type GameState } from '@engine';
import { tokenVals } from './shared';

function fight(): GameState {
  let g = newGame('ROOM', { id: 'host', name: 'Leon' }, 'tok-word');
  const a = ARCHETYPES[0];
  g = apply(g, { type: 'char/add', sheet: { name: 'MPAT', portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } } as any, 'host');
  g = apply(g, { type: 'session/start' }, 'host');
  g = apply(g, { type: 'narrator/turn', turn: { narration: 'Guns.', combat: { name: 'Pad', difficulty: 'easy', enemies: [{ name: 'Keel', tier: 'soldier', weapon: 'drifter_revolver' }] } } } as any, 'host');
  return g;
}

describe("the token's hover card says the engine's health word", () => {
  it('an un-Analyzed Soldier at every rung (and down, dead): the card word is healthView\'s', () => {
    const g = fight(), keel: any = g.combat!.units.find((u) => u.name === 'Keel')!;
    keel.maxHp = 140;
    for (const hp of [140, 120, 97, 54, 11]) { keel.hp = hp; expect(tokenVals(keel, {}).state).toBe(healthView(keel).word.toUpperCase()); }
    keel.hp = 84; expect(tokenVals(keel, {}).state).toBe('HURT'); // 60%: the chip's word, never a second ladder's
    keel.hp = 0; keel.downed = true; expect(tokenVals(keel, {}).state).toBe(healthView(keel).word.toUpperCase());
    keel.dead = true; expect(tokenVals(keel, {}).state).toBe(healthView(keel).word.toUpperCase());
  });
});
