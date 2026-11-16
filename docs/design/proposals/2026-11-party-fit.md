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
0.29 report had 54%).

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
