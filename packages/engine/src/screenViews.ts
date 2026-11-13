// Classes 3.0 step 10 (the screen): what the fight screen shows of the systems of Revision 4, read from the engine's own
// state and rules (no rule here: each line names the engine function it reads). The client renders these; it never works
// out a Bond, a cap or a reaction count itself (apps/web/src/game/boundary.test.ts).
//   bondView      the Bond strip (bonds-spec.md section 9): your Bonds, allies and enemies apart, the cap, the Attuner
//   reactionView  the reaction pips (reactions-spec.md section 9): reactions this round, spent, the Answers switched on
import type { Combat, Unit } from './combat';
import type { Character } from './character';
import { focusHand } from './character';
import { tiesOf, tieCap, tieKind } from './kit';
import { condName, condOn } from './magic';
import { UNTIL } from './condtable';
import { maxReactions, reactionsUsed, cueLive } from './tactics';
import { TECHNIQUE } from './physical';
import { SKILL } from './data';
import { ownerOf } from './owned';

/** One unit on the Bond strip. */
export interface BondChip {
  id: string; name: string; side: 'ally' | 'foe'; hp: number; maxHp: number; downed: boolean;
  /** Its conditions now (the mark of the tie left out), by name. */
  conds: string[];
  /** An enemy: the echo of your care waiting to land on it at its next turn's start (queued deals of yours, cb.delayed). */
  echo: number;
  /** An enemy whose Bond runs out (a Boss's: the mark's rounds, rules 1.33); null: it holds until let go or broken. */
  rounds: number | null;
}
/** The Bond strip of a unit (bonds-spec.md section 9). Null: it has no Bond door and holds no Bond. */
export interface BondView {
  cap: number; held: number; allies: BondChip[]; enemies: BondChip[];
  /** Empty places up to the cap (0 with no cap). */
  open: number;
  /** Where the door's focus is: in hand (the threads live), in the pack (Bonds held, threads quiet), or none. */
  focus: 'hand' | 'pack' | 'none';
  /** The words the strip shows when the threads are quiet (the Attuner in the pack), else null. */
  quiet: string | null;
}
const BOND = 'bond';
/** The bonded mark's rounds left, when they run out (a held condition counts very high: no end). */
const FOREVER = UNTIL;
function chipOf(cb: Combat, me: Unit, v: Unit, mark: string | undefined): BondChip {
  const echo = (cb.delayed || []).filter((d: any) => d.holder === me.id && d.target === v.id && d.op?.op === 'deal').reduce((n: number, d: any) => n + Math.round(d.op?.fixed?.n || 0), 0);
  const left = mark && v.conds ? v.conds[mark] : undefined;
  return { id: v.id, name: v.name, side: v.side === me.side ? 'ally' : 'foe', hp: Math.max(0, v.hp), maxHp: v.maxHp, downed: !!v.downed,
    conds: Object.keys(v.conds || {}).filter((k) => k !== mark && condOn(v, k)).map(condName),
    echo, rounds: v.side !== me.side && typeof left === 'number' && left > 0 && left < FOREVER ? left : null };
}
/** The Bond strip: the ties of kind `bond` from this unit (kit.ts tiesOf), its cap (tieCap), its Attuner (hasAttuner). */
export function bondView(cb: Combat, me: Unit, c: Character | null): BondView | null {
  if (!tieKind(BOND)) return null;
  const ties = tiesOf(cb, me, BOND, 'from');
  const door = !!c && (c.skills?.empathy || 0) > 0;
  if (!door && !ties.length) return null;
  const cap = tieCap(cb, me, BOND), mark = tieKind(BOND)?.mark;
  const units = ties.map((t) => cb.units.find((v) => v.id === t.to)).filter((v): v is Unit => !!v && !v.dead);
  const chips = units.map((v) => chipOf(cb, me, v, mark));
  const at = c ? focusHand(c, 'attuner') : null; // character.ts: the main or off hand, the pack, or none
  const focus: BondView['focus'] = at === 'main' || at === 'off' ? 'hand' : at === 'pack' ? 'pack' : 'none';
  return { cap: Number.isFinite(cap) ? cap : chips.length, held: chips.length, allies: chips.filter((x) => x.side === 'ally'), enemies: chips.filter((x) => x.side === 'foe'),
    open: Number.isFinite(cap) ? Math.max(0, cap - chips.length) : 0, focus,
    quiet: focus === 'pack' ? 'Attuner in pack: Bonds held, threads quiet' : focus === 'none' && door ? 'No Attuner: Bonds need one in hand' : null };
}

/** The reaction pips (reactions-spec.md section 9). */
export interface ReactionView {
  /** Reactions this round (tactics.ts maxReactions: one, two for the Skirmisher's Reflex; 0 Stunned). */
  max: number; used: number; left: number;
  /** A Cue gives one more until the speaker's next turn (tactics.ts cueLive). */
  cue: boolean;
  /** The Answers this character keeps switched on, by name (phys.answers); null: it keeps none, so every Answer is on. */
  answers: string[] | null;
}
const answerName = (id: string): string => (TECHNIQUE as any)[id]?.name
  || (Object.values(SKILL as any).flatMap((s: any) => Object.values(s.unlocks || {})).find((x: any) => JSON.stringify(x?.effects || []).includes('"answer_on":"' + id + '"')) as any)?.name
  || id.replace(/_/g, ' ');
export function reactionView(cb: Combat, u: Unit, c: Character | null): ReactionView {
  const max = maxReactions(u, cb), used = Math.min(max, reactionsUsed(cb, u));
  const on = (c as any)?.phys?.answers;
  return { max, used, left: Math.max(0, max - used), cue: cueLive(cb, u), answers: Array.isArray(on) ? on.map(answerName) : null };
}

/** An owned unit as the screen reads it (figments-spec.md section 9: a Figment's token names its owner; Classes 3.0 P9). */
export interface OwnedView {
  ownerId: string; ownerName: string;
  /** The record's kind: 'figment', else 'companion' (the drone, the beast). */
  kind: string;
  /** No turn of its own: its owner acts through it on the owner's turn, with the owner's AP. */
  turnless: boolean;
  /** The line a token's card shows: "Ha's Figment: Ha acts through it." */
  line: string;
}
/** Null: the unit is not an owned unit (owned.ts ownerOf: the far end of its `owned` tie). */
export function ownedView(cb: Combat, u: Unit): OwnedView | null {
  const rec: any = (u as any).owned, owner = rec ? ownerOf(cb, u) : null;
  if (!rec || !owner) return null;
  const kind = rec.kind || 'companion', turnless = rec.turn === 'owner';
  const what = kind === 'figment' ? 'Figment' : 'companion';
  return { ownerId: owner.id, ownerName: owner.name, kind, turnless,
    line: owner.name + '\'s ' + what + (turnless ? ': ' + owner.name + ' acts through it (no turn of its own)' : ': it acts on its own turn') };
}

/** A tie the map draws (Classes 3.0 step 10, Leon: a Bond's faint line). */
export interface TieLine {
  /** kind:from:to, stable while the tie lasts. */
  key: string; kind: string; from: string; to: string; fromPos: string; toPos: string;
  /** ally: the far end is of the near end's side; foe: another side's (drawn dashed). */
  side: 'ally' | 'foe';
  ink: string; /** '' solid, else an SVG dash pattern */ dash: string;
}
/** The ties of this fight a kind with a `line` asks the map to draw (rules.json ties.kinds[].line), read from the combat
 * the screen holds: a player's VIEW, where fog has already kept its own side's ties only and turned an unseen far end
 * into UNSEEN (fog.ts). A tie whose far end is not on the view (unseen, gone) draws nothing: no hidden tile is shown. */
export function tieLines(cb: Combat | null | undefined): TieLine[] {
  const out: TieLine[] = [];
  for (const t of (cb?.ties || []) as any[]) {
    const line = tieKind(t.kind)?.line; if (!line?.ink) continue;
    const a = cb!.units.find((u) => u.id === t.from), b = cb!.units.find((u) => u.id === t.to);
    if (!a || !b || a.dead || b.dead || !a.pos || !b.pos) continue;
    const side: TieLine['side'] = a.side === b.side ? 'ally' : 'foe';
    out.push({ key: t.kind + ':' + t.from + ':' + t.to, kind: t.kind, from: a.id, to: b.id, fromPos: a.pos, toPos: b.pos, side, ink: line.ink, dash: side === 'foe' ? String(line.foe_dash || '') : '' });
  }
  return out;
}
