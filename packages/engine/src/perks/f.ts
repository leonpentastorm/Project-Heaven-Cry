// Lane F: status, surrender, judgement, kin, companions. Perks: Bone Talk, The Name They Whisper, Open Hand, Clean
// Hands, Judgement Day, True Name, Case Closed, Still Water, Red Line, Lab Coat. Traits: Daggerfall Veteran, Chain
// Smoker, Trench Poet, Grudge Bearer, Pacifist, Humanity First, The Old Blood, Moon Hunter, Rabbit's Foot, Drone
// Handler, Beast Handler.
//
// Every item runs its tiers in combat and its story part (checks, story conditions, rest, session start) where it has
// one; what the engine can't judge goes to the Narrator (note / pendRuling / brief). Recommended fixes from the audit
// (plan section 6) are marked PROVISIONAL here and listed in the spec (section 14, tags F…) and docs/design/perk-runtime.md.
import { register, stateOf, uses, note, pendRuling, postStory, bankAp, pushAp, has, armedOf, disarm, modOn, charOfUnit, bindGame, restN, type Holder } from '../effects';
import type { Combat, Unit } from '../combat';
import type { Character } from '../character';
import { mod, packOf } from '../character';
import { dist, alive, unitSees, previewAttack, resolveAttack, enemyTurn, sideSees, emitFx, litAt, lineOfSight, type AttackMode } from '../combat';
import { applyCond, endCond, condOn, condSource, debuffsOf, condFamily, isBoon, isCondition, unitSave, unitDebuff } from '../magic';
import { d20 } from '../rng';
import { setStoryCond, storyConds, npcsOf, npcConds } from '../game';
import { trySurrender, canSurrender, surrender, HEARING, COMPANION_KINDS } from '../tactics';

// ---------- small helpers ----------
type Rng = { state: number };
const overworld = (cb: Combat | null | undefined) => !!cb && (cb.overworld || cb.name === 'overworld');
const inFight = (h: Holder) => !!h.cb && !!h.u && !overworld(h.cb);
const tierII = (h: Holder) => h.tier === 'II';
const say = (cb: Combat | null | undefined, line: string) => { if (cb) cb.log.push(line); };
const rngOf = (h: Holder, ctx?: any): Rng | null => ctx?.rng || h.g?.rng || null;
const up = (u: Unit | null | undefined): u is Unit => !!u && alive(u);
const cst = (c: Character | null | undefined): Record<string, any> => (c ? (c.state ||= {}) : {});
/** Read-only item state (stat queries and previews must not change state). */
const ro = (c: Character | null | undefined): Record<string, any> => c?.state || {};
const sceneN = (h: Holder) => h.g?.story?.scene?.n ?? 0;
const sgn = (n: number) => (n >= 0 ? '+' : '−') + Math.abs(n);
const TIER_SAVE: Record<string, number> = { minion: 0, soldier: 1, elite: 2, boss: 3 };
/** Does a unit answer to a name or id the story uses (an NPC id, or its name; loose for names of 3+ letters)? */
function matches(u: Unit, ref: any): boolean {
  if (ref == null) return false;
  if (Array.isArray(ref)) return ref.some((r) => matches(u, r));
  if (typeof ref === 'object') return matches(u, ref.id ?? ref.name ?? ref.npc);
  const r = String(ref).toLowerCase().trim(); if (!r) return false;
  const n = u.name.toLowerCase();
  return u.id === ref || u.npcId === ref || n === r || (r.length >= 3 && (n.includes(r) || r.includes(n)));
}
const nameMatch = (a: any, b: any) => { if (a == null || b == null) return false; const x = String(a).toLowerCase().trim(), y = String(b).toLowerCase().trim(); return !!x && !!y && (x === y || (x.length >= 3 && y.length >= 3 && (x.includes(y) || y.includes(x)))); };
const listHas = (list: any, ref: any) => (Array.isArray(list) ? list : list != null ? [list] : []).some((x: any) => nameMatch(typeof x === 'object' ? x.id ?? x.name : x, ref));
/** A story check is a Heart save, or a Composure check (the Heart-save skill), for items that boost them. */
const heartSave = (ck: any) => (ck.kind === 'save' && (ck.family === 'heart' || (!ck.family && ck.skills?.includes('composure'))));
const composureCk = (ck: any) => heartSave(ck) || !!ck.skills?.includes('composure');
const SOCIAL = new Set(['charisma', 'eloquence', 'implication', 'intimidation', 'empathy', 'authority', 'camaraderie']);
const socialCk = (ck: any) => (ck.skills || []).some((s: string) => SOCIAL.has(s)) || (ck.tags || []).some((t: string) => ['dialogue', 'crowd', 'official', 'merchant', 'military', 'underworld'].includes(t));
/** A once-per-fight flag on the holder's unit. */
const oncePerFight = (h: Holder, k: string) => { const st = stateOf(h); if (st[k]) return false; st[k] = true; return true; };
/** Put a story condition's combat form on the holder's unit at the start of a fight (Shaken from a lost drone, the
 * Vow, a dead beast): persistent story conditions don't yet reach fights on their own (see lane-f.md, hooks gap 1). */
function carryStoryCond(h: Holder, ctx: any, id: string) {
  if (!h.u || !h.c || !h.g || condOn(h.u, id)) return;
  if (!storyConds(h.g, h.c).includes(id)) return;
  const r = applyCond(h.cb!, rngOf(h, ctx) || { state: 1 }, null, h.u, id, 99, undefined, { skipSave: true });
  if (r) say(h.cb, h.u.name + ' carries it into the fight' + r + '.');
}

// ======================================================================================================== PERKS

// ---------- Bone Talk (Intimidation γ) ----------
// Story: threaten someone with one specific physical detail: they answer one question truthfully, or refuse and are
// Shaken for the scene. Tier II: a group; the leader answers for all of them, and a refusal Shakes the whole group.
// No save in the story: the NPC chooses (plan 6, Bone Talk 2; PROVISIONAL). The Narrator rules the detail and the
// answer, and reports a refusal through conditions [{target, id:'shaken'}]. An NPC that is Shaken this scene gives
// every character +2 on social checks against it (the NPC's −2; the TN ladder is fixed), and starts a fight in the
// same scene Shaken.
// Combat (PROVISIONAL): 2 AP, an enemy within hearing (8 tiles) who can see you: a Heart save (12 + your Heart debuff
// strength) or Shaken; Tier II: every enemy within hearing who sees you rolls. What it answers goes to the Narrator.
const shakenNpc = (g: any, ref: any) => !!ref && (npcConds(g, ref).includes('shaken') || npcConds(g, String(ref).toLowerCase()).includes('shaken'));
register({
  id: 'bone_talk', claims: 'all',
  actions: [
    {
      id: 'bone_talk', label: 'Bone Talk', scope: ['combat'], target: 'enemy', ap: 2, range: HEARING,
      text: 'Threaten an enemy with one physical detail: Heart save or Shaken (Tier II: every enemy in earshot who sees you).',
      preview: (h, a) => {
        const t = h.cb?.units.find((x) => x.id === a.targetId); if (!t || !h.u) return {};
        if (!unitSees(h.cb!, t, h.u.pos)) return { ok: false, why: t.name + ' has to see you.' };
        const tn = 12 + unitDebuff(h.u, 'heart');
        return { lines: ['Heart save ' + sgn(unitSave(t, 'heart')) + ' vs ' + tn + ' or Shaken' + (tierII(h) ? '; the whole group in earshot rolls.' : '.')] };
      },
      run: (h, a, rng) => {
        const cb = h.cb!, u = h.u!, t = cb.units.find((x) => x.id === a.targetId)!;
        const group = tierII(h) ? cb.units.filter((v) => v.side === t.side && up(v) && dist(v.pos, u.pos) <= HEARING && unitSees(cb, v, u.pos)) : [t];
        if (!group.includes(t)) group.unshift(t);
        let out = ''; for (const v of group) out += applyCond(cb, rng, u, v, 'shaken', undefined, 'heart');
        say(cb, u.name + ' leans in (Bone Talk' + (a.text ? ': "' + a.text.slice(0, 160) + '"' : '') + ')' + out + '.');
        note(h, u.name + ' threatened ' + (group.length > 1 ? 'the group led by ' : '') + t.name + (a.text ? ' ("' + a.text.slice(0, 120) + '")' : '') + ': voice what they blurt out, if anything, in the report.');
      },
    },
    {
      id: 'bone_talk_story', label: 'Bone Talk', scope: ['story', 'world'], target: 'text', ap: 0,
      text: 'Threaten someone with one specific physical detail (type it): they answer one question truthfully, or are Shaken for the scene.',
      run: (h, a) => {
        const who = a.npc || 'them', eid = postStory(h, (a.npc ? a.npc + ': ' : '') + (a.text || ''));
        if (h.g && h.c) pendRuling(h.g, h.c, h.key, 'Bone Talk' + (tierII(h) ? ' II (a group: the leader answers for all)' : '') + ' on ' + who + ': "' + String(a.text || '').slice(0, 140) + '". If it names one specific physical detail, ' + who + ' answers one question truthfully, or refuses and is Shaken this scene (conditions [{target, id:"shaken"}]' + (tierII(h) ? ', each of the group' : '') + '). No save: their choice. Refuse if the threat is vague.', eid || undefined);
      },
    },
  ],
  on: {
    combat_start: (ctx, h) => {
      const sc = h.g?.story?.scene?.npcConds; if (!sc || !h.cb) return;
      for (const v of h.cb.units) if (v.side !== h.u?.side && !condOn(v, 'shaken') && (shakenNpc(h.g, v.npcId) || shakenNpc(h.g, v.name)))
        say(h.cb, v.name + ' is still rattled' + applyCond(h.cb, rngOf(h, ctx) || { state: 1 }, h.u || null, v, 'shaken', 99, 'heart', { skipSave: true }) + '.');
    },
  },
  brief: (h) => 'Narrator: does the threat name a real detail; the true answer, or Shaken (conditions)' + (tierII(h) ? '; the group leader answers' : ''),
});

// ---------- The Name They Whisper (Intimidation Mastered) ----------
// When a fight starts, every enemy not marked unaware saves (Heart) or is Afraid of you for 2 rounds. An enemy at half
// HP or less that can see you, at the end of its own turn, makes a Heart save or surrenders: once per enemy a fight,
// only while you're up, never a Boss (plan 6, The Name They Whisper: GAMEBREAKING fix; PROVISIONAL). The TN uses the
// better of your Intimidation and Implication modifiers (plan 6; PROVISIONAL).
const nameTnAdd = (h: Holder) => (h.u && h.c ? Math.max(0, mod(h.c.skills.intimidation || 0) - unitDebuff(h.u, 'heart')) : 0);
register({
  id: 'the_name_they_whisper', claims: 'all', narrator: (e: any) => e?.op === 'narrator',
  on: {
    combat_start: (ctx, h) => {
      const cb = h.cb!, u = h.u; if (!up(u) || !oncePerFight(h, 'started')) return;
      const rng = rngOf(h, ctx) || { state: 1 }, add = nameTnAdd(h); let out = '';
      for (const v of cb.units) if (v.side !== u.side && up(v) && !(v.tags || []).includes('unaware')) out += applyCond(cb, rng, u, v, 'fear', 2, 'heart', { tnAdd: add });
      if (out) say(cb, 'They know the name ' + u.name + ' (The Name They Whisper)' + out + '.');
    },
    turn_end: (ctx, h) => {
      const cb = h.cb!, u = h.u, t: Unit = ctx.u;
      if (!up(u) || !t || t.side === u.side || !up(t) || t.hp * 2 > t.maxHp || !canSurrender(t) || !unitSees(cb, t, u.pos)) return;
      say(cb, t.name + ' remembers whose name it is (The Name They Whisper)' + trySurrender(cb, ctx.rng || rngOf(h) || { state: 1 }, u, t, nameTnAdd(h)) + '.');
    },
  },
  brief: () => 'Narrator: NPCs who know the name react; mark strangers unaware when a fight starts',
});

// ---------- Open Hand (Empathy Mastered) ----------
// When an enemy you can see drops to a quarter of its HP or less (from above, still standing), mercy is offered as a
// free action: it makes a Heart save (12 + your Heart debuff strength) or surrenders for the rest of the fight. One
// offer per enemy, its own (not the general surrender save; PROVISIONAL). Bosses, machines and no_surrender foes never
// take it. The setting (always / ask / never) is yours: 'ask' leaves the free Offer mercy action for your turn.
function mercyOk(t: Unit) { const was = t.surrenderTried; t.surrenderTried = false; const ok = canSurrender(t); t.surrenderTried = was; return ok; }
const offered = (h: Holder): string[] => (stateOf(h).offered ||= []);
function offerMercy(h: Holder, t: Unit, rng: Rng): string {
  offered(h).push(t.id);
  const r = d20(rng), m = unitSave(t, 'heart'), tn = 12 + unitDebuff(h.u!, 'heart'), held = r === 20 || (r !== 1 && r + m >= tn);
  const roll = ' (Heart save d20 ' + r + ' ' + sgn(m) + ' vs ' + tn + ')';
  return held ? ' · ' + t.name + ' won\'t take it' + roll : surrender(h.cb!, t, h.u!, 'mercy accepted' + roll);
}
const mercyMode = (h: Holder) => ro(h.c).open_hand || 'always';
register({
  id: 'open_hand', claims: 'all',
  on: {
    on_damaged: (ctx, h) => {
      const t: Unit = ctx.t, u = h.u, cb = h.cb!;
      if (!up(u) || !t || t.side === u.side || !up(t) || ctx.prevHp * 4 <= t.maxHp || t.hp * 4 > t.maxHp || !mercyOk(t) || offered(h).includes(t.id) || !unitSees(cb, u, t.pos)) return;
      const rng = rngOf(h); if (!rng) return;
      if (mercyMode(h) !== 'always') { if (mercyMode(h) === 'ask') say(cb, u.name + ' could offer ' + t.name + ' mercy (Open Hand: free on your turn).'); return; }
      say(cb, u.name + ' offers ' + t.name + ' an open hand' + offerMercy(h, t, rng) + '.');
    },
  },
  actions: [
    {
      id: 'offer_mercy', label: 'Offer mercy', scope: ['combat'], target: 'enemy', ap: 0,
      text: 'An enemy you can see at a quarter of its HP or less: Heart save or it surrenders. Once per enemy.',
      preview: (h, a) => {
        const t = h.cb?.units.find((x) => x.id === a.targetId); if (!t || !h.u) return {};
        if (t.hp * 4 > t.maxHp) return { ok: false, why: t.name + ' isn\'t beaten enough (a quarter of its HP).' };
        if (offered(h).includes(t.id)) return { ok: false, why: 'Mercy was offered to ' + t.name + ' already.' };
        if (!mercyOk(t)) return { ok: false, why: t.name + ' won\'t surrender.' };
        if (!unitSees(h.cb!, h.u, t.pos)) return { ok: false, why: 'You can\'t see them.' };
        return { lines: ['Heart save ' + sgn(unitSave(t, 'heart')) + ' vs ' + (12 + unitDebuff(h.u, 'heart')) + ' or it surrenders.'] };
      },
      run: (h, a, rng) => { const t = h.cb!.units.find((x) => x.id === a.targetId)!; say(h.cb, h.u!.name + ' offers ' + t.name + ' an open hand' + offerMercy(h, t, rng) + '.'); },
    },
    {
      id: 'mercy_setting', label: 'Open Hand: offer mercy…', pick: ['always', 'ask', 'never'], pickLabel: 'When to offer mercy', scope: ['combat', 'story'], target: 'none', ap: 0,
      text: 'Choose always (offered the moment they break), ask (you offer on your turn) or never.',
      preview: (h, a) => ({ lines: ['Now: ' + mercyMode(h) + (a.choice ? ' → ' + a.choice : '') + '.'] }),
      run: (h, a) => {
        const next = ['always', 'ask', 'never'].includes(a.choice || '') ? a.choice! : ({ always: 'ask', ask: 'never', never: 'always' } as any)[mercyMode(h)];
        cst(h.c).open_hand = next; say(h.cb, (h.u?.name || h.c?.name) + ' will offer mercy: ' + next + '.');
      },
    },
  ],
  brief: () => 'Narrator: how prisoners are treated; a reputation for mercy',
});

// ---------- Clean Hands (Conscience β) ----------
// +2 AP (II: +3) on your next turn after you spare an enemy or protect an innocent, once a turn. Spare: the Spare toggle
// on an attack makes a blow that takes a foe's last HP subdue it instead (no kill credit); any surrender you cause
// (talked down, mercy, the Name) counts. Protect: healing or shielding a civilian or neutral. The choice is made before
// the roll and spared foes give no kill credit (plan 6, Clean Hands 2; PROVISIONAL). Out of combat the Narrator rules
// spared or protected moments.
function cleanAp(h: Holder, why: string) {
  if (overworld(h.cb) || (!h.u && h.c)) { // the area map and the story: +2 (II +3) AP on the next overworld round, once a round
    const g = h.g, st = stateOf(h); if (!g?.story || st.owRound === g.story.round) return;
    st.owRound = g.story.round; st.owAp = tierII(h) ? 3 : 2; postStory(h, 'Clean Hands (' + why + '): +' + st.owAp + ' AP next round.', { kind: 'system' }); return;
  }
  if (!h.u || !uses(h).take('per_turn', 1, h.key + '#ap')) return;
  bankAp(h.u, tierII(h) ? 3 : 2, 'Clean Hands: ' + why, h.cb);
}
const innocent = (t: Unit) => (t.tags || []).includes('civilian') || (t.side as string) === 'neutral';
register({
  id: 'clean_hands', claims: 'all',
  toggles: [{ id: 'spare', label: 'Spare', on: ['combat/attack'], preview: (h) => 'A blow that takes their last HP subdues them; +' + (tierII(h) ? 3 : 2) + ' AP next turn' }],
  on: {
    damage_in: (ctx, h) => { if (ctx.phase === 'would_drop_to_0' && ctx.src?.by === h.u && ctx.t.side !== h.u!.side && modOn(h, 'spare')) ctx.src.nonlethal = true; },
    on_surrender: (ctx, h) => { if (ctx.by === h.u || (ctx.by == null && ctx.t?.lastHitBy === h.u?.id)) cleanAp(h, 'spared ' + ctx.t.name); },
    heal_given: (ctx, h) => { if (ctx.by === h.u && ctx.n > 0 && innocent(ctx.t)) cleanAp(h, 'protected ' + ctx.t.name); },
    shield_grant: (ctx, h) => { if (ctx.by === h.u && ctx.n > 0 && innocent(ctx.t)) cleanAp(h, 'protected ' + ctx.t.name); },
    ruling_answered: (ctx, h) => { if (ctx.c === h.c && ctx.accepted && /^Clean Hands:/.test(ctx.r.text)) cleanAp(h, 'the Narrator agrees'); },
    round_ap: (ctx, h) => { if (ctx.c !== h.c) return; const st = stateOf(h); if (st.owAp) { ctx.ap += st.owAp; ctx.lines.push('Clean Hands'); st.owAp = 0; } },
  },
  actions: [{
    id: 'clean_story', label: 'I spared them', scope: ['story', 'world'], target: 'text', ap: 0, uses: { per: 'per_scene', n: 2 },
    text: 'Out of a fight: claim a moment you spared someone or protected an innocent. If the Narrator agrees, +' + 2 + ' AP (II +3) next overworld round.',
    run: (h, a) => { const t = String(a.text || a.npc || 'someone').slice(0, 120), eid = postStory(h, 'spares or protects: ' + t + '.'); if (h.g && h.c) pendRuling(h.g, h.c, h.key, 'Clean Hands: ' + h.c.name + ' spared or protected ' + t + '. Accept if it truly happened (+AP next round); refuse if not.', eid || undefined); return null; },
  }],
  brief: () => 'out of a fight: accept or refuse their Clean Hands claims (spared/protected)',
});

// ---------- Judgement Day (Faith Mastered) ----------
// 3 AP, once per combat: judge an enemy you can see. Its next attack against anyone on your side (you included) fails
// with no roll; your attacks against it get +50% until the fight ends (the target-specific bucket, capped at ×2: plan
// 6a-1).
const judged = (h: Holder): { id: string; spent: boolean } | null => (h.u?.ps?.[h.key] as any)?.judged || null;
register({
  id: 'judgement_day', claims: 'all',
  actions: [{
    id: 'judgement', label: 'Judgement', scope: ['combat'], target: 'enemy', ap: 3, uses: { per: 'per_combat', n: 1 }, needsSight: true,
    text: 'Judge an enemy you can see: its next attack on your side fails; your attacks on it deal +50% for the fight.',
    preview: (h, a) => { const t = h.cb?.units.find((x) => x.id === a.targetId); if (t && h.u && !unitSees(h.cb!, h.u, t.pos)) return { ok: false, why: 'You can\'t see them.' }; return { lines: ['Its next attack on your side fails; +50% damage from you.'] }; },
    run: (h, a) => {
      const t = h.cb!.units.find((x) => x.id === a.targetId)!; stateOf(h).judged = { id: t.id, spent: false };
      emitFx(h.cb!, 'cond', { target: t.id, at: t.pos, id: 'marked' });
      say(h.cb, h.u!.name + ' judges ' + t.name + ' (Judgement Day): the saints have decided.');
    },
  }],
  on: {
    attack_roll: (ctx, h) => {
      const j = judged(h); if (!j || j.spent || ctx.att.id !== j.id || ctx.tgt.side !== h.u!.side) return;
      j.spent = true; ctx.hit = false;
      say(h.cb, ctx.att.name + ' is judged: the attack on ' + ctx.tgt.name + ' fails (Judgement Day).');
    },
    damage_out: (ctx, h) => { const j = judged(h); if (j && ctx.att === h.u && ctx.tgt.id === j.id) ctx.vs.push({ v: 0.5, label: 'Judgement Day' }); },
  },
  brief: () => null,
});

// ---------- True Name (Lore Master Mastered) ----------
// Once per session, 0 AP: name an upper-realm being, curse or creature you've studied. For the rest of the scene it
// takes +50% from you and your allies (the target bucket, capped ×2), and it can't lie to you. The engine allows only
// targets the Narrator marked upper-realm, cursed, celestial or beast (kind, or the upper_realm tag; plan 6, True Name;
// PROVISIONAL); "studied" and the lie are the Narrator's. In the story the Narrator confirms (refused: the use comes back).
const NAMEABLE = new Set(['upper_realm', 'cursed', 'celestial', 'beast']);
const nameable = (t: Unit) => NAMEABLE.has(t.kind || '') || (t.tags || []).includes('upper_realm');
const trueNamed = (h: Holder, t: Unit) => { const tn = ro(h.c).true_name; return !!tn && (tn.scene == null || tn.scene === sceneN(h)) && (tn.unit === t.id || matches(t, tn.id)); };
register({
  id: 'true_name', claims: 'all', narrator: (e: any) => e?.op === 'narrator',
  actions: [
    {
      id: 'true_name', label: 'True Name', scope: ['combat'], target: 'enemy', ap: 0, uses: { per: 'per_session', n: 1 },
      text: 'Name an upper-realm being, curse or creature: +50% damage from your side for the scene; it can\'t lie to you.',
      preview: (h, a) => { const t = h.cb?.units.find((x) => x.id === a.targetId); if (t && !nameable(t)) return { ok: false, why: t.name + ' has no true name to speak (not upper-realm, cursed or a creature).' }; return { lines: ['+50% damage to it from your side for the rest of the scene.'] }; },
      run: (h, a) => {
        const t = h.cb!.units.find((x) => x.id === a.targetId)!;
        cst(h.c).true_name = { id: t.npcId || t.name, unit: t.id, scene: sceneN(h) };
        say(h.cb, h.u!.name + ' speaks the true name of ' + t.name + ' (True Name): it takes +50% from the squad this scene.');
        note(h, t.name + ' was named; it can\'t lie to ' + h.u!.name + ' this scene. Confirm it was studied.');
      },
    },
    {
      id: 'true_name_story', label: 'True Name', scope: ['story'], target: 'text', ap: 0, uses: { per: 'per_session', n: 1 },
      text: 'Name a being, curse or creature here (type who): it can\'t lie to you this scene, and takes +50% if it comes to a fight.',
      available: (h) => (uses(h).left('per_session', 1, h.key + '#true_name') > 0 ? true : 'Used this session.'),
      run: (h, a) => {
        const who = a.npc || String(a.text || '').trim(); uses(h).take('per_session', 1, h.key + '#true_name');
        cst(h.c).true_name = { id: who.slice(0, 60), scene: sceneN(h) };
        const eid = postStory(h, 'speaks the true name of ' + who.slice(0, 80) + '.');
        if (h.g && h.c) pendRuling(h.g, h.c, h.key, 'True Name on ' + who.slice(0, 80) + ': if it is an upper-realm being, curse or creature ' + h.c.name + ' has studied, it can\'t lie to them this scene (and takes +50% in a fight). Refuse otherwise (the use comes back).', eid || undefined);
      },
    },
  ],
  on: {
    damage_out: (ctx, h) => { if (h.u && ctx.att.side === h.u.side && trueNamed(h, ctx.tgt) && !ctx.vs.some((x: any) => x.label === 'True Name')) ctx.vs.push({ v: 0.5, label: 'True Name' }); },
  },
  brief: (h) => { const tn = ro(h.c).true_name; return 'Narrator: confirm studied; the named one can\'t lie' + (tn && tn.scene === sceneN(h) ? ' (named: ' + String(tn.id).slice(0, 30) + ')' : ''); },
});

// ---------- Case Closed (Analysis Mastered) ----------
// Analyze reveals everything at once (HP, Defense, armour, its kind and tags, its saves, conditions, a Weak Point) and
// what it wants (the Narrator's, in the report). You and every ally attacking an enemy you analyzed get +2 to hit and
// +20% damage (the target bucket). An enemy an ally analyzed can be re-read with Close the case (the Analyze cost).
// Story: a successful Analysis check on an NPC owes the motive (a pending ruling).
const closed = (h: Holder): string[] => ((h.u?.ps?.[h.key] as any)?.closed || []);
function closeCase(h: Holder, t: Unit) {
  const st = stateOf(h); (st.closed ||= []).includes(t.id) || st.closed.push(t.id);
  t.weakPoint = true;
  const conds = debuffsOf(t);
  say(h.cb, 'Case Closed on ' + t.name + ': HP ' + t.hp + '/' + t.maxHp + ', Defense ' + t.def + ', armour ' + t.armour + ', ' + (t.kind || 'human') + ((t.tags || []).length ? ' (' + t.tags!.join(', ') + ')' : '') +
    ', saves body ' + sgn(unitSave(t, 'body')) + ' brain ' + sgn(unitSave(t, 'brain')) + ' heart ' + sgn(unitSave(t, 'heart')) + (conds.length ? ', ' + conds.join(', ') : '') + ' · Weak Point · +2 to hit, +20% damage for the squad · motive: for the Narrator.');
  note(h, h.u!.name + ' read ' + t.name + ' completely: say what it wants, in the report.');
}
register({
  id: 'case_closed', claims: 'all',
  on: {
    analyze: (ctx, h) => { if (ctx.u === h.u && ctx.t) closeCase(h, ctx.t); },
    attack_preview: (ctx, h) => { if (h.u && ctx.att.side === h.u.side && closed(h).includes(ctx.tgt.id)) ctx.terms.push({ v: 2, label: 'Case Closed' }); },
    damage_out: (ctx, h) => { if (h.u && ctx.att.side === h.u.side && closed(h).includes(ctx.tgt.id) && !ctx.vs.some((x: any) => x.label === 'Case Closed')) ctx.vs.push({ v: 0.2, label: 'Case Closed' }); },
    check_result: (ctx, h) => {
      if (ctx.c !== h.c || !ctx.roll?.ok || !ctx.ck.skills?.includes('analysis') || !h.g || !h.c) return;
      pendRuling(h.g, h.c, h.key, 'Case Closed: the Analysis check succeeded; tell ' + h.c.name + ' (a private perkLine) what ' + (ctx.ck.target || 'the subject') + ' wants most.');
    },
  },
  actions: [{
    id: 'close_case', label: 'Close the case', scope: ['combat'], target: 'enemy', ap: (h) => (h.u && (h.u.analysis || 0) >= 3 ? 1 : 2),
    text: 'Read an enemy an ally already analyzed, completely (Analyze range, line of sight).',
    available: (h) => (inFight(h) && h.cb!.units.some((t) => t.side !== h.u!.side && up(t) && t.analyzedBy && !closed(h).includes(t.id)) ? true : false),
    preview: (h, a) => {
      const t = h.cb?.units.find((x) => x.id === a.targetId); if (!t || !h.u) return {};
      if (!t.analyzedBy) return { ok: false, why: 'Analyze it first (the Analyze action).' };
      if (closed(h).includes(t.id)) return { ok: false, why: 'Already read.' };
      if (dist(h.u.pos, t.pos) > 4 + (h.u.analysis || 0) || !unitSees(h.cb!, h.u, t.pos)) return { ok: false, why: 'Out of Analyze range or sight.' };
      return {};
    },
    run: (h, a) => { closeCase(h, h.cb!.units.find((x) => x.id === a.targetId)!); },
  }],
  brief: () => 'Narrator: the motive (in the fight report, or after a successful Analysis check)',
});

// ---------- Still Water (Composure Mastered) ----------
// Immune to the Brain family (the generic immunity handles it: Left and Right Brain Debuff, Confused, Silenced). Nothing
// reads you: enemy AI picks targets as if you were at full HP, and hostile reads (Analyze, Empathy, lie-reading by
// NPCs) reveal nothing; allies' reads still work (plan 6, Still Water 3; PROVISIONAL).
function aiPick(cb: Combat, att: Unit, mode: AttackMode): Unit | null {
  const tauntBy = condSource(att, 'taunted');
  const hpOf = (t: Unit) => (has(t, 'still_water') ? t.maxHp : t.hp);
  const pcs = cb.units.filter((t) => t.side !== att.side && !t.dead && !t.hidden && !t.surrendered);
  const ok = pcs.map((t) => ({ t, pv: previewAttack(cb, att, t, mode) })).filter((x) => x.pv.ok)
    .sort((a, b) => (b.t.id === tauntBy ? 1 : 0) - (a.t.id === tauntBy ? 1 : 0) || (a.t.downed ? 1 : 0) - (b.t.downed ? 1 : 0) || hpOf(a.t) - hpOf(b.t) || b.pv.pct - a.pv.pct);
  return ok[0]?.t || null;
}
register({
  id: 'still_water', claims: [1],
  on: {
    attack_target: (ctx, h) => {
      const cb = h.cb!, att: Unit = ctx.att, u = h.u!;
      if (ctx.tgt !== u || att.side === u.side || cb.order[cb.turn] !== att.id || att.side !== 'foe' || condOn(att, 'puppeted') || u.hp >= u.maxHp || ctx._stillWater) return;
      ctx._stillWater = true;
      const pick = aiPick(cb, att, ctx.mode === 'melee' ? 'melee' : ctx.mode); if (!pick || pick === u) return;
      ctx.tgt = pick; say(cb, att.name + ' can\'t read ' + u.name + ' (Still Water) and goes for ' + pick.name + '.');
    },
  },
  brief: () => 'Narrator: NPCs can\'t read their intent, lies or condition',
});

// ---------- Red Line (Conscience β) ----------
// Name one line you won't cross (the Name your line action, story). While it holds: +1 on every Heart save (II: +2, and
// allies within 3 tiles +1; in the story, the others present). The Narrator rules a crossing: traitState
// red_line_crossed: true. No new line until the next session (plan 6, Red Line 2; PROVISIONAL).
const line = (c: Character | null | undefined) => ro(c).red_line;
const holds = (c: Character | null | undefined) => typeof line(c) === 'string' && !!line(c) && !ro(c).red_line_crossed;
register({
  id: 'red_line', claims: (e: any) => e?.op === 'save_mod',
  stat: (h, stat) => (stat === 'save_heart' && holds(h.c) ? (tierII(h) ? 2 : 1) : 0),
  on: {
    cond_apply: (ctx, h) => {
      const u = h.u, t: Unit = ctx.t;
      if (!tierII(h) || !up(u) || !holds(h.c) || !t || t === u || t.side !== u.side || ctx.fam !== 'heart' || dist(t.pos, u.pos) > 3 || ctx._redLine) return;
      ctx._redLine = true; ctx.saveAdd += 1;
    },
    check_mod: (ctx, h) => {
      if (!holds(h.c) || !heartSave(ctx.ck)) return;
      if (ctx.c === h.c) ctx.add.push({ add: tierII(h) ? 2 : 1, label: 'Red Line' });
      else if (tierII(h) && !ctx.add.some((m: any) => m.label === 'Red Line (ally)')) ctx.add.push({ add: 1, label: 'Red Line (ally)' });
    },
    session_start: (ctx, h) => { const s = ro(h.c); if (s.red_line_crossed && h.c) { delete h.c.state!.red_line; delete h.c.state!.red_line_crossed; } },
  },
  actions: [{
    id: 'name_line', label: 'Name your line', scope: ['story'], target: 'text', ap: 0,
    text: 'Type the one line you won\'t cross. While it holds, +1 on Heart saves (II: +2, and allies +1).',
    available: (h) => (ro(h.c).red_line_crossed ? 'You crossed it: a new line next session.' : holds(h.c) ? 'Your line holds: "' + String(line(h.c)).slice(0, 60) + '".' : true),
    run: (h, a) => { cst(h.c).red_line = String(a.text || '').trim().slice(0, 140); postStory(h, 'names a line they won\'t cross: "' + cst(h.c).red_line + '".'); },
  }],
  brief: (h) => (holds(h.c) ? 'watch their line "' + String(line(h.c)).slice(0, 60) + '"; if crossed, traitState red_line_crossed:true' : null),
});

// ---------- Lab Coat (Rumination β) ----------
// I: +3 on saves against chemicals, gases and drugs you've identified. Identified: the Narrator's identify field
// (c.state.identified), a check against an identified agent (ck.target) or tagged 'identified'; in a fight, a
// chemical condition (Nausea) put on you by someone you analyzed, or one you've identified. Story saves need the
// 'chemical' tag. II: 2 AP, neutralise one identified agent for allies within 2 tiles (PROVISIONAL radius): it ends on
// them and they're immune to it for the fight; a toxic hazard stops hurting them. Out of combat it's free.
const CHEM = ['nausea', 'poisoned', 'drugged', 'toxin'];
const identified = (c: Character | null | undefined, what: any) => listHas(ro(c).identified, what);
const chemOn = (u: Unit) => CHEM.filter((id) => isCondition(id) && condOn(u, id));
register({
  id: 'lab_coat', claims: 'all',
  on: {
    // Lab Coat II out of a fight: an agent neutralised this scene doesn't land on anyone in the party (the scene's list).
    story_cond_apply: (ctx, h) => { const l: string[] = (ctx.g?.story?.scene as any)?.labImmune || []; if (l.includes(ctx.id)) { ctx.cancel = true; ctx.why = 'neutralised by ' + (h.c?.name || 'Lab Coat'); } },
    check_mod: (ctx, h) => {
      const ck = ctx.ck; if (ctx.c !== h.c || ck.kind !== 'save' || !(ctx.tags || []).includes('chemical')) return;
      if (ck.target ? identified(h.c, ck.target) : (ctx.tags || []).includes('identified')) ctx.add.push({ add: 3, label: 'Lab Coat' });
    },
    cond_apply: (ctx, h) => {
      const u = h.u; if (!u) return;
      const imm = (stateOf(h).neutral || []) as { agent: string; ids: string[] }[];
      if (imm.some((x) => x.agent === ctx.id && x.ids.includes(ctx.t.id))) { ctx.cancel = true; ctx.why = 'Lab Coat: neutralised'; return; }
      if (ctx.t !== u || !CHEM.includes(ctx.id)) return;
      if (identified(h.c, ctx.id) || (ctx.by && ctx.by.analyzedBy === u.name)) ctx.saveAdd += 3;
    },
  },
  actions: [{
    id: 'neutralise_agent', label: 'Neutralise agent', scope: ['combat', 'world', 'story'], target: 'none', ap: (h) => (inFight(h) ? 2 : 0),
    text: 'Neutralise one identified chemical for the allies around you (2 tiles): it ends on them; they\'re immune for the fight.',
    available: (h) => (!tierII(h) ? false : inFight(h) ? (agentsHere(h).length ? true : 'No identified agent here.') : true),
    preview: (h, a) => (inFight(h) ? { lines: ['Neutralises ' + (a.choice || agentsHere(h)[0] || 'nothing') + ' for allies within 2 tiles.'] } : { lines: ['The Narrator describes it; the party is safe from it this scene.'] }),
    run: (h, a) => {
      if (!inFight(h)) {
        const what = a.choice || a.text || (ro(h.c).identified || [])[0] || 'the agent';
        const eid = postStory(h, 'neutralises ' + String(what).slice(0, 60) + ' for the party.');
        for (const c of Object.values<Character>(h.g?.characters || {})) for (const id of CHEM) if (storyConds(h.g, c).includes(id) && (a.choice ? a.choice === id : true)) setStoryCond(h.g, c, id, 'scene', true);
        // The party stays safe from it for the rest of the scene: a later story condition of that agent doesn't land.
        { const sc = h.g?.story?.scene; if (sc) { const l: string[] = ((sc as any).labImmune ||= []), ids = a.choice && CHEM.includes(a.choice) ? [a.choice] : CHEM; for (const id of ids) if (!l.includes(id)) l.push(id); } }
        if (h.g && h.c) pendRuling(h.g, h.c, h.key, 'Lab Coat II: ' + h.c.name + ' neutralises ' + String(what).slice(0, 60) + ' for the party this scene (if they have identified it).', eid || undefined);
        return;
      }
      const cb = h.cb!, u = h.u!, list = agentsHere(h), agent = a.choice && list.includes(a.choice) ? a.choice : list[0];
      if (!agent) return 'No identified agent here.';
      const allies = cb.units.filter((v) => v.side === u.side && !v.dead && dist(v.pos, u.pos) <= 2);
      for (const v of allies) { if (agent === 'toxic') (v.hazardImmune ||= []).includes('toxic') || v.hazardImmune!.push('toxic'); else endCond(v, agent, cb); }
      ((stateOf(h).neutral ||= []) as any[]).push({ agent, ids: allies.map((v) => v.id) });
      say(cb, u.name + ' neutralises ' + agent + ' (Lab Coat) for ' + allies.map((v) => v.name).join(', ') + '.');
    },
  }],
  brief: () => 'Narrator: tag chemical saves (tags chemical; target the agent) and record identify',
});
/** Agents the holder can neutralise in this fight: chemical conditions on allies within 2 tiles, a toxic hazard. */
function agentsHere(h: Holder): string[] {
  const cb = h.cb!, u = h.u!, out = new Set<string>();
  for (const v of cb.units) if (v.side === u.side && !v.dead && dist(v.pos, u.pos) <= 2) for (const id of chemOn(v)) out.add(id);
  if ((cb.objects || []).some((o: any) => o.kind === 'toxic' && !o.resolved)) out.add('toxic');
  return [...out];
}

// ======================================================================================================== TRAITS

// ---------- Daggerfall Veteran ----------
// Immune to Fear (generic). Shake It Off: once per combat, free, remove one Heart debuff (story: once a scene, a story
// Heart condition). +2 Authority and Composure with anyone military (generic on tagged checks; in a fight, +2 on Heart
// saves against debuffs from units tagged military). Seen It Before, once per session: in a fight the engine forecasts
// each visible enemy's next move and target (the deterministic AI, run on a copy); in the story the Narrator owes a
// truthful answer. Flashback: Burning on you, an explosion within 3 tiles, or a Narrator check tagged flashback:
// Composure TN 12 (the ladder; plan 6, Daggerfall 1; PROVISIONAL) or lose your next turn (Stunned 1); once a fight.
const heartCondsOn = (u: Unit) => debuffsOf(u, 'heart');
const storyHeart = (h: Holder) => (h.c && h.g ? storyConds(h.g, h.c).filter((id) => condFamily(id) === 'heart' && !isBoon(id)) : []);
function flashback(h: Holder, why: string, rng: Rng | null) {
  const u = h.u, cb = h.cb; if (!up(u) || !cb || !rng || !oncePerFight(h, 'flashback')) return;
  const r = d20(rng), m = mod(h.c?.skills.composure || 0) + (u.sk?.composure || 0), ok = r === 20 || (r !== 1 && r + m >= 12);
  let line = u.name + ' is back at Daggerfall (' + why + '): Composure d20 ' + r + ' ' + sgn(m) + ' vs 12';
  if (ok) line += ' · holds it together';
  else line += ' · lost in it' + applyCond(cb, rng, null, u, 'stunned', 1, 'body', { skipSave: true }) + ', loses the next turn';
  say(cb, line + '.');
}
const EXPLOSIVE_THROWS = new Set(['frag_grenade', 'incendiary_grenade', 'satchel_charge', 'satchel']);
function foresee(h: Holder, rng: Rng): string[] {
  const g2 = JSON.parse(JSON.stringify(h.g)), cb2: Combat = g2.combat; if (!cb2) return [];
  const out: string[] = [], was = bindGame(g2), r = { state: rng.state };
  try {
    for (const f of cb2.units.filter((v) => v.side === 'foe' && alive(v) && sideSees(cb2, 'pc', v))) {
      const from = f.pos, at = cb2.log.length; cb2.turn = cb2.order.indexOf(f.id); if (cb2.turn < 0) continue;
      f.ap = 6; cb2.over = null as any;
      try { enemyTurn(cb2, r); } catch { continue; }
      const hits = cb2.log.slice(at).filter((l) => l.startsWith(f.name + ' fires at') || l.startsWith(f.name + ' strikes') || l.startsWith(f.name + ' takes an aimed shot at'))
        .map((l) => l.replace(f.name + ' ', '').split(':')[0].replace(/^(fires at|strikes|takes an aimed shot at) /, ''));
      out.push(f.name + (f.pos !== from ? ' moves to ' + f.pos : ' holds') + (hits.length ? ' and goes for ' + [...new Set(hits)].join(', ') : ''));
    }
  } finally { bindGame(was); }
  return out;
}
register({
  id: 'daggerfall_veteran', claims: [1, 5],
  on: {
    cond_apply: (ctx, h) => { if (ctx.t === h.u && ctx.fam === 'heart' && (ctx.by?.tags || []).includes('military')) ctx.saveAdd += 2; },
    cond_landed: (ctx, h) => { if (ctx.t === h.u && ctx.id === 'burning') flashback(h, 'fire', rngOf(h, ctx)); },
    throw: (ctx, h) => { if (!ctx.preview && h.u && EXPLOSIVE_THROWS.has(ctx.item) && dist(ctx.tile, h.u.pos) <= 3) flashback(h, 'shelling', rngOf(h, ctx)); },
    object_destroyed: (ctx, h) => { const o = ctx.obj; if (h.u && o && /barrel|explosive|fuel|gas/.test(o.kind || '') && dist(o.pos, h.u.pos) <= 3) flashback(h, 'an explosion', rngOf(h)); },
    on_damaged: (ctx, h) => { if (h.u && (ctx.src?.explosive || ctx.src?.type === 'explosion') && dist(ctx.t.pos, h.u.pos) <= 3) flashback(h, 'shelling', rngOf(h)); },
    check_result: (ctx, h) => {
      if (ctx.c !== h.c || ctx.roll?.ok || !(ctx.ck.tags || []).includes('flashback') || !h.g || !h.c) return;
      (h.g.story.ended ||= {})[h.c.id] = true;
      postStory(h, 'is back at Daggerfall: loses the rest of this round.');
    },
  },
  actions: [
    {
      id: 'shake_it_off', label: 'Shake It Off', scope: ['combat'], target: 'none', ap: 0, uses: { per: 'per_combat', n: 1 },
      text: 'Free, once per combat: remove one Heart debuff from yourself.',
      available: (h) => (inFight(h) && heartCondsOn(h.u!).length ? true : 'No Heart debuff on you.'),
      run: (h, a) => { const l = heartCondsOn(h.u!), id = a.choice && l.includes(a.choice) ? a.choice : l[0]; endCond(h.u!, id, h.cb!); say(h.cb, h.u!.name + ' has seen worse: shakes off ' + id + ' (Daggerfall Veteran).'); },
    },
    {
      id: 'shake_it_off_story', label: 'Shake It Off', scope: ['story', 'world'], target: 'none', ap: 0, uses: { per: 'per_scene', n: 1 },
      text: 'Once a scene: shake off a Heart condition (Shaken…).',
      available: (h) => (storyHeart(h).length ? true : 'No Heart condition on you.'),
      run: (h) => { const id = storyHeart(h)[0]; setStoryCond(h.g, h.c!, id, 'scene', true); postStory(h, 'has seen worse: shakes off ' + id + '.'); },
    },
    {
      id: 'seen_it_before', label: 'Seen It Before', scope: ['combat', 'story'], target: 'none', ap: 0, uses: { per: 'per_session', n: 1 },
      text: 'Once per session: how will the enemy move next? In a fight the engine shows each visible enemy\'s next move; in the story the Narrator answers truthfully.',
      run: (h, a, rng) => {
        if (inFight(h)) { const l = foresee(h, rng); say(h.cb, h.u!.name + ' has seen it before: ' + (l.length ? l.join('; ') : 'no enemy in sight to read') + '.'); return; }
        const eid = postStory(h, 'asks how the enemy force will move next.' + (a.text ? ' "' + a.text.slice(0, 120) + '"' : ''), { private: true });
        if (h.g && h.c) pendRuling(h.g, h.c, h.key, 'Seen It Before: tell ' + h.c.name + ' truthfully how the enemy force will move next (a private perkLine).', eid || undefined);
      },
    },
  ],
  brief: () => 'Narrator: Seen It Before answers truthfully; tag flashback checks (Crawler child, shelling) Composure TN 12',
});

// ---------- Chain Smoker ----------
// Light Up (2 AP; free out of a fight's AP in the story): +2 Composure for the scene (Heart saves in a fight, Composure
// checks and Heart saves in the story) and remove one Heart debuff. Unlimited: no cigarette count (plan 6, Chain
// Smoker 2; the Narrator plays the last cigarette). Hacking Cough: −1 Athletics (generic). Enemies smell you coming:
// +2 to their spotting against you in a fight, +2 tiles of NPC notice range in the story.
const lit = (h: Holder) => ro(h.c).lit_scene === sceneN(h) && h.g != null;
register({
  id: 'chain_smoker', claims: [0, 3],
  actions: [{
    id: 'light_up', label: 'Light Up', scope: ['combat', 'world', 'story'], target: 'none', ap: (h) => (h.cb ? 2 : 0),
    text: '+2 Composure for the scene and remove one Heart debuff.',
    run: (h) => {
      cst(h.c).lit_scene = sceneN(h);
      if (inFight(h)) {
        const l = heartCondsOn(h.u!); if (l[0]) endCond(h.u!, l[0], h.cb!);
        say(h.cb, h.u!.name + ' lights up (Chain Smoker): +2 Composure this scene' + (l[0] ? ' · ' + l[0] + ' gone' : '') + '.'); return;
      }
      const l = storyHeart(h); if (l[0]) setStoryCond(h.g, h.c!, l[0], 'scene', true);
      postStory(h, 'lights up: +2 Composure this scene' + (l[0] ? '; ' + l[0] + ' gone' : '') + '.');
    },
  }],
  on: {
    cond_apply: (ctx, h) => { if (ctx.t === h.u && ctx.fam === 'heart' && lit(h)) ctx.saveAdd += 2; },
    check_mod: (ctx, h) => { if (ctx.c === h.c && lit(h) && composureCk(ctx.ck)) ctx.add.push({ add: 2, label: 'Light Up' }); },
    spot: (ctx, h) => { if (ctx.u === h.u) ctx.mod += 2; },
    notice: (ctx, h) => { if (ctx.c === h.c) ctx.range += 2; },
    // In the fog: enemies see you 2 tiles farther than their Vision (the sight hook), line of sight still needed.
    sees: (ctx, h) => {
      const u = h.u, cb: Combat = ctx.cb; if (!u || ctx.t !== u || ctx.side === u.side || ctx.seen) return;
      if (cb.units.some((v) => v.side === ctx.side && alive(v) && (!ctx.by || ctx.by === v) && dist(v.pos, u.pos) <= (litAt(cb, u.pos) || v.darkSight ? (v.vision || 12) : Math.floor((v.vision || 12) / 2)) + 2 && lineOfSight(cb, v.pos, u.pos))) ctx.seen = !u.hidden;
    },
  },
  brief: () => null,
});

// ---------- Trench Poet ----------
// Verse, once per scene (a fight is the scene): answer in metaphor at one listener within hearing (8 tiles, no sight).
// The spec's debuff rule instead of an opposed roll NPCs can't make: the listener's Heart save against 12 + your Heart
// debuff strength (Implication), Confused on a fail (Confused is Brain in the spec; landed through the Heart save here
// as the trait says; plan 6, Trench Poet 2; PROVISIONAL). 1 AP in a fight (PROVISIONAL). Allies who hear you get +1
// Composure for the scene (Heart saves in a fight). Nothing Straight: the Narrator calls the Eloquence check.
const verse = (h: Holder) => { const v = ro(h.c).verse; return v && v.scene === sceneN(h) ? (v.allies as string[]) : []; };
register({
  id: 'trench_poet', claims: [0, 1], narrator: [2],
  actions: [
    {
      id: 'verse', label: 'Verse', scope: ['combat'], target: 'enemy', ap: 1, range: HEARING, uses: { per: 'per_scene', n: 1 },
      text: 'Answer in metaphor: the listener saves (Heart) or is Confused; allies in earshot get +1 Composure this scene.',
      preview: (h, a) => { const t = h.cb?.units.find((x) => x.id === a.targetId); if (!t || !h.u) return {}; return { lines: ['Heart save ' + sgn(unitSave(t, 'heart')) + ' vs ' + (12 + unitDebuff(h.u, 'heart')) + ' or Confused.'] }; },
      run: (h, a, rng) => {
        const cb = h.cb!, u = h.u!, t = cb.units.find((x) => x.id === a.targetId)!;
        const allies = cb.units.filter((v) => v.side === u.side && v !== u && !v.dead && v.charId && dist(v.pos, u.pos) <= HEARING).map((v) => v.charId!);
        cst(h.c).verse = { scene: sceneN(h), allies };
        say(cb, u.name + ' answers in verse' + (a.text ? ': "' + a.text.slice(0, 160) + '"' : '') + applyCond(cb, rng, u, t, 'confused', undefined, 'heart') + (allies.length ? ' · allies +1 Composure this scene' : '') + '.');
      },
    },
    {
      id: 'verse_story', label: 'Verse', scope: ['story'], target: 'text', ap: 0, uses: { per: 'per_scene', n: 1 },
      text: 'Answer in metaphor (type it): the listener resists or is Confused; allies here get +1 Composure this scene.',
      available: (h) => (uses(h).left('per_scene', 1, h.key + '#verse') > 0 ? true : 'Once a scene.'),
      run: (h, a, rng) => {
        uses(h).take('per_scene', 1, h.key + '#verse');
        const g = h.g, c = h.c!, who = a.npc || '', n = who ? npcsOf(g).find((x) => nameMatch(x.name, who) || x.id === who) : null;
        const r = d20(rng), m = TIER_SAVE[n?.tier || 'minion'] ?? 0, tn = 12 + Math.max(0, mod(c.skills.implication || 0)), held = r === 20 || (r !== 1 && r + m >= tn);
        const allies = Object.values<Character>(g.characters).filter((x) => x !== c && !x.dead).map((x) => x.id);
        cst(c).verse = { scene: sceneN(h), allies };
        if (!held && who) { const k = n ? n.id : who.toLowerCase().slice(0, 40); const l = ((g.story.scene.npcConds ||= {})[k] ||= []); if (!l.includes('confused')) l.push('confused'); }
        const eid = postStory(h, '"' + String(a.text || '').slice(0, 200) + '" (Verse' + (who ? ' at ' + who : '') + ': Heart save d20 ' + r + ' ' + sgn(m) + ' vs ' + tn + (held ? ', they follow it' : ', Confused') + '; allies +1 Composure this scene)');
        if (!held && g) pendRuling(g, c, h.key, 'Verse: ' + (who || 'the listener') + ' is Confused this scene: play it.', eid || undefined);
      },
    },
  ],
  on: {
    cond_apply: (ctx, h) => { const t: Unit = ctx.t; if (t?.charId && ctx.fam === 'heart' && verse(h).includes(t.charId) && !ctx._verse) { ctx._verse = true; ctx.saveAdd += 1; } },
    check_mod: (ctx, h) => { if (ctx.c && verse(h).includes(ctx.c.id) && composureCk(ctx.ck) && !ctx.add.some((m: any) => m.label === 'Verse')) ctx.add.push({ add: 1, label: 'Verse' }); },
  },
  brief: () => 'Narrator: Nothing Straight (a plain answer takes an Eloquence check; fail: metaphor)',
});

// ---------- Grudge Bearer ----------
// Spite: debuffs you inflict last 1 round more (never Stunned or Dazed), and the first one each fight skips the save
// (never on a Boss, never Stunned; plan 6, Grudge Bearer 1: GAMEBREAKING fix; PROVISIONAL). Never Forgive: while the
// Narrator's mark is open (traitState grudge: a name or id; null when you're even), −2 on every roll that doesn't
// target the mark: attacks on anyone else, your saves, story checks not aimed at them (check target, or tag
// targets_mark). The grudge lapses only when the Narrator clears it; it must give a path to get even (PROVISIONAL).
const grudge = (c: Character | null | undefined) => { const v = ro(c).grudge; return v == null || v === false || v === '' ? null : v; };
const NO_EXTRA = new Set(['stunned', 'dazed']);
register({
  id: 'grudge_bearer', claims: [0, 1, 3],
  on: {
    cond_apply: (ctx, h) => {
      const u = h.u; if (!u) return;
      if (ctx.by === u && ctx.t && ctx.t.side !== u.side && ctx.fam && !isBoon(ctx.id) && !['bleeding', 'injured', 'hidden', 'prone'].includes(ctx.id)) {
        if (!NO_EXTRA.has(ctx.id)) ctx.rounds = (ctx.rounds || 1) + 1;
        if (!ctx.skipSave && ctx.t.tier !== 'boss' && ctx.id !== 'stunned' && uses(h).take('per_combat', 1, h.key + '#spite')) { ctx.skipSave = true; say(h.cb, 'Spite: ' + ctx.t.name + ' gets no save (Grudge Bearer).'); }
      }
      if (ctx.t === u && grudge(h.c) && !(ctx.by && matches(ctx.by, grudge(h.c)))) ctx.saveAdd -= 2;
    },
    attack_preview: (ctx, h) => { const m = grudge(h.c); if (ctx.att === h.u && m && !matches(ctx.tgt, m)) ctx.terms.push({ v: -2, label: 'Never Forgive' }); },
    check_mod: (ctx, h) => {
      const m = grudge(h.c); if (ctx.c !== h.c || !m) return;
      if ((ctx.tags || []).includes('targets_mark') || listHas(m, ctx.ck.target)) return;
      ctx.add.push({ add: -2, label: 'Never Forgive' });
    },
  },
  brief: (h) => (grudge(h.c) ? 'grudge open vs ' + String(grudge(h.c)?.name ?? grudge(h.c)).slice(0, 40) + ': tag checks at them targets_mark; traitState grudge:null when even' : 'Narrator marks whoever wrongs them (traitState grudge)'),
});

// ---------- Pacifist ----------
// Sanctuary: until you attack in this fight, enemies get −2 to hit you. Nonlethal (a toggle, on by default): a blow of
// yours that takes a foe's last HP subdues it (no kill, no mana rise, a prisoner). Enemies you subdued: +3 to talk to
// them (the check's target, or tag talk_with_enemy_defeated_nonlethally). Mercy (Karma awards whose reason says mercy
// or spared) earns double. The Vow: if you kill, lose all your Echo and take Shaken for the rest of the session.
const attacked = (h: Holder) => !!(h.u?.ps?.[h.key] as any)?.attacked;
const markAttacked = (h: Holder) => { if (!attacked(h)) { stateOf(h).attacked = true; } };
register({
  id: 'pacifist', claims: 'all',
  toggles: [{ id: 'nonlethal', label: 'Nonlethal', on: ['combat/attack'], defaultOn: true, preview: () => 'A foe this drops is subdued, not killed' }],
  on: {
    attack_target: (ctx, h) => { if (ctx.att === h.u && ctx.tgt?.side !== h.u!.side) markAttacked(h); },
    on_damaged: (ctx, h) => { if (ctx.src?.by === h.u && ctx.t.side !== h.u!.side) markAttacked(h); },
    forced_move: (ctx, h) => { if (ctx.by === h.u && ctx.u?.side !== h.u!.side) markAttacked(h); },
    outburst_begin: (ctx, h) => { if (ctx.u === h.u) markAttacked(h); },
    attack_preview: (ctx, h) => { if (ctx.tgt === h.u && ctx.att.side !== h.u!.side && !attacked(h)) ctx.terms.push({ v: -2, label: 'Sanctuary' }); },
    damage_in: (ctx, h) => { if (ctx.phase === 'would_drop_to_0' && ctx.src?.by === h.u && ctx.t.side !== h.u!.side && !ctx.t.companion && modOn(h, 'nonlethal')) ctx.src.nonlethal = true; },
    on_surrender: (ctx, h) => {
      if (!ctx.t?.subdued || (ctx.by !== h.u && ctx.t.lastHitBy !== h.u?.id)) return;
      const l: string[] = (cst(h.c).subdued ||= []); for (const n of [ctx.t.name, ctx.t.npcId]) if (n && !l.includes(n)) l.push(n);
    },
    on_kill: (ctx, h) => {
      if (ctx.by !== h.u || !h.c) return;
      h.c.echo = 0;
      if (h.g) setStoryCond(h.g, h.c, 'shaken', 'session', false, 'pacifist');
      const r = applyCond(h.cb!, rngOf(h) || { state: 1 }, null, h.u!, 'shaken', 99, 'heart', { skipSave: true });
      say(h.cb, h.u!.name + ' broke the Vow (Pacifist): all Echo gone' + r + ' for the rest of the session.');
      note(h, h.u!.name + ' killed ' + ctx.victim.name + ' and broke their vow.');
    },
    combat_start: (ctx, h) => carryStoryCond(h, ctx, 'shaken'),
    check_mod: (ctx, h) => {
      if (ctx.c !== h.c) return;
      if ((ctx.tags || []).includes('talk_with_enemy_defeated_nonlethally') || listHas(ro(h.c).subdued, ctx.ck.target)) ctx.add.push({ add: 3, label: 'Pacifist (they were spared)' });
    },
    karma_award: (ctx, h) => { if (ctx.c === h.c && ctx.amount > 0 && /merc|spare|spared|subdu/i.test(ctx.why || '')) ctx.mult = (ctx.mult || 1) * 2; },
  },
  brief: () => 'Karma awards for mercy: give why "mercy" (doubled by the engine)',
});

// ---------- Humanity First ----------
// For Humanity: +15% damage against non-humans (robots, machines, Crawlers, Orks, upper-realm beings, beasts, drones;
// a Factory Made squadmate too) in the target bucket, and +2 on saves against Fear from one. Xenophobe: Empathy,
// Charisma and Camaraderie checks tagged non_human (or vs_non_human) fail outright; heals from a non-human work at half
// power, and AP they hand over is refused (the 'ap_gift' hook). A Crawler counts as non-human for this trait (plan 6,
// Humanity First 4).
const nonHuman = (u: Unit | null | undefined) => !!u && (!!u.companion || (!!u.kind && u.kind !== 'human') || has(u, 'factory_made'));
const XENO = ['empathy', 'charisma', 'camaraderie'];
register({
  id: 'humanity_first', claims: [0, 1, 2, 3, 4, 5, 6],
  on: {
    damage_out: (ctx, h) => { if (ctx.att === h.u && nonHuman(ctx.tgt)) ctx.vs.push({ v: 0.15, label: 'For Humanity' }); },
    cond_apply: (ctx, h) => { if (ctx.t === h.u && ctx.id === 'fear' && nonHuman(ctx.by)) ctx.saveAdd += 2; },
    ap_gift: (ctx, h) => { if (ctx.t === h.u && nonHuman(ctx.from)) { ctx.cancel = true; ctx.why = 'Humanity First'; } },
    heal_in: (ctx, h) => { if (ctx.t === h.u && ctx.by && ctx.by !== h.u && nonHuman(ctx.by)) { ctx.n = ctx.n * 0.5; say(h.cb, h.u!.name + ' flinches from ' + ctx.by.name + '\'s help (Humanity First): half the healing.'); } },
    check_post: (ctx, h) => {
      const tags: string[] = ctx.ck.tags || [];
      if (ctx.c !== h.c || !(tags.includes('non_human') || tags.includes('vs_non_human')) || !ctx.ck.skills.some((s: string) => XENO.includes(s))) return;
      ctx.auto = 'fail'; ctx.labels.push('Xenophobe: they won\'t');
    },
  },
  brief: () => 'Narrator: tag social checks with non-humans non_human',
});

// ---------- The Old Blood ----------
// Bloodline and Prejudice skill mods run generically on tagged checks (vs_same_race_and_homeworld, vs_other_race).
// Heals from someone of another race (their character's race; a non-PC healer's kind) work at half power. Blessings
// from them work at half power (blessing_in's power, read back by tactics.ts).
// Trade prices with other races (+20% buy, −20% sell) are the Narrator's: there is no shop.
const raceOf = (u: Unit | null | undefined) => { if (!u) return null; const c = charOfUnit(u); return c ? c.race || 'human' : u.kind || 'human'; };
register({
  id: 'the_old_blood', claims: [7], narrator: [8, 9],
  on: {
    heal_in: (ctx, h) => {
      if (ctx.t !== h.u || !ctx.by || ctx.by === h.u || ctx.kind === 'blessing' || raceOf(ctx.by) === (h.c?.race || 'human')) return; // a Blessing: halved at its power
      ctx.n = ctx.n * 0.5; say(h.cb, h.u!.name + ' takes ' + ctx.by.name + '\'s help badly (The Old Blood): half the healing.');
    },
    blessing_in: (ctx, h) => {
      if (ctx.t !== h.u || !ctx.u || ctx.u === h.u || raceOf(ctx.u) === (h.c?.race || 'human')) return;
      ctx.power = (ctx.power ?? 1) * 0.5; say(h.cb, h.u!.name + ' takes ' + ctx.u.name + '\'s Blessing badly (The Old Blood): half power.');
    },
  },
  brief: () => 'Narrator: tag checks vs_same_race_and_homeworld / vs_other_race; trade +20% buy, −20% sell with other races',
});

// ---------- Moon Hunter ----------
// Tracker: follow any trail under a day old (the Narrator says where it leads, no roll: the Track action asks). Your
// first attack on a creature you tracked this scene does +30% (the target bucket); a miss uses it too (plan 6, Moon
// Hunter 2). "Creature": anyone you tracked (PROVISIONAL). Tracked: the Track action, or traitState tracked (a name or
// list). It clears when the scene changes. Wild Born: −2 Charisma, Eloquence, Authority in cities (generic, zone tag
// in_city).
const tracked = (h: Holder) => { const s = ro(h.c); return s.tracked && (s.tracked_scene == null || s.tracked_scene === sceneN(h)) ? s.tracked : null; };
const huntUsed = (h: Holder): string[] => { const s = ro(h.c).moon_used; return s && s.scene === sceneN(h) ? s.ids : []; };
function huntSpend(h: Holder, t: Unit) { const s = cst(h.c); if (!s.moon_used || s.moon_used.scene !== sceneN(h)) s.moon_used = { scene: sceneN(h), ids: [] }; if (!s.moon_used.ids.includes(t.id)) s.moon_used.ids.push(t.id); }
const huntOn = (h: Holder, t: Unit) => !!tracked(h) && matches(t, tracked(h)) && !huntUsed(h).includes(t.id);
register({
  id: 'moon_hunter', claims: [1], narrator: [0],
  on: {
    // Spells have no on_hit/on_miss: their damage_out (never a preview) spends it on the spot.
    damage_out: (ctx, h) => { if (ctx.att === h.u && huntOn(h, ctx.tgt)) { ctx.vs.push({ v: 0.3, label: 'Tracker' }); if (ctx.spell && !ctx.preview) huntSpend(h, ctx.tgt); } },
    on_hit: (ctx, h) => { if (ctx.att === h.u && huntOn(h, ctx.tgt)) huntSpend(h, ctx.tgt); },
    on_miss: (ctx, h) => { if (ctx.att === h.u && huntOn(h, ctx.tgt)) huntSpend(h, ctx.tgt); },
    scene_change: (ctx, h) => { const s = ro(h.c); if (s.tracked_scene != null && s.tracked_scene !== ctx.n && h.c?.state) { delete h.c.state.tracked; delete h.c.state.tracked_scene; } },
  },
  actions: [{
    id: 'track', label: 'Track', scope: ['story', 'world'], target: 'text', ap: 0,
    text: 'Follow a trail less than a day old (type whose): the Narrator says where it leads, no roll.',
    run: (h, a) => {
      const who = (a.npc || String(a.text || '')).trim().slice(0, 60), s = cst(h.c);
      const l: string[] = Array.isArray(s.tracked) && s.tracked_scene === sceneN(h) ? s.tracked : []; if (!l.includes(who)) l.push(who);
      s.tracked = l; s.tracked_scene = sceneN(h);
      const eid = postStory(h, 'picks up the trail of ' + who + '.');
      if (h.g && h.c) pendRuling(h.g, h.c, h.key, 'Tracker: if the trail of ' + who + ' is less than a day old, say where it leads (no roll). Refuse if there is no trail (traitState tracked:null).', eid || undefined);
    },
  }],
  brief: () => 'Narrator: where trails lead; zone in_city for Wild Born',
});

// ---------- Rabbit's Foot ----------
// Lucky Foot, once per session: the first enemy attack roll against you that would hit is rerolled (armed at the start
// of each fight while the use is left; stand it down with the action). The engine can't pause an enemy turn to ask, so
// the arm-then-auto rule (plan 6, Rabbit's Foot 1; PROVISIONAL). Only opposing rolls count, not your saves. In the story:
// ask the Narrator to reroll an NPC's roll against you. Vengeful: when an ally is Downed, +2 AP on your next turn (once).
// Prey: −1 Guts, Intimidation and Authority (generic); hunters and Orks deal +25% to you; Take the Hit and taunts can't
// pull their attacks off you (attack_target's locked; previewAttack's ignoreTaunt).
const preyBy = (u: Unit | null | undefined) => !!u && (u.kind === 'ork' || (u.tags || []).includes('hunter'));
const LUCKY = (h: Holder) => h.key + '#lucky_foot';
const luckyLeft = (h: Holder) => uses(h).left('per_session', 1, LUCKY(h)) > 0;
register({
  id: 'rabbits_foot', claims: [0, 1, 5, 6],
  actions: [
    {
      id: 'lucky_foot', label: 'Lucky Foot', scope: ['combat'], target: 'none', ap: 0, uses: { per: 'per_session', n: 1 }, arm: true,
      text: 'Armed: the first enemy attack that would hit you is rerolled (once per session). Click to stand it down or arm it again.',
      run: () => null,
    },
    {
      id: 'lucky_foot_story', label: 'Lucky Foot', scope: ['story'], target: 'text', ap: 0,
      text: 'Once per session: make the Narrator reroll an NPC\'s roll against you (type which).',
      available: (h) => (luckyLeft(h) ? true : 'Used this session.'),
      run: (h, a) => {
        uses(h).take('per_session', 1, LUCKY(h));
        const eid = postStory(h, 'touches the rabbit\'s foot.' + (a.text ? ' "' + a.text.slice(0, 120) + '"' : ''));
        if (h.g && h.c) pendRuling(h.g, h.c, h.key, 'Lucky Foot: reroll the NPC\'s roll against ' + h.c.name + (a.text ? ' (' + a.text.slice(0, 80) + ')' : '') + ' and keep the new result.', eid || undefined);
      },
    },
  ],
  on: {
    combat_start: (ctx, h) => { if (h.u && luckyLeft(h)) (h.u.armed ||= {})[h.key] = { choice: true, round: 0 }; },
    attack_roll: (ctx, h) => {
      if (ctx.tgt !== h.u || ctx.att.side === h.u!.side || !armedOf(h) || !luckyLeft(h)) return;
      const hit = ctx.hit ?? (ctx.die !== 1 && (ctx.die >= ctx.critMin || ctx.die + ctx.toHit >= ctx.need)); if (!hit) return;
      uses(h).take('per_session', 1, LUCKY(h)); disarm(h);
      const was = ctx.die; ctx.die = d20(ctx.rng || rngOf(h) || { state: 1 }); delete ctx.hit;
      say(h.cb, 'Lucky Foot: ' + ctx.att.name + '\'s ' + was + ' against ' + h.u!.name + ' is rerolled: ' + ctx.die + '.');
    },
    on_downed: (ctx, h) => { const v: Unit = ctx.victim; if (h.u && v !== h.u && v.side === h.u.side && !v.companion && v.downed && up(h.u)) stateOf(h).venge = true; },
    turn_start_pre: (ctx, h) => { if (ctx.u === h.u && stateOf(h).venge) { stateOf(h).venge = false; pushAp(ctx, 2, 'Vengeful'); } },
    damage_in: (ctx, h) => {
      const by: Unit | null = ctx.src?.by; if (ctx.phase !== 'reduce' || ctx.t !== h.u || !by) return;
      if (by.kind === 'ork' || (by.tags || []).includes('hunter')) ctx.dmg = ctx.dmg * 1.25;
    },
    // Prey: a hunter's or an Ork's attack on you stays on you: a taunt doesn't stop it, Take the Hit doesn't take it.
    attack_preview: (ctx, h) => { if (ctx.tgt === h.u && preyBy(ctx.att)) ctx.ignoreTaunt = true; },
    attack_target: (ctx, h) => { if (ctx.orig === h.u && preyBy(ctx.att) && alive(h.u!)) ctx.locked = h.u; },
  },
  brief: () => 'Narrator: tag hunters (tag hunter) and Orks (kind ork) so their attacks stay on them',
});

// ---------- Drone Handler and Beast Handler (companions) ----------
// The companion is put on the character at session start (c.companions; data stat block in enemies.json companions,
// spec 14 item 96). It acts right after its owner on its own AP: the drone 3, the beast 4 (the trait text). The drone
// scouts (its sight is the squad's) and carries 5 kg (+5 kg carry while it stands). Proficiency repairs it: Repair
// drone, 2 AP, adjacent, one spare-parts charge, 10 HP × your Proficiency Mastery level (at least 1; PROVISIONAL);
// out of a fight one spare part brings it to full. Tethered: if it's destroyed you're Shaken (story: until you rebuild
// it) until you Rebuild it after a rest, with a drone frame or 3 spare parts (PROVISIONAL). The beast obeys your
// Empathy: each of its turns is an order, d20 + Empathy vs 8 (PROVISIONAL); on a fail it acts on instinct (bites an
// adjacent enemy, else holds) and its turn is spent. Every bite carries a grapple (PROVISIONAL: the target's Body
// save or Grappled). Bond: if it dies you're Shaken for the rest of the arc. A long rest heals a living beast.
function ensureCompanion(c: Character | null | undefined, kind: 'drone' | 'beast') {
  if (!c || (c.companions || []).some((x) => x.kind === kind)) return;
  const k = COMPANION_KINDS[kind]; if (!k) return;
  c.companions = [...(c.companions || []), { id: kind, kind, name: kind === 'drone' ? 'Drone' : 'Beast', hp: k.hp }];
}
const compOf = (c: Character | null | undefined, kind: string) => (c?.companions || []).find((x) => x.kind === kind) || null;
const myComp = (h: Holder, u: Unit | null | undefined, kind: string) => !!u && u.companion === kind && !!h.c && u.ctrl === h.c.id;
const masteryLevel = (pts: number) => (pts >= 9 ? 4 : pts >= 7 ? 3 : pts >= 5 ? 2 : pts >= 3 ? 1 : 0);
function lost(h: Holder, ctx: any, kind: 'drone' | 'beast') {
  const c = h.c; if (!c || !h.g) return;
  setStoryCond(h.g, c, 'shaken', 'arc', false, kind === 'drone' ? 'drone_handler' : 'beast_handler');
  cst(c)[kind + '_lost_rest'] = restN(h.g);
  const comp = compOf(c, kind); if (comp) comp.hp = 0;
  const r = up(h.u) ? applyCond(h.cb!, rngOf(h, ctx) || { state: 1 }, null, h.u!, 'shaken', 99, 'heart', { skipSave: true }) : '';
  say(h.cb, (kind === 'drone' ? 'The drone is gone. ' : 'The beast is dead. ') + (h.u?.name || c.name) + ' feels it' + r + '.');
  note(h, (kind === 'drone' ? c.name + '\'s drone was destroyed: Shaken until rebuilt.' : c.name + '\'s beast died: Shaken for the rest of the arc.'));
}
register({
  id: 'drone_handler', claims: [0, 2], narrator: [1],
  stat: (h, stat) => (stat === 'carry' && (compOf(h.c, 'drone')?.hp ?? 0) > 0 ? 5 : 0),
  on: {
    session_start: (ctx, h) => ensureCompanion(h.c, 'drone'),
    scene_change: (ctx, h) => ensureCompanion(h.c, 'drone'),
    turn_start_pre: (ctx, h) => { if (myComp(h, ctx.u, 'drone')) pushAp(ctx, -3, 'a drone: 3 AP'); },
    on_downed: (ctx, h) => { if (myComp(h, ctx.victim, 'drone') && ctx.victim.dead) lost(h, ctx, 'drone'); },
    combat_start: (ctx, h) => carryStoryCond(h, ctx, 'shaken'),
  },
  actions: [
    {
      id: 'repair_drone', label: 'Repair drone', scope: ['combat'], target: 'ally', ap: 2, range: 1,
      text: 'Adjacent: one spare-parts charge, 10 HP × your Proficiency Mastery level.',
      available: (h) => (inFight(h) && h.cb!.units.some((v) => myComp(h, v, 'drone') && !v.dead) ? true : false),
      preview: (h, a) => {
        const t = h.cb?.units.find((x) => x.id === a.targetId); if (!t) return {};
        if (!myComp(h, t, 'drone')) return { ok: false, why: 'Pick your drone.' };
        if (!(h.u!.parts || 0)) return { ok: false, why: 'No spare-parts charges.' };
        if (t.hp >= t.maxHp) return { ok: false, why: 'Not a scratch on it.' };
        return { lines: ['+' + 10 * Math.max(1, masteryLevel(h.c?.skills.proficiency || 0)) + ' HP.'] };
      },
      run: (h, a) => {
        const t = h.cb!.units.find((x) => x.id === a.targetId)!, n = 10 * Math.max(1, masteryLevel(h.c?.skills.proficiency || 0)), was = t.hp;
        h.u!.parts = (h.u!.parts || 0) - 1; t.hp = Math.min(t.maxHp, t.hp + n);
        emitFx(h.cb!, 'repair', { unit: t.id, at: t.pos, dur: 1400 });
        say(h.cb, h.u!.name + ' patches the drone: +' + (t.hp - was) + ' HP (' + t.hp + '/' + t.maxHp + ').');
      },
    },
    {
      id: 'rebuild_drone', label: 'Rebuild drone', scope: ['story', 'world'], target: 'none', ap: 0,
      text: 'Out of a fight: repair the drone with one spare part, or rebuild a destroyed one after a rest with a drone frame or 3 spare parts.',
      available: (h) => {
        const d = compOf(h.c, 'drone'); if (!d || !h.c) return false;
        const max = COMPANION_KINDS.drone?.hp ?? 40;
        if ((d.hp ?? max) >= max) return 'The drone is fine.';
        if ((d.hp ?? 0) > 0) return partsOf(h.c) >= 1 ? true : 'Needs a spare part.';
        if (restN(h.g) <= (ro(h.c).drone_lost_rest ?? -1)) return 'Rest first.';
        return hasFrame(h.c) || partsOf(h.c) >= 3 ? true : 'Needs a drone frame or 3 spare parts.';
      },
      run: (h) => {
        const c = h.c!, d = compOf(c, 'drone')!, max = COMPANION_KINDS.drone?.hp ?? 40, rebuilt = (d.hp ?? 0) <= 0;
        if (rebuilt) { if (hasFrame(c)) takeItem(c, 'drone_frame', 1); else takeItem(c, 'spare_parts', 3); setStoryCond(h.g, c, 'shaken', 'arc', true); }
        else takeItem(c, 'spare_parts', 1);
        d.hp = max; postStory(h, rebuilt ? 'rebuilds the drone. It complains about nothing, as always.' : 'repairs the drone.');
      },
    },
  ],
  brief: () => 'Narrator: what the drone scouts beyond the map',
});
const partsOf = (c: Character) => packOf(c).filter((x) => (x.item || x.id) === 'spare_parts').reduce((t, x) => t + (x.qty || 0), 0);
const hasFrame = (c: Character) => packOf(c).some((x) => (x.item || x.id) === 'drone_frame' && (x.qty || 0) > 0);
function takeItem(c: Character, id: string, n: number) {
  const pack = packOf(c).map((x) => ({ ...x }));
  for (const it of pack) { if ((it.item || it.id) !== id || n <= 0) continue; const k = Math.min(n, it.qty); it.qty -= k; n -= k; }
  c.pack = pack.filter((x) => x.qty > 0 || x.mags);
}

register({
  id: 'beast_handler', claims: [0, 1, 2], narrator: [3],
  on: {
    session_start: (ctx, h) => ensureCompanion(h.c, 'beast'),
    scene_change: (ctx, h) => ensureCompanion(h.c, 'beast'),
    turn_start_pre: (ctx, h) => { if (myComp(h, ctx.u, 'beast')) pushAp(ctx, -2, 'a beast: 4 AP'); },
    turn_start: (ctx, h) => {
      const b: Unit = ctx.u, cb = h.cb!; if (!myComp(h, b, 'beast') || !up(b) || !h.c) return;
      const rng = ctx.rng || rngOf(h) || { state: 1 }, r = d20(rng), m = mod(h.c.skills.empathy || 0) + (h.u?.sk?.empathy || 0), ok = !up(h.u) ? false : r === 20 || (r !== 1 && r + m >= 8);
      let line = h.c.name + ' calls the beast: Empathy d20 ' + r + ' ' + sgn(m) + ' vs 8';
      if (ok) { say(cb, line + ' · it obeys.'); return; }
      const foe = cb.units.find((v) => v.side !== b.side && up(v) && dist(v.pos, b.pos) <= 1 && previewAttack(cb, b, v, 'melee').ok);
      say(cb, line + ' · it acts on instinct' + (foe ? ' and goes for ' + foe.name : ' and holds') + '.');
      if (foe) resolveAttack(cb, rng, b, foe, 'melee', null);
      b.ap = 0;
    },
    on_hit: (ctx, h) => {
      if (!myComp(h, ctx.att, 'beast') || !ctx.melee || ctx.tgt.dead || ctx.tgt.surrendered) return;
      // Every bite carries the grapple (PROVISIONAL, spec 14): the beast's turns have no attack-mod chip to pick (its
      // instinct bite runs inside the owner's end-turn; the client has no companion orders), so a toggle never reached it.
      if (ctx.tgt.side === ctx.att.side || condOn(ctx.tgt, 'grappled')) return;
      say(h.cb, 'The beast clamps on' + applyCond(h.cb!, ctx.rng || rngOf(h) || { state: 1 }, ctx.att, ctx.tgt, 'grappled', undefined, 'body') + '.');
    },
    on_downed: (ctx, h) => { if (myComp(h, ctx.victim, 'beast') && ctx.victim.dead) lost(h, ctx, 'beast'); },
    combat_start: (ctx, h) => carryStoryCond(h, ctx, 'shaken'),
    rest: (ctx, h) => { const b = compOf(h.c, 'beast'); if (ctx.kind === 'long' && b && (b.hp ?? 1) > 0) b.hp = COMPANION_KINDS.beast?.hp ?? b.hp; },
  },
  brief: () => 'Narrator: buildings it can\'t enter (most of Central City); story commands are Empathy checks you call',
});

