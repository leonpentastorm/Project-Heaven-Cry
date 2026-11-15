// @ts-nocheck (a measuring tool, like the rest of test/balance)
// THE DURABILITY TANK (0.28.3, docs/design/proposals/2026-11-tank-fit.md). Leon on live 0.28.2: the all-in Durability
// tank "can't hit" and its Guard "blocks nothing". This plays Survival's stage 1 through the reducer (the camp's
// Recommended loadout, the generated fights, the simulator's policies through Rec.fight, as survival-run.ts does) and
// measures, for each character of the party, per fight:
//   attacks it made and how many hit (its hit chance against the stage's foes), damage it dealt,
//   hits aimed at it, the damage those hits brought (before Guard), what Guard took off them, what reached it,
//   AP it spent on Guard (Brace, the Guard technique, Raise Shield).
// Nothing here decides a rule: every number is the engine's; only the choices (the policies, the walk) are the
// simulator's. Damage and soak are read on the hook bus during the real reducer's actions only (an event on a copy a
// policy or the enemy AI previews is dropped: its unit is not in the game the action left).
import { maxHp } from '../../src';
import { onHook } from '../../src/effects/hooks';
import { Rec, type Pc } from '../helpers/replay';
import { survivalRoom, ownerOf } from '../helpers/survival';
import { BUILD, BUILDS } from './builds';
import { POLICIES } from './policies';
import { simRun, MEMBER, MEMBER_OLD, PARTIES } from './survival-run';

// ---------- the builds: the camp's tank archetypes (data/archetypes.json), made legally by builds.ts ----------
const reg = (def: any) => { if (!BUILD[def.id]) { BUILDS.push(def); BUILD[def.id] = def; } return def.id; };
/** Living Wall (archetypes.json `living_wall`, the All-in tank): Durability to the ceiling, then Pain Threshold, Guts. */
reg({ id: 'wall', label: 'Living Wall', way: 't', kit: 'soldier', main: 'durability', classId: 'defender', policy: 'tank',
  weights: { durability: 0.7, pain_threshold: 0.2, guts: 0.1 }, allin: ['durability', 'pain_threshold', 'guts'], spare: ['strength', 'agility', 'perception'],
  perks: 'none', techniques: 'default', note: 'The All-in tank: Durability 7 at level 1, nothing in a weapon skill.' });
/** Holdfast (archetypes.json `bulwark`): Durability 3 (a dabbler), Pain Threshold, Guts. */
reg({ id: 'holdfast', label: 'Holdfast', way: 't', kit: 'soldier', main: 'durability', classId: 'defender', policy: 'tank',
  weights: { pain_threshold: 0.4, durability: 0.3, guts: 0.3 }, allin: ['durability', 'pain_threshold', 'guts'], spare: ['strength', 'determination'],
  perks: 'none', techniques: 'default', note: 'The frontline tank archetype: Durability 3.' });

/** A tank that never presses Guard (the control): the gunner's policy on the same sheet. */
const noGuard = (x: any) => POLICIES.gunner(x);
(POLICIES as any).noguard = noGuard;

for (const [k, v] of Object.entries({
  wall: { build: 'wall', variant: 'allin', level: 1, policy: 'tank' },
  wall_noguard: { build: 'wall', variant: 'allin', level: 1, policy: 'noguard' },
  holdfast: { build: 'holdfast', variant: 'normal', level: 1, policy: 'tank' },
  holdfast_noguard: { build: 'holdfast', variant: 'normal', level: 1, policy: 'noguard' },
})) { (MEMBER as any)[k] = v; (MEMBER_OLD as any)[k] = v; }
Object.assign(PARTIES, {
  solo_wall: ['wall'], solo_wall_noguard: ['wall_noguard'], wall_gunner: ['wall', 'gunner'], wall_noguard_gunner: ['wall_noguard', 'gunner'],
  solo_holdfast: ['holdfast'], holdfast_gunner: ['holdfast', 'gunner'], wall_healer: ['wall', 'healer'], gunner_gunner: ['gunner', 'gunner'],
});

// ---------- the hook bus: what each unit took and dealt, in the real reducer's actions ----------
interface Tally { attacks: number; hits: number; dealt: number; aimed: number; incoming: number; soaked: number; reached: number; guardAp: number; turns: number; foeAttacksOn: number }
const blank = (): Tally => ({ attacks: 0, hits: 0, dealt: 0, aimed: 0, incoming: 0, soaked: 0, reached: 0, guardAp: 0, turns: 0, foeAttacksOn: 0 });
let PEND: { u: any; f: (t: Tally) => void }[] = [];
let ON = false;
const push = (u: any, f: (t: Tally) => void) => { if (ON && u && u.side === 'pc' && !u.companion) PEND.push({ u, f }); };
onHook('damage_in', (ctx: any) => {
  const u = ctx.t; if (!u || u.side !== 'pc' || ctx.self || !ctx.hostile || !(ctx.dmg >= 0)) return;
  const shielded = ctx.src?.shield !== false; if (ctx.phase !== (shielded ? 'shield' : 'reduce')) return;
  if (ctx._seen) return; ctx._seen = true;
  const soaked = ctx.guardSoaked || 0, reached = Math.max(0, Math.floor(ctx.dmg));
  push(u, (t) => { t.aimed++; t.soaked += soaked; t.reached += reached; t.incoming += soaked + reached; });
});
onHook('on_hit', (ctx: any) => { const a = ctx.att, v = ctx.tgt; if (a?.side === 'pc' && v?.side !== 'pc') push(a, (t) => { t.attacks++; t.hits++; t.dealt += ctx.dmg || 0; }); if (v?.side === 'pc' && a?.side !== 'pc') push(v, (t) => { t.foeAttacksOn++; }); });
onHook('on_miss', (ctx: any) => { const a = ctx.att, v = ctx.tgt; if (a?.side === 'pc' && v?.side !== 'pc') push(a, (t) => { t.attacks++; }); if (v?.side === 'pc' && a?.side !== 'pc') push(v, (t) => { t.foeAttacksOn++; }); });

/** Wrap a recorder's act: the events of its real action are kept (by character), a copy's are dropped. Guard AP is the
 * AP an action spent when it raised the unit's Guard or set it (Brace, the Guard technique, Raise Shield). */
function instrument(r: Rec, per: Record<string, Tally>) {
  const a0 = r.act.bind(r);
  r.act = (a: any, who?: string) => {
    PEND = []; ON = true;
    const cb0 = r.g.combat, before = cb0 ? Object.fromEntries(cb0.units.filter((u: any) => u.side === 'pc').map((u: any) => [u.id, { ap: u.ap, g: u.res?.guard || 0, braced: !!u.braced, guardOn: !!u.tech?.guard?.on }])) : {};
    let e; try { e = a0(a, who); } finally { ON = false; }
    const cb = r.g.combat; if (!cb) { PEND = []; return e; }
    const live = new Set(cb.units);
    for (const p of PEND) if (live.has(p.u) && p.u.charId) p.f((per[p.u.charId] ||= blank()));
    PEND = [];
    if (!e && (a.type === 'combat/brace' || (a.type === 'combat/technique' && ['guard', 'raise_shield'].includes(a.id)))) {
      const u = cb.units.find((q: any) => q.id === (a.unitId || cb.order[cb.turn])) || cb.units.find((q: any) => q.side === 'pc' && before[q.id] && before[q.id].ap > q.ap);
      if (u && before[u.id]) (per[u.charId] ||= blank()).guardAp += Math.max(0, before[u.id].ap - u.ap);
    }
    return e;
  };
}

export interface TankRow { party: string; who: string; seeds: number; fights: number; cleared: number; tally: Tally }
/** Stage 1 of Survival for `party` over `seeds` seeds (survival-run.ts simRun, stage cap 1), measured per character. */
export function stage1(party: string, seeds: number, prefix = 'TANK'): TankRow[] {
  const out: Record<string, TankRow> = {}; let cleared = 0, fights = 0;
  const RecProto: any = Rec.prototype, fight0 = RecProto.fight;
  let per: Record<string, Tally> = {};
  RecProto.fight = function (this: Rec, ...args: any[]) { if (!this.__tank) { this.__tank = true; instrument(this, per); } return fight0.apply(this, args); };
  try {
    for (let i = 0; i < seeds; i++) {
      per = {};
      const res = simRun({ party, route: 'gear', seed: prefix + '-' + (i + 1), maxStages: 1 });
      if (res.cleared >= 1) cleared++; fights += res.fights.length;
      PARTIES[party].forEach((m, k) => { const id = 'c' + (k + 1), t = per[id] || blank(); const row = (out[m + '#' + k] ||= { party, who: m, seeds: 0, fights: 0, cleared: 0, tally: blank() });
        row.seeds++; row.fights += res.fights.length; for (const f of Object.keys(t)) (row.tally as any)[f] += (t as any)[f]; });
    }
  } finally { RecProto.fight = fight0; }
  for (const r of Object.values(out)) r.cleared = cleared;
  return Object.values(out);
}
const pc = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
const per1 = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 10) / 10 : 0);
export const tankLine = (r: TankRow) => { const t = r.tally;
  return r.party + ' · ' + r.who + ': stage 1 cleared ' + r.cleared + '/' + r.seeds + ' · ' + r.fights + ' fights · to hit ' + pc(t.hits, t.attacks) + '% (' + t.attacks + ' attacks) · dealt ' + per1(t.dealt, r.fights) + '/fight · hits aimed at it ' + per1(t.aimed, r.fights) + '/fight · incoming ' + per1(t.incoming, r.fights) + '/fight · Guard took ' + per1(t.soaked, r.fights) + '/fight (' + pc(t.soaked, t.incoming) + '%) · reached it ' + per1(t.reached, r.fights) + '/fight · Guard AP ' + per1(t.guardAp, r.fights) + '/fight'; };
void maxHp; void survivalRoom; void ownerOf;
export type { Pc };
