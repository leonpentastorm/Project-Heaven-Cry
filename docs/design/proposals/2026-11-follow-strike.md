# Follow strikes: the off hand that swings after the main one (proposal)

16 Nov 2026, second draft (the first was reviewed by a rules lawyer, an engine purist and a balance reader; what
changed and why is in the "Review" section at the end). Status: **design, nothing built**. Every number is PROVISIONAL
and a data field. If accepted, the spec changes first ("Hands, off hands and dual wielding" gains 5e and amends 5a, 5b
and Durability 4.1, as rules 1.57), then the data, then the code. Items F1 to F12 are this draft's names; the lead
assigns the spec numbers. Every item is `adjudication: engine`.

Sister drafts: `2026-11-guard-2.0.md` (its items 16 and 17 and its P9 and P11 are where this starts; **this draft
withdraws Guard 2.0's item 17, "the Shield Follows" on P9**, and settles item 16 / P11 jointly with the "a shield in
either hand" lane: section 5, N2).

Leon, 16 Nov 2026: a sword-and-shield moveset where the shield's hits are woven into the weapon's attacks; the
dual-wield code should carry it; general ("a legendary knife that works just like this when you put it in the off
hand"); and: "we have a separate tab for dualweild too the "both" tab, think of how the interaction works".

## 1. The idea in five lines

1. A row may carry the property word `follows` (a shield, or a melee weapon). In the off hand it is a **follows item**.
2. Each melee technique you use with a truly one-handed melee weapon in the main hand, as your own action, is followed by
   **one** strike from it: its own roll at −2, its own damage line, no AP, no off-hand penalty.
3. The follow is a **rider**: it hits, wears and does what its own row says, but it is not "a melee hit" for Momentum,
   Pressure, Smite, perks, Finishers or the target's Answers.
4. A follows item is not a second weapon: it never opens the Both block, never pairs, has no attack of its own in the off
   hand, and does not ask 5a's +2.
5. Shields become weapon rows with `follows` (the first follows items); a follows knife (section 8) is the second.

## 2. The rule, as spec text ready to paste

> ## Rules 1.57: follow strikes (hands 5e)
>
> Leon, 16 Nov 2026. Draft: docs/design/proposals/2026-11-follow-strike.md. Every number is PROVISIONAL and a data field.
>
> **5a, amended.** A shield is a weapon row with the properties `shield` and `follows`. A follows item in the off hand
> is not a second weapon (no +2). A weapon in the off hand beside a main-hand shield is a second weapon and asks +2.
>
> **5b, amended.** "Two weapons of one kind" is two weapons of one system whose **off-hand** one is not a follows item.
> A shield's system is melee.
>
> **5e. Follow strikes** (items F1 to F12).
> 1. **What follows** (F1). A row whose `phys.props` holds `follows` is a follows item. Only a shield or a melee-system
>    row (`phys.system: melee`) may carry it; the validator refuses it anywhere else. A follow is always a melee blow,
>    never a shot or a throw.
> 2. **When it follows** (F2). While a follows item is in your **off** hand and your main hand holds a one-handed melee
>    weapon (its row's `hands` is 1H: a heavy weapon held in one hand by Heavyworlder does not count; bare fists and
>    gloves do), each melee technique you use with the main hand as your own action is followed by **one** follow strike,
>    after the technique has resolved, if at least one of its rolls was made. One technique, one follow, whatever the
>    number of rolls (Flurry, a Finisher, a Charge).
> 3. **Never** (F3). No follow after: a gun's technique or shot, a Burst, a throw, a blow struck with a gun hand's fists;
>    a reaction or an Answer of any kind, or any action made inside an off-turn window; a technique made with the off
>    hand (Shield Bash, every shield technique); a both-hands technique or the paired attack; a class move or perk action
>    that strikes on its own (Launch, Wrecker, the Three-Cut Script; question 6); the old plain `combat/attack` in
>    melee; another follow.
> 4. **At whom** (F4). At the unit the technique's **first** roll really struck (after a redirect: Confused, a captive
>    held as a shield, Duck and Roll), if it is a foe, still up and within the follows item's reach. Else there is no
>    follow and nothing is said. A Finisher's extra targets and a sweep's later targets never draw it.
> 5. **The roll** (F5). Its own d20 with the follows item's own skill (`hits_with`; a shield's is Durability) plus
>    `rules.follow.extra` (−2), with every to-hit term a melee blow has (cover, the target's Defense, Durability's
>    "holding Guard" roll). No off-hand penalty. A unit with no character sheet (an enemy, a companion) rolls with its
>    stat block's attack bonus, as any off-hand strike of it does today. Damage: the item's line × the follow
>    technique's `numbers.mult` (1.0) × any of the item's own sizing lines, through its profile and the target's armour.
> 6. **A rider** (F6). A follow that lands fires its own item's `when: hit` lines (`with_this`). It gives no Momentum,
>    sheds or adds no Pressure, spends no set-up mark, carries no Smite or Judged, and is not "a melee hit" for any perk,
>    class move, door or deed. Lines that **size** a blow (`attack`, `to_hit`, `attack_roll`, `dealing`) apply to it as to
>    any blow; lines that **react** to a blow (`hit`, `miss`, a kill, a downing) ignore it unless they are the follows
>    item's own. A follow never spends another item's limited use: such a line applies only while a use is left. The
>    follows item's own lines spend their limits as normal. The target answers a follow with its armour, Guard soak and
>    Parry, but a **missed follow draws no Answer** (no Riposte, Keep Back or Retort).
> 7. **Wear** (F7). The follows item wears as any weapon does when it strikes (1, and 5 more on a fumble). At 0
>    durability it makes no follow; Worn, it takes the melee −10%. The main weapon's wear is unchanged.
> 8. **Not a second weapon** (F8). In the off hand a follows item opens no Both block, cannot be the off hand of a paired
>    attack or a both-hands technique, and has **no off-hand attack of its own**: its off-hand block holds only what
>    another property gives (a shield's techniques). It asks its own requirement in the off hand (5c), never 5a's +2.
> 9. **A shield's strike** (F9). Each shield row has its own line: `damage`, `hits_with: durability`,
>    `scales_with: [strength]`, `range_tiles: 1`, `ap_cost.attack: 2`, `mastery_family: unarmed` (rule 8). Buckler 6,
>    riot shield 8. Shield Bash strikes with it at `numbers.mult` 2.5, for 1 AP.
> 10. **A shield in the main hand** (F10). It is a melee weapon with its line. Shield in each hand: the main one attacks,
>     the off one follows. Shield in the main hand, ordinary one-handed melee weapon in the off hand: ordinary dual
>     wielding (5b, both melee; the off weapon asks 5a's +2), no follow. What else a main-hand shield keeps (Shield
>     Bash, Parry's +2, the shield's Guard bonus, whether two shields' Defense adds) is the "shield in either hand"
>     lane's to rule; until then shield techniques stay off-hand only.
> 11. **A shield's follow gives Guard** (F11). A shield's follow that lands gives 1 Guard, under the pool's cap, once a
>     turn per unit across every shield it holds (the modifier row `mod_follow_guard`, named in each shield's
>     `variant_mods`). Shield Bash and a main-hand shield's own blows never give it.
> 12. **Enemies and companions** (F12). A unit follows only if its off hand holds a follows item (an enemy: only if its
>     data row puts one there; none does today). The enemy turn and the AI are unchanged.

**Where a lead ruling cannot hold as written** (the nearest rule that can is in the text above):

| Ruling | What does not hold | The nearest rule |
|---|---|---|
| R1 "its own damage line, no off-hand penalty" | A shield follow at its full chance makes a light blade + riot shield 117% to 123% of the greatsword (section 7), over the 115% band. | No off-hand penalty, but the follow technique's `extra` −2 (F5) and smaller lines (6 / 8). |
| R1 "each main-hand melee attack action" | The engine has three melee attack paths: techniques (every main-block row, Cut included), the old `combat/attack` melee, and class/perk actions that call `strike()` themselves. Only the first has one tail where the follow can sit without a mark. | Techniques only (F2, F3); class and perk strikes are question 6. |
| R2 "sword + shield shows the main block only" | The shield's own off block (Shield Bash, Raise Shield, Shield Wall: `techView.ts:178`) must stay. | No Both block; the off block keeps the shield's techniques and nothing else (F8). |
| R4 "a follows item in the main hand is just a weapon" | A shield is an `items.json` row with no weapon line; `WEAPON[u.weapon]` misses in `pairedAttack`, `attackApCost`, `weaponSystem` (`combat.ts:2283`). | Shields become weapon rows (N2, section 5). |
| R5 "+1 Guard" | Per landed follow it is 2 to 3 plates a turn, which funds Slam (2 Guard) every turn. | Once a turn per unit, a shared limit (F11). |
| R5 "not a melee hit for perks" | Sizing lines must still see it, or R6 (Durability's `roll_with`) fails. | F6's split: sizing lines see it, reacting lines do not. |
| R6 "the attacker's usual skill for that item" | A shield has no skill today: it strikes as `fists` (Raw Power), `physical/core.ts:95`. | F9: `hits_with: durability`. |
| R7 "wear when it strikes" | The off hand never wears today: every swap sets `maxDur = 0` (`core.ts:376`, `combat.ts:2296`, `:2531`). | F-b, the off hand's durability on the unit, in `withOffHand` only. |
| R9 "as the paired attack's preview does today" | The paired attack has no preview (`paired` is not in `ATTACK_MODES`, `techView.ts:41`). | The follow's line is a `previewTechnique` attack entry (N3); the paired attack gets one in the same slice. |

R3 and R8 hold as written.

## 3. The Both block and every hand combination

Blocks are the Attack tab's areas (`apps/web/src/game/attackAreas.ts:8`): main, off, both, other.

| Main hand | Off hand | Blocks | A main-hand melee technique | Preview |
|---|---|---|---|---|
| 1H melee (gladius) | shield | main, off (shield techniques), other. **No Both.** | the technique, then the shield's follow | "Cut · 72% · 47" and "then Buckler · 47% · 4" |
| shield | shield | main (the shield's melee techniques), off (shield techniques), other. No Both. | the main shield's blow, then the off shield's follow | two lines |
| shield | focus | main, off (the focus's rows), other | no follow (a focus does not follow) | one line |
| shield | ordinary 1H melee (sabre) | main, off, **Both** (5b) | no follow (the off weapon is not a follows item); the sabre asks 5a's +2 | one line; the Both row two |
| 1H melee | follows knife (Afterword) | main, other (Afterword has no off block of its own). **No Both.** | the technique, then Afterword's follow at ×0.25 | two lines |
| 1H melee | ordinary 1H melee | main, off, Both: **unchanged** | no follow | one line; the Both row two |
| follows knife (Afterword) | ordinary 1H melee | main, off, Both (the off one is not a follows item) | no follow | as today |
| 2H weapon | none | main, other | no follow | one line |
| heavy 2H held in one hand (Heavyworlder) | shield | main, off (shield techniques), other | **no follow** (the main weapon's row is not 1H) | one line |
| gun | shield | main (the gun), off (shield techniques), other | a gun technique: no follow; a melee blow with the gun hand (`combat/attack` melee, fists fallback): no follow | one line |
| fists or gloves | shield | main (the unarmed rows; no Open Hand forms, which need gloves in both hands), off, other | the gloved Strike, then the follow | two lines |
| Evoker blade | shield | main (its melee and Sigil rows), off, other | a blade technique, then the follow; drawing or Evoking a glyph gets none | two lines on melee rows |

## 4. Built from

| Rule | Carried by (existing primitive) | Where |
|---|---|---|
| Once per technique, after it resolved, own action only | the tail of `useTechnique` (paired halves carry `args._pair`; Answers, watches and opportunity strikes never pass through it) | `physical/core.ts:944-950`, `:1083-1087` |
| The preview's second line | the tail of `previewTechnique`; `strike()` in a preview pushes into `t.pv.attacks` | `physical/core.ts:858`, `:436` |
| At the unit really struck | `act.real` (set at the first `attack_roll`), returned as `StrikeResult.target` | `physical/core.ts:451-452`, `:474` |
| The off hand's strike as its own attack (its weapon, mods, jam, skill, `swapMain`) | the weapon branch of `inHand`, routed through `withOffHand` | `physical/core.ts:375-379`; `combat.ts:2528` |
| One attack through every hook, the log and the fx | `strike()` → `resolveAttack` | `physical/core.ts:401-458`; `combat.ts:1403-1506` |
| No Momentum, no Finisher chain | not Cut (`isPlainMelee` false → `noMomentum`); `noteChain` is never reached | `physical/core.ts:163`, `:441`, `:947` |
| No Pressure added or shed | `StrikeOpts.noPressure` (`strikeNoPressure`), extended to the melee shed | `physical/rules.ts:35-42` |
| `free_tech` false for the follow | the follow row is not `free` | `effects/triggers.ts:266` |
| Durability's roll while holding Guard (R6) | `roll_with` on `attack`, mode `melee` | `data/skills.json:83-104` |
| A shield's and a knife's own on-hit and sizing lines | a modifier row named in the row's `variant_mods`, held by `instanceMods` for an instance in a hand; matched by `with_this` (the strike's `src.weapon` is the shield's own id once shields are weapon rows) and `mode: [follow]` (reads `ctx.tech`) | `effects/collect.ts:206-208`; `effects/hooks.ts:193-211`; `effects/triggers.ts:212-224`, `:164` |
| Once a turn across every shield | `limit {per: per_turn, n: 1}` on one shared modifier row (the limit is keyed by the item, so both shields spend one use) | `effects/triggers.ts:611-616` |
| The +1 Guard under the cap | op `resource`, `addGuard` | `physical/core.ts` `addGuard`; `guardFx` |
| Requirements in the off hand; no +2 | the gear gate (5c); `secondWeaponWhy` skips an off-hand row with `follows` | `character.ts:1370-1376` |
| The follow's wear | the one wear line (1, 5 more on a fumble) | `combat.ts:1456` |
| The Both block | one engine test `pairs(u)` (F-d) | `combat.ts:2281`; `physical/core.ts:1049-1063`; `descriptors.ts:554` |
| Kill credit, mastery | `src.weapon` (the shield's own id), its row's `mastery_family` | `combat.ts:1342` |
| The fx | the `melee` event of the follow's own roll; the `guard` event for its plate | `combat.ts:1458`; `apps/web/src/game/fx/guard.ts:161` |
| Enemies unchanged | `unitFromEnemy` fills the off hand only from the row | `combat.ts` `unitFromEnemy` |

## 5. Needs a new primitive

Each one is the lead's to approve; none is built until then.

1. **N1, two data words.** The property `follows` (`techniques.json rules.props`, `tools/validate.py`'s prop set, with
   the rule "only on a shield or a `phys.system: melee` row") and the technique group `follow` (in `rules.groups.melee`
   and `group_names`; no `tech_group` row names it). One reader, `followOf(u)`: the off-hand weapon if its row has the
   word, else null (shaped like `shieldOf`, `core.ts:93`). No numbers on the flag: the to-hit and multiplier live on the
   `follow` technique row (`numbers.extra` −2, `numbers.mult` 1.0) and per item on its modifier row; the wear is the one
   wear line.
2. **N2, shields as weapon rows (a ruling, not a primitive; shared with the either-hand lane, which owns Guard 2.0's
   P11).** `buckler` and `riot_shield` move to `weapons.json` under their own ids (category `shield`, slot off hand,
   `phys.props [shield, follows]`, `phys.system melee`, the line of F9, Defense and Movement kept as the row's
   `effects`, durability 150). Then the strike's `u.weapon` is the shield's id, so `WEAPON[...]`, `with_this`, kill
   credit and the AP all work, and P11 and the `fists` fallback (`SHIELD_HAND`) go away. The sites that read "a shield"
   become one test of the `shield` prop: `shieldOf` (`core.ts:93`), `unitFromCharacter`'s `offItem` (`combat.ts:557`),
   `answers.ts:44` `shieldInOffHand`, `gearBonus` (`character.ts:721`) and `secondWeaponWhy`'s "shields are not
   weapons". Both lanes must take this answer before either builds; if the either-hand lane keeps P11 instead, P11 needs
   an `ap` field and must be read by `pairedAttack`, `pairedWhy`, `pairedAp`, `attackApCost` and `weaponSystem`.
3. **N3, `follow(t)`**, one engine function in `physical/core.ts`, called from the tail of `useTechnique` (real) and of
   `previewTechnique` (preview). It runs when: `!t.args._pair`, `t.hand === 'main'`, `t.def.system === 'melee'`, the
   main weapon is a melee arm whose row is `hands: 1H`, `t.wield` is not a throwable, `!cb.reacting`, `!cb.window`,
   `followOf(u)`, and `scratch(t).real` names a foe still up within reach. `strike()` records `scratch(t).real` (the
   `act.real` of the first non-thrown melee roll of the main hand). It builds a Tech for the `follow` row with hand
   `off` and calls `strike()` directly (never `useTechnique`: no AP, no Momentum cost, no chain, no "uses Follow"
   line), with `rider: true` and `noPressure: true`. The `follow` row is not `free`, not `particular`, has no
   `comes_with`, is learned by nobody, so it is never padded. In a preview the attack entry carries `follow: true`
   (F-c). It runs inside the action, so the field's harm-to-a-friend refusal (`game.ts:1734`) covers it.
4. **N4, the rider rule** (`StrikeOpts.rider`, read through one helper `strikeRider(att)` beside `strikeNoPressure`).
   Three readers: the trigger runner skips the attacker's `hit`, `miss`, kill and downed item lines for a rider unless
   the line is `with_this` the striking item, and spends no limited use of a line that is not the follows item's own
   (such a line applies only while a use is left); the melee Answers (`physical/melee/answers.ts` `on_miss`: Riposte,
   Keep Back, Retort) do not answer a rider's miss; the melee Pressure shed (`physical/rules.ts:35`) reads
   `strikeNoPressure` as the ranged branch already does.

**Fields and consolidation, not primitives:**
- **F-b, the off hand's durability on the unit** (`offDur`, `offMaxDur` from `c.offHand`'s GearState, written back
  beside the main one at `game.ts:2384`), swapped in by `withOffHand` only (`combat.ts:2528`). The other four copies of
  the swap (`inHand`'s two branches, `pairedAttack`, `ranged/press.ts:90`) are routed through it (one copy, rule 3).
  Until question 4 is ruled, `withOffHand` swaps the durability in only for a follow; every other off-hand strike keeps
  `maxDur = 0` as today.
- **F-c, `follow: true`** on the follow's `TechPreview.attacks` entry and its `melee` fx event (`ro.fx`, `core.ts:443`).
- **F-d, `pairs(u)`**: two weapons of one system whose off-hand one carries no `follows`. Read by `pairedAttack`
  (which checks no system today), `pairedWhy`, `pairedPad`, `descriptors.ts:554` and, through the descriptor, the
  client (`techView.ts:158` stops deciding it).
- **F-e, the off hand of a follows item offers no attack** (`usable(cb, u, 'off')` lists only `comes_with` techniques of
  its other properties when the off row has `follows`).

**Data, not primitives:** the technique row `follow`; the shields' rows (N2); `mod_follow_guard` and
`mod_afterword` (items.json modifier rows); Afterword's row; Shield Bash's `ap` and `mult`.

## 6. Collisions

| # | Item, perk or move | Ruling |
|---|---|---|
| 1 | Momentum (+1 a Cut hit) | none from a follow (not Cut) |
| 2 | The Breaker's closing bonus | cannot ride: `attackedTurn` is set by the main technique first (`core.ts:948`) |
| 3 | Charge Carries | the Charge gets one follow; its predicates never match the follow's mode |
| 4 | Smite, Judged | never ride a follow (N4) |
| 5 | The Bulwark perk (+2% a Guard), Iron Grip, Last Charge, Weight of the Wall | sizing lines: they shape the follow; their limited uses are not spent by it |
| 6 | Pressure shed on a melee hit | not by a follow (N4) |
| 7 | Durability's `roll_with` (mode melee) | the follow rolls with Durability while holding Guard (R6) |
| 8 | Flurry, Finishers | one technique, one follow, at the first roll's real target |
| 9 | Mastery credit | the follows item's family (a shield: Unarmed; Afterword: light blades) |
| 10 | Riposte, Keep Back, Retort on the foe's side | a missed follow draws none (F6); a landed one meets armour, soak and Parry |
| 11 | Sidestep "ignores a carried shield", Eyes in the Back | unaffected |
| 12 | Legion gladius "Shield Partner" | must read the `shield` prop, not `items.json` category (N2's site list) |
| 13 | Open Hand forms | a shield already turns them off |
| 14 | **Shield Bash** | the shield's own line × 2.5, **1 AP**, 1 Guard, no follow (off hand), still the only shield blow that pushes and gives Momentum |
| 15 | Dance of Iron and other deeds (`deeds.ts:146-154`) | they count attacks aimed at a PC, not the attacker's hits: nothing to change |
| 16 | The paired attack | refuses a follows item (F-d) |
| 17 | Guard 2.0's item 17 (the Shield Follows on P9) | withdrawn in favour of this draft; P9 stays only if Hold the Gap needs it |

**Found while reading (for the consolidation list, not this draft):** Guard's pool is 4 in data (`techniques.json:28`)
but 5 in `classes.json:72` and `fx/guard.ts:3`; a plate soaks 6 (`techniques.json:35`) but 10 in the same texts. The
client copies the paired attack's numbers into its own text (`techView.ts:162`, `:176`, `:179`).

## 7. Numbers (by arithmetic; nothing was run)

**The fields, all PROVISIONAL:**

| Field | Value | Why |
|---|---|---|
| `techniques.json follow.numbers.extra` | −2 | keeps a light blade + riot shield near the 115% band (below) |
| `follow.numbers.mult` | 1.0 | a shield's line is its own |
| buckler line | 6, Durability, scales with Strength | the duelist gains little, the tank about +15% |
| riot shield line | 8, the rest as the buckler | the heavier shield, paid by −0.5 Movement |
| `mod_follow_guard` | `resource guard 1`, `when: hit`, `if {with_this: true, mode: [follow]}`, `limit {per: per_turn, n: 1}` | F11 |
| `shield_bash.ap` | 2 → **1** | a plate buys a blow better than a Cut and its follow |
| `shield_bash.numbers.mult` | 1.5 → **2.5** | buckler Bash 15 (today's 15), riot shield 20 |
| `mod_afterword` | `damage_mult 0.25` and Bleeding (Body save), both `with_this`, `mode: [follow]`, the Bleeding once a turn | section 8 |

**How it is worked:** damage = line × melee profile (1.15385 × (1 + 0.05 × (attribute − 1)): 1.154 at 1, 1.50 at 7) ×
`output.factors.melee` 1.35, minus armour (Soldier 5, Elite and Boss 10, × the level scale; `effects/output.ts:211`);
one modifier point is 5 percentage points.

**The duelist** (Dexterity 7, Agility 7, Durability 0, Strength 1), gladius + buckler, level 1, against a Soldier. Main:
26 × 1.50 × 1.35 − 5 = 47.7 at 75%. Follow: 6 × 1.154 × 1.35 − 5 = 4.3 at 25% (10 points worse). Share **0.03** (riot
shield 0.05; against an Elite about 0). The gladius stays near 95% of the greatsword: for a Dexterity duelist a shield is
Defense, Guard and techniques, not damage.

**The light-blade band.** Katana (107% of the greatsword) + riot shield: at Durability 0 the follow is 7.5 at 25%,
**about 112%**; at Durability 3 holding Guard (45%), **about 116%**, on the band's edge. If the measure confirms it, the
lever is question 1 (once a turn).

**The tank** (`packages/engine/test/balance/builds.ts:67`: sabre and riot shield, Durability 7 holding Guard, Strength
1). Level 1: main 28 × 1.269 × 1.35 − 5 = 43.0 at 75%; follow 7.5 at 65%; share **0.15**. With the level scale on both
blows the share is about 0.15 / 0.16 / 0.17 / 0.17 at levels 1 / 5 / 10 / 20. Measured tank 77 / 55 / 78 / 124 becomes
about **89 / 64 / 91 / 145**, against the dealer's 156 / 150 / 133 / 178: the tank goes from 49%–70% of the dealer to
**43%–81%**, under the dealer and under the melee ceiling (165) at every level. Scaling with Strength (not Endurance)
is what keeps it there: an Endurance-scaled riot shield 10 put the tank at about 180 at level 20, above the dealer.

**Shield Bash** at 1 AP (the tank, level 1, Soldier): 20 × 1.154 × 1.35 − 5 = 26.2 at 75%, about 19.6 per AP, against
about 18.5 per AP for a Cut and its follow; it costs a plate and pushes. The follow's once-a-turn plate funds one Bash a
turn.

**Guard.** The Guard technique gives Durability + 2 with a shield, so the tank's pool is full whenever the follow lands:
for it the plate is worth almost nothing. A pool of 1 is kept back (`guard.ts:49`, `keep_back` 1). The follow's plate
matters to **pools of 2 and 3**: one soak, or one Retort or Challenge, a turn. It never funds Slam (2 Guard) alone.

**The Riposte risk** is gone (F6): a missed follow draws no Answer, so a shield never costs its holder damage.

**Measure before fixing** (named cells, Soldier **and** Elite and Boss fights): `melee-measure` with gladius+buckler,
gladius+riot, katana+riot (Durability 0 and 3), sabre+riot, gladius+Afterword, katana+Afterword; `tank-measure` from the
`tank` row. The goldens are re-recorded only on purpose.

## 8. Worked example: the off-hand knife

**Afterword** (in-universe: a Legion quartermaster's last-issue knife, made for the hand that isn't holding the sword).
A weapons.json row with `follows`; in the main hand it is an ordinary knife (15, Dexterity); in the off hand it only
follows (F8). Its edge is in its modifier row, not in code:

```json
{ "id": "afterword", "name": "Afterword", "category": "blade",
  "damage": 15, "damage_type": "physical", "range_tiles": 1, "ap_cost": { "attack": 2 },
  "skill": "dexterity", "hands": "1H", "durability": 160, "mastery_family": "light_blades",
  "rarity": "rare", "price_credits": 700, "provisional": true, "adjudication": "engine",
  "variant_mods": ["mod_afterword"],
  "phys": { "system": "melee", "profile": "melee", "props": ["light", "follows"],
            "hits_with": "dexterity", "scales_with": ["agility"] } }
```

`mod_afterword` (items.json, shaped like `mod_serrated`): `damage_mult 0.25` and `condition bleeding` (Body save,
`limit {per: per_turn, n: 1}`), both `if {with_this: true, mode: [follow]}`. No code names `afterword`.

- **Numbers.** Gladius + Afterword, level 1, Soldier: the follow is 15 × 0.25 × 1.50 × 1.35 − 5 = 2.6 at 65%, about
  5%; Bleeding (a flat 5 a turn) about 5% more at level 1 and under 1% at level 20. **Rarity: rare at the riot shield's
  price**, because it has none of a shield's Defense, Guard or techniques, and it cannot be raised on damage (the katana
  has 8 points of headroom in the band). Question 5.
- **Requirements:** its own Dexterity requirement in the off hand; no +2.
- **Art:** a monoline weapon icon (`art/style-guide/weapon-icons.md`): a short reversed-grip blade with a stamp notch on
  the spine; a line in `art/briefs/ART-REQUESTS.md` when the row is added. The shields, as weapon rows, keep their
  current armour icons.

## 9. Screens and effects

Every mode keeps its left and right panels; the fight screen is the stated exception, as today.

- **The rows.** Each main-block melee row that would draw a follow carries a second line, the engine's preview entry
  marked `follow: true`: "then Buckler · 47% · 4". Out of reach: "then Buckler · out of reach". The Guard plate is not on
  the line (no `hit` line runs in a preview); it shows through the `guard` fx and the log.
- **The target card.** The `odds` slot shows both: "Cut 72% · then Buckler 47%".
- **The Both block** exists by the engine's `pairs(u)` (F-d). The client's test and typed texts go; the paired attack
  gets the preview it never had (two lines), so the Both block and the follow read the same way.
- **The log.** The main roll's line, then the follow's ordinary attack line from the engine, headed "Buckler follows:".
  A follow not made says nothing.
- **The effect** (`fx/follow.ts`, registered as `fx/guard.ts` is at `fx/play.ts:1410`): the `melee` event with
  `follow: true`, chained after the main swing; a second 4 px lunge from the off-hand side 120 ms later; a shield draws
  its rim as a short arc swept across the target (100 ms), a blade the existing slash, thinner; on a hit the target tilts
  6 degrees. The plate plays through the `guard` event (`why: gain`). Under Reduce motion, no travel; the words show.
- **Sound.** The soak clang at a lower volume for a shield, the slash for a blade. No new asset.

## 10. Tests that would prove it

All through the reducer with real actions (`apply(g, {type: 'combat/technique', id: 'cut', ...})`).

| # | Test | Asserts |
|---|---|---|
| 1 | gladius + buckler, Cut at an adjacent foe | two `attack_roll`s, the second `tech: 'follow'`; AP = Cut's; Momentum from the main hit only; buckler and gladius durability −1 each |
| 2 | Flurry; a Finisher with extra targets | one follow, at the first roll's real target |
| 3 | the main blow kills; the main blow is redirected (a captive as a shield) | no follow; the follow at the unit really struck |
| 4 | pistol + buckler: a shot, a Burst, a throw, `combat/attack` melee with the pistol | no follow |
| 5 | Riposte, Retort, an opportunity strike, an own-turn Answer, a technique in an off-turn window | no follow |
| 6 | Shield Bash | no follow; 1 AP; damage = 6 × 2.5 through the profile; hits with Durability; no Guard from `mod_follow_guard` |
| 7 | buckler + riot shield (one each hand), two follows that land in a turn, plus a Bash | Guard +1 once in the turn; never above the pool |
| 8 | a Skirmisher with Pressure; a Cut and its follow land | Pressure shed once |
| 9 | a Chaplain with a buckler: the main misses, the follow lands | no Smite, no Judged |
| 10 | an Elite with Riposte; the follow misses | no Riposte |
| 11 | a Durability 7 tank holding Guard | the follow's preview carries the holding-Guard roll |
| 12 | gladius + Afterword | no Both block; `combat/paired` refused; no off-hand attack offered; a follow at ×0.25; Bleeding once a turn |
| 13 | equip Afterword / a buckler off hand at its bare requirement; a sabre beside a main-hand shield | accepted, accepted; refused by 5a |
| 14 | shield in each hand; main shield + off sabre; main Afterword + off gladius | the off shield follows; Both opens; Both opens |
| 15 | Heavyworlder greatsword + buckler | no follow |
| 16 | a follows item at 0 durability | no follow |
| 17 | the field after a fight: a follow that would hit a friend | the action is refused |
| 18 | an enemy turn on a fixed seed | the same moves |
| 19 | `boundary.test.ts`, the lints | no bespoke op; baselines unchanged or smaller |

**Client truths that change:** `combat-attack-areas.test.ts:71-80`, `:173` (gladius + Afterword: `main other`; gladius +
buckler stays `main off other`); `techView.test.ts` (the Both block from the descriptor); `e2e/physical-pack.mjs:69-80`
(the Cut row's second line names the buckler); a new `fx/follow.test.ts`.

**Build order (each slice ships alone):** (1) F-b and F-d, the swap consolidation, no rule change; (2) N2 (with the
either-hand lane), the shields' lines, Bash re-based; (3) N1, N3, N4, F-c, F-e, the preview, the fx; (4) Afterword.
Before the release, the consolidation pass (rule 4) reads N1 to N4 against Guard 2.0's P9.

## 11. Questions that are Leon's

1. **Per technique or once a turn?** Recommended: per technique (your reference). Once a turn is the lever if a light
   blade + riot shield measures over 115%.
2. **A shield hits with Durability and grows with Strength.** Strength, not Endurance, so the tank does not catch the
   damage dealer at level 20. Recommended: yes.
3. **Shields become weapon rows** (N2), shared with the either-hand lane. Recommended: yes; it removes a primitive.
4. **Off-hand wear beyond the follow.** Today no off-hand weapon ever wears; R7 asks only for the follow. Should a paired
   attack's off swing and an off-hand Cut wear too? That changes "an attack action wears 1" (spec Durability 4.1).
   Recommended: yes, as its own spec item; until you rule, only the follow wears.
5. **Afterword's rarity.** Recommended: rare, 700 credits. A legendary needs a non-damage edge, tested on the katana
   loadout.
6. **Class and perk strikes** (Launch, Wrecker, the Three-Cut Script). Recommended: no follow for now; one may be given
   later by its own row, never by code.
7. **Two shields' Defense:** stack or the higher only? The either-hand lane's call; recommended: the higher only.

## Review (16 Nov 2026: what the reviewers found and what changed)

Accepted, now in the text:
- **The carrier** (rules lawyer 1, purist 1): a gear row's own `when:` lines are never held; the on-hit and sizing
  lines are modifier rows named by `variant_mods`.
- **`with_this` and the strike's id** (purist 2, rules lawyer 11): shields become weapon rows (N2), which also gives a
  main-hand shield its AP and the Both block their lookups; `phys.strike` is dropped.
- **`phys.follow` became the prop `follows`** (purist 3): its `wear` was a second copy of the wear line; `mult` and
  `extra` live on the technique row and per item on its modifier row; `second_weapon` had no user.
- **No mark, no `acted` handler** (purist 4): the follow sits at the `useTechnique` / `previewTechnique` tails. This
  closes rules lawyer 5 (Shield Bash is made with the off hand), 9 (no stale mark), 10 (`cb.reacting` and windows are
  tested) and gives the preview R9 needs; the field's friend-harm check still covers it.
- **Limits** (rules lawyer 2 and 3, purist 5): a follow spends no other item's use; the follows item's own lines spend
  theirs; the Guard line is `mode: [follow]` on one shared row, once a turn across all shields.
- **F-d** (rules lawyer 4, purist 8): the off hand only decides, `pairedAttack` reads it too, "no shield in the off
  hand" dropped.
- **A second weapon by the back door** (rules lawyer 6): a follows item has no off-hand attack.
- **Guns** (rules lawyer 7 and 8): `follows` only on shields and melee rows; a gun hand's fists blow never follows.
- **5a, 5b amended** (rules lawyer 11); **Heavyworlder** (12): the main weapon must be truly 1H; **at whom** (13): the
  first roll's real unit; **Pressed** dropped and no-sheet units stated (14); **Worn, Broken** (15); the paired
  attack's wear made a question (16, purist 7); **the follow row** specified (17); **the five swap copies** routed
  through `withOffHand` (purist 7); the preview line without "+1 Guard" and the group named (purist 9); P9's "Shield
  Follows" withdrawn (purist 10).
- **Balance 1 to 7:** Strength scaling, case B redone from the `tank` build, armour and the 1.35 factor applied, the
  −2 follow term with lines 6 / 8, Bash at 1 AP, the plate economy corrected, no Answer to a missed follow; Afterword
  re-tiered to rare.

Rejected or narrowed:
- **Purist 6, "N4 is half existing flags":** partly. Momentum, the closing bonus and the Finisher count are existing
  behaviour (now in the Built-from table and collisions), and the deeds reading was a misreading (collision 15). But the
  Answers' skip of a missed rider (balance 7) is a real third reader, so N4 keeps three readers, not one.
- **Purist 3's `comes_with: ["follows"]` gate:** not taken. A row with `comes_with` is listed by `usable()` and so
  would be drawn on the off pad; the gate is `followOf(u)` in N3 and the row stays unlearnable.
- **Rules lawyer 13's "the main hand's last roll":** narrowed to the **first** roll's real unit, so a Finisher's or a
  sweep's later targets never draw the follow (R1).
