// Class Roster Revision 3 (8 Nov 2026): the 20 NEW moves, pending their handlers (phase B).
//
// Each move has its full data entry in data/classes.json (id, AP, uses, text, effects with core ops where they fit and
// a bespoke op where none does, `handler: "pending"`). Until its lane handler lands, the repo rule holds: what the
// engine doesn't run falls back to the Narrator with the move's text, never silently ignored.
//   - Active moves (a grant_action) already get their default action from the data (effects/actions.ts): the generic
//     runners do what they can (heal, cleanse, condition, knockback) and the Narrator rules the rest.
//   - Every effect a generic op doesn't claim is registered here as Narrator-ruled, so the coverage report reads
//     "Narrator rules it" / "Both" instead of a gap, and fights carry the move's text in their fallback notes.
// The handler agent replaces each entry with a real register() in its own lane file and deletes it from PENDING.
//
// TODO (phase B, one handler + test each):
//   defender.shrug_it_off   reaction (1 Guard): cleanse bleeding/slowed/weakened/prone on gain     ops: reaction, cleanse
//   defender.anchor         Braced: no push/pull/prone; OA on an adjacent foe that moves away      ops: anchor, free_attack
//   fighter.shove           1 AP: push 1 or Prone, Body save vs 12 + Body debuff strength           ops: grant_action, knockback
//   fighter.unstoppable     1 AP/scene: ignore Fear, Shaken, Slowed, Pinned and OAs; +2 Momentum    ops: grant_action, immunity, ignore_opportunity_attacks, resource
//   marksman.speed_loader   first reload a turn −1 AP (min 1)                                       ops: action_cost
//   marksman.duck_and_roll  reaction to a ranged attack: step 1; cover −2, out of sight no target   ops: reaction, free_move, to_hit_against_self
//   infiltrator.vanish      1 AP/turn: Hidden if no enemy sees you                                  ops: grant_action, condition
//   infiltrator.field_fix   2 AP adjacent: clear jam / restore durability / repair machine 20      ops: grant_action, field_repair
//   infiltrator.sabotage    2 AP adjacent: disable a machine 2 rounds, or rig your tile (30, Pinned) ops: grant_action, disable_machine, rig_tile
//   mage.core_change        core swap −1 AP (min 1)                                                 ops: action_cost
//   mage.bleed_the_flux     Vent −1 AP (min 0), vents 1 more Flux                                   ops: action_cost, resource
//   trickster.read          Analyze costs 1 AP and reveals the target's intended action            ops: action_cost, reveal
//   trickster.false_image   2 AP, 1 charge: a decoy of you for 2 rounds (Brain save)               ops: grant_action, spawn_illusion
//   trickster.silver_tongue 2 AP, range 6: Brain save or −2 AP next turn (bosses −1)               ops: grant_action, ap_loss
//   trickster.sleight       1 AP/scene: swap with your False Image or a willing ally within 6       ops: grant_action, swap_places
//   bard.rally              2 AP/scene: allies within 4 heal 20 × mult, lose Fear and Shaken        ops: grant_action, aura
//   channeler.iron_heart    Strain limit +1                                                         ops: stat_mod
//   channeler.occult_library one more tone known, one more ready design                             ops: stat_mod ×2
//   channeler.eye_of_the_storm once a scene: next Release adds no Strain, rider +1 stage            ops: grant_action, release_mod
//   guardian.command        1 AP/turn: an ally within 6 who hears you moves 2 tiles free (Leadership Squad) ops: grant_action, free_move
import { register, itemInfo, genericOf, type ItemInfo } from '../effects';

export const PENDING = [
  'defender.shrug_it_off', 'defender.anchor', 'fighter.shove', 'fighter.unstoppable', 'marksman.speed_loader', 'marksman.duck_and_roll',
  'infiltrator.vanish', 'infiltrator.field_fix', 'infiltrator.sabotage', 'mage.core_change', 'mage.bleed_the_flux',
  'trickster.read', 'trickster.false_image', 'trickster.silver_tongue', 'trickster.sleight', 'bard.rally',
  'channeler.iron_heart', 'channeler.occult_library', 'channeler.eye_of_the_storm', 'guardian.command',
];
for (const id of PENDING) {
  let info: ItemInfo | null = null;
  const claimed = (e: any) => { info ||= itemInfo('class:' + id); const g = genericOf(e?.op); return !!info && !!g && (info.bound ? !!g.runs?.(e, info) : g.claim(e, info)); };
  register({
    id,
    // Narrator-ruled until the handler lands: every effect no generic op runs (grant_action keeps its default action).
    narrator: (e: any) => e?.op !== 'grant_action' && !claimed(e),
    brief: () => 'a Revision 3 class move the engine runs only in part for now: rule the rest from its text',
  });
}
