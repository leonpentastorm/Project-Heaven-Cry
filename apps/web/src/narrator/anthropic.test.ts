import { describe, expect, it } from 'vitest';
import { apply, newGame, ARCHETYPES, BUILT_IN_CAMPAIGNS, type GameState } from '@engine';
import { anthropicProvider } from './anthropic';
import { turnSchema, loreKeys, loreFor, RULES_PROMPT, campaignPrompt, partyPrompt, turnPrompt } from './context';

function game(): GameState {
  let g = newGame('ABC123', { id: 'host', name: 'Leon' });
  const a = ARCHETYPES.find((x: any) => x.id === 'field_medic')!;
  g = apply(g, { type: 'char/add', sheet: { name: 'MPAT', portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } }, 'host');
  return apply(g, { type: 'session/start' }, 'host');
}
const TURN = { narration: 'The pad hums.', sceneTitle: 'The rear pad', hooks: [], checks: [], overreach: [], xp: [], deeds: [], combat: null, endScene: null };
const ok = (body: any) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json', 'request-id': 'req_test' } });
const message = { id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5-5', stop_reason: 'end_turn', stop_sequence: null,
  content: [{ type: 'text', text: JSON.stringify(TURN) }], usage: { input_tokens: 1200, output_tokens: 300, cache_read_input_tokens: 20000, cache_creation_input_tokens: 0 } };

describe('Narrator context', () => {
  it('never shows the Narrator a player\'s real name, only character names', () => {
    let g = game();
    g = apply(g, { type: 'player/join', id: 'p2', name: 'Zephyrine' }, 'host');
    g = apply(g, { type: 'narrator/turn', turn: TURN } as any, 'host');
    g = apply(g, { type: 'story/speak', text: 'I check the ramp.' }, 'host');
    const all = [RULES_PROMPT, campaignPrompt(g), partyPrompt(g), turnPrompt({ ...g, story: { ...g.story, work: { kind: 'round' } as any } })].join('\n');
    expect(all).not.toMatch(/Leon|Zephyrine/);
    expect(all).toContain('[MPAT] I check the ramp.');
  });
  it('never names a favourite song: only whose song is playing', () => {
    let g = game(); const c = Object.values(g.characters)[0];
    g.characters[c.id].identity = { song: 'https://youtu.be/dQw4w9WgXcQ', songTitle: 'Glass Hymn', songArtist: 'Quietband' };
    g.music = { seq: 1, fight: 0, used: {}, silent: {}, now: { seq: 1, layer: 'spotlight', charId: c.id, track: { yt: 'dQw4w9WgXcQ', title: 'Glass Hymn', artist: 'Quietband' }, reason: 'a critical success', inCombat: false } };
    const all = [partyPrompt(g), turnPrompt({ ...g, story: { ...g.story, work: { kind: 'round' } as any } })].join('\n');
    expect(all).not.toMatch(/Glass Hymn|Quietband|dQw4w9WgXcQ/);
    expect(all).toContain("MPAT's song is playing");
  });
});

describe('Narrator lore (campaign narratorLore)', () => {
  it('every built-in campaign names lore that exists', () => {
    for (const c of BUILT_IN_CAMPAIGNS as any[]) for (const k of c.narratorLore || []) expect(loreKeys().some((x) => x === k || x.startsWith(k + '/')), c.id + ': ' + k).toBe(true);
  });
  it('M813 gets only its chunks; design notes never ship', () => {
    const p = campaignPrompt(game());
    expect(p).toContain('The Knowing'); expect(p).toMatch(/Robots/);
    expect(p).not.toMatch(/The Crawlers \(NPC version 2\)/); expect(p).not.toMatch(/Advanced classes|Open questions/);
    expect(loreKeys().some((k) => k.startsWith('how-the-existing') || k.startsWith('advanced') || k.startsWith('open-questions'))).toBe(false);
  });
  it('magic lore arrives with magic in the party', () => {
    let g = game(); const c = Object.values(g.characters)[0];
    expect(loreFor(g)).not.toContain('magic/sigil-magic');
    g = { ...g, characters: { [c.id]: { ...c, offHand: { id: 'evoker' } as any } } };
    expect(loreFor(g)).toContain('magic/sigil-magic');
  });
});

describe('Narrator output schema', () => {
  // Anthropic compiles the schema into a grammar and refuses one that is too large (long enums are the cost).
  it('stays small: no long id lists, few enum values in total', () => {
    const enums: any[][] = [];
    const walk = (x: any) => { if (x && typeof x === 'object') { if (Array.isArray(x.enum)) enums.push(x.enum); Object.values(x).forEach(walk); } };
    walk(turnSchema(game()));
    expect(Math.max(...enums.map((e) => e.length))).toBeLessThanOrEqual(20);
    expect(enums.reduce((t, e) => t + e.length, 0)).toBeLessThanOrEqual(90);
  });
});

describe('Anthropic Narrator adapter', () => {
  it('sends one cached, schema-bound request from the browser and parses the turn', async () => {
    const calls: { url: string; headers: Headers; body: any }[] = [];
    const fake = (async (url: any, init: any) => { calls.push({ url: String(url), headers: new Headers(init.headers), body: JSON.parse(init.body) }); return ok(message); }) as typeof fetch;
    const { turn, usage } = await anthropicProvider('sk-test', 'claude-opus-5-5', 'medium', fake).turn(game());
    expect(turn.narration).toBe('The pad hums.');
    const c = calls[0];
    expect(c.url).toContain('api.anthropic.com/v1/messages');
    expect(c.headers.get('anthropic-dangerous-direct-browser-access')).toBe('true');
    expect(c.headers.get('authorization')).toBe('Bearer sk-test'); // SDK 1.x sends the player's key as a bearer token
    expect(c.body.model).toBe('claude-opus-5-5');
    expect(c.body.system).toHaveLength(3);
    expect(c.body.system.every((b: any) => b.cache_control?.type === 'ephemeral')).toBe(true);
    expect(c.body.output_config.format.type).toBe('json_schema');
    expect(c.body.output_config.effort).toBe('medium');
    expect(c.body.output_config.format.schema.required).toContain('narration');
    expect(c.body.thinking).toBeUndefined();
    expect(c.body.temperature).toBeUndefined();
    expect(c.body.fallbacks).toBe('default');
    expect(usage.costUsd).toBeCloseTo((1200 * 4 + 20000 * 0.2 + 300 * 20) / 1e6, 6);
  });
  it('retries without the fallback option if the API rejects it', async () => {
    const bodies: any[] = [];
    const fake = (async (_u: any, init: any) => { const b = JSON.parse(init.body); bodies.push(b);
      return b.fallbacks ? new Response(JSON.stringify({ type: 'error', error: { type: 'invalid_request_error', message: 'fallbacks not supported here' } }), { status: 400, headers: { 'content-type': 'application/json' } }) : ok(message); }) as typeof fetch;
    const { turn } = await anthropicProvider('sk-test', 'claude-opus-5-5', 'low', fake).turn(game());
    expect(turn.sceneTitle).toBe('The rear pad');
    expect(bodies.length).toBe(2); expect(bodies[1].fallbacks).toBeUndefined();
  });
  it('lets the Narrator look things up in the wiki, then answer', async () => {
    const bodies: any[] = [];
    const lookup = { ...message, stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'tu_1', name: 'wiki_lookup', input: { keys: ['weapon:service_pistol', 'condition:bleeding', 'lore:worlds/crawlers', 'nonsense:x'] } }] };
    const fake = (async (_u: any, init: any) => { const b = JSON.parse(init.body); bodies.push(b); return ok(bodies.length === 1 ? lookup : message); }) as typeof fetch;
    const seen: string[] = [];
    const { turn, usage } = await anthropicProvider('sk-test', 'claude-opus-5-5', 'medium', fake, (k) => seen.push(...k)).turn(game());
    expect(turn.narration).toBe('The pad hums.');
    expect(bodies).toHaveLength(2);
    expect(bodies[0].tools[0].name).toBe('wiki_lookup');
    const result = bodies[1].messages[2].content[0];
    expect(result.type).toBe('tool_result'); expect(result.tool_use_id).toBe('tu_1');
    expect(result.content).toContain('[weapon:service_pistol]'); expect(result.content).toContain('Snap Shot');
    expect(result.content).toContain('[condition:bleeding]'); expect(result.content).toMatch(/curse/i);
    expect(result.content).toContain('No such entry');
    expect(seen).toContain('weapon:service_pistol');
    expect(usage.output).toBe(600);
  });
  it('stops looking up after three rounds and must answer', async () => {
    const bodies: any[] = [];
    const lookup = { ...message, stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'tu', name: 'wiki_lookup', input: { keys: ['item:torch'] } }] };
    const fake = (async (_u: any, init: any) => { const b = JSON.parse(init.body); bodies.push(b); return ok(b.tool_choice?.type === 'none' ? message : lookup); }) as typeof fetch;
    await anthropicProvider('sk-test', 'claude-opus-5-5', 'medium', fake).turn(game());
    expect(bodies).toHaveLength(4); expect(bodies[3].tool_choice).toEqual({ type: 'none' });
  });
  it('runs the turn without the wiki if the API rejects tools with this request', async () => {
    const bodies: any[] = [];
    const bad = () => new Response(JSON.stringify({ type: 'error', error: { type: 'invalid_request_error', message: 'nope' } }), { status: 400, headers: { 'content-type': 'application/json' } });
    const fake = (async (_u: any, init: any) => { const b = JSON.parse(init.body); bodies.push(b); return b.tools ? bad() : ok(message); }) as typeof fetch;
    const { turn } = await anthropicProvider('sk-test', 'claude-opus-5-5', 'medium', fake).turn(game());
    expect(turn.narration).toBe('The pad hums.');
    expect(bodies.at(-1).tools).toBeUndefined();
  });
  it('explains a bad key in plain words', async () => {
    const fake = (async () => new Response(JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }), { status: 401, headers: { 'content-type': 'application/json' } })) as typeof fetch;
    await expect(anthropicProvider('bad', 'claude-opus-5-5', 'low', fake).turn(game())).rejects.toThrow(/rejected the API key/);
  });
  it('keeps the context inside the token budget', () => {
    const g = game(), approx = (s: string) => Math.round(s.length / 4);
    const sizes = { rules: approx(RULES_PROMPT), campaign: approx(campaignPrompt(g)), party: approx(partyPrompt(g)), turn: approx(turnPrompt({ ...g, story: { ...g.story, work: { kind: 'opening' } } })) };
    console.log('approx tokens', sizes);
    expect(sizes.rules + sizes.campaign + sizes.party + sizes.turn).toBeLessThan(40000);
  });
});
