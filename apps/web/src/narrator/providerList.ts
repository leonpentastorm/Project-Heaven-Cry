// The AI Narrator's services: the list, which one a key looks like, the address to call and whether the settings are
// ready. Engine-free (the client load lane, 0.33): the store and the title read it before the engine loads.
// The adapters themselves are narrator/providers.ts, which re-exports this file.
import { MODELS } from './models';

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
