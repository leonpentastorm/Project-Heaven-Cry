// Rules 1.93 (0.34, the integration): the lead's rulings on what stage B handed back, through the real paths (the
// reducer's combat/attack, the item tags, the data's own rows).
import { describe, it, expect } from 'vitest';
import { WEAPON, ITEM, ARMOUR_CLASSES, FAMILY, itemTags } from '../src';
import { physFight, rig } from './helpers/physfight';

describe('rules 1.93 item 8102: a Smetanita sidearm\'s hit lays 1 Pressure, once a turn for each target', () => {
  /** The Pressure the PC's hits with `gun` land (every roll a hit), against two Soldiers (a Boss's meter caps low): [on A, on B, a second hit on A
   * the same turn (A's meter emptied first, so the meter's own cap does not hide it)]. */
  function shots(gun: string): number[] {
    const f = physFight([{ weapon: gun, skills: { dexterity: 6 } }], [{ tier: 'soldier' }, { tier: 'soldier' }]);
    const [a, b] = f.foes; f.put(f.pc, 'C5'); f.put(a, 'F5'); f.put(b, 'F7'); const u = f.turn(f.pc); u.ap = 9;
    const shoot = (t: any) => f.act({ type: 'combat/attack', unitId: u.id, targetId: t.id, mode: 'shot' } as any);
    rig({ hit: true, die: 15 });
    shoot(a); const onA = f.pressure(a); shoot(b); const onB = f.pressure(b);
    f.press(a, 0); shoot(a); const again = f.pressure(a);
    rig(null);
    return [onA, onB, again];
  }
  it('the three rows name the modifier row; its number is the data\'s', () => {
    const fam = (Object.values(WEAPON) as any[]).filter((w) => w.family === 'smetanita_sidearms');
    expect(fam.length).toBe(3);
    for (const w of fam) expect(w.variant_mods).toContain('mod_line_smetanita');
    expect((ITEM as any).mod_line_smetanita.effects[0]).toMatchObject({ op: 'resource', when: 'hit', resource: 'pressure', value: 1, limit: { per: 'per_turn', each: 'target' } });
  });
  it('against the service pistol (its copy-from row): +1 on each target hit, nothing more on a second hit that turn', () => {
    const plain = shots('service_pistol'), sm = shots('smetanita_service_pistol');
    const add = (ITEM as any).mod_line_smetanita.effects[0].value;
    expect(sm[0] - plain[0]).toBe(add);
    expect(sm[1] - plain[1]).toBe(add); // another target: its own once
    expect(sm[2]).toBe(plain[2]); // the same target again this turn: once a turn
  });
});

describe('rules 1.93 item 8103: the Vests and Plate families', () => {
  it('Vests the issue line, Plate the Adamantile Brigade\'s; every class row names its family\'s line', () => {
    expect(FAMILY.vests.line).toBe('issue'); expect(FAMILY.plate.line).toBe('adamantile_brigade');
    for (let n = 1; n < ARMOUR_CLASSES.length; n++) {
      const r: any = ARMOUR_CLASSES[n];
      expect(FAMILY[r.family], r.name).toBeTruthy();
      expect(r.line, r.name).toBe(FAMILY[r.family].line);
      expect(itemTags('armour:' + n)).toContain('line:' + FAMILY[r.family].line);
    }
  });
});

describe('rules 1.93 item 8106: Albert Town\'s grant is Settled Shot', () => {
  it('on all three rows', () => {
    const rows = (Object.values(WEAPON) as any[]).filter((w) => w.family === 'albert_town');
    expect(rows.length).toBe(3);
    for (const w of rows) expect(w.grants.name).toBe('Settled Shot');
  });
});
