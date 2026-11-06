// Grid combat (spec: Combat on the grid; Attacks, damage and armour; Weapons; Downed and dying).
import { ENEMY, WEAPON, COMBAT_XP, type WeaponDef } from './data';
import { type Character, type Injury, ARMOUR, ONE_HANDED, loadedOf, spareMags, packOf, critMult, defense, healingMult, initiativeBonus, injuryResistPct, mainHandSide, maxHp, mod, movement, physicalMult } from './character';
import { type Rng, d20, die } from './rng';

/** cover = half cover tiles, full = full cover tiles (spec: Cover). */
export interface MapDef { id: string; name: string; w: number; h: number; solid: string[]; cover: string[]; full?: string[]; difficult: string[]; pcStart: string[]; foeStart: string[] }

/** The M813 rear landing pad from the Combat prototype; a generic yard for anything else. */
export const MAPS: Record<string, MapDef> = {
  rear_pad: {
    id: 'rear_pad', name: 'Outpost-813 rear landing pad', w: 16, h: 11,
    solid: (() => { const s: string[] = []; for (let x = 13; x < 16; x++) for (let y = 0; y < 6; y++) s.push(x + ',' + y); return s; })(),
    cover: ['11,2', '11,3', '11,4'], full: ['10,6'], // platinum crates (half); a cargo pylon (full)
    difficult: ['1,9', '2,9', '3,9', '4,9', '6,9', '7,9', '1,10', '3,10', '5,10', '8,10'],
    pcStart: ['3,6', '2,8', '5,8', '2,5', '4,7', '3,4'], foeStart: ['12,3', '12,6', '12,1', '11,7', '12,8', '10,1', '9,4'],
  },
  yard: {
    id: 'yard', name: 'Open ground', w: 16, h: 11, solid: [],
    cover: ['5,3', '5,4', '7,1', '8,9'], full: ['10,6', '10,7'], difficult: ['7,5', '8,5', '7,6'],
    pcStart: ['1,4', '1,6', '2,5', '1,8', '2,2', '1,2'], foeStart: ['14,5', '14,3', '14,7', '13,4', '13,6', '15,5', '13,9'],
  },
};

export interface Unit {
  id: string; side: 'pc' | 'foe'; name: string; short: string; charId?: string; img?: string; tier?: string;
  pos: string; hp: number; maxHp: number; def: number; armour: number; attack: number; weapon: string; movement: number; init: number; agility: number;
  ap: number; bank: number; ammo: number; heat: number; jammed: boolean; shotsThisTurn: number;
  downed: boolean; dead: boolean; saves: { ok: number; fail: number }; stunnedNext: number; kills: number;
  /** Injuries (spec: Injuries): head and torso last this fight; arm and leg go back to the character. */
  injuries?: Injury[]; bleed?: number; dazedNext?: number; injResist?: number; hand?: 'left' | 'right';
  /** PCs: spare magazines (rounds in each) and loose rounds for the weapon. Enemies leave these out: unlimited spares. */
  mags?: number[]; loose?: number;
  /** Magazines picked up for a different weapon: carried back to the pack after the fight. */
  extra?: { weapon: string; rounds: number }[];
  /** Analyzed (spec: Analyze): the squad sees this enemy's numbers; weakPoint adds +15% squad damage. */
  analyzedBy?: string; weakPoint?: boolean; analysis?: number;
}
export interface Combat { name: string; map: MapDef; units: Unit[]; order: string[]; turn: number; round: number; difficulty: string; log: string[]; over: null | 'win' | 'loss'; summary?: string;
  /** What lies on the floor: dropped magazines and the rounds left in them. */
  floor?: { pos: string; text: string; weapon?: string; rounds?: number }[];
  /** Cover still standing, with its HP; broken cover becomes rubble (spec: Cover). Old saves fall back to the map. */
  cover?: Record<string, { kind: 'half' | 'full'; hp: number; max: number }>; rubble?: string[] }

export const key = (x: number, y: number) => x + ',' + y;
export const xy = (k: string) => k.split(',').map(Number) as [number, number];
export const dist = (a: string, b: string) => { const [ax, ay] = xy(a), [bx, by] = xy(b); return Math.max(Math.abs(ax - bx), Math.abs(ay - by)); };

export function unitFromCharacter(c: Character, pos: string, rng: Rng): Unit {
  const w = WEAPON[c.weapon] || WEAPON.service_pistol;
  return {
    id: 'pc-' + c.id, side: 'pc', name: c.name, short: c.name.slice(0, 2).toUpperCase(), charId: c.id, img: c.portrait,
    pos, hp: c.hp, maxHp: maxHp(c), def: defense(c), armour: ARMOUR[c.armourClass]?.value || 0, attack: mod(c.skills[w.skill] || 0), weapon: w.id,
    movement: movement(c), init: d20(rng) + initiativeBonus(c), agility: c.attrs.agility || 1, ap: 0, bank: 0, ammo: Math.min(loadedOf(c), w.magazine ?? 0), heat: 0, jammed: false, shotsThisTurn: 0,
    downed: c.hp <= 0, dead: false, saves: { ok: 0, fail: 0 }, stunnedNext: 0, kills: 0,
    injuries: (c.injuries || []).map((i) => ({ ...i })), bleed: 0, dazedNext: 0, injResist: injuryResistPct(c), hand: mainHandSide(c),
    mags: [...spareMags(c)], loose: packOf(c).filter((x) => x.calibre && x.calibre === w.ammo).reduce((t, x) => t + x.qty, 0), analysis: c.skills.analysis || 0,
  };
}

export function unitFromEnemy(id: string, name: string, tierId: string, weaponId: string, pos: string, rng: Rng): Unit {
  const t = ENEMY[tierId] || ENEMY.minion, w = WEAPON[weaponId] || WEAPON.service_pistol;
  return {
    id, side: 'foe', name, short: name.split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase() || 'EN', tier: t.id,
    pos, hp: t.hp, maxHp: t.hp, def: t.defense, armour: t.armour, attack: t.attack_bonus, weapon: w.id, movement: t.movement,
    init: d20(rng) + t.attack_bonus, agility: 1, ap: 0, bank: 0, ammo: w.magazine ?? 0, heat: 0, jammed: false, shotsThisTurn: 0,
    downed: false, dead: false, saves: { ok: 0, fail: 0 }, stunnedNext: 0, kills: 0,
    injuries: [], bleed: 0, dazedNext: 0, injResist: 0, hand: 'right', // stat blocks have no Endurance yet: they resist as Endurance 1
  };
}

/** −2 to attacks when an injured arm holds the weapon: the main-hand arm, or either arm for a two-handed weapon. */
export const armPenalty = (u: Unit, w: WeaponDef) => ((u.injuries || []).some((i) => i.loc === 'arm' && (!ONE_HANDED.includes(w.category) || i.side === (u.hand || 'right'))) ? -2 : 0);

export const alive = (u: Unit) => !u.dead && !u.downed;
export const active = (cb: Combat) => cb.units.find((u) => u.id === cb.order[cb.turn]);

// ---------- cover (spec: Cover) ----------
export const COVER_HP = { half: 30, full: 80 };
export function coverOf(cb: Combat): Record<string, { kind: 'half' | 'full'; hp: number; max: number }> {
  if (!cb.cover) {
    cb.cover = {};
    for (const k of cb.map.cover) cb.cover[k] = { kind: 'half', hp: COVER_HP.half, max: COVER_HP.half };
    for (const k of cb.map.full || []) cb.cover[k] = { kind: 'full', hp: COVER_HP.full, max: COVER_HP.full };
  }
  return cb.cover;
}
const coverKeys = (cb: Combat, kind?: 'half' | 'full') => Object.entries(coverOf(cb)).filter(([, c]) => !kind || c.kind === kind).map(([k]) => k);
export const difficultOf = (cb: Combat) => new Set([...cb.map.difficult, ...(cb.rubble || [])]);
/** Damage a cover tile; at 0 HP it breaks into rubble. Returns a log suffix. */
export function damageCover(cb: Combat, k: string, dmg: number): string {
  const c = coverOf(cb)[k]; if (!c) return '';
  c.hp = Math.max(0, c.hp - Math.max(1, Math.floor(dmg)));
  if (c.hp > 0) return ' · the ' + (c.kind === 'half' ? 'half' : 'full') + ' cover takes ' + Math.floor(dmg) + ' (' + c.hp + '/' + c.max + ')';
  delete cb.cover![k]; (cb.rubble ||= []).push(k);
  return ' · the ' + c.kind + ' cover breaks into rubble';
}

// ---------- movement (spec: Moving; port of the prototype's paths()) ----------
export function paths(cb: Combat, from: string, self: string) {
  const { w, h } = cb.map, solid = new Set([...cb.map.solid, ...coverKeys(cb)]), diff = difficultOf(cb);
  const blocked = new Set(cb.units.filter((u) => u.id !== self && !u.dead).map((u) => u.pos));
  const d: Record<string, number> = { [from]: 0 }, prev: Record<string, string> = {}, open = [from];
  while (open.length) {
    open.sort((a, b) => d[a] - d[b]);
    const k = open.shift()!, [x, y] = xy(k);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy, n = key(nx, ny);
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || solid.has(n) || blocked.has(n)) continue;
      const nd = d[k] + (diff.has(n) ? 2 : 1) + (dx && dy ? 0.001 : 0);
      if (d[n] === undefined || nd < d[n] - 1e-9) { d[n] = nd; prev[n] = k; open.push(n); }
    }
  }
  for (const k of Object.keys(d)) d[k] = Math.round(d[k]);
  return { dist: d, prev };
}
/** Moving N tiles costs N ÷ Movement AP, rounded up, after tiles already paid for this turn. */
export const apForTiles = (tiles: number, bank: number, mov: number) => Math.ceil(Math.max(0, tiles - bank) / mov - 1e-9);

// ---------- line of sight and cover ----------
export function lineOfSight(cb: Combat, a: string, b: string): boolean {
  const solid = new Set([...cb.map.solid, ...coverKeys(cb, 'full')]); // half cover doesn't block sight
  let [x0, y0] = xy(a); const [x1, y1] = xy(b);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (!(x0 === x1 && y0 === y1)) {
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
    const k = key(x0, y0);
    if (k !== b && solid.has(k)) return false;
  }
  return true;
}
/** The half-cover tile protecting a target: next to it and between it and the attacker (spec: Cover). */
export function coverTileFor(cb: Combat, from: string, to: string): string | null {
  const [tx, ty] = xy(to);
  for (const c of coverKeys(cb, 'half')) {
    const [cx, cy] = xy(c);
    if (Math.max(Math.abs(cx - tx), Math.abs(cy - ty)) === 1 && dist(from, c) < dist(from, to)) return c;
  }
  return null;
}
export const coverBonus = (cb: Combat, from: string, to: string) => (coverTileFor(cb, from, to) ? 5 : 0);

// ---------- attacks ----------
export const isMelee = (w: WeaponDef) => /melee|unarmed/.test(w.category);
export const weaponDamage = (w: WeaponDef, range: number, rawPower = 0) =>
  typeof w.damage === 'number' ? w.damage : w.damage?.within_4 ? (range <= 4 ? w.damage.within_4 : w.damage.within_8) : w.id === 'recurve_bow' ? 20 + 5 * rawPower : 20;
export const attackApCost = (w: WeaponDef, mode: string) => (isMelee(w) ? (w.category.startsWith('heavy') ? 3 : 2) : mode === 'aimed' ? 3 : (w.ap_cost.single ?? 2));
export const effectiveRange = (w: WeaponDef) => (typeof w.range_tiles === 'number' ? w.range_tiles : 8);

export interface AttackPreview { ok: boolean; why?: string; ap: number; toHit: number; need: number; pct: number; cover: number; coverTile?: string | null; rangePenalty: number }
export function previewAttack(cb: Combat, att: Unit, tgt: Unit, mode: 'shot' | 'aimed' | 'melee'): AttackPreview {
  const w = WEAPON[att.weapon], melee = isMelee(w) || mode === 'melee', useW = mode === 'melee' && !isMelee(w) ? WEAPON.fists : w;
  const ap = attackApCost(useW, mode);
  const fail = (why: string): AttackPreview => ({ ok: false, why, ap, toHit: 0, need: 0, pct: 0, cover: 0, rangePenalty: 0 });
  if (!alive(tgt) && !tgt.downed) return fail('Target is out of the fight.');
  if (att.ap < ap) return fail('Needs ' + ap + ' AP.');
  const r = dist(att.pos, tgt.pos);
  if (melee && r > (useW.properties?.includes('reach_2') || useW.id === 'lance' ? 2 : 1)) return fail('Out of melee reach.');
  if (!melee && att.jammed) return fail('Weapon jammed: clear it (2 AP).');
  if (!melee && w.magazine != null && att.ammo <= 0) return fail('Empty: reload (2 AP).');
  if (!melee && !lineOfSight(cb, att.pos, tgt.pos)) return fail('No line of sight.');
  const eff = effectiveRange(useW), bands = melee ? 0 : Math.max(0, Math.ceil(r / eff) - 1);
  if (bands > 2) return fail('Out of range.');
  const coverTile = melee ? null : coverTileFor(cb, att.pos, tgt.pos), cover = coverTile ? 5 : 0;
  const rangePenalty = -2 * bands;
  const heat = melee ? 0 : -Math.floor(att.heat / 2);
  const toHit = att.attack + (useW.accuracy || 0) + (mode === 'aimed' ? 2 : 0) + rangePenalty + heat + armPenalty(att, useW) + (tgt.downed ? 2 : 0) - cover;
  const pct = Math.max(5, Math.min(95, (21 - (tgt.def - toHit)) * 5));
  return { ok: true, ap, toHit, need: tgt.def, pct, cover, coverTile, rangePenalty };
}

export interface AttackResult { roll: number; total: number; vs: number; hit: boolean; crit: boolean; fumble: boolean; damage: number; line: string; killed: boolean }
export function resolveAttack(cb: Combat, rng: Rng, att: Unit, tgt: Unit, mode: 'shot' | 'aimed' | 'melee', who: Character | null): AttackResult {
  const pv = previewAttack(cb, att, tgt, mode);
  const w = WEAPON[att.weapon], melee = isMelee(w) || mode === 'melee', useW = mode === 'melee' && !isMelee(w) ? WEAPON.fists : w;
  att.ap -= pv.ap;
  const roll = d20(rng), total = roll + pv.toHit;
  const crit = roll === 20 || (mode === 'aimed' && roll >= 19), fumble = roll === 1;
  const hit = !fumble && (crit || total >= pv.need);
  if (!melee) {
    if (w.magazine != null) att.ammo = Math.max(0, att.ammo - 1);
    att.heat += 1; att.shotsThisTurn++;
    if (fumble || (w.heat_limit && att.heat >= w.heat_limit)) att.jammed = true;
  } else if (fumble) att.stunnedNext = 1;
  let damage = 0, killed = false, injury = '';
  if (hit) {
    const base = weaponDamage(useW, dist(att.pos, tgt.pos), who?.skills.raw_power || 0);
    let dmg = base * (who ? physicalMult(who) : 1);
    if (crit) dmg *= who ? critMult(who) : 2;
    if (tgt.weakPoint && att.side === 'pc') dmg *= 1.15;
    damage = Math.max(1, Math.floor(dmg) - (useW.properties?.includes('ignores_10_armour') ? Math.max(0, tgt.armour - 10) : tgt.armour));
    if (tgt.downed) { tgt.saves.fail += crit ? 2 : 1; if (tgt.saves.fail >= 3) { tgt.dead = true; killed = true; } }
    else {
      tgt.hp = Math.max(0, tgt.hp - damage);
      if (tgt.hp === 0) { if (tgt.side === 'foe') { tgt.dead = true; } else { tgt.downed = true; } killed = true; }
    }
    if (killed) att.kills += tgt.tier === 'boss' ? 3 : 1;
    if (crit && !tgt.dead && !tgt.downed) injury = rollInjury(rng, tgt);
  }
  // A shot that misses only because of half cover's −5 hits the cover (spec: Cover).
  if (!hit && !fumble && pv.coverTile && total + pv.cover >= pv.need) injury = ' · stopped by cover' + damageCover(cb, pv.coverTile, weaponDamage(useW, dist(att.pos, tgt.pos), who?.skills.raw_power || 0) * (who ? physicalMult(who) : 1));
  const verb = melee ? 'strikes' : mode === 'aimed' ? 'takes an aimed shot at' : 'fires at';
  const line = att.name + ' ' + verb + ' ' + tgt.name + ': d20 ' + roll + ' ' + (pv.toHit >= 0 ? '+' : '−') + Math.abs(pv.toHit) + (pv.cover ? ' (incl. −5 cover)' : '') + ' = ' + total + ' vs ' + pv.need +
    (fumble ? (melee ? ' · fumble, −1 AP next turn' : ' · natural 1, the gun jams') : hit ? (crit ? ' · CRITICAL, ' : ' · hit, ') + damage + ' damage' + (killed ? (tgt.side === 'foe' ? ' · down for good' : ' · Downed') : '') + injury : ' · miss' + injury);
  cb.log.push(line);
  return { roll, total, vs: pv.need, hit, crit, fumble, damage, line, killed };
}

/** After a critical: Injury resistance (d100), then a d6 for the location (spec: Injuries). Returns the log suffix. */
export function rollInjury(rng: Rng, t: Unit): string {
  const resist = t.injResist || 0;
  if (resist > 0) { const r = die(rng, 100); if (r <= resist) return ' · injury resisted (d100 ' + r + ' ≤ ' + resist + '%)'; }
  const d = die(rng, 6), inj = t.injuries || (t.injuries = []);
  if (d === 1) { t.dazedNext = 1; return ' · INJURY (d6 ' + d + '): head, Dazed'; }
  if (d <= 3) { t.bleed = 3; return ' · INJURY (d6 ' + d + '): torso, Bleeding'; }
  const side: 'left' | 'right' = die(rng, 2) === 1 ? 'left' : 'right';
  if (d === 4) { inj.push({ loc: 'arm', side }); return ' · INJURY (d6 ' + d + '): ' + side + ' arm, −2 to attacks with it'; }
  if (!inj.some((i) => i.loc === 'leg')) t.movement = Math.max(0.5, t.movement / 2);
  inj.push({ loc: 'leg', side });
  return ' · INJURY (d6 ' + d + '): ' + side + ' leg, half Movement';
}

// ---------- turns ----------
export function startCombat(name: string, mapId: string, pcs: { c: Character }[], foes: { name: string; tier: string; weapon: string }[], difficulty: string, rng: Rng): Combat {
  const map = MAPS[mapId] || MAPS.rear_pad;
  const units: Unit[] = [];
  pcs.forEach(({ c }, i) => units.push(unitFromCharacter(c, map.pcStart[i % map.pcStart.length], rng)));
  foes.slice(0, map.foeStart.length).forEach((f, i) => units.push(unitFromEnemy('foe-' + i, f.name, f.tier, f.weapon, map.foeStart[i], rng)));
  const order = [...units].sort((a, b) => b.init - a.init || b.agility - a.agility).map((u) => u.id);
  const cb: Combat = { name, map, units, order, turn: 0, round: 1, difficulty: COMBAT_XP[difficulty] ? difficulty : 'standard', log: ['Initiative: ' + order.map((id) => { const u = units.find((x) => x.id === id)!; return u.name + ' ' + u.init; }).join(' · ')], over: null };
  coverOf(cb);
  beginTurn(cb, rng);
  return cb;
}

/** Start the active unit's turn: AP, heat cooldown, Downed death saves (spec: Downed and dying). */
export function beginTurn(cb: Combat, rng: Rng) {
  const u = active(cb);
  if (!u) return;
  u.ap = Math.max(2, Math.min(9, 6 - (u.stunnedNext ? 1 : 0) - (u.dazedNext ? 2 : 0)));
  if (u.dazedNext) cb.log.push(u.name + ' is Dazed: −2 AP this turn.');
  u.stunnedNext = 0; u.dazedNext = 0; u.bank = 0; u.shotsThisTurn = 0; u.heat = Math.max(0, u.heat - 2);
  if (u.bleed && !u.dead && !u.downed) {
    u.bleed--; u.hp = Math.max(0, u.hp - 5);
    cb.log.push(u.name + ' bleeds: 5 damage' + (u.hp === 0 ? (u.side === 'foe' ? ' · down for good' : ' · Downed') : ''));
    if (u.hp === 0) { if (u.side === 'foe') u.dead = true; else u.downed = true; u.bleed = 0; u.ap = 0; return; }
  }
  if (u.downed && !u.dead) {
    const r = d20(rng);
    if (r >= 10) u.saves.ok++; else u.saves.fail++;
    cb.log.push(u.name + ' is Downed: death save d20 ' + r + (r >= 10 ? ' · success (' + u.saves.ok + '/3)' : ' · failure (' + u.saves.fail + '/3)'));
    if (u.saves.ok >= 3) { u.downed = false; u.hp = 1; u.saves = { ok: 0, fail: 0 }; cb.log.push(u.name + ' stabilises at 1 HP.'); }
    else if (u.saves.fail >= 3) { u.dead = true; cb.log.push(u.name + ' dies.'); }
    u.ap = 0;
  }
}

export function checkOver(cb: Combat) {
  const foes = cb.units.filter((u) => u.side === 'foe'), pcs = cb.units.filter((u) => u.side === 'pc');
  if (foes.every((u) => u.dead || u.downed)) cb.over = 'win';
  else if (pcs.every((u) => u.dead || u.downed)) cb.over = 'loss';
  return cb.over;
}

/** Pass the turn to the next unit that can act; Downed PCs still get turns (death saves). */
export function endTurn(cb: Combat, rng: Rng) {
  if (checkOver(cb)) return;
  for (let guard = 0; guard < cb.units.length * 2; guard++) {
    cb.turn++;
    if (cb.turn >= cb.order.length) { cb.turn = 0; cb.round++; }
    const u = active(cb)!;
    if (u.dead || (u.side === 'foe' && u.downed)) continue;
    beginTurn(cb, rng);
    if (u.dead || (u.downed && u.side === 'pc')) { checkOver(cb); if (cb.over) return; continue; }
    return;
  }
}

export function moveUnit(cb: Combat, u: Unit, to: string): string | null {
  if (u.downed || u.dead) return 'Downed units can\'t move.';
  const P = paths(cb, u.pos, u.id);
  const tiles = P.dist[to];
  if (tiles === undefined || to === u.pos) return 'Can\'t reach that tile.';
  const ap = apForTiles(tiles, u.bank, u.movement);
  if (ap > u.ap) return 'Needs ' + ap + ' AP.';
  u.ap -= ap; u.bank = u.bank + ap * u.movement - tiles; u.pos = to;
  cb.log.push(u.name + ' moves ' + tiles + (tiles === 1 ? ' tile' : ' tiles') + ' for ' + ap + ' AP.');
  return null;
}

/** Reload (spec: Reloading): 2 AP. A magazine weapon swaps in the fullest spare and drops the one in the gun on the floor;
 *  a weapon loaded round by round tops up from loose rounds. Enemies carry unlimited spares. */
export function reload(cb: Combat, u: Unit): string | null {
  const w = WEAPON[u.weapon];
  if (w.magazine == null) return 'Nothing to reload.';
  if (u.ap < 2) return 'Needs 2 AP.';
  if (u.side === 'foe' || !u.mags) { u.ap -= 2; u.ammo = w.magazine; u.jammed = false; cb.log.push(u.name + ' reloads.'); return null; }
  if (w.reload === 'loose') {
    const room = w.magazine - u.ammo, take = Math.min(room, u.loose || 0);
    if (room <= 0) return 'Already full.';
    if (!take) return 'No rounds left to load.';
    u.ap -= 2; u.ammo += take; u.loose = (u.loose || 0) - take; u.jammed = false;
    cb.log.push(u.name + ' loads ' + take + (take === 1 ? ' round' : ' rounds') + ' (' + u.loose + ' loose left).');
    return null;
  }
  if (!u.mags.some((n) => n > 0)) return 'No loaded spare ' + (w.reload_unit || 'magazine') + 's.' + (u.mags.length && u.loose ? ' Load one first.' : '');
  const i = u.mags.indexOf(Math.max(...u.mags)), fresh = u.mags.splice(i, 1)[0];
  const left = u.ammo, unit = w.reload_unit || 'magazine';
  (cb.floor ||= []).push({ pos: u.pos, weapon: u.weapon, rounds: left, text: (left ? unit + ' with ' + left + (left === 1 ? ' round' : ' rounds') : 'empty ' + unit) });
  u.ap -= 2; u.ammo = fresh; u.jammed = false;
  cb.log.push(u.name + ' reloads and drops the ' + (left ? unit + ' on the floor with ' + left + (left === 1 ? ' round' : ' rounds') + ' still in it' : 'empty ' + unit) + ' (' + u.mags.length + ' spare left).');
  return null;
}
/** Pick up (spec: Magazines and rounds are inventory): 1 AP, everything on your tile or one adjacent tile. */
export function pickUp(cb: Combat, u: Unit, tile: string): string | null {
  if (dist(u.pos, tile) > 1) return 'Stand on it or next to it.';
  const here = (cb.floor || []).filter((f) => f.pos === tile && f.weapon);
  if (!here.length) return 'Nothing to pick up there.';
  if (u.ap < 1) return 'Needs 1 AP.';
  u.ap -= 1;
  for (const f of here) { if (f.weapon === u.weapon && u.mags) u.mags.push(f.rounds || 0); else (u.extra ||= []).push({ weapon: f.weapon!, rounds: f.rounds || 0 }); }
  cb.floor = (cb.floor || []).filter((f) => !here.includes(f));
  cb.log.push(u.name + ' picks up ' + here.map((f) => f.text).join(', ') + '.');
  return null;
}
/** Load a spare magazine from loose rounds (spec: Loading): 1 AP per 5 rounds; part-loads when AP runs short. */
export const ROUNDS_PER_AP = 5;
export function loadMagazine(cb: Combat, u: Unit): string | null {
  const w = WEAPON[u.weapon];
  if (!w || w.reload !== 'magazine' || !u.mags) return 'Nothing to load.';
  const cap = w.magazine || 0, open = u.mags.map((n, i) => [n, i]).filter(([n]) => n < cap).sort((a, b) => b[0] - a[0]);
  if (!open.length) return 'Every spare ' + (w.reload_unit || 'magazine') + ' is full.';
  if (!u.loose) return 'No loose rounds to load.';
  if (u.ap < 1) return 'Needs 1 AP.';
  const [n, i] = open[0], rounds = Math.min(cap - n, u.loose, u.ap * ROUNDS_PER_AP), cost = Math.ceil(rounds / ROUNDS_PER_AP);
  u.mags[i] = n + rounds; u.loose -= rounds; u.ap -= cost;
  cb.log.push(u.name + ' loads ' + rounds + (rounds === 1 ? ' round' : ' rounds') + ' into a ' + (w.reload_unit || 'magazine') + ' (' + u.mags[i] + '/' + cap + ') for ' + cost + ' AP.');
  return null;
}
/** Shoot cover on purpose (spec: Cover): the weapon's attack AP and ammo, no roll, the weapon's damage. */
export function shootCover(cb: Combat, u: Unit, tile: string, who: Character | null): string | null {
  const c = coverOf(cb)[tile]; if (!c) return 'That isn\'t cover.';
  const w = WEAPON[u.weapon], melee = isMelee(w), ap = attackApCost(w, melee ? 'melee' : 'shot');
  if (u.ap < ap) return 'Needs ' + ap + ' AP.';
  const r = dist(u.pos, tile);
  if (melee) { if (r > 1) return 'Out of melee reach.'; }
  else {
    if (u.jammed) return 'Weapon jammed: clear it (2 AP).';
    if (w.magazine != null && u.ammo <= 0) return 'Empty: reload (2 AP).';
    if (!lineOfSight(cb, u.pos, tile)) return 'No line of sight.';
    if (Math.ceil(r / effectiveRange(w)) - 1 > 2) return 'Out of range.';
    if (w.magazine != null) u.ammo--; u.heat += 1;
  }
  u.ap -= ap;
  cb.log.push(u.name + (melee ? ' smashes' : ' shoots') + ' the cover' + damageCover(cb, tile, weaponDamage(w, r, who?.skills.raw_power || 0) * (who ? physicalMult(who) : 1)) + '.');
  return null;
}
/** Analyze (spec: Analyze): 2 AP, 1 with Quick Read (Analysis 3); range 4 + Analysis; line of sight; no roll. */
export const analyzeCost = (u: Unit) => ((u.analysis || 0) >= 3 ? 1 : 2);
export function analyze(cb: Combat, u: Unit, t: Unit): string | null {
  if (t.side !== 'foe' || t.dead) return 'Pick a living enemy.';
  if (t.analyzedBy) return t.name + ' is already analyzed.';
  const cost = analyzeCost(u), range = 4 + (u.analysis || 0);
  if (u.ap < cost) return 'Needs ' + cost + ' AP.';
  if (dist(u.pos, t.pos) > range) return 'Out of Analyze range (' + range + ' tiles).';
  if (!lineOfSight(cb, u.pos, t.pos)) return 'No line of sight.';
  u.ap -= cost; t.analyzedBy = u.name; t.weakPoint = (u.analysis || 0) >= 5;
  cb.log.push(u.name + ' analyzes ' + t.name + ': HP ' + t.hp + '/' + t.maxHp + ', Defense ' + t.def + ', armour ' + t.armour + (t.weakPoint ? ' · Weak Point: +15% squad damage' : '') + '.');
  return null;
}
export function clearJam(cb: Combat, u: Unit): string | null {
  if (!u.jammed) return 'Not jammed.';
  if (u.ap < 2) return 'Needs 2 AP.';
  u.ap -= 2; u.jammed = false; u.heat = 0;
  cb.log.push(u.name + ' clears the jam.');
  return null;
}
/** Stim (spec: Downed and dying; Medic Triage): an adjacent ally. Downed: stabilise at 1 HP (1 AP Medic, 2 AP others). Else heal 30 × Healing given. */
export function useStim(cb: Combat, u: Unit, t: Unit, who: Character, isMedic: boolean): string | null {
  if (who.stims <= 0) return 'No stims left.';
  if (dist(u.pos, t.pos) > 1) return 'Must be adjacent.';
  if (t.dead) return 'Too late.';
  const cost = t.downed ? (isMedic ? 1 : 2) : 1;
  if (u.ap < cost) return 'Needs ' + cost + ' AP.';
  u.ap -= cost; who.stims--;
  if (t.bleed) { t.bleed = 0; cb.log.push('The stim stops ' + t.name + '\'s bleeding.'); }
  if (t.downed) { t.downed = false; t.hp = 1; t.saves = { ok: 0, fail: 0 }; cb.log.push(u.name + ' stims ' + t.name + ': stabilised at 1 HP.'); }
  else { const heal = Math.floor(30 * healingMult(who)); t.hp = Math.min(t.maxHp, t.hp + heal); cb.log.push(u.name + ' stims ' + t.name + ': +' + heal + ' HP.'); }
  return null;
}

/** Enemy turn: shoot the most hurt PC in sight and range; otherwise close in. Deterministic given the RNG. */
export function enemyTurn(cb: Combat, rng: Rng) {
  const u = active(cb)!;
  for (let step = 0; step < 6 && u.ap > 0 && !cb.over; step++) {
    if (u.jammed && u.ap >= 2) { clearJam(cb, u); continue; }
    const w = WEAPON[u.weapon];
    if (w.magazine != null && u.ammo <= 0 && u.ap >= 2) { reload(cb, u); continue; }
    const targets = cb.units.filter((t) => t.side === 'pc' && !t.dead)
      .map((t) => ({ t, pv: previewAttack(cb, u, t, isMelee(w) ? 'melee' : 'shot') }))
      .filter((x) => x.pv.ok)
      .sort((a, b) => (a.t.downed ? 1 : 0) - (b.t.downed ? 1 : 0) || a.t.hp - b.t.hp || b.pv.pct - a.pv.pct);
    if (targets.length) { resolveAttack(cb, rng, u, targets[0].t, isMelee(w) ? 'melee' : 'shot', null); checkOver(cb); continue; }
    // close in: the reachable tile that is nearest a living PC and has line of sight to one
    const P = paths(cb, u.pos, u.id), pcs = cb.units.filter((t) => t.side === 'pc' && !t.dead);
    if (!pcs.length) break;
    let best: string | null = null, bestScore = Infinity;
    for (const [k, tiles] of Object.entries(P.dist)) {
      if (k === u.pos || apForTiles(tiles, u.bank, u.movement) > u.ap - (u.ap > 2 ? 2 : 0)) continue;
      const near = Math.min(...pcs.map((t) => dist(k, t.pos)));
      const sees = pcs.some((t) => lineOfSight(cb, k, t.pos) && dist(k, t.pos) <= effectiveRange(w));
      const score = (sees ? 0 : 100) + near + tiles * 0.1;
      if (score < bestScore) { bestScore = score; best = k; }
    }
    if (!best || moveUnit(cb, u, best)) break;
  }
}

export const combatXp = (cb: Combat) => COMBAT_XP[cb.difficulty] || 50;
export const die6 = (rng: Rng) => die(rng, 6);
