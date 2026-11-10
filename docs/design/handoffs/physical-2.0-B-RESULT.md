# Physical 2.0, implementer B: result note (ranged)

Branch: **`claude/physical-2.0-B-ranged`**, from `origin/claude/charming-gauss-hbq4n0`. Written 10 Nov 2026. The base is
merged in up to `bf4a1e0` (merge commit `40175ac`, then `fe4ae9b` and `304e513` to follow the base's changes).

**Status: all 25 ranged techniques, the quiver and the thrown rules are built and tested.** `techniquePad` shows none of
them as "not built yet" (a test in `phys-ranged-ai.test.ts` checks this). Every check passes (the numbers are at the end).

How the lane was built: seven builds in parallel (fire, press, sets, takes, watches, quiver, thrown), one integration
pass (`31bc509`), a review with 37 findings, all fixed (`c9218aa`), a completeness pass (`d4edc74`), then the base merge.
History: `git log f54079f..HEAD`.

## What is done

Each technique: what it does, and the property lines it honours. Numbers come from `t.num(...)`; each technique's own
`numbers` in `data/techniques.json` are filled in.

**Fire (`physical/ranged/fire.ts`)**
1. **Snap Shot (1).** Fires a weapon drawn from the pack at −2. Quick: no penalty. Heavy: not offered (`not_with`). It
   follows the base's `needs.stowed`: `args.item` names the pack weapon, the core judges, previews and draws it, and the
   handler is the shot alone (see readings 1).
2. **Burst (2).** Two rolls at one target, the second at −2, 3 rounds. Auto: today's burst (3 rolls at 0/−1/−2, the
   barrel cools 1), and it may split between two targets next to each other (`targetIds`). Quick: no −2. It runs as one
   `'burst'` volley with roll indexes (Fire Discipline, Duck and Roll), no Recoil after the first roll, wears the weapon
   once, raises the `volley` fx and `volley_end` (Spray and Pray).
3. **Called Shot (4).** −2; `args.opt` is leg (Slowed), arm (lowered) or head (Dazed) on a failed Body save. Precise: no
   penalty. Loud or Heavy: leg is Prone through `stop` (Stopped once applies). Spread: only within 4 tiles.
4. **Walking Fire (5).** Moves up to 2 tiles (`args.tile`) and fires at a point of the move (`args.opt`, a step index;
   default the best chance). Quick: 3 tiles, no opportunity attacks. Auto: the shot is a 3-round burst. Heavy: not offered.
5. **Punch Through (6).** Half cover counts −2, not −5, and every shot through it damages the cover. Heavy: on a hit the
   round carries to the next enemy in line at half damage (no new roll or round; it keeps its pierce and uses that
   target's once-a-turn Pressure slot). Blast or Spread: the half cover is destroyed.
6. **Lob (7)** (in `thrown.ts`). A shot at −4 at a target only the side sees (through smoke). Arc: over full cover at −2.
   Blast: no roll, today's `blast()` damage and radius, +2 Pressure in the radius. A grenade is Lob's weapon through the
   base's throwable wield (`args.item`).

**Press (`physical/ranged/press.ts`)**
7. **Rake (9).** Without Auto: up to 3 targets within 2 tiles of each other, each at −3, +1 Pressure on a hit, 6 rounds.
   Auto: today's full-auto cone (one roll per enemy on the line at −2, +1 Pressure each hit or miss, 10 rounds, run inside
   `chained(..., 'auto')`). Spread: the 3 targets may be 3 tiles apart (readings 6).
8. **Warning Shot (10).** 1 round, no roll: a Heart save or +1 Pressure. Loud: the save is 2 harder. Silent: not offered.
9. **Flush (11).** No roll, no prompt: the half cover facing the shot takes the weapon's damage (×2 with Spread or Blast),
   then +2 Pressure. Arc: the cover takes nothing and the target takes half damage.
10. **Mag Dump (12).** Empties the weapon: one roll per 3 rounds left (at least 1, at most 4) at 0, −1, −2…; +1 Pressure a
    hit; Heat ends one under the limit. Auto: +1 Pressure a roll, hit or miss. Quick and Precise: no growing penalty.
    Spread: one roll at ×2 within 4 tiles. Drawn: not offered.
11. **Crossfire (13).** Needs a target an ally (not the user) has hit this round (`hitByAlly`); +2 to hit; a hit adds +1
    Pressure more. Quick: a 1-tile step first (`args.tile`).

**Sets (`physical/ranged/sets.ts`)**
12. **Bead (14).** Marks a target (`techState(u, 'bead')`): the holder's shots at it ignore one range band (Precise: +1 to
    hit), and its Pressure doesn't fall while the holder sees it (a `pressureDecay` rule). Ends when the holder moves
    (Heavy: after 1 tile), names another, or smoke or a flashbang lands on the holder.
13. **Spot (15).** Until the spotter's next turn its allies have +1 to hit the target, and the first ally hit adds +1
    Pressure. Precise: allies also ignore one range band. Silent: the target's side isn't told (hidden pip, `only` fx).
14. **Brace (16).** Sets today's braced stance. Weapons with today's Brace action brace anywhere; every other weapon needs
    half cover next to it. Heavy: needs no code (`u.braced` already removes the penalties). Auto: while braced on that
    tile, Suppress gives +1 Pressure more on its target (shown in Suppress's preview too).
15. **Load Special (17).** Chambers one carried special round (`ammo_<type>` from the pack) for the next Fire with that
    weapon; the magazine stays as it is. Spread: every strike of that technique carries the rider (the later ones come
    out of the magazine). Drawn: not offered.
16. **Shift (18).** 1 tile cover to cover (Quick: 2), with no held Watch or old Overwatch firing; opportunity attacks and
    move blocks (Prone, Pinned, Grappled, halted) still apply. Heavy: a Braced user stays Braced.
17. **Vent (19).** −2 Heat (Heavy: −4). Drawn: not offered.
18. **Head Down (20).** −1 Pressure on yourself, −2 with full cover next to you; no Watch this round (`u.noWatch`), and a
    held Watch or old Overwatch ends.

**Takes (`physical/ranged/takes.ts`)**
19. **Pin Down (22).** A shot at ×0.7 (Auto: full damage); on a hit, a save or Pinned 1 round (Suppressed: save at −2).
    Drawn or Silent: the base's nail, `stop(..., { untilAp: 2 })` (readings 2).
20. **Rout (23).** No damage, spends its round as a shot (Heat, Recoil, reveal). A Heart save (Suppressed: −3; Loud: −2
    more) or the target runs its full move away, drawing opportunity attacks and Watches. Blast: every Pressed enemy in
    the radius saves or runs, and each pays the Take's 2 Pressure.
21. **Stopping Shot (24).** On a hit, a save or −1 AP next turn and pushed 1 tile. Suppressed: Prone too. Loud or Heavy:
    pushed 2. Spread (within 4 tiles): pushed 2 and Prone.
22. **Storm (25).** Moves up to 3 tiles toward the target, then shoots; only the target can't react to the walk.
    Suppressed: critical on 18–20. Quick: +2 to hit. Spread: a Body save or Prone on a hit.
23. **Last Round (26).** Only with the last round (Drawn: the last arrow). +3 to hit. Suppressed: cover doesn't count.
    Quick and Precise: ×1.5 damage. A kill sets `u.freeReload` (not for a bow: it can't reload in a fight).

**Watches (`physical/ranged/watches.ts`)**
24. **Cover Me (29).** Names an ally (Auto: two). The first enemy the holder sees attack one of them is at −2 for that
    attack (every roll of a volley) and gains +1 Pressure. The covering round is a shot by today's rules. Precise: the
    holder also takes the shot.
25. **Dead to Rights (30).** Names an enemy. When it attacks, stands up (new `stood_up` hook), reloads (either hand) or
    leaves cover while Pressed, the shot lands first at +2. Precise: critical on 18–20. Silent: the user stays Hidden.
    An attacker felled by it never makes its attack (`ctx.cancel`); a felled reloader reloads nothing.

**Enemy AI.** Every handler has a pure `ai(t)` score. A soak test plays enemies holding every ranged technique through
`enemyTurn` with 21 weapons. Bead and Spot score once a turn (enemies used to switch their Bead every action).

## The quiver (`physical/ranged/quiver.ts`)

1. `loadQuiver(c, weaponId, load)` is registered with `quiverLoader` (the `phys/quiver` action). Out of a fight it sets a
   count per arrow type up to the weapon's magazine (20), from arrows carried (calibre `arrow` stacks, typed by
   `ammoType`). The old load goes back to the pack first, so unloading is the empty load. A refusal changes nothing.
2. In a fight, `u.quiver` is built at `combat_start` (`armQuiver`), or on the first attack for a unit that joins later.
   An enemy archer gets standard arrows at capacity. `u.ammo` always equals the quiver's total, so the core's gates work.
3. Each shot fires the arrow `args.ammo` names (default: the type with the most left), and that type's rider applies, in
   the preview too. A held Watch remembers the arrow it named.
4. No plain reload of a Drawn weapon anywhere: a `reloadRefuser` registry in `combat.ts` is asked by `reload()`,
   `reloadHands()` and `weaponActions()`, so Running Reload, Between Heartbeats and Resupply can't refill a bow either.
   Crossbows aren't Drawn and keep their reload.
5. The Marksman's Special Ammo on a bow is refused in a fight; in the story it fills the quiver with that arrow type.
6. After the fight the quiver is written back to `c.phys.quiver`.

## Thrown (`physical/ranged/thrown.ts`)

1. A carried grenade is Lob's weapon (the base's throwable wield, `args.item`): the grenade's own Blast in throwing range,
   no roll, `spendRounds(t, 1)` takes one from what is carried. +2 Pressure only for a grenade that does damage.
2. A launcher's Blast (thumper on its Blast line, breacher tube) spends a round with Heat and Recoil like a shot.
3. A Lob blast marks the enemies it damages as hit with that weapon (`hitRound`, `hitWith`), so a blast kill pays drill.
4. Smoke, flashbangs and the bot-scrambler landing on any unit (through Lob or today's Throw) end its held Watch, its old
   Overwatch and its Bead (`endBead`, with the `bead_end` fx). A new `blast_landed` hook in `tactics.blast()` carries it.
5. Anyone standing in smoke at the end of a turn sheds at least 2 Pressure. A Bead's hold (0) wins in either import order.
6. Today's Throw is untouched and keeps every grenade effect (Blinded, the scrambler's Stun, burning tiles).

## The effects events (done; was requests 7 and the fx lane's `EVENTS_FOR_THE_LEAD`)

The ranged effects (`apps/web/src/game/fx/ranged.ts` on the fx branch) key on these. Field names match what that file
reads. Every one is presentation only: no rule reads them. An event about a unit the other side can't see now carries
`only: <its side>` (`ownSideOnly` in `physical/core.ts`, the same test `watch_set` used), so a Hidden holder isn't
given away. Tests: `test/phys-ranged-fx-events.test.ts`.

| # | Event or field | Payload | Where |
| --- | --- | --- | --- |
| E1 | `technique` + `line`, `opt`, `ammo`, `weapon` | `line`: the property line that applies (the player's `args.line` when held, else the main line's held property; null off its home or with none); `opt`: `args.opt` or null; `ammo`: `args.ammo`, or the grenade's id when a carried grenade is the weapon, or null; `weapon`: the weapon id | `core.ts useTechnique` |
| E1a | `shot` (and `melee`) + `tech`, `vi` | `tech`: the technique id; `vi`: the roll's place among this use's real rolls (0 first) | `core.ts strike` passes `fx` to `resolveAttack` (new option, spread into the event; a cone's extra rolls carry it too). The no-roll rounds: `looseRound` (Warning Shot, Flush, Rout, Cover Me) and Lob's shots, `vi: 0` |
| E2 | `swap_in` | `{unit, at, weapon, from: 'pack', tech, only?}` | `core.ts useTechnique`, after the stowed draw through the gear service succeeds (Snap Shot; Draw Cut gets it too). The base's draw emitted nothing |
| E3 | `carry` | `{unit, from: target's tile, to: next's tile, target: next id, tech}` | `fire.ts punch_through`, before the carried hit |
| E4 | `volley` with `mode` `suppress` / `rake` / `dump` | `{unit, target, from, to, weapon, cat, mode, shots, tech}`; Rake adds `targets: [ids]`; Mag Dump `shots` is the rounds loaded, plus `rolls` | `press.ts`: Suppress (3), the 3-target Rake (its rounds), Mag Dump (not the Spread line: one roll). The rolls run in `chained()` **without a volley name**, so the shots carry `chain: true` and no hook sees `ctx.volley` (Duck and Roll, Cover Me and the class burst hooks read it; a name would change them). A volley whose first roll is refused is taken back out of the stream |
| E5 | `save` | `{unit: the target, at, ok, tech, only?}`, passed and failed; nothing in a preview; `only` when the user's side can't see the target | `core.ts save()` |
| E6 | `lane` / `lane_end` | `{unit, at: the lane's centre, r, only?}` / `{unit, why: 'turn' \| 'down'}` | `press.ts` Suppress Heavy where the lane is set; `turn_start_pre` and a new `on_downed` listener (the holder falls) |
| E7 | `heat` with `why: 'dump'` | `{unit, at, now, was, why, limit, only?}`; `now` is the Heat after the core's Press +1, `was` the Heat before the dump | `press.ts mag_dump` |
| E8 | `technique` + `with` | the ally whose hit this round made Crossfire legal (the first one listed in `hitRound`) | a new optional `fx(t)` on `TechHandler`, merged into the technique event; Crossfire's in `press.ts` |
| E9 | `shot` + `round` | the special round or arrow type fired (`ammoId`), omitted for standard rounds | `combat.ts resolveAttack` |
| E10 | `routed` | `{unit, from, to, by}` | `takes.ts rout`, before each run |
| E11 | `free_reload` | `{unit, at, tech, only?}` | `takes.ts last_round` |
| E12 | Cover Me's loose round: `covering: true` | (was `cover: true`, which clashed with the shot's cover field) | `watches.ts cover_me` |
| E13 | `watch_fire` + `why` | `'attacks' \| 'stands up' \| 'reloads' \| 'leaves cover'` | `fireWatch` takes extra fields; `watches.ts rights()` passes `why` |
| E14 | `object` + `max` | the object's most HP | `combat.ts damageObject` |
| E15 | `stopped` + `apLoss` (and `untilAp` for a nail) | the data number the stop costs | `core.ts stop()` |
| E16 | `load` + `weapon`, `hand` | Load Special's chambered round: the weapon and hand it was loaded for | `sets.ts load_special` |
| E17 | `only` on `watch_end`, `bead`, `bead_end`, `heat` | the holder's side, when the other side can't see the holder | `core.ts endWatch`; `sets.ts` (Bead, its end, Vent, Head Down's old Overwatch); `thrown.ts` (smoke ending an Overwatch). Vent's `heat` also gains `limit` |

Notes for the client side:
1. A shot with a Load Special round now carries `round`, so `ranged.ts` takes `e.round` and never calls `roundOf()`
   for it: the `pending` entry the `load` event set stays, and the next Fire's first shot (standard) would show the old
   round. The client should clear `pending` for the unit when a shot carries `round` (or when a `tech` shot of a Fire
   technique arrives).
2. A Press's own volley now precedes its shots; Spray and Pray and Ammo Hog read the stream and see `suppress`, `rake`
   or `dump`, which they treat as not full auto (as before, when no volley was sent). One edge changes: a Mag Dump
   right after a full-auto volley no longer reads as a round of that full auto (its first roll got Spray and Pray's +1
   before; the dump isn't full auto, so this is a fix).
3. `phys-ranged-press.test.ts`'s full-auto Rake test counted every volley in the fight; the opening enemy turns can
   Suppress, which now sends its own volley, so it counts the user's.

## Readings (for Leon and the lead)

1. **Snap Shot is pack-only.** The base marks it `needs.stowed`, so it is used only with a stowed weapon (`args.item`).
   The lane's "swap the off-hand gun to the main hand" and the plain in-hand use are gone, though the data text still
   says "Draw or swap". The swap would need a change to the base's `usable()` and `wieldOf`. Today no enemy can use it
   (an enemy has no character pack).
2. **Pin Down's nail is the base's.** It doesn't pay itself at turn start: it holds until the unit, or an ally next to
   it, spends 2 AP to pull free (`combat/pull-free`); the enemy AI does this on its turn.
3. **A Press's +1 Heat jams nothing.** The base adds it after the run and doesn't check the jam limit then. Before the
   merge it could cause a jam. The Flush test now jams from the round's own Heat. Mag Dump leaves Heat one lower so the
   core's +1 lands it one under the limit.
4. **Volleys are one attack action.** Burst, Walking Fire's Auto burst, Rake and Mag Dump take no Recoil after their
   first roll and wear the weapon once (today's `fireBurst` and `fireAuto`).
5. **Rake's Auto needs 10 rounds loaded** and is refused with the count otherwise. Today's full auto fired with fewer.
6. **Rake's Spread line** ("the cone is 1 wider"): Rake's home is Auto, so a Spread-only gun is off its home. Spread lets
   the 3-target Rake's targets be 3 tiles apart; the Auto cone is never widened.
7. **Mag Dump** rolls `max(1, floor(rounds / 3))`, at most 4. "At least one" is ours, so a 2-shell gun can dump.
8. **Mag Dump Spread** past 4 tiles is a normal roll, not a refusal (Called Shot's Spread limit is a refusal).
9. **Flush** uses the half cover facing the shot; none is a refusal. Its ×2 with Spread or Blast replaces the weapon's
   own cover-damage grant (the breacher's ×3 is ×2 inside Flush).
10. **Warning Shot, Flush, Rout and Cover Me's covering round** fire a round with no roll. Each counts as a shot: Heat
    +1 (with a jam at the limit), Recoil count, wear 1, a reveal unless Silent (`looseRound` in press.ts).
11. **Warning Shot and Rout's Heart save** use the core's stop TN (12). "At −2" is read as the TN 2 higher.
12. **Rake, Warning Shot and Flush refuse an ally** as the target ("Pick an enemy."). Not in the text; added.
13. **Crossfire's Quick step is optional**; a tile sent with a non-Quick weapon is refused. If a held shot stops the
    step, the shot is lost (null, not a refusal).
14. **Bead ends on any move of the holder**, forced moves and technique steps included. Heavy's "1 tile" is 1 tile in
    all for that bead. Bead needs the holder's own sight; squad sight doesn't count.
15. **Bead and Precise Spot don't stack:** together they still ignore one range band.
16. **Spot's +1 to hit** applies to every ally attack, melee included; the spotter's own hits don't count. A Take's hit
    neither adds nor uses the mark. Spot needs a living ally ("No one to spot for.").
17. **Brace "resting on half cover"** means a standing half-cover tile next to the user. Only weapons with today's Brace
    action brace on open ground (the thumper, breacher tube and flamer need cover).
18. **Load Special** is extra to the magazine; "your next Fire" is the next Fire-group technique with that weapon and
    hand. Press, Take, Watch and the old attack actions leave it chambered. A second load while one is chambered is
    refused.
19. **Shift** moves through `moveUnit` at 0 AP: opportunity attacks and move blocks apply, held Watches don't.
20. **Head Down** needs Pressure on you; "this round" means until `cb.round` changes; full cover is any full-cover tile
    next to you.
21. **Rout "runs its full move"** is the tiles a fresh turn's 6 AP buys, to the reachable tile farthest from the user.
    A Prone, Pinned or cornered unit doesn't run (a note says so). Loud's −2 applies whether or not the target is
    Suppressed.
22. **Rout and Storm walk with the lane's `walkFree`** (`moveUnit` with AP and bank put back), not the base's
    `stepUser(t, route, { unit, oa: true })`. Walking Fire and Shift do the same. The result is the same set of
    reactions; see requests 9.
23. **Stopping Shot's Spread** "pushed 2 and Prone either way" is read as Prone whether or not Suppressed, still only on
    a failed save. The review's other reading is Prone whether the save succeeds or not.
24. **Storm "without its reaction"**: only the target can't react; other enemies' opportunity attacks and Watches fire.
    "Toward the target" means the end tile is strictly closer.
25. **Last Round's free reload** goes on the next main-hand speed reload. A reload whose AP something else waives
    (Resupply, Running Reload, Between Heartbeats: `reload(..., { free: true })`) leaves it owed. A bow's kill gives none.
26. **Cover Me** needs a shot it could make (`canStrike`) on every line, since a Watch is a held shot. Its +1 Pressure
    lands before the attack, so an attacker made Pressed also takes the −1 for that.
27. **Dead to Rights' "leaves cover"** is a first step from a tile against cover to one that isn't. "Stands up" fires
    after the stand (the shot hits it standing).
28. **Lob's Arc in Blast mode:** a Blast from something with Arc goes over full cover ("Lob a frag over the wall");
    without Arc the path must be clear of walls. Smoke never blocks.
29. **Lob's AP** with a grenade is Lob's flat 3, not Throw's 2. Smoke, flashbang and scrambler through Lob give no
    Pressure. A blast kill gives no kill-spill Pressure (the spec's Bulwark ruling: area blasts aren't ranged attacks).
30. **The quiver:** capacity is the weapon's magazine (20); the old provisional 12 (class item 266) is ignored except for
    Special Ammo's own fill. Ties for "the most left" go to standard, then the `ammo_types` order. A named type that
    runs out mid-volley falls back to the most plentiful type; a single shot naming an empty type is refused. Suppress's
    extra arrows come out of the named type first.

## Shared-file edits relative to the base (`bf4a1e0`)

1. `combat.ts`: `chained` is exported. Rake and Burst run their volleys in it.
2. `combat.ts` `previewAttack`: the hook gets `noLos` (Lob's Arc) and `bandsLess` (Bead, Spot).
3. `combat.ts` `resolveAttack`: option `quiet` (a Hidden shooter stays Hidden). Dead to Rights.
4. `combat.ts` `toggleProne`: emits `stood_up` after standing. Dead to Rights.
5. `combat.ts` `moveUnit`: `move_step` carries `noWatch` from `move_cost`. Shift.
6. `combat.ts`: `reloadRefuser` / `reloadRefused` registry, asked by `reload()`, `reloadHands()` and `weaponActions()`.
   The quiver.
7. `combat.ts` `reload()`: option `free` (AP waived, the owed free reload stays owed); returns with nothing done if a held
   shot felled the reloader. Last Round, Dead to Rights.
8. `combat.ts` `reloadHands()`: the off hand emits `reload` with `hand: 'off'`; a felled unit reloads nothing and spends
   nothing. Dead to Rights.
9. `effects/types.ts`: HookNames `stood_up` and `blast_landed`.
10. `tactics.ts` `blast()`: emits `blast_landed`. Thrown (smoke, flashbang, scrambler).
11. `game.ts`: `combat/reload` runs `refuseHook` first. The quiver.
12. `physical/types.ts`: `StrikeOpts` gains `quiet`, `noRecoil`, `noWear`, `vi`; `HeldWatch` gains `line` and `ammo`.
13. `physical/core.ts` `dispatch`: passes a held Watch's line, allyIds and arrow; skips held Watches when `ctx.noWatch`.
14. `physical/core.ts` `gate`: Drawn wording ("The quiver is empty.", "Only with the last arrow in the quiver."); a pack
    weapon of the wrong kind says "That isn't a ranged weapon."
15. `physical/core.ts`: the `StrikeRound` registry (`pick`, `fired`, `done`, `spent`) used by `strike()` and
    `spendRounds()`. Load Special and the quiver.
16. `physical/core.ts` `strike`: passes `quiet`, `noRecoil`, `noWear`, `vi`.
17. `physical/core.ts` `holdWatch`: stores the line and arrow.
18. `physical/ranged/shared.ts`: re-exports `strikingWith`, `strikeRound`, `StrikeRound`, `TECHNIQUE`.
19. `classes/i.ts`: Special Ammo refused on a bow in a fight, fills the quiver in the story; its `reload` listener skips
    `hand: 'off'`.
20. `classes/rev3.ts` (Speed Loader), `perks/c.ts` (Holy Ordnance): `reload` listeners skip `hand: 'off'`.
21. `perks/c.ts` (Running Reload), `perks/e.ts` (Between Heartbeats), `faith.ts` (Resupply): call
    `reload(..., { free: true })`.
22. `data/techniques.json`: the `numbers` of the 25 techniques only.
23. Tests outside the lane's files: `test/classes-i.test.ts` gains one test (Special Ammo with a bow).
24. The effects events (E1–E17): `combat.ts` `resolveAttack` option `fx` and the shot's `round`, `damageObject`'s `max`;
    `physical/types.ts` `TechHandler.fx`; `physical/core.ts` `ownSideOnly`, the technique, `swap_in`, `save`, `stopped`,
    `watch_end` and `watch_fire` fields; `physical/ranged/shared.ts` re-exports `ownSideOnly`.

## Requests for the lead

1. **Rake's `auto_ap`.** The Decrkm SMG's grant (full auto for 3 AP) isn't honoured: Rake with Auto costs 4. `apFor`
   asks `attack_preview` with mode `auto`, but the grant is read only in `previewAttack`'s `ap0`. `techniqueAp` should
   read it as it reads `aimed_ap`.
2. **An AI step for holding Watches.** The enemy AI has no "hold a shot with the last AP" step, so Overwatch (2) and
   Cover Me (4) never beat a plain attack (5). Dead to Rights (6) is picked only against a Pressed target.
3. **Tearing free of Pin Down's nail.** The base's `pullFree` and `combat/pull-free` now cover it (unit or ally, 2 AP;
   the AI frees itself). What remains: a button on the screen, and Leon's ruling on readings 2.
4. **Burst outside `chained` / Fire Discipline.** Burst now runs inside `chained(..., 'burst')` with `vi`, and the base's
   `apFor` asks with mode `burst`, so Fire Discipline's 2 AP should reach the Burst technique. No ranged test covers
   that pairing; please add one or confirm it.
5. **`u.quiver` wiring.** It is built in a `combat_start` hook (`armQuiver`), lazily on the first attack for late
   joiners. If you build it in `unitFromCharacter` / `unitFromEnemy`, also set `techState(u, '_quiver').w = u.weapon`.
   The Proving Ground's `sandboxOver` emits no `combat_end`, so the write-back is skipped there.
6. **Screen items for C:**
   1. Bead and Spot marks (`techState(u, 'bead').targetId`; `techState(target, 'spotted')`, whose `hidden` hides it from
      the target's side).
   2. A chambered round (`techState(u, 'load_special')`).
   3. "No held shot this round" (`u.noWatch === cb.round`).
   4. The free reload's 0 AP on the reload entry and the pad while `u.freeReload` is set.
   5. The quiver menu (`phys/quiver`) and an arrow picker on bow shots (`args.ammo`; `quiverView(u)` gives counts).
   6. Snap Shot's and Lob's pack lists (`packPad`), Walking Fire's fire point (`args.opt`), Called Shot's part
      (`args.opt`), Burst's split (`targetIds`).
7. **New fx events** for the catalogue comment in `combat.ts`: `bead`, `bead_end`, `spot`, `heat`, `load` `special`,
   and the effects events E1–E17 (done: see "The effects events" above; only the catalogue comment is left).
8. **A Press's +1 Heat and the jam** (readings 3): decide whether the core should check the jam limit when it adds it.
9. **One move helper.** `walkFree` (takes.ts), Walking Fire's walk and Shift's walk call `moveUnit` and put AP back. The
   base's `stepUser(t, route, { unit, oa: true })` may now do the same job; folding them in is the lead's call.
10. **One no-roll shot helper.** press.ts's `looseRound` and thrown.ts's launcher Blast repeat the Heat, Recoil and reveal
    bookkeeping. A core `noRollShot(t)` would keep them the same.
11. **Suppress's preview and pressure filters.** Brace's Auto +1 is added by Suppress itself now; Guard and the
    Defender's wall still aren't shown on the Suppress card, because previews don't run `pressureFilter`s.
12. **`within_N` lines.** `linesFor`'s `when` knows only `braced`. Stopping Shot, Called Shot and Mag Dump check their
    "within 4 tiles" in the handler; a generic `within_N` would serve all three.
13. **`stop()` and pushes in a preview.** Stopping Shot adds its push to `pv.moves` itself through `forceMove`.
14. **Physical Silent vs `isSilent`.** The parlour pistol is Silent in `physical/` but not in `tactics.ts`; the `quiet`
    option works around it for Dead to Rights only.
15. **Heart Overwatch and Storm.** Heart Overwatch doesn't go through `reaction_window`, so a Soul caster target could
    still react to Storm's walk.
16. **Arrows in shops and loot** need calibre `arrow` stacks with `ammoType`; the `ammo_<type>` items are gun rounds.
    `c.phys.quiver` is keyed by weapon id, so two bows of one id share the type breakdown.
17. **Lob and melee hands.** Lob needs a ranged weapon in hand, except with a grenade as its weapon. Decide whether
    `combat/throw` should stay open to characters who know Lob (today it does).
18. **Defender's Head Down rider** ("also covers an adjacent ally") is a class rule; not built.
19. **Rout with the frag grenade** (the frag teaches Rout): whether Rout through a grenade spends the grenade.
20. **Snap Shot's swap** (readings 1): if the off-hand swap should come back, `usable()` and `wieldOf` need it.

## Not done

1. Snap Shot from a weapon already in a hand (the base made it pack-only; readings 1).
2. The Defender's Head Down rider (requests 18).
3. Enemy grenade use (spec item 95: enemies don't throw yet).
4. A launcher's loaded special round (an incendiary 40 mm round) has no rider through Lob's Blast.
5. The Cook It, Firebreak, Sudden Dark, Static and Cover Me grenade grants stay Narrator ops.
6. Any screen work (requests 6).
7. `sets.ts`'s header comment still says thrown.ts sets the Bead's `targetId` itself; it calls `endBead` now.

## Untested

1. Walking Fire's second leg blocked part-way, and a walk halted by Deny that still fires.
2. Punch Through's Heavy carry killing the second target.
3. Lob with Catch, Jacked In or Daggerfall Veteran; Lob on a dark map (only smoke is tested).
4. Flush with Blast on the breacher tube (preview only).
5. Crossfire's Quick step cut short by a held Watch.
6. Load Special with Walking Fire's Auto burst, and in the off hand.
7. Shift with Suppress's held lane and with melee Answers on the way.
8. Rout and Storm through traps and hazards; a Heart Overwatch target during Storm.
9. Dead to Rights set off by a forced move.
10. The quiver through a real mid-fight gear swap; a unit joining mid-fight with a bow.
11. Spray and Pray actually running on a Rake volley (the fx, chain flags and `volley_end` are tested).
12. Fire Discipline with the Burst technique (requests 4).

## Tests

| File | Tests |
| --- | --- |
| `packages/engine/test/phys-ranged-fire.test.ts` | 42 |
| `packages/engine/test/phys-ranged-press.test.ts` | 43 |
| `packages/engine/test/phys-ranged-sets.test.ts` | 46 |
| `packages/engine/test/phys-ranged-takes.test.ts` | 37 |
| `packages/engine/test/phys-ranged-watches.test.ts` | 33 |
| `packages/engine/test/phys-ranged-quiver.test.ts` | 26 |
| `packages/engine/test/phys-ranged-thrown.test.ts` | 38 |
| `packages/engine/test/phys-ranged-ai.test.ts` | 26 |
| `packages/engine/test/phys-ranged-offhand.test.ts` | 13 |
| `packages/engine/test/phys-ranged-fx-events.test.ts` | 26 |
| **Ranged in all** | **330** |

Plus one test in `test/classes-i.test.ts` (Special Ammo with a bow). Shared helpers are in
`test/helpers/physfight-ranged.ts` (`PhysF`, `gameText`, `unchanged`, `term`, `offHand`, `calm`). Save dice are forced
through a `vi.mock` of the d20. `test/helpers/physfight.ts` is untouched.

## Checks (run at the commit of this note)

1. Engine `npx tsc --noEmit -p .`: clean.
2. Engine `npx vitest run`: 92 files, 2224 passed, 1 skipped (the existing skip in `coverage.test.ts`).
3. Web `npx tsc --noEmit -p .`: clean.
4. `npm test -w @phc/web`: 74 files passed, 1 skipped; 653 tests passed, 2 skipped.
5. `python3 tools/validate.py data`: 0 errors, 0 warnings.
6. No version bump, no CHANGELOG change, `protodata.json` not regenerated (only the base's copy came in).
