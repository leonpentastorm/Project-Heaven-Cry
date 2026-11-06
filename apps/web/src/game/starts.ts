// Campaign starts offered in the Room: the built-in campaigns (data/campaigns/), plus a campaign the host loaded from a file.
import { BUILT_IN_CAMPAIGNS, type Campaign, type GameState } from '@engine';
export interface Start { id: string; short: string; kicker: string; title: string; focus: string; art: string; artNote: string; lore: string[]; meta: string; custom: boolean; soon?: boolean }
const toStart = (c: Campaign, custom = false): Start => ({ id: c.id, short: c.short || c.title, kicker: c.kicker || (custom ? 'YOUR CAMPAIGN' : ''), title: c.title, focus: c.focus || 'center',
  art: c.art || 'world-pilot', artNote: c.artNote || (custom ? 'Your campaign' : ''), lore: c.pitch || [], meta: c.meta || '', custom });
export const STARTS: Start[] = BUILT_IN_CAMPAIGNS.filter((c) => c.listed !== false).map((c) => toStart(c));
/** The big campaign, built after the systems are done. Shown so players know it's coming; it can't be picked yet. */
export const SOON: Start = { id: 'astradoel', short: 'Astradoel', kicker: 'CAMPAIGN · ABOUT 50 HOURS · COMING SOON', title: 'Heaven Cry at Astradoel', focus: 'center', art: 'world-pilot', artNote: 'Coming soon',
  lore: ['The full campaign of Project Heaven Cry. It is being built now, after the systems it needs are done.'], meta: 'Coming soon. Play M813 or load your own campaign meanwhile.', custom: false, soon: true };
/** The starts the Room shows for this game: the built-ins, and the host's own campaign if one is loaded. */
export function startsFor(g: GameState | null): Start[] {
  const own = g?.campaign && !BUILT_IN_CAMPAIGNS.some((c) => c.id === g.campaign!.id) ? [toStart(g.campaign, true)] : [];
  return [...STARTS, SOON, ...own];
}
export const startOf = (g: GameState | null): Start => startsFor(g).find((s) => s.id === g?.settings.start && !s.soon) || STARTS[0];
