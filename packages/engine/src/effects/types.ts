// The effect runtime's types (docs: the perk and trait plan, sections 2.1-2.7). One runtime runs perks (with tiers),
// Mastered, Achieved and Ultimate perks, traits and class moves (base ranks I-III and advanced classes): every effect is
// handled by a generic core-op handler, by a handler a lane registers for its item, or goes to the Narrator with the
// item's text. Nothing is ever silently ignored.
import type { Character } from '../character';
import type { Combat, Unit } from '../combat';

/** Where an item comes from. Class moves are keyed "class:<classId>.<moveId>". */
export type ItemKind = 'perk' | 'trait' | 'class' | 'skill';
/** The tier an item is held at: a perk's I or II, a granted perk's kind, 'trait', or a class move's rank ('adv' for an advanced class). */
export type Tier = 'I' | 'II' | 'mastered' | 'achieved' | 'ultimate' | 'trait' | 'III' | 'adv';

/** One item as the runtime sees it: its data, the effects that apply at the held tier, and whether it is an action. */
export interface ItemInfo {
  key: string; kind: ItemKind; id: string; name: string; tier: Tier;
  /** The effects at this tier (Tier II alone when it replaces Tier I, else I then II). */
  effects: any[];
  /** Tier of each effect in `effects` (perks with tiers), for the coverage report. */
  effTier: string[];
  /** Full rules text (both tiers for a perk), for the Narrator fallback and the wiki. */
  text: string;
  adjudication: 'engine' | 'hybrid' | 'narrator' | string;
  /** The item is used as an action (a grant_action effect, an AP cost, an active_skill perk type). Its other effects are
   * the action's own effects: they run when the action runs, never as standing passives. */
  active: boolean;
  /** The item's other effects belong to its action (a perk's or class move's active skill), so they never run as
   * standing passives. A trait's grant_action is one effect among standing ones, so traits are never bound. */
  bound: boolean;
  /** Data AP cost and use limit (null: none given). */
  ap: number | string | null; uses: string;
  /** Class moves: the class, and the rank that unlocks the move. */
  classId?: string; rank?: string;
  provisional?: boolean;
}

/** One effect a holder has right now. */
export interface ActiveEffect { key: string; kind: ItemKind; itemId: string; tier: Tier; op: string; e: any; index: number }

/** Who holds an item: the character (story side; the live object in g.characters when a game is bound), its unit in a
 * fight (combat side), the item, and the game and fight when known. */
export interface Holder {
  key: string; itemId: string; kind: ItemKind; tier: Tier; info: ItemInfo;
  c?: Character | null; u?: Unit | null; cb?: Combat | null; g?: any;
}

export type HookName =
  // combat
  | 'combat_start' | 'round_start' | 'turn_start_pre' | 'turn_start' | 'turn_end'
  | 'move_cost' | 'move_step' | 'moved' | 'forced_move'
  | 'attack_preview' | 'attack_target' | 'attack_roll' | 'damage_out' | 'on_hit' | 'on_miss'
  | 'damage_in' | 'on_damaged' | 'on_downed' | 'on_kill'
  | 'cond_apply' | 'cond_landed' | 'cond_end'
  | 'heal_given' | 'heal_in' | 'shield_grant'
  | 'reaction_window' | 'enemy_action_start' | 'sight_change' | 'sees' | 'object_destroyed'
  | 'reload' | 'jam_clear' | 'swap'
  | 'glyph_cost' | 'evoke_cost' | 'outburst_cost' | 'outburst_begin' | 'outburst_release'
  | 'analyze' | 'action_cost' | 'combat_end'
  // hooks gap (rules 1.3): after an Evoke, a held release's price, holding Strain, Strain added, death saves, injuries,
  // a unit built from its character, every reducer action done, before a stim, an ammo spend, weapon actions listed
  | 'evoked' | 'release_cost' | 'outburst_hold' | 'strain' | 'death_save' | 'injury' | 'unit_built' | 'action_done'
  | 'stim_start' | 'volley_end' | 'weapon_actions'
  // rules 1.3 shared subsystems (lane 0B)
  | 'path_opts' | 'hide' | 'spot' | 'spotted' | 'on_surrender' | 'parley' | 'throw' | 'blessing_in' | 'trap_sprung'
  // Sigil rules 1.4 (sigil.ts)
  | 'glyphs_per_tile' | 'evoke_area' | 'spell_mult' | 'glyph_drawn' | 'spell_fizzle' | 'sigil_placed' | 'sigil_trap_sprung' | 'turret_shot' | 'spell_shape' | 'ground_cap'
  // story
  | 'check_build' | 'check_mod' | 'check_post' | 'check_result' | 'passive'
  | 'voice_cap' | 'ask_limit' | 'overreach_cost' | 'echo_gain'
  | 'scene_change' | 'session_start' | 'rest' | 'xp_grant'
  | 'notice' | 'stay_hidden' | 'world_move_cost' | 'karma_award'
  | 'action_refuse' | 'evoke_reach' | 'spell_roll' | 'session_heal' | 'story_blessing' | 'ap_gift' | 'npc_moved' | 'npc_sense' | 'zone_enter' | 'story_harm'
  | 'stay_hidden_result' | 'ruling_answered' | 'braced' | 'plate_spent' | 'round_ap' | 'world_round_start' | 'story_cond_apply' | 'gift';

/** A hook handler. ctx is the hook's payload (fields documented at each emit site and in effects/hooks.ts); mutable
 * fields may be changed. Return nothing. */
export type HookFn = (ctx: any, h: Holder) => void;

/** A stat query's answer: a number to add, or { add, mult }. */
export type StatAnswer = number | { add?: number; mult?: number } | void | null | undefined;

/** A modifier to a d20 check (story or combat), with the label shown in the check's head. */
export interface CheckMod { add: number; label: string }

export type UseScope = 'at_will' | 'per_turn' | 'per_round' | 'per_combat' | 'per_scene' | 'per_session' | 'per_rest' | 'per_campaign' | 'reaction' | 'out_of_combat';
export type ActionScope = 'combat' | 'world' | 'story';
export type ActionTarget = 'none' | 'self' | 'ally' | 'enemy' | 'unit' | 'tile' | 'object' | 'npc' | 'check' | 'text';

/** What a player sends with a perk action: a target unit, a tile, a choice, a line of text, an NPC, a check. */
export interface ActionArgs { targetId?: string; targetIds?: string[]; tile?: string; choice?: string; text?: string; npc?: string; checkId?: string; arm?: boolean }

export interface ActionPreview { ok: boolean; why?: string; ap: number; lines: string[]; tiles?: string[]; targets?: string[] }

/** An action an item grants (combat Perks or Class tab, the area map, the story panel). */
export interface ActionDef {
  id: string; label: string; scope: ActionScope[];
  ap: number | ((h: Holder, args: ActionArgs) => number);
  uses?: { per: UseScope; n: number };
  target: ActionTarget;
  range?: number; needsSight?: boolean;
  /** Short help text for the card (defaults to the item's text). */
  text?: string;
  /** false hides the action; a string greys it out with that reason; true (or undefined) shows it. */
  available?(h: Holder): boolean | string;
  preview?(h: Holder, args: ActionArgs): Partial<ActionPreview> | void;
  /** Do it (AP and the use are already checked and spent by the runtime). Return an error to refuse before anything is
   * spent: run is called on a scratch copy first only when `dry` is set, so prefer checking in preview. */
  run(h: Holder, args: ActionArgs, rng: { state: number }): string | null | void;
  /** An armed preset: the action stores u.armed[key] = choice and the engine resolves it off-turn at a hook. */
  arm?: boolean;
  /** What args.choice takes, so the client can offer it (UI chips): a fixed list, or the holder's Sigil words, squadmates,
   * Outburst designs or γ skills. pickMulti: how many it may take at once (words: space-separated). */
  pick?: string[] | 'words' | 'squad' | 'designs' | 'gamma';
  pickMulti?: number;
  /** The prompt for the pick or typed detail ("Head, arm or leg", "The squadmate"). */
  pickLabel?: string;
}

/** A flag on an existing action (Ricochet, Double or Nothing, Nonlethal…): the player turns it on with `mods`. */
export interface ToggleDef {
  id: string; label: string;
  on: string[]; // action types: 'combat/attack', 'combat/move', 'combat/outburst', 'combat/evoke', 'check/roll', 'story/speak'
  available?(h: Holder, actx: any): boolean | string;
  preview?(h: Holder, actx: any): string | null;
  /** Default state when the player sends no mods for this action (e.g. Pacifist's Nonlethal is on by default). */
  defaultOn?: boolean;
}

/** A lane's registration for one item. */
export interface ItemHandler {
  /** The item id: a perk or trait id, or "<classId>.<moveId>" for a class move. */
  id: string;
  kind?: ItemKind;
  /** Effects this handler runs, so the generic core-op handlers skip them: 'all', indices into the held tier's
   * effects, op names, or a predicate. */
  claims?: 'all' | number[] | string[] | ((e: any, index: number, tier: string) => boolean);
  /** Effects the Narrator rules (counted as narrator-ruled in the coverage report, and named in fight notes). */
  narrator?: 'all' | number[] | string[] | ((e: any, index: number, tier: string) => boolean);
  /** Lower runs first among handlers on the same hook (default 100). Use it for orders the rules fix (drop-to-0). */
  priority?: number;
  stat?(h: Holder, stat: string, ctx: any): StatAnswer;
  on?: Partial<Record<HookName, HookFn>>;
  checkMod?(h: Holder, ck: any, ctx: any): CheckMod[] | void;
  actions?: ActionDef[];
  /** The data's grant_action is run another way (an automatic shot, a toggle): no default action button for it. */
  noDefaultActions?: boolean;
  toggles?: ToggleDef[];
  /** The Narrator-ruled remainder in about 15 words, or null when the engine runs all of it. */
  brief?(h: Holder): string | null;
}

/** Story pending rulings: what the Narrator owes or must judge (only sent when non-empty). */
export interface PendingRuling { id: string; charId: string; key: string; text: string; entryId?: string; scene?: number;
  /** The check whose roll raised it (check_result): an Echo reroll withdraws it and the new roll decides again. */
  fromCheck?: string;
  /** The use this ruling spent, refunded if the Narrator refuses it. */
  use?: { per: string; key: string } }
