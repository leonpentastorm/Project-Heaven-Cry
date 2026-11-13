# Roadmap: what's next, and everything planned but not built (started at v0.0.1, 9 Nov 2026; kept current)

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
2b. **Fight maps up to 26 × 26** (**built**, rules 1.16, 11 Nov 2026: the limits, `data/maps.json`, layouts as rows of
   characters, open ground and the Proving Ground at 26 × 26, the M813 paintings retired; the camera is 2c. Spec:
   Maps; open items 1039 to 1047) (Leon, 11 Nov 2026; queued right behind step 1 of the balance pass, which is in the
   same engine files). 26 × 26 (A to Z by 1 to 26) is the largest a map can be and the size of the Proving Ground and
   of open ground; a campaign or a later game mode may set a smaller map, chosen when the campaign is made (the
   campaign format gets a size field with that maximum); sides deploy about 10 to 14 tiles apart with cover on the
   approach (Sprint and range bands finally matter); the screen opens zoomed to fit and follows whoever acts. The five
   painted maps (M813's four and the Proving Ground) go to plain colour until they are repainted (`art/briefs/ART-REQUESTS.md`,
   maps M1 to M9). The simulator's maps follow, so the balance numbers are measured on the real ground.
2c. **The camera** (**built**, 11 Nov 2026: `apps/web/src/game/camera.ts` and `cameraView.ts`, the effects queue in
   `fx/play.ts`, both map screens; how it behaves: `docs/design/ui-screens.md`, The camera; its numbers: spec item
   1048 and 1049; browser suite `camera`. What was settled while building: it follows every turn and effect the squad can
   see; each co-op player has their own; the overview is on M and on the map's toolbar, not in the settings;
   reduced motion cuts instead of gliding; the jump-back key is Home.) (Leon, 11 Nov 2026: on a 26 × 26 map zoomed
   to fit, "tokens will be barely visible, let alone effects like casings"; "zoom to our current is good"). For the
   fight and the area map alike:
   - **The view keeps today's tile size.** The map is bigger than the window and the window is a camera on it. Fit-to-
     window stays as an **overview** the player switches to and back from (a key and the map's zoom control), never
     the default.
   - **The camera follows the play:** to whoever's turn it is; to the target before an attack, a spell or a push
     plays, so its effect is seen at full size; back to the player's own unit when their turn comes. It moves once per
     beat, smoothly, never while the player is aiming or dragging.
   - **The player moves it too:** drag the map, the arrow or WASD keys, the wheel; a key to jump back to their unit.
   - **Nothing happens unseen:** an arrow at the screen's edge, in the side's colour, points at each unit or effect
     acting off screen (a click goes there); a click on a portrait in the initiative strip moves the camera to that
     unit. **A small map in the corner** shows the whole field: units as dots in their side's colour, the camera's
     frame, and it takes clicks (Leon, 11 Nov 2026: "keep the mini map… I will playtest and think about it later if
     it's unusable"; at 26 × 26 it is about 6 pixels a tile, so it is for where things are, not what they are).
     **And the overview key:** the whole field fits the window while it is on, a click on a tile sends the camera
     there. The M key already opens the area map outside a fight; in a fight the same key is the overview, so one key
     means "show me the whole map" everywhere. Fog of war holds: an unseen hostile's turn moves nobody's camera and
     draws no arrow or dot.
   - **To settle while building** (proposed defaults in brackets): whether the camera follows hostile turns at all or
     only shows their effects on the player's side of the field [follow what the squad can see]; whether co-op players
     each have their own camera [yes]; the overview's place in the settings; reduced-motion players [cuts, no glides].
3. **Rewrite M813 for World Play.** (Leon, 11 Nov 2026: "M813 is too broken now with all we have changed": its maps are plain colour until this is done.) Every area gets:
   - an objective with a `where`;
   - a hazard or obstacle with approaches and real failure costs;
   - someone to talk to (`wants`, `knows`, `talk`);
   - a cache or reward;
   - a trigger where an ambush belongs.

   Objective-givers speak plainly. Spec: `docs/design/world-play-spec.md`. Campaign: `data/campaigns/m813.json`.
4. **The balance pass** (done in large part as rules 1.15 and 1.17 to 1.25: the enemy table, magic, guns, the Outburst, heals and shields, Faith, defence, MP, the fire doctrine; a full Sigil Line is 150 to 200%, the Outburst about 135% steady and 165% at its biggest, an optimised gun a bit under 150%, and there are no hard caps since rules 1.17. The simulator is `packages/engine/test/balance/`. Left: the weapon step's leftovers, Equipment 2.0, XP by level. The original brief follows; the full draft with every angle, the AP economy included, is
   `docs/design/proposals/2026-11-balance-pass.md`), against `docs/design/balance-targets.md`:
   - weapons are the 100% baseline;
   - Sigil is about 150% at most;
   - Outburst is about 125% steady;
   - optimised physical is 150% (110% without ideal gear);
   - caps of 350 per hit for a full build and 500 on a mega crit.

   *(The targets and caps above are the brief's; rules 1.17 removed the caps and rules 1.19 set the Outburst's.)* Every number in section 14
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
   - **Heavenprint artwork for every weapon and piece of gear** (about 100 and growing; Leon, 11 Nov 2026): the
     painted large view beside the line icons. Listed for the artist as E1 in `art/briefs/ART-REQUESTS.md`.
5. **Advanced classes, batch 1: the 9 squared classes.** Juggernaut, Berserker, Gunslinger, Ghost, Grand Sigilist,
   Mirage, Heartbinder, Heartfed, Saint. Roadmap: `docs/design/class-roster-rev3-proposal.md` section 7. Shelved
   moves to bring back are listed in `docs/design/move-pool.md`. The data already carries `kind`/`pair`/`batch`, so
   turning a batch on is mostly data.

6. **The roguelike mode** (Leon, 11 Nov 2026): built **after every combat style and the advanced classes are in**. It
   becomes the main mode. Section "The roguelike mode, companions and what is sold" below; decision 115.
   **Before anything is sold, this must be a good game for Leon and his friends to play.**

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
  - a mechanic (Proficiency) move for the Operative (was the Infiltrator);
  - more for a Chaplain (was the Guardian) with no patron;
  - ~~a combat capstone for the Bard (Rally Banner instead of Gift)~~: done, Rally is the Mender's (was the Bard's) rank III move (rules 1.23).
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
- The Chaplain's Judgement still spends Devotion (10 Devotion XP since Faith 2.1, item 706), the only spend besides a Miracle's 5 levels (rules 1.6.2).

## Magic

- The two-glyph hook (spec item 586): nobody has it yet.
- Grand forms (spec items 582–585) are built but shelved with the Grand Sigilist (batch 1).
- ~~Outburst numbers awaiting the balance pass~~: Heart Surge and Empathy's free Pumps were settled in rules 1.19, the Resonance caps rewritten in rules 1.14.

## Small engine oddities (Leon: not urgent)

- A focus taken out of the off hand goes into the pack as kind `tool` instead of `focus`.

## Art

- `art/_archive/` (made in the v0.0.1 clean-up) can be pruned once Leon has looked through it.
- Patron icon exports (`exports/<size>/`) were listed but never delivered; the game builds its own sizes.
- Still needed: icons for vows and Witnessed, beast avatars, and the Narrator's 3D Wick (brief:
  `art/briefs/wick-narrator-3d.md`).

## The roguelike mode, companions and what is sold (Leon, 11 Nov 2026; decision 115)

Brainstormed, not designed. Nothing here is built, and no number exists yet. **Order:** every combat style and the
advanced classes first, then the roguelike. **Rule:** it must be a good game for Leon and his friends before anything
is sold.

### The roguelike: the main mode, free

- A full game on the existing combat and character building: dungeon diving, a world map to move on, random events.
- **Fully engine-run:** no AI key needed, no cost, no waiting. A DM is optional (see companions).
- Every unlock is earned by play. Nothing in it is sold.
- **Progress between runs** needs accounts: unlocked companions and service characters, hub upgrades, a codex,
  starting options earned by play.

### Companions (about 10) and service characters (about 10)

- **Companions** appear at random, a few per run, each good in a short arc. Each has a **character card** in data
  (who they are, how they talk, sample lines), written content (a recruit scene, a short personal quest, reactions,
  banter), **memories** the engine writes as things happen, and approval.
- **With a key, the DM can speak for a companion** from the card and memories when the player goes off-script. Without
  one, the written lines carry the mode.
- **In a fight** the player chooses, per companion, to control them or let them act on their own (the enemy AI, with
  a personality from the card).
- **Death is permanent** unless they are revived in time.
- **Service characters** run shops and upgrades and hand out missions: light writing, one shared pattern. The shop is
  needed anyway.

### Dialogue trees with skill checks

- Conversations as data: lines, replies, checks, conditions, effects. The engine already has the parts (checks, inner
  voices that interject, Echo, Overreach, effect ops).
- Replies show the skill and the odds. Some checks can be retried later; some are one try with a consequence.
- Inner voices cut in before the replies and can unlock one. Replies can be gated by class, patron, trait, origin,
  an item or an earlier deed.
- **Talking can replace fighting** in some situations: avoid, weaken or turn a fight; parley during one; talk a boss
  down. Failing must cost something.
- **Everyone talks separately** (each player's character has their own conversation, with their own skills; the
  others can listen in).
- Needs: the file format, a validator (no dead ends), a dialogue screen, and a simulator to see which branches builds
  reach. Write hubs deep and everyone else shallow; Claude drafts, Leon edits; start with one character.

### Voices

- Kokoro ships 28 English voices; the game offers 7. Blending two voices makes as many as needed.
- **Each of the 27 skills, each companion and each patron gets its own voice** (a recipe in data: two base voices, a
  ratio, a speed). An NPC the DM invents gets a recipe derived from its name. Leon casts them by ear, later, on a
  casting page with a play button.
- **Each voice gets a writing style card** (about 25 words). Only the cards of the voices in play are sent to the DM.
- **To playtest:** the DM tagging who speaks each line (needed to voice dialogue inside narration in open mode).
- First small step when wanted: offer the other 21 voices and a preview button.

### Open mode and campaigns

- **Open mode with your own AI key stays free and stays an option forever.** A hosted DM comes only if the game gets
  big, and is priced per use (it is the first thing that costs money per player).
- **M813 is free. Extra campaigns may be sold.** The host's copy covers the room.
- **Free roam:** a campaign you own is a world you can take your DM into, off the written path. So a campaign ships
  its maps, cast, factions and secrets as well as its plot. The engine still owns every number.
- In open mode, written characters use their written lines first; the DM writes only what is outside them.

### What is sold, and what never is

- **Sold:** cosmetics (dice skins, animated banners and name cards, cut-in styles, token rings and trails, portrait
  frames, kill and crit effects, themes, music packs, Wick outfits) and extra campaigns. Some cosmetics are earned
  only by play.
- **Never sold:** power, progress, or anything that changes a fight.
- **Build order:** accounts and server saves; the cosmetic locker with free and earned cosmetics; then payments
  (a provider that handles checkout, tax and refunds); then paid campaigns.
- **Check before any sale:** the image generator's terms for selling the portraits, saying plainly that AI was used,
  the credits for CC BY assets staying in, and that the game's name and Wick are free to use.
- **Size:** the built game is about 107 MB (images 78, music 27). Text, trees and voices add little; painted art is
  the only thing that grows it. Move art and music to Cloudflare R2 if they reach several hundred MB.

## Product and world (from `CLAUDE.md` "Next steps" and the tech plan)

- ~~Leon's decisions in `docs/design/tech-plan.md` section 10~~ and ~~starter mode~~: built (decision 62; the live game).
- Settle the open items in spec section 14 through playtests.
- Races (after origin, in character creation).
- Sectors beyond Earth.
- Bring the UI design canvas back in line with the game after v1.0.

## The roguelike: Leon's scope (13 Nov 2026; after Classes 3.0)

Recorded as he gave it; nothing is designed or built. Decision 115 has the mode's place in the product.

**Stage 1**
1. **About five map types** (five dungeons).
2. **200 to 300 designed rooms**: each a pattern of what is in the room (what must be done there, which NPC, what is
   gained, a treasure chest and so on), so any room can appear in any dungeon.
3. **A shop NPC system:** an NPC that sells items the engine recognises, with rarity and a randomiser.
4. **Random encounters in a dungeon:** a combat encounter generator in the engine that spawns objects that make
   sense and enemies to fight.
5. **A world map:** a big map with a random encounter at every step, like old RPGs, and points of interest that
   lead into one of the designed rooms. The roguelike uses it to do missions for the shop NPCs and to enter the
   five dungeons.
6. **Meta progression:** more is unlocked each run, tracked separately for each player.

**Stage 2**
1. A companion system with dialogue trees.
2. Account progression that gives cosmetic rewards, such as dice skins.

**Art (Leon, 13 Nov):** a batch of new art is made for the roguelike with the image generator, and combined with
the project's own LoRAs (`art/briefs/FORGE-PHC.md`) to make new settings. The four archived map paintings may be
used as style reference in training; **painted maps do not come back** (maps stay drawn from tiles): the scenes
LoRA is for backgrounds and illustrations only.

**The lead's notes for when this is designed** (not rulings): (a) "tracked separately for each player" needs a
player identity that outlives a room, which the game does not have today (characters are files and drafts): some
account or profile is a stage 1 need, not only stage 2's; (b) 200 to 300 rooms is content, not code: the first
thing to design is the room FORMAT (a data template the encounter generator, the shop and the loot tables fill),
proven with twenty or thirty rooms before the rest are written; (c) the encounter generator needs a budget to
spend: the balance contract and the enemy table by tier and level are that budget; (d) the shop needs prices and
rarity for every item, which today exist only in part; (e) measure the map's rendering (a full map, many units)
before this mode, as the performance notes say.
