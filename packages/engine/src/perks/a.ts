// Lane A: Body, melee, damage taken. Perks: Stonewall, Shrug It Off, Used to the Pain, Scar Tissue, Iron Stomach,
// Grapple, Breaching Strike, Earthbreaker, Last Wall, Walking Wounded, Nothing Left to Fear, Bite the Bullet, Siege
// Engine. Traits: Pain Eater, Factory Made, Glass Runner, Right of Way, Heavyworlder, Crawler-Blooded, Old Timer, The
// Brightest Light, Squad Anchor, Augmented, Southern Fist, Raised by Orks.
//
// Every item runs both tiers in combat and its story part (checks, story conditions, rest, session start) where it has
// one; what the engine can't judge goes to the Narrator (note / pendRuling / brief). Recommended fixes from the audit
// (plan section 6) are marked PROVISIONAL here and listed in the spec (section 14, tags A…) and docs/design/perk-runtime.md.
import { register, charOfUnit, stateOf, uses, pendRuling, postStory, applyDamage, grantShield, gainEcho, pushAway, immune, emit, type Holder } from '../effects';
import { itemAmount } from '../effects/amounts';
import { ELEMENTAL_TYPES } from '../effects/damage';
import type { Combat, Unit } from '../combat';
import type { Character } from '../character';
import { key, xy, dist, alive, unitSees, litAt, moveBlockers, objectsOf, damageObject, resolveAttack, attackDamage, isMelee, refOf, keyOf as refKey, emitFx, fxFell, checkOver, previewAttack } from '../combat';
import { ARMOUR, mod, packOf, maxHp as maxHpOf } from '../character';
import { WEAPON, SKILL } from '../data';
import { applyCond, endCond, condOn, condSource, bodyDebuffs, condFamily, unitStrength } from '../magic';
import { die, d20, type Rng } from '../rng';
import { setStoryCond, storyConds, strikeFromWorld } from '../game';
import { reveal, PATRON , dropHeldShot } from '../tactics';
import { overworld, say, tileOf, rngOf } from '../kit';
import { rollVs, TN } from '../rolls';
import { setBraced, setDowned } from '../unitstate';
import { restoreConds, setCondRounds } from '../magic';

// ---------- small helpers ----------
const ow = overworld;
const inFight = (h: Holder) => !!h.cb && !!h.u && !overworld(h.cb);
const tierII = (h: Holder) => h.tier === 'II';
/** A tile from a grid reference ("F6") or a key ("5,5"). */
/** Melee reach of the unit's melee option (fists when it holds a gun): 1, or 2 with a reach weapon. */
const reachOf = (u: Unit) => { const w: any = WEAPON[u.weapon]; if (!w || !isMelee(w)) return 1; return (w.properties || []).includes('reach_2') || w.id === 'lance' || w.grants?.effect?.op === 'reach' ? (w.grants?.effect?.op === 'reach' ? w.grants.effect.value : 2) : 1; };
/** A hit by someone (not a hazard, a trap's tick, bleeding or burning): what "a hit" and "a wound" mean here. */
const isHit = (src: any) => !!src?.by && !['bleed', 'burn', 'hazard', 'trap'].includes(src.type);
/** Self-inflicted damage (Mana Short, an Evoker's overload, Strain) never triggers the drop-to-0 savers (plan 6, Last Wall 1). */
const selfHarm = (ctx: any) => !!ctx.self || ['short', 'overload', 'strain', 'flux'].includes(ctx.src?.type);
const magicSrc = (src: any) => ['sigil', 'soul', 'elemental'].includes(src?.type);
const charState = (c: Character | null | undefined): Record<string, any> => (c ? (c.state ||= {}) : {});
/** Read a character's item state without creating it (stat queries and previews must not change state). */
const cs = (c: Character | null | undefined): Record<string, any> => c?.state || {};
/** The injury suffix rollInjury just wrote (resolveAttack pushes the attack line before on_hit). */
const lastLine = (cb: Combat) => cb.log[cb.log.length - 1] || '';
const legInjured = (c: Character) => !!c.injuries?.some((i) => i.loc === 'leg');
/** Base Movement before the leg factor (character.ts movement()). */
const baseMove = (c: Character) => 1 + 0.5 * ((c.attrs.agility || 1) - 1) + (ARMOUR[c.armourClass]?.move || 0);

// ======================================================================================================== PERKS

// ---------- Stonewall (Durability α; `bulwark`, the perk named Bulwark until rules 1.30) ----------
// I: an ally on the tile directly behind you (the ray from the attacker through you, 1 tile on) takes 25% less from
// ranged attacks. II: 50%, 2 tiles. Ranged: weapon shots, and Sigil/Soul/Elemental damage from someone not adjacent;
// area blasts (explosions) are not (plan 6, Bulwark 3; PROVISIONAL). Two Stonewalls don't stack: the best one counts.
export function behindLine(att: string, guard: string, ally: string, depth: number): boolean {
  const [ax, ay] = xy(att), [gx, gy] = xy(guard), n = Math.max(Math.abs(gx - ax), Math.abs(gy - ay)); if (!n) return false;
  for (let k = 1; k <= depth; k++) if (key(Math.round(gx + ((gx - ax) * k) / n), Math.round(gy + ((gy - ay) * k) / n)) === ally) return true;
  return false;
}
const rangedSrc = (src: any, t: Unit) => !!src?.by && !src.explosive && src.type !== 'explosion' && (src.type === 'weapon' ? !!src.ranged : magicSrc(src) && dist(src.by.pos, t.pos) > 1);
/** Where the line of fire starts: a Sigil spell's missile origin (src.from: the Line's glyph a Touch spell or a SEEK bolt
 * leaves from, a chain's last target, a turret; item 488), else the attacker's tile. */
const fireFrom = (src: any): string => src?.from || src?.by?.pos;
register({
  id: 'bulwark', claims: 'all',
  on: {
    damage_in: (ctx, h) => {
      const g = h.u, t: Unit = ctx.t; if (ctx.phase !== 'reduce' || !g || t === g || t.side !== g.side || !alive(g) || !ctx.hostile || !rangedSrc(ctx.src, t)) return;
      const frac = tierII(h) ? 0.5 : 0.25, depth = tierII(h) ? 2 : 1, prev = ctx._bulwark || 0;
      if (frac <= prev || !behindLine(fireFrom(ctx.src), g.pos, t.pos, depth)) return;
      ctx.dmg = (ctx.dmg / (1 - prev)) * (1 - frac); ctx._bulwark = frac;
      say(h.cb, g.name + ' stands in the line of fire (Stonewall): ' + t.name + ' takes ' + Math.round(frac * 100) + '% less.');
    },
    // The attack preview names it for the covered ally (the tooltip's damage chain): a multiplier shown only in the
    // preview, since the real reduction comes after armour (damage_in). The best Stonewall replaces a weaker one.
    damage_out: (ctx, h) => {
      const g = h.u, t: Unit = ctx.tgt; if (!ctx.preview || !g || t === g || t.side !== g.side || !alive(g) || ctx.att?.side === t.side || !rangedSrc(ctx.src, t)) return;
      const frac = tierII(h) ? 0.5 : 0.25, depth = tierII(h) ? 2 : 1; if (!behindLine(ctx.att.pos, g.pos, t.pos, depth)) return;
      const i = (ctx.mults as { v: number; label: string }[]).findIndex((m) => /^Stonewall/.test(m.label));
      if (i >= 0 && ctx.mults[i].v <= 1 - frac) return;
      const m = { v: 1 - frac, label: 'Stonewall (' + g.name + ')' }; if (i >= 0) ctx.mults[i] = m; else ctx.mults.push(m);
    },
  },
  brief: () => null,
});

// ---------- Shrug It Off (Durability α) ----------
// I: 2 AP, remove one Body debuff from yourself. II: 1 AP, and a shield of 10% of max HP (Healing and shields received
// apply; it doesn't stack). PROVISIONAL (plan 6, Shrug It Off 2): the action needs a Body debuff to remove, so the
// shield can't be farmed. Story and area map: it ends a story Body condition; a narrated one goes to the Narrator.
const SHRUG_ORDER = ['stunned', 'pinned', 'burning', 'bleeding', 'slowed', 'blinded', 'nausea', 'weakened', 'suppressed', 'grappled', 'dazed', 'prone'];
const NOT_SHRUGGED = new Set(['marked', 'augment_offline', 'emplaced', 'last_turn']);
const rankOf = (id: string) => { const i = SHRUG_ORDER.indexOf(id); return i < 0 ? 99 : i; };
const shrugList = (u: Unit) => bodyDebuffs(u).filter((id) => !NOT_SHRUGGED.has(id)).sort((a, b) => rankOf(a) - rankOf(b));
const storyBody = (h: Holder) => (h.c && h.g ? storyConds(h.g, h.c).filter((id) => condFamily(id) === 'body' && !NOT_SHRUGGED.has(id)) : []);
register({
  id: 'shrug_it_off', claims: 'all',
  actions: [{
    id: 'shrug_it_off', label: 'Shrug It Off', scope: ['combat', 'world', 'story'], target: 'none', ap: (h) => (tierII(h) ? 1 : 2),
    text: 'Remove one Body debuff from yourself. II: this costs 1 AP instead of 2, and you gain a shield of 10% of your max HP.',
    available: (h) => (inFight(h) ? (shrugList(h.u!).length ? true : 'No Body debuff to shrug off.') : true),
    preview: (h, a) => {
      if (inFight(h)) { const l = shrugList(h.u!); const pick = a.choice && l.includes(a.choice) ? a.choice : l[0]; return { lines: ['Removes ' + (pick || 'nothing') + (tierII(h) ? '; shield ' + Math.floor(itemAmount('perk:shrug_it_off', 'shield', [], { max_hp: h.u!.maxHp })) : '') + '.'] }; }
      const l = storyBody(h); return { lines: [l.length ? 'Ends ' + l[0] + '.' : 'The Narrator decides whether you shake off what ails you.'] };
    },
    run: (h, a) => {
      if (inFight(h)) {
        const u = h.u!, l = shrugList(u), pick = a.choice && l.includes(a.choice) ? a.choice : l[0];
        if (!pick) return 'No Body debuff to shrug off.';
        endCond(u, pick, h.cb!);
        let line = u.name + ' shrugs off ' + pick + ' (Shrug It Off)';
        if (tierII(h)) { const v = grantShield(h.cb!, u, itemAmount('perk:shrug_it_off', 'shield', [], { max_hp: u.maxHp }), u); emitFx(h.cb!, 'shield', { target: u.id, at: u.pos, amount: v }); line += ' · a ' + v + ' shield'; }
        emitFx(h.cb!, 'cond', { target: u.id, at: u.pos, id: pick, resisted: true });
        say(h.cb, line + '.'); return null;
      }
      const l = storyBody(h);
      if (l.length && h.c && h.g) { setStoryCond(h.g, h.c, l[0], 'scene', true); postStory(h, 'shrugs off ' + l[0] + '.'); return null; }
      postStory(h, 'shrugs it off.'); if (h.g && h.c) pendRuling(h.g, h.c, h.key, 'Shrug It Off: ends one Body condition you narrated on ' + h.c.name + ' (nausea, pinned, a cramp…), if any. Accept or refuse.');
      return null;
    },
  }],
  brief: () => 'out of combat: ends a narrated Body condition (Narrator judges)',
});

// ---------- Used to the Pain (Pain Threshold β): written in data only (data/perks.json; run by effects/triggers.ts, engine foundations 3) ----------

// ---------- Scar Tissue (Pain Threshold β) ----------
// Each wound (a hit that takes HP) this combat: +5% Elemental damage reduction, up to 25% (II: 40%). The total with the
// derived Elemental damage taken stays within the 60% cap (spec: Derived stats). II, PROVISIONAL (plan 6, Scar Tissue 2):
// "limb damage" is Injury resistance: each stack adds +5 points to the d100 injury resistance, up to +40.
// Its numbers are its data's (engine foundations 3): each stack is effects[0].value, up to effects[0].max (the count of
// stacks is max / value); II's Injury resistance per stack is effects[1].value in points of the d100.
const scarStack = (h: Holder) => h.info.effects[0] as { value: number; max: number };
register({
  id: 'scar_tissue', claims: 'all',
  on: {
    on_damaged: (ctx, h) => {
      if (ctx.t !== h.u || !isHit(ctx.src) || !inFight(h)) return;
      const { value, max } = scarStack(h), st = stateOf(h), cap = Math.round(max / value); if ((st.n || 0) >= cap) return;
      st.n = (st.n || 0) + 1;
      const inj = h.info.effects[1]; if (inj?.type === 'limb') { st.base ??= h.u!.injResist || 0; h.u!.injResist = st.base + Math.round(inj.value * 100) * st.n; }
    },
    damage_in: (ctx, h) => {
      if (ctx.phase !== 'reduce' || ctx.t !== h.u || !ELEMENTAL_TYPES.has(ctx.src?.dmgType || '')) return;
      const n = stateOf(h).n || 0; if (!n) return;
      const { value, max } = scarStack(h);
      const e = Math.min(0.6, h.u!.elemTaken || 0), room = Math.max(0, 1 - 0.4 / (1 - e)), s = Math.min(n * value, max, room); // 0.6 and 0.4: the 60% cap of the spec's Derived stats
      ctx.dmg = ctx.dmg * (1 - s);
    },
  },
  brief: () => null,
});

// ---------- Iron Stomach (Guts β) ----------
// I: Nausea and Fear last at most 1 round on you. II: immune (the generic immunity op cancels them before the save).
// Story: II auto-passes checks the Narrator tags fear, nausea, gore or horror, and a story Fear or Nausea on you ends at
// once; I: they end at the next scene or check.
const FEARISH = ['fear', 'nausea', 'gore', 'horror', 'disgust'];
const storyShake = (h: Holder, ids: string[]) => { if (!h.c || !h.g) return; for (const id of storyConds(h.g, h.c)) if (ids.includes(id)) setStoryCond(h.g, h.c, id, 'scene', true); };
register({
  id: 'iron_stomach', // Tier I's one round is data (engine foundations 3); the story's checks stay here
  on: {
    check_build: (ctx, h) => { if (ctx.c === h.c && tierII(h)) storyShake(h, ['fear', 'nausea']); },
    check_post: (ctx, h) => { if (ctx.c !== h.c || !tierII(h)) return; const tg: string[] = ctx.ck.tags || []; if (tg.some((x) => FEARISH.includes(x)) && ctx.auto !== 'fail') { ctx.auto = 'success'; ctx.labels.push('Iron Stomach'); } },
    check_result: (ctx, h) => { if (ctx.c === h.c) storyShake(h, ['fear', 'nausea']); },
    scene_change: (_ctx, h) => storyShake(h, ['fear', 'nausea']),
    story_cond_apply: (ctx, h) => { if (ctx.c === h.c && tierII(h) && (ctx.id === 'fear' || ctx.id === 'nausea')) { ctx.cancel = true; ctx.why = 'Iron Stomach'; } },
  },
  brief: (h) => (tierII(h) ? 'never nauseated or frightened (tag fear checks: auto-pass)' : 'shakes off nausea and fear at once'),
});

// Grapple became Iron Grip and Breaching Strike became a passive (rules 1.13): both are in perks/skeleton.ts.

// ---------- Earthbreaker (Raw Power Mastered) ----------
// Once per combat, 4 AP: strike a tile in melee reach. Every creature in the 3×3 around it (allies too, not you:
// PROVISIONAL, plan 6 Earthbreaker 1) takes your melee damage with no roll and no critical (fists if you hold a gun),
// less its armour, at least 1, shields first; a Downed one takes a death-save failure. Each is knocked Prone (no save).
// Every object with HP in the area is destroyed (cover becomes rubble; barrels chain). The weapon wears 1.
const area3 = (k: string) => { const [x, y] = xy(k), out: string[] = []; for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) out.push(key(x + dx, y + dy)); return out; };
register({
  id: 'earthbreaker', claims: 'all',
  actions: [
    {
      id: 'earthbreaker', label: 'Earthbreaker', scope: ['combat'], target: 'tile', ap: 'data', uses: { per: 'per_combat', n: 1 },
      preview: (h, a) => {
        if (!h.cb || !h.u) return; const k = tileOf(h.cb, a.tile); if (!k) return { ok: false, why: 'Pick a tile.' };
        if (dist(h.u.pos, k) > reachOf(h.u)) return { ok: false, why: 'Out of reach: your reach is ' + reachOf(h.u) + '.' };
        const ar = area3(k), hit = h.cb.units.filter((v) => v !== h.u && !v.dead && !v.surrendered && ar.includes(v.pos));
        const objs = objectsOf(h.cb).filter((o) => o.hp != null && o.hp > 0 && ar.includes(o.pos));
        return { tiles: ar, targets: hit.map((v) => v.id), lines: [hit.map((v) => v.name + (v.side === h.u!.side ? ' (ally!)' : '')).join(', ') || 'No one in the area.', objs.length ? (objs.length === 1 ? '1 object breaks.' : objs.length + ' objects break.') : 'No cover to break.'] };
      },
      run: (h, a, rng) => {
        const cb = h.cb!, u = h.u!, k = tileOf(cb, a.tile)!, ar = area3(k);
        let out = u.name + ' brings it down on ' + refOf(k) + ' (Earthbreaker)';
        emitFx(cb, 'explode', { at: k, radius: 1, what: 'earthbreaker' });
        for (const v of cb.units) {
          if (v === u || v.dead || v.surrendered || !ar.includes(v.pos)) continue;
          const d = attackDamage(cb, u, v, 'melee', h.c || null, {}), dmg = Math.max(1, Math.floor(d.total) - d.armour);
          const r = applyDamage(cb, v, dmg, { ...(d.src as any), shield: true, downedFails: 1, credit: 'all' });
          out += r.downedHit ? ' · ' + v.name + ' (Downed) takes a death-save failure' : ' · ' + v.name + ' takes ' + r.amount;
          emitFx(cb, 'hurt', { target: v.id, at: v.pos, dmg: r.dealt, why: 'earthbreaker', killed: v.dead || v.hp === 0 }); if (r.killed) fxFell(cb, v);
          if (!v.dead && !v.downed) out += applyCond(cb, rng, u, v, 'prone', undefined, undefined, { via: 'raw_power' });
        }
        for (const o of [...objectsOf(cb)]) if (o.hp != null && o.hp > 0 && ar.includes(o.pos)) out += damageObject(cb, o.pos, o.hp, 0, u);
        const w = WEAPON[u.weapon]; if (u.maxDur && w && isMelee(w)) u.dur = Math.max(0, (u.dur ?? u.maxDur) - 1);
        say(cb, out + '.'); checkOver(cb); return null;
      },
    },
    { id: 'earthbreaker_story', label: 'Earthbreaker', scope: ['story'], target: 'none', ap: 0, uses: { per: 'per_scene', n: 1 }, text: 'Once a scene: smash the floor, a wall or the cover around you. The Narrator decides what breaks.',
      run: (h, a) => { postStory(h, a.text || 'brings the ground down.'); if (h.g && h.c) pendRuling(h.g, h.c, h.key, 'Earthbreaker out of a fight: ' + (a.text || 'smashes floor, walls or cover in reach') + '. Rule what breaks.'); return null; } },
  ],
  brief: () => 'out of a fight, once a scene: smashes floor, walls or cover in reach (you rule what breaks)',
});

// ---------- Last Wall (Durability Mastered): written in data only (data/perks.json; run by effects/triggers.ts, engine foundations 3) ----------

// ---------- Walking Wounded (Pain Threshold Mastered) ----------
// Injuries never cost you AP or Movement: a head injury doesn't Daze you, a leg injury doesn't halve Movement (in a
// fight, from a critical or the Injured condition, and on the area map). The injury is still recorded; torso Bleeding
// and the arm's −2 still apply. Below half max HP you take 20% less damage (rules 1.13; PROVISIONAL, spec 14).
const wwSnap = (h: Holder) => { const st = stateOf(h); st.snap = { daz: h.u!.dazedNext || 0, mv: h.u!.movement, legs: (h.u!.injuries || []).filter((i) => i.loc === 'leg').length }; };
function wwUndo(h: Holder, line: string) {
  const u = h.u!, st = stateOf(h), s = st.snap; if (!s) return; st.snap = null;
  if (/head, Dazed/.test(line) && !s.daz && u.dazedNext) { endCond(u, 'dazed'); say(h.cb, u.name + ' shrugs off the blow to the head (Walking Wounded).'); }
  const legs = (u.injuries || []).filter((i) => i.loc === 'leg').length;
  if (legs > s.legs && u.movement < s.mv) { u.movement = s.mv; if (u.baseMove != null) u.baseMove = Math.max(u.baseMove, s.mv); say(h.cb, u.name + ' walks on the bad leg (Walking Wounded).'); }
}
register({
  id: 'walking_wounded', claims: [0], // effect 1 (20% less while Bloodied) is data (engine foundations 3)
  stat: (h, stat) => (stat === 'move' && h.c && legInjured(h.c) ? baseMove(h.c) * 0.5 : 0),
  on: {
    // A critical's injury: the 'injury' hook keeps the wound but not its Daze or the halved Movement.
    injury: (ctx, h) => {
      if (ctx.t !== h.u) return;
      if (ctx.loc === 'head') { ctx.noDaze = true; say(h.cb, h.u!.name + ' shrugs off the blow to the head (Walking Wounded).'); }
      if (ctx.loc === 'leg') { ctx.noHalve = true; say(h.cb, h.u!.name + ' walks on the bad leg (Walking Wounded).'); }
    },
    cond_apply: (ctx, h) => { if (ctx.t === h.u && ctx.id === 'injured') wwSnap(h); },
    cond_landed: (ctx, h) => { if (ctx.t === h.u && ctx.id === 'injured') { const st = stateOf(h); if (st.snap) { const legs = (h.u!.injuries || []).filter((i) => i.loc === 'leg').length; wwUndo(h, h.u!.dazedNext && !st.snap.daz ? 'head, Dazed' : legs > st.snap.legs ? 'leg' : ''); } } },
  },
  brief: () => 'injuries never slow this character down',
});

// ---------- Nothing Left to Fear (Guts Mastered) ----------
// Immune to Fear (the generic immunity). Allies within 3 tiles who can see you can't be made Afraid (no save), and an
// ally already Afraid who starts its turn in the aura loses it (PROVISIONAL, plan 6). Story: this character can't be
// frightened (Fear-tagged checks auto-pass; a story Fear ends at once).
register({
  id: 'nothing_left_to_fear', // the aura in a fight is data (engine foundations 3); the story's fear stays here
  on: {
    story_cond_apply: (ctx, h) => { if (ctx.c === h.c && ctx.id === 'fear') { ctx.cancel = true; ctx.why = 'Nothing Left to Fear'; } },
    check_build: (ctx, h) => { if (ctx.c === h.c) storyShake(h, ['fear']); },
    check_post: (ctx, h) => { if (ctx.c !== h.c) return; const tg: string[] = ctx.ck.tags || []; if ((tg.includes('fear') || tg.includes('horror')) && ctx.auto !== 'fail') { ctx.auto = 'success'; ctx.labels.push('Nothing Left to Fear'); } },
  },
  brief: () => 'can\'t be frightened; allies near them neither (story: you judge "near")',
});

// ---------- Bite the Bullet (Guts + Pain Threshold, Achieved) ----------
// Once per combat, when you would drop to 0 HP (and no other saver held you up), you stay up in a Last Turn state
// (at 1 HP, PROVISIONAL: the engine has no "up at 0 HP"; see the notes) and act normally to the end of your next turn
// (this turn, if it is yours now). Then you go Downed unless someone healed you. Each hit you take meanwhile is a
// death-save failure (two on a critical) instead of damage; at 3 you die (PROVISIONAL, plan 6 Bite the Bullet 2).
// Ordering: after Angel of the Trenches and Last Wall (priority 20).
const btbEnd = (h: Holder, why: string) => { const st = stateOf(h); st.lt = null; if (h.u) endCond(h.u, 'last_turn'); say(h.cb, why); };
register({
  id: 'bite_the_bullet', claims: 'all', priority: 20,
  on: {
    damage_in: (ctx, h) => {
      if (ctx.t !== h.u) return;
      const u = h.u!, st = stateOf(h);
      if (ctx.phase === 'reduce' && st.lt && ctx.dmg > 0) {
        ctx.dmg = 0; if (!isHit(ctx.src)) return;
        u.saves.fail += ctx.src.crit ? 2 : 1;
        say(h.cb, u.name + ' takes the hit on borrowed time: death-save failure ' + Math.min(3, u.saves.fail) + '/3 (Bite the Bullet).');
        if (u.saves.fail >= 3) { u.hp = 0; u.dead = true; btbEnd(h, u.name + ' dies on their feet.'); if (h.cb) { fxFell(h.cb, u); checkOver(h.cb); } }
        return;
      }
      if (ctx.phase !== 'would_drop_to_0' || ctx.floor != null || u.side !== 'pc' || selfHarm(ctx) || u.hp <= 0) return;
      if (!uses(h).take('per_combat', 1)) return;
      const own = !!h.cb && h.cb.order[h.cb.turn] === u.id && !h.cb.window;
      ctx.floor = 1; st.lt = { began: own };
      restoreConds(u, { last_turn: 99 }); // the perk's own marker: nobody is asked
      say(h.cb, u.name + ' bites the bullet: still standing for ' + (own ? 'the rest of this turn' : 'one more turn') + '.');
    },
    turn_start: (ctx, h) => { if (ctx.u === h.u && stateOf(h).lt) stateOf(h).lt.began = true; },
    turn_end: (ctx, h) => {
      const st = stateOf(h); if (ctx.u !== h.u || !st.lt || !st.lt.began) return;
      const u = h.u!; u.hp = 0; setDowned(u, true); setBraced(u, false); dropHeldShot(h.cb, u, 'down');
      btbEnd(h, u.name + '\'s Last Turn is over: Downed.'); if (h.cb) fxFell(h.cb, u);
    },
    heal_given: (ctx, h) => { if (ctx.t === h.u && stateOf(h).lt && ctx.n > 0) btbEnd(h, h.u!.name + ' is patched up in time: the Last Turn ends, still standing.'); },
  },
  brief: () => null,
});

// ---------- Siege Engine (Raw Power + Durability, Achieved): written in data only (data/perks.json; run by effects/triggers.ts, engine foundations 3) ----------

// ======================================================================================================== TRAITS

// ---------- Pain Eater: written in data only (data/traits.json; run by effects/triggers.ts, engine foundations 3) ----------

// ---------- Factory Made ----------
// Machine Body: immune to poison (the toxic spill hazard; a poison condition if one is ever applied), bleed (generic)
// and suffocation (Narrator). Field Repair restores 10 HP per Proficiency point (PROVISIONAL, plan 6 Factory Made 1;
// points, not Mastery): yourself in a fight (2 AP, Proficiency 3+, one spare-parts charge, not halved by Plug), or 10
// minutes out of a fight. An ally repairs you with their own Field Repair (combat/repair on you, game.ts).
// Plug: heals ×0.5 (here, so a healing Blessing is halved once, not twice), Blessings at half power, lightning and EMP ×2 (generic). "Some humans won't talk to a
// machine" is the Narrator's.
register({
  id: 'factory_made', claims: [0, 3, 4, 5], narrator: [2],
  on: {
    heal_in: (ctx, h) => { if (ctx.t === h.u && ctx.kind !== 'blessing') ctx.n = ctx.n * 0.5; }, // a Blessing's heal is already at half power
    combat_start: (ctx, h) => { if (h.u) { const l = (h.u.hazardImmune ||= []); if (!l.includes('toxic')) l.push('toxic'); } },
    cond_apply: (ctx, h) => { if (ctx.t === h.u && /^(poison|poisoned|toxin|suffocat)/.test(ctx.id)) { ctx.cancel = true; ctx.why = 'Factory Made'; } },
    blessing_in: (ctx, h) => { if (ctx.t === h.u && !ctx.handled) ctx.power = (ctx.power ?? 1) * 0.5; }, // Plug: half power (tactics.ts reads it back)
  },
  actions: [
    {
      id: 'self_repair', label: 'Field Repair (self)', scope: ['combat'], target: 'none', ap: 2,
      text: 'Patch your own machine body: heal 10 HP per Improvisation point. Uses one spare-parts charge. Needs Improvisation 3.',
      available: (h) => (!h.u ? false : (h.u.proficiency || 0) < 3 ? 'Needs Improvisation 3.' : !(h.u.parts || 0) ? 'No spare-parts charges.' : h.u.hp >= h.u.maxHp ? 'Already whole.' : true),
      preview: (h) => ({ lines: ['Heals ' + itemAmount('trait:factory_made', 'repair', [], { improvisation: h.u?.proficiency || 0 }) + ' HP. This repair is not halved the way other healing on you is.'] }),
      run: (h) => {
        const u = h.u!, n = itemAmount('trait:factory_made', 'repair', [], { improvisation: u.proficiency || 0 }), was = u.hp;
        u.parts = (u.parts || 0) - 1; u.hp = Math.min(u.maxHp, u.hp + n);
        emitFx(h.cb!, 'heal', { target: u.id, at: u.pos, amount: u.hp - was }); emitFx(h.cb!, 'repair', { unit: u.id, at: u.pos, dur: 1400 });
        say(h.cb, u.name + ' patches their own chassis: +' + (u.hp - was) + ' HP (' + u.hp + '/' + u.maxHp + ').'); return null;
      },
    },
    {
      id: 'repair_story', label: 'Field Repair (10 min)', scope: ['story', 'world'], target: 'none', ap: 0,
      text: 'Spend ten minutes and one spare-parts charge: heal 10 HP per Improvisation point. Needs Improvisation 3.',
      available: (h) => (!h.c ? false : (h.c.skills.proficiency || 0) < 3 ? 'Needs Improvisation 3.' : !packOf(h.c).some((x) => (x.item || x.id) === 'spare_parts' && x.qty > 0) ? 'No spare-parts charges.' : true),
      run: (h) => {
        const c = h.c!; let left = 1;
        c.pack = packOf(c).map((x) => { if ((x.item || x.id) !== 'spare_parts' || !left || x.qty <= 0) return x; left--; return { ...x, qty: x.qty - 1 }; }).filter((x) => x.qty > 0 || x.mags);
        const max = Math.max(c.hp, maxHpOf(c)), was = c.hp; c.hp = Math.min(max, c.hp + itemAmount('trait:factory_made', 'repair', [], { improvisation: c.skills.proficiency || 0 }));
        postStory(h, 'spends ten minutes on repairs: +' + (c.hp - was) + ' HP (' + c.hp + '/' + max + ').'); return null;
      },
    },
  ],
  brief: () => 'some humans won\'t talk to a machine; suffocation doesn\'t touch them',
});

// ---------- Glass Runner ----------
// Runner: +5 Initiative (generic). The first Move each combat: its first 1 AP of tiles is free (PROVISIONAL, plan 6
// Glass Runner 1, GAMEBREAKING as written). Glass, PROVISIONAL (plan 6 Glass Runner 2-3): "limb damage" is a critical
// whose injury lands on an arm or leg: that hit does +50% more; a broken leg quarters Movement (half again on top of
// everyone's half), on the area map too.
register({
  id: 'glass_runner', claims: [1, 2, 3],
  stat: (h, stat) => (stat === 'move' && h.c && legInjured(h.c) ? { mult: 0.5 } : 0),
  on: {
    move_cost: (ctx, h) => {
      if (ctx.u !== h.u || ctx.how !== 'move' || ctx.ap <= 0 || !inFight(h)) return;
      const st = stateOf(h); if (st.freeMove) return; st.freeMove = true;
      ctx.ap = Math.max(0, ctx.ap - 1); say(h.cb, h.u!.name + ' is off like a shot (Glass Runner: 1 AP of the first move free).');
    },
    damage_in: (ctx, h) => { if (ctx.phase === 'after' && ctx.t === h.u && ctx.src?.crit) stateOf(h).snapLegs = (h.u!.injuries || []).filter((i) => i.loc === 'leg').length; },
    on_hit: (ctx, h) => {
      if (ctx.tgt !== h.u || !ctx.crit || !h.cb || h.u!.dead || h.u!.downed) return;
      const line = lastLine(h.cb), m = /INJURY \(d6 \d\): (left|right) (arm|leg)/.exec(line); if (!m) return;
      const extra = Math.ceil(0.5 * (ctx.dmg || 0));
      if (extra > 0) { const r = applyDamage(h.cb, h.u!, extra, { by: ctx.att, type: 'weapon', melee: ctx.melee, ranged: !ctx.melee, shield: false, credit: 'all' }); say(h.cb, 'Glass bones: the ' + m[2] + ' takes ' + r.dealt + ' more (Glass Runner).'); if (r.killed) fxFell(h.cb, h.u!); }
      if (m[2] === 'leg' && (h.u!.injuries || []).filter((i) => i.loc === 'leg').length > (stateOf(h).snapLegs ?? 0)) h.u!.movement = Math.max(0.5, h.u!.movement / 2);
    },
  },
  brief: () => null,
});

// ---------- Right of Way: written in data only (data/traits.json; run by effects/triggers.ts, engine foundations 3) ----------

// ---------- Heavyworlder ----------
// Dense: can't be Shoved (generic), carry ×2, +2 Intimidation (generic); counts one size larger (no size rules: the
// Narrator's); heavy weapons one-handed (stat 'one_hand_heavy', read by equip's hands rule). Too Big: −3 Athletics (generic),
// −0.5 Movement (PROVISIONAL like Right of Way), attacks against them +2 to hit, and they can't hide in light: Hide on a
// lit tile is undone, and the story's stay-hidden roll fails when they aren't in the dark.
register({
  // carry ×2, −0.5 Movement, heavies in one hand (character.ts twoHands) and +2 to hit it are data (engine foundations 3);
  // 'one size larger' is the Narrator's (no stat: nothing asks a size). The light and the dark stay here.
  id: 'heavyworlder', narrator: [0],
  on: {
    hide: (ctx, h) => { if (ctx.u === h.u && h.cb && litAt(h.cb, h.u!.pos)) reveal(h.cb, h.u!, 'too big to hide in the light'); },
    notice: (ctx, h) => { if (ctx.c === h.c) stateOf(h).dark = !!ctx.dark; },
    stay_hidden: (ctx, h) => { if (ctx.c === h.c && !stateOf(h).dark) ctx.auto = 'fail'; },
  },
  brief: () => 'one size larger; no vents, crawlspaces, small doors, lifts, light vehicles; double rations',
});

// ---------- Crawler-Blooded ----------
// Chitin, PROVISIONAL (plan 6 Crawler-Blooded 1): a critical whose injury lands on an arm or leg does 30% less (given
// back after the hit). Climbing walls at half Movement: the Narrator's (no climbable map flag yet). Crawlers never
// attack you first: a crawler enemy can't target you until you have attacked a crawler this fight. Marked: humans who
// see your blood start hostile (Narrator); a Blessing from a Lumeri patron burns you for 10 first.
const provokedBy = (h: Holder, kind: string) => !!stateOf(h)['prov_' + kind];
const kindIs = (u: Unit, kind: string) => u.kind === kind || (u.tags || []).includes(kind);
register({
  id: 'crawler_blooded', claims: [0, 4], narrator: [1],
  on: {
    attack_preview: (ctx, h) => { if (ctx.tgt === h.u && kindIs(ctx.att, 'crawler') && !provokedBy(h, 'crawler') && !ctx.fail) ctx.fail = 'Crawlers never attack ' + h.u!.name + ' first.'; },
    attack_roll: (ctx, h) => { if (ctx.att === h.u && kindIs(ctx.tgt, 'crawler')) stateOf(h).prov_crawler = true; },
    on_hit: (ctx, h) => {
      if (ctx.tgt !== h.u || !ctx.crit || !h.cb || h.u!.dead || h.u!.downed) return;
      if (!/INJURY \(d6 \d\): (left|right) (arm|leg)/.test(lastLine(h.cb))) return;
      const back = Math.floor(itemAmount('trait:crawler_blooded', 'chitin', [], { damage: ctx.dmg || 0 })); if (back <= 0) return;
      h.u!.hp = Math.min(h.u!.maxHp, h.u!.hp + back); say(h.cb, 'Chitin turns part of the blow: ' + back + ' back (Crawler-Blooded).');
    },
    blessing_in: (ctx, h) => {
      if (ctx.t !== h.u || !h.cb) return;
      const bid = ctx.blessing?.id, p = Object.values(PATRON).find((x: any) => !!bid && (x.blessings || []).some((b: any) => b.id === bid)) || PATRON[charOfUnit(ctx.u)?.patron || '']; // the Blessing's patron (item 114), never the holder's own
      if ((p as any)?.faction !== 'lumeri') return;
      const r = applyDamage(h.cb, h.u!, itemAmount('trait:crawler_blooded', 'blessing_burn'), { by: null, type: 'true', dmgType: 'true', shield: false, credit: 'none' });
      say(h.cb, 'The Lumeri light burns ' + h.u!.name + ' for ' + r.dealt + ' (Crawler-Blooded).');
    },
  },
  brief: () => 'climbs walls at half Movement; humans who see their blood start hostile; Crawlers never strike first',
});

// ---------- Old Timer ----------
// Seen It All: +1 Echo at session start (2 in all, max 3: PROVISIONAL, plan 6 Old Timer 1, since everyone starts with
// 1); once per session, a pending Rumination, Lore Master or Analysis check succeeds automatically (a plain success).
// Old Bones: −10% max HP (generic), −0.5 Movement (PROVISIONAL, see Right of Way), and −2 on every Body-core skill roll
// the day after a night without a full rest (the Narrator sets traitState no_full_rest; a long rest clears it).
const SEEN = ['rumination', 'lore_master', 'analysis'];
const pendingSeen = (h: Holder, id?: string) => ((h.g?.checks || []) as any[]).filter((k) => !k.done && k.charId === h.c?.id && (!id || k.id === id) && k.skills.some((s: string) => SEEN.includes(s)));
register({
  id: 'old_timer', claims: [0, 1, 2, 4],
  stat: (h, stat) => (stat === 'move' ? -0.5 : /^skill:/.test(stat) && cs(h.c).no_full_rest && SKILL[stat.slice(6)]?.core === 'body' ? -2 : 0),
  on: {
    session_start: (ctx, h) => { if (h.c) { delete charState(h.c).no_full_rest; gainEcho(h.c, 1, 'Seen It All', ctx.g); } },
    rest: (ctx, h) => { if (h.c && ctx.kind === 'long') delete charState(h.c).no_full_rest; },
    check_post: (ctx, h) => { if (ctx.c === h.c && ctx.ck.seenItAll) { ctx.auto = 'success'; if (ctx.die === 20) ctx.die = 19; ctx.labels.push('Seen It All'); } },
  },
  actions: [{
    id: 'seen_it_all', label: 'Seen It All', scope: ['story', 'world'], target: 'none', ap: 0, uses: { per: 'per_session', n: 1 },
    text: 'Once a session: you\'ve seen this before. A waiting Rumination, Lore Master or Acuity check succeeds.',
    available: (h) => (pendingSeen(h).length ? true : 'No Rumination, Lore Master or Acuity check is waiting.'),
    preview: (h, a) => { const k = pendingSeen(h, a.checkId)[0]; return k ? { lines: ['Auto-success: ' + k.stakes] } : { ok: false, why: 'Pick a waiting Rumination, Lore Master or Acuity check.' }; },
    run: (h, a) => { const k = pendingSeen(h, a.checkId)[0]; if (!k) return 'No such check.'; k.seenItAll = true; k.auto = 'success'; postStory(h, 'has seen this before.'); return null; },
  }],
  brief: (h) => (cs(h.c).no_full_rest ? 'no full rest last night: −2 Body skills today' : 'set traitState no_full_rest after a night without a full rest'),
});

// ---------- The Brightest Light ----------
// Blaze: each foe this unit takes out this fight (1 each, bosses too) gives ×(1 + 0.1 per kill), up to ×1.5, a separate
// multiplier on weapon, Sigil and Soul damage. Burnout: weapons wear twice as fast (every point of wear is doubled,
// jams and full auto included), and after a fight they took part in (attacked or were hurt) they are Crashed: −2 on
// every d20 roll (checks, attacks, saves, initiative; not passives or death saves) until any rest.
const blaze = (h: Holder) => Math.min(0.5, 0.1 * (stateOf(h).kos || 0));
function wearSync(h: Holder) {
  const u = h.u; if (!u || !u.maxDur || !inFight(h)) return; // the area map: unit_built + action_done below
  const st = stateOf(h), d = u.dur ?? u.maxDur;
  if (st.dur != null && st.w === u.weapon && d < st.dur) { u.dur = Math.max(0, d - (st.dur - d)); }
  st.dur = u.dur ?? u.maxDur; st.w = u.weapon;
}
register({
  id: 'the_brightest_light', claims: 'all',
  stat: (h, stat, ctx) => (/^skill:/.test(stat) && cs(h.c).crashed && ctx?.roll !== 'passive' ? -2 : 0),
  on: {
    combat_start: (_ctx, h) => wearSync(h),
    on_kill: (ctx, h) => { if (ctx.by === h.u) { const st = stateOf(h); st.kos = (st.kos || 0) + 1; } },
    damage_out: (ctx, h) => { if (ctx.att === h.u && blaze(h)) ctx.mults.push({ v: 1 + blaze(h), label: 'Blaze (The Brightest Light)' }); },
    damage_in: (ctx, h) => {
      if (ctx.phase === 'after' && ctx.t === h.u && ctx.dealt > 0) stateOf(h).part = true;
    },
    attack_roll: (ctx, h) => { if (ctx.att === h.u) { stateOf(h).part = true; wearSync(h); } },
    on_hit: (ctx, h) => { if (ctx.att === h.u) wearSync(h); },
    on_miss: (ctx, h) => { if (ctx.att === h.u) wearSync(h); },
    turn_end: (ctx, h) => { if (ctx.u === h.u) wearSync(h); },
    combat_end: (ctx, h) => {
      if (!h.c || !h.u || !stateOf(h).part) return;
      wearSync(h); if (h.c.weaponState && h.u.dur != null && h.c.weapon === h.u.weapon) h.c.weaponState.dur = h.u.dur;
      charState(h.c).crashed = true;
      const c = h.c; if (ctx.cb) (ctx.cb.notes ||= []).push(c.name + ' crashes after the fight (The Brightest Light): −2 on every roll until they rest.');
    },
    rest: (_ctx, h) => { if (h.c) delete charState(h.c).crashed; },
    session_start: (_ctx, h) => { if (h.c) delete charState(h.c).crashed; },
    // The area map: the unit is rebuilt each action, so the wear an action did is read from its start and doubled at
    // its end (shots at objects included).
    unit_built: (ctx, h) => { if (ctx.world && ctx.u === h.u && h.u?.maxDur) (h.u as any)._blDur = h.u.dur ?? h.u.maxDur; },
    action_done: (ctx, h) => {
      const u = h.u; if (!ctx.world || ctx.u !== u || !u?.maxDur) return; const d0 = (u as any)._blDur, d = u.dur ?? u.maxDur;
      if (d0 != null && d < d0) u.dur = Math.max(0, d - (d0 - d)); delete (u as any)._blDur;
    },
  },
  brief: (h) => (cs(h.c).crashed ? 'Crashed: −2 on every roll until a rest' : null),
});

// ---------- Squad Anchor ----------
// Hold Fast: allies within 2 tiles (3 if the anchor hasn't moved on its turn in progress, or on its last turn when it
// isn't its turn) get +1 on condition saves and +1 Defense. Two anchors don't stack. Fixed Point: on a turn the anchor
// moves more than 2 tiles, the aura is off until its next turn and that turn starts with −1 AP. Death saves: +1 too
// (the 'death_save' hook asks every unit's items).
function anchorRange(h: Holder): number {
  const st = stateOf(h), u = h.u!, mine = !!h.cb && h.cb.order[h.cb.turn] === u.id;
  if (st.broken) return 0;
  return (mine ? (st.cur || 0) === 0 : (st.last || 0) === 0) ? 3 : 2;
}
const anchored = (h: Holder, t: Unit) => { const u = h.u; if (!u || !h.cb || t === u || t.side !== u.side || !alive(u)) return false; const r = anchorRange(h); return r > 0 && dist(u.pos, t.pos) <= r; };
register({
  id: 'squad_anchor', claims: 'all',
  on: {
    attack_preview: (ctx, h) => { if (!ctx._anchor && anchored(h, ctx.tgt)) { ctx._anchor = true; ctx.terms.push({ v: -1, label: 'Squad Anchor (+1 Dodge)' }); } },
    cond_apply: (ctx, h) => { if (!ctx._anchor && anchored(h, ctx.t)) { ctx._anchor = true; ctx.saveAdd = (ctx.saveAdd || 0) + 1; } },
    death_save: (ctx, h) => { if (!ctx._anchor && anchored(h, ctx.u)) { ctx._anchor = true; ctx.add += 1; } },
    moved: (ctx, h) => {
      if (ctx.u !== h.u || ctx.forced || !inFight(h)) return; const st = stateOf(h); st.cur = (st.cur || 0) + (ctx.tiles || 0);
      if (st.cur > 2 && !st.broken) { st.broken = true; st.pen = 1; say(h.cb, h.u!.name + ' leaves the line (Squad Anchor): the aura drops until their next turn.'); }
    },
    turn_start_pre: (ctx, h) => { if (ctx.u !== h.u) return; const st = stateOf(h); st.broken = false; st.cur = 0; if (st.pen) { ctx.penalties.push({ n: 1, why: 'Squad Anchor (Fixed Point)' }); st.pen = 0; } },
    turn_end: (ctx, h) => { if (ctx.u === h.u) { const st = stateOf(h); st.last = st.cur || 0; } },
  },
  brief: () => 'story saves you call: allies within 2 tiles of them get +1',
});

// ---------- Augmented ----------
// Chrome: one augment, picked once (c.state.augment: the creation pick, or the "Choose your augment" action until the
// creation screen offers it). Arm: ×1.2 Physical weapon damage. Eye: +2 Vision and sight in the dark. Legs: +1
// Movement (kept as written; plan 6 Augmented 1, Leon to decide) and a jump over one blocked tile. Maintenance: after
// each rest a Proficiency check vs 12 (PROVISIONAL) or the augment is offline until the next rest; EMP takes it offline
// for 2 turns (Augment Offline).
const AUG = ['arm', 'eye', 'legs'];
const augOf = (h: Holder): string | null => { const a = cs(h.c).augment ?? (h.c as any)?.augment; return AUG.includes(a) ? a : null; };
const augOn = (h: Holder, which: string) => augOf(h) === which && !cs(h.c).augmentOffline && !(h.u && condOn(h.u, 'augment_offline'));
register({
  id: 'augmented', claims: 'all',
  stat: (h, stat) => (stat === 'vision' && augOn(h, 'eye') ? 2 : stat === 'move' && augOn(h, 'legs') ? 1 : 0),
  on: {
    damage_out: (ctx, h) => { if (ctx.att === h.u && augOn(h, 'arm') && ctx.src?.type === 'weapon' && !ELEMENTAL_TYPES.has(ctx.src.dmgType || '')) ctx.mults.push({ v: 1.2, label: 'Augmented arm' }); },
    combat_start: (_ctx, h) => { if (!h.u) return; stateOf(h).gearDark = !!h.u.darkSight; h.u.darkSight = !!h.u.darkSight || augOn(h, 'eye'); },
    turn_start: (ctx, h) => { if (ctx.u === h.u && h.u && augOf(h) === 'eye') h.u.darkSight = !!stateOf(h).gearDark || augOn(h, 'eye'); },
    path_opts: (ctx, h) => { if (ctx.u === h.u && augOn(h, 'legs')) ctx.jump = true; },
    on_damaged: (ctx, h) => {
      if (ctx.t !== h.u || ctx.src?.dmgType !== 'emp' || !augOf(h) || !h.cb || h.u!.dead) return;
      const r = applyCond(h.cb, rngOf(h), ctx.src.by || null, h.u!, 'augment_offline', 2, undefined, { skipSave: true });
      if (h.u!.conds?.augment_offline) setCondRounds(h.u!, 'augment_offline', 2);
      if (augOf(h) === 'eye') h.u!.darkSight = !!stateOf(h).gearDark;
      say(h.cb, 'The EMP fries ' + h.u!.name + '\'s ' + augOf(h) + ' augment' + r + '.');
    },
    rest: (ctx, h) => {
      if (!h.c || !augOf(h) || !ctx.g?.rng) return;
      const c = h.c, rv = rollVs(null, ctx.g.rng, { mod: mod(c.skills.proficiency || 0), tn: TN.standard }), ok = rv.ok;
      charState(c).augmentOffline = !ok;
      postStory(h, 'maintenance on the ' + augOf(h) + ' augment: Improvisation ' + rv.text + ' · ' + (ok ? 'working.' : 'it won\'t work until the next rest.'));
    },
  },
  actions: [{
    id: 'augment_pick', label: 'Choose your augment', pick: ['arm', 'eye', 'legs'], pickLabel: 'Arm, eye or legs', scope: ['story', 'world'], target: 'none', ap: 0,
    text: 'Pick your augment. The choice is permanent. Arm: +20% Physical damage. Eye: +2 Vision and you see in the dark. Legs: +1 Movement and you can jump.',
    available: (h) => (augOf(h) ? false : true),
    preview: (_h, a) => (AUG.includes(String(a.choice)) ? { lines: ['The ' + a.choice + ' augment.'] } : { ok: false, why: 'Choose arm, eye or legs.' }),
    run: (h, a) => { if (!h.c || !AUG.includes(String(a.choice))) return 'Choose arm, eye or legs.'; charState(h.c).augment = a.choice; postStory(h, 'runs on a catalogue ' + a.choice + '.', { private: true }); return null; },
  }],
  brief: (h) => (augOf(h) ? augOf(h) + ' augment' + (cs(h.c).augmentOffline ? ' (offline until the next rest)' : '') + '; story jumps and darkness are yours' : 'augment not chosen yet'),
});

// ---------- Southern Fist ----------
// These Hands: with an unarmed weapon in the main hand and no weapon in the off hand: +1 AP each turn (within the +3
// cap) and ×1.2 damage on unarmed strikes. Not That: every attack with any other weapon costs +1 AP (a gun's melee
// strike uses fists and is exempt; Overwatch reactions are free). Bursts, full auto, weapon skills and paired attacks
// price their AP through attack_preview too (combat.ts volleyAp); the area map's round gets +1 through round_ap.
const unarmed = (id?: string | null) => !!id && WEAPON[id]?.category === 'unarmed';
const glovesOnly = (u: Unit) => unarmed(u.weapon) && !u.offWeapon;
register({
  id: 'southern_fist', claims: 'all',
  on: {
    turn_start_pre: (ctx, h) => { if (ctx.u === h.u && glovesOnly(h.u!)) ctx.grants.push({ n: 1, why: 'Southern Fist' }); },
    round_ap: (ctx, h) => { const c = h.c; if (ctx.c !== c || !c || WEAPON[c.weapon]?.category !== 'unarmed' || (c.offHand && WEAPON[c.offHand.id])) return; ctx.ap += 1; ctx.lines.push('Southern Fist'); }, // the area map's round
    damage_out: (ctx, h) => { if (ctx.att === h.u && glovesOnly(h.u!) && unarmed(ctx.src?.weapon)) ctx.mults.push({ v: 1.2, label: 'These Hands (Southern Fist)' }); },
    attack_preview: (ctx, h) => {
      if (ctx.att !== h.u || ctx.free) return;
      const w = WEAPON[h.u!.weapon], used = ctx.mode === 'melee' && w && !isMelee(w) ? 'fists' : h.u!.weapon;
      // A paired attack swings both hands: either one holding another weapon is an attack with it (+1 once).
      const off = ctx.mode === 'paired' && h.u!.offWeapon && !unarmed(h.u!.offWeapon);
      if (!unarmed(used) || off) ctx.ap += 1;
    },
  },
  brief: () => null,
});

// ---------- Raised by Orks ----------
// Ork Steel: +20% melee damage (generic). Orks parley instead of attacking: an Ork enemy can't target you until someone
// on your side has attacked an Ork this fight; outside fights the Narrator's. Can't Read: checks tagged text or
// text_based fail automatically (written documents, maps, text-based Rumination: PROVISIONAL, plan 6 Raised by Orks 1:
// in-world maps and documents, never the game's grid). −2 Charisma with humans who know your history (generic, tagged).
// The squad opt-in is roleplay only (plan 6 Raised by Orks 2).
register({
  id: 'raised_by_orks', claims: [2, 3],
  on: {
    attack_preview: (ctx, h) => { if (ctx.tgt === h.u && kindIs(ctx.att, 'ork') && !provokedBy(h, 'ork') && !ctx.fail) ctx.fail = 'The Orks would rather parley with ' + h.u!.name + '.'; },
    attack_roll: (ctx, h) => { if (h.u && ctx.att.side === h.u.side && kindIs(ctx.tgt, 'ork')) stateOf(h).prov_ork = true; },
    check_post: (ctx, h) => {
      if (ctx.c !== h.c) return; const tg: string[] = ctx.ck.tags || [];
      if (tg.includes('text') || tg.includes('text_based') || tg.includes('written')) { ctx.auto = 'fail'; ctx.labels.push('Can\'t Read (Raised by Orks)'); }
    },
  },
  brief: () => 'Orks parley with them; can\'t read documents or maps (tag such checks text)',
});

