// The Anthropic provider for the AI Narrator. Runs in the host's browser: the API key stays in this browser and is
// sent only to api.anthropic.com. One call per Narrator turn, structured JSON output, cached system layers.
import Anthropic from '@anthropic-ai/sdk';
import type { GameState, NarratorTurn } from '@engine';
import { noteExchange } from '../game/debug';
import { RULES_PROMPT, campaignPrompt, partyPrompt, memoryPrompt, turnPrompt, submitTool, WIKI_TOOL, wikiAnswer, RECALL_TOOL, recallAnswer } from './context';

/** Wiki and recall lookups per Narrator turn before it must answer. */
const MAX_LOOKUPS = 3;
/** The most one Narrator turn may cost, all rounds of lookups included (spec: The Narrator's memory). */
export const COST_CEILING_USD = 0.5;
const TOKENS = (s: string) => Math.ceil(s.length / 3.5);
/** What a call's prompt costs at worst for this model (nothing cached; the stable blocks written to the 1-hour cache,
 * which costs twice the input price) and with the cache warm, plus a full reply. */
export function callEstimate(g: GameState, modelId: string, maxOut = 8000) {
  const p = MODELS.find((m) => m.id === modelId) || MODELS[0];
  const stable = TOKENS(RULES_PROMPT) + TOKENS(campaignPrompt(g)) + TOKENS(partyPrompt(g)) + TOKENS(memoryPrompt(g)) + TOKENS(JSON.stringify([WIKI_TOOL, RECALL_TOOL, submitTool(g)]));
  const turn = TOKENS(turnPrompt(g));
  return { stable, turn, worstUsd: (stable * p.input * 2 + turn * p.input + maxOut * p.output) / 1e6, warmUsd: (stable * p.cacheRead + turn * p.input + maxOut * p.output) / 1e6 };
}

export const MODELS = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5', input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
  { id: 'claude-fable-5-1', label: 'Claude Fable 5.1', input: 10, output: 50, cacheRead: 0.25, cacheWrite: 12.5 },
];

export interface NarratorResult { turn: NarratorTurn; usage: { input: number; output: number; cacheRead: number; costUsd: number } }
export interface RewriteResult { text: string; refused: string; usage?: NarratorResult['usage'] }
export interface NarratorProvider { turn(g: GameState): Promise<NarratorResult>; rewrite?(g: GameState, text: string, ask: string): Promise<RewriteResult> }

export function anthropicProvider(apiKey: string, model: string, effort: 'low' | 'medium' | 'high' = 'medium', fetchImpl?: typeof fetch, onLookup?: (keys: string[]) => void): NarratorProvider {
  // authToken: null so only the player's own key is ever sent, never a token from the environment.
  const client = new Anthropic({ apiKey, authToken: null, dangerouslyAllowBrowser: true, maxRetries: 2, timeout: 180_000, ...(fetchImpl ? { fetch: fetchImpl } : {}) });
  const price = MODELS.find((m) => m.id === model) || MODELS[0];
  const prov: NarratorProvider & { turnRaw(g: GameState, dbg: any): Promise<NarratorResult> } = {
    async turn(g) {
      const t0 = Date.now(), dbg: { params?: any; messages?: any[]; res?: any; usage?: any } = {};
      const note = (error?: string) => noteExchange({ at: t0, kind: 'turn', model, effort, ms: Date.now() - t0, system: dbg.params?.system?.map((x: any) => x.text), tools: dbg.params?.tools?.map((x: any) => x.name),
        messages: (dbg.messages || []).map((m) => JSON.parse(JSON.stringify(m))), reply: dbg.res?.content, usage: dbg.usage || dbg.res?.usage, error });
      try { const r = await this.turnRaw(g, dbg); dbg.usage = r.usage; note(); return r; } catch (e: any) { note(e?.message || String(e)); throw e; }
    },
    async turnRaw(g: GameState, dbg: any): Promise<NarratorResult> {
      // The turn comes back through the submit_turn tool, not a structured-output schema: Anthropic compiles a strict
      // schema into a grammar, and ours is past its size limit (400 "compiled grammar is too large"). A non-strict
      // tool has no grammar, the API still returns its input as parsed JSON, and the engine validates every field.
      const params: any = {
        model, max_tokens: 16000,
        system: [
          // Stable first, each block cached for an hour (rounds can be minutes apart): the rules never change, the
          // campaign changes by act, the party on level-ups, the long memory once a chapter. The turn is uncached.
          { type: 'text', text: RULES_PROMPT, cache_control: { type: 'ephemeral', ttl: '1h' } },
          { type: 'text', text: campaignPrompt(g), cache_control: { type: 'ephemeral', ttl: '1h' } },
          { type: 'text', text: partyPrompt(g), cache_control: { type: 'ephemeral', ttl: '1h' } },
          { type: 'text', text: memoryPrompt(g), cache_control: { type: 'ephemeral', ttl: '1h' } },
        ],
        output_config: { effort },
        tools: [WIKI_TOOL, RECALL_TOOL, submitTool(g)],
      };
      // Refusal fallback: on a policy decline the API re-runs the turn on a fallback model (Claude API skill default).
      if (model !== 'claude-haiku-5-5') { params.betas = ['server-side-fallback-2026-07-01']; params.fallbacks = 'default'; }
      const messages: any[] = [{ role: 'user', content: turnPrompt(g) }];
      dbg.params = params; dbg.messages = messages;
      const spent = () => (sum.input * price.input + sum.cacheRead * price.cacheRead + sum.write5 * price.cacheWrite + sum.write1h * price.input * 2 + sum.output * price.output) / 1e6;
      const call = async () => {
        params.messages = messages;
        // The cost ceiling: the reply may only use what is left of it.
        params.max_tokens = Math.max(2000, Math.min(16000, Math.floor(((COST_CEILING_USD - spent()) * 1e6 - TOKENS(JSON.stringify(messages)) * price.input) / price.output)));
        try { return await client.beta.messages.create(params); } catch (e) {
          // If the API won't take the fallback option with this request, run the turn without it rather than stall.
          if (e instanceof Anthropic.BadRequestError && params.fallbacks) { delete params.fallbacks; delete params.betas; return call(); }
          throw new Error(explain(e));
        }
      };
      const sum = { input: 0, output: 0, cacheRead: 0, write5: 0, write1h: 0 };
      let res: any, turn: NarratorTurn | null = null, lookups = 0, nudged = false;
      const usageNow = () => ({ input: sum.input + sum.write1h + sum.write5, output: sum.output, cacheRead: sum.cacheRead, costUsd: spent() });
      try {
      while (!turn) {
        res = await call(); dbg.res = res;
        const u = res.usage || {};
        const w1h = u.cache_creation?.ephemeral_1h_input_tokens ?? (u.cache_creation_input_tokens || 0), w5 = u.cache_creation?.ephemeral_5m_input_tokens ?? 0;
        sum.input += u.input_tokens || 0; sum.output += u.output_tokens || 0; sum.cacheRead += u.cache_read_input_tokens || 0; sum.write1h += w1h; sum.write5 += w5;
        if (res.stop_reason === 'refusal') throw new Error('The model declined this turn' + (res.stop_details?.explanation ? ': ' + res.stop_details.explanation : '.') + ' Try again, or reword the last actions.');
        if (res.stop_reason === 'max_tokens') throw new Error('The Narrator ran out of room mid-turn. Retry.');
        const uses = res.content.filter((x: any) => x.type === 'tool_use');
        const sub = uses.find((x: any) => x.name === 'submit_turn');
        if (sub && sub.input && typeof sub.input === 'object') { turn = sub.input as NarratorTurn; break; }
        if (!uses.length) {
          // A plain-text answer: take the JSON in it if there is one, else ask once for the tool.
          const text = res.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('').trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
          try { turn = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)); break; } catch { /* fall through */ }
          if (nudged) throw new Error('The Narrator didn\'t hand in its turn. Retry.');
          nudged = true;
          messages.push({ role: 'assistant', content: res.content }, { role: 'user', content: 'Hand in this turn now by calling submit_turn with every field.' });
          continue;
        }
        lookups++;
        messages.push({ role: 'assistant', content: res.content });
        const last = lookups >= MAX_LOOKUPS || spent() > COST_CEILING_USD * 0.7 ? '\n\nThat was your last lookup this turn: call submit_turn now.' : '';
        messages.push({ role: 'user', content: uses.map((x: any) => x.name === WIKI_TOOL.name ? { type: 'tool_result', tool_use_id: x.id, content: wikiAnswer(x.input?.keys) + last }
          : x.name === RECALL_TOOL.name ? { type: 'tool_result', tool_use_id: x.id, content: recallAnswer(g, x.input?.query) + last }
          : { type: 'tool_result', tool_use_id: x.id, content: 'Unknown tool.', is_error: true }) });
        onLookup?.(uses.flatMap((x: any) => x.input?.keys || []));
        if (lookups > MAX_LOOKUPS + 1) throw new Error('The Narrator kept looking things up without answering. Retry.');
      }
      } catch (e: any) {
        // A turn that fails after the API answered was still billed: say what it cost so the spend meter counts it.
        const err = e instanceof Error ? e : new Error(String(e));
        if (sum.input || sum.output || sum.cacheRead || sum.write1h || sum.write5) (err as any).usage = usageNow();
        throw err;
      }
      const input = sum.input, cacheRead = sum.cacheRead, cacheWrite = sum.write1h + sum.write5, output = sum.output;
      const costUsd = spent();
      return { turn: turn!, usage: { input: input + cacheWrite, output, cacheRead, costUsd } };
    },
    // An edit the room voted for (spec: Rerolls and edits): the Narrator rewords its own line. Only the words: anything
    // that would change what happened (items, money, injuries, deaths, positions, events, outcomes) is refused.
    async rewrite(g, text, ask) {
      const tool = { name: 'submit_rewrite', description: 'Hand in the reworded line, or refuse.', input_schema: { type: 'object', properties: { text: { type: 'string' }, refused: { type: 'string', description: 'Empty if you reworded it; otherwise why the request would change what happened' } }, required: ['text', 'refused'] } };
      const res: any = await client.messages.create({
        model, max_tokens: 4000, output_config: { effort: 'low' }, tools: [tool],
        system: [{ type: 'text', text: 'You are the Narrator of a tabletop RPG. The players voted to have one of your lines reworded. You may change wording, tone, emphasis, pacing, and descriptive detail that changes no outcome. You must NOT add, remove or change anything the game tracks or that happened: items, money, loot, injuries, deaths, HP, positions, who did what, results of rolls or fights, promises made, or new events. If the request asks for any of that (or for something absurd, out of character, or naming the players instead of their characters), refuse: return the original line unchanged and say why in refused. Keep the same length, give or take a third. Never name a real-world person, brand or work. Call submit_rewrite.' }],
        messages: [{ role: 'user', content: 'THE LINE:\n' + text + '\n\nWHAT THE PLAYERS ASKED:\n' + (ask || 'Tell it better.') + '\n\nRECENT STORY FOR CONTEXT:\n' + g.story.entries.filter((e) => e.kind === 'narration' && !e.rerolled).slice(-4).map((e) => e.text).join('\n---\n') }],
      } as any).catch((e: unknown) => { throw new Error(explain(e)); });
      const use = res.content.find((b: any) => b.type === 'tool_use' && b.name === 'submit_rewrite')?.input || {};
      const u = res.usage || {}, input = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0), output = u.output_tokens || 0;
      return { text: String(use.text || text), refused: String(use.refused || ''), usage: { input, output, cacheRead: u.cache_read_input_tokens || 0, costUsd: (input * price.input + output * price.output) / 1e6 } };
    },
  };
  return prov;
}


function explain(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return 'Anthropic rejected the API key. Check it in the room settings.';
  if (e instanceof Anthropic.PermissionDeniedError) return 'This API key can\'t use that model. Pick another model in the room settings.';
  if (e instanceof Anthropic.NotFoundError) return 'That model isn\'t available to this key. Pick another model.';
  if (e instanceof Anthropic.RateLimitError) return 'Rate limited by Anthropic. Wait a moment and retry.';
  if (e instanceof Anthropic.BadRequestError) return 'Anthropic refused the request: ' + (e as Error).message;
  if (e instanceof Anthropic.APIError) return 'Anthropic error ' + ((e as any).status ?? '') + ': ' + (e as Error).message;
  return 'Couldn\'t reach Anthropic: ' + String((e as Error)?.message || e);
}

/** "Polish with AI": rewrite a player's words as in-world prose with a small, fast model on the host's key. */
export async function polish(apiKey: string, text: string, charName: string): Promise<string> {
  const client = new Anthropic({ apiKey, authToken: null, dangerouslyAllowBrowser: true, maxRetries: 1, timeout: 60_000 });
  const res: any = await client.messages.create({
    model: 'claude-haiku-5-5', max_tokens: 2000, output_config: { effort: 'low' },
    system: 'Rewrite a tabletop player\'s action as one to three vivid sentences of in-world prose about their character, third person, present tense. Keep every intention and every spoken line; add no new facts, outcomes or names. No real-world names. Reply with the prose only.',
    messages: [{ role: 'user', content: 'Character: ' + (charName || 'the character') + '\nPlayer wrote: ' + text }],
  } as any).catch((e: unknown) => { throw new Error(explain(e)); });
  const out = res.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('').trim();
  if (!out) throw new Error('Polish came back empty.');
  return out;
}

/** A scripted Narrator for tests and offline demos: it plays a short M813 opening, a check, a fight and the aftermath. */
export function scriptedProvider(): NarratorProvider {
  return {
    async rewrite(_g, text, ask) { return /steal|million|kill/i.test(ask) ? { text, refused: 'that would change what happened.' } : { text: text + ' (Reworded: ' + ask + ')', refused: '' }; },
    async turn(g) {
      const chars = Object.values(g.characters), first = chars[0];
      const w = g.story.work!;
      const skillOf = (c: any) => Object.entries(c.skills).sort((a: any, b: any) => b[1] - a[1])[0][0];
      const base: NarratorTurn = { narration: '', sceneTitle: '', hooks: [], checks: [], overreach: [], xp: [], deeds: [], combat: null, endScene: null };
      const usage = { input: 0, output: 0, cacheRead: 0, costUsd: 0 };
      if (w.kind === 'opening') return { usage, turn: { ...base, sceneTitle: 'The rear pad', narration: 'Outpost-813\'s rear landing pad hums under the black hole\'s light. One ship is still loading, its hold full of platinum crates, and the engineers at the ramp are watching your squad walk in.', hooks: chars.map((c) => ({ skill: skillOf(c), tn: 8, truth: 'true' as const, line: 'They counted you on the way in. They didn\'t like the number.' })) } };
      if (w.kind === 'round' && !g.story.entries.some((e) => e.kind === 'check')) return { usage, turn: { ...base, narration: 'Chief Engineer Keel plants himself at the top of the ramp. "Not enough thrust for scrap," he says.', checks: first ? [{ charId: first.id, skills: [skillOf(first)], tn: 12, stakes: 'Get Keel to lower the ramp.' }] : [] } };
      if (w.kind === 'results') return { usage, turn: { ...base, narration: 'Keel\'s hand goes to his holster. Behind him, two engineers do the same.', combat: { name: 'The rear pad', map: 'rear_pad', difficulty: 'easy', enemies: [{ name: 'Engineer', tier: 'minion', weapon: 'service_pistol' }, { name: 'Chief Engineer Keel', tier: 'soldier', weapon: 'drifter_revolver' }] } } };
      if (w.kind === 'combat_end') return { usage, turn: { ...base, narration: 'The pad goes quiet. The ship\'s engines are still warm.', xp: [{ charId: 'all', source: 'quest', amount: 200, reason: 'held the rear pad' }], endScene: { summary: 'The squad fought the engineers for the last ship off M813.' } } };
      return { usage, turn: { ...base, narration: 'The wind off the pad carries ash and engine heat. What do you do?', hooks: chars.map((c) => ({ skill: skillOf(c), tn: 12, truth: 'partial' as const, line: 'Something on that ship is worth more than the platinum.' })) } };
    },
  };
}
