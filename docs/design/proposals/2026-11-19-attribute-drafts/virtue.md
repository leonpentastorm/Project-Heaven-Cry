# Virtue sheet: Faith (alpha), Conscience (beta), Authority (gamma), the Chaplain (`guardian`)

Read-only draft. Sources: `data/skills.json` (faith, conscience, authority), `data/perks.json`, `data/forks.json`, `data/calls.json`, `data/classes.json` (base `guardian`, `gain`), `data/patrons.json` (`prayer`), `data/conditions.json`, `docs/ENGINE-HOOKS.md`, `packages/engine/src/faith.ts` and `character.ts`, the scout tables, ATTACK-PLAN rulings. New numbers are marked PROVISIONAL.

**Ground truth found while reading (these change the plan):**
1. **Four of the eight named passives do nothing in the engine today.** Only skills.json unlocks marked `"item": true` run as items (`effects/collect.ts` SKILL_ITEMS). In this attribute that is only Deliver the Sinner (Faith 5) and Prayer shields (Conscience 1). In `packages/engine/src`:
   - Answered Prayer (`grant_action answered_prayer`) has no reader.
   - Righteous (`ap_cost:first_action_when_protecting`) has no reader, and that stat is not a cost site.
   - Five Stars (`squad_ap_round1`) has no reader.
   - Rank Has Privileges is Narrator text by design.
2. **The Faith per-point row "Hymns come back 0.75 round sooner" stops doing anything at Faith 6.** The wait is 9 − 0.75 × Faith − 0.25 × Virtue, and Virtue ≥ Faith. At Faith 6 and Virtue 6 it is already at the floor of 3 (`character.ts prayerCooldown`). Only the `hymn_wait` stat can go below 3, down to `min_wait` 2 (`faith.ts hymnWait`).
3. **`faith.ts:143` only reads the `hymn_wait` stat when the character holds a perk or a trait.** A fork option that sets `hymn_wait` would be missed on a character with neither. The fix is in that one read; no new primitive is needed.
4. The `Mastery 4` unlock at level 9 has `effects: []` on all three skills. Lane 4 should confirm the level-9 perk step is granted somewhere else.

---

## 1. PROMISE

- **Faith:** for crusaders, divine classes, cultists and missionaries. It must let you pray to a patron who answers: quick Whispers every turn, a strong Hymn that then waits, and the patron's blows landing on the sinner you name.
- **Conscience:** for lawful, saintly (or devilish) people who see where an act leads. It must keep you and the people you protect alive (prayer shields, saves, sparing) and let you see what a choice costs before you make it.
- **Authority:** for soldiers, police, security and anyone who has to be cool. It must make people obey you: orders in a fight (the Call), rank in talk, the squad moving first. It also keeps your voice from being shut (Silenced, the tax on prayer and Calls).

## 2. ALPHA LADDER: Faith

Every level also shows: **+10% Blessing power** (`per_point.numbers.blessing` 0.1) and **+1 to the TN of saves against your prayers**. Levels 1 to 5 also show **−¾ round Hymn wait** (the row stops at the floor from Faith 6).

| Lv | Gives (card) | Existing id or NEW | Where it comes from today |
|---|---|---|---|
| 1 | **The door: Whisper** (1 AP, once a turn, 7 Whispers) · Devotion | existing | `door_line`; `patrons.json prayer.whisper.faith_min` 1 |
| 2 | **Name the Sinner** (a Whisper): a foe you see is Judged for 2 rounds · **+20% your patron's blows** against a Judged or Marked foe | CHANGED: Deliver the Sinner (`faith.unlocks.5`) moves to 2 and gains a verb | `damage_vs` 0.2 from `faith.unlocks.5`; the verb is `grant_action` with `prayer: whisper`, `reach {sight, side: foe}`, then `condition judged`, `skip_save`, rounds 2 (PROVISIONAL; Smite's is 1). All existing primitives (Ward's shape) |
| 3 | **Perk step** · Hymns open (3 AP, then a wait) | existing (step); Hymns stay at 3 | `perk_choice faith`; `prayer.hymn.faith_min` 3 (rules 1.31) |
| 4 | **Fork one:** Steadfast or Round of Blessings | existing fork `a`, rewritten (section 3) | `forks.json` |
| 5 | **Witnessed:** your answered Hymn brings your patron's eye: **+2 Devotion XP** a liked act, one intervention a fight | existing | `prayer.witnessed.faith_min` 5 |
| 6 | **Perk step** | MOVED from 5 | `perk_choice` |
| 7 | **Perk step** · the Miracle (with Devotion 10) | existing | `prayer.miracle.faith_min` 7 |
| 8 | **Fork two:** Swift Psalm or Benediction | MOVED from 6 (fork `b`), rewritten | `forks.json` |
| 9 | **Perk step** | existing | Mastery 4 |
| 10 | **Mastered: Judgement Day** (3 AP, once a fight: a foe's next attack fails · **+50% your damage** to it) | existing `judgement_day` | `perks.json`, `perks/f.ts:249` |

**Alpha perks (four steps, four tiers):**
- **Unbroken Litany** (`litany`), I unchanged: **−1 AP** on your first Hymn or Miracle each fight. II CHANGED: **−1 AP on your first two** (limit n 2, PROVISIONAL). Its old `hymn_wait −1` moves to Swift Psalm.
- **Sinner's Due** (`holy_ordnance`), unchanged: **+8% / +12%** prayer damage against a foe at half HP or less; tier II also against a Marked or Judged foe.

**SURPLUS**

| Today | Destination | Why |
|---|---|---|
| Answered Prayer (Faith 3; reset the prayers' wait once a fight) | **cut** | Never engine-run (no reader). Resetting a cooldown needs a new op, which is not approved. Its job (more Hymns) is Swift Psalm's. |
| Deliver the Sinner as a passive at 5 | **folded into level 2** (Name the Sinner) | It read only Shadow's Marked. Now Faith makes its own target (Judged), and the Chaplain's Smite makes one too. |
| `hymn_wait −1` on Litany II | **fork two, Swift Psalm** | One copy of the lever. Otherwise the two stacked to the 2-round floor. |
| Hymn-wait per-point row from Faith 6 on | shown only on levels 1 to 5 | Nothing changes after that (the floor). |

## 3. ALPHA FORKS (they run on the prayer slots: the turn's Whisper and the Hymn's wait)

**Fork one (level 4): the Whisper. Speed or size.**
- **Steadfast** (`fork.prayer.steadfast`, kept id). Card: **−1 AP Whisper on an ally at half HP or less** (Ward included).
  - **Sealed** until the approved **target-aware price** (N20) lands. Then: `cost_mod` on `cost`, `action [whisper, ward]`, `target: ally`, `target_hp_at_most` 0.5, `min` 0.
  - This replaces the reaction Whisper, which needed N6 (not approved).
- **Round of Blessings** (`fork.prayer.round_of_blessings`, kept id). Card: **+25% your first prayer heal or shield each turn**.
  - **Built today:** `mend_mult` 1.25 on `heal` and `shield`, `how [blessing]`, `actor: self`, limit `per_turn` 1 using Litany's peek-then-`use` pattern.
  - The 1.25 is the data's own "cheaper wording". This replaces the N7 version (a Hymn wait that moves).

**Fork two (level 8): the Hymn. More Hymns or a bigger Hymn.**
- **Swift Psalm** (`fork.prayer.held_breath`, kept id, renamed because nothing is held any more). Card: **−1 round Hymn wait** (2 at least).
  - **Built today:** `stat_mod hymn_wait −1`, plus the one-line fix at `faith.ts:143` (ground truth item 3).
  - This replaces the held Whisper, which needed N7.
- **Benediction** (`fork.prayer.benediction`, kept id). Card: **+1 to hit for 2 rounds, for you and allies within 2 tiles, when your Hymn is answered**.
  - **Built today:** `condition` with `targets {of: self, within: 2, side: side}`, `when: acted`, `action [pray]`, `skip_save`.
  - The condition is a NEW data row `blessed_aim`, a copy of `canticle_rising` (+1 to hit, 2 rounds), so the song breaking does not strip it.
  - The numbers are Rising's and the Canticle's. This replaces the wide Whisper, which needed N5 and N7.

Only one option needs an approved piece (Steadfast: target-aware price). None needs an unapproved one.

## 4. BETA: Conscience

**Per point, levels 1 to 10:** **+10% shields on you · +1% your prayer shields per Faith point**. Level 1 names it "Prayer shields" (`conscience.unlocks.1`, the feed, engine).

Perk steps at 3 / 5 / 7 / 9 (four of the eight tiers). Mastered at 10.

| Perk | Tier I | Tier II changes | Id | Engine / Narrator | Primitive |
|---|---|---|---|---|---|
| **Clean Hands** | Spare a foe or protect an innocent: **shield 15% of your max HP** (twice a fight, the larger stands) | **25%** | `clean_hands` kept | engine (the Narrator rules outside a fight) | existing `perks/f.ts` |
| **Righteous** | **+20% your prayer heals and shields on an ally at half HP or less** (PROVISIONAL) | **+40%** | NEW perk `righteous`, from the unlock at 5 (CHANGED: the old AP cut never ran) | engine | `mend_mult`, `when heal/shield`, `how [blessing]`, `actor: self`, `target: ally`, `target_hp_at_most` 0.5 |
| **Red Line** | Name a line you won't cross: **+1 Heart saves** while it holds | **+2**, allies within 3 tiles **+1** | `red_line` kept | hybrid | existing `perks/f.ts` + `save_mod` |
| **Foresight** | Before a big decision, the Narrator tells you its worst likely result, honestly | **Once a fight, the first blow that would drop an ally within 4 tiles leaves them on 1 HP** (PROVISIONAL) | NEW perk `foresight`, from the unlock at 3 | I Narrator, II engine | `floor` 1 on `would_drop`, `target: ally`, `target_within` 4, limit `per_combat` 1 (Take the Weight's shape) |

**Mastered:** Foreseen (`foreseen`, kept): once a session, rewind a major decision; the table votes. Combo What Could Be is unchanged.

## 4b. GAMMA: Authority

**Per point, levels 1 to 10:** **+1 on checks · +1 tile Order reach** (`call_range` 1). Karma swing +1 is the Narrator's and is not shown as a number.

**The Call: Order** (`call.order`, kept), once a turn:

| Level | Card |
|---|---|
| 1 | Order **3 AP**: an ally reloads, stands up or picks up a pile, free (their reaction) · reach 5 |
| 4 | Step 2 MOVED from 3: **or moves 1 AP of walking** |
| 5 | **Order 2 AP** |
| 8 | Step 3 MOVED from 7: **2 of those at once** |
| 9 | **Order 1 AP** |
| 10 | **Pay a Call with your reaction · +1 Call that turn for 1 AP** |

- Today's "reaction for 0 AP at 9" and "first Call free at 10" are removed by Leon's ruling.
- `calls.json rules` needs fields for the AP steps (3/2/1 at 1/5/9), `per_turn` 1, reaction-pay at 10 and an extra Call at 10. This is calls code, built once for all nine Calls; it is not an item-op list.

Perk steps at 3 / 5 / 7 / 9. Mastered at 10.

| Perk | Tier I | Tier II changes | Id | Engine / Narrator | Primitive |
|---|---|---|---|---|---|
| **Rank Has Privileges** | Lower-ranked people follow reasonable orders without a roll | **Once per organisation the Narrator names who really holds power, and they agree to see you** | NEW perk `rank_has_privileges`, from the unlock at 3; tier II absorbs `real_power` | Narrator | `narrator` |
| **Five Stars** | **+1 AP for your squad in the first round** | Rank-and-file foes make a **Heart save or are Shaken for 1 round** | NEW perk `five_stars`, from the unlock at 5 (never ran) | engine | `combat_start` + `grant_ap` 1 `bank` + `targets {of: self, side: side}`; II `condition shaken`, `via authority`, `targets {side: foe}`, `target_not_tier [elite, boss]` |
| **Outclassed** | Your squad's first kill (you hurt it): **+3 AP** next turn; first casualty **−2 AP** | No penalty; the killer **+1 AP** | `outclassed` kept | engine | existing `perks/e.ts` |
| **Commanding Voice** (removes the door's tax: Silenced shuts both prayer and Calls) | **+3 on saves against Silenced, Shaken and Fear** (PROVISIONAL) | **Immune to Silenced** | NEW `commanding_voice` | engine | `roll_mod` on `cond_incoming`, `cond [silenced, shaken, fear]`; II stat `immune:silenced` |

**Mastered:** On My Mark (`on_my_mark`, kept): 1 AP once a round, an ally takes one action now from its next turn's AP. Combo The Voice is unchanged.

## 5. CLASS: the Chaplain (six moves)

| Rank | Move | Verdict | Why |
|---|---|---|---|
| I | Ward (`guardian.ward`) | KEEP | Its own shield layer, spent first, on up to 4 allies for the whole fight. The door's Protection is one ordinary shield. |
| I | Smite (`guardian.smite`) | KEEP | The weapon carries the god (+20 × Blessing power Soul on a hit, once a turn) and Judges for free: the best feeder of Name the Sinner. |
| II | Under the Eye (`lumeri_templar.under_the_eye`) | KEEP | No ladder twin (+2 to hit within 3 while Witnessed). |
| II | Blessed Arms (`lumeri_templar.blessed_shells`) | KEEP | No ladder twin (a Hymn loaded into the weapon). |
| III | Sanctuary (`guardian.sanctuary`) | KEEP | The only zone kind; half damage on a 3×3. |
| III | Verdict (`lumeri_templar.judgement`) | KEEP | One huge blow, × (1 + Blessing power). Judgement Day is a mark over the fight. |

- Names to watch: "Judgement" is Nerukhan's Hymn, the Verdict key, Judgement Day's action and the Judged condition.
- The five gains (At Your Side, Canticle, Amen, Holy Dread, Last Rites) stay as they are.

## 6. Special rulings

None of the special rulings is Virtue's.

## 7. COUNTS

| Skill | Felt levels | Most things on one level |
|---|---|---|
| Faith | 10 of 10 | 2 (level 3: step + Hymns; level 7: step + Miracle) |
| Conscience | 10 of 10 with the per-point line; 6 named (1, 3, 5, 7, 9, 10) | 1 (+ the per-point line) |
| Authority | 10 of 10 with the per-point line; 8 named (1, 3, 4, 5, 7, 8, 9, 10) | 2 (levels 5, 9, 10: step or Mastered + a Call cost step) |

**MIGRATION**
- **Unlocks are worked out from points and never held**, so nothing is lost. This covers Answered Prayer cut, Deliver the Sinner moved, and the Call steps moved.
- **Faith steps:** a save keeps every step it holds. A new step is offered only when the 3/6/7/9 schedule owes more than the save holds. Test: an old save at Faith 5 holding 2 steps.
- **Faith forks:** never offered (shelved), so no save holds one.
- **Litany II** holders keep the tier and get the new text. The −1 Hymn wait now comes only from Swift Psalm.
- **`real_power`** at either tier becomes `rank_has_privileges` II.
- **Conscience 3+ / 5+ and Authority 3+ / 5+ saves** lose the old free passives (Foresight, Righteous, Rank Has Privileges, Five Stars), which now sit on perk steps. Recommended: one free re-pick of that skill's steps on load, with the old passive preselected as tier I where a step is free.

## 8. OPEN (for Leon)

1. **Hymns at Faith 3 put two things on level 3.** Move them to 2 so 3 is the step alone? *Recommend: no.* Keep your 13 Nov "Hymns from 3"; Name the Sinner is the small verb at 2.
2. **Foresight is a notice perk on a beta.** Keep it on Conscience with a combat tier II (an ally saved at 1 HP)? *Recommend: yes.* It is Conscience's own promise, and it fits no gamma.
3. **Real Power merged into Rank Has Privileges II** to free a slot for the tax-remover (Commanding Voice)? *Recommend: yes.*
4. **The Call's step levels move from [1, 3, 7] to [1, 4, 8]** in the shared `calls.json` rule, for all nine Calls, so the steps sit on levels without a perk. *Recommend: yes,* if the other eight sheets agree.
5. **Old saves with free beta/gamma passives:** a free re-pick of those steps on load, or grandfather the passives as extra tiers? *Recommend: the re-pick,* with the old passive preselected.

