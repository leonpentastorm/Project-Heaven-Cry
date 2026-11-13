// @ts-nocheck (a measuring tool; see faith-measure.test.ts)
// The Faith step of the balance pass (rules 1.21, docs/design/handoffs/faith-fit.md; re-measured for rules 1.22,
// docs/design/handoffs/faith-round-2.md: the Hymn on its cooldown, the vow's cut, a Hymn turn and a quiet turn apart): what a character who leads with
// prayer is worth, patron by patron, against the plain rifle on the simulator's shooting range (sim.ts: a target with a
// Soldier's numbers at the character's level and 5,000 HP that never acts).
//
// WHO IS MEASURED. builds.ts's Faith build (Faith the main skill at a normal share, or all in; Guardian; the service
// rifle), sworn in turn to each of the eight patrons, at the Devotion a played character has at that level
// (DEVOTION_BY_LEVEL below, from the spec's own pace: about 18 Devotion XP a session). It is played by the `prayer`
// policy (policies.ts): a Hymn when the cooldown allows one, a Whisper every turn, the rifle with the AP that is left.
//
// WHAT IS COUNTED. Damage, as a percent of what the plain rifle (normal share, same level) deals over the same turns:
// that is the simulator's own count. What a prayer is worth when it is NOT damage (a heal, a shield, a lost enemy turn,
// a bonus to an ally) is not something the simulator can count; `supportWorth` prices it by the rules written beside
// it, in the same unit (percent of a plain rifle's turn), and every such figure is an ESTIMATE.
import { runCell, runFight, MAP_ID, TIER_WEAPON } from './sim';
import { BUILD, BUILDS, buildCharacter } from './builds';
import { prayerHarms } from './policies';
import { FAITH_PATRONS, FAITH_PATRON, WHISPERS, MAPS, ENEMY, blessingPower, prayerCooldown, devotionNow, maxHp, bindGame, newGame } from '../../src';
import * as ENGINE from '../../src';

export const F_LEVELS = [1, 3, 6, 9, 12, 20];
export const PATRON_IDS: string[] = FAITH_PATRONS.map((p) => p.id);
const r1 = (n: number) => Math.round(n * 10) / 10, pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
const sumIf = (o: Record<string, number>, re: RegExp) => Object.entries(o || {}).filter(([k]) => re.test(k)).reduce((n, [, v]) => n + v, 0);

/** The Devotion a played character has at each level. The spec's pace (Patrons and prayer): start 3 (45 XP), about 18
 * XP a session; level 3 ends session 1, then 300 XP a session (level 6 at session 7, 9 at session 14 or 15, 12 at
 * session 23, 20 at session 51). 45 + 18 × sessions: level 1 and 3: Devotion 3; level 6: 171 XP, Devotion 6; level 9:
 * 306 XP, Devotion 8; level 12: 459 XP, Devotion 10 (the first Miracle is there to be asked); level 20: 10, or between 5
 * and 10 when Miracles are asked (each costs 5 levels and about 19 sessions to earn back). */
export const DEVOTION_BY_LEVEL = (level: number) => (level >= 12 ? 10 : level >= 9 ? 8 : level >= 6 ? 6 : 3);
/** The session a level is reached in (300 XP a session after the first). */
export const SESSION_AT: Record<number, number> = { 1: 1, 3: 2, 6: 7, 9: 15, 12: 23, 20: 51 };

/** Register (once) the Faith build sworn to a patron; returns the build id. */
export function faithBuild(patron: string): string {
  const id = 'faith:' + patron;
  if (!BUILD[id]) { const def = { ...BUILD.faith, id, label: 'Faith (' + (FAITH_PATRON[patron]?.name || patron) + ')', belief: { kind: 'faithful', patron }, policy: 'prayer', devotionAt: DEVOTION_BY_LEVEL }; BUILDS.push(def); BUILD[id] = def; }
  return id;
}
/** Rules 1.31 (Classes 3.0 step 5): the Faith build as a DOOR user: the same sheet with no class (an "as if": the rules
 * give it the Chaplain at level 3; this measures what the door alone gives, the contract's whisper and hymn rows). */
export function doorFaithBuild(patron: string): string {
  const id = 'faith_door:' + patron;
  if (!BUILD[id]) { const def = { ...BUILD[faithBuild(patron)], id, label: 'Faith door (' + (FAITH_PATRON[patron]?.name || patron) + '; no class: an as if)', tweak: (c: any) => { c.classId = null; } }; BUILDS.push(def); BUILD[id] = def; }
  return id;
}
/** Rules 1.31: the Chaplain's own sheet (chaplain-spec.md section 7): Faith all in, then Dexterity (the weapon carries
 * Smite), the rest as the Faith build. The class's line, `balance.ceilings.chaplain_turn`. */
export function chaplainBuild(patron = 'old_overcast'): string {
  const id = 'chaplain:' + patron;
  if (!BUILD[id]) { const f = BUILD[faithBuild(patron)]; const def = { ...f, id, label: 'Chaplain, Faith all in + Dexterity (' + (FAITH_PATRON[patron]?.name || patron) + ')', allin: ['faith', 'dexterity', ...f.allin.filter((s: string) => s !== 'faith' && s !== 'dexterity')] }; BUILDS.push(def); BUILD[id] = def; }
  return id;
}
/** The dabbler: the plain rifleman with Faith 3 and Virtue 3 GIVEN to it (an "as if": the points are not taken from
 * anything, so this is the most a gunner could gain from prayer, not what a legal sheet gains), sworn at Devotion 3. */
export function dabblerBuild(patron = 'old_overcast', devotion = 3): string {
  const id = 'dabbler:' + patron + (devotion !== 3 ? ':' + devotion : '');
  if (!BUILD[id]) { const def = { ...BUILD.plain_gun, id, label: 'Plain gun + Faith 3 (' + patron + ')', belief: { kind: 'faithful', patron }, policy: 'prayer', devotionAt: () => devotion,
    tweak: (c) => { c.skills = { ...c.skills, faith: Math.max(3, c.skills.faith || 0) }; c.attrs = { ...c.attrs, virtue: Math.max(3, c.attrs.virtue || 1) }; } }; BUILDS.push(def); BUILD[id] = def; }
  return id;
}

/** The sheet's faith numbers at a level. */
export function faithSheet(patron: string, variant: string, level: number) {
  const b = buildCharacter(faithBuild(patron), variant as any, level), c = b.c, g = newGame('FS', { id: 'host', name: 'Host' });
  const was = bindGame(g); try { return { level, variant, faith: c.skills.faith || 0, virtue: c.attrs.virtue || 1, dexterity: c.skills.dexterity || 0, power: Math.round(blessingPower(c) * 100) / 100, cooldown: prayerCooldown(c), devotion: devotionNow(c), hp: maxHp(c), perks: (c.perks || []).map((p) => p.id + (p.tier === 'II' ? ' II' : '')) }; } finally { bindGame(was); }
}

export function rifleTurn(level: number, n: number, rounds = 8): number {
  const c = runCell({ build: 'plain_gun', variant: 'normal', level }, 'sim_range_soldier', 'open', n, { maxRounds: rounds, tag: 'fm' + rounds });
  return c.dmg / Math.max(1, c.turns);
}
export interface FRow { /** rules 1.22: a turn with a Hymn and a turn without one, damage and percent of the rifle */ hymnTurn: number; quietTurn: number; pctHymnTurn: number; pctQuietTurn: number; what: string; patron: string; level: number; variant: string; perTurn: number; prayerPerTurn: number; weaponPerTurn: number; pctRifle: number; pctPrayer: number; hymns: number; whispers: number; miracles: number; apPrayer: number; apWeapon: number; apUnspent: number; bigHit: number; bigWhat: string; peakTurn: number; saveFailPct: number | null; actions: Record<string, number>; errors: number }
/** One patron, one way of playing, n fights of `rounds` turns on the range. */
export function prayerRow(what: string, build: string, variant: string, level: number, n: number, yard: number, o: { opts?: any; rounds?: number; tier?: string; foes?: number; peak?: boolean } = {}): FRow {
  const c = runCell({ build, variant: variant as any, level, ...(o.opts ? { opts: o.opts } : {}), ...(o.peak ? { peak: true } : {}) }, o.tier || 'sim_range_soldier', 'open', n, { maxRounds: o.rounds || 8, tag: 'fm' + (o.rounds || 8), ...(o.foes ? { foes: o.foes } : {}) });
  const t = Math.max(1, c.turns), pr = c.dmg - c.attackDmg, conds = c.foeCondsOn + c.foeCondsResisted;
  const ht = (c as any).hymnTurnN ? (c as any).hymnTurnDmg / (c as any).hymnTurnN : 0, qt = (c as any).quietTurnN ? (c as any).quietTurnDmg / (c as any).quietTurnN : 0;
  return { hymnTurn: r1(ht), quietTurn: r1(qt), pctHymnTurn: pct(ht, yard), pctQuietTurn: pct(qt, yard), what, patron: BUILD[build].belief?.patron || '', level, variant, perTurn: r1(c.dmg / t), prayerPerTurn: r1(pr / t), weaponPerTurn: r1(c.attackDmg / t), pctRifle: pct(c.dmg / t, yard), pctPrayer: pct(pr / t, yard),
    hymns: Math.round((sumIf(c.actions, /^Hymn: /) / t) * 100) / 100, whispers: Math.round((sumIf(c.actions, /^Whisper: /) / t) * 100) / 100, miracles: r1(sumIf(c.actions, /^Miracle: /) / c.n),
    apPrayer: r1((c.apSpent.prayer || 0) / t), apWeapon: r1(((c.apSpent.attack || 0) + (c.apSpent.reload || 0)) / t), apUnspent: r1(c.apUnspent / t), bigHit: c.bigHit, bigWhat: c.bigHitWhat, peakTurn: c.peakTurn,
    saveFailPct: conds ? pct(c.foeCondsOn, conds) : null, actions: Object.fromEntries(Object.entries(c.actions).map(([k, v]) => [k, r1(v / c.n)])), errors: c.errors };
}
export const fline = (r: FRow) => r.what + ' L' + r.level + ' ' + r.variant + ': ' + r.perTurn + ' a turn (prayer ' + r.prayerPerTurn + ', weapon ' + r.weaponPerTurn + ') · ' + r.pctRifle + '% of the rifle (prayer alone ' + r.pctPrayer + '%) · a Hymn turn ' + r.hymnTurn + ' (' + r.pctHymnTurn + '%) · a quiet turn ' + r.quietTurn + ' (' + r.pctQuietTurn + '%) · Hymns a turn ' + r.hymns + ' · Whispers ' + r.whispers
  + ' · AP prayer ' + r.apPrayer + ' / weapon ' + r.apWeapon + ' / unspent ' + r.apUnspent + ' · biggest ' + r.bigHit + ' (' + r.bigWhat + ')' + (r.saveFailPct != null ? ' · conditions that held ' + r.saveFailPct + '%' : '') + (r.errors ? ' · ERRORS ' + r.errors : '');

/** What one Soldier of the fight's level deals to this character in one of its turns: the heal and shield yardstick
 * (docs/design/handoffs/faith-fit.md). Measured on the old 16 × 11 ground with the sides 11 tiles apart, where an enemy
 * does fire (on the simulator's 26 × 26 ground an enemy 13 tiles off never does: spec item 1086); the Soldier has
 * 5,000 HP so that it lives through all 10 rounds, and the character only shoots back. */
export function soldierTurn(level: number, n: number, build = 'plain_gun'): { taken: number; hitPct: number; rolls: number } {
  if (!MAPS.sim_old) MAPS.sim_old = { id: 'sim_old', name: 'Open ground (the 1.15 fit)', w: 16, h: 11, solid: [], cover: [], full: [], difficult: [], pcStart: ['2,5', '2,3', '2,7', '1,4', '1,6', '2,1'], foeStart: ['13,5', '13,3', '13,7', '14,4', '14,6', '13,1', '13,9'] };
  MAP_ID.old = 'sim_old';
  if (!ENEMY.sim_bag_soldier) { ENEMY.sim_bag_soldier = { ...ENEMY.soldier, id: 'sim_bag_soldier', name: 'Sandbag (soldier numbers)', hp: 5000 }; TIER_WEAPON.sim_bag_soldier = TIER_WEAPON.soldier; }
  let taken = 0, ft = 0, fa = 0, fh = 0;
  for (let i = 0; i < n; i++) { const r = runFight({ pcs: [{ build, variant: 'normal', level, policy: 'plain' }], foes: [{ tier: 'sim_bag_soldier' }], map: 'old' as any, seed: ['FAITH-FIRE', build, level, i].join('-'), maxRounds: 10 }), p = r.pcs[0];
    // only the Soldier's turns while the character stood count (a Downed character takes no more fire)
    const rounds = p.downedRound != null ? p.downedRound : r.rounds; taken += p.taken; ft += Math.max(1, Math.min(r.foeTurns, rounds)); fa += p.foeAttacks; fh += p.foeHits; }
  return { taken: r1(taken / ft), hitPct: pct(fh, fa), rolls: Math.round((fa / ft) * 100) / 100 };
}

// ---------- the inventory: every prayer, what it does, what it grows with ----------
const ROMAN = ['', 'I', 'II', 'III'];
const kindOf = (e: any): string => {
  const ops = (e.effects || []).map((f: any) => f.op), k: string[] = [];
  if (prayerHarms(e)) k.push('damage');
  if ((e.effects || []).some((f: any) => f.op === 'heal' || f.op === 'rewind_hp' || (f.op === 'aura' && JSON.stringify(f).includes('"heal"')))) k.push('heal');
  if (ops.includes('shield')) k.push('shield');
  if (ops.includes('cleanse')) k.push('cleanse');
  if ((e.effects || []).some((f: any) => (f.op === 'condition' && !['inspired', 'guarded'].includes(f.condition)) || ['knockback', 'swap_places', 'aura_break'].includes(f.op) || f.state === 'surrendered')) k.push('control');
  if ((e.effects || []).some((f: any) => ['roll_bonus', 'reroll', 'attack_mod', 'defense_bonus', 'resource', 'free_action', 'repair_gear', 'clear_jam', 'reveal', 'damage_share', 'roll_floor', 'negate_failure', 'safe_passage', 'no_opportunity'].includes(f.op) || (f.op === 'stat_mod' && String(f.stat).startsWith('ap')) || (f.op === 'state' && f.state !== 'surrendered'))) k.push('buff');
  return k.join(' + ') || 'other';
};
/** The flat numbers of an entry that Blessing power multiplies (damage, heal, shield). */
const amounts = (e: any): { what: string; base: number }[] => {
  const out: { what: string; base: number }[] = [];
  const walk = (fs: any[]) => { for (const f of fs || []) {
    if (f.op === 'stat_mod' && f.stat === 'hp' && Number(f.value) < 0) out.push({ what: 'damage', base: -Number(f.value) });
    if (f.op === 'heal' && typeof f.value === 'number') out.push({ what: 'heal', base: f.value });
    if (f.op === 'shield' && typeof f.value === 'number') out.push({ what: 'shield', base: f.value });
    if (f.op === 'execute' && f.boss_damage) out.push({ what: 'damage (a boss)', base: f.boss_damage });
    if (f.effects) walk(f.effects);
  } };
  walk(e.effects); return out;
};
export interface InvRow { patron: string; size: string; id: string; name: string; ap: number; gate: string; limit: string; kind: string; amounts: { what: string; base: number }[]; growsWith: string; text: string }
export function inventory(): InvRow[] {
  const rows: InvRow[] = [];
  for (const w of WHISPERS as any[]) { const am = amounts(w); rows.push({ patron: 'every patron', size: 'Whisper', id: w.id, name: w.name, ap: 1, gate: 'Faith 3', limit: 'one Whisper a turn', kind: kindOf(w), amounts: am, growsWith: am.length ? 'Blessing power (Faith)' : 'nothing', text: w.text }); }
  for (const p of FAITH_PATRONS as any[]) {
    for (const h of p.hymns || []) { const am = amounts(h); rows.push({ patron: p.name, size: 'Hymn ' + ROMAN[h.tier], id: h.id, name: h.name, ap: 3, gate: 'Devotion ' + [0, 3, 5, 7][h.tier], limit: 'the prayer cooldown', kind: kindOf(h), amounts: am, growsWith: am.length ? 'Blessing power (Faith)' : (h.effects || []).some((f: any) => f.save && f.save !== 'none' && f.save !== 'with_prone') ? 'Faith (the save is harder)' : 'nothing', text: h.text }); }
    const m = p.miracle; if (m) { const am = amounts(m); rows.push({ patron: p.name, size: 'Miracle', id: m.id, name: m.name, ap: 3, gate: 'Faith 7, Devotion 10', limit: 'once a session; Devotion −5 levels', kind: kindOf(m), amounts: am, growsWith: am.length ? 'Blessing power (Faith)' : 'nothing', text: m.text }); }
    const iv = p.intervention; if (iv) rows.push({ patron: p.name, size: 'Intervention', id: iv.trigger, name: 'Intervention', ap: 0, gate: 'Witnessed (Faith 5, after a Hymn)', limit: 'once a fight; twice from Devotion 7', kind: kindOf(iv), amounts: amounts(iv), growsWith: iv.scale === 'devotion' ? 'Devotion and Blessing power' : 'nothing', text: iv.text });
  }
  return rows;
}

// ---------- what a prayer that is not damage is worth (ESTIMATES; the rules are these lines) ----------
/** One Soldier-turn, the heal and shield pass's yardstick (docs/design/handoffs/heal-shield-pass.md, section 1.1: what
 * one Soldier of the fight's level takes off the plain rifleman in one of its turns, two Soldiers firing, 60 fights a
 * level). `soldierTurn` above is this file's own cross-check of it (one Soldier, fewer fights: it reads lower). */
export const SOLDIER_TURN: Record<number, number> = { 1: 18.5, 3: 21.5, 6: 25.4, 9: 32.4, 12: 37.8, 20: 60.2 };
/** Rules 1.20: prayer heals and shields grow with the caster's level (×1 when the engine has no such rule). */
const mend = (level: number): number => (typeof (ENGINE as any).mendFactor === 'function' ? (ENGINE as any).mendFactor(level) : 1);
const entryOf = (id: string): any => (WHISPERS as any[]).find((w) => w.id === id) || (FAITH_PATRONS as any[]).flatMap((p) => p.hymns || []).find((h) => h.id === id);
const num = (id: string, what: string): number => (amounts(entryOf(id) || {}).find((a) => a.what === what)?.base ?? 0);
const usesOf = (id: string, op: string): number => Number((entryOf(id)?.effects || []).find((f: any) => f.op === op)?.uses ?? 1);
/** In percent of a plain rifle's turn at the same level. `S` is one Soldier-turn, `R` what the plain rifle deals in a
 * turn, `P` the praying character's Blessing power, `level` its level, `fail` the chance a Soldier fails a save against
 * this character's prayers (measured), `shot` one plain shot's expected damage (R ÷ 3).
 * THE EXCHANGE: HP given back, or damage a Soldier does not get to deal, is set against the Soldier-turn S, and one
 * Soldier-turn kept off the squad counts as one plain rifle's turn of damage (R): both are "one fighter's turn". So a
 * heal of S HP reads 100%. An ally's attack that a prayer makes land counts as that ally's shot (the plain rifle's: a
 * third of R; an optimised gunner's shot is worth half again). Nothing is counted when there is nobody to use it on:
 * this is the worth of the prayer WHEN IT IS NEEDED (an ally is hurt, an enemy is shooting, an ally is about to fire).
 * Heal and shield numbers are read from the data as it stands, with the level factor of rules 1.20. */
export function supportWorth(id: string, x: { S: number; R: number; P: number; fail: number; level?: number }): { pct: number; why: string } | null {
  const { S, R, P, fail } = x, m = mend(x.level || 1), hp = (n: number) => pct(n, S), shot = R / 3, H = (what: string) => num(id, what) * P * m;
  switch (id) {
    // Whispers
    case 'health': return { pct: hp(H('heal')), why: 'heals ' + Math.round(H('heal')) };
    case 'protection': return { pct: hp(H('shield')), why: 'a ' + Math.round(H('shield')) + ' shield' };
    case 'luck': return { pct: pct(0.1 * shot, R), why: '+2 on one roll: a tenth of a shot' };
    case 'rebuke': return { pct: pct(num(id, 'damage') * P, R), why: Math.round(num(id, 'damage') * P) + ' Soul damage, no roll' };
    // Nerukhan
    case 'saints_shield': return { pct: hp(H('shield')), why: 'a ' + Math.round(H('shield')) + ' shield' };
    case 'absolution': return { pct: hp(H('heal')), why: 'heals ' + Math.round(H('heal')) + ' (the cleanse is not counted)' };
    // The Quartermaster
    case 'resupply': return { pct: pct(shot, R), why: 'a reload saved (2 AP: one shot); the Supply is not counted' };
    case 'dig_in': return { pct: 30, why: 'half cover and Braced: about 3 in 10 of a Soldier\'s hits on that ally miss, each round they stay' };
    case 'covering_fire': return { pct: Math.round(100 * fail * 0.4), why: 'Pinned (no move, −2 to hit): about 4 tenths of a turn lost, when the save fails; one enemy counted' };
    // The Laughing Mask
    case 'lucky_break': { const n = usesOf(id, 'reroll'); return { pct: pct(n * 0.85 * shot, R), why: n + ' missed shot' + (n > 1 ? 's' : '') + ' rerolled at +5 (each lands about 85% of the time)' }; }
    case 'switcheroo': return { pct: 0, why: 'position only: not priced' };
    case 'pratfall': return { pct: Math.round(100 * fail * 0.5), why: 'Prone and Disarmed: 3 of 6 AP to stand and pick the weapon up, when the save fails' };
    // The Toll-Keeper
    case 'coin_for_the_ferry': return { pct: 100, why: 'a Downed ally stands: one fighter\'s turn back (only when someone is Downed)' };
    case 'hold_the_gate': return { pct: 0, why: 'nobody drops for a round: not priced (worth a fighter when it saves one)' };
    case 'last_crossing': return { pct: 0, why: 'an enemy at a quarter HP dies: worth up to a quarter of its HP; not priced' };
    // Mother Ember
    case 'warm_hands': return { pct: hp(H('heal')), why: 'heals ' + Math.round(H('heal')) };
    case 'hearthlight': return { pct: hp(H('heal')), why: 'heals ' + Math.round(H('heal')) + ' a turn for 3 rounds to each ally who stays in it (one ally, one turn counted: ×3 over its life)' };
    case 'feed_the_fire': { const n = Number((entryOf(id)?.effects || []).find((f: any) => f.op === 'stat_mod')?.value ?? 1); return { pct: pct((n / 2) * shot, R), why: '+' + n + ' AP: ' + (n / 2) + ' of a shot' }; }
    // Old Overcast
    case 'thunderclap': return { pct: Math.round(100 * fail * 0.05), why: 'Shaken (−2 Heart saves) and a 1-tile push: little by itself (its damage is in the simulator\'s rows)' };
    case 'gather_the_clouds': return { pct: 0, why: 'only with Storm-tone Outbursts in the squad: not priced' };
    // The Matchmaker
    case 'red_thread': return { pct: 0, why: 'damage is shared, not prevented: not priced' };
    case 'sweet_nothings': return { pct: Math.round(100 * fail * 0.5), why: 'one enemy can\'t attack you or your linked allies for a round, when the save fails (it can still attack others: half a turn)' };
    case 'together': return { pct: pct(2 * 0.3 * shot, R) + 20, why: 'two allies: +2 to hit (3 tenths of a shot each over three shots) and +2 Defense (a tenth of a Soldier-turn each)' };
    // The Counting Weaver
    case 'foreknowing': { const n = usesOf(id, 'state'); return { pct: Math.round((100 * n) / 3.6), why: n + ' attack' + (n > 1 ? 's miss' : ' misses') + ': a Soldier rolls 3.6 times a turn' }; }
    case 'unravel': return { pct: 0, why: 'ends an enemy\'s boons and shield: worth what was on it; not priced' };
    case 'cut_short': return { pct: Math.round(100 * fail * 0.5), why: 'a Soldier loses its turn when the save fails; the same enemy at most every other round (rules 1.21), so half a Soldier-turn a round on one enemy' };
  }
  return null;
}
