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
| 2 | Opportunity attack makes a glyph vanish | **Fixed (display).** The engine never lost the glyph: an enemy caster's whole spell (draw, walk, draw, Evoke) is one step, and the screen drew glyphs only from the finished state, so the first glyph showed for 0.9 s and went before the Evoke played. The grid now keeps a drawn glyph until the effect that removes it has played (`fxShownGlyphs`, `fx/play.ts`). Unit tests only; not yet watched in a browser. Leon to confirm. |
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


## Storm lost its chain when the hit killed (found by Leon, 12 Nov; fixed on the branch)

Live 0.22.0: an Outburst toned Storm at stage 2+ that killed its target did not chain, although the preview showed the chain. Cause: `magic.ts` only counted a target as struck if it was still alive after the hit. Fixed: a killing hit still chains from where it struck. Test: `outburst20.test.ts`, "Storm still chains when the hit kills its target". No golden table moved.


## Found by the first full browser run (12 Nov)

`npm run e2e -- all` on the merged tree (descriptors, fog in the engine, rules 1.26) left 8 suites red, each red alone
too. Three were game bugs, the rest suites that read the old shape of the view. No check was removed or loosened.

| Suite | Kind | Cause | Fix |
| --- | --- | --- | --- |
| physical-pack (Called Shot parts) | game bug | the action flow marked an option chip picked only for a `''` choice; Called Shot has none, so no part showed ✓ while Confirm sent LEG | `actionFlow.ts`: with nothing picked, the chip Confirm sends (the `''` choice, else the first; a line's first) shows picked. Test: `apps/web/src/game/actionFlow.test.ts` |
| physical-pack (Pull free) | stale suite | it nailed the unit by editing the screen's view in place; since fog the view is a copy (Confirm runs on the truth) and the flow caches descriptors per state object | the suite nails the unit on `__phc.truth()` and sends a no-op action so a fresh view arrives |
| faith (second Whisper) | game bug | `previewDescriptor` of a refused action still asked for its first pick, and the panel shows an ask before a refusal: "Click yourself or an ally" instead of "One Whisper a turn." | `descriptors.ts`: a refused action asks for nothing. Test: `descriptors.test.ts`, "a refused action asks for no pick" |
| sandbox (Clear all enemies) | game bug | the tools counted enemies in the fogged view: a wave out of sight made the button "Clear all enemies (0)", disabled | `sandbox.tsx` `enemiesLeft()`: unseen hostiles count by their opaque marks in the turn order. Test: `sandbox.test.ts`. The suite reads wave 2 from the truth |
| camera | stale suite | read the unseen hostile from the view (absent) and its turn-bar card by its real id (the card is keyed `?N`) | unit from the truth; the card found by its mark in the view's order; also checks the view does not hold it |
| clarity | stale suite | read the Hidden Lurker from the view | from the truth |
| sandbox-mp | stale suite | read Ona's fighter from the host's view, where it is absent while unseen; the team-fight loop found no current unit on Team B's turns | the host's side checked in the view when seen, and on the truth; the loop is driven from the truth |
| sigil14 | stale suite | `field()` looked up spawned drill units in the view; the third, out of sight, was missing | from the truth |
| sigil15 | stale suite (Analyze is fine) | the turn loop read whose turn it was from the host's view; on Ona's turn, unseen, it is `?N`, so the loop never let her draw SHOCK and Leon never Analyzed | the loop reads the truth; the glyph check stays on Leon's view |

Proof: the nine (`physical-pack sandbox faith camera clarity sigil14 sigil15 sandbox-mp faith-pg`) ALL GREEN together
and each alone. `camera` once failed its drag-click check beside the others (not a check touched here; green alone
and in two other runs together). Also on the way: `npm run check` was red on four unit tests (`faithArt.test.ts`,
`heartIcons.test.ts`) left stale by the 12 Nov art hand-off (`55c65c0` painted Rebuke and the feelings, so the
painted file now wins); they now test the code drawings with an empty art map and Rebuke as painted.
`protodata.json` is the build's regeneration from the current data.

## Found by Leon on live 0.23.0 (12 Nov)

Three reports with screenshots, all in the combat screen. Fixed on the branch.

| What Leon saw | Cause | Fix and proof |
| --- | --- | --- |
| After dragging the map down, a hovered tile under the column letters drew its raised box and chip over them (and over the small map), and its title ("H8 · The Proving Ground: packed sand…") came up there | `main.tsx` raises a hovered tile to `z-index: 20` and a tile's chips and card are `z-index: 30`, but the sticky letters were 6/7 and the camera overlay (the small map) 8; the grid was no stacking context, so a tile's layers competed with them directly. The letters' 2 px gaps (filled only by a box-shadow) let the pointer reach the tile under them | `.phc-grid` is `isolation: isolate` (nothing in the map rises above the small map or a panel); inside it the letters are the top layer (`GRID_LAYER` in `combat.js`); `.phc-axis::before` covers their gaps and hovering them clears the tile hover. Proof: `physical-pack` (a tile half under the header, hovered: `elementFromPoint` at the header is the header, gap included; with the old layers it was the tile) |
| Action tooltips were a wall of text | each was a native `title` with the whole prose on one line | one helper, `apps/web/src/game/actionTip.ts` `actionTip()`: the name and cost chips, a line per sentence, "With this weapon:" and each trait on their own labelled lines, the refusal last; shown as one floating card for any `[data-tip]` (rows of every tab, technique chips, heart buttons, feelings, glyph words, design cards). A technique's text comes in parts from the engine (`techParts`). Proof: `actionTip.test.ts`, `combat-attack-areas.test.ts` |
| Two guns: after reloading one, "reload both" was gone and the other gun could not be reloaded | engine: the descriptors listed no off-hand reload. `reload` is the main gun's (then Already full) and `reload2` refuses once one gun is full ("reload the off-hand gun alone") with no row to do that | `descriptors.ts`/`actions.ts`: `reload-off` / `reload-off-tac` (`combat/reload` hand `off`, priced by `reloadOffAp`, shared with the reducer). Golden cost tables unchanged. Proof: `packages/engine/test/dual-reload.test.ts`, `physical-pack` (reload one, then the other) |
| (asked with it) the Attack tab's layout | rows were in the engine's order with weapon headers on the first rows only; reload, unjam and shoot an object came last | `ActionDescriptor.hand` (`main` / `off` / `both`); the tab orders by it (`game/attackAreas.ts`): main hand, off hand, Both, then OTHER (Shove, Brace, Hold a shot), a header each and a 1 px line between. Hotkeys follow the order shown |

| (follow-up, lead's call) the off-hand gun had no Clear jam and no Shoot an object, and an off-hand fumble jammed the MAIN gun (paired attack) or was forgotten (technique) | the engine kept one jam per fighter | `offJammed` on the fighter; `clear-off` / `cover-off` rows (`combat/clear` and `combat/shoot-cover` with hand `off`, the main hand's price and rule) in the off-hand area; spec Hands 5d, item 1726. Cost tables: only new lines (`clear-off`, `shoot-cover-off`, re-recorded on purpose). Proof: `dual-jam.test.ts`, `combat-attack-areas.test.ts` |
| (follow-up) with two guns the off-hand and Both rows sat past the ninth row and had no two-key code | codes stopped at 9 rows a tab | a 0 turns the page by nine: 201 is tab 2's tenth row, 2001 its nineteenth (`numKey`, `combat.js`). Proof: `combat-attack-areas.test.ts` (every row's code; 2 0 n picks `clear-off`) |

Not done: a Call card shows its text on the card itself and has no hover card.

## Found by the 0.24.0 browser run (12 Nov)

`npm run e2e -- all` before the 0.24.0 release: four suites failed, two (and on the re-run a third) passed only alone.
None is a game bug. The hover card (`game/actionTip.ts`) replaced the native `title` on action rows, technique chips,
glyph keys, heart buttons, feelings and design cards; the words, the refusal included, are still on each element as its
`aria-description` (checked in Chromium's accessibility tree: the button's description is the card in words), so a
screen reader and a keyboard user get what the title gave. New unit test: `combat-attack-areas.test.ts` "every row and
chip keeps the card's words as its accessible description, the refusal included". Suites now read those words with one
helper, `tipOf(locator)` in `apps/web/e2e/lib.mjs` (aria-description, else title). Every other `title` read in the
suites was checked: it points at an element that still has one (tiles, plan chips, the selection note, Attempt).

| Suite | Game bug or stale | Cause | Fix |
| --- | --- | --- | --- |
| classes-moves | stale | read Unstoppable's and Duck and Roll's reasons from `title` (now null: TypeError) | `tipOf()` |
| sandbox | stale | read "Needs an Evoker in hand." from Draw a glyph's `title` | `tipOf()` |
| faith-pg | stale (the Miracle IS once a session: the row's card says "Can't now: One Miracle a session.") | read the refusal from the Miracle row's `title` | `tipOf()` |
| sigil14 | stale | read "One glyph per tile" from the glyph key's `title` | reads `aria-description` |
| magic (alone only) | suite's waiting | Evoke's tiles clicked on fixed 200/250 ms pauses; beside others Confirm was not up yet | waits for the effects, the camera to stop (`camStill()` in lib.mjs), Confirm enabled, the evoke in the log |
| playscreen (alone only) | suite's waiting | creation's "Next ›" clicked back to back; one click hung 30 s beside others | each Next waits for the step bar's `aria-current` to move |
| camera (alone only, the second full run) | suite's waiting | the plain-click check read the tile's place once, after a settle that came before the turn's start and the Move pick could move the view again; the click landed on the unit's own tile (the keys check failed after it) | the view settled right before the read, and the tile's box read until it stays put and the camera is not gliding |
| melee-fx (alone only, the re-run) | suite's dice | Parry needs a melee HIT; at Defense 19 the drill elite hits 3 in 10, so 8 rounds without one came about 1 run in 17 | Athletics 1 (Defense 10) for the Parry case; the note now prints the round's log |

Proof: magic, playscreen, melee-fx and camera each three times beside two others, green; then the full run.

## Riposte fired four times (Leon, 13 Nov)

Leon, from play: "a turn where my character Riposted 4 times and downed [an enemy] while they missed me 3 times."
The rule: one reaction a round, counted, for everyone (spec item 89; an Answer is a reaction; Riposte "uses your
reaction"; the Fighter's Riposte is "reaction, 1 Momentum").

**Cause: not reproduced in the engine.** Every reaction path asks the one counter (`tactics.ts` `canReact` /
`useReaction`, `u.reactUsed` stamped with `cb.round`), and the counter held in every test: four foes missing in one
round through the real enemy AI give one Riposte (technique); the Fighter's class Riposte and the technique on the same
misses share the one reaction; a seeded run of 60 fights (sabre and 14 other melee weapons, boss/elite/soldier foes
that Riposte back, the Fighter class on and off, one and two PCs, the PC attacking on its own turn) made 3,314
reactions and never two by one unit in one round. No perk or trait raises the count except Before the Blink (2). What
can look like "several Ripostes in one turn": the enemy phase between two of your turns is two rounds when you are not
first in the initiative (one Riposte in each), and your own turn is in a round too (an enemy's Riposte that misses you
is answered). That is at most two between two of your turns, not four. **Needed from Leon:** the Report a problem
bundle (or the fight log) of that turn, to replay it.

**Found on the way, and fixed: Killzone.** "The two shots use one reaction between them": the first shot spent the
reaction and then gave it back (`refundReaction`), so between the two shots the Marksman had a whole reaction for
anything else (Dance of Iron, Parry, a Call as a reaction): two reactions in a round. Now the first shot keeps the
reaction spent and marks the second shot paid (one cell in `effects/uses.ts`, scope `reaction`: `payHeldShot`,
`heldShotPaid`, `spendPaidShot` in tactics.ts); the held shot (`triggerOverwatch`) fires on that mark. A second shot
in the next round spends that round's reaction, as before. Proof: `reactions-once-a-round.test.ts` (fails without the
fix). Golden tables and replay hashes: unchanged (the engine suite passes as recorded).

| Reaction | Spends the one reaction? | Spec / text |
| --- | --- | --- |
| Opportunity attack (`combat.ts` moveUnit) | yes | reaction |
| Overwatch, old held shot (`triggerOverwatch`; several shots `owShots`) | yes, all shots on one | item 89 |
| Killzone (Marksman) | **was: first shot given back (2 a round possible); now one for both** | "use one reaction between them" |
| Watches: Overwatch, Deny, Cover Me, Dead to Rights (`fireWatch`) | yes | "uses your reaction" |
| Answers: Riposte, Parry, Keep Back, Interpose, Shield Wall (`answer()`) | yes | "uses your reaction" |
| Fighter Riposte (class) | yes (and 1 Momentum) | "reaction, 1 Momentum" |
| Defender Interpose (Brace), Shrug It Off, Anchor; Duck and Roll; Drink It In; Share; Dive | yes | "your reaction" |
| Reactive Plate (Defender) | no | "passive; no reaction" (PROVISIONAL) |
| Heart Overwatch (`magic.ts`) | yes | reaction |
| Catch, Dance of Iron (perks) | yes | "uses your reaction" |
| Calls as a reaction; Order (the ally's) | yes (+ its own one-a-round cell) | rules 1.13 |
| Rewrite, Dread | take the target's | — |
| Cue | +1 until the speaker's next turn | rules 1.13 |
| Many Hands | an ally may spend the holder's | perk text |
| Before the Blink | 2 a round | perk text |
| Between Heartbeats | no (its own once a fight) | "doesn't use your reaction" |
| Last Word (weapon mastery) | not in the engine (weapon_mastery.json is not loaded) | "use your reaction" |

Uncounted before the fix: one (Killzone's gap). None uncounted now.

Open questions (behaviour unchanged, the spec is silent):
1. Can a reaction trigger a reaction? Today yes: your Riposte that misses can be Riposted by the enemy (its own
   reaction), an opportunity attack can be Parried or Riposted. Only the Fighter's class Riposte has "a riposte never
   triggers a riposte (PROVISIONAL)", and its guard is one global flag, so it also stops anyone else's class Riposte
   during a class Riposte; the technique has no such guard.
2. The counter is `u.reactUsed` with a round compared by hand, not a `uses.ts` cell (the F8 rule). It works; moving it
   into the primitive is a refactor for the engine review, not a fix.
