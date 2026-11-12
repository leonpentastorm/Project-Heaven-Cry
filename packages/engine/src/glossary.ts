// The Narrator's wiki (spec: The Narrator's wiki). Every rule-bearing thing in the data pack has an entry the AI
// Narrator can look up by key ("weapon:service_pistol", "condition:bleeding") when a moment needs it, instead of
// carrying all of it in every prompt. Entries describe what a thing is and does in words; the engine still owns
// every number in play, so entries carry only the few numbers that help the Narrator describe it.
import { SKILLS, TRAITS, PERKS, WEAPONS, CLASSES, ENEMIES, ITEM, SKILL, ATTR, SIGILS, SCHOOLS, MODULES, TONES, SOUL_RULES } from './data';
import { OBJECT_KINDS } from './objects';
import { RANK_ATTR, RANK_LEVEL } from './character';
import conditionsJ from '../../../data/conditions.json';
import patronsJ from '../../../data/patrons.json';
import classesJ from '../../../data/classes.json';
import sigilsJ from '../../../data/sigils.json';
import enemiesJ from '../../../data/enemies.json';
import lootJ from '../../../data/loot_tables.json';
import feelingsJ from '../../../data/feelings.json';
import techniquesJ from '../../../data/techniques.json';
import { verdictFor } from './effects/coverage';

export interface WikiEntry { key: string; name: string; text: string }
const str = (x: any) => (x == null ? '' : typeof x === 'string' ? x : JSON.stringify(x));
const line = (...parts: any[]) => parts.map(str).filter(Boolean).join(' ');

function build(): WikiEntry[] {
  const out: WikiEntry[] = [];
  const add = (key: string, name: string, text: string) => out.push({ key, name, text: text.trim() });
  // A skill says its slot in words (rules 1.13): alpha a way of fighting, beta a defence, gamma world play and speech,
  // which rolls 1 better on checks (its full points; an alpha or a beta adds its points − 1).
  for (const s of SKILLS as any[]) add('skill:' + s.id, s.name, line(s.name + ' (' + s.core + ', ' + (ATTR[s.attribute]?.name || s.attribute) + '; ' + SLOT_WORDS[s.slot as 'alpha' | 'beta' | 'gamma'] + ').', s.summary,
    s.per_point?.text ? 'A point gives: ' + s.per_point.text : '',
    s.voice ? 'Voice: ' + s.voice.persona + ' Wants: ' + s.voice.wants + ' Style: ' + s.voice.style : '',
    s.overreach ? 'Overreach at ' + s.overreach.from_points + '+: ' + (s.overreach.text || s.overreach.trigger || '') : ''));
  // Perks, traits and class moves say who runs them (effects/coverage.ts): the Narrator rules only what the engine doesn't.
  const who = (key: string, tier?: string) => '[' + verdictFor(key, tier).label + ']';
  for (const t of TRAITS as any[]) add('trait:' + t.id, t.name, line(t.name + '.', who('trait:' + t.id), t.text, t.narrator_hook ? 'Hooks: ' + t.narrator_hook : ''));
  for (const p of PERKS as any[]) if (p.tier !== 'ultimate') add('perk:' + p.id, p.name, line(p.name + ' (' + p.tier + (p.skills?.length ? ', ' + p.skills.map((x: string) => SKILL[x]?.name || x).join(' + ') : '') + ').', who('perk:' + p.id, p.tier === 'acquired' ? 'II' : p.tier), p.text, p.deed ? 'Deed: ' + p.deed : ''));
  for (const w of WEAPONS as any[]) add('weapon:' + w.id, w.name, line(w.name + ': a ' + (w.hands || '') + ' ' + w.category + (w.ammo ? ' firing ' + w.ammo : '') + ', used with ' + (SKILL[w.skill]?.name || w.skill) + '.',
    w.grants ? 'Grants ' + w.grants.name + ': ' + w.grants.text : '',
    w.phys ? 'Properties: ' + (w.phys.props.join(', ') || 'none') + '.' + (w.phys.teaches ? ' Lends the technique ' + (TQ.find((t: any) => t.id === w.phys.teaches)?.name || w.phys.teaches) + ' while held, and teaches it at drill mark I.' : '') : '', w.text, w.lore ? 'Lore: ' + w.lore : '', w.price_credits ? 'Price ' + w.price_credits + ' credits.' : ''));
  for (const [id, it] of Object.entries(ITEM) as [string, any][]) add('item:' + id, it.name, line(it.name + ' (' + (it.category || 'item') + (it.slot ? ', ' + it.slot.replace(/_/g, ' ') : '') + ').', it.text, it.price_credits ? 'Price ' + it.price_credits + ' credits.' : ''));
  for (const c of (conditionsJ as any).items) add('condition:' + c.id, c.name, line(c.name + ' (' + c.kind + ').', c.text));
  // Class Roster Revision 3: one base class per attribute; advanced classes are shelved (being rebuilt).
  for (const c of CLASSES as any[]) add('class:' + c.id, c.name, line(c.name + ' (' + c.core + ' class, ' + (ATTR[c.attribute]?.name || c.attribute) + ').', c.tagline, 'Skills: ' + (c.skills || []).map((x: string) => SKILL[x]?.name || x).join(', ') + '. Earned at level 3 by the highest attribute; rank II at ' + (ATTR[c.attribute]?.name || c.attribute) + ' ' + RANK_ATTR.II + ' and level ' + RANK_LEVEL.II + ', rank III at ' + RANK_ATTR.III + ' and level ' + RANK_LEVEL.III + '.'));
  for (const c of (classesJ as any).advanced || []) add('class:' + c.id, c.name, line(c.name + ' (advanced, shelved: advanced classes are being rebuilt; not learnable yet).', c.summary));
  // Class moves, by the key they run under ("class:<origin>.<moveId>": Bard's Triage is class:medic.triage), as characterBrief names them.
  const seen = new Set<string>();
  for (const c of CLASSES as any[]) for (const r of ['I', 'II', 'III']) for (const m of c.ranks?.[r]?.moves || []) { seen.add(m.key); add(m.key, m.name, line(m.name + ' (' + c.name + ' rank ' + r + ').', who(m.key), m.text)); }
  for (const c of (classesJ as any).advanced || []) for (const m of c.moves || []) if (!seen.has('class:' + c.id + '.' + m.id)) add('class:' + c.id + '.' + m.id, m.name, line(m.name + ' (' + c.name + ', advanced; shelved).', who('class:' + c.id + '.' + m.id), m.text));
  { // Patrons: likes and taboos are tag ids; Hymns tier I-III, a Miracle, the Open or Jealous rule.
    const tagName = (t: string) => ((patronsJ as any).tags || []).find((x: any) => x.id === t)?.name || t;
    for (const p of (patronsJ as any).items) add('patron:' + p.id, p.name, line(p.name + ' (' + p.domain + ').', 'Costume: ' + str(p.costume), 'Likes: ' + (p.likes || []).map(tagName).join(', ') + '. Taboos: ' + (p.taboos || []).map(tagName).join(', ') + '.', (p.rule === 'jealous' ? 'Jealous: no Hymns of other patrons.' : 'Open: Hymns of other patrons are kept, prayed by dice.'), 'Hymns: ' + (p.hymns || p.blessings || []).map((b: any) => b.name).join(', ') + (p.miracle ? '. Miracle (Faith 7 and Devotion ' + ((patronsJ as any).devotion?.gates?.miracle ?? 10) + '; Devotion −' + ((patronsJ as any).prayer?.miracle?.devotion_cost_levels ?? 5) + ' levels): ' + p.miracle.name + ', ' + String(p.miracle.text || '').replace(/\.$/, '') : '') + '.'));
  }
  for (const e of ENEMIES as any[]) add('enemy:' + e.id, e.name, e.name + ' tier enemy. The engine sets its numbers.');
  for (const k of OBJECT_KINDS as any[]) add('object:' + k.id, k.name, line(k.name + '.', k.text));
  // Magic (spec: Magic; Sigils rules 1.4, Soul rules 1.5): Sigil words by group, the grammar, Soul schools, modules, tones,
  // shapes and the heart cycle.
  const sg: any = (sigilsJ as any).grammar || {}, els: any = (sigilsJ as any).elements || {};
  for (const w of SIGILS as any[]) {
    const kind = w.group === 'subject' ? 'Subject, ' + String(w.class).replace('subject_', '') : String(w.group), el = w.element ? els[w.element] : null;
    add('sigil:' + w.id, w.word, line(w.word + ' (Sigil word, ' + kind + '; ' + w.charge + ' charge to draw' + (w.max_copies === 1 ? '; one copy a spell' : '') + ').', w.text,
      el ? 'Looks: ' + el.look + ' Sounds: ' + el.sound : '', w.grand ? 'Grand form: ' + w.grand : ''));
  }
  // The grammar in one entry (sigil:grammar), so the prompt carries one line of it.
  const groups = ['subject', 'reach', 'delivery', 'burst', 'filter'].map((gr) => gr[0].toUpperCase() + gr.slice(1) + ': ' + (SIGILS as any[]).filter((w) => w.group === gr).map((w) => w.word).join(', ')).join('. ');
  add('sigil:grammar', 'Sigil grammar', line('How Sigil words make a spell.', groups + '.',
    'A spell is 2 to 4 glyphs: one or more Subjects plus at least one other word; at most one Reach word (none = Touch, 1 tile deep); KIN once. Words may repeat (each repeated glyph x0.9 to damage, healing and shields).',
    [sg.line_mult?.text, sg.critical?.text, sg.elite_guard?.text].filter(Boolean).join(' '),
    'Drawing: one glyph on the caster\'s own tile; step and draw again to walk a Line, 2 to 4 tiles in a straight row (diagonals too). Glyphs fade after a few rounds.',
    'Evoking (1 AP): stand at an end or behind it to fire along the Line, beside it to fire across; the Line\'s length is the spell\'s width, the Reach its depth. A finished Line fires back the way the caster walked. Middle glyphs can\'t fire.',
    'Reach: SEEK a straight bolt (cover stops it), ARC a lob over everything, SENSE appears with no sight, RELAY casts from an ally. Delivery: STAY strikes, then leaves a field (full the first time, half after), WAIT a hidden trap, WATCH a turret, TWICE two missiles, PULL, CHAIN, LEECH. Burst: CONDENSE one target, SPREAD 5x5, PUSH a cone.',
    'A Stack (two glyphs on one tile, a perk\'s hook) fires all around its caster. Every save is in the log. Skill unlocks the engine runs: Overclock (one word past Max Sigil words, +2 charge), Twin Draw (two spells for the longer one\'s Glyph AP, once a fight), Paint the Field (a free SPREAD or PUSH on a spell with no Burst). The Evoker blade\'s Edge Word: after a hit, the next glyph that turn costs 0 AP.',
    'Spells hit friends too unless KIN is in them; a spell that finds nothing it may affect fizzles. Refused: ' + (sg.refused || []).map((r: any) => r.why).join(' ') ,
    'Starting magic: ' + (sg.starting?.words ?? 2) + ' words that make a spell, one of them a Reach word. Retired 1.2 words and shapes (RETURN, Rings, Stacks) are gone.'));
  // Enemy Sigil casters (enemies.json casters; items 469, 490, 491): what a fight's foe may name by `caster`.
  const casters = ((enemiesJ as any).casters || []) as any[];
  if (casters.length) add('enemy:casters', 'Enemy Sigil casters', line('Enemy Sigil casters: a foe of the same tier may name one by caster; it fights with an Evoker and these words.',
    casters.map((c) => c.name + ' (' + c.tier + '): ' + (c.sigils || []).map((w: string) => String(w).toUpperCase()).join(', ') + '.').join(' '),
    'COMMAND from an enemy fits its target: it walks a player out of its guards\' reach (up to 3 tiles, never into harm), halts one charging in, makes a shooter drop its weapon, else makes it kneel.'));
  // Enemy Soul casters (enemies.json soul_casters; rules 1.5, ai-soul.ts): also named by `caster`.
  const hearts = ((enemiesJ as any).soul_casters || []) as any[];
  if (hearts.length) add('enemy:soul_casters', 'Enemy Soul casters', line('Enemy Soul casters: a foe of the same tier may name one by caster; it fights with an Emanator and these ready designs, its heart glowing as it fills.',
    hearts.map((c) => c.name + ' (' + c.tier + '): ' + (c.designs || []).map((d: any) => d.name + ' (' + [d.tone && d.tone !== 'raw' ? d.tone : 'raw', d.school, ...(d.modules || [])].join(' ') + ')').join(', ') + '. ' + (c.text || '')).join(' ')));
  for (const s of SCHOOLS as any[]) add('school:' + s.id, s.name, line(s.name + ' (Soul school, ' + s.base_cost + ' MP base).', s.text));
  for (const m of MODULES as any[]) add('module:' + m.id, m.name, line(m.name + ' (Soul module, ' + m.family + ', ' + (m.cost >= 0 ? '+' : '−') + Math.abs(m.cost) + ' MP' + (m.gate ? '; learned at ' + (SKILL[m.gate.skill]?.name || m.gate.skill) + ' ' + m.gate.points : '') + (m.locked ? '; only with its advanced class, shelved: not learnable yet' : '') + ').', m.text));
  // Feelings (rules 1.8, Outburst 4.0): poured into a held Outburst with a Pump; the Narrator may grant one at a story moment
  // (magic[] feeling), and the engine unlocks the rest when their trigger happens.
  for (const f of (feelingsJ as any).items) add('feeling:' + f.id, f.name, line(f.name + ' (a feeling a Soul caster pours into an Outburst).', 'Felt first when: ' + f.trigger.text, 'Poured in: ' + f.pour.text, f.residue.kind !== 'none' ? 'Residue (' + f.residue.kind + '): ' + f.residue.text : ''));
  // Soul 1.5 (Outburst 2.0): the heart cycle in one entry (soul:heart), each tone (tone:<id>) and each shape (form:<id>).
  const sr: any = SOUL_RULES || {}, cyc = sr.cycle || {}, mult = (cyc.stage_mult || []).map((x: number, i: number) => i + ' ×' + x).join(', ');
  add('soul:heart', 'The heart (Outbursts)', line('How an Outburst is cast (Soul magic).',
    'Begin (' + (cyc.begin_ap ?? 2) + ' AP; Swift ' + (cyc.swift_begin_ap ?? 1) + '): open a ready design, pay its MP, +1 Strain; it is held at stage 0 and the heart glows where everyone can see it. Pump (' + (cyc.pump_ap ?? 1) + ' AP): +1 stage, up to ' + (cyc.max_stage ?? 4) + '. Release (' + (cyc.release_ap ?? 1) + ' AP): it fires at the stage reached (' + mult + '): a plain Pump adds little; a feeling poured into a Pump has its own step (each feeling goes into an Outburst once). Begin and Release at once is a snap cast; a full turn reaches stage 3, or stage 4 with the turn\'s free Pump.',
    'Held past the turn it swells: +1 stage free at the next turn start and +1 Strain (+2 in Flooded air). One Pump a turn can be free and never more (the first of a fight, or one each round from Empathy 3); from Empathy 7 a swell adds no Strain. While holding, the caster can move, shoot, Syphon, Steady or Feed (absorb a glyph on its tile: +1 stage), and watch with the heart (Heart Overwatch: the first enemy into reach draws the release, as a reaction). An elemental heart leaks onto adjacent enemies each turn (5 and the tone\'s stage-1 rider). Allies releasing after each other in a round resonate (+0.2 a stage multiplier each, at most +0.4).',
    'Strain: limit 3 + half Will Power. Each point over burns the caster for ' + (sr.strain?.burn_per_point ?? 8) + ' at the end of its turn (it Downs, never kills); ' + (sr.strain?.short_at_over ?? 3) + ' over is a Mana Short, no roll: Stunned, and a held Outburst goes off wild with its element\'s backlash on the caster. No vent: Strain falls 1 every turn start and by calming the heart: a still turn holding nothing, the first weapon attack of a turn, the first heal, stim, shield or cleanse on an ally, Let it go (free: drop the held one, Strain falls by its stage, at most what its swells cost) and Steady the heart (1 AP while holding: −1, and no swell next turn).',
    'Damage: ' + (sr.damage?.base ?? 20) + ' × the Soul multiplier × the stage × the shape (an enemy caster: ' + (sr.damage?.enemy_base ?? sr.damage?.base ?? 20) + '). A natural 20 on the roll is a critical: ×1.5, to ×2.0 at most. Raw Outbursts are Soul damage and ignore armour; a tone is Elemental (armour counts half) with a rider that grows with the stage. A Bolt and a Lance roll Will Power against Defense; a Wave, Burst and Aura hit everyone in the area (friendly fire, Buff only on allies). The Damage school strikes one of four ways (Strike, Finish, Brand, Drain). Control, Status and the Buff school\'s Inspired and Guarded read the stage (a harder save every 2 stages, longer from stage 3, a longer push from stage 2). A second school (Will Power 5, on the same side as the first, never the same school) rides at half strength where the first took effect. Describe the heart: violet heat, a heartbeat rising with every Pump, blooming into the tone\'s colour on release; a Short is the heartbeat stopping, then a crack. Never decide a number: the engine reports them. Tones: tone:<id>; shapes: form:<id>.'));
  for (const t of (TONES as any[])) add('tone:' + t.id, t.name, line(t.name + ' (Outburst tone' + (t.element ? ', the Sigil ' + t.element + ' element in the Soul style; +' + t.cost + ' MP' : '') + ').', t.text,
    Object.entries(t.stages || {}).map(([k, v]: [string, any]) => 'Stage ' + k + ': ' + v.text).join(' '), t.aura_look ? 'Held, it leaks as ' + t.aura_look + ' around the caster.' : ''));
  // Rules 1.9 drop tables (data/loot_tables.json, loot.ts): what the fallen leave, rolled by the engine (items 691-700).
  const lt: any = lootJ, nm = (id: string) => ITEM[id]?.name || (WEAPONS as any[]).find((w) => w.id === id)?.name || (id === 'personal' ? 'a personal effect' : id);
  add('loot:rules', 'Drop tables', line('What the fallen leave: the engine rolls it, seeded, once per death, into the pile on the tile where they died, and logs "X drops: …".',
    'Always: the weapon they used, worn (' + Math.round(lt.worn_durability.min * 100) + '-' + Math.round(lt.worn_durability.max * 100) + '% durability), with its loaded rounds, and up to ' + lt.spare_mags_max + ' spare magazines with their real rounds. Fists and beasts\' bites drop nothing.',
    'Rolled, by kind: people the person table, robots and drones machine, casters caster, beasts beast (empty); rolls by tier: ' + Object.entries(lt.rolls_by_tier).map(([k, v]) => k + ' ' + v).join(', ') + '. At most ' + Object.entries(lt.caps).map(([k, v]) => v + ' ' + k).join(', ') + ' rolled items a fight; a boss also always drops one notable thing.',
    'Surrendered and subdued foes, companions and illusions drop nothing. Change it per enemy or person with drops {table, items: at most ' + lt.inline_max + ' (item, qty or [min, max], chance, rarity, name, text)}; the most specific layer wins (yours, then the campaign\'s, then these).'));
  for (const t of lt.items as any[]) add('loot:' + t.id, t.name, line(t.name + ' (drop table).', t.text, t.entries.length ? 'Can drop: ' + t.entries.map((e: any) => nm(e.item) + (e.rarity ? ' (' + e.rarity + ')' : '')).join(', ') + '.' : 'Nothing by default.', t.none ? 'Often nothing.' : 'Always something.'));
  add('form:bolt', 'Bolt', line('Bolt (Outburst shape, the default): one target at the aim, 4 tiles (Far: 8) + the Soul range bonus, in sight; rolls Will Power against Defense; damage ×1.'));
  for (const m of (MODULES as any[]).filter((x) => x.form)) add('form:' + m.id, m.name, line(m.name + ' (Outburst shape; a module, +' + m.cost + ' MP).', m.text));
  // Physical 2.0 (rules 1.12): the two meters, the weapon properties and every technique. The engine runs all of them;
  // the entries are for telling what happened.
  const pr = TR.pressure, cap = (x: string) => x[0].toUpperCase() + x.slice(1);
  add('physical:momentum', 'Momentum', line('Momentum (melee): a meter on the fighter, 0 to ' + TR.momentum.max + ' (a Fighter: ' + TR.momentum.fighter_max + ').',
    'A fight starts with ' + (TR.momentum.start ?? 1) + '. Only a plain melee attack that hits gives 1. A Strike and an Opener spend 1 each (the first Opener of a fight is free); a Finisher needs 2 and spends all. Each tile walked (a walk, a Sprint, a Disengage) costs 1, and so does each hit taken, unless guarding (the Guard technique, a Parry that wins, Guard points). A Link\'s own move and a technique\'s own step cost none. It carries from turn to turn. A turn\'s melee techniques are a chain: an Opener first, Strikes and 1 AP Links in any order, a Finisher last. Answers are reactions.',
    'Describe a chain as one continuous exchange, not as separate swings. The engine tracks it.'));
  add('physical:pressure', 'Pressure', line('Pressure (ranged): a meter on the one being shot at, 0 to ' + pr.max + '. Pressed at ' + pr.pressed + ': worse aim with ranged weapons, and it can hold no shot. Suppressed at ' + pr.suppressed + ': an enemy loses 1 AP, and nobody Suppressed makes reactions that attack or move (protective ones still work). Broken at ' + pr.broken + ' (enemies only): it loses 2 AP and wants cover.',
    'Players stop at ' + pr.player_max + ', elites at ' + pr.elite_max + ', bosses at ' + pr.boss_max + '. It rises with the first ranged hit a shooter lands on a target each turn, with Press techniques, and when a comrade is shot down nearby; it falls each turn, faster behind cover unseen or when closing in, and with each melee hit landed. A Take needs a Pressed target and spends 2 of its Pressure.',
    'Tell it as fire keeping heads down, never as a number. The engine tracks it.'));
  for (const [id, text] of Object.entries(TR.props as Record<string, string>)) add('property:' + id, cap(id), line(cap(id) + ' (a weapon property).', text));
  for (const t of TQ) add('technique:' + t.id, t.name, line(t.name + ' (' + t.system + ' technique, ' + String(TR.group_names[t.group] || t.group).replace(/s$/, '').toLowerCase() + '; ' + (t.ap.base === 'reaction' ? 'a reaction' : t.ap.base === 'flat' ? t.ap.value + ' AP' : 'the weapon\'s attack AP' + (t.ap.add ? ' +' + t.ap.add : '')) + (t.rounds ? ', ' + t.rounds + (t.rounds === 1 ? ' round' : ' rounds') : '') + ').', '[engine]',
    t.trigger ? 'When ' + t.trigger + ':' : '', t.text, t.suppressed ? 'Against a Suppressed target: ' + t.suppressed : '',
    t.lines.length ? 'With the right weapon: ' + t.lines.map((l: any) => l.props.map(cap).join(l.match === 'all' ? ' and ' : ' or ') + ': ' + l.text).join(' ') : '', t.free ? 'Everyone knows it.' : ''));
  return out;
}
const TQ: any[] = (techniquesJ as any).items, TR: any = (techniquesJ as any).rules;
/** A skill's slot, as the wiki says it. */
const SLOT_WORDS = {
  alpha: 'an alpha skill: it opens a way of fighting',
  beta: 'a beta skill: a defence',
  gamma: 'a gamma skill: world play and speech; on a check it adds its full points, so it rolls 1 better than an alpha or a beta with the same points, and it is called first when talking to someone',
};
let cache: WikiEntry[] | null = null;
export const wikiEntries = () => (cache ||= build());
export function wikiLookup(key: string): WikiEntry | null {
  const k = key.trim().toLowerCase();
  return wikiEntries().find((e) => e.key === k) || wikiEntries().find((e) => e.key.split(':')[0] === k.split(':')[0] && e.name.toLowerCase() === k.split(':').slice(1).join(':').trim()) || null;
}
/** The wiki's index: the kinds and how to name an entry (the long id lists live in the entries, not the prompt). */
export function wikiKinds(): Record<string, string[]> {
  const kinds: Record<string, string[]> = {};
  for (const e of wikiEntries()) if (!(e.key.startsWith('class:') && e.key.includes('.')) && e.key !== 'sigil:grammar' && e.key !== 'soul:heart') (kinds[e.key.split(':')[0]] ||= []).push(e.key.split(':')[1]);
  return kinds;
}
