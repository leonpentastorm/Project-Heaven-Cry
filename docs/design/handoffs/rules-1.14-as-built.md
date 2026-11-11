# Rules 1.14 as built (11 Nov 2026): the choices made where the spec was silent

Three builds, each reviewed by a second reader who tried to break it. Every line below is a choice the spec did not settle; each stands until Leon changes it. Numbers here are provisional.

## Overdraw, Heart Overload, Resonance

**Choices:**

- PROVISIONAL, shape of the Heart Overload offer: the Release arms it and the free Begin is a switch on Begin that is ON by default while armed. Nothing begins by itself; the player still presses Begin and can switch it off. Reason: the screen builds design cards without the chosen switches, so an off-by-default switch would leave Begin disabled at under 2 AP.
- PROVISIONAL, blood for mana is also on by default, and only while the free Begin is armed and mana is short. The card and the switch show the HP cost before the click, and it can be switched off (the Begin is then refused for mana). Leon may prefer an explicit opt-in; that needs `combat.js` to pass the chosen switches to `designCards`.
- PROVISIONAL, blood pays the whole mana cost at 1 HP a point, not only the shortfall. The engine's existing rule still refuses a payment that would drop you.
- A design that heals or shields is never offered blood (the free Begin is refused for mana), since it could do nothing. Other healing from a blood-paid Release, such as Love on a hostile design, comes to 0.
- "Right after" is read as: the offer lasts until the character's next action. Plain speech (`combat/say`) does not end it; an attempt (`combat/attempt`) does.
- The offer needs your own Release on your own turn. A Heart Overwatch reaction Release and a wild release do not arm it. A snap cast releases at stage 0, so it never arms it, and the free Begin is never a snap cast.
- The turn's use is spent when the free Begin is made, not when it is offered.
- PROVISIONAL, Resonance steps are not consumed by a Release: Releases go +0%, +10%, +20%, +20% (tier II up to +30%).
- PROVISIONAL, Resonance multiplies the whole release multiplier, shared-rule bonus included: (stage + shared) × 1.1. Damage still rounds down as before.
- PROVISIONAL, a wild release neither uses nor builds Resonance (kept from the old perk); a Heart Overwatch Release does both.
- PROVISIONAL, for Resonance II the Twinbound twin is not "an ally" (it follows "you and the twin don't resonate"). "Can see" is the engine's `unitSees` on the ally's tile.
- "A turn in which you held" counts holding at the turn's start, a Begin during the turn, or holding at its end.
- Overdraw's free first use has its own per-fight counter. A save loaded mid-fight that had already overdrawn gets one Strain-free Overdraw.
- Data effects: `heart_overload` keeps the `alt_cost` op with rate 1 on both tiers and its uses become `per_turn`; `resonance` becomes `stat_mod` `release_mult_pct` 10 with limit 20 / 30; Overdraw's `grant_action` uses become `per_turn`. Both perks' handlers claim everything, so the engine does not run these generically.
- `heart_overload` now has no default action button; it shows on the Perks tab as a read-only row used from Begin, like The Twin Pays.
- The stage meter's next-Pump mark now sits on the stage the Pump will reach (stage + 2 with Overdraw on).
- magic.ts: added one small preview field, `relAll`, on the `outburst_cost` hook and `OutburstPreview`, so a plan with Pumps carries Resonance while Heart Surge's snap-only multiplier stays at stage 0. This is a hook addition only.
- Kept the builder's provisional readings as they are: the free Begin and blood are switches that are ON by default while armed; blood pays the whole mana cost at 1 HP a point, not only the shortfall; a design that heals or shields is never offered blood; a wild release neither uses nor builds Resonance; the Twinbound twin is not an ally for tier II.
- Left the blood-can't-mend mechanism (it matches the log length at the Release) as it was before this build. I could not make it fail: Resonance speaks before Heart Overload at a Release, and a kill before the healing did not break it.
- Left three now-unused imports in d.ts (`RESONANCE_BONUS`, `resonates`, `resonanceExtra`): they sit in the shared import region outside the two blocks, and tsc accepts them.

**Not done, or left open:**

- Revert Pump after an Overdraw gives back both stages and the AP but not the turn's Overdraw use, the fight's Strain-free one, or the 1 Strain (it lands after the Pump, outside the Pump's record). Not an exploit, but it costs the player. Fixing it needs a change in `revertPump` in magic.ts, outside the three named hooks; needs a decision.
- A blood-paid design with the Fuse module: the Release's rule fires when the Fuse is set, so healing when the Fuse later goes off (for example Love poured in) is not blocked. The same gap existed before this build. Not fixed.
- An AI-run unit holding Heart Overload gets the free Begin and pays blood by default (the switches default on). Enemies do not normally hold perks; not changed.
- On the area map (no fight) Overdraw is once a story round, and its Strain-free first use is spent once and never comes back, because 'first of a fight' has no fight to reset on. The spec is silent; left as is.
- An attempt (`combat/attempt`, 1 AP) ends the Heart Overload offer, since it is an action; plain speech does not. If Leon wants an attempt's words to keep the offer, that is a one-line change.
- The HEART panel's `overdraw` line and the design card's `again` line are computed in heartView.ts but `combat.js` (not my file) does not render them. What the player sees today is the card's cost line ("Heart Overload: Begin again 0 AP"), the Pump and Release button titles, the Begin switches, and the Resonance note beside the multiplier.

## Speaking and attempting in a fight

**Choices:**

- PROVISIONAL numbers, all from the spec (items 1008/1009) and kept as named constants in fighttalk.ts: ATTEMPT_AP = 1, FIGHT_COND_ROUNDS = 1, the four-condition list.
- PROVISIONAL (mine): FIGHT_TIMEOUT_MS = 20000 (the task's 'about 20 s'), FIGHT_MAX_TOKENS = 500 for the reply, the Narrator's lines cut at 240 characters each, the last 6 spoken lines kept for the Narrator.
- Plain speech does not trigger its own Narrator call. The spec says the Narrator 'may answer' speech; the simplest reading is that it reaches the Narrator in the next attempt's prompt and in the after-fight report. A call on every free Say would cost money on every line.
- 'No Narrator connected': the game state had no such fact, so I added `g.narrator.offline` and a host-only `narrator/ready {ready}` action. The host's browser sends it only during a fight, when its key or model setup changes. A human Narrator counts as connected while the host is online. The Proving Ground refuses attempts ('There is no Narrator in the Proving Ground').
- A host skip also frees the turn's attempt (no answer came, so the player may try again). A perk 'no' gives back the use and the AP but the turn's attempt stays used, because the Narrator did answer.
- Hesitates uses the existing `stunnedNext` field (−1 AP on the next turn), not a new condition.
- Weapon lowered uses the existing 'lowered' condition for 1 round. Under the existing rules an enemy can raise its weapon for 1 AP, so in practice it costs the enemy 1 AP or an attack.
- Conditions the Narrator rules are applied without a save (a check comes first when in doubt). Items that grant immunity can still cancel them through the existing hook.
- A direct surrender also respects the existing 'never surrenders' rule (boss, machine/robot/turret/drone, no_surrender tag). The existing once-per-fight surrender-save limit is not applied.
- A check's TN must be on the ladder (8/12/16/20) and the skill must exist; otherwise the check is dropped, not rounded. A natural 20 succeeds and a natural 1 fails, as in story checks. No Echo reroll on a fight check.
- A check's onSuccess may only be a condition or a surrender. Two known effects in one answer count as invalid (dropped); unknown fields next to one valid effect are ignored.
- A target may be given by unit id, or by name when exactly one enemy carries it.
- A perk attempt answered without a `perk` effect (lines only, or a check) keeps the use spent. A `perk` effect on a plain attempt is dropped.
- The fight call uses the host's chosen model at low effort, with no retries, and does not switch to a cheaper model. A full request measured under 9,000 characters in the tests; the reply is capped at 500 tokens.
- The answer schema sent to the model is flat (`kind` plus fields) because models fill that more reliably than a one-of; `parseFightAnswer` reshapes it and the engine validates again.
- The scripted Narrator picks its answer from the words: 'refuse' says no to a perk; 'taunt' / 'lower' / 'hesitat' give that condition; 'surrender' asks a check that earns a surrender; 'just talk' gives lines only; anything else is a TN 12 check that earns Shaken.
- Their Own Idea's words are hidden from other players in the pending ruling (shown to the speaker and the host only), and the Narrator-facing instruction of any perk is host-only.
- Answered attempts are written to the fight notes as 'answered in the fight' with what the engine did, plus a 'Follow through' note for perks, so the after-fight turn can pin a fact without ruling twice.
- The four perks' in-fight card text gained one sentence: 'In a fight it is your attempt for the turn: the Narrator answers at once, and a no gives the use back.'
- The fight-talk fields live on the Combat object through a local type in fighttalk.ts, so combat.ts (not my file) is unchanged; game.ts re-exports the module.
- Guests are no longer sent combat.notes at all, not just the private lines. The notes are the Narrator's after-fight material and no client screen reads them.
- An answer arriving on a finished fight is refused rather than applied without its effect; the store then refunds through the host's skip.
- A dead or Downed speaker drops a check, condition or surrender, but a perk's yes / no (and its refund) still applies.
- hostRoom clears the 'already asked' marker, so a reopened room asks the Narrator again for a ruling that was waiting. An old in-flight answer for the same id is harmless: the second apply is refused and nothing is refunded twice.
- Kept the builder's provisional numbers unchanged: ATTEMPT_AP 1, one-round conditions, the four-condition list, the 20 s timeout, the 500-token reply cap, 240-character lines, the last 6 spoken lines kept.
- Kept the builder's reading that a boss, machine or no_surrender enemy never surrenders, even after a successful check. This is the existing surrender rule, not something 1.14 says.

**Not done, or left open:**

- Nothing was run in a browser, and no build or server was started, as instructed.
- Did not regenerate docs/design/handoffs/perk-audit.md; its finding 1 is now out of date.
- Did not remove apps/web/src/game/zz-dump.test.ts (another agent's scratch file; it fails the web suite).
- Did not touch the Company Man change in packages/engine/src/perks/h.ts (outside this build's perks; reported only).
- No Narrator call for plain speech and no way for a human Narrator to answer a plain Say: left as the builder's reading of 'may answer'.
- The human Narrator room flow can't be tested end to end: 'I'll narrate' is still not selectable in the room.

## The perk card's three shelves

**Choices:**

- PROVISIONAL number: LOG_LOOKBACK = 30. When the screen hasn't seen the unit's last turn start (a fight joined or reloaded part-way), or no turn mark is passed, the passive's 'Last:' line reads only the last 30 log lines. The spec gives no number; it needs listing in section 14 (I did not edit the spec).
- 'Since the unit's last turn': the fight log has no turn marks, so the screen remembers the log position where each unit's turns began (turnMark, kept in memory in the browser). On a unit's turn, 'Last:' reads from the start of its previous turn.
- A log line counts as the perk's when it names the perk as a whole word and either names this unit or names no other unit that holds the same item.
- Line priority on ALWAYS ON: a spent use ('Used this fight') beats the log line (the full card then shows both); then 'Last:'; then 'Ready'; then 'Its button appears…'; then 'Waiting:'.
- A fifth line, 'Active all fight', for a standing bonus with no trigger in its text and no moment in the rules. The spec lists four kinds; none of them is honest for a flat bonus.
- 'Waiting:' takes the trigger from the first sentence of the card's own text (when, whenever, the first time, each time, after, while, as long as). 'if' and later sentences are ignored because they picked up fine print (what ends it). With no trigger in the text, it uses the moment the rules listen for, in plain words.
- 'Its button appears when …' uses the card's own 'when' clause where it has one (Catch), otherwise 'when it can be used'.
- A hidden button is only promised when it is hidden for its moment. A Tier I holder's button that would show at Tier II is not promised (Wall Run I, Lab Coat I).
- The shelf is read at the tier held; the audit read the top tier.
- Cultured, Crowd Pleaser and Worldline Fracture are off the fight card although the audit table has them on ALWAYS ON; they only act on story checks or Narrator rulings.
- CORE_WIRED = ['breaching_strike', 'many_hands']: a two-item list for what the registry can't see, guarded by a test that scans the engine source outside the lane files.
- RIDES rows keep the uses label ('on a Pump · 1/1 turn') although the spec only asks for where the switch is; it was shown before and Overdraw is once a turn.
- Read-only rows are list items (ul role=list, li) holding a flat disclosure control (aria-expanded, no aria-pressed, not the action-button class) so keyboard and screen-reader users can open a card. They are disabled off-turn like the rest of the panel.
- The picked row shows its whole card inside the row as well as in the selection box, because the selection box clamps to 3 lines and I did not touch the footer.
- Wall Run strike: the card shows the weapon's attack AP only; the run is priced by the move rules as it is walked, and the text says so. The action hands the shown AP back when it runs so the attack and moves pay their own, and the total spent is unchanged.
- Call RTC extraction: shows current AP in a fight and 0 in the story and on the map, so nothing changes outside a fight.
- Colours are existing palette only: Ready in success green, Used muted, 'Last:' white, the rest text grey; always with the word.
- The tab's aria-label keeps 'N actions, M to read'.
- Removed the builder's 'Waiting: <the rules' moment>' fallback: it guessed who and what from internal names and was often false. A card with no trigger in its own text now says 'Active all fight'. About 60 rows changed from a wrong 'Waiting' to this.
- 'Active all fight' and 'Works while … / Works when a fight starts' are a fifth kind of line beyond the spec's four (ready, used, waiting, last). I kept the builder's justification: none of the four is honest for a standing bonus.
- Last Wall and Into the Dark are read through a boolean 'used' on the unit's own fight state for that item. It is a naming convention, not a contract; the source-reading test fails if a new 'Ready' passive counts some other way.
- PRIVATE_COUNT = ['skill:composure.5']: a one-item list for a limited passive whose count the card can't read. It says the data's limit ('Once a fight') instead of a state.
- Which counters mark a row 'Used': the item's own counter in the window its data gives it, its fight actions' counters, and any '#part' counter inside a fight (turn, round, fight). Per-target counters and story-length part counters are ignored. For a trait with several parts, 'Used this turn' can mean one part is spent.
- Enemy units get no RIDES or ALWAYS ON rows (Analyze is how the squad learns about an enemy). I left their perk buttons showing locked on their turn, as before this build.
- A list inside a trigger is detected by words (a comma, then a part with 'or'/'and' that doesn't open with 'you', 'your', 'the'…, then another comma). Only Breaching Strike needs it today.
- The read-only rows stay a disclosure button inside a list item (the builder's choice). The task says 'not buttons'; I read that as 'not action buttons with Confirm', since a row must be reachable by keyboard to open its card.
- PROVISIONAL number unchanged from the builder: LOG_LOOKBACK = 30 lines when the screen hasn't seen the unit's last turn start. It still needs listing in spec section 14; the spec is not one of my files.

**Not done, or left open:**

- Used to the Pain keeps saying 'Waiting: the first time you are hit…' after its first hit when that hit was too big to arm it: the perk records this privately and writes no log line, so the card has nothing to read. Fixing it needs a change in the perk file, which is outside my files.
- Old Tongue I, Wanted, Ace Pilot, Every Lie Is a Door and a few others sit on ALWAYS ON as 'Active all fight' though little or nothing of them matters in a fight. The registry sees a fight listener and can't tell it is bookkeeping. Moving them off needs a per-item decision (spec item 1013 says the shelf reading can move).
- 'Its button appears when it can be used' is vague for nine items (Shadow Step, Jury-Rig, Rite in the Field, Case Closed, Twin Discipline, Old School, Drone Handler, both Oil traits). Only Catch names its moment, because only its card text starts with 'When'. Saying more needs each action to state its own condition in the perk files.
- Heart Overload's row says its switches 'show under' Begin; they only show right after a Release at stage 2 or higher. The card text below says so, but the first sentence alone overpromises.
- Trick Shot, Heart Overload and Clean Hands are once a turn but their RIDES rows show no count: the row only shows a count where the data makes the item an action (Overdraw, The Twin Pays).
- Turn marks are kept per unit id in browser memory. A new fight whose first-seen log is longer than the last fight's keeps the old marks until that unit's next turn, so 'Last:' may read from the wrong place for one turn. The fight has no id to key on.
- Wall Run strike's card shows the plain attack's AP; if another perk makes that attack cheaper, the card shows more than it takes. Not checked against every discount.
- A Wall Run strike refused after an Overwatch shot hit the runner rolls that shot back too. This is how the action worked before this build; I did not change it.
- The spec's first shelf sentence says 'perks, traits and class moves'; class moves stay on the CLASS tab as the task instructs. The spec and the build differ on that wording.
- docs/design/handoffs/perk-audit.md still lists findings 2 and 3 as open; it is tool-written and I did not regenerate it.
- Nothing was verified in a browser, and no e2e script was run (the lead owns the build and the port).

