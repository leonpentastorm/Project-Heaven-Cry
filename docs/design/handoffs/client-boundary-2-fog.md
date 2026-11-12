# Client boundary 2: fog of war in the engine (engine review 4, finding 4)

12 Nov 2026. Before this, `viewFor` sent every unseen hostile to every player (id, name, tile, HP, weapon, AP) and the
browser hid it: in co-op, and in a Proving Ground team fight, the other side's positions were in every guest's memory.
Now the engine sends each player only what their side sees, and the client draws what it is given.

Pins first: `packages/engine/test/fog-view.test.ts` was committed on the old code (commit `04ea1b3`, "Fog pins") and
then turned into the new expectations. Spec: the Vision section's "What a player is sent", and item 1600 (what is open).

## What a view of a fight holds

| Viewer | Units | Turn order | Other side's glyphs, traces, zones, False Images | fx | `cb.fog` |
| --- | --- | --- | --- | --- | --- |
| A guest | its side, the dead, and the hostiles its side sees | every unseen hostile is `'?N'` (N: its place) | only on tiles its side sees (a zone: only its tiles in sight) | the unseen's id `'?'`, name `'Unseen hostile'`, tiles null; a hostile's walk cut to what was seen | `{ tiles, sensed }` |
| The host, AI Narrator | the same as a guest (the host is a player; its browser holds the whole game in `hostState`, as it must to run it, and the AI Narrator reads that) | same | same | same | same |
| The host, human Narrator ("I'll narrate") | everything | everything | everything | everything | `{ tiles, sensed, full: true }`: the players' sight, for shading |

- **Sensed** (spec: Vision, Sensory): a tile in `cb.fog.sensed`. No id, no name, no HP, no intent.
- **Hidden** units are unseen units: absent, wherever they stand.
- A **False Image** of an unseen owner is sent with `owner: '?'` and `look: { name, short, img, kind, side }`: the
  decoy wears its owner's face (that is the trick), never its id or its tile.
- Every other reference to an unseen unit (another unit's grapple, `lastHitBy`, a glyph's drawer, the AI's fire record,
  `sighted`) is `'?'`; a key that is one (`fxHp`, `faithRoundHp`, `feelDmg`…) is dropped. `lastSeen`, `sightWas`,
  `sightPos` are never sent.
- **Music**: the view carries `music.view`, `musicFor` worked out on the whole game (an elite once seen keeps Heaven
  Falls playing after it slips into the fog, as before).
- What `viewFor` already hid stays hidden (the Narrator's notes, the loot log, unspotted traps, another side's rigged
  tile, hidden objects).

## The one function

`packages/engine/src/fog.ts`, `fogFight(g, real, view, me, full)`, called once by `viewFor` (`game.ts`). It decides
everything above from the side's sight now (`visibility(cb, me)`, asked on a copy of the units so the host's live fight
is never written). The fx rule, per event:

1. `only` another side, or a turn/stance the side didn't see (`sightOwn`): as before.
2. **A hostile's walk** (`move`): cut to the part its `sight[me]` marks seen, plus one fog-edge tile each way (the tile
   the client walks it in from and out to); never seen: dropped.
3. **`sight`** (into, out of, hidden from this side's sight): kept; it is this side's own record.
4. **A turn or stance this side didn't see**: its `at` is null.
5. **Any other event that names an unseen unit** (anywhere in it): the id is `'?'`, the unit's name `'Unseen hostile'`
   (unless a seen unit has the same name), every tile the side doesn't see null (dropped from a list).
6. HP stamps (`hp: { id: [was, now] }`) of unseen units are dropped; the viewer's own wounds stay.

So a shot from the fog arrives as `{ k: 'shot', unit: '?', from: null, to: <your tile>, target: <you>, hp: {...} }`:
the client plays the hit on you and draws nothing where the shooter is.

## The log (item 1600 a; closed 12 Nov 2026, later the same day)

Every line of `cb.log` is written by one primitive, `packages/engine/src/log.ts` (re-exported by `combat.ts` and
`kit.ts`): `say(cb, ...lines)`, `sayOf(cb, ids, line)` (units given by id; `[]` names nobody: the Narrator's own words),
`sayAt(cb, i, line)` (the top of the log: a wave's header) and `unsay(cb, i)` (a refused call or technique). All 266 raw
`cb.log.push` sites were converted (mechanically: the text is the same, so the golden tables did not move);
`test/lint-foundations.test.ts` "the fight log is written through say()" fails on a raw `push`, `unshift` or `splice` on a
log anywhere but `log.ts` (memory.ts's thread logs are not a fight's).

- **What is recorded.** `say` finds the units a line names by their names (`unitsNamedIn`, `combat.ts`: longest name
  first, word boundaries, so "Raider 2" is not "Raider") and asks, for each side, whether that side sees each one **now**
  (`sideSeesUnit`; on its side, or dead, counts as seen). The answer is kept beside the line in `cb.logSee` (a parallel
  array; trailing 0s are not kept, so a fight where everything is in sight carries none): `0` every side may read it,
  else `{ pc?, foe? }` with `0` (that side saw none of the units it names) or `{ n: names, t: tiles }` (the names that
  side didn't see, and their tiles then, as `refOf` and `x,y`). Never recomputed later: a hostile that walks into sight
  does not bring its old lines. A preview's copy writes no marks (`logQuietly`, `preview.ts`).
- **The initiative line** names every unit; `sightQuietly`'s set-up (who starts Hidden) re-marks it (`remarkOpening`).
- **What a player is sent** (`fogLog`, `fog.ts`): a line with no mark for its side, whole; a `0`, not at all; a list,
  with each name as "something unseen" ("Something unseen" at the start of a line) and each tile as "somewhere unseen".
  The fx's `L` (lines before it) is moved to count the lines sent. `logSee` itself is never sent (nor to the human
  Narrator, who gets the whole log).
- **Old saves**: no `logSee`: every line is sent, as before.
- **Replays**: `cb.logSee` is new state, so the replay hashes were re-recorded once, on purpose (the action streams were
  the same in all eight; only the state moved).

**Still unconverted / not covered:** nothing pushes raw any more, but a line is only as good as its names: one that
says "the drone" or "it" instead of the unit's name is every side's; a line that names a tile and no unit (a trap at
F4 no one saw sprung) is every side's. Lines marked with `sayOf(cb, [], …)` (the Narrator's words, the Narrator's
"skip") are every side's on purpose.

## What the client does now, and must never do again

- `apps/web/src/screens/combat.js`, `screens/main.js`, `game/fx/play.ts`, `game/turnIntro.tsx` draw every unit the view
  holds. Their sight (for shading, the "out of sight" note, the effects layer's `visible()`) is `fightSight(cb)` from the
  engine, which reads `cb.fog`.
- Deleted: `seenFoe` and every use of it, `seenGlyph`'s sight test, the glyph, trace and pattern tiles' sight filters, the sight
  arguments to `strokeLayer`, `placedView` and `classMarks`, the sensed lookup by unit id, `main.js`'s seen-units filter,
  the turn banner's and the effects layer's own `visibility()` calls.
- The turn bar shows an unseen hostile's place as a blank card ("Unseen hostile", "?"); its turn reads HOSTILES ACTING,
  "Something moves out of sight".
- A hostile walking **into** sight is in the view at its end tile and its move event starts at the fog edge: drawn as
  before. One walking **out** of sight is gone from the view: the effects layer keeps its last token copy (`lastTok`,
  kept while in a fight) and its stand-in (`holdMovers`) so the walk into the fog still plays.
- `apps/web/src/game/boundary.test.ts` fails if any client file calls `visibility(`, names `seenFoe`, tests
  `.seen.has(x.id)` / `.sensed.has(x.id)`, or passes a sight filter to `strokeLayer`, `placedView` or `classMarks`.

The client must never: compute sight to decide what to draw; filter units, glyphs, zones or effects by sight; or assume
every unit of the fight is in `cb.units` (an id in `cb.order` or an fx event may be `'?…'`: `isUnseenId`).

The engine's previews still run in the browser on the view the player holds, so a guest's preview no longer knows of
units it can't see (a move into an unseen hostile's tile looks open until the engine refuses it). That is the fog
working, not a bug.

## How to add something a player must not see

1. If it is a unit, or a field that names one by id: nothing to do. `fogFight` drops unseen units and replaces their
   ids anywhere in the fight with `'?'` (and drops keys that are their ids).
2. If it is a new thing on the grid that belongs to a side (like glyphs, zones, False Images): add its list to the
   destructuring in `fogFight` and keep it for `me`'s side, and for the other side only on tiles in `vis.tiles`.
3. If it is a new fx event: name the units it is about by id (`unit`, `target`, …) and put tiles in fields as `'x,y'`
   strings. Rule 5 then takes the unseen out. If it is for one side's eyes only, set `only: side`. A walk must carry
   `sight` (`moveFx` does).
4. If it is a secret that is not about sight (a Narrator's note, another side's plan): filter it in `viewFor` by
   `playerId` as the notes and the loot log are.
5. Add a line to `packages/engine/test/fog-view.test.ts` that searches the guest's serialised view for it.
6. Never add a filter on the client. If a screen needs to know whether something is seen, add it to `cb.fog` in
   `fogFight` and read it through `fightSight`.

## Tests

- `packages/engine/test/fog-view.test.ts`: the guest's serialised view holds no unseen hostile's id, name or tile; the
  host with an AI Narrator gets the same; the human Narrator gets everything plus the players' sight; sensed is a tile;
  the turn order's marks; the other side's glyph, field and False Image; the fx cuts; it appears the moment it is seen;
  the view never writes on the host's game; the music; the log (a line never seen is not sent, the unseen in a sent
  line is "something unseen", the seeing side and the human Narrator get it whole, sight is the sight when it was
  written, fx `L`, an old save, `sayAt`/`unsay`).
- `apps/web/src/game/boundary.test.ts`: the lint above. `apps/web/src/game/turnIntro.test.ts`: an unseen hostile's
  banner from the fogged view. `apps/web/src/game/fx/ranged.test.ts` R6: a Hidden foe's events, as `fogFight` sends
  them, draw nothing.
- `apps/web/e2e/two-players.mjs`: every 20 loop steps, the guest's whole view (log and fx included) must not name a
  living hostile it doesn't hold, must hold no log line the host's truth marks as unseen by the players' side, and every hostile it holds must stand on a tile in its `cb.fog`; it checks against
  the host's whole game (`window.__phc.truth()`, a test hook that returns `hostState`, null on a guest).

## What is not done

- Log lines that refer to a unit by something other than its name (above).
- A walk seen at both ends sends its middle through the fog (item 1600 c).
- The other side's zones are forgotten when they slip out of sight (item 1600 e).
- The review's section 7 (send the static part once, bound `cb.log` in the view): not touched.
