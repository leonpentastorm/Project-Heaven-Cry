// A player's unit Downed during its own turn must not freeze the fight (Leon's Proving Ground playtest, 7 Nov 2026):
// it can't act and the screen offers no End turn to a Downed unit, so its turn passes on by itself.
import { describe, it, expect } from 'vitest';
import { ARCHETYPES, type Sheet, type GameState, newGame, apply, active, keyOf } from '../src';

const sheet = (name: string): Sheet => { const a = ARCHETYPES.find((x) => x.id === 'sharpshooter')!; return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'soldier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} }; };

describe('a unit Downed on its own turn', () => {
  it('passes its turn by itself, so the fight goes on', () => {
    let g = newGame('DOWN01', { id: 'h1', name: 'Host' }, 'seed-down');
    g = apply(g, { type: 'player/join', id: 'p2', name: 'Guest' }, 'h1');
    g = apply(g, { type: 'char/add', sheet: sheet('Vel') }, 'h1');
    g = apply(g, { type: 'char/add', sheet: sheet('Kit') }, 'p2');
    g = apply(g, { type: 'sandbox/start' } as any, 'h1');
    g = apply(g, { type: 'sandbox/fight' } as any, 'h1');
    // Walk the turn order to a player's unit that still stands, with another player standing too.
    const x: GameState = JSON.parse(JSON.stringify(g)), cb = x.combat!, u = active(cb)!;
    expect(u.side).toBe('pc');
    // One HP left, next to an explosive barrel: shooting it Downs the shooter on its own turn.
    const barrel = (cb.objects || []).find((o) => o.kind === 'barrel')!;
    const [bx, by] = barrel.pos.split(',').map(Number);
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].map(([dx, dy]) => (bx + dx) + ',' + (by + dy))
      .find((k) => !cb.units.some((v) => v.pos === k) && !cb.map.solid.includes(k) && !(cb.objects || []).some((o) => o.pos === k))!;
    u.pos = near; u.hp = 1; u.ap = 6; u.shield = 0;
    const owner = Object.values(x.characters).find((c) => c.id === u.charId)!.owner;
    const after = apply(x, { type: 'combat/shoot-cover', unitId: u.id, tile: barrel.pos } as any, owner);
    const me = after.combat!.units.find((v) => v.id === u.id)!;
    expect(me.downed || me.dead).toBe(true);
    // The fight isn't stuck on the Downed unit's turn.
    expect(after.combat!.over || active(after.combat!)!.id !== u.id).toBe(true);
    void keyOf;
  });
});
