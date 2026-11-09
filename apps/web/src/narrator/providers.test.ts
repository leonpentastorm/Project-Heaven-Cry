// Narrator providers beyond Anthropic: the OpenAI-compatible adapter (OpenRouter, OpenAI, DeepSeek, Gemini, local,
// third-party sites), Anthropic-format third-party sites, and the settings helpers. Every reply here is faked.
import { beforeEach, describe, expect, it } from 'vitest';
import { apply, newGame, ARCHETYPES, type GameState } from '@engine';
import { PROVIDERS, guessProvider, keyMismatch, cleanBase, baseOf, notReadyReason, isPriced, makeProvider, openaiProvider, listModels, testKey, polishWith, jsonFrom, resetQuirks, type NarratorConfig } from './providers';

function game(): GameState {
  let g = newGame('ABC123', { id: 'host', name: 'Leon' });
  const a = ARCHETYPES.find((x: any) => x.id === 'field_medic')!;
  g = apply(g, { type: 'char/add', sheet: { name: 'MPAT', portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } }, 'host');
  return apply(g, { type: 'session/start' }, 'host');
}
const TURN = { narration: 'The pad hums.', sceneTitle: 'The rear pad', hooks: [], checks: [], overreach: [], xp: [], deeds: [], combat: null, endScene: null };
const json = (body: any, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const reply = (message: any, finish = 'stop', usage = { prompt_tokens: 1000, completion_tokens: 200 }) => ({ id: 'c1', object: 'chat.completion', choices: [{ index: 0, message: { role: 'assistant', ...message }, finish_reason: finish }], usage });
const submit = (args: any, id = 'call_1') => reply({ content: null, tool_calls: [{ id, type: 'function', function: { name: 'submit_turn', arguments: typeof args === 'string' ? args : JSON.stringify(args) } }] }, 'tool_calls');
type Call = { url: string; headers: Headers; body: any };
function fake(answers: ((b: any, i: number) => Response)[]) {
  const calls: Call[] = [];
  const f = (async (url: any, init: any) => {
    const body = init?.body ? JSON.parse(init.body) : null; calls.push({ url: String(url), headers: new Headers(init?.headers), body });
    return answers[Math.min(calls.length - 1, answers.length - 1)](body, calls.length - 1);
  }) as typeof fetch;
  return { f, calls };
}
const cfg = (p: Partial<NarratorConfig>): NarratorConfig => ({ provider: 'custom', key: 'sk-' + 'a'.repeat(64), model: 'some-model', effort: 'medium', baseUrl: 'https://api.example.com/v1', ...p });

beforeEach(() => resetQuirks());

describe('provider settings', () => {
  it('lists Anthropic first, and every service has a label and a format', () => {
    expect(PROVIDERS[0].id).toBe('anthropic');
    for (const p of PROVIDERS) { expect(p.label).toBeTruthy(); expect(['anthropic', 'openai']).toContain(p.format); }
  });
  it('guesses the service from the key, and says nothing about plain sk- keys', () => {
    expect(guessProvider('sk-ant-api03-xyz')).toBe('anthropic');
    expect(guessProvider('sk-or-v1-' + 'a'.repeat(64))).toBe('openrouter');
    expect(guessProvider('AIza' + 'b'.repeat(35))).toBe('google');
    expect(guessProvider('sk-proj-abc')).toBe('openai');
    expect(guessProvider('sk-' + 'c'.repeat(64))).toBeNull(); // the friend's kind of key: could be any site
  });
  it('warns when the key plainly belongs elsewhere, never for a typed third-party address', () => {
    expect(keyMismatch('anthropic', 'sk-or-v1-abc')?.to).toBe('openrouter');
    expect(keyMismatch('openrouter', 'sk-ant-abc')?.to).toBe('anthropic');
    expect(keyMismatch('anthropic', 'sk-ant-abc')).toBeNull();
    expect(keyMismatch('custom', 'sk-ant-abc')).toBeNull();
    expect(keyMismatch('anthropic', 'sk-' + 'c'.repeat(64))).toBeNull();
  });
  it('cleans a pasted address: trailing slash and endpoint off, /v1 off for the Anthropic format', () => {
    expect(cleanBase(' https://x.ai/v1/ ', 'openai')).toBe('https://x.ai/v1');
    expect(cleanBase('https://x.ai/v1/chat/completions', 'openai')).toBe('https://x.ai/v1');
    expect(cleanBase('https://x.ai/v1/messages', 'anthropic')).toBe('https://x.ai');
    expect(baseOf(cfg({ provider: 'openrouter', baseUrl: 'https://ignored' }))).toBe('https://openrouter.ai/api/v1');
  });
  it('says what is missing before the Narrator can start', () => {
    expect(notReadyReason(cfg({ baseUrl: '' }))).toMatch(/API address/);
    expect(notReadyReason(cfg({ baseUrl: 'api.example.com' }))).toMatch(/https/);
    expect(notReadyReason(cfg({ key: '' }))).toMatch(/key/);
    expect(notReadyReason(cfg({ model: '' }))).toMatch(/model/);
    expect(notReadyReason(cfg({ provider: 'ollama', key: '', baseUrl: '', model: 'llama3' }))).toBeNull(); // local: no key
    expect(notReadyReason(cfg({ provider: 'anthropic', key: 'sk-ant-x', model: 'claude-opus-5-5' }))).toBeNull();
    expect(notReadyReason(cfg({}))).toBeNull();
  });
  it('prices only Anthropic\'s own models', () => {
    expect(isPriced({ provider: 'anthropic', model: 'claude-opus-5-5' })).toBe(true);
    expect(isPriced({ provider: 'openrouter', model: 'anthropic/claude-opus' })).toBe(false);
    expect(isPriced({ provider: 'custom-anthropic', model: 'claude-opus-5-5' })).toBe(false);
  });
  it('reads JSON out of fenced or reasoning text', () => {
    expect(jsonFrom('<think>hmm {no}</think>```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(jsonFrom('no json here')).toBeNull();
  });
});

describe('OpenAI-compatible Narrator', () => {
  it('sends one chat request to the typed address with the key as a bearer token, and takes the turn from submit_turn', async () => {
    const { f, calls } = fake([() => json(submit(TURN))]);
    const { turn, usage } = await makeProvider(cfg({ baseUrl: 'https://api.example.com/v1/' }), f)!.turn(game());
    expect(turn.narration).toBe('The pad hums.');
    expect(calls).toHaveLength(1);
    const c = calls[0];
    expect(c.url).toBe('https://api.example.com/v1/chat/completions');
    expect(c.headers.get('authorization')).toBe('Bearer sk-' + 'a'.repeat(64));
    expect(c.headers.get('x-api-key')).toBeNull();
    expect(c.body.model).toBe('some-model');
    expect(c.body.messages[0].role).toBe('system'); expect(c.body.messages[0].content).toContain('MPAT');
    expect(c.body.messages[1].role).toBe('user');
    expect(c.body.tools.map((t: any) => t.function.name)).toEqual(['wiki_lookup', 'recall', 'submit_turn']);
    expect(c.body.tools[2].function.parameters.required).toContain('narration');
    expect(c.body.max_tokens).toBe(16000);
    expect(usage).toEqual({ input: 1000, output: 200, cacheRead: 0, costUsd: 0 });
  });
  it('runs wiki lookups as tool results, then answers', async () => {
    const lookup = reply({ content: null, tool_calls: [{ id: 'tu_1', type: 'function', function: { name: 'wiki_lookup', arguments: JSON.stringify({ keys: ['weapon:service_pistol', 'nonsense:x'] }) } }] }, 'tool_calls');
    const { f, calls } = fake([() => json(lookup), () => json(submit(TURN))]);
    const seen: string[] = [];
    const { turn, usage } = await openaiProvider({ label: 'Site', baseUrl: 'https://api.example.com/v1', apiKey: 'k', model: 'm', fetchImpl: f, onLookup: (k) => seen.push(...k) }).turn(game());
    expect(turn.narration).toBe('The pad hums.');
    expect(calls).toHaveLength(2);
    const m = calls[1].body.messages;
    expect(m[2].role).toBe('assistant'); expect(m[2].tool_calls[0].id).toBe('tu_1');
    expect(m[3].role).toBe('tool'); expect(m[3].tool_call_id).toBe('tu_1');
    expect(m[3].content).toContain('[weapon:service_pistol]'); expect(m[3].content).toContain('No such entry');
    expect(seen).toContain('weapon:service_pistol');
    expect(usage.input).toBe(2000); expect(usage.output).toBe(400);
  });
  it('takes a turn written as JSON in plain text (fenced)', async () => {
    const { f } = fake([() => json(reply({ content: 'Here:\n```json\n' + JSON.stringify(TURN) + '\n```' }))]);
    expect((await makeProvider(cfg({}), f)!.turn(game())).turn.sceneTitle).toBe('The rear pad');
  });
  it('asks once for submit_turn after plain words, then gives up', async () => {
    const prose = reply({ content: 'The pad hums, and that is all.' });
    const ok = fake([() => json(prose), () => json(submit(TURN))]);
    expect((await makeProvider(cfg({}), ok.f)!.turn(game())).turn.narration).toBe('The pad hums.');
    expect(ok.calls[1].body.messages.at(-1).content).toMatch(/submit_turn/);
    const bad = fake([() => json(prose)]);
    await expect(makeProvider(cfg({}), bad.f)!.turn(game())).rejects.toThrow(/didn't hand in its turn/);
  });
  it('asks again when submit_turn\'s arguments are broken JSON', async () => {
    const { f, calls } = fake([() => json(submit('{"narration": "The pad hu')), () => json(submit(TURN, 'call_2'))]);
    expect((await makeProvider(cfg({}), f)!.turn(game())).turn.narration).toBe('The pad hums.');
    const m = calls[1].body.messages;
    expect(m.at(-1).role).toBe('tool'); expect(m.at(-1).tool_call_id).toBe('call_1'); expect(m.at(-1).content).toMatch(/valid JSON/);
  });
  it('switches to max_completion_tokens when the service refuses max_tokens', async () => {
    const { f, calls } = fake([(b) => (b.max_tokens ? json({ error: { message: "Unsupported parameter: 'max_tokens'. Use 'max_completion_tokens' instead." } }, 400) : json(submit(TURN)))]);
    await makeProvider(cfg({}), f)!.turn(game());
    expect(calls).toHaveLength(2);
    expect(calls[1].body.max_tokens).toBeUndefined(); expect(calls[1].body.max_completion_tokens).toBe(16000);
  });
  it('falls back to a JSON answer when the model has no tool calling', async () => {
    const { f, calls } = fake([(b) => (b.tools ? json({ error: { message: 'This model does not support tools' } }, 400) : json(reply({ content: JSON.stringify(TURN) })))]);
    const { turn } = await makeProvider(cfg({}), f)!.turn(game());
    expect(turn.narration).toBe('The pad hums.');
    const last = calls.at(-1)!.body;
    expect(last.tools).toBeUndefined(); expect(last.messages[1].content).toMatch(/ONLY one JSON object/);
  });
});


describe('OpenAI-compatible: errors, rewording, polish, local, model lists', () => {
  it('explains errors in plain words', async () => {
    const bad = (status: number, message: string) => fake([() => json({ error: { message } }, status)]).f;
    await expect(makeProvider(cfg({}), bad(401, 'Invalid API key'))!.turn(game())).rejects.toThrow(/rejected the API key \(Invalid API key\)/);
    await expect(makeProvider(cfg({}), bad(402, 'Insufficient balance'))!.turn(game())).rejects.toThrow(/out of credit/);
    await expect(makeProvider(cfg({ baseUrl: 'https://api.example.com' }), bad(404, 'Not found'))!.turn(game())).rejects.toThrow(/adding \/v1/);
    await expect(makeProvider(cfg({}), bad(429, 'slow down'))!.turn(game())).rejects.toThrow(/rate limiting/);
    const page = (async () => new Response('<html>Welcome</html>', { status: 200 })) as typeof fetch;
    await expect(makeProvider(cfg({}), page)!.turn(game())).rejects.toThrow(/web page/);
    const blocked = (async () => { throw new TypeError('Failed to fetch'); }) as typeof fetch;
    await expect(makeProvider(cfg({}), blocked)!.turn(game())).rejects.toThrow(/CORS/);
  });
  it('a failed turn still reports the tokens it spent', async () => {
    const { f } = fake([() => json(reply({ content: 'words' })), () => json(reply({ content: 'more words' }))]);
    const err: any = await makeProvider(cfg({}), f)!.turn(game()).catch((e) => e);
    expect(err.usage.input).toBe(2000);
  });
  it('rewords a line and polishes a player\'s words', async () => {
    const rw = fake([() => json(reply({ content: null, tool_calls: [{ id: 'r', type: 'function', function: { name: 'submit_rewrite', arguments: JSON.stringify({ text: 'Better.', refused: '' }) } }] }, 'tool_calls'))]);
    const r = await makeProvider(cfg({}), rw.f)!.rewrite!(game(), 'Old.', 'nicer');
    expect(r.text).toBe('Better.'); expect(rw.calls[0].body.tools[0].function.name).toBe('submit_rewrite');
    const pl = fake([() => json(reply({ content: '<think>ok</think>MPAT checks the ramp.' }))]);
    expect(await polishWith(cfg({}), 'i check the ramp', 'MPAT', pl.f)).toBe('MPAT checks the ramp.');
    expect(pl.calls[0].body.max_tokens).toBe(2000);
  });
  it('local models need no key: no Authorization header is sent', async () => {
    const { f, calls } = fake([() => json(submit(TURN))]);
    await makeProvider(cfg({ provider: 'ollama', key: '', baseUrl: '', model: 'llama3' }), f)!.turn(game());
    expect(calls[0].url).toBe('http://localhost:11434/v1/chat/completions');
    expect(calls[0].headers.get('authorization')).toBeNull();
  });
  it('lists models from /models (OpenAI and Gemini shapes)', async () => {
    const a = fake([() => json({ object: 'list', data: [{ id: 'b-model' }, { id: 'a-model' }] })]);
    expect(await listModels(cfg({}), a.f)).toEqual(['a-model', 'b-model']);
    expect(a.calls[0].url).toBe('https://api.example.com/v1/models');
    const g = fake([() => json({ data: [{ id: 'models/gemini-x' }] })]);
    expect(await listModels(cfg({ provider: 'google', key: 'AIza' + 'b'.repeat(35) }), g.f)).toEqual(['gemini-x']);
  });
});

describe('Anthropic-format third-party sites', () => {
  const message = { id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5-5', stop_reason: 'tool_use', stop_sequence: null,
    content: [{ type: 'tool_use', id: 'tu', name: 'submit_turn', input: TURN }], usage: { input_tokens: 1200, output_tokens: 300, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } };
  it('calls the typed address with the key as x-api-key too, no beta options, and no dollar cost', async () => {
    const { f, calls } = fake([() => json(message)]);
    const { turn, usage } = await makeProvider(cfg({ provider: 'custom-anthropic', baseUrl: 'https://claude.example.com/v1', model: 'claude-opus-5-5' }), f)!.turn(game());
    expect(turn.narration).toBe('The pad hums.');
    expect(calls[0].url).toContain('https://claude.example.com/v1/messages');
    expect(calls[0].headers.get('x-api-key')).toBe('sk-' + 'a'.repeat(64));
    expect(calls[0].body.fallbacks).toBeUndefined(); expect(calls[0].body.betas).toBeUndefined();
    expect(usage.costUsd).toBe(0); expect(usage.input).toBe(1200);
  });
  it('drops the effort setting if the site refuses it', async () => {
    const { f, calls } = fake([(b) => (b.output_config ? json({ type: 'error', error: { type: 'invalid_request_error', message: 'output_config: Extra inputs are not permitted' } }, 400) : json(message))]);
    await makeProvider(cfg({ provider: 'custom-anthropic', baseUrl: 'https://claude.example.com', model: 'claude-opus-5-5' }), f)!.turn(game());
    expect(calls.at(-1)!.body.output_config).toBeUndefined();
  });
  it('Anthropic itself is unchanged: the official address, priced', async () => {
    const { f, calls } = fake([() => json(message)]);
    const { usage } = await makeProvider(cfg({ provider: 'anthropic', key: 'sk-ant-x', model: 'claude-opus-5-5', baseUrl: 'https://ignored.example' }), f)!.turn(game());
    expect(calls[0].url).toContain('api.anthropic.com/v1/messages');
    expect(usage.costUsd).toBeGreaterThan(0);
  });
});


const FAKE = 'sk-' + 'ant-x'; // a fake key, split so the repo's key check stays clean
describe('Test key (the room, UI pass)', () => {
  const cfg = (o: Partial<NarratorConfig>): NarratorConfig => ({ provider: 'anthropic', key: FAKE, model: 'claude-opus-5-5', baseUrl: '', effort: 'medium', ...o } as NarratorConfig);
  const fake = (status: number, body: any): typeof fetch => (async (url: any, init: any) => { seen.push({ url: String(url), init }); return new Response(JSON.stringify(body), { status }); }) as any;
  let seen: { url: string; init: any }[] = [];
  beforeEach(() => { seen = []; });
  it('Anthropic: asks the models list directly (no tokens), and says the key works', async () => {
    const r = await testKey(cfg({}), fake(200, { data: [{ id: 'a' }, { id: 'b' }] }));
    expect(r).toEqual({ ok: true, text: 'Anthropic answered: the key works (2 models).' });
    expect(seen[0].url).toBe('https://api.anthropic.com/v1/models?limit=100');
    expect(seen[0].init.headers['x-api-key']).toBe(FAKE);
  });
  it('a refused key says why, in words', async () => {
    const r = await testKey(cfg({}), fake(401, { error: { message: 'invalid x-api-key' } }));
    expect(r.ok).toBe(false); expect(r.text).toMatch(/^Anthropic rejected the API key \(invalid x-api-key\)/);
  });
  it('no key: nothing is sent', async () => {
    const r = await testKey(cfg({ key: '' }), fake(200, {}));
    expect(r).toEqual({ ok: false, text: 'Add the key first.' }); expect(seen.length).toBe(0);
  });
  it('services whose models list needs the key: that list', async () => {
    const r = await testKey(cfg({ provider: 'openai', key: 'sk-x', model: 'x' }), fake(200, { data: [{ id: 'm1' }] }));
    expect(r.ok).toBe(true); expect(r.text).toMatch(/OpenAI answered: the key works \(1 model\)/);
    expect(seen[0].url).toBe('https://api.openai.com/v1/models');
  });
  it('OpenRouter: its /key, not the public models list; a garbage key fails', async () => {
    const bad = await testKey(cfg({ provider: 'openrouter', key: 'sk-or-v1-garbage', model: 'x/y' }), fake(401, { error: { message: 'User not found.', code: 401 } }));
    expect(bad.ok).toBe(false); expect(bad.text).toMatch(/OpenRouter/); expect(bad.text).toMatch(/User not found/);
    expect(seen[0].url).toBe('https://openrouter.ai/api/v1/key'); expect(seen[0].init.headers.authorization).toBe('Bearer sk-or-v1-garbage');
    const good = await testKey(cfg({ provider: 'openrouter', key: 'sk-or-v1-good', model: 'x/y' }), fake(200, { data: { label: 'k', limit_remaining: 4.5 } }));
    expect(good).toEqual({ ok: true, text: 'OpenRouter answered: the key works ($4.50 left on it).' });
  });
  it('a site with its own address: says the address answered, never that the key works', async () => {
    const r = await testKey(cfg({ provider: 'custom', key: 'k', model: 'm', baseUrl: 'https://llm.example.com/v1' }), fake(200, { data: [{ id: 'm1' }, { id: 'm2' }] }));
    expect(r).toEqual({ ok: true, text: 'The address answered (2 models); the key itself is checked on the Narrator\'s first turn.' });
  });
  it('a site with no address yet: nothing is sent (the key never goes to the game\'s own server)', async () => {
    for (const provider of ['custom', 'custom-anthropic'] as const) {
      const r = await testKey(cfg({ provider, key: FAKE, model: 'm', baseUrl: '' }), fake(200, {}));
      expect(r).toEqual({ ok: false, text: 'Add the site\'s address first.' });
    }
    const rel = await testKey(cfg({ provider: 'custom', key: FAKE, model: 'm', baseUrl: 'llm.example.com/v1' }), fake(200, {}));
    expect(rel.ok).toBe(false);
    expect(seen.length).toBe(0);
  });
});
