# Figments 2.0: a door that grows (proposal for the lead to rule)

15 Nov 2026. Status: **draft, nothing built**. Every number below is PROVISIONAL and a data field
(`data/figments.json`); the spec (rules 1.34) changes first if this is accepted.

Leon, playtest 15 Nov: "visualization feels underwhelming as shit bro, no unlocks, no notthing, their isn;'t even
special icon for each summon".

## 1. What is weak today (three lines)

1. Growth is a static table (`figments.json ladder`, `figments.ts ladderAt`): nothing is earned in play, nothing is
   discovered, every Rigger at the same points is the same Rigger.
2. The choices that exist are unreachable: traits and designs need `figments/design`, and the web client never sends
   it (no hit in `apps/web/src`), so a player only ever pictures bare forms and never meets a trait.
3. Nothing reads as its own thing: five text glyphs on the owner's badge (C6 portraits not painted), no catalog ids,
   no moment when something opens; and the worth is mostly soak, not anything the player does.

## 2. The growth model (three channels, like the other doors)

| Channel | Model it copies | What it gives |
|---|---|---|
| **Ladder** (points) | the ladder today | held, range, designs, trait slots, Snap; the bare forms |
| **Forks** (a choice at M1 and M2) | `perk_choice` / a `pick` list | one form of a pair now, the other later: two Riggers differ |
| **Sightings** (first time something happens) | Outburst feelings (`felt`, `feelChar`) | the traits: each is discovered by doing its deed, once, for good |
| **Sketching** (practice counter) | Outburst practice (`soul_modules.json practice`) | a trait pick at 5, 15, then every 15, for a trait not yet sighted |

### 2.1 The ladder (Visualization step or deed | what opens)

| Step or deed | What opens |
|---|---|
| Visualization 1 | Picture; the **Double**; 1 held; range 5; **two sightings armed** (Armoured, Hollow can happen) |
| Visualization 3 (M1) | **Fork A:** Eye *or* Wall; 2 designs, 1 trait slot; the **design editor** opens |
| Visualization 5 (M2) | **Fork B:** Beast *or* Blade *or* Hand; 2 held; 3 designs |
| Visualization 7 (M3) | the Fork A form not taken; 3 held; 2 trait slots |
| Visualization 8 | the Fork B forms not taken; 4 designs; **Snare** |
| Visualization 9 (M4) | no Snap |
| Visualization 10 (Mastered) | 5 designs; the Mastered perk; a free trait pick |
| Sketching 5 / 15 / +15 | a trait pick (any trait not yet sighted) |
| Each Mastery level | +5 sketching (as `mastery_bonus`) |
| A sighting (table 2.2) | that trait, permanently, with a cut-in line and an `fx` |

### 2.2 Sightings (the discovery list; each is one data row: `sight: {when, if}`)

| Trait | Sighted the first time... |
|---|---|
| Armoured | a Figment of yours takes a hit and stays up |
| Hollow | your Visualizer runs to 0 charge |
| Swift | a Figment of yours moves its full pace in one action |
| Loud | an enemy attacks a Figment of yours while you stand in its reach |
| Mirror | a Double of yours is attacked in an ally's place (the lure takes) |
| Keen | a unit your Eye Stared at is downed that turn |
| Barbed | a Figment of yours is hit in melee three times in a fight |
| Volatile | a Figment of yours is destroyed next to two enemies |
| Tethered | you Picture at your full projection range |
| Lasting | a Figment of yours lasts a whole fight |

## 3. The figments (each a distinct job, each its own icon)

Icons: monoline, `art/style-guide/weapon-icons.md` (64 grid, 2-unit round stroke, `currentColor`, one silhouette
plus a few interior lines, nothing floats). Id `figment.<form>` in `art/catalog.json`, file
`art/icons/figments/<form>.svg`; read by a form's `icon` field. The painted C6 portraits stay wanted and win where they exist.

| Figment | Job (8 words) | Icon silhouette |
|---|---|---|
| Double | draws enemy fire away from you; a lure | a hooded head-and-shoulders bust split down the middle, one half hatched with bot flecks |
| Eye | sees for your side, marks one unit seen | an almond eye with a hexagonal iris, two short wing blades at the corners |
| Wall | moving full cover that blocks sight and paths | a tower-shield slab, three horizontal seams, a notched top edge |
| Beast | fast striker that dashes in and knocks Prone | a hound's head in profile, open jaw, one angled crest line |
| Blade | guards adjacent tiles; cuts whoever comes or goes | a single-edged hovering blade, point down, a ring at the hilt |
| Hand *(new)* | carries your pack's item to an ally, applies it | an open gauntlet palm up with a capsule across it |
| Snare *(new)* | hidden tile trap that roots the first enemy | a four-pronged caltrop star inside a broken circle |
| Scrap Turret (Rigger) | three rounds of shots at the nearest foe | a squat tripod turret, welded plate seams, one short barrel |

Hand: 20 HP, Def 14, flies, 3 tiles an AP, charge 2, no attack. Its verb **Hand over** (1 AP of yours): an item from
your pack (a stim, a magazine, a core) is used on an ally next to the Hand, through the item's own action and cost
site (`stim`, `reload`, `swap_core`), as if you stood there. Snare: 10 HP, Hidden to foes until sprung, charge 2, Hold
with Rooted 1 round (Body save) in place of the Blade's Cut, then it unravels.

## 4. Damage (inside the ceilings)

The door's ceiling is the magic-like line: steady about **135% of the plain rifle** in the same hands
(`2026-11-balance-2.0.md`, `2026-11-baseline-0.29.md`). Step 8 measured a normal-share Rigger at 158 against 120 (+32%),
nearly all of it soak. So 2.0 **adds no damage**: the figment profile stays k 1.5 (`output.profiles.figment`); the new
forms deal none; growth is breadth (jobs, traits). The soak refit of step 7b (`level.hp`) is done with it, and
`survival-run.ts` (`rigger`, `solo_rigger`, `four_casters`) must show the Rigger at or under its line before merge.

## 5. Built from

| Rule | Existing primitive |
|---|---|
| A new form is one data line | `figments.json forms[]` (`owned_kind`, `opens`, `charge`, `verbs`); `spawn` op / `spawnOwned` |
| Ladder rows, Snare at 8 | `ladder[]` read by `ladderAt` (rows add forms) |
| Forks | `pick` lists (`registerPickList`), the `choice` predicate; an out-of-fight pick like `sigil/learn` |
| Sketching thresholds, Mastery bonus | the shape of `soul_modules.json practice` (`thresholds`, `then_every`, `mastery_bonus`) |
| Survival rest / training gives sketching | `survival.json train` / `training` (one more field, beside `practice`) |
| Sighting deeds | triggers `damaged`, `downed`, `moved`, `acted`, `combat_over`, `hit`; predicates `target`, `melee`, `self_alive`; `uses().first()` |
| Hand over | `grant_action` with the item's own action (`stim`, `reload`, `swap_core`) and cost site |
| Snare | the Blade's `hold` with `condition` (`rooted`) for its reaction; `hidden` |
| Unlock moment on screen | `emitFx` and the story note, as `feelChar` |
| Icons | `art/catalog.json` ids, a form's `icon` field beside `portrait` |
| Saves | `ladderAt` today: on load, a character holds every form its points open now (the forks fill as taken) |

## 6. Needs a new primitive (general pieces only)

1. **One unlock op over named lists** (`unlock: {list, id}`), generalising `unlock_word` and `feelChar`: a known-list
   on the character, an `fx` and a story line. Sightings are then data (`sight: {when, if}` on each trait), not code.
   Feelings' 28 hand-coded `feelUnit` calls could move onto it later.
2. **One practice ledger by door** (`c.practice[door]`, thresholds from the door's data): the Outburst's
   `soulPractice` and figment sketching read it; `soulPractice` migrates into `practice.soul`.
3. **Predicate `owned_by: self`** (the target or actor is an owned unit of the holder), if `target` cannot say it
   today (to check in `docs/ENGINE-HOOKS.md` before approval).

Each is the lead's to approve; nothing is built until then.

## 7. Saves

A Rigger of today loads with every form its points open (both sides of each fork it has passed), its designs and its
held count; it has no sightings, so its traits come from an opening grant: one free trait pick at Visualization 3
and one at 7 if it has the points. Nothing it had is lost.

## 8. The cheapest first step (one small release) against the full version

**Small release, no new primitive:** (a) the eight monoline icons, catalog ids and the `icon` field on the token and
the FIGMENTS tab; (b) the design editor in the client (the action exists: `figments/design`), so traits and designs
are reachable at last; (c) a level-up card and a cut-in line when a ladder row opens ("Visualization 3: the Eye and
the Wall"). That alone makes every unlock visible.

**Full version:** forks, sightings, sketching, Hand and Snare, the soak refit, three primitives.

## 9. Questions for Leon

1. Forks: one form of a pair at M1 and M2, the other later, or keep every form by points?
2. Hand (passes a stim or magazine to an ally, from the playtest) and Snare: in?
3. 2.0 adds no damage and the soak refit trims the Rigger to its line: is growth by breadth enough?
4. Monoline icons now, the painted C6 portraits later, or only the portraits?
