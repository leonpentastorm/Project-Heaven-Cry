# Revision 4: the weapon-neutral audit of the base classes (13 Nov 2026)

**Leon's ruling** (`class-roster-rev4-proposal.md` section 8, the last block, item 4): *"Base classes are weapon
neutral, so any skill that mods damage mods damage for all weapons. Check it: I read some skill on the Faith guy that
only applies to guns, rank II too."* As written there: a class move or class rule that changes damage, to-hit or what a
hit does applies to **every** weapon the character may attack with (gun, bow, blade, fist, thrown, and the weapon
attack of a focus), never to one family. A move may still need what its own door needs (a reaction, the door's meter,
a focus in hand).

**How this was made.** The live moves were dumped from `data/classes.json` (`base[].ranks.I/II/III.moves`, each either
an inline move or a `ref` resolved against `move_pool.moves` and the advanced classes) with their text, effects and
tags; each move's handler was read in `packages/engine/src/classes/{i,j,k,rev3}.ts`; the Revision 4 moves were read
from `class-roster-rev4-proposal.md` section 4 and the class sections of `reactions-spec.md`, `shadow-spec.md`,
`figments-spec.md`, `bonds-spec.md` and `chaplain-spec.md`. Grep and reading, 13 Nov 2026; nothing was run.

**Two engine facts the verdicts stand on** (checked):

- Trigger **`hit`** (hook `on_hit`) is emitted in one place, `combat.ts` 1364 `resolveAttack`: **every weapon attack
  and only weapon attacks**, in every mode (`shot`, `aimed`, `burst`, `auto`, `melee`, `thrown`, `paired`; a `mana`
  focus weapon's own attack included). A Sigil spell, an Outburst or a prayer never emits it. So an item op on `hit`
  with no `mode` / `melee` predicate is weapon-neutral by construction; a `mode` list that leaves a mode out is a lock.
- **Pressure is ranged** (`physical/rules.ts` 35: a melee hit only sheds the attacker's Pressure), **Heat is the
  gun's** (bows build none: `no_heat`), **Momentum is melee's** (`techniques.json rules.momentum`). A move that feeds
  or spends one of these meters needs what the meter's door needs: that is **DOOR'S OWN**, not a lock.

**Verdicts.** **NEUTRAL**: nothing in it reads the weapon family. **DOOR'S OWN**: it needs what its own door needs (a
door's meter or technique, a focus in hand); say which. **LOCKED**: it breaks the ruling (in its text, its data or its
code).

## 1. Counts

| | Moves | NEUTRAL | DOOR'S OWN | LOCKED |
| --- | --- | --- | --- | --- |
| **Live** (Revision 3, `data/classes.json`, 9 classes × 6) | 54 | 41 | 6 | **7** |
| **Revision 4** (the specs, 9 × 6) before this audit | 54 | 39 | 6 | **9** |
| Revision 4 after the fixes of section 4 (applied to four specs; the Bonds spec: section 6) | 54 | 48 | 6 | 0 |

Class rules outside the six moves ("better", the doors' class riders) are in section 3: all NEUTRAL as written, two
need care when they are put into data (the Mender's new damage rules, the Breaker's Shaken Momentum).

## 2. The one Leon saw: the Chaplain (was the Guardian)

**Blessed Shells (rank II) is weapon-neutral in the engine today, and reads as gun-only everywhere a player looks.**
`classes/k.ts` 188-234 (`lumeri_templar.blessed_shells`): the `blessing_in` hook loads a landed Blessing into
`stateOf(h).loaded`, and `on_hit` (any weapon hit, no family check) releases it at the target or on the allies next to
it; the story action loads it into the next fight. A blade, a bow, a thrown knife or a focus's attack all release it.
But its **name** ("Shells"), its **tag** (`fantasy_tags: ["faith", "prayer", "guns"]`, `data/classes.json` 4304), its
story action (`label: 'Bless a shell'`, "pray over a shell", k.ts 196-205) and Revision 3's own fantasy (the Lumeri
Templar's shotgun) all say guns. A player reading the card has every reason to think a sword user is shut out.
**Verdict: NEUTRAL in rule; its words are LOCKED.** Fix: section 4.

**Judgement / Verdict (rank III) is LOCKED, in all three places**: text "Needs a melee weapon or a scattergun"
(`data/classes.json` 4343), code `available: !(isMelee(W(h.u)) || shotgun(h.u))` with `shotgun = category 'shotgun'
or /scattergun|censer/` (k.ts 266, 272), and the action text (k.ts 271); the Chaplain spec copied it (3.1, "one melee
or scattergun attack"; section 4 "Verdict as built"). A rifle, a pistol, a bow, a thrown weapon or a focus can't use it.

**Under the Eye (rank II)** is NEUTRAL: `attack_preview` +2 for allies within 3 of a Witnessed Templar, any attack
(k.ts 239-256).

**Smite (Revision 4 rank I) is LOCKED by omission** in the spec's data: `if: {mode: ["shot", "aimed", "burst",
"auto", "melee"]}` (`chaplain-spec.md` section 10) leaves out `thrown` and `paired` (a thrown weapon, two weapons at
once). Its rule text ("your weapon attack hits") is neutral. Fix: drop the `mode` predicate (trigger `hit` is already
"a weapon attack").

**Ward, Sanctuary** (Revision 4) and the Revision 3 Will Shield, Command, Sanctuary: NEUTRAL (no weapon).

**What Leon most likely read:** the class card of Blessed Shells (rank II, "Shells", tag `guns`) and Judgement (rank
III, "a melee weapon or a scattergun"). The **Faith perk Holy Ordnance** (`data/perks.json`, Faith alpha, "bless the
magazine in your own gun or in the gun of an ally", its Tier I and its Tier II) is gun-only as well; it is a perk, so
this ruling does not reach it (section 7).

## 3. The table

Columns: rank; L = live (Revision 3), R4 = Revision 4; "restricted to" is the weapon family the move reads; "where"
names the place (text / data / code) with file and line.

### 3.1 Bulwark (`defender`)

| Move | Rank | L / R4 | Restricted to | Where | Verdict |
| --- | --- | --- | --- | --- | --- |
| Brace | I | L, R4 | none (Interpose answers an *enemy's* weapon attack on an ally: the attacker's weapon, not yours) | i.ts 359-410 `src?.type !== 'weapon'` | NEUTRAL |
| Draw Fire | I | L, R4 | none | i.ts 415-435 | NEUTRAL |
| Unbroken | II | L, R4 | none | data `floor` op | NEUTRAL |
| Shrug It Off | II | L, R4 | none | rev3.ts 82 | NEUTRAL |
| Reactive Plate | III | L, R4 | none | i.ts 440-462 | NEUTRAL |
| Anchor | III | L, R4 | its opportunity attack is a melee strike | rev3.ts 125-128 `previewAttack(..., 'melee')`, `opportunityStrike` (combat.ts 1735: always `melee`) | DOOR'S OWN: an opportunity attack is a melee strike for everyone (base rule); with a gun in hand it is the gun's melee blow, as anyone's |
| *Better:* a fight starts with 1 Guard | | R4 | none | `rev4-moves-and-rename.md` 1 | NEUTRAL |

### 3.2 Breaker (`fighter`)

| Move | Rank | L / R4 | Restricted to | Where | Verdict |
| --- | --- | --- | --- | --- | --- |
| Lunge | I | L, R4 | melee strike; Momentum | text "the AP of your melee attack"; i.ts 259 `meleeAp` (fists if no melee weapon), 285 `resolveAttack(..., 'melee')` | DOOR'S OWN: Momentum is melee's meter by rule; with no melee weapon it strikes with fists. Leon: "a Channeler can throw on a melee weapon and use Momentum": the door asks for a melee weapon, and that is the door's need |
| Shove | I | L, R4 | none | rev3.ts 144-180 | NEUTRAL |
| Riposte | II | L, R4 | answers a melee miss with a melee strike; Momentum | i.ts 310-317 `ctx.melee`, `'melee'`; R4 folds it into the technique Answer | DOOR'S OWN (an Answer is a melee technique) |
| Lingering Dread | II | L, R4 | none (any kill) | k.ts 167-181 `on_kill` | NEUTRAL |
| Finisher | III | L, R4 | melee strike; spends Momentum | i.ts 327-343 | DOOR'S OWN |
| Unstoppable | III | L, R4 | none | rev3.ts 188 | NEUTRAL |
| *Better:* first hit each turn on a Shaken or Frightened enemy, +1 Momentum | | R4 | none as written (`when: hit`, no `mode`) | `rev4-moves-and-rename.md` 1 | NEUTRAL; **keep it so**: a gun Breaker banks Momentum it spends on Lunge or Finisher (fists or the melee weapon). Do not add `melee: true` when building it |

**A Breaker with a gun:** nothing to add. Its meter, Momentum, is melee's by rule, and its spenders (Lunge, Riposte,
Finisher) are melee techniques; Shove, Lingering Dread, Unstoppable and the Shaken gain work with any weapon. The class
asks a melee weapon for half its moves the way the Sigilist asks an Evoker: the door's gear, not a lock.

### 3.3 Skirmisher (`marksman`)

| Move | Rank | L / R4 | Restricted to | Where | Verdict |
| --- | --- | --- | --- | --- | --- |
| Fire Discipline | I | L, R4 | guns (no Heat on Aimed; Burst 2 AP) and bows (+1 on Aimed); a blade or thrown weapon gets nothing | text `classes.json` 1337; data `context: "aimed_shot_with_bow"` 1352; i.ts 156 `heat_limit && !isMelee`, 160 `mode === 'burst'`, 161 `/bow/.test(category)` | **LOCKED** (the Heat half is DOOR'S OWN: Heat exists only on guns) |
| Speed Loader | I | L, R4 | magazine weapons (a reload); "your off-hand gun" | text 383; data `if: {action: ["reload"], hand: ["main"]}` | **LOCKED** in spirit: it is a cost, not a hit, but it is the class's "one thing cheaper" and a bow (autoload), a blade or a thrown weapon never reloads |
| Duck and Roll | II | L, R4 | answers an enemy's *ranged* attack at you | rev3.ts 252 (the attacker's weapon) | NEUTRAL (it reads the incoming attack, not your weapon) |
| Special Ammo | II | L, R4 | guns (a magazine) and bows (a quiver); never a blade or thrown weapon | text 1374 ("magazine", "quiver", "rounds"); i.ts 182 `ammoOk`: `isMelee` → "Your weapon takes no rounds", `/flame\|launcher\|thrown/` refused | **LOCKED** |
| Killzone | III | L, R4 | ranged weapons | text 1402 ("Overwatch shots"); i.ts 232 `isMelee(w)` → "Killzone needs a ranged weapon" | **LOCKED** (a held melee strike exists: `u.overwatch = 'melee'`, combat.ts 1761) |
| Called Shot | III | L (moves to the Operative in R4) | guns and bows | text 3079 "Needs a gun or a bow"; j.ts 41 `isRanged` (not melee, not thrown), 131; 135, 140 `'shot'` | **LOCKED** (see 3.4) |
| Run and Gun | III | R4 | its +1 Pressure lands on "your next **shot**" | `reactions-spec.md` 5 and 10 text; its data (`when: hit`, no `mode`) is neutral | **LOCKED in its text** |
| *Better:* Reflex (two reactions) | | R4 | none | stat `reactions` +1 | NEUTRAL |

### 3.4 Operative (`infiltrator`)

| Move | Rank | L / R4 | Restricted to | Where | Verdict |
| --- | --- | --- | --- | --- | --- |
| Mark | I | L, R4 | none | i.ts 586-601 | NEUTRAL |
| Vanish | I | L, R4 | none | rev3.ts 277 | NEUTRAL |
| Toxin | II | L, R4 | blades, bows, darts, thrown weapons; **never a gun** | text 1787 "(never a gun)"; i.ts 608 `coatable`, 614 "Toxin goes on a blade, a dart or an arrow, not a gun", 627; `shadow-spec.md` 5 "coat a blade, bow or thrown weapon" | **LOCKED** |
| Field Fix | II | L (to the Rigger in R4) | none (it clears an ally's jam: support, not a hit) | rev3.ts 297 | NEUTRAL |
| Sabotage | III (R4: II) | L, R4 | none | rev3.ts 333 | NEUTRAL |
| Execution | III | L, R4 | none (any hit on a Marked enemy) | i.ts 640-652 `on_hit` | NEUTRAL |
| Called Shot | III | R4 | gun or bow | `shadow-spec.md` 5; `rev4-moves-and-rename.md` 2 (the rider only); code as 3.3 | **LOCKED** |
| *Better:* start at 1 Shadow; Analyze 1 AP, `read`, +1 Shadow unseen | | R4 | none | shadow-spec 5 | NEUTRAL. The door's Break is a toggle on "any weapon attack or weapon technique" (2.5): NEUTRAL |

### 3.5 Sigilist (`mage`)

| Move | Rank | L / R4 | Restricted to | Where | Verdict |
| --- | --- | --- | --- | --- | --- |
| Barrage, Core Change, Overcharge, Bleed the Flux, Payload | I-III | L, R4 | none (the Sigil door's words, cores, Flux; no weapon attack touched) | data; rev3.ts 405 | NEUTRAL ×5 |
| Stored Spell | III | L, R4 | "with an Evoker in hand" | text | DOOR'S OWN (the focus) |

Neutral by nature: its damage is the door's (a spell), not a weapon's. No Sigilist move touches a weapon attack.

### 3.6 Rigger (`trickster`)

Live (Trickster): Read, Blind and Slow, Silver Tongue, Rewrite, Sleight: NEUTRAL ×5; **False Image** "Needs an Evoker
in hand": DOOR'S OWN. Revision 4:

| Move | Rank | Restricted to | Where | Verdict |
| --- | --- | --- | --- | --- |
| Double | I | the Visualizer in hand | figments-spec 5 | DOOR'S OWN (the focus) |
| Field Fix, Salvage, Overclock, Sleight | I-III | none | figments-spec 5 | NEUTRAL ×4 |
| Scrap Turret (Jury-Rig) | III | "that weapon's plain attack", found in a pile; a wreck or barricade gives the service pistol's; "the nearest enemy it sees in range" | figments-spec 5 | NEUTRAL with one clarification: a melee weapon's turret strikes what is in its reach (a blade on a swinging arm); a consumable (a grenade) is spent by one use and is never the turret's weapon (its pile falls back to the service pistol). Applied there |

Figments' own attacks (`figment_claws`, `figment_edge`) are the Figments' weapons, not the character's: outside the
ruling.

### 3.7 Mender (`bard`)

Live (Bard): Triage, Inspire, Stim Throw, Mend, Field Surgery, Rally: NEUTRAL ×6. Revision 4 (`bonds-spec.md` 5):
Triage, Inspire, Brimming, Take the Weight, Rally, Field Surgery: NEUTRAL ×6. Inspire's given feelings ride "the
next attack" or "the next hit" (5.1): with trigger `attack` / `hit` and no `mode` they reach every weapon. **The new
rulings** (section 8 of the roster, items 1 to 3: enemy Bonds, damage that rises with Bonds held, the class skill that
spends collected healing as a damage bonus) are not in the spec yet: section 6 lists what it needs.

### 3.8 Channeler (`channeler`)

Shape, Iron Heart, Storm Front, Occult Library, Heart Surge, Eye of the Storm: NEUTRAL ×6, live and Revision 4. Its
damage is the Outburst's (the door), not a weapon's; no move touches a weapon attack.

### 3.9 Chaplain (`guardian`)

| Move | Rank | L / R4 | Restricted to | Where | Verdict |
| --- | --- | --- | --- | --- | --- |
| Will Shield (L) / Ward (R4) | I | L, R4 | none | i.ts; chaplain-spec 10 | NEUTRAL |
| Command (L) / Smite (R4) | I | L, R4 | Command none; **Smite: `mode` list leaves out `thrown`, `paired`** | chaplain-spec 10 data | Command NEUTRAL; **Smite LOCKED** (by omission) |
| Under the Eye | II | L, R4 | none | k.ts 239-256 | NEUTRAL |
| Blessed Shells | II | L, R4 | none in code; name, tag `guns` and story action say guns | k.ts 188-234; classes.json 4289, 4304 | NEUTRAL in rule, words LOCKED (counted NEUTRAL) |
| Sanctuary | III | L, R4 | none | i.ts; chaplain-spec | NEUTRAL |
| Judgement / Verdict | III | L, R4 | melee weapon or scattergun | classes.json 4343; k.ts 266, 271-272, 275, 282; chaplain-spec 3.1, 4 | **LOCKED** |
| *Better:* the presence; interventions land "where the weapon struck" (Judged on a weapon hit) | | R4 | none (`when: hit`, any weapon) | chaplain-spec rules 9-12 | NEUTRAL |

## 4. The rulings proposed for the hard cases, and the fixes

Each fix is the smallest rewording and data change that makes the move neutral without changing its strength for the
family it was written for; a widening that makes it stronger carries its balance note. Nothing here needs a new
handler or a new primitive: predicates are removed or widened.

### 4.1 Skirmisher (Agility's door: ranged techniques **and** light blades and thrown weapons)

1. **Fire Discipline.** Ruling: the move is "handling the weapon fast and clean", so its cheap attack is any attack,
   not only a Burst. New text: *"Your Aimed attacks add no Heat and have +1 to hit. Once a turn, your first attack
   costs 1 AP less (at least 1)."* For a gun: the same 1 AP a turn (a Burst 2 instead of 3, or a single shot 1
   instead of 2) and +1 on Aimed (new for guns); for a bow: +1 on Aimed as today, plus the 1 AP; for a light blade,
   a fist or a thrown weapon: the 1 AP (they have no Aimed attack and no Heat: the Heat half is the gun's door).
   Data: `heat_mod` (kept, the gun's door), `cost_mod` `when: attack`, `value: -1`, `min: 1`, `limit: {per: per_turn,
   n: 1}` (replaces `action_cost burst`), `roll_mod` `when: attack`, `value: 1`, `if: {mode: ["aimed"]}` (replaces
   `context: "aimed_shot_with_bow"`; `aimed` is a technique, not a family: allow-listed, section 5). Code: i.ts 160-161
   (`mode === 'burst'`, `/bow/`) go. **Balance:** a gun gains +1 to hit on Aimed shots only (about a third of its
   shots, about +1.5% on the line); the Skirmisher estimate is 135 against 145 (−7%): inside. A light blade
   Skirmisher gains a strike in two turns (+15% on its turns): it sits on the melee line (165), not the gun's; to be
   measured in step 5 with a light-blade sheet.
2. **Speed Loader.** Ruling: "the first reload, **draw, swap or pick-up** each turn costs 1 AP less (at least 1)": the
   gun reloads, the bow and the blade draw or swap from the pack, the thrower picks its knife back up. Data: the
   `cost_mod` keeps `when: cost` and widens `if: {action: ["reload", "pickup"], hand: ["main"]}`, and a second
   `cost_mod` on trigger `swap` (it already takes `swap`: `effects/triggers.ts` 174) shares the `per_turn` limit by
   `key`. Text: "your off-hand gun" → "your off hand". **Balance:** guns unchanged; other families gain at most 1 AP
   a turn they spent on gear (rare): none to price.
3. **Special Ammo.** Ruling: the three payloads go on **any weapon**: "a magazine for a gun, a quiver of 12 for a bow,
   or a load for a blade, a fist or a thrown blade (an edge, a sleeve of throwing blades) that lasts 12 attacks or the
   fight". Loading is your reload's AP; a weapon that never reloads takes 1 AP (Toxin's coat). A grenade or other
   consumable is not loaded: it is its own payload. Data: `numbers: {load_attacks: 12}`; the effects keep the shared
   ammo types (`rules.json ammo_types`). Code: i.ts 182 `ammoOk` keeps only "no consumable"; the payload's damage term
   reads `u.ammoType` for every weapon attack while loaded, counted down per attack for a weapon with no magazine.
   **Balance:** a blade's hollow-point (×1.3, armour doubled) and incendiary (Burning) are as worth it as a gun's;
   one load of each per rest, as now. Measure a light-blade Skirmisher all in with the three loads against melee
   (165) in step 5.
4. **Killzone.** Ruling: two held attacks with **any** weapon: with a gun or bow, two shots at the first two enemies
   that move into your line; with a melee or thrown weapon, two strikes (or throws) at the first two enemies that
   enter your reach (or throwing range). +2 each, twice the attack's AP, both reactions (Leon). Text: "Hold two
   Overwatch shots" → "Hold two attacks". Code: i.ts 232 `isMelee(w)` refusal goes; the held mode is `melee` for a
   melee weapon (`setOverwatch` already takes it). **Balance:** a melee Killzone fires only on enemies that come
   adjacent: fewer triggers than a gun's line, so weaker; no number moves.
5. **Run and Gun.** Ruling: "your next **hit** this turn adds +1 Pressure", any weapon. A light blade or a thrown
   blade's hit puts Pressure on its target only through this move (the door's melee hit adds none): the class doing
   what the door can't, which section 2 of the roster allows. Data already neutral (`when: hit`, no `mode`); the
   text changes. **Balance:** unchanged estimate (+3%).
6. **Duck and Roll** stays as it is: it answers an enemy's ranged attack, whatever you hold.

### 4.2 Breaker: door's own, nothing to fix

Lunge, Riposte and Finisher spend Momentum, which a melee hit builds (the door). A Breaker with a gun still has Shove,
Lingering Dread, Unstoppable and the Shaken gain; Lunge and Finisher swing what it holds in melee (fists or the gun's
blow: `meleeAp` falls back to fists). This is the door asking for its gear, as Leon put it for the Channeler; no
Breaker move needs a gun version.

### 4.3 Bulwark: door's own, nothing to fix

Brace, Guard, Interpose and the shield work with any weapon or none. Anchor's opportunity attack is a melee strike
because every opportunity attack is (base rule), not because of the class. A shield is gear any Bulwark may carry;
nothing in the six moves needs one.

### 4.4 Operative

1. **Called Shot.** Ruling: any weapon attack: *"Name the head, an arm or a leg and attack at −2 to hit (no −2 while
   the target can't see you): a shot, a throw or a strike."* 3 AP flat, as today (a long rifle's shot and a heavy
   weapon's strike already cost about that; the −2 is the price). Code: j.ts 131 `isRanged` refusal goes; 135 and
   140 resolve the weapon's plain mode (`melee` with a melee weapon in reach, `thrown` for a thrown one, else
   `shot`). The story action's "where you put the round" → "where you put it". **Balance:** a light melee strike
   costs 2 AP, so a called strike pays 1 AP for the injury (as a pistol does); the injury table and the target's
   resistance are unchanged; nothing rises.
2. **Toxin.** Ruling: any weapon: *"Coat your weapon: a blade's edge, your arrows, a thrown weapon, or the next rounds
   of your gun."* The coat goes on the next hit, as today. Data: the coat (a condition row with a `hit` op, P4 of
   `rev4-primitives.md`) carries no `melee` / `mode` predicate. Code: i.ts 608 `coatable` and its refusal go (the
   handler itself is deleted by P4). **Balance:** the coat is one dose a hit whatever delivers it; a gun Operative now
   uses its doses at range (more often, more safely). The doses' supply is the price (+5% on the line, shadow-spec
   11.6); measure the Operative's window with a rifle and Toxin in step 6.
3. **Execution, Mark, Sabotage, Vanish:** neutral as they are.

### 4.5 Sigilist and Channeler: neutral by nature

Their damage is their door's (a Line, an Outburst), and no move of theirs reads or changes a weapon attack. Their
gates are the door's focus (Stored Spell: an Evoker). A Channeler or Sigilist who also swings a blade uses the blade's
door like anyone.

### 4.6 Rigger

Figments attack with their own weapons (outside the ruling). **Scrap Turret:** "that weapon's plain attack" already
reads any weapon; the spec now says that a melee weapon's turret strikes what is in its reach and that a consumable is
never the turret's weapon (falls back to the service pistol). Field Fix's "clear a jam" is support (guns jam; a jam
is the gun's own state): neutral.

### 4.7 Chaplain

1. **Smite:** drop `mode` from its `if` (the trigger `hit` is every weapon attack and only those): thrown and paired
   attacks carry it too. No number moves.
2. **Blessed Shells:** the rule stays (any weapon); the words change: text "load the Hymn into your weapon (a round,
   an arrow, an edge)"; the tag `guns` → `weapon`; the story action "Bless your weapon" and "pray over your weapon";
   the display name **Blessed Arms** *(Suggested; key `lumeri_templar.blessed_shells` kept)*, if Leon wants the name
   to stop saying guns. No number moves.
3. **Verdict (Judgement):** any weapon: *"Make one attack with your weapon (a strike, a shot or a throw)."* Data text
   only; code k.ts 266 `shotgun` and the gate in 272 go, and 275, 282 resolve the weapon's plain mode (`melee`,
   `shot` or `thrown`), never a Burst, an Aimed shot or a technique. **Balance:** once a fight, ×(1 + Blessing power)
   on one plain attack; a scattergun's close shot and a heavy strike were the biggest plain attacks it allowed, and a
   long rifle's bolt is about as big, so the peak hardly moves; a pistol or bow Chaplain gains a use it never had.
   The Elite and Boss guard holds every roll. Measure `chaplain_turn` with a long rifle and with a pistol in step 4.

### 4.8 Mender: neutral, with what the Bonds spec must keep (section 6)

## 5. The guard: a data test

`packages/engine/test/class-weapon-neutral.test.ts` (new), run by `npm run check` with the unit suites. For every move
reachable from `data/classes.json base[].ranks` (resolving `ref` the way `classes.ts` does) and every class-level
`effects` block of a base class:

1. **Data:** walk every effect (and its `and`, nested `effects`, `toggles[].effects`, and the condition rows the move
   grants through op `condition`); fail when an `if` carries `melee` (either value), `damage` with `melee` or
   `ranged`, or `mode` whose list is not exactly an allow-listed technique for that move; or when any `context`,
   `requires`, `needs` or `target` string names a family.
2. **Text:** fill the `{=placeholders}` (`datatext.ts` rules) and fail on
   `/\b(guns?|rifles?|pistols?|revolvers?|shotguns?|scatterguns?|bows?|arrows?|quivers?|magazines?|shells?|rounds?|blades?|melee|ranged|thrown|darts?)\b/i`,
   unless the move and the word are allow-listed with a reason.
3. **Code** (a lint beside `lint-foundations`, ratchet baseline): in `packages/engine/src/classes/*.ts`, a handler
   registered for a base-class move may not call `isMelee(`, `isRanged(`, `isHandgun(`, `shotgun(`, test
   `category` or `/bow|thrown/`, outside its allow-listed lines.

**The allow-list** (door's own and incoming attacks; each entry `{id, words or predicate, reason}`):

| Move | Allowed | Reason |
| --- | --- | --- |
| `fighter.lunge`, `fighter.riposte`, `fighter.finisher` | "melee"; `reachOf`, `meleeAp`, `ctx.melee` | Momentum is melee's door |
| `defender.anchor` | `'melee'` in the opportunity strike | every opportunity attack is a melee strike |
| `defender.brace` | "weapon attack" (an enemy's) | the incoming attack |
| `duck_and_roll` | "ranged" (an enemy's); `isMelee(attacker's weapon)` | the incoming attack |
| `marksman.fire_discipline` | `mode: ["aimed"]`, "Heat" | Aimed is a technique; Heat is the gun's door |
| `marksman.special_ammo` | "magazine", "quiver", "arrows", "rounds", "blade", "thrown" (only when the text names every family) | the text lists how each family loads |
| `assassin.toxin`, `gunslinger.called_shot`, `lumeri_templar.blessed_shells`, `lumeri_templar.judgement` | family words only in a list that names every family ("a shot, a throw or a strike") | the neutral texts of section 4 |
| `field_fix` | "jammed weapon" | support, not a hit |

A new entry needs the lead's review in the commit that adds it.

## 6. What the Bonds spec needs (another agent is rewriting `bonds-spec.md`; for the lead to pass on)

1. **The Mender's class skill** (collected healing and shielding spent as a damage bonus "on its next damaging
   action"): the spend must ride **any** damaging action of the Mender (a weapon attack of any family, a Sigil
   Evoke, an Outburst Release, a damaging prayer). Data: op `damage_mult` (or `damage_mod`) on trigger `dealing`
   with **no** `mode`, `melee` or `damage` predicate; spent on `acted` (P2). Do not key it on `hit` alone (that is
   weapon attacks only) unless Leon rules the bonus is weapon-only.
2. **"You hit a Bonded enemy more easily":** `roll_mod` on trigger `attack` with `if: {target_tied: "bond"}` (P8) and
   nothing else: every weapon attack. If the Sigil or Outburst roll is meant too, say so in the rule.
3. **"The more you are tied, the harder you hit":** `damage_mult` on `dealing` with a number block `per: [{of:
   "res:..." or a ties count}]`, no family predicate; write in the text that it is every attack.
4. **"It takes damage for you" and "your healing hurts it":** not hits; neutral as long as `redirect` reads any
   damage you take (no `damage: ranged/melee`).
5. **Inspire's given feelings** (5.1): keep "next attack" / "next hit" on triggers `attack` / `hit` with no `mode`
   (Rage, Joy, Shame, Despair, Jealousy, Abandon multiply any weapon attack; Grief, Cruelty, Dread, Awe, Contempt,
   Guilt, Mercy ride any weapon hit). The condition rows of section 10 (`given_cruelty`) already do: keep it.
6. Any new class rule's text: say "attack" or "hit", never "shot" or "strike".

## 7. Not covered by this ruling: perks, traits and Calls

Perks, traits and Calls are **not** base-class moves: a perk may be weapon-specific (Leon's ruling covers class moves
and class rules only). The three most gun-locked perks, in case Leon wants the rule widened:

1. **Holy Ordnance** (Faith alpha, Tier I and II): "bless the magazine in your own gun or in the gun of an ally
   next to you"; +20% / +40% against upper-realm and cursed beings. A Faith perk, gun-only, both tiers: very likely
   what Leon read ("the Faith guy ... rank II too").
2. **Dance of Iron** (Dexterity, Athletics): when an attack misses you, a shot back, "you need a loaded ranged
   weapon".
3. **Running Reload** (Dexterity): reload as part of a move (Tier II: clear a jam too): magazine weapons only.

(Both Hands, Dexterity, is a melee-into-gun bridge by design: a melee hit takes the next shot's Recoil away.)
