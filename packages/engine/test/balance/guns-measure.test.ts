// @ts-nocheck (a measuring tool)
// THE GUN MEASUREMENTS (rules 1.18; docs/design/handoffs/damage-step-guns.md). What each gun is worth against the plain
// rifle on the simulator's shooting range, in the hands of the optimised gun build (Marksman, Masterwork), played four
// ways (guns-measure.ts ROTATIONS); a weapon's number is the best of the four.
//
//   npm run check -- engine                the cheap tests below (the cards, and a few seeded fights at level 6)
//   GUNS_MEASURE=1 npx vitest run --root packages/engine test/balance/guns-measure.test.ts --silent=false
//                                          the full tables, printed (levels 1, 3, 6, 9, 12, 20; normal share and all in)
//   GUNS_MEASURE_N=24                      fights a cell (default 12)
//   GUNS_MEASURE_LEVELS=6,12   GUNS_MEASURE_VARIANTS=normal   GUNS_MEASURE_RARITY=masterwork
//   GUNS_MEASURE_WEAPONS=all | id,id       (default: the guns that matter for the ceiling, TOP_GUNS)
//   GUNS_MEASURE_DUAL=id,id                the same gun in each hand
//   GUNS_MEASURE_OUT=<folder>              also writes guns-measure-<tag>.json and .md there (GUNS_MEASURE_TAG, default "now")
import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunBuild, gunRow, rifleYard, weaponRows, GUNS, G_LEVELS, TOP_GUNS, SPECIAL_AMMO, ROTATIONS } from './guns-measure';
import { freshFight, runFight, MAP_ID, TIER_WEAPON } from './sim';
import { expected } from './policies';
import { buildCharacter } from './builds';
import { WEAPON, MAPS, ENEMY, previewAttack, previewTechnique, bindGame } from '../../src';

const FULL = !!process.env.GUNS_MEASURE, OUT = process.env.GUNS_MEASURE_OUT, TAG = process.env.GUNS_MEASURE_TAG || 'now';
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..'), fromRepo = (p: string) => (p.startsWith('/') ? p : resolve(REPO, p));
const W = (g: any, f: () => any) => { const was = bindGame(g); try { return f(); } finally { bindGame(was); } };

/** The engine's own cards on the range, first turn: expected damage (hit chance × damage after armour, criticals counted) for each AP. */
function cards(weapon: string, level = 6) {
  const b = gunBuild(weapon, 'masterwork'), st = freshFight({ build: b, variant: 'normal', level }, 'sim_range_soldier', 'GMC');
  const cb = st.g.combat, u = cb.units.find((q: any) => q.side === 'pc'), t = cb.units.find((q: any) => q.side === 'foe');
  u.ap = 9; // the cards, not the turn: every price is affordable
  const shot = W(st.g, () => previewAttack(cb, u, t, 'shot'));
  const tech = (id: string) => { const pv = W(st.g, () => previewTechnique(cb, u, id, { targetId: t.id }, st.g)); return pv.ok ? { ap: pv.ap, rolls: pv.attacks.length, perAp: pv.attacks.reduce((n: number, a: any) => n + expected(a.pv), 0) / pv.ap } : null; };
  return { shot: { ap: shot.ap, perAp: expected(shot) / shot.ap }, burst: tech('burst'), dump: tech('mag_dump') };
}

// The targets (Leon, 11 Nov 2026; rules 1.18), pinned cheaply. The first two tests read the engine's cards (no dice);
// the third plays a few seeded fights at level 6 with wide bands (the full run is the measurement).
describe('the guns\' ceiling holds (rules 1.18)', () => {
  it('a Burst is worth more than the Shot for its AP, by 5% to 25%, and is worse to hit; Mag Dump stays under +35%', () => {
    for (const w of ['hellraiser_service_rifle', 'legion_bullpup']) {
      const c = cards(w);
      expect(c.burst.rolls, w).toBe(2); expect(c.burst.ap, w).toBeLessThanOrEqual(3);
      const perAp3 = c.burst.perAp * c.burst.ap / 3; // Fire Discipline makes one Burst a turn 2 AP: the card's own price is 3
      expect(perAp3 / c.shot.perAp, w + ': Burst for its AP against the Shot').toBeGreaterThanOrEqual(1.05); expect(perAp3 / c.shot.perAp, w).toBeLessThanOrEqual(1.25);
      if (c.dump) expect(c.dump.perAp / c.shot.perAp, w + ': Mag Dump for its AP against the Shot').toBeLessThanOrEqual(1.35);
    }
  });
  it('the slow big shot is no better for its AP than a 2 AP rifle: the long rifle within 85% to 112% of the service rifle\'s Shot', () => {
    const rifle = cards('hellraiser_service_rifle').shot, long = cards('long_rifle').shot;
    expect(long.ap).toBe(3); expect(rifle.ap).toBe(2);
    expect(long.perAp / rifle.perAp).toBeGreaterThanOrEqual(0.85); expect(long.perAp / rifle.perAp).toBeLessThanOrEqual(1.12);
    for (const w of ['adamantile_battle_rifle', 'ccec_marksman_rifle', 'core_rifle', 'lever_carbine']) { const c = cards(w).shot; expect(c.perAp / rifle.perAp, w).toBeLessThanOrEqual(1.2); }
  });
  it('on the range: the optimised rifles sit between the plain rifle and 150% of it (level 6, a few seeded fights)', () => {
    const N = 4, y = rifleYard(6, 12);
    for (const [w, rot] of [['hellraiser_service_rifle', 'gunner'], ['long_rifle', 'plain']] as const) {
      const r = ROTATIONS.find((q) => q.id === rot)!, row = gunRow(w, gunBuild(w, 'masterwork'), 'normal', 6, N, y, { policy: r.policy, opts: r.opts });
      expect(row.errors, w).toBe(0);
      expect(row.pctRifle, w + ', percent of the plain rifle').toBeGreaterThanOrEqual(105); expect(row.pctRifle, w).toBeLessThanOrEqual(172);
    }
  }, 120000);
});

describe('the gun measurements', () => {
  (FULL ? it : it.skip)('full run: every gun asked for, four ways, against the plain rifle', () => {
    const levels = (process.env.GUNS_MEASURE_LEVELS || G_LEVELS.join(',')).split(',').map(Number), n = Math.max(1, Number(process.env.GUNS_MEASURE_N) || 12);
    const variants = (process.env.GUNS_MEASURE_VARIANTS || 'normal,allin').split(','), rarity = process.env.GUNS_MEASURE_RARITY || 'masterwork';
    const ws = process.env.GUNS_MEASURE_WEAPONS === 'all' ? GUNS() : process.env.GUNS_MEASURE_WEAPONS ? process.env.GUNS_MEASURE_WEAPONS.split(',') : TOP_GUNS;
    const dual = process.env.GUNS_MEASURE_DUAL ? process.env.GUNS_MEASURE_DUAL.split(',') : ['frontier_hand_cannon'];
    const all: any = { n, levels, rarity, rows: [] }; let md = '', errors = 0;
    const yard = Object.fromEntries(levels.map((lv) => [lv, rifleYard(lv, Math.max(60, n))]));
    for (const v of variants) {
      const table: Record<string, any[]> = {};
      for (const [w, off] of [...ws.map((x) => [x, null]), ...dual.map((x) => [x, x])] as [string, string | null][]) for (const lv of levels) {
        const key = (WEAPON[w]?.name || w) + (off ? ', one in each hand' : '');
        let cell: any = null;
        try { const r = weaponRows(w, rarity, v, lv, n, yard[lv], { offHand: off || undefined }), bc = buildCharacter(r.rows[0].build, v, lv);
          if (bc.c.weapon === w) { cell = r; errors += r.rows.reduce((e, q) => e + q.errors, 0); all.rows.push({ level: lv, variant: v, weapon: w, dual: !!off, rows: r.rows });
            console.log('[guns] L' + lv + ' ' + v + ' ' + key + ': ' + r.rows.map((q) => q.rot + ' ' + q.pctRifle + '%').join(' · ')); }
          else console.log('[guns] L' + lv + ' ' + v + ' ' + key + ': the build can\'t use it (' + bc.notes.filter((q) => /refused/.test(q)).join('; ') + ')');
        } catch (e) { console.log('[guns] L' + lv + ' ' + v + ' ' + key + ' FAILED ' + String(e).slice(0, 160)); errors++; }
        (table[key] ||= []).push(cell);
      }
      md += '\n**' + (v === 'normal' ? 'Normal share' : 'All in') + '** (' + rarity + '). Plain rifle, damage a turn: ' + levels.map((l) => 'L' + l + ' ' + Math.round(yard[l] * 10) / 10).join(' · ')
        + '. Each cell: the best of the four ways · (plain shots only).\n\n| Gun | ' + levels.map((l) => 'Level ' + l).join(' | ') + ' |\n|---|' + levels.map(() => '---').join('|') + '|\n';
      for (const [k, cells] of Object.entries(table)) md += '| ' + k + ' | ' + cells.map((c: any) => (c ? '**' + c.best.pctRifle + '%** ' + c.best.rot + ' · (' + c.rows[0].pctRifle + '%)' : '–')).join(' | ') + ' |\n';
      const top = (special: boolean) => levels.map((_, i) => { let b: any = null; for (const [k, cells] of Object.entries(table)) { const c: any = cells[i]; if (!c || SPECIAL_AMMO.includes(c.weapon) !== special) continue; if (!b || c.best.pctRifle > b.pct) b = { pct: c.best.pctRifle, k }; } return b ? '**' + b.pct + '%** ' + b.k : '–'; });
      md += '| THE CEILING (the best gun, the best way) | ' + top(false).join(' | ') + ' |\n| Special ammunition (allowed 150%) | ' + top(true).join(' | ') + ' |\n';
    }
    console.log(md);
    if (OUT) { const dir = fromRepo(OUT); mkdirSync(dir, { recursive: true }); writeFileSync(resolve(dir, 'guns-measure-' + TAG + '.json'), JSON.stringify(all, null, 1) + '\n'); writeFileSync(resolve(dir, 'guns-measure-' + TAG + '.md'), md); }
    expect(errors).toBe(0);
  }, 7200000);
});

// What enemies deal, on the ground the rules 1.15 fit was measured on (16 × 11, the sides 11 tiles apart). On the
// simulator's 26 × 26 ground an enemy never fires at a character who stands still (spec item 1086), so the fit's
// "under fire" rows read 10 rounds there; this is the same measure on the old ground.
//   GUNS_MEASURE_FOES=1 npx vitest run --root packages/engine test/balance/guns-measure.test.ts --silent=false     (GUNS_MEASURE_N fights, default 30)
describe('what enemies deal (the under-fire rows of the rules 1.15 fit, on the ground they were fitted on)', () => {
  (process.env.GUNS_MEASURE_FOES ? it : it.skip)('the plain rifleman under two Soldiers, and under an Elite and a Soldier', () => {
    MAPS.sim_old = { id: 'sim_old', name: 'Open ground (the 1.15 fit)', w: 16, h: 11, solid: [], cover: [], full: [], difficult: [], pcStart: ['2,5', '2,3', '2,7', '1,4', '1,6', '2,1'], foeStart: ['13,5', '13,3', '13,7', '14,4', '14,6', '13,1', '13,9'] };
    MAP_ID.old = 'sim_old';
    for (const t of ['soldier', 'elite']) { ENEMY['sim_bag_' + t] = { ...ENEMY[t], id: 'sim_bag_' + t, name: 'Sandbag (' + t + ' numbers)', hp: 5000 }; TIER_WEAPON['sim_bag_' + t] = TIER_WEAPON[t]; }
    const FIRE: Record<string, string[]> = { soldiers: ['sim_bag_soldier', 'sim_bag_soldier'], mixed: ['sim_bag_elite', 'sim_bag_soldier'] }, N = Math.max(1, Number(process.env.GUNS_MEASURE_N) || 30);
    for (const lv of G_LEVELS) {
      let s = '[foes] L' + lv;
      for (const fire of ['soldiers', 'mixed']) {
        let lasted = 0, taken = 0, ft = 0, fa = 0, fh = 0, by3 = 0;
        for (let i = 0; i < N; i++) { const r = runFight({ pcs: [{ build: 'plain_gun', variant: 'normal', level: lv }], foes: FIRE[fire].map((t) => ({ tier: t })), map: 'old' as any, seed: ['FIRE', 'plain_gun', lv, fire, i].join('-'), maxRounds: 10 }), p = r.pcs[0];
          lasted += p.downedRound != null ? p.downedRound - 1 : 10; if (p.downedRound != null && p.downedRound <= 3) by3++; taken += p.taken; ft += r.foeTurns; fa += p.foeAttacks; fh += p.foeHits; }
        s += ' | ' + fire + ': lasts ' + (lasted / N).toFixed(2) + ' rounds (down by 3: ' + Math.round(100 * by3 / N) + '%) · taken a foe turn ' + (taken / ft).toFixed(1) + ' · foe rolls a turn ' + (fa / ft).toFixed(2) + ' · foe hit ' + Math.round(100 * fh / fa) + '%';
      }
      console.log(s);
    }
  }, 3600000);
});
