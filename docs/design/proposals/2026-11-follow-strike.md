# Follow strikes: the off hand that swings after the main one (proposal)

16 Nov 2026, first draft. Status: **design, nothing built**. Every number below is PROVISIONAL and a data field (named
in each row). If it is accepted, the spec changes first ("Hands, off hands and dual wielding" gains 5e, as rules 1.57),
then the data, then the code. The lead assigns the spec item numbers; this draft calls them F1 to F12. Every item is
`adjudication: engine`. Sister drafts: `2026-11-guard-2.0.md` (its items 16 and 17, "the shield's own swing" and "the
Shield Follows", and its P9 and P11, are where this starts) and the "a shield in either hand" lane
(`lane/shield-either-hand`, nothing committed yet when this was written).

Leon, 16 Nov 2026: his reference is a sword-and-shield moveset where the shield's hits are woven into the weapon's
attacks. He expects the dual-wield code to carry it and wants it general ("a legendary knife that works just like this
when you put it in the off hand"). His question: "we have a separate tab for dualweild too the "both" tab, think of how
the interaction works".

## 1. The idea in five lines

1. An item that can sit in the off hand may carry one data block, `phys.follow`. That makes it a **follows** item.
2. While it is in the off hand, every melee attack **action** you make with the main hand is followed by one strike
   from it. The strike has its own roll and its own damage line, costs no AP and takes no off-hand penalty.
3. The follow strike is a **rider**. It hits, wears and does what its own item says, but it is not "a melee hit" for
   Momentum, Pressure, Smite, perks or Finishers.
4. A follows item is not a second weapon. It never opens the Both block, never pairs, and does not ask the +2 of rule 5a.
5. The shield is the first follows item; a legendary off-hand knife (section 8) is the second. A Burst, a throw and a
   reaction never get a follow.

## 2. The rule, as spec text ready to paste

> ## Rules 1.57: follow strikes (hands 5e)
>
> Leon, 16 Nov 2026 (a sword-and-shield moveset: the shield's blows are part of the weapon's attacks). Draft:
> docs/design/proposals/2026-11-follow-strike.md. Every number is PROVISIONAL and a data field.
>
> **5e. Follow strikes** (items F1 to F12).
> 1. **What follows** (F1). An off-hand item whose row carries `phys.follow` is a *follows* item: today the buckler and
>    the Legion riot shield (items.json), and any weapon row that carries the block (the first is the legendary knife
>    Afterword, weapons.json). The block holds the strike's numbers: `mult` (a share of the item's own damage line,
>    default `techniques.json rules.follow.mult` 1.0), `extra` (a to-hit term, default `rules.follow.extra` 0) and `wear`
>    (durability the item loses when it strikes, default `rules.follow.wear` 1).
> 2. **When it follows** (F2). While a follows item is in your **off** hand, each action of your own, on your own turn,
>    in which your **main** hand made at least one melee roll is followed by **one** strike with the follows item, made
>    after that action has resolved. A Cut, a plain melee attack, a Charge, a Flurry, a Finisher and every other melee
>    technique made with the main hand count, whatever the number of rolls in them: one action, one follow.
> 3. **Never** (F3). There is no follow after a shot, a Burst, full auto, an aimed shot or a throw (a gun hit at an
>    adjacent foe included); after a reaction or an Answer of any kind (Riposte, Retort, Counter, an opportunity strike, a
>    held strike, Hold the Gap); after an action made with the off hand (Shield Bash, an off-hand Cut); after a paired
>    attack or a both-hands technique; or after another follow.
> 4. **At whom** (F4). The follow goes at the action's named target, if it is still up and within the follows item's
>    reach. A Finisher's extra targets, a sweep's other targets and an action that names no unit get no follow. If the
>    named target is down, or out of reach, there is no follow and nothing is said.
> 5. **The roll** (F5). The follow is its own attack: its own d20, rolled with the follows item's own skill (its
>    `hits_with`; a shield's is Durability, F9) plus `follow.extra`, with every to-hit term the attack would have (cover,
>    Pressed, Durability's "holding Guard" roll, the target's Defense). There is no off-hand penalty: the follow is not a
>    paired attack. Its damage is the item's strike line × `follow.mult`, through the melee profile and the target's
>    armour, like any blow.
> 6. **A rider** (F6). A follow that lands does what its own item says (its row's `when: hit` lines). It does **not**
>    give Momentum, does not shed or add Pressure, does not spend a set-up mark, does not carry Smite or Judged, and is
>    not "a melee hit" for any perk, class move or door. A perk or move that changes how hard or how surely a blow lands
>    (a `roll_mod`, `roll_with` or `damage_mult` on the blow) does change the follow, as it changes any blow; one that
>    reacts to a blow having landed (`hit`, `miss`, a kill or a downing) ignores it unless the line is the follows
>    item's own. A limited use is never spent by a follow. The target answers a follow as any melee attack (its armour,
>    its Guard, its Parry, its Riposte on a miss).
> 7. **Wear** (F7). The follows item loses `follow.wear` durability for each follow, 5 more on a fumble, as a weapon
>    does. The main weapon's wear is unchanged. An off-hand weapon now wears on every strike it makes (a paired attack's
>    off-hand swing too: before this it never wore).
> 8. **Not a second weapon** (F8). A follows item is a rider, not a second wielded weapon: it does not open the Both
>    block, and it cannot be the off hand of a paired attack or of a both-hands technique. It keeps its own off-hand
>    block (a shield's techniques; a follows weapon's own off-hand attack and techniques). It asks its own requirement in
>    the off hand (5c), but not the "+2 for a second weapon" of 5a, unless its block says `second_weapon: true`.
> 9. **A shield's strike** (F9). Every shield carries its own strike line (`items.json phys.strike`: `damage`,
>    `hits_with`, `scales_with`, `reach`), read wherever the shield strikes: the follow, Shield Bash, and (in the main
>    hand, rules "a shield in either hand") the shield's own attack. A shield strikes with **Durability** and grows
>    with **Endurance**; its blows count as Unarmed for mastery (rule 8). Buckler 8, riot shield 10.
> 10. **A shield in the main hand** (F10). A follows item in the main hand is a weapon with its strike line, and its
>     attack is an ordinary attack. With a shield in each hand the main one attacks and the off one follows. A shield
>     in the main hand with an ordinary one-handed melee weapon in the off hand is ordinary dual wielding: a shield's
>     strike is of the **melee** kind, so the pair opens the Both block (5b), the shield at −1 and the weapon at −3.
> 11. **A shield's follow gives Guard** (F11). A buckler's or a riot shield's follow that lands gives 1 Guard
>     (`items.json` the shield's `when: hit` line, `resource guard 1`), under the pool's cap, **once a turn**
>     (`limit {per: per_turn, n: 1}`).
> 12. **Enemies** (F12). An enemy follows only if its data row puts a follows item in its off hand. No enemy has one
>     today; the enemy turn is unchanged.

**Where a lead ruling cannot hold as written** (each with the nearest rule that can, already in the text above):

| Ruling | What does not hold | The nearest rule |
|---|---|---|
| R1 "no off-hand penalty", its "own damage line" | A follows weapon (the knife) at its full line would be a free second weapon: a Combat knife's 15 after every 26-point gladius blow is +58% (section 7). | `phys.follow.mult` (F1): a follows weapon strikes at a share of its line. A shield's line is its own and needs no share (`mult` 1). |
| R2 "sword + shield shows the main block only" | Today the shield already has its own off-hand block (Shield Bash, Raise Shield, Shield Wall: `techView.ts:178`, `b.shield`), and it must stay. | "No Both block" holds. The main block gets the follow line (section 9); the shield's off block is unchanged. |
| R5 "+1 Guard" (no limit) | Per landed follow, two or three follows a turn is +2 to +3 plates. That funds Slam (2 Guard) every turn with no Guard technique, and the Guard technique stops mattering (Reader 3's Guard count). | +1 Guard, under the cap, **once a turn** (F11), a data `limit`. The damage still comes on every action. |
| R5 "does not count as a melee hit for perks" | Some perks shape the blow (Iron Grip's +%, the Bulwark perk's +2% a Guard), some react to it (Smite, the closing bonus, Pressure shed). Treating both kinds the same either kills R6 (Durability's `roll_with` is a perk-like line on `attack`) or lets Smite ride. | F6's split: sizing lines (`attack`, `to_hit`, `attack_roll`, `dealing`) see the follow; "it landed" lines (`hit`, `miss`, kill, downed) do not, except the follows item's own (`with_this`). No limited use is spent by it. |
| R6 "the attacker's usual skill for that item" | A shield has no skill today: it strikes as `fists` (Raw Power), `physical/core.ts:95`. | F9: the shield's own `hits_with` (Durability recommended; question 2). |
| R9 "the preview shows both lines (as the paired attack's preview does today)" | The paired attack has **no** preview today: `paired` is not in `ATTACK_MODES` (`apps/web/src/game/techView.ts:41`), and the target card says "Pick an attack to see the odds" (`screens/combat.js:1390`). | The follow's line comes from the engine's technique preview (section 9, field `follow` on `TechPreview.attacks`); the paired attack gets the same treatment in the same slice. |

R3, R4, R7 and R8 hold as written (R4 with F10's answer: a shield strike is of the melee kind). R1's "one follow per
attack action" needs **no** new limit scope (Reader 1 found none `per_action`): the trigger `acted` already fires
exactly once after each action (`combat.ts:2563`, fired from `game.ts:1736`), so the follow hangs off it.

## 3. The Both block and every hand combination

"Blocks" are the Attack tab's areas (`apps/web/src/game/attackAreas.ts:8`): main, off, both, other.

| Main hand | Off hand | Blocks shown | What a main-hand melee row does | What the preview shows |
|---|---|---|---|---|
| 1H melee weapon (gladius) | shield (buckler) | main, off (shield techniques), other. **No Both.** | the main strike, then the buckler's follow at the same target | the main line ("Cut · 72% · 26") and under it "then Buckler · 41% · 8, +1 Guard" |
| shield | shield | main (the main shield's strike and its techniques), off (the off shield's techniques), other. No Both (the off one follows). | the main shield's attack, then the off shield's follow | both shield lines |
| shield | focus (Evoker, Emanator) | main (the shield's strike), off (the focus's own rows, as today), other | the shield's attack; no follow (a focus does not follow) | one line |
| shield | ordinary 1H melee weapon | main, off, **Both** (5b: two melee weapons, the shield's strike is melee) | the shield's attack only; no follow (the off weapon carries no `phys.follow`) | one line; the Both block's paired row shows two lines (main −1, off −3) |
| 1H melee weapon | follows knife (Afterword) | main, off (the knife's own attack and techniques, at its full line), other. **No Both** (F8). | the main strike, then Afterword's follow at `mult` 0.25 | "then Afterword · 70% · 4, Bleeding (Body save)" |
| 1H melee weapon | ordinary 1H melee weapon | main, off, Both: **unchanged** from today | the main strike only | one line; the paired row two lines |
| 2H weapon | none (2H fills both hands) | main, other | the strike only | one line |
| gun (pistol) | shield | main (the gun), off (shield techniques), other. No Both (one gun, no second melee weapon; a shield is not a gun). | a shot: **no follow** (F3), even at an adjacent foe | one line |
| gloves (knuckledusters, the fists) | shield | main (the gloves' unarmed rows; no Open Hand forms: those need gloves in both hands, `techniques.json:172` `comes_while`), off (shield techniques), other | the gloved blow, then the shield's follow | two lines |
| Evoker blade (a weapon and a focus) | shield | main (its melee rows and its Sigil rows), off (shield techniques), other | a blade blow, then the follow; drawing or Evoking a glyph is not a melee attack and gets none | two lines on the blade's melee rows |

## 4. Built from

| Rule | Carried by (existing primitive) | Where |
|---|---|---|
| The off hand's strike made as its own attack, with its own weapon, mods, jam and skill | `inHand`: swaps the off hand's weapon (or, for a shield, the hand behind it) into the main slots for one strike | `packages/engine/src/physical/core.ts:364-380` |
| One attack through every hook, the log and the fx | `strike()` → `resolveAttack` | `physical/core.ts:401-458`; `combat.ts:1403-1506` |
| No Momentum from the follow | a technique's strike is not the plain melee attack: `isPlainMelee(def)` false → `noMomentum` | `physical/core.ts:163`, `:441`; `combat.ts:1488` |
| No Recoil, the strike numbered in a named volley | `StrikeOpts.volley` → `asVolley(name)`; `noRecoil` inside a volley | `physical/core.ts:409`, `:445`; `combat.ts:413`, `:433` |
| `free_tech` false for the follow (Fire Discipline and every "free technique" line ignore it) | the predicate reads `ctx.tech` / `ctx.volley` | `effects/triggers.ts:266` |
| Once per action | the trigger `acted`, fired once after each successful action, with the action's target `t` | `combat.ts:2563-2566`; `game.ts:1736`, `:1763-1771` |
| At the named target, only if it is up | `acted`'s ctx `t`; the predicate `target_alive` | `game.ts:1736`; `effects/triggers.ts:182` |
| Within the follows item's reach | `canStrike` (reach and sight, the strike's own preview) | `physical/core.ts:488` `canStrike` (used by Riposte, `physical/melee/answers.ts:21`) |
| Durability's roll while holding Guard (R6) | `roll_with` on `attack`, mode `melee` already listed | `data/skills.json:83-104` |
| The item's own on-hit lines (a shield's +1 Guard, the knife's Bleeding) | an item effect `when: hit` with `if: {with_this: true}`; ops `resource`, `condition` | `effects/triggers.ts:212-239` (`madeWith`), `:239` (`with_this`) |
| Guard +1 under the cap, once a turn | op `resource` (capped by the pool); `limit {per: per_turn, n: 1}` | `docs/ENGINE-HOOKS.md` "Limits and scopes"; `physical/core.ts` `addGuard` |
| Guard's soak, Parry, Riposte on the target's side | unchanged: they read the attack on the target | `physical/guard.ts`; `physical/melee/answers.ts:15-24` |
| The shield's techniques stay in the off block | `shieldOf`, the shield block | `physical/core.ts:93`; `apps/web/src/game/techView.ts:178` |
| Requirements in the off hand | the gear gate checked in the hand it goes to (5c) | `character.ts` (gear gates); `secondWeaponWhy` `character.ts:1370-1376` is the one place the +2 is added |
| Mastery credit for a kill | the kill counts for the weapon of the final hit (rule 8; a shield's is Unarmed) | `src.weapon` on the damage source, `combat.ts:1342` |
| The follow's wear (the formula) | the one wear line: 1 an attack, 5 more on a jam or fumble | `combat.ts:1456` |
| Enemies unchanged | `unitFromEnemy` puts nothing in `offItem` unless the row says so | `combat.ts` `unitFromEnemy`; `data/enemies.json` (no shield: only the AI note mentions one) |
| The fx of the second swing | the ordinary `melee` fx event of the follow's own roll; the `guard` fx (`why: gain`) for its plate | `combat.ts:1458`; `physical/core.ts:123` (`guardFx`); `apps/web/src/game/fx/guard.ts:161` |

**Can the paired-attack path carry it with a data field?** No. `pairedAttack` (`combat.ts:2281-2301`) is its own action
(`combat/paired`, `game.ts:1669`), paid once and made only from the Both block; the follow has to ride **other**
actions (Cut, a Charge, a Finisher), and the plain melee row of the main block is itself a technique (Cut,
`techView.ts:175`). What the paired path has that the follow needs is its swap of the off hand into the main slots,
and that swap already exists in general form in `inHand` (`core.ts:364`), which the follow uses. So the paired path is
not touched by the follow; it is touched only by F8 (it must refuse a follows item) and F7 (its off-hand swing must
wear).

## 5. Needs a new primitive

Four, each general. The lead approves each one; none is built until then.

1. **N1, `phys.follow` (a follows block on an item row).** The flag of R1 with its three numbers (`mult`, `extra`,
   `wear`, and `second_weapon` for F8), on any row that can sit in the off hand (`items.json`, `weapons.json`). One
   reader, `followOf(u)`, which returns the block of the off-hand item or null. It is read in five places: the follow
   rule (N3), the Both block's one test (below), `pairedAttack`/`pairedWhy`/`pairedPad` (refuse it), `secondWeaponWhy`
   (skip the +2), and the preview (section 9). *Nearest piece:* `phys.props` (`'shield'`, `'light'`, `'bare'`) is a list
   of words; a word cannot carry the numbers, so a prop is not enough.
2. **N2, an off-hand item's own strike line, `phys.strike`** (= Guard 2.0's P11, shared with the either-hand lane).
   `damage`, `damage_type`, `hits_with`, `scales_with`, `reach` on a non-weapon row; `inHand` reads it before its
   `fists` fallback (`core.ts:367-372`), and so do `strikeWeapon` and Shield Bash. *Nearest piece:* `SHIELD_HAND =
   'fists'` (`core.ts:95`), which makes every shield strike the same bare hand: it cannot tell a buckler from a riot
   shield, and it ties the shield to Raw Power. If the either-hand lane builds P11 first, this draft uses it unchanged.
3. **N3, the follow rule** (one engine site). A handler on `acted` (`physical/core.ts`, beside the paired techniques):
   if the unit marked this action as "struck in melee with the main hand, on its own turn" and its off hand holds a
   follows item, it makes one `strike()` with hand `off`, the technique row named by `techniques.json
   rules.follow.technique` (`"follow"`, a row nobody learns and no pad shows), `volley: 'follow'`, `rider: true`. The
   mark is a transient field set in `resolveAttack` (melee, not swapped, `active(cb) === att`, no reaction window, not a
   rider) and cleared at `acted`. *Nearest pieces:* Guard 2.0's P9 (a `strike` op on a data trigger) would need a further
   predicate to know the action made a main-hand melee roll, and the `mark`/`flag` pair cannot be set on the right roll
   because attack hooks do not carry `ctx.hand` (`effects/triggers.ts:174` defaults it to `main`, so Shield Bash would
   mark too). If P9 is approved for Hold the Gap, N3 can later become one data line on P9; today N3 is the smaller piece.
4. **N4, the rider rule** (`StrikeOpts.rider`). One flag on a strike, read in two places: `resolveAttack` skips its
   built-in gains for a rider (Momentum is already skipped; also the Pressure shed and add, `physical/rules.ts:35`, the
   set-up mark, the closing bonus), and the trigger runner skips the attacker's own `hit`, `miss`, kill and downed item
   lines for a rider unless the line is `with_this` the striking item, and never spends a limited use on a rider.
   *Nearest pieces:* `noMomentum` and `noPressure` (`physical/types.ts:66`, `core.ts:404-405`) stop two gains only and
   do nothing for items. `free_tech: false` would make every "free technique" line skip the follow, but no perk that
   counts melee hits (Smite, Iron Grip's sister lines, Charge Carries) reads it. Without N4, every such row would need
   a new negative predicate (there is no `not_mode`), and the hundredth perk would need one too.

**Fields, not primitives (listed so the review sees them):**
- **F-a, `ctx.hand` on the attack hooks** (`attack_preview`, `attack_target`, `attack_roll`, `on_hit`, `on_miss`):
  `'off'` while `inHand` has swapped the off hand in, else `'main'`. The existing predicate `hand` then tells the truth
  (today it always says `main` on an attack).
- **F-b, the off hand's durability on the Unit** (`offDur`, `offMaxDur`, from `c.offHand`'s GearState,
  `character.ts:83`) and its write-back beside the main one (`game.ts:2384`). This also fixes a defect: `inHand` and
  `pairedAttack` set `maxDur = 0` for the off hand (`core.ts:376`, `combat.ts:2296`), so an off-hand weapon never wears.
- **F-c, `follow: true`** on the follow's entry in `TechPreview.attacks`, and on its `melee` fx event (through `ro.fx`,
  `core.ts:443`).
- **F-d, one engine test for the Both block** (`pairs(u)`: two weapons of one system, neither a follows item, no
  shield in the off hand). It replaces four copies of the rule: `descriptors.ts:554`, `core.ts:1053-1054`
  (`pairedWhy`), `core.ts:1063` (`pairedPad`) and the client's own `techView.ts:158`. The client reads the engine's
  descriptor `hand: 'both'` and stops deciding it. This shrinks code; it adds no export if `pairedPad` returning `[]`
  is the signal.

**Data, not primitives:** the technique row `follow`; `rules.follow` (`technique`, `mult`, `extra`, `wear`); the
shields' `phys.strike`, `phys.follow` and `when: hit` Guard line; Afterword's row.

## 6. Collisions

| # | Item, perk or move | What would change | Ruling proposed |
|---|---|---|---|
| 1 | Momentum (+1 a plain melee hit, `combat.ts:1488`) | a follow would double the chain's fill | none from a follow (the technique is not Cut; N4 states it) |
| 2 | The Breaker's closing bonus (first melee attack a turn, `classes.json:213`) | a follow is never the first attack, but if the main missed it could be read as one | the follow never takes it (N4) |
| 3 | Charge Carries (mode `charge`, `classes.json:345-420`) | the follow is mode `melee`, tech `follow`, so its predicates never match | unchanged, follows the Charge once |
| 4 | Smite (once a turn, "a hit that kills leaves it for a later hit", `classes.json:2467`) | the follow would pick it up and put Judged on | never rides a follow (N4: a `hit` line not `with_this`) |
| 5 | The Bulwark perk (+2% a Guard held, `perks.json:23-40`) | a sizing line: it multiplies the follow, as any blow; and the follow's +1 Guard feeds it | kept (F6): it shapes the blow; the Guard is once a turn |
| 6 | Iron Grip, Last Charge (melee damage multipliers, `perks.json:816`, `:7360`) | sizing lines | kept (F6); their per-turn uses are never spent by a follow |
| 7 | Pressure (a melee hit sheds the attacker's Pressure, `physical/rules.ts:35`) | twice a turn | not shed by a follow (N4) |
| 8 | Guard's `roll_with` (modes melee, paired; `skills.json:83-104`) | the follow is mode `melee`: it rolls with Durability while holding Guard | intended (R6) |
| 9 | Flurry (two strikes, `techniques.json:598`) | per hit it would be two follows | one action, one follow (F2) |
| 10 | Mastery credit (rule 8: shield bashes count as Unarmed) | a follow kill | credits the follows item's family (a shield: Unarmed; Afterword: light blades) |
| 11 | Retort, Close Guard, Set Against the Blow (`skills.json:116-243`) | answer foe blows; no enemy has a follows item | unchanged; when one does, a follow is a melee blow a Retort answers (once a round, its own limit) |
| 12 | Riposte, Parry on the foe's side | a missed follow can be Riposted | intended: a real swing has a real risk |
| 13 | Sidestep "ignores a carried shield" (`techniques.json:860`), Eyes in the Back (`perks.json:2290`) | read the shield as defence | unaffected |
| 14 | Legion gladius "Shield Partner" (+1 Defense with a shield, `weapons.json:2523-2528`) | the natural follow partner | unchanged |
| 15 | Open Hand (forms need gloves in both hands, `techniques.json:172`) | a shield already turns them off | unchanged |
| 16 | **Shield Bash** (`techniques.json:2814-2845`: 2 AP, bare hand ×1.5 with Raw Power, 1 Guard, +1 Momentum, push) | the follow is a small free shield swing; Bash must stay the big one | Bash stays: it is the shield's own strike line × `numbers.mult` **1.9** (buckler 15, today's number; riot shield 19), hitting with the shield's `hits_with` (Durability), still the only shield blow that pushes and gives Momentum. Bash is made with the off hand, so it gets no follow (F3) |
| 17 | The Defender's plate, Interpose, Draw Fire (Revision 3 moves) | none read melee hits | unchanged |
| 18 | `deeds.ts:146-147` (one volley is one attack) | a follow would count as a second attack for "three hits in a turn" deeds | a rider is not counted (N4's second reader) |
| 19 | The paired attack | a follows item must not pair | refused (F8, F-d) |
| 20 | `free_tech` lines (Fire Discipline) | the follow is in volley `follow` | never free (already so, `triggers.ts:266`) |

**Found while reading (not this draft's to fix; for the consolidation list):** Guard's pool is 4 at most in data
(`techniques.json:28`, `skills.json:53`) but 5 in the Defender's rule text (`classes.json:72`) and in a comment in
`fx/guard.ts:3`; each plate soaks 6 (`techniques.json:35`) but the same texts say 10 (`classes.json:73`, `fx/guard.ts:6`).
The client copies the paired attack's numbers into its own text in three places (`techView.ts:162`, `:176`, `:179`,
beside `descriptors.ts:442`, `:555`): one copy of the rule is the engine's descriptor text (rule 3).

## 7. Numbers (estimates by arithmetic; nothing was run)

**The fields, all PROVISIONAL:**

| Field | Value | Why |
|---|---|---|
| `techniques.json rules.follow.mult` | 1.0 | a shield's line is its own |
| `rules.follow.extra` | 0 | R1: no off-hand penalty |
| `rules.follow.wear` | 1 | the one wear rule |
| `items.json buckler.phys.strike` | `damage 8, hits_with durability, scales_with [endurance], reach 1` | the light-blade dealer gains about 10% (below) |
| `items.json riot_shield.phys.strike` | `damage 10`, the rest as the buckler | the heavier shield, paid for by −0.5 Movement |
| each shield's `when: hit` | `resource guard 1`, `limit {per: per_turn, n: 1}`, `if {with_this: true}` | F11 |
| `techniques.json shield_bash.numbers.mult` | 1.5 → **1.9** | the buckler's Bash stays 15 (8 × 1.9 = 15.2); the riot shield's is 19 |
| Afterword `phys.follow.mult` | 0.25 | section 8 |

**The yardstick** (`2026-11-balance-2.0.md:163-179`; the band is 85% to 115% of the Adamantile greatsword; melee's
ceiling is 165 all in, `data/rules.json:1593`, the dial `output.factors.melee` 1.35, `:2021`). Normal share, % of the
plain rifle: greatsword 147 / 157 / 150 / 157 (mean 152.75); Legion gladius 129 / 142 / 163 / 145 (mean 144.75, 94.8%
of the greatsword); katana 107%. A sword and shield today is the gladius alone: the shield adds no damage.

**The melee profile** (`rules.json:1874`): k 1.15385 × (1 + 0.05 × (the Attribute − 1)). At 7, 1.15385 × 1.30 = 1.50;
at 1, 1.154.

**Case A: the light-blade dealer with a buckler** (the measure's Dexterity twin: Dexterity 7, Agility 7, Durability 0,
Endurance 1).
- Main: the gladius (26, scales with Agility, `weapons.json:2542`), modifier +6. Take its hit chance as 75%.
- Follow: the buckler (8, scales with Endurance), Durability 0, so modifier −2: 8 points worse, 40 percentage points:
  35%.
- Follow / main per action = (0.35 × 8 × 1.154) / (0.75 × 26 × 1.50) = 3.23 / 29.25 = **0.110**.
- The gladius goes 144.75 → 160.7 = **105% of the greatsword**. In band, under the katana. Riot shield (10): 0.138,
  108%.

**Case B: the Bulwark with a buckler** (Durability 7 holding Guard, Endurance 7, Agility 1).
- Main: the gladius rolls with Durability (+6) while Guard is held; its damage scales with Agility 1 (1.154).
- Follow: the buckler rolls with Durability too (the same chance) and scales with Endurance 7 (1.50).
- Follow / main = (8 × 1.50) / (26 × 1.154) = 12 / 30.0 = **0.40**.
- The tank measures 77 / 55 / 78 / 124 (mean 83.5; `docs/design/balance-contract.md:59`). With 0.40 it is about
  108 / 77 / 109 / 174 (mean 117). That is below the melee ceiling (165) on the mean. L20 (174) is 105% of 165, inside the
  ±25% level tolerance (`rules.json` `tolerance.level`). Riot shield (10): 0.50, mean 125.
- Read: the follow is the tank's damage fix (Leon: "the tank can't hit shit"), and it is aimed where Leon asked. It is
  also the largest number in this draft. Question 3.

**Guard** (Reader 3's count). The Guard technique at Durability 4 with a shield gives 5, which fills a pool of 4 in one
AP. So the follow's +1 a turn mostly matters to a low-Durability shield user (a pool of 1 or 2: a free plate a turn).
It never funds Slam on its own (2 Guard): at most 1 a turn.

**Caveats.** Armour comes off each blow, so a small blow loses a larger share. An 8-point follow into Class 3 armour
lands less than 8/26 of a gladius blow, and the real gains are lower than the ratios above. Crits, the level scale and
Recoil (none for either) are the same on both sides. Measure before fixing:
`MELEE_MEASURE=1 npx vitest run test/balance/melee-measure.test.ts` with a `gladius+buckler` and `gladius+riot` cell
in both builds, and `tank-measure.ts` for case B. The goldens are re-recorded only on purpose.

## 8. Worked example: the legendary off-hand knife

**Afterword** (in-universe: a Legion quartermaster's last-issue knife, made for the hand that isn't holding the
sword; "the last word after the argument"). A weapons.json row. It is a weapon, so it has its own off-hand block (its
own attack at its full line, its techniques), and the follows block makes it ride the main hand:

```json
{
  "id": "afterword",
  "name": "Afterword",
  "category": "blade",
  "damage": 15, "damage_type": "physical", "range_tiles": 1,
  "ap_cost": { "attack": 2 }, "skill": "dexterity", "accuracy": 0,
  "hands": "1H", "durability": 160, "mastery_family": "light_blades",
  "rarity": "legendary", "price_credits": 2400, "provisional": true, "adjudication": "engine",
  "text": "In the off hand it follows: after each melee attack you make with your main hand, Afterword strikes the same target for ×{=phys.follow.mult} of its damage, with its own roll and no AP. A follow that lands opens the wound: Bleeding (Body save), once a turn. It is not a second weapon: it asks no more Dexterity in the off hand and never strikes with both hands.",
  "lore": "Issued last, to the ones who came back.",
  "phys": {
    "system": "melee", "profile": "melee",
    "props": ["light"],
    "hits_with": "dexterity", "scales_with": ["agility"],
    "follow": { "mult": 0.25 }
  },
  "effects": [
    { "op": "condition", "when": "hit", "condition": "bleeding", "target": "target",
      "if": { "with_this": true, "mode": ["follow"] },
      "limit": { "per": "per_turn", "n": 1 } }
  ]
}
```

- `phys.follow` is the whole flag. No code names `afterword`, and a hundredth follows knife is one more row.
- `mode: ["follow"]` matches because the follow strike is made with the technique row `follow` (`effects/triggers.ts:164`
  reads `ctx.tech`). So the Bleeding comes from a follow only, not from the knife's own off-hand attack.
- **Numbers.** Same hit chance as the gladius (both Dexterity), the same profile (both Agility). Follow / main =
  (15 × 0.25) / 26 = **0.144**, so the gladius goes 144.75 → 165.6 = **108.4% of the greatsword**, with Bleeding on
  top (measure it). At `mult` 0.30 it would be 111%; at the full line, +58% (why R1 needs `mult`).
- **What it costs:** no Defense, no Guard and no shield techniques. Compared with a buckler it trades the tank's tools
  for a sure hit with Dexterity.
- **Requirements:** a combat knife asks Dexterity as its skill (5c). In the off hand there is no +2 (F8; its block has
  no `second_weapon`).
- **Art:** a weapon icon in the monoline mode (`art/style-guide/weapon-icons.md`): a short reversed-grip blade with a
  quartermaster's stamp notch on the spine. One line in `art/briefs/ART-REQUESTS.md` when the row is added.

## 9. Screens and effects

Every mode keeps its left and right panels; the fight screen is the stated exception, as today.

- **The rows.** No new row. Each main-block melee row whose action would get a follow carries a second line from the
  engine's preview: "then Buckler · 41% · 8 · +1 Guard" (the Guard part only while the once-a-turn plate is unspent).
  The line comes from `previewTechnique`'s `attacks` entry marked `follow: true` (F-c), never worked out by the
  client. A row whose target is out of the follows item's reach says "then Buckler · out of reach".
- **The target card.** The `odds` slot shows both chances: "Cut 72% · then Buckler 41%". The hover chip `atkTag`
  shows the main one and a small "+1 follow" mark.
- **The Both block.** Its existence is the engine's (F-d). The client's own test (`techView.ts:158`) and its typed
  texts go (`techView.ts:162`, `:176`, `:179`); it reads the descriptor rows. Same slice: the paired attack gets the
  preview it never had (two lines: main −1, off −3), so the Both block and the follow read the same way.
- **The log.** Two lines, both the engine's: the main roll's own line, then "Buckler follows: 9 + 6 vs 12, hit, 8
  damage (+1 Guard)." A follow that is not made says nothing.
- **The effect** (`apps/web/src/game/fx/`, Guard 2.0 section 7's "Shield follows" row, made general). The follow's
  `melee` event carries `follow: true` and is chained after the main swing. A small module (`fx/follow.ts`, registered
  into `H` as `fx/guard.ts` is at `fx/play.ts:1410`) plays it: after the main swing, a second 4 px lunge from the token's
  off-hand side (mirrored from the main swing), 120 ms later. A shield draws its rim as a short arc swept across the
  target (100 ms); a blade draws the existing slash line, thinner. On a hit the target tilts 6 degrees. The +1 Guard
  plays through the existing `guard` event (`why: gain`: "+1 GUARD", one plate slides in). Paced by `dom.ts`; under
  Reduce motion there is no travel and the words show.
- **Sound.** The shield's rim reuses the soak clang at a lower volume; a blade follow reuses the slash. No new asset.
- **Icons.** None for the rule (it is not a technique on a pad). Afterword's weapon icon (section 8).

## 10. Tests that would prove it

Every one goes through the reducer with real actions (`apply(g, {type: 'combat/technique', id: 'cut', ...})`), never a
hand call to `strike` or the handler.

| # | Test | Asserts |
|---|---|---|
| 1 | gladius + buckler, Cut at an adjacent foe | two `attack_roll`s, the second `tech: 'follow'`; AP spent = Cut's; Momentum +1 at most (the main hit only); the buckler's durability −1, the gladius −1 |
| 2 | Flurry with a buckler | two main rolls, one follow |
| 3 | a Finisher with extra targets | one follow, at the named target |
| 4 | the main blow kills | no follow, no log line |
| 5 | pistol + buckler, a shot at an adjacent foe; a throw | no follow |
| 6 | a foe misses in melee: Riposte fires; Retort fires; an opportunity strike | no follow after any |
| 7 | Shield Bash | no follow; Bash's damage = 8 × 1.9 rounded; it hits with Durability |
| 8 | two follows that land in one turn | Guard +1 once; never above the pool |
| 9 | a Skirmisher with Pressure on it, a Cut and a follow that both land | Pressure shed once |
| 10 | a Chaplain with a buckler: the main misses, the follow lands | no Smite, no Judged |
| 11 | a Durability 7 tank holding Guard | the follow's preview has the "holding Guard" term |
| 12 | gladius + Afterword | no `paired` descriptor; `combat/paired` refused ("Afterword follows; it does not strike with both hands."); a follow at ×0.25; Bleeding once a turn; the knife's own off-hand attack gives no Bleeding |
| 13 | equip Afterword in the off hand with Dexterity at its requirement (the gear action) | accepted (no +2); an ordinary combat knife with the same Dexterity is refused by 5a |
| 14 | a shield in each hand; a shield in the main hand with a sabre in the off hand | the off shield follows; the second pair has a Both block (melee kind) |
| 15 | an enemy turn on a seed fixed before the change | the same moves (AI unchanged) |
| 16 | a paired attack with two swords | the off-hand sword now wears (F-b) |
| 17 | `boundary.test.ts`, the lints | `lint-item-ops` gains no bespoke op; baselines unchanged or smaller |

**Goldens:** the cost tables gain no line (a follow costs no AP: no new cost site). The damage golden gains the
buckler, riot-shield and Afterword follow rows (re-recorded on purpose). Shield Bash's row changes (its line and
mult).

**Truths that change in the client suites:**
- `apps/web/src/screens/combat-attack-areas.test.ts:71-80`, `:173`: a gladius + Afterword case with areas `main off
  other` (no `both`); gladius + buckler stays `main off other`.
- `apps/web/src/game/techView.test.ts`: the Both block now comes from the descriptor, not the client's system test.
- `apps/web/e2e/physical-pack.mjs:69-80`: the areas list is unchanged for sword + shield; one new truth: the Cut row's
  second line names the buckler and a percentage.
- a new `apps/web/src/game/fx/follow.test.ts` (as `guard.test.ts`): a real fight's fx list has the follow's `melee`
  event with `follow: true` after the main one, and its Guard event.

**Build order (each slice ships alone):** (1) F-b and F-d, the consolidation and the wear fix, no rule change; (2) N2
(if the either-hand lane has not built it), the shields' lines, Bash re-based; (3) N1, N3, N4, the follow, the
preview line, the fx; (4) Afterword. Before the release, the consolidation pass (rule 4) reads N1 to N4 against P9 and
P11.

## 11. Questions that are Leon's

1. **Per action or once a turn?** R1 says every main-hand melee action. The numbers above assume that, with a small
   shield line (8 / 10) and the Guard plate once a turn. The alternative is once a turn with a bigger line (about 16):
   it reads cleaner ("your first blow each turn brings the shield") but it is less like your reference. Recommended: per
   action.
2. **What does a shield hit with?** Today it strikes as the bare hand, with Raw Power. Recommended: Durability, growing
   with Endurance (Guard 2.0 item 16), so the shield is the tank's weapon and a Dexterity duelist's buckler is mostly
   Defense.
3. **The tank's damage.** With Durability-rolled follows the Bulwark gains about +40% (mean 83 → 117, still under the
   melee line). Is that the "tank can hit" you want, or should the buckler be 6 for the tank (+30%) and the duelist
   (+8%)?
4. **A follows weapon never pairs** (R2). Gladius + Afterword has no Both block. Recommended: yes, keep it a rider;
   whoever wants to pair holds an ordinary knife.
5. **Guns.** Guard 2.0 recommended a shield swing after any weapon attack at an adjacent foe (your "he swing his shield
   with his weapon too"). The lead's R1 says melee only. Recommended: melee only (a gun user already has a shield's
   Defense and Guard, and adjacent shooting provokes).
6. **Actions that name no unit** (a sweep, a tile technique). Recommended: no follow. The alternative is a follow at the
   first unit the main hand struck.
