// The Anthropic models the Narrator knows and their prices (USD per million tokens), and the cost ceiling of one turn.
// Its own module, engine-free, so the title (the settings and the problem report) can read them without loading the
// engine (the client load lane, 0.33): narrator/anthropic.ts re-exports them.
/** The most one Narrator turn may cost, all rounds of lookups included (spec: The Narrator's memory). */
export const COST_CEILING_USD = 0.5;
export const MODELS = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5', input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
  { id: 'claude-fable-5-1', label: 'Claude Fable 5.1', input: 10, output: 50, cacheRead: 0.25, cacheWrite: 12.5 },
];
