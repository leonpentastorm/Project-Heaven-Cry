// Campaign starts offered in the Room: the built-in campaigns (data/campaigns/), plus a campaign the host loaded from a file.
//
// THE ONE SWITCH (Classes 3.0 step 10b; Leon, 13 Nov 2026: "hide it for now, it wastes tokens and is broken"): a campaign
// is on the menu when its data says `"listed": true` (or says nothing), and off it with `"listed": false`. M813
// (data/campaigns/m813.json) is `"listed": false` today: no menu shows it and no new room starts on it; its data, its engine
// tests and its lore stay. Bringing it back is one edit: delete that line. A browser suite that still plays a hidden
// campaign shows it on its own page through the test hook below (localStorage `phc.showCampaigns`, a JSON list of ids).
import { BUILT_IN_CAMPAIGNS, type Campaign, type GameState } from '@engine';
export interface Start { id: string; short: string; kicker: string; title: string; focus: string; art: string; artNote: string; lore: string[]; meta: string; custom: boolean; soon?: boolean }
const toStart = (c: Campaign, custom = false): Start => ({ id: c.id, short: c.short || c.title, kicker: c.kicker || (custom ? 'YOUR CAMPAIGN' : ''), title: c.title, focus: c.focus || 'center',
  art: c.art || 'world-pilot', artNote: c.artNote || (custom ? 'Your campaign' : ''), lore: c.pitch || [], meta: c.meta || '', custom });
/** The test hook: campaign ids a browser suite shows although their data hides them (localStorage phc.showCampaigns). */
const SHOWN_FOR_TESTS: string[] = (() => { try { const v = JSON.parse(localStorage.getItem('phc.showCampaigns') || '[]'); return Array.isArray(v) ? v.map(String) : []; } catch { return []; } })();
/** Is this built-in campaign on the menu? Its data's `listed` (the one switch), or the test hook. */
export const isListed = (c: Campaign): boolean => c.listed !== false || SHOWN_FOR_TESTS.includes(c.id);
/** The start a room falls back to when no campaign is listed: the Narrator writes the first scene (data/campaigns/own.json). */
export const OPEN_START = 'own';
const listed = BUILT_IN_CAMPAIGNS.filter(isListed);
const open = BUILT_IN_CAMPAIGNS.find((c) => c.id === OPEN_START);
export const STARTS: Start[] = (listed.length ? listed : open ? [open] : []).map((c) => toStart(c));
/** The start a new room is set to: the first one on the menu (never a hidden campaign). */
export const DEFAULT_START: string = STARTS[0]?.id || OPEN_START;
/** The big campaign, built after the systems are done. Shown so players know it's coming; it can't be picked yet. */
export const SOON: Start = { id: 'astradoel', short: 'Astradoel', kicker: 'CAMPAIGN · ABOUT 50 HOURS · COMING SOON', title: 'Heaven Cry at Astradoel', focus: 'center', art: 'world-pilot', artNote: 'Coming soon',
  lore: ['The full campaign of Project Heaven Cry. It is being built now, after the systems it needs are done.'], meta: 'Coming soon. Fight in the Proving Ground, or load your own campaign, meanwhile.', custom: false, soon: true };
/** The starts the Room shows for this game: the built-ins on the menu, and the host's own campaign if one is loaded. */
export function startsFor(g: GameState | null): Start[] {
  const own = g?.campaign && !BUILT_IN_CAMPAIGNS.some((c) => c.id === g.campaign!.id) ? [toStart(g.campaign, true)] : [];
  // a room saved on a campaign that is now hidden keeps it (and says so truthfully); a new room never starts on one
  const kept = BUILT_IN_CAMPAIGNS.find((c) => c.id === g?.settings.start && !STARTS.some((s) => s.id === c.id));
  return [...STARTS, ...(kept ? [toStart(kept)] : []), SOON, ...own];
}
export const startOf = (g: GameState | null): Start => startsFor(g).find((s) => s.id === g?.settings.start && !s.soon) || STARTS[0];
/** A start a new room may begin on: one on the menu (a hidden campaign's id is not). */
export const shownStart = (_g: GameState | null, id: string | null | undefined): boolean => !!id && STARTS.some((s) => s.id === id);
