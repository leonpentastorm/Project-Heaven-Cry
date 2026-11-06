// Campaign starts offered in the Room: the built-in campaigns (data/campaigns/), plus a campaign the host loaded from a file.
import { BUILT_IN_CAMPAIGNS, type Campaign, type GameState } from '@engine';
export interface Start { id: string; short: string; kicker: string; title: string; focus: string; art: string; artNote: string; lore: string[]; meta: string; custom: boolean }
const toStart = (c: Campaign, custom = false): Start => ({ id: c.id, short: c.short || c.title, kicker: c.kicker || (custom ? 'YOUR CAMPAIGN' : ''), title: c.title, focus: c.focus || 'center',
  art: c.art || 'world-pilot', artNote: c.artNote || (custom ? 'Your campaign' : ''), lore: c.pitch || [], meta: c.meta || '', custom });
export const STARTS: Start[] = BUILT_IN_CAMPAIGNS.map((c) => toStart(c));
/** The starts the Room shows for this game: the built-ins, and the host's own campaign if one is loaded. */
export function startsFor(g: GameState | null): Start[] {
  const own = g?.campaign && !BUILT_IN_CAMPAIGNS.some((c) => c.id === g.campaign!.id) ? [toStart(g.campaign, true)] : [];
  return [...STARTS, ...own];
}
export const startOf = (g: GameState | null): Start => startsFor(g).find((s) => s.id === g?.settings.start) || STARTS[0];
