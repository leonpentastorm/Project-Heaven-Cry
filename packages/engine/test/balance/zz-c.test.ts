// @ts-nocheck
import { it } from 'vitest';
import { runCell, TIER_WEAPON } from './sim';
import { BUILD, BUILDS } from './builds';
import { gunBuild } from './guns-measure';
import { pattern } from './magic-measure';
import { faithBuild, prayerRow } from './faith-measure';
import { ENEMY } from '../../src';
const reg = (base: string, weapon: string) => { const id = 'm:' + base + ':' + weapon; if (!BUILD[id]) { const d = { ...BUILD[base], id, weapon }; BUILDS.push(d); BUILD[id] = d; } return id; };
const per = (b, v, lv, tier = 'sim_range_soldier', policy?) => { try { const c = runCell({ build: b, variant: v, level: lv, ...(policy ? { policy } : {}) }, tier, 'open', 12, { maxRounds: 8, tag: 'zc' }); return c.dmg / Math.max(1, c.turns); } catch (e) { return NaN; } };
it('unmeasured', () => {
  ENEMY.sim_range_elite = { ...ENEMY.elite, id: 'sim_range_elite', name: 'Range target (elite numbers)', hp: 8000 }; TIER_WEAPON.sim_range_elite = TIER_WEAPON.elite;
  for (const lv of [5, 10]) {
    const y = per('plain_gun', 'normal', lv), ye = per('plain_gun', 'normal', lv, 'sim_range_elite');
    for (const v of ['allin']) {
      const melee = ['adamantile_greatsword', 'maul', 'glaive', 'war_axe', 'ork_machete', 'hellraiser_servo_fist', 'fists'].map((w) => w + ' ' + Math.round(100 * per(reg('opt_blade', w), v, lv) / y)).join(' · ');
      const light = ['sabre', 'legion_gladius', 'kemizuchi_duelling_blade', 'combat_knife'].map((w) => w + ' ' + Math.round(100 * per(reg('plain_blade', w), v, lv, 'sim_range_soldier', 'optimised') / y)).join(' · ');
      const mana = ['core_rifle', 'spellslinger_pistol', 'lumeri_censer_gun'].map((w) => w + ' ' + Math.round(100 * per(gunBuild(w, 'masterwork'), v, lv, 'sim_range_soldier', 'optimised') / y)).join(' · ');
      console.log('MELEE L' + lv + ' ' + v + ' heavy: ' + melee);
      console.log('LIGHT L' + lv + ' ' + v + ' light: ' + light);
      console.log('MANA L' + lv + ' ' + v + ' ' + mana);
      const ey = { level: lv, normal: ye, allin: ye };
      const elite = [
        'gun ' + Math.round(100 * per(gunBuild('long_rifle', 'masterwork'), v, lv, 'sim_range_elite', 'optimised') / ye),
        'sigil4 ' + pattern('4', 'sigil', v, lv, 12, { glyphs: 4 }, /^Evoke /, ey, 'sim_range_elite').pctRifle,
        'ob ' + pattern('ob', 'outburst', v, lv, 12, { feelings: 'early' }, /^Release /, ey, 'sim_range_elite').pctRifle,
        'hymn ' + prayerRow('f', faithBuild('old_overcast'), v, lv, 12, ye, { tier: 'sim_range_elite' }).pctHymnTurn,
        'blade ' + Math.round(100 * per('opt_blade', v, lv, 'sim_range_elite') / ye),
      ].join(' · ');
      console.log('ELITE L' + lv + ' ' + v + ' (of the rifle on the Elite) ' + elite);
    }
  }
}, 1800000);
