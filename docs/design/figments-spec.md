# Figments and the Visualizer: Expression's door, and the Rigger (spec, 13 Nov 2026)

Status: **a spec for the Revision 4 patch; nothing is built.** Base: nine doors 5.2 (Leon, 10 Nov: "Figments: yes. The
instrument is the Visualizer, already in the lore: an Evoker for artists") and Class Roster Revision 4 section 4.6
(draft 2). Proposed as **rules 1.28** (the lead numbers it). Every number is PROVISIONAL and gets a spec section 14 item;
every number lives in the data field its table names. Names marked *(Suggested)* are Leon's to change.

## 1. The fantasy and the loop

You picture a thing and the bots (mana is nanobots) build it: a hound, a wall, a floating blade, a second you. A
Figment stands on the grid with HP but **has no turn of its own: you spend your AP to act through it**, so the summoner
trades their own shots for bodies, position and eyes. The limit is attention: how many you hold, a core's charge to
keep them, and anything that breaks your focus unmakes them all.

**Worked example.** Level 5, Visualization 5 (held 2), a service pistol and a Visualizer with a fresh core (10 charge).
Ready designs: *Hound* (Beast + Swift) and a bare Wall.

| Turn | Action | AP left | Charge | Held | What happens |
| --- | --- | --- | --- | --- | --- |
| 1 | Picture *Hound* on a tile 6 off | 4 | 10 − 4 − 1 = 5 | 1/2 | a Beast (64 HP at level 5) with Swift: 5 tiles an AP |
| 1 | Picture a Wall in front of the squad's gunner | 2 | 5 − 3 = 2 | 2/2 | 86 HP, full cover, blocks sight |
| 1 | Hound: Move (5 tiles), next to a Soldier | 1 | 2 | 2/2 | the Soldier's side now has a body in its face |
| 1 | (1 AP kept; nothing worth it) | 1 | 2 | | enemy turn: two Minions shoot the nearest thing, the Wall (86 → 51); the Soldier spreads onto the Hound (64 → 41) |
| 2 | Turn start: upkeep 1 charge each | 6 | 2 − 2 = 0 | 2/2 | the Visualizer reads EMPTY |
| 2 | Swap core | 4 | 10 | | |
| 2 | Hound: Strike (d20 + 4 vs Defense 13) | 2 | 10 | | hit: 30 × 1.5 × 1.2 (level) × 0.9 (Figment factor) = 48, − armour 6 = 42 |
| 2 | Hound: Strike | 0 | 10 | | miss. The pistol never fired; the gunner behind the Wall was never shot |

## 2. Rules

| # | Rule | Adj. |
| --- | --- | --- |
| 1 | **The Visualizer** is a focus (items.json `visualizer`): off hand, one hand, holds one mana core of its own (10 charge, resource `vcharge`). Making a Figment and acting through one need it **in a hand**; held Figments stay while it is **carried** (as an Evoker keeps its charge in the pack). Swapping its core is the existing Swap core (2 AP; `swap_core`, the focus picked) | engine |
| 2 | **Picture** (2 AP, the form's charge + 1 a trait): a Figment appears on a free tile your side sees within your **projection range** (4 + Visualization tiles). From a ready design or a bare form | engine |
| 3 | **Held**: 1 at Visualization 3, 2 at 5, 3 at 7 (the Rigger +1). A Picture over the limit is refused ("Let one go first") | engine |
| 4 | **Upkeep**: at your turn start, 1 charge for each Figment held; the third held also costs 1 AP that turn. Short of charge: the newest unravels for each charge missing (said in the log) | engine |
| 5 | **Acting through**: a Figment's verbs are your actions, on your turn, paid from your AP (each verb's site in `actions.json costs`). Only on a Figment within projection range on a tile your side sees. Its attack rolls **d20 + your Visualization modifier** vs Defense; its damage is its weapon's on the `figment` profile at **your** level × the Figment factor | engine |
| 6 | **Let go** (0 AP, your turn): unmake one; half its made charge (rounded down) goes back into the core. A Figment destroyed by damage gives nothing back and **Snaps**: your next turn has 1 AP less (at most 1 a turn) | engine |
| 7 | **Attention breaks**: you go Downed, Stunned or out of the fight: every Figment unravels, nothing back. **Silenced**: you can't Picture or act through; they stay. A Figment that ends your turn beyond projection range unravels | engine |
| 8 | **What a Figment is**: a unit of your side with HP, Defense, armour and Movement; no initiative entry, no AP, no reactions of its own, never Hidden, never saves: it is immune to every condition (Body, Brain, Heart families, Bleeding) and is moved by forced movement (the Wall is not). It blocks movement like any unit | engine |
| 9 | **Sight**: only the **Eye** is an eye for your side (it widens your squad's fog). Every other form sees nothing; you act through it on what your side sees | engine |
| 10 | **Reactions** (Rev 4 section 2.1): a Figment's strike outside your turn (the Blade's) **spends your one reaction**; with none left it does not strike. A Blade's strike is a reaction: it triggers none | engine |
| 11 | **Hidden owner**: acting through a Figment is the Figment's act, not yours: it does not reveal you. Picturing does not either | engine |
| 12 | **Area and friendly fire**: every area hits a Figment as a unit of your side (your own grenade included). Figment attacks never pick allies. NULL (Sigil) unmakes Figments on the tiles it covers (`sigils.json null.dispel` gains `figment`) | engine |
| 13 | **Forced movement**: `displace` moves Figments as units; a Wall is immune (`immunity: knockback`). Sleight and swaps treat them as willing | engine |
| 14 | **Co-op**: Figments are the owner's; only the owner's player sees their verbs. Allies see them as squad units; Many Hands, Calls and heals may target them (a Call that gives AP does nothing to a unit with no AP) | engine |
| 15 | **Calls through the Double** (Charisma's door into this): a Call may be spoken from your Double's tile instead of yours (range counted from it) | engine |
| 16 | **Saves mid-fight**: Figments are units in `cb.units` with an `owned` record; the event log is the save. **The fight's end** unravels every Figment and Scrap Turret; spent charge stays spent | engine |
| 17 | **Out of a fight** no Figment stands. The Visualizer projects images for a scene (a Visualization check the Narrator sets the TN of) | hybrid: the image's effect on NPCs is judgement |

**The enemies and the Double** (rules 1.25's doctrine, extended; enemies.json tiers):

| Tier (doctrine) | Fooled by a Double? | The lie is found out | Other Figments |
| --- | --- | --- | --- |
| Vermin, Minion (nearest) | always, no save | never: they attack what is in front of them | targets like any unit, nearest first |
| Soldier (spread) | Brain save vs 12 + your Visualization strength (`saveTn(u, 'visualization')`), on first sight | it **hits** the Double, or you attack it | counts as `owned_weight` 0.5 less hurt: shot when nothing better is in reach |
| Elite (focus, hunts the healer) | the same save at its tier's +2, again at each of its turn starts | as Soldier | weight 0.5 |
| Boss (focus) | +3, again each turn start, never fooled two rounds running | as Soldier | weight 1.0 |

A fooled enemy sees the Double **as you**: your HP share, your healer mark (a Double of the healer draws the healer
hunt), the Double's tile. It does not see you as a second target. An enemy that found a Double out gets +5 against your
later Doubles this fight (the Mirage precedent, spec item 183). Destroying a Double finds it out for all who saw it.

## 3. The list

Level 1 numbers; HP grows by `figments.json level.hp` (the enemy table's `hp_mult × damage_mult` at your level, so a
Figment soaks the same share of a Soldier-turn at every level), Defense by `defense_plus`, armour by `armour_mult`
(`levelCompanion`'s rows). Damage grows only by `output.level.deal`, never by skill.

| id | Form | Opens | Charge | HP / Def / Armour | Tiles an AP | Verbs (AP) | Data |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `double` | **Double** | Vis 3 | 2 | 30 / your Defense / 0 | yours | Move (1). Lures: the table above | `figments.json forms[double]` |
| `eye` | **Eye** | Vis 3 | 2 | 15 / 15 / 0 | 4, flies (difficult ground and low cover don't slow it) | Move (1); **Stare** (1): one unit it sees stays seen by your side until your next turn, Hidden or not | `forms[eye]`, `vision` 8, `dark_sight` |
| `wall` | **Wall** | Vis 3 | 3 | 60 / 6 / 5 | 1 | Move (1). Full cover; blocks movement and sight for both sides; immune to knockback | `forms[wall]`, `cover: full` |
| `beast` | **Beast** | Vis 5 | 4 | 45 / 12 / 3 | 3 | Move (1); **Strike** (2): melee, `figment_claws` 30; **Pounce** (3): up to 3 tiles in a straight line then Strike; a hit knocks Prone (Body save) | `forms[beast]`, weapons.json `figment_claws` |
| `blade` | **Blade** | Vis 5 | 3 | 25 / 14 / 0 | 2 | Move (1); **Cut** (2): an adjacent enemy, `figment_edge` 25; **Hold** (reaction, yours): the first enemy each round to enter or leave a tile next to it is Cut | `forms[blade]`, `figment_edge` |

**Making and keeping:** Picture 2 AP (`picture`), Let go 0 AP (`let_go`), upkeep (rule 4), Snap (rule 6). Each verb is a
cost site: `figment_move`, `figment_strike`, `figment_pounce`, `figment_cut`, `figment_stare`.

**Traits** (+1 charge each to Picture; one trait a design from Visualization 3, two from 7; `figments.json traits`):

| id | Trait | One multiplier or one rule | Field |
| --- | --- | --- | --- |
| `armoured` | Armoured | HP ×1.5 | `hp_mult` 1.5 |
| `swift` | Swift | +2 tiles an AP; its moves draw no opportunity attacks | `tiles` 2 |
| `loud` | Loud | enemies count it as the most hurt in reach (`owned_weight` −1); Minions included | `weight` −1 |
| `volatile` | Volatile | destroyed (not let go): radius 1 burst, 20 flat on everyone, both sides | `amounts.burst` |
| `tethered` | Tethered | its projection range +4; it unravels only past twice that | `range` 4 |
| `mirror` | Mirror | it lures as a Double would, in the look of any unit of your side you pick | `lure: pick` |
| `barbed` | Barbed | an enemy that hits it in melee takes 10 flat | `amounts.barb` |
| `lasting` | Lasting | no upkeep | `upkeep` 0 |
| `keen` | Keen | its attacks +2 to hit; an Eye sees 4 further | `roll` 2 |
| `hollow` | Hollow | costs 2 charge less (at least 1), HP ×0.5 | `charge` −2, `hp_mult` 0.5 |

**Designs:** a form and its traits, named, made out of a fight on the Magic tab (as Outburst designs:
`Character.figments`). Ready: 2 at Visualization 3, 3 at 5, 4 at 8, 5 at 10 (Rigger +1). A bare form is always ready.

## 4. The ladder

| Visualization | What it gives |
| --- | --- |
| 1, 2 | Figment accuracy is the modifier (−2 at 0, points − 1). The Visualizer works out of a fight (rule 17). Projection range would be 5, 6 |
| 3 (M1) | **The door** (replaces the unbuilt Afterimage unlock): Picture; Double, Eye, Wall; 1 held; 2 ready designs, one trait each; a perk step |
| 4 | range 8 (every point +1 range and +1 accuracy from here) |
| 5 (M2) | 2 held; **Beast and Blade**; 3 ready designs (replaces Paint the Field, a Sigil rider: nine doors 15.5 "replace when Figments are built") |
| 6 | range 10 |
| 7 (M3) | 3 held; two traits a design; a perk step |
| 8 | 4 ready designs |
| 9 (M4) | a destroyed Figment no longer Snaps; a perk step |
| 10 | 5 ready designs; the Mastered perk (Solid Image, reworded onto Figments: once a fight, 0 AP, a Figment takes no damage until your next turn) |

**Gear gates:** `gear:projector` (the Visualizer, Visualization 1) and `gear:illusion` (Mirage-type gear later), both
already in `skills.json visualization.gates`. The per-point line "+5% elemental damage" goes (the elemental pair has had
no slope since rules 1.26); it becomes "+1 projection range; Figment accuracy".

**Improvisation (beta) adds Field Repair, everyone's door action** (today's unlock 3, kept and widened):

| Field Repair | Number | Field |
| --- | --- | --- |
| Cost | 2 AP and one spare-parts charge (`spare_parts`) | `actions.json costs.field_repair`, `res.parts` 1 |
| Reach | you, or an ally, machine or Figment next to you | |
| Pick one | clear a jam · restore weapon durability 10% + 5% a point above 3 (today's numbers) · **repair** a robot, drone, turret, Factory Made squadmate or Figment for 15 on the `repair` profile (a Downed machine comes back up) | `skills.json proficiency.unlocks.3.amounts.repair` |
| Needs | Improvisation 3 | |

At a normal share (Expression 4, Improvisation 4) a repair is 15 × 1.392 × 1.36 = 28 at level 1, a little over half a
Triage, because it costs a part. Improvisation's −10% ambush damage taken stays. **Charisma (gamma)** adds no number:
its Call may be spoken through your Double (rule 15), and it is the Double's voice that makes the liar.

## 5. The Rigger *(Suggested; was Trickster)*

**Better** (Rev 4 section 2's three kinds):

1. **A bigger meter:** one more Figment held (2 at Visualization 3, 3 at 5, 4 at 7), and one more ready design.
2. **One thing a turn cheaper:** **Overclock** (below; as Speed Loader is the Skirmisher's), once a turn.
3. **Six moves.** The Rigger's Double, Field Fix, Salvage, Overclock and the Scrap Turret need no Visualization: a
   Rigger with Visualization 0 still has them; its extra held Figment needs the door (Visualization 3).

| Rank | Key (kept ids) | Move | Cost | Effect, with numbers | Limits |
| --- | --- | --- | --- | --- | --- |
| I | `class:trickster.false_image` | **Double** | 2 AP, 1 charge | a bare Double appears within projection range (6 for a Rigger without the door) and lasts until your turn start 2 rounds on; no upkeep, outside your held count | one at a time; needs the Visualizer in hand |
| I | `class:infiltrator.field_fix` | **Field Fix** | 2 AP | Field Repair without its part or its Improvisation gate, within 2 tiles; repair base 20 (`amounts.repair`) | at will |
| II | `class:trickster.salvage` | **Salvage** | 1 AP | next to you, one of: a **wreck** (a destroyed robot, drone, turret or machine of either side) gives 2 charge to your Visualizer core; one of **your Figments** is let go with its whole charge back; or **repair** a machine or Figment of your side, base 15 | each wreck once a fight (`uses(h).on(wreck)`) |
| II | `class:trickster.overclock` | **Overclock** | 1 AP | a Figment or machine of your side within 8 that your side sees takes one of its actions **now**, of up to 2 AP, at no AP; it takes 5 flat true damage | once a turn; never a character (AP given to a character is a gamma's, nine doors 15.7) |
| III | `class:trickster.sleight` | **Sleight** | 1 AP | swap places with one of your Figments or a standing ally within 6; no opportunity attacks | once a scene |
| III | `class:trickster.scrap_turret` | **Scrap Turret** *(Suggested; Rev 4's Jury-Rig)* | 3 AP | from a wreck, a pile with a weapon, or a barricade next to you: a turret (40 HP × the Figment HP level term, Defense 10, armour 5, no move) on a free tile next to it. At each of your turn starts for 3 rounds it makes that weapon's plain attack (a barricade or wreck: the service pistol's) at the nearest enemy it sees in range, rolling d20 + your Improvisation modifier, damage on the `weapon` profile at your level | once a scene; one at a time; a machine (Overclock and repairs work on it), not a Figment |

**Machines of your side that exist today** (found in data and the engine): the Drone Handler's drone and the Beast
Handler's beast (traits; `enemies.json companions`, units with `ctrl`, their own turn at `init − 0.5`), the Twinbound
twin (`classes/k.ts`, shelved), Factory Made characters (`traits.json factory_made`), the Sigil WATCH turret (a zone,
10 HP). Overclock: the **drone** takes a move or shot now (beside its own turn); the **beast** is not a machine; a
**Factory Made** squadmate is a character (refused); a **WATCH turret** casts now at its ×mult, 5 off its HP; a
**Scrap Turret** fires now. Field Fix, Salvage's repair and Field Repair work on the drone, the turret, Factory Made
squadmates and Figments.

**Leaves:** Read (to the Operative), Blind and Slow (to the common words), Silver Tongue (talk is no class's move),
Rewrite (move pool). **Squared, the Mirage, breaks "a Figment has no turn of its own":** each of its Figments takes a turn
right after it with 2 AP, run by the engine's companion AI; every Figment may be Mirrored at no charge; its built verbs
come with the squared batch.

**Two bridges for mixed classes:** **Warden** (Endurance + Expression): your Wall holds your Guard: a hit on the Wall is
soaked from your Guard pool first, and Brace may be made on the Wall's tile. **Hexer** (Expression + Insight): a Bond
may be tied to an enemy: your side sees it wherever it is, and a hit by your Figment on it mends your nearest Bonded
ally for a quarter of the damage (`mend`, the Bond's own profile).

## 6. On what exists

**What it is built from.** The False Image (`illusion.ts`: `FalseImage.fooled`, `perceivedFoes`, `fooledBy`,
`ghostOf`, `strikeImage`) is the Double's lure; companions (`tactics.ts companionUnits`, `combat.ts levelCompanion`,
`enemies.json companions`) are the shape of a unit built from a block at its owner's level; Field Repair
(`combat.ts fieldRepair`, `skills.json proficiency.unlocks.3`) and Field Fix (`classes/rev3.ts infiltrator.field_fix`)
are the repairs; Sleight (`classes/rev3.ts trickster.sleight`) stays as is.

### 6.1 Built from (each rule against the primitive that carries it)

| Rule or verb | Primitive (verified) |
| --- | --- |
| Picture, Let go, every Figment verb, the six moves | `grant_action` on the item; the item action system (`effects/actions.ts`, `ap: 'data'`, `res: {vcharge: n}`); listed by `descriptors.ts registerActions` (the owned system, 6.2) |
| AP of every verb, the core swap | `effects/cost.ts price / whyNot / pay` with sites in `actions.json costs` (`picture`, `let_go`, `figment_move` …, `swap_core` exists) |
| Charge | a row `vcharge` in `actions.json resources` (`path: vis.charge`), paid through `res` |
| Upkeep's AP for the third, Snap | item ops: `when: turn_ap` + `op: grant_ap` (value −1), `when: kill` + `if: {target: owned}` + `op: mark` (flag), cleared by `mark` |
| Once a turn / a scene / a wreck once | `effects/uses.ts` (`per_turn`, `per_scene`, `uses(h).on(t).take('per_combat')`) and data `limit` |
| Figment attacks, Scrap Turret shots | the plain attack (`resolveAttack`, `previewAttack`) of the Figment unit with its weapon (`weapons.json figment_claws`, `figment_edge`); accuracy through `rolls.ts`; damage through `effects/output.ts` with a new profile row `figment` (data only) |
| Pounce's Prone, Stare's sight | `when: hit` + `if: {action}` + `op: condition` (`prone`, a row); Stare: `op: condition` `marked`-style row `watched` (new row in `conditions.json`, read by the `sees` hook) |
| Immune to conditions, Wall unpushable | `op: immunity` (`family:body`, `family:brain`, `family:heart`, `bleed`, `knockback`) on the form |
| Volatile, Barbed, Overclock's 5, repairs | `amounts` blocks with `op: deal` / `op: mend` (profiles `flat`, `repair`); Volatile's area through `kit.ts unitsIn` (`shape: burst`) |
| Double saves | `magic.ts saveAgainst(..., 'brain', 'visualization')` (`saveTn`), the +5 after a find-out as `ctx.saveAdd` on the `save` hook |
| Fooled targets, healer hunt | `illusion.ts` (an image whose body is a unit: `FalseImage.body`), `combat.ts enemyRank` (one term `owned_weight` in its sort key, read from `enemies.json` tiers beside `fire_spread`) |
| Wall cover and sight | `combat.ts coverOf` and `sightBlockers` include a living unit whose form has `cover` (one line each, data-driven) |
| Eye's sight, the fog | `combat.ts visibility` and `sideSeesUnit`: `eyes` skip units whose `owned.sight` is false; `fog.ts fogFight` needs nothing (owned units are units) |
| Forced movement, swaps | `displace`, `swapUnits` |
| Clear a jam, restore durability | a `jammed` row in `conditions.json` and `op: cleanse`; durability through `op: resource` with a `durability` row (`path: dur`) |
| NULL on Figments | `sigils.json null.dispel` gains `figment` |
| The log, the cards | `say` (Figments are named units); the one hover card (`previewDescriptor`) |

### 6.2 Needs a new primitive: ONE, the **owned unit** *(general; not a Figment path)*

A unit that belongs to another unit. Fields on `Unit`: `owned: { by, kind: 'figment' | 'companion' | 'twin' | 'turret',
turn: 'owner' | 'own' | 'auto', sight, range?, upkeep?: {res, n}, lure?, design? }`. It carries:

1. **Two ops** in the closed list `effect_ops.json item_ops.ops`: `spawn` (a unit from a data block: `figments.json`
   forms, `enemies.json companions`, the turret block; at a tile, at the owner's level through `levelCompanion`) and
   `unmake` (with `refund`).
2. **One `rel` value**, `owned` (and `owner`), for the `actor` / `target` predicates (`effects/triggers.ts rel`).
3. **The payer:** `price` / `pay` take `{cb, u, payer}`: a verb of an owned unit with `turn: 'owner'` is priced on the
   unit and paid from its owner (its items hear the `cost` hook).
4. **One action system** `owned` (`registerActions`): for the viewer's unit, each owned unit with `turn: 'owner'` is a
   group in the owner's panel with its verbs (the unit's `grant_action`s and its weapon's plain attack); a reducer action
   `combat/owned {unitId, owned, verb, targetId?, tile?}` checks the owner's turn and runs the verb as the owned unit.
5. **Turn order:** `turn: 'owner'` units never enter `cb.order`; `'auto'` acts at the owner's turn start (Scrap Turret,
   later WATCH turrets); `'own'` keeps today's slot (drone, beast, twin).
6. **Lifecycle:** upkeep and range at the owner's `turn_start`; every owned unit of an owner unravels on its `downed` /
   Stunned / `combat_end` (rule 7), all in `owned.ts`.
7. **Migration:** `ctrl` + `companion` (drones, beasts) and `twinOf` become `owned` records on load (`turn: 'own'`);
   `COMPANION_ACTS`, `COMPANION_ROUND_AP` read `owned.kind`. The drone and the twin then take Overclock with no new code.

**Moves and removals.** Visualization unlocks 3 (Afterimage, never built) and 5 (Paint the Field) are replaced (4).
`classes.json trickster`: renamed Rigger, `resource` → `figments` (held) with `also_uses: vcharge`; Read, Blind and Slow,
Silver Tongue, Rewrite leave (Rev 4 section 5). `trickster.false_image` keeps its key and becomes the Double (Figment);
its Evoker gate and `brain_power` save become the Visualizer and `visualization`. `infiltrator.field_fix` keeps its key
on the Rigger. Old characters: a new save each update (Leon, 10 Nov); a saved fight's `cb.images` still read.

## 7. Balance

**The new ceiling: Figments, 150% of a rifle-turn all in** (`balance.ceilings.figments`; normal share 120). Reason: the
best gun steady is 145 (a tool you buy, load and keep), plus session supply +5% (cores); the set-up (Picture) is inside
the measure; the owner stands out of reach, so no exposure allowance. **Dial: `rules.json output.factors.figment`, the
Figment factor, 0.9**, on every attack made through a Figment: acting through a Figment deals at most 0.9 of what the
same AP of the plain rifle does, so a Figment is never a better gun than you are; its worth over the rifle is the soak.

**A Figment's worth a turn** = D (damage through it) + S (damage enemies spent on it that would have hit a character,
in Soldier-turns, each = one rifle-turn) + C (fooled turns: counted in S, as attacks spent on a Double). Estimate for a
5-turn fight, Beast + Wall, the Beast striking twice a turn from turn 2 (a Strike = 2/6 × 100 × 0.9 = 30%; the AP
left = 15%), soak assumed at **half** the two bodies' HP over the fight (an estimate: the sim measures it):

| Level | Beast + Wall HP (× `hp_mult × damage_mult`) | Soldier-turn | S a turn | D, door (4/5 × 75 × A) | Door normal / all in | Rigger normal / all in |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 105 × 1.00 = 105 | 18.5 | 0.5 × 105 / 18.5 / 5 = 57 | 60 × 1.29 = 77 | 117 / 134 | 135 / 156 |
| 5 | 105 × 1.43 = 150 | 24.1 | 63 | 60 × 1.13 = 68 | 123 / 131 | 141 / 150 |
| 10 | 105 × 2.06 = 216 | 34.2 | 63 | 60 × 1.12 = 67 | 123 / 130 | 141 / 150 |
| 20 | 105 × 3.29 = 345 | 60.2 | 58 | 60 × 1.01 = 61 | 118 / 119 | 136 / 137 |

A is the plain rifle's measured all-in ratio (129 / 113 / 112 / 101, contract section 3). **The Rigger** adds Overclock
(a Strike for 1 AP: D = 4/5 × 90 × A) and a third body (S × 1.1: enemy fire is finite, a third body soaks little more).
Means: door normal 120 (the normal line: on it), door all in 129, Rigger normal 138 (+15%), Rigger all in 148 (the
ceiling). Charge: 7 to make, 2 a turn: about 15 a fight, 1.5 cores (225 credits).

**Bodies on the board (the missing ceiling):** a character holds at most 4 Figments (Rigger, Visualization 7), plus
the Rigger's Double and one Scrap Turret: **6 owned units a character, 24 in a squad of four** (`figments.json
limits.bodies`). Over a fight, damage spent on owned units counts as S only up to the squad's share of the enemies'
fire: the contract test caps S at 0.6 of the enemy side's output.

**Acting through vs acting yourself:** with the factor at 0.9, the best Figment turn (the Rigger's three Strikes) is 90%
× A of a rifle-turn in damage, under the rifle's own 100% × A: the Figment's edge is only ever its soak and its reach.

**Measure when built:** a build `rigger` and `figment_door` in `test/balance/builds.ts`, a policy `figments` in
`policies.ts` (Picture Beast and Wall, strike with the Beast, keep the Wall between the squad and the nearest Soldier),
rows in `refit-measure.ts measure` with S read from the damage the enemies dealt to owned units; levels 1, 5, 10, 20,
both shares, 16 fights a cell; then the row `figments` in `balance-contract.test.ts SYS`. Fit with the factor only;
if S runs hot, the second dial is `figments.json level.hp`.

## 8. The other side

Enemies may Picture (the `spawn` op is side-blind) but none does in this patch: a **Visualist** caster archetype
(Soldier: Double and Beast; Elite: plus Wall and Mirror) is listed for the enemy casters pass. **What the AI learns now:**
the tier table in section 2 (fooling, `owned_weight`), a Wall is cover it can break or walk around (`aiClearBlock`
already breaks a RAISE wall that blocks its only way closer: Walls join that list), a Blade's tiles count as an
opportunity attack in its route risk (`aiRouteRisk`), Volatile Figments count their burst against standing next to
them, and an enemy Sigil caster weighs NULL on a Figment as its charge × 4. **The healer hunt:** an Elite that hunts a
healer hunts the healer's Double when fooled, which is the Double's best use. **Doctrine:** Minions take the nearest
thing, so a forward Wall or Beast draws them by position alone; Soldiers shoot Figments only when no character is in
reach; Elites and Bosses ignore Figments (weight 0.5 / 1.0) unless Loud or a Double fools them.

## 9. The screen

- **The meter, one place:** below the HP bar (spec item 548): `FIGMENTS 2/3` pips (white, "still to do" per the colour
  system when one could be made) and `VISUALIZER 7/10` charge with EMPTY when 0. Expression ink `#5394AC`.
- **The action tab "Figments":** a group for Picture (the ready designs, then bare forms; disabled with the reason),
  then one group per held Figment (its portrait, HP bar, the verbs with their AP, Let go); Rigger moves under Class.
- **Hover cards:** a form: HP, Defense, armour, tiles, verbs, upkeep; a trait: its one line; a Figment on the grid:
  owner, HP, "you act through it", range left; an enemy that is fooled shows "believes the Double is [you]" to its owner.
- **When it works:** the bots stream in from the Visualizer to the tile; a Strike shows a dice card with TN and sum.
  **When it fails:** "Out of projection range (8)", "Needs 3 charge", "Hold is full: let one go"; an unravel shows the
  bots scattering and the log line "the Hound comes apart (Downed: your focus broke)".
- **Art needed** (for `art/briefs/ART-REQUESTS.md`; listed, not edited): the Visualizer focus icon (monoline, beside the
  Evoker and Emanator); five form tokens and portraits (bots in the shape, Expression pigment); ten trait icons (Wick
  ink); weapon icons `figment_claws`, `figment_edge`, the Scrap Turret token; the Rigger emblem only if the name stands.
  **VFX/SFX** (CC BY 4.0 or CC0, credited): a particle sheet for bots streaming in and scattering; a build and an
  unravel sound.

## 10. Data

New file `data/figments.json` (`visualizer` rules, `level`, `limits`, `ladder`, `forms`, `traits`), plus: items.json
`visualizer`; weapons.json `figment_claws`, `figment_edge`; actions.json `resources.vcharge`, `resources.durability`,
costs `picture`, `let_go`, `figment_move`, `figment_strike`, `figment_pounce`, `figment_cut`, `figment_stare`;
conditions.json `jammed`, `watched`; rules.json `output.profiles.figment` (aimed, k 1.5, pair `elemental`, level `deal`)
and `repair` (landed, k 1.392, 0.06 / 0.06, pair `repair`: Expression, Improvisation; level `mend`; floor 0.5),
`output.factors.figment` 0.9, `output.systems.figment_attack`, `balance.ceilings.figments`; enemies.json tiers
`owned_weight` (0 / 0 / 0.5 / 0.5 / 1.0) and `double_save` (none / none / 0 / 2 / 3).

```json
{ "id": "beast", "name": "Beast", "opens_at": 5, "charge": 4, "hp": 45, "defense": 12, "armour": 3,
  "tiles_per_ap": 3, "weapon": "figment_claws", "sight": false,
  "text": "A fast striker the bots build from your picture: {=hp} HP, Defense {=defense}, {=tiles_per_ap} tiles an AP. Strike ({=effects.1.ap} AP) is a melee attack with its claws. Pounce ({=effects.2.ap} AP) runs up to {=effects.2.tiles} tiles in a straight line and strikes; a hit knocks the target Prone unless it passes a Body save.",
  "effects": [
    { "op": "spawn", "kind": "figment", "turn": "owner", "upkeep": { "res": "vcharge", "n": 1 } },
    { "op": "grant_action", "action": "figment_strike", "ap": 2, "uses": "at_will", "target": "enemy_adjacent", "attack": "plain" },
    { "op": "grant_action", "action": "figment_pounce", "ap": 3, "uses": "at_will", "target": "enemy", "tiles": 3, "attack": "plain" },
    { "when": "hit", "if": { "actor": "self", "action": "figment_pounce" }, "op": "condition", "condition": "prone" },
    { "op": "immunity", "to": "family:body" }, { "op": "immunity", "to": "family:brain" },
    { "op": "immunity", "to": "family:heart" }, { "op": "immunity", "to": "bleed" } ],
  "adjudication": "engine", "provisional": true }
```

```json
{ "id": "overclock", "name": "Overclock", "ap_cost": 1, "uses": "per_turn",
  "amounts": { "strain": { "kind": "damage", "base": 5, "profile": "flat", "type": "true", "provisional": true } },
  "text": "Costs {=effects.0.ap} AP, once a turn. A Figment or machine of your side within {=effects.0.range} tiles that your side sees takes one of its actions now, of up to {=effects.0.max_ap} AP, at no AP. It takes {=amounts.strain.base} damage, more at higher levels. Never a squadmate.",
  "effects": [
    { "op": "grant_action", "action": "overclock", "ap": 1, "uses": "per_turn", "range": 8, "max_ap": 2,
      "target": "owned_or_machine", "if": { "target_not_kind": "human" },
      "effects": [ { "op": "cost_mod", "site": "owned_act", "value": -2, "min": 0, "limit": { "per": "per_turn", "n": 1 } },
                   { "op": "deal", "amount": "strain", "target": "target" } ] } ],
  "adjudication": "engine", "provisional": true, "origin": "rigger", "new": true, "status": "active",
  "surface": "combat", "attributes": ["expression"], "fantasy_tags": ["mechanic", "machine", "tempo"] }
```

**Validator rules to add:** every `spawn` names a block in `figments.json forms`, `enemies.json companions` or a
turret block; every form's `weapon` exists in weapons.json and is not on any loot table; `upkeep.res` is a row of
`actions.json resources`; a trait's fields are among `hp_mult`, `tiles`, `weight`, `range`, `lure`, `upkeep`, `roll`,
`charge`, `amounts`; `ladder` held counts rise with points and stay ≤ `limits.bodies`; every form text binds its
numbers with `{=…}`; `item_ops.ops` lists `spawn` and `unmake`; `rel` lists `owned` and `owner`.

## 11. Open questions for Leon

1. **The door opens at Visualization 3, not 1** (as the lead's design and Shadow's list at Ingenuity 3). Points 1–2
   give accuracy and the out-of-fight Visualizer only. Recommend: keep. Assumed: kept.
2. **The Rigger's "cheaper" is Overclock, not "the first Figment each fight is free"** (Rev 4's line). Changed because
   the frame's rule is "one thing a turn", and a free first Figment is a one-off charge saving worth about 2% a fight.
   Recommend: Overclock. Assumed.
3. **The Blade's strike spends your reaction** (Rev 4 section 2.1: everything outside your turn spends it; a free one
   would be a second reaction, the Skirmisher's only). Its worth is putting your reaction on a tile you are not on.
4. **Upkeep 1 charge a Figment a turn, the third also 1 AP** (the lead's proposal, kept). With a 10-charge core, two
   held Figments empty it in about four turns. Recommend: keep; measure.
5. **Salvage takes 2 charge from a wreck, not 1** (Rev 4): 1 charge for 1 AP is worse than a core swap (10 for 2 AP).
6. **Rev 4's Jury-Rig is renamed Scrap Turret** *(Suggested)*: Improvisation's perk is already called Jury-Rig.
7. **Overclock never targets a character** (a Factory Made squadmate): AP given to a character is a gamma's (nine doors
   15.7). Assumed.
8. **Field Fix is Field Repair without the part, the gate, and with reach 2** (a class move must do more than the door).
9. **Ceiling 150% and the factor 0.9**; the soak share (half of the bodies' HP) is the estimate most likely to be wrong.
10. **The Visualizer's look** (a lens worn on the off hand, a hand-held projector, a brush) is Leon's (nine doors 5.2.1).
    Assumed: a hand-held projector, off hand, 1 kg, 1,000 credits, as the Evoker.
