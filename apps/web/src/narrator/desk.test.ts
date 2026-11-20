// Rules 1.84 (item 7202): the human Narrator's desk writes the AI Narrator's own turn. Its fields ARE the submit_turn
// tool's (one list, read from the tool), what it sends is that tool's input shape, and the engine applies it through the
// same action (narrator/turn, the reducer).
import { describe, expect, it, beforeEach } from 'vitest';
import { apply, newGame, ARCHETYPES, npcsOf, refOf, viewFor, type GameState } from '@engine';
import { submitTool } from './context';
import { DESK_OWN, deskFields, deskTurn, setDeskField, resetDesk, clean } from './desk';

const sheet = (name: string): any => { const a = ARCHETYPES[0]; return { name, portrait: '', origin: 'Thousand-Planet frontier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} }; };
const CAMP: any = { id: 'desk', title: 'Desk', short: 'D', kicker: 'TEST', pitch: ['A yard.'], meta: 'Test.', arc: { beginning: 'a', middle: 'b', end: 'c' }, opening: 'Open.', startZone: 'yard',
  zones: [{ id: 'yard', name: 'The yard', summary: 'Open ground.', w: 16, h: 12, solid: [], start: ['B2', 'B3'], enemyStart: ['O2'] }] };
/** A narrated room: the host narrates (no character), a guest plays. */
function room(): GameState {
  let g = newGame('DESK1', { id: 'host', name: 'Leon' }, 'desk');
  g = apply(g, { type: 'player/join', id: 'p2', name: 'Mai' }, 'host');
  g = apply(g, { type: 'settings', patch: { mode: 'human' } }, 'host');
  g = apply(g, { type: 'campaign/load', campaign: CAMP }, 'host');
  g = apply(g, { type: 'char/add', sheet: sheet('Vey') }, 'p2');
  g = apply(g, { type: 'session/start' }, 'host');
  return apply(g, { type: 'narrator/turn', turn: { narration: 'The yard.', sceneTitle: 'Yard' } }, 'host');
}

describe('rules 1.84: the Narrator\'s desk is the AI Narrator\'s tool', () => {
  beforeEach(() => resetDesk());
  it('every field of the AI\'s submit_turn shows on the desk, once: the template\'s own four, the rest drawn from the tool', () => {
    const g = room(), tool = Object.keys((submitTool(g).input_schema as any).properties);
    const desk = deskFields(g).map((f) => f.key);
    expect([...DESK_OWN, ...desk].sort()).toEqual([...tool].sort());
    for (const k of ['hooks', 'npcs', 'objects', 'hazards', 'triggers', 'loot', 'xp', 'combat']) expect(desk).toContain(k);
    expect(deskFields(g).every((f) => f.label && !/^[a-z]/.test(f.label))).toBe(true);
  });
  it('an empty field is left out; numbers are numbers; a fight is sent only when it is included', () => {
    const g = room(), F = Object.fromEntries(deskFields(g).map((f) => [f.key, f.schema]));
    expect(clean(F.hooks, [{ skill: '', tn: 8, truth: 'true', line: '' }])).toEqual([{ tn: 8, truth: 'true' }]);
    expect(clean(F.xp, [{ charId: 'all', source: 'quest', amount: '150', reason: '' }])).toEqual([{ charId: 'all', source: 'quest', amount: 150 }]);
    expect(clean(F.mana, '')).toBeUndefined(); expect(clean(F.mana, '32')).toBe(32);
    expect(clean(F.combat, undefined)).toBeUndefined();
    setDeskField('ooc', '   ');
    expect(deskTurn(g)).toEqual({});
  });
  it('what the desk sends, the engine applies through narrator/turn: a hook, a lurker, XP and loot', () => {
    let g = room(); const cid = Object.keys(g.characters)[0];
    setDeskField('hooks', [{ skill: 'conscience', tn: 8, truth: 'partial', line: 'The yard is too quiet for a supply day.' }]);
    setDeskField('npcs', [{ action: 'place', name: 'Watcher on the wall', side: 'hostile', tier: 'minion', weapon: 'service_pistol', at: refOf('12,8'), hidden: true }]);
    setDeskField('xp', [{ charId: cid, source: 'discovery', amount: '40', reason: 'read the yard' }]);
    setDeskField('loot', [{ charId: cid, item: 'stim', qty: '2', rarity: 'standard' }]);
    const extra = deskTurn(g);
    expect(Object.keys(extra).sort()).toEqual(['hooks', 'loot', 'npcs', 'xp']);
    const xp0 = g.characters[cid].xp;
    g = { ...g, story: { ...g.story, await: 'narrator', work: { kind: 'round' } } } as GameState;
    g = apply(g, { type: 'narrator/turn', turn: { ...extra, narration: 'Dust lifts off the yard.' } }, 'host');
    expect(g.story.scene.hooks.map((h) => h.truth + ' ' + h.tn)).toContain('partial 8');
    expect(npcsOf(g).some((n) => n.name === 'Watcher on the wall' && n.hidden)).toBe(true);
    expect(g.characters[cid].xp).toBe(xp0 + 40);
    // the Narrator's seat sees the lurker and the hook; the guest's view has neither
    expect(viewFor(g, 'host').story.scene.hooks.length).toBe(1);
    expect((viewFor(g, 'host').story.npcs || []).some((n) => n.hidden)).toBe(true);
    expect((viewFor(g, 'p2').story.npcs || []).some((n) => n.name === 'Watcher on the wall')).toBe(false);
    expect(viewFor(g, 'p2').story.scene.hooks).toEqual([]);
  });
  it("0.33: ground items, a trigger's spawn list and drops are rows from the tool's own shape (no JSON box), and the engine takes them", () => {
    let g = room(); const F = Object.fromEntries(deskFields(g).map((f) => [f.key, f.schema])) as any;
    // the shapes are the tool's own: a cache's loot row (for the ground and drops) and the npcs[] place shape's fields
    const tool: any = submitTool(g).input_schema, row = tool.properties.objects.items.properties.items.items;
    expect(F.ground.items.properties.items.items).toEqual(row);
    expect(F.npcs.items.properties.drops.properties.items.items).toEqual(row);
    expect(F.combat.anyOf[1].properties.enemies.items.properties.drops.properties.items.items).toEqual(row);
    for (const [k, v] of Object.entries(F.triggers.items.properties.spawn.items.properties)) expect(v).toEqual(tool.properties.npcs.items.properties[k]);
    // the AI's tool itself is not changed (it stays open: no token added to every call)
    expect(tool.properties.ground.items.properties.items.items).toEqual({ type: 'object' });
    // a row as the desk holds it (numbers typed as text, empty fields) is cleaned to the tool's shape
    expect(clean(F.ground, [{ at: 'D4', items: [{ item: 'stim', qty: '2', rarity: '', name: '' }] }])).toEqual([{ at: 'D4', items: [{ item: 'stim', qty: 2 }] }]);
    setDeskField('ground', [{ at: 'D4', items: [{ item: 'stim_injector', qty: '2' }] }]);
    setDeskField('triggers', [{ action: 'place', when: 'enter', tiles: ['F6'], then: 'spawn', spawn: [{ name: 'Late guard', side: 'hostile', tier: 'minion', weapon: 'service_pistol', at: 'H6' }] }]);
    setDeskField('npcs', [{ action: 'place', name: 'Quartermaster', side: 'neutral', tier: 'minion', weapon: 'service_pistol', at: 'J8', drops: { table: '', items: [{ item: 'stim', qty: '3' }] } }]);
    const extra: any = deskTurn(g);
    expect(extra.triggers[0].spawn[0]).toEqual({ name: 'Late guard', side: 'hostile', tier: 'minion', weapon: 'service_pistol', at: 'H6' });
    expect(extra.npcs[0].drops).toEqual({ items: [{ item: 'stim', qty: 3 }] });
    g = { ...g, story: { ...g.story, await: 'narrator', work: { kind: 'round' } } } as GameState;
    g = apply(g, { type: 'narrator/turn', turn: { ...extra, narration: 'Things change in the yard.' } }, 'host');
    expect(JSON.stringify((g.story.objects || []).filter((o: any) => o.kind === 'pile'))).toMatch(/stim_injector/);
    expect(((g.story as any).triggers || []).some((t: any) => t.then === 'spawn' && t.spawn?.[0]?.name === 'Late guard')).toBe(true);
    expect(npcsOf(g).find((n) => n.name === 'Quartermaster')?.drops).toEqual({ items: [{ item: 'stim', qty: 3 }] });
  });
});
