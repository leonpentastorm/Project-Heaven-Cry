// @ts-nocheck (a measuring tool, like the rest of test/balance)
// THE NINE DOORS AND THE MONK, ALL IN (0.30 party fit, docs/design/proposals/2026-11-party-fit.md). One all-in build per
// door, made legally by builds.ts (char/add, levelup/*), each the data's All-in archetype (archetypes.json family
// `all_in`) or, where the reference builds already hold that sheet, their `allin` variant:
//   Bulwark     wall (Living Wall: Durability 7)                       Guard
//   Breaker     opt_blade allin (Raw Power first: Wrecking Ball)      the Momentum chain
//   Skirmisher  plain_gun allin (Dexterity first: Deadeye)             Pressure
//   Operative   phantom (Ingenuity 7)                                   Shadow
//   Sigilist    sigil allin (Brain Power first: Savant)                Sigils
//   Rigger      rigger allin (Visualization first: Illusionist)       Figments
//   Mender      heartreader (Empathy 7)                                 Bonds and Tending
//   Channeler   outburst allin (Will Power first: Unbroken)            Outbursts
//   Chaplain    faith allin (Faith first: Prophet)                     prayer
//   the monk    opt_blade allin with the camp's Hand wraps             the Open Hand
// Registered into builds.ts's list the way tank-measure.ts registers its tanks (only when absent).
import { BUILD, BUILDS } from './builds';

const reg = (def: any) => { if (!BUILD[def.id]) { BUILDS.push(def); BUILD[def.id] = def; } return def.id; };
reg({ id: 'wall', label: 'Living Wall', way: 't', kit: 'soldier', main: 'durability', classId: 'defender', policy: 'tank',
  weights: { durability: 0.7, pain_threshold: 0.2, guts: 0.1 }, allin: ['durability', 'pain_threshold', 'guts'], spare: ['strength', 'agility', 'perception'],
  perks: 'none', techniques: 'default', note: 'The All-in tank: Durability 7 at level 1, nothing in a weapon skill.' });
reg({ id: 'phantom', label: 'Phantom', way: 'k', kit: 'soldier', main: 'ingenuity', classId: 'infiltrator', policy: 'operative',
  weights: { ingenuity: 0.6, vigilant: 0.25, dexterity: 0.15 }, allin: ['ingenuity', 'vigilant', 'dexterity'], spare: ['intelligence', 'expression', 'endurance'],
  perks: [], techniques: 'default', note: 'The All-in infiltrator (archetypes.json phantom): Ingenuity 7, Vigilant 3. Class: Operative (Perception).' });
reg({ id: 'heartreader', label: 'Heartreader', way: 'l', kit: 'soldier', main: 'empathy', classId: 'bard', policy: 'mender',
  weights: { empathy: 0.6, camaraderie: 0.25, dexterity: 0.15 }, allin: ['empathy', 'camaraderie', 'dexterity'], spare: ['determination', 'endurance', 'virtue'],
  perks: [], techniques: 'default', note: 'The All-in Soul empath (archetypes.json heartreader): Empathy 7, Camaraderie 3. Class: Mender (Insight).' });

// Rules 1.63 (0.31, Pressure is Dexterity's): the Dexterity melee builds, measured from now on beside the doors. The
// All-in Deadeye sheet (Dexterity 7) with a light blade or the Dexterity gloves instead of a gun; perk steps in its two
// alpha perks (Pressure Point, Keep Their Heads Down); forks only when a measure names them (builds.ts STEPS.forks).
const DEX_MELEE = { way: 'm', kit: 'soldier', main: 'dexterity', classId: 'marksman', armour: 1,
  weights: { dexterity: 0.36, athletics: 0.16, reaction_speed: 0.12, pain_threshold: 0.14, guts: 0.12, vigilant: 0.10 },
  allin: ['dexterity', 'athletics', 'reaction_speed', 'pain_threshold', 'guts', 'vigilant'], spare: ['endurance', 'strength', 'perception'],
  perks: ['both_hands', 'running_reload'], techniques: ['lunge', 'coup', 'hamstring', 'riposte', 'parry', 'sidestep', 'half_sword', 'feint'] };
reg({ id: 'dex_knife', label: 'Dexterity knife', policy: 'breaker', weapon: 'combat_knife', ...DEX_MELEE,
  note: 'The All-in Deadeye sheet (Dexterity 7) with the combat knife: Pressure laid at arm\'s length (rules 1.63). Class: Skirmisher.' });
reg({ id: 'dex_monk', label: 'Dexterity monk', policy: 'monk', weapon: 'striking_gloves', ...DEX_MELEE, techniques: 'default',
  note: 'The All-in Deadeye sheet (Dexterity 7) with the striking gloves (the Open Hand): Pressure laid by its blows (rules 1.63). Class: Skirmisher.' });

// ---------------------------------------------------------------------------------------------- the 0.32 picks
/** THE DOORS' PICKS (0.32 simulator lane): what a sensible player of each door takes on the 0.32 ladders, as data. The
 * forks at 4 and 8 (data/forks.json ids; builds.ts takeForks takes a named fork first) and the perk steps in the door's
 * beta and gamma skills (the four-perk lists of rules 1.73 to 1.75; builds.ts takePerks takes the first one offered of
 * the list). Each door build is its base build with these picks (registered as door_<base>); the base builds, which the
 * systems measure and the golden tables play, are not touched. Why each:
 *   bulwark     Provoke (the first foe on the plates is Taunted: a solo tank wants the hits on its plates) then Drive
 *               (Slam floors and gives plates back); Close Guard first (it left the door for Pain Threshold in 0.32: the
 *               policy walks beside the lowest ally for it), then Second Wind.
 *   breaker     Grindstone (a hit on a foe meleed last round builds Momentum: the chain on one target) then Spill (a
 *               Finisher that drops a foe carries on); its base build's perks, Steady and Unflinching for the old ones.
 *   skirmisher  Walk It In (a miss still presses) then Lockdown (a capped foe is Slowed); Roll With It.
 *   operative   Light Fingers (the policy never Lifts, so either is free; Lend the Dark needs an ally) then Lightkiller
 *               (Dimmed: foes must stand closer to see it); Got You in My Sight and Read Intent (Vigilant).
 *   sigilist    Clean Vent (the Vent throws back the foes beside it: the policy's answer to blades) then Written in
 *               Advance (a Line left over a turn hits harder: its Lines often are); its base build's perks.
 *   rigger      Sharp Light (the strike policy) then Many Hands (one more held).
 *   mender      Short Thread (Triage reaches further, the near Bond heals more) then Long Thread; Pull Together first
 *               (0.32: Tug is a Camaraderie perk now, the healer build must buy it), then Steady Hands, Nobody Left Behind.
 *   channeler   Slow Burn (Steady calms more: the heart at Strain limit 3) then Clean Break (a kill takes Strain off).
 *   chaplain    Round of Blessings then Benediction (an answered Hymn: the party is surer to hit).
 */
export const DOOR_PICKS: Record<string, { base: string; forks: string[]; perks?: string[] }> = {
  bulwark: { base: 'wall', forks: ['fork.guard.provoke', 'fork.guard.drive'], perks: ['close_guard', 'second_wind', 'numb', 'still_standing'] },
  breaker: { base: 'opt_blade', forks: ['fork.momentum.grindstone', 'fork.momentum.spill'], perks: ['breaching_strike', 'iron_grip', 'steady', 'roll_with_it', 'unflinching'] },
  skirmisher: { base: 'plain_gun', forks: ['fork.pressure.walk_it_in', 'fork.pressure.lockdown'], perks: ['roll_with_it', 'rounding_up'] },
  operative: { base: 'phantom', forks: ['fork.shadow.light_fingers', 'fork.shadow.lightkiller'], perks: ['got_you_in_my_sight', 'read_intent'] },
  sigilist: { base: 'sigil', forks: ['fork.sigil.clean_vent', 'fork.sigil.written_in_advance'] },
  rigger: { base: 'rigger', forks: ['fork.figment.sharp_light', 'fork.figment.many_hands'] },
  mender: { base: 'heartreader', forks: ['fork.tend.short_thread', 'fork.tend.long_thread'], perks: ['pull_together', 'steady_hands', 'nobody_left_behind', 'hand_off'] },
  channeler: { base: 'outburst', forks: ['fork.soul.slow_burn', 'fork.soul.clean_break'] },
  chaplain: { base: 'faith', forks: ['fork.prayer.round_of_blessings', 'fork.prayer.benediction'] },
};
for (const [door, p] of Object.entries(DOOR_PICKS)) { const b = BUILD[p.base]; reg({ ...b, id: 'door_' + p.base, label: b.label + ' (' + door + ', 0.32 picks)', forks: p.forks, ...(p.perks ? { perks: p.perks } : {}) }); }

/** The all-in member of each door (survival-run.ts MEMBER rows). 0.32: each door's build carries its picks (DOOR_PICKS). */
export const DOOR_MEMBERS: Record<string, any> = {
  bulwark: { build: 'door_wall', variant: 'allin', level: 1, policy: 'bulwark' },
  breaker: { build: 'door_opt_blade', variant: 'allin', level: 1, policy: 'breaker' },
  skirmisher: { build: 'door_plain_gun', variant: 'allin', level: 1, policy: 'skirmisher' },
  operative: { build: 'door_phantom', variant: 'allin', level: 1, policy: 'operative' },
  sigilist: { build: 'door_sigil', variant: 'allin', level: 1, policy: 'sigilRunT' },
  rigger: { build: 'door_rigger', variant: 'allin', level: 1, policy: 'riggerRun' },
  mender: { build: 'door_heartreader', variant: 'allin', level: 1, policy: 'mender' },
  channeler: { build: 'door_outburst', variant: 'allin', level: 1, policy: 'outburstRunT' },
  chaplain: { build: 'door_faith', variant: 'allin', level: 1, policy: 'chaplain' },
  monk: { build: 'opt_blade', variant: 'allin', level: 1, policy: 'monk', camp: 'hand_wraps' },
  // 0.32: the sparing Chaplain (prays only when it is needed: chaplainSparing, door-policies.ts)
  chaplain_sparing: { build: 'door_faith', variant: 'allin', level: 1, policy: 'chaplainSparing' },
  // 0.32: the Living Wall with a shield in each hand at ranks I, II and III (levels 1, 6 and 12; tank-measure.ts measures
  // rank I only): the camp's Buckler in the off hand, a second Buckler put in the main hand after the camp
  wall_2sh_r1: { build: 'door_wall', variant: 'allin', level: 1, policy: 'bulwark', hands: { main: 'buckler' } },
  wall_2sh_r2: { build: 'door_wall', variant: 'allin', level: 6, policy: 'bulwark', hands: { main: 'buckler' } },
  wall_2sh_r3: { build: 'door_wall', variant: 'allin', level: 12, policy: 'bulwark', hands: { main: 'buckler' } },
  // rules 1.63 (0.31): the Dexterity melee builds (Pressure at arm's length)
  dex_knife: { build: 'dex_knife', variant: 'allin', level: 1, policy: 'breaker', camp: 'combat_knife' },
  dex_monk: { build: 'dex_monk', variant: 'allin', level: 1, policy: 'monk', camp: 'hand_wraps' },
  // 0.32 simulator lane: the Operative with the camp's other free weapons (a player's own pick at the camp: the rack's
  // free rifle or revolver in place of the Recommended Parlour pistol), and the knife and pistol (the knife from the
  // camp, the pistol put in the off hand outside the reducer, as tank-measure.ts puts its second shield)
  operative_rifle: { build: 'door_phantom', variant: 'allin', level: 1, policy: 'operative', camp: 'lever_carbine' },
  operative_revolver: { build: 'door_phantom', variant: 'allin', level: 1, policy: 'operative', camp: 'drifter_revolver' },
  operative_knife: { build: 'door_phantom', variant: 'allin', level: 1, policy: 'operative', camp: 'combat_knife', hands: { off: 'parlour_pistol' } },
};
export const DOORS = Object.keys(DOOR_MEMBERS);
