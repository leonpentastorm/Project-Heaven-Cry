// Rules 1.61 addendum (0.30.1; Leon's playtest on live 0.30.0): an item's own out-of-fight action (story/perk) is the
// engine's, so a Survival run takes it off the field, through the one runner; the story's own acts stay refused, and a use
// that would leave the Narrator a ruling is refused in words. The case: Blade Recluse's "Name your weapon" was refused as
// story at a shop. Field Surgery (the one injury treatment, with the field kit) works in a run the same way. Through the reducer.
import { describe, expect, it } from 'vitest';
import { type GameState, type RunNode, apply, RuleError, packOf } from '../src';
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
  it('a use that would leave the Narrator a ruling is refused, and nothing is spent', () => {
    const g = started(), c = Object.values(g.characters)[0]; c.perks = [...(c.perks || []), { id: 'bone_talk', tier: 'I' } as any];
    expect(refused(g, { type: 'story/perk', charId: c.id, id: 'perk:bone_talk', actionId: 'bone_talk_story', text: 'the scar on your hand' })).toMatch(/no Narrator to rule Bone Talk/);
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
