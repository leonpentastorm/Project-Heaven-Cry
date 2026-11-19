// The 0.32 gaps lane (docs/design/handoffs/BEFORE-ITEMS-2.0.md group B): each fault proved through the reducer or the
// engine's own answers to the screens (actionsFor, previewDescriptor), never an inner function the game does not call.
import { describe, it, expect } from 'vitest';
import './helpers/yard16';
import { figFight } from './helpers/figfight';
import { physFight, rig } from './helpers/physfight';
import { actionsFor, previewDescriptor, raiseNeed } from '../src';
import { storyWith } from './helpers/perkfight';
import { allItems, actionDefs } from '../src/effects';
import ACTIONSJ from '../../../data/actions.json';

describe('TRIAGE row 10: a resource price of 1 names one ("1 core", never "1 spare cores")', () => {
  it('Load the Visualizer costs 1 core, read off the action row the Figments tab shows', () => {
    const f = figFight([{ skills: { visualization: 5 }, cores: 5 }]);
    const u = f.turn(f.pc);
    const row = actionsFor(f.g, u.id).find((d) => /visualizer_core/.test(d.id));
    expect(row, 'the Load the Visualizer row').toBeTruthy();
    expect(row!.cost.text).toMatch(/· 1 core\b/);
    expect(row!.cost.text).not.toMatch(/spare cores/);
    expect(f.unit(u.id).mg!.cores).toBe(5); // the spare count is the pack's: five held, five spare
  });
});

// G1 (spec item 5600): the Momentum line of a melee preview is the technique run on a copy as a hit
describe('G1: a Charge previews the Momentum it really reaches (Rolling Start\'s hit-time op counted)', () => {
  it('the descriptor\'s "Momentum a → b" equals what the reducer leaves after the same Charge hits', () => {
    const make = () => {
      const f = physFight([{ weapon: 'sabre', known: ['charge'], skills: { raw_power: 4, athletics: 4 }, attrs: { strength: 4 }, level: 6, picks: ['fork.momentum.rolling_start'] }], [{ at: '8,4', tier: 'elite' }]);
      f.cb.objects = []; const u = f.turn(f.pc); f.put(u, '5,4'); f.put(f.foe, '8,4');
      const foe = f.unit(f.foe.id); foe.hp = foe.maxHp = 9999; f.unit(u.id).ap = 9; f.unit(u.id).openerUsed = true; f.momentum(u, 1);
      return { f, u: f.unit(u.id) };
    };
    const a = make();
    const pv: any = previewDescriptor(a.f.g, a.u.id, 'tq:main:charge', { targetId: a.f.foe.id }, 'host');
    const line = (pv?.lines || []).find((l: any) => /^Momentum /.test(l.text))?.text || '';
    expect(a.f.momentum(a.f.unit(a.u.id))).toBe(1); // the preview changed nothing
    const b = make(); rig({ hit: true, die: 12 });
    expect(b.f.tech('charge', { targetId: b.f.foe.id })).toBeNull();
    const after = b.f.momentum(b.f.unit(b.u.id)); rig(null);
    // rules 1.73 item 5805: Rolling Start's free Charge is gone, so the Opener pays 1 and its hit builds 1: a preview that
    // skipped the hit-time op would read 1 → 0
    expect(after).toBe(1);
    expect(line).toBe('Momentum 1 → ' + after);
  });
});

// G2 (spec item 5606): a refusal to raise a skill carries its need as structure beside its text
describe('G2: "Raise <Attribute>" is offered from the refusal\'s structure, not its sentence', () => {
  it('the reducer refuses a skill point over its attribute in words; raiseNeed gives the same need as {attr, n}', () => {
    const s = storyWith([{ name: 'Ash', skills: { durability: 3 }, attrs: { endurance: 3 } }], 'G2');
    const c: any = Object.values(s.g.characters)[0]; c.unspent = { ...(c.unspent || {}), skill: 1, attr: 0 };
    const need = raiseNeed(c, 'skill', 'durability');
    expect(need).toEqual({ attr: 'endurance', n: 4 });
    expect(() => s.act({ type: 'levelup/raise', charId: c.id, kind: 'skill', id: 'durability' } as any)).toThrow('Needs Endurance 4: an Attribute point first.');
    expect(raiseNeed(c, 'skill', 'pain_threshold')).toBeNull(); // 0 points over Endurance 3: no need
  });
});

// G3 (spec item 5609): every item action has its field row in data (no row: refused)
describe('G3: the field reads each action\'s flag from data/actions.json field', () => {
  it('every item action a fight can take has a row (allowed, or a refusal with words)', () => {
    const F: any = (ACTIONSJ as any).field, missing: string[] = [];
    for (const info of allItems()) { let defs: any[] = []; try { defs = actionDefs(info); } catch { continue; }
      for (const d of defs) if ((d.scope || []).includes('combat') && !F.actions[info.key + '#' + d.id]) missing.push(info.key + '#' + d.id); }
    expect(missing).toEqual([]);
  });
  it('no row names an action no item has any more (a row leaves with its action)', () => {
    const F: any = (ACTIONSJ as any).field, have = new Set<string>();
    for (const info of allItems()) { let defs: any[] = []; try { defs = actionDefs(info); } catch { continue; }
      for (const d of defs) have.add(info.key + '#' + d.id); }
    expect(Object.keys(F.actions).filter((k) => !have.has(k))).toEqual([]);
  });
});

// Item 15 (ROADMAP "Magic"): a focus taken out of the off hand goes to the pack as a focus (packKindOf), never a tool
describe('a stowed focus is a focus in the pack', () => {
  it('gear/unequip of each focus in the off hand: its pack line is of kind focus', () => {
    for (const id of ['evoker', 'emanator', 'attuner', 'visualizer']) {
      const s = storyWith([{ name: 'Ash' }], 'FOCUS' + id);
      const c: any = Object.values(s.g.characters)[0]; c.offHand = { id };
      const g = s.act({ type: 'gear/unequip', charId: c.id, slot: 'off' } as any);
      const line = (g.characters[c.id].pack || []).find((x: any) => (x.item || x.id) === id);
      expect(line, id).toBeTruthy(); expect(line!.kind, id).toBe('focus');
    }
  });
});
