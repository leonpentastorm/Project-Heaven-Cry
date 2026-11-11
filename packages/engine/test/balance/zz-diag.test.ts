// @ts-nocheck
import { it } from 'vitest';
import { weaponRows, rifleYard, GUNS, ONE_HANDED } from './guns-measure';
import { buildCharacter } from './builds';
import { WEAPON } from '../../src';
import { writeFileSync } from 'node:fs';
const LV = (process.env.LV || '6').split(',').map(Number), N = Number(process.env.N) || 8;
const V = (process.env.V || 'normal').split(','), RAR = (process.env.RAR || 'masterwork').split(',');
const WS = process.env.W ? process.env.W.split(',') : GUNS();
const DUAL = process.env.DUAL ? (process.env.DUAL === '1' ? ONE_HANDED() : process.env.DUAL.split(',')) : [];
const ROT = process.env.ROT ? process.env.ROT.split(',') : undefined;
it('diag', () => {
  const out: any[] = [];
  for (const lv of LV) {
    const y = rifleYard(lv, 60);
    console.log('L' + lv + ' rifle ' + y.toFixed(1));
    for (const v of V) for (const rar of RAR) for (const [w, off] of [...WS.map((w) => [w, null]), ...DUAL.map((w) => [w, w])]) {
      try {
        const r = weaponRows(w, rar, v, lv, N, y, { offHand: off || undefined, rotations: ROT });
        const bc = buildCharacter(r.rows[0].build, v, lv);
        if (bc.c.weapon !== w) { console.log(w + ' not usable by the build: ' + bc.notes.filter((q) => /refused/.test(q)).join(' | ')); continue; }
        console.log('L' + lv + ' ' + v + ' ' + rar + ' ' + (w + (off ? ' x2' : '')).padEnd(28) + r.rows.map((q) => q.rot + ' ' + String(q.pctRifle).padStart(3) + '%').join(' · ') + ' | best ' + r.best.rot + ' ' + r.best.pctRifle + '% hit ' + r.best.hitPct + ' rolls ' + r.best.shotsPerTurn + ' ' + JSON.stringify(r.best.actions) + (r.rows.some((q) => q.errors) ? ' ERRORS' : '') + (process.env.NOTES ? ' | ' + bc.notes.join(' | ') : ''));
        out.push({ level: lv, variant: v, rarity: rar, weapon: w, dual: !!off, rows: r.rows });
      } catch (e) { console.log(w + ' FAILED ' + String(e?.stack || e).slice(0, 300)); }
    }
  }
  if (process.env.OUT) writeFileSync(process.env.OUT, JSON.stringify(out, null, 1));
}, 7200000);
