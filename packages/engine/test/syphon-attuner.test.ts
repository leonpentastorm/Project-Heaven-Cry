// @ts-nocheck (test fixtures: plain objects)
// 0.28.3: Syphon is gated on the mp resource row's `needs` (data/actions.json: any focus whose fuel is MP), so a Mender
// with an Attuner in hand Syphons like an Emanator holder. Every action goes through the reducer (s.act), the path a
// click takes; the descriptor row is read through actionsFor.
import { describe, it, expect } from 'vitest';
import './helpers/yard16';
import { storyWith } from './helpers/perkfight';
import { apply, actionsFor, manaBand, NEEDS_MP_FOCUS, SYPHON_DRAW, AIR_SPENT, type Action, type GameState } from '../src';
import actionsJ from '../../../data/actions.json';
import rulesJ from '../../../data/rules.json';

const refused = (g: GameState, a: any): string => { try { apply(g, a as Action, 'host'); return ''; } catch (e: any) { return String(e.message || e); } };

/** One Mender (Empathy 6), the Attuner in the off hand, in the pack, or nowhere; MP set low; a fight against one soldier. */
function fight(where: 'hand' | 'pack' | null, mp = 10) {
  const s = storyWith([{ name: 'Mender', skills: { empathy: 6, camaraderie: 0 }, level: 5, weapon: 'service_pistol' }]);
  const ch = s.g.characters[s.chars[0].id];
  ch.offHand = where === 'hand' ? { id: 'attuner' } : null;
  ch.pack = (ch.pack || []).filter((x) => !['emanator', 'attuner'].includes(x.item || x.id));
  if (where === 'pack') ch.pack.push({ id: 'attuner', item: 'attuner', name: 'Attuner', qty: 1, kind: 'focus' });
  ch.mp = mp;
  s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'Syphon', map: 'yard16', difficulty: 'standard', enemies: [{ name: 'Target', tier: 'soldier', weapon: 'service_pistol', at: 'L6' }] } } } as any);
  const unit = () => s.g.combat.units.find((u) => u.charId === ch.id);
  for (let i = 0; i < 12 && s.g.combat.order[s.g.combat.turn] !== unit().id; i++) s.act({ type: 'combat/end-turn', unitId: s.g.combat.order[s.g.combat.turn] } as any);
  return { s, unit, row: () => actionsFor(s.g, unit().id, 'host').find((d) => d.id === 'syphon') };
}

describe('Syphon reads the mp row\'s needs (an Attuner is an MP focus)', () => {
  it('the data: the mp row needs an Emanator or an Attuner in hand', () => {
    expect((actionsJ as any).resources.mp.needs).toEqual(['mg.emanator', 'mg.attuner']);
  });
  it('an Attuner in hand: Syphon is offered and gives MP from the air, AP paid, the meter thinned by its draw (6 since rules 1.68)', () => {
    const f = fight('hand'); const u = f.unit();
    expect(u.mg.attuner).toBe(true); expect(u.mg.emanator).toBe(false);
    const d = f.row(); expect(d).toBeTruthy(); expect(d.available).toBe(true);
    const mp0 = u.mg.mp, ap0 = u.ap, air0 = f.s.g.combat.mana, want = Math.min(u.mg.mpMax - mp0, Math.round(manaBand(air0).syphon_mp * u.mg.syphon));
    f.s.act({ type: 'combat/syphon', unitId: u.id } as any);
    const v = f.unit();
    expect(v.mg.mp - mp0).toBe(want); expect(want).toBeGreaterThan(0);
    expect(v.ap).toBe(ap0 - (actionsJ as any).costs.syphon.ap);
    expect(f.s.g.combat.mana).toBe(air0 - 6);
  });
  it('the Attuner in the pack: the row is shown greyed with the reason, and the reducer refuses with the same words', () => {
    const f = fight('pack'); const u = f.unit();
    const d = f.row(); expect(d).toBeTruthy(); expect(d.available).toBe(false); expect(d.why).toBe(NEEDS_MP_FOCUS);
    expect(refused(f.s.g, { type: 'combat/syphon', unitId: u.id })).toBe(NEEDS_MP_FOCUS);
  });
  it('a gear change in the fight moves the gate: the Attuner stowed, Syphon refused; drawn again, Syphon works', () => {
    const f = fight('hand'); let u = f.unit();
    f.s.act({ type: 'combat/stow', unitId: u.id, slot: 'off' } as any); u = f.unit();
    expect(u.mg.attuner).toBeFalsy(); expect(f.row().why).toBe(NEEDS_MP_FOCUS);
    expect(refused(f.s.g, { type: 'combat/syphon', unitId: u.id })).toBe(NEEDS_MP_FOCUS);
    f.s.act({ type: 'combat/equip', unitId: u.id, item: 'attuner', to: 'off' } as any); u = f.unit();
    expect(u.mg.attuner).toBe(true);
    const mp0 = u.mg.mp; f.s.act({ type: 'combat/syphon', unitId: u.id } as any); expect(f.unit().mg.mp).toBeGreaterThan(mp0);
  });
  it('no MP focus at all: no Syphon row', () => {
    const f = fight(null); expect(f.row()).toBeFalsy();
  });
  it('the floor (rules 1.55 item 47): the meter pays the data\'s draw; an empty meter refuses, row greyed, nothing paid', () => {
    const draw = -(rulesJ as any).mana.meter.events.find((e: any) => e.event === 'syphon').delta;
    expect(SYPHON_DRAW).toBe(draw);
    const f = fight('hand'); let u = f.unit();
    f.s.g.combat.mana = draw; // just enough: works, and the meter falls by the data's amount
    const mp0 = u.mg.mp; f.s.act({ type: 'combat/syphon', unitId: u.id } as any);
    expect(f.unit().mg.mp).toBeGreaterThan(mp0); expect(f.s.g.combat.mana).toBe(0);
    u = f.unit(); const ap0 = u.ap, mp1 = u.mg.mp;
    expect(f.row().available).toBe(false); expect(f.row().why).toBe(AIR_SPENT);
    expect(refused(f.s.g, { type: 'combat/syphon', unitId: u.id })).toBe(AIR_SPENT);
    expect(f.unit().ap).toBe(ap0); expect(f.unit().mg.mp).toBe(mp1); expect(f.s.g.combat.mana).toBe(0);
    if (draw > 1) { f.s.g.combat.mana = draw - 1; expect(refused(f.s.g, { type: 'combat/syphon', unitId: u.id })).toBe(AIR_SPENT); }
  });
  it('full MP: refused, nothing paid', () => {
    const f = fight('hand', 10_000); const u = f.unit(), ap0 = u.ap;
    expect(refused(f.s.g, { type: 'combat/syphon', unitId: u.id })).toBe('Your MP is full.');
    expect(f.unit().ap).toBe(ap0);
  });
});
