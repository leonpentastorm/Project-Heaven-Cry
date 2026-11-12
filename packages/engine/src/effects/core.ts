// Generic handlers for core ops (plan 2.2, second pass). A generic handler claims an effect only when the effect's
// scope is one the engine can read on its own: no `when`, `duration`, `limit`, `uses` or other trigger, and either no
// `context` or a context from a closed vocabulary (a check tag the Narrator sets, a zone tag, "wearing:<item>", or a
// damage kind). Everything else is left to the item's lane handler, and until then goes to the Narrator with the
// item's text (never silently ignored; see coverage.ts).
//
// Inside an action (an active item's own effects), a few ops run generically when the action runs: cleanse, shield,
// heal, condition, knockback, Echo. See run()/runs().
import { SKILL, SKILLS, PERK } from '../data';
import type { Character } from '../character';
import { healingMult } from '../character';
import type { Combat, Unit } from '../combat';
import type { Holder, ItemInfo } from './types';
import { registerGeneric, genericEffects, statQuery, charOfUnit } from './hooks';
import { COST_SITES, type CostSite } from './stats';
import type { Rng } from '../rng';
import { applyCond, endCond, isCondition, condFamily, debuffsOf, condId } from '../magic';
import { moveBlockers, key, xy, dist, displace } from '../combat';
import { grantShield, healUnit, tendHook } from './damage';
import { gainEcho } from './echo';
import { deal, mend, type AmountSpec } from './output';
import { amountBlock, type AmountBlock } from './amounts';
import './triggers'; // item ops: the runner of triggered effects registers itself with the hooks (engine foundations 3)

// ---------- the scope vocabulary ----------
const GATES = ['when', 'duration', 'limit', 'uses', 'requires_state', 'per', 'trigger', 'count', 'area'];
/** Check and story tags the Narrator (or the zone) sets; a context in this list gates an effect on ctx.tags. */
export const TAG_VOCAB = new Set([
  'dialogue', 'crowd', 'official', 'merchant', 'military', 'underworld', 'vs_blocker', 'vs_same_kin', 'vs_other_race', 'non_human',
  'text', 'hearing', 'drama', 'unglamorous', 'running', 'climbing', 'alone_with_captive', 'vs_civilians_who_know', 'targets_mark',
  'for_bond', 'help_rival', 'case_related', 'chemical', 'flashback',
  'vs_blocker_or_interrupter', 'vs_same_race_and_homeworld', 'others_targeting_you', 'terrain:open', 'outside_city', 'in_city',
  'vs_military', 'humans_who_know_history', 'vs_underworld', 'vs_non_human', 'text_based', 'from_non_human', 'urban',
  // lane G (perk-guidance.ts): a hint the character was given, culture, an ancient script, a lie being told
  'hinted', 'culture', 'ancient_script', 'lie',
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
  hp_per_level: 'hp_per_level', glyph_ap: 'glyph_ap', attack: 'attack', ap: 'ap', shove_guard: 'shove_guard', one_hand_heavy: 'one_hand_heavy',
};
const MULT_MAP: Record<string, string> = { hp_max: 'hp', hp: 'hp', move: 'move', carry: 'carry', mp_max: 'mp_max', field_repair_amount: 'field_repair_amount' };

registerGeneric({
  op: 'stat_mod',
  claim: (e) => plainOrTagged(e) && !!STAT_MAP[e.stat] && typeof e.value === 'number',
  stat: (h, e, stat, ctx) => (STAT_MAP[e.stat] === stat && contextHolds(e, h, ctx) ? e.value : 0),
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
  const q = statQuery(x, `skill:${skill}`, ctx); if (q.add) labels.push({ add: q.add, label: 'perks' });
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
  const q = statQuery(x, `immune:${what}`); return q.add ? 'perk' : null;
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

registerGeneric({ op: 'action_cost', claim: (e) => isPlain(e) && COST_SITES.has(e.action) && (typeof e.value === 'number' || typeof e.set === 'number') });
/** The AP an action costs this unit: the base, then items' set (lowest wins) and value changes, never below 0
 * (lanes give their own floors, e.g. Field Medic's 1). Labels say why. */
export function actionAp(x: { u?: Unit | null; c?: Character | null }, action: CostSite, base: number, extra: Record<string, unknown> = {}): { ap: number; labels: string[] } {
  let ap = base, set: number | null = null; const labels: string[] = [];
  for (const { e, info } of genericEffects(x, 'action_cost')) {
    if (e.action !== action && !(action === 'stim' && e.action === 'heal') && !(action === 'stabilise' && e.action === 'heal')) continue;
    if (typeof e.set === 'number') { set = set == null ? e.set : Math.min(set, e.set); labels.push(info.name + ' (' + e.set + ' AP)'); }
    else { const was = ap; ap += e.value; if (typeof e.min === 'number' && e.value < 0) ap = Math.max(Math.min(was, e.min), ap); // the effect's own floor ("never below 1")
      labels.push(info.name + ' (' + (e.value > 0 ? '+' : '') + e.value + ')'); }
  }
  const q = statQuery(x, `ap_cost:${action}`, { ...extra, base }); ap += q.add; if (q.add) labels.push('perks');
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
    const t = targetUnit(h, e, args); if (!t) return null;
    // what it can end: the one named, a family's debuffs, or any debuff (never a boon), the flag conditions included
    // (Bleeding, Dazed, Prone: magic.ts debuffsOf is the one list)
    const ids = e.condition ? debuffsOf(t).filter((id) => id === condId(e.condition)) : debuffsOf(t, e.family || undefined);
    const gone = ids.slice(0, e.count || 1); for (const id of gone) endCond(t, id, h.cb);
    if (gone.length && h.cb && h.u) tendHook.f?.(h.cb, h.u, t); // tending others (rules 1.5, section 3.3)
    return gone.length ? ' · ' + t.name + ' shakes off ' + gone.join(', ') : ' · nothing to shake off';
  },
});
registerGeneric({
  op: 'shield', claim: () => false, runs: (e) => actPlain(e) && T_OK(e) && typeof e.value === 'number',
  run: (h, e, args) => { const t = targetUnit(h, e, args); if (!t) return null; const n = e.basis === 'hp_max' || (e.value > 0 && e.value < 1) ? e.value * t.maxHp : e.value; const v = grantShield(h.cb || null, t, n, h.u || null); return ' · ' + t.name + ' gains a ' + v + ' shield'; },
});
/** A heal's `scale` (effect_ops.json: "healing_given", "healing_given*ambient_healing"): × the healer's Healing given.
 * It was read and then multiplied by 1 either way (bug sweep, 12 Nov 2026). The ambient part needs nothing here:
 * healUnit's callers that mean it go through magic.ts, and no item that reaches this generic op names it. */
const healScale = (h: Holder, scale: unknown): number =>
  (typeof scale === 'string' && scale.split('*').map((x) => x.trim()).includes('healing_given') ? (h.c ? healingMult(h.c) : h.u?.mg?.healMult || 1) : 1);
registerGeneric({
  op: 'heal', claim: () => false, runs: (e) => actPlain(e) && T_OK(e) && typeof e.value === 'number',
  run: (h, e, args) => { const t = targetUnit(h, e, args); if (!t) return null; const n = e.value > 0 && e.value < 1 ? e.value * t.maxHp : e.value * healScale(h, e.scale); const r = healUnit(h.cb || null, t, n, h.u || null, 'perk'); return ' · ' + t.name + (r.revived ? ' is back up at ' + t.hp + ' HP' : ' heals ' + r.restored); },
});
// ---------- 'deal' and 'mend' (step a6 of the damage-formula migration): an AMOUNT from data, on the one formula ----------
// { "op": "deal", "amount": "<a name in the item's amounts>" | { an amount block }, "target": … }: damage through deal()
// (the 'damage_out' hook, armour by the block's type, the sink). { "op": "mend", … }: a heal through healUnit or a shield
// through grantShield, by the block's kind. The Stat term is the block's profile read from the holder's sheet; the
// Level term its profile's column. With these an item that only deals, heals or shields a number needs no code.
const blockOf = (h: Holder, e: any): AmountBlock | null => {
  if (e.amount && typeof e.amount === 'object' && typeof e.amount.base === 'number') return e.amount as AmountBlock;
  if (typeof e.amount === 'string') { try { return amountBlock(h.key, e.amount); } catch { return null; } }
  return null;
};
const specOf = (b: AmountBlock): AmountSpec => ({ kind: b.kind, base: b.base, ...(b.per ? { per: b.per } : {}), ...(b.profile ? { profile: b.profile } : {}), round: 'none' });
registerGeneric({
  op: 'deal', claim: () => false, runs: (e) => actPlain(e) && T_OK(e) && !!e.amount,
  run: (h, e, args) => {
    const t = targetUnit(h, e, args), b = blockOf(h, e); if (!t || !h.cb || !b || b.kind !== 'damage') return null;
    const type = b.type || 'true', src: any = { by: h.u || null, type, dmgType: type, shield: type !== 'true', credit: 'hp', item: h.key };
    const r = deal(h.cb, h.u || null, t, { ...specOf(b), kind: 'damage', round: 'floor', ...(b.armour ? { armour: b.armour } : {}), hook: !!h.u }, { who: h.c || null, counts: (args as any)?.counts, src, hookCtx: { mode: 'item', src } });
    return r.amount > 0 ? ' · ' + r.amount + ' damage to ' + t.name + (t.hp === 0 ? (t.side === 'foe' ? ', down for good' : ', Downed') : '') : ' · ' + t.name + ' takes no damage';
  },
});
registerGeneric({
  op: 'mend', claim: () => false, runs: (e) => actPlain(e) && T_OK(e) && !!e.amount,
  run: (h, e, args) => {
    const t = targetUnit(h, e, args), b = blockOf(h, e); if (!t || !b || b.kind === 'damage') return null;
    const r = mend(h.cb || null, h.u || null, t, { ...specOf(b), kind: b.kind }, { who: h.c || null, counts: (args as any)?.counts, healKind: 'perk' });
    return b.kind === 'shield' ? ' · ' + t.name + ' gains a ' + r.shield + ' shield' : ' · ' + t.name + (r.revived ? ' is back up at ' + t.hp + ' HP' : ' heals ' + r.restored);
  },
});
registerGeneric({
  op: 'condition', claim: () => false, runs: (e) => actPlain(e) && T_OK(e) && isCondition(e.condition || e.id) && !e.choose,
  // the source skill (rules 1.13): a perk's first skill, a skill's own unlock; anything else reads the call it runs inside
  run: (h, e, args, rng) => { const t = targetUnit(h, e, args); if (!t || !h.cb) return null; const via = h.kind === 'perk' ? (PERK[h.itemId] as any)?.skills?.[0] : h.kind === 'skill' ? h.itemId : undefined; return applyCond(h.cb, rng, h.u || null, t, e.condition || e.id, typeof e.rounds === 'number' ? e.rounds : undefined, undefined, via && SKILL[via] ? { via } : {}) || null; },
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
export function pushAway(cb: Combat, from: Unit, t: Unit, tiles: number, rng?: Rng | null): string {
  const mv = displace(cb, rng, t, { away: from.pos, tiles }, { by: from, how: 'push', source: 'knockback' });
  if (mv.stoppedBy === 'immune' || mv.stoppedBy === 'nailed' || mv.stoppedBy === 'held') return ' · ' + t.name + ' holds its ground';
  return mv.moved ? ' · ' + t.name + ' is knocked back ' + mv.moved + (mv.moved === 1 ? ' tile' : ' tiles') + mv.text : '';
}
export type { ItemInfo };
