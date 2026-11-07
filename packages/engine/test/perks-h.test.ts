// Lane H: identity, economy and upkeep traits (src/perks/h.ts). Each item is shown working in play: through the reducer
// (apply: narrator/turn, check/roll, story/perk, combat/perk) where an action or a Narrator field exists, else with the
// game bound and the engine's own functions (applyCond, applyDamage, resolveAttack, damageObject), the calls the
// reducer makes.
import { describe, expect, it } from 'vitest';
import {
  applyCond, applyDamage, resolveAttack, damageObject, condOn, d20, maxHp, holderOf, briefOf, passive, emit, unitSave, previewAttack,
  type Unit, type Combat, type GameState, type Character,
} from '../src';
import { fightWith, storyWith, withGame } from './helpers/perkfight';

type F = ReturnType<typeof fightWith>;
type S = ReturnType<typeof storyWith>;
function rngFor(n: number): { state: number } { for (let s = 1; s < 100000; s++) { const r = { state: s }; if (d20(r) === n) return { state: s }; } throw new Error('no seed'); }
const charOf = (g: GameState, u: Unit) => g.characters[u.charId!];
const sys = (s: S | F, re: RegExp) => s.g.story.entries.some((e) => re.test(e.text || ''));
const open = (cb: Combat) => { cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; };
function fight(specs: any[], foes: any[] = [{}]) {
  const f = fightWith(specs, foes.map((x, i) => ({ at: 'E6', ...x, name: x.name || 'Foe ' + (i + 1) })));
  open(f.cb); f.pcs.forEach((u, i) => { u.pos = 2 + ',' + (5 + i); });
  f.foes.forEach((u, i) => { u.pos = (4 + i) + ',5'; });
  f.turn(f.pc); f.pc.ap = 6;
  return f;
}
const turn = (s: S, t: any) => s.act({ type: 'narrator/turn', turn: { narration: '…', ...t } } as any);
function check(s: S, charId: string, skills: string[], extra: any = {}) {
  turn(s, { checks: [{ charId, skills, tn: 12, stakes: 'It works.', ...extra }] });
  const ck = s.g.checks.at(-1)!;
  return { ck, roll: () => { s.act({ type: 'check/roll', checkId: ck.id }); return s.g.story.entries.filter((e) => e.kind === 'check').at(-1)!.head!; } };
}
const perk = (s: S | F, c: Character, id: string, extra: any = {}) => s.act({ type: 'story/perk', charId: c.id, id, ...extra } as any);
const ruling = (s: S | F, key: string) => (s.g.story.rulings || []).find((r) => r.key === key);
const brief = (g: GameState, c: Character, id: string) => withGame(g, () => briefOf(holderOf({ c: g.characters[c.id] }, id)!));

// ======================================================================================================== Karma locks
describe('Mind Without Fog', () => {
  it('Karma never changes; a story Heart save succeeds on its own; Shaken in the story never takes', () => {
    const s = storyWith([{ traits: ['mind_without_fog'], skills: { conscience: 0 } }]); const c = s.chars[0];
    turn(s, { karma: [{ charId: c.id, amount: 20, why: 'a kindness' }] });
    expect(s.g.characters[c.id].karma || 0).toBe(0);
    expect(sys(s, /Unmoving/)).toBe(true);
    expect(check(s, c.id, ['composure'], { kind: 'save', family: 'heart' }).roll()).toMatch(/SUCCESS \(AUTO\)/);
    turn(s, { conditions: [{ target: c.id, id: 'shaken' }] });
    expect(check(s, c.id, ['charisma']).roll()).not.toMatch(/Shaken/); // dropped when the next check is called
    turn(s, { conditions: [{ target: c.id, id: 'shaken' }], checks: [{ charId: c.id, skills: ['charisma'], tn: 12, stakes: 'x' }] });
    s.act({ type: 'check/roll', checkId: s.g.checks.at(-1)!.id });
    const head = s.g.story.entries.filter((e) => e.kind === 'check').at(-1)!.head!;
    expect(head).toMatch(/−2 Shaken/); expect(head).toMatch(/\+2 Mind Without Fog/); // same turn: the −2 is given back
    expect((s.g.characters[c.id].persistentConds || []).some((p) => p.id === 'shaken')).toBe(false);
  });
  it('a check tagged heart_debuff succeeds; in a fight Heart conditions never land', () => {
    const s = storyWith([{ traits: ['mind_without_fog'] }]); const c = s.chars[0];
    expect(check(s, c.id, ['will_power'], { tags: ['heart_debuff'] }).roll()).toMatch(/Still Water/);
    const f = fight([{ traits: ['mind_without_fog'] }]);
    withGame(f.g, () => applyCond(f.cb, f.g.rng, f.foe, f.pc, 'fear', 2, 'heart', { skipSave: true }));
    expect(condOn(f.pc, 'fear')).toBe(false);
  });
});

describe('Symbol of Order', () => {
  it('starts Lawful; the band holds and leaving costs double; unlawful acts cost double', () => {
    const s = storyWith([{ traits: ['symbol_of_order'], skills: { conscience: 0 } }]); const c = s.chars[0];
    expect(s.g.characters[c.id].karma).toBe(30);
    turn(s, { karma: [{ charId: c.id, amount: -1 }] });
    expect(s.g.characters[c.id].karma).toBe(30); // 1 owed: the band holds
    turn(s, { karma: [{ charId: c.id, amount: -1 }] });
    expect(s.g.characters[c.id].karma).toBe(29); // 2 owed: one point out
    turn(s, { karma: [{ charId: c.id, amount: 11 }] });
    expect(s.g.characters[c.id].karma).toBe(40);
    turn(s, { karma: [{ charId: c.id, amount: -10, unlawful: true }] }); // ×2 = −20: 10 to the edge, then 10 past at half
    expect(s.g.characters[c.id].karma).toBe(25);
  });
  it('I Am the Law: once a scene, a pending ruling for the official\'s true answer', () => {
    const s = storyWith([{ traits: ['symbol_of_order'] }]); const c = s.chars[0];
    perk(s, c, 'symbol_of_order', { text: 'Who signed the order?' });
    expect(ruling(s, 'trait:symbol_of_order')!.text).toMatch(/answer one question truthfully/);
    expect(() => perk(s, c, 'symbol_of_order')).toThrow();
  });
});

describe('Rogue Element', () => {
  it('starts Chaotic and the band holds against a small Lawful award', () => {
    const s = storyWith([{ traits: ['rogue_element'], skills: { conscience: 0 } }]); const c = s.chars[0];
    expect(s.g.characters[c.id].karma).toBe(-30);
    turn(s, { karma: [{ charId: c.id, amount: 1 }] });
    expect(s.g.characters[c.id].karma).toBe(-30);
  });
  it('a fight: breaking an object gives 1 Echo, once a scene', () => {
    const f = fight([{ traits: ['rogue_element'] }]); const c = charOf(f.g, f.pc); c.echo = 0;
    f.cb.objects = [{ id: 'o1', kind: 'crate', name: 'Crate', pos: '3,3', hp: 5, max: 5 } as any, { id: 'o2', kind: 'crate', name: 'Crate', pos: '3,4', hp: 5, max: 5 } as any];
    withGame(f.g, () => { damageObject(f.cb, '3,3', 50, 0, f.pc); damageObject(f.cb, '3,4', 50, 0, f.pc); });
    expect(f.g.characters[c.id].echo).toBe(1);
    expect(f.cb.log.some((l) => /Spanner in the Works/.test(l))).toBe(true);
  });
  it('story: Spanner in the Works gives the Echo now, and the Narrator can take it back', () => {
    const s = storyWith([{ traits: ['rogue_element'] }]); const c = s.chars[0]; s.g.characters[c.id].echo = 0;
    perk(s, c, 'rogue_element', { text: 'the mayor\'s parade route' });
    expect(s.g.characters[c.id].echo).toBe(1);
    expect(ruling(s, 'trait:rogue_element')!.text).toMatch(/n:-1/);
    expect(() => perk(s, c, 'rogue_element')).toThrow();
  });
});

// ======================================================================================================== Faces
describe('Machine-Faced', () => {
  it('a Composure check in dialogue succeeds without a roll; Charisma and Implication are struck out of dialogue', () => {
    const s = storyWith([{ traits: ['machine_faced'] }]); const c = s.chars[0];
    expect(check(s, c.id, ['composure'], { tags: ['dialogue'] }).roll()).toMatch(/Blank Face.*SUCCESS \(AUTO\)/);
    const both = check(s, c.id, ['charisma', 'eloquence'], { tags: ['dialogue'] });
    expect(both.ck.skills).toEqual(['eloquence']);
    const only = check(s, c.id, ['implication'], { tags: ['dialogue'] });
    expect(only.ck.stakes).toMatch(/Uncanny/); expect(only.roll()).toMatch(/FAILURE \(AUTO\)/);
    expect(check(s, c.id, ['charisma']).ck.skills).toEqual(['charisma']); // not dialogue: untouched
  });
});

describe('The Mask', () => {
  it('masked +2 Composure (story check and the fight\'s Heart save), bare −3; the brief says which face', () => {
    const s = storyWith([{ traits: ['the_mask'] }]); const c = s.chars[0];
    s.g.characters[c.id].worn = { ...(s.g.characters[c.id].worn || {}), head: 'smiling_mask' };
    expect(check(s, c.id, ['composure']).roll()).toMatch(/\+2 The Mask/);
    expect(brief(s.g, c, 'the_mask')).toMatch(/masked/);
    const w = { ...s.g.characters[c.id].worn }; delete w.head; s.g.characters[c.id].worn = w;
    expect(check(s, c.id, ['authority']).roll()).toMatch(/−3 The Mask/);
    expect(brief(s.g, c, 'the_mask')).toMatch(/bare-faced/);
  });
  it('the mask reaches the Heart save in a fight', () => {
    const f = fightWith([{ traits: ['the_mask'] }]);
    const bare = unitSave(f.pc, 'heart');
    const s = storyWith([{ traits: ['the_mask'] }]); const c = s.chars[0];
    s.g.characters[c.id].worn = { ...(s.g.characters[c.id].worn || {}), head: 'smiling_mask' };
    turn(s, { combat: { name: 'F', map: 'yard', difficulty: 'standard', enemies: [{ name: 'Foe', tier: 'soldier', weapon: 'service_pistol', at: '' }] } });
    expect(unitSave(s.g.combat!.units.find((u) => u.side === 'pc')!, 'heart')).toBe(bare + 5);
  });
});

describe('Bottle Butts for Eyes', () => {
  it('a critical head injury knocks the glasses off: −4 at once, back in the pack', () => {
    const f = fight([{ traits: ['bottle_butts_for_eyes'] }]);
    const c0 = charOf(f.g, f.pc); c0.worn = { ...(c0.worn || {}), head_accessory: 'prescription_glasses' };
    withGame(f.g, () => { f.pc.sk = undefined; });
    let hit: GameState | null = null;
    for (let st = 1; st < 4000 && !hit; st++) {
      const g = JSON.parse(JSON.stringify(f.g)) as GameState, cb = g.combat!, foe = cb.units.find((u) => u.side === 'foe')!, pc = cb.units.find((u) => u.side === 'pc')!;
      foe.attack = 40; foe.ap = 9; pc.injResist = 0;
      withGame(g, () => resolveAttack(cb, { state: st }, foe, pc, 'shot', null));
      if (!g.characters[c0.id].worn?.head_accessory && cb.log.some((l) => /head, Dazed/.test(l))) hit = g;
    }
    expect(hit).not.toBeNull();
    const c = hit!.characters[c0.id];
    expect(c.pack!.some((x) => x.id === 'prescription_glasses')).toBe(true);
    expect(hit!.combat!.units.find((u) => u.side === 'pc')!.sk?.proficiency).toBe(-4);
    expect(hit!.combat!.log.some((l) => /glasses come off/.test(l))).toBe(true);
  });
  it('story: the Narrator knocks them off (traitState), and the next check shows −4', () => {
    const s = storyWith([{ traits: ['bottle_butts_for_eyes'] }]); const c = s.chars[0];
    s.g.characters[c.id].worn = { ...(s.g.characters[c.id].worn || {}), head_accessory: 'prescription_glasses' };
    expect(check(s, c.id, ['proficiency']).roll()).toMatch(/\+1 Bottle Butts/);
    turn(s, { traitState: [{ charId: c.id, key: 'glasses', value: 'off' }] });
    expect(check(s, c.id, ['proficiency']).roll()).toMatch(/−4 Bottle Butts/);
    expect(sys(s, /glasses come off/)).toBe(true);
  });
});

// ======================================================================================================== Oils
describe('Oil in My Mind / Oil in My Soul', () => {
  it('Paper: −1 on Durability rolls once even with both Oils, and one point off what it derives (HP per level)', () => {
    const s = storyWith([{ traits: ['oil_in_my_mind', 'oil_in_my_soul'], level: 5 }, { level: 5 }]); const [c, d] = s.chars;
    const head = check(s, c.id, ['durability']).roll();
    expect(head.match(/−1 perks/g)?.length).toBe(1);
    const base = maxHp({ ...s.g.characters[d.id], skills: { ...s.g.characters[c.id].skills }, attrs: { ...s.g.characters[c.id].attrs } } as any);
    expect(maxHp(s.g.characters[c.id])).toBe(base - 4 * 2);
    expect(check(s, c.id, ['visualization']).roll()).toMatch(/\+1 Oil in My Mind/);
    expect(check(s, c.id, ['empathy']).roll()).toMatch(/\+1 Oil in My Soul/);
  });
  it('Oil in My Soul alone carries the Paper penalty', () => {
    const s = storyWith([{ traits: ['oil_in_my_soul'] }]); const c = s.chars[0];
    expect(check(s, c.id, ['sensory']).roll()).toMatch(/−1 perks/);
  });
  it('Masterpiece (both Oils): once a session, an ally gets +2 on the next roll', () => {
    const s = storyWith([{ name: 'Painter', traits: ['oil_in_my_mind', 'oil_in_my_soul'] }, { name: 'Friend' }]); const [p, a] = s.chars;
    perk(s, p, 'oil_in_my_mind', { actionId: 'masterpiece', text: 'Friend' });
    expect(check(s, a.id, ['athletics']).roll()).toMatch(/\+2 Masterpiece/);
    expect(check(s, a.id, ['athletics']).roll()).not.toMatch(/Masterpiece/);
    expect(() => perk(s, p, 'oil_in_my_mind', { actionId: 'masterpiece', text: 'Friend' })).toThrow();
    const one = storyWith([{ traits: ['oil_in_my_mind'] }, {}]);
    expect(() => perk(one, one.chars[0], 'oil_in_my_mind', { actionId: 'masterpiece', text: 'Tester 2' })).toThrow();
  });
  it('Masterpiece in a fight: the ally\'s next attack gets +2', () => {
    const f = fight([{ traits: ['oil_in_my_mind', 'oil_in_my_soul'] }, {}]); const [p, a] = f.pcs;
    f.act({ type: 'combat/perk', unitId: p.id, id: 'oil_in_my_mind', actionId: 'masterpiece', targetId: a.id } as any);
    f.unit(a.id).ap = 6;
    const pv = withGame(f.g, () => previewAttack(f.cb, f.unit(a.id), f.foe, 'shot'));
    expect((pv.terms || []).some((t: any) => t.label === 'Masterpiece' && t.v === 2)).toBe(true);
  });
});

// ======================================================================================================== Lunarshine
describe('Lunarshine', () => {
  const bottle = (c: Character) => { c.pack = [...(c.pack || []), { id: 'bottle_of_spirits', item: 'bottle_of_spirits', name: 'Bottle of spirits', qty: 1, kind: 'food' }]; };
  it('drinks stack: Tipsy +1, Drunk +2 Authority; a bottle is 5 drinks; a scene ending Drunk rolls Will Power', () => {
    const s = storyWith([{ traits: ['lunarshine'] }]); const c = s.chars[0]; bottle(s.g.characters[c.id]);
    perk(s, c, 'lunarshine');
    expect(s.g.characters[c.id].pack!.some((x) => x.id === 'bottle_of_spirits')).toBe(false);
    expect(check(s, c.id, ['authority']).roll()).toMatch(/\+1 perks/);
    perk(s, c, 'lunarshine'); perk(s, c, 'lunarshine');
    expect(check(s, c.id, ['authority']).roll()).toMatch(/\+2 perks/);
    turn(s, { sceneTitle: 'Next morning' });
    expect(sys(s, /The Slope: WILL POWER .* vs 15/)).toBe(true);
  });
  it('Wasted: −2 initiative and Dexterity in a fight; drinking in a fight costs 1 AP', () => {
    const f = fight([{ traits: ['lunarshine'] }]); const c = charOf(f.g, f.pc); bottle(c);
    const ap = f.pc.ap; f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'lunarshine' } as any);
    expect(f.pc.ap).toBe(ap - 1);
    expect(f.g.characters[c.id].state!.lunar.drinks).toBe(1);
    const s = storyWith([{ traits: ['lunarshine'] }]); const d = s.chars[0];
    s.g.characters[d.id].state = { lunar: { drinks: 5, today: 5 } };
    turn(s, { combat: { name: 'F', map: 'yard', difficulty: 'standard', enemies: [{ name: 'Foe', tier: 'soldier', weapon: 'service_pistol', at: '' }] } });
    expect(s.g.combat!.units.find((u) => u.side === 'pc')!.sk?.reaction_speed).toBe(-2);
  });
  it('no bottle: a pending ruling; a drink poured by the Narrator counts; a dry day gives the shakes', () => {
    const s = storyWith([{ traits: ['lunarshine'] }]); const c = s.chars[0];
    perk(s, c, 'lunarshine');
    expect(ruling(s, 'trait:lunarshine')!.text).toMatch(/key:"drink"/);
    turn(s, { traitState: [{ charId: c.id, key: 'drink', value: 1 }] });
    check(s, c.id, ['authority']);
    expect(s.g.characters[c.id].state!.lunar.drinks).toBe(1);
    turn(s, { rest: { kind: 'long' } }); // a day with a drink: no shakes
    expect(s.g.characters[c.id].state!.lunar.shakes).toBeFalsy();
    turn(s, { rest: { kind: 'long' } }); // a day with none
    expect(s.g.characters[c.id].state!.lunar.shakes).toBe(true);
    expect(check(s, c.id, ['composure']).roll()).toMatch(/−1 perks/);
  });
});

// ======================================================================================================== Insomniac
describe('Insomniac', () => {
  it('Wired: a long rest gives back half the missing HP; a short rest 12.5%', () => {
    const s = storyWith([{ traits: ['insomniac'] }, {}]); const [c, d] = s.chars;
    const max = maxHp(s.g.characters[c.id]), maxD = maxHp(s.g.characters[d.id]);
    s.g.characters[c.id].hp = 20; s.g.characters[d.id].hp = 20;
    turn(s, { rest: { kind: 'long' } });
    expect(s.g.characters[c.id].hp).toBe(20 + Math.ceil((max - 20) / 2));
    expect(s.g.characters[d.id].hp).toBe(maxD);
    s.g.characters[c.id].hp = 20;
    turn(s, { rest: { kind: 'short' } });
    expect(s.g.characters[c.id].hp).toBe(20 + Math.ceil(max * 0.125));
  });
  it('Always Up: a hidden enemy at a rest camp gets no ambush against them', () => {
    const s = storyWith([{ traits: ['insomniac'] }]);
    turn(s, { rest: { kind: 'short' }, combat: { name: 'Night raid', map: 'yard', difficulty: 'standard', enemies: [{ name: 'Raider', tier: 'soldier', weapon: 'service_pistol', at: '', hidden: true }] } });
    const cb = s.g.combat!, foe = cb.units.find((u) => u.side === 'foe')!, pc = cb.units.find((u) => u.side === 'pc')!;
    open(cb); foe.pos = '6,5'; pc.pos = '2,5'; foe.attack = 40; foe.ap = 9;
    withGame(s.g, () => resolveAttack(cb, rngFor(19), foe, pc, 'shot', null));
    expect(cb.log.some((l) => /Always Up/.test(l))).toBe(true);
    expect(cb.log.at(-1)).not.toMatch(/CRITICAL/);
  });
});

// ======================================================================================================== City and factions
describe('Central City Kid', () => {
  it('Plugged In: +2 on social checks tagged official or merchant', () => {
    const s = storyWith([{ traits: ['central_city_kid'] }]); const c = s.chars[0];
    expect(check(s, c.id, ['charisma'], { tags: ['official'] }).roll()).toMatch(/\+2 Plugged In/);
    expect(check(s, c.id, ['athletics'], { tags: ['official'] }).roll()).not.toMatch(/Plugged In/);
  });
  it('Soft Hands: the first wound each fight costs 2 AP (now on their turn, else next turn); only once', () => {
    const f = fight([{ traits: ['central_city_kid'] }]); const ap = f.pc.ap;
    withGame(f.g, () => applyDamage(f.cb, f.pc, 5, { type: 'weapon', by: f.foe }));
    expect(f.pc.ap).toBe(ap - 2);
    withGame(f.g, () => applyDamage(f.cb, f.pc, 5, { type: 'weapon', by: f.foe }));
    expect(f.pc.ap).toBe(ap - 2);
    const g = fight([{ traits: ['central_city_kid'] }]); g.cb.turn = g.cb.order.indexOf(g.foe.id);
    withGame(g.g, () => applyDamage(g.cb, g.pc, 5, { type: 'weapon', by: g.foe }));
    const u = g.turn(g.pc); expect(u.ap).toBe(4);
  });
  it('outside the city: −2 Guts on story checks and on Body saves in a fight', () => {
    const s = storyWith([{ traits: ['central_city_kid'] }]); const c = s.chars[0];
    turn(s, { combat: { name: 'F', map: 'yard', difficulty: 'standard', enemies: [{ name: 'Foe', tier: 'soldier', weapon: 'service_pistol', at: '' }] } });
    const inside = unitSave(s.g.combat!.units.find((u) => u.side === 'pc')!, 'body');
    const s2 = storyWith([{ traits: ['central_city_kid'] }]); const c2 = s2.chars[0];
    const z: any = s2.g.campaign!.zones.find((x) => x.id === s2.g.story.zone); z.in_city = false;
    expect(check(s2, c2.id, ['guts']).roll()).toMatch(/−2 Central City Kid/);
    turn(s2, { combat: { name: 'F', map: 'yard', difficulty: 'standard', enemies: [{ name: 'Foe', tier: 'soldier', weapon: 'service_pistol', at: '' }] } });
    expect(unitSave(s2.g.combat!.units.find((u) => u.side === 'pc')!, 'body')).toBe(inside - 2);
    void c;
  });
});

describe('Wanted', () => {
  it('Central City officials start hostile in the memory; +2 Intimidation with the underworld', () => {
    const s = storyWith([{ traits: ['wanted'] }]); const c = s.chars[0];
    expect((s.g as any).memory.factions.some((f: any) => f.name === 'Central City officials' && f.standing === -40)).toBe(true);
    expect(check(s, c.id, ['intimidation'], { tags: ['underworld'] }).roll()).toMatch(/\+2 perks/);
    expect(check(s, c.id, ['intimidation'], { tags: ['vs_underworld'] }).roll()).toMatch(/\+2 Wanted/);
  });
});

describe('Company Man', () => {
  it('story: once a campaign, RTC extracts them (a pending ruling)', () => {
    const s = storyWith([{ traits: ['company_man'] }]); const c = s.chars[0];
    perk(s, c, 'company_man');
    expect(ruling(s, 'trait:company_man')!.text).toMatch(/RTC extracts/);
    expect(() => perk(s, c, 'company_man')).toThrow();
    expect(brief(s.g, c, 'company_man')).toMatch(/60% of list/);
  });
  it('a fight: they leave it and take no XP from it', () => {
    const f = fight([{ traits: ['company_man'] }, {}]); const [p, q] = f.pcs; const c = charOf(f.g, p);
    f.act({ type: 'combat/perk', unitId: p.id, id: 'company_man' } as any);
    expect(f.unit(p.id).surrendered).toBe(true);
    expect((f.cb.notes || []).some((n) => /extracted by RTC/.test(n))).toBe(true);
    const xp0 = f.g.characters[c.id].xp, xq = f.g.characters[q.charId!].xp;
    for (const u of f.foes) { u.hp = 0; u.dead = true; }
    f.turn(q); f.act({ type: 'combat/end-turn', unitId: q.id } as any);
    expect(f.g.phase).not.toBe('combat');
    expect(f.g.characters[c.id].xp).toBe(xp0); expect(f.g.characters[q.charId!].xp).toBeGreaterThan(xq);
  });
});

describe('Market Blood', () => {
  it('Price it: a private line with the true value of what they carry; anything else is a ruling', () => {
    const s = storyWith([{ traits: ['market_blood'] }]); const c = s.chars[0];
    s.g.characters[c.id].pack = [...(s.g.characters[c.id].pack || []), { id: 'contraband', item: 'contraband', name: 'Contraband', qty: 1, kind: 'loot' }];
    perk(s, c, 'market_blood', { text: 'contraband' });
    const e = s.g.story.entries.at(-1)!;
    expect(e.text).toMatch(/Contraband 300 credits/); expect(e.to).toBe(c.owner);
    perk(s, c, 'market_blood', { text: 'the merchant\'s ring' });
    expect(ruling(s, 'trait:market_blood')!.text).toMatch(/whether it's fake/);
    expect(check(s, c.id, ['camaraderie']).roll()).toMatch(/−1 Market Blood/);
  });
});

describe('Inner Ring Heir', () => {
  it('a family favour once a session (a pending ruling)', () => {
    const s = storyWith([{ traits: ['inner_ring_heir'] }]); const c = s.chars[0];
    perk(s, c, 'inner_ring_heir', { text: 'a shuttle off-world' });
    expect(ruling(s, 'trait:inner_ring_heir')!.text).toMatch(/a shuttle off-world/);
    expect(() => perk(s, c, 'inner_ring_heir', { text: 'again' })).toThrow();
  });
});

describe('Occultist', () => {
  it('a weakness once a session (story ruling; in a fight a report note) and Ward Area out of combat', () => {
    const s = storyWith([{ traits: ['occultist'] }]); const c = s.chars[0];
    perk(s, c, 'occultist', { actionId: 'weakness', text: 'the pale thing' });
    expect(ruling(s, 'trait:occultist')!.text).toMatch(/weakness of the pale thing/);
    perk(s, c, 'occultist', { actionId: 'ward_area' });
    expect(s.g.story.rulings!.some((r) => /Ward Area/.test(r.text))).toBe(true);
    const f = fight([{ traits: ['occultist'] }]);
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'occultist', actionId: 'weakness', targetId: f.foe.id } as any);
    expect((f.cb.notes || []).some((n) => /weakness/.test(n))).toBe(true);
    expect(() => f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'occultist', actionId: 'ward_area' } as any)).toThrow();
  });
});

describe('Ace Pilot', () => {
  it('Grounded (the Narrator sets it): −1 Reaction Speed and −0.5 Movement; back in a seat ends it', () => {
    const s = storyWith([{ traits: ['ace_pilot'] }]); const c = s.chars[0];
    const p0 = withGame(s.g, () => passive(s.g.characters[c.id], 'reaction_speed'));
    turn(s, { traitState: [{ charId: c.id, key: 'grounded', value: true }] });
    expect(withGame(s.g, () => passive(s.g.characters[c.id], 'reaction_speed'))).toBe(p0 - 1);
    expect(check(s, c.id, ['reaction_speed']).roll()).toMatch(/−1 perks/);
    perk(s, c, 'ace_pilot');
    expect(s.g.characters[c.id].state?.grounded).toBeUndefined();
    expect(withGame(s.g, () => passive(s.g.characters[c.id], 'reaction_speed'))).toBe(p0);
  });
});

describe('Worldline Fracture', () => {
  it('dormant unless the whole squad has it; the brief and the session start say which', () => {
    const one = storyWith([{ traits: ['worldline_fracture'] }, {}]);
    expect(brief(one.g, one.chars[0], 'worldline_fracture')).toMatch(/dormant/);
    expect(sys(one, /Worldline Fracture is dormant/)).toBe(true);
    const all = storyWith([{ traits: ['worldline_fracture'] }, { traits: ['worldline_fracture'] }]);
    expect(brief(all.g, all.chars[0], 'worldline_fracture')).toMatch(/ACTIVE/);
    expect(sys(all, /Worldline Fracture is active/)).toBe(true);
  });
});
void emit;
