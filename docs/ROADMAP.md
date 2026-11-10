# Roadmap: what's next, and everything planned but not built (as of v0.0.1, 9 Nov 2026)

This is a list of leads, not a spec. Each item says where its design lives. Before building anything, read
`CLAUDE.md` and `docs/HANDOFF.md`. Leon decides the order; the top section is the suggested one.

## Suggested order

1. **A real M813 playtest of the new Narrator and World Play**, on a fresh API key.
   - Check that the Narrator places faces, caches, hazards, triggers and talk options, and that it stops recapping
     and skipping stages.
   - The live harness is `apps/web/src/narrator/live-playtest.test.ts`; before/after transcripts are in
     `docs/design/handoffs/narrator-craft-transcripts/`.
   - Add a 14-turn run, which reaches the "carry everyone east" beat and so tests the skip-a-stage rule.
2. ~~**Implement Leon's faith rulings**~~ **Built** as Faith 2.1, rules 1.6.1 (branch `feature/faith-2.1`, decision 107,
   spec items 701–723; `docs/design/faith-2.1-spec.md`; hand-off `docs/design/handoffs/faith-2.1-HANDOFF.md`):
   - leaving a patron: Devotion 0 and a 90-day cooldown on the new day counter; a direct switch has no cooldown, but the
     patron you leave rolls to let you go (Open) or always holds a grudge (Jealous), as its `leave` data says;
   - Devotion is now **Devotion XP** toward the same 0–10 standing, and the tag cap lives on the character (2 XP a fight,
     2 a scene, 6 a session; the "+1 a fight" ruling was in levels and is replaced by these, see the design doc);
   - `--faith-light` `#F2C46A` is in the web app, `colour-system.md` and `palette.json`;
   - the art direction (patrons painted as a god appears to an NPC; the delivered set is right) is in the style guide,
     the Blessing art brief and the Blessing 2.0 spec section 8.

   ~~**Still open for Leon:** the Miracle's price.~~ **Decided** (Leon, 9 Nov 2026) and built as **Miracle 2.1**, rules
   1.6.2 (items 724–737): the Miracle needs Devotion 10 and lowers Devotion by 5 levels; all eight Miracles are
   stronger and engine-run. Every number in items 701–736 is provisional for playtests.
3. **Rewrite M813 for World Play.** Every area gets:
   - an objective with a `where`;
   - a hazard or obstacle with approaches and real failure costs;
   - someone to talk to (`wants`, `knows`, `talk`);
   - a cache or reward;
   - a trigger where an ambush belongs.

   Objective-givers speak plainly. Spec: `docs/design/world-play-spec.md`. Campaign: `data/campaigns/m813.json`.
4. **The balance pass** (next up; the full draft with every angle, the AP economy included, is
   `docs/design/proposals/2026-11-balance-pass.md`), against `docs/design/balance-targets.md`:
   - weapons are the 100% baseline;
   - Sigil is about 150% at most;
   - Outburst is about 125% steady;
   - optimised physical is 150% (110% without ideal gear);
   - caps of 350 per hit for a full build and 500 on a mega crit.

   Weapons already go over the caps (spec item 591), so a damage simulator would help. Every number in section 14
   is provisional.
4a. ~~**Skeleton 2.0**~~ (rules 1.13): live as 0.19.0 on 10 Nov 2026. Plan and log `docs/design/handoffs/skeleton-2.0-PLAN.md`.
   **Next up is item 4, the number balance pass** (Leon, 10 Nov 2026: balance first, so everything added later has a
   ceiling to balance to). After it: effects and icons for the nine Calls, then 4b.
4b. **Queued behind the balance pass, with the equipment pass ("Equipment 2.0"):**
   - **Weapon Arts** (Leon, 10 Nov 2026): a weapon's own special action as a card, charged by kills, on its own row of
     the Attack tab, movable to another weapon at drill mark III; one a weapon, two for a special martial class, one
     for each weapon when dual wielding. Recorded in `docs/design/proposals/2026-11-weapon-arts.md`; not designed yet.
   - **Tri-scale armour** (hybrid armour gated by two or three beta skills, with its own mechanics).
   - The four playstyles Skeleton 2.0 leaves open (Ingenuity, Visualization, Durability, Empathy).
5. **Advanced classes, batch 1: the 9 squared classes.** Juggernaut, Berserker, Gunslinger, Ghost, Grand Sigilist,
   Mirage, Heartbinder, Heartfed, Saint. Roadmap: `docs/design/class-roster-rev3-proposal.md` section 7. Shelved
   moves to bring back are listed in `docs/design/move-pool.md`. The data already carries `kind`/`pair`/`batch`, so
   turning a batch on is mostly data.

## Outburst 4.0 (built: rules 1.8, decision 109)

- Built on `feature/outburst-4.0` from `docs/design/outburst-4.0-spec.md`; hand-off
  `docs/design/handoffs/outburst-4.0-HANDOFF.md`. Waiting on Leon:
  - the 25 feeling colours;
  - the readings in spec items 801–818;
  - the placeholder icons;
  - the sounds, which nobody has listened to yet.
- Still to do:
  - the 10 class-gated modules' behaviours, when their classes return;
  - a flee rule, for Contempt's "or flees";
  - per-unit sight, for Dread's "can't see Hidden things";
  - painted art for the COMING SOON slots the hand-off lists.
- **Later:** the pen-and-paper conversion. Practice becomes one module pick per level-up for Soul casters.
- **Trait idea, now that 4.0 is built:** Abandon goes off wild when you're already over the Strain limit (Leon: "sounds
  more like a trait than a base mechanic").

## Sigil 1.5 (accepted direction, 9 Nov 2026)

- Spec: `docs/design/sigil-1.5-spec.md` (one file to hand over). It covers:
  - **strokes**: a Line is what you drew as one, so touching glyphs no longer poison each other (playtest fix);
  - guaranteed new words: study, copying enemy glyphs and investigating sigils drawn in the world, Mastery;
  - word mastery and inflections;
  - late-game Junctions (one glyph shared by two Lines; Lines of 5 were dropped);
  - gated power for the advanced Mind classes.

## Classes

- **Batch 2:** the ring of 9 hybrids (Blade Scribe, Storm Hand, Spellslinger, Banner Dancer, Adamantile Knight,
  Warden, Shade, Inquisitor, Hexer).
- **Batch 3:** the other 18 cross-core hybrids. Collision to settle: Devoted and Twinbound both want
  Determination + Expression.
- **"Nutso butso" (far future):** any class with any class, which brings back the same-core pairs (45, or 81 ordered).
  Homebrew classes as data entries keyed by attribute pair.
- **A class-changing system** (Leon: "a different system later"). Today the class picked at level 3 is fixed.
- **Ideas not taken up yet:**
  - each rank as one fixed move plus a pick of three (more choice inside a class, the D&D/Pathfinder comparison);
  - a mechanic (Proficiency) move for the Infiltrator;
  - more for a Guardian with no patron;
  - a combat capstone for the Bard (Rally Banner instead of Gift).
- **Provisional numbers to confirm in play:** ranks at attribute 5 and 8 and, since rules 1.11, level 6 and 12 (spec item 930); the rules 1.11 level gains (item 924); two moves per rank at level 3.

## World Play gaps (from `docs/design/handoffs/world-play-A-HANDOFF.md` and `-B-HANDOFF.md`)

- Enemy paths don't avoid hazards, and neither do the Narrator's moves. Since rules 1.9, a player's click-path goes around a revealed hazard when the detour is at most 2 tiles (item 683), and the preview names what a path crosses.
- World Play 1.1 (`docs/design/handoffs/world-play-1.1-HANDOFF.md`):
  - an enemy killed on the area map drops nothing (item 697);
  - enemy weapons have no rarity, so worn drops are always standard;
  - the host-only loot-cap log isn't shown on screen;
  - companions don't add to the party's sight of piles;
  - the light-armour line is now 1.2 kg (item 685, provisional; the field helmet and field boots change in a fight, the ballistic helmet doesn't): Leon to confirm in playtest;
  - no built-in campaign uses `loot_tables` or `drops` yet.
- Allies and companions don't fight beside the party; companion hazard damage on the area map isn't saved.
- Talk and hazard panels exist only on the area map, not in fights.
- **Carry weight is very punishing** (item 638): a 40 kg robot overloads a starting character, and a 70 kg body
  drops most to the slowest movement. Leon to decide the weights or the overweight rule.
- The "Ask" buttons stay after asking. Proving Ground asks close the round with no Narrator.
- Beasts have no avatar art, only a badge.

## The Narrator

- Turns are still long (about 167 words) even for quick exchanges. A few recaps survive as trailing clauses.
- Player characters must only say what their player wrote. The fix is in, but untested live.
- What a stall costs is "small" and undefined in PACING; a robot died during a wait. Leon to define it.
- Name detection for "named but not placed" is a heuristic; untitled first-time names can slip through.
- Other providers (OpenRouter, OpenAI, DeepSeek, Gemini, local, third-party sites) are untested with real keys.
- **Voice:**
  - Kokoro now loads through the Worker (`/hf/`). Hosting the model in Cloudflare R2 would remove the Hugging Face
    dependency entirely (Workers Paid is active).
  - A paid text-to-speech option, bring-your-own-key, was proposed: OpenAI, ElevenLabs, or Azure AI Speech (the
    same voices as Edge, e.g. en-US-ChristopherNeural, from any browser).
  - Confirm Kokoro on Leon's 9070 XT reads "Kokoro · WebGPU".

## Faith, beyond the rulings (`docs/design/blessing-2.0-spec.md` section 11, spec items 592–629; Faith 2.1 items 701–723; Miracle 2.1 items 724–737)

- More patrons: the rival Thunder-Father, and the "many masks" pantheon (one Celestial playing several patrons).
- Witnessed doesn't exist in the story (engine item 604); vow and Witnessed icons are code-drawn placeholders.
- The Guardian's Judgement still spends Devotion (10 Devotion XP since Faith 2.1, item 706), the only spend besides a Miracle's 5 levels (rules 1.6.2).

## Magic

- The two-glyph hook (spec item 586): nobody has it yet.
- Grand forms (spec items 582–585) are built but shelved with the Grand Sigilist (batch 1).
- Outburst numbers awaiting the balance pass:
  - Heart Surge (flagged as much weaker than 1.2);
  - Empathy's free Pumps with the swell;
  - Resonance caps.

## Small engine oddities (Leon: not urgent)

- A focus taken out of the off hand goes into the pack as kind `tool` instead of `focus`.

## Art

- `art/_archive/` (made in the v0.0.1 clean-up) can be pruned once Leon has looked through it.
- Patron icon exports (`exports/<size>/`) were listed but never delivered; the game builds its own sizes.
- Still needed: icons for vows and Witnessed, beast avatars, and the Narrator's 3D Wick (brief:
  `art/briefs/wick-narrator-3d.md`).

## Product and world (from `CLAUDE.md` "Next steps" and the tech plan)

- Leon's decisions in `docs/design/tech-plan.md` section 10.
- Starter mode: creation → story scene → one fight, solo with the AI Narrator.
- Settle the open items in spec section 14 through playtests.
- Races (after origin, in character creation).
- Sectors beyond Earth.
- Bring the UI design canvas back in line with the game after v1.0.
