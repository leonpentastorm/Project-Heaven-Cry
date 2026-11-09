# Campaign format

A PHC campaign is one JSON file. The game ships five (`data/campaigns/`); a host can load their own in the Room before the session starts ("Load a campaign file…"). The engine checks the file (`validateCampaign`) and says in plain words what's wrong.

The Narrator reads everything in the file. Players see only the title, the pitch, the meta line, the art, and the maps as they explore them.

## Top level

| Field | Required | What it is |
|---|---|---|
| `id` | yes | Short id, letters and underscores (`m813`). |
| `title` · `short` · `kicker` | title yes | The Room's card: "The Last Ship Out", "M813", "M813 · ONE-SHOT · 2–3 SESSIONS". |
| `art` · `artNote` · `focus` | no | An art id from `art/catalog.json` (as built for the web), its caption, and the CSS object-position for the crop. |
| `pitch` | yes | Paragraphs the players read before they start. |
| `meta` | yes | One line: who they play, where it starts. |
| `tone` | no | Grim, Pulp or Literary. Sets the Room's default. |
| `arc` | yes | `beginning`, `middle`, `end`: the intended shape of the story. **Narrator only.** It steers by the arc and never forces it; players can change anything. |
| `secrets` | no | Truths the Narrator never states outright. |
| `opening` | yes | What the Narrator's first turn should do: where to open, who's there, the first problem, the last line. |
| `cast` | no | `{ name, role, text }` for each important NPC. |
| `encounters` | no | Prepared fights: `{ name, zone, when, difficulty, enemies: [{ name, tier, weapon, at }] }`. Tiers: minion, soldier, elite, boss. Weapons: ids from `data/weapons.json`. `at` is a grid reference. Optional `music`: a track for this fight (see `music`). |
| `startZone` | yes | The zone the party starts in. |
| `zones` | yes | The maps (below). |
| `lore` | no | Extra lore for the Narrator, as text. |
| `sprites` · `portraits` | no | Art, by asset id (`art/catalog.json`, as built for the web): `sprites` gives a sprite per object kind (`"door:open"` for an open door); `portraits` maps NPC and enemy names to portraits (`char-<id>`), and a list alternates between same-named enemies ("Engineer": two faces). Names match exactly, else the longest name contained. |
| `moments` | no | Illustrated story moments: `{ id, art, caption, when, zone? }`. The Narrator shows one with `moment` when the story reaches it, once each; a `zone` keeps a spoiler out of reach until the party is there. |
| `acts` | no | `[{ id, title, summary, zones }]` for long campaigns: the Narrator's context carries the current act (the one holding the party's zone) in full and a line for each other zone. |
| `pins` | no | Plot essentials pinned in the Narrator's memory from session 1. |
| `narratorLore` | no | The World Bible chunks and lore docs the Narrator reads every turn, by key: `truth`, `worlds`, `magic`, `mana`, a sub-chunk such as `truth/knowing` or `worlds/timeline`, `sector-earth` (only the party's origins), `epccg-cast`. A key takes everything under it. Default `["truth", "worlds"]`. Anything else the Narrator can look up in its wiki when it needs it (spec: The Narrator's wiki). |
| `missions` | no | Missions and objectives for the mission board (below). Without them the campaign plays as before. |
| `board_npc` | no | `{ name, zone, at, portrait?, text? }`: an NPC who offers side jobs in character (an AHOC chapter quartermaster with a job board). They stand in `zone` at `at` as a neutral token, and the Narrator is told they hand out side jobs. For open campaigns; M813 is linear and doesn't use one. |
| `credits` | no | Lines shown on the campaign's end screen. |
| `music` | no | `{ ambient, combat }`: the default tracks where a zone has none. A track is `{ yt, title, artist, start?, length?, licence? }`: `yt` is the 11-character YouTube video id, and the video must allow embedding. An encounter can have its own `music` track (a theme for that named fight). `combat` is no longer played: fights play the game's own music (Gunline, Heaven Falls, Last Rounds). See the spec's Music section. |

## Missions

Missions are what the players can see they are trying to do (spec: OOC, missions and end states). The Narrator reads all of it; players see titles, goals, summaries and objectives on the mission board, and hidden ones only once revealed.

| Field | Required | What it is |
|---|---|---|
| `id` | yes | Lowercase letters, digits and underscores (`the_ramp`). |
| `title` | yes | "The Ramp". |
| `act` | yes | The act number (1 or more). |
| `summary` · `goal` | yes | Player-facing: a short paragraph, and the goal in one line. |
| `hidden` | no | `true`: off the board until the Narrator reveals the mission. |
| `objectives` | yes | `[{ id, text, optional?, hidden?, done_when }]`. At least one is required (not optional). `done_when` tells the Narrator when it counts as done; it is guidance, not code. Hidden objectives stay off the board until revealed. |
| `next` | no | The mission that follows, or a list of branches. With a list, the Narrator picks one (`missionNext`) when the story decides; say how in `narrator_notes`. |
| `narrator_notes` | no | Narrator only. |
| `end` | no | `{ kind: "act" \| "campaign", title, epilogue_guidance? }`: closing this mission ends an act (the MISSION COMPLETE card) or the campaign (the epilogue turn and the end screen). |

The campaign's first missions are the ones no other mission leads to. A mission closes when every required objective is done or failed, and its end and next fire either way. Keep spoilers (the campaign's `secrets`) in hidden objectives or the notes.

```json
{ "id": "the_ramp", "title": "The Ramp", "act": 1,
  "summary": "Chief Engineer Keel stands at the foot of the ramp: not enough thrust for scrap.", "goal": "Get the wounded aboard the last ship.",
  "objectives": [
    { "id": "get_aboard", "text": "Get the wounded aboard", "done_when": "The hatch closes with the wounded inside. Failed if the ship leaves without them." },
    { "id": "no_shots", "text": "No shots fired", "optional": true, "done_when": "Settled without anyone firing." } ],
  "next": ["the_years", "the_demand"], "narrator_notes": "Left behind: the_years. Aboard: the_demand.",
  "end": { "kind": "act", "title": "Act 1 · The Last Ship" } }
```

## Zones

Each zone is a map. Grid references: columns are letters (A, B, C… left to right), rows are numbers (1, 2, 3… top to bottom). A range like `N1–P6` is a rectangle; commas separate parts (`F4–F5, H2`).

| Field | Required | What it is |
|---|---|---|
| `id` · `name` · `summary` | yes | `outpost`, "Outpost-813", one line the Narrator sees for every zone. |
| `w` · `h` | yes | Size in tiles, 6–40 each (16 × 11 fits the screen best). Tiles are 1.5 m. |
| `solid` | no | Walls, hulls, cliffs: nothing walks or sees through them. |
| `difficult` | no | Slow ground (2 per tile). |
| `start` | yes | Where the party stands on arrival (and at the start of a fight here). |
| `enemyStart` | no | Default enemy tiles for fights here. |
| `notes` | no | `{ at, text }`: what is where. Players see it when they hover a tile; the Narrator reads all of it. |
| `objects` | no | Things on tiles (below). |
| `exits` | no | `{ to, at, text }`: other zones you can reach from here. With an `at`, a "way out" marker appears there. The Narrator moves the party with travel. |
| `art` | no | `{ map, banner }`: the painting under this zone's grid (the whole grid, `w` × `h` tiles) and the banner over the story while the party is here. |
| `music` | no | `{ ambient, combat }`: this zone's tracks, in the format of the top-level `music`. |
| `tags` · `terrain` · `in_city` · `urban` · `fear` · `upper_realm` · `faction` | no | Zone tags perks and traits read (rules 1.3): free tags, the terrain (open, forest, urban…), whether it is inside a city, a frightening place, the upper realm, the faction that holds it. Zone `npcs` may carry `kind` (human, robot, crawler, ork, upper_realm, cursed, beast, machine, turret) and `tags` (military, hunter, lawful, no_surrender…). |

## Objects and points of interest

`{ kind, at, name, text, hidden, locked, approaches }`. Kinds are in `data/objects.json`:
- cover: `crate`, `low_wall`, `pillar`, `barricade`;
- `door` (can be `locked`), `hole`, `trap` (`hidden` until spotted);
- hazards: `fire`, `toxic`; `barrel`, `rubble`;
- `container`, `terminal`, `poi`, `exit`.
- `sigil_mark` (rules 1.9, Sigil 1.5): a Sigil word drawn into the world (carved on a door or a ruin, a Keystone, a warding
  post, an old Sigil plate fixed to a wall). It takes `word` (one of the 40 Sigil word ids, lower case: `"mend"`) and
  optionally `age` (`fresh`, `old` the default, `ancient`) and `damage` (`intact` the default, `worn`, `broken`). The
  engine gives it its **Investigate** approach by itself (Analysis or Rumination, the TN by age and damage; success
  copies the word for study, a critical teaches it): don't write one. You may add other approaches. Example:
  `{ "kind": "sigil_mark", "at": "J2", "name": "Plate over the cradles", "word": "mend", "age": "old", "damage": "worn", "text": "A slate Sigil plate bolted over the repair cradles." }`

**Approaches** are the ways to deal with an object, written ahead so players can try them without the Narrator setting anything up:

```json
{ "label": "Break it down", "skills": ["raw_power", "durability"], "tn": 16,
  "stakes": "Tear through before anyone hears.", "success": "remove" }
```

- `skills`: one to three skill ids from `data/skills.json`. Two or three skills make a combined check.
- `tn`: 8, 12, 16 or 20.
- `success`: what the engine does by itself on a success: `remove` (it's gone, leaving rubble if it was cover), `open`, `reveal`, `disarm`, or `""` (the Narrator narrates the result).

Mix Body, Mind and Soul skills, so every kind of character has a way in. Objects without approaches get theirs from the Narrator when a player examines them.

## A minimal campaign

```json
{
  "id": "the_vault", "title": "The Vault Under Mandestra", "short": "The vault", "kicker": "CUSTOM · ONE-SHOT",
  "pitch": ["A merchant's vault, sealed for a century, has started knocking from the inside."], "meta": "Starts at the vault door.",
  "arc": { "beginning": "The door, and the knocking.", "middle": "What the merchant sealed in, and why.", "end": "Let it out, or seal it for good." },
  "opening": "Open at the vault door at midnight, the knocking in rhythm with a heartbeat.",
  "startZone": "vault_door",
  "zones": [{
    "id": "vault_door", "name": "The vault door", "summary": "A stone antechamber and a steel door.", "w": 16, "h": 11,
    "solid": ["A1–P1", "A11–P11"], "start": ["B5", "B6", "B7"],
    "notes": [{ "at": "O6", "text": "The vault door: steel, a century old, warm to the touch." }],
    "objects": [{ "kind": "door", "at": "O6", "name": "Vault door", "locked": true,
      "approaches": [{ "label": "Crack the lock", "skills": ["ingenuity", "proficiency"], "tn": 16, "stakes": "Quietly.", "success": "open" },
                     { "label": "Answer the knocking", "skills": ["empathy", "implication"], "tn": 12, "stakes": "Whatever is inside, ask it.", "success": "" }] }]
  }]
}
```
