// The character sheet's derived lines (the story screen's Status tab, creation's Lock in step): every number is read
// from the engine's own function, and every line names the attribute and skill behind it by the name the engine's data
// gives (so a renamed or re-homed skill can't leave a stale line here).
import {
  SKILL, ATTRS, newCharacter, maxHp, hpPerLevel, maxMp, defense, initiativeBonus, movement, visionOf, carryLimit, saveBonus, SAVE_SKILL_OF,
  healingMult, healReceivedMult, shieldReceivedMult, critMult, critTakenPct, ambushTakenPct, sigilRangeBonus, sigilCoreSaving, soulRangeBonus, readyDesigns,
  type Character,
} from '@engine';

export interface DerivedLine { key: string; k: string; v: string; from: string }
const sk = (id: string) => SKILL[id]?.name || id;
const at = (id: string) => ATTRS.find((a) => a.id === id)?.name || id;
const signed = (m: number) => (m > 0 ? '+' + m : m < 0 ? '−' + Math.abs(m) : '0');
const x2 = (n: number) => '×' + (Math.round(n * 100) / 100);
const pct = (n: number) => (n > 0 ? '−' + Math.round(n * 100) + '%' : n < 0 ? '+' + Math.round(-n * 100) + '%' : '0%');
const and = (...names: string[]) => names.join(' and ');

/** Every derived line of a character, in sheet order. */
export function derivedLines(c: Character): DerivedLine[] {
  const save = (fam: 'body' | 'brain' | 'heart', name: string): DerivedLine => ({ key: 'save_' + fam, k: name + ' save', v: signed(saveBonus(c, fam)), from: sk(SAVE_SKILL_OF[fam]) });
  return [
    { key: 'hp', k: 'Max HP', v: String(maxHp(c)), from: at('endurance') },
    { key: 'hp_level', k: 'HP per level', v: '+' + hpPerLevel(c), from: sk('pain_threshold') },
    { key: 'mp', k: 'Max MP', v: String(maxMp(c)), from: at('determination') + ' and ' + at('insight') }, // rules 1.24 (it was Virtue)
    { key: 'defense', k: 'Defense', v: String(defense(c)), from: sk('athletics') },
    { key: 'init', k: 'Initiative', v: signed(initiativeBonus(c)), from: and(at('agility'), sk('reaction_speed')) },
    { key: 'move', k: 'Movement', v: movement(c) + ' tiles per AP', from: at('agility') },
    { key: 'vision', k: 'Vision', v: visionOf(c) + ' tiles', from: and(at('perception'), sk('vigilant')) },
    { key: 'carry', k: 'Carry', v: carryLimit(c) + ' kg', from: at('strength') },
    save('body', 'Body'), save('brain', 'Brain'), save('heart', 'Heart'),
    { key: 'heal_given', k: 'Healing given', v: x2(healingMult(c)), from: and(at('insight'), sk('empathy')) },
    { key: 'heal_received', k: 'Healing received', v: x2(healReceivedMult(c)), from: sk('camaraderie') },
    { key: 'shield_received', k: 'Shields received', v: x2(shieldReceivedMult(c)), from: sk('conscience') },
    { key: 'crit', k: 'Critical damage', v: x2(critMult(c)), from: and(at('perception'), sk('dexterity')) },
    { key: 'crit_taken', k: 'Critical damage taken', v: pct(critTakenPct(c)), from: and(at('perception'), sk('analysis')) },
    { key: 'ambush_taken', k: 'Ambush damage taken', v: pct(ambushTakenPct(c)), from: sk('proficiency') },
    { key: 'sigil_range', k: 'Sigil range', v: '+' + sigilRangeBonus(c) + ' tiles', from: sk('brain_power') },
    { key: 'sigil_cores', k: 'Core charge saved', v: sigilCoreSaving(c) + ' a Sigil', from: sk('brain_power') },
    { key: 'soul_range', k: 'Soul range', v: '+' + soulRangeBonus(c) + ' tiles', from: sk('will_power') },
    { key: 'ready_designs', k: 'Designs ready', v: String(readyDesigns(c)), from: sk('will_power') },
  ];
}

/** A level 1 character built from the creation screen's points, for the Lock in step's preview (never saved). Null when
 *  the engine can't build one from what is placed so far. */
export function previewCharacter(skills: Record<string, number>, attrs: Record<string, number>, traits: string[], kit: string | null): Character | null {
  try {
    return newCharacter('preview', 'preview', { name: 'Preview', portrait: '', origin: '', kit: kit || 'medic', traits: [...(traits || [])], skills: { ...skills }, attrs: { ...attrs }, cores: { body: 1, mind: 1, soul: 1 }, identity: {} } as any);
  } catch { return null; }
}
