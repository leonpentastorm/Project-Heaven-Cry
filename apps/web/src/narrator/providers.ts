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

export type ProviderId = 'anthropic' | 'openai' | 'openrouter' | 'deepseek' | 'google' | 'ollama' | 'custom' | 'custom-anthropic';
export interface ProviderInfo {
  id: ProviderId; label: string;
  /** Which wire format: Anthropic's Messages API or OpenAI's chat completions. */
  format: 'anthropic' | 'openai';
  /** The default address ('' = the host types it). */
  baseUrl: string; editableBase: boolean; needsKey: boolean;
  keyPlaceholder: string; modelPlaceholder: string; defaultModel: string;
  /** Model ids to suggest before "Load models" is pressed. */
  suggest: string[];
  /** A short line under the settings. */
  note: string;
}

export const PROVIDERS: ProviderInfo[] = [
  { id: 'anthropic', label: 'Anthropic (Claude)', format: 'anthropic', baseUrl: 'https://api.anthropic.com', editableBase: false, needsKey: true,
    keyPlaceholder: 'sk-ant-… · stays in this browser', modelPlaceholder: '', defaultModel: 'claude-opus-5-5', suggest: [],
    note: 'Recommended: the Narrator is tuned and priced for Claude.' },
  { id: 'openrouter', label: 'OpenRouter', format: 'openai', baseUrl: 'https://openrouter.ai/api/v1', editableBase: false, needsKey: true,
    keyPlaceholder: 'sk-or-v1-… · stays in this browser', modelPlaceholder: 'Load models, or type e.g. deepseek/deepseek-chat', defaultModel: '', suggest: [],
    note: 'One key, many models. Pick one that supports tool calling.' },
  { id: 'openai', label: 'OpenAI', format: 'openai', baseUrl: 'https://api.openai.com/v1', editableBase: false, needsKey: true,
    keyPlaceholder: 'sk-… · stays in this browser', modelPlaceholder: 'Load models, or type a model id', defaultModel: '', suggest: [],
    note: 'Billed by OpenAI; the spend meter counts tokens, not dollars.' },
  { id: 'deepseek', label: 'DeepSeek', format: 'openai', baseUrl: 'https://api.deepseek.com/v1', editableBase: false, needsKey: true,
    keyPlaceholder: 'sk-… · stays in this browser', modelPlaceholder: 'deepseek-chat', defaultModel: 'deepseek-chat', suggest: ['deepseek-chat', 'deepseek-reasoner'],
    note: 'Cheap. If this browser can\'t reach it, use the same model through OpenRouter.' },
  { id: 'google', label: 'Google Gemini', format: 'openai', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', editableBase: false, needsKey: true,
    keyPlaceholder: 'AIza… · stays in this browser', modelPlaceholder: 'Load models, or type a model id', defaultModel: '', suggest: [],
    note: 'Uses Gemini\'s OpenAI-compatible address.' },
  { id: 'ollama', label: 'Local (Ollama, LM Studio…)', format: 'openai', baseUrl: 'http://localhost:11434/v1', editableBase: true, needsKey: false,
    keyPlaceholder: 'Usually none', modelPlaceholder: 'Load models', defaultModel: '', suggest: [],
    note: 'Runs on your own computer. Ollama must allow this site (set OLLAMA_ORIGINS=* and restart it). Small models break rules often.' },
  { id: 'custom', label: 'Other site · OpenAI format', format: 'openai', baseUrl: '', editableBase: true, needsKey: true,
    keyPlaceholder: 'The key the site gave you', modelPlaceholder: 'Load models, or the model name the site lists', defaultModel: '', suggest: [],
    note: 'For third-party key sites. Paste the "base URL" or "API address" the site shows, usually ending in /v1.' },
  { id: 'custom-anthropic', label: 'Other site · Anthropic format', format: 'anthropic', baseUrl: '', editableBase: true, needsKey: true,
    keyPlaceholder: 'The key the site gave you', modelPlaceholder: 'The Claude model name the site lists', defaultModel: '', suggest: MODELS.map((m) => m.id),
    note: 'For sites that resell Claude with an Anthropic-style address (the kind set up for Claude Code).' },
];
export const providerInfo = (id: string | undefined) => PROVIDERS.find((p) => p.id === id) || PROVIDERS[0];

/** A guess at the service from the key's shape (null: can't tell; many sites use plain "sk-…" keys). */
export function guessProvider(key: string): ProviderId | null {
  const k = (key || '').trim();
  if (/^sk-ant-/.test(k)) return 'anthropic';
  if (/^sk-or-/.test(k)) return 'openrouter';
  if (/^AIza[0-9A-Za-z_-]{20,}$/.test(k)) return 'google';
  if (/^sk-(proj|svcacct|admin)-/.test(k)) return 'openai';
  return null;
}
/** A hint when the key plainly belongs to another service than the one picked (null when it fits or we can't tell). */
export function keyMismatch(provider: ProviderId, key: string): { text: string; to: ProviderId } | null {
  const g = guessProvider(key);
  if (!g || g === provider) return null;
  // Through a third-party address the host typed, any key shape may be right.
  if (provider === 'custom' || provider === 'custom-anthropic') return null;
  const name = g === 'anthropic' ? 'an Anthropic' : g === 'openai' ? 'an OpenAI' : g === 'openrouter' ? 'an OpenRouter' : 'a Google';
  return { text: 'This looks like ' + name + ' key.', to: g };
}

/** The address to call: trimmed, no trailing slash, no endpoint pasted on the end. */
export function cleanBase(url: string, format: 'anthropic' | 'openai'): string {
  let u = (url || '').trim().replace(/\/+$/, '');
  u = u.replace(/\/(chat\/completions|completions|messages|models)$/i, '').replace(/\/+$/, '');
  // The Anthropic SDK adds /v1/messages itself.
  if (format === 'anthropic') u = u.replace(/\/v1$/i, '');
  return u;
}

export interface NarratorConfig { provider: ProviderId; key: string; model: string; effort: 'low' | 'medium' | 'high'; baseUrl: string }
export function baseOf(c: NarratorConfig): string {
  const p = providerInfo(c.provider);
  return cleanBase(p.editableBase ? c.baseUrl || p.baseUrl : p.baseUrl, p.format);
}
/** Why the AI Narrator can't start with these settings (null: ready). */
export function notReadyReason(c: NarratorConfig): string | null {
  const p = providerInfo(c.provider);
  if (p.editableBase && !baseOf(c)) return 'Add the site\'s API address to start';
  if (p.editableBase && !/^https?:\/\//i.test(baseOf(c))) return 'The API address must start with https://';
  if (p.needsKey && !c.key) return p.id === 'custom' || p.id === 'custom-anthropic' ? 'Add the site\'s API key to start' : 'Add your ' + p.label.replace(/ \(.*\)$/, '') + ' API key to start';
  if (!c.model) return 'Pick a model to start (Load models)';
  return null;
}
/** Only Anthropic's own models have prices here; everything else counts tokens. */
export const isPriced = (c: Pick<NarratorConfig, 'provider' | 'model'>) => c.provider === 'anthropic' && MODELS.some((m) => m.id === c.model);

/** The Narrator for these settings, or null if something is missing. */
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


/** Test key (the room, UI pass 2.2): ask the service which models this key may use, which spends no tokens.
 *  Anthropic is asked directly (listModels answers from the built-in list there). ok: the service answered. */
export async function testKey(c: NarratorConfig, fetchImpl?: typeof fetch): Promise<{ ok: boolean; text: string }> {
  const p = providerInfo(c.provider), short = p.label.replace(/ \(.*\)$/, '');
  if (p.needsKey && !c.key) return { ok: false, text: 'Add the key first.' };
  try {
    if (p.id === 'anthropic') {
      const f = fetchImpl || fetch, base = baseOf(c);
      let res: Response;
      try { res = await f(base + '/v1/models?limit=100', { headers: { 'x-api-key': c.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' } }); }
      catch (e) { return { ok: false, text: unreachable(short, base, e) }; }
      const body = await res.text(); let j: any = null; try { j = JSON.parse(body); } catch { /* */ }
      if (!res.ok) return { ok: false, text: explainHttp(short, res.status, errDetail(j, body), base) };
      const n = Array.isArray(j?.data) ? j.data.length : 0;
      return { ok: true, text: short + ' answered: the key works' + (n ? ' (' + n + (n === 1 ? ' model)' : ' models)') : '') + '.' };
    }
    const ids = await listModels(c, fetchImpl);
    return { ok: true, text: short + ' answered: the key works' + (ids.length ? ' (' + ids.length + (ids.length === 1 ? ' model)' : ' models)') : '') + '.' };
  } catch (e) {
    return { ok: false, text: String((e as Error)?.message || e) };
  }
}
