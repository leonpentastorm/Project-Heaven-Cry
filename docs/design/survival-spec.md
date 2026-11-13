# Survival: the first real game mode, and the roguelike's first piece (spec, 13 Nov 2026; draft 1)

Status: **a spec for the patch after Classes 3.0; nothing here is built.** Frame: `docs/ROADMAP.md` "Survival mode" and "The roguelike: Leon's scope" (with the lead's notes a to e), decision 115; `balance-contract.md`; `level-scale-spec.md` with its "Settled by Leon" block (×7.5 at level 20, ×1.1119 a level) and section 6 (the lag, ruled in); `class-roster-rev4-proposal.md`; `campaign-format.md`; the art brief `art/briefs/GPT-PROMPTS-2026-11-13-survival.md`. Every number is **PROVISIONAL** and lives in a named field of a new `data/survival.json` (and the mode list in `data/modes.json`); each becomes a spec section 14 item when built. Names marked *(Suggested)* are Leon's to change. The lead's calls made for him are in section 11.

Leon: *"I just want a mode you can play with progression and combat."* *"This path leads to a shop, that path to a boss, that one to a free rest."* *"I want to test all these [Classes 3.0, the level scale, the new art] in Survival."*

## 1. The fantasy and the loop

A squad of one to four makes characters at level 1 and walks a branching road of fights, shops and rests toward a Boss. Every fight is generated for this squad at this depth, from the enemy table and the balance contract; ordinary enemies fall behind as you level, so you feel the power you gained; Elites and Bosses keep pace. After each fight: XP, credits, and one reward from three. Lose everyone and the run ends with how far you got. **No Narrator is needed:** the engine decides everything; a Narrator, if the room has one, only adds a few lines of flavour.

**The loop of a node:** choose the next node on the path map (its kind is shown) → the node plays (a fight on a generated map; a shop; a rest; a cache) → rewards → level up if earned → back to the map.

**Worked example: seed `PHC-0001`, two players, the first four nodes.** Kade (built for Durability: the soldier kit, a service rifle, Class 3) and Ha (built for Empathy: the `mender` kit, a pistol and an Attuner), level 1, 150 credits each. Settings drawn: rows 1 to 7 the AHOC outpost, rows 8 to 14 the machine works. Budget unit SE, bulk and pressure as in section 5.

| Node | Choice offered | Picked | What is generated | Budget (target · spent) | After |
| --- | --- | --- | --- | --- | --- |
| 1 (depth 1) | Fight · Fight (rule 7: plain fights) | Fight, left | template `firing_line`, kind human: 1 Soldier (service rifle, level 1), 2 Minions (pistol, SMG); map 16 × 16 (5 units), AHOC kit | bulk 0.25 × 2 × 4 = **2.0** · 1.0 + 2 × 0.55 = **2.1**; pressure cap 1.25 × 2 = **2.5** · 1.0 + 2 × 0.75 = **2.5** | won in 4 rounds; **100 XP each → level 2**; 100 credits each; each picks 1 of 3 (Kade: a Fine combat knife; Ha: 2 stims) |
| 2 (depth 2) | Fight · Fight | Fight, right | `swarm`, kind robot: 4 Vermin (drill mites, level 1: lag 3, floored at 1, so a gap of 1) and 1 Soldier (level 1, lag 1); 20 × 20 (7 units) | **2.0** · 4 × 0.3 × 0.83 + 1.0 × 0.83 = **1.83** (−8.5%, inside ±15%); pressure 1.83 ≤ 2.5 | **125 XP → 225**; 120 credits |
| 3 (depth 3) | Fight · Shop · Cache | the party leans 1 Fight, 1 Shop; tie: the host's lean (Kade) | `caster_guards`: a Sigil adept and 2 Soldiers, all level 1 (lag 1 at fight level 2) | bulk 0.25 × 2 × 5 = **2.5** · 3 × 0.83 = **2.49**; pressure 2.49 ≤ 2.5 | **150 XP → 375: level 3**: the level-up screen gives Kade the Bulwark and Ha the Mender (rules 1.29) |
| 4 (depth 4) | Rest · Elite · Fight | Rest | — | — | a long rest (full HP and MP, a day, per-rest uses back) and a new session (Echo 1); back to the map |

## 2. Rules

Adjudication: every rule is `engine`, except the Narrator's optional flavour (rule 30), which decides nothing.

**The mode and the run**
1. **Survival is a MODE, chosen in the room** (section 8.1), not a campaign: the room's setting `settings.play` is `survival`, `roguelike` or `campaign` (`data/modes.json`; only Survival is available). The run's state is `g.run` beside `g.campaign` (rule 33). Why not a generated campaign: the campaign format is Narrator content loaded once (`arc`, `opening` required; `campaign/load`), while a run is state that changes with every action and must replay from the event log; the Proving Ground already shows the working pattern (`g.sandbox`, its own `sandbox/*` actions, Narrator and story actions refused). The run carries a generated campaign *shell* (id `survival`) whose `zones` are the fights' generated maps, so every map reader (`zoneMap`, fog, objects) works unchanged.
2. **Who plays:** one to four players, one character each, all **level 1**, made in the room or brought as a level 1 draft (a draft above level 1 is refused: "Survival starts at level 1."). Each starts with its creation kit (rule 25) and `start_credits` 150.
3. **Length:** `run.length` **14** nodes on any path, the 14th the Boss. A run takes a character to **level 6 before the Boss and level 7 on the win** (section 5.3).
4. **Win:** the Boss node's fight is won. **Lose:** a fight ends `loss` (`checkOver`: every character Down or dead, nobody standing to Raise). A solo character Down is a loss (nobody can Raise). The run then shows its summary (rule 29); nothing is kept but the summary and the "Report a run" export.
5. **Death inside a run** *(question 2)*: a character who dies in a won fight (three failed death saves, or killed while Downed) is **out until the next REST node**, where it returns at half HP; it gets no XP, credits or reward while out. Downed characters in a won fight stand at 1 HP (`unitToCharacter`, as today).
6. **Abandon:** the host may end the run (`run/end`): it counts as a loss at that depth.

**The path map**
7. **Rows:** 14 rows (depths). Row 1: 2 nodes, row 2: 2 to 3 nodes, both **plain fights**. Rows 3 to 7 and 9 to 12: 2 to 4 nodes, kinds rolled (rule 9). **Row 8: the gate**, one ELITE node every path passes. Row 13: two nodes, one REST and one SHOP. Row 14: the BOSS. About 36 nodes in all.
8. **Links:** each node links to 1 or 2 nodes of the next row whose column is within one of its own; links never cross; every node has a way in and a way out. The whole map, with every node's KIND and setting, is visible from the start; what a fight holds is rolled only on entry.
9. **Kinds of open rows** by weight (`map.kind_weights`): fight 50, cache 18, elite 12, shop 10, rest 10. **Fairness, repaired deterministically, never rerolled:** no Elite before depth 4 or in rows 7 and 9 (beside the gate); no two Elites, two shops or two rests linked; no rest in row 12; **every path holds at least one shop and one rest in rows 3 to 12** (counted over all paths by a pass row by row; where a path lacks one, its plain fight with the fewest paths through it becomes that kind). Row 13 offers both again before the Boss.
10. **Settings:** two distinct settings are drawn from the six (`settings[]`): rows 1 to 7 the first, rows 8 to 14 the second (the gate and the Boss belong to the second).
11. **Choosing (co-op):** each player marks a reachable node (`run/lean`); the marks show live to all; when every connected player has leaned, the node with most leans is entered; a tie goes to the host's lean; the host may go at once (`run/go`). Solo: a click goes. Built like the Proving Ground's READY marks (`sandbox.ready`).
12. **Seeded:** the map is made at `run/start` from the run's seed through its own stream (`rngFor(seed, 'map')`, section 4.2); each node's encounter, reward offers and stock from `rngFor(seed, node id + purpose)`. A shared seed gives everyone the same map and the same fights (a daily seed later). Fights' own dice come from `g.rng`, as every fight's.

**Node kinds** (section 3.1 for the numbers)
13. **FIGHT:** a generated encounter (rules 15 to 22). **ELITE:** a generated encounter with at least one Elite and better rewards. **BOSS:** the last node: a Boss and its guard.
14. **SHOP** (rules 26 to 28), **REST** (rule 24), **CACHE:** a reward pick (three offered, rule 23) and `cache_credits`, no fight. *Cut on purpose:* trapped caches (a trap needs a check and a consequence a Narrator would judge; it comes with the roguelike's rooms).

**The encounter generator** (it is the roguelike's too)
15. **Input:** the party (each character's level, how many stand), the node's kind and depth, its setting, the seed. **Output:** a list of foes (`FoeSpec`: tier, weapon, kind, level, caster, tags, scale, spawn zone) and a map (rule 21).
16. **The budget unit is the Soldier-equivalent (SE),** on two axes (section 5.1): **bulk** (how long a foe takes to remove: rifle-turns to kill ÷ a Soldier's) sets the fight's length; **pressure** (how much it deals a round: Soldier-turns) caps its danger. Per tier at equal level (`tiers`): Vermin 0.3 / 0.3, Minion 0.55 / 0.75, Soldier 1.0 / 1.0, Elite 2.1 / 2.2, Boss 7.9 / 3.0.
17. **A fight's budget:** bulk = `bulk_per_char_round` **0.25** × party size N × target rounds R; R by node (`rounds`): plain fight 5 (depths 1 and 2: 4), Elite 6.5, the gate 6.5, Boss 9. Pressure cap = `pressure_per_char`[N] × N (1.2 solo, 1.25 for two, 1.3 for three or four). A composition is accepted with bulk within **±15%** (`bulk_band`) and pressure at most **+10%** over the cap (`pressure_band`). Foes at most `max_foes`[N]: 4 / 6 / 8 / 10.
18. **The lag (Leon's rule, level-scale section 6):** the fight level is the party's average, floored (`enemies.json levels.fight_level`); a foe's level = max(1, fight level − lag): **Vermin and Minions 3, Soldiers 1 (2 from fight level 10), Elites and Bosses 0** (field `lag` on each tier row, as the level-scale spec proposed). The floor makes the lag grow as the run goes: at level 1 everything is level 1; from level 4 the trash is three levels down. Priced: each level of gap is ×`lag_factor` **0.83** on bulk and on pressure (section 5.2), so a lagging fight keeps its length with more bodies, not stronger ones.
19. **Party size and the big units:** an Elite or Boss alone can be more than a small party's whole budget, so it is spawned scaled (`share`, by N: Boss HP ×0.28 / 0.5 / 0.75 / 1 and damage ×0.4 / 0.6 / 0.8 / 1; Elite HP ×0.7 / 0.9 / 1 / 1 and damage ×0.55 / 0.8 / 1 / 1), and costs its scaled bulk and pressure. The Elite-and-Boss guard of rules 1.17 holds on the scaled HP.
20. **Composition by template** (section 3.2, about ten, data): (a) eligible templates by node kind, depth, setting kind and party size; weighted pick, never the template the last fight used; (b) the template's required slots first (its anchor); (c) its optional slots in order, each the cheapest fill that keeps pressure under the cap, until bulk is in the band or `max_foes`; (d) if the band cannot be met: drop optional slots, then swap a Soldier for two Minions, then try the next template; (e) weapons from the setting's pool for the tier and kind, casters from `enemies.json casters` / `soul_casters`, tags (`skulk` for an ambush) from the slot. **Never a Celestial** as an enemy (the Accords: an uncaused appearance is a catastrophe); `celestial` is in no setting's kinds.
21. **The map** (section 4.3): its size from the units (`map_size`: up to 6 units 16 × 16, up to 10 20 × 20, else 26 × 26); a layout in the legend language of `data/maps.json` built from the setting's stamps and rules, checked (two lanes, start gap 10 to 14, cover share), and falling back to `open_ground` cropped after 8 tries. Spawn zones: the squad on the west edge; foes by the template (far edge, flanks, or split).
22. **Determinism and length:** the generator uses only its seeded stream and sorted lists; it makes no dice the fight log replays; the same seed, party and node give the same fight every time (a resumed run re-enters the same fight).

**Rewards and economy**
23. **After a won fight, to every standing character:** XP (`xp`, section 5.3, through `giveXp`, then the level-up screen as usual), credits (`credits`), and **one reward of three offered to that character** (rolled per character): a weapon, an armour piece, an item (mod, tool, consumable), ammunition and supplies (for the character's weapons), a mana core (only offered when someone in the party uses cores), or credits (`rewards.kinds`, weighted); rarity by node (`rewards.rarity`: a fight standard 75 / fine 25; an Elite fine 60 / masterwork 35 / relic 5) and price band by depth (`price_band`: price at most 300 + 150 × depth, ×1.25 from an Elite). Enemies' rolled drops (`loot_tables.json`, `rollDeathDrops`) stay on the field's piles as today and can be picked up before leaving the fight.
24. **REST (free):** `applyRest(g, 'long')` (all HP, MP full, Supplies and toxins restocked, per-rest uses back, a day on the counter for Devotion's 90 days) and **a new session** (`beginSession`: Echo 1, per-session uses such as a Miracle back, Devotion's session cap fresh); conditions that outlive a fight are cleared; the dead return at half HP (rule 5). *No "rest or train" choice in v1:* one button.
25. **Carry between nodes:** HP, MP, ammunition and magazines, Strain and anything else the fight leaves on the character, Devotion and its XP, items. A node is a new scene (`g.story.scene.n`): per-scene uses (an Ask, Overreach) come back each node. **Starting kits by build** (rule 2): the creation kit step (`character.ts KITS`) gains `rigger` (a Visualizer in the off hand, the service pistol, 4 standard cores) and `mender` (an Attuner, the service pistol, a field kit), if Classes 3.0 has not added them; the kit is preselected by the door skill with most points (Brain Power `sigil`, Visualization `rigger`, Will Power `soul`, Empathy `mender`, else `soldier`) and can be changed. Every door's gear is then held from node 1, and its cores and ammunition are at every shop.
26. **SHOP:** a shopkeeper (section 3.4) with `stock.slots` 8 rolled for the node (3 weapons, 2 armour pieces or mods, 2 consumables, 1 focus or cores), at the depth's price band, rarity standard 70 / fine 25 / masterwork 5 (from depth 8: 50 / 35 / 15); plus **ammunition at the counter** for every weapon the party carries, never sold out. Stock is shared (first buyer); each character pays from its own credits. One **service**: armour fitting, the next armour class for `armour_fit` (class 2 250, 3 600, 4 1200), until Equipment 2.0 makes body armour items.
27. **Prices** (one door, `priceOf(item, rarity)`, section 4.2): an item's or weapon's `price_credits` × `rules.json rarity.<r>.price`. **Today 122 of 128 have a price:** missing are `city_id`, `bank_card`, `grimoire` (plot items: `price_credits: null` and never stocked or sold), and the natural and Figment weapons `beast_bite`, `figment_claws`, `figment_edge` (`stock: false`). **To add:** a price per round by calibre (`weapons.json calibres[].round_price`; the special rounds' `price_mult` reads it); a magazine's price (`magazine_price` = its rounds' price + 10); the shop's level band is the price band (rule 23), not a field on every item.
28. **Selling** *(question 3)*: yes, at `sell_rate` **0.25** of the price (×rarity); plot items, natural weapons and anything without a price can't be sold.
29. **The summary** (won or lost): the path walked, depth reached, each fight's rounds, kills, who went Down, levels and classes reached, the run's time; and **Report a run** (rule 32).

**Narrator, saves and the test bed**
30. **A Narrator is optional flavour.** With an AI or human Narrator in the room, entering a node asks it for one to three sentences (the node's kind, setting, template name and foes are given; no check, no number, no voice hook); the shopkeeper's and the Boss's lines are data first, and the Narrator may say them in its own words. The request never blocks: if it is slow or fails, play goes on. Without one, the data lines carry the mode.
31. **Classes 3.0 test bed:** each of the nine classes is playable from node 1 (rule 25 gives every door its gear); a Mind or Soul build finds cores and MP refills at shops and rests; class at level 3 arrives at about depth 3, rank II at level 6 at about depth 12.
32. **Report a run:** the "Report a problem" bundle (`apps/web/src/game/report.ts`) with a `run` part: seed, length, settings, each character's build at start and end, and per fight: node, kind, depth, setting, template, budget asked and spent (bulk, pressure), the foes (tier, level, kind, weapon, caster, scale), rounds, outcome, and per unit damage dealt and taken by system (weapon, Sigil, Outburst, prayer, Figment, Bond, Shadow, other), heals and shields given and received, Downs and deaths: from a fight tally tap on the fx stream (section 4.2), kept in `g.run.stats` (so it is in the save).
33. **State and saves:** `g.run` = `{seed, length, nodes, at, path, state, leans, offers, shop, stats, out}`; every change is a `run/*` action in the reducer (`run/start`, `run/lean`, `run/go`, `run/pick`, `run/buy`, `run/sell`, `run/fit`, `run/rest`, `run/leave`, `run/end`); the event log is the save; leaving a room and loading it resumes at the same node (an unfinished fight resumes as any fight). Story and Narrator actions are refused as in the Proving Ground (`SANDBOX_REFUSED`'s pattern), except the flavour turn and `levelup/*`, `gear/*`.

## 3. The lists

### 3.1 Node kinds

| Kind | Where | Holds | Rounds (`rounds`) | XP (`xp`) | Credits (`credits`) | Reward |
| --- | --- | --- | --- | --- | --- | --- |
| fight | rows 1, 2 (only), open rows | a template | 5 (4 at depths 1, 2) | f(d) = 100 + 25 × (d − 1) | c(d) = 80 + 20 × d | 1 of 3, fight rarity |
| elite | open rows from depth 4; row 8 (gate) | an Elite template | 6.5 | 1.5 × f(d) | 1.5 × c(d) | 1 of 3, elite rarity |
| boss | row 14 | `champion` | 9 | 2 × f(d) | — (the run ends) | — |
| shop | open rows; row 13 | a shopkeeper and stock | — | 0 | — | buying |
| rest | open rows (not 12); row 13 | — | — | 0 | — | the long rest and a session |
| cache | open rows | — | — | 0.25 × f(d) | 1.5 × c(d) | 1 of 3, fight rarity |

### 3.2 Templates (`templates`; slots in order; "req" first)

| Id | Name *(Suggested)* | Nodes, from depth | Slots | Spawn |
| --- | --- | --- | --- | --- |
| firing_line | A firing line | fight, 1 | req 1 Soldier (ranged); opt Soldiers, Minions (ranged) | far edge, behind cover |
| swarm | A swarm | fight, 1 | req 3 Vermin; opt Vermin, Minions (melee), 1 Soldier | near, spread |
| rush | A rush | fight, 2 | req 2 Minions (melee); opt Soldiers (melee or shotgun) | the minimum start gap |
| caster_guards | A caster and guards | fight, 3 | req 1 caster (Sigil adept or Heart adept, by setting); opt Soldiers | caster far, guards between |
| ambush | An ambush | fight, 3 | req 2 Soldiers or Minions tagged `skulk`; opt Minions | flanks, hidden start |
| healer_line | A line with a medic | fight, 5 | req 1 healer caster (Sigil novice with MEND, or Heart adept's Mending pulse); opt Soldiers | far, the healer behind |
| machines | A drone screen | fight, 2; kinds robot, drone | req 2 Minions (kind drone); opt Soldiers (kind robot) | split |
| elite_pack | An Elite and its line | elite, 4; gate | req 1 Elite; opt Soldiers, Minions | far; the Elite central |
| warden | A warden | elite, 8; gate | req 1 Elite caster (Sigil warden or Heartfire elite); opt Soldiers | far |
| twin_elites | Two Elites | gate, N ≥ 3 | req 2 Elites; opt Minions | split |
| champion | The champion | boss | req 1 Boss (the setting's boss pool; a Sigil magister or Heart sovereign from the pool too); opt Soldiers, Minions | far, the Boss central |

### 3.3 Settings (`settings`; art by the brief's names)

| Id | Name | Enemy kinds (weights) | Boss pool (portrait) | Stamps (examples) | Hazards |
| --- | --- | --- | --- | --- | --- |
| ahoc | AHOC chapter outpost | human 5, robot 3, turret-drone 2 | robot warframe (`boss-robot-warframe`) | bunker corner, gate with door, crate stacks | toxic (coolant) 10% |
| city | Central City back streets | human 5, crawler 3, drone 2 | crawler (elite face `elite-crawler`), human | alley wall with door, stall row | fire 10% |
| field | Daggerfall-type battlefield | ork 4, human 3, beast 2, cursed 1 | ork warlord, mana-warped beast | trench line, shell craters (difficult) | fire 15% |
| works | Machine works and drone foundry | robot 4, machine 3, drone 3 | robot warframe | machine rows (pillars), conveyor walls | toxic 15% |
| shrine | Shrine and cathedral district | human 4, cursed 3, upper_realm 2 | upper-realm patch | colonnade, pews (low walls) | none |
| rim | Rim station | robot 4, drone 3, machine 2, human 1 | robot warframe | bulkhead with door, cargo containers | toxic 10% |

Each setting also names its foe names by tier and kind, its weapon pools by tier and kind (beasts `beast_bite`, robots the guns), its ground textures, its backdrops `<setting>-a..d`, and its kit (section 4.3).

### 3.4 Shopkeepers (`shopkeepers`; the first form of the roguelike's shop NPC)

| Id | Name *(Suggested)* | Portrait | Settings | Stock bias | Prices |
| --- | --- | --- | --- | --- | --- |
| quartermaster | the chapter quartermaster | `shop-quartermaster` | ahoc, rim | weapons and armour ×1.5 weight | ×1.0 |
| dealer | the back-alley dealer | `shop-dealer` | city, field | consumables and mods ×1.5 | ×0.9 |
| trader | the Smetanita trader | `shop-trader` | works, shrine | cores, foci, mana weapons ×2 | ×1.15 |

Each has five written lines (greet, bought, can't afford, sold to, leave). The rest node's face: `rest-medic`.

## 4. On what exists

### 4.1 Built from (each rule against the primitive that carries it)

| Rule | Primitive (verified 13 Nov) |
| --- | --- |
| The mode setting, host-only, relayed live (1, 8.1) | the `settings` action (`game.ts`: `{type: 'settings', patch}`, host only; the room's state broadcast as every lobby change is); a new key `settings.play` |
| A mode beside the campaign, refusing story actions (1, 33) | the Proving Ground's pattern: `g.sandbox`, `sandboxAction`, `SANDBOX_REFUSED`, `standalone`, `saved` |
| Leans and the host's tie (11) | `sandbox.ready` by player id; `isHost` |
| Seeded streams (12, 22) | `rng.ts` `seedFrom`, `next` (a stream is `{state: seedFrom(seed + '|' + key)}`) |
| A fight from a list of foes (13) | `startCombat(name, map, pcs, foes: FoeSpec[], difficulty, rng, objects, {level})`; `FoeSpec` `tier`, `weapon`, `level`, `caster`, `drops`, tags; `sbBegin` as the model; `magicIn` |
| Win, loss, back to the map (4, 13) | `checkOver`; a `g.run` branch in the fight's end beside `sandboxOver` / `finishCombat`; `unitToCharacter` (Downed stand at 1 HP) |
| Tier numbers, levels, lag (16, 18) | `enemies.json items` and `levels.table`, `fight_level`, `gap` (to-hit per level), `full_hp_guard`; the tier `lag` field (level-scale section 6) |
| Variety (20) | `doctrine`, `fire_spread`, `fire_near`, `healer_focus` by tier; `skulk` (`FOE_TAGS`, `skulks`); `casters`, `soul_casters` (the Proving Ground's `sandboxCasters` swaps) |
| Maps (21) | `maplayout.ts` `readLayout`, `sizeProblem`, `startGap`, `deployEnemy`, `nearestFree`, `MAP_LIMITS` (deploy 10 to 14), `maps.json` legend and `open_ground`; `objects.json` 23 kinds; `defaultObjects` |
| Drawing objects by kind (4.3) | campaign `sprites` (a sprite per object kind, `"door:open"`) and a map object's `sprite` (`MapDef.objects[].sprite`) |
| XP and levels (23) | `giveXp` (source `combat`), `applyLevels`, `levelForXp`, `rules.json character.levels.xp_total`; the level-up screen and `levelup/*` |
| Rewards (23) | the loot roller (`loot.ts`, the weighted pick behind `rollDeathDrops`; `LOOT_TABLES`, `cleanDrops`); `rules.json rarity` |
| Rest and session (24) | `applyRest(g, 'long')` (`restockResources`, `dayOf`, `restN`), `beginSession`, the `rest` and `session_heal` hooks; `uses` scopes `per_scene`, `per_session`, `per_rest` |
| Kits and foci (25) | `KITS`, `FOCUS_DOOR`, `holds` / `hasVisualizer`, `magsOf`, `roundsOf`, `loadAll` |
| Fog, log | `viewFor` / `fogFight`; `say`, `sayAt` |
| The run's choices on screen (8) | a run view the engine returns (`viewFor` gains `run`: offers, stock with prices and `why` when not affordable, leans, legal next nodes); the client sends `run/*` ids only (`boundary.test.ts` holds it) |
| Report a run (32) | `report.ts openReport`'s bundle; `fxTaps` (`fxtap.ts`) |

### 4.2 Needs a new primitive (each general; for the lead's consolidation pass)

1. **Credits on a character** (`c.credits`, with `earn` / `payCredits` and a refusal in words): the shop now, the roguelike's missions and shops later (the shelved `classes/j.ts` keeps its own until it returns).
2. **A spawn scale on `FoeSpec`** (`scale: {hp, damage}`, applied after the level row): party-size scaling of any unit; the roguelike's and campaigns' encounters too.
3. **`rngFor(seed, key)`** in `rng.ts`: a named stream from a seed, so content generation never consumes the fight's dice (any seeded content: daily seeds, rooms).
4. **`priceOf(itemId, rarity)`** (one price door) and the calibre round prices (rule 27): shop, sell, reward bands, loot value.
5. **A fight tally** (`fightTally` on `fxTaps`: damage dealt and taken by system and source, heals, shields, Downs): moved from the balance simulator's counting (`test/balance/sim.ts`) into `src/`, so the run summary, Report a run and the balance tools count the same way. Where an fx event carries no system, it counts as `other`, and the builder lists those events.
6. **A map skin** on `MapDef` (`skin: {setting, ground, rotate, dressing: tiles[]}`): presentation only, kept out of the rules, read by the renderer.
7. **The `lag` field** on `enemies.json` tiers, read where a foe gets its level (proposed by the level-scale spec; Survival is its first reader).

New code that is the system itself, not a primitive beside one: `survival.ts` (the run reducer), `pathmap.ts` (rules 7 to 10), `encounter.ts` (15 to 20), the layout generator in `maplayout.ts` (21), the shop roller (26). Nothing here deals damage, heals, prices an AP or rolls a check outside the existing doors.

### 4.3 The map generator and the art contract

**Layout** (all from `settings.<id>.layout`): (1) size from rule 21; (2) the squad's zone is columns 1 to 2, the foes' by the template; (3) 1 to 2 stamps on 16 × 16, 2 to 3 on 20 × 20, 3 to 5 on 26 × 26 (a stamp is a small picture of 3 to 7 tiles in the maps legend: `#`, `w`, `c`, `P`, `B`, `D`, `o`, `~`), rotated and mirrored by the stream, never on a start zone; (4) loose cover until every tile of the middle band is within 3 tiles of cover, half to full about 2 : 1, the cover share 8 to 18% of the tiles; (5) 0 to 2 patches of difficult ground; a hazard (fire, toxic) by the setting's chance, never on a start tile; barrels next to cover (30%), lamps and terminals by setting; (6) set dressing on 4 to 10 free tiles (the skin, no rule meaning). **Checks:** `readLayout` gives no error; `startGap` within `MAP_LIMITS`; **two lanes** (block the shortest path's tiles from the squad's zone to the foes': another path still exists); the cover share. A failing check drops the last stamp and tries again; after 8 tries `open_ground` cropped to size. The stamps are the seed of the roguelike's designed rooms (the same legend).

**Drawing contract** (the client; fallbacks so art drops in piece by piece). Paths are the brief's; catalog ids `kit-<setting>-<piece>`.

| What | Drawn from | Fallback |
| --- | --- | --- |
| Ground | `art/sprites/kit/<setting>/ground-1..3.png`, one a map by the stream, rotated 0/90/180/270, darkened under the grid | today's plain tiles |
| Solid tiles (`#`) | `wall-straight`, `wall-corner`, `wall-end`, `wall-door` (a door object in the line), `wall-broken` (a rubble decal in the line), chosen from the four neighbours and rotated | today's solid fill |
| Objects | `<kind>.png` by engine kind id; `crate-broken`, `pillar-broken`, `barricade-broken` when destroyed; `door-open`; `container` 1.5 tiles | `art/sprites/objects/` (today's sprites), then the plain glyph |
| Decals | `decal-rubble` (rubble), `decal-toxic` (toxic), `decal-scorch` (fire's ground, burnt) | today's tint |
| Dressing | `dress-1..4.png` on the skin's tiles | nothing |
| Backdrop | `art/illustrations/survival/backdrops/<setting>-<a..d>-*.png` behind the map frame and on the node card | the screen's ground colour |

## 5. Balance

### 5.1 The unit, derived from the contract

From the rules 1.15 to 1.26 tables (level 1; ratios hold at every level under the level scale): the rifleman kills a Soldier in **2.01** rifle-turns, an Elite in **4.26**, a Boss in **15.9**; a Soldier kills him in **7.84** turns, an Elite in **3.54**, a Boss in **2.64**. So an Elite's bulk is 4.26 / 2.01 = **2.1** and pressure 7.84 / 3.54 = **2.2**; a Boss's **7.9** and 7.84 / 2.64 = **3.0**. A Minion (70 HP, no armour, Defense 10) takes 2 of the plain hit's 45 against a Soldier's 3.5 of 40 and is hit 5% more often: **0.55**; it hits 55% of the time with weapons averaging about 21 against the Soldier's 23.4 at 65%: **0.75**. A Vermin (15 HP, one hit) **0.3**; its bite 9 at about 45%: **0.3**.

**Rounds from bulk:** the reference fights for four (rules 1.15 and 1.26): standard (3 Soldiers, 1 Elite) bulk 5.1, measured 4.3 to 6.0 rounds; elite (2 Elites, 2 Soldiers) 6.2, about 6.5; boss (1 Boss, 2 Soldiers) 9.9, 6.3 to 10.4. Bulk ÷ (4 × rounds) = 0.25, 0.24, 0.29: **`bulk_per_char_round` 0.25**. **Pressure:** the standard fight for four brings 5.2 SE of pressure (the contract's 4.4 Soldier-turns, on the hit chance): 1.3 a character, the level at which the plain rifleman lasts about 3 rounds under focused fire; solo gets 1.2 (nobody to Raise).

### 5.2 The lag, priced

On the settled curve (×1.1119 a level) one level of gap is HP and damage ×0.899 and one point to hit each way (about 5%: the party's hits ×1.077, the foe's ×0.923): bulk 0.899 / 1.077 = 0.835, pressure 0.899 × 0.923 = 0.830: **`lag_factor` 0.83** a level (0.69 for two, 0.57 for three; threat, their product, about 0.69 a level, as the level-scale spec says). A test recomputes it from `enemies.json levels.table` and fails if the field drifts more than 3%.

### 5.3 Three worked fights, and the XP curve

| Fight | Budget | Composition (template) | Bulk | Pressure |
| --- | --- | --- | --- | --- |
| Level 1, solo, depth 1 | 0.25 × 1 × 4 = **1.0**; cap 1.2 (+10%: 1.32) | 1 Soldier, level 1 (`firing_line`); map 16 × 16 | 1.0 | 1.0 |
| Level 4 party of four, depth 7 | 0.25 × 4 × 5 = **5.0** (4.25 to 5.75); cap 5.2 (5.72) | 1 Elite level 4 (2.1 / 2.2), 3 Soldiers level 3 (3 × 0.83), 1 Minion level 1 (0.55 × 0.57 = 0.31 / 0.75 × 0.57 = 0.43) (`elite_pack` used as a plain fight's anchor is not allowed: `firing_line` with an Elite slot from depth 6); 9 units: 20 × 20 | **4.92** | **5.12** |
| The final Boss, party of four, fight level 6 | 0.25 × 4 × 9 = **9.0**; cap 5.2 | Boss level 6 (7.9 / 3.0), 1 Soldier level 5 (0.83), 1 Minion level 3 (0.31 / 0.43) (`champion`); 26 × 26 | **9.04** | **4.26** |
| The same Boss, solo | 0.25 × 1 × 9 = **2.25**; cap 1.2 | Boss at share HP ×0.28, damage ×0.4 | 2.21 | 1.2 |

The solo fight: the rifleman needs 2.01 rifle-turns for the Soldier and about half his turns land as rifle-turns on a real map (the reference fights' efficiency: 2.55 ideal rounds against 5.1 measured), so about **4 rounds**; the Soldier needs 7.84 of its turns on him, so he ends near half HP. (So the template table gains: `firing_line` may take an Elite slot from depth 6.)

**XP** (from the table: level 2 at 100, 3 at 250, 6 at 2,050, 7 at 2,800, 8 at 3,550). A median path (fights at depths 1, 2, 3, 4, 6, 9, 12; Elites at 8 and 10; a shop at 5, rests at 7 and 13, a cache at 11; the Boss at 14): 100, 225, 375 (**level 3 at depth 3**), 550, 775 (level 4 at depth 6), 1,188 (gate), 1,488 (level 5), 1,975 (Elite at 10), 2,069 (cache: **level 6 at depth 11**), 2,444 (depth 12), **3,294 after the Boss: level 7**. Every node a fight: about 4,100 (level 8); fewest fights the rules allow: about 1,900 before the Boss (level 5) and 2,750 after (level 6). The band is **level 6 to 8 at the end, 7 typical.**

**Credits:** the median path earns about 2,500 before row 13 (each character), against stock of 60 to 2,400: two or three real purchases and ammunition, or one Masterwork weapon by the end.

### 5.4 What is measured before it ships

A simulated run (`test/balance/survival-run.ts`, opt-in; the simulator's policies and builds): each of the nine class builds solo and in a squad of four, 20 seeds a cell: every fight's length within ±20% of its R; the run won about **60%** by a squad of four and **40%** solo (the target, PROVISIONAL), with Downs in about one fight in three (the contract's standard-fight target). The dials, in order: `bulk_per_char_round`, `pressure_per_char`, `share`. Nothing in the balance contract moves.

## 6. The other side

The enemies use what they have today: the fire doctrine, the healer hunt, casters' AI, `skulk`. Survival adds no enemy rule. A lagging enemy dies to one hit at a gap of 5 (the gap rule); the lag never reaches it (3 at most).

## 7. Data

`data/survival.json` (kind `survival`, every number `provisional: true`): `run` (`length` 14, `start_credits` 150, `out_until` "rest"), `map` (`rows`, `kind_weights`, fairness switches), `rounds`, `bulk_per_char_round`, `pressure_per_char`, `bulk_band`, `pressure_band`, `max_foes`, `tiers` (bulk, pressure), `lag_factor`, `share`, `map_size`, `xp`, `credits`, `cache_credits`, `rewards` (`kinds`, `rarity`), `price_band`, `stock`, `sell_rate`, `armour_fit`, `templates`, `settings`, `shopkeepers`. `data/modes.json` (section 8.1). The validator checks: every template slot's tier is a tier, every caster id exists, every setting kind is a `loot_tables.json kind_tables` key and never `celestial`, every weapon pool id is in `weapons.json`, every shop focus is a focus item, the bands add up, `tiers` and `lag_factor` match `enemies.json` (a test, section 5.2).

```json
{ "id": "caster_guards", "name": "A caster and guards", "nodes": ["fight"], "from_depth": 3, "weight": 3,
  "slots": [ { "tier": "soldier", "caster": ["sigil_adept", "heart_adept"], "req": 1, "spawn": "far" },
             { "tier": "soldier", "range": "ranged", "max": 4, "spawn": "between" },
             { "tier": "minion", "max": 3, "spawn": "between" } ],
  "text": "One of them writes or burns while the rest hold the line in front.", "provisional": true }
```

```json
{ "id": "ahoc", "name": "AHOC chapter outpost", "kinds": { "human": 5, "robot": 3, "drone": 2 },
  "names": { "soldier": { "human": "Outpost guard", "robot": "Chapter sentry" }, "minion": { "drone": "Watch drone" } },
  "weapons": { "soldier": ["hellraiser_service_rifle", "legion_pdw", "lumeri_scattergun"], "minion": ["service_pistol", "decrkm_smg"],
               "elite": ["legion_bullpup", "ccec_marksman_rifle"], "boss": ["hellraiser_lmg"] },
  "boss": [ { "kind": "robot", "name": "Chapter warframe", "portrait": "boss-robot-warframe" } ],
  "backdrops": ["ahoc-a-gate", "ahoc-b-corridor", "ahoc-c-yard", "ahoc-d-vault"], "kit": "ahoc", "ground": [1, 2, 3],
  "layout": { "stamps": [ { "id": "bunker_corner", "rows": ["###", "#..", "#.c"] }, { "id": "gate", "rows": ["##D##"] } ],
              "hazard": { "kind": "toxic", "chance": 0.1 }, "objects": { "barrel": 0.3, "lamp": 0.2, "terminal": 0.1 } },
  "shopkeeper": "quartermaster", "provisional": true }
```

## 8. The screens

All through the engine's view: the client builds no cost, price, legality or choice (rule 33).

### 8.1 Choosing a mode (Leon's sketch, 13 Nov: binding)

1. **Where:** the room's lobby, "The squad". Under the players' seats ("Create a character" / "Bring a saved character"), in place of today's row "WHERE IT STARTS · THE EARTH SECTOR" and its chips (`room.template.html`, `starts.ts`), **three large cards side by side, filling the width: SURVIVAL, ROGUELIKE, CAMPAIGN.** The old chips row is gone and nothing else on this screen offers a campaign.
2. **A card:** the mode's name (Chakra Petch, caps), one line of what it is (Survival: "A road of fights, shops and rests to a Boss. Solo or co-op, no Narrator needed."; Roguelike: "Dungeons, a world map and companions."; Campaign: "A written story with a Narrator."), its painting by catalog id (Survival `survival-card-title`, the brief's `title-survival.png`; Campaign `world-pilot`; Roguelike none yet), a plain panel (`#1C2536` on `#10151F`, the AHOC seal in white ink) until the art lands, and a **check mark with the word "Selected"** on the room's mode.
3. **Selecting:** the host clicks an available card: `{type: 'settings', patch: {play: 'survival'}}` (host only: a guest's click says "Only the host picks this." through the hover card). One is selected at a time. Guests see it change live: it is room state, relayed as every lobby setting already is (host-authoritative; the room's state goes out to each guest).
4. **Locked:** Roguelike and Campaign carry a lock mark, are dimmed, and say **"Coming"** under the name (never colour or opacity alone); they can't be selected; a click or hover shows through **the one hover card** (`actionTip.ts`, never a native tooltip) when it comes: "Coming after the advanced classes." / "Coming when the campaigns are rewritten." The lock is **data**: `data/modes.json` `items: [{id, name, line, art, available, coming}]` with `available: true` only for `survival`; unlocking is one edit, like M813's `listed`.
5. **Campaign, later:** when it unlocks, selecting it opens a story selector (M813, today `"listed": false`, and "Load a campaign file…" live there). **Meanwhile "Load a campaign file…" moves under the locked Campaign card and is hidden with it;** the `campaign/load` action is unchanged, and the test hook that lists M813 for the browser suites also unlocks the Campaign card and its selector, so the suites that load a campaign keep working.
6. **Default:** a new room selects **Survival** (the only open mode). An old save with no `settings.play` and a campaign under way reads `campaign`.
7. **The Proving Ground** keeps its entry: a text button under the cards, left of Start, "⚔ Proving Ground · practice range", small and not card-shaped, so it reads as a tool, not a fourth mode (and on the title screen as today).
8. **The Narrator panel** (right side: provider, key, model, tone): **collapsed, not hidden,** when Survival is selected: one line, "Survival needs no Narrator.", and a quiet "Add a Narrator for flavour (optional)" that expands the panel. Why not hidden: a player with a key keeps the flavour door, and a guest sees why nobody is asked for one; why collapsed: a new player is never asked for an API key to play. Campaign (when it unlocks) opens it as today.
9. **Start:** Survival: `run/start` (host; every seat locked in with a level 1 character, else the engine's reason) → the path map. Campaign: today's `session/start`. The reducer records `settings.play` and, once started, `g.run`, so a saved room resumes in its mode.
10. **Layout:** 1280 × 720: the cards in a row, about 200 px tall, painting above, name and line below; 1440 × 900: about 240 px; 1920 × 1080: the row capped at the screen's content width, cards at 4 : 3 for the painting; with the right panel expanded the three share the narrower column; under 900 px wide they stack to one column as rows (thumbnail left, words right). **Keyboard:** the cards are a radio group (`role="radiogroup"`, each `role="radio"`, `aria-checked`); arrow keys move, Space or Enter selects; locked cards are focusable and announce "locked, coming". **Colour:** the selected card's border and check in white `#FFFFFF` (chosen / still to do) with the word; locked text muted `#A3AEC2` with the lock glyph; no attribute ink (no mode has a colour meaning).

### 8.2 The run's screens

- **Path map:** the painting Leon picks (`survival-map-display` or `survival-map-aerial`) under nodes and paths drawn by the UI; each node an icon **and a word** (Fight, Elite, Shop, Rest, Cache, Boss) and its setting's name on hover; walked paths solid, reachable next nodes lit, the party's tokens on its node; in co-op each player's lean as a small portrait on the node, and "Waiting for 1 player" / the host's Go. The depth ("Node 6 of 14") and each character's level, HP and credits along the edge.
- **Node card:** the scene painting (`nodes/`: shop by shopkeeper, rest, Elite lair, Boss door, cache; a fight: one of its setting's backdrops), the kind, the setting; for a fight "Enter" (the foes are seen on the map, through the fog, as any fight).
- **Reward pick:** three cards per character through the one hover card (the item's own card: icon, rarity, price, text); Take. Co-op: each picks their own; the map waits for everyone (the host can skip an away player, as in story mode).
- **Shop:** the shopkeeper's portrait and line; stock with painted gear icons, rarity, price, and the engine's reason when it can't be bought; Buy; a Sell tab (the pack, each with its sell price); the ammunition counter; Armour fitting.
- **Rest:** the medic's portrait, what the rest gives (the engine's `REST_INFO` long line), the dead coming back; Rest.
- **Summary:** the run-won or run-over card (`cards/`), the path drawn, the table of fights, levels and classes reached; "Report a run" and "Back to the room".
- **Level-up:** the existing screen, opened from the map when a character has points; a node can be entered with points unspent.

**Art for `art/briefs/ART-REQUESTS.md`** (to list, not edited here): node-kind icons (six, Wick flat ink, artist); the lean and party tokens and path lines (SVG, Claude); the lock mark (line icon, Claude); a Roguelike card painting (artist, later).

## 9. Out of the first version, on purpose; and what it must not block

**Out:** designed rooms; the five dungeons; the world map; missions; per-player meta progression and unlocks (it needs an identity that outlives a room); companions and dialogue trees; account cosmetics; trapped caches; "rest or train"; difficulty settings (one difficulty, section 11); body armour as items (Equipment 2.0). **Must not block:** the node map as a dungeon map (nodes are `{id, depth, col, kind, setting, links, room: null}`: a node can later hold a designed room id); rooms attached to nodes (the generator takes "a room's slots" in place of a template's); the shop NPC with a face and stock rules (shopkeepers are data, with bias and lines); settings as data (a new setting is a JSON row and a kit folder); more node kinds (an event, a mission giver: `giver-mission` is already painted).

## 10. Build plan (one version after Classes 3.0; the first playable at step 3)

| Step | What | Reuses | Proof | Care |
| --- | --- | --- | --- | --- |
| 1 | The mode picker (8.1), `data/modes.json`, `settings.play`, the chips row gone, the Narrator panel collapsing; `g.run` skeleton, `run/start`, `run/end`; refusals | `settings` action, the room's relay, the sandbox's pattern | `npm run e2e -- room` (a locked card can't be picked; a guest sees the host's pick); old-save fixture loads as `campaign` | Opus (saves) |
| 2 | Path map (rules 7 to 12), `rngFor` | `rng.ts` | 1,000 seeds: every fairness rule holds; same seed same map (a hash) | Opus |
| 3 | Encounter generator (15 to 20, 22) on `open_ground` cropped; node flow: fight, XP, credits, reward pick, rest, loss and win, levelling between nodes; the summary. **First playable.** | `startCombat`, `sbBegin`, `giveXp`, `applyRest`, `beginSession`, the loot roller | every seed × party size × depth composes inside its bands; `npm run try` with a generated fight; the replay guard on a seeded run | Opus (the budget, determinism) |
| 4 | The fight tally and Report a run | `fxTaps`, `report.ts` | a seeded fight's tally equals the log's sums | Sonnet, from a list |
| 5 | Layout generator, map sizes (21, 4.3) | `readLayout`, `startGap`, `deployEnemy` | 1,000 seeds: two lanes, gap, cover share, no hazard on a start | Opus |
| 6 | Kit drawing with fallbacks; catalog entries for the AHOC kit | the renderer, `sprites` | `npm run e2e -- layout`; a map with no kit draws as today | Sonnet |
| 7 | Prices for every item, `priceOf`, credits, shop, sell, fitting, shopkeepers | `price_credits`, `rules.json rarity` | the validator: every stocked item priced; a buy and a sell through the reducer | Sonnet, then the lead's check |
| 8 | Simulated runs (5.4) and the fit of the three dials | `test/balance` | the targets in 5.4 | the lead |
| 9 | The browser suite `survival` (seed fixed, solo: node 1 played by hand to a win, then a tests-only `run/skip` that wins a fight, refused unless the room's test flag is on, through rewards, level 3's class, a shop buy and sell, a rest, the Boss, the summary and its export); docs, CHANGELOG, version | `apps/web/e2e/groups.json` | `npm run e2e -- survival` | Sonnet |

**Playtest checklist entries** (`docs/PLAYTEST-CHECKLIST.md`): a solo run to depth 4 (fights feel 4 to 5 rounds, the map small); a co-op run's lean and tie; reaching level 3 mid-run and picking the class; each of the nine classes' door works from node 1 with its kit; the shop with too few credits says why; a death and the return at a rest; the trash outgrown by level 5 (one or two hits); the Boss at four and solo; Report a run opens and reads.

## 11. Open questions for Leon (each with the recommendation; built as recommended if unanswered)

1. **Run length and level:** 14 nodes, level 6 before the Boss and 7 on the win (6 to 8 by route). **Recommend as written;** a longer run (to rank III at 12) is the roguelike's job.
2. **Death:** a character who dies is out until the next rest, and the run ends only when everyone is Down; or a death ends the run. **Recommend out until a rest** (co-op keeps playing; solo already ends on the Down).
3. **Selling:** in, at 25%. **Recommend yes.**
4. **Keeping a run's character:** can it be saved as a draft and brought into other rooms? **Recommend: yes, saved as a draft at its level** for the Proving Ground and (later) campaigns; a Survival run always starts at level 1.
5. **Difficulty settings:** **one difficulty in v1**; a Hard switch later is one field (`bulk_per_char_round` ×1.25).
6. **The name:** **Survival** *(Leon's)*.
7. **Co-op choice:** most leans, the host breaks a tie, the host may go at once. **Recommend as written.**
8. **Credits:** each character's own purse, every character earning the full amount (as XP). The alternative, one party purse, makes co-op shopping a negotiation. **Recommend own purses.**
9. **Solo scaling:** a Boss at 28% HP and 40% damage alone; or solo gets an engine-run companion. **Recommend the scaling now;** companions are stage 2.
10. **The lead's calls made here:** a mode, not a generated campaign (rule 1); trapped caches cut; no "rest or train"; a rest is a new session; ammunition never sold out; armour fitting as a service until Equipment 2.0; firing lines may hold an Elite from depth 6; no Celestial enemies; the Narrator panel collapsed, not hidden.
