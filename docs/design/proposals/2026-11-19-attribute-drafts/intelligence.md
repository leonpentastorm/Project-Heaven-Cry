# Intelligence: Brain Power (alpha) · Rumination (beta) · Eloquence (gamma) · Sigilist (`mage`)

Sources read in E:/phc-wt/rel030: the attack plan's binding rulings, the scout's Intelligence section with lists C and D, the skill-pages read, data/skills.json, perks.json, calls.json, forks.json, classes.json, sigils.json and rules.json (mana.sigil, derived.magic), docs/ENGINE-HOOKS.md, the TRIAGE balance notes, and engine src where a primitive needed checking. No file was changed.

Engine facts this sheet relies on (checked in code):
- **`acted` fires for every combat verb by its cost-site name** (game.ts `actedName`). That includes `draw`, `evoke`, `vent` and `call`, so Vent and Call are heard today without N22.
- **Evoke is priced through the `cost` trigger** (`priced(...,'evoke')`, sigil.ts:625). A glyph is priced through `glyph_cost`.
- **`sourceOf` reads `event:amount`, `skill:<id>`, `feed:<door>` and `res:<id>`** (triggers.ts:321).
- **`targets` works on any op** (P5).
- **Opening Argument has no engine code** (grep finds nothing), so it does nothing in Survival.

## 1. Promise

- **Brain Power:** for Evoker users, scientists and researchers. It must let them write Sigils faster and harder than anyone: longer Lines, more words, more reach, cheaper spells. It is not for Emanator users, healers or melee fighters.
- **Rumination:** for bookworms, hackers and tech professionals. It must let them know the theory behind what they face, and keep a caster's head cool: a higher Flux limit, Brain saves, and resisting what they have already seen. It is not for the devout or the supernatural.
- **Eloquence:** for lawyers, preachers and politicians. It must let them win every argument and turn logic into tempo: expose a claim, debate before a fight, Brief an ally, and talk while the Sigil is written. It is not for quiet types.

## 2. Alpha ladder: Brain Power

Every level shows: **+10% Sigil power · +1 word known · +1 Sigil save TN** (the three "each" rows).

| Lv | gives (card) | existing id or NEW | where it comes from today |
|---|---|---|---|
| 1 | **Door: Sigils.** Draw a word on your tile; a Line of 2–4; Evoke, Vent, Swap core, Scuff | door_line, door_tab sigils (kept) | L1 |
| 2 | **Overclock:** +1 word past your Max Sigil words, +2 charge · +1 Sigil reach, +1 round | unlock `skill:brain_power.3` re-keyed to `.2` (kept) | L3 (moved down) |
| 3 | Perk step 1 · −1 Evoke charge | perk_choice (kept) | L3 (M1) |
| 4 | **Fork one:** Overflux or Clean Vent · +1 reach, +1 round | forks[a] (ids kept, content changed) | L4 (sealed) |
| 5 | **Twin Draw:** once a fight, draw two spells, pay the longer one's glyph AP · −1 Evoke charge | `skill:brain_power.5` (kept) | L5 |
| 6 | Perk step 2 · +1 reach, +1 round | perk_choice | moved from L5 |
| 7 | Perk step 3 | kept | L7 |
| 8 | **Fork two:** Written in Advance or Running Script · +1 reach, +1 round | forks[b] moved from 6 to 8 | L6 (sealed) |
| 9 | Perk step 4 · −1 Evoke charge | kept | L9 |
| 10 | **Mastered: Clean Draw** (Junctions with it) · +1 reach, +1 round | `clean_draw`, sigils.json junction gate 10 (kept) | L10 |

The alpha's perks give four tiers for its four steps (3, 6, 7, 9), so the player gets them all: Second Clause (`hold_the_stroke`, +6% / +12% Sigil damage on an afflicted foe) and Running Hand (`parallel_thought`, −0.5 AP on the first glyph each turn, adding no Flux at II).

**The charge cut moves from 3/6/9 to 3/5/9.** This keeps level 6 at two things. It is a small buff at Brain Power 5 (2 cuts instead of 1) for a door that clears stage 1 in only 3 of 12 solo runs. PROVISIONAL. `rules.json derived.magic.sigil_core_saving` becomes a step list held in data. That moves a number into data; it is not a new primitive.

**SURPLUS:**
1. **Junction** (sigils.json grammar.junction, at 10) stays at 10 and is shown inside the Mastered line as one thing. It is the door's own geometry, so it serves no beta or gamma promise.
2. **The "every 3" charge cut** is re-timed (above), not moved.
3. **Overclock against the Sigilist's Overcharge** is a duplicate. The ladder keeps Overclock and the class replaces Overcharge (section 5).
4. Nothing else is surplus. Brain Power is not overloaded today (9 felt levels, busiest 3), so it has no bulk to hand to Rumination or Eloquence. Their new content comes from their own perks (section 4).

## 3. Alpha forks (on Flux and the glyphs)

**Fork one (level 4):**
- **Overflux** (`fork.sigil.overflux`, id kept, content changed): **"+25% Sigil damage at your Flux limit."** PROVISIONAL ×1.25.
  - Buildable with the approved pieces: Flux as a resource row (N3b) and `self_res: {flux: {at: "limit"}}` (N10).
  - Rule: `damage_mult` on `dealing`, if `{damage: [sigil_spell], self_res: {flux: {at: "limit"}}}`.
  - It replaces "no Overload", which needs N15 (not approved).
- **Clean Vent** (`fork.sigil.clean_vent`, id kept, content changed): **"Vent: foes next to you are pushed 1 tile and take 6 Sigil scorch."** Once a turn; base 6 on the sigil profile, PROVISIONAL.
  - **Built today:** `acted`, if `{action: [vent]}`, limit per_turn; `targets {side: foe, within: 1}`; `displace` push 1; `deal` with an amount block.
  - What changes: the old "2 Flux or more" gate and "4 × Flux vented" are dropped. The Vent's amount is not on any item trigger (N22, not approved); `acted` fires after the Flux is already 0.

**Fork two (level 8):**
- **Written in Advance** (id kept, mechanism changed): **"+20% Sigil damage on your first Evoke after a turn you ended with glyphs drawn."** ×1.2, as today.
  - **Built today with flags, no glyph age (N14 not needed):**
    1. `acted` on draw marks `inked`.
    2. `turn_end`, if flag `inked`, marks `aged`.
    3. `dealing`, if `{damage: [sigil_spell], flag: aged}`, applies `damage_mult` 1.2.
    4. `acted` on evoke clears both flags.
- **Running Script** (id kept, content changed): **"After an Evoke, your next glyph this turn costs 0 AP and adds no Flux."**
  - **Built today:** `acted` on evoke marks `run`; `glyph_cost`, if flag `run`, applies `cost_mod` set 0 and `cost_mod` res flux set 0; `acted` on draw and `turn_end` clear it; limit per_turn.
  - It replaces "the Evoked glyph stays", which needs N14.

All four are buildable, so both steps can be offered (doorpicks.ts needs every option built). Overflux waits only for the two approved pieces.

## 4. Beta: Rumination (feeds the door, keeps you alive)

**Every level 1–10:** **+1 Brain save · +1% Flux limit per Brain Power point.** The level shows the live number, for example "Flux limit 7" (the existing feed and `doorFeedView`).

Perk steps are at 3 / 5 / 7 / 9 (four of eight tiers). Mastered is at 10.

| Perk | Tier I | Tier II changes | id | ref | primitive |
|---|---|---|---|---|---|
| **Index** (was the L3 passive) | Once a scene, ask the Narrator one factual question (tech, biology, history); the answer is true | Once a fight, Analyze costs 0 AP | NEW `index` (action `index_question` kept) | I narrator, II engine | I `narrator` + `grant_action`; II `action_cost` analyze set 0, uses per_combat |
| **Proven Formula** (was the L5 passive) | +3 on saves against a spell or condition that already hit you this fight | +5 (PROVISIONAL) | NEW `proven_formula` (handler `skill:rumination.5` re-keyed) | engine | existing handler (perks/skills.ts) |
| **Footnote** | Once a fight, 0 AP: cite a fact about one foe, allies +1 to hit it this round (in a story, +1 on rolls that act on it) | +2, and your own Sigils count it too | `footnote` kept, II changed | hybrid | existing handler (perks/g.ts); the to-hit term also covers the citer |
| **Lab Coat** | +3 on saves against chemicals, gases and drugs you have identified | 2 AP (free out of a fight): neutralise one for allies within 2 tiles | `lab_coat` kept, unchanged | hybrid | existing handler (perks/f.ts) |

**Mastered: Established Fact** (`established_fact` kept). The story part is unchanged. NEW engine half so Survival gets something: **"Once a fight, your own Overload deals you no damage."** Rule: `damage_mult` 0 on `taking`, if `{self_harm: true, not_damage: [strain, short]}`, limit per_combat. PROVISIONAL.

## 4. Gamma: Eloquence (talk, notice, command; removes the door's tax)

**Every level 1–10:** **+1 on Eloquence checks and Asks · +1 Brief reach.** The fight Persuade's TN also rises 1 a point; it rides on the same line.

**Call: Brief** (`call.brief`). Once a turn. **3 AP; 2 AP from 5; 1 AP from 9.** At 10 it may be paid with your reaction, and one more Call that turn costs 1 AP. Reach stays 4 + 1 a point.

The strength steps move to even levels so they don't share a level with perk steps, and get stronger to match the new 3 AP price. Today's step 1 would cost 3 AP to save 1. All numbers PROVISIONAL.

| at | Brief step (new) | today |
|---|---|---|
| 1 | Their next two actions −1 AP each | step 2 (was at 3) |
| 4 | Next action −2 AP, the one after −1 | step 3 (was at 7) |
| 8 | Next two actions −2 AP each | NEW |

I recommend calls.json `steps_at` [1, 4, 8] for all nine gammas.

Perk steps are at 3 / 5 / 7 / 9. Mastered is at 10.

| Perk | Tier I | Tier II changes | id | ref | primitive |
|---|---|---|---|---|---|
| **Objection!** (was the L3 passive; absorbs Burden of Proof, its near-twin) | Roll Eloquence to expose a contradiction in a claim made before others; on a success, everyone listening trusts the speaker less | Also: when someone accuses you or your squad, demand evidence. If they have none, they lose outright and onlookers shift one step your way | NEW `objection` | narrator / hybrid | `narrator` |
| **Opening Argument** (was the L5 passive) | Debate the enemy leader before a fight; on a success, every foe −1 AP in round 1 | Your first Persuade, Threaten or Parley each fight costs 0 AP | NEW `opening_argument` (action kept) | I hybrid, II engine | II `cost_mod` set 0 on `cost`, if `{action: [parley]}`, limit per_combat, `use` on `acted` parley |
| **Overruled!** | +2 AP at turn start while a Left Brain Debuff you inflicted is on a foe (once every 3 turns); −2 AP while you carry one | Left or Right Brain Debuff; your own penalty −1 | `overruled` kept, unchanged | engine | existing handler (perks/e.ts) |
| **Thinking Aloud** (removes the door's tax) | After you make a Call, your next Evoke this turn costs 0 AP (once a turn) | And your next glyph this turn adds no Flux | NEW `thinking_aloud` | engine | `acted` on call marks a flag; `cost` (evoke, flag) `cost_mod` set 0; II `glyph_cost` (flag) `cost_mod` res flux set 0; `acted` on evoke or draw and `turn_end` clear the flag |

**Mastered: Closing Argument** (`closing_argument` kept). The story part is unchanged. NEW engine half: **"Once a fight, your Persuade gets no save."** Rule: `skip_save` on `cond_incoming`, if `{actor: self, cond: [ldebuff, rdebuff]}`, limit per_combat. PROVISIONAL.

Combo perks are kept:
- **Spoon-Feed:** its deed ("teach someone a Sigil") cannot be detected by the engine; hide it in Survival (lane 1).
- **Just the Repairman** and **Fire Sermon:** unchanged.

## 5. Class: Sigilist

| Rank | Move | Verdict | Why / replacement |
|---|---|---|---|
| I | Barrage (`mage.barrage`) | **KEEP** (against the scout's DUP) | It cuts the *draw* charge of the five damage words (`word_cost`). The ladder cuts the *Evoke* charge per spell. These are different rows and different glyphs; a Brain Power 9 Bulwark gets the ladder's cut, not Barrage. Taking economy away from the weakest solo door is wrong. |
| I | Core Change | KEEP | Swap core −1 AP; no ladder twin. |
| II | Overcharge (`mage.overcharge`) | **REPLACE** | It is a free once-a-fight Overclock, and Overclock is now at Brain Power 2. NEW **Backdraft: "When your Evoker overloads, foes next to you take the same damage."** Built today: `damaged`, if `{self_harm: true, not_damage: [strain, short]}`; `targets {side: foe, within: 1}`; `deal` a flat true-damage amount, per `{of: "event:amount", value: 1}`. It makes the Sigilist the best user of Flux (it pairs with Overflux) and answers melee foes up close. |
| II | Bleed the Flux | KEEP | Vent −1 AP; no ladder twin; it pairs with Clean Vent. **Data defect:** its second effect (`resource flux −1 when vent`) takes Flux after it is already 0, so it does nothing. Build the text instead: after a Vent, flag; the next `glyph_cost` gets `cost_mod` res flux −1. |
| III | Payload | KEEP | Double area; no twin. |
| III | Stored Spell (`scribe.stored_spell`) | KEEP | No twin; it reads Rumination (a kit tie). |

## 6. Special rulings

None of the named rulings (Strain, Rite in the Field, Iron Heart, Rolling Start, the Beast, the Mender, Shadow) are Intelligence's.

The balance note that is Intelligence's is the solo Sigilist: stage 1 cleared in 3 of 12 runs (rules items 3815–3916). This sheet's answers:
- Overclock moves to level 2.
- The second charge cut comes at Brain Power 5.
- Clean Vent and Backdraft deal with foes next to the caster.
- Thinking Aloud and Running Script give tempo.

Lane 4 should measure them with `simRun` before and after.

## 7. Counts and migration

| Skill | Felt / 10 | Most on one level |
|---|---|---|
| Brain Power | 10 (was 9) | 2 (was 3) |
| Rumination | 10 (was 5) | 2 |
| Eloquence | 10 (was 5) | 2 |

Rumination's 2/4/6/8 and Eloquence's 2/6 carry only the per-point line. They are felt by the rule, but thin.

**MIGRATION:**
1. **Brain Power perk steps (3/5/7/9 to 3/6/7/9):** a save keeps every step it holds. A Brain Power 5 save simply holds its second step early; there is no double grant at 6.
2. **Brain Power forks:** they were never offered (both steps sealed), so no save holds one and nothing is needed.
3. **Unlocks (Overclock and the rest):** they are derived from points and only re-keyed; no save holds them.
4. **Sigil study:** it goes per perk step taken (Brain Power: 3/6/7/9), not per level, so a save that already got its level-5 study gets none again at 6.
5. **`burden_of_proof`:** becomes `objection` at the same tier.
6. **Rumination and Eloquence at 3+:** they lose the free Index / Proven Formula / Objection! / Opening Argument (these are now pickable perks) and keep every pick they hold.
7. **Overcharge:** becomes Backdraft. Class moves come from the rank, so no save holds the move.

## 8. Open questions for Leon

1. **Should saves that lose the four free passives be compensated?** Recommended: no. They keep their picks, and the per-point gains now shown on every level cover the loss. A respec system is not worth building for this.
2. **Should the Brain Power charge cut move to 3/5/9?** Recommended: yes. It keeps two things a level, and it is a small, deliberate buff for the weakest solo door.
3. **Should Clean Vent ship without the Flux gate** (a once-a-turn area push and scorch, 0 AP with Bleed the Flux)? Recommended: yes, at base 6 PROVISIONAL, and measure it. Approving N22 later restores "× Flux vented".
4. **Should the Call steps go to [1, 4, 8] for all nine gammas, with stronger Brief numbers?** Recommended: yes. At 3 AP, today's step 1 is a loss of 2 AP.
5. **Should narrator-only Mastered perks get an engine half so Survival players get something at 10?** Recommended: yes, for every beta and gamma, not only Intelligence's.

