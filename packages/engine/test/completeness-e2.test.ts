// The completeness pass, batch 5 (items 53-65): through the reducer (apply). Gun Nut's collection (item 369); the data of Spray and
// Pray, Ace Pilot and Daggerfall Veteran brought in line with the spec; Daggerfall's Flashback on a missed launcher
// shell; Lowland Born in the story and the fight; Raised by Orks' parley on an enemy's turn and its end; Paper's derived
// penalties and the Masterpiece save; start items for every trait that grants one; and the class moves' other sides
// (Vessel, Bard's Gift, Shade's silent takedown, Payload and Raise Cover on the area map).
import { describe, expect, it } from 'vitest';
import {
  apply, newGame, npcsOf, positionsOf, standable, zoneMap, storyObjects, refOf, d20, packOf, applyCond, WEAPON, TRAITS, CLASS,
  holdersOf, briefOf, designBan, collectionOf, collectGuns, partError,
  type GameState, type Combat, type Unit,
} from '../src';
import { fightWith, storyWith, withGame, sheetOf, type CharSpec } from './helpers/perkfight';

type F = ReturnType<typeof fightWith>;
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
const storyHas = (g: GameState, re: RegExp) => g.story.entries.some((e: any) => re.test((e.head || '') + ' ' + (e.text || '')));
function rngFor(...ns: number[]): { state: number } { for (let s = 1; s < 2000000; s++) { const r = { state: s }; if (ns.every((n) => d20(r) === n)) return { state: s }; } throw new Error('no seed'); }
const traitOf = (id: string) => TRAITS.find((t) => t.id === id)! as any;
const gunIds = (c: any) => [c.weapon, ...packOf(c).filter((p) => p.kind === 'weapon').map((p) => p.weapon || p.id)]
  .filter((id) => { const w: any = WEAPON[id]; return !!w && w.magazine != null && !/melee|unarmed/.test(w.category) && w.category !== 'thrown' && w.category !== 'bow'; });
/** A character created with these traits on this kit (char/add runs creation, so start items are granted there). */
function created(traits: string[], kit = 'soldier') {
  let g = newGame('E2', { id: 'host', name: 'Host' });
  g = apply(g, { type: 'char/add', sheet: { ...sheetOf({ kit }), kit, traits } }, 'host');
  g = apply(g, { type: 'session/start' }, 'host');
  return { g, c: Object.values(g.characters)[0] };
}
/** Tag the current zone (the campaign's zone record). */
function tagZone(g: GameState, ...tags: string[]) { const z = (g.campaign as any).zones.find((x: any) => x.id === zoneMap(g).id); z.tags = [...(z.tags || []), ...tags]; }
function storyCheck(s: any, charId: string, skills: string[], tags: string[], die: number) {
  s.act({ type: 'narrator/turn', turn: { narration: 'A test.', checks: [{ charId, skills, tn: 12, stakes: 'Test', tags }] } } as any);
  s.g.rng.state = rngFor(die).state; const ck = s.g.checks.find((k: any) => !k.done)!; s.act({ type: 'check/roll', checkId: ck.id });
  return s.g.checks.find((k: any) => k.id === ck.id)!;
}
const totalOf = (ck: any) => +(/"total":(-?\d+)/.exec(JSON.stringify(ck.roll)) || [0, NaN])[1];
/** The PC ends its turn and the given units act next (their AI, or their turn start, through combat/end-turn). */
function passTo(f: F, pc: Unit, ...next: Unit[]) {
  const cb = f.cb; cb.order = [pc.id, ...next.map((x) => x.id), ...cb.order.filter((id) => id !== pc.id && !next.some((x) => x.id === id))];
  f.turn(pc); f.act({ type: 'combat/end-turn', unitId: pc.id });
}
function freeNear(g: GameState, from: string, d: number): string {
  const [x, y] = from.split(',').map(Number), map = zoneMap(g), taken = new Set([...Object.values(positionsOf(g)), ...npcsOf(g).map((n) => n.pos), ...storyObjects(g).map((o) => o.pos)]);
  for (let i = -d; i <= d; i++) for (let j = -d; j <= d; j++) { if (Math.max(Math.abs(i), Math.abs(j)) !== d) continue; const k = (x + i) + ',' + (y + j); if (standable(map, k) && !taken.has(k)) return k; }
  throw new Error('no free tile');
}
function cls(id: string, rank: 1 | 2 | 3, extra: CharSpec = {}): CharSpec {
  const sig = CLASS[id].signature, pts = rank === 3 ? [6, 6, 6] : rank === 2 ? [5, 4, 4] : [1, 1, 1];
  return { ...extra, classId: id, level: 5, skills: { ...Object.fromEntries(sig.map((s, i) => [s, pts[i]])), ...(extra.skills || {}) } };
}
const SOUL = { archetype: 'stormcaller', kit: 'soul' } as const;
const MIND = { archetype: 'sigilist', kit: 'sigil' } as const;

// ---------------------------------------------------------------------------------------------------------------------
describe('Gun Nut: the collection is the first 3 guns gained (item 369, Leon 7 Nov 2026)', () => {
  const KIT_GUN: Record<string, string> = { soldier: 'hellraiser_service_rifle', medic: 'service_pistol', sigil: 'service_pistol', soul: 'drifter_revolver' };
  const loot = (g: GameState, charId: string, item: string, qty = 1) => apply(g, { type: 'narrator/turn', turn: { narration: 'Loot.', loot: [{ charId, item, qty }] } } as any, 'host');
  it('no guns are granted at creation: the kit\'s gun is the collection\'s first; no Collector note at session start', () => {
    for (const kit of ['soldier', 'medic', 'sigil', 'soul']) {
      const { g, c } = created(['gun_nut'], kit);
      expect(gunIds(c), kit).toEqual([KIT_GUN[kit]]);
      expect(c.collection, kit).toEqual([KIT_GUN[kit]]);
      expect((g.story.rulings || []).some((r) => /Collector/.test(r.text)), kit).toBe(false);
    }
    const mc = traitOf('gun_nut').effects.find((e: any) => e.op === 'min_carry');
    expect(mc.count).toBe(3); expect(mc.start_fill).toBeUndefined(); expect(mc.provisional).toBeUndefined();
  });
  it('without the trait there is no collection (and the kit is unchanged: one gun)', () => {
    const { c } = created([], 'medic');
    expect(gunIds(c).length).toBe(1); expect(c.collection).toBeUndefined(); expect(collectionOf(c)).toEqual([]);
  });
  it('the next two guns gained join the collection, a fourth doesn\'t; a knife never does', () => {
    let { g, c } = created(['gun_nut'], 'soldier');
    g = loot(g, c.id, 'combat_knife');
    g = loot(g, c.id, 'drifter_revolver');
    g = loot(g, c.id, 'service_pistol');
    g = loot(g, c.id, 'legion_bullpup');
    const ch = g.characters[c.id];
    expect(ch.collection).toEqual(['hellraiser_service_rifle', 'drifter_revolver', 'service_pistol']);
    expect(gunIds(ch)).toContain('legion_bullpup');
    const h = holdersOf({ c: ch }).find((x) => x.key === 'trait:gun_nut')!;
    expect(briefOf(h)).toMatch(/collection: Hellraiser[^;]*, Drifter[^;]*, Service pistol/i);
  });
  it('two of the same gun: both can be in the collection; a spare copy beyond it can go', () => {
    let { g, c } = created(['gun_nut'], 'medic');
    g = loot(g, c.id, 'service_pistol', 3);
    const ch = g.characters[c.id];
    expect(ch.collection).toEqual(['service_pistol', 'service_pistol', 'service_pistol']);
    const isPistol = (p: any) => p.kind === 'weapon' && p.weapon === 'service_pistol';
    const idx = packOf(ch).findIndex(isPistol);
    expect(partError(ch, idx)).toBeNull(); // four carried (one in hand), three in the collection
    const two = { ...ch, pack: packOf(ch).filter((p, i) => !isPistol(p) || i === idx) }; // two carried now
    expect(partError(two as any, packOf(two as any).findIndex(isPistol))).toMatch(/Collector.*Dexterity check \(TN 12\)/);
  });
  it('an old save without the field fills it from what it carries, first three in order (main hand, off hand, pack)', () => {
    const { c } = created(['gun_nut'], 'soldier');
    const old: any = JSON.parse(JSON.stringify(c)); delete old.collection;
    const gun = (id: string) => ({ id, name: WEAPON[id].name, qty: 1, kind: 'weapon', weapon: id });
    old.pack = [...packOf(old), gun('service_pistol'), gun('combat_knife'), gun('drifter_revolver'), gun('legion_bullpup')];
    expect(collectionOf(old)).toEqual(['hellraiser_service_rifle', 'service_pistol', 'drifter_revolver']);
    collectGuns(old, ['service_pistol']); // the first write stores it (a gun gained now joins only if there's room)
    expect(old.collection).toEqual(['hellraiser_service_rifle', 'service_pistol', 'drifter_revolver']);
  });
  it('the Proving Ground: a given gun joins; dropping a collection gun is refused with the Collector\'s reason', () => {
    let g = newGame('E2G', { id: 'host', name: 'Host' });
    g = apply(g, { type: 'char/add', sheet: { ...sheetOf({ kit: 'medic' }), kit: 'medic', traits: ['gun_nut'] } }, 'host');
    g = apply(g, { type: 'sandbox/start' }, 'host');
    const id = Object.keys(g.characters)[0];
    g = apply(g, { type: 'sandbox/give', charId: id, item: 'drifter_revolver' } as any, 'host');
    expect(g.characters[id].collection).toEqual(['service_pistol', 'drifter_revolver']);
    const idx = packOf(g.characters[id]).findIndex((p) => p.kind === 'weapon' && p.weapon === 'drifter_revolver');
    expect(() => apply(g, { type: 'sandbox/drop', charId: id, idx } as any, 'host')).toThrow(/Collector \(Gun Nut\)/);
    const mag = packOf(g.characters[id]).findIndex((p) => !!p.mags);
    expect(() => apply(g, { type: 'sandbox/drop', charId: id, idx: mag } as any, 'host')).not.toThrow();
  });
  it('the sell or drop gate is the Narrator\'s: Dex TN 12 in the brief and in the data', () => {
    const { c } = created(['gun_nut'], 'medic');
    const h = holdersOf({ c }).find((x) => x.key === 'trait:gun_nut')!;
    expect(briefOf(h)).toMatch(/Dex TN 12/); expect(briefOf(h)).toMatch(/collection: Service pistol/i);
    expect(traitOf('gun_nut').effects.find((e: any) => e.op === 'gate_check').tn).toBe(12);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('data matches the spec: Spray and Pray, Ace Pilot, Daggerfall Veteran (items 54-56)', () => {
  it('Spray and Pray: Suppressed with a Body save (not Pinned), full-auto −1 (a +1 on the −2), no recoil multiplier', () => {
    const fx = traitOf('spray_and_pray').effects;
    expect(JSON.stringify(fx)).not.toMatch(/pinned|recoil_mult/);
    expect(fx.find((e: any) => e.op === 'condition')).toMatchObject({ condition: 'suppressed', save: 'body' });
    expect(fx.find((e: any) => e.op === 'attack_mod' && e.context === 'full_auto').value).toBe(1);
  });
  it('Spray and Pray through combat/attack: the cone is Suppressed (a Body save), full auto costs double ammo', () => {
    const f = fightWith([{ traits: ['spray_and_pray'] }], [{ at: 'H6' }]);
    const u = f.turn(f.pc); u.pos = '3,5'; f.foe.pos = '6,5'; f.foe.hp = f.foe.maxHp = 9999;
    f.act({ type: 'combat/attack', unitId: u.id, targetId: f.foe.id, mode: 'auto' } as any);
    expect(logHas(f.cb, /Suppression on Foe 1/)).toBe(true);
    expect(f.cb.log.join('\n')).not.toMatch(/Pinned/);
  });
  it('Ace Pilot: Grounded is −0.5 Movement in the data (as Heavyworlder and Old Timer) and in a fight', () => {
    const w = traitOf('ace_pilot').effects.find((e: any) => e.op === 'withdrawal');
    expect(w.effects.find((e: any) => e.stat === 'move').value).toBe(-0.5);
    for (const id of ['heavyworlder', 'old_timer']) expect(traitOf(id).effects.find((e: any) => e.stat === 'move').value).toBe(-0.5);
    const mv = (grounded: boolean) => {
      const s = storyWith([{ traits: ['ace_pilot'] }]); const c = s.chars[0];
      if (grounded) s.act({ type: 'narrator/turn', turn: { narration: 'A long walk.', traitState: [{ charId: c.id, key: 'grounded', value: true }] } } as any);
      s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'F', map: 'yard', difficulty: 'standard', enemies: [{ name: 'Foe', tier: 'soldier', weapon: 'service_pistol', at: 'O10' }] } } } as any);
      return s.g.combat!.units.find((x) => x.side === 'pc')!.movement;
    };
    expect(mv(true)).toBeCloseTo(Math.max(0.5, mv(false) - 0.5));
  });
  it('Daggerfall Veteran: the Flashback gate is TN 12 in the data (settled, item 368), and its text says so', () => {
    const t = traitOf('daggerfall_veteran'), gc = t.effects.find((e: any) => e.op === 'gate_check');
    expect(gc.tn).toBe(12); expect(gc.provisional).toBeUndefined();
    expect(t.text).toMatch(/Composure check \(target 12\)/); expect(t.text).not.toMatch(/target 13/);
  });
  it('Daggerfall Veteran: an enemy\'s launcher shell that misses still calls the Flashback (shelling) on its turn; a pistol miss doesn\'t', () => {
    const run = (weapon: string) => {
      const f = fightWith([{ traits: ['daggerfall_veteran'] }], [{ at: 'O10' }]);
      const vet = f.pc, foe = f.foe;
      vet.pos = '3,3'; foe.pos = '7,3'; foe.weapon = weapon; foe.ammo = WEAPON[weapon].magazine!; foe.attack = -60; vet.hp = vet.maxHp = 999;
      f.g.rng.state = rngFor(2, 2, 2).state;
      passTo(f, vet, foe);
      return f.cb.log.join('\n');
    };
    const shell = run('smetanita_thumper');
    expect(shell).toMatch(/fires at .*miss/); expect(shell).toMatch(/back at Daggerfall \(shelling\)/);
    const pistol = run('service_pistol');
    expect(pistol).toMatch(/fires at .*miss/); expect(pistol).not.toMatch(/back at Daggerfall/);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('Lowland Born through the reducer (item 57)', () => {
  it('story: −2 on a Vigilant check in an open zone, nothing in a plain one', () => {
    const total = (open: boolean, trait: boolean) => { const s = storyWith([{ traits: trait ? ['lowland_born'] : [] }]); if (open) tagZone(s.g, 'terrain:open'); return totalOf(storyCheck(s, s.chars[0].id, ['vigilant'], [], 10)); };
    expect(total(true, true) - total(true, false)).toBe(-2);
    expect(total(false, true) - total(false, false)).toBe(0);
  });
  it('story: the passive Vigilant voice is 2 lower under open sky (a hook at its passive goes unheard there)', () => {
    const heard = (open: boolean) => {
      const s = storyWith([{ traits: ['lowland_born'], skills: { vigilant: 3 } }]); const c = s.chars[0];
      if (open) tagZone(s.g, 'terrain:open');
      s.act({ type: 'narrator/turn', turn: { narration: 'Wind.', hooks: [{ skill: 'vigilant', tn: 12, truth: 'true', line: 'Something on the ridge.' }] } } as any);
      return s.g.story.entries.some((e: any) => e.kind === 'voice' && e.charId === c.id && /ridge/.test(e.text));
    };
    expect(heard(false)).toBe(true); expect(heard(true)).toBe(false);
  });
  it('the way out of ruins and dense city is in the Narrator brief', () => {
    const s = storyWith([{ traits: ['lowland_born'] }]); const h = holdersOf({ c: s.chars[0] }).find((x) => x.key === 'trait:lowland_born')!;
    expect(briefOf(h)).toMatch(/one way out/);
  });
  it('fight in ruins: +1 Movement (combat/move costs fewer AP); fight under open sky: a Hidden foe past half Vision isn\'t spotted as the turn ends', () => {
    const fight = (traits: string[], tag: string) => {
      const s = storyWith([{ traits, attrs: { agility: 1 } }, {}]); tagZone(s.g, tag);
      s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'F', map: 'yard', difficulty: 'standard', enemies: [{ name: 'Foe', tier: 'soldier', weapon: 'service_pistol', at: 'O10' }] } } } as any);
      return s;
    };
    const moved = (traits: string[]) => {
      const s = fight(traits, 'terrain:ruins'), cb = s.g.combat!, u = cb.units.find((x) => x.charId === s.chars[0].id)!;
      u.pos = '2,2'; cb.turn = cb.order.indexOf(u.id); u.ap = 6; delete cb.window;
      s.act({ type: 'combat/move', unitId: u.id, to: '5,2' } as any);
      return s.g.combat!.units.find((x) => x.id === u.id)!.ap;
    };
    expect(moved(['lowland_born'])).toBeGreaterThan(moved([]));
    const spotted = (traits: string[]) => {
      const s = fight(traits, 'terrain:open'), cb = s.g.combat!, u = cb.units.find((x) => x.charId === s.chars[0].id)!, a = cb.units.find((x) => x.charId === s.chars[1].id)!, foe = cb.units.find((x) => x.side === 'foe')!;
      u.pos = '2,2'; a.pos = '2,4'; foe.pos = '8,2'; foe.hidden = true; u.vision = 10; u.vigilant = 10;
      cb.order = [u.id, a.id, ...cb.order.filter((id) => id !== a.id && id !== u.id)]; cb.turn = 0; u.ap = 6; delete cb.window;
      s.g.rng.state = rngFor(19, 19, 19, 19).state;
      s.act({ type: 'combat/end-turn', unitId: u.id }); // the holder looks for Hidden foes as its turn ends
      return !s.g.combat!.units.find((x) => x.id === foe.id)!.hidden;
    };
    expect(spotted([])).toBe(true); expect(spotted(['lowland_born'])).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('Raised by Orks through the reducer (item 58)', () => {
  const setup = () => {
    const f = fightWith([{ traits: ['raised_by_orks'] }, {}], [{ at: 'C6', weapon: 'fists' }]);
    const [u, ally] = f.pcs, ork = f.foe; ork.kind = 'ork'; u.pos = '5,5'; ally.pos = '12,12'; ork.pos = '6,5'; ork.attack = 60; ork.hp = ork.maxHp = 999;
    return { f, u, ally, ork };
  };
  it('an Ork on its turn holds its attack on the holder', () => {
    const { f, u, ally, ork } = setup(); const hp = u.hp;
    passTo(f, ally, ork);
    expect(f.unit(u.id).hp).toBe(hp); expect(f.cb.log.join('\n')).not.toMatch(/Foe 1 strikes Tester 1/);
  });
  it('a squadmate\'s attack on the Ork (combat/attack) ends the parley: the Ork then strikes the holder on its turn', () => {
    const { f, u, ally, ork } = setup(); const hp = u.hp;
    f.turn(ally); f.unit(ally.id).pos = '8,5';
    f.act({ type: 'combat/attack', unitId: ally.id, targetId: ork.id, mode: 'shot' });
    f.unit(ally.id).pos = '14,14';
    passTo(f, ally, ork);
    expect(f.unit(u.id).hp).toBeLessThan(hp);
  });
  it('+20% on the holder\'s melee hit through combat/attack', () => {
    const dmg = (traits: string[]) => {
      const f = fightWith([{ traits, weapon: 'combat_knife' }], [{ at: 'C6' }], { seed: 'ORK' });
      const u = f.turn(f.pc); u.pos = '5,5'; f.foe.pos = '6,5'; f.foe.def = -60; f.foe.armour = 0; f.foe.hp = f.foe.maxHp = 999;
      f.g.rng.state = rngFor(10).state; f.act({ type: 'combat/attack', unitId: u.id, targetId: f.foe.id, mode: 'melee' });
      return 999 - f.unit(f.foe.id).hp;
    };
    const plain = dmg([]), ork = dmg(['raised_by_orks']);
    expect(plain).toBeGreaterThan(0); expect(Math.abs(ork - plain * 1.2)).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('Oil in My Mind: Paper\'s derived penalties and the Masterpiece save (item 59)', () => {
  it('Elemental damage taken +10%: a Burning tick at the turn start (through combat/end-turn)', () => {
    const tick = (traits: string[]) => {
      const f = fightWith([{ traits, skills: { pain_threshold: 0 } }, {}], [{ at: 'O10' }]);
      const [u, a] = f.pcs; u.hp = u.maxHp = 500;
      withGame(f.g, () => applyCond(f.cb, f.g.rng, null, u, 'burning', 3, 'body', { skipSave: true }));
      passTo(f, a, u);
      return 500 - f.unit(u.id).hp;
    };
    const plain = tick([]), paper = tick(['oil_in_my_mind']);
    expect(plain).toBeGreaterThan(0); expect(paper).toBe(Math.floor(plain * 1.1));
  });
  it('Healing received −10%: a squadmate\'s stim (combat/stim)', () => {
    const heal = (traits: string[]) => {
      const f = fightWith([{ traits, skills: { sensory: 0 } }, {}], [{ at: 'O10' }]);
      const [u, m] = f.pcs; u.pos = '3,3'; m.pos = '3,4'; f.unit(u.id).hp = 10; f.g.characters[m.charId!].stims = 2;
      f.turn(m); f.act({ type: 'combat/stim', unitId: m.id, targetId: u.id } as any);
      return f.unit(u.id).hp - 10;
    };
    const plain = heal([]), paper = heal(['oil_in_my_mind']);
    expect(plain).toBeGreaterThan(0); expect(paper).toBeLessThan(plain);
  });
  it('Masterpiece (both Oils, combat/perk): the ally\'s next save against an enemy\'s debuff is +2, then it\'s spent', () => {
    const save = (gift: boolean) => {
      const f = fightWith([{ traits: ['oil_in_my_mind', 'oil_in_my_soul'] }, {}], [{ at: 'O10' }]);
      const [artist, ally] = f.pcs;
      if (gift) { f.turn(artist); f.act({ type: 'combat/perk', unitId: artist.id, id: 'oil_in_my_mind', actionId: 'masterpiece', targetId: ally.id } as any); }
      f.g.rng.state = rngFor(17).state;
      const line = withGame(f.g, () => applyCond(f.cb, f.g.rng, f.foe, f.unit(ally.id), 'shaken', 2, 'heart'));
      return { total: +(/save (-?\d+) vs/.exec(line) || [0, NaN])[1], ok: /resists/.test(line), f, ally };
    };
    const a = save(true), b = save(false);
    expect(a.total - b.total).toBe(2);
    expect(a.f.g.characters[a.ally.charId!].state?.masterpiece).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('start items for every trait that grants one (item 60)', () => {
  it('each start_item in traits.json is in the pack (or worn) after creation', () => {
    const grants = TRAITS.flatMap((t: any) => (t.effects || []).filter((e: any) => e.op === 'start_item').map((e: any) => [t.id, e.item] as const));
    expect(grants.map((x) => x[0])).toEqual(expect.arrayContaining(['central_city_kid', 'wanted', 'occultist', 'ghost_soldier', 'bottle_butts_for_eyes']));
    for (const [trait, item] of grants) {
      const { c } = created([trait]);
      const has = packOf(c).some((x) => (x.item || x.id) === item) || Object.values(c.worn || {}).includes(item);
      expect(has, trait + ': ' + item).toBe(true);
    }
  });
  it('without the trait none of them are there', () => {
    const { c } = created([]);
    for (const item of ['city_id', 'bank_card', 'contraband', 'grimoire', 'prosthetic_arm']) expect(packOf(c).some((x) => (x.item || x.id) === item), item).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
const fullAp = (s: any, id: string) => { s.g.story.ap = { ...(s.g.story.ap || {}), [id]: 9 }; };
function place(s: any, at: string, o: any = {}) {
  s.act({ type: 'narrator/turn', turn: { narration: 'Someone.', npcs: [{ action: 'place', name: o.name || 'Guard', side: o.side || 'hostile', tier: o.tier || 'minion', weapon: o.weapon || 'service_pistol', at: refOf(at) }] } } as any);
  return npcsOf(s.g)[npcsOf(s.g).length - 1];
}
describe('class moves: Vessel, Bard\'s Gift, Payload, Raise Cover (items 61-65)', () => {
  it('Vessel: the design ban is the one the Magic panel reads (designBan), and a design carried in can\'t be cast in a fight', () => {
    const s = storyWith([{ advancedClass: 'vessel', level: 5, ...SOUL }]); const c = s.chars[0];
    expect(designBan(s.g.characters[c.id])).toMatch(/Vessel/);
    expect(() => s.act({ type: 'magic/design', charId: c.id, design: { name: 'Bolt', school: 'damage', modules: [] } } as any)).toThrow(/Vessel/);
    expect(s.g.characters[c.id].outbursts?.length).toBeGreaterThan(0); // the soul kit's designs, carried in
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'F', map: 'yard', difficulty: 'standard', enemies: [{ name: 'Foe', tier: 'soldier', weapon: 'service_pistol', at: 'O10' }] } } } as any);
    const cb = s.g.combat!, u = cb.units.find((x) => x.charId === c.id)!, d = s.g.characters[c.id].outbursts![0];
    cb.turn = cb.order.indexOf(u.id); u.ap = 6; delete cb.window;
    expect(() => s.act({ type: 'combat/outburst', unitId: u.id, design: d.id, aim: cb.units.find((x) => x.side === 'foe')!.pos } as any)).toThrow(/Vessel|body/i);
  });
  it('Bard\'s Gift in a fight: the ally pays its Soul cast AP, the Bard pays the MP and takes the Strain', () => {
    const s = storyWith([cls('bard', 3, SOUL), {}]); const [b, ally] = s.chars;
    s.act({ type: 'story/perk', charId: b.id, id: 'class:bard.gift', text: 'For you, ' + s.g.characters[ally.id].name });
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'F', map: 'yard', difficulty: 'standard', enemies: [{ name: 'Foe', tier: 'boss', weapon: 'service_pistol', at: 'O10' }] } } } as any);
    const cb = s.g.combat!, bu = cb.units.find((u) => u.charId === b.id)!, au = cb.units.find((u) => u.charId === ally.id)!, foe = cb.units.find((u) => u.side === 'foe')!;
    bu.pos = '2,2'; au.pos = '3,2'; foe.pos = '5,2'; foe.def = -40; const mp = bu.mg!.mp, strain = bu.mg!.strain || 0, allyStrain = au.mg?.strain || 0;
    cb.turn = cb.order.indexOf(au.id); au.ap = 6; delete cb.window;
    s.act({ type: 'combat/gift', unitId: au.id, aim: '5,2' } as any);
    const cb2 = s.g.combat!, b2 = cb2.units.find((u) => u.charId === b.id)!, a2 = cb2.units.find((u) => u.charId === ally.id)!;
    expect(b2.mg!.mp).toBeLessThan(mp); expect(b2.mg!.strain || 0).toBeGreaterThanOrEqual(strain);
    expect(a2.mg?.strain || 0).toBe(allyStrain); expect(a2.ap).toBeLessThan(6);
  });
  // The 1.2 version of this test is replaced by its 1.4 version in sigil14-classes-i.test.ts.
  // The 1.2 version of this test is replaced by its 1.4 version in sigil14-classes-i.test.ts.
});
