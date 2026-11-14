// @ts-nocheck (a measuring tool)
// THE MELEE MEASUREMENTS (Balance 2.0 draft, docs/design/proposals/2026-11-balance-2.0.md section 2): the twin of the
// gun loop (guns-measure.test.ts) for blades, axes, fists and the mana arms. One row is one WEAPON in the hands of the
// optimised blade build (builds.ts 'opt_blade': Fighter, Masterwork, its melee techniques and perks), played for 8 turns
// by the simulator's optimised policy on the shooting range (sim.ts: a target with a Soldier's numbers at the
// character's level and 5,000 HP, 13 tiles off, that never acts: the walk in is counted). A weapon that hits with
// Dexterity is measured in the same build with Dexterity in Raw Power's place (and the class the rules give it,
// Marksman), so a sabre is not judged in a Strength build's hands. The percent is its damage a turn over the plain
// rifle's (service rifle, plain shots, normal share, same level): the contract's 100%. Nothing here is a guard.
//
//   MELEE_MEASURE=1 npx vitest run --root packages/engine test/balance/melee-measure.test.ts --silent=false
//   MELEE_MEASURE_N=12   MELEE_MEASURE_LEVELS=1,5,10,20   MELEE_MEASURE_VARIANTS=normal,allin   MELEE_MEASURE_RARITY=masterwork
//   MELEE_MEASURE_WEAPONS=all | id,id      (default all: every melee weapon a character can hold, not the companions')
//   MELEE_MEASURE_OUT=<folder>             also writes melee-measure-<tag>.json and .md there (MELEE_MEASURE_TAG, default "now")
import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunRow, rifleYard } from './guns-measure';
import { BUILD, BUILDS, buildCharacter } from './builds';
import { WEAPON } from '../../src';

const FULL = !!process.env.MELEE_MEASURE, OUT = process.env.MELEE_MEASURE_OUT, TAG = process.env.MELEE_MEASURE_TAG || 'now';
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..'), fromRepo = (p: string) => (/^([A-Za-z]:)?[\\/]/.test(p) ? p : resolve(REPO, p));
/** Every melee weapon a character can hold (the companions' bites and claws left out, and the bare hands: the neutral
 * fallback a character holds when it holds nothing, which cannot be put in a pack and equipped). */
const MELEE = () => Object.values(WEAPON).filter((w: any) => w.phys?.system === 'melee' && !w.companion_only && w.id !== 'fists').map((w: any) => w.id as string);
const swap = (xs: string[]) => xs.map((s) => (s === 'raw_power' ? 'dexterity' : s));

/** Register (once) the optimised blade build with another weapon in its hands; a Dexterity weapon gets the Dexterity twin. */
export function meleeBuild(weapon: string, rarity = 'masterwork'): string {
  const dex = (WEAPON[weapon] as any)?.phys?.hits_with === 'dexterity', id = 'm:' + weapon + ':' + rarity;
  if (!BUILD[id]) {
    const b = BUILD.opt_blade, w = Object.fromEntries(Object.entries(b.weights).map(([k, v]) => [k === 'raw_power' && dex ? 'dexterity' : k, v]));
    const def = { ...b, id, label: (WEAPON[weapon]?.name || weapon) + ' (' + rarity + ')', weapon, rarity, ...(dex ? { main: 'dexterity', classId: 'marksman', weights: w, allin: swap(b.allin) } : {}) };
    BUILDS.push(def); BUILD[id] = def;
  }
  return id;
}

describe('the melee measurements (Balance 2.0)', () => {
  (FULL ? it : it.skip)('full run: every melee weapon against the plain rifle', () => {
    const levels = (process.env.MELEE_MEASURE_LEVELS || '1,5,10,20').split(',').map(Number), n = Math.max(1, Number(process.env.MELEE_MEASURE_N) || 12);
    const variants = (process.env.MELEE_MEASURE_VARIANTS || 'normal,allin').split(','), rarity = process.env.MELEE_MEASURE_RARITY || 'masterwork';
    const ws = !process.env.MELEE_MEASURE_WEAPONS || process.env.MELEE_MEASURE_WEAPONS === 'all' ? MELEE() : process.env.MELEE_MEASURE_WEAPONS.split(',');
    const yard = Object.fromEntries(levels.map((lv) => [lv, rifleYard(lv, Math.max(60, n))]));
    const all: any = { n, levels, rarity, rows: [] }; let md = '', errors = 0;
    for (const v of variants) {
      md += '\n**' + (v === 'normal' ? 'Normal share' : 'All in') + '** (' + rarity + '). Plain rifle, damage a turn: ' + levels.map((l) => 'L' + l + ' ' + Math.round(yard[l] * 10) / 10).join(' · ')
        + '. Each cell: percent of the plain rifle (the optimised policy, 8 turns, the walk in counted).\n\n| Weapon | Hits with | ' + levels.map((l) => 'Level ' + l).join(' | ') + ' |\n|---|---|' + levels.map(() => '---').join('|') + '|\n';
      for (const w of ws) {
        const cells: string[] = [];
        for (const lv of levels) {
          try {
            const b = meleeBuild(w, rarity), bc = buildCharacter(b, v as any, lv);
            if (bc.c.weapon !== w) { cells.push('–'); console.log('[melee] L' + lv + ' ' + v + ' ' + w + ': the build can\'t use it (' + bc.notes.filter((q) => /refused/.test(q)).join('; ') + ')'); continue; }
            const r = gunRow(w, b, v, lv, n, yard[lv], { policy: 'optimised' }); errors += r.errors;
            all.rows.push({ level: lv, variant: v, weapon: w, ...r }); cells.push(String(r.pctRifle) + '%');
            console.log('[melee] L' + lv + ' ' + v + ' ' + w + ': ' + r.pctRifle + '% · hit ' + r.hitPct + '% · ' + r.dmgPerHit + ' a hit · ' + r.shotsPerTurn + ' rolls a turn');
          } catch (e) { cells.push('FAILED'); errors++; console.log('[melee] L' + lv + ' ' + v + ' ' + w + ' FAILED ' + String(e).slice(0, 160)); }
        }
        md += '| ' + (WEAPON[w]?.name || w) + ' | ' + ((WEAPON[w] as any)?.phys?.hits_with || '') + ' | ' + cells.join(' | ') + ' |\n';
      }
    }
    console.log(md);
    if (OUT) { const dir = fromRepo(OUT); mkdirSync(dir, { recursive: true }); writeFileSync(resolve(dir, 'melee-measure-' + TAG + '.json'), JSON.stringify(all, null, 1) + '\n'); writeFileSync(resolve(dir, 'melee-measure-' + TAG + '.md'), md); }
    expect(errors).toBe(0);
  }, 7200000);
});
