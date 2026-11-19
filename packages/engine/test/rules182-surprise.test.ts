// Rules 1.82 item 7004 (call made for Leon; rules.json combat.initiative.surprise_round.on): a surprise in the approach.
// A fight joined by an attack from a unit the other side did not see takes the other side's first turn (waitRound 2),
// both sides; Tremor holds while an attacker stands within Vision, Shoot First keeps the first turn at its AP. Through the
// reducer: a Survival fight opened unseen (rules 1.64), joined by a character's action or by a Hidden foe's attack.
import { describe, expect, it } from 'vitest';
import { type GameState, apply, active, APPROACH, SURPRISE, turnAp } from '../src';
import { survivalRoom, startRun, ownerOf } from './helpers/survival';
import { reachable } from '../src';
import perksJ from '../../../data/perks.json';

const SOLO = [{ build: 'plain_gun', level: 1 }] as any;
function unseenFight(): GameState {
  for (let s = 1; s <= 40; s++) {
    const seed = 'PHC-' + String(s).padStart(4, '0');
    let g = startRun(survivalRoom(seed, SOLO, { test: true }), seed);
    const n = reachable(g.run!).find((x) => x.kind === 'fight'); if (!n) continue;
    g = apply(g, { type: 'run/move', node: n.id } as any, ownerOf(0));
    if (g.combat?.approach) return g;
  }
  throw new Error('no fight opened unseen');
}
const copy = (g: GameState): GameState => JSON.parse(JSON.stringify(g));
const pcOf = (g: GameState) => g.combat!.units.find((u) => u.side === 'pc')!;
const PERK = (id: string): any => (perksJ as any).items.find((x: any) => x.id === id);
/** A Hidden foe has attacked before contact, unseen as its turn began; the character's next free step finds it. */
function ambushed(perks: { id: string; tier: string }[] = [], near = false): GameState {
  const g = copy(unseenFight()), cb = g.combat!, u = pcOf(g), foe = cb.units.find((x) => x.side === 'foe' && !x.dead)!;
  (g.characters as any)[u.charId!].perks = [...((g.characters as any)[u.charId!].perks || []), ...perks];
  if (u.held) u.held = { ...u.held, perks: [...(u.held.perks || []), ...perks] } as any; // the fight's copy of what it holds
  if (near) foe.pos = cb.units.find((x) => x.side === 'pc')!.pos.split(',').map((v, i) => String(+v + (i === 0 ? (+v > 2 ? -2 : 2) : 0))).join(',');
  foe.attackedTurn = true; cb.approach!.actor = { id: foe.id, unseen: true };
  return g;
}
const step = (g: GameState) => { const u = pcOf(g); return apply(g, { type: 'combat/end-turn', unitId: u.id } as any, ownerOf(0)); };

describe('rules 1.82 item 7004: surprise in the approach', () => {
  it('the switch is on, its words are data', () => { expect(SURPRISE.on).toBe(true); expect(SURPRISE.lines.side).toContain('{units}'); });
  it('a character acting before contact catches every foe: each loses round 1, and the character acts first', () => {
    const g = copy(unseenFight()), u = pcOf(g), full = turnAp(u, [], []).ap;
    const n = apply(g, { type: 'combat/prone', unitId: u.id } as any, ownerOf(0)), cb = n.combat!;
    expect(cb.approach).toBeUndefined(); expect(cb.round).toBe(1);
    const foes = cb.units.filter((x) => x.side === 'foe' && !x.dead);
    for (const f of foes) { expect(f.waitRound).toBe(2); expect(f.surprised).toBe(true); }
    expect(cb.log.some((l) => l.startsWith(SURPRISE.lines.side.split('{units}')[0]))).toBe(true);
    expect(active(cb)!.id).toBe(u.id); expect(cb.units.find((x) => x.id === u.id)!.prone).toBe(true);
    expect(cb.units.find((x) => x.id === u.id)!.ap).toBeLessThan(full);
    expect(cb.log.some((l) => l === u.name + ' ' + APPROACH.acts_log)).toBe(false);
  });
  it('a Hidden foe\'s attack nobody saw catches the squad: the character loses round 1', () => {
    const n = step(ambushed()), cb = n.combat!, p = pcOf(n);
    expect(cb.approach).toBeUndefined(); expect(p.waitRound).toBe(2); expect(p.surprised).toBe(true);
    expect(cb.log.filter((l) => l === p.name + ' is caught by surprise: no turn this round.').length).toBeGreaterThan(0);
  });
  it('seen as it began its turn, the foe surprises nobody', () => {
    const g = ambushed(); g.combat!.approach!.actor!.unseen = false;
    const p = pcOf(step(g)); expect(p.waitRound || 0).toBeLessThan(2);
  });
  it('Tremor: an attacker within Vision does not take the character\'s first turn', () => {
    const n = step(ambushed([{ id: 'tremor', tier: 'I' }], true)), p = pcOf(n);
    const far = ambushed([{ id: 'tremor', tier: 'I' }]); pcOf(far).vision = 1; // the attacker beyond its Vision
    expect(pcOf(step(far)).waitRound, 'beyond its Vision it is caught').toBe(2);
    expect(PERK('tremor').adjudication).toBe('engine');
    expect(p.waitRound || 0).toBeLessThan(2); expect(n.combat!.log.some((l) => l.includes('(Tremor)'))).toBe(true);
  });
  it('Shoot First: surprised, the character keeps its first turn with the tier\'s AP', () => {
    for (const tier of ['I', 'II']) {
      let g = step(ambushed([{ id: 'shoot_first', tier }])); const want = PERK('shoot_first').tiers[tier].effects[0].value;
      for (let i = 0; i < 20 && active(g.combat!)?.id !== pcOf(g).id; i++) g = apply(g, { type: 'combat/end-turn', unitId: active(g.combat!)!.id } as any, 'host');
      const p = pcOf(g); expect(p.waitRound || 0).toBeLessThan(2); expect(g.combat!.round).toBe(1);
      expect(active(g.combat!)!.id).toBe(p.id); expect(p.ap).toBe(Math.min(want, turnAp(p, [], []).ap));
    }
  });
});
