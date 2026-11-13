// Do not show what does not exist (Leon, live 0.24.0: a Sigil word card showed "Grand form (Grand Sigilist): Lava
// floor…" though the Grand Sigilist is a shelved advanced class). canLayGrandForms reads the data: a move whose effects
// carry the grand_form op, held through a class that is active. Shelved: nobody can; live (the test switch): its holder can.
import { afterAll, describe, expect, it } from 'vitest';
import { canLayGrandForms, GRAND_FORM_OP, _setAdvancedLive, ADVANCED } from '../src';
import CLASSES from '../../../data/classes.json';

const ch = (o: any = {}) => ({ id: 'c', name: 'T', skills: {}, attrs: {}, perks: [], traits: [], ...o }) as any;

describe('Grand forms only for a character who can lay one', () => {
  afterAll(() => _setAdvancedLive(null));
  it('the op is in the data, on a shelved advanced class\'s move', () => {
    const owners = (CLASSES as any).advanced?.length != null ? (CLASSES as any).advanced : Object.values(ADVANCED);
    const withOp = (owners as any[]).filter((a) => (a.moves || []).some((m: any) => (m.effects || []).some((e: any) => e.op === GRAND_FORM_OP)));
    expect(withOp.map((a) => a.id)).toEqual(['grand_sigilist']);
  });
  it('nobody while the advanced classes are shelved, the holder included', () => {
    _setAdvancedLive(null);
    expect(canLayGrandForms(ch())).toBe(false);
    expect(canLayGrandForms(ch({ advancedClass: 'grand_sigilist' }))).toBe(false);
  });
  it('the holder once its class is live (as when its batch returns)', () => {
    _setAdvancedLive(true);
    expect(canLayGrandForms(ch({ advancedClass: 'grand_sigilist' }))).toBe(true);
    expect(canLayGrandForms(ch({ advancedClass: null }))).toBe(false);
  });
});
