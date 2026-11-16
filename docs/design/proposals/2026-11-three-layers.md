# Three layers: doors, classes and advanced classes, checked against each other

A proposal. Written 16 Nov 2026 for the lead, on branch `design/layers` (from `origin/main`, live 0.29.0). **Revision 2** (same day): 40 review holes checked against live data and closed; the account is the Review at the end. Design only: no code or data is changed. Every name marked *(Suggested)* is a placeholder and Leon's to change.

**Why.** On 16 Nov the lead put four door forks and a "one outcome per door" reshape to Leon. Leon answered that they had not been checked against a system with classes and advanced classes. Then, on the lead's first layer rule: *"advanced class have squared class that amplifies the door to it's peak and hybrid class that connects the door in interesting ways too remember that"*. This document does that check.

**The result in one line.** Of the 16 first fork options, 14 collided with a name, a class move, a perk, another door or a peak; the eight forks below replace them, each checked against its own base class (section 4.1, the "Base class" column) and against every peak (section 1). Ownership means an outcome's best form, not its only source, because the magic doors already make push, pull, pin, heal, shield, smoke and traps by design.

Sources read (live 0.29.0): `data/classes.json`, `skills.json`, `techniques.json`, `pressure.json`, `shadow.json`, `tending.json`, `figments.json`, `sigils.json`, `soul_modules.json`, `feelings.json`, `patrons.json`, `perks.json`, `conditions.json`, `calls.json`, `items.json`; `packages/engine/src/doorpicks.ts`, `triggers.ts`, `actions.ts`, `combat.ts`, `faith.ts`, `classes/i.ts`, `classes/rev3.ts`; `docs/ENGINE-HOOKS.md`, `docs/design/move-pool.md`.

---

## 1. The layer rule

**In four lines.**
1. **Door:** what the mechanic is, for anyone with 1 point; two forks choose a style of its own verbs.
2. **Base class:** the best user of one door, up to the door's **ceiling** (rank III and the Mastered perk sit there).
3. **Squared class (A + A):** one door at its **peak**: it breaks one of the door's own stated limits. Nothing below it reaches the peak.
4. **Hybrid class (A + B):** one door's verb fills, spends or carries the other door's resource or verb, through the faction's special focus. The only place a resource crosses doors.

| Layer | Opened by | Its job | It may | It may not |
|---|---|---|---|---|
| **Door** | 1 point in the alpha skill; anyone | The verbs, the resource, the limits; every outcome it makes at a plain strength | Give verbs on its ladder; give two **forks** (a style: how its own verbs behave) | Make another door's outcome at that door's best form; break its own stated limit |
| **Base class** | Highest attribute at level 3, fixed; rank II at 5 and level 6, rank III at 8 and level 12 | The best user of one door: more resource, cheaper, more often, one stronger rider | Raise pools and caps up to the door's ceiling; upgrade a door verb (Brace upgrades Guard) | Add an outcome the door does not make; touch a second door; reach the peak |
| **Perk** (M1–M4, Mastered) | Skill 3/5/7/9/10 | A personal tune of one door. **The Mastered perk is at the ceiling: a personal twist, never a peak cell** | Add numbers, conditions, a once-a-fight twist | Give a standing verb (Iron Grip, 3c); reach a peak cell (question 5) |
| **Squared advanced** (A + A) | **Entry:** the attribute at 10, the alpha skill Mastered, and the faction's teaching (never by level alone, so it is not "rank IV") | The door at its **peak** (table below) | Lift a cap, make a once-a-fight thing standing, the grand forms, a second school in one Outburst | Connect to another door |
| | **Focus:** the faction's version of the door's own tool (a shield, a gun, a glove, a reliquary). An Evoker or Emanator flavour changes only the look and data of that tool and adds no door (question 11) | | | |
| **Hybrid advanced** (A + B, two attributes) | Faction, attribute pair, special focus | **Two doors connected:** one door's verb fills, spends or carries the other door's resource or verb (the only place a resource crosses doors); the focus is the carrier | Combine the two doors' outcomes in one action | Raise either door past its base class's ceiling |

Combining outcomes in general is open to everyone at their own door's price (section 4.2: Sigils and Outbursts already stealth, pull, pin, heal and shield). What only a hybrid does is the **crossing**: a cut draws a glyph, Hidden holds an Outburst, a Figment Pumps a heart.

**The ceiling ladder:** door (plain) < fork (a style, same ceiling) < base class rank III and the Mastered perk (the door's ceiling, a personal twist) < squared class (the peak). A hybrid sits beside the ladder, not above it.

### Tested against the two magic doors (the model)

| | Sigils (Brain Power, Int) | Outbursts (Will Power, Det) |
|---|---|---|
| **Door** | Words, Lines of 2–4 glyphs on your own tile, Evoke, Flux; Overclock (BP3: one word over the cap) | Begin / Pump / Release, stages 0–4, one school (+ a second at half from WP5), Strain, feelings, modules |
| **Base class** | Sigilist: Barrage, Core Change, Bleed the Flux; Overcharge (one word more, never more than 4 glyphs); Payload (double area); Stored Spell. **Economy or size: obeys the rule** | Channeler: Shape, Iron Heart, Storm Front, Occult Library, Eye of the Storm. **Heart Surge breaks the rule** ("Past stage 4 it reads one more step of the stage table") |
| **Squared (peak)** | Grand Sigilist: a Line of 5, glyphs on any tile you see, Enlarge, the grand staff | Heartfed: Begin above stage 0, the same school twice (`soul_modules.json:145`, shelved for an advanced class), the ten `advanced` modules |
| **Hybrid (crossing)** | Blade Scribe (a cut draws a glyph), Spellslinger (a round carries a glyph) | Storm Hand (blows Pump the heart), Shade (Hidden holds a held Outburst) |

Two flaws: Payload sits near Enlarge (question 3); Heart Surge reaches past stage 4 (question 4).

### The peak of each door

| Door | Its stated limit today | The door's ceiling (base class rank III) | The peak (squared class) | Below the squared class, never |
|---|---|---|---|---|
| Guard (End²) | Plates soak blows on you; 25% of a blow on an ally next to you (Close Guard); Interpose takes one ally's hit for Guard and the reaction; Retort costs the reaction | Bulwark III Anchor; **Stand behind me** (0.30: a ranged attack on one ally directly behind you lands on your plates at their normal share) | **Nothing gets through, and it hurts:** every blow on any adjacent ally, any direction, the whole blow, comes to your plates; a plate that soaks a full blow stands; **Retort without a reaction, against every attacker** (the thorns tank) | The whole blow off more than one ally; cover past adjacent other than Stand behind me's one tile; Retort without a reaction |
| Momentum (Str²) | Counter ×1 to ×3 (Breaker ×5); a Finisher spends it | Breaker ×5; Follow Through's 1 left after a Finisher kill | **The unbroken chain:** the counter past ×5; a Finisher kill keeps the whole counter | A counter past ×5; **Momentum left after a Finisher kill beyond ×1 from all sources together** (precondition: merge Follow Through, Keep Swinging and Breaker III's Finisher, 3c) |
| Pressure (Agi²) | Pips on the target you hit; one reaction (Skirmisher 2); Rout at the threshold | Skirmisher III Run and Gun, Break Them | **The whole field pressed:** pips on every foe in a fan; a shot before initiative (the Draw) | Pips on more than one target per shot |
| Shadow (Per²) | Hidden needs shade or no eyes; Ghost Kill once a turn, spends its Shadow, not while Marked; Douse needs a lamp | Operative III Execution | **Unseen while seen:** Hidden in plain view as a standing state; Ghost Kill as a chain (a Ghost Kill gives back its Shadow); **shade where you want it, at will** (the smoke assassin) | Hidden in view; a Ghost Kill that returns Shadow; more than one a turn; making shade more than once a fight |
| Sigils (Int²) | Lines of 2–4 on your own tile; word cap | Sigilist III Payload (question 3) | **The grand form:** a Line of 5, any tile you see, Enlarge | A 5th glyph; a glyph off your own tile (outside a hybrid's crossing) |
| Figments (Exp²) | Held 1/2/3 (+1 Rigger); they act on your turn | Rigger III | **The dream that walks:** a Figment with its own turn, that survives the fight's end | A Figment taking its own turn |
| Bonds (Ins²) | Up to 3 Bonds; everything flows from your tile | Mender III Rally, Brimming | **One heart in two bodies:** cast and heal from a Bonded ally's tile; damage shared along the Bond (Heartbinder's Through and Share) | Sharing damage between two allies; acting from another unit's tile |
| Outbursts (Det²) | Stage 4; one school once; Strain | Channeler III (question 4) | **The overfull heart:** same school twice, Begin above stage 0, advanced modules | Anything past stage 4 |
| Prayer (Vir²) | Witnessed only from a Hymn or Miracle; it ends at an intervention (Chaplain: the first keeps it); one intervention a fight, two from Devotion 7; Miracle once a session | Chaplain: The Patron at Your Side, the Canticle | **The patron walks with you:** standing Witnessed, **Witnessed renewable by a Whisper**, interventions on your call, a second Miracle | More interventions than Devotion gives; a second Miracle; **any source of Witnessed other than a Hymn or Miracle** |

---

## 2. The outcome map (today, 0.29.0)

⚑ = made by more than one door (a door's class and perks count as that door).

| Outcome | Door verb | Base class move | Shelved advanced | Perk | Doors |
|---|---|---|---|---|---|
| **Hold** | none | Bulwark III Anchor | Hellraiser Suppression | Iron Grip (Grapple) | ⚑ Guard, Momentum |
| **Throw / push** | Guard Slam; Heavy Hands (RP3); Outburst Control; the Shove action; **a patron intervention** (patrons.json:1631) | Breaker Launch, Breaker Shove | none | Earthbreaker | ⚑ Guard, Momentum, Outbursts, Prayer |
| **Pull** | Bonds Tug; Sigil PULL; Outburst Control, Lure module | none | none | none | ⚑ Bonds, Sigils, Outbursts |
| **Pin** | Run Through; a Pressure shot; Sigil BIND; Figment Snare; Outburst Control, Anchor module; a Hymn's 3×3 | none | Hellraiser Emplace | none | ⚑ six doors |
| **Taunt** | Guard Challenge; Figment order Draw fire; the Call Taunt (calls.json); the Guilt feeling's Pump; Bond-given Guilt (conditions.json) | Bulwark I Draw Fire | none | none | ⚑ Guard, Figments, Outbursts, Bonds, (Calls) |
| **Redirect a blow** | Interpose, Close Guard, Take the Hit (D3, dead data); Threads; Figment Interpose | Mender II Take the Weight | Adamantile; Heartbinder Share; Twinbound | none | ⚑ Guard, Bonds, Figments |
| **Heal at range** | Mend, Touch; Sigil MEND; Outburst Buff; Whisper of Health; Mother Ember's intervention | Mender I Triage; Chaplain Last Rites | Banner Dancer Sweep | Bitter Balm | ⚑ Bonds, Sigils, Outbursts, Prayer |
| **Area heal** | Outburst Buff in a Burst or Aura; Sigil MEND with SPREAD | Mender III Rally | Banner Dancer | none | ⚑ Outbursts, Sigils, Bonds |
| **Raise** (the Downed) | Bonds Raise (E3), Last Thread; **the Toll-Keeper's Hymn I, Coin for the Ferry (heal with `revive`); the Toll-Keeper's and Mother Ember's Miracles** | Chaplain Last Rites (×heal on a Downed ally) | none | none | ⚑ Bonds, Prayer |
| **Shield** | Guard plates (self); Bonds Shield (E2); Sigil WARD (one-shot); Outburst Shell, Inverse; Whisper of Protection | Chaplain I Ward; Mender III Brimming; Chaplain III Sanctuary | Adamantile; module Bastion | none | ⚑ five doors |
| **Mark** | Shadow Tag, Plant; Prayer Deliver the Sinner (F5); Analyze | Operative I Mark | Ghost Case File | Sinner's Due | ⚑ Shadow, Prayer |
| **Lure** | Shadow Decoy (searchers); Figments Glimmer, Double | Rigger I Double | none | Solid Image | ⚑ Shadow, Figments |
| **Summon a body** | Figments | Rigger III Scrap Turret | Siege Sentry; Twinbound Twin; Warden Cover | none | Figments only |
| **Stealth** | Hidden, Fade, Ghost Kill; Sigil VEIL; Outburst Silent | Operative I Vanish | Shade | Vanishing Act | ⚑ Shadow, Sigils, Outbursts |
| **Trap** | Rig (I7); Figment Snare; Sigil STAY, WAIT; Outburst Fuse, Linger | Operative II Sabotage | none | none | ⚑ four doors |
| **AP taken from a foe** | Pressure's Suppressed; Shadow's Timing (Off Balance); Guard Slam (Off Balance); the Palm (Off Balance) | none | none | none | ⚑ Pressure, Shadow, Guard, Momentum (gloves) |
| **Squad aura** | Outburst Aura | Chaplain Canticle; Under the Eye | Banner Dancer | none | ⚑ Prayer, Outbursts |
| **Stop a death** | Guard Last Plate; Bonds Last Thread | Bulwark II Unbroken; Mender II Take the Weight | none | Last Wall | ⚑ Guard, Bonds |

Only **summon a body** has one owner; the magic doors appear in 13 of 20 rows (Leon's "everything else has to play catch-up", measured). An exclusive-ownership rule would gut Sigils and Outbursts, **so ownership means the outcome's best form** (4.2).

---

## 3. Collisions

### 3a. Name clashes (first proposal)

Anchor (Bulwark III; Outburst module), Sanctuary (Chaplain III; a trait), Bastion (advanced module), Juggernaut (armour class 5; the End² slot), Mercy (Empathy 5; a feeling; a patron tag), Spite (a feeling), Hand (a Figment form); Wire collides by effect with Sabotage. Live repeats: Overclock (BP3, Rigger II), Lunge, Shove, Double. Revision 2 names avoid all of these, and also Rebuke (a Whisper) and Ward.

### 3b. The first proposal's forks: what each was

Bastion widened Close Guard toward the peak; Reprisal was Retort; **Anchor was Bulwark III word for word**; Juggernaut was the End² peak; **Knife was Ghost Kill for everyone**; Wire was Ingenuity 7 and Sabotage; Smoke was a peak; Eyes was Mark and Deliver the Sinner; Mercy was near Rally; Spite was Threads and two perks; Knot was Heartbinder's Share; Leash was the hold; **Voice was empty for anyone but the Chaplain**; Hand was Smite and Sinner's Due; **Sanctuary was Chaplain III**; Witness was the Vir² peak. Fourteen of sixteen failed.

### 3c. Reshape lines that broke a class or primitive (first proposal)

- **Guard owns holding (Slam: Held):** no Held condition; the hold is Anchor and Iron Grip; "pushed" is read by Brace, Anchor, Heavy Hands. Slam keeps its push.
- **Momentum owns throwing:** Slam, Outburst Control and the Shove action stay plain pushes; Launch owns the throw.
- **Pressure owns pinning:** six doors pin. Pressure's own outcome is **suppression**, and with it **AP taken from a foe**.
- **Shadow, Decoy searches:** already true (shadow.json Decoy: "its searchers go there").
- **Sigil heals and shields sit on tiles:** **wrong.** MEND and WARD heal or shield once; only STAY delivery or the shelved grand forms (Spring, Dome) stand on tiles.
- **Bonds own the link (heals at range only through a Bond):** breaks MEND, Buff, the Whisper of Health, Mother Ember, Triage.
- **Prayer owns death, no plain healing:** Prayer **already raises** (Coin for the Ferry, two Miracles); stop-a-death is Guard's and Bonds'.
- **Palm staggers:** no new primitive needed: *Staggered (Suggested)* is one conditions.json row with the existing `forbid` op (`action: reaction`), as Suppressed uses, without the AP loss. Content.
- **One taunt:** seven sources apply Taunted (3 rows above). "One taunt" is wrong; the line is "Guard owns the cheapest, surest taunt".
- **Take the Hit retired:** its action has no handler anywhere (dead data); Durability 3 keeps its `perk_choice tier_1` op (the M1 perk step).

**Also found:** three copies of "a Finisher kill leaves Momentum" (Follow Through RP5, Keep Swinging, Breaker III Finisher); base classes repeating their door (Speed Load / Speed Loader; Fire and Move / Run and Gun; Fade / Vanish; Touch / Triage; Double / Double; Mark / Tag); Iron Grip gives a standing verb; the Guard pool reads 5 in the Bulwark's text and `guard.max 4` in techniques.json (the 0.30 Bulwark pool lane settles it).

### 3d. Fork placement

Mastery steps are at skill 3, 5, 7, 9. Forks at 4 and 6 keep the perk step off the fork's card, but they take the fork away from the two-door player: Leon's own hybrid example (Durability 3 + Faith 5) gets **no Guard fork** and only the first Faith fork; the second needs Faith 6, so attribute 6. The splash door is where a player feels "the Chaplain who tanks", and it would have no style. **Recommendation: the first fork at 3** (with the perk step, as Figments already does; it shapes the verbs that open at 3), **the second at 6** (no perk step; it shapes the rung opened at 5). The tables below say "first" and "second" so either placement reads (question 2).

---

## 4. The revised proposal

**A fork (the test):** it changes how the door's own verbs behave **on your turn** (a style, not a number alone). It gives no new verb, no outcome another door owns at its best form, does not reach a peak cell, and takes no class move's or perk's effect. **Neither option may be made dominant or dead by its own base class's moves** (the "Base class" column). Picked once through `door/pick`, kept for good.

### 4.1 The four ladder doors

**Guard (Durability).** Best form: **the soak and the draw** (blows come to your plates; foes come at you). The hold is the Bulwark's Anchor. The forks split into a **draw** path (A) and a **reach** path (B).

| Fork | Option A | Option B | Base class takes A or B? why |
|---|---|---|---|
| First (shapes Retort, Close Guard, Challenge) | **Provoke** *(Suggested)*: Retort keeps its reaction cost; the foe you Retort is Taunted to you (no save) | **Step In** *(Suggested)*: Interpose can take the hit for an ally up to 2 tiles away; you step to the tile next to that ally first. Close Guard stays 25% | Either. A Bulwark who holds a line takes A (the draw feeds Anchor); one who guards a backline takes B (Stand behind me covers one tile, Step In reaches the ally who strayed) |
| Second (shapes Slam, Last Plate) | **Stand Fast** *(Suggested)*: Slam pushes nobody; each foe it hits is Taunted to you (no save), and still makes its Off Balance save | **Drive** *(Suggested)*: Slam pushes 2 tiles, and a foe it pushes makes its Off Balance save at −2. You stay Braced (you do not move) | Leans A (Anchor wants foes beside you); B stays live for a Bulwark covering an ally behind (pushing threats off them). Remaining collision 1 |

- Dropped: Thorned (Retort without a reaction is the End² peak), Shoulder to Shoulder (diagonals were already covered: `dist` is Chebyshev, combat.ts; 40% overlaps Chaplain III Sanctuary's 3×3), "Off Balance gives back Guard" (unbuildable; AP denial is Pressure's).
- **Bulwark adds:** a bigger pool (0.30), Brace, Challenge with no save on one foe (Draw Fire merged), Unbroken, Anchor, Stand behind me (0.30, the door's ceiling).
- **Leaves room for:** End² (the full soak on every adjacent ally; the thorns tank); End+Vir (Adamantile: a plate that breaks is Witnessed); End+Exp (Warden: plates on a Figment Wall); End+Ins (the leash, 5.1).

**Shadow (Ingenuity).** Best form: **the unseen strike on one target, and the Mark**. Forks are utility styles; the kill is the Operative's.

| Fork | Option A | Option B | Base class takes A or B? why |
|---|---|---|---|
| First (shapes Lift, Decoy) | **Light Fingers** *(Suggested)*: Lift may take any one carried item (a stim, a core, a charm), not only a grenade or a magazine | **Ventriloquist** *(Suggested)*: Decoy may be thrown onto an ally's tile: foes that can see only that ally lose it and search there until it acts (it is Hidden to them) | Either. Neither feeds Ghost Kill, so the Operative chooses thief or cover-for-the-squad, not "more kill" |
| Second (shapes Douse, Read Intent) | **Lightkiller** *(Suggested)*: once a fight, Douse works with no lamp: your tile and the tiles next to it go dark for 2 rounds | **Spotter** *(Suggested)*: Read Intent on a Tagged foe lasts until it falls (your side sees its next action every turn) | Either. Mark (Operative I) marks three foes; Spotter reads one; Lightkiller is shade once, not at will (the peak) |

- Dropped: Cutthroat (a refunding Ghost Kill is the Per² chain; with Lightkiller it made the smoke assassin at Ingenuity 6), Wire (Ingenuity 7, Sabotage), Eyes and the first Spotter (live already: Marked lasts the fight; Tag is limited only per turn).
- **Timing** stays as Shadow's one-target, from-Hidden form of AP denial; it never stacks with Suppressed.
- **Operative adds:** Shadow at the start, a bigger cap, Vanish (re-pointed: Fade at 1 Shadow less), Mark, Execution.
- **Leaves room for:** Per² (Hidden in view, the Ghost Kill chain, shade at will); Per+Det (Shade); Per+Vir (Inquisitor: the patron strikes the Marked); Per+Exp (traps that are images).

**Bonds (Empathy).** Best form: **sustained healing at range through the link**, and the only ally shield that needs the link.

| Fork | Option A | Option B | Base class takes A or B? why |
|---|---|---|---|
| First (shapes Snap, Mend) | **Keep the Thread** *(Suggested)*: Snap keeps the Bond and costs 12 MP (Tug's price); the foe makes a save to break the Bond; no Daze | **Short Thread** *(Suggested)*: Tending a Bonded ally within 2 tiles is ×1.4 instead of ×1.2 | Either. A Mender on the front takes B; one who works an enemy Bond takes A |
| Second (shapes the second Bond, Shield, Tug) | **Overflow** *(Suggested)*: a Mend on a Bonded ally also heals each other Bonded ally for a quarter | **Long Thread** *(Suggested)*: Bond reach +3 tiles; Mend and Shield on a Bonded ally you see cost 1 AP less | Either. Overflow needs two Bonds (the Mender has them; others reach bonds_5 by now); Long Thread's AP counts for a Mender too (bond_free covers reach, not price) |

- Dropped: Knot (Heartbinder's Share), Leash (the hold; moved to End+Ins), the first Overflow (one Bond below Empathy 5; "every Bond" healed foes), the first Keep the Thread (a repeatable Daze, Pressure's ground, with no price).
- **Bonds' Shield works only on a Bonded ally** (its text loses "an ally in reach"). Prayer's Ward is the one shield that layers.
- **Mender adds:** a free Bond each turn, +1 Bond, Triage (flagged repeat of Touch), Take the Weight, Brimming, Rally.
- **Leaves room for:** Ins² (Heartbinder); Ins+Agi (Banner Dancer, on pips); Ins+End (the leash); Ins+Int (a Bond that carries a Line).

**Prayer (Faith).** Best form: **the squad aura and the patron's eye** (Witnessed, the Canticle, the intervention). Small heals stay; raising stays only patron by patron (Coin for the Ferry, the Miracles).

| Fork | Option A | Option B | Base class takes A or B? why |
|---|---|---|---|
| First (shapes Whispers, Hymns) | **Duet** *(Suggested; was Chorus)*: a Hymn's heal or shield also reaches one more ally within 2 tiles of its target, at 70% | **Steadfast** *(Suggested)*: once a round, a Whisper may be said as your reaction | Either. Neither is an aura (the Canticle stays the Chaplain's); a Chaplain who heals takes A, one who answers takes B |
| Second (shapes the intervention) | **Intercession** *(Suggested)*: an intervention may land on the foe an ally last attacked, not your own target | **Benediction** *(Suggested)*: an intervention may give, in place of its damage, your patron's Whisper to every ally in its reach | Either. The Chaplain's interventions land where its weapon struck; A moves them to an ally's fight, B trades the blow for the squad |

- Dropped: Herald and Martyr's Eye (both raise Witnessed uptime, the Vir² axis; with The Patron at Your Side and Under the Eye, Herald was standing Witnessed at Faith 6). Chorus as written (a second squad aura), the first Steadfast (most Whispers are instant).
- **Last Rites** reads: "a prayer's heal on a Downed ally is multiplied; it never stands the ally up". A Raise stays Bonds' best form; Coin for the Ferry is the Toll-Keeper's priced exception.
- **Deliver the Sinner** reads Mark instead of making one: "your patron's blows (Smite, Amen, Rebuke) deal +20% to a foe your squad has Marked". Marking is Shadow's.
- Every Witnessed source in data carries `if.patron` (faith.ts `canBeWitnessed`: Faithful at Faith 5).
- **Chaplain adds:** the Canticle, The Patron at Your Side, Amen, Holy Dread, Last Rites, Ward, Smite, Under the Eye, Blessed Arms, Sanctuary, Verdict.
- **Leaves room for:** Vir² (Saint: standing Witnessed, renewed by a Whisper, interventions on call, a second Miracle; Herald and Martyr's Eye are its seeds); End+Vir; Per+Vir.

### 4.2 The reshape, revised

**Each door owns its outcome's best form** (the cheapest, surest and strongest version, with the door's rider). Other doors make that outcome only through their own medium: a magic price, a save, a setup, an area. Distinctness is in the rider.

| Outcome | Owner (best form) | Others keep | Edits |
|---|---|---|---|
| The soak and the draw | Guard | Figment Interpose; Threads (pain sharing is Bonds') | Draw Fire merged into Challenge; Take the Hit retired (dead data) |
| The cheapest, surest taunt | Guard (Challenge) | The Call, the Guilt feeling, Bond-given Guilt, the Figment order: priced taunts | If the Figment order is meant as a lure, it takes the Double's fooled-by-image rule (as Glimmer) in place of `taunted` |
| The throw (3 tiles, Prone) | Momentum (Launch) | Slam, the Shove action, Outburst Control, interventions: plain pushes | Breaker I Shove dropped (*Wind-up, Suggested*: start each fight with 1 Momentum) |
| Suppression and **AP taken from a foe** | Pressure | Timing (one target, from Hidden, never with Suppressed); Slam's Off Balance; the Palm | The Palm: *Staggered* (no reaction) in place of Off Balance plus push |
| Stealth and the Mark | Shadow | VEIL, the Silent module | Deliver the Sinner reads Mark |
| The standing field | Sigils (a Line left, STAY, WAIT) | Outbursts own the moment (a shape from you) | Sigil MEND and WARD stay one-shot; their standing form is STAY or the grand forms |
| Bodies that take hits | Figments | none | Scrap Turret becomes a Figment form (no form attacks by itself today: a new form); Siege's Sentry to the Warden |
| Sustained healing through the link; the Raise; the Bonded shield | Bonds | One-shot heals at a price (MEND, Buff, Whisper of Health, Mother Ember); Coin for the Ferry | Bonds' Shield on a Bonded ally only; Last Rites never stands up |
| The burst | Outbursts | Second Wind (self) | none |
| The squad aura, the patron's eye, the layering shield | Prayer (Canticle, Witnessed, Ward) | Outburst Aura | none |
| Stop a death | Guard (self), Bonds (others) | none | none |

### 4.3 The five doors that already choose

| Door | Its class | Obeys the rule? |
|---|---|---|
| Momentum | Breaker | **Partly.** Shove, Lunge and Finisher repeat the door; Lingering Dread (fear) is another door's outcome. Drop Shove, rename Lunge, merge Finisher into the door's Finishers (a precondition of the Str² peak) |
| Pressure | Skirmisher | **Partly.** Speed Loader and Run and Gun repeat Speed Load and Fire and Move |
| Sigils | Sigilist | **Yes**; Payload against Enlarge (question 3) |
| Figments | Rigger | **Partly.** Double repeats V1; Overclock repeats a name; Scrap Turret is a non-Figment body |
| Outbursts | Channeler | **Yes** except Heart Surge (question 4) |

---

## 5. The 21 advanced classes

**Rule.** A squared class is a door's peak (section 1). A hybrid crosses two doors: one door's verb fills, spends or carries the other's resource or verb, through the faction's focus. **Allocation:** each door appears in two or three hybrids; at least half the hybrids pair two non-magic doors (for example Guard × Shadow, Momentum × Figments, Pressure × Bonds); no two hybrids of one door use the same direction of crossing (five Guard hybrids are today one idea, "plates go into another door's container"). Int+Det and Exp+Det compete for their slots; they are not defaults.

### 5.1 Each shelved class against its pair

| Class (pair) | Verdict |
|---|---|
| End² slot | **Clear** (full soak, thorns); rename (Juggernaut is armour class 5) |
| Str² (Berserker slot) | **Clear** once the three "Momentum after a kill" copies merge; drop the borrowed Sweep and Empty Hand |
| Agi² Gunslinger | **Clear** once Six for Six lays pips |
| Per² Ghost | **Clear** (Hidden in view, the chain, shade at will) |
| Int² Grand Sigilist | **Clear** |
| Exp² Mirage | **No job as Exp²** (gambling Sigils is Sigils); move to Int+Exp; Exp² needs the walking dream |
| Ins² Heartbinder | **Clear** |
| Det² Heartfed | **Clear** |
| Vir² Saint | **Job clear, moves empty**: write it from the peak cell, Herald and Martyr's Eye as seeds |
| Blade Scribe (Str+Int) | **Clear** (example 1) |
| Storm Hand (Str+Det) | **Clear** |
| Spellslinger (Agi+Int) | **Clear** |
| Banner Dancer (Agi+Ins) | **Re-point** Sweep to pips |
| Adamantile Knight (End+Vir) | **Re-point**: a plate that breaks is Witnessed |
| Warden (End+Exp) | **Re-point**: a Figment Wall holds your plates |
| Shade (Per+Det) | **Re-point** (example 2) |
| Inquisitor (Per+Vir) | **New**: the patron strikes the Marked (Deliver the Sinner is its seed) |
| Hexer (Exp+Ins) | **New**: a Bond on a Figment |
| Hellraiser (Agi+Vir) | **Half a job**: add the prayer side or move to Agi² |
| Glyph Mason (Int+End) | **Re-point**, but it repeats the plates-in-a-container shape: competes with Warden and Vessel |
| Circuit Mage (Int+Ins) | Its moves are Sigils × Outbursts: competes for Int+Det, or rewrite as Sigils × Bonds |
| Devoted (Det+Exp) | **Fold** into Heartfed |
| Vessel (Det+End) | **Re-point**: Pump into plates (same shape as Warden, Glyph Mason: one of the three) |
| Twinbound (Det+Exp) | **Clear** (example 3) |

**Count after the moves:** Outbursts in about five hybrids, Sigils in four, Figments, Bonds and Prayer in two or three. That breaks the allocation rule: one or two of Storm Hand, Shade, Vessel, Twinbound and the Int+Det slot give way to non-magic pairs. **Unclaimed and natural:** Per+Exp (traps that are images); Int+Ins (a Line carried along a Bond); **End+Ins (the leash: Anchor's hold carried along a Bond, so a Bonded foe cannot walk away)**; Str+Vir (Momentum spent as a Hymn); Guard × Shadow; Momentum × Figments; Pressure × Bonds.

### 5.2 Three worked examples

**1. Blade Scribe (Str + Int; southern sects; focus: the Evoker blade, weapons.json:3407).** Each melee hit with the blade draws one glyph on the *target's* tile; a Finisher at ×N Evokes the Line the last N cuts drew. Momentum's verb fills Sigils' Line. The Line is still 2–4, the counter still ×5. Built from: the Sigil draw site (+ "draw on another tile", section 6), the Finisher, Momentum.

**2. Shade (Per + Det; Smetanita Conjunction; focus: a Smetanita Emanator *(Suggested: the veil-glove)*).** An Outburst Begun while Hidden is held unseen (the Silent module); a Release from Hidden that kills keeps you Hidden **once a turn, spending the Shadow a Break would** (it does not refund, so it is not the Per² chain); Nightmare Mark is a Mark that leaves a Fear residue. Shadow's state carries Outbursts' Release. Built from: Hidden, Mark, the Silent module, feelings' residue.

**3. Twinbound (Det + Exp; Arkvelton; focus: an Arkvelton Emanator that counts as a Visualizer *(Suggested)*).** The Twin is a Figment form that holds one of your Outbursts and Pumps it in its place in the order; you Release from the Twin's tile. A Figment body carries Outbursts' heart; it takes no full turn of its own (that is Exp²). Built from: a Figment form, Begin/Pump/Release, the focus `counts_as`.

---

## 6. Engine

### Built from (existing)

| Rule | Primitive |
|---|---|
| A fork pick, kept for good | `door/pick`, `Character.doorPicks` (doorpicks.ts) |
| Provoke, Stand Fast | Retort's and Slam's rows; `condition taunted skip_save` on Slam's targets (a condition op per target works; a resource op would go to the target) |
| Drive | Slam's `displace tiles` number; `roll_mod` on `cond_incoming` with `if.actor self` |
| Light Fingers | Lift's item filter in shadow.json |
| Spotter | Read Intent's duration on a target `has: tagged` |
| Keep the Thread | the tie-clear row off by pick; Snap's `res mp` |
| Short Thread | one `mend_mult` row with `target_within 2`, `tied bond` |
| Overflow | a second `mend` row, targets `{side ally, tied bond}`, a quarter amount (copied, not split: no new op field) |
| Long Thread | Bond reach number; `cost_mod ap` on Mend and Shield with `tied bond` |
| Intercession, Benediction | the intervention's target and op rows in patrons.json (faith.ts) |
| Deliver the Sinner reads Mark | `damage_mult` with `target has marked`, `how` patron blow |
| Staggered | one conditions.json row, `forbid action reaction` (as Suppressed) |

### Needs a new primitive (list only; the lead approves each)

1. **Predicates `door_pick` / `no_door_pick`** (`{door, option}`): a row applies only if the option was (not) taken. Without the negative, a fork cannot switch off the row it replaces.
2. **A `pick:<door>.<option>` number source (0 or 1)**, added to `sourceOf` (triggers.ts SOURCE_SPACES) **and** `holderNumber` (actions.ts) together, so a fork that changes a number is a number block on the existing row, not a copied row (hard rule 3).
3. **A data-driven door fork registration** (a ladder row carries `fork`; today each door registers in code, as figments.ts does).
4. **A prayer kind predicate** (whisper / hymn) for Duet (no predicate tells them apart today).
5. **A Whisper as a reaction** (Steadfast): the reaction cost site opened to a prayer action.
6. **An ally made Hidden to the foes that see only it** (Ventriloquist; `last_seen` has no duration).
7. **A tile darkness with a duration** (Lightkiller), unless VEIL's smoke field row can be laid by a non-Sigil row: check first.
8. **A follow step**: a self-move to a tile next to the event's unit inside a reaction (Step In).
9. **"Draw on another tile"** for a hybrid's glyph (Blade Scribe), when advanced classes return.
10. Reach readers: `tileReachWhy` checks range only for a plain `reach.tiles` (actions.ts:97); any reach made a number block must go through `holderNumber`, or stay a plain per-option row.

### Data and code touched (for the builder's brief)

| Change | Touched |
|---|---|
| Draw Fire into Challenge | classes.json move_pool `draw_fire` and Bulwark rank I ref; `classes/i.ts:422` handler (claims all); two refs in effect_ops.json; golden files costs-items-shelved, costs-items-traits-classes (+ .marks), items-shelved, items-traits-classes, rules-items-traits-classes (**re-record on purpose**); the classes-i and price-list tests |
| Take the Hit retired | skills.json durability unlock 3 (keep its `perk_choice tier_1` op); traits.json:1295, :1299, :1334 texts; no handler exists |
| Breaker Shove dropped | classes.json base[1] rank I; `rev3.ts:154` class_shove; apps/web actionPickers.ts:276; classMoves.test.ts:39. The generic Shove action stays (Dense and another trait, Siege Engine perk read it) |
| The Palm | items.json open_hand toggle (:1254); one conditions.json row; Iron Grip's text |
| Scrap Turret as a Figment | `rev3.ts:570`; classes.json; a new figments.json form |
| Bonds' Shield on Bonded only; Last Rites; Deliver the Sinner | tending.json Shield; classes.json Last Rites; skills.json faith unlock 5 |
| The eight forks | shadow.json, tending.json, skills.json durability, patrons.json rows, after primitives 1–2 |
| Readers of "pushed" (Brace, Anchor, Heavy Hands, five techniques) | none: Slam keeps its push |

---

## 7. Leon's questions (either / or)

1. **Ownership:** a door owns an outcome's *best form* (others make it at their own price), or its *only* form (the magic doors lose push, pull, pin and smoke)?
2. **Fork placement:** first fork at 3 (with the perk step, as Figments) and second at 6, or both at 4 and 6 (no perk step on the card)?
   - 2b. **The splash door:** a door you hold at 3 gets its first fork (the hybrid player's style), or a splash door has no fork and the hybrid's identity waits for the hybrid advanced class?
3. **Payload (Sigilist III, double area):** keep it and give Grand Sigilist the Line of 5 and any tile as its peak, or cut Payload so Enlarge is the only big area?
4. **Heart Surge (Channeler III) past stage 4:** cap it at stage 4, or keep it (live) and give Heartfed only the same school twice and Begin above 0?
5. **Mastered perks:** check that no live Mastered perk reaches a peak cell and re-tune any that does, or let Mastered perks touch the peak once a fight?
6. **Prayer and healing:** keep the small heals (the Whisper of Health, Mother Ember), or remove plain healing from Prayer?
7. **The Raise:** Bonds own it and Prayer keeps only the patron-priced raises (Coin for the Ferry, the Miracles), or Prayer's raises go too?
8. **Iron Grip (Grapple):** leave it as the one perk with a standing verb, or move Grapple to a Momentum technique and let Iron Grip tune it?
9. **The four classes with no job** (Mirage as Exp², Inquisitor, Hexer, Devoted): rewrite each for its pair, or drop them and fill the open pairs?
10. **Hybrid allocation:** hold each door to two or three hybrids with half the hybrids non-magic (some Outburst hybrids give way), or keep the shelved roster's magic-heavy spread?
11. **A squared class's faction focus:** it is the faction's version of the door's own tool, with Evoker or Emanator flavour only, or may it feed a magic door (which makes it a hybrid in all but name)?

---

## Review (revision 2): the 40 holes

Checked against live data before acting. Accepted unless noted.

- **Accepted as found:** 1, 14, 30 (Chebyshev `dist`, combat.ts: diagonals already covered; Step In replaces Shoulder to Shoulder); 2, 29 (moving never costs plates; Drive rebuilt without a step); 3, 31 (Douse has `ap 1`, no `res`, needs a lamp; Lightkiller rebuilt); 4 (Ventriloquist given a behaviour); 5, 33 (Overflow moved to the second fork, allies only, copied a quarter); 6 (Long Thread's rider is an AP price, not reach); 8, 35 (most Whispers instant; Duet and a reaction Whisper); 9, 37 (Prayer already raises: Coin for the Ferry, two Miracles; Last Rites never stands up); 10; 11; 12, 17 (Thorned was the End² thorns peak; Provoke keeps the reaction); 13; 15 (question 2b); 16 (the column and the test line); 18 (Stand behind me is the Guard ceiling); 19 (Cutthroat removed; Shade's kill-keeps-Hidden now spends Shadow); 20 (the second Prayer fork shapes the intervention); 21; 22; 23 (Glimpse column removed); 24; 25; 26; 27; 28 (Stand Fast's Guard refund was unbuildable; taunt instead); 32 (Marked lasts the fight; Tag has no hold cap); 34 (Snap kept costs 12 MP); 36 (`if.patron` on every Witnessed source; item 5 deleted); 37.2–3 (MEND and WARD are one-shot; interventions push); 38; 39; 40.
- **Merged where two holes conflicted:** 2 against 29 (Drive): 29 wins, there is no follow-step primitive for a Slam with several cleared tiles, and with no step Braced is kept anyway. 3 against 19 and 31 (Lightkiller): shade at will is the Per² peak, so Lightkiller is shade once a fight. 7 against 20 (Herald): 20 wins; capping Herald still spends the fork on the peak's axis. 17 against 12 (Thorned): both, Provoke keeps the reaction (17) and serves the draw (12). 18 against 1 and 14: Close Guard stays 25% with no new reach; Step In moves you rather than widening the plates.
- **Rejected in part:** 8's "Steadfast = prayer heals ×1.2" (35's buildable form) is not taken: it is a number and makes Duet and Steadfast both heal options; the reaction Whisper costs one primitive (6.5) and changes the turn. 3's "Spotter: Read Intent until it falls" is taken, but 32's alternative (Tag at 0 AP) is not: a number. 31's "Ventriloquist = Decoy reaches 10 and costs no Shadow" is not taken (a number; 4 is preferred, at the cost of primitive 6.6).
