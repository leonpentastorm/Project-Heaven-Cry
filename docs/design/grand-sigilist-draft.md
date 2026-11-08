# The Grand Sigilist: draft for Leon (8 Nov 2026)

> **Status: built** on `feature/grand-sigilist` (decision 101, spec items 582–591). Leon's friend asked for it to be implemented and balanced by judgement, without waiting for answers. What was built differs from this draft in these places:
> - **COMMAND** halts with Pinned for the turn (the engine's existing condition).
> - **STEP:** any move that starts and stays inside costs 1 AP at most, instead of a separate blink action, because allies don't hold the Sigilist's moves.
> - **RELAY:** +1 to hit for each other ally inside with a line, +3 at most, instead of attacking from an ally's tile, which needed deep changes to sight and range.
> - **ARC** auto-picks the tile that catches the most enemies.
> - **SPREAD** deals a flat 10 to enemies the spell missed.
> - **TWICE** echoes at half its damage per target.
> - **The two-glyph hook** went to nobody, the recommendation in point 27.
>
> The damage balance (items 587–590) is new beyond this draft. Leon can still answer any point; each is provisional.

Answers the hand-off `docs/design/handoffs/grand-sigilist.md`. **Nothing here is built.** It is the numbered draft the hand-off asks for before building. Please answer by number: *yes*, *no*, or *change it to …*. Once you've answered, the work goes spec, then data, then `classes/k.ts`, then effects, then tests, on `feature/grand-sigilist`.

## A. Pushback first

1. **Grand forms are invisible today.** Planting the staff plays a one-off effect, then the radius-2 zone isn't drawn on the grid at all: `placedView` in `game/sigilView.ts` has no `grand` kind. Players can't see where the lava or the dome is, so "readable at a glance" fails for all 40 forms, not just the new ones. **Proposal:** draw every Grand form as a ground layer (section E). This is the most valuable fix here, whatever happens to the forms themselves.
2. **Eight of the 17 provisional forms copy an older form.** A copy makes the word pointless to enlarge. The clashes:
   - ACID repeats FIRE: damage on entering or starting a turn, plus a condition.
   - SHARPEN mirrors LIGHT: +2 to hit against −2 to hit.
   - MASK repeats VEIL: hiding inside.
   - RAISE repeats PUSH and STONE: cover against shots from outside.
   - ARC repeats SEEK: ignoring half cover.
   - STEP is close to QUICKEN: more movement.
   - WATCH and WAIT both do a flat 10 Sigil damage on a trigger.
   - CHAIN's 5 damage is too small to notice.

   The draft below gives each word its own job.
3. **The balance file isn't on `develop`.** `docs/design/balance-targets.md` exists only on `feature/outburst-2.0`. I used its numbers: about 350 a hit, about 500 on a mega critical, and Sigil damage up to about 150% of plain weapon attacks per turn. It reaches `develop` when that branch merges.
4. **SPREAD and TWICE still have no engine hook** (old forms; the Narrator rules each spell inside). Section C proposes forms the engine can run. Otherwise the class's two Burst and Delivery picks stay Narrator-only.

## B. The 17 Grand forms for the words new in rules 1.4 (item 468)

Same frame as today: radius 2 round the staff, 3 rounds + the Sigil duration bonus, flat numbers, and the Earthed owner unharmed (and fighting bare-handed in it). Each line: the form, then why, then its ground look. Every number is provisional.

### Subjects

5. **ACID, *Etching ground*.** Cover inside (crates, low walls, pillars, earthworks, RAISE walls) loses 15 HP at each round start and crumbles at 0. Enemies inside have −2 Defense.
   - *Why:* acid eats the battlefield, not just people; nothing else melts cover. −2 Defense matches Corroded's armour half.
   - *Look:* `bubbles` field in acid green; cracks spread under cover objects.
6. **COMMAND, *Parade ground*.** Enemies starting a turn inside make a Brain save, or **halt**: they can act but can't move that turn.
   - *Why:* Court made them kneel (Prone) every turn, too strong a lock. Halting keeps them in the owner's bare-handed reach, which is what the class wants.
   - *Look:* a gold drill-square grid on the ground; halted enemies get a ⛔ chip.
7. **QUICKEN, *Quickstep*. Kept:** allies (not you) starting a turn inside get +1 AP, within the ceiling of 9.
   - *Why:* nothing else does it; it's the support pick.
   - *Look:* `streak` lines running toward the centre.
8. **SHARPEN, *Whetstone*.** Attacks made from inside by your side deal +5 damage, or +10 with melee and unarmed strikes (you included).
   - *Why:* replaces "+2 to hit", which mirrored LIGHT. It rewards fighting in close, which is the Earthed fantasy. +10 on Empty Hand's 20 is +50% for the owner only while inside the form, once per combat.
   - *Look:* a steel shimmer, fine diagonal hatching.
9. **CLEANSE, *Clear water*. Kept:** allies starting a turn inside lose their newest harmful condition.
   - *Look:* soft ripples.
10. **STEP, *Fold*.** Once per turn an ally inside may blink to any free tile inside for 1 AP; you may too.
    - *Why:* replaces "half-cost moves", which was close to QUICKEN. A blink inside the zone is unique and readable, and lets the owner reach anyone in it.
    - *Look:* paired `twinkle` points that flicker between tiles.
11. **RAISE, *Ramparts*.** Up to 8 wall segments rise on the zone's edge (every other edge tile, never on a unit): solid, block movement and sight, 30 HP each, and they fall when the form ends.
    - *Why:* the -5 against shots repeated PUSH and STONE. RAISE makes walls, so its Grand form is a small fort with gates. STONE stays as 4 half-cover pillars where you choose.
    - *Look:* RAISE walls as they are drawn now (grey blocks with HP).
12. **NULL, *Clean ground*. Kept as is** (it was already settled in item 430).
13. **MASK, *Hall of masks*.** Enemies outside can't target allies inside from more than 3 tiles away. Allies inside who attack stay targetable as normal.
    - *Why:* Shroud hid allies, which is VEIL again. This makes the zone safe from snipers without blocking sight both ways, which VEIL does.
    - *Look:* a faint pale mist that is denser at the edge.

### Reach

14. **ARC, *Mortar pit*.** At the start of each of your turns the staff lobs a shell at a tile you pick within 6 tiles of it (sight not needed): 15 Sigil damage there and 5 to the tiles next to it.
    - *Why:* replaces "ignore half cover", which was SEEK. ARC lobs over everything, so its Grand form is artillery that reaches **out** of the zone. No other form reaches out.
    - *Look:* a shell arc with an impact flash and a dust decal.
15. **SENSE, *Second sight*. Kept:** Hidden enemies within 4 tiles of the staff are revealed at each turn start.
    - *Look:* a pulse ring every round.
16. **RELAY, *Relay net*.** An ally inside may attack or cast as if standing on another ally's tile inside: range and sight count from there.
    - *Why:* Switchboard only helped Sigil casters, and the owner can't Evoke while the staff stands. This helps every party. The engine already moves RELAY's casting point for spells; this extends the same idea to attacks.
    - *Look:* thin lines joining allies inside.

### Delivery

17. **WAIT, *Minefield*.** Every enemy, the first time it enters each round, takes 10 Sigil damage and its walk stops.
    - *Why:* the old version triggered once a round for one enemy only, too small for a battlefield form.
    - *Look:* spotted trap hatching on the edge ring.
18. **WATCH, *Sentinel*.** At the start of each of your turns the staff strikes the nearest enemy inside for 15 Sigil damage. Enemies leaving the zone take a 10 opportunity strike from it, once a round each.
    - *Why:* WATCH is the turret word: it holds the zone and punishes leaving it.
    - *Look:* an eye-like turret marker on the staff tile.
19. **CHAIN, *Conductor*.** When your side hurts an enemy inside, 10 lightning arcs to the nearest other enemy inside within 3 tiles, once a round for each enemy it reaches.
    - *Why:* the old 5 damage didn't register.
    - *Look:* `static` field and visible arcs.
20. **LEECH, *Bloodwell*.** Each hit your side lands on an enemy inside heals the attacker 5.
    - *Why:* the drain healed only you and ticked on the enemy's turn. This rewards hitting, mostly the owner's fists, and shares with allies.
    - *Look:* dark red veins pulsing toward the centre.

### Filter

21. **KIN, *Sanctum*. Kept:** allies inside take no damage from your side's spells and attacks. It is the friendly-fire enabler.
    - *Look:* a white rim on the zone edge.

## C. The 23 old forms (only where something is wrong)

22. **SPREAD, *Bloom*,** in place of "spells inside spread 1 more radius": *spells your side lands inside also hit everyone of the other side inside at ×0.5.* It needs one hook on a spell's landing, the same hook TWICE needs.
23. **TWICE, *Echo field*. Keep the text,** and build the repeat hook alongside SPREAD's (one engine change for both).
24. **CONDENSE and PULL overlap:** both pull enemies toward the staff each turn. Proposal: PULL stays the long-range Vortex (enemies within 4 tiles); CONDENSE becomes *Crush*: enemies inside who are next to another creature take 10 at their turn start.
25. **PUSH, *Rampart wind*,** −3 to shots from outside, is now close to MASK's and RAISE's new jobs. Proposal: *Gust: enemies starting a turn inside are pushed 1 tile outward.* That makes it CONDENSE's opposite and keeps the zone clear around the owner.
26. **Everything else stays as it is.**

## D. The two-glyph hook (item 452)

27. **Recommendation: nobody else gets it yet.**
    - Rules 1.4 made one glyph per tile the core of Line-building. A second glyph on a tile is a Stack, which covers an area all round out to its range: the strongest shape in the system.
    - The Grand Sigilist can't draw while the staff stands, so on it the hook would do little.
    - Revisit after the damage simulator from the balance pass measures Stacks against the 150% Sigil ceiling.
28. **If you want it on something now,** the least risky home is the Grand Sigilist's **rank III** (class total 18), as a once-per-combat *Double Stroke*: before planting, draw two words on one tile. That makes the class's last rank about one big set-up spell, then the staff.

## E. Effects (the ground look), on top of the Sigil 1.4 element effects

29. **A `grand` kind in `placedView`:** every tile inside gets a tinted ground layer and the edge tiles a bright rim. A badge on the staff tile shows the word and rounds left (◎ FIRE 3), and the tooltip gives the form's one-line text. The Legend gains "Grand form".
30. **Ground treatment by word:**
    - FIRE uses `lava`, FREEZE `ice`, SHOCK and CHAIN `static`, STONE `dust`, GALE and QUICKEN `swirl`, SPARK and STEP `twinkle`, ACID `bubbles`. These field looks already exist in `game/fx/elements.ts`.
    - The other words get one of four new looks: **mist** (VEIL, MASK, BLIND), **ripple** (MEND, CLEANSE), **grid** (COMMAND, NULL, WARD, KIN, using the `raw` Sigil grid) and **pulse** (SENSE, LIGHT, DREAD, LEECH, WATCH). Each is tinted by its word.
31. **Reduced motion:** the looks become still tints; no animated fields.

## F. Balance check (against the outburst-2.0 targets)

32. **No form comes near the hit ceilings.** The biggest single hit is ARC's 15 (25 across a 3×3 if all nine tiles hold enemies, which never happens), against about 350.
33. **Damage per turn.** As a reference, a plain service rifle (30 a shot, about three shots a turn) does about 90.
    - The owner fists for 20 a strike, 2 AP, so about 60 a turn: about 40 with 4 AP left after planting, 60 on later turns.
    - **SHARPEN** takes that to about 90.
    - **WATCH** adds 15, **CHAIN** up to 10 per hit and **ARC** about 15–25.
    - So the class sits around **100–130% of the plain-weapon baseline**, under Sigil's 150% ceiling. That fits a class that trades its spell-casting for the staff.
34. **Strongest support forms:** QUICKEN (+1 AP for each ally, each turn), RELAY (an angle for every ally) and COMMAND (halt). They are once per combat and 3 rounds, which is why they are allowed to be strong. Watch COMMAND in playtests: halting a boss for 3 rounds on failed saves is a lot.

## G. What I build once you answer

35. **Spec:** the Grand form tables in "Rules revision 1.4", items 449, 452 and 468 settled or updated, and new section 14 items for every new number.
36. **Data:** the `grand` texts in `data/sigils.json`; `python3 tools/validate.py data` must give 0 errors.
37. **Engine:** `classes/k.ts` (Grand Sigilist parts only, per the hand-off's heads-up about `feature/outburst-2.0`): the new forms on the existing hooks, plus three small new hooks:
    - a spell's landing tile and repeat, for SPREAD and TWICE (if 22–23 are yes);
    - one on cover HP, for ACID;
    - one on the targeting range, for MASK.

    Tests in `classes-k.test.ts`, one or more per form.
38. **Effects:** `placedView` (`grand` kind) and the four new looks. An e2e drives a Proving Ground fight with a Grand form up and checks the tiles are drawn.

## Questions only you can answer

39. Should the Grand form frame change at all: radius 2, 3 rounds, once per combat? I kept it.
40. ARC reaching out of the zone (item 14) breaks the "radius 2" frame on purpose. OK?
41. Should the owner be inside their own buff forms (SHARPEN, STEP)? I said yes, since they fight bare-handed in the zone. QUICKEN stays "not you", as you ruled for the word itself.
