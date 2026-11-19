# 0.32: the skill, perk, fork and class system, per attribute (the lead, 19 Nov 2026)

Nine sheets, one per attribute, are in `2026-11-19-attribute-drafts/` (opus drafts written to Leon's rulings of
18 Nov; the lead read all nine). **This file is the ruling layer over them**: where a sheet and this file disagree,
this file wins. Lanes 4 and 5 build from a sheet plus this file. Status: **approved by Leon, 19 Nov** (section 3: points 1 to 4 and 6 to 10 as recommended; point 5 rejected and
redesigned in section 5; Rite in the Field counts your own kills); sections 1 and 2 are the lead's calls (no answer means yes).

## 1. What every sheet does (the shape, as ruled)

- **Alpha:** 1 door · 2 small verb · 3 perk step · 4 fork one · 5 big verb · 6 perk step · 7 perk step · 8 fork two
  · 9 perk step · 10 Mastered. The alpha's two perks of two tiers fill its four steps. Everything else the alpha
  gave moves to its beta, its gamma or its class, or is cut (each sheet's SURPLUS table).
- **Beta and gamma:** the per-point gain on every level; four perks of two tiers; perk steps at 3 / 5 / 7 / 9 (keep
  four of eight tiers); Mastered at 10. The named passives that were free at 3 and 5 are now two of the four perks.
- **All 36 fork options** are buildable: 20 built today, 9 from existing pieces, 7 waiting only on the four approved
  pieces (Strain and Flux as resource rows, `at: limit`, the target-aware price, `seen_range`). Eleven options
  were replaced because their old rule needed a piece that is not approved.
- **Classes:** 54 moves read; 44 kept, 10 replaced or merged because the ladder already gave them.
- **Counts:** every skill shows something on all ten levels; no level holds more than two things.

## 2. Cross-sheet rulings (the lead's; they settle what the sheets left open or disagreed on)

1. **The Call's strength steps move from 1 / 3 / 7 to 1 / 4 / 8 for all nine Calls** (all nine sheets asked). The
   Expression sheet's Rally table (steps at 3 and 7) is read as 4 and 8.
2. **The Call's price is one table in `calls.json`** (3 AP; 2 from 5 points; 1 from 9; once a turn; at 10 the
   reaction may pay and one more Call that turn costs 1 AP). The old free first Call and the 0-AP reaction at 9 go.
3. **"Paid with your reaction" at 10:** on your own turn, for any Call (the reaction is spent in place of the AP).
   Off your turn it works only where the reaction Call works today (helping Calls). No new reaction cue is built.
4. **Rally and Brief are re-stepped stronger** (their sheets' tables, PROVISIONAL): at 3 AP their old first step
   would cost more than it gives. The other seven Calls keep their strengths and are measured.
5. **Old saves and the free passives that became perks:** one rule for all nine attributes. On first load, each
   beta and gamma with 3 or more points gets a free re-pick of its perk steps, with the mapped old perks and the
   old passives preselected. No passive is grandfathered above the step count. Removed perks map as each sheet's
   MIGRATION says. Alpha steps: a save keeps every step it holds; a new one is owed only when the 3 / 6 / 7 / 9
   schedule owes more than it holds.
6. **Rite in the Field is built as Leon worded it** (every 5 kills, 3 at tier II: the next Crystallise costs 0 AP
   and takes nothing from the air). **Your own kills count** (Leon, 19 Nov; counting the squad's would make it
   7 and 5, not chosen). The builder first checks whether Crystallise's draw on
   the air goes through the price; if it does, it is a `cost_mod`; if not, it hands back and the core goes straight
   to the pack until the lead rules.
7. **One owner per effect across sheets:** "Analyze costs 0 AP once a fight" is Acuity's Quick Read II only;
   Rumination's Index II becomes "+2 on your next Brain save after an Index answer" (PROVISIONAL). Vault is
   Athletics' (Wall Run I); Shadow's Vault is cut. Lore Master's Ward is shown as "Warding Word".
8. **Mastered perks that are Narrator-only get an engine half** so a Survival character gets something at 10.
   0.32 builds the two the Intelligence sheet wrote; the rest are listed for the next pass.
9. **Passives that never ran** (the Virtue sheet's finding: Answered Prayer, Righteous, Five Stars; the Insight
   sheet's: Mercy, Veiled Insult, Feel Their Pain, the carry half of Nobody Left Behind; Opening Argument) are
   rebuilt as their sheets say or cut. Lane 4 greps every remaining unlock for an effect with no reader and lists it.
10. **Every new number in the sheets is PROVISIONAL** and goes to spec section 14. Measures before 0.32 ships:
    the nine doors' stage-1 clears solo and in a squad of four, before and after; the Outburst steady and peak; the
    Figment ceiling; the Breaker's blade line; Shadow's window.

## 3. For Leon to judge (the lead's recommendation first; each is reversible)

1. **Healing and support verbs leave Empathy for Camaraderie's perks** (Settle, Soothe, Raise, Tug, Guide; Touch
   is cut, Triage is the Mender's). A Mender who buys no Camaraderie keeps Bond, Mend, Snap and Shield only.
   *Lead: yes. It is the rule "the beta keeps you and yours alive", and it is what makes Camaraderie worth a point.*
2. **Machine sabotage becomes the Operative's only** (Pick, Disable, Rig, Hijack leave the Ingenuity ladder).
   *Lead: yes; the ladder keeps every Shadow verb, and Sabotage stops being a copy of it.*
3. **Second Wind becomes a Pain Threshold perk** (the tank's only self-heal is no longer free at Durability 5);
   Last Plate is cut (the fourth "survive at 0" in one attribute). *Lead: yes, and measure the solo Bulwark; if it
   drops, Second Wind becomes the Bulwark's rank II move.*
4. **Rolling Start loses its free Charge** (keeps the 2-tile run and +1 Momentum on a Charge hit).
   *Lead: yes; it ends the "Finisher, free Charge, Finisher" loop every turn.*
5. **REJECTED by Leon (19 Nov): Visualization's forks as shape unlocks.** "Having its fork be just the shape
   unlock is poor compared to other forks. Devise another system for unlocks: all shapes should be unlockable even
   at Visualization 1; the fork just gives a permanent upgrade to these shapes that is worth choosing one or
   another." Replaced by section 5 below; the Expression sheet's sections 2 and 3 are void.
6. **Speed Load and Quick Draw leave Dexterity for a Reaction Speed perk**; Flush Out becomes one 2 AP verb at
   Dexterity 5 for every Dexterity weapon, soldiers and below only. *Lead: yes.*
7. **Faith 2 gets a verb, Name the Sinner** (a Whisper: a foe is Judged 2 rounds, your patron's blows +20% on it);
   Answered Prayer is cut (it never ran). *Lead: yes.*
8. **Empathy's Mastered becomes "Threads That Hold"** (Tending through a Bond x1.5, Bonds hold while you are
   Downed); Mercy and Open Hand move to Insinuation as one perk. *Lead: yes.*
9. **Removed perks** (each mapped to a replacement at the same tier): Used to the Pain, Scar Tissue, Iron Stomach,
   You Get Used to It, Old Tongue, Soulmate, Rally Cry, Sweet Talker, Double Meaning, Burden of Proof, Real Power.
   *Lead: yes.*
10. **Will Power 10 with Composure 0 has a Strain limit of 3** (it was 8); 10 / 10 has 8 (it was 16). This is your
    ruling applied; it is the largest single nerf in 0.32. *Lead: build it, measure the Outburst steady and peak,
    and report before it ships.*

## 4. Build order (lanes 4 and 5)

1. The shared pieces first: the Call price table; ladder shapes and perk-step schedule (3 / 6 / 7 / 9 for alphas),
   the migration and the old-save tests; the four approved primitives.
2. Then attribute by attribute, data first: Determination, Strength, Endurance, Agility, Perception, Intelligence,
   Expression, Insight, Virtue. Each: spec, data, the picking UI for anything new that is aimed, card lines, a
   reducer test per new perk tier and fork option, the measure.
3. The consolidation pass (CLAUDE.md "No rebuild" rule 4) before 0.32 goes live.

## 5. Visualization: forms are learned, forks upgrade them (the lead, to Leon's ruling of 19 Nov)

**Forms known.** A form is no longer opened by a level or a fork. You know **2 forms of your choice at
Visualization 1**, out of all ten (Double, Snare, Hand, Eye, Wall, Ward, Beast, Blade, Husk, Sentinel), and
**+1 form known at each of levels 2 to 9**: all ten at 9. The choice is made on the level-up screen (its picking
UI in the same change) and is kept for good. What holds a strong form back at level 1 is what it costs: its charge,
the one Figment held, its HP; the Figment ceiling (`balance.ceilings.figments`) is measured with a level-1 Beast,
and the form's own numbers are turned if it is over, never a level gate.

**The ladder.** 1 the door (Picture, Redraw, Let go; Glimmer; 2 forms known; 1 held) · 2 small verb: **Cash in**
(moved from 1) · 3 perk step · 4 fork one · 5 big verb: **a second Figment held** · 6 perk step · 7 perk step
(third held, as today) · 8 fork two · 9 perk step · 10 Mastered: Solid Image. Per point: +1 form known (2 to 9),
+1 tile reach, +1 Figment to hit; designs and traits as the sheet has them.

**Fork one, at 4: what your Figments are made of** (applies to every form you know, for good).
- **Hard Light:** your Figments have +40% HP, and one destroyed costs you no Snap.
- **Sharp Light:** your Figments' strikes deal +20% damage, and a Figment that drops a foe acts once more (once a
  round).

**Fork two, at 8: how you hold them.**
- **Many Hands:** +1 Figment held, and Picture costs 1 less charge (never under 1).
- **Masterwork:** name one Figment you hold your Masterwork: +1 trait on it, and once a round one order to it
  costs 0 AP. Naming another moves the mark.

All numbers PROVISIONAL. Built from existing pieces where they exist (the HP multiplier Improvisation's feed uses,
the Figment damage factor, `cost_mod` on charge and on a Figment order, a held-count stat, a per-round limit); an
opus pass checks each against `figments.ts` and `ENGINE-HOOKS.md`, rewrites the Expression sheet's sections 2 and
3 to this, and lists anything that needs a piece. Consequences for the rest of the sheet: Jury-Rig keeps its banked
AP (Hard Light removes the Snap outright, so the two do not stack to a gain: Hard Light holders get the AP only);
the Rigger's Scrap Sentinel stays (a free turret outside the forms known); a save keeps every form it has open and
counts them against its forms known, never losing one.

### 5b. The lead's rulings after the buildability check (19 Nov; commit ebd66a34 rewrote the Expression sheet)

No new piece is approved for Visualization; each option takes its buildable form (numbers PROVISIONAL):
- **Hard Light:** "Figments take -30% damage · +1 AP next turn when one is destroyed" (the damage cut is the same
  toughness as +40% HP and needs no `owned_hp` stat; the AP is Jury-Rig's row and shares its once-a-turn limit, so
  the two never stack). No `snap` immunity is added.
- **Sharp Light:** "+20% Figment strike damage · after a Figment drops a foe, your next Figment order costs 0 AP".
- **Many Hands:** as designed (+1 held; Picture -1 charge, named on Picture's own action).
- **Masterwork:** "your Masterwork has +2 to hit and takes -25% damage · once a round one order to it costs 0 AP".
  The free order uses the approved target-aware price, which must resolve the ordered Figment; "+1 trait on a
  standing Figment" is not built.
- **Forms known get their own door id** (`figment_forms`), apart from the forks' picks, with a save migration.
- The level-1 Beast reads 90% of the rifle per AP on arithmetic (108% with Sharp Light): under the door line. The
  measure is re-run in lane 4 before anything is turned.
