# Wording replacements, pass 1 (the lead, 18 Nov 2026)

Read from real screenshots of live 0.31.10. Paste-ready: **Now** is on screen today, **Write** is what it becomes,
**Where** is the file. Rules: CLAUDE.md "Say the core, once, and stop". Numbers in data texts stay `{=placeholders}`
(the digits below are what the player should see; bind each to its row's field). A cheap agent applies this file
as written; it does not rewrite.

**Read so far (3 screens):** creation's Skills step, the fight panel with a Hymn aimed, the sheet's MAGIC tab in a
story room. **Not read yet:** every other screen. Screenshots: run
`KEEP_SHOTS=1 python tools/e2e.py fight-panel picking survival pg-levelup creation-points magic faith tending`
and read `.check/e2e/shots/<suite>/`. `apps/web/e2e/capture-all.mjs` (uncommitted draft) stops after 14 shots: its
skill-page selector is wrong and its setup steps are not skip-on-failure.

## 1. Creation, Skills step (`creation-points-1280-full.png`)

The worst screen. Every skill card ends in "…" mid-sentence: a player cannot read what a point buys.

| Now | Write | Where |
| --- | --- | --- |
| Skill card: "Next point: The Guard technique gives you 1 plate. · Brace always gives 2 plates, whatever…" (two lines, cut off) | One line, never cut: the card line of the next point only. See the 27 lines below. | `data/skills.json` (a `short` per row / unlock), `apps/web/src/screens/shared.js nextLine`, the creation template |
| Attribute: "Next point: +15 max HP, +10% chance to ignore an injury." | "+15 max HP · +10% to ignore an injury" (drop "Next point:" everywhere on this screen; the stepper already says it) | attribute rows in `data/attributes.json` |
| "◆ Still to place: 3 Skill points and 6 Attribute points." | delete: "3 LEFT OF 10" and "6 LEFT OF 10" beside it already say it | creation template |
| "✓ Dexterity 5 needs Agility 5: 1 Attribute point spent." | "Agility raised to 5 for Dexterity" | creation screen logic |
| "BODY  Muscle, blood, and how well you command your own fl…" (cut off) | "BODY" only (same for MIND, SOUL); the blurb moves to a hover | creation template |
| "FIGHT · TAKES AGILITY TO 6" | "Needs Agility 6" | creation screen logic |
| Bottom card: "Next point (6): Fork: Through the Gap or Lockdown" | "At 6: Fork: Through the Gap or Lockdown" | same |

**The 27 first-point lines** (what the card shows at 0 points; later points use the same style):

| Skill | Write |
| --- | --- |
| Durability | Opens Guard: +1 plate from the Guard technique |
| Pain Threshold | +10% elemental resistance · +2 max HP a level |
| Senses | +1 to spot hidden enemies · notice them 1 tile further |
| Raw Power | +1 to hit: heavy melee, bare hands · +5% physical damage |
| Guts | +1 on Body saves |
| Intimidation | Call: Threaten · +1 tile reach |
| Dexterity | Opens Pressure: +1 to hit: guns, light blades, thrown |
| Athletics | Vault: cross cover at no extra movement |
| Reaction Speed | +1 Initiative · Call: Cue · +1 tile reach |
| Ingenuity | Opens Shadow: +1 Shadow for a turn ended Hidden |
| Acuity | −5% critical damage taken · Analyze +1 tile |
| Vigilance | (not visible in the shot: write in the same style) |
| Brain Power | Opens Sigils: +10% Sigil power · +1 Sigil word |
| Rumination | +1 on Brain saves |
| Eloquence | Call: Brief · +1 tile reach |
| Visualization | Opens Figments: Picture the Double |
| Improvisation | −10% damage from ambushes |
| Charisma | Call: Rally · +1 tile reach |
| Empathy | Opens Bonds and Tending (needs an Attuner) |
| Camaraderie | Share a Hit: take 25% of a hit on a friend beside you |
| Insinuation | (not visible in the shot) |
| Will Power | Opens Outbursts: +10% Soul power · +10% mana syphoned |
| Composure | +1 on Heart saves (and, after Leon's ruling, the Strain limit steps) |
| Lore Master | Call: Name It · +1 tile reach |
| Faith | +10% Blessing power · Hymns return sooner |
| Conscience | +10% to every shield you are given |
| Authority | Call: Order · +1 tile reach |

## 2. Fight panel, a Hymn aimed (`picking-hymn-2-hover.png`)

| Now | Write | Where |
| --- | --- | --- |
| Tile tooltip, five lines: "G10 / The Proving Ground: Packed sand under floodlights. The squad comes in from the west; drill units from the east. / in reach / you can pick this tile / it covers this tile" | While aiming: "G10 · click to aim". The place's description shows only when no action is selected. Never "in reach" + "you can pick" + "it covers" together. | `apps/web/src/game/pickOverlay.ts` tile words; `apps/web/src/screens/combat.js` tile label |
| Hover chip cut off at the left: "…see. Each enemy within 2 tiles of it takes 20 lightning damage ·" | "20 lightning · 2 tiles" (the area is already drawn); the chip must fit: anchor it inside the map | pickOverlay hover line; `data/patrons.json` Thunderclap `short` |
| Preview box: "HYMN · Thunderclap · 3 AP · SURE / Click a tile in sight. / SURE · By standing: no roll." | "Thunderclap · 3 AP" / "20 lightning · 2 tiles · no roll" | `descriptors.ts` FAITH preview lines; faith texts |
| Row: "88 Thunderclap · HYMN I — 3 AP · SURE" | "88 Thunderclap — 3 AP" (the section header already says HYMNS; "SURE" goes: say "roll" only on prayers that roll) | faith row label |
| Legend: "Half cover (−5 to shots behind it; 30 HP)", "Full cover (blocks sight; 80 HP)", "Out of sight (fog of war; darker when dark)", "Solid (blocks sight)", "Difficult (2 per tile)", "Sensed, not seen" | "Half cover −5" · "Full cover" · "Unseen" · "Wall" · "Rough: 2 a tile" · "Sensed"; the numbers in brackets move to the tile's hover | `apps/web/src/screens/combat.js` legend rows |
| Combat log: "Initiative: something unseen 22 · something unseen 18 · something unseen 17 · Recruit 8" | "Initiative: Recruit 8 · 3 unseen" | engine log line at fight start |
| Meter row cut off under SHADOW (a half-drawn DEVOTION line) | the row must end on a whole meter: the rest go in the "+N" chip | `apps/web/src/game/fold.ts` meter rule |
| Tabs on two rows (MOVE…SHADOW / FIGMENTS, FAITH, CALLS) | one row: number and glyph only below 1700 px wide, the name on hover | combat template tab row |
| The reach tint fills every tile in sight in pink | outline of the region only, light tint (already owed) | pickOverlay |

## 3. Sheet, MAGIC tab, story room (`magic-03-sheet-tab.png`)

| Now | Write | Where |
| --- | --- | --- |
| "Max Sigil words (longest Line; glyphs on the ground at once)" | "Line length 3" | `apps/web/src/screens/main.js` sigil stats |
| "Known words 3 / 8" | keep | |
| "Evoker — in your off hand" / "Evoker charge 10 / 10" | one row: "Evoker 10 / 10 · off hand" | same |
| "5 STUDY — NEXT WORD AT 6" then "Study comes from Evoking (more for longer Lines and for striking an enemy), copying glyphs and marks, and Mastery." | "Study 5 / 6 → new word"; the paragraph goes behind "?" | same; sigil growth text |
| Word card: "NEW · 0 USES / 10 — Deals 30 Elemental damage. On a critical hit the target starts Burning." / "AT 30 USES · When FIRE's…" | "FIRE · 30 Elemental · crit: Burning" / "0 / 10 uses" | `data/sigils` word texts |
| Top banner over the story: "ROUND 3 · YOUR MOVE / SAY ONE THING · SPEND YOUR AP · END YOUR TURN" | "ROUND 3 · YOUR MOVE" (the three instructions go; the composer below already says them) | story turn banner |
| "Your turn: 6 AP and one Say. Open the area map to act; End turn when done." | "6 AP · one Say" | story composer line |
| "AP 6 / 6  one Say and a full turn of AP" | "AP 6 / 6" | same |
| "☐ Let the Narrator pick a roll for whatever I send (it chooses the skills; the engine rolls)" | "☐ Narrator picks the roll" | same |
| The NOW PLAYING toast covers the left panel's content | it sits over the map corner, never over a panel, and leaves after 4 s | music toast position |
| "MP 100 / 100 · in the pack" | "MP 100 / 100 · stowed" (the word the fight panel uses) | sheet HP/MP rows |

## 4. Layout faults seen (not wording)

1. Creation: skill cards are too short for their text; with the one-line rule they fit.
2. Fight: the panel's top block still clips its last meter row at 1440 wide.
3. Fight: the hover chip is positioned off the map's left edge.
4. Story room: the big turn banner covers the first lines of the narrative.

## 5. Next screens to read, in order

The sheet's SKILLS tab with a ladder open, PERKS, GEAR; the Outburst designer (the Damage paragraph Leon flagged);
Survival: shop, Forge, rest and Training, reward panel, boon pick, run summary; level-up; the Faith tab and a vow;
the Shadow, Tending and Figments tabs with a tooltip open; token hover cards.
