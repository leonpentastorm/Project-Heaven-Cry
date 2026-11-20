// THE ITEM CARD, the client's half (Items 2.0 lane A3; design section 6). The engine says what a card shows about an
// item instance (gearpreview.ts itemCard, carried on every gear preview as `card`): its name, the picture chain, the
// grade with its word and marks, whether it holds a grade, its family and form, its maker line. This file turns that into
// what a screen draws, the same everywhere an item is drawn: the picture (the first of the chain that has one, else the
// general placeholder, markIcon: never an empty box), the grade's frame on the Standard picture (heavier with each mark;
// the grade's word and marks always beside it, so the frame never says it alone) and the words. The React card
// (ItemCard.tsx) and the template screens (the sheet's GEAR and ARMS tabs: text holes only) both read it. No number is
// worked out here.
import { itemCard, type ItemCardV, type Rarity } from '@engine';
import { gearIconUri, GEAR_INK } from './gearIcons';
import { markIcon } from './markIcon';

export type { ItemCardV };
/** The card of an id with its grade (the engine's view-model; cached there). */
export const cardOf = (id: string, rarity?: Rarity | string | null): ItemCardV => itemCard({ id, rarity: (rarity || 'standard') as Rarity });
/** The diamond a grade's mark is drawn with. */
export const MARK = '◆';
/** The picture of the chain the screen has (gearIcons.ts gearIconUri, the one resolver: painted first, else the line
 *  icon in `ink`), or '' when none of the chain has one. */
export function chainPicture(card: ItemCardV, o: { ink?: string; large?: boolean } = {}): string {
  for (const id of card.pictures) { const u = gearIconUri(id, o.ink ?? GEAR_INK, { large: o.large }); if (u) return u; }
  return '';
}
/** The card's picture: the chain's, else the general placeholder (markIcon: the item's initials in the ink). Never ''. */
export const cardPicture = (card: ItemCardV, o: { ink?: string; large?: boolean } = {}): string => chainPicture(card, o) || markIcon(card.name, o.ink ?? GEAR_INK);
/** Whether the picture is the placeholder (no picture of the chain yet). */
export const isPlaceholder = (card: ItemCardV): boolean => !chainPicture(card);
/** The grade's frame (CSS): one line for an ungraded thing and for Standard, two plus one a mark for a graded instance
 *  above Standard, in the panel's text ink. The same frame the sheet's hand panels drew before (0.27). No new colour:
 *  the style guide gives grades none yet (design section 1, lead's calls); the word says the grade. */
export function gradeBorder(card: ItemCardV): string {
  return card.graded && card.marks ? (2 + card.marks) + 'px solid #E7EBF3' : '1px solid #3B475D';
}
/** The grade in words with its marks ("FINE ◆"), '' when the item holds no grade. */
export const gradeText = (card: ItemCardV): string => (card.graded ? (card.gradeWord.toUpperCase() + (card.marks ? ' ' + MARK.repeat(card.marks) : '')) : '');
/** The family line under the name ("Cavalry blades, Dexterity · Officers"), '' when it has neither. */
export const familyText = (card: ItemCardV): string => [card.familyLine, card.lineWord].filter(Boolean).join(' · ');
/** The second skill's line, only when its effect is built (design item 10). */
export const secondSkillText = (card: ItemCardV): string => (card.secondSkill?.built ? 'Second skill: ' + card.secondSkill.name : '');

/** A template screen's holes for an item's picture and words (main.js, armsTab.js: text holes only). */
export function cardHoles(card: ItemCardV, o: { ink?: string; large?: boolean } = {}) {
  const img = cardPicture(card, o);
  return { img, hasImg: true, noImg: false, placeholder: isPlaceholder(card), grade: gradeText(card), family: familyText(card), border: gradeBorder(card), card };
}
