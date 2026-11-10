// Physical 2.0 (rules 1.12): the types the melee and ranged technique systems share. The contract is
// docs/design/handoffs/physical-2.0-PLAN.md, section 5; once this file exists, the code is the contract.
import type { Combat, Unit, AttackPreview } from '../combat';
import type { Character } from '../character';
import type { WeaponDef } from '../data';
import type { Rng } from '../rng';
import type { HookName } from '../effects/types';

export type TechSystem = 'melee' | 'ranged';
export type TechGroup = 'opener' | 'strike' | 'link' | 'finisher' | 'answer' | 'fire' | 'press' | 'set' | 'take' | 'watch';
/** One "with the right weapon" line. props: the properties it reads (match 'any' by default for several, 'all' when the
 * data says so). stack: applies as well as the chosen line. ap: added to the technique's cost when this line applies. */
export interface TechLine { props: string[]; match?: 'any' | 'all'; when?: string; text: string; note?: string; ap?: number; stack?: boolean }
export interface TechDef {
  id: string; name: string; system: TechSystem; group: TechGroup; number: number;
  /** mode: the attack the cost is priced as for items that change an attack's AP ('aimed', 'burst', 'auto'); a
   * weapon-based cost is priced as a melee strike or a shot without it. */
  ap: { base: 'weapon' | 'flat' | 'reaction'; add?: number; value?: number; mode?: 'melee' | 'shot' | 'aimed' | 'burst' | 'auto' };
  rounds: number | 'all';
  needs: { momentum?: number; pressed?: boolean; hidden?: boolean; held?: boolean; last_round?: boolean; stowed?: boolean };
  text: string; trigger?: string; suppressed?: string; lines: TechLine[];
  /** everyone knows it; no ready slot */ free: boolean;
  /** weapons with one of these properties always offer it */ comes_with: string[];
  /** its home properties; with `particular`, a weapon with none of them is off its home (−2 to hit, no property line) */
  home: string[]; particular: boolean;
  /** properties whose weapons can't use it at all */ not_with?: string[];
  /** what the player picks: enemy | tile | ally | self | none (a reaction) | enemy+tile */ aim: string;
  numbers: Record<string, number>;
}
/** What the player (or the enemy AI) chose. `line` is a property id when two lines match; `ammo` an arrow or special
 * round type; `opt` an optional outcome the text offers ('push', 'swap', 'leg'…); `item` a pack reference. */
export interface TechArgs {
  hand?: 'main' | 'off'; targetId?: string; targetIds?: string[]; tile?: string; allyId?: string; allyIds?: string[];
  line?: string; ammo?: string; opt?: string;
  /** a weapon that isn't in the hand: a pack entry (index or id) for a technique that draws, or a carried throwable's id */
  item?: string | number; mods?: string[];
}
export interface TechPreview {
  ok: boolean; why: string | null; id: string; ap: number; rounds: number;
  /** every attack roll in it, with the unit it is against */ attacks: { target: string; pv: AttackPreview }[];
  notes: string[];
  momentum?: { now: number; after: number };
  /** onHit: the ordinary +1 a ranged hit gives (only if the roll hits) */ pressure?: { unit: string; add: number; after: number; state: string; onHit?: boolean }[];
  /** tiles it covers */ area?: string[];
  /** where it puts someone (the user included) */ moves?: { unit: string; to: string }[];
  saves?: { unit: string; skills: string[]; tn: number }[];
  /** true when it ends the chain (a Finisher) */ ends?: boolean;
}
export interface StrikeOpts {
  target?: Unit; mode?: 'melee' | 'shot' | 'aimed';
  /** damage multiplier, shown under the technique's name */ mult?: number;
  /** flat to-hit, shown under the technique's name */ extra?: number;
  critMin?: number; /** a roll that hits is a critical */ critOnHit?: boolean; ignoreArmour?: number | true; ignoreCover?: boolean; reach?: number;
  label?: string; noMomentum?: boolean; noPressure?: boolean;
  /** a Hidden user stays Hidden after this attack (Dead to Rights, Silent) */ quiet?: boolean;
  /** no Recoil on this roll: a roll after the first of one volley (rules 1.12: a volley's own penalty replaces Recoil) */ noRecoil?: boolean;
  /** this roll doesn't wear the weapon: a roll after the first of one attack action ("an attack action wears 1") */ noWear?: boolean;
  /** the roll's place in its volley (0 the first), for the hooks that read ctx.vi, when the handler runs its own volley
   * (with `volley` the core numbers the rolls itself) */ vi?: number;
  /** the held weapon is thrown: a ranged attack at throwing range (line of sight, cover), aimed with Dexterity; the hit
   * gives Pressure as any ranged hit does, and Momentum when the technique is a melee one. The handler then takes the
   * weapon out of the hand (loseWeapon). */
  thrown?: boolean;
  /** this roll is one of a volley: no Recoil on it (the technique's own penalty per round stands in). Named 'burst' or
   * 'auto', the items written for the engine's burst and full auto see it as one (ctx.volley, ctx.vi) */
  volley?: boolean | 'burst' | 'auto';
  /** a later strike of one use (Sweep, Cleave, Flurry): its event carries the engine's chain flag, so it plays at the
   * chained beat. No volley is named: items see it as an attack of its own. */
  chain?: boolean;
  /** this strike is an ambush whatever the user's Hidden state (Draw Cut's Light line, Ambush): criticals on 19-20, the
   * user's Ambush multiplier, and everything that reads an ambush (the target's Ambush damage taken, Always Up…). Only
   * an ambush from a fresh Hidden entry uses that entry's ambush. */
  ambush?: boolean;
}
export interface StrikeResult { ok: boolean; why?: string; hit: boolean; crit: boolean; dmg: number; killed: boolean; pct: number; target: Unit | null;
  /** the attack was answered before it was made and never came (not a miss): return at once, with no riders */ cancelled?: boolean }
export type WatchTrigger = 'moves' | 'enters_tile' | 'attacks_ally' | 'acts';
export interface WatchSpec { trigger: WatchTrigger; tile?: string; tiles?: string[]; allyId?: string; allyIds?: string[]; targetId?: string }
export interface HeldWatch extends WatchSpec { id: string; hand: 'main' | 'off'; ap: number; r: number; /** the property line chosen when it was held */ line?: string; /** the arrow it names (a quiver) */ ammo?: string }

/** What a handler is given. */
export interface Tech {
  cb: Combat; u: Unit; c: Character | null; def: TechDef; w: WeaponDef; weaponId: string; hand: 'main' | 'off';
  args: TechArgs; tgt: Unit | null; rng: Rng;
  /** what the technique is used with: the weapon in a hand, one just drawn for it ('drawn'), or a carried throwable
   * (weaponId is then the throwable's id; spendRounds takes one from what is carried) */
  wield: 'main' | 'off' | 'drawn' | 'throwable';
  /** true: change nothing, roll nothing (the card and the AI ask this way) */ preview: boolean;
  /** the preview being built (handlers add through the helpers, or note()) */ pv: TechPreview;
  /** does the held weapon have this property, for a bonus line (false off its home when the technique is particular) */
  has(prop: string): boolean;
  /** the raw property, whatever the home rule says: for "not available" and limits */
  holds(prop: string): boolean;
  /** of these properties, the one whose line applies: args.line if given and held, else the first held */
  line(...props: string[]): string | null;
  /** def.numbers[key], else the fallback */ num(key: string, fallback?: number): number;
  /** a line for the preview card and, when it happens, the log */ note(text: string): void;
  /** per-technique state on the user, plain JSON, kept across the fight: u.tech[def.id] */ state(): Record<string, any>;
}
export interface TechHandler {
  id: string;
  /** a refusal in plain words, or null */ check?(t: Tech): string | null;
  /** do it; when t.preview is true, describe it and change nothing. Return a refusal or null. */
  run(t: Tech): string | null;
  /** Answers and Watches only: called on a hook for a unit that has the technique usable, with t.preview false */
  react?: Partial<Record<HookName, (ctx: any, t: Tech) => void>>;
  /** enemy AI: how much it wants this against t.tgt now (0: never; a plain attack scores 5). Pure: no dice, no state. */
  ai?(t: Tech): number | { score: number; args: TechArgs };
  /** extra fields for the technique's effects event (presentation only; never changes anything) */
  fx?(t: Tech): Record<string, any> | null;
}
export interface PadEntry {
  id: string; name: string; group: TechGroup; ap: number; rounds: number | 'all'; ok: boolean; why: string | null;
  text: string; aim: string;
  /** the property line that applies by default with this weapon */ line: string | null;
  /** present when two lines match: the player picks one (args.line) */ choices?: { prop: string; text: string }[];
  /** the weapon lends it (its signature, not learned yet) */ lent: boolean;
  /** a learned signature card */ signature: boolean;
  /** the weapon's one-row attack (Cut, Shot): never a chip */ plain: boolean;
  /** no handler yet */ built: boolean;
}
export interface PadGroup { group: TechGroup; label: string; entries: PadEntry[] }
