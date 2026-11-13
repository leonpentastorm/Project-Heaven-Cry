// @ts-nocheck (a measuring tool)
// RULES 1.33: Tending, Bonds and the Mender (docs/design/bonds-spec.md section 7). Skipped unless asked for:
//
//   TEND_MEASURE=1 npx vitest run --root packages/engine test/balance/tending-measure.test.ts --silent=false
//     TEND_N=8   fights a cell for the rifle-turn yardstick (refit-measure.ts yardOf)
//
// What it measures, with the engine itself (no formula copied):
//   heal      the healing turn (6 AP), in Soldier-turns x 100 (refit-measure.ts soldierTurnAt): the Mender (Triage, then
//             two Mends, every ally Bonded: through x1.2) and the door user (three Mends on Bonded allies), all in and
//             at a normal share (Insight / Empathy 4 / 4)
//   offence   a whole turn of pistol shots at a Bonded Soldier of the same level (the engine's preview: chance x damage
//             after armour, x the Bonds held), in percent of the normal-share rifle-turn (yardOf): the Mender solo
//             (Bonds on three Soldiers), the Mender in a squad of four (three allies and one enemy), the door user
//   strike    the offence turn with the Ledger full (0.7 x its cap on the first hit)
// The sheet (bonds-spec.md section 7): Insight and Empathy 7/7, 8/8, 10/10, 10/10 at levels 1 / 5 / 10 / 20, Dexterity
// 0 / 1 / 2 / 4, a service pistol, the Attuner in the off hand.
import { describe, it, expect } from 'vitest';
import { storyWith, withGame } from '../helpers/perkfight';
import { beginTurn, previewAttack } from '../../src';
import { runPerkAction, perkActionId } from '../../src/effects/actions';
import { acted } from '../../src/combat';
import { tie } from '../../src/kit';
import { ledgerCap } from '../../src/character';
import { soldierTurnAt, yardOf, refHpAt } from './refit-measure';

const ON = !!process.env.TEND_MEASURE, N = Math.max(1, Number(process.env.TEND_N) || 8);
const LEVELS = [1, 5, 10, 20];
const ALLIN: Record<number, [number, number]> = { 1: [7, 1], 5: [8, 1], 10: [10, 2], 20: [10, 4] }; // [Insight = Empathy, Dexterity]

function sheet(level: number, allin: boolean, mender: boolean) {
  const [ie, dex] = ALLIN[level], v = allin ? ie : 4;
  return { level, classId: mender ? 'bard' : null, skills: { empathy: v, dexterity: dex, camaraderie: 0 }, attrs: { insight: v, agility: Math.max(1, dex) }, weapon: 'service_pistol' };
}
function rig(level: number, allin: boolean, mender: boolean, foes = 3) {
  const s = storyWith([sheet(level, allin, mender), { name: 'A', level }, { name: 'B', level }, { name: 'C', level }]);
  s.g.characters[s.chars[0].id].offHand = { id: 'attuner' };
  s.act({ type: 'narrator/turn', turn: { narration: 'Measure', combat: { name: 'Tend', map: 'yard16', difficulty: 'standard', level,
    enemies: Array.from({ length: foes }, (_, i) => ({ name: 'Soldier ' + (i + 1), tier: 'soldier', weapon: 'hellraiser_service_rifle', at: '', no_surrender: true, level })) } } });
  const cb = s.g.combat, pcs = cb.units.filter((u) => u.side === 'pc'), fs = cb.units.filter((u) => u.side === 'foe');
  pcs.forEach((u, i) => (u.pos = '3,' + (3 + i))); fs.forEach((u, i) => (u.pos = '8,' + (3 + i)));
  const me = pcs[0]; cb.turn = cb.order.indexOf(me.id); withGame(s.g, () => beginTurn(cb, s.g.rng)); me.ap = 6;
  const act = (id: string, args: any) => withGame(s.g, () => { const x = { u: me, c: s.g.characters[me.charId], cb, g: s.g }, err = runPerkAction(x, id, args, s.g.rng, 'combat'); if (!err) acted(cb, me, { action: perkActionId(x, id, args.actionId), t: args.targetId ? cb.units.find((v) => v.id === args.targetId) : null }); return err; });
  return { s, cb, me, allies: pcs.slice(1), fs, act, c: s.g.characters[me.charId] };
}
/** The healing turn: every ally Bonded and hurt; 6 AP of heals. */
function healTurn(level: number, allin: boolean, mender: boolean): number {
  const r = rig(level, allin, mender);
  for (const a of r.allies) { tie(r.cb, r.me, a, 'bond'); a.maxHp = 5000; a.hp = 100; a.healRecv = 1; }
  const hp0 = r.allies.reduce((t, a) => t + a.hp, 0);
  if (mender) r.act('class:medic.triage', { actionId: 'triage', targetId: r.allies[0].id });
  for (const a of mender ? r.allies.slice(1) : r.allies) { if (r.me.ap >= 2) r.act('verb:tend.mend', { targetId: a.id }); }
  return Math.round(((r.allies.reduce((t, a) => t + a.hp, 0) - hp0) / refHpAt(level)) * 100); // rules 1.36: percent of the reference HP
}
/** A turn of pistol shots at a Bonded Soldier: expected damage (the preview's chance x damage after armour). */
function shotTurn(level: number, allin: boolean, mender: boolean, bonds: 'solo' | 'squad', ledger = false): number {
  const r = rig(level, allin, mender), t = r.fs[0];
  if (bonds === 'solo') for (const f of r.fs) tie(r.cb, r.me, f, 'bond'); else { tie(r.cb, r.me, t, 'bond'); for (const a of r.allies) tie(r.cb, r.me, a, 'bond'); }
  const pv = withGame(r.s.g, () => previewAttack(r.cb, r.me, t, 'shot')), per = Math.max(1, Math.floor(pv.dmg.total) - (t.armour || 0)), p = (pv.pct ?? 0) / 100;
  const shots = Math.floor(6 / Math.max(1, pv.ap || 2));
  return shots * p * per + (ledger && mender ? p * 0.7 * ledgerCap(r.c) : 0);
}
describe('rules 1.33: the Tending and Mender lines', () => {
  (ON ? it : it.skip)('the healing turn, the offence, the strike', () => {
    const rows: Record<string, Record<number, number>> = {};
    const put = (k: string, l: number, v: number) => ((rows[k] ||= {})[l] = v);
    for (const l of LEVELS) {
      const yard = yardOf(l, N);
      put('heal: Mender all in', l, healTurn(l, true, true)); put('heal: door all in', l, healTurn(l, true, false)); put('heal: door normal', l, healTurn(l, false, false));
      put('offence: Mender solo (3 Bonds)', l, Math.round((shotTurn(l, true, true, 'solo') / yard) * 100));
      put('offence: Mender squad (4 Bonds)', l, Math.round((shotTurn(l, true, true, 'squad') / yard) * 100));
      put('offence: door all in (solo)', l, Math.round((shotTurn(l, true, false, 'solo') / yard) * 100));
      put('strike: Mender solo, Ledger full', l, Math.round((shotTurn(l, true, true, 'solo', true) / yard) * 100));
      put('rifle-turn (yard)', l, Math.round(yard * 10) / 10);
    }
    let md = '| Line | L1 | L5 | L10 | L20 | Mean |\n|---|---|---|---|---|---|\n';
    for (const [k, v] of Object.entries(rows)) { const xs = LEVELS.map((l) => v[l]); md += '| ' + k + ' | ' + xs.join(' | ') + ' | ' + Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) + ' |\n'; }
    console.log(md);
    expect(Object.keys(rows).length).toBeGreaterThan(0);
  }, 3600000);
});
