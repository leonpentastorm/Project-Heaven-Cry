# Outside playtest of 0.31.10 (all nine doors): triage (the lead, 18 Nov 2026)

The reviewer's nine files are in this folder (`00_MASTER_REVIEW_ALL_9_SKILLS.md` is the summary). He played every
alpha skill in Survival; the furthest run was a Breaker to stage 3, stop 12. Scores: seven doors at four stars or
more; Mender three and a half solo. This file sorts his findings: fixed already, to fix (with the lane of
`docs/design/handoffs/_archive/ATTACK-PLAN-2026-11-19.md` that takes it), and what it says about balance. **None of it is
verified by the lead in code yet**: each row is a lead, the builder reproduces it first.

## Probably fixed already (his Dexterity and first Faith runs were on the older build)

| Finding | Fixed in |
| --- | --- |
| Throwables cannot be thrown | 0.31.6 (a Throw row on the Attack tab); its browser check is still owed |
| Mag Dump logs one roll | 0.31.6 |
| Two-handed weapon lockout | 0.31.6 (Stow) |
| Clean Hands stacking | 0.31.6 (he verified the fix on 0.31.10) |
| Strain hidden while it matters | 0.31.9 (always shown while holding); he still sees it folded at fight start |

## To fix: blockers first (new lane 2 order; these go before the "owed fixes")

| # | Finding | Why it matters | Where to look |
| --- | --- | --- | --- |
| 1 | **A stim cannot be used on yourself in a fight** ("Stim an ally" and "Throw a stim" refuse your own tile; the Backpack has no Use). Solo characters died holding 2 to 5 stims. | Solo blocker for every door. The picking lane's guard test said self is a legal throw choice: check the plain Stim action and the click on your own token. | `combat/stim`, descriptors, pickOverlay self-click |
| 2 | **Perk steps and a fork go unclaimed at the start**: a character made with 7 and 3 in skills has 4 perk steps and a fork waiting, and creation never asks; only the camp's "Level up" button shows it. | New players start a run without their perks. | creation's last step or the camp: block "Start the run" behind a prompt |
| 3 | **Evoke can hit yourself**: with a foe standing on your Line, clicking your own end glyph arms a self-target and Confirm stays lit after an invalid click: 64 damage to self. | A trap in the best system. | Sigil evoke aim (`sigilView`, the evoke pick), Confirm's enabled state |
| 4 | **Second Wind (Durability 5: heal 25%) is not on the combat bar**; a boon has the same name. | The tank's only self-heal is missing. Check for an id or name collision between the unlock and `boon.second_wind`. | skills.json durability unlock 5, boons, `storyPerkEntries` |
| 5 | **Parry rolls without Durability while holding Guard** (d20 +2, not +9) and spends the reaction, so Retort never fires. | The Guard door's reaction play is dead. | Parry's roll, `roll_with` on reactions |
| 6 | **Feeling buttons show "0 AP · 2 MP" and charge 1 AP · 5 MP**; the "1 FREE PUMP" badge does not update. | The price shown is wrong (the same class as the 0 AP preview). | heart panel, the one price function |
| 7 | **Break's damage preview is wrong** (shows 12 to 18, deals 59 to 86); the Break toggle stays pressed at 0 Shadow. Momentum preview shows "0 → 0" on a Charge that goes to 5. | Previews that lie. | preview paths of toggles and Charge |
| 8 | **Figment kills and damage are credited to "No one"**; Volatile's blast is not in the log. | Known: the silent data `deal` (Figment audit). | `effects/triggers.ts` deal op, the tally |
| 9 | **Figment design traits have no descriptions** in "+ New design". | Building blind. | figments designer |
| 10 | **Forks picked at camp did not show in the MAGIC tab** (Visualization); "1 spare core" shown with 5 held. | Possible state fault: reproduce. | door picks, core count view |
| 11 | **Ghost Kill triggers on a melee kill in plain sight**; the tab says UNSEEN while "Eye: Seen". | A rule fault. | ingenuity unlock, `sightOf` |
| 12 | **Primed boon (+1 Momentum at fight start) does nothing.** | A dead boon. | boon row, `momentum_start` |
| 13 | "Called Out" says no save; the target still rolls a save. Guard soak reads 7 in one place and 9 in another. Flux limit reads 7 in the header and 6 on the meter. "Needs Lore Master 1 (you have 1)". | Texts and numbers that disagree. | each named view |
| 14 | A blocked reason is printed twice on every action ("Needs 2 AP. · Needs 2 AP."), on all nine doors. | 0.31.6 did not find it: it is in the Chosen action box. | `combat.js` chosen-action reason join |
| 15 | Run Through offers "Leave it in" on a Maul; the Maul's Head Down sits under "Throw · Smoke grenade"; duplicate Begin / Snap rows; the post-Finisher lock blocks Hit but allows Barrel In and Shove. | Menu faults. | technique rows, the chain lock |
| 16 | The Mercy vow is offered in a fight of only machines. Sigil Savant does nothing in Survival. Creation's Moves step says "no techniques and no magic" for an Empathy 7 build. The Empathy page never explains bonding an enemy. Ingenuity's level-up shows no fork section. | Dead or missing explanations. | vows list (the one `canYield`), run scope, creation step 6, forkView for sealed forks |

## What it says about balance (for lane 3's tables, not for a hotfix)

- **Breaker is the strongest door he played** (stage 3, 432-damage Cleaves, 426 Coups; fights won with 0 damage
  taken behind Smoke and Hide). **Rolling Start** makes a 2 to 4 tile Charge cost 0 and go from 0 to 5 Momentum in
  one action. The fork is too generous: lane 3 re-rules it.
- **Rigger:** a Razor Beast at level 2 hits for 47 to 50 with +9 to hit and refunds AP on a kill.
- **Channeler:** 152 Soul damage for 32 MP at level 2 with Rage.
- **Solo sustain:** gunner, tank and Mender all starve for healing alone; finding 1 (self stim) is most of it.
- **Mender solo** is weak (40% to hit with its gun); it leans on bonding an enemy, which the page never explains.
- He rates the Outburst and Momentum loops five stars. Keep their shape; fix their previews.

## Plan

1. Lane 2 of the attack plan becomes: rows 1 to 16 above, in that order, then the earlier owed fixes. Ship as
   0.31.12 (and 0.31.13 if it splits). Each row: reproduce through the reducer or the browser, fix at the cause, a
   test.
2. Lane 3 (the tables) takes the balance notes: Rolling Start, the Beast, solo sustain per door.
3. Lane 1 (the words) takes: rows 13 and 16's texts, the enemy-Bond line on Empathy's page, trait descriptions.
