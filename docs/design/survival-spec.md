# Survival: the first real game mode, and the roguelike's first piece (spec, 13 Nov 2026; draft 3)

Status: **a spec for the patch after Classes 3.0; nothing here is built.** Frame: `docs/ROADMAP.md` "Survival mode" and "The roguelike: Leon's scope" (the lead's notes a to e), decision 115; `balance-contract.md`; `level-scale-spec.md` and its "Settled by Leon" block (×7.5 at level 20, ×1.1119 a level) and section 6 (the lag, ruled in); `class-roster-rev4-proposal.md`; `campaign-format.md`; `handoffs/engine-foundations-3-item-ops.md` (the `relic` kind); the art brief `art/briefs/GPT-PROMPTS-2026-11-13-survival.md`. Every number is **PROVISIONAL** and lives in a named field of a new `data/survival.json` (modes in `data/modes.json`); each becomes a spec section 14 item when built. Names marked *(Suggested)* are Leon's to change; the lead's calls are in section 12.

**Leon's rulings (13 Nov, binding):** *"I just want a mode you can play with progression and combat."* *"This path leads to a shop, that path to a boss, that one to a free rest."* *"I want to test all these [Classes 3.0, the level scale, the new art] in Survival."* The lobby sketch (section 8.1). And: *"Shop must sell all ammo or the gunner is mega dead. Give XP, weapon and credit. After the boss we move into another tile with another 15 nodes; give a big passive buff after the boss."*

**Settled by Leon (13 Nov, on draft 2's questions; binding):**
1. **Death:** a character who dies in a fight is out for that fight and waits for the team; **if the team wins, it comes back at 1 HP** (not "out until the next rest"). The run ends when the whole party is down. (Rules 4, 5 and 24.)
2. **The difficulty curve** as written: accepted (its target: a squad of four ends in stage 3 or 4, solo in stage 2 or 3). Section 11 adds gear to the party's side, so the dial that holds that target moves (rule 19, question 3).
3. **A focus's rarity adds its accuracy to its door's rolls:** accepted "for now" (rule 25a; a new primitive, section 4.2 item 9).
4. **Boons** as written: accepted (section 3.5).
5. **Solo Boss scaling** (28% HP, 40% damage): accepted (rule 20).
6. **Selling at 25%, each character's own purse, keeping the run's character as a draft:** accepted (rules 2, 27, 35).
7. **New:** *"In the shop you can upgrade the grade of your weapon with many money."* And the larger complaint, in his words: *"progression is a thing, right now we only reach 'refill to continue', nothing really progresses except for level."* Answered by section 11, In-run progression.

## 1. The fantasy and the loop

A squad of one to four makes characters at level 1 and walks a branching road of fights, shops and rests to a Boss; beating it, they take **a big passive boon** and move to **another tile of the world**: a new setting, a fresh path, harder. **Survival is endless in stages; how far you get is the score.** Every fight is generated for this squad at this depth and stage, from the enemy table and the balance contract; ordinary enemies fall behind as you level (you feel the power you gained), Elites and Bosses keep pace and, stage by stage, pull ahead. After each fight: XP, credits, ammunition, and a weapon from three (or credits instead). **No Narrator is needed:** the engine decides everything; a Narrator in the room only adds flavour.

**The loop of a node:** choose the next node on the path map (its kind is shown) → it plays (a fight on a generated map; a shop; a rest; a cache) → rewards → level up if earned → the map. **The loop of a stage:** 15 nodes → the Boss → pick one boon of three → pick the next tile of two or three, or retire with the score.

**Worked example: seed `PHC-0001`, two players, stage 1, the first four nodes.** Kade (built for Durability: the soldier kit, the service rifle, Class 3) and Ha (built for Empathy: the `mender` kit, a pistol and an Attuner), level 1, 150 credits each. Stage 1's tile: the AHOC outpost (its gate and Boss in the same setting).

| Node | Offered | Picked | Generated | Budget (target · spent; section 5) | After |
| --- | --- | --- | --- | --- | --- |
| 1 | Fight · Fight (rows 1 and 2 are plain fights) | left | `firing_line`, kind human: 1 Soldier (service rifle), 2 Minions (pistol, SMG), all level 1; 16 × 16 (5 units) | bulk 0.25 × 2 × 4 = **2.0** · 1.0 + 2 × 0.55 = **2.1**; pressure cap 2.5 · 1.0 + 2 × 0.75 = **2.5** | won in 4 rounds; **100 XP → level 2**; 100 credits; a magazine's worth for each gun carried; Kade takes a Fine Legion PDW of three; Ha takes credits instead (50% of the cheapest offer) |
| 2 | Fight · Fight | right | `swarm`, kind robot: 4 Vermin and 1 Soldier, level 1 (at fight level 2 the lag is floored: a gap of 1); 20 × 20 | **2.0** · 4 × 0.3 × 0.83 + 0.83 = **1.83** (−8.5%, inside ±15%); pressure 1.83 | **122 XP → 222**; 120 credits; ammunition; a weapon pick |
| 3 | Fight · Shop · Cache | leans split 1–1; the host's lean (Kade): Fight | `caster_guards`: a Sigil adept and 2 Soldiers, level 1 | 0.25 × 2 × 5 = **2.5** · 3 × 0.83 = **2.49**; pressure 2.49 ≤ 2.5 | **144 XP → 366: level 3**: the level-up screen gives Kade the Bulwark, Ha the Mender (rules 1.29) |
| 4 | Rest · Elite · Fight | Rest | — | — | a long rest and a new session (Echo 1); each takes a training (rule 39): Kade 100 drill on his rifle, Ha 2 Devotion XP; the map |

## 2. Rules

Adjudication: every rule is `engine`, except the optional Narrator flavour (rule 33), which decides nothing.

**The mode and the run**
1. **Survival is a MODE chosen in the room** (section 8.1), not a campaign: `settings.play` is `survival`, `roguelike` or `campaign` (`data/modes.json`; only Survival is available). The run's state is `g.run` beside `g.campaign` (rule 36). Why not a generated campaign: the campaign format is Narrator content loaded once (`arc`, `opening` required; `campaign/load`), while a run is state changed by every action and replayed from the event log; the Proving Ground already shows the working pattern (`g.sandbox`, its `sandbox/*` actions, Narrator and story actions refused). The run carries a generated campaign *shell* (id `survival`) whose `zones` are the fights' generated maps, so every map reader (`zoneMap`, fog, objects) works unchanged.
2. **Who plays:** one to four players, one character each, all **level 1**, made in the room or brought as a level 1 draft (a draft above level 1 is refused: "Survival starts at level 1."). Each starts with its creation kit (rule 28) and `start_credits` 150.
3. **Stages:** a stage is **15 nodes** on any path (`stage.length`), the 15th its Boss. Winning the Boss gives a boon (rules 30 to 31) and the next stage on a new tile (rule 32). Levels, gear, credits, boons and Devotion carry; the stage number raises the budget (rule 19).
4. **The end:** only by **losing** (a fight ends `loss`: `checkOver`, every character Down or dead, nobody standing to Raise; a solo character Down is a loss) or by **retiring** after a Boss (`run/retire`, host). Either way the summary keeps the score: stages cleared, nodes walked, levels, boons (rule 35), and each character is **kept as a draft at the level it reached** for other rooms (Leon, 13 Nov; a run itself always starts at level 1, rule 2).
5. **Death inside a run** (Leon, 13 Nov): a character who dies in a fight is **out for the rest of that fight** (it can't be Raised; it waits for the team). **If the team wins, it comes back at 1 HP** at the fight's end, with its gear, and takes its full share of the fight's rewards (XP, credits, the ammunition pack, its pick): the team won. If the team loses, the run is over (rule 4). Downed characters in a won fight stand at 1 HP (`unitToCharacter`, as today). A death costs nothing past the fight it happened in (question 4).
6. **Level 20 is the cap:** XP past it counts only to the score (`renown`).

**The path map**
7. **Rows:** 15 rows. Rows 1 and 2: 2 to 3 nodes, **plain fights**. Rows 3 to 7 and 9 to 13: 2 to 4 nodes, kinds rolled (rule 9). **Row 8: the gate**, one ELITE node every path passes. Row 14: one REST and one SHOP. Row 15: the BOSS. About 40 nodes.
8. **Links:** each node links to 1 or 2 nodes of the next row within one column of its own; links never cross; every node has a way in and out. The whole map, with every node's KIND, is visible from the start; what a fight holds is rolled on entry.
9. **Kinds of open rows** by weight (`map.kind_weights`): fight 44, cache 12, event 10, elite 12, shop 12, rest 10 (draft 2: fight 50, cache 16, no event; section 11 adds the event). **Fairness, repaired deterministically, never rerolled:** no Elite before depth 4 or in rows 7 and 9; no two Elites, shops, rests or events linked; no rest in row 13; **every path holds a shop in rows 3 to 7 and another in rows 9 to 13, and a rest in rows 3 to 13** (a pass over all paths, row by row; where a path lacks one, its plain fight with the fewest paths through it becomes that kind). So a gunner is never more than six nodes from a shop.
10. **The tile's setting** is the stage's (one of the six, section 3.3); the Boss and the gate belong to it.
11. **Choosing (co-op):** each player marks a reachable node (`run/lean`); the marks show live; when every connected player has leaned, the node with most leans is entered; a tie goes to the host's lean; the host may go at once (`run/go`). Solo: a click goes. Built like the Proving Ground's READY marks. The boon (rule 30) is picked the same way per character, the next tile (rule 32) the same way as a node.
12. **Seeded:** each stage's map comes from the run's seed through its own stream (`rngFor(seed, 'map#' + stage)`, section 4.2); each node's encounter, offers and stock from `rngFor(seed, node id + purpose)`. A shared seed gives everyone the same run (a daily seed later). Fights' dice come from `g.rng`, as every fight's.

**Node kinds**
13. **FIGHT, ELITE, BOSS:** generated encounters (rules 15 to 22); an ELITE has at least one Elite; the BOSS a Boss and its guard. **SHOP** (rules 25 to 27), **REST** (rule 24), **CACHE:** a pick of three armour pieces or items (at least two of them lasting: a mod or a worn piece, rule 41), credits and ammunition, no fight. **EVENT:** a trade, no fight, no check (rule 42). *Cut on purpose:* trapped caches (a trap needs a check and a judged consequence; it comes with the roguelike's rooms).
14. **What each node gives** (section 3.1 has the numbers; section 11.3 what lasts): every won fight gives XP, credits, the ammunition pack (rule 23), drill for every kill (as today) and a weapon pick (three weapons, or credits instead); an Elite also an armour-or-item pick with a lasting piece in it; a cache an armour-or-item pick; an event a trade; a rest a training (rule 39); a shop the grade service (rule 37); a Boss a better weapon pick and the boon. **Every node leaves something that lasts.**

**The encounter generator** (it is the roguelike's too)
15. **Input:** the party (levels, size, who stands), the node's kind and depth, the stage and its setting, the seed. **Output:** foes (`FoeSpec`: tier, weapon, kind, level, caster, tags, scale, spawn zone) and a map (rule 21).
16. **The budget unit is the Soldier-equivalent (SE),** on two axes (section 5.1): **bulk** (rifle-turns to remove it ÷ a Soldier's) sets the fight's length; **pressure** (Soldier-turns it deals a round) caps its danger. Per tier at equal level (`tiers`): Vermin 0.3 / 0.3, Minion 0.55 / 0.75, Soldier 1.0 / 1.0, Elite 2.1 / 2.2, Boss 7.9 / 3.0.
17. **A fight's budget in stage 1:** bulk = `bulk_per_char_round` **0.25** × party size N × target rounds R; R (`rounds`): a plain fight 5 (depths 1 and 2: 4), Elite and gate 6.5, Boss 9. Pressure cap = `pressure_per_char`[N] × N (1.2 solo, 1.25 for two, 1.3 for three or four). Accepted with bulk within **±15%** (`bulk_band`) and pressure at most **+10%** over the cap (`pressure_band`). At most `max_foes`[N] foes: 4 / 6 / 8 / 10.
18. **The lag (Leon's rule, level-scale section 6):** fight level = the party's average, floored (`enemies.json levels.fight_level`); a foe's level = max(1, fight level − lag): **Vermin and Minions 3, Soldiers 1 (2 from fight level 10), Elites and Bosses 0** (the `lag` field on each tier row). The floor makes the lag grow as the run goes. Priced at ×`lag_factor` **0.83** a level of gap on bulk and pressure (section 5.2): a lagging fight keeps its length with more bodies, not stronger ones.
19. **The stage term (the endless curve):** stage s multiplies the bulk target by `stage.bulk` = 1 + **0.35** × (s − 1) (draft 2 had 0.25; Leon accepted the curve's target, and section 11.6 shows gear would let a party of four reach stage 5 at 0.25, so the dial moves to hold the target: question 3) and the pressure cap by `stage.pressure` = 1 + **0.15** × (s − 1); **Elites and Bosses stand `stage.elite_up` = min(s − 1, 3) levels above the fight level** (never above 20; the gap rule's to-hit both ways applies; priced ×1.2 a level, the lag factor's inverse). When `max_foes` is reached, or the pressure cap stops another foe, and the bulk is still short, every foe takes the rest as `scale.hp` (rule 20; HP adds bulk, not pressure). Difficulty grows about 35% a stage in length and 15% in danger, faster than what a stage adds to the party: its levels (ratio-neutral under the level scale, except the lag), one boon (about +10%) and its gear (a grade step, about +8%, in stages 1 and 2; a mod or a relic property after; section 11.6): a run ends.
20. **Party size and the big units:** an Elite or Boss alone can exceed a small party's whole budget, so it spawns scaled (`share`, by N: Boss HP ×0.28 / 0.5 / 0.75 / 1, damage ×0.4 / 0.6 / 0.8 / 1; Elite HP ×0.7 / 0.9 / 1 / 1, damage ×0.55 / 0.8 / 1 / 1) and costs its scaled bulk and pressure. The Elite-and-Boss guard (rules 1.17) holds on the scaled HP.
21. **Composition by template** (section 3.2, data): (a) eligible templates by node kind, depth, setting kind and N; weighted, never the last fight's; (b) its required slots (the anchor); (c) its optional slots in order, each the cheapest fill keeping pressure under the cap, until bulk is in the band or `max_foes`; (d) if the band can't be met: drop optional slots, swap a Soldier for two Minions, then the next template; (e) weapons from the setting's pools by tier and kind, casters from `enemies.json casters` / `soul_casters`, tags (`skulk` for an ambush) from the slot. **Never a Celestial** (the Accords: an uncaused appearance is a catastrophe).
22. **The map** (section 4.3): size from the units (`map_size`: up to 6 units 16 × 16, up to 10 20 × 20, else 26 × 26), built from the setting's stamps, checked (two lanes, start gap 10 to 14, cover share), `open_ground` cropped after 8 tries. Squad on the west edge; foes by the template. **Deterministic:** only the seeded stream and sorted lists; the same seed, party and node give the same fight (a resumed run re-enters it).

**Rewards, ammunition and the shop**
23. **Ammunition never runs out between shops:** after every won fight each standing character gets **a magazine's worth of rounds for every gun it carries** (hand or pack; `ammo_pack` 1, an Elite 2, a Boss 3; for loose-loaded guns a magazine's capacity of rounds), and **one standard core** if it carries a Sigil or Visualizer focus. Enemies' rolled drops (`loot_tables.json`) stay on the field's piles as today. The arithmetic is in section 5.4.
24. **REST (free):** `applyRest(g, 'long')` (all HP, MP full, toxins and other persistent class resources restocked, per-rest uses back, a day for Devotion's counter) and **a new session** (`beginSession`: Echo 1, per-session uses such as a Miracle back); **and each character takes one training** (rule 39: drill, study, practice or Devotion), a lasting gain on top of the heal, never instead of it. (Draft 2 had no training; the dead no longer wait for a rest: rule 5.)
25. **SHOP: two parts.** **Always stocked, never sold out, fixed fair price** (`shop.always`): rounds of **every calibre the engine knows** (rifle, .32 Decrkm, revolver, .50 frontier, .700, shell, arrow, bolt, 40 mm grenade, rocket, fuel canister, core charge: 12) and a magazine, speedloader, drum or belt for every gun the party carries; the four special rounds (`ammo_armor_piercing`, `ammo_hollow_point`, `ammo_incendiary`, `ammo_enhanced`); thrown consumables (frag, smoke, flashbang and incendiary grenades, throwing knives); **standard cores** (Sigil, Visualizer and the core rifle); **spare parts**, **stims**, **field kits**, ration packs; and the **restock** service (refill a persistent class resource, such as toxin doses, at `restock_price` a point). *Why these:* each is what some build spends every fight; a class must never be dead in the water because a shop rolled badly. **Rolled** (`stock.slots` 8: 3 weapons including foci and mana arms, 2 armour pieces or mods, 2 items, 1 rarer piece), at the depth's price band (rule 26), rarity standard 70 / fine 25 / masterwork 5 (from stage 2: 50 / 35 / 15; from stage 4 relic 5); shared stock, first buyer; each character pays from its own credits. **Armour fitting** service: the next armour class for `armour_fit` (class 2 250, 3 600, 4 1,200) until Equipment 2.0 makes body armour items. **The grade service** (Leon, 13 Nov): raise a carried weapon's or focus's rarity one step for credits (rules 37 and 38, section 11.2).
25a. **A focus's rarity counts on its door** (Leon, 13 Nov, "for now"): a focus in a hand adds its rarity's `acc` (Fine +1, Masterwork, Relic and Celestial +2) to its door's rolls to hit (a Sigil's, an Outburst's) and to the save TN of its door's forced saves (a Bond's); the same number `rarity.acc` a weapon adds to its attack today (`combat.ts` unit build). Heals and shields are landed and gain nothing from it. One reading, no new number (section 4.2 item 9).
26. **The weapon pick:** three weapons rolled by price band (price at most 300 + 150 × depth + 1,000 × (s − 1); ×1.25 from an Elite, ×1.5 from a Boss) and rarity (`rewards.rarity`: a fight standard 75 / fine 25; Elite fine 60 / masterwork 35 / relic 5; Boss masterwork 70 / relic 25 / celestial 5); **foci and mana arms count as weapons** (the Evoker, Emanator, Visualizer and Attuner at a better rarity; the core rifle, spellslinger pistol, Evoker blade, Emanator gauntlet, censer gun, thread banner, grand staff; the Emanator katana when it is in data); **one of the three is always for the character's own door or most-used weapon category**, so every class has something to want. **Or credits instead** (`instead_rate` 0.5 of the cheapest offer's price), so nobody takes junk. The armour-or-item pick (Elite, cache) works the same way from `items.json` armour, mods, tools and consumables.
27. **Prices** (one door, `priceOf(item, rarity)`): `price_credits` × `rules.json rarity.<r>.price`. Today **122 of 128** items and weapons have a price; missing: `city_id`, `bank_card`, `grimoire` (plot items: never stocked or sold) and `beast_bite`, `figment_claws`, `figment_edge` (`stock: false`). **To add:** a round price per calibre (`weapons.json calibres[].round_price`; section 7's table; the special rounds' `price_mult` reads it), a magazine's price (its rounds' + 10). **Selling** (Leon, 13 Nov): at `sell_rate` **0.25** of the price at the item's own rarity (`priceOf(item, rarity)`: a graded weapon sells for its grade, never for what its steps cost); plot items and the unpriced can't be sold.
28. **Starting kits by build:** the creation kit step (`character.ts KITS`) gains `rigger` (a Visualizer, the service pistol, 4 standard cores) and `mender` (an Attuner, the service pistol, a field kit), if Classes 3.0 has not added them; preselected by the door skill with most points (Brain Power `sigil`, Visualization `rigger`, Will Power `soul`, Empathy `mender`, else `soldier`) and changeable. Every kit carries **three spare magazines** (or 3 × capacity of rounds) for its gun: enough for the first three fights with no shop (section 5.4).
29. **Carry between nodes:** HP, MP, ammunition, Strain and what else a fight leaves, Devotion and its XP, items, boons. A node is a new scene (`g.story.scene.n`): per-scene uses come back.

**Stages, boons and the world**
30. **The boon:** after each Boss every standing character picks **one of three boons** (section 3.5), rolled from the tile's boon pool; a boon is a **`relic` item** (the kind `effects/collect.ts` loads at run time with `addItems('relic', …)`; a character carries it in `c.relics`): the same thing the roguelike's relics and meta-progression unlocks will be. A boon lasts the run.
31. **Boon caps:** each boon is priced in percent of a rifle-turn (section 5.5); a character's boons add up to at most **`boon_cap` 50%**, **counting a Relic weapon's or focus's named property and an event's relic** (section 11: one run-power budget, every source of it priced the same way); an offer that would pass it is replaced by a utility boon (no rifle-turn worth). No boon twice.
32. **The next tile:** after the boon, two or three **world tiles** are offered (`world.offer` 3), each a setting not yet played this run where possible, showing its name, backdrop, Boss portrait and its **boon pool's theme**; picked like a node. The world is a row of tiles the party walks (`g.run.world: [{id, setting, stage, links, boons}]`), shaped as the roguelike's world map later: a tile is a node of a larger graph, with a setting and a pool, to which the roguelike adds points of interest and dungeons.
33. **A Narrator is optional flavour.** With an AI or human Narrator in the room, entering a node or a tile asks it for one to three sentences (kind, setting, template, foes given; no check, no number, no voice hook); shopkeeper and Boss lines are data first. The request never blocks play. Without one, the data lines carry the mode.
34. **Classes 3.0 test bed:** each of the nine classes is playable from node 1 (rule 28), restocked at every shop (rule 25); class at level 3 at about depth 3, rank II (level 6) at about depth 12 of stage 1, rank III (level 12) in stage 3.
35. **The summary and Report a run:** the summary shows stages cleared, nodes, the path, each fight's rounds, kills, Downs, levels, classes and boons. **Report a run:** the "Report a problem" bundle (`apps/web/src/game/report.ts`) with a `run` part: seed, stage tiles, builds at start and end, boons, and per fight: node, stage, kind, setting, template, budget asked and spent, foes (tier, level, kind, weapon, caster, scale), rounds, outcome, per unit damage dealt and taken by system (weapon, Sigil, Outburst, prayer, Figment, Bond, Shadow, other), heals and shields, Downs, deaths, rounds fired: from a fight tally on the fx stream (section 4.2), kept in `g.run.stats`.
36. **State and saves:** `g.run` = `{seed, stage, world, nodes, at, path, state, leans, offers, shop, stats, out, renown}`; every change is a `run/*` action (`run/start`, `run/lean`, `run/go`, `run/pick`, `run/buy`, `run/sell`, `run/fit`, `run/restock`, `run/upgrade`, `run/rest`, `run/train`, `run/trade`, `run/leave`, `run/boon`, `run/tile`, `run/retire`); the event log is the save; a room left and loaded resumes at the same node. Story and Narrator actions are refused as in the Proving Ground, except the flavour turn, `levelup/*` and `gear/*`.

## 3. The lists

### 3.1 What each node gives (stage 1; d = depth 1 to 15; later stages: XP × `stage.xp`, credits × `stage.credits`, section 11.1)

| Kind | Where | Rounds | XP | Credits | Ammo pack | Picks |
| --- | --- | --- | --- | --- | --- | --- |
| fight | rows 1, 2 (only), open rows | 5 (4 at d 1, 2) | f(d) = 100 + 22 × (d − 1) | c(d) = 80 + 20 × d | 1 | a weapon of 3, or credits |
| elite | open rows from d 4; row 8 (gate) | 6.5 | 1.5 × f(d) | 1.5 × c(d) | 2 | a weapon of 3 (elite rarity), and armour-or-item of 3 |
| boss | row 15 | 9 | 2 × f(d) | 2 × c(d) | 3 | a weapon of 3 (boss rarity); a boon of 3; the next tile |
| shop | open rows; row 14 | — | 0 | — | the always-stocked counter | buying, selling, services, the grade step (rule 37) |
| rest | open rows (not 13); row 14 | — | 0 | — | — | the long rest and a session; one training each (rule 39) |
| cache | open rows | — | 0.25 × f(d) | 1.5 × c(d) | 1 | armour-or-item of 3, at least two lasting (rule 41) |
| event | open rows | none | 0 | 0 (it trades) | none | one trade of two or three, or walk on (rule 42) |

### 3.2 Templates (`templates`; slots in order; "req" first)

| Id | Name *(Suggested)* | Nodes, from depth | Slots | Spawn |
| --- | --- | --- | --- | --- |
| firing_line | A firing line | fight, 1 | req 1 Soldier (ranged); opt Soldiers, Minions; an Elite slot from depth 6 | far edge, behind cover |
| swarm | A swarm | fight, 1 | req 3 Vermin; opt Vermin, Minions (melee), 1 Soldier | near, spread |
| rush | A rush | fight, 2 | req 2 Minions (melee); opt Soldiers (melee or shotgun) | the minimum start gap |
| caster_guards | A caster and guards | fight, 3 | req 1 caster (Sigil adept or Heart adept); opt Soldiers, Minions | caster far, guards between |
| ambush | An ambush | fight, 3 | req 2 Soldiers or Minions tagged `skulk`; opt Minions | flanks, hidden start |
| healer_line | A line with a medic | fight, 5 | req 1 healer caster (Sigil novice with MEND, or Heart adept); opt Soldiers | far, the healer behind |
| machines | A drone screen | fight, 2; kinds robot, drone | req 2 Minions (drone); opt Soldiers (robot) | split |
| elite_pack | An Elite and its line | elite, 4; gate | req 1 Elite; opt Soldiers, Minions | far; the Elite central |
| warden | A warden | elite, 8; gate | req 1 Elite caster (Sigil warden or Heartfire elite); opt Soldiers | far |
| twin_elites | Two Elites | gate, N ≥ 3 | req 2 Elites; opt Minions | split |
| champion | The champion | boss | req 1 Boss (the setting's pool; Sigil magister or Heart sovereign possible); opt Soldiers, Minions | far, central |

### 3.3 Settings, the world's tiles (`settings`; art by the brief's names)

| Id | Name | Enemy kinds (weights) | Boss (portrait) | Stamps (examples) | Hazard | Boon pool theme |
| --- | --- | --- | --- | --- | --- | --- |
| ahoc | AHOC chapter outpost | human 5, robot 3, drone 2 | Chapter warframe (`boss-robot-warframe`) | bunker corner, gate with door, crate stacks | toxic 10% | discipline: AP, Echo, accuracy |
| city | Central City back streets | human 5, crawler 3, drone 2 | a Crawler elder (`elite-crawler`) | alley wall with door, stall row | fire 10% | streets: credits, Shadow, reflexes |
| field | Daggerfall-type battlefield | ork 4, human 3, beast 2, cursed 1 | Ork warlord, mana-warped beast | trench line, craters (difficult) | fire 15% | war: damage, Momentum, Lifeline |
| works | Machine works and drone foundry | robot 4, machine 3, drone 3 | Chapter warframe | machine rows (pillars), conveyor walls | toxic 15% | machine: ammunition, cores, armour |
| shrine | Shrine and cathedral district | human 4, cursed 3, upper_realm 2 | an upper-realm patch | colonnade, pews (low walls) | none | faith: Devotion, MP, regeneration |
| rim | Rim station | robot 4, drone 3, machine 2, human 1 | Chapter warframe | bulkhead with door, containers | toxic 10% | survival: damage taken, Guard, regeneration |

Each setting also names its foes by tier and kind, its weapon pools by tier and kind, its ground textures, backdrops `<setting>-a..d`, kit (section 4.3) and shopkeeper.

### 3.4 Shopkeepers (`shopkeepers`; the first form of the roguelike's shop NPC)

| Id | Name *(Suggested)* | Portrait | Settings | Rolled stock bias | Rolled prices |
| --- | --- | --- | --- | --- | --- |
| quartermaster | the chapter quartermaster | `shop-quartermaster` | ahoc, rim | weapons and armour ×1.5 | ×1.0 |
| dealer | the back-alley dealer | `shop-dealer` | city, field | items and mods ×1.5 | ×0.9 |
| trader | the Smetanita trader | `shop-trader` | works, shrine | foci, mana arms ×2 | ×1.15 |

The always-stocked counter is the same price everywhere. Each shopkeeper has five written lines (greet, bought, can't afford, sold to, leave). The rest's face: `rest-medic`.

### 3.5 Boons (`relic` items in `data/survival.json boons`; one number each; worth in % of a rifle-turn, section 5.5)

| Id | Name *(Suggested)* | Pool | What (one number) | Built from | Worth |
| --- | --- | --- | --- | --- | --- |
| boon.edge | Honed | war | +`value` 10% damage dealt | `damage_mult` on `dealing`, `if: {actor: self}` | 10 |
| boon.second_wind | Second Wind | discipline | +1 AP every turn (the ceiling 9 holds) | `grant_ap` on `turn_ap` | 17 |
| boon.true_aim | True Aim | discipline | +1 to every roll to hit | `roll_mod` on `to_hit` | 7 |
| boon.hardened | Hardened | survival | −10% damage taken | `damage_mult` on `taking` 0.9 | 13 (Soldier-turns kept off) |
| boon.lifeline | Lifeline | war | the first blow each fight that would drop you leaves 1 HP | `floor` on `would_drop`, `limit: per_combat 1` | 8 |
| boon.echo | Steady Breath | discipline | +1 Echo at each fight's start (max 3) | `resource` Echo on `combat_start` | 5 |
| boon.primed | Primed | war, streets | your door's meter starts a fight one step up (Guard +2, Momentum +1, Pressure +1, Shadow +1, Bond: one free Bond, Flux −2, Strain −1) | `resource` on `combat_start`, one effect per door | 8 |
| boon.reflexes | Quick Hands | streets | the first reload or weapon swap each turn costs 1 AP less (min 0) | `cost_mod` on `reload` and `swap`, `limit: per_turn 1` | 5 |
| boon.mending | Field Mending | shrine, survival | heal 20% of max HP at each fight's end | `mend` on `combat_end` (a percent amount block) | 0 (between fights) |
| boon.deep_well | Deep Well | shrine | +20% heals and shields you give | `mend_mult` on `heal` and `shield`, `if: {actor: self}` | 8 (healer ceiling share) |
| boon.bandolier | Bandolier | machine | the ammo pack ×2 and one more core | stat `run_ammo` (new, section 4.2) | 0 (economy) |
| boon.tithe | Tithe | streets | +50% credits | stat `run_credits` (new) | 0 (economy) |
| boon.devout | Devout | faith | +1 Devotion XP at each fight's end (inside the session cap) | `resource` Devotion XP on `combat_end` | 0 |

Boons are the run's rule-changers (Leon accepted the thirteen, 13 Nov). Section 11 puts them beside the gear: a boon changes how you fight, a grade step how well; both count, and a Relic's named property and an event's relic take their worth out of the same 50% (rule 31).

## 4. On what exists

### 4.1 Built from (each rule against the primitive that carries it)

| Rule | Primitive (verified 13 Nov) |
| --- | --- |
| The mode, host-only, relayed live (1, 8.1) | the `settings` action (`{type: 'settings', patch}`, host only; the room's state broadcast as every lobby change is); a key `settings.play` |
| A mode beside the campaign, refusing story actions (1, 36) | the Proving Ground's pattern: `g.sandbox`, `sandboxAction`, `SANDBOX_REFUSED`, `standalone`, `saved` |
| Leans and the host's tie (11) | `sandbox.ready` by player id; `isHost` |
| Seeded streams (12, 22) | `rng.ts` `seedFrom`, `next` |
| A fight from foes (13, 15) | `startCombat(name, map, pcs, foes: FoeSpec[], difficulty, rng, objects, {level})`; `FoeSpec` `tier`, `weapon`, `level`, `caster`, `drops`; `sbBegin` as the model; `magicIn` |
| Win, loss, back to the map (4) | `checkOver`; a `g.run` branch at the fight's end beside `sandboxOver` / `finishCombat`; `unitToCharacter` |
| Tiers, levels, lag, stage levels (16 to 19) | `enemies.json items`, `levels.table`, `fight_level`, `gap.to_hit_per_level`, `gap.max_levels`, `full_hp_guard`; the tier `lag` field |
| Variety (21) | `doctrine`, `fire_spread`, `fire_near`, `healer_focus`; `skulk` (`FOE_TAGS`, `skulks`); `casters`, `soul_casters` |
| Maps (22) | `maplayout.ts` `readLayout`, `sizeProblem`, `startGap`, `deployEnemy`, `nearestFree`, `MAP_LIMITS`; `maps.json` legend, `open_ground`; `objects.json` 23 kinds |
| Drawing objects by kind (4.3) | campaign `sprites` (by object kind, `"door:open"`) and `MapDef.objects[].sprite` |
| XP and levels (14) | `giveXp`, `applyLevels`, `levelForXp`, `character.levels.xp_total`; the level-up screen, `levelup/*` |
| Ammunition, kits (23, 28) | `magsOf`, `roundsOf`, `loadAll`, `KITS`, `FOCUS_DOOR`, `holds` |
| Picks (26) | the loot roller (`loot.ts`, the weighted pick behind `rollDeathDrops`; `cleanDrops`); `rules.json rarity` |
| Rest and session (24) | `applyRest(g, 'long')`, `restockResources`, `dayOf`, `beginSession`; `uses` scopes `per_scene`, `per_session`, `per_rest` |
| Boons (30, 31) | the `relic` item kind (`addItems('relic', …)`, `c.relics`, `effects/collect.ts`), the item-ops runner: `damage_mult`, `grant_ap`, `roll_mod`, `floor`, `resource`, `cost_mod`, `mend`, `mend_mult`; triggers `turn_ap`, `combat_start`, `combat_end`, `to_hit`, `taking`, `would_drop`, `reload`, `swap`; `limit` |
| Fog, log, the run's view | `viewFor` / `fogFight`; `say`; `viewFor` gains `run` (legal next nodes, offers, stock with prices and `why`, leans); the client sends `run/*` ids only (`boundary.test.ts`) |
| Report a run (35) | `report.ts openReport`; `fxTaps` |
| Death: out for the fight, back at 1 HP on a win (5) | `c.dead` and the run's fight-end branch beside `unitToCharacter` (which already stands the Downed at 1 HP); `checkOver` for the loss |
| A focus's rarity on its door (25a) | `rules.json rarity.<r>.acc` and `RARITY` (`character.ts`), read as the weapon's is (`combat.ts` unit build); `self_holds` `door` to find the focus in hand; the door's to-hit through the `to_hit` roll term, a Bond's save TN through `roll_mod` `roll: "tn"` (new reading: section 4.2 item 9) |
| The grade step (37, 38) | `GearState.rarity` / `PackItem.rarity` (a weapon or focus keeps its rarity in hand and pack), `maxDurOf(weaponId, rarity)` for the new durability, `RARITY` for what the grade does, `c.credits` / `payCredits` (item 1); the setter is item 10 |
| A Relic's named property (38) | a `relic` item (`addItems('relic', …)`, `c.relics`) whose effects carry `if: {self_holds: {slot: "hand", item: <weapon id>}}`, so it works only while that weapon or focus is in a hand; the ops from the closed list (`damage_mult`, `roll_mod`, `cost_mod`, `resource`); the link to the instance is item 11 |
| Rest training (39) | `addDrill(c, weaponId, n)` (`physical/data.ts`), `addStudy(c, n, why)` (`sigilgrowth.ts`), `c.soulPractice` (`magic.ts`; outside a fight: item 12), `shiftDevotion(g, null, c, n, why)` (`faith.ts`) |
| Mods as growth (40) | `fitMod` and the weapon's `mod_slots` (as today), `gear/mod`; `items.json` mods and their prices |
| Lasting picks (41) | the loot roller (`loot.ts`) with a slot filter on category (`mod`, `armour`) |
| Events (42) | data offers resolved by the run reducer through the doors above: `payCredits`, the grade setter, `addDrill`, `addItems('relic', …)` with a `stat: hp` effect (the `hp` stat id exists), `c.hp` for "HP now"; the loot roller for a sealed pick |
| The armourer's chit (43) | an `items.json` item (category `tool`, `stock: false`, never priced for sale), spent by `run/upgrade` in place of the step's credits |

### 4.2 Needs a new primitive (each general; for the lead's consolidation pass)

1. **Credits on a character** (`c.credits`, `earn` / `payCredits`, a refusal in words): the shop; the roguelike's missions later.
2. **A spawn scale on `FoeSpec`** (`scale: {hp, damage}`, after the level row): party size and the stage term; any generated or campaign encounter.
3. **`rngFor(seed, key)`** in `rng.ts`: a named stream, so content generation never consumes a fight's dice.
4. **`priceOf(itemId, rarity)`** and the calibre round prices (rule 27): shop, sell, picks, loot value.
5. **A fight tally** (`fightTally` on `fxTaps`: damage by system and source, heals, shields, Downs, rounds fired), moved from the balance simulator's counting (`test/balance/sim.ts`) into `src/`; an fx event with no system counts as `other`, and the builder lists those events.
6. **A map skin** on `MapDef` (`skin: {setting, ground, rotate, dressing}`): presentation only, read by the renderer.
7. **The `lag` field** on `enemies.json` tiers (the level-scale spec's; Survival is its first reader).
8. **Two stat ids** in `effects/stats.ts STATS`: `run_ammo` and `run_credits` (a relic answers them; the run asks): every meta-progression unlock that changes an economy after this.
9. **A focus's rarity on its door's rolls** (Leon's ruling 3): one reading of `rarity.acc` for the focus in hand, added where the door rolls to hit (Sigil, Outburst) and to the TN of the saves it forces (a Bond's), beside where the weapon's is added today. General: every focus, every mode, the campaign too.
10. **`setGrade(c, where, rarity)`**: change one held instance's rarity (hand or pack: `GearState` / `PackItem`), its durability raised by the new `RARITY.dur` (a grade step also restores it to full), refused past Celestial and on plot items. General: the shop's grade step, events, the roguelike's smith, a campaign's reward.
11. **A named property on a gear instance** (`GearState.prop` / `PackItem.prop`: a relic item id, kept with the instance through hand, pack, pile and drop, as rarity and mods are): the Relic rarity's "one named property, written per item" (Core Rules, Weapons v2, Rarity), which no item carries yet; every relic weapon later reads it.
12. **Practice outside a fight** (`addPractice(c, n, why)`, beside `addDrill` and `addStudy`): `magic.ts gainPractice` needs a fight today. General: rests, events, a tutor in a campaign.

New code that is the system itself: `survival.ts` (the run reducer), `pathmap.ts` (rules 7 to 9), `encounter.ts` (15 to 21), the layout generator in `maplayout.ts`, the shop roller. Nothing deals damage, heals, prices an AP or rolls a check outside the existing doors.

### 4.3 The map generator and the art contract

**Layout** (`settings.<id>.layout`): (1) size from rule 22; (2) the squad's zone columns 1 to 2, the foes' by the template; (3) 1 to 2 stamps on 16 × 16, 2 to 3 on 20 × 20, 3 to 5 on 26 × 26 (a stamp is a picture of 3 to 7 tiles in the maps legend), rotated and mirrored by the stream, never on a start zone; (4) loose cover until every tile of the middle band is within 3 tiles of cover, half to full about 2 : 1, cover 8 to 18% of the tiles; (5) 0 to 2 patches of difficult ground; a hazard by the setting's chance, never on a start tile; barrels beside cover, lamps and terminals by setting; (6) dressing on 4 to 10 free tiles (the skin). **Checks:** `readLayout` clean; `startGap` within `MAP_LIMITS`; **two lanes** (block the shortest path's tiles between the zones: another path remains); the cover share. A failure drops the last stamp; after 8 tries `open_ground` cropped. The stamps seed the roguelike's designed rooms (the same legend).

**Drawing contract** (fallbacks so art drops in piece by piece; catalog ids `kit-<setting>-<piece>`):

| What | Drawn from | Fallback |
| --- | --- | --- |
| Ground | `art/sprites/kit/<setting>/ground-1..3.png`, one a map, rotated by the stream, darkened under the grid | today's plain tiles |
| Solid tiles | `wall-straight`, `wall-corner`, `wall-end`, `wall-door` (a door in the line), `wall-broken` (rubble in the line), chosen from the four neighbours, rotated | today's solid fill |
| Objects | `<kind>.png` by engine kind id; `crate-broken`, `pillar-broken`, `barricade-broken`; `door-open`; `container` 1.5 tiles | `art/sprites/objects/`, then the plain glyph |
| Decals | `decal-rubble`, `decal-toxic`, `decal-scorch` | today's tint |
| Dressing | `dress-1..4.png` on the skin's tiles | nothing |
| Backdrop | `art/illustrations/survival/backdrops/<setting>-<a..d>-*.png` behind the map and on node and tile cards | the ground colour |

## 5. Balance

### 5.1 The unit, from the contract
At level 1 (ratios hold at every level under the level scale): the rifleman kills a Soldier in **2.01** rifle-turns, an Elite in **4.26**, a Boss in **15.9**; a Soldier kills him in **7.84** turns, an Elite in **3.54**, a Boss in **2.64**. So an Elite's bulk is 4.26 / 2.01 = **2.1**, pressure 7.84 / 3.54 = **2.2**; a Boss's **7.9** and **3.0**. A Minion (70 HP, no armour, Defense 10) takes 2 of the plain hit's 45 against a Soldier's 3.5 of 40 and is hit 5% more often: **0.55**; it hits 55% with weapons averaging about 21 against the Soldier's 23.4 at 65%: **0.75**. A Vermin (15 HP, one hit) **0.3**; its bite 9 at about 45%: **0.3**. **Rounds from bulk:** the reference fights for four: standard (3 Soldiers, 1 Elite) bulk 5.1, 4.3 to 6.0 rounds; elite (2 and 2) 6.2, about 6.5; boss (1 Boss, 2 Soldiers) 9.9, 6.3 to 10.4: bulk ÷ (4 × rounds) = 0.25, 0.24, 0.29: **0.25**. **Pressure:** the standard fight for four brings 5.2 SE: **1.3 a character**, where the plain rifleman lasts about 3 rounds under focus; solo 1.2 (nobody to Raise).

### 5.2 The lag, priced
On the settled curve one level of gap is HP and damage ×0.899 and one point to hit each way (the party's hits ×1.077, the foe's ×0.923): bulk 0.899 / 1.077 = 0.835, pressure 0.899 × 0.923 = 0.830: **0.83** a level (0.69 for two, 0.57 for three); a level above: ×1.2. A test recomputes it from `enemies.json levels.table` and fails past a 3% drift.

### 5.3 Worked fights: the three asked, and the stage curve (a plain mid-stage fight, party of four)

| Fight | Budget (bulk; pressure cap +10%) | Composition | Bulk | Pressure |
| --- | --- | --- | --- | --- |
| Level 1 solo, depth 1 | 0.25 × 1 × 4 = **1.0**; 1.32 | 1 Soldier, level 1 (`firing_line`); 16 × 16 | 1.0 | 1.0 |
| Stage 1, level 4, four, depth 7 | **5.0**; 5.72 | 1 Elite L4 (2.1 / 2.2), 3 Soldiers L3 (3 × 0.83), 1 Minion L1 (0.31 / 0.43); 20 × 20 | **4.92** | **5.12** |
| Stage 1 Boss, four, fight level 6 | 0.25 × 4 × 9 = **9.0**; 5.72 | Boss L6 (7.9 / 3.0), 1 Soldier L5 (0.83), 1 Minion L3 (0.31 / 0.43) (`champion`); 26 × 26 | **9.04** | **4.26** |
| The same Boss, solo | **2.25**; 1.32 | Boss at share HP ×0.28, damage ×0.4 | 2.21 | 1.2 |
| Stage 2, level 9 | 5.0 × 1.25 = **6.25**; 5.2 × 1.15 × 1.1 = 6.58 | 1 Elite L10 (+1: 2.53 / 2.65), 3 Soldiers L8 (2.49), 3 Minions L6 (0.93 / 1.29) | **5.95** | **6.43** |
| Stage 3, level 12 | 5.0 × 1.5 = **7.5**; 7.44 | 1 Elite L14 (+2: 3.05 / 3.19), 5 Soldiers L10 (lag 2: 5 × 0.69), 1 Minion L9 (0.31 / 0.43) | **6.81** | **7.07** |
| Stage 5, level 18 | 5.0 × 2 = **10.0**; 9.15 | 1 Elite L20 (+2, capped: 3.05 / 3.19), 8 Soldiers L16 (5.52), 1 Minion L15 (0.31 / 0.43): 10 foes, the cap; the 1.1 short goes on as `scale.hp` ×1.12 | **10.0** | **9.14** |

**The stage rows at draft 3's `stage.bulk` 0.35** (rule 19; the rows above were worked at 0.25): stage 2's target is 5.0 × 1.35 = **6.75** (band 5.74 to 7.76): the composition above (5.95) still fits. Stage 3's is 5.0 × 1.7 = **8.5** (band 7.23 to 9.78): one more foe would pass the pressure cap (7.07 + 0.69 > 7.44), so the seven foes take `scale.hp` ×1.25 (6.81 × 1.25 = 8.5; pressure unchanged). Stage 5's is 5.0 × 2.4 = **12.0**: at ten foes, `scale.hp` ×1.34 (8.93 × 1.34 = 12.0) in place of ×1.12. Fights grow longer, not deadlier, which is what gear answers (section 11.6).

The solo fight: the rifleman needs 2.01 rifle-turns for the Soldier, and about half his turns land as rifle-turns on a real map (the reference fights: 2.55 ideal rounds against 5.1 measured), so about **4 rounds**; the Soldier needs 7.84 of its turns on him, so he ends near half HP.

### 5.4 The XP curve, and ammunition
**XP** (level 3 at 250, 6 at 2,050, 7 at 2,800, 8 at 3,550; f(d) = 100 + 22 × (d − 1)). A median stage-1 path (fights at depths 1, 2, 3, 4, 6, 9, 12, 13; Elites at 8 and 10; a shop at 5, rests at 7 and 14, a cache at 11; the Boss at 15): 100, 222, 366 (**level 3 at depth 3**), 532, 742 (level 4), 1,123 (gate), 1,399 (level 5), 1,846, 1,926 (cache), 2,268 (**level 6 at depth 12**), 2,632, **3,448 after the Boss: level 7**. Band by route: level 6 to 8. **Later stages** (`stage.xp`: stage 2 ×0.7, 3 ×0.8, 4 ×0.85, 5 on ×0.9 of stage 1's 3,448): stage 2 ends at about 5,860 (**level 10**), stage 3 8,620 (**13**), stage 4 11,550 (**16**), stage 5 14,650 (**19**), **level 20 early in stage 6**; then renown (rule 6). Leon's ×7.5 scale makes stage 5's party hit about 4 times stage 1's.

**Ammunition, the rifleman** (the service rifle: magazine 24, single shot 2 AP, Burst 3 AP for three rounds): a fight of 5 rounds is about 4 turns of firing: **12 rounds** on single shots, **24** on Bursts. The soldier kit holds 24 loaded + 3 magazines + 48 loose = **144** (rule 28: three fights of Bursts with nothing back is 72). Each won fight gives a magazine's worth (24): single shots gain 12 a fight, Bursts break even. The longest stretch without a shop (rule 9) is six nodes, about five fights: 120 rounds of Bursts against 144 + 5 × 24. **A gunner can't run dry,** and the shop's counter refills every calibre at a fixed price.

### 5.5 Boons and the contract
A boon is priced like any item (`balance-contract.md` section 5): its share of a rifle-turn, all in. **The cap is 50%** a character (rule 31): four or five boons; a normal-share build at its ceiling plus 50% sits at about the Sigil Line's peak (150 to 200 is a different system's ceiling). The run must outpace them and the gear (section 11.6: about +35% bulk and +15% pressure a stage against about +10% a boon and up to +8% a grade step): **target, a squad of four ends in stage 3 or 4, solo in stage 2 or 3** (Leon accepted it, 13 Nov; measured, below). Boons are not added to the balance contract's guard: they are run power, like a Miracle (exempt); the survival test holds them.

### 5.6 Measured before it ships
A simulated run (`test/balance/survival-run.ts`, opt-in; the simulator's policies and builds): each of the nine class builds solo and in a squad of four, 20 seeds a cell: every fight's length within ±20% of its R; stage 1 won about **60%** by four and **40%** solo; Downs in about one fight in three; the median run's end in the target stages. The simulated party spends its credits by the section 11.5 plan (one grade step a stage, then mods, armour, the Relic step), so the gear is in the measurement. The dials, in order: `bulk_per_char_round`, `pressure_per_char`, `share`, `stage.bulk`, `stage.pressure`; then the economy's, `stage.credits` and `grade_up.price`.

## 6. The other side

The enemies use what they have: the fire doctrine, the healer hunt, casters' AI, `skulk`. Survival adds no enemy rule. A lagging enemy at a gap of 5 dies to one hit (the gap rule); the lag never reaches it (3 at most).

## 7. Data

`data/survival.json` (kind `survival`, every number `provisional: true`): `run` (`start_credits` 150, `dead_return_hp` 1), `stage` (`length` 15, `bulk` 0.35, `pressure` 0.15, `credits` 0.35, `elite_up` {per: 1, max: 3}, `xp` [1, 0.7, 0.8, 0.85, 0.9]), `grade_up` (`price` {fine 1,500, masterwork 3,500, relic 9,000}, `per_visit` 1, `relic_from_stage` 3, `cut_rate` 0.5 for the event's off-books step), `relic_props` (section 11.2; relic items, each with a `worth` and the categories or doors it fits), `train` (`drill` 100, `study` 3, `practice` 5, `devotion` 2), `events` (section 11.3; each a cost, a gain and its text), `lasting_min` 2 (a cache's and an Elite's lasting picks), `world` (`offer` 3), `map` (`rows`, `kind_weights`, fairness), `rounds`, `bulk_per_char_round`, `pressure_per_char`, `bulk_band`, `pressure_band`, `max_foes`, `tiers`, `lag_factor`, `share`, `map_size`, `xp`, `credits`, `ammo_pack`, `rewards` (`rarity`, `price_band`, `instead_rate`), `shop` (`always`, `stock`, `restock_price`, `armour_fit`), `sell_rate`, `boons` (relic items), `boon_cap`, `templates`, `settings`, `shopkeepers`. `data/modes.json` (section 8.1). **Round prices** to add (`weapons.json calibres[].round_price`): .32 Decrkm 1, rifle 2, revolver 2, shell 3, arrow 2, bolt 3, .50 frontier 4, .700 15, core charge 20, 40 mm grenade 60, fuel canister 40, rocket 200. The validator: template tiers and casters exist; setting kinds are `loot_tables.json kind_tables` keys and never `celestial`; weapon pools exist; every `shop.always` id has a price; every boon, Relic property and event relic is a `relic` with ops from the closed lists and a `worth`; every event's gain names a door in section 4.1; the armourer's chit (`armourer_chit`, `items.json`) is `stock: false`; `tiers` and `lag_factor` match `enemies.json` (a test).

```json
{ "id": "caster_guards", "name": "A caster and guards", "nodes": ["fight"], "from_depth": 3, "weight": 3,
  "slots": [ { "tier": "soldier", "caster": ["sigil_adept", "heart_adept"], "req": 1, "spawn": "far" },
             { "tier": "soldier", "range": "ranged", "max": 4, "spawn": "between" },
             { "tier": "minion", "max": 3, "spawn": "between" } ],
  "text": "One of them writes or burns while the rest hold the line in front.", "provisional": true }
```

```json
{ "id": "boon.edge", "kind": "relic", "name": "Honed", "pools": ["war"], "worth": 10,
  "numbers": { "value": 1.1 },
  "effects": [ { "op": "damage_mult", "when": "dealing", "if": { "actor": "self" }, "value": 1.1 } ],
  "text": "Everything you deal is {=numbers.value|more}% stronger for the rest of the run.",
  "adjudication": "engine", "provisional": true }
```

## 8. The screens

All through the engine's view: the client builds no cost, price, legality or choice (rule 36).

### 8.1 Choosing a mode (Leon's sketch, 13 Nov: binding)

1. **Where:** the room's lobby, "The squad". Under the players' seats ("Create a character" / "Bring a saved character"), in place of the row "WHERE IT STARTS · THE EARTH SECTOR" and its chips (`room.template.html`, `starts.ts`), **three large cards side by side, filling the width: SURVIVAL, ROGUELIKE, CAMPAIGN.** The chips row is gone; nothing else on this screen offers a campaign.
2. **A card:** the name (Chakra Petch, caps), one line (Survival: "Fight from tile to tile: shops, rests, a Boss each stage. Solo or co-op, no Narrator needed."; Roguelike: "Dungeons, a world map and companions."; Campaign: "A written story with a Narrator."), its painting by catalog id (Survival `survival-card-title`, the brief's `title-survival.png`; Campaign `world-pilot`; Roguelike none yet) or, until the art lands, a plain panel (`#1C2536` on `#10151F`, the AHOC seal in white ink), and **a check mark with the word "Selected"** on the room's mode.
3. **Selecting:** the host clicks an available card: `{type: 'settings', patch: {play: 'survival'}}`; a guest's click says "Only the host picks this." in the hover card. One at a time. Guests see it change live: room state, relayed as every lobby setting is (host-authoritative; the state goes out to each guest).
4. **Locked:** Roguelike and Campaign carry a lock mark, are dimmed and say **"Coming"** under the name (never colour or opacity alone); not selectable; a click or hover shows through **the one hover card** (`actionTip.ts`, no native tooltip) when it comes: "Coming after the advanced classes." / "Coming when the campaigns are rewritten." The lock is **data**: `data/modes.json` `items: [{id, name, line, art, available, coming}]`, `available: true` only for `survival`; unlocking is one edit, like M813's `listed`.
5. **Campaign, later:** selecting it opens a story selector (M813, `"listed": false` today, and "Load a campaign file…"). **Meanwhile "Load a campaign file…" sits under the locked Campaign card and is hidden with it;** `campaign/load` is unchanged, and the test hook that lists M813 for the browser suites also unlocks the card and its selector, so the suites that load a campaign keep working.
6. **Default:** a new room selects **Survival**. An old save with no `settings.play` and a campaign under way reads `campaign`.
7. **The Proving Ground** keeps its entry: a small text button under the cards, left of Start, "⚔ Proving Ground · practice range", not card-shaped, so it reads as a tool, not a fourth mode (and on the title as today).
8. **The Narrator panel** (right: provider, key, model, tone): **collapsed, not hidden,** with Survival: "Survival needs no Narrator." and a quiet "Add a Narrator for flavour (optional)" that expands it. Not hidden, so a player with a key keeps the flavour and a guest sees why nobody asks for one; collapsed, so a new player is never asked for an API key to play. Campaign (when unlocked) opens it as today.
9. **Start:** Survival: `run/start` (host; every seat locked in at level 1, else the engine's reason) → the path map. Campaign: today's `session/start`. The reducer records `settings.play` and `g.run`, so a saved room resumes in its mode.
10. **Layout:** 1280 × 720: the cards in a row about 200 px tall, painting above, words below; 1440 × 900: about 240 px; 1920 × 1080: the row capped at the content width, paintings 4 : 3; with the right panel expanded the three share the narrower column; under 900 px wide they stack to one column of rows (thumbnail left). **Keyboard:** a radio group (`role="radiogroup"`, each `role="radio"`, `aria-checked`); arrows move, Space or Enter selects; locked cards are focusable and announce "locked, coming". **Colour:** the selected card's border and check in white `#FFFFFF` with the word; locked text muted `#A3AEC2` with the lock glyph; no attribute ink.

### 8.2 The run's screens

- **Path map:** the painting Leon picks (`survival-map-display` or `survival-map-aerial`) under nodes and paths drawn by the UI; each node an icon **and a word** (Fight, Elite, Shop, Rest, Cache, Boss); walked paths solid, reachable nodes lit, the party's tokens; in co-op each player's lean as a small portrait and "Waiting for 1 player" / the host's Go. Along the edge: "Stage 2 · Node 6 of 15", the tile's name, each character's level, HP, credits and boons.
- **Node card:** the scene painting (`nodes/`: shop by shopkeeper, rest, Elite lair, Boss door, cache; a fight: a backdrop of its setting), kind and setting; "Enter".
- **Rewards:** XP and credits with numbers; the ammunition gained, per gun; **three weapon cards per character** through the one hover card (icon, rarity, price, the door it serves) and **"Take N credits instead"**; an Elite or cache adds the armour-or-item row. Co-op: each picks their own; the host can skip an away player.
- **Shop:** the shopkeeper and a line; two shelves: **"Always in stock"** (every calibre's rounds, magazines for your guns, special rounds, grenades, cores, parts, stims, kits, Restock) and **"Today's gear"** (the rolled eight with painted icons, rarity, price, the engine's reason when it can't be bought); Buy; a Sell tab with each sell price; Armour fitting; and a third shelf, **"Upgrade"**: each carried weapon and focus with its grade (word and ornament marks), the next grade's price, and **what changes, in numbers** (to hit 62% → 67%, durability 40 → 50; for a focus, the door's rolls; for the Relic step, the three properties offered), or the engine's reason (no credits, one step a visit, Relic from stage 3). An armourer's chit shows as "Use chit" on the step it pays.
- **Rest:** the medic, what the rest gives (`REST_INFO.long`); **"And one training"**: per character, the trainings it can take (rule 39) with the bar each moves (drill toward its next mark, study toward the next word, practice toward the next module, Devotion toward the next level); Rest.
- **Event:** the scene painting, two or three trades as cards (the cost in white, the gain, and the engine's reason if one can't be taken), and **"Walk on"**; each character takes its own.
- **Stage clear:** the Boss's portrait struck through, "STAGE 1 CLEARED"; **the boon pick**: three large boon cards per character (name, the one number, its icon), each picks one; then **the next tile**: two or three tile cards (backdrop, setting, Boss portrait, boon theme), leaned and gone like a node; **Retire** (host) keeps the score.
- **The run's growth** (on the map's edge, a click away): per character, a short log of what it gained per stage (levels, grades, mods, armour class, trainings, boons) and its output against a bare character of its level (section 11.6), so growth is seen, not only felt.
- **Summary:** the run-won or run-over card (`cards/`), stages cleared, nodes, the path, a table of fights, levels, classes, boons, each character's gear at the end; "Report a run" and "Back to the room".
- **Level-up:** the existing screen, opened from the map when a character has points.

**Art for `art/briefs/ART-REQUESTS.md`** (to list, not edited here): node-kind icons (six, Wick flat ink, artist); thirteen boon icons (Wick flat ink, artist); lean and party tokens, path lines, the lock mark (SVG, Claude); a Roguelike card painting (artist, later); a "stage clear" card (artist, optional).

## 9. Out of the first version, on purpose; and what it must not block

**Out:** designed rooms; the five dungeons; the roguelike's full world map (Survival's row of tiles is its seed); missions; per-player meta progression and unlocks (an identity that outlives a room); companions and dialogue; account cosmetics; trapped caches; difficulty settings; body armour as items (Equipment 2.0); a respec or perk-swap service (no primitive yet; question 9). (Draft 2's "no rest or train" is reversed: section 11.) **Must not block:** the node map as a dungeon (nodes are `{id, depth, col, kind, setting, links, room: null}`: a node can hold a designed room); rooms attached to nodes (the generator takes a room's slots in place of a template's); the shop NPC (data with bias and lines); settings as data (a row and a kit folder); the world map (tiles are nodes of a graph with a setting and a pool); relics and unlocks (boons are relics; `run_ammo` and `run_credits` are stats).

## 10. Build plan (one version after Classes 3.0)

| Step | What | Reuses | Proof | Care |
| --- | --- | --- | --- | --- |
| 1 | The mode picker (8.1), `data/modes.json`, `settings.play`, the chips row gone, the Narrator panel collapsing; `g.run`, `run/start`, `run/retire`; refusals | `settings`, the room's relay, the sandbox's pattern | `npm run e2e -- room` (a locked card can't be picked; a guest sees the host's pick); old-save fixture loads as `campaign` | Opus (saves) |
| 2 | Path map (7 to 12), `rngFor` | `rng.ts` | 1,000 seeds: every fairness rule; same seed same map | Opus |
| 3 | Encounter generator (15 to 22) on `open_ground` cropped; one stage: fights, XP, credits, the ammunition pack, the weapon pick, rest, loss, levelling between nodes, the summary. **First playable: ONE stage.** | `startCombat`, `sbBegin`, `giveXp`, `applyRest`, `beginSession`, the loot roller | every seed × N × depth composes inside its bands; `npm run try`; the replay guard on a seeded stage | Opus (the budget, determinism) |
| 4 | Prices for everything, `priceOf`, credits, the shop (always stocked first, then rolled), sell, fitting, restock, shopkeepers | `price_credits`, `rarity` | the validator: every always-stocked id priced; buy and sell through the reducer | Sonnet, the lead checks |
| 4a | **In-run progression** (section 11): the focus reading (item 9), `setGrade` (10), the instance's property (11), `addPractice` (12); the grade shelf, `run/upgrade`, the chit; rest training (`run/train`); lasting picks; events (`run/trade`); the death return (rule 5) | `RARITY`, `GearState`, `addDrill`, `addStudy`, `shiftDevotion`, `addItems('relic')`, `self_holds`, the loot roller | a Fine rifle's to-hit is one point up and a Fine Evoker's Sigil roll too (`npm run try`); a grade step and a sale through the reducer; a Relic property works in hand and not in the pack; every event's gain lands; a dead character stands at 1 HP after a won fight | Opus (primitives), Sonnet (data and screens) |
| 5 | **Stages and boons:** the stage term, `elite_up`, the boon pick (relics), the next tile, retire, renown | `addItems('relic')`, the item-ops runner | each boon's op in `test/item-ops`; a seeded two-stage run replays | Opus |
| 6 | The fight tally and Report a run | `fxTaps`, `report.ts` | a seeded fight's tally equals the log's sums | Sonnet |
| 7 | Layout generator, map sizes | `readLayout`, `startGap`, `deployEnemy` | 1,000 seeds: lanes, gap, cover, no hazard on a start | Opus |
| 8 | Kit drawing with fallbacks; the AHOC kit's catalog entries | the renderer, `sprites` | `npm run e2e -- layout`; a map with no kit draws as today | Sonnet |
| 9 | Simulated runs (5.6) and the fit | `test/balance` | the targets in 5.5 and 5.6 | the lead |
| 10 | Browser suite `survival` (seed fixed, solo: node 1 by hand, then a tests-only `run/skip` that wins a fight, refused unless the room's test flag is on: picks, level 3's class, a shop buy and sell, a rest, the Boss, a boon, the next tile, retire, the summary and its export); docs, CHANGELOG, version | `e2e/groups.json` | `npm run e2e -- survival` | Sonnet |

**Playtest checklist entries:** a solo stage to depth 4 (fights 4 to 5 rounds, small maps); a co-op lean and tie; level 3 mid-run and its class; each of the nine classes from node 1 with its kit; a gunner on Bursts never dry; the shop says why when credits are short; a death and the return at 1 HP after a won fight; a grade step bought and felt (the to-hit on the card); a Relic property chosen; a rest training; an event's trade; the growth log after two stages; trash outgrown by level 5; the Boss at four and solo; a boon felt; stage 2 harder; Report a run reads.

## 11. In-run progression (draft 3; Leon's ruling 7)

Leon: *"progression is a thing, right now we only reach 'refill to continue', nothing really progresses except for level."* He is right about draft 2: a rest only healed, a shop mostly refilled, and the only lasting gains were levels, a weapon pick and a boon a stage. This section gives a run **six axes that grow, each paid for in its own way**, so that every node leaves something that lasts and every shop visit has a decision past refilling. Every number here is **PROVISIONAL** and listed in section 11.7.

| Axis | What grows | Paid with | Where |
| --- | --- | --- | --- |
| Level | everything the level scale gives (as today) | XP from fights | every fight |
| Grade | a weapon's or focus's rarity: Standard, Fine, Masterwork, Relic | **credits, a lot** (Leon's ruling 7) or a chit | the shop (rules 37, 38) |
| Kit | mods, worn armour pieces, the armour class | credits, or a pick | shop, cache, Elite (rules 40, 41) |
| Training | drill, study, practice, Devotion | the rest itself (the heal stays free) | rest (rule 39) |
| Trades | a grade step, drill, a relic, an Elite-rarity pick | a cost the engine can take: credits, HP now, durability, max HP | event (rule 42) |
| Boons | a rule-changer for the run | beating a Boss | after each Boss (rules 30, 31) |

### What other games do (the research behind this section)

A design note (the game names are for the design discussion only; no game text names them). The research came from wikis, guides, reviews and interviews; most shop prices in it are community figures and **unverified**, so we take shapes, never numbers.

| Game | What grows in a run | What we take | What we avoid |
| --- | --- | --- | --- |
| Slay the Spire | the deck (picks, removal), card upgrades at rests, relics, max HP | a rest that gives a lasting gain; Elites as the opt-in risk for better rewards; an escalating price on a repeated service | heal **or** upgrade: in a party a skipped heal loses the run, so our heal stays free; gold left unspent at the end |
| Monster Train | a few units stacked with upgrades bought for gold | grading the one weapon you carry, for money: the closest precedent to Leon's ask | one carry hogging everything: our purses are per character and the step is one a visit |
| Wildfrost | companions, charms, a per-visit climbing price (45, 65, 85, reset each visit) | a per-visit limit, so purchases spread across the run | "strictly beneficial" events with no tension: ours each have a cost |
| Darkest Dungeon II | skill upgrades bought with a currency earned by fighting, one per skill per run | a capped, deliberate upgrade with a visible owner | one always-best spend (guides rank Mastery above trinkets) |
| Across the Obelisk | deck, gear, boons, card upgrades for a second currency | free upgrades found on the map (our armourer's chit) | two currencies to track in a co-op room: we keep one, credits, and one rare item |
| Into the Breach | grid power, reactor cores, weapons, pilot perks; Rep that expires per island | a forced spending moment with a clear owner per purchase | a choice with one right answer (stock Rep early, buy Power late) |
| Fights in Tight Spaces | deck upgrades whose price doubles each buy within a visit | a ceiling per visit | rushing one big buy because later ones are dearer; ours is a flat, published ladder |
| FTL | ship systems on a flat price ladder; reactor power caps what scrap buys | a ladder that does not inflate with depth; a cap on what money converts into | early bad luck that makes a run unwinnable: our pick always offers one for your door |
| Hades | boons, boon levels for money with shrinking returns, Hammers | the reward shown before you commit; diminishing returns on stacking | stacking one boon without end: our cap is one budget for boons and Relic properties |
| Risk of Rain 2 | uncapped item stacks; enemy strength and chest prices on one clock | one stage number driving difficulty and income together (`stage.bulk`, `stage.credits`) | uncapped stacking and late snowball |
| Dead Cells | stats by scroll, gear level and quality (+, ++, S), a forge for gold | a quality step bought at the forge, locked behind the previous one | flat prices that drift out of step with income (it moved to level-scaled costs) |
| Gordian Quest | a skill grid, gear; shrines that raise risk for reward | node rewards visible; risk as a choice | gold that only buys potions (the "refill" trap Leon names) |
| Invisible, Inc. | augments, agents, items from a clock-limited campaign | power bought by accepting a cost (time there, HP or durability here) | repeated re-pricing of dominant items: we measure before we price |

### 11.1 Credit income (per node and per stage)

**Per node, stage 1** (section 3.1: a fight pays c(d) = 80 + 20 × d, an Elite and a cache 1.5 × c(d), the Boss 2 × c(d); a shop, rest or event 0):

| Depth | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 15 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Fight | 100 | 120 | 140 | 160 | 180 | 200 | 220 | | 260 | 280 | 300 | 320 | 340 | |
| Elite | | | | 240 | 270 | 300 | | 360 (gate) | | 420 | 450 | 480 | 510 | |
| Cache | | | 210 | 240 | 270 | 300 | 330 | | 390 | 420 | 450 | 480 | 510 | |
| Boss | | | | | | | | | | | | | | 760 |

**The path priced:** section 5.4's median path with its cache at depth 11 read as the second shop rule 9 requires (5.4's path has none in rows 9 to 13; its XP loses the cache's 80, immaterial): fights at 1, 2, 3, 4, 6, 9, 12, 13 (100 + 120 + 140 + 160 + 200 + 260 + 320 + 340 = **1,640**), Elites at 8 and 10 (360 + 420 = **780**), shops at 5 and 11, rests at 7 and 14, the Boss (**760**): **3,180** a stage, plus `start_credits` 150 once. The route moves it by about −10% to −20% (two events in place of fights) or +12% (two more Elites and a cache in place of fights). The "credits instead" of a weapon pick adds a little and is not counted.

**Per stage:** credits × `stage.credits` = 1 + **0.35** × (s − 1), the same slope as the fight's length (`stage.bulk`, rule 19), so a stage's income keeps pace with the fights that earn it while prices stay fixed (the flat ladder FTL keeps; prices that drift from income are Dead Cells' lesson):

| Stage | × | Income (median path) | Upkeep (about) | Free for growth | Since the run began |
| --- | --- | --- | --- | --- | --- |
| 1 | 1.00 | 3,180 + 150 = **3,330** | 400 | 2,930 | 3,330 |
| 2 | 1.35 | 3,180 × 1.35 = **4,290** | 450 | 3,840 | 7,620 |
| 3 | 1.70 | 3,180 × 1.7 = **5,410** | 500 | 4,910 | 13,030 |
| 4 | 2.05 | 3,180 × 2.05 = **6,520** | 550 | 5,970 | 19,550 |
| 5 | 2.40 | 3,180 × 2.4 = **7,630** | 600 | 7,030 | 27,180 |

**Upkeep** is what keeps a character going past the free ammunition pack (rule 23): a gunner's two frag grenades and two stims (2 × 120 + 2 × 80 = 400), a caster's two spare cores and two stims (2 × 150 + 2 × 80 = 460), a healer's three field kits and two stims (3 × 120 + 2 × 80 = 520), a melee fighter's four stims (320); it rises a little as fights lengthen. **Refilling is about a tenth of a stage's income:** the rest is for growth, and there is more to want than to buy.

### 11.2 The grade ladder (rules 37 and 38)

37. **The grade step (Leon's ruling 7).** At any shop, a character may raise **one weapon or focus it carries** (hand or pack) **one rarity step**, paying `grade_up.price` for the grade it reaches; **one step per character per shop visit** (`grade_up.per_visit` 1). The item keeps its drill, mods and name; its durability rises with the grade (`RARITY.dur`) and is restored to full. Foci and mana arms are graded the same way. Armour, shields and consumables are not graded (rarity does nothing to them today).
38. **The Relic step.** From stage 3 (`relic_from_stage`), a Masterwork weapon or focus may become a **Relic**: Masterwork's numbers and **one named property, picked from three** rolled from `relic_props` for its category or door (the Core Rules' Relic: "Masterwork, plus one named property, written per item"). The property's worth comes off the character's boon cap (rule 31); a property that would pass the cap is not offered. It works while that weapon or focus is in a hand. **Celestial is never sold** (Core Rules: not for sale).

**What a grade does** is what `rules.json rarity` says today; nothing is added:

| Step | Price (`grade_up.price`) | What changes (`rules.json rarity`) | Share of income |
| --- | --- | --- | --- |
| Standard → Fine | **1,500** | +1 accuracy, durability ×1.25 | 45% of stage 1 (1,500 ÷ 3,330) |
| Fine → Masterwork | **3,500** | +2 accuracy in all (one more), durability ×1.5 | 82% of stage 2 (3,500 ÷ 4,290) |
| Masterwork → Relic (from stage 3) | **9,000** | the same accuracy and durability, and one named property | 75% of stages 3 and 4 together (9,000 ÷ 11,930) |

Where it counts: a weapon's grade on its main-hand attacks (`combat.ts` unit build reads `weaponState.rarity`, as today); a focus's in either hand (rule 25a). Rarity buys **no damage** (its `dmg` is 1 at every grade since rules 1.26). The Core Rules table's "+1 mod slot" is not read by the engine (`fitMod` fits one mod in each slot the weapon lists, whatever its grade); Survival keeps that (question 8).

**The ladder against income:** a character that grades one item affords **about one step a stage**: Fine in stage 1 (1,500 of 2,930 free), Masterwork in stage 2 (3,500 of 3,840), the Relic step at the end of stage 4 (9,000 of 4,910 + 5,970 = 10,880). Each step is about 2.3 to 2.6 times the last, the steep, published ladder the research recommends (a clear price a party of four can plan around). **The choice:** in stage 1 the 1,500 competes with armour class 4 (1,200) and a mod (80 to 900); in stage 2 the Masterwork step takes nearly everything; a hybrid (a gun and a focus) wants four steps by stage 3 and can buy two or three. The per-visit limit and the two shops a stage (rule 9) allow at most two steps a stage; credits allow about one.

**Step or buy graded:** the shop sells a Fine weapon at 3 × its price and a Masterwork at 8 × (rule 27). The step is the cheaper way when the base price is over 750 for Fine (3p − p = 2p > 1,500) or over 700 for Masterwork (8p − 3p = 5p > 3,500): rifles, foci (1,000), heavy weapons. A pistol (250) or a knife (60) is cheaper bought graded. So the decision is real: grade the weapon you have drilled, or buy a graded spare and start its drill over.

**Relic properties** (`relic_props`; relic items; names *(Suggested)*; worth in % of a rifle-turn, priced as boons are, section 5.5):

| Id | Name | Fits | What (one number) | Built from | Worth |
| --- | --- | --- | --- | --- | --- |
| prop.keen | Keen | guns | +10% damage with this weapon | `damage_mult` on `dealing`, `if: {self_holds: {slot: hand, item}}` | 10 |
| prop.true | True | any weapon | the first attack each turn +2 to hit | `roll_mod` on `attack`, `limit: per_turn 1` | 6 |
| prop.quick | Quick | guns with a magazine | reloading it costs 1 AP less (at least 1) | `cost_mod` on `reload`, `min` 1 | 6 |
| prop.biting | Biting | melee | +10% damage with this weapon | `damage_mult` on `dealing`, `damage: [melee]` | 10 |
| prop.balanced | Balanced | melee | the first swap or draw each turn costs 0 | `cost_mod` on `swap`, `limit: per_turn 1` | 4 |
| prop.deep | Deep | foci | +1 more to its door's rolls | `roll_mod` on `to_hit` (and `roll: "tn"` on its saves), `if: {self_holds: {slot: hand, door}}` | 8 |
| prop.gentle | Gentle | foci | +15% heals and shields you give | `mend_mult` on `heal` and `shield` | 6 |

### 11.3 What every node leaves (rules 39 to 43)

| Node | What lasts | Its cost |
| --- | --- | --- |
| Fight | XP, a weapon pick (or credits), drill for every kill (`physical/rules.ts`, as today), credits | the fight |
| Elite | the above at Elite rarity (fine 60 / masterwork 35 / relic 5) and an armour-or-item pick with at least two lasting things in it (rule 41) | a harder fight, opted into |
| Gate Elite | the same, and an armourer's chit among its three (rule 43) | every path passes it |
| Cache | an armour-or-item pick, at least two lasting (rule 41); 1.5 × c(d) credits | a node not spent fighting |
| Event | one trade (rule 42) | the trade's cost |
| Rest | the long rest **and** a training (rule 39) | a node not spent fighting or shopping |
| Shop | a grade step, mods, worn pieces, armour fitting; refills | credits |
| Boss | a Boss-rarity weapon pick and a boon | the Boss |

39. **Training at a rest.** Each character takes **one**: **Drill** `train.drill` **100** on a weapon it carries (`addDrill`; marks at 300, 900 and 1,800: a third of mark I; not multiplied by the martial ×3, which is the kill path's); **Study** `train.study` **3** (a Sigil user: `addStudy`; a word at 6, then every 8: about two Evokes' worth); **Practice** `train.practice` **5** (an Outburst user: `addPractice`, section 4.2 item 12; a module at 5 and 15, then every 15: about two Releases' worth); **Devotion** `train.devotion` **2** XP (a Faithful character: `shiftDevotion`; a rest begins a session, so the session cap is fresh). A door with no growth counter yet (Bonds, Figments, Shadow) takes drill or Devotion until its own exists. *Why not heal or train* (Slay the Spire's fork): in a party a skipped heal is a lost run and an unhealed friend is a lost co-op evening; the heal stays free and the training is what lasts.
40. **Mods** are the second purchase after the grade: the shop's rolled stock (2 of its 8 slots are armour pieces or mods, rule 25), and the Elite's and cache's lasting picks (rule 41). They fit as today: one in each slot the weapon lists (`fitMod`, `mod_slots`; a rifle has up to four, a melee weapon two, a focus none). Prices 80 to 900 (`items.json`).
41. **Lasting picks.** An Elite's and a cache's armour-or-item three hold at least `lasting_min` **2** lasting things: a mod for a slot the character's main weapon has free, or a worn piece (`items.json` armour: helmet, plates, greaves, gloves, boots) better than what it wears there; never two consumables. With no free slot and nothing better to wear, the rule falls back to the plain roll.
42. **Events** (*Suggested* name: the node card says "Crossroads"): two or three trades rolled from `events`, each a cost and a lasting gain, both the engine's to take and give; **each character takes at most one, or walks on**. No check, no judgement, no Narrator.

| Id | Name *(Suggested)* | Cost | Gain | Built from |
| --- | --- | --- | --- | --- |
| ev.offbooks | The off-books armourer | half the step's price (`cut_rate` 0.5: 750 or 1,750), and the item's durability falls to half its new maximum | one grade step to Fine or Masterwork, outside the per-visit limit | `payCredits`, `setGrade`, durability |
| ev.drill_yard | A drill yard | a quarter of current HP now | 300 drill on a carried weapon | `c.hp`, `addDrill` |
| ev.sealed_crate | A sealed crate | 300 credits | a weapon pick of three at Elite rarity (rule 26) | `payCredits`, the loot roller |
| ev.wayside | A wayside shrine | nothing (once a stage) | Devotion 4 XP, or 5 study, or 5 practice (its door's) | `shiftDevotion`, `addStudy`, `addPractice` |
| ev.graft | A back-room graft | max HP −10% for the run (fixed when taken) | a boon rolled from the next tile's pool, its worth on the cap | a `relic` with a `stat: hp` effect and the boon's ops; `addItems` |
| ev.salvage | A salvage buyer | a weapon or item from the pack | 50% of its price (in place of the shop's 25%) | `priceOf`, `run/sell` |

43. **The armourer's chit** (*Suggested*: in the world a chapter armourer's stamped requisition): one grade step to Fine or Masterwork with no credits (the per-visit limit still holds). From the gate Elite's pick (one of its three) and nowhere else in stage 1; an Elite from stage 2 may roll one in its pick (weight as an item). `items.json`, `stock: false`, never sold or sellable.

**Boons** keep their place: one of three after each Boss, the run's rule-changers (Leon accepted them). Gear makes a character better at what it does; a boon changes what it does. One budget holds both kinds of run power: a Relic property and a graft take their worth out of the same 50% as boons (rule 31), so a character choosing a Relic property gives up a boon's room, and the cap still bounds the run.

### 11.4 What a character has gained by each Boss (worked example)

The median path of 11.1, each character in its own purse; upkeep as 11.1; two rests a stage (depths 7 and 14). "Output" is against a bare character of the same level (Standard gear, no boons): offense from accuracy (×1.077 a point, section 5.2) and the Relic property; boons are listed apart.

**A gunner** (the soldier kit: Hellraiser service rifle 900, armour class 3):

| Stage | Credits (carried + earned) | Bought | At the Boss | Trainings | Output |
| --- | --- | --- | --- | --- | --- |
| 1 | 0 + 3,330 | Fine rifle 1,500; armour class 4 1,200; upkeep 400 → 230 left | Fine rifle, class 4 | drill 200 | ×1.08; hits taken −9% at level 7 |
| 2 | 230 + 4,290 | Masterwork rifle 3,500; scope 450; upkeep 450 → 120 | Masterwork rifle, scope | drill 200 (with kills: mark I) | ×1.16 (the scope on aimed shots besides) |
| 3 | 120 + 5,410 | compensator 250, extended magazine 300, ballistic helmet 350, trauma plate 400; upkeep 500 → 3,730 saved | three mods fitted (scope, compensator, extended magazine), two worn pieces | drill 200 | ×1.16, mods about ×1.03 |
| 4 | 3,730 + 6,520 | the Relic step 9,000 (Keen, worth 10 of the 50); upkeep 550 → 700 | a Relic rifle | drill 200 | ×1.16 × 1.10 × 1.03 = **×1.31** |

**A melee fighter** (a Breaker with a war axe, 500, standard, from node 1's pick; armour class 3):

| Stage | Credits | Bought | At the Boss | Trainings | Output |
| --- | --- | --- | --- | --- | --- |
| 1 | 0 + 3,330 | Fine axe 1,500; weighted edge 200; wrapped grip 80; armour class 4 1,200; upkeep 320 → 30 | Fine axe, two mods, class 4 | drill 200 | ×1.08 (+ the edge's damage) |
| 2 | 30 + 4,290 | Masterwork axe 3,500; heavy boots 200; armoured greaves 300; upkeep 320 → 0 | Masterwork axe | drill 200 | ×1.16 |
| 3 | 0 + 5,410 | ballistic helmet 350, trauma plate 400, combat gloves 220; upkeep 350 → 4,090 saved | worn pieces on every slot | drill 200 | ×1.16 |
| 4 | 4,090 + 6,520 | the Relic step 9,000 (Biting); upkeep 350 → 1,260 | a Relic axe | drill 200 | ×1.16 × 1.10 = **×1.28** |

**A caster** (a Sigilist: the `sigil` kit, a service pistol in the main hand and an Evoker, armour class 1):

| Stage | Credits | Bought | At the Boss | Trainings | Output |
| --- | --- | --- | --- | --- | --- |
| 1 | 0 + 3,330 | Fine Evoker 1,500; armour classes 2 and 3 (250 + 600); upkeep 460 → 520 | Fine Evoker (Sigil rolls +1, rule 25a), class 3 | study 6 (a word) | Sigil ×1.08 |
| 2 | 520 + 4,290 | Masterwork Evoker 3,500; upkeep 500 → 810 | Masterwork Evoker | study 6 | ×1.16 |
| 3 | 810 + 5,410 | ballistic helmet 350, trauma plate 400; upkeep 550 → 4,920 saved | two worn pieces | study 6 | ×1.16 |
| 4 | 4,920 + 6,520 | the Relic step 9,000 (Deep: +1 more); upkeep 600 → 1,840 | a Relic Evoker | study 6 | ×1.16 × 1.077 = **×1.25** |

**A healer** (a Mender: the `mender` kit, an Attuner and a service pistol, armour class 2 as the medic's plate):

| Stage | Credits | Bought | At the Boss | Trainings | Output |
| --- | --- | --- | --- | --- | --- |
| 1 | 0 + 3,330 | Fine Attuner 1,500; armour class 3 600; upkeep 520 → 710 | Fine Attuner (its Bonds' save TN +1) | Devotion 4 (or drill) | heals ×1.00 |
| 2 | 710 + 4,290 | Masterwork Attuner 3,500; ballistic helmet 350; upkeep 520 → 630 | Masterwork Attuner (TN +2) | Devotion 4 | heals ×1.00 |
| 3 | 630 + 5,410 | armour class 4 1,200; trauma plate 400; upkeep 550 → 3,890 saved | class 4 | Devotion 4 | heals ×1.00 |
| 4 | 3,890 + 6,520 | the Relic step 9,000 (Gentle); upkeep 600 → 810 | a Relic Attuner | Devotion 4 | heals **×1.15** |

The healer's heal is landed (no roll), so a grade buys its Bonds' TN and its durability, not more healing; its healing grows by level, the Gentle property and the Deep Well boon (+20%). That is the one class the gear grows least (question 10).

### 11.5 How the simulated party spends (for section 5.6)

In order, at each shop: (1) a grade step on the item its door uses most (the weapon of its most-used category, else its focus), when affordable; (2) the next armour class, if its traits and Pain Threshold allow it; (3) a mod for a free slot, cheapest first; (4) a worn piece for an empty slot; (5) from stage 3, save for the Relic step; refills (upkeep) always first, at the counter's fixed prices. Rests: the training for its door (drill for a weapon user, study for a Sigil user, practice for an Outburst user, Devotion for the Faithful otherwise). Events: the off-books step if it can't afford a step that stage, else walk on. The plan is a policy in `test/balance/policies.ts`, so a better plan found in play is one edit.

### 11.6 Gear in the difficulty curve

**A fully upgraded character against a bare one at the same level, under the balance contract:**

1. **Grade.** Rarity buys accuracy only (`rules.json rarity`: `acc` 0 / 1 / 2 / 2 / 2, `dmg` 1 at every grade since rules 1.26). One point to hit is ×1.077 on the party's hits (section 5.2, from the settled curve), so **Masterwork is ×1.077² = ×1.16**. That is exactly the contract's step from the plain rifle all in (125) to the best gun (145): 145 ÷ 125 = 1.16; the contract names `rules.json rarity` as the best gun's dial. **A graded weapon reaches the contract's best-gun ceiling and never passes it.** A Masterwork focus (rule 25a) gives a Sigil's or an Outburst's hits the same ×1.16 over what the contract measured with a Standard focus (question 5).
2. **Relic.** No accuracy past Masterwork; its property is run power (up to 10%), inside the boon cap.
3. **Mods** are not held by the contract yet (its section 7); estimated up to ×1.05 (a compensator or foregrip on Bursts, a scope on aimed shots); the simulated run measures them.
4. **Armour.** Fitting and worn pieces subtract a flat value from each hit (`ARMOUR` 5 a class, `landed` in `effects/output.ts`). Against a Soldier's hit of about 38 before armour at level 1 (23.4 landed through class 3's 15), class 4 is **−21%** taken; at level 7 (the hit ×1.1119⁶ = ×1.89, about 72) **−9%**; at level 16 (×4.9, about 189) **−3%**. Armour carries stage 1 and fades by design of a flat value against a level-scaled hit, until Equipment 2.0.
5. **In all:** a fully upgraded character deals **×1.16 to ×1.22** a bare one's (grade and mods), **×1.28 to ×1.34** with a Relic property, and at most **×1.16 × 1.05 × 1.5 = ×1.83** with a full boon cap (Relic property inside it); draft 2 counted ×1.5 (boons alone).

**The stage curve with gear in** (the party's offense at each stage's start on the median plan of 11.4, boons +10% each, against the bulk target):

| Stage start | Gear | Boons (and property) | Party | Bulk at 0.25 (draft 2) | Ratio | Bulk at 0.35 (draft 3) | Ratio | Draft 2's ratio (boons only) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1.00 | 1.0 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| 2 | 1.077 (Fine) | 1.1 | 1.18 | 1.25 | 0.95 | 1.35 | 0.88 | 0.88 |
| 3 | 1.16 × 1.02 | 1.2 | 1.42 | 1.50 | 0.95 | 1.70 | 0.84 | 0.80 |
| 4 | 1.16 × 1.04 | 1.3 | 1.57 | 1.75 | 0.90 | 2.05 | 0.76 | 0.74 |
| 5 | 1.16 × 1.05 | 1.5 (4 boons + Keen) | 1.83 | 2.00 | 0.91 | 2.40 | 0.76 | 0.70 |

At draft 2's 0.25 the party would hold about 0.9 of the enemy's bulk all the way to stage 5: runs would last a stage or more past the target Leon accepted. At **0.35** the ratios come back to draft 2's through stage 4, where the target ends (0.88, 0.84, 0.76 against 0.88, 0.80, 0.74). So rule 19 now reads 0.35 and the stage rows of section 5.3 are re-checked there; the pressure term (+15% a stage) is unchanged, because the only defensive gear (armour) fades with level. The simulated runs (5.6) fit the final number.

### 11.7 The numbers this section adds (all PROVISIONAL; spec section 14 items when built)

`stage.credits` 0.35; `stage.bulk` 0.35 (was 0.25); `grade_up.price` fine 1,500, masterwork 3,500, relic 9,000; `grade_up.per_visit` 1; `grade_up.relic_from_stage` 3; `grade_up.cut_rate` 0.5; `relic_props` worths 10, 6, 6, 10, 4, 8, 6 and their values (+10%, +2, −1 AP, +10%, free swap, +1, +15%); `train.drill` 100, `train.study` 3, `train.practice` 5, `train.devotion` 2; `lasting_min` 2; `map.kind_weights` fight 44, cache 12, event 10; the events' numbers (750 / 1,750, a quarter of HP, 300 drill, 300 credits, 4 Devotion XP, 5 study, 5 practice, −10% max HP, 50% sale); `run.dead_return_hp` 1; the upkeep estimates (400 to 600 a stage) and the mods' ×1.05 (estimates, not data).

## 12. Open questions for Leon (each with the recommendation; built as recommended if unanswered)

Draft 2's questions 1 to 8 are settled (the block at the top). Still open:

1. **Difficulty settings:** one in v1; Hard later is one field. **The name:** Survival *(Leon's)*.
2. **The lead's calls made here:** a mode, not a generated campaign; trapped caches cut; a rest is a new session **and a training** (draft 2's "no rest or train" reversed by section 11); the always-stocked list (beyond Leon's ammunition floor: cores, parts, stims, kits, grenades, special rounds, restock); credits instead of a weapon at 50% of the cheapest offer; one offer always for your door; armour fitting until Equipment 2.0; no Celestial enemies; the Narrator panel collapsed, not hidden; the next tile by setting and boon theme; one currency (credits) and one rare item (the chit), not two currencies.

New, from draft 3:

3. **The curve's dial with gear in:** `stage.bulk` 0.25 → **0.35**, so the target you accepted (four end in stage 3 or 4) still holds once grades and mods count (section 11.6). **Recommend 0.35,** fitted by the simulated runs; the alternative is runs a stage longer.
4. **A death costs nothing past its fight:** the dead come back at 1 HP and take a full share of the won fight's rewards. **Recommend yes** (the alternative, no weapon pick for the dead, punishes the player who was focused, not the one who played badly).
5. **A graded focus and the contract:** the Sigil and Outburst ceilings were measured with a Standard focus; your ruling 3 adds up to ×1.16 with a Masterwork one. **Recommend treating it as the gun's case:** the ceilings stay what a Standard focus reaches, the grade is gear on top (as the best gun sits on the plain rifle), and the guard gains a "best focus" row measured at Masterwork; no dial changes.
6. **The grade ladder:** 1,500 / 3,500 / 9,000 credits, one step a character a visit, the Relic step from stage 3, Celestial never sold. **Recommend as written.**
7. **The Relic step's property:** one of three, its worth taken from the 50% boon cap. **Recommend yes** (one run-power budget; without it a Relic stacks on a full cap).
8. **Rarity's "+1 mod slot":** the Core Rules table lists it; the engine never read it (mods fit by the weapon's slot list). **Recommend leaving it as built** for Survival (enforcing a count would take mods off Standard weapons that carry them today); settle it with Equipment 2.0.
9. **A respec or perk-swap service** at an escalating price (Slay the Spire's removal, the research's "thinning" lesson). No primitive exists. **Recommend later,** with the roguelike, not in v1.
10. **The healer grows least from gear** (heals are landed, so a grade buys its Bonds' TN, not healing). **Recommend accepting it and measuring** the healer's share in the simulated runs; if it falls behind, a healer property or boon in the pools, never a new rarity effect.
11. **Events:** six trades, each with a cost, at most one each, always "walk on"; the node named Crossroads *(Suggested)*. **Recommend as written.**
12. **Rest trainings:** drill 100, study 3, practice 5, Devotion 2 (about two uses' worth each, a third of a drill mark). **Recommend as written.**
13. **Income:** `stage.credits` 0.35 (income follows fight length, prices stay fixed); the armourer's chit only from the gate in stage 1. **Recommend as written.**
