// Deeds the engine sees (rules 1.14; balance pass section 11: "the engine takes everything it can"). A combo perk is
// earned by a deed. Nine of the deeds happen in a fight where the engine can watch them: this file watches, and grants
// the perk the moment the deed completes, through the SAME code the Narrator's deeds[] uses (game.ts grantCombo, handed
// in through deedGrant so this file needs no import of game.ts). The Narrator can still grant any of them by hand.
//
// What a detector remembers lives on the fight (cb.deeds: plain data, so it survives the reducer's clone and a save),
// keyed by unit id. Detectors only write that memory until a deed completes; nothing else changes.
// Every condition below is PROVISIONAL (spec item 1014) and listed in the spec, "Deeds the engine sees".
import { PERK } from './data';
import { comboEligible } from './character';
import { type Combat, type Unit, xy, dist } from './combat';
import { kindOf } from './objects';
import { onHook, boundGame } from './effects/hooks';
import { fxTaps } from './fxtap';

/** The grant, set by game.ts (the Narrator's own code path): true when the perk was given. */
export const deedGrant: { f: ((g: any, d: { charId: string; perkId: string; deed: string }) => boolean) | null } = { f: null };

/** The deeds the engine watches: perk id -> the condition it is read as (the spec's list, for the Narrator's brief and the tests). */
export const ENGINE_DEEDS = {
  charge: 'On your first turn of the fight, before you do anything but move, you run 3 or more tiles in a straight line and end next to an enemy (or use the Charge technique), with 2 or more enemies standing; and the fight is won.',
  field_surgeon: 'An enemy or a hazard (not the squad, not their own heart) put an ally Downed or under 10% of max HP, and your healing gets them back up, or to 10% or more.',
  dance_of_iron: 'Three enemy attacks at you miss in one round, while you are on your feet; one burst or volley is one attack.',
  between_heartbeats: 'The fight opened with an enemy Hidden and nobody of yours Hidden; you were there from the start, an enemy attacked you at least once, no enemy attack hit you and you took no damage but your own; you end it on your feet, and the fight is won.',
  siege_engine: 'You destroy a closed door or a piece of full cover that blocks the way and stood there when the fight opened, you then move through the gap, and the fight is won.',
  twin_souls: 'You suffer a Mana Short and are alive when the fight ends.',
  bite_the_bullet: 'From the start of your first turn to the end of a won fight of 2 rounds or more, your HP is never at a quarter of your max or above and you are never Downed; an enemy attacked you at least once; you end it on your feet.',
  fire_sermon: 'You are Faithful, and an enemy surrenders to your words in a fight (talked down, or your mercy accepted).',
  the_voice: 'An Elite or a Boss surrenders to your words in a fight.',
} satisfies Record<string, string>;
/** The nine perk ids, read off the list above. (Written ID.x and never as a quoted id: the client's shelf test reads a
 *  quoted perk id in the core's source as "the core runs this perk's effect", and this file only grants perks.) */
const ID = Object.fromEntries(Object.keys(ENGINE_DEEDS).map((k) => [k, k])) as { [K in keyof typeof ENGINE_DEEDS]: string };
/** PROVISIONAL (item 1014): the numbers in the conditions above. */
export const DEED_RULES = { charge_tiles: 3, charge_line: 2, surgeon_pct: 10, dodges: 3, bullet_quarter: 4, bullet_rounds: 2, attacked: 1 };

/** One unit's memory. s: there when the fight opened. open: 0 nothing done yet, 1 opened with a charge, 2 opened another way.
 *  ln: 2 or more enemies stood when its first turn began. at: enemy attacks made at it (hit or miss). hit: an enemy hit it or hurt it. dg: [round, attacks that missed it that
 *  round, the last one's attacker and volley]. gap: the tiles of the walls it broke. wall: it went through one of them.
 *  short: had a Mana Short. bb: 1 below a quarter since its first turn, 2 not. low: an enemy or a hazard (not the squad,
 *  not itself) put it Downed or under 10%, and it has not been above since. */
interface Mem { s?: 1; open?: 0 | 1 | 2; ln?: 1; at?: number; hit?: 1; dg?: [number, number, string?]; gap?: string[]; wall?: 1; short?: 1; bb?: 1 | 2; low?: 1 }
/** The fight's memory. amb: it opened as an ambush on the squad. walls: the ids of the doors and blocking full cover that
 *  stood when it opened (what the squad puts up in the fight is not a wall of the place). v: the number of the last
 *  burst or volley fired (so two bursts in a row are two attacks). u: by unit id. */
interface DeedMem { amb: boolean; walls: string[]; v?: number; u: Record<string, Mem> }

const isPc = (u: Unit | null | undefined): u is Unit => !!u && typeof u === 'object' && !!u.charId && !u.companion && u.side === 'pc';
const up = (u: Unit) => !u.dead && !u.downed && !u.surrendered;
/** Does the unit's character serve a patron (Faithful, not Atheist)? Read as faith.ts beliefOf reads it. */
const faithful = (u: Unit) => { const c: any = boundGame()?.characters?.[u.charId || '']; return !!c && (c.belief ? c.belief.kind === 'faithful' && !!c.belief.patron : !!c.patron); };
/** Self-inflicted harm (Strain, a Mana Short, Flux, an overload) is not "being hit". */
const SELF = new Set(['short', 'overload', 'strain', 'flux', 'heart', 'shame']);
/** Words that make an enemy give up (tactics.ts surrender's reasons): the offer of terms and the fight talk; Clemency. */
const WORDS = /^(talked down|mercy accepted)/;
const under10 = (u: Unit) => !!u.downed || u.hp * 100 < u.maxHp * DEED_RULES.surgeon_pct;
/** A door, or full cover that blocks the way (a barricade, a pillar); never a wall of magic. */
const isWall = (o: any) => { if (!o || o.kind === 'sigil_wall' || o.sigilWall || o.grandWall) return false; const k = kindOf(o); return !!k && !!(k.door || (k.cover === 'full' && k.blocks_move)); };

/** The fight's memory. It is made when the fight opens (fresh: who is Hidden, who is there, which walls stand). A fight
 *  with no memory that is already under way (a save from before this build) gets an empty one: nobody opened it, it was
 *  no ambush, nobody was under a quarter from their first turn, no wall counts. Nothing is guessed from the middle. */
function memOf(cb: Combat, fresh = false): DeedMem {
  const x = cb as any;
  if (!x.deeds) {
    const d: DeedMem = { amb: false, walls: [], u: {} };
    if (fresh) {
      d.amb = cb.units.some((u) => u.side === 'foe' && u.hidden && !u.dead) && !cb.units.some((u) => u.side === 'pc' && u.hidden);
      d.walls = (cb.objects || []).filter((o: any) => isWall(o) && !(o.hp != null && o.hp <= 0)).map((o: any) => o.id);
      for (const u of cb.units) if (isPc(u)) d.u[u.id] = { s: 1, open: 0 };
      for (const u of cb.units) if (u.side === 'pc' && !u.dead && under10(u)) (d.u[u.id] ||= { open: 2, bb: 2 }).low = 1; // a wound carried in from an earlier fight
    }
    x.deeds = d;
  }
  if (!x.deeds.walls) x.deeds.walls = [];
  return x.deeds;
}
const of = (cb: Combat, u: Unit): Mem => (memOf(cb).u[u.id] ||= { open: 2, bb: 2 }); // a late joiner didn't open the fight

/** Grant a deed's perk to a unit's character if it may have it (eligible, not held, alive; never in the Proving Ground). */
function grant(cb: Combat, u: Unit, perkId: string): boolean {
  const g = boundGame(); if (!g || g.sandbox || !deedGrant.f || !isPc(u)) return false;
  const c = g.characters?.[u.charId!]; if (!c || c.dead || comboEligible(c, perkId)) return false;
  const s = String((PERK as any)[perkId]?.deed || '').trim();
  return deedGrant.f(g, { charId: c.id, perkId, deed: s.charAt(0).toUpperCase() + s.slice(1) });
}

/** A walk of n or more tiles in one straight line that ends next to a living enemy it closed on. */
function charged(cb: Combat, u: Unit, from: string, route: string[]): boolean {
  if (!Array.isArray(route) || !route.length) return false;
  const pts = route[0] === from ? route : [from, ...route];
  if (pts.length - 1 < DEED_RULES.charge_tiles) return false;
  const [x0, y0] = xy(pts[0]), [x1, y1] = xy(pts[1]), dx = x1 - x0, dy = y1 - y0;
  for (let i = 1; i < pts.length - 1; i++) { const [ax, ay] = xy(pts[i]), [bx, by] = xy(pts[i + 1]); if (bx - ax !== dx || by - ay !== dy) return false; }
  const end = pts[pts.length - 1];
  return cb.units.some((e) => e.side !== u.side && up(e) && dist(end, e.pos) <= 1 && dist(from, e.pos) > dist(end, e.pos));
}
const quarter = (u: Unit) => u.hp * DEED_RULES.bullet_quarter < u.maxHp;
/** Bite the Bullet: once HP is at a quarter or above after the first turn began, or the character goes Downed, the deed
 *  is off for this fight. (Also here: an ally back at 10% or more is no longer "below 10%" for Field Surgeon.) */
function biteCheck(cb: Combat) {
  const d = memOf(cb);
  for (const u of cb.units) { const m = d.u[u.id]; if (!m) continue; if (m.bb === 1 && (!quarter(u) || u.downed || u.dead)) m.bb = 2; if (m.low && !u.dead && !under10(u)) delete m.low; }
}
/** Charge!: "the enemy line" is 2 or more enemies on their feet. */
const line = (cb: Combat, u: Unit) => cb.units.filter((e) => e.side !== u.side && up(e)).length >= DEED_RULES.charge_line;
/** An enemy attack was made at this unit (hit or miss): Between Heartbeats and Bite the Bullet need the danger to be real. */
const attacked = (cb: Combat, t: Unit) => { const m = of(cb, t); m.at = (m.at || 0) + 1; };

// ---------- the detectors ----------
onHook('combat_start', (_ctx, cb) => { memOf(cb, true); });

onHook('turn_start', (ctx, cb) => {
  const u: Unit = ctx.u; if (!isPc(u)) return;
  const m = of(cb, u);
  if (m.open === 0) { if (line(cb, u)) m.ln = 1; else delete m.ln; } // Charge!: the enemy line, as it stands when your first turn begins
  if (m.bb == null) m.bb = quarter(u) && !u.downed && !u.dead ? 1 : 2; // its first turn: under a quarter and on its feet, or the deed is off
  biteCheck(cb);
});
onHook('turn_end', (ctx, cb) => {
  const u: Unit = ctx.u; if (isPc(u)) { const m = of(cb, u); if (m.open === 0) m.open = 2; } // a first turn with no charge
  biteCheck(cb);
});

// Charge!: the opening move.
onHook('moved', (ctx, cb) => {
  const u: Unit = ctx.u; if (!isPc(u) || ctx.forced) return;
  const m = of(cb, u);
  // Siege Engine: "break THROUGH": the one who broke the wall goes through the gap.
  if (m.gap && !m.wall && Array.isArray(ctx.route) && [ctx.to, ...ctx.route].some((k: string) => m.gap!.includes(k))) m.wall = 1;
  if (m.open !== 0 || cb.order[cb.turn] !== u.id) return; // the opening is your own first turn (a move on someone else's turn is not it)
  if (ctx.how === 'swap') { m.open = 2; return; }
  if (charged(cb, u, ctx.from, ctx.route) && m.ln) m.open = 1;
});
onHook('action_done', (ctx, cb) => {
  biteCheck(cb);
  const u: Unit = ctx.u, a = ctx.a; if (!isPc(u) || !a || a.react || a.unitId !== u.id) return;
  const m = of(cb, u); if (m.open !== 0) return;
  if (a.type === 'combat/technique' && a.id === 'charge') m.open = m.ln ? 1 : 2; // the Charge technique (its run may have been walked before)
  else if (a.type !== 'combat/move') m.open = 2; // anything else first: the fight wasn't opened with a charge
});

// Dance of Iron: three attacks at you miss in one round.
onHook('on_miss', (ctx, cb) => {
  const t: Unit = ctx.tgt, a: Unit = ctx.att; if (!isPc(t) || !a || a.side === t.side || !up(t)) return;
  const m = of(cb, t), key = ctx.volley ? a.id + '|' + ctx.volley + '|' + (memOf(cb).v || 0) : '', same = !!m.dg && m.dg[0] === cb.round;
  if (same && key && m.dg![2] === key) return; // the next shot of the same burst or volley: one attack, counted once
  attacked(cb, t);
  m.dg = [cb.round, same ? m.dg![1] + 1 : 1, key];
  if (m.dg[1] === DEED_RULES.dodges) grant(cb, t, ID.dance_of_iron);
});

// Between Heartbeats: hit, or hurt by anything but your own heart.
onHook('on_hit', (ctx, cb) => { const t: Unit = ctx.tgt, a: Unit = ctx.att; if (isPc(t) && a && a.side !== t.side) { of(cb, t).hit = 1; attacked(cb, t); } });
onHook('on_damaged', (ctx, cb) => {
  const t: Unit = ctx.t; if (!t || t.side !== 'pc' || !(ctx.dmg > 0)) return;
  const src = ctx.src || {}; if (src.self || SELF.has(src.type) || src.by === t) return;
  // Field Surgeon: who put them below 10%? The squad's own fire (a friendly setup) does not count.
  if (!(src.by && src.by.side === t.side) && !t.dead && under10(t)) of(cb, t).low = 1;
  if (isPc(t)) of(cb, t).hit = 1;
});
onHook('on_downed', (ctx, cb) => {
  const t: Unit = ctx.victim; if (!t || t.side !== 'pc' || t.dead) return;
  const src = ctx.src || {}; if (src.self || SELF.has(src.type) || src.by === t || (ctx.by && ctx.by.side === t.side)) return;
  of(cb, t).low = 1;
});

// Field Surgeon: a squadmate back from below 10% HP.
onHook('heal_given', (ctx, cb) => {
  const t: Unit = ctx.t, by: Unit = ctx.by, m = t ? memOf(cb).u[t.id] : undefined;
  // m.low: an enemy or a hazard put them there (not the squad's own fire, not their own heart)
  const back = !!m && !!m.low && !t.dead && !t.downed && (!!ctx.revived || !under10(t));
  if (back) delete m!.low;
  biteCheck(cb);
  if (back && isPc(by) && t !== by && t.side === by.side) grant(cb, by, ID.field_surgeon);
});

// Siege Engine: a wall (a door, or full cover that blocks the way) broken by you.
onHook('object_destroyed', (ctx, cb) => {
  const by: Unit = ctx.by, o = ctx.obj; if (!isPc(by) || !o) return;
  if (!isWall(o) || o.open || !memOf(cb).walls.includes(o.id)) return; // not a wall; a door standing open; or put up during the fight
  const m = of(cb, by), gap = (m.gap ||= []); if (!gap.includes(o.pos)) gap.push(o.pos);
});

// Twin Souls: a Mana Short (magic.ts manaShort has no hook of its own; its fx 'short' is the event).
fxTaps.push((cb: Combat, ev: any) => {
  if (ev.k === 'volley') { memOf(cb).v = (memOf(cb).v || 0) + 1; return; } // Dance of Iron: a new burst or volley begins
  if (ev.k !== 'short' || !ev.unit) return;
  const u = cb.units.find((x) => x.id === ev.unit); if (isPc(u)) of(cb, u).short = 1;
});

// Fire Sermon and The Voice: an enemy gives up to your words.
onHook('on_surrender', (ctx, cb) => {
  const t: Unit = ctx.t, by: Unit = ctx.by; if (!isPc(by) || !t || t.side === by.side || !WORDS.test(String(ctx.why || ''))) return;
  if (faithful(by)) grant(cb, by, ID.fire_sermon); // a conversion needs a believer (rules 1.14, spec item 1110)
  if (t.tier === 'elite' || t.tier === 'boss') grant(cb, by, ID.the_voice);
});

// The deeds that need the fight's end.
onHook('combat_end', (ctx, cb) => {
  biteCheck(cb);
  const d = memOf(cb), won = !!ctx.won;
  for (const u of cb.units) {
    const m = d.u[u.id]; if (!m || !isPc(u)) continue;
    if (m.short && !u.dead) grant(cb, u, ID.twin_souls);
    if (!won) continue;
    if (m.open === 1) grant(cb, u, ID.charge);
    if (m.wall) grant(cb, u, ID.siege_engine);
    const at = (m.at || 0) >= DEED_RULES.attacked;
    if (d.amb && m.s && at && !m.hit && up(u)) grant(cb, u, ID.between_heartbeats);
    if (m.bb === 1 && at && up(u) && cb.round >= DEED_RULES.bullet_rounds) grant(cb, u, ID.bite_the_bullet);
  }
});
