// Combat, ported from design/canvas-build/combat.logic.js onto the engine's fight: real initiative, the grid,
// path arrows with their AP cost, real hit odds, and every action checked by the engine. Enemies act on their own.
import { DCLogic } from '../dc/runtime';
import { D, IMG, ART, zoneOf, spriteOf, tileBg, spriteStyle, lightboxVals, zoomer, mod, fmt, tokenVals, effectsOf, bodyFigure, ensureStyle, ensureMotionCss } from './shared';
import { reducedMotion, sfx } from '../game/sfx';
import { WEAPON, musicTraitOf, songOf, active, apForTiles, paths, previewAttack, isMelee, attackApCost, analyzeCost, coverOf, difficultOf, dist, ROUNDS_PER_AP, refOf, notesAt, objectsOf, kindOf, visibility, litAt,
  SIGIL, SCHOOL, MODULE, MANA_START, FLUX_MAX, CORE_CHARGE, SPELL_AP, manaBand, condName, stageMult, glyphApOf, glyphsAt, findPattern, previewEvoke, previewOutburst,
  designCost, designAp, designRange, spellTargets, drawGlyph, scuff as scuffGlyph, vent as ventFlux, swapCore, syphon as syphonMp, crystallise as crystalliseCore, releaseOutburst,
  lineOfSight, effectiveRange, togglesFor, previewPerkAction, bindGame, weaponActions } from '@engine';
import { act as actNow, getState, go, toast } from '../game/store';
import { turnsBusyUntil } from '../game/fx/play';
/** The enemies' turns run at once in the engine, so "your turn" arrives while their moves are still being shown: until
 *  they have played, your actions wait (you can still talk). Never longer than the effects layer's cap. */
const act = (a) => {
  if (a && /^combat\//.test(a.type) && a.type !== 'combat/say' && typeof performance !== 'undefined' && performance.now() < turnsBusyUntil()) {
    toast('Wait: the other turns are still playing out.'); return null;
  }
  return actNow(a);
};
import { readZoom, saveZoom, normaliseZoom, zoomAction, zoomLabel, ZOOM_MIN, ZOOM_MAX, ZOOM_CSS } from '../game/mapZoom';
import { readLayout, saveLayout, normalise, placement, isDefault, startPanelDrag, keyMovePanel, startSplit, splitKey, clampWidth, LAYOUT_CSS, DEFAULT_LAYOUT } from '../game/combatLayout';
import { castFight } from '../game/cast';
import { worldLayer, kindBadge } from '../game/worldView';
import { openReport } from '../game/report';
import { glyphUri, scratchUri, heartUri, joinUri, SIGIL_INK, SIGIL_GLOW, SOUL_INK } from '../game/glyphs';
import { glyphKeyNav } from '../game/glyphKeys';
import { classMarks } from '../game/classMarks';
import { drawStrip, wordRows, shortWhy, wordClassName, patternPanel, evokeView, evokeClick, placedView, placedLegend, mergeTiles, glyphMark, actionPreviewTiles, strokeButtons, strokeLayer } from '../game/sigilView';
import { actionGroups, resolveCommands, readPrefs, openCustomise, BAND_NAME, TAB_NAME, EV_CMDS_CHANGED, perkEntries, parsePk, PK, classOf, magicAp, pkState, parsePray, FOCUS_ACTS, focusPackIdx } from '../game/commands';
import { pickerFor, buildArgs, gridPick } from '../game/actionPickers';
import { prayerView, vowPromptVals, patronLogCard } from './faithCombat';
import { resourcesOf, resView, heldOutburstOf, RES_CSS } from '../game/resources';
import { designCards, heartPanel, heartVals, aimOverlay, idleOverlay, noOverlay, overlayTileStyle, overlayRingStyle, markChipStyle, markChipText } from '../game/heartView';

/** Confirm lines for the self-only actions of rules 1.3 (reload both, hide, put out a fire, break free, recover). */
const SELF_TEXT = { reload2: 'Confirm to reload both guns.', hide: 'Confirm to go to ground.', extinguish: 'Confirm to put out the fire.', escape: 'Confirm to strain against the hold.', recover: 'Confirm to get your weapon back up.',
  'hold-evoker': 'Confirm to take the Evoker into your off hand (Sigils need it in a hand).', 'hold-emanator': 'Confirm to take the Emanator into your off hand (MP and Syphon need it in a hand).' };
const ARROWS = { '1,0': '→', '-1,0': '←', '0,1': '↓', '0,-1': '↑', '1,1': '↘', '-1,1': '↙', '1,-1': '↗', '-1,-1': '↖' };

// ---------- magic (spec: Mana, rules 1.2; look: docs/design/magic-presentation.md) ----------
// Sigils are Mind cyan and square; Outbursts are Soul violet warming to gold. Never mixed on one control.
const MAGIC = ['draw', 'evoke', 'scuff', 'vent', 'core', 'outburst', 'release', 'syphon', 'crystallise', 'pump', 'steady', 'letgo', 'feed', 'heartwatch'];
/** The held heart's own moves (rules 1.5): no aim, the engine runs them at once (also from the HEART panel's buttons). */
const HEART_ACTS = ['pump', 'steady', 'letgo', 'feed', 'heartwatch'];
const SIGIL_ACTS = ['draw', 'evoke', 'scuff', 'vent', 'core'];
const HOSTILE_INK = '#F65157';
const BOONS = ['guarded', 'inspired'];
/** The Evoke pad under the action (rules 1.4, spec: Mana, Sigils 9.2 and 9.7): the Line's words in order and its verdict,
 * charge/AP/Flux now and after, the overload and fizzle warnings, who it affects with their numbers, and COMMAND's
 * order chips. All of it from game/sigilView.ts (the engine's preview). */
export function sigilPad(evV, S, set) {
  const pp = evV && evV.pattern;
  if (!pp) return { sgShow: false, sgJunction: [], sgHasJunction: false, sgWords: [], sgStats: [], sgAffected: [], sgOrders: [], sgHasOrders: false, sgPaints: [], sgHasPaints: false, sgHasAffected: false, sgHasStats: false, sgHasWarn: false };
  const chip = (on) => 'min-height: 28px; padding: 0 10px; border-radius: 2px; font-family: inherit; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; cursor: pointer; ' + (on ? 'border: 1px solid ' + SIGIL_GLOW + '; background: #13303A; color: #E7EBF3' : 'border: 1px solid #1F4A55; background: transparent; color: #8BDEEE');
  const evc = S.evc || {}, order = evc.order || 'halt';
  return {
    sgShow: true, sgShape: pp.shape.toUpperCase() + (evV.facing && evV.stage !== 'stand' ? ' · FIRES ' + evV.facing.toUpperCase() : ''),
    sgWords: pp.words.map((w) => ({ key: w.key, word: w.word, img: w.img, cls: w.cls })),
    sgVerdict: pp.verdict, sgVerdictStyle: 'font-size: 12px; font-weight: 700; color: ' + (pp.valid ? '#6FEA77' : '#FFFFFF'),
    sgCap: pp.ours ? pp.capLeft + ' left before your cap · room for ' + pp.lineLeft + ' more in this Line' : '',
    sgStats: pp.stats.map((x) => ({ key: x.k, text: x.k + ' ' + x.now + ' → ' + x.after })), sgHasStats: pp.stats.length > 0,
    sgWarn: ['⚠ ' + (pp.overload || ''), evV.fizzleText ? '⚠ ' + evV.fizzleText : ''].filter((x) => x.length > 2).join(' '), sgHasWarn: !!(pp.overload || evV.fizzle),
    sgAffected: evV.affected.map((a) => ({ key: a.key, tag: a.tag, name: a.name, text: a.text, tagStyle: 'flex: none; padding: 0 4px; border-radius: 2px; font-size: 10px; font-weight: 700; line-height: 16px; background: ' + a.ink + '; color: #0A0D13' })),
    sgHasAffected: evV.affected.length > 0,
    sgOrders: (evV.orders || []).map((o) => ({ key: o, label: o.toUpperCase(), pressed: order === o ? 'true' : 'false', style: chip(order === o), pick: () => set({ evc: { ...evc, order: o, orderTo: null } }) })),
    sgHasOrders: !!(evV.orders && evV.orders.length),
    // Visualization · Paint the Field: a free SPREAD or PUSH for a spell with no Burst (no glyph, no charge).
    sgPaints: (evV.paints || []).map((w) => ({ key: w, label: 'PAINT · ' + w.toUpperCase(), pressed: evV.paint === w ? 'true' : 'false', style: chip(evV.paint === w), pick: () => set({ evc: { ...evc, paint: evV.paint === w ? null : w } }) })),
    sgHasPaints: !!(evV.paints && evV.paints.length),
    // Rules 1.9 Junctions: the tile's glyph lies in two Lines; pick which one to Evoke (the aim starts over).
    sgJunction: (evV.junction || []).map((j) => ({ key: j.key, label: (j.on ? '✓ ' : '') + j.label, pressed: j.on ? 'true' : 'false', style: chip(j.on), pick: () => set({ evc: { stroke: j.key }, aim: null }) })),
    sgHasJunction: (evV.junction || []).length > 1,
  };
}
/** Try an engine action on a throwaway copy of the fight: the engine's own refusal (or null), and the unit afterwards.
 *  How the UI learns costs and reasons without computing any rule itself. */
function dryRun(cb, uid, fn) {
  const deep = (v) => (v ? JSON.parse(JSON.stringify(v)) : v); // item state (uses, per-fight state, armed presets) must not leak out of a dry run
  const units = cb.units.map((x) => ({ ...x, saves: { ...x.saves }, conds: x.conds ? { ...x.conds } : x.conds, mg: x.mg ? { ...x.mg, held: x.mg.held ? { ...x.mg.held } : null } : x.mg, uses: deep(x.uses), ps: deep(x.ps), armed: deep(x.armed) }));
  const c = { ...cb, units, log: [], notes: [], fx: [], glyphs: [...(cb.glyphs || [])], zones: (cb.zones || []).map((z) => ({ ...z, hit: { ...(z.hit || {}) } })), mana: cb.mana ?? MANA_START };
  const u = units.find((x) => x.id === uid);
  let err = null;
  try { err = u ? fn(c, u, { state: 1 }) : 'No unit.'; } catch (e) { err = String((e && e.message) || e); }
  return { err, u, cb: c };
}
export { dryRun as _dryRun };
const sgn = (v) => (v >= 0 ? '+' : '−') + Math.abs(Math.round(v * 100) / 100);
/** The to-hit sum and damage chain in words: "d20 +4 skill +2 aimed −2 range · dmg 20 ×1.2 Strength and Raw Power". */
export function hitBreakdown(pv) {
  const terms = (pv.terms || []).map((t) => (t.v ? sgn(t.v) + ' ' : '') + t.label).join(' ');
  const d = pv.dmg, dmg = d ? 'damage ' + d.base + (d.terms || []).map((t) => ' ' + sgn(t.v) + ' ' + t.label).join('') + (d.mults || []).filter((m) => m.label !== 'critical').map((m) => ' ×' + Math.round(m.v * 100) / 100 + ' ' + m.label).join('') + ' = ' + Math.floor(d.total) + (d.armour ? ' − armour ' + d.armour : '') + ' (critical ×' + Math.round(d.crit * 100) / 100 + ')' : '';
  return ['d20 ' + (terms || '+0'), dmg].filter(Boolean).join(' · ');
}
// ---------- combat feel: motion for this screen (every effect follows the shared game state, never a local click) ----------
// Classes (Reduce motion: .phc-reduce on <html> or the system setting cuts each to a fade or a still):
//   .phc-yt          the YOUR TURN strip: a slanted white slab that slams in from the right, a shine crosses it
//   .phc-cb-act      a pressable control: lifts on hover, sinks on press
//   .phc-cur-ring    the acting unit's ring on the grid: pulses outwards (white on your turn)
//   .phc-tgt-ring    a hostile in your weapon's reach: a slow red pulse
//   .phc-plan        the chosen action's grid overlay (move range, attack reach): fades in
//   .phc-hp-fill / .phc-hp-chip   HP bars: the red drops at once, a white chip trails behind it (fighting-game style)
//   .phc-pip-drain   an AP pip just spent: flashes white, then drains
//   .phc-wait-dots   the waiting card's three dots
const COMBAT_CSS = [
  '.phc-cb-dock[data-lock="wait"] > :not(.phc-cb-say2):not(.phc-cb-lockmsg):not([data-phc-vow-prompt]), .phc-cb-dock[data-lock="held"] > :not(.phc-cb-say2):not(.phc-cb-lockmsg):not([data-phc-vow-prompt]){opacity:.38;filter:grayscale(1);pointer-events:none;transition:opacity .2s}',
  '.phc-cb-lockmsg{flex:none;padding:6px 10px;border:1px solid #232D3F;border-radius:8px;background:#10151F;color:#A3AEC2;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}',
  '@keyframes phcYtIn{0%{transform:translateX(70px) skewX(-14deg);opacity:0}60%{transform:translateX(-4px) skewX(-14deg);opacity:1}100%{transform:skewX(-14deg);opacity:1}}',
  '@keyframes phcYtShine{0%{transform:translateX(-120%) skewX(-20deg)}100%{transform:translateX(260%) skewX(-20deg)}}',
  '.phc-yt{transform:skewX(-14deg);animation:phcYtIn .42s cubic-bezier(.2,.8,.2,1) both}.phc-yt>*{transform:skewX(14deg)}',
  '.phc-yt::after{content:"";position:absolute;top:0;bottom:0;left:0;width:30%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.75),transparent);animation:phcYtShine .9s ease-out .35s both;pointer-events:none}',
  '.phc-cb-act{transition:transform .12s ease-out,box-shadow .12s ease-out,background-color .12s}',
  '.phc-cb-act:not(:disabled):hover{transform:translateY(-2px);box-shadow:0 6px 16px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.18)}',
  '.phc-cb-act:not(:disabled):active{transform:translateY(1px) scale(.985);box-shadow:none;transition-duration:.04s}',
  '@keyframes phcCurRing{0%{transform:scale(1);opacity:.95}100%{transform:scale(1.32);opacity:0}}.phc-cur-ring{animation:phcCurRing 1.3s ease-out infinite}',
  '@keyframes phcTgtRing{0%,100%{opacity:.45}50%{opacity:1}}.phc-tgt-ring{animation:phcTgtRing 1.6s ease-in-out infinite}',
  '@keyframes phcPlanIn{from{opacity:0}to{opacity:1}}.phc-plan{animation:phcPlanIn .22s ease-out both}',
  // A False Image's shimmer (game/classMarks.ts sets it inline on the decoy; still under reduced motion).
  '@keyframes phcDecoy{0%,100%{opacity:.42;filter:saturate(.4) brightness(1.05) drop-shadow(0 0 3px rgba(79,200,223,.6))}50%{opacity:.66;filter:saturate(.5) brightness(1.25) drop-shadow(0 0 7px rgba(79,200,223,.9))}}',
  '.phc-reduce .phc-plan{animation:none!important}@media (prefers-reduced-motion: reduce){.phc-plan{animation:none!important}}',
  '.phc-hp-fill{transition:width .16s ease-out}.phc-hp-chip{transition:width .55s cubic-bezier(.4,0,.2,1) .4s}',
  '@keyframes phcPipDrain{0%{background:#FFFFFF;transform:scaleY(1.7);box-shadow:0 0 12px rgba(255,255,255,.9)}35%{background:#FFFFFF;transform:scaleY(1.2)}100%{transform:none;box-shadow:none}}.phc-pips>span.phc-pip-drain{animation:phcPipDrain .55s cubic-bezier(.2,.8,.2,1) both;animation-delay:0s}',
  '@keyframes phcWaitDot{0%,80%,100%{opacity:.25}40%{opacity:1}}.phc-wait-dots>span{animation:phcWaitDot 1.2s ease-in-out infinite}.phc-wait-dots>span:nth-child(2){animation-delay:.2s}.phc-wait-dots>span:nth-child(3){animation-delay:.4s}',
  '.phc-reduce .phc-yt,.phc-reduce .phc-plan,.phc-reduce .phc-pips>span.phc-pip-drain{animation:phcPlanIn .15s ease-out both}.phc-reduce .phc-yt::after{display:none}',
  '.phc-reduce .phc-cur-ring,.phc-reduce .phc-tgt-ring,.phc-reduce .phc-wait-dots>span{animation:none}.phc-reduce .phc-cb-act{transition:none}.phc-reduce .phc-hp-chip,.phc-reduce .phc-hp-fill{transition:none}',
  // The pinned action column: tabs, a tab panel that scrolls on its own, a footer that never scrolls away.
  '.phc-cb-tabs::-webkit-scrollbar{display:none}.phc-cb-tabs>[role=tab]{transition:background-color .12s,color .12s,border-color .12s}.phc-cb-tabs>[role=tab]:not([aria-selected=true]):hover{background:#141B27;color:#E7EBF3}',
  '.phc-cb-tabpanel{scrollbar-width:thin;scrollbar-color:#2E3A50 transparent}.phc-cb-tabpanel::-webkit-scrollbar{width:8px}.phc-cb-tabpanel::-webkit-scrollbar-thumb{background:#2E3A50;border-radius:4px}',
  '.phc-cb-tabs>[role=tab]:focus-visible,.phc-cb-tabpanel:focus-visible{outline:2px solid #FFFFFF;outline-offset:-2px}',
  // Short windows (1280×720): a slimmer header and initiative strip, so the grid keeps its size.
  '@media (max-height:800px) and (min-width:1000px){.phc-cb-head{padding-top:6px!important;padding-bottom:6px!important}.phc-init{padding-top:5px!important;padding-bottom:5px!important}.phc-init [data-init]{padding-top:3px!important;padding-bottom:3px!important}.phc-init [data-init] img,.phc-init [data-init]>span:first-child{width:28px!important;height:28px!important}.phc-cb-row{padding-bottom:8px!important}.phc-cb-turn .phc-yt{padding-top:5px!important;padding-bottom:5px!important}.phc-cb-tabpanel .phc-cb-act[data-act]{min-height:34px!important}.phc-cb-tline{display:none!important}}',
  // The column, top to bottom: a bar (You in one line on short windows · Customise · Hide panel), the You card and the
  // squad (capped on your turn, scrolling on their own), the Say row (pinned), then the turn box (YOUR TURN, AP, the tabs,
  // the tab panel that gives up the room, the footer). Nothing above the footer scrolls the Say row away.
  // The cap leaves the turn box what it needs (about 520 px: YOUR TURN, AP, tabs, a usable tab panel, the footer).
  '.phc-cb-aside.phc-mine>.phc-cb-top{max-height:min(42%, calc(100% - 520px))}.phc-cb-top:empty{display:none}',
  '.phc-cb-hide,.phc-cb-link,.phc-cb-show{transition:background-color .12s,color .12s,border-color .12s}.phc-cb-hide:hover,.phc-cb-link:hover,.phc-cb-show:hover{background:#1C2536!important;color:#FFFFFF!important;border-color:#A3AEC2!important}',
  '.phc-cb-hide:focus-visible,.phc-cb-link:focus-visible,.phc-cb-show:focus-visible,.phc-cb-mini button:focus-visible{outline:2px solid #FFFFFF;outline-offset:2px}',
  // Short windows (1280×720): You shrinks to one line in the bar, and on your turn the squad list steps aside (the
  // initiative strip and the grid still show everyone's HP), so the turn box keeps its room.
  '@media (max-height:820px) and (min-width:1000px){.phc-me-full{display:none!important}.phc-me-mini{display:flex!important}.phc-me-urgent{display:grid!important}.phc-cb-aside.phc-mine>.phc-cb-top{display:none!important}}',
  // Very short windows (1093×526): the squad list goes (the initiative strip and the grid still show it), one line of
  // action text, slimmer tabs, pips and buttons, no portrait on the target card. The tab panel keeps at least 44 px.
  '@media (max-height:620px) and (min-width:1000px){.phc-cb-aside{gap:6px!important;padding-top:6px!important}.phc-cb-aside.phc-mine>.phc-cb-top{display:none!important}.phc-cb-turn,.phc-cb-dock{gap:6px!important}.phc-cb-aplabel{display:none!important}.phc-cb-turn .phc-pips>span{height:8px!important}.phc-cb-tabs>[role=tab]{min-height:30px!important}.phc-cb-tabpanel{min-height:44px!important}.phc-cb-seltext{-webkit-line-clamp:1!important}.phc-cb-selextra{display:none!important}.phc-cb-tgtimg{display:none!important}.phc-cb-foot>div{padding-top:6px!important;padding-bottom:6px!important}.phc-cb-confirm>button{min-height:38px!important}.phc-cb-say input,.phc-cb-say button{min-height:34px!important}}',
  // Narrow windows: the column stacks under the grid; the tabs, the tab panel and Confirm dock at the bottom of the screen.
  '@media (max-width:999px){.phc-cb-head{flex-wrap:wrap!important}.phc-cb-root{height:auto!important;overflow:visible!important}.phc-cb-row{flex-wrap:wrap!important;min-height:auto!important}.phc-cb-left{flex:1 1 100%!important;overflow:visible!important;padding-right:0!important}.phc-cb-aside{flex:1 1 100%!important;overflow:visible!important;margin:0!important;padding:12px 0 0!important}.phc-cb-top{overflow:visible!important}',
  // The turn box lifts the docked actions over the grid, but stays under the dialogs (the fight's end is z 15, votes 14).
  '.phc-cb-turnbox{min-height:0!important;flex:0 0 auto!important;z-index:12}.phc-cb-aside.phc-mine>.phc-cb-top{max-height:none!important}',
  // The Say row: on your turn it rides in the dock (its copy there); otherwise it docks at the bottom on its own.
  '.phc-cb-say2{display:flex!important}.phc-cb-aside.phc-mine .phc-cb-say{display:none!important}.phc-cb-aside:not(.phc-mine) .phc-cb-say{position:fixed!important;left:0;right:0;bottom:0;top:auto!important;z-index:30;padding:8px 12px calc(8px + env(safe-area-inset-bottom));border-top:1px solid #232D3F;box-shadow:0 -10px 30px rgba(0,0,0,.55)}',
  '.phc-cb-mini{right:12px!important;bottom:12px!important}',
  // The dock scrolls inside itself when its content is taller than it may be (a landscape phone), and the Confirm row
  // sticks to its bottom edge, so it never sits below the screen.
  '.phc-cb-dock{position:fixed;left:0;right:0;bottom:0;z-index:30;max-height:64vh;max-height:64dvh;overflow-y:auto;overscroll-behavior:contain;padding:8px 12px calc(8px + env(safe-area-inset-bottom));background:#0A0D13;border-top:1px solid #232D3F;box-shadow:0 -10px 30px rgba(0,0,0,.55)}.phc-cb-dock .phc-cb-tabpanel{max-height:26vh;min-height:64px!important}.phc-cb-confirm{position:sticky;bottom:0;z-index:1;background:#0A0D13;box-shadow:0 -8px 12px #0A0D13}.phc-cb-turn.phc-a-right{animation:phcFadeIn .22s ease-out both!important}.phc-cb-turn.phc-a-left{animation:phcFadeOut .2s ease-in both!important}.phc-cb-spacer{display:block!important;height:calc(26vh + 290px)}}',
  '@media (prefers-reduced-motion: reduce){.phc-yt,.phc-plan,.phc-pips>span.phc-pip-drain,.phc-cur-ring,.phc-tgt-ring,.phc-wait-dots>span{animation:none}.phc-yt::after{display:none}.phc-hp-chip,.phc-hp-fill,.phc-cb-act{transition:none}}',
].join('');
ensureMotionCss();
ensureStyle('phc-combat-motion', COMBAT_CSS);
ensureStyle('phc-combat-layout', LAYOUT_CSS);
ensureStyle('phc-resources', RES_CSS);
ensureStyle('phc-combat-mapzoom', ZOOM_CSS);

/** The mounted combat screen's logic (one at a time), for the window events below. */
let LIVE = null;
const onScreen = () => typeof document !== 'undefined' && !!document.querySelector('.phc-grid');
/** Bring a tile into view on the grid: scroll it to the middle; on your own turn, a short zoom on it, then settle.
 *  Driven by the turn intro's phc:focus-tile, which follows the shared turn order, so every screen does the same. */
export function focusTile(key, mine) {
  if (typeof document === 'undefined' || !key) return;
  const grid = document.querySelector('.phc-grid'), scroller = grid && grid.closest('.phc-grid-scroll');
  const tile = grid && grid.querySelector('button.phc-tok[aria-label^="' + refOf(key) + ' ·"]');
  if (!grid || !tile) return;
  const rm = reducedMotion(), tr = tile.getBoundingClientRect();
  if (scroller && scroller.scrollWidth > scroller.clientWidth + 1 && scroller.scrollTo) {
    const sr = scroller.getBoundingClientRect();
    scroller.scrollTo({ left: Math.max(0, scroller.scrollLeft + (tr.left + tr.width / 2) - (sr.left + sr.width / 2)), behavior: rm ? 'auto' : 'smooth' });
  }
  if ((tr.top < 0 || tr.bottom > (window.innerHeight || 0)) && tile.scrollIntoView) tile.scrollIntoView({ block: 'center', inline: 'nearest', behavior: rm ? 'auto' : 'smooth' });
  if (!mine || rm || document.hidden || !grid.animate) return;
  const gr = grid.getBoundingClientRect(), o = Math.round(tr.left + tr.width / 2 - gr.left) + 'px ' + Math.round(tr.top + tr.height / 2 - gr.top) + 'px';
  grid.animate([{ transform: 'scale(1)', transformOrigin: o }, { transform: 'scale(1.09)', transformOrigin: o, offset: 0.35 }, { transform: 'scale(1)', transformOrigin: o }], { duration: 900, easing: 'cubic-bezier(.2,.8,.2,1)' });
}
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  // A command picked on the your-turn card (game/turnIntro.tsx): select that action here.
  window.addEventListener('phc:combat-action', (e) => { const d = (e && e.detail) || {}; if (LIVE && d.action && onScreen()) LIVE.pickAction(d.action, d.unit); });
  // Every turn: bring the acting unit's tile into view (and zoom on it when it is yours).
  window.addEventListener('phc:focus-tile', (e) => { const d = (e && e.detail) || {}; if (onScreen()) focusTile(d.key, !!d.mine); });
  // Keys 1–6 flip the action tabs on your turn; a resize refits the grid beside the pinned action column.
  window.addEventListener('keydown', (e) => { if (LIVE && onScreen()) { LIVE.panelKey(e); LIVE.numKey(e); LIVE.zoomKey(e); } });
  // Ctrl or ⌘ with the wheel over the map sizes the map (not the page). Non-passive, so the page zoom is held back there.
  window.addEventListener('wheel', (e) => { if (!LIVE || !onScreen() || !(e.ctrlKey || e.metaKey) || !e.target || typeof e.target.closest !== 'function' || !e.target.closest('.phc-grid-scroll, .phc-mapzoom')) return;
    e.preventDefault(); const now = Date.now(); if (now - (LIVE._wheelAt || 0) < 90) return; LIVE._wheelAt = now; LIVE.zoomBy(e.deltaY < 0 ? 'in' : 'out'); }, { passive: false });
  // The turn card's commands were customised (game/commandsDialog.tsx): the mini-bar's quick commands follow.
  window.addEventListener(EV_CMDS_CHANGED, () => { if (LIVE && onScreen()) LIVE.setState({}); });
  // The enemies' turns started playing: grey the action panel out now (Leon: no acting until it's really your turn).
  window.addEventListener('phc-fx-hold', () => { if (LIVE && onScreen()) LIVE.setState({}); });
  window.addEventListener('resize', () => { if (LIVE && onScreen()) LIVE.fitGrid(); });
}

// The action tabs: names, family inks (Sigils Mind cyan, Outbursts Soul violet, Attack the damage red; the rest neutral)
// and the last tab each character used (kept across turns, and across reloads in this browser).
const TAB_INK = { attack: HOSTILE_INK, sigils: SIGIL_GLOW, outbursts: SOUL_INK };
const TAB_MEM = (() => { try { return JSON.parse(localStorage.getItem('phc.combatTabs') || '{}') || {}; } catch { return {}; } })();
function tabMem(charId, tab) {
  if (!charId) return null;
  charId = (getState().game?.code || 'local') + ':' + charId; // ids are per room: keyed with the room code (see commands.ts prefKey)
  if (tab === undefined) return TAB_MEM[charId] || null;
  if (TAB_MEM[charId] !== tab) { TAB_MEM[charId] = tab; try { localStorage.setItem('phc.combatTabs', JSON.stringify(TAB_MEM)); } catch { /* */ } }
  return tab;
}
/** The action column never gets narrower than this beside the grid (the grid zooms down first). */
const ASIDE_MIN = 410;
// The whole column can be hidden (the map takes the full width): remembered in this browser. While it is hidden a
// mini-bar near the bottom-right keeps the turn playable (AP, the chosen action, the four quick commands, Confirm,
// End turn), and keys 1–4 pick the quick commands instead of the (hidden) tabs. H or \ toggles it.
const PANEL_KEY = 'phc.combatPanel';
// The adjustable layout (game/combatLayout.ts): the zones' split and where each panel sits, per browser.
let LAYOUT = readLayout();
// The map's size (game/mapZoom.ts): Auto fits it to its zone at any resolution; Manual is the player's own size.
let ZOOM = readZoom();
let PANEL_HIDDEN = (() => { try { return localStorage.getItem(PANEL_KEY) === 'hidden'; } catch { return false; } })();
/** About how tall the hidden-panel turn mini-bar is (the grid keeps clear of it). */
const MINI_H = 196;
const CHIP = (on) => 'min-height: 30px; padding: 0 10px; border-radius: 999px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; ' + (on ? 'border: 1px solid #FFFFFF; background: #1C2536; color: #FFFFFF' : 'border: 1px solid #2E3A50; background: transparent; color: #A3AEC2');
/** The chosen perk or class move's picker in the combat footer (game/actionPickers.ts): option chips, a second pick on
 *  the grid (shown as chips you can clear), and a prose box only where the move needs words. Never a typed detail. */
function pickerVals(self, cb, P, V, whyOpt) {
  if (!P) return { hasPick: false, pickFields: [] };
  const key = self.state.action, form = () => (self.state.pkForm && self.state.pkForm.key === key ? self.state.pkForm.v : {});
  const setV = (patch) => self.setState({ pkForm: { key, v: { ...form(), ...patch } } });
  const ids = (k) => (Array.isArray(V[k]) ? V[k] : V[k] ? [V[k]] : []);
  const pickFields = P.fields.map((f) => {
    const base = { key: f.key, head: f.head, isChips: false, opts: [], isEmpty: false, emptyText: '', isProse: false, text: '', holder: '', onText: undefined, isGrid: false, picked: [], hasPicked: false, gridHint: '' };
    if (f.kind === 'chips') {
      const on = ids(f.key), multi = f.multi || 1;
      // A chip the engine would refuse right now (its own data, or the move's preview with that choice) is greyed, its
      // reason on it: Field Fix's "isn't jammed", Shove's "nothing behind them".
      const opts = f.options.map((o) => { const why = on.includes(o.id) ? '' : o.off || (whyOpt && f.key === 'choice' && (f.multi || 1) === 1 ? whyOpt(o.id) : '') || '';
        return { key: o.id, label: o.label + (why ? ' · ' + chipWhy(why) : ''), title: why || o.title || '', pressed: on.includes(o.id) ? 'true' : 'false', off: !!why, style: CHIP(on.includes(o.id)) + (why ? '; opacity: 0.5; cursor: default' : ''),
        pick: () => { if (why) return; const now = Array.isArray(form()[f.key]) ? form()[f.key] : []; setV({ [f.key]: now.includes(o.id) ? now.filter((y) => y !== o.id) : multi > 1 ? [...now, o.id].slice(-multi) : [o.id] }); } }; });
      return { ...base, head: f.head + (multi > 1 ? ' (up to ' + multi + ')' : ''), isChips: true, opts, isEmpty: !opts.length, emptyText: f.empty || 'Nothing to pick.' };
    }
    if (f.kind === 'prose') return { ...base, isProse: true, text: V[f.key] || '', holder: f.holder, onText: (ev) => setV({ [f.key]: ev.target.value }) };
    if (f.kind === 'unit' || f.kind === 'tile') {
      const now = ids(f.key), name = (id) => (f.kind === 'unit' ? (cb.units.find((x) => x.id === id) || { name: id }).name : refOf(id));
      const picked = now.map((id, i) => ({ key: id + '-' + i, label: (f.multi > 1 ? i + 1 + '. ' : '') + name(id) + ' ✕', title: 'Clear this pick', style: CHIP(true), clear: () => setV({ [f.key]: (Array.isArray(form()[f.key]) ? form()[f.key] : []).filter((_, j) => j !== i) }) }));
      const room = now.length < (f.multi || 1);
      return { ...base, isGrid: true, picked, hasPicked: picked.length > 0, gridHint: room ? (f.kind === 'unit' ? 'Click a token on the grid.' : 'Click a tile on the grid.') : '' };
    }
    return base;
  });
  return { hasPick: true, pickHead: P.head, pickFields, pickWarn: P.warn || '', hasPickWarn: !!P.warn };
}
/** A refusal cut to its first clause, for a chip's label (the whole reason is its title). */
const chipWhy = (t) => { const s = String(t || '').split(/[:.]/)[0].trim(); return s.length > 34 ? s.slice(0, 32) + '…' : s; };
const typingIn = (el) => !!el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName || '') || !!el.isContentEditable);

const condChips = (u) => [...Object.entries(u.conds || {}).filter(([, n]) => n > 0).map(([id, n]) => ({ key: 'c-' + id, k: condName(id).replace(/ \(.*\)$/, '').toUpperCase() + ' · ' + n, t: condName(id) + ': ' + n + (n === 1 ? ' round' : ' rounds') + ' left.',
  style: 'padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; border: 1px solid ' + (BOONS.includes(id) ? '#6FEA77; color: #6FEA77' : '#F65157; color: #F65157') })),
  ...(u.shield > 0 ? [{ key: 'shield', k: '+' + u.shield + ' SHIELD', t: 'A shield of ' + u.shield + ': damage takes it first.', style: 'padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; border: 1px solid #E7EBF3; color: #E7EBF3' }] : [])];

export class CombatLogic extends DCLogic {
  constructor(props) { super(props); this.state = { action: 'move', hover: null, target: null }; LIVE = this; }

  /** Keep something on screen a moment after it goes, so it can play its out animation. Returns what to show:
   *  { show, cls: '' or ' phc-closing', val } (val: the last value while it leaves). Never blocks input: the leaving copy
   *  takes no clicks (.phc-closing), and a timer, not an animation event, removes it. */
  pres(name, val, ms = 210) {
    const P = this._pres || (this._pres = {}), cur = P[name];
    if (val) { if (cur && cur.timer) clearTimeout(cur.timer); P[name] = { val }; return { show: true, cls: '', val }; }
    if (!cur) return { show: false, cls: '', val: null };
    if (!cur.timer) cur.timer = setTimeout(() => { if (P[name] === cur) { delete P[name]; this.setState({}); } }, reducedMotion() ? 150 : ms);
    return { show: true, cls: ' phc-closing', val: cur.val };
  }

  /** The turn panel (your actions, or the waiting card): a new one slides in while the last one slides out over it. */
  panels(key, vals) {
    const P = this._panels || (this._panels = { cur: null, old: [] });
    if (P.cur && P.cur.key !== key) {
      const gone = P.cur; P.old = [gone, ...P.old.filter((o) => o.key !== gone.key)].slice(0, 2);
      setTimeout(() => { if (P.old.includes(gone)) { P.old = P.old.filter((o) => o !== gone); this.setState({}); } }, reducedMotion() ? 150 : 230);
    }
    P.old = P.old.filter((o) => o.key !== key);
    P.cur = { key, vals };
    const base = 'display: flex; flex-direction: column; gap: 8px; min-height: 0';
    return [{ ...vals, key, cls: 'phc-a-right', hidden: undefined, style: base + '; flex: 1 1 auto' },
      ...P.old.map((o) => ({ ...o.vals, key: o.key, cls: 'phc-a-left phc-closing', hidden: 'true', style: base + '; position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 2; overflow: hidden' }))];
  }

  /** The initiative strip: when the order turns over, each portrait slides from where it was to its new place. */
  flipInit(sig) {
    const had = this._initSig != null, same = this._initSig === sig; this._initSig = sig;
    if (!had || same || typeof document === 'undefined' || typeof requestAnimationFrame === 'undefined' || reducedMotion() || document.hidden) return;
    const strip = document.querySelector('.phc-init'); if (!strip) return;
    const first = new Map(Array.from(strip.querySelectorAll('[data-init]')).map((el) => [el.getAttribute('data-init'), el.getBoundingClientRect()]));
    requestAnimationFrame(() => { for (const el of Array.from(strip.querySelectorAll('[data-init]'))) { if (!el.animate) continue;
      const a = first.get(el.getAttribute('data-init')), b = el.getBoundingClientRect();
      if (!a) { el.animate([{ opacity: 0, transform: 'translateY(-10px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'ease-out' }); continue; }
      const dx = a.left - b.left; if (Math.abs(dx) < 1) continue;
      el.animate([{ transform: 'translateX(' + dx + 'px)', opacity: dx < -40 ? 0.4 : 1 }, { transform: 'none', opacity: 1 }], { duration: 460, easing: 'cubic-bezier(.2,.8,.2,1)' }); } });
  }

  /** An action picked outside the panel (the your-turn card's command tiles): select it, if it is this unit's to use. */
  pickAction(id, unit) {
    const g = getState().game, cb = g && g.combat, cur = cb && active(cb), me = getState().me.id;
    if (!cb || cb.over || !cur || cur.side !== 'pc' || cur.downed || (unit && unit !== cur.id) || g.characters[cur.charId]?.owner !== me) return;
    const w = WEAPON[cur.weapon], act2 = id === 'shot' && w && isMelee(w) ? 'melee' : id;
    if (this._ids && !this._ids.has(act2)) return;
    const t = cb.units.find((x) => x.id === this.state.target);
    this.setState({ action: act2, target: act2 === 'stim' || (t && t.side === 'pc') ? null : this.state.target, aim: null, evc: null, sgToast: '', ...this.tabFor(act2) }); // the Line picked stays picked this turn (step, then Evoke)
    this.revealAction();
  }
  /** The tab that holds an action (so picking it anywhere, even when it was already chosen, opens its tab). */
  tabFor(action) { const t = this._tabOf && this._tabOf[action]; return t ? { tab: t } : {}; }

  /** Arrow keys on the glyph keyboard (game/glyphKeys.ts). */
  wordKey(e) { glyphKeyNav(e); }
  /** Switch the action tab (a click, an arrow key or a number key); focus follows when the keyboard is in the tab bar. */
  setTab(id, focus) {
    if (!id || !(this._tabs || []).includes(id)) return;
    if (id !== this.state.tab) this.setState({ tab: id });
    if (focus && typeof document !== 'undefined') { const el = document.getElementById('phc-tab-' + id); if (el) el.focus(); }
  }
  /** Arrow keys, Home and End inside the tab bar (automatic activation, wrapping). */
  tabKey(e) {
    const ids = this._tabs || [], i = ids.indexOf(this.state.tab), n = ids.length;
    const j = i < 0 ? -1 : e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
    if (j < 0) return;
    e.preventDefault(); this.setTab(ids[j], true); sfx('tab');
  }
  /** Number keys 1–6 anywhere on the combat screen, on your turn (1–4 pick the quick commands while the panel is hidden). */
  numKey(e) {
    if (!e || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.repeat || !/^[1-6]$/.test(e.key) || !this._mine) return;
    if (typingIn(e.target) || typingIn(document.activeElement) || document.querySelector('[data-phc-cutin], [aria-modal="true"]')) return;
    if (PANEL_HIDDEN) {
      const c = (this._quick || [])[Number(e.key) - 1];
      if (c && !c.off) { e.preventDefault(); this.pickAction(c.action); sfx('tab'); }
      return;
    }
    const id = (this._tabs || [])[Number(e.key) - 1];
    if (!id) return;
    // Focus follows into the tab bar when it is there, or when it sits in the tab panel that is about to be replaced
    // (an action, a glyph or a design button), so a keyboard player never drops back to the page.
    const ae = document.activeElement, inTabs = !!ae && ae.getAttribute && ae.getAttribute('role') === 'tab';
    const inPanel = !!ae && typeof ae.closest === 'function' && !!ae.closest('.phc-cb-tabpanel');
    e.preventDefault(); this.setTab(id, inTabs || (inPanel && id !== this.state.tab)); sfx('tab');
  }
  /** Hide or show the whole action column (the map takes the full width). Focus moves to the control that undoes it. */
  togglePanel(hide) {
    const next = typeof hide === 'boolean' ? hide : !PANEL_HIDDEN;
    if (next === PANEL_HIDDEN) return;
    PANEL_HIDDEN = next;
    try { localStorage.setItem(PANEL_KEY, next ? 'hidden' : 'shown'); } catch { /* private mode: kept for this visit */ }
    // Keyboard users keep their place: focus was on the toggle (or in the column that goes away), so it moves to the other one.
    const ae = typeof document !== 'undefined' ? document.activeElement : null;
    const wasOn = !!ae && typeof ae.closest === 'function' && !!ae.closest('.phc-cb-hide, .phc-cb-show, .phc-cb-aside');
    this._fitKey = null; this._tabShown = null;
    this.setState({});
    if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(() => {
      this.fitGrid();
      const el = wasOn ? document.querySelector(next ? '.phc-cb-show' : '.phc-cb-hide') : null; if (el && el.focus) el.focus();
    });
  }
  /** H or \ (not while typing, not under a dialog or the turn card): hide or show the column. */
  panelKey(e) {
    if (!e || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.repeat || !(e.key === 'h' || e.key === 'H' || e.key === '\\')) return;
    if (typingIn(e.target) || typingIn(document.activeElement) || document.querySelector('[data-phc-cutin], [aria-modal="true"]')) return;
    const cb = getState().game?.combat; if (!cb) return;
    e.preventDefault(); sfx(PANEL_HIDDEN ? 'slide_back' : 'slide'); this.togglePanel();
  }
  /** Bring the chosen action (and the picker under it: glyph keyboard, Outburst designs) into view inside its tab. */
  revealAction() {
    if (typeof requestAnimationFrame === 'undefined' || typeof document === 'undefined') return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const b = document.querySelector('.phc-cb-tabpanel [data-act="' + this.state.action + '"]'), panel = b && b.closest('.phc-cb-tabpanel');
      if (!panel) return;
      const box = b.parentElement, top = box.offsetTop, bottom = top + box.offsetHeight, v0 = panel.scrollTop, v1 = v0 + panel.clientHeight;
      const to = top < v0 ? top - 4 : bottom > v1 ? Math.min(top - 4, bottom - panel.clientHeight + 4) : null;
      if (to != null && panel.scrollTo) panel.scrollTo({ top: Math.max(0, to), behavior: reducedMotion() ? 'auto' : 'smooth' });
    }));
  }
  /** The map's size: a step in or out (Manual from then on), back to Auto, or 100%. */
  zoomBy(what) {
    ZOOM = normaliseZoom(zoomAction(ZOOM, this._zoom || 1, what)); saveZoom(ZOOM);
    this._fitKey = null; this.fitGrid(); this.setState({});
  }
  /** − and + (= too) size the map; not while typing, not under a dialog or the turn card. */
  zoomKey(e) {
    if (!e || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.repeat || !['-', '+', '='].includes(e.key)) return;
    if (typingIn(e.target) || typingIn(document.activeElement) || document.querySelector('[data-phc-cutin], [aria-modal="true"]')) return;
    if (!getState().game?.combat) return;
    e.preventDefault(); this.zoomBy(e.key === '-' ? 'out' : 'in');
  }
  /** The map toolbar's bindings. */
  zoomVals() {
    const z = this._zoom || 1, auto = ZOOM.mode === 'auto';
    return { label: zoomLabel(z), auto: auto ? 'true' : 'false', manual: auto ? 'false' : 'true',
      out: () => this.zoomBy('out'), in: () => this.zoomBy('in'), toAuto: () => this.zoomBy('auto'), reset: () => this.zoomBy('reset'),
      cantOut: !auto && ZOOM.scale <= ZOOM_MIN, cantIn: !auto && ZOOM.scale >= ZOOM_MAX,
      pctTitle: auto ? 'Auto: the map fits its zone (' + zoomLabel(z) + '). Click for 100%.' : 'Click for 100%', autoTitle: 'Auto: fit the map to its zone at any screen size' };
  }
  /** A new layout (a panel dropped, the splitter let go, Reset): saved for this browser, then the grid refits. */
  setLayout(l) {
    LAYOUT = normalise(l); saveLayout(LAYOUT); this._liveW = null; this._fitKey = null;
    this.setState({});
    if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(() => this.fitGrid());
  }
  /** The bindings the layout's grips, splitter and Reset use (templates/combat.template.html). */
  layoutVals(hidden) {
    const pl = placement(LAYOUT, hidden), o = pl.order;
    const panel = (n) => 'position: relative; order: ' + n + '; flex: none; min-width: 0';
    const side = '; flex: 0 1 auto; min-height: 64px; max-height: 30vh; overflow-y: auto; scrollbar-width: thin';
    const grip = (id) => (e) => startPanelDrag(e.nativeEvent || e, id, LAYOUT, (l) => this.setLayout(l));
    const gripKey = (id) => (e) => { const n = keyMovePanel(e.nativeEvent || e, id, LAYOUT); if (!n) return; e.preventDefault(); this.setLayout(n);
      if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(() => requestAnimationFrame(() => { const b = id === 'actions' ? document.querySelector('.phc-cb-bar .phc-grip') : document.querySelector('[data-phc-panel="' + id + '"] > .phc-grip'); if (b && b.focus) b.focus(); })); };
    const sec = () => (typeof document !== 'undefined' ? document.querySelector('.phc-cb-left') : null);
    const rowW = () => { const r = sec() && sec().parentElement; if (!r) return 1200; const cs = getComputedStyle(r); return r.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0); };
    const live = (w) => { this._liveW = w; const el = sec(); if (el) el.style.flex = '0 1 ' + w + 'px'; this.fitGrid(); };
    return {
      swap: pl.swap, custom: !isDefault(LAYOUT), reset: () => this.setLayout(DEFAULT_LAYOUT),
      // In the action zone the legend and the log take what room they need up to a cap, then scroll, so the actions keep theirs.
      mapStyle: panel(o.map), legendStyle: panel(o.legend) + (pl.legendIn === 'sideZone' ? side : ''), logStyle: panel(o.log) + (pl.logIn === 'sideZone' ? side : ''),
      legendMap: pl.legendIn === 'mapZone', legendSide: pl.legendIn === 'sideZone', logMap: pl.logIn === 'mapZone', logSide: pl.logIn === 'sideZone',
      grip: { map: grip('map'), legend: grip('legend'), log: grip('log'), actions: grip('actions') },
      gripKey: { map: gripKey('map'), legend: gripKey('legend'), log: gripKey('log'), actions: gripKey('actions') },
      splitNow: pl.width ? Math.round((pl.width / rowW()) * 100) : 50,
      splitDown: (e) => { const bar = e.currentTarget, row = bar && bar.parentElement; if (!row) return; startSplit(e.nativeEvent || e, bar, row, pl.swap, live, (w) => this.setLayout({ ...LAYOUT, width: w })); },
      splitKey: (e) => { const el = sec(); const cur = LAYOUT.width || (el ? el.getBoundingClientRect().width : 600); const r = splitKey(e.nativeEvent || e, cur, rowW(), pl.swap);
        if (r == null) return; e.preventDefault(); this.setLayout(r === 'reset' ? { ...LAYOUT, width: null } : { ...LAYOUT, width: r }); },
      splitReset: () => this.setLayout({ ...LAYOUT, width: null }),
    };
  }
  /** Size the grid (CSS zoom, so the effects layer's tile rects stay true). Auto: the largest that fits beside the
   *  action column, up to the manual maximum (2.5), never smaller than about half; narrow windows fit the width only.
   *  Manual: the player's size (game/mapZoom.ts). */
  fitGrid() {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    const sec = document.querySelector('.phc-cb-left'), row = sec && sec.parentElement, cb = getState().game?.combat;
    if (!sec || !row || !cb) return;
    // Anything that changes the room (the header wrapping, the window) refits: watch the grid's column itself.
    if (this._roEl !== sec && typeof ResizeObserver !== 'undefined') { if (this._ro) this._ro.disconnect(); this._ro = new ResizeObserver(() => { if (LIVE === this) this.fitGrid(); }); this._ro.observe(sec); this._roEl = sec; }
    const natW = 48 * cb.map.w + 36, natH = 48 * cb.map.h + 36, narrow = window.innerWidth < 1000;
    const rs = getComputedStyle(row), rowW = row.clientWidth - (parseFloat(rs.paddingLeft) || 0) - (parseFloat(rs.paddingRight) || 0);
    const sized = !narrow && !PANEL_HIDDEN && (LAYOUT.width || this._liveW);
    // The map's size toolbar sits above the grid: Auto leaves it its room.
    const tb = sec.querySelector('.phc-mapzoom'), toolH = tb ? tb.offsetHeight + 6 : 0;
    const availW = narrow ? rowW : sized ? sec.clientWidth - 34 : rowW - (PANEL_HIDDEN ? 44 : ASIDE_MIN + 34), availH = (narrow ? window.innerHeight * 0.55 : sec.clientHeight - 18) - toolH;
    // Manual: the player's own size (the map scrolls inside its zone when bigger).
    if (ZOOM.mode === 'manual') { if (ZOOM.scale !== (this._zoom || 1)) { this._zoom = ZOOM.scale; this.setState({}); } return; }
    // Auto: the largest size that fits, growing past 100% on big screens (up to the manual maximum).
    let fit = Math.min(ZOOM_MAX, availW / natW, availH / natH);
    // Panel hidden: the grid sits on the left and stays clear of the turn mini-bar in the bottom-right corner, either
    // beside it or above it (whichever leaves the bigger map), so no tile hides under it.
    if (PANEL_HIDDEN && !narrow) {
      const r = sec.getBoundingClientRect(), miniRight = getState().game?.sandbox ? 64 : 20;
      const besideW = window.innerWidth - miniRight - Math.min(380, window.innerWidth - 32) - 16 - (r.left + 2);
      const aboveH = window.innerHeight - 16 - MINI_H - 12 - (r.top + 16);
      fit = Math.max(Math.min(fit, besideW / natW), Math.min(fit, aboveH / natH));
    }
    const z = Math.floor(Math.max(narrow ? 0.6 : 0.5, fit) * 100) / 100;
    if (z !== (this._zoom || 1)) { this._zoom = z; this.setState({}); }
  }

  renderVals() {
    const st = getState(), g = st.game, me = st.me.id;
    const cb = castFight(g, g && g.combat, ART);
    // A new unit's turn starts clean: a spell (or its aim) picked for the last unit never carries over to this one.
    const curId = cb && active(cb) ? active(cb).id : null;
    const newTurn = curId !== this._curId;
    if (curId !== this._curId) { if (this._curId !== undefined) Object.assign(this.state, { aim: null, glyphTile: null, evc: null, sgToast: '', obMode: 'begin', word: null, stroke: null, design: null, ...(MAGIC.includes(this.state.action) ? { action: 'move' } : {}) }); this._curId = curId; }
    const S = this.state;
    if (!cb) return { ...lightboxVals(this), lay: this.layoutVals(PANEL_HIDDEN), mz: this.zoomVals(), initiative: [], tiles: [], legend: [], apPips: [], groups: [], log: [], who: {}, sel: {}, target: {}, toStory: () => go('main'), report: openReport, roundText: 'NO FIGHT', gridStyle: '', confirmText: 'Confirm', pad: {}, magicLegend: [] };
    const cur = active(cb), owner = (u) => (u.charId ? g.characters[u.charId]?.owner : null), playerOf = (pid) => g.players.find((p) => p.id === pid);
    const ring = (u) => (u.side === 'pc' ? playerOf(owner(u))?.color || '#7FD4FF' : '#F65157');
    const mineTurn = !cb.over && cur && cur.side === 'pc' && owner(cur) === me && !cur.downed;
    this._mine = mineTurn;
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
    const covers = coverOf(cb), allObjs = objectsOf(cb).filter((o) => !(o.rig && o.side && o.side !== 'pc')), shootable = (k) => allObjs.some((o) => o.pos === k && o.hp != null && o.hp > 0), doorAt = (k) => allObjs.find((o) => o.pos === k && kindOf(o).door);
    const coverSel = S.action === 'cover' && shootable(S.tile) ? S.tile : null, doorSel = S.action === 'door' && doorAt(S.tile) ? S.tile : null, pickSel = S.action === 'pickup' && (cb.floor || []).some((f) => f.pos === S.tile && f.weapon) ? S.tile : null;
    const loadInfo = (() => { if (!cur || !w || w.reload !== 'magazine' || !cur.mags) return null; const cap = w.magazine || 0, open = cur.mags.filter((n) => n < cap).sort((a, b) => b - a); if (!open.length || !cur.loose) return null; const r = Math.min(cap - open[0], cur.loose, cur.ap * ROUNDS_PER_AP); return { rounds: r, ap: Math.ceil(r / ROUNDS_PER_AP) }; })();
    const sk = w && w.grants, skFx = (sk && sk.effect) || {}, skRuns = ['multi_shot', 'sweep'].includes(skFx.op), skWhy = !skRuns || !cur ? null : cur.jammed && skFx.op === 'multi_shot' ? 'Weapon jammed: clear it (2 AP).' : skFx.op === 'multi_shot' && w.magazine != null && cur.ammo <= 0 ? 'Empty: reload (2 AP).' : cur.ap < (skFx.ap || 0) ? 'Needs ' + skFx.ap + ' AP.' : null, skPassive = sk && !skRuns && skFx.op !== 'narrator';
    // ---------- magic: what this unit can cast, previews and refusals straight from the engine ----------
    const mg = cur && cur.mg, words = mg ? mg.words : [], designs = mg ? mg.designs : [];
    const hasMagic = !!(mg && (words.length || designs.length || mg.evoker || mg.emanator)), isMagic = MAGIC.includes(S.action) && hasMagic;
    const mana = cb.mana ?? MANA_START, band = manaBand(mana), pcb = cb.mana == null ? { ...cb, mana } : cb;
    const tryIt = (fn) => (mineTurn && mg ? dryRun(pcb, cur.id, fn) : { err: cb.over ? 'The fight is over.' : 'Not your turn.' });
    // Draw (rules 1.4: on your own tile only): each word as the engine would draw it now, with its cost and whether it
    // starts or extends a Line, and the stroke it goes into (rules 1.9: the picker; spec: Mana, Sigils 9.1; game/sigilView.ts).
    const strip = S.action === 'draw' && mineTurn && mg ? (() => { const was = bindGame(g); try { return drawStrip(pcb, cur, S.stroke); } finally { bindGame(was); } })() : { tile: '', words: [], stroke: null };
    const wordInfo = {}; for (const dw of strip.words) wordInfo[dw.id] = dw;
    const word = S.word && words.includes(S.word) ? S.word : (strip.words.find((dw) => dw.ok) || {}).id || words[0] || null;
    const drawReach = new Set(word && wordInfo[word] && wordInfo[word].ok ? [cur.pos] : []);
    const drawDiff = (k) => { const dw = word && wordInfo[word]; return dw && dw.ok && k === cur.pos ? { ap: dw.cost.ap, charge: dw.cost.charge, over: dw.overload } : null; };
    // Evoke (rules 1.4): the Line picked, where to stand, the area and the hovered next pick (spec 9.2–9.8). Only glyphs
    // this side can see start a pattern (hostile ones hide in the fog, as on the grid); words you know are readable.
    const readable = new Set(cb.units.filter((u) => u.side === 'pc' && owner(u) === me && u.mg).flatMap((u) => u.mg.words)), knows = (w) => readable.has(w);
    const seenGlyph = (k) => !!k && glyphsAt(pcb, k).some((gl) => gl.side === 'pc' || vis.tiles.has(k));
    const evTile = S.action === 'evoke' && S.glyphTile && seenGlyph(S.glyphTile) ? S.glyphTile : null;
    const evV = mineTurn && mg && evTile ? evokeView(pcb, cur, evTile, S.evc || {}, S.hover, knows) : null;
    const hoverPanel = S.action === 'evoke' && !evTile && mineTurn && seenGlyph(S.hover) ? patternPanel(pcb, S.hover, cur, knows) : null;
    // Outburst (rules 1.5, game/heartView.ts): not holding, a design and Begin (hold at stage 0) or Snap (Begin and
    // Release at once, aimed); holding, the HEART panel (Pump, Release, Steady, Let go, Feed, Heart Overwatch). Every cost,
    // refusal, tile and number is the engine's preview.
    const held = mg && mg.held, heldD = held ? designs.find((d) => d.id === held.design) || null : null;
    const dsel = designs.find((d) => d.id === S.design) || designs[0] || null, obMode = S.obMode === 'snap' ? 'snap' : 'begin';
    const cards = mineTurn && mg && !held && (S.action === 'outburst' || S.tab === 'outbursts') ? designCards(pcb, cur) : [];
    const card = dsel ? cards.find((x) => x.id === dsel.id) || null : null;
    // Toggles items put on the chosen action (Ricochet, Nonlethal, Heart Surge…): chips under the action; their ids ride
    // as mods (and into the Outburst preview, so a surged release shows its stage).
    const TOGGLE_ON = { shot: 'combat/attack', aimed: 'combat/attack', melee: 'combat/attack', burst: 'combat/attack', auto: 'combat/attack', move: 'combat/move', sprint: 'combat/move', disengage: 'combat/move', outburst: 'combat/outburst', release: 'combat/release', pump: 'combat/pump', evoke: 'combat/evoke' };
    const tgls = mineTurn && TOGGLE_ON[S.action] ? (() => { const was = bindGame(g); try { return togglesFor({ u: cur, c: ch, cb, g }, TOGGLE_ON[S.action], { action: S.action, target: tgtUnit }, S.mods || []); } catch { return []; } finally { bindGame(was); } })() : [];
    this._mods = tgls.filter((t) => t.on && !t.why).map((t) => t.id).concat(tgls.filter((t) => t.defaultOn && !t.on).map((t) => '!' + t.id));
    const hp = mineTurn && held ? heartPanel(pcb, cur, this._mods) : null;
    // The grid preview: aimed (a Snap, a Release) on the aim once picked, else on the hovered tile; while holding, your
    // reach ring faintly and the aura's tiles; a design picked to Begin shows its reach.
    let hz = noOverlay(), hzPlan = null;
    if (mineTurn && mg) {
      const at = S.aim || S.hover || null;
      if (S.action === 'outburst' && dsel && !held) { hz = aimOverlay(pcb, cur, dsel.id, obMode === 'snap' ? at : null, this._mods); if (obMode !== 'snap') hz = { ...hz, mode: 'idle', area: new Set(), marks: new Map(), chip: '' }; hzPlan = obMode === 'snap' ? aimOverlay(pcb, cur, dsel.id, S.aim, this._mods).plan : null; }
      else if (S.action === 'release' && held) { hz = aimOverlay(pcb, cur, 'held', at, this._mods); hzPlan = aimOverlay(pcb, cur, 'held', S.aim, this._mods).plan; }
      else if (held && (HEART_ACTS.includes(S.action) || S.tab === 'outbursts')) hz = idleOverlay(pcb, cur);
    }
    const SIMPLE = { scuff: scuffGlyph, vent: ventFlux, core: swapCore, syphon: syphonMp, crystallise: crystalliseCore };
    const simpleTry = isMagic && SIMPLE[S.action] ? tryIt((c, u) => SIMPLE[S.action](c, u)) : null;
    // Where the chosen spell reaches and whom it would touch (for the grid overlay).
    // A prayer (Blessing 2.0; screens/faithCombat.js): its targets picked on the grid, the engine's preview as the verdict.
    const prSel = mineTurn ? parsePray(S.action) : null, pr = prSel ? prayerView(g, cb, cur, prSel, S, vis.tiles) : null;
    this._pr = pr;
    const soulAct = S.action === 'outburst' || S.action === 'release' || S.action === 'syphon' || S.action === 'crystallise' || HEART_ACTS.includes(S.action);
    const famInk = pr ? pr.ink : soulAct ? SOUL_INK : SIGIL_GLOW;
    // A hostile pattern shows only its tiles in sight, and only the words this side can read.
    let mReach = new Set(), tgtIds = [], patTiles = new Set(), aimTile = null;
    if (isMagic && mineTurn) {
      if (S.action === 'draw') mReach = drawReach;
      if (S.action === 'evoke' && hoverPanel) hoverPanel.tiles.filter((k) => hoverPanel.ours || vis.tiles.has(k)).forEach((k) => patTiles.add(k)); // the rest is evV's overlay
    }
    if (pr) { tgtIds.push(...pr.chosen); if (pr.tile) aimTile = pr.tile; }
    const tgtSet = new Set(tgtIds);
    /** The little tag over the hovered tile while aiming a spell. */
    const magicTag = (k) => {
      if (hz.on && hz.mode === 'aim' && hz.chip && k === hz.aim) return hz.chip;
      if (!isMagic || !mineTurn || k !== S.hover) return '';
      const who = (ids) => (ids.length ? ids.length + (ids.length === 1 ? ' target' : ' targets') : 'no one there');
      if (S.action === 'draw') { const d = drawDiff(k); return d ? word.toUpperCase() + ' · −' + d.ap + ' AP · −' + d.charge + ' charge' + (d.over ? ' · OVERLOAD' : '') : ''; }
      if (S.action === 'evoke') {
        if (evV && evV.stage === 'stand') { const o = evV.origins.find((x) => x.tile === k); return o ? (o.ok ? 'Fires ' + o.arrow : 'Not from here') : ''; }
        if (evV && evV.plan && (evV.pickable.has(k) || evV.area.has(k))) { if (evV.fizzle) return 'FIZZLE'; const n = evV.affected.filter((a) => !a.extra && !/SPARED|SKIPPED/.test(a.tag)).length; return n ? n + ' affected' : 'no one'; }
        return hoverPanel ? hoverPanel.shape : '';
      }
      // A refusal shows its own reason, cut to its first clause ("You are already holding an Outburst"), not always "Can't reach".
      const why = (t) => (/reach|range|too far|out of/i.test(t || '') ? 'Can\'t reach' : String(t || 'Not now').split(/[:.]/)[0]);
      void who; void why;
      return '';
    };
    this._mg = { word, design: dsel ? dsel.id : null, evTile, seenGlyph, evV, stroke: strip.stroke };
    // ---------- perks, traits and class moves (engine effects/actions.ts): the entry, its target and the engine's preview ----------
    const pkSel = parsePk(S.action), pkList = mineTurn ? perkEntries(g, cb, cur, ch, 'combat') : [];
    const pkE = pkSel ? pkList.find((e) => e.id === pkSel.id && e.actionId === pkSel.actionId) || null : null;
    const pkT = pkE ? (pkE.target === 'ally' ? cb.units.find((u) => u.id === S.target && u.side === 'pc' && !u.dead) || null : ['unit', 'enemy', 'npc'].includes(pkE.target) ? cb.units.find((u) => u.id === S.target && !u.dead && u.id !== cur.id) || tgtUnit : null) : null;
    // What the move asks for beyond its grid target (game/actionPickers.ts): option chips, a second click on the grid,
    // a prose box only for words. The picks build the args the engine reads; its preview is the verdict.
    const pkX = pkE ? { g, c: ch, how: 'combat', cb, u: cur } : null, pkP = pkE ? pickerFor(pkE, pkX) : null;
    const pkV = pkP && S.pkForm && S.pkForm.key === S.action ? S.pkForm.v : {};
    const pkBuilt = pkP ? buildArgs(pkP, pkV, pkX) : {}, pkMissing = typeof pkBuilt === 'string' ? pkBuilt : '';
    const pkArgs = pkE ? { actionId: pkE.actionId, ...(pkT ? { targetId: pkT.id } : {}), ...(pkE.target === 'tile' && S.tile ? { tile: S.tile } : {}), ...(pkMissing ? {} : pkBuilt) } : null;
    const pkPv = pkE ? (pkMissing ? { ok: false, why: pkMissing, ap: pkE.ap, lines: [] } : (() => { const was = bindGame(g); try { return previewPerkAction({ u: cur, c: ch, cb, g }, pkE.id, pkArgs, 'combat'); } catch (e) { return { ok: false, why: String(e && e.message || e), ap: pkE.ap, lines: [] }; } finally { bindGame(was); } })()) : null;
    this._pk = pkE ? { e: pkE, args: pkArgs, target: pkT, P: pkP, V: pkV } : null;
    const magicCost = !isMagic || !mineTurn ? 0 : S.action === 'draw' ? (drawDiff(S.hover) || {}).ap || (drawReach.size ? glyphApOf(cur) : 0) : S.action === 'evoke' ? (evV ? evV.ap : 0) : S.action === 'outburst' ? (obMode === 'snap' ? (hzPlan ? hzPlan.ap : card ? card.snapAp : 0) : card ? card.beginAp : 0) : S.action === 'release' ? (hzPlan ? hzPlan.ap : SPELL_AP.release) : S.action === 'pump' ? (hp ? hp.pump.ap : SPELL_AP.pump) : S.action === 'letgo' || S.action === 'heartwatch' ? 0 : S.action === 'vent' || S.action === 'core' ? magicAp(cur, S.action) : SPELL_AP[S.action] || 0;
    const waCost = cur && ['reload', 'clear', 'brace', 'repair', 'overwatch'].includes(S.action) ? (weaponActions(cur).find((x) => x.id === S.action) || {}).ap : undefined; // the weapon's own AP
    const cost = pr ? pr.ap : pkE ? (pkPv ? pkPv.ap : pkE.ap) : waCost != null ? waCost : isMagic ? magicCost : isMove ? moveAp : S.action === 'skill' ? (skFx.ap || 0) : S.action === 'repair' || S.action === 'song' ? 2 : S.action === 'shove' || S.action === 'hide' || S.action === 'escape' ? 2 : S.action === 'reload2' ? 3 : S.action === 'extinguish' || FOCUS_ACTS[S.action] ? 1 : S.action === 'recover' ? (cur && cur.conds && cur.conds.disarmed > 0 ? 2 : 1) : S.action === 'prone' || S.action === 'brace' ? 1 : S.action === 'overwatch' ? (w ? attackApCost(w, melee ? 'melee' : 'shot') : 2) : S.action === 'stim' ? 1 : S.action === 'reload' || S.action === 'clear' ? 2 : S.action === 'analyze' ? (cur ? analyzeCost(cur) : 2) : S.action === 'pickup' || S.action === 'door' ? 1 : S.action === 'load' ? (loadInfo ? loadInfo.ap : 0) : S.action === 'cover' ? (w ? attackApCost(w, melee ? 'melee' : 'shot') : 2) : pv ? pv.ap : 0;
    const tokOpt = (u, x, y) => { const p = u.side === 'pc' ? playerOf(owner(u)) : null; return { ref: refOf(x + ',' + y), ally: u.side === 'pc', player: p ? p.initials + ' · ' + p.name.toUpperCase() : '', color: p ? p.color : '#F65157', inFight: true, right: x >= cb.map.w / 2, up: y >= cb.map.h / 2 }; };
    const floorAt = {}; (cb.floor || []).forEach((f) => { (floorAt[f.pos] ||= []).push(f.text); });
    const condWord = (u) => (u.dead ? 'dead' : u.downed ? 'down' : u.hp >= u.maxHp ? 'unhurt' : u.hp > u.maxHp / 2 ? 'wounded' : 'badly hurt');

    const at = {}; cb.units.filter((u) => !u.dead && seenFoe(u)).forEach((u) => { at[u.pos] = u; });
    const sensedAt = {}; cb.units.filter((u) => vis.sensed.has(u.id)).forEach((u) => { sensedAt[u.pos] = u; });
    const solid = new Set(cb.map.solid), diff = difficultOf(cb);
    // ---------- the chosen attack's reach in red (as on the area map): where it can land from here, as the engine allows ----------
    const RED_ACTS = ['shot', 'aimed', 'melee', 'burst', 'auto', 'paired', 'overwatch', 'shove', 'analyze', 'cover'];
    const redOn = !!(mineTurn && w && !isMagic && (RED_ACTS.includes(S.action) || (S.action === 'skill' && skRuns)));
    let red = new Map();
    if (redOn) {
      const mode = S.action === 'skill' ? (skFx.op === 'sweep' ? 'melee' : 'shot') : ['overwatch', 'cover', 'paired', 'analyze'].includes(S.action) ? (melee ? 'melee' : 'shot') : S.action === 'shove' ? 'melee' : S.action;
      const useW = mode === 'melee' && !melee ? WEAPON.fists : w, isM = mode === 'melee' && S.action !== 'analyze';
      // Optics only help against units (previewAttack); shooting an object (shootCover) has no optic term: 3 bands flat.
      const mods = cur.mods || [], optic = S.action !== 'cover' && (mods.includes('mod_red_dot') || (mods.includes('mod_scope') && mode === 'aimed')) ? 1 : 0;
      const reachM = S.action === 'shove' || (S.action === 'skill' && skFx.op === 'sweep') ? 1 : (useW.properties || []).includes('reach_2') || useW.id === 'lance' || (useW === w && skFx.op === 'reach') ? (skFx.op === 'reach' && useW === w ? skFx.value : 2) : 1;
      const maxR = S.action === 'analyze' ? 4 + (cur.analysis || 0) : isM ? reachM : effectiveRange(useW) * (3 + optic);
      const memo = [cur.id, cur.pos, cur.weapon, S.action, maxR, cb.round, cb.log.length].join('|');
      if (!this._red || this._red.key !== memo) {
        // By range band (spec: −2 to hit per band past the first): the first band reads strongest, the far ones fade.
        const set = new Map(), band = isM || S.action === 'analyze' ? 0 : effectiveRange(useW);
        for (let y = 0; y < cb.map.h; y++) for (let x = 0; x < cb.map.w; x++) { const k = x + ',' + y; if (k === cur.pos || solid.has(k)) continue; const d = dist(cur.pos, k); if (d <= maxR && (isM || lineOfSight(cb, cur.pos, k))) set.set(k, band ? Math.max(0, Math.ceil(d / band) - 1) : 0); }
        this._red = { key: memo, set };
      }
      red = this._red.set;
    }
    /** The chip over a hovered unit while an attack is chosen: the engine's odds and AP, or its reason. */
    const atkTag = (k, u) => {
      if (!redOn || k !== S.hover || !u || u.id === cur.id) return null;
      const short = (why) => String(why || 'Not now').split(/[:.]/)[0].toUpperCase();
      if (S.action === 'analyze') return u.analyzedBy ? { ok: false, text: 'ANALYZED' } : red.has(k) ? { ok: true, text: 'ANALYZE · ' + analyzeCost(cur) + ' AP' } : { ok: false, text: 'OUT OF RANGE' };
      if (S.action === 'shove') return red.has(k) ? { ok: true, text: 'SHOVE · 2 AP' } : { ok: false, text: 'GET NEXT TO IT' };
      if (S.action === 'skill' && skFx.op === 'multi_shot') { const p = previewAttack(cb, cur, u, 'shot', { extra: skFx.extra || 0, free: true }); return p.ok ? { ok: true, text: (skFx.shots || 1) + '× ' + p.pct + '% · ' + skFx.ap + ' AP' } : { ok: false, text: short(p.why) }; }
      if (ATTACKS.includes(S.action)) { const p = previewAttack(cb, cur, u, attackMode); return p.ok ? { ok: true, text: 'HIT ' + p.pct + '% · ' + p.ap + ' AP' } : { ok: false, text: short(p.why) }; }
      return null;
    };
    // The zone's map painting under the grid (spec: Campaigns, art): each tile shows its slice, colours become tints.
    const mapArt = ART(zoneOf(g)?.art?.map), TINT = { '#0D1119': 'rgba(10, 13, 19, 0.1)', '#1C2536': 'rgba(10, 13, 19, 0.55)', '#4A3A20': 'rgba(140, 111, 58, 0.22)', '#2A2113': 'rgba(140, 111, 58, 0.12)', '#3A2E1A': 'rgba(58, 46, 26, 0.3)', '#161C28': 'rgba(22, 28, 40, 0.3)' };
    const paint = (k, col) => (mapArt && !String(col).startsWith('rgba(255') ? tileBg(mapArt, k, cb.map.w, cb.map.h, TINT[col] || (String(col).startsWith('rgba') ? col : 'rgba(10, 13, 19, 0.1)')) : col);
    // The glyph layer: glyphs and standing zones by tile. Hostile glyphs show only where you can see, and only as words
    // your side can read (the rest are scratches).
    const glyphAt = {}; (cb.glyphs || []).forEach((gl) => { (glyphAt[gl.pos] ||= []).push(gl); });
    const glyphName = (gl) => glyphMark(gl, 'pc', knows).title;
    // Rules 1.9 strokes (game/sigilView.ts strokeLayer): a faint line joins each stroke's glyphs; the hovered glyph lights
    // its whole stroke and names its words; while drawing, the stroke the glyph would make shows as a dashed line.
    const dwSel = S.action === 'draw' && word ? wordInfo[word] : null;
    const SL = strokeLayer(cb.glyphs || [], { side: 'pc', seen: (k) => vis.tiles.has(k), hover: S.hover, knows, preview: dwSel && dwSel.ok ? [dwSel.joins, dwSel.joins2] : [] });
    // Placed magic (spec 9.9: fields tinted by element, your traps, spotted enemy traps, turrets, RAISE walls, smoke,
    // light) under the Evoke plan's overlay; outside the area is dimmed while aiming (spec 9.4).
    // Class Roster Revision 3's standing marks (game/classMarks.ts): False Images, Read's intents, rigged and sabotaged tiles.
    const placed0 = placedView(pcb, 'pc'), placed = { ...placed0, tiles: mergeTiles(placed0.tiles, classMarks(cb, 'pc', { seen: vis.tiles, imgOf: (x) => ART(x.img) || x.img || '' })) }, evOn = S.action === 'evoke' && isMagic && mineTurn && !!evV;
    // A class move or perk that casts (Payload, Seal, Survey, Fusion, Twin Discipline, Stitch, Stored Spell…) paints its
    // engine preview on the grid too: the area, the tiles it covers, who it affects (spec 9; item 489 c).
    const pkTiles = pkE && pkPv && (pkPv.area || pkPv.tiles || pkPv.targets) ? actionPreviewTiles(cb, pkPv, cur.side) : null;
    const sgTiles = evOn ? mergeTiles(placed.tiles, evV.tiles) : pkTiles ? mergeTiles(placed.tiles, pkTiles) : placed.tiles, sgDim = evOn && evV.stage !== 'stand' && evV.stage !== 'none' && evV.area.size > 0;
    const markStyle = (k, u) => {
      if (hz.on) { if (u && hz.marks.has(u.id)) return overlayRingStyle({ ...hz, ink: hz.marks.get(u.id).ink }); const st = overlayTileStyle(hz, k); if (st) return st; }
      if (u && tgtSet.has(u.id)) return 'position: absolute; inset: -1px; z-index: 1; border-radius: 4px; pointer-events: none; border: 3px solid ' + famInk + '; box-shadow: 0 0 10px ' + famInk;
      if (k === aimTile) return 'position: absolute; inset: 0; z-index: 1; border-radius: 4px; pointer-events: none; border: 2px solid #FFFFFF';
      if (patTiles.has(k)) return 'position: absolute; inset: 0; z-index: 1; border-radius: 4px; pointer-events: none; border: 2px solid ' + SIGIL_GLOW + '; box-shadow: 0 0 8px ' + SIGIL_GLOW + ', inset 0 0 8px rgba(79, 200, 223, 0.35)';
      if (mReach.has(k)) return 'position: absolute; inset: 0; z-index: 1; border-radius: 4px; pointer-events: none; border: 1px dashed ' + famInk + '; background: ' + (soulAct ? 'rgba(174, 155, 255, 0.08)' : 'rgba(79, 200, 223, 0.08)');
      return '';
    };
    // World Play 1.7 (game/worldView.ts): the fight's hazards per tile, caches with their count, carried people a Downed
    // carrier dropped (lying on the floor until the fight ends).
    const WLc = worldLayer(g, true), dropAt = {}; (cb.dropped || []).forEach((d) => { dropAt[d.at] = d; });
    const tiles = [], axis = (key, text) => ({ key, isLabel: true, isTile: false, text });
    tiles.push(axis('h-', '')); for (let x = 0; x < cb.map.w; x++) tiles.push(axis('h' + x, refOf(x + ',0').replace(/\d+$/, '')));
    for (let y = 0; y < cb.map.h; y++) for (let x = -1; x < cb.map.w; x++) {
      if (x < 0) { tiles.push(axis('r' + y, String(y + 1))); continue; }
      const k = x + ',' + y, u = at[k], inRange = isMove && !u && reach(k), note = notesAt(cb.map, k)[0];
      const gls = (glyphAt[k] || []).filter((gl) => gl.side === 'pc' || vis.tiles.has(k)), sgT = sgTiles[k], mk = markStyle(k, u), mTag = magicTag(k);
      const sgLayer = [sgT && sgT.layer, sgDim && !evV.area.has(k) && !evV.pickable.has(k) && !evV.stepTo.has(k) && !evV.orderTo.has(k) && k !== cur.pos ? 'background: rgba(5, 7, 11, 0.5)' : ''].filter(Boolean).join('; ');
      const magicNote = (gls.length ? ' · glyphs: ' + gls.map(glyphName).join(', ') : '') + (sgT && sgT.note ? ' · ' + sgT.note : '') + (u && u.mg && u.mg.held ? ' · holding an Outburst (stage ' + u.mg.held.stage + ')' : '') + (u && (u.side === 'pc' || u.analyzedBy) ? condChips(u).map((c) => ' · ' + c.k.toLowerCase()).join('') : '');
      let bg = '#0D1119', border = '1px solid #151C29';
      if (solid.has(k)) { bg = '#1C2536'; border = '1px solid #232D3F'; }
      const cv = covers[k], ob = allObjs.find((o) => o.pos === k && !(cv && (o.kind === 'crate' || o.kind === 'pillar')) && o.kind !== 'rubble');
      if (cv) { bg = cv.kind === 'full' ? '#4A3A20' : '#2A2113'; border = (cv.kind === 'full' ? '2px solid #8C6F3A' : '1px solid #4A3A20'); }
      const spr = allObjs.filter((o) => o.pos === k && spriteOf(g, o)).sort((a, b) => (a.kind === 'rubble') - (b.kind === 'rubble'))[0];
      if (k === coverSel || k === pickSel || k === doorSel) border = '2px solid #FFFFFF';
      if (ob && kindOf(ob).door && !ob.open) { bg = '#3A2E1A'; }
      if (diff.has(k) && !u) { bg = '#161C28'; }
      const aTag = u && seenFoe(u) ? atkTag(k, u) : null;
      const wc = WLc.cells.get(k) || {}, kb = u && u.side === 'foe' && seenFoe(u) ? kindBadge(u.kind, true) : null, dr = !u ? dropAt[k] : null;
      const planStyle = inRange ? 'background: rgba(231, 235, 243, 0.12); border: 1px dashed #E7EBF3' : red.has(k) ? ['background: rgba(246, 81, 87, 0.2); border: 1px dashed rgba(246, 81, 87, 0.9)', 'background: rgba(246, 81, 87, 0.11); border: 1px dashed rgba(246, 81, 87, 0.55)', 'background: rgba(246, 81, 87, 0.06); border: 1px dashed rgba(246, 81, 87, 0.35)', 'background: rgba(246, 81, 87, 0.04); border: 1px dashed rgba(246, 81, 87, 0.25)'][Math.min(3, red.get(k) || 0)] : '';
      const known = u && (u.side === 'pc' || u.analyzedBy), hpPct = !u ? 0 : u.dead || u.downed ? 0 : known ? Math.max(0, Math.min(100, u.hp / Math.max(1, u.maxHp) * 100)) : u.hp >= u.maxHp ? 100 : u.hp > u.maxHp / 2 ? 66 : 33;
      const sel = u && tgtUnit && u.id === tgtUnit.id;
      const isCur = u && cur && u.id === cur.id;
      tiles.push({
        key: k, isLabel: false, isTile: true, cover: cv, label: refOf(k) + ' · ' + (u ? u.name + (u.side === 'foe' ? ' (hostile)' : '') + (u.side === 'pc' || u.analyzedBy ? ' · HP ' + u.hp + '/' + u.maxHp : ' · looks ' + condWord(u)) + (u.downed ? ' · Downed' : '') : solid.has(k) ? 'Solid' : ob ? ob.name + (ob.hp != null ? ' · HP ' + ob.hp + '/' + ob.max : '') + (kindOf(ob).door ? (ob.locked ? ' · locked' : ob.open ? ' · open' : ' · closed') : '') + (ob.text ? ' · ' + ob.text : '') + (cv ? ' · ' + cv.kind + ' cover' : '') : cv ? (cv.kind === 'full' ? 'Full cover (blocks sight)' : 'Half cover (−5 to shots at whoever is behind it)') + ' · HP ' + cv.hp + '/' + cv.max : diff.has(k) ? ((cb.rubble || []).includes(k) ? 'Rubble' : 'Difficult terrain') : 'open') + (!vis.tiles.has(k) ? ' · out of sight' : '') + (cb.map.dark && !litAt(cb, k) ? ' · dark' : '') + (floorAt[k] ? ' · on the floor: ' + floorAt[k].join(', ') : '') + (note ? ' · ' + note : '') + magicNote, title: u ? '' : refOf(k) + (note ? ' · ' + note : '') + magicNote,
        worldNote: (wc.hz ? ' · ' + wc.hz.title : '') + (wc.cache ? ' · ' + wc.cache.title : '') + (dr ? ' · ' + dr.npc.name + ' lies here' : ''),
        unseen: !vis.tiles.has(k), sensed: !!sensedAt[k], dark: !!cb.map.dark && !litAt(cb, k),
        hasHzd: !!wc.hz, hzdLayer: wc.hz ? wc.hz.layer : '', hzdGlyph: wc.hz ? wc.hz.glyph : '', hzdGlyphStyle: wc.hz ? wc.hz.glyphStyle : '', hzdKind: wc.hz ? wc.hz.kind + (wc.hz.safe ? ' safe' : '') : '',
        hasCache: !!wc.cache && !u, hasCacheGlyph: !!wc.cache && !u && !spr, cacheGlyph: wc.cache ? wc.cache.glyph : '', cacheStyle: wc.cache ? wc.cache.style : '', cacheChip: wc.cache ? wc.cache.chip : '', cacheChipStyle: wc.cache ? wc.cache.chipStyle : '',
        hasKind: !!(kb && kb.has), kindText: kb ? kb.text : '', kindStyle: kb ? kb.style : '', kindTitle: kb ? kb.title : '',
        hasDrop: !!dr, dropText: dr ? '▾ ' + dr.npc.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() : '', dropTitle: dr ? dr.npc.name + ' lies here (dropped when the carrier went down; back on the map after the fight)' : '',
        hasTok: !!u, t: u ? tokenVals(u, tokOpt(u, x, y)) : null, hasObj: !!ob && !u && !spr && !wc.cache, objGlyph: ob ? kindOf(ob).glyph : '', objStyle: 'position: absolute; inset: 0 0 12px 0; display: grid; place-items: center; font-size: 20px; color: ' + (ob && (kindOf(ob).hazard || ob.kind === 'trap' || kindOf(ob).explodes) ? '#F65157' : ob && ob.kind === 'poi' ? '#FFFFFF' : '#C9D3E3'), hasFloor: !!floorAt[k], floor: floorAt[k] ? '▪' + (floorAt[k].length > 1 ? floorAt[k].length : '') : '',
        click: () => this.tileClick(k), hover: () => { if (this.state.hover !== k) this.setState({ hover: k }); },
        hasArrow: !!route[k] && k !== (cur && cur.pos), arrow: route[k] || '', hasCost: k === hv || !!mTag || !!aTag, cost: mTag || (aTag ? aTag.text : (moveAp ? '−' + moveAp + ' AP' : 'Paid') + ' · ' + P.dist[k] + (P.dist[k] === 1 ? ' tile' : ' tiles')),
        costStyle: 'position: absolute; left: 50%; top: -12px; transform: translateX(-50%); z-index: 4; padding: 2px 6px; border-radius: 6px; font-size: 11px; font-weight: 700; white-space: nowrap; pointer-events: none; '
          + (aTag ? (aTag.ok ? 'background: #F65157; color: #0A0D13' : 'background: #1C2536; color: #F65157; border: 1px solid #F65157') : 'background: #FFFFFF; color: #0A0D13'),
        hasPlan: !!planStyle, planStyle: 'position: absolute; inset: 0; z-index: 1; border-radius: 4px; pointer-events: none; box-sizing: border-box; ' + planStyle,
        hasRing: !!isCur && !cb.over, ringCls: mineTurn ? 'phc-cur-ring' : '', ringStyle: 'position: absolute; left: 50%; top: 50%; width: 44px; height: 44px; margin: -22px 0 0 -22px; z-index: 3; pointer-events: none; box-sizing: border-box; border-radius: ' + (u && u.side === 'pc' ? '50%' : '6px') + '; border: 2px solid ' + (mineTurn ? '#FFFFFF' : u ? ring(u) : '#FFFFFF'),
        hasTgtRing: !!(u && redOn && u.id !== cur.id && seenFoe(u) && red.has(k) && !u.downed), tgtRingStyle: 'position: absolute; inset: 1px; z-index: 3; pointer-events: none; box-sizing: border-box; border-radius: 4px; border: 2px solid #F65157; box-shadow: 0 0 10px rgba(246, 81, 87, 0.6)',
        hasHp: !!u, hpBox: 'position: absolute; left: 5px; right: 5px; bottom: 1px; height: 4px; z-index: 3; border-radius: 2px; overflow: hidden; pointer-events: none; background: rgba(5, 7, 11, 0.85)' + (known ? '' : '; outline: 1px dashed rgba(246, 81, 87, 0.5)'),
        hpChip: 'position: absolute; left: 0; top: 0; bottom: 0; width: ' + hpPct + '%; background: #FFFFFF', hpFill: 'position: absolute; left: 0; top: 0; bottom: 0; width: ' + hpPct + '%; background: #F65157' + (known ? '' : '; opacity: 0.6'),
        hasJoin: !!(SL.tiles[k] && SL.tiles[k].length), join: SL.tiles[k] ? joinUri(SL.tiles[k], { size: 44, pad: 26, anchor: [9, 9], pitch: 48 }) : '',
        hasStrokeHot: SL.hot.has(k), strokeHotStyle: 'position: absolute; inset: 0; z-index: 2; border-radius: 4px; pointer-events: none; box-sizing: border-box; border: 1px solid ' + SIGIL_INK + '; box-shadow: inset 0 0 8px rgba(139, 222, 238, 0.35)',
        hasStrokeTip: k === S.hover && !!SL.hotText, strokeTip: SL.hotText, strokeTipStyle: 'position: absolute; top: -17px; ' + (x >= cb.map.w / 2 ? 'right: 0' : 'left: 0') + '; z-index: 5; padding: 1px 6px; border-radius: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; white-space: nowrap; pointer-events: none; background: #0B1519; color: #8BDEEE; border: 1px solid #8BDEEE',
        hasGlyphs: gls.length > 0, glyphs: gls.map((gl) => ({ key: gl.id, title: glyphName(gl), src: glyphMark(gl, 'pc', knows).src,
          style: 'width: 16px; height: 16px; border-radius: 3px; background: rgba(5, 7, 11, 0.55); ' + (gl.side === 'pc' ? 'box-shadow: 0 0 6px rgba(79, 200, 223, 0.6)' : 'opacity: 0.85; box-shadow: 0 0 0 1px rgba(246, 81, 87, 0.5)') })),
        hasZone: !!sgLayer, zoneStyle: 'position: absolute; inset: 0; z-index: 1; border-radius: 2px; pointer-events: none; box-sizing: border-box; ' + sgLayer, hasMark: !!mk, markStyle: mk,
        hasSg: !!(sgT && sgT.marks.length), sg: sgT ? sgT.marks : [],
        hasHz: !!(u && hz.marks.has(u.id)), hzText: u && hz.marks.has(u.id) ? markChipText(hz.marks.get(u.id)) : '', hzStyle: u && hz.marks.has(u.id) ? markChipStyle(hz.marks.get(u.id)) : '', hzTitle: u && hz.marks.has(u.id) ? hz.marks.get(u.id).title : '',
        hasHeart: !!(u && u.mg && u.mg.held), heart: u && u.mg && u.mg.held ? heartUri(u.mg.held.stage) : '', heartTitle: u && u.mg && u.mg.held ? u.name + ' is holding an Outburst: stage ' + u.mg.held.stage + ' (×' + stageMult(u.mg.held.stage) + ')' : '',
        sfx: isMagic && S.action === 'draw' && drawReach.has(k) ? 'none' : undefined,
        hasSprite: !!spr, sprite: spr ? spriteOf(g, spr) : '', spriteStyle: spr ? spriteStyle(spr) : '',
        hasImg: !!(u && u.img), img: (u && (ART(u.img) || u.img)) || '',
        imgStyle: 'position: relative; z-index: 2; width: 38px; height: 38px; object-fit: cover; ' + (u && u.side === 'pc' ? 'border-radius: 50%; border: 3px ' + (u.downed ? 'dashed ' : 'solid ') + ring(u) : 'border-radius: 4px; border: 2px solid ' + (sel ? '#FFFFFF' : '#F65157')) + (u && u.downed ? '; opacity: 0.5' : '') + (isCur ? '; box-shadow: 0 0 0 3px #FFFFFF' : ''),
        hasBadge: !!(u && !u.img), badge: u ? u.short : '',
        badgeStyle: 'position: absolute; inset: 6%; z-index: 2; display: grid; place-items: center; box-sizing: border-box; font-size: 11px; font-weight: 700; ' + (u && u.side === 'pc' ? 'border-radius: 50%; border: 2px dashed ' + ring(u) + '; color: ' + ring(u) : 'border-radius: 4px; border: 2px solid ' + (sel ? '#FFFFFF' : '#F65157') + '; color: #F65157') + (isCur ? '; box-shadow: 0 0 0 3px #FFFFFF' : '') + (u && u.downed ? '; opacity: 0.5' : ''),
        hasText: ((diff.has(k) && !mapArt) || !!cv) && !u, text: cv ? (ob ? cv.hp + '' : (cv.kind === 'full' ? 'FULL ' : 'HALF ') + cv.hp) : (cb.rubble || []).includes(k) ? 'RUBBLE' : 'ROUGH',
        style: 'position: relative; display: grid; place-items: center; padding: 0; border-radius: 4px; cursor: pointer; background: ' + (k === hv ? 'rgba(255, 255, 255, 0.28)' : route[k] && k !== (cur && cur.pos) ? 'rgba(255, 255, 255, 0.18)' : paint(k, bg)) + '; border: ' + (k === hv ? '2px solid #FFFFFF' : border) + (!vis.tiles.has(k) ? '; box-shadow: inset 0 0 0 46px rgba(5, 7, 11, ' + (cb.map.dark && !litAt(cb, k) ? '0.72' : '0.5') + ')' : cb.map.dark && !litAt(cb, k) ? '; box-shadow: inset 0 0 0 46px rgba(5, 7, 11, 0.25)' : ''),
      });
    }
    for (const t of tiles) if (t.worldNote) t.label += t.worldNote;
    // The strip turns over: the acting unit first, then who comes next (each slides to its new place).
    const ordU = cb.order.map((id) => cb.units.find((u) => u.id === id)).filter((u) => u && !u.dead), ci = Math.max(0, ordU.findIndex((u) => cur && u.id === cur.id));
    const rotU = [...ordU.slice(ci), ...ordU.slice(0, ci)];
    this.flipInit(rotU.map((u) => u.id).join(','));
    const initiative = rotU.map((u, idx) => ({ tag: cb.over ? '' : idx === 0 ? 'NOW' : idx === 1 ? 'NEXT' : '', hasTag: !cb.over && idx < 2,
      tagStyle: 'font-size: 9px; font-weight: 700; letter-spacing: 0.16em; color: ' + (idx === 0 ? '#FFFFFF' : '#A3AEC2'),
      ...(() => { const kn = u.side === 'pc' || u.analyzedBy, pct = u.downed ? 0 : kn ? Math.max(0, Math.min(100, u.hp / Math.max(1, u.maxHp) * 100)) : u.hp >= u.maxHp ? 100 : u.hp > u.maxHp / 2 ? 66 : 33;
        return { hpBox: 'position: relative; display: block; width: 64px; height: 4px; border-radius: 2px; overflow: hidden; background: #1C2536' + (kn ? '' : '; outline: 1px dashed rgba(246, 81, 87, 0.45)'),
          hpChip: 'position: absolute; left: 0; top: 0; bottom: 0; width: ' + pct + '%; background: #FFFFFF', hpFill: 'position: absolute; left: 0; top: 0; bottom: 0; width: ' + pct + '%; background: #F65157' + (kn ? '' : '; opacity: 0.6') }; })(),
      key: u.id, zoom: zoomer(this, ART(u.img) || u.img || '', u.name, 'portrait'), name: seenFoe(u) ? u.name + (u.downed ? ' (down)' : '') : 'Unseen hostile', init: u.init, hasImg: !!u.img, noImg: !u.img, img: ART(u.img) || u.img || '', short: u.short,
      imgStyle: 'width: 36px; height: 36px; object-fit: cover; ' + (u.side === 'pc' ? 'border-radius: 50%; border: 3px solid ' + ring(u) : 'border-radius: 4px; border: 2px solid #F65157'),
      badgeStyle: 'display: grid; place-items: center; width: 36px; height: 36px; border-radius: ' + (u.side === 'pc' ? '50%' : '4px') + '; border: 2px solid ' + ring(u) + '; color: ' + ring(u) + '; font-size: 11px; font-weight: 700',
      style: 'display: flex; gap: 8px; align-items: center; padding: 6px 12px 6px 6px; border-radius: 999px; flex: none; ' + (cur && u.id === cur.id && !cb.over ? 'border: 1px solid #FFFFFF; background: #1C2536; box-shadow: 0 0 0 1px #FFFFFF, 0 0 14px rgba(255, 255, 255, 0.25)' : 'border: 1px solid #232D3F'),
    }));
    const ap = cur ? cur.ap : 0, maxAp = Math.max(6, ap);
    // AP spent drains its pips: the ones just paid flash white and empty (keyed afresh, so the animation plays once).
    const apKey = cur ? cur.id + ':' + cb.round + ':' + cb.turn : '';
    if (!this._ap || this._ap.key !== apKey) this._drain = null;
    else if (ap < this._ap.v) this._drain = { from: this._ap.v, to: ap, seq: ((this._drain && this._drain.seq) || 0) + 1 };
    this._ap = { key: apKey, v: ap };
    const dr = this._drain;
    const apPips = Array.from({ length: maxAp }, (_, i) => ({ key: 'p' + i + (dr && i >= Math.floor(dr.to) && i < Math.ceil(dr.from) ? '-' + dr.seq : ''), cls: dr && i >= Math.floor(dr.to) && i < Math.ceil(dr.from) ? 'phc-pip-drain' : '', style: 'height: 14px; border-radius: 4px; ' + (i < ap - cost ? 'background: #E7EBF3' : i < ap ? 'background: transparent; border: 2px solid #FFFFFF; box-sizing: border-box' : 'background: #1C2536') }));
    const mv = cur ? cur.movement : 1;
    // The one action list (game/commands.ts): the tabs show it, the turn card's commands and their customise dialog pick from it.
    const ITEMS = actionGroups(cb, cur, ch, { noNarrator: !!g.sandbox, g }); // the Proving Ground has no Narrator to rule on anything
    const groups = ITEMS.map(([name, items, ink, gid]) => ({ id: gid, ink, name, nameStyle: 'font-size: 11px; letter-spacing: 0.16em; color: ' + (ink === SIGIL_GLOW ? SIGIL_INK : ink || '#A3AEC2'), items: items.map(([id, label, costText, text, why]) => ({
      // A move that can't be used now still opens (its footer says why); its reason is on the button too.
      name: label, cost: costText, text: why ? why + ' · ' + text : text, why: why || '', locked: !mineTurn, key: id, pressed: S.action === id ? 'true' : 'false', pick: () => { const t = cb.units.find((x) => x.id === this.state.target); this.setState({ action: id, target: id === 'stim' || (t && t.side === 'pc') ? null : this.state.target, aim: null, evc: null, sgToast: '' }); },
      costStyle: 'font-size: 12px; font-weight: 700; color: #E7EBF3',
      style: 'display: flex; justify-content: space-between; align-items: center; min-height: 40px; padding: 0 12px; border-radius: 8px; font-family: inherit; font-size: 14px; cursor: pointer; ' + (ink ? 'border-left: 3px solid ' + ink + '; ' : '') +
        (why && S.action !== id ? 'opacity: 0.62; ' : '') + (S.action === id ? 'border-top: 1px solid ' + (ink || '#E7EBF3') + '; border-right: 1px solid ' + (ink || '#E7EBF3') + '; border-bottom: 1px solid ' + (ink || '#E7EBF3') + '; ' + (ink ? '' : 'border-left: 1px solid #E7EBF3; ') + 'background: #1C2536; color: #E7EBF3' : 'border-top: 1px solid #232D3F; border-right: 1px solid #232D3F; border-bottom: 1px solid #232D3F; ' + (ink ? '' : 'border-left: 1px solid #232D3F; ') + 'background: #10151F; color: #E7EBF3') })) }));
    const actName = { skill: sk ? sk.name : 'Weapon skill', paired: 'Both hands', repair: 'Field Repair', song: 'Play my song', sprint: 'Sprint', disengage: 'Disengage', prone: cur && cur.prone ? 'Stand up' : 'Drop prone', burst: 'Burst', auto: 'Full auto', shove: 'Shove', overwatch: 'Overwatch', brace: 'Brace', move: 'Move', shot: 'Shot', aimed: 'Aimed shot', melee: 'Melee', reload: 'Reload', clear: 'Clear a jam', stim: 'Stim an ally', analyze: 'Analyze', cover: 'Shoot an object', door: 'Open or close a door', pickup: 'Pick up', load: 'Load a magazine',
      draw: 'Draw a glyph', evoke: 'Evoke', scuff: 'Scuff', vent: 'Vent Flux', core: 'Swap core', outburst: 'Outburst', release: 'Release', syphon: 'Syphon', crystallise: 'Crystallise',
      pump: 'Pump', steady: 'Steady the heart', letgo: 'Let it go', feed: 'Feed the glyph', heartwatch: 'Heart Overwatch', 'hold-evoker': 'Hold the Evoker', 'hold-emanator': 'Hold the Emanator' }[S.action] || '';
    const sel = { name: actName + (isMove ? ' · ' + (hv ? moveAp + ' AP for ' + P.dist[hv] + (P.dist[hv] === 1 ? ' tile' : ' tiles') : '1 AP per ' + mv + ' tiles') : pv ? ' · ' + pv.ap + ' AP' : ''),
      text: !mineTurn ? (cb.over ? 'The fight is over.' : cur && cur.side === 'foe' ? cur.name + ' is acting…' : cur ? 'Waiting for ' + (playerOf(owner(cur))?.name || 'a player') + ' (' + cur.name + ').' : '') : isMove ? 'Hover a highlighted tile to see the path and its AP cost; click to move.' : S.action === 'stim' ? (stimTarget ? 'Target: ' + stimTarget.name + '. Confirm to use a stim.' : 'Click an adjacent ally.') : S.action === 'skill' ? (skRuns ? (skWhy ? skWhy : skFx.op === 'multi_shot' ? (tgtUnit ? sk.name + ' at ' + tgtUnit.name + '. Confirm.' : 'Click a hostile.') : 'Confirm to strike every adjacent enemy.') : skPassive ? 'Always on: it applies to every attack you make.' : 'Not run by the engine yet: use Say, and the Narrator rules it.') : S.action === 'paired' ? (tgtUnit ? 'Both hands at ' + tgtUnit.name + '. Confirm.' : 'Click a hostile.') : S.action === 'reload' ? 'Confirm to reload.' : SELF_TEXT[S.action] ? SELF_TEXT[S.action] : S.action === 'clear' ? 'Confirm to clear the jam.' : S.action === 'repair' ? 'Confirm to repair your weapon.' : S.action === 'song' ? 'Confirm to play your song for the room.' : ['prone', 'brace', 'overwatch'].includes(S.action) ? 'Confirm to ' + ({ prone: cur.prone ? 'stand up' : 'drop prone', brace: 'brace your weapon', overwatch: 'hold a shot on overwatch' }[S.action]) + '.' : S.action === 'shove' ? (tgtUnit ? 'Shove ' + tgtUnit.name + (Math.max(Math.abs(+tgtUnit.pos.split(',')[0] - +cur.pos.split(',')[0]), Math.abs(+tgtUnit.pos.split(',')[1] - +cur.pos.split(',')[1])) > 1 ? ': get next to it first.' : '. Confirm.') : 'Click an adjacent enemy.') : S.action === 'cover' ? (coverSel ? 'Target: ' + allObjs.find((o) => o.pos === coverSel && o.hp > 0).name + ', HP ' + allObjs.find((o) => o.pos === coverSel && o.hp > 0).hp + '. Confirm to shoot it.' : 'Click an object with HP.') : S.action === 'door' ? (doorSel ? (doorAt(doorSel).open ? 'Close' : 'Open') + ' the door at ' + refOf(doorSel) + '. Confirm.' : 'Click an adjacent door.') : S.action === 'pickup' ? (pickSel ? 'Pick up: ' + (cb.floor || []).filter((f) => f.pos === pickSel).map((f) => f.text).join(', ') + '.' : 'Click your tile or an adjacent tile marked ▪.') : S.action === 'load' ? (loadInfo ? 'Confirm to load ' + loadInfo.rounds + ' rounds for ' + loadInfo.ap + ' AP.' : 'Nothing to load: you need loose rounds and a part-empty magazine.') : S.action === 'analyze' ? (tgtUnit ? (tgtUnit.analyzedBy ? tgtUnit.name + ' is already analyzed.' : 'Target: ' + tgtUnit.name + '. Click a hostile to change. Confirm to analyze.') : 'Click a hostile.') : pv ? (pv.ok ? (tgtUnit && tgtUnit.side === 'pc' ? 'FRIENDLY FIRE: you are attacking ' + tgtUnit.name + '. Confirm if you mean it.' : 'Click a hostile to change target. Confirm to attack.') : pv.why) : 'Click a hostile to target it.',
      hasPick: false, pickFields: [], extra: mineTurn && isMove && cur.bank ? cur.bank + ' paid-for tile' + (cur.bank > 1 ? 's' : '') + ' left this turn.' : '' };
    if (isMagic && mineTurn) {
      const names = (ids) => ids.map((id) => cb.units.find((x) => x.id === id)).filter(Boolean).map((x) => x.name + (x.side === 'pc' ? (x.id === cur.id ? ' (you!)' : ' (ally!)') : ''));
      const hits = (ids) => (ids.length ? ' It touches ' + names(ids).join(', ') + '.' : ' Nobody is there.');
      const meter = 'Charge ' + mg.charge + '/' + CORE_CHARGE + ' · Flux ' + mg.flux + '/' + FLUX_MAX + ' · ' + mg.cores + (mg.cores === 1 ? ' spare core' : ' spare cores');
      const heart = (mg.emanator ? 'MP ' + Math.round(mg.mp) + '/' + mg.mpMax + ' · ' : 'No Emanator: Outbursts draw on the air · ') + 'Strain ' + mg.strain + '/' + mg.strainLimit;
      const simpleWhy = simpleTry && simpleTry.err;
      const VERB = { scuff: 'scuff out the glyphs under you', vent: 'vent ' + mg.flux + ' Flux into the air', core: 'load a fresh core', syphon: 'syphon MP from the air', crystallise: 'crystallise a mana core' };
      if (S.action === 'draw') {
        const dw = word && wordInfo[word], okd = !!(dw && dw.ok);
        sel.name = 'Draw' + (word ? ' ' + word.toUpperCase() : '') + ' · ' + (okd ? dw.cost.ap : glyphApOf(cur)) + ' AP' + (word ? ' · ' + (okd ? dw.cost.charge : SIGIL[word].charge) + ' charge' : '');
        sel.text = !word ? 'You know no Sigil words.' : !okd ? (dw ? dw.why : 'Not now.') : 'Click your own tile (' + refOf(cur.pos) + ') to draw ' + word.toUpperCase() + ': it ' + dw.effectText + '.' + (dw.fades ? ' ' + dw.fades + ' fades (your cap of glyphs on the ground).' : '') + ' ' + (SIGIL[word].text || '');
        sel.extra = meter + (okd ? ' · ' + dw.capLeft + ' left before your cap' : '') + (okd && dw.overload ? ' · WARNING: this glyph would OVERLOAD your Evoker.' : '');
      } else if (S.action === 'evoke') {
        const pp = evV ? evV.pattern : hoverPanel;
        sel.name = 'Evoke · ' + (evV ? evV.ap : SPELL_AP.evoke) + ' AP' + (evV && evV.charge ? ' · ' + evV.charge + ' charge' : '');
        sel.text = (S.sgToast ? S.sgToast + ' ' : '') + (!evTile ? ((cb.glyphs || []).length ? 'Click a glyph of a Line to Evoke it. Hover one to read it.' + (pp ? ' ' + pp.text : '') : 'No glyphs on the ground: Draw first.')
          : (evV.facing && evV.stage !== 'stand' ? 'Fires ' + evV.facing + '. ' : '') + evV.hint + (evV.fizzle ? ' ' + evV.fizzleText : ''));
        sel.extra = meter + (pp && pp.overload ? ' · ' + pp.overload : '');
      } else if (S.action === 'outburst') {
        const pl = hzPlan, aura = card && card.form === 'aura';
        sel.name = 'Outburst' + (dsel ? ' · ' + dsel.name : '') + (card ? ' · ' + (obMode === 'snap' ? 'Snap ' + card.snapAp + ' AP ×0.6' : 'Begin ' + card.beginAp + ' AP') + ' · ' + card.mp + ' MP' : '');
        sel.text = !dsel ? 'You have no Outburst designs.' : held ? 'You are holding ' + (heldD ? heldD.name : 'an Outburst') + ': Pump it, Release it or Let it go (the HEART panel).' : !card ? 'Not now.' : obMode === 'begin' ? (card.canBegin ? 'Begin ' + dsel.name + ': it holds at stage 0 (×0.6). Pump it (1 AP a stage, to ×2.2) and Release it (1 AP). Confirm to begin.' : card.beginWhy)
          : !S.aim && !aura ? (card.snapWhy || (hz.summary.length ? 'Preview at ' + refOf(hz.aim) + ': ' + hz.summary.join(' ') + ' Click to aim.' : 'Snap: hover to preview, click a tile to aim (' + card.line + ').')) : pl && pl.ok ? (aura ? 'All around you. ' : 'At ' + refOf(S.aim) + '. ') + (hz.summary.length ? hz.summary.join(' ') : 'Nobody is there.') + ' Confirm to let it go.' : (pl && pl.why) || card.snapWhy || 'Not now.';
        sel.extra = card ? card.line + ' · ' + heart : heart;
      } else if (S.action === 'release') {
        const pl = hzPlan, aura = hp && hp.form === 'aura';
        sel.name = 'Release' + (heldD ? ' · ' + heldD.name : '') + (hp ? ' · stage ' + hp.stage + ' ×' + hp.mult : '') + ' · ' + (pl ? pl.ap : SPELL_AP.release) + ' AP';
        sel.text = !held ? 'Nothing held.' : !S.aim && !aura ? (hz.summary.length ? 'Preview at ' + refOf(hz.aim) + ': ' + hz.summary.join(' ') + ' Click to aim.' : 'Hover to preview, click a tile to aim' + (hp ? ' (' + hp.shape + ')' : '') + '.') : pl && pl.ok ? (aura ? 'All around you. ' : 'At ' + refOf(S.aim) + '. ') + (hz.summary.length ? hz.summary.join(' ') : 'Nobody is there.') + ' Confirm to release.' : (pl && pl.why) || 'Not now.';
        sel.extra = (hp && hp.rider ? hp.rider + ' · ' : '') + heart;
      } else if (HEART_ACTS.includes(S.action)) {
        const B = hp ? { pump: hp.pump, steady: hp.steadyBtn, letgo: hp.letgo, feed: hp.feed, heartwatch: hp.watchBtn }[S.action] : null;
        sel.name = actName + (B ? ' · ' + B.cost : '');
        sel.text = !hp ? 'You hold no Outburst: Begin one first.' : B.ok ? B.title + ' Confirm (or use the HEART panel).' : B.why;
        sel.extra = hp ? 'Stage ' + hp.stage + ' ×' + hp.mult + ' · Strain ' + hp.strain + '/' + hp.limit + (hp.warn ? ' · ' + hp.warn : '') : heart;
      } else {
        sel.name = actName + ' · ' + (S.action === 'vent' || S.action === 'core' ? magicAp(cur, S.action) : SPELL_AP[S.action] || 0) + ' AP';
        sel.text = simpleWhy ? simpleWhy : 'Confirm to ' + VERB[S.action] + '.';
        sel.extra = S.action === 'syphon' || S.action === 'crystallise' ? 'Mana ' + mana + ' (' + BAND_NAME[band.id] + ') · ' + heart : S.action === 'scuff' ? ((glyphAt[cur.pos] || []).length ? 'Under you: ' + glyphAt[cur.pos].map(glyphName).join(', ') + '.' : 'No glyphs under you.') : meter;
      }
    }
    if (pkE && mineTurn) {
      sel.name = pkE.label + ' · ' + (pkPv ? pkPv.ap : pkE.ap) + ' AP' + (pkE.uses.label ? ' · ' + pkE.uses.label : '') + (pkE.tab === 'class' ? ' · class move' : '');
      const need = pkE.target === 'ally' ? (pkT ? 'Target: ' + pkT.name + '. ' : 'Click an ally. ') : ['unit', 'enemy'].includes(pkE.target) ? (pkT ? 'Target: ' + pkT.name + '. ' : 'Click a target. ') : pkE.target === 'tile' ? (S.tile ? 'Tile ' + refOf(S.tile) + '. ' : 'Click a tile. ') : '';
      const stWhy = pkState(pkE).why; // an on/off pair or Eye of the Storm read as their state ("in force now", "armed")
      sel.text = need + (pkPv && !pkPv.ok ? (pkE.why && pkPv.why === pkE.why ? stWhy : pkPv.why) : (pkPv && pkPv.lines.length ? pkPv.lines.join(' ') : pkE.text) + (pkE.arm ? (pkE.armed ? ' Armed: confirm to stand it down.' : ' Confirm to arm it: the engine uses it when its moment comes.') : ' Confirm to use it.'));
      sel.extra = (pkE.engine ? 'Engine runs it.' : 'The engine runs its numbers; the Narrator rules the rest after the fight.') + (stWhy ? ' ' + stWhy : '');
      // Each single choice previewed as the engine would take it (once the move's own target is picked).
      const whyOpt = pkP && pkP.fields.length === 1 && !pkP.build && (pkE.target === 'none' || (pkE.target === 'tile' ? !!S.tile : !!pkT)) ? (id) => { const was = bindGame(g); try { const r = previewPerkAction({ u: cur, c: ch, cb, g }, pkE.id, { ...pkArgs, choice: id }, 'combat'); return r && !r.ok ? r.why || 'Not now.' : ''; } catch { return ''; } finally { bindGame(was); } } : null;
      Object.assign(sel, pickerVals(this, cb, pkP, pkV, whyOpt));
    }
    if (pr) Object.assign(sel, pr.sel);
    sel.toggles = tgls.map((t) => ({ key: t.id, label: t.label + (t.on ? ' ✓' : ''), pressed: t.on ? 'true' : 'false', title: (t.preview || t.label) + (t.why ? ' · ' + t.why : ''), off: !!t.why,
      pick: () => { const m = new Set(this.state.mods || []); if (t.on) { m.delete(t.id); if (t.defaultOn) m.add('!' + t.id); } else { m.add(t.id); m.delete('!' + t.id); } this.setState({ mods: [...m] }); },
      style: 'min-height: 30px; padding: 0 10px; border-radius: 999px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; ' + (t.on ? 'border: 1px solid #FFFFFF; background: #1C2536; color: #FFFFFF' : 'border: 1px solid #2E3A50; background: transparent; color: #A3AEC2') + (t.why ? '; opacity: 0.45' : '') }));
    sel.hasToggles = sel.toggles.length > 0;
    const target = tgtUnit ? { zoom: zoomer(this, tgtUnit.img || '', tgtUnit.name, 'portrait'), name: tgtUnit.name, img: tgtUnit.img || '', hasImg: !!tgtUnit.img,
      known: !!tgtUnit.analyzedBy, hpFill: 'width: ' + Math.round(tgtUnit.hp / tgtUnit.maxHp * 100) + '%; height: 100%; background: #F65157',
      line: tgtUnit.analyzedBy ? 'HP ' + tgtUnit.hp + ' / ' + tgtUnit.maxHp + ' · Defense ' + tgtUnit.def + ' · Armour ' + tgtUnit.armour + (effectsOf(tgtUnit).length ? ' · ' + effectsOf(tgtUnit).map((f) => f[0]).join(', ') : '')
        : 'Looks ' + condWord(tgtUnit) + ' · ' + (tgtUnit.tier || 'hostile') + ' · Analyze to see its HP and status',
      odds: pv ? (pv.ok ? 'Hit ' + pv.pct + '% · need ' + pv.need + ' (you roll d20 ' + fmt(pv.toHit) + ')' + (pv.rangePenalty ? ' · range ' + pv.rangePenalty : '') + (pv.cover ? ' · behind half cover −5' : '') : pv.why) : 'Pick an attack to see the odds',
      // Dice stay transparent: every to-hit term by name, and the damage chain (before the target's armour).
      breakdown: pv && pv.ok ? hitBreakdown(pv) : '' } : null;
    const curOwner = cur ? playerOf(owner(cur)) : null;
    /** A unit's magic in a line: Evoker, heart, shield, conditions. */
    const magicLine = (u) => { const m = u.mg, cs = condChips(u); let t = '';
      if (m && m.evoker) t += ' · Flux ' + m.flux + '/' + FLUX_MAX + ' · Charge ' + m.charge;
      if (m && m.emanator) t += ' · MP ' + Math.round(m.mp) + '/' + m.mpMax;
      const hh = m ? heldOutburstOf(m) : null;
      if (hh && (hh.strain || hh.held)) t += ' · Strain ' + hh.strain + '/' + hh.limit;
      if (hh && hh.held) t += ' · Holding ' + hh.held.name + ' (stage ' + hh.held.stage + ')';
      return t + (cs.length && (u.side === 'pc' || u.analyzedBy) ? ' · ' + cs.map((c) => c.k).join(' · ') : ''); };
    const who = cur ? { name: cur.name, img: cur.img || IMG['wick-welcome'], title: cb.over ? 'The fight is over' : cur.side === 'foe' ? cur.name + ' acts' : mineTurn ? 'Your turn: ' + cur.name : cur.name + '\'s turn' + (curOwner ? ' (' + curOwner.name + ')' : ''),
      line: 'HP ' + cur.hp + ' / ' + cur.maxHp + ' · AP ' + cur.ap + (w && w.magazine ? ' · Ammo ' + cur.ammo + '/' + w.magazine : '') + (cur.heat ? ' · Heat ' + cur.heat : '') + (cur.jammed ? ' · JAMMED' : '') + (ch ? ' · Stims ' + ch.stims + ' · Echo ' + ch.echo : '') + magicLine(cur),
      imgStyle: 'width: 56px; height: 56px; border-radius: 50%; object-fit: cover; background: #000; border: 2px solid ' + ring(cur) } : {};
    const anyMagic = (cb.glyphs || []).length > 0 || (cb.zones || []).length > 0 || cb.units.some((u) => u.mg);
    const magicLegend = !anyMagic ? [] : [
      ...placedLegend(placed.kinds, (cb.glyphs || []).length > 0 || cb.units.some((u) => u.mg && u.mg.evoker)),
      ...(cb.units.some((u) => u.mg && u.mg.designs.length) ? [{ key: 'hh', img: heartUri(2), name: 'Holding an Outburst' }] : []),
    ];
    const legend = [...g.players.filter((p) => cb.units.some((u) => owner(u) === p.id)).map((p) => ({ name: p.name + '\'s', style: 'width: 14px; height: 14px; border-radius: 50%; border: 3px solid ' + p.color }))];
    // ---------- the squad panel: you, then your allies (hover a row for the full card) ----------
    /** An HP bar's layers: the red fill drops at once, the white chip under it trails (CSS .phc-hp-fill / .phc-hp-chip). */
    const abar = (pct, col) => 'position: absolute; left: 0; top: 0; bottom: 0; width: ' + Math.max(0, Math.min(100, pct)) + '%; background: ' + col;
    const myU = (mineTurn ? cur : null) || cb.units.find((u) => u.side === 'pc' && owner(u) === me && !u.dead) || null;
    const mc = myU ? g.characters[myU.charId] : null, mw = myU ? WEAPON[myU.weapon] : null;
    const FX_CHIP = 'padding: 2px 8px; border-radius: 999px; border: 1px solid #F65157; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; color: #F65157';
    const meCls = mc ? classOf(mc) : null; // the class emblem and name beside YOU (classIcons.ts)
    const mePanel = myU && mc ? { name: myU.name, img: myU.img || IMG['wick-welcome'], zoom: zoomer(this, myU.img || '', myU.name, 'portrait'), hasCls: !!meCls, clsIcon: meCls ? meCls.icon : '', clsName: meCls ? meCls.name.toUpperCase() : '', clsStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.12em; color: ' + (meCls ? meCls.ink : '#A3AEC2'),
      hp: myU.hp + ' / ' + myU.maxHp, hpFill: abar(myU.hp / myU.maxHp * 100, '#F65157'), hpChip: abar(myU.hp / myU.maxHp * 100, '#FFFFFF'),
      // Everything you spend, below the HP bar (game/resources.ts): ammo, Heat, Evoker charge, cores, Flux, MP, Strain, the
      // held Outburst, class resources, companions. The line under HP keeps AP, Movement, Stims and Echo.
      res: resView(resourcesOf(myU, mc, g)),
      line: 'AP ' + Math.round(myU.ap * 10) / 10 + ' · Movement ' + myU.movement + ' · Stims ' + mc.stims + ' · Echo ' + mc.echo,
      // The one-line summary that stands in for the card on short windows (the bar at the top of the column); the most
      // urgent resources sit in their own row under it (me.res.urgent).
      miniLine: 'AP ' + Math.round(myU.ap * 10) / 10 + (effectsOf(myU).length || condChips(myU).length ? ' · ' + [...effectsOf(myU).map(([k]) => k), ...condChips(myU).map((c) => c.k)].join(' · ') : ''),
      fx: [...effectsOf(myU).map(([k, t]) => ({ key: k, k, t, style: FX_CHIP })), ...condChips(myU)], noFx: !effectsOf(myU).length && !condChips(myU).length, fig: bodyFigure({ injuries: myU.injuries || [], mainSide: myU.hand || 'right' }) } : null;
    const allyRows = cb.units.filter((u) => u.side === 'pc' && (!myU || u.id !== myU.id)).map((u, i) => { const p = playerOf(owner(u)), fx = [...effectsOf(u), ...condChips(u).map((c) => [c.k]), ...(u.mg && u.mg.held ? [['HOLDING · STAGE ' + u.mg.held.stage]] : [])];
      return { key: u.id, name: u.name, img: ART(u.img) || u.img || '', hasImg: !!u.img, short: u.short, player: p ? p.name : '', hp: u.dead ? 'DEAD' : u.hp + ' / ' + u.maxHp, hpFill: abar(u.hp / u.maxHp * 100, '#F65157'), hpChip: abar(u.hp / u.maxHp * 100, '#FFFFFF'),
        fx: fx.map((f) => f[0]).join(' · '), hasFx: fx.length > 0, t: tokenVals(u, { ally: true, player: p ? p.initials + ' · ' + p.name.toUpperCase() : '', color: p ? p.color : '#7FD4FF', inFight: true, right: false, up: false }),
        imgStyle: 'width: 34px; height: 34px; border-radius: 50%; object-fit: cover; background: #000; flex: none; border: 2px solid ' + (p ? p.color : '#7FD4FF') + (u.downed || u.dead ? '; opacity: 0.5' : '') }; });
    const squad = true;
    const say = { can: !!myU && !cb.over, value: S.say || '', onChange: (e) => this.setState({ say: e.target.value }),
      send: () => { const text = (this.state.say || '').trim(); if (!text || !myU) return; act({ type: 'combat/say', charId: myU.charId, text }); this.setState({ say: '' }); } };
    say.submit = (e) => { if (e && e.preventDefault) e.preventDefault(); say.send(); }; // the Say button, or Enter in the box
    // The magic pads under the action list: the glyph keyboard (Draw) and your Outburst designs.
    const padBtn = (on, ink) => 'flex: 1; min-height: 36px; border-radius: 8px; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; ' + (on ? 'border: 1px solid ' + ink + '; background: #1C2536; color: #E7EBF3' : 'border: 1px solid #232D3F; background: #10151F; color: #A3AEC2');
    const pad = {
      words: isMagic && mineTurn && S.action === 'draw' && words.length > 0,
      wordList: S.action === 'draw' ? words.map((wd) => { const wi = wordInfo[wd] || { ok: false, why: '', sub: '', hint: '', title: wd }, on = wd === word, def = SIGIL[wd] || {};
        const why = wi.ok ? '' : wi.why || (mineTurn ? 'Not now.' : 'Not your turn.'), hint = wi.ok ? '' : wi.hint || shortWhy(why);
        // Two short lines under the word: the cost, then what it does (starts, extends…) or why it can't be drawn.
        const sub = wi.sub || (def.charge ?? '?') + ' ch' + (hint ? ' · ' + hint : ''), cut = sub.lastIndexOf(' · ');
        return { key: wd, word: wd.toUpperCase(), icon: glyphUri(wd, wi.ok ? SIGIL_INK : '#7F8BA1', { glow: on && wi.ok }), sub, subA: cut < 0 ? sub : sub.slice(0, cut), subB: cut < 0 ? '' : sub.slice(cut + 3), pressed: on ? 'true' : 'false',
          title: wi.title, off: !wi.ok, disabled: wi.ok ? 'false' : 'true', onKey: (e) => this.wordKey(e),
          aria: (def.word || wd.toUpperCase()) + ', ' + (wordClassName(wd) || 'word') + ', ' + (wi.ok ? wi.sub : 'can\'t draw now: ' + why),
          subStyle: 'font-size: 10px; font-weight: 600; line-height: 1.2; color: ' + (wi.ok ? '#C9D3E3' : '#A3AEC2'),
          pick: () => this.setState({ word: wd }),
          style: 'display: grid; grid-template-columns: 22px minmax(0, 1fr); column-gap: 6px; row-gap: 1px; align-items: center; justify-items: start; min-width: 0; padding: 4px 6px; border-radius: 8px; font-family: inherit; text-align: left; cursor: pointer; color: ' + (wi.ok ? '#E7EBF3' : '#A3AEC2') + '; '
            + (on ? 'border: 1px solid ' + SIGIL_GLOW + '; background: #13303A; box-shadow: 0 0 8px rgba(79, 200, 223, 0.45)' : wi.ok ? 'border: 1px solid #1F4A55; background: #0D1119' : 'border: 1px dashed #2A3A48; background: #0B0F16') + (wi.ok ? '' : '; opacity: 0.8') }; }) : [],
      designs: isMagic && mineTurn && S.action === 'outburst' && designs.length > 0 && !mg?.held, // holding: the HEART panel runs it
      designList: S.action === 'outburst' && mg ? cards.map((d) => { const on = dsel && d.id === dsel.id;
        return { key: d.id, name: d.name, pressed: on ? 'true' : 'false', pick: () => this.setState({ design: d.id, aim: null }), icon: d.icon, line: d.line, school: d.schools, title: d.title,
          stats: d.costText, hasWhy: !d.canBegin, why: d.beginWhy, lineStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.04em; color: ' + d.ink,
          style: 'display: grid; grid-template-columns: 30px minmax(0, 1fr); gap: 2px 8px; align-items: center; padding: 8px 10px; border-radius: 8px; font-family: inherit; text-align: left; cursor: pointer; color: #E7EBF3; '
            + (on ? 'border: 1px solid ' + d.ink + '; background: #221A38; box-shadow: 0 0 10px rgba(174, 155, 255, 0.35)' : 'border: 1px solid #3A2E5C; background: #120E1E') + (d.canBegin ? '' : '; opacity: 0.7') }; }) : [],
      begin: () => { if (card && card.canBegin) { act({ type: 'combat/outburst', unitId: cur.id, design: card.id, hold: true, ...(this._mods && this._mods.length ? { mods: this._mods } : {}) }); this.setState({ aim: null, obMode: 'begin', action: 'pump' }); } },
      snap: () => this.setState({ obMode: 'snap', aim: null }),
      beginLabel: 'Begin' + (card ? ' ' + card.name : '') + ' · ' + (card ? card.beginAp : 2) + ' AP', snapLabel: 'Snap · ' + (card ? card.snapAp : 3) + ' AP ×0.6',
      beginTitle: card ? (card.canBegin ? 'Begin ' + card.name + ' and hold it at stage 0 (+1 Strain).' : card.beginWhy) : '', snapTitle: 'Begin and Release at once, at ×0.6: hover to preview, click a tile to aim, then Confirm.',
      beginOff: !card || !card.canBegin, beginStyle: padBtn(obMode === 'begin', SOUL_INK), snapStyle: padBtn(obMode === 'snap', SOUL_INK), snapPressed: obMode === 'snap' ? 'true' : 'false',
      repick: isMagic && mineTurn && S.action === 'evoke' && !!evTile, repickFn: () => this.setState({ glyphTile: null, aim: null, evc: null, sgToast: '' }),
      ...sigilPad(evV, S, (x) => this.setState(x)),
    };
    // The keyboard in Sigil 1.4 word groups (Elements … Filter), one labelled row each; empty groups are left out.
    pad.wordRows = wordRows(pad.wordList, (w) => w.key).map((r) => ({ key: r.key, label: r.label.toUpperCase(), aria: r.label + ' words', words: r.items }));
    // Rules 1.9: the stroke picker for the word picked (extends FIRE·SEEK / junction / new Line), the engine's default on.
    const sbs = strokeButtons(dwSel);
    pad.hasStrokes = sbs.length > 0; sel.hasStrokes = isMagic && mineTurn && S.action === 'draw' && sbs.length > 0;
    pad.strokeNote = dwSel && dwSel.ok && dwSel.effectText ? 'This glyph ' + dwSel.effectText + '.' : dwSel && !dwSel.ok && sbs.length ? dwSel.why || '' : '';
    pad.hasStrokeNote = !!pad.strokeNote;
    pad.strokeBtns = sbs.map((b) => ({ key: b.key, label: (b.on ? '✓ ' : '') + b.label, title: b.title, pressed: b.on ? 'true' : 'false', off: !b.ok,
      pick: () => this.setState({ stroke: b.key }),
      style: 'min-height: 24px; padding: 0 8px; border-radius: 6px; font-family: inherit; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; cursor: pointer; '
        + (b.on ? 'border: 1px solid ' + SIGIL_GLOW + '; background: #13303A; color: #E7EBF3; box-shadow: 0 0 6px rgba(79, 200, 223, 0.4)' : b.ok ? 'border: 1px solid #1F4A55; background: transparent; color: #8BDEEE' : 'border: 1px dashed #2A3A48; background: transparent; color: #A3AEC2') }));
    sel.strokeBtns = pad.strokeBtns;
    const hpB = hp ? { pump: hp.pump, steady: hp.steadyBtn, letgo: hp.letgo, feed: hp.feed, heartwatch: hp.watchBtn } : {};
    const magicCant = !isMagic ? false : S.action === 'draw' ? true : S.action === 'evoke' ? !evV || !evV.ok : S.action === 'outburst' ? (obMode === 'snap' ? !hzPlan || !hzPlan.ok : !card || !card.canBegin) : S.action === 'release' ? !hzPlan || !hzPlan.ok : HEART_ACTS.includes(S.action) ? !hpB[S.action] || !hpB[S.action].ok : !simpleTry || !!simpleTry.err;
    // The HEART panel at the top of the Outbursts tab while holding: its buttons run the moves at once (Release picks the aim).
    const heartV = heartVals(hp, (id) => { if (id === 'release') return this.pickAction('release'); this.heartAct(id); });
    if (heartV.show) heartV.btns = heartV.btns.map((x) => ({ ...x, pressed: S.action === x.key ? 'true' : 'false' }));
    const won = cb.over === 'win', extracted = cb.over === 'extracted';
    this._ids = new Set(ITEMS.flatMap((gr) => gr[1].map((x) => x[0])));
    // ---------- the turn panel: your actions (YOUR TURN), or a compact card for whoever is acting ----------
    const hasTarget = !!target && ([...ATTACKS, 'shove', 'analyze', 'paired'].includes(S.action) || (S.action === 'skill' && skFx.op === 'multi_shot'));
    const tp = this.pres('tgt', hasTarget ? { ...target, id: tgtUnit.id } : null);
    const pw = this.pres('padW', pad.words ? pad : null), pd = this.pres('padD', pad.designs ? pad : null);
    const cantConfirm = !mineTurn || isMove || (FOCUS_ACTS[S.action] && !!((ITEMS.flatMap((gr) => gr[1]).find((it) => it[0] === S.action) || [])[4])) || magicCant || (pr ? !pr.ready : false) || (pkSel ? !pkPv || !!pkMissing || (!pkPv.ok && !(pkE && pkE.arm)) : false) || (MAGIC.includes(S.action) && !isMagic) || (isMagic ? false : (pv && !pv.ok) || (S.action === 'stim' && !stimTarget) || (S.action === 'cover' && !coverSel) || (S.action === 'door' && !doorSel) || (S.action === 'pickup' && !pickSel) || (S.action === 'load' && !loadInfo) || (S.action === 'analyze' && (!tgtUnit || !!tgtUnit.analyzedBy)) || (S.action === 'shove' && !tgtUnit) || (S.action === 'skill' && (!skRuns || !!skWhy || (skFx.op === 'multi_shot' && !tgtUnit))) || (S.action === 'paired' && !tgtUnit) || (ATTACKS.includes(S.action) && !pv));
    const apNow = mineTurn ? (ap - cost < 0 ? 'needs ' + cost + ' · ' + ap + ' left' : Math.round((ap - cost) * 10) / 10 + ' / ' + ap + ' after this') : ap + ' AP';
    const seenCur = !!cur && seenFoe(cur), curInk = cb.over ? (won ? '#6FEA77' : extracted ? '#A3AEC2' : '#F65157') : cur ? ring(cur) : '#A3AEC2';
    const wait = { kicker: cb.over ? (won ? 'VICTORY' : extracted ? 'EXTRACTED' : 'DEFEAT') : !cur ? 'WAITING' : cur.side === 'foe' ? 'HOSTILES ACTING' : 'WAITING FOR ' + String(curOwner ? curOwner.name : 'a player').toUpperCase(),
      name: cb.over ? cb.name : !cur ? '' : seenCur ? cur.name : 'Unseen hostile', line: cb.over ? 'The fight is over.' : !cur ? '' : cur.side === 'foe' ? (seenCur ? 'Round ' + cb.round + ' · it moves' : 'Something moves out of sight') : 'Round ' + cb.round + ' · ' + (cur.downed ? 'Downed' : cur.ap + ' AP') + (curOwner && curOwner.id !== me ? ' · their move' : ''),
      hasImg: !!(cur && seenCur && cur.img) && !cb.over, img: cur && seenCur ? ART(cur.img) || cur.img || '' : '', noImg: !(cur && seenCur && cur.img) || !!cb.over, short: cb.over ? (won ? '✓' : '✕') : cur && seenCur ? cur.short : '?',
      kickerStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.18em; color: ' + curInk,
      imgStyle: 'width: 48px; height: 48px; object-fit: cover; background: #000; flex: none; ' + (cur && cur.side === 'pc' ? 'border-radius: 50%; border: 3px solid ' + curInk : 'border-radius: 6px; border: 2px solid ' + curInk),
      badgeStyle: 'display: grid; place-items: center; width: 48px; height: 48px; flex: none; font-size: 14px; font-weight: 700; border-radius: ' + (cur && cur.side === 'pc' ? '50%' : '6px') + '; border: 2px dashed ' + curInk + '; color: ' + curInk,
      style: 'display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px; background: #10151F; border: 1px solid #232D3F; border-left: 4px solid ' + curInk };
    // ---------- the action tabs (Move · Attack · Utility · Sigils · Outbursts): one family at a time, each scrolling on its
    // own inside the pinned column, so the grid (and every effect on it) stays in view whatever you pick ----------
    const tabOf = {}; groups.forEach((gr) => gr.items.forEach((a) => { tabOf[a.key] = gr.id; }));
    const tabIds = groups.map((gr) => gr.id);
    if (mineTurn && newTurn) { // a new turn of yours: the tab this character used last, else Attack with a hostile in sight, else Move
      const seenHostile = foes.some((u) => !u.downed && vis.seen.has(u.id));
      // Holding an Outburst (rules 1.5): the turn opens on the heart (the swell has just landed; Pump or Release).
      S.tab = cur.mg && cur.mg.held && tabIds.includes('outbursts') ? 'outbursts' : tabMem(cur.charId) || (seenHostile && tabIds.includes('attack') ? 'attack' : 'move');
      this._tabAction = S.action; this._tabShown = S.tab; this._tabCls = '';
    }
    // The tab follows the action: picked on the turn card, or implied by a tile click (a hostile → Attack).
    if (S.action !== this._tabAction) { this._tabAction = S.action; if (tabOf[S.action]) S.tab = tabOf[S.action]; if (mineTurn) this.revealAction(); }
    if (!tabIds.includes(S.tab)) S.tab = tabOf[S.action] || tabIds[0];
    if (mineTurn) tabMem(cur.charId, S.tab);
    this._tabs = tabIds; this._tabOf = tabOf;
    if (S.tab !== this._tabShown) { // flipping: the new tab's actions slide in from the side it sits on
      this._tabCls = this._tabShown == null ? '' : tabIds.indexOf(S.tab) > tabIds.indexOf(this._tabShown) ? 'phc-slide-in-right' : 'phc-slide-in-left'; this._tabShown = S.tab;
    }
    const klass = classOf(ch);
    const tabs = groups.map((gr, i) => {
      const on = gr.id === S.tab, ink = gr.id === 'class' && klass ? klass.ink : TAB_INK[gr.id] || '#E7EBF3', n = gr.items.length, holds = !on && tabOf[S.action] === gr.id;
      return { key: gr.id, id: 'phc-tab-' + gr.id, name: TAB_NAME[gr.id] || gr.name, icon: gr.id === 'class' && klass ? klass.icon : '', count: n, num: i < 6 ? String(i + 1) : '', selected: on ? 'true' : 'false', tabindex: on ? '0' : '-1',
        label: (TAB_NAME[gr.id] || gr.name) + ', ' + n + (n === 1 ? ' action' : ' actions') + (holds ? ', holds your chosen action' : ''), keys: i < 6 ? String(i + 1) : undefined,
        title: gr.name + ' · ' + n + (n === 1 ? ' action' : ' actions') + (i < 6 ? ' · key ' + (i + 1) : ''),
        pick: () => this.setTab(gr.id), onKey: (e) => this.tabKey(e), holds,
        // Each tab wears its family's ink: full when open, a faint underline when not (with the word, never colour alone).
        style: 'position: relative; flex: 1 1 auto; min-width: 0; display: flex; align-items: center; justify-content: center; gap: 4px; min-height: 38px; padding: 0 5px; border: 0; border-bottom: 2px solid ' + (on ? ink : ink + '55') + '; border-radius: 8px 8px 0 0; background: ' + (on ? '#1C2536' : 'transparent') + '; color: ' + (on ? ink : '#A3AEC2') + '; font-family: inherit; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; white-space: nowrap; cursor: pointer',
        countStyle: 'flex: none; min-width: 15px; padding: 0 4px; border-radius: 999px; font-size: 9.5px; line-height: 15px; letter-spacing: 0; text-align: center; ' + (on ? 'background: ' + ink + '; color: #0A0D13' : 'background: #1C2536; color: #C9D3E3'),
        numStyle: 'position: absolute; left: 4px; top: 2px; font-size: 9px; font-weight: 600; letter-spacing: 0; color: ' + (on ? '#A3AEC2' : '#5D6A80'),
        holdStyle: 'position: absolute; right: 4px; top: 4px; width: 6px; height: 6px; border-radius: 50%; background: #FFFFFF' };
    });
    const tabG = groups.find((gr) => gr.id === S.tab) || groups[0];
    const tabPanel = tabG ? [{ key: 'tp-' + tabG.id, tab: 'phc-tab-' + tabG.id, name: tabG.name, nameStyle: tabG.nameStyle, cls: 'phc-cb-tabpanel', innerCls: this._tabCls,
      heart: tabG.id === 'outbursts' && !!heartV.show, hv: heartV,
      items: tabG.items.filter((a) => !(tabG.id === 'outbursts' && heartV.show && ['pump', 'release', 'steady', 'letgo', 'feed', 'heartwatch'].includes(a.key))).map((a) => ({ ...a, padW: a.key === 'draw' && pw.show, padE: a.key === 'evoke' && !!pad.repick, padD: a.key === 'outburst' && pd.show })) }] : [];
    // Leon (8 Nov 2026): the whole action panel greys out until it is really your turn: someone else's turn, or the
    // enemies' moves still playing on screen after the engine has handed the turn back (Say stays usable).
    const holdUntil = mineTurn && typeof performance !== 'undefined' ? turnsBusyUntil() : 0, holding = holdUntil > performance.now();
    if (holding && !this._holdTimer) this._holdTimer = setTimeout(() => { this._holdTimer = null; if (LIVE === this) this.setState({}); }, Math.ceil(holdUntil - performance.now()) + 30);
    const lock = cb.over ? '' : holding ? 'held' : !mineTurn ? 'wait' : '';
    const lockMsg = lock === 'held' ? 'The other turns are still playing out…' : lock === 'wait' ? (cur && cur.side === 'foe' ? 'Hostiles acting…' : cur ? 'Waiting for ' + cur.name + '…' : 'Waiting…') : '';
    const vowV = vowPromptVals(this, g, cb, cur, mineTurn, act); this._vow = vowV.show ? vowV : null;
    const T = {
      tabs, tabPanel, showWho: !mePanel, lock, lockMsg, vow: vowV,
      mine: mineTurn, waiting: !mineTurn, wait, ytInk: curInk, ytSub: 'ROUND ' + cb.round + ' · ' + ap + ' AP',
      ytStyle: 'position: relative; overflow: hidden; display: flex; align-items: center; gap: 12px; margin: 0 6px; padding: 9px 18px; background: #FFFFFF; color: #0A0D13; box-shadow: -6px 0 0 ' + curInk + ', 0 6px 18px rgba(0, 0, 0, 0.45)',
      who, zoomPc: zoomer(this, who.img, who.name, 'portrait'), apText: apNow, apPips, groups, sel, pad,
      padWShow: pw.show, padWCls: 'phc-a-rise' + pw.cls, padW: pw.val || {}, padDShow: pd.show, padDCls: 'phc-a-rise' + pd.cls, padD: pd.val || {},
      tgtList: tp.show ? [{ ...tp.val, key: 'tgt-' + tp.val.id, cls: 'phc-a-right' + tp.cls }] : [],
      cantConfirm, confirmText: S.action === 'draw' && isMagic ? 'Click a tile to draw' : 'Confirm', confirmSfx: isMagic ? 'none' : undefined,
      confirm: () => this.confirm(tgtUnit, attackMode, stimTarget), endTurn: () => act({ type: 'combat/end-turn', unitId: cur.id }), notMine: !mineTurn,
    };
    // The grid fits the room beside the pinned column (fitGrid measures; it runs again on resize and when the map changes).
    const zoom = this._zoom || 1, fitKey = cb.map.w + 'x' + cb.map.h;
    if (fitKey !== this._fitKey && typeof requestAnimationFrame !== 'undefined') { this._fitKey = fitKey; requestAnimationFrame(() => this.fitGrid()); }
    // ---------- the column hidden: a mini-bar keeps the turn playable ----------
    const hidden = PANEL_HIDDEN;
    const lay = this.layoutVals(hidden);
    const quick = mineTurn ? resolveCommands(cb, cur, ch, readPrefs(g, cur.charId), { noNarrator: !!g.sandbox, g }) : [];
    this._quick = hidden ? quick : null;
    const mini = { show: hidden && mineTurn,
      style: 'position: fixed; right: ' + (g.sandbox ? 64 : 20) + 'px; bottom: 16px; z-index: 12; width: min(380px, calc(100vw - 32px)); display: flex; flex-direction: column; gap: 7px; padding: 10px 12px; border-radius: 12px; background: rgba(16, 21, 31, 0.97); border: 1px solid #2E3A50; border-top: 3px solid #FFFFFF; box-shadow: 0 14px 40px rgba(0, 0, 0, 0.6)',
      pips: apPips.map((p) => ({ ...p, style: p.style.replace('height: 14px', 'height: 8px') })),
      cmds: quick.map((c) => { const on = S.action === c.action || (c.action === 'shot' && melee && S.action === 'melee');
        return { key: c.key, label: c.label, title: c.key + ' · ' + c.label + ' · ' + c.sub, off: !!c.off, pressed: on ? 'true' : 'false', action: c.action,
          pick: () => this.pickAction(c.action),
          style: 'display: flex; flex-direction: column; align-items: flex-start; gap: 1px; min-width: 0; min-height: 40px; padding: 4px 6px; border-radius: 8px; font-family: inherit; text-align: left; cursor: pointer; color: #E7EBF3; '
            + (on ? 'border: 1px solid #FFFFFF; background: #1C2536' : 'border: 1px solid #232D3F; background: #10151F') + (c.off ? '; opacity: 0.45; cursor: default' : '') }; }) };
    const turnPanels = this.panels(mineTurn ? 'mine:' + cur.id + ':' + cb.round + ':' + cb.turn : 'wait:' + (cb.over ? 'over' : cur ? cur.id + ':' + cb.round + ':' + cb.turn : 'none'), T);
    return {
      ...lightboxVals(this), zoomPc: zoomer(this, who.img, who.name, 'portrait'), who, legend, turnPanels,
      gridStyle: 'display: grid; grid-template-columns: 18px repeat(' + cb.map.w + ', 46px); grid-template-rows: 18px repeat(' + cb.map.h + ', 46px); gap: 2px; width: max-content; padding: 8px; border-radius: 12px; background: #05070B; border: 1px solid #232D3F' + (zoom !== 1 ? '; zoom: ' + zoom : '') + (hidden ? '; margin: 0 auto 0 0' : ''),
      // The Proving Ground's tools tab sits on the right edge: keep the action column clear of it.
      rowStyle: 'flex: 1 1 auto; min-height: 0; display: flex; padding: 0 ' + (g.sandbox ? 60 : 24) + 'px 12px 24px' + (lay.swap ? '; flex-direction: row-reverse' : ''), lay,
      // Room around the grid inside its scrolling column (top and right) for the hover chips over edge tiles.
      mz: this.zoomVals(),
      // A big Manual size never pushes the action zone below its minimum: the map scrolls inside its zone instead.
      leftStyle: (hidden || LAYOUT.width ? '' : 'max-width: calc(100% - ' + (ASIDE_MIN + 12) + 'px); ') + 'flex: ' + (hidden ? '1 1 auto' : '0 1 ' + (LAYOUT.width ? clampWidth(LAYOUT.width, 99999) : Math.ceil((48 * cb.map.w + 36) * zoom + 34)) + 'px') + '; min-width: 0; min-height: 0; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; overflow-x: hidden; padding: 14px 34px 0 0',
      // On your turn the turn box takes the room under the Say row (its tab panel is what shrinks); the You card above
      // it is capped (CSS .phc-mine) and scrolls on its own, so the Say row, YOUR TURN and Confirm never scroll away.
      turnBoxStyle: 'position: relative; display: flex; flex-direction: column; min-height: 0; flex: ' + (mineTurn ? '1 1 0px' : '0 0 auto'),
      panelOpen: !hidden, panelHidden: hidden, togglePanel: () => this.togglePanel(), asideCls: mineTurn ? 'phc-mine' : '', mini, quick,
      canCustomise: !!myU && !cb.over, customise: () => openCustomise(myU && myU.charId),
      pad, magicLegend, hasMagicLegend: magicLegend.length > 0,
      worldLegend: WLc.legend, hasWorldLegend: WLc.legend.length > 0,
      ...(() => { // Search a cache in the fight (1 AP of the turn, adjacent): a button for each one next to the acting unit.
        const list = !mineTurn || !cur ? [] : objectsOf(cb).filter((o) => !o.hidden && !o.searched && (o.itemCount ?? (o.items || []).length) > 0 && (o.kind === 'cache' || o.itemCount != null || (o.items || []).length) && dist(cur.pos, o.pos) <= 1);
        const cs = list.map((o) => { const n = o.itemCount ?? (o.items || []).length, why = o.searched || !n ? 'empty' : o.locked ? 'locked' : cur.ap < 1 ? 'needs 1 AP' : '';
          return { key: o.id, label: 'Search ' + o.name + ' · 1 AP', sub: why || 'holds ' + n + (n === 1 ? ' thing' : ' things'), off: !!why, go: () => { if (!why) act({ type: 'combat/search', unitId: cur.id, objId: o.id }); } }; });
        return { cbSearch: cs, hasCbSearch: cs.length > 0 }; })(),
      manaText: 'MANA ' + mana + ' · ' + BAND_NAME[band.id], manaTitle: 'The ambient mana meter (0 to 40): ' + BAND_NAME[band.id] + ' air. Deaths and vented Flux raise it; Outbursts, Syphon and Crystallise draw it down.',
      manaStyle: 'padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; border: 1px solid #232D3F; color: #A3AEC2', showMana: anyMagic,
      confirmSfx: isMagic ? 'none' : undefined, confirmText: S.action === 'draw' && isMagic ? 'Click a tile to draw' : 'Confirm',
      roundText: 'ROUND ' + cb.round + ' · ' + cb.map.name.toUpperCase() + ' · ' + cb.name.toUpperCase(),
      turnChip: cb.over ? (won ? 'VICTORY' : extracted ? 'EXTRACTED' : 'DEFEAT') : mineTurn ? 'YOUR TURN' : cur && cur.side === 'foe' ? 'HOSTILES ACTING' : 'WAITING', turnChipStyle: 'padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; border: 1px solid ' + (mineTurn ? '#FFFFFF' : '#232D3F') + '; color: ' + (mineTurn ? '#FFFFFF' : '#A3AEC2'),
      initiative, tiles, apPips, apText: apNow, groups, sel, hasTarget, squad, say, me: mePanel, hasMe: !!mePanel, allyRows, hasAllies: allyRows.length > 0, target: target || {},
      log: cb.log.slice(-6).map((text, i) => { const pl = patronLogCard(text); return { key: cb.log.length - 6 + i, text, isPlain: !pl, isPatron: !!pl, pl: pl || {} }; }),
      cantConfirm, confirm: T.confirm, endTurn: () => act({ type: 'combat/end-turn', unitId: cur.id }), notMine: !mineTurn,
      toStory: () => go('main'), report: openReport, over: !!cb.over, overColor: won ? '#6FEA77' : extracted ? '#A3AEC2' : '#F65157', overKicker: won ? 'VICTORY' : extracted ? 'EXTRACTED' : 'DEFEAT',
      overTitle: cb.name, overText: (cb.summary || '') + (g.sandbox ? '' : ' The Narrator picks up the story.'),
    };
  }

  tileClick(k) {
    const S = this.state, g = getState().game, cb = castFight(g, g.combat, ART), cur = active(cb);
    if (MAGIC.includes(S.action) && cur && cur.mg) return this.magicClick(k, cur);
    const u = cb.units.find((x) => x.pos === k && !x.dead);
    // A perk action that wants a target or a tile takes the click (an ally, anyone, or the tile itself).
    // Its own target first; then a picker's grid field (a second tile, another unit); else the click re-aims the target.
    if (this._vow && this._vow.click(u)) return;
    if (this._pr && cur) { const patch = this._pr.click(u, k); if (patch) return this.setState(patch); }
    if (this._pk && cur) {
      const p = this._pk, t = p.e.target, other = !!u && u.id !== cur.id, primary = other && (t === 'unit' || t === 'enemy' || t === 'npc' || (t === 'ally' && u.side === 'pc'));
      if (primary && !p.target) return this.setState({ target: u.id });
      if (t === 'tile' && !S.tile) return this.setState({ tile: k });
      if (p.P) { const nv = gridPick(p.P, p.V, other ? { id: u.id, side: u.side } : null, k); if (nv) return this.setState({ pkForm: { key: S.action, v: nv } }); }
      if (primary) return this.setState({ target: u.id });
      if (t === 'tile') return this.setState({ tile: k });
    }
    if (u && u.side === 'foe') { const a = ['shot', 'aimed', 'melee', 'burst', 'auto', 'shove', 'analyze', 'skill', 'paired'].includes(S.action) ? S.action : (WEAPON[cur?.weapon] && isMelee(WEAPON[cur.weapon]) ? 'melee' : 'shot'); this.setState({ target: u.id, action: a, ...this.tabFor(a) }); return; }
    if (u && u.side === 'pc' && S.action === 'stim') { this.setState({ target: u.id }); return; }
    // Anyone is a target (spec: Anyone is a target): an ally under an attack action is friendly fire.
    if (u && u.side === 'pc' && cur && u.id !== cur.id && ['shot', 'aimed', 'melee', 'burst', 'auto', 'shove', 'paired'].includes(S.action)) { this.setState({ target: u.id }); return; }
    if (S.action === 'cover' || S.action === 'pickup' || S.action === 'door') { this.setState({ tile: k }); return; }
    if (objectsOf(cb).some((o) => o.pos === k && o.hp > 0) && ['shot', 'aimed', 'melee'].includes(S.action)) { this.setState({ action: 'cover', tile: k, ...this.tabFor('cover') }); return; }
    if (!['move', 'sprint', 'disengage'].includes(S.action) || !cur) return;
    act({ type: 'combat/move', unitId: cur.id, to: k, how: S.action, ...(this._mods && this._mods.length ? { mods: this._mods } : {}) });
    this.setState({ hover: null });
  }

  /** A held heart's move (rules 1.5): Pump, Steady, Let go, Feed, Heart Overwatch on or off. */
  heartAct(id) {
    const cb = getState().game?.combat, cur = cb && active(cb); if (!cur || !cur.mg) return;
    if (id === 'heartwatch') return act({ type: 'combat/heartwatch', unitId: cur.id, on: !(cur.mg.held && cur.mg.held.watch) });
    if (['pump', 'steady', 'letgo', 'feed'].includes(id)) act({ type: 'combat/' + id, unitId: cur.id, ...(id === 'pump' && this._mods && this._mods.length ? { mods: this._mods } : {}) });
    if (id === 'letgo') this.setState({ action: 'outburst', aim: null, obMode: 'begin' });
  }
  /** A tile click while a spell is chosen: draw there, pick a pattern, or aim. */
  magicClick(k, cur) {
    const S = this.state, m = this._mg || {}, g = getState().game, cb = g.combat;
    if (S.action === 'draw') { if (m.word) { act({ type: 'combat/draw', unitId: cur.id, word: m.word, tile: k, ...(m.stroke ? { stroke: m.stroke } : {}) }); if (S.stroke) this.setState({ stroke: null }); } return; }
    if (S.action === 'evoke') {
      const r = evokeClick(m.evTile ? m.evV || null : null, cb, cur, k, S.evc || {});
      if (r.pattern !== undefined) return (m.seenGlyph && m.seenGlyph(r.pattern)) ? this.setState({ glyphTile: r.pattern, evc: {}, sgToast: '' }) : undefined; // only a glyph you can see picks a pattern
      if (r.choice) return this.setState({ evc: r.choice, sgToast: '' });
      return this.setState({ sgToast: r.toast || '' });
    }
    if (S.action === 'outburst') return this.setState({ aim: k, obMode: 'snap' }); // a tile click means a snap at it
    if (S.action === 'release') return this.setState({ aim: k });
  }

  confirm(tgt, mode, stimTarget) {
    const cur = active(getState().game.combat), a = this.state.action, S = this.state, m = this._mg || {};
    if (MAGIC.includes(a) && cur && cur.mg) {
      if (a === 'evoke') { if (m.evV && m.evV.payload) act({ type: 'combat/evoke', unitId: cur.id, ...m.evV.payload }); return this.setState({ glyphTile: null, aim: null, evc: null, sgToast: '' }); }
      const mx = this._mods && this._mods.length ? { mods: this._mods } : {};
      if (a === 'outburst') { if (m.design) act(S.obMode === 'snap' ? { type: 'combat/outburst', unitId: cur.id, design: m.design, aim: S.aim || cur.pos, hold: false, ...mx } : { type: 'combat/outburst', unitId: cur.id, design: m.design, hold: true, ...mx }); return this.setState({ aim: null, obMode: 'begin', ...(S.obMode === 'snap' ? {} : { action: 'pump' }) }); }
      if (HEART_ACTS.includes(a)) return this.heartAct(a);
      if (a === 'release') { act({ type: 'combat/release', unitId: cur.id, aim: S.aim || undefined, ...mx }); return this.setState({ aim: null }); }
      if (['scuff', 'vent', 'core', 'syphon', 'crystallise'].includes(a)) return act({ type: 'combat/' + a, unitId: cur.id });
      return;
    }
    if (MAGIC.includes(a)) return; // a spell for a unit with no magic is never an attack
    if (parsePray(a)) { const p = this._pr; if (p && p.ready) act(p.payload); return this.setState({ target: null, target2: null, tile: null }); }
    const pk = parsePk(a);
    if (pk) { const p = this._pk; act({ type: 'combat/perk', unitId: cur.id, id: pk.id, ...(p && p.args ? p.args : { actionId: pk.actionId }), ...(p && p.e.arm ? { arm: true } : {}) }); return this.setState({ pkForm: null }); }
    if (a === 'reload') return act({ type: 'combat/reload', unitId: cur.id });
    if (a === 'reload2') return act({ type: 'combat/reload', unitId: cur.id, hand: 'both' });
    if (a === 'hide') return act({ type: 'combat/hide', unitId: cur.id });
    if (a === 'extinguish') return act({ type: 'combat/extinguish', unitId: cur.id });
    if (FOCUS_ACTS[a]) { const ch = getState().game.characters[cur.charId], i = focusPackIdx(ch, FOCUS_ACTS[a]); if (i >= 0) act({ type: 'combat/swap', unitId: cur.id, from: i, to: 'off' }); return this.setState({ action: 'move' }); }
    if (a === 'escape') return act({ type: 'combat/escape', unitId: cur.id });
    if (a === 'recover') return act({ type: 'combat/recover', unitId: cur.id });
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
    if (tgt) act({ type: 'combat/attack', unitId: cur.id, targetId: tgt.id, mode, ...(this._mods && this._mods.length ? { mods: this._mods } : {}) });
  }
}
