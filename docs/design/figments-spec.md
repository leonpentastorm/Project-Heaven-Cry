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
| 3 | **Held** (the stat `ties_max:owned`, P8 of `rev4-primitives.md`): 1 at Visualization 1, 2 at 5, 3 at 7 (the Rigger +1, a `stat_mod`). A Picture over the limit is refused ("Let one go first") | engine |
| 4 | **Upkeep**: at your turn start, 1 charge for each Figment held; the third held also costs 1 AP that turn. Short of charge: the newest unravels for each charge missing (said in the log) | engine |
| 5 | **Acting through**: a Figment's verbs are your actions, on your turn, paid from your AP (each verb's site in `actions.json costs`). Only on a Figment within projection range on a tile your side sees. Its attack rolls **d20 + your Visualization modifier** vs Defense; its damage is its weapon's on the `figment` profile at **your** level × the Figment factor | engine |
| 6 | **Let go** (0 AP, your turn): unmake one; half its made charge (rounded down) goes back into the core. A Figment destroyed by damage gives nothing back and **Snaps**: your next turn has 1 AP less (at most 1 a turn) | engine |
| 7 | **Attention breaks**: you go Downed, Stunned or out of the fight: every Figment unravels, nothing back. **Silenced**: you can't Picture or act through; they stay. A Figment that ends your turn beyond projection range unravels | engine |
| 8 | **What a Figment is**: a unit of your side with HP, Defense, armour and Movement; no initiative entry, no AP, no reactions of its own, never Hidden, never saves: it is immune to every condition (Body, Brain, Heart families, Bleeding) and is moved by forced movement (the Wall is not). It blocks movement like any unit | engine |
| 9 | **Sight**: only the **Eye** is an eye for your side (it widens your squad's fog). Every other form has `eyes: false` (P7): it sees nothing; you act through it on what your side sees | engine |
| 10 | **Reactions** (Rev 4 section 2.1): a Figment's strike outside your turn (the Blade's Hold, kind `attack`) **spends one of your reactions** (P1, `payer` the owner: `limit: {reaction: 1, of: "owner"}`); with none left it does not strike. It is a reaction: it triggers none, and it is a plain attack | engine |
| 11 | **Hidden owner**: acting through a Figment is the Figment's act, not yours: it does not reveal you. Picturing does not either | engine |
| 12 | **Area and friendly fire**: every area hits a Figment as a unit of your side (your own grenade included). Figment attacks never pick allies. NULL (Sigil) unmakes Figments on the tiles it covers (`sigils.json null.dispel` gains `figment`) | engine |
| 13 | **Forced movement**: `displace` moves Figments as units; a Wall is immune (`immunity: knockback`). Sleight and swaps treat them as willing | engine |
| 14 | **Co-op**: Figments are the owner's; only the owner's player sees their verbs. Allies see them as squad units; Many Hands, Calls and heals may target them (a Call that gives AP does nothing to a unit with no AP) | engine |
| 15 | **Calls through the Double** (Charisma's door into this): a Call may be spoken from your Double's tile instead of yours (range counted from it) | engine |
| 16 | **Saves mid-fight**: Figments are units in `cb.units` with an `owned` tie to their owner (P8, P9); the event log is the save. **The fight's end** unravels every Figment and Scrap Turret; spent charge stays spent | engine |
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
| `double` | **Double** | Vis 1 | 2 | 30 / your Defense / 0 | yours | Move (1). Lures: the table above | `figments.json forms[double]` |
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
`Character.figments`). Ready: 2 at Visualization 3, 3 at 5, 4 at 8, 5 at 10 (Rigger +1). A bare form is always ready,
so at Visualization 1 and 2 the bare Double is the whole kit.

## 4. The ladder

| Visualization | What it gives |
| --- | --- |
| every point | projection range 4 + Visualization; Figment accuracy is the modifier (points − 1; −2 at 0) |
| 1 | **The door, its whole loop, smaller** (a new unlock row `"1"`; skills.json unlocks start at 3): Picture; **the Double**; 1 held; range 5. The Visualizer also works out of a fight (rule 17) |
| 2 | range 6 |
| 3 (M1) | **Eye and Wall**; 2 ready designs, one trait each (replaces the unbuilt Afterimage unlock); a perk step |
| 4 | range 8 |
| 5 (M2) | 2 held; **Beast and Blade**; 3 ready designs (replaces Paint the Field, a Sigil rider: nine doors 15.5 "replace when Figments are built") |
| 6 | range 10 |
| 7 (M3) | 3 held; two traits a design; a perk step |
| 8 | 4 ready designs |
| 9 (M4) | a destroyed Figment no longer Snaps; a perk step |
| 10 | 5 ready designs; the Mastered perk (Solid Image, reworded onto Figments: once a fight, 0 AP, a Figment takes no damage until your next turn) |

**Gear gates:** `gear:projector` (the Visualizer, Visualization 1) and `gear:illusion` (unchanged), both already in
`skills.json visualization.gates`. The per-point line "+5% elemental damage" goes (the elemental pair has had
no slope since rules 1.26); it becomes "+1 projection range; Figment accuracy".

**Improvisation (beta) adds Field Repair, everyone's door action** (today's unlock 3, kept and widened; **one action
`field_repair`**, `combat.ts fieldRepair`: the Rigger's Field Fix is a class item on it, section 5):

| Field Repair | Number | Field |
| --- | --- | --- |
| Cost | 2 AP and one spare part (a pack item anyone carries, as stims: rev4-primitives 3.7) | `actions.json costs.field_repair`, `res.parts` 1 |
| Reach | you, or an ally, machine or Figment next to you | |
| Pick one | clear a jam · restore weapon durability 10% + 5% a point above 3 (today's numbers) · **repair** a robot, drone, turret, Factory Made squadmate or Figment for 15 on the `repair` profile (a Downed machine comes back up) | `skills.json proficiency.unlocks.3.amounts.repair` |
| Needs | Improvisation 3 | |

At a normal share (Expression 4, Improvisation 4) a repair is 15 × 1.392 × 1.36 = 28 at level 1, a little over half a
Triage, because it costs a part. Improvisation's −10% ambush damage taken stays. **Charisma (gamma)** adds no number:
its Call may be spoken through your Double (rule 15), and it is the Double's voice that makes the liar.

## 5. The Rigger *(Suggested; was Trickster)*

**Better** (Rev 4 section 2's three kinds):

1. **A bigger meter:** one more Figment held (2 at Visualization 1, 3 at 5, 4 at 7: `ties_max:owned` +1), and one
   more ready design.
2. **One thing a turn cheaper:** **Overclock** (below; as Speed Loader is the Skirmisher's), once a turn.
3. **Six moves.** The Rigger's Double, Field Fix, Salvage, Overclock and the Scrap Turret need no Visualization: a
   Rigger with Visualization 0 still has them; its extra held Figment needs the door (Visualization 1).

| Rank | Key (kept ids) | Move | Cost | Effect, with numbers | Limits |
| --- | --- | --- | --- | --- | --- |
| I | `class:trickster.false_image` | **Double** | 2 AP, 1 charge | a bare Double appears within projection range (6 for a Rigger without the door) and lasts until your turn start 2 rounds on; no upkeep, outside your held count | one at a time; needs the Visualizer in hand |
| I | `class:infiltrator.field_fix` | **Field Fix** | 2 AP | the one action `field_repair` (section 4) with its `res.parts` set to 0, no Improvisation gate, and `reach` 2 tiles; the same amount (repair 15, `repair` profile) | at will |
| II | `class:trickster.salvage` | **Salvage** | 1 AP | next to you, one of: a **wreck** (a destroyed robot, drone, turret or machine of either side) gives 2 charge to your Visualizer core; one of **your Figments** is let go with its whole charge back; or **repair** a machine or Figment of your side, base 15 | each wreck once a fight (`uses(h).on(wreck)`) |
| II | `class:trickster.overclock` | **Overclock** | 1 AP | a Figment or machine of your side within 8 that your side sees takes one of its actions **now**, of up to 2 AP, at no AP; it takes 5 flat true damage | once a turn; never a character (AP given to a character is a gamma's, nine doors 15.7) |
| III | `class:trickster.sleight` | **Sleight** | 1 AP | swap places with one of your Figments or a standing ally within 6; no opportunity attacks | once a scene |
| III | `class:trickster.scrap_turret` | **Scrap Turret** *(Suggested; Rev 4's Jury-Rig)* | 3 AP | from a wreck, a pile with a weapon, or a barricade next to you: a turret (40 HP × the Figment HP level term, Defense 10, armour 5, no move) on a free tile next to it. At each of your turn starts for 3 rounds it makes that weapon's plain attack, whatever the weapon (weapon-neutral: a gun or bow at the nearest enemy it sees in range, a melee weapon at an enemy in its reach; a barricade, a wreck or a consumable such as a grenade, which one use spends: the service pistol's), rolling d20 + your Improvisation modifier, damage on the `weapon` profile at your level | once a scene; one at a time; a machine (Overclock and repairs work on it), not a Figment |

**Machines of your side that exist today** (found in data and the engine): the Drone Handler's drone and the Beast
Handler's beast (traits; `enemies.json companions`, units with `ctrl`, their own turn at `init − 0.5`), the Twinbound
twin (`classes/k.ts`, shelved), Factory Made characters (`traits.json factory_made`), the Sigil WATCH turret (a zone,
10 HP). Overclock: the **drone** takes a move or shot now (beside its own turn); the **beast** is not a machine; a
**Factory Made** squadmate is a character (refused); a **WATCH turret** casts now at its ×mult, 5 off its HP; a
**Scrap Turret** fires now. Field Fix, Salvage's repair and Field Repair work on the drone, the turret, Factory Made
squadmates and Figments.

**Leaves:** Read (to the Operative), Blind and Slow (to the common words), Silver Tongue (talk is no class's move),
Rewrite (move pool). **Squared and mixed classes** (Rev 4 4.6, the Mirage): **a sketch of the shape only; no rule,
primitive or number here may depend on it** (Leon, 13 Nov: the advanced classes may be shelved for a whole new system).

## 6. On what exists

**What it is built from.** The False Image (`illusion.ts`: `FalseImage.fooled`, `perceivedFoes`, `fooledBy`,
`ghostOf`, `strikeImage`) is the Double's lure; companions (`tactics.ts companionUnits`, `combat.ts levelCompanion`,
`enemies.json companions`) are the shape of a unit built from a block at its owner's level; Field Repair
(`combat.ts fieldRepair`, `skills.json proficiency.unlocks.3`) and Field Fix (`classes/rev3.ts infiltrator.field_fix`)
are the repairs; Sleight (`classes/rev3.ts trickster.sleight`) stays as is.

### 6.1 Built from (each rule against the primitive that carries it)

| Rule or verb | Primitive (verified) |
| --- | --- |
| Picture, Let go, every Figment verb | `verb` items (P6) in `data/figments.json`, `requires: [{skill: "visualization", min: n}]`, their `grant_action` with `reach`; Picture runs op `spawn`, Let go op `unmake` (`refund`) (P9); a Figment's verbs listed by the action system `owned` (P9). The six moves: class items, as today |
| AP of every verb, the core swap | `effects/cost.ts price / whyNot / pay` with sites in `actions.json costs` (`picture`, `let_go`, `figment_move` …, `swap_core` exists) |
| Charge, upkeep | a row `vcharge` in `actions.json resources` (`path: vis.charge`), paid through `res`; upkeep is the spawned block's `upkeep {res, n}` (P9), paid by the owner (`payer`, P9) |
| Upkeep's AP for the third, Snap | item ops: `when: turn_ap` + `op: grant_ap` (value −1), `when: kill` + `if: {target_tied: "owned"}` (P8) + `op: mark` (flag), cleared by `mark` |
| Once a turn / a scene / a wreck once | `effects/uses.ts` (`per_turn`, `per_scene`, `uses(h).on(t).take('per_combat')`) and data `limit` |
| Figment attacks, Scrap Turret shots | the plain attack (`resolveAttack`, `previewAttack`) of the Figment unit with its weapon (`weapons.json figment_claws`, `figment_edge`); accuracy through `rolls.ts`; damage through `effects/output.ts` with a new profile row `figment` (data only) |
| Pounce's Prone, Stare's sight | `when: hit` + `if: {action}` + `op: condition` (`prone`, a row); Stare: `op: condition` `watched`, a new row answering stat `always_seen` (P4, P7) for that one unit |
| Immune to conditions, Wall unpushable | `op: immunity` (`family:body`, `family:brain`, `family:heart`, `bleed`, `knockback`) on the form |
| Volatile, Barbed, Overclock's 5, repairs | `amounts` blocks with `op: deal` / `op: mend` (profiles `flat`, `repair`); Volatile's area `targets: {of: "self", shape: "burst", within: 1, side: "any"}` (P5) |
| Double saves | `magic.ts saveAgainst(..., 'brain', 'visualization')` (`saveTn`), the +5 after a find-out as `ctx.saveAdd` on the `save` hook |
| Fooled targets, healer hunt | `illusion.ts` (an image whose body is a unit: `FalseImage.body`), `combat.ts enemyRank` (one term `owned_weight` in its sort key, read from `enemies.json` tiers beside `fire_spread`) |
| Wall cover and sight | the spawned block's `cover` (P9): `combat.ts coverOf` and `sightBlockers` include a living unit whose block has it (one line each) |
| Eye's sight, the fog | `eyes: false` on every block but the Eye's (P7); `fog.ts fogFight` needs nothing (owned units are units; the side's ties are kept, P8) |
| The Blade's Hold | `limit: {reaction: 1, of: "owner"}` (P1's `payer` from data, the batch row `limit.of`) |
| Forced movement, swaps | `displace`, `swapUnits` |
| Clear a jam, restore durability | a `jammed` row in `conditions.json` and `op: cleanse`; durability through `op: resource` with a `durability` row (`path: dur`) |
| NULL on Figments | `sigils.json null.dispel` gains `figment` |
| The log, the cards | `say` (Figments are named units); the one hover card (`previewDescriptor`) |

### 6.2 Needs a new primitive (shapes in `rev4-primitives.md` only; none restated here)

**P9, the owned unit** (ops `spawn`, `unmake`; the block's `turn: owner | own | auto`, `eyes`, `upkeep`, `cover`,
`lure`; `payer` on `price` / `pay`; the action system `owned`; the drone, the beast and the twin migrate with
`turn: own`), standing on **P8 ties** (the tie `owned`; `target_tied: "owned"`, `actor_tied: {kind: "owned", as:
"from"}`; the held count `ties_max:owned`). Also P1 (`payer`, the Blade), P4 and P7 (`watched`, `eyes`), P5
(Volatile), P6 (the verbs, `reach`), and the batch row `limit.of`. Scrap Turret is `turn: auto`.

**Moves and removals.** Visualization gains an unlock row 1 (the door); unlocks 3 (Afterimage, never built) and 5
(Paint the Field) are replaced (4).
`classes.json trickster`: renamed Rigger, `resource` → `figments` (held) with `also_uses: vcharge`; Read, Blind and Slow,
Silver Tongue, Rewrite leave (Rev 4 section 5). `trickster.false_image` keeps its key and becomes the Double (Figment);
its Evoker gate and `brain_power` save become the Visualizer and `visualization`. `infiltrator.field_fix` keeps its key
on the Rigger, as a class item on `field_repair`; `classes/rev3.ts infiltrator.field_fix` is deleted. Old characters: a new save each update (Leon, 10 Nov); a saved fight's `cb.images` still read.

## 7. Balance

**The new ceiling: Figments, 150% of a rifle-turn** (`balance.ceilings.figments`). Reason: the best gun steady is 145
(a tool you buy, load and keep), plus session supply +5% (cores); the set-up (Picture) is inside the measure; the owner
stands out of reach, so no exposure allowance. **The lines (Leon's budget reading, 13 Nov):** the Rigger all in sits
ON it, **150**; the door all in 150 ÷ 1.15 = **130** (about 13% under); the door at a normal share 130 ÷ 1.25 =
**104**; the Rigger at a normal share 150 ÷ 1.25 = **120**. (The squared column, 150 × 1.13 = 170, is not designed.)
**Dial: `rules.json output.factors.figment`, the Figment factor, 0.9**, on every attack made through a Figment: acting
through a Figment deals at most 0.9 of what the same AP of the plain rifle does; its worth over the rifle is the soak.

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
| **Mean** | | | | | **120 / 129** | **138 / 148** |
| **Line** | | | | | 104 / 130 | 120 / 150 |
| **Off it** | | | | | **+15%** / −1% | **+15%** / −1% |

A is the plain rifle's measured all-in ratio (129 / 113 / 112 / 101, contract section 3). **The Rigger** adds Overclock
(a Strike for 1 AP: D = 4/5 × 90 × A) and a third body (S × 1.1: enemy fire is finite, a third body soaks little more).
Both all-in rows sit on their lines. **Both normal rows read 15% high, outside the ±12% band:** the estimate gives a
normal share the same Beast and Wall at every level, but both need Visualization 5 (Beast; 2 held), which a normal
share reaches only around level 5; at levels 1 to 4 it holds one body. The measure decides; if the normal rows stay
high, the soak dial below is the one to move. Charge: 7 to make, 2 a turn: about 15 a fight, 1.5 cores (225 credits).

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
{ "id": "beast", "name": "Beast", "kind": "verb", "requires": [{"skill": "visualization", "min": 5}], "charge": 4,
  "hp": 45, "defense": 12, "armour": 3, "tiles_per_ap": 3, "weapon": "figment_claws",
  "turn": "owner", "eyes": false, "upkeep": { "res": "vcharge", "n": 1 },
  "text": "A fast striker the bots build from your picture: {=hp} HP, Defense {=defense}, {=tiles_per_ap} tiles an AP. Strike ({=effects.0.ap} AP) is a melee attack with its claws. Pounce ({=effects.1.ap} AP) runs up to {=effects.1.reach.tiles} tiles in a straight line and strikes; a hit knocks the target Prone unless it passes a Body save.",
  "effects": [
    { "op": "grant_action", "action": "figment_strike", "ap": 2, "uses": "at_will", "attack": "plain", "reach": { "tiles": 1, "side": "foe" } },
    { "op": "grant_action", "action": "figment_pounce", "ap": 3, "uses": "at_will", "attack": "plain", "reach": { "tiles": 3, "side": "foe" } },
    { "when": "hit", "if": { "actor": "self", "action": ["figment_pounce"] }, "op": "condition", "condition": "prone" },
    { "op": "immunity", "to": "family:body" }, { "op": "immunity", "to": "family:brain" },
    { "op": "immunity", "to": "family:heart" }, { "op": "immunity", "to": "bleed" } ],
  "adjudication": "engine", "provisional": true }
```

The form is the block op `spawn` makes (P9: `turn`, `eyes`, `upkeep` on the block); Picture's `spawn` names it.

```json
{ "id": "overclock", "name": "Overclock", "ap_cost": 1, "uses": "per_turn",
  "amounts": { "strain": { "kind": "damage", "base": 5, "profile": "flat", "type": "true", "provisional": true } },
  "text": "Costs {=effects.0.ap} AP, once a turn. A Figment or machine of your side within {=effects.0.reach.tiles} tiles that your side sees takes one of its actions now, of up to {=effects.0.max_ap} AP, at no AP. It takes {=amounts.strain.base} damage, more at higher levels. Never a squadmate.",
  "effects": [
    { "op": "grant_action", "action": "overclock", "ap": 1, "uses": "per_turn", "max_ap": 2,
      "reach": { "tiles": 8, "sight": true, "side": "ally", "if": { "target_kind": ["machine"] } },
      "effects": [ { "op": "cost_mod", "site": "owned_act", "value": -2, "min": 0, "limit": { "per": "per_turn", "n": 1 } },
                   { "op": "deal", "amount": "strain", "target": "target" } ] } ],
  "adjudication": "engine", "provisional": true, "origin": "trickster", "new": true, "status": "active",
  "surface": "combat", "attributes": ["expression"], "fantasy_tags": ["mechanic", "machine", "tempo"] }
```

A Figment is reached by `target_tied: "owned"` where `target_kind` does not cover it (rev4-primitives section 2 gives
both readings; the builder keeps one `reach.if`).

**Validator rules to add:** every `spawn` names a block in `figments.json forms`, `enemies.json companions` or a
turret block; every form's `weapon` exists in weapons.json and is not on any loot table; `upkeep.res` is a row of
`actions.json resources`; a trait's fields are among `hp_mult`, `tiles`, `weight`, `range`, `lure`, `upkeep`, `roll`,
`charge`, `amounts`; `ladder` held counts (`ties_max:owned`) rise with points, start at Visualization 1 and stay ≤
`limits.bodies`; every form text binds its numbers with `{=…}`; `item_ops.ops` lists `spawn`, `unmake` and `tie`;
`rules.json ties.kinds` lists `owned` (`on_end: "unmake"`).

## 11. Open questions for Leon

**Settled** (L = Leon; lead = the lead's call from this spec's recommendation, which Leon can reverse):
1. **The door opens at Visualization 1**, smaller: one Figment, the Double (lead; was 3 here). The ladder (4) follows.
2. **Budget reading** (L): the Rigger all in on 150; the door all in 130, normal 104 (section 7).
3. The Rigger's "cheaper" is Overclock, not a free first Figment (lead). 4. The Blade's strike spends your reaction (lead).
5. Upkeep 1 charge a Figment a turn, the third also 1 AP (lead; measure). 6. Salvage takes 2 charge from a wreck (lead).
7. Jury-Rig is renamed **Scrap Turret** *(Suggested)* (lead). 8. Overclock never targets a character (lead).
9. **Field Fix is the Rigger's class item on the one action `field_repair`**: no part, no gate, reach 2, the same
   repair 15 (lead, rev4-primitives 3.4: the old Field Fix, 20 flat, healed less than the door's 28 at a normal share).
10. Ceiling 150% for bodies on the board and the factor 0.9 (lead); the soak share is the estimate most likely wrong.
11. The advanced classes are a sketch only; the Warden and Hexer bridges are dropped from this spec (L).

**Settled by Leon (13 Nov): the Visualizer is a glove, worn on the hand like the other focuses, with a projector set
in the middle of the palm.** You hold the palm out and the bots build what you picture in its light. Off hand, 1 kg,
1,000 credits, as the Evoker (those numbers are the lead's, PROVISIONAL). Art: `art/briefs/ART-REQUESTS.md`.
