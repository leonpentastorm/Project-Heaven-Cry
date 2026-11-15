# Baseline 0.29 (P2): today's numbers, before any refit

15 Nov 2026, `feature/0.29` on 0.28.1's rules (engine, client and data as live; `23d10eae` plus test-only P2 changes).
Build plan 0.29 section 4.1 "P2": the measuring tools made honest **before** a number is refitted. **No engine, client
or data file was changed and no number was refitted.** Everything below is a measurement, not a proposal. The tables
in parts B and C are the tools' own output, pasted unchanged.

## A. Headlines

Weapons (percent of the plain service rifle's turn: normal share, standard grade, plain shots, 13 tiles; Masterwork
in the measured hands; L1 / L6 / L12; 8 fights a cell, about ±5 points):

1. **Every gun class has a niche where it reads highest, but only the bow and heavy melee are the best in the game
   in theirs.** The as-if longbow reads 189 to 219 normal share and 215 to 246 all in in every band. It sits over the
   ceiling everywhere and tops every gun situation (section C, "Each class's best cell"; its hand is an as-if, see D.4). Leave the longbow out
   and the per-situation tops are: shotguns within 4 tiles (Brigade auto-shotgun 159 / 164 / 170, all in 180 / 209 /
   184), the long rifle at 9 to 16 (138 / 147 / 158), the hand cannon at 1 to 2 (128 / 138 / 153), the Magistrate pistol
   paired (111 / 113 / 119; all in 127 / 130 / 142, the best pistol cell). SMGs have no niche on the range: their best
   cell is 88 to 106 (Legion PDW at 2 tiles). The breacher tube (23 to 50) and the flamer (43 to 76) stay far under even
   on the cluster. The thumper's cluster lifts it from about 48 to 100-110, and all in at 2 tiles it reads 158-175.
2. **Over the 145 ceiling, normal share:** the long rifle (146 to 158 at L6 and L12 in most bands); the shotguns within
   4 tiles (scattergun 149-164, auto-shotgun 148-179, coach gun 153, sawn-off 149); the hand cannon at L12 (153 at 2
   tiles, 146 to 148 on the cluster and paired). **All in, 145 is passed by every rifle** (the service rifle 147 to 162
   in bands 2 to 6), the Blackpoint, the LMG and the core rifle as well. That is today's contract reading (the
   Skirmisher line 159).
3. **Melee against the melee line 165:** the maul 203 / 219 / 235 next to the target (normal share). Over the line as
   well: the war axe, the greatsword, the rip-saw, the machete at L6 and L12, the sabre and katana 161 to 190. Heavy
   melee is the best class in the game next to the target. Fists (gloves or bare) read 42 to 57, knuckledusters 79 to
   106.
4. **Mods (normal share, best legal set at the gun's best band):** the hand cannon with a red dot gains about +9 points
   (to 163 at L12). The Brigade auto-shotgun's sets gain +3 to +6 inside noise: it is already 159 to 182 bare. Every
   other class gains from −18 (a suppressor) to +5. **The hypothetical paired hand cannon with both hands modded reads
   137 / 141 / 158 (estimate, not measurable today).**

Survival (24 seeds a cell, SIM-1 to SIM-24, up to stage 3; the simulator as section D.1 says):

5. **Levels: no character in any cell is level 2 after stop 5 (0 of 16 to 96 characters a cell).** On the most-fights
   route level 2 comes at stop 8 for 14% to 26% of characters, else later. **Level 3 at the Boss: solo gunner 25% (2 of
   8 who got there), four gunners 31% (16 of 52), the mixed four 25% (16 of 64)**, against the plan's 80% target. The
   static route walk (`SIM_LEVELS=1`, 400 maps, no losses) agrees: on the most-fights route 42% are level 3 at the Boss's
   door.
6. **Stage-1 clear rate (gear route / most-fights route):** gunner solo 54% / 33%, duo 13% / 4%, four 63% / 25%. Melee
   solo 67% / 17%, duo 8% / 0%, four 4% / 0%. Sigil caster solo 8% / 0%, duo 0% / 0%, four 0% / 0%. The mixed four
   (gunner, faith, sigil, healer) on the most-fights route: 58%. **Duos clear less than solos for every build**, and four
   melee or four casters clear almost never.
7. **The first fight is lost in 0% to 13% of runs, always to the `firing_line` template** (finding 10.C.3), by the
   solo Sigil caster (3 of 24) and the solo SMG (3 of 24) most. Over a whole run the losses fall mostly to `elite_pack`,
   `firing_line`, `warden`, `caster_guards` and the Boss (`champion`).
8. **HP:** solo and duo parties enter stops 8 to 13 with 30% to 67% of entries under 30% HP (duo gunner, stops 9 to 13:
   50% to 60%). The squad is near death in the second half of stage 1, before the stop-14 rest (finding 10.C.2).
9. **Rounds:** a solo gunner never enters a fight dry (0 of 284 fights, 0 of 207). **Squads do: four gunners 17 of 380
   fights entered with a gun empty (most-fights 5 of 259), the mixed four 17 of 438, from stop 6 to stop 14.** Duo
   gunners: 1 of 141.
10. **Credits and materials, stage 1, a character (gear route):** a solo gunner earns 2,130 and spends 681. It gets 129
    gunpowder and 129 casings, makes 85 rifle rounds once it holds the ammo maker (12 of 24 bought one in stage 1), and
    sells 13 / 13. A solo melee earns 2,533, gets 181 / 181, makes nothing and sells 72 / 72. A solo Sigil caster
    earns 507 and makes no core: 3 mana residue a stage against 10 for a core.
11. **Fights in hand leaving camp:** a gunner holds 56 rounds, uses 7.9 a won stage-1 fight, and has about 7 fights in
    hand. A Sigil caster holds 5 cores and burns 1.4 a fight: **about 3.5 fights of cores (half the gunner's)**, plus 18
    revolver rounds. The supply pack gives the burnt cores back after each fight, so it seldom runs out, but its fights
    are lost first.
12. **Overkill (damage dealt, uncapped, against HP removed):** solo Sigil 48% to 51%, duo 40% to 43%, four 33% to 37%.
    Against that, gunners 13% to 29% and melee 25% to 35%. A caster's number is about half wasted on what it kills.
13. **Speed against tactical reload over a stage (Decrkm SMG, solo, gear route):** no difference. Both clear stage 1 in
    3 of 24, and the rounds entering each stop are within 1 to 10 of each other. Speed reload with pickup brings 2.2
    magazines a stage back off the field, tactical 1.0. **Without pickup** the same runs still clear 3 of 24; they enter
    stops 8 to 12 with 25 to 60 fewer rounds, never dry. **Speed reload pays now:** it costs nothing over a stage, and
    picking up is the safety margin, not the difference.

## B. Survival tables (the simulator's output, 24 seeds a cell)

### B. Levels in stage 1 (entering the stop; every character of the party counted)

| Cell | Runs | Level at stop 4 | Level at stop 8 | Level at the Boss | Level 2 or more after stop 5 | Level 3 at the Boss |
| --- | --- | --- | --- | --- | --- | --- |
| solo_gunner · gear | 24 | L1 100% | L1 100% | L2 92%, L3 8% | 0% (0/20) | 8% (1/13) |
| solo_gunner · fights | 24 | L1 100% | L1 86%, L2 14% | L2 75%, L3 25% | 0% (0/20) | 25% (2/8) |
| duo_gunner · gear | 24 | L1 100% | L1 100% | L2 100% | 0% (0/44) | 0% (0/6) |
| duo_gunner · fights | 24 | L1 100% | L1 100% | L2 100% | 0% (0/38) | 0% (0/4) |
| four_gunner · gear | 24 | L1 100% | L1 100% | L2 87%, L3 13% | 0% (0/96) | 13% (8/60) |
| four_gunner · fights | 24 | L1 100% | L1 86%, L2 14% | L2 69%, L3 31% | 0% (0/92) | 31% (16/52) |
| solo_melee · gear | 24 | L1 100% | L1 100% | L2 88%, L3 13% | 0% (0/23) | 13% (2/16) |
| solo_melee · fights | 24 | L1 100% | L1 74%, L2 26% | L2 80%, L3 20% | 0% (0/23) | 20% (1/5) |
| duo_melee · gear | 24 | L1 100% | L1 100% | L2 100% | 0% (0/38) | 0% (0/4) |
| duo_melee · fights | 24 | L1 100% | L1 100% | - | 0% (0/28) | - |
| four_melee · gear | 24 | L1 100% | L1 100% | L2 100% | 0% (0/72) | 0% (0/4) |
| four_melee · fights | 24 | L1 100% | L1 100% | - | 0% (0/56) | - |
| solo_sigil · gear | 24 | L1 100% | L1 100% | L2 100% | 0% (0/12) | 0% (0/2) |
| solo_sigil · fights | 24 | L1 100% | L1 100% | - | 0% (0/6) | - |
| duo_sigil · gear | 24 | L1 100% | L1 100% | - | 0% (0/24) | - |
| duo_sigil · fights | 24 | L1 100% | L1 100% | - | 0% (0/14) | - |
| four_sigil · gear | 24 | L1 100% | L1 100% | - | 0% (0/44) | - |
| four_sigil · fights | 24 | L1 100% | - | - | 0% (0/12) | - |
| solo_smg · gear | 24 | L1 100% | L1 100% | L2 100% | 0% (0/16) | 0% (0/3) |
| solo_smg_tac · gear | 24 | L1 100% | L1 100% | L2 100% | 0% (0/16) | 0% (0/3) |
| solo_smg+nopickup · gear | 24 | L1 100% | L1 100% | L2 100% | 0% (0/16) | 0% (0/3) |
| solo_gunner+nopickup-nomake · gear | 24 | L1 100% | L1 100% | L2 92%, L3 8% | 0% (0/20) | 8% (1/12) |
| four · fights | 24 | L1 100% | L1 76%, L2 24% | L2 75%, L3 25% | 0% (0/96) | 25% (16/64) |

### B. Stage-1 clear rate, and where the runs fell

| Cell | Runs | Cleared stage 1 | Cleared 2 | Fell in stage 1 at (stop: runs) | First fight lost | First-fight losses by template | All losses by template |
| --- | --- | --- | --- | --- | --- | --- | --- |
| solo_gunner · gear | 24 | 54% (13/24) | 25% (6/24) | 1: 1, 3: 1, 5: 2, 6: 1, 7: 1, 8: 2, 9: 1, 10: 1, 12: 1 | 4% (1/24) | firing_line 1 | elite_pack 8, firing_line 5, warden 5, caster_guards 2, swarm 1, champion 1 |
| solo_gunner · fights | 24 | 33% (8/24) | 4% (1/24) | 2: 1, 3: 1, 4: 1, 5: 1, 6: 2, 7: 4, 8: 2, 9: 1, 10: 1, 11: 1, 13: 1 | 0% (0/24) | - | firing_line 7, elite_pack 6, vault_watch 3, caster_guards 2, machines 1, swarm 1, ambush 1, champion 1, warden 1 |
| duo_gunner · gear | 24 | 13% (3/24) | 0% (0/24) | 4: 2, 6: 1, 7: 1, 8: 8, 9: 2, 10: 3, 11: 1, 12: 1, 13: 2 | 0% (0/24) | - | elite_pack 9, caster_guards 5, healer_line 4, ambush 2, warden 2, machines 1, vault_watch 1 |
| duo_gunner · fights | 24 | 4% (1/24) | 0% (0/24) | 4: 3, 5: 2, 6: 5, 7: 2, 8: 5, 9: 2, 10: 2, 11: 1, 15: 1 | 0% (0/24) | - | elite_pack 9, warden 4, vault_watch 3, healer_line 3, machines 2, champion 1, caster_guards 1, ambush 1 |
| four_gunner · gear | 24 | 63% (15/24) | 42% (10/24) | 7: 1, 8: 4, 10: 1, 11: 1, 12: 1, 13: 1 | 0% (0/24) | - | warden 8, champion 7, caster_guards 2, machines 2, healer_line 1, twin_elites 1, elite_pack 1 |
| four_gunner · fights | 24 | 25% (6/24) | 0% (0/24) | 4: 1, 7: 2, 8: 3, 9: 1, 10: 2, 11: 2, 15: 7 | 0% (0/24) | - | champion 9, vault_watch 4, elite_pack 3, warden 2, ambush 2, machines 1, healer_line 1, firing_line 1 |
| solo_melee · gear | 24 | 67% (16/24) | 33% (8/24) | 1: 1, 6: 1, 8: 3, 9: 1, 13: 2 | 4% (1/24) | firing_line 1 | firing_line 5, warden 4, elite_pack 4, healer_line 2, ambush 1, machines 1, caster_guards 1 |
| solo_melee · fights | 24 | 17% (4/24) | 4% (1/24) | 1: 1, 6: 2, 7: 2, 8: 6, 9: 4, 10: 3, 13: 1, 15: 1 | 4% (1/24) | firing_line 1 | elite_pack 5, warden 5, firing_line 4, machines 3, ambush 2, vault_watch 2, swarm 1, champion 1, rush 1 |
| duo_melee · gear | 24 | 8% (2/24) | 0% (0/24) | 3: 2, 4: 2, 5: 1, 6: 1, 7: 4, 8: 8, 10: 2, 11: 2 | 0% (0/24) | - | elite_pack 10, machines 5, ambush 2, firing_line 1, swarm 1, vault_watch 1, caster_guards 1, healer_line 1, warden 1 |
| duo_melee · fights | 24 | 0% (0/24) | 0% (0/24) | 0: 1, 2: 1, 3: 3, 4: 5, 5: 1, 6: 5, 7: 2, 8: 5, 12: 1 | 0% (0/24) | - | elite_pack 9, firing_line 4, machines 3, caster_guards 3, warden 2, ambush 2, vault_watch 1 |
| four_melee · gear | 24 | 4% (1/24) | 0% (0/24) | 3: 4, 4: 1, 5: 1, 6: 3, 7: 3, 8: 5, 9: 2, 10: 2, 12: 2 | 0% (0/24) | - | caster_guards 7, elite_pack 5, warden 3, firing_line 3, rush 2, machines 2, ambush 1, twin_elites 1 |
| four_melee · fights | 24 | 0% (0/24) | 0% (0/24) | 2: 1, 3: 5, 4: 3, 5: 1, 6: 7, 7: 2, 8: 1, 9: 1, 10: 3 | 0% (0/24) | - | elite_pack 6, caster_guards 4, firing_line 3, rush 2, healer_line 2, ambush 2, machines 2, twin_elites 1, warden 1, swarm 1 |
| solo_sigil · gear | 24 | 8% (2/24) | 0% (0/24) | 1: 3, 2: 3, 3: 3, 5: 3, 6: 4, 7: 3, 8: 2, 10: 1 | 13% (3/24) | firing_line 3 | firing_line 11, swarm 6, elite_pack 3, caster_guards 2, healer_line 1, rush 1 |
| solo_sigil · fights | 24 | 0% (0/24) | 0% (0/24) | 1: 2, 2: 8, 3: 2, 4: 4, 5: 2, 6: 2, 7: 2, 8: 1, 10: 1 | 8% (2/24) | firing_line 2 | firing_line 11, swarm 6, elite_pack 3, caster_guards 2, warden 1, vault_watch 1 |
| duo_sigil · gear | 24 | 0% (0/24) | 0% (0/24) | 2: 4, 3: 4, 4: 2, 5: 2, 6: 4, 7: 5, 8: 2, 9: 1 | 0% (0/24) | - | caster_guards 7, machines 6, firing_line 4, elite_pack 4, swarm 2, ambush 1 |
| duo_sigil · fights | 24 | 0% (0/24) | 0% (0/24) | 1: 1, 2: 7, 3: 5, 4: 2, 5: 2, 6: 3, 7: 2, 8: 1, 10: 1 | 4% (1/24) | firing_line 1 | machines 6, firing_line 4, caster_guards 4, rush 2, elite_pack 2, swarm 2, healer_line 1, warden 1, vault_watch 1, ambush 1 |
| four_sigil · gear | 24 | 0% (0/24) | 0% (0/24) | 2: 2, 3: 5, 4: 2, 5: 4, 6: 4, 7: 4, 8: 3 | 0% (0/24) | - | elite_pack 7, machines 7, caster_guards 4, firing_line 2, ambush 1, healer_line 1, warden 1, swarm 1 |
| four_sigil · fights | 24 | 0% (0/24) | 0% (0/24) | 2: 5, 3: 7, 4: 5, 5: 4, 6: 2, 7: 1 | 0% (0/24) | - | caster_guards 5, firing_line 4, swarm 4, elite_pack 3, machines 3, rush 2, healer_line 2, ambush 1 |
| solo_smg · gear | 24 | 13% (3/24) | 0% (0/24) | 1: 3, 3: 1, 4: 1, 5: 3, 6: 4, 7: 2, 8: 6, 10: 1 | 13% (3/24) | firing_line 3 | elite_pack 11, firing_line 7, caster_guards 2, warden 2, vault_watch 1 |
| solo_smg_tac · gear | 24 | 13% (3/24) | 0% (0/24) | 1: 3, 3: 1, 4: 1, 5: 3, 6: 4, 7: 3, 8: 5, 10: 1 | 13% (3/24) | firing_line 3 | elite_pack 10, firing_line 7, caster_guards 3, warden 2, vault_watch 1 |
| solo_smg+nopickup · gear | 24 | 13% (3/24) | 0% (0/24) | 1: 3, 3: 1, 4: 1, 5: 3, 6: 4, 7: 2, 8: 6, 10: 1 | 13% (3/24) | firing_line 3 | elite_pack 11, firing_line 7, caster_guards 2, warden 2, vault_watch 1 |
| solo_gunner+nopickup-nomake · gear | 24 | 50% (12/24) | 21% (5/24) | 1: 1, 3: 1, 5: 2, 6: 1, 7: 1, 8: 2, 9: 1, 10: 1, 11: 1, 12: 1 | 4% (1/24) | firing_line 1 | elite_pack 7, firing_line 5, warden 4, caster_guards 2, swarm 1 |
| four · fights | 24 | 58% (14/24) | 38% (9/24) | 6: 2, 7: 1, 8: 1, 9: 1, 10: 3, 15: 2 | 0% (0/24) | - | champion 7, vault_watch 3, elite_pack 2, warden 2, machines 1, swarm 1, healer_line 1 |

### B. HP entering each stop of stage 1 (the squad mean share of max HP: mean, lowest; share of entries under 30%)

| Cell | Stop 1 | Stop 2 | Stop 3 | Stop 4 | Stop 5 | Stop 6 | Stop 7 | Stop 8 | Stop 9 | Stop 10 | Stop 11 | Stop 12 | Stop 13 | Stop 14 | Stop 15 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| solo_gunner · gear | 100, 100; 0% | 79, 21; 13% | 80, 19; 13% | 88, 28; 5% | 91, 25; 5% | 88, 25; 5% | 76, 23; 5% | 64, 1; 17% | 67, 18; 22% | 68, 17; 14% | 61, 24; 14% | 68, 6; 7% | 67, 39; 0% | 88, 58; 0% | 88, 58; 0% |
| solo_gunner · fights | 100, 100; 0% | 83, 13; 13% | 84, 19; 4% | 85, 35; 0% | 84, 50; 0% | 79, 38; 0% | 61, 11; 10% | 63, 25; 7% | 61, 24; 25% | 59, 2; 23% | 78, 29; 10% | 79, 29; 11% | 67, 19; 22% | 70, 28; 13% | 70, 28; 13% |
| duo_gunner · gear | 100, 100; 0% | 87, 5; 4% | 86, 5; 4% | 88, 41; 0% | 90, 32; 0% | 81, 32; 0% | 69, 1; 5% | 59, 1; 15% | 39, 1; 50% | 36, 1; 60% | 37, 15; 57% | 39, 12; 50% | 32, 11; 60% | 86, 59; 0% | 86, 59; 0% |
| duo_gunner · fights | 100, 100; 0% | 96, 80; 0% | 89, 41; 0% | 85, 36; 0% | 84, 47; 0% | 73, 27; 5% | 59, 6; 13% | 53, 17; 17% | 29, 9; 57% | 34, 20; 50% | 49, 22; 67% | 59, 19; 50% | 50, 19; 50% | 48, 18; 50% | 48, 18; 50% |
| four_gunner · gear | 100, 100; 0% | 92, 78; 0% | 93, 79; 0% | 92, 68; 0% | 92, 51; 0% | 83, 35; 0% | 73, 14; 8% | 66, 14; 4% | 63, 21; 5% | 64, 13; 8% | 57, 13; 11% | 63, 8; 12% | 55, 2; 13% | 87, 55; 0% | 87, 55; 0% |
| four_gunner · fights | 100, 100; 0% | 95, 79; 0% | 92, 68; 0% | 91, 68; 0% | 87, 48; 0% | 78, 19; 4% | 69, 19; 4% | 66, 19; 5% | 64, 24; 5% | 59, 23; 16% | 60, 25; 13% | 58, 24; 15% | 45, 10; 38% | 40, 3; 38% | 40, 3; 38% |
| solo_melee · gear | 100, 100; 0% | 82, 36; 0% | 83, 36; 0% | 84, 36; 0% | 89, 32; 0% | 83, 32; 0% | 78, 32; 0% | 67, 19; 5% | 73, 12; 14% | 74, 24; 9% | 71, 24; 11% | 63, 10; 28% | 51, 1; 39% | 95, 66; 0% | 95, 66; 0% |
| solo_melee · fights | 100, 100; 0% | 84, 23; 4% | 77, 23; 4% | 75, 7; 4% | 76, 32; 0% | 69, 11; 8% | 56, 1; 32% | 45, 1; 53% | 51, 12; 46% | 48, 7; 40% | 56, 13; 33% | 51, 13; 50% | 43, 8; 50% | 49, 8; 40% | 49, 8; 40% |
| duo_melee · gear | 100, 100; 0% | 73, 40; 0% | 76, 36; 0% | 77, 17; 9% | 84, 41; 0% | 75, 11; 16% | 60, 7; 17% | 56, 6; 14% | 44, 6; 33% | 67, 6; 29% | 47, 9; 25% | 52, 44; 0% | 37, 27; 50% | 100, 100; 0% | 100, 100; 0% |
| duo_melee · fights | 100, 100; 0% | 76, 37; 0% | 66, 8; 4% | 64, 10; 20% | 75, 10; 7% | 63, 18; 14% | 45, 13; 50% | 39, 1; 29% | 26, 26; 100% | 11, 11; 100% | 10, 10; 100% | 9, 9; 100% | - | - | - |
| four_melee · gear | 100, 100; 0% | 65, 13; 13% | 68, 13; 13% | 81, 13; 5% | 87, 43; 0% | 75, 4; 11% | 56, 18; 20% | 48, 17; 25% | 45, 20; 43% | 47, 20; 40% | 46, 34; 0% | 42, 21; 33% | 36, 36; 0% | 100, 100; 0% | 100, 100; 0% |
| four_melee · fights | 100, 100; 0% | 72, 39; 0% | 63, 16; 17% | 65, 10; 11% | 67, 17; 13% | 53, 11; 29% | 55, 5; 29% | 50, 5; 20% | 39, 23; 25% | 35, 29; 33% | - | - | - | - | - |
| solo_sigil · gear | 100, 100; 0% | 70, 11; 5% | 72, 7; 6% | 76, 7; 13% | 73, 10; 20% | 59, 4; 33% | 61, 8; 25% | 57, 8; 20% | 54, 32; 0% | 54, 32; 0% | 88, 77; 0% | 88, 77; 0% | 82, 64; 0% | 82, 64; 0% | 82, 64; 0% |
| solo_sigil · fights | 100, 100; 0% | 70, 15; 9% | 72, 2; 14% | 71, 2; 17% | 80, 36; 0% | 60, 6; 17% | 56, 13; 40% | 69, 61; 0% | 32, 32; 0% | 11, 11; 100% | - | - | - | - | - |
| duo_sigil · gear | 100, 100; 0% | 64, 6; 13% | 72, 19; 10% | 81, 37; 0% | 76, 5; 14% | 63, 5; 25% | 49, 9; 38% | 81, 42; 0% | 49, 49; 0% | - | - | - | - | - | - |
| duo_sigil · fights | 100, 100; 0% | 63, 6; 13% | 67, 1; 19% | 72, 1; 18% | 71, 22; 22% | 66, 28; 14% | 55, 28; 25% | 69, 43; 0% | 56, 56; 0% | 23, 15; 50% | - | - | - | - | - |
| four_sigil · gear | 100, 100; 0% | 58, 6; 21% | 64, 6; 14% | 64, 6; 29% | 70, 18; 33% | 76, 6; 18% | 54, 5; 43% | 71, 13; 33% | - | - | - | - | - | - | - |
| four_sigil · fights | 100, 100; 0% | 70, 18; 8% | 59, 6; 16% | 56, 9; 17% | 68, 39; 0% | 70, 11; 33% | 55, 55; 0% | - | - | - | - | - | - | - | - |
| solo_smg · gear | 100, 100; 0% | 69, 30; 0% | 76, 28; 5% | 82, 17; 5% | 90, 45; 0% | 83, 46; 0% | 79, 33; 0% | 58, 10; 30% | 45, 28; 25% | 60, 26; 25% | 93, 80; 0% | 84, 62; 0% | 76, 60; 0% | 89, 68; 0% | 89, 68; 0% |
| solo_smg_tac · gear | 100, 100; 0% | 69, 30; 0% | 76, 28; 5% | 82, 17; 5% | 90, 45; 0% | 83, 46; 0% | 79, 23; 8% | 64, 10; 22% | 50, 39; 0% | 62, 26; 25% | 93, 80; 0% | 87, 62; 0% | 80, 60; 0% | 93, 79; 0% | 93, 79; 0% |
| solo_smg+nopickup · gear | 100, 100; 0% | 69, 30; 0% | 76, 28; 5% | 82, 17; 5% | 90, 45; 0% | 83, 46; 0% | 79, 33; 0% | 58, 10; 30% | 45, 28; 25% | 60, 26; 25% | 93, 80; 0% | 84, 62; 0% | 76, 60; 0% | 89, 68; 0% | 89, 68; 0% |
| solo_gunner+nopickup-nomake · gear | 100, 100; 0% | 79, 21; 13% | 80, 19; 13% | 88, 28; 5% | 91, 25; 5% | 88, 25; 5% | 76, 23; 5% | 64, 1; 17% | 67, 18; 22% | 68, 17; 14% | 61, 24; 14% | 68, 6; 8% | 67, 39; 0% | 90, 58; 0% | 90, 58; 0% |
| four · fights | 100, 100; 0% | 90, 69; 0% | 91, 69; 0% | 86, 57; 0% | 85, 43; 0% | 84, 21; 4% | 79, 43; 0% | 76, 43; 0% | 76, 32; 0% | 69, 12; 5% | 80, 46; 0% | 76, 37; 0% | 75, 37; 0% | 72, 10; 6% | 72, 10; 6% |

### B. Rounds in hand entering each stop of stage 1 (each character with a gun in hand: mean, lowest; entries at 0)

| Cell | Stop 1 | Stop 2 | Stop 3 | Stop 4 | Stop 5 | Stop 6 | Stop 7 | Stop 8 | Stop 9 | Stop 10 | Stop 11 | Stop 12 | Stop 13 | Stop 14 | Stop 15 | Fights entered with a gun empty (all stages) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| solo_gunner · gear | 56, 56 | 51, 47 | 63, 40 | 69, 39 | 78, 39 | 83, 27 | 82, 18 | 80, 18 | 68, 15 | 92, 5 | 110, 20 | 116, 22 | 131, 38 | 132, 38 | 169, 84 | 0 of 284 |
| solo_gunner · fights | 56, 56 | 51, 46 | 50, 40 | 56, 38 | 65, 34 | 62, 21 | 70, 14 | 73, 21 | 53, 15 | 50, 10 | 64, 6 | 82, 16 | 109, 25 | 108, 16 | 178, 121 | 0 of 207 |
| duo_gunner · gear | 56, 56 | 50, 43 | 62, 41 | 67, 36 | 77, 36 | 77, 25 | 78, 18 | 75, 8 | 76, 6 | 98, 0; 2 dry | 112, 22 | 136, 108 | 138, 87 | 134, 87 | 142, 87 | 0 of 150 |
| duo_gunner · fights | 56, 56 | 51, 48 | 50, 41 | 54, 35 | 64, 14 | 65, 6 | 73, 6 | 74, 6 | 37, 4 | 43, 0; 1 dry | 70, 14 | 72, 8 | 131, 108 | 131, 100 | 171, 140 | 1 of 141 |
| four_gunner · gear | 56, 56 | 51, 48 | 62, 42 | 68, 36 | 76, 23 | 76, 23 | 79, 4 | 86, 17 | 73, 7 | 88, 4 | 105, 0; 1 dry | 119, 0; 2 dry | 121, 0; 2 dry | 119, 0; 2 dry | 151, 0; 2 dry | 17 of 380 |
| four_gunner · fights | 56, 56 | 52, 48 | 50, 42 | 54, 36 | 62, 23 | 62, 22 | 67, 6 | 80, 17 | 73, 7 | 67, 0; 1 dry | 84, 0; 2 dry | 89, 0; 1 dry | 119, 0; 1 dry | 122, 0; 2 dry | 184, 120 | 5 of 259 |
| solo_sigil · gear | 18, 18 | 17, 14 | 25, 12 | 28, 12 | 36, 12 | 40, 12 | 39, 12 | 66, 23 | 39, 22 | 39, 22 | 23, 22 | 32, 22 | 84, 37 | 84, 37 | 126, 97 | 0 of 83 |
| solo_sigil · fights | 18, 18 | 16, 14 | 18, 12 | 19, 12 | 29, 12 | 38, 12 | 54, 12 | 74, 52 | 48, 48 | 48, 48 | - | - | - | - | - | 0 of 72 |
| duo_sigil · gear | 18, 18 | 16, 12 | 23, 12 | 24, 12 | 33, 12 | 36, 12 | 41, 12 | 53, 26 | 33, 24 | - | - | - | - | - | - | 0 of 68 |
| duo_sigil · fights | 18, 18 | 16, 12 | 18, 12 | 17, 12 | 25, 12 | 26, 12 | 45, 12 | 36, 20 | 21, 20 | 18, 18 | - | - | - | - | - | 0 of 74 |
| four_sigil · gear | 18, 18 | 16, 12 | 22, 12 | 26, 8 | 34, 8 | 42, 12 | 53, 12 | 73, 24 | - | - | - | - | - | - | - | 0 of 67 |
| four_sigil · fights | 18, 18 | 16, 12 | 16, 12 | 23, 12 | 34, 12 | 56, 18 | 95, 90 | - | - | - | - | - | - | - | - | 0 of 70 |
| solo_smg · gear | 90, 90 | 78, 63 | 94, 60 | 103, 60 | 112, 60 | 119, 65 | 121, 60 | 113, 25 | 80, 60 | 116, 24 | 148, 85 | 141, 85 | 208, 168 | 203, 152 | 213, 152 | 0 of 108 |
| solo_smg_tac · gear | 90, 90 | 78, 63 | 94, 60 | 103, 60 | 112, 60 | 119, 65 | 121, 60 | 118, 26 | 81, 60 | 117, 24 | 149, 85 | 142, 85 | 209, 168 | 203, 152 | 223, 152 | 0 of 107 |
| solo_smg+nopickup · gear | 90, 90 | 78, 63 | 93, 60 | 100, 48 | 109, 60 | 116, 40 | 115, 46 | 92, 18 | 50, 10 | 93, 24 | 108, 25 | 91, 25 | 138, 101 | 133, 92 | 173, 92 | 0 of 108 |
| solo_gunner+nopickup-nomake · gear | 56, 56 | 51, 47 | 62, 40 | 68, 39 | 77, 39 | 82, 27 | 81, 18 | 78, 18 | 68, 15 | 87, 5 | 98, 5 | 102, 8 | 99, 23 | 96, 23 | 115, 60 | 0 of 263 |
| four · fights | 37, 18 | 34, 15 | 33, 14 | 35, 7 | 41, 2 | 46, 0; 1 dry | 51, 0; 6 dry | 62, 0; 3 dry | 52, 0; 3 dry | 58, 0; 11 dry | 74, 0; 2 dry | 77, 0; 3 dry | 97, 0; 2 dry | 96, 0; 2 dry | 147, 102 | 17 of 438 |

### B. Credits and materials a stage, a character (mean over the characters of the runs that reached the stage)

| Cell | Stage | Runs | Earned | Spent | Spent on (the six largest) | Got: gunpowder, casings, residue | Made | Sold: gunpowder, casings, residue | Ammo makers bought | Field: pickups, magazines back (a run) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| solo_gunner · gear | 1 | 24 | 2130 | 681 | forge 170, buy ammo_maker 150, fit 115, buy guns:rounds 99, upgrade 63, buy mag 47 | 129, 129, 10 | rifle 85 | 13, 13, 4 | 12 | 2, 0.7 |
| solo_gunner · gear | 2 | 13 | 2663 | 2125 | upgrade 1131, forge 475, fit 269, buy mag 149, fit_mod 54, buy ammo_maker 46 | 172, 172, 10 | rifle 196 | 0, 0, 12 | 2 | 4.1, 2.9 |
| solo_gunner · gear | 3 | 6 | 3443 | 1988 | upgrade 1667, buy mag 187, forge 112, fit_mod 23 | 164, 166, 6 | rifle 164 | 0, 0, 13 | 0 | 5.7, 4.3 |
| solo_gunner · fights | 1 | 24 | 1794 | 580 | buy ammo_maker 138, upgrade 125, buy mag 88, fit 81, forge 72, buy guns:rounds 70 | 120, 121, 10 | rifle 90 | 6, 6, 4 | 11 | 2.3, 0.9 |
| solo_gunner · fights | 2 | 8 | 873 | 406 | forge 313, buy mag 40, fit 31, fit_mod 23 | 71, 70, 4 | rifle 70 | 0, 0, 7 | 0 | 2.1, 1 |
| solo_gunner · fights | 3 | 1 | 2879 | 2800 | upgrade 2800 | 198, 194, 8 | rifle 194 | 0, 0, 17 | 0 | 4, 2 |
| duo_gunner · gear | 1 | 24 | 1189 | 495 | forge 145, fit 125, buy guns:rounds 96, buy ammo_maker 81, buy mag 33, fit_mod 15 | 73, 74, 5 | rifle 35 | 12, 12, 2 | 13 | 3.4, 1 |
| duo_gunner · gear | 2 | 3 | 1335 | 1370 | forge 475, upgrade 467, fit 300, buy mag 80, fit_mod 48 | 67, 67, 5 | rifle 67 | 0, 0, 10 | 0 | 8.3, 5.7 |
| duo_gunner · fights | 1 | 24 | 993 | 267 | buy mag 61, forge 61, buy guns:rounds 55, buy ammo_maker 44, fit 42, fit_mod 5 | 59, 59, 4 | rifle 16 | 8, 8, 1 | 7 | 3.6, 1.1 |
| duo_gunner · fights | 2 | 1 | 539 | 260 | buy mag 260 | 36, 34, 1 | rifle 34 | 0, 0, 11 | 0 | 4, 2 |
| four_gunner · gear | 1 | 24 | 2540 | 775 | buy ammo_maker 169, fit 152, forge 133, buy guns:rounds 102, upgrade 94, buy mag 85 | 151, 151, 12 | rifle 91 | 13, 13, 5 | 54 | 8.3, 2.8 |
| four_gunner · gear | 2 | 15 | 3768 | 2197 | upgrade 1350, fit 263, buy mag 235, forge 210, buy ammo_maker 80, fit_mod 47 | 257, 257, 14 | rifle 311 | 0, 0, 15 | 16 | 23.8, 15.3 |
| four_gunner · gear | 3 | 10 | 3338 | 1587 | upgrade 1278, buy mag 207, forge 53, fit_mod 29, buy guns:rounds 14, train 8 | 182, 182, 7 | rifle 182 | 0, 0, 15 | 0 | 16.7, 13.4 |
| four_gunner · fights | 1 | 24 | 2305 | 807 | upgrade 263, buy ammo_maker 188, buy mag 114, fit 97, buy guns:rounds 79, forge 62 | 141, 141, 10 | rifle 107 | 8, 8, 6 | 60 | 9.2, 3.5 |
| four_gunner · fights | 2 | 6 | 3582 | 1022 | upgrade 758, buy mag 127, forge 68, fit 42, fit_mod 27 | 169, 168, 11 | rifle 168 | 0, 0, 14 | 0 | 19.2, 11 |
| solo_melee · gear | 1 | 24 | 2533 | 604 | forge 354, fit 242, fit_mod 9 | 181, 181, 14 | - | 72, 72, 5 | 0 | 1.7, 0.3 |
| solo_melee · gear | 2 | 16 | 2639 | 945 | forge 651, fit 278, fit_mod 16 | 194, 195, 13 | - | 208, 209, 15 | 0 | 3.1, 1.6 |
| solo_melee · gear | 3 | 8 | 4141 | 943 | upgrade 813, forge 88, train 38, fit_mod 5 | 290, 290, 13 | - | 309, 309, 18 | 0 | 4.8, 3.6 |
| solo_melee · fights | 1 | 24 | 1630 | 109 | forge 55, fit 52, fit_mod 2 | 108, 108, 9 | - | 57, 57, 4 | 0 | 1.6, 0.5 |
| solo_melee · fights | 2 | 4 | 1342 | 338 | forge 175, fit 150, fit_mod 13 | 108, 107, 6 | - | 110, 109, 6 | 0 | 2.3, 0 |
| solo_melee · fights | 3 | 1 | 1802 | 0 | - | 124, 124, 6 | - | 0, 0, 0 | 0 | 2, 3 |
| duo_melee · gear | 1 | 24 | 780 | 172 | forge 96, fit 73, fit_mod 3 | 54, 54, 4 | - | 26, 26, 2 | 0 | 2.3, 0.7 |
| duo_melee · gear | 2 | 2 | 668 | 655 | forge 355, fit 300 | 30, 30, 2 | - | 149, 149, 13 | 0 | 2, 1.5 |
| duo_melee · fights | 1 | 24 | 580 | 59 | fit 42, forge 17 | 37, 36, 2 | - | 10, 10, 0 | 0 | 1.9, 0.8 |
| four_melee · gear | 1 | 24 | 734 | 110 | fit 63, forge 44, fit_mod 3 | 49, 48, 3 | - | 22, 22, 1 | 0 | 4.6, 2.4 |
| four_melee · gear | 2 | 1 | 135 | 0 | - | 9, 9, 0 | - | 0, 0, 0 | 0 | 0, 0 |
| four_melee · fights | 1 | 24 | 588 | 51 | fit 42, forge 10 | 38, 38, 2 | - | 7, 7, 0 | 0 | 4, 2.2 |
| solo_sigil · gear | 1 | 24 | 507 | 260 | buy mag 137, forge 43, fit 42, buy ammo_maker 38 | 35, 35, 3 | revolver 16, standard_core 0 | 4, 4, 0 | 3 | 0.5, 0.4 |
| solo_sigil · gear | 2 | 2 | 446 | 0 | - | 33, 33, 2 | revolver 33 | 0, 0, 0 | 0 | 0, 0 |
| solo_sigil · fights | 1 | 24 | 327 | 106 | buy mag 55, buy ammo_maker 38, fit 10, forge 4 | 21, 21, 2 | revolver 7 | 1, 1, 0 | 3 | 0.4, 0.2 |
| duo_sigil · gear | 1 | 24 | 301 | 128 | buy mag 92, fit 21, forge 15 | 17, 17, 1 | - | 6, 6, 0 | 0 | 1.4, 0.7 |
| duo_sigil · fights | 1 | 24 | 339 | 80 | buy mag 29, fit 21, forge 18, buy ammo_maker 13 | 20, 20, 1 | revolver 1 | 1, 1, 0 | 2 | 1.5, 1 |
| four_sigil · gear | 1 | 24 | 292 | 155 | buy mag 145, forge 10 | 16, 16, 1 | - | 8, 8, 0 | 0 | 2.7, 2.1 |
| four_sigil · fights | 1 | 24 | 266 | 52 | buy mag 40, forge 13 | 16, 16, 1 | - | 2, 2, 0 | 0 | 2.2, 1.5 |
| solo_smg · gear | 1 | 24 | 736 | 235 | buy mag 78, buy ammo_maker 50, fit 42, forge 35, trade 31 | 46, 46, 3 | .32 decrkm 48 | 8, 8, 2 | 4 | 2.3, 2.2 |
| solo_smg · gear | 2 | 3 | 661 | 520 | forge 217, fit 200, buy mag 80, fit_mod 23 | 40, 40, 2 | .32 decrkm 80 | 0, 0, 9 | 0 | 2.3, 2 |
| solo_smg_tac · gear | 1 | 24 | 726 | 236 | buy mag 79, buy ammo_maker 50, fit 42, forge 35, trade 31 | 45, 46, 3 | .32 decrkm 48 | 8, 8, 2 | 4 | 1.2, 1 |
| solo_smg_tac · gear | 2 | 3 | 652 | 540 | forge 217, fit 200, buy mag 100, fit_mod 23 | 41, 40, 2 | .32 decrkm 79 | 0, 0, 9 | 0 | 1.3, 0.3 |
| solo_smg+nopickup · gear | 1 | 24 | 731 | 243 | buy mag 85, buy ammo_maker 50, fit 42, forge 35, trade 31 | 45, 45, 3 | .32 decrkm 48 | 8, 8, 1 | 4 | 0, 0 |
| solo_smg+nopickup · gear | 2 | 3 | 661 | 520 | forge 217, fit 200, buy mag 80, fit_mod 23 | 39, 39, 2 | .32 decrkm 78 | 0, 0, 9 | 0 | 0, 0 |
| solo_gunner+nopickup-nomake · gear | 1 | 24 | 1953 | 624 | forge 197, buy guns:rounds 142, upgrade 125, fit 115, buy mag 33, fit_mod 12 | 122, 122, 10 | - | 0, 0, 0 | 0 | 0, 0 |
| solo_gunner+nopickup-nomake · gear | 2 | 12 | 2254 | 2002 | upgrade 700, forge 518, fit 442, buy mag 222, fit_mod 65, buy guns:rounds 56 | 147, 147, 7 | - | 0, 0, 0 | 0 | 0, 0 |
| solo_gunner+nopickup-nomake · gear | 3 | 5 | 2434 | 972 | upgrade 700, buy mag 272 | 152, 152, 5 | - | 0, 0, 0 | 0 | 0, 0 |
| four · fights | 1 | 24 | 2811 | 1050 | buy mag 318, upgrade 303, buy ammo_maker 213, fit 102, forge 59, buy guns:rounds 50 | 185, 186, 15 | rifle 77, revolver 81, standard_core 0 | 7, 7, 5 | 68 | 12.8, 8.2 |
| four · fights | 2 | 14 | 5512 | 2771 | upgrade 2104, buy mag 226, fit 200, forge 181, fit_mod 27, train 27 | 299, 299, 17 | rifle 152, revolver 147, standard_core 0 | 0, 0, 15 | 0 | 28.6, 21.2 |
| four · fights | 3 | 9 | 6177 | 489 | buy mag 227, upgrade 194, train 33, forge 31, fit_mod 3, repair 1 | 306, 307, 14 | rifle 158, revolver 148, standard_core 0 | 0, 0, 14 | 0 | 21.6, 18.4 |

### B. Damage dealt (the effects stream, uncapped) against HP removed, every fight

| Cell | Fights | Dealt a fight | Removed a fight | Overkill share |
| --- | --- | --- | --- | --- |
| solo_gunner · gear | 284 | 318 | 231 | 27% |
| solo_gunner · fights | 207 | 250 | 177 | 29% |
| duo_gunner · gear | 150 | 423 | 318 | 25% |
| duo_gunner · fights | 141 | 391 | 288 | 26% |
| four_gunner · gear | 380 | 1245 | 1081 | 13% |
| four_gunner · fights | 259 | 928 | 795 | 14% |
| solo_melee · gear | 352 | 364 | 251 | 31% |
| solo_melee · fights | 192 | 244 | 158 | 35% |
| duo_melee · gear | 112 | 378 | 262 | 31% |
| duo_melee · fights | 102 | 350 | 232 | 34% |
| four_melee · gear | 107 | 699 | 526 | 25% |
| four_melee · fights | 103 | 662 | 485 | 27% |
| solo_sigil · gear | 83 | 209 | 109 | 48% |
| solo_sigil · fights | 72 | 183 | 90 | 51% |
| duo_sigil · gear | 68 | 350 | 212 | 40% |
| duo_sigil · fights | 74 | 355 | 202 | 43% |
| four_sigil · gear | 67 | 634 | 422 | 33% |
| four_sigil · fights | 70 | 625 | 396 | 37% |
| solo_smg · gear | 108 | 170 | 133 | 22% |
| solo_smg_tac · gear | 107 | 170 | 133 | 22% |
| solo_smg+nopickup · gear | 108 | 170 | 133 | 22% |
| solo_gunner+nopickup-nomake · gear | 263 | 308 | 222 | 28% |
| four · fights | 438 | 1246 | 1098 | 12% |

### B. Leaving camp, a character: credits left, rounds, cores, armour; what a won stage-1 fight used; fights in hand

| Cell | Credits left | Rounds for the gun in hand | Standard cores carried | Armour class | Rounds used a won stage-1 fight | Cores the focus burnt a won stage-1 fight (before the supply pack) | Fights in hand (camp / used) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| solo_gunner · gear | 6 | 56 | 0 | 1 | 7.9 | - | 7.1 (rounds) |
| solo_gunner · fights | 6 | 56 | 0 | 1 | 7.2 | - | 7.8 (rounds) |
| duo_gunner · gear | 6 | 56 | 0 | 1 | 7.3 | - | 7.7 (rounds) |
| duo_gunner · fights | 6 | 56 | 0 | 1 | 6.7 | - | 8.4 (rounds) |
| four_gunner · gear | 6 | 56 | 0 | 1 | 7.4 | - | 7.6 (rounds) |
| four_gunner · fights | 6 | 56 | 0 | 1 | 7 | - | 8 (rounds) |
| solo_melee · gear | 70 | - | 0 | 1 | - | - | - |
| solo_melee · fights | 70 | - | 0 | 1 | - | - | - |
| duo_melee · gear | 70 | - | 0 | 1 | - | - | - |
| duo_melee · fights | 70 | - | 0 | 1 | - | - | - |
| four_melee · gear | 70 | - | 0 | 1 | - | - | - |
| four_melee · fights | 70 | - | 0 | 1 | - | - | - |
| solo_sigil · gear | 2 | 18 | 5 | 1 | 1.2 | 1.4 | 15 (rounds); 3.5 (cores) |
| solo_sigil · fights | 2 | 18 | 5 | 1 | 1.4 | 1.3 | 13.1 (rounds); 3.8 (cores) |
| duo_sigil · gear | 2 | 18 | 5 | 1 | 2 | 1.5 | 9.2 (rounds); 3.3 (cores) |
| duo_sigil · fights | 2 | 18 | 5 | 1 | 1.7 | 1.6 | 10.9 (rounds); 3.1 (cores) |
| four_sigil · gear | 2 | 18 | 5 | 1 | 2.3 | 1.5 | 7.9 (rounds); 3.3 (cores) |
| four_sigil · fights | 2 | 18 | 5 | 1 | 2.2 | 1.4 | 8.1 (rounds); 3.5 (cores) |
| solo_smg · gear | 10 | 90 | 0 | 1 | 18.3 | - | 4.9 (rounds) |
| solo_smg_tac · gear | 10 | 90 | 0 | 1 | 17.5 | - | 5.2 (rounds) |
| solo_smg+nopickup · gear | 10 | 90 | 0 | 1 | 18.3 | - | 4.9 (rounds) |
| solo_gunner+nopickup-nomake · gear | 6 | 56 | 0 | 1 | 7.8 | - | 7.2 (rounds) |
| four · fights | 5 | 37 | 1.3 | 1 | 5 | 0.7 | 7.4 (rounds); 1.9 (cores) |

## C. Weapon rows (the niche tool's output, 8 fights a cell)

### C. Normal share (Masterwork, 8 fights a cell, 8 turns)

The plain rifle a turn (the 100%): L1 71.6 · L6 119.3 · L12 228.7. A cell: % of it at L1 / L6 / L12; **bold** over the ceiling (145 guns, 165 melee); (a) an as-if hand.

#### pistol

| Weapon | band 2 | band 4 | band 6 | band 12 | band 20 | cluster of 3 at 6 | paired at 6 |
|---|---|---|---|---|---|---|---|
| Service pistol (.32 Decrkm) | 75 / 72 / 72 | 77 / 77 / 76 | 70 / 71 / 79 | 66 / 64 / 61 | 0 / 0 / 56 | 73 / 69 / 79 | 83 / 76 / 72 |
| Decrkm auto-pistol | 67 / 75 / 73 | 62 / 71 / 68 | 63 / 66 / 69 | 59 / 56 / 56 | 0 / 0 / 0 | 60 / 76 / 75 | 70 / 77 / 81 |
| Parlour pistol | 37 / 37 / 43 | 39 / 40 / 39 | 35 / 33 / 35 | 35 / 29 / 29 | 0 / 0 / 0 | 35 / 34 / 35 | 35 / 36 / 38 |
| Magistrate heavy pistol | 95 / 93 / 111 | 95 / 97 / 118 | 96 / 85 / 111 | 81 / 89 / 104 | 0 / 0 / 63 | 96 / 96 / 123 | 111 / 113 / 119 |

#### revolver

| Weapon | band 2 | band 4 | band 6 | band 12 | band 20 | cluster of 3 at 6 | paired at 6 |
|---|---|---|---|---|---|---|---|
| Drifter revolver | 100 / 96 / 107 | 109 / 101 / 102 | 98 / 98 / 98 | 84 / 86 / 93 | 0 / 0 / 85 | 100 / 95 / 92 | 100 / 114 / 114 |
| Frontier hand cannon | 128 / 138 / **153** | 126 / 128 / 138 | 116 / 123 / 144 | 79 / 79 / 124 | 0 / 0 / 18 | 127 / 140 / **146** | 130 / 132 / **148** |

#### smg

| Weapon | band 2 | band 4 | band 6 | band 12 | band 20 | cluster of 3 at 6 | paired at 6 |
|---|---|---|---|---|---|---|---|
| Decrkm SMG (.32 Decrkm) | 68 / 78 / 82 | 75 / 73 / 81 | 76 / 79 / 74 | 54 / 71 / 65 | 0 / 0 / 53 | 71 / 82 / 81 | – |
| Legion PDW | 88 / 96 / 106 | 73 / 88 / 87 | 79 / 78 / 84 | 67 / 72 / 73 | 0 / 0 / 61 | 72 / 88 / 92 | 85 / 95 / 107 |
| Whisper SMG | 60 / 60 / 61 | 54 / 60 / 59 | 56 / 61 / 62 | 54 / 49 / 51 | 0 / 0 / 47 | 57 / 62 / 68 | – |
| Mandestra drum-gun | 78 / 75 / 71 | 76 / 77 / 79 | 77 / 83 / 82 | 67 / 71 / 67 | 0 / 0 / 59 | 75 / 91 / 93 | – |

#### rifle

| Weapon | band 2 | band 4 | band 6 | band 12 | band 20 | cluster of 3 at 6 |
|---|---|---|---|---|---|---|
| Hellraiser service rifle | 113 / 130 / 131 | 116 / 137 / 139 | 126 / 139 / 121 | 123 / 129 / 134 | 0 / 0 / 112 | 123 / 137 / 139 |
| Lever carbine | 124 / 127 / 125 | 118 / 125 / 136 | 114 / 118 / 126 | 120 / 117 / 116 | 0 / 0 / 106 | 114 / 127 / 131 |
| Long rifle | 124 / **146** / 145 | 123 / 141 / **155** | 134 / **150** / 145 | 138 / **147** / **158** | 0 / 0 / 119 | 121 / **155** / **155** |
| Adamantile battle rifle | 135 / 133 / 117 | 135 / 129 / 118 | 127 / 131 / 129 | 136 / 126 / 128 | 0 / 0 / 114 | 126 / 120 / 118 |
| CCEC marksman rifle | 112 / 120 / 118 | 122 / 120 / 113 | 121 / 118 / 119 | 119 / 125 / 120 | 0 / 0 / 123 | 131 / 127 / 136 |
| Legion bullpup | 106 / 126 / 132 | 111 / 115 / 126 | 114 / 118 / 117 | 112 / 120 / 125 | 0 / 0 / 98 | 111 / 138 / 133 |

#### shotgun

| Weapon | band 2 | band 4 | band 6 | band 12 | band 20 | cluster of 3 at 6 | paired at 6 |
|---|---|---|---|---|---|---|---|
| Lumeri scattergun | **150** / **149** / **154** | 143 / **154** / **164** | 92 / 91 / 93 | 75 / 76 / 77 | 0 / 0 / 64 | 86 / 86 / 93 | – |
| Coach gun | 138 / **153** / 135 | 124 / 144 / 141 | 65 / 75 / 68 | 53 / 58 / 61 | 0 / 0 / 0 | 70 / 65 / 67 | – |
| Sawn-off | 120 / 135 / **149** | 116 / 119 / 138 | 37 / 38 / 40 | 33 / 34 / 32 | 0 / 0 / 0 | 34 / 39 / 33 | 38 / 38 / 39 |
| Brigade auto-shotgun | **148** / **156** / **179** | **159** / **164** / **170** | 90 / 102 / 101 | 72 / 84 / 83 | 0 / 0 / 71 | 89 / 95 / 105 | – |

#### heavy

| Weapon | band 2 | band 4 | band 6 | band 12 | band 20 | cluster of 3 at 6 |
|---|---|---|---|---|---|---|
| .700 Blackpoint anti-materiel | 123 / 123 / 133 | 125 / 139 / 126 | 122 / 124 / 136 | 120 / 128 / 144 | 0 / 0 / 133 | 125 / 143 / 136 |
| Hellraiser LMG | 108 / 128 / 135 | 110 / 129 / 124 | 115 / 125 / 130 | 110 / 130 / 128 | 0 / 0 / 109 | 110 / 127 / 118 |
| Hellraiser rotary | 87 / 98 / 101 | 92 / 99 / 106 | 88 / 101 / 104 | 87 / 96 / 110 | 0 / 0 / 84 | 92 / 97 / 97 |
| Smetanita thumper | 43 / 72 / 71 | 50 / 44 / 42 | 50 / 48 / 48 | 47 / 47 / 49 | 0 / 0 / 42 | 107 / 110 / 100 |
| Breacher tube | 23 / 25 / 24 | 30 / 31 / 34 | 28 / 21 / 25 | 24 / 37 / 28 | 0 / 0 / 24 | 32 / 48 / 50 |
| Purifier flamer | 52 / 47 / 49 | 50 / 43 / 60 | 48 / 43 / 51 | 0 / 0 / 0 | 0 / 0 / 0 | 44 / 46 / 76 |

#### bow

| Weapon | band 2 | band 4 | band 6 | band 12 | band 20 | cluster of 3 at 6 |
|---|---|---|---|---|---|---|
| Recurve bow | 88 / 90 / 88 | 86 / 91 / 91 | 88 / 90 / 93 | 81 / 93 / 91 | 0 / 0 / 84 | 88 / 89 / 95 |
| Crossbow | 128 / 118 / 120 | 133 / 118 / 116 | 128 / 119 / 122 | 126 / 116 / 118 | 0 / 0 / 68 | 127 / 117 / 121 |
| Longbow (a) | **205** / **213** / **206** | **193** / **211** / **209** | **189** / **213** / **219** | **191** / **216** / **210** | 0 / 0 / **209** | **206** / **218** / **199** |
| Repeating crossbow | 79 / 79 / 82 | 70 / 80 / 79 | 73 / 90 / 80 | 63 / 73 / 66 | 0 / 0 / 70 | 77 / 81 / 78 |

#### mana

| Weapon | band 2 | band 4 | band 6 | band 12 | band 20 | cluster of 3 at 6 | paired at 6 | next to it | walk in from 6 |
|---|---|---|---|---|---|---|---|---|---|
| Science Team core rifle (a) | 137 / 139 / 142 | 136 / 132 / 127 | 130 / 128 / 130 | 128 / 133 / 140 | 0 / 0 / 106 | 123 / 133 / 122 | – | – | – |
| Spellslinger's pistol (a) | 85 / 81 / 82 | 82 / 84 / 80 | 78 / 79 / 73 | 67 / 73 / 69 | 0 / 0 / 64 | 78 / 83 / 89 | 86 / 85 / 84 | – | – |
| Lumeri censer gun (a) | 100 / 118 / 121 | 107 / 121 / 119 | 56 / 63 / 57 | 52 / 53 / 56 | 0 / 0 / 48 | 62 / 62 / 62 | – | – | – |
| Evoker blade (a) | – | – | – | – | – | – | – | 114 / 121 / 131 | 83 / 73 / 78 |
| Emanator gauntlet (a) | – | – | – | – | – | – | – | 74 / 62 / 63 | 48 / 41 / 47 |
| Emanator katana (a) | – | – | – | – | – | – | – | 111 / 128 / 129 | 73 / 77 / 77 |
| Bot-thread banner (a) | – | – | – | – | – | – | – | 101 / 107 / 119 | 71 / 75 / 70 |
| Grand staff (a) | – | – | – | – | – | – | – | 106 / 111 / 101 | 79 / 96 / 96 |

#### light_melee

| Weapon | next to it | walk in from 6 |
|---|---|---|
| Combat knife | 93 / 90 / 111 | 27 / 23 / 11 |
| Sabre | 161 / **174** / **182** | 154 / 158 / **173** |
| Throwing knives | 67 / 70 / 75 | 28 / 25 / 12 |
| Hatchet | 124 / 119 / 147 | 35 / 26 / 16 |
| Legion gladius | 146 / **167** / 157 | 150 / 142 / 154 |
| Kemizuchi duelling blade | 152 / 156 / 153 | 137 / 148 / 139 |
| Katana | 147 / **175** / **190** | 157 / 157 / **168** |

#### heavy_melee

| Weapon | next to it | walk in from 6 |
|---|---|---|
| Ork machete | 132 / **168** / **174** | 115 / 145 / 156 |
| Maul | **203** / **219** / **235** | **181** / 164 / **218** |
| Lance | 124 / 139 / 130 | 126 / 127 / 156 |
| War axe | 156 / **173** / **194** | 161 / 144 / **176** |
| Adamantile greatsword | **180** / **172** / **175** | 137 / 157 / **168** |
| Glaive | 152 / 148 / 149 | 130 / 132 / 149 |
| Ork rip-saw | 156 / 150 / **216** | 147 / 123 / **204** |

#### unarmed

| Weapon | next to it | walk in from 6 |
|---|---|---|
| Gloves or bare fists | 48 / 42 / 52 | 45 / 44 / 44 |
| Knuckledusters | 82 / 92 / 100 | 79 / 83 / 95 |
| Hellraiser servo-fist (a) | 10 / 10 / 12 | 135 / 116 / 146 |

#### Each class's best cell (normal share): its best weapon, the situation where it reads highest (mean over the levels), and the class that is best there

| Class | Best weapon | Situation | Mean % | Best in game there? (the top class and weapon there) | Cells over the ceiling (all situations) |
|---|---|---|---|---|---|
| pistol | Magistrate heavy pistol | paired at 6 | 114 | no: revolver (Frontier hand cannon 137) | none |
| revolver | Frontier hand cannon | band 2 | 140 | no: bow (Longbow 208) | Frontier hand cannon band 2 L12 153; Frontier hand cannon cluster of 3 at 6 L12 146; Frontier hand cannon paired at 6 L12 148 |
| smg | Legion PDW | band 2 | 97 | no: bow (Longbow 208) | none |
| rifle | Long rifle | band 12 | 148 | no: bow (Longbow 206) | Long rifle band 2 L6 146; Long rifle band 6 L6 150; Long rifle band 12 L6 147; Long rifle cluster of 3 at 6 L6 155; Long rifle band 4 L12 155; Long rifle band 12 L12 158 (+1) |
| shotgun | Brigade auto-shotgun | band 4 | 164 | no: bow (Longbow 204) | Lumeri scattergun band 2 L1 150; Brigade auto-shotgun band 2 L1 148; Brigade auto-shotgun band 4 L1 159; Lumeri scattergun band 2 L6 149; Lumeri scattergun band 4 L6 154; Coach gun band 2 L6 153 (+7) |
| heavy | .700 Blackpoint anti-materiel | cluster of 3 at 6 | 135 | no: bow (Longbow 208) | none |
| bow | Longbow | band 2 | 208 | yes | Longbow band 2 L1 205; Longbow band 4 L1 193; Longbow band 6 L1 189; Longbow band 12 L1 191; Longbow cluster of 3 at 6 L1 206; Longbow band 2 L6 213 (+10) |
| mana | Science Team core rifle | band 2 | 139 | no: bow (Longbow 208) | none |
| light_melee | Sabre | next to it | 172 | no: heavy_melee (Maul 219) | Sabre next to it L6 174; Legion gladius next to it L6 167; Katana next to it L6 175; Sabre next to it L12 182; Sabre walk in from 6 L12 173; Katana next to it L12 190 (+1) |
| heavy_melee | Maul | next to it | 219 | yes | Maul next to it L1 203; Maul walk in from 6 L1 181; Adamantile greatsword next to it L1 180; Ork machete next to it L6 168; Maul next to it L6 219; War axe next to it L6 173 (+10) |
| unarmed | Hellraiser servo-fist | walk in from 6 | 132 | no: heavy_melee (Maul 188) | none |

### C. All in (Masterwork, 8 fights a cell, 8 turns)

The plain rifle a turn (the 100%): L1 71.6 · L6 119.3 · L12 228.7. A cell: % of it at L1 / L6 / L12; **bold** over the ceiling (145 guns, 165 melee); (a) an as-if hand.

#### pistol

| Weapon | band 2 | band 4 | band 6 | band 12 | band 20 | cluster of 3 at 6 | paired at 6 |
|---|---|---|---|---|---|---|---|
| Service pistol (.32 Decrkm) | 84 / 92 / 79 | 88 / 83 / 73 | 85 / 85 / 90 | 80 / 74 / 71 | 0 / 0 / 58 | 93 / 85 / 79 | 106 / 97 / 87 |
| Decrkm auto-pistol | 84 / 90 / 89 | 71 / 88 / 80 | 77 / 81 / 77 | 65 / 74 / 66 | 0 / 0 / 0 | 66 / 91 / 83 | 87 / 99 / 93 |
| Parlour pistol | 48 / 46 / 40 | 44 / 44 / 41 | 44 / 39 / 37 | 37 / 37 / 36 | 0 / 0 / 0 | 40 / 39 / 38 | 46 / 44 / 42 |
| Magistrate heavy pistol | 109 / 119 / 123 | 111 / 111 / 122 | 113 / 111 / 127 | 100 / 96 / 120 | 0 / 0 / 76 | 116 / 116 / 129 | 127 / 130 / 142 |

#### revolver

| Weapon | band 2 | band 4 | band 6 | band 12 | band 20 | cluster of 3 at 6 | paired at 6 |
|---|---|---|---|---|---|---|---|
| Drifter revolver | 115 / 119 / 105 | 116 / 120 / 98 | 119 / 115 / 115 | 109 / 98 / 95 | 0 / 0 / 98 | 116 / 116 / 98 | 121 / 139 / 124 |
| Frontier hand cannon | 142 / **148** / **165** | 124 / 125 / **157** | 104 / 110 / **150** | 48 / 50 / 128 | 0 / 0 / 42 | **163** / **157** / **160** | 107 / 107 / **164** |

#### smg

| Weapon | band 2 | band 4 | band 6 | band 12 | band 20 | cluster of 3 at 6 | paired at 6 |
|---|---|---|---|---|---|---|---|
| Decrkm SMG (.32 Decrkm) | 88 / 99 / 90 | 84 / 91 / 91 | 83 / 96 / 96 | 76 / 82 / 80 | 0 / 0 / 60 | 81 / 111 / 91 | – |
| Legion PDW | 102 / 115 / 106 | 94 / 104 / 102 | 92 / 101 / 94 | 82 / 97 / 78 | 0 / 0 / 68 | 86 / 105 / 98 | 112 / 120 / 101 |
| Whisper SMG | 71 / 73 / 70 | 69 / 74 / 69 | 71 / 74 / 68 | 60 / 66 / 57 | 0 / 0 / 48 | 66 / 79 / 72 | – |
| Mandestra drum-gun | 92 / 98 / 88 | 87 / 94 / 87 | 86 / 96 / 90 | 76 / 85 / 84 | 0 / 0 / 61 | 88 / 106 / 94 | – |

#### rifle

| Weapon | band 2 | band 4 | band 6 | band 12 | band 20 | cluster of 3 at 6 |
|---|---|---|---|---|---|---|
| Hellraiser service rifle | **149** / **157** / **153** | **150** / **159** / **153** | **147** / **162** / 143 | 139 / **161** / 138 | 0 / 0 / 128 | **146** / **177** / 145 |
| Lever carbine | **150** / 141 / 141 | 143 / 140 / 126 | 139 / 135 / 134 | **146** / **146** / 122 | 0 / 0 / 113 | 145 / **147** / 133 |
| Long rifle | **149** / **176** / **155** | **152** / **171** / **165** | **152** / **166** / **153** | 143 / **158** / **165** | 0 / 0 / **151** | 140 / **171** / **153** |
| Adamantile battle rifle | **152** / **154** / 132 | **153** / **160** / 135 | **160** / **158** / 133 | **154** / **168** / 135 | 0 / 0 / 119 | **155** / **163** / 142 |
| CCEC marksman rifle | **148** / **150** / 129 | **147** / 145 / 132 | **146** / **146** / 131 | 140 / **157** / 141 | 0 / 0 / 139 | **151** / **152** / 133 |
| Legion bullpup | 145 / **151** / **148** | 142 / **150** / **150** | 134 / **150** / 131 | 137 / **159** / 145 | 0 / 0 / 114 | 128 / **160** / **148** |

#### shotgun

| Weapon | band 2 | band 4 | band 6 | band 12 | band 20 | cluster of 3 at 6 | paired at 6 |
|---|---|---|---|---|---|---|---|
| Lumeri scattergun | **184** / **172** / **154** | **170** / **177** / **157** | 103 / 103 / 96 | 90 / 97 / 90 | 0 / 0 / 74 | 99 / 106 / 91 | – |
| Coach gun | 145 / **168** / **149** | 143 / **169** / 145 | 79 / 79 / 73 | 69 / 72 / 62 | 0 / 0 / 0 | 80 / 73 / 71 | – |
| Sawn-off | 140 / **158** / **152** | 141 / **151** / 144 | 40 / 40 / 39 | 38 / 36 / 35 | 0 / 0 / 0 | 42 / 43 / 40 | 44 / 47 / 42 |
| Brigade auto-shotgun | **182** / **199** / **171** | **180** / **209** / **184** | 104 / 115 / 99 | 89 / 102 / 90 | 0 / 0 / 72 | 108 / 120 / 102 | – |

#### heavy

| Weapon | band 2 | band 4 | band 6 | band 12 | band 20 | cluster of 3 at 6 |
|---|---|---|---|---|---|---|
| .700 Blackpoint anti-materiel | **158** / **152** / 137 | **154** / **153** / 133 | **156** / **153** / 138 | 144 / **151** / 143 | 0 / 0 / 144 | **154** / **152** / 131 |
| Hellraiser LMG | 144 / **150** / **152** | 143 / **155** / 129 | 138 / 145 / 141 | 144 / **157** / 138 | 0 / 0 / 120 | 135 / **152** / **146** |
| Hellraiser rotary | 112 / 114 / 107 | 105 / 123 / 106 | 112 / 125 / 108 | 119 / 120 / 112 | 0 / 0 / 91 | 106 / 120 / 103 |
| Smetanita thumper | **175** / **158** / **163** | 57 / 54 / 48 | 57 / 61 / 53 | 54 / 53 / 54 | 0 / 0 / 45 | 120 / 117 / 109 |
| Breacher tube | 35 / 28 / 28 | 28 / 25 / 25 | 28 / 28 / 28 | 28 / 31 / 31 | 0 / 0 / 25 | 50 / 53 / 41 |
| Purifier flamer | 57 / 58 / 65 | 53 / 52 / 54 | 50 / 49 / 62 | 0 / 0 / 0 | 0 / 0 / 0 | 55 / 53 / 71 |

#### bow

| Weapon | band 2 | band 4 | band 6 | band 12 | band 20 | cluster of 3 at 6 |
|---|---|---|---|---|---|---|
| Recurve bow | 95 / 94 / 92 | 103 / 95 / 96 | 100 / 99 / 99 | 95 / 97 / 94 | 0 / 0 / 84 | 101 / 96 / 94 |
| Crossbow | 144 / 128 / 120 | 136 / 129 / 123 | 139 / 126 / 130 | 124 / 130 / 123 | 0 / 0 / 113 | 137 / 128 / 132 |
| Longbow (a) | **237** / **246** / **219** | **229** / **233** / **227** | **236** / **236** / **215** | **231** / **241** / **226** | 0 / 0 / **235** | **225** / **233** / **227** |
| Repeating crossbow | 97 / 97 / 91 | 96 / 96 / 89 | 91 / 88 / 88 | 85 / 85 / 84 | 0 / 0 / 80 | 91 / 98 / 87 |

#### mana

| Weapon | band 2 | band 4 | band 6 | band 12 | band 20 | cluster of 3 at 6 | paired at 6 | next to it | walk in from 6 |
|---|---|---|---|---|---|---|---|---|---|
| Science Team core rifle (a) | **151** / **157** / 138 | **153** / **159** / 134 | **151** / **159** / 139 | **153** / **178** / **148** | 0 / 0 / 123 | **158** / **165** / **147** | – | – | – |
| Spellslinger's pistol (a) | 95 / 101 / 83 | 95 / 100 / 89 | 98 / 99 / 91 | 85 / 87 / 78 | 0 / 0 / 68 | 98 / 99 / 90 | 94 / 94 / 86 | – | – |
| Lumeri censer gun (a) | 128 / 133 / 121 | 116 / 139 / 123 | 70 / 68 / 64 | 64 / 64 / 60 | 0 / 0 / 45 | 72 / 76 / 64 | – | – | – |
| Evoker blade (a) | – | – | – | – | – | – | – | 148 / 139 / 124 | 101 / 100 / 90 |
| Emanator gauntlet (a) | – | – | – | – | – | – | – | 79 / 73 / 75 | 54 / 57 / 45 |
| Emanator katana (a) | – | – | – | – | – | – | – | 142 / 148 / 130 | 100 / 100 / 90 |
| Bot-thread banner (a) | – | – | – | – | – | – | – | 138 / 121 / 114 | 101 / 91 / 71 |
| Grand staff (a) | – | – | – | – | – | – | – | 135 / 127 / 120 | 122 / 112 / 101 |

#### light_melee

| Weapon | next to it | walk in from 6 |
|---|---|---|
| Combat knife | 134 / 103 / 100 | 23 / 25 / 12 |
| Sabre | **201** / **201** / **205** | **178** / **181** / **202** |
| Throwing knives | 75 / 74 / 79 | 27 / 22 / 14 |
| Hatchet | 148 / 149 / 142 | 25 / 23 / 11 |
| Legion gladius | **179** / **179** / **186** | **179** / **168** / **178** |
| Kemizuchi duelling blade | **175** / 163 / **178** | **166** / 159 / 164 |
| Katana | **198** / **170** / **217** | **187** / **183** / **195** |

#### heavy_melee

| Weapon | next to it | walk in from 6 |
|---|---|---|
| Ork machete | 164 / **201** / **188** | 136 / **173** / 143 |
| Maul | **231** / **222** / **242** | **194** / **197** / **201** |
| Lance | 156 / 157 / 145 | 135 / 138 / 114 |
| War axe | **206** / **210** / **199** | **166** / **184** / **193** |
| Adamantile greatsword | **205** / **203** / **189** | **186** / **183** / 140 |
| Glaive | 157 / **167** / **177** | 150 / 146 / 148 |
| Ork rip-saw | **204** / **190** / **223** | **166** / **188** / **173** |

#### unarmed

| Weapon | next to it | walk in from 6 |
|---|---|---|
| Gloves or bare fists | 57 / 61 / 53 | 51 / 50 / 48 |
| Knuckledusters | 102 / 106 / 103 | 94 / 93 / 92 |
| Hellraiser servo-fist (a) | 10 / 10 / 10 | 132 / 148 / 130 |

#### Each class's best cell (all in): its best weapon, the situation where it reads highest (mean over the levels), and the class that is best there

| Class | Best weapon | Situation | Mean % | Best in game there? (the top class and weapon there) | Cells over the ceiling (all situations) |
|---|---|---|---|---|---|
| pistol | Magistrate heavy pistol | paired at 6 | 133 | yes | none |
| revolver | Frontier hand cannon | cluster of 3 at 6 | 160 | no: bow (Longbow 228) | Frontier hand cannon cluster of 3 at 6 L1 163; Frontier hand cannon band 2 L6 148; Frontier hand cannon cluster of 3 at 6 L6 157; Frontier hand cannon band 2 L12 165; Frontier hand cannon band 4 L12 157; Frontier hand cannon band 6 L12 150 (+2) |
| smg | Legion PDW | paired at 6 | 111 | no: pistol (Magistrate heavy pistol 133) | none |
| rifle | Long rifle | band 4 | 163 | no: bow (Longbow 230) | Hellraiser service rifle band 2 L1 149; Hellraiser service rifle band 4 L1 150; Hellraiser service rifle band 6 L1 147; Lever carbine band 2 L1 150; Lever carbine band 12 L1 146; Long rifle band 2 L1 149 (+49) |
| shotgun | Brigade auto-shotgun | band 4 | 191 | no: bow (Longbow 230) | Lumeri scattergun band 2 L1 184; Lumeri scattergun band 4 L1 170; Brigade auto-shotgun band 2 L1 182; Brigade auto-shotgun band 4 L1 180; Lumeri scattergun band 2 L6 172; Lumeri scattergun band 4 L6 177 (+12) |
| heavy | Smetanita thumper | band 2 | 165 | no: bow (Longbow 234) | .700 Blackpoint anti-materiel band 2 L1 158; .700 Blackpoint anti-materiel band 4 L1 154; .700 Blackpoint anti-materiel band 6 L1 156; Smetanita thumper band 2 L1 175; .700 Blackpoint anti-materiel cluster of 3 at 6 L1 154; .700 Blackpoint anti-materiel band 2 L6 152 (+12) |
| bow | Longbow | band 2 | 234 | yes | Longbow band 2 L1 237; Longbow band 4 L1 229; Longbow band 6 L1 236; Longbow band 12 L1 231; Longbow cluster of 3 at 6 L1 225; Longbow band 2 L6 246 (+10) |
| mana | Science Team core rifle | band 12 | 160 | no: bow (Longbow 233) | Science Team core rifle band 2 L1 151; Science Team core rifle band 4 L1 153; Science Team core rifle band 6 L1 151; Science Team core rifle band 12 L1 153; Science Team core rifle cluster of 3 at 6 L1 158; Evoker blade next to it L1 148 (+8) |
| light_melee | Sabre | next to it | 202 | no: heavy_melee (Maul 232) | Sabre next to it L1 201; Sabre walk in from 6 L1 178; Legion gladius next to it L1 179; Legion gladius walk in from 6 L1 179; Kemizuchi duelling blade next to it L1 175; Kemizuchi duelling blade walk in from 6 L1 166 (+15) |
| heavy_melee | Maul | next to it | 232 | yes | Maul next to it L1 231; Maul walk in from 6 L1 194; War axe next to it L1 206; War axe walk in from 6 L1 166; Adamantile greatsword next to it L1 205; Adamantile greatsword walk in from 6 L1 186 (+22) |
| unarmed | Hellraiser servo-fist | walk in from 6 | 137 | no: heavy_melee (Maul 197) | none |

### C. Mods: each gun class's best gun at its best band, every legal mod alone, then the best of each slot together (normal, % of the plain rifle at L1 / L6 / L12; gain: mean points over the bare gun)

| Class | Gun | Situation | Mods | Cells | Gain |
|---|---|---|---|---|---|
| pistol | Magistrate heavy pistol | band 4 | Red dot sight | 98 / 106 / 120 | +4.7 |
| pistol | Magistrate heavy pistol | band 4 | Scope | 92 / 92 / 113 | -4.3 |
| pistol | Magistrate heavy pistol | band 4 | Suppressor | 87 / 87 / 107 | -9.7 |
| pistol | Magistrate heavy pistol | band 4 | Compensator | 93 / 99 / 109 | -3 |
| pistol | Magistrate heavy pistol | band 4 | Extended magazine | 94 / 107 / 112 | +1 |
| pistol | Magistrate heavy pistol | band 4 | Quick-release magazine | 102 / 91 / 126 | +3 |
| pistol | Magistrate heavy pistol | band 4 | Red dot sight + Quick-release magazine **(the best legal set)** | 94 / 93 / 128 | +1.7 |
| pistol | Magistrate heavy pistol | band 4 | (bare) | 95 / 97 / 118 | - |
| revolver | Frontier hand cannon | band 2 | Red dot sight | 139 / 143 / **163** | +8.7 |
| revolver | Frontier hand cannon | band 2 | Scope | 125 / **147** / **147** | +0 |
| revolver | Frontier hand cannon | band 2 | Red dot sight **(the best legal set)** | 139 / 143 / **163** | +8.7 |
| revolver | Frontier hand cannon | band 2 | (bare) | 128 / 138 / **153** | - |
| smg | Legion PDW | band 2 | Red dot sight | 86 / 90 / 94 | -6.7 |
| smg | Legion PDW | band 2 | Scope | 92 / 102 / 96 | +0 |
| smg | Legion PDW | band 2 | Suppressor | 77 / 85 / 88 | -13.3 |
| smg | Legion PDW | band 2 | Compensator | 90 / 93 / 92 | -5 |
| smg | Legion PDW | band 2 | Extended magazine | 84 / 91 / 100 | -5 |
| smg | Legion PDW | band 2 | Quick-release magazine | 90 / 100 / 94 | -2 |
| smg | Legion PDW | band 2 | (bare) | 88 / 96 / 106 | - |
| rifle | Long rifle | band 12 | Red dot sight | 130 / **148** / **157** | -2.7 |
| rifle | Long rifle | band 12 | Scope | 111 / **150** / **152** | -10 |
| rifle | Long rifle | band 12 | Suppressor | 121 / 134 / 133 | -18.3 |
| rifle | Long rifle | band 12 | Compensator | 141 / **156** / **149** | +1 |
| rifle | Long rifle | band 12 | Compensator **(the best legal set)** | 141 / **156** / **149** | +1 |
| rifle | Long rifle | band 12 | (bare) | 138 / **147** / **158** | - |
| shotgun | Brigade auto-shotgun | band 4 | Red dot sight | **160** / **174** / **170** | +3.7 |
| shotgun | Brigade auto-shotgun | band 4 | Scope | **155** / **170** / **176** | +2.7 |
| shotgun | Brigade auto-shotgun | band 4 | Extended magazine | 145 / **184** / **182** | +6 |
| shotgun | Brigade auto-shotgun | band 4 | Quick-release magazine | **166** / **172** / **172** | +5.7 |
| shotgun | Brigade auto-shotgun | band 4 | Bayonet | **151** / **172** / **177** | +2.3 |
| shotgun | Brigade auto-shotgun | band 4 | Red dot sight + Extended magazine + Bayonet **(the best legal set)** | **158** / **165** / **179** | +3 |
| shotgun | Brigade auto-shotgun | band 4 | (bare) | **159** / **164** / **170** | - |
| heavy | .700 Blackpoint anti-materiel | band 12 | Red dot sight | 116 / 133 / 123 | -6.7 |
| heavy | .700 Blackpoint anti-materiel | band 12 | Scope | 137 / 126 / 136 | +2.3 |
| heavy | .700 Blackpoint anti-materiel | band 12 | Scope **(the best legal set)** | 137 / 126 / 136 | +2.3 |
| heavy | .700 Blackpoint anti-materiel | band 12 | (bare) | 120 / 128 / 144 | - |
| bow | Longbow | band 2 | Red dot sight | **194** / **211** / **211** | -2.7 |
| bow | Longbow | band 2 | Scope | **203** / **223** / **225** | +9 |
| bow | Longbow | band 2 | Scope **(the best legal set)** | **203** / **223** / **225** | +9 |
| bow | Longbow | band 2 | (bare) | **205** / **213** / **206** | - |
| mana | Science Team core rifle | band 2 | Red dot sight | 129 / 142 / **148** | +0.3 |
| mana | Science Team core rifle | band 2 | Scope | 138 / 137 / 119 | -8 |
| mana | Science Team core rifle | band 2 | (bare) | 137 / 139 / 142 | - |

### C. HYPOTHETICAL: the paired hand cannon with a modded off hand (not measurable today: a paired attack drops the off hand's mods). Paired at 6 tiles × (single with the set ÷ single bare, both at band 2)

| Level | Paired at 6, bare | Single at 6, bare | Single at band 2: bare, with mod_red_dot | Hypothetical paired, both hands modded |
|---|---|---|---|---|
| 1 | 130 | 116 | 128, 139 | **141** (estimate) |
| 6 | 132 | 123 | 138, 143 | **137** (estimate) |
| 12 | 148 | 144 | 153, 163 | **158** (estimate) |


## D. Method (so a re-run reproduces it)

### D.1 What the simulator now does (test code only: `packages/engine/test/balance/survival-run.ts`, `run-policies.ts`)

Everything goes through the reducer's own actions, as a player would on 0.28.1's rules:

- **The field:** after a won fight each character walks to every pile (`world/act move`, the engine's path and AP,
  free there) and picks it up whole (`world/act pickup`). Then everyone marks Leave. Its own dropped magazines come
  back this way.
- **Making:** whenever no fight is on, every row of the make view (`makeView`, `gear/make`) whose gives feed what it
  carries: rounds of a calibre a gun in hand fires, cores for a core user, as many times as it can; then `gear/load`.
  An empty magazine (`mag:<gun>:0`) is bought for each magazine's worth of loose rounds with nowhere to go.
- **The ammo maker** is bought at a shop when it pays: the rounds the materials held, plus ten more fights' worth at
  this character's own rate so far, priced at `ROUND_PRICE`, reach the maker's `priceOf`, and the purse keeps a 60-credit
  reserve after it.
- **Selling** (`run/sell`, the one sell rule) at every shop before buying: weapons in the pack, magazines and rounds no
  gun in hand takes, gunpowder and casings without a maker (unless one pays), and mana residue for a character that
  makes no cores.
- **Mods** at a Forge: a mod from a pick is fitted through the Forge's own `run/fit_mod` offer, for the fee. Mods are
  bought from the Forge's stock (`lastingFor`) and fitted the same way. The fees are counted (`fit_mod` in the spend
  table).
- **Casters:** `sigilRun` now rewrites a new Line of 3 or 4 glyphs to carry SPREAD (else CHAIN) when two or more foes
  stand within that word's reach of one another (Balance 2.0 section 6, fix 1). The Evoke's aim is still the engine's
  `planEvoke` over every foe the shape catches. A level-1 to level-3 Sigilist knows only FIRE, SEEK, CONDENSE and STONE
  (SPREAD at level 6), so the fix does not show in stage 1. The caster's camp is the game's Recommended loadout: Class
  1 armour like the gunner, a core, revolver rounds, plus the 4 cores its Evoker comes with. No fix 2 ("stay on the
  glyphs") was needed beyond the existing plan logic, and abandoned glyphs are not counted (left for P2a's follow-up).
- **Overkill:** each fight's damage to the foes is read from the effects stream (`shot` / `melee` when they hit,
  `hurt`; the effect objects are kept and read when the fight is over, since a shot's damage is written on it after it
  is emitted). It is set against the HP the foes lost.
- **New members and parties:** `melee` (opt_blade, Recommended loadout: a heavy blade), `smg` / `smgTac` (the camp's
  free Decrkm SMG, magazine-fed, speed or tactical reloads), the parties `solo_/duo_/four_` × `gunner/melee/sigil`,
  `solo_smg`, `solo_smg_tac`. There is also the most-fights route (`fights`: fights and Elites first, the vault's
  guard taken, no detour to a rest), and cell flags `:nopickup` and `:nomake` for the before-and-after.
- **The guard** (`survival-run.test.ts`, in `npm run check`): "a gunner never enters a fight dry" is **restored** and
  passes on its eight seeds (it was skipped in 0.28.1).

### D.2 Commands (from `packages/engine`)

```
# Survival (about 6.5 min, 552 runs)
SURVIVAL_SIM=1 SIM_SEEDS=24 SIM_MAX_STAGES=3 SIM_OUT=runs.json \
SIM_CELLS=solo_gunner:gear,solo_gunner:fights,duo_gunner:gear,duo_gunner:fights,four_gunner:gear,four_gunner:fights,\
solo_melee:gear,solo_melee:fights,duo_melee:gear,duo_melee:fights,four_melee:gear,four_melee:fights,\
solo_sigil:gear,solo_sigil:fights,duo_sigil:gear,duo_sigil:fights,four_sigil:gear,four_sigil:fights,\
solo_smg:gear,solo_smg_tac:gear,solo_smg:gear:nopickup,solo_gunner:gear:nopickup-nomake,four:fights \
  npx vitest run test/balance/survival-run.test.ts -t "the measure" --silent=false
SIM_REPORT=runs.json SIM_BASELINE=1 SIM_REPORT_OUT=base.md npx vitest run test/balance/survival-run.test.ts -t "the tables"
SIM_REPORT=runs.json SIM_REPORT_OUT=tab.md npx vitest run test/balance/survival-run.test.ts -t "the tables"   # the older per-stage tables

# Weapons (about 13 min)
NICHE_MEASURE=1 NICHE_N=8 NICHE_LEVELS=1,6,12 NICHE_VARIANTS=normal,allin NICHE_OUT=niche.json \
  npx vitest run test/balance/niche-measure.test.ts -t "full run" --silent=false

# The static route walk (seconds)
SIM_LEVELS=1 npx vitest run test/balance/survival-run-levels.test.ts -t "the table" --silent=false
```

Seeds: Survival `SIM-1` to `SIM-24` per cell (`SIM_FROM` moves the window). The weapon rows' fights are seeded by
`runCell` from the cell key: `SIM-<build|variant|level|policy|tier|map|foes|tag|opts>-<i>`. Everything is
deterministic: the same commands on the same commit print the same tables. Long runs are env-gated; `npm run check`
gains only the niche tool's one-fight sanity test and the restored dry assertion.

### D.3 The weapon rows (`test/balance/niche-measure.ts`)

The range target (a Soldier's numbers at the character's level, 5,000 HP, never acts) at **2, 4, 6, 12 or 20 tiles** on
bare ground. The shooter is **held**: its policy's moves are refused to it, so it fires from where it stands. Each gun
is played three ways (plain shots, the gunner without Mag Dump, the gunner with it) and the best counts. The other
situations: a **cluster** of three targets a tile apart at 6 tiles (damage on all of them added); **paired** (the same
one-handed gun in each hand) at 6. **Melee** is measured next to the target (held) and walking in from 6 tiles,
heavy and unarmed in the optimised blade build, light and finesse in its Dexterity twin. **Mods:** the class's best gun
at its best band, every working mod alone (fitted by the engine's `fitMod`), then the best of each slot together.
The yardstick is the plain rifle at 13 tiles, walking allowed: L1 71.6, L6 119.3, L12 228.7 a turn.

### D.4 What these numbers cannot show (read before refitting from them)

1. **As-if hands, marked (a):** the longbow, the core rifle, the Spellslinger's pistol, the censer gun and the mana
   arms need a skill the builds lack; it is raised to the need after the build is made and the weapon put in hand. The
   longbow's 189 to 246 comes from a Dexterity marksman given Raw Power 3. It is a real reading of the weapon's numbers,
   but not of a reference build.
2. **Band 20 reads 0 for every gun at L1 and L6 and non-zero at L12.** That is the shooter's sight (Vision grows with
   level), not the gun's range. The "past 16 tiles" niche is measurable only at L12 here.
3. **Odd rows to trace before they are trusted:** the servo-fist reads 10% next to the target and 116 to 148 walking
   in. The combat knife, the hatchet and the throwing knives fall to 11-35% walking in (they read 90-150 next to it).
   Both look like policy artefacts, not weapon numbers.
4. **Noise:** 8 fights a cell is about ±5 points. Mod gains under 5 points are inside it.
5. **Stalls:** 12 of 552 runs stopped at the 20-round cap with foes standing (a simulator limit: a gun empty in a fight
   with rounds in the pack next to a caster, a hidden foe). They count as not cleared.
6. **Small bases:** a share at the Boss is over the characters who got there (2 to 64), so it is printed with its
   counts.
7. **Speed and tactical reload** were compared on the Decrkm SMG (the camp's only free magazine gun of the gunner's
   choice). The Recommended lever carbine loads round by round and drops nothing.

## E. Findings for P3 (not fixed here: no number was refitted)

1. **The dry rule's guard passes for the solo gunner, but squads run dry:** four gunners enter 17 of 380 fights (4.5%)
   with a gun empty, the mixed four 17 of 438, from stop 6 on. A squad's characters earn credits and materials each on
   their own, and the four-gunner squad spends on grades before ammunition. The guard asserts solo only.
2. **Level 2 never arrives by stop 5, level 3 at the Boss on 25% to 31% of characters who reach it on the most-fights
   route** (target: 80%, finding 10.C.1).
3. **Duos clear stage 1 far less than solos** (gunner 13% against 54%; melee 8% against 67%), and four melee or four
   Sigil casters almost never (4%, 0%). The small-party dial (`share`, `pressure_per_char`) is the first suspect.
4. **The Sigil caster's overkill is 48% to 51% alone**, and its camp holds about 3.5 fights of cores (the gunner about
   7). Its stage-1 clear rate is 8% / 0%.
5. **`firing_line` is the only template that takes a first fight** (13% of solo Sigil and solo SMG runs).
6. **Over the ceiling in their niche** (normal share): the long rifle at 9-16 and the shotguns within 4. All in, every
   rifle passes 145. Melee: the maul 203-235 and most heavy blades over 165 next to the target.
