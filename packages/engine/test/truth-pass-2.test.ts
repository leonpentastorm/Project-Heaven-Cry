// The engine fixes of the second text-and-number truth pass (12 Nov 2026): each of these failed before its fix.
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { applyCond, blessing, previewAttack, PATRONS, type Unit } from '../src';
import { fightWith, withGame, rng } from './helpers/perkfight';

type F = ReturnType<typeof fightWith>;
const at = (f: F, u: Unit, pos: string) => { f.unit(u.id).pos = pos; };

describe('truth pass 2', () => {
  it('Bleeding put on with no length lasts the 3 rounds of the Conditions table (it was 1)', () => {
    const f = fightWith([{}], [{ at: 'C6' }]);
    withGame(f.g, () => applyCond(f.cb, rng(), f.pc, f.foe, 'bleeding', undefined, undefined, { skipSave: true }));
    expect(f.foe.bleed).toBe(3);
  });
  it('Crawler-Blooded burns on the Blessing\'s patron, not on the holder\'s own (item 114)', () => {
    const f = fightWith([{ traits: ['crawler_blooded'] }, {}], [{ at: 'C6' }]);
    const [me, ally] = f.pcs;
    const lum = PATRONS.find((p) => p.faction === 'lumeri')!, other = PATRONS.find((p) => p.faction !== 'lumeri')!;
    const lumHymn = (lum as any).hymns[0], otherHymn = (other as any).hymns[0];
    // sworn to the Lumeri patron, blessed by another patron's Hymn: no burn
    f.g.characters[me.charId!].patron = lum.id; f.g.characters[ally.charId!].patron = other.id;
    let hp = me.hp; withGame(f.g, () => blessing(f.cb, rng(), ally, me, { ...otherHymn, effects: [] }, 1));
    expect(hp - me.hp).toBe(0);
    // sworn to another patron, blessed with the Lumeri patron's Hymn: 10
    f.g.characters[me.charId!].patron = other.id; f.g.characters[ally.charId!].patron = lum.id;
    hp = me.hp; withGame(f.g, () => blessing(f.cb, rng(), ally, me, { ...lumHymn, effects: [] }, 1));
    expect(hp - me.hp).toBe(10);
  });
  it('Finish It (the combat knife) counts a Stunned target, as the spec\'s line does', () => {
    const f = fightWith([{ weapon: 'combat_knife' }], [{ at: 'C6' }]);
    at(f, f.pc, '4,4'); at(f, f.foe, '5,4'); f.turn(f.pc);
    const dmg = () => (withGame(f.g, () => previewAttack(f.cb, f.pc, f.foe, 'melee')) as any).dmg.total as number;
    const plain = dmg();
    withGame(f.g, () => applyCond(f.cb, rng(), null, f.foe, 'stunned', 1, undefined, { skipSave: true }));
    expect(dmg()).toBeGreaterThan(plain);
  });
});
