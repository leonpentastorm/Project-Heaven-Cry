# Code verification of the owed list's "not built" claims (19 Nov 2026, against origin/main = 0.31.11)

Each claim was checked in engine code and data, not documents. This file WINS over BEFORE-ITEMS-2.0.md where they differ.

## The list was WRONG: already built (remove from owed work)
- Shield's second swing: BUILT. `physical/core.ts` `follow()`; shields carry prop `follows` and `mod_follow_guard` (damage x0.4, +1 Guard on a hit, once a turn); two shields double the gain (`two_shield_mult`). Test `follow-strike.test.ts`. (Leon confirmed by play.)
- Katana FOCUS_IDS: built from data (`character.ts`, `focus.door`).
- The 45 degree cover arc: built (`rules.json arc_deg`). Left: spec 4969(c), a pillar outside the arc counts nothing (a design call).
- A focus taken out of the off hand goes to the pack as `tool`: fixed (`packKindOf`).
- The two-glyph hook (item 586): built (`glyphs_per_tile`); its one holder is the shelved Stroke Gambler.
- Sigil 1.5 (rules 1.10: strokes, study, word mastery, inflections, marks, Junctions): built, tests `sigil15-*`.

## Partly built (owed: only the part named)
- Breaker wall slams and hurling: `displaced` hook, Throw Down into an occupant and Grenadier's Arm exist. Owed: the Breaker's Into the Wall (P13) and Hurl (P14).
- Enemies breaking under Pressure: Suppressed/Broken take AP, Pressed drops a held shot, Rout runs on a failed save. Owed: the AI acting on Broken ("must reach cover or drop Prone"); no flee or cower.
- Aim marks on a Bonded ally: engine read `aims_at: tied:<kind>` exists. Owed: a data row that uses it and the display.
- Enemy squad plan against reactions: enemies avoid held lanes (`held_risk`). Owed: bait / two-mover plan.
- Enemy versions of the doors: Sigil and Outburst casters, physical techniques per tier, Momentum and Pressure for all. Owed: enemy Guard, Shadow, Bonds, Figments, prayers.
- Enemy focus memory: this-round memory built. Owed: carry past the round (spec 4969(a)).
- "I'll narrate" in a room: human-mode code exists; picking it only shows "coming soon". Owed: the selection and the Narrator screen end to end.
- Delivered art with no place: `move-breath` IS wired. Owed: the 7 Tending passive pictures (no `tend-verb` alias), `icon-resource-credits/xp/devotion` and the 7 `icon-tone-*` (`uiMarkOf('resource'/'tone')` never called), `move-open-guard`, `move-sway`, `move-counter`, `camp-step-ready` (checklist has no `ready` key); `move-draw-fire` placeholder is not in assets.json.

## Truly not built
- Hallow (consecrated ground): nothing in engine or data.
- Bare fists in the glove family (P11).
- Case (Shadow): in `shadow.json` under `pending`.
- Smite's chip on the attack card (needs riders in the attack preview).
- Two Sanctuaries on one tile still stack (each halves; spec 1908).
- NULL on a Figment (`nullCatch` takes glyphs, zones, sigil walls only).
- A `per_stage` uses scope; a thrown Relic property; an fx event for "fight joined".
- Enemies moving for an angle on an unattacked character (spec 4969(b)).
- Open guard's -2 (any carried defensive modifier) shown in the fight.
- The healing brake per giver (`rules.json` brake still `deferred`).
- Stand Behind Me: an icon exists, no move in data.
- Simulator builds: knife-and-pistol; a sparing Chaplain.

## Balance numbers still provisional and unfitted
Two shields' doubled Guard (measured at rank I only), the Bulwark's pool by rank (ranks II and III), the follow strike's -2, Afterword, the feeds' 0.01, Drive's -2 and plate-back, the repair rate 10%; the rifle contract holds 4 guns plus greatsword and sabre (guns-measure covers all guns separately). Reflex: a measure tool exists (`defence-measure.ts reflexRow`), no fitted result.

## Not a fault / needs a look
- The Operative opening its first turn on ATTACK while seen: `firstTurnTab` falls back by design (Shadow's verbs need Hidden).
- Keeper portraits against names: ids and names are mapped one to one in `survival.json`; whether each face fits its name needs eyes (all are review-candidate art).

## Leon's rulings, 19 Nov evening
- Operative and Sigilist clearing 0 of 40 simulated seeds is the simulator's bot, not the class (Leon and a friend tested the Sigilist: about Outburst level). Fix the bot's policy; no class number changes because of it.
- Carry weight: nothing changes ("you carry them to go somewhere else, not as an item").
- Camp budget stays 300 for now.
- Ceilings are a relative measure of the effort a class puts in and the fun it gets back, not a hard line.
- Everything owed goes into 0.32, worked continuously, before Items 2.0 and art; 30% of the weekly usage is a target, not a cutting line; nothing is cut.
- Hosting off KV and the outside code review's work come after 0.32, before Items 2.0.
- All to-do files are unified into docs/ROADMAP.md "so this does not happen again".
