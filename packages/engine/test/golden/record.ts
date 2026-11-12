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
import { A, W, act, run, tryAct, dice, HIT, CRIT, rollState, fightOf, fightSpec, place, turn, units, pcs, foes, charOf, label, TIERS, TIER_WEAPON, isMeleeW } from './harness';

export type Table = Record<string, string>;
const clone = (g: any) => JSON.parse(JSON.stringify(g));
const byId = (g: any, id: string) => units(g).find((u) => u.id === id);
const r3 = (v: number) => Math.round(v * 1000) / 1000;
const pvLine = (pv: any) => (!pv.ok ? 'NO ' + String(pv.why || '').slice(0, 70) : 'pv ' + r3(pv.dmg?.total ?? 0) + ' armour ' + (pv.dmg?.armour ?? 0) + ' crit ' + r3(pv.dmg?.crit ?? 0) + ' pierce ' + (pv.dmg?.pierce ?? 0) + ' ap ' + pv.ap + ' pct ' + pv.pct);
const attackMode = (wid: string) => (isMeleeW(wid) ? 'melee' : 'shot');
/** The actor at 3,5 (a gun, a spell) or 6,5 (a blade), the target at 7,5; everyone else out of the way. */
function face(g: any, u: any, t: any, melee: boolean) { place(g, [[u, melee ? '6,5' : '3,5'], [t, '7,5']]); }
const meters = (g: any, u: any, t: any) => { if (u.resMax?.momentum != null) { u.res ||= {}; u.res.momentum = u.resMax.momentum; } try { t.pressure = W(g, () => A.pressureCap(t)); } catch { /* no Pressure on this unit */ } };

// ---------------------------------------------------------------------------------------------- plain attacks
/** A plain attack by unit uId on unit tId in g (already placed, uId's turn): preview, a hit and a critical. */
function plainAttack(T: Table, key: string, g: any, uId: string, tId: string, mode: string) {
  const u = byId(g, uId), t = byId(g, tId);
  T[key + '/preview'] = pvLine(W(g, () => A.previewAttack(g.combat, u, t, mode)));
  T[key + '/hit'] = act(g, { type: 'combat/attack', unitId: uId, targetId: tId, mode }, HIT).line;
  T[key + '/crit'] = act(g, { type: 'combat/attack', unitId: uId, targetId: tId, mode }, CRIT).line;
}
/** An enemy's plain attack on a unit, straight through resolveAttack (no AI): a hit and a critical. */
function foeAttack(T: Table, key: string, g: any, fId: string, tId: string) {
  for (const [k, d] of [['hit', HIT], ['crit', CRIT]] as const) {
    T[key + '/' + k] = run(g, (g2, cb) => {
      const a = byId(g2, fId), p = byId(g2, tId), mode = attackMode(a.weapon);
      a.ap = 9; a.braced = true; a.heat = 0; a.shotsThisTurn = 0; cb.turn = cb.order.indexOf(a.id);
      const r = A.resolveAttack(cb, g2.rng, a, p, mode, null); return r.refused ? 'Refused: ' + r.refused : null;
    }, d).line;
  }
}

// ---------------------------------------------------------------------------------------------- techniques
const TECH_TRIES = (g: any, u: any, t: any, ally: any) => [
  { targetId: t.id, tile: t.pos }, { targetId: t.id, tile: t.pos, opt: 'head' }, { targetId: t.id }, { tile: t.pos }, {},
  ...(ally ? [{ allyId: ally.id }, { allyId: ally.id, targetId: t.id }] : []), { targetId: t.id, tile: '8,5' }, { tile: '5,5' },
];
function technique(T: Table, key: string, g: any, uId: string, tId: string, id: string) {
  const u = byId(g, uId), t = byId(g, tId), ally = pcs(g).find((x) => x.id !== uId);
  const r = tryAct(g, { type: 'combat/technique', unitId: uId, id }, TECH_TRIES(g, u, t, ally), HIT);
  T[key] = r.line; return r;
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
  const steps: any[] = [{ type: 'combat/outburst', unitId: uId, design, hold: true }];
  for (let i = 0; i < stage; i++) steps.push({ type: 'combat/pump', unitId: uId, ...(feelings[i] ? { feeling: feelings[i] } : {}) });
  steps.push({ type: 'combat/release', unitId: uId, aim });
  let cur = g; const out: string[] = [];
  for (const s of steps) {
    const r = act(cur, s, d, seed); if (!r.ok) { out.push(s.type.slice(7) + ' ' + r.line); break; }
    if (r.line !== '=>') out.push(s.type.slice(7) + ' ' + r.line);
    cur = r.g; const u = byId(cur, uId); if (u) u.ap = 99;
  }
  return out.join(' ; ');
}

// ---------------------------------------------------------------------------------------------- prayers
const PRAY_TRIES = (g: any, u: any, t: any, ally: any) => [{ targetId: t.id }, ...(ally ? [{ targetId: ally.id }, { targetId: ally.id, targetId2: t.id }] : []), { targetId: u.id }, {}, { tile: t.pos }, { targetId: t.id, tile: '8,5' }, ...(ally ? [{ targetId: ally.id, tile: '4,6' }] : [])];
function prayers(T: Table, key: string, g: any, uId: string, tId: string, max: { hymn: number; miracle: boolean }) {
  const u = byId(g, uId), t = byId(g, tId), c = charOf(g, u), p = A.FAITH_PATRON[c.patron || c.belief?.patron], ally = pcs(g).find((x) => x.id !== uId);
  if (!p) return;
  const tries = PRAY_TRIES(g, u, t, ally);
  for (const w of A.WHISPERS) T[key + '/whisper/' + w.id] = tryAct(g, { type: 'combat/pray', unitId: uId, kind: 'whisper', id: w.id }, tries, HIT).line;
  for (const h of p.hymns) if (h.tier <= max.hymn) T[key + '/hymn/' + h.id] = tryAct(g, { type: 'combat/pray', unitId: uId, kind: 'hymn', id: h.id }, tries, HIT).line;
  if (max.miracle) T[key + '/miracle/' + p.miracle.id] = tryAct(g, { type: 'combat/pray', unitId: uId, kind: 'miracle', id: p.miracle.id }, tries, HIT).line;
}

// ============================================================================================== build
export function recordBuilds(T: Table) {
  for (const b of BUILDS) for (const v of VARIANTS) for (const L of LEVELS) {
    const key = 'build/' + b.id + '/' + v + '/L' + L, built = buildCharacter(b.id, v, L);
    const g0 = fightOf([built.c, buildCharacter('plain_gun', 'normal', L).c], TIERS.map((tier) => ({ tier })), { level: L, seed: key });
    const u0 = pcs(g0)[0], c = charOf(g0, u0), melee = isMeleeW(u0.weapon), mode = attackMode(u0.weapon);
    T[key + '/sheet'] = W(g0, () => ['weapon ' + u0.weapon + ' x' + r3(A.weaponMult(c, u0.weapon)), 'rarity ' + r3(u0.dmgMult || 1), 'sigil ' + r3(A.sigilMult(c)), 'elemental ' + r3(A.elementalMult(c)), 'soul ' + r3(A.soulMult(c)),
      'healing ' + r3(A.healingMult(c)), 'blessing ' + r3(A.blessingPower(c)), 'crit ' + r3(A.critMult(c)), 'mend ' + r3(A.mendFactorOf(u0)), 'hp ' + u0.maxHp, 'armour ' + u0.armour, 'def ' + u0.def,
      ...(u0.mg ? ['unit sigil ' + r3(u0.mg.sigilMult ?? 0) + ' elem ' + r3(u0.mg.elemMult ?? 0) + ' soul ' + r3(u0.mg.soulMult ?? 0) + ' heal ' + r3(u0.mg.healMult ?? 0) + ' base ' + (u0.mg.soulBase ?? '')] : [])].join(', '));
    for (const tier of TIERS) {
      const g = clone(g0), u = pcs(g)[0], t = foes(g).find((x) => x.tier === tier)!;
      face(g, u, t, melee); turn(g, u);
      plainAttack(T, key + '/plain/' + tier, g, u.id, t.id, mode);
      // what that tier's own attack does to the build (the enemy next to it for a bite or a blade, 4 tiles off with a gun)
      const gb = clone(g0), ub = pcs(gb)[0], tb = foes(gb).find((x) => x.tier === tier)!; face(gb, tb, ub, isMeleeW(tb.weapon));
      foeAttack(T, key + '/taken/' + tier, gb, tb.id, ub.id);
    }
    // every technique on the pad, on a Soldier and a Boss, its price met (Momentum full, the target Pressed as far as it goes)
    for (const tier of ['soldier', 'boss']) {
      const g = clone(g0), u = pcs(g)[0], t = foes(g).find((x) => x.tier === tier)!;
      face(g, u, t, melee); turn(g, u); meters(g, u, t);
      const pad = W(g, () => A.techniquePad(g.combat, u, 'main', g)).flatMap((x: any) => x.entries).filter((e: any) => e.group !== 'answer' && e.group !== 'watch' && !['cut', 'shot'].includes(e.id));
      for (const e of pad) technique(T, key + '/tech/' + e.id + '/' + tier, g, u.id, t.id, e.id);
    }
    // its Lines, its Outburst, its prayers: on a Soldier
    const gs = clone(g0), us = pcs(gs)[0], ts = foes(gs).find((x) => x.tier === 'soldier')!; place(gs, [[us, '5,5'], [ts, '9,5'], [pcs(gs)[1], '4,6']]); turn(gs, us, 99);
    if (us.mg?.evoker && (us.mg.words || []).length) {
      const known: string[] = us.mg.words, subj = known.filter((w) => A.SIGIL[w]?.damage), max = us.mg.maxWords || 2;
      for (const s of subj) {
        const lines = [[s, 'seek'], [s, 'condense', 'seek'], [s, subj.find((x) => x !== s) || 'fire', 'condense', 'seek']].filter((l) => l.length <= max && l.every((w) => known.includes(w)));
        for (const l of lines) T[key + '/sigil/' + l.join('+')] = line(gs, us.id, l, ts.pos);
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
    const melee = isMeleeW(w.id), modes = melee ? ['melee'] : ['shot', 'aimed'];
    for (const tier of TIERS) for (const mode of modes) {
      const g = clone(g0), u = pcs(g)[0], t = foes(g).find((x) => x.tier === tier)!;
      face(g, u, t, melee); turn(g, u); u.braced = true;
      plainAttack(T, 'weapon/' + w.id + '/' + mode + '/' + tier, g, u.id, t.id, mode);
      if (!melee && typeof w.damage === 'object' && mode === 'shot') { place(g, [[u, '1,5'], [t, '7,5']]); plainAttack(T, 'weapon/' + w.id + '/shot-at-6/' + tier, g, u.id, t.id, mode); }
    }
  }
  // the things that bend a plain attack: special rounds, mods, a worn or broken blade, conditions, an ambush, rarity
  const bend = (name: string, wid: string, set: (g: any, u: any, t: any) => void) => {
    for (const tier of ['minion', 'soldier', 'elite']) {
      const g = fightSpec([{ ...SHOOTER, weapon: wid }], TIERS.map((t) => ({ tier: t })), { level: 6, seed: 'bend/' + name }), u = pcs(g)[0], t = foes(g).find((x) => x.tier === tier)!;
      face(g, u, t, isMeleeW(wid)); turn(g, u); set(g, u, t);
      plainAttack(T, 'weapon-bend/' + name + '/' + wid + '/' + tier, g, u.id, t.id, attackMode(wid));
    }
  };
  for (const a of Object.keys(A.AMMO_TYPES)) bend('round-' + a, 'hellraiser_service_rifle', (g, u) => { u.ammoType = a; });
  for (const m of ['mod_suppressor', 'mod_bayonet']) bend(m, 'hellraiser_service_rifle', (g, u) => { u.mods = [...(u.mods || []), m]; });
  bend('mod_bayonet-blow', 'hellraiser_service_rifle', (g, u, t) => { u.mods = [...(u.mods || []), 'mod_bayonet']; u.pos = '6,5'; });
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
    T['weapon-bend/boss-guard/' + tier + '/L' + lv] = act(g, { type: 'combat/attack', unitId: u.id, targetId: t.id, mode: 'shot' }, HIT).line;
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
  ranged: ['hellraiser_service_rifle', 'long_rifle', 'service_pistol', 'lumeri_scattergun', 'hellraiser_lmg', 'recurve_bow', 'crossbow', 'decrkm_smg', 'smetanita_thumper', 'throwing_knives', 'core_rifle'],
};
export function recordTechniques(T: Table): Record<string, number> {
  const ran: Record<string, number> = {};
  for (const def of Object.values(A.TECHNIQUE) as any[]) {
    ran[def.id] = 0;
    for (const wid of TECH_WEAPONS[def.system] || []) for (const off of def.needs?.shield ? ['riot_shield'] : [null]) {
      const g0 = fightSpec([{ ...SHOOTER, weapon: wid }, { ...SHOOTER }], [{ tier: 'soldier' }, { tier: 'elite' }, { tier: 'soldier' }], { level: 6, seed: 'tech/' + def.id });
      const u0 = pcs(g0)[0], c = charOf(g0, u0), p = A.phys.ensurePhys(c);
      p.known = [def.id]; p.ready = { melee: def.system === 'melee' ? [def.id] : [], ranged: def.system === 'ranged' ? [def.id] : [] }; p.uncapped = true;
      if (off) { u0.offWeapon = off; c.offHand = { id: off }; }
      for (const tier of ['soldier', 'elite']) {
        const g = clone(g0), u = pcs(g)[0], t = foes(g).find((x) => x.tier === tier)!, melee = isMeleeW(wid) && wid !== 'throwing_knives';
        place(g, [[u, melee ? '6,5' : '3,5'], [t, '7,5'], [foes(g)[2], '8,5'], [pcs(g)[1], '3,6']]); turn(g, u); u.braced = true; meters(g, u, t);
        if (def.needs?.hidden) { u.hidden = true; u.hideEntry = 1; }
        const r = technique(T, 'tech/' + def.id + '/' + wid + '/' + tier, g, u.id, t.id, def.id);
        if (r.ok && /\bi:|\bh:|\bs:/.test(r.line)) ran[def.id]++;
        if (!r.ok) delete T['tech/' + def.id + '/' + wid + '/' + tier]; // this weapon cannot make it: nothing to hold still
      }
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
  // an enemy heart caster's Outburst
  for (const tier of ['soldier', 'elite', 'boss']) for (const lv of [1, 12]) {
    const g = fightSpec([{ ...SHOOTER, level: lv }], [{ tier, level: lv }], { level: lv, seed: 'outburst-foe' }), p = pcs(g)[0], f = foes(g)[0];
    T['outburst-enemy/' + tier + '/L' + lv] = run(g, (g2, cb) => {
      const fu = byId(g2, f.id), t = byId(g2, p.id); place(g2, [[fu, '5,5'], [t, '9,5']]);
      const kind = Object.keys(A.HEART_CASTER || {})[0]; if (!kind || !A.heartMagic) return 'No heart casters';
      fu.mg = A.heartMagic(fu, kind); fu.ap = 99; cb.turn = cb.order.indexOf(fu.id);
      const d = fu.mg.designs?.[0]; if (!d) return 'No design';
      let e = A.beginOutburst ? A.beginOutburst(cb, g2.rng, fu, d.id, t.pos) : 'no beginOutburst'; return e || null;
    }, HIT).line;
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
const PERKD: Record<string, any> = Object.fromEntries(A.PERKS.map((p: any) => [p.id, p]));
const tiersOf = (p: any): string[] => (p.tiers ? Object.keys(p.tiers) : [p.tier === 'acquired' ? 'I' : p.tier]);
function needs(p: any, tier: string, skills: Record<string, number> = {}, perks: Record<string, string> = {}) {
  const req = [...(p.requires || []), ...(p.tiers?.[tier]?.requires || [])];
  for (const r of req) {
    if (r.skill) skills[r.skill] = Math.max(skills[r.skill] || 0, r.min || 1);
    if (r.perk && PERKD[r.perk]) { perks[r.perk] = PERKD[r.perk].tier === 'acquired' ? 'I' : PERKD[r.perk].tier; needs(PERKD[r.perk], perks[r.perk], skills, perks); }
  }
  for (const s of p.skills || []) skills[s] = Math.max(skills[s] || 0, p.tier === 'mastered' ? 10 : p.tier === 'achieved' ? 5 : tier === 'II' ? 5 : 3);
  return { skills, perks };
}
/** The standard fight of the item sweep: the holder at 3,6, a Soldier next to it (4,6), a squadmate at 2,6, a second Soldier 4 tiles off. */
function itemFight(spec: any, seed: string) {
  const g = fightSpec([{ level: 6, ...spec }, { name: 'Squadmate', level: 6 }], [{ tier: 'soldier', name: 'Soldier' }, { tier: 'soldier', name: 'Far soldier' }, { tier: 'elite', name: 'Elite' }], { level: 6, seed });
  const [u, al] = pcs(g), [f, far, el] = foes(g);
  place(g, [[u, '3,6'], [f, '4,6'], [al, '2,6'], [far, '7,6'], [el, '7,9']]); turn(g, u, 9);
  al.hp = Math.ceil(al.maxHp * 0.4); u.hp = Math.ceil(u.maxHp * 0.6);
  return g;
}
const ITEM_TRIES = (g: any) => {
  const [u, al] = pcs(g), [f, far] = foes(g);
  const U = [{}, { targetId: f.id }, { targetId: al.id }, { targetId: u.id }, { targetId: far.id }], TI = [{}, { tile: '3,7' }, { tile: f.pos }, { tile: '6,6' }];
  return TI.flatMap((t) => U.map((x) => ({ ...x, ...t })));
};
function itemProbe(T: Table, key: string, spec: any, itemKey: string | null, base: Table | null): number {
  let g: any; try { g = itemFight(spec, 'item'); } catch (e: any) { T[key + '/setup'] = 'THREW ' + String(e?.message || e).slice(0, 80); return 0; }
  const [u, al] = pcs(g), [f, far] = foes(g), out: Table = {};
  out.shot = act(g, { type: 'combat/attack', unitId: u.id, targetId: far.id, mode: 'shot' }, HIT).line;
  out['shot-crit'] = act(g, { type: 'combat/attack', unitId: u.id, targetId: far.id, mode: 'shot' }, CRIT).line;
  out.blow = act(g, { type: 'combat/attack', unitId: u.id, targetId: f.id, mode: 'melee' }, HIT).line;
  out.taken = run(g, (g2, cb) => { const a = byId(g2, f.id), p = byId(g2, u.id); a.ap = 9; cb.turn = cb.order.indexOf(a.id); A.resolveAttack(cb, g2.rng, a, p, 'shot', null); return null; }, HIT).line;
  out['taken-blast'] = run(g, (g2, cb) => { A.hurtUnit(byId(g2, u.id), 40, false, cb, 'explosion', byId(g2, f.id)); return null; }).line;
  out['taken-fire'] = run(g, (g2, cb) => { A.harm(cb, g2.rng, byId(g2, f.id), byId(g2, u.id), 30, 'elemental', 'fire'); return null; }).line;
  out['heal-given'] = run(g, (g2, cb) => { A.healUnit(cb, byId(g2, al.id), 20, byId(g2, u.id), 'stim'); return null; }).line;
  out['heal-taken'] = run(g, (g2, cb) => { A.healUnit(cb, byId(g2, u.id), 20, byId(g2, al.id), 'stim'); return null; }).line;
  out['shield-given'] = run(g, (g2, cb) => { A.grantShield(cb, byId(g2, al.id), 20, byId(g2, u.id)); return null; }).line;
  let n = 0;
  // with the item held, only what it changed is written (base: the same character without it)
  for (const [k, v] of Object.entries(out)) if (!base || base[k] !== v) { T[key + '/' + k] = v; n++; }
  if (itemKey) {
    let list: any[] = [];
    try { list = W(g, () => A.perkActionsFor({ u, c: charOf(g, u), cb: g.combat, g }, 'combat')).filter((e: any) => e.id === itemKey); } catch { list = []; }
    for (const e of list) {
      const choice = e.options?.length ? e.options.slice(0, e.pickMulti || 1).map((o: any) => o.id).join(' ') : undefined;
      const r = tryAct(g, { type: 'combat/perk', unitId: u.id, id: itemKey, actionId: e.actionId, ...(choice ? { choice } : {}), ...(e.target === 'text' ? { text: 'halt' } : {}) }, ITEM_TRIES(g), HIT);
      if (r.ok && r.line !== '=>') { T[key + '/action/' + e.actionId] = r.line; n++; }
      // an action that arms the next attack (or sets something up): the shot and the blow that follow it
      if (r.ok) for (const [k, a] of [['then-shot', { type: 'combat/attack', unitId: u.id, targetId: far.id, mode: 'shot' }], ['then-blow', { type: 'combat/attack', unitId: u.id, targetId: f.id, mode: 'melee' }]] as const) {
        const u2 = byId(r.g, u.id); if (u2) u2.ap = 9; const r2 = act(r.g, a, HIT);
        if (r2.ok && r2.line !== out[k === 'then-shot' ? 'shot' : 'blow']) { T[key + '/action/' + e.actionId + '/' + k] = r2.line; n++; }
      }
    }
  }
  if (!base) return n;
  return n;
}
export function recordItems(T: Table): Record<string, number> {
  const seen: Record<string, number> = {};
  const baseOf = (spec: any): Table => { const b: Table = {}; itemProbe(b, 'b', spec, null, null); return Object.fromEntries(Object.entries(b).map(([k, v]) => [k.slice(2), v])); };
  { const b: Table = {}; itemProbe(b, 'item/none', {}, null, null); Object.assign(T, b); }
  for (const p of A.PERKS) for (const tier of tiersOf(p)) {
    const { skills, perks } = needs(p, tier), attrs: Record<string, number> = {};
    for (const [s, n] of Object.entries(skills)) { const at = A.SKILL[s]?.attribute; if (at) attrs[at] = Math.max(attrs[at] || 0, n); }
    const core = A.SKILL[Object.keys(skills)[0]]?.core || '', classId = /mind/i.test(core) ? 'mage' : /soul/i.test(core) ? 'channeler' : 'fighter';
    const without = { skills, attrs, perks: { ...perks }, classId }, withIt = { ...without, perks: { ...perks, [p.id]: tier } };
    seen['perk:' + p.id + '@' + tier] = itemProbe(T, 'item/perk/' + p.id + '@' + tier, withIt, 'perk:' + p.id, baseOf(without));
  }
  for (const t of A.TRAITS) seen['trait:' + t.id] = itemProbe(T, 'item/trait/' + t.id, { traits: [t.id] }, 'trait:' + t.id, baseOf({}));
  for (const cls of Object.keys(A.BASE_CLASS)) {
    const at = A.CLASS[cls].attribute, sk = (A.CLASS[cls].skills || []) as string[];
    for (const [rank, lv, pts] of [['I', 3, 4], ['II', 6, 6], ['III', 12, 9]] as const) {
      const skills = Object.fromEntries(sk.map((s) => [s, pts])), attrs = { [at]: pts };
      const withIt = { classId: cls, level: lv, skills, attrs, ...(cls === 'mage' || cls === 'trickster' ? { kit: 'sigil' } : cls === 'channeler' || cls === 'bard' ? { kit: 'soul' } : cls === 'guardian' ? {} : {}) };
      const without = { ...withIt, classId: null };
      const base = baseOf(without);
      // the class as a whole (its passives on the shot, the blow and the hit taken), then each move's own action
      let g: any; try { g = itemFight(withIt, 'item'); } catch { continue; }
      const u = pcs(g)[0], keys: string[] = W(g, () => (u.held ? A.classMoveKeys?.(u.held) || [] : [])).map((m: any) => m.key);
      const b: Table = {}; itemProbe(b, 'x', withIt, null, null);
      for (const [k, v] of Object.entries(b)) if (base[k.slice(2)] !== v) T['item/class/' + cls + '@' + rank + '/' + k.slice(2)] = v;
      const list = W(g, () => A.perkActionsFor({ u, c: charOf(g, u), cb: g.combat, g }, 'combat')).filter((e: any) => String(e.id).startsWith('class:'));
      for (const e of list) {
        const choice = e.options?.length ? e.options.slice(0, e.pickMulti || 1).map((o: any) => o.id).join(' ') : undefined;
        const r = tryAct(g, { type: 'combat/perk', unitId: u.id, id: e.id, actionId: e.actionId, ...(choice ? { choice } : {}), ...(e.target === 'text' ? { text: 'halt' } : {}) }, ITEM_TRIES(g), HIT);
        const k = 'item/class/' + cls + '@' + rank + '/' + e.id.slice(6) + '/' + e.actionId;
        seen[e.id] = (seen[e.id] || 0) + (r.ok && r.line !== '=>' ? 1 : 0);
        if (r.ok && r.line !== '=>') T[k] = r.line;
        if (r.ok) for (const [kk, a] of [['then-shot', { type: 'combat/attack', unitId: u.id, targetId: foes(g)[1].id, mode: 'shot' }], ['then-blow', { type: 'combat/attack', unitId: u.id, targetId: foes(g)[0].id, mode: 'melee' }]] as const) {
          const u2 = byId(r.g, u.id); if (u2) u2.ap = 9; const r2 = act(r.g, a, HIT);
          if (r2.ok && r2.line !== b['x/' + (kk === 'then-shot' ? 'shot' : 'blow')]) T[k + '/' + kk] = r2.line;
        }
      }
      for (const kx of keys) if (!(kx in seen)) seen[kx] = 0;
    }
  }
  return seen;
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

/** Everything, in one table. The second value: what was tried and produced no number (for the coverage list). */
export function record(): { table: Table; techniques: Record<string, number>; items: Record<string, number> } {
  const T: Table = {};
  recordBuilds(T); recordWeapons(T); recordEnemies(T);
  const techniques = recordTechniques(T);
  recordSigil(T); recordOutburst(T); recordFaith(T);
  const items = recordItems(T);
  recordFlat(T);
  return { table: Object.fromEntries(Object.entries(T).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))), techniques, items };
}
