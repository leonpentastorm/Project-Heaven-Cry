// Lane G: story perks and dialogue traits. Perks: Bedside Manner, Footnote, Burden of Proof, Detective's Eye, Crowd
// Pleaser, Double Meaning, Old Tongue, Real Power, Established Fact, Closing Argument, Everyone's Friend, Their Own
// Idea, Foreseen, Cultured, Cold Read, What Could Be, Every Lie Is a Door. Traits: Gambler, Crowded Head, Cover Story,
// Cold Case, Interrogator, Holo-Drama Addict, Born Performer.
//
// The engine owns the numbers (check bonuses, auto-successes, the voice cap, uses per scene and session, the combat
// forms); the Narrator owns judgement and truth, which it gets as a pending ruling (story), a fight note (combat) or the
// brief line, and answers through perkLines (private lines), check tags/applies/footnote/double, traitState and
// perkRulings. Recommended fixes from the audit (plan section 6) are marked PROVISIONAL and listed in
// the spec (section 14, tags G…) and docs/design/perk-runtime.md. The Narrator-side texts for every other item are in ./briefs.ts.
import { register, stateOf, uses, note, pendRuling, postStory, modOn, boundGame, type Holder } from '../effects';
import { wordsGate, raiseWords } from '../fighttalk';
import type { Combat, Unit } from '../combat';
import type { Character } from '../character';
import { mod, strengthOf } from '../character';
import { alive, dist, isMelee, canJam, objectsOf, trapKnown } from '../combat';
import { isTrap } from '../objects';
import { HEARING } from '../tactics';
import { applyCond } from '../magic';
import { SKILL, WEAPON } from '../data';
import { d20 } from '../rng';
import { npcsOf, sideRollMod } from '../game';
import { foreseeVote } from '../game';
import './briefs';

// ---------- small helpers ----------
const overworld = (cb: Combat | null | undefined) => !!cb && (cb.overworld || cb.name === 'overworld');
const inFight = (h: Holder) => !!h.cb && !!h.u && !overworld(h.cb);
const tierII = (h: Holder) => h.tier === 'II';
const gOf = (h: Holder): any => h.g ?? boundGame();
const sceneN = (h: Holder) => gOf(h)?.story?.scene?.n ?? 0;
const say = (cb: Combat | null | undefined, line: string) => { if (cb) cb.log.push(line); };
const clip = (s: any, n = 120) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
/** The item's story state (engine-only; kept on g.story.ps[charId], fights included, so a scene's use reaches its fight). */
function sst(h: Holder): Record<string, any> {
  const g = gOf(h), id = h.c?.id || h.u?.charId; if (!g?.story || !id) return {};
  const ps = ((g.story.ps ||= {})[id] ||= {}); return ((ps.items ||= {})[h.key] ||= {});
}
/** Read-only story state (stat queries and previews must not write). */
function sro(h: Holder): Record<string, any> { const g = gOf(h), id = h.c?.id || h.u?.charId; return g?.story?.ps?.[id || '']?.items?.[h.key] || {}; }
/** Narrator-settable state on the character (traitState writes it; the brief's Standing line shows it). */
const cst = (c: Character | null | undefined): Record<string, any> => (c ? (c.state ||= {}) : {});
const cro = (c: Character | null | undefined): Record<string, any> => c?.state || {};
const tagsOf = (ctx: any): string[] => [...(ctx?.tags || []), ...(ctx?.ck?.tags || [])];
const appliesTo = (ck: any, id: string) => (ck?.applies || []).some((x: string) => x === id || x === 'perk:' + id || x === 'trait:' + id);
const hasSkill = (ck: any, ...s: string[]) => (ck?.skills || []).some((x: string) => s.includes(x));
const nameMatch = (a: any, b: any) => { if (a == null || b == null) return false; const x = String(a).toLowerCase().trim(), y = String(b).toLowerCase().trim(); return !!x && !!y && (x === y || (x.length >= 3 && y.length >= 3 && (x.includes(y) || y.includes(x)))); };
/** Is the check aimed at this character (by charId or name)? */
const targets = (ck: any, c: Character | null | undefined) => !!c && !!ck?.target && (ck.target === c.id || nameMatch(ck.target, c.name));
/** Push a whole-check modifier once (several holders, or a reroll, never double it). */
const addOnce = (ctx: any, add: number, label: string) => { if (!ctx.add.some((m: any) => m.label === label)) ctx.add.push({ add, label }); };
/** A pending check of this character (the one named, else the latest unrolled one that fits). */
function pendingCheck(h: Holder, checkId: string | undefined, fits: (ck: any) => boolean = () => true): any | null {
  const g = gOf(h); if (!g || !h.c) return null;
  const mine = (g.checks || []).filter((k: any) => k.charId === h.c!.id && !k.done && !k.roll);
  if (checkId) return mine.find((k: any) => k.id === checkId && fits(k)) || null;
  return mine.filter(fits).at(-1) || null;
}
/** The NPC a story use names: on the map by id or name, else just the name typed. */
function npcRef(h: Holder, a: { npc?: string; text?: string }): { name: string; npc: any | null } {
  const g = gOf(h), want = clip(a.npc || '', 60);
  const npc = want && g ? npcsOf(g).find((n: any) => n.id === want || nameMatch(n.name, want)) || null : null;
  return { name: npc ? npc.name : want, npc };
}
/** A story line from the engine (a system or check line), the way game.ts posts them. */
function entry(g: any, e: any) { if (!g?.story) return; g.story.entries.push({ id: 'e' + (++g.seq), ...e }); }
/** A ruling of this item the Narrator refused (perkRulings accepted false; 'ruling_answered', hooks gap G3): the use
 * comes back (game.ts refundRuling), so the item takes back what the use set up. */
const refused = (ctx: any, h: Holder) => !!ctx?.r && ctx.accepted === false && ctx.r.key === h.key && (!h.c || ctx.r.charId === h.c.id);
const ruling = (h: Holder, text: string, eid?: string | null) => { const g = gOf(h); if (g && h.c) pendRuling(g, h.c, h.key, text, eid || undefined); };
/** A person (not a machine) for Cold Read: humans, Crawlers, Orks, the cursed, upper-realm beings. */
const person = (t: Unit) => !['robot', 'machine', 'turret', 'drone', 'beast'].includes(t.kind || '') && !t.companion && !/drone|robot|automaton|\bbot\b|turret/i.test(t.name);
const textArg = (a: any) => clip(a.text, 300);
const needText = (a: any, what: string) => (textArg(a) ? {} : { ok: false, why: what });

// ======================================================================================================== PERKS

// ---------- Bedside Manner (Sensory 3/5): touch someone in a conversation and learn if their next statement is a lie ----------
// Story: a 'Touch' action (the NPC is typed or picked); the Narrator answers privately (perkLines) and never lies in it.
register({
  id: 'bedside_manner',
  narrator: 'all',
  actions: [{
    id: 'touch', label: 'Touch (Bedside Manner)', scope: ['story'], target: 'npc', ap: 0,
    text: 'A handshake or a hand on the shoulder: learn whether their next statement is a lie. II: you also learn whether they are afraid, and of whom.',
    preview: (h, a) => (npcRef(h, a).name || textArg(a) ? {} : { ok: false, why: 'Who do you touch? Type their name.' }),
    run: (h, a) => {
      const who = npcRef(h, a).name || clip(a.text, 60);
      const eid = postStory(h, 'touches ' + who + (a.text && a.npc ? ': ' + clip(a.text, 160) : '.'));
      ruling(h, 'Bedside Manner: ' + h.c!.name + ' touched ' + who + '. In perkLines (key perk:bedside_manner, only to them) say truthfully whether ' + who + '\'s next statement is a lie' + (tierII(h) ? ', and whether they are afraid, and of whom' : '') + '. Never lie in a perk line.', eid);
    },
  }],
  brief: (h) => 'after a Touch: privately (perkLines) whether the next line is a lie' + (tierII(h) ? '; afraid, of whom' : ''),
});

// ---------- Footnote (Rumination 3/5): once per scene cite a fact; allies who act on it get +1 (II +2) ----------
// Story: the citation is a story action (once per scene); the Narrator tags the ally checks that act on it with
// footnote: <citer's charId> (or applies ['footnote']), and the engine adds the bonus, never to the citer's own roll.
// Every tagged ally roll this scene gets it (PROVISIONAL, plan 6: the citation is once per scene, not the bonus).
// Combat (PROVISIONAL, a new combat form): once per fight, 0 AP, cite a fact about one enemy: allies' attacks on it get
// +1 (II +2) for the rest of the round; the citation goes into the fight notes.
const footBonus = (h: Holder) => (tierII(h) ? 2 : 1);
register({
  id: 'footnote',
  claims: ['skill_mod_tag'], narrator: ['narrator'],
  actions: [
    {
      id: 'cite', label: 'Cite a fact (Footnote)', scope: ['story'], target: 'text', ap: 0, uses: { per: 'per_scene', n: 1 },
      text: 'Once a scene: cite a fact. I: allies who act on it get +1 on those rolls this scene. II: they get +2.',
      run: (h, a) => {
        sst(h).cite = { scene: sceneN(h), text: textArg(a) };
        const eid = postStory(h, 'cites: "' + textArg(a) + '"');
        ruling(h, 'Footnote: ' + h.c!.name + ' cited "' + clip(a.text, 160) + '". Mark ally checks that act on it with footnote: "' + h.c!.id + '" (+' + footBonus(h) + '); refuse if the fact is false in the fiction.', eid);
      },
    },
    {
      id: 'cite_fight', label: 'Footnote', scope: ['combat'], target: 'enemy', ap: 0, uses: { per: 'per_combat', n: 1 },
      text: 'Once a fight: cite a fact about one enemy. I: your allies get +1 to hit it for the rest of the round. II: they get +2.',
      preview: (h) => ({ lines: ['Allies (not you) get +' + footBonus(h) + ' to hit it until the round ends.'] }),
      run: (h, a) => {
        const t = h.cb!.units.find((x) => x.id === a.targetId)!;
        stateOf(h).cite = { target: t.id, round: h.cb!.round };
        say(h.cb, h.u!.name + ' cites a fact about ' + t.name + (a.text ? ': "' + clip(a.text, 120) + '"' : '') + ' (Footnote: allies +' + footBonus(h) + ' to hit it this round).');
        if (a.text) note(h, 'cited about ' + t.name + ': "' + clip(a.text, 160) + '" (rule whether it is true in the fiction).');
      },
    },
  ],
  on: {
    ruling_answered: (ctx, h) => { if (refused(ctx, h)) delete sst(h).cite; },
    check_mod: (ctx, h) => {
      const rec = sro(h).cite; if (!rec || rec.scene !== sceneN(h) || !h.c || ctx.c === h.c || ctx.c?.id === h.c.id) return;
      if (ctx.ck?.footnote === h.c.id || appliesTo(ctx.ck, 'footnote') || tagsOf(ctx).includes('footnote')) addOnce(ctx, footBonus(h), 'Footnote');
    },
    attack_preview: (ctx, h) => {
      const st = (h.u?.ps?.[h.key] as any)?.cite; if (!st || !h.u || !h.cb) return;
      if (ctx.att.side === h.u.side && ctx.att !== h.u && ctx.tgt?.id === st.target && h.cb.round === st.round) ctx.terms.push({ v: footBonus(h), label: 'Footnote' });
    },
  },
  brief: (h) => 'judge ally checks acting on the cited fact: set footnote "' + (h.c?.id || 'charId') + '"',
});

// ---------- Burden of Proof (Eloquence 3/5): demand evidence; an accuser with none loses outright ----------
register({
  id: 'burden_of_proof',
  narrator: 'all',
  actions: [{
    id: 'demand', label: 'Demand evidence (Burden of Proof)', scope: ['story'], target: 'text', ap: 0,
    text: 'When someone accuses you or the squad: demand their evidence. Without it, they lose the argument outright. II: the onlookers also shift to your side.',
    run: (h, a) => {
      const eid = postStory(h, 'demands evidence: "' + textArg(a) + '"');
      ruling(h, 'Burden of Proof: if the accuser has no evidence, they lose the argument outright: call no check' + (tierII(h) ? '; every onlooker shifts one attitude step toward the squad' : '') + '. If they have evidence, refuse (the demand fails on its merits).', eid);
    },
  }],
  brief: (h) => 'a demand for evidence: an accuser without any loses outright, no check' + (tierII(h) ? '; onlookers shift' : ''),
});

// ---------- Detective's Eye (Analysis 3/5): one out-of-place detail every scene (II: two, and whether connected) ----------
// Story: owed every scene through perkLines (key perk:detectives_eye); the brief says when it is still owed.
// Combat (PROVISIONAL, a new combat form): at the start of a fight the holder sees one hidden trap or one enemy's weak
// point (as if Analyzed, without the AP); II: two, and the log says whether they're connected (same owner).
function servedThisScene(h: Holder): number {
  const g = gOf(h); if (!g?.story || !h.c) return 0;
  const es: any[] = g.story.entries || []; let i = es.length - 1; while (i >= 0 && es[i].kind !== 'scene') i--;
  return es.slice(i + 1).filter((e) => e.kind === 'voice' && e.charId === h.c!.id && /^DETECTIVE.S EYE/i.test(e.head || '')).length;
}
register({
  id: 'detectives_eye',
  narrator: 'all',
  on: {
    combat_start: (ctx, h) => {
      const cb = h.cb, u = h.u; if (!cb || !u || u.side !== 'pc' || overworld(cb)) return;
      const n = tierII(h) ? 2 : 1, found: { what: string; owner?: string }[] = [];
      for (const o of objectsOf(cb)) { if (found.length >= n) break; if (isTrap(o) && !trapKnown(o, 'pc')) { const k: any = o; if (k.side) (k.knownBy ||= []).push('pc'); else o.hidden = false; found.push({ what: 'a trap at ' + o.pos, owner: k.owner }); } }
      const foes = cb.units.filter((t) => t.side !== u.side && alive(t) && !t.analyzedBy && !t.companion).sort((a, b) => b.hp - a.hp || (a.id < b.id ? -1 : 1));
      for (const t of foes) { if (found.length >= n) break; t.analyzedBy = u.name; t.weakPoint = true; found.push({ what: 'how ' + t.name + ' fights (read: it deals 15% less to the squad)', owner: t.id }); }
      if (!found.length) return;
      const linked = found.length === 2 && !!found[0].owner && found[0].owner === found[1].owner;
      say(cb, u.name + '\'s eye catches what doesn\'t fit (Detective\'s Eye): ' + found.map((f) => f.what).join('; ') + (found.length === 2 ? (linked ? ' · connected' : ' · not connected') : '') + '.');
    },
  },
  brief: (h) => {
    const n = tierII(h) ? 2 : 1, got = servedThisScene(h);
    return got >= 1 ? 'served this scene' : 'owed this scene: ' + (n === 2 ? 'two out-of-place details, connected or not' : 'one out-of-place detail') + ' (perkLines key perk:detectives_eye)';
  },
});

// ---------- Crowd Pleaser (Charisma 3/5): one roll for a whole crowd at +2; II: turn it against one named person ----------
// Story: +2 Charisma on a check made to a crowd; the one roll is the Narrator's (one check). A crowd (rules 1.14, spec
// item 1108, PROVISIONAL) is 3 or more listeners within 8 tiles: the engine counts the people on the area map around
// the speaker (hostile or neutral, not hidden) by itself; with no map the Narrator tags the check crowd (or applies
// crowd_pleaser). Combat (PROVISIONAL): a Persuade or Threaten heard by 3+ enemies is one roll for all of them, its save TN +2.
const CROWD = 3;
/** Is the holder talking to a crowd: the Narrator said so, or 3 or more people on the area map are within earshot. Read only. */
function crowdHere(ctx: any, h: Holder): boolean {
  if (tagsOf(ctx).includes('crowd') || appliesTo(ctx.ck, 'crowd_pleaser')) return true;
  const g = gOf(h), at = h.c ? g?.story?.positions?.[h.c.id] : null; if (!at || g?.phase === 'combat') return false;
  return ((g.story.npcs || []) as any[]).filter((n) => n && n.pos && !n.hidden && dist(at, n.pos) <= HEARING).length >= CROWD;
}
register({
  id: 'crowd_pleaser',
  claims: ['skill_mod'], narrator: ['narrator'],
  on: {
    check_mod: (ctx, h) => { if (ctx.c === h.c && hasSkill(ctx.ck, 'charisma') && crowdHere(ctx, h)) addOnce(ctx, 2, 'Crowd Pleaser'); },
    check_result: (ctx, h) => { if (ctx.c === h.c && tierII(h) && ctx.roll?.ok && hasSkill(ctx.ck, 'charisma') && crowdHere(ctx, h)) ruling(h, 'Crowd Pleaser II: the crowd is won; ' + h.c!.name + ' may turn it against one named person (ask or let them say who).'); },
    parley: (ctx, h) => {
      if (ctx.u !== h.u || !h.cb || (ctx.kind !== 'persuade' && ctx.kind !== 'threaten')) return;
      const crowd = h.cb.units.filter((t) => t.side !== h.u!.side && alive(t) && !t.surrendered && dist(h.u!.pos, t.pos) <= HEARING);
      if (crowd.length < 3) return;
      ctx.tnAdd = (ctx.tnAdd || 0) + 2;
      (ctx as any).crowd = crowd.filter((t) => t !== ctx.t).map((t) => t.id);
      ctx.result = (ctx.result || '') + ' · Crowd Pleaser: one roll for all ' + crowd.length + ' who hear it (+2)';
      // The others hear the same words: each rolls the same save (game.ts applies the main target's after this hook).
      const rng = ctx.rng; if (!rng) return;
      for (const t of crowd) if (t !== ctx.t) crowdHit(h.cb, rng, h.u!, t, ctx.kind, ctx.tnAdd, ctx.via);
    },
  },
  brief: (h) => 'call one crowd check, tags crowd' + (tierII(h) ? '; on success they may turn it on one person' : ''),
});
/** The same words on the rest of the crowd: the same save as tactics.ts parley (Persuade a Brain save, Threaten a Heart save, rules 1.13). */
function crowdHit(cb: Combat, rng: { state: number }, u: Unit, t: Unit, kind: string, tnAdd: number, via0?: string) {
  const via = via0 || (kind === 'persuade' ? 'eloquence' : 'intimidation');
  const r = kind === 'persuade' ? applyCond(cb, rng, u, t, 'ldebuff', undefined, 'brain', { tnAdd, via }) : applyCond(cb, rng, u, t, 'shaken', undefined, 'heart', { tnAdd, via });
  if (r) say(cb, t.name + ' hears it too' + r + '.');
}

// ---------- Double Meaning (Implication 3/5): one sentence, two meanings; the squad gets +2 on the hinted action ----------
// Story: the sentence is a story action; the Narrator tags the hinted check 'hinted' (or applies double_meaning): +2 to
// any squad member's roll this scene. II: the Narrator plays the enemy acting on the false meaning.
// Combat (PROVISIONAL, a new combat form; once per round, not at will: plan 6): 0 AP, name the enemy the hint is
// about: each squad member's next attack on it gets +2 until the holder's next turn. II: the nearest other enemy who
// heard it (8 tiles) acts on the false meaning and loses its first action next turn (2 AP).
const hintOn = (h: Holder) => { const r = sro(h).hint; return !!r && r.scene === sceneN(h); };
register({
  id: 'double_meaning',
  claims: ['skill_mod_tag'], narrator: ['narrator'],
  actions: [
    {
      id: 'hint', label: 'Double Meaning', scope: ['story'], target: 'text', ap: 0,
      text: 'Say one sentence that means one thing to them and another to your squad. The squad gets +2 on the action you hinted at.',
      run: (h, a) => {
        sst(h).hint = { scene: sceneN(h), text: textArg(a) };
        const eid = postStory(h, 'says: "' + textArg(a) + '"');
        ruling(h, 'Double Meaning: does "' + clip(a.text, 160) + '" carry a hidden instruction to the squad? If so, tag the hinted check hinted (+2 for any squad member)' + (tierII(h) ? '; the enemy acts on the false meaning' : '') + '. Refuse if it carries none.', eid);
      },
    },
    {
      id: 'hint_fight', label: 'Double Meaning', scope: ['combat'], target: 'enemy', ap: 0, uses: { per: 'per_round', n: 1 }, range: HEARING,
      text: 'Once a round: hint at an attack on one enemy in earshot. Each squad member\'s next attack on it gets +2 to hit, until your next turn. II: the nearest other enemy who heard it loses its first action.',
      preview: (h) => ({ lines: ['+2 to each squad member\'s next attack on it, until your next turn.' + (tierII(h) ? ' The nearest other enemy within 8 tiles loses its first action.' : '')] }),
      run: (h, a) => {
        const cb = h.cb!, u = h.u!, t = cb.units.find((x) => x.id === a.targetId)!, st = stateOf(h);
        st.hint = { target: t.id, used: [] as string[] };
        let fooled = '';
        if (tierII(h)) {
          const o = cb.units.filter((x) => x.side !== u.side && x !== t && alive(x) && !x.surrendered && dist(u.pos, x.pos) <= HEARING).sort((x, y) => dist(u.pos, x.pos) - dist(u.pos, y.pos) || (x.id < y.id ? -1 : 1))[0];
          if (o) { st.fooled = o.id; fooled = '; ' + o.name + ' takes the false meaning'; }
        }
        say(cb, u.name + ' says one thing and means another (Double Meaning): the squad +2 on its next attack on ' + t.name + fooled + '.');
        if (a.text) note(h, 'the sentence: "' + clip(a.text, 160) + '"');
      },
    },
  ],
  on: {
    ruling_answered: (ctx, h) => { if (refused(ctx, h)) delete sst(h).hint; },
    check_mod: (ctx, h) => { if (ctx.c && !ctx.c.dead && hintOn(h) && (tagsOf(ctx).includes('hinted') || appliesTo(ctx.ck, 'double_meaning'))) addOnce(ctx, 2, 'Double Meaning'); },
    attack_preview: (ctx, h) => {
      const st = (h.u?.ps?.[h.key] as any)?.hint; if (!st || !h.u) return;
      if (ctx.att.side === h.u.side && ctx.tgt?.id === st.target && !st.used.includes(ctx.att.id)) ctx.terms.push({ v: 2, label: 'Double Meaning' });
    },
    attack_roll: (ctx, h) => { const st = (h.u?.ps?.[h.key] as any)?.hint; if (st && h.u && ctx.att.side === h.u.side && ctx.tgt?.id === st.target && !st.used.includes(ctx.att.id)) st.used.push(ctx.att.id); },
    turn_start: (ctx, h) => { if (ctx.u === h.u && h.u?.ps?.[h.key]) delete (h.u.ps[h.key] as any).hint; },
    enemy_action_start: (ctx, h) => {
      const st = h.u?.ps?.[h.key] as any; if (!st?.fooled || ctx.u.id !== st.fooled) return;
      delete st.fooled; ctx.skip = true; ctx.u.ap = Math.max(0, ctx.u.ap - 2);
      say(h.cb, ctx.u.name + ' acts on the false meaning and loses its first action (Double Meaning).');
    },
  },
  brief: (h) => 'tag the check the sentence hinted at: hinted' + (tierII(h) ? '; the enemy acts on the false meaning' : ''),
});

// ---------- Old Tongue (Lore Master 3/5): read any ancient or upper-realm script; II: speak it, one parley per being ----------
// Story: a check tagged ancient_script (or applies old_tongue) is an automatic success for the holder: they read it.
// II: 'Speak the Old Tongue' (story, and in a fight against an upper-realm being): once per being, it parleys. In a
// fight (PROVISIONAL) it holds its next turn's attacks while it listens (rules 1.14, spec item 1109: no attack, spell
// or technique on that turn, but it may move; it used to lose the whole turn); the words go to the Narrator. It gives parley
// when met, never summons a Celestial (the Accords), and what scripts reveal stays inside the Veil.
const parleyed = (h: Holder): string[] => (sro(h).beings || []);
register({
  id: 'old_tongue',
  narrator: 'all',
  actions: [
    {
      id: 'speak', label: 'Speak the Old Tongue', scope: ['story'], target: 'npc', ap: 0,
      text: 'Speak to an upper-realm being in its own tongue: it will parley with you, once.',
      available: (h) => (tierII(h) ? true : false),
      preview: (h, a) => { const who = npcRef(h, a).name || clip(a.text, 60); if (!who) return { ok: false, why: 'Name the being.' }; if (parleyed(h).some((b) => nameMatch(b, who))) return { ok: false, why: who + ' has parleyed with you once already.' }; return {}; },
      run: (h, a) => {
        const who = npcRef(h, a).name || clip(a.text, 60); (sst(h).beings ||= []).push(who);
        const eid = postStory(h, 'speaks to ' + who + ' in the old tongue' + (a.npc && a.text ? ': "' + clip(a.text, 160) + '"' : '.'));
        ruling(h, 'Old Tongue II: if ' + who + ' is an upper-realm being, it parleys with ' + h.c!.name + ' (once). It does not make a Celestial appear (Accords); refuse if it isn\'t upper-realm.', eid);
      },
    },
    {
      id: 'speak_fight', label: 'Speak the Old Tongue', scope: ['combat'], target: 'enemy', ap: 0, range: HEARING,
      text: 'Speak to an upper-realm being in earshot. It parleys with you and makes no attacks on its next turn. Once per being.',
      available: (h) => (tierII(h) ? true : false),
      preview: (h, a) => {
        const t = h.cb?.units.find((x) => x.id === a.targetId); if (!t) return {};
        if (t.kind !== 'upper_realm') return { ok: false, why: t.name + ' is no upper-realm being.' };
        if (parleyed(h).some((b) => nameMatch(b, t.npcId || t.name))) return { ok: false, why: t.name + ' has parleyed with you once already.' };
        return { lines: [t.name + ' holds its attacks on its next turn while it listens.'] };
      },
      run: (h, a) => {
        const t = h.cb!.units.find((x) => x.id === a.targetId)!; (sst(h).beings ||= []).push(t.npcId || t.name);
        // Holding its attacks is the 'hold' order of Commanded (the enemy's turn: no attack, spell or technique; it may
        // move), put on with no save and by nobody's Heart magic, so nothing that stops a condition stops the parley.
        (t.conds ||= {}).commanded = Math.max(t.conds.commanded || 0, 1); (t.condArg ||= {}).commanded = 'hold';
        stateOf(h).listening = t.id;
        say(h.cb, h.u!.name + ' speaks to ' + t.name + ' in the old tongue (Old Tongue): it holds its attacks on its next turn and listens.');
        note(h, t.name + ' (upper-realm) parleys with ' + h.u!.name + (a.text ? ': "' + clip(a.text, 160) + '"' : '') + '. Rule what it agrees to.');
      },
    },
  ],
  on: {
    // A refusal (not upper-realm) gives the being back: it never parleyed.
    ruling_answered: (ctx, h) => { if (!refused(ctx, h)) return; const st = sst(h), i = (st.beings || []).map((b: string) => String(ctx.r.text).includes('if ' + b + ' is')).lastIndexOf(true); if (i >= 0) st.beings.splice(i, 1); },
    check_post: (ctx, h) => { if (ctx.c === h.c && (tagsOf(ctx).includes('ancient_script') || appliesTo(ctx.ck, 'old_tongue')) && ctx.auto !== 'fail') { ctx.auto = 'success'; ctx.labels.push('OLD TONGUE'); } },
    enemy_action_start: (ctx, h) => {
      const st = h.u?.ps?.[h.key] as any; if (!st?.listening || ctx.u.id !== st.listening) return;
      delete st.listening; say(h.cb, ctx.u.name + ' holds its attacks and listens (Old Tongue).');
    },
  },
  brief: (h) => 'reads any ancient or upper-realm script (tag such checks ancient_script)' + (tierII(h) ? '; speaks it: one parley per being' : '') + '; within the Veil',
});

// ---------- Real Power (Authority 3/5): who actually holds the power in an organisation; II: and they agree to see you ----------
// PROVISIONAL (plan 6): once per organisation; "agrees to see you" is not "agrees to anything"; Celestials only by cause.
register({
  id: 'real_power',
  narrator: 'all',
  actions: [{
    id: 'read_org', label: 'Who really runs this? (Real Power)', scope: ['story'], target: 'text', ap: 0,
    text: 'Name an organisation: the Narrator tells you who really holds the power there. II: that person also agrees to see you. Once per organisation.',
    preview: (h, a) => (sro(h).orgs || []).some((o: string) => nameMatch(o, textArg(a))) ? { ok: false, why: 'You already know who runs ' + clip(a.text, 40) + '.' } : {},
    run: (h, a) => {
      const org = clip(a.text, 80); (sst(h).orgs ||= []).push(org);
      const eid = postStory(h, 'looks past the titles in ' + org + '.');
      ruling(h, 'Real Power: tell ' + h.c!.name + ' (perkLines, key perk:real_power) who really holds the power in ' + org + ', and keep it consistent (pin it in memory)' + (tierII(h) ? '; that person agrees to see them (a meeting, not a yes; Celestials only by cause)' : '') + '.', eid);
    },
  }],
  on: { ruling_answered: (ctx, h) => { if (!refused(ctx, h)) return; const st = sst(h), i = (st.orgs || []).map((o: string) => String(ctx.r.text).includes('power in ' + o)).lastIndexOf(true); if (i >= 0) st.orgs.splice(i, 1); } },
  brief: (h) => 'name the real power in each organisation, consistently' + (tierII(h) ? '; they agree to meet' : ''),
});

// ---------- Established Fact (Rumination Mastered): once per session, state a fact; it becomes true ----------
// PROVISIONAL guardrails (plan 6): a fact can't decide a check, create items, money or allies, or touch the Veil or
// Celestial truth; the Narrator refuses (perkRulings accepted false: the use comes back). Said in a fight (rules 1.14) it is the turn's attempt, answered at once:
// the fight waits for the Narrator's yes or no, and a no gives the use back.
const factRule = 'Make it true (pin it in memory) unless it contradicts something already shown, decides a check, creates items, money or allies, or touches the Veil or Celestial truth: then refuse (the use comes back).';
register({
  id: 'established_fact',
  narrator: 'all',
  actions: [{
    id: 'fact', label: 'Established Fact', scope: ['story', 'combat'], target: 'text', ap: 0, uses: { per: 'per_session', n: 1 },
    text: 'Once a session: state a fact about the technology, biology or history in the scene. It is true from now on, unless it contradicts what has already been shown. In a fight it is your attempt for the turn: the Narrator answers at once, and a no gives the use back.',
    preview: (h, a) => (inFight(h) ? (textArg(a) ? wordsGate(h) : { ok: false, why: 'Type the fact you state.' }) : {}),
    run: (h, a) => {
      if (inFight(h)) { say(h.cb, h.u!.name + ' states a fact (Established Fact): "' + clip(a.text, 160) + '".'); return raiseWords(h, { text: textArg(a), ask: 'Established Fact. ' + factRule, per: 'per_session', actionId: 'fact' }); }
      const eid = postStory(h, 'states a fact: "' + textArg(a) + '"');
      ruling(h, 'Established Fact: "' + clip(a.text, 160) + '". ' + factRule, eid);
    },
  }],
  brief: () => 'a stated fact becomes true unless it contradicts what\'s shown (guardrails in the ruling)',
});

// ---------- Closing Argument (Eloquence Mastered): once per scene, listeners not ruled by fear or faith accept the logic ----------
// PROVISIONAL (plan 6): a pending Eloquence check that argues the same point resolves as a success (auto); what the
// NPCs do about it stays the Narrator's.
register({
  id: 'closing_argument',
  narrator: 'all',
  actions: [{
    id: 'close', label: 'Closing Argument', scope: ['story', 'combat'], target: 'text', ap: 0, uses: { per: 'per_scene', n: 1 },
    text: 'Once a scene: make your closing argument. Every listener who isn\'t ruled by fear or faith accepts its logic. An Eloquence check waiting on that point succeeds. In a fight it is your attempt for the turn: the Narrator answers at once, and a no gives the use back.',
    preview: (h, a) => (inFight(h) ? (textArg(a) ? wordsGate(h) : { ok: false, why: 'Type your closing argument.' }) : {}),
    run: (h, a) => {
      if (inFight(h)) { say(h.cb, h.u!.name + ' makes a closing argument (Closing Argument): "' + clip(a.text, 160) + '".'); return raiseWords(h, { text: textArg(a), ask: 'Closing Argument: every listener not ruled by fear or faith accepts the logic of it; each may still refuse to act on it. Refuse only if nobody here could follow an argument (the use comes back).', per: 'per_scene', actionId: 'close' }); }
      const ck = pendingCheck(h, a.checkId, (k) => hasSkill(k, 'eloquence'));
      if (ck) { ck.auto = 'success'; (ck.mods ||= []); }
      const eid = postStory(h, 'closes: "' + textArg(a) + '"' + (ck ? ' (their Eloquence check succeeds)' : ''));
      ruling(h, 'Closing Argument: every listening NPC not ruled by fear or faith accepts the logic of "' + clip(a.text, 140) + '"; each may still refuse to act on it.' + (ck ? ' Their pending Eloquence check is a success.' : ''), eid);
    },
  }],
  brief: () => 'listeners not ruled by fear or faith accept its logic; acting on it is theirs',
});

// ---------- Everyone's Friend (Charisma Mastered): once per scene one NPC treats you as a trusted friend; the first lie lands ----------
// The first lie: the player's 'First lie lands' on a pending Charisma check, or the Narrator's tag lie on a check aimed
// at that NPC (target), is an automatic success, once per scene. An NPC who already hates them refuses the use (refunded).
const friendOf = (h: Holder) => { const f = sro(h).friend; return f && f.scene === sceneN(h) ? f : null; };
register({
  id: 'everyones_friend',
  claims: ['auto_success'], narrator: ['narrator'],
  actions: [
    {
      id: 'befriend', label: 'Everyone\'s Friend', scope: ['story'], target: 'npc', ap: 0, uses: { per: 'per_scene', n: 1 },
      text: 'Once a scene: one person who doesn\'t already hate you treats you as a trusted friend until the scene ends. Your first lie to them is believed.',
      preview: (h, a) => (npcRef(h, a).name || textArg(a) ? {} : { ok: false, why: 'Who? Type their name.' }),
      run: (h, a) => {
        const who = npcRef(h, a).name || clip(a.text, 60);
        sst(h).friend = { scene: sceneN(h), npc: who, lie: false };
        const eid = postStory(h, 'wins over ' + who + '.');
        ruling(h, 'Everyone\'s Friend: ' + who + ' treats ' + h.c!.name + ' as a trusted friend this scene and shares what a friend would. Refuse if ' + who + ' already hates them (the use comes back). Tag a lie to them lie, target "' + who + '".', eid);
      },
    },
    {
      id: 'first_lie', label: 'First lie lands', scope: ['story'], target: 'check', ap: 0,
      text: 'Use this on a Charisma check you are about to roll: it is your first lie to your friend this scene, and it succeeds.',
      available: (h) => { const f = friendOf(h); return !f ? false : f.lie ? 'You already used your first lie on them.' : true; },
      preview: (h, a) => (pendingCheck(h, a.checkId, (k) => hasSkill(k, 'charisma')) ? {} : { ok: false, why: 'You have no Charisma check waiting.' }),
      run: (h, a) => {
        const ck = pendingCheck(h, a.checkId, (k) => hasSkill(k, 'charisma'))!, f = sst(h).friend;
        ck.auto = 'success'; f.lie = true; ck.target ||= f.npc;
        postStory(h, 'lies to ' + f.npc + ', and it lands (their Charisma check succeeds).');
      },
    },
  ],
  on: {
    ruling_answered: (ctx, h) => { if (refused(ctx, h) && /^Everyone's Friend:/.test(ctx.r.text)) delete sst(h).friend; },
    check_post: (ctx, h) => {
      const f = friendOf(h); if (ctx.c !== h.c || !f || f.lie || !tagsOf(ctx).includes('lie') || !hasSkill(ctx.ck, 'charisma')) return;
      if (ctx.ck.target && !nameMatch(ctx.ck.target, f.npc)) return;
      sst(h).friend.lie = true; ctx.ck.auto = 'success'; ctx.auto = 'success'; ctx.labels.push('EVERYONE\'S FRIEND');
    },
  },
  brief: (h) => { const f = friendOf(h); return f ? f.npc + ' is a trusted friend this scene' + (f.lie ? '' : '; tag a lie to them lie') : 'the chosen NPC treats them as a trusted friend for the scene'; },
});

// ---------- Their Own Idea (Implication Mastered): once per scene, a hidden suggestion the listener takes as their own ----------
// The suggestion is private (only the player and the Narrator see it). PROVISIONAL (plan 6, Leon to set the numbers):
// a named, important or supernatural listener on the map (an elite or boss, or upper-realm or cursed) makes a Heart save,
// d20 + its tier's save vs 12 + your Insinuation strength, rolled by the engine; Celestials are immune (the Accords).
// A directly self-harmful suggestion is refused (the use comes back).
const TIER_SAVE: Record<string, number> = { minion: 0, soldier: 1, elite: 2, boss: 3 };
register({
  id: 'their_own_idea',
  narrator: 'all',
  actions: [{
    id: 'suggest', label: 'Their Own Idea', scope: ['story', 'combat'], target: 'npc', ap: 0, uses: { per: 'per_scene', n: 1 },
    text: 'Once a scene: hide a suggestion inside a sentence (type it, and name the listener). They believe it was their own idea and act on it, unless it would harm them directly. In a fight it is your attempt for the turn: the Narrator answers at once, and a no gives the use back.',
    preview: (h, a) => {
      if (inFight(h)) { const g = wordsGate(h); if (g.why) return g; }
      if (!textArg(a)) return { ok: false, why: 'Type the suggestion you hide.' };
      if (inFight(h) && !a.targetId) return { ok: false, why: 'Pick the listener.' };
      const t = inFight(h) ? h.cb!.units.find((x) => x.id === a.targetId) : null, r = inFight(h) ? null : npcRef(h, a);
      if (!inFight(h) && !r!.name) return { ok: false, why: 'Who is listening? Name them.' };
      if ((t?.kind || r?.npc?.kind) === 'celestial') return { ok: false, why: 'Celestials are beyond it (the Accords).' };
      return {};
    },
    run: (h, a, rng) => {
      const g = gOf(h), t = inFight(h) ? h.cb!.units.find((x) => x.id === a.targetId) || null : null, r = inFight(h) ? null : npcRef(h, a);
      const who = t ? t.name : r!.name, n: any = t ? { tier: t.tier, kind: t.kind } : r!.npc;
      let save = '';
      if (n && (['elite', 'boss'].includes(n.tier) || ['upper_realm', 'cursed'].includes(n.kind || ''))) {
        const die = d20(rng), m = TIER_SAVE[n.tier] ?? 0, tn = 12 + (h.c ? strengthOf(h.c, 'implication') : 0), ok = die === 20 || (die !== 1 && die + m >= tn);
        save = ' · ' + who + ' HEART SAVE d20 ' + die + ' +' + m + ' = ' + (die + m) + ' vs ' + tn + (ok ? ': resists' : ': takes it');
        if (ok) { if (inFight(h)) say(h.cb, h.u!.name + ' plants an idea in ' + who + save + '.'); else entry(g, { kind: 'check', charId: h.c!.id, ok: false, to: h.c!.owner, head: 'THEIR OWN IDEA · ' + save.slice(3).toUpperCase(), text: who + ' doesn\'t take the bait.' }); return; }
      }
      if (inFight(h)) { say(h.cb, h.u!.name + ' plants an idea in ' + who + ' (Their Own Idea)' + save + '.'); return raiseWords(h, { text: textArg(a), ask: 'Their Own Idea: ' + who + ' believes this is their own idea and acts on it. Refuse if it would harm them directly (the use comes back).', targetId: a.targetId, private: true, per: 'per_scene', actionId: 'suggest' }); }
      const eid = postStory(h, 'to ' + who + ', the hidden suggestion: "' + textArg(a) + '"' + save, { private: true });
      ruling(h, 'Their Own Idea: ' + who + ' believes "' + clip(a.text, 160) + '" is their own idea and acts on it. Refuse if it would harm them directly (the use comes back).' + save, eid);
    },
  }],
  brief: () => 'the listener acts on the hidden suggestion as its own unless directly self-harmful',
});

// ---------- Foreseen (Conscience Mastered): once per session, after a major decision goes wrong, rewind and choose again ----------
// The real rewind (PROVISIONAL, spec 14): the room votes, as for a reroll (unanimous; in co-op anyone can veto), to go
// back to the host's copy from just before one of the Narrator's last 5 turns (choice: its entry id; else the latest).
// Everything since is undone, dice, HP, loot and XP included; the Narrator is told to show what would have happened and
// play the moment again; the use stays spent. With no turn to go back to (or a vote under way) it is refused.
register({
  id: 'foreseen',
  narrator: 'all',
  actions: [{
    id: 'foresee', label: 'Foreseen', scope: ['story'], target: 'text', ap: 0, uses: { per: 'per_session', n: 1 },
    text: 'Once a session, after a major decision goes wrong: say which one. The room votes on going back to just before it, and if the vote passes you choose again.',
    run: (h, a) => {
      const g = gOf(h); if (!g || !h.c) return 'Only in the story.';
      return foreseeVote(g, h.c, h.key + '#foresee', a.choice, textArg(a));
    },
  }],
  brief: () => null,
});

// ---------- Cultured (Lore Master 5 + Camaraderie 5): +1 Ingenuity and Charisma when the talk turns to art, history, holo-dramas ----------
register({
  id: 'cultured',
  claims: ['skill_mod'],
  on: { check_mod: (ctx, h) => { if (ctx.c === h.c && hasSkill(ctx.ck, 'ingenuity', 'charisma') && (tagsOf(ctx).some((t) => ['culture', 'art', 'history', 'holo_drama'].includes(t)) || appliesTo(ctx.ck, 'cultured'))) addOnce(ctx, 1, 'Cultured'); } },
  brief: () => 'tag talk of art, history or holo-dramas culture',
});

// ---------- Cold Read (Empathy 5 + Analysis 5): an Analyze on an NPC also reveals what they want most ----------
// Every Analyze of a new person (Analyze is once per enemy) and every successful story Analysis check owes it; the
// Narrator says it privately (perkLines key perk:cold_read).
register({
  id: 'cold_read',
  narrator: 'all',
  on: {
    analyze: (ctx, h) => { if (ctx.u === h.u && ctx.t && person(ctx.t)) note(h, 'Cold Read: tell ' + (h.c?.name || h.u!.name) + ' privately (perkLines key perk:cold_read) what ' + ctx.t.name + ' wants most.'); },
    check_result: (ctx, h) => { if (ctx.c === h.c && ctx.roll?.ok && hasSkill(ctx.ck, 'analysis')) ruling(h, 'Cold Read: tell ' + h.c!.name + ' privately (perkLines key perk:cold_read) what ' + (ctx.ck.target || 'the person this check was about') + ' wants most.'); },
  },
  brief: () => 'after an Analyze of someone: privately, what they want most (perkLines)',
});

// ---------- What Could Be (Visualization 5 + Conscience 5): once per session, a vision of the best reachable outcome ----------
register({
  id: 'what_could_be',
  narrator: 'all',
  actions: [{
    id: 'vision', label: 'What Could Be', scope: ['story'], target: 'text', ap: 0, uses: { per: 'per_session', n: 1 },
    text: 'Once a session, before a major decision: you get a brief vision of the best outcome within reach, and one way to get there. It can still fail.',
    run: (h, a) => {
      const eid = postStory(h, 'asks what could be: "' + textArg(a) + '"', { private: true });
      ruling(h, 'What Could Be: before "' + clip(a.text, 160) + '", show ' + h.c!.name + ' privately (perkLines key perk:what_could_be) the best outcome within reach and one honest route to it. It can still fail; don\'t make it fail out of spite.', eid);
    },
  }],
  brief: () => 'once a session, privately: the best reachable outcome and one honest route',
});

// ---------- Every Lie Is a Door (Ultimate): once per session, name a reason to be in a guarded place; believed until a weapon is drawn ----------
// Engine part: while the lie holds (c.state.lie_door), hostile NPCs don't notice the holder sneaking (notice range 0;
// +20 to stay hidden next to them; a natural 1 still fails: hooks gap). It ends when a fight starts, the scene ends, or
// the Narrator says a weapon was drawn (traitState lie_door: null). PROVISIONAL: only the holder; it works on people,
// not on simulation-level barriers.
const doorOpen = (h: Holder) => !!cro(h.c).lie_door;
register({
  id: 'every_lie_is_a_door',
  narrator: 'all',
  actions: [{
    id: 'door', label: 'Every Lie Is a Door', scope: ['story'], target: 'text', ap: 0, uses: { per: 'per_session', n: 1 },
    text: 'Once a session: name a reason to be in a guarded place. You walk in and are believed until someone draws a weapon.',
    run: (h, a) => {
      cst(h.c).lie_door = clip(a.text, 80);
      const eid = postStory(h, 'walks in: "' + textArg(a) + '"');
      ruling(h, 'Every Lie Is a Door: the guards here believe "' + clip(a.text, 140) + '" until someone draws a weapon; then set traitState lie_door: null. People only, not simulation-level barriers.', eid);
    },
  }],
  on: {
    ruling_answered: (ctx, h) => { if (refused(ctx, h) && h.c) delete cst(h.c).lie_door; },
    notice: (ctx, h) => { if (ctx.c === h.c && doorOpen(h)) { ctx.range = 0; ctx.ignore = true; } },
    stay_hidden: (ctx, h) => { if (ctx.c === h.c && doorOpen(h) && ctx.auto !== 'fail') ctx.auto = 'success'; },
    combat_start: (ctx, h) => { if (h.c && doorOpen(h) && h.u?.side === 'pc') { delete cst(h.c).lie_door; say(h.cb, 'Weapons are out: ' + h.c.name + '\'s lie stops opening doors (Every Lie Is a Door).'); } },
    scene_change: (ctx, h) => { if (h.c && doorOpen(h)) delete cst(h.c).lie_door; },
  },
});

// ======================================================================================================== TRAITS

// ---------- Gambler: Double or Nothing (once per scene, a fight counts as one); In Debt (the Narrator's) ----------
// Story: 'Double or Nothing' on a pending check of yours (or the Narrator's double: true on a check, which spends the
// scene's use): a success becomes a critical success, a failure a critical failure. An Echo reroll keeps the flag.
// Combat: the toggle on an attack: a hit is a critical, a miss a natural-1 result (a gun jams; a melee or no-Heat
// weapon fumbles, −1 AP next turn). PROVISIONAL (plan 6): checks and attack rolls only (no saves, death saves, Mana Short).
const DOUBLE = 'double';
const dKey = (h: Holder) => h.key + '#' + DOUBLE;
const doubleLeft = (h: Holder) => uses(h).left('per_scene', 1, dKey(h)) > 0;
register({
  id: 'gambler',
  claims: ['double_or_nothing'], narrator: ['narrator'],
  actions: [{
    id: DOUBLE, label: 'Double or Nothing', scope: ['story'], target: 'check', ap: 0, uses: { per: 'per_scene', n: 1 },
    text: 'Once a scene, before you roll a check: a success becomes a critical success, and a failure becomes a critical failure.',
    preview: (h, a) => (pendingCheck(h, a.checkId, (k) => !k.double) ? {} : { ok: false, why: 'You have no check waiting to double.' }),
    run: (h, a) => {
      const ck = pendingCheck(h, a.checkId, (k) => !k.double)!; ck.double = true;
      postStory(h, 'goes double or nothing on: ' + clip(ck.stakes, 120));
    },
  }],
  toggles: [{
    id: DOUBLE, label: 'Double or Nothing', on: ['combat/attack'],
    available: (h) => (doubleLeft(h) ? true : 'Used this scene.'),
    preview: () => 'Once a scene: if this attack hits, it is a critical hit. If it misses, your gun jams. With a melee weapon or a gun that can\'t jam, you lose 1 AP next turn instead.',
  }],
  on: {
    check_build: (ctx, h) => {
      if (ctx.c !== h.c || !ctx.ck.double) return;
      if (!uses(h).take('per_scene', 1, dKey(h))) delete ctx.ck.double; // no use left this scene: the flag doesn't hold
    },
    check_result: (ctx, h) => {
      if (ctx.c !== h.c || !ctx.ck.double || !ctx.roll) return;
      const r = ctx.roll; r.crit = !!r.ok; r.fumble = !r.ok;
      const e = (gOf(h)?.story?.entries || []).at(-1); if (e && e.kind === 'check') e.head = (e.head || '') + ' · DOUBLE OR NOTHING: CRITICAL ' + (r.ok ? 'SUCCESS' : 'FAILURE');
    },
    attack_roll: (ctx, h) => {
      if (ctx.att !== h.u || !modOn(h, DOUBLE) || !uses(h).take('per_scene', 1, dKey(h))) return;
      const crit = ctx.die === 20 || ctx.die >= ctx.critMin, fumble = ctx.die === 1 && !ctx.noFumble;
      const hit = ctx.hit ?? (!fumble && (crit || ctx.die + ctx.toHit >= ctx.need));
      const w = WEAPON[h.u!.weapon], melee = !w || isMelee(w) || ctx.mode === 'melee';
      if (hit) { ctx.critMin = Math.min(ctx.critMin, ctx.die); ctx.hit = true; say(h.cb, h.u!.name + ' goes double or nothing: the hit is a critical (Gambler).'); }
      else { ctx.hit = false; if (!melee && canJam(w)) h.u!.jammed = true; else h.u!.stunnedNext = 1; say(h.cb, h.u!.name + ' goes double or nothing and loses: ' + (!melee && canJam(w) ? 'the gun jams' : '−1 AP next turn') + ' (Gambler).'); }
    },
  },
  brief: () => 'In Debt: Smetanita Conjunction collectors turn up when you decide',
});

// ---------- Crowded Head: Chorus (4 voice lines a beat, Ask a skill twice a scene); Cacophony (+1 Echo to resist; one twisted line) ----------
register({
  id: 'crowded_head',
  claims: ['voice_line_cap', 'extra_use', 'overreach_resist_cost'], narrator: ['narrator'],
  on: {
    voice_cap: (ctx, h) => { if (ctx.c === h.c) ctx.cap += 2; },
    ask_limit: (ctx, h) => { if (ctx.c === h.c) ctx.limit = Math.max(ctx.limit, 2); },
    overreach_cost: (ctx, h) => { if (ctx.c === h.c) ctx.cost += 1; },
    session_start: (ctx, h) => { if (h.c?.state?.mislead_used) delete h.c.state.mislead_used; },
  },
  brief: (h) => (cro(h.c).mislead_used ? 'twisted line used this session' : 'once a session you may twist one true voice line (then traitState mislead_used: true)'),
});

// ---------- Cover Story: New Name (once per session); Paper Trail (3 burned identities bring an old con back) ----------
// The identity is c.state.identity (the brief's Standing line shows it). A roll the holder fails while it holds owes a
// ruling: if NPCs saw it, the cover is burned (traitState identity: null). The engine counts identities burned (an
// identity cleared after a failed roll); at 3, someone from an old con is owed (the brief) until traitState old_con: true.
function syncCover(h: Holder) {
  const st = sst(h), c = h.c; if (!c) return;
  if (st.pending && !cro(c).identity) { st.burned = (st.burned || 0) + 1; st.pending = false; }
}
const burnedOf = (h: Holder) => (sro(h).burned || 0) + (sro(h).pending && !cro(h.c).identity ? 1 : 0);
register({
  id: 'cover_story',
  claims: ['counter'], narrator: ['narrator'],
  actions: [{
    id: 'new_name', label: 'New Name', scope: ['story'], target: 'text', ap: 0, uses: { per: 'per_session', n: 1 },
    text: 'Once a session: set up a false identity in one sentence. People accept it until you fail a roll in front of them.',
    run: (h, a) => {
      syncCover(h); sst(h).pending = false;
      cst(h.c).identity = clip(a.text, 80);
      const eid = postStory(h, 'is now: "' + textArg(a) + '"');
      ruling(h, 'Cover Story: NPCs accept "' + clip(a.text, 120) + '" until ' + h.c!.name + ' fails a roll in front of them.', eid);
    },
  }],
  on: {
    ruling_answered: (ctx, h) => { if (refused(ctx, h) && /^Cover Story: NPCs accept/.test(ctx.r.text) && h.c) { delete cst(h.c).identity; sst(h).pending = false; } },
    check_build: (ctx, h) => { if (ctx.c === h.c) syncCover(h); },
    check_result: (ctx, h) => {
      if (ctx.c !== h.c) return; syncCover(h);
      if (ctx.roll?.ok && ctx.roll.rerolled && sst(h).pending === ctx.ck.id) sst(h).pending = false; // the reroll stands: not a failure
      if (!ctx.roll || ctx.roll.ok || !cro(h.c).identity) return;
      sst(h).pending = ctx.ck.id || true;
      ruling(h, 'Cover Story: ' + h.c!.name + ' failed a roll as "' + clip(cro(h.c).identity, 60) + '". If NPCs saw it, the cover is burned: set traitState identity: null.');
    },
    session_start: (ctx, h) => syncCover(h),
  },
  brief: (h) => {
    const n = burnedOf(h), owed = n >= 3 && !cro(h.c).old_con;
    return 'identities burned ' + n + '/3' + (owed ? '; owed: someone from an old con turns up (then traitState old_con: true)' : '');
  },
});

// ---------- Cold Case: Case File (Analyze −1 AP; one true yes/no a session); Obsession (−1 on every roll unrelated to an open case) ----------
// The Narrator opens and closes the case (traitState case_open: true / null) and marks scenes tied to it (traitState
// case_related: true, reset at each new scene; or the check tag case_related). Unrelated is the default. Obsession hits
// story checks, Ask-a-skill and stay-hidden rolls, and in a fight attack rolls and saves (fixed at the fight's start),
// never passives (PROVISIONAL, plan 6).
const obsessed = (h: Holder, ctx?: any) => !!cro(h.c).case_open && !cro(h.c).case_related && !tagsOf(ctx).includes('case_related');
register({
  id: 'cold_case',
  claims: ['roll_mod_all'], narrator: ['narrator'],
  actions: [{
    id: 'case_file', label: 'Case File', scope: ['story'], target: 'text', ap: 0, uses: { per: 'per_session', n: 1 },
    text: 'Once a session, after you investigate a scene: ask one yes-or-no question about whoever is responsible. The answer is true.',
    run: (h, a) => {
      const eid = postStory(h, 'asks the case file: "' + textArg(a) + '"', { private: true });
      ruling(h, 'Case File: answer ' + h.c!.name + '\'s yes-or-no question "' + clip(a.text, 160) + '" truthfully, privately (perkLines key trait:cold_case). Refuse if they haven\'t investigated the scene yet (the use comes back).', eid);
    },
  }],
  stat: (h, stat, ctx) => {
    if (!obsessed(h, ctx)) return 0;
    if (stat === 'attack' || stat === 'save_body' || stat === 'save_brain' || stat === 'save_heart') return -1;
    if (stat.startsWith('skill:') && (ctx?.roll === 'ask' || ctx?.roll === 'stealth')) return -1;
    return 0;
  },
  on: {
    check_mod: (ctx, h) => { if (ctx.c === h.c && obsessed(h, ctx)) addOnce(ctx, -1, 'Obsession'); },
    scene_change: (ctx, h) => { if (h.c?.state?.case_related) delete h.c.state.case_related; },
  },
  brief: (h) => (cro(h.c).case_open ? 'case open: set traitState case_related: true in scenes tied to it' : 'say when a case opens (traitState case_open: true)'),
});

// ---------- Interrogator: The Quiet Room (+2 Intimidation and Eloquence alone with a captive); Known Trade (−2 Charisma, Empathy) ----------
// The numbers are generic skill_mods on the check tags alone_with_captive and vs_civilians_who_know (core.ts); the
// broken captive's one true answer is the Narrator's.
register({
  id: 'interrogator',
  narrator: ['narrator'],
  on: { check_result: (ctx, h) => { if (ctx.c === h.c && ctx.roll?.ok && tagsOf(ctx).includes('alone_with_captive') && hasSkill(ctx.ck, 'intimidation', 'eloquence')) ruling(h, 'Interrogator: if the captive is broken, they give ' + h.c!.name + ' one true answer they would give nobody else.'); } },
  brief: () => 'tag alone_with_captive / vs_civilians_who_know; a broken captive gives one true answer',
});

// ---------- Holo-Drama Addict: Dramatic Timing (+3 once a scene if the drama sells); Leading Role (unglamorous: Visualization first) ----------
// Story: 'Play it as a holo-drama' spends the scene's use and asks the Narrator; a check it tags drama gets +3 (a drama
// tag without the declaration spends the use itself). A refusal gives the use back. Leading Role: a check of the holder
// tagged unglamorous makes the engine roll Visualization vs 12 first; on a fail that check is at −3 (the player may
// instead refuse and say so). Combat (PROVISIONAL): 0 AP, the same once-per-scene use: +3 to the next attack this turn,
// no approval.
const DRAMA = 'drama';
const drKey = (h: Holder) => h.key + '#' + DRAMA;
register({
  id: 'holo_drama_addict',
  claims: 'all',
  actions: [{
    id: DRAMA, label: 'Play it as a holo-drama', scope: ['story', 'combat'], target: 'none', ap: 0, uses: { per: 'per_scene', n: 1 },
    text: 'Once a scene: describe your action as a scene from a holo-drama. If the Narrator buys it, you roll with +3. In a fight, you get +3 to hit on your next attack this turn.',
    preview: (h, a) => (inFight(h) ? { lines: ['+3 to hit on your next attack this turn.'] } : needText(a, 'Describe the scene you\'re playing.')),
    run: (h, a) => {
      if (inFight(h)) { stateOf(h).next = { turn: h.cb!.round + '.' + h.cb!.turn }; say(h.cb, h.u!.name + ' plays it like the holo-dramas (Dramatic Timing): +3 to the next attack.'); if (a.text) note(h, 'Dramatic Timing: "' + clip(a.text, 160) + '"'); return; }
      sst(h).drama = { scene: sceneN(h), applied: null };
      const eid = postStory(h, 'plays it as a holo-drama: "' + textArg(a) + '"');
      ruling(h, 'Holo-Drama Addict: if the drama sells, tag ' + h.c!.name + '\'s check for it drama (+3). Refuse if it doesn\'t (the use comes back).', eid);
    },
  }],
  on: {
    // The drama didn't sell: no +3 waits for a drama-tagged check (the use is refunded).
    ruling_answered: (ctx, h) => { if (refused(ctx, h)) delete sst(h).drama; },
    check_mod: (ctx, h) => {
      if (ctx.c !== h.c || !(tagsOf(ctx).includes('drama') || appliesTo(ctx.ck, 'holo_drama_addict'))) return;
      const st = sst(h), d = st.drama && st.drama.scene === sceneN(h) ? st.drama : null;
      if (d && d.applied && d.applied !== ctx.ck.id) return; // the scene's +3 went to another check
      if (!d) { if (!uses(h).take('per_scene', 1, drKey(h))) return; st.drama = { scene: sceneN(h), applied: ctx.ck.id }; }
      else d.applied = ctx.ck.id;
      addOnce(ctx, 3, 'Dramatic Timing');
    },
    check_build: (ctx, h) => {
      if (ctx.c !== h.c || !tagsOf(ctx).includes('unglamorous') || hasSkill(ctx.ck, 'visualization') || !h.c) return;
      const g = gOf(h), rng = g?.rng; if (!rng) return;
      const m = sideRollMod(g, h.c, 'visualization'), die = d20(rng), ok = die === 20 || (die !== 1 && die + m >= 12);
      entry(g, { kind: 'check', charId: h.c.id, ok, head: 'VISUALIZATION · LEADING ROLE · d20 ' + die + ' ' + (m >= 0 ? '+' : '−') + Math.abs(m) + ' = ' + (die + m) + ' vs 12 · ' + (ok ? '✓ SUCCESS' : '✕ FAILURE'), text: h.c.name + ' pictures it as a scene worth filming' + (ok ? '.' : ': they refuse, or do it at −3.') });
      if (!ok) (ctx.ck as any).leadingRole = -3;
    },
    attack_preview: (ctx, h) => { const n = (h.u?.ps?.[h.key] as any)?.next; if (n && ctx.att === h.u && n.turn === h.cb!.round + '.' + h.cb!.turn) ctx.terms.push({ v: 3, label: 'Dramatic Timing' }); },
    attack_roll: (ctx, h) => { if (ctx.att === h.u && (h.u?.ps?.[h.key] as any)?.next) delete (h.u!.ps![h.key] as any).next; },
    turn_end: (ctx, h) => { if (ctx.u === h.u && (h.u?.ps?.[h.key] as any)?.next) delete (h.u!.ps![h.key] as any).next; },
  },
  checkMod: (h, ck) => (ck?.leadingRole && ck.charId === h.c?.id ? [{ add: ck.leadingRole, label: 'Leading Role' }] : []),
  brief: () => 'tag a sold holo-drama check drama (+3); tag unglamorous actions unglamorous',
});

// ---------- Born Performer: Adaptable (+2 to one γ skill a scene; +20% combat XP); Hollow (no dialogue XP; Empathy on you +2) ----------
// The XP changes are generic (xp_mod). Adaptable: at each new scene the engine picks the holder's highest γ skill as
// the default (PROVISIONAL, plan 6) and the player may change it once that scene. The +2 reaches every d20 that uses
// the skill (checks, passives, Ask, and a fight in that scene: initiative, saves, rolls). Hollow: an ally's Empathy
// check aimed at the holder (target) gets +2; an NPC's is the Narrator's.
const GAMMA = Object.values(SKILL).filter((s: any) => s.slot === 'gamma').map((s: any) => s.id as string);
const pickOf = (h: Holder): string | null => { const p = sro(h).pick; return p && p.scene === sceneN(h) ? p.skill : null; };
function autoPick(h: Holder) {
  const c = h.c; if (!c) return;
  const best = [...GAMMA].sort((a, b) => (c.skills[b] || 0) - (c.skills[a] || 0) || GAMMA.indexOf(a) - GAMMA.indexOf(b))[0];
  sst(h).pick = { scene: sceneN(h), skill: best, auto: true };
  const g = gOf(h); entry(g, { kind: 'system', to: c.owner, ooc: true, text: c.name + ' plays ' + SKILL[best].name + ' this scene (Born Performer, +2). Change it once on the Perks strip.' });
}
register({
  id: 'born_performer',
  claims: (e) => e?.op === 'choose_bonus' || (e?.op === 'skill_mod' && e?.context === 'others_targeting_you'),
  actions: [{
    id: 'adaptable', label: 'Adaptable', pick: 'gamma', pickLabel: 'The γ skill you play', scope: ['story'], target: 'none', ap: 0, uses: { per: 'per_scene', n: 1 },
    text: 'Once a scene: pick the γ skill you play. You get +2 to it for the rest of the scene.',
    preview: (h, a) => (a.choice && GAMMA.includes(a.choice) ? { lines: ['+2 ' + SKILL[a.choice].name + ' for the rest of the scene.'] } : { ok: false, why: 'Pick a γ skill: ' + GAMMA.map((s) => SKILL[s].name).join(', ') + '.' }),
    run: (h, a) => { sst(h).pick = { scene: sceneN(h), skill: a.choice, auto: false }; postStory(h, 'plays ' + SKILL[a.choice!].name + ' this scene.', { private: true }); },
  }],
  // Checks get the +2 as a named whole-check mod (check_mod); every other d20 with the skill through the stat.
  stat: (h, stat, ctx) => { const p = pickOf(h); return p && stat === 'skill:' + p && ctx?.roll !== 'check' ? 2 : 0; },
  on: {
    scene_change: (ctx, h) => autoPick(h),
    session_start: (ctx, h) => { if (!pickOf(h)) autoPick(h); },
    check_build: (ctx, h) => { if (ctx.c === h.c && !pickOf(h)) autoPick(h); },
    check_mod: (ctx, h) => {
      const p = pickOf(h); if (ctx.c === h.c && p && hasSkill(ctx.ck, p)) addOnce(ctx, 2, 'Born Performer: ' + SKILL[p].name);
      if (ctx.c && ctx.c !== h.c && hasSkill(ctx.ck, 'empathy') && targets(ctx.ck, h.c)) addOnce(ctx, 2, 'Born Performer: nobody home');
    },
  },
  brief: () => 'NPCs reading them with Empathy sense nobody is home (+2 to them)',
});

