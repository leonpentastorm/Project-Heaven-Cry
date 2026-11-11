// @ts-nocheck (a tool run by hand: it reads the engine by name and writes a file)
// The perk and trait audit (Leon, Nov 2026: "rethink the whole perk card in combat… bunch of misdirection and most
// don't do shit or is bugged"). Every perk (each tier it has) and every trait is put through one standard fight, and
// what its card says is set against what the game did:
//   PERK_AUDIT_OUT=/path/perk-audit.md npx vitest run --root packages/engine test/perk-audit.test.ts
// Without the variable it only checks that the table builds. Nothing here changes the game: it reads the registry
// (handlerOf, actionDefs, toggles, hooks, ownerOf) and plays through the real reducer (apply: combat/perk,
// combat/attack, combat/move) with test/helpers/perkfight.ts.
//
// The standard fight: the holder at 3,6 on the open yard with the skills its item asks for, a soldier next to it
// (4,6), a squadmate on the other side (2,6), full AP, the holder's turn. An action refused there is tried once more
// in a "primed" fight (everyone hurt, a Body debuff on the holder and the squadmate, a magic class and a patron), so
// a perk that only needs something to work on isn't called broken.
import { describe, it, expect } from 'vitest';
import { writeFileSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import * as E from '../src';
import { fightWith, withGame } from './helpers/perkfight';

const A: any = E as any;
const PERKS: any[] = A.PERKS, TRAITS: any[] = A.TRAITS, SKILL: Record<string, any> = A.SKILL;
const PERK: Record<string, any> = Object.fromEntries(PERKS.map((p) => [p.id, p]));

// ---------------------------------------------------------------------------------------------- what the data says
const tiersOf = (p: any): string[] => (p.tiers ? Object.keys(p.tiers) : [p.tier === 'acquired' ? 'I' : p.tier]);
/** Skills (and the attributes over them) high enough to hold the item at this tier. */
function needs(p: any, tier: string, skills: Record<string, number> = {}, perks: Record<string, string> = {}) {
  const req = [...(p.requires || []), ...(p.tiers?.[tier]?.requires || [])];
  for (const r of req) {
    if (r.skill) skills[r.skill] = Math.max(skills[r.skill] || 0, r.min || 1);
    if (r.perk && PERK[r.perk]) { perks[r.perk] = PERK[r.perk].tier === 'acquired' ? 'I' : PERK[r.perk].tier; needs(PERK[r.perk], perks[r.perk], skills, perks); }
  }
  for (const s of p.skills || []) skills[s] = Math.max(skills[s] || 0, p.tier === 'mastered' ? 10 : p.tier === 'achieved' ? 5 : tier === 'II' ? 5 : 3);
  return { skills, perks };
}
function specFor(item: Item, tier: string, withItem: boolean, primed: boolean) {
  const { skills, perks } = item.kind === 'perk' ? needs(item.data, tier) : { skills: {}, perks: {} };
  const attrs: Record<string, number> = {};
  for (const [s, n] of Object.entries(skills)) { const at = SKILL[s]?.attribute; if (at) attrs[at] = Math.max(attrs[at] || 0, n); }
  const spec: any = { skills, attrs, perks: { ...perks }, traits: [] };
  if (withItem) { if (item.kind === 'perk') spec.perks[item.id] = tier; else spec.traits = [item.id]; }
  if (primed) {
    // a magic class for the skill's Core, so a Sigil or Soul perk has its tools
    const core = SKILL[Object.keys(skills)[0]]?.core || '';
    spec.classId = /mind/i.test(core) ? 'mage' : /soul/i.test(core) ? 'channeler' : 'fighter'; spec.level = 6;
  }
  return spec;
}

interface Item { kind: 'perk' | 'trait'; id: string; key: string; name: string; data: any }
const ITEMS: Item[] = [
  ...PERKS.map((p) => ({ kind: 'perk' as const, id: p.id, key: 'perk:' + p.id, name: p.name, data: p })),
  ...TRAITS.map((t) => ({ kind: 'trait' as const, id: t.id, key: 'trait:' + t.id, name: t.name, data: t })),
];

// ---------------------------------------------------------------------------------------------- rules written outside the registry
// Some items are wired straight into the core rules by id (has(u, 'many_hands') in tactics.ts) and register nothing, so
// the registry alone would call them empty. The engine's source is searched for each id in quotes, leaving out the
// line that registers it.
const SRC = fileURLToPath(new URL('../src', import.meta.url));
const walk = (d: string): string[] => readdirSync(d).flatMap((n) => { const f = join(d, n); return statSync(f).isDirectory() ? walk(f) : /\.ts$/.test(n) ? [f] : []; });
const SOURCES = walk(SRC).map((f) => ({ file: f.slice(SRC.length + 1), lines: readFileSync(f, 'utf8').split('\n') }));
function coreRefs(id: string): string[] {
  const q = new RegExp('[\'"`]' + id + '[\'"`]'), reg = new RegExp('\\bid: [\'"`]' + id + '[\'"`]'), out: string[] = [];
  for (const s of SOURCES) if (s.lines.some((l) => q.test(l) && !reg.test(l) && !/PERK_RENAMED|^\s*\/\//.test(l))) out.push(s.file);
  return out;
}
const TECHS: any[] = Object.values(A.TECHNIQUE || {});

// ---------------------------------------------------------------------------------------------- hooks, by where they fire
const STORY_HOOKS = new Set(['check_build', 'check_mod', 'check_post', 'check_result', 'passive', 'voice_cap', 'ask_limit', 'overreach_cost', 'echo_gain',
  'scene_change', 'session_start', 'rest', 'xp_grant', 'notice', 'stay_hidden', 'world_move_cost', 'karma_award', 'session_heal', 'story_blessing', 'npc_moved',
  'npc_sense', 'zone_enter', 'story_harm', 'stay_hidden_result', 'ruling_answered', 'world_round_start', 'story_cond_apply', 'gift', 'parley']);
const VIA: Record<string, string> = { 'combat/pump': 'Pump', 'combat/outburst': 'Begin', 'combat/release': 'Release', 'combat/attack': 'an attack', 'combat/move': 'a move', 'combat/evoke': 'Evoke',
  'combat/pray': 'a prayer', 'combat/perk': 'a perk action', 'check/roll': 'a skill check', 'story/speak': 'speaking in the story', 'combat/technique': 'a technique', 'combat/reload': 'a reload' };
const HOOK_WORDS: Record<string, string> = {
  combat_start: 'the fight starts', round_start: 'a round starts', turn_start_pre: 'your turn starts', turn_start: 'your turn starts', turn_end: 'a turn ends', move_cost: 'you move', move_step: 'you move',
  moved: 'someone moves', forced_move: 'someone is pushed', attack_preview: 'an attack is aimed', attack_target: 'an attack picks a target', attack_roll: 'an attack is rolled', damage_out: 'you deal damage',
  on_hit: 'an attack hits', on_miss: 'an attack misses', damage_in: 'damage is taken', on_damaged: 'someone is hurt', on_downed: 'someone goes down', on_kill: 'a kill', cond_apply: 'a condition is put on',
  cond_landed: 'a condition lands', cond_end: 'a condition ends', heal_given: 'healing', heal_in: 'healing', shield_grant: 'a shield is given', reaction_window: 'a reaction comes up', enemy_action_start: 'an enemy acts',
  sight_change: 'someone comes into view', sees: 'sight', object_destroyed: 'cover breaks', reload: 'a reload', jam_clear: 'a jam is cleared', swap: 'a weapon swap', stood_up: 'someone stands up',
  outburst_cost: 'an Outburst is priced', outburst_begin: 'an Outburst begins', outburst_release: 'an Outburst is released', outburst_after: 'an Outburst lands', outburst_plan: 'an Outburst is planned',
  outburst_hold: 'an Outburst is held', outburst_pump: 'a Pump', strain_change: 'Strain changes', strain: 'Strain is added', held_turn_start: 'a held Outburst swells', glyph_cost: 'a glyph is priced',
  evoke_cost: 'an Evoke is priced', evoked: 'a spell is Evoked', release_cost: 'a Release is priced', analyze: 'Analyze', action_cost: 'an action is priced', combat_end: 'the fight ends',
  death_save: 'a death save', injury: 'an injury', unit_built: 'you enter the fight (your numbers)', action_done: 'any action', stim_start: 'a stim', volley_end: 'a volley ends', weapon_actions: 'weapon actions are listed',
  path_opts: 'a path is planned', hide: 'hiding', spot: 'spotting', spotted: 'being spotted', on_surrender: 'a surrender', parley: 'a parley', throw: 'a throw', blessing_in: 'a blessing lands',
  trap_sprung: 'a trap goes off', blast_landed: 'a blast lands', glyphs_per_tile: 'glyphs are drawn', evoke_area: 'a spell is aimed', spell_mult: 'a spell is sized', glyph_drawn: 'a glyph is drawn',
  spell_fizzle: 'a spell fizzles', sigil_placed: 'a Sigil is placed', sigil_trap_sprung: 'a Sigil trap goes off', turret_shot: 'a turret fires', spell_shape: 'a spell is shaped', ground_cap: 'glyphs on the ground',
  check_build: 'a skill check', check_mod: 'a skill check', check_post: 'a skill check', check_result: 'a skill check', passive: 'a passive check', voice_cap: 'the inner voices', ask_limit: 'asking a skill',
  overreach_cost: 'an Overreach', echo_gain: 'Echo is gained', scene_change: 'a new scene', session_start: 'the session starts', rest: 'a rest', xp_grant: 'XP is given', notice: 'noticing things',
  stay_hidden: 'staying hidden', world_move_cost: 'walking the map', karma_award: 'Karma changes', action_refuse: 'an action is refused', evoke_reach: 'a spell is aimed', spell_roll: 'a spell is rolled',
  session_heal: 'healing between fights', story_blessing: 'a blessing in the story', ap_gift: 'AP is given', npc_moved: 'someone walks the map', npc_sense: 'someone senses you', zone_enter: 'entering a place',
  story_harm: 'harm in the story', stay_hidden_result: 'staying hidden', ruling_answered: 'the Narrator rules', braced: 'bracing', plate_spent: 'armour plates', round_ap: 'AP for the round',
  world_round_start: 'a round on the map', story_cond_apply: 'a condition in the story', gift: 'a gift', vent: 'venting Flux', ai_move_risk: 'an enemy plans its walk', cond_resisted: 'a condition is resisted',
  call: 'a Call', call_cost: 'a Call is priced', stat: 'your numbers', checkMod: 'your rolls',
};
const when = (hooks: string[]) => [...new Set(hooks.map((h) => HOOK_WORDS[h] || h.replace(/_/g, ' ')))];

// ---------------------------------------------------------------------------------------------- the registry's view
function registryOf(item: Item, tier: string) {
  const info = A.itemInfo(item.key, item.kind === 'perk' ? tier : undefined), hd = A.handlerOf(item.key);
  const defs: any[] = info ? A.actionDefs(info) : [];
  const lane = new Set((hd?.actions || []).map((d: any) => d.id));
  const owners: string[] = info ? info.effects.map((_: any, i: number) => A.ownerOf(info, i)) : [];
  const genericOps = info ? info.effects.filter((_: any, i: number) => owners[i] === 'generic').map((e: any) => e.op) : [];
  const hooks = [...Object.keys(hd?.on || {}), ...(hd?.stat ? ['stat'] : []), ...(hd?.checkMod ? ['checkMod'] : [])];
  // what a generic op listens to (its hooks, its stat and check answers)
  const genericHooks = [...new Set(genericOps.flatMap((op: string) => { const g = A.genericOf(op); return [...Object.keys(g?.on || {}), ...(g?.stat ? ['stat'] : []), ...(g?.checkMod ? ['checkMod'] : [])]; }))];
  return {
    info, handler: !!hd, noDefaultActions: !!hd?.noDefaultActions,
    actions: defs.map((d) => ({ id: d.id, label: d.label, scope: d.scope, target: d.target, per: d.uses?.per || 'at_will', n: d.uses?.n ?? 1, lane: lane.has(d.id), arm: !!d.arm })),
    toggles: (hd?.toggles || []).map((t: any) => ({ id: t.id, label: t.label, on: t.on })),
    hooks, genericOps, genericHooks, owners,
    gaps: owners.filter((o) => o === 'gap').length, narratorRun: owners.filter((o) => o === 'narrator').length,
    adjudication: item.data.adjudication || 'engine',
    refs: coreRefs(item.id), techs: TECHS.filter((t) => t.perk === item.id).map((t) => ({ id: t.id, name: t.name })),
  };
}

// ---------------------------------------------------------------------------------------------- the standard fight
const POS = { pc: '3,6', foe: '4,6', ally: '2,6' };
function fight(item: Item, tier: string, withItem = true, primed = false, second = false) {
  const f = fightWith([specFor(item, tier, withItem, primed), { name: 'Squadmate' }], [{ tier: 'soldier', name: 'Soldier' }, ...(second ? [{ tier: 'soldier', name: 'Far soldier', at: 'O6' }] : [])], { seed: 'AUDIT1' });
  const [pc, ally] = f.pcs, foe = f.foe;
  pc.pos = POS.pc; foe.pos = POS.foe; ally.pos = POS.ally;
  if (primed) {
    pc.hp = Math.ceil(pc.maxHp * 0.5); ally.hp = Math.ceil(ally.maxHp * 0.4); foe.hp = Math.ceil(foe.maxHp * 0.6);
    withGame(f.g, () => { for (const t of [pc, ally]) { try { A.applyCond(f.cb, { state: 5 }, foe, t, 'pinned', undefined, undefined, { skipSave: true }); } catch { /* the item may forbid it */ } } });
  }
  f.g.rng.state = 4242;
  f.turn(pc);
  return f;
}
const SKIP = new Set(['held', 'ps', 'uses', 'armed', 'fxSeen', 'id', 'name', 'short', 'img', 'charId', 'side', 'faith', 'condAt', 'hideEntry', 'npcId']);
/** A unit's numbers, flat: what a player could see change. */
function flat(u: any, skipAp = false) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(u || {})) {
    if (SKIP.has(k) || /^feel/.test(k) || (skipAp && (k === 'ap' || k === 'apTurnTotal'))) continue;
    if (v == null || v === false || v === 0 || v === '') continue;
    if (k === 'conds') { const on = Object.keys(v).filter((c) => v[c]); if (on.length) out.conditions = on.sort().join('+'); continue; }
    out[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
  }
  return out;
}
const CHAR_SKIP = new Set(['id', 'name', 'owner', 'perks', 'traits', 'skills', 'attrs', 'cores', 'portrait', 'identity', 'classId', 'level', 'advancedClass', 'uses']);
function flatChar(c: any) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(c || {})) { if (CHAR_SKIP.has(k) || v == null || v === false || v === 0 || v === '') continue; out[k] = typeof v === 'object' ? JSON.stringify(v) : String(v); }
  return out;
}
const FIELD: Record<string, string> = { hp: 'HP', maxHp: 'max HP', ap: 'AP', pos: 'position', def: 'Defence', armour: 'armour', attack: 'attack', movement: 'Movement', init: 'initiative', shield: 'a shield',
  ammo: 'ammo', prone: 'Prone', braced: 'Braced', hidden: 'Hidden', vision: 'Vision', mg: 'magic resources', overwatch: 'Overwatch', apNext: 'AP for next turn', bank: 'banked AP', dead: 'dead', downed: 'Downed',
  conditions: 'conditions', echo: 'Echo', state: 'its own counters', lastHitBy: '', damagedBy: '', reactedRound: 'the reaction', kills: 'kills', bleed: 'Bleed', injuries: 'injuries', weapon: 'weapon in hand',
  apDebt: 'AP debt', apGained: 'AP gained from perks', heat: 'Heat', mags: 'magazines', loose: 'loose rounds', dmgMult: 'damage multiplier', sv: 'saves', dbf: 'debuff strength', sk: 'skill modifiers',
  nearFoe0: '', pressedThis: '', tech: '', pressBy: '', pressure: 'Pressure', dur: 'weapon durability', injResist: 'injury resistance', songSk: 'song bonus', firstShotTurn: '', attackedTurn: '',
  chain: 'the technique chain', call: 'a Call on it', hitRound: '', hitWith: '', apTurnTotal: '', analyzedBy: 'Analyzed', weakPoint: 'a weak point marked', agility: '', strength: '', hand: '', sensory: '', proficiency: '', dexterity: '', athleticsPts: '',
  stunnedNext: 'Stunned next turn', dazedNext: 'Dazed next turn', condBy: '', condVia: '', condArg: '', condFresh: '', baseMove: '', baseVision: '', moved: '', shotsThisTurn: '', firstShotDone: '' };
const word = (k: string) => (k in FIELD ? FIELD[k] : k.replace(/([A-Z])/g, ' $1').toLowerCase());
function changes(a: Record<string, string>, b: Record<string, string>, numbers = true): string[] {
  const out: string[] = [];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (a[k] === b[k]) continue; const w = word(k); if (!w) continue;
    const num = (s: string) => s != null && /^-?[\d.]+$/.test(s);
    out.push(numbers && (num(a[k]) || a[k] == null) && (num(b[k]) || b[k] == null) ? w + ' ' + (a[k] ?? 0) + '→' + (b[k] ?? 0) : k === 'conditions' ? 'conditions ' + (a[k] || 'none') + '→' + (b[k] || 'none') : k === 'pos' ? 'position ' + a[k] + '→' + b[k] : w);
  }
  return out;
}
/** Everything a player could see, as one comparable picture (the acting unit's AP is read apart). */
function picture(f: any, actorId: string) {
  const cb = f.cb, g = f.g, units: Record<string, Record<string, string>> = {};
  for (const u of cb.units) units[u.name] = flat(u, u.id === actorId);
  const actor = cb.units.find((u: any) => u.id === actorId);
  const field: Record<string, string> = {};
  for (const [k, v] of Object.entries(cb)) { if (['units', 'log', 'notes', 'fx', 'fxSeq', 'acting', 'mods', 'order', 'turn', 'round', 'seen', 'mark', 'actN', 'lastSeen'].includes(k) || /Seq$|^fx|^sight/.test(k) || v == null) continue; const s = JSON.stringify(v); if (s !== '[]' && s !== '{}') field[k] = s; }
  return { units, field, ps: JSON.stringify(cb.units.map((u: any) => u.ps || {})), armed: JSON.stringify(actor?.armed || {}), char: flatChar(g.characters[actor?.charId]), log: cb.log.length, notes: (cb.notes || []).length,
    story: g.story.entries.length, rulings: (g.story.rulings || []).length, storyPs: JSON.stringify(g.story.ps || {}), ap: actor?.ap ?? 0 };
}
function diffPictures(a: any, b: any): string[] {
  const out: string[] = [];
  for (const n of new Set([...Object.keys(a.units), ...Object.keys(b.units)])) {
    if (!b.units[n]) { out.push(n + ': gone'); continue; } if (!a.units[n]) { out.push(n + ' appears'); continue; }
    const ch = changes(a.units[n], b.units[n]); if (ch.length) out.push(n + ': ' + ch.join(', '));
  }
  const fl = changes(a.field, b.field, false); if (fl.length) out.push('the field: ' + fl.join(', '));
  if (a.ps !== b.ps || a.storyPs !== b.storyPs) out.push('sets itself up for later (its own counter or flag)');
  if (a.armed !== b.armed) out.push('is readied (armed)');
  const ch = changes(a.char, b.char); if (ch.length) out.push('the character sheet: ' + ch.join(', '));
  return out;
}

// ---------------------------------------------------------------------------------------------- run one action
interface Run { outcome: 'ran' | 'refused' | 'threw' | 'hidden'; why?: string; args?: string; cardAp?: number; apBefore?: number; apAfter?: number; usesBefore?: string; usesAfter?: string; usesLabel?: string;
  changed?: string[]; arm?: boolean; log?: string[]; notes?: string[]; story?: number; rulings?: number; engineBadge?: boolean; cardText?: string }
function attempt(item: Item, tier: string, actionId: string, primed: boolean): Run {
  let f: any; try { f = fight(item, tier, true, primed); } catch (e: any) { return { outcome: 'threw', why: 'the fight could not be set up: ' + String(e?.message || e).slice(0, 160) }; }
  const pc = f.pc, foe = f.foe, ally = f.pcs[1];
  const listed = () => withGame(f.g, () => A.perkActionsFor({ u: f.pc, c: f.g.characters[f.pc.charId], cb: f.cb, g: f.g }, 'combat')).find((e: any) => e.id === item.key && e.actionId === actionId);
  let entry: any; try { entry = listed(); } catch (e: any) { return { outcome: 'threw', why: 'listing its button threw: ' + String(e?.message || e).slice(0, 160) }; }
  if (!entry) return { outcome: 'hidden', why: 'the button is not offered in this fight' };
  const choice = entry.options?.length ? entry.options.slice(0, entry.pickMulti || 1).map((o: any) => o.id).join(' ') : undefined;
  const base: any = { ...(choice ? { choice } : {}), ...(entry.target === 'text' ? { text: 'The audit tries this.' } : {}) };
  // What the player could click: the target the button asks for first, then every other pairing of a unit and a tile
  // (Command wants an ally and a tile; a Wall Run strike an enemy and a tile).
  const T = entry.target;
  const U: [string, any][] = [['', {}], ['on the soldier', { targetId: foe.id }], ['on the squadmate', { targetId: ally.id }], ['on yourself', { targetId: pc.id }],
    ...f.cb.units.filter((u: any) => ![pc.id, foe.id, ally.id].includes(u.id)).map((u: any) => ['on ' + u.name, { targetId: u.id }] as [string, any])]; // a drone, a beast
  const TI: [string, any][] = [['', {}], ['the empty tile next to you', { tile: '3,7' }], ['the soldier\'s tile', { tile: POS.foe }], ['an empty tile 3 away', { tile: '6,6' }]];
  const uFirst = T === 'ally' ? 2 : T === 'enemy' || T === 'unit' || T === 'object' ? 1 : T === 'self' ? 3 : 0, tFirst = T === 'tile' ? 2 : 0;
  const order = <X,>(list: X[], first: number) => [list[first], ...list.filter((_, i) => i !== first)];
  const tries: [string, any][] = [];
  for (const [tl, ta] of order(TI, tFirst)) for (const [ul, ua] of order(U, uFirst)) tries.push([[ul, tl && (ul ? 'and ' : 'on ') + tl].filter(Boolean).join(' '), { ...ua, ...ta }]);
  const r: Run = { outcome: 'refused', cardAp: entry.ap, apBefore: pc.ap, usesBefore: entry.uses.per === 'at_will' ? '' : String(entry.uses.left), usesLabel: entry.uses.label, engineBadge: entry.engine, cardText: entry.text };
  if (entry.why) r.why = entry.why; // greyed out before any click
  const before = picture(f, pc.id);
  let firstWhy = ''; const whys: string[] = [];
  // The client asks for a typed detail when a refusal says pick, choose, name, type or say (commands.ts wantsDetail):
  // the second pass does the same, with the first thing the refusal itself offers ("halt, hold fire…" → "halt").
  const pass = (detail: any, said: string): boolean => {
    for (const [label, args] of tries) {
      try {
        f.act({ type: 'combat/perk', unitId: pc.id, id: item.key, actionId, ...base, ...detail, ...args });
        r.outcome = 'ran'; r.args = [label, said].filter(Boolean).join(', '); delete r.why; return true;
      } catch (e: any) {
        const msg = String(e?.message || e);
        if (!(e instanceof A.RuleError)) { r.outcome = 'threw'; r.why = msg.slice(0, 200); r.args = label; return true; }
        firstWhy ||= msg; if (!whys.includes(msg)) whys.push(msg);
      }
    }
    return false;
  };
  if (!pass({}, '') && /\b(name|pick|choose|type|say|word)/i.test(firstWhy)) {
    const offered = (firstWhy.includes(':') ? firstWhy.split(':')[1] : /choose/i.test(firstWhy) ? firstWhy.replace(/^.*choose/i, '') : '').split(/,| or /).map((x) => x.replace(/^\s*(a|an|the)\s+/i, '').replace(/[.\s]+$/, '').trim()).filter((x) => x && x.split(' ').length <= 2);
    const first = firstWhy;
    for (const d of [...offered.slice(0, 2), 'The audit tries this.']) { firstWhy = ''; if (pass({ choice: d, text: d }, 'with "' + d + '" typed in')) break; }
    if (r.outcome === 'refused') firstWhy = firstWhy && firstWhy !== first ? firstWhy : first;
  }
  // of all the refusals, the telling one: not "pick something" when another try got further than that
  if (r.outcome === 'refused') firstWhy = whys.filter((w) => !/^(pick|choose|name|type|say)\b/i.test(w))[0] || firstWhy;
  if (r.outcome === 'threw') return r;
  r.arm = !!entry.arm;
  if (r.outcome !== 'ran') { r.why = firstWhy || r.why; return r; }
  const after = picture(f, pc.id);
  r.apAfter = after.ap; r.changed = diffPictures(before, after);
  r.log = f.cb.log.slice(before.log); r.notes = (f.cb.notes || []).slice(before.notes);
  r.story = after.story - before.story; r.rulings = after.rulings - before.rulings;
  const e2 = (() => { try { return listed(); } catch { return null; } })();
  r.usesAfter = entry.uses.per === 'at_will' ? '' : e2 ? String(e2.uses.left) : '?';
  return r;
}

/** A technique the perk puts on the Techniques pad, used on the soldier. */
function tryTechnique(item: Item, tier: string, tech: { id: string; name: string }): string {
  try {
    const f = fight(item, tier), ap = f.pc.ap, before = picture(f, f.pc.id);
    try { f.act({ type: 'combat/technique', unitId: f.pc.id, id: tech.id, targetId: f.foe.id }); }
    catch (e: any) { return (e instanceof A.RuleError ? 'refused: "' : 'CRASHED: "') + short(String(e?.message || e), 120) + '"'; }
    const after = picture(f, f.pc.id), ch = diffPictures(before, after), log = f.cb.log.slice(before.log);
    return 'ran on the soldier; AP ' + ap + '→' + after.ap + '; ' + (ch.length ? 'changed: ' + ch.join('; ') : 'no number changed') + (log.length ? '; log: "' + short(log[0], 140) + '"' : '');
  } catch (e: any) { return 'CRASHED: "' + short(String(e?.message || e), 120) + '"'; }
}

// ---------------------------------------------------------------------------------------------- passives: a short fight, against a plain character
const controlCache = new Map<string, any>();
/** The same few beats for a holder and for a plain character with the same skills; what differs is the item's doing. */
const BEATS = 'the fight starts, you are shot, you shoot back, you step one tile, a condition is put on you, the squadmate is dropped, you kill the soldier, your next turn starts';
function beats(item: Item, tier: string, withItem: boolean) {
  const f = fight(item, tier, withItem, false, true), out: any = { stages: {}, lines: [] as string[], notes: [] as string[] };
  const snap = (name: string) => { if (!f.g.combat) return; const p = picture(f, ''); out.stages[name] = { units: p.units, char: p.char }; out.lines = [...f.cb.log]; out.notes = [...(f.cb.notes || [])]; out.ps = Object.keys(f.pc.ps?.[item.key] || {}).length > 0; };
  const step = (name: string, seed: number, fn: () => void) => { if (!f.g.combat) return; f.g.rng.state = seed; try { fn(); } catch (e: any) { if (!(e instanceof A.RuleError)) out.error ||= name + ': ' + String(e?.message || e).slice(0, 140); } snap(name); };
  const inGame = (fn: () => void) => () => withGame(f.g, fn);
  snap('when the fight starts');
  step('when shot', 9001, inGame(() => { const foe = f.foe; foe.attack = 60; A.resolveAttack(f.cb, f.g.rng, foe, f.pc, 'shot', null, { noAp: true }); }));
  step('when shooting', 9002, () => f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: f.foe.id, mode: 'shot' }));
  step('when stepping a tile', 9003, () => f.act({ type: 'combat/move', unitId: f.pc.id, to: '3,7' }));
  step('when a condition is put on you', 9004, inGame(() => { A.applyCond(f.cb, f.g.rng, f.foe, f.pc, 'afraid'); }));
  step('when the squadmate is dropped', 9005, inGame(() => { const ally = f.pcs[1]; A.applyDamage(f.cb, ally, ally.hp + (ally.shield || 0) + 5, { by: f.foe, type: 'weapon', ranged: true }); }));
  step('on a kill', 9006, () => { f.foe.hp = 1; f.pc.attack = 60; f.pc.ap = Math.max(f.pc.ap, 4); f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: f.foe.id, mode: 'shot' }); });
  step('on the next turn', 9007, () => { f.turn(f.pcs[0]); });
  return out;
}
function passive(item: Item, tier: string) {
  const res: any = { named: [] as string[], differs: [] as string[], noted: false };
  let mine: any, plain: any;
  try { mine = beats(item, tier, true); } catch (e: any) { res.error = String(e?.message || e).slice(0, 160); return res; }
  const ck = JSON.stringify(specFor(item, tier, false, false));
  try { plain = controlCache.get(ck) || beats(item, tier, false); controlCache.set(ck, plain); } catch (e: any) { res.error = 'plain character: ' + String(e?.message || e).slice(0, 140); return res; }
  if (mine.error && mine.error !== plain.error) res.error = mine.error;
  const nm = item.name.toLowerCase();
  res.named = mine.lines.filter((l: string) => l.toLowerCase().includes(nm)).slice(0, 2);
  res.noted = mine.notes.some((l: string) => l.includes(item.key));
  res.keeps = mine.ps;
  const seen = new Set<string>(); let more = 0;
  for (const st of Object.keys(mine.stages)) {
    const a = plain.stages[st], b = mine.stages[st]; if (!a || !b) continue;
    const d: string[] = [];
    const say = (who: string, ch: string[]) => { const fresh = ch.filter((c) => !seen.has(who + c.replace(/ [\d.→-]+$/, ''))); for (const c of ch) seen.add(who + c.replace(/ [\d.→-]+$/, '')); if (fresh.length) d.push(who + ': ' + fresh.join(', ')); };
    for (const n of Object.keys(b.units)) { const who = n.startsWith('Tester') ? 'you' : n === 'Soldier' ? 'the soldier' : n === 'Far soldier' ? 'the far soldier' : n === 'Squadmate' ? 'the squadmate' : n; if (!a.units[n]) say(who, ['is on the field (the plain character has no such unit)']); else say(who, changes(a.units[n], b.units[n])); }
    say('your sheet', changes(a.char, b.char));
    if (d.length) { if (res.differs.length < 2) res.differs.push(st + ' (' + short(d.join('; '), 170) + ')'); else more++; } // a later beat is named only for what is new in it
  }
  if (more) res.differs.push('and at ' + more + ' later beat' + (more > 1 ? 's' : ''));
  return res;
}

// ---------------------------------------------------------------------------------------------- switches on an attack or a move
/** One switch, on and off, on the same dice: a shot at the soldier or a step to the next tile. */
function trySwitch(item: Item, tier: string, tg: { id: string; label: string; on: string[] }): { text: string; same?: boolean; crashed?: boolean } {
  const type = tg.on.includes('combat/attack') ? 'combat/attack' : tg.on.includes('combat/move') ? 'combat/move' : null;
  if (!type) return { text: 'not tried (it rides ' + [...new Set(tg.on.map((o) => VIA[o] || o))].join(' or ') + ', which the audit doesn\'t set up)' };
  const what = type === 'combat/attack' ? 'a shot that kills the soldier' : 'a step to the next tile (one round missing from the magazine, the weapon jammed)';
  const go = (on: boolean) => {
    const f = fight(item, tier, true, false, true); f.g.rng.state = 7007;
    if (type === 'combat/attack') { f.foe.hp = 1; f.pc.attack = 60; } else { f.pc.ammo = Math.max(0, (f.pc.ammo || 1) - 1); f.pc.jammed = true; }
    const e = withGame(f.g, () => A.togglesFor({ u: f.pc, c: f.g.characters[f.pc.charId], cb: f.cb, g: f.g }, type, type === 'combat/attack' ? { targetId: f.foe.id, target: f.foe, mode: 'shot' } : { to: '3,7' })).find((x: any) => x.itemKey === item.key && x.id.endsWith('#' + tg.id));
    const before = picture(f, ''), n = f.cb.log.length;
    const mods = on ? [item.key + '#' + tg.id] : ['!' + item.key + '#' + tg.id];
    let err = '';
    try { f.act(type === 'combat/attack' ? { type, unitId: f.pc.id, targetId: f.foe.id, mode: 'shot', mods } : { type, unitId: f.pc.id, to: '3,7', mods }); }
    catch (x: any) { if (!(x instanceof A.RuleError)) throw x; err = String(x?.message || x); }
    const after = f.g.combat ? picture(f, '') : before;
    return { e, err, log: f.g.combat ? f.cb.log.slice(n) : [], pic: JSON.stringify([after.units, after.ps, after.char]) };
  };
  try {
    const on = go(true), off = go(false);
    if (!on.e) return { text: 'the switch did not show on ' + what };
    if (on.err) return { text: 'switched on for ' + what + ': refused, "' + short(on.err, 110) + '"' + (on.e.why ? ' (greyed out: "' + short(on.e.why, 80) + '")' : '') };
    const same = on.pic === off.pic && on.log.join('|') === off.log.join('|');
    return { same: same && !on.e.why, text: 'switched on for ' + what + ': ' + (same ? 'the same result and the same log as with it off' : 'log "' + short(on.log.join(' '), 150) + '"; with it off "' + short(off.log.join(' '), 90) + '"') + (on.e.why ? ' (the switch was greyed out: "' + short(on.e.why, 80) + '")' : '') };
  } catch (e: any) { return { crashed: true, text: 'CRASHED: "' + short(String(e?.message || e), 130) + '"' }; }
}

// ---------------------------------------------------------------------------------------------- one item, start to end
type Shelf = 'USE NOW' | 'RIDES AN ACTION' | 'ALWAYS ON' | 'STORY ONLY' | 'NOTHING';
const short = (s: string, n = 110) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/[ ,;:]+\S*$/, '') + '…' : s; };
function cardOf(item: Item, tier: string): string {
  const p = item.data;
  if (item.kind === 'perk') return p.tiers?.[tier]?.text || p.text || '';
  return [...(p.upsides || []).map((s: string) => '+ ' + s), ...(p.downsides || []).map((s: string) => '− ' + s)].join(' ') || p.text || '';
}
/** Does the card's text give this refusal's reason? Rough: any telling word of the refusal is in the card. */
const STOP = new Set(['needs', 'need', 'your', 'you', 'the', 'with', 'that', 'this', 'pick', 'only', 'first', 'have', 'from', 'isn', 'can', 'cant', 'not', 'for', 'and', 'are', 'there', 'nothing', 'here', 'now', 'one', 'someone', 'into', 'must', 'who', 'what', 'has', 'its', 'yet', 'any', 'is', 'to', 'no', 'a', 'an', 'of', 'in', 'on', 'it', 'or', 'be', 'at', 'out']);
function cardStates(card: string, why: string): boolean {
  const c = card.toLowerCase(), words = why.toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
  return words.some((w) => c.includes(w.replace(/(ing|ed|s)$/, '')));
}
const apLine = (r: Run) => (r.cardAp === 0 ? 'free' : r.cardAp + ' AP');

function audit(item: Item) {
  const tiers = item.kind === 'perk' ? tiersOf(item.data) : ['trait'], top = tiers[tiers.length - 1];
  const reg: Record<string, any> = {}, runs: Record<string, Record<string, { plain: Run; primed?: Run }>> = {};
  for (const t of tiers) {
    reg[t] = registryOf(item, t); runs[t] = {};
    for (const a of reg[t].actions.filter((x: any) => x.scope.includes('combat'))) {
      const plain = attempt(item, t, a.id, false);
      runs[t][a.id] = { plain, ...(plain.outcome === 'refused' || plain.outcome === 'hidden' ? { primed: attempt(item, t, a.id, true) } : {}) };
    }
  }
  const R = reg[top], combatActs = R.actions.filter((x: any) => x.scope.includes('combat')), otherActs = R.actions.filter((x: any) => !x.scope.includes('combat'));
  const combatHooks = [...R.hooks, ...R.genericHooks].filter((h: string) => !STORY_HOOKS.has(h));
  const combatToggles = R.toggles.filter((t: any) => t.on.some((o: string) => o.startsWith('combat/')));
  const shelf: Shelf = combatActs.length ? 'USE NOW' : R.toggles.length && combatToggles.length ? 'RIDES AN ACTION'
    : combatHooks.length ? 'ALWAYS ON'
    : R.techs.length || R.refs.length ? 'ALWAYS ON'
    : R.toggles.length || otherActs.length || R.hooks.length || R.genericHooks.length || R.genericOps.length || R.narratorRun || R.adjudication === 'narrator' ? 'STORY ONLY' : 'NOTHING';
  const pas = passive(item, top);
  const techRuns = R.techs.map((t: any) => ({ ...t, result: tryTechnique(item, top, t) }));
  const switches = R.toggles.map((t: any) => ({ ...t, ...trySwitch(item, top, t) }));
  return { item, tiers, top, reg, runs, shelf, pas, R, techRuns, switches };
}

// ---------------------------------------------------------------------------------------------- findings and the report
interface Finding { rank: number; text: string }
const tierTag = (it: Item, t: string) => (it.kind === 'trait' ? '' : t === 'I' || t === 'II' ? ' (Tier ' + t + ')' : '');
function sameAcrossTiers(row: any, f: (t: string) => string | null): [string, string][] {
  // one finding per perk when every tier says the same; else one per tier
  const per = row.tiers.map((t: string) => [t, f(t)] as [string, string | null]).filter((x: any) => x[1]) as [string, string][];
  if (per.length > 1 && per.every((x) => x[1] === per[0][1]) && per.length === row.tiers.length) return [['', per[0][1]]];
  return per;
}
function findingsOf(row: any): Finding[] {
  const out: Finding[] = [], it: Item = row.item, kind = it.kind === 'trait' ? 'trait' : 'perk', R = row.R;
  const name = (t: string) => '**' + it.name + '**' + (t ? tierTag(it, t) : '');
  const each = (rank: number, f: (t: string) => string | null) => { for (const [t, text] of sameAcrossTiers(row, f)) out.push({ rank, text: name(t) + ' ' + text }); };
  const acts = (t: string) => Object.entries(row.runs[t] || {}) as [string, { plain: Run; primed?: Run }][];
  const defOf = (t: string, id: string) => row.reg[t].actions.find((x: any) => x.id === id);
  const label = (t: string, id: string) => { const a = defOf(t, id); return a && a.label !== it.name ? ' ("' + a.label + '")' : ''; };
  /** The run that went through (the plain fight's, else the primed one's), for each button of a tier. */
  const ran = (t: string, f: (id: string, x: Run, a: any) => string | null) => acts(t).map(([id, r]) => { const x = r.plain.outcome === 'ran' ? r.plain : r.primed?.outcome === 'ran' ? r.primed : null; return x ? f(id, x, defOf(t, id)) : null; }).filter(Boolean).join(' ') || null;
  const spent = (x: Run) => Math.round((x.apBefore! - x.apAfter!) * 10) / 10;
  const cost = (x: Run) => [spent(x) > 0 ? spent(x) + ' AP' : '', x.usesBefore !== x.usesAfter ? 'its use' : ''].filter(Boolean).join(' and ');
  const silent = (x: Run) => !x.changed!.length;
  const told = (x: Run) => !!(x.notes!.length || x.rulings || x.story);
  // 1. a button that crashes
  each(1, (t) => acts(t).filter(([, r]) => r.plain.outcome === 'threw' || r.primed?.outcome === 'threw').map(([id, r]) => { const x = r.plain.outcome === 'threw' ? r.plain : r.primed!; return 'crashes when its button' + label(t, id) + ' is pressed' + (x.args ? ' ' + x.args : '') + ': "' + short(x.why || '', 140) + '".'; }).join(' ') || null);
  if (row.pas?.error) out.push({ rank: 1, text: name('') + ' crashed the audit\'s short fight: "' + short(row.pas.error, 150) + '".' });
  // 2. a button that runs and shows nothing at all
  each(2, (t) => ran(t, (id, x) => (!silent(x) || x.log!.length || told(x) ? null : 'has a button' + label(t, id) + ' that runs and does nothing you can see: no line in the log, no number changed' + (cost(x) ? ', and it took ' + cost(x) : '') + '.')));
  // 3. a stand-in button: it spends, writes "X uses Y" and leaves the rest to the Narrator
  each(3, (t) => ran(t, (id, x, a) => (a.lane || !silent(x) || (!x.log!.length && !told(x)) ? null : 'has only the stand-in button' + label(t, id) + ': pressing it ' + (cost(x) ? 'takes ' + cost(x) + ', ' : '') + 'writes "' + short(x.log?.[0] || '', 90) + '" and changes nothing' + (told(x) ? '; the rest is left as a note for the Narrator' : '') + '. Nobody built the real action.')));
  // 4. nothing behind it
  if (row.shelf === 'NOTHING') out.push({ rank: 4, text: name('') + ' does nothing in the game: this ' + kind + ' has no button, rides no action and nothing in the rules looks for it. The Narrator is only told its text.' });
  else if (R.adjudication === 'engine' && !R.handler && !R.refs.length && !R.techs.length && (R.gaps || !R.genericOps.length)) out.push({ rank: 4, text: name('') + ' is marked as run by the game, but nobody wrote its rules into the game' + (R.genericOps.length ? ': the shared rules cover part of it, and ' + R.gaps + ' of its ' + R.owners.length + ' effects reach the Narrator only as text.' : ': all of it reaches the Narrator only as text.') });
  // 5. the AP on the button is not the AP it took (a readied action is paid when it goes off, so it is left out)
  each(5, (t) => ran(t, (id, x) => (x.arm || spent(x) === x.cardAp ? null : 'shows ' + apLine(x) + ' on its button' + label(t, id) + ' but ' + (spent(x) > 0 ? 'took ' + spent(x) + ' AP' : spent(x) < 0 ? 'left you ' + -spent(x) + ' AP richer' : 'took none') + ' (' + x.apBefore + ' AP before, ' + x.apAfter + ' after).')));
  // 6. a built button that only wrote a line
  each(6, (t) => ran(t, (id, x, a) => { if (!a.lane || !silent(x) || (!x.log!.length && !told(x))) return null;
    if (told(x) && R.adjudication !== 'engine') return null; // the Narrator's to rule, as its data says
    return 'runs' + label(t, id) + (x.args ? ' ' + x.args : '') + (cost(x) ? ', takes ' + cost(x) : '') + ' and changes no number, condition or position: it only wrote "' + short(x.log?.[0] || x.notes?.[0] || 'a story line', 110) + '"'
      + (told(x) ? ' and left the rest to the Narrator, though the perk is marked as run by the game.' : '. That line is all the player gets: fine if the line is the whole point (information), a gap if it was meant to set something up.'); }));
  for (const sw of row.switches || []) {
    if (sw.crashed) out.push({ rank: 1, text: name('') + ' crashes with its switch "' + sw.label + '" on: ' + sw.text.replace(/^CRASHED: /, '') + '.' });
    else if (sw.same) out.push({ rank: 6, text: name('') + ' has a switch ("' + sw.label + '") that changed nothing when it was turned on for ' + (sw.on.includes('combat/attack') ? 'a shot that kills the soldier' : 'a step with a round missing and the weapon jammed') + ': the same result and the same log as with it off.' });
  }
  // 7. refused in the plain fight and in the primed one, for a reason the card doesn't give
  each(7, (t) => acts(t).map(([id, r]) => { if (r.plain.outcome !== 'refused' || r.primed?.outcome === 'ran' || r.primed?.outcome === 'threw') return null;
    const why = r.primed?.outcome === 'refused' ? r.primed.why || '' : r.plain.why || ''; if (cardStates(cardOf(it, t) + ' ' + (r.plain.cardText || '') + ' ' + (defOf(t, id)?.label || ''), why)) return null;
    return 'could not be used' + label(t, id) + ' in the plain fight or the primed one: "' + short(why, 120) + '" Its card doesn\'t say that.'; }).filter(Boolean).join(' ') || null);
  return out;
}
/** Buttons that, in a fight, take their use and only leave the Narrator a note: one finding for the lot. */
function narratorButtons(rows: any[]): Finding[] {
  const names: string[] = [];
  for (const row of rows) for (const [id, r] of Object.entries(row.runs[row.top] || {}) as [string, { plain: Run; primed?: Run }][]) {
    const x = r.plain.outcome === 'ran' ? r.plain : r.primed?.outcome === 'ran' ? r.primed : null; if (!x || x.changed!.length || !(x.notes!.length || x.rulings || x.story)) continue;
    const a = row.reg[row.top].actions.find((y: any) => y.id === id);
    names.push('**' + row.item.name + '**' + (a.label !== row.item.name ? ' ("' + a.label + '")' : '') + (x.usesBefore !== x.usesAfter ? '' : ' (no use limit)'));
  }
  return names.length ? [{ rank: 3, text: 'These ' + names.length + ' buttons work in a fight, take their use and change nothing on the grid: they write one log line and leave a note for the Narrator, and in a fight the Narrator only reads its notes when the fight is over. To the player it looks like the button did nothing: ' + names.join(', ') + '. They belong on the STORY ONLY shelf during a fight, or need an answer the player can see.' }] : [];
}
/** Buttons that only show at their moment, and whose moment neither fight brought up: one finding for the lot. */
function hiddenButtons(rows: any[]): Finding[] {
  const names: string[] = [];
  for (const row of rows) { const rs = Object.values(row.runs[row.top] || {}) as { plain: Run; primed?: Run }[]; if (rs.length && rs.every((r) => r.plain.outcome === 'hidden' && r.primed?.outcome === 'hidden')) names.push(row.item.name); }
  return names.length ? [{ rank: 9, text: 'These ' + names.length + ' are on the USE NOW shelf, but their button only shows up at its moment (after a catch, with a drone out, with a glyph on the ground…) and neither fight brought that moment up, so the button itself was never pressed: ' + names.map((n) => '**' + n + '**').join(', ') + '. On the new card they read better as ALWAYS ON with a button that appears.' }] : [];
}

const usesWords: Record<string, string> = { at_will: 'any time', per_turn: 'once a turn', per_round: 'once a round', per_combat: 'once a fight', per_scene: 'once a scene', per_session: 'once a session', per_rest: 'once a rest', per_campaign: 'once a campaign', reaction: 'a reaction', out_of_combat: 'out of combat only' };
const scopeWords = (s: string[]) => s.map((x) => ({ combat: 'fight', world: 'map', story: 'story' } as any)[x] || x).join('/');
function happened(row: any, t: string): string {
  const R = row.reg[t], it: Item = row.item, bits: string[] = [];
  for (const a of R.actions) {
    const r = row.runs[t]?.[a.id];
    const head = (R.actions.length > 1 || a.label !== it.name ? '"' + a.label + '" ' : '') + '[' + scopeWords(a.scope) + ', ' + (usesWords[a.per] || a.per) + (a.lane ? '' : ', stand-in button') + ']';
    if (!r) { bits.push(head + ': not a fight action, not run.'); continue; }
    const say = (x: Run) => x.outcome === 'ran'
      ? (x.arm ? (/stands down/.test(x.log?.[0] || '') ? 'stood down (it was already readied when the fight began)' : 'readied') : 'ran') + (x.args ? ' ' + x.args : '') + '; card ' + apLine(x) + ', AP ' + x.apBefore + '→' + x.apAfter + (x.usesBefore !== '' ? ', uses left ' + x.usesBefore + '→' + x.usesAfter : '') + '; '
        + (x.changed!.length ? 'changed: ' + x.changed!.join('; ') : 'no number changed') + (x.log!.length ? '; log: "' + short(x.log![0], 140) + '"' : '; no log line') + (x.notes!.length || x.rulings ? '; a note went to the Narrator' : '')
      : x.outcome === 'refused' ? 'refused: "' + short(x.why || '', 120) + '"' : x.outcome === 'hidden' ? 'the button did not show' : 'CRASHED: "' + short(x.why || '', 140) + '"';
    bits.push(head + ': ' + say(r.plain) + (r.primed ? '. Primed fight: ' + say(r.primed) : '') + '.');
  }
  if (R.toggles.length) bits.push('Switch' + (R.toggles.length > 1 ? 'es' : '') + ': ' + R.toggles.map((x: any) => { const sw = t === row.top ? (row.switches || [])[R.toggles.indexOf(x)] : null; return '"' + x.label + '" on ' + [...new Set(x.on.map((o: string) => VIA[o] || o))].join(' or ') + (sw ? ', ' + sw.text : ''); }).join('; ') + '.');
  const hooks = when([...R.hooks, ...R.genericHooks]);
  if (hooks.length) bits.push('Listens when: ' + hooks.slice(0, 7).join(', ') + (hooks.length > 7 ? ' (+' + (hooks.length - 7) + ' more)' : '') + '.');
  if (t === row.top && row.pas) {
    const p = row.pas, seen: string[] = [];
    if (p.named.length) seen.push('named in the log: "' + short(p.named[0], 120) + '"');
    if (p.differs.length) seen.push('numbers differ from a plain character ' + p.differs.join('; '));
    if (p.keeps && !seen.length) seen.push('nothing on screen, but it is keeping a count of its own (it heard something)');
    if (p.noted) seen.push('the Narrator was sent a note about it');
    if (p.error) seen.push('CRASHED: "' + short(p.error, 120) + '"');
    if (seen.length) bits.push('In the audit\'s short fight: ' + seen.join('; ') + '.'); else if (row.shelf !== 'USE NOW') bits.push('Nothing showed in the audit\'s short fight.');
  }
  if (t === row.top) for (const x of row.techRuns || []) bits.push('Gives the technique "' + x.name + '" on the Techniques pad: ' + x.result + '.');
  if (R.refs.length) bits.push('Also written straight into the core rules (' + R.refs.length + ' file' + (R.refs.length > 1 ? 's' : '') + ').');
  if (!R.handler) bits.push(R.genericOps.length ? 'No rules of its own in the game; the shared rules run ' + R.genericOps.length + ' of its ' + R.owners.length + ' effects.' : 'No rules of its own in the game.');
  if (R.noDefaultActions) bits.push('Its stand-in button is switched off on purpose.');
  if (R.gaps) bits.push(R.gaps + ' effect' + (R.gaps > 1 ? 's' : '') + ' nobody runs (the Narrator gets the text).');
  if (R.narratorRun) bits.push(R.narratorRun + ' effect' + (R.narratorRun > 1 ? 's' : '') + ' left to the Narrator by design.');
  return bits.join(' ');
}
const cell = (s: string) => String(s).replace(/\|/g, '/').replace(/\n/g, ' ');
function report(rows: any[], findings: Finding[]): string {
  const count = (s: Shelf) => rows.filter((r) => r.shelf === s).length, perks = rows.filter((r) => r.item.kind === 'perk'), traits = rows.filter((r) => r.item.kind === 'trait');
  const SHELVES: Shelf[] = ['USE NOW', 'RIDES AN ACTION', 'ALWAYS ON', 'STORY ONLY', 'NOTHING'];
  const L: string[] = [];
  L.push('# Perk and trait audit', '');
  L.push('Every perk (' + perks.length + ') and every trait (' + traits.length + ') was put through one standard fight, and what its card says was set against what the game did. This file is written by a tool (`packages/engine/test/perk-audit.test.ts`), so it can be run again after any fix:', '');
  L.push('```', 'PERK_AUDIT_OUT=docs/design/handoffs/perk-audit.md npx vitest run --root packages/engine test/perk-audit.test.ts', '```', '');
  L.push('## Summary', '');
  L.push('| Shelf for the new card | Perks | Traits | Total | What it means |', '| --- | --- | --- | --- | --- |');
  const mean: Record<Shelf, string> = { 'USE NOW': 'It has a button in a fight.', 'RIDES AN ACTION': 'No button of its own: a switch on another action (an attack, a move, Pump…).', 'ALWAYS ON': 'No button, no switch: it works by itself when something happens in a fight.',
    'STORY ONLY': 'Nothing it does can matter in a fight: the Narrator runs it, or it only works on the map or in the story.', NOTHING: 'The game does nothing with it.' };
  for (const s of SHELVES) L.push('| ' + s + ' | ' + perks.filter((r) => r.shelf === s).length + ' | ' + traits.filter((r) => r.shelf === s).length + ' | ' + count(s) + ' | ' + mean[s] + ' |');
  const acts = rows.flatMap((r) => r.tiers.flatMap((t: string) => Object.values(r.runs[t] || {}))) as { plain: Run; primed?: Run }[];
  const n = (f: (x: { plain: Run; primed?: Run }) => boolean) => acts.filter(f).length;
  const done = (x: { plain: Run; primed?: Run }) => (x.plain.outcome === 'threw' || x.primed?.outcome === 'threw' ? 'threw' : x.plain.outcome === 'ran' ? 'ran' : x.primed?.outcome === 'ran' ? 'primed' : x.plain.outcome === 'hidden' && x.primed?.outcome !== 'refused' ? 'hidden' : 'refused');
  const standIns = rows.reduce((k, r) => k + r.R.actions.filter((a: any) => !a.lane).length, 0);
  const shown = rows.filter((r) => r.pas && (r.pas.named.length || r.pas.differs.length)).length;
  L.push('', '**' + findings.length + ' findings.** ' + acts.length + ' fight buttons were pressed (a perk with two tiers is pressed at each tier): ' + n((x) => done(x) === 'ran') + ' ran in the plain fight, '
    + n((x) => done(x) === 'primed') + ' ran only once the fight was primed, ' + n((x) => done(x) === 'refused') + ' were refused both times (most need something the yard doesn\'t have: a drone, a door, a bottle, an upper-realm being), '
    + n((x) => done(x) === 'hidden') + ' never showed their button, ' + n((x) => done(x) === 'threw') + ' crashed. ' + (standIns ? standIns + ' stand-in buttons are left.' : 'No stand-in buttons are left: every button in the game was built on purpose.')
    + ' In the short fight, ' + shown + ' of the ' + rows.length + ' were seen at work (named in the log, or a number moved against a plain character).', '');
  L.push('How to read it:', '', '- **The standard fight:** the holder with the skills the perk asks for, a soldier on the next tile, a squadmate on the other side, full AP, the holder\'s turn.',
    '- **The primed fight** is the second try for a button the plain fight refused: everyone is hurt, the holder and the squadmate are Pinned, and the holder has a class (a Mage for a Mind perk, a Channeler for a Soul perk, a Fighter for a Body perk).',
    '- **A stand-in button** is the one the game makes up when a perk\'s data says "this is an action" and nobody built that action: it takes the AP and the use, writes "X uses Y" and leaves the rest to the Narrator.',
    '- **For perks with no button** the audit played eight beats (' + BEATS + ') next to a plain character with the same skills and the same dice. "Nothing showed" means none of those beats named the perk in the log or moved a number; it does not mean the perk is broken. Many need a spell, a check, a scene or a certain enemy.',
    '- **"Its card doesn\'t say that"** is a rough word match between the refusal and the card, so read those entries as leads.',
    '- **What this cannot see:** the audit plays the rules, not the screen. "The card" here is what the rules hand the screen (the button\'s name, AP, uses and text). How the Perks tab draws it, and anything that only goes wrong in the browser, is not covered.', '');
  L.push('## Findings', '');
  if (!findings.length) L.push('None.');
  findings.forEach((f, i) => L.push(i + 1 + '. ' + f.text));
  L.push('', '## The full table', '', 'One row per perk and trait. A perk with two tiers has both in its row when they behave differently.', '');
  for (const s of SHELVES) {
    const list = rows.filter((r) => r.shelf === s); if (!list.length) continue;
    L.push('### ' + s + ' (' + list.length + ')', '', '| Name | Tier | Skill | Run by | What the card says | What happened |', '| --- | --- | --- | --- | --- | --- |');
    for (const r of list) {
      const it: Item = r.item, p = it.data;
      const tier = it.kind === 'trait' ? 'Trait' : p.tier === 'acquired' ? 'I / II' : p.tier[0].toUpperCase() + p.tier.slice(1);
      const skill = it.kind === 'trait' ? p.category || '' : (p.skills || []).map((x: string) => SKILL[x]?.name || x).join(' + ') || (p.requires || []).map((x: any) => PERK[x.perk]?.name).filter(Boolean).join(' + ');
      const per = r.tiers.map((t: string) => [t, short(cardOf(it, t), 150), happened(r, t)]);
      const same = per.length > 1 && per[0][2] === per[1][2];
      const card = per.length > 1 ? per.map((x: any) => '**' + x[0] + ':** ' + x[1]).join('<br>') : per[0][1];
      const what = per.length > 1 && !same ? per.map((x: any) => '**' + x[0] + ':** ' + x[2]).join('<br>') : per[per.length - 1][2];
      L.push('| ' + [it.name, tier, skill, ({ engine: 'the game', hybrid: 'game + Narrator', narrator: 'the Narrator' } as any)[r.R.adjudication] || r.R.adjudication, card, what].map(cell).join(' | ') + ' |');
    }
    L.push('');
  }
  return L.join('\n');
}

describe('Perk and trait audit', () => {
  it('puts every perk and trait through a standard fight and builds the table', () => {
    const rows = ITEMS.map(audit);
    const findings = [...rows.flatMap(findingsOf), ...narratorButtons(rows), ...hiddenButtons(rows)].sort((a, b) => a.rank - b.rank);
    const text = report(rows, findings);
    expect(rows.length).toBe(PERKS.length + TRAITS.length);
    expect(rows.every((r) => ['USE NOW', 'RIDES AN ACTION', 'ALWAYS ON', 'STORY ONLY', 'NOTHING'].includes(r.shelf))).toBe(true);
    expect(text).toContain('## The full table');
    if (process.env.PERK_AUDIT_OUT) writeFileSync(process.env.PERK_AUDIT_OUT, text + '\n');
  }, 60000);
});
