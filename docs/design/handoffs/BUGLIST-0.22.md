# Bugs and asks from Leon's playtest of 0.22.0 (11 Nov 2026)

**Start here when usage resets.** 0.22.0 is live: it is 0.21.0 plus a music expansion merged by another session
(`main` at `651ad63`: eight new fight songs with a picker, Gearing Up). **This branch does not have those 9 commits
yet: merge `origin/main` into it first** (`git fetch origin main && git merge origin/main`), fix conflicts (the
version becomes 0.22.0 in the four `package.json` files and `package-lock.json`; keep both changelog entries), then
`npm run check`.

**Check each item against the new build before fixing it.** Leon tested 0.22.0, which has the old 16 × 11 maps, no
camera and no balance step 1. This branch has maps up to 26 × 26, the camera, and enemies by level. Some items below
may already be fixed, changed or made worse by that work. For each: reproduce it on this branch first (the new
Effect testing room, item 1, is the fastest way), then fix, then add a test.

Leon's words are quoted; the notes under each are a first reading, not a diagnosis.

## Status, 11 Nov 2026 (evening)

| # | Bug | State |
| --- | --- | --- |
| 1 | Effect testing room | **Built.** Button on the Proving Ground's gearing-up screen; `sandbox/fxtest`; engine tests and the `fx-room` browser suite pass. |
| 2 | Opportunity attack makes a glyph vanish | **Being looked at again.** Leon (11 Nov, night): it was his character's opportunity attack on an *enemy* Sigil caster running away; the glyph on the tile where the caster was hit vanished. The first attempt had tried the mirror case. |
| 3 | Thumper Suppress draws bullets | **Fixed**: extra rounds draw what the weapon fires (`fx/ranged.ts`); `fx/launch.test.ts`. |
| 5 | Lob goes off before it lands | **Fixed**: the blast, the damage and the HP bar wait for the landing (`fx/play.ts` `landsIn`). |
| 6 | Area preview shows enemies in the fog | **Fixed** for techniques (checked in the browser with the Lob); the same change for perk, Evoke and Outburst previews is by reading only. |
| 7 | Suppress: sound and damage before the shots | **Fixed** as read: the rattle starts with the first flash, the rolled round leaves last. With plain guns the gap was 100 to 170 ms, so Leon may have meant the thumper (bug 5). Leon to confirm. |
| 4 | Sweep of every weapon × technique | **Built**: `npm run e2e -- fx-sweep` (about 9.5 min; `PARTS=real` 1.5 min). 2,022 cases, 1,303 played, 719 refused by the rules (need a shield, an ally, cover…), 0 failing. Plain burst and auto fire still start their sound about 100 ms before the first flash (not changed). |
| 8 | Effects float when the map scrolls | The camera build moves drawn effects with the map (`fx/dom.ts`); the `camera` suite passes. Leon to confirm by eye. |
| 9 | Last blow skips its animation | **Fixed**: a decided fight no longer plays only its last six effects. Checked in `fx-room`. |
| 10 | Enemy acts while your turn card is up | **Fixed (cause found in code)**: on a new fight the card was timed by an estimate; it now waits for the effects. Not reproduced by a test: Leon to confirm. |
| 11 | Next wave: drop dead, enemy turn with no effects | **Fixed (cause found in code)**: an opening of more than 40 effects played none, one of more than 24 lost its start. Leon to confirm. |
| 12 | AP cost on the bar | **Not reproduced.** Attacks, techniques, perks, Outburst, prayers all show their cost in the browser. Leon will test again and say which action. |
| 13 | Portraits change | **Fixed**: a face, once given, is kept for that enemy in that room. |
| 14 | Music picks "gunfire" | **Closed** by Leon (11 Nov, night): played 0.22.0 again and it is fine. |
| new | Two-key codes (11, 42) | **Built**; each action button shows its code; checked in `fx-room`. |

## A. A new tool, build it first (it makes the rest quick to check)

1. **"Add a button named Effect testing in the Proving Ground that sends you to a room with an enemy dummy with
   infinite HP and you have infinite AP, so that I can help you test weapon effects."**
   - A second entry beside the Proving Ground's fight: one dummy that never dies and never acts, the player's AP
     never runs out, every weapon and technique usable (the Proving Ground's tools still there to give gear, skills,
     perks, Momentum, Pressure, Guard). Ammunition and Heat should not get in the way either: say what was chosen.
   - The simulator already has a test-only target that never dies (`packages/engine/test/balance/`: the shooting
     range); the Proving Ground's `sandbox/*` actions are the place for the real one.
   - Also use it for the sweep in item 4.

## B. Effects and sound that are wrong

2. **"Attack of opportunity on a Sigilist that has placed their sigil down and moved to another space looks like it
   erases their sigil (still works though, they can still evoke)."** A display bug: the glyphs stop being drawn after
   the opportunity attack; the state is right.
3. **"Doing Suppress on the Smetanita thumper still plays the bullet shoot VFX."**
4. **"We really need to go do tests on this for every weapon, man."** A sweep: every weapon (60) × every technique it
   can use, in the Effect testing room, recording the look and the sound each plays (`apps/web/src/game/fx/play.ts`
   `gunOf`, `fx/ranged.ts`), and flagging every one that plays a bullet for something that is not a bullet. Make it a
   browser suite so it stays fixed. Earlier fixes of the same family: flamethrower techniques, the bow's Burst, a
   thrown melee weapon.
5. **"Smetanita thumper with the Lob (blast) skill explodes way before the grenade lands on the ground."**
6. **"Selecting the area for this technique in fog where there are enemies you can't see also reveals them with the
   'Enemy' red squares."** A fog-of-war leak in the area preview: unseen enemies must not be marked.
7. **"Suppress technique with a gun plays the sound and damage way before the shoot VFX."**
8. **"Scrolling the map makes the VFX and damage numbers that are playing float; make their position consistent in
   the map screen."** Effects must be anchored to the map, not to the window. The camera work on this branch moves
   the view on purpose, so this matters more now: check it there first.
9. **"Killing an opponent as the last turn of combat skips every animation and they just flop down dead; same for
   you: if an enemy kills you that turn you don't see any animation or any reason you die, you just flop down dead."**
   The fight's last action must play in full before the fight-over screen. Likely the "decided fight" path in
   `fx/play.ts` (`queueFx` with `keep`, `DECIDED_KEEP`), which still skips; a fight should never skip its last blow.

## C. Turn order and the turn card

10. **"The enemy still plays their turn while your character card signalling your turn is ON THE SCREEN.
    Consistently happens when you retry a wave or enter a new wave in the Proving Ground. Wait till every animation
    is done and the turn screen has unlocked for you to select an action before popping the card out the side."**
    The your-turn card (`apps/web/src/game/turnIntro.tsx`) must wait for the same thing the action panel waits for
    (`fxShownTurn` in `fx/play.ts`), and a new or retried wave must be treated as a fresh fight by the effects
    clock (it probably keeps the old fight's counters).
11. **"Pressing next wave in the Proving Ground, sometimes you just drop dead; the enemy turn still plays before you
    with no drop card and no effects sometimes."** Same family as 10: the new wave's opening effects are not played.
    Also check whether the character really dies or is shown dead.
12. **"The indicator for how many AP you will lose when using a skill has now ceased to work after the black colour
    fix."** The AP bar's "about to be spent" pips (`apps/web/src/screens/combat.js`, `phc-pip-cost`): they were made
    to pulse instead of going hollow in 0.19.1 and now show nothing. Probably the cost is not counted for techniques
    (the selected action is a technique id, not `shot`).

## D. Other

13. **"Characters are changing portrait between turns and between scenes."** A portrait must be fixed for a
    character. Look at `castFight` / `apps/web/src/game/cast.ts` (enemies and NPCs are given faces from a pool) and at
    whatever seeds the pick: it must be the unit's or the person's id, not the turn or the scene.
14. **"Music player auto-chooses gunfire after the first round in the Proving Ground."** From the 0.22.0 music work
    (`packages/engine/src/music.ts`, `apps/web/src/game/music.tsx`): the fight song picker overrides the player's
    choice after round 1. That code is on `main`, not on this branch until the merge above.

## E. What Leon's report from that session shows (room QDF3DM, 0.22.0, 11 Nov 2026)

The report was taken in the Proving Ground at wave 6, attempt 2 (a retried wave), round 1, the Recruit's turn, full
HP, 6 AP, on the old 16 × 12 map, Firefox 159 at 2813 × 1428. It is a snapshot of one moment, so it can't show an
animation. The numbers below are from the report; the cause given after each is a lead that has not been
reproduced yet, so check it before fixing:

- **For 10 and 11.** The fight's effect list holds two events only (the turn card and "Recruit is Shaken"), and no
  enemy had acted in the rules. So when an enemy is seen acting at the start of a retried wave, the rules have not
  let it act: the screen is playing the previous attempt's leftover effects. Look at what is still queued when a
  wave ends (`fxDebug()`), not at the turn order in the engine. The effects clock is keyed by fight name plus the
  first log line ("WAVE 6 · attempt 2 · …"), so a new attempt is a new clock and the old one is never emptied.
- **Also for 11.** The Recruit carries Shaken (3 rounds) from the lost attempt into the retry. If conditions are
  carried, check whether damage over time or a pending effect is carried too: that would be the "drop dead".
- **For 13.** The player's portrait is the Wick placeholder, and two enemies (Sigil warden, Heart adept) have no
  portrait of their own while the troopers and the drone do. Units with no portrait get a face picked at draw time,
  which is why it changes; give each unit its face once, when the fight is built, and keep it in the fight's state.
- **For 14.** Music state: nothing playing, 8 picks in 9 fights, last song "flank_left". Every wave counts as a new
  fight for the picker, so it picks again each wave; pick once a Proving Ground session, or keep the song across
  waves.
- **For the sweep (4).** The window is 2813 px wide: run one pass of the browser suites at that size, since effect
  positions are computed from the board's size on screen.

## Order

1. Merge `origin/main`. 2. Item 1 (the Effect testing room). 3. Items 9, 10, 11 (the fight looks broken without
them). 4. Items 8 and 12. 5. The weapon sweep (items 3, 4, 5, 7) as one browser suite. 6. Items 2, 6, 13, 14.
Then back to `SESSION-HANDOFF.md` section 4 (the damage step).
