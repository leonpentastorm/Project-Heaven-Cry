# The Chaplain (Virtue; was the Guardian): special prayers, Smite, the patron at its side (spec, 13 Nov 2026)

Revision 4 section 4.9. **Nothing is built**: step 4 of the build (`rev4-moves-and-rename.md` section 4). All numbers
PROVISIONAL (spec section 14 items when written in). The id stays `guardian`; the name becomes **Chaplain** *(Suggested)*.

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
| 3 | **Ward** is a Whisper only the Chaplain can say (rank I; Leon, 13 Nov: 7 × Blessing power, the turn's Whisper, two allies). It **uses the turn's one Whisper**. 1 AP, an ally you can see (not yourself), no roll for the Faithful (an Atheist: the Whisper TN, 12). The ally gains a shield of 7 × Blessing power, through the prayer heal dial and the level (as Protection), for the rest of the fight. | engine |
| 4 | **Wards held:** at most 2 allies carry a Ward of yours at once; a third Ward ends the oldest's remainder. A Ward on an ally who has one tops it up to the new value (never stacks with itself). A Ward **stacks on top** of any other shield: it is its own layer (`ward`, P11 of `rev4-primitives.md`), spent first; every other shield (Protection, Tending's Shield, Brimming) is the base layer, where the larger stands. | engine |
| 5 | **Sanctuary** is a Hymn only the Chaplain can say (rank III). 3 AP, starts the one Hymn wait (it is the Hymn of that wait: no patron Hymn until it ends). A tile you can see within 6: allies on its 3×3 (you too) take half damage until the start of your next turn. The zone prevents at most 11 × Blessing power × heal dial × level in all, then ends. Your own Strain burn is not halved (you have none: rule 8). A successful Sanctuary makes the Faithful Witnessed (it is a Hymn of their own patron's door). | engine |
| 6 | **Smite** (rank I): once a turn, on your own turn, when your weapon attack (any weapon: a shot, a strike, a throw, two weapons at once, a focus's own attack; `rev4-weapon-neutral-audit.md`) hits a living enemy that is not Downed or surrendered, the patron also deals 20 × Blessing power Soul damage to it (no roll, armour does not lower it). It is not multiplied by the attack's technique, critical, Verdict or ammunition. If the hit kills, Smite is not spent and may ride a later hit that turn. Not on a reaction or an opportunity attack (rule 2.1.4 of Revision 4: a reaction is a plain attack). Leon, 13 Nov: Smite stays at Rebuke's 20. | engine |
| 7 | **Smite is a prayer** for everything that counts prayers: its kill is a kill by prayer (the No Magic but Theirs vow, Witnessed's kill edge), its damage carries the patron's element tag (Soul; Old Overcast: lightning, so `storm`). It is **not** a Whisper and uses no prayer limit. For a patron whose taboo is `kill` (the Toll-Keeper, the Matchmaker), Smite never drops a target below 1 HP. An Atheist Chaplain's Smite rolls the Whisper TN (12) on each hit it would ride; a failed roll leaves it unspent. | engine |
| 8 | **No MP and no Strain.** No class move costs MP, Strain, cores or ammo of its own; Verdict keeps its Devotion XP cost (it is the class's pool). | engine |
| 9 | **Judged:** an enemy hit by the Chaplain's weapon on its own turn carries the condition Judged (1 round, no save, the Chaplain's). It is how "where the weapon struck" is known. | engine |
| 10 | **The patron at its side** (Faithful only): while the Chaplain is Witnessed its patron's figure stands on its tile as a **presence**: not a unit, never targeted, blocks nothing, sees nothing, moves with the Chaplain. It ends when Witnessed ends. | engine |
| 11 | **The first intervention of a fight does not end Witnessed** for a Chaplain. The second (Devotion 7+) does. The intervention count is the door's (once, twice from Devotion 7). | engine |
| 12 | **Interventions land where the weapon struck:** a damage intervention that picks a target picks a Judged enemy of the Chaplain's first, else the door's own rule. The presence also widens each patron's trigger (section 3.2). The presence never adds an intervention. | engine |

**Edge cases.** Ward and Sanctuary need sight (`fog.ts` `unitSees`); Smite reveals no more than its attack. A zone stays
on its tiles, a Ward moves with its ally, the presence with the Chaplain. Nothing here is a reaction. Downed: Wards, zone
and Witnessed stay, the figure dims; dead: all end. Co-op: Wards held are counted per Chaplain; two Sanctuaries do not
stack. Saves: shields, `cb.zones`, conditions, all saved today. Fight end: all of it ends.

## 3. The list

### 3.1 The six moves (Revision 4 section 4.9)

| Rank | id (kept or new) | Move | Cost | What it does | Data |
| --- | --- | --- | --- | --- | --- |
| I | `guardian.ward` (new; replaces `guardian.will_shield`) | **Ward** | 1 AP, the turn's Whisper | ally shield 7 × Blessing power (heal dial, level) for the fight; 2 held | `classes.json` move, `amounts.ward` |
| I | `guardian.smite` (new; replaces `command`) | **Smite** | 0 AP, once a turn | +20 × Blessing power Soul on a weapon hit; a prayer for tags and vows | `amounts.smite`, one `deal` op |
| II | `lumeri_templar.under_the_eye` (kept) | Under the Eye | passive | while Witnessed, allies within 3 get +2 to hit | as built (hybrid: its story half) |
| II | `lumeri_templar.blessed_shells` (kept) | Blessed Shells (display name **Blessed Arms** *(Suggested)*: the rule never was gun-only, the words were) | 0 AP | load a landed Hymn into your weapon, whatever it is (a round, an arrow, an edge, a thrown blade); the next hit releases it (a Smite may ride the same hit) | as built (hybrid: `classes/k.ts` releases it on any weapon hit); data: text says "your weapon", the tag `guns` → `weapon`; the story action "Bless your weapon" |
| III | `guardian.sanctuary` (reworked) | **Sanctuary** | 3 AP, the Hymn and its wait | 3×3, allies take half damage until your next turn, at most 11 × BP × dial × level prevented | `amounts.sanctuary_cap` |
| III | `lumeri_templar.judgement` (kept key) | **Verdict** *(Suggested; was Judgement)* | 4 AP, 10 Devotion XP, once a fight | one plain attack with **any** weapon (a strike, a shot or a throw; never a Burst, an Aimed shot or a technique) × (1 + Blessing power) | display name; the text's "Needs a melee weapon or a scattergun" goes, and the handler's gate (`classes/k.ts` `shotgun`, `isMelee`) with it: it resolves the weapon's plain mode (`melee`, `shot`, `thrown`) |

**Better** (Revision 4 section 2): no bigger meter (Devotion is standing: the class keeps Witnessed instead, rule 11);
**one thing free:** Smite; **six moves:** above.

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

The door's, unchanged (Faith 3 prays, 5 Witnessed, 7 the Miracle; each point −0.75 rounds of wait, +0.06 × 0.956 Blessing
power). Conscience: +10% shields received (reaches Ward). Gear: any weapon carries Smite, Blessed Shells and Verdict
(the base classes are weapon-neutral: Leon, 13 Nov; `rev4-weapon-neutral-audit.md`). **Doors at 1 point:** the
ruling binds the new doors; prayer opening at Faith 3 is built (rules 1.6) and is Leon's to change (section 11).

## 5. The class

**Squared and mixed classes** (Rev 4 4.9, the Saint): **a sketch of the shape only; no rule, primitive or number here
may depend on it** (Leon, 13 Nov: the advanced classes may be shelved for a whole new system).

## 6. On what exists

**Built from** (verified by grep on 13 Nov 2026; no bespoke handler where a primitive exists):

| Rule or move | The primitive that carries it |
| --- | --- |
| Whisper limit, Hymn wait (rules 1, 2, 3, 5) | `faith.ts` `combatPray` → `prayed(...).take('per_turn', 1, WHISPER_KEY)` / `.cool(..., HYMN_KEY)`, i.e. `effects/uses.ts`; `hymnWait` |
| Atheist rolls (rules 3, 7) | `previewPrayer` → `rollVs` (`rolls.ts`), `patrons.json prayer.atheist_tn` |
| Ward | a `verb`-shaped `grant_action` with `prayer: "whisper"` and `reach` (P6), its `mend` on trigger `acted` (P2); an `amounts` block, `profile: "blessing_mend"`, `level: "mend"` (as `prayerAmount('shield', …)`); `grantShield` with `layer: "ward"`, `holders: 2` (P11) |
| Smite (rule 6, 7) | item op `deal`, `when: "hit"` (trigger `hit` is every weapon attack and only those: `combat.ts` `resolveAttack`; so no `mode` predicate), `if: {own_turn, hostile, target_lacks: [downed], open}`, `limit: {per: "per_turn", n: 1}`; amount `profile: "blessing"`; fields `via`, `nonlethal` (batch rows) with predicate `patron` for the kill-taboo patrons |
| Judged (rule 9) | a row in `data/conditions.json`; op `condition` with `skip_save`, `when: "hit"` |
| Verdict (any weapon) | as built (`classes/k.ts` `lumeri_templar.judgement`, an action with `withMult`); the `available` gate loses `isMelee \|\| shotgun`, and `resolveAttack` takes the weapon's plain mode (`melee` in reach, `thrown`, else `shot`). No new handler |
| Blessed Shells (any weapon) | as built: `blessing_in` loads, trigger `hit` releases; only the texts and the tag change |
| Sanctuary | `prayer: "hymn"` (P6); op `zone` (`kind: "sanctuary"`, 3×3, `pool` = the cap) on `acted` (P2, P10); its halving op `damage_mult` on `taking`, `if: {target_in_zone: {kind: "sanctuary", owner: "self"}}`, spent from the pool (P10) |
| Witnessed, its end | `applyCond` / `endCond`, the `witnessed` row; `intervene()` in `faith.ts` |
| Rule 11 | stat `intervention_keeps_witnessed` (batch row), asked with `statQuery` in `intervene()`, answered by a data `stat_mod` on the class |
| The presence (3.2) | the patrons' `intervention.triggers` and `target` words (`patrons.json`), read by `intervening()`; predicates `actor_has`, `target_within`, `actor_within`, `target_hp_below`, `crit`, and `patron` (batch row) so the rows sit on the class |
| Judged (rule 9), its reads | a condition row (P4) |
| The figure on screen | the Miracle cut-in's portrait (`apps/web/src/game/cutIn.ts`, `faithArt.ts` `patronPortrait`), fed by the `witnessed` fx event `faith.ts` already emits |
| Log, hover cards | `say` and the patron's `speak`; the one card (`perkcard.ts`, `glossary.ts`), texts with `{=placeholders}` |

**Needs a new primitive** (shapes in `rev4-primitives.md` only; none restated here): P2 trigger `acted` (it replaces
this draft's `on_use`); P6 door verbs with `prayer: "whisper" | "hymn"` (through `faith.ts combatPray`); P10 zones
(`zone` op, `pool`, `target_in_zone`; it replaces `in_zone`); P11 shield layers (`layer`, `holders`); P4 the `judged`
row; batch rows `via`, `nonlethal`, `patron`, `intervention_keeps_witnessed`.

**Removed:** `guardian.will_shield` (`shieldBy(h)`), `command`, the old Sanctuary's MP, Strain and `damage_in` handler
(`classes/i.ts`; its story action stays, hybrid, no MP).
**Migration:** the id stays; moves come from the ranks, so no save changes.

## 7. Balance

**The arithmetic** (an estimate, not a measurement). Rifle-turn: 69.7 / 91.8 / 101.7 / 110.9 at levels 1 / 5 / 10 / 20
(`faith-fit.md` section 3; 5 and 10 interpolated). Blessing power: normal 1.3 / 1.55 / 1.83 / 2.0, all in 1.7 / 1.85 /
2.0 / 2.0. Smite = Rebuke = 20 × BP: all in 34 / 37 / 40 / 40 = **49 / 40 / 39 / 36%** of a rifle-turn on a hit.

**A Chaplain's weapon turn with Smite** = the turn's Whisper (Rebuke) + 2 shots (4 AP) + Smite × P(at least one hit):

**The lines (Leon, 13 Nov):** the Chaplain's own line is **125% of a rifle-turn all in** (a new ceiling
`balance.ceilings.chaplain_turn`: the plain rifle all in, so the god in the gun never out-hits a gunner who put
everything in the gun). On the budget reading the base class all in sits ON it; the door all in 125 ÷ 1.15 = **109**;
the door at a normal share 109 ÷ 1.25 = **87**; the Chaplain at a normal share 125 ÷ 1.25 = **100**. (The squared
column, 125 × 1.13 = 141, is not designed.) The Whisper turn's 80 stays the prayer-only line.

| Sheet (all in unless named) | Level 1 | 5 | 10 | 20 | Mean | Line | Off it |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Door, the contract's Faith build (Dex 0), Whisper turn, measured | 98 | 71 | 57 | 98 | 81 | 80 (prayer-only) | +1% |
| Chaplain, the same sheet: + Smite × P 0.73 / 0.51 / 0.33 / 0.85 | 134 | 91 | 70 | 129 | 106 | 125 | −15% |
| Door, Faith all in + Dexterity (shots 0.9 of the rifleman's: 60) | 109 | 100 | 99 | 96 | 101 | 109 | −7% |
| **Chaplain, Faith all in + Dexterity** (+ Smite × P 0.84) | **150** | **134** | **132** | **126** | **136** | **125** | **+9%** |
| Chaplain, normal share (Rebuke 37 / 34 / 36 / 36 + shots 53 + Smite × 0.8) | 120 | 114 | 118 | 118 | 118 | 100 | +18% |

The class is measured on the Faith + Dexterity sheet (Smite needs a hit; the Dex-0 build reads 106). Its all-in row
sits +9% on 125 (level 1 +20%, inside the per-level ±25%) and the door's −7% on 109: both inside ±12%, and the
class-over-door step (136 ÷ 101 = 1.35) is no longer an exception: each sits on its own line. **Smite stays at
Rebuke's 20 (Leon)**; the dial `amounts.smite.base` goes to 15 only if the measured all-in mean passes 140 (then 127).
**Watch:** the normal-share row reads +18%, outside ±12%: Blessing power at a normal share (1.3 to 2.0) is close to all
in (1.7 to 2.0), so the class's lead holds at a normal share; measured with the rest, not fitted ahead of it.

**Contract finding:** the Whisper-turn ceiling (80) holds only for the Dex-0 Faith build; a legal Faith 7 / Dexterity 3
sheet reads about 101 with no class (row 3), since rules 1.26 made the rifle hit as hard in anyone's hands.

**Ward against rules 1.27** (a heal or shield turn all in ≤ 200 Soldier-turns × 100; a shield ×1.2 the heal):

| Ward, all in, % of a Soldier-turn (18.5 / 24.1 / 34.2 / 60.2) | Level 1 | 5 | 10 | 20 |
| --- | --- | --- | --- | --- |
| The draft: 30 × BP (dial 1.506, level 1.0 / 1.10 / 1.28 / 1.82) | 415 | 382 | 338 | 273 |
| The draft, raw (no dial, no level) | 276 | 230 | 175 | 66 |
| **Ward 7 × BP** (dial and level, as Protection) | **97** | **89** | **79** | **64** |
| Protection 6 × BP, for comparison (the door's Whisper) | 83 | 76 | 68 | 55 |

Thirty is more than a healer's whole turn for 1 AP: **out**. Ward 7 is Protection +17% (the class's 15%); in rifle terms
(× 125/200) 61 / 56 / 49 / 40%, level with Rebuke. **What stops free Ward every turn:** it is the turn's Whisper, two
held at most, never stacked with itself. No Devotion cost (spending standing would punish devotion).

**Sanctuary** (a Hymn turn's cap is 250): 2.4 of 4 allies inside, 4 Soldiers firing, half: **120**; with the turn's Ward
217. A Boss and 3 Soldiers: 180 + 97 = 277, so the cap 11 × BP × dial × level (28 HP at level 1 all in, 153%) holds 250.

**The presence:** below Devotion 7 it only keeps Witnessed (Under the Eye's +2 runs on: watch it); from 7 the second
intervention needs no new Hymn: one rifle-turn once a fight, +5 to +10% on a fight. Inside the band.

**Verdict on any weapon** (the weapon-neutral ruling): once a fight, ×(1 + Blessing power) on one plain attack. The
biggest plain attacks it allowed before (a scattergun's close shot, a heavy strike) are about the size of a long
rifle's bolt, so the peak hardly moves; a pistol or bow Chaplain gains a use it never had (about +0.5 of a rifle-turn
once a fight, +5% on a four-round fight). The Elite and Boss guard holds every roll. **Smite** loses its `mode` list:
a thrown or paired attack carries it too, at the same 20 × BP once a turn: nothing moves.

**Measure when built:** `refit-measure.ts` `chaplain_turn` (also with a long rifle and with a pistol, for Verdict) (Faith all in + Dexterity, `faith` policy with Smite) into
`balance-contract.test.ts` `SYS`; Ward and Sanctuary in `heal-measure.ts` pairs under fire; levels 1 / 5 / 10 / 20.

## 8. The other side

No enemy has a patron in this patch; an enemy priest later reads the same data. **The AI learns:** shoot outside a
Sanctuary or wait for its end; a Warded ally is a worse target (read the layer); the healer hunt (rules 1.23) counts Ward
as tending. Fire doctrine (rules 1.25): unchanged.

## 9. The screen

The Faith tab keeps Devotion and the portrait (one place); Ward sits in the Whispers group, Sanctuary in the Hymns (it
shows the wait). Smite is a chip on the attack card ("Smite ready · 32") and a log line ("Old Overcast smites the drill
sergeant: 32"). A Ward is a white shield pip; the zone is the existing outline in the patron's accent. **The presence:**
the cut-in's portrait cropped to a standing figure at 40% on the Chaplain's tile, brightening when an intervention fires.
**Art** (for `ART-REQUESTS.md`, not edited here): eight standing figures cropped from the portraits (Claude can); Wick
icons for Ward, Sanctuary and Smite.

## 10. Data

```json
{ "id": "ward", "name": "Ward", "ap_cost": 1, "uses": "at_will",
  "amounts": { "ward": { "kind": "shield", "base": 7, "profile": "blessing_mend", "provisional": true } },
  "text": "A Whisper only you can say, and it is your Whisper for the turn. An ally you can see gains a shield of {=amounts.ward.base} × your Blessing power for the rest of the fight, on top of any other shield. At most {=effects.1.holders} allies carry your Ward at once.",
  "effects": [
    { "op": "grant_action", "action": "ward", "prayer": "whisper", "ap": 1, "reach": { "sight": true, "side": "ally", "self": false } },
    { "op": "mend", "when": "acted", "if": { "action": ["ward"] }, "amount": "ward", "target": "target", "layer": "ward", "holders": 2 } ],
  "adjudication": "engine", "provisional": true, "origin": "guardian", "attributes": ["virtue"], "status": "active" }

{ "id": "smite", "name": "Smite", "ap_cost": 0, "uses": "per_turn",
  "amounts": { "smite": { "kind": "damage", "base": 20, "profile": "blessing", "type": "soul", "armour": "none", "provisional": true } },
  "text": "Once a turn, when your weapon attack hits an enemy that still stands, your patron strikes it too: {=amounts.smite.base} × your Blessing power Soul damage, with no roll, through armour. It counts as a prayer.",
  "effects": [
    { "op": "deal", "when": "hit", "amount": "smite", "target": "target", "via": "faith",
      "if": { "own_turn": true, "hostile": true, "target_lacks": ["downed"], "open": true },
      "limit": { "per": "per_turn", "n": 1 } },
    { "op": "condition", "when": "hit", "condition": "judged", "rounds": 1, "skip_save": true, "target": "target", "if": { "own_turn": true, "hostile": true } } ],
  "adjudication": "engine", "provisional": true, "origin": "guardian", "attributes": ["virtue"], "status": "active" }
```

The trigger `acted` (P2), `prayer` and `reach` (P6), `layer` and `holders` (P11), `via` (batch row): section 6.
**Validator:** `amounts.smite.base` equals Rebuke's value (`patrons.json`, a cross-file check); `prayer` is `whisper` or
`hymn`; a `layer` is known; the `judged` row exists; no Virtue class move costs `mp` or `strain`.

## 11. Open questions for Leon

**Settled** (L = Leon; lead = the lead's call, which Leon can reverse):
1. **Ward is 7 × Blessing power**, uses the turn's Whisper, sits on at most two allies (L); allies only (lead).
2. **Smite stays at Rebuke's 20; the Chaplain's own line is 125% of a rifle-turn all in** (L); on the budget reading
   the door's line is 109 and the old "+35%, the class's exception" falls away (section 7).
3. Re-measure the Whisper turn on a Faith + Dexterity sheet (lead). 4. Verdict keeps the data's cost: 10 Devotion
   XP, once a fight (lead, rev4-primitives 3.6). 5. **Judgement is renamed Verdict** *(Suggested)*; key kept (lead).
6. Sanctuary's cap binds only in Boss fights; Toll-Keeper and Matchmaker Smites are nonlethal (lead).
7. The advanced classes are a sketch only (L).

**Settled by Leon (13 Nov): prayer opens at Faith 1.** The door-at-1-point ruling holds for Faith too: **Faith 1
and 2 pray Whispers** (the one Whisper a turn, 1 AP, the Faithful to their patron and an Atheist by dice, as built);
**Hymns open at Faith 3** as today, Witnessed at 5 and the Miracle at 7 unchanged. Everywhere this spec says
"anyone with Faith 3 prays", read "anyone with Faith 1 prays Whispers; Hymns from Faith 3". This changes a built
rule (rules 1.6: prayer at Faith 3): it goes into the Classes 3.0 rules revision with its own section 14 item, and
the Whisper-turn line of the contract is re-measured with a Faith 1 and a Faith 2 sheet (a Whisper's size already
grows with Faith through Blessing power, so a Faith 1 Whisper is small).
