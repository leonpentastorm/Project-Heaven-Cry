# Doors 3.0: the buildable spec (forks, beta feeds, the reshape)

A proposal. Written 16 Nov 2026 for the lead, on branch `design/layers`, from Leon's rulings L1 to L5 of the same day
("0.30: Extend the scope, everything in") and the checked background `2026-11-three-layers.md` (revision 2). Design and
spec text only: no code, no data. Every name marked *(Suggested)* is Leon's to change; every number is PROVISIONAL and
named as the data field it will be. **Revision 2** (same day): the 30 review holes checked against the code and closed;
the tank lane's measured numbers (rules 1.59, head `a995b3ea`) folded into sections 3 and 8. The account is the Review
at the end.

**Code read.** `origin/wip/lane-shield-either-hand` at `a995b3ea` (shields as weapon rows, rules 1.57; follow strikes,
rules 1.58; the tank rulings T1 to T7, rules 1.59) and, by `git show`, `origin/wip/lane-0.29-tabs` (the bare heart and
the Mana Shock, rules 1.56; the tab settings). The merge the brief asked for conflicted again (the octopus, then the
shield lane alone, on `data/skills.json`, `docs/ENGINE-HOOKS.md` and `gearpreview.ts`), so it was aborted as the brief
says and both lanes were read in place. Every `file:line` below is on the shield lane. **Rules numbering:** the tank lane
took rules 1.59 and items 4522 to 4528; this block is therefore **rules 1.60** (items 4600 onward still clear).
**Found on the way:** the two lanes both number spec items from 4500 (the tabs lane's Mana Shock 4500 to 4511, the
shield lane's 4497 to 4521). One of them must be renumbered at merge; this spec takes **4600 onward** to stay clear.

**Leon on balance (16 Nov):** *"the balance number i laid out was always about how much a class gets rewarded when it
make all the deceision right, the target is FUN and REWARD for the effort you put in, not a hard cap to cry about when
something goes 2% over."* Section 8 measures to that.

---

## 1. The layer rule (spec text, ready to paste)

> ## Rules 1.60 (Doors 3.0), the layers
>
> Leon, 16 Nov 2026. A later revision overrides the body and the earlier ones. Items 4600 onward.
>
> 1. **The door.** Each attribute's alpha skill opens its door at 1 point: its verbs, its resource and its stated
>    limits, the same for everyone. A door owns its outcome's **best form** (the cheapest, surest and strongest
>    version, with the door's own rider), never its only form: another door may make the same outcome at its own price.
> 2. **The forks.** Each door has two forks, at **4** and **6** points of its alpha skill (off the perk steps at 3, 5,
>    7, 9), two options each, picked once out of a fight through the one choice action (`door/pick`) and kept for good.
>    A fork is a **style of the door's own verbs**: every option runs on, reads, or is paid in **that door's own
>    resource** (the table below), gives no new outcome another door owns at its best form, never needs a point in
>    another door, and never reaches the door's peak. A character who raises two alpha skills to 6 holds four forks.
> 3. **The base class** is the best user of one door up to its **ceiling** (rank III and the Mastered perk sit there):
>    more resource, cheaper, more often, one stronger rider. It adds no outcome the door does not make, touches no second
>    door, reaches no peak. Neither fork option at either step may be made dead or dominant by its own base class.
> 4. **The advanced classes are concepts only** (Leon: *"their names, already built skills and everything is in flux
>    and does not get account into balance until the gates, the mixed (using 2 door), and the base class is already set
>    in stone"*). Two kinds are reserved: a **squared class** (one attribute twice) takes one door to its **peak**
>    (below); a **hybrid class** (two attributes) connects two doors (one door's verb fills, spends or carries the
>    other's resource or verb: the only place a resource crosses doors). This revision names no advanced class and
>    balances nothing against one.
> 5. **The reserved peak of each door.** Nothing below a squared class reaches it: no fork, no base class move, no
>    perk, no trait, no item, no boon, with one exception (item 6).
>
> | Door (alpha skill) | Its resource (what a fork runs on) | The reserved peak (squared class only) |
> |---|---|---|
> | Guard (Durability) | Guard: the plates | Every blow on every ally around you, melee and ranged, the whole blow, to your plates, standing (no reaction); a plate that soaks a full blow stands; Retort with no reaction against every attacker |
> | Momentum (Raw Power) | Momentum: the chain | The counter past ×5; a Finisher kill that keeps the whole counter (from all sources together, at most 1 is left below the peak) |
> | Pressure (Dexterity) | Pressure: the pips | Pips on more than one target from one shot; a shot before initiative |
> | Shadow (Ingenuity) | Shadow | Hidden in plain view as a standing state; a Ghost Kill that gives its Shadow back; shade where you want it at will |
> | Sigils (Brain Power) | Flux (and the glyphs on the ground) | A Line of 5; a glyph on a tile not your own; the grand forms (Enlarge, Spring, Dome) |
> | Figments (Visualization) | Visualizer charge, the held count | A Figment that takes its own turn; a Figment that outlives the fight |
> | Bonds (Empathy) | MP through a Bond (the thread) | Acting from a Bonded ally's tile; damage shared between two allies along a Bond |
> | Outbursts (Will Power) | Strain (and the stage) | Anything past stage 4; the same school twice; Begin above stage 0; the advanced modules |
> | Prayer (Faith) | The prayer slots: the turn's Whisper and the Hymn's wait | Standing Witnessed; Witnessed renewed by a Whisper; interventions on your call or more than Devotion gives; a second Miracle |
>
> 6. **The Mastered perk.** A door's Mastered perk sits at the ceiling: a personal twist. It **may** give a
>    once-a-fight taste of its door's peak (Vanishing Act's Hidden in plain view is the model). When a squared class
>    later makes that peak standing for its holder, the Mastered perk **never goes dead**: the squared class's own rows
>    must turn it into an **extra use or a stronger use** of the same thing (a second use a fight, or the same use with
>    its next step: an ally beside you, a round longer). A squared class whose spec leaves its door's Mastered perk with
>    nothing to do is not accepted. A Mastered perk that tastes a peak more often than once a fight is re-tuned to once a
>    fight (item 4614: none does today).
> 7. **The beta feeds its door.** Each attribute's beta skill raises one number of its own door, and only that beta
>    raises it: the door's number × (1 + 0.01 × alpha points × beta points) (section 3). At beta 10 and alpha 10 it is
>    doubled. What each beta did before is kept.

### The Mastered perks against the peaks (item 4614)

| Alpha | Mastered perk | Tastes a peak? | Ruling now | Owed by the squared class later |
|---|---|---|---|---|
| Durability | Last Wall | No (stop a death is the door's ceiling) | none | none |
| Raw Power | Earthbreaker | No | none | none |
| Dexterity | Trick Shot | No: the ricochet is not a hit (`perks/c.ts:191` calls `applyDamage` with no `on_hit`, and Pressure comes only from `on_hit`, `physical/rules.ts:30`), so it lays no Pressure on the second foe today | none | none |
| Ingenuity | Vanishing Act | Yes, once a fight (Hidden in plain view): allowed | none | Per² makes Hidden in view standing: Vanishing Act becomes "twice a fight" or "an ally next to you vanishes with you" |
| Brain Power | Clean Draw | No | none | none |
| Visualization | Solid Image | No (the Double still acts on your turn) | none | none |
| Empathy | Open Hand | No | none | none |
| Will Power | The Twin Pays | No (a free Begin, still at stage 0) | none | Det² Begins above 0: The Twin Pays becomes "Begins at stage 1" |
| Faith | Judgement Day | No | none | none |

---

## 2. The forks

**How every fork is shown.** The option's rule text is what the player reads (its numbers will be `{=placeholders}`).
"Fields" are the data fields with their starting values. "Carrier" names the primitive (section 5 has the file:line;
**N#** is a "Needs a new primitive" entry of section 6). "Excite": the turn a player takes with it that they could not
take without it.

**Where they live.** One new data file, `data/forks.json` (kind `forks`), one row per option: `id`, `door` (the alpha
skill id), `step` (4 or 6), `name`, `icon`, `text`, `effects` (item ops), `numbers`, `provisional`, `adjudication:
engine`. Each alpha skill in `skills.json` gains `forks: [{ "id": "a", "at": 4, "of": [two ids] }, { "id": "b", "at":
6, "of": [two ids] }]` and two unlock rows, `"4"` and `"6"`, whose text is the choice. Figments keeps its own forks in
`figments.json` (its options are forms). A picked option is a data verb (ItemKind `verb`, as the door verbs already
are, `effects/collect.ts:46`) whose `requires` is `{door_pick: <door>.<option>}` (N1), so a fork that only adds rules
is data alone; a fork that changes an existing row reads the pick (N2). A fork verb names its door's existing `tab` or
none (`doorTabsOf` makes tabs from verbs' `tab`). **Row order inside an option:** a row that puts a mark (Grindstone's,
Converging Fire's) comes after the rows that read it, or the first hit counts itself.

### 2.1 Guard (Durability; plates)

| | Option A | Option B |
|---|---|---|
| **4** | **Provoke** *(Suggested)* | **Cover Them** *(Suggested)* |
| **6** | **Stand Fast** *(Suggested)* | **Drive** *(Suggested)* |

**Provoke** (`guard.provoke`). *"While you hold Guard, the first foe each round whose blow your plates soak is Taunted
by you for {=numbers.rounds} round, with no save (a Boss too: it is never forced, but it is worse at hitting anyone
else)."*
- Fields: `rounds: 1`; limit `per_round` n 1. Why: one free Taunt a round is Challenge's price (1 AP, 1 Guard) saved
  once a round; two a round would leave Challenge with no job.
- Runs on: plates (it fires only on a soak). Carrier: trigger `taking`, `if {target: self, actor: foe, by_hit: true,
  self_has_res: [guard]}`, op `condition taunted target: actor skip_save rounds`.
- Bulwark: its Challenge (with Draw Fire merged, section 4) taunts on its turn; Provoke taunts on theirs. Perks: Answer
  in Kind (hurt → damage) and Weight of the Wall stack with it, no overlap. Peak: no.
- Excite: walk into the gunline holding plates; the first rifleman to fire at you is stuck on you while your squad
  flanks him.

**Cover Them** (`guard.cover_them`). Leon: *"you have an aoe around you, any ally that's about to get hit by a range
attack you take that hit instead"*. *"An Answer (on until you switch it off): while you hold Guard, the first ranged
hit each round on an ally within {=numbers.within} tiles of you lands on you instead. Your plates soak it as any blow,
and it costs {=numbers.guard} Guard more. It uses your reaction."* (A Burst or Mag Dump is several hits: the first
comes to you, the rest land on the ally: `taking` moves one damage packet.)
- Fields: `within: 2`, `guard: 1` (= `rules.guard.interpose_cost`, one copy: the field reads it). Why 2: Close Guard is
  adjacent, Stand behind me is the one tile behind; 2 reaches the back line one step away without the peak's ring. Why
  once a round with the reaction: **as Leon worded it (every ranged hit, standing) it is the End² peak** ("every blow on
  every ally, standing"), and it would make the Bulwark's Stand behind me (rank III, 0.30) dead. Question 1.
- Runs on: plates and the Guard it spends. Carrier: Share a Hit's shape (`skills.json camaraderie.unlocks.1`): trigger
  `taking`, `if {target: ally, target_within, damage: [ranged], self_has_res: [guard], answer_on}`, op `redirect share
  1`, `and: resource guard −1`, the reaction as Share a Hit spends it.
- Bulwark: Interpose (adjacent, any weapon attack, 1 Guard and the reaction) shares the reaction: a choice each round,
  not a stack. Stand behind me (one tile, every ranged attack, no reaction) stays the ceiling. Shield Wall (half cover
  for an adjacent ally) shares the reaction too. Peak: below (once a round, reaction, ranged only).
- Excite: the sniper puts a round into your Sigilist two tiles back; it rings off your plates instead.

**Stand Fast** (`guard.stand_fast`). Leon: *"change slam to an AOE circle around you ... slam the shield on the ground
make a shockwave"*. *"Your Slam is a shockwave: it pushes nobody; every foe within {=numbers.within} tiles is Taunted by
you for {=numbers.rounds} round with no save (a Boss too, never forced) and makes Slam's Body save or is Off Balance.
Same price: {=ap} AP and {=guard} Guard."*
- Fields: `within: 2`, `rounds: 1`; price is Slam's own (`durability.unlocks.1.effects.7`, one copy). Why 2: Challenge's
  reach; what the dearer Slam buys over Challenge is no save.
- Runs on: plates (Slam's Guard). Carrier, paired rows (Slam's reach is `targets.within`, nested: no number block or
  pick reaches it, `triggers.ts:304-310`): Slam's `displace` row and its 1-tile `off_balance` row gain `no_door_pick`;
  the option adds a 2-tile `off_balance` row and a `condition taunted skip_save` row, both `targets {of: self, within:
  2, side: foe}` with `door_pick` (N2). Four rows, no new reader.
- Bulwark: Called Out (section 4, R1) is the aimed one: one named foe, no save, no Guard. Stand Fast is the mass one at
  Slam's price, with Off Balance on all. Anchor wants foes beside you: a fit. Readers of "pushed" (Brace, Anchor, Heavy
  Hands) lose nothing: nobody is pushed. Peak: no.
- Excite: five foes around you, one Slam: all five must hit you next round while the Ward and the plates hold.

**Drive** (`guard.drive`). *"Your Slam pushes {=numbers.tiles} tiles and its Off Balance save is at
{=numbers.save|signed}. Each foe it knocks Off Balance gives you back a plate (at most {=limit.n} a turn). You stay
where you are, still Braced."*
- Fields: `tiles: 2`, `save: -2`, limit `per_turn` n 2 (= Slam's Guard price, read: one copy). Why: a Slam that lands
  on two foes pays for itself, so Drive is the plate economy against Stand Fast's taunt. Both run on plates; a Bulwark
  that taunts by Called Out picks Drive, a Guard user with no class taunt picks Stand Fast.
- Runs on: plates (the price and the refund). Carrier: Slam's `displace` and `tiles` as paired rows (as Stand Fast);
  `roll_mod` on `cond_incoming` with `door_pick`; the refund on trigger `cond_landed`, `if {actor: self, cond:
  [off_balance], door_pick}`, op `resource guard +1` on the holder, limit `per_turn`. All existing.
- The lead's "you advance with it" needs a follow step (N17). Optional rider, if N16 is approved: *"a foe whose push is
  stopped by a wall, a unit or cover takes your plate soak as damage"*.
- Bulwark: Anchor (no one pushes you) and Drive (you push them 2) are the two halves of holding ground. Peak: no.
- Excite: you Slam two foes off your Sigilist, back into the fire it laid; both reel, your two plates come back, and
  you can Slam again next turn.

### 2.2 Shadow (Ingenuity; Shadow)

| | Option A | Option B |
|---|---|---|
| **4** | **Light Fingers** *(Suggested; was Sleight)* | **Lend the Dark** *(Suggested)* |
| **6** | **Lightkiller** *(Suggested)* | **Spotter** *(Suggested; was Called Target)* |

**Light Fingers** (`shadow.light_fingers`). Renamed: **Sleight** is the Rigger's rank III move and Sleight of Hand is a
perk id. *"Your Lift costs {=numbers.shadow} Shadow and takes any one thing the foe carries that is not in its hands (a
stim, a core, a grenade, a charm, a spare magazine), straight into your pack. A grenade taken so is ready to throw:
the one it was about to throw, back at it."*
- Fields: `shadow: 1`. Why: Lift is free of Shadow today; a Shadow is the price of choosing what to take.
- Carrier: Lift's row (`shadow.lift`), op `take` with two new fields `what: any` and `to: pack` (N12). Cheaper with no
  primitive: none that keeps the point of it.
- Operative: no move touches Lift. Hand's Filch (Figments) lifts a throwable for the Rigger: a different door. Peak: no.
- Excite: the Elite has one stim and one grenade. You take the grenade on your turn and throw it into its squad.

**Lend the Dark** (`shadow.lend_the_dark`). *"{=ap} AP and {=numbers.shadow} Shadow, from Hidden, once a turn: an ally
within {=numbers.reach} tiles that no enemy can see becomes Hidden (a new entry: its next attack is an ambush)."*
- Fields: `ap: 1`, `shadow: 1`, `reach: 4`. Why 4: half of Tag's 8; close enough that you are working together.
- Carrier: `grant_action` with `reach`, `if {target_sight: [unseen]}`, `res {shadow}`, op `condition hidden target:
  target` (the op Ghost Kill uses; the Silent Partner perk already makes an ally Hidden, `perks/b.ts:602`: check the
  condition op puts Hidden on another unit; if not, N13).
- Collision: Silent Partner (an achieved perk, Ingenuity and Camaraderie: an ally next to you hides when you do) is
  the same fantasy at no price; Lend the Dark is at range, for Shadow, without your own Hide. Kept, both.
- Operative: Tradecraft's start Shadow feeds it. Peak: no (the ally must be unseen: never Hidden in view).
- Excite: your Breaker is behind the wall out of every foe's eyes; you lend it the dark, and its Charge lands as an
  ambush.

**Lightkiller** (`shadow.lightkiller`). *"Once a fight, {=ap} AP and {=numbers.shadow} Shadow: you and the tiles next to
you go dark for {=numbers.rounds} rounds. A dark tile blocks sight through it as smoke does: from the middle you see
no one outside and no one outside sees you; a unit next to you always sees you. Hide works there."*
- Sight, one copy: the dark is a VEIL smoke zone (`veilTiles`, read by `sightBlockers`, `combat.ts:750`;
  `lineOfSight` never tests the start or end tile), so the same sentence holds for both, including VEIL's: the centre
  of a 3×3 is blind both ways; an edge tile sees out and is seen.
- Fields: `ap: 1`, `shadow: 2`, `within: 1`, `rounds: 2`, limit `per_combat` 1. Why: a 3×3 for 2 rounds is one Hide and
  one Break for you or a lent ally. **The lead's version (2 Shadow, no limit) is "shade where you want it, at will": the
  Per² peak**; once a fight is below it (question 2).
- Carrier: op `zone` with kind `veil` (N9: the `zone` op may lay the smoke kind; today `DATA_ZONE_KINDS` is
  `['sanctuary']`, `magic.ts:58`). Cheaper: none without darkness; Douse needs a lamp.
- Operative: Vanish (re-pointed, section 4) makes Fade cheaper; Lightkiller makes shade: no overlap. Peak: below.
- Excite: you are seen by three; one action and the ring goes black, you Hide in its middle, and the first one who
  steps in after you is Broken from the dark.

**Spotter** (`shadow.spotter`). Renamed: **Called Shot** is a move the Operative holds at rank III. *"While you are
Hidden, the first weapon hit each round any ally lands on a Marked foe counts as an ambush (the Break's ambush term) and
costs you {=numbers.shadow} Shadow. A hit that is already an ambush gains nothing more."*
- Fields: `shadow: 1`, limit `per_round` 1; the term is `rules.shadow.ambush_bonus` (0.5, one copy, no new number).
- Carrier: trigger `dealing`, `if {actor: ally, damage: [weapon], target_has: [marked], self_has: [hidden],
  self_has_res: [shadow]}`, op `damage_mult` `value: 1.5`, **`replaces: "ambush"`** (the field exists,
  `triggers.ts:335`, as the Break's row uses it: an ally already ambushing, Lend the Dark's included, stays at ×1.5,
  never ×2.25), `and: resource shadow −1`. The validator holds 1.5 equal to 1 + `rules.shadow.ambush_bonus`. Weapon
  hits only: an ally's Release, Evoke, Snap or Rebuke is not an ambush.
- Operative: Mark (three foes at once) and Execution (a quarter HP) feed it. Peak: no.
- Excite: you stay in the dark, Tag the Boss, and the Breaker's Coup lands at ×1.5.

### 2.3 Bonds (Empathy; MP through the thread)

| | Option A | Option B |
|---|---|---|
| **4** | **Keep the Thread** *(Suggested)* | **Short Thread** *(Suggested)* |
| **6** | **Shared Pulse** *(Suggested; was Overflow)* | **Long Thread** *(Suggested)* |

**Keep the Thread** (`tend.keep_the_thread`). *"Your Snap keeps the Bond: it costs {=numbers.mp} MP and gives no
Daze; the Bond holds. (Let Go still ends a Bond, free. A Boss's Bond still ends after {=bond.boss_rounds} rounds.)"*
- The Boss limit (`tending.json bond.boss_rounds` 3, `boss_gap` 4) is read, never overridden: a kept Snap does not
  restart it. Without that line a Bond on a Boss lasts the fight (a Snap a turn at 3.0 × Healing given, 20% of your
  damage redirected to it, +3 to hit it).
- Fields: `mp: 12` (Tug's price, `tend.tug res.mp`: read, one copy). Why no Daze: the lead's version kept Snap's Daze,
  and a Snap once a turn that never ends the Bond is **a −2 AP Daze every turn on one foe**: AP taken from a foe is
  Pressure's best form.
- Carrier: Snap's row (`tend.snap`): its `tie clear` and Daze ops carry `if {no_door_pick}` (N2); the option adds a
  `cost_mod res {mp}` row on Snap's price (`cost` trigger). The foe's Heart save to break free is a conditions row
  `fraying` (content) put by the kept Snap with its save; a passed save (`cond_resisted` is a hook, not a trigger)
  would need a trigger, so **as specced the save is dropped**: the Bond's own ends (unseen a round, Down, the fight's
  end) still free the foe. If the lead wants the save, it is one line on N2's list (a `resisted` trigger).
- Mender: the Ledger empties into a Snap; a kept Snap empties it every turn: the Mender's damage line. Collision with
  Taut Thread (hits on a Bonded foe) and Bitter Balm: none. Peak: no.
- Excite: Bond the Elite once, then Snap it every turn for 3.0 × Healing given, and it still cannot walk out of your
  Threads.

**Short Thread** (`tend.short_thread`). *"Tending a Bonded ally within {=numbers.within} tiles is ×{=numbers.near} (not
×1.2), and your Touch reaches {=numbers.touch} tiles."*
- Fields: `within: 2`, `near: 1.4`, `touch: 2`. Why 1.4: the front-line medic takes the hits; this pays for standing
  there. Touch at 2 is what makes it a style, not only a number.
- Carrier: `mend_mult` on `heal` and `shield`, `if {actor: self, target_tied: bond, target_within, how: [tending],
  door_pick}` (`actor: self` is required: both triggers are `self: target`, `triggers.ts:81, :83`, so without it the
  row fires only when the healer is the one healed),
  value `near / through` (1.4 / 1.2: bound by placeholder, no typed number); Touch's `reach.tiles` as a number block
  reading the pick (N2).
- Mender: Triage (re-pointed to a better Touch, section 4) and Short Thread meet in the front line: a fit, not a copy.
- Excite: you stand in the melee between the Bulwark and the Breaker and every Mend lands 40% above anyone else's.

**Shared Pulse** (`tend.shared_pulse`). Renamed: **Overflow** is a shelved advanced move (`classes.json`, an Outburst
gauge). *"Your Mend on a Bonded ally also sends {=numbers.share|pct}% of it down every Bond you hold, the Mend's own
target included."*
- Fields: `share: 0.25`. Why: with three Bonds, the target gets 125% and the two others 25%: three quarters of a Mend
  more for the price of one. Worded so the target is included because `selectUnits` has no "not the event's target"
  (only `redirect` drops it, in code); the cheaper wording beats a `targets.not` field.
- Carrier: a second `mend` row on Mend's action, `targets {side: ally, tied: bond}`, the amount at `share` (copied, not
  split: no new op field). The brake (below) counts only the Mend's own target as a Tending received.
- Mender: Rally (once a scene, every Bonded ally) stays the big one. Peak: no (no damage is shared).
- Excite: the Ward on the Bulwark breaks, you Mend it, and the two others on your threads tick up too.

**Long Thread** (`tend.long_thread`). *"Your Bond reaches {=numbers.reach} tiles further when you make it, and the
first Mend or Shield you give each Bonded ally each round costs {=numbers.ap|abs} AP less (at least 1)."*
- Fields: `reach: 3`, `ap: -1`, `min: 1`, limit `per_round` `each: target`. Leon: *"Mend and shield at 1 ap less might
  actually make some team immortal. add a mana cost multiplier each time you heal the same target"*: the brake, and the
  cut once per Bonded ally per round, so **at most 3 discounted Tendings a turn** (three Bonds), not six.
- Carrier: `cost_mod` on `cost`, `if {action: [verb:tend.mend#tend_mend, verb:tend.shield#tend_shield], target_tied:
  bond, door_pick, uses_left {per: per_round, each: target, key: long_thread}}`, and the `use` op on **`acted`** (never on
  `cost`: `cost` fires on every preview, `effects/cost.ts:126-141`). **Needs N20**: the `cost` trigger has no target
  today (`cost: {actor: u_}`, `triggers.ts:84`), so `target_tied` and `each: target` on a price resolve nothing; and the
  verb's `ap` is not read through `holderNumber` (only `reach.tiles`, `step.tiles` and `res`, `effects/actions.ts:85,
  :119, :158`), so a number block there is no fallback. Bond's `reach.tiles` number block reads the pick (N2).
- Mender: Bond (free) already has no range limit for its first Bond a turn; Long Thread's AP counts for the Mender too.
- Excite: two Mends in one turn on two Bonded allies at opposite ends of the map.

**The brake** (`tending.brake`, every Tending user, not a fork; the lead's call for Leon). *"Each Mend, Shield or Touch
a unit receives in a round costs its giver {=numbers.step|pct}% more MP than the last one it received that round, from
anyone."*
- **Keyed on the receiver**, not the giver: two Tending users on one Bulwark meet the same brake, which is the squad Leon
  feared. Fields: `step: 0.5` (×1.5, ×2.25: Mend 24 → 36 → 54 MP).
- Carrier: two content conditions rows on the receiver, `tended` and `tended_twice` (put by the Tending on `acted`,
  to the round's end; the second when the first is on), and price rows `cost_mod res mp` on `cost` with `target_has:
  [tended]` / `[tended_twice]`, stepped as discounts from nothing (+12 and +30 on a Mend, +15 and +37 on a Shield: rows
  that raise, since `uses_left` has no negation). Needs **N20** (the price must see the target). The exact compounding
  past the third needs N19 (a count as a number) or a third row.
- Why it is enough with a big pool: a Det/Ins mix holds 100 + 75 × 9 + 25 × 9 = 1000 MP (about 40 plain Mends); the
  brake does not drain that pool, it makes the third heal on one body a round cost as much as two, so the squad's
  "never Down" falls to how many bodies are hit, not how many healers stand behind one. Measured in section 8 (the
  squad row); the failure signal is named there.

### 2.4 Prayer (Faith; the Whisper and the Hymn's wait)

Leon: *"Faith forks mention dmg everywhere, but i don't think you even get a damaging wisper/hymn on some combination of
god with out chaplain as your class"*. **What a Faith 6 character without the Chaplain has** (patrons.json, faith.ts):

| | Faithful (any of 8 patrons) | Atheist |
|---|---|---|
| Whispers (1 AP, once a turn) | The seven shared ones: Luck, Health, Protection, Courage, Guidance, Safe Passage, Rebuke (`patrons.json whispers`) | The same seven, each by dice (TN 12, `atheist_tn.whisper`) |
| Hymns (3 AP, then a wait) | From Faith 3: the patron's Hymn I at Devotion 3 (start), II at 5, III at 7; only Nerukhan's, the Toll-Keeper's, Old Overcast's and the Matchmaker's harm anyone | Only Hymns learned from knowledge pieces, by dice (14/16/18); **a fresh Atheist has none** |
| Witnessed, interventions | From Faith 5, by a Hymn or Miracle; one intervention a fight (two from Devotion 7); five of eight patrons' interventions deal no damage | **Never** (`faith.ts:383`: Faithful at Faith 5) |
| Faith 3, 5 | Answered Prayer; Deliver the Sinner | The same (Answered Prayer resets nothing without a Hymn) |

So the one thing every prayer user has is **the Whisper**. The lead's sixth-point pair (Intercession, Benediction) both
ran on the intervention: dead for every Atheist; and choosing where an intervention lands is the Vir² peak
("interventions on your call"). Both are replaced by Whisper forks.

| | Option A | Option B |
|---|---|---|
| **4** | **Round of Blessings** *(Suggested; was Litany)* | **Steadfast** *(Suggested)* |
| **6** | **Benediction** *(Suggested; re-pointed onto the Whisper)* | **Held Breath** *(Suggested)* |

**Round of Blessings** (`prayer.round_of_blessings`). Renamed: the Faith perk `litany` is *Unbroken Litany*. *"Each
Whisper you say on an ally who was not blessed in the last round takes {=numbers.cut} round off your Hymn's wait (never
under its floor). With no Hymn of yours waiting, your next prayer roll is {=numbers.roll|signed} instead (an Atheist's
dice, a Faithful's overreach)."*
- Fields: `cut: 1`, `roll: 2`; the floor is `prayer.hymn.cooldown_rule.floor` (one copy). Why: rotating your Whispers
  through the squad buys a Hymn about every third round at Faith 6 (wait 5); +2 is about a tenth more answered
  Whispers for an Atheist at TN 12.
- Carrier: trigger `acted`, `if {action: [whisper], target: ally, target_lacks: [last_blessed]}`, op `condition
  last_blessed rounds: 1` (a new conditions row, content, put by the Whisper; it runs out, nothing lifts it: ops reach
  only self, actor or target, so "lifted from the previous ally" is not buildable), and the Hymn wait cut through N7
  (the vow's `u.faith.hymnCut`, `faith.ts:140-147`, already cuts the running wait because `hymnLeft` re-reads
  `hymnWait`; N7 makes it a count an op adds). Any prayer user's `last_blessed` counts: two Faithful who rotate on one
  ally cut each other: accepted. The roll as `roll_mod` on the prayer roll (part of N7: the prayer roll is not on
  `to_hit`).
- Chaplain: Unbroken Litany II also cuts the wait by 1: they add, the floor binds. Canticle untouched. Peak: no.
- Works for: every patron (Luck, Health, Protection, Courage are ally Whispers for all), every Atheist.
- Excite: Health on the Bulwark, Luck on the sniper, Courage on the Breaker: and the Hymn is back a round early.

**Steadfast** (`prayer.steadfast`). *"Once a round, off your turn, you may say a Whisper as your reaction when a foe
attacks an ally you see. A Whisper said so counts as said on your next turn; that turn holds nothing (Held
Breath)."*
- Fields: limit `per_round` 1. Why: the Whisper you would have said anyway, said when it matters; no extra prayer.
- Carrier: a prayer as a reaction (N6). Cheaper with no primitive: *"your Health or Protection may be laid on an ally
  as a held blessing: it lands the first time that ally is hit before your next turn"* (a conditions row with a
  `taking` trigger and a `mend` op; it works only for the two Whispers that heal or shield).
- Chaplain: Ward is also a Whisper: a Steadfast Ward is legal (the Ward's own `holders` cap stands). Peak: no.
- Excite: the Elite swings at your Sigilist; Protection lands before the blow does.

**Benediction** (`prayer.benediction`). *"Your Whisper on an ally may be said wide, for {=numbers.ap} AP more: it also
reaches every ally within {=numbers.within} tile of its target, at {=numbers.share|pct}% (Luck, Health, Protection
and Courage; Guidance reveals {=numbers.radius} tiles further; Safe Passage also covers every ally within
{=numbers.within} tile of you). A wide Whisper adds {=numbers.wait} round to your Hymn's wait; with no Hymn of yours,
you may say one once a fight. Not Rebuke, not the Ward."*
- Fields: `ap: 1`, `within: 1`, `share: 0.7`, `radius: 2`, `wait: 1`, limit `per_combat` 1 (no Hymn only). Why the
  wait: it is paid in **the door's own resource** (the prayer slots), so a Faithful chooses each round between a wide
  Whisper and an earlier Hymn; with no price it was a 3×3 heal or shield every turn, the Protection refreshed each turn
  (the larger stands) and doubled by Conscience. Why no Rebuke: said wide it was armour-ignoring, no-roll area damage
  every turn for every Faithful, another door's outcome (the burst, Payload). Why 0.7: a 3×3 of four allies at 70% is
  about three Whispers for 2 AP; not standing, so not the Canticle's aura.
- Carrier: the Whisper's effects are run by `blessing()` from `patrons.json whispers` (`tactics.ts:409-418`), which
  reads no `targets` and no `if`: **N5** (restated: the blessing runner reads `targets` and `if`). The wait through N7
  (`hymnCut` as a count an op adds; a wide Whisper adds −1).
- Chaplain: the Canticle stays the squad's standing aura; Ward is excluded so the layering shield stays one target.
- Excite: your squad is stacked in the doorway; one wide Protection shields all three, and you know the Hymn comes a
  round late.

**Held Breath** (`prayer.held_breath`). *"If your turn ends with no Whisper said, it is held (one at most). On a later
turn of this fight you may say it as well as that turn's Whisper. A turn whose Whisper was spent by Steadfast holds
nothing."*
- Fields: `held: 1`. Why one: two Whispers a turn at most, once per turn not said. The Steadfast sentence closes the
  loop where both are held (Steadfast at 4, Held Breath at 6): spending each Whisper off-turn would otherwise bank one
  every turn, two Whispers a round for good.
- Carrier: N7 (prayer slots as numbers): a stat `whispers_per_turn` read where the limit is a literal today
  (`lim.left('per_turn', 1, WHISPER_KEY)`, `faith.ts:299, :1021`, taken at `:970`; `extra_use` never reaches it); the
  held Whisper is a content condition `held_breath` (put on `turn_end` when the Whisper key has a use left, and not
  after a Steadfast Whisper) that adds 1 to the stat until spent.
- Chaplain: a held Whisper may be a Ward (two Ward layers in one turn, the `holders` cap stands). Peak: no.
- Excite: the Boss steps in next round; you hold this turn's Whisper and open the next with Protection on both
  front-liners.

### 2.5 Momentum (Raw Power; the chain)

| | Option A | Option B |
|---|---|---|
| **4** | **Rolling Start** *(Suggested; re-pointed)* | **Grindstone** *(Suggested)* |
| **6** | **Spill** *(Suggested)* | **Headlong** *(Suggested; was Spend to Move)* |

**Rolling Start** (`momentum.rolling_start`). The lead's version ("3+ tiles in a straight line into a melee hit: +1
Momentum") **is the Charge's own trigger** (`techniques.json charge`: after 3 straight tiles) and stacks on the
Breaker's Charge Carries. Re-pointed: *"Your Charge needs {=numbers.tiles} tiles in a straight line, not 3, and a
Charge costs no Momentum and, if it hits, builds {=numbers.build}. A Charge paid by Headlong builds nothing."*
- Fields: `tiles: 2`, `build: 1`. Why: a Charge in a corridor or a cramped room, and the opener that feeds the chain
  instead of eating it.
- Carrier: the Charge's 3 tiles is `t.num('min_run', 3)` (`physical/melee/openers.ts:86`), a plain number off the
  technique's `numbers` (`core.ts:239`), not reached by `sourceOf` or `holderNumber`: **N23** (a stat family
  `tech_num:<tech>.<field>` added in `t.num`, after the `momentum_needed:<id>` precedent, `core.ts:333`). The cost:
  N23's `momentum_cost:charge` at −1, floored at 0 by `momentumCost` (so the first Opener of a fight, already free,
  `core.ts:187`, is not over-paid, which a flat "+2 refund and build" did). The build: trigger `hit`, `if {mode:
  [charge], door_pick, self_lacks: [headlong_paid]}`, op `resource momentum +1`.
- Breaker: Charge Carries (+2) adds on top: a Breaker's Charge is +3. Measured in section 8 (with Wind-up: the turn-1
  Finisher). Peak: no.
- Excite: two tiles of space between you and the gunner is enough; you hit at x2 and keep climbing.

**Grindstone** (`momentum.grindstone`). *"A melee hit on the foe you hit last builds {=numbers.build} Momentum, not 1."*
- Fields: `build: 2`. Why: two hits on one foe reach x3 (Launch, a big Finisher) a hit sooner.
- Carrier: a conditions row `ground` (content: put by your hit on its target, 1 round), trigger `hit`, `if {target_has:
  [ground], melee: true}`, op `resource momentum +1`; the mark row after the check row in the option, or the first hit
  counts itself. (Another Grindstone user's mark counts too: accepted.)
- Breaker: Charge Carries opens, Grindstone climbs: a fit. Keep Swinging, Iron Grip: none. Peak: no.
- Excite: you lock onto the Elite: x1, x3, and the third blow is a Launch through its own line.

**Spill** (`momentum.spill`). *"When a Finisher of yours drops a foe, the damage past its last HP strikes the nearest
other foe next to it (no roll; its armour applies). Spill's own damage never Spills."*
- Fields: `share: 1`. Why: the whole overkill, once; Cleave's extra strikes stay Cleave's.
- Carrier: trigger `kill`, `if {tech_group: [finisher]}`, op `deal` with `targets {of: target, within: 1, side: foe,
  max: 1}` (existing: `selectUnits` takes `of: target`, `triggers.ts:581`; no N5). The overkill is not in the event:
  `on_kill` carries `{victim, by, src, ownTurn}` (`effects/damage.ts:122`) and `event:amount` reads 0 there, so Spill
  needs **N21** (`on_kill` carries `over`, the damage past the last HP, worked out once in `applyDamage`). The stop is
  by construction: Spill's `deal` is no technique, so its kill fails `tech_group: [finisher]`.
- Collision: Cleave (one more adjacent strike a Momentum) makes several blows; Spill moves one overkill. Not a copy.
  Peak: no (no Momentum is kept).
- Excite: a Coup at x5 on a foe with 10 HP left; 60 damage goes on into the one behind it.

**Headlong** (`momentum.headlong`). Renamed: "Spend to Move" moves nothing. *"Once a turn, your Charge may be paid
with {=numbers.momentum} Momentum instead of its AP. A Charge so paid builds no Momentum (no Rolling Start, no Charge
Carries)."*
- Fields: `momentum: 2`. Why: the price of Launch's minimum; the walk into the Charge still costs its AP.
- Carrier: `cost_mod` on `attack`, `if {mode: [charge], door_pick, self_res: {momentum: {at_least: 2}}}` (N10:
  `self_has_res` tests at least 1), `set 0`; the 2 Momentum through **N23**'s stat family `momentum_cost:<tech>` +2,
  read by `momentumCost` (`core.ts:182-188`; a Charge's Momentum price is code on no hook, and `cost_mod`'s `res` only
  writes `ctx.res` on the `cost` hook, `triggers.ts:358`, so on `attack` nothing would pay it); and `condition
  headlong_paid` on self to the turn's end (content), which Rolling Start's cut and build rows and Charge Carries' row
  read with `self_lacks` (so with Rolling Start held the price stays 2; the condition is put at the price, before
  `momentumCost` is read: the builder checks that order in a reducer test).
- Breaker: a Headlong Charge is a free swing for 2 Momentum, no more: without the "builds nothing" line, Rolling Start
  and Charge Carries made it free in AP and +1 Momentum every turn, which the 15.7 rule (no AP given inside a turn) was
  meant to stop. Peak: no.
- Excite: x4 after a kill, two foes left: Charge the first for Momentum, walk, Charge the second.

### 2.6 Pressure (Dexterity; pips)

**The cap rule for this door's forks.** Pressure stops at a unit's cap (`pressureCap`, `physical/pressure.ts:15-18`:
a Soldier 4, an Elite 3, a Boss 2, from `techniques.json rules.pressure` `max`, `elite_max`, `boss_max`). An Elite never
reaches Broken (4) and a Boss never reaches Suppressed (3), so a fork keyed to "Broken" or "Suppressed" would go dead in
exactly the fights a player builds for. Every option below is keyed to **a foe at its Pressure cap**, read from the one
cap function: Broken for a Soldier, Suppressed for an Elite, Pressed for a Boss. Suppressed and Broken are worked out
from the pips (`pressureState`), not conditions: the `suppressed` conditions row is the old Suppression (code checks
both, `calls/handlers.ts:75`), so no fork reads `target_has: [suppressed]`.

| | Option A | Option B |
|---|---|---|
| **4** | **Converging Fire** *(Suggested; was Crossfire)* | **Walk It In** *(Suggested; replaces Tunnel)* |
| **6** | **Through the Gap** *(Suggested; was Break and Enter)* | **Lockdown** *(Suggested)* |

**Converging Fire** (`pressure.converging_fire`). Renamed: **Crossfire** is a press technique. *"Each ally's ranged hit
on a foe you have hit this round adds {=numbers.pips} more Pressure (once a round for each foe)."*
- Fields: `pips: 1`. Why: one more pip per foe per round takes a foe to its cap with the squad's help.
- Carrier: a conditions row `in_your_sights` (content, put by your ranged hit, 1 round), trigger `hit`, `if {actor:
  ally, damage: [ranged], target_has: [in_your_sights]}`, op `resource pressure +1 target: target` (the `pressure` row's
  `setter` goes through the one add, Guard's filter included), limit `per_round` `each: target`; the mark row after the
  check row.
- Skirmisher: Relocated and Keep Their Heads Down are your own hits; this is the squad's. Peak: no (one target a shot).
- Excite: you tag the Elite once; the squad's two shots pin it at Suppressed before its turn.

**Walk It In** (`pressure.walk_it_in`). *"Your ranged attack that misses a foe still lays {=numbers.pips} Pressure on
it (once a turn for each foe)."*
- Fields: `pips: 1`. Why: suppressive fire is about where the rounds go, not only what they hit; a miss is no longer a
  wasted turn for the low-Dexterity gunner. One pip, never the first-hit's full Pressure.
- Carrier: trigger `miss` (`on_miss`, `triggers.ts:68`), `if {actor: self, damage: [ranged], door_pick}`, op `resource
  pressure +1 target: target`, limit `per_turn` `each: target`. Existing pieces only.
- Why Tunnel went: a held-down foe whose Pressure does not fall is the **Bead** technique (`techniques.json bead`: "its
  Pressure doesn't fall while you see it", its filter at `physical/ranged/sets.ts:102`), and Tunnel's `turn_start`
  give-back ran a whole turn late: decay is at the unit's turn **end** (`physical/rules.ts:101-109`). An option that
  changes Bead instead is dead to anyone who has not learned Bead. N11 is dropped.
- Skirmisher: Break Them (cheaper Rout) and Walk It In: a Skirmisher at a long range band keeps its target pressed
  through bad rolls. Peak: no (one target a shot).
- Excite: three misses in a row at the Elite behind the barricade, and it is still pinned at Suppressed when your
  Breaker gets there.

**Through the Gap** (`pressure.through_the_gap`). Renamed: Break and Enter sits beside the Skirmisher's Break Them.
*"Once a turn, when your hit takes a foe to its Pressure cap, you may move at once up to your Movement for 0 AP, drawing
no opportunity attack. It is not the turn's one free move."*
- Fields: limit `per_turn` 1. Why: at the cap you have earned the line breaking (a Soldier Broken, an Elite Suppressed,
  a Boss Pressed).
- Carrier: trigger `hit`, `if {target_res: {pressure: {at: "max"}}}` (N10; `max` for `pressure` reads `pressureCap`),
  then Fire and Move's own shape (`classes.json marksman.gain fire_and_move`: a flag and a `cost_mod set 0` on the next
  move) with its own flag.
- Skirmisher: Fire and Move and Run and Gun share one free move; this one is apart, so the Skirmisher is not left with
  a dead option. Peak: no.
- Excite: the Elite is pinned at Suppressed; you walk through the hole it leaves and take the flank before anyone turns.

**Lockdown** (`pressure.lockdown`). *"Once a round, a foe at its Pressure cap that moves where you can see it takes one
shot from you, without your reaction (a plain shot with your ranged weapon)."*
- Fields: limit `per_round` 1. Why: at the cap a foe already loses reactions or AP; this shot is yours, free.
- Carrier: trigger `moved`, `if {actor: foe, actor_res: {pressure: {at: "max"}}}` (N10), an item op that makes an
  attack (N4). Cheaper: *"a foe your hit takes to its cap is also Slowed for a round (no save)"*: trigger `hit`, op
  `condition slowed skip_save`; it still needs N10 for "at its cap" (the old claim that it was data today was wrong:
  `target_has: [suppressed]` misses every foe the door Suppresses) (question 6).
- Skirmisher: Killzone (two held shots, both reactions) and Lockdown are different windows. Peak: no (no shot before
  initiative).
- Excite: the Boss, Pressed and furious, walks out from behind its pillar and eats your round on the way.

### 2.7 Sigils (Brain Power; Flux)

| | Option A | Option B |
|---|---|---|
| **4** | **Overflux** *(Suggested)* | **Clean Vent** *(Suggested)* |
| **6** | **Written in Advance** *(Suggested)* | **Running Script** *(Suggested)* |

**Overflux** (`sigil.overflux`). *"Drawing past your Flux limit no longer Overloads you: your Evoker does not lock and
nothing is vented. Each glyph you draw while over costs you the Overload's damage for each Flux over (self-harm). A
Vent still empties it."*
- Fields: none new; the damage is `mana.sigil.flux.overload.damage_per_flux_over` (10, one copy). Why: the Line you
  need now, paid in blood.
- Carrier: the Overload's lock and vent as a stat the option answers (N15, `overload_lock`, 0 with the pick).
- Sigilist: Bleed the Flux (cheap Vent) is the clean way; Overflux the dirty one: both live. Running Hand II (no Flux
  on the first glyph): fine. Peak: no (the Line is still 2 to 4, on your tile).
- Excite: at 6 Flux, one glyph short of the Line that kills the Boss: you draw it, take 10, and Evoke.

**Clean Vent** (`sigil.clean_vent`). *"Once a turn, a Vent of {=numbers.min} Flux or more shoves every foe next to you
{=numbers.push} tile and scorches it for {=amounts.vent.base} × the Flux vented (fire, the Sigil's damage)."*
- Fields: `min: 2`, `push: 1`, `amounts.vent {kind: damage, base: 4, profile: sigil, type: fire, provisional}`. Why 4:
  six Flux vented is a 24-base blast on the adjacent ring, under a two-glyph Line.
- Carrier: the `vent` hook as a trigger (**N22**; `vent` carries `{u, flux, extra}`, `magic.ts:655`; on `acted` the
  Flux is already emptied, so `res:flux` would read 0), ops `deal` and `displace` with `targets {of: self, within: 1,
  side: foe}` (existing), the amount a number block on `event:flux`. No N3b, no N5.
- Sigilist: **Bleed the Flux makes the Vent free**: a free nova every turn. Bounded by `min` 2 and once a turn. Peak: no.
- Excite: they close on the caster; you dump 6 Flux into their faces and they reel back a tile.

**Written in Advance** (`sigil.written_in_advance`). *"A Line that has stood on the ground since before your last turn
ended Evokes at ×{=numbers.mult} (its damage, heal or shield)."* The lead's "one size stronger" would read a 4-glyph
Line as a fifth size: the Int² peak. A multiplier is below it.
- Fields: `mult: 1.2`. Why: one fifth more for a whole turn of standing on a known tile.
- Carrier: the Line's age (N14) as a predicate on `dealing` with `damage: [sigil_spell]`.
- Sigilist: Stored Spell (written out of a fight) and Payload (area): different. Peak: below.
- Excite: you draw a Line in the doorway they must come through and Evoke it next turn at +20%.

**Running Script** (`sigil.running_script`). *"When you Evoke, the glyph you Evoke from stays drawn; your next Line may
start from it."*
- Fields: `keep: 1`. Why: one glyph saved is one glyph's charge, AP and Flux.
- Carrier: an Evoke that leaves a glyph (N14's same piece in `sigil.ts`).
- Sigilist: Barrage (cheap damage words) chains with it. Peak: no (the kept glyph is on a tile you drew it on; the
  next Line is still 2 to 4).
- Excite: FIRE·SEEK, Evoke; SEEK stays; next turn SEEK·FREEZE is one glyph away.

### 2.8 Outbursts (Will Power; Strain)

Checked against the Mana Shock (0.30: after a Mana Short, 25% of max HP at the end of each own turn from the turn
after, until Strain is back at the limit; ends with the fight) and the bare heart (+4 Strain on a Begin without an
Emanator).

| | Option A | Option B |
|---|---|---|
| **4** | **Ride the Edge** *(Suggested)* | **Slow Burn** *(Suggested)* |
| **6** | **Blood Price** *(Suggested; was Bleed It Out)* | **Clean Break** *(Suggested)* |

**Ride the Edge** (`soul.ride_the_edge`). *"A Release made while your Strain is exactly at your limit is
×{=numbers.mult}."*
- Fields: `mult: 1.15`. Why: three quarters of a plain Pump step (0.2), for living one point from three over.
- Carrier: trigger `dealing`, `if {damage: [outburst], self_res: {strain: {at: "limit"}}}` (N10: `limit` reads the
  stat `strain_limit` separately; Strain's resource row has **no `max`**, because Strain may stand above the limit, the
  Short coming at 3 over, and a `max` would clamp it and break the Mana Shock).
- Mana Shock: at the limit is safe (the Short is at 3 over); the reward is for standing on the line, not over it. The
  bare heart's +4 gets you there in one Begin: a known risk, measured. Peak: no.
- Excite: you Pump to the limit on purpose and Release at +15%, one swell away from the Short.

**Slow Burn** (`soul.slow_burn`). *"Each turn you start holding an Outburst, your Strain falls {=numbers.calm} more."*
- Fields: `calm: 1`. Why: it cancels the swell's own point (`strain.per_held_turn`): holding is patient, not free.
- Carrier: the `held_turn_start` hook as a trigger (**N22**; the hook exists, `magic.ts:1710`, and fires only while an
  Outburst is held, so no "holds an Outburst" predicate is needed), op `resource strain −1` (N3b: through the one
  Strain function).
- Mana Shock: one of the ways out of it. Will Power 7 (the swell without Strain) makes it a net −1 a held turn; a
  shield in hand stops the swell (rules 1.57) but not Slow Burn. Channeler's Shape (a free Pump while held): fits.
- Excite: a stage-4 Lance held through two turns, released the moment the Elite leaves cover.

**Blood Price** (`soul.blood_price`). Renamed: "Bleed" is the Sigilist's Bleed the Flux. *"A Pump may be paid in HP
instead of MP: {=numbers.hp_per_mp} HP for each MP (self-harm). Never when it would Down you."*
- Fields: `hp_per_mp: 0.5`. Why: a Pump's MP (a tenth of the Begin's) is small; half of it in HP is a real but not
  ruinous price.
- Carrier: the Pump on the cost hook (N18) with a payment in HP. Cheaper: none that keeps "instead of MP".
- Mana Shock: HP, not Strain, so it neither brings nor clears it; with the Shock's 25% it can Down you, so the refusal
  reads the Shock's next charge too. Peak: no.
- Excite: the Emanator is dry, the Boss is at a quarter: you pay the last two Pumps in blood.

**Clean Break** (`soul.clean_break`). *"A Release at stage 4 lowers your Strain by {=numbers.calm} once it lands."*
- Fields: `calm: 2`. Why: a stage-4 Release costs its whole climb in Strain; this gives back the swell's part.
- Carrier: trigger `acted` on the Release, op `resource strain` with a number block `{base: 0, steps: [{of:
  "event:stage", at: 4, value: -2}]}` (N3b).
- Channeler: Eye of the Storm (a Release that adds no Strain, once a scene) and Clean Break stack: by design, the
  Channeler is the best user. Heart Surge is capped at stage 4 (section 4), so no stage 5 lands. Mana Shock: the way
  out after a big one. Peak: no.
- Excite: you go all-in on stage 4 at 2 over the limit; the Release drops you to the limit and out of danger.

### 2.9 Figments (Visualization; charge): the forks move

The two existing forks move from 3 and 5 to **4** and **6**. Moving the ladder's `fork` key alone leaves five things
stale; all move in S0:
1. `figments.json ladder`: the `fork` key leaves the rows at 3 and 5 for two new rows at 4 and 6; the designs, traits
   and held counts stay where they are.
2. The forms' `opens.min` (3 on Eye, Wall and Ward; 5 on Beast, Blade, Husk and Sentinel) to 4 and 6: `formWhy`
   (`figments.ts:117-123`) says "needs Visualization N" from it.
3. `skills.json visualization` unlocks 3 and 5 ("Eye and Wall", "Beast and Blade"): their text becomes the perk step's;
   two new unlock rows at 4 and 6 carry the choice.
4. `designsMax` types `p >= 3` in code (`figments.ts:114`): a typed number (hard rule 2); it reads the ladder (designs
   above 0) instead.
5. `figments-2.test.ts:185-212` asserts the old steps: rewritten through the reducer at 4 and 6.

| Who | What happens |
|---|---|
| A character who already chose at 3 or 5 | Nothing is lost: a pick is kept for good (`doorPicks`), it still opens its form (`formsOf`), and when its points reach the new step the grant counts it as taken (`pendingDoorPicks`, `doorpicks.ts:30`). |
| A character at Visualization 3 (or 5) who has not chosen yet | The open choice closes until 4 (or 6). The form it has not chosen was never usable, so no form is lost. |
| An old save with no fork stamp (`figRev`), at Visualization 3 | The migration keeps the Eye and the Wall outside every grant (`doorKept`); at 4 the first fork then offers the one form left (the Ward): a third form for those few saves. Accepted (it is a gift, not a loss); no new `migration.rev`. |
| An old save with no fork stamp, at Visualization 5 (the fixture `save-0.28.2-rigger-mid-fight`) | With fork a at 4 and fork b at 6, the migration (`figments.ts:83-95`) picks the Eye for fork a and keeps the Wall, the Beast and the Blade outside the grants (fork b is not passed at 5); at 6 fork b then offers the Husk or the Sentinel: a second gift (six forms). Accepted, no rev bump: a bump would re-run the migration on every stamped save for the sake of a few unstamped ones. `old-save.test` still passes (nothing is pending at 5); the S0 test loads this fixture, plays on, and checks it holds Eye, Wall, Beast and Blade. |
| The level-up card and the Figments tab | Both read the ladder (`figmentLadderView`, `figmentGrants`): no screen change. |

Every form runs on the door's own resource (charge, the held count): the fork rule holds.

### 2.10 What changed from the lead's list, and why

| Lead's option | Now | Why |
|---|---|---|
| Cover Them (every ranged hit, passive) | Once a round, an Answer with the reaction, 1 Guard | As worded it is the End² peak and kills Stand behind me |
| Drive (you advance with it) | You stay, Braced; each foe knocked Off Balance gives a plate back (at most 2 a turn); the advance and a wall rider wait on N17, N16 | No follow step exists; as one number (+1 tile, −2) it lost to Stand Fast every time |
| Sleight | **Light Fingers** | Name: the Rigger's Sleight, the perk Sleight of Hand |
| Lightkiller (2 Shadow, no limit) | Once a fight | Shade at will is the Per² peak |
| Called Target | **Spotter**; weapon hits only, `replaces: "ambush"` | Name: the Operative's Called Shot; with Lend the Dark it multiplied a real ambush (×2.25) |
| Keep the Thread (with Daze) | No Daze; no save to break (the Bond's own ends free the foe) | A Daze every turn is Pressure's AP denial; a save on a kept Snap needs a `resisted` trigger |
| Short Thread | + Touch reaches 2 | A number alone was dull |
| Overflow | **Shared Pulse** (every Bond, the target too, at 25%) | Name: a shelved advanced move; no "not the target" field |
| Long Thread (−1 AP on every Mend and Shield) | Once per Bonded ally per round | Six 1-AP Mends a turn was the immortal squad |
| The brake (per giver) | Per receiver, from anyone | Two healers on one body never met a per-giver brake |
| Litany | **Round of Blessings**, + an Atheist half | Name (Unbroken Litany); a fresh Atheist has no Hymn to cut |
| Intercession | **Benediction** (a Whisper said wide, +1 round on the Hymn's wait; no Rebuke) | Interventions: never for an Atheist; choosing where one lands is the Vir² peak; unpriced it was a 3×3 heal, shield or Rebuke every turn |
| Benediction (give up the intervention) | **Held Breath** (bank a Whisper) | The same two reasons |
| Rolling Start (3 tiles into a hit) | Charge from 2 tiles; it costs no Momentum and builds 1; a Headlong Charge builds nothing | It was the Charge's own trigger; with Headlong and Charge Carries it was a free swing and +1 every turn |
| Spend to Move | **Headlong** (needs 2 Momentum; builds nothing) | It moves nothing |
| Crossfire | **Converging Fire** | Name: a press technique |
| Break and Enter | **Through the Gap**; not the turn's free move | Name beside Break Them; sharing the free move made it dead for the Skirmisher |
| Overflux | The Overload's own damage, no lock | Overload already exists: the fork changes it, not adds it |
| Clean Vent | ≥ 2 Flux, once a turn | Bleed the Flux makes Vent free: a nova every turn |
| Written in Advance (one size stronger) | ×1.2 | A 4-glyph Line one size up reads as a fifth glyph: the Int² peak |
| Bleed It Out | **Blood Price** | Name beside Bleed the Flux |
| Ride the Edge, Slow Burn, Clean Break | Kept, with numbers | Checked against the Mana Shock: each is a way to live at or back under the limit |
| Tunnel | **Walk It In** (a miss lays a pip) | Tunnel was the Bead technique again, and its give-back ran a turn late (decay is at turn end) |
| Through the Gap, Lockdown (Broken, Suppressed) | At the foe's Pressure cap | An Elite never reaches Broken, a Boss never Suppressed: both went dead in the fights that matter |
| Provoke, Stand Fast, Lend the Dark, Grindstone, Spill, Running Script, Steadfast | Kept (Spill: its own damage never Spills; Stand Fast: four paired rows) | Lockdown keeps a cheaper form (Slowed), which also needs N10 |

---

## 3. The beta feeds its door

Leon: *"beta should feed it's door, it's the 'make you live longer using the skill you will be good at if you are good
at this attribute as a person'"*; *"these bonus need to be big enough, if it's not, end game level character goes for
3-4 alpha skill at 10 instead of giving a shit about any of their beta skill"*.

**The one formula.** `feed = 1 + p × α × β`, α and β the alpha's and the beta's points, `p = 0.01` (one field a door,
`skills.json <beta>.feed.per_product`, PROVISIONAL). At α 10: β 1 → ×1.1, β 5 → ×1.5, β 10 → ×2.0. At α 6: β 1 → ×1.06,
β 6 → ×1.36, β 10 → ×1.6. At α 1 it is almost nothing (the door's dabbler gains little: worth most to the deepest).

**One carrier a door.** Each feed is applied in exactly one place: either inside the door's one function (the plate
soak, the Momentum loss, the Pressure fall, the Flux limit, the Strain limit, the Figment body), multiplied by
`doorFeed(u, door)`; or by one data row reading the source `feed:<door>` (Acuity's spot row, Camaraderie's heal back,
Conscience's prayer shields). Never both, never a second formula (N3). A **fraction is carried**, not rounded away:
where the number is a count a turn (Momentum lost, Pressure shed), the remainder is kept on the unit to the next time,
so every beta point counts in the middle range. Limits (Flux, Strain) and the spot TN round to the nearest; the tab says
at which point the next whole step lands.

### The sizing rule, argued

Both betas and alphas carry perk steps at 7 and 9 and a Mastered perk at 10, so from 7 to 10 those cancel; what a point
buys is its per-point row. Three cases:

1. **One-door build, alpha at 10.** A beta point is +10% of the **main** door's number, used every turn, plus the
   beta's own row it always had. A second alpha's point is about +10% of a **second** door's output (Brain Power +10%
   Sigil power, Will Power +10% Soul, Faith +10% Blessing; Raw Power +5% physical and +1 to hit; Dexterity +1 to hit and
   +2% critical), used part of the time. The beta wins.
2. **Alpha at 6.** A beta point is +6% (×1.06 at β 1, ×1.36 at β 6), while the alpha's own point 6→7 brings a perk
   step (M3) and the alpha's per-point row. **The alpha wins, by design**: the beta is worth most to whoever is deepest,
   and it overtakes from alpha 8 (+8% a point and rising). Leon's worry is the endgame character, which is case 1.
3. **Two-door mix, both doors played every turn** (Guard + Prayer, Momentum + Bonds, Shadow + Outbursts). Output per
   point is about even: Pain Threshold at Durability 10 is +10% plate soak on every blow taken; Faith 7→8 is +10%
   Blessing on every prayer. **The attribute cost decides it**: the beta shares its attribute with the alpha, already
   at 10, so a beta point costs 1 Skill point; a second alpha from 7 to 10 also needs its own attribute raised from 7
   to 10, 3 Attribute points of the 20 a career gives (rules 1.11). Per point the second alpha costs 1 Skill and 1
   Attribute point, the beta 1 Skill point; at equal output the beta is the cheaper buy, and the Attribute points it
   saves buy the second door's own beta, or a third attribute's HP or Movement.

| Door / beta | The number (field) | Formula (one carrier) | β 1 / 5 / 10 at α 10 | β 1 / 6 / 10 at α 6 | One point at α 10, against a second alpha | The door tab shows | Risk |
|---|---|---|---|---|---|---|---|
| **Guard / Pain Threshold** | Plate soak, `rules.guard.soak` (6 × the level scale), `guardSoak` (`physical/core.ts:119`) | soak × feed | 6.6 / 9 / 12 | 6.4 / 8.2 / 9.6 | +0.6 a plate: a 7-plate Bulwark III pool stops 4.2 HP more a full pool, about +10% of what Guard stops; Raw Power 7→8 is +5% of a melee line the tank uses rarely | "Pain Threshold 6: each plate soaks 9 (next point: 10)" | **Measured by the tank lane** (rules 1.59, stage 1, 20 seeds, rank I only): a lone wall clears 7 of 20 at 9.0 rounds a fight (a gunner 13 at 3.4) with 52% of the damage it takes absorbed; two shields clear 0 and **14 of 20 runs stall** (the main-hand Buckler hits for 1–2: unkillable but unable to kill); wall + healer clears 1. Doubling the soak deepens the stall, not the deaths: the failure to watch is the stall rate (section 8), and the tank lane's own fix, the Buckler's damage line, comes first. Bulwark II and III (pools 6, 7) not measured |
| **Momentum / Guts** | The Momentum lost to hits and to walking (`rules.momentum.hit_loss` 1, `step_loss` 1), in `loseMomentum` | loss ÷ feed, the remainder carried | ÷1.1 / ÷1.5 / ÷2 | ÷1.06 / ÷1.36 / ÷1.6 | A Breaker that walks 3 tiles and takes 2 hits a round loses 5; at β 10 it loses 2.5. A point keeps about 0.25 Momentum a round: a Finisher step every four rounds. Dexterity 7→8 is +1 to hit with a gun a Breaker doesn't fire | "Guts 5: you lose 2 Momentum where others lose 3" | It covers walking as well as hits, so the Durability + Raw Power mix (whose hits on held Guard already cost none, `physical/guard.ts:11`) still gains. Shoves keep their own cost |
| **Pressure / Athletics** | Your own Pressure's fall at your turn's **end** (`physical/rules.ts:101-109`: `decay` 1, `decay_hidden` 2, `decay_closing` 2) and Slide's reach (`pressure.slide`, 3 tiles) | the final `fall` (after the `pressureDecay` filters, whichever of the three values applied) × feed, in that one handler, the remainder carried; Slide reach round(3 × feed) | fall ×1.1 / ×1.5 / ×2; Slide 3 / 5 / 6 | ×1.06 / ×1.36 / ×1.6; Slide 3 / 4 / 5 | +0.1 Pressure shed a turn and Slide reach most points; at ×2 a Skirmisher sheds Pressed (2) in one plain turn. Athletics also keeps +1 Defense a point | "Athletics 5: you shed 1.5 Pressure a turn; Slide reaches 5" | The lead's "Fire and Move carries further" is a class move (the Skirmisher's), not the door: re-pointed to Slide, which every Dexterity user has (question 8) |
| **Shadow / Acuity** | Spot TN against you (`spot` trigger, `roll_mod roll: tn`, `tactics.ts:279`) | + round(`tn_at_double` × (feed − 1)), `tn_at_double` 5 | +1 / +3 / +5 | +0 / +2 / +3 | +0.5 TN a point on every spot roll, about 2.5% fewer finds a roll, a Hide a fight saved; Raw Power 7→8 is worth little to an Operative | "Acuity 5: foes need 3 more to find you" | The lead's "foes must be closer" is a sight range, not a roll: it needs a range-against-Hidden primitive (question 9). With Still Breath and Close Quarters an Operative at 10/10 is rarely found: by design |
| **Sigils / Rumination** | Flux limit, `mana.sigil.flux.safe_max` (6), `fluxMaxOf` (`magic.ts:113`) | round(6 × feed) | 7 / 9 / 12 | 6 / 8 / 10 | +0.6 Flux a point: every second point is one more glyph before a Vent, 1 AP saved per two points a Line; Will Power 7→8 is +10% of an Outburst the Sigilist doesn't cast | "Rumination 5: your Flux limit is 9 (next: 10 at Rumination 6)" | With Overflux and Clean Vent: 12 Flux vented is a 48-base nova. Measured with the fork |
| **Figments / Improvisation** | Figment body HP (profile `figment_hp`, `rules.json output.profiles`) | HP × feed | ×1.1 / ×1.5 / ×2 | ×1.06 / ×1.36 / ×1.6 | +10% of every Figment's HP, three held: a Wall or Ward that lasts a hit longer every few points; Charisma's gamma doesn't feed it | "Improvisation 5: your Figments are 50% tougher" | A Ward Figment (40 HP base, takes half a hit) at ×2 is a second tank: measured against `figments` and `shield_order` |
| **Bonds / Camaraderie** | Heal back: a share of what you Tend a Bonded ally returns to you | one row on `heal_given` (`self: actor`), `if {target_tied: bond, how: [tending]}`, op `mend` on self, `share` a number block on `feed:bonds` (0.3 × (feed − 1)): the Threads echo's "% restored" shape | 3% / 15% / 30% | 2% / 11% / 18% | A Mender Tending 40 a turn heals itself 12 at 10/10 (about a Touch every three turns); a new number, so "doubles" reads "from nothing to 30%" | "Camaraderie 5: 15% of what you heal down a Bond comes back to you" | It never counts as a heal given (no Ledger, no echo, no brake). In the squad row of section 8 |
| **Outbursts / Composure** | Strain limit, stat `strain_limit` (3 + floor(WP ÷ 2)), `character.ts:802` | round(limit × feed) | 9 / 12 / 16 (WP 10: 8) | 6 / 8 / 10 (WP 6: 6) | +0.8 a point: almost a Pump of headroom each point; Faith 7→8 is +10% Blessing the Channeler rarely prays | "Composure 5: your Strain limit is 12 (next: 13)" | **Doubled, the Short is at 19**: the Mana Shock nearly never comes for a 10/10 Channeler, and Iron Heart adds on top. Question 4 offers p 0.005 for this door only |
| **Prayer / Conscience** | The shields you give by prayer (Protection, a Hymn's shield, Ward) | one row: `mend_mult` on `shield`, `if {actor: self, how: [blessing]}` (`actor: self` required: `shield` is `self: target`), value `feed:prayer` | ×1.1 / ×1.5 / ×2 | ×1.06 / ×1.36 / ×1.6 | +10% of every prayer shield; a Chaplain's Ward layer on four allies; Will Power 7→8 adds nothing a Chaplain uses | "Conscience 5: your prayers' shields are 50% stronger" | **One code line owed:** Whisper shields go `blessing()` → `grantShield(cb, t, n, u)` with no kind (`tactics.ts:417-418`; only the heal passes `'blessing'`), so `how: [blessing]` misses Protection until that call passes `{kind: 'blessing'}`; the Ward's row carries the same kind. "Lasts longer" is dropped: prayer shields last the fight. A doubled layering Ward on four allies is the strongest shield in the game: by design, measured with Benediction (section 8) |

**What each beta does today is kept** (Pain Threshold −elemental and +HP a level; Guts Body saves; Athletics Defense;
Acuity crit taken and Analyze; Rumination Brain saves; Improvisation ambush taken and Field Repair; Camaraderie heal
received and Share a Hit; Composure Heart saves; Conscience shields received).

**Gear gating by beta (owed, not in 0.30).** Leon: *"Beta also gates your armor and equipment, which the equipment does
not have implemented yet."* One gate exists (`techniques.json rules.gear_gates.heavy_armour`: armour classes 4 and 5 need
Pain Threshold 3 and 5). The general piece (a gear row naming the beta and points it needs, read by the one equip rule,
shown on the gear card) is a later system with its own spec; 0.30 adds no gate.

---

## 4. The reshape

### 4.1 Edits by data id

| # | Data id (file) | Old | New | Depends on it (each changes in the same slice) |
|---|---|---|---|---|
| R1 | `defender.draw_fire` (classes.json:3635; Bulwark rank I ref :90) | Draw Fire: 1 AP and Guard, one foe Taunted, no save; a Boss −2 vs others | **Called Out** *(Suggested)*, the Bulwark's Challenge: *"Your Challenge costs no Guard; the foe you name takes it with no save, and if it is a Boss it is −2 to hit anyone but you."* Challenge is the one taunt verb. **For everyone, Challenge names one foe within its 2 tiles** (`grant_action reach {tiles: 2, side: foe}`; the area and its save are unchanged; with no class row the named foe is only the aim), so the class rows hang on `acted` with `target: target` (`condition taunted skip_save`; the Boss row) and a `cost_mod res guard set 0` on Challenge's price. No class predicate, no second taunt verb (L4) | `classes/i.ts:422` handler (claims; retired); `effect_ops.json:187, :219`; `lint-item-ops.baseline.json` (**shrinks**: one handler fewer); goldens costs-items-shelved, costs-items-traits-classes (+ .marks), items-shelved, items-traits-classes, rules-items-traits-classes (**re-recorded on purpose**); classes-i and price-list tests; the Bulwark's text; Challenge's picker gains a target (`actionPickers.ts`) |
| R2 | `durability.unlocks.3` Take the Hit (skills.json:367, :374) | "Once per round, as your reaction, become the target of an attack aimed at an adjacent ally" | **Mastery 1** (the `perk_choice tier_1` op kept; text: "A perk step in this skill.") | `traits.json:1295, :1299, :1334` (Rabbit's Foot: "Take the Hit and taunts" → "Interpose and taunts"); `perks/f.ts:802, :809, :844` comments; protodata rebuilt |
| R3 | `fighter` rank I `shove` (classes.json:232) | Shove: 1 AP, push 1 or Prone, Body save | **Wind-up** *(Suggested)*: *"You start each fight with {=numbers.start} Momentum (the door's start is 1)."* `start: 3`. Carrier: a stat `momentum_start` (N23) read inside the one `combat_start` handler (`physical/rules.ts:48`, which sets Momentum to max(current, start)); a `resource +2` row would end on 2 or 3 by hook order | `rev3.ts:152-154` class_shove (retired); `apps/web/src/game/actionPickers.ts:276`; `classMoves.test.ts:39`; `golden/moves.ts`; `classes-rev3.test.ts`; goldens costs-credit, costs-items-shelved (+ .marks), costs-items-traits-classes (+ .marks), rules-items-traits-classes (+ .log) (**re-recorded on purpose**). The generic Shove action stays (actions.json:54; Dense, Heavyworlder traits, Siege Engine read it) |
| R4 | `fighter.lunge` (classes.json:229, :3426) | Lunge (the class's): move up to N and strike for Momentum | **Barrel In** *(Suggested)*: the same rule, renamed (the technique Lunge keeps its name) | `classes/i.ts:287, :302`; `techniqueFx.ts:149` (a key by id: unchanged) |
| R5 | `fighter.finisher` (classes.json:287) | Finisher: all Momentum, +X% a point | **Measured Blow** *(Suggested)*: *"Once a fight, a Finisher spends half your Momentum (rounded down), not all."* (the door's Finishers are Cleave, Break, Coup and Launch) | `classes/i.ts:331, :341`; `techniqueFx.ts:150` |
| R6 | `shade.lingering_dread` (Breaker rank II ref, classes.json:279) | Fear on a kill (a Will Power save): another door's outcome | **Read the Swing** *(Suggested)*: *"Once a round, a melee attack that misses you gives you {=numbers.momentum} Momentum."* (`miss` trigger, `if {target: self, actor: foe, melee: true}`, `resource momentum`). Riposte spends on a miss; this builds | `effect_ops.json:191` (the shelved Shade keeps its row); `tools/text_numbers.json` |
| R7 | `breaching_strike` Keep Swinging (perks.json:614) | I: a Finisher kill +1 Momentum; II: +2, and +1 on an Elite or Boss hit | I: **a Finisher that drops a foe makes your next Strike or Opener this turn cost no Momentum**; II: that, and a Finisher that hits an Elite or Boss gives 1 Momentum. (The id and tiers are kept, Leon's ruling 1) | Precondition of the Str² peak: "Momentum left after a Finisher kill" now has one source, Follow Through (Raw Power 5, `set 1`). `perk_cards.json:37, :42`; `perks/skeleton.ts:41`; goldens itemops (re-recorded on purpose) |
| R8 | `speed_loader` (Skirmisher I, classes.json:981) | Repeats Speed Load (Dexterity 3) | **Hold the Lane** *(Suggested)*: *"Your held shots (Overwatch, Deny, Cover Me, Dead to Rights) cost {=effects.0.value|abs} AP less (at least 1)."* `cost_mod` on `attack`, `tech_group: [watch]` | the Skirmisher's text; **both** `save-develop-cb40e92` fixtures (`old-save.test`: never regenerated; they must load and play on with the new move); `skirmisher.test`; `lint-item-ops.test`; costs golden (re-recorded on purpose) |
| R9 | `run_and_gun` (Skirmisher III, classes.json:1115) | Repeats Fire and Move, longer; shares its one free move | The same rule, **no longer the turn's one free move**: the Skirmisher III moves free twice a turn (1 tile after a shot, up to 3 after another attack) | `conditions.json free_move_spent` reader on Run and Gun dropped; `weapon_mastery.json:87, :291` text; rules-items golden |
| R10 | `vanish` (Operative I, classes.json:1256) | Repeats Fade | **Vanish**: *"Your Fade costs {=effects.0.value|abs} Shadow less (none)."* | `perks.json:5697, :5719` (Vanishing Act text unchanged); assets keep the icon id |
| R11 | `assassin.mark` (Operative I) | Mark | Kept: it is Tag without Hidden on three foes, the Operative's better form | none |
| R12 | `medic.triage` (Mender I, classes.json:1893) | Repeats Touch | **Triage**: *"Your Touch also stops Bleeding and costs {=effects.0.ap} AP; once an ally a turn."* | **Triage is also a cost site** (`triage`, `effects/stats.ts:21`; `effects/actions.ts:226`), with `rules.json mending.medic.triage` and `triage_out_of_fight_mult` (`mending.ts:61-63`), `commands.ts`, and the traits and perks that answer `ap_cost:triage`: the re-point keeps the cost site and its readers, or out-of-fight Triage breaks silently. `apps/web/e2e/tending.mjs`; `actionPickers.ts:164`; `classView.ts:68`; `m813.json:17, :212, :324, :367, :1615` (campaign text: "Triage" stays the word); heal golden |
| R13 | `false_image` Double (Rigger I, classes.json:1655) | Repeats Visualization 1's Double | **Double, the Rigger's**: *"Your Doubles cost no charge and last {=numbers.rounds} round longer."* (without the door it still projects its Double, as today) | `rev3.ts:439, :441`; `faith.ts:864` (the trick tag); `rigger.test`; `kit.ts`, `owned.ts`, `figmentIcons`; figments goldens |
| R14 | `overclock` (Rigger II, classes.json:1749) | Name repeats Brain Power 3's Overclock | **Redline** *(Suggested)*: the same rule, renamed | `rev3.ts:517-562`; `owned.ts:195, :243`; `narrator/context.ts:313`; `glossary.ts:70` |
| R15 | `scrap_turret` (Rigger III, classes.json:1830) | A non-Figment body that attacks by itself | **Scrap Sentinel** *(Suggested)*: *"Once a scene, from a wreck, a pile with a weapon or a barricade next to you, a Sentinel (the Figment form) stands for no charge, outside your held count."* | `rev3.ts:570, :572` (retired); `figments.json:160` (Many-Eyed Dream's count); the Sentinel form row; `rigger.test`; `kit.ts`, `owned.ts`, `figmentIcons` |
| R16 | `channeler.heart_surge` (classes.json:2314, :4412) | "Past stage 4 it reads one more step of the stage table" | *"Once per turn, a Release or snap cast fires one stage higher, never past stage 4; a snap cast fires at stage {=effects.0.value}. It costs double Strain."* | `classes/i.ts:1244`; **the stage logic in `magic.ts:1137, :1425, :1766` and the Outburst preview**; the mid-fight save fixture; seven test files (outburst20-classes, outburst20-review, outburst40-review, output and three more: grep); `effect_ops.json:225, :388`; outburst golden (re-recorded on purpose) |
| R17 | `faith.unlocks.5` Deliver the Sinner (skills.json:4660, :4667) | 2 AP: mark an enemy; squad +20% damage until it falls | *"Your patron's blows (Smite, Amen, Rebuke, a Hymn's or an intervention's harm) deal {=effects.0.value|more}% more to a foe your squad has Marked."* Marking is Shadow's | `effects/output.ts:123` (the Deliver term); its condition row; prayer golden |
| R18 | `last_rites` (classes.json:3243, :3262) | A prayer's heal on a Downed ally ×1.5 | *"A prayer's heal of yours on a Downed ally is ×{=effects.0.value}; it never stands the ally up."* (Coin for the Ferry and the Miracles keep their own `revive`) | `apps/web/src/game/fx/faith.ts:139-451` (words) |
| R19 | `open_hand` toggle Palm (items.json:1184) | ×0.6; Body save or Off Balance and pushed 1 | ×0.6; Body save or **Staggered** (a new conditions row: `forbid action reaction`, all kinds, until its next turn; no AP lost) | `items.json:1370, :1371, :1404, :1407`; `variants.json:96`; `fx/openhand.ts:8`; monk-measure; conditions golden (a new row) |
| R20 | `tend.shield` (tending.json:1233, :1248) | An ally in reach (3 tiles) or a Bonded ally | **A Bonded ally only** | `rules.json:1689` reader; heal golden; e2e truths that Shield a stranger |
| R21 | Payload | stays | stays | none |
| R22 | `guardian` Ward `holders` (classes.json:2415) | 2 | **4** (squad-wide; question 5) | prayer golden |
| ~~R23~~ | `trick_shot` | Withdrawn: the ricochet is not a hit and lays no Pressure today (section 1) | none | none |

**These lists are a floor, not the list.** Counted by `git grep` on the shield lane; the S0 builder regenerates each R
row's list from a per-id and per-name grep (data, code, tests, goldens, fixtures, e2e, `tools/`) before editing, and
adds one S0 test: **the old-save fixtures (`save-develop-cb40e92` after and mid fight, `save-0.28.2-rigger-mid-fight`)
load and play on** with the changed moves. No `enemies.json` row names a removed id.

### 4.2 The taunt, all sources

Guard owns **the cheapest, surest taunt** (Challenge, Called Out, Provoke, Stand Fast). The others are priced or
saved: the Figment Double's Draw fire (figments.json:187, a Heart save), the Call Taunt (calls.json), the Guilt
feeling's Pump (feelings.json:953), Bond-given Guilt (conditions.json:2777, :2813). They stay.

### 4.3 Who shields best, in exact terms (item 4620)

**Read in the code today** (`effects/damage.ts:64-90`, `physical/guard.ts:38-48`). A hit's damage meets, in order:
(1) the **reduce** phase (the derived cuts, then every item's `damage_in`); (2) the **shield** phase: the Guard
listener runs first and soaks with plates the part of the blow that would pass **the base shield** (`reach = dmg −
u.shield`, `guard.ts:45`: it ignores the layers); then the **layers**, newest first (`damage.ts:84`), then the **base
shield** (`:85`). A source that shields do not answer (a hazard, a trap) is soaked by plates in `reduce`. **How shields
combine** (`grantShield`, `:154`): the base shield takes **the larger** of the old and the new (`stack` only when the
source asks, `output.ts:275`; no data row and no code call asks today: grep); a **layer** is one entry per (layer,
giver) on a unit, the larger stands; `holders` caps how many units carry one giver's layer (`:165`); **two givers'
layers on one unit add** (two entries). Only the Ward names a layer (`classes.json:2421`). **So today a Ward on a
plated unit is spent before the base shield while plates pay for what the Ward would have stopped**: the order is not
the rule below.

**The rule (spec text).**
1. **Plates are not a shield, and they come last.** A blow meets the shields first (the layers, newest first, then
   the base shield); Guard plates soak what gets past them, on the unit that holds them and on the blows its Close
   Guard, Interpose and Cover Them bring to it. Guard is never handed out as a shield. (Why last: a Ward or a Bonded
   Shield given to the tank is used, not wasted under plates that would have held anyway; plates are the tank's own
   pool, and its reaction plate is kept.)
2. **The base shield.** Every shield but the Ward is a base shield: Tending's Shield (a Bonded ally only), the Sigil
   WARD (one-shot; standing only with STAY), the Outburst Buff and Shell, the Whisper of Protection, a Hymn's shield,
   Brimming, Everyone Home. A unit has one base shield: a new one takes the larger of the two, never the sum.
3. **The layering shield is Prayer's.** The Chaplain's Ward is the only shield that **layers**: it stands on top of
   the base shield and is spent first; one Ward a giver on a unit (the larger stands); a giver's Wards stand on at most
   `holders` (4: the squad) allies; **two Chaplains' Wards on one unit add** (one entry each). No other row may name a `layer` (the validator refuses a `layer` on a `mend` op
   outside the prayer door: one new check in `tools/validate.py`).
4. **Who does what best.** Prayer: the layering shield and the squad's aura. Bonds: healing, sustained through the link,
   and the shield on a Bonded ally. Sigils: the one-shot or the standing field on tiles. Outbursts: the big brief shield
   at a Strain price. Guard: plates on yourself and on what you cover. Stop-a-death: Guard (self: Last Plate, Last
   Wall) and Bonds (others: Take the Weight, Last Thread).
5. **What must change.** (a) **One line:** the Guard listener's reach subtracts every shield, `shieldTotal(u)`
   (`damage.ts:150`), not `u.shield` (`guard.ts:45`), so plates soak only what passes the layers and the base; a test
   through the reducer: a Bulwark with a Ward of 20, a base of 20 and plates takes a 50 blow; both shields empty first
   and plates soak the last 10. Re-records: any golden or replay where a plated unit held a Ward (attributed in the
   commit). (b) **Whichever the other lane finds:** if a source **adds** to the base shield (`stack`), it moves to "the
   larger stands" or is named here as the one exception; if a second `layer` user turns up, it is re-pointed to the
   base; if base shields are found to add in a path this read missed, `grantShield` is that path's one copy and the
   rule above holds.

---

## 5. Built from (the existing primitives)

| Rule | Carrier | Where |
|---|---|---|
| A fork is picked once, out of a fight, kept for good | `door/pick` action; `takeDoorPick`, `pendingDoorPicks`, `registerDoorPicks` | `game.ts:1006`; `doorpicks.ts:16, :30, :52` |
| Figments' forks at 4 and 6 | `figments.json ladder` rows; `ladderAt`, `figmentGrants`, the migration | `figments.ts:47, :73, :78, :84` |
| A holder hears an ally's or a foe's event | `runTriggered`: the trigger's own role is the holder unless `if` names it | `effects/triggers.ts:635, :641` |
| Provoke, Stand Fast's taunt, Grindstone's and Converging Fire's marks, Lend the Dark's Hidden, Through the Gap's flag | op `condition` (target, skip_save, rounds) | `triggers.ts:381` |
| Cover Them | op `redirect` on `taking` (Share a Hit's shape, `skills.json camaraderie.unlocks.1`); `answer_on`; `target_within`; `damage` | `triggers.ts:459`; predicates table (ENGINE-HOOKS a) |
| Drive's −2 | op `roll_mod` on `cond_incoming` | `triggers.ts:349` |
| Light Fingers (in part) | op `take` | `triggers.ts:475` |
| Spotter, Ride the Edge, Written in Advance | op `damage_mult` on `dealing` | `triggers.ts:335` |
| Headlong's AP, Long Thread, the brake, Hold the Lane, Called Out's price | op `cost_mod` (`res` on `cost` only, `set`, `min`); `uses_left`; op `use` (on `acted`, never on `cost`) | `triggers.ts:357, :252, :469`; `effects/cost.ts:126-141` |
| Every Momentum, Pressure, Shadow, Guard gain or cost | op `resource` | `triggers.ts:370` |
| Short Thread, Conscience's feed | op `mend_mult` on `heal` / `shield` with `how` | `triggers.ts:407` |
| Shared Pulse, Camaraderie's heal back | op `mend` with `targets {tied: bond}` (Rally's shape); the Threads echo's "% of HP restored" | `triggers.ts:421`; `tending.json tend.threads` |
| Spill's and Clean Vent's damage and targets | op `deal` with `targets {of: target \| self, within: 1, side: foe, max: 1}` (`selectUnits`) | `triggers.ts:411, :581` |
| Clean Vent's shove | op `displace` | `triggers.ts:426` |
| Keep the Thread | op `tie`, the action's `toggle` | `triggers.ts:443, :254` |
| Lightkiller (the zone) and its sight | op `zone`; VEIL's smoke tiles in `sightBlockers` | `triggers.ts:435` (the kind is N9); `combat.ts:750`; `magic.ts:601` |
| Drive's plate back | trigger `cond_landed` with `cond`; op `resource` | ENGINE-HOOKS (a), `cond` predicate |
| Walk It In | trigger `miss` (`on_miss`) | `triggers.ts:68` |
| A Pressure fork's cap | `pressureCap`, `pressureState` | `physical/pressure.ts:15-22` |
| Spotter's single ambush | `damage_mult replaces` | `triggers.ts:335` |
| Number blocks (Clean Break's stage step, the feed) | `numberOf` (base, per, steps); `sourceOf` | `effects/amounts.ts:104`; `triggers.ts:293` |
| Prayer's Whisper as an action, its kind | `grant_action` with `prayer: whisper` (the Ward's row) | `classes.json:2400` |
| The Hymn's wait and its running cut | `hymnWait`, stat `hymn_wait`; the vow's `hymnCut` | `faith.ts:140-147, :603, :970` |
| Who can be Witnessed | `canBeWitnessed` | `faith.ts:383` |
| Plate soak (Pain Threshold's feed) | `guardSoak` | `physical/core.ts:119` |
| A hit's Momentum cost (Guts' feed) | `hit_loss`; `guard0` | `physical/rules.ts:65`; `effects/damage.ts:70` |
| Pressure's fall at turn end (Athletics' feed) | the `turn_end` handler and its `pressureDecay` filters | `physical/rules.ts:25-28, :101-109` |
| Flux limit (Rumination's feed) | `fluxMaxOf`, stat `flux_max` | `magic.ts:113` |
| Strain limit (Composure's feed) | stat `strain_limit` | `character.ts:802` |
| Spot TN (Acuity's feed) | trigger `spot`, `roll_mod roll: tn` | ENGINE-HOOKS (a), `tactics.ts:279` |
| The shield order and kinds | `applyDamage` phases; `grantShield`; `layerShield` | `effects/damage.ts:84, :85, :154, :165` |
| A reaction | `react` | `tactics.ts:141` |
| A resource and a cost site | `RESOURCES`; `COST_SITE_IDS` | `effects/cost.ts:82`; `effects/stats.ts:19` |
| The door's tab | `doorTabsOf`; `skills.json door_line`, `door_tab` | `effects/collect.ts:235`; `apps/web/src/game/doorView.ts:17` |
| An ally made Hidden | Silent Partner's handler | `perks/b.ts:602` |
| Staggered (the Palm) | a conditions row with `forbid action reaction` (as Suppressed) | `conditions.json suppressed` |

---

## 6. Needs a new primitive (the lead approves each before anything is built)

Ranked by how many rules each unlocks. "Nearest" is the closest existing piece and why it is not enough. Revision 2
checked every entry against the code: N5 (for item ops), N11 and the old N8 were dropped or merged; N20 to N23 were
missing and are added; N1, N2, N3b, N9 and N10 are re-worded smaller.

| # | Name | What it is (exact) | Nearest, and why not | Rules it unlocks | Cheaper wording that avoids it |
|---|---|---|---|---|---|
| **N1** | **Fork options as data verbs** | Option rows in `data/forks.json` loaded beside `DATA_VERBS` (`effects/collect.ts:46`) as ItemKind `verb`; one new `requires` kind `{door_pick: <door>.<option>}` in `meetsRequires` (`:222-226`), with the sheet carrying `doorPicks`; `doorpicks.ts` registers every alpha skill's `forks` from `skills.json` (no door named in code); one engine view `doorForkView(c, skill)` for the tab and the level-up card | `registerDoorPicks` exists, but each door registers in code (`figments.ts:78`); a new ItemKind `fork:` and Held field would grow two closed lists where one `requires` kind does | **All 32 options** of eight doors | None: without it each door writes its own registration and readers |
| **N3** | **Beta feed** | A source `feed:<door>` (= 1 + p × α × β, from `skills.json <beta>.feed {door, per_product}`) in `SOURCE_SPACES` and `holderNumber`, and one exported `doorFeed(u or c, door)` that each door's one function multiplies by (`guardSoak`, `loseMomentum`, the turn-end Pressure fall, `fluxMaxOf`, the strain limit, the Figment body); a carried remainder for the two per-turn counts | `skill:` sources are additive (`numberOf` sums `per` terms): no product of two skills | **9** (every beta) | Additive: β × k only (loses "worth most to the deepest", Leon's sizing) |
| **N2** | **The pick is readable** | Predicates `door_pick` / `no_door_pick` (`{door, option}`) in `PREDICATES` (read by item-op `if` and grant_action `if` / `reach.if`, both through `ifFails`); a source `pick:<door>.<option>` (0 or 1) in `SOURCE_SPACES` and `holderNumber` | `toggle` is per action and visible to all; `flag` is the item's own | Stand Fast and Drive (paired rows), Keep the Thread, Short Thread (Touch reach), Long Thread (Bond reach), Rolling Start's and Headlong's guards on Charge Carries: **7** (a row inside the option's own verb needs no `door_pick`: the verb is held only when picked). **Not reached by N2**, each carried elsewhere: technique `numbers` (Rolling Start: N23), grant_action `ap` (Long Thread: `cost_mod` with N20), nested `targets.within` (Stand Fast: paired rows), the blessing runner (Benediction: N5), verb `requires` (N1), the Figments ladder (its own code) | Copy each changed row as a new row in the option (forbidden: a second copy of a rule) |
| **N10** | **A resource-amount predicate** | `self_res` / `actor_res` / `target_res` `{<resource>: {at_least: n \| at_most: n \| at: "max" \| at: "limit"}}`, n a number or a `rule:` path; `max` reads the resource's own max (for `pressure`, `pressureCap`); `limit` reads a named stat (`strain_limit`, `flux_max`) | `self_has_res` tests at least 1 | Through the Gap and Lockdown (a foe at its cap), Ride the Edge (at the limit), Headlong (has 2): **4** | Through the Gap on "a kill"; Ride the Edge on "over half the limit" (still N10) |
| **N7** | **Prayer slots as numbers** (merges the old N7 and N8) | A stat `whispers_per_turn` read where the limit is a literal (`faith.ts:299, :970, :1021`); the vow's `u.faith.hymnCut` (`faith.ts:140-147`) made a count an op adds (a cut is +, an added wait −; `hymnLeft` already re-reads `hymnWait`); the prayer roll on a hook a `roll_mod` hears | `extra_use` never reaches the literal limit; Answered Prayer resets the wait in code | Round of Blessings, Held Breath, Benediction's price: **3** (Answered Prayer and Unbroken Litany II could later move onto it) | Round of Blessings: "your next Hymn's heal or shield ×1.25" (data now); Held Breath: drop it |
| **N3b** | **Strain and Flux as resource rows** | `actions.json resources`: `strain` and `flux` with a **`setter`** (as `pressure` has) that goes through the one Strain function (`strainUp`: the Overload, the Mana Shock) and the one Flux function, and **no `max`** (Strain may stand above its limit; the limit is read by N10) | They are fields the magic code writes by hand; a `resGive` would bypass the Short and the Shock | Clean Break, Slow Burn, Ride the Edge (read): **3** | None for Clean Break and Slow Burn |
| **N23** | **Momentum numbers as stats** | Three stat families read in their one place: `momentum_cost:<tech>` in `momentumCost` (`physical/core.ts:182-188`; the twin of `momentum_needed:<id>`, `:333`); `momentum_start` in the `combat_start` handler (`physical/rules.ts:48`); `tech_num:<tech>.<field>` in `t.num` (`core.ts:239`) | A Charge's Momentum price is code on no hook and no cost site; `cost_mod res` writes only on `cost` (`triggers.ts:358`); `t.num` reads the technique's plain numbers | Headlong, Rolling Start, Wind-up (R3): **3** | Rolling Start without the tile change; Wind-up dropped (the Breaker's rank I slot then needs another move) |
| **N20** | **The `cost` trigger resolves a target** | One row of the closed TRIGGERS table: `cost: {actor: u_, target: t_}` (`triggers.ts:84`), so `target_tied`, `target_has` and `uses_left {each: target}` work on a price | The resolver has no target; a number block on the verb's `ap` is not read (`holderNumber` only for `reach.tiles`, `step.tiles`, `res`) | The brake (receiver-keyed), Long Thread's cut: **2** | The brake keyed per giver (two healers on one body escape it) and Long Thread uncapped: not taken |
| **N22** | **Two magic hooks become triggers** | `vent` (`magic.ts:655`, `{u, flux, extra}`) and `held_turn_start` (`magic.ts:1710`) as item-op triggers | Both hooks exist; neither is a trigger; on `acted` the Flux is already emptied | Clean Vent, Slow Burn: **2** | Clean Vent on `acted` with a flat amount (loses "× the Flux vented") |
| **N14** | **A Line's age and a kept glyph** | Each glyph carries the round it was drawn (a `line_age` event number on the Evoke's `dealing`), and an Evoke field `keep: n` that leaves the first n glyphs | `glyph_drawn` hook, no age; an Evoke clears its glyphs | Written in Advance, Running Script: **2** | Written in Advance: "your first Evoke each turn after a turn with no Evoke ×1.2" (a flag: data now) |
| **N21** | **`on_kill` carries `over`** | The damage past the last HP, worked out once in `applyDamage` (`effects/damage.ts:122`) and put on the payload | `event:amount` reads 0 on `kill` (`triggers.ts:296`) | Spill: **1** | Spill as "a killing Finisher also deals its Momentum spent × k to the foe behind" (a new number, not the overkill) |
| **N5** | **The blessing runner reads `targets` and `if`** | `blessing()` (`tactics.ts:409-418`) applies a Whisper effect's `targets` (through `selectUnits`) and `if` | Item ops already read `targets {of: target}` (`triggers.ts:581`), so Spill and Clean Vent need nothing; Whispers are not item ops | Benediction: **1** | Benediction dropped for Intercession (question 3) |
| **N6** | **A prayer as a reaction** | The reaction door (`react`, `tactics.ts:141`) opened to an action with `prayer: whisper`, in the windows it names (an ally attacked) | Reactions today are attacks, moves and protects | Steadfast: **1** | Steadfast's held-blessing form (data now) |
| **N9** | **The `zone` op may lay smoke** | `DATA_ZONE_KINDS` (`magic.ts:58`, today `['sanctuary']`) gains `veil`, so a non-Sigil row lays the zone `sightBlockers` already reads (`combat.ts:750`) | VEIL's smoke is laid only by the Sigil code | Lightkiller: **1** (later the smoke Outburst, Per² "shade at will") | none |
| **N12** | **`take` fields `what` and `to`** | `what: "any"` (anything carried not in a hand) and `to: "pack"` on op `take` | `take` takes a throwable, else a magazine, to the pile | Light Fingers: **1** (Hand's Filch could read it) | Light Fingers takes only what `take` takes, for no Shadow (dull) |
| **N13** | **Hidden put on another unit** (only if the `condition` op cannot already) | `condition hidden target: target` honoured by the Hidden state (`unitstate.ts hide`) | Silent Partner does it in its handler (`perks/b.ts:602`) | Lend the Dark: **1** | none |
| **N15** | **The Overload's lock as a stat** | Stat `overload_lock` (>0 the Evoker locks; default 1), read by the Overload | The Overload is code | Overflux: **1** | none |
| **N18** | **The Pump on the cost hook, payable in HP** | Cost site `pump` (the planned Pumps of the Outburst preview priced through `price`) and a cost payment `hp` | "an Outburst preview's planned Pumps are not on the cost hook yet" (ENGINE-GUIDE 5) | Blood Price: **1** | "once a turn, a Pump costs no MP and deals you 5% of your max HP" (still needs the Pump on a hook) |
| **N4** | **An item op that makes an attack** | Op `strike` (`{with: main \| off, mode: shot \| blow, free: true}`): one plain attack through the one attack path, no AP, no reaction unless named | `reaction` data op (check first: `perks:catch`); Retort uses `deal`, not an attack | Lockdown: **1** | Lockdown's Slowed form (still N10) |
| **N16** | **A `displaced` trigger** | The `displaced` hook (`combat.ts`, `stoppedBy`, `blockedAt`) as an item-op trigger | the hook exists, no trigger | Drive's wall rider (optional), later Into the Wall (P13): **1** | Drive without the rider (as specced) |
| **N17** | **A follow step** | A self-move to a tile beside the event's unit, inside an action | `displace to: tile` moves to the event's tile, not beside it | Drive's advance (optional): **1** | Drive as written (you stay) |
| **N19** | **A count of uses as a number** | Source `uses:<key>` = uses taken this scope (and `each` target) | `uses_left` is a yes/no | The brake's exact compounding past the third: **1** | The two-step brake (data with N20) |

**Not primitives, owed as fixes in the same slices** (each a defect today): the Guard listener's reach reads
`shieldTotal` (section 4.3); `blessing()` passes `kind: 'blessing'` to `grantShield` (section 3, Conscience);
`designsMax` reads the ladder, not a typed 3 (section 2.9); one `tools/validate.py` check refuses a `layer` outside the
prayer door (section 4.3).

**Consolidated.** Four pieces carry almost everything: **N1** (32 options), **N3** (9 betas), **N2** (7), **N10** (4).
Then three small families: **N7** (prayer), **N3b + N22** (magic), **N23 + N20** (Momentum, Tending prices). The rest
are single-rule pieces, each with a cheaper wording; the lead may take the cheaper wording and approve none of them for
0.30.

---

## 7. Build order

Every slice builds and tests alone, through the reducer (`apply` with real actions: `door/pick`, `combat/*`), and runs
`npm run check`. Goldens re-recorded only where a rule changed on purpose, each named in the commit.

| Slice | What | Needs | Tests through the reducer | Screens | e2e truths that change |
|---|---|---|---|---|---|
| **S0 data only** | Spec block 1.60 and items 4600 onward; Figments' forks to 4/6 (the five stale pieces of 2.9); the reshape rows that are pure data: R2, R4 (rename), R8, R10, R11, R12 (cost site kept), R14 (rename), R16, R17, R18, R20, R22; Keep Swinging (R7); Read the Swing (R6); Staggered (R19); the four owed fixes (section 6: `shieldTotal`, the blessing kind, `designsMax`, the `layer` check) | none | figments-2 rewritten: a fork opens at 4 not 3, a Vis-3 pick is kept; the old-save fixtures load and play on (Vis 5 keeps four forms); Bulwark's Durability 3 is a perk step; Heart Surge never past 4; a stranger can't be Shielded; Deliver the Sinner adds only on a Marked foe; a Ward and a base shield empty before plates; out-of-fight Triage still priced; the Palm's hit Staggers (no reaction) | Figments tab and level-up card (data-driven: none) | `figments.mjs:27-33`: set Visualization 6 before picking the Beast; `tending.mjs` (Shield on a stranger, Triage) |
| **S1 N1, N2** | `data/forks.json`, the `forks` rows, the `door_pick` requires, `doorForkView` | N1, N2 | each door: at 4 and 6 a grant opens, `door/pick` takes one, a second pick refused, refused in a fight; a picked option's rows run | **The fork card** on each door's tab (the Figments tab's CHOOSE chips, `figmentsTab.js:46`, made general on `doorForkView`) and on the level-up card (`levelup.js figLevelUp`, made general) | none (no suite picks a fork but figments) |
| **S2 the data forks** | Provoke, Cover Them, Stand Fast (paired rows), Drive (plate back), Grindstone, Spotter, Short Thread, Shared Pulse, Converging Fire, Walk It In, Keep the Thread, Lend the Dark (check N13), R1 Called Out (Challenge aimed), R13, R15 | S1 | one test a fork: Provoke Taunts the soaked attacker once a round; Cover Them takes the first ranged hit of a Burst within 2 and spends a Guard and the reaction; Stand Fast pushes none and Taunts all within 2; Drive refunds a plate per Off Balance, at most 2; Spotter on a Lend the Dark ambush stays ×1.5; Keep the Thread keeps the tie, takes 12 MP, no Daze, and a Boss Bond still ends after 3 rounds; a miss lays a pip | Challenge's target picker | `tank.mjs` truths on Draw Fire |
| **S2b prices and Momentum** | The brake (receiver-keyed), Long Thread (once per Bonded ally), Headlong, Rolling Start, Wind-up (R3), Spill | N20, N23, N10, N21 | two healers on one target meet one brake; a Mender's fourth discounted Mend in a turn is full price; a Headlong Charge costs 2 Momentum, 0 AP and builds nothing; Rolling Start's first-of-fight Charge is not over-paid; Wind-up starts at 3; Spill moves the overkill once and never re-Spills | none | `tending.mjs` (Mend prices) |
| **S3 the beta feeds** | the nine `feed` rows; the door tab's beta line | N3 | each feed: at α 10 β 5 the number is ×1.5 in its one carrier; Guts and Athletics carry the remainder across turns | **The door tab's beta line**, from the engine's door view | `tabs.mjs` (the door line) |
| **S4 magic forks** | Clean Break, Slow Burn, Ride the Edge, Overflux, Clean Vent, Running Script, Written in Advance, Blood Price | N3b, N10, N22, N14, N15, N18 (or their cheaper wordings) | each through Begin/Pump/Release and draw/Evoke; Strain above the limit is not clamped; Ride the Edge at the limit and the Mana Shock; Blood Price refused when it would Down | heart panel words | `heart.mjs`, `magic.mjs` |
| **S5 prayer forks** | Round of Blessings, Steadfast, Benediction, Held Breath | N5, N6, N7 (or cheaper) | each for a Faithful of two patrons and a fresh Atheist; Steadfast with Held Breath gives at most one Whisper a turn plus one held, never two banked; a wide Whisper adds a round to the Hymn | prayer panel | `faith` suites |
| **S6 the rest** | Light Fingers, Lightkiller, Through the Gap, Lockdown, Drive's rider and advance | N4, N9, N10, N12, N16, N17 (or cheaper) | each; Through the Gap fires on an Elite at Suppressed and a Boss at Pressed | none | none |

**Art placeholders** (one line each for `art/briefs/ART-REQUESTS.md`; Wick flat-ink icons, `art/icons/forks/`, 32 in
all; until drawn, the option shows its door's skill icon):
- Guard: `fork.guard.provoke`, `fork.guard.cover_them`, `fork.guard.stand_fast`, `fork.guard.drive`
- Shadow: `fork.shadow.light_fingers`, `fork.shadow.lend_the_dark`, `fork.shadow.lightkiller`, `fork.shadow.spotter`
- Bonds: `fork.tend.keep_the_thread`, `fork.tend.short_thread`, `fork.tend.shared_pulse`, `fork.tend.long_thread`
- Prayer: `fork.prayer.round_of_blessings`, `fork.prayer.steadfast`, `fork.prayer.benediction`, `fork.prayer.held_breath`
- Momentum: `fork.momentum.rolling_start`, `fork.momentum.grindstone`, `fork.momentum.spill`, `fork.momentum.headlong`
- Pressure: `fork.pressure.converging_fire`, `fork.pressure.walk_it_in`, `fork.pressure.through_the_gap`, `fork.pressure.lockdown`
- Sigils: `fork.sigil.overflux`, `fork.sigil.clean_vent`, `fork.sigil.written_in_advance`, `fork.sigil.running_script`
- Outbursts: `fork.soul.ride_the_edge`, `fork.soul.slow_burn`, `fork.soul.blood_price`, `fork.soul.clean_break`
- Renamed class moves keep their icon ids (Called Out, Barrel In, Measured Blow, Read the Swing, Wind-up, Hold the Lane, Redline, Scrap Sentinel): a name change in the list, no new art.

---

## 8. Measuring plan

**Leon's target is reward for effort, not a cap.** A fork, a feed or a reshaped move is accepted when (a) its best-play
policy is clearly better than its door played plainly (the reward exists), (b) neither option of a step is dead (in the
simulated best play of the door's own base class, each option is the better pick in at least one build or map: the
failure signal is a pair that splits worse than 80/20 across builds), and (c) the all-in line stays inside the
contract's per-level band (±25%) with the option taken. Something 2% over is not a finding; something 40% over, or an
option nobody would take, is.

**The tank lane's baseline** (rules 1.59, `a995b3ea`, stage 1, 20 seeds, rank I): a lone wall (wraps + Buckler) 7 of
20 clears, 9.0 rounds a fight, 0 stalls, 52% of damage taken absorbed; the two-shield wall 0 clears, 10.5 rounds, 14
stalls; wall + gunner 7 clears at 5.7 rounds; wall + healer 1 clear; the solo gunner 13 at 3.4 rounds; solo melee 8 at
3.4. The tank's fights run about 2.6 times as long as a damage dealer's (Leon's "slow": no change). Every Guard row
below is measured against this, and Bulwark II and III (pools 6, 7) are measured for the first time with it.

| What | Simulator / contract row | Re-measured because |
|---|---|---|
| Guard forks, Pain Threshold feed, Called Out, two shields (L5), plates after shields | `defence-measure`; ceiling `shield`, `shield_order`; `survival-run` (stage reach of a Bulwark party, ranks I to III) | soak ×2 on two shields; Cover Them; Stand Fast against Drive (the 80/20 split, Bulwark and non-Bulwark separately); **the stall rate** (fights past 40 rounds), the tank's own failure: more than a quarter of a wall's runs stalling is a finding |
| Momentum forks, Guts feed, Wind-up, Measured Blow, Read the Swing, Keep Swinging | `melee-measure`; contract `blade` (melee); `monk-measure` (the Palm) | **Wind-up with Rolling Start: the turn-1 Finisher** (start 3, a Charge that costs nothing and builds 1, Charge Carries +2: x5 on the first hit?); Headlong building nothing; Spill's overkill; Grindstone against Rolling Start for a Breaker (80/20) |
| Pressure forks, Athletics feed, Hold the Lane, Run and Gun apart | `guns-measure`; contract `gun` | a second free move for the Skirmisher; Converging Fire with three guns; Through the Gap and Lockdown **against Elites and Bosses** (the cap rule); Walk It In for a low-Dexterity gunner |
| Shadow forks, Acuity feed, Vanish | `shadow-measure`; ceiling `shadow` | Spotter's ambush on allies (never ×2.25); Lend the Dark; Lightkiller's middle tile |
| Bonds forks, Camaraderie feed, the brake, Triage, Shield on Bonded only | `heal-measure`, `mp-measure`; contract `heal`; ceilings `tending_turn`, `mender_offence`, `mender_window`, `healer_turn` | Long Thread capped at 3 discounted a turn; Shared Pulse; **the Mender's fourth point: Keep the Thread (a damage turn every turn) against Short Thread (×1.4, Touch at 2): the 80/20 check**; Keep the Thread on a Boss (the Bond still ends at 3 rounds) |
| Prayer forks, Conscience feed, Ward holders 4, Deliver the Sinner, Last Rites | `faith-measure`; contract `whisper`, `hymn`, `chaplain`; ceilings `whisper_turn`, `hymn_turn`, `chaplain_turn` | **Benediction's Health and Protection on a stacked squad** (four allies in a 3×3, Conscience ×2, the Hymn a round later each time: its own row); Held Breath with Steadfast; a doubled layering Ward |
| Sigil forks, Rumination feed | `magic-measure`, `refit-measure` (`sigil_line`); contract `sigil4` | Flux 12, Overflux, Clean Vent's nova |
| Outburst forks, Composure feed, Heart Surge capped | `outburst-measure`; contract `ob`, `obPeak` (the 212 top of rules 1.56 item 29) | Strain limit 16; Ride the Edge; Clean Break; the Mana Shock rate (how often a policy enters it) |
| Figments' move, Improvisation feed, Scrap Sentinel, the Rigger's Double | `figments-measure`; ceiling `figments` | Figment HP ×2; a free Sentinel |
| **The squad: can it be killed?** | `survival-run` with four parties at alpha and beta 10, each holding its four best forks: (1) a Bulwark (two shields, Pain Threshold 10, Stand Fast, Cover Them) + Chaplain (Ward on 4, Conscience 10, Benediction) + Mender (Long Thread, Camaraderie 10) + a gunner; (2) the Guard + Prayer mix; (3) the Momentum + Bonds mix; (4) the Shadow + Outbursts mix | Reported: enemy rounds to the first Down; **the share of Boss fights at equal level in which no one goes Down**. **Failure signal, named in advance: more than half of the Boss fights with no Down** (the squad Leon called immortal), or any party's first Down later than round 8 on average. Below that line, "measured, not capped" stands |
| Everything | `npm run balance` (simulator smoke); `REPLAY_FULL=1` replay hash before a merge (re-recorded on purpose for every slice that changes a rule) | the enemy AI meets Taunts from Provoke, Stand Fast and Called Out |

---

## 9. Leon's questions (either / or)

1. **Cover Them:** once a round with your reaction and a Guard (below the peak, as specced), or every ranged hit on an
   ally within 2, standing (your words, which is the End² peak and makes Stand behind me dead)?
2. **Lightkiller:** once a fight, or as often as you have 2 Shadow (shade at will: the Per² peak)?
3. **The sixth-point Faith fork:** the two Whisper options (Benediction said wide, Held Breath), which work for every
   patron and every Atheist, or the intervention options (Intercession, Benediction), which are Faithful-only and lean
   on the Vir² peak?
4. **Composure's feed:** ×2 at 10/10 like every other beta (the Strain limit of a 10/10 Channeler is 16 and the Mana
   Shock nearly never comes), or half as steep for this door alone (×1.5, limit 12)?
5. **The Ward:** squad-wide (on up to 4 allies at once), or kept at 2?
6. **Lockdown:** the free shot (needs a new attack op), or the Slowed version (still needs "at its cap")?
7. **Keep the Thread:** a kept Snap gives no Daze and no save (as specced), or keeps the Daze (a −2 AP lock on one foe
   every turn)?
8. **Athletics' feed:** on Slide (every Dexterity user, as specced), or on Fire and Move as the lead wrote it (the
   Skirmisher's own, so no one else gains)?
9. **Acuity's feed:** a higher spot TN (buildable now, as specced), or foes must come closer to find you (a new sight
   range against the Hidden)?
10. **Conscience's feed:** every shield you give by prayer, Ward included (as specced, works for anyone with Faith), or
    the Ward only (the Chaplain's)?
11. **Drive:** a plate back for each foe knocked Off Balance (buildable now, as specced), or you advance with the push
    (needs a follow step)?
12. **The brake:** keyed on the one healed, from anyone (as specced: two healers on one body meet it), or on each healer
    alone (cheaper to build, and two healers on the Bulwark never meet it)?
13. **Shields and plates:** the shields first and the plates last (as specced: a Ward given to the tank is used), or the
    plates first (the tank's own pool spent before a gift)?
14. **Figments' saves:** old unstamped saves gain a form (the Ward at Visualization 3 to 4, the Husk or Sentinel at 5
    to 6: a gift, as specced), or a migration bump that holds them to their old forms?
15. **Tunnel:** replaced by Walk It In (a miss lays a pip, as specced), or kept as a Bead upgrade (dead to anyone who
    has not learned Bead)?

---

## Review (revision 2): the 30 holes

Each was checked against the shield lane at `a995b3ea` before acting. Accepted unless noted.

- **Accepted as found (player holes):** 1 (`pressureCap`: an Elite stops at 3, a Boss at 2; every Pressure fork is
  keyed to the foe's cap; three excite lines rewritten); 2 (Spotter `replaces: "ambush"`, weapon hits only); 4
  (Benediction paid in the Hymn's wait, no Rebuke, its own section 8 row); 5 (the Steadfast / Held Breath sentence); 7
  (a Headlong Charge builds nothing; Spill never Spills, by construction; the Wind-up row); 8 (the Boss limit read,
  the 80/20 check); 9 (Lightkiller sees as VEIL's smoke does, one rule for both: the middle is blind both ways); 10
  (the alpha-6 column, the mix case and the attribute cost); 12 (the squad row, failure signal named in advance).
- **Accepted with a different fix:** 3 (the brake keyed on the receiver and Long Thread's cut once per Bonded ally, as
  found; both need N20, which the hole did not name); 6 (Drive pays in plates through `cond_landed` on Off Balance,
  buildable today, instead of a plate back per full push, which needs N16); 11 (Guts divides every Momentum loss, hits
  and walking, by the feed with the remainder carried, instead of a threshold plus free tiles: one formula that reaches
  the Durability + Raw Power mix; Athletics carries the remainder as found).
- **Accepted as found (engine holes):** 13 (N5 removed for item ops; restated for the blessing runner); 14 (N21,
  `on_kill` carries `over`); 15 (N23 `momentum_cost:<tech>`; Headlong gated by N10); 16 (N23 `tech_num`; the cut
  floored, so the free first Opener is not over-paid); 17 (N20; `use` on `acted`; the brake rows raise, no negation
  needed); 19 (Suppressed and Broken are pip states; N10 covers the target's Pressure, the Slowed form included); 20
  (Strain and Flux rows with a setter, no `max`); 21 (N22: `vent` and `held_turn_start` as triggers); 22 (`actor: self`
  on Short Thread and Conscience; the blessing kind is one owed code line; Conscience's one carrier is its data row);
  23 (the Trick Shot finding was false: R23 and the old question 13 withdrawn; 13 now asks about shields); 24 (Stand Fast's four paired rows; Called Out
  rides an aimed Challenge for everyone, no second taunt verb); 25 (N1 as data verbs with a `requires` kind); 26 (N2's
  reader list, each fork it does not reach named with its carrier); 27 (the five stale Figments pieces, the Vis-5 save,
  no rev bump); 28 (the R rows' lists extended; the per-id grep and the old-save test made S0 duties); 29 (Wind-up as
  the `momentum_start` stat; N7 and N8 merged into "prayer slots as numbers"; `last_blessed` runs out in a round); 30
  (Shared Pulse worded "the target too"; marks ordered after their checks; Cover Them "the first ranged hit").
- **Accepted, with the fork replaced:** 18 (decay is at turn end; the Athletics feed multiplies the final fall in that
  one handler, whichever of the three values applied). Tunnel is replaced by **Walk It In**, not by a Bead option as
  the hole suggested: Bead is a learned technique, so a fork that changes it is dead to anyone without it (question
  15). N11 dropped.
- **Found on the way, not in the 30:** the Guard listener soaks the part of a blow past the **base** shield and ignores
  the layers (`guard.ts:45`), so a Ward on a plated unit is spent while plates pay for what it would have stopped; the
  rule in 4.3 puts the shields first and names the one-line fix (question 13). `designsMax` types a 3 in code. Two
  Chaplains' Wards on one unit add (separate entries): written into the rule. The tank lane took rules 1.59, so this
  block is 1.60.
- **Rejected:** none in full.
