// @ts-nocheck
import { it } from 'vitest';
import { gunBuild, gunRow, rifleYard, gline } from './guns-measure';
import { buildCharacter } from './builds';
import { WEAPON } from '../../src';
const LV = (process.env.LV || '6').split(',').map(Number), N = Number(process.env.N) || 6;
const V = (process.env.V || 'normal').split(','), RAR = (process.env.RAR || 'standard').split(',');
const WS = process.env.W ? process.env.W.split(',') : Object.values(WEAPON).filter((w: any) => w.phys?.system === 'ranged' && w.category !== 'thrown').map((w: any) => w.id);
it('diag', () => {
  for (const lv of LV) {
    const y = rifleYard(lv, 60);
    console.log('L' + lv + ' rifle ' + y.toFixed(1));
    for (const v of V) for (const rar of RAR) for (const w of WS) {
      try {
        const b = gunBuild(w, rar), bc = buildCharacter(b, v, lv);
        const r = gunRow(w + ' ' + rar, b, v, lv, N, y), p = gunRow(w + ' plain', b, v, lv, N, y, { policy: 'plain' });
        console.log(gline(r) + ' | plain only ' + p.pctRifle + '% | ' + JSON.stringify(r.actions) + (process.env.NOTES ? ' | ' + bc.notes.join(' | ') : ''));
      } catch (e) { console.log(w + ' FAILED ' + String(e).slice(0, 200)); }
    }
  }
}, 3600000);
