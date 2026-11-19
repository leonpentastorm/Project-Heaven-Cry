// Classes 3.0 step 10 (the screen): what the fight screen shows of the systems of Revision 4, read from the engine's own
// state and rules (no rule here: each line names the engine function it reads). The client renders these; it never works
// out a Bond, a cap or a reaction count itself (apps/web/src/game/boundary.test.ts).
//   bondView      the Bond strip (bonds-spec.md section 9): your Bonds, allies and enemies apart, the cap, the Attuner
//   reactionView  the reaction pips (reactions-spec.md section 9): reactions this round, spent, the Answers switched on
//   shieldsView   0.30.0: a unit's shields in the order a blow meets them, Guard apart, what stands in front of the HP
import './datatext'; // fills the texts' {=placeholders} before any data is read
import type { Combat, Unit } from './combat';
import type { Character } from './character';
import { focusHand } from './character';
import { tiesOf, tieCap, tieKind } from './kit';
import { condName, condOn } from './magic';
import { UNTIL } from './condtable';
import { maxReactions, reactionsUsed, cueLive } from './tactics';
import { TECHNIQUE } from './physical';
import { SKILL, SKILLS, RULES, CLASSES, CLASS, CLASS_MOVE_POOL } from './data';
import { charOfUnit, bindGame } from './effects/hooks';
import { shieldOrder, shieldTotal } from './effects/damage';
import { guardOf, guardMax } from './physical/core';
import { guardSoakOf } from './physical/guard';
import { ownerOf } from './owned';
import tendingJ from '../../../data/tending.json';

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
  /** What the Bonds give now (rules 1.56, Bonds 2.0 slice 1, item 6): the numbers of tending.json `bond` (the validator
   * holds each equal to the effect the engine runs), and the lines the card prints. */
  gives: BondGives;
}
/** The Bond card's numbers: shares are fractions (0.05 is 5%), `damage` the bonus on your blows now. */
export interface BondGives {
  perBond: number; bonds: number; damage: number; through: number; share: number; hit: number; echo: number;
  /** One line each, in words, as the card shows them. */
  lines: string[];
}
const BOND_NUMBERS: any = (tendingJ as any).bond || {};
const pctOf = (x: number) => Math.round(x * 1000) / 10;
/** The Bond card's numbers now: per_bond x the Bonds counted by the effect's own source (ties:bond, kit.ts tiesOf, either end). */
export function bondGives(cb: Combat, me: Unit): BondGives {
  const perBond = Number(BOND_NUMBERS.per_bond) || 0, bonds = tiesOf(cb, me, BOND).length, damage = perBond * bonds;
  const through = Number(BOND_NUMBERS.through) || 1, share = Number(BOND_NUMBERS.share) || 0, hit = Number(BOND_NUMBERS.hit) || 0, echo = Number(BOND_NUMBERS.echo) || 0;
  const lines = [
    '+' + pctOf(perBond) + '% damage a Bond · ' + bonds + (bonds === 1 ? ' Bond' : ' Bonds') + ' · +' + pctOf(damage) + '%',
    'Tending a Bonded ally ×' + through + ' (+' + pctOf(through - 1) + '%)',
    pctOf(share) + '% of the damage you take goes to your Bonded enemies',
    'Echo: ' + pctOf(echo) + '% of what you heal hits each Bonded enemy',
    '+' + hit + ' to hit a Bonded enemy',
  ];
  return { perBond, bonds, damage, through, share, hit, echo, lines };
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
    quiet: focus === 'pack' ? 'Attuner in pack: Bonds held, threads quiet' : focus === 'none' && door ? 'No Attuner: Bonds need one in hand' : null,
    gives: bondGives(cb, me) };
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
// an item Answer: the effect's own label (Retort, on Durability's door: rules 1.56 Guard 2.0), else its item's name
const itemAnswer = (id: string): string | undefined => { for (const x of Object.values(SKILL as any).flatMap((s: any) => Object.values(s.unlocks || {})) as any[]) { const e = (x?.effects || []).find((y: any) => y?.if?.answer_on === id); if (e) return e.label || x.name; } return undefined; };
const answerName = (id: string): string => (TECHNIQUE as any)[id]?.name || itemAnswer(id) || id.replace(/_/g, ' ');
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

// ---------- shieldsView: what stands in front of a unit's HP (0.30.0, the shield display) ----------
// Leon, 16 Nov 2026: one pale bar over the HP made every shield look like one sum, and nobody could read how much they
// had. This lists every shield a unit holds in the order a blow spends them (effects/damage.ts shieldOrder, the same
// helper applyDamage spends by), the Guard pool apart, and what a blow can meet before HP. Words from rules.json
// combat.shield_look; what a viewer may know follows the health rule (healthView): exact for a side's own and an
// Analyzed creature, a size word for any other.
/** One shield on a unit, in the order a blow meets it. */
export interface ShieldEntry {
  key: string; kind: 'layer' | 'base';
  /** its name: a layer's is the class move that gives it (classes.json, the effect with `layer`); the base's from data */
  name: string;
  /** the attribute it belongs to (a layer: its class's attribute; the base shield: its giver's door, rules 1.60 item
   *  4613), for its ink; null: no giver known (an old save, a gift from nobody) */
  attribute: string | null;
  /** who gave it (a layer keeps its giver; the base shield records the giver of the one standing), else null */
  by: string | null;
  /** `by` in words (shield_look.from), '' with no giver */
  from: string;
  /** what is left of it; null when the viewer may not know (then `size`) */
  amount: number | null;
  /** its size word (shield_look.size) when the amount is not known, else null */
  size: string | null;
  /** its share of the unit's max HP for drawing (exact when known, the size rung's `bar` when not) */
  bar: number;
  lasts: string;
  /** how a new gift of the same kind meets it: 'replaces' (the larger stands) or 'separate' (its own layer) */
  combines: 'replaces' | 'separate';
  how: string;
  /** 1 is met first (Guard, when it soaks before the shields, is met before 1: `guard.first`) */
  order: number;
}
/** The Guard pool (rules 1.13) as the shield display reads it: how it soaks is physical/guard.ts guardSoakOf. */
export interface ShieldGuard {
  name: string; plates: number; max: number;
  /** what one plate takes off a blow (0: its soak is switched off) */
  soak: number;
  /** the plates kept back for a reaction */
  keep: number;
  /** met before every shield (the Defender's Reactive Plate) rather than after them */
  first: boolean;
  /** the pool in a line ("Guard 3 plates, each soaks 10") and which blows it meets, in words */
  line: string; how: string;
  combines: 'separate pool';
}
export interface ShieldsView {
  known: boolean; maxHp: number;
  /** the block's header */
  head: string;
  entries: ShieldEntry[];
  /** the Guard pool; null with no pool or no plate */
  guard: ShieldGuard | null;
  /** what one blow that does not drop the unit can meet before HP; null: not known */
  blow: number | null;
  /** everything in front of the HP (more than `blow` only when kept plates go against a blow that would drop it); null: not known */
  all: number | null;
  /** `all` as a size word (shield_look.size), for a viewer who may not know the number */
  allWord: string;
  /** the headline: what an ordinary blow meets before HP ("Absorbs up to 88 before HP"), or its size word */
  absorb: string;
  /** what a blow that would drop it meets, when that is more ('' otherwise) */
  absorbDrop: string;
  /** the shields alone (no Guard), as one chip ("+80 SHIELD"); '' with none */
  chip: string;
  /** the shields alone; null: not known */
  total: number | null;
  /** the line an attack preview shows beside its damage: the damage is before these; '' with nothing in front of HP */
  vs: string;
  /** the shields and Guard in a few words (a label, the Narrator's view of the fight) */
  words: string;
  /** the one line on how the shields combine */
  rule: string;
}
const SL = (): any => (RULES as any).combat.shield_look;
/** A data text with its {slots} filled. */
const fill = (t: string, v: Record<string, string | number>): string => String(t || '').replace(/\{(\w+)\}/g, (all, k: string) => (v[k] != null ? String(v[k]) : all));
let LAYER_OF: Map<string, { name: string; attribute: string | null }> | null = null;
/** A layer's name and attribute: the class move whose effect gives it (classes.json), read once; a layer no class
 *  move gives reads as the base shield's name (never its id). */
function layerSource(layer: string): { name: string; attribute: string | null } {
  if (!LAYER_OF) {
    LAYER_OF = new Map();
    const has = (o: any): string | null => { if (!o || typeof o !== 'object') return null; if (typeof o.layer === 'string' && o.op) return o.layer; for (const v of Object.values(o)) { const r = has(v); if (r) return r; } return null; };
    const note = (m: any, attr: string | null) => { const l = has(m.effects); if (l && m.name && !LAYER_OF!.has(l)) LAYER_OF!.set(l, { name: m.name, attribute: attr }); };
    for (const c of CLASSES as any[]) for (const r of Object.values(c.ranks || {}) as any[]) for (const m of r.moves || []) note(m, c.attribute || null);
    for (const m of Object.values(CLASS_MOVE_POOL) as any[]) note(m, CLASS[m.origin]?.attribute || null);
  }
  return LAYER_OF.get(layer) || { name: SL().base.name, attribute: null };
}
/** The attribute of a giver's door (rules 1.60 item 4613: the base shield's segment takes its giver's door ink): its alpha
 *  skill with the most points (a tie: the first in the data's order); null with no giver or no door. */
function doorAttrOf(g: Unit | null): string | null {
  if (!g) return null;
  const c: any = g.companion ? null : charOfUnit(g); let best: string | null = null, n = 0;
  for (const s of SKILLS as any[]) { if (s.slot !== 'alpha') continue; const p = Number(c ? c.skills?.[s.id] : (g as any)[s.id]) || 0; if (p > n) { n = p; best = s.attribute; } }
  return best;
}
const sizeOf = (share: number): { word: string; bar: number } => { const S: any[] = SL().size; const r = S.find((x) => x.upto != null && share <= x.upto) || S[S.length - 1]; return { word: r.word, bar: r.bar }; };
/** The shields a unit holds, as `viewer` may know them (null: as the squad sees it, like healthView). `fmt` writes a
 *  number into the texts (the client passes its one formatter; default: plain digits). */
export function shieldsView(cb: Combat | null, u: Unit, viewer: Pick<Unit, 'side'> | null = null, fmt: (n: number) => string = (n) => String(Math.round(n)), g?: any): ShieldsView {
  if (g !== undefined) { const was = bindGame(g || null); try { return shieldsView(cb, u, viewer, fmt); } finally { bindGame(was); } } // `g`: the game the character is read through (Pain Threshold's feed); a screen passes it
  const L = SL(), known = (viewer ? viewer.side === u.side : u.side === 'pc') || !!u.analyzedBy, maxHp = Math.max(1, u.maxHp);
  const entries: ShieldEntry[] = shieldOrder(u).map((e, i) => {
    const src = e.layer ? layerSource(e.layer.layer) : { name: L.base.name, attribute: null }, row = e.layer ? L.layer : L.base, sz = sizeOf(e.n / maxHp);
    const giver = cb ? cb.units.find((x) => x.id === (e.layer ? e.layer.by : u.shieldBy)) || null : null; // rules 1.60 item 4613: the base shield's giver too
    return { key: e.layer ? 'layer:' + e.layer.layer + ':' + e.layer.by : 'base', kind: e.layer ? 'layer' : 'base', name: src.name, attribute: e.layer ? src.attribute : doorAttrOf(giver), by: giver ? giver.name : null,
      from: giver ? fill(L.from, { by: giver.name }) : '',
      amount: known ? e.n : null, size: known ? null : sz.word, bar: known ? e.n / maxHp : sz.bar, lasts: row.lasts, combines: row.combines, how: row.how, order: i + 1 };
  });
  // Guard: how it soaks is guardSoakOf (physical/guard.ts), the copy the damage path spends by
  const plates = u.resMax?.guard != null ? guardOf(u) : 0, plan = plates > 0 ? guardSoakOf(u) : null, G = L.guard;
  let guard: ShieldGuard | null = null;
  if (plates > 0) {
    const soak = plan ? plan.per : 0, keep = plan ? Math.min(plates, plan.keep) : 0;
    const how = !plan ? G.off : (plan.phase === 'before' ? G.before : G.after) + (keep > 0 ? '; ' + fill(plan.keepUnlessDrop ? G.keep_unless_drop : G.keep_always, { keep }) : '');
    guard = { name: G.name, plates, max: guardMax(u), soak, keep, first: !!plan && plan.phase === 'before',
      line: fill(plan ? G.line : G.line_off, { name: G.name, plates, plate_word: plates === 1 ? G.plate : G.plates, per: fmt(soak) }), how, combines: 'separate pool' };
  }
  // what a blow meets: the shields, and the plates it may spend (an ordinary blow leaves the kept ones; one that would
  // drop the unit takes them too when the plan says so)
  const sh = shieldTotal(u), platesWorth = (n: number) => (guard && plan ? Math.max(0, n) * guard.soak : 0);
  const blow = sh + platesWorth(guard ? guard.plates - guard.keep : 0);
  const all = sh + platesWorth(guard ? (plan && plan.keepUnlessDrop ? guard.plates : guard.plates - guard.keep) : 0);
  const allWord = sizeOf(all / maxHp).word, any = entries.length > 0 || !!guard;
  const absorb = !any ? '' : known ? fill(L.absorb, { n: fmt(blow) }) : fill(L.absorb_size, { word: allWord });
  const absorbDrop = any && known && all > blow ? fill(L.absorb_drop, { n: fmt(all) }) : '';
  const chip = !entries.length ? '' : known ? fill(L.chip, { n: fmt(sh) }) : fill(L.chip_size, { word: sizeOf(sh / maxHp).word });
  const what = entries.length ? (entries.length === 1 ? fill(L.vs_one, { name: entries[0].name }) : L.vs_shields) : L.vs_guard;
  const vs = !any ? '' : known ? fill(L.vs, { what, n: fmt(blow) }) : fill(L.vs_size, { what, word: allWord });
  const words = [...entries.map((e) => e.name + ' ' + (e.amount != null ? fmt(e.amount) : e.size)), ...(guard ? [guard.line] : [])].join('; ');
  return { known, maxHp: u.maxHp, head: L.head, entries, guard, blow: known ? blow : null, all: known ? all : null, allWord, absorb, absorbDrop, chip, total: known ? sh : null, vs, words, rule: L.rule };
}
