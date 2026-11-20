// Items 2.0 lane A3 (design section 6): the item card's client half. The picture chain ends on the general placeholder
// (markIcon), never an empty box; the grade is a frame AND its word with its marks (the frame never says it alone); an
// item that holds no grade has neither; every word comes from the engine's view-model (itemCard).
import { describe, it, expect } from 'vitest';
import { WEAPON, ITEM, RARITY } from '@engine';
import { cardOf, cardPicture, chainPicture, isPlaceholder, gradeBorder, gradeText, familyText, cardHoles } from './itemCardView';
import { gearIconUri } from './gearIcons';
import { markIcon } from './markIcon';

describe('the item card (client half)', () => {
  it('every weapon and item row has a picture: its own, its chain\'s, or the placeholder', () => {
    for (const id of [...Object.keys(WEAPON), ...Object.keys(ITEM)]) expect(cardPicture(cardOf(id)), id).toMatch(/^(data:image|\/|https?:)/);
  });
  it('a row with no picture anywhere in its chain shows the placeholder by its name (a new row of stage B)', () => {
    const k = { ...cardOf('sabre'), id: 'test_new_row', name: 'Dock cutter', pictures: ['test_new_row'] };
    expect(chainPicture(k)).toBe('');
    expect(isPlaceholder(k)).toBe(true);
    expect(cardPicture(k)).toBe(markIcon('Dock cutter'));
  });
  it('the chain: a row with no picture of its own shows the next of its chain that has one', () => {
    const own = cardOf('sabre');
    const k = { ...own, id: 'test_new_blade', pictures: ['test_new_blade', 'sabre'] };
    expect(cardPicture(k, { large: true })).toBe(gearIconUri('sabre', undefined, { large: true }));
    expect(cardPicture(k, { large: true })).toBe(cardPicture(own, { large: true }));
  });
  it('the grade: a frame and its word with its marks; Standard and an ungraded thing have the plain line', () => {
    const std = cardOf('service_pistol'), fine = cardOf('service_pistol', 'fine'), relic = cardOf('service_pistol', 'relic');
    expect(gradeBorder(std)).toBe('1px solid #3B475D');
    expect(gradeBorder(fine)).toBe((2 + RARITY.fine.marks) + 'px solid #E7EBF3');
    expect(gradeBorder(relic)).toBe((2 + RARITY.relic.marks) + 'px solid #E7EBF3');
    expect(gradeText(std)).toBe('STANDARD');
    expect(gradeText(fine)).toBe('FINE ' + '◆'.repeat(RARITY.fine.marks));
    const stim = cardOf('stim_injector');
    expect(stim.graded).toBe(false); expect(gradeText(stim)).toBe(''); expect(gradeBorder(stim)).toBe('1px solid #3B475D');
  });
  it('the family line is the engine\'s words (family, form, maker line)', () => {
    expect(familyText(cardOf('sabre'))).toBe('Cavalry blades, Dexterity · Officers');
    expect(familyText(cardOf('afterword'))).toBe('');
    const h = cardHoles(cardOf('sabre', 'fine'));
    expect(h).toMatchObject({ hasImg: true, grade: gradeText(cardOf('sabre', 'fine')), family: 'Cavalry blades, Dexterity · Officers' });
  });
});
