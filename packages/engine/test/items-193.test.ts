// Rules 1.93 (0.34, the integration): the lead's rulings on what stage B handed back, through the real paths (the
// reducer's combat/attack, the item tags, the data's own rows).
import { describe, it, expect } from 'vitest';
import { WEAPON, ITEM, ARMOUR_CLASSES, FAMILY, itemTags, wikiLookup, apply, itemCard, RuleError, runOptions, type GameState } from '../src';
import { survivalRoom, startRun, ownerOf } from './helpers/survival';
import type { Pc } from './helpers/replay';
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

describe('rules 1.93 item 8108: the wiki lists a family\'s rows (the Narrator\'s prompt names families, not every row)', () => {
  it('family:<id> gives every weapon of the family with its form', () => {
    for (const fam of ['service_sidearms', 'albert_town', 'crossbows']) {
      const e = wikiLookup('family:' + fam)!; expect(e, fam).toBeTruthy();
      for (const w of (Object.values(WEAPON) as any[]).filter((x) => x.family === fam && !x.variant_of)) expect(e.text, w.id).toContain(w.id + ' (' + w.form + ')');
    }
  });
});

describe('rules 1.93 item 8111: a weapon row with graded: false takes no grade (the grade step reads it)', () => {
  const DUO: Pc[] = [{ build: 'plain_gun', level: 1 }, { build: 'sigil', level: 1 }];
  function atForge(): GameState {
    const g0 = JSON.parse(JSON.stringify(startRun(survivalRoom('PHC-0001', DUO, { test: true }), 'PHC-0001'))) as GameState, r = g0.run!;
    const n = r.nodes.find((x) => x.depth === 5 && !x.gate)!, prev = r.nodes.find((x) => x.links.includes(n.id))!;
    n.kind = 'forge' as any; r.at = prev.id; r.state = 'map';
    for (const c of Object.values(g0.characters)) c.credits = 20000;
    let g = g0; for (let i = 0; i < DUO.length && g.run!.at !== n.id; i++) g = apply(g, { type: 'run/move', node: n.id }, ownerOf(i));
    expect(g.run!.at).toBe(n.id);
    return g;
  }
  it('the Forge refuses an ungraded row in the hand, offers no step for it, and still grades a graded one', () => {
    const ungraded = (Object.values(WEAPON) as any[]).find((w) => w.graded === false && w.category !== 'thrown' && w.id !== 'fists')!;
    expect(ungraded).toBeTruthy();
    let g = atForge();
    const graded = g.characters.c1.weapon;
    expect((WEAPON[graded] as any).graded).not.toBe(false);
    const ok = apply(g, { type: 'run/upgrade', charId: 'c1', where: 'main', place: 'forge' }, 'host');
    expect(ok.characters.c1.weaponState?.rarity).toBe('fine');
    g.characters.c1.weapon = ungraded.id; delete (g.characters.c1 as any).weaponState;
    expect(() => apply(g, { type: 'run/upgrade', charId: 'c1', where: 'main', place: 'forge' }, 'host')).toThrow(RuleError);
    try { apply(g, { type: 'run/upgrade', charId: 'c1', where: 'main', place: 'forge' }, 'host'); } catch (e) { expect((e as Error).message).toContain('takes no grade'); }
    expect(runOptions(g, 'c1').filter((o) => (o.group === 'grade' || o.group === 'relic') && (o.action as any).where === 'main')).toEqual([]);
    expect(itemCard({ id: ungraded.id }).graded).toBe(false);
  });
});
