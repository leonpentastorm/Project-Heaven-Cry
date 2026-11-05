// The Anthropic provider for the AI Narrator. Runs in the host's browser: the API key stays in this browser and is
// sent only to api.anthropic.com. One call per Narrator turn, structured JSON output, cached system layers.
import Anthropic from '@anthropic-ai/sdk';
import type { GameState, NarratorTurn } from '@engine';
import { RULES_PROMPT, campaignPrompt, partyPrompt, turnPrompt, turnSchema } from './context';

export const MODELS = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5', input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
  { id: 'claude-fable-5-1', label: 'Claude Fable 5.1', input: 10, output: 50, cacheRead: 0.25, cacheWrite: 12.5 },
];

export interface NarratorResult { turn: NarratorTurn; usage: { input: number; output: number; cacheRead: number; costUsd: number } }
export interface NarratorProvider { turn(g: GameState): Promise<NarratorResult> }

export function anthropicProvider(apiKey: string, model: string, effort: 'low' | 'medium' | 'high' = 'medium', fetchImpl?: typeof fetch): NarratorProvider {
  // authToken: null so only the player's own key is ever sent, never a token from the environment.
  const client = new Anthropic({ apiKey, authToken: null, dangerouslyAllowBrowser: true, maxRetries: 2, timeout: 180_000, ...(fetchImpl ? { fetch: fetchImpl } : {}) });
  const price = MODELS.find((m) => m.id === model) || MODELS[0];
  return {
    async turn(g) {
      const params: any = {
        model, max_tokens: 16000,
        system: [
          { type: 'text', text: RULES_PROMPT, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: campaignPrompt(g), cache_control: { type: 'ephemeral' } },
          { type: 'text', text: partyPrompt(g), cache_control: { type: 'ephemeral' } },
        ],
        messages: [{ role: 'user', content: turnPrompt(g) }],
        output_config: { effort, format: { type: 'json_schema', schema: turnSchema(g) } },
      };
      // Refusal fallback: on a policy decline the API re-runs the turn on a fallback model (Claude API skill default).
      if (model !== 'claude-haiku-5-5') { params.betas = ['server-side-fallback-2026-07-01']; params.fallbacks = 'default'; }
      let res: any;
      try {
        res = await client.beta.messages.create(params);
      } catch (e) {
        // If the API won't take the fallback option with this request, run the turn without it rather than stall.
        if (e instanceof Anthropic.BadRequestError && params.fallbacks) {
          delete params.fallbacks; delete params.betas;
          try { res = await client.beta.messages.create(params); } catch (e2) { throw new Error(explain(e2)); }
        } else throw new Error(explain(e));
      }
      if (res.stop_reason === 'refusal') throw new Error('The model declined this turn' + (res.stop_details?.explanation ? ': ' + res.stop_details.explanation : '.') + ' Try again, or reword the last actions.');
      if (res.stop_reason === 'max_tokens') throw new Error('The Narrator ran out of room mid-turn. Retry.');
      const text = res.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
      let turn: NarratorTurn;
      try { turn = JSON.parse(text); } catch { throw new Error('The Narrator returned something that isn\'t valid JSON. Retry.'); }
      const u = res.usage || {};
      const input = (u.input_tokens || 0), cacheRead = (u.cache_read_input_tokens || 0), cacheWrite = (u.cache_creation_input_tokens || 0), output = (u.output_tokens || 0);
      const costUsd = (input * price.input + cacheRead * price.cacheRead + cacheWrite * price.cacheWrite + output * price.output) / 1e6;
      return { turn, usage: { input: input + cacheWrite, output, cacheRead, costUsd } };
    },
  };
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
