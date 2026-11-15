// Rules 1.56 (plan 0.29, lane L1): weapon mods are data. A mod is one row of data/items.json: its triggered effects are
// item ops that act only with the gun it is fitted to (`with_this`), and its number fields are read by one helper
// (gearNum). THE HUNDREDTH ITEM: a mod with an id the engine has never seen, written as one data line, is fitted through
// the reducer, shows on the gun's card and acts in a fight, with no code. Through the real path (gear/mod, the card,
// combat/attack), never a hand call to an inner function.
import { describe, it, expect, afterAll } from 'vitest';
import { A, W, HIT, pcs, foes, act } from './golden/harness';
import { modRoom, modFight } from './golden/mods';

const ID = 'mod_never_seen_barrel';
/** The one data line (as it would stand in data/items.json). */
const ROW = { id: ID, name: 'Never-seen barrel', category: 'mod', mod_slot: 'muzzle', weight_kg: 0.2, price_credits: 100, adjudication: 'engine', provisional: true,
  recoil: -1, effects: [{ op: 'mod', slot: 'muzzle' }, { op: 'roll_mod', when: 'to_hit', if: { with_this: true }, value: 2 }], text: 'Muzzle: a test barrel, steadier and truer.' };
const GUN = 'hellraiser_service_rifle';
A.ITEM[ID] = ROW;
afterAll(() => { delete A.ITEM[ID]; });

const term = (p: any, label: string) => (p.terms || []).find((t: any) => t.label === label)?.v;
const pvOf = (g: any, prep?: (u: any) => void) => { const u = pcs(g)[0], t = foes(g)[1]; prep?.(u); return W(g, () => A.previewAttack(g.combat, u, t, 'shot')); };

describe('rules 1.56: a mod is one line of data', () => {
  it('the hundredth item: fitted by gear/mod, it shows on the card (its line, the gun\'s Recoil less its own)', () => {
    const g = modRoom({ weapon: GUN, mods: [ID] }), c = g.characters.c1;
    expect(c.weaponState.mods).toEqual([ID]);
    const card = A.gearPreview(c, { id: GUN, mods: c.weaponState.mods }), bare = A.gearPreview(c, { id: GUN });
    expect(card.lines.find((l: any) => l.key === 'mod:' + ID)).toMatchObject({ label: ROW.name, value: ROW.text });
    expect(card.lines.find((l: any) => l.key === 'recoil').num).toBe(Math.max(0, A.WEAPON[GUN].recoil + ROW.recoil));
    expect(bare.lines.find((l: any) => l.key === 'recoil').num).toBe(A.WEAPON[GUN].recoil);
  });
  it('the hundredth item acts in a fight: its to-hit term (by its name) and its Recoil, only with the gun it is on', () => {
    const g = modFight({ weapon: GUN, mods: [ID] }), bare = modFight({ weapon: GUN });
    const p = pvOf(g), b = pvOf(bare);
    expect(term(p, ROW.name)).toBe(2); expect(term(b, ROW.name)).toBeUndefined();
    expect(p.toHit).toBe(b.toHit + 2);
    // a second shot this turn (Dexterity 0): the gun's Recoil less the mod's
    const p2 = pvOf(g, (u) => { u.shotsThisTurn = 1; u.dexterity = 0; }), b2 = pvOf(bare, (u) => { u.shotsThisTurn = 1; u.dexterity = 0; });
    expect(term(b2, 'recoil')).toBe(-A.WEAPON[GUN].recoil); expect(term(p2, 'recoil')).toBeUndefined();
    // the real attack through the reducer rolls what the preview said
    const u = pcs(g)[0], t = foes(g)[1], r = act(g, { type: 'combat/attack', unitId: u.id, targetId: t.id, mode: 'shot' }, HIT);
    expect(r.ok).toBe(true);
    const line = (r.g.combat.log as string[]).find((l) => /fires at/.test(l))!;
    expect(line).toContain('+' + p.toHit + ' =');
  });
});
