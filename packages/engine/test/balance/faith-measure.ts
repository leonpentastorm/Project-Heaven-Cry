// @ts-nocheck (a measuring tool; see faith-measure.test.ts)
// The Faith step of the balance pass (rules 1.21; docs/design/handoffs/faith-fit.md): what a character who leads with
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
/** The dabbler: the plain rifleman with Faith 3 and Virtue 3 GIVEN to it (an "as if": the points are not taken from
 * anything, so this is the most a gunner could gain from prayer, not what a legal sheet gains), sworn at Devotion 3. */
export function dabblerBuild(patron = 'old_overcast'): string {
  const id = 'dabbler:' + patron;
  if (!BUILD[id]) { const def = { ...BUILD.plain_gun, id, label: 'Plain gun + Faith 3 (' + patron + ')', belief: { kind: 'faithful', patron }, policy: 'prayer', devotionAt: () => 3,
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
export interface FRow { what: string; patron: string; level: number; variant: string; perTurn: number; prayerPerTurn: number; weaponPerTurn: number; pctRifle: number; pctPrayer: number; hymns: number; whispers: number; miracles: number; apPrayer: number; apWeapon: number; apUnspent: number; bigHit: number; bigWhat: string; peakTurn: number; saveFailPct: number | null; actions: Record<string, number>; errors: number }
/** One patron, one way of playing, n fights of `rounds` turns on the range. */
export function prayerRow(what: string, build: string, variant: string, level: number, n: number, yard: number, o: { opts?: any; rounds?: number; tier?: string; foes?: number; peak?: boolean } = {}): FRow {
  const c = runCell({ build, variant: variant as any, level, ...(o.opts ? { opts: o.opts } : {}), ...(o.peak ? { peak: true } : {}) }, o.tier || 'sim_range_soldier', 'open', n, { maxRounds: o.rounds || 8, tag: 'fm' + (o.rounds || 8), ...(o.foes ? { foes: o.foes } : {}) });
  const t = Math.max(1, c.turns), pr = c.dmg - c.attackDmg, conds = c.foeCondsOn + c.foeCondsResisted;
  return { what, patron: BUILD[build].belief?.patron || '', level, variant, perTurn: r1(c.dmg / t), prayerPerTurn: r1(pr / t), weaponPerTurn: r1(c.attackDmg / t), pctRifle: pct(c.dmg / t, yard), pctPrayer: pct(pr / t, yard),
    hymns: Math.round((sumIf(c.actions, /^Hymn: /) / t) * 100) / 100, whispers: Math.round((sumIf(c.actions, /^Whisper: /) / t) * 100) / 100, miracles: r1(sumIf(c.actions, /^Miracle: /) / c.n),
    apPrayer: r1((c.apSpent.prayer || 0) / t), apWeapon: r1(((c.apSpent.attack || 0) + (c.apSpent.reload || 0)) / t), apUnspent: r1(c.apUnspent / t), bigHit: c.bigHit, bigWhat: c.bigHitWhat, peakTurn: c.peakTurn,
    saveFailPct: conds ? pct(c.foeCondsOn, conds) : null, actions: Object.fromEntries(Object.entries(c.actions).map(([k, v]) => [k, r1(v / c.n)])), errors: c.errors };
}
export const fline = (r: FRow) => r.what + ' L' + r.level + ' ' + r.variant + ': ' + r.perTurn + ' a turn (prayer ' + r.prayerPerTurn + ', weapon ' + r.weaponPerTurn + ') · ' + r.pctRifle + '% of the rifle (prayer alone ' + r.pctPrayer + '%) · Hymns a turn ' + r.hymns + ' · Whispers ' + r.whispers
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
/** In percent of a plain rifle's turn at the same level. `S` is what a same-level Soldier deals to a character in one of
 * its turns, `R` what the plain rifle deals in a turn, `P` the praying character's Blessing power, `fail` the chance a
 * Soldier fails a save against this character's prayers (measured), `shot` one plain shot's expected damage (R ÷ 3).
 * THE EXCHANGE: damage a Soldier does not get to deal, or HP given back, is set against the Soldier's turn S, and one
 * Soldier's turn kept off the squad counts as one plain rifle's turn of damage (R): both are "one fighter's turn". So
 * a heal of S HP is 100%. Nothing here is counted when there is nobody to use it on: these are the worth of the prayer
 * WHEN IT IS NEEDED (an ally is hurt, an enemy is shooting, an ally is about to fire). */
export function supportWorth(id: string, x: { S: number; R: number; P: number; fail: number }): { pct: number; why: string } | null {
  const { S, R, P, fail } = x, hp = (n: number) => pct(n, S), shot = R / 3;
  switch (id) {
    // Whispers
    case 'health': return { pct: hp(15 * P), why: 'heals ' + Math.round(15 * P) };
    case 'protection': return { pct: hp(15 * P), why: 'a ' + Math.round(15 * P) + ' shield' };
    case 'luck': return { pct: pct(0.1 * shot, R), why: '+2 on one roll: a tenth of a shot' };
    // Nerukhan
    case 'saints_shield': return { pct: hp(40 * P), why: 'a ' + Math.round(40 * P) + ' shield' };
    case 'absolution': return { pct: hp(30 * P), why: 'heals ' + Math.round(30 * P) + ' (the cleanse is not counted)' };
    // The Quartermaster
    case 'resupply': return { pct: pct(shot, R), why: 'a reload saved (2 AP: one shot); the Supply is not counted' };
    case 'dig_in': return { pct: Math.round(100 * 0.3), why: 'half cover and Braced: about 3 in 10 of a Soldier\'s hits on that ally miss, while they stay' };
    case 'covering_fire': return { pct: Math.round(100 * fail * 0.4), why: 'Pinned (no move, −2 to hit): about 4 tenths of a turn lost, when the save fails; one enemy counted' };
    // The Laughing Mask
    case 'lucky_break': return { pct: pct(0.35 * shot, R), why: 'one missed shot in three rerolled at +5' };
    case 'switcheroo': return { pct: 0, why: 'position only: not priced' };
    case 'pratfall': return { pct: Math.round(100 * fail * 0.5), why: 'Prone and Disarmed: 3 of 6 AP to stand and pick the weapon up, when the save fails' };
    // The Toll-Keeper
    case 'coin_for_the_ferry': return { pct: 100, why: 'a Downed ally stands: one fighter\'s turn back (only when someone is Downed)' };
    case 'hold_the_gate': return { pct: 0, why: 'nobody drops for a round: not priced (worth a fighter when it saves one)' };
    case 'last_crossing': return { pct: 0, why: 'counted as damage by the simulator when the target is at a quarter HP' };
    // Mother Ember
    case 'warm_hands': return { pct: hp(40 * P), why: 'heals ' + Math.round(40 * P) };
    case 'hearthlight': return { pct: hp(10 * P), why: 'heals ' + Math.round(10 * P) + ' a turn for 3 rounds to each ally who stays in it (one ally, one turn counted: ×3 over its life)' };
    case 'feed_the_fire': return { pct: pct(shot / 2, R), why: '+1 AP: half a shot' };
    // Old Overcast
    case 'thunderclap': return { pct: Math.round(100 * fail * 0.05), why: 'Shaken (−2 Heart saves) and a 1-tile push: little by itself' };
    case 'gather_the_clouds': return { pct: 0, why: 'only with Storm-tone Outbursts in the squad: not priced' };
    // The Matchmaker
    case 'red_thread': return { pct: 0, why: 'damage is shared, not prevented: not priced' };
    case 'sweet_nothings': return { pct: Math.round(100 * fail * 0.5), why: 'one enemy can\'t attack you or your linked allies for a round, when the save fails (it can still attack others: half a turn)' };
    case 'together': return { pct: pct(2 * 0.3 * shot, R) + Math.round(100 * 0.1 * 2), why: 'two allies: +2 to hit (3 tenths of a shot each over three shots) and +2 Defense (a tenth of a Soldier\'s turn each)' };
    // The Counting Weaver
    case 'foreknowing': return { pct: 33, why: 'one attack misses: a third of a Soldier\'s turn' };
    case 'unravel': return { pct: 0, why: 'ends an enemy\'s boons and shield: worth what was on it; not priced' };
    case 'cut_short': return { pct: Math.round(100 * fail), why: 'a Soldier loses its turn, when the save fails' };
  }
  return null;
}
