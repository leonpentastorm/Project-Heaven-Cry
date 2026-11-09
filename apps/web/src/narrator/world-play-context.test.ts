// World Play (rules 1.7) on the Narrator's side: the submit_turn schema takes the new fields (and stays the same all
// session, so the prompt cache holds), a provider's turn with them is applied by the engine, the rules carry the
// checklist and the two new rules, and the turn prompt tells the Narrator what fired, what was hit, what was tried and
// who carries whom.
import { describe, expect, it } from 'vitest';
import { apply, newGame, ARCHETYPES, keyOf, zoneMap, npcsOf, storyObjects, missionsOf, positionsOf, type GameState, type NarratorTurn } from '@engine';
import { anthropicProvider } from './anthropic';
import { RULES_PROMPT, MAP_TRUTH, PACING, CRAFT, submitTool, turnPrompt } from './context';

const sheet = (name: string): any => { const a = ARCHETYPES[0]; return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'soldier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} }; };
const CAMP: any = { id: 'wpctx', title: 'World Play context', short: 'WP', kicker: 'TEST', pitch: ['A field.'], meta: 'Test.', arc: { beginning: 'a', middle: 'b', end: 'c' }, opening: 'Open.', startZone: 'field',
  zones: [{ id: 'field', name: 'The field', summary: 'Open ground.', w: 16, h: 12, solid: [], start: ['B2', 'B3'], enemyStart: ['O2'] }],
  missions: [{ id: 'm1', title: 'The core', act: 1, summary: 'Find it.', goal: 'Get the core out.', objectives: [{ id: 'find', text: 'Find the core', done_when: 'Held.' }, { id: 'out', text: 'Get out', done_when: 'Gone.' }] }] };
function started(): GameState {
  let g = newGame('WPC1', { id: 'host', name: 'Leon' }, 'wpc');
  g = apply(g, { type: 'player/join', id: 'p2', name: 'Kim' }, 'host');
  g = apply(g, { type: 'campaign/load', campaign: CAMP }, 'host');
  g = apply(g, { type: 'char/add', sheet: sheet('Rook') }, 'host');
  g = apply(g, { type: 'char/add', sheet: sheet('Ash') }, 'p2');
  g = apply(g, { type: 'session/start' }, 'host');
  return apply(g, { type: 'narrator/turn', turn: { narration: 'The field.', sceneTitle: 'Field' } }, 'host');
}
const ask = (g: GameState): GameState => { const x = JSON.parse(JSON.stringify(g)); x.story.await = 'narrator'; x.story.work = { kind: 'round' }; return x; };
const rook = (g: GameState) => Object.values(g.characters).find((c) => c.owner === 'host')!;
const ok = (body: any) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json', 'request-id': 'req_wp' } });

/** A turn with every rules 1.7 field the Narrator can send. */
const worldTurn = (g: GameState): NarratorTurn => ({
  narration: 'A robot lies across the ramp, and the crates are still sealed.',
  npcs: [
    { action: 'place', name: 'Lantern', side: 'neutral', tier: 'minion', weapon: 'fists', at: 'C2', kind: 'robot', avatar: '', wants: 'To be carried out.', knows: { objective: 'out', hint: 'The pad is east at O6.' },
      talk: [{ label: 'Promise the arm', skills: ['empathy'], tn: 12, stakes: 'It trusts you, or it doesn\'t.', success: 'ally', fail: 'hostile' }, { label: 'Ask where', skills: ['charisma'], tn: 8, stakes: '', success: 'inform' }] },
    { action: 'carry', id: 'Lantern', charId: rook(g).id },
  ],
  objects: [{ action: 'place', id: '', kind: 'cache', at: 'C3', name: 'Platinum crate', text: 'Sealed.', locked: true, items: [{ item: '', qty: 1, name: 'Core', text: 'Warm.' }],
    approaches: [{ label: 'Crack the seal', skills: ['proficiency'], tn: 12, stakes: 'It may bite.', success: 'loot', fail: 'hurt' }, { label: 'Pull the core', skills: ['raw_power'], tn: 16, stakes: '', success: 'advance', objective: 'find', fail: 'alarm' }] }],
  hazards: [{ action: 'place', kind: 'minefield', severity: 'heavy', rect: { from: 'F1', to: 'G4' }, hidden: true, name: 'Old charges' }],
  triggers: [{ action: 'place', when: 'enter', tiles: ['J2'], then: 'fight', difficulty: 'standard', spawn: [{ action: 'place', name: 'Rearguard', side: 'hostile', tier: 'soldier', weapon: 'service_pistol', at: 'L2' }] }],
  missions: [{ mission: 'm1', objective: 'find', where: { zone: 'field', refs: ['C3'] } }],
  actions: [{ charId: rook(g).id, act: 'attempt', objId: '', index: 1 }],
});

describe('the World Play fields in submit_turn', () => {
  it('are in the tool, optional, and the tool never changes during the session (the prompt cache holds)', () => {
    let g = started(); const before = JSON.stringify(submitTool(g)), s: any = submitTool(g).input_schema;
    for (const f of ['hazards', 'triggers']) { expect(s.properties[f]).toBeTruthy(); expect(s.required).not.toContain(f); }
    expect(s.properties.npcs.items.properties.action.enum).toEqual(['place', 'move', 'update', 'remove', 'carry', 'drop']);
    for (const f of ['kind', 'avatar', 'charId', 'wants', 'knows', 'talk']) expect(s.properties.npcs.items.properties[f]).toBeTruthy();
    expect(s.properties.objects.items.properties.items).toBeTruthy();
    const ap = s.properties.objects.items.properties.approaches.items.properties;
    expect(ap.success.enum).toEqual(['', 'remove', 'open', 'reveal', 'disarm', 'loot', 'advance', 'ally', 'inform']);
    expect(ap.fail.enum).toEqual(['', 'hurt', 'alarm', 'condition', 'jam', 'lose', 'hostile']);
    for (const f of ['objective', 'failCondition', 'failItem']) expect(ap[f]).toBeTruthy();
    expect(s.properties.npcs.items.properties.talk.items.properties.fail.enum).toContain('hostile');
    expect(s.properties.missions.items.properties.where).toBeTruthy(); expect(s.properties.missions.items.required).toEqual(['mission']);
    for (const a of ['carry', 'put_down', 'search', 'attempt', 'ask']) expect(s.properties.actions.items.properties.act.enum).toContain(a);
    expect(s.properties.actions.items.properties.index).toBeTruthy();
    // Rules 1.9 (review fix): a typed "tactical reload" or "reload my off-hand gun" maps to world/act reload {tactical, hand}.
    expect(s.properties.actions.items.properties.tactical).toEqual({ type: 'boolean' }); expect(s.properties.actions.items.properties.hand.enum).toEqual(['main', 'off', 'both']);
    expect(RULES_PROMPT).toMatch(/reload \(tactical: the magazine to the pack, \+1 AP; hand\)/);
    expect(RULES_PROMPT).toMatch(/what the dead carry is the engine's \(piles\)/); expect(RULES_PROMPT).not.toMatch(/a body searched/);
    // A turn full of world play, hazards placed and fired, changes nothing in the tool.
    g = apply(ask(g), { type: 'narrator/turn', turn: worldTurn(g) }, 'host');
    expect(JSON.stringify(submitTool(g))).toBe(before);
  });
  it('a provider\'s submit_turn with them comes back whole, and the engine applies every one', async () => {
    let g = started();
    const t = worldTurn(g), submit = { id: 'msg_wp', type: 'message', role: 'assistant', model: 'claude-opus-5-5', stop_reason: 'tool_use', stop_sequence: null,
      content: [{ type: 'tool_use', id: 'tu_wp', name: 'submit_turn', input: t }], usage: { input_tokens: 1000, output_tokens: 400, cache_read_input_tokens: 20000, cache_creation_input_tokens: 0 } };
    const r = await anthropicProvider('sk-ant-test', 'claude-opus-5-5', 'medium', (async () => ok(submit)) as typeof fetch).turn(ask(g));
    expect(r.turn.hazards).toEqual(t.hazards); expect(r.turn.triggers).toEqual(t.triggers);
    g = apply(ask(g), { type: 'narrator/turn', turn: r.turn }, 'host');
    // carried (placed, then carried in the same turn)
    expect(rook(g).carried?.[0].npc).toMatchObject({ name: 'Lantern', kind: 'robot', wants: 'To be carried out.' });
    expect(npcsOf(g).some((n) => n.name === 'Lantern')).toBe(false);
    // the cache, its approaches and their effects
    const crate = storyObjects(g).find((o) => o.name === 'Platinum crate')!;
    expect(crate).toMatchObject({ kind: 'cache', locked: true }); expect(crate.items).toEqual([{ item: '', qty: 1, name: 'Core', text: 'Warm.' }]);
    expect(crate.approaches.map((a) => [a.success, a.fail, a.objective])).toEqual([['loot', 'hurt', undefined], ['advance', 'alarm', 'find']]);
    // the hazard (hidden, a rectangle) and the trigger
    expect(g.story.hazards![0]).toMatchObject({ kind: 'minefield', severity: 'heavy', hidden: true }); expect(g.story.hazards![0].tiles.length).toBe(8);
    expect(g.story.triggers![0]).toMatchObject({ when: 'enter', then: 'fight', tiles: [keyOf('J2', zoneMap(g))] });
    expect(missionsOf(g)!.where!['m1/find']).toEqual({ zone: 'field', refs: ['C3'] });
    // The typed attempt (no objId: refused by the engine and reported, never granted).
    expect(g.story.entries.some((e) => /can't attempt/.test(e.text))).toBe(true);
    expect(positionsOf(g)[rook(g).id]).toBe(keyOf('B2', zoneMap(g)));
  });
});

describe('the World Play rules for the Narrator', () => {
  it('the map checklist gains section 10\'s lines; PACING the plain-objectives and no-typing-past-checks rules; CRAFT stays', () => {
    expect(MAP_TRUTH).toMatch(/placed, with a face/); expect(MAP_TRUTH).toMatch(/Carried people ride in the inventory/i);
    expect(MAP_TRUTH).toMatch(/Loot sits in caches and piles; dangers are hazards; ambushes are triggers/); expect(MAP_TRUTH).toMatch(/has wants \(and talk when they matter\); every objective you open has where/);
    expect(PACING).toMatch(/say what, where and why, plainly/); expect(PACING).toMatch(/Typing can't skip a check/);
    expect(RULES_PROMPT).toContain(CRAFT); expect(RULES_PROMPT).toContain(PACING); expect(RULES_PROMPT).toContain(MAP_TRUTH);
    expect(RULES_PROMPT).toMatch(/hazards\[\]: kind minefield, fire, radiation, gas or collapse/); expect(RULES_PROMPT).toMatch(/triggers\[\]: when enter/);
    expect(RULES_PROMPT).toMatch(/carry \(targetId\), put_down \(targetId, to\), search \(objId\), attempt/);
  });
  it('the turn prompt carries hazards, triggers, carried people, people\'s wants and talk, cache contents, and SINCE YOUR LAST TURN', () => {
    let g = started();
    g = apply(ask(g), { type: 'narrator/turn', turn: { ...worldTurn(g), actions: [], npcs: [worldTurn(g).npcs![0], { action: 'place', name: 'Ilse', side: 'neutral', tier: 'minion', weapon: 'fists', at: 'D5' }] } }, 'host');
    g = apply(g, { type: 'world/act', charId: rook(g).id, act: 'carry', targetId: npcsOf(g).find((n) => n.name === 'Lantern')!.id }, 'host');
    const ash = Object.values(g.characters).find((c) => c.owner === 'p2')!;
    g = JSON.parse(JSON.stringify(g)); g.story.positions![ash.id] = keyOf('E3', zoneMap(g))!;
    g = apply(g, { type: 'world/act', charId: ash.id, act: 'move', to: 'F3' }, 'p2'); // into the hidden minefield (Rook carries 40 kg: too slow to go far)
    const p = turnPrompt(g.phase === 'story' ? ask(g) : g);
    expect(p).toMatch(/HAZARDS ON THE MAP[^\n]*\n  hz\d+ Old charges \(minefield, heavy/);
    expect(p).toMatch(/CARRIED: Rook carries Lantern \(robot, 40 kg/);
    expect(p).toMatch(/SINCE YOUR LAST TURN[^\n]*\n- Rook picked up Lantern/);
    expect(p).toMatch(/- Ash set off a minefield at F/);
    expect(p).toMatch(/Platinum crate \(cache, locked, holds: Core\)/);
    expect(p).toMatch(/1\. Crack the seal \[proficiency TN 12, loot, fail hurt\]/);
    expect(p).toMatch(/Ilse \(neutral, minion, fists\) at D5\n    wants: \(none set\)/);
    expect(p).toMatch(/TRIGGERS SET[^\n]*\n  tg\d+ on enter J2: fight Rearguard/);
  });
});
