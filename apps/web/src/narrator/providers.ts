// Narrator providers beyond Anthropic (tech-plan: "Anthropic first, then OpenAI-compatible, then Google").
// Almost every other AI service, and most third-party key sites (resellers, proxies, OpenRouter, DeepSeek, local
// servers), speak the OpenAI "chat completions" format, so one adapter covers them; Google Gemini has an
// OpenAI-compatible address too. Like the Anthropic adapter, everything runs in the host's browser: the key stays in
// this browser and is sent only to the address the host picked. The engine still rolls every die.
import type { GameState, NarratorTurn } from '@engine';
import { noteExchange } from '../game/debug';
import { anthropicProvider, polish as anthropicPolish, MODELS, type NarratorProvider, type NarratorResult, type RewriteResult } from './anthropic';
import { RULES_PROMPT, campaignPrompt, partyPrompt, memoryPrompt, turnPrompt, submitTool, WIKI_TOOL, wikiAnswer, RECALL_TOOL, recallAnswer } from './context';
import { rememberTurn } from './craft';
import { MAX_LOOKUPS, REWRITE_TOOL, REWRITE_SYSTEM, rewriteAsk, POLISH_SYSTEM, polishAsk } from './prompts';
import { FIGHT_SYSTEM, FIGHT_MAX_TOKENS, fightAsk, fightJsonAsk, fightTool, parseFightAnswer } from './fight';

// The provider list and its settings checks are engine-free (narrator/providerList.ts: the store and the title read
// them before the engine loads); re-exported here for everything that already imports them from this file.
import { providerInfo, notReadyReason, baseOf, type NarratorConfig } from './providerList';
export * from './providerList';

export function makeProvider(c: NarratorConfig, fetchImpl?: typeof fetch): NarratorProvider | null {
  if (notReadyReason(c)) return null;
  const p = providerInfo(c.provider);
  if (p.format === 'anthropic') return anthropicProvider(c.key, c.model, c.effort, fetchImpl, undefined, p.id === 'anthropic' ? undefined : baseOf(c));
  return openaiProvider({ label: p.label, baseUrl: baseOf(c), apiKey: c.key, model: c.model, fetchImpl });
}
/** "Polish with AI" on the host's own service. */
export function polishWith(c: NarratorConfig, text: string, charName: string, fetchImpl?: typeof fetch): Promise<string> {
  const p = providerInfo(c.provider);
  if (p.id === 'anthropic') return anthropicPolish(c.key, text, charName);
  if (p.format === 'anthropic') return anthropicPolish(c.key, text, charName, c.model, baseOf(c));
  return openaiPolish({ label: p.label, baseUrl: baseOf(c), apiKey: c.key, model: c.model, fetchImpl }, text, charName);
}


// ---------- the OpenAI-compatible adapter: HTTP ----------

export interface OpenAIOptions { label: string; baseUrl: string; apiKey: string; model: string; fetchImpl?: typeof fetch; onLookup?: (keys: string[]) => void }

/** What a service turned out not to accept, learned on its first refusal and kept for the session. */
interface Quirks { maxKey: 'max_tokens' | 'max_completion_tokens' | null; noTools: boolean }
const quirksFor = new Map<string, Quirks>();
function quirks(o: OpenAIOptions): Quirks {
  const k = o.baseUrl + '|' + o.model;
  if (!quirksFor.has(k)) quirksFor.set(k, { maxKey: 'max_tokens', noTools: false });
  return quirksFor.get(k)!;
}
/** Tests: forget what the services refused. */
export const resetQuirks = () => quirksFor.clear();

class HttpError extends Error { constructor(public status: number, public detail: string, message: string) { super(message); } }

function explainHttp(label: string, status: number, detail: string, base: string): string {
  const d = detail ? ' (' + detail.slice(0, 200) + ')' : '';
  if (status === 401) return label + ' rejected the API key' + d + '. Check the key, and that it belongs to this service.';
  if (status === 402) return label + ' says the key is out of credit' + d + '.';
  if (status === 403) return label + ' refused this key or model' + d + '.';
  if (status === 404) return label + ' answered "not found"' + d + '. Check the model name' + (/\/v1$/.test(base) ? '' : ', and try adding /v1 to the end of the API address') + '.';
  if (status === 429) return label + ' is rate limiting this key, or it is out of credit' + d + '. Wait a moment and retry.';
  if (status >= 500) return label + ' had a server error ' + status + d + '. Retry in a moment.';
  return label + ' refused the request (' + status + ')' + d + '.';
}
function unreachable(label: string, base: string, e: unknown): string {
  return 'Couldn\'t reach ' + label + ' at ' + base + ' from this browser (' + String((e as Error)?.message || e) + '). '
    + 'Either the address is wrong, or the service blocks calls from web pages (CORS). If so, use the same model through OpenRouter, or ask the site whether it allows browser access.';
}
const errDetail = (j: any, text: string) => String(j?.error?.message || j?.error?.msg || (typeof j?.error === 'string' ? j.error : '') || j?.message || j?.detail || text || '').trim();

async function request(o: OpenAIOptions, path: string, body?: any): Promise<any> {
  const f = o.fetchImpl || fetch;
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (o.apiKey) headers.authorization = 'Bearer ' + o.apiKey;
  const timeout = typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? { signal: AbortSignal.timeout(180_000) } : {};
  let res: Response;
  try { res = await f(o.baseUrl + path, { method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined, ...timeout }); }
  catch (e) { throw new Error(unreachable(o.label, o.baseUrl, e)); }
  const text = await res.text();
  let j: any = null; try { j = JSON.parse(text); } catch { /* not JSON */ }
  if (!res.ok) { const d = errDetail(j, text); throw new HttpError(res.status, d, explainHttp(o.label, res.status, d, o.baseUrl)); }
  // Some proxies answer 200 with an error inside, or with a web page.
  if (!j || (j.error && !j.choices && !j.data)) {
    const d = j ? errDetail(j, text) : /<html/i.test(text) ? 'a web page, not an API answer: check the API address' : 'an empty or unreadable reply';
    throw new HttpError(400, d, o.label + ' sent back ' + (j ? 'an error: ' : '') + d.slice(0, 200));
  }
  return j;
}

/** One chat call, adapting to what the service refuses (the token-limit field's name, tool calling).
 * withoutTools: how the body changes when tools can't be used (the same request, asking for JSON instead). */
async function chat(o: OpenAIOptions, body: any, maxOut: number, tools?: any[], withoutTools?: (body: any) => any): Promise<{ j: any; toolsOn: boolean }> {
  const q = quirks(o);
  for (let tries = 0; ; tries++) {
    const b: any = { model: o.model, ...(tools?.length && q.noTools && withoutTools ? withoutTools(body) : body) };
    if (q.maxKey) b[q.maxKey] = maxOut;
    const toolsOn = !!tools?.length && !q.noTools;
    if (toolsOn) b.tools = tools;
    try { return { j: await request(o, '/chat/completions', b), toolsOn }; } catch (e) {
      if (!(e instanceof HttpError) || ![400, 404, 422].includes(e.status) || tries >= 3) throw e;
      const d = e.detail.toLowerCase();
      if (q.maxKey && /max_tokens|max_completion_tokens|maximum.{0,20}tokens/.test(d)) { q.maxKey = q.maxKey === 'max_tokens' ? 'max_completion_tokens' : null; continue; }
      if (toolsOn && /tool|function/.test(d)) { q.noTools = true; continue; }
      throw e;
    }
  }
}

const toTool = (t: { name: string; description: string; input_schema: any }) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema } });
/** A JSON object from a reply's text, with code fences and reasoning blocks stripped. */
export function jsonFrom(text: unknown): any | null {
  const t = String(text || '').replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/```(?:json)?/g, '').trim();
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { const v = JSON.parse(t.slice(a, b + 1)); return v && typeof v === 'object' ? v : null; } catch { return null; }
}
const args = (c: any) => { const a = c?.function?.arguments; return a && typeof a === 'object' ? a : jsonFrom(a); };
function usageOf(j: any) {
  const u = j?.usage || {}, cached = u.prompt_tokens_details?.cached_tokens || u.prompt_cache_hit_tokens || 0;
  return { input: Math.max(0, (u.prompt_tokens || 0) - cached), output: u.completion_tokens || 0, cacheRead: cached };
}


// ---------- the OpenAI-compatible adapter: the Narrator ----------

/** The same job as anthropicProvider: wiki and recall lookups, then the turn through submit_turn. A service that
 * refuses tools gets the turn schema in the prompt and answers with one JSON object. Cost is not priced (tokens only). */
export function openaiProvider(o: OpenAIOptions): NarratorProvider {
  const name = o.label + ' · ' + o.model;
  return {
    async turn(g) {
      const t0 = Date.now(), messages: any[] = [], dbg: { res?: any } = {};
      const sum = { input: 0, output: 0, cacheRead: 0 }, usage = () => ({ ...sum, costUsd: 0 });
      const system = [RULES_PROMPT, campaignPrompt(g), partyPrompt(g), memoryPrompt(g)].join('\n\n');
      const note = (error?: string) => noteExchange({ at: t0, kind: 'turn', model: name, ms: Date.now() - t0, system: [system], tools: [WIKI_TOOL.name, RECALL_TOOL.name, 'submit_turn'],
        messages: messages.slice(1).map((m) => JSON.parse(JSON.stringify(m))), reply: dbg.res?.choices?.[0]?.message, usage: { ...sum }, error });
      try {
        const sub = submitTool(g), tools = [WIKI_TOOL, RECALL_TOOL, sub].map(toTool);
        const jsonOnly = '\n\nYou cannot call tools here. Answer with ONLY one JSON object (no prose, no code fence) matching this JSON schema, every field filled:\n' + JSON.stringify(sub.input_schema);
        messages.push({ role: 'system', content: system }, { role: 'user', content: turnPrompt(g) });
        let turn: NarratorTurn | null = null, lookups = 0, nudged = false, jsonMode = false;
        // A service that refuses tools: the turn comes back as one JSON object in the text, asked for in the prompt.
        const toJson = () => { if (!jsonMode) { jsonMode = true; messages[1] = { role: 'user', content: messages[1].content + jsonOnly }; } };
        while (!turn) {
          const { j, toolsOn } = await chat(o, { messages }, 16000, jsonMode ? undefined : tools, () => { toJson(); return { messages }; });
          if (!toolsOn) toJson();
          dbg.res = j;
          const u = usageOf(j); sum.input += u.input; sum.output += u.output; sum.cacheRead += u.cacheRead;
          const ch = j.choices?.[0];
          if (!ch) throw new Error(o.label + ' sent back no answer. Retry.');
          const msg = ch.message || {};
          const calls: any[] = (msg.tool_calls || []).map((c: any, i: number) => ({ ...c, id: c.id || 'call_' + lookups + '_' + i, type: 'function' }));
          const subCall = calls.find((c) => c.function?.name === 'submit_turn');
          const got = subCall ? args(subCall) : !calls.length ? jsonFrom(msg.content) : null;
          if (got && typeof got.narration === 'string') { turn = got as NarratorTurn; break; }
          if (ch.finish_reason === 'length') throw new Error('The Narrator ran out of room mid-turn. Retry, or pick a model with a larger output limit.');
          if (ch.finish_reason === 'content_filter') throw new Error('The model declined this turn. Try again, or reword the last actions.');
          if (subCall || !calls.length) {
            // Plain words, or a submit_turn that wasn't valid JSON: ask once more.
            if (nudged) throw new Error('The Narrator didn\'t hand in its turn. Retry, or pick a model that is better at tool calling.');
            nudged = true;
            if (subCall) messages.push({ role: 'assistant', content: msg.content ?? null, tool_calls: calls }, ...calls.map((c) => ({ role: 'tool', tool_call_id: c.id, content: c === subCall ? 'That was not one valid JSON object with every field. Call submit_turn again.' : 'Skipped.' })));
            else messages.push({ role: 'assistant', content: msg.content || '' }, { role: 'user', content: jsonMode ? 'Answer now with only the JSON object, every field filled.' : 'Hand in this turn now by calling submit_turn with every field.' });
            continue;
          }
          lookups++;
          const last = lookups >= MAX_LOOKUPS ? '\n\nThat was your last lookup this turn: call submit_turn now.' : '';
          messages.push({ role: 'assistant', content: msg.content ?? null, tool_calls: calls });
          for (const c of calls) {
            const a = args(c) || {}, fn = c.function?.name;
            messages.push({ role: 'tool', tool_call_id: c.id, content: fn === WIKI_TOOL.name ? wikiAnswer(a.keys) + last : fn === RECALL_TOOL.name ? recallAnswer(g, a.query) + last : 'Unknown tool.' });
          }
          o.onLookup?.(calls.flatMap((c) => args(c)?.keys || []));
          if (lookups > MAX_LOOKUPS + 1) throw new Error('The Narrator kept looking things up without answering. Retry.');
        }
        note();
        rememberTurn(g, turn!); // the next turn's LAST TURN check (craft.ts)
        return { turn: turn!, usage: usage() } satisfies NarratorResult;
      } catch (e: any) {
        note(e?.message || String(e));
        const err = e instanceof Error ? e : new Error(String(e));
        // A turn that fails after the service answered was still billed: the spend meter counts its tokens.
        if (sum.input || sum.output) (err as any).usage = usage();
        throw err;
      }
    },

    // Rules 1.14: an attempt in a fight, as one small call (see anthropicProvider.fight).
    async fight(g, r) {
      const tool = fightTool(g, r), sys = { role: 'system', content: FIGHT_SYSTEM };
      const { j } = await chat(o, { messages: [sys, { role: 'user', content: fightAsk(g, r) }] }, FIGHT_MAX_TOKENS, [toTool(tool)], () => ({ messages: [sys, { role: 'user', content: fightJsonAsk(g, r) }] }));
      const msg = j.choices?.[0]?.message || {}, call = (msg.tool_calls || []).find((c: any) => c.function?.name === tool.name);
      const text = String(msg.content || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      const raw = (call ? args(call) : jsonFrom(msg.content)) || (text ? { lines: text.split(/\n+/).slice(0, 2) } : null), usage = { ...usageOf(j), costUsd: 0 };
      try { return { answer: parseFightAnswer(raw), usage }; } catch (e) { (e as any).usage = usage; throw e; }
    },

    async rewrite(g, text, ask): Promise<RewriteResult> {
      const sys = { role: 'system', content: REWRITE_SYSTEM }, user = rewriteAsk(g, text, ask);
      const asJson = { messages: [sys, { role: 'user', content: user + '\n\nAnswer with ONLY a JSON object: {"text": "…", "refused": ""}' }] };
      const { j } = await chat(o, { messages: [sys, { role: 'user', content: user }] }, 4000, [toTool(REWRITE_TOOL)], () => asJson);
      const msg = j.choices?.[0]?.message || {}, call = (msg.tool_calls || []).find((c: any) => c.function?.name === REWRITE_TOOL.name);
      const use = (call ? args(call) : jsonFrom(msg.content)) || {}, u = usageOf(j);
      return { text: String(use.text || text), refused: String(use.refused || ''), usage: { ...u, costUsd: 0 } };
    },
  };
}

export async function openaiPolish(o: OpenAIOptions, text: string, charName: string): Promise<string> {
  const { j } = await chat(o, { messages: [{ role: 'system', content: POLISH_SYSTEM }, { role: 'user', content: polishAsk(text, charName) }] }, 2000);
  const out = String(j.choices?.[0]?.message?.content || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  if (!out) throw new Error('Polish came back empty.');
  return out;
}

/** The model ids a service offers ("Load models"). */
export async function listModels(c: NarratorConfig, fetchImpl?: typeof fetch): Promise<string[]> {
  const p = providerInfo(c.provider), base = baseOf(c);
  if (p.id === 'anthropic') return MODELS.map((m) => m.id);
  if (p.format === 'anthropic') {
    const f = fetchImpl || fetch;
    let res: Response;
    try { res = await f(base + '/v1/models', { headers: { 'x-api-key': c.key, authorization: 'Bearer ' + c.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' } }); }
    catch (e) { throw new Error(unreachable(p.label, base, e)); }
    const text = await res.text(); let j: any = null; try { j = JSON.parse(text); } catch { /* */ }
    if (!res.ok) throw new Error(explainHttp(p.label, res.status, errDetail(j, text), base));
    return ((j?.data || []) as any[]).map((m) => String(m.id || '')).filter(Boolean).sort();
  }
  const j = await request({ label: p.label, baseUrl: base, apiKey: c.key, model: c.model, fetchImpl }, '/models');
  const list: any[] = Array.isArray(j?.data) ? j.data : Array.isArray(j?.models) ? j.models : [];
  return list.map((m) => String(m?.id || m?.name || '').replace(/^models\//, '')).filter(Boolean).sort();
}


/** Test key (the room, UI pass 2.2): ask the service something that spends no tokens. ok: the check passed.
 *  "The key works" is said only where the check needs the key: Anthropic's models list; OpenRouter's /key (its models
 *  list is public, so a garbage key passed it: review of the UI pass); OpenAI, DeepSeek and Gemini, whose models lists
 *  refuse a bad key. A local or third-party site's models list may need no key, so there it says the address answered
 *  and the key is checked on the Narrator's first turn. A site's address must be set (and http/https) before anything
 *  is sent: an empty one made the request relative, to the game's own server, with the key in its headers. */
export async function testKey(c: NarratorConfig, fetchImpl?: typeof fetch): Promise<{ ok: boolean; text: string }> {
  const p = providerInfo(c.provider), short = p.label.replace(/ \(.*\)$/, ''), base = baseOf(c);
  if (p.editableBase && !base) return { ok: false, text: 'Add the site\'s address first.' };
  if (!/^https?:\/\//i.test(base)) return { ok: false, text: 'The API address must start with https://' };
  if (p.needsKey && !c.key) return { ok: false, text: 'Add the key first.' };
  const f = fetchImpl || fetch;
  /** One GET that needs the key; ok when the service says yes. */
  const ask = async (url: string, headers: Record<string, string>): Promise<{ ok: boolean; text: string; j: any }> => {
    let res: Response;
    try { res = await f(url, { headers }); } catch (e) { return { ok: false, text: unreachable(short, base, e), j: null }; }
    const body = await res.text(); let j: any = null; try { j = JSON.parse(body); } catch { /* */ }
    return res.ok ? { ok: true, text: '', j } : { ok: false, text: explainHttp(short, res.status, errDetail(j, body), base), j };
  };
  const count = (n: number) => (n ? ' (' + n + (n === 1 ? ' model)' : ' models)') : '');
  try {
    if (p.id === 'anthropic') {
      const r = await ask(base + '/v1/models?limit=100', { 'x-api-key': c.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' });
      if (!r.ok) return { ok: false, text: r.text };
      return { ok: true, text: short + ' answered: the key works' + count(Array.isArray(r.j?.data) ? r.j.data.length : 0) + '.' };
    }
    if (p.id === 'openrouter') {
      const r = await ask(base + '/key', { authorization: 'Bearer ' + c.key });
      if (!r.ok) return { ok: false, text: r.text };
      const d = r.j?.data || {}, left = typeof d.limit_remaining === 'number' ? ' ($' + d.limit_remaining.toFixed(2) + ' left on it)' : '';
      return { ok: true, text: short + ' answered: the key works' + left + '.' };
    }
    const ids = await listModels(c, fetchImpl);
    if (p.editableBase) return { ok: true, text: 'The address answered' + count(ids.length) + (p.needsKey ? '; the key itself is checked on the Narrator\'s first turn.' : '.') };
    return { ok: true, text: short + ' answered: the key works' + count(ids.length) + '.' };
  } catch (e) {
    return { ok: false, text: String((e as Error)?.message || e) };
  }
}
