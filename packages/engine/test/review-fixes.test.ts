// Regression tests for the defects found in the review of the perks, traits and class moves pass (7 Nov 2026). One
// test per defect, through the reducer where the player would reach it.
import { describe, expect, it } from 'vitest';
import './helpers/yard16'; // the 16 × 11 practice square these tests name tiles on
import { d20, beginTurn, applyDamage, attackDamage, harm, emit, checkOver, previewAttack, perkActionsFor, pendingPerkSteps, CLASS, condOn, type Unit, type Combat, type GameState, type Character } from '../src';
import { fightWith, storyWith, withGame } from './helpers/perkfight';
import { useRevision2Classes, SIG } from './helpers/legacy';
useRevision2Classes(); // Revision 2 classes and advanced classes for this file's handler tests (Class Roster Rev 3)

type F = ReturnType<typeof fightWith>;
type S = ReturnType<typeof storyWith>;
function rngFor(n: number): { state: number } { for (let s = 1; s < 100000; s++) { const r = { state: s }; if (d20(r) === n) return { state: s }; } throw new Error('no seed'); }
const open = (cb: Combat) => { cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; };
function cls(id: string, rank: 1 | 2 | 3, extra: any = {}) {
  const sig = SIG(id), pts = rank === 3 ? [6, 6, 6] : rank === 2 ? [5, 4, 4] : [1, 1, 1];
  return { ...extra, classId: id, level: 5, skills: { ...Object.fromEntries(sig.map((s: string, i: number) => [s, pts[i]])), ...(extra.skills || {}) } };
}
function storyCheck(s: S, charId: string, skills: string[], extra: any = {}) {
  s.act({ type: 'narrator/turn', turn: { narration: 'Try it.', checks: [{ charId, skills, tn: 12, stakes: 'It works.', ...extra }] } } as any);
  const ck = s.g.checks.at(-1)!;
  return { ck, roll: (n?: number) => { if (n) s.g.rng = rngFor(n); s.act({ type: 'check/roll', checkId: ck.id }); return s.g.checks.find((k) => k.id === ck.id)!; } };
}
const perk = (s: S, c: Character, id: string, a: any = {}) => s.act({ type: 'story/perk', charId: c.id, id, ...a } as any);
const turn = (s: S, t: any) => s.act({ type: 'narrator/turn', turn: { narration: 'On.', ...t } } as any);
const live = (s: S, c: Character) => s.g.characters[c.id];

describe('1 War Footing: a natural 1 still fails', () => {
  it('Intimidation 10 at TN 8, d20 = 1: a failure without the complication', () => {
    const s = storyWith([{ perks: { war_footing: 'ultimate' }, skills: { intimidation: 10 } }]); const c = s.chars[0];
    const k = storyCheck(s, c.id, ['intimidation'], { tn: 8, target: 'Guard' });
    const r = k.roll(1).roll!;
    expect(r.ok).toBe(false); expect(r.fumble).toBe(false);
  });
});

describe('2 Southern Fist: a paired attack with a weapon in the off hand pays +1 AP', () => {
  it('gloves in the main hand, a pistol in the off hand', () => {
    const f = fightWith([{ traits: ['southern_fist'], weapon: 'service_pistol' }], [{ at: 'E6' }]); open(f.cb);
    const u = f.turn(f.pc); u.weapon = 'knuckle_dusters' as any; (u as any).offWeapon = 'service_pistol';
    const hk: any = { att: u, tgt: f.foe, mode: 'paired', ap: 3, terms: [], free: false, preview: true, cb: f.cb, mods: [] };
    withGame(f.g, () => emit(f.cb, 'attack_preview', hk));
    expect(hk.ap).toBe(4);
  });
});

describe('3 Sworn Sibling: one AP a round for the pair, even when both hold it', () => {
  it('both siblings bonded each way: 7 then 6', () => {
    const s = storyWith([{ traits: ['sworn_sibling'] }, { traits: ['sworn_sibling'] }]);
    perk(s, s.chars[0], 'sworn_sibling', { choice: s.chars[1].name }); perk(s, s.chars[1], 'sworn_sibling', { choice: s.chars[0].name });
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'T', map: 'yard16', difficulty: 'standard', enemies: [{ name: 'Foe 1', tier: 'soldier', weapon: 'service_pistol', at: 'P6' }] } } } as any);
    const cb = () => s.g.combat!, u = (i: number) => cb().units.filter((x) => x.side === 'pc')[i];
    cb().map = { ...cb().map, cover: [], full: [], solid: [], difficult: [] } as any; u(0).pos = '2,5'; u(1).pos = '3,5';
    const start = (x: Unit) => { const c = cb(); c.turn = c.order.indexOf(x.id); delete c.window; withGame(s.g, () => beginTurn(c, s.g.rng)); return c.units.find((y) => y.id === x.id)!; };
    expect(start(u(1)).ap).toBe(7); expect(start(u(0)).ap).toBe(6);
  });
});

describe('4 Moon Hunter: the +30% is spent by the first spell hit', () => {
  it('a tracked target takes Tracker on one spell, not the next', () => {
    const f = fightWith([{ traits: ['moon_hunter'] }], [{ at: 'H6' }]);
    const c = f.g.characters[f.pc.charId!]; c.state = { ...(c.state || {}), tracked: f.foe.name };
    const foe = f.foe; foe.hp = foe.maxHp = 1000; foe.armour = 0;
    withGame(f.g, () => harm(f.cb, f.g.rng, f.pc, foe, 100, 'soul')); const first = 1000 - foe.hp;
    withGame(f.g, () => harm(f.cb, f.g.rng, f.pc, foe, 100, 'soul')); const second = 1000 - first - foe.hp;
    expect(first).toBe(130); expect(second).toBe(100);
  });
});

describe('5 Beast Handler: the bite grapples without a chip', () => {
  it('a beast hit with no mods grapples (Body save permitting)', () => {
    const f = fightWith([{ traits: ['beast_handler'] }], [{ at: 'E6' }]); open(f.cb);
    const beast = f.pcs.find((u) => u.companion === 'beast')!; expect(beast).toBeTruthy();
    const foe = f.foe; beast.pos = '3,5'; foe.pos = '4,5'; foe.sv = { body: -40, brain: -40, heart: -40 } as any; foe.def = 1;
    f.turn(beast); f.unit(beast.id).ap = 4;
    for (let i = 0; i < 6 && !condOn(f.foe, 'grappled'); i++) { f.unit(beast.id).ap = 4; try { f.act({ type: 'combat/attack', unitId: beast.id, targetId: foe.id, mode: 'melee' } as any); } catch { /* a miss loop */ } }
    expect(condOn(f.foe, 'grappled')).toBe(true);
  });
});

describe('6 Weak Point became Read Them (it reached spells)', () => {
  it('rules 1.13 (Read Them): no +15% against an analysed foe, by weapon or spell; the analysed foe deals 15% less to the squad', () => {
    const f = fightWith([{}], [{ at: 'H6' }]); const foe = f.foe; foe.hp = foe.maxHp = 1000; foe.armour = 0;
    withGame(f.g, () => harm(f.cb, f.g.rng, f.pc, foe, 100, 'soul')); const plain = 1000 - foe.hp;
    foe.weakPoint = true; const was = foe.hp;
    withGame(f.g, () => harm(f.cb, f.g.rng, f.pc, foe, 100, 'soul'));
    expect(plain).toBe(100); expect(was - foe.hp).toBe(100);
    const d = withGame(f.g, () => attackDamage(f.cb, f.pc, foe, 'shot', null, { preview: true }));
    expect(d.mults.some((m: any) => /Weak Point/.test(m.label))).toBe(false);
    const pc = f.pc; pc.hp = pc.maxHp = 1000;
    withGame(f.g, () => applyDamage(f.cb, pc, 100, { by: foe, type: 'weapon', ranged: true }));
    expect(1000 - pc.hp).toBe(85);
    foe.weakPoint = false; pc.hp = 1000;
    withGame(f.g, () => applyDamage(f.cb, pc, 100, { by: foe, type: 'weapon', ranged: true }));
    expect(1000 - pc.hp).toBe(100);
  });
});

describe('7 The Twin Pays: no free Strain relief when the hold breaks', () => {
  it('the hold slips during the enemy turn: Strain stays at 0, never negative', () => {
    const f: any = fightWith([{ archetype: 'stormcaller', kit: 'soul', perks: { the_twin_pays: 'mastered' } }] as any, [{ at: 'E6' }] as any);
    open(f.cb); f.pc.pos = '2,5'; f.foe.pos = '9,9'; f.turn(f.pc); f.pc.ap = 9; f.pc.mg!.mp = 500;
    f.act({ type: 'combat/outburst', unitId: f.pc.id, design: f.pc.mg!.designs[0].id, hold: true, mods: ['twin'] });
    withGame(f.g, () => emit(f.cb, 'turn_end', { u: f.pc, cb: f.cb, rng: f.g.rng }));
    expect(f.pc.mg.strain).toBe(0);
    const held = f.pc.mg.held; f.pc.mg.held = null;
    expect(f.turn(f.pc).mg.strain).toBe(0);
    f.pc.mg.held = held; // still held next turn: the hold costs nothing
    expect(f.turn(f.pc).mg.strain).toBe(0);
  });
});

describe('8 Rally Cry: a Downed ally finished off does not rally twice', () => {
  it('the finishing hit banks nothing', () => {
    const f = fightWith([{ perks: { rally_cry: 'I' } }, {}, {}], [{ at: 'P6' }]);
    const [, a] = f.pcs, foe = f.foe;
    withGame(f.g, () => applyDamage(f.cb, a, 9999, { by: foe, type: 'weapon', shield: false, credit: 'all' } as any));
    const bank = () => f.pcs.filter((x) => x !== a).map((x) => (x as any).bankAp || (x as any).banked || JSON.stringify((x as any).bank0 || ''));
    const before = JSON.stringify(f.pcs.map((x) => x.ps));
    f.cb.round++;
    for (let i = 0; i < 3; i++) withGame(f.g, () => applyDamage(f.cb, f.unit(a.id), 10, { by: foe, type: 'weapon', shield: false, credit: 'all' } as any));
    expect(f.unit(a.id).dead).toBe(true);
    expect(JSON.stringify(f.pcs.map((x) => x.ps))).toBe(before); void bank;
  });
});

describe('9 perkLines with a bare item id', () => {
  it('does not crash the Narrator turn', () => {
    const s = storyWith([{ perks: { bedside_manner: 'I' } }]); const c = s.chars[0];
    turn(s, { perkLines: [{ charId: c.id, key: 'bedside_manner', text: 'He lies.' }] });
    expect(s.g.story.entries.at(-1)!.head).toMatch(/BEDSIDE MANNER · ONLY YOU/);
    expect(s.g.narrator.busy).toBe(false);
  });
});

describe('10 a refused story use takes back what it set up', () => {
  it("Everyone's Friend and Every Lie Is a Door, refused: no auto-success, no open door", () => {
    const s = storyWith([{ perks: { everyones_friend: 'mastered', every_lie_is_a_door: 'ultimate' } }]); const c = s.chars[0];
    perk(s, c, 'everyones_friend', { actionId: 'befriend', npc: 'Guard Captain' });
    perk(s, c, 'every_lie_is_a_door', { text: 'Pipe inspection' });
    const rs = s.g.story.rulings!.map((r) => ({ id: r.id, accepted: false }));
    turn(s, { perkRulings: rs });
    expect(live(s, c).state?.lie_door).toBeUndefined();
    const k = storyCheck(s, c.id, ['charisma'], { tn: 20, tags: ['lie'], target: 'Guard Captain' });
    expect(k.roll(1).roll!.ok).toBe(false);
  });
  it('Holo-Drama Addict, refused: a drama-tagged check spends the use itself, once', () => {
    const s = storyWith([{ traits: ['holo_drama_addict'] }]); const c = s.chars[0];
    perk(s, c, 'holo_drama_addict', { text: 'The last stand at the bridge' });
    turn(s, { perkRulings: s.g.story.rulings!.map((r) => ({ id: r.id, accepted: false })) });
    const a = storyCheck(s, c.id, ['charisma'], { tags: ['drama'] }); a.roll();
    expect((a.ck as any).mods?.some?.((m: any) => m.label === 'Dramatic Timing') ?? s.g.checks.find((x) => x.id === a.ck.id)!.mods!.some((m) => m.label === 'Dramatic Timing')).toBe(true);
    const b = storyCheck(s, c.id, ['charisma'], { tags: ['drama'] }); b.roll();
    expect(s.g.checks.find((x) => x.id === b.ck.id)!.mods!.some((m) => m.label === 'Dramatic Timing')).toBe(false);
  });
});

describe('13 Masterpiece: one +2, not one per surface', () => {
  it('a check spends it; the next attack gets nothing', () => {
    const f = fightWith([{ traits: ['oil_in_my_mind', 'oil_in_my_soul'] }, {}], [{ at: 'H6' }]);
    const ally = f.g.characters[f.pcs[1].charId!]; ally.state = { ...(ally.state || {}), masterpiece: { n: 2, by: f.pcs[0].charId, used: 'ck:k1' } };
    const pv = withGame(f.g, () => previewAttack(f.cb, f.unit(f.pcs[1].id), f.foe, 'shot'));
    expect((pv.terms || []).some((t: any) => t.label === 'Masterpiece')).toBe(false);
  });
});

describe('14 an Echo reroll withdraws the first roll\'s check_result rulings', () => {
  it('Cover Story: a failed roll rerolled to a success leaves no burn ruling', () => {
    const s = storyWith([{ traits: ['cover_story'] }]); const c = s.chars[0]; live(s, c).echo = 2;
    perk(s, c, 'cover_story', { text: 'a pipe inspector' }); turn(s, { perkRulings: s.g.story.rulings!.map((r) => ({ id: r.id, accepted: true })) });
    const k = storyCheck(s, c.id, ['charisma'], { tn: 12 }); k.roll(2);
    expect((s.g.story.rulings || []).some((r) => /failed a roll/.test(r.text))).toBe(true);
    s.g.rng = rngFor(20); s.act({ type: 'check/reroll', checkId: k.ck.id });
    expect((s.g.story.rulings || []).some((r) => /failed a roll/.test(r.text))).toBe(false);
  });
});

describe('15 a story use made while the Narrator is thinking keeps its ruling', () => {
  it('a ruling made after narrator/begin waits for the next turn', () => {
    const s = storyWith([{ perks: { established_fact: 'mastered' } }]); const c = s.chars[0];
    s.act({ type: 'narrator/begin' } as any);
    perk(s, c, 'established_fact', { text: 'The vent leads to the roof.' });
    const id = s.g.story.rulings!.at(-1)!.id;
    turn(s, {});
    expect(s.g.story.rulings!.map((r) => r.id)).toContain(id);
  });
});

describe('16 side rolls take the every-d20 modifiers', () => {
  it('Leading Role rolls Visualization with a story Right Brain Debuff (−2)', () => {
    const s = storyWith([{ traits: ['holo_drama_addict'], skills: { visualization: 5 } }]); const c = s.chars[0];
    turn(s, { conditions: [{ target: c.id, id: 'right_brain_debuff', scope: 'scene' }] });
    s.g.rng = rngFor(10); storyCheck(s, c.id, ['charisma'], { tags: ['unglamorous'] });
    const e = s.g.story.entries.filter((x) => /LEADING ROLE/.test(x.head || '')).at(-1)!;
    expect(e.head).toMatch(/\+2 = /); // mod(5) = +4, −2 for the debuff
  });
});

describe('17/21 Medic Triage', () => {
  it('in a fight: never on yourself', () => {
    const f = fightWith([cls('medic', 1)], [{ at: 'O10' }]); const u = f.turn(f.pc); u.hp = 20; u.ap = 6;
    expect(() => f.act({ type: 'combat/perk', unitId: u.id, id: 'class:medic.triage', actionId: 'triage', targetId: u.id } as any)).toThrow(/not yourself/);
  });
  it('on the area map: once per ally per scene, shared with the story Triage', () => {
    const s = storyWith([cls('medic', 1), {}]); const [m, a] = s.chars; live(s, a).hp = 10;
    const tri = () => s.act({ type: 'world/act', charId: m.id, act: 'perk', id: 'class:medic.triage', actionId: 'triage', targetId: a.id } as any);
    tri(); const hp = live(s, a).hp; expect(hp).toBeGreaterThan(10);
    s.g.story.round++; s.g.story.ended = {}; s.g.story.ap = {};
    expect(() => tri()).toThrow(/this scene/);
    expect(() => s.act({ type: 'story/perk', charId: m.id, id: 'class:medic.triage', actionId: 'triage_story', choice: a.name, text: a.name } as any)).toThrow(/already treated/);
  });
});

describe('18/24/29 a partial Extraction still ends the fight', () => {
  it('the squadmate left behind falls: the fight ends (extracted)', () => {
    const f = fightWith([{ advancedClass: 'rtc_contractor', weapon: 'service_pistol' }, {}], [{ at: 'O10' }]);
    const [c, a] = f.pcs; c.pos = '2,5'; a.pos = '12,12';
    (c as any).extracted = true; c.surrendered = true;
    withGame(f.g, () => applyDamage(f.cb, f.unit(a.id), 9999, { by: f.foe, type: 'weapon', shield: false, credit: 'all' } as any));
    expect(withGame(f.g, () => checkOver(f.cb))).toBe('extracted');
  });
  it('with nobody lifted, all down is still a loss', () => {
    const f = fightWith([{}], [{ at: 'O10' }]);
    withGame(f.g, () => applyDamage(f.cb, f.pc, 9999, { by: f.foe, type: 'weapon', shield: false, credit: 'all' } as any));
    expect(withGame(f.g, () => checkOver(f.cb))).toBe('loss');
  });
});

describe('19/20 a Defender who learns Adamantile Knight', () => {
  it("the Defender's Brace grants Bulwark of Will", () => {
    const f = fightWith([cls('defender', 1, { advancedClass: 'adamantile_knight' })], [{ at: 'O10' }]);
    const pc = f.turn(f.pc); pc.pos = '2,5'; pc.ap = 6;
    f.act({ type: 'combat/perk', unitId: pc.id, id: 'defender.brace', actionId: 'brace' } as any);
    expect(f.pc.shield || 0).toBeGreaterThan(0);
  });
  it("a rank III Defender's Reactive Plate still shields the adjacent ally (Adamantile Plate)", () => {
    const f = fightWith([cls('defender', 3, { advancedClass: 'adamantile_knight' }), {}], [{ at: 'O10' }]);
    const [k, a] = f.pcs; k.pos = '2,5'; a.pos = '2,6'; k.res = { ...(k.res || {}), guard: 2 };
    withGame(f.g, () => applyDamage(f.cb, k, 25, { by: f.foe, type: 'weapon', shield: true, credit: 'all' } as any));
    expect(f.pcs[1].shield || 0).toBeGreaterThan(0);
  });
});

describe('22 automatic moves have no dead button', () => {
  it("The Draw and House Edge list no default action", () => {
    const f = fightWith([{ classId: 'marksman' as any, advancedClass: 'gunslinger', weapon: 'service_pistol' }], [{ at: 'O10' }]);
    const list = withGame(f.g, () => perkActionsFor({ u: f.pc, c: f.g.characters[f.pc.charId!], cb: f.cb, g: f.g }, 'combat'));
    expect(list.some((e) => e.id === 'class:gunslinger.the_draw')).toBe(false);
  });
});

describe('23 Momentum: an off-turn attack does not carry into your own turn', () => {
  it('attackedTurn resets at the start of your turn', () => {
    const f = fightWith([{}], [{ at: 'O10' }]); const u = f.pc; u.attackedTurn = true;
    expect(f.turn(u).attackedTurn).toBe(false);
  });
});

describe('25 story conditions in a fight', () => {
  it('a story Stun stays in the story; a Shaken comes in for its own rounds', () => {
    const s = storyWith([{}]); const c = s.chars[0];
    turn(s, { conditions: [{ target: c.id, id: 'stunned', scope: 'scene' }, { target: c.id, id: 'shaken', scope: 'scene' }] });
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'T', map: 'yard16', difficulty: 'standard', enemies: [{ name: 'Foe 1', tier: 'soldier', weapon: 'service_pistol', at: 'P6' }] } } } as any);
    const u = s.g.combat!.units.find((x) => x.charId === c.id)!;
    expect(condOn(u, 'stunned')).toBe(false);
    expect(u.conds?.shaken).toBeLessThanOrEqual(3);
    expect((s.g.combat!.notes || []).join(' ')).toMatch(/stunned in the story/);
  });
});

describe('30 the level-up count is steps, not skills', () => {
  it('a 5-point skill with no perks owes 2', () => {
    const s = storyWith([{}]); const c = live(s, s.chars[0]); c.skills.sensory = 5; c.perks = [];
    const p = pendingPerkSteps(c).find((x) => x.skill === 'sensory');
    expect(p?.free).toBe(2);
  });
});

void ({} as GameState);
