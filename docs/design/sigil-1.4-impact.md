# Sigil 1.4: what it changes in classes, perks, traits, skills and gear

Rules revision 1.4 (spec: Mana › Sigil magic; decision 98; spec items 415–452) changes the ground every Sigil-reading
item stands on. This file lists every item that depends on the Sigil rules, what it reads today, and how it must
behave under 1.4. The engine lanes work from it. "Text" says whether the data text was already updated in the 1.4 data
pass (so only the handler is left) or still reads as before.

**What went away:** the Ring; the Stack as a default shape (it now needs the two-glyph hook, which nothing grants yet);
drawing on a tile next to you; 2 glyphs a tile; RETURN; Line range by length (4 / 8 / 12) and `LINE_RANGE`;
PUSH as "sends the spell to 8 tiles" (`PUSH_RANGE`: PUSH is now a cone Burst; range comes from Reach words);
"Form" and "Motion" classes (`form`, `motion`, `modifier`): the classes are now `subject_element`,
`subject_affliction`, `subject_boon`, `subject_working`, `reach`, `delivery`, `burst`, `filter`, each with a `group`.
WARD, MEND, BIND, BLIND, SLOW, MUDDLE, DREAD, VEIL, LIGHT and SILENCE moved from `subject_effect` to the Affliction,
Boon or Working classes (any test on `/^subject/` still holds).

**What every handler can rely on:** a glyph is drawn on its caster's own tile, one a tile; a spell is a straight Line
of 2–4 glyphs of one side; a spell holds at most 4 glyphs; the area comes from the facing rule (along / across, as wide
as the Line, as deep as the Reach range or 1 for Touch), plus self-targeting; Bursts and Delivery words do the rest.

## Base classes (classes/i.ts)

| Item | Today | Under 1.4 | Text |
|---|---|---|---|
| Mage · Barrage | Damage words −1 charge (fire, shock, freeze, stone) | Unchanged. OPEN: whether ACID, SPARK and GALE join (the text says "damage words", the data lists four). | unchanged |
| Mage · Overcharge | Next glyph free, +1 Max Sigil words while on the ground | Same, but never past 4 glyphs in a spell (item 437). The +1 to glyphs on the ground stays. | updated |
| Mage · Payload | Ring 2-tile burst, Line/Stack area doubling, reads `p.shape`, `PUSH_RANGE`, `formMult` with ring ×0.8 | Rewrite: doubles a SPREAD radius or a PUSH cone's length, or adds one more target to a single-target spell (like one more TWICE missile); refused on STAY, WAIT or WATCH spells (item 448). Flux on Evoke = glyph count stays. | unchanged (text still true) |
| Warden · Raise Cover | Lone STAY glyph on or next to you, Evoked as a cover rune | Still the class's one exception to the Line. The glyph must be on its own tile (one a tile); you Evoke it from a tile next to it (you drew it standing on it, so step off first; the rune needs its tile clear). `loneStay` must stop reading "2 glyphs on a tile". | updated |
| Warden · Ward | 1–3 charge shield to an ally within 6 | Unchanged (no glyph). | unchanged |
| Warden · Seal | 3×3 zone: enemy Sigils double charge | Unchanged. NULL doesn't remove it (class zone, item 430). The fx event's `shape: 'ring'` must become a 1.4 shape name (`area`). | unchanged |
| Scribe · Quicken | +1 AP to an ally within 6 | Unchanged, but see the QUICKEN word: OPEN whether it counts toward QUICKEN's once per target per round (item 428). Until settled they're separate. | unchanged |
| Scribe · Inscribe Gear | +10% weapon damage / +5 armour | Unchanged. | unchanged |
| Scribe · Stored Spell | Stores words + a shape ("FIRE PUSH stack"), `parseSpell` reads stack/line/ring, `PUSH_RANGE` | Store words only (no shape). Triggered for 1 AP, the spell goes off from the object's tile: its Reach from there, all around (no facing), Touch = the tiles next to the object; Bursts and Delivery as written; the 4-glyph cap and the grammar apply (`grammarError` with 1.4 rules). STAY may now be stored? Today refused; keep refusing STAY, WAIT and WATCH (they'd outlive the object). | updated |
| Trickster · Bind | BIND −1 charge; save vs 14 + debuff strength; rank I also teaches BIND | Unchanged. | unchanged |
| Trickster · Blind and Slow | Learn BLIND, SLOW, MUDDLE, −1 charge | Unchanged (they're Afflictions now). | unchanged |
| Trickster · Rewrite | 3 charge, flip a buff on an enemy within 8 + range bonus | Unchanged. Quickened and Sharpened are new buffs it can flip: Quickened → −2 AP next turn (as Dazed), Sharpened → −3 to hit and ×0.8 on its next attack (PROVISIONAL, for the lane to confirm). | unchanged |
| Channeler · Drink It In | 10 MP per Sigil word of a spell hitting your shield | Unchanged; a repeated glyph is still a word (count glyphs). | unchanged |

## Advanced classes (classes/j.ts, classes/k.ts)

| Item | Today | Under 1.4 | Text |
|---|---|---|---|
| Blade Scribe · Sword Form | Draws the glyph on the target's tile | Draws on **your own tile** as part of the strike (the general rule). It must still fail if your tile already holds a glyph. | updated |
| Blade Scribe · Edge Sigil | The word's damage × Elemental mult on the hit | Unchanged. ACID counts as an element (its Corroded doesn't ride the hit unless the lane decides so; OPEN). | unchanged |
| Blade Scribe · Three-Cut Script | Three words resolve as a Stack on the last target | The three words resolve as one spell aimed at the last target as Touch (it's next to you), whatever Reach words are among them; Bursts and Delivery apply; the 4-glyph cap holds (it is 3). `drawFree` must stop drawing on the target's tile. | unchanged |
| Siege Engineer · Deploy Cover | STAY glyph on the barricade makes it full cover | A STAY glyph on a tile next to the barricade (your own tile) makes it full cover while the glyph lasts. | updated |
| Siege Engineer · Sentry Turret | A class turret (40 HP) | Unchanged; it is not a WATCH turret (NULL doesn't remove it; it doesn't count toward the 1 Sigil turret). | unchanged |
| Spellslinger · Inscribed Rounds | One-word effect on up to 6 rounds | Unchanged: Elements and Afflictions only (Boons and Workings make no sense on a bullet). | unchanged |
| Spellslinger · Spell Magazine | A full spell fires at the shot's target | Words only; the spell goes off at the hit target as if Touch-cast on it: its Burst centres there, CHAIN jumps from it, Reach words are ignored. STAY/WAIT/WATCH place their magic on the target's tile. | unchanged |
| Spellslinger · Ricochet Glyph | Missed shot glances | Not a Sigil rule. | unchanged |
| Stroke Gambler · Half-Sigil | Random half-glyph on your tile or next to it; two complete as a Stack; 2 a tile | On **your own tile** only, one a tile. Half-glyphs make a Line of half-glyphs like any Line; the "second half-glyph on a tile completes the Stack" rule goes (the two-glyph hook isn't granted). | updated |
| Stroke Gambler · Stitch | Evoke a half-glyph-only pattern, d20 gamble | Same, on a Line of half-glyphs; the 1.4 grammar decides whether it fizzles. | unchanged |
| Stroke Gambler · House Edge | Reroll a Stitch | Unchanged. | unchanged |
| Circuit Mage · Closed Loop / Self-Crystallise | Vent and cores | Unchanged. | unchanged |
| Circuit Mage · Fusion | A pattern of only Form/Motion glyphs joined to a Soul school; reads ring/line/stack, `LINE_RANGE`, `PUSH_RANGE` | A Line of only non-Subject words (Reach, Delivery, Burst, Filter) carries the Outburst: the Reach and facing rule set where it can land, the Burst what it covers, Delivery what it does after. `fusionTargets` must be rebuilt on the 1.4 area. | updated |
| Glyph Mason · Keystone | Cut on your tile or next to it; tile holds 2 | Cut on **your own tile**, one a tile. It counts as a glyph of the Line it sits in, survives being Evoked, isn't removed by NULL (item 430), can't be scuffed. | updated |
| Glyph Mason · Survey | Evoke a pattern with your Keystone from 2 tiles away | Evoke a Line holding your Keystone from up to 2 tiles from any of its glyphs; the facing rule reads from where you stand (along if you're beyond an end, else across). −1 charge stays. | updated |
| Glyph Mason · Foundation | 0 AP draws within 2 tiles of the Keystone | Unchanged (you still draw on your own tile). | unchanged |
| Grand Sigilist · Enlarge | 24 Grand forms; staff on own or adjacent tile | 23 Grand forms (RETURN's Sanctuary is gone). The 16 new words have no Grand form; Enlarge can't pick them (item 449). The words keep their 1.2 Grand texts even where the word's 1.4 meaning moved (PUSH Rampart wind, CONDENSE Gravity well, SPREAD Bloom, SEEK Hunting ground). | unchanged |
| Grand Sigilist · Empty Hand / Earthed | Unarmed, Grand form immunity | Unchanged. | unchanged |
| Heartbinder / Heartfed / Vessel / Twinbound | Soul | Unchanged. | unchanged |

## Perks (perks/d.ts and others)

| Item | Today | Under 1.4 | Text |
|---|---|---|---|
| Hold the Stroke | +1 / +2 glyphs on the ground (`#pool` tag) | Unchanged: glyphs on the ground is still Max Sigil words + this (item 443). | unchanged |
| Parallel Thought | While a STAY zone of yours stands, the next Sigil costs 1 / 2 AP less | "Still active" = one of your fields (STAY), traps (WAIT) or turrets (WATCH) stands (spec updated). Workings' smoke, light and walls don't count. | spec updated |
| Clean Draw | Once a fight, a Sigil of any length with no charge and no Flux | Unchanged; "any length" is at most 4 glyphs. | unchanged |
| Twin Discipline | The Sigil sets the shape, the Outburst the school | The Sigil's words set where it reaches (Reach, facing) and what it covers (Burst); same model as Fusion. | updated |
| Rite in the Field | Wards = a WARD glyph drawn | Unchanged. | unchanged |
| Spoon Feed | Deed: teach someone a Sigil | Unchanged. | unchanged |
| Bulwark (a.ts) | Ranged = Sigil damage from a caster not adjacent | Touch spells can hit from a caster who isn't adjacent (the caster stands by the Line, the target past it). Read "ranged" from the spell's travel: Touch counts as melee when the caster is adjacent to the target, ranged otherwise (PROVISIONAL, lane A). | unchanged |
| Rounding Up (c.ts) | Glyph AP remainder | Unchanged. | unchanged |

## Traits

| Item | Today | Under 1.4 | Text |
|---|---|---|---|
| Sigil Savant · Muscle Memory | One Sigil costs 0 charge and 1 AP less | "One Sigil" = one word (its glyphs). Unchanged otherwise. Rigid's practice list is still capped at Max Sigil words. | unchanged |
| Drill Echo · The Count | d6 before drawing a glyph | Unchanged. | unchanged |
| Old School · Analog | No Evoker-linked guns | Unchanged. | unchanged |

## Skills (skills.json unlocks; no engine handler found for these yet)

| Item | Today | Under 1.4 | Text |
|---|---|---|---|
| Brain Power · Overclock (M1) | A spell one word past Max Sigil words, +2 charge | Never past 4 glyphs (item 451). | updated |
| Brain Power · Twin Draw (M2) | Draw two spells with one action, pay the longer's AP | Glyphs are drawn one a tile as you walk, so: once per combat, the glyphs of two spells cost the Glyph AP of the longer spell only (steps still cost Movement). PROVISIONAL. | updated |
| Rumination · Proven Formula (M2) | A spell already drawn this combat costs 1 AP less | Unchanged ("the same words in the same order"). | unchanged |
| Visualization · Paint the Field (M2) | Choose line, cone or circle free | Once per Evoke, a spell with no Burst word gets a free SPREAD or PUSH (no glyph, no charge, not counted toward 4) (item 450). | updated |
| Rumination per point | +0.5 tile Sigil range | Rounded down, added once to Reach words, never to Touch. | unchanged |
| Brain Power per point | Sigil multiplier, duration | Unchanged. | unchanged |
| Proficiency per point | Sigil Core saving | Unchanged. | unchanged |

## Gear, conditions, rules and other data

| Item | Under 1.4 | Text |
|---|---|---|
| Evoker blade · Edge Word | Draws its word on your own tile after a hit. | updated |
| Spellslinger's pistol / sigil-etched magazine | As Spell Magazine (words only). | unchanged |
| Sigil plate | Any of the 40 words. | unchanged |
| Bot-scrambler | Glyphs drawn on its tiles cost +1 AP: unchanged. | unchanged |
| Left Brain Debuff | "Sigils cost +1 AP": per glyph drawn and per Evoke, as now. | unchanged |
| Silenced | No drawing or Evoking. | unchanged |
| Commanded | COMMAND gives four orders: halt, kneel, drop, **move up to 3 tiles** (new to the engine's order menu; never into a known harm). | updated |
| Hidden | MASK: 2 rounds or until the target attacks; never on a Marked target. | note added |
| Corroded, Quickened, Sharpened | New in conditions.json. | new |
| rules.json `mana.sigil` | Grammar, cost, damage strings and the example (SPARK · SEEK) are 1.4. | updated |
| archetypes: Sigilist blurb | FIRE · SEEK · SPREAD. | updated |
| Mage tagline | FIRE - SEEK - SPREAD. | updated |
| apps/web `protodata.json` | Generated by `design/canvas-build/build.py --web`; regenerate after the data pass (not run here). | n/a |

## Engine and client constants that disappear

- `magic.ts`: `Pattern.shape` stack/line/ring, `centre`, `near`/`far`, `LINE_RANGE`, `PUSH_RANGE`, `grammarError`'s
  Form/Motion test, the ring branch in target resolution, "A tile holds at most 2 glyphs", drawing on an adjacent
  tile, `has('return')`.
- `classes/i.ts` (Payload, Stored Spell, Raise Cover), `classes/j.ts` (Three-Cut Script, Sword Form, Spell Magazine),
  `classes/k.ts` (Half-Sigil, Stitch, Fusion, Keystone, Survey, Enlarge's RETURN form) import those.
- `character.ts`: `startingMagicError` (Stack rule) and `startingMagic`'s default `['spark', 'condense']` become the
  1.4 rule (a spell with a Reach word; default `sigils.json grammar.starting.default`).
- Old saves (item 441): 1.2 glyphs dropped on load, wall zones become STAY fields where possible, RETURN removed from
  known words (one free word at the next rest); a character whose two starting words hold no Reach word swaps the
  non-Subject one for SEEK.
- `glossary.ts` and `apps/web/src/narrator/context.ts` describe 1.2 shapes; both need the 1.4 text.
