// @ts-nocheck (a recording tool; see harness.ts)
// THE GOLDEN TABLES, the list of actions (step a0 of the damage-formula migration). record() plays every action below
// on today's engine and returns one line per action: the key says who did what to whom, the value is what the engine
// produced and what landed (harness.ts explains the line). test/golden-damage.test.ts compares it with
// test/golden/damage.json, exactly; GOLDEN_RECORD=1 writes the file anew (on purpose only: a re-expression of the
// formula must leave every line as it is).
//
// Sections (the key's first word):
//   build     the simulator's reference builds (balance/builds.ts) at levels 1, 3, 6, 9, 12, 20, normal share and all in:
//             the sheet's multipliers, the plain attack on each tier (preview, hit, critical), what each tier's plain
//             attack does to it, every technique on its pad, its Lines (Sigil), its Outburst by stage, its prayers
//   weapon    every weapon's plain attack from one fixed character on each tier; special rounds, mods, wear, conditions
//   enemy     each tier's attack at levels 1, 6, 12, 20 on a character in each armour Class; an enemy's blast
//   tech      every technique with the weapons of its system, on a Soldier and an Elite
//   sigil     a 2, 3 and 4-glyph Line for every Subject word, aimed at an enemy and at an ally; areas; a critical
//   outburst  every school at stages 0 to 4, plain and with a feeling; every feeling, tone, shape and Damage mode
//   faith     every patron's Whispers, Hymns and Miracle; the intervention's amount by Devotion, and one fired
//   item      every perk (each tier), trait and class move (each rank): a shot and a blow with it held, a hit taken
//             with it held, and each action it puts on the pad
//   flat      thrown items, blasts, barrels, traps, hazards, damage over time, the medic's kit
import { buildCharacter, BUILDS, LEVELS, VARIANTS } from '../balance/builds';
import { A, W, act, run, tryAct, strike, useTech, copy, bend, HIT, CRIT, rollState, fightOf, fightSpec, place, turn, units, pcs, foes, charOf, TIERS, isMeleeW } from './harness';

export type Table = Record<string, string>;
const clone = copy;
const byId = (g: any, id: string) => units(g).find((u) => u.id === id);
const r3 = (v: number) => Math.round(v * 1000) / 1000;
/** Write a line, unless the action produced no number at all (a stance, a condition, a refusal that says nothing). */
const put = (T: Table, key: string, line: string) => { if (line && line !== '=>') T[key] = line; };
const pvLine = (pv: any) => (!pv.ok ? 'NO ' + String(pv.why || '').slice(0, 70) : 'pv ' + r3(pv.dmg?.total ?? 0) + ' a' + (pv.dmg?.armour ?? 0) + ' c' + r3(pv.dmg?.crit ?? 0) + (pv.dmg?.pierce ? ' p' + pv.dmg.pierce : ''));
const attackMode = (wid: string) => (isMeleeW(wid) ? 'melee' : 'shot');
/** The actor at 3,5 (a gun, a spell) or 6,5 (a blade), the target at 7,5; everyone else out of the way. */
function face(g: any, u: any, t: any, melee: boolean) { place(g, [[u, melee ? '6,5' : '3,5'], [t, '7,5']]); }
const meters = (g: any, u: any, t: any) => { if (u.resMax?.momentum != null) { u.res ||= {}; u.res.momentum = u.resMax.momentum; } try { t.pressure = W(g, () => A.pressureCap(t)); } catch { /* no Pressure on this unit */ } };

// ---------------------------------------------------------------------------------------------- plain attacks
/** A plain attack by unit uId on unit tId in g (already placed, uId's turn): the preview, a hit and (crit) a critical. */
function plainAttack(T: Table, key: string, g: any, uId: string, tId: string, mode: string, crit = true) {
  const u = byId(g, uId), t = byId(g, tId);
  T[key] = [pvLine(W(g, () => A.previewAttack(g.combat, u, t, mode))), 'hit ' + strike(g, uId, tId, mode, HIT).line, ...(crit ? ['crit ' + strike(g, uId, tId, mode, CRIT).line] : [])].join(' | ');
}
/** An enemy's plain attack on a unit, straight through resolveAttack (no AI): a hit and (crit) a critical. */
function foeAttack(T: Table, key: string, g: any, fId: string, tId: string, crit = true) {
  const one = (d: any) => run(g, (g2, cb) => {
    const a = byId(g2, fId), p = byId(g2, tId), mode = attackMode(a.weapon);
    a.ap = 9; a.braced = true; a.heat = 0; a.shotsThisTurn = 0; cb.turn = cb.order.indexOf(a.id);
    const r = A.resolveAttack(cb, g2.rng, a, p, mode, null); return r.refused || null;
  }, d).line;
  T[key] = ['hit ' + one(HIT), ...(crit ? ['crit ' + one(CRIT)] : [])].join(' | ');
}

// ---------------------------------------------------------------------------------------------- techniques
const TECH_TRIES = (g: any, u: any, t: any, ally: any) => [
  { targetId: t.id, tile: t.pos }, { targetId: t.id, tile: t.pos, opt: 'head' }, { targetId: t.id }, { tile: t.pos }, {},
  ...(ally ? [{ allyId: ally.id }, { allyId: ally.id, targetId: t.id }] : []), { targetId: t.id, tile: '8,5' }, { tile: '5,5' },
];
/** Use a technique with the first arguments its own preview accepts. Returns null when no arguments are accepted. */
function technique(T: Table, key: string, g: any, uId: string, tId: string, id: string): { line: string; ok: boolean } | null {
  const u = byId(g, uId), t = byId(g, tId), ally = pcs(g).find((x) => x.id !== uId);
  for (const args of TECH_TRIES(g, u, t, ally)) {
    let pv: any; try { pv = W(g, () => A.previewTechnique(g.combat, u, id, { ...args }, g)); } catch { continue; }
    if (!pv?.ok) continue;
    const r = useTech(g, uId, id, args, HIT); if (!r.ok) continue;
    if (r.line !== '=>') T[key] = r.line; return r;
  }
  return null;
}

// ---------------------------------------------------------------------------------------------- Sigil
/** Draw a Line walking away from the target along row 5 (ending on the last glyph) and Evoke it at aim. */
function line(g: any, uId: string, words: string[], aim: string, d: any = HIT, seed = 4242, after?: (g2: any, cb: any) => void): string {
  return run(g, (g2, cb) => {
    const u = byId(g2, uId), tiles = words.map((_, i) => (5 - i) + ',5');
    u.ap = 99; if (u.mg) { u.mg.charge = 999; u.mg.flux = -99; }
    for (let i = 0; i < words.length; i++) { u.pos = tiles[i]; const e = A.drawGlyph(cb, g2.rng, u, words[i]); if (e) return 'Draw ' + words[i] + ': ' + e; }
    g2.rng.state = seed;
    const e = A.evoke(cb, g2.rng, u, tiles[tiles.length - 1], aim); if (e) return 'Evoke: ' + e;
    if (after) after(g2, cb);
    return null;
  }, d, seed).line;
}

// ---------------------------------------------------------------------------------------------- Outburst
/** Begin a design (held), Pump it to a stage (the first Pumps with the feelings given, the rest plain) and Release it. */
function outburst(g: any, uId: string, design: string, stage: number, aim: string, feelings: string[] = [], d: any = HIT, seed = 4242): string {
  return run(g, (g2, cb) => {
    const u = byId(g2, uId); u.ap = 99;
    let e = A.beginOutburst(cb, g2.rng, u, design, undefined, true, {}); if (e) return 'Begin: ' + e;
    for (let i = 0; i < stage; i++) { u.ap = 99; e = A.pumpOutburst(cb, g2.rng, u, feelings[i] || null); if (e) return 'Pump ' + (i + 1) + ': ' + e; }
    u.ap = 99; g2.rng.state = seed; e = A.releaseOutburst(cb, g2.rng, u, aim); return e ? 'Release: ' + e : null;
  }, d, seed).line;
}

// ---------------------------------------------------------------------------------------------- prayers
const PRAY_TRIES = (g: any, u: any, t: any, ally: any) => [{ targetId: t.id }, ...(ally ? [{ targetId: ally.id }, { targetId: ally.id, targetId2: t.id }] : []), { targetId: u.id }, {}, { tile: t.pos }, { targetId: t.id, tile: '8,5' }, ...(ally ? [{ targetId: ally.id, tile: '4,6' }] : [])];
function prayers(T: Table, key: string, g: any, uId: string, tId: string, max: { hymn: number; miracle: boolean }) {
  const u = byId(g, uId), t = byId(g, tId), c = charOf(g, u), p = A.FAITH_PATRON[c.patron || c.belief?.patron], ally = pcs(g).find((x) => x.id !== uId);
  if (!p) return;
  const tries = PRAY_TRIES(g, u, t, ally);
  for (const w of A.WHISPERS) put(T, key + '/whisper/' + w.id, tryAct(g, { type: 'combat/pray', unitId: uId, kind: 'whisper', id: w.id }, tries, HIT).line);
  for (const h of p.hymns) if (h.tier <= max.hymn) put(T, key + '/hymn/' + h.id, tryAct(g, { type: 'combat/pray', unitId: uId, kind: 'hymn', id: h.id }, tries, HIT).line);
  if (max.miracle) put(T, key + '/miracle/' + p.miracle.id, tryAct(g, { type: 'combat/pray', unitId: uId, kind: 'miracle', id: p.miracle.id }, tries, HIT).line);
}

// ============================================================================================== build
const MATE: Record<number, any> = {};
export function recordBuilds(T: Table, variants: string[] = VARIANTS) {
  for (const b of BUILDS) for (const v of variants) for (const L of LEVELS) {
    const key = 'build/' + b.id + '/' + v + '/L' + L, built = buildCharacter(b.id, v, L);
    const g0 = fightOf([built.c, ...(b.id === 'faith' || b.id === 'outburst' || b.id === 'sigil' ? [JSON.parse(JSON.stringify(MATE[L] ||= buildCharacter('plain_gun', 'normal', L).c))] : [])], TIERS.map((tier) => ({ tier })), { level: L, seed: key });
    const u0 = pcs(g0)[0], c = charOf(g0, u0), melee = isMeleeW(u0.weapon), mode = attackMode(u0.weapon);
    T[key + '/sheet'] = W(g0, () => ['weapon ' + u0.weapon + ' x' + r3(A.weaponMult(c, u0.weapon)), 'rarity ' + r3(u0.dmgMult || 1), 'sigil ' + r3(A.sigilMult(c)), 'elemental ' + r3(A.elementalMult(c)), 'soul ' + r3(A.soulMult(c)),
      'healing ' + r3(A.healingMult(c)), 'blessing ' + r3(A.blessingPower(c)), 'crit ' + r3(A.critMult(c)), 'mend ' + r3(A.mendFactorOf(u0)), 'hp ' + u0.maxHp, 'armour ' + u0.armour, 'def ' + u0.def,
      ...(u0.mg ? ['unit sigil ' + r3(u0.mg.sigilMult ?? 0) + ' elem ' + r3(u0.mg.elemMult ?? 0) + ' soul ' + r3(u0.mg.soulMult ?? 0) + ' heal ' + r3(u0.mg.healMult ?? 0) + ' base ' + (u0.mg.soulBase ?? '')] : [])].join(', '));
    for (const tier of TIERS) {
      const g = clone(g0), u = pcs(g)[0], t = foes(g).find((x) => x.tier === tier)!;
      face(g, u, t, melee); turn(g, u);
      plainAttack(T, key + '/plain/' + tier, g, u.id, t.id, mode, tier === 'soldier');
      // what that tier's own attack does to the build (the enemy next to it for a bite or a blade, 4 tiles off with a gun)
      const gb = clone(g0), ub = pcs(gb)[0], tb = foes(gb).find((x) => x.tier === tier)!; face(gb, tb, ub, isMeleeW(tb.weapon));
      foeAttack(T, key + '/taken/' + tier, gb, tb.id, ub.id, false);
      // every technique on the pad, on a Soldier, its price met (Momentum full, the target Pressed as far as it goes)
      if (tier !== 'soldier') continue;
      meters(g, u, t);
      const pad = W(g, () => A.techniquePad(g.combat, u, 'main', g)).flatMap((x: any) => x.entries).filter((e: any) => e.group !== 'answer' && e.group !== 'watch' && !['cut', 'shot'].includes(e.id));
      for (const e of pad) technique(T, key + '/tech/' + e.id, g, u.id, t.id, e.id);
    }
    // its Lines, its Outburst, its prayers: on a Soldier
    const gs = clone(g0), us = pcs(gs)[0], ts = foes(gs).find((x) => x.tier === 'soldier')!; place(gs, [[us, '5,5'], [ts, '9,5'], ...(pcs(gs)[1] ? [[pcs(gs)[1], '4,6'] as [any, string]] : [])]); turn(gs, us, 99);
    if (us.mg?.evoker && (us.mg.words || []).length) {
      const known: string[] = us.mg.words, subj = known.filter((w) => A.SIGIL[w]?.damage), max = us.mg.maxWords || 2;
      for (const s of subj) {
        const lines = [[s, 'seek'], [s, 'condense', 'seek'], [s, subj.find((x) => x !== s) || 'fire', 'condense', 'seek']].filter((l) => l.length <= max && l.every((w) => known.includes(w)));
        for (const l of lines) put(T, key + '/sigil/' + l.join('+'), line(gs, us.id, l, ts.pos));
      }
    }
    if (us.mg?.emanator && (us.mg.designs || []).length) for (let st = 0; st <= 4; st++) T[key + '/outburst/' + us.mg.designs[0].id + '/stage' + st] = outburst(gs, us.id, us.mg.designs[0].id, st, ts.pos);
    if (b.id === 'faith') { const dv = c.devotion || 0; prayers(T, key + '/pray', gs, us.id, ts.id, { hymn: dv >= 7 ? 3 : dv >= 5 ? 2 : dv >= 3 ? 1 : 0, miracle: dv >= 10 }); }
  }
}

// ============================================================================================== weapon
const SHOOTER = { archetype: 'sharpshooter', level: 6, skills: { dexterity: 6, raw_power: 5, athletics: 4, brain_power: 3, will_power: 3 }, attrs: { agility: 6, strength: 5, perception: 4, intelligence: 3, determination: 3 } };
export function recordWeapons(T: Table) {
  for (const w of Object.values(A.WEAPON) as any[]) {
    if (w.category === 'thrown') continue; // thrown items go off through Throw (the flat section)
    const g0 = fightSpec([{ ...SHOOTER, weapon: w.id }], TIERS.map((tier) => ({ tier })), { level: 6, seed: 'weapon/' + w.id });
    const melee = isMeleeW(w.id), mode = melee ? 'melee' : 'shot';
    for (const tier of TIERS) {
      const g = clone(g0), u = pcs(g)[0], t = foes(g).find((x) => x.tier === tier)!;
      face(g, u, t, melee); turn(g, u); u.braced = true;
      plainAttack(T, 'weapon/' + w.id + '/' + mode + '/' + tier, g, u.id, t.id, mode, tier === 'soldier' || tier === 'elite');
      if (!melee && tier === 'soldier') T['weapon/' + w.id + '/aimed/' + tier] = [pvLine(W(g, () => A.previewAttack(g.combat, u, t, 'aimed'))), 'hit ' + strike(g, u.id, t.id, 'aimed', { die: 19 }).line].join(' | ');
      if (!melee && typeof w.damage === 'object' && tier === 'soldier') { place(g, [[u, '1,5'], [t, '7,5']]); plainAttack(T, 'weapon/' + w.id + '/shot-at-6/' + tier, g, u.id, t.id, mode, false); }
    }
  }
  // the things that bend a plain attack: special rounds, mods, a worn or broken blade, conditions, an ambush, rarity
  const bend = (name: string, wid: string, set: (g: any, u: any, t: any) => void, mode = attackMode(wid)) => {
    for (const tier of ['soldier', 'elite']) {
      const g = fightSpec([{ ...SHOOTER, weapon: wid }], TIERS.map((t) => ({ tier: t })), { level: 6, seed: 'bend/' + name }), u = pcs(g)[0], t = foes(g).find((x) => x.tier === tier)!;
      face(g, u, t, isMeleeW(wid)); turn(g, u); set(g, u, t);
      plainAttack(T, 'weapon-bend/' + name + '/' + wid + '/' + tier, g, u.id, t.id, mode);
    }
  };
  for (const a of Object.keys(A.AMMO_TYPES)) bend('round-' + a, 'hellraiser_service_rifle', (g, u) => { u.ammoType = a; });
  for (const m of ['mod_suppressor', 'mod_bayonet']) bend(m, 'hellraiser_service_rifle', (g, u) => { u.mods = [...(u.mods || []), m]; });
  bend('mod_bayonet-blow', 'hellraiser_service_rifle', (g, u, t) => { u.mods = [...(u.mods || []), 'mod_bayonet']; u.pos = '6,5'; }, 'melee');
  for (const m of ['mod_weighted', 'mod_serrated']) bend(m, 'sabre', (g, u) => { u.mods = [...(u.mods || []), m]; });
  bend('worn', 'sabre', (g, u) => { u.maxDur = u.maxDur || 40; u.dur = Math.floor(u.maxDur * 0.2); });
  bend('broken', 'sabre', (g, u) => { u.maxDur = u.maxDur || 40; u.dur = 0; });
  for (const cnd of ['weakened', 'sharpened']) for (const wid of ['hellraiser_service_rifle', 'sabre']) bend(cnd, wid, (g, u) => { (u.conds ||= {})[cnd] = 2; });
  for (const wid of ['hellraiser_service_rifle', 'sabre']) bend('ambush', wid, (g, u) => { u.hidden = true; u.hideEntry = 1; });
  for (const wid of ['hellraiser_service_rifle', 'sabre']) for (const m of [1.1, 1.2, 1.3]) bend('rarity-x' + m, wid, (g, u) => { u.dmgMult = m; });
  for (const wid of ['hellraiser_service_rifle', 'sabre']) bend('target-shield-20', wid, (g, u, t) => { t.shield = 20; });
  for (const wid of ['hellraiser_service_rifle', 'sabre']) bend('target-bleeding-dazed', wid, (g, u, t) => { t.bleed = 3; t.dazedNext = 1; });
  for (const wid of ['hellraiser_service_rifle', 'sabre']) bend('target-analysed', wid, (g, u, t) => { u.weakPoint = true; });
  // the Elite and Boss guard (one action never takes one at or above your level from full HP to nothing): a hit far over its HP
  for (const tier of ['elite', 'boss']) for (const lv of [1, 6]) {
    const g = fightSpec([{ ...SHOOTER, weapon: 'breacher_tube' }], [{ tier, level: lv }], { level: 6, seed: 'guard' }), u = pcs(g)[0], t = foes(g)[0];
    face(g, u, t, false); turn(g, u); u.braced = true; u.dmgMult = 40;
    T['weapon-bend/boss-guard/' + tier + '/L' + lv] = act(g, { type: 'combat/attack', unitId: u.id, targetId: t.id, mode: 'shot' }, HIT).line + ' | direct ' + strike(g, u.id, t.id, 'shot', HIT).line;
  }
}

// ============================================================================================== enemy
export function recordEnemies(T: Table) {
  const guns: Record<string, string[]> = { vermin: ['beast_bite'], minion: ['service_pistol', 'combat_knife'], soldier: ['hellraiser_service_rifle', 'sabre', 'lumeri_scattergun'], elite: ['legion_bullpup', 'adamantile_greatsword', 'long_rifle'], boss: ['hellraiser_lmg', 'maul', 'blackpoint_700'] };
  for (const tier of TIERS) for (const wid of guns[tier]) for (const lv of [1, 6, 12, 20]) {
    const g0 = fightSpec([{ ...SHOOTER, level: lv }, { ...SHOOTER, level: lv }], [{ tier, weapon: wid, level: lv }], { level: lv, seed: 'enemy/' + tier });
    for (let ac = 0; ac <= 5; ac++) {
      const g = clone(g0), p = pcs(g)[0], f = foes(g)[0]; p.armour = A.ARMOUR[ac]?.value || 0; face(g, f, p, isMeleeW(wid));
      foeAttack(T, 'enemy/' + tier + '/' + wid + '/L' + lv + '/armour-class-' + ac, g, f.id, p.id);
    }
  }
  // an enemy's blast: the direct hit and the splash on the squadmate beside the target, by level
  for (const [tier, wid] of [['elite', 'smetanita_thumper'], ['boss', 'breacher_tube']]) for (const lv of [1, 6, 12, 20]) {
    const g = fightSpec([{ ...SHOOTER, level: lv }, { ...SHOOTER, level: lv }], [{ tier, weapon: wid, level: lv }], { level: lv, seed: 'blast/' + tier }), [p, q] = pcs(g), f = foes(g)[0];
    place(g, [[f, '3,5'], [p, '9,5'], [q, '9,6']]); q.shield = 10;
    foeAttack(T, 'enemy/' + tier + '/' + wid + '/L' + lv + '/blast', g, f.id, p.id);
  }
}

// ============================================================================================== tech
const TECH_WEAPONS: Record<string, string[]> = {
  melee: ['sabre', 'adamantile_greatsword', 'maul', 'glaive', 'combat_knife', 'fists', 'lance', 'evoker_blade'],
  ranged: ['hellraiser_service_rifle', 'long_rifle', 'blackpoint_700', 'longbow', 'service_pistol', 'lumeri_scattergun', 'hellraiser_lmg', 'recurve_bow', 'crossbow', 'decrkm_smg', 'smetanita_thumper', 'throwing_knives', 'core_rifle'],
};
export function recordTechniques(T: Table): Record<string, number> {
  const ran: Record<string, number> = Object.fromEntries(Object.keys(A.TECHNIQUE).map((id) => [id, 0]));
  for (const system of ['melee', 'ranged']) for (const wid of TECH_WEAPONS[system]) for (const off of [null, 'riot_shield']) {
    const defs = (Object.values(A.TECHNIQUE) as any[]).filter((d) => d.system === system && !!d.needs?.shield === !!off); if (!defs.length) continue;
    // one fight per weapon; each technique is made the only one known on a copy of it
    const g0 = fightSpec([{ ...SHOOTER, weapon: wid }, { ...SHOOTER }], [{ tier: 'soldier' }, { tier: 'elite' }, { tier: 'soldier' }], { level: 6, seed: 'tech/' + wid });
    const u0 = pcs(g0)[0]; if (off) { u0.offWeapon = off; charOf(g0, u0).offHand = { id: off }; }
    const melee = isMeleeW(wid) && wid !== 'throwing_knives', [sold, elite, third] = foes(g0);
    place(g0, [[u0, melee ? '6,5' : '3,5'], [sold, '7,5'], [third, '8,5'], [elite, '13,13'], [pcs(g0)[1], '3,6']]); turn(g0, u0); u0.braced = true;
    for (const def of defs) for (const tier of ['soldier', 'elite']) {
      const g = clone(g0), u = pcs(g)[0], p = A.phys.ensurePhys(charOf(g, u)), [s2, e2] = foes(g), t = tier === 'soldier' ? s2 : e2, away = tier === 'soldier' ? e2 : s2;
      p.known = [def.id]; p.ready = { melee: system === 'melee' ? [def.id] : [], ranged: system === 'ranged' ? [def.id] : [] }; p.uncapped = true;
      t.pos = '7,5'; away.pos = '13,13'; meters(g, u, t);
      if (def.needs?.hidden) { u.hidden = true; u.hideEntry = 1; }
      const r = technique(T, 'tech/' + def.id + '/' + wid + '/' + tier, g, u.id, t.id, def.id);
      if (!r) break; // this weapon cannot make it
      if (/\bi:|\bh:|\bs:/.test(r.line)) ran[def.id]++;
    }
  }
  return ran;
}

// ============================================================================================== sigil
const CASTER = { archetype: 'sigilist', kit: 'sigil', level: 6, skills: { brain_power: 6, visualization: 4, empathy: 3 }, attrs: { intelligence: 6, expression: 4, insight: 3 } };
export function recordSigil(T: Table) {
  const g0 = fightSpec([{ ...CASTER }, { ...SHOOTER }], [{ tier: 'soldier' }, { tier: 'elite' }, { tier: 'minion' }, { tier: 'boss' }], { level: 6, seed: 'sigil' });
  const u0 = pcs(g0)[0]; u0.mg.words = Object.keys(A.SIGIL); u0.mg.maxWords = 4; u0.mg.evoker = true;
  const sold = foes(g0)[0], elite = foes(g0)[1], minion = foes(g0)[2], boss = foes(g0)[3], ally = pcs(g0)[1];
  place(g0, [[u0, '5,5'], [sold, '9,5'], [minion, '10,5'], [elite, '9,7'], [boss, '9,3'], [ally, '5,7']]); turn(g0, u0, 99); ally.hp = Math.floor(ally.maxHp / 3);
  T['sigil/caster'] = 'sigil ' + r3(u0.mg.sigilMult) + ' elem ' + r3(u0.mg.elemMult) + ' heal ' + r3(u0.mg.healMult) + ' level ' + u0.level;
  const subjects = (Object.values(A.SIGIL) as any[]).filter((w) => w.group === 'subject').map((w) => w.id);
  const other = (s: string) => (s === 'fire' ? 'stone' : 'fire');
  for (const s of subjects) {
    for (const l of [[s, 'seek'], [s, 'condense', 'seek'], [s, other(s), 'condense', 'seek']]) {
      for (const [who, t] of [['soldier', sold], ['elite', elite], ['boss', boss], ['ally', ally]] as const) T['sigil/' + l.join('+') + '/' + who] = line(g0, u0.id, l, t.pos);
    }
    // an area, a chain, a second missile, a Line with no reach word (it goes off where the facing rule sends it)
    for (const l of [[s, 'spread', 'seek'], [s, 'chain', 'seek'], [s, 'twice', 'seek'], [s, 'leech', 'seek'], [s, 'arc'], [s, 'condense'], [s, 'kin', 'spread', 'seek'], [s, 'push', 'seek'], [s, 'pull', 'seek']]) T['sigil/' + l.join('+') + '/soldier'] = line(g0, u0.id, l, sold.pos);
  }
  // a critical (the natural 20 comes from the seed): a bolt of each damage Subject on each tier
  for (const s of subjects.filter((x) => A.SIGIL[x].damage)) for (const [who, t] of [['soldier', sold], ['elite', elite]] as const) T['sigil/' + s + '+seek/' + who + '/crit'] = line(g0, u0.id, [s, 'seek'], t.pos, { spell: true }, rollState(20));
  // placed Sigils: a field (STAY), a trap (WAIT) that an enemy then walks onto, a turret (WATCH) at the start of the caster's next turn
  for (const s of ['fire', 'stone', 'acid', 'mend', 'ward']) {
    T['sigil/' + s + '+stay+seek/soldier'] = line(g0, u0.id, [s, 'stay', 'seek'], sold.pos, HIT, 4242, (g2, cb) => { const t = byId(g2, sold.id); cb.turn = cb.order.indexOf(t.id); A.beginTurn(cb, g2.rng); });
    T['sigil/' + s + '+wait+seek/trap-walked-on'] = line(g0, u0.id, [s, 'wait', 'seek'], '8,5', HIT, 4242, (g2, cb) => { const t = byId(g2, sold.id); t.ap = 9; cb.turn = cb.order.indexOf(t.id); A.moveUnit(cb, t, '8,5', g2.rng); });
    T['sigil/' + s + '+watch+seek/turret'] = line(g0, u0.id, [s, 'watch', 'seek'], '6,5', HIT, 4242, (g2, cb) => { const u = byId(g2, u0.id); cb.turn = cb.order.indexOf(u.id); A.beginTurn(cb, g2.rng); });
  }
  // the same Lines from casters of other levels and multipliers (the level factor of MEND and WARD; the Line multiplier)
  for (const lv of [1, 12, 20]) for (const pts of [2, 10]) {
    const g = fightSpec([{ ...CASTER, level: lv, skills: { brain_power: pts, visualization: pts, empathy: pts }, attrs: { intelligence: pts, expression: pts, insight: pts } }, { ...SHOOTER }], [{ tier: 'soldier', level: lv }], { level: lv, seed: 'sigil-lv' });
    const u = pcs(g)[0], t = foes(g)[0], al = pcs(g)[1]; u.mg.words = Object.keys(A.SIGIL); u.mg.maxWords = 4;
    place(g, [[u, '5,5'], [t, '9,5'], [al, '5,7']]); turn(g, u, 99); al.hp = 1;
    for (const l of [['fire', 'seek'], ['stone', 'condense', 'seek'], ['stone', 'fire', 'condense', 'seek']]) T['sigil-level/L' + lv + '/points' + pts + '/' + l.join('+') + '/soldier'] = line(g, u.id, l, t.pos);
    for (const l of [['mend', 'seek'], ['ward', 'seek'], ['mend', 'condense', 'seek']]) T['sigil-level/L' + lv + '/points' + pts + '/' + l.join('+') + '/ally'] = line(g, u.id, l, al.pos);
  }
  // an enemy caster's Line (its words by tier; no Line multiplier, the tier and level factor instead)
  for (const tier of ['soldier', 'elite', 'boss']) for (const lv of [1, 12]) {
    const g = fightSpec([{ ...SHOOTER, level: lv }], [{ tier, level: lv }], { level: lv, seed: 'sigil-foe' }), p = pcs(g)[0];
    T['sigil-enemy/' + tier + '/L' + lv] = run(g, (g2, cb) => {
      const made = A.startCombat('t', 'golden', [], [{ name: 'Caster', tier, weapon: 'service_pistol', sigils: true, level: lv } as any], 'standard', { state: 7 }, []);
      const f = made.units.find((x: any) => x.side === 'foe'); f.id = 'caster1'; cb.units.push(f); cb.order.push(f.id);
      const t = byId(g2, p.id); t.pos = '9,5'; f.pos = '5,5'; f.ap = 99; cb.turn = cb.order.indexOf(f.id);
      const words: string[] = (f.mg?.words || []), s = words.find((w) => A.SIGIL[w]?.damage), reach = words.includes('seek') ? 'seek' : words.find((w) => A.SIGIL[w]?.group === 'reach');
      if (!s || !reach) return 'No words: ' + words.join(',');
      f.mg.charge = 999; f.mg.flux = -99;
      for (const [i, w] of [s, reach].entries()) { f.pos = (5 - i) + ',5'; const e = A.drawGlyph(cb, g2.rng, f, w); if (e) return 'Draw: ' + e; }
      const e = A.evoke(cb, g2.rng, f, '4,5', t.pos); return e ? 'Evoke: ' + e : null;
    }, HIT).line;
  }
}

// ============================================================================================== outburst
const HEART = { archetype: 'stormcaller', kit: 'soul', level: 6, skills: { will_power: 6, empathy: 4, composure: 4, lore_master: 3 }, attrs: { determination: 6, insight: 4, virtue: 3 } };
function heartFight(spec: any, foeSpecs: any[], o: any) {
  const g = fightSpec([spec, { ...SHOOTER }], foeSpecs, o), u = pcs(g)[0];
  // the heart is given room (Strain, MP, every feeling felt) so that every stage and feeling can be reached: its multipliers are its own
  Object.assign(u.mg, { emanator: true, mp: 9999, mpMax: 9999, strain: 0, strainLimit: 30, feelings: A.FEELINGS.map((x: any) => x.id) });
  return g;
}
export function recordOutburst(T: Table) {
  const g0 = heartFight({ ...HEART }, [{ tier: 'soldier' }, { tier: 'elite' }, { tier: 'minion' }, { tier: 'boss' }], { level: 6, seed: 'outburst' });
  const u0 = pcs(g0)[0], [sold, elite, minion, boss] = foes(g0), ally = pcs(g0)[1];
  place(g0, [[u0, '5,5'], [sold, '9,5'], [minion, '10,5'], [elite, '9,7'], [boss, '9,3'], [ally, '5,6']]); turn(g0, u0, 99); ally.hp = Math.floor(ally.maxHp / 3);
  T['outburst/caster'] = 'soul ' + r3(u0.mg.soulMult) + ' heal ' + r3(u0.mg.healMult) + ' base ' + u0.mg.soulBase + ' level ' + u0.level;
  const give = (g: any, d: any) => { const u = pcs(g)[0], id = 'g' + (u.mg.designs.length + 1); u.mg.designs.push({ id, name: 'Golden ' + id, school: 'damage', modules: [], ...d }); return id; };
  const cast = (key: string, d: any, stage: number, aim: string, feelings: string[] = [], dd: any = HIT, seed = 4242) => { const g = clone(g0), id = give(g, d); T[key] = outburst(g, u0.id, id, stage, aim, feelings, dd, seed); };
  const schools = A.SCHOOLS.map((s: any) => s.id);
  for (const school of schools) {
    const opts: string[] = (A.SCHOOL[school].options || []).map((o: any) => (typeof o === 'string' ? o : o.id)).filter(Boolean), list = opts.length ? opts : [undefined];
    for (const option of list) for (let st = 0; st <= 4; st++) for (const [who, t] of [['soldier', sold], ['ally', ally]] as const) {
      const d = { school, ...(option ? { option } : {}) }, k = 'outburst/' + school + (option ? ':' + option : '') + '/stage' + st + '/' + who;
      cast(k + '/plain', d, st, t.pos);
      if (st > 0) cast(k + '/rage', d, st, t.pos, ['rage']);
    }
  }
  // every feeling, alone, in a stage-1 Damage Bolt; and four together at stage 4
  for (const f of A.FEELINGS) for (const [who, t] of [['soldier', sold], ['elite', elite]] as const) cast('outburst/feeling/' + f.id + '/' + who, { school: 'damage' }, 1, t.pos, [f.id]);
  cast('outburst/feeling/rage+spite+pride+cruelty/boss', { school: 'damage' }, 4, boss.pos, ['rage', 'spite', 'pride', 'cruelty']);
  // every tone, every shape, At Once, the Damage school's ways to strike, a second school; on each tier
  for (const tone of A.TONES) for (const [who, t] of [['soldier', sold], ['elite', elite], ['boss', boss]] as const) cast('outburst/tone/' + tone.id + '/stage2/' + who, { school: 'damage', tone: tone.id }, 2, t.pos);
  for (const m of Object.keys(A.MODULE)) for (const st of [0, 2]) cast('outburst/module/' + m + '/stage' + st + '/soldier', { school: 'damage', modules: [m] }, st, sold.pos);
  for (const m of ['wave', 'burst', 'aura', 'lance']) { cast('outburst/shape/' + m + '/buff/ally', { school: 'buff', modules: [m] }, 2, ally.pos); for (const tone of ['fire', 'stone']) cast('outburst/shape/' + m + '/' + tone + '/soldier', { school: 'damage', modules: [m], tone }, 2, sold.pos); }
  for (const mode of Object.keys(A.SOUL_RULES.damage?.modes || {})) for (const hurt of [false, true]) { const g = clone(g0); if (hurt) byId(g, sold.id).hp = 10; const id = give(g, { school: 'damage', mode }); T['outburst/mode/' + mode + (hurt ? '/hurt-target' : '') + '/soldier'] = outburst(g, u0.id, id, 2, sold.pos); }
  for (const second of schools.filter((s: string) => s !== 'damage')) cast('outburst/second/' + second + '/soldier', { school: 'damage', second }, 2, sold.pos);
  // a critical (the natural 20 comes from the seed)
  for (const [who, t] of [['soldier', sold], ['elite', elite]] as const) cast('outburst/damage/stage2/' + who + '/crit', { school: 'damage' }, 2, t.pos, [], { spell: true }, rollState(20));
  // the snap cast (Begin and Release at once), and a held one that swells over a turn
  { const g = clone(g0), id = give(g, { school: 'damage' }); T['outburst/snap/soldier'] = act(g, { type: 'combat/outburst', unitId: u0.id, design: id, aim: sold.pos }, HIT).line; }
  // other levels and multipliers (the level factor of the Buff school's heal and shield; the Strain burn)
  for (const lv of [1, 12, 20]) for (const pts of [2, 10]) {
    const g = heartFight({ ...HEART, level: lv, skills: { will_power: pts, empathy: pts, composure: pts }, attrs: { determination: pts, insight: pts, virtue: pts } }, [{ tier: 'soldier', level: lv }], { level: lv, seed: 'outburst-lv' });
    const u = pcs(g)[0], t = foes(g)[0], al = pcs(g)[1]; place(g, [[u, '5,5'], [t, '9,5'], [al, '5,6']]); turn(g, u, 99); al.hp = 1;
    for (const st of [0, 2, 4]) {
      { const g2 = clone(g), id = give(g2, { school: 'damage' }); T['outburst-level/L' + lv + '/points' + pts + '/damage/stage' + st] = outburst(g2, u.id, id, st, t.pos); }
      for (const option of (A.SCHOOL.buff.options || []).map((o: any) => (typeof o === 'string' ? o : o.id))) { const g2 = clone(g), id = give(g2, { school: 'buff', option }); T['outburst-level/L' + lv + '/points' + pts + '/buff:' + option + '/stage' + st] = outburst(g2, u.id, id, st, al.pos); }
    }
  }
  // the heart's own harm: the Strain burn (Pumps past the limit) and a Mana Short
  { const g = clone(g0), u = pcs(g)[0]; u.mg.strainLimit = 1; const id = give(g, { school: 'damage' }); T['outburst/strain-burn'] = outburst(g, u0.id, id, 4, sold.pos); }
  // an enemy heart caster's Outburst (its own base and its tier and level factor), released at stage 0 and stage 2
  for (const hc of A.HEART_CASTERS) for (const lv of [1, 12]) for (const st of [0, 2]) {
    const g = fightSpec([{ ...SHOOTER, level: lv }], [{ tier: 'minion', level: lv }], { level: lv, seed: 'outburst-foe' }), p = pcs(g)[0];
    put(T, 'outburst-enemy/' + hc.id + '/L' + lv + '/stage' + st, run(g, (g2, cb) => {
      const made = A.startCombat('t', 'golden', [], [{ name: 'Heart', tier: hc.tier, weapon: 'service_pistol', caster: hc.id, level: lv } as any], 'standard', { state: 7 }, []);
      const f = made.units.find((x: any) => x.side === 'foe'); f.id = 'heart1'; cb.units.push(f); cb.order.push(f.id);
      const t = byId(g2, p.id); t.pos = '9,5'; f.pos = '5,5'; f.ap = 99; cb.turn = cb.order.indexOf(f.id);
      const d = (f.mg?.designs || []).find((x: any) => x.school === 'damage') || f.mg?.designs?.[0]; if (!d) return 'No design';
      let e = A.beginOutburst(cb, g2.rng, f, d.id, undefined, true, {}); if (e) return 'Begin: ' + e;
      for (let i = 0; i < st; i++) { f.ap = 99; e = A.pumpOutburst(cb, g2.rng, f, null); if (e) return 'Pump: ' + e; }
      f.ap = 99; e = A.releaseOutburst(cb, g2.rng, f, t.pos); return e ? 'Release: ' + e : null;
    }, HIT).line);
  }
}

// ============================================================================================== faith
export function recordFaith(T: Table) {
  for (const p of A.FAITH_PATRONS) for (const [lv, faith, dv] of [[1, 3, 3], [6, 7, 10], [20, 10, 10]]) {
    const g = fightSpec([{ name: 'Priest', level: lv, skills: { faith }, attrs: { virtue: Math.max(3, faith) } }, { name: 'Ally', level: lv }], [{ tier: 'soldier', level: lv }, { tier: 'elite', level: lv }], { level: lv, seed: 'faith/' + p.id });
    const u = pcs(g)[0], c = charOf(g, u), al = pcs(g)[1], [f0, f1] = foes(g);
    c.belief = { kind: 'faithful', patron: p.id }; c.patron = p.id; c.devotion = dv; if (A.setDevotionXp && A.devotionThreshold) A.setDevotionXp(c, A.devotionThreshold(dv));
    place(g, [[u, '5,5'], [al, '5,6'], [f0, '8,5'], [f1, '9,5']]); turn(g, u, 9); al.hp = Math.floor(al.maxHp / 3); u.hp = Math.floor(u.maxHp / 2);
    const key = 'faith/' + p.id + '/L' + lv + '-faith' + faith + '-devotion' + dv;
    T[key + '/power'] = W(g, () => 'blessing ' + r3(A.blessingPower(c)) + ' mend ' + r3(A.mendFactorOf(u)) + ' intervention ' + A.interventionAmount(c) + ' x power ' + A.interventionAmount(c, A.blessingPower(c)));
    prayers(T, key, g, u.id, f0.id, { hymn: dv >= 7 ? 3 : dv >= 5 ? 2 : 1, miracle: dv >= 10 && faith >= 7 });
  }
  // the intervention fired (Nerukhan's: an enemy harms a Downed creature while the bearer is Witnessed)
  for (const dv of [3, 7, 10]) {
    const g = fightSpec([{ name: 'Priest', level: 6, skills: { faith: 7 }, attrs: { virtue: 7 } }, { name: 'Ally', level: 6 }], [{ tier: 'boss', level: 6 }], { level: 6, seed: 'intervention' });
    const u = pcs(g)[0], c = charOf(g, u), al = pcs(g)[1], f = foes(g)[0];
    c.belief = { kind: 'faithful', patron: 'nerukhan' }; c.patron = 'nerukhan'; c.devotion = dv; if (A.setDevotionXp && A.devotionThreshold) A.setDevotionXp(c, A.devotionThreshold(dv));
    place(g, [[u, '5,5'], [al, '5,6'], [f, '8,5']]); turn(g, u, 9);
    const r = act(g, { type: 'combat/pray', unitId: u.id, kind: 'hymn', id: 'saints_shield', targetId: al.id }, HIT);
    T['faith/intervention/nerukhan/devotion' + dv] = r.ok ? run(r.g, (g2, cb) => { const a = byId(g2, al.id), e = byId(g2, f.id); Object.assign(a, { hp: 0, downed: true, dead: false, saves: { ok: 0, fail: 0 } }); A.applyDamage(cb, a, 5, { by: e, type: 'physical' }); return null; }).line : r.line;
  }
}

// ============================================================================================== item
const tiersOf = (p: any): string[] => (p.tiers ? Object.keys(p.tiers) : [p.tier === 'acquired' ? 'I' : p.tier]);
/** What an item listens to: its lane handler's hooks and its generic ops' ('stat': it answers a number query). */
function hooksOf(key: string, tier?: string): Set<string> {
  const info = A.itemInfo(key, tier), hd = A.handlerOf(key), H = new Set<string>(Object.keys(hd?.on || {}));
  if (hd?.stat) H.add('stat');
  if (info) info.effects.forEach((e: any, i: number) => { if (A.ownerOf(info, i) !== 'generic') return; const gop = A.genericOf(e.op); for (const k of Object.keys(gop?.on || {})) H.add(k); if (gop?.stat) H.add('stat'); });
  return H;
}
// One sheet for every holder (every skill and attribute 5, level 6), so a line that differs from the same sheet
// without the item is the item's doing. Legality is not checked: the sweep reads what the item does, not who may hold it.
const EVEN = () => ({ level: 6, skills: Object.fromEntries(A.SKILLS.map((x: any) => [x.id, 5])), attrs: Object.fromEntries(A.ATTRS.map((x: any) => [x.id, 5])) });
/** The standard fight of the item sweep: the holder at 3,6 (hurt), a Soldier next to it (4,6), a hurt squadmate at
 * 2,6, a second Soldier 4 tiles off (7,6), an Elite further off. */
function itemFight(spec: any) {
  const g = fightSpec([{ ...EVEN(), ...spec }, { name: 'Squadmate', ...EVEN() }], [{ tier: 'soldier', name: 'Soldier' }, { tier: 'soldier', name: 'Far soldier' }, { tier: 'elite', name: 'Elite' }], { level: 6, seed: 'item' });
  const [u, al] = pcs(g), [f, far, el] = foes(g);
  place(g, [[u, '3,6'], [f, '4,6'], [al, '2,6'], [far, '7,6'], [el, '7,9']]); turn(g, u, 9);
  al.hp = Math.ceil(al.maxHp * 0.4); u.hp = Math.ceil(u.maxHp * 0.6);
  return g;
}
const ATTACK_HOOKS = ['damage_out', 'attack_roll', 'attack_preview', 'on_hit', 'on_kill', 'stat', 'spell_mult', 'spell_roll'], TAKEN_HOOKS = ['damage_in', 'on_damaged', 'on_downed', 'stat', 'attack_target'],
  HEAL_HOOKS = ['heal_in', 'heal_given', 'stat'], SHIELD_HOOKS = ['shield_grant', 'stat'];
type Probe = [string, string[], (g: any) => string];
const PROBES: Probe[] = [
  ['shot', ATTACK_HOOKS, (g) => strike(g, pcs(g)[0].id, foes(g)[1].id, 'shot', HIT).line],
  ['shot-crit', ATTACK_HOOKS, (g) => strike(g, pcs(g)[0].id, foes(g)[1].id, 'shot', CRIT).line],
  ['blow', ATTACK_HOOKS, (g) => strike(g, pcs(g)[0].id, foes(g)[0].id, 'melee', HIT).line],
  // the target marked, Bleeding, Prone, Pinned and at a third of its HP; the holder at a fifth of its own
  ['shot-primed', ATTACK_HOOKS, (g) => { const g2 = clone(g), u = pcs(g2)[0], t = foes(g2)[1]; u.hp = Math.ceil(u.maxHp * 0.2); t.hp = Math.ceil(t.maxHp / 3); t.bleed = 3; t.prone = true; t.conds = { ...(t.conds || {}), marked: 2, pinned: 2, burning: 2 }; t.weakPoint = true; return strike(g2, u.id, t.id, 'shot', HIT).line; }],
  ['blow-primed', ATTACK_HOOKS, (g) => { const g2 = clone(g), u = pcs(g2)[0], t = foes(g2)[0]; u.hp = Math.ceil(u.maxHp * 0.2); t.hp = Math.ceil(t.maxHp / 3); t.bleed = 3; t.prone = true; t.conds = { ...(t.conds || {}), marked: 2, pinned: 2, stunned: 1 }; return strike(g2, u.id, t.id, 'melee', HIT).line; }],
  ['spell-sigil', ATTACK_HOOKS, (g) => run(g, (g2, cb) => { A.harm(cb, g2.rng, pcs(g2)[0], foes(g2)[1], 30, 'sigil'); return null; }).line],
  ['spell-fire', ATTACK_HOOKS, (g) => run(g, (g2, cb) => { A.harm(cb, g2.rng, pcs(g2)[0], foes(g2)[1], 30, 'elemental', 'fire'); return null; }).line],
  ['spell-soul', ATTACK_HOOKS, (g) => run(g, (g2, cb) => { A.harm(cb, g2.rng, pcs(g2)[0], foes(g2)[1], 30, 'soul'); return null; }).line],
  ['blast-given', ATTACK_HOOKS, (g) => run(g, (g2, cb) => { A.hurtUnit(foes(g2)[1], 40, false, cb, 'explosion', pcs(g2)[0]); return null; }).line],
  ['taken', TAKEN_HOOKS, (g) => run(g, (g2, cb) => { const a = foes(g2)[1], p = pcs(g2)[0]; a.ap = 9; cb.turn = cb.order.indexOf(a.id); A.resolveAttack(cb, g2.rng, a, p, 'shot', null); return null; }, HIT).line],
  ['taken-crit', TAKEN_HOOKS, (g) => run(g, (g2, cb) => { const a = foes(g2)[1], p = pcs(g2)[0]; a.ap = 9; cb.turn = cb.order.indexOf(a.id); A.resolveAttack(cb, g2.rng, a, p, 'shot', null); return null; }, CRIT).line],
  ['taken-blow', TAKEN_HOOKS, (g) => run(g, (g2, cb) => { const a = foes(g2)[0], p = pcs(g2)[0]; a.ap = 9; cb.turn = cb.order.indexOf(a.id); A.resolveAttack(cb, g2.rng, a, p, 'melee', null); return null; }, HIT).line],
  ['taken-low', TAKEN_HOOKS, (g) => run(g, (g2, cb) => { const a = foes(g2)[1], p = pcs(g2)[0]; p.hp = 9; a.ap = 9; cb.turn = cb.order.indexOf(a.id); A.resolveAttack(cb, g2.rng, a, p, 'shot', null); return null; }, HIT).line],
  ['taken-blast', TAKEN_HOOKS, (g) => run(g, (g2, cb) => { A.hurtUnit(pcs(g2)[0], 40, false, cb, 'explosion', foes(g2)[0]); return null; }).line],
  ['taken-hazard', TAKEN_HOOKS, (g) => run(g, (g2, cb) => { A.hurtUnit(pcs(g2)[0], 25, true, cb, 'hazard', null); return null; }).line],
  ['taken-fire', TAKEN_HOOKS, (g) => run(g, (g2, cb) => { A.harm(cb, g2.rng, foes(g2)[0], pcs(g2)[0], 30, 'elemental', 'fire'); return null; }).line],
  ['taken-soul', TAKEN_HOOKS, (g) => run(g, (g2, cb) => { A.harm(cb, g2.rng, foes(g2)[0], pcs(g2)[0], 30, 'soul'); return null; }).line],
  ['taken-true', TAKEN_HOOKS, (g) => run(g, (g2, cb) => { A.harm(cb, g2.rng, null, pcs(g2)[0], 30, 'true'); return null; }).line],
  ['ally-taken', TAKEN_HOOKS, (g) => run(g, (g2, cb) => { const a = foes(g2)[1], p = pcs(g2)[1]; a.ap = 9; cb.turn = cb.order.indexOf(a.id); A.resolveAttack(cb, g2.rng, a, p, 'shot', null); return null; }, HIT).line],
  ['heal-given', HEAL_HOOKS, (g) => run(g, (g2, cb) => { A.healUnit(cb, pcs(g2)[1], 20, pcs(g2)[0], 'stim'); return null; }).line],
  ['heal-given-magic', HEAL_HOOKS, (g) => run(g, (g2, cb) => { A.heal(pcs(g2)[1], 20, cb, pcs(g2)[0], 'soul'); return null; }).line],
  ['heal-taken', HEAL_HOOKS, (g) => run(g, (g2, cb) => { A.healUnit(cb, pcs(g2)[0], 20, pcs(g2)[1], 'stim'); return null; }).line],
  ['shield-given', SHIELD_HOOKS, (g) => run(g, (g2, cb) => { A.grantShield(cb, pcs(g2)[1], 20, pcs(g2)[0]); return null; }).line],
  ['shield-taken', SHIELD_HOOKS, (g) => run(g, (g2, cb) => { A.grantShield(cb, pcs(g2)[0], 20, pcs(g2)[1]); return null; }).line],
];
const ITEM_TRIES = (g: any) => {
  const [u, al] = pcs(g), [f, far] = foes(g);
  const U = [{}, { targetId: f.id }, { targetId: al.id }, { targetId: u.id }, { targetId: far.id }], TI = [{}, { tile: '3,7' }, { tile: f.pos }, { tile: '6,6' }];
  return TI.flatMap((t) => U.map((x) => ({ ...x, ...t })));
};
/** Every action an item puts on the pad (through the reducer), and the shot and the blow that follow it when they differ. */
function itemActions(T: Table, key: string, g: any, pick: (e: any) => boolean, base: Table, nameOf: (e: any) => string): Record<string, number> {
  const [u] = pcs(g), [f, far] = foes(g), seen: Record<string, number> = {};
  let list: any[] = [];
  try { list = W(g, () => A.perkActionsFor({ u, c: charOf(g, u), cb: g.combat, g }, 'combat')).filter(pick); } catch { list = []; }
  for (const e of list) {
    const choice = e.options?.length ? e.options.slice(0, e.pickMulti || 1).map((o: any) => o.id).join(' ') : undefined;
    const base0 = { ...(choice ? { choice } : {}), ...(e.target === 'text' ? { text: 'halt' } : {}) }, tries0 = ITEM_TRIES(g), tries = choice ? tries0 : [...tries0, ...tries0.map((x) => ({ ...x, choice: 'head', text: 'head' }))];
    // the arguments the action's own preview accepts (nothing is changed by a preview), then the action once, through the reducer
    const okArgs = tries.filter((a) => { try { return W(g, () => A.previewPerkAction({ u, c: charOf(g, u), cb: g.combat, g }, e.id, { actionId: e.actionId, ...base0, ...a }, 'combat')).ok; } catch { return false; } }).slice(0, 2);
    const r = okArgs.length ? tryAct(g, { type: 'combat/perk', unitId: u.id, id: e.id, actionId: e.actionId, ...base0 }, okArgs, HIT) : { ok: false, line: '', g };
    const k = key + '/' + nameOf(e); seen[e.id] = (seen[e.id] || 0);
    if (!r.ok) continue;
    if (r.line !== '=>') { T[k] = r.line; seen[e.id]++; }
    for (const [kk, tid, mode] of [['then-shot', far.id, 'shot'], ['then-blow', f.id, 'melee']] as const) {
      const u2 = byId(r.g, u.id); if (!u2 || !byId(r.g, tid)) continue; u2.ap = 9;
      const l = strike(r.g, u.id, tid, mode, HIT).line;
      if (l !== base[kk === 'then-shot' ? 'shot' : 'blow'] && !/^REFUSED/.test(l)) { T[k + '/' + kk] = l; seen[e.id]++; }
    }
  }
  return seen;
}
const ALL_HOOKS = new Set([...ATTACK_HOOKS, ...TAKEN_HOOKS, ...HEAL_HOOKS, ...SHIELD_HOOKS]);
const reads = (hooks: Set<string>) => [...hooks].some((h) => ALL_HOOKS.has(h));
const hasActions = (key: string, tier?: string) => { try { const info = A.itemInfo(key, tier); return !!info && A.actionDefs(info).some((d: any) => !d.scope || d.scope === 'combat' || d.scope === 'any' || (Array.isArray(d.scope) && d.scope.includes('combat'))); } catch { return true; } };
function probes(g: any, hooks: Set<string> | null): Table {
  const out: Table = {};
  for (const [name, on, f] of PROBES) if (!hooks || on.some((h) => hooks.has(h))) out[name] = f(g);
  return out;
}
export function recordItems(T: Table, part: 'perks' | 'traits-classes' | 'all' = 'all'): Record<string, number> {
  const seen: Record<string, number> = {}, bases: Record<string, Table> = {};
  const baseOf = (spec: any): Table => (bases[JSON.stringify(spec)] ||= probes(itemFight(spec), null));
  if (part !== 'perks') for (const [k, v] of Object.entries(baseOf({}))) T['item/none/' + k] = v;
  if (part !== 'traits-classes') for (const p of A.PERKS) for (const tier of tiersOf(p)) {
    const core = A.SKILL[(p.skills || [])[0]]?.core || '', classId = /mind/i.test(core) ? 'mage' : /soul/i.test(core) ? 'channeler' : 'fighter';
    const without = { classId, ...(classId === 'mage' ? { kit: 'sigil' } : classId === 'channeler' ? { kit: 'soul' } : {}) }, base = baseOf(without), key = 'item/perk/' + p.id + '@' + tier;
    const hooks = hooksOf('perk:' + p.id, tier); seen['perk:' + p.id + '@' + tier] = 0;
    if (!reads(hooks) && !hasActions('perk:' + p.id, tier)) continue; // nothing in a fight's numbers listens: no fight
    let g: any; try { g = itemFight({ ...without, perks: { [p.id]: tier } }); } catch (e: any) { T[key + '/setup'] = 'THREW ' + String(e?.message || e).slice(0, 80); continue; }
    let n = 0;
    for (const [k, v] of Object.entries(probes(g, hooks))) if (base[k] !== v) { T[key + '/' + k] = v; n++; }
    n += Object.values(itemActions(T, key + '/action', g, (e) => e.id === 'perk:' + p.id, base, (e) => e.actionId)).reduce((a, b) => a + b, 0);
    seen['perk:' + p.id + '@' + tier] = n;
  }
  if (part === 'perks') return seen;
  for (const t of A.TRAITS) {
    const base = baseOf({}), key = 'item/trait/' + t.id;
    const hooks = hooksOf('trait:' + t.id); seen['trait:' + t.id] = 0;
    if (!reads(hooks) && !hasActions('trait:' + t.id)) continue;
    let g: any; try { g = itemFight({ traits: [t.id] }); } catch (e: any) { T[key + '/setup'] = 'THREW ' + String(e?.message || e).slice(0, 80); continue; }
    let n = 0;
    for (const [k, v] of Object.entries(probes(g, hooks))) if (base[k] !== v) { T[key + '/' + k] = v; n++; }
    n += Object.values(itemActions(T, key + '/action', g, (e) => e.id === 'trait:' + t.id, base, (e) => e.actionId)).reduce((a, b) => a + b, 0);
    seen['trait:' + t.id] = n;
  }
  // the nine classes at each rank: the class as a whole on every probe (its passives), then each move's own action,
  // with the class's own tool in hand
  for (const cls of Object.keys(A.BASE_CLASS)) for (const [rank, lv, pts] of [['I', 3, 5], ['II', 6, 6], ['III', 12, 9]] as const) {
    const at = A.CLASS[cls].attribute, kit = ['mage', 'trickster', 'infiltrator'].includes(cls) ? 'sigil' : ['channeler', 'bard', 'guardian'].includes(cls) ? 'soul' : 'soldier';
    const without = { level: lv, kit, attrs: { ...EVEN().attrs, [at]: pts } }, base = baseOf(without), key = 'item/class/' + cls + '@' + rank;
    let g: any; try { g = itemFight({ ...without, classId: cls }); } catch (e: any) { T[key + '/setup'] = 'THREW ' + String(e?.message || e).slice(0, 80); continue; }
    const u = pcs(g)[0]; if (u.mg) Object.assign(u.mg, { charge: Math.max(u.mg.charge || 0, 9), mp: Math.max(u.mg.mp || 0, 200) });
    { const c = charOf(g, u); c.belief = { kind: 'faithful', patron: 'nerukhan' }; c.patron = 'nerukhan'; c.devotion = 7; }
    if (cls === 'infiltrator') { foes(g)[1].kind = 'robot'; pcs(g)[1].jammed = true; }
    for (const k of Object.keys(u.resMax || {})) (u.res ||= {})[k] = u.resMax[k];
    for (const m of (u.held ? A.classMoveKeys(u.held) : [])) seen[m.key] = seen[m.key] || 0;
    for (const [k, v] of Object.entries(probes(g, null))) if (base[k] !== v) T[key + '/' + k] = v;
    const got = itemActions(T, key, g, (e) => String(e.id).startsWith('class:'), base, (e) => e.id.slice(6) + '/' + e.actionId);
    for (const [k, v] of Object.entries(got)) seen[k] = (seen[k] || 0) + v;
  }
  return seen;
}

// ============================================================================================== the shelved moves
// Step a6 moves the numbers written in classes/*.ts into data. Most of them belong to moves no character can hold today
// (the 21 advanced classes and the Revision 2 ranks of the move pool: shelved, Class Roster 3), which the sweep above
// never reaches. This section holds them with the tests' own switches on (_setAdvancedLive, _setRevision2Classes: never
// on in play), on one even sheet and the same probes, and writes whatever number they give.
export function recordShelved(T: Table): Record<string, number> {
  const seen: Record<string, number> = {}, kitOf = (core: string) => (/mind/i.test(core) ? 'sigil' : /soul/i.test(core) ? 'soul' : 'soldier');
  const HIGH = () => ({ level: 12, skills: Object.fromEntries(A.SKILLS.map((x: any) => [x.id, 6])), attrs: Object.fromEntries(A.ATTRS.map((x: any) => [x.id, 6])) });
  const sweep = (key: string, spec: any, kit: string) => {
    const without = { ...HIGH(), kit }, base = probes(itemFight(without), null);
    let g: any; try { g = itemFight({ ...without, ...spec }); } catch (e: any) { T[key + '/setup'] = 'THREW ' + String(e?.message || e).slice(0, 80); return; }
    const u = pcs(g)[0]; if (u.mg) Object.assign(u.mg, { charge: Math.max(u.mg.charge || 0, 9), mp: Math.max(u.mg.mp || 0, 200) });
    { const c = charOf(g, u); c.belief = { kind: 'faithful', patron: 'nerukhan' }; c.patron = 'nerukhan'; c.devotion = 7; }
    foes(g)[1].kind = 'robot'; pcs(g)[1].jammed = true;
    for (const k of Object.keys(u.resMax || {})) (u.res ||= {})[k] = u.resMax[k];
    for (const m of (u.held ? A.classMoveKeys(u.held) : [])) seen[m.key] = seen[m.key] || 0;
    for (const [k, v] of Object.entries(probes(g, null))) if (base[k] !== v) T[key + '/' + k] = v;
    const got = itemActions(T, key, g, (e) => String(e.id).startsWith('class:'), base, (e) => e.id.slice(6) + '/' + e.actionId);
    for (const [k, v] of Object.entries(got)) seen[k] = (seen[k] || 0) + v;
  };
  A._setAdvancedLive(true);
  try {
    for (const id of Object.keys(A.ADVANCED)) { const adv = A.ADVANCED[id], parent = (adv.parents || [])[0], core = A.CLASS[parent]?.core || ''; sweep('shelved/advanced/' + id, { classId: parent || 'fighter', advancedClass: id }, kitOf(core)); }
    A._setRevision2Classes(true);
    for (const id of Object.keys(A.REV2_CLASSES)) sweep('shelved/rev2/' + id, { classId: id }, kitOf(A.REV2_CLASSES[id].core || ''));
  } finally { A._setRevision2Classes(false); A._setAdvancedLive(null); }
  return seen;
}

// ============================================================================================== the literals
// What step a6 moves that no action of the sweeps above produces: the system's own flat numbers, called as the engine
// calls them. (Bleeding, Burning and Corroded ticks, hazards, traps and thrown items are in `flat`; Shame's rider is in
// `outburst`.)
export function recordLiterals(T: Table) {
  // the Flux overload: an Evoker 1, 2 and 4 Flux over its limit (a shield up: it takes the burst first)
  const gs = fightSpec([{ ...CASTER }, { ...SHOOTER }], [{ tier: 'soldier' }], { level: 6, seed: 'literals' }), us = pcs(gs)[0]; turn(gs, us, 9);
  for (const over of [1, 2, 4]) for (const sh of [0, 12]) T['literal/flux-overload/' + over + '-over' + (sh ? '/shield' : '')] = run(gs, (g2, cb) => { const u = byId(g2, us.id); u.mg.flux = A.FLUX_MAX; u.shield = sh; A.flux(cb, g2.rng, u, over); return null; }).line;
  // the Strain burn at the end of a turn (1 and 2 over the limit) and the Mana Short (3 over)
  const gh = heartFight({ ...HEART }, [{ tier: 'soldier' }, { tier: 'elite' }], { level: 6, seed: 'literals' }), uh = pcs(gh)[0], [sold, elite] = foes(gh);
  place(gh, [[uh, '5,5'], [sold, '6,5'], [elite, '5,6']]); turn(gh, uh, 9);
  for (const over of [1, 2, 3, 5]) for (const sh of [0, 12]) T['literal/strain-burn/' + over + '-over' + (sh ? '/shield' : '')] = run(gh, (g2, cb) => { const u = byId(g2, uh.id); u.mg.strainLimit = 4; u.mg.strain = 4 + over; u.shield = sh; A.magicTurnEnd(cb, g2.rng, u); return null; }).line;
  // the aura: a held heart with an element leaks onto the enemies next to it at the start of its turn (each tone)
  for (const tone of A.TONES.map((x: any) => x.id)) T['literal/aura/' + tone] = run(gh, (g2, cb) => {
    const u = byId(g2, uh.id), id = 'aura_' + tone; u.mg.designs.push({ id, name: 'Golden ' + id, school: 'damage', modules: [], tone }); u.ap = 99;
    const e = A.beginOutburst(cb, g2.rng, u, id, undefined, true, {}); if (e) return 'Begin: ' + e;
    cb.turn = cb.order.indexOf(u.id); delete cb.window; A.beginTurn(cb, g2.rng); return null; }).line;
}

// ============================================================================================== flat
export function recordFlat(T: Table) {
  // thrown items and blasts: a throw onto a Soldier with an Elite and a shielded squadmate inside the radius
  for (const w of (Object.values(A.WEAPON) as any[]).filter((x) => x.category === 'thrown')) for (const lv of [1, 6, 20]) {
    const g = fightSpec([{ ...SHOOTER, level: lv }, { ...SHOOTER, level: lv }], [{ tier: 'soldier', level: lv }, { tier: 'elite', level: lv }], { level: lv, seed: 'throw' }), [u, al] = pcs(g), [f, e] = foes(g);
    place(g, [[u, '3,5'], [f, '7,5'], [e, '7,6'], [al, '8,5']]); turn(g, u, 9); u.throwables = { ...(u.throwables || {}), [w.id]: 2 }; al.shield = 15;
    T['flat/throw/' + w.id + '/L' + lv] = tryAct(g, { type: 'combat/throw', unitId: u.id, item: w.id }, [{ tile: '7,5' }, { tile: '4,5' }], HIT).line;
  }
  const g0 = fightSpec([{ ...SHOOTER }, { ...SHOOTER }], TIERS.map((tier) => ({ tier })), { level: 6, seed: 'flat' });
  const [u0, al0] = pcs(g0); place(g0, [[u0, '3,5'], [al0, '3,7'], ...foes(g0).map((f: any, i: number) => [f, (7 + 2 * i) + ',5'] as [any, string])]); turn(g0, u0, 9);
  const everyone = (g: any) => [...pcs(g), ...foes(g)];
  const named = (g: any, x: any) => (x.side === 'pc' ? 'character' + (pcs(g).indexOf(x) + 1) : x.tier);
  // hurtUnit and harm as the sites call them: a flat number of each kind on each tier, a shield on, armour on and off
  for (const n of [5, 25, 40, 120]) for (const x of everyone(g0)) for (const [why, ign] of [['hazard', false], ['hazard', true], ['explosion', false], ['trap', false]] as const)
    T['flat/hurtUnit/' + why + (ign ? '-no-armour' : '') + '/' + n + '/' + named(g0, x)] = run(g0, (g2, cb) => { const t = byId(g2, x.id); t.shield = 8; A.hurtUnit(t, n, ign, cb, why, null); return null; }).line;
  for (const n of [5, 30, 90]) for (const x of everyone(g0)) for (const [type, dt, arm] of [['sigil', undefined, undefined], ['elemental', 'fire', undefined], ['soul', undefined, undefined], ['true', undefined, undefined], ['physical', undefined, undefined], ['elemental', 'stone', 'full'], ['soul', undefined, 'half']] as const)
    for (const by of [null, 'pc', 'foe'] as const) {
      if (by === 'foe' && x.side === 'foe' || by === 'pc' && x === u0) continue;
      T['flat/harm/' + type + (dt ? ':' + dt : '') + (arm ? ':armour-' + arm : '') + '/' + n + '/by-' + (by || 'nobody') + '/' + named(g0, x)] = run(g0, (g2, cb) => { const t = byId(g2, x.id); t.shield = 8; A.harm(cb, g2.rng, by === 'pc' ? byId(g2, u0.id) : by === 'foe' ? foes(g2)[2] : null, t, n, type, dt, arm); return null; }).line;
    }
  // heals and shields through the sinks, on a hurt unit of each side
  for (const n of [5, 20, 60]) for (const x of everyone(g0).slice(0, 4)) {
    T['flat/healUnit/' + n + '/' + named(g0, x)] = run(g0, (g2, cb) => { const t = byId(g2, x.id); t.hp = 1; A.healUnit(cb, t, n, byId(g2, al0.id), 'stim'); return null; }).line;
    T['flat/grantShield/' + n + '/' + named(g0, x)] = run(g0, (g2, cb) => { const t = byId(g2, x.id); t.shield = 10; A.grantShield(cb, t, n, byId(g2, al0.id)); return null; }).line;
  }
  // damage over time, at the start of the unit's turn: Bleeding, Burning, Corroded
  for (const x of everyone(g0)) for (const cnd of ['bleed', 'burning', 'corroded', 'poisoned']) T['flat/tick/' + cnd + '/' + named(g0, x)] = run(g0, (g2, cb) => {
    const t = byId(g2, x.id); t.shield = 8; if (cnd === 'bleed') t.bleed = 3; else { (t.conds ||= {})[cnd] = 3; (t.condBy ||= {})[cnd] = t.side === 'pc' ? foes(g2)[2].id : u0.id; }
    cb.turn = cb.order.indexOf(t.id); delete cb.window; A.beginTurn(cb, g2.rng); return null; }).line;
  // hazards: each kind and severity under a character in each armour Class and under a Soldier
  for (const h of A.HAZARDS) for (const sev of ['light', 'heavy']) {
    for (let ac = 0; ac <= 5; ac += 1) T['flat/hazard/' + h.id + '/' + sev + '/character-armour-class-' + ac] = run(g0, (g2, cb) => { const t = byId(g2, u0.id); t.armour = A.ARMOUR[ac]?.value || 0; t.shield = 8; A.hazardHit(cb, g2.rng, t, { id: 'hz', kind: h.id, severity: sev, zone: '', tiles: [t.pos], approaches: [] }, t.pos); return null; }).line;
    T['flat/hazard/' + h.id + '/' + sev + '/soldier'] = run(g0, (g2, cb) => { const t = foes(g2)[2]; A.hazardHit(cb, g2.rng, t, { id: 'hz', kind: h.id, severity: sev, zone: '', tiles: [t.pos], approaches: [] }, t.pos); return null; }).line;
  }
  // a map trap walked onto, a barrel set off beside units, by fight level
  for (const lv of [1, 6, 20]) {
    const g = fightSpec([{ ...SHOOTER, level: lv }, { ...SHOOTER, level: lv }], [{ tier: 'soldier', level: lv }, { tier: 'elite', level: lv }], { level: lv, seed: 'trap' }), [u, al] = pcs(g), [f, e] = foes(g);
    place(g, [[u, '3,5'], [al, '9,6'], [f, '8,5'], [e, '9,5']]); turn(g, u, 9);
    T['flat/trap/character/L' + lv] = run(g, (g2, cb) => { cb.objects = [A.makeObject('trap1', 'trap', '4,5')]; const t = byId(g2, u.id); t.shield = 8; A.moveUnit(cb, t, '4,5', g2.rng); return null; }).line;
    T['flat/trap/soldier/L' + lv] = run(g, (g2, cb) => { cb.objects = [A.makeObject('trap1', 'trap', '7,5')]; const t = byId(g2, f.id); t.ap = 9; cb.turn = cb.order.indexOf(t.id); A.moveUnit(cb, t, '7,5', g2.rng); return null; }).line;
    T['flat/barrel/L' + lv] = run(g, (g2, cb) => { cb.objects = [A.makeObject('barrel1', 'barrel', '9,4')]; byId(g2, al.id).shield = 8; A.damageObject(cb, '9,4', 999, 0, byId(g2, u.id)); return null; }).line;
    T['flat/barrel-shot/L' + lv] = (() => { const g2 = JSON.parse(JSON.stringify(g)); g2.combat.objects = [A.makeObject('barrel1', 'barrel', '9,4')]; return act(g2, { type: 'combat/shoot-cover', unitId: u.id, tile: '9,4' }, HIT).line; })();
  }
  // the medic's kit: a stim, by the giver's level and Healing given
  for (const lv of [1, 6, 12, 20]) for (const pts of [1, 5, 10]) {
    const g = fightSpec([{ kit: 'medic', level: lv, skills: { empathy: pts }, attrs: { insight: pts } }, { ...SHOOTER, level: lv }], [{ tier: 'soldier', level: lv }], { level: lv, seed: 'stim' }), [u, al] = pcs(g);
    place(g, [[u, '3,5'], [al, '3,6']]); turn(g, u, 9); al.hp = 1; u.stims = Math.max(2, u.stims || 0); charOf(g, u).stims = Math.max(2, charOf(g, u).stims || 0);
    T['flat/stim/L' + lv + '/points' + pts] = act(g, { type: 'combat/stim', unitId: u.id, targetId: al.id }, HIT).line;
    const gd = JSON.parse(JSON.stringify(g)), ad = byId(gd, al.id); Object.assign(ad, { hp: 0, downed: true, saves: { ok: 0, fail: 0 } });
    T['flat/stim-downed/L' + lv + '/points' + pts] = act(gd, { type: 'combat/stim', unitId: u.id, targetId: al.id }, HIT).line;
  }
}

// ============================================================================================== special
// The places that work out a derived hit of their own (the audit's section 1.2): each one made to happen once or more.
export function recordSpecial(T: Table) {
  const known = (g: any, u: any, ids: string[]) => { const p = A.phys.ensurePhys(charOf(g, u)); p.known = [...ids]; p.ready = { melee: ids.filter((i) => A.TECHNIQUE[i]?.system === 'melee'), ranged: ids.filter((i) => A.TECHNIQUE[i]?.system === 'ranged') }; p.uncapped = true; };
  // the carried round (Punch Through with a Heavy gun: the round goes on to the unit behind at half, less its armour as this round meets it)
  for (const wid of ['blackpoint_700', 'hellraiser_lmg', 'hellraiser_rotary', 'long_rifle']) for (const ammo of [null, 'armor_piercing', 'hollow_point']) for (const behind of ['soldier', 'elite']) {
    const g = fightSpec([{ ...SHOOTER, weapon: wid }], [{ tier: 'soldier' }, { tier: behind }], { level: 6, seed: 'carry' }), u = pcs(g)[0], [f, n] = foes(g);
    place(g, [[u, '3,5'], [f, '7,5'], [n, '8,5']]); turn(g, u); u.braced = true; known(g, u, ['punch_through']); if (ammo) u.ammoType = ammo; n.shield = 6;
    for (const [k, d] of [['hit', HIT], ['crit', CRIT]] as const) { const r = useTech(g, u.id, 'punch_through', { targetId: f.id, tile: f.pos }, d); if (r.ok) T['special/carried-round/' + wid + '/' + (ammo || 'standard') + '/behind-' + behind + '/' + k] = r.line; }
  }
  // Flush with an Arc weapon: half the weapon's damage with no roll, less armour, on a target in cover
  for (const wid of ['smetanita_thumper', 'recurve_bow', 'longbow', 'breacher_tube', 'hellraiser_service_rifle', 'lumeri_scattergun']) for (const tier of ['soldier', 'elite']) {
    const g = fightSpec([{ ...SHOOTER, weapon: wid }], [{ tier }], { level: 6, seed: 'flush' }), u = pcs(g)[0], f = foes(g)[0];
    place(g, [[u, '3,5'], [f, '8,5']]); g.combat.objects = [A.makeObject('wall1', 'low_wall', '7,5'), A.makeObject('wall2', 'low_wall', '8,4')]; turn(g, u); u.braced = true; known(g, u, ['flush']); f.shield = 6;
    const r = useTech(g, u.id, 'flush', { targetId: f.id, tile: f.pos }, HIT); if (r.ok) T['special/flush/' + wid + '/' + tier] = r.line;
  }
  // Interpose: the squadmate beside the one who is hit takes the blow in its place (the attack's damage against ITS armour)
  for (const [tier, wid] of [['soldier', 'hellraiser_service_rifle'], ['elite', 'adamantile_greatsword'], ['boss', 'hellraiser_lmg']]) for (const ac of [0, 3, 5]) {
    const g = fightSpec([{ ...SHOOTER }, { ...SHOOTER, name: 'Shield', weapon: 'sabre', skills: { ...SHOOTER.skills, durability: 4 }, attrs: { ...SHOOTER.attrs, endurance: 4 } }], [{ tier, weapon: wid }], { level: 6, seed: 'interpose' }), [p, q] = pcs(g), f = foes(g)[0];
    face(g, f, p, isMeleeW(wid)); q.pos = '7,6'; known(g, q, ['interpose']); q.armour = A.ARMOUR[ac].value; q.resMax = { ...(q.resMax || {}), guard: 5 }; q.res = { ...(q.res || {}), guard: 1 }; q.shield = 4;
    foeAttack(T, 'special/interpose/' + tier + '/armour-class-' + ac, g, f.id, p.id);
  }
  // The order of the multiplication when an item's own multipliers AND target bonuses are on the amount (a stand-in
  // item, harness.ts bend): a weapon attack multiplies the stack first, a spell the base first. Numbers chosen so that
  // the two orders part by a point (30 × 1.5 × 1.2 …): a change of order shows here.
  {
    const BENDS: [string, any][] = [['mults-1.5-1.2', { mults: [1.5, 1.2] }], ['vs-0.15-0.3', { vs: [0.15, 0.3] }], ['mults-1.5-1.2+vs-0.2', { mults: [1.5, 1.2], vs: [0.2] }], ['mult-1.1+vs-0.1-0.2+flat-3', { add: 3, mults: [1.1], vs: [0.1, 0.2] }],
      ['mults-1.3-1.15-0.9+vs-0.35', { mults: [1.3, 1.15, 0.9], vs: [0.35] }], ['vs-capped-0.7-0.6', { vs: [0.7, 0.6] }], ['vs-negative', { vs: [-0.5, -0.6] }], ['flat-negative-50', { add: -50 }],
      // where (base × own) × target and base × (own × target) part by a point: the rifle and the pistol on the first two, a spell of 30, 45 or 110 on the last three
      ['mult-1.25+vs-0.2', { mults: [1.25], vs: [0.2] }], ['mult-1.25+vs-0.4', { mults: [1.25], vs: [0.4] }], ['mult-1.2+vs-0.5', { mults: [1.2], vs: [0.5] }], ['mult-1.5+vs-0.2', { mults: [1.5], vs: [0.2] }], ['mult-0.75+vs-0.2', { mults: [0.75], vs: [0.2] }]];
    for (const wid of ['hellraiser_service_rifle', 'sabre', 'long_rifle', 'maul', 'service_pistol']) {
      const g = fightSpec([{ ...SHOOTER, weapon: wid }], [{ tier: 'soldier' }, { tier: 'minion' }], { level: 6, seed: 'bend' }), u = pcs(g)[0], [f, m] = foes(g);
      face(g, u, f, isMeleeW(wid)); turn(g, u); u.braced = true;
      for (const [name, b] of BENDS) for (const d of [['hit', HIT], ['crit', CRIT]] as const) T['special/order/weapon/' + wid + '/' + name + '/' + d[0]] = bend(b, () => strike(g, u.id, f.id, attackMode(wid), d[1]).line);
    }
    const g = fightSpec([{ ...SHOOTER }], [{ tier: 'soldier' }, { tier: 'minion' }], { level: 6, seed: 'bend' }), u = pcs(g)[0], [f] = foes(g);
    for (const [name, b] of BENDS) for (const n of [30, 45, 77, 110]) for (const [type, dt] of [['sigil', undefined], ['elemental', 'fire'], ['soul', undefined]] as const)
      T['special/order/spell/' + type + '/' + n + '/' + name] = bend(b, () => run(g, (g2, cb) => { A.harm(cb, g2.rng, pcs(g2)[0], foes(g2)[0], n, type, dt); return null; }).line);
  }
  // the stand-in item on REAL spells (step a7, leak 3: what an item adds, and what it multiplies by, on a Line, an
  // Outburst and a prayer as the engine casts them; the lines above hand harm a finished number)
  {
    const REAL: [string, any][] = [['flat-10', { add: 10 }], ['flat-10+mult-1.2', { add: 10, mults: [1.2] }], ['mult-1.2+vs-0.15', { mults: [1.2], vs: [0.15] }], ['mults-1.2-1.1', { mults: [1.2, 1.1] }], ['vs-0.15', { vs: [0.15] }], ['flat-negative-50', { add: -50 }]];
    const gs = fightSpec([{ ...CASTER }, { ...SHOOTER }], [{ tier: 'soldier' }, { tier: 'elite' }], { level: 6, seed: 'real' }), us = pcs(gs)[0];
    us.mg.words = Object.keys(A.SIGIL); us.mg.maxWords = 4; us.mg.evoker = true; place(gs, [[us, '5,5'], [foes(gs)[0], '9,5'], [foes(gs)[1], '9,7']]); turn(gs, us, 99);
    for (const [name, b] of REAL) for (const words of [['fire', 'seek'], ['shock', 'condense', 'seek'], ['stone', 'fire', 'condense', 'seek']]) for (const [k, d, seed] of [['hit', HIT, 4242], ['crit', { spell: true }, rollState(20)]] as const)
      T['special/flat/line/' + words.join('+') + '/' + name + '/' + k] = bend(b, () => line(gs, us.id, words, foes(gs)[0].pos, d, seed));
    const gh = heartFight({ ...HEART }, [{ tier: 'soldier' }, { tier: 'elite' }], { level: 6, seed: 'real' }), uh = pcs(gh)[0];
    place(gh, [[uh, '5,5'], [foes(gh)[0], '9,5'], [foes(gh)[1], '9,7']]); turn(gh, uh, 99);
    for (const [dn, dd] of [['raw', { school: 'damage' }], ['stone', { school: 'damage', tone: 'stone' }], ['fire-burst', { school: 'damage', tone: 'fire', modules: ['burst'] }]] as const) uh.mg.designs.push({ id: 'real_' + dn, name: 'Golden ' + dn, modules: [], ...dd });
    for (const [name, b] of REAL) for (const dn of ['raw', 'stone', 'fire-burst']) for (const st of [0, 2, 4]) for (const [k, d, seed] of [['hit', HIT, 4242], ['crit', { spell: true }, rollState(20)]] as const)
      T['special/flat/outburst/' + dn + '/stage' + st + '/' + name + '/' + k] = bend(b, () => outburst(gh, uh.id, 'real_' + dn, st, foes(gh)[0].pos, [], d, seed));
    for (const pid of ['nerukhan', 'old_overcast']) {
      const gp = fightSpec([{ name: 'Priest', level: 6, skills: { faith: 7 }, attrs: { virtue: 7 } }, { name: 'Ally', level: 6 }], [{ tier: 'soldier', level: 6 }, { tier: 'elite', level: 6 }], { level: 6, seed: 'real/' + pid });
      const up = pcs(gp)[0], c = charOf(gp, up); c.belief = { kind: 'faithful', patron: pid }; c.patron = pid; c.devotion = 10; if (A.setDevotionXp && A.devotionThreshold) A.setDevotionXp(c, A.devotionThreshold(10));
      place(gp, [[up, '5,5'], [pcs(gp)[1], '5,6'], [foes(gp)[0], '8,5'], [foes(gp)[1], '9,5']]); turn(gp, up, 9);
      const T2: Table = {};
      for (const [name, b] of REAL) { bend(b, () => prayers(T2, 'special/flat/prayer/' + pid + '/' + name, gp, up.id, foes(gp)[0].id, { hymn: 3, miracle: true })); }
      for (const [k, v] of Object.entries(T2)) if (/\bi:F\d/.test(v)) T[k] = v; // the prayers that hurt someone
    }
  }
  // Breaching Strike: a pushed enemy stopped by a body takes half the hit again (II: the body too)
  for (const tier of ['I', 'II']) for (const wid of ['maul', 'adamantile_greatsword']) {
    const g = fightSpec([{ ...SHOOTER, weapon: wid, perks: { breaching_strike: tier } }], [{ tier: 'soldier' }, { tier: 'elite' }], { level: 6, seed: 'breach' }), u = pcs(g)[0], [f, n] = foes(g);
    place(g, [[u, '6,5'], [f, '7,5'], [n, '8,5']]); turn(g, u); known(g, u, ['lunge', 'shove', 'charge']); meters(g, u, f); f.sv = { body: -99, brain: -99, heart: -99 }; n.shield = 6;
    for (const id of ['lunge', 'shove']) { const r = technique(T, 'special/breaching-strike@' + tier + '/' + wid + '/' + id, g, u.id, f.id, id); void r; }
  }
}

/** The sections, by the name of their file under test/golden/ (one JSON each). A section may return a count per
 * technique or item of the lines that hold a number (0: tried, and nothing to read): coverage.json keeps them. */
export const SECTIONS: Record<string, (T: Table) => Record<string, number> | void> = {
  'builds-normal': (T) => recordBuilds(T, ['normal']), 'builds-allin': (T) => recordBuilds(T, ['allin']), weapons: recordWeapons, enemies: recordEnemies, techniques: recordTechniques, sigil: recordSigil,
  outburst: recordOutburst, faith: recordFaith, 'items-perks': (T) => recordItems(T, 'perks'), 'items-traits-classes': (T) => recordItems(T, 'traits-classes'), flat: recordFlat, special: recordSpecial, 'items-shelved': recordShelved, literals: recordLiterals,
};
/** One section's table, sorted, without the actions that produced no number (a stance, a condition, a refusal). */
export function recordSection(name: string): { table: Table; counts: Record<string, number> | null } {
  const T: Table = {}, counts = SECTIONS[name](T) || null;
  return { table: Object.fromEntries(Object.entries(T).filter(([, v]) => v !== '=>' && !/^REFUSED/.test(v)).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))), counts };
}
