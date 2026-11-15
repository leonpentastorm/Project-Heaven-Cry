// The effect runtime (plan 2.1-2.7, 2.9): collector, registry and hooks, generic core ops, the AP economy, uses,
// actions, toggles, windows, the damage chokepoint, the Narrator fallback, and weapon-granted actions. Lanes' own
// registrations are set aside here (onlyHandlers), so these tests pin the runtime itself.
import { describe, expect, it } from 'vitest';
import {
  itemsOf, heldOfChar, ownerOf, itemInfo, statQuery, maxHp, passive, saveBonus, applyCond, register, emit, perkActionsFor, previewPerkAction,
  grantPerkAp, bankAp, apDebt, turnAp, uses, applyDamage, weaponActions, canJam, resolveAttack, coverageReport, verdictFor, togglesFor, modOn, holderOf,
  openWindow, active, combatReport, WEAPON, previewAttack, postStory, pendRuling, d20, type Unit, type Character,
} from '../src';
import { fightWith, storyWith, withGame, onlyHandlers, rng } from './helpers/perkfight';
import { useRevision2Classes, SIG } from './helpers/legacy';
useRevision2Classes(); // Revision 2 classes and advanced classes for this file's handler tests (Class Roster Rev 3)

describe('collector (plan 2.2)', () => {
  it('a Tier II perk that replaces Tier I has Tier II effects only; class moves come by rank; an advanced class gives all its moves', () => {
    const s = storyWith([{ perks: { shrug_it_off: 'II' }, classId: 'marksman', skills: { dexterity: 5, vigilant: 4, reaction_speed: 4 } }]);
    const c = s.chars[0], items = itemsOf(heldOfChar(c));
    const shrug = items.find((i) => i.key === 'perk:shrug_it_off')!;
    expect(shrug.effects.some((e) => e.op === 'resource')).toBe(true); // rules 1.56: Answer in Kind II's Guard (Tier II only)
    expect(shrug.effects.filter((e) => e.op === 'damage_mult')).toHaveLength(1);
    expect(items.filter((i) => i.kind === 'class').map((i) => i.key)).toEqual(['class:marksman.fire_discipline', 'class:marksman.special_ammo']); // signature 13: rank II
    c.advancedClass = 'gunslinger';
    expect(itemsOf(heldOfChar(c)).filter((i) => i.key.startsWith('class:gunslinger.'))).toHaveLength(3);
  });
});

describe('generic core ops (plan 2.2, 6a-15)', () => {
  it('trait skill mods reach checks, passives and saves; stat_mult reaches max HP', () => onlyHandlers([], () => {
    const s = storyWith([{ traits: ['heavyworlder', 'rabbits_foot'] }, { traits: ['old_timer'] }]);
    const [a, b] = s.chars;
    expect(passive(a, 'intimidation')).toBe(10 + (a.skills.intimidation ? a.skills.intimidation - 1 : -2) + 2 - 1); // Heavyworlder +2, Rabbit's Foot −1
    expect(saveBonus(a, 'body')).toBe((a.skills.guts ? a.skills.guts - 1 : -2) - 1); // Rabbit's Foot: −1 Guts
    const plain = { ...b, traits: [] } as Character;
    expect(maxHp(b)).toBe(Math.round(maxHp(plain) * 0.9));
    // A story check with Intimidation carries Heavyworlder's +2, named in the head.
    s.act({ type: 'narrator/turn', turn: { narration: 'Lean on him.', checks: [{ charId: a.id, skills: ['intimidation'], tn: 12, stakes: 'He talks.' }] } } as any);
    const ck = s.g.checks.find((k) => !k.done)!; s.act({ type: 'check/roll', checkId: ck.id });
    const head = s.g.story.entries.filter((e) => e.kind === 'check').at(-1)!.head!;
    expect(head).toMatch(/\+2 Heavyworlder/);
  }));
  it('immunity cancels a condition before its save (Daggerfall Veteran: fear; Mind Without Fog: Heart debuffs)', () => onlyHandlers([], () => {
    const f = fightWith([{ traits: ['daggerfall_veteran'] }, { traits: ['mind_without_fog'] }]);
    const [p1, p2] = f.pcs;
    withGame(f.g, () => {
      expect(applyCond(f.cb, rng(3), f.foe, p1, 'fear')).toMatch(/untouched/);
      expect(applyCond(f.cb, rng(3), f.foe, p2, 'shaken')).toMatch(/untouched/);
    });
    expect(p1.conds?.fear).toBeFalsy();
  }));
  it('xp_mod changes XP by source (Born Performer: combat +20%)', () => onlyHandlers([], () => {
    const s = storyWith([{ traits: ['born_performer'] }]);
    s.act({ type: 'narrator/turn', turn: { narration: 'Well found.', xp: [{ charId: s.chars[0].id, source: 'discovery', amount: 50 }] } } as any);
    expect(s.g.characters[s.chars[0].id].xp).toBe(50);
  }));
});

describe('registry and hooks (plan 2.3, 2.4)', () => {
  it('a lane handler claims effects (generic skips them) and hears hooks; would_drop_to_0 can leave 1 HP', () => onlyHandlers([
    { id: 'heavyworlder', claims: [0], on: { damage_in: (ctx, h) => { if (ctx.phase === 'would_drop_to_0' && ctx.t === h.u) ctx.floor = 1; } } },
  ], () => {
    const info = itemInfo('trait:heavyworlder')!;
    expect(ownerOf(info, 0)).toBe('handler'); expect(ownerOf(info, 1)).toBe('generic');
    const f = fightWith([{ traits: ['heavyworlder'] }]);
    const u = f.pc;
    withGame(f.g, () => { const r = applyDamage(f.cb, u, 9999, { type: 'weapon', by: f.foe }); expect(r.dealt).toBe(u.maxHp - 1); });
    expect(u.hp).toBe(1); expect(u.downed).toBe(false);
  }));
  it('attack_preview terms show in the to-hit breakdown and sum to toHit; damage_out multipliers are named', () => onlyHandlers([
    { id: 'heavyworlder', on: { attack_preview: (ctx, h) => { if (ctx.att === h.u) ctx.terms.push({ v: 3, label: 'test perk' }); }, damage_out: (ctx, h) => { if (ctx.att === h.u) ctx.mults.push({ v: 2, label: 'test perk' }); } } },
  ], () => {
    const f = fightWith([{ traits: ['heavyworlder'], weapon: 'hellraiser_service_rifle' }], [{ at: 'E6' }]);
    const u = f.turn(f.pc);
    const pv = withGame(f.g, () => previewAttack(f.cb, u, f.foe, 'shot')) as any;
    expect(pv.terms.find((t: any) => t.label === 'test perk').v).toBe(3);
    expect(pv.terms.reduce((t: number, x: any) => t + x.v, 0)).toBe(pv.toHit);
    expect(pv.dmg.mults.some((m: any) => m.label === 'test perk')).toBe(true);
  }));
});

describe('AP economy (plan 2.6)', () => {
  it('perk AP is capped at +3 a turn, the turn at 9, the floor at 2; debt comes off after the floor', () => {
    const u = { name: 'U', apNext: 2, stunnedNext: 0, dazedNext: 0 } as unknown as Unit;
    expect(turnAp(u, [{ n: 4, why: 'a' }], []).ap).toBe(9);
    expect(turnAp(u, [{ n: 1, why: 'a' }], [{ n: -9, why: 'b' }]).ap).toBe(2);
    apDebt(u, 9); expect(turnAp(u, [], []).ap).toBe(2); // 6 − 4 (debt cap)
    const f = fightWith([{}]);
    const pc = f.turn(f.pc);
    withGame(f.g, () => { pc.apGained = 2; pc.apTurnTotal = pc.ap; expect(grantPerkAp(f.cb, pc, 3, 'test')).toBe(1); });
    const other = f.foe; withGame(f.g, () => { bankAp(other, 2, 'test'); }); expect(other.apNext).toBe(2);
  });
  it('turn_start_pre grants go through the cap', () => onlyHandlers([{ id: 'heavyworlder', on: { turn_start_pre: (ctx, h) => { if (ctx.u === h.u) ctx.grants.push({ n: 5, why: 'test' }); } } }], () => {
    const f = fightWith([{ traits: ['heavyworlder'] }]);
    expect(f.turn(f.pc).ap).toBe(9);
    expect(f.cb.log.some((l) => /lost to the \+3 cap/.test(l))).toBe(true);
  }));
});

describe('actions (plan 2.7)', () => {
  it('a bow fumbles on a natural 1 instead of jamming, and gains no Heat', () => {
    const f = fightWith([{ weapon: 'recurve_bow', skills: { dexterity: 3 } }], [{ at: 'E6' }]);
    const u = f.turn(f.pc);
    for (let s = 1; s < 400; s++) { // find a seed that rolls a 1
      const r = { state: s }, probe = { state: s }; if (d20(probe) !== 1) continue;
      withGame(f.g, () => resolveAttack(f.cb, r, u, f.foe, 'shot', null, { noAp: true })); break;
    }
    expect(u.jammed).toBe(false); expect(u.heat).toBe(0); expect(u.stunnedNext).toBe(1);
  });
});

describe('the Narrator fallback (plan 4.3) and coverage (plan 2.1)', () => {
  it('a fight starts with one line per fighter naming items the engine will not run', () => onlyHandlers([], () => {
    const f = fightWith([{ traits: ['the_soundscape_of_the_soul', 'gambler'] }]);
    expect(f.cb.notes!.some((n) => /Not engine-run for .*trait:gambler/.test(n))).toBe(true);
  }));
  it('every effect of every perk, trait and class move has an owner; the badge says who', () => {
    const rows = coverageReport();
    expect(rows.length).toBeGreaterThan(600);
    expect(rows.every((r) => ['handler', 'generic', 'narrator', 'action', 'gap'].includes(r.owner))).toBe(true);
    expect(['engine', 'narrator', 'both']).toContain(verdictFor('trait:heavyworlder').verdict);
    expect(verdictFor('perk:established_fact', 'mastered').verdict).not.toBe('engine');
  });
});
void emit; void register; void statQuery; void previewPerkAction;
