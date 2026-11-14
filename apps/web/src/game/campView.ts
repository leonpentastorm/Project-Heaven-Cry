// The camp's starting boon cards, as data (survival-spec 13.8; rules 1.51, drawn on the camp's one screen,
// LoadoutScreen.tsx, after the loadout): three large cards a character (the line glyph, the name, the one sentence with
// its number from data, the line's word in its attribute's ink, the worth against the cap). Every word and number is
// the engine's (loadoutView's `boon` block: startOffer read from what the character holds, relicRow, worthOf).
import { type LoadoutViewV, START_BOON, SKILLS } from '@engine';
import { ATTR_INK } from './classView';

/** A line's words and its attribute's ink (the alpha skill's attribute), from the data's line map. */
export function lineWord(line: string): { word: string; attr: string; ink: string } {
  const skill = Object.entries(START_BOON.lines).find(([, l]) => l === line)?.[0] || '', s = SKILLS.find((k) => k.id === skill);
  const attr = s?.attribute || '', name = s?.name || skill;
  return { word: (START_BOON.names[line] || line) + ' · ' + name, attr, ink: ATTR_INK[attr] || '#E7EBF3' };
}
export interface CampCardV { i: number; id: string; name: string; text: string; worth: number; worthLine: string; line: string; lineWord: string; ink: string; chosen: boolean }
/** The starting boon cards of the camp's view: each with its line's words and ink. */
export function boonCards(v: LoadoutViewV): CampCardV[] {
  return v.boon.cards.map((k) => { const line = k.lines[0] || '', lw = lineWord(line);
    return { i: k.i, id: k.id, name: k.name, text: k.text, worth: k.worth, worthLine: k.worth + ' of your ' + k.cap, line, lineWord: lw.word, ink: lw.ink, chosen: k.chosen }; });
}
