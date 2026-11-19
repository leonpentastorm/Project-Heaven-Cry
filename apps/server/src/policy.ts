// The room server's small rules, kept apart from the Worker so they can be tested without the runtime
// (apps/web/src/game/roomPolicy.test.ts). No Cloudflare import here.

/** A host or guest token: what the browser makes (store.ts rid(24)) is 24 characters of [a-z2-9]. The room accepts
 *  16 to 64 word characters, so an empty or a huge token never claims a seat (0.33 server fixes). */
export const TOKEN_RE = /^[\w-]{16,64}$/;
export const tokenOk = (t: string | null | undefined): t is string => !!t && TOKEN_RE.test(t);

/** A room no one has opened for this long is emptied by its alarm (its save, views and seats): the host's own browser
 *  keeps the game (IndexedDB), so nothing a player needs is lost. PROVISIONAL (0.33, a call made for Leon): 30 days. */
export const PURGE_MS = 30 * 24 * 3600 * 1000;
/** Views and saves the host sends are kept in memory and written to storage this long after the first unwritten one,
 *  all at once (a fight sent a view a player an action and wrote each one). PROVISIONAL (0.33): 2 s. */
export const FLUSH_MS = 2000;

/** Durable Object location hints (Cloudflare: Data location). Only the first get() of an object uses one; an object
 *  never moves after it is made. */
export type PlaceHint = 'wnam' | 'enam' | 'sam' | 'weur' | 'eeur' | 'apac' | 'oc' | 'afr' | 'me';
/** Where a room should be made, from the host's connection (the request's cf: continent, longitude). The room lives on
 *  the guests' way to the host, so near the host is as good as anywhere on that way; this stops a room being made far
 *  off both (a guest's link reaching it first, from another continent). Undefined: let Cloudflare choose. */
export function placeFor(cf: { continent?: string; longitude?: string | number } | null | undefined): PlaceHint | undefined {
  if (!cf || !cf.continent) return undefined;
  const lon = Number(cf.longitude);
  switch (cf.continent) {
    case 'NA': return Number.isFinite(lon) && lon < -100 ? 'wnam' : 'enam';
    case 'SA': return 'sam';
    case 'EU': return Number.isFinite(lon) && lon > 20 ? 'eeur' : 'weur';
    case 'AS': return Number.isFinite(lon) && lon < 60 ? 'me' : 'apac';
    case 'OC': return 'oc';
    case 'AF': return 'afr';
    default: return undefined;
  }
}

/** A guest's seat: the first link of a player id that brings a token keeps it; later links of that id must bring the
 *  same one (another player in the room sees every id in the game's player list, and could otherwise take a seat and
 *  its view). A link with no token is let in only while the seat has none (a tab from before 0.33). */
export function guestSeat(stored: string | undefined, token: string | null | undefined): 'ok' | 'claim' | 'refuse' {
  if (stored) return token === stored ? 'ok' : 'refuse';
  return tokenOk(token) ? 'claim' : 'ok';
}

/** What the room does when its alarm rings: write what waits, then empty a room idle past PURGE_MS, or ring again. */
export function alarmPlan(o: { now: number; seen: number; live: number }): { purge: boolean; next: number | null } {
  if (o.live > 0) return { purge: false, next: o.now + PURGE_MS };
  if (o.now - o.seen >= PURGE_MS) return { purge: true, next: null };
  return { purge: false, next: o.seen + PURGE_MS };
}
