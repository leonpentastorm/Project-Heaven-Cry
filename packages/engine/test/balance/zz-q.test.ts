// @ts-nocheck
import { it } from 'vitest';
import { faithBuild, dabblerBuild, rifleTurn, prayerRow, fline } from '/home/user/Project-Heaven-Cry/packages/engine/test/balance/faith-measure';
it('q', () => {
  const N = Number(process.env.QN) || 10;
  for (const lv of (process.env.QL || '1,3,6,9,12,20').split(',').map(Number)) {
    const y = rifleTurn(lv, 30); console.log('[q] yard L' + lv + ' ' + y.toFixed(1));
    for (const p of (process.env.QP || 'old_overcast,nerukhan').split(',')) for (const vow of [0, 0.4]) { const r = prayerRow(p + ' vow ' + vow, faithBuild(p), 'normal', lv, N, y, { opts: { hymn: 'damage', vow } }); console.log('[q] ' + fline(r)); }
    if (process.env.QD) for (const o of [{ hymn: 'none', whisper: 'none' }, { hymn: 'none', order: 'weapon' }, { hymn: 'none' }, { hymn: 'damage' }, { hymn: 'damage', vow: 0.4 }]) { const r = prayerRow('dabbler ' + JSON.stringify(o), dabblerBuild(), 'normal', lv, N, y, { opts: o }); console.log('[q] ' + fline(r)); }
  }
}, 3600000);
