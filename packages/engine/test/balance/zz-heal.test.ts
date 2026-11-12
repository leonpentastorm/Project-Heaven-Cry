// @ts-nocheck
import { it } from 'vitest';
import { inventory } from './heal-measure';
import { medicRow } from './defence-measure';
import { soldierTurnAt } from './refit-measure';
it('heals', () => {
  for (const b of ['mender', 'outburst_s', 'sigil_s', 'faith_s', 'faith_n']) for (const v of ['normal', 'allin']) {
    const per = [1, 5, 10, 20].map((lv) => inventory(b, v, lv, soldierTurnAt(lv)));
    for (let i = 0; i < per[0].length; i++) console.log('HEAL ' + b + ' ' + v + ' | ' + per[0][i].what.slice(0, 60) + ' | ' + per.map((p) => p[i].pctNow).join(' / '));
  }
  for (const v of ['normal', 'allin']) console.log('KIT ' + v + ' ' + [1, 6, 12, 20].map((lv) => { const r = medicRow('medic', 'calls', v, lv); return 'L' + lv + ' triage ' + r.triagePct + '% stim ' + r.stimPct + '%'; }).join(' · '));
}, 600000);
