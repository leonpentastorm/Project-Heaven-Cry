// What a story or area-map action of a perk, trait or class move asks for, as buttons (Leon: "if it does not have a
// button it does not work"). Every input is a picker built from the engine's data (option chips, the party, the people
// on the map, your pack's mods, your designs, a patron's Blessings, a Soul design builder); the only typed input is the
// prose an action genuinely needs (an Established Fact, a cover story), in a small box under that action's own button.
// Never a shared detail field, never the Say box.
//
// pickerFor(entry, ctx) gives the fields; buildArgs(picker, values) turns the picks into the action's args in the
// format the engine already reads (choice / npc / text / targetId; the twin's designs as JSON {designs:[…]}).
import { SCHOOL, MODULE, ITEM, PATRON, PATRONS, SIGIL, packOf, moduleSlots, maxSigilWords, itemWords, type PerkActionEntry } from '@engine';

export interface Opt { id: string; label: string; title?: string; off?: string }
/** A design being built in the picker (as the MAGIC tab's Outburst workshop holds it). */
export interface DesignDraft { school: string; school2?: string; option?: string; modules: string[]; name?: string }
export type Field =
  | { key: string; kind: 'chips'; head: string; options: Opt[]; multi?: number; optional?: boolean; empty?: string }
  | { key: string; kind: 'prose'; head: string; holder: string; optional?: boolean; max?: number }
  | { key: string; kind: 'designs'; head: string; n: number; extra: number };
export interface Picker {
  head: string; hint: string; warn?: string; fields: Field[];
  /** At least one of these fields must be filled (e.g. "who": a token on the map, or described in words). */
  oneOf?: string[];
  build?: (v: Values, x: PickCtx) => Args | string;
}
export type Values = Record<string, any>;
export interface Args { choice?: string; npc?: string; text?: string; targetId?: string }
export interface PickCtx { g: any; c: any; how: 'story' | 'world' }

// ---------- the Soul schools' options (the Outburst workshop on the MAGIC tab uses the same) ----------
export const OPT_LABEL: Record<string, string> = { to_hit_2: '+2 to hit', defense_2: '+2 Defense', heal_30: 'Heal 30', push_3: 'Push 3 tiles', pull_3: 'Pull 3 tiles', pinned: 'Pinned', slowed: 'Slowed',
  fear: 'Afraid', shaken: 'Shaken', confused: 'Confused', left_brain_debuff: 'Left Brain Debuff', right_brain_debuff: 'Right Brain Debuff' };
/** The option value the engine reads on release (data 'push_3' → 'push', 'to_hit_2' → 'hit'). */
export const optValue = (o: string) => o.replace(/^to_/, '').replace(/_\d+$/, '');
/** Module slots of one design: your Will Power slots, plus the action's extra (Beloved: +1). The engine's checkDesign rule. */
export const designSlots = (c: any, extra = 0) => moduleSlots(c) + extra;
/** A second school needs Will Power 5 and a second school known (the engine's checkDesign rule). */
export const twoSchools = (c: any) => (c?.skills?.will_power || 0) >= 5 && (c?.soulKnown?.schools || []).length > 1;
const newDraft = (): DesignDraft => ({ school: '', modules: [] });
export const draftsOf = (v: any, n: number): DesignDraft[] => Array.from({ length: n }, (_, i) => (Array.isArray(v) && v[i]) || newDraft());
const cleanDesign = (d: DesignDraft) => ({ school: d.school, ...(d.school2 ? { school2: d.school2 } : {}), ...(d.option ? { option: d.option } : {}), modules: [...d.modules], ...(d.name && d.name.trim() ? { name: d.name.trim().slice(0, 40) } : {}) });

// ---------- option sources ----------
const human = (s: string) => s.replace(/_/g, ' ').replace(/^./, (x) => x.toUpperCase());
/** The people on the current map (the story's NPCs, not hidden, not dead), by name. */
export function npcOpts(g: any): Opt[] {
  return ((g?.story?.npcs || []) as any[]).filter((n) => !n.dead && !n.hidden).map((n) => ({ id: n.id, label: n.name, title: (n.side === 'hostile' ? 'Hostile' : 'Neutral') + (n.tier ? ' · ' + n.tier : '') }));
}
/** The party: other characters (self: include your own). */
export function squadOpts(g: any, c: any, self = false): Opt[] {
  return (Object.values(g?.characters || {}) as any[]).filter((x) => !x.dead && (self || x.id !== c?.id)).map((x) => ({ id: x.id, label: x.id === c?.id ? x.name + ' (you)' : x.name }));
}
const packItems = (c: any): Opt[] => { const seen = new Set<string>(); const out: Opt[] = [];
  for (const p of (c ? packOf(c) : []) as any[]) { const id = p.item || p.id; if (seen.has(id) || p.kind === 'weapon' || p.mags) continue; seen.add(id); out.push({ id, label: p.name + (p.qty > 1 ? ' ×' + p.qty : '') }); }
  return out; };
const modOpts = (c: any): Opt[] => packItems(c).filter((o) => (ITEM as any)[o.id]?.category === 'mod').map((o) => ({ ...o, title: (ITEM as any)[o.id]?.text || '' }));
const designOpts = (c: any): Opt[] => (c?.outbursts || []).map((d: any) => ({ id: d.id, label: d.name }));
const knownWords = (c: any): string[] => [...new Set([...(c?.sigils || []), ...(c ? itemWords(c) : [])])].filter((w) => (SIGIL as any)[w]);
const wordOpts = (c: any, grandOnly = false): Opt[] => knownWords(c).filter((w) => !grandOnly || (SIGIL as any)[w].grand).map((w) => ({ id: w, label: (SIGIL as any)[w].word, title: grandOnly ? (SIGIL as any)[w].grand : (SIGIL as any)[w].text }));
const blessingOpts = (p: any): Opt[] => (p?.blessings || []).map((b: any) => ({ id: b.id, label: b.name, title: b.text || '' }));
const GAUGE_OPTS: Opt[] = ['rage', 'grief', 'fear', 'devotion'].map((x) => ({ id: x, label: human(x) }));
const CHEM_OPTS: Opt[] = ['nausea', 'poisoned', 'drugged', 'toxin'].map((x) => ({ id: x, label: human(x) }));
/** The Narrator's last turns you can go back to (Foreseen), newest first. */
const turnOpts = (g: any): Opt[] => { const ids: string[] = g?.votes?.turns || [], E: any[] = g?.story?.entries || [];
  return ids.slice().reverse().map((id, i) => { const e = E.find((x) => x.id === id); const t = String(e?.text || '').replace(/\s+/g, ' ');
    return { id, label: (i === 0 ? 'Latest: ' : '') + (t.length > 48 ? t.slice(0, 46) + '…' : t || 'A Narrator turn'), title: t.slice(0, 300) }; }); };

// ---------- field makers ----------
const prose = (head: string, holder = 'Type it', optional = false, key = 'text'): Field => ({ key, kind: 'prose', head, holder, optional, max: 240 });
const npcF = (x: PickCtx, head = 'Who', optional = false): Field => ({ key: 'npc', kind: 'chips', head, options: npcOpts(x.g), optional, empty: 'No one on the map right now.' });
const squadF = (x: PickCtx, head = 'Which squadmate', self = false, optional = false): Field => ({ key: 'squad', kind: 'chips', head, options: squadOpts(x.g, x.c, self), optional, empty: self ? 'No one.' : 'No squadmate here.' });
const chipsF = (key: string, head: string, options: Opt[], multi = 1, optional = false, empty = 'Nothing to pick.'): Field => ({ key, kind: 'chips', head, options, multi, optional, empty });

/** The first id picked in a chips field. */
const one = (v: Values, k: string): string => (Array.isArray(v[k]) ? v[k][0] : v[k]) || '';
const txt = (v: Values, k = 'text'): string => String(v[k] || '').trim();
/** A pack item's name (what the engine matches in the text). */
const itemName = (x: PickCtx, id: string) => ((x.c ? packOf(x.c) : []) as any[]).find((p) => (p.item || p.id) === id)?.name || (ITEM as any)[id]?.name || id;
/** An NPC pick as args: its name (what the engine matches), and on the area map its token (targetId). */
const npcArgs = (v: Values, x: PickCtx): Args => { const id = one(v, 'npc'); if (!id) return {}; const n = npcOpts(x.g).find((o) => o.id === id);
  return { npc: n ? n.label : id, ...(x.how === 'world' ? { targetId: id } : {}) }; };

/** The prose prompts of the actions whose input is words (target 'text'), by action id. */
const PROSE: Record<string, [string, string]> = {
  improvise_story: ['What you make from the scraps', 'A grappling hook, a lockpick…'],
  backdoor_story: ['Which system you crack', 'The bank, the cameras, the city network…'],
  ask: ['Your one question', 'Ask the twin soul'], communion: ['Your one question', 'Ask above'],
  preach_story: ['What you preach', 'Your sermon'], miracle: ['Your prayer', 'What you pray for'],
  mirage_story: ['What you project', 'A false wall, a figure, a sound…'], red_line: ['The line you won\'t cross', 'I never…'],
  lucky_foot_story: ['Which roll against you', 'The guard\'s shot, the dealer\'s hand…'], extraction_story: ['Where the flyer takes you', 'Somewhere out of this zone'],
  cite: ['The fact you cite', 'A fact'], demand: ['The accusation you answer (optional)', 'What they accuse you of'], hint: ['Your sentence', 'One sentence, two meanings'],
  read_org: ['The organisation', 'Its name'], fact: ['The fact you state', 'About the technology, biology or history here'],
  close: ['Your closing argument', 'The point you close on'], vision: ['The decision ahead', 'What you are about to decide'],
  door: ['Your reason to be here', 'Why you belong in this place'], new_name: ['Who you are now', 'Your false identity, in one sentence'],
  case_file: ['Your yes-or-no question', 'About whoever is responsible'], gauge_story: ['What this scene made you feel', 'Rage, grief, fear, devotion…'],
  clean_story: ['Who you spared or protected, and how', 'The moment'], name_line: ['The line you won\'t cross', 'I never…'],
  strike_call_story: ['The strike\'s target (if not on the map)', 'A position, a vehicle…'],
};

/** Per-action pickers, by action id (and item key when an id is shared). */
type Maker = (e: PerkActionEntry, x: PickCtx) => Picker;
const SPECIAL: Record<string, Maker> = {
  // ---- designs (Soul): the twin's three, a Beloved design with one module more ----
  'class:twinbound.manifest#manifest': (e, x) => ({ head: 'The twin\'s three Outbursts', hint: 'From the schools and modules you know; each design has your module slots (Will Power).',
    warn: 'The twin\'s three designs are fixed for the campaign: they can\'t be changed later, even after it falls.',
    fields: [{ key: 'designs', kind: 'designs', head: 'Outburst', n: 3, extra: 0 }],
    build: (v) => { const ds = draftsOf(v.designs, 3); const miss = ds.findIndex((d) => !d.school); if (miss >= 0) return 'Pick a school for Outburst ' + (miss + 1) + '.'; return { text: JSON.stringify({ designs: ds.map(cleanDesign) }) }; } }),
  'class:devoted.beloved_spells#beloved_design': (e, x) => ({ head: 'The Beloved design', hint: 'One module more than your slots: ' + designSlots(x.c, 1) + '.',
    fields: [{ key: 'designs', kind: 'designs', head: 'Beloved', n: 1, extra: 1 }],
    build: (v) => { const d = draftsOf(v.designs, 1)[0]; return d.school ? { text: JSON.stringify(cleanDesign(d)) } : 'Pick a school.'; } }),
  'class:heartfed.four_hearts#key_design': (e, x) => ({ head: 'Key a design to a gauge', hint: e.text,
    fields: [chipsF('design', 'The design', designOpts(x.c), 1, false, 'You have no designs.'), chipsF('gauge', 'The gauge', GAUGE_OPTS)],
    build: (v) => (one(v, 'design') && one(v, 'gauge') ? { choice: one(v, 'design') + ':' + one(v, 'gauge') } : 'Pick a design and a gauge.') }),
  'class:bard.gift#gift': (e, x) => ({ head: 'Gift a design', hint: e.text, fields: [squadF(x, 'To whom'), chipsF('design', 'Which design', designOpts(x.c), 1, false, 'You have no designs.')],
    build: (v) => { const d = (x.c?.outbursts || []).find((o: any) => o.id === one(v, 'design')); return { choice: one(v, 'squad'), text: d ? d.name : '' }; } }),
  // ---- gear: a mod from your pack ----
  'trait:ghost_soldier#fit_arm': (e, x) => ({ head: 'The mod to fit', hint: e.text, fields: [chipsF('choice', 'A mod in your pack', modOpts(x.c), 1, false, 'No mod in your pack.')] }),
  'perk:overhaul#extra_slot': (e, x) => ({ head: 'The mod for the new slot', hint: e.text, fields: [chipsF('choice', 'A mod in your pack', modOpts(x.c), 1, false, 'No mod in your pack.')] }),
  extra_mod: (e, x) => ({ head: 'The second mod', hint: e.text, fields: [chipsF('choice', 'A mod in your pack', modOpts(x.c), 1, false, 'No mod in your pack.')] }),
  'perk:sleight_of_hand#plant_story': (e, x) => ({ head: 'Plant an item', hint: e.text, fields: [npcF(x, 'On whom'), chipsF('item', 'What', packItems(x.c), 1, false, 'Your pack is empty.'), prose('How (optional)', 'Slipped into a coat pocket…', true)],
    build: (v, xx) => { const it = itemName(xx, one(v, 'item')); return { ...npcArgs(v, xx), text: it + (txt(v) ? ': ' + txt(v) : '') }; } }),
  'trait:market_blood#appraise': (e, x) => ({ head: 'What you appraise', hint: 'Pick an item, or none for your whole pack.', fields: [chipsF('item', 'An item in your pack', packItems(x.c), 1, true, 'Your pack is empty.')],
    build: (v, xx) => ({ text: one(v, 'item') ? itemName(xx, one(v, 'item')) : '' }) }),
  // ---- Sigils ----
  'class:spellslinger.inscribed_rounds#inscribe_rounds': (e, x) => ({ head: 'Inscribed Rounds', hint: e.text, fields: [chipsF('choice', 'The word', e.options || [], 1, false, 'No words known.'), chipsF('count', 'How many rounds (1 charge each)', [1, 2, 3, 4, 5, 6].map((n) => ({ id: String(n), label: String(n) })))],
    build: (v) => (one(v, 'choice') && one(v, 'count') ? { choice: one(v, 'choice'), text: one(v, 'count') } : 'Pick a word and how many rounds.') }),
  'class:scribe.stored_spell#write': (e, x) => ({ head: 'Store a spell', hint: e.text.replace(/\s*\(say[^)]*\)/, ''), fields: [chipsF('words', 'The words (a Subject, then a Form or Motion)', wordOpts(x.c), Math.max(2, Math.floor(maxSigilWords(x.c))), false, 'No words known.'),
    chipsF('shape', 'The shape', ['stack', 'line', 'ring'].map((s) => ({ id: s, label: human(s) })))],
    build: (v) => { const w: string[] = v.words || []; if (w.length < 2) return 'Pick at least two words.'; return { text: w.map((y) => y.toUpperCase()).join(' ') + ' ' + (one(v, 'shape') || 'stack') }; } }),
  'class:grand_sigilist.enlarge#enlarge_story': (e, x) => ({ head: 'Lay a Grand form', hint: e.text.replace(/\s*\(say[^)]*\)/, ''), fields: [chipsF('word', 'The word', wordOpts(x.c, true), 1, false, 'No word with a Grand form known.'), prose('Where', 'The place you lay it over')],
    build: (v) => ({ text: (SIGIL as any)[one(v, 'word')]?.word + ': ' + txt(v) }) }),
  // ---- faith ----
  'class:lumeri_templar.blessed_shells#bless_shell': (e, x) => ({ head: 'The Blessing to seal in the shell', hint: e.text, fields: [chipsF('choice', (PATRON as any)[x.c?.patron]?.name || 'Your patron', blessingOpts((PATRON as any)[x.c?.patron]), 1, false, 'You have no patron.')] }),
  'trait:heretic#stolen_fire_story': (e, x) => ({ head: 'The Blessing you steal', hint: e.text, fields: [chipsF('choice', 'A patron\'s Blessing', (PATRONS as any[]).flatMap((p) => (p.blessings || []).map((b: any) => ({ id: p.id + ':' + b.id, label: p.name + ' · ' + b.name, title: b.text || '' })))), prose('Your prayer (optional)', 'What you say', true)] }),
  // ---- the party ----
  'perk:field_surgeon#patch': (e, x) => ({ head: 'Who you patch up', hint: e.text, fields: [squadF(x)] }),
  'class:medic.triage#triage_story': (e, x) => ({ head: 'Who you triage', hint: 'Pick an ally, or none for the most hurt.', fields: [squadF(x, 'The ally', false, true)] }),
  'class:medic.field_surgery#injury': (e, x) => ({ head: 'Who you operate on', hint: 'Pick who, or none for yourself.', fields: [squadF(x, 'Who', true, true)] }),
  'class:medic.field_surgery#conditions': (e, x) => ({ head: 'Who you treat', hint: 'Pick who, or none for yourself.', fields: [squadF(x, 'Who', true, true)] }),
  'class:scribe.inscribe_gear#weapon_story': (e, x) => ({ head: 'Whose weapon', hint: e.text + ' Pick whose, or none for your own.', fields: [squadF(x, 'Whose', true, true)] }),
  'class:scribe.inscribe_gear#armour_story': (e, x) => ({ head: 'Whose armour', hint: 'Pick whose, or none for your own.', fields: [squadF(x, 'Whose', true, true)] }),
  'class:bard.inspire#inspire_story': (e, x) => ({ head: 'Who you inspire', hint: e.text.replace(/\s*\(named[^)]*\)/, ''), fields: [squadF(x)] }),
  // ---- people on the map ----
  'perk:grapple#grapple_npc': (e, x) => ({ head: 'Who you grab', hint: e.text, fields: [npcF(x)] }),
  'perk:lay_down_arms#plea': (e, x) => ({ head: 'Who you plead with', hint: e.text, fields: [npcF(x), prose('Your plea (optional)', 'What you say', true)] }),
  'perk:true_name#true_name_story': (e, x) => ({ head: 'Whose true name', hint: e.text.replace(/\s*\(type who\)/, ''), oneOf: ['npc', 'text'], fields: [npcF(x, 'Someone here', true), prose('Or name the being, curse or creature', 'What it is', true)] }),
  'trait:moon_hunter#track': (e, x) => ({ head: 'Whose trail', hint: e.text.replace(/\s*\(type whose\)/, ''), oneOf: ['npc', 'text'], fields: [npcF(x, 'Someone you met here', true), prose('Or describe whose trail', 'The deserter, the beast…', true)] }),
  'trait:occultist#weakness': (e, x) => ({ head: 'Which creature', hint: e.text.replace(/\s*\(pick it[^)]*\)/, ''), oneOf: ['npc', 'text'], fields: [npcF(x, 'Someone here', true), prose('Or name the creature', 'What it is', true)] }),
  'trait:symbol_of_order#invoke_law': (e, x) => ({ head: 'Invoke the law', hint: e.text.replace(/\s*Type the question\./, ''), fields: [npcF(x, 'The official (optional)', true), prose('Your question', 'One question they must answer')] }),
  'trait:trench_poet#verse_story': (e, x) => ({ head: 'Verse', hint: e.text.replace(/\s*\(type it\)/, ''), fields: [npcF(x, 'Who hears it (optional)', true), prose('Your metaphor', 'Answer in metaphor')] }),
  'perk:bone_talk#bone_talk_story': (e, x) => ({ head: 'Bone Talk', hint: e.text.replace(/\s*\(type it\)/, ''), fields: [npcF(x, 'Who you threaten'), prose('The physical detail', 'One specific detail')] }),
  'class:trickster.rewrite#rewrite_story': (e, x) => ({ head: 'Rewrite', hint: e.text.replace(/\s*\(say who and what\)/, ''), fields: [npcF(x, 'Whose'), prose('What they rely on', 'The blessing, ward or advantage')],
    build: (v, xx) => ({ text: npcArgs(v, xx).npc + ': ' + txt(v) }) }),
  'class:hexer.puppet#puppet_story': (e, x) => ({ head: 'Puppet', hint: e.text.replace(/:\s*say who and what they do/, ':'), fields: [npcF(x, 'Whose strings'), prose('What they do', 'The one thing they do')],
    build: (v, xx) => ({ text: npcArgs(v, xx).npc + ': ' + txt(v) }) }),
  'class:rtc_contractor.strike_call#strike_call_story': (e, x) => ({ head: 'Strike Call', hint: e.text, oneOf: ['npc', 'text'], fields: [npcF(x, 'The target on the map', true), prose(...PROSE.strike_call_story, true)],
    build: (v, xx) => ({ text: [npcArgs(v, xx).npc, txt(v)].filter(Boolean).join(': ') }) }),
  'class:gunslinger.called_shot#called_shot_story': (e, x) => ({ head: 'Called Shot', hint: e.text.replace(/^Say where you put the round \(head, arm or leg\)\.\s*/, ''), fields: [chipsF('loc', 'Where the round goes', ['head', 'arm', 'leg'].map((s) => ({ id: s, label: human(s) }))), npcF(x, 'At whom (optional)', true)],
    build: (v, xx) => { const n = npcArgs(v, xx).npc; return { text: (n ? n + ': ' : '') + 'the ' + one(v, 'loc'), ...(n ? { npc: n } : {}) }; } }),
  'perk:bedside_manner#touch': (e, x) => ({ head: 'Who you touch', hint: e.text, fields: [npcF(x)] }),
  'perk:old_tongue#speak': (e, x) => ({ head: 'Who you speak to', hint: e.text, fields: [npcF(x, 'The being'), prose('What you say (optional)', 'In its own tongue', true)] }),
  'perk:their_own_idea#suggest': (e, x) => ({ head: 'Their Own Idea', hint: e.text.replace(/\s*Type it; name the listener\./, ''), fields: [npcF(x, 'The listener'), prose('The suggestion', 'Hidden inside a sentence')] }),
  // ---- the room's Narrator turns ----
  'perk:foreseen#foresee': (e, x) => ({ head: 'Which decision went wrong', hint: 'The room votes to go back to before that Narrator turn.', fields: [chipsF('choice', 'The Narrator turn', turnOpts(x.g), 1, false, 'No Narrator turn to go back to.'), prose('What went wrong (optional)', 'In a few words', true)] }),
  // ---- optional words where the action used to take them silently ----
  'perk:breaching_strike#breach_story': (e) => ({ head: 'Breaching Strike', hint: e.text, fields: [prose('What you smash through (optional)', 'The door, the barricade…', true)] }),
  'perk:earthbreaker#earthbreaker_story': (e) => ({ head: 'Earthbreaker', hint: e.text, fields: [prose('What you bring down (optional)', 'The floor, a wall…', true)] }),
  'trait:inner_ring_heir#favour': (e) => ({ head: 'The favour', hint: e.text.replace(/\s*Type the favour\./, ''), fields: [prose('What you ask the family for', 'The favour')] }),
  'trait:holo_drama_addict#drama': (e) => ({ head: 'The holo-drama scene', hint: e.text, fields: [prose('Your action, as a holo-drama scene', 'Cue the music…')] }),
  'trait:rogue_element#spanner': (e) => ({ head: 'Spanner in the Works', hint: e.text.replace(/\s*Say what you wrecked\./, ''), fields: [prose('What you wrecked', 'Their plan, their property')] }),
  'perk:lab_coat#neutralise_agent': (e, x) => ({ head: 'Which agent', hint: e.text + ' Pick one, or none for every agent you identified.', fields: [chipsF('choice', 'The agent', CHEM_OPTS, 1, true)] }),
};

/** The key a picker is filed under: "itemKey#actionId", else the bare action id (shared ones like extra_mod). */
const keyOf = (e: Pick<PerkActionEntry, 'id' | 'actionId'>) => e.id + '#' + e.actionId;
/** Targets picked on the area map (a token, a tile, an object): no picker here. */
export const ON_MAP = ['unit', 'enemy', 'ally', 'tile', 'object'];

/** The picker for this action, or null when it is a plain button (or picked on the map). */
export function pickerFor(e: PerkActionEntry, x: PickCtx): Picker | null {
  const sp = SPECIAL[keyOf(e)] || SPECIAL[e.actionId];
  if (sp) return sp(e, x);
  if (ON_MAP.includes(e.target)) return null;
  const opts = e.options || [];
  if (e.options) {
    const multi = e.pickMulti || 1;
    return { head: e.pickLabel || 'Pick', hint: e.text, fields: [chipsF('choice', e.pickLabel || 'Pick' + (multi > 1 ? ' (up to ' + multi + ')' : ''), opts, multi, false, 'Nothing to pick.')] };
  }
  if (e.target === 'npc') return { head: e.label, hint: e.text, fields: [npcF(x)] };
  if (e.target === 'text') { const [head, holder] = PROSE[e.actionId] || ['What you say or do', 'Type it']; return { head: e.label, hint: e.text, fields: [prose(head, holder, /optional/.test(head))] }; }
  return null;
}

/** The picks as the action's args, or what is still missing. */
export function buildArgs(p: Picker, v: Values, x: PickCtx): Args | string {
  for (const f of p.fields) {
    if (p.oneOf?.includes(f.key)) continue;
    const val = v[f.key];
    if (f.kind === 'chips' && !f.optional && !(Array.isArray(val) ? val.length : val)) return f.options.length ? 'Pick ' + lower(f.head) + '.' : f.empty || 'Nothing to pick.';
    if (f.kind === 'prose' && !f.optional && !String(val || '').trim()) return 'Write ' + lower(f.head) + '.';
  }
  if (p.oneOf && !p.oneOf.some((k) => (Array.isArray(v[k]) ? v[k].length : String(v[k] || '').trim()))) return 'Pick someone, or say who.';
  if (p.build) return p.build(v, x);
  const out: Args = {};
  for (const f of p.fields) {
    const val = v[f.key];
    if (f.kind === 'chips' && f.key === 'choice') { const ids: string[] = Array.isArray(val) ? val : val ? [val] : []; if (ids.length) out.choice = ids.join(' '); }
    if (f.kind === 'chips' && f.key === 'squad' && one(v, 'squad')) out.choice = one(v, 'squad');
    if (f.kind === 'chips' && f.key === 'npc') Object.assign(out, npcArgs(v, x));
    if (f.kind === 'prose' && txt(v, f.key)) out.text = txt(v, f.key).slice(0, f.max || 240);
  }
  return out;
}
const lower = (s: string) => s.replace(/\s*\(optional\)/, '').replace(/^./, (y) => y.toLowerCase());

/** The chips a design slot offers, from the engine's data (the Outburst workshop's rules). */
export function designSlotView(c: any, d: DesignDraft, extra: number) {
  const known = c?.soulKnown || { schools: [], modules: [] }, slots = designSlots(c, extra);
  return {
    schools: (known.schools as string[]).filter((s) => (SCHOOL as any)[s]).map((s) => ({ id: s, label: (SCHOOL as any)[s].name, title: (SCHOOL as any)[s].text || '' })),
    schools2: twoSchools(c) && d.school ? (known.schools as string[]).filter((s) => s !== d.school && (SCHOOL as any)[s]).map((s) => ({ id: s, label: (SCHOOL as any)[s].name })) : [],
    options: d.school ? (((SCHOOL as any)[d.school]?.options || []) as string[]).map((o) => ({ id: optValue(o), label: OPT_LABEL[o] || o })) : [],
    modules: (known.modules as string[]).filter((m) => (MODULE as any)[m]).map((m) => ({ id: m, label: (MODULE as any)[m].name, title: (MODULE as any)[m].text || '', cost: (MODULE as any)[m].cost || 0 })),
    slots,
  };
}
/** A draft after a pick in its slot (a school resets the option to the school's first, as the workshop does). */
export function pickInDraft(c: any, d: DesignDraft, what: 'school' | 'school2' | 'option' | 'module' | 'name', id: string, extra: number): DesignDraft {
  if (what === 'school') { const o = ((SCHOOL as any)[id]?.options || []) as string[]; return { ...d, school: id, option: o.length ? optValue(o[0]) : '', school2: d.school2 === id ? '' : d.school2 }; }
  if (what === 'school2') return { ...d, school2: d.school2 === id ? '' : id };
  if (what === 'option') return { ...d, option: id };
  if (what === 'name') return { ...d, name: id.slice(0, 40) };
  const on = d.modules.includes(id);
  if (!on && d.modules.length >= designSlots(c, extra)) return d;
  return { ...d, modules: on ? d.modules.filter((m) => m !== id) : [...d.modules, id] };
}
