# Figments 2.0: a door you play every turn (proposal, full size)

15 Nov 2026, second draft (the first, 0bbbf456, was too small). Status: **design, nothing built**. Every number
below is PROVISIONAL and a data field (`data/figments.json` unless named); if accepted, the spec (rules 1.34) changes
first, as a new revision, with its numbers as spec items 2150 to 2199. Every item is `adjudication: engine`.

Leon, playtest 15 Nov 2026, verbatim: "This system need like 20 more things to be competitive with the other, the
visualization perk mirage is also really underwheelming"; "visualization feels underwhelming as shit bro, no unlocks,
no notthing"; "feels like mf just standing their doing notthing".

The lead's rulings on the first draft: (1) a real choice at the mastery steps, so two Riggers differ; (2) Hand and
Snare are in; (3) growth by new jobs is right but not enough: **every form gets at least one active command**, and
perk steps sit on top of the class's damage line (the line itself is refitted in Balance 2.0: nothing here is designed
around trimming); (4) monoline icons now, painted portraits later.

## 1. Where the door stands against the other doors

| Door | What a player chooses and earns | What it does on a turn |
|---|---|---|
| Sigil (rules 1.4, 1.10) | 40 words in five groups, study picks, a Mastered word's inflection, grand forms | draws glyphs, walks a Line, Evokes |
| Outburst (rules 1.8, 1.19) | schools and their ways, modules by practice, tones, 25 feelings found in play, 5 shapes | Begins, Pumps (with a feeling), Releases |
| Blessings (rules 1.6, 1.31) | a patron, Devotion XP, Hymns I to III, the Miracle | Whispers, Hymns, interventions |
| **Figments today** | a fixed ladder: 5 forms, 10 traits nobody can reach (no design editor in the client), nothing found, nothing picked | Picture (2 AP), then mostly waits: only the Eye, Beast and Blade have an order |

What 2.0 gives (section 9 counts it): **14 forms** (9 new), **an order on every form** plus three caster orders,
**22 traits** (12 new) with **12 found by deeds**, **three forks** at the mastery steps, **sketching** (practice
picks), **five crossings** with the other doors, a reworked **Mirage** and **Solid Image**, and a Mastered
**capstone** (Lucid). 40 additions in all.

## 2. The forms (14, each a different job on the grid)

Every form is one row of `forms[]` (the shape of today's rows: `id, name, owned_kind: "figment", turn, eyes, lure,
cover, charge, hp, defense, armour, movement, weapon, flies, vision, actions, verbs, hold, effects, upkeep, glyph`,
plus `icon`, section 7). Its order is one row of `verbs[]` (today's shape: `id, name, site, attack, reach, dash,
on_hit, effects, unmake, refund_share`), run by `runDataVerb` (owned.ts) with the Figment as the actor and its owner
paying. A new weapon (`figment_*`) is one row in `data/weapons.json`, never carried, bought or dropped, like
`figment_claws`. "Opens" refers to the ladder (section 4). Every number is PROVISIONAL.

| # | Form | Job | Opens | Body (data row) | Its order (one `verbs[]` row) | Built from |
|---|---|---|---|---|---|---|
| | Double | lure | V1 | today's | **Draw fire** (new, 1 AP): every enemy within 3 that sees it makes a Brain save against your Visualization or is Taunted by it for 1 round. `effects: [{op: condition, condition: taunted, rounds: 1, via: visualization, targets: {of: self, within: 3, side: foe, sees: true}}]` | op `condition` with `targets` (`TargetSet`), the `taunted` row |
| | Eye | scout | Fork A | today's | Stare (today's) | today's `figment_stare` |
| | Wall | cover | Fork A | today's | **Press** (new, 1 AP): it shoves an enemy next to it 1 tile. `reach: {tiles: 1, side: foe}, effects: [{op: displace, how: push, tiles: 1}]` | op `displace` (`displace`, `forced_movement.push`) |
| | Beast | striker | Fork B | today's | Strike, Pounce (today's) | today's |
| | Blade | guard of tiles | Fork B | today's | Cut, Hold (today's) | today's |
| 1 | **Snare** | trap | V1 | 10 HP, Def 8, movement 1, charge 1, weapon `figment_snare` (on hit: `ap_loss` 2), `hold: {reaction: attack}`; `effects: [{op: unmake, when: hit, if: {actor: self}}]` | **Trip** (2 AP): its Cut now, on an enemy next to it (site `figment_cut`) | the Blade's `hold`, weapon op `on_hit` (`ap_loss`), trigger `hit`, op `unmake` |
| 2 | **Hand** | courier | V2 | 20 HP, Def 14, flies, movement 3, charge 2, no weapon | **Hand over** (1 AP and one of your stims): an ally next to the Hand is mended by the stim's own amount block. `reach: {tiles: 1, side: ally}, effects: [{op: mend, amount: stim, target: target}]`. **Filch** (2 AP): it takes a throwable (else a spare magazine) from an enemy next to it into the pile under it; Body save against your Visualization keeps it. `effects: [{op: take, save: body, via: visualization}]` | op `mend` (the stim's `amounts`), op `take`, cost site with a resource (P4) |
| 3 | **Ward** | bodyguard | Fork A | 40 HP, Def 12, armour 3, movement 2, charge 3; `effects: [{op: redirect, when: taking, share: 0.5, if: {target: ally, target_within: 1}, limit: {per: per_round, n: 1}}]` (half the first blow a round on an ally next to it lands on the Ward) | **Interpose** (1 AP): it steps to a free tile next to an ally within 3. `effects: [{op: displace, to: tile, tiles: 3}]` | op `redirect`, predicates `target`, `target_within`, `limit`, op `displace` (`to: tile`, no target: the holder steps) |
| 4 | **Husk** | decoy that explodes | Fork B | 20 HP, your Defense, your pace, charge 2, `lure: true`; `amounts.burst` (flat, explosive) | **Burst** (1 AP): it bursts: its `burst` on every unit within 1, both sides, and it is gone (no Snap, no refund). `effects: [{op: deal, amount: burst, targets: {of: self, shape: aura, within: 1, side: any}}, {op: unmake}]` | the lure (`lure` in the owned record), op `deal` with `targets`, op `unmake` |
| 5 | **Sentinel** | turret | Fork B | 30 HP, Def 10, armour 3, movement 0, charge 4, weapon `figment_lance` (ranged), `turn: auto`, `auto: {verb: shot, target: nearest_foe}` | **Fix** (2 AP): its shot now at an enemy it sees within 8 (`attack: shot, reach: {tiles: 8, side: foe, eyes: true}`, site `figment_strike`) | `OwnedBlock.turn: auto` and `auto` (the Scrap Turret's), `runDataVerb` attack |
| 6 | **Glass** | mender's mirror | Fork C | 20 HP, Def 12, flies, movement 2, charge 3; `amounts.reflect` (heal); `effects: [{op: mend, when: heal_given, amount: reflect, if: {target: ally, target_within: 2}, targets: {of: self, within: 1, side: ally, max: 1}, limit: {per: per_round, n: 1}}]` (an ally near it is healed: another ally next to the Glass gets its `reflect`) | **Reflect** (1 AP, once a turn): its `reflect` on an ally next to it. `reach: {tiles: 1, side: ally}, effects: [{op: mend, amount: reflect, target: target}]` | trigger `heal_given`, op `mend` with `targets`, `limit` |
| 7 | **Ferry** | carrier and mount | Fork C | 35 HP, Def 11, armour 2, movement 4, charge 3 | **Carry** (1 AP): an ally next to it is moved, willing, to a free tile within 3 of it. **Ride** (1 AP): you, next to it, are moved so. `effects: [{op: displace, to: tile, tiles: 3, how: guide, targets: {of: self, within: 1, side: ally, max: 1}}]` (Ride: `targets.tied: {kind: owned}`) | op `displace` (`to: tile`, `guide`), `TargetSet.tied` |
| 8 | **Breaker** | breaker of cover | Fork C | 50 HP, Def 8, armour 4, movement 2, charge 3, weapon `figment_ram`; `effects: [{op: immunity, to: knockback}]` | **Batter** (2 AP): breaks the cover or door on a tile next to it. `effects: [{op: object, do: break, has: cover}]` | op `object` (`do: break`) |
| 9 | **Hush** | jammer | Fork C | 20 HP, Def 13, flies, movement 3, charge 3; `effects: [{op: roll_mod, when: to_hit, value: -2, if: {actor: foe, actor_kind: [robot], actor_within: 2}}]` (machines near it aim worse) | **Jam** (1 AP): an enemy within 4 that it sees makes a Brain save against your Visualization or is Silenced 1 round. `reach: {tiles: 4, side: foe, eyes: true}, effects: [{op: condition, condition: silenced, rounds: 1, via: visualization}]` | trigger `to_hit`, op `roll_mod`, predicates `actor_kind`, `actor_within`; op `condition`, the `silenced` row |

The Scrap Turret stays the Rigger's (a machine, not a Figment). The Sigil word WATCH and the Sentinel differ: WATCH is
a Line's field turret paid in Flux; the Sentinel is a body with HP that the enemy can kill and that you can order.

**Build notes (general figment code, no closed list):** `runDataVerb` checks a unit target's reach today; a tile
order (Batter, Carry, Ride, Redraw) needs the same check for its tile (`reach.tile`, as `REACH_FIELDS`), written once
for every tile verb. An `ally` side in `reach.side` is read where `foe` is today.

## 3. Caster orders (any Figment of yours)

Each is one row of `verbs[]`, added to every form's `verbs` list by the loader (as `let_go` is listed on each today).

| # | Order | Rule a player reads | Data row | Built from |
|---|---|---|---|---|
| 10 | **Redraw** (1 AP, 1 charge) | Your Figment comes apart and reforms on a free tile within 4 of it. | `{id: redraw, site: figment_order, res: {vcharge: 1}, effects: [{op: displace, to: tile, tiles: 4, how: teleport}]}` | op `displace` (`to: tile`), `forced_movement.teleport` |
| 11 | **Cash in** (1 AP) | Unmake it on purpose: all its made charge goes back into the core (Let go: half, 0 AP). | `{id: cash_in, site: figment_order, unmake: true, refund_share: 1}` | `runDataVerb` `unmake` with `refund_share` (exactly today's Let go path) |
| 12 | **Look through** (1 AP) | Until your next turn, you see from its tile, and your Picture, Evoke, Release and Whisper may start there. | `{id: look_through, site: figment_order, seat: {rounds: 1}}` | **P3** (the seat) |

**Swap places** is not added: the Rigger's Sleight already swaps with a Figment (`trickster.sleight`), and a door copy
would be a second copy of one rule. **Merge** is not added: no piece makes one unit from two, and it would need one.

## 4. Growth

### 4.1 The ladder with forks (one choice at each mastery step)

A fork is a pick list (`registerPickList('figment_forks', ...)`), taken out of a fight by a reducer action in the
shape of `sigil/learn` (`figments/fork`), shown on the level-up card. A taken form is kept for good
(`c.figmentForms`). A form not taken comes later by the "one more" rows. Ladder rows gain two fields: `fork: {id,
of: [form ids]}` and `more: {of: [fork ids], n}`.

| # | Visualization | What opens |
|---|---|---|
| 13 | 1 | Picture; **Double and Snare**; 1 held; range 5; Redraw, Cash in |
| | 2 | **Hand** |
| | 3 (M1) | **Fork A: Eye, Wall or Ward** (one); 2 designs; 1 trait slot; the design editor |
| | 4 | Look through (with P3) |
| | 5 (M2) | **Fork B: Beast, Blade, Husk or Sentinel** (one); 2 held; 3 designs |
| | 7 (M3) | **Fork C: Glass, Ferry, Breaker or Hush** (one); one more form from Fork A; 3 held; 2 trait slots |
| | 8 | one more form from Fork B; 4 designs |
| | 9 (M4) | one more form from any fork; no Snap |
| | 10 (Mastered) | every form; 5 designs; **Lucid** (item 19); Solid Image (item 21) |

Data: `ladder[]` rows (`points, held, forms, designs, traits, no_snap, fork, more, text`), read by `ladderAt`. At
Visualization 7, a Rigger has made three choices out of eleven forms: two Riggers at the same points differ.

### 4.2 Sightings (traits found by deeds; table in 5.2)

| # | Item | Rule | Data | Built from |
|---|---|---|---|---|
| 14 | **Sightings** | The first time a deed happens, you know that trait for good: a cut-in line and a mark on the trait. | each trait's `sight: {when, if}`; the door item (`skills.json visualization` door row) carries one effect per sighting: `{op: unlock, list: figment_traits, id, when, if, limit: {per: per_campaign, n: 1}}` | triggers and predicates by name in 5.2; **P1** (the unlock op) |
| 15 | **The unlock moment** | Anything that opens (a ladder row, a fork, a sighting, a sketch) shows a card with its icon and a line in the log. | the unlock's `fx` (`unlocked`, fields `unit, list, id, name, why`) and `say` | `emitFx`, `say`; the client's `cutIn.ts`; **P1** (slice 1 builds the ladder half without it) |

### 4.3 Sketching (practice picks)

| # | Item | Rule | Data | Built from |
|---|---|---|---|---|
| 16 | **Sketching** | Each order your Figments carry out earns 1 sketch; a Figment standing at the fight's end, 2. At 5, at 15 and then every 15 you pick a trait you have not found, or a form from a fork you have passed. Each Mastery level adds 5. | `practice: {door: figments, earn: [{when: acted, if: {action: [figment sites]}, n: 1}, {when: combat_over, if: {self_tied: {kind: owned}}, n: 2}], thresholds: [5, 15], then_every: 15, mastery_bonus: 5}` (the shape of `soul_modules.json practice`) | triggers `acted`, `combat_over`; predicates `action`, `self_tied`; **P2** (the ledger) |
| 17 | **Drill and rest** | A Survival training ground or rest gives sketches like any practice. | `survival.json train.practice` and `training.practice` already exist; they name the door through P2 | `TRAIN`, `TRAINING` (`run/progress.ts`) |
| 18 | **The design editor** | Make, name and keep designs (a form with its traits) on the FIGMENTS tab. | none new | the action `figments/design` (exists; the client never sends it) |

### 4.4 The capstone and the perks

| # | Item | Rule | Data | Built from |
|---|---|---|---|---|
| 19 | **Lucid** (Visualization 10) | You hold and order Figments without the Visualizer in hand (Picture still needs it), and your first two orders each turn cost 1 AP less. | ladder row 10: `hands_free: true`; an effect `{op: cost_mod, when: cost, value: -1, min: 0, if: {action: [figment sites]}, limit: {per: per_turn, n: 2}}` | `ladderAt` (the owned gate reads `hands_free`), trigger `cost`, op `cost_mod`, `limit` |
| 20 | **Mirage, reworked** (perk, Visualization 3) | I: 1 AP, once a turn, no charge: a false Figment of any form you know on a tile in range; a Wall's image blocks sight and paths for believers, any other draws their fire, until your next turn. II: two at once, and Picture onto your Mirage makes it real for 1 charge less. | `perks.json mirage` tiers: `grant_action {action: mirage, ap: 1, limit: {per: per_turn, n: 1}}`, `spawn_illusion {count, rounds, disbelieve, solid}` (the form names the image's kind: `wall` or `figure`); II: `cost_mod {res: vcharge, value: -1}` on Picture onto an image tile | op `spawn_illusion` (`illusion.ts`), `grant_action`, `cost_mod`; `pictureTileWhy` takes an image's tile (figment code) |
| 21 | **Solid Image, reworked** (Mastered perk) | Once a fight, 0 AP: one of your Mirages becomes a real Figment of its form, no charge, outside your held count. | `perks.json solid_image`: `limit: {per: per_combat, n: 1}` | `makeFigment` with `free` (the Rigger's Double's path) |

Perk steps sit on top of the class's damage line (the lead's ruling, 15 Nov). The class line, the `figment` profile
(`output.profiles.figment`, k 1.5) and the new amount blocks (`burst`, `reflect`, the new weapons) are fitted in
Balance 2.0 with `survival-run.ts` (`rigger`, `solo_rigger`, `four_casters`); nothing here is designed around a trim.

## 5. Traits (22: 10 today, 12 new)

A trait is one row of `traits[]` (today's shape: `id, name, charge, hp_mult, tiles, weight, range, upkeep, roll,
vision, amounts, effects, text`), plus `sight` (how it is found, P1) and `tone` (its element, for the tint). Its
effects run on the Figment as the holder (`figtrait_<id>` in `collect.ts`, today's path).

### 5.1 The new twelve

| # | Trait | Kind | Rule a player reads | Data | Built from |
|---|---|---|---|---|---|
| 22 | **Kindling** | tone: fire | Its hits set the target Burning. | `effects: [{op: condition, when: hit, condition: burning, via: visualization, if: {actor: self}}]`, `tone: fire` | trigger `hit`, op `condition` |
| 23 | **Rime** | tone: frost | Its hits Slow the target. | as 22, `slowed` | as 22 |
| 24 | **Static** | tone: storm | Its hits Daze the target. | as 22, `dazed` | as 22 |
| 25 | **Bedrock** | tone: stone | Nothing pushes it; it takes a fifth less damage. | `effects: [{op: immunity, to: knockback}, {op: damage_mult, when: taking, value: 0.8}]` | `immunity`, trigger `taking`, op `damage_mult` |
| 26 | **Gust** | tone: gale | Its hits push the target 1 tile. | `{op: displace, when: hit, how: push, tiles: 1, if: {actor: self}}` | trigger `hit`, op `displace` |
| 27 | **Caustic** | tone: acid | Its hits Corrode the target. | as 22, `corroded` | as 22 |
| 28 | **Skittish** | behaviour | Hit and still up, it steps to cover within 2. | `{op: displace, when: damaged, to: cover, tiles: 2, if: {self_alive: true}, limit: {per: per_round, n: 1}}` | trigger `damaged`, op `displace` (`to: cover`) |
| 29 | **Spiteful** | behaviour | Whoever destroys it is Marked. | `{op: condition, when: downed, condition: marked, skip_save: true, target: actor}` | trigger `downed`, op `condition` |
| 30 | **Stubborn** | behaviour | The first blow that would destroy it leaves it on 1 HP. | `{op: floor, when: would_drop, value: 1, limit: {per: per_combat, n: 1}}` | trigger `would_drop`, op `floor` |
| 31 | **Kindred** | behaviour | An ally next to it has +1 to hit. | `{op: roll_mod, when: to_hit, value: 1, if: {actor: ally, actor_within: 1}}` | trigger `to_hit`, op `roll_mod` |
| 32 | **Quiet** | trade-off | Enemies pick it last; it costs no extra charge. | `weight: 1, charge: -1` (cancels `trait_charge`) | the `weight` and `charge` fields (`figmentBlock`, `figmentCharge`) |
| 33 | **Overcharged** | trade-off | +2 to hit and a fifth more damage; it fades at the end of your next turn. | `roll: 2, rounds: 2, effects: [{op: damage_mult, when: dealing, value: 1.2, if: {actor: self}}]` | `roll` (today's field), `owned.left` (the lifetime the Rigger's Double uses; `figmentBlock` reads `rounds`), op `damage_mult` |

The other ten stay as they are: Armoured, Swift, Loud, Volatile, Tethered, Mirror, Barbed, Lasting, Keen, Hollow.

### 5.2 How each trait is found (a sighting, P1) or picked (sketching only)

The holder is the owner's door item; "your Figment" is `target_tied: {kind: owned, as: to}` (or `actor_tied`).

| Trait | Found the first time... | `sight: {when, if}` |
|---|---|---|
| Armoured | your Figment takes a hit and stays up | `damaged`; `by_hit`, `target_alive` |
| Hollow | you load a fresh core into the Visualizer in a fight | `acted`; `action: [swap_core]` |
| Barbed | an Elite or a Boss hits your Figment in melee and it stays up | `damaged`; `melee`, `actor_tier: [elite, boss]`, `target_alive` |
| Volatile | your Figment is hit by an explosion | `damaged`; `damage: [explosive]` |
| Lasting | a Figment of yours is still standing when the fight is decided | `combat_over`; `self_tied: {kind: owned}` |
| Spiteful | an enemy destroys your Figment | `downed`; `actor: foe` |
| Stubborn | your Figment is left under a quarter of its HP and stays up | `damaged`; `target_hp_below: 0.25`, `target_alive` |
| Kindling, Rime, Static, Bedrock, Gust, Caustic | your Figment takes damage of that element and stays up (fire, freeze, shock, stone, gale, acid) | `damaged`; `damage: [<element>]`, `target_alive` |
| Swift, Loud, Mirror, Keen, Tethered, Skittish, Kindred, Quiet, Overcharged | sketching only (no deed the closed predicates can see cleanly) | none |

Twelve found by deeds, ten by practice; any trait may also be picked by sketching before it is found.

## 6. Crossings with the other doors (only where the pieces exist)

| # | Crossing | Rule | Built from |
|---|---|---|---|
| 34 | **Relay through a Figment** | A Sigil Line with RELAY may hop through your Figment as through an ally (it already does: the slice shows it in the RELAY hint and pins it in a test). | `relayChains` (sigil.ts: any unit of the caster's side) |
| 35 | **Tend the image** | A heal of any door (MEND, the Buff school, a Whisper, Hand over, Reflect) lands on a Figment as on an ally; its conditions still do not. | `mend`, `healUnit`; the Figment's `unit_effects` immunities |
| 36 | **Release from it** | With Look through on, an Outburst may be Released from your Figment's tile. | **P3** |
| 37 | **Evoke from it** | With Look through on, you may Evoke a Line from your Figment's tile as if you stood there. | the `evoke_reach` hook through **P3** |
| 38 | **Pray from it** | With Look through on, a Whisper's reach is counted from your Figment's tile. | **P3** |

A Bond on a Figment is not designed: a Bond's ends (`rules.json ties.kinds.bond ends_on`) and Tending's targets were
written for people, and no piece says otherwise.

## 7. Icons (slice 1)

Monoline, `art/style-guide/weapon-icons.md` (64 grid, 2-unit round stroke, `currentColor`, one silhouette plus a
few interior lines, nothing floats). Catalog id `figment.<form>` in `art/catalog.json`, file
`art/icons/figments/<form>.svg`, read by each form's `icon` field; `glyph` stays the fallback; the painted portraits
(ART-REQUESTS C6) win where they exist, and `art/briefs/ART-REQUESTS.md` lists all fourteen.

| Form | Silhouette |
|---|---|
| Double | a hooded bust split down the middle, one half hatched with bot flecks |
| Eye | an almond eye, a hexagonal iris, two short wing blades |
| Wall | a tower-shield slab, three seams, a notched top edge |
| Beast | a hound's head in profile, open jaw, one crest line |
| Blade | a single-edged hovering blade, point down, a ring at the hilt |
| Snare | a four-pronged caltrop star inside a broken circle |
| Hand | an open gauntlet palm up with a capsule across it |
| Ward | a kite shield with a small figure-silhouette cut-out behind it |
| Husk | a hollow bust like the Double's with a fuse spark at the crown |
| Sentinel | a tall spire on three legs, one lens, one long barrel |
| Glass | a hand mirror with a cross-shaped glint |
| Ferry | a low winged sled with a saddle line |
| Breaker | a ram's head on a battering beam |
| Hush | a speaker grille with a slash through it |

## 8. Saves

A Rigger of today loads with everything it had: every form its points opened (Eye and Wall at 3, Beast and Blade at
5), its designs, its held count. Each fork it has passed counts as taken by a form it already holds; the "one more"
rows then fill from the forms not held, as for anyone. Snare and Hand come by points. It has found nothing yet, so it
is owed one free trait pick for each Mastery level it has passed (3, 5, 7, 9), shown at its next level-up card.
Mirage and Solid Image keep their holders; only their texts and numbers change. Proof: `test/old-save.test.ts` with a
new fixture of a Visualization 5 Rigger beside the three kept ones.

## 9. The count (40 additions)

| Kind | Items | n |
|---|---|---|
| Forms | 1 to 9 (Snare, Hand, Ward, Husk, Sentinel, Glass, Ferry, Breaker, Hush) | 9 |
| Orders on today's forms | Draw fire (Double), Press (Wall): in table 2 | 2 |
| Caster orders | 10 to 12 | 3 |
| Growth | 13 to 18 | 6 |
| Capstone and perks | 19 to 21 | 3 |
| Traits | 22 to 33 | 12 |
| Crossings | 34 to 38 | 5 |
| | | **40** |

The new forms' orders (Trip, Hand over, Filch, Interpose, Burst, Fix, Reflect, Carry, Ride, Batter, Jam) are 11 more
things to do on a turn, counted with their forms. Every form now has an order: no Figment waits.

## 10. Built from (the consolidated table)

Each row: an existing primitive (by its name in `docs/ENGINE-HOOKS.md` or the figment code) and the items above that
it carries. Tables 2 to 6 give the row for each item.

| Rule | Primitive | Items |
|---|---|---|
| A form is one data row; its body levels with its owner | `spawn` / `spawnOwned`, `figmentBlock`, `makeFigment`, `OwnedBlock` | 1 to 9 |
| A form's order is one data row, paid by its owner | `runDataVerb`, `OWNED_DATA_VERBS`, `price`, `pay`, `whyNot` | 1 to 12 |
| A turret Figment acts at your turn start | `OwnedBlock` `turn: auto`, `AUTO_TARGETS` | 5 |
| A lure | the owned record's `lure`, `spawn_illusion` | 4, 20 |
| Who an order or a rider reaches | `TargetSet` (`of`, `side`, `within`, `shape`, `sees`, `tied`, `max`), `selectUnits` | Draw fire, 4, 6, 7 |
| Conditions put on | op `condition` (`via`, `skip_save`), `applyCond`, the rows `taunted`, `silenced`, `burning`, `slowed`, `dazed`, `corroded`, `marked` | Draw fire, 9, 22 to 24, 27, 29 |
| Damage and heals | op `deal`, op `mend`, `amounts` blocks, `output.profiles.figment` | 2, 4, 6, 35 |
| Moves | op `displace` (`push`, `to: tile`, `to: cover`), `forced_movement` | Press, 3, 7, 10, 26, 28 |
| Guards and blows taken | op `redirect`, op `floor`, op `damage_mult`, `immunity` | 3, 8, 25, 30, 33 |
| Cover and doors | op `object` (`do: break`) | 8 |
| Steals | op `take` | 2 |
| Rolls | op `roll_mod` on `to_hit` | 9, 31 |
| Triggers | `hit`, `damaged`, `downed`, `would_drop`, `taking`, `dealing`, `to_hit`, `heal_given`, `acted`, `cost`, `combat_over` | 1, 3, 6, 14, 16, 19, 22 to 33 |
| Predicates | `actor`, `target`, `target_within`, `actor_within`, `actor_kind`, `actor_tier`, `target_tied`, `self_tied`, `melee`, `damage`, `by_hit`, `target_alive`, `self_alive`, `target_hp_below`, `action` | 3, 9, 14, 16, 19, 28 to 31 |
| Limits | `limit` (`per_turn`, `per_round`, `per_combat`, `per_campaign`), `uses` | 3, 6, 14, 19, 21, 28, 30 |
| Cheaper orders | op `cost_mod` | 19, 20 |
| Forks and sketch picks | `registerPickList`, the `sigil/learn` shape | 13, 16 |
| The ladder | `ladder[]`, `ladderAt` | 13, 19 |
| Training | `TRAIN`, `TRAINING` | 17 |
| The moment on screen | `emitFx`, `say` | 15 |
| Relay | `relayChains` | 34 |
| Evoke reach | hook `evoke_reach` | 37 |
| Saves | `ladderAt`, `test/old-save.test.ts` | section 8 |

## 11. Needs a new primitive (general pieces only; each the lead's to approve)

1. **P1, one unlock op over named lists:** `{op: unlock, list, id}`: a known list on the character
   (`c.known[list]`), an fx `unlocked` (`unit, list, id, name, why`) and a story line. Generalises `unlock_word` and
   `feelChar`. Pays for: 12 sightings (items 14, 22 to 33's finds), the unlock moment (15), sketched forms (16);
   later the Outburst's 28 hand-written `feelUnit` calls can move onto it.
2. **P2, one practice ledger by door:** `c.practice[door]`, its earn rows, thresholds, `then_every` and
   `mastery_bonus` from the door's data, and the pick it opens. Pays for: sketching (16), drill and rest (17);
   `soulPractice` migrates into `practice.soul`.
3. **P3, the seat:** an owner's door action (Picture, the Evoke reach, a Release's origin, a Whisper's reach, its
   sight) may start from the tile of one of its owned units within projection range, for the rounds a `seat` field
   gives. Pays for: Look through (12), Release, Evoke and Pray from it (36 to 38).
4. **P4, one cost site `figment_order`** in `COST_SITE_IDS` and `data/actions.json costs` (1 AP), shared by every
   non-attack order (Draw fire, Press, Interpose, Burst, Reflect, Carry, Ride, Jam, Redraw, Cash in, Look through);
   Hand over's row also carries the stim (`res: {stims: 1}`). Attack orders reuse `figment_strike` and
   `figment_cut`. One site for eleven orders, not eleven sites.

The first draft's third piece (`owned_by: self`) is dropped: `target_tied: {kind: owned, as: to}` already says it.

## 12. Build order (each slice ships alone)

| Slice | A player gets | Tests (through the reducer, real actions) |
|---|---|---|
| 1 (in build) | Icons for every form, the design editor, the unlock card for ladder rows | catalog and `validate_art.py`; a client test that the editor sends `figments/design`; boundary test |
| 2 | Draw fire, Press, Redraw, Cash in (P4); Mirage and Solid Image reworked | each order through `sendDescriptor` (`test/descriptors.test.ts`); costs tables re-recorded for the new site; `npm run try` scenarios |
| 3 | Snare and Hand at V1 and V2; the forks; Ward, Husk, Sentinel; the save migration | a fork taken by `figments/fork`; each order through the reducer; `old-save.test.ts` with the new fixture; replay guard |
| 4 | Glass, Ferry, Breaker, Hush; the 12 traits, picked in the editor | each order and trait through a real fight (`npm run try`); conditions and item-ops goldens for the riders |
| 5 | Sightings with their moment (P1), sketching and the drill (P2) | each sighting fired once by its deed in a real fight; practice thresholds through `combat_over`; the training ground through the run reducer |
| 6 | Look through and the three crossings (P3); Relay and Tend shown | Evoke, Release and Whisper from a Figment's tile through the reducer; fog test (the seat's sight) |
| 7 | Lucid at V10; Balance 2.0's fit of the door | `survival-run.ts` (`rigger`, `solo_rigger`, `four_casters`), the balance contract, the damage goldens |

Every slice keeps the left panel (the sheet, its FIGMENTS tab, Level up) and the right panel of the mode, the place
header, and text of at least 13 px; the fight screen is excepted as today.

## 13. Questions for Leon

1. **Lucid's lore:** the Visualizer is a gear-company glove. Is a Mastered Rigger holding Figments without it (only
   Picture needs it) right for the world, or must the glove always be in hand?
2. **Swap:** only the Rigger swaps with a Figment (Sleight). Should every Visualization user get a swap order too?
3. **Hand over carries real gear:** a nanobot picture passing a real stim from your pack to a friend. Is that true to
   what a Figment is, or should the Hand only carry what it is made of (a heal of its own)?

## Leon's rulings, 15 Nov 2026

1. **The Visualizer glove is ALWAYS required**, a Mastered Rigger included: Lucid keeps only "the first two orders each
   turn cost 1 less" (no hands-free holding).
2. **A swap-places order is the Rigger's only** (through Sleight), not every Visualization user's.
3. **The Hand carries a REAL stim** from the owner's pack to an ally.

And the lead's: the Mirage perk is NOT reworked here (the perk lane replaces Visualization's perks); "a false Figment"
becomes a BASE ORDER every Visualization user has, under an in-universe name of its own: **Glimmer**.

**Built in 0.29 (lane/0.29-figments-2, rules 1.56 Figments 2.0 in the spec):** P4 (`figment_order`), slice 2 (Draw fire,
Press, Redraw, Cash in, Glimmer) and slice 3 (Snare, Hand, Ward, Husk, Sentinel, forks A and B with the general
`door/pick`, the save migration). Changes from the tables above, for the lead: Filch costs the order site (1 AP, not 2);
the Sentinel's Fix is also its auto verb (an auto unit may run a data verb); the Snare's AP loss on hit is Pinned (a
condition row that exists) and it borrows `figment_edge`; the Sentinel borrows the service pistol (no new weapon rows);
Redraw's move is the `guide` forced move (willing, provokes nothing); the save migration keeps a pre-forks Rigger's extra
forms outside the grants (`doorKept`), so its "one more" rows still give new forms.
