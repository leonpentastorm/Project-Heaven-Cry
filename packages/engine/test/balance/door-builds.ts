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

/** The all-in member of each door (survival-run.ts MEMBER rows). */
export const DOOR_MEMBERS: Record<string, any> = {
  bulwark: { build: 'wall', variant: 'allin', level: 1, policy: 'bulwark' },
  breaker: { build: 'opt_blade', variant: 'allin', level: 1, policy: 'breaker' },
  skirmisher: { build: 'plain_gun', variant: 'allin', level: 1, policy: 'skirmisher' },
  operative: { build: 'phantom', variant: 'allin', level: 1, policy: 'operative' },
  sigilist: { build: 'sigil', variant: 'allin', level: 1, policy: 'sigilRunT' },
  rigger: { build: 'rigger', variant: 'allin', level: 1, policy: 'riggerRun' },
  mender: { build: 'heartreader', variant: 'allin', level: 1, policy: 'mender' },
  channeler: { build: 'outburst', variant: 'allin', level: 1, policy: 'outburstRunT' },
  chaplain: { build: 'faith', variant: 'allin', level: 1, policy: 'chaplain' },
  monk: { build: 'opt_blade', variant: 'allin', level: 1, policy: 'monk', camp: 'hand_wraps' },
};
export const DOORS = Object.keys(DOOR_MEMBERS);
