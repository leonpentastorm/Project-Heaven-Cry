// Generic handlers for core ops (plan 2.2, second pass). A generic handler claims an effect only when the effect's
// scope is one the engine can read on its own: no `when`, `duration`, `limit`, `uses` or other trigger, and either no
// `context` or a context from a closed vocabulary (a check tag the Narrator sets, a zone tag, "wearing:<item>", or a
// damage kind). Everything else is left to the item's lane handler, and until then goes to the Narrator with the
// item's text (never silently ignored; see coverage.ts).
//
// Inside an action (an active item's own effects), a few ops run generically when the action runs: cleanse, shield,
// heal, condition, knockback, Echo. See run()/runs().
import { SKILL, SKILLS } from '../data';
import type { Character } from '../character';
import type { Combat, Unit } from '../combat';
import type { Holder, ItemInfo } from './types';
import { registerGeneric, genericEffects, statQuery, charOfUnit } from './hooks';
import { applyCond, endCond, isCondition, condFamily } from '../magic';
import { moveBlockers, key, xy, dist } from '../combat';
import { grantShield, healUnit } from './damage';
import { gainEcho } from './echo';

// ---------- the scope vocabulary ----------
const GATES = ['when', 'duration', 'limit', 'uses', 'requires_state', 'per', 'trigger', 'count', 'area'];
/** Check and story tags the Narrator (or the zone) sets; a context in this list gates an effect on ctx.tags. */
export const TAG_VOCAB = new Set([
  'dialogue', 'crowd', 'official', 'merchant', 'military', 'underworld', 'vs_blocker', 'vs_same_kin', 'vs_other_race', 'non_human',
  'text', 'hearing', 'drama', 'unglamorous', 'running', 'climbing', 'alone_with_captive', 'vs_civilians_who_know', 'targets_mark',
  'for_bond', 'help_rival', 'case_related', 'chemical', 'flashback',
  'vs_blocker_or_interrupter', 'vs_same_race_and_homeworld', 'others_targeting_you', 'terrain:open', 'outside_city', 'in_city',
  'vs_military', 'humans_who_know_history', 'vs_underworld', 'vs_non_human', 'text_based', 'from_non_human', 'urban',
]);
/** Damage contexts the engine reads from the damage source. "a|b" means either. */
const DMG_WORDS = new Set(['melee', 'ranged', 'explosive', 'any', 'outburst', 'soul', 'sigil', 'elemental', 'lightning', 'emp', 'physical', 'true', 'weapon', 'fire']);
const isDmgCtx = (c: any) => typeof c === 'string' && c.split('|').every((w) => DMG_WORDS.has(w));
const targetOk = (e: any) => !e.target || e.target === 'self';
const isPlain = (e: any) => !!e && GATES.every((k) => e[k] == null) && targetOk(e) && e.context == null;
const isWear = (c: any) => typeof c === 'string' && /^(not_)?wearing:[a-z0-9_]+$/.test(c);
const isTagged = (e: any) => !!e && GATES.every((k) => e[k] == null) && targetOk(e) && (TAG_VOCAB.has(e.context) || isWear(e.context));
const plainOrTagged = (e: any) => isPlain(e) || isTagged(e);

/** Is the item worn or held (slot armour, the off hand, the main hand)? */
export function wearing(c: Character | null | undefined, item: string): boolean {
  if (!c) return false;
  return Object.values(c.worn || {}).includes(item) || c.offHand?.id === item || c.weapon === item;
}
/** Does an effect's context hold here? Tags come from the check (ctx.tags) and the zone; wearing from the character. */
export function contextHolds(e: any, h: Holder, ctx: any): boolean {
  const k = e?.context; if (k == null) return true;
  if (isWear(k)) { const [, not, item] = /^(not_)?wearing:(.+)$/.exec(k)!; return wearing(h.c, item) !== !!not; }
  const tags: string[] = (ctx && ctx.tags) || [];
  return tags.includes(k);
}
function dmgCtxHolds(k: any, src: any): boolean {
  if (k == null || k === 'any') return true;
  return String(k).split('|').some((w) => w === 'melee' ? !!src.melee : w === 'ranged' ? !!src.ranged : w === 'explosive' ? !!src.explosive : w === 'outburst' ? src.type === 'soul' : w === 'weapon' ? src.type === 'weapon' : w === 'physical' ? src.type === 'weapon' && src.dmgType !== 'elemental' : src.type === w || src.dmgType === w);
}

// ---------- stat ids the engine reads (data stat → the derived stat it adds to; see character.ts) ----------
const STAT_MAP: Record<string, string> = {
  hp: 'hp', hp_max: 'hp', move: 'move', defense: 'defense', dodge: 'defense', init: 'init', armor: 'armor', armour: 'armor',
  crit_damage: 'crit_damage', max_sigil_words: 'max_sigil_words', strain_limit: 'strain_limit', outburst_range: 'soul_range', soul_spell_range: 'soul_range',
  module_slots: 'module_slots', ready_designs: 'ready_designs', vision: 'vision', carry: 'carry', injury_resist: 'injury_resist', mp_max: 'mp_max',
  hp_per_level: 'hp_per_level', glyph_ap: 'glyph_ap', attack: 'attack', ap: 'ap',
};
const MULT_MAP: Record<string, string> = { hp_max: 'hp', hp: 'hp', move: 'move', carry: 'carry', mp_max: 'mp_max' };

registerGeneric({
  op: 'stat_mod',
  claim: (e) => plainOrTagged(e) && !!STAT_MAP[e.stat] && typeof e.value === 'number',
  stat: (h, e, stat, ctx) => (STAT_MAP[e.stat] === stat && stat !== 'ap' && contextHolds(e, h, ctx) ? e.value : 0),
  on: { turn_start_pre: (ctx, h, e) => { if (STAT_MAP[e.stat] === 'ap' && ctx.u === h.u && contextHolds(e, h, ctx)) (e.value >= 0 ? ctx.grants : ctx.penalties).push({ n: e.value, why: h.info.name }); } },
});
registerGeneric({
  op: 'stat_mult',
  claim: (e) => plainOrTagged(e) && !!MULT_MAP[e.stat] && typeof e.value === 'number',
  stat: (h, e, stat, ctx) => (MULT_MAP[e.stat] === stat && contextHolds(e, h, ctx) ? { mult: e.value } : 0),
});

// ---------- d20 modifiers (spec ruling, plan 6a-15: item skill mods reach every d20 that uses the skill: checks,
// passives, saves, attacks, initiative; never derived per-point stats) ----------
function skillHasTag(skill: string, tag: string): boolean {
  const s: any = SKILL[skill]; if (!s) return false;
  if (tag === 'any' || tag === 'all') return true;
  return s.slot === tag || (s.tags || []).includes(tag) || tag === 'core:' + s.core || tag === 'attr:' + s.attribute;
}
registerGeneric({ op: 'skill_mod', claim: (e) => plainOrTagged(e) && !!SKILL[e.skill] && typeof e.value === 'number' });
registerGeneric({ op: 'skill_mod_tag', claim: (e) => plainOrTagged(e) && typeof e.tag === 'string' && SKILLS.some((s) => skillHasTag(s.id, e.tag)) && typeof e.value === 'number' });
registerGeneric({
  op: 'roll_mod_all', claim: (e) => plainOrTagged(e) && typeof e.value === 'number',
  checkMod: (h, e, ck, ctx) => (contextHolds(e, h, ctx) ? [{ add: e.value, label: h.info.name }] : []),
});
/** Item modifiers to rolls with one skill (skill_mod, skill_mod_tag, and lane `stat('skill:<id>')` answers). */
export function skillRollMod(x: { c?: Character | null; u?: Unit | null }, skill: string, ctx: any = {}): { add: number; labels: { add: number; label: string }[] } {
  const labels: { add: number; label: string }[] = [];
  const h0: any = { c: x.c ?? charOfUnit(x.u), u: x.u };
  for (const { e, info } of genericEffects(x, 'skill_mod')) if (e.skill === skill && contextHolds(e, { ...h0, info } as Holder, ctx)) labels.push({ add: e.value, label: info.name });
  for (const { e, info } of genericEffects(x, 'skill_mod_tag')) if (skillHasTag(skill, e.tag) && contextHolds(e, { ...h0, info } as Holder, ctx)) labels.push({ add: e.value, label: info.name });
  const q = statQuery(x, 'skill:' + skill, ctx); if (q.add) labels.push({ add: q.add, label: 'perks' });
  return { add: labels.reduce((t, l) => t + l.add, 0), labels };
}
registerGeneric({ op: 'save_mod', claim: (e) => isPlain(e) && typeof e.value === 'number' && (['body', 'brain', 'heart', 'all', 'any'].includes(e.family) || e.save != null),
  stat: (h, e, stat) => (stat === 'save_' + e.family || (/^save_/.test(stat) && (e.family === 'all' || e.family === 'any')) ? e.value : 0) });
registerGeneric({ op: 'attack_mod', claim: (e) => isPlain(e) && typeof e.value === 'number', stat: (h, e, stat) => (stat === 'attack' ? e.value : 0) });

// ---------- immunity ----------
const IMM_WORDS = new Set(['shove', 'knockback', 'bleed', 'opportunity_attack', 'heart_debuff', 'brain_debuff', 'body_debuff']);
const immWords = (e: any): string[] => [...(e.conditions || []), ...(e.to ? [e.to] : [])].map(String);
const immKnown = (w: string) => /^condition:/.test(w) || /^family:(body|brain|heart)$/.test(w) || IMM_WORDS.has(w) || isCondition(w) || ['nausea', 'stunned', 'grappled', 'disarmed', 'taunted', 'commanded', 'marked', 'weakened', 'suppressed'].includes(w);
registerGeneric({
  op: 'immunity', claim: (e) => (e.target == null || e.target === 'self') && e.context == null && immWords(e).length > 0 && immWords(e).every(immKnown),
  on: { cond_apply: (ctx, h, e) => { if (ctx.t === h.u && immuneMatch(immWords(e), ctx.id, ctx.fam)) { ctx.cancel = true; ctx.why = h.info.name; } } },
});
function immuneMatch(words: string[], what: string, fam?: string): boolean {
  return words.some((w) => w === what || w === 'condition:' + what || (fam && !['guarded', 'inspired'].includes(what) && (w === 'family:' + fam || w === fam + '_debuff')));
}
/** Is this unit (or character) immune to a thing: a condition id (with its family), 'shove', 'knockback', 'bleed',
 * 'opportunity_attack'? Returns the item's name, or null. */
export function immune(x: { u?: Unit | null; c?: Character | null }, what: string, fam?: string): string | null {
  for (const { e, info } of genericEffects(x, 'immunity')) if (immuneMatch(immWords(e), what, fam ?? (isCondition(what) ? condFamily(what) : undefined))) return info.name;
  const q = statQuery(x, 'immune:' + what); return q.add ? 'perk' : null;
}

// ---------- damage ----------
registerGeneric({
  op: 'damage_mod', claim: (e) => GATES.every((k) => e[k] == null) && targetOk(e) && (e.context == null || isDmgCtx(e.context)) && (typeof e.value === 'number' || typeof e.value_pct === 'number'),
  on: { damage_out: (ctx, h, e) => { if (ctx.att !== h.u || !dmgCtxHolds(e.context, ctx.src || ctx)) return; if (typeof e.value_pct === 'number') ctx.mults.push({ v: 1 + e.value_pct / 100, label: h.info.name }); else ctx.add += e.value; } },
});
registerGeneric({
  op: 'damage_mult', claim: (e) => GATES.every((k) => e[k] == null) && targetOk(e) && (e.context == null || isDmgCtx(e.context)) && typeof e.value === 'number',
  on: { damage_out: (ctx, h, e) => { if (ctx.att === h.u && dmgCtxHolds(e.context, ctx.src || ctx)) ctx.mults.push({ v: e.value, label: h.info.name }); } },
});
registerGeneric({
  op: 'damage_taken_mod', claim: (e) => GATES.every((k) => e[k] == null) && targetOk(e) && (e.context == null || isDmgCtx(e.context)) && typeof e.value_pct === 'number',
  on: { damage_in: (ctx, h, e) => { if (ctx.phase === 'reduce' && ctx.t === h.u && dmgCtxHolds(e.context, ctx.src)) ctx.dmg = ctx.dmg * (1 + e.value_pct / 100); } },
});
registerGeneric({
  op: 'damage_reduction', claim: (e) => GATES.every((k) => e[k] == null) && targetOk(e) && e.context == null && typeof e.value === 'number' && (e.type == null || e.type === 'all' || e.type === 'flat' || isDmgCtx(e.type)),
  on: { damage_in: (ctx, h, e) => { if (ctx.phase !== 'reduce' || ctx.t !== h.u) return; if (e.type === 'flat') ctx.dmg -= e.value; else if (e.type == null || e.type === 'all' || dmgCtxHolds(e.type, ctx.src)) ctx.dmg = ctx.dmg * (1 - Math.min(1, e.value)); } },
});
registerGeneric({
  op: 'heal_received_mult', claim: (e) => GATES.every((k) => e[k] == null) && targetOk(e) && (e.context == null || e.context === 'any') && typeof e.value === 'number',
  on: { heal_in: (ctx, h, e) => { if (ctx.t === h.u) ctx.n = ctx.n * e.value; } },
});

// ---------- AP costs and forbidden actions ----------
/** Action ids whose AP the engine asks actionAp() for (see combat.ts). */
export const COST_SITES = new Set(['field_repair', 'sprint', 'clear_jam', 'disengage', 'heal', 'stim', 'stabilise', 'analyze', 'reload', 'throw', 'set_explosive', 'move', 'load', 'brace', 'overwatch', 'shove', 'swap']);
registerGeneric({ op: 'action_cost', claim: (e) => isPlain(e) && COST_SITES.has(e.action) && (typeof e.value === 'number' || typeof e.set === 'number') });
/** The AP an action costs this unit: the base, then items' set (lowest wins) and value changes, never below 0
 * (lanes give their own floors, e.g. Field Medic's 1). Labels say why. */
export function actionAp(x: { u?: Unit | null; c?: Character | null }, action: string, base: number): { ap: number; labels: string[] } {
  let ap = base, set: number | null = null; const labels: string[] = [];
  for (const { e, info } of genericEffects(x, 'action_cost')) {
    if (e.action !== action && !(action === 'stim' && e.action === 'heal') && !(action === 'stabilise' && e.action === 'heal')) continue;
    if (typeof e.set === 'number') { set = set == null ? e.set : Math.min(set, e.set); labels.push(info.name + ' (' + e.set + ' AP)'); }
    else { ap += e.value; labels.push(info.name + ' (' + (e.value > 0 ? '+' : '') + e.value + ')'); }
  }
  const q = statQuery(x, 'ap_cost:' + action, { base }); ap += q.add; if (q.add) labels.push('perks');
  return { ap: Math.max(0, set != null ? Math.min(set, ap) : ap), labels };
}
const FORBID_SITES = new Set(['disengage', 'sprint', 'reload', 'stim', 'analyze']);
registerGeneric({ op: 'forbid', claim: (e) => e.context == null && FORBID_SITES.has(e.action) });
/** Does an item forbid this action? Returns the item's name, or null. */
export function forbids(x: { u?: Unit | null; c?: Character | null }, action: string): string | null {
  for (const { e, info } of genericEffects(x, 'forbid')) if (e.action === action) return info.name;
  return null;
}

// ---------- XP, magic words ----------
const xpSource = (s: string) => (s === 'conversation' ? 'dialogue' : s);
registerGeneric({ op: 'xp_mod', claim: (e) => e.when == null && e.mutual == null && typeof e.value_pct === 'number' && (e.source == null || /^[a-z_]+$/.test(e.source)) && e.source !== 'all_except_essence' });
/** XP after items (born_performer…): the amount for this source. */
export function xpAfter(c: Character, source: string, amount: number): { amount: number; labels: string[] } {
  let a = amount; const labels: string[] = [];
  for (const { e, info } of genericEffects({ c }, 'xp_mod')) if (!e.source || xpSource(e.source) === xpSource(source)) { a = a * (1 + e.value_pct / 100); labels.push(info.name + ' ' + (e.value_pct > 0 ? '+' : '') + e.value_pct + '%'); }
  return { amount: Math.max(0, Math.round(a)), labels };
}
registerGeneric({ op: 'unlock_word', claim: (e) => typeof e.word === 'string' && isPlain({ ...e, standalone: undefined }) });
registerGeneric({ op: 'word_cost', claim: (e) => isPlain(e) && Array.isArray(e.words) && typeof e.value === 'number' });
/** Sigil words an item teaches (known on top of the words learned), and changes to a word's charge. */
export function itemWords(c: Character): string[] { return [...new Set(genericEffects({ c }, 'unlock_word').map(({ e }) => e.word))]; }
export function wordCostMods(c: Character): Record<string, number> {
  const out: Record<string, number> = {};
  for (const { e } of genericEffects({ c }, 'word_cost')) for (const w of e.words) out[w] = (out[w] || 0) + e.value;
  return out;
}

// ---------- ops that run inside an action ----------
const ACT_GATES = ['when', 'duration', 'limit', 'requires_state', 'per', 'trigger', 'area', 'context'];
const actPlain = (e: any) => ACT_GATES.every((k) => e[k] == null);
function targetUnit(h: Holder, e: any, args: any): Unit | null {
  const cb = h.cb; if (!cb) return null;
  if (!e.target || e.target === 'self') return h.u || null;
  return cb.units.find((x) => x.id === args.targetId) || null;
}
const T_OK = (e: any) => !e.target || ['self', 'target', 'ally', 'enemy', 'one_enemy', 'one_ally'].includes(e.target);
registerGeneric({
  op: 'cleanse', claim: () => false, runs: (e) => actPlain(e) && T_OK(e),
  run: (h, e, args) => {
    const t = targetUnit(h, e, args); if (!t || !t.conds) return null;
    const ids = Object.keys(t.conds).filter((id) => (e.condition ? id === e.condition : e.family ? condFamily(id) === e.family && !['guarded', 'inspired'].includes(id) : true));
    const gone = ids.slice(0, e.count || 1); for (const id of gone) endCond(t, id);
    return gone.length ? ' · ' + t.name + ' shakes off ' + gone.join(', ') : ' · nothing to shake off';
  },
});
registerGeneric({
  op: 'shield', claim: () => false, runs: (e) => actPlain(e) && T_OK(e) && typeof e.value === 'number',
  run: (h, e, args) => { const t = targetUnit(h, e, args); if (!t) return null; const n = e.basis === 'hp_max' || (e.value > 0 && e.value < 1) ? e.value * t.maxHp : e.value; const v = grantShield(h.cb || null, t, n, h.u || null); return ' · ' + t.name + ' gains a ' + v + ' shield'; },
});
registerGeneric({
  op: 'heal', claim: () => false, runs: (e) => actPlain(e) && T_OK(e) && typeof e.value === 'number',
  run: (h, e, args) => { const t = targetUnit(h, e, args); if (!t) return null; const n = e.value > 0 && e.value < 1 ? e.value * t.maxHp : e.value * (e.scale === 'healing_given' && h.c ? 1 : 1); const r = healUnit(h.cb || null, t, n, h.u || null, 'perk'); return ' · ' + t.name + (r.revived ? ' is back up at ' + t.hp + ' HP' : ' heals ' + r.restored); },
});
registerGeneric({
  op: 'condition', claim: () => false, runs: (e) => actPlain(e) && T_OK(e) && isCondition(e.condition || e.id) && !e.choose,
  run: (h, e, args, rng) => { const t = targetUnit(h, e, args); if (!t || !h.cb) return null; return applyCond(h.cb, rng, h.u || null, t, e.condition || e.id, typeof e.rounds === 'number' ? e.rounds : undefined) || null; },
});
registerGeneric({
  op: 'knockback', claim: () => false, runs: (e) => actPlain(e) && T_OK(e),
  run: (h, e, args) => { const t = targetUnit(h, e, args); if (!t || !h.cb || !h.u) return null; return pushAway(h.cb, h.u, t, typeof e.tiles === 'number' ? e.tiles : 1); },
});
registerGeneric({
  op: 'resource', claim: () => false, runs: (e) => actPlain(e) && e.resource === 'echo' && typeof e.value === 'number',
  run: (h, e) => { if (!h.c) return null; const n = gainEcho(h.c, e.value, h.info.name); return ' · ' + h.c.name + ' ' + (n >= 0 ? '+' : '') + n + ' Echo'; },
});
/** Push a unit straight away from another, tile by tile, until blocked (knockback). Respects immunity. */
export function pushAway(cb: Combat, from: Unit, t: Unit, tiles: number): string {
  if (immune({ u: t }, 'knockback')) return ' · ' + t.name + ' holds its ground';
  const [ax, ay] = xy(from.pos); let moved = 0;
  for (let i = 0; i < tiles; i++) {
    const [tx, ty] = xy(t.pos), to = key(tx + Math.sign(tx - ax), ty + Math.sign(ty - ay)), [nx, ny] = xy(to);
    if (nx < 0 || ny < 0 || nx >= cb.map.w || ny >= cb.map.h || moveBlockers(cb).has(to) || cb.units.some((v) => !v.dead && v.pos === to)) break;
    t.pos = to; moved++;
  }
  void dist;
  return moved ? ' · ' + t.name + ' is knocked back ' + moved + (moved === 1 ? ' tile' : ' tiles') : '';
}
export type { ItemInfo };
