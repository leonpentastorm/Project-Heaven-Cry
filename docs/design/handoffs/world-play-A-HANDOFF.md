# World Play 1.0, part A hand-off (engine, data, Narrator) → part B (web)

Branch `feature/world-play`, 8 Nov 2026. Spec: `docs/design/world-play-spec.md`; rules: `docs/rules/PHC-Core-Rules-v1.0.md` section **World Play (rules revision 1.7)** and section 14 items **636–670**; decision **105**.

Everything below is exported from `@engine` (`packages/engine/src/world.ts`, `hazards.ts`). All helpers are pure, deterministic and work on a **player's view** (`viewFor`) as well as the full state. Part B renders; it never computes a rule.

## 1. State (what is on `GameState`)

| Where | Field | Shape |
|---|---|---|
| `g.story.npcs[]` (`Npc`) | `kind?` | `'human' \| 'robot' \| 'drone' \| 'crawler' \| 'beast' \| 'machine'` (also the older `KINDS`) |
| | `avatar?` | an art id (`char-…`, resolve with the web's `ART(id)`). Set on every Narrator/tool place; old tokens: use `avatarOf(g, n)` |
| | `wants?`, `wantsShown?` | string; shown once asked. **In a view** an unasked want is `wants: ''` + `wantsHidden: true` |
| | `knows?`, `informed?` | `{ objective, hint, at? }`; **in a view** until told: `{ objective: '', hint: '' }` |
| | `talk?` | `Approach[]` (below) |
| | `ally?`, `alerted?` | booleans (`npcView().side` reads `'ally'`) |
| `g.characters[id].carried?` | | `{ npc: Npc (no pos), kg: number }[]`; counts in `carriedKg(c).pack`, so `overweightKg`/`movement` already include it |
| `g.story.objects[]` (`MapObject`) | `items?` | `CacheItem[]` (`{ item, qty, rarity?, name?, text?, note? }`). **In a view**: `items: []` + `itemCount: n` |
| | `searched?`, `jam?` | emptied; locked for scene number `jam` |
| `g.story.hazards[]` / `g.combat.hazards[]` | `Hazard` | `{ id: 'hz…', kind, severity: 'light'\|'heavy', zone, tiles: string[] (keys), name?, text?, hidden?, spent?: string[], safe?: string[], exposure?, approaches: Approach[] }`. **Views drop hidden ones.** In a fight read `g.combat.hazards` (use `liveHazards(g)`) |
| `g.story.triggers[]` | `Trigger` | **never in a view** |
| `g.story.events[]` | `WorldEvent` | Narrator only; **never in a view** |
| `g.combat.dropped[]` | | `{ npc, at, by }`: what a Downed carrier dropped mid-fight (draw them as lying tokens; they return after the fight) |
| `g.story.missions.where` | | `Record<'mission/objective', { zone?, refs?: string[] }>` |

`Approach` (objects, hazards, people): `{ label, skills, tn, stakes, success, fail?, objective?, failCondition?, failItem?, pick?: 'best', gone?, tries[] }`.
- `success`: `'' | remove | open | reveal | disarm | loot | advance | ally | inform | safe` (`safe`: a hazard's safe path).
- `fail`: `'' | hurt | alarm | condition | jam | lose | hostile | hazard` (`hazard`: a failed disarm gets you).
- `pick: 'best'`: rolls the better skill (hazard approaches: "Vigilant or Sensory"); label it "A or B".
- `gone`: jammed away; hide it.

## 2. Actions (through `apply`, as the player who owns the character)

| Action | Args | Cost / rule |
|---|---|---|
| `world/act` `act: 'carry'` | `charId, targetId` (token id) | 1 AP, adjacent, token seen and not hostile (or prisoner, or 0 HP) |
| `world/act` `act: 'put_down'` | `charId, targetId` (the carried token's id), `to?` (grid ref or key; empty: nearest free) | 1 AP, adjacent free tile |
| `world/act` `act: 'search'` | `charId, objId` | 1 AP, adjacent, not locked/jammed, not empty |
| `world/act` `act: 'attempt'` | `charId, objId` or `targetId`, `idx` (0-based) or `index` (1-based) | = `poi/try` |
| `world/act` `act: 'ask'` | `charId, targetId, what: 'wants' \| 'objective'` | = `talk/ask` |
| `poi/try` | `charId, objId, idx` | **any target**: object, hazard id or token id. 2 AP; object/hazard within 1 tile, person within 3. Creates a pending check (`check/roll`, `check/accept` as before); in the Proving Ground it rolls at once |
| `talk/ask` | `charId, npcId, what` | 1 AP, within 3, seen; refused (no cost) with nothing to say |
| `talk/try` | `charId, npcId, idx` | the person's talk approach (2 AP), like `poi/try` |
| `combat/search` | `unitId, objId` | 1 AP of the unit's turn, adjacent |

Results land by themselves (rubble, unlocks, loot into the pack, objective done, safe lane, side changes, hurt, conditions, alarm, jam, lost item). Each try and ask also posts a `player` line and calls the Narrator at round close.

Carrying, put down, attempts and asks are **area-map only**; a fight refuses them ("Deal with it after the fight."). Search works in both.

### Proving Ground tools (host, or everyone with "Everyone can spawn"; gearing up only)

| Action | Args |
|---|---|
| `sandbox/cache` | `at, items: CacheItem[], name?, text?, locked?, approaches?` |
| `sandbox/hazard` | `kind, severity?, tiles?: string[], rect?: {from, to}, hidden?, name?` · or `remove: hazardId` |
| `sandbox/trigger` | `when: 'enter'\|'examine'\|'objective', tiles?, rect?, objId?, objective?, then: 'spawn'\|'fight'\|'reveal', spawn?: npcs[] place shapes, difficulty?, name?, reveal?: ids, text?` · or `remove` |
| `sandbox/npc` | `name, at, side?, kind?, avatar?, tier?, weapon?, hidden?, wants?, knows?: {objective, hint, at?}, talk?: approaches, prisoner?` |
| `sandbox/objective` | `id, text?, where?: {zone?, refs?}, status?: 'open'\|'done'\|'failed'` (lives in a "Drill" mission: `drill/<id>`) |

Each tool logs a `⚙` line with the new id in brackets (`[hz12]`, `[o9]`, `[n14]`) for e2e tools.

## 3. View helpers (signatures and return shapes)

```ts
npcView(g, tokenId, charId?) => null | { id, name, kind, avatar, side: 'hostile'|'neutral'|'ally', tier, pos, ref, prisoner, carryable,
  wants: string|null, hasWants, knows: { objective, hint } | null, hasKnows, talk: TalkOption[] }
talkOptions(g, tokenId, charId?) => TalkOption[]          // the two asks (if they have wants/knows), then talk approaches
approachOptions(g, targetId, charId?) => TalkOption[]     // objects, hazards or people
TalkOption = { kind: 'ask'|'approach', what?: 'wants'|'objective', idx?, label, ap, skills?, tn?, success?, fail?,
  odds?: 0..1 (charId's chance), mod?, tried?, available: boolean, why?: string }
previewOdds(g, c, skills, tn, pick?) => { skills, mod, chance }
hazardTilesFor(g, viewer: 'pc'|'foe'|'all' = 'pc') => { id, kind, severity, name, tile, safe, spent }[]   // one per tile; no hidden ones
hazardsFor(g, viewer = 'pc', charId?) => { id, kind, severity, name, text, tn, tiles, safe, spent, approaches: TalkOption[] }[]
markersFor(g, viewer = 'pc') => Marker[]   // [] in a fight
Marker = { id, kind: 'objective'|'hint', objective: 'mission/objective', text, tile, ref, target?: { type: 'token'|'object'|'hazard'|'tile', id }, from?: npcId }
hereCard(g, viewer = 'pc') => { zone, zoneName, objectives: HereObjective[] }   // at most 3
HereObjective = { key, mission, id, text, optional, here: boolean, zone, zoneName, markers: Marker[], steps: string[] }
cacheView(g, objId) => null | { id, name, kind, pos, ref, count, empty, locked, searched, approaches: number }
carriedOf(c) => { id, name, kind, avatar, kg, side, tier }[]
avatarOf(g, { id, name, kind?, avatar?, portrait? }) => string   // '' for beasts: draw the kind badge
kindKg(kind), carryable(npc), isCache(obj), liveHazards(g), zoneHazards(g, zone?)
Constants: WORLD_AP { carry 1, put_down 1, search 1, ask 1, attempt 2 }, TALK_RANGE 3, FAIL_HURT, AVATAR_POOLS, HAZARD (defs), HAZARD_KINDS, hazardTn(h)
```

Web notes:
- **Faces:** render `npc.avatar` (or `avatarOf`) through `ART`; don't run `castMany` over a token that has an avatar (it recasts from the player-card pool). Badge from `kind`.
- **Hazards:** draw from `hazardTilesFor(view, 'pc')`; `safe` tiles get the safe-path look, `spent` mines a crater. Hidden ones are absent from the view already.
- **Markers / HERE:** `hereCard(view)` and `markersFor(view)`; a hint marker carries `from` (the person who told it).
- **Carried:** `carriedOf(me)`; Put down = `world/act put_down`; weight is already in `carriedKg`.
- **Cache:** `isCache(o)`; the view has `itemCount`, not the items.
- **Typed attempts** from the Narrator come as pending checks with `poi.kind` (`'obj'|'hazard'|'npc'`); the existing "Roll it" popup works, keyed by `poi.objId`.

## 4. FX events (in `g.story.fx` on the area map, `g.combat.fx` in a fight; same envelope `{ n, k, ... }`)

| `k` | Payload |
|---|---|
| `carry` | `unit` ('pc-<charId>'), `target` (token id), `from`, `name`, `kind`, `avatar`, `kg` |
| `put_down` | `unit, target, at, name, kind, avatar` |
| `drop` | `unit, target, at, name` (a Downed carrier, both places) |
| `search` | `unit, at, obj, items` (count) |
| `hazard` | `target` (unit id), `at, id, kind, severity, dmg, saved?, cond?, attempt?, spent?, immune?` |
| `hazard_spotted` | `id, kind, at, tiles, by?, how: 'vigilant'\|'stepped'\|'reveal'` |
| `hazard_placed` | `id, kind, severity, tiles` (seen ones only) |
| `hazard_gone` | `id, tiles, why: 'removed'\|'disarmed', by?` |
| `safe_path` | `id, tiles, by` |
| `trigger` | `id, then, at, spawned: ids` (after it fired) |
| `alarm` | `at, by, revealed: ids` |
| `approach` | `unit, target, kind: 'obj'\|'hazard'\|'npc', at, label, ok, effect` |
| `talk` | `unit, target, what` |
| `marker` | `from, objective, tiles` |

Existing events still fire around them (`move` segments stop at a hazard tile, `hurt`, `cond`, `down`).

## 5. Numbers (all provisional; `data/world_play.json`)

- Carry weights: robot 40, drone 15, human 70, crawler 70, beast 80, machine 40 kg (others 70). Overweight rules unchanged (item 638 flags it).
- AP: carry 1, put down 1, search 1, ask 1, attempt 2. Talk range 3 tiles.
- Failed hurt by TN: 8 → 10, 12 → 20, 16 → 35, 20 → 50 (Physical, armour applies). Reveal radius 3.
- Hazards: minefield 25/45 (Body save halves, armour, mine spent, stops), fire 10/20 + Burning (no armour), radiation 5/10 + Weakened from the 3rd tile (no armour), gas Heart save or Shaken/Stunned (Stunned stops), collapse 20/35 + Prone (armour, stops). TN 12 light / 16 heavy. Spot range 2.
- Limits: 64 tiles a hazard, 12 hazards and 16 unfired triggers a zone, 6 spawned, 12 cache entries, 4 talk approaches, 3 HERE objectives, 20 events.

## 6. Decisions where the spec was silent (each is a section 14 item)

636 weights · 637 who can be carried, area map only · 638 overweight while carrying (playtest) · 639 in a fight: no put down; Downed drops to `combat.dropped` · 640 the Narrator's carry/drop are free · 641 caches show a count, search in fights · 642 each approach once per character · 643 reveal radius 3; open leaves a cache searchable · 644 disarm takes hazards on its tile · 645 alarm is zone-wide and wakes the unaware · 646 failed conditions: story-carried ones for the scene, others on the area map · 647 jam · 648 lose · 649 which effects work on people · 650 hazard TNs and armour · 651 what stops a walk; radiation's count · 652 "Perception or Vigilant" read as the better of Vigilant and Sensory · 653 the safe-path lane · 654 a failed disarm · 655 which hazards can hide; spotting · 656 limits · 657 enemies and tokens vs hazards · 658 triggers on the area map only · 659 the Narrator's moves walk the path · 660 talk range and hidden words · 661 allies · 662 markers · 663 the HERE card · 664 where · 665 1-based attempt index · 666 avatar pools · 667 lurkers start story fights Hidden · 668 the Proving Ground · 669 events for the Narrator · 670 the tool stays stable.

## 7. The Narrator (apps/web/src/narrator/context.ts)

- `submit_turn` gains (all optional, fixed vocabularies, the tool is byte-identical all session): `npcs[]` `carry`/`drop` + `charId`, `kind`, `avatar`, `wants`, `knows`, `talk`; `objects[]` `items` and approach `fail`/`objective`/`failCondition`/`failItem` (success adds loot, advance, ally, inform); `hazards[]`; `triggers[]`; `missions[]` `where` (status now optional); `actions[]` `carry`, `put_down`, `search`, `attempt` (`index`), `ask` (`what`).
- RULES_PROMPT: THE MAP IS THE TRUTH gains section 10's lines (6–8); PACING gains "Plain objectives" and "Typing can't skip a check"; the mechanical sections describe the fields; CRAFT is untouched.
- The turn prompt adds people's kind, wants, knows and talk with tries, cache contents, approach effects, HAZARDS ON THE MAP, TRIGGERS SET, CARRIED and SINCE YOUR LAST TURN (triggers fired, hazards hit, approaches with results, carrying, searches, talk, alarms).
- **Size (callEstimate, Opus 5.5, M813 mid-session):** stable 22,407 → 23,954 tokens (+1,547, +6.9%; warm $0.1745 → $0.1748, worst $0.3492 → $0.3616); per-turn 2,494 → 2,494 with nothing new on the map, 2,696 after one world-play beat (a person with talk, a cache, a hazard, a trigger). `faith-context.test.ts`'s budget moved from 22.8k to 24.4k.

## 8. Tests and checks (all green)

- `npm test -w @phc/engine`: 60 files, 1478 passed, 1 skipped; `PHC_COVERAGE_STRICT=1`: 1479 passed. New: `packages/engine/test/world-play.test.ts` (31 tests: faces; carry/put down, weight and overweight, the Narrator's carry/drop, Downed carriers on the map and in a fight, carried through fight start/end and a save; caches incl. view and fights; every success and failure effect with the hurt table and alarm; each hazard kind per tile on the map and in a fight, a sprint through a minefield, safe path, disarm, hidden mines, the Narrator's moves walking; triggers enter/examine/objective with spawn/fight/reveal, one shot; talk asks and approaches ally/inform/hostile/advance with odds; typed attempts 1-based, on hazards and people; markers and the HERE card; the Proving Ground tools; views leak nothing).
- `npm test -w @phc/web`: 45 files, 335 passed, 2 skipped. New: `apps/web/src/narrator/world-play-context.test.ts` (schema fields and stability, a provider's submit_turn applied by the engine, the rules, the turn prompt).
- `npx tsc --noEmit` in `packages/engine` and `apps/web`: clean. `python3 tools/validate.py data`: 0 errors (new checks: kinds, avatar pools against `art/catalog.json`, the hurt table, hazards, the cache kind). `npm run build`: ok.
- e2e against the dev server: `two-players.mjs`, `missions.mjs` and `sandbox.mjs` pass, no page errors.

## 9. Known gaps (for later, not blocking part B)

- A companion (drone, beast) moving on the area map through a hazard takes the hit in the throwaway fight, but its HP isn't written back (companion moves only write position and AP).
- Enemies don't path around hazards; allies don't fight beside the party; NPC tokens aren't hurt by hazards out of a fight.
- `viewFor` still carries hidden NPC tokens (the web filters them, as before); their wants and hints are stripped.
