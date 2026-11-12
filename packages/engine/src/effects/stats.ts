// THE STAT IDS (engine foundations 1, review finding F14). `statQuery(x, id, ctx)` is how the engine asks every item
// for a number, and `stat: (h, id, ctx) => …` on a handler is how an item answers. Both sides used to be bare strings,
// so an item could answer a question nobody asks (Field Medic answered 'ap_cost:triage' for a year of game time and
// Triage never got cheaper). Now:
//
//   1. Every id is DECLARED here, once: in STATS (a plain id) or STAT_FAMILIES (a prefix with a suffix, 'skill:guts').
//   2. `StatId` is the union of them. statQuery, onStat and ItemHandler.stat take a StatId, so comparing against an
//      undeclared id (`stat === 'ap_cost:heal'`) is a TYPE ERROR.
//   3. test/lint-foundations.test.ts reads the source and fails when an id is answered that nothing asks, asked but
//      not declared, or when COST_SITES is not exactly the set of sites actionAp() is called with.
//
// TO ADD A STAT: add its line to STATS (what it is, who asks), ask it with statQuery(x, '<id>') where the engine needs
// the number, answer it in the item's `stat:`. TO ADD AN ACTION WHOSE AP ITEMS MAY CHANGE: add its id to COST_SITE_IDS
// and price it with actionAp(x, '<id>', base). An item answers 'ap_cost:<id>'; a data effect
// {"op":"action_cost","action":"<id>","value":-1,"min":1} works with no code.

/** Every action whose AP the engine prices through actionAp() (effects/core.ts): the ids a data `action_cost` effect
 * may name, and the suffixes of 'ap_cost:<site>'. Kept equal to the real call sites by the lint test. */
export const COST_SITE_IDS = [
  'analyze', 'break', 'clear_jam', 'crystallise', 'disengage', 'escape', 'extinguish', 'field_repair', 'hide', 'parley', 'pray', 'recover',
  'reload', 'reload_both', 'set_explosive', 'shove', 'sprint', 'stabilise', 'stim', 'swap_core', 'throw', 'triage', 'vent', 'ward', 'whisper',
] as const;
export type CostSite = (typeof COST_SITE_IDS)[number];
/** What a data `action_cost` effect may name. 'heal' is the one alias: it means both 'stim' and 'stabilise' (healing an
 * ally by hand), and is not a site of its own. */
export const COST_SITES: ReadonlySet<string> = new Set<string>([...COST_SITE_IDS, 'heal']);

/** What `immune(x, what)` is asked about besides condition ids. */
export const IMMUNE_IDS = ['bleed', 'knockback', 'opportunity_attack', 'shove'] as const;

/** The plain stat ids: what the number is, and who asks for it. */
export const STATS = {
  // ---- derived stats (character.ts `fx`: (base + adds) × mults)
  hp: 'Max HP (character.ts maxHp)', hp_per_level: 'HP gained a level (hpPerLevel)', mp_max: 'Max MP', move: 'Movement, tiles per AP', defense: 'Defense',
  init: 'Initiative bonus', carry: 'Carry weight', injury_resist: 'Injury resistance, %', crit_damage: 'Critical damage multiplier', crit_taken: 'Critical damage taken',
  counter: 'Counter chance', ambush_mult: 'Ambush damage multiplier', ambush_taken: 'Ambush damage taken', elemental_taken: 'Elemental damage taken',
  heal_received: 'Healing received multiplier', shield_received: 'Shields received multiplier', mult_heal_given: 'Healing given multiplier', mult_physical: 'Physical damage multiplier',
  blessing_power: 'Blessing power (faith.ts)', max_sigil_words: 'Sigil words known at once', glyph_ap: 'AP a glyph costs to draw', module_slots: 'Outburst module slots',
  ready_designs: 'Outburst designs readied', free_pumps: 'Free Pumps a fight', soul_range: 'Outburst reach', strain_limit: 'Strain limit', throw_range: 'Throw range',
  // ---- asked in a fight (combat.ts, tactics.ts, magic.ts, physical/, faith.ts)
  armor: 'Armour value (combat.ts unit build)', attack: 'Attack bonus (combat.ts unit build)', vision: 'Vision in tiles', death_save: 'A Downed unit\'s death save',
  heat_limit: 'A gun\'s Heat limit', never_jams: 'The main-hand gun never jams (>0)', hide_weapon_skill: 'Hide a weapon\'s own skill from the pad (>0)',
  field_repair_amount: 'Durability a Field Repair restores', reactions: 'Reactions a round', rider_stage: 'Outburst rider stage bonus', push_tiles: 'Extra tiles a technique pushes',
  shove_guard: 'Guard gained when a Shove moves its target', prey_lock: 'Defender\'s Prey Lock holds (>0)', hymn_wait: 'Rounds between Hymns',
  // ---- asked by the sheet (character.ts)
  equip_ban: 'This weapon or mod may not be equipped (>0)', one_hand_heavy: 'Heavy weapons in one hand (>0)',
} as const;
export type PlainStatId = keyof typeof STATS;

/** The stat families: a prefix and what its suffix is. */
export const STAT_FAMILIES = {
  'ap_cost:': 'the AP of an action: a CostSite (effects/core.ts actionAp)',
  'skill:': 'a modifier to a d20 that uses this skill id (effects/core.ts skillRollMod)',
  'immune:': 'immunity to a condition id or one of IMMUNE_IDS (effects/core.ts immune; >0 is immune)',
  'save_': 'a save bonus: body, brain or heart (character.ts saveBonus)',
  'passive:': 'a passive score of this skill id (character.ts passive)',
  'technique:': 'this technique id comes with a perk (>0; physical/core.ts)',
  'momentum_needed:': 'Momentum a finisher of this technique id needs (physical/core.ts finisherNeed)',
} as const;

export type StatId = PlainStatId | `ap_cost:${CostSite}` | `skill:${string}` | `immune:${string}` | `save_${'body' | 'brain' | 'heart'}` | `passive:${string}` | `technique:${string}` | `momentum_needed:${string}`;

/** Is this string a declared stat id? (For data and tests; code is checked by the type.) */
export function isStatId(id: string): id is StatId {
  if (id in STATS) return true;
  const fam = Object.keys(STAT_FAMILIES).find((p) => id.startsWith(p)); if (!fam) return false;
  const rest = id.slice(fam.length); if (!rest) return false;
  if (fam === 'ap_cost:') return (COST_SITE_IDS as readonly string[]).includes(rest);
  if (fam === 'save_') return ['body', 'brain', 'heart'].includes(rest);
  return true;
}
