// The effect runtime's types (docs: the perk and trait plan, sections 2.1-2.7). One runtime runs perks (with tiers),
// Mastered, Achieved and Ultimate perks, traits and class moves (base ranks I-III and advanced classes): every effect is
// handled by a generic core-op handler, by a handler a lane registers for its item, or goes to the Narrator with the
// item's text. Nothing is ever silently ignored.
import type { Character } from '../character';
import type { Combat, Unit } from '../combat';

/** Where an item comes from. Class moves are keyed "class:<classId>.<moveId>". */
/** 'relic': an item a holder carries that is neither a perk nor a trait (engine foundations 3: a roguelike's relics),
 * loaded with addItems('relic', [...]); written in data only. */
export type ItemKind = 'perk' | 'trait' | 'class' | 'skill' | 'relic' | 'condition' | 'verb';
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
  /** Which damage this item's 'damage_out' speaks about besides weapon attacks and spells (data `damage_kinds`:
   * 'blast' = a blast, a splash, a trap and a thrown item someone made; or one of 'explosion', 'trap', 'thrown'). */
  damageKinds?: string[];
}

/** One effect a holder has right now. */
export interface ActiveEffect { key: string; kind: ItemKind; itemId: string; tier: Tier; op: string; e: any; index: number }

/** Who holds an item: the character (story side; the live object in g.characters when a game is bound), its unit in a
 * fight (combat side), the item, and the game and fight when known. */
export interface Holder {
  key: string; itemId: string; kind: ItemKind; tier: Tier; info: ItemInfo;
  c?: Character | null; u?: Unit | null; cb?: Combat | null; g?: any;
  /** A condition held as an item (Classes 3.0 P4): the unit that gave it (its `{source}`), or null. */ source?: Unit | null;
}

export type HookName =
  // combat
  | 'combat_start' | 'round_start' | 'turn_start_pre' | 'turn_start' | 'turn_end'
  | 'move_cost' | 'move_step' | 'moved' | 'forced_move'
  | 'attack_preview' | 'attack_target' | 'attack_roll' | 'to_hit' | 'damage_out' | 'on_hit' | 'on_miss'
  | 'damage_in' | 'on_damaged' | 'on_downed' | 'on_kill'
  | 'cond_apply' | 'save' | 'cond_landed' | 'cond_end' | 'displaced'
  | 'heal_given' | 'heal_in' | 'shield_grant'
  | 'reaction_window' | 'reaction' | 'enemy_action_start' | 'sight_change' | 'sees' | 'object_destroyed' | 'tie_end'
  | 'reload' | 'jam_clear' | 'swap'
  // Physical 2.0 (rules 1.12): after a prone unit stands up {u} (Dead to Rights)
  | 'stood_up'
  | 'glyph_cost' | 'evoke_cost' | 'outburst_cost' | 'outburst_begin' | 'outburst_release' | 'outburst_after' | 'outburst_plan'
  | 'acted' | 'combat_end'
  // rules 1.44: the fight is decided, before the fighters are written back (game.ts fightBack)
  | 'combat_over'
  // hooks gap (rules 1.3): after an Evoke, a held release's price, holding Strain, Strain added, death saves, injuries,
  // a unit built from its character, every reducer action done, before a stim, an ammo spend, weapon actions listed
  | 'evoked' | 'release_cost' | 'outburst_hold' | 'outburst_pump' | 'strain_change' | 'held_turn_start' | 'strain' | 'death_save' | 'injury' | 'unit_built' | 'action_done'
  | 'stim_start' | 'volley_end' | 'weapon_actions'
  // rules 1.3 shared subsystems (lane 0B)
  | 'path_opts' | 'hide' | 'spot' | 'spotted' | 'on_surrender' | 'parley' | 'throw' | 'blessing_in' | 'trap_sprung' | 'blast_landed'
  // Sigil rules 1.4 (sigil.ts)
  | 'glyphs_per_tile' | 'evoke_area' | 'spell_mult' | 'glyph_drawn' | 'spell_fizzle' | 'sigil_placed' | 'sigil_trap_sprung' | 'turret_shot' | 'spell_shape' | 'ground_cap'
  // story
  | 'check_build' | 'check_mod' | 'check_post' | 'check_result' | 'passive'
  | 'voice_cap' | 'ask_limit' | 'overreach_cost' | 'echo_gain'
  | 'scene_change' | 'session_start' | 'rest' | 'xp_grant'
  | 'notice' | 'stay_hidden' | 'world_move_cost' | 'karma_award'
  | 'action_refuse' | 'evoke_reach' | 'spell_roll' | 'session_heal' | 'story_blessing' | 'ap_gift' | 'npc_moved' | 'npc_sense' | 'zone_enter' | 'story_harm'
  | 'stay_hidden_result' | 'ruling_answered' | 'braced' | 'protect_act' | 'plate_spent' | 'round_ap' | 'world_round_start' | 'story_cond_apply' | 'gift'
  // Class Roster Rev 3 (classes/rev3.ts): a Vent's extra Flux into the air; an enemy's walk priced by items
  | 'vent' | 'ai_move_risk'
  // rules 1.8 (feelings.ts): a condition's save passed {by, t, id}
  | 'cond_resisted'
  // Calls (rules 1.13, calls/core.ts): a Call about to be made {u, t, id, kind, step, react, tnAdd, cancel}; its AP {u, id, ap, react}
  | 'call' | 'call_cost'
  // engine foundations 2 (effects/cost.ts): EVERY priced action {u, c, cb, action, base, ap, res, min, free, labels}
  | 'cost';

/** What each hook is for, one line each: the hook bus's own table (docs/ENGINE-HOOKS.md is generated from it by
 * tools/engine_catalog.py; the payload's fields are read from the emit sites). A new hook adds its line here, or the
 * type check fails. */
export const HOOK_ABOUT: Record<HookName, string> = {
  combat_start: 'the fight begins: items set up their state, initiative order is known',
  round_start: 'a new round begins (after the last unit of the round acted)',
  turn_start_pre: 'a unit\'s turn is about to begin: its AP are being counted (grants and penalties)',
  turn_start: 'a unit\'s turn has begun',
  turn_end: 'a unit\'s turn ends, before the turn passes',
  move_cost: 'a walk is priced before it is paid (free steps, a cheaper or dearer move, no opportunity strikes)',
  move_step: 'a walking unit enters a tile (a step may be stopped; held shots and traps read it)',
  moved: 'a unit finished a move of its own',
  forced_move: 'a unit is about to be pushed, pulled, thrown or teleported (cancel, fewer tiles)',
  attack_preview: 'an attack is being sized up: its to-hit terms, its AP, a refusal; also every preview',
  attack_target: 'a resolved attack picks its target: items may redirect it or answer it first (cancel)',
  attack_roll: 'an attack\'s d20 is rolled: items may change the die or the result',
  damage_out: 'an amount of damage is being made (before armour): multipliers and target bonuses',
  on_hit: 'an attack hit',
  on_miss: 'an attack missed',
  damage_in: 'damage is landing on a unit, in phases (reduce, shield, would_drop_to_0, after)',
  on_damaged: 'a unit lost HP',
  on_downed: 'a unit went down (Downed or dead)',
  on_kill: 'a unit was dropped by an enemy (the killer gets the credit)',
  cond_apply: 'a condition is about to be put on a unit: its save, its rounds, a refusal',
  save: 'a save is rolled: items may add to it, change its TN, or pass or fail it outright',
  cond_landed: 'a condition landed on a unit',
  cond_end: 'a condition ended on a unit',
  displaced: 'a unit was moved by someone else, after it landed (where it ended, what stopped it)',
  heal_given: 'a heal landed (who healed whom, how much)',
  heal_in: 'a unit is about to be healed (the amount may change)',
  shield_grant: 'a shield is about to be given (the amount may change)',
  reaction_window: 'a unit may react (an opportunity strike, an Overwatch, an answer, a Call): items may cancel it',
  reaction: 'a reaction is being made (tactics.ts react(), rules 1.28): {u, kind (attack, move, protect), event, payer}; it fires before the reaction resolves',
  enemy_action_start: 'an enemy is about to act (an item may open a window or make it skip)',
  sight_change: 'after a move, the units each side stopped or started seeing (only computed while someone listens)',
  sees: 'a side\'s sight of a unit is decided: items may make it seen or unseen',
  object_destroyed: 'an object on the grid was destroyed',
  reload: 'a reload is made (its AP, the hand, tactical or speed)',
  jam_clear: 'a jam is being cleared (its AP, whether the heat is kept)',
  swap: 'a weapon swap is priced (declared; the item ops trigger `swap` listens here)',
  stood_up: 'a prone unit stood up',
  glyph_cost: 'a Sigil glyph is priced: its AP, charge and Flux; also every preview',
  evoke_cost: 'an Evoke is priced: its AP and charge; also every preview',
  outburst_cost: 'an Outburst Begin is priced: its MP, AP, range and Strain',
  outburst_begin: 'an Outburst was begun (held at stage 0)',
  outburst_release: 'an Outburst is being released: its multiplier may change',
  outburst_after: 'an Outburst was released and resolved (its area, targets and hits)',
  outburst_plan: 'an Outburst\'s release is previewed (its stage, aim, area and targets)',
  acted: 'a unit\'s own action (or a verb inside it, as Analyze) succeeded: {u, t, action, tile, toggles, mode}; the item ops trigger `acted` listens here (Classes 3.0 P2)',
  combat_end: 'the fight ends, after the fighters are written back to their characters',
  combat_over: 'the fight is decided (won or lost), before the fighters are written back to their characters: {cb, won, g} (rules 1.44)',
  evoked: 'a Sigil spell was Evoked (or fizzled), after it resolved',
  release_cost: 'an Outburst Release is priced: its AP and range',
  outburst_hold: 'a held Outburst swells at turn start: the Strain it adds may change',
  outburst_pump: 'an Outburst is Pumped (priced in preview, then done): its AP, free stages, the feeling',
  strain_change: 'a unit\'s Strain changed (from, to, why)',
  held_turn_start: 'a unit holding an Outburst starts its turn',
  strain: 'Strain is about to be added to a unit (the amount may change)',
  death_save: 'a Downed unit rolls its death save: items may add to it',
  injury: 'an injury is about to be rolled on a unit (cancel, no daze, no halving)',
  unit_built: 'a unit was built from its character (the area map rebuilds units every action)',
  action_done: 'a reducer action finished (any action, any unit)',
  stim_start: 'a stim is about to be given (cancel with a reason)',
  volley_end: 'a weapon action\'s shots are all resolved (a burst, an auto volley, a paired attack, a skill shot)',
  weapon_actions: 'a unit\'s weapon actions are listed (declared; nothing emits it yet)',
  path_opts: 'a walk\'s path options are opened by items (run, pass, jump, ignore difficult ground, known traps)',
  hide: 'a unit became hidden',
  spot: 'a unit tries to spot a hidden one: the die, the modifier, the TN, cancel',
  spotted: 'a hidden unit was revealed',
  on_surrender: 'a unit surrendered or was subdued',
  parley: 'a parley in a fight is attempted (its TN, a refusal, the result)',
  throw: 'a thrown item is about to land (its AP, radius, cancel, caught)',
  blessing_in: 'a blessing reaches a unit: an item may handle it itself',
  trap_sprung: 'a trap was sprung on a unit',
  blast_landed: 'a blast landed on a tile (who made it, the radius, who was in it)',
  glyphs_per_tile: 'how many glyphs a tile may hold for this caster',
  evoke_area: 'a spell\'s area is being built (its depth may change)',
  spell_mult: 'a Sigil spell\'s damage, healing or shield multiplier for one target',
  glyph_drawn: 'a Sigil glyph was drawn',
  spell_fizzle: 'a Sigil spell fizzled',
  sigil_placed: 'a Sigil field, trap or turret was placed on the grid',
  sigil_trap_sprung: 'a Sigil trap was sprung by a unit',
  turret_shot: 'a Sigil turret fired at a unit',
  spell_shape: 'a spell is compiled from its words (items may change its shape)',
  ground_cap: 'how many Sigil words a caster may keep on the ground at once',
  check_build: 'a story check is being built (items add tags or flags)',
  check_mod: 'a story check\'s modifiers and TN are gathered',
  check_post: 'a story check\'s d20 was rolled: items may change the result or forbid the fumble',
  check_result: 'a story check is decided',
  passive: 'a passive score is read (declared; asked as stat passive:<skill>, not emitted)',
  voice_cap: 'how many voice lines a player gets this beat',
  ask_limit: 'how many times a skill may be Asked this scene',
  overreach_cost: 'the Echo price of resisting an Overreach',
  echo_gain: 'a character gained Echo',
  scene_change: 'the Narrator opened a new scene',
  session_start: 'a session started (or a late player joined one)',
  rest: 'a rest is taken: HP and MP multipliers per character',
  xp_grant: 'XP is about to be granted (the amount may change)',
  notice: 'an NPC on the area map may notice a character (its range)',
  stay_hidden: 'a character tries to stay hidden from an NPC: modifier and TN',
  world_move_cost: 'a move on the area map is priced (sneaking costs extra)',
  karma_award: 'Karma is about to be awarded (its multiplier)',
  action_refuse: 'an item may refuse an action before it is done (a shove, an Overwatch)',
  evoke_reach: 'how far from its Line a caster may Evoke',
  spell_roll: 'a spell\'s to-hit d20 was rolled: items may add to it',
  tie_end: 'a tie between two units ended (kit.ts untie, Classes 3.0 P8) {cb, tie, unmake}: unmake when its kind says the far end is unmade (owned.ts)',
  to_hit: 'THE hook of every roll to hit a target (rolls.ts toHitTerms): a weapon attack, a Sigil, an Outburst {att, tgt, type, mode, terms, preview}: a listener adds to-hit terms',
  session_heal: 'the heal at a session\'s start: HP and MP multipliers',
  story_blessing: 'a prayer is answered outside a fight (lines to add)',
  ap_gift: 'a unit is about to receive AP from another (the receiver may refuse)',
  npc_moved: 'an NPC moved on the area map',
  npc_sense: 'an NPC senses something on the area map (it may reveal someone)',
  zone_enter: 'the party entered a new zone of the area map',
  story_harm: 'a character takes damage outside a fight (the amount may change)',
  stay_hidden_result: 'staying hidden was rolled: items may change the result',
  ruling_answered: 'the Narrator answered a pending ruling (accepted or refused)',
  braced: 'a Defender\'s Brace landed',
  protect_act: 'a unit protected another (a Brace or an Interpose: the patrons\' protect tag)',
  plate_spent: 'Guard was spent on a plate (Adamantile Plate\'s ally shield)',
  round_ap: 'a character\'s AP for a round on the area map is counted',
  world_round_start: 'a new round begins on the area map',
  story_cond_apply: 'a condition is about to be put on a character outside a fight (cancel with a reason)',
  gift: 'a gift was given (the patrons\' supply tag)',
  vent: 'a Vent is made: the Flux it puts into the air may change',
  ai_move_risk: 'an enemy\'s walk is scored for risk by items (the AI avoids it)',
  cond_resisted: 'a condition\'s save was passed',
  call: 'a Call is about to be made (its step, TN, a refusal)',
  call_cost: 'a Call is priced (its AP)',
  cost: 'every priced action: its AP, its resources, its floor, free (effects/cost.ts price)',
};

/** A hook handler. ctx is the hook's payload (fields documented at each emit site and in effects/hooks.ts); mutable
 * fields may be changed. Return nothing. */
export type HookFn = (ctx: any, h: Holder) => void;

/** A stat query's answer: a number to add, or { add, mult }. */
export type { StatId, CostSite } from './stats';
import type { StatId } from './stats';
export type StatAnswer = number | { add?: number; mult?: number } | void | null | undefined;

/** A modifier to a d20 check (story or combat), with the label shown in the check's head. */
export interface CheckMod { add: number; label: string }

/** When a limit is fresh again (the table: effects/uses.ts SCOPES). 'cooldown' is taken with uses(h).cool(turns), not take(). */
export type UseScope = 'at_will' | 'per_turn' | 'per_round' | 'per_combat' | 'per_scene' | 'per_session' | 'per_rest' | 'per_campaign' | 'reaction' | 'out_of_combat' | 'cooldown';
export type ActionScope = 'combat' | 'world' | 'story';
export type ActionTarget = 'none' | 'self' | 'ally' | 'enemy' | 'unit' | 'tile' | 'object' | 'npc' | 'check' | 'text';

/** What a player sends with a perk action: a target unit, a tile, a choice, a line of text, an NPC, a check. */
export interface ActionArgs { targetId?: string; targetIds?: string[]; tile?: string; choice?: string; text?: string; npc?: string; checkId?: string; arm?: boolean }

/** What a perk action would do. tiles: what it covers (a Burst, a zone); area: where it may be aimed (a Sigil's area);
 * targets: the units it would affect; sigil: it is Sigil magic (the grid paints it Mind cyan, item 489 c). */
export interface ActionPreview { ok: boolean; why?: string; ap: number; lines: string[]; tiles?: string[]; targets?: string[]; area?: string[]; sigil?: boolean }

/** An action an item grants (combat Perks or Class tab, the area map, the story panel). */
export interface ActionDef {
  id: string; label: string; scope: ActionScope[];
  /** Its AP before items. 'data': the item's own number in data/*.json (the action's `ap` in its grant_action, else the
   * item's ap_cost): write that, not a literal that repeats the data. A function: a cost that depends on the holder. */
  ap: number | 'data' | ((h: Holder, args: ActionArgs) => number);
  /** What it costs besides AP, by resource id (data/actions.json `resources`: charge, mp, cores, momentum, guard,
   * supplies, toxins, parts, stims, echo). The runtime checks it ("Needs 2 charge.") and pays it: run() never subtracts. */
  res?: Record<string, number> | ((h: Holder, args: ActionArgs) => Record<string, number> | null | undefined);
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
  pick?: string[] | 'words' | 'squad' | 'designs' | 'gamma' | 'felt' | 'forms'; // felt, forms: registered lists (effects/actions.ts registerPickList: Inspire's felt feelings, rules 1.33; Picture's forms, rules 1.34)
  pickMulti?: number;
  /** The prompt for the pick or typed detail ("Head, arm or leg", "The squadmate"). */
  pickLabel?: string;
  /** Rules 1.33: the cost site the action is priced at (a data grant_action's `site`; default '<item key>#<action id>'). */
  site?: string;
  /** A data grant that is a prayer ('whisper' | 'hymn'; rules 1.31): its row goes on the Faith tab, in its prayers' group. */
  prayer?: string;
  /** Who it may go at, worked out by the engine (Classes 3.0 P6: a door verb's `reach`): the descriptor's pick list. */
  choices?(h: Holder): string[];
  /** Why it can't go at this unit (a door verb's `reach`: side, range, sight, its `if`), or null. */
  reach?(h: Holder, t: Unit): string | null;
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
  stat?(h: Holder, stat: StatId, ctx: any): StatAnswer;
  on?: Partial<Record<HookName, HookFn>>;
  checkMod?(h: Holder, ck: any, ctx: any): CheckMod[] | void;
  actions?: ActionDef[];
  /** The data's grant_action is run another way (an automatic shot, a toggle): no default action button for it. */
  noDefaultActions?: boolean;
  /** Rules 1.33: keep the data's default actions beside this lane's (their ids differ): a lane that adds only a story half (Triage out of a fight). */
  dataActions?: boolean;
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
