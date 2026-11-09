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
2. **Implement Leon's faith rulings** (8 Nov 2026; the branch `fix/faith-rulings` was never pushed):
   - Leaving a patron sets Devotion to 0 and starts a 90-day cooldown before joining another patron.
   - Leaving one patron *to join another* has no cooldown. Instead the patron you leave may punish you, as each
     patron's data says (Jealous patrons harder, Open ones may let you go).
   - Devotion from liked tags is at most +1 per fight (was +2).
   - The faith gold `#F2C46A` is approved as `--faith-light` (light only, always beside a word).
   - Art direction: patrons are painted as a god appears to a human (an NPC): apparitions, effigies, masks. The
     delivered set is right. Fix the style guide, `docs/design/handoffs/blessing-art-brief.md` and
     `docs/design/blessing-2.0-spec.md` section 8.
   - A ready prompt is in the chat history (summary in `docs/HANDOFF.md`).
3. **Rewrite M813 for World Play.** Every area gets:
   - an objective with a `where`;
   - a hazard or obstacle with approaches and real failure costs;
   - someone to talk to (`wants`, `knows`, `talk`);
   - a cache or reward;
   - a trigger where an ambush belongs.

   Objective-givers speak plainly. Spec: `docs/design/world-play-spec.md`. Campaign: `data/campaigns/m813.json`.
4. **The damage balance pass**, against `docs/design/balance-targets.md`:
   - weapons are the 100% baseline;
   - Sigil is about 150% at most;
   - Outburst is about 125% steady;
   - optimised physical is 150% (110% without ideal gear);
   - caps of 350 per hit for a full build and 500 on a mega crit.

   Weapons already go over the caps (spec item 591), so a damage simulator would help. Every number in section 14
   is provisional.
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
- **Provisional numbers to confirm in play:** ranks at attribute 5 and 8, and two moves per rank at level 3.

## World Play gaps (from `docs/design/handoffs/world-play-A-HANDOFF.md` and `-B-HANDOFF.md`)

- Paths (players' clicks and enemies) don't avoid hazards.
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

## Faith, beyond the rulings (`docs/design/blessing-2.0-spec.md` section 11, spec items 592–629)

- More patrons: the rival Thunder-Father, and the "many masks" pantheon (one Celestial playing several patrons).
- Witnessed doesn't exist in the story (engine item 604); vow and Witnessed icons are code-drawn placeholders.
- The Guardian's Judgement still spends Devotion, the only spend besides a Miracle.

## Magic

- The two-glyph hook (spec item 586): nobody has it yet.
- Grand forms (spec items 582–585) are built but shelved with the Grand Sigilist (batch 1).
- Outburst numbers awaiting the balance pass:
  - Heart Surge (flagged as much weaker than 1.2);
  - Empathy's free Pumps with the swell;
  - Resonance caps.

## Small engine oddities (Leon: not urgent)

- Equipping a weapon into an empty main hand puts "Fists" into the pack.
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
