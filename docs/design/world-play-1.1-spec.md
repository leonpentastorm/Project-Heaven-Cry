# World Play 1.1: piles, reload choices, gear in a fight, drop tables (design spec, 9 Nov 2026)

Status: **accepted direction (Leon, 9 Nov 2026), numbers provisional.** Rules revision **1.8**. This file is the shared
source for the build on `feature/world-play-1.1`; once its rules are written into `docs/rules/PHC-Core-Rules-v1.0.md`
(section "World Play", the Weapons and Hands sections, and section 14 **items 671–700**; Faith 2.1, built in parallel,
takes 701 on; decision **106**), the spec there wins.

## 0. Why

Playtest: rangers run out of ammo all the time. The reasons, from the code:

- Reloading drops the old magazine on the floor, but the floor is barely drawn (a 10 px "▪"), so players can't see what
  to pick up.
- **The combat floor never leaves the fight.** `finishCombat` never reads `cb.floor`, so dropped magazines vanish at
  the end of every fight.
- **A reload on the area map deletes the magazine.** The story map runs actions on a throwaway fight (`storyCb`); the
  magazine goes onto that fight's floor and is lost with it.
- Picked-up magazines for an off-hand gun are overwritten at the end of the fight (`unitToCharacter`), and a mid-fight
  swap pushes `u.extra` into the pack twice.
- Enemies drop nothing when they die, so ammo never comes back.

Leon's direction: make the ground visible and shared by every map, give the ranger a choice when reloading, let gear
change in a fight from a backpack, and let fights drop loot that the engine rolls.

## 1. Piles: items on the ground

**One pile per tile.** Everything lying on a tile is one pile, not one marker per item.

- **On the map:** a small stack icon with a count, `▣ 3` style (the glyph must differ from the cache's closed-box ▥/▣
  look; use a stack glyph such as `≡` or a drawn stack, with the count beside it). Drawn on the **combat grid**, the
  **area map** and the **minimap** alike, with a legend entry ("Pile: things on the ground").
- **Hover** lists what's in it, one line per entry.
- **Pick up** opens a **checklist** of the pile's entries, all ticked by default; Confirm takes the ticked ones.
  - **1 AP** (as now), from your own tile or an adjacent one, on any map. Searching a body is the same action: its
    drops are a pile, and "take everything" is 1 AP.
  - In a fight it's a `combat/*` action (it goes through the active-unit checks, `action_done`, `noteDeaths`,
    `checkOver`, `runEnemies`); on the area map it's a `world/act` (`act: 'pickup'`), which spends area-map AP like the
    others and writes back through `storyCb` like every other world act.
- **Entries keep what they are** (full `PackItem` fidelity):
  - a dropped magazine keeps its round count and ammo type: **"Rifle magazine 7/24"**;
  - loose rounds are **one stack per calibre**: "38 × .32 Decrkm";
  - weapons keep rarity, durability, mods and loaded rounds; tools, consumables and plot items keep their qty and text.
- **Merging:** dropping onto a tile that already has a pile adds to it. Loose rounds of the same calibre and ammo type
  merge into one stack; same-id stackable items merge their qty; magazines, weapons and unique items stay separate
  entries. A pile holds at most **24 entries** (PROVISIONAL); past that the oldest loose junk (empty magazines first)
  is lost, with a log line.
- **What goes where when picked up:**
  - In a fight: a magazine for the gun in your main hand joins `u.mags`; for your off-hand gun (when it is a different
    model) `u.offMags`; for any other weapon `u.extra` (carried back to the pack after the fight). Loose rounds for
    your gun's calibre join `u.loose` if the gun loads loose, else go to the pack. Everything else goes into the
    character's pack at once (the unit rebuild must not lose it).
  - On the area map: straight into the pack (story actions write the unit back every action).
  - **Fix the write-back bugs** while there: the off-hand magazine overwrite in `unitToCharacter` (`game.ts` ~1549 vs
    ~1551), the `u.extra` double-count after `swapWeapon` (clear `u.extra` once written back), and the **pack index
    shift** (`unitToCharacter` filters `c.pack` before `equip(c, idx)` reads the client's index: resolve the item by a
    stable key, not a stale index).
- **Weight:** piles weigh nothing to anyone; picked-up items count toward carry weight as they already do.

**Fog.** A player sees a pile only on tiles their party can see right now (the same sight the engine uses for units:
`unitSees` / line of sight within vision range; darkness halves it). The host's state keeps everything; `viewFor`
filters per player. The Narrator sees every pile.

**Hidden piles.** A Narrator-placed pile can be `hidden: true`: it is not drawn for players until it is **spotted or
searched**, the same as hidden caches and hazards (`revealNear`, the reveal radius, triggers' `reveal`). Death drops and
reload drops are never hidden.

**Persistence.** Piles live with the map, not with the fight:

- A pile is a **map object of a new kind `pile`** (`data/objects.json`; open, `blocks_move: false`), so it rides the
  existing object plumbing: `cb.objects` ↔ `g.story.objects`, `zoneObjects` per zone, saves. **Share the cache code**
  (Leon: don't build a second system): one container module handles `items`, taking items, hiding, revealing and
  views; caches are *closed* (contents hidden until searched, `itemCount` only), piles are *open* (contents shown to
  whoever can see the tile).
  - `MapObject.items` entries gain an optional exact `pack?: PackItem` field (or an equivalent typed union) so a pile
    keeps magazines with rounds, rarity, durability and mods. Cache entries in the loot shape keep working unchanged.
  - `worldView` must not strip a pile's contents the way it strips a cache's (`world.ts` ~687: `o.items ? { items: [],
    itemCount }`): piles are shown (subject to fog), caches stay counted.
- `cb.floor` is retired: every writer (`reload`, `reloadHands`, `classes/j.ts` `load_spell_magazine`) drops into the
  pile on the tile instead. Old saves with a `cb.floor` convert it into piles once.
- **Fix the zone bug** the mapping found: `finishCombat` overwrites `g.story.objects` with the fight's objects without
  stashing the current zone's objects when the fight map is a different zone, and `startStoryFight` on another map
  ignores that map's stashed `zoneObjects`. Piles must survive area map → fight → area map, on the same map and across
  zones, and across a save/load.
- **The area-map reload keeps its magazine**: the story `reload` drops it into a real pile on the tile (or, with a
  tactical reload, back into the pack).

**The Narrator** can place piles (in addition to caches and direct `loot[]`):

- A new optional turn field **`ground[]`**: `{ at, items: [{ item, qty, rarity?, name?, text? }], hidden? }` in the loot
  shape, the same item ids `loot[]` accepts, plus `mag:<weapon id>` (one magazine, full unless `qty` says rounds) and
  `rounds:<calibre>`. At most 6 entries a turn and 12 items per pile from the Narrator (PROVISIONAL). It merges into the
  pile on that tile. Optional and enum-free, so the tool stays the same all session.
- `giveLoot` gains the same ammo path (`mag:<weapon>`, `rounds:<calibre>`), so direct loot can hand over ammo too.
- The turn prompt shows piles compactly (at most 6 piles, a few entries each, "+N more"), not one line per item.
- The human Narrator / Proving Ground tools get "A PILE (ON THE GROUND)" next to "A CACHE".

**Paths and hazards (point 5).** Paths still don't avoid hazards. A pile in a minefield is fine as bait, but only if the
route shows the danger:

- The move and pickup **path preview marks every revealed hazard tile it crosses** and says so in the hint
  ("Path crosses: mines at C4").
- **Player click-paths prefer a route around revealed hazards** when one exists within +2 tiles of the shortest path
  (PROVISIONAL); otherwise they take the shortest and the preview warns. Hidden hazards stay hidden. Enemy paths are
  unchanged (still a ROADMAP gap).

## 2. Reloading: speed or tactical

A magazine weapon offers two reloads:

| Reload | Cost | The old magazine |
|---|---|---|
| **Speed reload** | the current cost (2 AP; Quick Release and Speed Loader as now) | drops into the pile on your tile, rounds still in it |
| **Tactical reload** | the current cost **+1 AP** | goes back into your pack (`u.mags`), rounds still in it |

- An empty magazine dropped by a speed reload still drops (it is worth picking up: Load refills it).
- Loose-loaded weapons (round by round) have one reload, as now; nothing drops.
- Reload both guns: speed (3 AP) as now, tactical +1 AP.
- Enemies speed-reload (their magazines feed the piles).
- On the area map the same two choices exist.
- In the action panel: "Reload (speed) · 2 AP · the magazine drops" and "Reload (tactical) · 3 AP · the magazine goes
  in your pack".

## 3. Gear in a fight

**One rule (Leon picked it): swapping what a hand holds costs 1 AP per hand.** It replaces the "2 AP" in the first
request; the 2 falls out for two-handed things.

| Change | Cost |
|---|---|
| Draw from the backpack into one hand (a pistol, a focus, a torch, a shield) | 1 AP |
| Draw a two-handed weapon (it fills both hands; whatever the off hand held goes to the pack) | 2 AP |
| Swap main hand ↔ off hand | 1 AP (as now) |
| Put away what a hand holds into the backpack | 1 AP per hand (2 for a 2H weapon) |
| **Drop** what a hand holds | **0 AP**: it lands in the pile on your tile (section 1) |
| **Light armour** piece (1 kg or less: helmets, gloves, goggles, belts, undershirts…) on or off | 1 AP each |
| Heavier armour (plate, greaves, heavy boots, anything over 1 kg) | **not in a fight** |

- Hot-Swap still makes a swap free (once a turn, twice at Tier II): it applies to the draw/put-away/swap rows, not to
  armour.
- Disarmed: you can draw another weapon (the dropped one stays dropped); Recover is unchanged.
- **A focus counts only in a hand** (decision 103) stays true and stays visible inside the inventory panel: a focus in
  the pack shows "In the pack: counts only in a hand".
- The mid-fight equip rebuilds the unit fully (armour, vision, movement, light, overweight, `offMags`, throwables…),
  like `sbRebuild(…'keep')`, keeping HP, AP, conditions, heat, held Outbursts and the off-hand gun's real rounds (not a
  free full magazine).
- **The Proving Ground** uses the same rule for the player's backpack in its fights; its Narrator tools stay free.

**UI.**

- The combat screen gets a **backpack button** (the inline backpack SVG already drawn in `main.template.html` ~146,
  white stroke) beside the action points. It opens an inventory panel over the fight: hands, light armour, the
  backpack, each row with its action and cost ("Draw · 1 AP", "Draw · 2 AP · both hands", "Put away · 1 AP",
  "Drop · 0 AP", "Heavy armour: not in a fight"). Greyed with the engine's reason when it isn't your turn or AP is
  short.
- The panel reads ammo and throwables from the **unit** (in a fight `c.pack` is stale).
- **Remove** the "Hold the Evoker / Hold the Emanator" actions (`commands.ts` `FOCUS_ACTS`/`focusItems`, and their
  `combat.js` wiring); the backpack replaces them.

## 4. Drop tables

**The engine rolls every drop, seeded (`g.rng`/the fight's rng), never the Narrator.** Three layers, the most specific
winning:

1. **Engine defaults** by enemy tier and kind (`data/loot_tables.json`).
2. **Campaign defaults**: a campaign file may define its own `loot_tables` and give zone NPCs and encounter enemies a
   `drops` field.
3. **The Narrator, per fight**: `combat.enemies[].drops` and `npcs[].drops` for a particular fight or person.

A `drops` value is `{ table?: <table id>, items?: [{ item, qty | [min, max], chance?, rarity?, name?, text? }] }`
(Narrator-written inline lists: at most 4 entries; PROVISIONAL). Unknown ids fall back as `giveLoot` does (a plot item),
never a crash.

**Always dropped** (not counted against the cap):

- **The weapon they were using**, worn: durability rolled between 40% and 80% of its maximum (PROVISIONAL), rarity
  kept. Natural weapons (unarmed, beast attacks, mana constructs without an item) drop nothing.
- **Some ammo for its calibre**: what the enemy still carried (its leftover spare magazines with their real rounds, up
  to 2 of them) plus the rounds loaded in the gun stay in the weapon. That alone gives rangers their ammo back from the
  enemies they shoot.

**Rolled** (counted against the cap), by kind:

- **Robots and drones**: parts and cores (`spare_parts`, `standard_core`): they feed Field Repair, Crystallise and
  the Mind classes.
- **People**: personal items (in-world plot items from a data list: "a ration tin with a Wick sticker", "a letter
  home, unsent", "a Lumeri prayer card"…), plus rations, stims, cigarettes and the like.
- **Casters**: cores (Sigil), heart plates or sigil plates (rarely).
- **Beasts**: nothing by default (a campaign or the Narrator can add trophies).

**Caps** (PROVISIONAL):

- At most **N rolled items per fight**: easy 2, standard 3, hard 4, boss 5. Extra rolls are dropped silently from the
  engine's side but logged for the host ("loot cap reached").
- **Bosses always drop one notable thing** (a roll on the `notable` table: a fine or masterwork weapon or mod, an
  Essence of Experience, a plate), outside the cap.
- Surrendered and subdued foes drop nothing (they keep their gear as prisoners); companions and summoned illusions drop
  nothing; Twins don't count as deaths (as now).

**Where it lands:** in the pile on the tile where the enemy died (merged with anything already there). The roll happens
once per death in the one sweep that sees every death (`noteDeaths`, which needs the rng threaded in).

**The Narrator learns what dropped**: a log line per drop ("Rook drops: Service pistol (worn), magazine 9/12, a letter
home") that matches `combatReport`'s key-moment regex, so the combat_end turn knows.

**Validation:** `tools/validate.py` checks `data/loot_tables.json` (ids against items/weapons, weights > 0, qty ranges,
rarities, the caps block, every tier and kind default resolving); `validateCampaign` checks campaign `loot_tables` and
`drops`.

## 5. What this does not change

- Caches stay closed containers you Search; `loot[]` stays the direct gift.
- Carrying creatures is unchanged.
- No credits/money system (there still isn't one).
- Enemy paths still don't avoid hazards.
