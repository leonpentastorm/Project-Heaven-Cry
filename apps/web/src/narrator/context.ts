// The AI Narrator's context, in layers ordered for prompt caching (docs/design/tech-plan.md, section 7):
// 1. rules and output contract (never changes) · 2. campaign lore (per campaign) · 3. party sheets (per level-up)
// then, uncached: memory, the recent transcript, and this turn's job.
import { PERK_GUIDANCE } from './perk-guidance';
import { holdersOf, briefOf, storyConds, rulingsPrompt, TAG_VOCAB, classRank, ADVANCED, type GameState, type Character, type Selection, memoryOf, selectMemory, recall, chapterDue, SCENES_PER_CHAPTER, npcsOf, momentsOpen, songOf, comboEligible, wikiLookup, wikiKinds, SIGIL, hasEvoker, hasEmanator, mpNow, maxMp, evoChargeNow, coresCarried, manaBand, ITEM, SKILL, SKILLS, CLASS, PERK, PERKS, TRAITS, WEAPONS, ENEMIES, eligibleClasses, mod, maxHp, xpForLevel, mapBrief, zoneMap, positionsOf, refOf, storyObjects, OBJECT_KINDS, kindOf, campaignOf } from '@engine';
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

export const RULES_PROMPT = `You are the Narrator (game master) of Project Heaven Cry, a tactical RPG played in the browser by up to four players. You own judgement; a rules engine owns every number.

THE SPLIT
- The engine rolls every die, applies damage, tracks HP, AP, XP, levels and conditions, runs the combat grid and enemy turns. Never invent a roll result, never say a number changed unless the engine reported it.
- You describe the world, play every NPC, set difficulties (TN), attach voice hooks, call Overreach, award XP within the allowed ranges, record deeds for combo perks, start fights and close scenes. You hand in ONE turn each time through the submit_turn tool; the engine validates every field and drops anything outside the rules.

TURNS
- Story mode uses a speaking order: each player acts once per round, then you answer everyone together. Address every player's action in your narration; keep each player's character at the centre of their own beat.
- Names: speak to and about the characters by their character names only. You are never told the players' real names; never invent, guess or use one, and never call anyone "player" in the story.
- narration: second person plural when addressing the party, present tense, vivid and specific. 90 to 220 words. No headings, no lists, no dice talk, no meta commentary. End on something the players can act on.
- When an action's outcome is uncertain and interesting, don't resolve it: request a check (checks[]) and narrate the lead-up only. The engine rolls when the player clicks, then you get the results next turn and narrate the outcome. Use 1 to 3 skills per check (combined checks are allowed). TN is one of 8 Easy, 12 Standard, 16 Hard, 20 Heroic. Ask for at most one check per character per turn; skip checks for trivial or impossible actions.
- On a natural 20 add a benefit; on a natural 1 add a complication.

VOICES (the heart of the game)
- Every skill with 1+ point is a private inner voice in its character's head (voice cards below). Each turn add 2 to 5 hooks[]: something a skill would notice or want in this beat. Each hook has a skill id, a TN (8/12/16/20; lower = more obvious), a truth flag (true, partial, misleading; misleading hooks sound just as sure), and the line itself: one or two sentences IN THAT SKILL'S VOICE, addressed to the character ("you"), following the voice card's persona and style. The engine shows a line only to players whose passive score (10 + skill modifier) meets the TN, at most 2 per player. Spread hooks across skills the party actually has.

OVERREACH
- A skill with 5+ points can push when its trigger happens (listed under each character). Then add an overreach[] entry with the push in the skill's voice. The player chooses to indulge (the consequence happens, +1 Echo) or resist (spends Echo). At most once per scene per skill; use it sparingly, at dramatic moments.

XP (per character, or charId "all")
- Sources and allowed amounts: dialogue 25-100 (a scene won through talk), discovery 25-75 (a secret, a place, a truth), quest 50-300 (an objective completed). The engine awards combat XP itself. Pacing: session 1 (about one story scene and one fight) should reach about 250 XP per character, so classes arrive at level 3. Award XP when it is earned, with a short reason.

PERKS, TRAITS AND CLASS MOVES
- Each character lists them by id ([perk:id], [trait:id], [class:id.move]). The engine runs their numbers in checks, combat and the map. A "*" marks a part that is yours to rule: wiki_lookup the id when it matters. Things the engine couldn't run in a fight come back in the fight report as lines ending "yours to rule".
- Tag checks (tags) when perks or traits care what kind of check it is. Tags: ${[...TAG_VOCAB].join(', ')}. Answer every PENDING RULINGS line in perkRulings (accepted true or false); a story use you refuse is refunded. Never narrate a number the engine didn't report.
- Optional fields (use only when they apply): perkLines (private lines an item owes its holder), conditions (an NPC Shaken for the scene; a character's condition for the scene, session or arc), traitState (what only you can set: a grudge, a cover, a rival), echo, karma (unlawful acts flagged), rest (short or long), identify, tutors (a tutor met for an advanced class), patrons (a pact, Devotion changes), patronMood (a prayer's TN). Start-of-fight enemies can carry kind, tags, unaware, no_surrender, hidden; combat.fear marks a frightening place. In a fight the engine runs surrender, Hidden, prayer and throws; you rule what they mean after.
${PERK_GUIDANCE ? PERK_GUIDANCE + '\n' : ''}
COMBO PERKS (deeds)
- When a character with 5+ points in every listed skill actually does a perk's deed in the story, add deeds[] with that perkId. The list of combo perks is below. Never mention perks the party doesn't hold, and never mention Ultimate perks at all: they are a secret.

FIGHTS
- When violence breaks out, start a fight with combat: give it a name, a map (a zone id from the campaign, usually the current zone; yard is a generic open map), a difficulty (easy, standard, hard, boss: sets the XP), and 2 to 6 enemies, each with a name, a tier (minion, soldier, elite, boss) and a weapon id. The engine runs the whole fight on the grid and tells you how it ended; you then narrate the aftermath.
- Enemy tiers, weakest to strongest: minion (fodder), soldier (trained), elite (a veteran or a specialist), boss (the fight's centre). The engine sets their numbers.
- Weapon ids: ${WEAPONS.filter((w: any) => !/smoke|flash/.test(w.id)).map((w: any) => w.id).join(', ')}.

MAGIC (the engine runs every number)
- Sigil magic (Mind; needs an Evoker and mana cores): a caster draws word glyphs on map tiles (draw: word + tile); glyphs that touch form a pattern (Stack: 2 on one tile; Line: 2 to 4 tiles in a row; Ring: around an empty tile) and Evoke fires it (evoke: tile of any glyph + aim). A pattern needs a subject word (FIRE, SPARK, SHIELD…) and a form or motion (CONDENSE, PUSH, STAY, SPREAD…). Glyphs stay on the ground until fired, scuffed or faded: anyone may use or scuff them, enemies too. Firing builds Flux; vent clears it (raising the mana meter).
- Soul magic (Soul; needs an Emanator and MP): an Outburst is a ready design (school + modules); begin it now or hold it (it grows each turn, Strain rises), then release. Too much Strain is a Mana Short. A heart burst Downs, never kills. Syphon draws ambient mana into MP; crystallise turns 10 mana into a core.
- Players' spell words map to actions[]: draw (word, tile), evoke (tile, aim), scuff, vent, core, outburst (design id, aim, hold), release (aim), syphon, crystallise. tile and aim are grid references (aim may be a token id). A spell aimed at someone outside a fight starts the fight, like an attack.
- The mana meter (0 to 40; thin, normal, rich, flooded) is in PARTY CONDITION. Deaths, venting and Grand forms raise it; Soul casting, syphon and crystallise lower it. Set mana only when the story changes the place itself (a ley spring, a dead zone); null otherwise. Flooded places strain Soul casters; thin places starve them.
- Teaching: when a character truly learns in the story (a mentor, a plate deciphered, a revelation), add magic[] with charId and one word (a Sigil word id), school or module id, and a reason. Rare: a word is a reward, at most one per character per scene.

THE MAP (grid references)
- Every place is a grid: columns are letters (A, B, C… left to right), rows are numbers (1, 2, 3… top to bottom). "C7" is column C, row 7. Each turn gives you the current map, what is where, and where everyone stands.
- The party moves between the campaign's zones with travel (a zone id, or "" to stay). Travel when the story does: a walk, a flight, years passing. Each zone keeps its objects as the party left them. When a player asks to travel (their line reads "asks to travel to … [travel:zone]"), travel if the story allows it; otherwise narrate what stops them.
- Players may say "I move to A15"; they can also move themselves on the map between your turns. You may move characters when the story moves them: add moves[] with charId and a grid reference (an empty array otherwise). Keep descriptions consistent with the map's notes.
- When a fight starts on the current map, characters start where they stand. Give each enemy an "at" grid reference to place it (an empty string lets the engine choose). Place enemies on open tiles, not on hulls or cover.
- A fight costs you one call: when it ends you get a report of key moments, where everyone ended up, and anything players said or attempted mid-fight that needs your judgement. Rule on those in your aftermath.

MAP OBJECTS AND POINTS OF INTEREST
- Objects sit on map tiles: ${OBJECT_KINDS.map((k: any) => k.id).join(', ')}. The engine runs what they do in a fight (cover, blocking, HP, traps, hazards, explosions, doors). Place, update or remove them with objects[] (an empty array otherwise): a place needs kind, at (a grid reference), name and text; update and remove need the object's id.
- A point of interest is any object worth dealing with (a barricade, a locked door, a terminal, a rune, or a plain "poi" marker). When a player examines one (their line reads "examines … [id]"), describe it in your narration and update it with 2 to 4 approaches: each is a label (what they try), 1 to 3 skill ids, a TN, the stakes, and a success effect the engine applies by itself: remove (break or clear it), open (unlock or open), reveal (show something hidden), disarm (a trap), or "" (you narrate the result). Approaches stay on the object: players try them later without you, once per character per scene, and you see every try.
- Mix approaches across Body, Mind and Soul skills, the way a good event offers brute force, cleverness and talk. Example: a rune-marked barricade could take Raw Power + Durability to break down (remove), Ingenuity + Lore Master to read the rune (""), or Charisma to talk the guard into opening it (remove).

LOOT
- Give things with loot[] (an empty array otherwise): charId, an item id (a weapon id or an item id below), qty, and for weapons a rarity (standard, fine, masterwork, relic, celestial) and an optional in-world name. Be sparing: loot is earned (a body searched, a locker opened, a reward). Relic and celestial are rare events.
- Item ids: ${Object.keys(ITEM).join(', ')}.

INJURIES
- The engine rolls injuries on critical hits (head: Dazed; torso: Bleeding; arm: −2 to attacks with it; leg: half Movement). Arm and leg injuries last until treated. Describe them in the story. When the story gives real treatment (a long rest with a Medic, surgery, a field hospital), add treat[] with the charId and loc (arm, leg or all); otherwise treat is an empty array.

THE OVERWORLD (rounds)
- Outside fights the story runs in rounds. Each round every player has a full turn of AP (the same as in a fight) and one Say. Between your turns they move, open doors, reload, stim, examine and try approaches on the map, all paid in AP. You are called only when a round has something for you: a line said, an examine, an attempt, a travel request, or a sneaking character being spotted. Answer those; you don't need to narrate plain movement.
- People and enemies stand on the map as tokens (listed each turn with their ids, side and tile). Place, move, update (side or name) or remove them with npcs[]: a place needs name, side (hostile or neutral), tier, weapon id and at. Move them when the story moves them; a hostile stepping next to a hidden character makes that character roll to stay hidden.
- Players can also say what they do in words ("I move to A15 and shoot that guard with my pistol"). Turn the mechanical part into actions[]: the engine runs each one as that player's own action when the next round opens, from their fresh AP, in order, with every normal rule (paths, AP, sneaking, an attack starting the fight with the seen or hidden opening). act is move (to: a grid reference; how: move, sprint or sneak), attack (targetId: a token id; mode: shot, aimed or melee), analyze or stim (targetId), door (objId), reload, load, clear, repair or prone. Narrate the intent, not the result: the engine reports what happens. Use moves[] only when the story itself moves people (a cutscene, a fall); a player acting uses actions[].
- Every person the party can see or reach stands on the map as a token: when you introduce someone, place them with npcs[] in the same turn. A person who is only in your prose can't be talked to on the map, followed, or attacked.
- Anyone and anything is a target: strangers, friends, allies, the party's own. Never refuse or soften an attack a player declares. Map it to actions[] (targetId may be a token id or the exact name of a token or character; objId for an object) and play the consequences: witnesses, attitudes, the law, grief, the victim's player.
- If a player attacks a token from the overworld, the engine starts the fight by itself (a fight on people who weren't hostile gives no XP). A player shooting another player's character resolves on the map with no fight: you rule what follows. A character at 0 HP outside a fight is Downed until an ally's stim, or your treat with loc "all". If you start a fight on the current map, every hostile token joins where it stands; listing an enemy with a token's name means that token.

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

SCENES
- sceneTitle: set a short new title (2-6 words) when the scene changes location or time; otherwise an empty string. endScene: when a scene closes, a 1-3 sentence summary of what matters later (facts, NPCs, promises, open threads); otherwise null.

WORLD RULES THAT NEVER BREAK
- The Unspoken Name: no real-world (real Earth) person, brand, place or work is ever named in the world. Celestials may imitate things; characters never name the originals.
- In-universe language only. The world is a simulation, but NPCs must not learn it (the Knowing); keep that truth as subtext.
- Tone: NPCs are funny the way people are; Celestials are funny the way people are when nothing can hurt them. The tragedy belongs to the NPCs.
- Keep traits that are deliberately ugly in clean in-world language.

THE WIKI (wiki_lookup)
- You carry only what this moment needs. For anything else, call wiki_lookup with keys before you answer: skill:<id>, trait:<id>, perk:<id>, weapon:<id>, item:<id>, condition:<id>, class:<id>, patron:<id>, enemy:<tier>, object:<kind>, sigil:<word>, school:<id>, module:<id>, lore:<key>. Batch your keys in one call; at most a few calls per turn. Never look up what is already above.
- Conditions: ${wikiKinds().condition.join(', ')}. Classes: ${wikiKinds().class.join(', ')}. Patrons: ${wikiKinds().patron.join(', ')}.\n- Sigil words: ${wikiKinds().sigil.join(', ')}. Soul schools: ${wikiKinds().school.join(', ')}. Soul modules: ${wikiKinds().module.join(', ')}.
- Lore keys (beyond what the campaign block already gives you): ${loreKeys().join(', ')}.
- Looked-up lore is still Narrator-only: never reveal its truths outright.

OUTPUT
- Hand in your turn by calling submit_turn exactly once, after any wiki lookups. Every field is required; use empty arrays, an empty string or null when there is nothing to add.`;

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
    c.encounters?.some((e) => here(e.zone)) ? '\nPREPARED FIGHTS (use when the story gets there; adapt freely):\n' + c.encounters.filter((e) => here(e.zone)).map((e) => `- ${e.name} in ${e.zone}, ${e.difficulty}: ${e.when} Enemies: ${e.enemies.map((f) => f.name + ' (' + f.tier + ', ' + f.weapon + (f.at ? ', at ' + f.at : '') + ')').join(', ')}.`).join('\n') : '',
    c.lore === 'docs/lore/MPAT-and-M813.md' ? '\nCAMPAIGN SOURCE (the canon behind this campaign; the incident is history the players are about to live):\n' + clean(drop(m813, ['Use in the game'])) : c.lore ? '\nCAMPAIGN LORE:\n' + c.lore : '',
    '\nWORLD BIBLE (Narrator only; never reveal its truths outright; only the parts this campaign needs):\n' + clean(bibleFor(g)),
    takes(loreFor(g), 'sector-earth') ? '\nTHE EARTH SECTOR (the party\'s origins only):\n' + clean(sectorFor(g)) : '',
    takes(loreFor(g), 'epccg-cast') ? '\nTHE EPCCG CAST AND FACTIONS:\n' + clean(cast) : '',
  ].filter(Boolean).join('\n');
}

/** A caster's magic, for the party block (static between level-ups; the live meters are in PARTY CONDITION). */
function magicBrief(c: Character): string {
  const words = (c.sigils || []).map((w) => SIGIL[w]?.word || w), designs = (c.outbursts || []).map((d) => `${d.id} ${d.name} (${[d.school, d.school2].filter(Boolean).join('+')}${d.modules.length ? ': ' + d.modules.join(', ') : ''})`);
  if (!words.length && !designs.length) return '';
  return `\n  Magic: ${words.length ? 'Sigil words ' + words.join(', ') + (hasEvoker(c) ? '' : ' (no Evoker carried)') : 'no Sigil words'}; ${designs.length ? 'Outburst designs ' + designs.join('; ') + (hasEmanator(c) ? '' : ' (no Emanator carried)') : 'no Outbursts'}.`;
}
const pts = (c: Character) => Object.entries(c.skills).filter(([, p]) => p > 0).sort((a, b) => b[1] - a[1]);
export function characterBrief(g: GameState, c: Character): string {
  const skills = pts(c).map(([id, n]) => `${SKILL[id].name} (${id}) ${n} [${mod(n) >= 0 ? '+' : ''}${mod(n)}]`).join(', ');
  // Items by id (plan 4.3): the engine runs their numbers; "*" marks a part that is yours to rule (wiki_lookup the id for
  // the full text); a lane's brief() gives the remainder in a few words. Held Ultimates are listed too (never unheld ones).
  const items = holdersOf({ c }), tag = (h: any) => { const b = briefOf(h); return b == null ? '' : b ? '*: ' + b : '*'; };
  const traits = items.filter((h) => h.kind === 'trait').map((h) => `${h.info.name} [${h.key}]${tag(h)}`).join(', ') || 'none';
  // An Ultimate is secret (never in the wiki), so a held one carries its text here; there are only a handful.
  const perks = items.filter((h) => h.kind === 'perk').map((h) => h.tier === 'ultimate' ? `${h.info.name} [${h.key}] (ultimate): ${h.info.text}` : `${h.info.name} [${h.key}] (${h.tier})${tag(h)}`).join(', ') || 'none';
  const moves = items.filter((h) => h.kind === 'class').map((h) => `${h.info.name} [${h.key}]${tag(h)}`).join(', ');
  const over = pts(c).filter(([, n]) => n >= 5).map(([id]) => `${SKILL[id].name}: ${(SKILL[id] as any).overreach?.text || ''}`).join(' | ') || 'none yet';
  const voices = pts(c).map(([id]) => { const v = (SKILL[id] as any).voice || {}; return `  - ${SKILL[id].name}: ${v.persona} Wants: ${v.wants} Style: ${v.style} ${v.never || ''}`; }).join('\n');
  const id = c.identity || {};
  return `CHARACTER ${c.name} (charId ${c.id})${c.dead ? ' — DEAD' : ''}
  Origin: ${c.origin}. Level ${c.level}. Class: ${c.classId ? CLASS[c.classId].name + ' ' + ['', 'I', 'II', 'III'][classRank(c)] + (c.advancedClass && ADVANCED[c.advancedClass] ? ' and ' + ADVANCED[c.advancedClass].name + ' (advanced)' : '') + (moves ? ' — moves: ' + moves : '') : 'none yet (earned at level 3; closest: ' + eligibleClasses(c.skills).map((x) => x.name).join(' or ') + ')'}.
  Max HP ${maxHp(c)}. Weapon: ${c.weapon}. Identity: ${Object.entries(id).filter(([k, v]) => v && !/^song/.test(k)).map(([k, v]) => k + ' ' + v).join('; ') || 'not given'}${songOf(c) ? '; has a favourite song (never name it)' : ''}.
  Skills: ${skills}.
  Traits: ${traits}
  Perks: ${perks}. Overreach triggers: ${over}${magicBrief(c)}${standingBrief(g, c)}
  Voices:
${voices}`;
}

/** Rules 1.3 standing: patron and Devotion, Karma, tutors, companions, story conditions, Narrator-set item state. One
 * short line, only what is set (nothing for most characters). */
function standingBrief(g: GameState, c: Character): string {
  const bits: string[] = [];
  if (c.patron) bits.push('patron ' + c.patron + ' (Devotion ' + (c.devotion ?? 3) + ')');
  if (c.karma) bits.push('Karma ' + c.karma);
  if (c.tutors?.length) bits.push('tutors for ' + c.tutors.join(', '));
  if (c.companions?.length) bits.push('companions ' + c.companions.map((x) => x.name + ' (' + x.kind + (x.hp === 0 ? ', destroyed' : '') + ')').join(', '));
  const conds = storyConds(g, c); if (conds.length) bits.push('conditions ' + conds.join(', '));
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
  const recent = g.story.entries.filter((e) => !e.to && !e.ooc && !/ joined the room\.$| is skipped this round\.$| is locked in\.$|^Round \d+\.$| (moves|sprints) to [A-Z]+\d+ \(/.test(e.text))/* the last 40 lines, inside a character budget (oldest dropped first) */.slice(-40).map((e) => {
    if (e.kind === 'player') return `[${e.head}] ${e.text}${e.roll ? ' (the player asks you to pick a roll for this)' : ''}`;
    if (e.kind === 'narration') return `[Narrator] ${e.text}`;
    if (e.kind === 'check') return `[Check] ${e.head} — ${e.text}`;
    if (e.kind === 'scene') return `[New scene] ${e.text}`;
    return `[${e.kind}] ${e.text}`;
  }).reverse().reduce((acc: string[], l) => (acc.join('\n').length + l.length > TRANSCRIPT_CHARS ? acc : [...acc, l]), []).reverse().join('\n');
  const choices = g.overreach.filter((o) => o.choice).map((o) => `${g.characters[o.charId]?.name} ${o.choice === 'resist' ? 'resisted' : 'indulged'} ${SKILL[o.skill].name}'s push: "${o.push}"`).join('\n');
  const job = w.kind === 'opening'
    ? 'This is the OPENING of session 1. ' + (campaignOf(g)?.opening || 'Set the first scene from the campaign.') + ' Give a sceneTitle, give every character a reason to act, add hooks, and end on a clear prompt. No checks yet.'
    : w.kind === 'round' ? `Round ${g.story.round} has closed: every player has used their turn. Answer what needs you since your last turn (lines said, examines, attempts, travel requests, anyone spotted), all together. Request checks where outcomes are uncertain.`
    : w.kind === 'results' ? 'The engine has rolled the checks you asked for (see the last [Check] lines) and the players made their Overreach choices. Narrate the outcomes, honouring each success and failure exactly, then open the next round. Award XP if something was achieved.'
    : `The fight is over. The engine's report:\n${w.note || ''}\nNarrate the aftermath from these moments (who did what, who is hurt and where they stand), rule on anything said or attempted mid-fight, then open the next round. The engine already gave combat XP.`;
  const hurt = Object.values(g.characters).map((c) => `${c.name}: ${c.dead ? 'dead' : c.hp + '/' + maxHp(c) + ' HP, Echo ' + c.echo + ', ' + c.xp + ' XP (level ' + (c.level + 1) + ' at ' + xpForLevel(c.level + 1) + ')'}${c.injuries?.length ? ', injured ' + c.injuries.map((i) => (i.side ? i.side + ' ' : '') + i.loc).join(', ') : ''}${c.dead ? '' : liveMagic(g, c)}`).join('; ') + `. Mana here: ${g.story.mana ?? 15} (${manaBand(g.story.mana ?? 15).id})`;
  const pos = positionsOf({ ...g, story: { ...g.story, positions: { ...(g.story.positions || {}) } } });
  const where = Object.values(g.characters).filter((c) => !c.dead && pos[c.id]).map((c) => c.name + ' ' + refOf(pos[c.id])).join(', ');
  const objs = storyObjects({ ...g, story: { ...g.story, objects: g.story.objects ? [...g.story.objects] : undefined } })
    // Plain cover and exits are the engine's business (exits are listed with the zones); POIs, hazards, doors and anything with approaches stay.
    .filter((o) => o.approaches.length || !['crate', 'pillar', 'rubble', 'low_wall', 'barricade', 'exit'].includes(o.kind));
  const objText = objs.map((o) => `${o.id} ${o.name} (${o.kind}${o.hidden ? ', hidden' : ''}${o.locked ? ', locked' : ''}${o.open ? ', open' : ''}${o.hp != null && o.hp <= 0 ? ', broken' : o.hp != null && o.max && o.hp < o.max ? ', damaged' : ''}${o.resolved ? ', dealt with' : ''}) at ${refOf(o.pos)}${o.text ? ': ' + o.text : ''}`
    + (o.approaches.length ? '\n    approaches: ' + o.approaches.map((a, i) => `${i + 1}. ${a.label} [${a.skills.join('+')} TN ${a.tn}${a.success ? ', ' + a.success : ''}]${a.tries.length ? ' tries: ' + a.tries.map((t) => t.name + ' ' + (t.ok ? 'succeeded' : 'failed') + ' (' + t.total + ')').join(', ') : ''}`).join('; ') : '')).join('\n  ');
  const mus = g.music?.now ? g.characters[g.music.now.charId] : null;
  const music = mus ? `\n\nMUSIC: ${mus.name}'s song is playing for the room (${g.music!.now!.layer === 'pin' ? 'kept on by their music trait' : g.music!.now!.reason}). You may let it colour the scene; never name the song or the artist.` : '';
  const moments = momentsOpen(g).map((m) => `${m.id}: ${m.when}`).join('\n  ');
  const people = npcsOf({ ...g, story: { ...g.story } }).map((n) => `${n.id} ${n.name} (${n.side}, ${n.tier}, ${n.weapon}) at ${refOf(n.pos)}${n.analyzed ? ', analyzed' : ''}`).join('\n  ');
  const sneaking = Object.values(g.characters).filter((c) => g.story.sneak?.[c.id]).map((c) => c.name + (g.story.hidden?.[c.id] ? ' (hidden)' : ' (sneaking, but seen)')).join(', ');
  const M = memoryOf({ ...g }), sceneMem = M.scenes.map((x) => `S${x.n} ${x.title}: ${x.summary}`).join('\n') || (g.story.journal.slice(-6).map((x, i) => `${i + 1}. ${x}`).join('\n') || 'none yet');
  const lookFor = [recent, g.story.scene.title, zoneMap(g).name, people, objs.map((o) => o.name).join(' ')].join('\n');
  const active = memoryBlock(selectMemory({ ...g }, lookFor, ACTIVE_MEMORY_CHARS));
  const chapterJob = chapterDue(g) ? `\n\nCHAPTER DUE: also fill chapter. Roll these ${SCENES_PER_CHAPTER} oldest scenes into one chapter (title, and a summary of at most 1,200 characters keeping names, promises, debts, deaths and open questions), and rewrite the saga, the story so far, in at most 3,500 characters with this chapter folded in:\n${M.scenes.slice(0, SCENES_PER_CHAPTER).map((x) => `S${x.n} ${x.title}: ${x.summary}`).join('\n')}` : '';
  const redo = w.redo ? `\n\nREROLL: the players voted to redo your last answer to this moment. Their note: "${w.redo}". Answer the same moment again, differently, honouring the note where the rules and the story allow; the old answer never happened.` : '';
  return `RECENT SCENES (not yet in a chapter):\n${sceneMem}\n\nACTIVE MEMORY (picked for this moment; use recall for anything else):\n${active || 'nothing recorded yet'}${chapterJob}${moments ? '\n\nSTORY MOMENTS OPEN HERE (show one with moment when the story reaches it):\n  ' + moments : ''}\n\nPARTY CONDITION: ${hurt}${music}\n\nTHE MAP WHERE THE STORY IS NOW:\n${mapBrief(zoneMap(g))}\n\nWHERE EVERYONE STANDS (${zoneMap(g).name}): ${where || 'unknown'}${sneaking ? '\nSNEAKING: ' + sneaking : ''}\n\nPEOPLE AND ENEMIES ON THE MAP:\n  ${people || 'none'}\n\nOBJECTS ON THE MAP:\n  ${objText || 'none besides cover'}${rulingsPrompt(g) ? '\n\n' + rulingsPrompt(g) : ''}\n\nCURRENT SCENE: ${g.story.scene.title || '(none yet)'}\n\nRECENT TRANSCRIPT (oldest first):\n${recent || '(the session is just starting)'}\n${choices ? '\nOVERREACH CHOICES:\n' + choices + '\n' : ''}\nYOUR JOB NOW: ${job}${redo}`;
}

/** A caster's live magic for PARTY CONDITION: MP, Evoker charge and cores, Flux, Strain, a held Outburst. */
function liveMagic(g: GameState, c: Character): string {
  const m = g.story.magic?.[c.id], out: string[] = [];
  if (hasEmanator(c)) out.push(`MP ${mpNow(c)}/${maxMp(c)}`);
  if (hasEvoker(c)) out.push(`Evoker ${evoChargeNow(c)} charge, ${coresCarried(c)} spare cores`);
  if (m?.flux) out.push(`Flux ${m.flux}`); if (m?.strain) out.push(`Strain ${m.strain}`); if (m?.held) out.push('holding an Outburst');
  const conds = Object.keys(m?.conds || {}); if (conds.length) out.push(conds.join(', '));
  return out.length ? ', ' + out.join(', ') : '';
}

/** JSON schema for one Narrator turn (structured outputs: every object closed, every field required). */
export function turnSchema(g: GameState) {
  const charIds = Object.keys(g.characters);
  const skill = { type: 'string', description: 'A skill id from SKILL IDS' };
  // Long id lists (weapons, items, perks) stay out of the schema: the grammar would get too large. The prompt lists them; the engine ignores unknown ids.
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
    combat: { anyOf: [{ type: 'null' }, obj({
      name: { type: 'string' }, map: { type: 'string', enum: [...(campaignOf(g)?.zones.map((z) => z.id) || []), 'yard'] }, difficulty: { type: 'string', enum: ['easy', 'standard', 'hard', 'boss'] },
      enemies: { type: 'array', items: obj({ name: { type: 'string' }, tier: { type: 'string', enum: ENEMIES.map((e: any) => e.id) }, weapon: { type: 'string' }, at: { type: 'string' } }) },
    })] },
    endScene: { anyOf: [{ type: 'null' }, obj({ summary: { type: 'string' } })] },
    moves: { type: 'array', items: obj({ charId, to: { type: 'string' } }) },
    loot: { type: 'array', items: obj({ charId, item: { type: 'string' }, qty: { type: 'integer' }, rarity: { type: 'string', enum: ['standard', 'fine', 'masterwork', 'relic', 'celestial'] }, name: { type: 'string' } }) },
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
    return e ? '[' + e.key + '] ' + e.text : '[' + key + '] No such entry. Kinds: ' + Object.keys(wikiKinds()).join(', ') + ', lore. Check the id lists in your rules.';
  }).join('\n\n');
}


/** The tool the Narrator hands its turn in with: the turn schema plus map objects. Not strict: no grammar limit. */
export function submitTool(g: GameState) {
  const schema: any = turnSchema(g);
  schema.properties.objects = { type: 'array', description: 'Place, update or remove map objects and write approaches (empty when nothing changes)', items: { type: 'object', properties: {
    action: { type: 'string', enum: ['place', 'update', 'remove'] }, id: { type: 'string', description: 'The object id, for update and remove' },
    kind: { type: 'string', enum: OBJECT_KINDS.map((k: any) => k.id) }, at: { type: 'string', description: 'A grid reference, for place' },
    name: { type: 'string' }, text: { type: 'string' }, hidden: { type: 'boolean' }, locked: { type: 'boolean' },
    approaches: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, skills: { type: 'array', items: { type: 'string' }, description: '1 to 3 skill ids' }, tn: { type: 'integer', enum: [8, 12, 16, 20] }, stakes: { type: 'string' }, success: { type: 'string', enum: ['', 'remove', 'open', 'reveal', 'disarm'] } }, required: ['label', 'skills', 'tn', 'stakes', 'success'] } },
  }, required: ['action'] } };
  // Plain text, not an enum: tool definitions must not change during a session, or the whole prompt cache resets.
  schema.properties.moment = { type: 'string', description: 'A story moment id from STORY MOMENTS OPEN HERE (an illustration to show now), or empty' };
  schema.properties.npcs = { type: 'array', description: 'Place, move, update or remove people and enemies on the map (empty when nothing changes)', items: { type: 'object', properties: {
    action: { type: 'string', enum: ['place', 'move', 'update', 'remove'] }, id: { type: 'string', description: 'The token id, for move, update and remove' }, name: { type: 'string' },
    side: { type: 'string', enum: ['hostile', 'neutral'] }, tier: { type: 'string', enum: ['minion', 'soldier', 'elite', 'boss'] }, weapon: { type: 'string', description: 'A weapon id' }, at: { type: 'string', description: 'A grid reference, for place and move' },
  }, required: ['action'] } };
  schema.properties.actions = { type: 'array', description: 'Mechanical actions players declared in words, run as their own actions when the next round opens (empty otherwise)', items: { type: 'object', properties: {
    charId: { type: 'string', enum: Object.keys(g.characters) }, act: { type: 'string', enum: ['move', 'attack', 'analyze', 'stim', 'door', 'reload', 'load', 'clear', 'repair', 'prone', 'draw', 'evoke', 'scuff', 'vent', 'core', 'outburst', 'release', 'syphon', 'crystallise'] },
    to: { type: 'string', description: 'A grid reference, for move' }, how: { type: 'string', enum: ['move', 'sprint', 'sneak'] }, targetId: { type: 'string', description: 'A token id or exact name, or a charId or character name' },
    mode: { type: 'string', enum: ['shot', 'aimed', 'melee'] }, objId: { type: 'string', description: 'An object id: a door for door; anything to attack' },
    word: { type: 'string', description: 'A Sigil word id, for draw' }, tile: { type: 'string', description: 'A grid reference: where to draw, or a glyph of the pattern to evoke' },
    aim: { type: 'string', description: 'A grid reference or token id, for evoke, outburst and release' }, design: { type: 'string', description: 'An Outburst design id, for outburst' }, hold: { type: 'boolean', description: 'outburst: hold it to grow' },
  }, required: ['charId', 'act'] } };
  schema.properties.magic = { type: 'array', description: 'Magic a character truly learned in the story (empty otherwise): one word, school or module each', items: { type: 'object', properties: {
    charId: { type: 'string', enum: Object.keys(g.characters) }, word: { type: 'string' }, school: { type: 'string' }, module: { type: 'string' }, reason: { type: 'string' },
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
    kind: { type: 'string', description: '"save" for a save, else omit' }, family: { type: 'string', description: 'save family: body, brain, heart' }, footnote: { type: 'string', description: 'charId of an ally who helps' }, double: B, auto: { type: 'string', description: 'success or fail when the fiction settles it (an item said so)' } });
  Object.assign(schema.properties.combat.anyOf[1].properties, { fear: { type: 'boolean', description: 'The place itself is frightening' } });
  Object.assign(schema.properties.combat.anyOf[1].properties.enemies.items.properties, { kind: { type: 'string', description: 'human (default), robot, crawler, ork, upper_realm, cursed, beast, machine, turret' }, tags: { type: 'array', items: S, description: 'military, hunter, lawful, no_surrender, underworld, official…' }, unaware: B, no_surrender: B, hidden: B });
  Object.assign(schema.properties.npcs.items.properties, { kind: S, tags: { type: 'array', items: S } });
  schema.properties.actions.items.properties.act.enum.push('perk');
  Object.assign(schema.properties.actions.items.properties, { id: { type: 'string', description: 'perk: the item key (perk:id, trait:id, class:id.move)' }, actionId: S, choice: S, text: S });
  schema.properties.perkLines = opt({ charId: S, key: S, text: S }, ['charId', 'text']);
  schema.properties.conditions = opt({ target: { type: 'string', description: 'NPC id or name, or a charId' }, id: { type: 'string', description: 'condition id' }, scope: { type: 'string', description: 'scene (default), session, arc' }, end: B }, ['target', 'id']);
  schema.properties.traitState = opt({ charId: S, key: S, value: {} }, ['charId', 'key', 'value']);
  schema.properties.echo = opt({ charId: S, n: I, why: S }, ['charId', 'n']);
  schema.properties.karma = opt({ charId: S, amount: I, unlawful: B, why: S }, ['charId', 'amount']);
  schema.properties.rest = { anyOf: [{ type: 'null' }, { type: 'object', properties: { kind: { type: 'string', description: 'short or long' }, settlement: B }, required: ['kind'] }] };
  schema.properties.identify = opt({ charId: S, what: S }, ['charId', 'what']);
  schema.properties.tutors = opt({ charId: S, classId: { type: 'string', description: 'advanced class id' } }, ['charId', 'classId']);
  schema.properties.patrons = opt({ charId: S, patron: { type: 'string', description: 'patron id to make a pact' }, devotion: { type: 'integer', description: 'Devotion change' } }, ['charId']);
  schema.properties.patronMood = opt({ patron: S, tn: I }, ['patron', 'tn']);
  schema.required = [...schema.required, 'objects', 'moment', 'npcs', 'actions', 'magic', 'mana', 'memory', 'chapter'];
  return { name: 'submit_turn', description: 'Hand in your Narrator turn: call this exactly once, with every field, when you are ready (after any wiki lookups).', input_schema: schema };
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
