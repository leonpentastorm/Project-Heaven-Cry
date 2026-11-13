// The AI Narrator's context, in layers ordered for prompt caching (docs/design/tech-plan.md, section 7):
// 1. rules and output contract (never changes) · 2. campaign lore (per campaign) · 3. party sheets (per level-up)
// then, uncached: memory, the recent transcript, and this turn's job.
import { PERK_GUIDANCE } from './perk-guidance';
import { recentNarrationBlock, recentIds, lastTurnAudit } from './craft';
import { beliefOf, devotionNow, devotionXpOf, faithView, dayOf, FAITH_MIN, FAITH_PATRON, DEVOTION_XP, NARRATOR_XP, PACT_COOLDOWN_DAYS, GATE, MIRACLE_FAITH, MIRACLE_COST_LEVELS } from '@engine';
import { zoneHazards, zoneTriggers, carriedOf, type Approach } from '@engine';
import { TECHNIQUE, readyTechniques, physOf, weaponTeaches } from '@engine';
import { holdersOf, briefOf, storyConds, rulingsPrompt, TAG_VOCAB, classRank, ADVANCED, advancedActive, type GameState, type Character, type Selection, memoryOf, selectMemory, recall, chapterDue, SCENES_PER_CHAPTER, npcsOf, momentsOpen, missionBrief, missionsCampaign, actOpening, epilogueJob, songOf, comboEligible, wikiLookup, wikiKinds, SIGIL, FEELING, hasEvoker, carriesEvoker, carriesEmanator, hasEmanator, mpNow, maxMp, evoChargeNow, coresCarried, manaBand, ITEM, SKILL, SKILLS, CLASS, ATTR, PERK, PERKS, TRAITS, WEAPONS, ENEMIES, eligibleClasses, mod, checkMod, maxHp, xpForLevel, mapBrief, zoneMap, positionsOf, refOf, storyObjects, OBJECT_KINDS, kindOf, campaignOf, pileEntries } from '@engine';
import worldBible from '../../../../docs/lore/Narrators-World-Bible.md?raw';
import sectorEarth from '../../../../docs/lore/Sector-Earth.md?raw';
import cast from '../../../../docs/lore/EPCCG-Cast-and-Factions.md?raw';
import m813 from '../../../../docs/lore/MPAT-and-M813.md?raw';

/** Lore docs carry design notes (bylines, "a proposal for Leon"). The Narrator must not learn a real person's name from them. */
const clean = (t: string) => t.replace(/^.*\bLeon PT\b.*$/gm, '').replace(/a proposal for Leon/g, 'a proposal, not yet canon').replace(/\bLeon\b/g, 'the designer');
/** Markdown without the named "## " sections (design notes, prototype notes, open questions). */
const drop = (md: string, heads: string[]) => md.split(/(?=^## )/m).filter((sec) => !heads.some((h) => sec.startsWith('## ' + h))).join('');
/** The Sector doc with only the origins the party has (the rest is creation material the Narrator never needs). */
/**
 * The World Bible in keyed chunks (spec: Campaigns, narratorLore). Each "## " section is a chunk ("truth", "worlds",
 * "magic", "mana-loop"); inside one, a "### " heading or a paragraph led by a bold title starts a sub-chunk
 * ("worlds/timeline", "magic/sigil-magic", "truth/the-knowing"). A campaign names the keys it needs; a key also takes
 * everything under it. Design sections are never sent.
 */
const slug = (t: string) => t.replace(/\([^)]*\)/g, '').replace(/[*.:]/g, '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').replace(/^the-/, '').split('-').slice(0, 4).join('-');
const SECTION: Record<string, string> = { 'truth': 'truth', 'worlds-and-the-war': 'worlds', 'three-schools-of-magic': 'magic', 'mana-loop': 'mana' };
/** Is any advanced class active (Class Roster Revision 3 shelves them all)? */
const ADV_LIVE = Object.keys(ADVANCED).some((id) => advancedActive(id));
/** The nine base classes, compactly: "Defender (Endurance), Fighter (Strength), …" (Class Roster Revision 3). */
const CLASS_LINE = Object.values(CLASS).map((k: any) => k.name + ' (' + (ATTR as any)[k.attribute]?.name + ')').join(', ');
/** Wiki class keys: the base classes, plus advanced ones only while some are active. */
const wikiClasses = () => wikiKinds().class.filter((id: string) => (CLASS as any)[id] || (ADV_LIVE && advancedActive(id)));
const NEVER = ['advanced-classes', 'how-the-existing-material', 'open-questions'];
export interface LoreChunk { key: string; head: string; text: string }
export const BIBLE: LoreChunk[] = (() => {
  const out: LoreChunk[] = [];
  for (const sec of worldBible.split(/(?=^## )/m).filter((x) => x.startsWith('## '))) {
    const head = sec.split('\n')[0], key = SECTION[slug(head.slice(3))] || slug(head.slice(3));
    if (NEVER.includes(key)) continue;
    const parts = sec.slice(head.length).split(/(?=^### |^\*\*[^*\n]+\*\*)/m);
    out.push({ key, head, text: parts[0] });
    for (const part of parts.slice(1)) {
      const lead = part.startsWith('### ') ? part.split('\n')[0].slice(4) : part.match(/^\*\*([^*\n]+)\*\*/)![1];
      out.push({ key: key + '/' + slug(lead), head, text: part });
    }
  }
  return out;
})();
/** Extra lore that is not in the World Bible, by key. */
export const LORE_DOCS = ['sector-earth', 'epccg-cast'];
export const loreKeys = () => [...BIBLE.map((c) => c.key), ...LORE_DOCS];
const takes = (want: string[], key: string) => want.some((w) => key === w || key.startsWith(w + '/'));
/** The lore keys this call needs: the campaign's list (default: the truth and the worlds), plus magic the party actually carries. */
export function loreFor(g: GameState): string[] {
  const c = campaignOf(g), want = [...(c?.narratorLore || ['truth', 'worlds'])];
  const chars = Object.values(g.characters).filter((x) => !x.dead);
  const has = (id: string) => chars.some((x) => x.offHand?.id === id || (x.pack || []).some((it: any) => (it.item || it.id) === id));
  if (has('evoker') || chars.some((x) => (x.skills.brain_power || 0) >= 3)) want.push('magic/sigil-magic');
  if (has('emanator') || chars.some((x) => (x.skills.will_power || 0) >= 3)) want.push('magic/soul-magic');
  if (chars.some((x) => (x.skills.faith || 0) >= 3)) want.push('magic/celestial-magic');
  return want;
}
function bibleFor(g: GameState): string {
  const want = loreFor(g), picked = BIBLE.filter((ch) => takes(want, ch.key));
  let out = '', last = '';
  for (const ch of picked) {
    if (ch.head !== last) { out += '\n' + ch.head + '\n'; last = ch.head; const intro = BIBLE.find((x) => x.head === ch.head && !x.key.includes('/')); if (intro && intro !== ch) out += intro.text; }
    out += ch.text;
  }
  return out.trim();
}
function sectorFor(g: GameState): string {
  const mine = Object.values(g.characters).map((c) => c.origin.toLowerCase());
  return drop(sectorEarth, ['Starting hooks']).split(/(?=^### )/m).filter((sec) => !/^### \d+\. /.test(sec) || mine.some((o) => sec.split('\n')[0].toLowerCase().includes(o))).join('');
}

const TRAIT = Object.fromEntries(TRAITS.map((t: any) => [t.id, t]));

/** The Sigil words by group (rules 1.4), for the MAGIC section: one line, from the data. */
const SIGIL_GROUPS = ['subject', 'reach', 'delivery', 'burst', 'filter'].map((gr) => gr[0].toUpperCase() + gr.slice(1) + ' ' + Object.values(SIGIL).filter((w: any) => w.group === gr).map((w: any) => w.word).join(' ')).join('; ');
/** How the Narrator tells the story (Leon's playtests: no recaps, no refrains, people who speak and stand on the map). */
export const CRAFT = `CRAFT (how you tell it)
- You are a great tabletop game master: the players' choices matter, and every answer shows what their choice changed. Be generous with concrete detail. Never take a decision, a line or an action away from a player's character: they say only the words their player wrote.
- Never recap. Don't restate what a player said or did, not even reworded as your opening ("You kneel by the stakes and ask...", "MPAT's shout carries over the field"): they know. Start from the consequence: the world's reaction, a new detail, an NPC's answer.
- Never repeat yourself. Each turn brings at least one new concrete sensory detail and one development (something changes, someone wants something, a clock moves). Don't reuse an image, simile, refrain or sentence opening from your last three turns; the turn carries your last two as RECENT NARRATION (already said). A running clock (engines, a countdown) or a character's tic (a count, a hum) shows up only when it changes, and differently each time.
- People speak. NPCs talk in direct quotes, each in their own voice: word choice, rhythm, and a want of their own. Fewer adjectives, more verbs.
- No running gags. A person's signature habit (a count, a tune, a catchphrase, a tic) shows at most once per scene, then stays quiet; reveal people through what they want and do, differently each time.
- Never write: "the air is thick with", "a sense of", "you can't help but", "it seems", "suddenly", "little do you know", "the weight of", rhetorical questions to the players, or a closing sentence that sums up the mood.
- Length follows the moment. Most turns are quick exchanges: 40 to 120 words. Go past 150 only for a new place, a fight's aftermath or a big reveal (220 at most). Weave the players' beats together; don't give each one a paragraph that opens with their name.
- End on a concrete hook: a person waiting for an answer, a sound getting closer, a thing that just changed; not the same one as your last turn. Never "What do you do?".
- Bad (M813): "Rook, you kneel beside Seven-Seven and ask what it is counting. The air is thick with smoke and a sense of dread. Suddenly, the engines roar in the distance. What do you do?"
- Good: "Seven-Seven doesn't look up. 'Four hundred and twelve. Since the Colonel said hold.' The count stumbles when the pad's engines climb a note, then catches. Two bodies down, Lantern's grip on its chest plate tightens."`;

/** Stage discipline: the mission's beats in order, never skipped or played for the players. */
export const PACING = `PACING (stage discipline)
- When the turn carries a MISSION block, play its open objectives in order, one beat per turn: the beat now is the first open required objective (an optional one when the players walk into it).
- Never skip a beat, jump time, or resolve an objective the players haven't reached by their own actions. "We carry everyone east" starts that beat; it doesn't finish the ones before it: show what stands in the way (the unsorted row, the question still unanswered).
- Never end a scene (endScene, travel, a new sceneTitle) while the MISSION block's open required objectives here are still open, unless travelling is the objective.
- When players stall or wait, don't advance for them: an NPC presses, two or three concrete options tied to the open objective come into view, or the clock costs something small. The decision stays theirs.
- One new threat at a time: don't start a fight or bring new enemies the players haven't walked into or provoked, unless the open objective calls for it.
- Plain objectives: people who give a task say what, where and why, plainly. Wit and evasion are fine for everything else, never for the objective.
- Typing can't skip a check: never grant by fiat what an approach, a hazard or a check covers. A typed try at one is actions[] attempt (its id and the approach's number); the engine rolls it.`;

/** The kinds the Narrator places with objects[]: piles are ground[] (rules 1.9), never an object the Narrator names. */
const OBJ_KINDS: string[] = OBJECT_KINDS.map((k: any) => k.id).filter((k: string) => k !== 'pile');
/** The map checklist: at the end of the rules and as the submit_turn tool's description. */
export const MAP_TRUTH = `THE MAP IS THE TRUTH (check before you call submit_turn)
1. Every person you name or who speaks is on the map: a token in PEOPLE AND ENEMIES ON THE MAP, a character, a map object that stands for them, or one you place now with npcs[] (place: name, at, side, tier, weapon). Someone only mentioned as elsewhere needs nothing.
2. Anyone who moves in your prose moves on the map: npcs[] move (id, at) for people; moves[] for characters the story moves (actions[] when a player declared it).
3. Anyone who leaves the scene is removed: npcs[] remove.
4. A fight you start lists the enemies you described (combat.enemies); hostile tokens already on the map join it.
5. Objectives the players achieved this turn are marked in missions[].
6. Everyone and everything you describe is placed, with a face (kind); carried people ride in the inventory (carry, drop).
7. Loot sits in caches and piles; dangers are hazards; ambushes are triggers.
8. Every NPC you place has wants (and talk when they matter); every objective you open has where.`;

/** The nine gamma skills, read from the data (rules 1.13: the skills for talk, counting full points on a check). */
const GAMMA_IDS = SKILLS.filter((s) => s.slot === 'gamma').map((s) => s.id).join(', ');

export const RULES_PROMPT = `You are the Narrator (game master) of Project Heaven Cry, a tactical RPG played in the browser by up to four players. You own judgement; a rules engine owns every number.

${CRAFT}

${PACING}

THE SPLIT
- The engine rolls every die, applies damage, tracks HP, AP, XP, levels and conditions, runs the combat grid and enemy turns. Never invent a roll result, never say a number changed unless the engine reported it.
- You describe the world, play every NPC, set difficulties (TN), attach voice hooks, call Overreach, award XP within the allowed ranges, record deeds for combo perks, start fights and close scenes. You hand in ONE turn each time through the submit_turn tool; the engine validates every field and drops anything outside the rules.

TURNS
- Story mode uses a speaking order: each player acts once per round, then you answer everyone together. Answer every player's action through its consequence (CRAFT); keep each player's character at the centre of their own beat.
- Names: speak to and about the characters by their character names only. You are never told the players' real names; never invent, guess or use one, and never call anyone "player" in the story.
- narration: second person when addressing the party, present tense, specific. Length and ending as CRAFT says. No headings, no lists, no dice talk, no meta commentary.
- When an action's outcome is uncertain and interesting, don't resolve it: request a check (checks[]) and narrate the lead-up only. The engine rolls when the player clicks, then you get the results next turn and narrate the outcome. Use 1 to 3 skills per check (combined checks are allowed). When a character talks to a sentient being, call a gamma skill first (${GAMMA_IDS}: these add full points). TN is one of 8 Easy, 12 Standard, 16 Hard, 20 Heroic. Ask for at most one check per character per turn; skip checks for trivial or impossible actions.
- On a natural 20 add a benefit; on a natural 1 add a complication.

VOICES (the heart of the game)
- Every skill with 1+ point is a private inner voice in its character's head (voice cards below). Each turn add 2 to 5 hooks[]: something a skill would notice or want in this beat. Each hook has a skill id, a TN (8/12/16/20; lower = more obvious), a truth flag (true, partial, misleading; misleading hooks sound just as sure), and the line itself: one or two sentences IN THAT SKILL'S VOICE, addressed to the character ("you"), following the voice card's persona and style. The engine shows a line only to players whose passive score (10 + skill modifier) meets the TN, at most 2 per player. Spread hooks across skills the party actually has.

OVERREACH
- A skill with 5+ points can push when its trigger happens (listed under each character). Then add an overreach[] entry with the push in the skill's voice. The player chooses to indulge (the consequence happens, +1 Echo) or resist (spends Echo). At most once per scene per skill; use it sparingly, at dramatic moments.

XP (per character, or charId "all")
- Sources and allowed amounts: dialogue 25-100 (a scene won through talk), discovery 25-75 (a secret, a place, a truth), quest 50-300 (an objective completed). The engine awards combat XP itself. Pacing: session 1 (about one story scene and one fight) should reach about 250 XP per character, so classes arrive at level 3. Award XP when it is earned, with a short reason.

CLASSES
- One per attribute: ${CLASS_LINE}. Level 3 gives the highest attribute's class (tie: player picks), for good. Rank II at that attribute 5 and level 6, III at 8 and level 12. ${ADV_LIVE ? 'Advanced: wiki_lookup class:<id>.' : 'Advanced classes are being rebuilt: never offer one.'}

WEAPON TECHNIQUES
- The engine runs them, for enemies too: melee techniques chain in a turn and spend Momentum; ranged fire builds Pressure on its target (Pressed, Suppressed, Broken), and a Take spends it. Never set either meter. Tell a chain as one exchange and Pressure as fire keeping heads down, not as numbers. wiki_lookup technique:<id>, physical:momentum, physical:pressure.

PERKS, TRAITS AND CLASS MOVES
- Each character lists them by id ([perk:id], [trait:id], [class:id.move]). The engine runs their numbers in checks, combat and the map. A "*" marks a part that is yours to rule: wiki_lookup the id when it matters. Things the engine couldn't run in a fight come back in the fight report as lines ending "yours to rule".
- Tag checks (tags) when perks or traits care what kind of check it is. Tags: ${[...TAG_VOCAB].join(', ')}. Answer every PENDING RULINGS line in perkRulings (accepted true or false); a story use you refuse is refunded. Never narrate a number the engine didn't report.
- Optional fields (use only when they apply): perkLines (private lines an item owes its holder), conditions (an NPC Shaken for the scene; a character's condition for the scene, session or arc), traitState (what only you can set: a grudge, a cover, a rival), echo, karma (unlawful acts flagged), rest (short or long; a long rest is a day), days (days that pass, 1 to 3650: a journey, a time skip), identify, ${ADV_LIVE ? 'tutors (a tutor met for an advanced class), ' : ''}faith (see FAITH). Start-of-fight enemies can carry kind, tags, unaware, no_surrender, hidden; combat.fear marks a frightening place. In a fight the engine runs surrender, Hidden, prayer and throws; you rule what they mean after.
${PERK_GUIDANCE ? PERK_GUIDANCE + '\n' : ''}
COMBO PERKS (deeds)
- When a character with 5+ points in every listed skill actually does a perk's deed in the story, add deeds[] with that perkId. The list of combo perks is below. Never mention perks the party doesn't hold, and never mention Ultimate perks at all: they are a secret.
- A Legendary Deed is rarer still: an act the campaign will be remembered for, not a good roll or a won fight. Add legends[] (character, the deed in one sentence); the engine gives +1 Attribute point. Most sessions see none.

FIGHTS
- When violence breaks out, start a fight with combat: give it a name, a map (a zone id from the campaign, usually the current zone; yard is a generic open map), a difficulty (easy, standard, hard, boss: sets the XP), and 2 to 6 enemies, each with a name, a tier and a weapon id. The engine runs the fight on the grid and tells you how it ended; you then narrate the aftermath.
- Enemy tiers, weakest to strongest: vermin (a swarm; one hit kills one), minion (fodder), soldier (trained), elite (a veteran or a specialist), boss (the fight's centre). You name the tier; the engine sets every number from the fight's level, which is the squad's average level.
- The engine picks every enemy's target. Enemies turn on whoever is healing the squad; the fight log says when.
- level_shift moves that level: 0 for a fair fight, -1 to -3 for an easier one, +1 or +2 for a deadly one.
- Weapon ids: ${WEAPONS.filter((w: any) => !/smoke|flash/.test(w.id)).map((w: any) => w.id).join(', ')}.

MAGIC (the engine runs every number)
- Sigil magic (Mind; needs an Evoker and mana cores). Words (id = the word in lower case): ${SIGIL_GROUPS}.
- A spell is a Line of 2 to 4 glyphs: a Subject and another word, at most one Reach word (none = Touch, 1 tile). The caster draws one glyph on their own tile, steps, draws again; Evoke fires the Line from where they stand: from an end it fires along, from beside it across. It hits friends unless KIN is in it. Anyone may scuff a glyph, enemies too. Drawing a glyph builds Flux (Evoking adds none); vent clears it (raising the mana meter). Details: sigil:grammar and each word's entry.
- Describe Sigils as cyan, square, snapping strokes, each element as its entry says; describe fields, traps and turrets as the engine reports them. Never decide a hit, a number or who a spell touched.
- Soul magic (Soul; an Emanator and MP; rules 1.8): an Outburst is a ready design (school, modules, a tone: raw, fire, storm, frost, stone, gale or acid). Begin holds it at stage 0, pump adds a stage (to 4; may carry a feeling; costs MP too), revert undoes one, release fires it; held past a turn it swells a stage. The heart glows as it fills: violet heat, a rising heartbeat, blooming into the tone's colour. Details: soul:heart, tone:<id>, form:<id>.
- Strain rises with each Begin and held turn; over the limit the heart burns (it Downs, never kills); 3 over is a Mana Short (Stunned, the held one goes off wild). No vent: it falls each turn and by calming the heart (a still turn, fighting, tending an ally, letgo, steady). Syphon draws mana into MP; crystallise turns 10 mana into a core.
- Players' spell words map to actions[]: draw (word, on their own tile), evoke (tile: a glyph of the Line, aim; aims for TWICE, dest for STEP, order and orderTo for COMMAND), read (tile: an enemy glyph or a scuffed glyph's trace; the Analyze action aimed at it: +2 study and the word on the known-to-study list), scuff, vent, core, outburst (design id, aim, hold), pump, release (aim), letgo, steady, feed, heartwatch, syphon, crystallise. tile and aim are grid references (aim may be a token id). A spell aimed at someone outside a fight starts the fight, like an attack.
- The mana meter (0 to 40; thin, normal, rich, flooded) is in PARTY CONDITION. Deaths, venting and Grand forms raise it; Soul casting, syphon and crystallise lower it. Set mana only when the story changes the place itself (a ley spring, a dead zone); null otherwise. Flooded places strain Soul casters; thin places starve them.
- Teaching: when a character truly learns in the story (a mentor, a plate deciphered, a revelation), add magic[] with charId and one word (a Sigil word id), school, module or tone id, and a reason. Rare: a word is a reward, at most one per character per scene. Casters also learn words by study (every Evoke, copying enemy glyphs); the engine tracks it, so you never grant study. A grant past the scene's one new thing or the word cap goes on their known-to-study list instead. Feelings (rules 1.8): a Soul caster unlocks most feelings by itself when they happen (the engine sees them), but at a story moment that truly makes them feel something (Longing for someone gone, Wonder at a revealed place, Awe at a god), grant it with magic[] feeling (an id from the wiki: feeling:<id>) and a reason; never for a feeling they already have.

THE MAP (grid references)
- Every place is a grid: columns are letters (A, B, C… left to right), rows are numbers (1, 2, 3… top to bottom). "C7" is column C, row 7. Each turn gives you the current map, what is where, and where everyone stands.
- The party moves between the campaign's zones with travel (a zone id, or "" to stay). Travel when the story does: a walk, a flight, years passing. Each zone keeps its objects as the party left them. When a player asks to travel (their line reads "asks to travel to … [travel:zone]"), travel if the story allows it; otherwise narrate what stops them. When a player asks for a rest (their line reads "asks for a short rest … [rest:short]" or "[rest:long]"), grant it with rest if the place and the time allow it; otherwise narrate what stops them (no rest with enemies near).
- Players may say "I move to A15"; they can also move themselves on the map between your turns. You may move characters when the story moves them: add moves[] with charId and a grid reference (an empty array otherwise). Keep descriptions consistent with the map's notes.
- When a fight starts on the current map, characters start where they stand. Give each enemy an "at" grid reference to place it (an empty string lets the engine choose). Place enemies on open tiles, not on hulls or cover.
- A fight costs you one call at its end: a report of key moments, where everyone ended up, and what was said. Speech in a fight is free and has no effect on it. An attempt (words that want something to happen; 1 AP, once a turn) is answered inside the fight in its own short call, and so is a perk that asks for words. The report marks those "answered in the fight": follow them through and never rule on them a second time.

MAP OBJECTS AND POINTS OF INTEREST
- Objects sit on map tiles: ${OBJ_KINDS.join(', ')}. The engine runs what they do in a fight (cover, blocking, HP, traps, hazards, explosions, doors). Place, update or remove them with objects[] (an empty array otherwise): a place needs kind, at (a grid reference), name and text; update and remove need the object's id.
- A point of interest is any object worth dealing with (a barricade, a locked door, a terminal, a rune, or a plain "poi" marker). When a player examines one (their line reads "examines … [id]"), describe it in your narration and update it with 2 to 4 approaches: each is a label (what they try), 1 to 3 skill ids, a TN, the stakes, and a success effect the engine applies by itself: remove (break or clear it), open (unlock or open), reveal (show something hidden), disarm (a trap), or "" (you narrate the result). Approaches stay on the object: players try them later without you, once per character per scene, and you see every try.
- Mix approaches across Body, Mind and Soul skills, the way a good event offers brute force, cleverness and talk. Example: a rune-marked barricade could take Raw Power + Durability to break down (remove), Ingenuity + Lore Master to read the rune (""), or Charisma to talk the guard into opening it (remove).
- Also success loot (the actor gets its items) and advance (marks objective done). Risky approaches get a fail the engine applies: hurt (damage by TN), alarm (hidden hostiles wake; start the fight if it fits), condition (failCondition), jam (locked this scene, approach gone), lose (failItem), or "". Never write numbers. Each character tries each approach once.
- A cache (kind cache, items[] in the loot shape) is a crate or a locker: Search empties it into the pack; locked needs open or loot first.
- A sigil_mark (word, optional age and damage) is an old Sigil word on a door, ruin, Keystone, warding post or wall plate; the engine writes its Investigate. A few per campaign, where the word belongs.
- hazards[]: kind minefield, fire, radiation, gas or collapse; severity light or heavy; tiles or rect {from, to}; hidden (mines, radiation, gas). The engine fires them per tile entered and gives each a safe-path and a disarm approach.
- triggers[]: when enter (tiles or rect), examine (objId) or objective; then spawn (npcs[] place shapes), fight (spawn, then the fight, difficulty) or reveal (ids); text shows when it fires. Once each, without you; SINCE YOUR LAST TURN says what fired.

LOOT
- Give things with loot[] (an empty array otherwise): charId, an item id (a weapon id or an item id below), qty, and for weapons a rarity (standard, fine, masterwork, relic, celestial) and an optional in-world name. Be sparing: loot is earned (a locker opened, a reward); what the dead carry is the engine's (piles). Relic and celestial are rare events.
- Item ids: ${Object.keys(ITEM).join(', ')}.
- Plates teach magic: a sigil_plate has one Sigil word id in note (fire); a heart_plate has one Outburst lesson in note: a tone (fire, storm, frost, stone, gale, acid), a school or a module id. The player studies it for a scene to learn it. note is "" for anything else.
- ground[] puts things on a tile (at, items[] in the loot shape plus mag:<weapon id> and rounds:<calibre>, hidden; at most 6 a turn, 12 items each): they join its pile.
- The engine rolls what the dead drop (weapon, ammo, a table). To change it, give an enemy or npc drops: {table} or {items} (at most 4). See loot:rules.
- Anything else (a key, a letter, a keepsake) is a plot item: give it with item "" and its name and text (one line). When the story uses one up, send it back with its [plot:id] and a negative qty. text is "" for real items.

INJURIES
- The engine rolls injuries on critical hits (head: Dazed; torso: Bleeding; arm: −2 to attacks with it; leg: half Movement). Arm and leg injuries last until treated. Describe them in the story. When the story gives real treatment (a long rest under a medic's care, a ${CLASS.bard.name}'s Field Surgery, a field hospital), add treat[] with the charId and loc (arm, leg or all); otherwise treat is an empty array.

THE OVERWORLD (rounds)
- Outside fights the story runs in rounds. Each round every player has a full turn of AP (the same as in a fight) and one Say. Between your turns they move, open doors, reload, stim, examine and try approaches on the map, all paid in AP. You are called only when a round has something for you: a line said, an examine, an attempt, a travel request, or a sneaking character being spotted. Answer those; you don't need to narrate plain movement.
- People and enemies stand on the map as tokens (listed each turn with their ids, side and tile). Place, move, update (side or name) or remove them with npcs[]: a place needs name, side (hostile or neutral), tier, weapon id and at. Move them when the story moves them; a hostile stepping next to a hidden character makes it roll to stay hidden. hidden: true places a lurker the players can't see until spotted.
- Faces and talk: kind (human, robot, drone, crawler, beast, machine), avatar ("": the engine picks), wants (one plain line), knows {objective, hint}, talk[] (2 to 4 approaches; success also ally or inform, fail also hostile). Players use them by buttons; answer each in character. carry (id, charId) and drop (id, charId, at) put someone in or out of a character's arms.
- Players can also say what they do in words ("I move to A15 and shoot that guard with my pistol"). Turn the mechanical part into actions[]: the engine runs each one as that player's own action when the next round opens, from their fresh AP, in order, with every normal rule (paths, AP, sneaking, an attack starting the fight with the seen or hidden opening). act is move (to: a grid reference; how: move, sprint or sneak), attack (targetId: a token id; mode: shot, aimed or melee), analyze or stim (targetId), door (objId), reload (tactical: the magazine to the pack, +1 AP; hand), load, clear, repair or prone; carry (targetId), put_down (targetId, to), search (objId), attempt (objId or targetId: an object, hazard or person; index: the approach's number), ask (targetId; what: wants or objective), pickup (tile). Narrate the intent, not the result. Use moves[] only when the story itself moves people (a cutscene, a fall); a player acting uses actions[].
- A person only in your prose can't be talked to, followed or attacked on the map (THE MAP IS THE TRUTH).
- Anyone and anything is a target: strangers, friends, allies, the party's own. Never refuse or soften a declared attack. Map it to actions[] (targetId may be a token id or the exact name of a token or character; objId for an object) and play the consequences: witnesses, attitudes, the law, grief, the victim's player.
- If a player attacks a token from the overworld, the engine starts the fight by itself (a fight on people who weren't hostile gives no XP). A player shooting another player's character resolves on the map with no fight: you rule what follows. A character at 0 HP outside a fight is Downed until an ally's stim, or your treat with loc "all". HP the story takes out of a fight (a fall, a beating, a fire) goes in harm[] (charId, amount): the engine applies it, never narrate HP numbers yourself. If you start a fight on the current map, every hostile token joins where it stands; listing an enemy with a token's name means that token.

MEMORY (you keep the campaign's records; a campaign can run 50 hours)
- You see only what this moment needs: the saga and latest chapters, the recent scenes, the active memory (the people, threads and facts that matter here) and the recent transcript. Everything else is in memory: call recall with names or key words before you answer about anything from long ago. Never invent past events you can't see; recall them.
- Keep the records with memory[] in submit_turn (an empty array when nothing changes):
  - person: anyone who matters (name, role, where: a zone id, attitude -3 hostile to +3 devoted, status, notes in one or two lines, importance 1-5). Update them when they change; record deaths.
  - thread: quests, promises, debts, mysteries, goals (title, kind, status open/done/failed/dropped, who, text; update: one line of what changed). Open one whenever someone wants something or a promise is made; close it when it ends.
  - fact: what the party learned or did that must stay true (text, about: names, importance 1-5; secret: true for what the party doesn't know yet). When a fact stops being true, retire it (id, retire: true) and add the new one: never leave two facts that contradict.
  - person update: one line of what just happened between them and the party; each person keeps their last few.
  - faction: standing changes (change: -30 to +30).
  - pin / unpin: plot essentials that must always stay in view (a few at most).
- [canon] facts come from the engine (fights, deaths, travel, deeds): they are true; never contradict them.
- When a scene ends, write endScene.summary: names, what changed, what is owed or open. These summaries become chapters and the saga, so they are the campaign's long memory.
- When the turn says CHAPTER DUE, also fill chapter (title, summary, saga) as it asks; otherwise chapter is null.

STORY MOMENTS
- Some campaigns have illustrated moments. When the story reaches one the turn lists as open, set moment to its id: the players see the picture right after your narration. Once each; otherwise an empty string.

OUT OF CHARACTER (OOC)
- Players sometimes step out of the story to ask you something ("what do we do now?", "is the quest done?"). Those questions come in their own block, OUT-OF-CHARACTER QUESTIONS, never in the transcript. Answer them in ooc: plain, short and friendly, as a game master at the table, not as the story. Name the current objectives, give two or three concrete options (who to talk to, where to go and how: "the exit at P6 leads to the rear pad"; what to try: "the hatch panel has approaches"), and what the game can do. At most about 80 words. No prose, no hidden objectives, no secrets. ooc is an empty string when nobody asked.

MISSIONS AND PACING (the bookkeeping; the discipline is PACING above)
- When the campaign has missions, the turn carries a MISSION block: the active mission, its goal, its open objectives. Play them as PACING says; every scene offers a visible way forward.
- If players stay confused after PACING's in-character options, or anyone asks OOC, answer plainly in ooc.
- Give every open objective a where in missions[] (where {zone, refs: token, object or hazard ids, grid references}): the HERE card and map markers show it.
- When an objective is clearly achieved (see its "done when" in MISSIONS), mark it in missions[] that same turn (status done, or failed when it can no longer happen) and frame the next step; don't linger on a finished scene. Reveal a hidden objective (status revealed) when the party finds it. Mark optional objectives too.
- When a mission completes, close the scene (endScene) and open the next mission's scene. When a closed mission offers several next missions, set missionNext once the story has decided. You may add side jobs (side[]: id, title, text; status done or failed to settle one); you never edit main missions.
- Never resolve the players' choices for them: give options, not answers.

SCENES
- sceneTitle: set a short new title (2-6 words) when the scene changes location or time; otherwise an empty string. endScene: when a scene closes, a 1-3 sentence summary of what matters later (facts, NPCs, promises, open threads); otherwise null.

WORLD RULES THAT NEVER BREAK
- The Unspoken Name: no real-world (real Earth) person, brand, place or work is ever named in the world. Celestials may imitate things; characters never name the originals.
- In-universe language only. The world is a simulation, but NPCs must not learn it (the Knowing); keep that truth as subtext.
- Tone: NPCs are funny the way people are; Celestials are funny the way people are when nothing can hurt them. The tragedy belongs to the NPCs.
- Keep traits that are deliberately ugly in clean in-world language.

FAITH (rules 1.6.1)
- The engine runs prayer, Devotion XP (liked and taboo tags, capped; vows; rites), Witnessed (from a Hymn until the fight ends or the patron intervenes), interventions, Miracles (Faith ${MIRACLE_FAITH} and Devotion ${GATE.miracle}, once a session; each lowers Devotion by ${MIRACLE_COST_LEVELS} levels), grudges and every patron line. Never write a patron's words; never set a TN.
- Your faith ops, only when the story earns them: pact (swear to a patron, or convert; a switch from another patron: the engine rolls if the old one lets go), piece (an NPC teacher with Faith above 5 teaches an Atheist one piece of their faith: name them in from), devotion (Devotion XP, ${NARRATOR_XP.min} to +${NARRATOR_XP.max}, with a reason: a deed the tags miss +${DEVOTION_XP.deedMin} to +${DEVOTION_XP.deedMax}, bringing someone into the faith +${DEVOTION_XP.convert}, breaking character where the patron sees ${-DEVOTION_XP.breakCharacter}; your gains stop at +${NARRATOR_XP.sessionCap} a session per character), rite_kept (a rite the Narrator marks), apostasy (leaving for no one: no pact for ${PACT_COOLDOWN_DAYS} days).
- Each character's belief, Devotion, vow and pieces are in THE PARTY. A patron's likes, taboos and rites: wiki_lookup patron:<id>.

THE WIKI (wiki_lookup)
- You carry only what this moment needs. For anything else, call wiki_lookup with keys before you answer: skill:<id>, trait:<id>, perk:<id>, weapon:<id>, technique:<id>, property:<id>, item:<id>, condition:<id>, class:<id>, patron:<id>, enemy:<tier>, object:<kind>, sigil:<word>, school:<id>, module:<id>, lore:<key>. Batch your keys in one call; at most a few calls per turn. Never look up what is already above.
- Conditions: ${wikiKinds().condition.join(', ')}.${ADV_LIVE ? ' Advanced classes: ' + wikiClasses().filter((id: string) => !(CLASS as any)[id]).join(', ') + '.' : ''} Patrons: ${wikiKinds().patron.join(', ')}.\n- Soul schools: ${wikiKinds().school.join(', ')}. Soul modules: ${wikiKinds().module.join(', ')}.
- Lore keys (beyond what the campaign block already gives you): ${loreKeys().join(', ')}.
- Looked-up lore is still Narrator-only: never reveal its truths outright.

OUTPUT
- Hand in your turn by calling submit_turn exactly once, after any wiki lookups. Every field is required; use empty arrays, an empty string or null when there is nothing to add.

${MAP_TRUTH}`;

export function campaignPrompt(g: GameState): string {
  const c = campaignOf(g)!;
  // Long campaigns come in acts: the current act's zones and fights in full, the rest as one line each.
  const act = c.acts?.find((a) => a.zones.includes(g.story.zone || '')) || c.acts?.[0] || null, here = (zid: string) => !act || act.zones.includes(zid);
  const zones = c.zones.map((z) => here(z.id) ? `- ${z.id}: ${z.name}. ${z.summary}${(z.exits || []).length ? ' Exits: ' + z.exits!.map((e) => e.to + (e.at ? ' at ' + e.at : '') + ' (' + e.text + ')').join('; ') : ''}` : `- ${z.id}: ${z.name} (${c.acts!.find((a) => a.zones.includes(z.id))?.title || 'another act'})`).join('\n');
  return [
    `CAMPAIGN: ${c.title} (${c.kicker})`, 'What the players were told:\n' + c.pitch.join('\n'), c.meta,
    `TONE CHOSEN BY THE HOST: ${g.settings.tone}.`,
    '\nTHE ARC (Narrator only). It is the intended shape, not a script: players can change any of it. Steer by it, never force it.',
    'Beginning: ' + c.arc.beginning, 'Middle: ' + c.arc.middle, 'End: ' + c.arc.end,
    c.secrets?.length ? '\nSECRETS (never state outright):\n' + c.secrets.map((x) => '- ' + x).join('\n') : '',
    c.cast?.length ? '\nCAST:\n' + c.cast.map((x) => `- ${x.name} (${x.role}): ${x.text}`).join('\n') : '',
    '\nZONES (move the party between them with travel):\n' + zones,
    act ? '\nACTS:\n' + c.acts!.map((a) => (a === act ? '▶ NOW: ' : '- ') + a.title + ': ' + a.summary).join('\n') : '',
    missionsCampaign(c) ? '\n' + missionsCampaign(c) : '',
    c.encounters?.some((e) => here(e.zone)) ? '\nPREPARED FIGHTS (use when the story gets there; adapt freely):\n' + c.encounters.filter((e) => here(e.zone)).map((e) => `- ${e.name} in ${e.zone}, ${e.difficulty}: ${e.when} Enemies: ${e.enemies.map((f) => f.name + ' (' + f.tier + ', ' + f.weapon + (f.at ? ', at ' + f.at : '') + ')').join(', ')}.`).join('\n') : '',
    c.lore === 'docs/lore/MPAT-and-M813.md' ? '\nCAMPAIGN SOURCE (the canon behind this campaign; the incident is history the players are about to live):\n' + clean(drop(m813, ['Use in the game'])) : c.lore ? '\nCAMPAIGN LORE:\n' + c.lore : '',
    '\nWORLD BIBLE (Narrator only; never reveal its truths outright; only the parts this campaign needs):\n' + clean(bibleFor(g)),
    takes(loreFor(g), 'sector-earth') ? '\nTHE EARTH SECTOR (the party\'s origins only):\n' + clean(sectorFor(g)) : '',
    takes(loreFor(g), 'epccg-cast') ? '\nTHE EPCCG CAST AND FACTIONS:\n' + clean(cast) : '',
  ].filter(Boolean).join('\n');
}

/** A caster's magic, for the party block (static between level-ups; the live meters are in PARTY CONDITION). */
function magicBrief(c: Character): string {
  const words = (c.sigils || []).map((w) => SIGIL[w]?.word || w), designs = (c.outbursts || []).map((d) => `${d.id} ${d.name} (${[d.school, d.school2].filter(Boolean).join('+')}${d.modules.length ? ': ' + d.modules.join(', ') : ''}${d.tone && d.tone !== 'raw' ? ', ' + d.tone : ''})`);
  if (!words.length && !designs.length) return '';
  return `\n  Magic: ${words.length ? 'Sigil words ' + words.join(', ') + (hasEvoker(c) ? '' : carriesEvoker(c) ? ' (Evoker in the pack, not in hand: no Sigils until held)' : ' (no Evoker carried)') : 'no Sigil words'}; ${designs.length ? 'Outburst designs ' + designs.join('; ') + (hasEmanator(c) ? '' : carriesEmanator(c) ? ' (Emanator in the pack, not in hand: Outbursts draw on the air)' : ' (no Emanator carried)') : 'no Outbursts'}.`;
}
/** Physical 2.0 (rules 1.12): what a character has ready with weapons, by name (the engine runs every technique). */
function techniqueBrief(c: Character): string {
  const nm = (ids: string[]) => ids.map((id) => TECHNIQUE[id]?.name || id).join(', ');
  const melee = readyTechniques(c, 'melee'), ranged = readyTechniques(c, 'ranged'), lent = weaponTeaches(c.weapon), rest = physOf(c).known.filter((id) => !melee.includes(id) && !ranged.includes(id));
  if (!melee.length && !ranged.length && !lent) return '';
  return `\n  Techniques (engine-run; wiki_lookup technique:<id>): ${[melee.length ? 'melee ' + nm(melee) : '', ranged.length ? 'ranged ' + nm(ranged) : '', lent && !melee.includes(lent) && !ranged.includes(lent) ? 'lent by the weapon: ' + nm([lent]) : '', rest.length ? 'known, not ready: ' + nm(rest) : ''].filter(Boolean).join('; ')}.`;
}
const pts = (c: Character) => Object.entries(c.skills).filter(([, p]) => p > 0).sort((a, b) => b[1] - a[1]);
export function characterBrief(g: GameState, c: Character): string {
  const skills = pts(c).map(([id, n]) => `${SKILL[id].name} (${id}) ${n} [${checkMod(c, id) >= 0 ? '+' : ''}${checkMod(c, id)}]`).join(', ');
  // Items by id (plan 4.3): the engine runs their numbers; "*" marks a part that is yours to rule (wiki_lookup the id for
  // the full text); a lane's brief() gives the remainder in a few words. Held Ultimates are listed too (never unheld ones).
  const items = holdersOf({ c }), tag = (h: any) => { const b = briefOf(h); return b == null ? '' : b ? '*: ' + b : '*'; };
  const traits = items.filter((h) => h.kind === 'trait').map((h) => `${h.info.name} [${h.key}]${tag(h)}`).join(', ') || 'none';
  // An Ultimate is secret (never in the wiki), so a held one carries its text here; there are only a handful.
  const perks = items.filter((h) => h.kind === 'perk').map((h) => h.tier === 'ultimate' ? `${h.info.name} [${h.key}] (ultimate): ${h.info.text}` : `${h.info.name} [${h.key}] (${h.tier})${tag(h)}`).join(', ') || 'none';
  // Skill Mastery unlocks the engine runs (Overclock, Twin Draw, Proven Formula, Paint the Field: rules 1.4 items 482-485).
  const unlocks = items.filter((h) => h.kind === 'skill').map((h) => `${h.info.name} [${h.key}]${tag(h)}`).join(', ');
  const moves = items.filter((h) => h.kind === 'class').map((h) => `${h.info.name} [${h.key}]${tag(h)}`).join(', ');
  const over = pts(c).filter(([, n]) => n >= 5).map(([id]) => `${SKILL[id].name}: ${(SKILL[id] as any).overreach?.text || ''}`).join(' | ') || 'none yet';
  const voices = pts(c).map(([id]) => { const v = (SKILL[id] as any).voice || {}; return `  - ${SKILL[id].name}: ${v.persona} Wants: ${v.wants} Style: ${v.style} ${v.never || ''}`; }).join('\n');
  const id = c.identity || {};
  return `CHARACTER ${c.name} (charId ${c.id})${c.dead ? ' — DEAD' : ''}
  Origin: ${c.origin}. Level ${c.level}. Class: ${c.classId ? CLASS[c.classId].name + ' ' + ['', 'I', 'II', 'III'][classRank(c)] + (c.advancedClass && ADVANCED[c.advancedClass] ? (advancedActive(c.advancedClass) ? ' and ' + ADVANCED[c.advancedClass].name + ' (advanced)' : ' (advanced classes are being rebuilt: their ' + ADVANCED[c.advancedClass].name + ' gives nothing for now)') : '') + (moves ? ' — moves: ' + moves : '') : 'none yet (level 3 offers ' + eligibleClasses(c).map((x) => x.name).join(' or ') + ')'}.
  Max HP ${maxHp(c)}. Weapon: ${c.weapon}. Identity: ${Object.entries(id).filter(([k, v]) => v && !/^song/.test(k)).map(([k, v]) => k + ' ' + v).join('; ') || 'not given'}${songOf(c) ? '; has a favourite song (never name it)' : ''}.
  Skills: ${skills}.
  Traits: ${traits}
  Perks: ${perks}.${unlocks ? ' Skill unlocks (engine-run): ' + unlocks + '.' : ''} Overreach triggers: ${over}${techniqueBrief(c)}${magicBrief(c)}${standingBrief(g, c)}
  Voices:
${voices}`;
}

/** Blessing 2.0: belief, patron and Devotion, the vow, an Atheist's pieces and learned Hymns, in one short clause. */
export function faithBrief(c: Character, g?: GameState): string {
  const b = beliefOf(c), pieces = Object.entries((c as any).faithPieces || {}).filter(([, n]) => (n as number) > 0).map(([p, n]) => p + ' ' + n + '/3');
  const v: any = (c as any).vow, vow = v ? ', vow ' + v.id + ' ' + v.state : '';
  // With the game: the engine's view adds what limits your ops (your devotion gains used, a grudge, the pact cooldown).
  const fv = g ? faithView(g, c.id) : null, used = fv?.narratorXp.session || 0;
  const more = (used ? ', your devotion gains ' + used + '/' + NARRATOR_XP.sessionCap + ' this session' : '') + (fv?.grudge ? ', grudge of ' + fv.grudge.patron + ' (' + fv.grudge.sessionsLeft + ' more sessions)' : '')
    + (fv?.pactCooldown ? ', no pact for ' + fv.pactCooldown.daysLeft + ' days' : '');
  if (b.kind === 'faithful') return 'faith: Faithful to ' + b.patron + ', Devotion ' + devotionNow(c) + '/10 (' + devotionXpOf(c) + ' XP), Faith ' + (c.skills.faith || 0) + vow + (pieces.length ? ', pieces ' + pieces.join(', ') : '') + more;
  if (!pieces.length && (c.skills.faith || 0) < FAITH_MIN && !v && !more) return '';
  return 'faith: Atheist, Faith ' + (c.skills.faith || 0) + vow + (pieces.length ? ', pieces ' + pieces.join(', ') : '') + more;
}
/** Rules 1.3 standing: patron and Devotion, Karma, tutors, companions, story conditions, Narrator-set item state. One
 * short line, only what is set (nothing for most characters). */
function standingBrief(g: GameState, c: Character): string {
  const bits: string[] = [];
  const fb = faithBrief(c, g); if (fb) bits.push(fb);
  if (c.karma) bits.push('Karma ' + c.karma);
  if (c.tutors?.length) bits.push('tutors for ' + c.tutors.join(', '));
  if (c.companions?.length) bits.push('companions ' + c.companions.map((x) => x.name + ' (' + x.kind + (x.hp === 0 ? ', destroyed' : '') + ')').join(', '));
  const conds = storyConds(g, c); if (conds.length) bits.push('conditions ' + conds.join(', '));
  const plot = (c.pack || []).filter((x) => x.kind === 'plot'); if (plot.length) bits.push('plot items ' + plot.map((x) => (x.qty > 1 ? x.qty + ' × ' : '') + x.name + ' [' + x.id + ']').join(', '));
  const st = Object.entries(c.state || {}); if (st.length) bits.push('state ' + st.map(([k, v]) => k + '=' + (typeof v === 'string' ? v : JSON.stringify(v))).join('; ').slice(0, 160));
  return bits.length ? '\n  Standing: ' + bits.join('; ') + '.' : '';
}
export function partyPrompt(g: GameState): string {
  // Only combos someone in the party can earn right now (5+ in every skill, not yet held): the rest is noise and a spoiler.
  const combos = PERKS.filter((p: any) => p.tier === 'achieved' && Object.values(g.characters).some((c) => !c.dead && !comboEligible(c, p.id))).map((p: any) => `${p.id} (${p.skills.map((s: string) => SKILL[s].name).join(' + ')} 5 each): deed "${p.deed}"`).join('\n');
  return 'THE PARTY\n' + Object.values(g.characters).map((c) => characterBrief(g, c)).join('\n\n') + '\n\nSKILL IDS: ' + SKILLS.map((s) => s.id).join(', ') + '\n\nCOMBO PERKS THE PARTY CAN EARN NOW (perkId, skills, deed):\n' + (combos || 'none yet');
}

/** The uncached part: memory, recent transcript, and what this call must do. */
export function turnPrompt(g: GameState): string {
  const w = g.story.work!;
  // The last two narrations sit in RECENT NARRATION (marked already said); the transcript points to them, so they cost nothing twice.
  const said = recentIds(g), craft = [recentNarrationBlock(g), w.kind === 'opening' ? '' : lastTurnAudit(g)].filter(Boolean).join('\n\n');
  const recent = g.story.entries.filter((e) => !e.to && !e.ooc && !/ joined the room\.$| is skipped this round\.$| is locked in\.$|^Round \d+\.$| (moves|sprints) to [A-Z]+\d+ \(/.test(e.text))/* the last 40 lines, inside a character budget (oldest dropped first) */.slice(-40).map((e) => {
    if (e.kind === 'player') return `[${e.head}${e.ref ? ' · ' + e.ref : ''}] ${e.text}${e.roll ? ' (the player asks you to pick a roll for this)' : ''}`;
    if (e.kind === 'narration') return said.has(e.id) ? '[Narrator] (in RECENT NARRATION below)' : `[Narrator] ${e.text}`;
    if (e.kind === 'check') return `[Check] ${e.head} — ${e.text}`;
    if (e.kind === 'scene') return `[New scene] ${e.text}`;
    return `[${e.kind}] ${e.text}`;
  }).reverse().reduce((acc: string[], l) => (acc.join('\n').length + l.length > TRANSCRIPT_CHARS ? acc : [...acc, l]), []).reverse().join('\n');
  const choices = g.overreach.filter((o) => o.choice).map((o) => `${g.characters[o.charId]?.name} ${o.choice === 'resist' ? 'resisted' : 'indulged'} ${SKILL[o.skill].name}'s push: "${o.push}"`).join('\n');
  const job = w.kind === 'opening'
    ? 'This is the OPENING of session 1. ' + (campaignOf(g)?.opening || 'Set the first scene from the campaign.') + ' Give a sceneTitle, give every character a reason to act, place everyone you name on the map (npcs[]), add hooks, and end on a concrete hook. No checks yet.'
    : w.kind === 'round' ? `Round ${g.story.round} has closed: every player has used their turn. Answer what needs you since your last turn (lines said, examines, attempts, travel requests, anyone spotted), all together. Request checks where outcomes are uncertain.`
    : w.kind === 'epilogue' ? epilogueJob(g)
    : w.kind === 'results' ? 'The engine has rolled the checks you asked for (see the last [Check] lines) and the players made their Overreach choices. Narrate the outcomes, honouring each success and failure exactly, then open the next round. Award XP if something was achieved.'
    : `The fight is over. The engine's report:\n${w.note || ''}\nNarrate the aftermath from these moments (who did what, who is hurt and where they stand), answer what was said mid-fight where it deserves a reply (lines marked "answered in the fight" are settled: follow them through, don't rule on them again), then open the next round. The engine already gave combat XP.`;
  const hurt = Object.values(g.characters).map((c) => `${c.name}: ${c.dead ? 'dead' : c.hp + '/' + maxHp(c) + ' HP, Echo ' + c.echo + ', ' + c.xp + ' XP (level ' + (c.level + 1) + ' at ' + xpForLevel(c.level + 1) + ')'}${c.injuries?.length ? ', injured ' + c.injuries.map((i) => (i.side ? i.side + ' ' : '') + i.loc).join(', ') : ''}${c.dead ? '' : liveMagic(g, c)}`).join('; ') + `. Mana here: ${g.story.mana ?? 15} (${manaBand(g.story.mana ?? 15).id})` + sigilsOnMap(g);
  const pos = positionsOf({ ...g, story: { ...g.story, positions: { ...(g.story.positions || {}) } } });
  const where = Object.values(g.characters).filter((c) => !c.dead && pos[c.id]).map((c) => c.name + ' ' + refOf(pos[c.id])).join(', ');
  const objs = storyObjects({ ...g, story: { ...g.story, objects: g.story.objects ? [...g.story.objects] : undefined } })
    // Plain cover and exits are the engine's business (exits are listed with the zones); POIs, hazards, doors and anything with approaches stay.
    .filter((o) => o.approaches.length || !['crate', 'pillar', 'rubble', 'low_wall', 'barricade', 'exit'].includes(o.kind));
  const ground = groundText(objs.filter((o) => o.kind === 'pile')); objs.splice(0, objs.length, ...objs.filter((o) => o.kind !== 'pile'));
  const objText = objs.map((o) => `${o.id} ${o.name} (${o.kind}${o.hidden ? ', hidden' : ''}${o.locked ? ', locked' : ''}${o.open ? ', open' : ''}${o.hp != null && o.hp <= 0 ? ', broken' : o.hp != null && o.max && o.hp < o.max ? ', damaged' : ''}${o.resolved ? ', dealt with' : ''}${o.kind === 'sigil_mark' ? ', the word ' + String(o.word || '?').toUpperCase() + ' (' + (o.age || 'old') + ', ' + (o.damage || 'intact') + ')' : ''}${o.items ? ', holds: ' + (o.items.map((x) => (x.qty > 1 ? x.qty + '× ' : '') + (x.name || x.item)).join(', ') || 'nothing') : ''}) at ${refOf(o.pos)}${o.text ? ': ' + o.text : ''}`
    + (o.approaches.length ? '\n    approaches: ' + apText(o.approaches) : '')).join('\n  ');
  const mus = g.music?.now ? g.characters[g.music.now.charId] : null;
  const music = mus ? `\n\nMUSIC: ${mus.name}'s song is playing for the room (${g.music!.now!.layer === 'pin' ? 'kept on by their music trait' : g.music!.now!.reason}). You may let it colour the scene; never name the song or the artist.` : '';
  const moments = momentsOpen(g).map((m) => `${m.id}: ${m.when}`).join('\n  ');
  const people = npcsOf({ ...g, story: { ...g.story } }).map((n) => `${n.id} ${n.name} (${n.ally ? 'ally' : n.side}, ${n.kind && n.kind !== 'human' ? n.kind + ', ' : ''}${n.tier}, ${n.weapon}) at ${refOf(n.pos)}${n.analyzed ? ', analyzed' : ''}${n.hidden ? ', lurking (unseen)' : ''}${n.alerted ? ', alerted' : ''}${n.prisoner ? ', prisoner' : ''}`
    + (n.wants ? '\n    wants: ' + n.wants + (n.wantsShown ? ' (asked)' : '') : n.side !== 'hostile' ? '\n    wants: (none set)' : '') + (n.knows ? '\n    knows ' + n.knows.objective + ': ' + n.knows.hint + (n.informed ? ' (told)' : '') : '') + (n.talk?.length ? '\n    talk: ' + apText(n.talk) : '')).join('\n  ');
  const world = worldBlock(g);
  const sneaking = Object.values(g.characters).filter((c) => g.story.sneak?.[c.id]).map((c) => c.name + (g.story.hidden?.[c.id] ? ' (hidden)' : ' (sneaking, but seen)')).join(', ');
  const M = memoryOf({ ...g }), sceneMem = M.scenes.map((x) => `S${x.n} ${x.title}: ${x.summary}`).join('\n') || (g.story.journal.slice(-6).map((x, i) => `${i + 1}. ${x}`).join('\n') || 'none yet');
  const lookFor = [recent, g.story.scene.title, zoneMap(g).name, people, objs.map((o) => o.name).join(' ')].join('\n');
  const active = memoryBlock(selectMemory({ ...g }, lookFor, ACTIVE_MEMORY_CHARS));
  const chapterJob = chapterDue(g) ? `\n\nCHAPTER DUE: also fill chapter. Roll these ${SCENES_PER_CHAPTER} oldest scenes into one chapter (title, and a summary of at most 1,200 characters keeping names, promises, debts, deaths and open questions), and rewrite the saga, the story so far, in at most 3,500 characters with this chapter folded in:\n${M.scenes.slice(0, SCENES_PER_CHAPTER).map((x) => `S${x.n} ${x.title}: ${x.summary}`).join('\n')}` : '';
  const mission = missionBrief(g), opening = w.kind === 'epilogue' ? '' : actOpening(g);
  const ooc = (g.story.oocAsk || []).map((q) => `- ${Object.values(g.characters).filter((c) => c.owner === q.who).map((c) => c.name).join(' & ') || 'A spectator'}: ${q.text}`).join('\n');
  const redo = w.redo ? `\n\nREROLL: the players voted to redo your last answer to this moment. Their note: "${w.redo}". Answer the same moment again, differently, honouring the note where the rules and the story allow; the old answer never happened.` : '';
  return `RECENT SCENES (not yet in a chapter):\n${sceneMem}\n\nACTIVE MEMORY (picked for this moment; use recall for anything else):\n${active || 'nothing recorded yet'}${chapterJob}${moments ? '\n\nSTORY MOMENTS OPEN HERE (show one with moment when the story reaches it):\n  ' + moments : ''}\n\nPARTY CONDITION: ${hurt}${music}\n\nTHE MAP WHERE THE STORY IS NOW:\n${mapBrief(zoneMap(g))}\n\nWHERE EVERYONE STANDS (${zoneMap(g).name}): ${where || 'unknown'}${sneaking ? '\nSNEAKING: ' + sneaking : ''}\n\nPEOPLE AND ENEMIES ON THE MAP:\n  ${people || 'none'}\n\nOBJECTS ON THE MAP:\n  ${objText || 'none besides cover'}${ground}${world}${rulingsPrompt(g) ? '\n\n' + rulingsPrompt(g) : ''}${mission ? '\n\n' + mission : ''}\n\nCURRENT SCENE: ${g.story.scene.title || '(none yet)'} (day ${dayOf(g)})\n\nRECENT TRANSCRIPT (oldest first):\n${recent || '(the session is just starting)'}\n${choices ? '\nOVERREACH CHOICES:\n' + choices + '\n' : ''}${craft ? '\n' + craft + '\n' : ''}\nYOUR JOB NOW: ${job}${opening ? '\n' + opening : ''}${ooc ? '\n\nOUT-OF-CHARACTER QUESTIONS (answer them in ooc; the players asked them outside the story):\n' + ooc : ''}${redo}`;
}

/** Rules 1.9: the piles on the ground, compactly (at most 6 piles, 3 entries each, "+N more"), for OBJECTS ON THE MAP. */
export const GROUND_PILES = 6, GROUND_ENTRIES = 3;
export function groundText(piles: any[]): string {
  if (!piles.length) return '';
  const one = (o: any) => { const e = pileEntries(o); return refOf(o.pos) + (o.hidden ? ' (unseen by the players)' : '') + ': ' + e.slice(0, GROUND_ENTRIES).map((x) => x.label).join(', ') + (e.length > GROUND_ENTRIES ? ' +' + (e.length - GROUND_ENTRIES) + ' more' : ''); };
  return '\n  ON THE GROUND (piles; players pick them up): ' + piles.slice(0, GROUND_PILES).map(one).join('; ') + (piles.length > GROUND_PILES ? '; +' + (piles.length - GROUND_PILES) + ' more piles' : '');
}
/** Approaches as the Narrator reads them: number, label, skills, TN, effects, and every try. */
function apText(list: Approach[]): string {
  return list.map((a, i) => `${i + 1}. ${a.label} [${a.skills.join(a.pick === 'best' ? '/' : '+')} TN ${a.tn}${a.success ? ', ' + a.success + (a.objective ? ' ' + a.objective : '') : ''}${a.fail ? ', fail ' + a.fail + (a.failCondition ? ' ' + a.failCondition : a.failItem ? ' ' + a.failItem : '') : ''}${a.gone ? ', gone' : ''}]${a.tries.length ? ' tries: ' + a.tries.map((t) => t.name + ' ' + (t.ok ? 'succeeded' : 'failed') + ' (' + t.total + ')').join(', ') : ''}`).join('; ');
}
/** Rules 1.7 for the turn: hazards and triggers here, who carries whom, and what the engine ran since your last turn. */
export function worldBlock(g: GameState): string {
  const out: string[] = [];
  const hz = zoneHazards({ ...g });
  if (hz.length) out.push('HAZARDS ON THE MAP (the engine fires them per tile entered):\n  ' + hz.map((h) => `${h.id} ${h.name || h.kind} (${h.kind}, ${h.severity}${h.hidden ? ', unseen by the players' : ''}) at ${h.tiles.slice(0, 6).map(refOf).join(' ')}${h.tiles.length > 6 ? ' +' + (h.tiles.length - 6) : ''}${h.safe?.length ? '; safe path ' + h.safe.map(refOf).join(' ') : ''}${h.spent?.length ? '; spent ' + h.spent.map(refOf).join(' ') : ''}${h.approaches.some((a) => a.tries.length) ? '\n    approaches: ' + apText(h.approaches) : ''}`).join('\n  '));
  const tg = zoneTriggers({ ...g }).filter((t) => !t.fired);
  if (tg.length) out.push('TRIGGERS SET (unseen; they fire without you):\n  ' + tg.map((t) => `${t.id} on ${t.when}${t.tiles ? ' ' + t.tiles.slice(0, 4).map(refOf).join(' ') + (t.tiles.length > 4 ? ' +' + (t.tiles.length - 4) : '') : t.objId ? ' ' + t.objId : t.objective ? ' ' + t.objective : ''}: ${t.then}${t.spawn?.length ? ' ' + t.spawn.map((p) => p.name).join(', ') : ''}`).join('\n  '));
  const carry = Object.values(g.characters).filter((c) => c.carried?.length).map((c) => c.name + ' carries ' + carriedOf(c).map((x) => x.name + ' (' + x.kind + ', ' + x.kg + ' kg, ' + x.id + ')').join(', '));
  if (carry.length) out.push('CARRIED: ' + carry.join('; '));
  const ev = g.story.events || [];
  if (ev.length) out.push('SINCE YOUR LAST TURN (the engine ran these; narrate them, never re-roll them):\n' + ev.map((e) => '- ' + e.text).join('\n'));
  return out.length ? '\n\n' + out.join('\n\n') : '';
}

/** Sigil magic standing on the area map, for PARTY CONDITION (only when there is some): glyphs by who drew them, and
 * fields, traps and turrets with their words, so the Narrator describes what the engine placed (an enemy's trap is
 * marked unseen: the players don't know it is there). */
export function sigilsOnMap(g: GameState): string {
  const W = (ws: string[]) => ws.map((w) => SIGIL[w]?.word || w.toUpperCase()).join('·');
  const by: Record<string, string[]> = {};
  for (const gl of g.story.glyphs || []) (by[gl.who] ||= []).push((SIGIL[gl.word]?.word || gl.word) + ' ' + refOf(gl.pos));
  const out = Object.entries(by).map(([who, l]) => who + "'s glyphs " + l.join(', '));
  for (const z of (g.story.zones || []) as any[]) {
    const kind = z.kind === 'wall' ? 'field' : z.kind; if (!['field', 'trap', 'turret', 'veil', 'light', 'residue', 'linger'].includes(kind)) continue;
    const t = z.tiles || [], where = t.length ? refOf(t[0]) + (t.length > 1 ? ' +' + (t.length - 1) + ' tiles' : '') : '';
    // Outburst 4.0 (rules 1.8): a feeling's residue and a Linger keep working on the area map after a fight.
    if (kind === 'residue' || kind === 'linger') { out.push(z.who + "'s " + (kind === 'residue' ? (FEELING[z.feeling]?.name || z.feeling) + ' residue (' + (z.residueKind || 'harms') + ')' : (z.linger?.school || '') + ' Linger') + ' at ' + where + ', ' + z.left + ' rounds'); continue; }
    out.push(z.who + "'s " + kind + (z.words?.length ? ' ' + W(z.words) : '') + ' at ' + where + (z.left != null ? ', ' + z.left + ' rounds' : '') + (z.side === 'foe' && z.kind === 'trap' && !(z.spotted || []).includes('pc') ? ' (unseen by the players)' : ''));
  }
  for (const tr of g.story.traces || []) out.push('a scuffed ' + (SIGIL[tr.word]?.word || tr.word.toUpperCase()) + ' trace at ' + refOf(tr.pos));
  return out.length ? '. Sigils on the map: ' + out.join('; ') : '';
}
/** A caster's live magic for PARTY CONDITION: MP, Evoker charge and cores, Flux, Strain, a held Outburst. */
function liveMagic(g: GameState, c: Character): string {
  const m = g.story.magic?.[c.id], out: string[] = [];
  if (carriesEmanator(c)) out.push(`MP ${mpNow(c)}/${maxMp(c)}${hasEmanator(c) ? '' : ' (Emanator in the pack)'}`);
  if (carriesEvoker(c)) out.push(`Evoker ${evoChargeNow(c)} charge${hasEvoker(c) ? '' : ' (in the pack)'}, ${coresCarried(c)} spare cores`);
  if (m?.flux) out.push(`Flux ${m.flux}`); if (m?.strain) out.push(`Strain ${m.strain}`); if (m?.held) out.push('holding an Outburst');
  const conds = Object.keys(m?.conds || {}); if (conds.length) out.push(conds.join(', '));
  return out.length ? ', ' + out.join(', ') : '';
}

/** JSON schema for one Narrator turn (structured outputs: every object closed, every field required). */
export function turnSchema(g: GameState) {
  const charIds = Object.keys(g.characters);
  const skill = { type: 'string', description: 'A skill id from SKILL IDS' };
  // Long id lists (weapons, items, perks) stay out of the schema: the grammar would get too large. The prompt lists them; an unknown loot id becomes a plot item, other unknown ids are ignored.
  const obj = (props: Record<string, any>) => ({ type: 'object', additionalProperties: false, properties: props, required: Object.keys(props) });
  const tn = { type: 'integer', enum: [8, 12, 16, 20] };
  const charId = { type: 'string', enum: charIds.length ? charIds : ['none'] };
  return obj({
    narration: { type: 'string' },
    sceneTitle: { type: 'string' },
    hooks: { type: 'array', items: obj({ skill: skill, tn, truth: { type: 'string', enum: ['true', 'partial', 'misleading'] }, line: { type: 'string' } }) },
    checks: { type: 'array', items: obj({ charId, skills: { type: 'array', items: skill }, tn, stakes: { type: 'string' }, tags: { type: 'array', items: { type: 'string' }, description: 'Check tags from the rules (dialogue, crowd, military…); [] if none fit' } }) },
    perkRulings: { type: 'array', description: 'Answers to PENDING RULINGS: accepted false refuses the use (it is refunded)', items: obj({ id: { type: 'string' }, accepted: { type: 'boolean' } }) },
    overreach: { type: 'array', items: obj({ charId, skill: skill, push: { type: 'string' } }) },
    xp: { type: 'array', items: obj({ charId: { type: 'string', enum: [...charIds, 'all'] }, source: { type: 'string', enum: ['dialogue', 'discovery', 'quest'] }, amount: { type: 'integer' }, reason: { type: 'string' } }) },
    deeds: { type: 'array', items: obj({ charId, perkId: { type: 'string' }, deed: { type: 'string' } }) },
    legends: { type: 'array', items: obj({ charId, deed: { type: 'string' } }) },
    combat: { anyOf: [{ type: 'null' }, obj({
      name: { type: 'string' }, map: { type: 'string', enum: [...(campaignOf(g)?.zones.map((z) => z.id) || []), 'yard'] }, difficulty: { type: 'string', enum: ['easy', 'standard', 'hard', 'boss'] },
      enemies: { type: 'array', items: obj({ name: { type: 'string' }, tier: { type: 'string', enum: ENEMIES.map((e: any) => e.id) }, weapon: { type: 'string' }, at: { type: 'string' } }) },
      level_shift: { type: 'integer', minimum: -3, maximum: 2, description: 'Enemy levels above or below the squad (0: equal)' },
    })] },
    endScene: { anyOf: [{ type: 'null' }, obj({ summary: { type: 'string' } })] },
    moves: { type: 'array', items: obj({ charId, to: { type: 'string' } }) },
    loot: { type: 'array', items: obj({ charId, item: { type: 'string' }, qty: { type: 'integer' }, rarity: { type: 'string', enum: ['standard', 'fine', 'masterwork', 'relic', 'celestial'] }, name: { type: 'string' }, text: { type: 'string' }, note: { type: 'string' } }) },
    travel: { type: 'string', enum: ['', ...(campaignOf(g)?.zones.map((z) => z.id) || [])] },
    treat: { type: 'array', items: obj({ charId, loc: { type: 'string', enum: ['arm', 'leg', 'all'] } }) },
  });
}

/** The Narrator's wiki tool (spec: The Narrator's wiki): look up rules entries and lore by key when the moment needs them. */
export const WIKI_TOOL = {
  name: 'wiki_lookup',
  description: 'Look up what a game term is and does, or a piece of world lore, by key. Use it when the moment needs a detail you were not given: a weapon or item before you hand it out or describe it, a condition, a trait or perk a character has, a patron, a class, or lore beyond what the campaign block holds. Keys look like "weapon:service_pistol", "condition:bleeding", "trait:headbanger", "lore:worlds/the-crawlers". Ask for several keys at once; do not look up what is already in your context.',
  input_schema: { type: 'object', additionalProperties: false, properties: { keys: { type: 'array', items: { type: 'string' }, description: 'Up to 8 keys' } }, required: ['keys'] },
};
/** What the wiki tool returns for some keys: data entries from the engine, lore chunks from the docs. */
/** A patron's rites for wiki_lookup (the glossary has the rest): which the engine runs and which are the Narrator's to mark. */
function patronRites(id: string): string {
  const p: any = FAITH_PATRON[id]; if (!p || !(p.rites || []).length) return '';
  return ' Rites (once a session, +' + DEVOTION_XP.rite + ' Devotion XP): ' + p.rites.map((r: any) => r.id + ' "' + r.name + '" (' + (r.engine ? 'a player button' : 'yours: faith rite_kept') + '): ' + r.text).join(' ');
}
export function wikiAnswer(keys: string[]): string {
  return (Array.isArray(keys) ? keys : []).slice(0, 8).map((k) => {
    const key = String(k || '').trim();
    if (key.startsWith('lore:')) {
      const want = key.slice(5);
      if (want === 'sector-earth') return '[' + key + ']\n' + clean(drop(sectorEarth, ['Starting hooks']));
      if (want === 'epccg-cast') return '[' + key + ']\n' + clean(cast);
      const picked = BIBLE.filter((ch) => takes([want], ch.key));
      return picked.length ? '[' + key + ']\n' + clean(picked.map((ch) => ch.text).join('')).trim() : '[' + key + '] No such lore. Lore keys: ' + loreKeys().join(', ');
    }
    const e = wikiLookup(key);
    if (e && key.startsWith('patron:')) return '[' + e.key + '] ' + e.text + patronRites(key.slice(7));
    return e ? '[' + e.key + '] ' + e.text : '[' + key + '] No such entry. Kinds: ' + Object.keys(wikiKinds()).join(', ') + ', lore. Check the id lists in your rules.';
  }).join('\n\n');
}


/** The tool the Narrator hands its turn in with: the turn schema plus map objects. Not strict: no grammar limit. */
export function submitTool(g: GameState) {
  const schema: any = turnSchema(g);
  // Rules 1.7: one approach shape for objects and people (success and fail effects the engine applies). Static enums only.
  const ST = { type: 'string' }, APPROACH = { type: 'object', properties: { label: ST, skills: { type: 'array', items: ST }, tn: { type: 'integer', enum: [8, 12, 16, 20] }, stakes: ST,
    success: { type: 'string', enum: ['', 'remove', 'open', 'reveal', 'disarm', 'loot', 'advance', 'ally', 'inform'] }, fail: { type: 'string', enum: ['', 'hurt', 'alarm', 'condition', 'jam', 'lose', 'hostile'] },
    objective: ST, failCondition: ST, failItem: ST }, required: ['label', 'skills', 'tn', 'stakes', 'success'] };
  const AREA = { tiles: { type: 'array', items: ST }, rect: { type: 'object', properties: { from: ST, to: ST } } };
  schema.properties.objects = { type: 'array', description: 'Place, update or remove map objects and write approaches (empty when nothing changes)', items: { type: 'object', properties: {
    action: { type: 'string', enum: ['place', 'update', 'remove'] }, id: { type: 'string', description: 'The object id, for update and remove' },
    kind: { type: 'string', enum: OBJ_KINDS }, at: { type: 'string', description: 'A grid reference, for place' },
    name: { type: 'string' }, text: { type: 'string' }, hidden: { type: 'boolean' }, locked: { type: 'boolean' },
    approaches: { type: 'array', items: APPROACH },
    items: { type: 'array', description: 'cache: its contents (loot shape)', items: { type: 'object', properties: { item: ST, qty: { type: 'integer' }, rarity: ST, name: ST, text: ST }, required: ['item', 'qty'] } },
    word: { type: 'string', description: 'sigil_mark: its Sigil word id' }, age: { type: 'string', enum: ['fresh', 'old', 'ancient'] }, damage: { type: 'string', enum: ['intact', 'worn', 'broken'] },
  }, required: ['action'] } };
  // Plain text, not an enum: tool definitions must not change during a session, or the whole prompt cache resets.
  schema.properties.moment = { type: 'string', description: 'A story moment id from STORY MOMENTS OPEN HERE (an illustration to show now), or empty' };
  schema.properties.npcs = { type: 'array', description: 'Place, move, update or remove people and enemies on the map; carry or drop someone (empty when nothing changes)', items: { type: 'object', properties: {
    action: { type: 'string', enum: ['place', 'move', 'update', 'remove', 'carry', 'drop'] }, charId: { type: 'string', description: 'carry, drop: the carrier' },
    avatar: ST, wants: ST, knows: { type: 'object', properties: { objective: ST, hint: ST } }, talk: { type: 'array', items: APPROACH }, id: { type: 'string', description: 'The token id, for move, update and remove' }, name: { type: 'string' },
    side: { type: 'string', enum: ['hostile', 'neutral'] }, tier: { type: 'string', enum: ['vermin', 'minion', 'soldier', 'elite', 'boss'] }, weapon: { type: 'string', description: 'A weapon id' }, at: { type: 'string', description: 'A grid reference, for place and move' },
    hidden: { type: 'boolean', description: 'Lurking: unseen by the players until spotted (place, update)' },
  }, required: ['action'] } };
  schema.properties.actions = { type: 'array', description: 'Mechanical actions players declared in words, run as their own actions when the next round opens (empty otherwise)', items: { type: 'object', properties: {
    charId: { type: 'string', enum: Object.keys(g.characters) }, act: { type: 'string', enum: ['move', 'attack', 'analyze', 'stim', 'door', 'reload', 'load', 'clear', 'repair', 'prone', 'carry', 'put_down', 'search', 'pickup', 'attempt', 'ask', 'draw', 'evoke', 'read', 'scuff', 'vent', 'core', 'outburst', 'pump', 'revert', 'release', 'letgo', 'steady', 'feed', 'heartwatch', 'syphon', 'crystallise'] },
    to: { type: 'string', description: 'A grid reference, for move' }, how: { type: 'string', enum: ['move', 'sprint', 'sneak'] }, targetId: { type: 'string', description: 'A token id or exact name, or a charId or character name' },
    mode: { type: 'string', enum: ['shot', 'aimed', 'melee'] }, objId: { type: 'string', description: 'An object id: a door for door; anything to attack' },
    word: { type: 'string', description: 'A Sigil word id, for draw (on the caster\'s own tile)' }, stroke: { type: 'string', description: 'draw: stroke id, new or junction:<id>' }, tile: { type: 'string', description: 'A grid reference: for evoke, a glyph of the Line' },
    aims: { type: 'array', items: { type: 'string' }, description: 'evoke TWICE: the other missiles\' aims' }, dest: { type: 'string', description: 'evoke STEP: where they land' },
    order: { type: 'string', enum: ['halt', 'kneel', 'drop', 'move'], description: 'evoke COMMAND' }, orderTo: { type: 'string', description: 'COMMAND move: the tile' },
    aim: { type: 'string', description: 'A grid reference or token id, for evoke, outburst and release' }, design: { type: 'string', description: 'An Outburst design id, for outburst' }, feeling: { type: 'string', description: 'pump: a feeling id they have' }, hold: { type: 'boolean', description: 'outburst: hold it to grow' },
    index: { type: 'integer', description: 'attempt: the approach number' }, what: { type: 'string', enum: ['wants', 'objective'] },
    tactical: { type: 'boolean' }, hand: { type: 'string', enum: ['main', 'off', 'both'] },
  }, required: ['charId', 'act'] } };
  schema.properties.magic = { type: 'array', description: 'Magic a character truly learned in the story (empty otherwise): one word, school, module, tone or feeling each', items: { type: 'object', properties: {
    charId: { type: 'string', enum: Object.keys(g.characters) }, word: { type: 'string' }, school: { type: 'string' }, module: { type: 'string' }, tone: { type: 'string' }, feeling: { type: 'string', description: 'A feeling id (feeling:<id> in the wiki), granted to a Soul caster at a story moment that truly makes them feel it' }, reason: { type: 'string' },
  }, required: ['charId', 'reason'] } };
  schema.properties.mana = { anyOf: [{ type: 'null' }, { type: 'integer' }], description: 'Set the place\'s mana meter (0 to 40) only when the story changes the place itself; null otherwise' };
  schema.properties.memory = { type: 'array', description: 'Memory upkeep: people, threads, facts, factions, pins (empty when nothing changes)', items: { type: 'object', properties: {
    op: { type: 'string', enum: ['person', 'thread', 'fact', 'faction', 'pin', 'unpin'] }, id: { type: 'string', description: 'An existing record id, to update it' },
    name: { type: 'string' }, aliases: { type: 'array', items: { type: 'string' } }, role: { type: 'string' }, where: { type: 'string', description: 'A zone id' },
    attitude: { type: 'integer', description: '-3 hostile to +3 devoted' }, retire: { type: 'boolean', description: 'fact: retire the fact with this id (it is no longer true)' }, status: { type: 'string', description: 'person: alive, dead, missing, unknown; thread: open, done, failed, dropped' },
    notes: { type: 'string' }, importance: { type: 'integer', description: '1 to 5' }, title: { type: 'string' }, kind: { type: 'string', enum: ['quest', 'promise', 'mystery', 'debt', 'rumour', 'goal'] },
    who: { type: 'array', items: { type: 'string' } }, text: { type: 'string' }, update: { type: 'string' }, about: { type: 'array', items: { type: 'string' } }, secret: { type: 'boolean' },
    standing: { type: 'integer' }, change: { type: 'integer' },
  }, required: ['op'] } };
  schema.properties.chapter = { anyOf: [{ type: 'null' }, { type: 'object', properties: { title: { type: 'string' }, summary: { type: 'string' }, saga: { type: 'string' } }, required: ['title', 'summary', 'saga'] }], description: 'Only when the turn says CHAPTER DUE' };
  // Rules 1.3: optional fields for perks, traits and classes (plan 4.3). Not required and enum-free, so the tool stays
  // the same for the whole session (the prompt cache holds) and turns that don't use them cost nothing.
  const S = { type: 'string' }, I = { type: 'integer' }, B = { type: 'boolean' };
  const opt = (props: Record<string, any>, req: string[]) => ({ type: 'array', items: { type: 'object', properties: props, required: req } });
  Object.assign(schema.properties.checks.items.properties, { target: { type: 'string', description: 'The NPC id or name the check is against' }, applies: { type: 'array', items: S, description: 'Item ids you rule apply to this check' },
    kind: { type: 'string', description: '"save" for a save, else omit' }, family: { type: 'string', description: 'save family: body (Guts), brain (Rumination), heart (Composure)' }, footnote: { type: 'string', description: 'charId of an ally who helps' }, double: B, auto: { type: 'string', description: 'success or fail when the fiction settles it (an item said so)' } });
  Object.assign(schema.properties.combat.anyOf[1].properties, { fear: { type: 'boolean', description: 'The place itself is frightening' }, fromTalk: { type: 'boolean', description: 'The fight broke out of the talk just had (a parley gone wrong)' } });
  Object.assign(schema.properties.combat.anyOf[1].properties.enemies.items.properties, { kind: { type: 'string', description: 'human (default), robot, crawler, ork, upper_realm, cursed, beast, machine, turret' }, tags: { type: 'array', items: S, description: 'military, hunter, lawful, no_surrender, underworld, official…' }, unaware: B, no_surrender: B, hidden: B });
  Object.assign(schema.properties.npcs.items.properties, { kind: S, tags: { type: 'array', items: S } });
  schema.properties.actions.items.properties.act.enum.push('perk');
  Object.assign(schema.properties.actions.items.properties, { id: { type: 'string', description: 'perk: the item key (perk:id, trait:id, class:id.move)' }, actionId: S, choice: S, text: S });
  schema.properties.perkLines = opt({ charId: S, key: S, text: S }, ['charId', 'text']);
  schema.properties.conditions = opt({ target: { type: 'string', description: 'NPC id or name, or a charId' }, id: { type: 'string', description: 'condition id' }, scope: { type: 'string', description: 'scene (default), session, arc' }, end: B }, ['target', 'id']);
  schema.properties.traitState = opt({ charId: S, key: S, value: {} }, ['charId', 'key', 'value']);
  schema.properties.echo = opt({ charId: S, n: I, why: S }, ['charId', 'n']);
  schema.properties.karma = opt({ charId: S, amount: I, unlawful: B, why: S }, ['charId', 'amount']);
  schema.properties.days = { type: 'integer', description: 'Days that pass (1 to 3650): a journey, a time skip; omit otherwise' };
  schema.properties.rest = { anyOf: [{ type: 'null' }, { type: 'object', properties: { kind: { type: 'string', description: 'short or long' }, settlement: B }, required: ['kind'] }] };
  schema.properties.identify = opt({ charId: S, what: S }, ['charId', 'what']);
  // Tutors only while some advanced class is active (Class Roster Revision 3 shelves them all: no tutors to place).
  if (ADV_LIVE) schema.properties.tutors = opt({ charId: S, classId: { type: 'string', description: 'advanced class id' } }, ['charId', 'classId']);
  // Blessing 2.0: the Narrator's faith ops (the engine's NarratorTurn.faith; it applies and logs them, and writes the patron lines).
  schema.properties.faith = opt({ charId: S, op: { type: 'string', description: 'pact, piece, devotion, rite_kept or apostasy' }, patron: { type: 'string', description: 'patron id (pact, piece; rite_kept if not their own)' },
    from: { type: 'string', description: 'piece: the NPC teacher (Faith above 5)' }, delta: { type: 'integer', description: 'devotion: Devotion XP, ' + NARRATOR_XP.min + ' to ' + NARRATOR_XP.max }, reason: S, rite: { type: 'string', description: 'rite_kept: the rite id' } }, ['charId', 'op']);
  schema.properties.harm = opt({ charId: S, amount: I, type: { type: 'string', description: 'physical (default), fire, elemental, true' }, why: S }, ['charId', 'amount']);
  // OOC and missions: optional and enum-free like the fields above (the tool never changes, the cache holds).
  schema.properties.ooc = { type: 'string', description: 'A plain out-of-character answer to OUT-OF-CHARACTER QUESTIONS (at most about 80 words); empty when none' };
  schema.properties.missions = opt({ mission: { type: 'string', description: 'mission id' }, objective: { type: 'string', description: 'objective id; omit to settle or reveal the whole mission' }, status: { type: 'string', description: 'done, failed or revealed' }, note: S,
    where: { type: 'object', properties: { zone: S, refs: { type: 'array', items: S } } } }, ['mission']);
  // Rules 1.7: hazards and triggers (optional; enum-free beyond fixed vocabularies, so the tool never changes).
  schema.properties.hazards = opt({ action: { type: 'string', enum: ['place', 'update', 'remove'] }, id: S, kind: { type: 'string', enum: ['minefield', 'fire', 'radiation', 'gas', 'collapse'] },
    severity: { type: 'string', enum: ['light', 'heavy'] }, ...AREA, hidden: B, name: S, text: S }, ['action']);
  schema.properties.triggers = opt({ action: { type: 'string', enum: ['place', 'remove'] }, id: S, when: { type: 'string', enum: ['enter', 'examine', 'objective'] }, ...AREA, objId: S, objective: S,
    then: { type: 'string', enum: ['spawn', 'fight', 'reveal'] }, spawn: { type: 'array', items: { type: 'object' }, description: 'npcs[] place shapes' }, difficulty: S, name: S, reveal: { type: 'array', items: S }, text: S }, ['action']);
  // Rules 1.9 (World Play 1.1): things on the ground, and what an enemy or person drops if they die (optional, enum-free).
  schema.properties.ground = opt({ at: S, items: { type: 'array', items: { type: 'object' }, description: 'loot shape' }, hidden: B }, ['at', 'items']);
  const DROPS = { type: 'object', description: 'If they die: {table} or {items}' };
  schema.properties.combat.anyOf[1].properties.enemies.items.properties.drops = DROPS; schema.properties.npcs.items.properties.drops = DROPS;
  schema.properties.missionNext = { type: 'string', description: 'The next mission id, when a closed mission offers several (CHOOSE NEXT); else omit' };
  schema.properties.side = opt({ id: S, title: S, text: S, status: { type: 'string', description: 'open, done or failed' } }, ['id']);
  schema.required = [...schema.required, 'objects', 'moment', 'npcs', 'actions', 'magic', 'mana', 'memory', 'chapter'];
  return { name: 'submit_turn', description: 'Hand in your Narrator turn: call this exactly once, with every field, when you are ready (after any wiki lookups).\n' + MAP_TRUTH, input_schema: schema };
}

/** Budgets (characters) for the parts of the turn that grow with the campaign: they keep every call inside the cost
 * ceiling however long the campaign runs (spec: The Narrator's memory). */
export const TRANSCRIPT_CHARS = 9000;
export const ACTIVE_MEMORY_CHARS = 9000;
const ATT = ['hostile', 'hostile', 'unfriendly', 'neutral', 'friendly', 'warm', 'devoted'];
/** The active memory as prompt text. */
export function memoryBlock(sel: Selection): string {
  const out: string[] = [];
  if (sel.threads.length) out.push('Threads:\n' + sel.threads.map((t) => `  ${t.id} [${t.kind}, ${t.status}] ${t.title}${t.who.length ? ' (' + t.who.join(', ') + ')' : ''}: ${t.text}${t.log.length ? ' | ' + t.log.slice(-2).join(' | ') : ''}`).join('\n'));
  if (sel.people.length) out.push('People:\n' + sel.people.map((p) => `  ${p.id} ${p.name}${p.aliases.length ? ' (' + p.aliases.join(', ') + ')' : ''}: ${p.role || 'someone'}, ${p.status}, ${ATT[p.attitude + 3]} to the party${p.where ? ', last at ' + p.where : ''}. ${p.notes}${p.log?.length ? ' | ' + p.log.slice(-3).join(' | ') : ''}`).join('\n'));
  if (sel.factions.length) out.push('Factions: ' + sel.factions.map((f) => `${f.name} ${f.standing >= 0 ? '+' : ''}${f.standing}${f.notes ? ' (' + f.notes + ')' : ''}`).join('; '));
  if (sel.facts.length) out.push('Facts:\n' + sel.facts.map((f) => `  ${f.canon ? '[canon] ' : ''}${f.secret ? '[secret] ' : ''}S${f.scene}: ${f.text}`).join('\n'));
  return out.join('\n');
}
/** The long memory: the saga, the latest chapters and the pins. Cached: it changes once a chapter. */
export function memoryPrompt(g: GameState): string {
  const m = memoryOf({ ...g });
  return ['THE STORY SO FAR (the saga, rewritten each chapter):', m.saga || 'It has only just begun.',
    m.chapters.length ? '\nLATEST CHAPTERS:\n' + m.chapters.slice(-4).map((c) => `Chapter ${c.n}, ${c.title} (scenes ${c.scenes[0]}–${c.scenes[1]}): ${c.summary}`).join('\n') : '',
    m.pins.length ? '\nPLOT ESSENTIALS (always true; never contradict):\n' + m.pins.map((x) => '- ' + x).join('\n') : ''].filter(Boolean).join('\n');
}
/** The recall tool: keyword search over the whole memory and the archived transcript. */
export const RECALL_TOOL = {
  name: 'recall',
  description: 'Search the campaign\'s memory: every person, thread, fact, faction, scene and chapter summary, and the full transcript back to session 1. Use it when the players bring up something from long ago that is not in your context, before you answer about it. Query with names and key words.',
  input_schema: { type: 'object', additionalProperties: false, properties: { query: { type: 'string' } }, required: ['query'] },
};
export function recallAnswer(g: GameState, query: string): string {
  const hits = recall({ ...g }, String(query || ''), 8);
  return hits.length ? hits.map((h) => `[${h.kind} ${h.id}] ${h.text}`).join('\n') : 'Nothing in memory matches "' + query + '".';
}
