# Three layers: doors, classes and advanced classes, checked against each other

A proposal. Written 16 Nov 2026 for the lead, on branch `design/layers` (from `origin/main`, live 0.29.0). Design only: no code or data is changed. Every name marked *(Suggested)* is a placeholder and Leon's to change.

**Why.** On 16 Nov the lead put four door forks and a "one outcome per door" reshape to Leon. Leon answered that they had not been checked against a system with classes and advanced classes. Then, on the lead's first layer rule: *"advanced class have squared class that amplifies the door to it's peak and hybrid class that connects the door in interesting ways too remember that"*. This document does that check.

**The result in one line.** Of the 16 proposed fork options, 14 collide with a name, a class move, a perk, another door or a shelved advanced class (four of them are a squared class's peak); 2 survive in a changed shape. The reshape's rule "no other door may produce an outcome" fails against both magic doors, which already produce push, pull, pin, heal, shield, smoke and traps by design. Section 4 gives a version that passes.

Sources read (live 0.29.0): `data/classes.json` (base, `gain`, ranks, `advanced`), `skills.json` (alpha unlocks), `techniques.json`, `pressure.json`, `shadow.json`, `tending.json`, `figments.json`, `sigils.json`, `soul_modules.json`, `feelings.json`, `patrons.json`, `perks.json`, `conditions.json`, `packages/engine/src/doorpicks.ts`, `docs/ENGINE-HOOKS.md`, `docs/design/move-pool.md`, and three readers' passes (verified where relied on; corrections noted).

---

## 1. The layer rule

| Layer | Opened by | Its job | It may | It may not |
|---|---|---|---|---|
| **Door** | 1 point in the alpha skill; anyone | **What the mechanic is.** The verbs, the resource, the limits. Every outcome the door produces at a plain strength | Give verbs on its ladder; give a **fork** (a style: *how* its own verbs behave) | Give another door's outcome at that door's price; break its own stated limit |
| **Base class** | Highest attribute at level 3, fixed; ranks at 5/6 and 8/12 | **The best user of one door.** More of the resource, cheaper, more often, more reliably, and one stronger rider on a door verb | Raise pools and caps up to the door's ceiling; upgrade a door verb (Brace upgrades Guard) | Add an outcome the door does not make; touch a second door; reach the peak |
| **Squared advanced** (A + A) | Faction, attribute pair | **The door at its peak.** Breaks one of the door's own stated limits | Lift a cap, make a once-a-fight thing standing, a second school in one Outburst, grand forms | Connect to another door |
| **Hybrid advanced** (A + B, cross-core) | Faction, attribute pair, **special focus** | **Two doors connected.** One door's verb carries or triggers the other's outcome | Combine two doors' outcomes (the only place); carry it in the faction's Evoker, Emanator or weapon | Raise either door past its base class's ceiling alone |
| **Perk** (M1–M4, Mastered) | Skill 3/5/7/9/10 | **A personal tune of one door.** A number, a trigger, a rider on an existing verb. **The Mastered perk is a once-a-fight glimpse of the door's peak** | Add % and conditions; once-a-fight peak taste | Give a new standing verb (see Iron Grip, section 3c) |

**The ceiling ladder each door has to show:** door (plain) < fork (a style, same ceiling) < base class rank III (the door's ceiling) < Mastered perk (the peak, once a fight) < squared class (the peak, standing). A hybrid sits beside the ladder, not above it.

### Tested against the two magic doors (the model)

| | Sigils (Brain Power, Int) | Outbursts (Will Power, Det) |
|---|---|---|
| **Door** | Words, Lines of 2–4 glyphs on your own tile, Evoke, Flux. Overclock (BP3: one word over the cap) | Begin / Pump / Release, stages 0–4, one school (+ a second at half from WP5), Strain, feelings, modules |
| **Base class** | Sigilist: Barrage, Core Change, Bleed the Flux (cheaper); Overcharge (one word more, "never more than 4 glyphs"); Payload (double area); Stored Spell. **All economy or size: obeys the rule** | Channeler: Shape, Iron Heart, Storm Front, Occult Library, Eye of the Storm (economy, reach, Strain). **Heart Surge breaks the rule**: "Past stage 4 it reads one more step of the stage table" (rank III reaches past the door's stage cap) |
| **Mastered perk** | Clean Draw: once a fight, a spell with no charge and no Flux (a glimpse of the peak) | The Twin Pays: once a fight, a Begin with no AP, mana or Strain (a glimpse) |
| **Squared (peak)** | Grand Sigilist: a Line of 5, glyphs on any tile you see, Enlarge (a word over radius 2), the grand staff (an Evoker) | Heartfed: Begin above stage 0 (Overflow), the same school twice (already "defined but shelved for an advanced class", `soul_modules.json:145`), the ten `advanced`-family modules (echo, cascade, orbit, volatile…) |
| **Hybrid (connection)** | Blade Scribe (Evoker blade), Spellslinger (pistol Evoker), Glyph Mason | Storm Hand (Emanator gauntlet), Shade, Twinbound |
| **What is left for a faction focus** | The special Evoker changes *where a glyph comes from* (a cut, a round, a Figment), not how strong it is | The special Emanator changes *what fills the heart* (blows, a twin, a Bond), not the stage table |

**Verdict.** The magic doors already have the shape Leon describes, with two flaws to fix: Payload (Sigilist III, double area) sits very near Enlarge, and Heart Surge (Channeler III) reaches past stage 4. Questions 3 and 4.

### The peak of each door (what nothing below the squared class reaches)

| Door | Its stated limit today | The peak (squared class) | Glimpse (Mastered perk) | Below the squared class, never |
|---|---|---|---|---|
| Guard (End²) | Plates soak blows on you; 25% of a blow on an ally next to you (Close Guard); pool 4 (Bulwark 5); a plate breaks | **Nothing gets through:** every blow on an adjacent ally comes to your plates; plates take ranged blows across a line; a plate that soaks a full blow stands | Last Wall | A fork or rank that takes the *whole* blow off an ally, or covers beyond adjacent |
| Momentum (Str²) | Counter ×1 to ×3 (Breaker ×5); a Finisher spends it all | **The unbroken chain:** the counter past ×5; a Finisher kill keeps the counter | Earthbreaker | A Finisher that spends nothing; a counter past ×5 |
| Pressure (Agi²) | Pips on the target you hit; one reaction (Skirmisher 2); Rout at the threshold | **The whole field pressed:** pips on every foe in a fan; a shot before initiative (the Draw) | Trick Shot | Pips on more than one target per shot |
| Shadow (Per²) | Hidden needs shade or no eyes; Ghost Kill once a turn, not while Marked | **Unseen while seen:** Hidden in plain view as a standing state; Ghost Kill as a chain | Vanishing Act | Hidden in view; more than one Ghost Kill a turn |
| Sigils (Int²) | Lines of 2–4 on your own tile; word cap | **The grand form:** a Line of 5, any tile you see, Enlarge | Clean Draw | A 5th glyph; a glyph off your own tile |
| Figments (Exp²) | Held 1/2/3 (+1 Rigger); they act on your turn; Snap | **The dream that walks:** a Figment with its own turn, that survives the fight's end | Solid Image | A Figment taking its own turn |
| Bonds (Ins²) | Up to 3 Bonds; everything flows from your tile | **One heart in two bodies:** cast and heal *from* a Bonded ally's tile; damage shared along the Bond (Heartbinder's Through and Share) | Open Hand | A fork that shares damage between two allies |
| Outbursts (Det²) | Stage 4; one school once; Strain | **The overfull heart:** same school twice, Begin above stage 0, advanced modules | The Twin Pays | Anything past stage 4 (Heart Surge today: question 4) |
| Prayer (Vir²) | Witnessed ends at an intervention (Chaplain: the first keeps it); one a fight, two from Devotion 7; Miracle once a session | **The patron walks with you:** standing Witnessed, interventions on your call, a second Miracle | Judgement Day | More interventions than Devotion gives; a second Miracle |

---

## 2. The outcome map (today, 0.29.0)

⚑ = made by more than one door (counting a door's class and perks as that door). Reader 1's "pull is the Mender's alone" is wrong: Sigils and Outbursts pull too.

| Outcome | Door verb | Base class move | Shelved advanced | Perk | Doors |
|---|---|---|---|---|---|
| **Hold** (can't leave you) | none | Bulwark III Anchor (Braced: unmovable; OA ignores Disengage) | Hellraiser Suppression (zone) | Iron Grip (Momentum: the Grapple technique) | ⚑ Guard, Momentum |
| **Throw / push** | Guard Slam (D5); Raw Power Heavy Hands (RP3); Outburst Control (push); the Shove action and technique (anyone) | Breaker Launch, Breaker Shove (I) | none | Earthbreaker (Prone) | ⚑ Guard, Momentum, Outbursts |
| **Pull** | Bonds Tug; Sigil PULL; Outburst Control (pull), Lure module | none | none | none | ⚑ Bonds, Sigils, Outbursts |
| **Pin** | Momentum Run Through (Finisher); a Pressure shot (techniques.json:2428); Sigil BIND; Figment Snare; Outburst Control, Anchor module; a Hymn's 3×3 (patrons.json:769) | none | Hellraiser Emplace (self) | none | ⚑ Momentum, Pressure, Sigils, Figments, Outbursts, Prayer |
| **Taunt** | Guard Challenge (D3); Figment order Draw fire; a feeling (feelings.json) | Bulwark I Draw Fire | none | none | ⚑ Guard, Figments, Outbursts |
| **Redirect a blow** | Guard Interpose, Close Guard, Take the Hit (D3); Bonds Threads; Figment order Interpose | Mender II Take the Weight | Adamantile Plate; Heartbinder Share; Twinbound Twin guards you | none | ⚑ Guard, Bonds, Figments |
| **Heal at range** | Bonds Mend, Touch; Sigil MEND; Outburst Buff (heal); Prayer Whisper of Health; Mother Ember's intervention | Mender I Triage; Chaplain Last Rites | Banner Dancer Sweep | Bitter Balm (rider) | ⚑ Bonds, Sigils, Outbursts, Prayer |
| **Burst heal** (big, one target) | Outburst Buff at stage 4; Guard Second Wind (self, D5) | none | none | none | ⚑ Outbursts, Guard |
| **Area heal** | Outburst Buff in a Burst or Aura; Sigil MEND with SPREAD | Mender III Rally | Banner Dancer Sweep | none | ⚑ Outbursts, Sigils, Bonds (class) |
| **Raise** (the Downed) | Bonds Raise (E3), Last Thread | Chaplain Last Rites (×heal on a Downed ally) | none | none | ⚑ Bonds, Prayer |
| **Shield** | Guard plates (self); Bonds Shield (E2); Sigil WARD; Outburst Shell, Inverse; Prayer Whisper of Protection | Chaplain I Ward; Mender III Brimming; Chaplain III Sanctuary (half damage) | Adamantile Plate; module Bastion | none | ⚑ Guard, Bonds, Sigils, Outbursts, Prayer |
| **Mark** | Shadow Tag (I1), Plant (I7); Prayer Deliver the Sinner (F5); the Analyze action | Operative I Mark; Operative Analyze (Class+) | Ghost Case File; module judgement_mark | Sinner's Due (reads Marked) | ⚑ Shadow, Prayer |
| **Lure** (foes go or shoot elsewhere) | Shadow Decoy (searchers go to the sound); Figments Glimmer, Double | Rigger I Double | none | Solid Image | ⚑ Shadow, Figments |
| **Summon a body** | Figments (every form) | Rigger III Scrap Turret | Siege Sentry Turret; Twinbound Twin; Warden Deploy Cover | none | Figments only |
| **Stealth** | Shadow Hidden, Fade, Go to Ground, Ghost Kill; Sigil VEIL (smoke); Outburst Silent module | Operative I Vanish | Shade Silent Kill | Vanishing Act; Long Dark | ⚑ Shadow, Sigils, Outbursts |
| **Trap** | Shadow Rig (I7); Figment Snare; Sigil STAY and WAIT; Outburst Fuse, Linger | Operative II Sabotage | none | none | ⚑ Shadow, Figments, Sigils, Outbursts |
| **Reveal** | Shadow Read Intent; Figment Stare; Bonds Feel Their Pain; the Analyze action | Operative Analyze | none | none | ⚑ Shadow, Figments, Bonds |
| **Area shape** | Sigils (Lines, fields); Outbursts (Wave, Burst, Aura, Lance, Linger); a Hymn's 3×3 | Sigilist III Payload; Chaplain III Sanctuary | Grand Sigilist Enlarge; Glyph Mason; Hellraiser Suppression; Inquisitor Strike Call | Earthbreaker | ⚑ Sigils, Outbursts, Prayer, Momentum (perk) |
| **Squad aura** | Outburst Aura form | Chaplain Canticle (Class+); Chaplain II Under the Eye | Banner Dancer Rally Banner | none | ⚑ Prayer, Outbursts |
| **Stop a death** | Guard Last Plate (D5); Bonds Last Thread | Bulwark II Unbroken; Mender II Take the Weight | none | Last Wall (Guard Mastered) | ⚑ Guard, Bonds |

**What the map says.**
1. Only **summon a body** has one owner. Every other outcome has two to six doors.
2. The two magic doors appear in 13 of the 20 rows. That is Leon's "everything else has to play catch-up", measured.
3. An exclusive-ownership rule would gut Sigils and Outbursts (Control school, BIND, PULL, VEIL, MEND, WARD, STAY). **So ownership must mean the outcome's best form, not its only source** (section 4.2).

---

## 3. Collisions

### 3a. Name clashes

| Proposed name | Already used by |
|---|---|
| Anchor | Bulwark III (classes.json:159); Outburst module `anchor` (soul_modules.json:1056) |
| Sanctuary | Chaplain III (classes.json:4478); a trait name |
| Bastion | Outburst `advanced` module `bastion` (soul_modules.json:1265), reserved for an advanced class |
| Juggernaut | Armour class 5 (rules.json:784); the End² roadmap slot (move-pool.md:108) |
| Mercy | Empathy 5's surrender move (skills.json:3637); a feeling (feelings.json:540); a patron tag and a vow (patrons.json:146, :333) |
| Spite | A feeling (feelings.json:316) |
| Ward | Chaplain I; a Figment form; a Sigil word; an Insight unlock (skills.json:4509). (Not proposed, but nearby) |
| Hand | A Figment form (figments.json:125) |
| Wire | No clash by name; by effect, the Operative's Sabotage |
| Also live, not proposed | Overclock (Brain Power 3 and Rigger II); Lunge (technique, 1 tile, and Breaker I, 2 tiles); Shove (action, technique and Breaker I); Double (Visualization 1 and Rigger I) |

### 3b. A fork that is an existing move, perk or advanced signature

| Fork | Same as | Layer whose job it takes |
|---|---|---|
| Guard 3 Bastion (plates cover allies beside and behind) | Close Guard (D1), widened; full cover is Adamantile Plate and the End² peak | Door duplicate, then peak |
| Guard 3 Reprisal (a breaking plate hits back) | Retort (D3); Answer in Kind (perk) | Door, perk |
| Guard 5 Anchor (cannot be moved; foes cannot walk away) | **Bulwark III Anchor, word for word** | Base class |
| Guard 5 Juggernaut (plates while moving; Slam charges a line) | The End² peak | Squared |
| Shadow 3 Knife (a kill from hiding returns you to hiding) | **Ghost Kill (Ingenuity 3), for everyone**; Shade's Silent Kill | Door, hybrid |
| Shadow 3 Wire (Rig, Plant, Disable early and cheaper) | Ingenuity 7's rung; Operative II Sabotage | Door, base class |
| Shadow 5 Smoke (make shade anywhere; allies hide in it) | Douse (I5), Sigil VEIL, Vanishing Act; squad stealth is a peak | Door, Sigils, squared |
| Shadow 5 Eyes (Tag spreads; squad hits Tagged harder) | Marked already gives the squad +to hit; Deliver the Sinner (F5); Sinner's Due; Ghost Case File | Prayer door, perk, squared |
| Bonds 3 Mercy (healing flows along every Bond at once) | Nearest to Outburst Thread module; area heal is Mender III Rally | Base class |
| Bonds 3 Spite (an enemy Bond shares more pain, no resist) | Threads; Taut Thread and Bitter Balm (perks) | Perks |
| Bonds 5 Knot (two Bonded allies share damage and healing) | Outburst module `thread` (heals link two allies); **Heartbinder's Share** | Outbursts, squared |
| Bonds 5 Leash (a Bonded foe cannot move away) | The hold: Anchor (Bulwark), Iron Grip; and the reshape's own Guard HOLD | Base class, perk, its own rule |
| Prayer 3 Voice (the Canticle stronger and wider) | The Canticle is a Chaplain Class+ move: **empty for anyone else** | Base class |
| Prayer 3 Hand (Smite and Rebuke stronger) | Smite is Chaplain I; Sinner's Due (perk) | Base class, perk |
| Prayer 5 Sanctuary (holy ground that heals and wards) | **Chaplain III Sanctuary** | Base class |
| Prayer 5 Witness (the patron steps in more and harder) | The Vir² peak (Saint); The Patron at Your Side (Chaplain Class+); Devotion 7's second intervention | Squared, base class |

Fourteen of sixteen fail. Two survive in a changed shape: **Guard 3 Reprisal** (as a change to Retort, not a new verb) and **Bonds 3 Mercy** (renamed, as split healing).

### 3c. A reshape line that removes what a class or advanced class is built on

| Reshape line | What it breaks |
|---|---|
| Guard owns HOLDING (Slam: adjacent foes Held, no push) | (1) There is no Held condition (conditions.json has `grappled`, `pinned`). (2) The hold is already the Bulwark's Anchor and Iron Grip's Grapple. (3) "Pushed" is read by Brace ("until you move, are pushed or are knocked Prone"), Anchor ("can't be pushed, pulled"), Heavy Hands (+1 tile to pushes). Slam keeps the readers working only if it still pushes |
| Momentum owns THROWING (Launch the only real shove; the Breaker's Shove dropped) | Dropping the Breaker's Shove is right (the action and technique Shove exist). "The only real shove" breaks Slam, Outburst Control's push and the Shove action. Leave those as plain pushes; Launch owns the *throw* (3 tiles, Prone) |
| Pressure owns PINNING at range | Pressure has one pin technique; Sigils (BIND), Outbursts (Control, Anchor), Figments (Snare), Momentum (Run Through) and a Hymn pin too. Pressure's own outcome is **suppression** (`suppressed`: less AP, no attacking reactions) |
| Shadow owns REMOVING one target; Decoy sends foes searching, no longer lures shots | **Decoy already only sends searchers** (shadow.json:607: "its searchers go there"). No change needed. "Removing one target" collides with Execution (Operative III), Coup (Breaker), Ghost's One Shot |
| Sigils own SHAPING AN AREA (heals and shields sit on tiles) | Outbursts have four shapes and Linger fields; Sanctuary and the Hymn 3×3 are areas. Sigils' best form is the **standing field** (STAY, WAIT, a Line left on the map), Outbursts' the **moment** (a shape from you) |
| Figments own BODIES THAT TAKE HITS (the Double is a lure; Wall's Press only into a trap) | Holds. Rigger's Scrap Turret (a non-Figment body) and Siege's Sentry Turret must move to Figments or go |
| Bonds own THE LINK (heal or shield at range only through a Bond; cleanses) | Breaks Sigil MEND and WARD, Outburst Buff, the Whisper of Health, Mother Ember's heal, Triage. Keep "sustained healing at range" as the Bonds' best form; others heal once |
| Outbursts own THE BURST (big, close, costs Strain) | Holds; the Buff school already scales with stage. Watch Guard's Second Wind (self only: fine) |
| Prayer owns THE SQUAD AURA AND DEATH (raises the Downed, stops a death, no plain healing) | (1) Raise is Bonds' (E3 Raise, Last Thread); stop-a-death is Guard's (Last Plate, Unbroken, Last Wall) and Bonds' (Take the Weight). Prayer has **neither** today except Last Rites as a heal multiplier. (2) "No plain healing" kills the Whisper of Health, Mother Ember's intervention heal and her "heal" like, and Last Rites |
| The monk's Palm staggers (loses its reaction) instead of pushing | No condition is "no reaction" alone; `suppressed` does it (plus −AP) but is Pressure's. Needs a ruling or a new condition |
| One taunt (Challenge; Draw Fire merged) | Fine; leaves Bulwark rank I one move short. The Figment order "Draw fire" should be renamed (it is a lure, not a taunt) |
| Take the Hit retired | Fine (Interpose and Close Guard cover it); Durability 3's fixed unlock needs a replacement |

**Also found (not proposed, same rule):**
- **Three copies of "a Finisher kill leaves Momentum"**: Follow Through (RP5), Keep Swinging (perk), and the Breaker's Finisher (III) restates the door's Finishers.
- **Base class repeats its door**: Speed Load (Dx3) and Speed Loader (Skirmisher I); Fire and Move (Class+) and Run and Gun (III); Fade (I5) and Vanish (Operative I); Touch (E1) and Triage (Mender I); Double (V1) and Double (Rigger I); Mark (Operative I), Tag and Plant.
- **Iron Grip** is a perk that gives a standing verb (Grapple). Under the rule a perk tunes. It can stay (live, measured) as the one exception, or Grapple moves to a Momentum technique and Iron Grip tunes it.
- **The Guard pool disagrees**: 5 in the Bulwark's text, `guard.max 4` in techniques.json:27 (reader 1; the 0.30 lane making the Bulwark's pool larger by rank should settle it).

### 3d. Forks at 3 and 5 land on a perk step

Mastery steps are at skill 3, 5, 7 and 9 (each a perk step). A fork at 3 and 5 puts two choices on one level-up card. Figments already does this (its forks are at 3 and 5), and it is the heaviest card in the game. **Forks belong at 4 and 6**: no perk step, and each shapes the verbs the rung below just opened (Guard's 3 opens Retort and Challenge, its 4 fork shapes them; its 5 opens Slam and Last Plate, its 6 fork shapes them). Skill 6 needs attribute 6, which a base class's rank II (attribute 5) is close to. Question 2.

---

## 4. The revised proposal

**A fork (the test):** it changes how the door's own verbs behave (a style). It gives no new verb, no outcome another door owns at its best form, does not reach the peak, and takes no class move's or perk's effect. Both options have the same ceiling. Picked once through `door/pick`, kept for good.

### 4.1 The four ladder doors

**Guard (Durability).** Its best form: **the soak and the draw** (blows come to your plates; foes come at you). Not the hold (that is the Bulwark's Anchor).

| Skill | Option A | Option B |
|---|---|---|
| 4 (shapes Retort, Close Guard, Challenge) | **Thorned** *(Suggested; was Reprisal)*: Retort needs no reaction, once a round per attacker, at its normal share. Melee only | **Shoulder to Shoulder** *(Suggested; was Bastion)*: Close Guard's share rises from 25% to 40% and covers diagonal allies |
| 6 (shapes Slam, Last Plate) | **Stand Fast** *(Suggested; was Anchor)*: Slam pushes nobody; each foe it puts Off Balance gives back 1 Guard | **Drive** *(Suggested; was Juggernaut)*: Slam pushes 1 tile more and you may step into the space you cleared without losing Guard |

- **Bulwark adds:** a bigger pool, Brace, Challenge's save waived on one foe (in place of Draw Fire), Unbroken, Anchor (the hold, from Braced).
- **Leaves room for:** End² (the full soak, plates across a line, ranged reflection); End+Vir (Adamantile: plates answered by the patron); End+Exp (Warden: plates on a Figment Wall).

**Shadow (Ingenuity).** Its best form: **the unseen strike on one target**.

| Skill | Option A | Option B |
|---|---|---|
| 4 (shapes Ghost Kill, Decoy, Lift) | **Cutthroat** *(Suggested; was Knife)*: a Ghost Kill gives back the Shadow its Break spent | **Ventriloquist** *(Suggested)*: Decoy reaches twice as far and its searchers stay a round longer |
| 6 (shapes Douse, Fade, Open Seam) | **Lightkiller** *(Suggested; was Smoke)*: Douse costs 1 Shadow less and reaches 2 tiles farther (your own dark, for you) | **Spotter** *(Suggested; was Eyes)*: you may hold two Tags, and a Tag lasts until its target falls. No squad damage bonus (Marked and Deliver the Sinner already give it) |

- Wire is dropped: Rig, Plant and Disable stay at Ingenuity 7; Sabotage stays the Operative's.
- **Operative adds:** Shadow at the start, a bigger cap, Vanish (re-pointed: Fade at 1 Shadow less, so not a second copy), Execution on a Marked foe.
- **Leaves room for:** Per² (Ghost: Hidden in plain view as a standing state, the Ghost Kill chain, One Shot); Per+Det (Shade: Outbursts from Hidden); Per+Exp (the trap-saboteur nobody claims: a Figment that springs).

**Bonds (Empathy).** Its best form: **sustained healing at range through the link**.

| Skill | Option A | Option B |
|---|---|---|
| 4 (shapes Mend, Snap) | **Overflow** *(Suggested; was Mercy)*: a Mend on one Bonded unit is split among every Bond you hold (split, not copied) | **Keep the Thread** *(Suggested; was Spite)*: Snap no longer breaks the Bond, at three-quarters of its effect |
| 6 (shapes Tug, Shield, the second Bond) | **Long Thread** *(Suggested)*: Bond reach +3 tiles; Tug pulls 1 tile more | **Short Thread** *(Suggested)*: a Bond within 2 tiles gives Threads at double effect |

- Knot and Leash are dropped (Heartbinder's Share; the hold).
- **Mender adds:** a free Bond each turn, +1 Bond, Triage (re-pointed: Touch at a lower price, flagged as a repeat), Take the Weight, Brimming, Rally.
- **Leaves room for:** Ins² (Heartbinder: cast from a Bonded tile, share damage); Ins+Agi (Banner Dancer, re-pointed from Momentum to pips); Ins+Int (a Bond that carries a Line, section 5).

**Prayer (Faith).** Its best form: **the patron's eye on the squad** (Witnessed, the Canticle's verses, the intervention). Small heals stay (the Whisper of Health, Mother Ember).

| Skill | Option A | Option B |
|---|---|---|
| 4 (shapes Hymns, opened at 3) | **Chorus** *(Suggested; was Voice)*: a helpful Hymn also reaches allies within 2 of its target, at 70% power | **Steadfast** *(Suggested; was Hand)*: a Whisper lasts 1 round longer |
| 6 (shapes Witnessed, opened at 5) | **Herald** *(Suggested; was Sanctuary)*: a Whisper can also make you Witnessed (not only a Hymn or Miracle) | **Martyr's Eye** *(Suggested; was Witness)*: you become Witnessed when you first drop below half HP in a fight |

- Sanctuary and Witness are dropped (Chaplain III; the Vir² peak). Interventions per fight are untouched below the squared class.
- **Chaplain adds:** the Canticle, The Patron at Your Side, Amen, Holy Dread, Last Rites, Ward, Smite, Under the Eye, Blessed Arms, Sanctuary, Verdict.
- **Leaves room for:** Vir² (Saint, currently empty: standing Witnessed, interventions on call, a second Miracle); End+Vir (Adamantile); Per+Vir (Inquisitor: the patron strikes the Tagged).

### 4.2 The reshape, revised

The rule becomes: **each door owns its outcome's best form** (the cheapest, surest and strongest version, with the door's own rider). Other doors may make that outcome only through their own medium: a magic price (Flux, Strain, MP), a save, a setup, an area. No door is forbidden an outcome. Distinctness is in the rider.

| Line | Verdict | Re-pointing |
|---|---|---|
| Guard owns holding (Slam: Held) | **Change.** Guard owns the soak and the draw. Slam keeps its push (Brace, Anchor and Heavy Hands read "pushed"); the Stand Fast fork is the no-push option | Anchor (Bulwark III) stays the one hold for this door |
| Momentum owns throwing | **Keep, narrowed**: Launch is the only *throw* (3 tiles, Prone); plain pushes stay (Slam, the Shove action, Outburst Control) | Breaker I Shove dropped; its slot gets a Momentum economy move *(Suggested: Wind-up, start each fight with 1 Momentum)* |
| Pressure owns pinning | **Change**: Pressure owns **suppression** (pips, Suppressed, Afraid, Rout). Pinned stays a shared condition | None |
| Shadow owns removing one target; Decoy searches | **Keep**; Decoy already searches (no change). Execution, Coup and One Shot stay as they are: three layers (class, class, squared) | None |
| Sigils own the area | **Change**: Sigils own the **standing field** (a Line left on the map, STAY, WAIT); Outbursts own the **moment** (a shape from you) | Sigil heals and shields stay as they are (they already sit on tiles) |
| Figments own bodies | **Keep** | Rigger III Scrap Turret becomes a Figment form or a Figment order; Siege's Sentry Turret goes to the Warden as a Figment (End+Exp) |
| Bonds own the link | **Change**: Bonds own **sustained healing at range** (re-targetable, every turn, cheap); others heal once at a price | Triage re-pointed (flagged repeat) |
| Outbursts own the burst | **Keep** | None |
| Prayer owns the aura and death; no plain healing | **Change**: Prayer owns **the squad aura and the patron's eye**. Plain small heals stay. Stop-a-death stays with Guard (self) and Bonds (others) | Last Rites stays (a heal multiplier on the Downed) |
| Palm staggers | **Keep, if** a "no reactions" condition is approved (primitive list) | Iron Grip's "loses its reactions" reads the same condition |
| One taunt | **Keep** | Draw Fire merged into Challenge; Bulwark I gets "Challenge with no save on one foe". The Figment order "Draw fire" is renamed *Bait (Suggested)* |
| Take the Hit retired | **Keep** | Durability 3's fixed unlock is left empty: Retort and Challenge already land at 3 |

### 4.3 The five doors that already choose

| Door | Its choices | Its class | Obeys the rule? |
|---|---|---|---|
| Momentum | Finishers by weapon home; perks | Breaker: Charge Carries, Four Ways to Finish, Launch, Wrecker, Breach (Class+); Lunge, Shove, Riposte, Lingering Dread, Finisher, Unstoppable | **Partly.** Shove, Lunge and Finisher repeat the door (names and effects). Lingering Dread (fear) is Shade's old move: a second door's outcome. Fix: drop Shove, rename Lunge, make Finisher a rider on the door's Finishers |
| Pressure | Press, Take and Watch groups | Skirmisher: Reflex, Fire and Move, Relocated, Break Them; Fire Discipline, Speed Loader, Special Ammo, Duck and Roll, Killzone, Run and Gun | **Partly.** Speed Loader and Run and Gun repeat Speed Load and Fire and Move |
| Sigils | Words studied; Overclock, Twin Draw | Sigilist: economy and size | **Yes**; watch Payload against Enlarge (question 3) |
| Figments | Fork at 3 and 5 (order of access) | Rigger: +1 held, +1 design; Double, Field Fix, Salvage, Overclock, Sleight, Scrap Turret | **Partly.** Double repeats V1; Overclock repeats a name; Sleight (swap) is also Outburst Control; Scrap Turret is a non-Figment body |
| Outbursts | Modules, tones, feelings by practice | Channeler: economy, reach, Strain | **Yes** except Heart Surge past stage 4 (question 4) |

---

## 5. What this means for the 21 advanced classes

**Rule:** a squared class (A + A) is a door's peak. A hybrid (cross-core A + B) connects door A and door B: a verb of one carries the other's outcome, through the faction's special focus.

### 5.1 Each shelved class against its pair's doors

| Class (pair) | Doors | Job now | Verdict |
|---|---|---|---|
| Juggernaut slot (End²) | Guard peak | The full soak | **Clear**; rename (armour class 5 is Juggernaut) |
| Berserker slot (Str²) | Momentum peak | The unbroken chain | **Clear**; drop the borrowed Sweep and Empty Hand |
| Gunslinger (Agi²) | Pressure peak | Pips on a fan; the Draw | **Clear** once Six for Six lays pips |
| Ghost (Per²) | Shadow peak | Hidden in view, the chain, One Shot | **Clear** |
| Grand Sigilist (Int²) | Sigils peak | Line of 5, Enlarge, the grand staff | **Clear**; Empty Hand goes to the Open Hand gloves |
| Mirage (Exp²) | Figments peak | Gambling Sigils is Sigils, not Figments | **No job as Exp².** Move to Int+Exp (Sigils × Figments); Exp² needs a new Figments peak |
| Heartbinder (Ins²) | Bonds peak | Through, Share, Link | **Clear** |
| Heartfed (Det²) | Outbursts peak | Overflow, Four Hearts, same school twice | **Clear** |
| Saint (Vir²) | Prayer peak | Its moves went to the Chaplain | **Job clear, moves empty**: write the patron-walks-with-you peak |
| Blade Scribe (Str+Int) | Momentum × Sigils | A cut draws a glyph | **Clear** (worked example 1) |
| Storm Hand (Str+Det) | Momentum × Outbursts | Blows Pump the heart | **Clear** |
| Spellslinger (Agi+Int) | Pressure × Sigils | Inscribed rounds lay pips and glyphs | **Clear** |
| Banner Dancer (Agi+Ins) | Pressure × Bonds | Rally Banner; Sweep spends Momentum (wrong door) | **Re-point** Sweep to pips: allies Bonded to you shed Pressure as you pass |
| Adamantile Knight (End+Vir) | Guard × Prayer | Plate lost becomes ally shield (a Guard × Bonds idea) | **Re-point**: a plate that breaks is Witnessed; Brace on holy ground |
| Warden (End+Exp) | Guard × Figments | Cover, turret, Seal | **Re-point**: a Figment Wall that holds your plates |
| Shade (Per+Det) | Shadow × Outbursts | Silent Kill = Ghost Kill (I3) | **Re-point** (worked example 2) |
| Inquisitor (Per+Vir) | Shadow × Prayer | Supply Drop, Strike Call, Extraction fit neither door | **No job as written**; new: the patron strikes the Tagged |
| Hexer slot (Exp+Ins) | Figments × Bonds | Dread, Mind Fog, Puppet (Puppet = Hijack, I9) | **No job as written**; new: a Bond on a Figment |
| Hellraiser Heavy (Agi+Vir) | Pressure × Prayer | Emplace, Suppression: Pressure only | **Half a job**; add the prayer side or move to Agi² |
| Glyph Mason (Int+End) | Sigils × Guard | Keystone, Survey, Foundation | **Re-point**: a glyph on your tile holds plates |
| Circuit Mage (Int+Ins) | Sigils × Bonds | Its moves are Sigils × Outbursts | **Move to Int+Det**; Int+Ins needs a new class |
| Devoted (Det+Exp) | Outbursts × Figments | Loved spells: Outbursts only | **No job as a hybrid**; shares Det+Exp with Twinbound. Fold into Heartfed |
| Vessel (Det+End) | Outbursts × Guard | Body forms held like Outbursts | **Re-point**: Pump into plates |
| Twinbound (Det+Exp) | Outbursts × Figments | A Twin with Outbursts | **Clear** (worked example 3) |

**Summary:** 13 clear (2 need a rename or a cut), 7 re-point, 4 have no job as written (Mirage as Exp², Inquisitor, Hexer, Devoted). Circuit Mage moves pair. Unclaimed and natural: **Per+Exp** (traps that are images: the trap-saboteur nobody claims), **Int+Ins** (a Line carried along a Bond), **End+Ins** (plates along a Bond), **Str+Vir** (Momentum spent as a Hymn).

### 5.2 Three worked examples

**1. Blade Scribe (Str + Int; southern sects; focus: the Evoker blade, weapons.json:3407).**
Connection: each melee hit with the blade draws one glyph on the *target's* tile (the door's rule is your own tile). A Finisher at ×N Evokes the Line your last N cuts drew.
- Momentum's counter sets the Line's length; Sigils' words set what it does.
- Neither door is raised past its class: the Line is still 2–4, the counter still ×5.
- Built from: `door/pick` none; the Sigil draw site with a new "draw on" target; the Finisher technique; Momentum.

**2. Shade (Per + Det; Smetanita Conjunction; focus: a Smetanita Emanator *(Suggested: the veil-glove)*).**
Connection: an Outburst Begun while Hidden is held unseen (the Silent module, built in); a Release that kills keeps you Hidden (this is Ghost Kill extended to Outbursts, which Ingenuity 3 does not cover); Nightmare Mark is a Tag that leaves a Fear feeling's residue on the Tagged.
- Silent Kill is dropped (it was Ghost Kill).
- Built from: Hidden, Tag, the Silent module, feelings' residue.

**3. Twinbound (Det + Exp; Arkvelton; focus: an Arkvelton Emanator that counts as a Visualizer *(Suggested)*).**
Connection: the Twin is a Figment form that holds one of your Outbursts and Pumps it on its own place in the order; you Release it from the Twin's tile.
- Figments give the body; Outbursts give the heart. The Twin does not take its own full turn (that is the Exp² peak).
- Built from: a Figment form (figments.json), Begin/Pump/Release, the focus `counts_as`.

---

## 6. Engine

### Built from (existing)

| Rule | Primitive |
|---|---|
| A fork pick, kept for good | `door/pick`, `registerDoorPicks`, `Character.doorPicks` (doorpicks.ts) |
| A fork gated on skill points | predicate `self_skill` |
| Thorned (Retort without the reaction) | Retort's effect row; the Answer's reaction cost in data |
| Shoulder to Shoulder (share 40%, diagonals) | Close Guard's `share` and reach in data |
| Stand Fast, Drive | Slam's effect rows (`off_balance`, push tiles), Guard as a resource |
| Cutthroat, Ventriloquist, Lightkiller, Spotter | shadow.json verb rows: `res.shadow`, reach, Tag's limit |
| Overflow, Keep the Thread, Long Thread, Short Thread | tending.json rows: Mend's targets, Snap's end, Bond reach, Threads' amount |
| Chorus, Steadfast, Herald, Martyr's Eye | Hymn targets; Whisper duration; `witnessed` condition applied by an op on a trigger |
| Draw Fire merged into Challenge | `taunted`, Challenge's save |
| Launch the only throw | Launch, Prone |

### Needs a new primitive (list only)

1. **A general data-driven door fork registration**: a door's ladder row carries `fork: {id, of}` and the registration reads it (today each door registers in its own code, as figments.ts does).
2. **Predicate `door_pick`** (`{door, option}`): an effect row applies only if the holder took that option. Without it, every fork needs code.
3. **A "no reactions" condition** (*Staggered, Suggested*) for the Palm and Iron Grip, unless Leon rules that `suppressed` serves.
4. **"Draw on another tile"** for a hybrid's glyph (Blade Scribe), when advanced classes return.
5. **Witnessed from a trigger** (a hit-point threshold) for Martyr's Eye, if no trigger "dropped below half HP" exists in ENGINE-HOOKS.md (the 35 triggers were not checked one by one).

---

## 7. Leon's questions

1. **Ownership:** a door owns an outcome's *best form* (others may make it at their own price), or its *only* form (and the magic doors lose push, pull, pin and smoke)?
2. **Fork placement:** forks at skill 4 and 6 (no perk step on the same card), or at 3 and 5 beside the perk step (as Figments does now)?
3. **Payload (Sigilist III, double area):** keep it and give Grand Sigilist a different peak (a Line of 5, any tile), or cut Payload back so Enlarge is the only big area?
4. **Heart Surge (Channeler III) reads past stage 4:** keep it (it is live) and give Heartfed only the same-school-twice and Overflow, or cap Heart Surge at stage 4?
5. **The Mastered perk is a once-a-fight glimpse of the door's peak:** adopt this as the rule, or keep Mastered perks free of the peak?
6. **Prayer and healing:** keep the small heals (the Whisper of Health, Mother Ember), or remove plain healing from Prayer?
7. **Stop a death:** stays with Guard (self) and Bonds (others), or moves to Prayer?
8. **Iron Grip gives a standing verb (Grapple):** leave it as the one exception, or move Grapple to a Momentum technique and let Iron Grip tune it?
9. **The four classes with no job** (Mirage as Exp², Inquisitor, Hexer, Devoted): re-write each for its pair, or drop them and fill the open pairs (Per+Exp, Int+Ins, End+Ins, Str+Vir)?
10. **Circuit Mage:** move it to Int+Det (where its Sigils × Outbursts moves belong), or rewrite it as Sigils × Bonds?
