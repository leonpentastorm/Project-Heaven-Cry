# The skill "?" page, the level-up screen and creation's Skills step: redesign (the lead, 18 Nov 2026)

Leon: "look at the skill ? tabs and the level up screen, those screens are atrocious, objectively cave man UX."
Read from live 0.31.10 screenshots. This is a build spec: lane 1 of `ATTACK-PLAN-2026-11-19.md` builds it with the
wording files. Rules: CLAUDE.md "Say the core, once, and stop"; the client decides nothing; every box folds.

## What is wrong today (the same three faults on all three screens)

1. **Walls of sentences where a table belongs.** A skill is ten levels of gains; it is shown as paragraphs.
2. **The decision is buried.** On level-up the player came to spend points; the screen opens on a rules paragraph,
   a legend and eleven-line cards, and the thing to click is a small "+1".
3. **Everything is the same size and weight.** No level reads as "you are here"; no point reads as "this is the
   one you are about to buy".

## 1. The skill "?" page: a ladder, not an essay

One fixed layout for all 27 skills. Width as today; no scrolling inside at 1280x720 for a ten-level skill.

```
[portrait]  DURABILITY                      Endurance · FIGHT
            Opens Guard: plates that soak hits.        (one line: the door line, or the skill's one line)

  YOUR CALL · Name It      1 AP · reach 5              (gamma skills only: one row)

  LEVEL   YOU GET
  ● 1     +1 Guard plate · Opens Guard                 (filled dot: owned)
  ● 2     +1 Guard plate · Challenge
  ◐ 3     +1 Guard plate · Perk: Weight of the Wall or Answer in Kind      <- NEXT (highlighted row)
  ○ 4     +1 Guard plate · Fork: Provoke or Cover Them
  ○ 5     +1 Guard plate · Slam · Perk
  ...
  ○ 10    +1 Guard plate · Mastered: Last Wall
```

- **One row a level, one line a row.** Columns: a state dot (owned / next / locked), the level number, what you
  get. Per-point gains first, then that level's unlock, perk or fork, joined by " · ". No "EVERY POINT" block, no
  "AT 3 / 5 / 7" header, no dashes.
- **The next level's row is highlighted** (the attribute's ink, bold). Owned rows are bright, later rows dimmed.
- **A name in a row is a link:** hover (or click) a perk, fork option or unlock name for its one-line card with its
  icon; click the icon to enlarge. Perk icons sit at the row's right as today.
- **Feeds** (beta skills) is a chip in the header: "Feeds Guard: each plate soaks 7". Not a box.
- **Nothing else on the face.** The skill's voice quote and "AT HIGH LEVELS" lore fold under "About this voice",
  closed by default.
- Blocked level (attribute too low): the row's right side says "Needs Endurance 4", once.

## 2. The level-up screen: spend first, read second

```
LEVEL 9        12 Skill · 4 Attribute · 3 Perk steps to spend           [Finish later]   [Done]

[ BODY ] [ MIND ] [ SOUL ]                                (three tabs; one family on screen at a time)

ENDURANCE 4  [+1]    +15 max HP · +10% to ignore an injury       Skills up to 4
  Durability      0  [+1]   Opens Guard: +1 plate                      [?]
  Pain Threshold  3  [+1]   +10% elemental resistance · +2 max HP      [?]   ◆ Perk step waiting
  Senses          0  [+1]   +1 to spot hidden enemies                  [?]

STRENGTH 2   [+1]    +10% physical damage · +5 kg carried        Skills up to 2
  ...
                                                        CLASS · Skirmisher I   Rank II: Agility 5 (1 to go)  [▸]
```

- **The header is the budget**, always in view: what is left to spend, Finish later, Done. No rules paragraph, no
  legend (both behind one "?" in the header).
- **One family at a time** (BODY / MIND / SOUL tabs, the family with something waiting opens first). Three
  attributes, nine skills: fits 1280x720 without scrolling.
- **A skill is ONE row:** name, points, a big +1 (40 px), the one line the next point gives, "?" for the ladder
  page above. A row with something waiting (a perk step, a fork) carries a white chip; clicking the chip opens
  just that choice inline under the row: two cards side by side, one line each, Choose.
- **The class panel folds to one line** on the right ("Skirmisher I · Rank II: Agility 5 (1 to go)"); opened, each
  move is a name and one line.
- **After a +1 the row flashes what was gained** ("+1 Guard plate") for a second: feedback at the place clicked.
- A refused +1 shows its reason on that row only ("Needs Agility 5": with a button "Raise Agility" when the
  Attribute point is available).

## 3. Creation, the Skills step: the same rows

Same row as level-up (name, stepper, one line, "?"), in the three family columns it has today. The line is never
cut: one line, card style (`2026-11-18-wording-replacements.md` section 1 has all 27). Drop "Next point:", the
"Still to place" sentence and the family blurbs. The sticky Back / Next bar must not cover a card.

## Build notes

- Sources: `apps/web/src/templates/epccg.template.html` (the "?" page), `apps/web/src/screens/shared.js` (roadMap,
  nextLine, callBlock, feedBlock), `apps/web/src/templates/levelup.template.html`, `apps/web/src/screens/levelup.js`,
  the creation points template; texts in `data/skills.json` (`short` per row and unlock).
- The ladder rows come from one function (roadMap) returning, per level: state, the per-point card lines, the
  level's own lines with their kinds and ids. Both the "?" page and the level-up row's "next" line read it.
- Tests that pin today's layout: `skilltab.test.ts`, `create-points.test.ts`, `levelup-screen.test.ts`,
  `skilltext.test.ts`; suites `creation-points`, `skeleton-screens`, `pg-levelup`. Update them to the new layout as
  strictly (ten rows, one line each, the next row marked, no row over 90 characters).
- The lead looks at all three screens at 1280x720 and 1600x900 before it ships.

## 4. Addendum for 0.32's shapes (the lead, 19 Nov, after looking at lane 1's "?" page at 1280)

Leon: "with gamma and beta getting 4 perks and the forks having loads of text that UI will be a certified nightmare
if kept as is." Seen on the built page: the ladder table works; below it the perks are still cards of paragraphs
("The first time you are hit in each fight: if that hit took less than 20% of your max HP, the next hit...").
Four of those, twice, do not fit any screen. These rules replace the perk cards and the inline fork cards
everywhere a perk or fork is shown or chosen ("?" page, level-up, the sheet's Perks box).

1. **A perk is a row, not a card.** One table, one row a perk (two rows on an alpha, four on a beta or gamma):
   icon (click to enlarge) | name | **I**: one line | **II**: only what changes | state. No paragraph, no "Passive"
   tag, no hover box (the row is the whole text). State column: `—`, `I`, `II` as filled pips.
2. **The text must be written to fit, in data:** each perk tier has its card line (`short`), each fork option one
   line plus, only if it has one, a cost line. The page never truncates and never shrinks type: a layout test
   fails if any perk or fork row wraps at 1280. A line that cannot be said in one row means the perk is doing two
   things: the lead rewrites or splits it (the 0.32 sheets' card lines are the starting text).
3. **Choosing a perk step** (level-up): the same table, with one button on each legal row: "Take" (tier I) or
   "Upgrade" (tier II). Illegal rows are dimmed with their reason in the state column. One click, one confirm
   line under the table ("Take Numb? Kept for good." [Confirm] [Back]).
4. **Choosing a fork:** two columns, each: icon, name, the one line, the cost line if any, [Choose]. Nothing else
   in the panel. The other fork of the skill is not shown while this one is open.
5. **Many things waiting at once** (a level-3 all-in character: class, second fork, perk steps): the budget header
   carries a **TO CHOOSE** strip of chips in a fixed order (Class, then forks, then perk steps, each named with its
   skill). A chip opens its chooser as ONE centred panel over the screen, never as rows that push the page; the
   panel has "Next choice" when more wait. Done is lit when the strip is empty; "Finish later" stays.
6. **The ladder's repeated per-point gain** stays on every level (Leon's ruling) but is drawn dim after the first
   row, so the level's own thing is what the eye lands on.
7. Sizes: the type scale of lane 1 (15 px body, 13 px secondary). At 1280x720 a beta's whole "?" page (ten ladder
   rows, four perk rows, Mastered) fits without scrolling inside the panel.

The lead looks at: a beta "?" page, a level-up with a perk step open, a fork open, and three choices waiting, at
1280x720 and 1600x900, before any of this ships.
