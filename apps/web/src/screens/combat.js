// Combat, ported from design/canvas-build/combat.logic.js onto the engine's fight: real initiative, the grid,
// path arrows with their AP cost, real hit odds, and every action checked by the engine. Enemies act on their own.
import { shellVals } from './shell';
import { DCLogic } from '../dc/runtime';
import { D, IMG, ART, faceOf, zoneOf, spriteOf, tileBg, spriteStyle, lightboxVals, zoomer, mod, fmt, tokenVals, effectsOf, bodyFigure, ensureStyle, ensureMotionCss, tabNavIndex } from './shared';
import { reducedMotion, sfx } from '../game/sfx';
import { fightPace } from '../game/combatSpeed';
import { WEAPON, musicTraitOf, songOf, active, paths, previewAttack, isMelee, analyzeCost, coverOf, difficultOf, dist, ROUNDS_PER_AP, refOf, notesAt, objectsOf, kindOf, fightSight, isUnseenId, litAt,
  SIGIL, SCHOOL, MODULE, MANA_START, FLUX_MAX, CORE_CHARGE, SPELL_AP, manaBand, condName, condText, stageMult, glyphApOf, glyphsAt, findPattern, previewEvoke, previewOutburst,
  designCost, designAp, designRange, spellTargets, drawGlyph, releaseOutburst,
  togglesFor, routeHazards, STAGE_MULT, encoreCredit, FAITH_PATRON,
  moveOptions, reachTiles, weaponSystem, dryRun as engineDryRun, withGame, fightSeenBy, previewSeenBy,
  attemptWhy, ATTEMPT_AP, FIGHT_CONDS, FIGHT_COND_NAME, SKILL as SKILLS_BY_ID, TN_LADDER, sendDescriptor } from '@engine';
import { act as actNow, getState, go, toast } from '../game/store';
import { turnsBusyUntil, fxBusyUntil, fxHeldUnits, fxShownHp, fxShownGlyphs, fxShownLog, fxShownTurn, setTokenLooks } from '../game/fx/play';
/** The enemies' turns run at once in the engine, so "your turn" arrives while their moves are still being shown: until
 *  they have played, your actions wait (you can still talk). Never longer than the effects layer's cap. */
const act = (a) => {
  if (a && /^combat\//.test(a.type) && a.type !== 'combat/say' && typeof performance !== 'undefined' && performance.now() < turnsBusyUntil()) {
    toast('Wait: the other turns are still playing out.'); return null;
  }
  return actNow(a);
};
import { readZoom, saveZoom, normaliseZoom, zoomAction, zoomLabel, ZOOM_MIN, ZOOM_MAX, ZOOM_CSS } from '../game/mapZoom';
import { CameraView, CAMERA_CSS } from '../game/cameraView';
import { usualScale, overviewScale, naturalSize, fitsWhole, panKey, REF_W } from '../game/camera';
import { readLayout, saveLayout, normalise, placement, isDefault, startPanelDrag, keyMovePanel, startSplit, splitKey, clampWidth, LAYOUT_CSS, DEFAULT_LAYOUT } from '../game/combatLayout';
import { forecastVals } from '../game/manaForecast';
import { echoView } from '../game/echoView';
import { castFight } from '../game/cast';
import { worldLayer, kindBadge, pilesIn, pileRows, pileTake, pickupLabel, pickupWhy, toggleUntick, crossesText, pileTipStyle, CROSS_STYLE, CROSS_CHIP_STYLE } from '../game/worldView';
import { openReport } from '../game/report';
import { glyphUri, scratchUri, heartUri, joinUri, SIGIL_INK, SIGIL_GLOW, SOUL_INK } from '../game/glyphs';
import { glyphKeyNav } from '../game/glyphKeys';
import { classMarks } from '../game/classMarks';
import { drawStrip, wordRows, shortWhy, wordClassName, patternPanel, evokeView, evokeClick, placedView, placedLegend, mergeTiles, glyphMark, actionPreviewTiles, strokeButtons, strokeLayer, readableAt, traceMark, wordMasteryChips } from '../game/sigilView';
import { backpackView } from '../game/backpack';
import { physOf, pressureLook, physLines, physChips, watchMarks, weaponBlocks, padView, padOf, padAction, techAction, TWATCH, TPAD, needsAlly, ATTACK_MODES, isAttackMode } from '../game/techView';
import { gearIconUri, hasGearIcon, GEAR_INK, GEAR_INK_OFF } from '../game/gearIcons';
import { lootLogLine } from '../game/worldView';
import { callChips, CL } from '../game/callView';
import { mapLegacy, isLegacyUnit, plainAction, actionGroups, resolveCommands, readPrefs, openCustomise, BAND_NAME, TAB_NAME, EV_CMDS_CHANGED, perkEntries, isPerkInfo, PKI, parsePk, PK, classOf, pkState } from '../game/commands';
import { pickerFor, buildArgs, gridPick } from '../game/actionPickers';
import { flowView } from '../game/actionFlow';
import { tipAttrs, mountActionTips } from '../game/actionTip';
import { areaOrder, areaHead } from '../game/attackAreas';
import { perkShelves, turnMark, SHELF_LABEL, SHELF_HELP } from '../game/perkShelves';
import { vowPromptVals, patronLogCard, faithHeadVals } from './faithCombat';
import { FAITH_GOLD, FAITH_INK } from '../game/faithView';
import { resourcesOf, resView, heldOutburstOf, RES_CSS } from '../game/resources';
import { designCards, heartPanel, heartVals, aimOverlay, idleOverlay, noOverlay, overlayTileStyle, overlayRingStyle, markChipStyle, markChipText } from '../game/heartView';

/** Confirm lines for the self-only actions of rules 1.3 (reload both, hide, put out a fire, break free, recover). */
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
    // Rules 1.10 Junctions: the tile's glyph lies in two Lines; pick which one to Evoke (the aim starts over).
    sgJunction: (evV.junction || []).map((j) => ({ key: j.key, label: (j.on ? '✓ ' : '') + j.label, pressed: j.on ? 'true' : 'false', style: chip(j.on), pick: () => set({ evc: { stroke: j.key }, aim: null }) })),
    sgHasJunction: (evV.junction || []).length > 1,
  };
}
/** Try an engine action on a throwaway copy of the fight: the engine's own refusal (or null), the unit afterwards and
 *  the AP it took. The copy, the bound game and the dice are the engine's (preview.ts dryRun); the screen copies nothing. */
const dryRun = (g, cb, uid, fn) => engineDryRun(g, cb, uid, fn);
export { dryRun as _dryRun };
/** Encore's key in words (items 729, 737): "combat/attack:shot" → "Attack (shot)". */
export const encoreWords = (key) => { const [t, what] = String(key || '').split(':'); const n = t.replace('combat/', ''); return (n.charAt(0).toUpperCase() + n.slice(1)).replace('-', ' ') + (what ? ' (' + what + ')' : ''); };
/** The switches an action carries (its mods): the ones set and usable, and a default-on one turned off as "!id". */
const modsOf = (tgls) => tgls.filter((t) => t.on && !t.why).map((t) => t.id).concat(tgls.filter((t) => t.defaultOn && !t.on).map((t) => '!' + t.id));
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
// Their times are × var(--phc-k): the combat speed (game/combatSpeed.ts; Normal ≈ 15% slower than Fast).
const COMBAT_CSS = [
  // The map's row and column labels take the pointer over their 2 px gaps too, so a tile scrolled under them is never hovered.
  '.phc-axis::before{content:\'\';position:absolute;inset:-2px}',
  '.phc-cb-dock[data-lock="wait"] > :not(.phc-cb-say2):not(.phc-cb-lockmsg):not([data-phc-vow-prompt]), .phc-cb-dock[data-lock="held"] > :not(.phc-cb-say2):not(.phc-cb-lockmsg):not([data-phc-vow-prompt]){opacity:.38;filter:grayscale(1);pointer-events:none;transition:opacity .2s}',
  '.phc-cb-lockmsg{flex:none;padding:6px 10px;border:1px solid #232D3F;border-radius:8px;background:#10151F;color:#A3AEC2;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}',
  '@keyframes phcYtIn{0%{transform:translateX(70px) skewX(-14deg);opacity:0}60%{transform:translateX(-4px) skewX(-14deg);opacity:1}100%{transform:skewX(-14deg);opacity:1}}',
  '@keyframes phcYtShine{0%{transform:translateX(-120%) skewX(-20deg)}100%{transform:translateX(260%) skewX(-20deg)}}',
  '.phc-yt{transform:skewX(-14deg);animation:phcYtIn calc(.42s * var(--phc-k, 1)) cubic-bezier(.2,.8,.2,1) both}.phc-yt>*{transform:skewX(14deg)}',
  '.phc-yt::after{content:"";position:absolute;top:0;bottom:0;left:0;width:30%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.75),transparent);animation:phcYtShine calc(.9s * var(--phc-k, 1)) ease-out calc(.35s * var(--phc-k, 1)) both;pointer-events:none}',
  '.phc-cb-act{transition:transform .12s ease-out,box-shadow .12s ease-out,background-color .12s}',
  '.phc-key-code::before{content:attr(data-code)}', // (the two-key code is drawn, not text: a button's name stays its name)
  '.phc-cb-act:not(:disabled):hover{transform:translateY(-2px);box-shadow:0 6px 16px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.18)}',
  '.phc-cb-act:not(:disabled):active{transform:translateY(1px) scale(.985);box-shadow:none;transition-duration:.04s}',
  '@keyframes phcCurRing{0%{transform:scale(1);opacity:.95}100%{transform:scale(1.32);opacity:0}}.phc-cur-ring{animation:phcCurRing calc(1.3s * var(--phc-k, 1)) ease-out infinite}',
  '@keyframes phcTgtRing{0%,100%{opacity:.45}50%{opacity:1}}.phc-tgt-ring{animation:phcTgtRing calc(1.6s * var(--phc-k, 1)) ease-in-out infinite}',
  '@keyframes phcPlanIn{from{opacity:0}to{opacity:1}}.phc-plan{animation:phcPlanIn calc(.22s * var(--phc-k, 1)) ease-out both}',
  // A False Image's shimmer (game/classMarks.ts sets it inline on the decoy; still under reduced motion).
  '@keyframes phcDecoy{0%,100%{opacity:.42;filter:saturate(.4) brightness(1.05) drop-shadow(0 0 3px rgba(79,200,223,.6))}50%{opacity:.66;filter:saturate(.5) brightness(1.25) drop-shadow(0 0 7px rgba(79,200,223,.9))}}',
  '.phc-reduce .phc-plan{animation:none!important}@media (prefers-reduced-motion: reduce){.phc-plan{animation:none!important}}',
  // The shared in-and-out pairs (main.tsx: .phc-a-right … .phc-closing) inside the combat screen: the TARGET card, the
  // Sigil and Heart pads, the turn panels' swap. Only their durations change, × the combat speed (review, 9 Nov 2026:
  // these are the pop-ups a player sees most in a fight). Reduce motion's !important fades still win.
  '.phc-cb-root .phc-a-right,.phc-cb-root .phc-a-left,.phc-cb-root .phc-a-drop,.phc-cb-root .phc-a-rise{animation-duration:calc(.3s * var(--phc-k, 1))}.phc-cb-root .phc-a-pop{animation-duration:calc(.32s * var(--phc-k, 1))}.phc-cb-root .phc-a-fade{animation-duration:calc(.22s * var(--phc-k, 1))}',
  '.phc-cb-root .phc-a-right.phc-closing,.phc-cb-root .phc-a-left.phc-closing,.phc-cb-root .phc-a-drop.phc-closing,.phc-cb-root .phc-a-rise.phc-closing,.phc-cb-root .phc-a-pop.phc-closing,.phc-cb-root .phc-a-fade.phc-closing{animation-duration:calc(.2s * var(--phc-k, 1))}',
  '.phc-hp-fill{transition:width calc(.16s * var(--phc-k, 1)) ease-out}.phc-hp-chip{transition:width calc(.55s * var(--phc-k, 1)) cubic-bezier(.4,0,.2,1) calc(.4s * var(--phc-k, 1))}',
  '@keyframes phcPipDrain{0%{background:#FFFFFF;transform:scaleY(1.7);box-shadow:0 0 12px rgba(255,255,255,.9)}35%{background:#FFFFFF;transform:scaleY(1.2)}100%{transform:none;box-shadow:none}}.phc-pips>span.phc-pip-drain{animation:phcPipDrain calc(.55s * var(--phc-k, 1)) cubic-bezier(.2,.8,.2,1) both;animation-delay:0s}',
  '@keyframes phcPipCost{0%,100%{opacity:.3}50%{opacity:.75}}.phc-pip-cost{animation:phcPipCost calc(1.1s * var(--phc-k, 1)) ease-in-out infinite}@media (prefers-reduced-motion: reduce){.phc-pip-cost{animation:none}}',
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
  // A tall footer (a target behind cover under two rows of tabs) used to push Confirm off the column's end and squeeze
  // the action list to nothing. Beside the map (1000 px and wider) the list keeps a usable height, the dock scrolls
  // inside itself when it must, and Confirm and End turn stay at its foot.
  '@media (min-width:1000px){.phc-cb-aside .phc-cb-dock{overflow-y:auto;scrollbar-width:thin;scrollbar-color:#2E3A50 transparent}.phc-cb-aside .phc-cb-tabpanel{min-height:84px}.phc-cb-aside .phc-cb-confirm{position:sticky;bottom:0;z-index:4;background:#0A0D13;padding-top:6px;margin-top:-6px}}',
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
  '.phc-cb-dock{position:fixed;left:0;right:0;bottom:0;z-index:30;max-height:64vh;max-height:64dvh;overflow-y:auto;overscroll-behavior:contain;padding:8px 12px calc(8px + env(safe-area-inset-bottom));background:#0A0D13;border-top:1px solid #232D3F;box-shadow:0 -10px 30px rgba(0,0,0,.55)}.phc-cb-dock .phc-cb-tabpanel{max-height:26vh;min-height:64px!important}.phc-cb-confirm{position:sticky;bottom:0;z-index:1;background:#0A0D13;box-shadow:0 -8px 12px #0A0D13}.phc-cb-turn.phc-a-right{animation:phcFadeIn calc(.22s * var(--phc-k, 1)) ease-out both!important}.phc-cb-turn.phc-a-left{animation:phcFadeOut calc(.2s * var(--phc-k, 1)) ease-in both!important}.phc-cb-spacer{display:block!important;height:calc(26vh + 290px)}}',
  '@media (prefers-reduced-motion: reduce){.phc-yt,.phc-plan,.phc-pips>span.phc-pip-drain,.phc-cur-ring,.phc-tgt-ring,.phc-wait-dots>span{animation:none}.phc-yt::after{display:none}.phc-hp-chip,.phc-hp-fill,.phc-cb-act{transition:none}}',
].join('');
ensureMotionCss();
ensureStyle('phc-combat-motion', COMBAT_CSS);
ensureStyle('phc-combat-layout', LAYOUT_CSS);
ensureStyle('phc-resources', RES_CSS);
ensureStyle('phc-combat-mapzoom', ZOOM_CSS);
ensureStyle('phc-camera', CAMERA_CSS);
mountActionTips();
/** The fight's camera (roadmap 2c; game/cameraView.ts): the map's window keeps the usual tile size and follows the play.
 *  Local to this browser: every player in a room has their own. */
const CAM = new CameraView('fight');
/** Room kept free beside the map for the small map, so the tiles in that corner can be scrolled out from under it. */
/** Two-key codes: how long after the first number the second still counts (provisional; balance pass section 15). */
const CHORD_MS = 1000;
/** The map's own layers (inside .phc-grid, which is isolated: none of them reaches out of the map). A tile's overlays use
 *  1 to 5, its chips and hover card 30 (main.tsx: a hovered tile is raised to 20 over its neighbours); the row and
 *  column labels sit over all of them, the corner over both label strips. */
const GRID_LAYER = { axis: 40, corner: 41 };
const MINI_SLACK = 172;

/** The mounted combat screen's logic (one at a time), for the window events below. */
let LIVE = null;
const onScreen = () => typeof document !== 'undefined' && !!document.querySelector('.phc-grid');
/** A narrow window scrolls the whole page: bring the map's window back into it (the jump-back key and button). */
function pageToMap() {
  const box = typeof document !== 'undefined' ? document.querySelector('.phc-grid-scroll') : null; if (!box || !box.scrollIntoView) return;
  const r = box.getBoundingClientRect();
  if (r.top < 0 || r.bottom > (window.innerHeight || 0)) box.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
}
/** A turn starts on a tile: the camera goes to it (your own turn: centred on your unit, with a short zoom on it, then
 *  settle). Driven by the turn intro's phc:focus-tile, which follows the shared turn order, so every screen does the
 *  same; the effects queue moves the camera for everything else (game/fx/play.ts runQueue). */
export function focusTile(key, mine) {
  if (typeof document === 'undefined' || !key) return;
  const grid = document.querySelector('.phc-grid');
  const tile = grid && grid.querySelector('button.phc-tok[aria-label^="' + refOf(key) + ' ·"]');
  if (!grid || !tile) return;
  const rm = reducedMotion();
  CAM.follow([key], mine ? 'turn-mine' : 'turn');
  // A narrow window scrolls the whole map zone: bring the map itself into the window.
  // (With a camera the tile is brought into the map's window by the camera; the page only has to show that window.)
  const tr = tile.getBoundingClientRect(), box = CAM.scrolls() ? document.querySelector('.phc-grid-scroll') : tile, br = box ? box.getBoundingClientRect() : tr;
  if (box && (br.top < 0 || br.bottom > (window.innerHeight || 0)) && box.scrollIntoView) box.scrollIntoView({ block: box === tile ? 'center' : 'nearest', inline: 'nearest', behavior: rm ? 'auto' : 'smooth' });
  if (!mine || rm || document.hidden || !grid.animate || CAM.overview) return;
  const gr = grid.getBoundingClientRect(), o = Math.round(tr.left + tr.width / 2 - gr.left) + 'px ' + Math.round(tr.top + tr.height / 2 - gr.top) + 'px';
  grid.animate([{ transform: 'scale(1)', transformOrigin: o }, { transform: 'scale(1.09)', transformOrigin: o, offset: 0.35 }, { transform: 'scale(1)', transformOrigin: o }], { duration: 900, easing: 'cubic-bezier(.2,.8,.2,1)' });
}
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  // A command picked on the your-turn card (game/turnIntro.tsx): select that action here.
  window.addEventListener('phc:combat-action', (e) => { const d = (e && e.detail) || {}; if (LIVE && d.action && onScreen()) LIVE.pickAction(d.action, d.unit); });
  // Every turn: bring the acting unit's tile into view (and zoom on it when it is yours).
  window.addEventListener('phc:focus-tile', (e) => { const d = (e && e.detail) || {}; if (onScreen()) focusTile(d.key, !!d.mine); });
  // Keys 1–9 flip the action tabs on your turn (the row wraps onto a second line when the tabs don't fit); a resize refits the grid beside the pinned action column.
  window.addEventListener('keydown', (e) => { if (LIVE && onScreen()) { LIVE.packKey(e); LIVE.panelKey(e); LIVE.numKey(e); LIVE.zoomKey(e); LIVE.camKey(e); } });
  // Ctrl or ⌘ with the wheel over the map sizes the map (not the page). Non-passive, so the page zoom is held back there.
  window.addEventListener('wheel', (e) => { if (!LIVE || !onScreen() || !(e.ctrlKey || e.metaKey) || !e.target || typeof e.target.closest !== 'function' || !e.target.closest('.phc-grid-scroll, .phc-mapzoom')) return;
    e.preventDefault(); const now = Date.now(); if (now - (LIVE._wheelAt || 0) < 90) return; LIVE._wheelAt = now; LIVE.zoomBy(e.deltaY < 0 ? 'in' : 'out'); }, { passive: false });
  // The turn card's commands were customised (game/commandsDialog.tsx): the mini-bar's quick commands follow.
  window.addEventListener(EV_CMDS_CHANGED, () => { if (LIVE && onScreen()) LIVE.setState({}); });
  // The enemies' turns started playing: grey the action panel out now (Leon: no acting until it's really your turn).
  window.addEventListener('phc-fx-hold', () => { if (LIVE && onScreen()) LIVE.setState({}); });
  // Crossing the narrow (1000 px wide) or very short (620 px high) line changes where panels go: render again then.
  let sizeClass = '';
  window.addEventListener('resize', () => { if (!LIVE || !onScreen()) return; const c = (window.innerWidth < 1000 ? 'n' : 'w') + (window.innerHeight <= 620 ? 's' : 't'); if (c !== sizeClass) { sizeClass = c; LIVE.setState({}); } LIVE.fitGrid(); });
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
/** The Perks tab's shelves (rules 1.14, the perk card in a fight; game/perkShelves.ts). USE NOW is the tab's buttons,
 *  so here it is only its heading; RIDES AN ACTION and ALWAYS ON are lists of rows to read: a name and one line (where
 *  the switch is, or the live state), opening to the whole card when picked. Never a Confirm. items: the tab's own
 *  rows (they carry the pick handler and the lock); sel: the row picked now. Empty shelves are left out.
 *  Colour is meaning (docs/design/colour-system.md), always with the word: Ready green, Used muted, the rest text. */
const SHELF_HEAD = 'font-size: 10px; font-weight: 700; letter-spacing: 0.16em; color: #A3AEC2';
const STATE_INK = { ready: '#6FEA77', used: '#A3AEC2', last: '#FFFFFF', waiting: '#C9D3E3', active: '#C9D3E3' };
export function perkShelfVals(sh, items, sel) {
  const byKey = {}; for (const a of items) byKey[a.key] = a;
  const rowOf = (r) => { const a = byKey[PKI + r.key]; if (!a) return null; const on = sel === a.key;
    return { key: a.key, name: r.name, line: r.line, text: r.detail, state: r.state || 'rides', open: on ? 'true' : 'false', isOpen: on, locked: a.locked, pick: a.pick, title: r.name + ': ' + r.line + (/[.!?…]$/.test(r.line) ? ' ' : '. ') + 'Pick it to read its card.',
      style: 'display: flex; flex-direction: column; gap: 3px; padding: 5px 8px 5px 10px; border-left: 2px solid ' + (on ? '#FFFFFF' : '#232D3F') + '; border-radius: 0 6px 6px 0; background: ' + (on ? '#10151F' : 'transparent'),
      btnStyle: 'display: flex; flex-direction: column; align-items: flex-start; gap: 1px; width: 100%; min-height: 32px; padding: 0; border: 0; background: transparent; color: #E7EBF3; font-family: inherit; font-size: 13px; text-align: left; cursor: pointer',
      lineStyle: 'font-size: 11.5px; line-height: 1.3; font-weight: ' + (r.state === 'ready' || r.state === 'last' ? '700' : '500') + '; color: ' + (STATE_INK[r.state] || '#C9D3E3'),
      textStyle: 'font-size: 12px; line-height: 1.4; color: #C9D3E3' }; };
  const shelves = ['rides', 'always'].map((id) => ({ key: id, label: SHELF_LABEL[id], help: SHELF_HELP[id], headId: 'phc-shelf-' + id, headStyle: SHELF_HEAD, rows: sh[id].map(rowOf).filter(Boolean) })).filter((x) => x.rows.length > 0);
  const hasUse = items.some((a) => !isPerkInfo(a.key));
  return { hasUse, useLabel: SHELF_LABEL.use, useHelp: SHELF_HELP.use, useStyle: SHELF_HEAD, shelves };
}
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

/** Witnessed lasts until the fight ends or the patron intervenes (rules 1.6.3), not for a count of rounds: its chip's
 *  title says so ("Witnessed: until the fight ends or <patron> acts"), as the FAITH tab's header does. */
const patronNameOf = (u, g) => { const c = g && u.charId ? g.characters[u.charId] : null, p = c && c.patron ? FAITH_PATRON[c.patron] : null; return p ? String(p.name) : ''; };
export const witnessedWords = (u, g) => 'UNTIL THE FIGHT ENDS OR ' + (patronNameOf(u, g).toUpperCase() || 'THE PATRON') + ' ACTS';
/** The chip's title: "Witnessed: until the fight ends or Old Overcast acts." */
const witnessedTitle = (u, g) => 'Witnessed: until the fight ends or ' + (patronNameOf(u, g) || 'the patron') + ' acts.';
const COND_CHIP = 'padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; ';
/** Witnessed is your patron watching (a boon), not a harm: the faith light and the eye, a short label (the how-long is in
 *  its title and the FAITH tab's header), and gone once the fight is over (it never outlives the fight). */
const WITNESSED_CHIP = COND_CHIP + 'white-space: nowrap; border: 1px solid var(--faith-light, ' + FAITH_GOLD + '); color: var(--faith-light, ' + FAITH_GOLD + ')';
/** Your own panel's condition chips: Witnessed is its resource row there (one fact, one place; Leon, live 0.24.0). */
const ownConds = (u, g) => condChips(u, g).filter((c) => c.key !== 'c-witnessed');
export const condChips = (u, g) => [...Object.entries(u.conds || {}).filter(([id, n]) => n > 0 && !(id === 'witnessed' && g && g.combat && g.combat.over)).map(([id, n]) => id === 'witnessed'
  ? { key: 'c-' + id, k: '◉ WITNESSED', t: witnessedTitle(u, g), style: WITNESSED_CHIP }
  : { key: 'c-' + id, k: condName(id).replace(/ \(.*\)$/, '').toUpperCase() + ' · ' + n, t: condName(id) + ': ' + (condText(id) ? condText(id).replace(/\.?$/, '. ') : '') + n + (n === 1 ? ' round' : ' rounds') + ' left.',
    style: COND_CHIP + 'border: 1px solid ' + (BOONS.includes(id) ? '#6FEA77; color: #6FEA77' : '#F65157; color: #F65157') }),
  ...(u.shield > 0 ? [{ key: 'shield', k: '+' + u.shield + ' SHIELD', t: 'A shield of ' + u.shield + ': damage takes it first.', style: 'padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; border: 1px solid #E7EBF3; color: #E7EBF3' }] : [])];

/** Rules 1.14: the wait for the Narrator's answer to an attempt, as the fight screen shows it. Everyone sees who spoke
 *  and the words; the host can end the wait (everything spent comes back); a human Narrator (the host, in "I'll narrate")
 *  gets the four answers: a check with a skill and a TN, a condition on an enemy, a surrender, and yes or no on a perk,
 *  each with a line of their own. The game checks every answer again before anything happens. */
function fightTalkVals(self, g, cb, fr, who, hostMe, act) {
  const name = who ? who.name : 'Someone', st = self.state.fr && self.state.fr.id === fr.id ? self.state.fr : { id: fr.id };
  const set = (p) => self.setState({ fr: { ...st, ...p } });
  const human = g.settings.mode === 'human';
  const out = { show: true, id: fr.id, head: human && hostMe ? 'Your answer, Narrator' : 'The Narrator is deciding…',
    words: name + (fr.perk ? ' · ' + fr.perk.name : ' attempts') + (fr.text ? ': “' + fr.text + '”' : ' (their words are hidden).'),
    canSkip: hostMe, skip: () => act({ type: 'narrator/fight-skip', id: fr.id, note: 'The host ended the wait.' }),
    skipTitle: 'End the wait with no answer. ' + name + ' gets back what this cost' + (fr.perk ? ' (the AP and the use)' : ' (' + fr.ap + ' AP)') + ' and may try again.', gm: { show: false } };
  if (!human || !hostMe) return out;
  const foes = cb.units.filter((x) => who && x.side !== who.side && !x.dead && !x.surrendered);
  const tgt = foes.find((x) => x.id === st.target) || foes[0] || null, skill = st.skill || 'charisma', tn = Number(st.tn || 12), cond = st.cond || 'shaken', win = st.win || 'none', line = st.line || '';
  const never = tgt && (tgt.tier === 'boss' || ['machine', 'robot', 'turret', 'drone'].includes(tgt.kind || '') || (tgt.tags || []).includes('no_surrender'));
  const beaten = !!tgt && tgt.hp <= tgt.maxHp / 2;
  const send = (effect) => { act({ type: 'narrator/fight-ruling', id: fr.id, lines: line.trim() ? [line.trim()] : [], ...(effect ? { effect } : {}) }); self.setState({ fr: null }); };
  const earned = () => (win === 'condition' && tgt ? { onSuccess: { condition: { target: tgt.id, id: cond } } } : win === 'surrender' && tgt ? { onSuccess: { surrender: { target: tgt.id } } } : {});
  const TN_NAME = { 8: 'Easy', 12: 'Standard', 16: 'Hard', 20: 'Heroic' };
  out.gm = { show: true, hint: 'The fight waits for you. Write a line if you like, then pick one answer. A check comes first when the outcome is in doubt.' + (fr.perk && fr.perk.ask ? ' Your part: ' + fr.perk.ask : ''),
    line, onLine: (e) => set({ line: e.target.value }),
    btn: 'flex: none; min-height: 32px; padding: 0 12px; border-radius: 8px; border: 1px solid #E7EBF3; background: transparent; color: #E7EBF3; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer',
    sel: 'min-height: 32px; max-width: 100%; padding: 0 6px; border-radius: 8px; border: 1px solid #2E3A50; background: #0A0D13; color: #E7EBF3; font-family: inherit; font-size: 12px; letter-spacing: 0',
    sayOnly: () => send(null), sayOff: !line.trim(),
    skills: Object.values(SKILLS_BY_ID).map((k) => ({ value: k.id, label: k.name })).sort((a, b) => a.label.localeCompare(b.label)), skill, onSkill: (e) => set({ skill: e.target.value }),
    tns: TN_LADDER.map((n) => ({ value: String(n), label: 'TN ' + n + ' · ' + (TN_NAME[n] || '') })), tn: String(tn), onTn: (e) => set({ tn: Number(e.target.value) }),
    wins: [{ value: 'none', label: 'A success earns: your words' }, ...(tgt ? [{ value: 'condition', label: 'A success earns: the condition below' }, ...(never ? [] : [{ value: 'surrender', label: 'A success earns: a surrender' }])] : [])], win, onWin: (e) => set({ win: e.target.value }),
    check: () => send({ check: { skill, tn, ...earned() } }),
    hasTargets: foes.length > 0, targets: foes.map((x) => ({ value: x.id, label: x.name + (x.hp <= x.maxHp / 2 ? ' (half HP or less)' : '') })), target: tgt ? tgt.id : '', onTarget: (e) => set({ target: e.target.value }),
    conds: FIGHT_CONDS.map((c) => ({ value: c, label: FIGHT_COND_NAME[c] + (c === 'hesitates' ? ' (−1 AP next turn)' : c === 'taunted' ? ' (by ' + name + ')' : '') })), cond, onCond: (e) => set({ cond: e.target.value }),
    condition: () => { if (tgt) send({ condition: { target: tgt.id, id: cond } }); },
    surrender: () => { if (tgt) send({ surrender: { target: tgt.id } }); }, surrenderOff: !tgt || never || !beaten,
    surrenderTitle: !tgt ? 'No enemy is left.' : never ? tgt.name + ' never surrenders.' : !beaten ? tgt.name + ' is above half HP: it gives up only after a successful check (set what a success earns).' : tgt.name + ' stops fighting. No roll.',
    hasPerk: !!fr.perk, perkName: fr.perk ? fr.perk.name : '', yes: () => send({ perk: { accepted: true } }), no: () => send({ perk: { accepted: false } }) };
  return out;
}

export class CombatLogic extends DCLogic {
  constructor(props) { super(props); this.state = { action: 'move', hover: null, target: null }; LIVE = this; }

  /** Keep something on screen a moment after it goes, so it can play its out animation. Returns what to show:
   *  { show, cls: '' or ' phc-closing', val } (val: the last value while it leaves). Never blocks input: the leaving copy
   *  takes no clicks (.phc-closing), and a timer, not an animation event, removes it. */
  pres(name, val, ms = 210) {
    const P = this._pres || (this._pres = {}), cur = P[name];
    if (val) { if (cur && cur.timer) clearTimeout(cur.timer); P[name] = { val }; return { show: true, cls: '', val }; }
    if (!cur) return { show: false, cls: '', val: null };
    if (!cur.timer) cur.timer = setTimeout(() => { if (P[name] === cur) { delete P[name]; this.setState({}); } }, reducedMotion() ? 150 : ms * fightPace()); // the out animation runs × the combat speed
    return { show: true, cls: ' phc-closing', val: cur.val };
  }

  /** The turn panel (your actions, or the waiting card): a new one slides in while the last one slides out over it. */
  panels(key, vals) {
    const P = this._panels || (this._panels = { cur: null, old: [] });
    if (P.cur && P.cur.key !== key) {
      const gone = P.cur; P.old = [gone, ...P.old.filter((o) => o.key !== gone.key)].slice(0, 2);
      setTimeout(() => { if (P.old.includes(gone)) { P.old = P.old.filter((o) => o !== gone); this.setState({}); } }, reducedMotion() ? 150 : 230 * fightPace());
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
    const w = WEAPON[cur.weapon], act1 = id === 'shot' && w && isMelee(w) ? 'melee' : id, act2 = mapLegacy(cur, act1) || act1;
    if (this._ids && !this._ids.has(act2)) return;
    const t = cb.units.find((x) => x.id === this.state.target);
    this.setState({ action: act2, target: act2 === 'stim' || (t && t.side === 'pc') ? null : this.state.target, aim: null, evc: null, readTile: null, sgToast: '', ...this.tabFor(act2) }); // the Line picked stays picked this turn (step, then Evoke)
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
    const j = tabNavIndex(e, n, i); // the row wraps onto two lines: Left and Right in reading order, Up and Down between the lines
    if (j < 0) return;
    e.preventDefault(); this.setTab(ids[j], true); sfx('tab');
  }
  /** Number keys 1–9 (and 0 inside a code) anywhere on the combat screen, on your turn (1–4 pick the quick commands while the panel is hidden). */
  numKey(e) {
    if (!e || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.repeat || !/^[0-9]$/.test(e.key) || !this._mine) return;
    if (typingIn(e.target) || typingIn(document.activeElement) || document.querySelector('[data-phc-cutin], [aria-modal="true"]')) return;
    if (e.key === '0') { // only inside a code: the next nine rows of the tab named (201 the tenth row of tab 2)
      const ch = this._chord; if (!ch || PANEL_HIDDEN || Date.now() - ch.at > CHORD_MS) return;
      e.preventDefault(); this._chord = { ...ch, page: (ch.page || 0) + 1, at: Date.now() }; return;
    }
    if (PANEL_HIDDEN) {
      const c = (this._quick || [])[Number(e.key) - 1];
      if (c && !c.off) { e.preventDefault(); this.pickAction(c.action); sfx('tab'); }
      return;
    }
    // Two-key codes (Leon, 11 Nov 2026): the first number is the tab, the second the action in it, in the order shown:
    // 11 the first tab's first action, 42 the fourth tab's second; past the ninth, a 0 between them per nine (201). The tab doesn't have to be open. A second number that
    // names no action there is read as a tab, as a lone number always is.
    const now = Date.now(), chord = this._chord; this._chord = null;
    if (chord && now - chord.at <= CHORD_MS) {
      const k2 = ((this._tabItems || [])[chord.tab] || [])[(chord.page || 0) * 9 + Number(e.key) - 1];
      if (k2) { e.preventDefault(); this.pickAction(k2); sfx('tab'); return; }
      if (chord.page) { e.preventDefault(); return; } // a paged code that names no row: nothing (not a tab)
    }
    // Inside the Attack tab (a pad open, or the keyboard in the tab's panel): 1 the first weapon's plain attack, 2 its
    // Techniques, 3 and 4 the second weapon's, 5 Hold a shot. Elsewhere the numbers switch tabs, as before.
    if (this.state.tab === 'attack' && this._attackKeys) {
      const ae = document.activeElement, inPanel = !!ae && typeof ae.closest === 'function' && !!ae.closest('.phc-cb-tabpanel');
      if (padOf(this.state.action) || inPanel) {
        const k = this._attackKeys[Number(e.key) - 1];
        if (k) { e.preventDefault(); this.setState({ action: k, tile: null }); this.revealAction(); sfx('tab'); return; }
      }
    }
    const id = (this._tabs || [])[Number(e.key) - 1];
    if (!id) return;
    this._chord = { tab: Number(e.key) - 1, at: now };
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
  /** The backpack (rules 1.9, Gear in a fight): B opens and closes it, Escape closes it. */
  packKey(e) {
    if (!e || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.repeat) return;
    // Another dialog over the fight (Settings, an in-game question): its keys are its own (the backpack is a dialog too).
    if (document.querySelector('[aria-modal="true"]:not([data-bp-panel])')) return;
    if (e.key === 'Escape' && this.state.bp) { e.preventDefault(); this.setState({ bp: false }); return; }
    if (!(e.key === 'b' || e.key === 'B') || typingIn(e.target) || typingIn(document.activeElement) || document.querySelector('[data-phc-cutin]')) return;
    if (!getState().game?.combat) return;
    e.preventDefault(); this.setState({ bp: !this.state.bp });
  }
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
      // A HEART action (Pump, Steady, Let go, Feed, Overwatch, Release while holding): the HEART panel's top instead.
      if ((HEART_ACTS.includes(this.state.action) || this.state.action === 'release') && this.heartScroll()) return;
      const b = document.querySelector('.phc-cb-tabpanel [data-act="' + this.state.action + '"]'), panel = b && b.closest('.phc-cb-tabpanel');
      if (!panel) return;
      const box = b.parentElement, top = box.offsetTop, bottom = top + box.offsetHeight, v0 = panel.scrollTop, v1 = v0 + panel.clientHeight;
      const to = top < v0 ? top - 4 : bottom > v1 ? Math.min(top - 4, bottom - panel.clientHeight + 4) : null;
      if (to != null && panel.scrollTo) panel.scrollTo({ top: Math.max(0, to), behavior: reducedMotion() ? 'auto' : 'smooth' });
    }));
  }
  /** The HEART panel's top (its stage bar and multiplier counter) into view in its tab: the panel is taller than the tab
   * area on most screens, and a move made from its lower part (a feeling poured, Revert) would leave what changed
   * scrolled away under the AP bar and the tabs. */
  revealHeart() {
    if (typeof requestAnimationFrame === 'undefined' || typeof document === 'undefined') return;
    requestAnimationFrame(() => requestAnimationFrame(() => this.heartScroll()));
  }
  /** revealHeart's scroll, now; false when no HEART panel shows. */
  heartScroll() {
    const hp = document.querySelector('.phc-cb-tabpanel .phc-heart-panel'), panel = hp && hp.closest('.phc-cb-tabpanel');
    if (!panel) return false;
    // Measured from where it sits in the content (under the tab's name), not its own box: it is sticky.
    const prev = hp.previousElementSibling, at = prev ? prev.getBoundingClientRect().bottom : hp.parentElement.getBoundingClientRect().top;
    const to = Math.max(0, Math.round(at - panel.getBoundingClientRect().top + panel.scrollTop));
    if (to < panel.scrollTop - 1 && panel.scrollTo) panel.scrollTo({ top: to, behavior: reducedMotion() ? 'auto' : 'smooth' });
    return true;
  }
  /** The map's size: a step in or out (your own size from then on), back to the usual size, or 100%. Any of them
   *  leaves the overview. */
  zoomBy(what) {
    const back = !!this._overview; this._overview = false; CAM.overview = false;
    ZOOM = normaliseZoom(zoomAction(ZOOM, this._zoom || 1, what)); saveZoom(ZOOM);
    this._fitKey = null; this.fitGrid(); this.setState({});
    if (back) this.camAfter(() => CAM.follow([CAM.home].filter(Boolean), 'ask', true));
  }
  /** − and + (= too) size the map; not while typing, not under a dialog or the turn card. */
  zoomKey(e) {
    if (!e || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.repeat || !['-', '+', '='].includes(e.key)) return;
    if (typingIn(e.target) || typingIn(document.activeElement) || document.querySelector('[data-phc-cutin], [aria-modal="true"]')) return;
    if (!getState().game?.combat) return;
    e.preventDefault(); this.zoomBy(e.key === '-' ? 'out' : 'in');
  }
  /** Run f once the page has laid the map out again (two frames: the render, then the measure). */
  camAfter(f) { if (typeof requestAnimationFrame === 'undefined') return; requestAnimationFrame(() => requestAnimationFrame(() => { if (LIVE === this) { this.camSync(); f(); } })); }
  /** The overview: the whole map fitted to the window, and back to the camera (centred on a tile when one is given,
   *  else on your unit). Nothing to switch when the whole map already fits at the usual size. */
  toggleOverview(key) {
    if (!this._overview && !this._camNeeded) return false;
    this._overview = !this._overview; CAM.overview = this._overview;
    this._fitKey = null; this.fitGrid(); this.setState({});
    if (!this._overview) this.camAfter(() => CAM.follow([key || CAM.home].filter(Boolean), 'ask', true));
    return true;
  }
  /** The camera's keys: M the whole map and back, Home back to your unit, the arrows and WASD move the view. Not
   *  while typing, not under a dialog, the backpack or the turn card, and not on a control that uses the arrows itself. */
  camKey(e) {
    if (!e || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target;
    if (typingIn(t) || typingIn(document.activeElement) || this.state.bp || document.querySelector('[data-phc-cutin], [aria-modal="true"]')) return;
    if (!getState().game?.combat) return;
    if (e.key === 'm' || e.key === 'M') { if (!e.repeat && this.toggleOverview()) e.preventDefault(); return; }
    if (e.key === 'Home') { if (e.repeat) return; e.preventDefault(); if (this._overview) this.toggleOverview(); else CAM.goHome(); pageToMap(); return; }
    const d = panKey(e.key); if (!d) return;
    if (t && typeof t.closest === 'function' && t.closest('[role="tablist"], [role="slider"], [role="separator"], [role="radiogroup"], [role="listbox"], [role="menu"], .phc-grip, select')) return;
    if (CAM.pan(d)) e.preventDefault();
  }
  /** After a render: the camera binds to the map's window, gets the small map's picture, and on a new fight starts on
   *  your unit. */
  camSync() {
    if (typeof document === 'undefined') return;
    const g = getState().game, cb = g && g.combat, sc = document.querySelector('.phc-grid-scroll'), ov = document.querySelector('.phc-cam-over[data-phc-cam="fight"]');
    if (!cb || !sc) return;
    const key = (g.code || '') + '|' + cb.name + '|' + (cb.log[0] || '');
    if (!CAM.live()) this._camFight = null; // the map's window is new (the screen was left and came back): start on your unit again
    const fresh = this._camFight !== key;
    CAM.onMini = () => { if (LIVE === this) { this._fitKey = null; this.setState({}); } };
    CAM.attach(sc, ov, cb.map.w, cb.map.h); CAM.setMini(this._mini || null);
    // (Only once the map has its size and scrolls: on the way back from the level-up screen the first look comes before
    // the layout, and the camera was left in the map's top-left corner with the player's unit out of view.)
    if (fresh && CAM.grid() && (CAM.scrolls() || CAM.fits)) { this._camFight = key; if (CAM.home) CAM.follow([CAM.home], 'ask', true); }
    const mini = CAM.miniShown(); if (mini !== !!this._miniOn) { this._miniOn = mini; this.setState({}); }
  }
  /** The map toolbar's bindings. */
  zoomVals() {
    const z = this._zoom || 1, over = !!this._overview, auto = ZOOM.mode === 'auto' && !over, can = !!this._camNeeded || over;
    return { label: zoomLabel(z), auto: auto ? 'true' : 'false', manual: auto || over ? 'false' : 'true',
      out: () => this.zoomBy('out'), in: () => this.zoomBy('in'), toAuto: () => this.zoomBy('auto'), reset: () => this.zoomBy('reset'),
      cantOut: !auto && !over && ZOOM.scale <= ZOOM_MIN, cantIn: !auto && !over && ZOOM.scale >= ZOOM_MAX,
      pctTitle: auto ? 'The usual size (' + zoomLabel(z) + '). Click for 100%.' : 'Click for 100%', autoTitle: 'The usual size: the tiles stay as big as they always were, and the view follows the fight',
      whole: over ? 'true' : 'false', toggleWhole: () => { this.toggleOverview(); }, cantWhole: !can,
      wholeTitle: over ? 'Back to the fight (M). Or click a tile to go there.' : can ? 'See the whole map (M)' : 'The whole map is already on screen',
      home: () => { if (this._overview) this.toggleOverview(); else CAM.goHome(); pageToMap(); }, homeTitle: 'Back to your unit (Home)',
      hint: over ? 'Whole map: click a tile to go there.' : can ? 'Drag the map, or use the arrow keys.' : '', hasHint: over || can };
  }
  /** A new layout (a panel dropped, the splitter let go, Reset): saved for this browser, then the grid refits. */
  setLayout(l) {
    LAYOUT = normalise(l); saveLayout(LAYOUT); this._liveW = null; this._fitKey = null;
    this.setState({});
    if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(() => this.fitGrid());
  }
  /** The bindings the layout's grips, splitter and Reset use (templates/combat.template.html). */
  layoutVals(hidden) {
    // Very short windows (620 px or less): the action column has no room to spare, so any panel moved there (the mana
    // forecast, the legend, the log) shows in the map zone instead, under the map; the stored layout is unchanged.
    const W = typeof window !== 'undefined' ? window : null, narrow = !!W && W.innerWidth < 1000, short = !!W && W.innerHeight <= 620;
    const pl0 = placement(LAYOUT, hidden), pl = short && !hidden ? { ...placement(LAYOUT, true), swap: pl0.swap, width: pl0.width } : pl0, o = pl.order;
    const panel = (n) => 'position: relative; order: ' + n + '; flex: none; min-width: 0';
    // In the action zone an extra gives up its height before the turn box does (a high shrink factor): down to 64 px, then
    // it scrolls inside, so the footer (Confirm, End turn) never spills under it on a short window.
    const side = '; flex: 0 100 auto; min-height: 64px; max-height: 30vh; overflow-y: auto; scrollbar-width: thin';
    const grip = (id) => (e) => startPanelDrag(e.nativeEvent || e, id, LAYOUT, (l) => this.setLayout(l));
    const gripKey = (id) => (e) => { const n = keyMovePanel(e.nativeEvent || e, id, LAYOUT); if (!n) return; e.preventDefault(); this.setLayout(n);
      if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(() => requestAnimationFrame(() => { const b = id === 'actions' ? document.querySelector('.phc-cb-bar .phc-grip') : document.querySelector('[data-phc-panel="' + id + '"] > .phc-grip'); if (b && b.focus) b.focus(); })); };
    const sec = () => (typeof document !== 'undefined' ? document.querySelector('.phc-cb-left') : null);
    const rowW = () => { const r = sec() && sec().parentElement; if (!r) return 1200; const cs = getComputedStyle(r); return r.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0); };
    const live = (w) => { this._liveW = w; const el = sec(); if (el) el.style.flex = '0 1 ' + w + 'px'; this.fitGrid(); };
    return {
      swap: pl.swap, custom: !isDefault(LAYOUT), reset: () => this.setLayout(DEFAULT_LAYOUT),
      sideExtras: !hidden && (pl.manaIn === 'sideZone' || pl.legendIn === 'sideZone' || pl.logIn === 'sideZone'),
      // The forecast's details drop down over the map only where that works: above the map, on a wide, tall-enough window.
      manaDrop: pl.manaIn === 'mapZone' && o.mana < o.map && !narrow && !short,
      // In the action zone the legend and the log take what room they need up to a cap, then scroll, so the actions keep theirs.
      mapStyle: panel(o.map), legendStyle: panel(o.legend) + (pl.legendIn === 'sideZone' ? side : ''), logStyle: panel(o.log) + (pl.logIn === 'sideZone' ? side : ''),
      manaStyle: panel(o.mana) + (pl.manaIn === 'sideZone' ? side : ''), manaMap: pl.manaIn === 'mapZone', manaSide: pl.manaIn === 'sideZone',
      legendMap: pl.legendIn === 'mapZone', legendSide: pl.legendIn === 'sideZone', logMap: pl.logIn === 'mapZone', logSide: pl.logIn === 'sideZone',
      grip: { map: grip('map'), mana: grip('mana'), legend: grip('legend'), log: grip('log'), actions: grip('actions') },
      gripKey: { map: gripKey('map'), mana: gripKey('mana'), legend: gripKey('legend'), log: gripKey('log'), actions: gripKey('actions') },
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
    // The panels in the map zone (the mana forecast wraps or opens, the legend grows) change the room too: watch them.
    if (this._ro) for (const pnl of sec.querySelectorAll(':scope > [data-phc-panel]')) if (!(this._roSeen ||= new WeakSet()).has(pnl)) { this._roSeen.add(pnl); this._ro.observe(pnl); }
    const natW = 48 * cb.map.w + 36, natH = 48 * cb.map.h + 36, narrow = window.innerWidth < 1000;
    const rs = getComputedStyle(row), rowW = row.clientWidth - (parseFloat(rs.paddingLeft) || 0) - (parseFloat(rs.paddingRight) || 0);
    const sized = !narrow && !PANEL_HIDDEN && (LAYOUT.width || this._liveW);
    // The map's size toolbar sits above the grid: Auto leaves it its room.
    const tb = sec.querySelector('.phc-mapzoom'), toolH = tb ? tb.offsetHeight + 6 : 0;
    // Panels set above the map in its zone (the mana forecast by default; the legend or log if moved there) take their room too.
    const mapP = sec.querySelector(':scope > [data-phc-panel="map"]'), mapOrd = mapP ? Number(getComputedStyle(mapP).order) || 0 : 0, gap = parseFloat(getComputedStyle(sec).rowGap) || 0;
    const panelsAboveH = [...sec.querySelectorAll(':scope > [data-phc-panel]')].filter((p) => p !== mapP && (Number(getComputedStyle(p).order) || 0) < mapOrd).reduce((t, p) => t + p.offsetHeight + gap, 0);
    const availW = narrow ? rowW : sized ? sec.clientWidth - 34 : rowW - (PANEL_HIDDEN ? 44 : ASIDE_MIN + 34), availH = (narrow ? window.innerHeight * 0.55 : sec.clientHeight - 18) - toolH - panelsAboveH;
    // The room for the map's window. Panel hidden: the window stays clear of the turn mini-bar in the bottom-right corner,
    // either beside it or above it (whichever leaves the bigger tiles, then the bigger window), so no tile hides under it.
    let aW = Math.max(120, availW), aH = Math.max(120, availH);
    const w = cb.map.w, h = cb.map.h;
    if (PANEL_HIDDEN && !narrow) {
      const r = sec.getBoundingClientRect(), miniRight = getState().game?.sandbox ? 64 : 20;
      const besideW = Math.min(aW, window.innerWidth - miniRight - Math.min(380, window.innerWidth - 32) - 16 - (r.left + 2));
      const aboveH = Math.min(aH, window.innerHeight - 16 - MINI_H - 12 - (r.top + 16) - panelsAboveH);
      const zb = usualScale(besideW, aH, w, h), za = usualScale(aW, aboveH, w, h);
      if (zb > za || (zb === za && besideW * aH >= aW * aboveH)) aW = Math.max(120, besideW); else aH = Math.max(120, aboveH);
    }
    // The usual size (game/camera.ts): what a 16 x 11 map fitted to this room came to, so the tiles are as big as they
    // always were and a bigger map scrolls in its window (the camera). The overview fits the whole map; a size the
    // player picked is theirs.
    const usual = usualScale(aW, aH, w, h, narrow), needed = !fitsWhole(aW, aH, w, h, usual);
    if (!needed && this._overview) { this._overview = false; CAM.overview = false; }
    const z = this._overview ? overviewScale(aW, aH, w, h, narrow) : ZOOM.mode === 'manual' ? ZOOM.scale : usual;
    // The window: as wide as the map people know (16 tiles) unless the player sized the zone, hid the column or picked
    // a size; as tall as the room allows.
    const wide = sized || PANEL_HIDDEN || narrow, whole = this._overview || ZOOM.mode === 'manual';
    const vw = Math.floor(wide ? aW : Math.min(aW, Math.ceil(naturalSize(whole ? w : Math.min(w, REF_W), 1).w * z) + (needed && !this._overview ? 14 : 2))), vh = Math.floor(aH);
    // The overview keeps the map zone as wide as the usual view made it (the smaller map sits in the middle of it), so
    // the action column beside it does not jump wider and back each time the player looks at the whole map.
    const col = this._overview ? Math.floor(wide ? aW : Math.min(aW, Math.ceil(naturalSize(Math.min(w, REF_W), 1).w * usual) + 14)) : vw;
    const v0 = this._view || {};
    if (z !== (this._zoom || 1) || vw !== v0.w || vh !== v0.h || col !== v0.col || needed !== !!this._camNeeded) {
      // The map is laid out anew (the first fit of this screen, a resized window, a size the player picked): the camera
      // keeps what it was looking at. The first time that is the player's own unit (back from the level-up screen in the
      // middle of a fight, the view was left in the map's top-left corner); after that, the tile in the middle of the view.
      const first = !this._view, t = !first && CAM.live() && CAM.scrolls() ? CAM.tiles() : null, mid = t ? Math.round((t.x0 + t.x1) / 2) + ',' + Math.round((t.y0 + t.y1) / 2) : null;
      this._zoom = z; this._view = { w: vw, h: vh, col }; this._camNeeded = needed; this.setState({});
      if (!this._overview && (first || mid)) this.camAfter(() => { const k = first ? CAM.home : mid; if (k && !CAM.overview) CAM.follow([k], 'ask', true); });
    }
    CAM.fits = !this._overview && fitsWhole(aW, aH, w, h, z);
    CAM.sync();
  }

  renderVals() {
    const st = getState(), g = st.game, me = st.me.id;
    // HP follows the effects (fx/play.ts fxShownHp): a bar falls when its hit plays, not when the state arrives.
    const cb = (() => { const c0 = castFight(g, g && g.combat, ART), shown = c0 ? fxShownHp(g) : null;
      return c0 && shown && shown.size ? { ...c0, units: c0.units.map((u) => (shown.has(u.id) && !u.dead ? { ...u, hp: Math.min(u.maxHp, shown.get(u.id)) } : u)) } : c0; })();
    // A new unit's turn starts clean: a spell (or its aim) picked for the last unit never carries over to this one.
    const curId = cb && active(cb) ? active(cb).id : null;
    const newTurn = curId !== this._curId;
    if (curId !== this._curId) { if (this._curId !== undefined) Object.assign(this.state, { aim: null, glyphTile: null, evc: null, sgToast: '', obMode: 'begin', word: null, stroke: null, design: null, ...(MAGIC.includes(this.state.action) ? { action: 'move' } : {}) }); this._curId = curId; }
    const S = this.state;
    if (!cb) return { ...lightboxVals(this), ...shellVals(this, 'combat'), lay: this.layoutVals(PANEL_HIDDEN), mz: this.zoomVals(), initiative: [], tiles: [], legend: [], apPips: [], groups: [], log: [], who: {}, sel: {}, target: {}, toStory: () => go('main'), report: openReport, roundText: 'NO FIGHT', gridStyle: '', gridLeave: () => {}, confirmText: 'Confirm', pad: {}, magicLegend: [] };
    // Whose turn is on screen: while earlier turns are still playing out, the unit whose banner played last, not the
    // one the state has already moved on to (Leon, 11 Nov 2026: the hostiles seemed to attack on your turn).
    const turnWait = fxShownTurn(g);
    const cur = (turnWait && turnWait.unit && cb.units.find((u) => u.id === turnWait.unit)) || active(cb), owner = (u) => (u.charId ? g.characters[u.charId]?.owner : null), playerOf = (pid) => g.players.find((p) => p.id === pid);
    const ring = (u) => (u.side === 'pc' ? playerOf(owner(u))?.color || '#7FD4FF' : '#F65157');
    const mineTurn = !turnWait && !cb.over && cur && cur.side === 'pc' && owner(cur) === me && !cur.downed;
    // …and the screen looks again when the effects have run out (the hold event does it too; this is the safety net)
    if (turnWait && !this._turnTimer && typeof performance !== 'undefined') this._turnTimer = setTimeout(() => { this._turnTimer = null; if (LIVE === this) this.setState({}); }, Math.max(120, Math.min(4000, fxBusyUntil() - performance.now() + 60)));
    this._mine = mineTurn;
    const ch = mineTurn ? g.characters[cur.charId] : null;
    const w = cur ? WEAPON[cur.weapon] : null, melee = w ? isMelee(w) : false;
    const P = mineTurn ? paths(cb, cur.pos, cur.id) : { dist: {}, prev: {} };
    const MOVES = ['move', 'sprint', 'disengage'], isMove = MOVES.includes(S.action);
    // Where the picked move may end and what each tile costs is the engine's answer (actions.ts moveOptions: the route,
    // the items' price, one Sprint a turn, Fear, Threatened, an item's ban, Encore's lend), asked once per state and
    // action, not on every mouse move. A tile lights up only if the engine would take the move.
    const moveMods = mineTurn && isMove ? (() => { try { return modsOf(withGame(g, () => togglesFor({ u: cur, c: ch, cb, g }, 'combat/move', { action: S.action, target: null }, S.mods || []))); } catch { return []; } })() : []; // the switches set on the move (they price it)
    const moveKey = mineTurn && isMove ? [cur.id, cur.pos, cur.ap, S.action, moveMods.join(',')].join('|') : '';
    if (!moveKey) this._move = null;
    else if (!this._move || this._move.g !== g || this._move.key !== moveKey) { let mo; try { mo = moveOptions(g, cb, cur.id, S.action, { mods: moveMods }); } catch { mo = { tiles: {}, why: 'Not now.', lend: 0 }; } this._move = { g, key: moveKey, ...mo }; }
    const MO = this._move, moveCost = (k) => (MO && MO.tiles[k] ? MO.tiles[k].ap : 0);
    // Encore (items 729, 737): a move that repeats the Laughing Mask's Encore is lent the AP it cost before.
    const moveLend = MO ? MO.lend : 0;
    const reach = (k) => !!(MO && MO.tiles[k]);
    const hv = isMove && S.hover && reach(S.hover) ? S.hover : null;
    // Fog of war is the engine's (fog.ts): the view holds only what this player's side sees (the human Narrator: all of
    // it), and vis is its sight (tiles seen, tiles sensed) for shading. Nothing here filters units by sight.
    const vis = fightSight(cb);
    const route = {}; let moveAp = 0;
    // Rules 1.9 (item 683): the route a click takes goes around revealed hazards when it can (the engine's movePaths), and
    // the preview marks every revealed hazard tile it still crosses ("Path crosses: …").
    const arrowsOf = (rr, from) => { rr.forEach((k, i) => { const p = i ? rr[i - 1] : from, [ax, ay] = p.split(',').map(Number), [bx, by] = k.split(',').map(Number); route[p] = ARROWS[(bx - ax) + ',' + (by - ay)]; }); };
    const hvRoute = hv && mineTurn ? routeHazards(cb, cur, hv, S.action) : null, hvTiles = hv ? MO.tiles[hv].tiles : 0;
    let crossing = hvRoute ? hvRoute.crosses : [];
    if (hv) { moveAp = moveCost(hv); if (hvRoute) arrowsOf(hvRoute.route, cur.pos); else { let k = hv; while (P.prev[k]) { const p = P.prev[k]; const [ax, ay] = p.split(',').map(Number), [bx, by] = k.split(',').map(Number); route[p] = ARROWS[(bx - ax) + ',' + (by - ay)]; k = p; } } }
    const foes = cb.units.filter((u) => u.side === 'foe' && !u.dead);
    const tgtUnit = cb.units.find((u) => u.id === S.target && !u.dead && (!cur || u.id !== cur.id)) || foes.find((u) => !u.downed) || null;
    const ATTACKS = ATTACK_MODES; // the old attack rows (a companion, a puppet or the drone keeps them: game/techView.ts)
    const attackMode = ATTACKS.includes(S.action) ? S.action : 'shot';
    const pv = mineTurn && tgtUnit && ATTACKS.includes(S.action) ? previewAttack(cb, cur, tgtUnit, attackMode) : null;
    // ---------- Physical 2.0 (rules 1.12; game/techView.ts): the weapon blocks, the open pad, the picked technique ----------
    // Everything below is the engine's (techniquePad, previewTechnique, physView): the screen works out no number.
    const blocks = mineTurn && !isLegacyUnit(cur) ? weaponBlocks(g, cb, cur) : [];
    const tpadOpen = mineTurn ? padOf(S.action) : null; // an open pad (a technique picked from it is on the flow)
    // Fog of war: what a preview SHOWS never tells of a unit this side can't see (preview.ts; the flow's previews are
    // fogged in the engine). seenCb is the fight as this side sees it, for the magic previews still worked out here.
    const seenCb = fightSeenBy(cb, 'pc'), inSight = seenCb === cb ? null : new Set(seenCb.units.map((u) => u.id));
    /** The fight as this side sees it, for a preview that works out who is affected (an Evoke's plan, an Outburst's aim):
     *  the units out of sight aren't there. */
    const fogged = (c) => (inSight ? fightSeenBy(c, 'pc') : c);
    // ---------- Calls (the talking skills' actions in a fight; game/callView.ts) ----------
    // A Call picked on the Calls tab: its target by its aim (an enemy, an ally, or yourself when nobody is picked), the
    // tile some take (Order's move; Cue's and Warn's named step), Order's things, and the engine's preview of it all.
    const cChips = mineTurn ? callChips(g, cb, cur) : []; // the Calls tab's chips (their look: the aim, the skill, the step)
    const allies = cb.units.filter((u) => u.side === 'pc' && !u.dead && cur && u.id !== cur.id);
    const covers = coverOf(cb), allObjs = objectsOf(cb).filter((o) => !(o.rig && o.side && o.side !== 'pc'))
    let pickSel = null;
    // Rules 1.9: piles on the ground (the view holds only those the party can see). Pick up takes the clicked pile, or the
    // one in reach (your own tile first); a pile out of reach shows the way there and what it crosses.
    const piles = pilesIn(objectsOf(cb)), pileReach = mineTurn && S.action === 'pickup' ? [...piles.values()].filter((o) => dist(cur.pos, o.pos) <= 1).sort((a, b) => dist(cur.pos, a.pos) - dist(cur.pos, b.pos)) : [];
    const pickPile = S.action === 'pickup' && mineTurn ? (S.tile && piles.get(S.tile)) || pileReach[0] || null : null;
    if (pickPile && dist(cur.pos, pickPile.pos) <= 1) pickSel = pickPile.pos;
    const pickUntick = S.pickUntick && pickPile && S.pickUntick.tile === pickPile.pos ? S.pickUntick.keys : [];
    const pickWhy = pickPile ? pickupWhy(cur.pos, pickPile, cur.ap, pickUntick) : 'Nothing on the ground next to you.';
    const pickFar = pickPile && !pickSel ? routeHazards(cb, cur, pickPile.pos) : null;
    if (pickFar) { arrowsOf(pickFar.route, cur.pos); crossing = pickFar.crosses; }
    const crossAt = new Set(crossing.map((c) => c.tile));
    // ---------- perks, traits and class moves: the form a move asks for beyond its grid target (game/actionPickers.ts) ----------
    // Option chips, a second click on the grid, a prose box only for words: the bespoke panel of a perk's 'form' pick.
    const pkSel = parsePk(S.action), pkE = pkSel && mineTurn ? perkEntries(g, cb, cur, ch, 'combat').find((e) => e.id === pkSel.id && e.actionId === pkSel.actionId) || null : null;
    const pkX = pkE ? { g, c: ch, how: 'combat', cb, u: cur } : null, pkP = pkE ? pickerFor(pkE, pkX) : null;
    const pkV = pkP && S.pkForm && S.pkForm.key === S.action ? S.pkForm.v : {};
    const pkBuilt = pkP ? buildArgs(pkP, pkV, pkX) : {}, pkMissing = typeof pkBuilt === 'string' ? pkBuilt : '';
    const sk = w && w.grants, skFx = (sk && sk.effect) || {}, skRuns = ['multi_shot', 'sweep'].includes(skFx.op);
    // ---------- magic: what this unit can cast, previews and refusals straight from the engine ----------
    const mg = cur && cur.mg, words = mg ? mg.words : [], designs = mg ? mg.designs : [];
    const hasMagic = !!(mg && (words.length || designs.length || mg.evoker || mg.emanator)), isMagic = MAGIC.includes(S.action) && hasMagic;
    const mana = cb.mana ?? MANA_START, band = manaBand(mana), pcb = cb.mana == null ? { ...cb, mana } : cb;
    // Draw (rules 1.4: on your own tile only): each word as the engine would draw it now, with its cost and whether it
    // starts or extends a Line, and the stroke it goes into (rules 1.10: the picker; spec: Mana, Sigils 9.1; game/sigilView.ts).
    const strip = S.action === 'draw' && mineTurn && mg ? withGame(g, () => drawStrip(pcb, cur, S.stroke)) : { tile: '', words: [], stroke: null };
    const wordInfo = {}; for (const dw of strip.words) wordInfo[dw.id] = dw;
    const WM = wordMasteryChips(cur && cur.charId && !cur.companion ? g.characters[cur.charId] : null); // rules 1.10: use counts and stars on the keys
    const word = S.word && words.includes(S.word) ? S.word : (strip.words.find((dw) => dw.ok) || {}).id || words[0] || null;
    const drawReach = new Set(word && wordInfo[word] && wordInfo[word].ok ? [cur.pos] : []);
    const drawDiff = (k) => { const dw = word && wordInfo[word]; return dw && dw.ok && k === cur.pos ? { ap: dw.cost.ap, charge: dw.cost.charge, over: dw.overload } : null; };
    // Evoke (rules 1.4): the Line picked, where to stand, the area and the hovered next pick (spec 9.2–9.8). Only glyphs
    // this side can see start a pattern (hostile ones hide in the fog, as on the grid); words you know are readable.
    const readable = new Set(cb.units.filter((u) => u.side === 'pc' && owner(u) === me && u.mg).flatMap((u) => u.mg.words)), knows = (w) => readable.has(w);
    const seenGlyph = (k) => !!k && glyphsAt(pcb, k).length > 0; // the view holds only the glyphs this side sees
    const evTile = S.action === 'evoke' && S.glyphTile && seenGlyph(S.glyphTile) ? S.glyphTile : null;
    const evV = mineTurn && mg && evTile ? evokeView(fogged(pcb), cur, evTile, S.evc || {}, S.hover, knows) : null; // (fog: who is affected, as this side sees the fight)
    const hoverPanel = S.action === 'evoke' && !evTile && mineTurn && seenGlyph(S.hover) ? patternPanel(pcb, S.hover, cur, knows) : null;
    // Outburst (rules 1.5, game/heartView.ts): not holding, a design and Begin (hold at stage 0) or Snap (Begin and
    // Release at once, aimed); holding, the HEART panel (Pump, Release, Steady, Let go, Feed, Heart Overwatch). Every cost,
    // refusal, tile and number is the engine's preview.
    const held = mg && mg.held, heldD = held ? designs.find((d) => d.id === held.design) || null : null;
    const dsel = designs.find((d) => d.id === S.design) || designs[0] || null, obMode = S.obMode === 'snap' ? 'snap' : 'begin';
    const cards = mineTurn && mg && !held && (S.action === 'outburst' || S.tab === 'outbursts') ? designCards(pcb, cur) : [];
    const card = dsel ? cards.find((x) => x.id === dsel.id) || null : null;
    // ---------- the one action flow (game/actionFlow.ts): the picked action's descriptor, picks and the engine's preview ----------
    // A bespoke panel adds what it picked: the pile's checklist (Pick up), a perk's form. Reading a glyph with Analyze keeps its own path.
    const flowExtra = S.action === 'pickup' && pickPile && pickSel ? (() => { const take = pileTake(pickPile, pickUntick); return take ? { take } : {}; })() : pkE && !pkMissing ? { form: pkBuilt }
      // the magic panels' picks: the glyph keyboard's word and stroke (drawn on your own tile), the Evoke planner's plan,
      // the design card and Begin or Snap with its aim, the Release's aim
      : S.action === 'draw' && word ? { word, ...(strip.stroke ? { stroke: strip.stroke } : {}) } : S.action === 'evoke' && evV && evV.payload ? { evoke: evV.payload }
      : S.action === 'outburst' && dsel ? { design: dsel.id, mode: obMode, ...(S.aim ? { aim: S.aim } : {}) } : S.action === 'release' && S.aim ? { aim: S.aim } : {};
    const flow = mineTurn && !(S.action === 'analyze' && S.readTile) ? flowView(g, me, cur, S, flowExtra) : null;
    this._flow = flow;
    this._pk = pkE ? { e: pkE, P: pkP, V: pkV, target: flow && flow.picks.targetId } : null;
    /** The row a picked action belongs to: its own, or its parent's (a technique's pad row, Hold a shot). */
    const rowSel = flow && flow.d.parent ? flow.d.parent : S.action;
    const tFlow = flow && flow.d.preview === 'technique' ? flow : null;
    // Toggles items put on the chosen action (Ricochet, Nonlethal, Heart Surge…): chips under the action; their ids ride
    // as mods (and into the Outburst preview, so a surged release shows its stage).
    const TOGGLE_ON = { shot: 'combat/attack', aimed: 'combat/attack', melee: 'combat/attack', burst: 'combat/attack', auto: 'combat/attack', move: 'combat/move', sprint: 'combat/move', disengage: 'combat/move', outburst: 'combat/outburst', release: 'combat/release', pump: 'combat/pump', evoke: 'combat/evoke' };
    const tglOn = TOGGLE_ON[S.action] || null; // (on the flow, the descriptor's own: a technique's are an attack's)
    const tgls = flow ? flow.pv.toggles : mineTurn && tglOn ? (() => { try { return withGame(g, () => togglesFor({ u: cur, c: ch, cb, g }, tglOn, { action: S.action, target: tgtUnit }, S.mods || [])); } catch { return []; } })() : [];
    this._mods = modsOf(tgls);
    const hp = mineTurn && held ? heartPanel(pcb, cur, this._mods) : null;
    // The grid preview: aimed (a Snap, a Release) on the aim once picked, else on the hovered tile; while holding, your
    // reach ring faintly and the aura's tiles; a design picked to Begin shows its reach.
    let hz = noOverlay(), hzPlan = null;
    if (mineTurn && mg) {
      const at = S.aim || S.hover || null;
      if (S.action === 'outburst' && dsel && !held) { hz = aimOverlay(fogged(pcb), cur, dsel.id, obMode === 'snap' ? at : null, this._mods); if (obMode !== 'snap') hz = { ...hz, mode: 'idle', area: new Set(), marks: new Map(), chip: '' }; hzPlan = obMode === 'snap' ? aimOverlay(fogged(pcb), cur, dsel.id, S.aim, this._mods).plan : null; }
      else if (S.action === 'release' && held) { hz = aimOverlay(fogged(pcb), cur, 'held', at, this._mods); hzPlan = aimOverlay(fogged(pcb), cur, 'held', S.aim, this._mods).plan; }
      else if (held && (HEART_ACTS.includes(S.action) || S.tab === 'outbursts')) hz = idleOverlay(pcb, cur);
    }
    // Where the chosen spell reaches and whom it would touch (for the grid overlay).
    // A prayer (Blessing 2.0; screens/faithCombat.js): its targets picked on the grid, the engine's preview as the verdict.
    const pr = flow && flow.d.preview === 'prayer' ? flow : null; // a prayer (on the flow): its picks ring in Virtue ink
    const soulAct = S.action === 'outburst' || S.action === 'release' || S.action === 'syphon' || S.action === 'crystallise' || HEART_ACTS.includes(S.action);
    const famInk = pr ? FAITH_INK : soulAct ? SOUL_INK : SIGIL_GLOW;
    // A hostile pattern shows only its tiles in sight, and only the words this side can read.
    let mReach = new Set(), tgtIds = [], patTiles = new Set(), aimTile = null;
    if (isMagic && mineTurn) {
      if (S.action === 'draw') mReach = drawReach;
      if (S.action === 'evoke' && hoverPanel) hoverPanel.tiles.forEach((k) => patTiles.add(k)); // the rest is evV's overlay
    }
    if (pr) { tgtIds.push(...pr.ring); if (pr.picks.tile) aimTile = pr.picks.tile; }
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
    // The AP the picked action takes is always the engine's number: on the flow, its preview (the reducer's dry run, after
    // the items and anything lent: the lend is added back here so the pips can show it as lent); else the system's own.
    const flowLend = flow && flow.action ? encoreCredit(cur, flow.action) : 0;
    const cost = flow ? flow.cost + flowLend : isMove ? moveAp : 0;
    // Encore (items 729, 737): the selected action repeats the Miracle's named one: the engine lends its AP (previewAttack and
    // the perk previews already count it); the cost shown is what is left to pay, and the panel says it is free.
    const encoreLend = !mineTurn ? 0 : flow ? flowLend : encoreCredit(cur, isMove ? { type: 'combat/move', how: S.action } : null);
    const encoreWaiting = mineTurn && cur.faith && cur.faith.encore ? cur.faith.encore : null;
    const VT0 = CAM.live() && !this._overview ? CAM.tiles() : { x0: 0, y0: 0, x1: cb.map.w - 1, y1: cb.map.h - 1 };
    const tokOpt = (u, x, y) => { const p = u.side === 'pc' ? playerOf(owner(u)) : null; return { ref: refOf(x + ',' + y), ally: u.side === 'pc', player: p ? p.initials + ' · ' + p.name.toUpperCase() : '', color: p ? p.color : '#F65157', inFight: true, right: x - VT0.x0 >= (VT0.x1 - VT0.x0 + 1) / 2, up: y - VT0.y0 >= (VT0.y1 - VT0.y0 + 1) / 2 }; };
    const condWord = (u) => (u.dead ? 'dead' : u.downed ? 'down' : u.hp >= u.maxHp ? 'unhurt' : u.hp > u.maxHp / 2 ? 'wounded' : 'badly hurt');

    const at = {}; cb.units.filter((u) => !u.dead).forEach((u) => { at[u.pos] = u; });
    // Combat clarity (fx/play.ts): a unit whose walk or coming-into-sight has not played yet (or is playing now) is drawn
    // see-through where the state already has it; the effects layer walks a copy of it there. The layer also learns
    // every unit's token look, to draw a walk whose unit has no token on screen (it fell at the end of it).
    const fxHeld = fxHeldUnits(g);
    // The walker the layer draws carries the kind chip and HP bar its tile shows (as below), so they don't pop on when it
    // arrives: exact HP for the squad and an Analyzed foe, else its look (unhurt, wounded, badly hurt).
    const hpLook = (u) => {
      const known = u.side === 'pc' || u.analyzedBy, hpPct = u.dead || u.downed ? 0 : known ? Math.max(0, Math.min(100, u.hp / Math.max(1, u.maxHp) * 100)) : u.hp >= u.maxHp ? 100 : u.hp > u.maxHp / 2 ? 66 : 33;
      return { box: 'position: absolute; left: 5px; right: 5px; bottom: 1px; height: 4px; z-index: 3; border-radius: 2px; overflow: hidden; pointer-events: none; background: rgba(5, 7, 11, 0.85)' + (known ? '' : '; outline: 1px dashed rgba(246, 81, 87, 0.5)'),
        chip: 'position: absolute; left: 0; top: 0; bottom: 0; width: ' + hpPct + '%; background: #FFFFFF', fill: 'position: absolute; left: 0; top: 0; bottom: 0; width: ' + hpPct + '%; background: #F65157' + (known ? '' : '; opacity: 0.6') };
    };
    setTokenLooks(cb.units.map((u) => { const kb = u.side === 'foe' ? kindBadge(u.kind, true) : null; return { id: u.id, src: faceOf(u) || '', style: 'position: relative; z-index: 2; width: 38px; height: 38px; object-fit: cover; ' + (u.side === 'pc' ? 'border-radius: 50%; border: 3px solid ' + ring(u) : 'border-radius: 4px; border: 2px solid #F65157'), kind: kb && kb.has ? { text: kb.text, style: kb.style } : null, hp: hpLook(u) }; }));
    const sensedAt = {}; vis.sensed.forEach((k) => { sensedAt[k] = true; }); // a presence, no unit (spec: Vision, Sensory)
    const solid = new Set(cb.map.solid), diff = difficultOf(cb);
    // ---------- the chosen attack's reach in red (as on the area map): where it can land from here, as the engine allows ----------
    const RED_ACTS = [...ATTACK_MODES, 'paired', 'overwatch', 'shove', 'analyze', 'cover'];
    // A technique aimed at an enemy shows its red area too: the engine's (the flow's preview: its weapon's reach and range
    // bands, a shield's Bash next to you, Lunge's step and Charge's run).
    const tReach = tFlow && tFlow.reach.size ? tFlow.reach : null;
    const redOn = !!(mineTurn && w && !isMagic && (RED_ACTS.includes(S.action) || (S.action === 'skill' && skRuns) || !!tReach));
    let red = new Map();
    if (tReach) { red = tReach; this._red = { key: 'flow', set: tReach }; }
    else if (redOn) {
      const mode = S.action === 'skill' ? (skFx.op === 'sweep' ? 'melee' : 'shot') : ['overwatch', 'cover', 'paired', 'analyze'].includes(S.action) ? (melee ? 'melee' : 'shot') : S.action === 'shove' ? 'melee' : S.action;
      const isM = mode === 'melee' && S.action !== 'analyze';
      // How far it reaches from here is the engine's rule (actions.ts reachTiles: previewAttack's own melee reach, the
      // Reach property included; the range bands and the optic; Analyze's range; a Shove's one tile).
      const what = S.action === 'analyze' ? 'analyze' : S.action === 'shove' || (S.action === 'skill' && skFx.op === 'sweep') ? 'shove' : S.action === 'cover' ? 'cover' : mode;
      const memo = [cur.id, cur.pos, cur.weapon, cur.offWeapon || '', (cur.mods || []).join(','), S.action, what, cb.round, cb.log.length].join('|');
      if (!this._red || this._red.key !== memo) this._red = { key: memo, set: reachTiles(cb, cur, what) };
      red = this._red.set;
    }
    /** The chip over a hovered unit while an attack is chosen: the engine's odds and AP, or its reason. */
    const atkTag = (k, u) => {
      if (!redOn || k !== S.hover || !u || u.id === cur.id) return null;
      const short = (why) => String(why || 'Not now').split(/[:.]/)[0].toUpperCase();
      if (S.action === 'analyze') return u.analyzedBy ? { ok: false, text: 'ANALYZED' } : red.has(k) ? { ok: true, text: 'ANALYZE · ' + analyzeCost(cur) + ' AP' } : { ok: false, text: 'OUT OF RANGE' };
      if (S.action === 'shove') return red.has(k) ? { ok: true, text: 'SHOVE · ' + cost + ' AP' } : { ok: false, text: 'GET NEXT TO IT' };
      if (S.action === 'skill' && skFx.op === 'multi_shot') { const p = previewAttack(cb, cur, u, 'shot', { extra: skFx.extra || 0, free: true }); return p.ok ? { ok: true, text: (skFx.shots || 1) + '× ' + p.pct + '% · ' + skFx.ap + ' AP' } : { ok: false, text: short(p.why) }; }
      if (ATTACKS.includes(S.action)) { const p = previewAttack(cb, cur, u, attackMode); return p.ok ? { ok: true, text: 'HIT ' + p.pct + '% · ' + p.ap + ' AP' } : { ok: false, text: short(p.why) }; }
      if (tReach) { const p = tFlow.peek(u.id), m = p && p.marks.units.find((x) => x.id === u.id);
        return p && p.ok ? { ok: true, text: (m && m.tag ? 'HIT ' + m.tag + ' · ' : '') + p.ap + ' AP' } : { ok: false, text: short(p && p.why) }; }
      return null;
    };
    // The zone's map painting under the grid (spec: Campaigns, art): each tile shows its slice, colours become tints.
    const mapArt = ART(zoneOf(g)?.art?.map), TINT = { '#0D1119': 'rgba(10, 13, 19, 0.1)', '#1C2536': 'rgba(10, 13, 19, 0.55)', '#4A3A20': 'rgba(140, 111, 58, 0.22)', '#2A2113': 'rgba(140, 111, 58, 0.12)', '#3A2E1A': 'rgba(58, 46, 26, 0.3)', '#161C28': 'rgba(22, 28, 40, 0.3)' };
    const paint = (k, col) => (mapArt && !String(col).startsWith('rgba(255') ? tileBg(mapArt, k, cb.map.w, cb.map.h, TINT[col] || (String(col).startsWith('rgba') ? col : 'rgba(10, 13, 19, 0.1)')) : col);
    // The glyph layer: glyphs and standing zones by tile. Hostile glyphs show only where you can see, and only as words
    // your side can read (the rest are scratches).
    // Glyphs follow the effects too (fx/play.ts fxShownGlyphs): a Line drawn and Evoked in one step (a hostile caster's
    // turn) lies on its tiles from its draw until its Evoke plays. For the picture only: the rules read cb.glyphs.
    const glyphsShown = [...(cb.glyphs || []), ...fxShownGlyphs(g)];
    const glyphAt = {}; glyphsShown.forEach((gl) => { (glyphAt[gl.pos] ||= []).push(gl); });
    const glyphName = (gl) => glyphMark(gl, 'pc', knows).title;
    // Rules 1.10: a scuffed glyph's trace stays 2 rounds, faint; Analyze aimed at it (or at a hostile glyph) reads it.
    const traceAt = {}; (cb.traces || []).forEach((t) => { (traceAt[t.pos] ||= []).push(t); });
    const readHere = (k) => (cur && cur.side === 'pc' && vis.tiles.has(k) ? readableAt(cb.glyphs || [], cb.traces || [], k, 'pc', knows, cur.charId) : []);
    const readSel = S.action === 'analyze' && S.readTile && readHere(S.readTile).length ? S.readTile : null; this._readHere = readHere;
    const readText = readSel ? 'Read ' + readHere(readSel).map((x) => (knows(x.word) ? x.word.toUpperCase() : 'the') + (x.trace ? ' trace' : ' glyph')).join(' and ') + ' at ' + refOf(readSel) + ' (' + (cur ? analyzeCost(cur) : 2) + ' AP): +2 study for each, and the word goes on your known-to-study list. Confirm.' : '';
    // Rules 1.10 strokes (game/sigilView.ts strokeLayer): a faint line joins each stroke's glyphs; the hovered glyph lights
    // its whole stroke and names its words; while drawing, the stroke the glyph would make shows as a dashed line.
    const dwSel = S.action === 'draw' && word ? wordInfo[word] : null;
    const SL = strokeLayer(glyphsShown, { side: 'pc', hover: S.hover, knows, preview: dwSel && dwSel.ok ? [dwSel.joins, dwSel.joins2] : [] });
    // Placed magic (spec 9.9: fields tinted by element, your traps, spotted enemy traps, turrets, RAISE walls, smoke,
    // light) under the Evoke plan's overlay; outside the area is dimmed while aiming (spec 9.4).
    // Class Roster Revision 3's standing marks (game/classMarks.ts): False Images, Read's intents, rigged and sabotaged tiles.
    const placed0 = placedView(pcb, 'pc'), placed = { ...placed0, tiles: mergeTiles(placed0.tiles, classMarks(cb, 'pc', { imgOf: (x) => ART(x.img) || x.img || '' })) }, evOn = S.action === 'evoke' && isMagic && mineTurn && !!evV;
    // A class move or perk that casts (Payload, Seal, Survey, Fusion, Twin Discipline, Stitch, Stored Spell…) paints its
    // engine preview on the grid too: the area, the tiles it covers, who it affects (spec 9; item 489 c).
    const pkTiles = flow && flow.d.preview === 'perk' && (flow.area.length || flow.targets.length) ? actionPreviewTiles(cb, { tiles: flow.area, targets: flow.targets }, cur.side) : null; // (the engine's marks: only the units this side sees)
    const tTiles = tFlow && (tFlow.area.length || tFlow.targets.length) ? actionPreviewTiles(cb, { tiles: tFlow.area, targets: tFlow.targets }, cur.side) : null; // (one target: the target card names it; its pips stay readable)
    const sgTiles = evOn ? mergeTiles(placed.tiles, evV.tiles) : pkTiles ? mergeTiles(placed.tiles, pkTiles) : tTiles ? mergeTiles(placed.tiles, tTiles) : placed.tiles, sgDim = evOn && evV.stage !== 'stand' && evV.stage !== 'none' && evV.area.size > 0;
    const markStyle = (k, u) => {
      if (hz.on) { if (u && hz.marks.has(u.id)) return overlayRingStyle({ ...hz, ink: hz.marks.get(u.id).ink }); const st = overlayTileStyle(hz, k); if (st) return st; }
      if (u && tgtSet.has(u.id)) return 'position: absolute; inset: -1px; z-index: 1; border-radius: 4px; pointer-events: none; border: 3px solid ' + famInk + '; box-shadow: 0 0 10px ' + famInk;
      if (k === aimTile || k === readSel) return 'position: absolute; inset: 0; z-index: 1; border-radius: 4px; pointer-events: none; border: 2px solid #FFFFFF';
      if (S.action === 'analyze' && mineTurn && !u && readHere(k).length) return 'position: absolute; inset: 1px; z-index: 1; border-radius: 4px; pointer-events: none; border: 1px dashed ' + SIGIL_INK;
      if (patTiles.has(k)) return 'position: absolute; inset: 0; z-index: 1; border-radius: 4px; pointer-events: none; border: 2px solid ' + SIGIL_GLOW + '; box-shadow: 0 0 8px ' + SIGIL_GLOW + ', inset 0 0 8px rgba(79, 200, 223, 0.35)';
      if (mReach.has(k)) return 'position: absolute; inset: 0; z-index: 1; border-radius: 4px; pointer-events: none; border: 1px dashed ' + famInk + '; background: ' + (soulAct ? 'rgba(174, 155, 255, 0.08)' : 'rgba(79, 200, 223, 0.08)');
      return '';
    };
    // World Play 1.7 (game/worldView.ts): the fight's hazards per tile, caches with their count, carried people a Downed
    // carrier dropped (lying on the floor until the fight ends).
    const myCharC = (cur && cur.charId && g.characters[cur.charId]?.owner === me ? cur.charId : Object.values(g.characters).find((x) => x.owner === me)?.id), WLc = worldLayer(g, true, myCharC), dropAt = {}; (cb.dropped || []).forEach((d) => { dropAt[d.at] = d; });
    // The letters and numbers stay at the window's edge while the map scrolls under them (the camera). They are the top
    // layer of the map (GRID_LAYER): a tile scrolled under them, its hover and its chips stay beneath, and the pointer
    // over them (their gaps included: .phc-axis) is theirs, so a tile under the header never reacts (Leon, live 0.23.0).
    const AXIS = 'display: grid; place-items: center; font-size: 11px; font-weight: 700; color: #7F8BA1; background: #05070B; box-shadow: 0 0 0 2px #05070B; position: sticky; ';
    const clearHover = () => { if (this.state.hover) this.setState({ hover: null }); };
    const tiles = [], axis = (key, text) => ({ key, isLabel: true, isTile: false, text, hover: clearHover, style: AXIS + (key === 'h-' ? 'top: 0; left: 0; z-index: ' + GRID_LAYER.corner : key[0] === 'h' ? 'top: 0; z-index: ' + GRID_LAYER.axis : 'left: 0; z-index: ' + GRID_LAYER.axis) });
    // Tooltips near an edge turn inward: the edge is the camera's window, not the map's (vx, vy: a tile's place in it).
    const VT = CAM.live() && !this._overview ? CAM.tiles() : { x0: 0, y0: 0, x1: cb.map.w - 1, y1: cb.map.h - 1 }, vW = Math.max(1, VT.x1 - VT.x0 + 1), vH = Math.max(1, VT.y1 - VT.y0 + 1);
    const vxOf = (x) => Math.max(0, Math.min(vW - 1, x - VT.x0)), vyOf = (y) => Math.max(0, Math.min(vH - 1, y - VT.y0));
    tiles.push(axis('h-', '')); for (let x = 0; x < cb.map.w; x++) tiles.push(axis('h' + x, refOf(x + ',0').replace(/\d+$/, '')));
    const WMk = watchMarks(g, cb, 'pc');
    for (let y = 0; y < cb.map.h; y++) for (let x = -1; x < cb.map.w; x++) {
      if (x < 0) { tiles.push(axis('r' + y, String(y + 1))); continue; }
      const k = x + ',' + y, u = at[k], inRange = isMove && !u && reach(k), note = notesAt(cb.map, k)[0];
      const gls = glyphAt[k] || [], trs = traceAt[k] || [], sgT = sgTiles[k], mk = markStyle(k, u), mTag = magicTag(k);
      const sgLayer = [sgT && sgT.layer, sgDim && !evV.area.has(k) && !evV.pickable.has(k) && !evV.stepTo.has(k) && !evV.orderTo.has(k) && k !== cur.pos ? 'background: rgba(5, 7, 11, 0.5)' : ''].filter(Boolean).join('; ');
      const magicNote = (gls.length ? ' · glyphs: ' + gls.map(glyphName).join(', ') : '') + (trs.length ? ' · ' + trs.map((t) => traceMark(t, knows).title).join(', ') : '') + (sgT && sgT.note ? ' · ' + sgT.note : '') + (u && u.mg && u.mg.held ? ' · holding an Outburst (stage ' + u.mg.held.stage + ')' : '') + (u && (u.side === 'pc' || u.analyzedBy) ? condChips(u, g).map((c) => ' · ' + c.k.toLowerCase()).join('') : '');
      let bg = '#0D1119', border = '1px solid #151C29';
      if (solid.has(k)) { bg = '#1C2536'; border = '1px solid #232D3F'; }
      const cv = covers[k], ob = allObjs.find((o) => o.pos === k && !(cv && (o.kind === 'crate' || o.kind === 'pillar')) && o.kind !== 'rubble' && o.kind !== 'pile');
      if (cv) { bg = cv.kind === 'full' ? '#4A3A20' : '#2A2113'; border = (cv.kind === 'full' ? '2px solid #8C6F3A' : '1px solid #4A3A20'); }
      const spr = allObjs.filter((o) => o.pos === k && spriteOf(g, o)).sort((a, b) => (a.kind === 'rubble') - (b.kind === 'rubble'))[0];
      if ((flow && flow.picks.tile === k && (S.action === 'cover' || S.action === 'door')) || k === pickSel || (pickPile && k === pickPile.pos)) border = '2px solid #FFFFFF';
      if (ob && kindOf(ob).door && !ob.open) { bg = '#3A2E1A'; }
      if (diff.has(k) && !u) { bg = '#161C28'; }
      const aTag = u ? atkTag(k, u) : null;
      // Physical 2.0 (part 3): Pressure pips over every token (public), Stopped once and a held Watch in its hover card
      // and aria-label; held Watches your side can see, tinted on their tiles with a dotted line from the watcher.
      const uPhys = u ? physOf(g, cb, u, 'pc') : null, pLook = pressureLook(uPhys), pLines = physLines(uPhys), wT = WMk.tiles.get(k), wChip = u ? WMk.chips.get(u.id) : null;
      const wc = WLc.cells.get(k) || {}, kb = u && u.side === 'foe' ? kindBadge(u.kind, true) : null, dr = !u ? dropAt[k] : null;
      const pileHere = pileReach.some((o) => o.pos === k);
      const cReach = flow && flow.d.preview === 'call' && flow.reach.size ? flow.reach : null, cTile = cReach ? flow.picks.tile || null : null;
      const planStyle = inRange || pileHere ? 'background: rgba(231, 235, 243, 0.12); border: 1px dashed #E7EBF3' : cReach ? (cReach.has(k) ? (cTile === k ? 'background: rgba(231, 235, 243, 0.3); border: 2px solid #FFFFFF' : 'background: rgba(231, 235, 243, 0.07); border: 1px dashed rgba(231, 235, 243, 0.5)') : cTile === k ? 'background: rgba(231, 235, 243, 0.3); border: 2px solid #FFFFFF' : '') : red.has(k) ? ['background: rgba(246, 81, 87, 0.2); border: 1px dashed rgba(246, 81, 87, 0.9)', 'background: rgba(246, 81, 87, 0.11); border: 1px dashed rgba(246, 81, 87, 0.55)', 'background: rgba(246, 81, 87, 0.06); border: 1px dashed rgba(246, 81, 87, 0.35)', 'background: rgba(246, 81, 87, 0.04); border: 1px dashed rgba(246, 81, 87, 0.25)'][Math.min(3, red.get(k) || 0)] : '';
      const isHeld = !!(u && fxHeld.has(u.id));
      const known = u && (u.side === 'pc' || u.analyzedBy), hpPct = !u ? 0 : u.dead || u.downed ? 0 : known ? Math.max(0, Math.min(100, u.hp / Math.max(1, u.maxHp) * 100)) : u.hp >= u.maxHp ? 100 : u.hp > u.maxHp / 2 ? 66 : 33;
      const sel = u && tgtUnit && u.id === tgtUnit.id;
      const isCur = u && cur && u.id === cur.id;
      tiles.push({
        hasPress: pLook.has && !isHeld, press: pLook.pips, pressStyle: pLook.style, pressTitle: pLook.title,
        hasWatchT: !!wT, watchTStyle: wT ? wT.style : '', watchTTitle: wT ? wT.title : '', hasWatchChip: !!wChip && !isHeld, watchChip: wChip ? wChip.text : '', watchChipStyle: wChip ? wChip.style : '', watchChipTitle: wChip ? wChip.title : '',
        key: k, isLabel: false, isTile: true, cover: cv, label: refOf(k) + ' · ' + (u ? u.name + (u.side === 'foe' ? ' (hostile)' : '') + (u.side === 'pc' || u.analyzedBy ? ' · HP ' + u.hp + '/' + u.maxHp : ' · looks ' + condWord(u)) + (u.shield > 0 ? ' · Shield ' + u.shield + ' (damage takes it first)' : '') + (u.res && u.res.guard > 0 ? ' · Guard ' + u.res.guard : '') + (u.downed ? ' · Downed' : '') + (u.surrendered ? ' · Surrendered' : '') + (pLines.length ? ' · ' + pLines.join(' · ') : '') + (() => { const cs = [...effectsOf(u).map(([k, t]) => k + ': ' + t), ...condChips(u, g).filter((c) => c.key !== 'shield').map((c) => c.t)]; return cs.length ? ' · ' + cs.join(' · ') : ''; })() : solid.has(k) ? 'Solid' : ob ? ob.name + (ob.hp != null ? ' · HP ' + ob.hp + '/' + ob.max : '') + (kindOf(ob).door ? (ob.locked ? ' · locked' : ob.open ? ' · open' : ' · closed') : '') + (ob.text ? ' · ' + ob.text : '') + (cv ? ' · ' + cv.kind + ' cover' : '') : cv ? (cv.kind === 'full' ? 'Full cover (blocks sight)' : 'Half cover (−5 to shots at whoever is behind it)') + ' · HP ' + cv.hp + '/' + cv.max : diff.has(k) ? ((cb.rubble || []).includes(k) ? 'Rubble' : 'Difficult terrain') : 'open') + (!vis.tiles.has(k) ? ' · out of sight' : '') + (cb.map.dark && !litAt(cb, k) ? ' · dark' : '') + (note ? ' · ' + note : '') + magicNote, title: u ? '' : refOf(k) + (note ? ' · ' + note : '') + magicNote,
        worldNote: (wc.hz ? ' · ' + wc.hz.title : '') + (wc.cache ? ' · ' + wc.cache.title : '') + (wc.pile ? ' · ' + wc.pile.title.replace(/:\n/, ': ').replace(/\n/g, ', ') : '') + (dr ? ' · ' + dr.npc.name + ' lies here' : '') + (crossAt.has(k) ? ' · your path crosses this hazard' : ''),
        hasPile: !!wc.pile, pileStyle: wc.pile ? wc.pile.style : '', pileIconStyle: wc.pile ? wc.pile.iconStyle : '', pileCount: wc.pile ? wc.pile.count : '', pileCountStyle: wc.pile ? wc.pile.countStyle : '',
        hasPileTip: !!wc.pile && S.hover === k, pileTip: wc.pile ? wc.pile.tip : '', pileRows: wc.pile ? wc.pile.tipRows : [], pileTipStyle: wc.pile ? pileTipStyle(wc.pile, vxOf(x), vyOf(y), vW, !!u) : '',
        hasCross: crossAt.has(k), crossStyle: CROSS_STYLE, crossChipStyle: CROSS_CHIP_STYLE,
        unseen: !vis.tiles.has(k), sensed: !!sensedAt[k], dark: !!cb.map.dark && !litAt(cb, k),
        hasHzd: !!wc.hz, hzdLayer: wc.hz ? wc.hz.layer : '', hzdGlyph: wc.hz ? wc.hz.glyph : '', hzdGlyphStyle: wc.hz ? wc.hz.glyphStyle : '', hzdKind: wc.hz ? wc.hz.kind + (wc.hz.safe ? ' safe' : '') : '',
        hasCache: !!wc.cache && !u, hasCacheGlyph: !!wc.cache && !u && !spr, cacheGlyph: wc.cache ? wc.cache.glyph : '', cacheStyle: wc.cache ? wc.cache.style : '', cacheChip: wc.cache ? wc.cache.chip : '', cacheChipStyle: wc.cache ? wc.cache.chipStyle : '',
        hasKind: !!(kb && kb.has) && !isHeld, kindText: kb ? kb.text : '', kindStyle: kb ? kb.style : '', kindTitle: kb ? kb.title : '',
        hasDrop: !!dr, dropText: dr ? '▾ ' + dr.npc.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() : '', dropTitle: dr ? dr.npc.name + ' lies here (dropped when the carrier went down; back on the map after the fight)' : '',
        hasTok: !!u, t: u ? tokenVals(u, { ...tokOpt(u, x, y), extra: pLines }) : null, hasObj: !!ob && !u && !spr && !wc.cache && !wc.sigil, hasSigMark: !!wc.sigil && !u, sigMark: wc.sigil ? wc.sigil.src : '', sigMarkStyle: wc.sigil ? wc.sigil.style : '', objGlyph: ob ? kindOf(ob).glyph : '', objStyle: 'position: absolute; inset: 0 0 12px 0; display: grid; place-items: center; font-size: 20px; color: ' + (ob && (kindOf(ob).hazard || ob.kind === 'trap' || kindOf(ob).explodes) ? '#F65157' : ob && ob.kind === 'poi' ? '#FFFFFF' : '#C9D3E3'),
        click: () => this.tileClick(k), hover: () => { if (this.state.hover !== k) this.setState({ hover: k }); },
        hasArrow: !!route[k] && k !== (cur && cur.pos), arrow: route[k] || '', hasCost: k === hv || !!mTag || !!aTag, cost: mTag || (aTag ? aTag.text : (moveAp ? '−' + moveAp + ' AP' : 'Paid') + ' · ' + hvTiles + (hvTiles === 1 ? ' tile' : ' tiles') + (crossing.length ? ' · ⚠ HAZARD' : '')),
        // The chip over the hovered tile: kept whole inside the map (it was cut off at the map's edge when the reason was
        // long, Leon 10 Nov 2026): a long reason wraps, and near an edge the chip slides inward; on the top row it sits
        // under the tile. It is drawn over every token and overlay of the grid.
        costStyle: (() => { const txt = String(mTag || (aTag ? aTag.text : '') || ''), wrap = !!aTag && !aTag.ok && txt.length > 26, wPx = Math.min(wrap ? 230 : 400, txt.length * 7.2 + 16), half = wPx / 2;
          const right = (vW - 1 - vxOf(x)) * 48 + 23 + 6, left = vxOf(x) * 48 + 23 + 22, dx = Math.round(Math.max(0, half - left) - Math.max(0, half - right));
          return 'position: absolute; left: 50%; ' + (vyOf(y) === 0 ? 'top: calc(100% - 6px)' : 'bottom: calc(100% - 10px)') + '; transform: translateX(calc(-50% + ' + dx + 'px)); z-index: 30; padding: 2px 6px; border-radius: 6px; font-size: 11px; font-weight: 700; pointer-events: none; '
            + (wrap ? 'white-space: normal; width: max-content; max-width: 230px; text-align: center; line-height: 1.25; ' : 'white-space: nowrap; '); })()
          + (aTag ? (aTag.ok ? 'background: #F65157; color: #0A0D13' : 'background: #1C2536; color: #F65157; border: 1px solid #F65157') : 'background: #FFFFFF; color: #0A0D13'),
        hasPlan: !!planStyle, planStyle: 'position: absolute; inset: 0; z-index: 1; border-radius: 4px; pointer-events: none; box-sizing: border-box; ' + planStyle,
        hasRing: !!isCur && !cb.over && !isHeld, ringCls: mineTurn ? 'phc-cur-ring' : '', ringStyle: 'position: absolute; left: 50%; top: 50%; width: 44px; height: 44px; margin: -22px 0 0 -22px; z-index: 3; pointer-events: none; box-sizing: border-box; border-radius: ' + (u && u.side === 'pc' ? '50%' : '6px') + '; border: 2px solid ' + (mineTurn ? '#FFFFFF' : u ? ring(u) : '#FFFFFF'),
        hasTgtRing: !!(u && redOn && u.id !== cur.id && red.has(k) && !u.downed) && !isHeld, tgtRingStyle: 'position: absolute; inset: 1px; z-index: 3; pointer-events: none; box-sizing: border-box; border-radius: 4px; border: 2px solid #F65157; box-shadow: 0 0 10px rgba(246, 81, 87, 0.6)',
        // What stands in front of the HP, on the token itself (Leon, 11 Nov 2026): a shield as a pale bar over the HP bar
        // (its share of max HP), Guard as pips over that. Both read in the tile's label too.
        ...(() => { const sh = u && !isHeld ? Math.max(0, u.shield || 0) : 0, gd = u && !isHeld ? Math.max(0, (u.res && u.res.guard) || 0) : 0;
          return { hasShield: sh > 0, shieldBox: 'position: absolute; left: 5px; right: 5px; bottom: 6px; height: 3px; z-index: 3; border-radius: 2px; overflow: hidden; pointer-events: none; background: rgba(5, 7, 11, 0.85)',
            shieldFill: 'position: absolute; left: 0; top: 0; bottom: 0; width: ' + Math.max(8, Math.min(100, sh / Math.max(1, u ? u.maxHp : 1) * 100)) + '%; background: #8BDEEE',
            hasGuard: gd > 0, guardBox: 'position: absolute; left: 5px; bottom: ' + (sh > 0 ? 10 : 6) + 'px; z-index: 3; display: flex; gap: 2px; pointer-events: none',
            guardPips: Array.from({ length: Math.min(5, gd) }, (_, i) => ({ key: 'g' + i, style: 'width: 5px; height: 5px; border-radius: 1px 1px 3px 3px; background: #E7EBF3; box-shadow: 0 0 0 1px rgba(5, 7, 11, 0.9)' })) }; })(),
        hasHp: !!u && !isHeld, hpBox: 'position: absolute; left: 5px; right: 5px; bottom: 1px; height: 4px; z-index: 3; border-radius: 2px; overflow: hidden; pointer-events: none; background: rgba(5, 7, 11, 0.85)' + (known ? '' : '; outline: 1px dashed rgba(246, 81, 87, 0.5)'),
        hpChip: 'position: absolute; left: 0; top: 0; bottom: 0; width: ' + hpPct + '%; background: #FFFFFF', hpFill: 'position: absolute; left: 0; top: 0; bottom: 0; width: ' + hpPct + '%; background: #F65157' + (known ? '' : '; opacity: 0.6'),
        hasJoin: !!(SL.tiles[k] && SL.tiles[k].length), join: SL.tiles[k] ? joinUri(SL.tiles[k], { size: 44, pad: 26, anchor: [9, 9], pitch: 48 }) : '',
        // A preview line ends under the caster's token: while drawing, the joins sit above the token (and below the tip).
        joinStyle: 'position: absolute; left: -26px; top: -26px; width: 96px; height: 96px; pointer-events: none; z-index: ' + (SL.tiles[k] && SL.tiles[k].some((x) => x.kind === 'preview') ? 4 : 2),
        hasStrokeHot: SL.hot.has(k), strokeHotStyle: 'position: absolute; inset: 0; z-index: 2; border-radius: 4px; pointer-events: none; box-sizing: border-box; border: 1px solid ' + SIGIL_INK + '; box-shadow: inset 0 0 8px rgba(139, 222, 238, 0.35)',
        hasStrokeTip: k === S.hover && !!SL.hotText, strokeTip: SL.hotText, strokeTipStyle: 'position: absolute; top: -17px; ' + (vxOf(x) >= vW / 2 ? 'right: 0' : 'left: 0') + '; z-index: 5; padding: 1px 6px; border-radius: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; white-space: nowrap; pointer-events: none; background: #0B1519; color: #8BDEEE; border: 1px solid #8BDEEE',
        hasGlyphs: gls.length + trs.length > 0, glyphs: [...gls.map((gl) => ({ key: gl.id, title: glyphName(gl), src: glyphMark(gl, 'pc', knows).src,
          style: 'width: 16px; height: 16px; border-radius: 3px; background: rgba(5, 7, 11, 0.55); ' + (gl.side === 'pc' ? 'box-shadow: 0 0 6px rgba(79, 200, 223, 0.6)' : 'opacity: 0.85; box-shadow: 0 0 0 1px rgba(246, 81, 87, 0.5)') })),
          ...trs.map((t) => { const tm = traceMark(t, knows); return { key: 'tr-' + t.id, title: tm.title, src: tm.src, style: tm.style }; })],
        hasZone: !!sgLayer, zoneStyle: 'position: absolute; inset: 0; z-index: 1; border-radius: 2px; pointer-events: none; box-sizing: border-box; ' + sgLayer, hasMark: !!mk, markStyle: mk,
        hasSg: !!(sgT && sgT.marks.length), sg: sgT ? sgT.marks : [],
        hasHz: !!(u && hz.marks.has(u.id)), hzText: u && hz.marks.has(u.id) ? markChipText(hz.marks.get(u.id)) : '', hzStyle: u && hz.marks.has(u.id) ? markChipStyle(hz.marks.get(u.id)) : '', hzTitle: u && hz.marks.has(u.id) ? hz.marks.get(u.id).title : '',
        hasHeart: !!(u && u.mg && u.mg.held), heart: u && u.mg && u.mg.held ? heartUri(u.mg.held.stage) : '', heartTitle: u && u.mg && u.mg.held ? u.name + ' is holding an Outburst: stage ' + u.mg.held.stage + ' (×' + stageMult(u.mg.held.stage) + ')' : '',
        sfx: isMagic && S.action === 'draw' && drawReach.has(k) ? 'none' : undefined,
        hasSprite: !!spr, sprite: spr ? spriteOf(g, spr) : '', spriteStyle: spr ? spriteStyle(spr) : '',
        hasImg: !!faceOf(u), img: faceOf(u),
        imgStyle: 'position: relative; z-index: 2; width: 38px; height: 38px; object-fit: cover; ' + (u && u.side === 'pc' ? 'border-radius: 50%; border: 3px ' + (u.downed ? 'dashed ' : 'solid ') + ring(u) : 'border-radius: 4px; border: 2px solid ' + (sel ? '#FFFFFF' : u && u.surrendered ? '#A3AEC2' : '#F65157')) + (u && u.downed ? '; opacity: 0.5' : '') + (u && u.surrendered ? '; filter: grayscale(1) brightness(0.75)' : '') + (isCur ? '; box-shadow: 0 0 0 3px #FFFFFF' : '') + (isHeld ? '; opacity: 0' : ''),
        hasBadge: !!(u && !faceOf(u)), badge: u ? u.short : '',
        badgeStyle: 'position: absolute; inset: 6%; z-index: 2; display: grid; place-items: center; box-sizing: border-box; font-size: 11px; font-weight: 700; ' + (u && u.side === 'pc' ? 'border-radius: 50%; border: 2px dashed ' + ring(u) + '; color: ' + ring(u) : 'border-radius: 4px; border: 2px solid ' + (sel ? '#FFFFFF' : '#F65157') + '; color: #F65157') + (isCur ? '; box-shadow: 0 0 0 3px #FFFFFF' : '') + (u && u.downed ? '; opacity: 0.5' : '') + (isHeld ? '; opacity: 0' : ''),
        hasText: ((diff.has(k) && !mapArt) || !!cv) && !u, text: cv ? (ob ? cv.hp + '' : (cv.kind === 'full' ? 'FULL ' : 'HALF ') + cv.hp) : (cb.rubble || []).includes(k) ? 'RUBBLE' : 'ROUGH',
        style: 'position: relative; display: grid; place-items: center; padding: 0; border-radius: 4px; cursor: pointer; background: ' + (k === hv ? 'rgba(255, 255, 255, 0.28)' : route[k] && k !== (cur && cur.pos) ? 'rgba(255, 255, 255, 0.18)' : paint(k, bg)) + '; border: ' + (k === hv ? '2px solid #FFFFFF' : border) + (!vis.tiles.has(k) ? '; box-shadow: inset 0 0 0 46px rgba(5, 7, 11, ' + (cb.map.dark && !litAt(cb, k) ? '0.72' : '0.5') + ')' : cb.map.dark && !litAt(cb, k) ? '; box-shadow: inset 0 0 0 46px rgba(5, 7, 11, 0.25)' : ''),
      });
    }
    for (const t of tiles) if (t.worldNote) t.label += t.worldNote;
    // The strip turns over: the acting unit first, then who comes next (each slides to its new place).
    // An unseen hostile's place in the order is an opaque mark (the engine's fog): a card with nothing on it.
    const ordU = cb.order.map((id) => cb.units.find((u) => u.id === id) || (isUnseenId(id) ? { id, side: 'foe', unseen: true, hp: 1, maxHp: 1 } : null)).filter((u) => u && !u.dead), actId = cur ? cur.id : cb.window?.queue[0]?.unitId ?? cb.order[cb.turn], ci = Math.max(0, ordU.findIndex((u) => u.id === actId));
    const rotU = [...ordU.slice(ci), ...ordU.slice(0, ci)];
    this.flipInit(rotU.map((u) => u.id).join(','));
    const sn = (u) => !u.unseen;
    const initiative = rotU.map((u, idx) => ({ tag: cb.over ? '' : idx === 0 ? 'NOW' : idx === 1 ? 'NEXT' : '', hasTag: !cb.over && idx < 2,
      tagStyle: 'font-size: 9px; font-weight: 700; letter-spacing: 0.16em; color: ' + (idx === 0 ? '#FFFFFF' : '#A3AEC2'),
      ...(() => { const kn = u.side === 'pc' || u.analyzedBy, pct = u.downed ? 0 : kn ? Math.max(0, Math.min(100, u.hp / Math.max(1, u.maxHp) * 100)) : u.hp >= u.maxHp ? 100 : u.hp > u.maxHp / 2 ? 66 : 33;
        return { hpBox: 'position: relative; display: block; width: 64px; height: 4px; border-radius: 2px; overflow: hidden; background: #1C2536' + (kn ? '' : '; outline: 1px dashed rgba(246, 81, 87, 0.45)'),
          hpChip: 'position: absolute; left: 0; top: 0; bottom: 0; width: ' + pct + '%; background: #FFFFFF', hpFill: 'position: absolute; left: 0; top: 0; bottom: 0; width: ' + pct + '%; background: #F65157' + (kn ? '' : '; opacity: 0.6') }; })(),
      // an unseen hostile keeps its face and its initials to itself (the turn card's '?', below; review fix: the bar showed them)
      ...(() => { const sn = !u.unseen, fc = sn ? faceOf(u) : ''; return { zoom: zoomer(this, fc, sn ? u.name : 'Unseen hostile', 'portrait'), hasImg: !!fc, noImg: !fc, img: fc, short: sn ? u.short : '?' }; })(),
      key: u.id, name: sn(u) ? u.name + (u.downed ? ' (down)' : u.surrendered ? ' (surrendered)' : '') : 'Unseen hostile', init: u.init,
      // A click on a portrait shows that unit on the map (the camera goes there); an unseen hostile gives nothing away.
      show: () => { if (!sn(u) || u.dead) return; if (this._overview) this.toggleOverview(u.pos); else CAM.follow([u.pos], 'ask'); },
      showLabel: sn(u) ? 'Show ' + u.name + ' on the map' : 'Unseen hostile: not on the map', cantShow: !sn(u) || !!u.dead,
      showBtn: 'padding: 0; border: 0; background: transparent; font-family: inherit; line-height: 0; border-radius: 6px; cursor: ' + (sn(u) && !u.dead ? 'pointer' : 'default'),
      imgStyle: 'width: 36px; height: 36px; object-fit: cover; ' + (u.side === 'pc' ? 'border-radius: 50%; border: 3px solid ' + ring(u) : 'border-radius: 4px; border: 2px solid ' + (u.surrendered ? '#A3AEC2' : '#F65157')) + (u.surrendered ? '; filter: grayscale(1) brightness(0.75)' : ''),
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
    const apPips = Array.from({ length: maxAp }, (_, i) => ({ key: 'p' + i + (dr && i >= Math.floor(dr.to) && i < Math.ceil(dr.from) ? '-' + dr.seq : ''), cls: dr && i >= Math.floor(dr.to) && i < Math.ceil(dr.from) ? 'phc-pip-drain' : i >= ap - Math.max(0, cost - encoreLend) && i < ap ? 'phc-pip-cost' : '',
      // the AP the picked action will take: still lit, dimmed and pulsing (they were hollow, and read as already spent)
      style: 'height: 14px; border-radius: 4px; ' + (i < ap - Math.max(0, cost - encoreLend) ? 'background: #E7EBF3' : i < ap ? 'background: #E7EBF3; opacity: 0.45' : 'background: #1C2536') }));
    const mv = cur ? cur.movement : 1;
    // The one action list (game/commands.ts): the tabs show it, the turn card's commands and their customise dialog pick from it.
    // Rules 1.14, the perk card in a fight: the Perks tab's shelves (game/perkShelves.ts). pkSince: where in the log this
    // unit's last turn began, so a passive's line can say what it last did.
    const pkSince = cur ? turnMark(cb, cur) : 0;
    const ITEMS = actionGroups(cb, cur, ch, { noNarrator: !!g.sandbox, g, since: pkSince }); // the Proving Ground has no Narrator to rule on anything
    let pkShelfMemo = null; const pkShelves = () => pkShelfMemo || (pkShelfMemo = perkShelves(g, cb, cur, ch, { since: pkSince }));
    const groups = ITEMS.map(([name, items, ink, gid]) => ({ id: gid, ink, name, nameStyle: 'font-size: 11px; letter-spacing: 0.16em; color: ' + (ink === SIGIL_GLOW ? SIGIL_INK : ink || '#A3AEC2'), items: areaOrder(gid, items).map(([id, label, costText, text, why, meta]) => ({
      // A move that can't be used now still opens (its footer says why); its reason is on the button too.
      // Its hover card (game/actionTip.ts): the name and cost, a line per sentence, the weapon's line and traits, the refusal.
      ...tipAttrs({ name: label, cost: costText, ...(meta && meta.parts ? { needs: meta.parts.needs, text: meta.parts.text, line: meta.parts.line, traits: meta.parts.traits } : { text }), why }),
      area: gid === 'attack' ? (meta && meta.hand) || 'other' : '',
      name: label, cost: costText, text: why ? why + ' · ' + text : text, why: why || '', locked: !mineTurn, key: id, pressed: rowSel === id ? 'true' : 'false', pick: () => { const t = cb.units.find((x) => x.id === this.state.target); this.setState({ action: id, target: id === 'stim' || (t && t.side === 'pc') ? null : this.state.target, aim: null, evc: null, sgToast: '', ...(id.startsWith('tq:') || id.startsWith(TPAD) || id === TWATCH ? { tile: null } : {}), ...(id.startsWith(CL) ? { tile: null, target: this.state.target } : {}) }); },
      costStyle: 'font-size: 12px; font-weight: 700; color: #E7EBF3',
      style: 'display: flex; justify-content: space-between; align-items: center; min-height: 40px; padding: 0 12px; border-radius: 8px; font-family: inherit; font-size: 14px; cursor: pointer; ' + (ink ? 'border-left: 3px solid ' + ink + '; ' : '') +
        (why && rowSel !== id ? 'opacity: 0.62; ' : '') + (rowSel === id ? 'border-top: 1px solid ' + (ink || '#E7EBF3') + '; border-right: 1px solid ' + (ink || '#E7EBF3') + '; border-bottom: 1px solid ' + (ink || '#E7EBF3') + '; ' + (ink ? '' : 'border-left: 1px solid #E7EBF3; ') + 'background: #1C2536; color: #E7EBF3' : 'border-top: 1px solid #232D3F; border-right: 1px solid #232D3F; border-bottom: 1px solid #232D3F; ' + (ink ? '' : 'border-left: 1px solid #232D3F; ') + 'background: #10151F; color: #E7EBF3') })) }));
    const actName = { move: 'Move', sprint: 'Sprint', disengage: 'Disengage', analyze: 'Analyze', pickup: 'Pick up',
      draw: 'Draw a glyph', evoke: 'Evoke', scuff: 'Scuff', vent: 'Vent Flux', core: 'Swap core', outburst: 'Outburst', release: 'Release', syphon: 'Syphon', crystallise: 'Crystallise',
      pump: 'Pump', steady: 'Steady the heart', letgo: 'Let it go', feed: 'Feed the glyph', heartwatch: 'Heart Overwatch' }[S.action] || '';
    // The selected action's panel: on the flow, the descriptor's name and cost and the engine's preview in words.
    const sel = { name: isMove ? actName + ' · ' + (hv ? moveAp + ' AP for ' + hvTiles + (hvTiles === 1 ? ' tile' : ' tiles') : '1 AP per ' + mv + ' tiles') : flow ? flow.sel.name : actName,
      text: !mineTurn ? (cb.over ? 'The fight is over.' : cur && cur.side === 'foe' ? cur.name + ' is acting…' : cur ? 'Waiting for ' + (playerOf(owner(cur))?.name || 'a player') + ' (' + cur.name + ').' : '') : isMove ? (MO && MO.why ? MO.why : 'Hover a highlighted tile to see the path and its AP cost; click to move.')
        : flow ? flow.sel.text : S.action === 'analyze' && readSel ? readText : S.action === 'pickup' ? '' : 'Click a hostile to target it.',
      hasPick: false, pickFields: [], extra: flow ? flow.sel.extra : mineTurn && isMove && cur.bank ? cur.bank + ' paid-for tile' + (cur.bank > 1 ? 's' : '') + ' left this turn.' : '' };
    // Rules 1.9: the two reloads, the pick-up checklist and the path's hazards, in words (the costs are the engine's).
    sel.hasPile = false; sel.pileRows = [];
    if (mineTurn) {
      if (isMove && hv) { const ct = crossesText(crossing); if (ct) sel.text = ct + ' Click to walk it anyway, or pick another tile.'; else if (hvRoute && hvTiles > P.dist[hv]) sel.text = 'The path goes around the revealed hazards (' + (hvTiles - P.dist[hv]) + (hvTiles - P.dist[hv] === 1 ? ' tile' : ' tiles') + ' longer). Click to move.'; }
      if (S.action === 'pickup') {
        const rows = pileRows(pickPile, pickUntick), d = pickPile ? dist(cur.pos, pickPile.pos) : 0;
        sel.text = !pickPile ? (piles.size ? 'Nothing on the ground next to you. Click a pile (the stack with a count) to see the way there.' : 'Nothing on the ground in sight.')
          : !pickSel ? 'The pile at ' + refOf(pickPile.pos) + ' is ' + d + ' tiles away: walk next to it first. ' + (crossesText(pickFar && pickFar.crosses) || 'The way there crosses no known hazard.')
          : pickWhy || pickupLabel(pickPile, pickUntick) + ' from ' + (pickPile.pos === cur.pos ? 'your tile' : refOf(pickPile.pos)) + '. Untick what to leave on the ground.';
        if (pickPile) {
          const tile = pickPile.pos, setKeys = (keys) => this.setState({ pickUntick: { tile, keys } });
          sel.hasPile = true; sel.pileHead = 'THE PILE AT ' + refOf(tile) + ' · ' + rows.length + (rows.length === 1 ? ' THING' : ' THINGS') + (pickSel ? '' : ' · OUT OF REACH');
          sel.pileRows = rows.map((r) => ({ ...r, off: !pickSel, icon: pickSel ? r.icon : r.iconOff, toggle: () => setKeys(toggleUntick(pickUntick, r.key)) }));
          sel.pileAll = () => setKeys([]); sel.pileNone = () => setKeys(rows.map((r) => r.key));
        }
      }
    }
    if (isMagic && mineTurn) {
      const names = (ids) => ids.map((id) => cb.units.find((x) => x.id === id)).filter(Boolean).map((x) => x.name + (x.side === 'pc' ? (x.id === cur.id ? ' (you!)' : ' (ally!)') : ''));
      const hits = (ids) => (ids.length ? ' It touches ' + names(ids).join(', ') + '.' : ' Nobody is there.');
      const simpleWhy = flow && !flow.pv.ok ? flow.pv.why : null;
      const VERB = { scuff: 'scuff out the glyphs under you', vent: 'vent ' + mg.flux + ' Flux into the air', core: 'load a fresh core', syphon: 'syphon MP from the air', crystallise: 'crystallise a mana core' };
      if (S.action === 'draw') {
        const dw = word && wordInfo[word], okd = !!(dw && dw.ok);
        sel.name = 'Draw' + (word ? ' ' + word.toUpperCase() : '') + ' · ' + (okd ? dw.cost.ap : glyphApOf(cur)) + ' AP' + (word ? ' · ' + (okd ? dw.cost.charge : SIGIL[word].charge) + ' charge' : '');
        sel.text = !word ? 'You know no Sigil words.' : !okd ? (dw ? dw.why : 'Not now.') : 'Click your own tile (' + refOf(cur.pos) + ') to draw ' + word.toUpperCase() + ': it ' + dw.effectText + '.' + (dw.fades ? ' ' + dw.fades + ' fades (your cap of glyphs on the ground).' : '') + ' ' + (SIGIL[word].text || '');
        // one fact, one place (Leon, live 0.24.0): Charge, Flux and cores are the unit panel's rows; here only what is this draw's
        sel.extra = [okd ? dw.capLeft + ' left before your cap' : '', okd && dw.overload ? 'WARNING: this glyph would OVERLOAD your Evoker.' : ''].filter(Boolean).join(' · ');
      } else if (S.action === 'evoke') {
        const pp = evV ? evV.pattern : hoverPanel;
        sel.name = 'Evoke · ' + (evV ? evV.ap : SPELL_AP.evoke) + ' AP' + (evV && evV.charge ? ' · ' + evV.charge + ' charge' : '');
        sel.text = (S.sgToast ? S.sgToast + ' ' : '') + (!evTile ? ((cb.glyphs || []).length ? 'Click a glyph of a Line to Evoke it. Hover one to read it.' + (pp ? ' ' + pp.text : '') : 'No glyphs on the ground: Draw first.')
          : (evV.facing && evV.stage !== 'stand' ? 'Fires ' + evV.facing + '. ' : '') + evV.hint + (evV.fizzle ? ' ' + evV.fizzleText : ''));
        sel.extra = pp && pp.overload ? pp.overload : '';
      } else if (S.action === 'outburst') {
        const pl = hzPlan, aura = card && card.form === 'aura';
        sel.name = 'Outburst' + (dsel ? ' · ' + dsel.name : '') + (card ? ' · ' + (obMode === 'snap' ? 'Snap ' + card.snapAp + ' AP ×' + STAGE_MULT[0] : 'Begin ' + card.beginAp + ' AP') + ' · ' + card.mp + ' MP' : '');
        sel.text = !dsel ? 'You have no Outburst designs.' : held ? 'You are holding ' + (heldD ? heldD.name : 'an Outburst') + ': Pump it, Release it or Let it go (the HEART panel).' : !card ? 'Not now.' : obMode === 'begin' ? (card.canBegin ? 'Begin ' + dsel.name + ': it holds at stage 0 (×' + STAGE_MULT[0] + '). Pump it (1 AP a stage, to ×' + STAGE_MULT[STAGE_MULT.length - 1] + ') and Release it (1 AP). Confirm to begin.' : card.beginWhy)
          : !S.aim && !aura ? (card.snapWhy || (hz.aim && hz.summary.length ? 'Preview at ' + refOf(hz.aim) + ': ' + hz.summary.join(' ') + ' Click to aim.' : 'Snap: hover to preview, click a tile to aim (' + card.line + ').' + (hz.summary.length ? ' ' + hz.summary.join(' ') : ''))) : pl && pl.ok ? (aura ? 'All around you. ' : 'At ' + refOf(S.aim) + '. ') + (hz.summary.length ? hz.summary.join(' ') : 'Nobody is there.') + ' Confirm to let it go.' : (pl && pl.why) || card.snapWhy || 'Not now.';
        sel.extra = card ? card.line : mg.emanator ? '' : 'No Emanator: Outbursts draw on the air.'; // MP and Strain: the unit panel's
      } else if (S.action === 'release') {
        const pl = hzPlan, aura = hp && hp.form === 'aura';
        sel.name = 'Release' + (heldD ? ' · ' + heldD.name : '') + (hp ? ' · stage ' + hp.stage + ' ×' + hp.mult : '') + ' · ' + (pl ? pl.ap : SPELL_AP.release) + ' AP';
        sel.text = !held ? 'Nothing held.' : !S.aim && !aura ? (hz.aim && hz.summary.length ? 'Preview at ' + refOf(hz.aim) + ': ' + hz.summary.join(' ') + ' Click to aim.' : 'Hover to preview, click a tile to aim' + (hp ? ' (' + hp.shape + ')' : '') + '.' + (hz.summary.length ? ' ' + hz.summary.join(' ') : '')) : pl && pl.ok ? (aura ? 'All around you. ' : 'At ' + refOf(S.aim) + '. ') + (hz.summary.length ? hz.summary.join(' ') : 'Nobody is there.') + ' Confirm to release.' : (pl && pl.why) || 'Not now.';
        sel.extra = hp && hp.rider ? hp.rider : ''; // stage, Strain and MP: the HEART panel and the unit panel say them
      } else if (HEART_ACTS.includes(S.action)) {
        const B = hp ? { pump: hp.pump, steady: hp.steadyBtn, letgo: hp.letgo, feed: hp.feed, heartwatch: hp.watchBtn }[S.action] : null;
        sel.name = actName + (B ? ' · ' + B.cost : '');
        sel.text = !hp ? 'You hold no Outburst: Begin one first.' : B.ok ? B.title + ' Confirm (or use the HEART panel).' : B.why;
        sel.extra = hp && hp.warn ? hp.warn : ''; // the stage and Strain are the HEART panel's (one fact, one place)
      } else {
        sel.text = simpleWhy ? simpleWhy : 'Confirm to ' + VERB[S.action] + '.';
        sel.extra = S.action === 'syphon' || S.action === 'crystallise' ? '' : S.action === 'scuff' ? ((glyphAt[cur.pos] || []).length ? 'Under you: ' + glyphAt[cur.pos].map(glyphName).join(', ') + '.' : 'No glyphs under you.') : ''; // the air: the forecast; MP, Charge, Flux: the unit panel
      }
    }
    if (pkE && mineTurn) {
      // The panel's words are the flow's; the form says what it still needs, and the class move's standing state.
      if (pkMissing && flow && flow.d.available) sel.text = pkMissing;
      sel.extra = (pkE.engine ? 'Engine runs it.' : 'The engine runs its numbers; the Narrator rules the rest after the fight.') + (pkState(pkE).why ? ' ' + pkState(pkE).why : '');
      // each single choice previewed as the engine would take it (the descriptor's form pick, once the target is picked)
      const whyOpt = flow && pkP && pkP.fields.length === 1 && !pkP.build && (pkE.target === 'none' || (pkE.target === 'tile' ? !!S.tile : !!flow.picks.targetId)) ? (id) => { const r = flow.peekWith({ form: { choice: id } }); return r && !r.ok ? r.why || 'Not now.' : ''; } : null;
      Object.assign(sel, pickerVals(this, cb, pkP, pkV, whyOpt));
    }
    // A read-only Perks row (rules 1.14: RIDES AN ACTION and ALWAYS ON): its whole card to read, and no Confirm.
    const pkiE = isPerkInfo(S.action) && mineTurn ? (() => { const sh = pkShelves(); return [...sh.rides, ...sh.always].find((r) => PKI + r.key === S.action) || null; })() : null;
    if (pkiE) { sel.name = pkiE.name + ' · ' + SHELF_LABEL[pkiE.shelf]; sel.text = pkiE.detail; sel.extra = 'Nothing to confirm: this one is here to read.'; }
    // A technique (rules 1.12): its name and cost, what to pick next, then the engine's preview in words: each roll's
    // odds and damage, its notes, Momentum now → after, each unit's Pressure and state, any save and its TN.
    // A Call: its name, cost and reach; what to pick next; then the engine's preview: its notes, the save and its TN.
    if (tpadOpen) {
      const n = tpadOpen.kind === 'watch' ? 'Hold a shot' : 'Techniques · ' + ((blocks.find((b) => b.hand === tpadOpen.hand) || {}).name || '');
      sel.name = n; sel.text = 'Pick one in the pad (arrow keys move, Enter picks), then its target on the map.'; sel.extra = '';
    }
    sel.toggles = tgls.map((t) => ({ key: t.id, label: t.label + (t.on ? ' ✓' : ''), pressed: t.on ? 'true' : 'false', title: (t.preview || t.label) + (t.why ? ' · ' + t.why : ''), off: !!t.why,
      pick: () => { const m = new Set(this.state.mods || []); if (t.on) { m.delete(t.id); if (t.defaultOn) m.add('!' + t.id); } else { m.add(t.id); m.delete('!' + t.id); } this.setState({ mods: [...m] }); },
      style: 'min-height: 30px; padding: 0 10px; border-radius: 999px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; ' + (t.on ? 'border: 1px solid #FFFFFF; background: #1C2536; color: #FFFFFF' : 'border: 1px solid #2E3A50; background: transparent; color: #A3AEC2') + (t.why ? '; opacity: 0.45' : '') }));
    // A technique whose weapon has two of the properties it reads: the player picks which line applies (args.line).
    // what the technique's text lets you choose beyond the property line (Called Shot's part, Run Through's weapon left in…)
    // The flow's option steps as chips (Order's things, a technique's line and its options): the engine's choices.
    if (flow && flow.chips.length) sel.toggles = [...sel.toggles, ...flow.chips.map((c) => ({ key: c.key, label: c.label + (c.on ? ' ✓' : ''), pressed: c.on ? 'true' : 'false', title: c.title, off: c.off,
      pick: () => { if (!c.off) this.setState(c.pick); },
      style: 'min-height: 30px; padding: 0 10px; border-radius: 999px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; ' + (c.on ? 'border: 1px solid #FFFFFF; background: #1C2536; color: #FFFFFF' : 'border: 1px solid #2E3A50; background: transparent; color: #A3AEC2') + (c.off ? '; opacity: 0.45' : '') }))];
    sel.hasToggles = sel.toggles.length > 0;
    // The target's face exactly as its token draws it (an art library name resolved, never the raw id: a raw id was a
    // broken image on a black square), else its initials in the token's red frame.
    const target = tgtUnit ? { zoom: zoomer(this, faceOf(tgtUnit), tgtUnit.name, 'portrait'), name: tgtUnit.name, img: faceOf(tgtUnit), hasImg: !!faceOf(tgtUnit), noImg: !faceOf(tgtUnit), short: tgtUnit.short || tgtUnit.name.slice(0, 2).toUpperCase(),
      badgeStyle: 'display: grid; place-items: center; flex: none; width: 40px; height: 50px; box-sizing: border-box; border-radius: 6px; font-size: 13px; font-weight: 700; ' + (tgtUnit.side === 'pc' ? 'border: 2px dashed ' + ring(tgtUnit) + '; color: ' + ring(tgtUnit) + '; background: #10151F' : 'border: 2px solid #F65157; color: #F65157; background: #2A0F14'),
      known: !!tgtUnit.analyzedBy, hpFill: 'width: ' + Math.round(tgtUnit.hp / tgtUnit.maxHp * 100) + '%; height: 100%; background: #F65157',
      line: tgtUnit.analyzedBy ? 'HP ' + tgtUnit.hp + ' / ' + tgtUnit.maxHp + ' · Defense ' + tgtUnit.def + ' · Armour ' + tgtUnit.armour + (effectsOf(tgtUnit).length ? ' · ' + effectsOf(tgtUnit).map((f) => f[0]).join(', ') : '')
        : 'Looks ' + condWord(tgtUnit) + ' · ' + (tgtUnit.tier || 'hostile') + ' · Analyze to see its HP and status',
      odds: pv ? (pv.ok ? 'Hit ' + pv.pct + '% · need ' + pv.need + ' (you roll d20 ' + fmt(pv.toHit) + ')' + (pv.rangePenalty ? ' · range ' + pv.rangePenalty : '') + (pv.cover ? ' · behind half cover −5' : '') : pv.why) : 'Pick an attack to see the odds',
      // Dice stay transparent: every to-hit term by name, and the damage chain (before the target's armour).
      breakdown: pv && pv.ok ? hitBreakdown(pv) : '' } : null;
    const curOwner = cur ? playerOf(owner(cur)) : null;
    /** A unit's magic in a line: Evoker, heart, shield, conditions. */
    const magicLine = (u) => { const m = u.mg, cs = condChips(u, g); let t = '';
      if (m && m.evoker) t += ' · Flux ' + m.flux + '/' + FLUX_MAX + ' · Charge ' + m.charge;
      if (m && m.emanator) t += ' · MP ' + Math.round(m.mp) + '/' + m.mpMax;
      const hh = m ? heldOutburstOf(m) : null;
      if (hh && (hh.strain || hh.held)) t += ' · Strain ' + hh.strain + '/' + hh.limit;
      if (hh && hh.held) t += ' · Holding ' + hh.held.name + ' (stage ' + hh.held.stage + ')';
      return t + (cs.length && (u.side === 'pc' || u.analyzedBy) ? ' · ' + cs.map((c) => c.k).join(' · ') : ''); };
    const who = cur ? { name: cur.name, img: faceOf(cur) || IMG['wick-welcome'], title: cb.over ? 'The fight is over' : cur.side === 'foe' ? cur.name + ' acts' : mineTurn ? 'Your turn: ' + cur.name : cur.name + '\'s turn' + (curOwner ? ' (' + curOwner.name + ')' : ''),
      line: 'HP ' + cur.hp + ' / ' + cur.maxHp + ' · AP ' + cur.ap + (w && w.magazine ? ' · Ammo ' + cur.ammo + '/' + w.magazine : '') + (cur.heat ? ' · Heat ' + cur.heat : '') + (cur.jammed ? ' · JAMMED' : '') + (ch ? ' · Stims ' + ch.stims : '') + magicLine(cur),
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
    const mePanel = myU && mc ? { name: myU.name, img: faceOf(myU) || IMG['wick-welcome'], zoom: zoomer(this, faceOf(myU), myU.name, 'portrait'), hasCls: !!meCls, clsIcon: meCls ? meCls.icon : '', clsName: meCls ? meCls.name.toUpperCase() : '', clsStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.12em; color: ' + (meCls ? meCls.ink : '#A3AEC2'),
      hp: myU.hp + ' / ' + myU.maxHp, hpFill: abar(myU.hp / myU.maxHp * 100, '#F65157'), hpChip: abar(myU.hp / myU.maxHp * 100, '#FFFFFF'),
      // Everything you spend, below the HP bar (game/resources.ts): ammo, Heat, Evoker charge, cores, Flux, MP, Strain, the
      // held Outburst, class resources, companions. The line under HP keeps AP, Movement, Stims and Echo.
      // one fact, one place (Leon, live 0.24.0): with the HEART panel up (the Outbursts tab, an Outburst held) Strain and the
      // held Outburst are the panel's; the unit panel doesn't repeat them
      res: null, // ownRes() below, once the tab is settled
      line: 'AP ' + Math.round(myU.ap * 10) / 10 + ' · Movement ' + myU.movement + ' · Stims ' + mc.stims,
      // Echo has its own row under HP, as on the story sheet (UI pass 4.1): the diamonds, the count, and (?) for what it is.
      echo: { ...echoView(mc.echo), open: !!S.echoOpen, expanded: S.echoOpen ? 'true' : 'false', glyph: S.echoOpen ? '×' : '?', toggle: () => this.setState({ echoOpen: !this.state.echoOpen }) },
      // The one-line summary that stands in for the card on short windows (the bar at the top of the column); the most
      // urgent resources sit in their own row under it (me.res.urgent).
      miniLine: 'AP ' + Math.round(myU.ap * 10) / 10 + (effectsOf(myU, true).length || condChips(myU, g).length ? ' · ' + [...effectsOf(myU, true).map(([k]) => k), ...condChips(myU, g).map((c) => c.k)].join(' · ') : ''),
      fx: [...effectsOf(myU, true).map(([k, t]) => ({ key: k, k, t, style: FX_CHIP })), ...ownConds(myU, g), ...physChips(physOf(g, cb, myU, 'pc'), refOf, FX_CHIP)], noFx: !effectsOf(myU, true).length && !ownConds(myU, g).length && !physChips(physOf(g, cb, myU, 'pc'), refOf, FX_CHIP).length, fig: bodyFigure({ injuries: myU.injuries || [], mainSide: myU.hand || 'right' }) } : null;
    const allyRows = cb.units.filter((u) => u.side === 'pc' && (!myU || u.id !== myU.id)).map((u, i) => { const p = playerOf(owner(u)), fx = [...effectsOf(u), ...condChips(u, g).map((c) => [c.k]), ...(u.mg && u.mg.held ? [['HOLDING · STAGE ' + u.mg.held.stage]] : [])];
      return { key: u.id, name: u.name, img: faceOf(u), hasImg: !!faceOf(u), short: u.short, player: p ? p.name : '', hp: u.dead ? 'DEAD' : u.hp + ' / ' + u.maxHp, hpFill: abar(u.hp / u.maxHp * 100, '#F65157'), hpChip: abar(u.hp / u.maxHp * 100, '#FFFFFF'),
        fx: fx.map((f) => f[0]).join(' · '), hasFx: fx.length > 0, t: tokenVals(u, { ally: true, player: p ? p.initials + ' · ' + p.name.toUpperCase() : '', color: p ? p.color : '#7FD4FF', inFight: true, right: false, up: false }),
        imgStyle: 'width: 34px; height: 34px; border-radius: 50%; object-fit: cover; background: #000; flex: none; border: 2px solid ' + (p ? p.color : '#7FD4FF') + (u.downed || u.dead ? '; opacity: 0.5' : '') }; });
    const squad = true;
    const say = { can: !!myU && !cb.over, value: S.say || '', onChange: (e) => this.setState({ say: e.target.value }),
      send: () => { const text = (this.state.say || '').trim(); if (!text || !myU) return; act({ type: 'combat/say', charId: myU.charId, text }); this.setState({ say: '' }); } };
    say.submit = (e) => { if (e && e.preventDefault) e.preventDefault(); say.send(); }; // the Say button, or Enter in the box
    // Rules 1.14: an attempt (words that want something to happen) costs 1 AP, once a turn, on your own turn, and the
    // Narrator answers at once; the fight waits for it. Say stays free. The reason it can't be used is the engine's.
    const fr = cb.ruling || null, frWho = fr ? cb.units.find((u) => u.id === fr.unit) : null, hostMe = getState().role === 'host';
    { const mineNow = !!myU && mineTurn && cur && myU.id === cur.id;
      const no = !myU ? '' : fr ? 'The Narrator is deciding.' : (mineTurn && typeof performance !== 'undefined' && turnsBusyUntil() > performance.now()) ? 'The other turns are still playing out.' : !mineNow ? 'Only on your own turn.' : attemptWhy(g, cb, myU, ATTEMPT_AP) || '';
      say.attemptOff = !!no; say.attemptLabel = 'Attempt · ' + ATTEMPT_AP + ' AP';
      say.attemptTitle = no || 'Words that want something to happen: talk an enemy down, call a bluff, shout a warning, try something the action list doesn\'t have. Costs ' + ATTEMPT_AP + ' AP, once a turn. The Narrator answers at once and the fight waits for the answer.';
      say.attemptStyle = 'flex: none; min-height: 36px; padding: 0 12px; border-radius: 8px; font-family: inherit; font-weight: 700; ' + (no ? 'border: 1px solid #2E3A50; background: transparent; color: #A3AEC2; cursor: not-allowed' : 'border: 1px solid #FFFFFF; background: #FFFFFF; color: #0A0D13; cursor: pointer');
      say.why = no && !fr && (S.say || '').trim() ? '✕ Attempt: ' + no : '';
      say.attempt = () => { const text = (this.state.say || '').trim(); if (!text || !myU || no) return; act({ type: 'combat/attempt', unitId: myU.id, text }); this.setState({ say: '' }); }; }
    const talk = fr && !cb.over ? fightTalkVals(this, g, cb, fr, frWho, hostMe, act) : { show: false, gm: { show: false } };
    // The magic pads under the action list: the glyph keyboard (Draw) and your Outburst designs.
    const padBtn = (on, ink) => 'flex: 1; min-height: 36px; border-radius: 8px; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; ' + (on ? 'border: 1px solid ' + ink + '; background: #1C2536; color: #E7EBF3' : 'border: 1px solid #232D3F; background: #10151F; color: #A3AEC2');
    const pad = {
      words: isMagic && mineTurn && S.action === 'draw' && words.length > 0,
      wordList: S.action === 'draw' ? words.map((wd) => { const wi = wordInfo[wd] || { ok: false, why: '', sub: '', hint: '', title: wd }, on = wd === word, def = SIGIL[wd] || {}, wm = WM[wd];
        const why = wi.ok ? '' : wi.why || (mineTurn ? 'Not now.' : 'Not your turn.'), hint = wi.ok ? '' : wi.hint || shortWhy(why);
        // Two short lines under the word: the cost, then what it does (starts, extends…) or why it can't be drawn.
        const sub = wi.sub || (def.charge ?? '?') + ' ch' + (hint ? ' · ' + hint : ''), cut = sub.lastIndexOf(' · ');
        return { key: wd, word: wd.toUpperCase(), icon: glyphUri(wd, wi.ok ? SIGIL_INK : '#7F8BA1', { glow: on && wi.ok }), sub, subA: cut < 0 ? sub : sub.slice(0, cut), subB: cut < 0 ? '' : sub.slice(cut + 3), pressed: on ? 'true' : 'false',
          title: wi.title + (wm ? ' · ' + wm.text : ''), off: !wi.ok,
          ...tipAttrs({ name: (def.word || wd.toUpperCase()), cost: [wordClassName(wd), 'charge ' + (def.charge ?? '?'), ...(wi.ok && wi.cost ? [wi.cost.ap + ' AP', '+' + wi.cost.flux + ' Flux'] : [])],
            text: (wi.ok && wi.effectText ? wi.effectText.charAt(0).toUpperCase() + wi.effectText.slice(1) + '. ' : '') + (def.text || ''),
            notes: [...(wi.ok && wi.fades ? [{ label: 'Fades', text: wi.fades + ' (your cap)' }] : []), ...(wi.ok && wi.overload ? [{ label: 'Warning', text: 'this overloads your Evoker' }] : []), ...(wm ? [{ label: 'Mastery', text: wm.text }] : [])],
            why: wi.ok ? null : why }), disabled: wi.ok ? 'false' : 'true', onKey: (e) => this.wordKey(e),
          hasUses: !!wm, uses: wm ? String(wm.uses) : '', hasStar: !!(wm && wm.hasStar), star: wm ? wm.star : '', starAlt: wm ? wm.starAlt : '',
          aria: (def.word || wd.toUpperCase()) + ', ' + (wordClassName(wd) || 'word') + ', ' + (wi.ok ? wi.sub : 'can\'t draw now: ' + why) + (wm ? '; ' + wm.text : ''),
          subStyle: 'font-size: 10px; font-weight: 600; line-height: 1.2; color: ' + (wi.ok ? '#C9D3E3' : '#A3AEC2'),
          pick: () => this.setState({ word: wd }),
          style: 'display: grid; grid-template-columns: 22px minmax(0, 1fr); column-gap: 6px; row-gap: 1px; align-items: center; justify-items: start; min-width: 0; padding: 4px 6px; border-radius: 8px; font-family: inherit; text-align: left; cursor: pointer; color: ' + (wi.ok ? '#E7EBF3' : '#A3AEC2') + '; '
            + (on ? 'border: 1px solid ' + SIGIL_GLOW + '; background: #13303A; box-shadow: 0 0 8px rgba(79, 200, 223, 0.45)' : wi.ok ? 'border: 1px solid #1F4A55; background: #0D1119' : 'border: 1px dashed #2A3A48; background: #0B0F16') + (wi.ok ? '' : '; opacity: 0.8') }; }) : [],
      designs: isMagic && mineTurn && S.action === 'outburst' && designs.length > 0 && !mg?.held, // holding: the HEART panel runs it
      designList: S.action === 'outburst' && mg ? cards.map((d) => { const on = dsel && d.id === dsel.id;
        return { key: d.id, name: d.name, pressed: on ? 'true' : 'false', pick: () => this.setState({ design: d.id, aim: null }), icon: d.icon, line: d.line, school: d.schools, title: d.title, ...tipAttrs({ name: d.name, cost: d.costText, text: d.title, why: d.canBegin ? null : d.beginWhy }),
          stats: d.costText, hasWhy: !d.canBegin, why: d.beginWhy, lineStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.04em; color: ' + d.ink,
          style: 'display: grid; grid-template-columns: 30px minmax(0, 1fr); gap: 2px 8px; align-items: center; padding: 8px 10px; border-radius: 8px; font-family: inherit; text-align: left; cursor: pointer; color: #E7EBF3; '
            + (on ? 'border: 1px solid ' + d.ink + '; background: #221A38; box-shadow: 0 0 10px rgba(174, 155, 255, 0.35)' : 'border: 1px solid #3A2E5C; background: #120E1E') + (d.canBegin ? '' : '; opacity: 0.7') }; }) : [],
      begin: () => { if (card && card.canBegin) { const a = sendDescriptor(g, cur.id, 'outburst', { design: card.id, mode: 'begin', ...(S.mods && S.mods.length ? { mods: S.mods } : {}) }, me); if (a) act(a); this.setState({ aim: null, obMode: 'begin', action: 'pump' }); } },
      snap: () => this.setState({ obMode: 'snap', aim: null }),
      beginLabel: 'Begin' + (card ? ' ' + card.name : '') + ' · ' + (card ? card.beginAp : 2) + ' AP', snapLabel: 'Snap · ' + (card ? card.snapAp : 3) + ' AP ×' + STAGE_MULT[0],
      beginTitle: card ? (card.canBegin ? 'Begin ' + card.name + ' and hold it at stage 0 (+1 Strain).' : card.beginWhy) : '', snapTitle: 'Begin and Release at once, at ×' + STAGE_MULT[0] + ': hover to preview, click a tile to aim, then Confirm.',
      beginOff: !card || !card.canBegin, beginStyle: padBtn(obMode === 'begin', SOUL_INK), snapStyle: padBtn(obMode === 'snap', SOUL_INK), snapPressed: obMode === 'snap' ? 'true' : 'false',
      repick: isMagic && mineTurn && S.action === 'evoke' && !!evTile, repickFn: () => this.setState({ glyphTile: null, aim: null, evc: null, sgToast: '' }),
      ...sigilPad(evV, S, (x) => this.setState(x)),
    };
    // The keyboard in Sigil 1.4 word groups (Elements … Filter), one labelled row each; empty groups are left out.
    pad.wordRows = wordRows(pad.wordList, (w) => w.key).map((r) => ({ key: r.key, label: r.label.toUpperCase(), aria: r.label + ' words', words: r.items }));
    // Rules 1.10: the stroke picker for the word picked (extends FIRE·SEEK / junction / new Line), the engine's default on.
    const sbs = strokeButtons(dwSel);
    pad.hasStrokes = sbs.length > 0; sel.hasStrokes = isMagic && mineTurn && S.action === 'draw' && sbs.length > 0;
    pad.strokeNote = dwSel && dwSel.ok && dwSel.effectText ? 'This glyph ' + dwSel.effectText + '.' : dwSel && !dwSel.ok && sbs.length ? dwSel.why || '' : '';
    pad.hasStrokeNote = !!pad.strokeNote;
    pad.strokeBtns = sbs.map((b) => ({ key: b.key, label: (b.on ? '✓ ' : '') + b.label, title: b.title, pressed: b.on ? 'true' : 'false', off: !b.ok,
      pick: () => this.setState({ stroke: b.key }),
      style: 'min-height: 24px; padding: 0 8px; border-radius: 6px; font-family: inherit; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; cursor: pointer; '
        + (b.on ? 'border: 1px solid ' + SIGIL_GLOW + '; background: #13303A; color: #E7EBF3; box-shadow: 0 0 6px rgba(79, 200, 223, 0.4)' : b.ok ? 'border: 1px solid #1F4A55; background: transparent; color: #8BDEEE' : 'border: 1px dashed #2A3A48; background: transparent; color: #A3AEC2') }));
    sel.strokeBtns = pad.strokeBtns;
    // The HEART panel at the top of the Outbursts tab while holding: its buttons run the moves at once (Release picks the aim).
    if (encoreLend > 0) { sel.name += ' · FREE · ENCORE'; sel.extra = ((sel.extra || '') + ' Encore: this repeat is lent ' + encoreLend + ' AP.').trim(); }
    else if (encoreWaiting) sel.extra = ((sel.extra || '') + ' Encore: ' + encoreWords(encoreWaiting.key) + ' is free once (' + encoreWaiting.ap + ' AP lent)' + (encoreWaiting.started ? ' this turn.' : '.')).trim();
    const heartV = heartVals(hp, (id) => { if (id === 'release') return this.pickAction('release'); this.heartAct(id); },
      { open: !!S.feelOpen, query: S.feelQ || '', toggle: () => this.setState({ feelOpen: !S.feelOpen }), search: (e) => this.setState({ feelQ: e && e.target ? e.target.value : String(e || '') }) });
    if (heartV.show) heartV.btns = heartV.btns.map((x) => ({ ...x, pressed: S.action === x.key ? 'true' : 'false' }));
    const won = cb.over === 'win', extracted = cb.over === 'extracted';
    this._ids = new Set(ITEMS.flatMap((gr) => gr[1].map((x) => x[0])));
    const bM = blocks.find((b) => b.hand === 'main'), bO = blocks.find((b) => b.hand === 'off');
    this._attackKeys = blocks.length ? [bM && bM.plain ? techAction('main', bM.plain.id) : null, bM ? padAction('main') : null, bO && bO.plain ? techAction('off', bO.plain.id) : null, bO ? padAction('off') : null, this._ids.has(TWATCH) ? TWATCH : null] : null;
    // ---------- the turn panel: your actions (YOUR TURN), or a compact card for whoever is acting ----------
    const hasTarget = !!target && ([...ATTACKS, 'shove', 'analyze', 'paired'].includes(S.action) || (S.action === 'skill' && skFx.op === 'multi_shot') || !!(tFlow && tFlow.picks.targetId));
    // A technique's target card reads the technique's own roll (its to-hit and terms), not a plain attack's.
    if (target && tFlow && tFlow.picks.targetId) { const a0 = (tFlow.pv.rolls || []).find((a) => a.unit === tFlow.picks.targetId); if (a0 && a0.pv) { target.odds = a0.pv.ok ? 'Hit ' + a0.pv.pct + '% · need ' + a0.pv.need + ' (you roll d20 ' + fmt(a0.pv.toHit) + ')' + (a0.pv.rangePenalty ? ' · range ' + a0.pv.rangePenalty : '') + (a0.pv.cover ? ' · behind half cover −5' : '') : a0.pv.why; target.breakdown = a0.pv.ok ? hitBreakdown(a0.pv) : ''; } else if (!tFlow.pv.ok) { target.odds = tFlow.pv.why || 'Not now'; target.breakdown = ''; } }
    const tp = this.pres('tgt', hasTarget ? { ...target, id: tgtUnit.id } : null);
    const pw = this.pres('padW', pad.words ? pad : null), pd = this.pres('padD', pad.designs ? pad : null);
    // The technique pad (a weapon's Techniques, or Hold a shot): opens inside its row, as the glyph keyboard does; one at
    // a time. A chip picks the technique and closes the pad to the selected card; a greyed chip still says why.
    const padTV = padView(blocks, tpadOpen, null), CHIP = (c) => 'display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 1px 6px; align-items: baseline; min-height: 44px; padding: 5px 8px; border-radius: 8px; text-align: left; font-family: inherit; cursor: ' + (c.ok && !c.reaction ? 'pointer' : 'default') + '; '
      + (c.reaction ? 'border: 1px dotted ' + (c.ok ? '#7F8BA1' : '#2E3A50') + '; background: transparent; color: ' + (c.ok ? '#C9D3E3' : '#7F8BA1') : c.ok ? 'border: 1px solid #3B475D; background: #10151F; color: #E7EBF3' : 'border: 1px dashed #2E3A50; background: transparent; color: #7F8BA1');
    const pt = this.pres('padT', padTV ? { ...padTV, groups: padTV.groups.map((gr) => ({ ...gr, chips: gr.chips.map((c) => ({ ...c, style: CHIP(c), disabled: c.ok ? 'false' : 'true', hasWhy: !c.ok, hasLine: !!c.line, hasMark: !!c.mark, hasRounds: !!c.rounds,
      reaction: c.reaction ? 'true' : 'false', aria: c.name + ', ' + (c.reaction ? 'a reaction' : c.apText) + (c.rounds ? ', ' + c.rounds : '') + (c.ok ? '' : ', not now: ' + c.why.replace(/\.$/, '')) + (c.markTitle ? '. ' + c.markTitle : ''), onKey: glyphKeyNav,
      pick: () => { if (c.reaction) return toast(c.name + ' is a reaction: it happens by itself. ' + (c.why || c.help)); if (!c.ok) return toast(c.why); sfx('toggle'); this.setState({ action: c.action, tile: null, target: needsAlly(c.id) ? null : this.state.target }); this.revealAction(); } })) })) } : null);
    // On the flow, Confirm is the engine's verdict (the descriptor's preview, through the reducer); else the system's own.
    const cantConfirm = !mineTurn || (flow ? !flow.ready : !(S.action === 'analyze' && readSel)); // the flow's verdict (the engine's); reading a glyph has its own
    const costNet = Math.max(0, cost - encoreLend);
    const apNow = mineTurn ? (ap - costNet < 0 ? 'needs ' + costNet + ' · ' + ap + ' left' : Math.round((ap - costNet) * 10) / 10 + ' / ' + ap + ' after this') : ap + ' AP';
    const seenCur = !!cur, unseenNow = !cur && !cb.over && isUnseenId(cb.window?.queue[0]?.unitId ?? cb.order[cb.turn]), curInk = cb.over ? (won ? '#6FEA77' : extracted ? '#A3AEC2' : '#F65157') : cur ? ring(cur) : '#A3AEC2';
    const wait = { kicker: cb.over ? (won ? 'VICTORY' : extracted ? 'EXTRACTED' : 'DEFEAT') : unseenNow ? 'HOSTILES ACTING' : !cur ? 'WAITING' : cur.side === 'foe' ? 'HOSTILES ACTING' : 'WAITING FOR ' + String(curOwner ? curOwner.name : 'a player').toUpperCase(),
      name: cb.over ? cb.name : unseenNow ? 'Unseen hostile' : !cur ? '' : seenCur ? cur.name : 'Unseen hostile', line: cb.over ? 'The fight is over.' : unseenNow ? 'Something moves out of sight' : !cur ? '' : cur.side === 'foe' ? (seenCur ? 'Round ' + cb.round + ' · it moves' : 'Something moves out of sight') : 'Round ' + cb.round + ' · ' + (cur.downed ? 'Downed' : cur.ap + ' AP') + (curOwner && curOwner.id !== me ? ' · their move' : ''),
      hasImg: !!(cur && seenCur && faceOf(cur)) && !cb.over, img: cur && seenCur ? faceOf(cur) : '', noImg: !(cur && seenCur && faceOf(cur)) || !!cb.over, short: cb.over ? (won ? '✓' : '✕') : cur && seenCur ? cur.short : '?',
      kickerStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.18em; color: ' + curInk,
      imgStyle: 'width: 48px; height: 48px; object-fit: cover; background: #000; flex: none; ' + (cur && cur.side === 'pc' ? 'border-radius: 50%; border: 3px solid ' + curInk : 'border-radius: 6px; border: 2px solid ' + curInk),
      badgeStyle: 'display: grid; place-items: center; width: 48px; height: 48px; flex: none; font-size: 14px; font-weight: 700; border-radius: ' + (cur && cur.side === 'pc' ? '50%' : '6px') + '; border: 2px dashed ' + curInk + '; color: ' + curInk,
      style: 'display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px; background: #10151F; border: 1px solid #232D3F; border-left: 4px solid ' + curInk };
    // A player who left (or dropped) mid-fight: the host passes their unit's turn so the fight doesn't stall.
    wait.skip = !cb.over && !!cur && getState().role === 'host' && !!curOwner && curOwner.id !== me && curOwner.online === false;
    wait.skipLabel = 'Pass ' + (curOwner ? curOwner.name : 'their') + '’s turn';
    wait.doSkip = () => { if (cur) act({ type: 'combat/end-turn', unitId: cur.id }); };
    // ---------- the action tabs (Move · Attack · Utility · Sigils · Outbursts): one family at a time, each scrolling on its
    // own inside the pinned column, so the grid (and every effect on it) stays in view whatever you pick ----------
    const tabOf = {}; groups.forEach((gr) => gr.items.forEach((a) => { tabOf[a.key] = gr.id; }));
    if (rowSel !== S.action && tabOf[rowSel]) tabOf[S.action] = tabOf[rowSel]; // a technique picked from a pad lives in its row's tab
    // The Attack tab in areas (Leon, live 0.23.0): each weapon's own actions under its header (its shots and techniques,
    // its reload, its unjam, attacking an object with it), main hand, then off hand, then Both (what uses both hands,
    // Reload both among them), then what belongs to no one weapon. The area is the descriptor's `hand`, never a name.
    // An area's header (on its first row): the weapon's icon and name, and its meter; a 1 px line between areas.
    const headOf = {}, sepOf = {};
    { const atk = groups.find((gr) => gr.id === 'attack'), byHand = {}; blocks.forEach((b) => { byHand[b.hand] = b; });
      const areas = atk ? [...new Set(atk.items.map((a) => a.area))] : [];
      if (areas.some((h) => h !== 'other') && (areas.length > 1 || blocks.length)) areas.forEach((h, i) => {
        const first = atk.items.find((a) => a.area === h), b = byHand[h];
        if (i > 0) sepOf[first.key] = true;
        headOf[first.key] = h === 'other' ? areaHead('other', 'OTHER') : h === 'both' ? areaHead('both', 'BOTH', b) : b ? areaHead(h, (blocks.filter((x) => x.hand !== 'both').length > 1 ? (h === 'main' ? 'MAIN HAND · ' : 'OFF HAND · ') : '') + b.name.toUpperCase(), b) : areaHead(h, h === 'main' ? 'MAIN HAND' : 'OFF HAND');
      }); }
    const tabIds = groups.map((gr) => gr.id);
    if (mineTurn && newTurn) { // a new turn of yours: the tab this character used last, else Attack with a hostile in sight, else Move
      const seenHostile = foes.some((u) => !u.downed);
      // Holding an Outburst (rules 1.5): the turn opens on the heart (the swell has just landed; Pump or Release).
      S.tab = cur.mg && cur.mg.held && tabIds.includes('outbursts') ? 'outbursts' : tabMem(cur.charId) || (seenHostile && tabIds.includes('attack') ? 'attack' : 'move');
      this._tabAction = S.action; this._tabShown = S.tab; this._tabCls = '';
    }
    // The tab follows the action: picked on the turn card, or implied by a tile click (a hostile → Attack).
    if (S.action !== this._tabAction) { this._tabAction = S.action; if (tabOf[S.action]) S.tab = tabOf[S.action]; if (mineTurn) this.revealAction(); }
    if (!tabIds.includes(S.tab)) S.tab = tabOf[S.action] || tabIds[0];
    if (mineTurn) tabMem(cur.charId, S.tab);
    // Your resource rows, once the tab is settled (one fact, one place; Leon, live 0.24.0): with the HEART panel up (the
    // Outbursts tab, an Outburst held) Strain and the held Outburst are the panel's; on the Attack tab a jammed gun's
    // JAMMED is on its own area header, so its ammo row there doesn't repeat it (every other tab: the row says it).
    if (mePanel) {
      const jamHead = new Set(S.tab === 'attack' ? Object.values(headOf).filter((h) => h && h.jammed).map((h) => h.hand) : []);
      mePanel.res = resView(resourcesOf(myU, mc, g).filter((r) => !(S.tab === 'outbursts' && myU.mg && myU.mg.held && (r.key === 'strain' || r.key === 'held')))
        .map((r) => (r.warn === 'JAMMED' && jamHead.has(r.key === 'off' ? 'off' : 'main') ? { ...r, warn: undefined, level: undefined } : r)));
    }
    this._tabs = tabIds; this._tabOf = tabOf;
    // The two-key codes: each tab's actions in the order shown (the read-only perk rows have none).
    this._tabItems = groups.map((gr) => gr.items.filter((x) => !isPerkInfo(x.key)).map((x) => x.key));
    // Past the ninth row a 0 turns the page by nine (12 Nov 2026: two guns put the off hand and Both there): 201 is the
    // tenth row of tab 2, 209 the eighteenth, 2001 the nineteenth.
    { const codeOf = {}; this._tabItems.forEach((ks, ti) => ks.forEach((k, ki) => { if (ti < 9) codeOf[k] = String(ti + 1) + '0'.repeat(Math.floor(ki / 9)) + ((ki % 9) + 1); })); this._codeOf = codeOf; }
    if (S.tab !== this._tabShown) { // flipping: the new tab's actions slide in from the side it sits on
      this._tabCls = this._tabShown == null ? '' : tabIds.indexOf(S.tab) > tabIds.indexOf(this._tabShown) ? 'phc-slide-in-right' : 'phc-slide-in-left'; this._tabShown = S.tab;
    }
    const klass = classOf(ch);
    const tabs = groups.map((gr, i) => {
      const on = gr.id === S.tab, ink = gr.id === 'class' && klass ? klass.ink : TAB_INK[gr.id] || '#E7EBF3', holds = !on && tabOf[S.action] === gr.id;
      // The number is usable actions only: the Perks tab's read-only rows (pki:, used from another action's chip or
      // automatic) are counted apart, so "PERKS 3" never means three Confirms.
      const n = gr.items.filter((a) => !isPerkInfo(a.key)).length, rd = gr.items.length - n, acts = n + (n === 1 ? ' action' : ' actions') + (rd ? ', ' + rd + ' to read' : '');
      return { key: gr.id, id: 'phc-tab-' + gr.id, name: TAB_NAME[gr.id] || gr.name, icon: gr.id === 'class' && klass ? klass.icon : '', count: n, num: i < 9 ? String(i + 1) : '', selected: on ? 'true' : 'false', tabindex: on ? '0' : '-1',
        label: (TAB_NAME[gr.id] || gr.name) + ', ' + acts + (holds ? ', holds your chosen action' : ''), keys: i < 9 ? String(i + 1) : undefined,
        title: gr.name + ' · ' + acts + (i < 9 ? ' · key ' + (i + 1) : ''),
        pick: () => this.setTab(gr.id), onKey: (e) => this.tabKey(e), holds,
        // Each tab wears its family's ink: full when open, a faint underline when not (with the word, never colour alone).
        style: 'position: relative; flex: 1 0 auto; min-width: 0; max-width: 100%; box-sizing: border-box; display: flex; align-items: center; justify-content: center; gap: 4px; min-height: 36px; padding: 0 9px; border: 0; border-bottom: 2px solid ' + (on ? ink : ink + '55') + '; border-radius: 8px 8px 0 0; background: ' + (on ? '#1C2536' : 'transparent') + '; color: ' + (on ? ink : '#A3AEC2') + '; font-family: inherit; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; white-space: nowrap; cursor: pointer',
        countStyle: 'flex: none; min-width: 15px; padding: 0 4px; border-radius: 999px; font-size: 9.5px; line-height: 15px; letter-spacing: 0; text-align: center; ' + (on ? 'background: ' + ink + '; color: #0A0D13' : 'background: #1C2536; color: #C9D3E3'),
        numStyle: 'position: absolute; left: 4px; top: 2px; font-size: 9px; font-weight: 600; letter-spacing: 0; color: ' + (on ? '#A3AEC2' : '#5D6A80'),
        holdStyle: 'position: absolute; right: 4px; top: 4px; width: 6px; height: 6px; border-radius: 50%; background: #FFFFFF' };
    });
    // The Calls tab's rows are chips (as the technique pad's): the Call, its AP and reach, the text of the step the
    // speaker has, its save and TN; greyed with the engine's reason when it can't be made now.
    const callRow = (a) => { const c = a.key.startsWith(CL) ? cChips.find((x) => x.action === a.key) : null; if (!c) return { isCall: false, notCall: true, call: null };
      const on = a.pressed === 'true';
      return { isCall: true, notCall: false, call: { ...c, hasIcon: !!c.icon, hasWhy: !c.ok, hasSave: !!c.save, disabled: c.ok ? 'false' : 'true', meta: c.apText + ' · ' + c.reach, to: 'TO ' + c.aimWord.toUpperCase() + ' · ' + c.skillName.toUpperCase() + ' · ' + c.stepText,
        aria: c.name + ', ' + c.apText + ', within ' + c.reach + ', to ' + c.aimWord + (c.ok ? '' : ', not now: ' + c.why.replace(/\.$/, '')),
        style: 'display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 2px 8px; align-items: baseline; min-height: 44px; padding: 7px 10px; border-radius: 8px; text-align: left; font-family: inherit; cursor: pointer; '
          + (on ? 'border: 1px solid #FFFFFF; background: #1C2536; color: #E7EBF3' : c.ok ? 'border: 1px solid #3B475D; background: #10151F; color: #E7EBF3' : 'border: 1px dashed #2E3A50; background: transparent; color: #7F8BA1') } }; };
    const tabG = groups.find((gr) => gr.id === S.tab) || groups[0];
    const tabPanel = tabG ? [{ key: 'tp-' + tabG.id, tab: 'phc-tab-' + tabG.id, name: tabG.name, nameStyle: tabG.nameStyle, cls: 'phc-cb-tabpanel', innerCls: this._tabCls,
      heart: tabG.id === 'outbursts' && !!heartV.show, hv: heartV,
      // Faith 2.2 (spec 2.4): the FAITH tab's header, your patron's portrait beside the Devotion meter.
      ...(tabG.id === 'faith' ? (() => { const fh = faithHeadVals(this, g, cur, zoomer); return { faith: fh.show, fh }; })() : { faith: false, fh: {} }),
      // Rules 1.14, the perk card in a fight: three shelves. USE NOW is the buttons below; the other two are lists to read.
      ...(tabG.id === 'perks' ? perkShelfVals(pkShelves(), tabG.items, rowSel) : { hasUse: false, useLabel: '', useHelp: '', shelves: [] }),
      items: tabG.items.filter((a) => !isPerkInfo(a.key)).filter((a) => !(tabG.id === 'outbursts' && heartV.show && ['pump', 'release', 'steady', 'letgo', 'feed', 'heartwatch'].includes(a.key))).map((a) => ({ ...a, ...callRow(a), code: this._codeOf[a.key] || '', hasCode: !!this._codeOf[a.key], padT: pt.show && !!pt.val && a.key === pt.val.key, head: headOf[a.key] || null, hasHead: !!headOf[a.key], hasSep: !!sepOf[a.key], padW: a.key === 'draw' && pw.show, padE: a.key === 'evoke' && !!pad.repick, padD: a.key === 'outburst' && pd.show })) }] : [];
    // Leon (8 Nov 2026): the whole action panel greys out until it is really your turn: someone else's turn, or the
    // enemies' moves still playing on screen after the engine has handed the turn back (Say stays usable).
    const holdUntil = mineTurn && typeof performance !== 'undefined' ? turnsBusyUntil() : 0, holding = holdUntil > performance.now();
    if (holding && !this._holdTimer) this._holdTimer = setTimeout(() => { this._holdTimer = null; if (LIVE === this) this.setState({}); }, Math.ceil(holdUntil - performance.now()) + 30);
    const lock = cb.over ? '' : holding ? 'held' : !mineTurn || fr ? 'wait' : ''; // rules 1.14: the panel is locked while the Narrator decides
    const lockMsg = fr && lock === 'wait' ? 'The Narrator is deciding…' : lock === 'held' ? 'The other turns are still playing out…' : lock === 'wait' ? (cur && cur.side === 'foe' ? 'Hostiles acting…' : cur ? 'Waiting for ' + cur.name + '…' : 'Waiting…') : '';
    const vowV = vowPromptVals(this, g, cb, cur, mineTurn, act); this._vow = vowV.show ? vowV : null;
    // The backpack (rules 1.9, World Play: Gear in a fight): hands, light armour, the pack and the unit's ammo, each row
    // with its action and the engine's cost (game/backpack.ts); greyed with the engine's reason off-turn or AP short.
    const canPack = !!myU && !!myU.charId && !myU.companion && !cb.over;
    const bpV = canPack && S.bp ? backpackView(g, cb, myU, !!(mineTurn && cur && myU.id === cur.id), holding ? lockMsg : '') : null;
    // The Backpack button sits in your unit card beside your name (Leon, 9 Nov 2026: one labelled button there, none by
    // the AP bar); on short windows, where the card folds into the one-line bar, the bar carries it. Lit while open.
    const bpBtn = (h) => 'display: inline-flex; align-items: center; gap: 6px; flex: none; min-height: ' + h + 'px; padding: 0 10px 0 8px; border-radius: 7px; border: 1px solid ' + (S.bp ? '#FFFFFF' : '#3A4760') + '; background: ' + (S.bp ? '#1C2536' : 'transparent') + '; color: #FFFFFF; font-family: inherit; font-size: 12px; font-weight: 700; letter-spacing: 0.06em; white-space: nowrap; cursor: pointer';
    const bp = { can: canPack, open: () => this.setState({ bp: !S.bp }), pressed: S.bp ? 'true' : 'false', btnStyle: bpBtn(28) + '; margin-left: auto', miniStyle: bpBtn(26),
      title: (S.bp ? 'Close your backpack' : 'Open your backpack: draw, put away, drop, light armour') + ' (key B)',
      show: !!bpV, who: bpV ? bpV.who.toUpperCase() : '', apText: bpV ? bpV.ap + ' AP' : '', reason: bpV ? bpV.reason : '', hasReason: !!(bpV && bpV.reason), close: () => this.setState({ bp: false }),
      sections: bpV ? bpV.sections.map((sc) => ({ key: sc.key, title: sc.title, isEmpty: !sc.rows.length, empty: sc.empty,
        rows: sc.rows.map((r) => ({ key: r.key, tag: r.tag, name: r.name, sub: r.sub, hasSub: !!r.sub, note: r.note, hasNote: !!r.note, hasActs: r.acts.length > 0,
          // the item's icon (weapons, armour, shields), muted when none of its actions can run now
          icon: gearIconUri(r.item, r.acts.length && r.acts.every((a) => a.off) ? GEAR_INK_OFF : GEAR_INK), hasIcon: hasGearIcon(r.item),
          acts: r.acts.map((a) => ({ key: a.key, text: a.label + (a.cost ? ' · ' + a.cost : ''), off: a.off, why: a.why || a.label + (a.cost ? ' · ' + a.cost : ''),
            go: () => { if (!a.off && a.action) act(a.action); },
            style: 'min-height: 30px; padding: 0 10px; border-radius: 6px; font-family: inherit; font-size: 12px; font-weight: 700; white-space: nowrap; ' + (a.off ? 'border: 1px solid #232D3F; background: transparent; color: #5B6577; cursor: default' : 'border: 1px solid #FFFFFF; background: transparent; color: #FFFFFF; cursor: pointer') })) })) })) : [] };
    const T = {
      tabs, tabPanel, showWho: !mePanel, lock, lockMsg, vow: vowV, bp,
      mine: mineTurn, waiting: !mineTurn, wait, ytInk: curInk, ytSub: 'ROUND ' + cb.round + ' · ' + ap + ' AP',
      ytStyle: 'position: relative; overflow: hidden; display: flex; align-items: center; gap: 12px; margin: 0 6px; padding: 9px 18px; background: #FFFFFF; color: #0A0D13; box-shadow: -6px 0 0 ' + curInk + ', 0 6px 18px rgba(0, 0, 0, 0.45)',
      who, zoomPc: zoomer(this, who.img, who.name, 'portrait'), apText: apNow, apPips, groups, sel, pad,
      padTCls: 'phc-a-rise' + pt.cls, padT: pt.val || { groups: [] }, padWShow: pw.show, padWCls: 'phc-a-rise' + pw.cls, padW: pw.val || {}, padDShow: pd.show, padDCls: 'phc-a-rise' + pd.cls, padD: pd.val || {},
      tgtList: tp.show ? [{ ...tp.val, key: 'tgt-' + tp.val.id, cls: 'phc-a-right' + tp.cls }] : [],
      cantConfirm, noConfirm: isPerkInfo(S.action), confirmText: S.action === 'draw' && isMagic ? 'Click a tile to draw' : S.action === 'pickup' && pickPile && pickSel ? pickupLabel(pickPile, pickUntick) : 'Confirm', confirmSfx: isMagic ? 'none' : undefined,
      confirm: () => this.confirm(), endTurn: () => act({ type: 'combat/end-turn', unitId: cur.id }), notMine: !mineTurn,
    };
    // The grid fits the room beside the pinned column (fitGrid measures; it runs again on resize and when the map changes).
    const zoom = this._zoom || 1, fitKey = cb.map.w + 'x' + cb.map.h;
    // The camera: whose turn the screen shows, where this player's unit is, and the small map's picture; it binds to
    // the page after the render.
    { const mineU = (cur && cur.side === 'pc' && owner(cur) === me && !cur.dead ? cur : null) || cb.units.find((u) => u.side === 'pc' && owner(u) === me && !u.dead) || cb.units.find((u) => u.side === 'pc' && !u.dead);
      CAM.myTurn = !!mineTurn; CAM.home = mineU ? mineU.pos : null; CAM.overview = !!this._overview;
      const shown = cb.units.filter((u) => !u.dead), nPc = shown.filter((u) => u.side === 'pc').length, nFoe = shown.length - nPc;
      this._mini = { solid: cb.map.solid || [], full: Object.keys(covers).filter((k) => covers[k].kind === 'full'), half: Object.keys(covers).filter((k) => covers[k].kind !== 'full'),
        dots: shown.map((u) => ({ key: u.pos, color: ring(u), me: !!mineU && u.id === mineU.id, square: u.side !== 'pc' })),
        label: nPc + (nPc === 1 ? ' squad member' : ' squad members') + ', ' + nFoe + (nFoe === 1 ? ' hostile' : ' hostiles') + ' in sight' };
      if (typeof requestAnimationFrame !== 'undefined' && !this._camRaf) this._camRaf = requestAnimationFrame(() => { this._camRaf = 0; if (LIVE === this) this.camSync(); }); }
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
      gridLeave: () => { if (this.state.hover != null) this.setState({ hover: null }); }, // the stroke tip and lit stroke go with the cursor
      // isolation: the map is one stacking layer, so nothing in it (a hovered tile, a chip, a token's card) rises above the
      // small map, the camera's arrows or any panel; inside it the axis labels are on top (GRID_LAYER).
      gridStyle: 'display: grid; isolation: isolate; grid-template-columns: 18px repeat(' + cb.map.w + ', 46px); grid-template-rows: 18px repeat(' + cb.map.h + ', 46px); gap: 2px; width: max-content; padding: 8px; border-radius: 12px; background: #05070B; border: 1px solid #232D3F' + (zoom !== 1 ? '; zoom: ' + zoom : '') + (this._camNeeded && !this._overview && !CAM.miniHidden ? '; margin-right: ' + Math.round(MINI_SLACK / zoom) + 'px' : ''),
      // The map's window (the camera): the grid scrolls inside it when it is bigger.
      camStyle: 'flex: none; max-width: ' + (this._view ? this._view.w + 'px' : '100%') + (this._view ? '; max-height: ' + this._view.h + 'px' : ''),
      camLabel: 'The map. Drag it, or use the arrow keys or W A S D, to look around; Home goes back to your unit; M shows the whole map.',
      // The Proving Ground's tools tab sits on the right edge: keep the action column clear of it.
      rowStyle: 'flex: 1 1 auto; min-height: 0; display: flex; padding: 0 ' + (g.sandbox ? 60 : 24) + 'px 12px 24px' + (lay.swap ? '; flex-direction: row-reverse' : ''), lay,
      // Room around the grid inside its scrolling column (top and right) for the hover chips over edge tiles.
      mz: this.zoomVals(),
      // A big Manual size never pushes the action zone below its minimum: the map scrolls inside its zone instead.
      leftStyle: (hidden || LAYOUT.width ? '' : 'max-width: calc(100% - ' + (ASIDE_MIN + 12) + 'px); ') + 'flex: ' + (hidden ? '1 1 auto' : '0 1 ' + (LAYOUT.width ? clampWidth(LAYOUT.width, 99999) : ((this._view ? this._view.col || this._view.w : Math.ceil((48 * Math.min(cb.map.w, REF_W) + 36) * zoom)) + 34)) + 'px') + '; min-width: 0; min-height: 0; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; overflow-x: hidden; padding: 14px 34px 0 0',
      // On your turn the turn box takes the room under the Say row (its tab panel is what shrinks); the You card above
      // it is capped (CSS .phc-mine) and scrolls on its own, so the Say row, YOUR TURN and Confirm never scroll away.
      // With a panel moved into the action column (the forecast, the legend or the log) the turn box keeps a floor of
      // 320 px on your turn (YOUR TURN, AP and the tabs about 130, a usable tab panel, the footer about 113), so the extra
      // gives up its room first (it scrolls inside) and the footer never spills under it; the tab panel still scrolls.
      turnBoxStyle: 'position: relative; display: flex; flex-direction: column; min-height: ' + (lay.sideExtras && mineTurn ? '320px' : '0') + '; flex: ' + (mineTurn ? '1 1 0px' : '0 0 auto'),
      panelOpen: !hidden, panelHidden: hidden, togglePanel: () => this.togglePanel(), asideCls: mineTurn ? 'phc-mine' : '', mini, quick,
      canCustomise: !!myU && !cb.over, customise: () => openCustomise(myU && myU.charId),
      pad, magicLegend, hasMagicLegend: magicLegend.length > 0, bp,
      worldLegend: WLc.legend, hasWorldLegend: WLc.legend.length > 0,
      ...(() => { // Search a cache in the fight (1 AP of the turn, adjacent): a button for each one next to the acting unit.
        const list = !mineTurn || !cur ? [] : objectsOf(cb).filter((o) => o.kind !== 'pile' && !o.hidden && !o.searched && (o.itemCount ?? (o.items || []).length) > 0 && (o.kind === 'cache' || o.itemCount != null || (o.items || []).length) && dist(cur.pos, o.pos) <= 1);
        const cs = list.map((o) => { const n = o.itemCount ?? (o.items || []).length, why = o.searched || !n ? 'empty' : o.locked ? 'locked' : cur.ap < 1 ? 'needs 1 AP' : '';
          return { key: o.id, label: 'Search ' + o.name + ' · 1 AP', sub: why || 'holds ' + n + (n === 1 ? ' thing' : ' things'), off: !!why, go: () => { if (!why) act({ type: 'combat/search', unitId: cur.id, objId: o.id }); } }; });
        return { cbSearch: cs, hasCbSearch: cs.length > 0 }; })(),
      // The mana forecast (game/manaForecast.ts): the air as weather, in its own movable panel (it left the header).
      fc: forecastVals(cb, !!S.fcOpen, () => this.setState({ fcOpen: !this.state.fcOpen }), lay.manaDrop),
      confirmSfx: isMagic ? 'none' : undefined, confirmText: T.confirmText,
      // The header's right cluster (UI pass, screens/shell.js): room, Save, ⚙, ⚑, Leave.
      ...shellVals(this, 'combat'),
      roundText: 'ROUND ' + cb.round + ' · ' + cb.map.name.toUpperCase() + ' · ' + cb.name.toUpperCase(),
      turnChip: cb.over ? (won ? 'VICTORY' : extracted ? 'EXTRACTED' : 'DEFEAT') : mineTurn ? 'YOUR TURN' : cur && cur.side === 'foe' ? 'HOSTILES ACTING' : 'WAITING', turnChipStyle: 'padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; border: 1px solid ' + (mineTurn ? '#FFFFFF' : '#232D3F') + '; color: ' + (mineTurn ? '#FFFFFF' : '#A3AEC2'),
      initiative, tiles, apPips, apText: apNow, groups, sel, hasTarget, squad, say, talk, me: mePanel, hasMe: !!mePanel, allyRows, hasAllies: allyRows.length > 0, target: target || {},
      // The whole fight (the last 120 lines), newest first: the box is a reversed column, so it rests on the newest line
      // and scrolls up into the fight's history (Leon, 11 Nov 2026: it showed six lines and no way back).
      // …and only the lines written before the effect now playing: the log keeps step with what is on screen.
      log: [...(() => { const upTo = fxShownLog(g), lines = upTo == null ? cb.log : cb.log.slice(0, Math.max(0, upTo)); return lines.slice(-120).map((text, i, all) => { const pl = patronLogCard(text); return { key: lines.length - all.length + i, text, isPlain: !pl, isPatron: !!pl, pl: pl || {} }; }); })(),
        // Rules 1.9 (item 695): what the loot cap held back, for the host's eyes only (the engine strips lootLog from
        // everyone else's view).
        ...(me === g.hostId && cb.lootLog && cb.lootLog.length ? [{ key: 'lootlog', text: lootLogLine(cb.lootLog), isPlain: true, isPatron: false, pl: {} }] : [])].reverse(),
      cantConfirm, noConfirm: T.noConfirm, confirm: T.confirm, endTurn: () => act({ type: 'combat/end-turn', unitId: cur.id }), notMine: !mineTurn,
      toStory: () => go('main'), report: openReport, over: !!cb.over, overColor: won ? '#6FEA77' : extracted ? '#A3AEC2' : '#F65157', overKicker: won ? 'VICTORY' : extracted ? 'EXTRACTED' : 'DEFEAT',
      overTitle: cb.name, overText: (cb.summary || '') + (g.sandbox ? '' : ' The Narrator picks up the story.') + (me === g.hostId && cb.lootLog && cb.lootLog.length ? ' ' + lootLogLine(cb.lootLog) : ''),
    };
  }

  tileClick(k) {
    // In the overview a click on a tile goes back to the camera, centred there; it never acts.
    if (this._overview) { this.toggleOverview(k); return; }
    const S = this.state, g = getState().game, cb = castFight(g, g.combat, ART), cur = active(cb);
    if (MAGIC.includes(S.action) && cur && cur.mg) return this.magicClick(k, cur);
    const u = cb.units.find((x) => x.pos === k && !x.dead);
    // A perk action that wants a target or a tile takes the click (an ally, anyone, or the tile itself).
    // Its own target first; then a picker's grid field (a second tile, another unit); else the click re-aims the target.
    if (this._vow && this._vow.click(u)) return;
    // A perk's form takes a grid click for its own fields (a second tile, another unit) once the move's target is picked.
    if (this._pk && this._pk.P && cur && (this._pk.target || this._pk.e.target === 'none' || (this._pk.e.target === 'tile' && S.tile))) {
      const p = this._pk, other = !!u && u.id !== cur.id, nv = gridPick(p.P, p.V, other ? { id: u.id, side: u.side } : null, k);
      if (nv) return this.setState({ pkForm: { key: S.action, v: nv } });
    }
    // Rules 1.10: Analyze aimed at a tile holding a hostile glyph or a trace reads it (combat/read).
    if (S.action === 'analyze' && !(u && u.side === 'foe') && this._readHere && this._readHere(k).length) return this.setState({ readTile: k, target: null });
    // The flow (game/actionFlow.ts): the click is the descriptor's next pick (a unit, a tile), if it is one of its choices.
    if (this._flow && cur) { const patch = this._flow.click(u ? { id: u.id, side: u.side } : null, k); if (patch) return this.setState(patch); }
    // With a pad open, a foe clicked is the target the technique will take (the pad stays open).
    if (padOf(S.action) && u && u.side === 'foe') return this.setState({ target: u.id });
    if (u && u.side === 'foe') { const a = [...ATTACK_MODES, 'shove', 'analyze', 'skill', 'paired'].includes(S.action) ? S.action : plainAction(cur); this.setState({ target: u.id, readTile: null, action: a, ...this.tabFor(a) }); return; }
    if (S.action === 'pickup') { this.setState({ tile: k }); return; } // a pile out of reach: its way there is shown
    if (objectsOf(cb).some((o) => o.pos === k && o.hp > 0) && isAttackMode(S.action)) { this.setState({ action: 'cover', tile: k, ...this.tabFor('cover') }); return; }
    if (!['move', 'sprint', 'disengage'].includes(S.action) || !cur) return;
    // A move's tile is its descriptor's one pick, sent at once (the engine builds the action and its switches).
    const mv = sendDescriptor(g, cur.id, S.action, { tile: k, ...(S.mods && S.mods.length ? { mods: S.mods } : {}) }, getState().me.id);
    if (mv) act(mv);
    this.setState({ hover: null });
  }

  /** A held heart's move (rules 1.5): Pump, Steady, Let go, Feed, Heart Overwatch on or off. */
  heartAct(id) {
    const g = getState().game, cb = g?.combat, cur = cb && active(cb); if (!cur || !cur.mg) return;
    // Rules 1.8: a feeling pump ('pump:<feeling>') and Revert Pump. What each sends is the engine's descriptor.
    const [aid, feeling] = id.startsWith('pump:') ? ['pump', id.slice(5)] : [id, null];
    if (aid !== 'heartwatch' && aid !== 'letgo') this.revealHeart(); // what changed, in view
    const a = sendDescriptor(g, cur.id, aid, { ...(feeling ? { feeling } : {}), ...(this.state.mods && this.state.mods.length ? { mods: this.state.mods } : {}) }, getState().me.id);
    if (a) act(a);
    if (aid === 'letgo') this.setState({ action: 'outburst', aim: null, obMode: 'begin' });
  }
  /** A tile click while a spell is chosen: draw there, pick a pattern, or aim. */
  magicClick(k, cur) {
    const S = this.state, m = this._mg || {}, g = getState().game, cb = g.combat;
    if (S.action === 'draw') { if (m.word) { const a = sendDescriptor(g, cur.id, 'draw', { word: m.word, tile: k, ...(m.stroke ? { stroke: m.stroke } : {}) }, getState().me.id); if (a) act(a); if (S.stroke) this.setState({ stroke: null }); } return; }
    if (S.action === 'evoke') {
      const r = evokeClick(m.evTile ? m.evV || null : null, cb, cur, k, S.evc || {});
      if (r.pattern !== undefined) return (m.seenGlyph && m.seenGlyph(r.pattern)) ? this.setState({ glyphTile: r.pattern, evc: {}, sgToast: '' }) : undefined; // only a glyph you can see picks a pattern
      if (r.choice) return this.setState({ evc: r.choice, sgToast: '' });
      return this.setState({ sgToast: r.toast || '' });
    }
    if (S.action === 'outburst') return this.setState({ aim: k, obMode: 'snap' }); // a tile click means a snap at it
    if (S.action === 'release') return this.setState({ aim: k });
  }

  confirm() {
    const cur = active(getState().game.combat), a = this.state.action, S = this.state, m = this._mg || {};
    if (isPerkInfo(a)) return; // a row to read: nothing to run (and never an attack on the picked target)
    // The flow: Confirm sends the engine's action for the picks (null: not ready; the panel says why).
    if (this._flow) {
      const f = this._flow; if (!f.action) return;
      if (HEART_ACTS.includes(a) && a !== 'heartwatch' && a !== 'letgo') this.revealHeart();
      act(f.action);
      // what each panel clears once its action is sent (the Evoke planner, the Outburst's aim; a Begin goes on to Pump)
      const after = a === 'evoke' ? { glyphTile: null, aim: null, evc: null, sgToast: '' } : a === 'outburst' ? { aim: null, obMode: 'begin', ...(S.obMode === 'snap' ? {} : { action: 'pump' }) }
        : a === 'release' ? { aim: null } : a === 'letgo' ? { action: 'outburst', aim: null, obMode: 'begin' } : {};
      return this.setState({ ...f.after, pickUntick: null, ...after });
    }
    // Physical 2.0: a pad row runs nothing (pick a technique first).
    if (padOf(a)) return;
    if (MAGIC.includes(a)) return; // a spell for a unit with no magic is never an attack
    // Rules 1.10: Analyze aimed at a glyph or a trace reads it (its own path: the descriptor's pick is a unit).
    if (a === 'analyze' && S.readTile) { act({ type: 'combat/read', unitId: cur.id, tile: S.readTile }); return this.setState({ readTile: null }); }
  }
}
