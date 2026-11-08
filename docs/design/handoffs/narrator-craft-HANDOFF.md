# Narrator craft: HANDOFF (fix/narrator-craft, 8 Nov 2026)

Leon's playtest notes: the AI Narrator writes boring prose that repeats everything (it recaps the players' actions back at them and reuses its own phrases), it rarely places or moves the people it describes on the map, and it skips stages of the campaign. Before this change `RULES_PROMPT` was almost all mechanics, with one line on style.

This branch adds three prompt blocks, a set of engine-side checks with no extra model calls, and a live playtest harness. It was measured on Opus 5.5 (the Room's default model, effort medium) in three real runs of the M813 opening: before, after, and after one round of changes.

## 1. Prompt changes

All in `apps/web/src/narrator/context.ts`.

### New: CRAFT, PACING and THE MAP IS THE TRUTH

- **CRAFT** (395 words) and **PACING** come right after the opening line of `RULES_PROMPT`, ahead of THE SPLIT and all the mechanical sections.
- **THE MAP IS THE TRUTH** closes `RULES_PROMPT` and is also the `submit_turn` tool's description.
- All three are exported constants, so the tests can check them.

```
CRAFT (how you tell it)
- You are a great tabletop game master: the players' choices matter, and every answer shows what their choice changed. Be generous with concrete detail. Never take a decision, a line or an action away from a player's character: they say only the words their player wrote.
- Never recap. Don't restate what a player said or did, not even reworded as your opening ("You kneel by the stakes and ask...", "MPAT's shout carries over the field"): they know. Start from the consequence: the world's reaction, a new detail, an NPC's answer.
- Never repeat yourself. Each turn brings at least one new concrete sensory detail and one development (something changes, someone wants something, a clock moves). Don't reuse an image, simile, refrain or sentence opening from your last three turns; the turn carries your last two as RECENT NARRATION (already said). A running clock (engines, a countdown) or a character's tic (a count, a hum) shows up only when it changes, and differently each time.
- People speak. NPCs talk in direct quotes, each in their own voice: word choice, rhythm, and a want of their own. Fewer adjectives, more verbs.
- Never write: "the air is thick with", "a sense of", "you can't help but", "it seems", "suddenly", "little do you know", "the weight of", rhetorical questions to the players, or a closing sentence that sums up the mood.
- Length follows the moment. Most turns are quick exchanges: 40 to 120 words. Go past 150 only for a new place, a fight's aftermath or a big reveal (220 at most). Weave the players' beats together; don't give each one a paragraph that opens with their name.
- End on a concrete hook: a person waiting for an answer, a sound getting closer, a thing that just changed; not the same one as your last turn. Never "What do you do?".
- Bad (M813): "Rook, you kneel beside Seven-Seven and ask what it is counting. The air is thick with smoke and a sense of dread. Suddenly, the engines roar in the distance. What do you do?"
- Good: "Seven-Seven doesn't look up. 'Four hundred and twelve. Since the Colonel said hold.' The count stumbles when the pad's engines climb a note, then catches. Two bodies down, Lantern's grip on its chest plate tightens."

PACING (stage discipline)
- When the turn carries a MISSION block, play its open objectives in order, one beat per turn: the beat now is the first open required objective (an optional one when the players walk into it).
- Never skip a beat, jump time, or resolve an objective the players haven't reached by their own actions. "We carry everyone east" starts that beat; it doesn't finish the ones before it: show what stands in the way (the unsorted row, the question still unanswered).
- Never end a scene (endScene, travel, a new sceneTitle) while the MISSION block's open required objectives here are still open, unless travelling is the objective.
- When players stall or wait, don't advance for them: an NPC presses, two or three concrete options tied to the open objective come into view, or the clock costs something small. The decision stays theirs.
- One new threat at a time: don't start a fight or bring new enemies the players haven't walked into or provoked, unless the open objective calls for it.

THE MAP IS THE TRUTH (check before you call submit_turn)
1. Every person you name or who speaks is on the map: a token in PEOPLE AND ENEMIES ON THE MAP, a character, a map object that stands for them, or one you place now with npcs[] (place: name, at, side, tier, weapon). Someone only mentioned as elsewhere needs nothing.
2. Anyone who moves in your prose moves on the map: npcs[] move (id, at) for people; moves[] for characters the story moves (actions[] when a player declared it).
3. Anyone who leaves the scene is removed: npcs[] remove.
4. A fight you start lists the enemies you described (combat.enemies); hostile tokens already on the map join it.
5. Objectives the players achieved this turn are marked in missions[].
```

### Lines replaced or trimmed

| Where | Before | After |
| --- | --- | --- |
| TURNS | "Address every player's action in your narration; …" | "Answer every player's action through its consequence (CRAFT); …" |
| TURNS | "narration: second person plural …, vivid and specific. **90 to 220 words.** … End on something the players can act on." | "narration: second person …, specific. Length and ending as CRAFT says. …" (the old 90-word floor pushed every turn to about 200 words) |
| MISSIONS AND PACING | "Keep them in mind every turn and **move the story toward them**; …" | "Play them as PACING says; …" |
| MISSIONS AND PACING | "When players stall, repeat themselves or ask what to do, name two or three concrete options …" | "If players stay confused after PACING's in-character options, or anyone asks OOC, answer plainly in ooc." |
| THE OVERWORLD | "Every person the party can see or reach stands on the map as a token: when you introduce someone, place them with npcs[] in the same turn. …" | "A person who is only in your prose can't be talked to on the map, followed, or attacked (THE MAP IS THE TRUTH, below)." |
| Opening job | "… add hooks, and end on a clear prompt." | "… place everyone you name on the map (npcs[]), add hooks, and end on a concrete hook." |

The world rules (the Unspoken Name, in-universe language, the Knowing, tone) are unchanged.

## 2. Engine-side checks (`apps/web/src/narrator/craft.ts`, no model calls)

- **RECENT NARRATION.** Each turn carries the last two narrations, marked "already said", each capped at 1,100 characters.
  - The same two entries in RECENT TRANSCRIPT become a pointer ("[Narrator] (in RECENT NARRATION below)"), so they aren't sent twice.
  - Under them, two lists computed from the last three narrations: **REPEATED ACROSS YOUR LAST TURNS** (4-word phrases used in two or more of them) and **OPENINGS YOU KEEP USING** (two-word sentence openings, ignoring dialogue).
- **LAST TURN.** The engine reads the last narration against the map and against the turn that produced it. When something doesn't match, the next prompt gets a "LAST TURN (the map is the truth; fix it in this turn)" block. Three cases:
  - **Named but unplaced.** Someone is named but has no token, no character of that name and no map object named for them. Line: "you named X but didn't place them; place them now … or say they aren't here." It counts as a name when:
    - a title comes before it (Sergeant, Chief Engineer, Colonel …);
    - it is a quoted speaker ("…," says X / X says, "…");
    - it is a campaign cast member or a remembered person mentioned outside dialogue.
  - Names inside quotes are ignored ("Tell the Colonel"), and so are the characters themselves.
  - **Moved but unmoved.** A movement verb follows a person ("Keel walks", "Ilse Varga heads", "MPAT, you step") but the turn has no matching `npcs[]` move/remove/place, or no `moves[]`/move action for a character. Possessives don't count ("Keel's hand moves"), and neither does a character whose player moved them since the previous narration.
- **Where it plugs in.** Both providers (`anthropic.ts`, `providers.ts`) call `rememberTurn(g, turn)` when a turn comes back.
  - The movement check needs that record. It is keyed by room code and matched on the narration text, so after a reroll or a page reload the movement check stays quiet rather than guess.
  - The named-but-unplaced check needs only the game state.

## 3. Counts, before and after

**Setup:**
- Same seed, same room code, same player script. Ten Narrator turns each run.
- The M813 opening and the Shield Line mission, with two players (MPAT, Rook).
- The live harness is `apps/web/src/narrator/live-playtest.test.ts`. The key is read from a file at run time, and the run is skipped without one.
- Transcripts are in `narrator-craft-transcripts/` (`.md` to read, `.json` with every turn field).

**How each row was counted:**
- Repeated 4-grams, repeated openings, word counts and filler were counted by the harness's counter (`PHC_LIVE_COUNT=run.json`).
- Recaps, unplaced names, movement and pacing were counted by hand, sentence by sentence.

| | Before | After, pass 1 | After, pass 2 (final) |
| --- | --- | --- | --- |
| Recaps of player actions (sentences restating what a player said or did) | **12** | 3 | 2 |
| Paragraphs opening "MPAT, …" / "Rook, …" | **16** (8 of 10 turns) | 1 | 0 |
| Repeated 4-word phrases vs the previous 3 turns (turns affected) | 15 (6 turns) | 5 (2) | 2 (2) |
| Repeated sentence openings vs the previous 3 turns | 32 | 9 | 8 |
| Turns with the engine-clock refrain ("East, the engines climb …") | **7** | 3 | 3 |
| Turns that close on the drones | 5 | 3 | 2 |
| Named but not placed | 1 (the cast in the opening; placed only in turn 2) | 0 (5 placed in the opening) | 0 (3 placed in the opening) |
| Movement in prose without a map move | 1 | 1 (MPAT "finds the top of a stake") | 0 (MPAT onto the stake with `moves[]`) |
| NPCs moved on the map by the Narrator | 0 | 1 (Soft-Hands), 1 drone | 1 drone placed and moved |
| Skipped objectives / time jumps | 0 / 0 | 0 / 1 (the sort told as a short montage after a failed check whose stakes said "slowly") | 0 / 0 |
| Story advanced for the players on a stall ("We wait") | **1** (Nine-Nine decides, drones attack unprovoked) | 0 (options, a radio clock) | 0 (options; a robot dies while they wait) |
| New threats nobody provoked | 1 (3 new drones after the fight was won) | 0 | 0 |
| A player character given words | 0 | 0 | 1 (Rook says "This one walks.") |
| Banned filler / rhetorical questions / "What do you do?" | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 |
| Words per narration, average (range) | 204 (188–221) | 182 (124–237) | 167 (134–213) |

Opus wasn't using the filler phrases even before. The real problems were:
- the recap-led "MPAT, you … / Rook, you …" structure;
- refrains (the engine clock, the drones as the last line);
- unprovoked escalation on a stall.

All three dropped sharply. After the change the Narrator also places the cast in the opening, moves NPCs (Soft-Hands to I6, a drone from D6 to E6), places the drones when the players look for them, and moves a character with `moves[]` when its prose puts MPAT on the stakes. LAST TURN didn't fire in pass 2, because nothing was unplaced. The repeat lists did fire, and the Narrator retired the flagged phrases.

## 4. Token cost per turn

`callEstimate`, M813 a few rounds in, two characters (`apps/web/src/narrator/craft-cost.test.ts` prints it):

| | Stable (cached) | Turn (uncached) | Warm call, Opus 5.5, 8k reply budget |
| --- | --- | --- | --- |
| Before | 21,076 tokens | 2,347 tokens | $0.1736 |
| After | 22,346 tokens (+1,270) | 2,494 tokens (+147, +6%) | $0.1744 (+$0.0008) |

- **Turn tokens.** The +147 is the RECENT NARRATION header and the repeat lists. The narrations themselves move out of the transcript, so they aren't paid for twice.
- **Stable tokens.** The +1,270 is CRAFT, PACING and the map checklist, sent twice: once in the rules, once in the tool description. At cache-read prices that is about $0.0003 a turn, plus about $0.01 once per cache write.
- **Real runs** (10 turns each, actual API usage):

| Run | Total | Average turn after the opening | Average uncached input | Average output |
| --- | --- | --- | --- | --- |
| Before | $0.96 | $0.074 | 5,519 tokens | 2,293 tokens |
| After, pass 1 | $1.03 | $0.079 | | |
| After, pass 2 | $0.94 | $0.071 | 5,564 tokens | 2,115 tokens |

All live testing (three runs) cost about $2.93.

- **Budget test.** `faith-context.test.ts` caps the stable size. The cap moved from 21,600 to 22,800 tokens, with a note.

## 5. Temperature

Unchanged in both providers:
- **Anthropic.** No temperature is sent, so the API default of 1.0 applies. That is already the top of Anthropic's range, so there is nothing to raise, and leaving it alone avoids clashing with the effort setting.
- **OpenAI-compatible.** No temperature is sent. OpenAI, Gemini and DeepSeek default to 1.0, and Ollama to 0.8.
  - Raising it would risk the tool calling of small local models.
  - Reasoning models refuse the parameter outright, so sending it would cost an extra round trip.
- The prose problems came from the prompt, not from sampling: the "before" run already varied its wording; it repeated by structure.

## 6. Tests

- `apps/web/src/narrator/craft.test.ts` (11 tests):
  - block order; CRAFT size and content; PACING; the tool description carrying the map checklist;
  - the repeat window (the last two narrations, the transcript pointers, repeated phrases and openings);
  - named but unplaced (titled names, speakers, cast; placed, POI and in-dialogue names not flagged; characters never flagged);
  - moved but unmoved (an NPC with and without `npcs[]` move; a character with and without `moves[]`; possessives; quiet without the remembered turn).
- `npm test -w @phc/web`: 44 files and 331 tests passed; 2 skipped (the live harness and its counter, which need a key or a transcript). `npm test -w @phc/engine`: 1,447 passed.
- `npx tsc --noEmit` in `apps/web`: clean.
- `npm run build`: clean.
- On the dev server (port 8787), with the scripted test provider:
  - `node apps/web/e2e/two-players.mjs`: passed, no errors.
  - `node apps/web/e2e/missions.mjs`: all ok, no errors.

## 7. What still goes wrong

1. **Length.** The final average is 167 words. Opus still writes 130 to 200 words for quick exchanges (the stall turn ran to 157), despite "40 to 120". Fixing this needs a harder rule, or a length cap the engine checks and reports in LAST TURN, the same way it reports names.
2. **Recaps survive as a subordinate clause.** For example, "The shout goes out over the mines anyway, and Rook's plates crack together behind it". These are much rarer and no longer lead the turn.
3. **Player characters given lines.** In pass 2 Rook was given a line during a failed check. The CRAFT line now says "they say only the words their player wrote". That last wording was added after the final run and hasn't been tested live.
4. **Stalls.** PACING allows "the clock costs something small". In pass 2 a broken robot died while the players waited. That is defensible in this tutorial, because the death is an NPC's, but Leon may want "small" defined.
5. **Character tics.** Seven-Seven's count and Hum's "four up, three down" still come back most turns. The numbers move on, so the repeat check doesn't catch them. The CRAFT line on tics helps only partly.
6. **What the name detector misses.** It is heuristic. It doesn't catch untitled first-time names that appear only as plain subjects ("Dace", inside dialogue, at a POI), and it can't tell "mentioned as elsewhere" from "present" outside quotes. The LAST TURN wording ("or say they aren't here") keeps a false alarm cheap.
7. **Script coverage.** The 10-turn script never reached "We pick everyone up and carry them all east" (round 8 of the script, after checks used up turns). The skip-a-beat rule was only tested by the stall. A longer run (`PHC_LIVE_TURNS=14`) would test it.

## Running a live playtest

```
PHC_LIVE_KEY_FILE=/path/to/file-with-key PHC_LIVE_OUT=/tmp/run.json [PHC_LIVE_TURNS=10] [PHC_LIVE_MODEL=claude-opus-5-5] \
  npx vitest run src/narrator/live-playtest.test.ts -t plays        # in apps/web; about $1 on Opus 5.5
PHC_LIVE_COUNT=/tmp/run.json npx vitest run src/narrator/live-playtest.test.ts -t count --reporter=verbose
PHC_LIVE_KEY_FILE=scripted …                                       # a dry run of the player script, no API
```
