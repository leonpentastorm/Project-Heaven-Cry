# Classes 3.0, steps 10 and 10b: the screen for the merged systems, and M813 hidden (hand-off)

Built 13 Nov 2026 on the worktree branch `worktree-agent-ae333076fae1f4e78`, started from `claude/charming-gauss-hbq4n0`
(`8b14295f`). Not pushed; no version bump. Lane: the client, plus fields the screen needed in the engine's descriptors
and views (each with a test in `packages/engine/test/screen-step10.test.ts`). No rule, number or legality was written in
the client. Figments, the Visualizer, the Rigger and the gear-icon views were not touched (two other builders).

## 1. The inventory (spec section 9 against the game, looked at in the Proving Ground before and after)

"Before" is what the game showed at `8b14295f` (screenshots taken with the Proving Ground's tools); "now" is this branch.

| System | Section 9 asks for | Before | Now |
| --- | --- | --- | --- |
| Bonds | a TEND tab, groups Bond / Heal / Help / Class | missing (the verbs sat on the Perks tab) | **built**: the TEND tab in Insight ink, its rows under BOND, HEAL, HELP headers (data groups); Triage, Inspire and Rally stay on the CLASS tab (class moves) |
| Bonds | the Bond strip: allies, a rule, enemies, empty chips to the cap | missing | **built** in the unit panel under the resource rows: allies (round portrait, HP bar, conditions), enemies (square portrait, the red thread mark, HP bar, the echo waiting in red, a Boss Bond's rounds left), dashed empty chips up to the cap, the count "BONDS 1 / 4" |
| Bonds | who aims at a Bonded ally (red crosshair and count) | missing | **still missing**: the engine has no read of it yet (rule 8 of bonds-spec section 2 is step 9's: `aims_at: tied:bond`) |
| Bonds | an enemy's save | missing | **still missing**: the engine keeps no record of the save made; the strip shows the Bond's rounds left (a Boss's) instead |
| Bonds | the Ledger meter for a Mender | a resource row | **built**: the Ledger is the bar at the strip's end ("LEDGER 0 / 63"); its resource row is no longer repeated (one fact, one place) |
| Bonds | the Attuner as the door's focus | missing (a Mender had no MP row at all: the row read the Emanator only) | **built**: the MP row shows for an Attuner too, with "Attuner · off hand" (or STOWED in the pack: Bonds held, threads quiet); the strip greys with "Attuner in pack: Bonds held, threads quiet" |
| Bonds | Inspire's picker of felt feelings, unfelt greyed | felt ones only, nothing greyed | **built**: every feeling, felt first, the unfelt greyed with why; **the engine now refuses an unfelt pick** (it accepted any before) |
| Bonds | per target, the "—" enemy faces greyed | missing | **still missing** (needs the option list to depend on the picked target: a descriptor whose options are worked out after the target pick) |
| Bonds | a refused verb says why ("Needs an Attuner in hand.", "A machine has no heart to Bond.") | "Not now (self holds)." | **built** through a general field: a grant's `why` (and its reach's `why`), predicate → sentence, in data |
| Bonds | "Bonded to Ha" on an ally's portrait, a thread glyph on an enemy's; the thread and echo fx | missing | **still missing** (the `bonded` condition chip shows) |
| Shadow | the meter, once, with the eye word | built (step 6) | unchanged; now checked by `shadow.mjs` against the engine |
| Shadow | the tab's groups Slip / Mark / Work / Break | missing (one flat list, the tab named "SHADOW · UNSEEN") | **built**: headers from shadow.json's `groups`; the tab is named "Shadow" (it wrapped the tab bar before) |
| Shadow | the Break as a toggle on the attack card, its term in the preview | built (step 6) as a perk switch | unchanged; `shadow.mjs` now checks the toggle changes the previewed damage |
| Shadow | refusals in the spec's words ("An enemy sees you", "It can see you") | "Not now (self has)." | **built** (the grant's and reach's `why`) |
| Shadow | the pip ring fx, "Seen: −1 Shadow" when spotted back, the Break's log line | the log line exists | **still missing**: the ring fx and the spot-back floater |
| Chaplain | Ward among the Whispers, Sanctuary among the Hymns | on the CLASS tab | **built**: a grant that is a prayer goes on the FAITH tab in its prayers' group (WHISPERS, HYMNS, MIRACLE headers); Verdict stays a class move |
| Chaplain | the Whisper slot and the Hymn's wait shown | the prayers' own rows | unchanged: Sanctuary's row is refused during the wait in the engine's words (checked) |
| Chaplain | Smite as a chip on the attack card ("Smite ready · 32") | missing | **still missing: needs a new primitive** (below) |
| Chaplain | the patron's presence while Witnessed | missing | **built**: the patron's portrait (catalog, `patronPortrait`; the mark when unpainted) standing at 40% on the Chaplain's tile, from the engine's `presenceOf`; the brightening on an intervention is **still missing** |
| Chaplain | the Ward pip; Sanctuary's outline in the patron's accent | missing | **still missing** |
| Reactions | pips beside AP (white ready, grey spent; two for the Skirmisher) | missing | **built**: "REACTION ●" / "REACTIONS ●●" beside the AP line, from the engine's `reactionView` (a Cue adds one); the hover card names the Answers kept on |
| Reactions | the Answers switched on | the CLASS tab's on/off rows (Duck and Roll) | the pips' card lists `phys.answers`; there is still **no screen to set** the Answer list (only `phys/answers`) |
| Reactions | Killzone's card says "two reactions" | its text says it | unchanged (checked in `reactions.mjs`) |
| Reactions | Run and Gun a chip on the move preview; the log names each reaction "(reaction 1 of 2)" | missing | **still missing** (the `slipping` condition shows as a chip on the unit) |

Icons: none of the new marks are in the repo (`art/briefs/ART-REQUESTS.md` lists them already: C1, C2, section 5,
the Tend tab icons); the group headers show words only, and the thread mark on an enemy chip is a two-stroke SVG.

## 2. What was added to the engine (fields for the screen; no rule)

| Field / function | Where | Test |
| --- | --- | --- |
| `ActionDescriptor.sub` (a row's group in its tab) and `PerkActionEntry.sub` | `descriptors.ts`, `effects/actions.ts subOf` | step10: tend / shadow / faith groups |
| DescGroup `tend` (GROUP_ORDER after `shadow`); `ItemTab` `tend`, `faith` | `descriptors.ts`, `effects/actions.ts tabOf` | step10 |
| A grant that is a prayer goes on the Faith tab (`ActionDef.prayer`) | `effects/actions.ts`, `effects/types.ts` | step10: Ward, Sanctuary |
| A system file's `tab` and `groups` (an item's `group` → `subName`) | `effects/collect.ts systemVerbs`; data: shadow.json `tab`, tending.json `tab`, `groups`, items' `group` | step10 |
| A grant's `why` and its reach's `why`: {predicate: sentence} | `effects/actions.ts` (available, reachWhy); validator checks each names a predicate of its `if` | step10; `shadow-operative.test.ts` now reads the words from data |
| `bondView(cb, unit, char)` | `screenViews.ts` (exported) | step10 |
| `reactionView(cb, unit, char)` | `screenViews.ts` (exported) | step10 |
| Inspire's `felt` pick lists every feeling, the unfelt with `off` (`UNFELT`); a pick the list greys is refused by `previewPerkAction` (so by the reducer) | `effects/actions.ts`, `descriptors.ts` (option `why`) | step10 |

The data edits are written by `tools/once/screen_groups.py` (idempotent). `tools/once/tending_data.py` was **not**
re-run: it is no longer idempotent against the merged data (it re-orders conditions.json and skills.json); re-running
it would also drop the fields above unless `screen_groups.py` is run after it.

**Needs a new primitive (not built):** Smite's chip ("Smite ready · 32") needs the attack preview to report the on-hit
riders that would fire (a `deal` on `hit` evaluated in preview: its `if` with `answered` in preview mode, its limit read
not taken, its amount). That is one general addition (riders in `previewAttack`), not a Smite handler; it also gives
Run and Gun's Pressure and every perk's on-hit line to the card. Killzone's held count and the "(reaction n of 2)" log
words need the reaction door to say which reaction it spent.

## 3. M813 hidden (step 10b)

**The switch:** `data/campaigns/m813.json` `"listed": false`, the field the other unfinished campaigns already use
(`godplot`, `curse`, `summoning`, `own`, `proving`). Bringing it back is deleting that line. Nothing was deleted: the
campaign is still built in (`BUILT_IN_CAMPAIGNS`), its engine tests run unchanged, its lore stays.

- `apps/web/src/game/starts.ts`: the menu is the listed campaigns; with none listed, the room offers the Narrator's own
  start (`own`). `DEFAULT_START` is the first one on the menu. A room saved on M813 keeps it and says so.
- `apps/web/src/game/store.ts hostRoom`: a new room is set to `DEFAULT_START` (the engine's own default `settings.start`
  stays `'m813'`: forty engine tests and the replays start sessions on it; the client never opens a room on it).
- The title: **PROVING GROUND is first** ("Fight now · any class, level and gear · endless waves") and is the selected
  item; NEW GAME second (its button keeps its bare name: the suites and players find it by it). The SOON card and the
  room's toast say "Fight in the Proving Ground, or load your own campaign" instead of "Play M813".
- The test hook: `localStorage phc.showCampaigns` (a JSON list of ids) shows a hidden campaign on that page; the
  browser suites use `player(browser, name, { campaigns: ['m813'] })` (`e2e/lib.mjs`).
- `apps/web/src/game/starts.test.ts`: the switch, no M813 start, the default, a saved M813 room kept.

**For the changelog:** "M813 is off the menu for now (Leon): the Proving Ground comes first on the title, and a new
room starts on the Narrator's own start; M813's data, tests and lore stay (`data/campaigns/m813.json` `listed`)."

**The browser suites that start a session (the room's start was M813):** each sets the switch through the hook on the
page that hosts, and keeps testing what it tested. None was deleted or weakened.

| Suite | What it does with M813 | Done |
| --- | --- | --- |
| two-players | a two-player session from the room | hook on the host |
| missions | M813's missions and the act-end card | hook on the host |
| faith | a session with prayers | hook on the host |
| reconnect | a session, a guest drops and returns | hook on the host |
| playscreen | the story screen of a session | hook on the host |
| coop-stall, cutins (both rooms), magic, perks (both pages), playtest-tools, right-panels, rules114, shell-guest, ui-shell, vote | a session from the room | hook on the hosting page |
| title | the menu and NEW GAME's room | **extended**: Proving Ground first, no M813 on the menu or in the new room |
| creation-layout, creation-points, gear-icons, physical, skeleton-screens, slate-music, slate-stamp | open a room but start no session | unchanged (nothing in them reads the start) |

## 4. The browser suites for the systems (Part C)

- `tending.mjs` (extended): at Empathy 1 with no Attuner the TEND tab is in its groups, Shield and Raise are absent and
  Bond says "Needs an Attuner in hand.", the strip says why the threads are quiet; at Empathy 6 with the Attuner Shield
  and Raise come, the MP row names the Attuner, the pips read 1 / 1; the free Bond is tried a turn at a time until the
  Soldier's save fails, then the strip lists it under the enemies with the engine's count, the Ledger bar reads the
  engine and is not repeated as a row.
- `shadow.mjs` (extended): the meter row reads the engine's value once, with the eye word; the SHADOW tab in its groups;
  Read Intent refused in the spec's words while seen; on the attack card the Break toggle changes the previewed damage.
- `chaplain.mjs` (extended): the presence on the tile while Witnessed (old_overcast, 40%); Ward among the WHISPERS and
  Sanctuary among the HYMNS on the FAITH tab, Verdict alone on CLASS; Sanctuary refused in the wait (as before).
- `reactions.mjs` (new, in `rules`): one pip for a classless fighter; two lit for the Skirmisher; the card follows the
  Answer switch (`phys/answers`); Killzone's card.
- `classes-moves.mjs`: Ward is used from the FAITH tab.

## 5. What is left for Figments' screen (step 8's builder)

- A Figment's verbs come through the descriptors like every door verb: give `data/figments.json` a top-level `tab`
  (add `'figments'` or the Rigger's word to `VERB_TABS` in `effects/actions.ts` and to `DescGroup`/`GROUP_ORDER`),
  `groups` and each item's `group`: the screen shows the tab and its headers with no client change but its name and
  ink (`TAB_NAME` in `game/commands.ts`, `TAB_INK` in `screens/combat.js`: Expression `#5394AC`).
- Refusals in words: a grant's `why` and its reach's `why`.
- A meter for the Visualizer's owned units would sit beside the Bond strip in the unit panel (a view in
  `screenViews.ts`, its values in a `game/*` helper like `bondStrip.ts`).

## 6. The close

- `python3 tools/validate.py data`: 0 errors. `python3 design/canvas-build/build.py --web --check`: fresh.
  `docs/ENGINE-HOOKS.md` regenerated.
- `npm run built-from -- claude/charming-gauss-hbq4n0..HEAD`: 3 smells in 2 places, 0 a lint fails on: the generated
  `protodata.json`, and `resources.ts`' MP-row hints, whose "1 AP" and "+2 Strain" were there before (the lines moved).
- `npm run check`: validator, tables, screen data, hooks, both type checks and the engine tests (4005) green. The web
  tests: 1112 green in the run; `combat-screen.test.ts` and `combat-actions.test.ts` timed out under the machine's load
  (load average 26: two other builders) and pass alone (15 / 15 twice, 6 / 6 with `--testTimeout 300000`).
- **Golden tables and replays moved on purpose:** `costs-credit.json` 195 lines, only refusal words ("Not now (Self
  has)." → "An enemy sees you: this needs you Hidden.", the Attuner's and the Bond cap's); `replays.json` 5 replays that
  play M813, state hashes only (actions and streams the same: the saved campaign copy carries `listed: false`).
- Browser suites on port 8841 (own server, `--base`): shadow, tending, chaplain, reactions, tabs, playscreen, slate,
  two-players, faith, faith-pg, classes-moves, sandbox, old-save, title, missions, reconnect: green (reactions after
  its fix: the Answer list is set out of a fight; tending's MP check reads the full row, not the urgent mini row;
  chaplain's shot loops bounded after one timed out beside the others).
- Not run here: coop-stall, cutins, magic, perks, playtest-tools, right-panels, rules114, shell-guest, ui-shell, vote
  (each only gained the M813 hook on its hosting page).
- Found and fixed on the way: shadow.json's texts were never number-filled (`datatext.ts`): the hover cards showed
  `{=effects.0.ap}`.
- Screenshots (deviceScaleFactor 2): the Mender's TEND tab with the Bond strip, the Operative's Shadow row and the Break
  toggle, the Chaplain Witnessed with Old Overcast standing on the tile, the Skirmisher's two reaction pips, the title
  with the Proving Ground first, and NEW GAME's room on the Narrator's own start.

## Integration (13 Nov 2026, on the worktree branch `worktree-agent-ae4b686cb852265a3`)

On top of the builder's branch (fast-forwarded): the merge of the main line (`claude/charming-gauss-hbq4n0`: step 8
integrated, Figments, the Visualizer and the Rigger; the painted gear icons; the katana), then Figments' screen, then
Leon's two asks (the Bond line, the Hidden token). Not pushed, no version bump.

**The merge.** `datatext.ts` fills both figments.json and shadow.json. `effects/collect.ts`: one `systemVerbs` (a file's
`tab`, `groups`, an item's `group`) for Shadow, Tending and Figments, beside Figments' held verbs. `effects/actions.ts`:
ONE pick-list route: Inspire's `felt` (every feeling, felt first, the unfelt with `off: UNFELT`) is registered through
`registerPickList` beside `forms`; the registry's options carry `off`, so a greyed pick is refused by
`previewPerkAction` for any list. `apps/web/e2e/README.md`: both sides' rows (classes-moves with Field Fix, figments,
and this branch's shadow / chaplain / tending / reactions). `ENGINE-HOOKS.md` regenerated.
**Golden tables, re-recorded on the merged code after `paths-order`, `sight-order`, `shared-state`, `old-save` passed:**
`costs-credit.json` against the main line +195 −195 (this branch's refusal words), against this branch +30 (step 8's
door verbs); no line is new to both parents and none both had is gone. `replays.json`: 16 games differ from the main
line (state and marks only; actions and streams equal), exactly the 16 this branch moved from its base (the hand-off's
"5" counted the M813 sessions; every replay's saved campaign copy carries `listed: false`); 10 differ from this branch,
exactly the 10 the main line moved. Only `credit` moved among the costs tables.

**Figments' screen (figments-spec.md section 9), through the descriptors:**
- figments.json `tab: "figments"`, `groups: {picture: "Picture"}`; Picture and Load the Visualizer in it. `DescGroup`
  / `GROUP_ORDER` / `ItemTab` / `VERB_TABS` gain `figments` (after `tend`). The client's tab list
  (`game/commands.ts descriptorGroups`, which the section 5 note above missed), `TAB_NAME`, `TAB_INK` (Expression).
- The owned-unit rows: a Figment's (`owned.kind === 'figment'`) go on the FIGMENTS tab, one group per held Figment
  headed by its name and HP (`HOUND · HP 45/45`; a second of a name numbered); other owned units stay on Utility.
- `ownedView(cb, u)` (screenViews.ts): owner, kind, turnless, the token's line ("Recruit's Figment: Recruit acts
  through it (no turn of its own)"), in the tile's label and card.
- The Visualizer row names the focus's hand (`Visualizer · off hand`, the engine's `focusHand`) as the Attuner's does;
  the meter's values no longer repeat their labels (it read "FIGMENTS FIGMENTS 2/3"); a Figment is no longer listed
  again as a "Companion" HP row (its group has the HP; the hint there said it acts on its own turn, which is wrong).
- Painted gear icons: `gear-visualizer` and `gear-attuner` resolve through `gearIconUri` by item id; there is **no
  toxin vial item** in data (the art `consumable-toxin_vial` waits for one).
- Tests: `screen-step10.test.ts` "screen: Figments"; `figments.mjs` reads the tab, its groups, the focus and the owner.

**Leon's two asks.**
1. **A Bond's faint line.** Data: `rules.json ties.kinds[].line {ink, foe_dash}` (bond: `#EB95B7`, `5 4`); a kind
   without `line` draws nothing (the owned tie could use it later). Engine: `tieLines(cb)` (screenViews.ts) over the
   combat the screen holds, which is the player's view (fog keeps its own side's ties; a far end it can't see is
   UNSEEN and draws nothing). Client: `game/tieLayer.ts`, one `<svg data-tie-layer>` inside `.phc-grid` (it pans and
   zooms with the tiles; the grid is now `position: relative`), z-index 1 over the tiles, each line stopping at the
   tokens' rims; 1.5 px, 35% (60% on the Bonder's turn or while its chip in the Bond strip is hovered), dashed to an
   enemy, a slow pulse (`phc-tie-pulse`) off under reduced motion, `pointer-events: none`. Not in `fx/**`, not in the
   grid's hover code. A line between adjacent tokens is a few pixels (their rims nearly touch). Hovering a line's end
   does not light its chip (the layer takes no pointer). Tests: `game/tieLayer.test.ts` (jsdom, the template's own
   layer: two lines, the right inks and dashes; none without the tie); `tending.mjs` now plays with a friend (the
   Mender's squadmate was never there in a solo Proving Ground, so its whole squadmate block had been skipped): the
   line after a Bond, dashed to the Soldier, moving with the Mender's step, gone after Let Go.
2. **A Hidden token at 60%.** `game/tokenFade.ts`, the one opacity for the map token and the turn bar's portrait:
   held 0, Downed 0.5 (Downed wins), Hidden 0.6, else 1; read from the unit as the view holds it (an unseen Hidden
   enemy is not in the view). The HIDDEN chip and the label's word stay. Tests: `tieLayer.test.ts`; `shadow.mjs` (0.6
   after Vanish, 1 after the Break reveals). Side effect: a Downed unit's turn-bar portrait is now at 0.5 too.

**Still missing on screen, by system:** Figments: the portrait in each Figment's group header, a Picture refused
"Out of projection range" shown on the tile, the bots' stream/scatter VFX and sounds (art and sourced assets); the hover
card's "range left"; the fooled enemy's "believes the Double is you". The tab bar wraps to a second row with six or
more tabs (a Rigger: Move, Attack, Utility, Class, Figments, Calls), leaving one tab alone on the row. The rest as
section 1's "still missing" (Bonds' aim marks and save record; Shadow's ring fx; Smite's chip; Sanctuary's outline;
Run and Gun's chip).

**Found on the way:** `npm run assets` run before a merge that brings art leaves the painted icons out of
`public/assets` (the game shows broken images); run it again after the merge.

**The close.** `validate.py` 0 errors (it now checks a tie kind's `line`); the catalogue `--check` clean; screen data
fresh; `npm run built-from -- claude/charming-gauss-hbq4n0..HEAD`: 2 smells in 1 place, 0 a lint fails on (the MP-row
hints in `resources.ts`, as before); `npm run check` ALL GREEN (engine 4040, web 1136; a first run under load 35 timed
out 22 combat-screen tests at 5 s, each file passing alone). Browser suites on port 8897 (`--base`, own server), two at
a time, all green: shadow, tending, chaplain, figments, reactions, title, missions, reconnect, two-players, faith,
faith-pg, playscreen, tabs, sandbox, old-save, gear-icons, and the ten not run before (coop-stall, cutins, magic, perks,
playtest-tools, right-panels, rules114, shell-guest, ui-shell, vote). title and missions passed only alone at first (a
fresh page and a reload past 30 s at load 35): their waits are 90 s now; green together after. `prim-owned-actions`
reads the fixture Figment's rows on the Figments tab. Screenshots (deviceScaleFactor 2): the Rigger with two Figments
and its panel, the Mender's Bond lines, the Operative Hidden at 60%.
