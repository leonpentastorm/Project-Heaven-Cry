# Proposal: gameplay fixes (review points 1–4 and 7)

Status: **draft for Leon.** Nothing in the spec or data changes until this is accepted. After acceptance the order is spec → data → validator, as usual. New numbers are marked *(provisional)* and would go into spec section 14.

The five fixes fit together. Skills get voices (1). The Overreach becomes a voice pushing you, and you decide whether to listen (2). Skill points count fully on the dice, so builds show (3). HP shrinks so fights end and conditions matter (4). Class pacing is set to the campaign length (7).

---

## 1. Skills talk

**Problem.** Inner Voice is one hidden roll per scene, for your single highest skill, producing one line. The 27 voices, the heart of the Disco Elysium idea, are a garnish.

**Proposal.**

1. **Every skill with 1+ point has a voice.** Each skill gets a voice card in `skills.json`: persona, what it wants, how it talks, what it never says, and three sample lines. The tone is drawn from the skill's EPCCG speaker, "someone who has far too much of it". Durability talks with Sanchez's swagger; Rumination with Thalatûl's impatience. But it is *your* voice, never that character's. (Playtesters already rejected skills as other people; the voice borrows a register, not an identity.)
2. **Voice hooks.** When the Narrator describes a beat, it also attaches hidden *hooks*: things a skill could notice, each with a TN from the normal ladder. "Analysis 12: the casings are the wrong calibre." The engine checks each player's **passive score = 10 + modifier** against each hook. No roll; the engine owns it.
3. **Lines.** For each player, the passed hooks with the biggest margins (up to **2 per beat**, *provisional*) become private lines in that skill's voice. They show only on that player's screen, as the Inner Voice cards the UI already has.
4. **Voices can be wrong.** Hooks may be bad ideas, half-truths or the skill's own obsession ("Raw Power: the lock is the problem. Break it."). The Narrator flags each hook true, partial or misleading; the player isn't told which.
5. **Ask a skill.** Out of combat, once per scene per skill: click a skill to ask what it thinks. The engine rolls d20 + modifier against the best unrevealed hook for that skill. If it passes, you get the line; if not, the skill shrugs.
6. **Co-op and the human Narrator.** Voice lines are generated with the Narrator's normal batched reply, one short block per player. A human Narrator sees the passed hooks on their screen and writes a line or picks a sample line.

This replaces the scene-start Inner Voice rule.

## 2. Overreach: the voice pushes, you decide

**Problem.** Overreach is a plain d20 against 15/17/19, so it fails 70%/80%/90% of the time. Deliberately failing earns an Echo, so a rational player never rolls. The roll is dead weight, and high-mastery characters farm Echo.

**Proposal.** No roll.

1. When a skill at Mastery 2+ hits its Overreach trigger, that skill **speaks its push** (the trigger text in its voice).
2. The player chooses:
   - **Indulge:** play it out, take the consequence, **gain 1 Echo** (max 3).
   - **Resist:** spend Echo and nothing happens. Costs **1 Echo** at Mastery 2–4 and **2 Echo** when Mastered *(provisional)*.
   - With too little Echo, you indulge.
3. Each skill's Overreach can fire **once per scene** at most.
4. **Starting Echo:** everyone starts each session with **1 Echo** *(provisional)*. Otherwise characters without a Mastery 2 skill never see Echo.
5. Echo still means: spend 1 to reroll any d20 you rolled, at most 1 Echo per roll (settles open item 6).

This is Disco Elysium's "your strengths are your weaknesses" as a choice, not a coin flip. A Mastered skill pushes harder because resisting it costs more.

## 3. Dice: skill points count

**Problem.** The modifier is floor(points ÷ 2), so ten points of investment are worth +7 over untrained: a 35% swing. A starting character's best skill is a coin flip at Standard.

**Proposal.** Keep the d20 and the TN ladder (8/12/16/20). **Modifier = points − 1, and −2 at 0 points.** One point removes the untrained penalty (the EPCCG's own wording), and every point after that is +1.

| Points | Modifier now → proposed | Easy 8 | Standard 12 | Hard 16 | Heroic 20 |
|---|---|---|---|---|---|
| 0 | −2 → −2 | 55% → 55% | 35% → 35% | 15% → 15% | 5% → 5% |
| 1 | +0 → +0 | 65% → 65% | 45% → 45% | 25% → 25% | 5% → 5% |
| 3 | +1 → +2 | 70% → 75% | 50% → 55% | 30% → 35% | 10% → 15% |
| 5 | +2 → +4 | 75% → 85% | 55% → 65% | 35% → 45% | 15% → 25% |
| 7 | +3 → +6 | 80% → 95% | 60% → 75% | 40% → 55% | 20% → 35% |
| 10 | +5 → +9 | 90% → 95% | 70% → 90% | 50% → 70% | 30% → 50% |

Low end unchanged; the payoff for depth roughly doubles. A Mastered skill is now a real specialist.

**Knock-on rules** (all "0.5 × skill" terms become the skill's modifier, floored at 0 where a negative would be odd):

| Rule | Now | Proposed |
|---|---|---|
| Dodge (Defense = 10 + Dodge + cover) | 0.5 × Athletics | Athletics modifier, min 0 |
| Saves (Body / Brain / Heart) | 0.5 × Guts / Charisma / Composure | that skill's modifier |
| Debuff strength | 0.5 × Intimidation / Eloquence / Implication | that skill's modifier, min 0 |
| Counter bonus | 0.5 × Raw Power | Raw Power modifier, min 0 |
| Combined check | add both modifiers, TN +4 | the **lower** modifier +2, TN unchanged (adding two +9s would break it) |
| Critical hit | natural 20, or total ≥ Defense + 10 | **natural 20**; **19–20** on an Aimed shot or an attack from Hidden. With bigger modifiers, "Defense + 10" would make half a master's shots crits |
| Help | +2 | unchanged |

Other skill-based derived stats (ranges, % reductions) keep their per-point rates; they don't touch the d20.

**Alternative considered: 2d6 + points**, as Disco Elysium does. It's a bell curve, so +1 matters most in the middle. But every combat rule, save, death roll and the dice overlay are d20, and 2d6 + 10 can't fail a 12 (so the TN ladder would need rebuilding). Not recommended.

## 4. HP: fights that end

**Problem.** Endurance is +50 HP a point, half the base; Strength is +10% damage. Body 7 / Endurance 7 gives 400 HP at level 1: 14 rifle hits, about 7 turns of focused fire. Bleeding (5/turn) and Burning (10/turn) are noise at that scale.

**Proposal.** Weapon numbers stay; HP comes down.

| Stat | Now | Proposed |
|---|---|---|
| Max HP | 100 + 50 × (Endurance − 1) + (level − 1) × HP per level | 100 + **15** × (Endurance − 1) + (level − 1) × HP per level |
| HP per level | 10 + 5 × Durability | **5 + 2** × Durability |
| Durability per point | +5 HP per level-up | +2 HP per level-up |

| Target (level 1, no armour) | Rifle hits to drop | Turns of focused fire* | Bleeding, 3 rounds |
|---|---|---|---|
| Endurance 1, now and proposed | 4 | ~2 | 15% of HP |
| Endurance 7, now | 14 | ~7 | 4% |
| Endurance 7, proposed | 7 | ~3.5 | 8% |

\* 3 shots a turn at 60% to hit.

The tank still lasts twice as long as everyone else, but no longer four times. Conditions, healing (Soul Buff heals 30) and shields keep their numbers and now matter more. Percentage effects (Second Wind 25%) are unaffected. Self-damage (Mana Short 15 per Strain, Sigil overload 10 per Flux) gets scarier, which fits "a heart that bursts". Last Charge's 100 × Armour Class shield (open item 20) should become 15 × Armour Class.

Mid and high levels still need a playtest pass; this fixes the level 1–5 range the starter mode uses.

## 7. Classes: pacing to the campaign

**On reflection, half my original point was wrong.** Classes do have real identity: each has a resource with rules (Heat, Momentum, Guard, Supplies, Marks, Flux, Strain) and three rank moves. The real problem is **pacing**. Rank III at a signature total of 21, advanced classes at 15 + 9, and an XP curve of 100 × level put most of the class content past where a web-game campaign ends.

Rough pace today, assuming about 300 XP a session (two standard fights, a quest step, a discovery):

| Level | Total XP | Sessions |
|---|---|---|
| 3 (class) | 300 | 1 |
| 5 | 1,000 | ~3 |
| 8 | 2,800 | ~9 |
| 10 | 4,500 | ~15 |
| 12 | 6,600 | ~22 |

A focused build starts with a signature total around 9–10 and gains at most 1 a level, so rank II comes around level 6 and rank III around level 12 (~22 sessions).

**Proposal** (thresholds depend on the campaign length you pick):

| If campaigns are… | Rank II | Rank III | Advanced | XP to next level |
|---|---|---|---|---|
| Short arcs (6–10 sessions) | 12 | 17 | 12 + 8 | 100 + 50 × (level − 1) |
| Long (20+ sessions) | 12 | 18 | 15 + 9 | 100 × level (unchanged) |

Plus two cheap identity fixes:

1. **Leaning from level 1.** The sheet shows "leaning: Vanguard / Duelist" from creation, so the level-3 class feels earned rather than assigned.
2. **The calling.** At level 3 the Narrator stages a short scene where the class arrives (a mentor, a moment under fire). One line in the Narrator brief; no new rules.

---

## What changes where, once accepted

| Fix | Spec sections | Data |
|---|---|---|
| 1 Voices | Core resolution (Inner Voice → Voices), Narrator's job | `skills.json`: 27 voice cards (drafted after acceptance); `rules.json`: voice hooks, passive score, line cap |
| 2 Overreach | Core resolution (Overreach, Echo) | `rules.json`: remove overreach TNs, add indulge/resist costs, session Echo; `skills.json`: Mastery 3/4/Mastered unlock text |
| 3 Dice | Core resolution, Derived stats, Attacks | `rules.json`: modifier formula, combined check, crit rule; `attributes.json`, `skills.json`: 0.5 × terms |
| 4 HP | Derived stats | `rules.json`, `attributes.json`, `skills.json` (Durability); Last Charge in `perks.json` |
| 7 Classes | Classes, Levels and XP | `classes.json` thresholds; `rules.json` XP curve |

Then `python3 tools/validate.py data` must print `0 errors`.
