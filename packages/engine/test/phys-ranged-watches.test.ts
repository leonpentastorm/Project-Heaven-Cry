// Physical 2.0 (rules 1.12), ranged Watches: Cover Me (29) and Dead to Rights (30). Paid on the holder's turn; they fire
// on the enemy's turn with no input, once, as the holder's reaction, and never while the holder is Pressed.
import { describe, it, expect, beforeEach } from 'vitest';
import { reactionsUsed } from '../src';
import { phys, resolveAttack, previewAttack, toggleProne, reload, reloadHands, enemyTurn, type Unit } from '../src';
import { onHook } from '../src/effects/hooks';
import { physFight, rig } from './helpers/physfight';
import { calm as reset, unchanged, type PhysF as F } from './helpers/physfight-ranged';

beforeEach(() => { rig(null); ROLLS.length = 0; });

// ---------- helpers (the shared ones are in helpers/physfight-ranged.ts) ----------
/** Every attack roll's to-hit, by attacker id (read from the live roll, after every term). */
const ROLLS: { att: string; tgt: string; toHit: number }[] = [];
onHook('attack_roll', (ctx: any) => { ROLLS.push({ att: ctx.att.id, tgt: ctx.tgt.id, toHit: ctx.toHit }); });
const lastRoll = (by: Unit) => [...ROLLS].reverse().find((r) => r.att === by.id);
/** An attack made directly on the engine (the enemy's own swing or shot), with the game bound. */
const attack = (f: F, att: Unit, tgt: Unit, mode: 'shot' | 'melee' = 'shot') => f.bound(() => resolveAttack(f.cb, f.g.rng, f.unit(att.id), f.unit(tgt.id), mode, null, { noAp: true }));
/** Clear every meter (a fight with more players can open with the enemy's turn). */
const calm = (f: F) => { for (const u of f.cb.units) f.press(u, 0); };
const heldShots = (f: F) => f.cb.log.filter((l) => /fires the held shot/.test(l)).length;
/** A snapshot of everything a preview must not change. */
const snap = (f: F) => JSON.stringify({ units: f.cb.units, log: f.cb.log.length, fx: ((f.cb as any).fx || []).length });

// Two players and an enemy: the holder at C5, the ally at C7, the enemy at H5 (a pistol soldier) unless told otherwise.
function coverFight(weapon = 'service_pistol', foe: { tier?: string; weapon?: string } = {}, more: any[] = []) {
  const f = physFight([{ weapon, known: ['cover_me'], skills: { dexterity: 6 } }, { weapon: 'service_pistol' }], [{ at: 'H5', tier: foe.tier || 'soldier', weapon: foe.weapon || 'service_pistol' }, ...more]);
  f.put(f.pc, 'C5'); f.put(f.pcs[1], 'C7'); reset(f); f.turn(f.pc);
  return f;
}
function rightsFight(weapon = 'service_pistol', foe: { tier?: string; weapon?: string; at?: string } = {}) {
  const f = physFight([{ weapon, known: ['dead_to_rights'], skills: { dexterity: 6 } }, { weapon: 'service_pistol' }], [{ at: foe.at || 'H5', tier: foe.tier || 'soldier', weapon: foe.weapon || 'service_pistol' }]);
  f.put(f.pc, 'C5'); f.put(f.pcs[1], 'C7'); reset(f); f.turn(f.pc);
  return f;
}

describe('Cover Me (29)', () => {
  it('base: paid now (2 AP, no round), then the first enemy to attack the named ally is at −2 and gains 1 Pressure', () => {
    const f = coverFight(); const ally = f.pcs[1];
    const base = f.bound(() => previewAttack(f.cb, f.foe, ally, 'shot', { free: true })).toHit;
    const ammo = f.pc.ammo, heat = f.pc.heat;
    expect(f.tech('cover_me', { allyId: ally.id })).toBeNull();
    expect(f.pc.ap).toBe(4); expect(f.pc.ammo).toBe(ammo); expect(f.pc.watch?.id).toBe('cover_me'); expect(f.pc.watch?.allyId).toBe(ally.id);
    f.turn(f.foe); rig({ hit: false, die: 5 });
    attack(f, f.foe, ally);
    expect(lastRoll(f.foe)!.toHit).toBe(base - 2);
    expect(f.pressure(f.foe)).toBe(1);
    expect(f.unit(f.pc.id).watch).toBeUndefined(); expect(reactionsUsed(f.cb, f.unit(f.pc.id))).toBe(1);
    expect(f.unit(f.pc.id).ammo).toBe(ammo - 1); // the covering round goes
    expect(f.unit(f.pc.id).heat).toBe(heat + 1); // nothing rolled, but the round is still a shot by today's rules: +1 Heat (review fix)
    expect(f.fx('watch_fire').length).toBe(1);
    // once: the next attack on the ally is at its own number again, and nothing fires
    attack(f, f.foe, ally); expect(lastRoll(f.foe)!.toHit).toBe(base); expect(heldShots(f)).toBe(1); expect(f.pressure(f.foe)).toBe(1);
  });
  it('a technique volley made of separate strikes (Burst) is one attack: −2 on every roll of it, and on nothing after', () => {
    const rollsOf = (cover: boolean) => {
      const f = coverFight(); const ally = f.pcs[1]; f.foe.techs = ['burst'];
      if (cover) expect(f.tech('cover_me', { allyId: ally.id })).toBeNull();
      f.turn(f.foe); f.unit(f.foe.id).ap = 9; rig({ hit: false, die: 5 }); ROLLS.length = 0;
      expect(f.use(f.foe, 'burst', { targetId: ally.id })).toBeNull();
      const burst = ROLLS.filter((r) => r.att === f.foe.id).map((r) => r.toHit);
      attack(f, f.foe, ally); return { burst, after: lastRoll(f.foe)!.toHit };
    };
    const plain = rollsOf(false), covered = rollsOf(true);
    expect(plain.burst.length).toBe(2); expect(covered.burst).toEqual(plain.burst.map((v) => v - 2));
    expect(covered.after).toBe(plain.after);
  });
  it('an attack on someone else does not set it off; nor does an ally attacking', () => {
    const f = coverFight(); const ally = f.pcs[1];
    f.tech('cover_me', { allyId: ally.id }); f.turn(f.foe); rig({ hit: false, die: 5 });
    attack(f, f.foe, f.pc); expect(f.unit(f.pc.id).watch?.id).toBe('cover_me'); expect(heldShots(f)).toBe(0);
    f.turn(ally); attack(f, ally, f.foe); expect(f.unit(f.pc.id).watch?.id).toBe('cover_me');
  });
  it('fires on the enemy\'s own turn with no input (the enemy AI attacks the ally)', () => {
    const f = coverFight(); const ally = f.pcs[1];
    f.tech('cover_me', { allyId: ally.id });
    f.unit(f.pc.id).hidden = true; // the enemy can't see the holder: the ally is the only one it can shoot
    f.turn(f.foe); rig({ hit: false, die: 5 });
    f.bound(() => enemyTurn(f.cb, f.g.rng));
    expect(ROLLS.some((r) => r.att === f.foe.id && r.tgt === ally.id)).toBe(true);
    expect(heldShots(f)).toBe(1); expect(reactionsUsed(f.cb, f.unit(f.pc.id))).toBe(1);
    expect(f.cb.log.some((l) => /Covering fire/.test(l))).toBe(true);
  });
  it('refusals: no ally, yourself, an enemy, two without Auto, while Pressed; nothing is spent', () => {
    const f = coverFight();
    expect(f.tech('cover_me')).toMatch(/Name an ally/);
    expect(f.tech('cover_me', { allyId: f.pc.id })).toMatch(/not yourself/);
    expect(f.tech('cover_me', { allyId: f.foe.id })).toMatch(/isn't one of your allies/);
    expect(f.tech('cover_me', { allyIds: [f.pcs[1].id, f.pc.id] })).toMatch(/one ally: two need an Auto weapon/);
    expect(f.pc.ap).toBe(6);
    f.press(f.pc, 2, f.foe); expect(f.tech('cover_me', { allyId: f.pcs[1].id })).toMatch(/Pressed/);
    expect(f.pc.ap).toBe(6);
  });
  it('a held Cover Me does not fire while the holder is Pressed, and stays held', () => {
    const f = coverFight(); const ally = f.pcs[1];
    f.tech('cover_me', { allyId: ally.id });
    (f.unit(f.pc.id) as any).pressure = 2; // Pressed without the state change (which would drop it): fireWatch refuses
    f.turn(f.foe); rig({ hit: false, die: 5 }); attack(f, f.foe, ally);
    expect(heldShots(f)).toBe(0); expect(f.pressure(f.foe)).toBe(0); expect(reactionsUsed(f.cb, f.unit(f.pc.id))).toBe(0);
    // and becoming Pressed the ordinary way drops it
    const g = coverFight(); g.tech('cover_me', { allyId: g.pcs[1].id }); g.press(g.pc, 2, g.foe); expect(g.unit(g.pc.id).watch).toBeUndefined();
  });
  it('Auto: two allies, either one sets it off (and only once); without Auto one', () => {
    const f = physFight([{ weapon: 'decrkm_smg', known: ['cover_me'], skills: { dexterity: 6 } }, { weapon: 'service_pistol' }, { weapon: 'service_pistol' }], [{ at: 'H5' }]);
    f.put(f.pc, 'C5'); f.put(f.pcs[1], 'C7'); f.put(f.pcs[2], 'C3'); calm(f); f.turn(f.pc);
    const [a, b] = [f.pcs[1], f.pcs[2]];
    expect(f.tech('cover_me', { allyIds: [a.id, b.id, a.id] })).toBeNull(); // the same ally twice counts once
    expect(f.pc.watch?.allyIds).toEqual([a.id, b.id]);
    f.turn(f.foe); rig({ hit: false, die: 5 }); attack(f, f.foe, b);
    expect(heldShots(f)).toBe(1); expect(f.pressure(f.foe)).toBe(1);
    attack(f, f.foe, a); expect(heldShots(f)).toBe(1);
    const g = physFight([{ weapon: 'decrkm_smg', known: ['cover_me'] }, {}, {}, {}], [{ at: 'H5' }]); calm(g); g.turn(g.pc);
    expect(g.tech('cover_me', { allyIds: g.pcs.slice(1).map((u) => u.id) })).toMatch(/2 allies at most/);
  });
  it('Precise: you also take the shot (a roll, a round, Heat; its hit adds the ordinary +1 on top)', () => {
    const f = coverFight('ccec_marksman_rifle'); const ally = f.pcs[1];
    f.tech('cover_me', { allyId: ally.id }); const ammo = f.pc.ammo, heat = f.pc.heat, hp = f.foe.hp;
    f.turn(f.foe); rig({ hit: true, die: 12 }); attack(f, f.foe, ally);
    expect(f.unit(f.foe.id).hp).toBeLessThan(hp);
    expect(f.unit(f.pc.id).ammo).toBe(ammo - 1); expect(f.unit(f.pc.id).heat).toBe(heat + 1);
    expect(f.pressure(f.foe)).toBe(2); // Cover Me's 1 and the hit's 1
    expect(ROLLS.filter((r) => r.att === f.pc.id).length).toBe(1);
  });
  it('without Precise there is no shot; with Precise a miss still covers (−2, +1 Pressure)', () => {
    const f = coverFight('service_pistol'); f.tech('cover_me', { allyId: f.pcs[1].id }); const hp = f.foe.hp;
    f.turn(f.foe); rig({ hit: true, die: 12 }); attack(f, f.foe, f.pcs[1]);
    expect(f.unit(f.foe.id).hp).toBe(hp); expect(ROLLS.filter((r) => r.att === f.pc.id).length).toBe(0);
    const g = coverFight('ccec_marksman_rifle'); g.tech('cover_me', { allyId: g.pcs[1].id });
    g.turn(g.foe); rig({ hit: false, die: 5 }); attack(g, g.foe, g.pcs[1]); expect(g.pressure(g.foe)).toBe(1);
  });
  it('a held shot: an attacker out of the weapon\'s range sets nothing off, though seen (review fix); the round is a shot by today\'s rules', () => {
    // the parlour pistol (range 4: 12 tiles at most) and an enemy 15 tiles off in clear sight
    const f = coverFight('parlour_pistol', { weapon: 'ccec_marksman_rifle' }); const ally = f.pcs[1]; f.put(f.pc, '0,0'); f.put(ally, '13,0'); f.put(f.foe, '15,0');
    expect(f.bound(() => previewAttack(f.cb, f.unit(f.pc.id), f.unit(f.foe.id), 'shot', { free: true })).why).toBe('Out of range.');
    expect(f.tech('cover_me', { allyId: ally.id })).toBeNull(); const ammo = f.pc.ammo;
    f.turn(f.foe); rig({ hit: false, die: 5 }); const base = f.bound(() => previewAttack(f.cb, f.foe, ally, 'shot', { free: true })).toHit;
    attack(f, f.foe, ally);
    expect(lastRoll(f.foe)!.toHit).toBe(base); expect(f.pressure(f.foe)).toBe(0); expect(heldShots(f)).toBe(0);
    expect(f.unit(f.pc.id).ammo).toBe(ammo); expect(f.unit(f.pc.id).watch?.id).toBe('cover_me');
    // in range, a Hidden holder's covering round (a loud gun, no roll) gives it away
    const g = coverFight('service_pistol'); g.tech('cover_me', { allyId: g.pcs[1].id }); g.unit(g.pc.id).hidden = true;
    g.turn(g.foe); attack(g, g.foe, g.pcs[1]); expect(heldShots(g)).toBe(1); expect(g.unit(g.pc.id).hidden).toBe(false); expect(g.unit(g.pc.id).shotsThisTurn).toBe(1);
  });
  it('Precise: a shot that fells the attacker stops its attack', () => {
    const f = coverFight('ccec_marksman_rifle'); const ally = f.pcs[1]; f.tech('cover_me', { allyId: ally.id });
    f.turn(f.foe); f.unit(f.foe.id).hp = 1; const ahp = f.unit(ally.id).hp; rig({ hit: true, die: 12 });
    const r = attack(f, f.foe, ally);
    expect(r.cancelled).toBe(true); expect(r.refused).toBeUndefined(); expect(f.unit(ally.id).hp).toBe(ahp); // the base: an attack that never comes is not a miss
  });
  it('a weapon with Auto and Precise: the line chosen when it was held is the one that fires', () => {
    const f = coverFight('hellraiser_service_rifle'); const ally = f.pcs[1];
    expect(f.tech('cover_me', { allyId: ally.id, line: 'precise' })).toBeNull(); expect(f.pc.watch?.line).toBe('precise');
    f.turn(f.foe); rig({ hit: false, die: 5 }); attack(f, f.foe, ally);
    expect(ROLLS.filter((r) => r.att === f.pc.id).length).toBe(1); // Precise took the shot
    const g = coverFight('hellraiser_service_rifle'); expect(g.tech('cover_me', { allyId: g.pcs[1].id })).toBeNull(); // Auto by default
    g.turn(g.foe); rig({ hit: false, die: 5 }); ROLLS.length = 0; attack(g, g.foe, g.pcs[1]); expect(ROLLS.filter((r) => r.att === g.pc.id).length).toBe(0);
  });
  it('Pressure caps: an elite stops at 3, a boss at 2, a player at 3', () => {
    const f = coverFight('service_pistol', { tier: 'elite' }); f.press(f.foe, 3); f.tech('cover_me', { allyId: f.pcs[1].id });
    f.turn(f.foe); rig({ hit: false, die: 5 }); attack(f, f.foe, f.pcs[1]); expect(f.pressure(f.foe)).toBe(3); expect(heldShots(f)).toBe(1);
    const g = coverFight('service_pistol', { tier: 'boss' }); g.press(g.foe, 2); g.tech('cover_me', { allyId: g.pcs[1].id });
    g.turn(g.foe); rig({ hit: false, die: 5 }); attack(g, g.foe, g.pcs[1]); expect(g.pressure(g.foe)).toBe(2);
    // an enemy covering its mate: the player who attacks the mate stops at 3
    const h = physFight([{ weapon: 'service_pistol' }], [{ at: 'H5', weapon: 'service_pistol' }, { at: 'H7', weapon: 'service_pistol' }]);
    h.put(h.pc, 'C5'); const [holder, mate] = h.foes; (h.unit(holder.id) as any).techs = ['cover_me'];
    h.turn(holder); expect(h.use(holder, 'cover_me', { allyId: mate.id })).toBeNull();
    h.press(h.pc, 3); h.turn(h.pc); rig({ hit: false, die: 5 }); attack(h, h.pc, mate);
    expect(h.pressure(h.pc)).toBe(3); expect(heldShots(h)).toBe(1);
  });
  it('the preview describes it and changes nothing; the action then costs what it showed', () => {
    const f = coverFight('ccec_marksman_rifle'); const ally = f.pcs[1];
    let pv!: phys.TechPreview; unchanged(f, () => { pv = f.pv('cover_me', { allyId: ally.id }); }); // the whole game, the dice included (review fix)
    expect(pv.ok).toBe(true); expect(pv.ap).toBe(2); expect(pv.rounds).toBe(0); expect(pv.attacks.length).toBe(0);
    expect(pv.notes.join(' ')).toMatch(/−2 and gains 1 Pressure/); expect(pv.notes.join(' ')).toMatch(/Precise/);
    const ap = f.pc.ap; f.tech('cover_me', { allyId: ally.id }); expect(ap - f.pc.ap).toBe(pv.ap);
    expect(f.pv('cover_me').ok).toBe(false);
  });
  it('ends at the holder\'s next turn', () => {
    const f = coverFight(); f.tech('cover_me', { allyId: f.pcs[1].id }); f.turn(f.pc); expect(f.pc.watch).toBeUndefined();
  });
});

describe('Dead to Rights (30)', () => {
  it('base: 3 AP now; when the named Pressed enemy attacks, the shot lands first at +2', () => {
    const f = rightsFight(); f.press(f.foe, 2, f.pc);
    const base = f.bound(() => previewAttack(f.cb, f.pc, f.foe, 'shot', { free: true })).toHit;
    expect(f.tech('dead_to_rights', { targetId: f.foe.id })).toBeNull();
    expect(f.pc.ap).toBe(3); expect(f.pc.watch?.targetId).toBe(f.foe.id);
    f.turn(f.foe); rig({ hit: false, die: 5 }); ROLLS.length = 0;
    attack(f, f.foe, f.pcs[1]);
    expect(ROLLS[0].att).toBe(f.pc.id); expect(ROLLS[0].toHit).toBe(base + 2); // first, and at +2
    expect(ROLLS[1].att).toBe(f.foe.id);
    expect(f.unit(f.pc.id).watch).toBeUndefined(); expect(reactionsUsed(f.cb, f.unit(f.pc.id))).toBe(1);
    attack(f, f.foe, f.pcs[1]); expect(heldShots(f)).toBe(1); // once
  });
  it('fires on the enemy\'s own turn with no input (the enemy AI attacks)', () => {
    const f = rightsFight(); f.press(f.foe, 2, f.pc); f.tech('dead_to_rights', { targetId: f.foe.id });
    f.turn(f.foe); rig({ hit: false, die: 5 }); ROLLS.length = 0;
    f.bound(() => enemyTurn(f.cb, f.g.rng));
    expect(heldShots(f)).toBe(1); expect(ROLLS[0]?.att).toBe(f.pc.id); expect(reactionsUsed(f.cb, f.unit(f.pc.id))).toBe(1);
  });
  it('not Pressed when it acts: nothing fires, and the shot stays held', () => {
    const f = rightsFight(); expect(f.tech('dead_to_rights', { targetId: f.foe.id })).toBeNull();
    f.turn(f.foe); rig({ hit: false, die: 5 }); attack(f, f.foe, f.pcs[1]);
    expect(heldShots(f)).toBe(0); expect(f.unit(f.pc.id).watch?.id).toBe('dead_to_rights');
  });
  it('another enemy acting does not set it off', () => {
    const f = physFight([{ weapon: 'service_pistol', known: ['dead_to_rights'] }, {}], [{ at: 'H5' }, { at: 'H7' }]); f.put(f.pc, 'C5'); f.turn(f.pc);
    const [a, b] = f.foes; f.press(a, 2); f.press(b, 2); f.tech('dead_to_rights', { targetId: a.id });
    f.turn(b); rig({ hit: false, die: 5 }); attack(f, b, f.pcs[1]); expect(heldShots(f)).toBe(0);
  });
  it('a shot that fells the attacker stops its attack', () => {
    const f = rightsFight(); f.press(f.foe, 2); f.tech('dead_to_rights', { targetId: f.foe.id });
    f.turn(f.foe); f.unit(f.foe.id).hp = 1; const ahp = f.unit(f.pcs[1].id).hp; rig({ hit: true, die: 12 });
    const r = attack(f, f.foe, f.pcs[1]); expect(r.cancelled).toBe(true); expect(f.unit(f.pcs[1].id).hp).toBe(ahp); // the base: it never comes
  });
  it('stands up: the hook fires after a prone enemy stands', () => {
    const f = rightsFight(); f.press(f.foe, 2); f.tech('dead_to_rights', { targetId: f.foe.id });
    f.turn(f.foe); f.unit(f.foe.id).prone = true; rig({ hit: false, die: 5 });
    expect(f.bound(() => toggleProne(f.cb, f.unit(f.foe.id)))).toBeNull(); // drops prone? no: it was prone, it stands
    expect(f.unit(f.foe.id).prone).toBe(false); expect(heldShots(f)).toBe(1);
    expect(f.cb.log.some((l) => /stands up: the shot lands first/.test(l))).toBe(true);
    const g = rightsFight(); g.press(g.foe, 2); g.tech('dead_to_rights', { targetId: g.foe.id });
    g.turn(g.foe); g.bound(() => toggleProne(g.cb, g.unit(g.foe.id))); expect(heldShots(g)).toBe(0); // dropping prone is not standing up
  });
  it('reloads: the shot comes first; a shot that fells it stops the reload', () => {
    const f = rightsFight(); f.press(f.foe, 2); f.tech('dead_to_rights', { targetId: f.foe.id });
    f.turn(f.foe); f.unit(f.foe.id).ammo = 3; rig({ hit: false, die: 5 });
    expect(f.bound(() => reload(f.cb, f.unit(f.foe.id)))).toBeNull();
    expect(heldShots(f)).toBe(1); expect(f.unit(f.foe.id).ammo).toBeGreaterThan(3); // it missed: the reload goes ahead
    const g = rightsFight(); g.press(g.foe, 2); g.tech('dead_to_rights', { targetId: g.foe.id });
    g.turn(g.foe); const u = g.unit(g.foe.id); u.ammo = 3; u.hp = 1; rig({ hit: true, die: 12 });
    g.bound(() => reload(g.cb, g.unit(g.foe.id)));
    expect(g.unit(g.foe.id).ammo).toBe(3); expect(g.cb.log.some((l) => /reloads/.test(l) && l.startsWith(g.foe.name))).toBe(false);
  });
  it('reloads the off-hand gun: the shot comes first there too; felled, nothing is reloaded or spent (review fix)', () => {
    const arm = (g: F) => { const u = g.unit(g.foe.id); u.offWeapon = 'service_pistol'; u.offAmmo = 1; u.ammo = 3; return u; };
    const f = rightsFight(); f.press(f.foe, 2); f.tech('dead_to_rights', { targetId: f.foe.id });
    f.turn(f.foe); arm(f); rig({ hit: false, die: 5 });
    expect(f.bound(() => reloadHands(f.cb, f.unit(f.foe.id), 'off'))).toBeNull();
    expect(heldShots(f)).toBe(1); expect(f.cb.log.some((l) => /reloads: the shot lands first/.test(l))).toBe(true);
    expect(f.unit(f.foe.id).offAmmo).toBe(12); // it missed: the reload goes ahead
    const g = rightsFight(); g.press(g.foe, 2); g.tech('dead_to_rights', { targetId: g.foe.id });
    g.turn(g.foe); const u = arm(g); u.hp = 1; const ap = u.ap; rig({ hit: true, die: 12 });
    expect(g.bound(() => reloadHands(g.cb, g.unit(g.foe.id), 'off'))).toBeNull();
    expect(g.unit(g.foe.id).dead).toBe(true); expect(g.unit(g.foe.id).offAmmo).toBe(1); expect(g.unit(g.foe.id).ap).toBe(ap);
    expect(g.cb.log.some((l) => /reloads the off-hand gun/.test(l))).toBe(false);
  });
  it('reloads both guns: felled on the main gun, the off-hand gun isn\'t reloaded either and no AP goes (review fix)', () => {
    const g = rightsFight(); g.press(g.foe, 2); g.tech('dead_to_rights', { targetId: g.foe.id });
    g.turn(g.foe); const u = g.unit(g.foe.id); u.offWeapon = 'service_pistol'; u.offAmmo = 1; u.ammo = 3; u.hp = 1; const ap = u.ap; rig({ hit: true, die: 12 });
    expect(g.bound(() => reloadHands(g.cb, g.unit(g.foe.id), 'both'))).toBeNull();
    const x = g.unit(g.foe.id); expect(x.dead).toBe(true); expect(x.ammo).toBe(3); expect(x.offAmmo).toBe(1); expect(x.ap).toBe(ap);
    expect(g.cb.log.some((l) => /reloads both guns/.test(l))).toBe(false); expect(heldShots(g)).toBe(1);
  });
  it('leaves cover: the first step from a tile against cover to one that isn\'t', () => {
    const f = rightsFight('ccec_marksman_rifle', { at: 'I5' }); f.cb.map = { ...f.cb.map, cover: [...f.cb.map.cover, f.tile('I6')] }; // a copy: the map definition is shared
    f.press(f.foe, 2); f.tech('dead_to_rights', { targetId: f.foe.id });
    f.turn(f.foe); rig({ hit: false, die: 5 });
    f.walk(f.foe, 'J5'); expect(heldShots(f)).toBe(0); // still against the cover at I6
    f.walk(f.foe, 'K5'); expect(heldShots(f)).toBe(1);
    expect(f.cb.log.some((l) => /leaves cover: the shot lands first/.test(l))).toBe(true);
    // moving in the open is not leaving cover
    const g = rightsFight('ccec_marksman_rifle', { at: 'I5' }); g.press(g.foe, 2); g.tech('dead_to_rights', { targetId: g.foe.id });
    g.turn(g.foe); g.walk(g.foe, 'K5'); expect(heldShots(g)).toBe(0);
  });
  it('Precise: a critical on 18–20; without it, 18 is a plain hit', () => {
    const f = rightsFight('ccec_marksman_rifle'); f.press(f.foe, 2); f.tech('dead_to_rights', { targetId: f.foe.id });
    f.turn(f.foe); rig({ die: 18 }); attack(f, f.foe, f.pcs[1]);
    expect(f.cb.log.some((l) => l.startsWith(f.pc.name + ' fires at') && /CRITICAL/.test(l))).toBe(true);
    const g = rightsFight('service_pistol'); g.press(g.foe, 2); g.tech('dead_to_rights', { targetId: g.foe.id });
    g.turn(g.foe); rig({ die: 18 }); attack(g, g.foe, g.pcs[1]);
    const line = g.cb.log.find((l) => l.startsWith(g.pc.name + ' fires at'))!; expect(line).toMatch(/hit/); expect(line).not.toMatch(/CRITICAL/);
  });
  it('Silent: you stay Hidden (and the unseen Silent hit gives its 2); without Silent the shot reveals you', () => {
    const f = rightsFight('parlour_pistol', { at: 'F5' }); f.press(f.foe, 2); f.tech('dead_to_rights', { targetId: f.foe.id });
    f.unit(f.pc.id).hidden = true; f.turn(f.foe); rig({ hit: true, die: 12 }); attack(f, f.foe, f.pcs[1]);
    expect(heldShots(f)).toBe(1); expect(f.unit(f.pc.id).hidden).toBe(true); expect(f.pressure(f.foe)).toBe(4);
    expect(f.cb.log.some((l) => /stays Hidden/.test(l))).toBe(true);
    const g = rightsFight('service_pistol', { at: 'F5' }); g.press(g.foe, 2); g.tech('dead_to_rights', { targetId: g.foe.id });
    g.unit(g.pc.id).hidden = true; g.turn(g.foe); rig({ hit: true, die: 12 }); attack(g, g.foe, g.pcs[1]);
    expect(heldShots(g)).toBe(1); expect(g.unit(g.pc.id).hidden).toBe(false);
  });
  it('the hit gives the ordinary +1 Pressure (a miss none); caps: elite 3, boss 2', () => {
    const f = rightsFight(); f.press(f.foe, 2); f.tech('dead_to_rights', { targetId: f.foe.id });
    f.turn(f.foe); rig({ hit: true, die: 12 }); attack(f, f.foe, f.pcs[1]); expect(f.pressure(f.foe)).toBe(3);
    const m = rightsFight(); m.press(m.foe, 2); m.tech('dead_to_rights', { targetId: m.foe.id });
    m.turn(m.foe); rig({ hit: false, die: 5 }); attack(m, m.foe, m.pcs[1]); expect(m.pressure(m.foe)).toBe(2);
    const e = rightsFight('service_pistol', { tier: 'elite' }); e.press(e.foe, 3); e.tech('dead_to_rights', { targetId: e.foe.id });
    e.turn(e.foe); rig({ hit: true, die: 12 }); attack(e, e.foe, e.pcs[1]); expect(e.pressure(e.foe)).toBe(3); expect(heldShots(e)).toBe(1);
    const b = rightsFight('service_pistol', { tier: 'boss' }); b.press(b.foe, 2); b.tech('dead_to_rights', { targetId: b.foe.id });
    b.turn(b.foe); rig({ hit: true, die: 12 }); attack(b, b.foe, b.pcs[1]); expect(b.pressure(b.foe)).toBe(2); expect(heldShots(b)).toBe(1);
  });
  it('an enemy holding it on a player: the player stops at 3 Pressure', () => {
    const f = physFight([{ weapon: 'service_pistol' }], [{ at: 'H5', weapon: 'service_pistol' }]); f.put(f.pc, 'C5');
    (f.unit(f.foe.id) as any).techs = ['dead_to_rights']; f.press(f.pc, 3); f.turn(f.foe);
    expect(f.use(f.foe, 'dead_to_rights', { targetId: f.pc.id })).toBeNull();
    f.turn(f.pc); rig({ hit: true, die: 12 }); attack(f, f.pc, f.foe); expect(heldShots(f)).toBe(1); expect(f.pressure(f.pc)).toBe(3);
  });
  it('refusals: no target, an ally, one out of sight, while Pressed, empty; nothing is spent', () => {
    const f = rightsFight();
    expect(f.tech('dead_to_rights')).toMatch(/Name an enemy/);
    expect(f.tech('dead_to_rights', { targetId: f.pcs[1].id })).toMatch(/not an ally/);
    f.unit(f.foe.id).hidden = true; expect(f.tech('dead_to_rights', { targetId: f.foe.id })).toMatch(/can't see/); f.unit(f.foe.id).hidden = false;
    f.unit(f.pc.id).ammo = 0; expect(f.tech('dead_to_rights', { targetId: f.foe.id })).toMatch(/Empty/); f.unit(f.pc.id).ammo = 12;
    f.press(f.pc, 2, f.foe); expect(f.tech('dead_to_rights', { targetId: f.foe.id })).toMatch(/Pressed/);
    expect(f.pc.ap).toBe(6);
  });
  it('a held Dead to Rights does not fire while the holder is Pressed', () => {
    const f = rightsFight(); f.press(f.foe, 2); f.tech('dead_to_rights', { targetId: f.foe.id });
    (f.unit(f.pc.id) as any).pressure = 2; f.turn(f.foe); rig({ hit: false, die: 5 }); attack(f, f.foe, f.pcs[1]);
    expect(heldShots(f)).toBe(0); expect(reactionsUsed(f.cb, f.unit(f.pc.id))).toBe(0);
  });
  it('the preview describes it and changes nothing; the action costs what it showed', () => {
    const f = rightsFight('ccec_marksman_rifle');
    let pv!: phys.TechPreview; unchanged(f, () => { pv = f.pv('dead_to_rights', { targetId: f.foe.id }); }); // the whole game, the dice included (review fix)
    expect(pv.ok).toBe(true); expect(pv.ap).toBe(3); expect(pv.rounds).toBe(0);
    expect(pv.notes.join(' ')).toMatch(/isn't Pressed now/); expect(pv.notes.join(' ')).toMatch(/critical on 18–20/);
    const ap = f.pc.ap; f.tech('dead_to_rights', { targetId: f.foe.id }); expect(ap - f.pc.ap).toBe(pv.ap);
  });
  it('the enemy AI wants it only against a Pressed target, and not over a Watch it holds', () => {
    const f = physFight([{ weapon: 'service_pistol' }], [{ at: 'H5', weapon: 'longbow' }]); f.put(f.pc, 'C5'); f.put(f.foe, 'H5'); reset(f);
    const foe = f.unit(f.foe.id); f.turn(foe);
    expect(f.bound(() => phys.aiScore(f.cb, foe, 'dead_to_rights', { targetId: f.pc.id })).score).toBe(0);
    f.press(f.pc, 2); const before = snap(f);
    expect(f.bound(() => phys.aiScore(f.cb, foe, 'dead_to_rights', { targetId: f.pc.id })).score).toBe(6);
    expect(snap(f)).toBe(before);
    (foe as any).watch = { id: 'overwatch', hand: 'main', ap: 2, r: 1, trigger: 'moves' };
    expect(f.bound(() => phys.aiScore(f.cb, foe, 'dead_to_rights', { targetId: f.pc.id })).score).toBe(0);
  });
});
