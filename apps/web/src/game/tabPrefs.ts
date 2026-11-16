// The fight tabs' order and hiding, per character (Leon, 16 Nov 2026): a display preference kept in this browser
// (localStorage 'phc.fightTabs', keyed by the character's id alone (tabKey): the arrangement follows the character into
// any room). It never enters
// the engine's state, the event log, the save or the room relay. Which tabs a character HAS is the engine's (the fight
// screen's action list, game/commands.ts actionGroups); this module only arranges them.
//
//   order   every tab this character has been shown, in the order the player sees them. Not arranged (custom false):
//           the action list's own order (the known list, commands.ts tabIdsKnown), so a tab that appears later takes
//           its natural place. Arranged (custom true): a tab that appears later (a new skill point, a new focus) is
//           appended at the end, so no tab the player placed moves on its own. A tab absent today keeps its place.
//   hidden  the tabs the player chose not to see. The first tab of the order is never hidden, and at least one stays.
//   custom  the player changed something (the order or a hidden tab); Reset to default clears it.
// Pure functions first (tested in tabPrefs.test.ts), then the browser's storage.

export interface TabPrefs { order: string[]; hidden: string[]; custom: boolean }
export const NO_PREFS: TabPrefs = { order: [], hidden: [], custom: false };

const uniq = (xs: string[]) => [...new Set(xs)];

/** The order kept, then each tab present now that it does not have yet, appended in the order given. known: the tab
 *  ids that exist (an id outside it, a tab that no longer exists, is dropped); omitted, every id is kept. */
export function mergeOrder(order: string[], present: string[], known?: string[]): string[] {
  const ok = (id: string) => !!id && (!known || known.includes(id));
  const out = uniq((order || []).filter(ok));
  for (const id of present) if (ok(id) && !out.includes(id)) out.push(id);
  return out;
}

/** The prefs with today's tabs merged in (unknown ids dropped from the order and the hidden set). */
export function withPresent(p: TabPrefs, present: string[], known?: string[]): TabPrefs {
  const merged = mergeOrder(p.order, present, known);
  // not arranged: the natural order (the known list's), whenever each tab arrived
  const order = !p.custom && known ? [...merged].sort((a, b) => known.indexOf(a) - known.indexOf(b)) : merged;
  return { order, hidden: uniq((p.hidden || []).filter((id) => order.includes(id) && id !== order[0])), custom: !!p.custom };
}

/** The tabs to show now, in the player's order: the present ones that are not hidden (the first of the order never is).
 *  Should that leave none (every present tab hidden), the first present one in the order shows. */
export function shownTabs(p: TabPrefs, present: string[], known?: string[]): string[] {
  const q = withPresent(p, present, known);
  const here = q.order.filter((id) => present.includes(id));
  const shown = here.filter((id) => !q.hidden.includes(id));
  return shown.length ? shown : here.slice(0, 1);
}

/** Move a tab one place up (-1) or down (+1) in the order. A tab moved to the top is shown (the first is never hidden). */
export function moveTab(p: TabPrefs, id: string, dir: -1 | 1): TabPrefs {
  const order = [...p.order], i = order.indexOf(id), j = i + dir;
  if (i < 0 || j < 0 || j >= order.length) return p;
  [order[i], order[j]] = [order[j], order[i]];
  return { order, hidden: p.hidden.filter((h) => h !== order[0]), custom: true };
}

/** Why a tab can't be hidden now (null: it can): the first tab, or the last one shown. */
export function hideWhy(p: TabPrefs, id: string): string | null {
  if (p.order[0] === id) return 'The first tab always shows.';
  if (p.order.filter((x) => x !== id && !p.hidden.includes(x)).length < 1) return 'At least one tab stays.';
  return null;
}

/** Show or hide a tab (unchanged when hideWhy refuses). */
export function setHidden(p: TabPrefs, id: string, hide: boolean): TabPrefs {
  if (!p.order.includes(id)) return p;
  if (!hide) return p.hidden.includes(id) ? { ...p, hidden: p.hidden.filter((h) => h !== id), custom: true } : p;
  if (p.hidden.includes(id) || hideWhy(p, id)) return p;
  return { ...p, hidden: [...p.hidden, id], custom: true };
}

/** Reset to default: the tabs this character has, in the natural order (the action list's own, `natural`; any not in
 *  it after, as they were), nothing hidden. */
export function resetTabs(p: TabPrefs, natural: string[]): TabPrefs {
  const order = [...natural.filter((id) => p.order.includes(id)), ...p.order.filter((id) => !natural.includes(id))];
  return { order, hidden: [], custom: false };
}

/** The tab a turn opens on under a custom order: the first shown tab with something usable now (null: none has). */
export const firstUsable = (shown: string[], usable: (id: string) => boolean): string | null => shown.find((id) => usable(id)) || null;

// ---------- the browser's storage ----------
const LS_KEY = 'phc.fightTabs';
/** Fired on window when a character's tab prefs change (the fight screen and the settings panel draw again). */
export const EV_TABS_CHANGED = 'phc:fight-tabs';
let cache: Record<string, TabPrefs> | null = null;
function all(): Record<string, TabPrefs> {
  if (cache) return cache;
  try { const v = JSON.parse((typeof localStorage !== 'undefined' && localStorage.getItem(LS_KEY)) || '{}'); cache = v && typeof v === 'object' ? v : {}; } catch { cache = {}; }
  return cache!;
}
const clean = (v: any): TabPrefs => ({ order: Array.isArray(v?.order) ? v.order.filter((x: any) => typeof x === 'string') : [], hidden: Array.isArray(v?.hidden) ? v.hidden.filter((x: any) => typeof x === 'string') : [], custom: !!v?.custom });
/** A character's key in the store: its id alone (the arrangement follows the character from room to room). */
export const tabKey = (charId: string): string => 'char:' + charId;
/** A character's prefs (key: tabKey). */
export const loadTabPrefs = (key: string): TabPrefs => clean(all()[key]);
/** Keep a character's prefs (and tell the screens). */
export function saveTabPrefs(key: string, p: TabPrefs): void {
  const a = all(); a[key] = clean(p);
  try { localStorage.setItem(LS_KEY, JSON.stringify(a)); } catch { /* full or private mode */ }
  try { window.dispatchEvent(new Event(EV_TABS_CHANGED)); } catch { /* no window (tests) */ }
}
/** The fight showed these tabs: a tab new to this character is appended to its order (saved only when one is new). */
export function noteTabs(key: string, present: string[], known?: string[]): TabPrefs {
  const p = loadTabPrefs(key), q = withPresent(p, present, known);
  if (q.order.join() !== p.order.join() || q.hidden.join() !== p.hidden.join()) {
    const a = all(); a[key] = q;
    try { localStorage.setItem(LS_KEY, JSON.stringify(a)); } catch { /* */ }
  }
  return q;
}
/** The tabs the fight screen last had for a character in this page (present: the tabs it has this fight; shown: the
 *  bar, in order, whose position is the number key). Runtime only, never stored: the cog panel numbers what the keys do. */
export interface LiveTabs { present: string[]; shown: string[] }
const live: Record<string, LiveTabs> = {};
export const noteLive = (key: string, present: string[], shown: string[]): void => { live[key] = { present: [...present], shown: [...shown] }; };
export const liveTabs = (key: string): LiveTabs | null => live[key] || null;
/** Tests: forget the cache (a test that swaps localStorage). */
export const _resetTabPrefsCache = () => { cache = null; for (const k of Object.keys(live)) delete live[k]; };
