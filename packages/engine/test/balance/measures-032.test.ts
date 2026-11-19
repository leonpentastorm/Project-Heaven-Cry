// @ts-nocheck (a measuring tool)
// THE 0.32 MEASURES (measures-032.ts): opt-in. M032=1 plays the parts named in M032_PARTS (default all five:
// rank,drive,follow,feeds,mods) with M032_N fights a cell (default 12) and prints markdown tables; M032_OUT also writes them.
//   M032=1 M032_PARTS=rank M032_N=40 npx vitest run --root packages/engine test/balance/measures-032.test.ts --silent=false
import { describe, it, expect } from 'vitest';
import { appendFileSync } from 'node:fs';
import { wallRow, wallLine, WALL_HEAD, withDriveOff, followRows, feedRows, modRow, MOD_GUNS } from './measures-032';

const env = (globalThis as any).process?.env || {};
const N = Math.max(1, Number(env.M032_N) || 12), PARTS = String(env.M032_PARTS || 'rank,drive,follow,feeds,mods').split(',');
const say = (s: string) => { (globalThis as any).console.log(s); if (env.M032_OUT) appendFileSync(env.M032_OUT, s + '\n'); };

describe.runIf(env.M032)('the 0.32 measures', () => {
  it('plays the parts and prints the tables', () => {
    let errors = 0;
    if (PARTS.includes('rank')) {
      say('\n### Two shields by rank (the Living Wall beside two plain rifles, the standard fight, ground with cover, ' + N + ' fights a cell)\n\n' + WALL_HEAD);
      for (const lv of [1, 6, 12]) for (const [what, b] of [['two Bucklers', 'door_wall_2sh'], ['as built (rifle)', 'door_wall']]) { const r = wallRow(what + ' rank ' + (lv >= 12 ? 'III' : lv >= 6 ? 'II' : 'I'), b, lv, N); errors += r.errors; say(wallLine(r)); }
    }
    if (PARTS.includes('drive')) {
      say('\n### Drive (the two-shield wall in the rush: the standard fight\'s foes with blades, ' + N + ' fights a cell)\n\n' + WALL_HEAD);
      for (const lv of [6, 12]) {
        const a = wallRow('Drive as built', 'door_wall_2sh', lv, N, { rush: true }), b = withDriveOff(() => wallRow('Drive, -2 and plate back at 0', 'door_wall_2sh', lv, N, { rush: true })), c = wallRow('Stand Fast', 'door_wall_2sh_sf', lv, N, { rush: true });
        for (const r of [a, b, c]) { errors += r.errors; say(wallLine(r)); }
      }
    }
    if (PARTS.includes('follow')) {
      say('\n### The follow strike and Afterword (% of the plain rifle\'s turn; the optimised policy, 8 turns on the range, ' + N + ' fights a cell)\n\n| Row | Variant | Level | % rifle | Hit % | Damage a turn |\n|---|---|---|---|---|---|');
      for (const v of ['normal', 'allin'] as const) for (const lv of [1, 5, 10]) for (const r of followRows(lv, v, N)) { errors += r.errors; say('| ' + r.what + ' | ' + v + ' | ' + lv + ' | ' + r.pct + '% | ' + r.hit + '% | ' + r.perTurn + ' |'); }
    }
    if (PARTS.includes('feeds')) {
      say('\n### The beta feeds (all in, % of the plain rifle\'s turn; feed as built 0.01 / every feed at 0; ' + N + ' fights a cell)\n\n| System | L1 | L5 | L10 | L20 |\n|---|---|---|---|---|');
      const rows: Record<string, string[]> = {};
      for (const lv of [1, 5, 10, 20]) for (const r of feedRows(lv, N)) (rows[r.system] ||= []).push(r.on + ' / ' + r.off);
      for (const [s, c] of Object.entries(rows)) say('| ' + s + ' | ' + c.join(' | ') + ' |');
    }
    if (PARTS.includes('mods')) {
      say('\n### Guns with mods fitted (all in, Masterwork, the optimised policy, % of the plain rifle\'s turn; each slot takes the mod that measures best, ' + N + ' fights a cell)\n\n| Gun | Level | Bare | Fitted | Mods |\n|---|---|---|---|---|');
      for (const lv of [6, 12]) for (const g of MOD_GUNS) { const r = modRow(g, lv, N); errors += r.errors; say('| ' + g + ' | ' + lv + ' | ' + r.bare + '% | ' + r.fitted + '% | ' + (r.mods.join(', ') || 'none better') + ' |'); }
    }
    expect(errors).toBe(0);
  }, 24 * 3600_000);
});
