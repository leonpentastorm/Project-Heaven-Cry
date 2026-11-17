// Rules 1.61 addendum (0.30.1; Leon's playtest on live 0.30.0): an item's own out-of-fight action (story/perk) is the
// engine's, so a Survival run takes it off the field, through the one runner; the story's own acts stay refused, and a use
// that would leave the Narrator a ruling is refused in words. The case: Blade Recluse's "Name your weapon" was refused as
// story at a shop. Field Surgery (the one injury treatment, with the field kit) works in a run the same way. Through the reducer.
import { describe, expect, it } from 'vitest';
import { type GameState, type RunNode, apply, RuleError, packOf, giveView, reachable, plateChoices, MODULE, runItemWhy, perkActionsFor, ITEM } from '../src';
import { survivalRoom, startRun, ownerOf } from './helpers/survival';

const SEED = 'PHC-0001';
const refused = (g: GameState, a: any, by = 'host') => { try { apply(g, a, by); } catch (e) { expect(e).toBeInstanceOf(RuleError); return (e as Error).message; } throw new Error('expected a refusal: ' + a.type); };
const started = (): GameState => JSON.parse(JSON.stringify(startRun(survivalRoom(SEED, [{ build: 'plain_gun', level: 1 }], { test: true }), SEED)));
/** The run at the node before the first shop, then into it through run/move. */
function inShop(g0: GameState): GameState {
  const shop = g0.run!.nodes.find((n) => n.kind === 'shop')! as RunNode, prev = g0.run!.nodes.find((x) => x.links.includes(shop.id))!;
  let x: GameState = JSON.parse(JSON.stringify(g0)); x.run!.at = prev.id; x.run!.state = 'map';
  for (let i = 0; i < 4 && x.run!.at !== shop.id; i++) x = apply(x, { type: 'run/move', node: shop.id } as any, ownerOf(i));
  return x;
}
const recluse = (g: GameState) => { const c = Object.values(g.characters)[0]; c.traits = [...(c.traits || []), 'blade_recluse']; c.weapon = 'service_pistol'; return c; };
const NAME = (id: string) => ({ type: 'story/perk', charId: id, id: 'trait:blade_recluse', actionId: 'name_blade' });

describe('a Survival run takes an item\'s own out-of-fight action (story/perk)', () => {
  it('Blade Recluse names the weapon in hand on the path map', () => {
    const g0 = started(); expect(g0.run!.state).toBe('map'); const c = recluse(g0);
    const g = apply(g0, NAME(c.id) as any, 'host');
    expect((g.characters[c.id] as any).state.oneBlade).toMatchObject({ weapon: 'service_pistol' });
    expect(g.story.rulings || []).toEqual([]); // a record in the log, not a ruling nobody answers
    expect(g.story.entries.some((e: any) => /names the .* the One Blade/.test(e.text))).toBe(true);
    expect(refused(g, NAME(c.id))).toMatch(/Already your One Blade/);
  });
  it('and at a shop', () => {
    const g0 = inShop(started()); expect(g0.run!.state).toBe('shop'); const c = recluse(g0);
    const g = apply(g0, NAME(c.id) as any, 'host');
    expect((g.characters[c.id] as any).state.oneBlade).toMatchObject({ weapon: 'service_pistol' });
  });
  it('the story\'s own acts are still refused in a run', () => {
    const g = started(), c = Object.values(g.characters)[0];
    expect(refused(g, { type: 'world/act', charId: c.id, act: 'search', objId: 'x' })).toMatch(/no Narrator and no story/);
    expect(refused(g, { type: 'world/act', charId: c.id, act: 'perk', id: 'trait:blade_recluse', actionId: 'name_blade' })).toMatch(/no Narrator and no story/);
    expect(refused(g, { type: 'story/move', charId: c.id, to: 'A1' })).toMatch(/no Narrator and no story/);
  });
  it("only an action with the 'run' scope: the rest work in a story, not in a run (item 4761), greyed on the sheet the same way", () => {
    const g = started(), c = Object.values(g.characters)[0]; c.perks = [...(c.perks || []), { id: 'bone_talk', tier: 'I' } as any];
    expect(refused(g, { type: 'story/perk', charId: c.id, id: 'perk:bone_talk', actionId: 'bone_talk_story', text: 'the scar on your hand' })).toBe('Bone Talk works in a story, not in a run.');
    expect(runItemWhy(g, c, 'perk:bone_talk', 'bone_talk_story')).toBe('Bone Talk works in a story, not in a run.');
  });
  // Rules 1.64 items 5000 and 5001 (Leon: "keep field surgeon, increase the price of the part. triage is one per whole map of survival")
  it("the Mender's story Triage works in a run once a stage map for each Mender, and the sheet's button says it is spent", () => {
    const d = duo(); d.characters.c1.classId = 'bard'; d.characters.c2.hp = 10;
    const tri = { type: 'story/perk', charId: 'c1', id: 'class:medic.triage', actionId: 'triage_story', choice: 'c2' } as any;
    expect(runItemWhy(d, d.characters.c1, 'class:medic.triage', 'triage_story')).toBeNull();
    const g = apply(d, tri, ownerOf(0)); expect(g.characters.c2.hp).toBeGreaterThan(10);
    g.characters.c2.hp = 10;
    expect(refused(g, tri, ownerOf(0))).toMatch(/Spent on this stage map/);
    const row = perkActionsFor({ c: g.characters.c1, g } as any, 'story').find((e: any) => e.actionId === 'triage_story') as any;
    expect(row.why).toMatch(/Spent on this stage map/);
    // the next stage's map: fresh again
    const n: GameState = JSON.parse(JSON.stringify(g)); n.run!.stage = 2;
    expect(apply(n, tri, ownerOf(0)).characters.c2.hp).toBeGreaterThan(10);
  });
  it('Triage stays spent when the squad walks on to the next stop (each stop is a new scene), and is fresh on the next stage and in a new run', () => {
    const d = duo(); d.characters.c1.classId = 'bard'; d.characters.c2.hp = 10;
    const tri = { type: 'story/perk', charId: 'c1', id: 'class:medic.triage', actionId: 'triage_story', choice: 'c2' } as any;
    const g = apply(d, tri, ownerOf(0)); const scene = g.story.scene.n;
    const s = walkTo(g, 'shop'); expect(s.run!.state).toBe('shop'); expect(s.story.scene.n).not.toBe(scene); // run/move entered a new scene
    s.characters.c2.hp = 10;
    expect(refused(s, tri, ownerOf(0))).toMatch(/Spent on this stage map/);
    const r = walkTo(s, 'rest'); r.characters.c2.hp = 10;
    expect(refused(r, tri, ownerOf(0))).toMatch(/Spent on this stage map/);
    const n: GameState = JSON.parse(JSON.stringify(s)); n.run!.stage = 2;
    expect(apply(n, tri, ownerOf(0)).characters.c2.hp).toBeGreaterThan(10);
    const fresh: GameState = JSON.parse(JSON.stringify(s)); fresh.run!.seed = 'PHC-0002';
    expect(apply(fresh, tri, ownerOf(0)).characters.c2.hp).toBeGreaterThan(10);
  });
  it("Field Surgeon's Patch works in a run for one spare-parts charge, priced from data", () => {
    const d = duo(), c = d.characters.c1; c.perks = [...(c.perks || []), { id: 'field_surgeon' } as any]; c.skills.proficiency = 3;
    c.pack = [...packOf(c), { id: 'spare_parts', item: 'spare_parts', name: 'Spare-parts charge', qty: 1, kind: 'tool' } as any]; d.characters.c2.hp = 10;
    const pat = { type: 'story/perk', charId: 'c1', id: 'perk:field_surgeon', actionId: 'patch', choice: 'c2' } as any;
    const g = apply(d, pat, ownerOf(0));
    expect(g.characters.c2.hp).toBeGreaterThan(10);
    expect(packOf(g.characters.c1).some((x) => (x.item || x.id) === 'spare_parts')).toBe(false);
    expect(refused(g, pat, ownerOf(0))).toMatch(/No spare-parts charges/);
    expect((ITEM as any).spare_parts.price_credits).toBe(60);
  });
  it('the ruling guard is the second net: a run action that would leave the Narrator a ruling is refused, and nothing is spent', () => {
    const g = started(), c = Object.values(g.characters)[0]; c.traits = [...(c.traits || []), 'lunarshine'];
    c.pack = packOf(c).filter((x) => (x.item || x.id) !== 'bottle_of_spirits'); const before = JSON.stringify(c);
    expect(refused(g, { type: 'story/perk', charId: c.id, id: 'trait:lunarshine', actionId: 'drink' })).toMatch(/no Narrator to rule Lunarshine/);
    expect(JSON.stringify(g.characters[c.id])).toBe(before);
  });
  it('the free fit is refused on what will run, not on the field sent: no actionId, or an empty one (item 4762)', () => {
    const g = started(), c = Object.values(g.characters)[0]; c.traits = [...(c.traits || []), 'gun_nut'];
    for (const extra of [{}, { actionId: '' }]) expect(refused(g, { type: 'story/perk', charId: c.id, id: 'trait:gun_nut', choice: '0', ...extra })).toBe('In a Survival run, the armourer fits mods at a Forge, for a fee.');
  });
  it("the One Blade's second mod is the Forge's in a run (rules 1.55): the free fit is refused, pointing to the Forge", () => {
    const g0 = started(), c = recluse(g0); const g = apply(g0, NAME(c.id) as any, 'host');
    expect(refused(g, { type: 'story/perk', charId: c.id, id: 'trait:blade_recluse', actionId: 'extra_mod', choice: '0' })).toBe('In a Survival run, the armourer fits mods at a Forge, for a fee.');
  });
  it('Field Surgery treats an arm or leg injury in a run, with the field kit, on yourself or a squadmate', () => {
    const g0 = inShop(started()), c = Object.values(g0.characters)[0];
    c.skills.empathy = 3; c.weapon = 'attuner'; c.offHand = null as any; c.mp = 999;
    c.pack = [...packOf(c), { id: 'field_kit', item: 'field_kit', name: 'Field kit', qty: 1, kind: 'tool' } as any];
    c.injuries = [{ loc: 'leg', side: 'left' }];
    const g = apply(g0, { type: 'story/perk', charId: c.id, id: 'verb:tend.field_surgery', actionId: 'injury' } as any, 'host');
    expect(g.characters[c.id].injuries).toEqual([]);
    expect(g.story.entries.some((e: any) => /field surgery on .*the left leg is treated/.test(e.text))).toBe(true);
    // without the kit the one rule refuses in its own words
    const bare: GameState = JSON.parse(JSON.stringify(g0)); bare.characters[c.id].pack = packOf(c).filter((x) => (x.item || x.id) !== 'field_kit');
    expect(refused(bare, { type: 'story/perk', charId: c.id, id: 'verb:tend.field_surgery', actionId: 'injury' })).toMatch(/Needs a field kit/);
  });
});

// Rules 1.61 addendum items 4747 to 4751 (the lead's round 2): the field kit's own use, the toolbox as a kit, the Rest.
const DUO = [{ build: 'plain_gun', level: 1 }, { build: 'sigil', level: 1 }] as any;
const duo = (): GameState => JSON.parse(JSON.stringify(startRun(survivalRoom(SEED, DUO, { test: true }), SEED)));
const line = (id: string, qty = 1) => ({ id, item: id, name: id, qty, kind: 'tool' }) as any;
const kitCount = (g: GameState, id: string, item = 'field_kit') => packOf(g.characters[id]).filter((x) => (x.item || x.id) === item).reduce((t, x) => t + x.qty, 0);
/** A plain character (no Empathy, no Attuner) with a leg injury and `qty` field kits. */
function hurt(g: GameState, id = 'c1', qty = 1, item = 'field_kit') { const c = g.characters[id]; c.skills.empathy = 0; c.pack = [...packOf(c).filter((x) => (x.item || x.id) !== 'field_kit'), line(item, qty)]; c.injuries = [{ loc: 'leg', side: 'right' }]; return c; }
const USE = (from: string, to: string) => ({ type: 'gear/use', charId: from, item: 'field_kit', targetId: to });
function walkTo(g0: GameState, kind: string): GameState {
  const n = g0.run!.nodes.find((x) => x.kind === kind)! as RunNode, prev = g0.run!.nodes.find((x) => x.links.includes(n.id))!;
  let x: GameState = JSON.parse(JSON.stringify(g0)); x.run!.at = prev.id; x.run!.state = 'map';
  for (let i = 0; i < 4 && x.run!.at !== n.id; i++) x = apply(x, { type: 'run/move', node: n.id } as any, ownerOf(i));
  return x;
}

describe('the field kit treats a limb in a run (rules 1.61 addendum)', () => {
  it('anyone uses it at a shop on themself: the leg is treated and the kit is spent', () => {
    const g0 = walkTo(duo(), 'shop'), c = hurt(g0, 'c1', 2);
    expect(giveView(g0, 'host', 'c1').rows.find((r) => r.id === 'field_kit')?.use?.why.c1).toBeNull(); // the screen's Use button
    const g = apply(g0, USE('c1', 'c1') as any, 'host');
    expect(g.characters.c1.injuries).toEqual([]); expect(kitCount(g, 'c1')).toBe(1);
    expect(g.story.entries.some((e: any) => /treats their own right leg/.test(e.text))).toBe(true);
    expect(refused(g, USE('c1', 'c1'))).toBe(c.name + ' has no arm or leg injury.');
  });
  it('on a squadmate, from the path map; the last kit goes from the pack', () => {
    const g0 = duo(); hurt(g0, 'c1', 1); g0.characters.c2.injuries = [{ loc: 'arm' }]; g0.characters.c1.injuries = [];
    const g = apply(g0, USE('c1', 'c2') as any, 'host');
    expect(g.characters.c2.injuries).toEqual([]); expect(kitCount(g, 'c1')).toBe(0);
    expect(refused(g, USE('c1', 'c2'))).toMatch(/has no Field kit/i);
  });
  it('refused in a fight, and on the field after it', () => {
    const g0 = duo(), fight = reachable(g0.run!).find((n) => n.kind === 'fight')!;
    let g = g0; for (let i = 0; i < 2 && g.run!.state !== 'fight'; i++) g = apply(g, { type: 'run/move', node: fight.id } as any, ownerOf(i));
    g = JSON.parse(JSON.stringify(g)); hurt(g);
    expect(refused(g, USE('c1', 'c1'))).toMatch(/Not in a fight/);
    const f: GameState = JSON.parse(JSON.stringify(apply(g, { type: 'run/skip' } as any, 'host'))); expect(f.run!.state).toBe('field');
    hurt(f); expect(refused(f, USE('c1', 'c1'))).toBe('Not on the field: treat it once the squad leaves.');
  });
  it('the toolbox stands in for a field kit only for Field Surgery: no Treat of its own, never used up', () => {
    const g0 = walkTo(duo(), 'shop'); hurt(g0, 'c1', 1, 'toolbox');
    expect(giveView(g0, 'host', 'c1').rows.find((r) => r.id === 'toolbox')?.use).toBeUndefined();
    expect(refused(g0, USE('c1', 'c1'))).toMatch(/has no Field kit/i);
    const s: GameState = JSON.parse(JSON.stringify(g0)), c = s.characters.c1; c.skills.empathy = 3; c.weapon = 'attuner'; c.offHand = null as any; c.mp = 999;
    const t = apply(s, { type: 'story/perk', charId: 'c1', id: 'verb:tend.field_surgery', actionId: 'injury' } as any, 'host');
    expect(t.characters.c1.injuries).toEqual([]); expect(kitCount(t, 'c1', 'toolbox')).toBe(1);
  });
  it('a Rest treats every limb injury of who rests', () => {
    const g0 = duo(); g0.characters.c1.injuries = [{ loc: 'leg' }, { loc: 'arm', side: 'left' }]; g0.characters.c2.injuries = [{ loc: 'arm' }];
    const g = walkTo(g0, 'rest');
    expect(g.characters.c1.injuries).toEqual([]); expect(g.characters.c2.injuries).toEqual([]);
  });
  it("Overhaul's extra slot is a free fit: refused in a run with the Forge's words", () => {
    const g = duo(), c = g.characters.c1; c.perks = [...(c.perks || []), { id: 'overhaul', tier: 'mastered' } as any];
    expect(refused(g, { type: 'story/perk', charId: 'c1', id: 'perk:overhaul', actionId: 'extra_slot', choice: '0' })).toBe('In a Survival run, the armourer fits mods at a Forge, for a fee.');
  });
});

// Rules 1.61 addendum item 4758 (Leon: "you use it in your inventory and choose one"): a plate bought at a shop has no
// lesson written on it; magic/learn from it takes the lesson the player chooses of plateChoices (what it can teach now).
describe('a blank plate teaches the lesson the player chooses', () => {
  const blank = (g: GameState, id: string, kind: string) => { const c = g.characters[id]; c.pack = [...packOf(c), { id: kind, item: kind, name: kind, qty: 1, kind: 'tool' } as any]; return c; };
  it('a Sigil plate at a shop: a word of the choices is learned and the plate crumbles; a known word is refused', () => {
    const g0 = walkTo(duo(), 'shop'), c = blank(g0, 'c2', 'sigil_plate');
    const known = (c.sigils || [])[0], choices = plateChoices(c, 'sigil_plate').map((m) => m.word!);
    expect(choices.length).toBeGreaterThan(0); if (known) expect(choices).not.toContain(known);
    if (known) expect(refused(g0, { type: 'magic/learn', charId: 'c2', word: known, from: 'plate' }, 'p2')).toMatch(/already knows/);
    const g = apply(g0, { type: 'magic/learn', charId: 'c2', word: choices[0], from: 'plate' } as any, 'p2');
    expect(g.characters.c2.sigils).toContain(choices[0]); expect(kitCount(g, 'c2', 'sigil_plate')).toBe(0);
  });
  it('a Heart plate: a school of the choices is learned; a module the gates refuse is not offered and is refused', () => {
    const g0 = walkTo(duo(), 'shop'), c = blank(g0, 'c1', 'heart_plate'), ch = plateChoices(c, 'heart_plate');
    const school = ch.find((m) => m.school)!.school!;
    const g = apply(g0, { type: 'magic/learn', charId: 'c1', school, from: 'plate' } as any, 'host');
    expect(g.characters.c1.soulKnown?.schools).toContain(school); expect(kitCount(g, 'c1', 'heart_plate')).toBe(0);
    const gated = Object.keys(MODULE).find((m) => !ch.some((x) => x.module === m) && !(c.soulKnown?.modules || []).includes(m));
    if (gated) expect(() => apply(g0, { type: 'magic/learn', charId: 'c1', module: gated, from: 'plate' } as any, 'host')).toThrow();
  });
});
