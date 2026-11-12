// What a story, area-map or combat action of a perk, trait or class move asks for, as buttons (Leon: "if it does not have a
// button it does not work"). Every input is a picker built from the engine's data (option chips, the party, the people
// on the map, your pack's mods, your designs, a patron's Blessings, a Soul design builder); the only typed input is the
// prose an action genuinely needs (an Established Fact, a cover story), in a small box under that action's own button.
// Never a shared detail field, never the Say box.
//
// pickerFor(entry, ctx) gives the fields; buildArgs(picker, values) turns the picks into the action's args in the
// format the engine already reads (choice / npc / text / targetId; the twin's designs as JSON {designs:[…]}).
// In a fight (ctx.how 'combat') the action's own target is still a click on the grid (a token or a tile); a second
// pick on the grid (where a run ends, where a thrown crate lands, the enemy an ally attacks) is a 'unit' or 'tile'
// field the next grid click fills (combat.js).
import { SCHOOL, MODULE, ITEM, PATRON, PATRONS, SIGIL, WEAPON, TONE, TONES, packOf, moduleSlots, maxSigilWords, itemWords, debuffsOf, condName, isMelee, schoolSide, type PerkActionEntry } from '@engine';

export interface Opt { id: string; label: string; title?: string; off?: string }
/** A design being built in the picker (as the MAGIC tab's Outburst workshop holds it): rules 1.5, a school and its
 * option, a second school with its own option (a rider at half), a tone, one shape, modules, a name. */
export interface DesignDraft { school: string; school2?: string; option?: string; option2?: string; tone?: string; modules: string[]; name?: string }
export type Field =
  | { key: string; kind: 'chips'; head: string; options: Opt[]; multi?: number; optional?: boolean; empty?: string }
  | { key: string; kind: 'prose'; head: string; holder: string; optional?: boolean; max?: number }
  | { key: string; kind: 'designs'; head: string; n: number; extra: number }
  /** A token on the combat grid (the next click on one fills it): its unit id. side: whose tokens it takes. */
  | { key: string; kind: 'unit'; head: string; side: 'foe' | 'ally' | 'any'; optional?: boolean; multi?: number; repeat?: boolean }
  /** A tile on the combat grid (the next click on a tile fills it): "x,y". */
  | { key: string; kind: 'tile'; head: string; optional?: boolean; multi?: number };
export interface Picker {
  head: string; hint: string; warn?: string; fields: Field[];
  /** At least one of these fields must be filled (e.g. "who": a token on the map, or described in words). */
  oneOf?: string[];
  build?: (v: Values, x: PickCtx) => Args | string;
}
export type Values = Record<string, any>;
export interface Args { choice?: string; npc?: string; text?: string; targetId?: string; targetIds?: string[]; tile?: string }
/** cb and u: the fight and the acting unit (how 'combat'). */
export interface PickCtx { g: any; c: any; how: 'story' | 'world' | 'combat'; cb?: any; u?: any }

// ---------- the Soul schools' options (the Outburst workshop on the MAGIC tab uses the same) ----------
export const OPT_LABEL: Record<string, string> = { to_hit_2: '+2 to hit', defense_2: '+2 Defense', heal_30: 'Heal', push_3: 'Push 3 tiles', pull_3: 'Pull 3 tiles', pinned: 'Pinned', slowed: 'Slowed',
  fear: 'Afraid', shaken: 'Shaken', confused: 'Confused', left_brain_debuff: 'Left Brain Debuff', right_brain_debuff: 'Right Brain Debuff',
  // rules 1.19: the Damage school's ways to strike, Control's Swap, Status' Silenced
  strike: 'Strike', finish: 'Finish', brand: 'Brand', drain: 'Drain', swap: 'Swap places', silenced: 'Silenced' };
/** The option value the engine reads on release (data 'push_3' → 'push', 'to_hit_2' → 'hit'). */
export const optValue = (o: string) => o.replace(/^to_/, '').replace(/_\d+$/, '');
/** Module slots of one design: your Will Power slots, plus the action's extra (Beloved: +1). The engine's checkDesign rule. */
export const designSlots = (c: any, extra = 0) => moduleSlots(c) + extra;
/** A second school needs Will Power 5 and a second school known (the engine's checkDesign rule). */
export const twoSchools = (c: any) => (c?.skills?.will_power || 0) >= 5 && (c?.soulKnown?.schools || []).length > 1;
const newDraft = (): DesignDraft => ({ school: '', modules: [] });
export const draftsOf = (v: any, n: number): DesignDraft[] => Array.from({ length: n }, (_, i) => (Array.isArray(v) && v[i]) || newDraft());
export const cleanDesign = (d: DesignDraft) => ({ school: d.school, ...(d.school2 ? { school2: d.school2 } : {}), ...(d.option ? { option: d.option } : {}), ...(d.school2 && d.option2 ? { option2: d.option2 } : {}),
  ...(d.tone && d.tone !== 'raw' ? { tone: d.tone } : {}), modules: [...d.modules], ...(d.name && d.name.trim() ? { name: d.name.trim().slice(0, 40) } : {}) });
/** A shape module (Wave, Burst, Aura, Lance): one a design at most; Size needs one. */
export const isShapeMod = (id: string) => !!(MODULE as any)[id]?.form;
/** The second schools a draft can take: known, not its first, on the same side (rules 1.5, 4.2: spec item 542). */
const sameSide = (d: DesignDraft, s2: string) => s2 !== d.school && schoolSide(s2, d.modules) === schoolSide(d.school, d.modules);
/** A draft with what no longer fits dropped: a second school on the other side (Inverse toggled), Size without a shape. */
const tidy = (d: DesignDraft): DesignDraft => {
  let x = { ...d, modules: [...d.modules] };
  if (!x.modules.some(isShapeMod)) x.modules = x.modules.filter((m) => m !== 'size');
  if (x.school2 && !sameSide(x, x.school2)) x = { ...x, school2: '', option2: '' };
  return x;
};
const firstOpt = (school: string) => { const o = ((SCHOOL as any)[school]?.options || []) as string[]; return o.length ? optValue(o[0]) : ''; };

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
/** Rewrite in the story (Trickster): the kinds of advantage someone can rely on, as buttons. */
const REWRITE_OPTS: Opt[] = [
  ['blessing', 'A blessing', 'A patron\'s favour or a prayer answered'], ['ward', 'A ward', 'A charm, a seal, a protective spell'],
  ['shield', 'A shield or armour', 'What stands between them and harm'], ['position', 'Their position', 'Cover, high ground, a locked door'],
  ['weapon', 'Their weapon', 'The gun or blade they count on'], ['backup', 'Their backup', 'Guards, allies, the people behind them'],
  ['authority', 'Their authority', 'Rank, a badge, the law on their side'], ['nerve', 'Their nerve', 'Courage, calm, certainty'],
  ['luck', 'Their luck', 'A streak, a sure thing'],
].map(([id, label, title]) => ({ id, label, title }));
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
  'class:scribe.stored_spell#write': (e, x) => ({ head: 'Store a spell', hint: e.text.replace(/\s*\(say[^)]*\)/, ''), fields: [chipsF('words', 'The words in order (a Subject first, then Reach, Delivery, Burst or Filter)', wordOpts(x.c), Math.max(2, Math.floor(maxSigilWords(x.c))), false, 'No words known.')],
    build: (v) => { const w: string[] = v.words || []; if (w.length < 2) return 'Pick at least two words.'; return { text: w.map((y) => y.toUpperCase()).join(' ') }; } }),
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
  // Buttons only (Leon): whose, then which kind of advantage from a fixed list; the Narrator rules the flip itself.
  'class:trickster.rewrite#rewrite_story': (e, x) => ({ head: 'Rewrite', hint: e.text.replace(/\s*\((say|pick) who and what\)/, ''), fields: [npcF(x, 'Whose'), chipsF('what', 'What they rely on', REWRITE_OPTS)],
    build: (v, xx) => { const n = npcArgs(v, xx).npc, w = REWRITE_OPTS.find((o) => o.id === one(v, 'what')); if (!n || !w) return 'Pick whose and what they rely on.'; return { text: n + ': ' + w.label.toLowerCase(), npc: n }; } }),
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
  // Occult Library (Channeler rank II): the tone to learn, each with its rider; tones you know are greyed with their reason.
  'class:channeler.occult_library#occult_tone': (e, x) => { const kt: string[] = x.c?.soulKnown?.tones || [];
    return { head: 'Learn a tone', hint: e.text, fields: [chipsF('choice', 'The tone', (e.options || []).map((o) => ({ id: o.id, label: (TONE as any)[o.id]?.name || o.label, title: (TONE as any)[o.id]?.text || '', ...(kt.includes(o.id) ? { off: 'You know that tone.' } : {}) })), 1, false, 'You know every tone.')] }; },
};

// ---------- combat: what a fight action asks for beyond its grid target ----------
const unitF = (key: string, head: string, side: 'foe' | 'ally' | 'any', optional = false, multi = 1, repeat = false): Field => ({ key, kind: 'unit', head, side, optional, multi, repeat });
const tileF = (key: string, head: string, optional = false, multi = 1): Field => ({ key, kind: 'tile', head, optional, multi });
const optsOf = (ids: string[], label: (id: string) => string = human): Opt[] => ids.map((id) => ({ id, label: label(id) }));
const condOpts = (ids: string[]): Opt[] => [...new Set(ids)].map((id) => ({ id, label: condName(id).replace(/ \(.*\)$/, '') }));
/** The grenades and charges a unit carries (a thrown weapon's id is what the engine takes). */
const throwOpts = (u: any, only?: string[]): Opt[] => Object.entries(u?.throwables || {}).filter(([id, n]) => (n as number) > 0 && (WEAPON as any)[id] && (!only || only.includes(id)))
  .map(([id, n]) => ({ id, label: (WEAPON as any)[id].name + ((n as number) > 1 ? ' ×' + n : '') }));
/** The demolitionist's charges (engine perks/c.ts EXPLOSIVES). */
const EXPLOSIVES = ['satchel_charge', 'frag_grenade', 'incendiary_grenade'];
const SHOT_OPTS: Opt[] = [{ id: 'shot', label: 'Shot' }, { id: 'aimed', label: 'Aimed shot' }];
const all = (v: Values, k: string): string[] => (Array.isArray(v[k]) ? v[k] : v[k] ? [v[k]] : []);
const COMBAT: Record<string, Maker> = {
  // ---- which of your own debuffs ----
  'perk:shrug_it_off#shrug_it_off': (e, x) => ({ head: 'Shrug It Off', hint: e.text, fields: [chipsF('choice', 'Which Body debuff (none: the worst first)', condOpts(x.u ? debuffsOf(x.u, 'body') : []), 1, true, 'No Body debuff on you.')] }),
  'trait:daggerfall_veteran#shake_it_off': (e, x) => ({ head: 'Shake It Off', hint: e.text, fields: [chipsF('choice', 'Which Heart debuff (none: the first)', condOpts(x.u ? debuffsOf(x.u, 'heart') : []), 1, true, 'No Heart debuff on you.')] }),
  // ---- how you shoot ----
  'perk:jury_rig#one_more': (e, x) => ({ head: 'One more time', hint: e.text, fields: x.u && isMelee((WEAPON as any)[x.u.weapon]) ? [] : [chipsF('choice', 'Shot or aimed shot (none: a shot)', SHOT_OPTS, 1, true)] }),
  'perk:nothing_gets_past#hold_line': (e) => ({ head: 'Hold the line', hint: e.text, fields: [chipsF('choice', 'Shots or aimed shots (none: shots)', SHOT_OPTS, 1, true)] }),
  // ---- a second pick on the grid ----
  'perk:wall_run#wall_strike': (e) => ({ head: 'Wall Run strike', hint: 'Click the enemy, then the tile you strike from (it may be on the wall), then, if you like, where the run ends.',
    fields: [tileF('tile', 'The tile you strike from'), tileF('end', 'Where the run ends (optional)', true)],
    build: (v) => ({ tile: all(v, 'tile')[0], ...(all(v, 'end')[0] ? { choice: all(v, 'end')[0] } : {}) }) }),
  'trait:grenadiers_arm#hurl': (e) => ({ head: 'Throw them', hint: 'Click the ally or enemy next to you, then the tile where they land.', fields: [tileF('tile', 'Where they land')] }),
  'class:gunslinger.six_for_six#fan_fire': (e) => ({ head: 'Six for Six', hint: 'All six at the enemy you click; or split them: click an enemy for each shot (repeats allowed).', fields: [unitF('targetIds', 'Shot by shot (optional, up to 6)', 'foe', true, 6, true)] }),
  'trait:grenadiers_arm#hurl_object': (e) => ({ head: 'Throw an object', hint: 'Click the object next to you, then the tile where it lands.', fields: [tileF('land', 'Where it lands')], build: (v) => ({ choice: all(v, 'land')[0] }) }),
  'perk:twin_discipline#fused': (e) => ({ head: 'Fused Evoke', hint: e.text, fields: [tileF('aim', 'Aim (only if the pattern needs one)', true)], build: (v) => (all(v, 'aim')[0] ? { choice: all(v, 'aim')[0] } : {}) }),
  'class:blade_scribe.three_cut_script#three_cut_script': (e) => ({ head: 'Three-Cut Script', hint: 'Pick the three words in cut order and click the enemy next to you; with STEP among them, also click where the target lands.',
    fields: [chipsF('choice', 'Three words, in cut order', e.options || [], 3, false, 'No words known.'), tileF('tile', 'For STEP: where the target lands (optional)', true)] }),
  'class:mage.payload#payload': (e) => ({ head: 'Evoke with Payload', hint: e.text, fields: [tileF('aim', 'Aim (only if the pattern needs one)', true)], build: (v) => (all(v, 'aim')[0] ? { choice: all(v, 'aim')[0] } : {}) }),
  'trait:born_officer#command': (e) => ({ head: 'Command', hint: 'Click the ally, pick the order, then click where they move or whom they attack.',
    fields: [chipsF('choice', 'The order', [{ id: 'move', label: 'A free move' }, { id: 'attack', label: 'A free Shoot or Strike' }]), tileF('tile', 'For a move: the tile', true), unitF('foe', 'For an attack: the enemy', 'foe', true)],
    build: (v) => { const o = one(v, 'choice'); if (o === 'move') return all(v, 'tile')[0] ? { choice: 'move', tile: all(v, 'tile')[0] } : 'Click the tile they move to.';
      return all(v, 'foe')[0] ? { choice: 'attack', targetIds: [all(v, 'foe')[0]] } : 'Click the enemy they attack.'; } }),
  'perk:origami_hands#improvise': (e) => ({ head: 'Improvise', hint: 'One spare-parts charge.',
    fields: [chipsF('choice', 'What you make', [{ id: 'trap', label: 'A tripwire' }, { id: 'sling', label: 'A sling shot' }, { id: 'tool', label: 'A one-use tool' }]), tileF('tile', 'For a tripwire: a free tile next to you', true), unitF('targetId', 'For a sling shot: the enemy', 'foe', true), prose('For a tool: what it is (optional)', 'A grappling hook, a lockpick…', true)],
    build: (v) => { const o = one(v, 'choice');
      if (o === 'trap') return all(v, 'tile')[0] ? { choice: 'trap', tile: all(v, 'tile')[0] } : 'Click a free tile next to you.';
      if (o === 'sling') return all(v, 'targetId')[0] ? { choice: 'sling', targetId: all(v, 'targetId')[0] } : 'Click the enemy.';
      return { choice: 'tool', ...(txt(v) ? { text: txt(v) } : {}) }; } }),
  'class:heartbinder.through#begin_through': (e, x) => ({ head: 'Cast through a link', hint: 'Pick the design, click the tile you aim at; the first link casts unless you click another linked ally.',
    fields: [chipsF('choice', 'The design', ((x.u?.mg?.designs || x.c?.outbursts || []) as any[]).map((d) => ({ id: d.id, label: d.name })), 1, false, 'You have no designs.'), unitF('targetIds', 'Through whom (optional: your first link)', 'ally', true)] }),
  'class:grand_sigilist.enlarge#enlarge': (e) => ({ head: 'Enlarge (Grand form)', hint: e.text,
    fields: [chipsF('choice', 'The word', e.options || [], 1, false, 'No word known.'), tileF('walls', 'For STONE: where the walls rise (optional, up to 4)', true, 4)],
    build: (v) => ({ choice: one(v, 'choice'), ...(all(v, 'walls').length ? { text: all(v, 'walls').join(' ') } : {}) }) }),
  'class:rtc_contractor.supply_drop#take_from_crate': (e) => ({ head: 'Take from the crate', hint: 'Next to the crate.', fields: [chipsF('choice', 'A Supply or a magazine', e.options || []), unitF('targetId', 'Hand it to (optional: yourself)', 'ally', true)] }),
  // ---- what you plant, set or take over ----
  'perk:sleight_of_hand#plant': (e, x) => ({ head: 'Plant an item', hint: e.text, fields: [chipsF('choice', 'What you plant', [...throwOpts(x.u).map((o) => ({ ...o, label: 'Primed ' + o.label })), ...packItems(x.c)], 1, false, 'Nothing to plant: no grenade, nothing small in your pack.')] }),
  'trait:demolitionist#set_explosive': (e, x) => ({ head: 'Set explosive', hint: 'Click your tile or one next to you, then shape the blast.',
    fields: [chipsF('shape', 'The blast', optsOf(['circle', 'line', 'cone'])), chipsF('item', 'The charge (none: the first you carry)', throwOpts(x.u, EXPLOSIVES), 1, true, 'No explosive in your kit.'), chipsF('when', 'When it goes off', [{ id: 'now', label: 'Now' }, { id: 'remote', label: 'On my trigger' }])],
    build: (v) => ({ choice: [one(v, 'shape'), one(v, 'item'), one(v, 'when') === 'remote' ? 'remote' : ''].filter(Boolean).join(' ') }) }),
  'trait:slicer#backdoor': (e) => ({ head: 'Backdoor', hint: 'Click a door, terminal, camera, alarm or turret within 5 tiles.', fields: [chipsF('choice', 'For a door (none: open it if shut, shut it if open)', optsOf(['open', 'close', 'lock']), 1, true)] }),
  'perk:many_hands#hand_off': (e) => ({ head: 'Hand-Off', hint: e.text, fields: [chipsF('choice', 'How many AP', optsOf(['1', '2', '3'], (n) => n + ' AP'))] }),
  // ---- faith ----
  'trait:heretic#stolen_fire': (e, x) => ({ head: 'Stolen Fire', hint: e.text.replace(/\s*choice:.*$/, ''), fields: [chipsF('choice', 'A patron\'s Blessing', (PATRONS as any[]).flatMap((p) => (p.blessings || []).map((b: any) => ({ id: p.id + ':' + b.id, label: p.name + ' · ' + b.name, title: b.text || '' })))), unitF('targetId', 'Who it is for (optional)', 'any', true, 2), tileF('tile', 'Where (a Hymn aimed at a place; optional)', true)],
    // Rules 1.6: the stolen Hymn is prayed as a Hymn: a target, a second one (Switcheroo, Red Thread, Together), or a tile.
    build: (v) => { const ids = all(v, 'targetId'), t = all(v, 'tile')[0], ch = all(v, 'choice')[0];
      return ch ? { choice: ch, ...(ids[0] ? { targetId: ids[0] } : {}), ...(ids[1] ? { targetId2: ids[1] } : {}), ...(t ? { tile: t } : {}) } as any : 'Pick a patron\'s Blessing.'; } }),
  // ---- orders, pleas and words ----
  'perk:the_voice#the_voice': (e) => ({ head: 'The Voice', hint: e.text,
    fields: [chipsF('order', 'The order', [['halt', 'Halt'], ['hold', 'Hold fire'], ['drop', 'Drop it'], ['kneel', 'Kneel'], ['flee', 'Fall back'], ['other', 'Something else']].map(([id, label]) => ({ id, label }))), prose('Your words (optional; needed for “Something else”)', 'What you shout', true)],
    build: (v) => (one(v, 'order') === 'other' ? (txt(v) ? { text: txt(v) } : 'Write the order you give.') : { choice: one(v, 'order'), ...(txt(v) ? { text: txt(v) } : {}) }) }),
  'perk:lay_down_arms#lay_down_arms': (e) => ({ head: 'Lay Down Arms', hint: e.text, fields: [...(e.tier === 'II' ? [unitF('targetIds', 'Others who hear you (optional, up to 2 more)', 'foe', true, 2)] : []), prose('Your plea (optional)', 'What you say', true)] }),
  'perk:bone_talk#bone_talk': (e) => ({ head: 'Bone Talk', hint: e.text, fields: [prose('The physical detail', 'One specific detail')] }),
  'trait:trench_poet#verse': (e) => ({ head: 'Verse', hint: e.text, fields: [prose('Your metaphor', 'Answer in metaphor')] }),
  'perk:footnote#cite_fight': (e) => ({ head: 'Footnote', hint: e.text, fields: [prose('The fact you cite (optional)', 'A fact about it', true)] }),
  'perk:double_meaning#hint_fight': (e) => ({ head: 'Double Meaning', hint: e.text, fields: [prose('Your sentence (optional)', 'One sentence, two meanings', true)] }),
  'perk:old_tongue#speak_fight': (e) => ({ head: 'Speak the Old Tongue', hint: e.text, fields: [prose('What you say (optional)', 'In its own tongue', true)] }),
  'perk:fire_sermon#preach': (e) => ({ head: 'Preach', hint: e.text, fields: [prose('What you preach (optional)', 'Your sermon', true)] }),
  'trait:holo_drama_addict#drama': (e) => ({ head: 'Play it as a holo-drama', hint: e.text, fields: [prose('The scene (optional)', 'Cue the music…', true)] }),
  'perk:their_own_idea#suggest': (e) => ({ head: 'Their Own Idea', hint: 'Click the listener; hide the suggestion inside a sentence.', fields: [prose('The suggestion', 'Hidden inside a sentence')] }),
  'trait:occultist#weakness': (e) => ({ head: 'Look it up', hint: 'Click the creature on the grid, or name it.', oneOf: ['targetId', 'text'], fields: [unitF('targetId', 'The creature here', 'any', true), prose('Or name the creature', 'What it is', true)] }),
  'perk:lab_coat#neutralise_agent': (e) => ({ head: 'Neutralise agent', hint: e.text + ' Pick one, or none for the first identified here.', fields: [chipsF('choice', 'The agent', [...CHEM_OPTS, { id: 'toxic', label: 'Toxic hazard' }], 1, true)] }),
  // ---- Class Roster Revision 3 (engine classes/rev3.ts) ----
  // Command: the squadmate is the grid target (a click on their token); the walk's end is a second click (up to 2 tiles).
  'class:guardian.command#command': (e) => ({ head: 'Command', hint: 'Click the squadmate, then the tile they move to (up to 2 tiles, free).', fields: [tileF('tile', 'Where they move')] }),
  // Shove: the enemy is the grid target; push or knock down is a chip (the engine refuses a push into a wall: its reason shows on the chip).
  'class:fighter.shove#class_shove': (e) => ({ head: 'Shove', hint: 'Click the enemy next to you, then push it back or knock it down.',
    fields: [chipsF('choice', 'Push it back, or knock it down', [{ id: 'push', label: 'Push 1 tile', title: 'Straight away from you (a Body save holds it).' }, { id: 'prone', label: 'Knock Prone', title: 'Down on the floor (a Body save holds it).' }])] }),
  // Field Fix: the squadmate is the grid target; what to fix is a chip (none: the first that applies).
  'class:infiltrator.field_fix#field_fix': (e) => ({ head: 'Field Fix', hint: 'Click the squadmate next to you, then what to fix (none: the first that applies).',
    fields: [chipsF('choice', 'What to fix', FIX_OPTS, 1, true)] }),
};
/** Field Fix's three jobs (engine rev3.ts FIX). */
const FIX_OPTS: Opt[] = [{ id: 'clear_jam', label: 'Clear the jam', title: 'Their jammed weapon fires again (the Heat goes too).' },
  { id: 'restore_durability', label: 'Restore durability', title: 'Their weapon\'s durability back, as a Field Repair (no spare parts).' },
  { id: 'repair_machine', label: 'Repair the machine', title: 'A robot, drone or turret (a Factory Made squadmate too) repaired for 20.' }];

/** The key a picker is filed under: "itemKey#actionId", else the bare action id (shared ones like extra_mod). */
const keyOf = (e: Pick<PerkActionEntry, 'id' | 'actionId'>) => e.id + '#' + e.actionId;
/** Targets picked on the area map (a token, a tile, an object): no picker here. */
export const ON_MAP = ['unit', 'enemy', 'ally', 'tile', 'object'];

/** The picker for this action, or null when it is a plain button (or picked on the map). */
export function pickerFor(e: PerkActionEntry, x: PickCtx): Picker | null {
  if (x.how === 'combat') {
    // A fight: the grid gives the action's own target; the picker the rest. A picker with no field is a plain button.
    const cp = COMBAT[keyOf(e)]; if (cp) { const P = cp(e, x); return P.fields.length ? P : null; }
    if (e.options) { const multi = e.pickMulti || 1; return { head: e.pickLabel || e.label, hint: e.text, fields: [chipsF('choice', e.pickLabel || 'Pick', e.options, multi, false, 'Nothing to pick.')] }; }
    if (e.target === 'text') { const [head, holder] = PROSE[e.actionId] || ['What you say or do', 'Type it']; return { head: e.label, hint: e.text, fields: [prose(head, holder, /optional/.test(head))] }; }
    return null;
  }
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
    if ((f.kind === 'unit' || f.kind === 'tile') && !f.optional && !all(v, f.key).length) return 'Click ' + lower(f.head) + ' on the grid.';
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
    if (f.kind === 'unit' && all(v, f.key).length) { if (f.key === 'targetIds') out.targetIds = all(v, f.key); else out.targetId = all(v, f.key)[0]; }
    if (f.kind === 'tile' && all(v, f.key).length) { if (f.key === 'choice') out.choice = all(v, f.key)[0]; else out.tile = all(v, f.key)[0]; }
  }
  return out;
}
const lower = (s: string) => s.replace(/\s*\(optional\)/, '').replace(/^./, (y) => y.toLowerCase());

/** The chips a design slot offers, from the engine's data (the MAGIC tab workshop's rules, rules 1.5): schools, the
 * option, a second school on the same side with its own option, the tones you know (the first free at Lore Master 1, rules 1.8),
 * one shape (Bolt by default), the other modules (Size locked until a shape is on), up to the slots. */
export function designSlotView(c: any, d: DesignDraft, extra: number) {
  const known = c?.soulKnown || { schools: [], modules: [] }, slots = designSlots(c, extra), kTones: string[] = known.tones || [];
  const vis = c?.skills?.lore_master || 0, firstFree = vis >= 1 && !kTones.length, shape = d.modules.find(isShapeMod) || '';
  const mods = (known.modules as string[]).filter((m) => (MODULE as any)[m]);
  const opt = (school: string) => (((SCHOOL as any)[school]?.options || []) as string[]).map((o) => ({ id: optValue(o), label: OPT_LABEL[o] || o }));
  const full = d.modules.length >= slots;
  return {
    schools: (known.schools as string[]).filter((s) => (SCHOOL as any)[s]).map((s) => ({ id: s, label: (SCHOOL as any)[s].name, title: (SCHOOL as any)[s].text || '' })),
    schools2: twoSchools(c) && d.school ? (known.schools as string[]).filter((s) => (SCHOOL as any)[s] && sameSide(d, s)).map((s) => ({ id: s, label: (SCHOOL as any)[s].name })) : [],
    options: d.school ? opt(d.school) : [],
    options2: d.school2 ? opt(d.school2) : [],
    tones: [{ id: 'raw', label: 'Raw', title: (TONE as any).raw?.text || 'Soul damage, armour ignored, no rider.', can: true, free: false },
      ...(TONES as any[]).filter((t) => t.id !== 'raw').map((t) => { const k = kTones.includes(t.id), free = firstFree && !k; return { id: t.id, label: t.name + (free ? ' · free' : ''), title: (t.text || '') + (k || free ? '' : ' Not learned yet (a teacher or a plate).') + (free ? ' Your first tone is free at Lore Master 1.' : ''), can: k || free, free }; })],
    shapes: [{ id: '', label: 'Bolt', title: 'One target (the default; no module).', cost: 0, off: false },
      ...mods.filter(isShapeMod).map((m) => ({ id: m, label: (MODULE as any)[m].name, title: (MODULE as any)[m].text || '', cost: (MODULE as any)[m].cost || 0, off: shape !== m && !shape && full }))],
    modules: mods.filter((m) => !isShapeMod(m)).map((m) => { const on = d.modules.includes(m), noShape = m === 'size' && !shape && !on;
      return { id: m, label: (MODULE as any)[m].name, title: ((MODULE as any)[m].text || '') + (noShape ? ' Size needs a shape.' : ''), cost: (MODULE as any)[m].cost || 0, off: !on && (full || noShape) }; }),
    shape, slots,
  };
}
/** A draft after a pick in its slot (a school resets the option to the school's first, as the workshop does; a second
 * school takes its own first option; one shape at a time, Size only with one; a tone only once it can be used). */
export function pickInDraft(c: any, d: DesignDraft, what: 'school' | 'school2' | 'option' | 'option2' | 'tone' | 'shape' | 'module' | 'name', id: string, extra: number): DesignDraft {
  if (what === 'school') return tidy({ ...d, school: id, option: firstOpt(id), ...(d.school2 === id ? { school2: '', option2: '' } : {}) });
  if (what === 'school2') return d.school2 === id || !id ? { ...d, school2: '', option2: '' } : sameSide(d, id) ? { ...d, school2: id, option2: firstOpt(id) } : d;
  if (what === 'option') return { ...d, option: id };
  if (what === 'option2') return d.school2 ? { ...d, option2: id } : d;
  if (what === 'name') return { ...d, name: id.slice(0, 40) };
  const sv = designSlotView(c, d, extra);
  if (what === 'tone') { const t = sv.tones.find((x) => x.id === id); return t && t.can ? { ...d, tone: id } : d; }
  if (what === 'shape') {
    const rest = d.modules.filter((m) => !isShapeMod(m)); if (!id) return tidy({ ...d, modules: rest });
    const sh = sv.shapes.find((x) => x.id === id); if (!sh || sh.off) return d;
    return tidy({ ...d, modules: [...rest, id] });
  }
  if (isShapeMod(id)) return pickInDraft(c, d, 'shape', d.modules.includes(id) ? '' : id, extra);
  const on = d.modules.includes(id), m = sv.modules.find((x) => x.id === id);
  if (!on && (!m || m.off)) return d;
  return tidy({ ...d, modules: on ? d.modules.filter((x) => x !== id) : [...d.modules, id] });
}

/** A click on the combat grid for a picker's 'unit' or 'tile' field: the values with it added to the first field that
 *  takes it (a unit of the field's side; a tile), or null when no field wants it (the click aims the action instead). */
export function gridPick(P: Picker, V: Values, unit: { id: string; side: string } | null, tile: string): Values | null {
  for (const f of P.fields) {
    if (unit ? f.kind !== 'unit' : f.kind !== 'tile') continue;
    if (f.kind === 'unit' && unit && !(f.side === 'any' || (f.side === 'foe' ? unit.side !== 'pc' : unit.side === 'pc'))) continue;
    const id = unit ? unit.id : tile, now = all(V, f.key);
    if (now.includes(id) && !(f as any).repeat) return V;
    if (now.length >= ((f as any).multi || 1)) continue;
    return { ...V, [f.key]: [...now, id] };
  }
  return null;
}
