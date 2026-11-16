# Party fit, 0.30 (why parties lose, and the fit)

> **LEAD NOTE, 16 Nov 2026: read this before measuring or fitting, and keep this block at the top of the file.**
>
> Leon, from the human playtest the night before (co-op Survival on live), verbatim: *"on our human test the night
> before 99% of the deaths was gun firing enemies shooting the shit out of you before you can get into a cover btw,
> pass it to the fixer guy"*.
>
> This is evidence from real players and it outranks the simulator where they disagree. It adds to the tasks of this
> lane:
>
> 1. **Diagnose it as its own cause, with numbers:** in a generated Survival fight, how many enemy gun attacks land on
>    the party before each character has had a first turn, and before each character could have reached cover; the
>    share of all damage taken and of all Downs that happens in round 1 and round 2; the spawn distance between the
>    party and the gun-armed foes; whether the party's start tiles have cover within one move (per Agility 1, 3, 5: at
>    Agility 1 a tile costs 1 AP); who acts first (initiative is by Agility: do the enemy gunners out-roll a slow
>    party?); whether enemies open on Overwatch or with full-AP bursts; how enemy hit chance against a character in
>    the open compares with one in cover. Compare a party of 1, 2 and 4 (more players means more gun-armed foes firing
>    in the opening round at the same few start tiles?). Check the simulator's policies do what a human does (walk to
>    cover first): if the policies stand in the open, the simulator has been hiding this.
> 2. **Fit it with data fields that exist** (data/survival.json and the map/encounter generator's own numbers; read
>    packages/engine/src/run/encounter.ts and the map generator before proposing anything): candidates to measure, not
>    a list to apply blindly: cover on or next to the party's start tiles; the spawn distance or line of sight
>    between the party's start and gun-armed foes; the share of the budget that may be gun-armed in the opening
>    rounds, especially per head; a first-round rule the data already has for ambush or readiness, if any. Do not
>    change enemy weapons' damage or the players' doors in this pass.
> 3. **If the honest fix needs something the data cannot say** (for example "the party always acts before the foes in
>    round 1", "foes start unaware until they see someone", or "start tiles are generated behind cover"), do not build
>    it: write it under "Needs a new primitive" with what it would cost, for the lead.
> 4. **Report it separately** in this file: a section "The opening volley" with the before and after numbers
>    (damage and Downs in rounds 1 and 2, per party size), and say in the hand-back whether the party-budget fit and
>    the opening-volley fit are two causes or one.

> **More from Leon, same day (verbatim):** *"it was because it's on the old tank and the old tank is weak as shit too.
> All deaths that happens that the player stop and said 'did you see what that motherfucker just did to me' was a gun
> drone or two shooting and hit every shot, whether or not that's deserved for standing in the open is debateable but
> some of those happen when the player are standing behind half/full cover too. The OB and sigilist enemy never
> trigger this sort of response from the tester, same as the melee guys, only the gun enemies does"*.
>
> So, in addition:
>
> 5. **The gun drone specifically.** Find the gun-armed drone rows the Survival tables field at stage 1 (and every
>    other gun-armed foe), and for each compute from the data, then confirm by running fights: its attack bonus and
>    hit chance against a level-1 character in the open, behind half cover and behind full cover (state exactly what
>    half and full cover do to an enemy's roll: rules and code, file:line); its shots per turn (enemies still use the
>    old three-roll Burst: rules 1.18 says characters got two rolls and "enemies keep the old three-roll Burst until
>    their table is refitted"; is that what "hit every shot" is?); its damage per turn as a share of a level-1
>    character's HP (HP 100 + 15 x (Endurance - 1)); how many of them a fight fields per head; whether two can focus
>    one character and take them from full to Downed inside one round, and how often that happens in the runs.
>    Compare the same figures for a melee foe, a Sigil foe and an Outburst foe of the same tier: Leon's players never
>    complained about those, so they are the reference for "feels fair".
> 6. **Cover that does not protect.** Reproduce "hit while behind half/full cover" through the reducer: is it flanking
>    (the drone moved or flew to an angle where the cover no longer counts), a drone property that ignores or reduces
>    cover, an elevation rule, a nat-20 rule, the cover bonus being too small against the drone's attack bonus, or the
>    screen showing cover the engine does not count for that line of fire? Each is a different fix; say which it is
>    with a reproduced case. If the screen shows cover the engine does not apply, that is a bug: report it as one.
> 7. **What to fit and what to hand up.** Enemy gun rows' numbers ARE in scope after all for this cause (the earlier
>    line "do not change enemy weapons' damage" is lifted for gun-armed foes only): attack bonus, rolls per Burst,
>    damage, how many per head, and how they open a fight. Target: a character behind cover is rarely hit and a
>    character caught in the open by two drones is hurt badly but not Downed from full HP in one round at stage 1; a
>    gun foe should threaten about what a melee or caster foe of its tier does over a fight. Leon's rule on numbers
>    applies: a target, not a wall. Refitting the enemies' Burst to the characters' two rolls is approved if the data
>    carries it; anything that needs an engine change goes under "Needs a new primitive".

*(The diagnosis and the fit are written below this line by the lane.)*

## 1. Headline (16 Nov 2026, lane 0.30-fit, on head b721970a; measured, no game number changed)

1. **Quads are not the problem; duos are.** At 40 seeds a cell, four of a kind clear stage 1 as often as one alone or
   more often (four Skirmishers 100%, four Channelers 78%, four Chaplains 57% against 30% alone, four Riggers 50%
   against 30%). Every duo clears less than its solo: Breaker 73% to 3%, Monk 65% to 13%, Channeler 80% to 35%,
   Skirmisher 85% to 50%. The quads that lose are melee quads (Breaker 10%, Monk 30%) and doors that already lose alone.
2. **Cause 1, the budget, is a duo problem in one number.** `survival.json pressure_per_char` is `[1.3, 1.7, 1.3, 0.9]`:
   a duo's pressure cap is 31% higher a head than a solo's (a quad's is 31% lower). Setting only the duo's to the
   solo's 1.3 (lever `duopress`) closes **35%** of the duo gap (Skirmisher duo 50% to 83%, Channeler duo 35% to 70%,
   Breaker + Channeler 10% to 38%). Making every term "per head like the solo" (`perhead`) is wrong for quads: it drops
   them 30 to 47 points. The quad budget is easy a head on purpose, and that works.
3. **Cause 2, focus fire, is the biggest part of what is left, and data cannot fix it.** The foes put 67 to 82% of
   their attacks on one member of a duo (an even split would be 50%) and 42 to 67% on one member of a quad (even: 25%).
   A duo member is Downed 0.3 to 0.6 times a fight, against 0.02 to 0.04 alone. The residual after every lever, about
   **55%** of the duo gap, is here and in melee crowding (item 5). No lever built from data moves it.
4. **Cause 3, cooperation, is small.** A shared focus target closes **4%** of the duo gap. Friendly fire is 0 for every
   caster party: the four-Sigil 0% is not friendly fire, since one Sigilist clears 3% alone. Friendly fire is 5 to 7% of
   the damage a Breaker or Breaker-led party takes (Sweep and Cleave arcs).
5. **Cause 4, map and spawn, is about 1%.** Duo maps are already 16 to 17 tiles, the solo's size, and putting quads on
   16 tiles makes them worse (-55 points summed). **Cause 5, rewards and XP, is 0%** at stage 1: XP and credits are each
   character's own, and the level at the Boss is 2.5 to 3.0 for every party size. What does bite is the **walk-on at
   1 HP** (`run.dead_return_hp`): 10 to 25% of party fights start with a member at 10% HP or less. Standing up at 50 HP
   instead closes **5%** of the duo gap, and 13 points for four Monks.
6. **Four doors lose alone whatever the party.** The controls in section 3 show it is the door, not its policy:
   Bulwark 0% (its tank-policy control 3%), Operative 0% (gun control 0%), Mender 3% (gun control 0%), Sigilist 3%. No
   party fit helps them; they need their own fit.
   **Corrected 16 Nov 2026 (the lead's review; section 10): this verdict rested partly on a policy gap, not on the
   doors.** In the Bulwark and Mender cells most of the runs that did not clear were not lost but stalled (solo Bulwark
   21 lost / 19 stalled, solo Mender 16 / 23), and every stalled Bulwark run and 20 of the 22 stalled Mender runs on the
   lead's own seeds (5001 to 5040) ended with `ammo 0 w drifter_revolver`: the tank and Mender policies (and the tank control) Raised
   Shield or ended the turn for 14 rounds and more once the revolver was dry, and never punched, picked a weapon up or
   switched. Re-measured with a dry-gun fallback (the fists): the Mender is **not** a door that loses whatever the
   party (two Menders 63%, four 63%, Bulwark + Mender 53%; ~~alone still 15%~~); ~~the Bulwark alone still loses (3%, its
   control 5%)~~ as does the Operative (0%) and the Sigilist (3%). No door number should move on the strength of the
   earlier cells.
   **Corrected again 16 Nov 2026 (section 11, the lead's rulings R1 to R4: the pinned yardstick, the softer gun profile,
   a fallback for every policy):** alone the Mender clears 25% (13 of its 40 runs still stall, every one a fist
   stalemate, none an idle turn), the Bulwark 8% (its control 10%), the Operative 0% (no stall left: 40 lost), the
   Sigilist 3%. Stalled runs in the ten solo rows: 14 of 400 (section 3: 55; section 10: 27).

## 2. The simulator (what was added)

All of it is test code under `packages/engine/test/balance/`. Every action goes through the reducer (`Rec.fight`, `simRun`).

* `door-builds.ts`: an all-in member for each door and the monk, built legally by `builds.ts` (char/add, levelup/*):
  Bulwark `wall` (Living Wall, Durability 7); Breaker `opt_blade` allin (Raw Power 7); Skirmisher `plain_gun` allin
  (Dexterity 7); Operative `phantom` (new; archetypes.json phantom: Ingenuity 7, Vigilant 3); Sigilist `sigil` allin;
  Rigger `rigger` allin; Mender `heartreader` (new; archetypes.json heartreader: Empathy 7, Camaraderie 3); Channeler
  `outburst` allin; Chaplain `faith` allin; the monk is `opt_blade` allin with the camp's Hand wraps. Gear is the camp's
  Recommended loadout (`loadout.recommended`), the same a player gets.
* `door-policies.ts`. Every policy reloads tactically and keeps the speedloader; with speed reloads the revolver doors
  ran dry in long fights.

| Door | What it does | What it never does |
|---|---|---|
| Bulwark | The tank policy: attack, and keep the last AP for the Guard technique or Brace. With an ally, it first walks beside the lowest ally it can reach, so Close Guard answers for that ally by itself. Challenge once a turn with an ally and Guard 2+; Slam once a turn with a non-Boss foe adjacent and Guard 3+ | Draw Fire, Interpose or Retort by choice |
| Breaker | The optimised policy (best expected damage per AP), with Finishers held until Momentum is 3 (or full) | Launch, Shove, the class Lunge |
| Skirmisher | The gunner policy (Brace, Bead, best shot per AP, Vent). Pressure builds from its hits. Slide once a turn with an AP left while a foe can shoot it | Overwatch, Flush, Fire Discipline |
| Operative | When seen: Hide where it stands, else walk to a tile no foe sees (the engine's `hideBlock` on that tile) and Hide there. Hidden with Shadow: Tag first if it can still pay for the shot, then shoot with Break. Hidden with no Shadow and AP for only one shot: wait Hidden. Otherwise the gunner. Ghost Kill fires by itself | Lift, Fade, the Work and Slip verbs, Vanish, Mark |
| Sigilist | `sigilRun` (run-policies.ts): a Line across the way to the target, area words on clusters, the pistol with spare AP | traps, fields, Boons, Workings |
| Rigger | `rigger`: Picture a Beast and a Wall, order them to strike or close in, swap the core. It also Cashes in an idle Figment when under half HP | Redraw, Glimmer |
| Mender | Mend the lowest ally under 60% (or Mend Self). Tug a Bonded ally that is Downed or under 30% toward itself. Bond every ally, then the nearest foe that is not a machine. Snap a Bonded foe once a turn. Otherwise the gun | Touch, Settle, Soothe, Shield, Raise, Guide; it never Snaps an ally |
| Channeler | `outburstRun`: Begin, Pump with the best feeling, Release at the stage that drops a foe | Steady, Let go, Crystallise |
| Chaplain | The Canticle first each turn once it is a Chaplain; the highest damaging Hymn within standing; Rebuke; the weapon | the Miracle, Ward, Smite, prayer above Devotion |
| Monk | The optimised policy. Once a turn its opening blow carries Sweep on a non-Boss foe that is not Prone, when two plain blows still fit after it. Breath once a turn with an AP that buys no blow | Jab, Palm, Snatch, a form on a Flurry |

  The verb audit (accepted actions by kind, 4 seeds a solo) shows each door playing its own verbs: Bulwark Slam 79,
  Guard 119; Operative Hide 48, Break 17, Tag 6; Rigger Picture 91, Figment strikes 173; Mender Mend Self 65, Bond 30,
  Snap 21; Channeler Pumps with six feelings; Chaplain Rebuke 55, Hymn 38; Monk Sweep, Breath. Not seen at stage 1: a
  Breaker Finisher and the Canticle (both come with the class at level 3, after the gate), and Challenge in a solo (by
  design). **A strawman I caught:** the first monk policy put a form on every blow (Sweep is +1 AP and x0.4). It cleared
  3% against 68% for the plain control. It was rewritten as above and now clears 65%.
* `party-fit.ts` / `party-fit.test.ts`: the cells, the instrument (the hook bus, real actions only), the levers and the
  tables. Opt-in: `PARTY_FIT=1 PF_CELLS=... PF_SEEDS=40 PF_LEVER=none|perhead|duopress|focus|smallmap|revive
  PF_OUT=x.json`, then `PF_REPORT=a.json,b.json PF_REPORT_OUT=r.md`. A lever changes data in memory for one measure only,
  never the data files. The only change to `policies.ts` is that it now exports four helpers it already had.

**Seeds and spread:** 40 seeds a cell (PF-1 to PF-40), stage 1 only, the gear route. A clear rate's standard error is
at most 7.9 points (at 50%), so a cell is good to about +-8 points (one SE), and a difference between two cells needs
about 20 points before it is sure. The levers run on the same 40 seeds as the baseline (paired), which narrows the
differences.

## 3. Solo and party tables

| Door | Solo | Duo | Quad | Rounds a plain fight: solo / duo / quad | Damage taken a head a fight | Focus share duo / quad | Downs a fight |
|---|---|---|---|---|---|---|---|
| bulwark | 0% ± 0 | 0% ± 0 | 0% ± 0 | 6.8 / 7.3 / 7.4 | 73.7 / 82.9 / 64.4 | 67% / 47% | 0.22 / 0.78 / 1.18 |
| breaker | 73% ± 7 | 3% ± 2 | 10% ± 5 | 2.8 / 3.4 / 4.2 | 21.8 / 38.7 / 40.4 | 77% / 51% | 0.04 / 0.61 / 1.54 |
| skirmisher | 85% ± 6 | 50% ± 8 | 100% ± 0 | 2.6 / 2.7 / 2.7 | 16.4 / 23.9 / 12.3 | 82% / 67% | 0.02 / 0.29 / 0.21 |
| operative | 0% ± 0 | 0% ± 0 | 0% ± 0 | 8.1 / 7.7 / 7.5 | 45.8 / 57.8 / 63.7 | 67% / 44% | 0.29 / 1.25 / 3.7 |
| sigilist | 3% ± 2 | 0% ± 0 | 0% ± 0 | 3.9 / 6.6 / 7.4 | 56.4 / 59 / 62 | 69% / 42% | 0.39 / 1.2 / 3.51 |
| rigger | 30% ± 7 | 10% ± 5 | 50% ± 8 | 4.9 / 6.6 / 7.9 | 26 / 33.3 / 21.2 | 79% / 61% | 0.11 / 0.51 / 0.66 |
| mender | 3% ± 2 | 5% ± 3 | 18% ± 6 | 7.5 / 8.4 / 9 | 172.5 / 147.2 / 108.8 | 70% / 48% | 0.14 / 0.39 / 0.37 |
| channeler | 80% ± 6 | 35% ± 8 | 78% ± 7 | 2.5 / 3 / 3.2 | 19.6 / 28.5 / 19.8 | 80% / 61% | 0.02 / 0.51 / 0.58 |
| chaplain | 30% ± 7 | 20% ± 6 | 57% ± 8 | 2.5 / 2.4 / 2.9 | 27.9 / 27.5 / 19.5 | 80% / 57% | 0.12 / 0.45 / 0.68 |
| monk | 65% ± 8 | 13% ± 5 | 30% ± 7 | 3.8 / 4.3 / 5.4 | 23.7 / 35 / 30.5 | 74% / 50% | 0.04 / 0.59 / 1.2 |

Controls (the same sheet without its door): Bulwark played by the tank policy 3%; Operative played by the gunner 0%;
Mender played by the gunner 0%; Monk with plain blows 68%; the guard's own gunner (plain_gun, normal share) 55% (the
0.29 report had 54%). *(The Bulwark, Mender and Bulwark-control rows of this section stalled on a dry revolver; section
10 re-measures them with a dry-gun fallback: they are not door results as printed here.)*

Mixed parties (stage-1 clear rate; the solo reference is the mean of the members' solo rates):

| Party | Solo reference | Clear | Focus share | Friendly fire (share of damage) | Healed a fight (wasted) |
|---|---|---|---|---|---|
| Bulwark + Skirmisher | 43% | 23% | 78% | 0% | 0.2 |
| Bulwark + Mender | 1% | 0% | 70% | 0% | 199 (0%) |
| Skirmisher + Mender | 44% | 55% | 75% | 0% | 65 (0%) |
| Bulwark + Skirmisher + Mender + Sigilist | 23% | 57% | 55% | 0% | 120 (0%) |
| Breaker + Channeler | 76% | 10% | 82% | 7% | 7 (2%) |
| Operative + Rigger | 15% | 0% | 75% | 0% | 0 |
| Chaplain + Monk | 48% | 10% | 81% | 0% | 0 |
| Breaker + Operative + Channeler + Chaplain | 46% | 30% | 60% | 1% | 8 (1%) |

The Mender wastes none of its healing (0% over a full bar), and it does keep a gunner alive: Skirmisher + Mender beats
its solo reference. But it cannot win a fight by itself (it stalls), and it does not rescue a Bulwark.

## 4. Why a party does worse: the causes, measured

Shares are of the **duo gap**: the solo reference less the party, summed over the nine two-member cells where the
party did worse (356 points). Each lever ran on the same seeds as the baseline.

| Cause | How measured | Share of the duo gap | Quads |
|---|---|---|---|
| 1. The budget grows faster than the party | `duopress`: only `pressure_per_char[1]` set to the solo's 1.3 | **35%** (+123 points) | `perhead` (every term at the solo's a head) costs quads 30 to 47 points: their budget is already easier a head, and should stay that way |
| 2. Enemy focus fire / action economy | No data lever; focus share, Downs, damage a head | **The residual, about 55%** | Focus share 42 to 67% (even: 25%); Downs a fight 0.2 to 3.7 |
| 3. Policies not cooperating | `focus` (every member shoots the party's one target, the foe lowest on HP); friendly fire on the hook bus | **4%** (+14); friendly fire 0 for casters, 5 to 7% of damage taken for Breaker parties | +10 four Breakers, +20 four Channelers |
| 4. Map size and spawn distance | `smallmap` (every map 16 tiles) | **1%** (+5) | Worse on 16 tiles (-55 summed) |
| 5. Rewards and XP split; walking on hurt | Level at the Boss; `revive` (a Downed member of a won fight stands up at 50 HP, not 1) | XP 0%; walk-on **5%** (+17) | Four Monks +13 |

What the residual looks like: a Breaker duo takes 39 damage a head a fight against 22 alone (+78%), and a Skirmisher
duo 24 against 16 (+46%). The number of foes a head is the same (1.8), but more of them carry guns (1.0 a head against
0.7), and one member takes three quarters of the shots. The foes' turns before a character's first turn rise with the
party (about 1 solo, about 2.3 in a duo, about 3.3 in a quad): every extra foe is another opening shot. Melee pairs do
worst (Breaker, Monk, Breaker + Channeler, Chaplain + Monk): the two blades walk into the same guns, and the Breaker's
arcs hit its partner. Gun-led and caster-led quads spread the shots and win.

## 5. The opening volley (the lead's note): what this pass measured

Not finished: the gun-drone rows, the cover-against-roll arithmetic and the "hit behind cover" reproduction (items 5 to
7 of the note) are **not done** in this pass. What the instrument does show (every cell is in the appendix):

* Guns deal **73 to 90%** of all the damage the party takes (melee 4 to 21%, casters 3 to 16%). The one exception is the
  Sigilist, who walks its Lines into melee range: 60% of its damage comes from melee foes (14 melee attacks a fight).
* Gun hit chance on the party is 41 to 66% (melee 42 to 69%, casters 47 to 92%). Guns hit no more often than melee;
  they simply make most of the attacks (3 to 7 a fight a head).
* Rounds 1 and 2 hold **63 to 91%** of the damage taken and 45 to 89% of the Downs in the cells that win (fights last 2.5
  to 4 rounds). The spawn distance to the nearest gun is 5 to 9 tiles, inside a rifle's range, so guns fire from round 1.
* Foe turns before each character's first turn: about 1 solo, 2.3 in a duo, 3.3 in a quad. More players means more
  foes shooting at the same start tiles before anyone has moved.

So the playtest's report about gun enemies is consistent with these numbers, and it runs on the same mechanism as
cause 2 (focus fire on the opening tiles). Whether it is one cause with the party fit or a second one needs the cover
reproduction, which is this lane's next step.

## 6. What to change, by data field (proposals; nothing was changed in this pass)

1. `survival.json pressure_per_char`: `[1.3, 1.7, 1.3, 0.9]` to **`[1.3, 1.3, 1.3, 0.9]`**. Measured: it closes 35% of
   the duo gap and changes no quad cell. The trio's 1.3 is unmeasured (there is no trio cell); measure it before
   trusting it.
2. Keep the quad's 0.9 and its `share` and `max_foes` rows: `perhead` shows quads need them.
3. `survival.json run.dead_return_hp`: 1 to about **50**. Measured: +5% of the duo gap, +13 points for four Monks. A
   share of max HP would also work if the lead prefers; that is a data field, not a primitive, if the same line reads it.
4. The opening volley. Candidates to measure next (not measured yet): `layout.start_cover_reach` 3 to 1 (cover beside
   the start), `map_size.squad_cols` (a deeper start), and the enemy gun rows' rolls per Burst (rules 1.18's refit).
5. The four doors that lose alone (Bulwark, Operative, Mender, Sigilist) need their own fit; this is not a party number.
   *(Section 10: the Bulwark and Mender rows were partly a policy gap. Re-measured with the fallback, the Mender wins in
   a party (63% as two or four) and loses alone (15%); the Bulwark loses alone (3%). Raising Bulwark or Mender damage
   should wait for a door fit measured with that fallback, not this table.)*

## 7. Needs a new primitive (not built)

1. **Spread the enemy's targets.** The residual cause (focus fire, 55% of the duo gap) is the enemy AI's choice of
   target. No data field today says "a foe prefers a target its side is not already shooting". The closest pieces in
   ENGINE-HOOKS are Taunt and `noteTended` (the AI reads who heals). A target-spread weight would be an AI scoring term
   read from enemies.json. Cost: one AI term and its data field.
2. **Arcs that spare allies.** Sweep and Cleave hit the partner (5 to 7% of a Breaker party's damage taken). If the
   technique data has no ally filter on its area, it needs one; check the targets in `techniques.json` first.
3. **The opening:** "the party acts before the foes in round 1" or "start tiles behind cover", if the cover measure
   shows the data cannot say it.

## 8. Appendix: the full tables (the party-fit.ts report, every lever)


| Cell | N | Runs | Clear stage 1 (± SE) | Lost / stalled | Fights | Rounds: plain, Elite, Boss | Foes a head | Gun foes a head | Map | Spawn distance (to a gun) | Foe turns before a character's first | Enemy attacks a round a head | Damage taken a head a fight | Same, a round | Rounds 1-2: share of damage, of Downs; attacks a head; hit % | Downs a fight | Focus share | Friendly fire a fight (share) | Healed a fight (wasted) | AP left a turn | Level at the Boss | Downed first |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| solo_bulwark | 1 | 40 | 0% ± 0 | 21 / 19 | 2.4 | 6.8, 10, - | 1.84 | 0.58 | 16 | 4.2 (5.2) | 1.2 | 2.54 | 73.7 | 8.4 | 31%, 5%; 5.4; 49% | 0.22 | - | 0 (0%) | 0.3 (0%) | 1 | - | bulwark 21 |
| solo_breaker | 1 | 40 | 73% ± 7 | 11 / 0 | 7.8 | 2.8, 2.5, 3.4 | 1.69 | 0.72 | 16 | 5 (5.4) | 1 | 1.33 | 21.8 | 7.4 | 89%, 45%; 3.6; 62% | 0.04 | - | 0 (0%) | 0.7 (33%) | 0.6 | 2.8 | breaker 11 |
| solo_skirmisher | 1 | 40 | 85% ± 6 | 6 / 0 | 8.4 | 2.6, 3.1, 4.1 | 1.66 | 0.75 | 16 | 7.3 (7.8) | 0.7 | 1.06 | 16.4 | 5.4 | 88%, 83%; 2.7; 49% | 0.02 | - | 0 (0%) | 0.5 (41%) | 0.3 | 2.9 | skirmisher 6 |
| solo_operative | 1 | 40 | 0% ± 0 | 27 / 13 | 2.4 | 8.1, 15.3, - | 1.86 | 0.6 | 16 | 4.5 (5) | 1.1 | 1.6 | 45.8 | 6.3 | 38%, 11%; 3.9; 59% | 0.29 | - | 0 (0%) | 0 (-) | 1.8 | - | operative 27 |
| solo_sigilist | 1 | 40 | 3% ± 2 | 39 / 0 | 2.5 | 3.9, 3.5, 5 | 1.91 | 0.57 | 16 | 4.9 (5.6) | 1.1 | 2.85 | 56.4 | 12.7 | 50%, 23%; 6.4; 59% | 0.39 | - | 0 (0%) | 0 (-) | 0.6 | 3 | sigilist 39 |
| solo_rigger | 1 | 40 | 30% ± 7 | 28 / 0 | 6 | 4.9, 5.1, 6.2 | 1.7 | 0.63 | 16 | 5.3 (6) | 1 | 0.88 | 26 | 5.5 | 50%, 22%; 2.2; 56% | 0.11 | - | 0 (0%) | 0.1 (0%) | 0.3 | 2.9 | rigger 27 |
| solo_mender | 1 | 40 | 3% ± 2 | 16 / 23 | 2.8 | 7.5, 13, 12 | 1.86 | 0.6 | 16 | 4.3 (5.5) | 1.2 | 2.43 | 172.5 | 14.3 | 19%, 0%; 5.4; 58% | 0.14 | - | 0 (0%) | 142.4 (0%) | 2.4 | 2 | mender 16 |
| solo_channeler | 1 | 40 | 80% ± 6 | 8 / 0 | 8.1 | 2.5, 2.5, 3.1 | 1.68 | 0.74 | 16 | 5.2 (6) | 1 | 1.2 | 19.6 | 7.1 | 91%, 63%; 3.1; 62% | 0.02 | - | 0 (0%) | 5.6 (7%) | 0.4 | 2.9 | channeler 8 |
| solo_chaplain | 1 | 40 | 30% ± 7 | 28 / 0 | 5.9 | 2.5, 3.6, 4.7 | 1.7 | 0.7 | 16 | 5.7 (6.6) | 0.9 | 1.08 | 27.9 | 8.7 | 81%, 89%; 2.8; 66% | 0.12 | - | 0 (0%) | 0.6 (40%) | 0.7 | 2.8 | chaplain 28 |
| solo_monk | 1 | 40 | 65% ± 8 | 14 / 0 | 7.8 | 3.8, 5.1, 4.9 | 1.67 | 0.7 | 16 | 4.9 (5.5) | 1 | 1.42 | 23.7 | 5.5 | 69%, 64%; 3.7; 55% | 0.04 | - | 0 (0%) | 1.6 (37%) | 0.1 | 2.9 | monk 14 |
| duo_bulwark | 2 | 40 | 0% ± 0 | 23 / 17 | 2.2 | 7.3, 10.7, - | 1.89 | 0.72 | 17.3 | 5.2 (7.5) | 2.4 | 2.09 | 82.9 | 9.1 | 34%, 9%; 5.5; 43% | 0.78 | 67% | 0 (0%) | 0.3 (0%) | 0.4 | - | bulwark 34 |
| duo_breaker | 2 | 40 | 3% ± 2 | 39 / 0 | 4 | 3.4, 4.9, 6 | 1.81 | 0.99 | 16.9 | 5.8 (7.7) | 2.3 | 1.49 | 38.7 | 10.3 | 76%, 65%; 4.2; 57% | 0.61 | 77% | 5.9 (7%) | 0.3 (32%) | 0.6 | 3 | breaker 63 |
| duo_skirmisher | 2 | 40 | 50% ± 8 | 20 / 0 | 7 | 2.7, 3.9, 3.8 | 1.76 | 1.07 | 16.7 | 8.3 (9.2) | 1.4 | 1.03 | 23.9 | 6.8 | 79%, 63%; 2.8; 46% | 0.29 | 82% | 0 (0%) | 0.4 (22%) | 0.2 | 3 | skirmisher 51 |
| duo_operative | 2 | 40 | 0% ± 0 | 37 / 3 | 2.1 | 7.7, -, - | 1.96 | 0.73 | 17.4 | 5 (7.5) | 2.5 | 2.07 | 57.8 | 9.1 | 48%, 23%; 5.6; 57% | 1.25 | 67% | 0 (0%) | 0 (-) | 1.1 | - | operative 45 |
| duo_sigilist | 2 | 40 | 0% ± 0 | 40 / 0 | 2.3 | 6.6, 4.5, - | 1.87 | 0.77 | 17.2 | 5 (7.2) | 2.4 | 2.25 | 59 | 11.1 | 52%, 39%; 6.2; 54% | 1.2 | 69% | 0 (0%) | 0 (-) | 0.6 | - | sigilist 59 |
| duo_rigger | 2 | 40 | 10% ± 5 | 36 / 0 | 4.7 | 6.6, 8.6, 11.3 | 1.77 | 1 | 16.8 | 5.8 (7.7) | 2.1 | 0.58 | 33.3 | 4.6 | 39%, 25%; 1.5; 58% | 0.51 | 79% | 0 (0%) | 0.1 (0%) | 0.4 | 2.6 | rigger 48 |
| duo_mender | 2 | 40 | 5% ± 3 | 18 / 20 | 3.5 | 8.4, 14.2, 16 | 1.81 | 0.93 | 17 | 5.3 (7.1) | 2.3 | 1.99 | 147.2 | 13.3 | 27%, 25%; 5.7; 56% | 0.39 | 70% | 0 (0%) | 251.3 (0%) | 2 | 2.5 | mender 25 |
| duo_channeler | 2 | 40 | 35% ± 8 | 26 / 0 | 5.8 | 3, 3.8, 3.4 | 1.77 | 1.01 | 16.8 | 5.3 (7.1) | 2.3 | 1.06 | 28.5 | 8.2 | 83%, 61%; 2.9; 57% | 0.51 | 80% | 0 (0%) | 13.5 (4%) | 0.7 | 2.8 | channeler 63 |
| duo_chaplain | 2 | 40 | 20% ± 6 | 32 / 0 | 5.1 | 2.4, 3.9, 4.6 | 1.78 | 1 | 16.8 | 6.5 (7.8) | 1.9 | 1.06 | 27.5 | 8.7 | 85%, 74%; 2.8; 59% | 0.45 | 80% | 0 (0%) | 0 (73%) | 0.7 | 2.5 | chaplain 55 |
| duo_monk | 2 | 40 | 13% ± 5 | 35 / 0 | 4.7 | 4.3, 6.3, 7.6 | 1.78 | 0.97 | 16.8 | 5.8 (7.3) | 2.3 | 1.58 | 35 | 7.4 | 62%, 49%; 4.5; 49% | 0.59 | 74% | 0 (0%) | 0.5 (17%) | 0.1 | 3 | monk 64 |
| quad_bulwark | 4 | 40 | 0% ± 0 | 12 / 28 | 2.4 | 7.4, 15.3, - | 1.47 | 0.58 | 21.9 | 6.1 (8.5) | 3.6 | 1.3 | 64.4 | 5.9 | 32%, 4%; 3.5; 44% | 1.18 | 47% | 0 (0%) | 0 (-) | 0.3 | - | bulwark 29 |
| quad_breaker | 4 | 40 | 10% ± 5 | 36 / 0 | 4.5 | 4.2, 6.2, 4.5 | 1.27 | 0.69 | 21 | 7 (8.9) | 3.1 | 1.29 | 40.4 | 8.3 | 64%, 52%; 3.8; 58% | 1.54 | 51% | 8.9 (5%) | 0.4 (0%) | 0.8 | 2.8 | breaker 93 |
| quad_skirmisher | 4 | 40 | 100% ± 0 | 0 / 0 | 8.9 | 2.7, 3.5, 3.6 | 1.19 | 0.72 | 20.3 | 10.8 (11.6) | 1.9 | 0.66 | 12.3 | 3.8 | 83%, 76%; 1.8; 40% | 0.21 | 67% | 0.3 (1%) | 0 (-) | 0.3 | 2.9 | skirmisher 54 |
| quad_operative | 4 | 40 | 0% ± 0 | 33 / 7 | 1.8 | 7.5, -, - | 1.53 | 0.59 | 22.1 | 5.6 (8) | 3.9 | 1.3 | 63.7 | 7 | 32%, 13%; 3.5; 56% | 3.7 | 44% | 0 (0%) | 0 (-) | 1.4 | - | operative 54 |
| quad_sigilist | 4 | 40 | 0% ± 0 | 40 / 0 | 2.2 | 7.4, 6.7, - | 1.46 | 0.57 | 21.9 | 6 (8.3) | 3.6 | 1.72 | 62 | 9.3 | 45%, 33%; 5; 59% | 3.51 | 42% | 0 (0%) | 0 (-) | 0.8 | - | sigilist 70 |
| quad_rigger | 4 | 40 | 50% ± 8 | 17 / 3 | 7.3 | 7.9, 10, 10.7 | 1.25 | 0.71 | 20.6 | 7 (8.8) | 3.1 | 0.31 | 21.2 | 2.2 | 25%, 18%; 0.8; 52% | 0.66 | 61% | 0 (0%) | 0.1 (7%) | 0.4 | 2.8 | rigger 77 |
| quad_mender | 4 | 40 | 18% ± 6 | 5 / 28 | 4.4 | 9, 13.5, 14 | 1.31 | 0.65 | 21.1 | 6.1 (8.3) | 3.3 | 1.29 | 108.8 | 8.4 | 24%, 20%; 3.8; 54% | 0.37 | 48% | 0 (0%) | 381 (0%) | 2.1 | 2.7 | mender 21 |
| quad_channeler | 4 | 40 | 78% ± 7 | 8 / 1 | 8 | 3.2, 3.5, 3.1 | 1.2 | 0.72 | 20.4 | 6.3 (8) | 3.2 | 0.72 | 19.8 | 5.6 | 79%, 57%; 2; 53% | 0.58 | 61% | 0 (0%) | 25 (2%) | 1 | 2.9 | channeler 80 |
| quad_chaplain | 4 | 40 | 57% ± 8 | 17 / 0 | 7.5 | 2.9, 4.4, 4 | 1.23 | 0.72 | 20.5 | 7.4 (9.1) | 2.8 | 0.67 | 19.5 | 5 | 74%, 67%; 2; 53% | 0.68 | 57% | 0.3 (0%) | 0 (-) | 0.9 | 2.9 | chaplain 84 |
| quad_monk | 4 | 40 | 30% ± 7 | 28 / 0 | 6.5 | 5.4, 7.8, 6.5 | 1.22 | 0.71 | 20.7 | 6.9 (8.7) | 3.1 | 1.26 | 30.5 | 4.8 | 51%, 42%; 3.8; 47% | 1.2 | 50% | 0 (0%) | 1.3 (1%) | 0.2 | 3 | monk 106 |
| mix_tank_gun | 2 | 40 | 23% ± 7 | 29 / 2 | 5.9 | 3.8, 5.7, 7.4 | 1.78 | 1.04 | 16.8 | 7.8 (9) | 1.7 | 1.34 | 37.2 | 7.2 | 59%, 35%; 3.8; 45% | 0.41 | 78% | 0 (0%) | 0.2 (55%) | 0.3 | 2.8 | skirmisher 34, bulwark 17 |
| mix_tank_heal | 2 | 40 | 0% ± 0 | 18 / 22 | 3 | 9.2, 11.3, - | 1.82 | 0.85 | 17.1 | 4.7 (6.9) | 2.4 | 2.09 | 137.2 | 11.5 | 27%, 6%; 5.7; 49% | 0.43 | 70% | 0 (0%) | 199.4 (0%) | 1.1 | - | mender 19, bulwark 4 |
| mix_gun_heal | 2 | 40 | 55% ± 8 | 17 / 1 | 7 | 3.7, 5.3, 6.9 | 1.79 | 1.04 | 16.8 | 6.8 (8) | 1.9 | 1.3 | 45.8 | 9.3 | 60%, 43%; 3.7; 50% | 0.2 | 75% | 0.1 (0%) | 64.5 (0%) | 0.4 | 2.9 | mender 24, skirmisher 9 |
| mix_tgh_caster | 4 | 40 | 57% ± 8 | 5 / 12 | 7.2 | 6.1, 7.9, 7.3 | 1.23 | 0.71 | 20.5 | 8.5 (9.6) | 2.7 | 1.01 | 44.9 | 6 | 45%, 36%; 3.3; 47% | 0.46 | 55% | 0.2 (0%) | 119.9 (0%) | 0.9 | 2.9 | sigilist 33, skirmisher 17, mender 10 |
| mix_breaker_channeler | 2 | 40 | 10% ± 5 | 36 / 0 | 4.8 | 3.3, 4.3, 6 | 1.8 | 0.97 | 16.9 | 5.5 (7.4) | 2.3 | 1.24 | 32.3 | 8.5 | 79%, 72%; 3.6; 59% | 0.68 | 82% | 4.6 (7%) | 6.9 (2%) | 0.7 | 2.8 | breaker 48, channeler 22 |
| mix_operative_rigger | 2 | 40 | 0% ± 0 | 36 / 4 | 3.1 | 6.4, 9.3, - | 1.83 | 0.85 | 17.1 | 5.5 (7.7) | 2.3 | 1.03 | 40 | 5.8 | 36%, 18%; 2.5; 55% | 0.85 | 75% | 0 (0%) | 0 (-) | 0.9 | - | rigger 33, operative 12 |
| mix_chaplain_monk | 2 | 40 | 10% ± 5 | 36 / 0 | 5 | 3.1, 4.8, 5.3 | 1.78 | 1 | 16.8 | 6 (7.6) | 2.2 | 1.37 | 32 | 8.2 | 75%, 61%; 3.8; 52% | 0.51 | 81% | 0 (0%) | 0 (97%) | 0.4 | 3 | monk 31, chaplain 23 |
| mix_four_rest | 4 | 40 | 30% ± 7 | 24 / 4 | 5.4 | 4.1, 5.8, 5.1 | 1.26 | 0.69 | 20.8 | 6.4 (8.2) | 3.2 | 0.88 | 31.3 | 5.5 | 60%, 42%; 2.7; 56% | 1.56 | 60% | 1.2 (1%) | 7.7 (1%) | 1 | 2.9 | breaker 68, chaplain 16, channeler 15, operative 1 |
| ctl_bulwark_tank | 1 | 40 | 3% ± 2 | 15 / 24 | 2.9 | 7.7, 10.8, 15 | 1.86 | 0.59 | 16 | 4.3 (5.3) | 1.2 | 2.47 | 58.1 | 6.5 | 32%, 7%; 5.3; 46% | 0.13 | - | 0 (0%) | 0.7 (0%) | 2.5 | 2 | bulwark_plain 15 |
| ctl_operative_gun | 1 | 40 | 0% ± 0 | 38 / 2 | 1.5 | 3.4, -, - | 1.7 | 0.63 | 16 | 4.5 (5) | 1.2 | 2.06 | 76.3 | 13.7 | 52%, 18%; 5.2; 60% | 0.63 | - | 0 (0%) | 0 (-) | 1.1 | - | operative_gun 38 |
| ctl_mender_gun | 1 | 40 | 0% ± 0 | 40 / 0 | 1.7 | 4.7, -, - | 1.74 | 0.63 | 16 | 4.4 (5.1) | 1.1 | 2.28 | 70.1 | 13.9 | 56%, 23%; 5.9; 59% | 0.59 | - | 0 (0%) | 0 (-) | 1.4 | - | mender_gun 40 |
| ctl_monk_plain | 1 | 40 | 68% ± 7 | 13 / 0 | 7.7 | 3.7, 5, 4.7 | 1.68 | 0.69 | 16 | 4.8 (5.4) | 1.1 | 1.41 | 24.1 | 5.6 | 68%, 46%; 3.8; 57% | 0.04 | - | 0 (0%) | 1.6 (37%) | 0.4 | 2.9 | monk_plain 13 |
| ctl_gunner_normal | 1 | 40 | 55% ± 8 | 18 / 0 | 7.3 | 3.1, 4.5, 5.4 | 1.64 | 0.73 | 16 | 7.1 (7.7) | 0.7 | 1.25 | 28.3 | 7.2 | 63%, 28%; 3.1; 56% | 0.06 | - | 0 (0%) | 1.4 (19%) | 0.4 | 3 | gunner 18 |

| Cell | Fights entered with a member at 10% HP or less | Lost fights entered so | Lost fights entered with everyone above 10% |
| --- | --- | --- | --- |
| solo_breaker | 3% (8/312) | 2 of 11 | 9 |
| solo_skirmisher | 1% (3/334) | 1 of 6 | 5 |
| duo_breaker | 16% (25/160) | 14 of 39 | 25 |
| duo_skirmisher | 10% (28/280) | 9 of 19 | 10 |
| duo_rigger | 6% (11/188) | 8 of 35 | 27 |
| duo_mender | 0% (0/120) | 0 of 18 | 18 |
| duo_channeler | 11% (25/230) | 10 of 25 | 15 |
| duo_chaplain | 11% (22/205) | 14 of 32 | 18 |
| duo_monk | 13% (25/189) | 16 of 35 | 19 |
| quad_breaker | 24% (43/179) | 25 of 36 | 11 |
| quad_monk | 25% (66/261) | 23 of 28 | 5 |
| mix_tank_gun | 8% (19/232) | 10 of 29 | 19 |
| mix_gun_heal | 4% (10/277) | 5 of 17 | 12 |
| mix_breaker_channeler | 16% (31/191) | 19 of 36 | 17 |
| mix_chaplain_monk | 8% (16/199) | 13 of 35 | 22 |

| Cell | Damage taken from guns / melee / casters | Hit %: guns / melee / casters | Attacks a fight a head: guns / melee / casters |
| --- | --- | --- | --- |
| solo_breaker | 73% / 21% / 6% | 66% / 56% / 88% | 3.2 / 1.6 / 0.1 |
| solo_skirmisher | 82% / 10% / 8% | 55% / 46% / 63% | 3.7 / 0.9 / 0.1 |
| solo_sigilist | 34% / 60% / 6% | 73% / 55% / 75% | 2.3 / 14.3 / 0.3 |
| solo_channeler | 77% / 17% / 6% | 67% / 54% / 92% | 2.8 / 1.4 / 0 |
| solo_monk | 73% / 11% / 16% | 59% / 42% / 71% | 5 / 1.1 / 0.7 |
| duo_breaker | 86% / 7% / 7% | 59% / 55% / 88% | 5.1 / 0.7 / 0 |
| duo_skirmisher | 86% / 5% / 9% | 47% / 47% / 67% | 3.7 / 0.4 / 0.1 |
| duo_sigilist | 53% / 44% / 3% | 60% / 54% / 64% | 4.5 / 10.1 / 0.2 |
| duo_rigger | 83% / 6% / 11% | 59% / 54% / 75% | 4.2 / 0.6 / 0.1 |
| duo_mender | 77% / 11% / 12% | 57% / 55% / 72% | 16.8 / 4.5 / 0.9 |
| duo_channeler | 87% / 7% / 6% | 58% / 58% / 50% | 3.4 / 0.6 / 0.1 |
| duo_chaplain | 90% / 4% / 5% | 61% / 69% / 47% | 3.8 / 0.2 / 0 |
| duo_monk | 82% / 8% / 10% | 49% / 46% / 64% | 7.3 / 0.8 / 0.2 |
| quad_breaker | 86% / 9% / 5% | 59% / 56% / 79% | 5.4 / 0.7 / 0.1 |
| quad_skirmisher | 87% / 7% / 5% | 41% / 58% / 67% | 2.2 / 0.1 / 0 |
| quad_monk | 85% / 9% / 6% | 49% / 51% / 61% | 7.6 / 0.6 / 0.1 |
| mix_tank_gun | 80% / 9% / 11% | 47% / 45% / 64% | 6.4 / 1.1 / 0.2 |
| mix_gun_heal | 82% / 5% / 12% | 52% / 47% / 70% | 5.5 / 0.7 / 0.2 |
| mix_breaker_channeler | 85% / 8% / 6% | 60% / 57% / 68% | 4.3 / 0.7 / 0.1 |
| mix_chaplain_monk | 83% / 6% / 11% | 52% / 60% / 80% | 5.6 / 0.3 / 0.1 |

| Cell | Solo reference | Baseline | perhead | focus | smallmap | revive | duopress |
| --- | --- | --- | --- | --- | --- | --- | --- |
| duo_bulwark | 0% | 0% | 0% (+0) | 0% (+0) | 0% (+0) | - | - |
| duo_breaker | 73% | 3% | 15% (+13) | 5% (+3) | 5% (+3) | 3% (+0) | 10% (+8) |
| duo_skirmisher | 85% | 50% | 57% (+7) | 57% (+7) | 55% (+5) | 55% (+5) | 83% (+32) |
| duo_operative | 0% | 0% | 0% (+0) | 0% (+0) | 0% (+0) | - | - |
| duo_sigilist | 3% | 0% | 0% (+0) | 0% (+0) | 0% (+0) | - | - |
| duo_rigger | 30% | 10% | 8% (-3) | 3% (-8) | 13% (+2) | 10% (+0) | 8% (-3) |
| duo_mender | 3% | 5% | 13% (+8) | 10% (+5) | 3% (-2) | 5% (+0) | 13% (+8) |
| duo_channeler | 80% | 35% | 55% (+20) | 40% (+5) | 28% (-7) | 38% (+3) | 70% (+35) |
| duo_chaplain | 30% | 20% | 10% (-10) | 13% (-8) | 15% (-5) | 20% (+0) | 15% (-5) |
| duo_monk | 65% | 13% | 8% (-5) | 18% (+5) | 13% (+0) | 13% (+0) | 13% (+0) |
| quad_bulwark | 0% | 0% | 0% (+0) | 3% (+3) | 0% (+0) | - | - |
| quad_breaker | 73% | 10% | 0% (-10) | 20% (+10) | 10% (+0) | 13% (+2) | - |
| quad_skirmisher | 85% | 100% | 68% (-32) | 100% (+0) | 90% (-10) | - | - |
| quad_operative | 0% | 0% | 0% (+0) | 0% (+0) | 0% (+0) | - | - |
| quad_sigilist | 3% | 0% | 0% (+0) | 0% (+0) | 0% (+0) | - | - |
| quad_rigger | 30% | 50% | 3% (-47) | 10% (-40) | 57% (+7) | - | - |
| quad_mender | 3% | 18% | 0% (-17) | 18% (+0) | 13% (-5) | - | - |
| quad_channeler | 80% | 78% | 33% (-45) | 98% (+20) | 73% (-5) | - | - |
| quad_chaplain | 30% | 57% | 18% (-40) | 53% (-5) | 43% (-15) | - | - |
| quad_monk | 65% | 30% | 0% (-30) | 35% (+5) | 25% (-5) | 43% (+13) | - |
| mix_tank_gun | 43% | 23% | 48% (+25) | 23% (+0) | 28% (+5) | 23% (+0) | 33% (+10) |
| mix_tank_heal | 1% | 0% | 3% (+3) | 0% (+0) | 0% (+0) | - | - |
| mix_gun_heal | 44% | 55% | 57% (+2) | 48% (-8) | 45% (-10) | 55% (+0) | 65% (+10) |
| mix_tgh_caster | 23% | 57% | 18% (-40) | 50% (-7) | 57% (+0) | - | - |
| mix_breaker_channeler | 76% | 10% | 38% (+28) | 15% (+5) | 15% (+5) | 18% (+7) | 38% (+28) |
| mix_operative_rigger | 15% | 0% | 0% (+0) | 0% (+0) | 0% (+0) | - | - |
| mix_chaplain_monk | 48% | 10% | 15% (+5) | 15% (+5) | 8% (-3) | 13% (+2) | 28% (+18) |
| mix_four_rest | 46% | 30% | 5% (-25) | 30% (+0) | 15% (-15) | - | - |

Gap (solo reference less the party, summed over the party cells where positive): 493 points. Recovered by each lever (summed change): perhead -195 (-40% of the gap), focus -3 (-1% of the gap), smallmap -55 (-11% of the gap), revive 33 (7% of the gap), duopress 140 (28% of the gap).

## 9. The fit (16 Nov 2026, after; data changed: `survival.json pressure_per_char` and `run.dead_return_hp`)

**What changed (rules 1.57 party fit, Core Rules items 4530 to 4534):**

1. `pressure_per_char` [1.3, 1.7, 1.3, 0.9] → **[1.3, 0.9, 0.9, 0.9]**: any party of two or more at the quad's 0.9 a head.
2. `run.dead_return_hp` 1 → **50**.

Nothing else moved: the solo's 1.3, `bulk_per_char_round`, `max_foes`, `share`, every door's numbers, the enemy guns. A
solo run cannot move under either change (a solo's pressure is unchanged and a solo who dies has lost), so the solo
column is the baseline's, re-played and identical (838 of 838 runs reproduced bit for bit before the fit).

**How the number was chosen** (40 seeds a cell, the same PF-1 to PF-40 seeds, paired): the duo's term was tried at 1.3,
1.1 and 0.9 (all with the walk-on at 50), and at 1.1 with `max_foes` 5 for two:

| Duo cell | Before (1.7) | 1.3 | 1.1 | 1.1, max 5 foes | **0.9** |
|---|---|---|---|---|---|
| breaker | 3% | 13% | 18% | 28% | **57%** |
| skirmisher | 50% | 85% | 88% | 83% | **93%** |
| channeler | 35% | 73% | 85% | 75% | **90%** |
| chaplain | 20% | 15% | 33% | 38% | **55%** |
| monk | 13% | 13% | 20% | 40% | **50%** |
| rigger | 10% | 10% | 23% | 20% | **43%** |

The trio's term (unmeasured before; three cells added: three Skirmishers, three Channelers, three Breakers, and Breaker +
Skirmisher + Mender) at 1.3 / 1.1 / 0.9: Skirmishers 80 / 93 / 95%, Channelers 60 / 83 / 88%, Breakers 3 / 30 / 30%. 0.9
is kept for every party size: one rule ("a party is 0.9 a head"), and the quad's 0.9 already worked.

**A probe of the solo, not applied:** the solo's term at 1.1 and 1.0 (in memory): Bulwark 0 / 0%, Operative 0 / 0%,
Sigilist 5 / 3%, Mender 5 / 10%, Rigger 45 / 48%, Breaker 88 / 88%, Skirmisher 88 / 90%. Easing the solo lifts the doors
already winning and leaves the four losing doors where they are: their gap is the door, not the budget, so the solo
was left at 1.3.

### Stage 1, before → after (40 seeds a cell; the door's solo is the reference)

| Door | Solo | Duo before → after | Trio before → after | Quad before → after | Rounds a plain fight (duo, quad) before → after |
|---|---|---|---|---|---|
| bulwark | 0% (7.7 rounds) | 0% → 3% | - | 0% → 0% | 8.3, 8.2 → 8.1, 8.0 |
| breaker | 73% (2.8 rounds) | 3% → 58% | 3% → 30% | 10% → 13% | 3.3, 4.3 → 3.4, 4.3 |
| skirmisher | 85% (2.6 rounds) | 50% → 93% | 80% → 95% | 100% → 100% | 2.8, 2.7 → 2.5, 2.7 |
| operative | 0% (8.1 rounds) | 0% → 0% | - | 0% → 0% | 7.2, 8.9 → 8.7, 9.1 |
| sigilist | 3% (4.6 rounds) | 0% → 5% | - | 0% → 0% | 6.0, 7.0 → 5.7, 7.1 |
| rigger | 30% (4.9 rounds) | 10% → 43% | - | 50% → 58% | 6.8, 8.2 → 5.8, 8.1 |
| mender | 3% (7.9 rounds) | 5% → 13% | - | 18% → 20% | 8.3, 9.1 → 7.3, 9.1 |
| channeler | 80% (2.6 rounds) | 35% → 90% | 60% → 88% | 78% → 83% | 3.0, 3.2 → 2.7, 3.3 |
| chaplain | 30% (2.5 rounds) | 20% → 55% | - | 58% → 70% | 2.4, 2.9 → 2.5, 2.9 |
| monk | 65% (3.7 rounds) | 13% → 50% | - | 30% → 43% | 4.3, 5.4 → 4.1, 5.4 |

| Party | Solo reference | Before | After | T2 floor (reference - 10) | Rounds before → after |
|---|---|---|---|---|---|
| mix_tank_gun (bulwark, skirmisher) | 43% | 23% | 75% (40) | 33% | 4.0 → 3.8 |
| mix_tank_heal (bulwark, mender) | 2% | 0% | 18% (40) | -8% | 9.4 → 9.3 |
| mix_gun_heal (skirmisher, mender) | 44% | 55% | 90% (40) | 34% | 3.6 → 3.5 |
| mix_tgh_caster (bulwark, skirmisher, mender, sigilist) | 23% | 58% | 63% (40) | 13% | 6.2 → 6.3 |
| mix_breaker_channeler (breaker, channeler) | 77% | 10% | 85% (40) | 67% | 3.2 → 3.1 |
| mix_operative_rigger (operative, rigger) | 15% | 0% | 10% (40) | 5% | 7.0 → 7.1 |
| mix_chaplain_monk (chaplain, monk) | 48% | 10% | 55% (40) | 38% | 3.1 → 3.1 |
| mix_four_rest (breaker, operative, channeler, chaplain) | 46% | 30% | 38% (40) | 36% | 4.7 → 4.6 |
| mix_trio (breaker, skirmisher, mender) | 54% | 75% | 98% (40) | 44% | 4.2 → 3.8 |
| mix_four_b (monk, skirmisher, chaplain, channeler) | 65% | 70% | 73% (40) | 55% | 3.5 → 3.5 |


### Targets (the lead's; targets, not walls)

* **T1, every door's solo 45 to 75%: missed for six doors, not touched by this pass.** Breaker 73 and Monk 65 are in;
  Skirmisher 85 and Channeler 80 sit a little over (Leon's rule: not worth chasing); Rigger 30, Chaplain 30, Mender 3,
  Sigilist 3, Bulwark 0, Operative 0 are under. The solo probe above shows a budget move cannot reach them. Their own
  numbers are for the lead (the hand-back lists them).
* **T2, no party under its members' solo mean minus 10: met by every mixed party and every caster or gun party; missed
  by the melee multiples:** two Breakers 58% (floor 63), three Breakers 30%, four Breakers 13% (floor 63); two Monks 50%
  (floor 55), four Monks 43%. Their cause is measured and is not a budget: the Breaker's arcs hit the partner (5 to 7% of
  the damage taken) and the foes focus one member (67 to 82% of their attacks), both needing primitives (section 7).
  **The sensible four (front, damage, support, caster) at 60 to 80%: met.** Bulwark + Skirmisher + Mender + Sigilist
  63% (was 57%) with two of its four doors at 0 to 3% alone; Monk + Skirmisher + Chaplain + Channeler 73% (was 70%).
  Breaker + Operative + Channeler + Chaplain 38% (was 30%): one of its four (the Operative) clears 0% alone. Every duo
  with a winning door now clears more often than the solo reference: playing together is the better way to play.
* *(Section 10 re-measures this section's cells after the lead's review: the Downed now stand up at the same 50 HP and
  the gun doors fight with their fists when the revolver is dry. Read T1 and T3 there.)*
* **T3, a fragile door's mono party not under 30%: missed for the four doors that lose alone** (Bulwark, Operative,
  Sigilist 0 to 5% at any size; Mender 13 to 20%); met by every other door but four Breakers (13%, the melee cause).
* **T4, fights not longer than 1.5 x today's median rounds: met.** No cell's plain fight got longer by more than 1.5
  rounds (duo Operative 7.2 to 8.7, a losing cell); most got shorter (duo Rigger 6.8 to 5.8).

### Past the first Boss (report only, not fitted; stages cleared out of the seeds named)

| Cell | Seeds | Stage 1 | Stage 2 | Stage 3 |
|---|---|---|---|---|
| Bulwark + Skirmisher + Mender + Sigilist, before | 24 | 46% | 33% | 21% |
| Bulwark + Skirmisher + Mender + Sigilist, after | 19 | 47% | 47% | 26% |
| Monk + Skirmisher + Chaplain + Channeler, after | 12 | 92% | 75% | 25% |
| Breaker + Operative + Channeler + Chaplain, after | 12 | 42% | 8% | 8% |
| Skirmisher solo (unchanged) | 40 | 85% | 68% | 53% |
| Channeler solo (unchanged) | 40 | 80% | 45% | 30% |
| Breaker solo (unchanged) | 40 | 73% | 40% | 28% |

A four-member run past stage 1 is slow to simulate (about four minutes a run with the lane's other jobs), so the fours'
stage 2 and 3 rows are 12 to 24 seeds (one standard error up to 14 points): read them as a direction. Where a party
holds stage 1 it mostly holds stage 2 (the mixed four 47 to 47%; the second four 92 to 75%), and stage 3 halves it, as
for the solos. The fit does not break past the first Boss; whether stage 2 and 3 want their own fit is for the lead.

### The opening volley and the residual

Not fitted in this pass (the lead note's items 5 to 7 still stand). With the duo's budget at 0.9 a head, a duo fields 1.2
foes a head (was 1.8; 1.35 to 1.6 in the cells that stall) and 0.5 gun foes a head (was about 1.0); the share of damage
in rounds 1 and 2 in the duo cells that win is about as before (56 to 87%):
the opening is now lighter because there are fewer guns, not because it is shaped differently.

### Appendix: the after tables (the party-fit.ts report, every party cell after the fit)

| Cell | N | Runs | Clear stage 1 (± SE) | Lost / stalled | Fights | Rounds: plain, Elite, Boss | Foes a head | Gun foes a head | Map | Spawn distance (to a gun) | Foe turns before a character's first | Enemy attacks a round a head | Damage taken a head a fight | Same, a round | Rounds 1-2: share of damage, of Downs; attacks a head; hit % | Downs a fight | Focus share | Friendly fire a fight (share) | Healed a fight (wasted) | AP left a turn | Level at the Boss | Downed first |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| quad_mender | 4 | 40 | 20% ± 6 | 5 / 27 | 4.4 | 8.9, 13.2, 13.4 | 1.29 | 0.65 | 21 | 6.2 (8.3) | 3.3 | 1.29 | 107.2 | 8.3 | 24%, 16%; 3.8; 54% | 0.34 | 48% | 0 (0%) | 374.1 (0%) | 2.1 | 2.5 | mender 19 |
| mix_gun_heal | 2 | 40 | 90% ± 5 | 3 / 1 | 8.6 | 3.5, 5.1, 5.3 | 1.19 | 0.55 | 16.6 | 7.8 (8.5) | 1.2 | 0.83 | 26.2 | 5.8 | 56%, 38%; 2.2; 51% | 0.04 | 82% | 0 (0%) | 34.7 (1%) | 0.6 | 2.9 | mender 8, skirmisher 1 |
| mix_tank_gun | 2 | 40 | 75% ± 7 | 7 / 3 | 8 | 3.7, 5.2, 6.3 | 1.2 | 0.54 | 16.6 | 7.8 (8.8) | 1.3 | 0.88 | 21.4 | 4.3 | 59%, 30%; 2.4; 45% | 0.13 | 84% | 0 (0%) | 0.6 (22%) | 0.4 | 2.9 | skirmisher 13, bulwark 9 |
| duo_operative | 2 | 40 | 0% ± 0 | 27 / 13 | 2.3 | 8.6, -, - | 1.58 | 0.54 | 17.2 | 5.3 (7) | 2 | 1.63 | 54 | 6.2 | 36%, 9%; 4.5; 52% | 1.26 | 67% | 0 (0%) | 0.2 (0%) | 1.6 | - | operative 50 |
| quad_rigger | 4 | 40 | 57% ± 8 | 13 / 4 | 7.6 | 8, 10, 10.2 | 1.24 | 0.71 | 20.5 | 7 (8.8) | 3.1 | 0.3 | 21.2 | 2.2 | 25%, 16%; 0.8; 52% | 0.57 | 61% | 0 (0%) | 0.1 (7%) | 0.4 | 2.8 | rigger 76 |
| quad_breaker | 4 | 40 | 13% ± 5 | 35 / 0 | 4.6 | 4.2, 6.2, 4.6 | 1.27 | 0.69 | 20.9 | 7 (8.9) | 3.1 | 1.27 | 40.1 | 8.3 | 65%, 49%; 3.8; 58% | 1.47 | 51% | 8.9 (5%) | 0.3 (0%) | 0.8 | 2.8 | breaker 93 |
| duo_skirmisher | 2 | 40 | 93% ± 4 | 3 / 0 | 8.8 | 2.5, 3, 3.5 | 1.18 | 0.55 | 16.5 | 8.7 (9.6) | 0.9 | 0.65 | 12.4 | 4.2 | 86%, 88%; 1.6; 46% | 0.07 | 88% | 0 (0%) | 0.2 (0%) | 0.3 | 2.9 | skirmisher 19 |
| mix_breaker_channeler | 2 | 40 | 85% ± 6 | 6 / 0 | 8.5 | 3.1, 2.9, 3.3 | 1.19 | 0.53 | 16.6 | 6.1 (7.6) | 1.5 | 0.86 | 19.8 | 6.2 | 82%, 69%; 2.2; 59% | 0.23 | 86% | 3.4 (8%) | 8 (7%) | 0.6 | 2.9 | breaker 45, channeler 11 |
| duo_chaplain | 2 | 40 | 55% ± 8 | 18 / 0 | 7.1 | 2.5, 4, 3.6 | 1.2 | 0.52 | 16.6 | 6.6 (7.8) | 1.4 | 0.65 | 21.3 | 5.9 | 73%, 63%; 1.6; 63% | 0.33 | 84% | 0 (0%) | 0.2 (33%) | 0.7 | 2.9 | chaplain 62 |
| quad_bulwark | 4 | 40 | 0% ± 0 | 11 / 29 | 2.4 | 7.3, 15.3, - | 1.45 | 0.59 | 21.9 | 6.1 (8.4) | 3.6 | 1.3 | 64.8 | 5.9 | 32%, 4%; 3.5; 44% | 1.23 | 47% | 0 (0%) | 0 (-) | 0.3 | - | bulwark 30 |
| trio_channeler | 3 | 40 | 88% ± 5 | 5 / 0 | 8.2 | 3, 3.3, 3.6 | 1.17 | 0.65 | 18 | 7.1 (8.8) | 2.3 | 0.69 | 18.8 | 5.8 | 83%, 59%; 1.8; 56% | 0.42 | 73% | 0 (0%) | 18.8 (3%) | 1 | 2.9 | channeler 69 |
| quad_operative | 4 | 40 | 0% ± 0 | 33 / 7 | 1.9 | 7.8, -, - | 1.51 | 0.59 | 22 | 5.8 (8.1) | 3.8 | 1.29 | 64.8 | 7.2 | 32%, 13%; 3.5; 56% | 3.76 | 43% | 0 (0%) | 0 (-) | 1.4 | - | operative 55 |
| quad_sigilist | 4 | 40 | 0% ± 0 | 40 / 0 | 2.3 | 7.5, 8, - | 1.44 | 0.59 | 21.8 | 6.4 (8.6) | 3.5 | 1.69 | 63.5 | 9.4 | 46%, 32%; 4.9; 59% | 3.54 | 41% | 0 (0%) | 0 (-) | 0.8 | - | sigilist 76 |
| duo_sigilist | 2 | 40 | 5% ± 3 | 38 / 0 | 3 | 5.7, 3.3, 6.5 | 1.45 | 0.5 | 17.1 | 4.7 (6.2) | 1.9 | 1.88 | 48.6 | 9.1 | 51%, 37%; 5.1; 57% | 1 | 71% | 0 (0%) | 0 (-) | 0.7 | 2.5 | sigilist 60 |
| quad_skirmisher | 4 | 40 | 100% ± 0 | 0 / 0 | 8.9 | 2.7, 3.5, 3.7 | 1.19 | 0.72 | 20.3 | 10.9 (11.7) | 1.9 | 0.66 | 12.4 | 3.8 | 83%, 80%; 1.8; 41% | 0.19 | 67% | 0.3 (1%) | 0 (-) | 0.3 | 2.9 | skirmisher 52 |
| trio_skirmisher | 3 | 40 | 95% ± 3 | 2 / 0 | 8.8 | 2.5, 3.3, 3.8 | 1.18 | 0.66 | 18.1 | 9.7 (10.7) | 1.3 | 0.65 | 13.3 | 4.2 | 86%, 71%; 1.7; 43% | 0.13 | 77% | 0 (0%) | 0.1 (52%) | 0.3 | 2.9 | skirmisher 33 |
| duo_bulwark | 2 | 40 | 3% ± 2 | 18 / 21 | 2.6 | 6.3, 11, 11 | 1.52 | 0.5 | 17.2 | 5.6 (7.3) | 1.9 | 1.67 | 67.8 | 6.6 | 29%, 2%; 4.2; 42% | 0.59 | 72% | 0 (0%) | 0.3 (0%) | 0.4 | 2 | bulwark 27 |
| duo_monk | 2 | 40 | 50% ± 8 | 20 / 0 | 6.7 | 4.1, 5.3, 4.5 | 1.21 | 0.54 | 16.6 | 6.3 (7.2) | 1.4 | 1.12 | 25.4 | 5.3 | 61%, 43%; 3; 52% | 0.35 | 82% | 0 (0%) | 0.9 (37%) | 0.1 | 2.9 | monk 61 |
| mix_tank_heal | 2 | 40 | 18% ± 6 | 2 / 31 | 4.1 | 9.2, 14.2, 13.4 | 1.36 | 0.51 | 16.9 | 5.4 (6.7) | 1.7 | 1.46 | 97.1 | 7.4 | 21%, 0%; 3.5; 51% | 0.07 | 72% | 0.6 (0%) | 154 (0%) | 1.3 | 2.6 | mender 5, bulwark 2 |
| duo_breaker | 2 | 40 | 57% ± 8 | 17 / 0 | 7.1 | 3.4, 3.7, 3.5 | 1.22 | 0.54 | 16.6 | 6.2 (7.3) | 1.5 | 1.02 | 24.9 | 6.8 | 73%, 64%; 2.7; 59% | 0.32 | 83% | 4.6 (8%) | 1.3 (10%) | 0.5 | 2.9 | breaker 68 |
| duo_mender | 2 | 40 | 13% ± 5 | 5 / 30 | 4.2 | 7.2, 13.8, 12 | 1.35 | 0.5 | 16.9 | 5.1 (6.4) | 1.8 | 1.4 | 109.6 | 8.7 | 21%, 8%; 3.4; 57% | 0.08 | 71% | 0 (0%) | 194.5 (0%) | 2.4 | 2.6 | mender 5 |
| quad_monk | 4 | 40 | 43% ± 8 | 23 / 0 | 6.8 | 5.4, 8.1, 6.5 | 1.21 | 0.72 | 20.5 | 6.9 (8.7) | 3.1 | 1.26 | 30.1 | 4.7 | 50%, 38%; 3.8; 46% | 1.13 | 49% | 0 (0%) | 0.6 (8%) | 0.2 | 3 | monk 109 |
| mix_trio | 3 | 40 | 98% ± 2 | 1 / 0 | 8.9 | 3.8, 5, 5.8 | 1.18 | 0.66 | 18.1 | 8.4 (9.9) | 1.9 | 0.9 | 30.9 | 6.7 | 61%, 40%; 2.6; 54% | 0.12 | 70% | 2.9 (3%) | 69.2 (0%) | 0.5 | 2.9 | breaker 21, mender 5, skirmisher 2 |
| duo_channeler | 2 | 40 | 90% ± 5 | 4 / 0 | 8.5 | 2.7, 2.3, 2.9 | 1.19 | 0.54 | 16.6 | 5.3 (6.3) | 1.6 | 0.71 | 16.4 | 5.9 | 87%, 50%; 1.7; 62% | 0.13 | 87% | 0 (0%) | 11.1 (4%) | 0.7 | 2.9 | channeler 29 |
| mix_chaplain_monk | 2 | 40 | 55% ± 8 | 18 / 0 | 7.5 | 3.1, 4.7, 4.1 | 1.2 | 0.54 | 16.6 | 6 (7.1) | 1.4 | 0.95 | 21.3 | 5.4 | 71%, 61%; 2.5; 57% | 0.34 | 87% | 0.1 (0%) | 0.6 (9%) | 0.4 | 2.8 | chaplain 36, monk 32 |
| quad_channeler | 4 | 40 | 83% ± 6 | 6 / 1 | 8.1 | 3.2, 3.6, 3.4 | 1.19 | 0.72 | 20.3 | 6.2 (8) | 3.1 | 0.71 | 19.9 | 5.5 | 79%, 50%; 2; 54% | 0.61 | 62% | 0 (0%) | 25 (3%) | 1.1 | 2.9 | channeler 81 |
| quad_chaplain | 4 | 40 | 70% ± 7 | 12 / 0 | 7.8 | 2.9, 4.3, 3.9 | 1.22 | 0.71 | 20.5 | 7.4 (9.1) | 2.7 | 0.67 | 19.5 | 5 | 74%, 61%; 1.9; 53% | 0.62 | 58% | 0.3 (0%) | 0 (-) | 0.9 | 2.9 | chaplain 80 |
| trio_breaker | 3 | 40 | 30% ± 7 | 28 / 0 | 5.5 | 3.6, 4.8, 4.3 | 1.24 | 0.61 | 18.3 | 7.1 (9) | 2.2 | 1.11 | 31.1 | 7.4 | 69%, 54%; 3.2; 59% | 0.72 | 65% | 8 (8%) | 0.2 (0%) | 0.7 | 2.8 | breaker 77 |
| duo_rigger | 2 | 40 | 43% ± 8 | 23 / 0 | 6.6 | 5.7, 6.5, 6.4 | 1.2 | 0.51 | 16.6 | 5.9 (7) | 1.4 | 0.38 | 22.7 | 3.9 | 43%, 24%; 0.9; 62% | 0.32 | 85% | 0 (0%) | 0 (-) | 0.3 | 2.8 | rigger 43 |
| mix_operative_rigger | 2 | 40 | 10% ± 5 | 24 / 12 | 5 | 6.6, 9, 8.5 | 1.28 | 0.5 | 16.8 | 5.9 (6.8) | 1.6 | 0.66 | 28.7 | 3.6 | 36%, 17%; 1.7; 61% | 0.5 | 80% | 0 (0%) | 0.3 (32%) | 1.1 | 2.8 | rigger 36, operative 6 |
| mix_tgh_caster | 4 | 40 | 63% ± 8 | 4 / 11 | 7.4 | 6.2, 8, 7.8 | 1.22 | 0.72 | 20.5 | 8.5 (9.7) | 2.7 | 1.03 | 46.1 | 6.1 | 44%, 29%; 3.3; 47% | 0.46 | 55% | 0.2 (0%) | 122.9 (0%) | 1 | 2.9 | sigilist 40, skirmisher 12, mender 10 |
| mix_four_b | 4 | 40 | 73% ± 7 | 11 / 0 | 8 | 3.4, 4.5, 4.9 | 1.21 | 0.71 | 20.4 | 8.4 (9.6) | 2.6 | 0.84 | 20.5 | 4.8 | 71%, 47%; 2.5; 50% | 0.61 | 65% | 0.3 (0%) | 6.2 (1%) | 0.7 | 2.9 | monk 48, chaplain 20, skirmisher 10, channeler 7 |
| mix_four_rest | 4 | 40 | 38% ± 8 | 21 / 4 | 5.9 | 4.2, 5.6, 6.1 | 1.26 | 0.69 | 20.7 | 6.6 (8.4) | 3.2 | 0.89 | 32.1 | 5.6 | 60%, 40%; 2.8; 56% | 1.46 | 61% | 1.1 (1%) | 7.6 (1%) | 1 | 2.9 | breaker 70, chaplain 18, channeler 15, operative 1 |

| Cell | Fights entered with a member at 10% HP or less | Lost fights entered so | Lost fights entered with everyone above 10% |
| --- | --- | --- | --- |
| quad_mender | 1% (1/150) | 1 of 5 | 4 |
| mix_gun_heal | 1% (4/344) | 1 of 3 | 2 |
| mix_tank_gun | 3% (10/317) | 0 of 7 | 7 |
| duo_operative | 1% (1/79) | 1 of 27 | 26 |
| quad_rigger | 10% (30/301) | 4 of 13 | 9 |
| quad_breaker | 23% (43/184) | 24 of 35 | 11 |
| duo_skirmisher | 5% (18/351) | 1 of 3 | 2 |
| mix_breaker_channeler | 7% (23/340) | 1 of 6 | 5 |
| duo_chaplain | 11% (32/284) | 7 of 18 | 11 |
| quad_bulwark | 8% (5/65) | 4 of 11 | 7 |
| trio_channeler | 4% (13/329) | 0 of 5 | 5 |
| quad_operative | 7% (5/67) | 5 of 33 | 28 |
| quad_sigilist | 25% (23/91) | 19 of 40 | 21 |
| duo_sigilist | 10% (12/121) | 12 of 37 | 25 |
| quad_skirmisher | 12% (41/356) | 0 of 0 | 0 |
| trio_skirmisher | 8% (28/351) | 2 of 2 | 0 |
| duo_bulwark | 2% (2/82) | 2 of 18 | 16 |
| duo_monk | 11% (29/269) | 8 of 20 | 12 |
| mix_tank_heal | 1% (1/131) | 0 of 2 | 2 |
| duo_breaker | 11% (30/285) | 8 of 17 | 9 |
| duo_mender | 0% (0/137) | 0 of 5 | 5 |
| quad_monk | 23% (64/273) | 18 of 23 | 5 |
| mix_trio | 2% (8/357) | 0 of 1 | 1 |
| duo_channeler | 3% (11/339) | 1 of 4 | 3 |
| mix_chaplain_monk | 11% (32/299) | 13 of 18 | 5 |
| quad_channeler | 7% (22/324) | 1 of 6 | 5 |
| quad_chaplain | 15% (48/312) | 7 of 12 | 5 |
| trio_breaker | 18% (39/221) | 18 of 28 | 10 |
| duo_rigger | 7% (18/264) | 11 of 23 | 12 |
| mix_operative_rigger | 1% (2/188) | 2 of 24 | 22 |
| mix_tgh_caster | 6% (16/285) | 2 of 4 | 2 |
| mix_four_b | 14% (43/318) | 7 of 11 | 4 |
| mix_four_rest | 14% (32/231) | 11 of 21 | 10 |

| Cell | Damage taken from guns / melee / casters | Hit %: guns / melee / casters | Attacks a fight a head: guns / melee / casters |
| --- | --- | --- | --- |
| quad_mender | 72% / 23% / 5% | 58% / 58% / 71% | 12.3 / 3.9 / 0.2 |
| mix_gun_heal | 69% / 10% / 21% | 55% / 49% / 78% | 2.9 / 0.7 / 0.1 |
| mix_tank_gun | 70% / 14% / 16% | 50% / 42% / 67% | 3.8 / 0.9 / 0.2 |
| duo_operative | 60% / 33% / 7% | 58% / 54% / 71% | 6.3 / 6.3 / 0.7 |
| quad_rigger | 91% / 7% / 2% | 56% / 55% / 73% | 3.1 / 0.3 / 0 |
| quad_breaker | 86% / 9% / 5% | 59% / 55% / 79% | 5.4 / 0.7 / 0.1 |
| duo_skirmisher | 73% / 11% / 16% | 52% / 49% / 64% | 1.8 / 0.5 / 0 |
| mix_breaker_channeler | 74% / 15% / 12% | 62% / 55% / 71% | 2.4 / 0.7 / 0.1 |
| duo_chaplain | 78% / 6% / 16% | 66% / 65% / 67% | 2.3 / 0.2 / 0.1 |
| quad_bulwark | 62% / 34% / 4% | 44% / 47% / 53% | 12.5 / 5.1 / 0.4 |
| trio_channeler | 88% / 4% / 8% | 58% / 59% / 62% | 2.4 / 0.2 / 0 |
| quad_operative | 66% / 31% / 4% | 62% / 59% / 75% | 8.9 / 3.6 / 0.2 |
| quad_sigilist | 56% / 42% / 2% | 59% / 58% / 65% | 5.4 / 6.3 / 0.1 |
| duo_sigilist | 49% / 44% / 6% | 58% / 56% / 77% | 3.4 / 8.6 / 0.1 |
| quad_skirmisher | 87% / 8% / 5% | 41% / 58% / 63% | 2.2 / 0.2 / 0 |
| trio_skirmisher | 83% / 6% / 11% | 45% / 44% / 70% | 2 / 0.2 / 0 |
| duo_bulwark | 54% / 37% / 10% | 44% / 41% / 51% | 9.5 / 9.2 / 1 |
| duo_monk | 70% / 12% / 18% | 55% / 43% / 72% | 4.2 / 0.9 / 0.3 |
| mix_tank_heal | 60% / 25% / 15% | 53% / 46% / 64% | 11.5 / 6 / 1.3 |
| duo_breaker | 75% / 13% / 12% | 61% / 56% / 82% | 3.1 / 0.8 / 0.1 |
| duo_mender | 65% / 15% / 20% | 62% / 56% / 74% | 10.6 / 4.2 / 1.3 |
| quad_monk | 86% / 9% / 5% | 48% / 50% / 61% | 7.6 / 0.6 / 0.1 |
| mix_trio | 82% / 7% / 11% | 55% / 60% / 71% | 3.6 / 0.5 / 0.1 |
| duo_channeler | 75% / 13% / 12% | 66% / 57% / 65% | 1.8 / 0.6 / 0 |
| mix_chaplain_monk | 73% / 9% / 17% | 57% / 54% / 76% | 3.3 / 0.5 / 0.3 |
| quad_channeler | 92% / 5% / 3% | 54% / 68% / 63% | 2.7 / 0.1 / 0 |
| quad_chaplain | 91% / 3% / 6% | 54% / 68% / 77% | 2.9 / 0.1 / 0 |
| trio_breaker | 84% / 9% / 7% | 59% / 59% / 67% | 3.9 / 0.8 / 0.1 |
| duo_rigger | 79% / 7% / 14% | 65% / 51% / 86% | 2.4 / 0.6 / 0.1 |
| mix_operative_rigger | 63% / 22% / 15% | 62% / 56% / 79% | 3.6 / 1.8 / 0.4 |
| mix_tgh_caster | 82% / 14% / 5% | 49% / 51% / 63% | 7.1 / 1 / 0.1 |
| mix_four_b | 89% / 6% / 5% | 51% / 58% / 77% | 3.7 / 0.2 / 0 |
| mix_four_rest | 91% / 6% / 3% | 58% / 61% / 67% | 5.1 / 0.3 / 0.1 |

## 10. Re-measured after the lead's review (16 Nov 2026)

Two things were wrong under sections 3, 6 and 9, and both are fixed in this pass; nothing in `data/` moved.

1. **The dry revolver (a policy gap, not a door result).** The tank and Mender policies, and the tank control, had no
   answer to an empty gun with nothing to load: they Raised Shield or ended the turn for 14 rounds and more, and the
   fight hit the simulator's 20-round cap ("stalled"). Every door policy and the gun controls now carry a fallback
   (`door-policies.ts fists`): when the gun is empty and both reloads are refused this turn, and the door's own policy
   has only a walk, a reload or a set-up to offer, the character strikes with its fists (`combat/attack`, mode
   `melee`: the engine's `strikeWeapon` swaps the fists in for a gun), on the weakest foe in reach, or walks to the
   nearest foe that brings one. Heals, Bonds and the door's verbs still come first. It never picks a weapon up or swaps
   one in from the pack: those are the next policy items, so a dry character is still weaker than a player would be.
2. **One copy of the stand-up.** A character killed in a won fight stood up at `run.dead_return_hp` (50) while one only
   Downed and saved stood up at 1 HP (`unitToCharacter`'s floor): being killed left you better off. Both now read the one
   field (`game.ts standUpHp`) when a run's fight closes; outside a run a Downed fighter still stands at 1 HP (rules 1.57
   party fit item 2, item 4531).

Same seeds as section 9 (PF-1 to PF-40, stage 1, the gear route, 40 a cell). The split columns replay the party cells
with the fallback but the Downed at 1 HP (the old `game.ts`, in memory of the run only), so each fix's share shows.
Solos cannot move under the stand-up fix (a solo Downed has lost).

| Door | Solo: section 9 → now (lost / stalled) | Duo: section 9 → fallback only → both | Quad: section 9 → fallback only → both |
|---|---|---|---|
| bulwark | 0% (21 / 19) → 3% (38 / 1) | 3% → 12% → 13% | 0% → 2% → 3% |
| breaker | 73% → 73% | 58% → 58% → 65% | 13% → 12% → 15% |
| skirmisher | 85% → 85% | 93% → 92% → 93% | 100% → 100% → 100% |
| operative | 0% → 0% (31 / 9) | 0% → 0% → 0% | 0% → 0% → 0% |
| sigilist | 3% → 3% | 5% → 5% → 5% | 0% → 0% → 0% |
| rigger | 30% → 30% | 43% → 42% → 50% | 58% → 60% → 68% |
| mender | 3% (16 / 23) → 15% (17 / 17) | 13% → 62% → 63% | 20% → 60% → 63% |
| channeler | 80% → 80% | 90% → 90% → 93% | 83% → 82% → 80% |
| chaplain | 30% → 30% | 55% → 55% → 57% | 70% → 70% → 70% |
| monk | 65% → 65% | 50% → 50% → 53% | 43% → 42% → 43% |

| Party | Section 9 | Fallback only | Both |
|---|---|---|---|
| mix_tank_gun (bulwark, skirmisher) | 75% | 78% | 80% |
| mix_tank_heal (bulwark, mender) | 18% | 52% | 53% |
| mix_gun_heal (skirmisher, mender) | 90% | 95% | 98% |
| mix_tgh_caster (bulwark, skirmisher, mender, sigilist) | 63% | 78% | 80% |
| mix_breaker_channeler | 85% | 85% | 88% |
| mix_operative_rigger | 10% | 12% | 13% |
| mix_chaplain_monk | 55% | 55% | 70% |
| mix_four_rest (breaker, operative, channeler, chaplain) | 38% | 40% | 48% |
| mix_trio (breaker, skirmisher, mender) | 98% | 98% | 98% |
| mix_four_b (monk, skirmisher, chaplain, channeler) | 73% | 72% | 85% |
| trio skirmisher / channeler / breaker | 95 / 88 / 30% | 95 / 88 / 30% | 100 / 88 / 38% |

Controls with the fallback: the Bulwark on the tank policy 5% (37 lost / 1 stalled; was 3%, 24 stalled), the Operative
on the gunner 0%, the Mender on the gunner 0%; the monk's plain control 68% and the guard's own gunner 55% are unchanged.

**What the verdicts become.**

* **The Mender is not a door that loses whatever the party.** With its fists it clears 63% as two and as four, and
  lifts a Bulwark from 3% to 53%; its own door beats its gun control alone (15% against 0%). ~~Alone it still loses (17 lost, 17
  stalled); 13 of the 17 stalls end with the revolver dry, in a fist fight against a foe the fists cannot out-damage (the
  two read: a Sergeant at 104 HP, a Heart adept's Mending pulse). A pick-up or a weapon swap would end those, so 15% is
  a floor.~~ *(Section 11: with the pick-up and the softer gun profile, 25% alone; 13 stalls left, all fist stalemates.)*
* **The Bulwark loses alone as a sheet, not as a door:** ~~3% with its door, 5% with the plain tank policy~~ (section 11:
  8% and 10%), both now losing rather than stalling. Its party cells moved little (duo 13%, four 3%). Raising Bulwark
  damage may still be right, but it should be fitted on these cells, not on section 3's.
* **The Operative and the Sigilist are unchanged:** their non-clears are losses ~~(the Operative's 9 stalls alone: 5
  with the pistol empty, because its policy waits Hidden before it tries a reload, so the fallback never sees a refused
  one; the rest Hidden waits against a foe that heals. Its own policy item, listed, not built)~~ *(section 11: the
  fallback now reloads an empty gun before the policy may wait Hidden; the Operative's 40 runs are 40 losses, no stall)*.
* **The stand-up fix is worth 5 to 15 points to the parties that go down and win**: Breaker + Channeler, Chaplain +
  Monk (55 → 70%), the second four (72 → 85%), two Breakers (58 → 65%), Riggers (42 → 50%, 60 → 68%). It moves no solo.
* **T1** (solo 45 to 75%): ~~unchanged but for the Mender (15%) and the Bulwark (3%); still missed by six doors~~
  *(section 11: still missed by six, under: Bulwark 8, Operative 0, Sigilist 3, Rigger 35, Mender 25, Chaplain 43%)*.
  **T2** (no party under its members' solo mean minus 10): met by every mixed party; the melee multiples are closer
  (two Breakers 65% against a floor of 63: met; two Monks 53% against 55, four Breakers 15%, four Monks 43%: missed).
  **T3** (a fragile door's mono party not under 30%): met now by the Mender (63%); missed by the Bulwark, the
  Operative and the Sigilist. **T4**: met (no plain fight got longer by more than a round and a half).


### Appendix: the re-measured tables (the party-fit.ts report, every cell, fallback and stand-up fix)

| Cell | N | Runs | Clear stage 1 (± SE) | Lost / stalled | Fights | Rounds: plain, Elite, Boss | Foes a head | Gun foes a head | Map | Spawn distance (to a gun) | Foe turns before a character's first | Enemy attacks a round a head | Damage taken a head a fight | Same, a round | Rounds 1-2: share of damage, of Downs; attacks a head; hit % | Downs a fight | Focus share | Friendly fire a fight (share) | Healed a fight (wasted) | AP left a turn | Level at the Boss | Downed first |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| solo_bulwark | 1 | 40 | 3% ± 2 | 38 / 1 | 3.4 | 6.4, 11.5, 16 | 1.78 | 0.63 | 16 | 4.4 (5.2) | 1.1 | 2.06 | 72.9 | 9.9 | 36%, 8%; 5; 54% | 0.28 | - | 0 (0%) | 0.2 (0%) | 0.1 | 2 | bulwark 38 |
| duo_skirmisher | 2 | 40 | 93% ± 4 | 3 / 0 | 8.8 | 2.5, 2.9, 3.4 | 1.17 | 0.55 | 16.5 | 8.9 (9.7) | 0.9 | 0.65 | 12.7 | 4.3 | 86%, 78%; 1.6; 46% | 0.05 | 88% | 0 (0%) | 0.1 (0%) | 0.3 | 2.9 | skirmisher 14 |
| quad_sigilist | 4 | 40 | 0% ± 0 | 40 / 0 | 2.4 | 7.2, 9.5, - | 1.42 | 0.6 | 21.7 | 6.2 (8.2) | 3.4 | 1.68 | 63.7 | 9.5 | 46%, 29%; 4.9; 59% | 3.46 | 40% | 0 (0%) | 0 (-) | 0.9 | - | sigilist 78 |
| solo_channeler | 1 | 40 | 80% ± 6 | 8 / 0 | 8.1 | 2.5, 2.5, 3.1 | 1.68 | 0.74 | 16 | 5.2 (6) | 1 | 1.2 | 19.6 | 7.1 | 91%, 63%; 3.1; 62% | 0.02 | - | 0 (0%) | 5.6 (7%) | 0.4 | 2.9 | channeler 8 |
| duo_monk | 2 | 40 | 53% ± 8 | 19 / 0 | 7 | 4, 5.3, 4.4 | 1.22 | 0.52 | 16.7 | 6.2 (7.3) | 1.4 | 1.11 | 25.4 | 5.3 | 62%, 40%; 3; 52% | 0.31 | 81% | 0 (0%) | 1.3 (30%) | 0.1 | 2.9 | monk 58 |
| mix_operative_rigger | 2 | 40 | 13% ± 5 | 28 / 7 | 5.3 | 6.6, 8.6, 7.6 | 1.26 | 0.51 | 16.7 | 5.7 (6.7) | 1.5 | 0.67 | 30.4 | 4 | 38%, 21%; 1.7; 60% | 0.53 | 80% | 0 (0%) | 0.5 (0%) | 0.7 | 2.5 | rigger 36, operative 12 |
| mix_four_b | 4 | 40 | 85% ± 6 | 6 / 0 | 8.3 | 3.4, 4.5, 4.9 | 1.2 | 0.71 | 20.4 | 8.2 (9.4) | 2.6 | 0.84 | 20.3 | 4.8 | 73%, 46%; 2.5; 49% | 0.52 | 65% | 0.3 (0%) | 6.3 (1%) | 0.7 | 2.9 | monk 46, chaplain 15, channeler 11, skirmisher 8 |
| duo_bulwark | 2 | 40 | 13% ± 5 | 27 / 8 | 4.4 | 7.1, 12, 12.8 | 1.28 | 0.53 | 16.8 | 5.5 (6.4) | 1.6 | 1.43 | 64.8 | 7.4 | 31%, 7%; 3.8; 44% | 0.58 | 73% | 0 (0%) | 0.2 (0%) | 0 | 2.8 | bulwark 54 |
| quad_skirmisher | 4 | 40 | 100% ± 0 | 0 / 0 | 8.9 | 2.6, 3.4, 3.7 | 1.19 | 0.72 | 20.3 | 10.8 (11.7) | 1.8 | 0.64 | 11.9 | 3.7 | 83%, 75%; 1.7; 40% | 0.12 | 66% | 0.3 (1%) | 0 (-) | 0.3 | 2.9 | skirmisher 36 |
| solo_rigger | 1 | 40 | 30% ± 7 | 28 / 0 | 6 | 4.9, 5.1, 6.2 | 1.7 | 0.63 | 16 | 5.3 (6) | 1 | 0.88 | 26 | 5.5 | 50%, 22%; 2.2; 56% | 0.11 | - | 0 (0%) | 0.1 (0%) | 0.3 | 2.9 | rigger 27 |
| duo_channeler | 2 | 40 | 93% ± 4 | 3 / 0 | 8.6 | 2.7, 2.4, 2.9 | 1.19 | 0.54 | 16.6 | 5.3 (6.4) | 1.6 | 0.7 | 16.3 | 5.8 | 86%, 48%; 1.7; 62% | 0.12 | 88% | 0 (0%) | 11.4 (3%) | 0.7 | 2.9 | channeler 26 |
| quad_monk | 4 | 40 | 43% ± 8 | 23 / 0 | 6.9 | 5.3, 8, 6.8 | 1.22 | 0.73 | 20.6 | 7 (8.7) | 3 | 1.27 | 30.9 | 4.9 | 52%, 32%; 3.9; 46% | 1.04 | 49% | 0 (0%) | 1.3 (11%) | 0.2 | 3 | monk 108 |
| mix_chaplain_monk | 2 | 40 | 70% ± 7 | 12 / 0 | 7.8 | 3.1, 4.6, 4 | 1.2 | 0.54 | 16.6 | 5.8 (6.8) | 1.4 | 0.95 | 22.1 | 5.5 | 71%, 55%; 2.5; 57% | 0.27 | 87% | 0.1 (0%) | 0.6 (0%) | 0.4 | 2.9 | chaplain 30, monk 29 |
| ctl_bulwark_tank | 1 | 40 | 5% ± 3 | 37 / 1 | 3.4 | 6.2, 11.9, 17 | 1.77 | 0.62 | 16 | 4.5 (5.3) | 1.1 | 2.05 | 71.4 | 9.8 | 39%, 11%; 5.1; 53% | 0.28 | - | 0 (0%) | 0.2 (0%) | 0.1 | 2 | bulwark_plain 37 |
| quad_bulwark | 4 | 40 | 3% ± 2 | 34 / 5 | 3.8 | 8.4, 15.2, 18 | 1.3 | 0.66 | 21.2 | 6.1 (7.8) | 3.3 | 1.25 | 64.7 | 6.8 | 36%, 9%; 3.7; 44% | 1.8 | 48% | 0.4 (0%) | 0 (-) | 0.1 | 3 | bulwark 66 |
| solo_operative | 1 | 40 | 0% ± 0 | 31 / 9 | 2.6 | 7.7, 13.8, - | 1.83 | 0.62 | 16 | 4.7 (4.9) | 1.1 | 1.51 | 46 | 6.2 | 38%, 16%; 3.7; 61% | 0.3 | - | 0 (0%) | 0 (-) | 0.9 | - | operative 31 |
| duo_rigger | 2 | 40 | 50% ± 8 | 20 / 0 | 6.9 | 5.8, 6.6, 6.4 | 1.19 | 0.51 | 16.6 | 6 (7) | 1.4 | 0.4 | 22.6 | 3.8 | 44%, 21%; 1; 59% | 0.29 | 85% | 0 (0%) | 0 (-) | 0.3 | 2.8 | rigger 42 |
| quad_channeler | 4 | 40 | 80% ± 6 | 7 / 1 | 8.1 | 3.2, 3.6, 3.4 | 1.2 | 0.72 | 20.4 | 6.3 (8.1) | 3.1 | 0.72 | 19.9 | 5.4 | 79%, 49%; 2.1; 54% | 0.6 | 62% | 0 (0%) | 24.5 (3%) | 1 | 2.9 | channeler 80 |
| mix_tank_gun | 2 | 40 | 80% ± 6 | 8 / 0 | 8.3 | 3.6, 5.2, 5.7 | 1.2 | 0.55 | 16.6 | 8 (9.1) | 1.2 | 0.88 | 22.6 | 4.9 | 61%, 35%; 2.3; 46% | 0.15 | 86% | 0.1 (0%) | 0.5 (12%) | 0.1 | 2.9 | bulwark 19, skirmisher 10 |
| mix_four_rest | 4 | 40 | 48% ± 8 | 19 / 2 | 6.4 | 4.5, 5.6, 6.4 | 1.23 | 0.7 | 20.6 | 6.8 (8.6) | 3.1 | 0.9 | 32.4 | 5.8 | 60%, 39%; 2.8; 56% | 1.39 | 59% | 1 (1%) | 7.7 (1%) | 0.9 | 2.8 | breaker 76, chaplain 22, channeler 18, operative 1 |
| ctl_operative_gun | 1 | 40 | 0% ± 0 | 39 / 1 | 1.8 | 5, -, - | 1.8 | 0.61 | 16 | 4.1 (4.7) | 1.2 | 1.95 | 68.4 | 12.6 | 54%, 26%; 4.9; 60% | 0.56 | - | 0 (0%) | 0 (-) | 0.2 | - | operative_gun 39 |
| solo_breaker | 1 | 40 | 73% ± 7 | 11 / 0 | 7.8 | 2.8, 2.5, 3.4 | 1.69 | 0.72 | 16 | 5 (5.4) | 1 | 1.33 | 21.8 | 7.4 | 89%, 45%; 3.6; 62% | 0.04 | - | 0 (0%) | 0.7 (33%) | 0.6 | 2.8 | breaker 11 |
| duo_operative | 2 | 40 | 0% ± 0 | 31 / 9 | 2.6 | 8.5, -, - | 1.52 | 0.52 | 17.2 | 5.4 (7) | 1.9 | 1.53 | 53.7 | 6 | 36%, 9%; 4.2; 53% | 1.29 | 67% | 0.3 (0%) | 0.3 (0%) | 0.8 | - | operative 60 |
| quad_rigger | 4 | 40 | 68% ± 7 | 9 / 4 | 7.8 | 7.9, 10, 10.2 | 1.23 | 0.71 | 20.5 | 7.2 (8.7) | 3 | 0.28 | 19.9 | 2 | 25%, 11%; 0.8; 53% | 0.49 | 62% | 0.1 (0%) | 0 (-) | 0.3 | 2.9 | rigger 66 |
| solo_chaplain | 1 | 40 | 30% ± 7 | 28 / 0 | 5.9 | 2.5, 3.6, 4.7 | 1.7 | 0.7 | 16 | 5.7 (6.6) | 0.9 | 1.08 | 27.9 | 8.7 | 81%, 89%; 2.8; 66% | 0.12 | - | 0 (0%) | 0.6 (40%) | 0.7 | 2.8 | chaplain 28 |
| mix_tank_heal | 2 | 40 | 53% ± 8 | 9 / 10 | 6.5 | 7.8, 13.5, 12.8 | 1.24 | 0.52 | 16.7 | 5.8 (7.1) | 1.6 | 1.38 | 88.2 | 8.3 | 24%, 0%; 3.4; 51% | 0.14 | 72% | 0 (0%) | 136.4 (0%) | 0.2 | 2.8 | mender 18 |
| trio_skirmisher | 3 | 40 | 100% ± 0 | 0 / 0 | 8.9 | 2.5, 3.2, 3.7 | 1.18 | 0.66 | 18.1 | 9.8 (10.8) | 1.3 | 0.65 | 12.8 | 4.2 | 88%, 68%; 1.7; 42% | 0.09 | 77% | 0 (0%) | 0.1 (0%) | 0.3 | 2.9 | skirmisher 25 |
| ctl_mender_gun | 1 | 40 | 0% ± 0 | 40 / 0 | 1.9 | 5.3, 7, - | 1.76 | 0.62 | 16 | 4.2 (4.8) | 1.2 | 2.2 | 65.5 | 13.9 | 59%, 33%; 5.8; 59% | 0.53 | - | 0 (0%) | 0 (-) | 0.4 | - | mender_gun 40 |
| duo_breaker | 2 | 40 | 65% ± 8 | 14 / 0 | 7.5 | 3.4, 3.6, 3.3 | 1.2 | 0.54 | 16.6 | 6.2 (7.3) | 1.5 | 1 | 25.3 | 6.8 | 73%, 53%; 2.7; 60% | 0.28 | 83% | 4.6 (8%) | 1.2 (12%) | 0.5 | 2.9 | breaker 61 |
| quad_operative | 4 | 40 | 0% ± 0 | 37 / 3 | 2.1 | 8.9, -, - | 1.45 | 0.61 | 21.8 | 5.9 (8.3) | 3.6 | 1.26 | 62.5 | 7.1 | 34%, 16%; 3.5; 56% | 3.66 | 43% | 0 (0%) | 0 (-) | 0.6 | - | operative 61 |
| solo_mender | 1 | 40 | 15% ± 6 | 17 / 17 | 4.4 | 8, 14, 12.7 | 1.73 | 0.67 | 16 | 4.6 (5.8) | 1.1 | 2.34 | 153.8 | 14 | 21%, 0%; 5.3; 60% | 0.1 | - | 0 (0%) | 133 (0%) | 0.3 | 2.7 | mender 17 |
| duo_chaplain | 2 | 40 | 57% ± 8 | 17 / 0 | 7.4 | 2.5, 3.8, 3.8 | 1.2 | 0.53 | 16.6 | 6.6 (7.8) | 1.3 | 0.65 | 21.5 | 6.2 | 74%, 57%; 1.6; 63% | 0.26 | 84% | 0 (0%) | 0.2 (33%) | 0.7 | 2.9 | chaplain 53 |
| mix_gun_heal | 2 | 40 | 98% ± 2 | 1 / 0 | 8.9 | 3.5, 5.2, 5.1 | 1.18 | 0.55 | 16.6 | 7.8 (8.4) | 1.2 | 0.82 | 25.5 | 5.6 | 55%, 18%; 2.2; 50% | 0.03 | 83% | 0 (0%) | 34.1 (1%) | 0.3 | 2.9 | mender 7, skirmisher 1 |
| trio_channeler | 3 | 40 | 88% ± 5 | 5 / 0 | 8.2 | 3, 3.3, 3.7 | 1.16 | 0.66 | 18 | 7.2 (8.8) | 2.2 | 0.7 | 19.3 | 5.9 | 83%, 57%; 1.9; 56% | 0.42 | 72% | 0 (0%) | 19.1 (4%) | 1 | 2.9 | channeler 67 |
| ctl_monk_plain | 1 | 40 | 68% ± 7 | 13 / 0 | 7.7 | 3.7, 5, 4.7 | 1.68 | 0.69 | 16 | 4.8 (5.4) | 1.1 | 1.41 | 24.1 | 5.6 | 68%, 46%; 3.8; 57% | 0.04 | - | 0 (0%) | 1.6 (37%) | 0.4 | 2.9 | monk_plain 13 |
| quad_breaker | 4 | 40 | 15% ± 6 | 34 / 0 | 4.7 | 4.3, 6.1, 6.7 | 1.27 | 0.68 | 20.9 | 7 (8.8) | 3.1 | 1.27 | 41.2 | 8.2 | 63%, 41%; 3.8; 58% | 1.41 | 50% | 8.7 (5%) | 0.4 (0%) | 0.8 | 2.8 | breaker 92 |
| solo_sigilist | 1 | 40 | 3% ± 2 | 39 / 0 | 2.5 | 3.9, 3.5, 5 | 1.91 | 0.57 | 16 | 4.9 (5.6) | 1.1 | 2.85 | 56.4 | 12.7 | 50%, 23%; 6.4; 59% | 0.39 | - | 0 (0%) | 0 (-) | 0.6 | 3 | sigilist 39 |
| duo_mender | 2 | 40 | 63% ± 8 | 4 / 11 | 7.2 | 7.5, 14.9, 13.3 | 1.24 | 0.52 | 16.7 | 5.3 (6.6) | 1.7 | 1.33 | 99.2 | 8.7 | 22%, 13%; 3.2; 57% | 0.06 | 72% | 0 (0%) | 181.5 (0%) | 0.3 | 2.9 | mender 8 |
| quad_chaplain | 4 | 40 | 70% ± 7 | 12 / 0 | 7.8 | 2.8, 4.2, 4 | 1.2 | 0.71 | 20.4 | 7.5 (9.2) | 2.7 | 0.67 | 19.6 | 5 | 76%, 63%; 2; 53% | 0.54 | 58% | 0.1 (0%) | 0 (-) | 0.9 | 2.9 | chaplain 74 |
| mix_tgh_caster | 4 | 40 | 80% ± 6 | 6 / 2 | 8.4 | 5.8, 7.9, 7.1 | 1.21 | 0.71 | 20.4 | 8.2 (9.6) | 2.7 | 1.05 | 45.8 | 6.6 | 47%, 28%; 3.3; 47% | 0.42 | 53% | 0.3 (0%) | 126.3 (0%) | 0.5 | 2.8 | sigilist 38, skirmisher 14, mender 9 |
| trio_breaker | 3 | 40 | 38% ± 8 | 25 / 0 | 5.9 | 3.7, 4.8, 4.5 | 1.23 | 0.61 | 18.2 | 7.1 (8.9) | 2.2 | 1.13 | 31.7 | 7.4 | 69%, 47%; 3.3; 59% | 0.73 | 63% | 7.1 (7%) | 0.6 (0%) | 0.7 | 2.8 | breaker 81 |
| ctl_gunner_normal | 1 | 40 | 55% ± 8 | 18 / 0 | 7.3 | 3.1, 4.5, 5.4 | 1.64 | 0.73 | 16 | 7.1 (7.7) | 0.7 | 1.25 | 28.3 | 7.2 | 63%, 28%; 3.1; 56% | 0.06 | - | 0 (0%) | 1.4 (19%) | 0.4 | 3 | gunner 18 |
| solo_skirmisher | 1 | 40 | 85% ± 6 | 6 / 0 | 8.4 | 2.6, 3.1, 4.1 | 1.66 | 0.75 | 16 | 7.3 (7.8) | 0.7 | 1.06 | 16.4 | 5.4 | 88%, 83%; 2.7; 49% | 0.02 | - | 0 (0%) | 0.5 (41%) | 0.3 | 2.9 | skirmisher 6 |
| duo_sigilist | 2 | 40 | 5% ± 3 | 38 / 0 | 3.2 | 5.8, 3.3, 6.5 | 1.44 | 0.5 | 17.1 | 4.7 (6.4) | 1.9 | 1.87 | 48.6 | 9.2 | 52%, 35%; 5.1; 57% | 0.98 | 71% | 0 (0%) | 0 (-) | 0.7 | 2.5 | sigilist 62 |
| quad_mender | 4 | 40 | 63% ± 8 | 4 / 11 | 7.1 | 9, 14.9, 14.2 | 1.21 | 0.7 | 20.5 | 6.4 (8) | 3.1 | 1.25 | 105.2 | 8.6 | 26%, 19%; 3.8; 54% | 0.22 | 46% | 0 (0%) | 389.3 (0%) | 0.5 | 2.8 | mender 21 |
| solo_monk | 1 | 40 | 65% ± 8 | 14 / 0 | 7.8 | 3.8, 5.1, 4.9 | 1.67 | 0.7 | 16 | 4.9 (5.5) | 1 | 1.42 | 23.7 | 5.5 | 69%, 64%; 3.7; 55% | 0.04 | - | 0 (0%) | 1.6 (37%) | 0.1 | 2.9 | monk 14 |
| mix_breaker_channeler | 2 | 40 | 88% ± 5 | 5 / 0 | 8.5 | 3.1, 2.9, 3.4 | 1.19 | 0.53 | 16.6 | 5.9 (7.3) | 1.5 | 0.85 | 19.1 | 6 | 82%, 65%; 2.2; 59% | 0.18 | 87% | 3.4 (8%) | 8.1 (7%) | 0.6 | 2.9 | breaker 35, channeler 10 |
| mix_trio | 3 | 40 | 98% ± 2 | 1 / 0 | 9.1 | 3.7, 5, 5.6 | 1.18 | 0.66 | 18.1 | 8.4 (9.8) | 2 | 0.89 | 30.1 | 6.6 | 63%, 38%; 2.6; 55% | 0.13 | 70% | 3 (3%) | 65.4 (0%) | 0.4 | 2.9 | breaker 22, mender 7, skirmisher 2 |

| Cell | Fights entered with a member at 10% HP or less | Lost fights entered so | Lost fights entered with everyone above 10% |
| --- | --- | --- | --- |
| solo_bulwark | 5% (7/134) | 6 of 38 | 32 |
| duo_skirmisher | 2% (6/353) | 0 of 3 | 3 |
| quad_sigilist | 15% (14/95) | 10 of 40 | 30 |
| solo_channeler | 1% (4/323) | 1 of 8 | 7 |
| duo_monk | 2% (7/281) | 3 of 19 | 16 |
| mix_operative_rigger | 1% (2/203) | 2 of 28 | 26 |
| mix_four_b | 6% (20/331) | 3 of 6 | 3 |
| duo_bulwark | 2% (4/169) | 3 of 27 | 24 |
| quad_skirmisher | 5% (17/357) | 0 of 0 | 0 |
| solo_rigger | 1% (2/241) | 2 of 27 | 25 |
| duo_channeler | 1% (5/343) | 0 of 3 | 3 |
| quad_monk | 12% (32/277) | 10 of 23 | 13 |
| mix_chaplain_monk | 4% (14/312) | 5 of 12 | 7 |
| ctl_bulwark_tank | 5% (7/133) | 6 of 37 | 31 |
| quad_bulwark | 9% (13/147) | 10 of 34 | 24 |
| solo_operative | 2% (2/96) | 2 of 31 | 29 |
| duo_rigger | 5% (13/275) | 7 of 20 | 13 |
| quad_channeler | 5% (17/323) | 0 of 7 | 7 |
| mix_tank_gun | 4% (14/332) | 4 of 8 | 4 |
| mix_four_rest | 9% (22/253) | 5 of 19 | 14 |
| ctl_operative_gun | 3% (2/69) | 2 of 39 | 37 |
| solo_breaker | 3% (8/312) | 2 of 11 | 9 |
| duo_operative | 2% (2/95) | 1 of 31 | 30 |
| quad_rigger | 5% (15/306) | 1 of 9 | 8 |
| solo_chaplain | 3% (7/236) | 4 of 28 | 24 |
| mix_tank_heal | 0% (1/251) | 0 of 9 | 9 |
| trio_skirmisher | 2% (7/356) | 0 of 0 | 0 |
| ctl_mender_gun | 3% (2/76) | 2 of 40 | 38 |
| duo_breaker | 3% (10/300) | 1 of 14 | 13 |
| quad_operative | 3% (2/80) | 2 of 37 | 35 |
| solo_mender | 0% (0/160) | 0 of 17 | 17 |
| duo_chaplain | 3% (10/295) | 3 of 17 | 14 |
| mix_gun_heal | 0% (1/354) | 0 of 1 | 1 |
| trio_channeler | 3% (9/328) | 0 of 5 | 5 |
| ctl_monk_plain | 3% (8/307) | 4 of 13 | 9 |
| quad_breaker | 13% (24/188) | 15 of 34 | 19 |
| solo_sigilist | 2% (2/100) | 2 of 39 | 37 |
| duo_mender | 0% (0/278) | 0 of 4 | 4 |
| quad_chaplain | 7% (23/312) | 4 of 12 | 8 |
| mix_tgh_caster | 2% (7/332) | 1 of 6 | 5 |
| trio_breaker | 9% (22/234) | 7 of 25 | 18 |
| ctl_gunner_normal | 1% (2/290) | 2 of 18 | 16 |
| solo_skirmisher | 1% (3/334) | 1 of 6 | 5 |
| duo_sigilist | 7% (9/126) | 9 of 38 | 29 |
| quad_mender | 0% (0/272) | 0 of 4 | 4 |
| solo_monk | 3% (8/312) | 3 of 14 | 11 |
| mix_breaker_channeler | 2% (8/341) | 1 of 5 | 4 |
| mix_trio | 0% (1/362) | 0 of 1 | 1 |

| Cell | Damage taken from guns / melee / casters | Hit %: guns / melee / casters | Attacks a fight a head: guns / melee / casters |
| --- | --- | --- | --- |
| solo_bulwark | 69% / 16% / 16% | 59% / 47% / 64% | 9.2 / 3.8 / 1.7 |
| duo_skirmisher | 72% / 11% / 17% | 52% / 48% / 65% | 1.8 / 0.4 / 0 |
| quad_sigilist | 56% / 41% / 3% | 58% / 58% / 63% | 5.6 / 6.1 / 0.1 |
| solo_channeler | 77% / 17% / 6% | 67% / 54% / 92% | 2.8 / 1.4 / 0 |
| duo_monk | 68% / 12% / 20% | 56% / 43% / 72% | 4 / 1 / 0.4 |
| mix_operative_rigger | 66% / 17% / 17% | 62% / 57% / 78% | 3.7 / 1.5 / 0.4 |
| mix_four_b | 90% / 6% / 4% | 50% / 57% / 78% | 3.7 / 0.2 / 0 |
| duo_bulwark | 71% / 23% / 6% | 51% / 50% / 61% | 8.3 / 3.1 / 0.6 |
| quad_skirmisher | 88% / 8% / 4% | 41% / 57% / 63% | 2.1 / 0.2 / 0 |
| solo_rigger | 66% / 17% / 17% | 69% / 54% / 77% | 2.9 / 2.2 / 0.4 |
| duo_channeler | 75% / 13% / 12% | 66% / 57% / 67% | 1.8 / 0.6 / 0 |
| quad_monk | 84% / 9% / 6% | 48% / 51% / 66% | 7.5 / 0.6 / 0.1 |
| mix_chaplain_monk | 73% / 10% / 17% | 58% / 55% / 74% | 3.3 / 0.5 / 0.3 |
| ctl_bulwark_tank | 70% / 17% / 13% | 59% / 48% / 66% | 9.4 / 4.2 / 1.5 |
| quad_bulwark | 76% / 21% / 3% | 47% / 55% / 56% | 10.9 / 1.9 / 0.2 |
| solo_operative | 64% / 20% / 16% | 70% / 53% / 70% | 6.5 / 4.2 / 1.3 |
| duo_rigger | 79% / 7% / 14% | 64% / 49% / 81% | 2.5 / 0.6 / 0.1 |
| quad_channeler | 92% / 5% / 3% | 55% / 69% / 63% | 2.8 / 0.1 / 0 |
| mix_tank_gun | 69% / 14% / 17% | 50% / 45% / 68% | 3.3 / 0.8 / 0.2 |
| mix_four_rest | 90% / 6% / 4% | 58% / 62% / 71% | 5 / 0.3 / 0.1 |
| ctl_operative_gun | 73% / 9% / 18% | 64% / 53% / 73% | 9.9 / 3.1 / 0.6 |
| solo_breaker | 73% / 21% / 6% | 66% / 56% / 88% | 3.2 / 1.6 / 0.1 |
| duo_operative | 65% / 29% / 7% | 60% / 55% / 71% | 6.3 / 5 / 0.7 |
| quad_rigger | 92% / 6% / 2% | 56% / 56% / 68% | 2.8 / 0.2 / 0 |
| solo_chaplain | 86% / 6% / 8% | 71% / 54% / 73% | 4 / 0.4 / 0.4 |
| mix_tank_heal | 66% / 16% / 18% | 56% / 52% / 67% | 9 / 2.9 / 1.2 |
| trio_skirmisher | 83% / 6% / 11% | 44% / 47% / 71% | 1.9 / 0.2 / 0 |
| ctl_mender_gun | 67% / 17% / 16% | 62% / 53% / 76% | 6.1 / 4.6 / 0.4 |
| duo_breaker | 75% / 13% / 12% | 62% / 56% / 85% | 3.1 / 0.7 / 0.1 |
| quad_operative | 68% / 29% / 3% | 60% / 60% / 69% | 8.4 / 3.1 / 0.2 |
| solo_mender | 71% / 8% / 21% | 68% / 54% / 68% | 14.4 / 4.8 / 3.3 |
| duo_chaplain | 78% / 6% / 17% | 67% / 63% / 65% | 2.3 / 0.2 / 0.1 |
| mix_gun_heal | 70% / 10% / 21% | 55% / 48% / 72% | 2.9 / 0.7 / 0.2 |
| trio_channeler | 88% / 4% / 8% | 58% / 60% / 64% | 2.4 / 0.2 / 0 |
| ctl_monk_plain | 72% / 12% / 17% | 63% / 47% / 71% | 4.8 / 1.3 / 0.7 |
| quad_breaker | 86% / 9% / 5% | 59% / 56% / 80% | 5.5 / 0.7 / 0.1 |
| solo_sigilist | 34% / 60% / 6% | 73% / 55% / 75% | 2.3 / 14.3 / 0.3 |
| duo_mender | 64% / 13% / 23% | 62% / 55% / 79% | 9 / 2.7 / 1.2 |
| quad_chaplain | 91% / 3% / 5% | 54% / 70% / 76% | 2.8 / 0.1 / 0 |
| mix_tgh_caster | 84% / 11% / 4% | 49% / 52% / 67% | 6.4 / 0.9 / 0.1 |
| trio_breaker | 84% / 8% / 8% | 59% / 59% / 74% | 4.1 / 0.7 / 0.1 |
| ctl_gunner_normal | 77% / 10% / 13% | 63% / 50% / 74% | 4.3 / 1.3 / 0.4 |
| solo_skirmisher | 82% / 10% / 8% | 55% / 46% / 63% | 3.7 / 0.9 / 0.1 |
| duo_sigilist | 49% / 44% / 7% | 58% / 55% / 73% | 3.3 / 9 / 0.1 |
| quad_mender | 79% / 14% / 7% | 56% / 62% / 74% | 12 / 1.9 / 0.3 |
| solo_monk | 73% / 11% / 16% | 59% / 42% / 71% | 5 / 1.1 / 0.7 |
| mix_breaker_channeler | 73% / 14% / 12% | 61% / 53% / 69% | 2.4 / 0.7 / 0.1 |
| mix_trio | 81% / 8% / 11% | 56% / 62% / 73% | 3.6 / 0.4 / 0.1 |


## 11. The lead's rulings R1 to R4 (16 Nov 2026): the yardstick, the gun profile, the policies

Rules 1.57 G1's rulings (Core Rules items 4540 to 4548). Same stage-1 runs as above (PF-1 to PF-40, the gear route, 40
seeds a cell), with three changes: **R1** the yardstick is pinned (it does not enter these runs: a Survival clear does not
read it); **R2** the gun profile's low end is softer (k 1.275, +0.0294118 a point: Agility 1 x0.85 of the old damage,
was x0.77; Agility 7 unchanged); **R4** every policy has the dry-gun fallback (`run-policies.ts fallback`, the doors' and
the run's: at an empty gun it reloads if it can, else draws a weapon from the pack that can fight, else picks up a pile's
rounds, magazines or weapon beside it or walks to one it reaches this turn, else the fists on the weakest foe in reach,
else walks to one), and the Sigilist walks a new Line away from its target while a melee foe is within 5 tiles
(`keepRange`). Sections 3, 9 and 10 ran on G1's gun profile.

| Door | Solo, section 10 (lost / stalled) | Solo now (lost / stalled) | Rounds a plain fight | Damage taken a fight | AP left a turn |
|---|---|---|---|---|---|
| bulwark | 3% (38 / 1) | **8%** ± 4 (36 / 1) | 6.2 | 69.5 | 0.1 |
| breaker | 73% | **73%** ± 7 (11 / 0) | 2.8 | 21.8 | 0.6 |
| skirmisher | 85% | **85%** ± 6 (6 / 0) | 2.6 | 16.9 | 0.3 |
| operative | 0% (31 / 9) | **0%** (40 / 0) | 6.3 | 54.6 | 0.5 |
| sigilist | 3% | **3%** ± 2 (39 / 0) | 4.0 | 55.3 | 0.5 |
| rigger | 30% | **35%** ± 8 (26 / 0) | 4.9 | 24.8 | 0.3 |
| mender | 15% (17 / 17) | **25%** ± 7 (17 / 13) | 7.9 | 143.1 | 0.3 |
| channeler | 80% | **80%** ± 6 (8 / 0) | 2.5 | 19.6 | 0.4 |
| chaplain | 30% | **43%** ± 8 (23 / 0) | 2.4 | 25.6 | 0.8 |
| monk | 65% | **65%** ± 8 (14 / 0) | 3.8 | 23.7 | 0.1 |

Controls now: the Bulwark's sheet on the tank policy 10% (35 / 1; was 5%), the Operative's on the gunner 0% (40 / 0), the
Mender's on the gunner 0% (40 / 0), the monk's plain control 68%, the guard's own gunner (plain_gun, normal share,
Agility 4) **63%** (was 55% under G1; 60% before G1).

**The stalled share.** In the ten solo rows, 14 of 400 runs stall (3.5%; section 3: 55, 13.8%; section 10: 27, 6.8%):
the Bulwark 1 and the Mender 13. None is a policy that ends its turn with AP and a foe in reach: every one is a fist
fight at the 20-round cap against a lone foe whose blows land for 1 after the Mender's armour while it Mends itself
for 38 (a War bot, a Hunter drone, a Sergeant, a Heart adept), with no pile on the field to pick up. That is the
Mender's sheet in a one-on-one with an empty revolver, not an idle policy; a stage-1 fight that a human would also
have to walk away from.

**What moved and why.** R2 alone moves the low-Agility gun doors: the Chaplain (the faith build's rifle) 30 to 43%, the
Rigger's pistol 30 to 35%, the gunner control 55 to 63%, and part of the Bulwark's and the Mender's rise; the doors at
Agility 7 (Skirmisher) and the blades and casters do not move. R4 moves the stalls: the Operative's 9 become losses
(the fallback reloads an empty pistol before its policy may wait Hidden), the Mender's pick-ups and draws win some of
the fist fights it used to stall in.

**The Sigilist's range (R4).** Its damage taken was 60% melee (14.3 melee attacks a fight). Two habits measured on the
solo cell: stepping back first to the farthest tile it reaches with half its AP (once a turn, before a new Line, a melee
foe within 3 / 5 / 8 tiles) cleared **0%** each (melee 67 to 68%: the step costs the AP the Line needed, and at
Agility 1 a step back is one tile while the blade closes four); walking the Line away from its target (each step to the
next glyph is a step back) while a melee foe is within 3 / 5 / any tiles cleared 3% each, melee 58 / 57 / 55%. Kept:
the Line walked away at 5 tiles: **3%, melee 57% of its damage taken (12.9 melee attacks a fight)**. The Sigilist's
solo loss is its sheet and door (a Line takes turns to walk at Agility 1), not a policy that walks into the blades.

**Verdicts struck.** Section 1 item 6's and section 10's "the Mender alone 15%, a floor" (now 25%), "the Bulwark alone
3%, control 5%" (now 8 and 10%) and "the Operative's 9 stalls" (none) are struck above. T1 (solo 45 to 75%) is now met
by Breaker 73, Monk 65 and missed by Skirmisher 85 and Channeler 80 (a little over; Leon's rule: not worth chasing) and
by Bulwark 8, Operative 0, Sigilist 3, Rigger 35, Mender 25 and Chaplain 43% (under). Party cells were not re-measured
in this pass.
