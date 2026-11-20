// Rules 1.93 item 8100: the camp's rack is the issue rack. The camp's free weapon and rack offer only rows carrying the
// role tag `issue` (survival.json loadout.archetypes.tag), and the tag is on exactly the 18 rows the camp offered in
// 0.33.0 (computed by running the camp's own pool functions on origin/main 547c4f92c), so no camp list moves when the
// rules 1.92 rows join the pools. Proved through the reducer (run/start opens the camp; loadoutView is its screen).
import { describe, expect, it } from 'vitest';
import { type GameState, newGame, apply, loadoutView, LOADOUT, RACK, hasTag, itemsWith } from '../src';
import { sheetOf } from './helpers/perkfight';

const HOST = 'host';
/** The camp of 0.33.0 (live), archetype by archetype: [free, better]. A record, not a rule. */
const CAMP_033: Record<string, [string, string]> = {
  light_blades: ['combat_knife', 'throwing_knives'], heavy_melee: ['ork_machete', 'maul'], unarmed: ['hand_wraps', 'knuckledusters'],
  pistols: ['parlour_pistol', 'service_pistol'], revolvers: ['drifter_revolver', 'frontier_hand_cannon'], smgs: ['decrkm_smg', 'legion_pdw'],
  rifles: ['lever_carbine', 'hellraiser_service_rifle'], shotguns: ['sawn_off', 'coach_gun'], bows: ['recurve_bow', 'longbow'],
};
const campOf = (archetype?: string): GameState => {
  let g = newGame('ISSUE1', { id: HOST, name: 'Leon' }, 'seed-issue'); g.settings.play = 'survival';
  const s: any = { ...sheetOf({ name: 'Kade', ...(archetype ? { archetype } : {}) } as any) }; delete s.kit;
  g = apply(g, { type: 'char/add', sheet: s }, HOST); return apply(g, { type: 'run/start', seed: 'PHC-0001' }, HOST);
};

describe('the camp is the issue rack (rules 1.93 item 8100)', () => {
  it('the camp screen offers exactly 0.33.0\'s free weapons and rack, for any character', () => {
    for (const arch of [undefined, 'sharpshooter', 'brawler']) {
      const v = loadoutView(campOf(arch) as any, HOST)!;
      // the free weapon of every archetype; the better one wherever the character's menu shows it (a line over the
      // budget or not usable beside its gear is not shown), and never another row
      expect(Object.fromEntries(v.rack.map((a) => [a.id, a.free.id]))).toEqual(Object.fromEntries(Object.entries(CAMP_033).map(([k, x]) => [k, x[0]])));
      for (const a of v.rack) if (a.better) expect(a.better.id).toBe(CAMP_033[a.id][1]);
    }
    expect(Object.fromEntries(RACK.map((a) => [a.id, [a.free, a.better]]))).toEqual(CAMP_033);
  });
  it('the tag is read from data and carried by exactly the camp\'s rows', () => {
    expect(LOADOUT.archetypes.tag).toBe('issue');
    const tagged = itemsWith({ from: 'weapons', all: ['role:' + LOADOUT.archetypes.tag], rolled: true }).sort();
    expect(tagged).toEqual(Object.values(CAMP_033).flat().sort());
    for (const id of tagged) expect(hasTag(id, 'role:issue')).toBe(true);
  });
});
