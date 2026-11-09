# UI pass: the shell (header, room flow, Echo, right column, settings, dialogs) — design, 9 Nov 2026

Status: **design, for build on this branch** (`claude/awesome-babbage-8gngk8`, from develop 0.12.0). Presentation and
client plumbing only: no rule changes, no engine numbers. One engine gap is flagged for Leon (section 4.4: Echo cannot
be spent in a fight today).

This is the **main track** of a three-way UI pass. The other two tracks build in parallel and are merged here later:

| Track | Branch | Owns | This track must not touch |
| --- | --- | --- | --- |
| Main (this doc) | `claude/awesome-babbage-8gngk8` | the header on every screen, the room-return flow, Echo's home, the story screen's right column and quest board, the mana forecast outside fights, the settings cog and audio buses, the floating buttons' opacity, the in-game dialog | — |
| Implementer 1 | `feature/combat-polish` | the combat screen's insides: target portraits, the backpack button by the AP bar, animation speed (`game/combatSpeed.ts`), cut-in length and portrait, the reload animation | `game/fx/*`, `game/spotlight/*`, the combat action panel and target card |
| Implementer 2 | `feature/pg-levelup-ui` | the Proving Ground layout (`game/sandbox.tsx`, the centre column in Proving Ground mode), the level-up screen, the Perks tab's Confirm buttons | `sandbox.tsx` (except the one-line dialog swaps in section 9.4), `levelup.*`, the Perks tab; the centre story column of `main.template.html` |

Leon's words (9 Nov 2026), the ones this track answers:

> we need to fix the UI flow on the header, absolutely abhorrent UX design, [a Leave] button must exist, now we click
> room then save and leave, but the normal save button is RIGHT THERE. Going back and changing your API key gives zero
> feedback, then the button you used to go into the room is now grey out and you need to press a button up top to go
> back to the room.
>
> for echoes, i have had MULTIPLE testers ask what it does and where is it displayed. The current display makes it
> feel like it's not even part of the game.
>
> The story/combat buttons are never used by anyone i tested with, just bring it to the area map.
>
> The mission board needs to be on the right instead of below squad, i know we have a card that shows interactables
> nearby but limit that space and give it a scrollbar. Then add the quest board below instead, the quest board out of
> all things NEEDS to be perma open with groups and scrollbars in case the map is a town filled with quests and you
> take all of them.
>
> The combat screen now has a new amazing mana in the atmosphere display but normal gameplay in the room does not see it.
>
> Fix that, then add a settings cog icon where you can configure the combat sound (all gun/magic/utility sounds now
> sound tiny and muddled compared to button clicking sounds and music). You also configure the AI voices module here
> too. The music button is for music only.
>
> Music button and memory button [need an] alpha setting (it's blocking the combat log in combat mode).
>
> Make special UI for any UI that prompts you. Some antivirus REALLY hate browser prompting.

Read with: `CLAUDE.md` (colour = meaning, Spectral / Chakra Petch, the asset rule), `docs/design/colour-system.md`,
`docs/design/ui-screens.md`, `docs/design/cutin-spec.md` (settings it adds), decision 110 (the mana forecast panel).

---

## 0. What I saw (the walk, 9 Nov 2026, develop 0.12.0 built, scripted Narrator)

I walked: title → New game → room → a character → Start session → the play screen at 1440×900 and 1920×1080 → Room
(from the header) → typed a new API key → back → the mission board → the area map → a check → the fight at 1440×900
and 1920×1080. Leon's screenshots 30–34 match what I got. Findings, numbered:

1. **The header is eleven things in a row and wraps at 1440 wide.** PROJECT HEAVEN CRY · STORY|COMBAT · AI NARRATOR ·
   YOUR KEY · Voice: Browser voice · ROOM ALFX66 · $0.00 · 1 Narrator turn · ⚑ Report · Room · Save · MISSIONS · 5 ·
   ECHO ◆◇◇ 1/3. At 1440×900 the MISSIONS button falls onto a second header row, above the character portrait (Leon's
   "below squad"), and pushes the whole play screen down 50 px. Status chips (Narrator, Voice) look like buttons and
   aren't; the cost text is underlined and is a button; Room and the room code are two separate things.
2. **There is no Leave on the play screen.** Leaving is Room › *Save and leave*, one screen away, while a plain Save
   sits in the header. For a guest, the room's button just says *Leave*; nothing says what happens to their character.
3. **The room in session is a dead end.** Its big bottom button reads **In session**, greyed (screenshot 32), exactly
   where *Start session* was. The way back is a green *Back to the session ›* in the top bar that nobody looks at.
4. **Changing the key says nothing.** Typing a new key into API KEY in session: no "saved", no "used from the next
   turn", no test, and if the Narrator was STUCK nothing offers to retry with the new key.
5. **Echo is a decoration.** Three white diamonds at the far right of the header with the word ECHO, no explanation,
   not on the character (where HP and MP are), and in a fight only the words "Echo 1" in the You card's small line.
   It is spent only in the dice table after a failed check. **Engine gap:** an Echo reroll exists only for story checks
   (`check/reroll` in `game.ts`); in a fight there is no way to spend it (spec item, "MISSING: Echo in combat"). Testers
   are right that in a fight it isn't part of the game.
6. **STORY | COMBAT is a mode switch nobody needs.** The game already moves you to the fight when one starts and back
   when it ends; the toggle is greyed out of a fight and does nothing useful in one. The Area map, the thing people
   actually open every round, is a small button halfway down the right column.
7. **The right column scrolls as one long page.** At 1440×900: HERE (objectives here), the zone and minimap, NEAR YOU
   (uncapped: a town would push everything down), SPEAKING ORDER, Pass / End turn / Skip the rest, AP, a paragraph.
   At 1440×900 Pass and End turn are below the fold of that scroll, and the **Memory and Music pills** (they float at
   the bottom right in story mode) and the *Now playing* credit toast sit over that end of the column: scroll down and
   End turn is under them.
8. **The mission board is a modal** (from the header button) that covers the right half of the screen; objectives also
   appear, differently, in the HERE card. Two places, neither always open.
9. **The mana forecast exists only in fights** (decision 110). Out of a fight the meter (`g.story.mana`) still moves
   (deaths, Sigils, Outbursts on the area map) and only the area map's HUD shows "MANA 15 · Normal".
10. **Sound:** I measured the files (`ffmpeg ebur128`, loudest 400 ms window): the confirm click is **−12 LUFS**, a
    rifle shot **−26 LUFS**, an SMG shot **−25**, a Shock **−22**, a burst **−19**. The mix (`sfx.ts` `MIX`) gives guns
    0.45–0.65 and UI sounds the default 0.4, so a rifle plays about **11 dB quieter than a button click**, through the
    same volume slider, then a limiter at −3 dB squashes overlapping shots. "Tiny and muddled" is exactly that.
11. **Voice and music share a panel.** The Voice chip in the header is a status label, not a button; the voice
    settings live inside the Music panel (`music.tsx` renders `<VoiceSettings compact />`) and in the title's Settings.
12. **The Music and Memory pills are opaque and fixed**: bottom right in story (over End turn), bottom left in a fight
    (over the map's lower rows and over the combat log when the log sits under the map).
13. **Browser dialogs:** `confirm()` in `sandbox.tsx` (3), `memory.tsx` (1), `title/Title.tsx` (2) and `screens/main.js`
    (1, forget a design); `prompt()` in `screens/main.js` (1, the reroll / reword note); `alert()` in `Title.tsx` (1,
    Show tips again). (`combat.js`'s `confirm` hits are a method name, not the browser's.)

---

## 1. The header (every screen in a session)

### 1.1 What goes, what moves, what stays

| Now | After |
| --- | --- |
| STORY \| COMBAT toggle | **gone**. Its place: **Area map** (story) / **Back to the fight** (story during a fight) / nothing (combat) |
| AI NARRATOR · YOUR KEY chip | **one Narrator chip** that is a button: state word, a dot, and a menu (1.3) |
| Voice: Kokoro · CPU chip | **gone from the header**: the Narrator chip shows *speaking* / *loading voice*; details in its menu and in ⚙ › Voice |
| Retry (when stuck) | inside the Narrator chip, which turns red: **Narrator stuck · Retry** (host); *Narrator stuck* (guest) |
| ROOM ALFX66 · (text) and Room (button) | **one button: `ROOM ALFX66 ›`**, opens the room screen |
| $0.00 · 1 Narrator turn | in the Narrator chip's menu (host), still opening the spend dialog |
| ⚑ Report | stays, icon-sized (`⚑`, label in the tooltip and aria-label "Report a problem") |
| Save | **stays, one click** (host). Feedback on the button: *Saving…* → *Saved ✓* for 4 s |
| MISSIONS · 5 | **gone**: the quest board is always open in the right column (section 3) |
| ECHO ◆◇◇ 1/3 | **moves to the character** (section 4) |
| — | **⚙ Settings** (new, section 6) |
| — | **Leave** (new, everyone; 1.4) |

### 1.2 Order and wireframes

One row, never wrapping, from 1100 px wide; left to right: identity, the one navigation button, the Narrator, then
the room cluster on the right. Below 1100 px the Narrator chip shrinks to its dot and state word.

Story, host, 1440 wide:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ PROJECT HEAVEN CRY   [▦ AREA MAP  M]   [● NARRATOR · READY ▾]                [ROOM ALFX66 ›] [Save] [⚙] [⚑] [Leave] │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

Story, during a fight (you looked away from it), the navigation button turns into the way back, red with words:

```
│ PROJECT HEAVEN CRY   [⚔ BACK TO THE FIGHT ›]   [● NARRATOR · READY ▾]         [ROOM ALFX66 ›] [Save] [⚙] [⚑] [Leave] │
```

Narrator stuck (host): the chip is red with a word and the action inside it:

```
│ PROJECT HEAVEN CRY   [▦ AREA MAP  M]   [▲ NARRATOR STUCK · Retry]             [ROOM ALFX66 ›] [Save] [⚙] [⚑] [Leave] │
```

Guest: no Save (the host's save is the room's save), Leave says what happens (1.4):

```
│ PROJECT HEAVEN CRY   [▦ AREA MAP  M]   [● NARRATOR · LEON'S KEY ▾]                   [ROOM ALFX66 ›] [⚙] [⚑] [Leave] │
```

Combat: the round line keeps the middle; the room cluster is the same as the story's, so Save and Leave are where they
always are. (The turn chip stays at the far right as now.)

```
│ PROJECT HEAVEN CRY   ROUND 1 · OUTPOST-813 REAR LANDING PAD     [ROOM ALFX66 ›] [Save] [⚙] [⚑] [Leave]  (YOUR TURN) │
```

Proving Ground: the Narrator chip is the mode chip (no Narrator there), Leave means leave the Proving Ground:

```
│ PROJECT HEAVEN CRY   [▦ AREA MAP  M]   [PROVING GROUND · 1 PLAYER]             [ROOM M7BC7K ›] [Save] [⚙] [⚑] [Leave] │
```

Room screen (lobby or in session): the same right cluster; *Copy invite link* stays; *Save and leave* is gone (Leave
does that); in session the green *Back to the session ›* stays on the left of the cluster (section 2).

```
│ PROJECT HEAVEN CRY   ROOM ALFX66  ● ONLINE        [Back to the session ›] [Copy invite link] [Save] [⚙] [⚑] [Leave] │
```

Widths at 1440 (Chakra Petch 12 px buttons): title 250 · Area map 130 · Narrator chip ≤ 240 · room 130 · Save 64 ·
⚙ 36 · ⚑ 36 · Leave 70 · gaps 8 × 12 → about 1050 px of 1392. It fits at 1280 too.

Styles: buttons as today (34 px high, radius 8, 1 px `#2E3A50`, text `#E7EBF3`); **Area map** is the one emphasised
control (white 1 px border, white text, a ▦ glyph and the key hint `M` in muted); **Back to the fight** is outlined in
HP red `#F65157` with the word FIGHT; **Leave** is plain (not red: leaving is safe, it saves first). The Narrator chip
is a pill whose dot carries state: white = ready / your key, pulsing white = thinking or speaking, red `#F65157` with ▲
= stuck; always with the word.

### 1.3 The Narrator chip's menu

A small popover under the chip (click, Enter, or Escape to close):

```
┌ NARRATOR ──────────────────────────────┐
│ ● Ready · Claude Opus 5.5 · your key   │
│ This session: $0.42 · 7 turns   [Spend…]│   host only
│ Voice: Kokoro · CPU (WebGPU failed)    │
│   [Voice settings ⚙]                    │   opens ⚙ › Voice
│ [Change key or model ›]                 │   host: room screen, scrolled to the Narrator box
│ [◈ Memory…]                             │   host: the memory dialog (same as the floating pill)
│ ─ when stuck ─                          │
│ ▲ 401 from Anthropic: the key was refused│
│ [Retry]  [Change key ›]                 │
└────────────────────────────────────────┘
```

Guests see the state, the model and *the host retries* when stuck.

### 1.4 Leave

**Leave** opens the in-game dialog (section 8) with save-then-leave:

- Host, a room: *Leave the room?* — "The game saves first, here and on the room server. Resume it from Saved sessions
  on the title screen; your friends stay in the room until you come back." **[Save and leave]** (primary) ·
  **[Stay]**. Save and leave = `saveNow()` then `leaveRoom()`; if the save fails, the dialog says so and offers
  *Leave without saving* (red word) or *Stay*.
- Guest: *Leave the room?* — "Your character stays in the squad; rejoin any time with code ALFX66." **[Leave]** ·
  **[Stay]**.
- Proving Ground: *Leave the Proving Ground?* with the texts `sandbox.tsx` already uses (host with friends: "It closes
  for everyone"); it calls `leaveProvingGround(...)`. The panel's own Leave (implementer 2) asks the same dialog.
- In a fight: the same dialog plus one line, "The fight is saved where it is." (no rules change: the save is the
  event log).

The header button's **accessible name is "Leave the room"** (Proving Ground: "Leave the Proving Ground"), so the e2e
helpers that click the Proving Ground panel's exact *Leave* (`sandbox.mjs`, `sandbox-mp.mjs`, `slate-music.mjs`) keep
hitting the panel's button.

### 1.5 Save

One click, stays where it is (host). The label goes *Save* → *Saving…* → *Saved ✓* (4 s), as the room's does now;
`Ctrl+S` / `Cmd+S` also saves (prevent the browser's save-page). A failed save turns it red: *Save failed · retry*.

### 1.6 Build notes

- The headers are hand-written in `main.template.html` and `combat.template.html` and `room.template.html`. Make them
  the same markup, fed by one function: new `apps/web/src/screens/shell.js` exporting `shellVals(self, screen)` (room
  code, save label and handler, leave handler with the dialog, Narrator chip state and menu, area-map / back-to-fight,
  cog). The three screens spread it into their render values. The popovers and dialogs are React (section 6, 8),
  mounted once in `App.tsx`, opened through small `open…()` functions as `openReport` / `openMissionBoard` are now.
- Keep the old binding names where tests read them, or update the tests in the same commit (`missions.mjs` reads the
  MISSIONS button; `voice.mjs` reads `data-phc-voice-chip`: keep that attribute on the Narrator chip's voice line).
- The combat header is the shell, not the combat insides: this track edits only `<header class="phc-cb-head">` in
  `combat.template.html` and the `toStory` / header bindings in `combat.js`; implementer 1 owns the rest of that file.

---

## 2. The room-return flow

### 2.1 The big button

In session, the room's bottom button (where *Start session* was) becomes **Return to the session ›**: enabled, green
`#6FEA77` with dark text (the same style *Start session* has when ready), going to `combat` or `main` like *Back to
the session ›*. Never a greyed *In session*. A guest's reads *Return to the session ›* too (it is just navigation).
When the campaign is complete it stays as now (*Campaign complete ✓*), plus *Return to the story ›* beside it.

```
┌ TONE ─────────────────────────────────────┐
│ [Grim] [Pulp] [Literary]                   │
├────────────────────────────────────────────┤
│        Return to the session ›              │   green, enabled
│  Changes here apply from the next turn.     │   muted note, in session only
└────────────────────────────────────────────┘
```

### 2.2 The key, in session

Under API KEY, a status line and a test button (host, AI mode):

```
API KEY
[ •••••••••••••••••••••••• ]  [Test key]
✓ Saved for this session · the Narrator uses it from its next turn.      (success green, with ✓)
  Not remembered in this browser: tick "Remember the key" to keep it.     (muted; only when Remember is off)
```

- Typing (debounced 400 ms after the last key) shows *✓ Saved for this session*. The Narrator settings already apply at
  once (`setNarrator`); this only says so.
- **Test key** calls the provider's model list (`listModels`, no tokens spent): *✓ Anthropic answered: the key works
  (12 models)* or *✗ Anthropic refused the key (401). Check it, or switch provider.* in HP red with ✗. While testing:
  *Testing…*. The provider/model changes show *✓ Saved* the same way.
- **If the Narrator is stuck** (`g.narrator.error`) and the key or model changed, a white primary button appears under
  the status: **Retry the Narrator now ›** (calls `retryNarrator()` and returns to the session).
- Returning to the session after a key change toasts *Narrator key updated* once.

### 2.3 Leaving from the room

*Save and leave* is removed from the room header; the shell's **Leave** (1.4) does it, with the same dialog.

---

## 3. The story screen's right column

### 3.1 Leon's ask, read

"The mission board needs to be on the right instead of below squad": the MISSIONS button that wraps under the header
above the character, and the board it opens, move into the right column. "The quest board … perma open with groups and
scrollbars": that board is always open there, not a modal. So **mission board and quest board are one thing: the
Quest board**, a permanent panel. The HERE card's objectives fold into it (no second list). NEAR YOU is capped with its
own scrollbar.

### 3.2 Layout

The column stops scrolling as a whole: it is a flex column of fixed panels, two of them with their own scrollbars,
and the turn controls pinned at the bottom (clear of the floating buttons, section 7).

```
1440 × 900 (column 320–360 wide, 835 px tall under the header)
┌ RIGHT COLUMN ─────────────────────────────┐
│ ☁ MANA · NORMAL AIR · 15/40   ▬ steady [▸]│  ~64   mana forecast, compact (section 5)
├───────────────────────────────────────────┤
│ ZONE · THE SHIELD LINE   DAY 1  [▦ Area map]│
│ ┌───────────── minimap ─────────────────┐ │  ~200  (click opens the area map, as now)
│ └───────────────────────────────────────┘ │
├───────────────────────────────────────────┤
│ NEAR YOU · 5                               │
│ ◆ Sergeant Nine-Nine · H5 · 3 approaches  ▲│  max 132 (3 rows), own scrollbar
│ ◆ Supply crate · G7                        ║│
│ ◆ Wounded trooper · F6                    ▼│
├───────────────────────────────────────────┤
│ QUEST BOARD · 5 open     Group: [Area|Quest]│
│ ▾ HERE · THE SHIELD LINE (2)              ▲│  flex: 1, min 180, own scrollbar
│   ☐ Report to Sergeant Nine-Nine           ║│
│     › in the stake line · ◆ H5             ║│
│   ☐ Tend the wounded on the triage line    ║│
│ ▾ ELSEWHERE (2)                            ║│
│   ☐ Carry the wounded east to the rear pad ║│
│     › In The rear pad                      ║│
│   ☐ Drive the scavenger drones off  OPTIONAL│
│ ▾ SIDE JOBS (1)                            ║│
│   ◇ Keel's missing toolkit                 ║│
│ ▸ DONE (0)                                ▼│  done groups start folded
│                         [Full board ⤢]      │  the long view: summaries, past acts
├───────────────────────────────────────────┤
│ (L) MPAT · acting 6 AP   (N) Narrator · after│  ~44   speaking order as one strip of avatars
│ [Pass]   [End turn]   [Skip the rest]       │  42    pinned
│ AP 6 / 6 · one Say and a full turn of AP    │  ~20
└───────────────────────────────────────────┘
```

At 1920×1080 the same column is 245 px taller: all of it goes to the quest board.

### 3.3 The quest board

- **Always open.** No close button. Its header: *QUEST BOARD · 5 open* (the count = `missionsButton(g).count`).
- **Groups, each foldable** (the fold is remembered per group in `localStorage` `phc.questFold`), with a count:
  - **Group by Area** (default; the town case): *HERE · <zone>* (objectives with `here`), then one group per other
    zone (*IN THE REAR PAD*), then *SOMEWHERE* (no zone known), then *SIDE JOBS*, then *DONE* and *FAILED* (folded).
    Each row says its mission in muted small caps when the group mixes missions.
  - **Group by Quest**: one group per current mission (its title and the goal on one muted line), then *SIDE JOBS*,
    then *PAST* (done and failed missions, folded). Rows tagged *HERE* in white when they are in this zone.
  - The two-way toggle is remembered (`phc.questGroup`). Data: `boardView(g)` for missions and side jobs, and
    `hereVals(g)` / `hereCard` for each objective's `here`, `zoneName`, `markers` and `steps` (join on the objective
    key). If campaigns later give missions a `giver` or `area`, *Area* uses it; nothing else changes.
- **Rows:** ☐ / ✓ / ✕ (the board's marks, success green / muted / HP red, always with the mark), the text, *OPTIONAL*
  in muted caps, the location line (*◆ H5* markers are clickable: they open the area map on that tile), the steps as
  › lines. New objectives flash white once (the toast still shows as now).
- **Scrolling:** its own scrollbar, `overscroll-behavior: contain`. A town with 30 objectives scrolls inside the panel;
  nothing else in the column moves.
- **Full board ⤢** opens today's mission board dialog (summaries, past acts, the OOC hint). `MissionLayer` keeps the
  toasts and the act/campaign end screens; the header button goes.
- **No missions** (a campaign without them): the panel shows HERE's zone and day only, and the space goes to NEAR YOU.

### 3.4 NEAR YOU

Capped at three rows (`max-height: 132px`), scrollbar inside, the count in the heading (*NEAR YOU · 5*), the nearest
first as now. Empty: the heading hides.

### 3.5 Speaking order and the turn controls

The order becomes one row of round portraits (36 px), each with its state under it (*acting · 6 AP*, *done*, *after
all*), wrapping to two rows for 5+ speakers. Pass / End turn / Skip the rest and the AP line are pinned at the bottom
of the column. The long explanation paragraph goes into End turn's tooltip and the first-time tip.

### 3.6 Proving Ground

In the Proving Ground the column keeps the forecast, the minimap, NEAR YOU and the turn controls; there is no quest
board (no missions there) unless the World tools placed an objective. Implementer 2 owns the centre column there.

---

## 4. Echo's home

### 4.1 On the character, next to HP

Echo is a character resource like HP and MP, so it lives on the character: the left column's bars get a fourth row,
and the combat You card gets the same row.

```
HP    ███████████████████████░░   160 / 160
MP    ░░░░░░░░░░░░░░░░░░░░░░░░░   no Emanator
ECHO  ◆ ◇ ◇   1 / 3  · reroll a d20                          (?)
XP    ░░░░░░░░░░░░░░░░░░░░░░░░░   0 / 100
```

- Three diamonds (14 px), filled white for each Echo held, hollow for the empty slots; the words *1 / 3 · reroll a
  d20*. White is Echo's colour (CLAUDE.md states). The (?) and the whole row open the explainer.
- In the combat You card the line "… · Echo 1" becomes the same row under HP (implementer 1 owns the You card's other
  rows; this track adds only the Echo row and removes "Echo n" from the small line).
- The header loses its ECHO pips.

### 4.2 The explainer

A popover from the row (and a glossary entry for the first-time tip):

```
┌ ECHO ◆◇◇ 1 / 3 ────────────────────────────────────────┐
│ A second chance. Spend 1 Echo to throw a d20 again;     │
│ the new throw stands. One Echo per roll.                │
│                                                          │
│ GET IT   · 1 at the start of every session              │
│          · +1 when you indulge an Overreach (a skill     │
│            pushes and you let it)                        │
│ HOLD     · at most 3                                     │
│ SPEND IT · on a failed check, in the dice table:         │
│            "◆ Spend 1 Echo · throw again"                │
│          · to resist an Overreach (1 Echo, 2 if the      │
│            skill is Mastered)                            │
│          · in a fight: not yet  (see 4.4)                │
└──────────────────────────────────────────────────────────┘
```

### 4.3 Making it felt

- **Gained:** the row's new diamond fills with a short white flare, and a toast *◆ +1 ECHO · you indulged Durability*
  (the entry that gave it; also *◆ Echo back to 1 · session 2*).
- **Spent:** the diamond empties with the same flare reversed; the dice table already names it (*Echo reroll (was 4)*).
- **Offered:** after a failed check with Echo in hand, the dice table's *◆ Spend 1 Echo · throw again* button pulses
  white once, and the Echo row on the sheet pulses with it, so the two are visibly the same thing.

### 4.4 The engine gap (for Leon)

An Echo reroll exists only for story checks (`check/reroll`). In a fight a d20 (attack rolls, saves, the Stitch d20)
can't take one; the spec marks it MISSING. The explainer says *in a fight: not yet* until it is built. Building it is
engine work (a `combat/reroll` action on the last roll of yours, the dice dialog's button in the attack verdict) and
outside this UI pass; I recommend it as the next engine item, since half of what testers do is fight.

---

## 5. The mana forecast outside fights

- The story screen gets the forecast panel at the top of the right column (3.2), **the same component** as the fight's:
  `forecastVals(cb, open, toggle, drop)` from `game/manaForecast.ts`, fed a stand-in for `cb` built from the story:
  `{ mana: g.story.mana, round: g.story.round || 1, name: 'story', map: { id: g.story.zone } }`. The trend then reads
  per story round in this zone, the outlook and *More ▸* (what this air does, what moves it) as in a fight. No rule
  changes; `g.story.mana` is already the meter between fights.
- Compact form in the column: the cloud icon, *MANA · NORMAL AIR · 15/40*, the gauge with the four bands, the trend
  arrow; the sky and outlook lines move into *More ▸*, which opens downward inside the column.
- The template markup for it is copied from `combat.template.html` lines 23–34 (the `fc.*` bindings) into
  `main.template.html`'s right column; the drag grip is left out (the story column has no layout editor).
- The area map's HUD keeps its *MANA 15 · Normal* line.

---

## 6. The settings cog (⚙)

### 6.1 One settings body, two homes

New `apps/web/src/game/settings.tsx`: `<SettingsBody tab? />` and `openSettings(tab?: 'audio' | 'voice' | 'combat' |
'display')`. The header's ⚙ opens it as a dialog (section 8's styling, 760 px wide, tabs down the left); the title
screen's SETTINGS panel renders the same `<SettingsBody />` (plus the name field), so there is one source.

```
┌ SETTINGS ─────────────────────────────────────────────────────────────┐
│ [Audio]   │ MASTER          ━━━━━━━━━━━━━●━━━━━   80%                  │
│  Voice    │ MUSIC           ━━━━━━━━━━●━━━━━━━━   70%   (♪ panel's own │
│  Combat   │                                          volume is yours) │
│  Display  │ COMBAT SOUNDS   ━━━━━━━━━━━━━━━━●━━  100%  [▶ Test: a shot]│
│           │   guns, magic, hits, reloads, explosions                    │
│           │ INTERFACE       ━━━━━●━━━━━━━━━━━━━   35%  [▶ Test: a click]│
│           │   buttons, tabs, hovers                                     │
│           │ NARRATOR VOICE  ━━━━━━━━━━━━━━●━━━━   90%  [▶ Test voice]  │
│           │ [ ] Mute everything                                         │
│           │                                               [Done]        │
└───────────────────────────────────────────────────────────────────────┘
```

### 6.2 Audio: buses and the loudness fix

- **Buses** in `sfx.ts`: today every sound goes through one `out` gain and a limiter, at `prefs.sfx`. Split into two
  gain nodes before the limiter: **combat** (every `CombatSfx`, `ElementSfx`, `WordSfx`, `SoulSfx`, `FeelSfx`,
  `FaithSfx`, the stand-ins `shot`, `hit`, `miss`, `reload`, `melee`, `draw`, `evoke`, `overload`, `outburst`,
  `release`, `short`, `crystal`, `vent`, and the loops) and **interface** (`hover`, `click`, `start`, `back`,
  `slide*`, `error`, `toggle`, `tab`, `stamp`, `wick_*`). A `bus(name)` function decides; master multiplies both.
  Music (`ost.ts` / YouTube) and the Narrator's voice keep their own paths, times master.
- **Prefs** (`phc.ui`): `master` (default 80), `music` (70, as now), `combat` (100), `sfx` becomes **interface**
  (default **35**, migrated: an old saved `sfx` value moves to `combat` if `combat` is unset, and `ui` starts at 35),
  `voice` (from `voicePrefs().volume`, the same number, so the voice panel and this slider agree), `mute`.
- **Loudness, the real fix:** a one-off tool `tools/normalize_sfx.py` (ffmpeg) brings every file under
  `apps/web/public/sfx/cb/` to a target short-term loudness (guns, explosions, hits: −14 LUFS momentary max; magic and
  elements: −16; reloads, steps, loops: −20) and the interface files to −24, writing the files in place with a
  `sfx-loudness.json` report (before, after). Gains in `MIX` are then re-centred on 0.5 so the mix values mean "relative
  to its family" again. Measurements in section 0, item 10. The licences allow it (CC0 / CC BY 4.0); CC BY credits in
  `sfxCredits.ts` get "loudness normalised" added where the licence asks changes to be indicated.
- **The clamp:** `Math.min(1, level × MIX × 2 × gain)` stays per sound; the bus gains can go to 1.5 (150%) so the
  combat slider has headroom above the old ceiling. The limiter stays (−3 dB) but with a softer knee (6 dB) and
  release 0.15 s so a burst stops pumping.
- **Test buttons** play a rifle shot, a click, and the voice sample (`SAMPLE_LINE`).

### 6.3 Voice

Everything the header's Voice chip and the Music panel's VOICE section do now: `<VoiceSettings />` (full, not compact):
the engine's state in words (*Kokoro · CPU (WebGPU failed: …)*, *Browser voice*, *Installing 42%*), install / pick
GPU or CPU, read new lines aloud, wait for Kokoro, the Narrator's voice and the three core voices, speed, Test voice.
The Music panel loses its VOICE section (it gets a one-line *Voice settings ⚙* link instead): **music only**.

### 6.4 Combat

- **Combat speed: Normal / Fast** — `getCombatSpeed()` / `setCombatSpeed(v)` from `apps/web/src/game/combatSpeed.ts`
  (implementer 1 builds what it does; if the module isn't there when this track builds the cog, create it with exactly:
  `export type CombatSpeed = 'normal' | 'fast'`, `getCombatSpeed(): CombatSpeed`, `setCombatSpeed(v: CombatSpeed)`,
  `localStorage` key `phc.combatSpeed`, and `window.dispatchEvent(new Event('phc:combat-speed'))` on change; storage and
  event only, no behaviour). Words: *Normal: every beat at its pace. Fast: animations and pop-ups about 15% quicker.*
  (Implementer 1 decides which is which: Leon said the current speed becomes *Fast* and the new default is 15% slower.)
- **Cut-ins: All / Once per scene / Off** — moved here from the title's Settings (it stays there too, through the shared
  body).

### 6.5 Display

- **Floating buttons: opacity** slider 20–100% (default 55%) and **[x] Fade them when the pointer is away** (default
  on). Section 7.
- **Reduce motion** (moved from the title's COMFORT).
- **Show tips again** (no `alert`: the button's label turns to *Tips will show again ✓*).

---

## 7. The Music and Memory buttons

- **Opacity:** at rest they sit at the Display opacity (default 55%). They go to 100% when the pointer is within
  120 px of either, when either has keyboard focus, or while its panel is open; 150 ms ease. With *fade* off they stay
  at the slider's value (100% = as today). Hidden from pointer events? No: a faded button still clicks.
- **Where:** story mode moves them to the **bottom left** (over the character sheet's 120 px bottom padding, which
  exists for this), so the right column's End turn is never covered; combat keeps the bottom left. The *Now playing*
  credit toast appears on the same side, above them.
- **In a fight they shrink to icons** (♪ and ◈, 40 × 40), the track name in the tooltip; hovering widens the music one
  to show the title.
- Memory stays host-only and is also in the Narrator chip's menu (1.3).

---

## 8. The in-game dialog (no browser prompts)

### 8.1 API (`apps/web/src/game/dialog.tsx`)

```ts
export interface DialogOpts { title: string; body?: string; confirm?: string; cancel?: string; danger?: boolean }
export function askConfirm(o: DialogOpts): Promise<boolean>;               // Confirm → true; Cancel, Escape, backdrop → false
export function askText(o: DialogOpts & { placeholder?: string; initial?: string; multiline?: boolean;
  optional?: boolean; maxLength?: number }): Promise<string | null>;       // OK → the text ('' if optional and empty); Cancel → null
export function tell(o: { title: string; body?: string; ok?: string }): Promise<void>;
export function dialogOpen(): boolean;                                     // keyboard handlers skip their keys while true
export function DialogHost(): JSX.Element | null;                          // mounted once in App.tsx
```

- One at a time, queued (a second ask waits for the first).
- `role="alertdialog"`, `aria-modal`, labelled by the title, described by the body; focus goes to the safe button
  (Cancel / Stay) for `danger`, otherwise to the primary; focus is trapped and restored on close.
- Keys: **Escape** = cancel; **Enter** = confirm (in a multiline field, Ctrl/Cmd+Enter). Combat and title keyboard
  handlers check `dialogOpen()` first (the combat screen's number keys, H and arrows; the title's arrows and Enter).
- Look: backdrop `rgba(5,7,11,0.78)`; card 460 px, `#10151F`, 1 px `#3B475D`, radius 16; title in Spectral 22 px;
  body Chakra Petch 14 px `#C9D3E3`; buttons 40 px: primary white with dark text, secondary outlined; `danger` makes
  the primary outlined in HP red `#F65157` with its word (*Delete*, *Leave without saving*). It fades and pops with
  the existing `phc-a-fade` / `phc-a-pop`. z-index above every layer, cut-ins included (a dialog opened during one
  waits until it ends, since input is held then).

```
┌──────────────────────────────────────────────┐
│ Leave the room?                              │
│                                              │
│ The game saves first, here and on the room   │
│ server. Resume it from Saved sessions.       │
│                                              │
│                      [Stay]  [Save and leave]│
└──────────────────────────────────────────────┘
```

### 8.2 The call sites

| File | Now | After |
| --- | --- | --- |
| `game/memory.tsx` | `confirm('Delete "…" from the Narrator's memory?')` | `askConfirm({ title: 'Delete "…"?', body: 'The Narrator forgets it from its next turn.', confirm: 'Delete', danger: true })` |
| `title/Title.tsx` (character) | `confirm('Delete X from this browser?')` | `askConfirm({ …, confirm: 'Delete', danger: true })` |
| `title/Title.tsx` (room) | `confirm('Remove room X …')` | `askConfirm({ …, confirm: 'Remove', danger: true })` (body says the save is deleted, for a host) |
| `title/Title.tsx` (tips) | `alert('Tips will show again.')` | the button's own label, no dialog (6.5) |
| `screens/main.js` (forget a design) | `window.confirm(…)` | `askConfirm({ …, confirm: 'Forget it', danger: true })` |
| `screens/main.js` (reroll / reword note) | `window.prompt(…)` | `askText({ title: 'Vote to reroll' / 'Vote to reword', body: …, multiline: true, optional: true, confirm: 'Start the vote' })` (the vote code already awaits nothing: make `ask` async) |
| `game/sandbox.tsx` ×3 | `confirm(…)` | **one-line swaps only** (implementer 2's file): the two Leave asks become `askConfirm(...).then((ok) => ok && <the same leave call>)` with an early return, and the kick button's `confirm(…) && act(…)` becomes `askConfirm(…).then((ok) => ok && act(…))`. Implementer 2 is told the API in their prompt. |

A unit test (`dialog.test.ts`) checks the queue and the resolved values; a grep test fails the build if
`\b(window\.)?(confirm|prompt|alert)\(` reappears in `apps/web/src` outside `dialog.tsx` (method calls like
`this.confirm(` excluded).

---

## 9. Build plan, tests, merge

### 9.1 Order (commits on this branch)

1. `dialog.tsx` + `DialogHost` + the call sites (8.2) + the grep test. (Unblocks implementer 2's swaps.)
2. `combatSpeed.ts` if still missing (6.4), `settings.tsx` (the cog dialog and the title's panel), the audio buses and
   prefs migration (6.2), voice moved out of the music panel (6.3), opacity and placement of the floaters (7).
3. `tools/normalize_sfx.py`, the normalised files, the report, the credit notes (6.2).
4. The shell header (`screens/shell.js`, the three templates' headers), Leave, Save, the Narrator chip and menu, Area
   map / Back to the fight (1).
5. The room: Return to the session, the key's status and Test key, Retry now (2).
6. The right column: forecast, minimap, NEAR YOU capped, the quest board, the order strip, the pinned turn controls
   (3, 5).
7. Echo: the sheet row, the explainer, gained/spent feedback, the combat You card's row (4).
8. Docs: `ui-screens.md`, a decision entry, `docs/HANDOFF.md`, `CHANGELOG.md` and the version at merge.

### 9.2 Tests

- Unit: `dialog.test.ts`; the quest board's grouping (a pure `questGroups(g, by)` in `missionView.ts`, tested like
  `boardView`); `bus(name)` covers every `Sfx` name; the prefs migration; the story forecast stand-in.
- e2e: a new `apps/web/e2e/shell.mjs`: the header in one row at 1280, 1440 and 1920 wide (no wrap: the header's height
  ≤ 64 px), Save → *Saved ✓*, Leave → the dialog → Stay keeps you, Save and leave lands on the title with the room in
  Saved sessions, Continue → the room → **Return to the session ›** enabled and working, a key typed shows *✓ Saved*,
  Test key with a bad key shows *✗*, the Area map button and `M`, the quest board always present with groups and its
  own scroll (inject 30 objectives through a test campaign), NEAR YOU capped at 132 px, End turn not covered by the
  floaters at 1440×900 (element-from-point at its centre is the button), the forecast on the story screen, the cog's
  four tabs, Echo's row and explainer. Update `missions.mjs` (board in the column, *Full board ⤢*), `voice.mjs` (chip
  moved), and any test that clicked STORY / COMBAT / Room.
- Screenshots at DSF 2 for Leon: the header (story, stuck, fight, Proving Ground, room), the right column at 1440×900
  and 1920×1080, the Echo explainer, the cog's Audio tab, the Leave dialog, the room's bottom button and key status.

### 9.3 Merging the other two tracks

Merge `feature/pg-levelup-ui` and `feature/combat-polish` into this branch after step 7, run engine and web tests, the
build and the e2e suites (`shell`, `sandbox`, `sandbox-mp`, `tabs`, `layout`, `slate`, `cutins`, `missions`,
`two-players`, `perks`, `classes`), look at the screenshots, then bump the version (0.13.0) with one CHANGELOG entry
covering the pass. Expected overlap: `combat.template.html` (my header vs their insides), `main.template.html` (my
header and right column vs their centre-column mount), `App.tsx` (my `DialogHost` and settings vs their layers),
`sandbox.tsx` (my three one-line swaps).

### 9.4 What implementer 2 needs from this track

`askConfirm`, `askText`, `tell` from `apps/web/src/game/dialog.tsx` (8.1), for any ask they add; and that the header's
Leave is labelled "Leave the Proving Ground" in that mode (their panel's *Leave* keeps its exact name).

---

## 10. For Leon (numbered)

1. **"Bring it to the area map":** I read it as *replace STORY | COMBAT with an Area map button* (and a red *Back to
   the fight* when one is on and you're on the story screen). The other reading, the area map *as* the story screen's
   centre, would push the story stream out of the main view; I'm not doing that unless you say so.
2. **Mission board = quest board:** I'm treating them as the same thing (one always-open Quest board in the right
   column, HERE's objectives folded in, the old modal kept as *Full board ⤢*). Group by Area by default, by Quest on a
   toggle. Say if you meant two different boards.
3. **Echo in fights:** it can't be spent there today (engine gap, 4.4). The UI will say *not yet*; I recommend wiring
   the combat reroll next.
4. **Loudness:** I'll normalise the combat sound files on disk (ffmpeg, one tool, a report), not only turn a slider up;
   the rifle is ~14 LUFS quieter than the confirm click today. Default mix after: combat 100%, interface 35%.
5. **Leave** saves first and lands on the title (host) — same as *Save and leave* did, one click closer. Guests' Leave
   doesn't save (it isn't theirs to save).
6. **Floaters:** besides the opacity slider, they move to the bottom left in story mode (they cover End turn at 1440
   today) and shrink to icons in a fight. Tell me if you want them in the header instead.

---

## 11. As built: stage A (the shell), 9 Nov 2026

Built on this branch: sections 1, 2, 6, 7 and 8 (the right column, the quest board, Echo's home and the forecast outside
fights are stage B). Where the build differs from the text above, and why:

1. **Header:** one row at 1280, 1440 and 1920 (59 px). The cluster is `templates/shell.template.html`, put in at
   `<!--SHELL-->` by `expand()`, fed by `shellVals(self, screen)` in `screens/shell.js`; the Narrator chip and its menu
   are `narratorVals()` there too. Until stage B the **MISSIONS** button and the **ECHO** pips stay in the story header
   (between the Narrator chip and the cluster), so nothing is unreachable in between. The Proving Ground's chip is a
   plain label (no menu). On the room screen *Copy invite link* sits left of the cluster.
2. **Keys:** M toggles the area map (never while typing, never over another dialog); Ctrl/⌘+S saves (the host) and
   holds back the browser's save-page; Escape closes the Narrator menu.
3. **The key, in session:** *Test key* asks Anthropic's models list directly (`testKey()` in `narrator/providers.ts`;
   `listModels` answers Anthropic from the built-in list, which tests nothing); other services use their list. No
   tokens are spent either way. `setNarrator` already retries a stuck Narrator as soon as the settings are ready, so
   *Retry the Narrator now ›* only shows while it is still stuck after a change.
4. **Mix:** master defaults to **100%** (80% would have turned everyone's music down 2 dB on the update); master
   multiplies the effects and the music, not the Narrator's voice (that slider is the voice's own volume). The
   interface target is **-20** (not -24): at -24 under a 35% bus a click was near inaudible. Measured after the tool
   (loudest 100 ms, K-weighted): shots -14 to -16, explosions -13 to -14, the confirm chime -20 (was -8.7). With the
   default buses a rifle now plays about 14 dB over the chime (it was 12 dB under). A 40 ms limiter release held a
   shot's whole body down and gained nothing; the tool uses a 3 ms release and two passes.
5. **Floaters:** both bottom left on every screen; in a fight Memory sits beside Music (both 40 px icons) instead of
   above it, so the pair is one row high. The title's Settings panel shows the same body with its tabs on top.

## 12. As built: stage B (the play screen), 9 Nov 2026

Built on this branch: sections 3, 4 and 5. Where the build differs from the text above, and why:

1. **Area map.** STORY | COMBAT went in stage A; the header's Area map button (M) and the red *Back to the fight ›* are
   the way to the map and back. Fights still switch to the combat screen by themselves and back after. The story stream
   stays the centre view (10.1 still waits on Leon).
2. **Right column** (`templates/main.template.html`, values in `screens/main.js`): mana forecast, zone + day + Area map,
   the minimap, NEAR YOU (`max-height: 132px`, own scrollbar), the Quest board (`flex: 1 1 auto`, min 150 px, own
   scrollbar, group headers stick to its top), then the speaking order as a strip of avatars with Pass / End turn / Skip
   the rest and the AP line pinned at the bottom (`position: sticky`). The column itself only scrolls if a very short
   window can't hold the minimums, and the turn controls stay on screen even then. Under 760 px tall the minimap hides
   (the Area map button and M are one click away), so at 1280×720 the board still shows about 250 px of quests. The
   column is `clamp(300px, 22vw, 420px)` wide, so it grows on a 1920 screen. The HERE card is gone: its zone and day
   head the minimap, its objectives are the board's HERE group (`data-here` and `data-here-day` kept for the tests).
3. **Quest board:** `questGroups(g, by)` in `game/missionView.ts` (pure, tested). By Area: HERE · zone (only when
   something is here), IN <zone> per other zone, SOMEWHERE, SIDE JOBS, DONE and FAILED (folded). By Quest: one group per
   current mission with its goal, SIDE JOBS, PAST (folded). Fold per group and the grouping are remembered
   (`phc.questFold`, `phc.questGroup`). Markers (◆ H5) open the area map on that tile. A new open row flashes white once.
   *Full board ⤢* is an icon button in the board's header (the footer cost a row). The header's MISSIONS button is gone;
   `missionsButton` stays for its tests and the old board.
4. **Echo** (`game/echoView.ts`, tested): a row between MP and XP on the sheet (three diamonds, *1 / 3 · reroll a d20*,
   a ? button); the explainer opens in place under it. Every number is read from `rules.json` `resolution.echo` and
   `resolution.overreach`. A gain flares the new diamond and toasts (*◆ +1 ECHO · you indulged Durability* when an
   Overreach gave it); a spend flares the emptied one. The header's ECHO pips are gone. **Not done here:** the combat You
   card's Echo row (implementer 1 owns the You card; it goes in at the merge) and the dice table's pulse.
5. **Forecast outside fights:** `storyForecastVals(g, open, toggle)` in `game/manaForecast.ts`: the fight's forecast fed
   `{ mana: g.story.mana, round: g.story.round, name: 'story', map: { id: g.story.zone } }`. Compact: *MANA · NORMAL AIR*,
   the gauge, *15/40*, the trend; *More ▸* drops the sky, the outlook, what the air does and what moves it over the column
   (it never pushes the board down).
6. **A stage A fix:** the header's z-index was 12 when its Narrator menu was closed, which put it over the area map
   (z 10) and hid the map's Close button (world-play.mjs). Closed it is `auto` now; open it is still 46.
