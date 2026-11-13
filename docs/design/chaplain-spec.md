# The Chaplain (Virtue; was the Guardian): special prayers, Smite, the patron at its side (spec, 13 Nov 2026)

A spec for Class Roster Revision 4 (`class-roster-rev4-proposal.md` section 4.9). **Nothing here is built.** It is built
in the one big patch (`rev4-moves-and-rename.md` section 3). Every number is PROVISIONAL and gets a spec section 14 item
when it is written into `docs/rules/PHC-Core-Rules-v1.0.md`. The class id stays `guardian`; the display name becomes
**Chaplain** *(Suggested)*.

## 1. The fantasy and the loop

Anyone with Faith 3 prays; the Chaplain is the one the god walks beside. It says two prayers nobody else can say (Ward,
Sanctuary), it hits with the god in its weapon (Smite), and while it is Witnessed its patron stands on its tile as a
presence that keeps watching after it first acts. Its only pool is Devotion and the wait: no MP, no Strain, no cores.

**Two turns** (level 6, Faith 6, Virtue 6, Blessing power ×1.6, Devotion 6, Old Overcast, a service rifle, 6 AP):

| Turn | Action | AP left | What the engine does |
| --- | --- | --- | --- |
| 1 | Hymn: Thunderclap (3 AP) | 3 | Hymn wait starts: 9 − 4.5 − 1.5 = 3 rounds; Faith 5+: **Witnessed**; the patron's figure appears on the Chaplain's tile |
| 1 | Shot at the drill sergeant (2 AP), hits | 1 | **Smite**: +20 × 1.6 = 32 Soul, no roll, no armour; the sergeant is **Judged** (section 2, rule 9) |
| 1 | Whisper: **Ward** on the medic (1 AP) | 0 | shield 7 × 1.6 × 1.506 × 1.13 = 19 for the fight; Wards held 1 of 2 |
| 2 | Shot (2 AP), misses; shot (2 AP), hits and kills the sergeant | 2 | no Smite on the kill (no living target); Old Overcast intervenes: (20 + 4 × 6) × 1.6 = 70 lightning to the Judged enemy, else the nearest; **Witnessed stays** (the first intervention of a fight) |
| 2 | Whisper: Rebuke (1 AP) | 1 | 32 Soul to the next enemy |

## 2. Rules

| # | Rule | Adj. |
| --- | --- | --- |
| 1 | **The door is unchanged** (rules 1.6 to 1.22, 1.6.3): anyone with Faith 3 prays; one Whisper a turn (1 AP); a Hymn (3 AP) then the wait of rules 1.22 (9 − 0.75 × Faith − 0.25 × Virtue, at least 3; a vow fulfilled −1, never under 2); Devotion 0 to 10 and its XP; Witnessed at Faith 5 until the fight ends or an intervention; interventions once a fight, twice from Devotion 7, 20 + 4 × Devotion × Blessing power; the Miracle at Faith 7 and Devotion 10. Nothing in this spec changes what a non-Chaplain has. | engine |
| 2 | **The wait is the same as everyone's** (Leon's ruling 8). The class has no Hymn cut and no extra Whisper. | engine |
| 3 | **Ward** is a Whisper only the Chaplain can say (rank I). It **uses the turn's one Whisper**. 1 AP, an ally you can see (not yourself), no roll for the Faithful (an Atheist: the Whisper TN, 12). The ally gains a shield of 7 × Blessing power, through the prayer heal dial and the level (as Protection), for the rest of the fight. | engine |
| 4 | **Wards held:** at most 2 allies carry a Ward of yours at once; a third Ward ends the oldest's remainder. A Ward on an ally who has one tops it up to the new value (never stacks with itself). A Ward **stacks on top** of any other shield (it is its own layer, spent first). | engine |
| 5 | **Sanctuary** is a Hymn only the Chaplain can say (rank III). 3 AP, starts the one Hymn wait (it is the Hymn of that wait: no patron Hymn until it ends). A tile you can see within 6: allies on its 3×3 (you too) take half damage until the start of your next turn. The zone prevents at most 11 × Blessing power × heal dial × level in all, then ends. Your own Strain burn is not halved (you have none: rule 8). A successful Sanctuary makes the Faithful Witnessed (it is a Hymn of their own patron's door). | engine |
| 6 | **Smite** (rank I): once a turn, on your own turn, when your weapon attack hits a living enemy that is not Downed or surrendered, the patron also deals 20 × Blessing power Soul damage to it (no roll, armour does not lower it). It is not multiplied by the attack's technique, critical, Judgement or ammunition. If the hit kills, Smite is not spent and may ride a later hit that turn. Not on a reaction or an opportunity attack (rule 2.1.4 of Revision 4: a reaction is a plain attack). | engine |
| 7 | **Smite is a prayer** for everything that counts prayers: its kill is a kill by prayer (the No Magic but Theirs vow, Witnessed's kill edge), its damage carries the patron's element tag (Soul; Old Overcast: lightning, so `storm`). It is **not** a Whisper and uses no prayer limit. For a patron whose taboo is `kill` (the Toll-Keeper, the Matchmaker), Smite never drops a target below 1 HP. An Atheist Chaplain's Smite rolls the Whisper TN (12) on each hit it would ride; a failed roll leaves it unspent. | engine |
| 8 | **No MP and no Strain.** No class move costs MP, Strain, cores or ammo of its own; Judgement keeps its Devotion XP cost (it is the class's pool). | engine |
| 9 | **Judged:** an enemy hit by the Chaplain's weapon on its own turn carries the condition Judged (1 round, no save, the Chaplain's). It is how "where the weapon struck" is known. | engine |
| 10 | **The patron at its side** (Faithful only): while the Chaplain is Witnessed its patron's figure stands on its tile as a **presence**: not a unit, never targeted, blocks nothing, sees nothing, moves with the Chaplain. It ends when Witnessed ends. | engine |
| 11 | **The first intervention of a fight does not end Witnessed** for a Chaplain. The second (Devotion 7+) does. The intervention count is the door's (once, twice from Devotion 7). | engine |
| 12 | **Interventions land where the weapon struck:** a damage intervention that picks a target picks a Judged enemy of the Chaplain's first, else the door's own rule. The presence also widens each patron's trigger (section 3.2). The presence never adds an intervention. | engine |

**Edge cases.** *Fog and sight:* Ward and Sanctuary need sight of the ally or tile (`fog.ts` `unitSees`); Smite needs
none beyond the hit. *Hidden:* Smite reveals nothing more than the attack did. *Forced movement:* a Sanctuary zone stays
on its tiles; a Ward moves with its ally; the presence moves with the Chaplain (it is drawn, not placed). *Reactions:*
none of this is a reaction. *A Downed Chaplain:* Wards and the zone stay; Witnessed stays (as today) and the figure
dims; a dead one ends all three. *Co-op:* each Chaplain counts its own Wards held;
two Sanctuaries overlap without stacking (one halving). *Saves mid-fight:* Wards are shields (`u.shield` and a Ward layer
on the unit), the zone is a `cb.zones` entry, Judged a condition: all already saved. *Fight end:* Wards, zone, Judged
and the presence end; Witnessed ends as today.

## 3. The list

### 3.1 The six moves (Revision 4 section 4.9)

| Rank | id (kept or new) | Move | Cost | What it does | Data |
| --- | --- | --- | --- | --- | --- |
| I | `guardian.ward` (new; replaces `guardian.will_shield`) | **Ward** | 1 AP, the turn's Whisper | ally shield 7 × Blessing power (heal dial, level) for the fight; 2 held | `classes.json` move, `amounts.ward` |
| I | `guardian.smite` (new; replaces `command`) | **Smite** | 0 AP, once a turn | +20 × Blessing power Soul on a weapon hit; a prayer for tags and vows | `amounts.smite`, one `deal` op |
| II | `lumeri_templar.under_the_eye` (kept) | Under the Eye | passive | while Witnessed, allies within 3 get +2 to hit | as built (hybrid: its story half) |
| II | `lumeri_templar.blessed_shells` (kept) | Blessed Shells | 0 AP | load a landed Hymn into the weapon; the next hit releases it (a Smite may ride the same hit) | as built (hybrid) |
| III | `guardian.sanctuary` (reworked) | **Sanctuary** | 3 AP, the Hymn and its wait | 3×3, allies take half damage until your next turn, at most 11 × BP × dial × level prevented | `amounts.sanctuary_cap` |
| III | `lumeri_templar.judgement` (kept) | Judgement | 4 AP, 10 Devotion XP, once a fight | one melee or scattergun attack × (1 + Blessing power) | as built |

The class's "better" (Revision 4 section 2): **a bigger meter:** none (Devotion is a standing, not a pool to enlarge;
the class instead keeps Witnessed through the first intervention, rule 11); **one thing a turn free:** Smite (a prayer's
damage for 0 AP); **six moves:** above.

### 3.2 The presence, patron by patron (rule 12; each widens the door's own intervention, same count)

| Patron | Door's intervention (rules 1.6.3) | With the presence | Built from |
| --- | --- | --- | --- |
| Holy Father Nerukhan (judge, mercy, protect) | an enemy harms the helpless: it takes (20 + 4 × Dev) × BP Soul | also when a Judged enemy damages an ally at a quarter HP or less | trigger `damaged`, `if: {actor_has: [judged], target_hp_below: 0.25}` |
| The Quartermaster (supply, hold, protect) | your reload is free; a dry core or empty MP refilled | also a reload by an ally next to you is free | trigger `reload`, `if: {actor_within: 1}` |
| The Laughing Mask (trick, burn, flee) | an enemy misses you: it falls Prone | also when it misses an ally next to you | trigger `miss`, `if: {target_within: 1}` |
| The Toll-Keeper (mercy, heal, hold) | an ally would drop to 0: stays at 1 HP | the ally kept up also gains your Ward (7 × BP) | `floor` then `mend` with `amounts.ward` |
| Mother Ember (heal, protect, supply) | an ally below a quarter: heals (10 + 3 × Dev) × BP | fires below half instead of a quarter | trigger `damaged`, `if: {target_hp_below: 0.5}` |
| Old Overcast (storm, kill, hold) | you kill: (20 + 4 × Dev) × BP lightning to the nearest other enemy | to a Judged enemy first (rule 12); Smite is lightning | the intervention's target selector |
| The Matchmaker (protect, mercy, heal) | an ally next to you is hit: half moves to you | an ally within 2 | `if: {target_within: 2}` |
| The Counting Weaver (hold, trick, judge) | an enemy crits you: a normal hit | also a crit on an ally next to you | trigger `attack_roll`, `if: {crit: true, target_within: 1}` |

## 4. The ladder

Faith 1 to 10 is the door's ladder, unchanged (rules 1.6, 1.22): 3 prays, 5 Witnessed, 7 the Miracle (with Devotion 10);
each point lowers the Hymn wait by 0.75 and raises Blessing power by 0.06 × 0.956. Conscience: +10% shields received
(rules 1.13; it reaches Ward). Authority: its Call, Order (no class move). Gear gates: none (any weapon carries Smite;
Judgement needs a melee weapon or a scattergun, as built).

## 5. The class

**Squared, the Saint, breaks:** "a Hymn makes you wait." Its first Hymn each fight starts no wait. **Bridges:**
Adamantile Knight (Guard + Blessings): Guard that soaks a hit becomes a Ward on the nearest ally, a prayer refills 1 Guard;
Inquisitor (Shadow + Blessings): a Marked enemy is Judged by your patron, so the presence's widening reaches it unseen.

## 6. On what exists

**Built from** (verified by grep on 13 Nov 2026; no bespoke handler where a primitive exists):

| Rule or move | The primitive that carries it |
| --- | --- |
| Whisper limit, Hymn wait (rules 1, 2, 3, 5) | `faith.ts` `combatPray` → `prayed(...).take('per_turn', 1, WHISPER_KEY)` / `.cool(..., HYMN_KEY)`, i.e. `effects/uses.ts`; `hymnWait` |
| Atheist rolls (rules 3, 7) | `previewPrayer` → `rollVs` (`rolls.ts`), `patrons.json prayer.atheist_tn` |
| Ward's amount | an `amounts` block, `profile: "blessing_mend"`, `level: "mend"` (`effects/output.ts`; the same path as `prayerAmount('shield', …)`); the shield sink `grantShield` (`effects/damage.ts`) |
| Smite (rule 6) | item op `deal` (`effects/triggers.ts`), `when: "hit"`, `if: {own_turn: true, hostile: true, mode: [...]}`, `limit: {per: "per_turn", n: 1}`, amount `profile: "blessing"` (Blessing power is that profile's Stat term) |
| Smite only on a living, standing target | predicate `target_lacks: [downed]` and the `open` predicate |
| Judged (rule 9) | a row in `data/conditions.json`; op `condition` with `skip_save`, `when: "hit"` |
| Sanctuary's zone | `cb.zones` (`magic.ts` `Zone`, the shape the old `guardian.sanctuary` already uses), tiles from `kit.ts` `tilesAround(t, 1)` |
| Sanctuary's halving | op `damage_mult` on trigger `taking` (needs `in_zone`: below) |
| Sanctuary's cap, Wards held | `uses(h).take('per_combat', n, key)` counts; a Ward layer is a second shield field (below) |
| Witnessed, its end | `applyCond` / `endCond`, the `witnessed` row; `intervene()` in `faith.ts` |
| Rule 11 | a stat id `intervention_keeps_witnessed` in `STATS` (`effects/stats.ts`), asked with `statQuery` in `intervene()`, answered by a data `stat_mod` on the class |
| The presence's widenings (3.2) | the patrons' `intervention.triggers` lists (`patrons.json`) read by `intervening()`; predicates `actor_has`, `target_within`, `actor_within`, `target_hp_below`, `crit` |
| Old Overcast's target | the intervention's `target` word in data (`nearest_other_enemy` today) |
| The figure on screen | the Miracle cut-in's portrait (`apps/web/src/game/cutIn.ts`, `faithArt.ts` `patronPortrait`), fed by the `witnessed` fx event `faith.ts` already emits |
| Log lines | `say`; the patron's lines `speak` (`patronLine`) |
| Hover cards | the one card (`perkcard.ts` / `glossary.ts`), texts with `{=placeholders}` |

**Needs a new primitive** (each one general, for the closed lists):

1. **`prayer` on `grant_action`** (`effects/actions.ts`): `{"op": "grant_action", "action": "ward", "prayer": "whisper"}`
   routes a class or item action through `combatPray`'s door (the Whisper slot or the Hymn wait, the Atheist roll, the
   mana −5, Witnessed after a Hymn, the faith fx) and then runs its effects by the default runner, under a new trigger
   `on_use` (the action was used; target: its pick). Reused by the Saint,
   the Adamantile Knight and faith items. Ward and Sanctuary are then data; no new `case` in `runEntryInner`.
2. **Predicate `in_zone`** (`effects/triggers.ts`): `{"in_zone": "<zone kind>"}`: the event's target stands on a live
   zone of the holder's of that kind. Reused by Sigil fields, Figments' Wall, the Bulwark. Replaces the old Sanctuary's
   own `damage_in` handler (`classes/i.ts` `guardian.sanctuary`), which is deleted.
3. **`src` fields on `deal`**: `"via": "faith"` (kill credit, tags and vows read it as `viaOf`) and `"nonlethal": true`
   (the `applyDamage` src flag that exists). Reused by every bridge that deals one system's damage through another.
4. **Shield layers** in `grantShield`: a `layer` key (`"ward"`) kept apart from `u.shield` and spent first, so a Ward
   stacks with Protection, and `layer_holders`: at most N units carry one giver's layer (a new one ends the oldest). Reused by the Bulwark's Guard-as-shield bridge.
5. **Predicate `patron`** (`words`): the holder's patron is one of these. Lets the class's presence rows sit on the class.

**Removed:** `guardian.will_shield` (MP, Strain), `command` (to Authority's Call, Order), the old Sanctuary's Soul-cast
cost and its story action (out of a fight Sanctuary is the Narrator's: hybrid, the old `sanctuary_story` text kept,
no MP). **Migration:** the id `guardian` stays; moves are read from ranks, so a Guardian's character gets the new moves
on load with no save change (`migrateCharacterClass` only acts on a `classRev` change).

## 7. Balance

**The arithmetic** (an estimate, not a measurement). Rifle-turn: 69.7 / 91.8 / 101.7 / 110.9 at levels 1 / 5 / 10 / 20
(`faith-fit.md` section 3; 5 and 10 interpolated). Blessing power: normal 1.3 / 1.55 / 1.83 / 2.0, all in 1.7 / 1.85 /
2.0 / 2.0. Smite = Rebuke = 20 × BP: all in 34 / 37 / 40 / 40 = **49 / 40 / 39 / 36%** of a rifle-turn on a hit.

**A Chaplain's weapon turn with Smite** = the turn's Whisper (Rebuke) + 2 shots (4 AP) + Smite × P(at least one hit):

| Sheet (all in) | Level 1 | 5 | 10 | 20 | Mean |
| --- | --- | --- | --- | --- | --- |
| Door, the contract's Faith build (Dex 0), Whisper turn, measured | 98 | 71 | 57 | 98 | 81 (ceiling 80) |
| Chaplain, the same sheet: + Smite × P 0.73 / 0.51 / 0.33 / 0.85 | 134 | 91 | 70 | 129 | 106 |
| Door, Faith all in + Dexterity (shots 0.9 of the rifleman's: 60) | 109 | 100 | 99 | 96 | 101 |
| **Chaplain, Faith all in + Dexterity** (+ Smite × P 0.84) | **150** | **134** | **132** | **126** | **136** |
| Chaplain, normal share (Rebuke 37 / 34 / 36 / 36 + shots 53 + Smite × 0.8) | 120 | 114 | 118 | 118 | 118 |

**Recommended line:** a new ceiling `balance.ceilings.chaplain_turn`, **125 all in** (normal 100): the plain rifle all
in. A Chaplain with the god in its gun hits like a gunner who put everything in the gun, never more. Smite at Rebuke's
full 20 puts the weapon-built Chaplain at 136 (+9%, inside the ±12% band; level 1 +20%, inside ±25%), so **Leon's number
stands**; the dial is `amounts.smite.base` (cut to 15 if the measured mean passes 140: then 127). Measured on the Faith
+ Dexterity sheet, because Smite needs a hit: the Dex-0 Faith build is not a Smite build (it reads 106, −15%).
**How far above the door:** +35% over a door user with the same sheet (101 → 136), against the 15% of the budget: Leon's
ruling ("Smite makes up for their offensive capability"); recorded as this class's exception.

**Contract finding:** the Whisper-turn ceiling (80) holds only for the measured Faith build with Dexterity 0. A legal
Faith 7 / Dexterity 3 sheet already sits at about 101 with no class (row 3), because since rules 1.26 the rifle hits as
hard in anyone's hands. Re-measure `whisper_turn` on that sheet (open question 4).

**Ward against rules 1.27** (a heal or shield turn all in ≤ 200 Soldier-turns × 100; a shield ×1.2 the heal):

| Ward, all in, % of a Soldier-turn (18.5 / 24.1 / 34.2 / 60.2) | Level 1 | 5 | 10 | 20 |
| --- | --- | --- | --- | --- |
| The draft: 30 × BP (dial 1.506, level 1.0 / 1.10 / 1.28 / 1.82) | 415 | 382 | 338 | 273 |
| The draft, raw (no dial, no level) | 276 | 230 | 175 | 66 |
| **Ward 7 × BP** (dial and level, as Protection) | **97** | **89** | **79** | **64** |
| Protection 6 × BP, for comparison (the door's Whisper) | 83 | 76 | 68 | 55 |

The draft's 30 is a whole healer's turn and more in 1 AP: **out**. Ward 7 is Protection +17% (the class's 15%), and in
rifle terms (× 125/200) 61 / 56 / 49 / 40%: level with Rebuke, so a Ward turn and a Rebuke turn are worth the same.
**What stops free Ward every turn:** it is the turn's Whisper (no Rebuke, no Health), two held at most, and it never
stacks with itself. No Devotion cost (Devotion is standing; spending it would punish devotion).

**Sanctuary** (a Hymn turn's heal-and-shield cap is 250): expected prevented damage, 2.4 of 4 allies inside, 4 Soldiers
firing, half: 1.2 Soldier-turns = **120**; with the turn's Ward 97: 217 ≤ 250. Against a Boss and 3 Soldiers: 180 + 97 =
277, over; hence the cap of 11 × BP × dial × level (28 HP all in at level 1 = 153%): 153 + 97 = 250.

**The presence:** rule 11 changes nothing below Devotion 7 except keeping Witnessed (Under the Eye's +2 for allies within
3 runs on: watch it); from Devotion 7 the second intervention needs no second Hymn: about one rifle-turn once a fight,
+5 to +10% on a fight's average. Inside the band.

**Measure when built:** `refit-measure.ts` rows `chaplain_turn` (Faith all in + Dexterity, the `faith` policy with Smite),
`chaplain_ward` and `chaplain_sanctuary` (`heal-measure.ts`, pairs under fire), levels 1 / 5 / 10 / 20; add
`chaplain_turn` to `balance-contract.test.ts` `SYS`.

## 8. The other side

Enemies: no enemy is a Chaplain in this patch (no enemy has a patron). An enemy priest later uses Smite and Ward from the
same data. **The AI must learn:** a Sanctuary tile is worth half (target outside it, or wait it out: it ends at the
Chaplain's turn); a Warded ally is a worse target than an unWarded one of the same HP (read the Ward layer); the healer
hunt (rules 1.23) counts Ward as tending, so the Chaplain is hunted like a healer when it Wards. Fire doctrine (rules
1.25): Judged changes nothing for the enemy.

## 9. The screen

The **Faith tab** keeps the Devotion meter and the patron portrait (one place); Ward sits in the Whispers group, marked
with the class emblem, Sanctuary in the Hymns group (it shows the wait like any Hymn). Smite is not an action: a chip on
the weapon's attack card ("Smite ready · 32") and a line in the log ("Old Overcast smites the drill sergeant: 32"). A
Warded ally shows a white shield pip with a small glyph; the zone draws as the existing zone outline in the patron's
accent. **The presence:** the Miracle cut-in's portrait, cropped to a standing figure, at 40% opacity on the Chaplain's
tile while Witnessed; it brightens when an intervention fires (the spotlight already plays). Reduced motion: a still.
**Art needed** (for `art/briefs/ART-REQUESTS.md`, not edited here): eight standing patron figures cut from the existing
portraits (a crop and mask, Claude can do it); prayer icons for Ward and Sanctuary (Wick, white ink); Smite's icon.

## 10. Data

```json
{ "id": "ward", "name": "Ward", "ap_cost": 1, "uses": "at_will",
  "amounts": { "ward": { "kind": "shield", "base": 7, "profile": "blessing_mend", "provisional": true } },
  "numbers": { "held": 2 },
  "text": "A Whisper only you can say, and it is your Whisper for the turn. An ally you can see gains a shield of {=amounts.ward.base} × your Blessing power for the rest of the fight, on top of any other shield. At most {=numbers.held} allies carry your Ward at once.",
  "effects": [
    { "op": "grant_action", "action": "ward", "prayer": "whisper", "target": "ally", "ap": 1 },
    { "op": "mend", "when": "on_use", "amount": "ward", "target": "target", "layer": "ward", "layer_holders": "numbers.held" } ],
  "adjudication": "engine", "provisional": true, "origin": "guardian", "attributes": ["virtue"], "status": "active" }

{ "id": "smite", "name": "Smite", "ap_cost": 0, "uses": "per_turn",
  "amounts": { "smite": { "kind": "damage", "base": 20, "profile": "blessing", "type": "soul", "armour": "none", "provisional": true } },
  "text": "Once a turn, when your weapon attack hits an enemy that still stands, your patron strikes it too: {=amounts.smite.base} × your Blessing power Soul damage, with no roll, through armour. It counts as a prayer.",
  "effects": [
    { "op": "deal", "when": "hit", "amount": "smite", "target": "target", "via": "faith",
      "if": { "own_turn": true, "hostile": true, "mode": ["shot", "aimed", "burst", "auto", "melee"], "target_lacks": ["downed"], "open": true },
      "limit": { "per": "per_turn", "n": 1 } },
    { "op": "condition", "when": "hit", "condition": "judged", "rounds": 1, "skip_save": true, "target": "target", "if": { "own_turn": true, "hostile": true } } ],
  "adjudication": "engine", "provisional": true, "origin": "guardian", "attributes": ["virtue"], "status": "active" }
```

`on_use` (the action's own use: the trigger the default action runner already implies) and the fields `prayer`, `layer`, `layer_holders`, `via` are the new primitives of section 6. **Validator
rules:** `amounts.smite.base` equals Rebuke's value in `patrons.json` (a cross-file check, so the two cannot drift); an
action with `prayer` names `whisper` or `hymn`; a `layer` names a known layer; the `judged` condition row exists and is
used; no class move of a Soul class costs `mp` or `strain` unless its class is Determination's.

## 11. Open questions for Leon

1. **Ward is not on yourself.** Recommended: allies only (the Chaplain guards others; it has Protection). Assumed.
2. **Ward is 7, not 30.** Thirty is a whole healer's turn for 1 AP (section 7). Assumed 7, with a stacking layer.
3. **Smite stays at Rebuke's 20**, the Chaplain's turn line 125 all in, +35% over the door: the class's exception to 15%. Assumed.
4. **Re-measure the Whisper turn** on a Faith + Dexterity sheet: today's 80 holds only at Dexterity 0. Recommended; not assumed.
5. **Judgement's numbers:** the roster says "4 AP, 3 Devotion, once a scene"; the data says 4 AP, 10 Devotion XP (1 level), once a fight. Assumed the data (the roster says "kept").
6. **Judgement and Nerukhan's Hymn II Judgement share a name.** Recommended: the class move becomes **Verdict** *(Suggested)*. Not assumed.
7. **Sanctuary's cap** (11 × BP × dial × level prevented) exists only for Boss fights. Assumed.
8. **Toll-Keeper and Matchmaker Chaplains' Smite is nonlethal** (their taboo is killing). Assumed.
