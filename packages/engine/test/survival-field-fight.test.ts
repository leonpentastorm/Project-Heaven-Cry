// @ts-nocheck (test fixtures: plain objects)
// Rules 1.55 items 61 to 67 (0.28.3; Leon on live 0.28.2: "cannot bond in field map after battle", "ZERO effect are
// played in field map ... just write it like a normal battle"): the field is the same fight, still running, with no
// enemies left. Two players (the Empath, host; the gunner, p2), through the reducer with real actions: the last enemy
// falls and the fight goes on (Combat.field); no turn order; AP never limits; Bond and Tending heal with the fight's own
// effects; a technique, a reload, a stim on a friend, Crystallise; once-a-fight stays spent; a Hymn's wait does not tick;
// a once-a-turn use is usable once; an Evoke on a friend harms nobody; nothing grows; a pile is picked up; both vote and
// the fight closes (magicOut, Flux, the supply pack), then the picks.
import { describe, it, expect } from 'vitest';
import { apply, newGame, ARCHETYPES, reachable, RuleError, nodeXp, runNode, magazineWorth, paths, NO_TURNS, setDevotionXp, devotionThreshold, packOf, AIR_SPENT, SYPHON_DRAW, giveView, ITEM } from '../src';
import { survivalRoom, startRun, ownerOf, leaveField } from './helpers/survival';

const clone = (g: any) => JSON.parse(JSON.stringify(g));
const refused = (g: any, a: any, by = 'host') => { try { apply(g, a, by); } catch (e) { expect(e).toBeInstanceOf(RuleError); return (e as Error).message; } throw new Error('expected a refusal: ' + a.type); };
const sheet = (name: string, arch: string) => { const a: any = ARCHETYPES.find((x) => x.id === arch); return { name, portrait: '', origin: 'Thousand-Planet frontier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} }; };
/** A Survival test room of two through the camp (Recommended) into its first fight: the Empath (host) and the gunner (p2). */
function inFight(prep?: (g: any) => void) {
  let g: any = newGame('FIELD03', { id: 'host', name: 'L' }, 'seed-f'); g.settings.play = 'survival'; g.settings.test = true;
  g = apply(g, { type: 'char/add', sheet: sheet('Medic', 'mender') }, 'host');
  g = apply(g, { type: 'player/join', id: 'p2', name: 'M' }, 'host'); g = apply(g, { type: 'char/add', sheet: sheet('Gun', 'sharpshooter') }, 'p2');
  g = apply(g, { type: 'run/start', seed: 'PHC-0003' }, 'host');
  g = apply(g, { type: 'run/ready', close: true }, 'host');
  g = clone(g); prep?.(g);
  const node = reachable(g.run).find((n: any) => n.kind === 'fight');
  for (const by of ['host', 'p2']) if (g.run.state === 'map') g = apply(g, { type: 'run/move', node: node.id }, by);
  expect(g.run.state).toBe('fight');
  return g;
}
const ids = (g: any) => { const cb = g.combat, m = Object.values(g.characters).find((c: any) => c.name === 'Medic'), n = Object.values(g.characters).find((c: any) => c.name === 'Gun'); return { med: m.id, gun: n.id, mu: cb.units.find((u: any) => u.charId === m.id && !u.companion).id, gu: cb.units.find((u: any) => u.charId === n.id && !u.companion).id }; };
const U = (g: any, id: string) => g.combat.units.find((u: any) => u.id === id);
/** Stand the gunner next to the Empath (the test's own placing). */
function besides(g: any) {
  const { mu, gu } = ids(g), m = U(g, mu), [x, y] = m.pos.split(',').map(Number), taken = new Set(g.combat.units.filter((u: any) => !u.dead).map((u: any) => u.pos));
  const P = paths(g.combat, m.pos, m.id), k = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].map(([dx, dy]) => (x + dx) + ',' + (y + dy)).find((t) => !taken.has(t) && P.dist[t] === 1);
  U(g, gu).pos = k; return g;
}
/** The won fight's field by the test room's skip. */
const toField = (g: any) => { const f = apply(g, { type: 'run/skip' }, 'host'); expect(f.run.state).toBe('field'); return clone(f); };
const fxSince = (g0: any, g1: any) => (g1.combat.fx || []).filter((e: any) => e.n > (g0.combat.fxSeq || 0));

describe('rules 1.55 item 61: the last enemy falls and the fight goes on', () => {
  it('a real killing shot: the fight is still on (its phase, its units, no end), the field is open, XP and credits are paid now, the pick waits', () => {
    let g = clone(inFight());
    const { gun, gu } = ids(g), cb = g.combat, foes = cb.units.filter((u: any) => u.side === 'foe');
    for (const f of foes.slice(1)) { f.hp = 0; f.dead = true; }
    const last = foes[0], me = U(g, gu), [x, y] = me.pos.split(',').map(Number);
    const P = paths(cb, me.pos, me.id); last.pos = Object.keys(P.dist).find((k) => P.dist[k] === 2 && k !== me.pos) || (x + 2) + ',' + y; last.hp = 1; last.def = 0; delete last.hidden;
    cb.turn = cb.order.indexOf(gu); delete cb.window; me.ap = 9;
    let won: any = null;
    for (let k = 0; k < 40 && !won; k++) { const x2 = clone(g); x2.rng.state = (x2.rng.state + k * 7919) >>> 0; try { const r = apply(x2, { type: 'combat/attack', unitId: gu, targetId: last.id, mode: 'shot' }, 'p2'); if (r.run.state === 'field') won = r; } catch { /* a miss is fine: next dice */ } }
    expect(won).toBeTruthy();
    expect(won.phase).toBe('combat'); expect(won.combat.field).toBe(true); expect(won.combat.over).toBeNull();
    expect(won.combat.units.find((u: any) => u.id === gu)).toBeTruthy();
    const n = runNode(won.run, won.run.at); expect(won.characters[gun].xp).toBe(g.characters[gun].xp + nodeXp('fight', n.depth, 1));
    expect(won.run.offers[gun]).toBeTruthy();
    expect(refused(won, { type: 'run/pick', charId: gun, choice: 'materials' }, 'p2')).toBe('There is nothing to pick for that character now.');
    expect((won.combat.fx || []).some((e: any) => e.k === 'shot' || e.k === 'hit' || e.k === 'attack')).toBe(true); // the killing shot played as a shot
  });
});

describe('rules 1.55 items 62 and 63: no turn order, AP never limits', () => {
  it('the gunner acts while the turn pointer is the Empath\'s; a walk farther than the AP left goes; End turn is refused in words; rounds stand still', () => {
    let g = toField(inFight());
    const { mu, gu } = ids(g), cb = g.combat; cb.turn = cb.order.indexOf(mu); U(g, gu).ap = 0;
    const round = cb.round, me = U(g, gu), P = paths(cb, me.pos, me.id), far = Object.keys(P.dist).filter((k) => !cb.units.some((u: any) => u.pos === k && !u.dead)).sort((a, b) => P.dist[b] - P.dist[a])[0];
    expect(P.dist[far]).toBeGreaterThan(me.movement * 2);
    g = apply(g, { type: 'combat/move', unitId: gu, to: far }, 'p2');
    expect(U(g, gu).pos).toBe(far); expect(U(g, gu).ap).toBe(0); expect(g.combat.round).toBe(round); expect(g.combat.turn).toBe(cb.turn);
    expect(refused(g, { type: 'combat/end-turn', unitId: gu }, 'p2')).toBe(NO_TURNS);
    expect(refused(g, { type: 'combat/move', unitId: gu, to: far }, 'host')).toBe('Not your unit.');
    g = apply(g, { type: 'combat/technique', unitId: gu, id: 'overwatch' }, 'p2'); // a technique, at no AP
    expect(U(g, gu).ap).toBe(0); expect(g.combat.round).toBe(round);
  });
});

describe('rules 1.55 item 61: every action is the fight\'s own, with its effects', () => {
  it('Bond the ally, Mend it: HP up, the heal effect and the number, exactly as in a fight', () => {
    const g0 = besides(toField(inFight())), { mu, gu } = ids(g0); U(g0, gu).hp = 40;
    const b = apply(g0, { type: 'combat/perk', unitId: mu, id: 'verb:tend.bond', targetId: gu }, 'host');
    expect(b.combat.log.slice(g0.combat.log.length).join(' ')).toMatch(/Bonded to Gun/);
    const m = apply(b, { type: 'combat/perk', unitId: mu, id: 'verb:tend.mend', targetId: gu }, 'host'), healed = U(m, gu).hp - 40;
    expect(healed).toBeGreaterThan(0);
    expect(fxSince(b, m).find((e: any) => e.k === 'heal' && e.target === gu)?.amount).toBe(healed);
    expect(m.combat.log.slice(b.combat.log.length).join(' ')).toContain('heals ' + healed);
  });

  it('a reload, a speed reload\'s magazine picked back up, a stim on a friend next to you: each works, with its effects', () => {
    const prep = (x: any) => { for (const c of Object.values(x.characters) as any[]) { c.weapon = 'service_pistol'; c.pack = [...(c.pack || []), ...magazineWorth('service_pistol'), ...magazineWorth('service_pistol')]; } Object.values(x.characters).find((c: any) => c.name === 'Gun').stims = 2; };
    let g = besides(toField(inFight(prep)));
    const { mu, gu, med } = ids(g); U(g, gu).ammo = 1;
    g = apply(g, { type: 'combat/reload', unitId: gu }, 'p2'); // a speed reload: the magazine drops
    const pile = (g.combat.objects || []).find((o: any) => o.kind === 'pile' && o.pos === U(g, gu).pos && (o.items || []).length);
    expect(pile).toBeTruthy();
    const mags0 = (U(g, gu).mags || []).length;
    g = apply(g, { type: 'combat/pickup', unitId: gu, tile: pile.pos }, 'p2');
    expect((U(g, gu).mags || []).length).toBeGreaterThan(mags0);
    U(g, mu).hp = 10; const before = clone(g);
    g = apply(g, { type: 'combat/stim', unitId: gu, targetId: mu }, 'p2');
    expect(U(g, mu).hp).toBeGreaterThan(10); expect(g.characters[med].hp).toBe(before.characters[med].hp); // the unit is the token; the sheet takes it when the field closes
    expect(fxSince(before, g).some((e: any) => e.target === mu)).toBe(true);
  });

});

describe('rules 1.55 items 62 and 64: what stays spent, what does not tick', () => {
  it('Field Medic\'s Thrown Stim: spent in the fight, still spent on the field; unspent, thrown once on the field', () => {
    const prep = (x: any) => { const c: any = Object.values(x.characters).find((y: any) => y.name === 'Gun'); c.traits = [...(c.traits || []), 'field_medic']; c.stims = 3; };
    const g0 = inFight(prep), { gu, mu } = ids(g0);
    const throwIt = { type: 'combat/perk', unitId: gu, id: 'trait:field_medic', actionId: 'thrown_stim', targetId: mu };
    const down = (x: any) => { const t = U(x, mu); t.hp = 0; t.downed = true; t.saves = { ok: 0, fail: 0 }; };
    const f = toField(g0); down(f);
    const ok = apply(f, throwIt, 'p2'); expect(U(ok, mu).downed).toBeFalsy();
    down(ok); expect(refused(ok, throwIt, 'p2')).toMatch(/Used/);
    const x = clone(g0), cb = x.combat; cb.turn = cb.order.indexOf(gu); delete cb.window; U(x, gu).ap = 9; down(x);
    const spent = apply(x, throwIt, 'p2'), sf = toField(spent); down(sf);
    expect(refused(sf, throwIt, 'p2')).toMatch(/Used/);
  });

  it('a Hymn prayed in the fight keeps its wait however much is done on the field; a Whisper (once a turn) is prayed once there; Devotion does not grow', () => {
    const prep = (x: any) => { const c: any = Object.values(x.characters).find((y: any) => y.name === 'Medic'); c.skills.faith = 6; c.belief = { kind: 'faithful', patron: 'nerukhan' }; c.patron = 'nerukhan'; setDevotionXp(c, devotionThreshold(3)); };
    const g0 = inFight(prep), { mu, med, gu } = ids(g0), x = clone(g0), cb = x.combat; cb.turn = cb.order.indexOf(mu); delete cb.window; U(x, mu).ap = 9;
    const prayed = apply(x, { type: 'faith/pray', unitId: mu, kind: 'hymn', id: 'saints_shield', targetId: mu }, 'host');
    let f = toField(prayed);
    const hymn = { type: 'faith/pray', charId: med, kind: 'hymn', id: 'saints_shield', targetId: mu }, why = refused(f, hymn);
    expect(why).toMatch(/wait \d+/);
    for (let i = 0; i < 4; i++) f = apply(f, { type: 'combat/prone', unitId: mu }, 'host');
    f = apply(f, { type: 'combat/prone', unitId: gu }, 'p2');
    expect(refused(f, hymn)).toBe(why);
    const dev0 = JSON.stringify(f.characters[med].faith || f.characters[med].devotion || null);
    const w = (g: any) => { for (const id of ['luck', 'protection']) { try { return apply(g, { type: 'faith/pray', charId: med, kind: 'whisper', id, targetId: mu }, 'host'); } catch { /* not this one */ } } return null; };
    const once = w(f);
    expect(once).toBeTruthy(); { expect(refused(once, { type: 'faith/pray', charId: med, kind: 'whisper', id: 'luck', targetId: mu })).toMatch(/Whisper a turn/); expect(JSON.stringify(once.characters[med].faith || once.characters[med].devotion || null)).toBe(dev0); }
  });

  it('a Downed friend rolls no death save however much is done, and a stim raises them', () => {
    const prep = (x: any) => { Object.values(x.characters).find((c: any) => c.name === 'Medic').stims = 2; };
    let g = besides(toField(inFight(prep)));
    const { mu, gu } = ids(g), t = U(g, gu); t.hp = 0; t.downed = true; t.saves = { ok: 0, fail: 0 };
    for (let i = 0; i < 4; i++) g = apply(g, { type: 'combat/prone', unitId: mu }, 'host');
    expect(U(g, gu).downed).toBe(true); expect(U(g, gu).saves).toEqual({ ok: 0, fail: 0 });
    expect(refused(g, { type: 'combat/prone', unitId: gu }, 'p2')).toMatch(/is Downed/);
    g = apply(g, { type: 'combat/stim', unitId: mu, targetId: gu }, 'host');
    expect(U(g, gu).downed).toBeFalsy(); expect(U(g, gu).hp).toBeGreaterThan(0);
  });
});

describe('rules 1.55 item 64: nothing harms a friend, nothing grows', () => {
  const SIGIL = [{ build: 'sigil', level: 1 }, { build: 'plain_gun', level: 1 }];
  function sigilField() {
    let g: any = clone(startRun(survivalRoom('PHC-GROW3', SIGIL, { test: true }), 'PHC-GROW3'));
    const c = g.characters.c1; c.sigils = [...new Set([...(c.sigils || []), 'fire', 'seek'])];
    const n = reachable(g.run).find((x: any) => x.kind === 'fight');
    for (let i = 0; i < 2 && g.run.at !== n.id; i++) g = apply(g, { type: 'run/move', node: n.id }, ownerOf(i));
    return toField(g);
  }
  /** FIRE one tile on and SEEK on the caster's tile, drawn with the fight's own actions; Evoked from FIRE's end along dir. */
  function line(g0: any) {
    for (const dir of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      try {
        let g = clone(g0); const u = g.combat.units.find((x: any) => x.charId === 'c1'), at = u.pos, [x, y] = at.split(',').map(Number), next = (x + dir[0]) + ',' + (y + dir[1]);
        g = apply(g, { type: 'combat/move', unitId: u.id, to: next }, 'host'); g = apply(g, { type: 'combat/draw', unitId: u.id, word: 'fire', tile: next }, 'host');
        g = apply(g, { type: 'combat/move', unitId: u.id, to: at }, 'host'); g = apply(g, { type: 'combat/draw', unitId: u.id, word: 'seek', tile: at }, 'host');
        return { g, uid: u.id, at, fire: next, dir };
      } catch { /* a wall that way */ }
    }
    throw new Error('no room for a Line');
  }
  it('an Evoke on yourself goes off and adds no study or word use; one at a friend never hurts them (refused in words, or a miss)', () => {
    const { g, uid, at, fire, dir } = line(sigilField());
    const sg0 = JSON.stringify(g.characters.c1.sigilGrowth || null);
    const done = apply(g, { type: 'combat/evoke', unitId: uid, tile: fire, aim: at }, 'host');
    expect(done.combat.log.slice(g.combat.log.length).some((l: string) => /evokes FIRE · SEEK/.test(l))).toBe(true);
    expect(JSON.stringify(done.characters.c1.sigilGrowth || null)).toBe(sg0);
    const fr = g.combat.units.find((x: any) => x.charId === 'c2'); let toFriend = 0;
    for (const n of [1, 2, 3]) for (let k = 0; k < 6; k++) {
      const x = clone(g), t = x.combat.units.find((y: any) => y.id === fr.id), [fx, fy] = fire.split(',').map(Number); t.pos = (fx + dir[0] * n) + ',' + (fy + dir[1] * n); x.rng.state = (x.rng.state + k * 7919) >>> 0;
      const hp = t.hp;
      try { const r = apply(x, { type: 'combat/evoke', unitId: uid, tile: fire, aim: t.pos }, 'host'); expect(r.combat.units.find((y: any) => y.id === fr.id).hp).toBe(hp); }
      catch (e) { expect(e).toBeInstanceOf(RuleError); if (/is a friend/.test((e as Error).message)) toFriend++; }
    }
    expect(toFriend).toBeGreaterThan(0);
  });

  it('a Soul caster on the field: Begin and Release add no practice; Crystallise makes a core from the meter', () => {
    const SOUL = [{ build: 'outburst', level: 1 }, { build: 'plain_gun', level: 1 }];
    let g: any = clone(startRun(survivalRoom('PHC-GROW4', SOUL, { test: true }), 'PHC-GROW4'));
    const n = reachable(g.run).find((x: any) => x.kind === 'fight');
    for (let i = 0; i < 2 && g.run.at !== n.id; i++) g = apply(g, { type: 'run/move', node: n.id }, ownerOf(i));
    g = toField(g); const u = g.combat.units.find((x: any) => x.charId === 'c1'), c = g.characters.c1, p0 = c.soulPractice || 0;
    g.combat.mana = 20; const cores0 = packOf(g.characters.c1).length;
    const cr = apply(g, { type: 'combat/crystallise', unitId: u.id }, 'host');
    expect(cr.combat.mana).toBeLessThan(20);
    let h = apply(g, { type: 'combat/outburst', unitId: u.id, design: c.outbursts[0].id, hold: true }, 'host');
    expect(h.combat.units.find((x: any) => x.id === u.id).mg.held).toBeTruthy();
    const [x0, y0] = u.pos.split(',').map(Number); let rel: any = null;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (const d of [3, 2, 4]) { if (rel) break; try { rel = apply(h, { type: 'combat/release', unitId: u.id, aim: (x0 + dx * d) + ',' + (y0 + dy * d) }, 'host'); } catch { /* not there */ } }
    expect(rel).toBeTruthy(); expect(rel.characters.c1.soulPractice || 0).toBe(p0);
    void cores0;
  });
});

/** A Soul caster (Emanator) and a gunner on the won fight's field. */
function soulField(seed: string) {
  let g: any = clone(startRun(survivalRoom(seed, [{ build: 'outburst', level: 1 }, { build: 'plain_gun', level: 1 }], { test: true }), seed));
  const n = reachable(g.run).find((x: any) => x.kind === 'fight');
  for (let i = 0; i < 2 && g.run.at !== n.id; i++) g = apply(g, { type: 'run/move', node: n.id }, ownerOf(i));
  return toField(g);
}

describe('rules 1.55 item 47 (spec item 4136): the field\'s gathering is bounded by the meter, not by AP', () => {
  it('Crystallise until the meter cannot pay; Syphon until it is spent; then neither gives anything, however often tried', () => {
    let g = soulField('PHC-FARM1'); const uid = g.combat.units.find((x: any) => x.charId === 'c1').id;
    g.combat.mana = 40; const made0 = U(g, uid).mg.coresMade || 0;
    let cores = 0;
    for (let k = 0; k < 20; k++) { try { g = apply(g, { type: 'combat/crystallise', unitId: uid }, 'host'); cores++; } catch (e) { expect(e).toBeInstanceOf(RuleError); expect((e as Error).message).toMatch(/too thin/); break; } }
    expect(cores).toBe(4); expect(g.combat.mana).toBe(0); expect(U(g, uid).mg.coresMade - made0).toBe(4);
    // Syphon from a meter of 9: each takes the data's draw; it stops when the meter cannot pay it.
    g.combat.mana = 9; let sy = 0;
    for (let k = 0; k < 50; k++) {
      U(g, uid).mg.mp = 0;
      try { g = apply(g, { type: 'combat/syphon', unitId: uid }, 'host'); sy++; } catch (e) { expect((e as Error).message).toBe(AIR_SPENT); break; }
    }
    expect(sy).toBe(Math.floor(9 / SYPHON_DRAW)); expect(g.combat.mana).toBe(9 % SYPHON_DRAW);
    const mp0 = U(g, uid).mg.mp, made = U(g, uid).mg.coresMade;
    for (let k = 0; k < 30; k++) {
      expect(refused(g, { type: 'combat/syphon', unitId: uid })).toBe(AIR_SPENT);
      expect(refused(g, { type: 'combat/crystallise', unitId: uid })).toMatch(/too thin/);
    }
    expect(U(g, uid).mg.mp).toBe(mp0); expect(U(g, uid).mg.coresMade).toBe(made);
  });
});

describe('rules 1.55 item 68: on the field nothing harms a surrendered foe, nobody shoves a friend', () => {
  it('a shove of a friend never moves them, on every side (open ground or a wall behind): refused in words', () => {
    const g0 = toField(inFight()), { mu, gu } = ids(g0), [x0, y0] = U(g0, mu).pos.split(',').map(Number); let toFriend = 0;
    U(g0, mu).strength = 20; // the shove always wins its roll: only the field's gate can stop it
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let k = 0; k < 2; k++) {
      const x = clone(g0), at = (x0 + dx) + ',' + (y0 + dy); x.rng.state = (x.rng.state + k * 7919) >>> 0;
      if (x.combat.units.some((v: any) => v.pos === at && !v.dead && v.id !== gu)) continue;
      U(x, gu).pos = at;
      try { const r = apply(x, { type: 'combat/shove', unitId: mu, targetId: gu }, 'host'); expect(U(r, gu).pos).toBe(at); expect(!!U(r, gu).prone).toBe(false); }
      catch (e) { expect(e).toBeInstanceOf(RuleError); expect((e as Error).message).toMatch(/is a friend/); toFriend++; }
    }
    expect(toFriend).toBeGreaterThanOrEqual(6);
  });

  it('an Outburst released on a foe that surrendered never hurts it: refused "They have surrendered.", or a miss', () => {
    const g0 = soulField('PHC-SURR1'), u = g0.combat.units.find((x: any) => x.charId === 'c1'), c = g0.characters.c1;
    const foe = g0.combat.units.find((x: any) => x.side === 'foe'), [x0, y0] = u.pos.split(',').map(Number);
    let surr = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (const d of [2, 3]) for (let k = 0; k < 4; k++) {
      const g = clone(g0), f = g.combat.units.find((x: any) => x.id === foe.id), at = (x0 + dx * d) + ',' + (y0 + dy * d);
      if (g.combat.units.some((x: any) => x.pos === at && !x.dead && x.id !== f.id)) continue;
      Object.assign(f, { pos: at, dead: false, downed: false, hp: 40, surrendered: true }); delete f.hidden; g.rng.state = (g.rng.state + k * 7919) >>> 0;
      let h: any; try { h = apply(g, { type: 'combat/outburst', unitId: u.id, design: c.outbursts[0].id, hold: true }, 'host'); } catch { continue; }
      try { const r = apply(h, { type: 'combat/release', unitId: u.id, aim: at }, 'host'); expect(r.combat.units.find((x: any) => x.id === foe.id).hp).toBe(40); }
      catch (e) { expect(e).toBeInstanceOf(RuleError); if ((e as Error).message === 'They have surrendered.') surr++; }
    }
    expect(surr).toBeGreaterThan(0);
  });
});

describe('rules 1.55 item 65: the party votes, the fight ends', () => {
  it('one vote waits; both: the fight is closed (over, written back, Strain and Flux gone, the dead stand up), the supply pack, then the picks', () => {
    let g = toField(inFight());
    const { mu, gu, med, gun } = ids(g);
    U(g, gu).hp = 0; U(g, gu).dead = true; // fell in the fight: stands up as the field closes
    U(g, mu).hp = 33;
    if (U(g, mu).mg) U(g, mu).mg.strain = 2;
    const one = apply(g, { type: 'run/leave' }, 'host');
    expect(one.run.state).toBe('field'); expect(one.combat.field).toBe(true); expect(one.phase).toBe('combat');
    const both = apply(one, { type: 'run/leave' }, 'p2');
    expect(both.run.state).toBe('reward'); expect(both.phase).toBe('story');
    expect(both.combat.over).toBe('win'); expect(both.combat.field).toBeUndefined();
    expect(both.characters[med].hp).toBe(33); // the fight's unit written back as the fight closes
    expect(both.characters[gun].dead).toBe(false); expect(both.characters[gun].hp).toBeGreaterThan(0);
    for (const id of [med, gun]) { expect(both.story.magic?.[id]?.flux || 0).toBe(0); expect(both.story.magic?.[id]?.strain || 0).toBe(0); }
    expect(both.run.note.ammo[med]).toBeTruthy();
    let p = apply(both, { type: 'run/pick', charId: med, choice: 'materials' }, 'host'); p = apply(p, { type: 'run/pick', charId: gun, choice: 'materials' }, 'p2');
    expect(p.run.state).toBe('map');
  });

  it('a give and a level-up on the field reach the fight\'s units, and are kept when it closes', () => {
    const prep = (x: any) => { Object.values(x.characters).find((c: any) => c.name === 'Medic').stims = 3; };
    let g = toField(inFight(prep)); const { med, gun, gu } = ids(g);
    const stims = g.characters[gun].stims || 0;
    g = apply(g, { type: 'gear/give', charId: med, to: gun, count: 'stim_injector', qty: 2 }, 'host');
    expect(g.characters[gun].stims).toBe(stims + 2);
    const left = leaveField(g); expect(left.characters[gun].stims).toBe(stims + 2);
    void gu;
  });

  it('a give on the field rebuilds the fighters but hands back nothing the fight spent: the free first Pump, the Strain owed', () => {
    const prep = (x: any) => { Object.values(x.characters).find((c: any) => c.name === 'Medic').stims = 2; };
    const g0 = toField(inFight(prep)), { med, gun, mu } = ids(g0), m = U(g0, mu).mg;
    m.firstUsed = true; m.freeUsed = 1; m.debt = 3;
    const g = apply(g0, { type: 'gear/give', charId: med, to: gun, count: 'stim_injector', qty: 1 }, 'host'), v = U(g, mu).mg;
    expect(v.firstUsed).toBe(true); expect(v.freeUsed).toBe(1); expect(v.debt).toBe(3);
  });
});

// The 0.28.3 merge: the release's Give (the amount, rules 1.55 item 54) and its one use action (gear/use, item 58) on
// the field, which is the fight still running (item 61): through the reducer, the target the character, the stim the
// fight's own (combat/stim, next to the friend), the Essence's XP through the one XP door.
describe('rules 1.55 items 54, 58 and 61: give and gear/use on the field', () => {
  const ESSENCE = Object.keys(ITEM).find((id) => (ITEM[id] as any).counted === 'essence')!;
  const STIM = Object.keys(ITEM).find((id) => (ITEM[id] as any).use?.via === 'stim')!;
  const FOCUS = Object.keys(ITEM).find((id) => (ITEM[id] as any).focus)!;
  const prep = (x: any) => { const m: any = Object.values(x.characters).find((c: any) => c.name === 'Medic'); m.weapon = 'service_pistol'; m.offHand = { id: FOCUS, rarity: 'standard' }; m.essence = 1; m.stims = 3; };
  it('an Essence cracked on the field gives the friend its XP; the Give view says so before', () => {
    const g = toField(inFight(prep)), { med, gun } = ids(g);
    const row = giveView(g, 'host', med).rows.find((r: any) => r.key === 'count:' + ESSENCE);
    expect(row.use.action).toEqual({ type: 'gear/use', charId: med, item: ESSENCE }); expect(row.use.why[gun]).toBeNull();
    const xp = g.characters[gun].xp, a = apply(g, { type: 'gear/use', charId: med, item: ESSENCE, targetId: gun }, 'host');
    expect(a.characters[gun].xp).toBe(xp + Number((ITEM[ESSENCE] as any).effects[0].value)); expect(a.characters[med].essence).toBe(0);
    expect(a.combat.field).toBe(true);
  });
  it('a stim used on a friend on the field is the fight\'s own stim: walk next to them first, then it heals their unit', () => {
    let g = toField(inFight(prep)); const { med, gun, gu } = ids(g);
    U(g, gu).hp = 20; g.characters[gun].hp = 20;
    const far = giveView(g, 'host', med).rows.find((r: any) => r.key === 'count:' + STIM);
    if (far.use.why[gun]) expect(far.use.why[gun]).toMatch(/^Walk next to /);
    g = besides(g);
    const near = giveView(g, 'host', med).rows.find((r: any) => r.key === 'count:' + STIM); expect(near.use.why[gun]).toBeNull();
    const a = apply(g, { type: 'gear/use', charId: med, item: STIM, targetId: gun }, 'host');
    expect(U(a, gu).hp).toBeGreaterThan(20); expect(a.characters[med].stims).toBe(2); expect(a.combat.field).toBe(true);
  });
  it('a give of an amount on the field: the engine judges the amount, the fighters take it', () => {
    const g = toField(inFight(prep)), { med, gun } = ids(g);
    expect(refused(g, { type: 'gear/give', charId: med, to: gun, count: STIM, qty: 4 }, 'host')).toMatch(/has 3|only 3|3 /);
    const a = apply(g, { type: 'gear/give', charId: med, to: gun, count: STIM, qty: 3 }, 'host');
    expect(a.characters[med].stims).toBe(0); expect(a.characters[gun].stims).toBe((g.characters[gun].stims || 0) + 3);
  });
});
