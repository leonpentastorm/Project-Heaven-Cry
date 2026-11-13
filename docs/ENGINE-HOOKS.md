# Engine hooks: the catalogue (GENERATED)

<!-- Written by tools/engine_catalog.py from the engine's source and data/. Do not edit by hand: run `python3 tools/engine_catalog.py`. `npm run check` fails when this file is stale. -->

Every extension point the engine already has. **Look here before you build** (`docs/ENGINE-GUIDE.md`, "Stop: before you build"): a new item, class move, system or screen is built FROM these; a name that is not here is either a typo, an invention, or a new primitive that a design spec must list under "Needs a new primitive" (and that `docs/design/rev4-primitives.md` may already have consolidated). Check a spec or a diff with `npm run built-from -- <spec.md | git range>`.

Counts: 34 triggers, 85 predicates, 28 ops, 100 effect ops, 124 hooks, 3 never emitted, 15 profiles, 41 cost sites, 14 resources, 56 stats, 24 condition fields, 407 primitive exports, 130 fx kinds, 171 Unit fields, 58 Combat fields, 40 guards.

Sections: (a) item ops, (b) the hook bus, (c) the primitives, (d) the guards.

## (a) Item ops: the closed lists

An item whose behaviour is "when X, if Y, do Z, at most N per scope" is DATA: `{op, when, if, limit, and, say}` in its `effects`, run by `runTriggered` (`effects/triggers.ts`). Source of these tables: `data/effect_ops.json` `item_ops` (held equal to `TRIGGERS`, `PREDICATES` and `OPS` in `effects/triggers.ts` by `test/item-ops.test.ts`; rewrite it with `ITEM_OPS_WRITE=1 npx vitest run --root packages/engine test/item-ops`).
### Triggers (34)

| trigger | hook (phase) | whose event | what for | example item |
| --- | --- | --- | --- | --- |
| `combat_start` | `combat_start` | anyone | the fight begins | `tradecraft` (classes.json) |
| `combat_end` | `combat_end` | anyone | the fight ends | `ingenuity` (skills.json) |
| `round_start` | `round_start` | anyone | a new round begins | none yet |
| `turn_ap` | `turn_start_pre` | actor | a unit's turn is about to begin: its AP are being counted (grant_ap adds to or takes from this turn) | `last_wall` (perks.json) |
| `turn_start` | `turn_start` | actor | a unit's turn has begun | `sanctuary` (classes.json) |
| `turn_end` | `turn_end` | actor | a unit's turn ends | `run_and_gun` (classes.json) |
| `attack` | `attack_preview` | actor | an attack is being sized up (to-hit terms, its AP, a refusal); also every preview | `fire_discipline` (classes.json) |
| `attack_roll` | `attack_roll` | actor | an attack's d20 is rolled | `run_and_gun` (classes.json) |
| `hit` | `on_hit` | actor | an attack hit | `run_and_gun` (classes.json) |
| `miss` | `on_miss` | actor | an attack missed | `given_edge` (conditions.json) |
| `dealing` | `damage_out` | actor | an amount of damage is being made (before armour) | `ledger` (classes.json) |
| `taking` | `damage_in` (reduce) | target | damage is about to land (after armour, before the shield) | `sanctuary` (classes.json) |
| `would_drop` | `damage_in` (would_drop_to_0) | target | a blow would drop a unit to 0 HP | `take_the_weight` (classes.json) |
| `damaged` | `on_damaged` | target | a unit lost HP | `given_spite` (conditions.json) |
| `downed` | `on_downed` | target | a unit went down (Downed or dead) | `volatile` (figments.json) |
| `kill` | `on_kill` | actor | a unit was dropped by an enemy | `lingering_dread` (classes.json) |
| `cond_incoming` | `cond_apply` | target | a condition is about to be put on a unit (its save, its rounds, a refusal) | `take_the_weight` (classes.json) |
| `cond_landed` | `cond_landed` | target | a condition landed | `foe_grief` (conditions.json) |
| `cond_ended` | `cond_end` | target | a condition ended | none yet |
| `save` | `save` | target | a save is rolled | `settled` (conditions.json) |
| `moved` | `moved` | actor | a unit finished a move of its own | `slipping` (conditions.json) |
| `forced_move` | `forced_move` | target | a unit is about to be pushed, pulled, thrown or teleported | `siege_engine` (perks.json) |
| `heal` | `heal_in` | target | a unit is about to be healed | `tend.threads` (tending.json) |
| `heal_given` | `heal_given` | actor | a heal landed | `ledger` (classes.json) |
| `shield` | `shield_grant` | target | a shield is about to be given | `ledger` (classes.json) |
| `cost` | `cost` | actor | an action is priced (every priced action) | `speed_loader` (classes.json) |
| `reload` | `reload` | actor | a reload is made | `speed_loader` (classes.json) |
| `swap` | `swap` | actor | a weapon swap is priced | `speed_loader` (classes.json) |
| `injury` | `injury` | target | an injury is about to be rolled on a unit | `last_wall` (perks.json) |
| `glyph_cost` | `glyph_cost` | actor | a Sigil glyph is priced (its AP, charge and Flux; also every preview) | `barrage` (classes.json) |
| `acted` | `acted` | actor | a unit's own action succeeded (once, after it; ctx.action is its id or cost site, test it with `action`); a grant_action's nested `when: acted` effects need no `if.action` | `speed_loader` (classes.json) |
| `reaction` | `reaction` | actor | the holder makes a reaction (tactics.ts react(); its kind for `how`: attack, move, protect), before it resolves | none yet |
| `to_hit` | `to_hit` | actor | a roll to hit a target is sized up: a weapon attack, a Sigil or an Outburst (one hook, rolls.ts toHitTerms; `damage` reads its type: weapon, sigil, soul); roll_mod adds a term | `given_edge` (conditions.json) |
| `spot` | `spot` | target | a unit rolls to spot a Hidden one (the holder is the Hidden one; roll_mod changes the roll or, with roll: "tn", its TN; cancel) | `given_wonder` (conditions.json) |

### Predicates (85): the keys of `if`

| predicate | takes | what it tests | example item |
| --- | --- | --- | --- |
| `actor` | rel | the event's actor is (self \| ally \| side \| foe \| other \| none \| any; a list: any of them) | `ledger` (classes.json) |
| `target` | rel | the event's target is (as actor) | `ledger` (classes.json) |
| `self_hp_below` | number | self's HP is under this share of its max | `given_despair` (conditions.json) |
| `self_hp_above` | number | self's HP is over this share of its max | `take_the_weight` (classes.json) |
| `self_hp_at_most` | number | self's HP is at most this share of its max | `foe_mercy` (conditions.json) |
| `self_has` | ids | self has one of these conditions | `ingenuity` (skills.json) |
| `self_lacks` | ids | self has none of these conditions | none yet |
| `self_tier` | words | self's tier is one of these (vermin, minion, soldier, elite, boss) | none yet |
| `self_not_tier` | words | self's tier is none of these | `foe_mercy` (conditions.json) |
| `self_kind` | words | self's kind is one of these (human, robot, crawler, ork…) | none yet |
| `self_not_kind` | words | self's kind is none of these | none yet |
| `self_sight` | words | self's sight to the other side: seen, unseen, in_view, out_of_view (tactics.ts sightOf; any of the words named) | `ingenuity` (skills.json) |
| `actor_hp_below` | number | actor's HP is under this share of its max | none yet |
| `actor_hp_above` | number | actor's HP is over this share of its max | none yet |
| `actor_hp_at_most` | number | actor's HP is at most this share of its max | none yet |
| `actor_has` | ids | actor has one of these conditions | `nothing_left_to_fear` (perks.json) |
| `actor_lacks` | ids | actor has none of these conditions | none yet |
| `actor_tier` | words | actor's tier is one of these (vermin, minion, soldier, elite, boss) | none yet |
| `actor_not_tier` | words | actor's tier is none of these | none yet |
| `actor_kind` | words | actor's kind is one of these (human, robot, crawler, ork…) | none yet |
| `actor_not_kind` | words | actor's kind is none of these | none yet |
| `actor_within` | number | actor stands within this many tiles of the holder | `nothing_left_to_fear` (perks.json) |
| `actor_sight` | words | actor's sight to the other side: seen, unseen, in_view, out_of_view (tactics.ts sightOf; any of the words named) | none yet |
| `actor_sees_self` | bool | actor can (or cannot) see the holder: its eyes reach the holder's tile and the holder is not Hidden (shadow-spec 2.1) | `nothing_left_to_fear` (perks.json) |
| `target_hp_below` | number | target's HP is under this share of its max | none yet |
| `target_hp_above` | number | target's HP is over this share of its max | none yet |
| `target_hp_at_most` | number | target's HP is at most this share of its max | `given_mercy` (conditions.json) |
| `target_has` | ids | target has one of these conditions | `lunge` (classes.json) |
| `target_lacks` | ids | target has none of these conditions | none yet |
| `target_tier` | words | target's tier is one of these (vermin, minion, soldier, elite, boss) | `tend.threads` (tending.json) |
| `target_not_tier` | words | target's tier is none of these | none yet |
| `target_kind` | words | target's kind is one of these (human, robot, crawler, ork…) | none yet |
| `target_not_kind` | words | target's kind is none of these | none yet |
| `target_within` | number | target stands within this many tiles of the holder | `nothing_left_to_fear` (perks.json) |
| `target_sight` | words | target's sight to the other side: seen, unseen, in_view, out_of_view (tactics.ts sightOf; any of the words named) | `take_the_weight` (classes.json) |
| `target_sees_self` | bool | target can (or cannot) see the holder: its eyes reach the holder's tile and the holder is not Hidden (shadow-spec 2.1) | `tradecraft` (classes.json) |
| `melee` | bool | the attack or damage is (true) or is not (false) melee | `barbed` (figments.json) |
| `crit` | bool | the attack is (or is not) a critical | none yet |
| `mode` | words | the attack's mode is one of these (shot, aimed, burst, auto, melee, thrown, paired), or the technique it is made with (riposte…: ctx.tech) | `fire_discipline` (classes.json) |
| `damage` | words | the damage is of one of these kinds (melee, ranged, explosive, outburst, weapon, physical, sigil, soul, elemental, fire, lightning, emp, true) | none yet |
| `not_damage` | words | the damage is of none of these kinds (as damage; also a source type: strain, short) | `sanctuary` (classes.json) |
| `by_hit` | bool | the damage came (or did not come) from someone's blow, not a hazard, trap, Bleeding or Burning | `ledger` (classes.json) |
| `self_harm` | bool | the damage is (or is not) the unit's own doing (a Mana Short, an overload, Strain, Flux) | `last_wall` (perks.json) |
| `hostile` | bool | the actor and the target are (or are not) on different sides | `smite` (classes.json) |
| `cond` | ids | the condition is one of these | `take_the_weight` (classes.json) |
| `cond_family` | words | the condition's family is one of these (body, brain, heart) | none yet |
| `action` | words | the priced action (its cost site) is one of these | `speed_loader` (classes.json) |
| `word` | words | the Sigil word being drawn is one of these | `barrage` (classes.json) |
| `hand` | words | the hand is one of these (main, off, both) | `speed_loader` (classes.json) |
| `how` | words | the move is of one of these kinds (move, sprint, disengage; push, pull, throw, teleport); a reaction: its kind (attack, move, protect); a heal or shield: its kind (tending, prayer, perk, stim…) | `mend` (classes.json) |
| `ap_above` | number | the event's AP (a price, a swap) is over this | `speed_loader` (classes.json) |
| `own_turn` | bool | it is (or is not) the holder's own turn | `run_and_gun` (classes.json) |
| `flag` | string | the item's flag is set (the mark op sets it) | `run_and_gun` (classes.json) |
| `no_flag` | string | the item's flag is not set | `used_to_the_pain` (perks.json) |
| `self_alive` | bool | the holder is (or is not) up: not Downed, dead or surrendered | `walking_wounded` (perks.json) |
| `actor_alive` | bool | the actor is (or is not) up: not Downed, dead or surrendered | none yet |
| `target_alive` | bool | the target is (or is not) up: not Downed, dead or surrendered | `smite` (classes.json) |
| `open` | bool | nothing has stopped it yet: not cancelled, and (would_drop) not floored | `take_the_weight` (classes.json) |
| `amount_above` | number | the event's amount (damage, a heal) is over this | `used_to_the_pain` (perks.json) |
| `amount_share_below` | number | the event's amount is under this share of the holder's max HP | `used_to_the_pain` (perks.json) |
| `by_cover` | words | the move started (from) and / or ended (to) next to standing cover, or (here) the holder stands next to it now: every word named must hold | `ingenuity` (skills.json) |
| `self_in_zone` | zone | self stands in a zone of this kind (a kind, or {kind, owner: self, side or any}) | none yet |
| `target_in_zone` | zone | target stands in a zone of this kind (a kind, or {kind, owner: self, side or any}) | `sanctuary` (classes.json) |
| `actor_tied` | tie | actor is tied to the holder by this kind (a kind, or {kind, as: from or to}: the unit's end of it) | none yet |
| `target_tied` | tie | target is tied to the holder by this kind (a kind, or {kind, as: from or to}: the unit's end of it) | `take_the_weight` (classes.json) |
| `self_holds` | hold | the holder has it: {slot: hand or person, door: a focus kind (evoker, emanator, attuner, visualizer) or the skill it opens (brain_power, will_power, empathy, visualization)} (a focus) or {slot, item: an item id} | `ledger` (classes.json) |
| `self_lacks_gear` | hold | the holder does not have it (as self_holds) | none yet |
| `self_skill` | skill | the holder has at least these points in each skill named ({empathy: 7}: a door's ladder) | `camaraderie` (skills.json) |
| `self_skill_below` | skill | the holder has fewer than these points in each skill named (as self_skill) | none yet |
| `self_tied` | tie | the holder holds a tie of this kind (a kind, or {kind, side: foe, ally or any}: its far end of that side to the holder) | `tend.threads` (tending.json) |
| `choice` | words | the action's pick (its `pick` list: a felt feeling, a word…) is one of these | `inspire` (classes.json) |
| `self_tie_room` | tie | the holder may hold one more tie of this kind (under its cap: kit.ts tieCap) | none yet |
| `actor_not_tied` | tie | actor is not tied to the holder by this kind (as actor_tied) | none yet |
| `target_not_tied` | tie | target is not tied to the holder by this kind (as target_tied) | none yet |
| `uses_left` | limit | the holder's item has a use left in this limit ({per, n?, key?, each?: target}; read, never taken: the action is refused before it is paid, as "once an ally a turn") | none yet |
| `toggle` | words | one of the holder's item's data toggles (its ids) is on for the action being resolved | none yet |
| `free_tech` | bool | the attack is (true) or is not (false) made with a free technique, everyone's (techniques.json free: Shot, Aimed Shot, Cut, Overwatch), or with no technique a lone shot, aimed shot, blow or throw (a roll of a volley is not: a Burst, full auto, a weapon skill, both hands) | `fire_discipline` (classes.json) |
| `tech_ap_at_least` | number | the attack's own price is at least this many AP: its technique's cost with the weapon before any item (ctx.techAp), or with no technique the attack's base AP | `fire_discipline` (classes.json) |
| `path_tiles_at_most` | number | the move (its priced walk: ctx.tiles) is at most this many tiles | `run_and_gun` (classes.json) |
| `self_has_res` | words | the holder has at least 1 of each of these resources (data/actions.json resources: momentum, guard, MP…) | `ledger` (classes.json) |
| `self_lacks_res` | words | the holder has none of one of these resources (as self_has_res) | `riposte` (classes.json) |
| `patron` | words | the holder is Faithful to one of these patrons (patrons.json ids) | `smite` (classes.json) |
| `not_patron` | words | the holder is not Faithful to any of these patrons (an Atheist is none of them) | `smite` (classes.json) |
| `answered` | bool | a prayer of the holder's is (or is not) answered now (faith.ts prayerAnswered: the prayer door open, Faith and not Silenced; the Faithful always, an Atheist rolls the Whisper's TN; a preview rolls nothing). Put it last in `if`: it rolls | `smite` (classes.json) |
| `answer_on` | string | the holder keeps this item Answer switched on: the character's Answer list (phys.answers, set by phys/answers) names it, or it keeps none (every Answer on). Share a Hit (rules 1.33) | `camaraderie` (skills.json) |

### Ops (28)

| op | runs on | fields | changes state | what it does | example item |
| --- | --- | --- | --- | --- | --- |
| `damage_mult` | `dealing`, `taking` | `value`, `round`, `pool`, `replaces` | no | multiply the amount being dealt or taken (taking: round "up" rounds it up; pool: the holder's zone of that kind the target stands in gives what is prevented, and ends when spent; replaces: on dealing, the named term of the attack (its label: ambush) is taken out and this one stands in its place, so the two never multiply: Shadow's Break, rules 1.32) | `sanctuary` (classes.json) |
| `damage_mod` | `dealing`, `taking` | `value`, `value_pct` | no | add to the amount (value), or change it by a percentage (value_pct) | `ledger` (classes.json) |
| `damage_vs` | `dealing` | `value` | no | a bonus against this target (added with the other target bonuses) | none yet |
| `roll_mod` | `attack`, `to_hit`, `cond_incoming`, `save`, `spot` | `value`, `roll` | no | a to-hit term on an attack (to_hit: on any roll to hit, weapon, Sigil or Outburst); on a condition or save, the save (roll: "save", the default there) or its TN (roll: "tn"); on a spot roll, its modifier or (roll: "tn") its TN | `fire_discipline` (classes.json) |
| `cost_mod` | `cost`, `swap`, `reload`, `attack`, `glyph_cost` | `value`, `set`, `min`, `at_least`, `res` | no | change the AP (or with res, a resource: charge, flux…) of the action: add value, or set it; min is the floor a cut stops at; at_least raises it to that | `speed_loader` (classes.json) |
| `grant_ap` | any trigger | `value`, `bank` | yes | AP: at turn_ap, to this turn (a negative value takes); elsewhere perk AP now (bank: true, next turn) | `given_pride` (conditions.json) |
| `resource` | any trigger | `resource`, `value` | yes | give (or take) a class resource (guard, momentum…), Echo, or any resource of data/actions.json `resources` (MP, Pressure…: through effects/cost.ts resGive); value "all" spends and "zero" loses all of it | `run_and_gun` (classes.json) |
| `condition` | any trigger | `condition`, `rounds`, `skip_save`, `via`, `by`, `same_entry` | yes | put a condition on the self, the actor or the target (target:), with its save unless skip_save; by: "source" (a condition row) puts it on as from whoever gave the row (Afraid of the giver); via: the skill whose strength the save is against (as deal's via; default the ambient source); condition "incoming" (on cond_incoming): the condition being put on, with its rounds unless rounds is given; same_entry (hidden only): the same Hidden entry as before, no new ambush (Shadow, rules 1.32) | `run_and_gun` (classes.json) |
| `cleanse` | any trigger | `condition`, `family`, `count`, `newest` | yes | end conditions: the ones named, or a family's debuffs, or any debuff (count: how many; newest: true, the newest first, else in the order named) | `rally` (classes.json) |
| `cond_rounds` | `cond_incoming` | `max`, `add` | no | change the rounds of the condition being put on: at most max, or add | `iron_stomach` (perks.json) |
| `skip_save` | `cond_incoming` | (none) | no | the condition being put on gets no save | none yet |
| `cancel` | `cond_incoming`, `forced_move`, `injury`, `attack`, `spot` | `why` | no | stop it: the condition, the forced move or the injury does not happen; an attack is refused (why: the reason shown) | `take_the_weight` (classes.json) |
| `mend_mult` | `heal`, `shield` | `value` | no | multiply the heal or shield being given (before it is rounded down and capped); its kind is `how` (tending, prayer, perk…) | `tend.threads` (tending.json) |
| `floor` | `would_drop` | `value` | no | the blow leaves the unit at this many HP | `take_the_weight` (classes.json) |
| `deal` | any trigger | `amount`, `via`, `nonlethal`, `by` | yes | deal an amount block (amounts) to the self, actor or target (by: "source", a condition row: dealt as by whoever gave it); via: the source skill it counts as (a prayer: "faith"), nonlethal: a blow that takes the last HP subdues | `take_the_weight` (classes.json) |
| `mend` | any trigger | `amount`, `layer`, `holders` | yes | heal or shield by an amount block (its heal_kind is the heal's kind for heal_in: tending, prayer…; default perk); a shield on a layer (P11: layer, holders: at most that many units carry the holder's layer) | `rally` (classes.json) |
| `displace` | any trigger | `tiles`, `how`, `to` | yes | push the target away from the holder (how: push) or pull it closer (pull); to: "cover", the unit (the self unless target: is named) steps of its own will onto the nearest free tile next to standing cover within tiles (default its Movement), one out of every enemy's view first (Shadow's Fade, rules 1.32): no tile, nothing happens; to: "tile" (rules 1.33, Guide) moves it, willing, to the event's tile when that is at most `tiles` from it (how: guide); with no target named it is the holder that steps there (Shadow's Vault, rules 1.32) | none yet |
| `zone` | any trigger | `kind`, `at`, `within`, `rounds`, `pool`, `clear` | yes | lay a zone the holder owns (P10): kind (a data zone kind: magic.ts DATA_ZONE_KINDS), at (self, target or tile: the event's), within (its radius: a square), rounds, pool (what it has to give); clear: true ends the holder's zones of that kind (nothing said when it had none) | `sanctuary` (classes.json) |
| `tie` | any trigger | `kind`, `clear` | yes | tie the holder to the target by a kind (P8: kit.ts tie; refused at the holder's cap: nothing said); clear: "target" ends the holder's ties of that kind to the target, "all" every one of that kind it holds | none yet |
| `spawn` | any trigger | `block`, `at` | yes | make an owned unit (P9: owned.ts spawnOwned) from a data block (enemies.json companions, a system's forms) at the holder's level, on the free tile nearest the holder (at: self), the target or the event's tile; tied to the holder (owned); refused at its cap (ties_max:owned): nothing said | none yet |
| `unmake` | any trigger | `refund` | yes | unmake an owned unit (P9: owned.ts unmakeOwned; the target, else the holder): it leaves the fight; refund: what its making took goes back to its owner | none yet |
| `redirect` | `taking` | `share`, `split`, `type` | yes | move a share of the damage being taken to the holder (a protector: Share a Hit), or with `targets` and split: true divide it among the units of that set; what is moved lands as the same blow (it is not redirected again), or with type as damage of that type (a Bond's share: soul) | `camaraderie` (skills.json) |
| `use` | any trigger | (none) | yes | nothing but its limit: spends one use (for a limit another effect reads with peek) | `speed_loader` (classes.json) |
| `mark` | any trigger | `flag`, `clear` | yes | set (or with clear: true, clear) one of the item's own flags, for a later trigger's flag / no_flag | `run_and_gun` (classes.json) |
| `take` | any trigger | `save`, `via` | yes | take one thing the target carries into the pile on the holder's tile: a throwable, else a spare magazine (Shadow's Lift); save: the target's save family (body, brain, heart) rolled against the holder's strength (via: by that skill), and a success keeps it | none yet |
| `last_seen` | any trigger | (none) | yes | every other side now places the holder on the event's tile (cb.lastSeen: where its searchers go for a Hidden hostile; Shadow's Decoy) | none yet |
| `object` | any trigger | `do`, `has`, `kind`, `amount` | yes | work the object on the event's tile that is `has` (a kind id, a kind field or a cover grade: objects.ts objectIs): do "pick" (a door: locked or closed, it opens; open, it closes and locks, not while someone stands in it), "break" (its HP to 0 through the object damage; one with no HP is put out and gone); or do "lay": make an object of `kind` (a trap) there, the holder's side's, its damage the item's amount block `amount`, one at a time (the holder's last one from this item goes). Nothing there: nothing happens (Shadow's Pick, Douse and Rig, rules 1.32) | none yet |
| `close_roll` | `spot` | `value` | no | an enemy next to the holder rolls to spot it (value added to its modifier) instead of finding it outright (Shadow's Close Quarters, rules 1.32) | `ingenuity` (skills.json) |

### Limits and scopes

`limit` is `{per, n, key?, each?, peek?}` or `{cooldown}`; `per` is one of `per_turn`, `per_round`, `per_combat`, `per_scene`, `per_session`, `per_rest` (`LIMIT_SCOPES`, `effects/triggers.ts`). In code every limit is `uses(h)` (`effects/uses.ts`); its scopes, one row each (`SCOPES`):

| scope | fresh again when | cells live (fight / area map) |
| --- | --- | --- |
| `at_will` | always | unit / story |
| `out_of_combat` | always (refused in a fight) | unit / story |
| `per_turn` | the fight's turn pointer moves (round.turn); on the area map, a new round | unit / story |
| `per_round` | a new round (the fight's; on the area map, the story's) | unit / story |
| `reaction` | a new round | unit / story |
| `cooldown` | N rounds after the round it was stamped with (N is given by the asker) | unit / story |
| `per_combat` | a new fight (the unit is rebuilt) | unit / story |
| `per_scene` | the Narrator opens a new scene (g.story.scene.n) | character / character |
| `per_session` | a new session (g.sessionN) | character / character |
| `per_rest` | a long rest (g.restN) or a new session | character / character |
| `per_campaign` | never | character / character |

### Data effect ops (100 engine-run; 113 bespoke ones are per-item and not listed)

An effect with no trigger `when` is one of these (`data/effect_ops.json` `items`). An op the engine does not recognise goes to the Narrator with the item's text.

| op | tier | fields | what it does | example item |
| --- | --- | --- | --- | --- |
| `stat_mod` | core | `basis`, `context`, `duration`, `limit`, `min`, `stat`, `target`, `value`, `when` | Add to a derived stat (hp, ap, move, armor, init, mp_max, ...). | `classes:banner_thread` |
| `narrator` | core | `note` | Not automatable: the Narrator (AI or human) decides using the item's text. | `classes:extraction` |
| `grant_action` | core | `action`, `ap`, `effects`, `range`, `requires_state`, `silent`, `uses` | Give a new action with an AP cost and a use limit. | `classes:blessed_shells` |
| `skill_mod` | core | `context`, `skill`, `value`, `when` | Flat bonus to rolls with one skill (or a choice of skills). | `perks:crowd_pleaser` |
| `perk_choice` | core | `choice`, `skill` | Rank-unlock hook: pick a perk tier. | `skills:analysis` |
| `condition` | core | `area`, `choose`, `condition`, `duration`, `filter`, `id`, `location`, `rounds`, `save`, `target`, `when` | Apply a condition (or family:x / a choice list). | `classes:brace` |
| `resource` | core | `resource`, `set`, `value`, `when` | Gain or spend a resource (echo, ammo, mana, core, mp, flux, strain, faith, class resources). | `classes:brace` |
| `skill_mod_tag` | core | `context`, `duration`, `tag`, `target`, `uses`, `value`, `when` | Flat bonus to every skill with a tag (alpha/beta/gamma, core:x, attr:x). | `classes:inspire` |
| `action_cost` | core | `action`, `context`, `set`, `uses`, `value` | Change (value) or fix (set) the AP cost of an action. | `classes:case_file` |
| `cost_mod` | core | `action`, `context`, `limit`, `resource`, `uses`, `value`, `when` | Change what a spell, blessing or item costs in its resource. | `perks:charge` |
| `immunity` | core | `conditions`, `context`, `target`, `to` | Can't gain a condition or damage type. | `perks:clean_draw` |
| `damage_mult` | core | `context`, `count`, `duration`, `max`, `per`, `target`, `uses`, `value`, `when` | Multiply damage dealt. | `classes:finisher` |
| `forbid` | core | `action`, `context` | An action can't be taken. | `conditions:disarmed` |
| `damage_mod` | core | `area`, `basis`, `context`, `source`, `target`, `type`, `value`, `value_pct`, `when` | Add flat damage. | `classes:discharge` |
| `tn_mod` | core | `context`, `value` | Shift the target number of a kind of check. | `classes:bind` |
| `state` | core | `area`, `context`, `duration`, `ends_on`, `hp`, `rounds`, `save`, `state`, `tiles`, `uses`, `value`, `when` | A named toggled state with its own rules. | `classes:bulwark_line` |
| `save_mod` | core | `context`, `duration`, `family`, `save`, `target`, `value`, `when` | Bonus or penalty to Body/Brain/Heart saves. | `perks:lab_coat` |
| `attack_mod` | core | `context`, `duration`, `target`, `value`, `when` | Bonus or penalty to attack rolls. | `classes:fire_discipline` |
| `gate_check` | core | `context`, `on_fail`, `skill`, `tn` | Something can only be attempted after passing a check. | `traits:augmented` |
| `damage_reduction` | core | `context`, `duration`, `max`, `per`, `target`, `type`, `value`, `when` | Reduce damage taken: value is a fraction 0-1 (0.25 = a quarter less) unless type is flat (then it is points). | `perks:bulwark` |
| `reveal` | core | `context`, `count`, `ignores`, `radius`, `range`, `shared_with`, `target`, `what`, `when` | Make hidden things visible. | `perks:case_closed` |
| `shield` | core | `basis`, `duration`, `provisional`, `scale`, `target`, `value`, `when` | Temporary HP that absorbs damage first. | `classes:adamantile_plate` |
| `start_item` | core | `item` | Start play with an item (items.json id); an item with an armour slot is worn at once. | `traits:bottle_butts_for_eyes` |
| `aura` | core | `effect`, `effects`, `radius`, `range_if_stationary`, `range_tiles`, `target`, `trigger`, `when` | An effect on everyone within N tiles. | `perks:nothing_left_to_fear` |
| `damage_taken_mod` | core | `context`, `value_pct` | Change damage taken (signed). | `traits:crawler_blooded` |
| `extra_use` | core | `action`, `context`, `per`, `uses`, `value` | One more use of a limited ability. | `perks:before_the_blink` |
| `ignore_cover` | core | `context` | Attacks ignore a level of cover. | `perks:trick_shot` |
| `free_move` | core | `context`, `tiles`, `when` | Movement that costs no AP. | `perks:never_there` |
| `knockback` | core | `target`, `tiles` | Push a target a number of tiles. | `perks:breaching_strike` |
| `reaction` | core | `action`, `context`, `limit`, `trigger` | An action taken off-turn; uses the one reaction per round unless it says otherwise. | `perks:catch` |
| `cleanse` | core | `ap`, `condition`, `count`, `family`, `scope`, `target`, `uses`, `what` | Remove a condition or family. | `patrons:mother_ember.everyone_home` |
| `deal` | core | `amount`, `target` | Deal an amount of damage from data on the one formula (rules.json output): the item's amount block by name, or a block written here. The 'damage_out' hook, armour by the block's type, then the sink. | none yet |
| `mend` | core | `amount`, `target` | Give an amount of healing or a shield from data on the one formula (rules.json output), by the block's kind: the item's amount block by name, or a block written here. Then the heal sink or the shield sink. | none yet |
| `heal` | core | `scale`, `target`, `value` | Restore HP. | `classes:mend` |
| `merge_action` | core | `action`, `into`, `limit` | Two actions resolve as one for a combined AP cost. | `perks:running_reload` |
| `price_mod` | core | `buy_pct`, `context`, `sell_pct` | Change buy/sell prices. | `traits:company_man` |
| `roll_bonus` | core | `context`, `requires_narrator_approval`, `uses`, `value` | One-off bonus to a specific roll. | `traits:central_city_kid` |
| `roll_mod_all` | core | `context`, `value` | Bonus or penalty to every d20 roll. | `traits:cold_case` |
| `spawn_illusion` | core | `context`, `count`, `disbelieve`, `duration`, `rounds`, `solid`, `uses` | Create a decoy on the grid. | `perks:mirage` |
| `stat_mult` | core | `context`, `stat`, `value` | Multiply a derived stat. | `conditions:emplaced` |
| `unlock_word` | core | `standalone`, `word` | Learn a Sigil word. | `classes:blind_and_slow` |
| `word_cost` | core | `value`, `words` | Change a Sigil word's charge cost. | `classes:barrage` |
| `auto_success` | core | `check`, `choose`, `context`, `skill`, `uses` | The check succeeds without a roll. | `perks:everyones_friend` |
| `free_action` | core | `action`, `ap`, `context`, `effect`, `scope`, `target`, `until`, `when` | An action costs 0 AP under a trigger. | `patrons:counting_weaver.rewoven` |
| `heal_received_mult` | core | `context`, `value` | Multiply healing received. | `traits:factory_made` |
| `interrupt` | core | `action`, `ap`, `context`, `trigger`, `uses`, `when` | Act before a triggering action resolves. | `perks:angel_of_the_trenches` |
| `movement_mode` | core | `attack_mid_move`, `max_tiles`, `mode` | A new way to move (climb, swim, jump). | `perks:wall_run` |
| `xp_mod` | core | `mutual`, `source`, `value_pct`, `when` | Change XP gained. | `traits:born_performer` |
| `auto_fail` | core | `check`, `context`, `target` | The check fails without a roll. | `perks:judgement_day` |
| `free_attack` | core | `ap`, `attack`, `target`, `when` | An attack that costs no AP. | `perks:dance_of_iron` |
| `disadvantage` | core | `context` | Roll twice, keep the lower. | `skills:athletics` |
| `reroll` | core | `target`, `uses` | Reroll a die. | `traits:rabbits_foot` |
| `multi_shot` | weapon |  | An action that fires several shots or rounds at one target for a fixed AP (shots, extra to-hit, dmg_mult, rounds). | `weapons:drifter_revolver` |
| `auto_ap` | weapon |  | Full auto costs this many AP with this weapon. | `weapons:decrkm_smg` |
| `cover_damage_mult` | weapon |  | Multiply damage this weapon deals to objects (cover, doors, shields). | `weapons:lumeri_scattergun` |
| `aimed_still_bonus` | weapon |  | Extra to-hit on aimed shots if you haven't moved this turn. | `weapons:long_rifle` |
| `braced_bonus` | weapon |  | Extra to-hit while braced. | `weapons:hellraiser_lmg` |
| `aimed_ap` | weapon |  | Aimed shots cost this many AP with this weapon. | `weapons:crossbow` |
| `edge_word` | weapon |  | After a hit, the wielder's next glyph this turn costs 0 AP (charge and Flux as usual); not on an attack that already drew a glyph. | `weapons:evoker_blade` |
| `vs_status_damage` | weapon |  | Damage multiplier against targets with any listed status. | `weapons:combat_knife` |
| `on_hit` | weapon |  | On a hit, apply: ap_loss, push (tiles), prone, bleed or armour_break (value). | `weapons:maul` |
| `hit_bonus` | weapon |  | Extra to-hit within a range in tiles. | `weapons:decrkm_autopistol` |
| `first_shot_bonus` | weapon |  | Extra to-hit on the first attack of a fight. | `weapons:parlour_pistol` |
| `auto_width` | weapon |  | Full auto catches enemies this many tiles from the line. | `weapons:mandestra_drum_gun` |
| `ignore_armour` | weapon |  | Ignore this much of the target's armour. | `weapons:adamantile_battle_rifle` |
| `aimed_crit_min` | weapon |  | Aimed shots crit on this roll or higher. | `weapons:ccec_marksman_rifle` |
| `defense_with_shield` | weapon |  | Extra Defense while a shield is in the off hand. | `weapons:legion_gladius` |
| `reach` | weapon |  | Melee reach in tiles. | `weapons:kemizuchi_duelling_blade` |
| `sweep` | weapon |  | An action that strikes every adjacent enemy. | `weapons:adamantile_greatsword` |
| `defense_bonus` | item |  | Add to Defense while held or worn. | `items:buckler` |
| `movement_bonus` | item |  | Add to Movement (tiles per AP) while held or worn. | `items:riot_shield` |
| `light` | item |  | Light radius in tiles around the holder (see Vision). | `items:torch` |
| `mod` | item |  | A weapon mod for the named slot; its effect is in its text and run by the engine. | `items:mod_red_dot` |
| `injury_resist_bonus` | item |  | Add percentage points to Injury resistance. | `items:field_helmet` |
| `armour_bonus` | item |  | Add to armour while worn. | `items:ballistic_helmet` |
| `dark_sight` | item |  | Darkness doesn't halve your Vision. | `items:night_goggles` |
| `hazard_immune` | item |  | A hazard kind (toxic, fire) doesn't hurt you. | `items:gas_mask` |
| `carry_bonus` | item |  | Add kg to the carry limit. | `items:utility_belt` |
| `unarmed_damage_bonus` | item |  | Add to Unarmed damage. | `items:work_gloves` |
| `ignore_difficult` | item |  | Rough ground costs no extra movement. | `items:field_boots` |
| `inflection` | sigil | `stat`, `value` | A Mastered word's inflection (rules 1.10, Sigil 1.5): one small upgrade of that word, always on for its caster. stat names the number it moves (cond_rounds, save_tn, to_hit, damage_pct, push_tiles, shield_pct, heal_pct, charge, flux, lasts_rounds, radius, teleport_tiles, barrier_hp_pct, move_tiles, range, turret_def, pull_tiles, jump_radius, leech, mult, radius_at_4, cone_length, spare_downed); a stat the engine does not run goes to the Narrator with the text. | `sigils:fire` |
| `damage_vs` | core | `and`, `if`, `label`, `limit`, `priority`, `say`, `target`, `value`, `when` | Item op (engine foundations 3): a bonus against this target (added with the other target bonuses). Runs on a trigger (`when`): dealing. | none yet |
| `roll_mod` | core | `and`, `if`, `label`, `limit`, `priority`, `roll`, `say`, `target`, `value`, `when` | Item op (engine foundations 3): a to-hit term on an attack; on a condition or save, the save (roll: "save", the default there) or its TN (roll: "tn"). Runs on a trigger (`when`): attack, cond_incoming, save. | none yet |
| `grant_ap` | core | `and`, `bank`, `if`, `label`, `limit`, `priority`, `say`, `target`, `value`, `when` | Item op (engine foundations 3): AP: at turn_ap, to this turn (a negative value takes); elsewhere perk AP now (bank: true, next turn). Runs on a trigger (`when`): turn_ap, combat_start, combat_end, round_start, turn_start, turn_end, attack, attack_roll …. | none yet |
| `cond_rounds` | core | `add`, `and`, `if`, `label`, `limit`, `max`, `priority`, `say`, `target`, `when` | Item op (engine foundations 3): change the rounds of the condition being put on: at most max, or add. Runs on a trigger (`when`): cond_incoming. | none yet |
| `cancel` | core | `and`, `if`, `label`, `limit`, `priority`, `say`, `target`, `when`, `why` | Item op (engine foundations 3): stop it: the condition, the forced move or the injury does not happen; an attack is refused (why: the reason shown). Runs on a trigger (`when`): cond_incoming, forced_move, injury, attack. | none yet |
| `floor` | core | `and`, `if`, `label`, `limit`, `priority`, `say`, `target`, `value`, `when` | Item op (engine foundations 3): the blow leaves the unit at this many HP. Runs on a trigger (`when`): would_drop. | none yet |
| `displace` | core | `and`, `how`, `if`, `label`, `limit`, `priority`, `say`, `target`, `tiles`, `when` | Item op (engine foundations 3): push the target away from the holder (how: push) or pull it closer (pull). Runs on a trigger (`when`): combat_start, combat_end, round_start, turn_ap, turn_start, turn_end, attack, attack_roll …. | none yet |
| `mark` | core | `and`, `clear`, `flag`, `if`, `label`, `limit`, `priority`, `say`, `target`, `when` | Item op (engine foundations 3): set (or with clear: true, clear) one of the item's own flags, for a later trigger's flag / no_flag. Runs on a trigger (`when`): combat_start, combat_end, round_start, turn_ap, turn_start, turn_end, attack, attack_roll …. | none yet |
| `use` | core | `and`, `if`, `label`, `limit`, `priority`, `say`, `target`, `when` | Item op (engine foundations 3): nothing but its limit: spends one use (for a limit another effect reads with peek). Runs on a trigger (`when`): combat_start, combat_end, round_start, turn_ap, turn_start, turn_end, attack, attack_roll …. | none yet |
| `zone` | core | `and`, `at`, `clear`, `if`, `kind`, `label`, `limit`, `pool`, `priority`, `rounds`, `say`, `target`, `when`, `within` | Item op (Classes 3.0 P10): lay a zone the holder owns (kind, at, within, rounds, pool), or with clear: true end the holder's zones of that kind; read by the predicates self_in_zone and target_in_zone and by damage_mult's pool. Runs on a trigger (`when`). | none yet |
| `tie` | core | `and`, `clear`, `if`, `kind`, `label`, `limit`, `priority`, `say`, `target`, `when` | Item op (Classes 3.0 P8): tie the holder to the target by a kind of rules.json ties.kinds (kit.ts tie: refused at the holder's cap), or with clear (target: its ties of that kind to the target; all: every one it holds) end them; read by the predicates actor_tied and target_tied and by targets.tied. Runs on a trigger. | none yet |
| `spawn` | core | `and`, `at`, `block`, `if`, `label`, `limit`, `priority`, `say`, `when` | Item op (Classes 3.0 P9): make an owned unit (owned.ts spawnOwned) from a data block (enemies.json companions, a system's forms) at the holder's level on the free tile nearest the holder (at: self), the target or the event's tile, tied to the holder (owned); its record: turn (own, owner, auto), eyes, upkeep, cover, lure. Runs on a trigger. | none yet |
| `unmake` | core | `and`, `if`, `label`, `limit`, `priority`, `refund`, `say`, `target`, `when` | Item op (Classes 3.0 P9): unmake an owned unit (owned.ts unmakeOwned): it leaves the fight, its tie ends; refund: what its making took goes back to its owner. Runs on a trigger. | none yet |
| `redirect` | core | `and`, `if`, `label`, `limit`, `priority`, `say`, `share`, `split`, `targets`, `when` | Item op (Classes 3.0, the batch row and section 6's split): on taking, move a share of the damage to the holder (a protector), or with targets and split: true divide it among that set; what is moved lands as the same blow and is not moved again. Runs on the trigger taking. | none yet |
| `take` | core | `and`, `if`, `label`, `limit`, `priority`, `save`, `say`, `target`, `via`, `when` | Item op (Classes 3.0 step 6, Shadow's Lift, rules 1.32): take one thing the target carries (a throwable, else a spare magazine) into the pile on the holder's tile; save: the target's save family against the holder's strength (via: by that skill), and a success keeps it. Runs on a trigger. | none yet |
| `last_seen` | core | `and`, `if`, `label`, `limit`, `priority`, `say`, `target`, `when` | Item op (Classes 3.0 step 6, integration; Shadow's Decoy, rules 1.32): every other side now places the holder on the event's tile (cb.lastSeen: where its searchers go for a Hidden hostile). Runs on a trigger, or as a verb aimed at a tile. | none yet |
| `object` | core | `amount`, `and`, `do`, `has`, `if`, `kind`, `label`, `limit`, `priority`, `say`, `target`, `when` | Item op (Classes 3.0 step 6, integration; Shadow's Pick, Douse and Rig, rules 1.32): work the object on the event's tile that is `has` (a kind id, a kind field or a cover grade): do pick (a door: locked or closed, it opens; open, it closes and locks), break (its HP to 0; one with no HP is put out), or lay an object of `kind` there (the holder's side's, its damage the item's amount block `amount`, one at a time). Runs on a trigger, or as a verb aimed at a tile. | none yet |
| `close_roll` | core | `and`, `if`, `label`, `limit`, `priority`, `say`, `target`, `value`, `when` | Item op (Classes 3.0 step 6, integration; Shadow's Close Quarters, rules 1.32): on the spot hook, an enemy next to the Hidden holder rolls to spot it (value added to its modifier) instead of finding it outright. | none yet |
| `mend_mult` | core | `and`, `if`, `label`, `limit`, `priority`, `say`, `target`, `value`, `when` | Item op (Classes 3.0 step 1b): multiply the heal or shield being given (before it is rounded down and capped); its kind is `how` (tending, prayer, perk...). Runs on the triggers heal and shield. | none yet |

## (b) The hook bus

A hook is heard by an item handler (`on: { <hook>: (ctx, h) => … }`), by an engine system (`onHook(name, fn)`, `onStoryHook`), or by a data item through an item-op trigger (last column). It is fired by `emit(cb, name, ctx)` (fights), `emitOwn(u, …)` (one unit's items) or `emitStory(g, …)` (the story and the area map), all in `effects/hooks.ts`. The description is `HOOK_ABOUT` in `effects/types.ts`; the payload's fields are read from the emit sites (`cb`, `g` and `rng` are on most and left out). A hook marked "never emitted" is declared and silent.

124 hooks.

| hook | what for | payload fields | fired at | heard at (first) | item-op trigger |
| --- | --- | --- | --- | --- | --- |
| `combat_start` | the fight begins: items set up their state, initiative order is known | `order` | combat.ts:1534 | classes/i.ts:591 (+47) | `combat_start` |
| `round_start` | a new round begins (after the last unit of the round acted) | `round` | combat.ts:1628 | calls/rules.ts:109 (+15) | `round_start` |
| `turn_start_pre` | a unit's turn is about to begin: its AP are being counted (grants and penalties) | `u`, `grants`, `penalties` | combat.ts:1553 | calls/rules.ts:93 (+30) | `turn_ap` |
| `turn_start` | a unit's turn has begun | `u` | combat.ts:1597 | classes/i.ts:252 (+59) | `turn_start` |
| `turn_end` | a unit's turn ends, before the turn passes | `u` | combat.ts:1624 | calls/rules.ts:101 (+36) | `turn_end` |
| `move_cost` | a walk is priced before it is paid (free steps, a cheaper or dearer move, no opportunity strikes) | `u`, `from`, `to`, `route`, `tiles`, `how`, `ap`, `skipOA`, `skipOW`, `free`, `mods`, `preview` | combat.ts:1732 | classes/i.ts:306 (+18) |  |
| `move_step` | a walking unit enters a tile (a step may be stopped; held shots and traps read it) | `u`, `from`, `at`, `i`, `route`, `how`, `stop`, `skipOW`, `noWatch`, `flush`, `forced`, `technique` | combat.ts:1759 (+2) | classes/j.ts:237 (+13) |  |
| `moved` | a unit finished a move of its own | `u`, `from`, `to`, `tiles`, `how`, `forced`, `route`, `stopped`, `part` | classes/rev3.ts:420 (+2) | classes/i.ts:382 (+26) | `moved` |
| `forced_move` | a unit is about to be pushed, pulled, thrown or teleported (cancel, fewer tiles) | `u`, `by`, `tiles`, `how`, `kind`, `pull`, `cancel` | combat.ts:1971 | classes/i.ts:383 (+6) | `forced_move` |
| `attack_preview` | an attack is being sized up: its to-hit terms, its AP, a refusal; also every preview | `att`, `tgt`, `mode`, `melee`, `ap`, `techAp`, `reach`, `ignoreCover`, `terms`, `fail`, `free`, `preview`, `volleyCost`, `mods`, `noRecoil`, `volley`, `tech`, `seeVeil`, `noLos`, `coverTile`, `coverWhy`, `ignoreTaunt`, `bandsLess` | combat.ts:423 (+2) | calls/rules.ts:20 (+48) | `attack` |
| `attack_target` | a resolved attack picks its target: items may redirect it or answer it first (cancel) | `att`, `tgt`, `orig`, `mode`, `volley`, `vi`, `free`, `mods`, `locked`, `cancel`, `why` | combat.ts:1339 | calls/rules.ts:43 (+16) |  |
| `attack_roll` | an attack's d20 is rolled: items may change the die or the result | `att`, `tgt`, `mode`, `die`, `toHit`, `need`, `critMin`, `noFumble`, `ambush`, `hit`, `volley`, `tech`, `techAp`, `mods` | combat.ts:1369 | classes/i.ts:161 (+36) | `attack_roll` |
| `damage_out` | an amount of damage is being made (before armour): multipliers and target bonuses | `att`, `tgt`, `mode`, `melee`, `src`, `base`, `add`, `mults`, `vs`, `crit`, `preview`, `mods`, `pierce`, `ignoreArmour`, `critBonus`, `spec` | combat.ts:1282 (+1) | classes/i.ts:345 (+26) | `dealing` |
| `on_hit` | an attack hit | `att`, `tgt`, `mode`, `dmg`, `crit`, `killed`, `melee`, `volley`, `mods` | combat.ts:1440 | classes/i.ts:592 (+46) | `hit` |
| `on_miss` | an attack missed | `att`, `tgt`, `mode`, `die`, `fumble`, `melee`, `volley`, `stopped`, `mods` | combat.ts:1441 | classes/i.ts:1147 (+30) | `miss` |
| `damage_in` | damage is landing on a unit, in phases (reduce, shield, would_drop_to_0, after) | `t`, `src`, `dmg`, `phase`, `hostile`, `self`, `guard0` | effects/damage.ts:77 (+3) | classes/i.ts:387 (+34) | `taking`, `would_drop` |
| `on_damaged` | a unit lost HP | `t`, `src`, `dmg`, `prevHp` | effects/damage.ts:111 | classes/k.ts:1089 (+12) | `damaged` |
| `on_downed` | a unit went down (Downed or dead) | `victim`, `by`, `src`, `ownTurn`, `dead` | effects/damage.ts:119 | classes/j.ts:819 (+17) | `downed` |
| `on_kill` | a unit was dropped by an enemy (the killer gets the credit) | `victim`, `by`, `src`, `ownTurn` | effects/damage.ts:120 | classes/k.ts:111 (+6) | `kill` |
| `cond_apply` | a condition is about to be put on a unit: its save, its rounds, a refusal | `by`, `t`, `id`, `fam`, `rounds`, `skipSave`, `cancel`, `why`, `tnAdd`, `saveAdd`, `arg`, `via`, `save` | magic.ts:337 (+3) | classes/i.ts:1074 (+26) | `cond_incoming` |
| `save` | a save is rolled: items may add to it, change its TN, or pass or fail it outright | `by`, `t`, `id`, `fam`, `via`, `saveAdd`, `tnAdd`, `pass`, `fail`, `why` | rolls.ts:146 | none | `save` |
| `cond_landed` | a condition landed on a unit | (a payload built elsewhere) | magic.ts:321 | classes/i.ts:384 (+13) | `cond_landed` |
| `cond_end` | a condition ended on a unit | `u`, `id` | magic.ts:421 | classes/j.ts:191 (+2) | `cond_ended` |
| `displaced` | a unit was moved by someone else, after it landed (where it ended, what stopped it) | `u`, `by`, `from`, `to`, `path`, `how`, `kind`, `stoppedBy`, `blockedAt` | combat.ts:2037 | perks/skeleton.ts:58 |  |
| `heal_given` | a heal landed (who healed whom, how much) | `t`, `by`, `n`, `kind`, `revived`, `over` | combat.ts:2540 (+1) | classes/k.ts:1250 (+8) | `heal_given` |
| `heal_in` | a unit is about to be healed (the amount may change) | `t`, `by`, `n`, `kind` | effects/damage.ts:130 | classes/k.ts:1410 (+6) | `heal` |
| `shield_grant` | a shield is about to be given (the amount may change) | `t`, `by`, `n`, `layer`, `kind` | effects/damage.ts:154 | classes/i.ts:1289 (+7) | `shield` |
| `reaction_window` | a unit may react (an opportunity strike, an Overwatch, an answer, a Call): items may cancel it | `reactor`, `mover`, `kind`, `id`, `spend`, `cancel`, `at` | tactics.ts:146 | classes/i.ts:253 (+5) |  |
| `reaction` | a reaction is being made (tactics.ts react(), rules 1.28): {u, kind (attack, move, protect), event, payer}; it fires before the reaction resolves | `u`, `kind`, `event`, `payer` | tactics.ts:150 | none | `reaction` |
| `enemy_action_start` | an enemy is about to act (an item may open a window or make it skip) | `u`, `step`, `skip` | combat.ts:2584 | calls/rules.ts:81 (+6) |  |
| `sight_change` | after a move, the units each side stopped or started seeing (only computed while someone listens) | `side`, `lost`, `gained` | combat.ts:1811 | perks/c.ts:508 |  |
| `sees` | a side's sight of a unit is decided: items may make it seen or unseen | `side`, `t`, `by`, `seen`, `sensed` | combat.ts:994 | calls/rules.ts:85 (+4) |  |
| `object_destroyed` | an object on the grid was destroyed | `obj`, `by` | classes/k.ts:926 (+1) | deeds.ts:179 (+3) |  |
| `reload` | a reload is made (its AP, the hand, tactical or speed) | `u`, `ap`, `special`, `both`, `tactical`, `hand` | classes/i.ts:200 (+2) | classes/i.ts:220 (+3) | `reload` |
| `jam_clear` | a jam is being cleared (its AP, whether the heat is kept) | `u`, `ap`, `keepHeat`, `hand` | combat.ts:2498 (+2) | perks/c.ts:506 |  |
| `swap` | a weapon swap is priced (declared; the item ops trigger `swap` listens here) | `u`, `c`, `from`, `mod`, `ap` | game.ts:1882 | classes/k.ts:1161 (+1) | `swap` |
| `stood_up` | a prone unit stood up | `u` | combat.ts:2082 | none |  |
| `glyph_cost` | a Sigil glyph is priced: its AP, charge and Flux; also every preview | `u`, `word`, `ap`, `charge`, `flux`, `preview`, `tile`, `fail` | sigil.ts:75 | classes/i.ts:660 (+14) | `glyph_cost` |
| `evoke_cost` | an Evoke is priced: its AP and charge; also every preview | `u`, `pattern`, `ap`, `charge`, `preview`, `fail` | sigil.ts:623 | classes/i.ts:665 (+8) |  |
| `outburst_cost` | an Outburst Begin is priced: its MP, AP, range and Strain | `u`, `design`, `mp`, `ap`, `range`, `strain`, `hp`, `release`, `preview`, `classMove`, `fail`, `relMult`, `relAll`, `relNotes` | classes/i.ts:119 (+1) | classes/i.ts:860 (+16) |  |
| `outburst_begin` | an Outburst was begun (held at stage 0) | `u`, `design`, `hold`, `cost`, `hp`, `stage` | magic.ts:998 | classes/i.ts:1213 (+11) |  |
| `outburst_release` | an Outburst is being released: its multiplier may change | `u`, `design`, `stage`, `aim`, `wild`, `mult`, `form`, `tone`, `reaction`, `felt` | magic.ts:1408 | classes/i.ts:1266 (+12) |  |
| `outburst_after` | an Outburst was released and resolved (its area, targets and hits) | `u`, `design`, `held`, `stage`, `aim`, `mult`, `riderStage`, `form`, `tone`, `area`, `targets`, `hits`, `wild`, `reaction`, `felt` | magic.ts:1506 | classes/i.ts:1229 (+2) |  |
| `outburst_plan` | an Outburst's release is previewed (its stage, aim, area and targets) | `u`, `design`, `stage`, `mult`, `riderStage`, `aim`, `area`, `targets`, `affected`, `add`, `preview` | magic.ts:1809 | classes/i.ts:1217 |  |
| `acted` | a unit's own action (or a verb inside it, as Analyze) succeeded: {u, t, action, tile, toggles, mode}; the item ops trigger `acted` listens here (Classes 3.0 P2) | `u`, `t`, `action`, `tile`, `toggles`, `mode`, `ap`, `choice` | combat.ts:2464 | classes/j.ts:303 (+3) | `acted` |
| `combat_end` | the fight ends, after the fighters are written back to their characters | `won` | game.ts:1998 | classes/j.ts:410 (+15) | `combat_end` |
| `evoked` | a Sigil spell was Evoked (or fizzled), after it resolved | `u`, `pattern`, `spell`, `plan`, `targets`, `impact`, `fizzle`, `charge`, `ap`, `stay`, `zone`, `dealt` | sigil.ts:998 (+1) | classes/i.ts:666 (+6) |  |
| `release_cost` | an Outburst Release is priced: its AP and range | `u`, `design`, `ap`, `range`, `fail`, `preview`, `surge`, `mult`, `notes` | magic.ts:1121 (+2) | classes/i.ts:1259 (+3) |  |
| `outburst_hold` | a held Outburst swells at turn start: the Strain it adds may change | `u`, `strain` | magic.ts:1659 | perks/d.ts:385 |  |
| `outburst_pump` | an Outburst is Pumped (priced in preview, then done): its AP, free stages, the feeling | `u`, `design`, `stage`, `ap`, `free`, `capLeft`, `fail`, `preview`, `feeling`, `stages`, `note`, `mpMult`, `freeKind` | magic.ts:1037 (+2) | classes/i.ts:1181 (+2) |  |
| `strain_change` | a unit's Strain changed (from, to, why) | `u`, `from`, `to`, `why`, `limit` | classes/k.ts:1429 (+4) | perks/d.ts:816 |  |
| `held_turn_start` | a unit holding an Outburst starts its turn | `u`, `held` | magic.ts:1672 | none |  |
| `strain` | Strain is about to be added to a unit (the amount may change) | `u`, `n`, `why`, `limit` | magic.ts:884 | classes/k.ts:535 (+6) |  |
| `death_save` | a Downed unit rolls its death save: items may add to it | `u`, `add`, `die` | combat.ts:1570 | magic.ts:1865 (+1) |  |
| `injury` | an injury is about to be rolled on a unit (cancel, no daze, no halving) | `t`, `by`, `d`, `loc`, `side`, `cancel`, `noDaze`, `noHalve`, `why`, `called` | combat.ts:1477 | classes/i.ts:408 (+4) | `injury` |
| `unit_built` | a unit was built from its character (the area map rebuilds units every action) | `u`, `c`, `world` | game.ts:2524 | classes/i.ts:670 (+4) |  |
| `action_done` | a reducer action finished (any action, any unit) | `u`, `a`, `world` | game.ts:1618 (+2) | calls/rules.ts:80 (+15) |  |
| `stim_start` | a stim is about to be given (cancel with a reason) | `u`, `t`, `cancel`, `why` | combat.ts:2536 | perks/e.ts:863 |  |
| `volley_end` | a weapon action's shots are all resolved (a burst, an auto volley, a paired attack, a skill shot) | `u`, `mode`, `target`, `hits` | combat.ts:1901 (+6) | classes/rev3.ts:273 (+2) |  |
| `weapon_actions` | a unit's weapon actions are listed (declared; nothing emits it yet) |  | **never emitted** | none |  |
| `path_opts` | a walk's path options are opened by items (run, pass, jump, ignore difficult ground, known traps) | `u`, `runnable`, `pass`, `jump`, `ignoreDifficult` | combat.ts:788 | perks/a.ts:530 |  |
| `hide` | a unit became hidden | `u`, `why` | sigil.ts:51 (+1) | faith.ts:773 (+7) |  |
| `spot` | a unit tries to spot a hidden one: the die, the modifier, the TN, cancel | `by`, `u`, `die`, `mod`, `tn`, `cancel`, `close`, `outright` | tactics.ts:258 (+1) | classes/k.ts:123 (+8) | `spot` |
| `spotted` | a hidden unit was revealed | `u`, `why` | magic.ts:1437 (+2) | perks/b.ts:244 (+2) |  |
| `on_surrender` | a unit surrendered or was subdued | `t`, `by`, `why` | effects/damage.ts:106 (+2) | deeds.ts:193 (+5) |  |
| `parley` | a parley in a fight is attempted (its TN, a refusal, the result) | `u`, `t`, `kind`, `text`, `tnAdd`, `via`, `cancel`, `result` | tactics.ts:313 | perks/g.ts:207 |  |
| `throw` | a thrown item is about to land (its AP, radius, cancel, caught) | `u`, `item`, `tile`, `ap`, `radius`, `cancel`, `caughtBy`, `preview`, `technique` | physical/ranged/thrown.ts:86 (+1) | perks/c.ts:146 (+2) |  |
| `blessing_in` | a blessing reaches a unit: an item may handle it itself | `u`, `t`, `blessing`, `power`, `handled`, `out` | faith.ts:1069 (+1) | classes/k.ts:202 (+6) |  |
| `trap_sprung` | a trap was sprung on a unit | `u`, `obj` | combat.ts:1982 | classes/rev3.ts:341 |  |
| `blast_landed` | a blast landed on a tile (who made it, the radius, who was in it) | `by`, `tile`, `item`, `radius`, `who` | tactics.ts:352 | physical/ranged/thrown.ts:163 |  |
| `glyphs_per_tile` | how many glyphs a tile may hold for this caster | `u`, `tile`, `n` | sigil.ts:82 | classes/k.ts:359 |  |
| `evoke_area` | a spell's area is being built (its depth may change) | `u`, `spell`, `pattern`, `depth` | sigil.ts:262 | none |  |
| `spell_mult` | a Sigil spell's damage, healing or shield multiplier for one target | `u`, `t`, `spell`, `kind`, `mult` | sigil.ts:451 (+1) | none |  |
| `glyph_drawn` | a Sigil glyph was drawn | `u`, `glyph` | classes/k.ts:353 (+2) | classes/j.ts:776 (+5) |  |
| `spell_fizzle` | a Sigil spell fizzled | `u`, `pattern`, `spell` | sigil.ts:997 | none |  |
| `sigil_placed` | a Sigil field, trap or turret was placed on the grid | `u`, `zone` | sigil.ts:1153 (+2) | none |  |
| `sigil_trap_sprung` | a Sigil trap was sprung by a unit | `u`, `trap`, `owner` | sigil.ts:1224 | none |  |
| `turret_shot` | a Sigil turret fired at a unit | `turret`, `owner`, `target` | sigil.ts:1250 | none |  |
| `spell_shape` | a spell is compiled from its words (items may change its shape) | `u`, `pattern`, `spell`, `opts` | sigil.ts:616 | classes/i.ts:743 |  |
| `ground_cap` | how many Sigil words a caster may keep on the ground at once | `u`, `n` | sigil.ts:87 | perks/d.ts:78 |  |
| `check_build` | a story check is being built (items add tags or flags) | `c`, `ck` | game.ts:1350 | perks/a.ts:161 (+9) |  |
| `check_mod` | a story check's modifiers and TN are gathered | `c`, `ck`, `tags`, `add`, `tn` | game.ts:1087 | classes/k.ts:234 (+18) |  |
| `check_post` | a story check's d20 was rolled: items may change the result or forbid the fumble | `c`, `ck`, `die`, `mod`, `tn`, `auto`, `labels`, `noFumble` | game.ts:1093 | perks/a.ts:162 (+13) |  |
| `check_result` | a story check is decided | `c`, `ck`, `roll` | game.ts:1104 | classes/j.ts:304 (+14) |  |
| `passive` | a passive score is read (declared; asked as stat passive:<skill>, not emitted) |  | **never emitted** | none |  |
| `voice_cap` | how many voice lines a player gets this beat | `player`, `c`, `chars`, `cap` | game.ts:1333 | perks/g.ts:614 |  |
| `ask_limit` | how many times a skill may be Asked this scene | `c`, `skill`, `limit` | game.ts:726 | perks/g.ts:615 |  |
| `overreach_cost` | the Echo price of resisting an Overreach | `c`, `skill`, `cost` | game.ts:740 | perks/g.ts:616 |  |
| `echo_gain` | a character gained Echo | `c`, `n`, `why`, `cap` | effects/echo.ts:10 | none |  |
| `scene_change` | the Narrator opened a new scene | `n`, `title` | game.ts:1316 | feelings.ts:218 (+12) |  |
| `session_start` | a session started (or a late player joined one) | `n`, `late` | game.ts:611 (+1) | faith.ts:1608 (+15) |  |
| `rest` | a rest is taken: HP and MP multipliers per character | `kind`, `chars`, `settlement`, `hpMult`, `mult` | game.ts:1173 | perks/a.ts:429 (+8) |  |
| `xp_grant` | XP is about to be granted (the amount may change) | `c`, `source`, `amount` | game.ts:1290 | perks/e.ts:853 (+1) |  |
| `notice` | an NPC on the area map may notice a character (its range) | `c`, `npc`, `range`, `dark`, `ignore` | game.ts:2538 | perks/a.ts:382 (+5) |  |
| `stay_hidden` | a character tries to stay hidden from an NPC: modifier and TN | `c`, `npc`, `mod`, `tn` | game.ts:2549 | perks/a.ts:383 (+5) |  |
| `world_move_cost` | a move on the area map is priced (sneaking costs extra) | `c`, `u`, `tiles`, `how`, `extra`, `preview` | actions.ts:217 (+1) | perks/b.ts:232 (+1) |  |
| `karma_award` | Karma is about to be awarded (its multiplier) | `c`, `amount`, `unlawful`, `mult`, `why` | game.ts:1154 | perks/f.ts:714 (+3) |  |
| `action_refuse` | an item may refuse an action before it is done (a shove, an Overwatch) | `u`, `a`, `fail` | game.ts:2730 | perks/e.ts:994 (+1) |  |
| `evoke_reach` | how far from its Line a caster may Evoke | `u`, `pattern`, `reach` | sigil.ts:590 (+1) | classes/k.ts:792 |  |
| `spell_roll` | a spell's to-hit d20 was rolled: items may add to it | `u`, `t`, `die`, `add`, `kind` | magic.ts:1292 (+1) | feelings.ts:178 (+1) |  |
| `tie_end` | a tie between two units ended (kit.ts untie, Classes 3.0 P8) {cb, tie, unmake}: unmake when its kind says the far end is unmade (owned.ts) | `tie`, `unmake` | kit.ts:221 | owned.ts:231 |  |
| `to_hit` | THE hook of every roll to hit a target (rolls.ts toHitTerms): a weapon attack, a Sigil, an Outburst {att, tgt, type, mode, terms, preview}: a listener adds to-hit terms | `att`, `tgt`, `type`, `mode`, `terms`, `preview` | rolls.ts:175 | none | `to_hit` |
| `session_heal` | the heal at a session's start: HP and MP multipliers | `mult` | game.ts:1191 | perks/h.ts:415 |  |
| `story_blessing` | a prayer is answered outside a fight (lines to add) | `c`, `lines` | faith.ts:1551 | perks/d.ts:715 |  |
| `ap_gift` | a unit is about to receive AP from another (the receiver may refuse) | `t`, `from`, `n`, `cancel`, `why` | effects/ap.ts:77 | perks/f.ts:732 |  |
| `npc_moved` | an NPC moved on the area map | `npc`, `from`, `to`, `hid` | game.ts:2340 | perks/b.ts:297 |  |
| `npc_sense` | an NPC senses something on the area map (it may reveal someone) | `npc`, `why`, `reveal` | game.ts:2346 | perks/b.ts:352 (+2) |  |
| `zone_enter` | the party entered a new zone of the area map | `zone` | game.ts:1413 | perks/d.ts:713 |  |
| `story_harm` | a character takes damage outside a fight (the amount may change) | `c`, `dmg`, `type` | game.ts:2045 | none |  |
| `stay_hidden_result` | staying hidden was rolled: items may change the result | `c`, `npc`, `ok`, `die`, `auto`, `labels` | game.ts:2554 | perks/b.ts:607 (+2) |  |
| `ruling_answered` | the Narrator answered a pending ruling (accepted or refused) | `r`, `accepted`, `c` | game.ts:1309 | perks/f.ts:223 (+8) |  |
| `braced` | a Defender's Brace landed | `u` | classes/i.ts:374 | classes/j.ts:1135 (+1) |  |
| `protect_act` | a unit protected another (a Brace or an Interpose: the patrons' protect tag) | `u`, `how`, `t` | combat.ts:2106 (+1) | faith.ts:771 |  |
| `plate_spent` | Guard was spent on a plate (Adamantile Plate's ally shield) | `u`, `k` | classes/i.ts:465 | classes/j.ts:1186 |  |
| `round_ap` | a character's AP for a round on the area map is counted | `c`, `ap`, `lines` | game.ts:2283 | perks/a.ts:566 (+2) |  |
| `world_round_start` | a new round begins on the area map | `n` | game.ts:2281 | classes/i.ts:812 (+5) |  |
| `story_cond_apply` | a condition is about to be put on a character outside a fight (cancel with a reason) | `c`, `id`, `scope`, `cancel`, `why` | game.ts:1215 | perks/a.ts:165 (+2) |  |
| `gift` | a gift was given (the patrons' supply tag) |  | **never emitted** | faith.ts:774 |  |
| `vent` | a Vent is made: the Flux it puts into the air may change | `u`, `flux`, `extra` | magic.ts:638 | classes/rev3.ts:369 |  |
| `ai_move_risk` | an enemy's walk is scored for risk by items (the AI avoids it) | `u`, `from`, `to`, `risk` | combat.ts:2798 | classes/rev3.ts:137 |  |
| `cond_resisted` | a condition's save was passed | `by`, `t`, `id` | magic.ts:348 | feelings.ts:188 |  |
| `call` | a Call is about to be made (its step, TN, a refusal) | `u`, `t`, `id`, `kind`, `step`, `react`, `tnAdd`, `cancel` | calls/core.ts:136 | none |  |
| `call_cost` | a Call is priced (its AP) | `u`, `id`, `ap`, `react`, `preview` | calls/core.ts:47 | none |  |
| `cost` | every priced action: its AP, its resources, its floor, free (effects/cost.ts price) | `u`, `c`, `action`, `row`, `base`, `ap`, `res`, `min`, `free`, `labels` | effects/cost.ts:134 (+1) | none | `cost` |

## (c) The primitives

One door per concept (`docs/ENGINE-GUIDE.md` section 1, rule 1). Every export of each primitive's file, its signature, and the first sentence of the doc comment above it.

### Output profiles and the Level table (`data/rules.json` `output`)

amount = (base + flat) x Stat x Level x own multipliers x (1 + target bonuses, capped at +100%); dealt = max(1, floor(amount) - armour); healing and shields go to their sinks

| profile | k | attr | skill | level | pair | shape |
| --- | --- | --- | --- | --- | --- | --- |
| `physical` | 1 | 0.1 | 0.05 |  | physical |  |
| `weapon` | 1.5 | 0 | 0 | deal | weapon | aimed |
| `sigil` | 1.7 | 0 | 0 | deal | sigil | aimed |
| `elemental` | 1 | 0 | 0 |  | elemental | aimed |
| `soul` | 1.55 | 0 | 0 | deal | soul | aimed |
| `blessing` | 0.956 | 0.06 | 0.06 |  | blessing | landed |
| `healing` | 1.392 | 0.06 | 0.06 |  | healing | landed |
| `mend` | 1.392 | 0.06 | 0.06 | mend | healing | landed |
| `sigil_mend` | 1.17 | 0.06 | 0.06 | mend | sigil | landed |
| `soul_mend` | 1.296 | 0.06 | 0.06 | mend | soul | landed |
| `blessing_mend` | 1.44 | 0.06 | 0.06 | mend | blessing | landed |
| `flat` | 1 | 0 | 0 | deal |  | flat |
| `figment` | 1.5 | 0 | 0 | deal | elemental | aimed |
| `repair` | 1.392 | 0.06 | 0.06 | mend | repair | landed |
| `tend` | 1.573 | 0.06 | 0.06 | mend | healing | landed |

Level tables: `deal` (20 levels). Systems with a dial (`output.systems`): `sigil_damage`, `sigil_boon`, `outburst_damage`, `outburst_heal`, `outburst_shield`, `prayer_damage`, `prayer_mend`, `kit`, `magic_heal`. Rule-owned amount blocks (`output.amounts`, key `rule:<name>`): `flux_overload`, `school_rider`.

An `amounts` block (on any item; `data/CONVENTIONS.md` "Amount blocks") uses the fields: `kind`, `base`, `profile`, `type`, `provisional`, `text`, `per`, `armour`, `heal_kind`, `element`, `mults`.

### Cost sites (41) and priced actions

`COST_SITE_IDS` (`effects/stats.ts`): every action whose AP items may change, priced with `price({cb, u}, site)`, answered by a data `action_cost` effect or the stat `ap_cost:<site>`:
`analyze`, `break`, `clear_jam`, `crystallise`, `disengage`, `escape`, `extinguish`, `field_repair`, `hide`, `parley`, `pray`, `recover`, `reload`, `reload_both`, `set_explosive`, `shove`, `sprint`, `stabilise`, `stim`, `stim_throw`, `swap_core`, `throw`, `triage`, `vent`, `ward`, `whisper`, `picture`, `attempt`, `brace`, `door`, `feed`, `load`, `overwatch`, `pickup`, `prone`, `pull_free`, `scuff`, `search`, `song`, `steady`, `syphon`.

| data/actions.json `costs` | fields |
| --- | --- |
| `brace` | ap: 1 |
| `load` | ap: 1, rounds: 5 |
| `clear_jam` | ap: 2, rule: clear_jam |
| `field_repair` | ap: 2 |
| `reload` | ap: 2, ap_quick_release: 1, rule: reload |
| `parley` | ap: 2 |
| `throw` | ap: 2, rule: throw |
| `attempt` | ap: 1 |
| `evoke` | ap: 1 |
| `scuff` | ap: 1 |
| `vent` | ap: 1, rule: vent |
| `swap_core` | ap: 2 |
| `syphon` | ap: 1, rule: syphon |
| `crystallise` | ap: 3, rule: crystallise |
| `interact` | ap: 1, rule: interact |
| `picture` | ap: 2, provisional: True, source: rules 1.34 (Figments) |
| `let_go` | ap: 0, provisional: True, source: rules 1.34 (Figments) |
| `figment_strike` | ap: 2, provisional: True, source: rules 1.34 (Figments) |
| `figment_pounce` | ap: 3, provisional: True, source: rules 1.34 (Figments) |
| `figment_cut` | ap: 2, provisional: True, source: rules 1.34 (Figments) |
| `figment_stare` | ap: 1, provisional: True, source: rules 1.34 (Figments) |

Resources (`data/actions.json` `resources`; paid by `pay` / `spend`, named in an action's `res`):

| resource | name | on | path |
| --- | --- | --- | --- |
| `mp` | MP | unit | mg.mp |
| `charge` | charge | unit | mg.charge |
| `cores` | spare cores | unit | mg.cores |
| `momentum` | Momentum | unit | res.momentum |
| `guard` | Guard | unit | res.guard |
| `supplies` | Supplies | unit | res.supplies |
| `toxins` | toxins | unit | res.toxins |
| `parts` | spare parts | unit | parts |
| `stims` | stims | character | stims |
| `echo` | Echo | character | echo |
| `pressure` | Pressure | unit | pressure |
| `vcharge` | Visualizer charge | unit | mg.vcharge |
| `shadow` | Shadow | unit | res.shadow |
| `ledger` | Ledger | unit | res.ledger |

### Stat ids (47 plain, 9 families; `effects/stats.ts`)

Asked with `statQuery(x, id)`, answered by an item's `stat:` or a data `stat_mod`. A new id is a line in `STATS`.

| stat | what it is |
| --- | --- |
| `hp` | Max HP (character.ts maxHp) |
| `hp_per_level` | HP gained a level (hpPerLevel) |
| `mp_max` | Max MP |
| `move` | Movement, tiles per AP |
| `defense` | Defense |
| `init` | Initiative bonus |
| `carry` | Carry weight |
| `injury_resist` | Injury resistance, % |
| `crit_damage` | Critical damage multiplier |
| `crit_taken` | Critical damage taken |
| `counter` | Counter chance |
| `ambush_mult` | Ambush damage multiplier |
| `ambush_taken` | Ambush damage taken |
| `elemental_taken` | Elemental damage taken |
| `heal_received` | Healing received multiplier |
| `shield_received` | Shields received multiplier |
| `mult_heal_given` | Healing given multiplier |
| `mult_physical` | Physical damage multiplier |
| `blessing_power` | Blessing power (faith.ts) |
| `max_sigil_words` | Sigil words known at once |
| `glyph_ap` | AP a glyph costs to draw |
| `module_slots` | Outburst module slots |
| `ready_designs` | Outburst designs readied |
| `free_pumps` | Free Pumps a fight |
| `soul_range` | Outburst reach |
| `strain_limit` | Strain limit |
| `throw_range` | Throw range |
| `armor` | Armour value (combat.ts unit build) |
| `attack` | Attack bonus (combat.ts unit build) |
| `vision` | Vision in tiles |
| `death_save` | A Downed unit's death save |
| `heat_limit` | A gun's Heat limit |
| `never_jams` | The main-hand gun never jams (>0) |
| `hide_weapon_skill` | Hide a weapon's own skill from the pad (>0) |
| `field_repair_amount` | Durability a Field Repair restores |
| `reactions` | Reactions a round |
| `rider_stage` | Outburst rider stage bonus |
| `push_tiles` | Extra tiles a technique pushes |
| `shove_guard` | Guard gained when a Shove moves its target |
| `prey_lock` | Defender's Prey Lock holds (>0) |
| `hymn_wait` | Rounds between Hymns |
| `intervention_keeps_witnessed` | How many of a fight's first interventions do not end Witnessed (>0; faith.ts intervene, Classes 3.0: the Chaplain, rule 11: the first) |
| `patron_presence` | While Witnessed, the patron stands at this unit's side: its interventions reach further and land on a Judged enemy of its first (>0; faith.ts presenceOf) |
| `always_seen` | The other side sees this unit wherever it is (>0; tactics.ts sightOf, Classes 3.0 P7: Traced, a Figment's Stare) |
| `figment_designs` | Figment designs kept ready beyond the door's ladder (figments.ts designsMax; the Rigger +1) |
| `equip_ban` | This weapon or mod may not be equipped (>0) |
| `one_hand_heavy` | Heavy weapons in one hand (>0) |
| `ap_cost:<…>` | the AP of an action: a CostSite (effects/core.ts actionAp) |
| `skill:<…>` | a modifier to a d20 that uses this skill id (effects/core.ts skillRollMod) |
| `immune:<…>` | immunity to a condition id or one of IMMUNE_IDS (effects/core.ts immune; >0 is immune) |
| `save_<…>` | a save bonus: body, brain or heart (character.ts saveBonus) |
| `ties_max:<…>` | Classes 3.0 P8: how many ties of this kind a unit may hold more than its kind's max (kit.ts tieCap) |
| `ties_keep:<…>` | Rules 1.33: >0, the ties of this kind the unit holds to its own side do not end when it goes Down (kit.ts; Empathy 10: ally Bonds hold) |
| `passive:<…>` | a passive score of this skill id (character.ts passive) |
| `technique:<…>` | this technique id comes with a perk (>0; physical/core.ts) |
| `momentum_needed:<…>` | Momentum a finisher of this technique id needs (physical/core.ts finisherNeed) |

`immune(x, what)` is also asked about: `bleed`, `knockback`, `opportunity_attack`, `shove` (`IMMUNE_IDS`).

### The condition table (`data/conditions.json`, 94 rows; loader `condtable.ts`)

A condition is a row; these are the fields rows use (how many rows use each):
`id` (94), `amounts` (7), `name` (94), `kind` (94), `family` (94), `save` (94), `engine` (94), `text` (94), `effects` (94), `duration` (94), `ends_on` (94), `stacks` (94), `adjudication` (94), `save_note` (1), `provisional` (65), `aliases` (2), `key` (2), `label` (49), `boon` (39), `notes` (1), `source` (59), `engine_state` (3), `params` (1), `set_by` (46).
Families: `body`, `brain`, `heart`.

#### The item-ops runner (`effects/triggers.ts`)

| name | signature or shape | what for |
| --- | --- | --- |
| `Trigger` | `interface Trigger { hook, phase, actor, target, self, about }` | A trigger: the hook it listens on (and the hook's phase), who the event's ACTOR and TARGET are, and whose event it is by default (`self`): unless `if` names that role (`if.target` for a trigger whose `self` is… |
| `TRIGGERS` | `TRIGGERS: Record<string, Trigger>` | The closed list. |
| `Ev` | `interface Ev { ctx, trig, h, self, cb, actor, target, preview }` | ============================================================================================== the event |
| `PREDICATES` | `PREDICATES: Record<string, { about: string; arg: 'rel' \| 'number' \| 'bool' \| 'ids' \| 'words' \| 'string' \| 'zone' \| 'tie' \| 'hold' \| 'skill' \| 'limit'; test: (ev: Ev, v:…` | The closed list of `if` keys. |
| `setAnsweredDoor` | `setAnsweredDoor(f: typeof ANSWERED)` | faith.ts sets the door the predicate `answered` asks (prayerAnswered: Classes 3.0 step 5, the Chaplain). |
| `sourceOf` | `sourceOf(ev: Ev, of: string): number` | THE source reader of a number block's `of` (and an amount block's per-point parts) in an item op: res:<id>, event:<field> (amount: the damage or heal, on `dealing` its base before the multipliers; over: a heal… |
| `SOURCE_SPACES` | `SOURCE_SPACES` | The namespaces a number block's `of` may name in an item op. |
| `TriggerOp` | `interface TriggerOp { on, state, about, fields, run }` | The closed list of ops a triggered effect may run, with the triggers each one understands. |
| `OPS` | `OPS: Record<string, TriggerOp>` | THE OPS: filled by O(...) below, one line each (data/effect_ops.json item_ops.ops is written from it). |
| `INCOMING` | `INCOMING` | The value of op `condition` that names the condition being put on (on cond_incoming: Take the Weight's "you take it instead"; rev4-primitives.md batch row `condition: "incoming"`). |
| `TargetSet` | `interface TargetSet { of, side, within, shape, seen, alive, downed, max, sees, tied, aims_at, beyond }` | `targets` on any op (Classes 3.0 P5): the op runs once for each unit of the set, as its target, in the fight's order (kit.ts unitsIn). |
| `TARGET_FIELDS` | `TARGET_FIELDS: Record<string, string[] \| 'number' \| 'bool' \| 'string'>` | The fields of `targets` and the words each takes (data/effect_ops.json item_ops.targets is written from it). |
| `targetsProblem` | `targetsProblem(t: any): string \| null` | Why a `targets` block is malformed (null: it is fine). |
| `auraProblem` | `auraProblem(e: any): string \| null` | Why a standing aura is malformed (null: fine): a well-formed set, centred on its holder, of a declared stat. |
| `selectUnits` | `selectUnits(ev: Ev, t: TargetSet): Unit[]` | THE unit set of an op's `targets` for this event (see TargetSet). |
| `LIMIT_SCOPES` | `LIMIT_SCOPES` | `limit`: { per: a scope of effects/uses.ts (per_turn, per_round, per_combat, per_scene, per_session, per_rest), n, key? (a second counter on the same item: "<item key>#<key>"), each?: "target" \| "actor" (a cou… |
| `isTriggered` | `isTriggered(e: any): boolean` | Is this effect a triggered one (its `when` names a trigger)? |
| `triggerProblem` | `triggerProblem(e: any): string \| null` | Why a triggered effect can't run (null: it can): the op is unknown or doesn't take this trigger, a predicate is unknown, the limit is malformed. tools/validate.py says the same in Python. |
| `runTriggered` | `runTriggered(ctx: any, h: Holder, e: any): void` | Run one triggered effect on its hook's payload, for one holder. |
| `DELAY_UNTIL` | `DELAY_UNTIL` | When a delayed op runs: at the start of the target's next turn, of the holder's next turn, or after n rounds. |
| `Delayed` | `interface Delayed { key, holder, actor, target, op, label, until, n, round }` | A queued op (cb.delayed; saved with the fight). |
| `triggerHook` | `triggerHook(e: any): HookName \| null` | The hooks any data effect listens on (hooks.ts hookUsed asks, so a hook that is skipped when nobody listens, the `cost` hook, still fires for a data item). |

#### The damage, heal and shield formula (`effects/output.ts`)

| name | signature or shape | what for |
| --- | --- | --- |
| `Term` | `interface Term { v, label }` | ---------------------------------------------------------------------------------------------- the data |
| `Profile` | `interface Profile { k, attr, skill, level, pair, floor, min_pct }` | A damage, heal or shield profile (data/rules.json output.profiles): the slopes of its Stat term and the Level column it reads. |
| `Pair` | `interface Pair { attrs, skills }` | The Attributes and Skills a Stat term reads (data/rules.json output.pairs). |
| `PROFILES` | `PROFILES: Record<string, Profile>` | The profiles (data/rules.json output.profiles). |
| `PAIRS` | `PAIRS: Record<string, Pair>` | The pairs (data/rules.json output.pairs): which Attributes and Skills a Stat term reads. |
| `profileOf` | `profileOf(id: string \| null \| undefined): Profile` | The profile of this id (data/rules.json output.profiles); an unknown or absent id is the flat profile (no Stat, no Level term). |
| `factorOf` | `factorOf(name: string): number` | Rules 1.26 (the re-fit): a system's own named multiplier (data/rules.json output.factors: melee, thrown). |
| `pairOf` | `pairOf(id: string \| null \| undefined): Pair` | The pair a profile reads: its own id in output.pairs, else the profile's default pair, else none. |
| `statTerm` | `statTerm(profile: string \| Profile, attrs: number[], skills: number[]): number` | The Stat term of a profile for these Attribute and Skill values: 1 + Σ attr × (Attribute − 1) + Σ skill × Skill. |
| `normalShareTerm` | `normalShareTerm(p: Profile, nAttrs: number, nSkills: number): number` | Rules 1.27: the bracket of a profile's Stat term (before k) for a normal share: output.floor_reference in each of its pair's Attributes and Skills. |
| `statOf` | `statOf(profile: string, c: Pick<Character, 'attrs' \| 'skills'>, pair: Pair = pairOf(profile)): number` | The Stat term of a profile for a character, read from its sheet with the profile's pair (or the pair given). |
| `levelFactor` | `levelFactor(column: 'deal' \| 'mend' \| null \| undefined, level: number \| null \| undefined): number` | The Level term (data/rules.json output.level). |
| `levelOf` | `levelOf(profile: string \| null \| undefined, level: number \| null \| undefined): number` | The Level term of a profile for a level. |
| `VS_CAP` | `VS_CAP` | Target-specific damage bonuses stack additively and are capped at ×2.0 in all (plan 6a-1, provisional): True Name, Judgement Day, Case Closed, Weak Point, Deliver the Sinner, Holy Ordnance, Moon Hunter, Humani… |
| `stackDamage` | `stackDamage(mults: Term[], vs: Term[]): { mult: number; vsMult: number; total: number }` | The one stacking rule: own multipliers multiply; target bonuses add, are held between −90% and +100%, and multiply once. |
| `AmountKind` | `type AmountKind = 'damage' \| 'heal' \| 'shield'` | ---------------------------------------------------------------------------------------------- the amount |
| `ArmourKind` | `type ArmourKind = 'full' \| 'half' \| 'none'` | How a source meets armour: in full, at half (rounded down), or not at all. |
| `AmountSpec` | `interface AmountSpec { kind, base, per, profile, pair, plus, round, provisional, min_pct, gate_hp }` | One amount before the formula: its kind, base, per-point parts, profile and rounding (an item's `amounts` block becomes one). |
| `AmountCtx` | `interface AmountCtx { who, stat, level, counts, flat, mults, vs }` | Who makes an amount and how: the dealer's sheet or Stat term, level, armour rule, and whether the damage_out hook fires. |
| `Amount` | `interface Amount { spec, base, add, mults, vs, plus, plusAt }` | An amount being built: the Stat and Level terms are already in `mults` (first), a hook may add to add, mults and vs. |
| `term` | `term(v: number, label: string): Term` | A named multiplier for an amount's `mults` (a term of exactly ×1 is dropped when the amount is opened). |
| `openAmount` | `openAmount(spec: AmountSpec, by: Unit \| null, ctx: AmountCtx = {}): Amount` | Open an amount: the base with its per-point parts, then the Stat term and the Level term as the first multipliers (a term of exactly ×1 is not listed, as everywhere). |
| `closeAmount` | `closeAmount(a: Amount): { raw: number; amount: number; mult: number; vsMult: number; total: number }` | Close an amount: the base (with what items added; never under 0) times each multiplier in turn, then the bonus against this target (the stacking rule). |
| `amountOf` | `amountOf(spec: AmountSpec, by: Unit \| null, ctx: AmountCtx = {}): { amount: number; raw: number; terms: Term[]; vs: Term[] }` | The amount of a source in one call (no hook in between): what it produces before armour or the receiver's multipliers, with every term named. |
| `armourAgainst` | `armourAgainst(target: Unit, kind: ArmourKind = 'full', o: { mult?: number; pierce?: number; ignore?: boolean } = {}): number` | The armour a hit meets on this target: THE ONLY PLACE ARMOUR IS READ FOR DAMAGE. kind 'full' (a weapon, Sigil and physical damage, a blast, a trap, a hazard that says so), 'half' (Elemental: half, rounded down… |
| `landed` | `landed(amount: number, armour: number): number` | What lands of an amount after armour: never under 1 (armour does not stop a hit outright). |
| `DealSpec` | `interface DealSpec { kind, armour, hook }` | ---------------------------------------------------------------------------------------------- the one way in |
| `DealCtx` | `interface DealCtx { src, hookCtx, pierce, ignoreArmour, armourMult }` | What deal() is told besides the amount: the source for the sink, the hook's context, armour piercing. |
| `DealResult` | `interface DealResult { produced, armour, sent }` | What deal() did: the amount made, the armour it met, what reached the sink, and the sink's own result. |
| `deal` | `deal(cb: Combat \| null, by: Unit \| null, target: Unit, spec: DealSpec, ctx: DealCtx): DealResult` | Deal damage: the amount (amountOf, with the 'damage_out' hook between its two halves when spec.hook), the armour (armourAgainst), the sink (applyDamage). |
| `MEND_GATE` | `MEND_GATE: { hp: number \| null; cap_pct: number \| null }` | The data's gate and cap (data/rules.json mending.gate.hp, mending.cap_pct; absent: none). |
| `mendGate` | `mendGate(spec: AmountSpec, target: Unit): number` | The gate of a heal or shield on this target: its least amount before the own multipliers (0: no gate). |
| `mend` | `mend(cb: Combat \| null, by: Unit \| null, target: Unit, spec: AmountSpec & { kind: 'heal' \| 'shield' }, ctx: AmountCtx & { /** the heal's kind for 'heal_in' (stim, sigil,…` | Give healing or a shield: the amount (amountOf), then the heal sink or the shield sink (which apply the receiver's multiplier and their hooks). |

#### The damage, heal and shield sinks (called by deal and mend) (`effects/damage.ts`)

| name | signature or shape | what for |
| --- | --- | --- |
| `DamageSrc` | `interface DamageSrc { by, redirected, type, melee, ranged, crit, explosive, ambush, shared, shield, downedFails, credit, mode, weapon, dmgType, nonlethal, ammo }` | Where a blow comes from: who, its type and damage type, whether it meets shields, who gets the kill credit. |
| `DamageResult` | `interface DamageResult { dealt, shielded, killed, downedHit, prevented, amount }` | What applyDamage did: HP dealt, the shield's share, a kill, a Down, prevented, the amount the log reports. |
| `hostileSrc` | `hostileSrc(t: Unit, src: DamageSrc)` | Is the damage from someone on the other side of the unit it hits? |
| `pastShields` | `pastShields(src: { type?: string; dmgType?: string }): boolean` | Does this source go past shields (pastShields: true damage and damage over time)? |
| `applyDamage` | `applyDamage(cb: Combat \| null, t: Unit, dmg: number, src: DamageSrc): DamageResult` | Take damage (already past armour) off a unit's HP. |
| `healUnit` | `healUnit(cb: Combat \| null, t: Unit, n: number, by: Unit \| null, kind: string, _o: { /** (rules 1.20's round limit is withdrawn, rules 1.23: nothing reads this) */ noLim…` | Healing a unit through the hooks: 'heal_in' {t, by, n, kind} may change n, then HP; 'heal_given' after. |
| `grantShield` | `grantShield(cb: Combat \| null, t: Unit, n: number, by: Unit \| null, o: boolean \| ShieldOpts = false): number` | Give a shield through the hooks ('shield_grant' {by, t, n, layer, kind} may change n). |

#### Amount blocks (`effects/amounts.ts`)

| name | signature or shape | what for |
| --- | --- | --- |
| `AmountBlock` | `interface AmountBlock { kind, base, per, profile, type, armour, mults, provisional, text, element, heal_kind, min_pct, gate_hp }` | An item's `amounts` block as data writes it (data/CONVENTIONS.md "Amount blocks"): kind, base, per, profile, type, armour, mults. |
| `amountHome` | `amountHome(key: string): any \| null` | The data object a key names (see the head of this file), or null. |
| `amountBlock` | `amountBlock(key: string, name: string): AmountBlock` | An item's amount block by name. |
| `amountSpecOf` | `amountSpecOf(key: string, name: string): AmountSpec` | The block as the formula's spec (chain order; left raw: the sink floors it, as these sites always did). |
| `itemAmount` | `itemAmount(key: string, name: string, own: Term[] = [], counts?: Record<string, number>): number` | THE ONE HELPER: an item's amount from its data block, × the multipliers the caller names (in that order: the Stat term from the unit first where the item has one). |
| `NumberBlock` | `interface NumberBlock { base, per, min, max, steps }` | A NUMBER BLOCK (Classes 3.0 P3, docs/design/rev4-primitives.md): any numeric field of an item op (and a number a handler reads from its data) may be a plain number or { "base": 1, "per": [{ "of": "res:shadow",… |
| `isNumberBlock` | `isNumberBlock(x: any): x is NumberBlock` | Is this a number block (and not an amount block, which has a `kind`)? |
| `numberOf` | `numberOf(x: number \| NumberBlock, src: (of: string) => number = () => 0): number` | A number block's value (a plain number is itself): base + Σ value × source(of), between min and max. |
| `amountMult` | `amountMult(key: string, name: string, mult: string): number` | One of a block's own named multipliers (data `mults`). |

#### Prices, payments and refunds (`effects/cost.ts`)

| name | signature or shape | what for |
| --- | --- | --- |
| `Cost` | `interface Cost { ap, res }` | What an action costs before anyone changes it. |
| `Priced` | `interface Priced { action, ap, res, labels, free }` | An action priced for one unit: what pay() takes. |
| `costOf` | `costOf(action: string, field = 'ap'): number` | The data's number for an action (`ap`, or another field: 'ap_downed', 'ap_lowered', 'extra_ap'…). |
| `hasCost` | `hasCost(action: string, field = 'ap'): boolean` | Does data/actions.json give this action a number in this field (default `ap`)? |
| `actionName` | `actionName(action: string): string` | THE name of a priced action: its cost site. |
| `RESOURCES` | `RESOURCES: Record<string, ResDef>` | Every resource an action can cost (data/actions.json `resources`). |
| `resLeft` | `resLeft(u: Unit \| null \| undefined, id: string, c?: Character \| null): number` | How much of a resource the unit has now (0 when it has no such thing: no Evoker, no class meter). |
| `setResSetter` | `setResSetter(name: string, fn: ResSetter): void` | Register a resource row's setter (data/actions.json resources.<id>.setter): the system that owns the meter gives it (physical/pressure.ts: addPressureTo). |
| `resGive` | `resGive(cb: Combat \| null \| undefined, u: Unit, id: string, n: number, o: { by?: Unit \| null; c?: Character \| null; why?: string } = {}): number` | GIVE (or with a negative n take) a resource of data/actions.json `resources` to a unit outside an action's price (the item op `resource`): through its row's setter, else its path, never under 0 nor over its `m… |
| `price` | `price(x: Who, action: string, base?: number \| Cost \| null, ctx: Record<string, unknown> = {}): Priced` | What `action` costs this unit now. base: its AP (or `{ ap, res }`) before items; left out, the data's (data/actions.json). ctx: what the action knows that an item may ask about (the hand, the target, the word). |
| `priced` | `priced(x: Who, action: string, ap: number, res?: Record<string, number>, ctx?: Record<string, unknown>): Priced` | An action whose AP its own pipeline has already worked out (an attack's preview, a glyph's, an Outburst's): the number as a Priced, through the `cost` hook like every other. |
| `bill` | `bill(action: string, ap: number, res: Record<string, number> = {}): Priced` | A cost that is already final (its pipeline priced it, hook and all): what pay() takes. |
| `encoreKey` | `encoreKey(a: any): string \| null` | Encore's key for an action: its type and what it is (a perk's id, an attack's mode, a move's kind…), never its target. |
| `Credit` | `interface Credit { unit, brief, encore, briefUsed, encoreUsed, paid }` | The credit a reducer action carries while it runs (cb.credit): AP that pay() takes before the unit's own. |
| `creditFor` | `creditFor(u: Unit \| null \| undefined, a: any, cb?: Combat \| null): number` | The AP an action NOT YET TAKEN may count on top of the unit's own (item 729; item 737; rules 1.13): Encore's, when `a` repeats the unit's Encore action, and a Brief's. |
| `lend` | `lend(cb: Combat, u: Unit, a: any): Credit \| null` | Before a reducer action: open its credit (Encore's repeat, unless in a window; a Brief's cut). |
| `settleCredit` | `settleCredit(cb: Combat, loan: Credit \| null): { brief: number; encore: number; spent: number; hadEncore: boolean } \| null` | After it: close the credit. |
| `unlend` | `unlend(cb: Combat \| null \| undefined)` | Drop an open credit without settling it (the action was refused). |
| `needs` | `needs(n: number, what = 'AP', left?: number)` | THE refusal sentence for a resource the unit is short of. |
| `poolWhyNot` | `poolWhyNot(have: number, n: number, o: { left?: boolean } = {}): string \| null` | The same question for a pool that is not a unit's (the area map's round AP, g.story.ap): the sentence, or null. o.left: say what is left ("Needs 2 AP (1 left)."). |
| `apFor` | `apFor(cb: Combat \| null \| undefined, u: Unit, as?: any): number` | The AP the unit can put toward an action now: its own, and the credit that action carries. |
| `whyNot` | `whyNot(cb: Combat \| null \| undefined, u: Unit, p: Priced \| number, o: { as?: any; c?: Character \| null; /** Classes 3.0 P9: who pays a price made on another (an owned un…` | Why the unit can't pay this (the one sentence), or null: it can. o.as: the reducer action this is (Encore's key), for a preview made outside the action; o.c: the character, for a resource kept there (stims, Ec… |
| `resWhyNot` | `resWhyNot(res: Record<string, number> \| undefined, u: Unit \| null \| undefined, c?: Character \| null): string \| null` | The same question for the resources alone, with or without a unit (a story action has none): the sentence, or null. |
| `resPay` | `resPay(res: Record<string, number> \| undefined, u: Unit \| null \| undefined, c?: Character \| null): void` | Take the resources alone (a story action: no unit, no AP). |
| `canPay` | `canPay(cb: Combat \| null \| undefined, u: Unit, p: Priced \| number, o: { as?: any; c?: Character \| null } = {}): boolean` | Can the unit pay this price now (AP and resources, with any credit)? whyNot() says why not. |
| `pay` | `pay(cb: Combat \| null \| undefined, u: Unit, p: Priced \| number, o: { c?: Character \| null; /** Classes 3.0 P9: the unit that pays (an owner for its owned unit) */ payer?…` | Take the cost. AP comes first from the credit this action carries (a Brief's, then Encore's), then from the unit. Returns the AP taken from the unit itself. |
| `refund` | `refund(cb: Combat \| null \| undefined, u: Unit, p: Priced \| number, o: { c?: Character \| null; payer?: Unit \| null } = {}): void` | Give a cost back, each resource to where it came from. |
| `apMeter` | `apMeter(cb: Combat \| null \| undefined, u: Unit): () => number` | A meter for what an action takes IN ALL: `const taken = apMeter(cb, u)` before it, `taken()` after it is the AP it drew from the unit and from its credit together (less what it gave back). |
| `spend` | `spend(u: Unit \| null \| undefined, id: string, n: number, c?: Character \| null): boolean` | Take n of a resource NOW, outside an action's declared cost (a reaction's Guard, a rider's MP in a hook). false, and nothing taken, when the unit has less. |
| `grantAp` | `grantAp(cb: Combat \| null \| undefined, u: Unit, n: number, o: { max?: number } = {}): number` | AP given that is NOT perk AP (it does not count in the turn's +3): a Quicken, a Spark, the area map's round. |
| `loseAp` | `loseAp(u: Unit, n: number): number` | AP taken that is not a payment (a penalty: Soft Hands, a fooled enemy): never below 0. |
| `setAp` | `setAp(u: Unit, n: number): void` | SET the unit's AP: a turn's refill (turnAp's number), a lost turn (0), a window's pool, a unit just built. |
| `freely` | `freely<T>(u: Unit, fn: () => T, o: { bank?: boolean } = {}): T` | Run fn as an action made inside another at no AP: every check passes and nothing is taken. |
| `withAp` | `withAp<T>(u: Unit, n: number, fn: () => T): T` | Run fn with the unit's AP set to n (a dry run: the planner, an enemy's intent), and put it back. |

#### AP grants (`effects/ap.ts`)

| name | signature or shape | what for |
| --- | --- | --- |
| `AP_BASE` | `AP_BASE` | The AP a turn starts from before items and conditions. |
| `AP_MAX` | `AP_MAX: number` | The most AP a turn may have (data/perks.json rules.ap_ceiling.turn_max). |
| `AP_MIN` | `AP_MIN: number` | The fewest AP a turn may have (data/perks.json rules.ap_ceiling.turn_min). |
| `PERK_AP_CAP` | `PERK_AP_CAP: number` | The most AP perks may add to one turn (data/perks.json rules.ap_ceiling.perk_gain_max_per_turn). |
| `AP_DEBT_CAP` | `AP_DEBT_CAP` | The most AP a unit may owe its next turn. |
| `ApLine` | `interface ApLine { n, why }` | One grant or penalty to a turn's AP, with the reason shown. |
| `turnAp` | `turnAp(u: Unit, grants: ApLine[], penalties: ApLine[]): { ap: number; gained: number; lost: number; lines: string[] }` | The AP a unit starts its turn with. grants and penalties come from the turn_start_pre hook; banked AP (bankAp) and debt are read off the unit and cleared. |
| `grantPerkAp` | `grantPerkAp(cb: Combat \| null, u: Unit, n: number, why: string, from?: Unit \| null): number` | Give perk AP now (on the unit's own turn), within the +3 cap and the turn's 9: returns what was given. |
| `bankAp` | `bankAp(u: Unit, n: number, why: string, cb?: Combat \| null, from?: Unit \| null)` | AP for the unit's next turn (counted toward that turn's +3 cap). |
| `briefCredit` | `briefCredit(u: Unit \| null \| undefined, cb?: Combat \| null): number` | Brief (a Call, rules 1.13): the AP the unit's next action costs less, as a loan the reducer makes before the action and settles after it. |
| `refusedGift` | `refusedGift(cb: Combat \| null, u: Unit, n: number, from?: Unit \| null): boolean` | An AP gift from another unit (Hand-Off): 'ap_gift' {t, from, n, cb, cancel, why} lets the receiver's items refuse it (Humanity First won't take AP from a non-human). |
| `apDebt` | `apDebt(u: Unit, n: number)` | AP taken off the unit's next turn after the floor of 2 (On My Mark), at most 4. |
| `pushAp` | `pushAp(ctx: { grants: ApLine[]; penalties: ApLine[] }, n: number, why: string)` | AP to add (or take) when the turn starts, from inside a turn_start_pre handler. |

#### Limits, cooldowns and counters (`effects/uses.ts`)

| name | signature or shape | what for |
| --- | --- | --- |
| `UseCell` | `interface UseCell { s, n }` | One counter cell: the stamp it was taken under (s) and how many were taken (n). |
| `SCOPES` | `SCOPES: Record<UseScope, { fresh: string; fight: Home; map: Home; label: string }>` | THE RESET POINTS, one row a scope: when it is fresh again (the stamp it carries changes), and where its cells live. |
| `scopeOf` | `scopeOf(uses: string \| null \| undefined): UseScope` | Read a data `uses` string ("per_combat", "once_per_turn", "out_of_combat"…) as a scope. |
| `sessionN` | `sessionN(g: any)` | The game's session and rest counters (old saves: session 1, rest 0). |
| `dayOf` | `dayOf(g: any): number` | The day counter (rules 1.6.1, item 709): g.day, from 1; a long rest is a day, the Narrator's turn field days adds more. |
| `restN` | `restN(g: any)` | The game's long-rest counter (old saves: 0). |
| `roundNow` | `roundNow(x: { cb?: Combat \| null; g?: any }): number` | The round a limit counts in: the fight's, or on the area map (and in the story) the story's. |
| `stampOf` | `stampOf(scope: UseScope, x: { cb?: Combat \| null; g?: any }): string` | The stamp a counter of this scope carries now. |
| `Uses` | `interface Uses { used, key, left, n, key, take, n, key, k, refund, key, first, scope, had, scope, on, coolLeft, key, atRound, ready, key, atRound, cooledAt, cool, key, a…` | Counters for one holder: left / used / take / give back, by scope and an optional key (default: the item). |
| `uses` | `uses(h: Pick<Holder, 'key' \| 'u' \| 'c' \| 'cb' \| 'g'>): Uses` | THE counter door: every limit, "first X of the fight" and cooldown of one holder (see the header and SCOPES). |
| `usesLabel` | `usesLabel(scope: UseScope, n: number, left: number): string` | "1/combat", "2/scene"… for a card; empty at will. |

#### An item's own numbers (`effects/num.ts`)

| name | signature or shape | what for |
| --- | --- | --- |
| `effNum` | `effNum(h: { key: string; info?: { effects: any[] } \| null }, op: string, field = 'value', counts: Record<string, number> = {}): number` | A number an item's own effect carries (the first effect with this op; its `field`, default `value`), a plain number or a number block (P3, effects/amounts.ts numberOf, its `of` counted by `counts`). |
| `num` | `num(h: { key: string; tier?: string \| null }, key: string): number` | The item's number `key` at the holder's tier (a perk's tier block first, then the item's own). |

#### The hook bus and the registry (`effects/hooks.ts`)

| name | signature or shape | what for |
| --- | --- | --- |
| `bindGame` | `bindGame(g: any): any` | Bind a game state while one action runs, so handlers see h.g and h.c (the live character). |
| `boundGame` | `boundGame(): any` | The game bound for this action (bindGame), or null: how items reach the characters. |
| `register` | `register(def: ItemHandler): void` | Register a lane's handler for one item. |
| `handlerOf` | `handlerOf(key: string): ItemHandler \| undefined` | The lane handler registered for this item key, if any. |
| `registered` | `registered()` | Every item key that has a lane handler. |
| `_snapshotRegistry` | `_snapshotRegistry()` | For tests: take a copy of the lane registrations, and put a copy back (test helpers isolate runtime tests from lanes). |
| `_restoreRegistry` | `_restoreRegistry(snap: Map<string, ItemHandler>)` | Put back a registry saved by _snapshotRegistry (tests only). |
| `addItems` | `addItems(kind: 'perk' \| 'trait' \| 'relic' \| 'verb', items: any[])` | Add items at run time (engine foundations 3): a mode's relics or new perks, a test's fixtures; plain data in the shape of perks.json / traits.json items. |
| `clearAddedItems` | `clearAddedItems()` | For tests: forget the items added with addItems. |
| `_unregisterAll` | `_unregisterAll(keep: (key: string) => boolean = () => false)` | For tests: forget every lane registration (generic handlers stay). |
| `GenericOp` | `interface GenericOp { op, claim, info, stat, e, stat, ctx, on, checkMod, e, ck, ctx, run, e, args, rng, runs, info }` | A generic core-op handler: which effects it claims, and what it does for them. |
| `setTriggerRunner` | `setTriggerRunner(r: TriggerRunner)` | effects/triggers.ts registers the item-ops runner here as it loads (no import cycle). |
| `addConditions` | `addConditions(rows: any[]): void` | Add condition rows at run time (condtable.ts addConditionRows: a relic's own condition, a test's fixture); they are items their bearer holds (Classes 3.0 P4). |
| `clearAddedConditionRows` | `clearAddedConditionRows(): void` | Take the added condition rows away again. |
| `registerGeneric` | `registerGeneric(op: GenericOp)` | Register the engine's generic handler of a core data op (effects/core.ts). |
| `genericOf` | `genericOf(op: string)` | The generic handler of a core data op, if the engine has one. |
| `Owner` | `type Owner = 'handler' \| 'generic' \| 'narrator' \| 'action' \| 'gap'` | Who runs one effect of an item: a lane handler, a generic op, the Narrator, the item's action, or nobody (a gap). |
| `ownerOf` | `ownerOf(info: ItemInfo, i: number): Owner` | Who runs one effect of one item: its lane's handler, a generic op, the Narrator (op narrator or listed), the item's action (an active item's own effects, run when the action runs), or nobody yet (a gap: the Na… |
| `hookUsed` | `hookUsed(name: HookName): boolean` | Does anything at all listen on this hook (an item's handler, a generic op, an engine system)? A hook that every action passes through (the `cost` hook) asks this first, so it costs nothing until somebody uses… |
| `registryVersion` | `registryVersion()` | A number that changes whenever handlers or items change (caches key on it). |
| `setAllItems` | `setAllItems(f: () => ItemInfo[])` | collect.ts gives the registry its list of every item (kept there to avoid an import cycle). |
| `heldOfChar` | `heldOfChar(c: Character \| null \| undefined): Held` | What a character holds (the compact form). |
| `setRankRule` | `setRankRule(f: (c: Character) => number)` | character.ts gives the runtime its class-rank rule (kept there to avoid an import cycle). |
| `GRAND_FORM_OP` | `GRAND_FORM_OP` | The effect op that lays a Grand form (a Sigil word's `grand`; rules 1.4; effect_ops.json). |
| `canLayGrandForms` | `canLayGrandForms(c: Character \| null \| undefined): boolean` | Can this character lay Grand forms? Only while it holds a move whose effects lay one, through a class that is active: while the advanced classes are shelved, nobody can, so a screen shows no Grand form (Leon,… |
| `heldOfUnit` | `heldOfUnit(u: Unit \| null \| undefined): Held` | What a unit holds (perks, traits, class moves): its own list, else its character's. |
| `charOfUnit` | `charOfUnit(u: Unit \| null \| undefined): Character \| null` | The character behind a unit in the bound game, or null (an enemy, a thing). |
| `holdersOf` | `holdersOf(x: { u?: Unit \| null; c?: Character \| null; cb?: Combat \| null }): Holder[]` | Holders of every item a unit or character has (traits, perks, class moves), in order. |
| `holderOf` | `holderOf(x: { u?: Unit \| null; c?: Character \| null; cb?: Combat \| null }, idOrKey: string): Holder \| null` | One item's holder, if this unit or character holds it. |
| `emit` | `emit(cb: Combat \| null \| undefined, name: HookName, ctx: any): any` | Fire a combat hook: every unit's handlers in cb.units order (an ally's or an enemy's items may react). |
| `emitOwn` | `emitOwn(u: Unit, name: HookName, ctx: any): any` | Fire a hook for ONE unit's own items, with no fight in reach (a price asked for a row before a fight is known). |
| `onHook` | `onHook(name: HookName, fn: GlobalHook)` | An engine system (not an item) listens on a combat hook; it runs after every unit's items. |
| `onStat` | `onStat(stat: StatId, fn: (x: { u?: Unit \| null; c?: Character \| null; cb?: Combat \| null }, ctx: any) => number)` | An engine system (not an item) answers a stat query. |
| `onCheck` | `onCheck(fn: (x: { u?: Unit \| null; c?: Character \| null; cb?: Combat \| null }, ck: any, ctx: any) => CheckMod[])` | An engine system (not an item) adds modifiers to d20 checks. |
| `onStoryHook` | `onStoryHook(name: HookName, fn: (ctx: any, g: any) => void)` | A story hook for an engine system (no item): runs after the characters' items, with the game. |
| `emitStory` | `emitStory(g: any, name: HookName, ctx: any, only?: Character[]): any` | Fire a story hook for characters (all of them in g.characters order, or the ones given). |
| `anyOn` | `anyOn(cb: Combat \| null \| undefined, name: HookName): boolean` | Does anyone in this fight have a handler on this hook? (Lets costly payloads be skipped: sight diffs.) |
| `statHeard` | `statHeard(cb: Combat \| null \| undefined, stat: StatId): boolean` | Is anything in this fight able to answer this data stat (a condition a unit bears whose row has its stat_mod, an item a unit holds with a stat_mod of it, an engine system's answer)? The gate before a costly pe… |
| `ifFails` | `ifFails(h: Holder, cond: any, target?: Unit \| null): string \| null` | P6: the first predicate of an `if` block that fails for this holder (and its action's target), or null (it holds; outside a fight, or before the runner is loaded, nothing is tested). |
| `runOwnEffects` | `runOwnEffects(h: Holder, effects: any[], ctx: any): void` | P6: run a door verb's nested item ops as its action's own effects (a ctx shaped as `acted`'s). |
| `isItemOp` | `isItemOp(e: any): boolean` | Is this effect's op one of the item ops' closed list (effects/triggers.ts OPS)? |
| `isAura` | `isAura(e: any): boolean` | A standing aura: `{ "op": "stat_mod", "stat": <any declared stat>, "value": n, "targets": {…} }` with no `when`. |
| `statQuery` | `statQuery(x: { u?: Unit \| null; c?: Character \| null; cb?: Combat \| null }, stat: StatId, ctx: any = {}): { add: number; mult: number }` | Sum of every item's answer to a stat query (stat handlers, then generic stat effects). mult multiplies. |
| `checkQuery` | `checkQuery(x: { u?: Unit \| null; c?: Character \| null; cb?: Combat \| null }, ck: any, ctx: any = {}): CheckMod[]` | Modifiers to one d20 check from every item (handler checkMod, then generic skill and roll mods). |
| `genericEffects` | `genericEffects(x: { u?: Unit \| null; c?: Character \| null }, op: string): { e: any; info: ItemInfo }[]` | Every effect of every item a holder has whose owner is a generic op (for the generic handlers' own queries). |

#### Item actions (`effects/actions.ts`)

| name | signature or shape | what for |
| --- | --- | --- |
| `apFromData` | `apFromData(ap: any, u?: Unit \| null): number` | Data AP strings: "soul_cast_ap" (the Soul cast AP), "sigil_ap+soul_cast_ap" (Glyph AP + Soul cast AP). |
| `REACH_SIDES` | `REACH_SIDES` | The words a reach's side takes (a target relation to the holder). |
| `REACH_FIELDS` | `REACH_FIELDS` | The fields of a grant_action's `reach`. |
| `GRANT_SCOPES` | `GRANT_SCOPES` | Rules 1.33: the surfaces a grant_action's `scope` may name (default: combat and the area map). |
| `PRAYER_KINDS` | `PRAYER_KINDS` | The prayers a grant_action may be. |
| `setPrayerDoor` | `setPrayerDoor(p: typeof PRAYER)` | faith.ts's prayer door for a verb that is a prayer (verbPrayerWhy, verbPray). |
| `holderNumber` | `holderNumber(h: Holder, x: unknown): number \| null` | A number of an action's shape for this holder (rules 1.33: a number block's `skill:<id>` and `res:<id>` read the holder: a door's ladder, as Bond's reach 6, 9 from Empathy 6). |
| `reachWhy` | `reachWhy(h: Holder, reach: any, t: Unit \| null \| undefined): string \| null` | Why this holder can't aim its action at this unit by its `reach` (null: it can). |
| `tileReachWhy` | `tileReachWhy(h: Holder, reach: any, tile: string \| null \| undefined): string \| null` | Why this holder can't aim its action at this tile by a reach with `tile: true` (Classes 3.0 step 5, rules 1.31: Sanctuary): within `tiles` of the holder, and (sight) a tile its eyes reach. null: it can. |
| `defaultActions` | `defaultActions(info: ItemInfo): ActionDef[]` | The default actions of an item, from its data. |
| `actionDefs` | `actionDefs(info: ItemInfo): ActionDef[]` | An item's actions: a lane's, when it registered any (they replace the data defaults), else the defaults. |
| `dataAp` | `dataAp(info: ItemInfo, actionId: string): number \| string` | The data's AP for an item's action: the `ap` of the grant_action that names it, else the item's own (ap_cost). |
| `ItemTab` | `type ItemTab = 'perks' \| 'class' \| 'shadow' \| 'tend' \| 'figments' \| 'faith'` | The tab an item's actions go on: class moves on the class's, a door verb on its system's tab (its data file's `tab`: Shadow's verbs on 'shadow', rules 1.32), the rest on the perks'. |
| `VERB_TABS` | `VERB_TABS: ItemTab[]` | The system tabs a door verb's data file may name (`tab`, rules 1.32-1.33): Shadow's verbs, Tending's. |
| `PRAYER_SUB` | `PRAYER_SUB: Record<string, string>` | The Faith tab's prayer groups (the prayer rows' own: descriptors.ts FAITH). |
| `PerkActionEntry` | `interface PerkActionEntry { id, actionId, itemId, kind, label, text, ap, uses, target, range, scope, why, engine, tab, cls, arm, armed, sub, tier, options, pickMulti, pi…` | One action as the UI shows it. |
| `perkActionsFor` | `perkActionsFor(x: Who, scope: ActionScope): PerkActionEntry[]` | Every action a holder's items give on this surface, available or greyed (hidden ones left out). |
| `PerkInfoEntry` | `interface PerkInfoEntry { id, itemId, kind, label, text, tab, tier, via, uses }` | An item the data makes an action, but which is used another way: from another action (a chip on Pump, Begin, an attack: its toggles) or by itself (a hook). |
| `perkInfoFor` | `perkInfoFor(x: Who, scope: ActionScope): PerkInfoEntry[]` | The read-only Perks-tab entries of a holder's items on this surface (see PerkInfoEntry). |
| `UNFELT` | `UNFELT` | Why a feeling can't be given yet (rules 1.33: only a felt feeling is given). |
| `registerPickList` | `registerPickList(name: string, fn: (h: Holder) => PickOption[])` | Register a system's pick list (see PICK_LISTS). |
| `perkActionId` | `perkActionId(x: Who, id: string, actionId?: string): string \| null` | The id of the action an item's `combat/perk` names (its actionId, else the item's first action): what the trigger `acted` carries as `action` (Classes 3.0 P2). null: the holder has no such item or action. |
| `previewPerkAction` | `previewPerkAction(x: Who, id: string, args: ActionArgs & { actionId?: string } = {}, scope: ActionScope = x.cb && !overworld(x.cb) ? 'combat' : x.cb ? 'world' : 'story')…` | What the action would do (the UI and the reducer use the same truth). |
| `runPerkAction` | `runPerkAction(x: Who, id: string, args: ActionArgs & { actionId?: string }, rng: { state: number }, scope?: ActionScope): string \| null` | Do it: checks the preview, spends AP and the use, runs the action. |
| `ToggleEntry` | `interface ToggleEntry { id, itemKey, label, why, on, preview, defaultOn }` | ---------- toggles on existing actions ---------- |
| `togglesFor` | `togglesFor(x: Who, actionType: string, actx: any = {}, mods: string[] = []): ToggleEntry[]` | The toggles a holder can set on an action type ('combat/attack', 'combat/move', …), with their state for these mods. |
| `togglesOf` | `togglesOf(h: Holder): ToggleDef[]` | Every toggle an item gives: its lane's, then its data's. |
| `toggleOnIn` | `toggleOnIn(t: ToggleDef, key: string, mods: string[])` | Is an item's toggle on for these mods (its key#id, its bare id, or its default unless turned off with '!')? |
| `modOn` | `modOn(h: Holder, toggleId: string): boolean` | Inside a hook: is this item's toggle on for the action being resolved (cb.mods, set by the reducer)? |
| `armedOf` | `armedOf(h: Holder)` | Armed preset of this item on its unit (combat/perk {arm:true}), or undefined. |
| `disarm` | `disarm(h: Holder)` | Clear the holder's armed preset (an armed action fired or was cancelled). |
| `WindowEntry` | `interface WindowEntry { unitId, ap, limit, done }` | ---------- off-turn windows (plan 2.7) ---------- |
| `openWindow` | `openWindow(cb: Combat, kind: string, entries: WindowEntry[], by?: string)` | Give units a turn out of order (On My Mark, Supreme Command): active(cb) returns the queue's head until each has taken its actions (limit, default 1) or declined. |
| `windowStep` | `windowStep(cb: Combat, declined = false)` | After an action in a window: count it, and move on when the unit is done. |
| `closeWindow` | `closeWindow(cb: Combat)` | End the fight's open reaction or interrupt window. |

#### Rolls, saves and contests (`rolls.ts`)

| name | signature or shape | what for |
| --- | --- | --- |
| `SAVE_TN` | `SAVE_TN: number` | The base TN of every save: 12 (data/rules.json conditions_rules.save_base_tn). |
| `TN` | `TN: { easy: number; standard: number; hard: number; heroic: number }` | The TN ladder of a check (data/rules.json resolution.tn_ladder): Easy 8, Standard 12, Hard 16, Heroic 20. |
| `CONTEST_BASE` | `CONTEST_BASE: number` | What an opposed number starts from (a Shove's "10 + the target's Raw Power", a spotter's "10 + its Ingenuity"). |
| `DEATH_SAVE_TN` | `DEATH_SAVE_TN: number` | A death save passes on this total or more. |
| `tierSave` | `tierSave(tier?: string \| null): number` | The save bonus of someone with no sheet, by tier (data/rules.json rolls.npc_save_by_tier): a Minion 0, a Soldier 1, an Elite 2, a Boss 3. |
| `tierStrength` | `tierStrength(tier?: string \| null): number` | How hard what someone with no sheet does is to save against, by tier (rolls.npc_strength_by_tier). |
| `Fam` | `type Fam = 'body' \| 'brain' \| 'heart'` | A save's family: Body, Brain or Heart. |
| `RollPart` | `interface RollPart { add, label }` | One labelled term of a roll's modifier. |
| `RollResult` | `interface RollResult { kind, die, dice, mod, parts, total, tn, ok, nat, skipped, why, fam, text }` | What a roll did: the die (and dice), the modifier and its parts, the total, the TN, ok, the natural, the sentence. |
| `rollText` | `rollText(r: { die: number; mod: number; total: number; tn: number; nat?: 1 \| 20 \| null; dice?: number[] }, lead = ''): string` | "d20 12 +2 = 14 vs 15" (with ", natural 20" or ", natural 1" when that decided it). |
| `rollD20` | `rollD20(rng: Rng, o: { adv?: boolean } = {}): { die: number; dice: number[] }` | THE die. `adv`: roll two and keep the higher (both are drawn, in order). The only d20() call in the engine. |
| `judge` | `judge(kind: RollResult['kind'], rolled: { die: number; dice?: number[] }, mod: number \| RollPart[] \| undefined, tn: number, o: { nat?: boolean; over?: boolean; fam?: Fam…` | A die already rolled, judged: d20 + modifier against a TN. `nat` (default true): a natural 20 always passes and a natural 1 always fails; false: only the total counts (a death save, a Shove's opposed roll). |
| `rollFx` | `rollFx(cb: Combat \| null \| undefined, r: RollResult, who: Unit \| null \| undefined, x: { by?: Unit \| null; why?: string } = {}): void` | The effect event of a roll (kind 'roll'): the numbers a screen needs to show the dice. |
| `RollSpec` | `interface RollSpec { by, mod, tn, why, nat, over, adv, lead, fx }` | What rollVs needs: who rolls, the modifier, the TN, why, and how the natural and the effect event are treated. |
| `rollVs` | `rollVs(cb: Combat \| null \| undefined, rng: Rng, s: RollSpec): RollResult` | A plain roll: d20 + modifier against a TN. One die is drawn (two with `adv`). |
| `SaveSpec` | `interface SaveSpec { by, target, fam, tn, mod, id, via, adv, ca, tnAdd, lead, fx }` | What rollSave needs: who forces it, the target, the family, the TN or the source it comes from, the condition id. |
| `rollSave` | `rollSave(cb: Combat, rng: Rng, s: SaveSpec): RollResult` | A unit's save. It RESISTS when `ok`. In order: every item is asked ('cond_apply' unless `ca` is given, then 'save'): one may cancel it (`skipped: 'immune'`, ok), pass it (`'auto'`, ok), say there is no save (`… |
| `contest` | `contest(cb: Combat \| null \| undefined, rng: Rng, a: { by?: Unit \| null; mod: number }, b: { by?: Unit \| null; mod: number }, why = ''): { a: RollResult; b: RollResult; w…` | Two rollers against each other: each a d20 + modifier, `a` first. |
| `HitKind` | `type HitKind = 'weapon' \| 'sigil' \| 'soul'` | What kind of roll to hit: a weapon attack, a Sigil's hit roll, an Outburst's (a Bolt or a Lance). |
| `toHitTerms` | `toHitTerms(cb: Combat \| null \| undefined, att: Unit \| null \| undefined, tgt: Unit, type: HitKind, o: { mode?: string; preview?: boolean } = {}): { v: number; label: stri…` | THE hook of every roll to hit a target (Leon, 13 Nov 2026: "one hook"; Classes 3.0 step 1b): 'to_hit' {att, tgt, type ('weapon', 'sigil', 'soul': the item-op predicate `damage` reads it), mode (a weapon's), te… |
| `toHitAdd` | `toHitAdd(cb: Combat \| null \| undefined, att: Unit \| null \| undefined, tgt: Unit, type: HitKind, o: { mode?: string; preview?: boolean } = {}): number` | The sum of toHitTerms. |
| `passFaces` | `passFaces(mod: number, tn: number): number` | How many of the 20 faces pass d20 + mod against a TN (a natural 20 passes, a natural 1 fails): the odds a card shows. |
| `attackHits` | `attackHits(rc: { die: number; hit?: boolean; critMin: number; toHit: number; need: number }): boolean` | Does this attack roll hit, by the attack's own rule (a natural 1 misses, the critical range hits, else the total against the Defense)? For an item inside the 'attack_roll' hook, before resolveAttack settles it. |
| `rerollAttack` | `rerollAttack(rc: { die: number; hit?: boolean; critMin: number; toHit: number; need: number }, rng: Rng, bonus = 0): number` | Reroll an attack's die inside the 'attack_roll' hook (Lucky Break, Lucky Foot): the new die replaces the old one. |

#### The kit: selectors, areas, tiles (`kit.ts`)

| name | signature or shape | what for |
| --- | --- | --- |
| `overworld` | `overworld(cb: Combat \| null \| undefined): boolean` | Is this "fight" the area map (the scratch fight built for every action outside a real fight)? |
| `inFight` | `inFight(h: { cb?: Combat \| null; u?: Unit \| null }): boolean` | A real fight (not the area map), with a unit in it. |
| `unitById` | `unitById(cb: Combat \| null \| undefined, id?: string \| null): Unit \| null` | The unit with this id, or null. |
| `tileOf` | `tileOf(cb: Combat, t?: string \| null): string \| null` | A tile named by a player or the Narrator ('3,4' or a grid reference 'D5') as a tile key, or null. |
| `rngOf` | `rngOf(h?: { g?: any } \| null, ctx?: { rng?: Rng \| null } \| null): Rng` | The rng of the action being resolved: the hook's (ctx.rng), else the holder's game's, else the bound game's. |
| `inBounds` | `inBounds(cb: Combat, k: string): boolean` | Is this tile on the map? |
| `tilesAround` | `tilesAround(k: string, r: number, cb?: Combat \| null): string[]` | Every tile within r of a tile (a square of side 2r + 1, the centre included), column by column. |
| `tilesLine` | `tilesLine(a: string, b: string, o: { end?: boolean } = {}): string[]` | The straight run of tiles from a to b: one tile a step of the longer axis, the other axis rounded. |
| `landBlockers` | `landBlockers(cb: Combat): Set<string>` | THE list of tiles nothing can be moved onto or walk through: the map's solid tiles and every standing object whose kind says `blocks_move` in data/objects.json (a crate, a low wall, a pillar, a barricade, a cl… |
| `canStand` | `canStand(cb: Combat, k: string, mover?: Unit \| null, blocked: Set<string> = moveBlockers(cb)): boolean` | Can a unit stand on this tile: on the map, nothing that blocks movement, and nobody there but `mover` (a Downed body is somebody; a dead one is not). |
| `standBlocker` | `standBlocker(cb: Combat, k: string, mover?: Unit \| null, blocked: Set<string> = moveBlockers(cb)): 'edge' \| 'object' \| Unit \| null` | What stops a unit from standing on a tile: 'edge' (off the map), 'object' (a solid tile or a blocking object), the unit that is there, or null when it is free. |
| `Who` | `interface Who { downed, dead, surrendered, hidden, companions, images, within, from, seenBy, seenBySide, self }` | Who counts. The defaults are the rule: a unit still in the fight (not dead, not Downed, not surrendered), Hidden or not, a companion or not, a False Image or not. Every exception is named at the call. |
| `foesOf` | `foesOf(cb: Combat, u: Unit, o: Who = {}): Unit[]` | The units of the other side. |
| `alliesOf` | `alliesOf(cb: Combat, u: Unit, o: Who = {}): Unit[]` | The OTHER units of this unit's side (o.self: the unit too). |
| `WORK` | `WORK: Record<string, number>` | How much work the planners did: a count per name, raised by work('<name>') at the top of a costly function (planEvoke, previewOutburstPlan, paths). |
| `work` | `work(what: string): void` | Count one unit of work under a name (speed tests count work, never milliseconds). |
| `counted` | `counted<T>(fn: () => T): { ret: T; work: Record<string, number> }` | Run fn and return what it counted (the counters are put back as they were). |
| `Area` | `type Area = \| { shape: 'burst'` | =================================================================================================== areas ONE description of an area and ONE answer to "which tiles" and "who is in it" (engine foundations 2, th… |
| `CONE_COS` | `CONE_COS` | The cone's cosine: a tile is in the cone when the angle between it and the cone's line is no more than about 45 degrees. |
| `inArea` | `inArea(a: Area, k: string): boolean` | Is tile k inside the area? (No map is asked: a tile off the map can be "in" an area; tilesIn drops those.) |
| `tilesIn` | `tilesIn(cb: Combat, a: Area): string[]` | The tiles of an area that are on the map, column by column (a line: nearest first). |
| `unitsIn` | `unitsIn(cb: Combat, a: Area \| string[], o: Who & { side?: Unit['side']; not?: (Unit \| null \| undefined)[] } = {}): Unit[]` | WHO IS IN IT: the units standing in an area (or on any of a list of tiles), of either side. |
| `Tie` | `interface Tie { kind, from, to, lost }` | A tie between two units. |
| `TIE_ENDS` | `TIE_ENDS` | What ends a tie (a kind's `ends_on`). |
| `TIE_ON_END` | `TIE_ON_END` | What happens when a tie ends (a kind's `on_end`). |
| `TieEnd` | `type TieEnd = (typeof TIE_ENDS)[number] \| { word: (typeof TIE_ENDS)[number]` | An end rule: a word, or (rules 1.33) {word, side}: only for a tie whose far end is of that side to the near end (foe, ally). |
| `TieKind` | `interface TieKind { id, max, ends_on, on_end, about, mark, gear, line }` | A kind of tie, as data/rules.json ties.kinds has it. |
| `tieKinds` | `tieKinds(): TieKind[]` | The kinds of tie (the data's, then those added at run time: a test's fixture). |
| `tieKind` | `tieKind(id: string): TieKind \| undefined` | A kind of tie by id. |
| `addTieKinds` | `addTieKinds(rows: TieKind[])` | Add tie kinds at run time (tests); clearTieKinds takes them away. |
| `clearTieKinds` | `clearTieKinds()` | Forget the tie kinds added at run time. |
| `tiesOf` | `tiesOf(cb: Combat, u: Unit, kind?: string \| null, as: 'from' \| 'to' \| 'any' = 'any'): Tie[]` | The ties a unit has (as: from, to or any end), of a kind or of every kind. |
| `tiedTo` | `tiedTo(cb: Combat, u: Unit, v: Unit, kind: string, as: 'from' \| 'to' \| 'any' = 'any'): boolean` | Is `v` tied to `u` by this kind (as: v is the tie's from end, its to end, or either)? |
| `tieCap` | `tieCap(cb: Combat, u: Unit, kind: string): number` | How many ties of a kind a unit may hold from its end: the kind's max + the stat ties_max:<kind> (Infinity: no max). |
| `tie` | `tie(cb: Combat, from: Unit, to: Unit, kind: string): Tie \| null` | THE door that ties two units (from → to): refused (null) for an unknown kind, a tie that stands, or a holder at its cap. |
| `untie` | `untie(cb: Combat, pick: (t: Tie) => boolean): number` | End the ties that match (each kind's on_end runs). |

#### Movement and the fight's doors (`combat.ts`)

| name | signature or shape | what for |
| --- | --- | --- |
| `emitFx` | `emitFx(cb: Combat, k: string, data: Record<string, any> = {}): FxEvent` | Put one effect event on the fight's stream (the client animates it; fxTaps in fxtap.ts may watch it). |
| `dist` | `dist(a: string, b: string)` | Tiles between two tiles on the grid (diagonals count 1). |
| `hurtUnit` | `hurtUnit(u: Unit, dmg: number, ignoreArmour = false, cb?: Combat, why = 'hazard', by?: Unit \| null): string` | Damage to a unit from something other than an attack (explosions, traps, hazards). |
| `unitSees` | `unitSees(cb: Combat, u: Unit, k: string, walls?: Set<string>): boolean` | walls: sightBlockers(cb), from a caller that asks about many eyes or many tiles at once (building it is four times the cost of walking one line). |
| `moveUnit` | `moveUnit(cb: Combat, u: Unit, to: string, rng?: Rng, how: 'move' \| 'sprint' \| 'disengage' = 'move', o: MoveOpts = {}): string \| null` | A unit walks to a tile on its own (move, sprint or disengage): priced, paid, step by step with every reaction, trap and hazard. |
| `displace` | `displace(cb: Combat, rng0: Rng \| null \| undefined, u: Unit, to: { away: string; tiles: number } \| { toward: string; tiles: number } \| { tile: string }, o: DisplaceOpts):…` | Move a unit against its will (or by its own item, with o.willing): `{ away: tile, tiles }` straight away from a tile, `{ toward: tile, tiles }` straight toward one (it stops next to whatever stands there), or… |
| `swapUnits` | `swapUnits(cb: Combat, rng0: Rng \| null \| undefined, a: Unit, b: Unit, o: { by: Unit \| null; source: string; willing?: Unit[]; /** called once they have traded, before th…` | Two units trade tiles. |

#### Conditions and saves (`magic.ts`)

| name | signature or shape | what for |
| --- | --- | --- |
| `Zone` | `interface Zone { id, kind, tiles, words, by, side, left, mult, who, hit, pool, ever, first, tileMult, hidden, spotted, triggers, hp, def, element, kin, dir, reachMult }` | Placed magic and other standing zones. |
| `saveTn` | `saveTn(by: Unit \| null \| undefined, via?: string \| null, str?: number): number` | The TN of a save against something `by` did: 12 (rolls.ts SAVE_TN) + the strength of the skill that delivered it (`via`; `str`: a strength fixed when it was laid, a zone's or a residue's). |
| `saveAgainst` | `saveAgainst(cb: Combat, rng: Rng, by: Unit \| null, target: Unit, fam: Fam, id: string, o: { via?: string \| null; str?: number; tn?: number; tnAdd?: number; adv?: boolean…` | THE USUAL SAVE: `target` saves with its family save against what `by` did, at saveTn(by, via). |
| `condOn` | `condOn(u: Unit, id: string)` | Does the unit have this condition now? |
| `debuffsOf` | `debuffsOf(u: Unit, fam?: Fam)` | The body-family debuffs a unit carries now (Shrug It Off, Iron Stomach…), and any family's. |
| `applyCond` | `applyCond(cb: Combat, rng: Rng, by: Unit \| null, t: Unit, id0: string, rounds?: number, fam?: Fam, opts: CondOpts = {}): string` | Apply a condition: the target saves (d20 + its save) against 12 + the source's strength with the skill that delivered it (opts.via, or the call it runs inside: withVia; rules 1.13) (spec: Conditions and saves). |
| `endCond` | `endCond(u: Unit, id: string, cb?: Combat \| null)` | End a condition now (its effects undone). |
| `setCondRounds` | `setCondRounds(u: Unit, id0: string, rounds: number, o: { fresh?: boolean; cb?: Combat \| null; /** null: drop the variant it carried */ arg?: string \| null } = {})` | Change the rounds left of a condition a unit already has (an item halves it, lengthens it, lets it smoulder). |
| `clearConds` | `clearConds(u: Unit, cb?: Combat \| null)` | Every condition off a unit, each one's numbers undone (it is lifted out of the fight and put back whole). |

#### Unit states (`unitstate.ts`)

| name | signature or shape | what for |
| --- | --- | --- |
| `setSideSees` | `setSideSees(f: typeof sideSeesUnit)` | Wires in the sight test (does a side see a unit) that combat.ts owns; called once when the engine loads. |
| `setBraced` | `setBraced(u: Unit, on: boolean, guard?: boolean): void` | Braced: on (a Brace, a class move's stance) or off (it moved, was pushed, went Prone, changed weapon). |
| `bracedAs` | `bracedAs(u: Unit, was: boolean \| undefined): void` | Put Braced back exactly as it was read (something changed it for a moment to ask a question; nothing is ended). |
| `stagger` | `stagger(u: Unit, n = 1): void` | Staggered: this unit loses AP at its next turn (the turn's AP reads it and clears it). |
| `clearStagger` | `clearStagger(u: Unit): void` | Take a pending stagger off a unit. |
| `setDowned` | `setDowned(u: Unit, on: boolean): void` | Downed on or off. |
| `setNailed` | `setNailed(u: Unit, nail: Unit['nailed'] \| null): void` | A weapon left in the unit (it can't move or be moved until it is pulled free), or none. |
| `startHidden` | `startHidden(u: Unit, entry = true): void` | A unit that comes into a fight already Hidden (it was Hidden in the story, or the Narrator placed it so): nobody is asked. |
| `asStanding` | `asStanding<T>(u: Unit, f: () => T): T` | Read something as if the unit were standing (a preview of "stand up, then …"); nothing is changed. |
| `rawBleed` | `rawBleed(u: Unit, rounds: number): void` | Bleeding's rounds left (0: not bleeding). |
| `rawDazed` | `rawDazed(u: Unit, n: number): void` | Dazed: AP off the next turn (0: not Dazed). |
| `rawProne` | `rawProne(u: Unit, on: boolean, endBrace = true): void` | Prone on or off. |
| `rawHidden` | `rawHidden(cb: Combat \| null \| undefined, u: Unit, on: boolean, o: { entry?: boolean } = {}): void` | Hidden on or off, with its book-keeping: an entry gives one ambush (`entry: false`: the same entry, kept), and each other side remembers where it LAST SAW the unit (its tile if it sees it hide, else cb.seenAt)… |

#### The conditions table (`condtable.ts`)

| name | signature or shape | what for |
| --- | --- | --- |
| `UNTIL` | `UNTIL` | "Until something ends it", in rounds (a table condition with this many never ticks). |
| `CondEngine` | `type CondEngine = 'table' \| 'flag' \| 'state'` | How a condition is run: by its table row, as a flag only, or as a unit state (unitstate.ts). |
| `HitContext` | `type HitContext = 'own_attacks' \| 'next_attack' \| 'not_vs_source' \| 'vs_source' \| 'marker_squad_vs_self' \| 'melee_vs_self' \| 'ranged_vs_self'` | What a to-hit change applies to (the `context` of an `attack_mod` effect). |
| `CondMods` | `interface CondMods { defense, moveMult, vision, ap, save, dealtMult, nextAttackMult, sigilAp, soulCostMult, skills, hit, intent, noReact }` | The numbers of a condition the engine applies, read from the row's `effects`. |
| `CondDef` | `interface CondDef { id, key, name, title, text, fam, rounds, boon, noTick, noSave, engine, until, mods }` | One condition as the engine reads its data/conditions.json row. |
| `COND_TABLE_STATS` | `COND_TABLE_STATS: ReadonlySet<string>` | The stats the table reads from a row itself (the one list: P4's statQuery path skips them). |
| `CONDITION_ROWS` | `CONDITION_ROWS: any[]` | The rows as the data has them (the wiki and the amounts read these; nothing else loads the file). |
| `CONDS` | `CONDS: Record<string, CondDef>` | The table, by storage key. |
| `condRowsVersion` | `condRowsVersion` | A number that changes whenever rows are added or taken away (an index over the rows keys on it). |
| `addConditionRows` | `addConditionRows(rows: any[]): void` | Add condition rows at run time, written as data/conditions.json rows (a relic's own condition, a test's fixture): the same loader reads them; they run as items like any row (Classes 3.0 P4). |
| `clearAddedConditions` | `clearAddedConditions(): void` | Take every added row away again. |
| `condId` | `condId(id: string): string` | A condition's storage key from any of its names (an unknown id comes back as it is). |
| `condDef` | `condDef(id: string): CondDef \| undefined` | A condition's row, by any of its names. |
| `condMods` | `condMods(id: string): CondMods` | The numbers of a condition (an empty object for one that has none). |
| `CONDITION_NAMES` | `CONDITION_NAMES: string[]` | Every name the engine answers to: keys, data ids and aliases (the lint reads it). |
| `FLAG_CONDS` | `FLAG_CONDS` | The conditions kept as unit flags, and the unit states. |
| `STATE_CONDS` | `STATE_CONDS` | The conditions that are unit states (set through unitstate.ts, never written by hand). |

#### The fight log (`log.ts`)

| name | signature or shape | what for |
| --- | --- | --- |
| `LogSideMark` | `type LogSideMark = 0 \| { n: string[]` | One side's mark on a log line: 0, the side saw none of the units it names (the line is not sent to it); else n, the names of the units it names that the side didn't see (sent as 'something unseen'), and t, the… |
| `LogMark` | `type LogMark = 0 \| { pc?: LogSideMark` | A log line's mark (cb.logSee[i]): 0 for every side, else the sides that didn't see all of it. |
| `setLogMarker` | `setLogMarker(f: Marker)` | combat.ts registers the marker as it loads. |
| `logQuietly` | `logQuietly<T>(f: () => T): T` | Run f with no log marks worked out (a preview's throwaway copy: its lines are never sent to anyone). |
| `say` | `say(cb: Combat \| null \| undefined, ...lines: string[]): number` | Write lines to the fight's log, each marked with who saw what it names. |
| `sayOf` | `sayOf(cb: Combat, about: readonly string[], line: string): number` | say() for a line whose units are given by id, not found by name (about: [] for a line that names nobody: the Narrator's own words). |
| `sayAt` | `sayAt(cb: Combat, at: number, line: string)` | Write a line at index at (0: the top of the log). |
| `unsay` | `unsay(cb: Combat, at: number)` | Take line at back out of the log (a refused call or technique). |
| `remarkOpening` | `remarkOpening(cb: Combat)` | The fight's initiative line names every unit: when the set-up changes who is seen (sightQuietly: who starts Hidden), its mark is worked out again, as the fight opens. |

#### What each viewer may see (`fog.ts`)

| name | signature or shape | what for |
| --- | --- | --- |
| `UNSEEN` | `UNSEEN` | An unseen unit, wherever a view would have named it. |
| `UNSEEN_NAME` | `UNSEEN_NAME` | An unseen unit's name, wherever a view's fx would have said it. |
| `UNSEEN_LOG` | `UNSEEN_LOG` | An unseen unit's name, wherever a log line sent to a player would have said it. |
| `UNSEEN_TILE` | `UNSEEN_TILE` | An unseen unit's tile, wherever a log line sent to a player would have said it. |
| `fogLog` | `fogLog(log: string[], marks: LogMark[] \| undefined, me: Side): { log: string[]; keptBefore: (i: number) => number }` | The log as one side may read it: the lines it may read (unseen names replaced), and for each old line count the number of lines kept before it (keptBefore[i]), so an fx's L can be moved. |
| `isUnseenId` | `isUnseenId(id: unknown): boolean` | An unseen unit's place in the turn order ('?3': the fourth in the order). |
| `FightFog` | `interface FightFog { tiles, sensed, full }` | What the viewer's side sees, as the view carries it (cb.fog). full: the viewer is the human Narrator, who is sent everything; tiles and sensed are still the players' side's, for shading. |
| `fightSight` | `fightSight(cb: Combat): { tiles: Set<string>; sensed: Set<string>; full: boolean }` | The sight a screen draws with: the view's own (cb.fog). |
| `fogFight` | `fogFight(g: unknown, real: Combat, view: Combat, me: Side, full = false): Combat` | The fight as the viewer's side may know it (see the top of this file). real: the whole fight; view: viewFor's copy of it so far (the other filters already applied). g: the game, bound while sight is worked out… |

#### Action descriptors (`descriptors.ts`)

| name | signature or shape | what for |
| --- | --- | --- |
| `GROUP_ORDER` | `GROUP_ORDER: DescGroup[]` | The order of the action groups on the fight screen's tabs. |
| `PickOption` | `interface PickOption { id, label, text, why }` | One choice of an option pick: its id, label, help text, and why it is greyed out. |
| `PickStep` | `interface PickStep { key, kind, prompt, optional, choices, options, max, renderer, auto, when }` | One pick an action asks for (a target, a tile, an option, a custom panel), with what may be picked. |
| `DescCost` | `interface DescCost { ap, text, res }` | An action's price as the engine priced it: AP, the words shown, resources. |
| `ActionDescriptor` | `interface ActionDescriptor { id, group, parent, name, text, cost, available, why, picks, toggleOn, preview, hidden, pad, engine, hand, parts, sub }` | One action a unit may take, as the client renders it: id, group, name, cost, availability, picks. |
| `PreviewLine` | `interface PreviewLine { k, text }` | One line of a descriptor preview (odds, a note, a meter, a save, the cost, an ask). |
| `GridMarks` | `interface GridMarks { units, tiles }` | What a preview paints on the grid (tiles, targets, an area, a path). |
| `DescriptorPreview` | `interface DescriptorPreview { id, ok, why, ask, next, ap, cost, lines, marks, toggles, rolls, action }` | What an action would do with these picks: ok or why not, its AP, its lines and grid marks. |
| `DescCtx` | `interface DescCtx { g, cb, u, c, side, seen, by }` | ---------- the context every system reads ---------- |
| `ActionSystem` | `interface ActionSystem { id, list, send, preview, owns, choices }` | A system of actions: what it lists for a unit and the action each sends. preview: extra lines and marks beyond the reducer's verdict. |
| `registerActions` | `registerActions(s: ActionSystem): () => void` | Add a system of actions. |
| `actionsFor` | `actionsFor(g: GameState, unitId: string, viewer?: string \| null): ActionDescriptor[]` | Every action this unit could take now, in list order: grouped by tab (GROUP_ORDER), each system's rows in its own order within a group. |
| `stepOn` | `stepOn(st: PickStep, p: Picks)` | Does this step apply with these picks? |
| `nextStep` | `nextStep(d: ActionDescriptor, p: Picks, o: { required?: boolean } = {}): PickStep \| null` | The first step still to pick (optional steps included: a screen may skip them), or null. |
| `sendDescriptor` | `sendDescriptor(g: GameState, unitId: string, id: string, picks: Picks = {}, viewer?: string \| null): Action \| null` | The reducer action Confirm sends for these picks (null: a required pick is missing, or no such action). |
| `previewDescriptor` | `previewDescriptor(g: GameState, unitId: string, id: string, picks: Picks = {}, viewer?: string \| null): DescriptorPreview \| null` | The engine's preview of a descriptor with the picks so far: the next pick (with its legal choices), the verdict, the cost, the lines and the grid marks. |

#### Previews and dry runs (`preview.ts`)

| name | signature or shape | what for |
| --- | --- | --- |
| `withGame` | `withGame<T>(g: any, fn: () => T): T` | Ask the engine a read-only question with the game bound (items' handlers see the live character and the counters). |
| `copyFight` | `copyFight(cb: Combat, o: { mods?: string[] \| null } = {}): Combat` | A throwaway copy of the fight, with nothing in its log, notes or effects (a dry run's own lines are its own). |
| `shadowGame` | `shadowGame(g: any, cb: Combat \| null): any` | The game a dry run's handlers see: its own characters, counters and dice, and the copied fight. |
| `PreviewOpts` | `interface PreviewOpts { viewer, mods }` | How a dry run is made: the viewer whose fog limits the copy, and other switches. |
| `preview` | `preview<T>(g: any, cb: Combat, fn: (cb: Combat, g: any, rng: Rng) => T, o: PreviewOpts = {}): T` | Run fn on a throwaway copy of the fight, with a shadow of the game bound. |
| `DryRun` | `interface DryRun { err, u, cb, ap }` | What a dry run on a copy found: the refusal or null, the AP it took, the unit after. |
| `dryRun` | `dryRun(g: any, cb: Combat, unitId: string, fn: (cb: Combat, u: Unit, rng: Rng, g: any) => string \| null \| undefined, o: PreviewOpts = {}): DryRun` | Try an engine action on a throwaway copy: the engine's own refusal (or null), the unit afterwards and the AP it paid. |
| `ActionVerdict` | `interface ActionVerdict { ok, why, ap, g }` | Would the reducer accept this action now: ok, or its refusal in its own words. |
| `previewAction` | `previewAction(g: GameState, action: Action, by: string): ActionVerdict` | A whole action as a click would run it, through the reducer on a copy (apply() copies the game itself): every gate the reducer has (whose turn, the unit's fixed action list, the switches, Encore's lend) is in… |
| `fightSeenBy` | `fightSeenBy(cb: Combat, side: Side): Combat` | The fight as a side sees it: living units out of its sight are absent (the dead stay: a body is no secret). |
| `previewSeenBy` | `previewSeenBy<T extends object>(cb: Combat, side: Side, run: (cb: Combat) => T, fields: (keyof T)[], /** the whole fight's preview, when the caller already has it */ who…` | A preview for a viewer. |
| `fightWith` | `fightWith(cb: Combat, mods: string[] \| null \| undefined): Combat` | The fight with an action's switches set on it, for a preview that reads them (cb.mods). |

#### Numbers in data texts (`datatext.ts`)

| name | signature or shape | what for |
| --- | --- | --- |
| `fmtNumber` | `fmtNumber(v: number, how = ''): string` | A number as a text shows it: rounded to 4 places, no trailing zeros, a true minus sign. |
| `renderText` | `renderText(text: string, item: any, holder: any): string` | One text with its placeholders filled from the item (a leading dot: from the object that holds the text). |
| `resolveTexts` | `resolveTexts<T>(root: T): T` | Fill every placeholder under a parsed data file, in place. |

#### The mode a room plays and the Survival run (rules 1.39) (`run/state.ts`)

| name | signature or shape | what for |
| --- | --- | --- |
| `PlayMode` | `type PlayMode = 'survival' \| 'roguelike' \| 'campaign'` | A mode a room can play (data/modes.json ids). |
| `ModeDef` | `interface ModeDef { id, name, line, art, art_pending, available, narrator, start, coming }` | One row of data/modes.json: a card of the lobby's mode picker. |
| `MODES` | `MODES: ModeDef[]` | The three modes in the picker's order (data/modes.json items). |
| `DEFAULT_PLAY` | `DEFAULT_PLAY: PlayMode` | The mode a new room selects (data/modes.json default: Survival). |
| `OLD_SAVE_PLAY` | `OLD_SAVE_PLAY: PlayMode` | The mode a save written before modes existed reads (data/modes.json old_save: Campaign, the only thing it could be). |
| `modeOf` | `modeOf(id: string \| null \| undefined): ModeDef \| undefined` | A mode's row by id, or undefined. |
| `playOf` | `playOf(g: { settings: { play?: PlayMode } }): PlayMode` | The mode a room plays: its `settings.play`, or the old-save mode when the room was saved before there were modes. |
| `RunPhase` | `type RunPhase = 'map' \| 'boon' \| 'tile' \| 'over'` | Where a run stands. |
| `RunNode` | `interface RunNode { id, depth, col, kind, setting, links, room }` | A node of a stage's path map (spec section 9's shape, so a node can later hold a designed room). |
| `RunTile` | `interface RunTile { id, setting, stage, links, boons }` | A tile of the world the party walks (rule 32): a stage's setting and its boon pool. |
| `RunEnd` | `interface RunEnd { how, stage, cleared, nodes, levels }` | How a run ended (rule 4): lost (the whole party down) or retired after a Boss; the score it keeps. |
| `RunState` | `interface RunState { seed, stage, world, nodes, at, path, state, leans, ready, offers, shop, stats, out, renown, end }` | A Survival run (rule 36): `g.run`. |
| `newRun` | `newRun(seed: string): RunState` | A fresh run at stage 1 with nothing walked (rule 36's fields; the map comes with step 2). |
| `runSeed` | `runSeed(code: string, seq: number): string` | A run's seed when the host gives none: from the room's code and its action count, so it is the same on a replay and different for each run a room starts. |
| `modeLocked` | `modeLocked(id: string): string \| null` | The words for a mode that can't be picked (its data's `coming`), or null when it can. |
| `runStartProblem` | `runStartProblem(g: { hostId: string; phase: string; settings: { play?: PlayMode }; players: Who[]; characters: Record<string, Seat>; run?: RunState \| null }, by: string)…` | Why `run/start` can't start the run now, or null (rule 2, section 8.1 item 9). |
| `runRetireProblem` | `runRetireProblem(g: { hostId: string; run?: RunState \| null }, by: string): string \| null` | Why `run/retire` can't end the run now, or null (rule 4: the host, after a Boss). |
| `endRun` | `endRun(r: RunState, how: RunEnd['how'], levels: Record<string, number>): RunState` | The run's end and its score (rule 4): stages cleared (a retire comes after a Boss, so the stage under way counts), nodes walked, each character's level. |

#### The client's one hover card (`apps/web/src/game/actionTip.ts`)

| name | signature or shape | what for |
| --- | --- | --- |
| `TipLine` | `interface TipLine { key, kind, label, text }` | One line of the hover card: what it does, the weapon's line, a trait, a note, or the refusal. |
| `Tip` | `interface Tip { name, chips, lines }` | A laid-out hover card: the name, its cost chips, its lines. name '' (a prose hover text): a card with no title line. |
| `TipSrc` | `interface TipSrc { name, cost, text, needs, line, traits, notes, why }` | What a hover card is made from (the descriptor's own fields). |
| `sentences` | `sentences(prose: string): string[]` | Split prose into sentences at top level: a stop (. ! ? …) followed by a space and a capital, a digit, a sign or an opening bracket. |
| `actionTip` | `actionTip(src: TipSrc): Tip` | The action's card: the name and cost chips, then its lines (see the top of this file). |
| `tipText` | `tipText(t: Tip): string` | The card as plain text, a line each (an aria-description). |
| `tipAttrs` | `tipAttrs(src: TipSrc): { tip: string; tipText: string }` | What the screen binds: data-tip (the card) and aria-description (the same, in words). |
| `proseTip` | `proseTip(prose: string, name = ''): Tip` | A plain prose hover text as a card: a line a sentence (and a line for each " · " part and each line break), a "Label: text" sentence and each part of a parenthesised note on their own labelled lines. |
| `tipProps` | `tipProps(text: string \| null \| undefined, opts: { label?: boolean } = {}): Record<string, string>` | React props for a plain hover text: the card and the same words for assistive tech. |
| `setTip` | `setTip(el: Element, text: string \| null \| undefined, opts: { label?: boolean } = {}): void` | The same for an element made by hand (cutIn, the camera's arrows). |
| `tipFor` | `tipFor(el: Element): Tip \| null` | The card an element shows, or null (data-tip first, then data-tip-text). |
| `TIP_CSS` | `TIP_CSS` | The floating hover card's style, mounted once by mountActionTips. |
| `tipElement` | `tipElement(doc: Document, t: Tip): HTMLElement` | Lay a card out as elements (the name and its chips if any, a line each). |
| `placeTip` | `placeTip(r: Rect, b: { width: number; height: number }, W: number, H: number, gap = 6): { x: number; y: number }` | Where the card goes: beside the element (left, then right), else below, else above, shifted inside the window and never over the element itself (so never under the pointer: no flicker). |
| `TIP_SELECTOR` | `TIP_SELECTOR` | Every element that carries a hover card: a structured one (data-tip) or a prose one (data-tip-text). |
| `openTipOn` | `openTipOn(el: Element \| null \| undefined): void` | Open an element's own card now, as if hovered (a click on a locked control says why through the one card, never a toast or a native title). |
| `mountActionTips` | `mountActionTips(doc: Document \| null = typeof document !== 'undefined' ? document : null): void` | The one floating card of the document: any [data-tip] / [data-tip-text] element under the pointer, under keyboard focus or long-pressed on a touch screen shows its card, after a short delay (a pointer swept do… |

#### The client's action flow (`apps/web/src/game/actionFlow.ts`)

| name | signature or shape | what for |
| --- | --- | --- |
| `FLOW_PREVIEWS` | `FLOW_PREVIEWS` | The descriptor previews that run on this flow. |
| `descriptorsOf` | `descriptorsOf(g: any, unitId: string, me: string \| null): ActionDescriptor[]` | Every descriptor of this unit for this viewer, once per game state. |
| `FlowChip` | `interface FlowChip { key, label, title, on, off, pick }` | One chip of the picked action's flow (an option or a toggle), with whether it is on or greyed out. |
| `FlowView` | `interface FlowView { d, pv, picks, cost, sel, chips, ring, area, targets, reach, peek, peekWith, ready, action, click, after }` | What the fight screen shows for the picked action: the descriptor, its preview, the picks, the next step. |
| `picksOf` | `picksOf(d: ActionDescriptor, S: any, cb: any, cur: any, extra: Picks = {}): Picks` | The picks the screen holds for this descriptor. |
| `flowView` | `flowView(g: any, me: string \| null, cur: any, S: any, extra: Picks = {}): FlowView \| null` | The picked action on the flow, or null when it is not (no action, not this player's turn, a system with its own screen code). extra: picks a bespoke panel made (a perk's form, a pile's checklist). |

### Fx event kinds (130; `emitFx(cb, kind, data)` in `combat.ts`; taps: `fxTaps` in `fxtap.ts`)

What the client animates. Name units by `unit` / `target`, tiles as `'x,y'`, `only: side` for one side's eyes (`docs/ENGINE-GUIDE.md`, fog).

| kind | fields | first emitted at | sites |
| --- | --- | --- | --- |
| `analyze` | `unit`, `target`, `from`, `to`, `glyph` | combat.ts:2475 | 2 |
| `anchor` | `unit`, `at`, `what`, `target` | classes/rev3.ts:114 | 4 |
| `aura_tick` | `unit`, `at`, `tone`, `element`, `targets`, `riderStage` | magic.ts:1668 | 1 |
| `bead` | `unit`, `at`, `target`, `to` | physical/ranged/sets.ts:66 | 1 |
| `bead_end` | `unit`, `at`, `target`, `why` | physical/ranged/sets.ts:44 | 1 |
| `blink` | `target`, `from`, `to`, `element` | sigil.ts:1124 | 1 |
| `boon` | `target`, `at`, `word`, `cond`, `amount` | classes/k.ts:887 | 6 |
| `burn` | `unit`, `at`, `over`, `dmg` | magic.ts:958 | 1 |
| `call` | `unit`, `id`, `target`, `at`, `step`, `kind`, `reaction` | calls/core.ts:156 | 1 |
| `calm` | `unit`, `at`, `way`, `by`, `strain` | classes/k.ts:1430 | 5 |
| `carry` | `unit`, `from`, `to`, `target`, `tech` | physical/ranged/fire.ts:279 | 1 |
| `chain` | `unit`, `from`, `to`, `target`, `element`, `storm`, `jump`, `mult`, `grand`, `feeling` | classes/i.ts:1236 | 6 |
| `charge` | `unit`, `at`, `charges` | classes/j.ts:1064 | 1 |
| `clear` | `unit`, `at`, `dur`, `by`, `hand` | combat.ts:2182 | 4 |
| `command` | `target`, `at`, `order`, `to`, `by` | sigil.ts:1078 | 1 |
| `cond` | `target`, `at`, `id`, `resisted`, `element` | magic.ts:339 | 5 |
| `core` | `unit`, `at`, `dur`, `focus` | faith.ts:692 | 3 |
| `crystallise` | `unit`, `at`, `dur`, `self` | classes/k.ts:579 | 2 |
| `door` | `unit`, `at`, `open` | combat.ts:769 | 5 |
| `down` | `unit`, `at`, `dead`, `vanish`, `surrendered` | classes/j.ts:1162 | 4 |
| `draw` | `unit`, `at`, `tile`, `word`, `side`, `half`, `group`, `cls`, `element`, `effect`, `keystone`, `words`, `stroke`, `joins`, `junction` | classes/k.ts:349 | 3 |
| `drill` | `unit`, `at`, `weapon`, `add`, `total`, `mark`, `learned` | physical/rules.ts:81 | 1 |
| `drop` | `unit`, `target`, `at`, `name` | world.ts:319 | 1 |
| `duck` | `unit`, `from`, `to`, `by`, `out`, `cover` | classes/rev3.ts:267 | 1 |
| `evoke` | `unit`, `at`, `shape`, `tiles`, `area`, `src`, `impact`, `targets`, `words`, `element`, `stay`, `side`, `missiles`, `placed`, `fizzle`, `facing`, `by`, `targetAt`, `backlash`, `dir`, `fusion`, `fused`, `design`, `school` | classes/i.ts:799 | 9 |
| `explode` | `at`, `radius`, `what`, `element`, `charges`, `shake`, `tiles` | classes/j.ts:519 | 7 |
| `eye_storm` | `unit`, `at` | classes/rev3.ts:645 | 1 |
| `eye_storm_spent` | `unit`, `at`, `riderStage` | classes/rev3.ts:652 | 1 |
| `feed` | `unit`, `at`, `word`, `glyph`, `stage`, `mult` | magic.ts:1169 | 1 |
| `felt` | `unit`, `char`, `feeling`, `name`, `family`, `why` | feelings.ts:68 | 1 |
| `field` | `id`, `tiles`, `words`, `element`, `side`, `by`, `rounds` | sigil.ts:1172 | 1 |
| `field_gone` | `id`, `tile`, `tiles`, `side`, `why`, `only` | sigil.ts:1196 | 1 |
| `field_tick` | `id`, `target`, `at`, `element`, `side` | sigil.ts:1215 | 1 |
| `fizzle` | `unit`, `at`, `tiles`, `words`, `element` | sigil.ts:995 | 1 |
| `free_reload` | `unit`, `at`, `tech` | physical/ranged/takes.ts:208 | 1 |
| `fuse` | `unit`, `at`, `to`, `tiles`, `tone`, `element`, `stage` | magic.ts:1422 | 1 |
| `glyph_fade` | `tile`, `word`, `side`, `why` | classes/k.ts:351 | 6 |
| `guard` | `unit`, `at`, `now`, `was`, `max` | physical/core.ts:104 | 1 |
| `hazard` | `target`, `at`, `id`, `kind`, `severity`, `dmg`, `immune`, `attempt`, `spent` | hazards.ts:70 | 2 |
| `hazard_spotted` | `id`, `kind`, `at`, `tiles`, `by`, `how` | hazards.ts:69 | 3 |
| `heal` | `target`, `at`, `amount`, `revive` | classes/j.ts:456 | 8 |
| `heart_overwatch` | `unit`, `at`, `target`, `to`, `stage`, `tone` | magic.ts:1194 | 1 |
| `heat` | `unit`, `at`, `now`, `was`, `why`, `limit` | physical/ranged/press.ts:330 | 2 |
| `hold` | `unit`, `at`, `stage`, `tone`, `form`, `watch` | magic.ts:1178 | 2 |
| `hurt` | `target`, `at`, `dmg`, `why`, `killed`, `element`, `by` | combat.ts:719 | 8 |
| `image` | `id`, `owner`, `at`, `side`, `fooled` | illusion.ts:54 | 1 |
| `image_gone` | `id`, `owner`, `at`, `why` | illusion.ts:59 | 1 |
| `infusion` | `unit`, `target`, `at`, `element` | classes/j.ts:1040 | 2 |
| `intent` | `unit`, `target`, `at`, `kind`, `text`, `targetUnit`, `to`, `image` | combat.ts:2856 | 1 |
| `lane` | `unit`, `at`, `r` | physical/ranged/press.ts:45 | 1 |
| `lane_end` | `unit`, `why` | physical/ranged/press.ts:61 | 2 |
| `leech` | `unit`, `to`, `from`, `amount`, `element` | classes/k.ts:681 | 4 |
| `letgo` | `unit`, `at`, `stage`, `by`, `strain` | magic.ts:1138 | 1 |
| `light` | `at`, `tiles`, `side` | sigil.ts:1129 | 1 |
| `linger` | `unit`, `tiles`, `tone`, `element` | magic.ts:1572 | 1 |
| `load` | `unit`, `at`, `rounds`, `dur`, `special`, `weapon`, `hand` | combat.ts:2418 | 2 |
| `mana` | `band`, `mana` | game.ts:3591 | 2 |
| `mask` | `target`, `at`, `fade` | magic.ts:490 | 2 |
| `melee` | `unit`, `target`, `from`, `to`, `weapon`, `cat`, `mode`, `hit`, `crit`, `fumble`, `dmg`, `killed`, `jam`, `chain`, `thrown`, `round`, `step`, `object`, `image` | combat.ts:1394 | 6 |
| `miss` | `unit`, `target`, `at`, `by`, `element` | classes/soul.ts:35 | 3 |
| `momentum` | `unit`, `now`, `was` | perks/skeleton.ts:38 | 2 |
| `move` | `unit`, `from`, `to`, `path`, `how`, `sight` | classes/j.ts:556 | 3 |
| `null_wave` | `at`, `tiles`, `n`, `removed`, `glyphs`, `zones`, `walls` | classes/k.ts:916 | 2 |
| `object` | `at`, `what`, `dmg`, `broken`, `hp`, `element`, `max` | classes/k.ts:925 | 3 |
| `outburst` | `unit`, `at`, `design`, `school`, `hold`, `stage`, `form`, `tone`, `element`, `watch` | classes/k.ts:1493 | 2 |
| `overload` | `unit`, `at` | classes/i.ts:99 | 2 |
| `overwatch` | `unit`, `target`, `from`, `at`, `mode`, `id` | combat.ts:1841 | 2 |
| `perk` | `unit`, `target`, `from`, `to`, `id` | perks/c.ts:410 | 4 |
| `pickup` | `unit`, `at`, `items` | combat.ts:2403 | 1 |
| `pile` | `at`, `id`, `count`, `why` | combat.ts:2221 | 2 |
| `practice` | `unit`, `gain`, `total` | magic.ts:1598 | 1 |
| `pressure` | `unit`, `at`, `now`, `was`, `state`, `by`, `why`, `hidden` | physical/pressure.ts:48 | 2 |
| `pull_free` | `unit`, `target`, `at`, `weapon` | combat.ts:1666 | 2 |
| `pump` | `unit`, `at`, `stage`, `mult`, `free`, `max`, `tone`, `manifest`, `overflow`, `form`, `mp`, `feeling`, `overload`, `overdraw` | classes/k.ts:538 | 6 |
| `release` | `unit`, `at`, `to`, `school`, `form`, `tone`, `element`, `stage`, `body`, `targets`, `area`, `wild`, `air`, `design`, `school2`, `option`, `mult`, `riderStage`, `reaction`, `resonance`, `felt`, `does` | classes/k.ts:1554 | 3 |
| `reload` | `unit`, `at`, `weapon`, `cat`, `how`, `dur`, `left`, `ammo`, `cap`, `noDrop`, `rounds`, `tactical`, `hand` | classes/i.ts:201 | 6 |
| `repair` | `unit`, `target`, `at`, `dur` | classes/rev3.ts:508 | 7 |
| `residue` | `unit`, `tiles`, `feeling`, `family`, `kind`, `side`, `rounds` | magic.ts:1583 | 1 |
| `residue_tick` | `unit`, `at`, `feeling`, `kind`, `when` | magic.ts:1616 | 1 |
| `resonance` | `unit`, `at`, `with`, `bonus`, `perk` | magic.ts:1435 | 2 |
| `revert` | `unit`, `at`, `stage`, `mult`, `feeling` | magic.ts:1094 | 1 |
| `rig` | `unit`, `at`, `id`, `only` | classes/rev3.ts:335 | 2 |
| `roll` | `roll`, `unit`, `at`, `by`, `fam`, `why`, `die`, `dice`, `mod`, `total`, `tn`, `ok`, `nat`, `skipped` | rolls.ts:91 | 1 |
| `routed` | `unit`, `from`, `to`, `by` | physical/ranged/takes.ts:100 | 1 |
| `sabotage` | `unit`, `target`, `at`, `rounds`, `what` | classes/rev3.ts:304 | 2 |
| `sabotage_end` | `at`, `what` | classes/rev3.ts:349 | 2 |
| `save` | `unit`, `at`, `ok`, `tech`, `die`, `only` | physical/core.ts:497 | 1 |
| `scuff` | `unit`, `at` | sigil.ts:924 | 1 |
| `search` | `unit`, `at`, `obj`, `items` | world.ts:356 | 1 |
| `shield` | `target`, `at`, `absorbed`, `gained`, `amount` | classes/i.ts:832 | 7 |
| `short` | `unit`, `at`, `held`, `tone`, `element`, `strain`, `limit` | magic.ts:936 | 1 |
| `shot` | `unit`, `target`, `from`, `to`, `weapon`, `cat`, `mode`, `hit`, `crit`, `fumble`, `dmg`, `killed`, `jam`, `chain`, `thrown`, `round`, `step`, `object`, `image`, `ricochet`, `tech`, `vi`, `technique` | classes/j.ts:815 | 11 |
| `shove` | `unit`, `target`, `from`, `to`, `ok`, `interpose`, `prone`, `path`, `pull`, `magic`, `swap`, `object` | classes/i.ts:401 | 18 |
| `shrug` | `unit`, `at`, `cond` | classes/rev3.ts:83 | 1 |
| `sight` | `unit`, `at`, `how`, `only` | combat.ts:1069 | 3 |
| `sigil_growth` | `unit`, `at`, `study`, `mastered` | sigil.ts:413 | 1 |
| `silver_tongue` | `unit`, `target`, `from`, `to`, `ok`, `ap` | classes/rev3.ts:392 | 1 |
| `song` | `unit`, `at` | game.ts:1606 | 1 |
| `spawn` | `unit`, `at`, `owner`, `block` | owned.ts:114 | 1 |
| `spot` | `unit`, `at`, `target`, `to`, `only` | physical/ranged/sets.ts:124 | 1 |
| `stance` | `unit`, `at`, `what`, `target` | classes/i.ts:248 | 15 |
| `steady` | `unit`, `at`, `by`, `strain`, `stage` | magic.ts:1153 | 1 |
| `stim` | `unit`, `target`, `from`, `to`, `heal`, `revive`, `thrown` | combat.ts:2542 | 3 |
| `stopped` | `unit`, `how`, `by`, `apLoss`, `untilAp` | physical/core.ts:550 | 1 |
| `strain` | `unit`, `at`, `strain`, `limit`, `by`, `why`, `over` | magic.ts:889 | 1 |
| `swap` | `unit`, `target`, `from`, `to` | classes/rev3.ts:418 | 1 |
| `swap_in` | `unit`, `at`, `weapon`, `from`, `tech` | physical/core.ts:877 | 1 |
| `swell` | `unit`, `at`, `stage`, `mult`, `tone`, `forms` | classes/k.ts:1528 | 2 |
| `syphon` | `unit`, `at`, `mp` | classes/i.ts:1301 | 2 |
| `technique` | `unit`, `id`, `group`, `system`, `target`, `hand`, `at`, `reaction`, `tile`, `line`, `opt`, `ammo`, `weapon` | physical/core.ts:800 | 2 |
| `thread` | `unit`, `a`, `b` | magic.ts:1571 | 1 |
| `trap` | `unit`, `at` | combat.ts:1982 | 1 |
| `trap_gone` | `id`, `tile`, `tiles`, `side`, `why`, `only` | sigil.ts:1196 | 1 |
| `trap_set` | `id`, `tile`, `side`, `by`, `words`, `element`, `only` | sigil.ts:1159 | 1 |
| `trap_spotted` | `id`, `tile`, `by`, `side`, `only`, `kind` | magic.ts:1563 | 2 |
| `trap_sprung` | `id`, `tile`, `target`, `element`, `side`, `words` | sigil.ts:1223 | 1 |
| `turn` | `unit`, `side`, `at`, `summon`, `round` | classes/k.ts:1663 | 3 |
| `turret_destroyed` | `id`, `tile`, `tiles`, `side`, `why`, `only` | sigil.ts:1196 | 1 |
| `turret_placed` | `id`, `tile`, `side`, `by`, `words`, `element`, `hidden`, `only` | sigil.ts:1152 | 1 |
| `turret_shot` | `id`, `tile`, `target`, `at`, `side`, `grand`, `lob`, `from`, `to`, `element`, `path`, `kind`, `burst`, `chain` | classes/k.ts:943 | 4 |
| `unmake` | `unit`, `at` | owned.ts:125 | 1 |
| `unstoppable` | `unit`, `at`, `ignored` | classes/rev3.ts:204 | 1 |
| `veil` | `at`, `tiles`, `side` | sigil.ts:1128 | 1 |
| `vent` | `unit`, `at`, `flux`, `heart`, `bleed` | classes/k.ts:558 | 3 |
| `volley` | `unit`, `target`, `from`, `weapon`, `cat`, `mode`, `name`, `shots`, `to`, `tech` | classes/j.ts:110 | 11 |
| `wall_crumbled` | `tiles`, `why` | classes/k.ts:915 | 3 |
| `wall_raised` | `tiles`, `by`, `side`, `hp`, `rounds`, `rune` | classes/i.ts:800 | 2 |
| `watch_end` | `unit`, `at`, `id`, `why` | physical/core.ts:777 | 5 |
| `watch_fire` | `unit`, `target`, `from`, `at`, `id`, `mode` | physical/core.ts:789 | 1 |
| `watch_set` | `unit`, `at`, `id`, `trigger`, `tile`, `tiles`, `allyId`, `targetId` | physical/core.ts:771 | 1 |

### `{=placeholder}` formats (`datatext.ts` `FORMATS`)

`{=path}` reads a field of the same item; `{=path|format}` with format one of `abs`, `signed`, `pct`, `more`, `less`.

### `Unit` fields (171; `combat.ts`)

A limit, a round stamp or a cooldown is NOT a new field here: it is a `uses(h)` cell (`effects/uses.ts`).

`id`, `side`, `name`, `short`, `charId`, `img`, `tier`, `pos`, `hp`, `maxHp`, `def`, `armour`, `attack`, `weapon`, `movement`, `init`, `agility`, `ap`, `bank`, `ammo`, `heat`, `jammed`, `shotsThisTurn`, `downed`, `dead`, `saves`, `stunnedNext`, `kills`, `undying`, `song`, `npcId`, `waitRound`, `injuries`, `bleed`, `dazedNext`, `injResist`, `hand`, `mags`, `loose`, `extra`, `analyzedBy`, `weakPoint`, `analysis`, `vigilant`, `overweight`, `prone`, `braced`, `overwatch`, `reactedRound`, `vision`, `sensory`, `noSprint`, `strength`, `guardBrace`, `dmgMult`, `dur`, `maxDur`, `mods`, `offWeapon`, `offAmmo`, `light`, `darkSight`, `hazardImmune`, `ignoreDifficult`, `unarmedBonus`, `moved`, `firstShotDone`, `proficiency`, `parts`, `baseArmour`, `dexterity`, `athleticsPts`, `mg`, `conds`, `shield`, `shields`, `baseMove`, `baseVision`, `held`, `ps`, `uses`, `armed`, `apNext`, `apDebt`, `apGained`, `apTurnTotal`, `lastHitBy`, `damagedBy`, `sv`, `dbf`, `sk`, `condBy`, `condVia`, `condArg`, `condFresh`, `hidden`, `hideEntry`, `ambushUsed`, `maskLeft`, `maskFresh`, `condAt`, `kind`, `tags`, `surrendered`, `subdued`, `surrenderTried`, `reactUsed`, `owShots`, `owSpend`, `keepForHeld`, `eyes`, `firstShotTurn`, `sprinted`, `attackedTurn`, `openerUsed`, `edgeWord`, `skipTurn`, `level`, `lvlDmg`, `critTaken`, `elemTaken`, `ambushTaken`, `healRecv`, `shieldRecv`, `counter`, `throwRange`, `ambushMult`, `blessPower`, `ingMod`, `stealth`, `ammoType`, `magTypes`, `throwables`, `offMags`, `offMagTypes`, `offAmmoType`, `offLoose`, `offJammed`, `swapMain`, `ctrl`, `companion`, `owned`, `allowedActions`, `infiniteAmmo`, `res`, `resMax`, `offItem`, `durability`, `pressure`, `pressHidden`, `pressBy`, `hitRound`, `hitWith`, `stopped`, `watch`, `chain`, `tech`, `setUp`, `techs`, `quiver`, `freeReload`, `call`, `calls`, `callLevel`, `stuck`, `nailed`, `vow`, `faith`, `tended`, `readIntent`, `drops`.

### `Combat` fields (58; `combat.ts`)

A limit, a round stamp or a cooldown is NOT a new field here: it is a `uses(h)` cell (`effects/uses.ts`).

`noXp`, `level`, `name`, `map`, `units`, `order`, `turn`, `round`, `difficulty`, `log`, `over`, `summary`, `floor`, `notes`, `cover`, `rubble`, `objects`, `glyphs`, `zones`, `mana`, `deadSeen`, `glyphSeq`, `delayed`, `ties`, `traces`, `sigilV`, `condSeq`, `sighted`, `song`, `fx`, `fxSeq`, `actFrom`, `critNotes`, `window`, `reacting`, `mods`, `overworld`, `sightWas`, `sightSeen`, `sightPos`, `sightWhy`, `fire`, `doctrineSaid`, `lastSeen`, `seenAt`, `logSee`, `fog`, `fear`, `images`, `fromTalk`, `hazards`, `worldRng`, `hazardHits`, `dropped`, `lootTables`, `lootRolled`, `lootLog`, `dropLines`.


## (d) The guards

What fails when someone goes round a primitive, and how to re-record a pinned table ON PURPOSE (read the diff first; `python3 tools/golden_diff.py --rev <base>` lists what moved). The description is the first sentence of each file's header comment. The patterns the lints share with `tools/built_from.py` are in `packages/engine/test/lint-patterns.json`.

| guard | what it holds (a failure means this broke) | re-record |
| --- | --- | --- |
| `packages/engine/test/actions.test.ts` | The basic actions as the client is given them (engine review 4, finding 1): every row's cost is the AP the reducer takes for that action, for a plain unit and for the holders of the items that change it; a move is offered only where moveUnit() would accept it… | none (fix the code, or change the test on purpose) |
| `packages/engine/test/amount-literals.test.ts` | Step a6 of the damage-formula migration (docs/design/handoffs/unified-damage-stage-a.md): the numbers an item deals, heals or shields with live in its DATA (an `amounts` block), read through effects/amounts.ts. | none (fix the code, or change the test on purpose) |
| `packages/engine/test/balance-contract.test.ts` | THE BALANCE CONTRACT (rules 1.26, the re-fit; docs/design/balance-contract.md). | none (fix the code, or change the test on purpose) |
| `packages/engine/test/datatext.test.ts` | Texts read their numbers (docs/design/handoffs/text-number-truth.md, second pass). | none (fix the code, or change the test on purpose) |
| `packages/engine/test/descriptors.test.ts` | Action descriptors (engine review 4, finding 3): every action a unit can take is reachable through actionsFor, and sendDescriptor sends exactly what the screens' own Confirm branches sent before (the reference below is a copy of apps/web/src/screens/combat.js… | none (fix the code, or change the test on purpose) |
| `packages/engine/test/engine-hooks.test.ts` | The engine's catalogue and its self-check (docs/ENGINE-HOOKS.md, generated by tools/engine_catalog.py; tools/built_from.py). | none (fix the code, or change the test on purpose) |
| `packages/engine/test/fog-view.test.ts` | What each player's view of a fight holds (engine review 4, finding 4: fog of war in the engine; fog.ts). | none (fix the code, or change the test on purpose) |
| `packages/engine/test/golden-conditions.test.ts` | The conditions table of engine foundations 2 (test/golden/conds.ts): every condition on every tier and on a character, through its whole life (apply, stack, tick, cleanse, end), from each kind of source, with immunities and with every item that changes it. | `GOLDEN_RECORD=1 npm test -w @phc/engine -- golden-conditions`; `GOLDEN_RECORD=log npm test -w @phc/engine -- golden-conditions` |
| `packages/engine/test/golden-costs-askers-perks.test.ts` | The costs tables of engine foundations 2 (test/golden/costs.ts): what every action takes and gives, action by action. | `GOLDEN_RECORD=1 npm test -w @phc/engine -- golden-costs-askers-perks`; `GOLDEN_RECORD=marks npm test -w @phc/engine -- golden-costs-askers-perks` |
| `packages/engine/test/golden-costs-askers.test.ts` | The costs tables of engine foundations 2 (test/golden/costs.ts): what every action takes and gives, action by action. | `GOLDEN_RECORD=1 npm test -w @phc/engine -- golden-costs-askers`; `GOLDEN_RECORD=marks npm test -w @phc/engine -- golden-costs-askers` |
| `packages/engine/test/golden-costs-items.test.ts` | The costs tables of engine foundations 2 (test/golden/costs.ts): what every action takes and gives, action by action. | `GOLDEN_RECORD=1 npm test -w @phc/engine -- golden-costs-items`; `GOLDEN_RECORD=marks npm test -w @phc/engine -- golden-costs-items` |
| `packages/engine/test/golden-costs-pad.test.ts` | The costs tables of engine foundations 2 (test/golden/costs.ts): what every action takes and gives, action by action. | `GOLDEN_RECORD=1 npm test -w @phc/engine -- golden-costs-pad`; `GOLDEN_RECORD=marks npm test -w @phc/engine -- golden-costs-pad` |
| `packages/engine/test/golden-costs-review.test.ts` | The costs tables added by the review of engine foundations 2 (test/golden/costs.ts: credit, foes, cooldowns): every action under a Brief and an Encore, an enemy's turn with every gun, and when each cooldown comes back. | `GOLDEN_RECORD=1 npm test -w @phc/engine -- golden-costs-review`; `GOLDEN_RECORD=marks npm test -w @phc/engine -- golden-costs-review` |
| `packages/engine/test/golden-costs.test.ts` | The costs tables of engine foundations 2 (test/golden/costs.ts): what every action takes and gives, action by action. | `GOLDEN_RECORD=1 npm test -w @phc/engine -- golden-costs`; `GOLDEN_RECORD=marks npm test -w @phc/engine -- golden-costs` |
| `packages/engine/test/golden-damage-builds-allin.test.ts` | The golden tables of the damage-formula migration (docs/design/proposals/2026-11-unified-damage.md, stage (a), step a0): what the engine produces and what lands, action by action, exact, against test/golden/*.json. | `GOLDEN_RECORD=1 npm test -w @phc/engine -- golden-damage-builds-allin` |
| `packages/engine/test/golden-damage-builds-normal.test.ts` | The golden tables of the damage-formula migration (docs/design/proposals/2026-11-unified-damage.md, stage (a), step a0): what the engine produces and what lands, action by action, exact, against test/golden/*.json. | `GOLDEN_RECORD=1 npm test -w @phc/engine -- golden-damage-builds-normal` |
| `packages/engine/test/golden-damage-magic.test.ts` | The golden tables of the damage-formula migration (docs/design/proposals/2026-11-unified-damage.md, stage (a), step a0): what the engine produces and what lands, action by action, exact, against test/golden/*.json. | `GOLDEN_RECORD=1 npm test -w @phc/engine -- golden-damage-magic` |
| `packages/engine/test/golden-damage-perks.test.ts` | The golden tables of the damage-formula migration (docs/design/proposals/2026-11-unified-damage.md, stage (a), step a0): what the engine produces and what lands, action by action, exact, against test/golden/*.json. | `GOLDEN_RECORD=1 npm test -w @phc/engine -- golden-damage-perks` |
| `packages/engine/test/golden-damage-shelved.test.ts` | The golden tables of the damage-formula migration, step a6 (docs/design/handoffs/unified-damage-stage-a.md): the numbers that were written in TypeScript and now live in data, recorded BEFORE they were moved. | `GOLDEN_RECORD=1 npm test -w @phc/engine -- golden-damage-shelved` |
| `packages/engine/test/golden-damage-techniques.test.ts` | The golden tables of the damage-formula migration (docs/design/proposals/2026-11-unified-damage.md, stage (a), step a0): what the engine produces and what lands, action by action, exact, against test/golden/*.json. | `GOLDEN_RECORD=1 npm test -w @phc/engine -- golden-damage-techniques` |
| `packages/engine/test/golden-damage-traits-classes.test.ts` | The golden tables of the damage-formula migration (docs/design/proposals/2026-11-unified-damage.md, stage (a), step a0): what the engine produces and what lands, action by action, exact, against test/golden/*.json. | `GOLDEN_RECORD=1 npm test -w @phc/engine -- golden-damage-traits-classes` |
| `packages/engine/test/golden-damage.test.ts` | The golden tables of the damage-formula migration (docs/design/proposals/2026-11-unified-damage.md, stage (a), step a0): what the engine produces and what lands, action by action, exact, against test/golden/*.json. | `GOLDEN_RECORD=1 npm test -w @phc/engine -- golden-damage` |
| `packages/engine/test/golden-itemops.test.ts` | The item-ops table (engine foundations 3: docs/design/handoffs/engine-foundations-3-item-ops.md): every live item in every situation, recorded on the engine before any item moved into data (test/golden/itemops.ts). | `GOLDEN_RECORD=1 npm test -w @phc/engine -- golden-itemops`; `GOLDEN_RECORD=log npm test -w @phc/engine -- golden-itemops` |
| `packages/engine/test/golden-rules.test.ts` | The rules tables of engine foundations 1 (test/golden/rules.ts): what the dice and the rules did, action by action, for the same actions as the damage tables. | `GOLDEN_RECORD=1 npm test -w @phc/engine -- golden-rules`; `GOLDEN_RECORD=log npm test -w @phc/engine -- golden-rules` |
| `packages/engine/test/item-ops.test.ts` | Item ops (engine foundations 3: docs/design/handoffs/engine-foundations-3-item-ops.md). | `ITEM_OPS_WRITE=1 npm test -w @phc/engine -- item-ops` |
| `packages/engine/test/lint-conditions.test.ts` | THE LINT of engine foundations 2 (conditions; the area shapes of the kit). | none (fix the code, or change the test on purpose) |
| `packages/engine/test/lint-costs.test.ts` | THE COST AND COUNTER LINT (engine foundations 2). | none (fix the code, or change the test on purpose) |
| `packages/engine/test/lint-foundations.test.ts` | THE FOUNDATION LINT (engine foundations 1). | none (fix the code, or change the test on purpose) |
| `packages/engine/test/lint-item-ops.test.ts` | THE ITEM-OPS RATCHET (engine foundations 3: docs/design/handoffs/engine-foundations-3-item-ops.md). | `LINT_RECORD=1 npm test -w @phc/engine -- lint-item-ops` |
| `packages/engine/test/replay-hash.test.ts` | THE REPLAY GUARD: whole seeded games with the enemy AI on, compared hash for hash with test/golden/replays.json. | `REPLAY_RECORD=1 npm test -w @phc/engine -- replay-hash` |
| `packages/engine/test/shared-state.test.ts` | WHAT apply() SHARES WITH THE STATE IT WAS GIVEN (game.ts, workingCopy): the campaign, the lines of the archive, and the campaign a Proving Ground parked in sandbox.saved. | none (fix the code, or change the test on purpose) |
| `packages/engine/test/suite-shape.test.ts` | WHAT `npm run check` RUNS OF THE BALANCE SIMULATOR (docs/TESTING.md). | none (fix the code, or change the test on purpose) |
| `packages/engine/test/test-lint.test.ts` | A lint over every test file in the repo (engine, web, server, the browser suites). | none (fix the code, or change the test on purpose) |
| `packages/engine/test/text-number-truth.test.ts` | Text and number truth (docs/design/handoffs/text-number-truth.md): what the engine prints must name a rule the way the data names it today. | none (fix the code, or change the test on purpose) |
| `apps/web/src/game/boundary.test.ts` | The client's boundary with the engine, as a lint (engine review 4, findings 1, 2 and 9). | none (fix the client: ask the engine) |
| `tools/validate.py` | Cross-reference validator for the PHC data pack. |  |
| `tools/text_numbers.py` | The text-number guard (run by tools/validate.py, so by `npm run check`), second form (12 Nov 2026). |  |
| `tools/check_spec_tables.py` | The spec's tables against the data pack: weapons, enemy tiers and levels, conditions. |  |
| `tools/engine_catalog.py` | THE ENGINE'S EXTENSION POINTS, GENERATED: writes docs/ENGINE-HOOKS.md from the engine's source and data. |  |
| `tools/built_from.py` | A lone session's self-check: is this built FROM the engine, or BESIDE it? |  |
