# World Play 1.0: the map tells the story (spec, 8 Nov 2026)

Status: **accepted direction (Leon, 8 Nov 2026), built in two parts.** Rules revision 1.7. Numbers are provisional.

## Why

Playtest feedback: combat is fun, and the game around it is boring.

- Players wander with no clear aim.
- NPCs stand on the map, but you can only talk to them by typing.
- Objectives are muddled because NPCs talk in riddles.
- Checks don't matter: typing what you want beats rolling. A minefield check is pointless, because mines can't hurt you and you cross half the map in one turn.
- The Narrator can't put on the map what the story says: a robot carried on a shoulder and then put down, a cache of loot, an ambush.

The principle: **anything the story says is there, is on the map, and the engine owns what it does.** The Narrator places things and writes their choices. The engine runs the rolls, the costs and the effects. Typing can't skip a check.

## 1. People on the map have a face

- `npcs[]` place and update take two new fields:
  - **`kind`**: one of human, robot, drone, crawler, beast, machine. Default human.
  - **`avatar`**: an art id. If the Narrator leaves it empty, the engine picks one from the kind's pool: `world-npc` portraits for humans, campaign cast where it fits, the drone and robot art the Proving Ground already uses for machines.
- The web draws every token with its avatar and a kind badge.
- A robot looks like a robot, wherever it stands.

## 2. Carrying people and things

- **Carry** (1 AP): a character picks up an adjacent creature that is willing, Downed, a robot or a drone. Its token leaves the map and appears in that character's inventory as a carried entry, with a weight by kind:

  | Kind | Weight (provisional) |
  |---|---|
  | robot | 40 kg |
  | drone | 15 kg |
  | human | 70 kg |
  | beast | 80 kg |

  The weight counts against Carry weight, and the existing overweight rules apply.
- **Put down** (1 AP): puts the carried creature on an adjacent free tile. Its token comes back with its name, avatar, side and state.
- In a fight, carried creatures come along. A carrier who is Downed drops them on adjacent tiles.
- The Narrator can do both in the story:
  - `npcs[]` action `carry` takes the token id and `charId`.
  - `npcs[]` action `drop` takes the token id, `charId` and `at`.
- Typed lines map to `actions[]`:
  - `act: 'carry'` with `targetId`;
  - `act: 'put_down'` with `targetId` and `to`.

  "I put the two robots down" becomes two `put_down` actions, and the tokens appear.

## 3. Loot on the ground

- A new object kind, **`cache`**: a crate, a body, a locker. It holds `items[]`, in the same item shape as `loot[]`: an item or weapon id, qty, rarity, name, and plot items as name plus text.
- **Search** (1 AP, adjacent) moves its items into the searcher's pack and empties the cache.
- A locked cache needs its approaches first (section 4).
- The Narrator places caches with `objects[]`. `loot[]` stays for direct gifts.

## 4. Approaches with real consequences

A point of interest's approaches get a success effect and a failure effect. **The engine applies both.**

**On success**, `success` is one of:

| Effect | What happens |
|---|---|
| `remove` | breaks or clears the object |
| `open` | unlocks or opens it |
| `reveal` | shows hidden tokens, objects, hazards or a line |
| `disarm` | makes a trap or hazard safe |
| `loot` | the actor gets the object's items |
| `advance` | marks the objective named in `objective` done |
| `""` | the Narrator narrates the result |

**On failure**, the new `fail` field is one of:

| Effect | What happens |
|---|---|
| `hurt` | damage by the approach's TN: 8 → 10, 12 → 20, 16 → 35, 20 → 50; Physical; armour applies |
| `alarm` | hidden hostiles nearby are revealed and alerted; the Narrator may start a fight next turn |
| `condition` | `failCondition` is applied, e.g. Bleeding, Shaken, Slowed |
| `jam` | the object locks for the scene; that approach is gone |
| `lose` | `failItem` is removed from the actor's pack |
| `""` | nothing beyond the failure |

- Numbers come from that table. The Narrator never writes them.
- Approaches stay on the object, and each character may try each approach once.

## 5. Hazards that hurt

- A new field, `hazards[]`. The Narrator places and removes hazards:
  - **kinds:** minefield, fire, radiation, gas, collapse;
  - **severity:** light, heavy;
  - **area:** tiles, or a rectangle;
  - **`hidden`:** for mines, until spotted.
- **The engine runs them on every tile entered, in a fight or on the area map, at any speed:**

  | Kind | Effect (provisional) |
  |---|---|
  | minefield | light 25, heavy 45 damage; Body save halves; the mine is spent |
  | fire | 10 / 20, and Burning |
  | radiation | 5 / 10, plus Weakened after 3 tiles |
  | gas | Heart save, or Shaken (light) or Stunned (heavy) |
  | collapse | 20 / 35, and Prone |

- Every hazard comes with **approaches the engine makes by itself**:
  - **Find a safe path:** Perception or Vigilant, TN 12 light / 16 heavy. Success marks safe tiles that don't trigger for the squad.
  - **Disarm or put it out:** Proficiency or Ingenuity, same TNs. Success removes the hazard. Failure uses that hazard's `hurt`.
- Hidden mines are found by passive Vigilant, the existing spotting, or a `reveal`.

## 6. Triggers: ambushes and encounters

- A new field, `triggers[]`. The Narrator sets triggers that **fire without a Narrator call**:
  - **when:** `enter` (tiles or a rectangle), `examine` (an object id), or `objective` (an objective id done);
  - **then:** one of
    - `spawn` (a group in the `npcs[]` place shape: placed, hidden or not);
    - `fight` (spawn, then start a fight with `difficulty`);
    - `reveal`.
- One shot each. The Narrator narrates the result next turn; the turn reports which triggers fired.

## 7. Talking without typing

- `npcs[]` place and update take three more fields:
  - **`wants`**: one plain line;
  - **`knows`**: an objective id they can point to, and a one-line hint;
  - **`talk[]`**: 2 to 4 approaches in the section 4 shape. Successes add `ally` (side becomes neutral or ally) and `inform` (the hint and a map marker). Failures add `hostile`.
- **Talk panel:** click an NPC token to see:
  - **Ask what they want** (1 AP; shows `wants`);
  - **Ask about the objective** (1 AP; shows the hint and puts a marker on the map);
  - the `talk` approaches, rolled by the engine like a point of interest's.
- Each choice also goes into the round's lines, so the Narrator answers in character.
- Free typing still works for anything else.

## 8. A clear aim in every area

- Objectives get optional **`where`**: a zone id, and token, object or tile references.
- The Narrator sets and updates it with `missions[]` (`where`).
- The web shows a **HERE card**: the 1 to 3 objectives in this zone and what moves each one forward. Each referenced token, object or tile gets a **marker** on the map.
- The `knows` and `inform` of section 7 add markers too.

## 9. Typing can't skip a check

- The Narrator never grants by fiat what an approach, hazard or check covers. A typed attempt at one maps to `actions[]` with `act: 'attempt'` (`objId` or `targetId`, plus the approach `index`). The engine rolls it like a button.
- The engine refuses a story move that ends past a hazard without passing through it. Movement always walks the path, so hazards fire.
- A new prompt rule: **people who give a task say what, where and why, plainly.** Wit and evasion are fine for everything else, never for the objective.

## 10. The Narrator's checklist

The map checklist in the Narrator's instructions gains these lines:

- Everyone and everything you describe is placed, with a face.
- Carried people ride in the inventory.
- Loot sits in caches.
- Dangers are hazards.
- Ambushes are triggers.
- Every NPC you place has `wants`, and `talk` when they matter.
- Every objective you open has `where`.

## Build split

- **Part A: engine, data and Narrator** (`packages/engine`, `data/`, the spec, and `apps/web/src/narrator` for the schema and prompt).
  - It covers sections 1–10's state, actions, rules, numbers and Narrator fields.
  - It also adds view helpers for the web: `npcView`, `talkOptions`, `hazardTilesFor`, `markersFor`, `hereCard`.
  - It adds Proving Ground actions to place each new thing.
  - Its tests run through `apply()`.
- **Part B: web** (`apps/web`).
  - **On the map:** NPC avatars and kind badges; caches, hazards, safe-path tiles and markers drawn on the map.
  - **Panels:** carried entries in the inventory with weight and a Put down button; Carry, Search and Attempt as buttons; the Talk panel; the HERE card.
  - **Plumbing:** effects, Proving Ground tools, and e2e tests.
  - Buttons only.
