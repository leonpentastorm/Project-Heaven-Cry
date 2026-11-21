// Rules 1.60 (Doors 3.0) items 4604 to 4610 (N3, approved by the lead 16 Nov 2026): THE BETA FEEDS ITS DOOR. Each
// attribute's beta skill (skills.json `feed`) raises one number of its attribute's alpha door, and only that beta raises
// it: the door's number x (1 + per_point.numbers.feed x alpha points x beta points). This file is the one copy of that formula
// (doorFeed), of the carried remainder of a per-turn count (feedCarry), of a TN-like whole step (feedStep) and of the
// door tab's line (doorFeedView). Each door's ONE function multiplies by it through the carrier the data names
// (`feed.carrier`): code names a carrier (a rule), never a skill. The source `feed:<door>` (triggers.ts sourceOf,
// actions.ts holderNumber) lets a data row read it (Conscience's prayer shields, Slide's reach). Camaraderie's carrier, the heal back, is tactics.ts's listener.
import { SKILLS } from '../data';
import type { Unit } from '../combat';
import { charOfUnit } from './hooks';

/** One beta's feed: the beta, the door (its attribute's alpha skill), the carrier (the door's number it raises), its
 * product step (per_point.numbers.feed), the step at a doubled feed (per_point.numbers.feed_at_double: a TN, a share)
 * and the feed row (its texts; tied, how). */
export interface Feed { beta: string; betaName: string; door: string; carrier: string; per: number; /** rules 1.96 item 8329 (ruling 20): what each beta point adds on its own (per_point.numbers.feed_flat; 0 when absent) */ flat: number; atDouble: number; row: any }
export const FEEDS: Feed[] = (SKILLS as any[]).filter((s) => s.feed).map((s) => {
  const door = (SKILLS as any[]).find((a) => a.attribute === s.attribute && a.slot === 'alpha');
  if (!door) throw new Error('skills.json ' + s.id + '.feed: its attribute has no alpha skill to feed.');
  const n = s.per_point?.numbers || {};
  // rules 1.100 item 8375: a beta with no product step feeds by its flat term alone (Rumination: feed_flat, no feed)
  if (typeof s.feed.carrier !== 'string' || !(n.feed > 0 || (n.feed == null && n.feed_flat > 0))) throw new Error('skills.json ' + s.id + ': a feed needs its carrier and per_point.numbers.feed (or, with none, feed_flat).');
  return { beta: s.id, betaName: s.name, door: door.id, carrier: s.feed.carrier, per: Number(n.feed) || 0, flat: Number(n.feed_flat) || 0, atDouble: Number(n.feed_at_double) || 0, row: s.feed };
});
const BY_DOOR: Record<string, Feed> = Object.fromEntries(FEEDS.map((f) => [f.door, f]));
export const FEED_BY_CARRIER: Record<string, Feed> = Object.fromEntries(FEEDS.map((f) => [f.carrier, f]));
/** The feed of a door's number by its carrier (throws on a carrier no beta names: a typo in code). */
export const feedRow = (carrier: string): Feed => { const f = FEED_BY_CARRIER[carrier]; if (!f) throw new Error('No beta feeds the carrier "' + carrier + '" (skills.json feed.carrier).'); return f; };

/** A unit's or a sheet's points in a skill: a unit reads its character (else what it was built with: a stat block); a
 * sheet (anything without a tile) its own `skills`. */
function pts(x: any, sk: string): number {
  if (!x) return 0;
  if (x.pos === undefined) return Number(x.skills?.[sk]) || 0;
  const c = x.companion ? null : charOfUnit(x);
  return Number(c ? (c.skills as any)?.[sk] : x[sk]) || 0;
}
/** THE FEED: 1 + feed_flat x the beta's points + per_point.numbers.feed x the door's alpha points x its beta's points
 * (rules 1.96 item 8329, ruling 20: every beta point counts from the first; x1 for a door no beta feeds). */
export function doorFeed(x: any, door: string): number { const f = BY_DOOR[door]; if (!f) return 1; const b = pts(x, f.beta); return 1 + f.flat * b + f.per * pts(x, door) * b; }
/** The feed of the door whose number this carrier is. */
export const feedOf = (x: any, carrier: string): number => doorFeed(x, feedRow(carrier).door);
/** A whole step for a number that rounds (a TN, a reach): round(at_double x the product term), at_double the row's own
 * number (per_point.numbers.feed_at_double: what the step is when the feed is doubled), plus feed_flat whole steps a
 * beta point (rules 1.99 item 8364, ruling 20: on a whole step the flat term is whole points: Analysis +1 search TN a
 * point from the first). */
export const feedStep = (x: any, carrier: string): number => { const f = feedRow(carrier), b = pts(x, f.beta); return Math.round(f.atDouble * f.per * pts(x, f.door) * b) + Math.round(f.flat * b); };
/** A count a turn (Momentum lost, Pressure shed) moved by a fraction: the whole part of `gain` with what was carried
 * from before; the rest is kept on the unit (Unit.feedCarry) for the next time, so every beta point counts. */
export function feedCarry(u: Unit, carrier: string, gain: number): number {
  if (!(gain > 0)) return 0;
  const m = (u.feedCarry ||= {}), t = (m[carrier] || 0) + gain, n = Math.floor(t + 1e-9), r = t - n;
  if (r > 1e-9) m[carrier] = r; else delete m[carrier];
  if (!Object.keys(m).length) delete u.feedCarry;
  return n;
}

/** What each carrier's number is now for this unit or sheet, for the door tab's line (registered by the door's own
 * module beside its one function; a carrier with none shows the feed as a percentage). */
const SHOWN: Record<string, (x: any) => number> = {};
export const showFeedNumber = (carrier: string, f: (x: any) => number) => { SHOWN[carrier] = f; };
/** The door tab's beta line (rules 1.60 item 4604): the number now, the beta that feeds it, and what the next point
 * buys, in the row's own words (`line`, `next`; {beta} {points} {now} {next} {pct}). Null for a door no beta feeds. */
export interface DoorFeedView { door: string; beta: string; betaName: string; points: number; mult: number; now: number; next: number | null; line: string }
export function doorFeedView(x: any, door: string): DoorFeedView | null {
  const f = BY_DOOR[door]; if (!f || !x) return null;
  const p = pts(x, f.beta), num = (q: any) => (SHOWN[f.carrier] ? SHOWN[f.carrier](q) : Math.round((doorFeed(q, door) - 1) * 100));
  const now = num(x), mult = doorFeed(x, door);
  const up = p < 10 ? num(withPoints(x, f.beta, p + 1)) : null, next = up != null && up !== now ? up : null;
  const fill = (s: string) => String(s || '').replace(/\{beta\}/g, f.betaName).replace(/\{points\}/g, String(p)).replace(/\{now\}/g, String(now)).replace(/\{next\}/g, String(next)).replace(/\{pct\}/g, String(Math.round((mult - 1) * 100)));
  return { door, beta: f.beta, betaName: f.betaName, points: p, mult, now, next, line: p > 0 && now !== num(withPoints(x, f.beta, 0)) ? fill(f.row.line) + (next != null && f.row.next ? fill(f.row.next) : '') : firstLine(x, f, p, num) };
}
/** The line while the beta gives nothing yet (0 points, or points that have not moved the number): only what the first
 * point that moves it gives, "First Camaraderie point: 2% of what you heal ..." ("At Analysis 2: ..." when the first
 * point moves nothing). The row's own `line` from its colon on, read at that point. '' when no point up to 10 moves it. */
function firstLine(x: any, f: Feed, p: number, num: (q: any) => number): string {
  const base = num(withPoints(x, f.beta, 0));
  for (let k = p + 1; k <= 10; k++) {
    const q = withPoints(x, f.beta, k), v = num(q); if (v === base) continue;
    const rest = String(f.row.line || '').replace(/^[^:]*:\s*/, '').replace(/\{beta\}/g, f.betaName).replace(/\{points\}/g, String(k)).replace(/\{now\}/g, String(v)).replace(/\{pct\}/g, String(Math.round((doorFeed(q, f.door) - 1) * 100)));
    return (k === 1 ? 'First ' + f.betaName + ' point: ' : 'At ' + f.betaName + ' ' + k + ': ') + rest;
  }
  return '';
}
/** A look-alike of a unit or a sheet with one more point in a skill (the "next point" of the view; never written back). */
function withPoints(x: any, sk: string, n: number): any {
  if (x.pos === undefined) return { ...x, skills: { ...(x.skills || {}), [sk]: n } };
  const c = x.companion ? null : charOfUnit(x);
  return c ? { ...c, skills: { ...(c.skills || {}), [sk]: n }, level: x.level ?? c.level } : { ...x, pos: undefined, skills: { [sk]: n, [doorOfBeta(sk)]: pts(x, doorOfBeta(sk)) }, level: x.level };
}
const doorOfBeta = (beta: string): string => FEEDS.find((f) => f.beta === beta)?.door || beta;
