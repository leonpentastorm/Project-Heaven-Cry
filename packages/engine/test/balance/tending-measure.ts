// @ts-nocheck (a measuring tool)
// The Tending and Mender lines' measures (rules 1.33, 1.36), shared by tending-measure.test.ts (the report) and the systems
// measure (systems-measure.test.ts; the balance contract's guard of rules 1.38, withdrawn by rules 1.94). The sheet: bonds-spec.md section 7.
import { storyWith, withGame } from '../helpers/perkfight';
import { beginTurn, previewAttack } from '../../src';
import { runPerkAction, perkActionId } from '../../src/effects/actions';
import { acted } from '../../src/combat';
import { tie } from '../../src/kit';
import { ledgerCap } from '../../src/character';
import { soldierTurnAt, yardOf, refHpAt } from './refit-measure';

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
export function healTurn(level: number, allin: boolean, mender: boolean): number {
  const r = rig(level, allin, mender);
  for (const a of r.allies) { tie(r.cb, r.me, a, 'bond'); a.maxHp = 5000; a.hp = 100; a.healRecv = 1; }
  const hp0 = r.allies.reduce((t, a) => t + a.hp, 0);
  if (mender) r.act('class:medic.triage', { actionId: 'triage', targetId: r.allies[0].id });
  for (const a of mender ? r.allies.slice(1) : r.allies) { if (r.me.ap >= 2) r.act('verb:tend.mend', { targetId: a.id }); }
  return Math.round(((r.allies.reduce((t, a) => t + a.hp, 0) - hp0) / refHpAt(level)) * 100); // rules 1.36: percent of the reference HP
}
/** A turn of pistol shots at a Bonded Soldier: expected damage (the preview's chance x damage after armour). */
export function shotTurn(level: number, allin: boolean, mender: boolean, bonds: 'solo' | 'squad', ledger = false): number {
  const r = rig(level, allin, mender), t = r.fs[0];
  if (bonds === 'solo') for (const f of r.fs) tie(r.cb, r.me, f, 'bond'); else { tie(r.cb, r.me, t, 'bond'); for (const a of r.allies) tie(r.cb, r.me, a, 'bond'); }
  const pv = withGame(r.s.g, () => previewAttack(r.cb, r.me, t, 'shot')), per = Math.max(1, Math.floor(pv.dmg.total) - (t.armour || 0)), p = (pv.pct ?? 0) / 100;
  const shots = Math.floor(6 / Math.max(1, pv.ap || 2));
  return shots * p * per + (ledger && mender ? p * 0.7 * ledgerCap(r.c) : 0);
}
/** Rules 1.56, Bonds 2.0 slice 1: one Snap (1 AP) on a Bonded Soldier, the HP it loses (three Bonds held: the solo
 * Mender's; ledger: the Ledger full first). Through the action itself (its own rules: the Bonds' bonus, the Ledger's). */
export function snapHit(level: number, allin: boolean, mender: boolean, ledger = false): number {
  const r = rig(level, allin, mender), t = r.fs[0];
  for (const f of r.fs) tie(r.cb, r.me, f, 'bond');
  if (ledger && mender) r.me.res = { ...(r.me.res || {}), ledger: ledgerCap(r.c) };
  t.maxHp = 5000; t.hp = 5000;
  r.act('verb:tend.snap', { targetId: t.id });
  return 5000 - t.hp;
}
/** One Snap (1 AP) into a Bonded ally, in percent of the reference HP (as healTurn). */
export function snapHeal(level: number, allin: boolean, mender: boolean): number {
  const r = rig(level, allin, mender), a = r.allies[0];
  tie(r.cb, r.me, a, 'bond'); a.maxHp = 5000; a.hp = 100; a.healRecv = 1;
  r.act('verb:tend.snap', { targetId: a.id });
  return Math.round(((a.hp - 100) / refHpAt(level)) * 100);
}
