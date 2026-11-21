# The growth bible: the shape of every file (0.34 rebalance, ruling F)

The bible is seven JSON files in this folder and one checker, `tools/balance/check.py`. **A number lives in exactly one JSON place**; every other use is a reference to it by name. The prose files in `docs/design/growth/` explain and carry no number the JSON does not. Nothing here changes `data/`; the builders apply the JSON to `data/` later.

| File | Owner (prose) | Holds |
| --- | --- | --- |
| `scale.json` | `01-scale.md` | the factor, the level columns, the cards and profiles, HP, MP and the cost rules, a plate, armour, the grade ladder, Margins, the cash-out sum, the stack rule, the digit limits, the caps (written; the one file that exists first) |
| `body.json` | `02-body.md` | Endurance, Strength, Agility: each attribute's card, door, three ladders and class |
| `mind.json` | `03-mind.md` | Perception, Intelligence, Expression: the same shape |
| `soul.json` | `04-soul.md` | Insight, Determination, Virtue: the same shape |
| `gear_perks.json` | `07-gear-perks.md` | grades (by reference), mods, signatures, every perk, the Mastered perks, Margins' feeders, traits |
| `pacing.json` | `05-pacing.md` | the clock (maps and hours), XP, gains, gates, every practice rate, credits, grades by map, door Marks' rates, the four spend plans, the calendar, the collection, **the migration (the one copy)** |
| `world.json` | `06-world.md` | enemy tiers, the stated attacker and defenders, levels by map and row, the five maps, the final boss, endless, the budget, campaign tiers |

Run `python tools/balance/check.py` (all checks) or `python tools/balance/check.py --tables [section]` (the tables the prose quotes; `pacing`, `calendar`, `spend`, `hits` and `budget` are 05's and 06's; `tools/balance/pacing.py` is retired and forwards there). `--bible DIR` runs on a scratch folder of trial files, so a drafter can try a file before it lands here. On Windows set `PYTHONUTF8=1` and use `python`.

---

## 1. Conventions every file follows

### 1.1 References

- **A whole string `"@file.path.to.key"` is a reference.** `file` is one of `scale`, `body`, `mind`, `soul`, `gear_perks`, `pacing`, `world`; the path is dotted keys (a number segment indexes a list). The checker replaces it by the value there, recursively.
- **Inside a formula** (`"1 + @scale.margins.per * m"`) a reference must resolve to a number.
- **Inside prose** (`"why"`, `"text"`) an `@file.path` is checked too: it must resolve. Do not write `@` in prose for anything else.
- A reference into a file that does not exist yet is **WAITING**. A reference to a missing key, or a loop, is a **FAILURE**. When a whole file is loaded, a waiting reference stays as its string; only reading that value (a number, a formula) waits.
- **Collections are objects keyed by id, never lists**, so every item has a path: `body.attributes.strength.door.cashouts.coup`, `gear_perks.perks.iron_grip`.

### 1.2 Today's numbers: data references (read only)

A number that is today's row is read, never copied: `{"data": "file.json:path"}`, optionally `"x": <number or reference>` (multiplied). The path is dotted with `[n]` or `[id]` selectors: `{"data": "enemies.json:items[soldier].hp", "x": "@scale.factor.value"}`. `{"data_count": "techniques.json:items"}` is the length of a list (optionally `"x"`, multiplied: `{"data_count": "figments.json:forms", "x": 3}`). Facts about today in prose carry `file:line`.

### 1.3 Formulas

A formula is a string the checker evaluates: numbers, `+ - * / ** // %`, comparisons, `a if c else b`, `and` / `or`, and these functions: `deal(L)`, `mend(L)`, `mp(L)` and every other column by its name (`enemy_hp(L)`), `col('deal', L)`, `stat('melee', A, S)`, `grade_dmg(G)`, `grade_acc(G)`, `grade_arm(G)`, `cash(n)` (the cash-out sum), `plate(L, E, DUR, G)`, `hp(L, E, PT)`, `mp_pool(L, DET, INS)`, `weapon('<row id>')` (the row's new base), `round`, `floor`, `ceil`, `min`, `max`. Names a context gives:

| Where | Names |
| --- | --- |
| a column | `L`, and the column's own numeric keys (`end`, `per_level`) |
| a door's `plain`, a cash-out's `base`, `formula`, `targets`, `per_turn` | `L` level, `A` the door attribute, `S` the alpha's points, `G` the grade, `P` Perception, `n` units spent, `reach` (at `S`, family full), `bite` (at `S`), and in a cash-out `plain` (the door's plain hit at these numbers) |
| a beta's `feed.formula` | `B` the beta's points, `A_alpha` the alpha's points (read by the builders; the checker does not evaluate it) |

### 1.4 Words every point and move carries

- **`felt`**: one line, in the player's words, of why this point is felt. **Never empty**: an empty `felt` is a dead point and fails check (c).
- **`needs`**: family gates, `{"<skill id>": <points>}`. On a Reach step, the step is held only when every need is met (ruling 13).
- **`needs_ally`: true** on a move that names an ally, with **`solo`**: what it does when the squad is one (ruling 32: "an ally" includes yourself). Missing `solo` fails check (f).
- **A sum term** (ruling 30): `"sum": {"door": "<door id or any>", "value": <share>, "group": "<optional exclusive group>"}` on the item that grants it (a fork, a class move, a perk at tier II, a mod, a boon, a signature, a property). The checker adds every term whose `door` is a door's id (or `any`) into that door's sum, taking the best of each `group` (the two forks at a point share a group). A **to-hit term** has the same shape under `"to_hit"`. A **reach term** has the same shape under `"reach_plus"`: units a fork or a class thing adds to a cash-out past the Push (Many Hands' +1 Figment held, the Rigger's Double and Sentinel in the Curtain); check (a) adds them to the largest legal turn's units (mind.json).
- **`why`**: the reason a player sees, one line, for every number a drafter chooses. **Every number is PROVISIONAL** unless the lead's rulings fix it.

### 1.5 The rest

- Every file begins with `"_meta": {"file", "owner", "status"}`.
- Every file but `pacing.json` that touches migration says `"migration": "@pacing.migration"`; only `pacing.json` holds a dict with `"revision"` and `"owner"` (check (g)).
- Ids are the game's: skills, attributes, classes and weapon rows as `data/*.json` names them (Insight's gamma is `implication` in `data/skills.json`; each skill's `slot` there says alpha, beta or gamma).

---

## 2. `scale.json` (written)

Top-level keys and what each holds. The file itself is the full example; `python tools/balance/check.py --tables scale` prints its ten tables.

| Key | Shape | Read by |
| --- | --- | --- |
| `factor` | `value` 0.6; `rounding`; `walk` (the key names and shapes the factor moves; `skip`; `extra_keys`; `not_touched`); `self_paid.rows[]` `{file, path, share: "@scale.costs.shares.<id>"}`; `restated_elsewhere[]` `{file, path, by: "@<owner path>"}` (each owner must hold that path); `own_factor` (the level-1 two-digit rule for weapon rows, computed); `draw_bows` | `--tables factor`, `--tables weapons`, every weapon base |
| `columns.<name>` | `{formula, <params>, reads, why}`; names: `deal`, `mend`, `mp`, `enemy_hp`, `enemy_damage`, `enemy_armour`, `defense_plus`, `attack_plus` | everything that grows with level |
| `cards` | `stat_formula`, `attr_slope`, `skill_slope`, `normal_share` (data), `one_pair`, `profiles.<id>` `{pair, pin, column, grade, slopes?}` (`pin`: `today_profile` / `today_k`, optional `fold`, or `value`; `k` is computed) | every Stat term |
| `hp` | `{formula, base, per_end, per_level, pt_pct}` | `hp(...)`, check (b) |
| `mp_pool` | `{formula, base, det, ins}` | `mp_pool(...)` |
| `costs` | `rules.<clock/count/design/mp/share/deal>`, `pump_share`, `shares.<id>` | every cost a door or item names (`"cost": {"rule": "mp", ...}`) |
| `plate` | `{formula, soak: {data, x}, then}` | `plate(...)`, Guard |
| `armour` | `{formula, classes: {data, value_key, x}, cover}` | check (b) |
| `grades` | `order`; `<grade>` `{dmg, acc, arm, mod_slots, properties}`; `prayer.standing_for` | `grade_dmg`, `grade_acc`, `grade_arm` |
| `margins` | `step`, `per`, `per_perception`, `natural_20`, `skill_modifier` (data), `level_gap` (data) | check (a) |
| `cash_out` | `grow`, `sum_formula` | `cash(n)` |
| `stack` | `formula`, `multiplies`, `adds`, `sum_floor`, `scope.foe_mark.value` | check (a) |
| `digits` | `l1_specialist`, `l20_specialist`, `plain_l1`, `plain_l20`, `full_cashout_l20`, `largest_turn_l20` | check (a) |
| `caps.items.<id>` | `{today: "file:line", ruling: keep/remove/replace, by?, with?, why}` | `--tables caps` |

---

## 3. `body.json`, `mind.json`, `soul.json` (one per Core)

```
{
  "_meta": {...},
  "attributes": {
    "<attribute id>": {
      "card":    { "lines": [ {text, slope | number, profiles?, data_key?} ], "felt" },
      "door":    { ... section 3.1 ... },
      "ladders": { "<alpha id>": {...}, "<beta id>": {...}, "<gamma id>": {...} },   section 3.2
      "class":   { ... section 3.3 ... }
    },
    ... the Core's other two attributes ...
  },
  "migration": "@pacing.migration"
}
```

**Every one of the three attributes must be there**, with all three ladders at ten points each (check (c) fails a missing one).

### 3.1 The door

| Field | Required | Shape and meaning |
| --- | --- | --- |
| `id`, `name` | yes | the door's id (`guard`, `momentum`, `pressure`, `shadow`, `sigils`, `figments`, `bonds`, `outbursts`, `prayer`): the id sum terms name |
| `counter` | yes | `{resource, unit, starts_at}` |
| `builds`, `spends`, `wears` | yes | lists of `{by, units, ap?, min?}` (`units` a number, `"all"`, or `"own"`: the move's own cost in data, kept) |
| `plain` | yes | the door's plain hit: `{name, weapon: "<row id>", profile?}` (the row's new base, its profile unless named, the door's pair: ruling 31), or `{name, base: <number, data or reference>, profile}`, or `{name, formula}` |
| `cashouts.<id>` | at least one with `from_point` 1 | `{name, from_point, ap, spends, min?, rolls: bool, formula, base?, targets?, per_turn?, terms, why}`. `formula` is the cash-out factor C (in plain hits of `base`, which defaults to `plain`); `targets` multiplies (Snap All and Slam count every foe or Bond they touch: ruling 29); `per_turn` how many can land in one turn (default 1); `rolls` true means Margins apply |
| (cash-out extras) | no | a cash-out may hold named numbers of its own (`most_foes`, `bite_less`) that its `formula` or `targets` reads as inline `@` references, so the number has one place; `reading_of: "<cash-out id>"` marks a second reading of the same move (one foe and a ring; another weapon through `base`) so the checker prints and checks it; `save_harder` (a count formula, printed, not evaluated) |
| `push` | yes | `{point: 8, name, reach_plus, price, price_kind}` (ruling 17) |
| `marks` | yes | `{unit, rate: "@pacing.door_marks.<door id>", gifts: {I, II, middle, III}}` (the thresholds are pacing's, computed) |
| `keeps_tags` | yes | `[{move, door?, keeps_for?, keeps}]`: Crossings' base layer |
| `forks` | where the ladder has them | `{"4": [fork, fork], "8": [fork, fork]}`, each `{id, name, text, sum?, to_hit?}`; give the two forks of a point the same `group` |

Filled example (Momentum, from 02 section 2; the cash-out numbers are 02's):

```json
"door": {
  "id": "momentum", "name": "Momentum",
  "counter": {"resource": "momentum", "unit": "a chain step", "starts_at": 1},
  "builds": [{"by": "a plain melee hit", "units": 1}, {"by": "Shield Bash", "units": 1}],
  "spends": [{"by": "a Strike or an Opener", "units": 1, "ap": "the technique's"},
             {"by": "a Finisher", "units": "all", "min": 2, "ap": "the weapon's"}],
  "wears": [{"by": "each tile walked", "units": 1}],
  "plain": {"name": "an Ork wreck saw blow", "weapon": "ork_wreck_saw"},
  "cashouts": {
    "coup": {"name": "Coup", "from_point": 1, "ap": "the weapon's", "spends": "all", "min": 2, "rolls": true,
             "formula": "1 + bite * cash(n)", "terms": ["bite", "cash"],
             "why": "the whole chain on one blow; the specialist waits about four turns for x7"},
    "cleave": {"name": "Cleave", "from_point": 1, "ap": "the weapon's", "spends": "all", "min": 2, "rolls": true,
               "formula": "1", "targets": "min(8, 1 + floor(cash(n)))", "terms": ["cash"],
               "why": "one more adjacent foe a step, each at full damage"}
  },
  "push": {"point": 8, "name": "Overswing", "reach_plus": 1, "price": "Off Balance until your next turn", "price_kind": "condition"},
  "marks": {"unit": "a chain step spent by a Finisher that lands on a worthy foe", "rate": "@pacing.door_marks.momentum",
            "gifts": {"I": {"text": "a fight starts at 2, not 1", "op": "stat momentum_start +1"},
                      "II": {"text": "a hit taken costs a step only once a round"},
                      "middle": {"text": "a Charge that hits builds one more"},
                      "III": {"text": "Overswing costs nothing once a fight"}}},
  "keeps_tags": [{"move": "Fire and Move, Run and Gun", "door": "pressure", "keeps": "the chain (a free step is not a walk)"}],
  "forks": {"8": [
    {"id": "fork.momentum.spill", "name": "Spill", "text": "a Finisher that drops its target hits the next for half",
     "sum": {"door": "momentum", "value": 0.10, "group": "fork:momentum:8"}},
    {"id": "fork.momentum.headlong", "name": "Headlong", "text": "a Charge's tiles do not wear the chain",
     "sum": {"door": "momentum", "value": 0.0, "group": "fork:momentum:8"}}]}
}
```

(The Spill value here is a placeholder of the example, not a proposal.)

### 3.2 The ladders

```
"<skill id>": {
  "role": "alpha" | "beta" | "gamma",
  "card": {text, slope},                          alpha only: the +5% line (a reference to scale)
  "feed": {formula, feed_flat, feed, feeds},      beta only (ruling 20: one key name, feed_flat)
  "points": { "1": {...}, ..., "10": {...} }      all ten
}
```

A point: `{exists?, reach?, bite?, needs?, new?, felt, numbers?}`. `exists` what is there today and stays; `reach` and `bite` only where they step (the value held from that point on); `needs` the family gates of a Reach step; `new` what this pass adds; `felt` required; `numbers` any per-point number with its key (`{"hp_pct": "@scale.hp.pt_pct"}`). **Alpha rules the checker enforces:** Reach at point 1, Reach climbing, a step at 7 needing the beta at 4, a step at 10 needing the beta at 7 and the gamma at 4 (ruling 13).

Filled examples (02 section 2):

```json
"raw_power": {"role": "alpha", "card": {"text": "+5% damage with the rows that hit with Raw Power; +1 to hit", "slope": "@scale.cards.skill_slope"},
  "points": {
    "1": {"exists": "the door: Coup, Cleave, Break", "reach": 3, "bite": 0.25, "new": "the cash-out sum on every Finisher", "felt": "a x3 Coup is about two blows in one"},
    "6": {"exists": "perk step", "bite": 0.30, "felt": "every step spent bites a fifth harder"},
    "7": {"exists": "perk step", "reach": 5, "needs": {"guts": 4}, "felt": "x5: a Coup worth three blows"},
    "8": {"exists": "fork: Spill or Headlong", "new": "the Push: Overswing", "felt": "one step past your Reach, and you stagger for it"},
    "10": {"exists": "Mastered: Earthbreaker", "reach": 7, "needs": {"guts": 7, "intimidation": 4}, "felt": "x7: a different machine from a 5"},
    "...": "points 2 to 5 and 9 the same way"
  }},
"guts": {"role": "beta", "feed": {"formula": "1 + feed_flat * B + feed * A_alpha * B", "feed_flat": 0.02, "feed": 0.01, "feeds": "the chain's wear"},
  "points": {"1": {"exists": "the feed; +1 on Body saves", "felt": "the chain lasts a little longer and you shrug off a shove"},
             "4": {"new": "opens Raw Power's Reach at 7", "felt": "your x5 opens"}, "...": "all ten"}},
"intimidation": {"role": "gamma",
  "points": {"2": {"new": "a Threaten that lands gives you 1 Momentum", "felt": "they flinched; you are already moving"}, "...": "all ten"}}
```

### 3.3 The class

```json
"class": {
  "id": "fighter", "name": "Breaker",
  "only_it_has": [{"id": "the_room", "text": "the room is its weapon: Wrecker, Breach, Into the Wall, Hurl, and Launch"}],
  "ranks": {
    "3":  [{"id": "launch", "name": "Launch", "ap": 2, "cost": {"rule": "count", "res": "momentum", "units": "all", "min": 2},
            "worth": "a Coup's payoff, then the throw", "cashout": {"formula": "1 + bite * cash(n)", "rolls": true}}],
    "5":  [{"id": "riposte", "name": "Riposte", "ap": "reaction", "cost": {"rule": "count", "res": "momentum", "units": 1}, "worth": "a blow back for no AP"}],
    "15": [{"id": "measured_blow", "name": "Measured Blow", "ap": 0, "cost": {"rule": "count"}, "worth": "half the steps back after a kill, once a fight"}]
  },
  "solo": "nothing in the Breaker's kit needs an ally"
}
```

A move: `{id, name, ap, cost: {rule: "<scale.costs.rules key>", res?, units?, mp?}, worth, sum?, to_hit?, needs_ally?, solo?, cashout?}`. `worth` is in plain actions of the same AP (the test the door files use). A class move whose bonus is a share is a sum term with the door's id (ruling 30); C16 prefers a thing only the class can use over a percentage. The ranks are at levels 3, 5 and 15 (`@pacing.gates.rank_levels`).

### 3.4 The attribute card

```json
"card": {"lines": [
  {"text": "+10% damage with the melee rows that scale with Strength and on the physical profile", "slope": "@scale.cards.attr_slope", "profiles": ["melee", "physical"]},
  {"text": "+5 kg carried", "number": 5, "data_key": "attributes.json strength.derived"}],
 "felt": "every swing and every load"}
```

---

## 4. `gear_perks.json`

```
{
  "_meta": {...},
  "grades": "@scale.grades",
  "boon_room": {"cap": {"data": "survival.json:boon_cap.cap"}, "properties_take_room": false},
  "mods.<id>":        {slot, trade, gives, costs, sum?, to_hit?, grade_from: "masterwork"},
  "signatures.<family>": {maker, door, behaviour, feeds, sum?, data: "families.json signature"},
  "properties.<id>":  {grade: "relic" | "celestial", text, sum?},
  "perks.<id>":       {verdict, tier_i: {...}, tier_ii: {...}, feeds, own_door, fight_half?, data_line: "perks.json:<line>"},
  "mastered.<skill id>": {perk, verdict, worth, numbers?},
  "margins_feeders.<id>": {today: "file:line", becomes},
  "traits.<id>":      {verdict, numbers?, text},
  "migration": "@pacing.migration"
}
```

`verdict` is one of `keep`, `restate`, `rewrite`, `cut`. `feeds` names the sum it feeds: `sum` (the stack's one sum), `to_hit`, `reach`, `bite`, `margins`, `hp`, `mp`, `cost`, `story`. `own_door` is the door id or `null`. A perk with a fight half from ruling 21 says it in `fight_half`. Filled example:

```json
"perks": {
  "iron_grip": {"verdict": "restate", "own_door": "momentum", "feeds": "sum",
                "tier_i":  {"text": "+15% on a Finisher against a Grappled or Prone foe", "sum": {"door": "momentum", "value": 0.15, "group": "perk:iron_grip"}},
                "tier_ii": {"text": "+30% on a Finisher against a Grappled or Prone foe", "sum": {"door": "momentum", "value": 0.30, "group": "perk:iron_grip"}},
                "data_line": "perks.json:<line>"}
},
"traits": {"oil_in_my_mind": {"verdict": "restate", "numbers": {"hp_share": -0.02}, "text": "..."}}
```

(Give a perk's two tiers one `group`, so the checker counts the tier II alone. Placeholder values in the example.) `scale.json` points to `gear_perks.traits.oil_in_my_mind`, `.oil_in_my_soul` and `gear_perks.boon_room`: those keys must exist.

**Extensions written by 07 (third pass), read by `check.py`:**

- **A plain-hit term:** `"sum": {"scope": "plain", "hits": [<profile names of scale.cards.profiles> or "any"], "value", "group"?, "take"?}`. It names no door, so it never reaches a cash-out (ruling 30); the checker adds it to a door's largest plain hit when `hits` holds that door's plain profile. A group keeps its best one, or its best `take` (the traits: `{"data": "rules.json:character.creation.traits.max"}`). Every `sum` or `to_hit` dict in body, mind, soul and gear_perks must name a `door` (or `any`), or be such a plain term: check refs (TERMS) fails one with neither.
- **The largest plain hit** (check (a)): a door's plain hit at level 20, 10/10, the largest-turn grade, with Margins from the same to-hit as its cash-outs (when any of its cash-outs rolls), times (1 + the door's own sum + the plain terms of its profile + the mark), at most `scale.digits.largest_turn_l20.max`.
- **`plus` on a data reference:** `{"data": "...", "x"?: n, "plus": n}` is data x n + plus, so today's multiplier is read as its share (`{"data": "survival.json:relic_props[prop.keen].effects[0].value", "plus": -1}` is +0.1), never copied.
- **More `feeds` words:** `verb` (an action, a condition or AP: no sum), `taken` (the defender's side), `mend`.
- **More top-level keys in gear_perks.json** (read by people, not by a check, unless they hold terms): `rules` (the step `rules.restep`, the felt bar, what is a door's own, the one mark, `mp_restate`), `grade_rows`, `grades_by_map` (`values: "@pacing.grades_by_map"` and the vault rule, ruling 35), `fit_fee`, `signature_piece`, `boons.<id>` (where each boon counts; the list is world's), `traits_budget`, `repick` (ruling 39's list; the migration itself is `@pacing.migration`), `open`. To-hit terms that reach several doors sit in a list `to_hit_doors: [{"to_hit": {door, value, group}}]` on the item. A mark is `"mark": {"name", "kind": "damage" | "to_hit", "value"}` (a damage mark's value is `@scale.stack.scope.foe_mark.value`); it is not a `sum` term (the checker adds the one mark itself).

---

## 5. `pacing.json`

| Key | Shape | Read by |
| --- | --- | --- |
| `clock` | `gate_at_share` (where in a map's hours its gate falls), `first_endless_map`, `tolerance_h`, `maps.<m>` `{start_h, end_h, squad_arrives, squad_leaves, worthy_fights}` (ruling 36: the only clock); **`time_model`** (the ASSUMED minutes: `turn_min_l1`, `turn_min_per_level`, `foe_turn_min`, `foes_solo`, `rounds_vs_target`, `after_fight_min`, `node_min.<kind>`, `node_min_per_extra_player`, `choose_min`, `camp_min`, `boon_min`) and **`route`** (`half_a`, `half_b`: node kind to count; `fights`, `rounds_of`, `depth`, `worthy_fights`): check (e) CLOCK recomputes every map's hours, the levels held and `levels.xp_total` from them and fails a row that disagrees (extension, pass 3, 05's drafter) | checks (b), (e) |
| `xp` | `fight_xp {at_1, per_level}`, `kind_mult`, `worth` (by level gap), `party_pace` (ruling 37: practice and Devotion, not XP), `campaign_sources`, `campaign_tiers` (one_shot, season, campaign, epic: `{levels, hours}`) | (prose tables) |
| `levels` | `career {skill: 38, attribute: 20}`; `gains {creation, odd, even, by_level}` (each `{skill, attribute}`; levels 4 and 14 `{2, 0}`, 5 and 15 `{1, 1}`); `lands.<level>` `{map, at: "gate" | "boss"}` (the level arrives there); `xp_total.<level>` | (d), (e) |
| `gates` | `ceiling_by_level {"1": 7, "5": 8, "10": 9, "15": 10}`, `rank_levels`, `rank_thresholds` | (b), (d) |
| `tracks.<id>` | every practice rate: `drill`, `shield_soak`, `study`, `word_marks`, `found_spells`, `modules`, `feelings`, `form_marks`, `devotion`: `{earned_by, today: "file:line", rate, thresholds, why}`; a track may hold `per_fight`, a formula of its own keys (inline `@` references), which a stream's `units_per_fight` names | the calendar's streams |
| `door_marks.<door id>` | `{units_per_fight}`; the thresholds are computed: units x the worthy fights walked by each of `door_marks_hours` (a calendar stream reads them as `"thresholds": {"door_marks": "<door id>"}`) | door files' `marks.rate` |
| `door_marks_hours` | `[2, 11, 17, 23]` | |
| `credits` | `{income, grade_step: {floors, place}, reforge}` (ruling 26: one price) | |
| `grades_by_map` | `finds_from_map {fine, masterwork, relic, celestial}`, `shelf_from_map {fine, masterwork, relic}` (never celestial), `vault` (ruling 35: the map's finds grade) | (e) against ruling 25 |
| `spend_plans.<id>` | `{label, doors: [door ids], attributes: [[attr, target], ...], skills: [[skill, target], ...]}`: the four (a wall, a Breaker who prays, a Sigilist, a Mender with a gun) | (d) |
| `calendar` | `hours [0, 49]`, `level_20_between [38, 43]`, `map_events [{at, label, maps?}]` (`{map}` in a label is the map; `at` is `start`, `gate`, `boss` or a share of the map's hours; `maps: [from, to]` limits it to those maps), `streams.<id>` `{label, thresholds: [..] or {first, every, count?} or {cycle: [..]} (one bar after another) or {each: [..], over: n} (n items filled evenly) or {door_marks: id}}` (cumulative units), `characters.<id>` `{plan, streams: [{stream, units_per_fight, label?}], collects: [system ids]}` (`units_per_fight` a number, a reference or a formula; `{n}` in a label is the event's count) | (e) |
| `collection` | `target 0.8`, `by_hour 50`, `systems.<id>` `{of (number or data_count), stream (an id or a list of ids), start}` (ruling 23: each system the character's doors open; techniques against all 66) | (e) |
| `migration` | **the one copy** (ruling 39): `{revision: "GROWTH_REV", owner: "docs/design/growth/05-pacing.md", rows: [{what, who, how}], leon_call: "..."}` | (g) |

Filled examples:

```json
"clock": {"gate_at_share": 0.385, "first_endless_map": 6,
          "maps": {"1": {"start_h": 0.0, "end_h": 2.6, "squad_arrives": 1, "squad_leaves": 3, "worthy_fights": 9.6}, "...": "every map to hour 50 and past"}},
"levels": {"career": {"skill": 38, "attribute": 20},
           "gains": {"creation": {"skill": 10, "attribute": 10}, "odd": {"skill": 2, "attribute": 0}, "even": {"skill": 1, "attribute": 1},
                     "by_level": {"4": {"skill": 2, "attribute": 0}, "5": {"skill": 1, "attribute": 1}, "14": {"skill": 2, "attribute": 0}, "15": {"skill": 1, "attribute": 1}}},
           "lands": {"2": {"map": 1, "at": "gate"}, "3": {"map": 1, "at": "boss"}, "...": "to 20"}},
"gates": {"ceiling_by_level": {"1": 7, "5": 8, "10": 9, "15": 10}, "rank_levels": {"I": 3, "II": 5, "III": 15}, "rank_thresholds": {"II": 5, "III": 8}},
"door_marks": {"momentum": {"units_per_fight": 9}},
"spend_plans": {"breaker_who_prays": {"label": "a Breaker who prays", "doors": ["momentum", "prayer"],
                "attributes": [["strength", 10], ["virtue", 7]], "skills": [["raw_power", 4], ["guts", 4], ["faith", 3], ["...", 0]]}},
"calendar": {"hours": [0, 49], "level_20_between": [38, 43],
             "map_events": [{"at": "boss", "label": "boon (map {map})"}, {"at": "gate", "label": "gate pick (map {map})"}],
             "streams": {"drill": {"label": "weapon Mark {n}", "thresholds": {"first": 300, "every": 600}},
                         "door": {"label": "door Mark {n}", "thresholds": {"door_marks": "momentum"}}},
             "characters": {"breaker_who_prays": {"plan": "breaker_who_prays", "collects": ["techniques"],
                            "streams": [{"stream": "drill", "units_per_fight": 70}, {"stream": "door", "units_per_fight": 9}]}}},
"collection": {"target": 0.8, "by_hour": 50, "systems": {"techniques": {"of": {"data_count": "techniques.json:items"}, "stream": "drill", "start": 4}}},
"migration": {"revision": "GROWTH_REV", "owner": "docs/design/growth/05-pacing.md",
              "rows": [{"what": "attribute ceilings", "who": "a 0.33 character above a new ceiling", "how": "c.capGrace, by attribute"}],
              "leon_call": "keep the old Reach, or one free re-spend of all points (asked 21 Nov; the re-spend is the plan, the grandfathering the fallback)"}
```

A stream's thresholds in `calendar.streams` should be references to `tracks` where the track owns them (`"thresholds": "@pacing.tracks.drill.thresholds"`), and a door's stream to its computed Marks (`{"door_marks": "<door id>"}`); the checker reads whatever the reference resolves to.

---

## 6. `world.json`

| Key | Shape | Read by |
| --- | --- | --- |
| `tiers_rule` | `{hp_x: "@scale.factor.value", armour_x: "@scale.factor.value", damage_x: 1.28}` (`scale.json` points to `damage_x`) | (b) |
| `tiers.<tier id>` | `{hp, armour, damage, attack_bonus}` as data references to `enemies.json items[<tier>]`, `defense` (8 / 9 / 11 / 14 / 15), `pressure_off`, `lag`, `bulk`, `pressure` | (a) lowest Defense, (b) |
| `enemy_weapon` | `{weapon: "<row id>"}`: the foe's hit the hit tables count | (b) |
| `stated_attacker` | `{levels: [1, 5, 10, 15, 20], ordinary_sum_per_level, min_exchanges (a number or a formula), against: [tier ids], builds: [{id, weapon} or {id, base, profile}]}`; its points follow `@pacing.gates.ceiling_by_level`, its grade is one under the finds grade of the map where the squad is at that level | (b) |
| `stated_defender` | `{against: [tier ids], min_exchanges?, builds: [{id, endurance, pain_threshold, armour: "<class name>"}]}` (the frail and the hardy; its own floor, else the attacker's) | (b) |
| `levels` | `{cap, rows, fight_level_from}`: the cap (data), which rows are early, the gate, late and the Boss, and the tiers whose level a mixed fight takes | (e) CLOCK |
| `maps.<m>` | `{early, late, top, boss, kit, templates, tags}` for maps 1 to 5: levels by row (ruling 24: an enemy's level comes from the map and the row); `scale.json` points to `world.maps` | (e) CLOCK |
| `final_boss` | `{template, map, level, rounds, slots, account_reward: null}` | |
| `endless` | `{from_map, levels: {early, late, top, boss} (formulas of m and cap), past_cap: {from_map, bulk_per_map, pressure_per_map}, kits: {"<map>": {...}}}` | (e) CLOCK |
| `budget` | `{lag_factor, by_difficulty: {"<kind>": {rounds, pressure_kind}}, bulk_per_char_round, pressure_per_char, bulk_band, share, squads}` (`--tables budget` prints the rooms and ruling 38's lone Boss) | |
| `enemy_doors` | `{tags.<tag>: {skills, faith?, devotion?, hands?}, casters.<id>: {<skill>: points}}`: an enemy's door points, read on the core files' ladders | |
| `campaign` | `{tiers: "@pacing.xp.campaign_tiers", fields: {tier, levels, zone_level}, fallback: "the party's level, with a validator warning"}` (ruling 28) | |
| `migration` | `"@pacing.migration"` | (g) |

Filled example:

```json
"tiers_rule": {"hp_x": "@scale.factor.value", "armour_x": "@scale.factor.value", "damage_x": 1.28},
"tiers": {"soldier": {"hp": {"data": "enemies.json:items[soldier].hp"}, "armour": {"data": "enemies.json:items[soldier].armour"},
                      "damage": {"data": "enemies.json:items[soldier].damage"}, "attack_bonus": {"data": "enemies.json:items[soldier].attack_bonus"},
                      "defense": 11, "pressure_off": 0, "lag": 0, "bulk": 1, "pressure": 1}},
"enemy_weapon": {"weapon": "hellraiser_service_rifle"},
"stated_attacker": {"levels": [1, 5, 10, 15, 20], "ordinary_sum_per_level": 0.02, "min_exchanges": 2, "against": ["soldier", "elite", "boss"],
                    "builds": [{"id": "maul", "weapon": "maul"}, {"id": "rifle", "weapon": "hellraiser_service_rifle"}]},
"stated_defender": {"against": ["soldier"], "builds": [{"id": "frail", "endurance": 1, "pain_threshold": 0, "armour": "Light"},
                                                       {"id": "hardy", "endurance": 7, "pain_threshold": 0, "armour": "Medium"}]},
"maps": {"1": {"early": 1, "late": 2, "top": 3, "boss": 3, "kit": "the gate Elite and the Boss plated", "templates": ["firing_line", "swarm"]}}
```

---

## 7. What each check reads (so a drafter knows what its file must carry)

| Check | Reads | Fails when |
| --- | --- | --- |
| refs | every file | a reference does not resolve, or loops |
| (a) DIGITS | scale; each door's `plain`, `cashouts`, ladder `reach`/`bite`, `push`; every `sum` and `to_hit` term (cores, gear_perks); world's lowest `defense` | a level-1 plain hit outside 1 to 99 (standard and Fine, 7/7), a level-20 plain hit outside 1,000 to 9,999 (Relic and Celestial, 10/10), the best full cash-out at 20 in Relic under 10,000, the largest legal turn at 20 over 99,999 |
| (b) HITS | scale, world, pacing (gates, clock, grades) | a same-level foe dropped in under two hits, or a defender surviving under two |
| (c) LADDERS | the three core files, `data/skills.json` | a skill without ten felt points, Reach not from 1 or not climbing, a gate not as ruling 13, the Push not at 8, no cash-out from point 1 |
| (d) SPEND | the core files, pacing (`spend_plans`, `levels`, `gates`) | a level with points and nothing felt to buy, points unspent at 20, a two-door plan at the top Reach of both, a career that is not 38 and 20 |
| (e) HOURS | pacing (`clock`, `levels.lands`, `grades_by_map`, `calendar`, `collection`) | an hour 0 to 49 with no event for a character, level 20 outside hours 38 to 43, grades by map against ruling 25, a system under 80% by hour 50 |
| (e) CLOCK | pacing (`clock.time_model`, `clock.route`, `clock.maps`, `levels`, `xp`), world (`levels`, `maps`, `endless`), `data/survival.json rounds` | a map's typed hours more than `tolerance_h` from the time model's, a squad level against `levels.lands`, a map's worthy fights against the route, `levels.xp_total` against the route's XP summed |
| (f) SOLO | the core files, gear_perks | a `needs_ally` move with no `solo` |
| (g) MIGRATION | every file | more or fewer than one `revision`, or one without `owner`, or a `migration` key that is not `@pacing.migration` |
