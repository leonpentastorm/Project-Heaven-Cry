// The completeness pass, batch 3 (items 27-39): the story and area-map sides the earlier tests left out, through the
// reducer (apply). Silent Partner's one roll for both and the partner's attack; Before the Blink after a hidden ambush
// opened from the area map; Never There's −4 on a real Overwatch shot; Overhaul and the Field Repair text; Verse of War
// and Twin Discipline on the area map (a release or fused cast at a token opens the fight); Dead Signal's silence;
// Charge! on a world move; The Old Blood's half-power Blessings; Machine-Faced's Heart save; The Brightest Light's
// area-map wear and the Crashed saves and initiative; Ghost Soldier's settlement rest and the prosthetic arm's mods;
// the drone as a token on the area map.
import { describe, expect, it } from 'vitest';
import {
  npcsOf, positionsOf, standable, zoneMap, storyObjects, refOf, apLeft, d20, makeObject, SKILL, PATRONS, initiativeBonus, saveBonus,
  storyCb, briefOf, holdersOf, companionId, DRONE_ROUND_AP,
  type GameState, type Combat, type Unit,
} from '../src';
import { fightWith, storyWith, withGame } from './helpers/perkfight';

const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
const storyHas = (g: GameState, re: RegExp) => g.story.entries.some((e: any) => re.test((e.head || '') + ' ' + (e.text || '')));
const rulingHas = (g: GameState, re: RegExp) => (g.story.rulings || []).some((r) => re.test(r.text));
const hiddenChecks = (g: GameState) => g.story.entries.filter((e: any) => /STAY HIDDEN/.test(e.head || ''));
function seedFor(...ns: number[]): number { for (let s = 1; s < 2000000; s++) { const r = { state: s }; if (ns.every((n) => d20(r) === n)) return s; } throw new Error('no seed'); }
const cheb = (a: string, b: string) => Math.max(Math.abs(+a.split(',')[0] - +b.split(',')[0]), Math.abs(+a.split(',')[1] - +b.split(',')[1]));
function freeAt(g: GameState, near: string, d: number, also: (k: string) => boolean = () => true): string {
  const [x, y] = near.split(',').map(Number), map = zoneMap(g), taken = new Set([...Object.values(positionsOf(g)), ...npcsOf(g).map((n) => n.pos), ...storyObjects(g).map((o) => o.pos)]);
  for (let i = -d; i <= d; i++) for (let j = -d; j <= d; j++) { if (Math.max(Math.abs(i), Math.abs(j)) !== d) continue; const k = (x + i) + ',' + (y + j); if (standable(map, k) && !taken.has(k) && also(k)) return k; }
  throw new Error('no free tile');
}
function place(s: any, at: string, o: any = {}) {
  s.act({ type: 'narrator/turn', turn: { narration: 'Someone.', npcs: [{ action: 'place', name: o.name || 'Guard', side: o.side || 'hostile', tier: o.tier || 'minion', weapon: o.weapon || 'service_pistol', at: refOf(at) }] } } as any);
  return npcsOf(s.g)[npcsOf(s.g).length - 1];
}
/** Face an NPC token away from a tile (so an ambush from there needs no stay-hidden roll). */
function faceAway(g: GameState, id: string, from: string) {
  const t = npcsOf(g).find((x) => x.id === id)!; t.facing = [Math.sign(+t.pos.split(',')[0] - +from.split(',')[0]) || 1, Math.sign(+t.pos.split(',')[1] - +from.split(',')[1])] as any;
}
const lastHead = (g: GameState, charId: string) => [...g.story.entries].reverse().find((e: any) => e.charId === charId && /STAY HIDDEN/.test(e.head || '')) as any;
const modIn = (head: string) => { const m = /d20 \d+ ([+−])(\d+)/.exec(head)!; return (m[1] === '+' ? 1 : -1) * +m[2]; };

// ---------------------------------------------------------------------------------------------------------------------
describe('Silent Partner on the area map (item 27)', () => {
  const pair = (perk: boolean) => {
    const s = storyWith([{ perks: perk ? ['silent_partner'] : [] }, {}]); const [a, b] = s.chars;
    s.g.characters[a.id].skills.ingenuity = 10; s.g.characters[b.id].skills.ingenuity = 0;
    const at = positionsOf(s.g)[a.id]; s.g.story.positions![b.id] = freeAt(s.g, at, 1);
    // Where the partner steps (still next to the holder), with a boss standing right next to that tile.
    const dest = freeAt(s.g, at, 1), npcAt = freeAt(s.g, dest, 1, (k) => cheb(k, at) >= 2);
    const n = place(s, npcAt, { tier: 'boss', name: 'Warden' });
    s.g.story.sneak = { [a.id]: true, [b.id]: true }; s.g.story.hidden = { [a.id]: true, [b.id]: true };
    return { s, a, b, at, dest, n };
  };
  it('the partner stepping up to a guard rolls with the holder\'s Ingenuity; without the perk, their own', () => {
    for (const perk of [true, false]) {
      const { s, b, dest } = pair(perk); s.g.rng.state = seedFor(15);
      s.act({ type: 'world/act', charId: b.id, act: 'move', to: dest, how: 'sneak' } as any);
      const h = lastHead(s.g, b.id); expect(h).toBeTruthy();
      expect(modIn(h.head)).toBe(perk ? 9 : -2);
    }
  });
  it('one roll for both: a failure finds the holder too; a success spares the holder its own roll this round', () => {
    const f = pair(true); f.s.g.rng.state = seedFor(1);
    f.s.act({ type: 'world/act', charId: f.b.id, act: 'move', to: f.dest, how: 'sneak' } as any);
    expect(f.s.g.story.hidden![f.b.id]).toBe(false); expect(f.s.g.story.hidden![f.a.id]).toBe(false);
    expect(storyHas(f.s.g, /spots .* too \(Silent Partner: one roll for both\)/)).toBe(true);
    const ok = pair(true); ok.s.g.rng.state = seedFor(15); const n0 = hiddenChecks(ok.s.g).length; // placing the guard may have rolled already (last round)
    ok.s.act({ type: 'world/act', charId: ok.b.id, act: 'move', to: ok.dest, how: 'sneak' } as any);
    expect(hiddenChecks(ok.s.g).length).toBe(n0 + 1);
    // The holder steps right next to the same guard: no second roll against it this round.
    const k = freeAt(ok.s.g, npcsOf(ok.s.g).find((x) => x.id === ok.n.id)!.pos, 1, (t) => cheb(t, positionsOf(ok.s.g)[ok.a.id]) <= 2);
    ok.s.act({ type: 'world/act', charId: ok.a.id, act: 'move', to: k, how: 'sneak' } as any);
    expect(hiddenChecks(ok.s.g).length).toBe(n0 + 1);
    expect(ok.s.g.story.hidden![ok.a.id]).toBe(true);
    // The pair split up (the holder walked off): the partner lost the shared stealth.
    expect(ok.s.g.story.hidden![ok.b.id]).toBe(cheb(positionsOf(ok.s.g)[ok.a.id], positionsOf(ok.s.g)[ok.b.id]) <= 1);
  });
  it('a partner who attacks (a shot that opens no fight) loses the shared stealth, and the holder\'s next move doesn\'t give it back', () => {
    const s = storyWith([{ perks: ['silent_partner'] }, {}]); const [a, b] = s.chars;
    const at = positionsOf(s.g)[a.id]; s.g.story.positions![b.id] = freeAt(s.g, at, 1);
    s.g.story.sneak = { [a.id]: true, [b.id]: true }; s.g.story.hidden = { [a.id]: true, [b.id]: true };
    s.act({ type: 'world/act', charId: a.id, act: 'move', to: freeAt(s.g, at, 1, (k) => cheb(k, positionsOf(s.g)[b.id]) <= 1), how: 'sneak' } as any);
    expect(s.g.story.hidden![b.id]).toBe(true);
    const lampAt = freeAt(s.g, positionsOf(s.g)[b.id], 2); s.g.story.objects = [...storyObjects(s.g), makeObject('lamp9', 'lamp', lampAt)];
    s.act({ type: 'world/act', charId: b.id, act: 'attack', objId: 'lamp9', mode: 'melee' } as any);
    expect(s.g.story.hidden![b.id]).toBe(false); expect(storyHas(s.g, /attacks and is seen: the shared stealth is gone/)).toBe(true);
    s.act({ type: 'world/act', charId: a.id, act: 'move', to: freeAt(s.g, positionsOf(s.g)[a.id], 1, (k) => cheb(k, positionsOf(s.g)[b.id]) <= 1), how: 'sneak' } as any);
    expect(s.g.story.hidden![b.id]).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('Before the Blink after a hidden ambush from the area map (item 28)', () => {
  it('the ambusher keeps the first turn; the holder (not the attacker) goes next, ahead of everyone else', () => {
    const s = storyWith([{ weapon: 'combat_knife' }, { perks: { before_the_blink: 'mastered' } }, {}]); const [a, b] = s.chars;
    const here = positionsOf(s.g)[a.id], n = place(s, freeAt(s.g, here, 1), { name: 'Sentry', tier: 'boss' });
    faceAway(s.g, n.id, here);
    s.g.story.sneak = { [a.id]: true }; s.g.story.hidden = { [a.id]: true };
    s.act({ type: 'world/act', charId: a.id, act: 'attack', targetId: n.id, mode: 'melee' } as any);
    expect(s.g.phase).toBe('combat');
    const order = s.g.combat!.order; expect(order[0]).toBe('pc-' + a.id); expect(order[1]).toBe('pc-' + b.id);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('Never There against a real Overwatch shot (item 29)', () => {
  // The same shot (the same tiles) at a holder's second move and at a plain mover's first: the holder's is 4 lower.
  const shot = (perk: boolean) => {
    const f = fightWith([perk ? { perks: { never_there: 'mastered' } } : {}], [{ at: 'O10', weapon: 'hellraiser_service_rifle' }]);
    const u = f.pc, foe = f.foe; u.pos = perk ? '2,2' : '3,3'; foe.pos = '10,3'; foe.overwatch = 'shot' as any; foe.ap = 6;
    f.turn(u);
    if (perk) { f.act({ type: 'combat/move', unitId: u.id, to: '3,3' }); expect(f.unit(foe.id).overwatch).toBeTruthy(); } // the first move draws nothing
    f.act({ type: 'combat/move', unitId: u.id, to: '4,3' });
    const line = f.cb.log.find((l) => /fires at/.test(l) && l.startsWith(f.foe.name))!; expect(line).toBeTruthy();
    const m = /d20 \d+ ([+−])(\d+)/.exec(line)!; return (m[1] === '+' ? 1 : -1) * +m[2];
  };
  it('the second move\'s Overwatch is at −4', () => { expect(shot(true)).toBe(shot(false) - 4); });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('Overhaul on the area map; the Field Repair text (item 30)', () => {
  it('the data says what the spec says: 10% + 5% per Improvisation point above 3 of Durability, no HP per point', () => {
    const t = (SKILL as any).proficiency.unlocks['3'].text as string;
    expect(t).toMatch(/10% \+ 5% per Improvisation point above 3/); expect(t).not.toMatch(/HP per point/);
  });
  it('world/act repair: 1 AP and twice the durability; without Overhaul 2 AP and the plain amount', () => {
    const run = (perk: boolean) => {
      const s = storyWith([{ perks: perk ? { overhaul: 'mastered' } : {}, kit: 'medic', skills: { proficiency: 10 } }]); const c = s.chars[0];
      s.g.characters[c.id].weaponState = { ...(s.g.characters[c.id].weaponState || {}), dur: 0 };
      s.act({ type: 'world/act', charId: c.id, act: 'repair' } as any);
      return { ap: apLeft(s.g, s.g.characters[c.id]), dur: s.g.characters[c.id].weaponState!.dur! };
    };
    const plain = run(false), over = run(true);
    expect(plain.ap).toBe(4); expect(over.ap).toBe(5);
    expect(over.dur).toBeGreaterThan(plain.dur); expect(Math.abs(over.dur - 2 * plain.dur)).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
const soulStory = (perks: Record<string, string>, extra: any = {}) => {
  const s = storyWith([{ perks, archetype: 'stormcaller', kit: 'soul', ...extra }]); const c = s.chars[0];
  const ch = s.g.characters[c.id]; ch.mp = 500; return { s, c };
};
const fullAp = (s: any, id: string) => { s.g.story.ap = { ...(s.g.story.ap || {}), [id]: 9 }; };
describe('Verse of War on the area map (item 31)', () => {
  it('Release in verse at a token after this round\'s Say opens the fight; the line goes into the fight\'s notes', () => {
    const { s, c } = soulStory({ verse_of_war: 'achieved' }); const ch = s.g.characters[c.id], d = ch.outbursts![0];
    s.act({ type: 'world/act', charId: c.id, act: 'outburst', design: d.id, hold: true } as any);
    expect(s.g.story.magic?.[c.id]?.held).toBeTruthy();
    const n = place(s, freeAt(s.g, positionsOf(s.g)[c.id], 2), { name: 'Raider' });
    place(s, freeAt(s.g, positionsOf(s.g)[c.id], 7), { name: 'Watcher', weapon: 'fists' }); // a second hostile keeps the fight open
    // Without the Say, refused.
    fullAp(s, c.id);
    expect(() => s.act({ type: 'world/act', charId: c.id, act: 'perk', id: 'verse_of_war', actionId: 'release', tile: n.pos } as any)).toThrow(/Say your verse/);
    s.act({ type: 'story/speak', text: 'Burn, little star, and take them with you.' } as any);
    fullAp(s, c.id); s.g.rng.state = seedFor(15, 15, 15);
    s.act({ type: 'world/act', charId: c.id, act: 'perk', id: 'verse_of_war', actionId: 'release', tile: n.pos } as any);
    expect(s.g.phase).toBe('combat');
    expect((s.g.combat!.notes || []).some((l) => /in verse: "Burn, little star/.test(l))).toBe(true);
  });
  it('a verse release that touches nobody stays on the area map and the line is a ruling to audit', () => {
    const { s, c } = soulStory({ verse_of_war: 'achieved' }); const d = s.g.characters[c.id].outbursts![0];
    s.act({ type: 'world/act', charId: c.id, act: 'outburst', design: d.id, hold: true } as any);
    s.act({ type: 'story/speak', text: 'Iron sings where no one listens.' } as any);
    fullAp(s, c.id);
    s.act({ type: 'world/act', charId: c.id, act: 'perk', id: 'verse_of_war', actionId: 'release', tile: freeAt(s.g, positionsOf(s.g)[c.id], 2) } as any);
    expect(s.g.phase).toBe('story');
    expect(rulingHas(s.g, /in verse: "Iron sings/)).toBe(true);
  });
});

// Twin Discipline on the area map (item 32): the fused Line on the area map is tested in sigil14-perks.test.ts
// ("Twin Discipline on the area map"; rules 1.4). The placeholder test that stood here could not fail (truth pass 3).

// ---------------------------------------------------------------------------------------------------------------------
describe('Dead Signal on the area map: silent (item 33)', () => {
  it('with a guard right next to you, the act draws no stay-hidden roll; a plain step there does; not sneaking, refused', () => {
    const setup = () => {
      const s = storyWith([{ perks: ['dead_signal'] }]); const c = s.chars[0], at = positionsOf(s.g)[c.id];
      place(s, freeAt(s.g, at, 1), { tier: 'boss' });
      const k = freeAt(s.g, at, 2); s.g.story.objects = [...storyObjects(s.g), makeObject('cam1', 'camera', k)];
      s.g.story.sneak = { [c.id]: true }; s.g.story.hidden = { [c.id]: true }; return { s, c };
    };
    const { s, c } = setup();
    s.act({ type: 'world/act', charId: c.id, act: 'perk', id: 'dead_signal', actionId: 'disable_device', objId: 'cam1' } as any);
    expect(hiddenChecks(s.g).length).toBe(0); expect(apLeft(s.g, s.g.characters[c.id])).toBe(5);
    expect((storyObjects(s.g).find((o) => o.id === 'cam1') as any).disabled).toBe(true);
    // The same guard notices a plain act (a reload) at once.
    const t = setup(); t.s.act({ type: 'world/act', charId: t.c.id, act: 'prone' } as any);
    expect(hiddenChecks(t.s.g).length).toBe(1);
    const u = setup(); u.s.g.story.sneak = {}; u.s.g.story.hidden = {};
    expect(() => u.s.act({ type: 'world/act', charId: u.c.id, act: 'perk', id: 'dead_signal', actionId: 'disable_device', objId: 'cam1' } as any)).toThrow(/sneaking/);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('Charge! on a world move (item 34)', () => {
  it('a straight 3+ tile move ending next to a hostile token costs up to 3 AP less; a bent or short one pays in full', () => {
    const run = (perk: boolean, bend: boolean) => {
      const s = storyWith([{ perks: perk ? ['charge'] : [] }]); const c = s.chars[0], map = zoneMap(s.g);
      // Find a row with 6 open tiles in a line; start on the first, the token on the sixth.
      let start = '';
      for (let y = 1; y < map.h - 1 && !start; y++) for (let x = 0; x + 5 < map.w && !start; x++) {
        const ks = [0, 1, 2, 3, 4, 5].map((i) => (x + i) + ',' + y); if (ks.every((k) => standable(map, k) && ![...((map as any).cover || []), ...((map as any).full || []), ...((map as any).difficult || [])].includes(k) && !storyObjects(s.g).some((o) => o.pos === k) && !npcsOf(s.g).some((n) => n.pos === k) && !Object.values(positionsOf(s.g)).includes(k)) && standable(map, (x + 1) + ',' + (y - 1)) && !storyObjects(s.g).some((o) => o.pos === (x + 1) + ',' + (y - 1))) start = ks[0];
      }
      const [x, y] = start.split(',').map(Number);
      place(s, (x + 5) + ',' + y, { name: 'Raider', weapon: 'fists' }); s.g.story.positions![c.id] = start;
      // Bent: a step up first, then the rest (two moves, neither straight for 3+ tiles to the token).
      if (bend) { s.act({ type: 'world/act', charId: c.id, act: 'move', to: (x + 1) + ',' + (y - 1), how: 'move' } as any); }
      s.act({ type: 'world/act', charId: c.id, act: 'move', to: (x + 4) + ',' + y, how: 'move' } as any);
      return { ap: apLeft(s.g, s.g.characters[c.id]), s };
    };
    const plain = run(false, false), charged = run(true, false), bent = run(true, true), bentPlain = run(false, true);
    expect(charged.ap).toBeGreaterThan(plain.ap); expect(charged.ap - plain.ap).toBeLessThanOrEqual(3);
    expect(storyHas(charged.s.g, /charges Raider \(Charge!/)).toBe(true);
    expect(bent.ap).toBe(bentPlain.ap);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('The Old Blood: Blessings from another race (item 35)', () => {
  it('a heal Blessing prayed by a squadmate of another race lands at half power; one of the same race in full', () => {
    const run = (race: string | undefined) => {
      const f = fightWith([{ traits: ['the_old_blood'] }, { name: 'Priest', skills: { faith: 7 } }], [{ at: 'O10' }]);
      const [h, p] = f.pcs, pc = f.g.characters[p.charId!], nk = PATRONS.find((x: any) => x.id === 'nerukhan');
      pc.patron = nk.id; pc.race = race; h.pos = '3,3'; p.pos = '3,4';
      f.unit(h.id).hp = 10; f.turn(p); f.g.rng.state = seedFor(20);
      f.act({ type: 'combat/pray', unitId: p.id, choice: 'absolution', targetId: h.id } as any);
      return { hp: f.unit(h.id).hp, f };
    };
    const same = run(undefined), other = run('lapin');
    expect(same.hp).toBeGreaterThan(10); expect(other.hp).toBeGreaterThan(10);
    expect(other.hp - 10).toBeLessThan(same.hp - 10);
    expect(Math.abs((other.hp - 10) * 2 - (same.hp - 10))).toBeLessThanOrEqual(2);
    expect(logHas(other.f.cb, /Blessing badly \(The Old Blood\): half power/)).toBe(true);
  });
  it('the Narrator brief carries the story half (heals and Blessings from another race)', () => {
    const s = storyWith([{ traits: ['the_old_blood'] }]); const c = s.g.characters[s.chars[0].id];
    const h = holdersOf({ c }).find((x) => x.key === 'trait:the_old_blood')!; expect(briefOf(h)).toMatch(/Blessings from another race at half/);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('Machine-Faced: the Heart save in dialogue (item 36)', () => {
  const check = (s: any, charId: string, tags: string[], die: number) => {
    s.act({ type: 'narrator/turn', turn: { narration: 'They lean in.', checks: [{ charId, skills: ['composure'], tn: 16, stakes: 'Hold your face', tags, kind: 'save', family: 'heart' }] } } as any);
    s.g.rng.state = seedFor(die); const ck = s.g.checks[s.g.checks.length - 1]; if (!ck.done && !ck.roll) s.act({ type: 'check/roll', checkId: ck.id });
    return s.g.checks.find((k: any) => k.id === ck.id)!;
  };
  it('in dialogue it passes with no roll (even on a 1); outside dialogue it rolls as usual; without the trait it rolls', () => {
    const s = storyWith([{ traits: ['machine_faced'] }]); const c = s.chars[0];
    expect(check(s, c.id, ['dialogue'], 1).roll!.ok).toBe(true);
    expect(check(s, c.id, [], 1).roll!.ok).toBe(false);
    const p = storyWith([{}]); expect(check(p, p.chars[0].id, ['dialogue'], 1).roll!.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('The Brightest Light: area-map wear, and Crashed saves and initiative (item 37)', () => {
  it('a strike at an object on the area map wears the weapon twice as fast', () => {
    const run = (trait: boolean) => {
      const s = storyWith([{ traits: trait ? ['the_brightest_light'] : [], weapon: 'combat_knife' }]); const c = s.chars[0];
      const k = freeAt(s.g, positionsOf(s.g)[c.id], 1); s.g.story.objects = [...storyObjects(s.g), makeObject('lamp7', 'lamp', k)];
      const ch = s.g.characters[c.id]; ch.weaponState = { ...(ch.weaponState || {}), dur: 50 };
      s.act({ type: 'world/act', charId: c.id, act: 'attack', objId: 'lamp7', mode: 'melee' } as any);
      return 50 - (s.g.characters[c.id].weaponState!.dur ?? 50);
    };
    const plain = run(false), bl = run(true);
    expect(plain).toBeGreaterThan(0); expect(bl).toBe(2 * plain);
  });
  it('Crashed: −2 on initiative and on all three saves in a later fight; a rest clears it', () => {
    const s = storyWith([{ traits: ['the_brightest_light'] }]); const c = s.chars[0];
    const base = withGame(s.g, () => { const ch = s.g.characters[c.id]; return { i: initiativeBonus(ch), b: saveBonus(ch, 'body'), r: saveBonus(ch, 'brain'), h: saveBonus(ch, 'heart') }; });
    s.g.characters[c.id].state = { ...(s.g.characters[c.id].state || {}), crashed: true };
    const crashed = withGame(s.g, () => { const ch = s.g.characters[c.id]; return { i: initiativeBonus(ch), b: saveBonus(ch, 'body'), r: saveBonus(ch, 'brain'), h: saveBonus(ch, 'heart') }; });
    expect(crashed).toEqual({ i: base.i - 2, b: base.b - 2, r: base.r - 2, h: base.h - 2 });
    // A rest clears it (and the numbers come back).
    s.act({ type: 'rest', kind: 'short' } as any);
    expect(s.g.characters[c.id].state?.crashed).toBeFalsy();
    expect(withGame(s.g, () => initiativeBonus(s.g.characters[c.id]))).toBe(base.i);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('Ghost Soldier: the settlement rest and the prosthetic arm (item 38)', () => {
  it('a long rest in a settlement takes Vigilant vs 12: a failure means no rest benefit for them', () => {
    const run = (die: number) => {
      const s = storyWith([{ traits: ['ghost_soldier'] }, {}]); const [a, b] = s.chars;
      s.g.characters[a.id].skills.vigilant = 0; s.g.characters[a.id].hp = 20; s.g.characters[b.id].hp = 20;
      s.g.rng.state = seedFor(die);
      s.act({ type: 'narrator/turn', turn: { narration: 'The inn.', rest: { kind: 'long', settlement: true } } } as any);
      return { s, a: s.g.characters[a.id], b: s.g.characters[b.id] };
    };
    const bad = run(2); expect(bad.a.hp).toBe(20); expect(bad.b.hp).toBeGreaterThan(20);
    expect(storyHas(bad.s.g, /watching the doors: no rest benefit/)).toBe(true);
    const good = run(19); expect(good.a.hp).toBeGreaterThan(20);
  });
  it('the arm takes up to 2 mods with Proficiency 3 (out of a fight); the brief names them for the Narrator', () => {
    const s = storyWith([{ traits: ['ghost_soldier'], skills: { proficiency: 3 } }]); const c = s.chars[0];
    const ch = s.g.characters[c.id];
    ch.pack = [...(ch.pack || []), { id: 'prosthetic_arm', item: 'prosthetic_arm', name: 'Prosthetic arm', qty: 1, kind: 'tool' } as any,
      { id: 'mod_scope', item: 'mod_scope', name: 'Scope', qty: 1, kind: 'tool' } as any, { id: 'mod_red_dot', item: 'mod_red_dot', name: 'Red dot', qty: 2, kind: 'tool' } as any];
    s.act({ type: 'story/perk', charId: c.id, id: 'ghost_soldier', actionId: 'fit_arm', choice: 'mod_scope' } as any);
    s.act({ type: 'story/perk', charId: c.id, id: 'ghost_soldier', actionId: 'fit_arm', choice: 'mod_red_dot' } as any);
    expect(s.g.characters[c.id].state!.arm_mods).toEqual(['mod_scope', 'mod_red_dot']);
    expect(() => s.act({ type: 'story/perk', charId: c.id, id: 'ghost_soldier', actionId: 'fit_arm', choice: 'mod_red_dot' } as any)).toThrow(/Both arm slots/);
    const h = holdersOf({ c: s.g.characters[c.id] }).find((x) => x.key === 'trait:ghost_soldier')!;
    expect(briefOf(h)).toMatch(/arm mods: .*Scope/);
    const low = storyWith([{ traits: ['ghost_soldier'], skills: { proficiency: 2 } }]); const lc = low.g.characters[low.chars[0].id];
    lc.pack = [...(lc.pack || []), { id: 'prosthetic_arm', item: 'prosthetic_arm', name: 'Prosthetic arm', qty: 1, kind: 'tool' } as any, { id: 'mod_scope', item: 'mod_scope', name: 'Scope', qty: 1, kind: 'tool' } as any];
    expect(() => low.act({ type: 'story/perk', charId: lc.id, id: 'ghost_soldier', actionId: 'fit_arm', choice: 'mod_scope' } as any)).toThrow(/Improvisation 3/);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('Drone Handler: the drone is a token on the area map (item 39)', () => {
  it('it stands next to its owner, moves on its own 3 AP a round (the owner\'s AP untouched), and starts the fight where it is', () => {
    const s = storyWith([{ traits: ['drone_handler'] }]); const c = s.chars[0];
    s.act({ type: 'narrator/turn', turn: { narration: 'On.', sceneTitle: 'Scene two' } } as any); // the drone joins at a scene change
    const ch = s.g.characters[c.id], comp = ch.companions!.find((k) => k.kind === 'drone')!, id = companionId(ch, comp);
    const pos = positionsOf(s.g); expect(pos[id]).toBeTruthy(); expect(cheb(pos[id], pos[c.id])).toBeLessThanOrEqual(3);
    expect(withGame(s.g, () => storyCb(s.g).units.some((u: Unit) => u.id === id && u.companion === 'drone' && u.ap === DRONE_ROUND_AP))).toBe(true);
    const to = freeAt(s.g, pos[id], 2);
    s.act({ type: 'world/act', charId: c.id, act: 'move', to, how: 'move', unit: id } as any);
    expect(positionsOf(s.g)[id]).toBe(to); expect(apLeft(s.g, s.g.characters[c.id])).toBe(6);
    expect(s.g.story.ap![id]).toBeLessThan(DRONE_ROUND_AP);
    expect(storyHas(s.g, /flies to/)).toBe(true);
    expect(() => s.act({ type: 'world/act', charId: c.id, act: 'move', to: freeAt(s.g, to, 6), how: 'move', unit: id } as any)).toThrow(/drone needs|no way/i);
    // The brief gives the Narrator where it is.
    const h = holdersOf({ c: s.g.characters[c.id] }).find((x) => x.key === 'trait:drone_handler')!;
    expect(withGame(s.g, () => briefOf({ ...h, g: s.g } as any))).toMatch(/drone at /);
    // A fight opened from the area map: the drone starts where its token stood.
    const n = place(s, freeAt(s.g, positionsOf(s.g)[c.id], 3), { name: 'Raider', tier: 'boss' });
    s.act({ type: 'world/act', charId: c.id, act: 'attack', targetId: n.id, mode: 'shot' } as any);
    expect(s.g.phase).toBe('combat'); expect(s.g.combat!.units.find((u) => u.id === id)!.pos).toBe(to);
  });
  it('a destroyed drone leaves the area map', () => {
    const s = storyWith([{ traits: ['drone_handler'] }]); const c = s.chars[0];
    s.act({ type: 'narrator/turn', turn: { narration: 'On.', sceneTitle: 'Scene two' } } as any);
    const ch = s.g.characters[c.id], comp = ch.companions!.find((k) => k.kind === 'drone')!, id = companionId(ch, comp);
    expect(positionsOf(s.g)[id]).toBeTruthy();
    comp.hp = 0; expect(positionsOf(s.g)[id]).toBeUndefined();
    expect(() => s.act({ type: 'world/act', charId: c.id, act: 'move', to: freeAt(s.g, positionsOf(s.g)[c.id], 2), how: 'move', unit: id } as any)).toThrow(/gone/);
  });
});
