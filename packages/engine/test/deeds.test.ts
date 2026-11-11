// Deeds the engine sees (rules 1.14; spec item 1014): the nine combo-perk deeds the engine grants by itself in a fight.
// For each deed: a fight where it happens (the perk, the story line and the spotlight), and the near misses.
import { describe, expect, it } from 'vitest';
import { apply, emit, emitFx, healUnit, damageObject, makeObject, addStrain, PERK, ENGINE_DEEDS, SPOTLIGHT_FX, newGame, type Combat, type GameState, type Unit } from '../src';
import { fightWith, storyWith, withGame, sheetOf, type CharSpec } from './helpers/perkfight';

type F = ReturnType<typeof fightWith>;
const open = (cb: Combat) => { cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; };
/** An open field: the squad at 2,5 2,6…, the foes at 8,5 9,5…; the first character's turn with 6 AP. */
function fight(specs: CharSpec[] = [{}], foes: any[] = [{}], pre?: (f: F) => void) {
  const f = fightWith(specs, foes.map((x, i) => ({ at: 'J6', ...x, name: x.name || 'Foe ' + (i + 1) })));
  open(f.cb); f.pcs.forEach((u, i) => { u.pos = '2,' + (5 + i); });
  f.foes.forEach((u, i) => { u.pos = (8 + i) + ',5'; });
  for (const u of f.cb.units) { u.hp = u.maxHp; delete (u as any).downed; }
  pre?.(f);
  delete (f.cb as any).deeds; withGame(f.g, () => emit(f.cb, 'combat_start', { cb: f.cb, order: [...f.cb.order] })); // the fight "opens" here, on the test's own field
  for (const u of f.cb.units) { u.hp = u.maxHp; delete (u as any).downed; }
  f.turn(f.pc); f.pc.ap = 6;
  return f;
}
const charOf = (f: { g: GameState }, i = 0) => Object.values(f.g.characters)[i];
const has = (f: { g: GameState }, perk: string, i = 0) => charOf(f, i).perks.some((p) => p.id === perk && p.tier === 'achieved');
const lines = (g: GameState) => (g.story.entries as any[]).map((e) => e.text || '').join('\n');
const spots = (g: GameState, perk: string) => [...((g.combat as any)?.fx || []), ...((g.story as any).fx || [])].filter((e: any) => e.k === SPOTLIGHT_FX && e.kind === 'legend' && e.perk === perk);
/** The perk was granted the way the Narrator grants it: the perk, the deed on the sheet, the story line, one spotlight. */
function granted(f: { g: GameState }, perk: string, i = 0) {
  const c = charOf(f, i), deed = String((PERK as any)[perk].deed);
  expect(has(f, perk, i), perk + ' held').toBe(true);
  expect(c.perks.filter((p) => p.id === perk).length).toBe(1);
  expect(c.deeds.some((d) => d.toLowerCase() === deed.toLowerCase()), 'the deed is on the sheet').toBe(true);
  expect(lines(f.g)).toContain(c.name + ' earns the combo perk ' + (PERK as any)[perk].name + ': ');
  const s = spots(f.g, perk); expect(s.length, 'one spotlight').toBe(1); expect(s[0].char).toBe(c.id); expect(String(s[0].line).toLowerCase()).toBe(deed.toLowerCase());
}
const none = (f: { g: GameState }, perk: string, i = 0) => { expect(has(f, perk, i), perk + ' not held').toBe(false); expect(spots(f.g, perk).length).toBe(0); };
/** Every enemy falls and the turn ends: the fight is won. */
function win(f: F) { f.foes.forEach((u) => { u.hp = 0; u.dead = true; }); f.act({ type: 'combat/end-turn', unitId: f.cb.order[f.cb.turn] } as any); expect(f.g.combat?.over ?? 'win').toBe('win'); }
/** The squad falls and the turn ends: the fight is lost. */
function lose(f: F) { const id = f.cb.order[f.cb.turn]; f.pcs.forEach((u) => { u.hp = 0; u.downed = true; }); withGame(f.g, () => 0); f.act({ type: 'combat/end-turn', unitId: id } as any); }
const miss = (f: F, n: number, tgt: Unit = f.pc) => withGame(f.g, () => { for (let i = 0; i < n; i++) emit(f.cb, 'on_miss', { att: f.foe, tgt, mode: 'shot', cb: f.cb }); });
/** An enemy (or whoever is given) leaves this unit at this HP; at 0 it goes Downed. */
const wound = (f: F, t: Unit, hp: number, by: Unit | null = f.foe, type = 'weapon') => withGame(f.g, () => {
  const src = { by, type }; t.hp = hp;
  if (hp <= 0) { t.downed = true; emit(f.cb, 'on_downed', { victim: t, by, src, dead: false, cb: f.cb }); }
  emit(f.cb, 'on_damaged', { t, src, dmg: 5, cb: f.cb });
});
const J = (g: GameState) => JSON.stringify(g);
const SK = (...ids: string[]) => ({ skills: Object.fromEntries(ids.map((s) => [s, 5])) });
const reload = (f: F): GameState => JSON.parse(JSON.stringify(f.g));

describe('the list', () => {
  it('names nine combo perks, each with a deed sentence in the data', () => {
    expect(Object.keys(ENGINE_DEEDS).sort()).toEqual(['between_heartbeats', 'bite_the_bullet', 'charge', 'dance_of_iron', 'field_surgeon', 'fire_sermon', 'siege_engine', 'the_voice', 'twin_souls']);
    for (const id of Object.keys(ENGINE_DEEDS)) { expect((PERK as any)[id].tier).toBe('achieved'); expect(String((PERK as any)[id].deed).length).toBeGreaterThan(5); }
  });
});

describe('Charge!: open a fight by charging the enemy line, and win it', () => {
  const C = SK('intimidation', 'athletics');
  const charge = (f: F, to = '7,5') => f.act({ type: 'combat/move', unitId: f.pc.id, to } as any);
  it('a straight run of 3+ tiles to an enemy as the first thing done, and the fight won: granted at the fight\'s end', () => {
    const f = fight([C], [{}, {}]); f.pc.ap = 9; charge(f);
    expect(f.pc.pos).toBe('7,5'); none(f, 'charge'); // not before the win
    win(f); granted(f, 'charge');
  });
  it('the memory survives a save and reload in the middle', () => {
    const f = fight([C], [{}, {}]); f.pc.ap = 9; charge(f);
    let g = reload(f); expect((g.combat as any).deeds.u[f.pc.id].open).toBe(1);
    g.combat!.units.filter((u) => u.side === 'foe').forEach((u) => { u.hp = 0; u.dead = true; });
    g = apply(g, { type: 'combat/end-turn', unitId: f.pc.id } as any, 'host');
    granted({ g }, 'charge');
  });
  it('near misses: the fight lost; a run of 2 tiles; a bent run; something else done first; not eligible; already held', () => {
    let f = fight([C, {}], [{}, {}]); f.pc.ap = 9; charge(f); expect((f.cb as any).deeds.u[f.pc.id].open).toBe(1); lose(f); none(f, 'charge');
    f = fight([C], [{}, {}]); f.foes[0].pos = '5,5'; f.pc.ap = 9; charge(f, '4,5'); win(f); none(f, 'charge');
    f = fight([C], [{}, {}]); f.foes[0].pos = '6,7'; f.pc.ap = 9; charge(f, '5,6'); // 2,5 → 5,6 is no straight line
    expect((f.cb as any).deeds.u[f.pc.id].open).toBe(0); win(f); none(f, 'charge');
    f = fight([C], [{}, {}]); f.pc.ap = 9; f.act({ type: 'combat/prone', unitId: f.pc.id } as any); f.pc.prone = false; f.pc.ap = 9; charge(f); win(f); none(f, 'charge');
    f = fight([{ skills: { intimidation: 5, athletics: 4 } }], [{}, {}]); f.pc.ap = 9; charge(f); win(f); none(f, 'charge');
    f = fight([{ ...C, perks: { charge: 'achieved' } }], [{}, {}]); f.pc.ap = 9; charge(f); win(f);
    expect(charOf(f).perks.filter((p) => p.id === 'charge').length).toBe(1); expect(spots(f.g, 'charge').length).toBe(0);
  });
  it('HOLE CLOSED: one lone enemy is no "enemy line" (a fight started with a single minion grants nothing)', () => {
    const f = fight([C]); f.pc.ap = 9; charge(f); expect(f.pc.pos).toBe('7,5'); win(f); none(f, 'charge');
  });
  it('HOLE CLOSED: a fight already under way with no memory (a save from before this build) is not "opened" after loading', () => {
    const f = fight([C], [{}, {}]); delete (f.cb as any).deeds; f.pc.ap = 9; charge(f);
    expect((f.cb as any).deeds.u[f.pc.id].open).toBe(2); win(f); none(f, 'charge');
  });
  it('HOLE CLOSED: a run made on somebody else\'s turn, before your own first turn, is not your opening', () => {
    const f = fight([C], [{}, {}]); f.cb.turn = f.cb.order.indexOf(f.foe.id);
    withGame(f.g, () => emit(f.cb, 'moved', { u: f.pc, from: '2,5', to: '7,5', how: 'move', forced: false, route: ['3,5', '4,5', '5,5', '6,5', '7,5'], cb: f.cb }));
    expect((f.cb as any).deeds.u[f.pc.id].open).toBe(0);
  });
  it('a charge on a later turn is not the opening', () => {
    const f = fight([C], [{}, {}]); f.act({ type: 'combat/end-turn', unitId: f.pc.id } as any);
    f.foes[0].pos = '8,5'; f.pc.pos = '2,5'; f.turn(f.pc); f.pc.ap = 9; charge(f); win(f); none(f, 'charge');
  });
});

describe('Field Surgeon: bring a squadmate back from below 10% HP', () => {
  const S = SK('proficiency', 'camaraderie');
  const heal = (f: F, n: number, by: Unit = f.pcs[0], t: Unit = f.pcs[1]) => withGame(f.g, () => healUnit(f.cb, t, n, by, 'test'));
  it('a standing ally under 10% lifted to 10% or more: granted at once', () => {
    const f = fight([S, {}]); const a = f.pcs[1]; wound(f, a, Math.ceil(a.maxHp * 0.1) - 1);
    heal(f, 30); expect(a.hp * 10).toBeGreaterThanOrEqual(a.maxHp); granted(f, 'field_surgeon');
  });
  it('a Downed ally back on their feet: granted', () => {
    const f = fight([S, {}]); const a = f.pcs[1]; wound(f, a, 0);
    heal(f, 5); expect(a.downed).toBe(false); granted(f, 'field_surgeon');
  });
  it('near misses: the ally was at 10% or above; the heal leaves them under 10%; healing yourself; not eligible', () => {
    let f = fight([S, {}]); wound(f, f.pcs[1], Math.ceil(f.pcs[1].maxHp * 0.1)); heal(f, 30); none(f, 'field_surgeon');
    f = fight([S, {}]); f.pcs[1].healRecv = 1; wound(f, f.pcs[1], 1); heal(f, 2); expect(f.pcs[1].hp * 10).toBeLessThan(f.pcs[1].maxHp); none(f, 'field_surgeon');
    heal(f, 60); granted(f, 'field_surgeon'); // the heal that does bring them back earns it
    f = fight([S, {}]); wound(f, f.pcs[0], 1); heal(f, 60, f.pcs[0], f.pcs[0]); none(f, 'field_surgeon');
    f = fight([{}, {}]); wound(f, f.pcs[1], 1); heal(f, 60); none(f, 'field_surgeon');
  });
  it('it never repeats', () => {
    const f = fight([S, {}]); wound(f, f.pcs[1], 1); heal(f, 60); wound(f, f.pcs[1], 1); heal(f, 60);
    granted(f, 'field_surgeon');
  });
  it('HOLE CLOSED: a friendly setup earns nothing (the squad shoots the ally low, or the ally burns their own heart, then the heal)', () => {
    let f = fight([S, {}]); wound(f, f.pcs[1], 1, f.pcs[0]); heal(f, 60); none(f, 'field_surgeon'); // the healer's own shot
    f = fight([S, {}]); wound(f, f.pcs[1], 0, f.pcs[0]); heal(f, 60); none(f, 'field_surgeon'); // shot Downed by the squad
    f = fight([S, {}]); wound(f, f.pcs[1], 1, null, 'strain'); heal(f, 60); none(f, 'field_surgeon'); // their own Strain
    f = fight([S, {}]); f.pcs[1].hp = 1; heal(f, 60); none(f, 'field_surgeon'); // HP that fell with nobody's doing
  });
  it('a hazard counts as an enemy does; a wound carried in from an earlier fight counts', () => {
    let f = fight([S, {}]); wound(f, f.pcs[1], 1, null, 'hazard'); heal(f, 60); granted(f, 'field_surgeon');
    f = fight([S, {}]); delete (f.cb as any).deeds; f.pcs[1].hp = 1; withGame(f.g, () => emit(f.cb, 'combat_start', { cb: f.cb, order: [...f.cb.order] })); heal(f, 60); granted(f, 'field_surgeon');
  });
  it('HOLE CLOSED: the heal of a companion earns its owner nothing; an enemy\'s heal earns nobody anything', () => {
    let f = fight([S, S, {}]); wound(f, f.pcs[2], 1); f.pcs[1].companion = true as any; heal(f, 60, f.pcs[1], f.pcs[2]); none(f, 'field_surgeon', 0); none(f, 'field_surgeon', 1);
    f = fight([S, {}]); wound(f, f.pcs[1], 1); heal(f, 60, f.foe, f.pcs[1]); none(f, 'field_surgeon');
  });
});

describe('Dance of Iron: dodge three attacks in one round', () => {
  const D = SK('dexterity', 'athletics');
  it('three misses in one round: granted on the third', () => {
    const f = fight([D]); miss(f, 2); none(f, 'dance_of_iron'); miss(f, 1); granted(f, 'dance_of_iron');
  });
  it('near misses: two dodges; two in one round and one in the next; not eligible; an ally\'s miss', () => {
    let f = fight([D]); miss(f, 2); win(f); none(f, 'dance_of_iron');
    f = fight([D]); miss(f, 2); f.cb.round++; miss(f, 1); none(f, 'dance_of_iron');
    f = fight([{}]); miss(f, 3); none(f, 'dance_of_iron');
    f = fight([D, {}]); withGame(f.g, () => { for (let i = 0; i < 3; i++) emit(f.cb, 'on_miss', { att: f.pcs[1], tgt: f.pcs[0], cb: f.cb }); }); none(f, 'dance_of_iron');
  });
  it('HOLE CLOSED: one burst is one attack (its three missed shots are one dodge); two bursts are two', () => {
    const burst = (f: F, n = 3) => withGame(f.g, () => { emitFx(f.cb, 'volley', { unit: f.foe.id, target: f.pc.id }); for (let i = 0; i < n; i++) emit(f.cb, 'on_miss', { att: f.foe, tgt: f.pc, mode: 'shot', volley: 'burst', cb: f.cb }); });
    const f = fight([D]); burst(f); expect((f.cb as any).deeds.u[f.pc.id].dg[1]).toBe(1); none(f, 'dance_of_iron');
    burst(f); none(f, 'dance_of_iron'); burst(f); granted(f, 'dance_of_iron');
  });
  it('HOLE CLOSED: only the one who dodged earns it, and only once', () => {
    const f = fight([D, D]); miss(f, 3); granted(f, 'dance_of_iron', 0); expect(has(f, 'dance_of_iron', 1)).toBe(false);
    miss(f, 3); f.cb.round++; miss(f, 3); granted(f, 'dance_of_iron', 0);
  });
  it('the count survives a save and reload in the middle of the round', () => {
    const f = fight([D]); miss(f, 2);
    const g = reload(f), cb = g.combat!; expect((cb as any).deeds.u[f.pc.id].dg.slice(0, 2)).toEqual([cb.round, 2]);
    withGame(g, () => emit(cb, 'on_miss', { att: cb.units.find((u) => u.side === 'foe'), tgt: cb.units.find((u) => u.side === 'pc'), cb }));
    granted({ g }, 'dance_of_iron');
  });
});

describe('Between Heartbeats: come through an ambush without being hit', () => {
  const B = SK('reaction_speed', 'composure');
  /** A fight that opens with a Hidden enemy (an ambush on the squad). */
  function ambush(specs: CharSpec[], hidden = true) {
    const f = fight(specs);
    if (hidden) { f.foe.hidden = true; f.foe.hideEntry = 1; }
    delete (f.cb as any).deeds; withGame(f.g, () => emit(f.cb, 'combat_start', { cb: f.cb, order: [...f.cb.order] }));
    return f;
  }
  it('the Narrator\'s fight with a hidden enemy is read as an ambush', () => {
    const s = storyWith([B]);
    s.act({ type: 'narrator/turn', turn: { narration: 'They were waiting.', combat: { name: 'Ambush', map: 'yard', difficulty: 'standard', enemies: [{ name: 'Lurker', tier: 'minion', weapon: 'service_pistol', hidden: true }] } } } as any);
    expect((s.g.combat as any).deeds.amb).toBe(true);
  });
  it('never hit, on your feet, the fight won: granted at the fight\'s end', () => {
    const f = ambush([B]); expect((f.cb as any).deeds.amb).toBe(true);
    miss(f, 1); win(f); granted(f, 'between_heartbeats');
  });
  it('near misses: hit once; hurt by a hazard; no ambush; the fight lost; not eligible', () => {
    let f = ambush([B]); withGame(f.g, () => emit(f.cb, 'on_hit', { att: f.foe, tgt: f.pc, dmg: 0, cb: f.cb })); win(f); none(f, 'between_heartbeats');
    f = ambush([B]); withGame(f.g, () => emit(f.cb, 'on_damaged', { t: f.pc, src: { type: 'hazard' }, dmg: 3, cb: f.cb })); win(f); none(f, 'between_heartbeats');
    f = ambush([B], false); miss(f, 1); win(f); none(f, 'between_heartbeats');
    f = ambush([B, {}]); miss(f, 1); lose(f); none(f, 'between_heartbeats');
    f = ambush([{}]); miss(f, 1); win(f); none(f, 'between_heartbeats');
  });
  it('your own heart\'s burn is not a hit', () => {
    const f = ambush([B]); miss(f, 1); withGame(f.g, () => emit(f.cb, 'on_damaged', { t: f.pc, src: { type: 'strain' }, dmg: 8, cb: f.cb })); win(f); granted(f, 'between_heartbeats');
  });
  it('HOLE CLOSED: nobody ever attacked you (you sat the ambush out at the back): nothing', () => {
    const f = ambush([B, B]); miss(f, 1, f.pcs[1]); win(f); expect(has(f, 'between_heartbeats', 0)).toBe(false); granted(f, 'between_heartbeats', 1);
  });
  it('HOLE CLOSED: a fight loaded with no memory is not read as an ambush from its middle', () => {
    const f = fight([B]); f.foe.hidden = true; delete (f.cb as any).deeds; miss(f, 1); expect((f.cb as any).deeds.amb).toBe(false); win(f); none(f, 'between_heartbeats');
  });
});

describe('Siege Engine: break through a wall to win a fight', () => {
  const S = SK('raw_power', 'durability');
  /** A fight that opens with this object standing at 5,5, between the squad and the enemy. */
  const walled = (specs: CharSpec[], kind: string, extra: any = {}) => fight(specs, [{}], (x) => { x.cb.objects = [makeObject('w1', kind, '5,5', extra)]; });
  const smash = (f: F, by: Unit | null = f.pc) => withGame(f.g, () => damageObject(f.cb, '5,5', 999, 0, by));
  const through = (f: F) => { f.cb.objects = (f.cb.objects || []).filter((o) => o.pos !== '5,5'); f.pc.ap = 9; f.act({ type: 'combat/move', unitId: f.pc.id, to: '6,5' } as any); expect(f.pc.pos).toBe('6,5'); };
  it('a barricade, a pillar or a closed door broken by you, you go through the gap, and the fight won: granted at the fight\'s end', () => {
    for (const kind of ['barricade', 'pillar', 'door']) { const f = walled([S], kind); smash(f); through(f); none(f, 'siege_engine'); win(f); granted(f, 'siege_engine'); }
  });
  it('near misses: a crate; a wall of magic; somebody else broke it; the fight lost; not eligible', () => {
    let f = walled([S], 'crate'); smash(f); through(f); win(f); none(f, 'siege_engine');
    f = walled([S], 'sigil_wall'); smash(f); through(f); win(f); none(f, 'siege_engine');
    f = walled([S], 'barricade'); smash(f, f.foe); through(f); win(f); none(f, 'siege_engine');
    f = walled([S, {}], 'barricade'); smash(f); through(f); lose(f); none(f, 'siege_engine');
    f = walled([{}], 'barricade'); smash(f); through(f); win(f); none(f, 'siege_engine');
  });
  it('HOLE CLOSED: breaking it and never going through is not breaking THROUGH (a pillar shot down from across the room)', () => {
    const f = walled([S], 'pillar'); smash(f); win(f); none(f, 'siege_engine');
  });
  it('HOLE CLOSED: a barricade put up during the fight (by your own squad) is not a wall of the place; a door standing open is no wall', () => {
    let f = fight([S]); f.cb.objects = [makeObject('w1', 'barricade', '5,5')]; smash(f); through(f); win(f); none(f, 'siege_engine');
    f = walled([S], 'door', { open: true }); smash(f); through(f); win(f); none(f, 'siege_engine');
  });
  it('the gap survives a save and reload', () => {
    const f = walled([S], 'barricade'); smash(f);
    const g = reload(f); expect((g.combat as any).deeds.u[f.pc.id].gap).toEqual(['5,5']);
  });
});

describe('Twin Souls: survive a Mana Short', () => {
  const T = { archetype: 'stormcaller', kit: 'soul', ...SK('will_power', 'lore_master') };
  /** Will Power 5 is Pure Heart: the first Short of a fight is refused. An eligible character's deed is the second. */
  const push3 = (f: F) => { const u = f.pc; u.mg!.strain = u.mg!.strainLimit + 2; withGame(f.g, () => addStrain(f.cb, f.g.rng, u, 1, 'test')); };
  const short = (f: F) => { push3(f); expect(f.cb.log.join(' ')).toMatch(/Pure Heart/); expect(f.cb.log.join(' ')).not.toMatch(/MANA SHORT/); push3(f); expect(f.cb.log.join(' ')).toMatch(/MANA SHORT/); };
  it('a Mana Short, and alive when the fight ends: granted at the fight\'s end', () => {
    const f = fight([T]); short(f); none(f, 'twin_souls'); win(f); granted(f, 'twin_souls');
  });
  it('alive at the end of a lost fight still counts (Downed is not dead)', () => {
    const f = fight([T, {}]); short(f); lose(f); granted(f, 'twin_souls');
  });
  it('near misses: no Short; dead at the end; not eligible', () => {
    let f = fight([T]); push3(f); win(f); none(f, 'twin_souls'); // Pure Heart refused it: no Short happened
    f = fight([T, {}]); short(f); f.pc.dead = true; f.pc.hp = 0; win(f); none(f, 'twin_souls');
    f = fight([{ archetype: 'stormcaller', kit: 'soul', skills: { will_power: 5, lore_master: 4 } }]); short(f); win(f); none(f, 'twin_souls');
  });
});

describe('Bite the Bullet: fight through an entire combat below a quarter of your max HP', () => {
  const B = SK('guts', 'pain_threshold');
  /** A fight whose first turn starts with the first character at this HP. */
  function low(specs: CharSpec[], hp: (u: Unit) => number) {
    const f = fight(specs); delete (f.cb as any).deeds; withGame(f.g, () => emit(f.cb, 'combat_start', { cb: f.cb, order: [...f.cb.order] }));
    f.pc.hp = hp(f.pc); f.turn(f.pc); f.pc.ap = 6; return f;
  }
  const q = (u: Unit) => Math.ceil(u.maxHp / 4) - 1;
  it('under a quarter from the first turn to the end of a won fight of 2 rounds: granted', () => {
    const f = low([B], q); expect((f.cb as any).deeds.u[f.pc.id].bb).toBe(1);
    miss(f, 1); f.cb.round = 2; win(f); granted(f, 'bite_the_bullet');
  });
  it('near misses: HP rose to a quarter once; a fight of 1 round; started above; lost; Downed at the end; not eligible', () => {
    let f = low([B], q); miss(f, 1); withGame(f.g, () => healUnit(f.cb, f.pc, 40, f.pc, 'test')); f.pc.hp = 5; f.cb.round = 2; win(f); none(f, 'bite_the_bullet');
    f = low([B], q); miss(f, 1); win(f); none(f, 'bite_the_bullet');
    f = low([B], (u) => Math.ceil(u.maxHp / 4)); miss(f, 1); f.pc.hp = 5; f.cb.round = 2; win(f); none(f, 'bite_the_bullet');
    f = low([B, {}], q); miss(f, 1); f.cb.round = 2; lose(f); none(f, 'bite_the_bullet');
    f = low([B, {}], q); miss(f, 1); f.cb.round = 2; f.pc.hp = 0; f.pc.downed = true; win(f); none(f, 'bite_the_bullet');
    f = low([{}], q); miss(f, 1); f.cb.round = 2; win(f); none(f, 'bite_the_bullet');
  });
  it('HOLE CLOSED: stalling a harmless fight for a round earns nothing (no enemy ever attacked you)', () => {
    const f = low([B], q); f.cb.round = 2; win(f); none(f, 'bite_the_bullet');
  });
  it('HOLE CLOSED: lying Downed and being stood up at 1 HP is not fighting through it', () => {
    let f = low([B, {}], q); miss(f, 1); f.pc.hp = 0; f.pc.downed = true; f.act({ type: 'combat/prone', unitId: f.pc.id } as any);
    withGame(f.g, () => healUnit(f.cb, f.pc, 1, f.pcs[1], 'stim')); expect(f.pc.downed).toBe(false); f.cb.round = 3; win(f); none(f, 'bite_the_bullet');
    f = fight([B, {}]); delete (f.cb as any).deeds; withGame(f.g, () => emit(f.cb, 'combat_start', { cb: f.cb, order: [...f.cb.order] }));
    f.pc.hp = 0; f.pc.downed = true; f.turn(f.pc); expect((f.cb as any).deeds.u[f.pc.id].bb).toBe(2); // Downed when its first turn came
  });
  it('HOLE CLOSED: a fight loaded with no memory cannot start the count from its middle', () => {
    const f = low([B], q); delete (f.cb as any).deeds; f.turn(f.pc); miss(f, 1); f.cb.round = 3; win(f); none(f, 'bite_the_bullet');
  });
  it('a silent rise (no heal event) is caught at the next action', () => {
    const f = low([B], q); f.pc.hp = f.pc.maxHp; f.act({ type: 'combat/prone', unitId: f.pc.id } as any); f.pc.hp = 5; f.cb.round = 2; win(f); none(f, 'bite_the_bullet');
  });
  it('the memory survives a save and reload', () => {
    const f = low([B], q); miss(f, 1); f.cb.round = 2;
    let g = reload(f); expect((g.combat as any).deeds.u[f.pc.id].bb).toBe(1);
    g.combat!.units.filter((u) => u.side === 'foe').forEach((u) => { u.hp = 0; u.dead = true; });
    g = apply(g, { type: 'combat/end-turn', unitId: f.pc.id } as any, 'host');
    granted({ g }, 'bite_the_bullet');
  });
});

describe('Fire Sermon and The Voice: an enemy gives up to your words', () => {
  const FS = SK('faith', 'eloquence'), V = SK('authority', 'composure');
  /** The fight talk of rules 1.14: an attempt, and the Narrator answers with a surrender. */
  function talkDown(f: F) {
    f.foe.hp = Math.floor(f.foe.maxHp / 4);
    f.act({ type: 'combat/attempt', unitId: f.pc.id, text: 'Lay it down. There is another way.' } as any);
    f.act({ type: 'narrator/fight-ruling', id: (f.cb as any).ruling.id, lines: ['The rifle lowers.'], effect: { surrender: { target: f.foe.id } } } as any);
    expect(f.g.combat ? f.foe.surrendered : true).toBe(true);
  }
  /** Fire Sermon's deed needs a Faithful character (rules 1.14, item 1110): give the first PC a patron. */
  const faithful = (f: F) => { (f.g.characters[f.pc.charId!] as any).patron = 'mother_ember'; return f; };
  it('Fire Sermon: a beaten enemy talked down by a Faithful character: granted at once', () => {
    const f = faithful(fight([FS], [{}, {}])); talkDown(f); granted(f, 'fire_sermon'); none(f, 'the_voice');
  });
  it('Fire Sermon: an Atheist talks the enemy down just as well, but that is no conversion (item 1110); The Voice does not ask for faith', () => {
    let f = fight([FS], [{}, {}]); talkDown(f); none(f, 'fire_sermon');
    f = fight([FS], [{}, {}]); (f.g.characters[f.pc.charId!] as any).belief = { kind: 'atheist' }; (f.g.characters[f.pc.charId!] as any).patron = 'mother_ember'; talkDown(f); none(f, 'fire_sermon'); // left the faith: the old patron field doesn't count
    f = fight([SK('faith', 'eloquence', 'authority', 'composure')], [{ tier: 'elite' }, {}]); talkDown(f); none(f, 'fire_sermon'); granted(f, 'the_voice');
  });
  it('The Voice: the one who gives up is an Elite', () => {
    const f = fight([V], [{ tier: 'elite' }, {}]); talkDown(f); granted(f, 'the_voice'); none(f, 'fire_sermon');
  });
  it('both at once for a character who qualifies for both', () => {
    const f = faithful(fight([SK('faith', 'eloquence', 'authority', 'composure')], [{ tier: 'elite' }, {}])); talkDown(f); granted(f, 'fire_sermon'); granted(f, 'the_voice');
  });
  it('near misses: The Voice and a rank-and-file enemy; an enemy beaten down (subdued), not talked down; the Narrator says no; not eligible', () => {
    let f = fight([V], [{}, {}]); talkDown(f); none(f, 'the_voice');
    f = faithful(fight([FS], [{}, {}])); withGame(f.g, () => emit(f.cb, 'on_surrender', { t: f.foe, by: f.pc, why: 'subdued', cb: f.cb })); none(f, 'fire_sermon');
    f = faithful(fight([FS], [{}, {}])); f.act({ type: 'combat/attempt', unitId: f.pc.id, text: 'Yield.' } as any);
    f.act({ type: 'narrator/fight-ruling', id: (f.cb as any).ruling.id, lines: ['It spits.'] } as any); none(f, 'fire_sermon');
    f = faithful(fight([{}], [{}, {}])); talkDown(f); none(f, 'fire_sermon');
  });
});

describe('who and where', () => {
  const D = SK('dexterity', 'athletics');
  it('the same seed and the same actions give the same game, grant included', () => {
    const run = () => {
      const f = fight([SK('faith', 'eloquence', 'authority', 'composure', 'intimidation', 'athletics')], [{ tier: 'elite' }, {}]);
      (f.g.characters[f.pc.charId!] as any).patron = 'mother_ember'; // Fire Sermon's deed needs a Faithful character
      f.pc.ap = 9; f.act({ type: 'combat/move', unitId: f.pc.id, to: '7,5' } as any);
      f.foe.hp = Math.floor(f.foe.maxHp / 4); f.pc.ap = 6;
      f.act({ type: 'combat/attempt', unitId: f.pc.id, text: 'Lay it down.' } as any);
      f.act({ type: 'narrator/fight-ruling', id: (f.cb as any).ruling.id, lines: ['The rifle lowers.'], effect: { surrender: { target: f.foe.id } } } as any);
      win(f); return f;
    };
    const a = run(), b = run();
    granted(a, 'fire_sermon'); granted(a, 'the_voice'); granted(a, 'charge');
    expect(J(a.g)).toBe(J(b.g));
  });
  it('the Proving Ground grants nothing', () => {
    let g = newGame('DEED01', { id: 'h1', name: 'Host' }, 'seed-deed');
    g = apply(g, { type: 'char/add', sheet: sheetOf({ name: 'Vel' }) }, 'h1');
    g = apply(g, { type: 'sandbox/start' } as any, 'h1');
    g = apply(g, { type: 'sandbox/fight' } as any, 'h1');
    const cb = g.combat!, pc = cb.units.find((u) => u.side === 'pc' && u.charId)!, foe = cb.units.find((u) => u.side === 'foe')!;
    Object.assign(g.characters[pc.charId!].skills, { dexterity: 5, athletics: 5 });
    withGame(g, () => { for (let i = 0; i < 3; i++) emit(cb, 'on_miss', { att: foe, tgt: pc, cb }); });
    expect((cb as any).deeds.u[pc.id].dg[1]).toBe(3); // seen, and not granted
    expect(g.characters[pc.charId!].perks.some((p) => p.id === 'dance_of_iron')).toBe(false);
  });
  it('an enemy and a companion earn nothing; a dead character earns nothing', () => {
    const f = fight([D, D]);
    withGame(f.g, () => { for (let i = 0; i < 3; i++) emit(f.cb, 'on_miss', { att: f.pc, tgt: f.foe, cb: f.cb }); });
    expect((f.cb as any).deeds.u[f.foe.id]).toBeUndefined();
    f.pcs[1].companion = true as any; miss(f, 3, f.pcs[1]); none(f, 'dance_of_iron', 1);
    charOf(f, 0).dead = true; miss(f, 3, f.pcs[0]); none(f, 'dance_of_iron', 0);
  });
  it('the Narrator can still grant any of them by hand, and the engine does not grant it a second time', () => {
    const f = fight([D]);
    f.act({ type: 'narrator/turn', turn: { narration: 'She was never where the shots were.', deeds: [{ charId: charOf(f).id, perkId: 'dance_of_iron', deed: 'Danced through the crossfire at the gate.' }] } } as any);
    expect(has(f, 'dance_of_iron')).toBe(true); expect(charOf(f).deeds).toContain('Danced through the crossfire at the gate.');
    expect(spots(f.g, 'dance_of_iron').length).toBe(1);
    miss(f, 3); expect(charOf(f).perks.filter((p) => p.id === 'dance_of_iron').length).toBe(1); expect(spots(f.g, 'dance_of_iron').length).toBe(1);
  });
  it('the Narrator\'s hand grant still refuses a character without the skills', () => {
    const s = storyWith([{}]); const c = s.chars[0];
    s.act({ type: 'narrator/turn', turn: { narration: 'No.', deeds: [{ charId: c.id, perkId: 'dance_of_iron', deed: 'x' }] } } as any);
    expect(s.g.characters[c.id].perks.some((p) => p.id === 'dance_of_iron')).toBe(false);
  });
});
