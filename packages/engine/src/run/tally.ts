// THE FIGHT TALLY (rules 1.47; docs/design/survival-spec.md rule 35, section 4.2 item 5; Survival build step 6).
//
// What a run's fight did, per character, read off the effects stream and nothing else. A tap on `fxTaps` copies the
// few events the tally reads into the fight's tape (`cb.tape`, switched on by the run when it starts a fight: no other
// fight keeps one); `fightTally` is a pure function over that tape and the fight's units, computed when the fight ends
// and kept on the run's fight record. There is no counter inside combat.
//
// What the stream does not say is not counted, and is listed in docs/design/handoffs/survival-step-6.md:
//   - Shields GIVEN: `grantShield` emits a hook, not an effect (only two classes emit a `shield` event with a size), so
//     the tally has the damage a character's shield soaked (`absorbed`), not what was given.
//   - A `hurt` or a `heal` carries no source: it is credited to the unit whose `turn` is open (the actor); damage or
//     healing made while a foe's turn is open (a reaction, a bleed) is the fight's `other`, and a heal that no effect
//     reports (the perk `mend` op, a Bond) is missing from `healed`.
import { fxTaps } from '../fxtap';
import type { Combat, Unit } from '../combat';

/** One event of the tape: the fields the tally reads, copied when the effect was emitted. */
export interface TapeEv { k: string; unit?: string; target?: string; dmg?: number; hit?: boolean; amount?: number; absorbed?: number; dead?: boolean; surrendered?: boolean; object?: boolean }
/** What one character did in one fight (rules 1.47). `shots`/`hits`: weapon attacks made and landed (a Burst's rounds
 * count each); `absorbed`: damage its shield soaked; `deaths`: Downs that were deaths. */
export interface TallyRow { name: string; dealt: number; taken: number; healed: number; absorbed: number; kills: number; downs: number; deaths: number; shots: number; hits: number }
/** A fight's tally: a row per character of the squad (by character id), and what no one's turn owns (`other`). */
export interface FightTally { rounds: number; chars: Record<string, TallyRow>; other: { dealt: number; healed: number } }

const KINDS = new Set(['turn', 'shot', 'melee', 'hurt', 'heal', 'leech', 'shield', 'down']);
/** The few fields the tally reads, of one effect. */
function slim(ev: { k: string; [x: string]: any }): TapeEv {
  const e: TapeEv = { k: ev.k };
  for (const f of ['unit', 'target'] as const) if (typeof ev[f] === 'string') e[f] = ev[f];
  if (typeof ev.dmg === 'number') e.dmg = ev.dmg;
  if (typeof ev.amount === 'number') e.amount = ev.amount;
  if (typeof ev.absorbed === 'number') e.absorbed = ev.absorbed;
  if (ev.hit) e.hit = true;
  if (ev.dead) e.dead = true;
  if (ev.surrendered) e.surrendered = true;
  if (ev.object) e.object = true;
  return e;
}
// The tap keeps the effect itself, not a copy: a shot's damage is written on it after it is emitted (combat.ts
// resolveAttack), so it is read when the action is done. Only a fight that has a tape (a run's) keeps one.
fxTaps.push((cb: Combat, ev) => { if (cb.tape && KINDS.has(ev.k)) cb.tape.push(ev as TapeEv); });
/** When an action is done (game.ts `apply`): the tape's effects are cut down to the fields the tally reads, so a saved fight carries little. */
export function settleTape(cb: Combat) { if (cb.tape) cb.tape = cb.tape.map(slim); }

const blank = (name: string): TallyRow => ({ name, dealt: 0, taken: 0, healed: 0, absorbed: 0, kills: 0, downs: 0, deaths: 0, shots: 0, hits: 0 });
/** The tally of a fight from its tape and units (pure). A character is a squad unit that has a `charId`. */
export function fightTally(tape: TapeEv[], units: Pick<Unit, 'id' | 'side' | 'name' | 'charId' | 'companion'>[], rounds: number): FightTally {
  const squad = new Map<string, TallyRow>(), charOf = new Map<string, string>(), side = new Map<string, string>();
  for (const u of units) { side.set(u.id, u.side); if (u.side === 'pc' && u.charId && !u.companion) { charOf.set(u.id, u.charId); squad.set(u.charId, blank(u.name)); } }
  const row = (unit?: string): TallyRow | null => { const c = unit && charOf.get(unit); return c ? squad.get(c)! : null; };
  const t: FightTally = { rounds, chars: {}, other: { dealt: 0, healed: 0 } };
  const lastBy = new Map<string, string>(), fell = new Set<string>();
  let actor: string | undefined;
  /** One blow from `by` on `target`: the target's taken, the attacker's dealt (a blow on a foe by no one of the squad is `other`). */
  const damage = (by: string | undefined, target: string | undefined, n: number) => {
    if (!target || n <= 0) return;
    const victim = row(target); if (victim) victim.taken += n;
    if (side.get(target) !== 'foe') return;
    const me = row(by); if (me) { me.dealt += n; lastBy.set(target, by!); } else t.other.dealt += n;
  };
  for (const e of tape) {
    if (e.k === 'turn') { actor = e.unit; continue; }
    if (e.k === 'shot' || e.k === 'melee') {
      if (e.object || !e.unit) continue;
      const me = row(e.unit); if (me) { me.shots++; if (e.hit) me.hits++; }
      damage(e.unit, e.target, e.hit ? e.dmg || 0 : 0);
    } else if (e.k === 'hurt') damage(actor, e.target, e.dmg || 0);
    else if (e.k === 'heal' || e.k === 'leech') {
      const n = e.amount || 0, to = e.k === 'heal' ? e.target : e.unit, by = e.k === 'leech' ? e.unit : actor;
      if (side.get(to || '') !== 'pc') continue;
      const me = row(by); if (me) me.healed += n; else t.other.healed += n;
    } else if (e.k === 'shield') { const r = row(e.target); if (r) r.absorbed += e.absorbed || 0; }
    else if (e.k === 'down' && e.unit) {
      const r = row(e.unit);
      if (r) { if (e.dead) r.deaths++; else r.downs++; }
      else if (side.get(e.unit) === 'foe' && !fell.has(e.unit)) { fell.add(e.unit); const k = row(lastBy.get(e.unit)); if (k) k.kills++; }
    }
  }
  for (const [id, r] of squad) t.chars[id] = r;
  return t;
}
/** Tallies added together: a row per character (by id) across the fights, the rounds and `other` summed. */
export function sumTallies(list: (FightTally | undefined)[]): FightTally {
  const out: FightTally = { rounds: 0, chars: {}, other: { dealt: 0, healed: 0 } };
  for (const t of list) {
    if (!t) continue;
    out.rounds += t.rounds; out.other.dealt += t.other.dealt; out.other.healed += t.other.healed;
    for (const [id, r] of Object.entries(t.chars)) { const o = (out.chars[id] ||= blank(r.name)); for (const k of Object.keys(r) as (keyof TallyRow)[]) if (k !== 'name') (o[k] as number) += r[k] as number; }
  }
  return out;
}
