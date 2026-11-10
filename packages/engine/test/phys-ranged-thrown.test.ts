// Physical 2.0 (rules 1.12), ranged: Lob (7) and thrown weapons (ranged/thrown.ts). Lob's shot through smoke or dark
// at −4, Arc over full cover at −2, Blast onto a tile with no roll and +2 Pressure in the radius; grenades as Lob's
// ammunition; smoke, flashbangs and the scrambler ending a held Watch and a Bead; smoke letting Pressure fall by 2.
import { describe, it, expect, beforeEach } from 'vitest';
import { phys, WEAPON } from '../src';
import { physFight, rig } from './helpers/physfight';
import { type PhysF as Fight } from './helpers/physfight-ranged';

// ---------- helpers (the shared ones are in helpers/physfight-ranged.ts) ----------
const RIFLE = 'hellraiser_service_rifle';
/** A shooter (Lob known) at C6 (2,5) and, unless `alone`, an ally at M2 (12,1) who sees the foes; one or more foes. */
function fight(o: { weapon?: string; known?: string[]; foes?: { at?: string; tier?: string; weapon?: string }[]; alone?: boolean } = {}): Fight {
  const pcs = [{ weapon: o.weapon || RIFLE, known: o.known ?? ['lob'], skills: { dexterity: 6 } }, ...(o.alone ? [] : [{ weapon: RIFLE }])];
  const f = physFight(pcs, o.foes || [{ at: '12,5' }]);
  f.put(f.pc, '2,5'); if (!o.alone) f.put(f.pcs[1], '12,1');
  (o.foes || [{ at: '12,5' }]).forEach((s, i) => f.put(f.foes[i], s.at || '12,5'));
  f.turn(f.pc); return f;
}
/** Smoke on these tiles (a VEIL zone, as a smoke grenade lays). */
function smoke(f: Fight, tiles: string[]) { f.cb.zones = [...(f.cb.zones || []), { id: 'zt' + (f.cb.zones || []).length, kind: 'veil', tiles, words: ['smoke'], by: '', side: 'pc', left: 2, mult: 1, who: '' } as any]; }
/** Everything a preview must leave alone: the fight and the dice. */
const snap = (f: Fight) => JSON.stringify(f.cb) + JSON.stringify(f.g.rng);
const blastDmg = (item: string, armour: number) => Math.max(1, (WEAPON[item].damage as number) - armour);
const signed = (n: number) => (n >= 0 ? '+' : '−') + Math.abs(n);
const lastLog = (f: Fight, re: RegExp) => [...f.cb.log].reverse().find((l) => re.test(l)) || '';

beforeEach(() => rig(null));

describe('Lob: the shot', () => {
  it('fires through smoke at −4 when an ally sees the target (a plain rifle is off its home: −2 more)', () => {
    const f = fight(); smoke(f, ['7,4', '7,5', '7,6']);
    expect(f.pv('shot', { targetId: f.foe.id }).why).toMatch(/No line of sight/);
    const before = snap(f), pv = f.pv('lob', { targetId: f.foe.id });
    expect(snap(f)).toBe(before); // the preview changes nothing
    expect(pv.ok).toBe(true); expect(pv.ap).toBe(3); expect(pv.rounds).toBe(1);
    const terms = pv.attacks[0].pv.terms!;
    expect(terms).toContainEqual({ v: -4, label: 'Lob' });
    expect(terms).toContainEqual({ v: -2, label: 'Lob off its home weapon' });
    expect(pv.pressure).toEqual([expect.objectContaining({ unit: f.foe.id, add: 1, after: 1, onHit: true })]);
    rig({ hit: true, die: 12 });
    const hp = f.foe.hp, ammo = f.pc.ammo, heat = f.pc.heat, dmg = Math.max(1, Math.floor(pv.attacks[0].pv.dmg!.total) - pv.attacks[0].pv.dmg!.armour);
    expect(f.tech('lob', { targetId: f.foe.id })).toBeNull();
    expect(f.pc.ap).toBe(3); expect(f.pc.ammo).toBe(ammo - 1); expect(f.pc.heat).toBe(heat + 1);
    expect(f.foe.hp).toBe(hp - dmg); // the preview's damage is the action's
    expect(lastLog(f, /fires at/)).toContain(signed(pv.attacks[0].pv.toHit) + ' = ');
    expect(f.pressure(f.foe)).toBe(1); // a ranged hit's ordinary +1, nothing more
  });
  it('a miss gives no Pressure (no Loud line), and still spends the round', () => {
    const f = fight(); smoke(f, ['7,4', '7,5', '7,6']); rig({ hit: false, die: 5 });
    const ammo = f.pc.ammo; expect(f.tech('lob', { targetId: f.foe.id })).toBeNull();
    expect(f.pressure(f.foe)).toBe(0); expect(f.pc.ammo).toBe(ammo - 1); expect(f.pc.ap).toBe(3);
  });
  it('is refused when no one on your side sees the target; nothing is spent', () => {
    const f = fight({ alone: true }); smoke(f, ['7,4', '7,5', '7,6']);
    expect(f.tech('lob', { targetId: f.foe.id })).toMatch(/can't see it/); expect(f.pc.ap).toBe(6);
  });
  it('takes its target from the named tile; refuses an empty tile and no target', () => {
    const f = fight(); rig({ hit: true, die: 12 });
    expect(f.tech('lob', {})).toMatch(/Pick a target/);
    expect(f.tech('lob', { tile: '9,9' })).toMatch(/No enemy on that tile/);
    const hp = f.foe.hp; expect(f.tech('lob', { tile: '12,5' })).toBeNull(); expect(f.foe.hp).toBeLessThan(hp);
  });
  it('without Arc it doesn\'t go over full cover', () => {
    const f = fight(); f.put(f.pc, '6,6'); f.put(f.pcs[1], '12,2'); f.put(f.foe, '12,6'); // the pillar at K7 between
    expect(f.tech('lob', { targetId: f.foe.id })).toMatch(/No line of sight/);
  });
  it('needs a ranged weapon, and Lob known (or lent)', () => {
    const f = fight({ known: [] }); expect(f.tech('lob', { targetId: f.foe.id })).toMatch(/don't have Lob ready/);
  });
});

describe('Lob: Arc', () => {
  const overThePillar = (weapon: string, known: string[] = ['lob']) => {
    const f = fight({ weapon, known }); f.put(f.pc, '6,6'); f.put(f.pcs[1], '12,2'); f.put(f.foe, '12,6'); return f;
  };
  it('a longbow lobs over full cover at −2, on its home (no off-home penalty)', () => {
    const f = overThePillar('longbow');
    expect(f.pv('shot', { targetId: f.foe.id }).why).toMatch(/No line of sight/);
    const pv = f.pv('lob', { targetId: f.foe.id }); expect(pv.ok).toBe(true);
    const terms = pv.attacks[0].pv.terms!;
    expect(terms).toContainEqual({ v: -2, label: 'Lob' });
    expect(terms.some((x) => /off its home/.test(x.label))).toBe(false);
    rig({ hit: true, die: 12 }); const hp = f.foe.hp, heat = f.pc.heat;
    expect(f.tech('lob', { targetId: f.foe.id })).toBeNull(); expect(f.foe.hp).toBeLessThan(hp);
    expect(f.pc.heat).toBe(heat); expect(f.pc.ap).toBe(3); // a bow: no Heat
  });
  it('is refused over full cover when no one on your side sees the target', () => {
    const f = fight({ weapon: 'longbow', alone: true }); f.put(f.pc, '6,6'); f.put(f.foe, '12,6');
    expect(f.tech('lob', { targetId: f.foe.id })).toMatch(/can't see it/); expect(f.pc.ap).toBe(6);
  });
  it('the thumper lends Lob; its default line is Arc (a roll at −2; a hit splashes as today)', () => {
    const f = fight({ weapon: 'smetanita_thumper', known: [], foes: [{ at: '12,6' }, { at: '13,7' }] });
    f.put(f.pc, '6,6'); f.put(f.pcs[1], '12,2');
    const e = f.pad().flatMap((g) => g.entries).find((x) => x.id === 'lob')!;
    expect(e.lent).toBe(true); expect(e.built).toBe(true); expect(e.choices?.map((c) => c.prop).sort()).toEqual(['arc', 'blast']);
    const pv = f.pv('lob', { targetId: f.foes[0].id }); expect(pv.attacks[0].pv.terms).toContainEqual({ v: -2, label: 'Lob' });
    rig({ hit: true, die: 12 }); const hp2 = f.foes[1].hp;
    expect(f.tech('lob', { targetId: f.foes[0].id })).toBeNull();
    expect(f.foes[1].hp).toBe(hp2 - blastDmg('smetanita_thumper', f.foes[1].armour)); // the splash
  });
});

describe('Lob: Blast with a launcher', () => {
  const thumper = (foes: { at: string; tier?: string }[] = [{ at: '12,6' }, { at: '13,7' }]) => { const f = fight({ weapon: 'smetanita_thumper', known: [], foes }); f.put(f.pc, '6,6'); f.put(f.pcs[1], '12,2'); return f; };
  it('aims at a tile: no roll, today\'s damage and radius, +2 Pressure to every enemy in it, over the pillar (Arc)', () => {
    const f = thumper(); rig({ hit: false, die: 1 }); // no roll: the rigged dice change nothing
    const before = snap(f), pv = f.pv('lob', { tile: '12,6', line: 'blast' });
    expect(snap(f)).toBe(before);
    expect(pv.ok).toBe(true); expect(pv.ap).toBe(3); expect(pv.rounds).toBe(1); expect(pv.attacks).toEqual([]);
    expect(pv.area!.length).toBe(25); // radius 2
    expect(pv.pressure!.map((p) => [p.unit, p.after]).sort()).toEqual([[f.foes[0].id, 2], [f.foes[1].id, 2]].sort());
    const hp = f.foes.map((v) => v.hp), ammo = f.pc.ammo, heat = f.pc.heat, ally = f.pcs[1].hp;
    expect(f.tech('lob', { tile: '12,6', line: 'blast' })).toBeNull();
    f.foes.forEach((v, i) => expect(v.hp).toBe(hp[i] - blastDmg('smetanita_thumper', v.armour)));
    for (const p of pv.pressure!) expect(f.pressure(f.unit(p.unit))).toBe(p.after); // the preview's Pressure is the action's
    expect(f.pcs[1].hp).toBe(ally); // M3 is 4 tiles off: outside the radius
    expect(f.pc.ammo).toBe(ammo - 1); expect(f.pc.heat).toBe(heat + 1); expect(f.pc.shotsThisTurn).toBe(1); expect(f.pc.ap).toBe(3);
    expect(f.fx('explode').length).toBe(1);
  });
  it('the target\'s tile serves when no tile is named', () => {
    const f = thumper(); expect(f.tech('lob', { targetId: f.foes[0].id, line: 'blast' })).toBeNull();
    expect(f.pressure(f.foes[0])).toBe(2);
  });
  it('an ally in the radius takes the blast and gains no Pressure', () => {
    const f = thumper(); f.put(f.pcs[1], '11,5'); const hp = f.pcs[1].hp;
    expect(f.tech('lob', { tile: '12,6', line: 'blast' })).toBeNull();
    expect(f.pcs[1].hp).toBe(hp - blastDmg('smetanita_thumper', f.pcs[1].armour)); expect(f.pressure(f.pcs[1])).toBe(0);
  });
  it('Pressure stops at the caps: an elite at 3, a boss at 2', () => {
    const f = thumper([{ at: '12,6', tier: 'elite' }, { at: '13,7', tier: 'boss' }]);
    f.press(f.foes[0], 2, f.pc); f.press(f.foes[1], 1, f.pc);
    const pv = f.pv('lob', { tile: '12,6', line: 'blast' });
    expect(pv.pressure!.find((p) => p.unit === f.foes[0].id)!.after).toBe(3); expect(pv.pressure!.find((p) => p.unit === f.foes[1].id)!.after).toBe(2);
    expect(f.tech('lob', { tile: '12,6', line: 'blast' })).toBeNull();
    expect(f.pressure(f.foes[0])).toBe(3); expect(f.pressure(f.foes[1])).toBe(2);
  });
  it('an enemy\'s blast stops a player at 3 (the enemy has no character: t.c is null)', () => {
    const f = physFight([{ weapon: RIFLE }], [{ at: '12,5', weapon: 'smetanita_thumper' }]);
    f.put(f.pc, '4,5'); f.put(f.foe, '12,5'); f.turn(f.foe); f.press(f.pc, 2, f.foe);
    expect(f.use(f.foe, 'lob', { tile: '4,5', line: 'blast' })).toBeNull();
    expect(f.pressure(f.pc)).toBe(3); expect(f.foe.ap).toBe(3);
  });
  it('the breacher tube has Blast and no Arc: refused through walls, fine in the open (radius 1, no Heat)', () => {
    const f = fight({ weapon: 'breacher_tube', known: ['lob'], foes: [{ at: '12,6' }, { at: '13,6' }] }); f.put(f.pc, '6,6'); f.put(f.pcs[1], '12,2');
    expect(f.tech('lob', { tile: '12,6' })).toMatch(/walls in the way/); expect(f.pc.ap).toBe(6);
    f.put(f.pc, '6,3'); const hp = f.foes.map((v) => v.hp), heat = f.pc.heat;
    const pv = f.pv('lob', { tile: '12,6' }); expect(pv.area!.length).toBe(9);
    expect(f.tech('lob', { tile: '12,6' })).toBeNull();
    f.foes.forEach((v, i) => expect(v.hp).toBe(Math.max(0, hp[i] - blastDmg('breacher_tube', v.armour))));
    expect(f.pc.heat).toBe(heat); expect(f.pc.ammo).toBe(0);
  });
  it('refusals: no tile, off the map, a tile no one on your side sees, an empty launcher', () => {
    const f = thumper();
    expect(f.tech('lob', { line: 'blast' })).toMatch(/Name a tile/);
    expect(f.tech('lob', { tile: '30,5', line: 'blast' })).toMatch(/Off the map/);
    f.put(f.pcs[1], '6,7'); // both behind the pillars from K7
    expect(f.tech('lob', { tile: '11,6', line: 'blast' })).toMatch(/No one on your side can see/);
    f.pc.ammo = 0; expect(f.tech('lob', { tile: '12,6', line: 'blast' })).toMatch(/Empty/);
    expect(f.pc.ap).toBe(6);
  });
});

describe('Lob: grenades are its ammunition', () => {
  const nades = (load: Record<string, number>, o: { foes?: { at?: string; tier?: string }[] } = {}) => { const f = fight({ foes: o.foes || [{ at: '8,5' }] }); f.pc.throwables = { ...load }; return f; };
  it('a frag through Lob: no roll, 40 to everyone within 2, +2 Pressure; the grenade is spent, not the rifle\'s rounds', () => {
    const f = nades({ frag_grenade: 2 }); rig({ hit: false, die: 1 });
    const before = snap(f), pv = f.pv('lob', { tile: '8,5', ammo: 'frag_grenade' });
    expect(snap(f)).toBe(before);
    expect(pv.ok).toBe(true); expect(pv.ap).toBe(3); expect(pv.rounds).toBe(0); expect(pv.area!.length).toBe(25);
    expect(pv.pressure).toEqual([expect.objectContaining({ unit: f.foe.id, add: 2, after: 2 })]);
    const hp = f.foe.hp, ammo = f.pc.ammo, heat = f.pc.heat;
    expect(f.tech('lob', { tile: '8,5', ammo: 'frag_grenade' })).toBeNull();
    expect(f.foe.hp).toBe(hp - blastDmg('frag_grenade', f.foe.armour)); expect(f.pressure(f.foe)).toBe(2);
    expect(f.pc.throwables!.frag_grenade).toBe(1); expect(f.pc.ammo).toBe(ammo); expect(f.pc.heat).toBe(heat);
    expect(f.pc.shotsThisTurn).toBe(0); expect(f.pc.ap).toBe(3);
    expect(lastLog(f, /lobs a frag grenade/)).toMatch(/at I6/);
  });
  it('an empty rifle doesn\'t stop a grenade', () => {
    const f = nades({ frag_grenade: 1 }); f.pc.ammo = 0;
    expect(f.tech('shot', { targetId: f.foe.id })).toMatch(/Empty/);
    expect(f.tech('lob', { tile: '8,5', ammo: 'frag_grenade' })).toBeNull(); expect(f.pc.throwables!.frag_grenade).toBe(0);
  });
  it('an empty quiver doesn\'t stop a grenade either, and the arrows are left alone (quiver.ts)', () => {
    const f = fight({ weapon: 'recurve_bow', foes: [{ at: '8,5' }] }); f.pc.throwables = { frag_grenade: 1 };
    f.pc.ammo = 0; f.pc.quiver = {};
    expect(f.tech('shot', { targetId: f.foe.id })).toMatch(/quiver is empty/);
    expect(f.tech('lob', { tile: '8,5', ammo: 'frag_grenade' })).toBeNull(); expect(f.pc.throwables!.frag_grenade).toBe(0);
    const g = fight({ weapon: 'recurve_bow', foes: [{ at: '8,5' }] }); g.pc.throwables = { frag_grenade: 1 }; const q = { ...g.pc.quiver }, n = g.pc.ammo;
    expect(g.tech('lob', { tile: '8,5', ammo: 'frag_grenade' })).toBeNull(); expect(g.pc.quiver).toEqual(q); expect(g.pc.ammo).toBe(n);
  });
  it('goes over full cover (a frag has Arc) to a tile an ally sees', () => {
    const f = nades({ frag_grenade: 1 }, { foes: [{ at: '12,6' }] }); f.put(f.pc, '6,6'); f.put(f.pcs[1], '12,2');
    expect(f.tech('lob', { tile: '12,6', ammo: 'frag_grenade' })).toBeNull(); expect(f.pressure(f.foe)).toBe(2);
  });
  it('refusals: none carried, out of throwing range, a satchel, no tile, off the map', () => {
    const f = nades({ frag_grenade: 1, satchel_charge: 1 }), range = f.pc.throwRange!;
    expect(f.tech('lob', { tile: '8,5', ammo: 'incendiary_grenade' })).toMatch(/carry no incendiary grenade/);
    expect(f.tech('lob', { tile: (2 + range + 1) + ',5', ammo: 'frag_grenade' })).toMatch(new RegExp('Out of throwing range \\(' + range + ' tiles\\)'));
    expect(f.tech('lob', { tile: '3,5', ammo: 'satchel_charge' })).toMatch(/placed, not lobbed/);
    expect(f.tech('lob', { ammo: 'frag_grenade' })).toMatch(/Name a tile/);
    expect(f.tech('lob', { tile: '-1,5', ammo: 'frag_grenade' })).toMatch(/Off the map/);
    expect(f.pc.ap).toBe(6); expect(f.pc.throwables!.frag_grenade).toBe(1);
  });
  it('an incendiary keeps today\'s effect: Burning and a burning tile, and +2 Pressure', () => {
    const f = nades({ incendiary_grenade: 1 });
    expect(f.tech('lob', { tile: '8,5', ammo: 'incendiary_grenade' })).toBeNull();
    expect(f.foe.conds?.burning).toBeTruthy(); expect((f.cb.objects || []).some((o) => o.kind === 'fire' && o.pos === '8,5')).toBe(true);
    expect(f.pressure(f.foe)).toBe(2);
  });
  it('a Hidden thrower is revealed, as by today\'s Throw', () => {
    const f = nades({ frag_grenade: 1 }); f.pc.hidden = true;
    expect(f.tech('lob', { tile: '8,5', ammo: 'frag_grenade' })).toBeNull(); expect(f.pc.hidden).toBeFalsy();
  });
  it('smoke through Lob lays today\'s smoke and gives no Pressure', () => {
    const f = nades({ smoke_grenade: 1 }); const pv = f.pv('lob', { tile: '8,5', ammo: 'smoke_grenade' });
    expect(pv.pressure || []).toEqual([]); expect(pv.area!.length).toBe(49);
    expect(f.tech('lob', { tile: '8,5', ammo: 'smoke_grenade' })).toBeNull();
    expect((f.cb.zones || []).some((z) => z.kind === 'veil' && z.tiles.includes('8,5'))).toBe(true); expect(f.pressure(f.foe)).toBe(0);
  });
});

describe('smoke, flashbangs and the scrambler act on other people\'s fire', () => {
  /** The foe holds Overwatch and a Bead on the shooter; then it is the shooter's turn. */
  const watching = (o: { known?: string[] } = {}) => {
    const f = fight({ known: o.known, foes: [{ at: '8,5' }] });
    f.turn(f.foe); expect(f.use(f.foe, 'overwatch')).toBeNull();
    f.foe.tech = { ...(f.foe.tech || {}), bead: { targetId: f.pc.id } };
    f.turn(f.pc); expect((f.foe as any).watch?.id).toBe('overwatch'); return f;
  };
  it('a smoke grenade lobbed onto a unit ends its held Watch and its Bead', () => {
    const f = watching(); f.pc.throwables = { smoke_grenade: 1 };
    expect(f.tech('lob', { tile: '8,5', ammo: 'smoke_grenade' })).toBeNull();
    expect((f.foe as any).watch).toBeUndefined(); expect(f.foe.tech!.bead.targetId).toBeNull();
    expect(f.cb.log.some((l) => /loses the held shot \(smoke grenade\)/.test(l))).toBe(true);
    expect(f.fx('watch_end').some((e: any) => e.unit === f.foe.id && e.why === 'smoke grenade')).toBe(true);
    // the Bead ends through sets.ts's endBead: its log line and its bead_end fx
    expect(f.cb.log.some((l) => /loses the bead \(smoke grenade\)/.test(l))).toBe(true);
    expect(f.fx('bead_end').some((e: any) => e.unit === f.foe.id && e.target === f.pc.id && e.why === 'smoke grenade')).toBe(true);
  });
  it('today\'s Throw does it too (a character who knows no techniques): a flashbang', () => {
    const f = watching({ known: [] }); f.pc.throwables = { flashbang: 1 };
    f.act({ type: 'combat/throw', unitId: f.pc.id, item: 'flashbang', tile: '8,5' } as any);
    expect(f.pc.ap).toBe(4); // today's Throw: 2 AP
    expect((f.foe as any).watch).toBeUndefined(); expect(f.foe.tech!.bead.targetId).toBeNull();
  });
  it('the bot-scrambler ends them, and still Stuns a machine', () => {
    const f = watching(); f.foe.kind = 'robot'; f.pc.throwables = { bot_scrambler: 1 };
    expect(f.tech('lob', { tile: '8,5', ammo: 'bot_scrambler' })).toBeNull();
    expect((f.foe as any).watch).toBeUndefined(); expect(f.foe.conds?.stunned).toBeTruthy();
  });
  it('a frag ends the Watch only by the Pressure it gives (Pressed drops a held shot), and leaves the Bead', () => {
    const f = watching(); f.pc.throwables = { frag_grenade: 1 };
    expect(f.tech('lob', { tile: '8,5', ammo: 'frag_grenade' })).toBeNull();
    expect(f.foe.dead).toBe(false); expect((f.foe as any).watch).toBeUndefined();
    expect(f.fx('watch_end').filter((e: any) => e.unit === f.foe.id).map((e: any) => e.why)).toEqual(['Pressed']);
    expect(f.foe.tech!.bead.targetId).toBe(f.pc.id);
  });
  it('a unit outside the radius keeps its Watch and its Bead', () => {
    const f = watching(); f.pc.throwables = { smoke_grenade: 1 };
    expect(f.tech('lob', { tile: '8,1', ammo: 'smoke_grenade' })).toBeNull(); // 4 tiles off: smoke radius 3
    expect((f.foe as any).watch?.id).toBe('overwatch'); expect(f.foe.tech!.bead.targetId).toBe(f.pc.id);
  });
  it('it lands on either side: the thrower\'s own ally loses its held shot too', () => {
    const f = fight({ foes: [{ at: '14,9' }] }); f.put(f.pcs[1], '8,5'); f.turn(f.pcs[1]);
    expect(f.use(f.pcs[1], 'overwatch')).toBeNull(); f.turn(f.pc); f.pc.throwables = { smoke_grenade: 1 };
    expect(f.tech('lob', { tile: '8,5', ammo: 'smoke_grenade' })).toBeNull(); expect((f.pcs[1] as any).watch).toBeUndefined();
  });
});

describe('smoke lets Pressure fall by 2', () => {
  it('an enemy standing in smoke at the end of its turn sheds 2; in the open, 1', () => {
    const run = (inSmoke: boolean) => {
      const f = fight({ foes: [{ at: '8,5' }] }); if (inSmoke) { f.pc.throwables = { smoke_grenade: 1 }; expect(f.tech('lob', { tile: '8,5', ammo: 'smoke_grenade' })).toBeNull(); }
      f.press(f.foe, 3, f.pc); f.turn(f.foe); f.pass(); return f.pressure(f.foe);
    };
    expect(run(false)).toBe(2); expect(run(true)).toBe(1);
  });
  it('a player in smoke too', () => {
    const f = fight(); smoke(f, ['2,4', '2,5', '2,6']); f.press(f.pc, 3, f.foe); f.pass(); expect(f.pressure(f.pc)).toBe(1);
  });
});

describe('the enemy AI', () => {
  it('an enemy with a thumper lobs a Blast where it catches the most of the squad, and none of its own', () => {
    const f = physFight([{ weapon: RIFLE }, { weapon: RIFLE }, { weapon: RIFLE }], [{ at: '14,5', weapon: 'smetanita_thumper' }, { at: '13,1' }]);
    f.put(f.pcs[0], '4,5'); f.put(f.pcs[1], '5,6'); f.put(f.pcs[2], '9,1'); f.put(f.foes[0], '14,5'); f.put(f.foes[1], '11,1'); f.turn(f.foes[0]);
    const before = snap(f), s = f.bound(() => phys.aiScore(f.cb, f.foes[0], 'lob', { hand: 'main' }));
    expect(snap(f)).toBe(before); // pure
    expect(s.args.line).toBe('blast'); expect(['4,5', '5,6']).toContain(s.args.tile); expect(s.score).toBe(8);
    expect(f.pv('lob', s.args, f.foes[0]).ok).toBe(true);
  });
  it('an enemy lobs a shot only at someone it has no line to', () => {
    const f = physFight([{ weapon: RIFLE }, { weapon: RIFLE }], [{ at: '12,5', weapon: RIFLE }]);
    f.put(f.pcs[0], '2,5'); f.put(f.pcs[1], '2,9'); f.put(f.foe, '12,5'); f.turn(f.foe);
    const score = () => f.bound(() => phys.aiScore(f.cb, f.foe, 'lob', { hand: 'main' }));
    expect(score().score).toBe(0);
    // smoke between the foe and both PCs, but a second foe sees the first PC
    f.cb.units.push({ ...JSON.parse(JSON.stringify(f.foe)), id: 'foe-x', name: 'Spotter', pos: '2,1' });
    smoke(f, ['6,4', '6,5', '6,6', '6,7', '6,8', '6,9', '6,10']);
    expect(score()).toEqual({ score: 6, args: { hand: 'main', targetId: f.pcs[0].id } });
  });
});
