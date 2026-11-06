// The AI Narrator's context, in layers ordered for prompt caching (docs/design/tech-plan.md, section 7):
// 1. rules and output contract (never changes) · 2. campaign lore (per campaign) · 3. party sheets (per level-up)
// then, uncached: memory, the recent transcript, and this turn's job.
import { type GameState, type Character, songOf, comboEligible, wikiLookup, wikiKinds, ITEM, SKILL, SKILLS, CLASS, PERK, PERKS, TRAITS, WEAPONS, ENEMIES, eligibleClasses, mod, maxHp, xpForLevel, mapBrief, zoneMap, positionsOf, refOf, storyObjects, OBJECT_KINDS, kindOf, campaignOf } from '@engine';
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

COMBO PERKS (deeds)
- When a character with 5+ points in every listed skill actually does a perk's deed in the story, add deeds[] with that perkId. The list of combo perks is below. Never mention perks the party doesn't hold, and never mention Ultimate perks at all: they are a secret.

FIGHTS
- When violence breaks out, start a fight with combat: give it a name, a map (a zone id from the campaign, usually the current zone; yard is a generic open map), a difficulty (easy, standard, hard, boss: sets the XP), and 2 to 6 enemies, each with a name, a tier (minion, soldier, elite, boss) and a weapon id. The engine runs the whole fight on the grid and tells you how it ended; you then narrate the aftermath.
- Enemy tiers, weakest to strongest: minion (fodder), soldier (trained), elite (a veteran or a specialist), boss (the fight's centre). The engine sets their numbers.
- Weapon ids: ${WEAPONS.filter((w: any) => !/smoke|flash/.test(w.id)).map((w: any) => w.id).join(', ')}.

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

SCENES
- sceneTitle: set a short new title (2-6 words) when the scene changes location or time; otherwise an empty string. endScene: when a scene closes, a 1-3 sentence summary of what matters later (facts, NPCs, promises, open threads); otherwise null.

WORLD RULES THAT NEVER BREAK
- The Unspoken Name: no real-world (real Earth) person, brand, place or work is ever named in the world. Celestials may imitate things; characters never name the originals.
- In-universe language only. The world is a simulation, but NPCs must not learn it (the Knowing); keep that truth as subtext.
- Tone: NPCs are funny the way people are; Celestials are funny the way people are when nothing can hurt them. The tragedy belongs to the NPCs.
- Keep traits that are deliberately ugly in clean in-world language.

THE WIKI (wiki_lookup)
- You carry only what this moment needs. For anything else, call wiki_lookup with keys before you answer: skill:<id>, trait:<id>, perk:<id>, weapon:<id>, item:<id>, condition:<id>, class:<id>, patron:<id>, enemy:<tier>, object:<kind>, lore:<key>. Batch your keys in one call; at most a few calls per turn. Never look up what is already above.
- Conditions: ${wikiKinds().condition.join(', ')}. Classes: ${wikiKinds().class.join(', ')}. Patrons: ${wikiKinds().patron.join(', ')}.
- Lore keys (beyond what the campaign block already gives you): ${loreKeys().join(', ')}.
- Looked-up lore is still Narrator-only: never reveal its truths outright.

OUTPUT
- Hand in your turn by calling submit_turn exactly once, after any wiki lookups. Every field is required; use empty arrays, an empty string or null when there is nothing to add.`;

export function campaignPrompt(g: GameState): string {
  const c = campaignOf(g)!;
  const zones = c.zones.map((z) => `- ${z.id}: ${z.name}. ${z.summary}${(z.exits || []).length ? ' Exits: ' + z.exits!.map((e) => e.to + (e.at ? ' at ' + e.at : '') + ' (' + e.text + ')').join('; ') : ''}`).join('\n');
  return [
    `CAMPAIGN: ${c.title} (${c.kicker})`, 'What the players were told:\n' + c.pitch.join('\n'), c.meta,
    `TONE CHOSEN BY THE HOST: ${g.settings.tone}.`,
    '\nTHE ARC (Narrator only). It is the intended shape, not a script: players can change any of it. Steer by it, never force it.',
    'Beginning: ' + c.arc.beginning, 'Middle: ' + c.arc.middle, 'End: ' + c.arc.end,
    c.secrets?.length ? '\nSECRETS (never state outright):\n' + c.secrets.map((x) => '- ' + x).join('\n') : '',
    c.cast?.length ? '\nCAST:\n' + c.cast.map((x) => `- ${x.name} (${x.role}): ${x.text}`).join('\n') : '',
    '\nZONES (move the party between them with travel):\n' + zones,
    c.encounters?.length ? '\nPREPARED FIGHTS (use when the story gets there; adapt freely):\n' + c.encounters.map((e) => `- ${e.name} in ${e.zone}, ${e.difficulty}: ${e.when} Enemies: ${e.enemies.map((f) => f.name + ' (' + f.tier + ', ' + f.weapon + (f.at ? ', at ' + f.at : '') + ')').join(', ')}.`).join('\n') : '',
    c.lore === 'docs/lore/MPAT-and-M813.md' ? '\nCAMPAIGN SOURCE (the canon behind this campaign; the incident is history the players are about to live):\n' + clean(drop(m813, ['Use in the game'])) : c.lore ? '\nCAMPAIGN LORE:\n' + c.lore : '',
    '\nWORLD BIBLE (Narrator only; never reveal its truths outright; only the parts this campaign needs):\n' + clean(bibleFor(g)),
    takes(loreFor(g), 'sector-earth') ? '\nTHE EARTH SECTOR (the party\'s origins only):\n' + clean(sectorFor(g)) : '',
    takes(loreFor(g), 'epccg-cast') ? '\nTHE EPCCG CAST AND FACTIONS:\n' + clean(cast) : '',
  ].filter(Boolean).join('\n');
}

const pts = (c: Character) => Object.entries(c.skills).filter(([, p]) => p > 0).sort((a, b) => b[1] - a[1]);
export function characterBrief(g: GameState, c: Character): string {
  const skills = pts(c).map(([id, n]) => `${SKILL[id].name} (${id}) ${n} [${mod(n) >= 0 ? '+' : ''}${mod(n)}]`).join(', ');
  const traits = c.traits.map((t) => TRAIT[t] ? `${TRAIT[t].name}: ${String(TRAIT[t].text).replace(/\n/g, ' ')}` : t).join(' | ') || 'none';
  const perks = c.perks.filter((x) => PERK[x.id]?.tier !== 'ultimate').map((x) => `${PERK[x.id].name} (${x.tier})`).join(', ') || 'none';
  const over = pts(c).filter(([, n]) => n >= 5).map(([id]) => `${SKILL[id].name}: ${(SKILL[id] as any).overreach?.text || ''}`).join(' | ') || 'none yet';
  const voices = pts(c).map(([id]) => { const v = (SKILL[id] as any).voice || {}; return `  - ${SKILL[id].name}: ${v.persona} Wants: ${v.wants} Style: ${v.style} ${v.never || ''}`; }).join('\n');
  const id = c.identity || {};
  return `CHARACTER ${c.name} (charId ${c.id})${c.dead ? ' — DEAD' : ''}
  Origin: ${c.origin}. Level ${c.level} (${c.xp} XP; next level at ${xpForLevel(c.level + 1)}). Class: ${c.classId ? CLASS[c.classId].name : 'none yet (earned at level 3; closest: ' + eligibleClasses(c.skills).map((x) => x.name).join(' or ') + ')'}.
  HP ${c.hp}/${maxHp(c)}. Echo ${c.echo}. Weapon: ${c.weapon}. Identity: ${Object.entries(id).filter(([k, v]) => v && !/^song/.test(k)).map(([k, v]) => k + ' ' + v).join('; ') || 'not given'}${songOf(c) ? '; has a favourite song (never name it)' : ''}.
  Skills: ${skills}.
  Traits: ${traits}
  Perks: ${perks}. Overreach triggers: ${over}
  Voices:
${voices}`;
}

export function partyPrompt(g: GameState): string {
  // Only combos someone in the party can earn right now (5+ in every skill, not yet held): the rest is noise and a spoiler.
  const combos = PERKS.filter((p: any) => p.tier === 'achieved' && Object.values(g.characters).some((c) => !c.dead && !comboEligible(c, p.id))).map((p: any) => `${p.id} (${p.skills.map((s: string) => SKILL[s].name).join(' + ')} 5 each): deed "${p.deed}"`).join('\n');
  return 'THE PARTY\n' + Object.values(g.characters).map((c) => characterBrief(g, c)).join('\n\n') + '\n\nSKILL IDS: ' + SKILLS.map((s) => s.id).join(', ') + '\n\nCOMBO PERKS THE PARTY CAN EARN NOW (perkId, skills, deed):\n' + (combos || 'none yet');
}

/** The uncached part: memory, recent transcript, and what this call must do. */
export function turnPrompt(g: GameState): string {
  const w = g.story.work!;
  const recent = g.story.entries.filter((e) => !e.to && !e.ooc && !/ joined the room\.$| is skipped this round\.$| is locked in\.$/.test(e.text)).slice(-40).map((e) => {
    if (e.kind === 'player') return `[${e.head}] ${e.text}${e.roll ? ' (the player asks you to pick a roll for this)' : ''}`;
    if (e.kind === 'narration') return `[Narrator] ${e.text}`;
    if (e.kind === 'check') return `[Check] ${e.head} — ${e.text}`;
    if (e.kind === 'scene') return `[New scene] ${e.text}`;
    return `[${e.kind}] ${e.text}`;
  }).join('\n');
  const choices = g.overreach.filter((o) => o.choice).map((o) => `${g.characters[o.charId]?.name} ${o.choice === 'resist' ? 'resisted' : 'indulged'} ${SKILL[o.skill].name}'s push: "${o.push}"`).join('\n');
  const job = w.kind === 'opening'
    ? 'This is the OPENING of session 1. ' + (campaignOf(g)?.opening || 'Set the first scene from the campaign.') + ' Give a sceneTitle, give every character a reason to act, add hooks, and end on a clear prompt. No checks yet.'
    : w.kind === 'round' ? `Round ${g.story.round}: every player has acted (see the transcript's last [Player] lines). Answer all of them together. Request checks where outcomes are uncertain.`
    : w.kind === 'results' ? 'The engine has rolled the checks you asked for (see the last [Check] lines) and the players made their Overreach choices. Narrate the outcomes, honouring each success and failure exactly, then open the next round. Award XP if something was achieved.'
    : `The fight is over. The engine's report:\n${w.note || ''}\nNarrate the aftermath from these moments (who did what, who is hurt and where they stand), rule on anything said or attempted mid-fight, then open the next round. The engine already gave combat XP.`;
  const hurt = Object.values(g.characters).map((c) => `${c.name}: ${c.dead ? 'dead' : c.hp + ' HP'}${c.injuries?.length ? ', injured ' + c.injuries.map((i) => (i.side ? i.side + ' ' : '') + i.loc).join(', ') : ''}`).join('; ');
  const pos = positionsOf({ ...g, story: { ...g.story, positions: { ...(g.story.positions || {}) } } });
  const where = Object.values(g.characters).filter((c) => !c.dead && pos[c.id]).map((c) => c.name + ' ' + refOf(pos[c.id])).join(', ');
  const objs = storyObjects({ ...g, story: { ...g.story, objects: g.story.objects ? [...g.story.objects] : undefined } })
    // Plain cover and exits are the engine's business (exits are listed with the zones); POIs, hazards, doors and anything with approaches stay.
    .filter((o) => o.approaches.length || !['crate', 'pillar', 'rubble', 'low_wall', 'barricade', 'exit'].includes(o.kind));
  const objText = objs.map((o) => `${o.id} ${o.name} (${o.kind}${o.hidden ? ', hidden' : ''}${o.locked ? ', locked' : ''}${o.open ? ', open' : ''}${o.hp != null && o.hp <= 0 ? ', broken' : o.hp != null && o.max && o.hp < o.max ? ', damaged' : ''}${o.resolved ? ', dealt with' : ''}) at ${refOf(o.pos)}${o.text ? ': ' + o.text : ''}`
    + (o.approaches.length ? '\n    approaches: ' + o.approaches.map((a, i) => `${i + 1}. ${a.label} [${a.skills.join('+')} TN ${a.tn}${a.success ? ', ' + a.success : ''}]${a.tries.length ? ' tries: ' + a.tries.map((t) => t.name + ' ' + (t.ok ? 'succeeded' : 'failed') + ' (' + t.total + ')').join(', ') : ''}`).join('; ') : '')).join('\n  ');
  const mus = g.music?.now ? g.characters[g.music.now.charId] : null;
  const music = mus ? `\n\nMUSIC: ${mus.name}'s song is playing for the room (${g.music!.now!.layer === 'pin' ? 'kept on by their music trait' : g.music!.now!.reason}). You may let it colour the scene; never name the song or the artist.` : '';
  const sceneMem = g.story.journal.slice(-8).map((s, i) => `${i + 1}. ${s}`).join('\n') || 'none yet';
  return `MEMORY (summaries of closed scenes):\n${sceneMem}\n\nPARTY CONDITION: ${hurt}${music}\n\nTHE MAP WHERE THE STORY IS NOW:\n${mapBrief(zoneMap(g))}\n\nWHERE EVERYONE STANDS (${zoneMap(g).name}): ${where || 'unknown'}\n\nOBJECTS ON THE MAP:\n  ${objText || 'none besides cover'}\n\nCURRENT SCENE: ${g.story.scene.title || '(none yet)'}\n\nRECENT TRANSCRIPT (oldest first):\n${recent || '(the session is just starting)'}\n${choices ? '\nOVERREACH CHOICES:\n' + choices + '\n' : ''}\nYOUR JOB NOW: ${job}`;
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
    checks: { type: 'array', items: obj({ charId, skills: { type: 'array', items: skill }, tn, stakes: { type: 'string' } }) },
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
  schema.required = [...schema.required, 'objects'];
  return { name: 'submit_turn', description: 'Hand in your Narrator turn: call this exactly once, with every field, when you are ready (after any wiki lookups).', input_schema: schema };
}
