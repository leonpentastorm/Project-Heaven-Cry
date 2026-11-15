# The nine doors: a quality audit (15 Nov 2026, on wip/feature-0.29)

Leon asked for a quality check of all nine doors. He said Sigils, Outbursts, melee and guns are deep, and the newer doors are not. Nine auditors read one door each on origin/wip/feature-0.29. They read the code and did not play the game. This file settles their scores into one table, briefs the doors that no lane covers tonight, lists notes for the four lanes already working, and ends with a 2.0 shortlist.

Scores run 0 to 5 per column, where 5 matches the best door. Total is out of 25.

## 1. The settled table (worst first)

| # | Door (alpha skill) | Depth | Effects | Feedback | Onboarding | Growth | Total | Verdict |
|---|---|---|---|---|---|---|---|---|
| 1 | Shadow, Perception (`ingenuity`) | 2 | 1 | 2 | 0 | 2 | **7** | No visible way in: Hide is on the Utility tab, there is no Shadow tab below 3 points, and the Break and the meter make no effect at all. **In hand (Shadow 2.0 slice 1).** |
| 2 | Guard, Endurance (`durability`) | 2 | 2 | 2 | 1 | 1 | **8** | One Brace press, then a normal attack. Gaining and soaking Guard is silent, and the door's own explanation sits on a shield block most players never see. **In hand (Guard number fit and Guard 2.0 slice 1).** |
| 3 | Bonds and Tending, Insight (`empathy`) | 2 | 1 | 2 | 1 | 2 | **8** | Making a Bond plays nothing and the Mender does not act on screen. A solo player has no one to tend. **In hand (effects, Tug and Snap).** |
| 4 | Figments, Expression (`visualization`) | 3 | 3 | 3 | 1 | 3 | **13** | Summon, unmake and attack effects are now on the branch. Nothing in the fight tells you to press Picture, and at 1 to 2 points the only form is a Double that cannot attack. **In hand (orders and new forms).** |
| 5 | Prayer, Virtue (`faith`) | 3 | 4 | 3 | 1 | 3 | **14** | The patron presentation is rich, but nothing points to the FAITH tab. At Faith 1 to 2 a turn is one Whisper, and the Hymn wait cannot be seen. |
| 6 | Momentum chain, Strength (`raw_power`) | 3 | 4 | 3 | 2 | 3 | **15** | Each technique has its own animation. Spending or losing Momentum is silent and the token has no pips. Players never see the Opener, Strike, Finisher loop. |
| 7 | Pressure, Agility (`dexterity`) | 4 | 4 | 4 | 2 | 3 | **17** | Plain Shot works. The Pressed state that opens Takes is never named, and nothing teaches Pressure then Take. |
| 8 | Sigils, Intelligence (`brain_power`) | 5 | 4 | 4 | 2 | 4 | **19** | This is the deep door. The fight opens on Attack, the first damage takes two or more turns of drawing, and the caster's token never moves. |
| 9 | Outbursts, Determination (`will_power`) | 5 | 5 | 5 | 2 | 5 | **22** | This is the reference door. Its one weakness is that the fight opens on Attack and there is no one-line "how this works". |

### What I changed from the auditors' scores, and why

I re-read `apps/web/src/game/fx/physical.ts`, the tab choice in `apps/web/src/screens/combat.js:1531`, `COND_WORD` in `apps/web/src/game/fx/play.ts:1197` and `apps/web/src/game/tips.tsx`.

1. **Momentum effects 3 → 4.** The `momentum` and `pressure` handlers behave the same way. Each floats a word only when the value rises (`physWord`). Each is silent on a fall. Each has a technique-name float and a ring on a Finisher or Take. Melee also has a hand-built animation for every technique. Pressure was given 4 for effects, so Momentum gets 4 too. The real difference is feedback: Pressure pulses pips on the token and Momentum has no token pips, so feedback stays 3 for Momentum and 4 for Pressure.
2. **Outbursts onboarding 3 → 2.** It has the same facts as Sigils. The tab appears once you have designs or a focus. The fight opens on Attack or Move unless a heart is held (`combat.js:1531`). The loop is explained only on the tab's cards, and the fight has no one-line explainer. Sigils got 2, so Outbursts gets 2.
3. **Guard effects 1 → 2.** Guard has more bespoke effects than Shadow or Bonds: BRACED with a sound, the standing guard arc, Shrug It Off, Anchor, and a shake for Interpose. Its core resource is still silent, so it stays below Figments.
4. **Bonds feedback 3 → 2.** The auditor's own text says the door's work (the link, the share, the echo, the Ledger) shows nowhere except static lines and a bar. Shadow and Guard had the same facts and got 2.
5. I kept Faith onboarding at 1, below Sigils at 2. Recommended hands a Sigilist the Evoker, and the Sigil rows explain draw then Evoke. A Faith character gets a gun from Recommended, and nothing in the tab or the camp explains praying.
6. Two auditors got a fact wrong. `condWord` falls back to the upper-cased id (`play.ts:1198`). So if the engine emits a `cond` event, a Draw Fire target would float TAUNTED and a Stare target would float WATCHED, even though neither word is in the table. Whether those `cond` events are emitted is not verified. The lanes should check this before building a handler.

## 2. Notes for the four lanes in hand

These are the audit findings that the lanes' descriptions do not mention. The lead should pass them on.

**Guard (number fit; Guard 2.0 slice 1 with effects)**
1. The `guard` fx event (`packages/engine/src/physical/core.ts` guardFx, carrying now, was and max) is emitted on every change and has **no handler**, so it is dropped silently. Hooking this one event covers Brace, the technique, the soak and Interpose spend.
2. The soak ("Guard takes N of it", `guard.ts`) is in the log only, with no number on the token.
3. Reactive Plate's `plate_spent` is not an fx event, so it has nothing to hook. That needs a ruling: emit an existing fx kind rather than a new one.
4. Interpose: `techniqueFx.ts:107` has an entry, but line 174 excludes interpose events from it. The Bulwark's token does not move.
5. A rifle carrier sees no Guard block at all. The Guard pips and the explanation (`techView.ts:126`) live only on the shield block, so a Guard pip row is needed for every unit with a pool.
6. The Brace chip never says "+2 Guard", and the Durability skill card never names Guard.
7. Check whether Draw Fire emits a `cond` event. If it does, TAUNTED already floats through the fallback.
8. `focus_by_door` gives no shield, so a level-1 Durability character starts at 0 Guard with nothing to choose.

**Shadow (Shadow 2.0 slice 1, which must start with a findable Hide)**
1. The Hide refusal ("An enemy can see you: get out of sight first.") does not name the watcher or a tile to go to. Enemies see 12 or more tiles (`rules.json:341`), so on open generated maps Hide is refused on turn 1 almost every time. A findable Hide that is always refused is still a dead end. The slice needs a reachable unseen tile, or a refusal that shows one.
2. The Break has no event and no handler. The Shadow gain and loss are resource ops that only `say`. Neither has a pip pulse, a float or a sound.
3. Decoy (`last_seen`) has no event. Fade and Vault have no Shadow look.
4. `focus_by_door` has no Ingenuity row, so Recommended hands an Operative a loud rifle. No silent weapon is offered.
5. The 0.29 baseline has no Operative row, so level-1 viability is unmeasured. The only e2e (`e2e/shadow.mjs`) uses an Ingenuity 7 Operative in the Proving Ground.

**Figments (orders and new forms)**
1. No fight-screen explainer exists. `pictureNote` is only on the main-screen Magic tab (`figmentsTab.js`).
2. It is not verified whether the Figments tab shows when nothing is held. A Visualizer in the pack locks the door with only a STOWED word on the resource row.
3. The Stare's `watched` has no token mark. It may float WATCHED through the `condWord` fallback if a `cond` event is sent, which needs checking.
4. The Double's lure result ("is fooled" / "sees through") is a log line only, with no mark on the fooled enemy.
5. Upkeep (1 charge per Figment per turn), the 3+ held AP penalty and the Snap -1 AP happen silently at turn start.
6. Loading the Visualizer plays only the generic `core` beat.
7. Barbed, Volatile, Wall blocking and Pounce prone have no Figment look.
8. At Visualization 1 to 2 the only form is the Double, which cannot attack. The new forms should consider a level-1 attacker.
9. The baseline has no Rigger row.

**Bonds (effects; Tug and Snap)**
1. `tie()` and `untie()` in `kit.ts` emit no fx event, so making and breaking a Bond can only key off the `bonded` cond.
2. The Mender's own token never acts.
3. Share (20%) and echo (20% of the heal) land as plain `hurt` with no link back to the Bond. The echo waits silently until the target's turn.
4. The Ledger's gain and spend change only a bar, with no number.
5. Granting a Shield has no effect. The existing `shield` handler fires only when damage is absorbed.
6. Settle, Inspire, Take the Weight and Rally have no handler.
7. The Tend tab disappears without the Attuner in hand, with no reason shown.
8. Solo, Mend can target only yourself, so the first Bond is a gamble on an enemy's Heart save.
9. The baseline has no Mender row. `packages/engine/test/balance/tending-measure.ts` exists but was not run.

## 3. Build briefs (doors not in hand)

Every brief carries the standing rules:

- **No new engine primitive.** A builder adds no trigger, predicate, op, hook, resource, stat, cost site or exported primitive. If one seems needed, list it under "Needs a new primitive" and hand back.
- **Content is data.** Text goes in `data/`, with numbers as `{=placeholders}`.
- **One copy of every rule.**
- **Tests go through the real path.** A test drives the reducer or the real fx mapping, never a hand call to an inner function.
- **Lint baselines only shrink.**
- **Every mode keeps its left and right panels.** The fight screen is excepted, but this work must not remove any panel.
- **Run `npm run check` before handing back.**
- Do not touch `packages/engine/src` rules, `data/survival.json` numbers, or the golden tables.

The shared onboarding piece is the same in all five briefs:

1. **A door line in data.** Put a `door_line` text on the door's alpha skill in `data/skills.json`, documented in `data/CONVENTIONS.md`. The tab header and the tip both read it.
2. **A first-fight tip.** Add one entry per door to `TIPS` in `apps/web/src/game/tips.tsx`. Its `when` is: on the combat screen, it is my turn, and my character has the door. Its text is the `door_line`. It shows once per browser.
3. **The tab choice.** On a character's **first turn of a fight**, `combat.js:1531` opens the door's tab when that door is the character's top door skill and it has a usable first action. It falls back to the current rule otherwise. `tabMem` still wins after the first turn.

The first two parts are one shared change. **The raw_power brief builds them**, and the other four add only their own entries.

### raw_power (Momentum chain)

**Onboarding**
- Build the shared `door_line` field, its validator entry if the validator needs one, and the TIPS hook.
- Momentum line: "Plain hits build Momentum. Strikes and Openers spend 1. A Finisher needs 2 and cashes it all. Walking and being hit drain it."
- Move `MOMENTUM_HINT` (`packages/engine/src/physical/core.ts:990`) into `data/techniques.json` `rules.momentum`, so there is one copy of the text, and show it as the melee weapon block's header line (`techView.ts:144`).
- Always list the ready Finisher and Strike chips, greyed, with `chip.why` (for example "Needs 2 Momentum, you have 1"). `chipOf` already carries `ok` and `why`.

**Effects** (`fx/physical.ts`, the momentum handler)
- On a fall: the token gives a small sag. "−n MOMENTUM" floats in muted ink, with a soft tick sound.
- On reaching 2: the pips flash, "FINISHER READY" floats once per chain, and a short metal ring plays.
- All of it is paced by `battlePace` and turned off under Reduce motion.

**Feedback**
- Momentum pips on the token, the way `data-pressure-pips` works, drawn through the existing tile redraw in `apps/web/src/templates/combat.template.html`.
- A log line on a loss ("loses 2 Momentum walking"). The event already carries `was` and `now`.

**Tests and frames**
- `physWord` and `physBeat` cases for a fall and for reaching 2, run through `physHandlers`.
- A techView test that the Finisher chip is listed with its `why` at Momentum 1.
- A tips test for the `when`.
- Frames to capture: walking two tiles, a Finisher-ready flash, the token pips.

### dexterity (Pressure)

**Onboarding**
- Pressure line: "Hits build Pressure on the target. At 2 it is Pressed, and you can Take."
- Use it as the ranged `meterHint`, which is empty today (`techView.ts:~147`).
- Rewrite the Dexterity summary and rows in `data/skills.json` (near line 974) so they name ranged techniques and Pressure, with placeholders for every number.
- When the target is Pressed, show "N Takes ready" on the Techniques row, built from the existing `needs.pressed` data (`needsText`).

**Effects** (`fx/physical.ts`)
- Add `pressed` to the `physWord` pressure test, line 35. `STATE_WORD` already has it.
- On a rise: the shooter's token is already recoiling. The target's pips flash and "+1 PRESSURE" floats in small ink, then "PRESSED" once per unit, in HP ink, held for 220 ms.
- On a fall: the pips pulse and "−n" floats in muted ink.
- Fire Discipline and Speed Loader float their AP saving ("−1 AP") on the actor, but only if an existing event carries it. If none does, list it as a needed primitive and do not build it.

**Feedback**
- The You card already lists Pressure.
- Add the state word under the pips on a Pressed target, using the existing hover text, made visible.

**Tests and frames**
- `physWord` and `physBeat` for pressed and for a fall.
- A techView `meterHint` test for a ranged block.
- `npm run check` for the skills text-number guard.
- Frames to capture: the first Pressed, a Take landing, a cover fall.

### faith (prayer)

**Onboarding**
- Prayer line: "Pray to your patron. A Whisper costs 1 AP, once a turn. Hymns open at Faith 3 and Devotion."
- Show it at the top of the FAITH tab (`screens/faithCombat.js` `faithHeadVals`).
- On the first turn, open the FAITH tab for a character whose top door is Faith.
- Add the tip.
- The Whisper buttons stay listed when refused, with their `why` ("One Whisper a turn.").

**Effects** (`fx/faith.ts` prayer handler)
- The praying token rises and glows in Virtue ink before the icon rises.
- A thread of light travels to the target.
- The outcome floats on the target ("+2 ROLL", "+34 SHIELD") from the fields the prayer event already carries. If the event lacks them, read them from the following heal or shield event. Add no field.
- A Hymn ring takes the patron's accent (it already does).

**Feedback**
- Show the Hymn wait as a "Hymn in N" meter in the tab header and the left-panel faith row, from `hymnWait` and `cooledAt`.
- Show a used-this-turn mark on the Whisper slot.

**Tests and frames**
- A `faithView` test for the wait field.
- A `faith.test.ts` case for the token rise and the outcome float through the fx table.
- Frames to capture: a Whisper on an ally, a Hymn, the wait meter.
- Also list, without building: whether every FAITH_FX kind has a handler, by grepping the table.

### brain_power (Sigils)

**Onboarding**
- Sigil line: "Draw words on your own tile in a straight row of 2 to 4, then Evoke from an end or the side."
- Show it as the Sigils tab header.
- On the first turn, open the Sigils tab when the character holds an Evoker and has no Line yet.
- Add the tip.
- Without an Evoker, the tab still shows one row, "Needs an Evoker in hand: draw it from the pack (1 AP)". Use the existing refusal text, `character.ts:1031`.

**Effects** (`fx/play.ts`, the `draw` and `evoke` handlers)
- The caster leans in before the stroke (the lunge helper, short).
- On Evoke, the caster recoils as the pattern collapses.
- Find the handler for `glyph_cost`, or list it if missing.

**Feedback**
- Charge and Flux as a small chip on the token, from the existing resource rows (`game/resources.ts`).

**Tests and frames**
- A combat tab-choice unit test.
- An fx test that the lunge is called before the stroke.
- Frames to capture: a first draw, an Evoke from the end.

### will_power (Outbursts)

**Onboarding**
- Outburst line: "Begin a design, Pump it to stage 4, then Release. Strain is the cost, and MP pays."
- Show it as the Outbursts tab header.
- On the first turn, open the Outbursts tab when Will Power is the top door skill.
- Add the tip.
- When there is no Emanator, the design card shows "No Emanator: +2 Strain, paid from the air" (`heartView.ts` `costText`).
- The action-bar Outburst button (`commands.ts:209`) shows the held stage and the MP.

**Effects**
- No gaps were found. Only check that the `miss` event from `classes/soul.ts` has a handler.

**Tests and frames**
- A `heartView` costText test.
- The tab-choice test.
- Frames to capture: a first turn, a no-Emanator card.

## 4. For Leon: what each door's 2.0 could be

**Shadow**
- The map needs a real fog layer: vision cones, light and dark tiles, and noise from shots, so that hiding is a place you reach and not a refusal.
- Choosable verbs per point step instead of a fixed table, and a Break with a kill-cam beat.

**Guard**
- Guard becomes a stance game. Pick a stance each turn (hold, cover an ally, counter), and each one spends Guard differently.
- Give Durability its own technique list the way melee has, so a rifle carrier has choices too.

**Bonds**
- Bonds as a web you shape: each Bond picks a kind (share, echo, tug), visible threads that strain and snap, and a solo use against enemies (Tug and Snap are the start).
- Discovered heart-links, the way feelings are.

**Figments**
- Orders and new forms are in progress. Next could be designs that evolve with use, the way word practice works for Sigils.
- A level-1 attacking form.
- Figments that remember fights.

**Prayer**
- Patrons that answer differently by what you did this fight, with live Whisper variants, chained Hymns and a visible patron mood.
- Turn the Devotion slow-burn into choices: vows picked at the round-1 card that change which prayers are open.

**Momentum**
- Weapon stances that change what Momentum does (a reach stance, a grapple stance).
- Finishers chosen from a combo tree that grows with drill, so the chain is visible as a path.

**Pressure**
- Fire-team play: shared Pressure across squadmates, suppression zones drawn on the map.
- Takes that branch by state (Pinned, Broken), with the Skirmisher's class moves turned into active choices instead of passives.

**Sigils**
- Mostly level-1 viability: a starter Line that can be drawn in one turn, and core economy (cores run out in about 3.5 fights).
- Then faction Evokers as the advanced classes return.

**Outbursts**
- Nothing urgent. Faction Emanators and the second-school designs when the advanced classes return.
