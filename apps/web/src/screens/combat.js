// Combat, ported from design/canvas-build/combat.logic.js onto the engine's fight: real initiative, the grid,
// path arrows with their AP cost, real hit odds, and every action checked by the engine. Enemies act on their own.
import { DCLogic } from '../dc/runtime';
import { D, IMG, ART, zoneOf, spriteOf, tileBg, spriteStyle, lightboxVals, zoomer, mod, fmt, tokenVals, effectsOf, bodyFigure } from './shared';
import { WEAPON, musicTraitOf, songOf, active, apForTiles, paths, previewAttack, isMelee, attackApCost, analyzeCost, coverOf, difficultOf, dist, ROUNDS_PER_AP, refOf, notesAt, objectsOf, kindOf, visibility, litAt,
  SIGIL, SCHOOL, MODULE, MANA_START, FLUX_MAX, CORE_CHARGE, SPELL_AP, manaBand, condName, stageMult, glyphApOf, glyphsAt, findPattern, previewEvoke, previewOutburst,
  designCost, designAp, designRange, spellTargets, drawGlyph, scuff as scuffGlyph, vent as ventFlux, swapCore, syphon as syphonMp, crystallise as crystalliseCore, releaseOutburst } from '@engine';
import { act, getState, go } from '../game/store';
import { castFight } from '../game/cast';
import { openReport } from '../game/report';
import { glyphUri, scratchUri, heartUri, SIGIL_INK, SIGIL_GLOW, SOUL_INK } from '../game/glyphs';

const ARROWS = { '1,0': '→', '-1,0': '←', '0,1': '↓', '0,-1': '↑', '1,1': '↘', '-1,1': '↙', '1,-1': '↗', '-1,-1': '↖' };

// ---------- magic (spec: Mana, rules 1.2; look: docs/design/magic-presentation.md) ----------
// Sigils are Mind cyan and square; Outbursts are Soul violet warming to gold. Never mixed on one control.
const MAGIC = ['draw', 'evoke', 'scuff', 'vent', 'core', 'outburst', 'release', 'syphon', 'crystallise'];
const SIGIL_ACTS = ['draw', 'evoke', 'scuff', 'vent', 'core'];
const HOSTILE_INK = '#F65157';
/** Wall tints by element (a wall also carries its words in the tile label). */
const WALL_TINT = { fire: 'rgba(246, 138, 56, 0.24)', freeze: 'rgba(139, 222, 238, 0.22)', shock: 'rgba(227, 191, 81, 0.22)', stone: 'rgba(140, 111, 58, 0.32)', gale: 'rgba(163, 174, 194, 0.2)' };
const BOONS = ['guarded', 'inspired'];
const BAND_NAME = { thin: 'Thin', normal: 'Normal', rich: 'Rich', flooded: 'Flooded' };
/** Try an engine action on a throwaway copy of the fight: the engine's own refusal (or null), and the unit afterwards.
 *  How the UI learns costs and reasons without computing any rule itself. */
function dryRun(cb, uid, fn) {
  const units = cb.units.map((x) => ({ ...x, saves: { ...x.saves }, conds: x.conds ? { ...x.conds } : x.conds, mg: x.mg ? { ...x.mg, held: x.mg.held ? { ...x.mg.held } : null } : x.mg }));
  const c = { ...cb, units, log: [], notes: [], glyphs: [...(cb.glyphs || [])], zones: (cb.zones || []).map((z) => ({ ...z, hit: { ...(z.hit || {}) } })), mana: cb.mana ?? MANA_START };
  const u = units.find((x) => x.id === uid);
  let err = null;
  try { err = u ? fn(c, u, { state: 1 }) : 'No unit.'; } catch (e) { err = String((e && e.message) || e); }
  return { err, u, cb: c };
}
const patternShape = (p) => (p.shape === 'stack' ? 'Stack of ' + p.glyphs.length : p.shape === 'line' ? 'Line of ' + p.tiles.length : 'Ring of ' + p.tiles.length + ' around ' + refOf(p.centre));
const condChips = (u) => [...Object.entries(u.conds || {}).filter(([, n]) => n > 0).map(([id, n]) => ({ key: 'c-' + id, k: condName(id).replace(/ \(.*\)$/, '').toUpperCase() + ' · ' + n, t: condName(id) + ': ' + n + (n === 1 ? ' round' : ' rounds') + ' left.',
  style: 'padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; border: 1px solid ' + (BOONS.includes(id) ? '#6FEA77; color: #6FEA77' : '#F65157; color: #F65157') })),
  ...(u.shield > 0 ? [{ key: 'shield', k: '+' + u.shield + ' SHIELD', t: 'A shield of ' + u.shield + ': damage takes it first.', style: 'padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; border: 1px solid #E7EBF3; color: #E7EBF3' }] : [])];

export class CombatLogic extends DCLogic {
  constructor(props) { super(props); this.state = { action: 'move', hover: null, target: null };  }

  renderVals() {
    const st = getState(), g = st.game, me = st.me.id;
    const cb = castFight(g, g && g.combat, ART);
    // A new unit's turn starts clean: a spell (or its aim) picked for the last unit never carries over to this one.
    const curId = cb && active(cb) ? active(cb).id : null;
    if (curId !== this._curId) { if (this._curId !== undefined) Object.assign(this.state, { aim: null, glyphTile: null, hold: false, word: null, design: null, ...(MAGIC.includes(this.state.action) ? { action: 'move' } : {}) }); this._curId = curId; }
    const S = this.state;
    if (!cb) return { ...lightboxVals(this), initiative: [], tiles: [], legend: [], apPips: [], groups: [], log: [], who: {}, sel: {}, target: {}, toStory: () => go('main'), report: openReport, roundText: 'NO FIGHT', gridStyle: '', confirmText: 'Confirm', pad: {}, magicLegend: [] };
    const cur = active(cb), owner = (u) => (u.charId ? g.characters[u.charId]?.owner : null), playerOf = (pid) => g.players.find((p) => p.id === pid);
    const ring = (u) => (u.side === 'pc' ? playerOf(owner(u))?.color || '#7FD4FF' : '#F65157');
    const mineTurn = !cb.over && cur && cur.side === 'pc' && owner(cur) === me && !cur.downed;
    const ch = mineTurn ? g.characters[cur.charId] : null;
    const w = cur ? WEAPON[cur.weapon] : null, melee = w ? isMelee(w) : false;
    const P = mineTurn ? paths(cb, cur.pos, cur.id) : { dist: {}, prev: {} };
    const MOVES = ['move', 'sprint', 'disengage'], isMove = MOVES.includes(S.action);
    const moveCost = (k) => (S.action === 'sprint' ? 2 : S.action === 'disengage' ? 1 : apForTiles(P.dist[k], cur.bank, cur.movement));
    const reach = (k) => mineTurn && P.dist[k] !== undefined && k !== cur.pos && !cur.prone && moveCost(k) <= cur.ap
      && (S.action === 'sprint' ? !cur.noSprint && P.dist[k] <= Math.floor(3 * cur.movement) : S.action === 'disengage' ? P.dist[k] === 1 : true);
    const hv = isMove && S.hover && reach(S.hover) ? S.hover : null;
    const vis = visibility(cb, 'pc'), seenFoe = (u) => u.side === 'pc' || vis.seen.has(u.id);
    const route = {}; let moveAp = 0;
    if (hv) { moveAp = moveCost(hv); let k = hv; while (P.prev[k]) { const p = P.prev[k]; const [ax, ay] = p.split(',').map(Number), [bx, by] = k.split(',').map(Number); route[p] = ARROWS[(bx - ax) + ',' + (by - ay)]; k = p; } }
    const foes = cb.units.filter((u) => u.side === 'foe' && !u.dead);
    const tgtUnit = cb.units.find((u) => u.id === S.target && !u.dead && (!cur || u.id !== cur.id) && (u.side === 'pc' || seenFoe(u))) || foes.find((u) => !u.downed && seenFoe(u)) || null;
    const ATTACKS = ['shot', 'aimed', 'melee', 'burst', 'auto'];
    const attackMode = ATTACKS.includes(S.action) ? S.action : 'shot';
    const pv = mineTurn && tgtUnit && ATTACKS.includes(S.action) ? previewAttack(cb, cur, tgtUnit, attackMode) : null;
    const allies = cb.units.filter((u) => u.side === 'pc' && !u.dead && cur && u.id !== cur.id);
    const stimTarget = cb.units.find((u) => u.id === S.target && u.side === 'pc' && !u.dead);
    const covers = coverOf(cb), allObjs = objectsOf(cb), shootable = (k) => allObjs.some((o) => o.pos === k && o.hp != null && o.hp > 0), doorAt = (k) => allObjs.find((o) => o.pos === k && kindOf(o).door);
    const coverSel = S.action === 'cover' && shootable(S.tile) ? S.tile : null, doorSel = S.action === 'door' && doorAt(S.tile) ? S.tile : null, pickSel = S.action === 'pickup' && (cb.floor || []).some((f) => f.pos === S.tile && f.weapon) ? S.tile : null;
    const loadInfo = (() => { if (!cur || !w || w.reload !== 'magazine' || !cur.mags) return null; const cap = w.magazine || 0, open = cur.mags.filter((n) => n < cap).sort((a, b) => b - a); if (!open.length || !cur.loose) return null; const r = Math.min(cap - open[0], cur.loose, cur.ap * ROUNDS_PER_AP); return { rounds: r, ap: Math.ceil(r / ROUNDS_PER_AP) }; })();
    const sk = w && w.grants, skFx = (sk && sk.effect) || {}, skRuns = ['multi_shot', 'sweep'].includes(skFx.op), skPassive = sk && !skRuns && skFx.op !== 'narrator';
    // ---------- magic: what this unit can cast, previews and refusals straight from the engine ----------
    const mg = cur && cur.mg, words = mg ? mg.words : [], designs = mg ? mg.designs : [];
    const hasMagic = !!(mg && (words.length || designs.length || mg.evoker || mg.emanator)), isMagic = MAGIC.includes(S.action) && hasMagic;
    const mana = cb.mana ?? MANA_START, band = manaBand(mana), pcb = cb.mana == null ? { ...cb, mana } : cb;
    const tryIt = (fn) => (mineTurn && mg ? dryRun(pcb, cur.id, fn) : { err: cb.over ? 'The fight is over.' : 'Not your turn.' });
    const near = []; if (cur && mineTurn) { const [cx, cy] = cur.pos.split(',').map(Number); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = cx + dx, y = cy + dy; if (x >= 0 && y >= 0 && x < cb.map.w && y < cb.map.h) near.push(x + ',' + y); } }
    const TILE_ERR = /own tile or one next to you|Nothing can be drawn|at most 2 glyphs/;
    // Draw: each word's state on the first free tile near you (the engine's reason when none works).
    const wordInfo = {};
    if (S.action === 'draw' && mineTurn && mg) for (const wd of words) {
      let ok = null, why = null;
      for (const k of near) { const r = tryIt((c, u, rng) => drawGlyph(c, rng, u, wd, k)); if (!r.err) { ok = k; break; } if (!TILE_ERR.test(r.err)) { why = r.err; break; } }
      wordInfo[wd] = { ok: !!ok, why: ok ? null : why || 'No free tile next to you: a tile holds at most 2 glyphs.' };
    }
    const word = S.word && words.includes(S.word) ? S.word : words.find((wd) => wordInfo[wd] && wordInfo[wd].ok) || words[0] || null;
    const drawTry = {}; if (S.action === 'draw' && word && wordInfo[word] && wordInfo[word].ok) for (const k of near) drawTry[k] = tryIt((c, u, rng) => drawGlyph(c, rng, u, word, k));
    const drawReach = new Set(Object.keys(drawTry).filter((k) => !drawTry[k].err));
    const drawDiff = (k) => { const r = drawTry[k]; return r && !r.err ? { ap: Math.round((cur.ap - r.u.ap) * 10) / 10, charge: mg.charge - r.u.mg.charge, over: r.cb.log.some((l) => /OVERLOAD/.test(l)) } : null; };
    // Evoke: the pattern under the cursor, the one picked, and where it lands.
    // Only glyphs this side can see start a pattern (hostile ones hide in the fog, as on the grid).
    const seenGlyph = (k) => !!k && glyphsAt(pcb, k).some((gl) => gl.side === 'pc' || vis.tiles.has(k));
    const patAt = (k) => { if (!k || !cur || !seenGlyph(k)) return null; const p = findPattern(pcb, k, cur.pos); return typeof p === 'object' ? p : null; };
    const evTile = S.action === 'evoke' && S.glyphTile && seenGlyph(S.glyphTile) ? S.glyphTile : null;
    const evBase = mineTurn && mg && evTile ? previewEvoke(pcb, cur, evTile) : null;
    const evPv = evBase && evBase.needsAim && S.aim ? previewEvoke(pcb, cur, evTile, S.aim) : evBase;
    const evHover = evBase && evBase.needsAim && S.hover && S.hover !== S.aim ? previewEvoke(pcb, cur, evTile, S.hover) : null;
    const evPat = evTile ? (evBase && evBase.pattern) || patAt(evTile) : null, hoverPat = S.action === 'evoke' && (!evBase || !evBase.needsAim) ? patAt(S.hover) : null;
    // Outburst: the design picked, held or let go at once.
    const dsel = designs.find((d) => d.id === S.design) || designs[0] || null, holdIt = !!S.hold;
    const obPv = S.action === 'outburst' && mineTurn && mg && dsel ? previewOutburst(pcb, cur, dsel.id, holdIt ? undefined : S.aim || undefined, !holdIt) : null;
    const obHover = obPv && !holdIt && S.hover && S.hover !== S.aim && cur ? previewOutburst(pcb, cur, dsel.id, S.hover, true) : null;
    const held = mg && mg.held, heldD = held ? designs.find((d) => d.id === held.design) || null : null;
    const relTry = S.action === 'release' && held ? tryIt((c, u, rng) => releaseOutburst(c, rng, u, S.aim || undefined)) : null;
    const relHover = S.action === 'release' && held && mineTurn && S.hover && S.hover !== S.aim ? tryIt((c, u, rng) => releaseOutburst(c, rng, u, S.hover)) : null;
    const SIMPLE = { scuff: scuffGlyph, vent: ventFlux, core: swapCore, syphon: syphonMp, crystallise: crystalliseCore };
    const simpleTry = isMagic && SIMPLE[S.action] ? tryIt((c, u) => SIMPLE[S.action](c, u)) : null;
    // Where the chosen spell reaches and whom it would touch (for the grid overlay).
    const soulAct = S.action === 'outburst' || S.action === 'release' || S.action === 'syphon' || S.action === 'crystallise';
    const famInk = soulAct ? SOUL_INK : SIGIL_GLOW;
    // A hostile pattern shows only its tiles in sight, and only the words this side can read.
    const readable = new Set(cb.units.filter((u) => u.side === 'pc' && owner(u) === me && u.mg).flatMap((u) => u.mg.words));
    const patTilesOf = (p) => p.tiles.filter((k) => p.side === 'pc' || vis.tiles.has(k));
    const patternText = (p) => patternShape(p) + ': ' + p.glyphs.map((gl) => (p.side === 'pc' || (readable.has(gl.word) && vis.tiles.has(gl.pos)) ? gl.word.toUpperCase() : 'an unreadable glyph')).join(' · ');
    let mReach = new Set(), tgtIds = [], patTiles = new Set(), aimTile = null;
    if (isMagic && mineTurn) {
      if (S.action === 'draw') mReach = drawReach;
      if (S.action === 'evoke') {
        (evPat ? patTilesOf(evPat) : hoverPat ? patTilesOf(hoverPat) : []).forEach((k) => patTiles.add(k));
        if (evBase && evBase.needsAim) { aimTile = S.aim || null; const rg = evBase.range != null ? evBase.range : 1; for (let y = 0; y < cb.map.h; y++) for (let x = 0; x < cb.map.w; x++) { const k = x + ',' + y; if (dist(evTile, k) <= rg) mReach.add(k); } }
        const pv = evHover && evHover.ok ? evHover : evPv && evPv.ok ? evPv : null; if (pv) tgtIds = pv.targets;
      }
      if (S.action === 'outburst' && dsel && !holdIt && obPv) { aimTile = S.aim || null; for (let y = 0; y < cb.map.h; y++) for (let x = 0; x < cb.map.w; x++) { const k = x + ',' + y; if (dist(cur.pos, k) <= obPv.range) mReach.add(k); }
        const at2 = obHover && obHover.ok ? S.hover : obPv.ok ? S.aim : null; if (at2) tgtIds = spellTargets(pcb, cur, 'outburst', undefined, at2, dsel.id); }
      if (S.action === 'release' && heldD) { aimTile = S.aim || null; const rg = designRange(mg, heldD); for (let y = 0; y < cb.map.h; y++) for (let x = 0; x < cb.map.w; x++) { const k = x + ',' + y; if (dist(cur.pos, k) <= rg) mReach.add(k); }
        const at2 = relHover && !relHover.err ? S.hover : relTry && !relTry.err ? S.aim : null; if (at2) tgtIds = spellTargets(pcb, cur, 'release', undefined, at2); }
    }
    const tgtSet = new Set(tgtIds);
    /** The little tag over the hovered tile while aiming a spell. */
    const magicTag = (k) => {
      if (!isMagic || !mineTurn || k !== S.hover) return '';
      const who = (ids) => (ids.length ? ids.length + (ids.length === 1 ? ' target' : ' targets') : 'no one there');
      if (S.action === 'draw') { const d = drawDiff(k); return d ? word.toUpperCase() + ' · −' + d.ap + ' AP · −' + d.charge + ' charge' + (d.over ? ' · OVERLOAD' : '') : ''; }
      if (S.action === 'evoke') { if (evHover) return evHover.ok ? who(evHover.targets) : 'Can\'t land here'; return hoverPat && !evTile ? patternShape(hoverPat) : ''; }
      // A refusal shows its own reason, cut to its first clause ("You are already holding an Outburst"), not always "Can't reach".
      const why = (t) => (/reach|range|too far|out of/i.test(t || '') ? 'Can\'t reach' : String(t || 'Not now').split(/[:.]/)[0]);
      if (S.action === 'outburst' && obHover) return obHover.ok ? who(spellTargets(pcb, cur, 'outburst', undefined, k, dsel.id)) : why(obHover.why);
      if (S.action === 'release' && relHover) return !relHover.err ? who(spellTargets(pcb, cur, 'release', undefined, k)) : why(relHover.err);
      return '';
    };
    this._mg = { word, design: dsel ? dsel.id : null, needsAim: !!(evBase && evBase.needsAim), evTile, seenGlyph };
    const magicCost = !isMagic || !mineTurn ? 0 : S.action === 'draw' ? (drawDiff(S.hover) || {}).ap || (drawReach.size ? glyphApOf(cur) : 0) : S.action === 'evoke' ? (evPv ? evPv.ap : 0) : S.action === 'outburst' ? (obPv ? obPv.ap : 0) : SPELL_AP[S.action] || 0;
    const cost = isMagic ? magicCost : isMove ? moveAp : S.action === 'skill' ? (skFx.ap || 0) : S.action === 'repair' || S.action === 'song' ? 2 : S.action === 'shove' ? 2 : S.action === 'prone' || S.action === 'brace' ? 1 : S.action === 'overwatch' ? (w ? attackApCost(w, melee ? 'melee' : 'shot') : 2) : S.action === 'stim' ? 1 : S.action === 'reload' || S.action === 'clear' ? 2 : S.action === 'analyze' ? (cur ? analyzeCost(cur) : 2) : S.action === 'pickup' || S.action === 'door' ? 1 : S.action === 'load' ? (loadInfo ? loadInfo.ap : 0) : S.action === 'cover' ? (w ? attackApCost(w, melee ? 'melee' : 'shot') : 2) : pv ? pv.ap : 0;
    const tokOpt = (u, x, y) => { const p = u.side === 'pc' ? playerOf(owner(u)) : null; return { ref: refOf(x + ',' + y), ally: u.side === 'pc', player: p ? p.initials + ' · ' + p.name.toUpperCase() : '', color: p ? p.color : '#F65157', inFight: true, right: x >= cb.map.w / 2, up: y >= cb.map.h / 2 }; };
    const floorAt = {}; (cb.floor || []).forEach((f) => { (floorAt[f.pos] ||= []).push(f.text); });
    const condWord = (u) => (u.dead ? 'dead' : u.downed ? 'down' : u.hp >= u.maxHp ? 'unhurt' : u.hp > u.maxHp / 2 ? 'wounded' : 'badly hurt');

    const at = {}; cb.units.filter((u) => !u.dead && seenFoe(u)).forEach((u) => { at[u.pos] = u; });
    const sensedAt = {}; cb.units.filter((u) => vis.sensed.has(u.id)).forEach((u) => { sensedAt[u.pos] = u; });
    const solid = new Set(cb.map.solid), diff = difficultOf(cb);
    // The zone's map painting under the grid (spec: Campaigns, art): each tile shows its slice, colours become tints.
    const mapArt = ART(zoneOf(g)?.art?.map), TINT = { '#0D1119': 'rgba(10, 13, 19, 0.1)', '#1C2536': 'rgba(10, 13, 19, 0.55)', '#4A3A20': 'rgba(140, 111, 58, 0.22)', '#2A2113': 'rgba(140, 111, 58, 0.12)', '#3A2E1A': 'rgba(58, 46, 26, 0.3)', '#161C28': 'rgba(22, 28, 40, 0.3)' };
    const paint = (k, col) => (mapArt && !String(col).startsWith('rgba(255') ? tileBg(mapArt, k, cb.map.w, cb.map.h, TINT[col] || (String(col).startsWith('rgba') ? col : 'rgba(10, 13, 19, 0.1)')) : col);
    // The glyph layer: glyphs and standing zones by tile. Hostile glyphs show only where you can see, and only as words
    // your side can read (the rest are scratches).
    const glyphAt = {}, zoneAt = {}; (cb.glyphs || []).forEach((gl) => { (glyphAt[gl.pos] ||= []).push(gl); }); (cb.zones || []).forEach((z) => z.tiles.forEach((k) => { (zoneAt[k] ||= []).push(z); }));
    const glyphName = (gl) => (gl.side === 'pc' ? gl.word.toUpperCase() + ' (' + gl.who + ', ' + gl.left + (gl.left === 1 ? ' round' : ' rounds') + ')' : readable.has(gl.word) ? 'hostile ' + gl.word.toUpperCase() : 'an unreadable hostile glyph');
    const zoneName = (z) => (z.kind === 'veil' ? 'smoke (blocks sight)' : z.kind === 'light' ? 'magic light' : z.words.map((x) => x.toUpperCase()).join('·') + ' wall (' + (z.side === 'pc' ? 'yours' : 'hostile') + ', hurts whoever enters)') + ', ' + z.left + (z.left === 1 ? ' round' : ' rounds') + ' left';
    const zoneStyle = (zs) => { const z = zs.find((x) => x.kind === 'veil') || zs.find((x) => x.kind === 'wall') || zs[0];
      return 'position: absolute; inset: 0; z-index: 1; border-radius: 4px; pointer-events: none; ' + (z.kind === 'veil' ? 'background: rgba(120, 128, 142, 0.55); box-shadow: inset 0 0 12px rgba(200, 206, 216, 0.35)'
        : z.kind === 'light' ? 'background: rgba(255, 248, 225, 0.07); box-shadow: inset 0 0 14px rgba(255, 248, 225, 0.3)'
        : 'background: ' + (WALL_TINT[z.words[0]] || 'rgba(79, 200, 223, 0.16)') + '; border: 2px dashed ' + (z.side === 'pc' ? SIGIL_GLOW : HOSTILE_INK)); };
    const markStyle = (k, u) => {
      if (u && tgtSet.has(u.id)) return 'position: absolute; inset: -1px; z-index: 1; border-radius: 4px; pointer-events: none; border: 3px solid ' + famInk + '; box-shadow: 0 0 10px ' + famInk;
      if (k === aimTile) return 'position: absolute; inset: 0; z-index: 1; border-radius: 4px; pointer-events: none; border: 2px solid #FFFFFF';
      if (patTiles.has(k)) return 'position: absolute; inset: 0; z-index: 1; border-radius: 4px; pointer-events: none; border: 2px solid ' + SIGIL_GLOW + '; box-shadow: 0 0 8px ' + SIGIL_GLOW + ', inset 0 0 8px rgba(79, 200, 223, 0.35)';
      if (mReach.has(k)) return 'position: absolute; inset: 0; z-index: 1; border-radius: 4px; pointer-events: none; border: 1px dashed ' + famInk + '; background: ' + (soulAct ? 'rgba(174, 155, 255, 0.08)' : 'rgba(79, 200, 223, 0.08)');
      return '';
    };
    const tiles = [], axis = (key, text) => ({ key, isLabel: true, isTile: false, text });
    tiles.push(axis('h-', '')); for (let x = 0; x < cb.map.w; x++) tiles.push(axis('h' + x, refOf(x + ',0').replace(/\d+$/, '')));
    for (let y = 0; y < cb.map.h; y++) for (let x = -1; x < cb.map.w; x++) {
      if (x < 0) { tiles.push(axis('r' + y, String(y + 1))); continue; }
      const k = x + ',' + y, u = at[k], inRange = isMove && !u && reach(k), note = notesAt(cb.map, k)[0];
      const gls = (glyphAt[k] || []).filter((gl) => gl.side === 'pc' || vis.tiles.has(k)), zs = zoneAt[k] || [], mk = markStyle(k, u), mTag = magicTag(k);
      const magicNote = (gls.length ? ' · glyphs: ' + gls.map(glyphName).join(', ') : '') + zs.map((z) => ' · ' + zoneName(z)).join('') + (u && u.mg && u.mg.held ? ' · holding an Outburst (stage ' + u.mg.held.stage + ')' : '') + (u && (u.side === 'pc' || u.analyzedBy) ? condChips(u).map((c) => ' · ' + c.k.toLowerCase()).join('') : '');
      let bg = '#0D1119', border = '1px solid #151C29';
      if (solid.has(k)) { bg = '#1C2536'; border = '1px solid #232D3F'; }
      const cv = covers[k], ob = allObjs.find((o) => o.pos === k && !(cv && (o.kind === 'crate' || o.kind === 'pillar')) && o.kind !== 'rubble');
      if (cv) { bg = cv.kind === 'full' ? '#4A3A20' : '#2A2113'; border = (cv.kind === 'full' ? '2px solid #8C6F3A' : '1px solid #4A3A20'); }
      const spr = allObjs.filter((o) => o.pos === k && spriteOf(g, o)).sort((a, b) => (a.kind === 'rubble') - (b.kind === 'rubble'))[0];
      if (k === coverSel || k === pickSel || k === doorSel) border = '2px solid #FFFFFF';
      if (ob && kindOf(ob).door && !ob.open) { bg = '#3A2E1A'; }
      if (diff.has(k) && !u) { bg = '#161C28'; }
      if (inRange) { bg = 'rgba(231, 235, 243, 0.12)'; border = '1px dashed #E7EBF3'; }
      const sel = u && tgtUnit && u.id === tgtUnit.id;
      const isCur = u && cur && u.id === cur.id;
      tiles.push({
        key: k, isLabel: false, isTile: true, cover: cv, label: refOf(k) + ' · ' + (u ? u.name + (u.side === 'foe' ? ' (hostile)' : '') + (u.side === 'pc' || u.analyzedBy ? ' · HP ' + u.hp + '/' + u.maxHp : ' · looks ' + condWord(u)) + (u.downed ? ' · Downed' : '') : solid.has(k) ? 'Solid' : ob ? ob.name + (ob.hp != null ? ' · HP ' + ob.hp + '/' + ob.max : '') + (kindOf(ob).door ? (ob.locked ? ' · locked' : ob.open ? ' · open' : ' · closed') : '') + (ob.text ? ' · ' + ob.text : '') + (cv ? ' · ' + cv.kind + ' cover' : '') : cv ? (cv.kind === 'full' ? 'Full cover (blocks sight)' : 'Half cover (−5 to shots at whoever is behind it)') + ' · HP ' + cv.hp + '/' + cv.max : diff.has(k) ? ((cb.rubble || []).includes(k) ? 'Rubble' : 'Difficult terrain') : 'open') + (!vis.tiles.has(k) ? ' · out of sight' : '') + (cb.map.dark && !litAt(cb, k) ? ' · dark' : '') + (floorAt[k] ? ' · on the floor: ' + floorAt[k].join(', ') : '') + (note ? ' · ' + note : '') + magicNote, title: u ? '' : refOf(k) + (note ? ' · ' + note : '') + magicNote,
        unseen: !vis.tiles.has(k), sensed: !!sensedAt[k], dark: !!cb.map.dark && !litAt(cb, k),
        hasTok: !!u, t: u ? tokenVals(u, tokOpt(u, x, y)) : null, hasObj: !!ob && !u && !spr, objGlyph: ob ? kindOf(ob).glyph : '', objStyle: 'position: absolute; inset: 0 0 12px 0; display: grid; place-items: center; font-size: 20px; color: ' + (ob && (kindOf(ob).hazard || ob.kind === 'trap' || kindOf(ob).explodes) ? '#F65157' : ob && ob.kind === 'poi' ? '#FFFFFF' : '#C9D3E3'), hasFloor: !!floorAt[k], floor: floorAt[k] ? '▪' + (floorAt[k].length > 1 ? floorAt[k].length : '') : '',
        click: () => this.tileClick(k), hover: () => { if (this.state.hover !== k) this.setState({ hover: k }); },
        hasArrow: !!route[k] && k !== (cur && cur.pos), arrow: route[k] || '', hasCost: k === hv || !!mTag, cost: mTag || (moveAp ? '−' + moveAp + ' AP' : 'Paid') + ' · ' + P.dist[k] + (P.dist[k] === 1 ? ' tile' : ' tiles'),
        hasGlyphs: gls.length > 0, glyphs: gls.map((gl) => ({ key: gl.id, title: glyphName(gl), src: gl.side === 'pc' ? glyphUri(gl.word, SIGIL_INK, { glow: true }) : readable.has(gl.word) ? glyphUri(gl.word, HOSTILE_INK) : scratchUri(HOSTILE_INK),
          style: 'width: 16px; height: 16px; border-radius: 3px; background: rgba(5, 7, 11, 0.55); ' + (gl.side === 'pc' ? 'box-shadow: 0 0 6px rgba(79, 200, 223, 0.6)' : 'opacity: 0.85; box-shadow: 0 0 0 1px rgba(246, 81, 87, 0.5)') })),
        hasZone: zs.length > 0, zoneStyle: zs.length ? zoneStyle(zs) : '', hasMark: !!mk, markStyle: mk,
        hasHeart: !!(u && u.mg && u.mg.held), heart: u && u.mg && u.mg.held ? heartUri(u.mg.held.stage) : '', heartTitle: u && u.mg && u.mg.held ? u.name + ' is holding an Outburst: stage ' + u.mg.held.stage + ' (×' + stageMult(u.mg.held.stage) + ')' : '',
        sfx: isMagic && S.action === 'draw' && drawReach.has(k) ? 'none' : undefined,
        hasSprite: !!spr, sprite: spr ? spriteOf(g, spr) : '', spriteStyle: spr ? spriteStyle(spr) : '',
        hasImg: !!(u && u.img), img: (u && (ART(u.img) || u.img)) || '',
        imgStyle: 'position: relative; z-index: 2; width: 38px; height: 38px; object-fit: cover; ' + (u && u.side === 'pc' ? 'border-radius: 50%; border: 3px ' + (u.downed ? 'dashed ' : 'solid ') + ring(u) : 'border-radius: 4px; border: 2px solid ' + (sel ? '#FFFFFF' : '#F65157')) + (u && u.downed ? '; opacity: 0.5' : '') + (isCur ? '; box-shadow: 0 0 0 3px #FFFFFF' : ''),
        hasBadge: !!(u && !u.img), badge: u ? u.short : '',
        badgeStyle: 'position: relative; z-index: 2; display: grid; place-items: center; width: 36px; height: 36px; font-size: 11px; font-weight: 700; ' + (u && u.side === 'pc' ? 'border-radius: 50%; border: 2px dashed ' + ring(u) + '; color: ' + ring(u) : 'border-radius: 4px; border: 2px solid ' + (sel ? '#FFFFFF' : '#F65157') + '; color: #F65157') + (isCur ? '; box-shadow: 0 0 0 3px #FFFFFF' : '') + (u && u.downed ? '; opacity: 0.5' : ''),
        hasText: ((diff.has(k) && !mapArt) || !!cv) && !u, text: cv ? (ob ? cv.hp + '' : (cv.kind === 'full' ? 'FULL ' : 'HALF ') + cv.hp) : (cb.rubble || []).includes(k) ? 'RUBBLE' : 'ROUGH',
        style: 'position: relative; display: grid; place-items: center; padding: 0; border-radius: 4px; cursor: pointer; background: ' + (k === hv ? 'rgba(255, 255, 255, 0.28)' : route[k] && k !== (cur && cur.pos) ? 'rgba(255, 255, 255, 0.18)' : paint(k, bg)) + '; border: ' + (k === hv ? '2px solid #FFFFFF' : border) + (!vis.tiles.has(k) ? '; box-shadow: inset 0 0 0 46px rgba(5, 7, 11, ' + (cb.map.dark && !litAt(cb, k) ? '0.72' : '0.5') + ')' : cb.map.dark && !litAt(cb, k) ? '; box-shadow: inset 0 0 0 46px rgba(5, 7, 11, 0.25)' : ''),
      });
    }
    const initiative = cb.order.map((id) => cb.units.find((u) => u.id === id)).filter((u) => !u.dead).map((u) => ({
      key: u.id, zoom: zoomer(this, ART(u.img) || u.img || '', u.name, 'portrait'), name: seenFoe(u) ? u.name + (u.downed ? ' (down)' : '') : 'Unseen hostile', init: u.init, hasImg: !!u.img, noImg: !u.img, img: ART(u.img) || u.img || '', short: u.short,
      imgStyle: 'width: 36px; height: 36px; object-fit: cover; ' + (u.side === 'pc' ? 'border-radius: 50%; border: 3px solid ' + ring(u) : 'border-radius: 4px; border: 2px solid #F65157'),
      badgeStyle: 'display: grid; place-items: center; width: 36px; height: 36px; border-radius: ' + (u.side === 'pc' ? '50%' : '4px') + '; border: 2px solid ' + ring(u) + '; color: ' + ring(u) + '; font-size: 11px; font-weight: 700',
      style: 'display: flex; gap: 8px; align-items: center; padding: 6px 12px 6px 6px; border-radius: 999px; flex: none; ' + (cur && u.id === cur.id ? 'border: 1px solid #E7EBF3; background: #1C2536' : 'border: 1px solid #232D3F'),
    }));
    const ap = cur ? cur.ap : 0, maxAp = Math.max(6, ap);
    const apPips = Array.from({ length: maxAp }, (_, i) => ({ style: 'height: 14px; border-radius: 4px; ' + (i < ap - cost ? 'background: #E7EBF3' : i < ap ? 'background: transparent; border: 2px solid #FFFFFF; box-sizing: border-box' : 'background: #1C2536') }));
    const mv = cur ? cur.movement : 1;
    const heavy = w && /heavy/.test(w.category) && !isMelee(w), modes = (w && w.modes) || [];
    const offW = cur && cur.offWeapon ? WEAPON[cur.offWeapon] : null;
    const ITEMS = [
      ['MOVEMENT', [['move', 'Move', '1 AP / ' + mv + ' tiles', 'Each AP moves you ' + mv + ' tiles (Movement). Rough tiles count double. Leaving an enemy\'s reach without Disengaging invites an opportunity attack.'],
        ['sprint', 'Sprint', '2 AP', cur && cur.noSprint ? 'Not while Overburdened or in Juggernaut armour.' : 'Up to ' + Math.floor(3 * mv) + ' tiles (3 × Movement) for 2 AP.'],
        ['disengage', 'Disengage', '1 AP', 'Step 1 tile with no opportunity attacks.'],
        ['prone', cur && cur.prone ? 'Stand up' : 'Drop prone', '1 AP', 'Prone: ranged attacks against you −2, melee +2; you can\'t move until you stand.']]],
      ['ATTACK & DEFEND · ' + (w ? w.name.toUpperCase() : ''), [
        ...(melee ? [['melee', 'Strike', attackApCost(w, 'melee') + ' AP', 'd20 + ' + w.skill.replace('_', ' ') + ' vs Defense. ' + w.damage + ' damage.']]
          : [['shot', 'Shot', (w ? attackApCost(w, 'shot') : 2) + ' AP', 'd20 + Dexterity vs Defense; −5 if they\'re behind half cover. ' + (w && typeof w.damage === 'number' ? w.damage + ' damage. ' : '') + 'Heat +1.'],
            ['aimed', 'Aimed shot', '3 AP', '+2 to hit; crits on 19–20.'],
            ...(modes.includes('burst') ? [['burst', 'Burst', '3 AP', '3 rounds at one target, each later round −1 more.']] : []),
            ...(modes.includes('auto') ? [['auto', 'Full auto', '4 AP', '10 rounds: one roll at −2 against every enemy near the line to your target.']] : []),
            ['melee', 'Melee (fists)', '2 AP', 'd20 + Raw Power vs Defense. 10 damage.']]),
        ...(sk ? [['skill', sk.name + (skPassive ? ' (always on)' : ''), skRuns ? skFx.ap + ' AP' : skPassive ? '—' : 'Narrator', sk.text + (skPassive ? ' The engine applies it on every attack.' : skRuns ? '' : ' The engine doesn\'t run this one yet: use Say, and the Narrator rules it after the fight.')]] : []),
        ...(offW ? [['paired', 'Both hands (' + offW.name + ')', 'AP +1', 'Attack with both weapons in one action: AP = the higher cost + 1. Main hand −1, off hand −3 (better by 1 per 3 points in its skill).']] : []),
        ['shove', 'Shove', '2 AP', 'An adjacent enemy: d20 + Raw Power vs 10 + its best of Raw Power and Athletics. Pushed 1 tile, or prone if blocked. Shove them into fire.'],
        ['overwatch', 'Overwatch', (w ? attackApCost(w, melee ? 'melee' : 'shot') : 2) + ' AP', 'Hold a shot until your next turn: the first enemy that moves in your sight and range takes it, as your reaction.'],
        ...(heavy ? [['brace', 'Brace', '1 AP', 'Set the weapon: no −2 for the LMG, the .700 can fire, Recoil halved. Moving ends it.']] : []),
        ['cover', 'Shoot an object', (w ? attackApCost(w, 'shot') : 2) + ' AP', 'Cover, a barricade, a door, a barrel, a lamp: no roll, your weapon\'s damage to its HP. Broken cover becomes rubble; barrels explode.']]],
      ['UTILITY', [['reload', 'Reload', '2 AP', !w || w.magazine == null ? 'Nothing to reload.' : w.reload === 'loose' ? 'Top up from loose rounds (' + (cur.loose ?? 0) + ' carried). Nothing drops.' : 'Swap in your fullest spare ' + (w.reload_unit || 'magazine') + ' (' + (cur.mags ? cur.mags.length + ' left' : 'unlimited') + '). The one in the gun drops on the floor with any rounds left in it. ' + cur.ammo + ' / ' + w.magazine + ' loaded now.'],
        ['load', 'Load a magazine', loadInfo ? loadInfo.ap + ' AP' : '1 AP / ' + ROUNDS_PER_AP + ' rds', loadInfo ? 'Load ' + loadInfo.rounds + ' loose rounds into your fullest part-empty ' + (w.reload_unit || 'magazine') + '.' : 'Load loose rounds into an empty or part-empty magazine, 1 AP per ' + ROUNDS_PER_AP + ' rounds. You need both.'],
        ['clear', 'Clear a jam', '2 AP', 'A jammed gun can\'t fire until cleared.'],
        ['repair', 'Field Repair', '2 AP', 'Proficiency 3+, one spare-parts charge (' + (cur && cur.parts || 0) + ' left): +10% durability, +5% per Proficiency above 3. Weapon ' + (cur && cur.maxDur ? (cur.dur ?? cur.maxDur) + '/' + cur.maxDur : 'n/a') + '.'],
        ['pickup', 'Pick up', '1 AP', 'Take everything on your tile or one adjacent tile (marked ▪): dropped magazines, empty or not.'],
        ['door', 'Open or close a door', '1 AP', 'An adjacent door. Closed, it blocks movement and sight. Locked doors need a check after the fight, or enough damage.'],
        ['stim', 'Stim an ally', '1–2 AP', 'Adjacent ally: stabilise a Downed ally at 1 HP (1 AP for a Medic, 2 for others), or heal 30 × your Healing given. Stops Bleeding. Uses a stim' + (ch ? ' (' + ch.stims + ' left)' : '') + '.'],
        ...(ch && musicTraitOf(ch) && songOf(ch) ? [['song', 'Play my song', '2 AP', 'Your Musek Blestor: your favourite song takes over the room until the fight ends, and your music trait\'s bonus is on while it plays. It can replace another holder\'s kept-on song, never a spotlight.']] : []),
        ['analyze', 'Analyze', (cur ? analyzeCost(cur) : 2) + ' AP', 'Read one enemy: its HP, Defense, armour and status, for the whole squad, the rest of the fight. Range ' + (4 + (cur && cur.analysis || 0)) + ' tiles; needs line of sight. No roll.']]],
    ];
    // Magic, two groups that never mix: Sigils (Mind cyan) and Outbursts (Soul violet). Only for a unit that has magic.
    if (hasMagic) {
      const sig = words.length > 0 || mg.evoker, soul = designs.length > 0 || mg.emanator;
      const MG = [];
      if (sig) MG.push(['MAGIC · SIGILS', [
        ['draw', 'Draw a glyph', glyphApOf(cur) + ' AP', 'Pick a word on the glyph keyboard, then your own tile or one next to you. It costs the word\'s charge from your Evoker and adds 1 Flux.'],
        ['evoke', 'Evoke', SPELL_AP.evoke + ' AP', 'Fire a pattern of glyphs: a Stack (2 on one tile), a Line (a straight row, fired from its far end) or a Ring (around one empty tile). Stand on or next to it. Charge ' + mg.charge + '/' + CORE_CHARGE + '.'],
        ['scuff', 'Scuff', SPELL_AP.scuff + ' AP', 'Wipe out the glyphs on the tile you stand on.'],
        ['vent', 'Vent Flux · ' + mg.flux + '/' + FLUX_MAX, SPELL_AP.vent + ' AP', 'Pour your Flux into the air: the mana meter rises by as much. Past ' + FLUX_MAX + ' Flux the Evoker overloads.'],
        ['core', 'Swap core', SPELL_AP.core + ' AP', 'Load a fresh mana core: ' + CORE_CHARGE + ' charge. ' + mg.cores + (mg.cores === 1 ? ' spare core' : ' spare cores') + ' carried.']], SIGIL_GLOW]);
      if (soul) MG.push(['MAGIC · OUTBURSTS', [
        ...(designs.length ? [['outburst', 'Outburst', designs.length === 1 ? designAp(mg, designs[0]) + ' AP' : designs.length + ' designs', 'Pull the bots through your heart: pick a design, then let it go at once or hold it. Held, it grows a stage each turn and strains you.']] : []),
        ...(held ? [['release', 'Release · stage ' + held.stage, SPELL_AP.release + ' AP', 'Let the held ' + (heldD ? heldD.name : 'Outburst') + ' go at stage ' + held.stage + ' (×' + stageMult(held.stage) + ').']] : []),
        ...(mg.emanator ? [['syphon', 'Syphon', SPELL_AP.syphon + ' AP', 'Draw MP from the air (' + band.syphon_mp + ' in ' + BAND_NAME[band.id] + ' air, times your Syphon bonus). The meter drops.'],
          ['crystallise', 'Crystallise', SPELL_AP.crystallise + ' AP', 'Squeeze the air into one standard mana core. Needs mana 10 or more (Normal air or richer); the meter drops by 10.']] : [])], SOUL_INK]);
      ITEMS.splice(2, 0, ...MG.filter((gr) => gr[1].length));
    }
    const groups = ITEMS.map(([name, items, ink]) => ({ name, nameStyle: 'font-size: 11px; letter-spacing: 0.16em; color: ' + (ink === SIGIL_GLOW ? SIGIL_INK : ink || '#A3AEC2'), items: items.map(([id, label, costText, text]) => ({
      name: label, cost: costText, text, locked: !mineTurn, pressed: S.action === id ? 'true' : 'false', pick: () => { const t = cb.units.find((x) => x.id === this.state.target); this.setState({ action: id, target: id === 'stim' || (t && t.side === 'pc') ? null : this.state.target, aim: null, glyphTile: null }); },
      costStyle: 'font-size: 12px; font-weight: 700; color: #E7EBF3',
      style: 'display: flex; justify-content: space-between; align-items: center; min-height: 40px; padding: 0 12px; border-radius: 8px; font-family: inherit; font-size: 14px; cursor: pointer; ' + (ink ? 'border-left: 3px solid ' + ink + '; ' : '') +
        (S.action === id ? 'border-top: 1px solid ' + (ink || '#E7EBF3') + '; border-right: 1px solid ' + (ink || '#E7EBF3') + '; border-bottom: 1px solid ' + (ink || '#E7EBF3') + '; ' + (ink ? '' : 'border-left: 1px solid #E7EBF3; ') + 'background: #1C2536; color: #E7EBF3' : 'border-top: 1px solid #232D3F; border-right: 1px solid #232D3F; border-bottom: 1px solid #232D3F; ' + (ink ? '' : 'border-left: 1px solid #232D3F; ') + 'background: #10151F; color: #E7EBF3') })) }));
    const actName = { skill: sk ? sk.name : 'Weapon skill', paired: 'Both hands', repair: 'Field Repair', song: 'Play my song', sprint: 'Sprint', disengage: 'Disengage', prone: cur && cur.prone ? 'Stand up' : 'Drop prone', burst: 'Burst', auto: 'Full auto', shove: 'Shove', overwatch: 'Overwatch', brace: 'Brace', move: 'Move', shot: 'Shot', aimed: 'Aimed shot', melee: 'Melee', reload: 'Reload', clear: 'Clear a jam', stim: 'Stim an ally', analyze: 'Analyze', cover: 'Shoot an object', door: 'Open or close a door', pickup: 'Pick up', load: 'Load a magazine',
      draw: 'Draw a glyph', evoke: 'Evoke', scuff: 'Scuff', vent: 'Vent Flux', core: 'Swap core', outburst: 'Outburst', release: 'Release', syphon: 'Syphon', crystallise: 'Crystallise' }[S.action];
    const sel = { name: actName + (isMove ? ' · ' + (hv ? moveAp + ' AP for ' + P.dist[hv] + (P.dist[hv] === 1 ? ' tile' : ' tiles') : '1 AP per ' + mv + ' tiles') : pv ? ' · ' + pv.ap + ' AP' : ''),
      text: !mineTurn ? (cb.over ? 'The fight is over.' : cur && cur.side === 'foe' ? cur.name + ' is acting…' : cur ? 'Waiting for ' + (playerOf(owner(cur))?.name || 'a player') + ' (' + cur.name + ').' : '') : isMove ? 'Hover a highlighted tile to see the path and its AP cost; click to move.' : S.action === 'stim' ? (stimTarget ? 'Target: ' + stimTarget.name + '. Confirm to use a stim.' : 'Click an adjacent ally.') : S.action === 'skill' ? (skRuns ? (skFx.op === 'multi_shot' ? (tgtUnit ? sk.name + ' at ' + tgtUnit.name + '. Confirm.' : 'Click a hostile.') : 'Confirm to strike every adjacent enemy.') : skPassive ? 'Always on: it applies to every attack you make.' : 'Not run by the engine yet: use Say, and the Narrator rules it.') : S.action === 'paired' ? (tgtUnit ? 'Both hands at ' + tgtUnit.name + '. Confirm.' : 'Click a hostile.') : S.action === 'repair' ? 'Confirm to repair your weapon.' : S.action === 'song' ? 'Confirm to play your song for the room.' : ['prone', 'brace', 'overwatch'].includes(S.action) ? 'Confirm to ' + ({ prone: cur.prone ? 'stand up' : 'drop prone', brace: 'brace your weapon', overwatch: 'hold a shot on overwatch' }[S.action]) + '.' : S.action === 'shove' ? (tgtUnit ? 'Shove ' + tgtUnit.name + (Math.max(Math.abs(+tgtUnit.pos.split(',')[0] - +cur.pos.split(',')[0]), Math.abs(+tgtUnit.pos.split(',')[1] - +cur.pos.split(',')[1])) > 1 ? ': get next to it first.' : '. Confirm.') : 'Click an adjacent enemy.') : S.action === 'cover' ? (coverSel ? 'Target: ' + allObjs.find((o) => o.pos === coverSel && o.hp > 0).name + ', HP ' + allObjs.find((o) => o.pos === coverSel && o.hp > 0).hp + '. Confirm to shoot it.' : 'Click an object with HP.') : S.action === 'door' ? (doorSel ? (doorAt(doorSel).open ? 'Close' : 'Open') + ' the door at ' + refOf(doorSel) + '. Confirm.' : 'Click an adjacent door.') : S.action === 'pickup' ? (pickSel ? 'Pick up: ' + (cb.floor || []).filter((f) => f.pos === pickSel).map((f) => f.text).join(', ') + '.' : 'Click your tile or an adjacent tile marked ▪.') : S.action === 'load' ? (loadInfo ? 'Confirm to load ' + loadInfo.rounds + ' rounds for ' + loadInfo.ap + ' AP.' : 'Nothing to load: you need loose rounds and a part-empty magazine.') : S.action === 'analyze' ? (tgtUnit ? (tgtUnit.analyzedBy ? tgtUnit.name + ' is already analyzed.' : 'Target: ' + tgtUnit.name + '. Click a hostile to change. Confirm to analyze.') : 'Click a hostile.') : pv ? (pv.ok ? (tgtUnit && tgtUnit.side === 'pc' ? 'FRIENDLY FIRE: you are attacking ' + tgtUnit.name + '. Confirm if you mean it.' : 'Click a hostile to change target. Confirm to attack.') : pv.why) : 'Click a hostile to target it.',
      extra: mineTurn && isMove && cur.bank ? cur.bank + ' paid-for tile' + (cur.bank > 1 ? 's' : '') + ' left this turn.' : '' };
    if (isMagic && mineTurn) {
      const names = (ids) => ids.map((id) => cb.units.find((x) => x.id === id)).filter(Boolean).map((x) => x.name + (x.side === 'pc' ? (x.id === cur.id ? ' (you!)' : ' (ally!)') : ''));
      const hits = (ids) => (ids.length ? ' It touches ' + names(ids).join(', ') + '.' : ' Nobody is there.');
      const meter = 'Charge ' + mg.charge + '/' + CORE_CHARGE + ' · Flux ' + mg.flux + '/' + FLUX_MAX + ' · ' + mg.cores + (mg.cores === 1 ? ' spare core' : ' spare cores');
      const heart = (mg.emanator ? 'MP ' + Math.round(mg.mp) + '/' + mg.mpMax + ' · ' : 'No Emanator: Outbursts draw on the air · ') + 'Strain ' + mg.strain + '/' + mg.strainLimit;
      const simpleWhy = simpleTry && simpleTry.err;
      const VERB = { scuff: 'scuff out the glyphs under you', vent: 'vent ' + mg.flux + ' Flux into the air', core: 'load a fresh core', syphon: 'syphon MP from the air', crystallise: 'crystallise a mana core' };
      if (S.action === 'draw') {
        const wi = word && wordInfo[word], hd = drawDiff(S.hover) || (drawReach.size ? drawDiff([...drawReach][0]) : null);
        sel.name = 'Draw' + (word ? ' ' + word.toUpperCase() : '') + ' · ' + (hd ? hd.ap : glyphApOf(cur)) + ' AP' + (word ? ' · ' + (hd ? hd.charge : SIGIL[word].charge) + ' charge' : '');
        sel.text = !word ? 'You know no Sigil words.' : wi && !wi.ok ? wi.why : 'Click a highlighted tile (yours or one next to you) to draw ' + word.toUpperCase() + '. ' + (SIGIL[word].text || '');
        sel.extra = meter + (hd && hd.over ? ' · WARNING: this glyph would OVERLOAD your Evoker.' : '');
      } else if (S.action === 'evoke') {
        sel.name = 'Evoke · ' + (evPv ? evPv.ap : SPELL_AP.evoke) + ' AP' + (evPv && evPv.charge ? ' · ' + evPv.charge + ' charge' : '');
        sel.text = !evTile ? ((cb.glyphs || []).length ? 'Click a glyph tile. Hover one to see the pattern it makes.' : 'No glyphs on the ground: Draw first.')
          : (evPat ? patternText(evPat) + '. ' : '') + (evPv.ok ? (evPat && evPat.words.includes('stay') ? 'It will stand where it is.' : hits(evPv.targets).trim()) + ' Confirm to evoke.' : evBase.needsAim && !S.aim ? 'Click where it lands: within ' + (evBase.range ?? 1) + (evBase.range === 1 ? ' tile' : ' tiles') + ' of the stack.' : evPv.why);
        sel.extra = meter;
      } else if (S.action === 'outburst') {
        sel.name = 'Outburst' + (dsel ? ' · ' + dsel.name : '') + (obPv && (obPv.ok || obPv.cost) ? ' · ' + obPv.cost + ' MP · ' + obPv.ap + ' AP' : ''); // a refusal comes back with no costs
        sel.text = !dsel ? 'You have no Outburst designs.' : holdIt ? (obPv.ok ? 'Hold it in your heart: it grows a stage at the start of each of your turns (stage 2 hits ×' + stageMult(2) + ', stage 4 ×' + stageMult(4) + '), and holding strains you. Confirm to begin.' : obPv.why)
          : !S.aim && obPv.why === 'Pick a target tile.' ? 'Click a tile or unit within ' + obPv.range + ' tiles to let it go at once, or choose Hold.' : obPv.ok ? 'At ' + refOf(S.aim) + '.' + hits(tgtIds) + ' Confirm to let it go.' : obPv.why;
        sel.extra = (obPv && (obPv.ok || obPv.cost) ? 'Strain +' + obPv.strain + ' · ' : '') + heart;
      } else if (S.action === 'release') {
        sel.name = 'Release' + (heldD ? ' · ' + heldD.name : '') + (held ? ' · stage ' + held.stage + ' ×' + stageMult(held.stage) : '') + ' · ' + SPELL_AP.release + ' AP';
        sel.text = !held ? 'Nothing held.' : !relTry.err ? 'At ' + refOf(S.aim) + '.' + hits(tgtIds) + ' Confirm to release.' : relTry.err === 'Pick a target tile.' && heldD ? 'Click a tile or unit within ' + designRange(mg, heldD) + ' tiles.' : relTry.err;
        sel.extra = heart;
      } else {
        sel.name = actName + ' · ' + (SPELL_AP[S.action] || 0) + ' AP';
        sel.text = simpleWhy ? simpleWhy : 'Confirm to ' + VERB[S.action] + '.';
        sel.extra = S.action === 'syphon' || S.action === 'crystallise' ? 'Mana ' + mana + ' (' + BAND_NAME[band.id] + ') · ' + heart : S.action === 'scuff' ? ((glyphAt[cur.pos] || []).length ? 'Under you: ' + glyphAt[cur.pos].map(glyphName).join(', ') + '.' : 'No glyphs under you.') : meter;
      }
    }
    const target = tgtUnit ? { zoom: zoomer(this, tgtUnit.img || '', tgtUnit.name, 'portrait'), name: tgtUnit.name, img: tgtUnit.img || '', hasImg: !!tgtUnit.img,
      known: !!tgtUnit.analyzedBy, hpFill: 'width: ' + Math.round(tgtUnit.hp / tgtUnit.maxHp * 100) + '%; height: 100%; background: #F65157',
      line: tgtUnit.analyzedBy ? 'HP ' + tgtUnit.hp + ' / ' + tgtUnit.maxHp + ' · Defense ' + tgtUnit.def + ' · Armour ' + tgtUnit.armour + (effectsOf(tgtUnit).length ? ' · ' + effectsOf(tgtUnit).map((f) => f[0]).join(', ') : '')
        : 'Looks ' + condWord(tgtUnit) + ' · ' + (tgtUnit.tier || 'hostile') + ' · Analyze to see its HP and status',
      odds: pv ? (pv.ok ? 'Hit ' + pv.pct + '% · need ' + pv.need + ' (you roll d20 ' + fmt(pv.toHit) + ')' + (pv.rangePenalty ? ' · range ' + pv.rangePenalty : '') + (pv.cover ? ' · behind half cover −5' : '') : pv.why) : 'Pick an attack to see the odds' } : null;
    const curOwner = cur ? playerOf(owner(cur)) : null;
    /** A unit's magic in a line: Evoker, heart, shield, conditions. */
    const magicLine = (u) => { const m = u.mg, cs = condChips(u); let t = '';
      if (m && m.evoker) t += ' · Flux ' + m.flux + '/' + FLUX_MAX + ' · Charge ' + m.charge;
      if (m && m.emanator) t += ' · MP ' + Math.round(m.mp) + '/' + m.mpMax;
      if (m && (m.strain || m.held)) t += ' · Strain ' + m.strain + '/' + m.strainLimit;
      if (m && m.held) { const d = m.designs.find((x) => x.id === m.held.design); t += ' · Holding ' + (d ? d.name : 'an Outburst') + ' (stage ' + m.held.stage + ')'; }
      return t + (cs.length && (u.side === 'pc' || u.analyzedBy) ? ' · ' + cs.map((c) => c.k).join(' · ') : ''); };
    const who = cur ? { name: cur.name, img: cur.img || IMG['wick-welcome'], title: cb.over ? 'The fight is over' : cur.side === 'foe' ? cur.name + ' acts' : mineTurn ? 'Your turn: ' + cur.name : cur.name + '\'s turn' + (curOwner ? ' (' + curOwner.name + ')' : ''),
      line: 'HP ' + cur.hp + ' / ' + cur.maxHp + ' · AP ' + cur.ap + (w && w.magazine ? ' · Ammo ' + cur.ammo + '/' + w.magazine : '') + (cur.heat ? ' · Heat ' + cur.heat : '') + (cur.jammed ? ' · JAMMED' : '') + (ch ? ' · Stims ' + ch.stims + ' · Echo ' + ch.echo : '') + magicLine(cur),
      imgStyle: 'width: 56px; height: 56px; border-radius: 50%; object-fit: cover; background: #000; border: 2px solid ' + ring(cur) } : {};
    const anyMagic = (cb.glyphs || []).length > 0 || (cb.zones || []).length > 0 || cb.units.some((u) => u.mg);
    const magicLegend = !anyMagic ? [] : [
      { key: 'gl', img: glyphUri('fire', SIGIL_INK, { glow: true, frame: false }), name: 'Your side\'s glyph' }, { key: 'gf', img: glyphUri('fire', HOSTILE_INK, { frame: false }), name: 'Hostile glyph' },
      { key: 'gs', img: scratchUri(HOSTILE_INK), name: 'Unreadable glyph' },
      ...((cb.zones || []).some((z) => z.kind === 'wall') ? [{ key: 'zw', box: 'width: 14px; height: 14px; border-radius: 3px; background: rgba(246, 138, 56, 0.24); border: 2px dashed ' + SIGIL_GLOW, name: 'Standing wall (hurts whoever enters)' }] : []),
      ...((cb.zones || []).some((z) => z.kind === 'veil') ? [{ key: 'zv', box: 'width: 14px; height: 14px; border-radius: 3px; background: rgba(120, 128, 142, 0.55)', name: 'Smoke (blocks sight)' }] : []),
      ...((cb.zones || []).some((z) => z.kind === 'light') ? [{ key: 'zl', box: 'width: 14px; height: 14px; border-radius: 3px; background: rgba(255, 248, 225, 0.12); box-shadow: inset 0 0 6px rgba(255, 248, 225, 0.5)', name: 'Magic light' }] : []),
      ...(cb.units.some((u) => u.mg && u.mg.designs.length) ? [{ key: 'hh', img: heartUri(2), name: 'Holding an Outburst' }] : []),
    ];
    const legend = [...g.players.filter((p) => cb.units.some((u) => owner(u) === p.id)).map((p) => ({ name: p.name + '\'s', style: 'width: 14px; height: 14px; border-radius: 50%; border: 3px solid ' + p.color }))];
    // ---------- the squad panel: you, then your allies (hover a row for the full card) ----------
    const bar = (pct, col) => 'display: block; height: 100%; width: ' + Math.max(0, Math.min(100, pct)) + '%; background: ' + col;
    const myU = (mineTurn ? cur : null) || cb.units.find((u) => u.side === 'pc' && owner(u) === me && !u.dead) || null;
    const mc = myU ? g.characters[myU.charId] : null, mw = myU ? WEAPON[myU.weapon] : null;
    const FX_CHIP = 'padding: 2px 8px; border-radius: 999px; border: 1px solid #F65157; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; color: #F65157';
    /** Your magic in the You card: Flux gauge (cyan, red near overload), Evoker charge and cores, the heart. */
    const meMagic = (u) => { const m = u.mg; if (!m) return { hasMagic: false };
      const fx = m.flux, hot = fx >= FLUX_MAX - 1, warm = fx >= FLUX_MAX - 3, fluxCol = hot ? '#F65157' : warm ? '#FFFFFF' : SIGIL_GLOW;
      const d = m.held ? m.designs.find((x) => x.id === m.held.design) : null, near = m.strain >= m.strainLimit;
      return { hasMagic: m.evoker || m.emanator || m.words.length > 0 || m.designs.length > 0, hasEvoker: m.evoker,
        flux: fx + ' / ' + FLUX_MAX + (hot ? ' !' : ''), fluxFill: bar(fx / FLUX_MAX * 100, fluxCol), fluxStyle: 'text-align: right; font-weight: 700; color: ' + fluxCol,
        fluxTitle: 'Flux: each glyph adds 1. Past ' + FLUX_MAX + ' the Evoker overloads: it hurts you and locks until next round. Vent to clear it.',
        charge: 'EVOKER ' + m.charge + '/' + CORE_CHARGE + ' charge · ' + m.cores + (m.cores === 1 ? ' spare core' : ' spare cores'), chargeIcon: glyphUri('spark', SIGIL_INK, { frame: false }),
        hasHeart: m.emanator || m.designs.length > 0, strainIcon: heartUri(1), strain: 'STRAIN ' + m.strain + ' / ' + m.strainLimit + (near ? ' · at the limit: one more risks a Mana Short' : ''),
        strainStyle: 'display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: ' + (near ? '#F65157' : SOUL_INK),
        hasHeld: !!m.held, heldIcon: m.held ? heartUri(m.held.stage) : '', held: m.held ? 'HOLDING: ' + (d ? d.name : 'an Outburst') + ' · stage ' + m.held.stage + ' ×' + stageMult(m.held.stage) : '',
        heldStyle: 'display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: ' + (m.held ? ['#AE9BFF', '#C59BE8', '#DDB0A8', '#F2C46A'][Math.min(3, m.held.stage - 1)] : SOUL_INK) }; };
    const mePanel = myU && mc ? { name: myU.name, img: myU.img || IMG['wick-welcome'], zoom: zoomer(this, myU.img || '', myU.name, 'portrait'),
      hp: myU.hp + ' / ' + myU.maxHp, hpFill: bar(myU.hp / myU.maxHp * 100, '#F65157'),
      // MP lives in an Emanator (spec: Soul magic): without one it is 0, and the card says so, as the sheet does.
      mp: myU.mg && myU.mg.emanator ? Math.round(myU.mg.mp) + ' / ' + myU.mg.mpMax : 'no Emanator', mpFill: bar(myU.mg && myU.mg.emanator ? myU.mg.mp / Math.max(1, myU.mg.mpMax) * 100 : 0, '#5C9EFF'),
      ...meMagic(myU),
      line: 'AP ' + myU.ap + ' · Movement ' + myU.movement + (mw && mw.magazine != null ? ' · Ammo ' + myU.ammo + '/' + mw.magazine + (mw.reload === 'loose' ? ' · ' + (myU.loose ?? 0) + ' loose' : myU.mags ? ' · ' + myU.mags.length + ' spare' : '') : '') + (myU.maxDur ? ' · Weapon ' + ((myU.dur ?? myU.maxDur) <= 0 ? 'BROKEN' : (myU.dur ?? myU.maxDur) + '/' + myU.maxDur) : '') + ' · Stims ' + mc.stims + ' · Echo ' + mc.echo,
      fx: [...effectsOf(myU).map(([k, t]) => ({ key: k, k, t, style: FX_CHIP })), ...condChips(myU)], noFx: !effectsOf(myU).length && !condChips(myU).length, fig: bodyFigure({ injuries: myU.injuries || [], mainSide: myU.hand || 'right' }) } : null;
    const allyRows = cb.units.filter((u) => u.side === 'pc' && (!myU || u.id !== myU.id)).map((u, i) => { const p = playerOf(owner(u)), fx = [...effectsOf(u), ...condChips(u).map((c) => [c.k]), ...(u.mg && u.mg.held ? [['HOLDING · STAGE ' + u.mg.held.stage]] : [])];
      return { key: u.id, name: u.name, img: ART(u.img) || u.img || '', hasImg: !!u.img, short: u.short, player: p ? p.name : '', hp: u.dead ? 'DEAD' : u.hp + ' / ' + u.maxHp, hpFill: bar(u.hp / u.maxHp * 100, '#F65157'),
        fx: fx.map((f) => f[0]).join(' · '), hasFx: fx.length > 0, t: tokenVals(u, { ally: true, player: p ? p.initials + ' · ' + p.name.toUpperCase() : '', color: p ? p.color : '#7FD4FF', inFight: true, right: false, up: false }),
        imgStyle: 'width: 34px; height: 34px; border-radius: 50%; object-fit: cover; background: #000; flex: none; border: 2px solid ' + (p ? p.color : '#7FD4FF') + (u.downed || u.dead ? '; opacity: 0.5' : '') }; });
    const squad = true;
    const say = { can: !!myU && !cb.over, value: S.say || '', onChange: (e) => this.setState({ say: e.target.value }),
      send: () => { const text = (this.state.say || '').trim(); if (!text || !myU) return; act({ type: 'combat/say', charId: myU.charId, text }); this.setState({ say: '' }); } };
    // The magic pads under the action list: the glyph keyboard (Draw) and your Outburst designs.
    const padBtn = (on, ink) => 'flex: 1; min-height: 36px; border-radius: 8px; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; ' + (on ? 'border: 1px solid ' + ink + '; background: #1C2536; color: #E7EBF3' : 'border: 1px solid #232D3F; background: #10151F; color: #A3AEC2');
    const pad = {
      words: isMagic && mineTurn && S.action === 'draw' && words.length > 0,
      wordList: S.action === 'draw' ? words.map((wd) => { const wi = wordInfo[wd] || { ok: false, why: '' }, on = wd === word, def = SIGIL[wd] || {};
        return { key: wd, word: wd.toUpperCase(), icon: glyphUri(wd, wi.ok ? SIGIL_INK : '#7F8BA1', { glow: on && wi.ok }), sub: (def.charge ?? '?') + ' charge', pressed: on ? 'true' : 'false',
          title: wd.toUpperCase() + ' · ' + String(def.class || '').replace('subject_', '').replace('_', ' ') + ' · ' + (def.charge ?? '?') + ' charge. ' + (def.text || '') + (wi.ok ? '' : ' CAN\'T NOW: ' + wi.why),
          subStyle: 'font-size: 10px; font-weight: 700; color: ' + (wi.ok ? '#E7EBF3' : '#7F8BA1'), pick: () => this.setState({ word: wd }),
          style: 'display: flex; flex-direction: column; align-items: center; gap: 2px; width: 64px; padding: 6px 2px; border-radius: 8px; font-family: inherit; cursor: pointer; color: ' + (wi.ok ? '#E7EBF3' : '#7F8BA1') + '; '
            + (on ? 'border: 1px solid ' + SIGIL_GLOW + '; background: #13303A; box-shadow: 0 0 8px rgba(79, 200, 223, 0.45)' : 'border: 1px solid #1F4A55; background: #0D1119') + (wi.ok ? '' : '; opacity: 0.55') }; }) : [],
      designs: isMagic && mineTurn && S.action === 'outburst' && designs.length > 0,
      designList: S.action === 'outburst' && mg ? designs.map((d) => { const on = dsel && d.id === dsel.id, can = previewOutburst(pcb, cur, d.id, undefined, false);
        return { key: d.id, name: d.name, pressed: on ? 'true' : 'false', pick: () => this.setState({ design: d.id, aim: null }),
          school: (SCHOOL[d.school]?.name || d.school) + (d.school2 ? ' + ' + (SCHOOL[d.school2]?.name || d.school2) : '') + (d.option ? ' · ' + String(d.option).replace(/_/g, ' ') : ''),
          modules: d.modules.length ? d.modules.map((x) => MODULE[x]?.name || x).join(' · ') : 'No modules',
          mp: designCost(mg, d, mana) + ' MP', stats: designAp(mg, d) + ' AP · range ' + designRange(mg, d) + ' tiles', hasWhy: !can.ok, why: can.why || '',
          style: 'display: flex; flex-direction: column; gap: 3px; padding: 8px 10px; border-radius: 8px; font-family: inherit; text-align: left; cursor: pointer; color: #E7EBF3; '
            + (on ? 'border: 1px solid ' + SOUL_INK + '; background: #221A38; box-shadow: 0 0 10px rgba(174, 155, 255, 0.35)' : 'border: 1px solid #3A2E5C; background: #120E1E') + (can.ok ? '' : '; opacity: 0.7') }; }) : [],
      now: () => this.setState({ hold: false }), hold: () => this.setState({ hold: true, aim: null }), nowPressed: holdIt ? 'false' : 'true', holdPressed: holdIt ? 'true' : 'false',
      nowStyle: padBtn(!holdIt, SOUL_INK), holdStyle: padBtn(holdIt, SOUL_INK),
      repick: isMagic && mineTurn && S.action === 'evoke' && !!evTile, repickFn: () => this.setState({ glyphTile: null, aim: null }),
    };
    const magicCant = !isMagic ? false : S.action === 'draw' ? true : S.action === 'evoke' ? !evPv || !evPv.ok : S.action === 'outburst' ? !obPv || !obPv.ok : S.action === 'release' ? !relTry || !!relTry.err : !simpleTry || !!simpleTry.err;
    const won = cb.over === 'win';
    return {
      ...lightboxVals(this), zoomPc: zoomer(this, who.img, who.name, 'portrait'), who, legend,
      gridStyle: 'display: grid; grid-template-columns: 18px repeat(' + cb.map.w + ', 46px); grid-template-rows: 18px repeat(' + cb.map.h + ', 46px); gap: 2px; width: max-content; padding: 8px; border-radius: 12px; background: #05070B; border: 1px solid #232D3F',
      pad, magicLegend, hasMagicLegend: magicLegend.length > 0,
      manaText: 'MANA ' + mana + ' · ' + BAND_NAME[band.id], manaTitle: 'The ambient mana meter (0 to 40): ' + BAND_NAME[band.id] + ' air. Deaths and vented Flux raise it; Outbursts, Syphon and Crystallise draw it down.',
      manaStyle: 'padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; border: 1px solid #232D3F; color: #A3AEC2', showMana: anyMagic,
      confirmSfx: isMagic ? 'none' : undefined, confirmText: S.action === 'draw' && isMagic ? 'Click a tile to draw' : 'Confirm',
      roundText: 'ROUND ' + cb.round + ' · ' + cb.map.name.toUpperCase() + ' · ' + cb.name.toUpperCase(),
      turnChip: cb.over ? (won ? 'VICTORY' : 'DEFEAT') : mineTurn ? 'YOUR TURN' : cur && cur.side === 'foe' ? 'HOSTILES ACTING' : 'WAITING', turnChipStyle: 'padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; border: 1px solid ' + (mineTurn ? '#FFFFFF' : '#232D3F') + '; color: ' + (mineTurn ? '#FFFFFF' : '#A3AEC2'),
      initiative, tiles, apPips, apText: mineTurn ? Math.round((ap - cost) * 10) / 10 + ' / ' + ap + ' after this' : ap + ' AP', groups, sel, hasTarget: !!target && ([...ATTACKS, 'shove', 'analyze', 'paired'].includes(S.action) || (S.action === 'skill' && skFx.op === 'multi_shot')), squad, say, me: mePanel, hasMe: !!mePanel, allyRows, hasAllies: allyRows.length > 0, target: target || {},
      log: cb.log.slice(-6).map((text, i) => ({ key: cb.log.length - 6 + i, text })),
      cantConfirm: !mineTurn || isMove || magicCant || (MAGIC.includes(S.action) && !isMagic) || (isMagic ? false : (pv && !pv.ok) || (S.action === 'stim' && !stimTarget) || (S.action === 'cover' && !coverSel) || (S.action === 'door' && !doorSel) || (S.action === 'pickup' && !pickSel) || (S.action === 'load' && !loadInfo) || (S.action === 'analyze' && (!tgtUnit || !!tgtUnit.analyzedBy)) || (S.action === 'shove' && !tgtUnit) || (S.action === 'skill' && (!skRuns || (skFx.op === 'multi_shot' && !tgtUnit))) || (S.action === 'paired' && !tgtUnit) || (ATTACKS.includes(S.action) && !pv)),
      confirm: () => this.confirm(tgtUnit, attackMode, stimTarget), endTurn: () => act({ type: 'combat/end-turn', unitId: cur.id }), notMine: !mineTurn,
      toStory: () => go('main'), report: openReport, over: !!cb.over, overColor: won ? '#6FEA77' : '#F65157', overKicker: won ? 'VICTORY' : 'DEFEAT',
      overTitle: cb.name, overText: (cb.summary || '') + ' The Narrator picks up the story.',
    };
  }

  tileClick(k) {
    const S = this.state, g = getState().game, cb = castFight(g, g.combat, ART), cur = active(cb);
    if (MAGIC.includes(S.action) && cur && cur.mg) return this.magicClick(k, cur);
    const u = cb.units.find((x) => x.pos === k && !x.dead);
    if (u && u.side === 'foe') { this.setState({ target: u.id, action: ['shot', 'aimed', 'melee', 'burst', 'auto', 'shove', 'analyze', 'skill', 'paired'].includes(S.action) ? S.action : (WEAPON[cur?.weapon] && isMelee(WEAPON[cur.weapon]) ? 'melee' : 'shot') }); return; }
    if (u && u.side === 'pc' && S.action === 'stim') { this.setState({ target: u.id }); return; }
    // Anyone is a target (spec: Anyone is a target): an ally under an attack action is friendly fire.
    if (u && u.side === 'pc' && cur && u.id !== cur.id && ['shot', 'aimed', 'melee', 'burst', 'auto', 'shove', 'paired'].includes(S.action)) { this.setState({ target: u.id }); return; }
    if (S.action === 'cover' || S.action === 'pickup' || S.action === 'door') { this.setState({ tile: k }); return; }
    if (objectsOf(cb).some((o) => o.pos === k && o.hp > 0) && ['shot', 'aimed', 'melee'].includes(S.action)) { this.setState({ action: 'cover', tile: k }); return; }
    if (!['move', 'sprint', 'disengage'].includes(S.action) || !cur) return;
    act({ type: 'combat/move', unitId: cur.id, to: k, how: S.action });
    this.setState({ hover: null });
  }

  /** A tile click while a spell is chosen: draw there, pick a pattern, or aim. */
  magicClick(k, cur) {
    const S = this.state, m = this._mg || {}, g = getState().game, cb = g.combat;
    if (S.action === 'draw') { if (m.word) act({ type: 'combat/draw', unitId: cur.id, word: m.word, tile: k }); return; }
    if (S.action === 'evoke') {
      const has = !!(m.seenGlyph && m.seenGlyph(k)); // only a glyph you can see picks a pattern
      if (m.evTile && m.needsAim) return this.setState({ aim: k });
      return this.setState({ glyphTile: has ? k : null, aim: null });
    }
    if (S.action === 'outburst' && !S.hold) return this.setState({ aim: k });
    if (S.action === 'release') return this.setState({ aim: k });
  }

  confirm(tgt, mode, stimTarget) {
    const cur = active(getState().game.combat), a = this.state.action, S = this.state, m = this._mg || {};
    if (MAGIC.includes(a) && cur && cur.mg) {
      if (a === 'evoke') { if (m.evTile) act({ type: 'combat/evoke', unitId: cur.id, tile: m.evTile, aim: m.needsAim ? S.aim || undefined : undefined }); return this.setState({ glyphTile: null, aim: null }); }
      if (a === 'outburst') { if (m.design) act({ type: 'combat/outburst', unitId: cur.id, design: m.design, aim: S.hold ? undefined : S.aim || undefined, hold: !!S.hold }); return this.setState({ aim: null, hold: false }); }
      if (a === 'release') { act({ type: 'combat/release', unitId: cur.id, aim: S.aim || undefined }); return this.setState({ aim: null }); }
      if (['scuff', 'vent', 'core', 'syphon', 'crystallise'].includes(a)) return act({ type: 'combat/' + a, unitId: cur.id });
      return;
    }
    if (MAGIC.includes(a)) return; // a spell for a unit with no magic is never an attack
    if (a === 'reload') return act({ type: 'combat/reload', unitId: cur.id });
    if (a === 'prone') return act({ type: 'combat/prone', unitId: cur.id });
    if (a === 'skill') return act({ type: 'combat/skill', unitId: cur.id, targetId: tgt ? tgt.id : undefined });
    if (a === 'paired') return tgt && act({ type: 'combat/paired', unitId: cur.id, targetId: tgt.id });
    if (a === 'repair') return act({ type: 'combat/repair', unitId: cur.id });
    if (a === 'song') return act({ type: 'combat/song', unitId: cur.id });
    if (a === 'brace') return act({ type: 'combat/brace', unitId: cur.id });
    if (a === 'overwatch') { const w = WEAPON[cur.weapon]; return act({ type: 'combat/overwatch', unitId: cur.id, mode: isMelee(w) ? 'melee' : 'shot' }); }
    if (a === 'shove') return tgt && act({ type: 'combat/shove', unitId: cur.id, targetId: tgt.id });
    if (a === 'clear') return act({ type: 'combat/clear', unitId: cur.id });
    if (a === 'analyze') return tgt && act({ type: 'combat/analyze', unitId: cur.id, targetId: tgt.id });
    if (a === 'cover') return act({ type: 'combat/shoot-cover', unitId: cur.id, tile: this.state.tile });
    if (a === 'door') return act({ type: 'combat/door', unitId: cur.id, tile: this.state.tile });
    if (a === 'pickup') return act({ type: 'combat/pickup', unitId: cur.id, tile: this.state.tile });
    if (a === 'load') return act({ type: 'combat/load', unitId: cur.id });
    if (a === 'stim') return stimTarget && act({ type: 'combat/stim', unitId: cur.id, targetId: stimTarget.id });
    if (tgt) act({ type: 'combat/attack', unitId: cur.id, targetId: tgt.id, mode });
  }
}
