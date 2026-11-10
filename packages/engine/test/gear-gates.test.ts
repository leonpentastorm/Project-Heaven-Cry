// Rules 1.13, gear gates (docs/design/proposals/2026-11-nine-doors.md, section 13.3): each gate sits on the skill the
// rule names, a weapon's or item's `requires` is asked in the off hand as well as the main hand (the second weapon
// still asks 2 more), and heavy armour asks Pain Threshold.
import { describe, it, expect } from 'vitest';
import { WEAPON, PHYS_RULES, equip, armourGateWhy, requiresWhy, secondWeaponWhy, packOf, type Character } from '../src';
import { storyWith } from './helpers/perkfight';

/** A character with these skills and nothing in its hands, the named weapons in its pack. */
function who(skills: Record<string, number>, ...weapons: string[]): Character {
  const c = storyWith([{ skills }]).chars[0];
  for (const k of Object.keys(c.skills)) if (!(k in skills)) c.skills[k] = 0;
  c.weapon = 'fists'; c.weaponState = {}; c.offHand = null;
  c.pack = weapons.map((id) => ({ id, name: WEAPON[id].name, qty: 1, kind: 'weapon' as const, weapon: id }));
  return c;
}
const draw = (c: Character, id: string, to: 'main' | 'off') => equip(c, packOf(c).findIndex((x) => x.weapon === id), to);

describe('the gates sit on the skills the rule names', () => {
  it('servo-fist: Raw Power 3; core rifle: Dexterity 3; banner: Empathy 3', () => {
    expect((WEAPON.hellraiser_servo_fist as any).requires).toEqual({ raw_power: 3 });
    expect((WEAPON.core_rifle as any).requires).toEqual({ dexterity: 3 });
    expect((WEAPON.bot_thread_banner as any).requires).toEqual({ empathy: 3 });
    expect(draw(who({ proficiency: 9, raw_power: 2 }, 'hellraiser_servo_fist'), 'hellraiser_servo_fist', 'main')).toBe('Needs raw power 3.');
    expect(draw(who({ raw_power: 3 }, 'hellraiser_servo_fist'), 'hellraiser_servo_fist', 'main')).toBeNull();
    expect(draw(who({ proficiency: 9, dexterity: 2 }, 'core_rifle'), 'core_rifle', 'main')).toBe('Needs dexterity 3.');
    expect(draw(who({ dexterity: 3 }, 'core_rifle'), 'core_rifle', 'main')).toBeNull();
    expect(draw(who({ camaraderie: 9 }, 'bot_thread_banner'), 'bot_thread_banner', 'main')).toBe('Needs empathy 3.');
    expect(draw(who({ empathy: 3 }, 'bot_thread_banner'), 'bot_thread_banner', 'main')).toBeNull();
  });
  it('light blades and guns hit with Dexterity, and ask nothing more', () => {
    for (const id of ['combat_knife', 'sabre', 'service_pistol', 'hellraiser_service_rifle']) { expect(WEAPON[id].skill, id).toBe('dexterity'); expect((WEAPON[id] as any).requires, id).toBeUndefined(); }
  });
});

describe('the off hand asks what the main hand asks', () => {
  it('a weapon with a requirement is refused in an empty-handed character\'s off hand without the skill', () => {
    expect(draw(who({ brain_power: 2 }, 'spellslinger_pistol'), 'spellslinger_pistol', 'off')).toBe('Needs brain power 3.');
    expect(draw(who({ brain_power: 3 }, 'spellslinger_pistol'), 'spellslinger_pistol', 'off')).toBeNull();
    expect(draw(who({ raw_power: 2 }, 'hellraiser_servo_fist'), 'hellraiser_servo_fist', 'off')).toBe('Needs raw power 3.');
  });
  it('as a second weapon it asks 2 more, as before', () => {
    const c = who({ brain_power: 4, dexterity: 6 }, 'service_pistol', 'spellslinger_pistol');
    expect(draw(c, 'service_pistol', 'main')).toBeNull();
    expect(draw(c, 'spellslinger_pistol', 'off')).toMatch(/A second weapon asks more: .* needs Brain Power 5\./);
    c.skills.brain_power = 5; expect(draw(c, 'spellslinger_pistol', 'off')).toBeNull();
    expect(secondWeaponWhy(c, 'spellslinger_pistol', 'fists')).toBeNull();
  });
  it('requiresWhy reads any requires block', () => {
    expect(requiresWhy({ skills: { pain_threshold: 2 } }, { pain_threshold: 3 })).toBe('Needs pain threshold 3.');
    expect(requiresWhy({ skills: { pain_threshold: 3 } }, { pain_threshold: 3 })).toBeNull(); expect(requiresWhy({ skills: {} }, undefined)).toBeNull();
  });
});

describe('heavy armour asks Pain Threshold', () => {
  it('Class 4 asks 3 and Class 5 asks 5 (provisional, in the data); lighter armour asks nothing', () => {
    expect(PHYS_RULES.gear_gates.heavy_armour).toEqual({ skill: 'pain_threshold', classes: { 4: 3, 5: 5 } });
    for (const cls of [0, 1, 2, 3]) expect(armourGateWhy({ skills: {} }, cls)).toBeNull();
    expect(armourGateWhy({ skills: { pain_threshold: 2, durability: 9 } }, 4)).toBe('Class 4 armour needs Pain Threshold 3.');
    expect(armourGateWhy({ skills: { pain_threshold: 3 } }, 4)).toBeNull();
    expect(armourGateWhy({ skills: { pain_threshold: 4 } }, 5)).toBe('Class 5 armour needs Pain Threshold 5.');
    expect(armourGateWhy({ skills: { pain_threshold: 5 } }, 5)).toBeNull();
  });
});
