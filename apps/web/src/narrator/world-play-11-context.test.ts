// World Play 1.1 (rules 1.8) on the Narrator's side, part A5: ground[] and drops in submit_turn (optional, enum-free, so
// the tool stays the same all session), 'pile' kept out of the objects[] kinds, pickup among the actions, the rules text
// (piles, the engine rolls drops), the wiki's loot entries, and the turn prompt showing piles compactly (at most 6 piles,
// 3 entries each, "+N more"). A provider turn with ground[] and drops goes through the engine.
import { describe, expect, it } from 'vitest';
import { apply, newGame, ARCHETYPES, storyObjects, npcsOf, wikiLookup, viewFor, type GameState, type NarratorTurn } from '@engine';
import { RULES_PROMPT, submitTool, turnPrompt, groundText, GROUND_PILES } from './context';

const sheet = (name: string): any => { const a = ARCHETYPES[0]; return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'soldier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} }; };
const CAMP: any = { id: 'wp11ctx', title: 'Ground context', short: 'GC', kicker: 'TEST', pitch: ['A field.'], meta: 'Test.', arc: { beginning: 'a', middle: 'b', end: 'c' }, opening: 'Open.', startZone: 'field',
  zones: [{ id: 'field', name: 'The field', summary: 'Open ground.', w: 16, h: 12, solid: [], start: ['B2', 'B3'], enemyStart: ['O2'] }],
  missions: [{ id: 'm1', title: 'The core', act: 1, summary: 'Find it.', goal: 'Get out.', objectives: [{ id: 'find', text: 'Find it', done_when: 'Held.' }] }] };
function started(): GameState {
  let g = newGame('WPG1', { id: 'host', name: 'Leon' }, 'wpg');
  g = apply(g, { type: 'campaign/load', campaign: CAMP }, 'host');
  g = apply(g, { type: 'char/add', sheet: sheet('Rook') }, 'host');
  g = apply(g, { type: 'session/start' }, 'host');
  return apply(g, { type: 'narrator/turn', turn: { narration: 'The field.', sceneTitle: 'Field' } }, 'host');
}
const ask = (g: GameState): GameState => { const x = JSON.parse(JSON.stringify(g)); x.story.await = 'narrator'; x.story.work = { kind: 'round' }; return x; };
const turn = (g: GameState, t: Partial<NarratorTurn>) => apply(ask(g), { type: 'narrator/turn', turn: { narration: 'On.', ...t } as NarratorTurn }, 'host');

describe('World Play 1.1 in submit_turn', () => {
  it('ground[] and drops are optional and enum-free; pile is no objects[] kind; pickup is an action; the tool never changes', () => {
    let g = started(); const before = JSON.stringify(submitTool(g)), s: any = submitTool(g).input_schema;
    expect(s.properties.ground.items.required).toEqual(['at', 'items']); expect(s.required).not.toContain('ground');
    expect(s.properties.combat.anyOf[1].properties.enemies.items.properties.drops.type).toBe('object');
    expect(s.properties.npcs.items.properties.drops.type).toBe('object');
    expect(JSON.stringify(s.properties.ground)).not.toMatch(/"enum"/);
    expect(s.properties.objects.items.properties.kind.enum).not.toContain('pile'); expect(s.properties.objects.items.properties.kind.enum).toContain('cache');
    expect(s.properties.actions.items.properties.act.enum).toContain('pickup');
    g = turn(g, { ground: [{ at: 'D4', items: [{ item: 'mag:service_pistol', qty: 7 }, { item: 'rounds:.32 Decrkm', qty: 30 }] }] });
    expect(JSON.stringify(submitTool(g))).toBe(before);
  });
  it('the rules say piles exist, the engine rolls drops, and the Narrator may name a table or a short list', () => {
    expect(RULES_PROMPT).toMatch(/ground\[\] puts things on a tile/); expect(RULES_PROMPT).toMatch(/mag:<weapon id> and rounds:<calibre>/);
    expect(RULES_PROMPT).toMatch(/The engine rolls what the dead drop/); expect(RULES_PROMPT).toMatch(/drops: \{table\} or \{items\} \(at most 4\)/);
    expect(RULES_PROMPT).toMatch(/pickup \(tile\)/);
    expect(RULES_PROMPT).not.toMatch(/Objects sit on map tiles:[^\n]*\bpile\b/);
  });
  it('the wiki has the drop tables: loot:rules and one entry a table', () => {
    expect(wikiLookup('loot:rules')!.text).toMatch(/engine rolls it/); expect(wikiLookup('loot:rules')!.text).toMatch(/at most 4/);
    expect(wikiLookup('loot:machine')!.text).toMatch(/Spare-parts charge/i); expect(wikiLookup('loot:notable')!.text).toMatch(/Always something/);
  });
});

describe('piles in the turn prompt', () => {
  it('a Narrator ground[] pile shows compactly under OBJECTS ON THE MAP, its entries as labels', () => {
    let g = started();
    g = turn(g, { ground: [{ at: 'D4', items: [{ item: 'mag:service_pistol', qty: 7 }, { item: 'rounds:.32 Decrkm', qty: 30 }, { item: 'stim_injector', qty: 1 }, { item: 'cigarettes', qty: 1 }], hidden: true }] });
    expect(storyObjects(g).some((o) => o.kind === 'pile')).toBe(true);
    const p = turnPrompt(ask(g));
    expect(p).toMatch(/ON THE GROUND \(piles; players pick them up\): D4 \(unseen by the players\): [^\n]*magazine 7\/12[^\n]*\+1 more/);
    expect(p).not.toMatch(/pile-\d+-\d+ /); // no one-line-per-object listing for piles
  });
  it('at most 6 piles, then "+N more piles"', () => {
    let g = started();
    g = turn(g, { ground: ['D4', 'D5', 'D6', 'D7', 'D8', 'D9'].map((at) => ({ at, items: [{ item: 'cigarettes', qty: 1 }] })) });
    g = turn(g, { ground: ['E4', 'E5'].map((at) => ({ at, items: [{ item: 'cigarettes', qty: 1 }] })) });
    const piles = storyObjects(g).filter((o) => o.kind === 'pile'); expect(piles.length).toBe(8);
    const t = groundText(piles); expect((t.match(/: Pack of cigarettes/g) || []).length).toBe(GROUND_PILES); expect(t).toMatch(/\+2 more piles$/);
    expect(groundText([])).toBe('');
  });
  it('a provider turn with drops on an npcs[] place reaches the engine, and stays out of the player\'s view', () => {
    let g = started();
    g = turn(g, { npcs: [{ action: 'place', name: 'Courier', side: 'hostile', tier: 'soldier', weapon: 'service_pistol', at: 'K4', drops: { items: [{ item: '', qty: 1, name: 'A sealed letter', text: 'For the Warden.' }] } } as any] });
    expect((npcsOf(g).find((n) => n.name === 'Courier') as any).drops.items[0]).toMatchObject({ item: '', name: 'A sealed letter' }); // a plot item, as loot[] writes one
    expect(JSON.stringify(viewFor(g, 'host').story.npcs || [])).not.toMatch(/sealed letter/);
  });
});
