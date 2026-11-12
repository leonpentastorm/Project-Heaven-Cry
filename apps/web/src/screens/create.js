// Character creation (EPCCG), ported from design/canvas-build/create.logic.js. Same rules code as the prototype;
// Lock in now validates through the engine, saves the sheet to the player's library and brings it into the room.
import { DCLogic } from '../dc/runtime';
import { D, ART, epccgVals, lightboxVals, zoomer, epBtnStyle, checkMod, ATTR_GIVES as ATTR_NEXT, SLOT_WORD, SLOT_ORDER, perPoint } from './shared';
import { designInfo, toneChips, toneInk, toneName, formIconUri } from '../game/heartView';
import { gearIconUri } from '../game/gearIcons';
import { validateSheet, SHEET_REV, isMusicTrait, roomSheetError, ytId, ytStart, startingMagicError, startingWordsError, KITS, WEAPON, ITEM, startingTechniqueSlots, startingTechniqueChoices, startingTechniquesError, defaultTechniques, phys, migrateWords, STARTING_DEFAULT, moduleSlots, sigilRangeBonus, sigilDurationBonus, soulCostSaving, designCost, MANA_BANDS, SIGILS, SIGIL, SCHOOLS, SCHOOL, MODULES, MODULE, TONE, soulRangeBonus , FEELINGS, deriveCreation, BUDGET as ENGINE_BUDGET, FOG_CORE, SKILL as ENGINE_SKILL } from '@engine';
import { feelingInk, feelingIconSrc, iconStyle } from '../game/feelingsView';
const FEELING_START = ['rage', 'love'];
import { act, getState, go, saveToLibrary, toast } from '../game/store';
import { uploadPortrait } from '../game/charfile';
import { glyphUri, heartUri, SIGIL_INK, SIGIL_GLOW, SOUL_INK } from '../game/glyphs';
import { spellSummary } from '../game/sigilView';
import { sfx, reducedMotion } from '../game/sfx';
import { emblemOf } from '../game/classView';
import { derivedLines, previewCharacter } from '../game/derived';
import { patronCards, BELIEF_TEXT, FAITH_INK } from '../game/faithView';
import { patronPortrait } from '../game/faithArt';

// ---------- card layout (every step) ----------
// A card grid never holds more than --n cards a row (never narrower than --min; one column when the screen is narrower
// still), and every card in it is the same height (--h): a long text scrolls inside its card instead of pushing the
// row, the buttons or the page around.
const CC_CSS = '.phc-cc-grid{display:grid;gap:var(--gap,12px);grid-auto-rows:var(--h,auto);'
  + 'grid-template-columns:repeat(auto-fill,minmax(min(100%,max(var(--min,280px),calc((100% - (var(--n,3) - 1) * var(--gap,12px)) / var(--n,3)))),1fr))}'
  + '.phc-cc-grid>*{box-sizing:border-box;min-width:0;min-height:0;height:100%;overflow:hidden}'
  + '.phc-cc-scroll{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#2E3A50 transparent}'
  + '.phc-cc-scroll::-webkit-scrollbar{width:6px}.phc-cc-scroll::-webkit-scrollbar-thumb{background:#2E3A50;border-radius:3px}'
  + '.phc-cc-clamp2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}'
  + '.phc-cc-art{position:relative;display:block;flex:none;height:100%;padding:0;border:0;border-radius:10px;overflow:hidden;background:#05070B;cursor:zoom-in}'
  + '.phc-cc-art img{display:block;width:100%;height:100%;object-fit:cover;object-position:50% 20%;transition:transform .25s ease}'
  + '.phc-cc-art:hover img,.phc-cc-art:focus-visible img{transform:scale(1.04)}'
  + '.phc-cc-art .phc-cc-zoom{position:absolute;right:6px;bottom:6px;padding:2px 7px;border-radius:999px;background:rgba(10,13,19,.8);border:1px solid #2E3A50;color:#E7EBF3;font:700 11px/1.4 "Chakra Petch",sans-serif;letter-spacing:.08em}'
  + '.phc-rm .phc-cc-art img,.phc-reduce .phc-cc-art img{transition:none}'
  // The points step: three family columns, each attribute a block with its three skills under it (the gate is the
  // layout). Two columns from 1180 px down (Soul spans the row under them), one on a phone.
  + '.phc-pt-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;align-items:start}'
  + '.phc-pt-fam,.phc-pt-attrs{display:flex;flex-direction:column;gap:10px;min-width:0}'
  + '.phc-pt-row{display:flex;align-items:center;gap:8px;min-width:0}'
  + '.phc-pt-name{flex:1 1 0;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
  + '.phc-pt-pips{display:flex;flex:none}'
  + '.phc-pip{display:grid;place-items:center;width:13px;height:24px;padding:0;border:0;background:none;cursor:pointer}'
  + '.phc-pip:hover>span{box-shadow:0 0 0 2px #E7EBF3}'
  + '.phc-pt-stepper{display:flex;flex:none;align-items:center;gap:2px}'
  + '.phc-pt-step{width:30px;height:28px;padding:0;border-radius:7px;border:1px solid #3B475D;background:transparent;color:#E7EBF3;font:700 17px/1 "Chakra Petch",sans-serif;cursor:pointer}'
  + '.phc-pt-step:hover{background:#1C2536}'
  + '.phc-pt-step[aria-disabled="true"]{opacity:.38;cursor:not-allowed}'
  + '.phc-pt-val{width:26px;text-align:center;font-size:19px;font-weight:700;line-height:1}'
  + '.phc-pt-side{flex:none;width:26px;height:26px}'
  + '.phc-pt-step:focus-visible,.phc-pt-btn:focus-visible,.phc-pt-side:focus-visible{outline:2px solid #FFFFFF;outline-offset:2px}'
  + '.phc-pt-line{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;height:30px;font-size:11.5px;line-height:15px;color:#A3AEC2}'
  + '.phc-pt-bar{position:sticky;top:0;z-index:5}'
  + '@media (max-width:1180px){.phc-pt-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.phc-pt-fam:nth-child(3){grid-column:1/-1}.phc-pt-fam:nth-child(3) .phc-pt-attrs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}}'
  + '@media (max-width:700px){.phc-pt-grid{grid-template-columns:minmax(0,1fr)}.phc-pt-fam:nth-child(3) .phc-pt-attrs{display:flex}.phc-pt-pips{display:none}.phc-pt-bar{position:static}.phc-pt-line{height:auto;-webkit-line-clamp:4}}'
  // A phone: a patron's art stacks above their text (side by side, both would be a sliver).
  + '@media (max-width:640px){[data-patron-grid]{--h:640px!important}[data-patron]{flex-direction:column}[data-patron] .phc-cc-art{width:100%!important;height:240px!important}}';
function ensureCcLayout() {
  if (typeof document === 'undefined' || !document.head || document.getElementById('phc-cc-layout')) return;
  const st = document.createElement('style'); st.id = 'phc-cc-layout'; st.textContent = CC_CSS; document.head.appendChild(st);
}

// ---------- the lock-in stamp ----------
// Pressing Lock in slams a big red AHOC seal onto the personnel record where the white one sits, with APPROVED across it,
// then files the record (STAMP_MS later, so the stamp is seen). Reduced motion: it fades in, no shake.
const STAMP_RED = '#D9343B'; // stamp ink (art, not a UI state colour)
/** Slam: the stamp lands at 60% of 300 ms (≈180 ms); the record is filed STAMP_MS after the press. */
export const STAMP_LAND_MS = 180, STAMP_MS = 900, STAMP_MS_REDUCED = 700;
const SEAL_STYLE = 'position: absolute; top: 14px; right: 14px; width: 110px; height: 110px; transform: rotate(-12deg); transition: opacity 120ms linear; opacity: ';
/** The stamp's ink (an SVG filter: a ragged edge and patches where the ink didn't take) and its keyframes, added to the page once. */
function ensureStampKit() {
  if (typeof document === 'undefined' || !document.body || document.getElementById('phc-stamp-kit')) return;
  const seal = ART('emblem-ahoc-seal-lg') || ART('emblem-ahoc-seal');
  const box = document.createElement('div');
  box.id = 'phc-stamp-kit'; box.setAttribute('aria-hidden', 'true'); box.style.cssText = 'position: absolute; width: 0; height: 0; overflow: hidden';
  box.innerHTML = '<svg width="0" height="0" focusable="false"><filter id="phc-stamp-rough" x="-40%" y="-40%" width="180%" height="180%" color-interpolation-filters="sRGB">'
    + '<feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="7" result="grain"/>'
    + '<feDisplacementMap in="SourceGraphic" in2="grain" scale="4" xChannelSelector="R" yChannelSelector="G" result="rough"/>'
    + '<feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" seed="3" result="blot"/>'
    + '<feColorMatrix in="blot" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -5 0 0 0 3.6" result="blotA"/>'
    + '<feTurbulence type="fractalNoise" baseFrequency="1.7" numOctaves="1" seed="11" result="speck"/>'
    + '<feColorMatrix in="speck" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -7 0 0 0 5.5" result="speckA"/>'
    + '<feComposite in="blotA" in2="speckA" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result="holes"/>'
    + '<feComposite in="rough" in2="holes" operator="in"/></filter></svg>'
    + '<style>'
    + '.phc-stamp{position:absolute;top:-70px;right:-34px;width:330px;height:330px;pointer-events:none;z-index:3;transform:rotate(-12deg);filter:url(#phc-stamp-rough);opacity:.94}'
    + '.phc-stamp[data-stamp="slam"]{animation:phc-stamp-slam 300ms both}'
    + '.phc-stamp[data-stamp="fade"]{animation:phc-stamp-fade 260ms ease-out both}'
    + '.phc-stamp-ink{position:absolute;inset:0;background:' + STAMP_RED + ';-webkit-mask:url("' + seal + '") center/contain no-repeat;mask:url("' + seal + '") center/contain no-repeat}'
    + '.phc-stamp-ring{position:absolute;inset:3%;border-radius:50%;border:12px solid ' + STAMP_RED + ';opacity:0}'
    + '.phc-stamp[data-stamp="slam"] .phc-stamp-ring{animation:phc-stamp-ring 560ms ' + (STAMP_LAND_MS - 10) + 'ms cubic-bezier(.1,.7,.3,1) both}'
    + '.phc-stamp-word{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:6px 10px 4px 16px;background:' + STAMP_RED + ';color:#10151F;'
    + 'font:700 40px/1 "Chakra Petch",sans-serif;letter-spacing:.16em;white-space:nowrap;outline:4px solid ' + STAMP_RED + ';outline-offset:5px}'
    + '@keyframes phc-stamp-slam{0%{opacity:0;transform:rotate(-26deg) scale(3.2);animation-timing-function:cubic-bezier(.55,0,1,.55)}'
    + '35%{opacity:.35}60%{opacity:1;transform:rotate(-12deg) scale(.9);animation-timing-function:cubic-bezier(.2,.8,.4,1)}'
    + '78%{transform:rotate(-12deg) scale(1.06)}100%{opacity:.94;transform:rotate(-12deg) scale(1)}}'
    + '@keyframes phc-stamp-fade{from{opacity:0}to{opacity:.94}}'
    + '@keyframes phc-stamp-ring{from{opacity:.8;transform:scale(.94)}to{opacity:0;transform:scale(1.55)}}'
    + '</style>';
  document.body.appendChild(box);
}
/** The thump shakes the page for a moment. */
function shakePage() {
  // The page's parts shake, not its root: the root clips sideways overflow, so the shake never flashes a scrollbar.
  const parts = typeof document !== 'undefined' ? document.querySelectorAll('[data-phc-create] > *') : [];
  for (const el of parts) if (el.animate) el.animate([{ transform: 'translate(0, 0)' }, { transform: 'translate(-8px, 6px)' }, { transform: 'translate(7px, -5px)' }, { transform: 'translate(-4px, 3px)' }, { transform: 'translate(2px, -1px)' }, { transform: 'translate(0, 0)' }],
    { duration: 280, easing: 'ease-out' });
}

const NAMES = ['Ninety-Two', 'Vesper Hale', 'Orrin Kade', '4-Ten', 'Sable Quill', 'Mara Voss', 'Tamsin Rook', 'Ilya Brand', 'Juno Pike', 'Corvin Ash', 'Dez Morrow', 'Kestrel 7'];
const ID_KEYS = ['gender', 'blood', 'hand', 'association', 'song', 'songTitle', 'songArtist', 'dream', 'history'];
const STEPS = [['identity', 'Identity'], ['archetype', 'Archetype'], ['skills', 'Skills'], ['traits', 'Traits'], ['belief', 'Belief'], ['kit', 'Kit'], ['lockin', 'Lock in']];
const CORES = ['body', 'mind', 'soul'];
const ATTR = {}; D.attrs.forEach((a) => { ATTR[a.id] = a; });
const SK = {}; D.skills.forEach((s) => { SK[s.id] = s; });
const ARCH = {}; D.arch.items.forEach((a) => { ARCH[a.id] = a; });
const CLASSNAME = {}; D.classes.forEach((c) => { CLASSNAME[c.id] = c.name; });
const title = (id) => id.charAt(0).toUpperCase() + id.slice(1);
const mod = (p) => (p === 0 ? -2 : p - 1);
const fmt = (m) => (m > 0 ? '+' + m : m < 0 ? '−' + Math.abs(m) : '0');
// Creation budgets, read from the engine: 10 Skill and 10 Attribute points (12 with Mind Without Fog), every attribute
// from 1, none above 7, and a skill never above the attribute it sits under. Body, Mind and Soul are family names only.
const SKILL_PTS = ENGINE_BUDGET.skill, ATTR_PTS = ENGINE_BUDGET.attr, ATTR_CAP = ENGINE_BUDGET.attrCap;
/** Mind Without Fog's extra Attribute points at creation. */
const fogOf = (traits) => ((traits || []).includes('mind_without_fog') ? FOG_CORE : 0);

/** What a set of skill points and hand-raised attributes spends (the engine's count), and the class it leans to. */
function derive(skills, aSet, extra = 0) {
  const d = deriveCreation(skills, aSet || {}, {}, extra), attr = d.attr;
  // Class Roster Revision 3: the class of the highest attribute (every tied one) is the one level 3 offers.
  const totals = D.classes.map((c) => ({ id: c.id, name: c.name, core: c.core, attribute: c.attribute, total: attr[c.attribute] || 1 }));
  const top = Math.max(...totals.map((t) => t.total));
  const leans = d.spent ? totals.filter((t) => t.total === top) : [];
  return { ...d, leans };
}

// ---------- the points step ----------
// Every change to the points goes through these three. Each returns { ok, text, what, skills, aSet }: a change that is
// refused changes nothing and its text says exactly what is short and what to do about it.
const pts = (n, kind) => n + ' ' + kind + ' point' + (n === 1 ? '' : 's');
const listOf = (names) => (names.length <= 1 ? names.join('') : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1]);
const no = (text) => ({ ok: false, text });
const skillsUnder = (attrId) => D.skills.filter((s) => s.attr === attrId).sort((x, y) => SLOT_ORDER[x.slot] - SLOT_ORDER[y.slot]);
/** Set a skill to v points. Raising it past its attribute spends the Attribute points that takes. Lowering it leaves
 *  the attribute where it is (the text says so). */
export function _setSkill(st, id, v, extra = 0) {
  const k = SK[id], at = ATTR[k.attr], d = derive(st.skills, st.aSet, extra), p = st.skills[id] || 0, was = d.attr[k.attr];
  if (v === p) return no('');
  if (v < p) {
    if (v < 0) return no(k.name + ' is at 0 already.');
    const skills = { ...st.skills }; if (v === 0) delete skills[id]; else skills[id] = v;
    const top = Math.max(0, ...skillsUnder(k.attr).map((s) => skills[s.id] || 0));
    return { ok: true, skills, aSet: { ...d.attr }, what: k.name + ' ' + p + ' → ' + v,
      text: k.name + ' ' + v + ': ' + pts(p - v, 'Skill') + ' back.' + (was > 1 && was > top ? ' ' + at.name + ' stays at ' + was + ': lower it too if you want its Attribute points back.' : '') };
  }
  if (v > ATTR_CAP) return no('No attribute above ' + ATTR_CAP + ' at creation, and a skill can\'t pass its attribute: ' + k.name + ' stops at ' + ATTR_CAP + ' for now.');
  const need = v - p, left = SKILL_PTS - d.spent, aNeed = Math.max(0, v - was);
  if (need > left) return no((left <= 0 ? 'No Skill points left' : k.name + ' ' + v + ' takes ' + pts(need, 'Skill') + ' and you have ' + left) + ': lower another skill first.');
  if (aNeed > d.attrLeft) return no(k.name + ' ' + v + ' needs ' + at.name + ' ' + v + '. ' + (d.attrLeft <= 0 ? 'No Attribute points left' : 'That takes ' + pts(aNeed, 'Attribute') + ' and you have ' + d.attrLeft) + ': lower another attribute first.');
  return { ok: true, skills: { ...st.skills, [id]: v }, aSet: { ...d.attr, [k.attr]: Math.max(was, v) }, what: k.name + ' ' + p + ' → ' + v + (aNeed ? ' and ' + at.name + ' ' + was + ' → ' + v : ''),
    text: aNeed ? k.name + ' ' + v + ' needs ' + at.name + ' ' + v + ': ' + pts(aNeed, 'Attribute') + ' spent.' : k.name + ' ' + v + ': ' + pts(need, 'Skill') + ' spent.' };
}
/** Set an attribute to v. It is never lowered below a skill under it: that is refused, with the skill to lower first. */
export function _setAttr(st, id, v, extra = 0) {
  const at = ATTR[id], d = derive(st.skills, st.aSet, extra), cur = d.attr[id];
  if (v === cur) return no('');
  if (v > cur) {
    if (v > ATTR_CAP) return no('No attribute above ' + ATTR_CAP + ' at creation: ' + at.name + ' stops at ' + ATTR_CAP + ' for now.');
    const need = v - cur;
    if (need > d.attrLeft) return no((d.attrLeft <= 0 ? 'No Attribute points left' : at.name + ' ' + v + ' takes ' + pts(need, 'Attribute') + ' and you have ' + d.attrLeft) + ': lower another attribute first.');
    return { ok: true, skills: { ...st.skills }, aSet: { ...d.attr, [id]: v }, what: at.name + ' ' + cur + ' → ' + v,
      text: at.name + ' ' + v + ': ' + pts(need, 'Attribute') + ' spent. ' + listOf(skillsUnder(id).map((s) => s.name)) + ' can now reach ' + v + '.' };
  }
  if (v < 1) return no('Every attribute starts at 1: ' + at.name + ' can\'t go lower.');
  const high = skillsUnder(id).filter((s) => (st.skills[s.id] || 0) > v);
  if (high.length) return no(at.name + ' can\'t drop to ' + v + ' while ' + (high.length === 1 ? high[0].name + ' is ' + st.skills[high[0].id] : listOf(high.map((s) => s.name)) + ' are above ' + v) + ': lower ' + (high.length === 1 ? high[0].name : 'them') + ' first.');
  return { ok: true, skills: { ...st.skills }, aSet: { ...d.attr, [id]: v }, what: at.name + ' ' + cur + ' → ' + v, text: at.name + ' ' + v + ': ' + pts(cur - v, 'Attribute') + ' back.' };
}
/** Reset one attribute: its three skills back to 0 and it back to 1. */
export function _resetAttr(st, id, extra = 0) {
  const at = ATTR[id], d = derive(st.skills, st.aSet, extra), under = skillsUnder(id), sBack = under.reduce((t, s) => t + (st.skills[s.id] || 0), 0), aBack = d.attr[id] - 1;
  if (!sBack && !aBack) return no(at.name + ' is already at 1 with no points in its skills.');
  const skills = { ...st.skills }; under.forEach((s) => { delete skills[s.id]; });
  return { ok: true, skills, aSet: { ...d.attr, [id]: 1 }, what: at.name + ' reset',
    text: at.name + ' reset: ' + [sBack ? pts(sBack, 'Skill') : '', aBack ? pts(aBack, 'Attribute') : ''].filter(Boolean).join(' and ') + ' back.' };
}
/** What still has to be placed before Lock in, in plain words ('' when every point is placed). */
export function _pointsTodo(d) {
  const sLeft = SKILL_PTS - d.spent, out = [];
  const high = D.attrs.filter((a) => d.attr[a.id] > ATTR_CAP);
  if (high.length) out.push(listOf(high.map((a) => a.name + ' is ' + d.attr[a.id])) + ': no attribute above ' + ATTR_CAP + ' at creation, so lower ' + (high.length === 1 ? 'it' : 'them') + '.');
  if (sLeft < 0) out.push(pts(-sLeft, 'Skill') + ' too many: lower a skill.');
  if (d.attrLeft < 0) out.push(pts(-d.attrLeft, 'Attribute') + ' too many: lower an attribute.');
  const place = [sLeft > 0 ? pts(sLeft, 'Skill') : '', d.attrLeft > 0 ? pts(d.attrLeft, 'Attribute') : ''].filter(Boolean);
  if (place.length) out.push('Still to place: ' + place.join(' and ') + '.');
  return out.join(' ');
}
const PERK_AT = [3, 5, 7];
const HIST_MAX = 60;

const btn = (on, color) => 'min-height: 40px; padding: 0 14px; border-radius: 8px; font-family: inherit; font-size: 13px; font-weight: 600; letter-spacing: 0.06em; cursor: pointer; ' +
  (on ? 'border: 1px solid ' + color + '; background: #1C2536; color: ' + color : 'border: 1px solid #232D3F; background: transparent; color: #A3AEC2');
const chip = (color) => 'padding: 4px 10px; border-radius: 999px; border: 1px solid ' + color + '; color: ' + color + '; font-size: 12px; font-weight: 700; letter-spacing: 0.1em';
const dia = (n, filled, color, size) => Array.from({ length: n }, (_, i) => ({ style: 'width: ' + size + 'px; height: ' + size + 'px; transform: rotate(45deg); box-sizing: border-box; ' +
  (i < filled ? 'background: ' + color : 'border: 1px solid #3B475D') }));

/** A portrait's place in the pool by id (the pool's order changes as cards are added). */
/** The portrait shown with an archetype: its own painted card once delivered (pool "player-card"); until then a world
 *  portrait painted for one of its skills, a different one for each archetype. Only a suggestion: the player picks
 *  their portrait on the Identity step. */
const STAND_IN = (() => {
  const used = new Set(), out = {};
  for (const a of D.arch.items) {
    const own = D.portraits.find((p) => p.archetype === a.id); if (own) { out[a.id] = own.img; used.add(own.img); continue; }
    const skills = Object.entries(a.preset).sort((x, y) => y[1] - x[1]).map(([k]) => k.replace(/_/g, '-'));
    const pick = skills.map((k) => D.portraits.find((p) => p.skill === k && !used.has(p.img))).find(Boolean) || D.portraits.find((p) => !used.has(p.img));
    if (pick) { out[a.id] = pick.img; used.add(pick.img); }
  }
  return out;
})();
const cardFor = (arch) => (arch && STAND_IN[arch.id]) || '';
/** The spotlight cut-in's framing for an uploaded portrait (decision 113): the eye line's default, and the preview: the
 *  upload drawn as the strip crops it (zoomed, the eye line on the strip's middle). */
const EYE_DEFAULT = 0.38;
const eyePreviewStyle = (img, y) => {
  const W = 320, H = 64, iw = W * 1.6, ih = iw * 1.25, top = Math.min(0, Math.max(H - ih, H / 2 - y * ih));
  return 'position: relative; width: 100%; max-width: ' + W + 'px; height: ' + H + 'px; border-radius: 4px; border-top: 3px solid #E7EBF3; border-bottom: 3px solid #E7EBF3; background: #10151F url("' + String(img || '').replace(/"/g, '%22') + '") no-repeat; background-size: ' + iw + 'px ' + ih + 'px; background-position: ' + (W / 2 - iw / 2) + 'px ' + top + 'px; overflow: hidden';
};
const pIdx = (id) => Math.max(0, D.portraits.findIndex((p) => p.id === id));

// Starting magic (spec: The Magic panel and learning, rules 1.4): Brain Power 1+ or the Sigil student kit picks 2 Sigil
// words that make a spell, one of them a Reach word (so a new mage can hit past one tile): a Subject and a Reach word.
// Will Power 1+ or the Soul initiate kit makes 1 Outburst design. The engine's defaults are preselected (SPARK · SEEK;
// Damage + Move) so a player who skips this is still legal. The engine decides what's legal (startingWordsError).
/** A draft's starting words under 1.4: kept when legal, else converted the engine's way (a 1.2 Stack's Form becomes
 * SEEK), else the defaults. */
export const _draftSigils = (ws) => { if (!Array.isArray(ws) || !ws.length) return [...DEFAULT_SIGILS]; if (!startingWordsError(ws)) return [...ws]; const m = migrateWords(ws).words; return m.length === 2 && !startingWordsError(m) ? m : [...DEFAULT_SIGILS]; };
const DEFAULT_SIGILS = [...STARTING_DEFAULT], DEFAULT_OB = { name: '', school: 'damage', modules: ['move'], option: '', tone: 'raw' };
/** The starting technique picks for this build: the player's, else the engine's defaults; none in a system the build
 *  has no skill for. */
const techPicksOf = (S) => { const sl = startingTechniqueSlots({ skills: S.skills }), d = defaultTechniques({ skills: S.skills }), t = S.tech || {};
  return { melee: sl.melee ? (Array.isArray(t.melee) ? t.melee : d.melee) : [], ranged: sl.ranged ? (Array.isArray(t.ranged) ? t.ranged : d.ranged) : [] }; };
const canSigilOf = (S) => (S.skills.brain_power || 0) >= 1 || S.kit === 'sigil';
const canSoulOf = (S) => (S.skills.will_power || 0) >= 1 || S.kit === 'soul';
const slotsOf = (S) => moduleSlots({ skills: S.skills });
const WORD_CLASS = [['subject_element', 'ELEMENTS · SUBJECT'], ['subject_affliction', 'AFFLICTIONS · SUBJECT'], ['subject_boon', 'BOONS · SUBJECT'], ['subject_working', 'WORKINGS · SUBJECT'],
  ['reach', 'REACH · ONE OF YOUR TWO'], ['delivery', 'DELIVERY · LEARNED IN PLAY'], ['burst', 'BURST · LEARNED IN PLAY'], ['filter', 'FILTER · LEARNED IN PLAY']];
const isSubject = (w) => SIGIL[w]?.group === 'subject', isReachW = (w) => SIGIL[w]?.group === 'reach';
/** The starting pair in a line: the engine's compiled spell, with this build's range bonus. */
function stackLine(words, skills = {}) {
  const head = words.map((w) => SIGIL[w]?.word || w).join(' + ');
  if (startingWordsError(words)) return head;
  const bonus = sigilRangeBonus({ skills }), dur = sigilDurationBonus({ skills });
  return head + ': ' + spellSummary(words) + (bonus ? ' (+' + bonus + ' range from your skills)' : '') + (dur && words.includes('stay') ? ' (+' + dur + ' rounds)' : '') + '. Draw them in a Line of two tiles, step behind it, Evoke.';
}
// A school's options as the engine stores them (buff to_hit_2 → hit, control push_3 → push, status as they are).
const optId = (o) => o.replace(/^to_/, '').replace(/_\d+$/, '');
const OPT_NAME = { hit: '+2 to hit', defense: '+2 Defense', heal: 'Heal', push: 'Push 3 tiles', pull: 'Pull 3 tiles', pinned: 'Pinned', slowed: 'Slowed', fear: 'Fear', shaken: 'Shaken', confused: 'Confused', left_brain_debuff: 'Left Brain Debuff', right_brain_debuff: 'Right Brain Debuff',
  strike: 'Strike', finish: 'Finish', brand: 'Brand', drain: 'Drain', swap: 'Swap places', silenced: 'Silenced' }; // rules 1.19
const ENGINE_OPT = { damage: 'strike', buff: 'heal', control: 'push', status: 'shaken' }; // what the engine uses when no option is set
const obOf = (S) => { const o = S.ob || DEFAULT_OB, opts = (SCHOOL[o.school]?.options || []).map(optId);
  // A tone (rules 1.5) only at Lore Master 1 (rules 1.8); without it the design is Raw.
  const tone = o.tone && o.tone !== 'raw' && TONE[o.tone] && (S.skills.lore_master || 0) >= 1 ? o.tone : 'raw';
  return { ...o, tone, modules: (o.modules || []).filter((m) => MODULE[m]).slice(0, 1), option: opts.length ? (opts.includes(o.option) ? o.option : ENGINE_OPT[o.school] || opts[0]) : '' }; };

export class CreateLogic extends DCLogic {
  setState(x) { const before = this.state.step; super.setState(x); if (this.state.step !== before) window.scrollTo(0, 0); }
  constructor(props) {
    super(props);
    CreateLogic.current = this; ensureStampKit(); ensureCcLayout();
    const arch = props.sampleArch && ARCH[props.sampleArch] ? props.sampleArch : null;
    this.state = {
      step: props.startStep || 'identity', name: props.sampleName || '', origin: props.sampleName ? 1 : null, portrait: props.sampleName ? pIdx('mpat') : pIdx('mallow-3'),
      fam: 'all', arch: arch || 'bulwark', skills: arch ? { ...ARCH[arch].preset } : {}, aSet: arch ? { ...ARCH[arch].attributes } : {}, applied: arch, hist: [], note: null,
      hover: 'durability', tcat: 'All', traits: props.sampleName ? ['factory_made'] : [], kit: props.sampleName ? 'medic' : null,
      idv: { gender: '', blood: '', hand: 'Right', association: '', song: '', songTitle: '', songArtist: '', dream: '', history: '' },
      sigils: [...DEFAULT_SIGILS], ob: { ...DEFAULT_OB }, tech: { melee: null, ranged: null },
    };
    const d = getState().draft;
    if (d) {
      const oi = D.origins.findIndex((o) => o.name === d.origin), pi = D.portraits.findIndex((p) => p.img === d.portrait);
      Object.assign(this.state, { name: d.name || '', origin: oi >= 0 ? oi : null, portrait: pi >= 0 ? pi : pIdx('mallow-3'), upload: pi < 0 && /^data:image\//.test(d.portrait || '') ? d.portrait : null, portraitEye: typeof d.portraitEye === 'number' ? d.portraitEye : null, skills: { ...(d.skills || {}) }, aSet: { ...(d.attrs || {}) },
        traits: [...(d.traits || [])], kit: d.kit || null, applied: typeof d.archetype === 'string' && ARCH[d.archetype] ? d.archetype : null, step: 'lockin', idv: { ...this.state.idv, ...(d.identity || {}) },
        sigils: _draftSigils(d.sigils), tech: { melee: d.techniques && Array.isArray(d.techniques.melee) ? [...d.techniques.melee] : null, ranged: d.techniques && Array.isArray(d.techniques.ranged) ? [...d.techniques.ranged] : null }, belief: d.belief && (d.belief.kind === 'atheist' || d.belief.patron) ? { ...d.belief } : null,
        ob: d.outburst && SCHOOL[d.outburst.school] ? { name: d.outburst.name || '', school: d.outburst.school, modules: [...(d.outburst.modules || [])], option: d.outburst.option || '', tone: d.outburst.tone || 'raw' } : { ...DEFAULT_OB } });
    }
  }

  renderVals() {
    const S = this.state;
    const set = (patch) => () => this.setState(patch);
    const extra = fogOf(S.traits), attrTotal = ATTR_PTS + extra;
    const der = derive(S.skills, S.aSet, extra);
    const left = SKILL_PTS - der.spent;
    const stepIdx = STEPS.findIndex((s) => s[0] === S.step);

    const steps = STEPS.map(([id, label], i) => ({
      n: i + 1, label, go: set({ step: id }), current: S.step === id ? 'step' : 'false',
      style: 'display: flex; align-items: center; gap: 8px; min-height: 40px; padding: 0 14px 0 8px; border-radius: 10px; font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; ' +
        (S.step === id ? 'border: 1px solid #E7EBF3; background: #1C2536; color: #E7EBF3' : 'border: 1px solid #232D3F; background: transparent; color: #A3AEC2'),
      numStyle: 'display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; font-size: 12px; ' + (S.step === id ? 'background: #E7EBF3; color: #0A0D13' : 'background: #1C2536; color: #A3AEC2'),
    }));

    // identity
    const originCards = D.origins.map((o, i) => ({
      num: String(o.n).padStart(2, '0'), name: o.name, home: o.Home, pick: set({ origin: i }), pressed: S.origin === i ? 'true' : 'false',
      style: 'display: flex; flex-direction: column; align-items: flex-start; gap: 2px; text-align: left; padding: 8px 10px; border-radius: 8px; color: #E7EBF3; font-family: inherit; cursor: pointer; ' +
        (S.origin === i ? 'background: #1C2536; border: 1px solid #E7EBF3' : 'background: #10151F; border: 1px solid #232D3F'),
    }));
    const o = S.origin === null ? null : D.origins[S.origin];
    const origin = o ? { ...o, knows: o['You know'], seen: o[Object.keys(o).find((k) => k.startsWith('People see you as'))] || '', traitsFit: o['Traits that fit'] } : {};
    // The picker is one pool of cards with no names or set labels: a card is who *you* are (Leon).
    const portrait = S.upload ? { img: S.upload, label: '', alt: 'Your portrait (uploaded)' } : { ...D.portraits[S.portrait], label: '', alt: 'Your portrait' };
    const portraitThumbs = D.portraits.map((p, i) => ({ key: p.id, img: p.img, aria: 'Portrait ' + (i + 1), pick: set({ portrait: i, upload: null }), pressed: !S.upload && S.portrait === i ? 'true' : 'false',
      style: 'padding: 0; aspect-ratio: 4 / 5; border-radius: 6px; cursor: pointer; background: #000; ' + (!S.upload && S.portrait === i ? 'border: 2px solid #E7EBF3' : 'border: 2px solid transparent') }));

    // archetype
    const fams = [{ id: 'all', name: 'Show all', blurb: 'Every archetype, all ' + D.arch.items.length + '. Scroll and explore.' }, ...D.arch.families, { id: 'custom', name: 'Custom', blurb: 'Start from zero and place all 10 points yourself.' }];
    const famTabs = fams.map((f) => ({ name: f.name, pick: set({ fam: f.id, arch: f.id === 'custom' ? 'custom' : f.id === 'all' ? (S.arch === 'custom' ? D.arch.items[0].id : S.arch) : (D.arch.items.find((a) => a.family === f.id) || {}).id }), selected: S.fam === f.id ? 'true' : 'false', style: btn(S.fam === f.id, '#E7EBF3') }));
    const famBlurb = (fams.find((f) => f.id === S.fam) || {}).blurb || '';
    // A card's nine attributes: three rows (Body, Mind, Soul), each number in its attribute's ink, the highest marked.
    const ABBR = (n) => n.slice(0, 3).toUpperCase();
    const attrGrid = (attrs) => { const top = Math.max(...D.attrs.map((x) => attrs[x.id] || 1));
      return D.attrs.map((x) => { const v = attrs[x.id] || 1, hi = v === top && top > 1;
        return { key: x.id, abbr: ABBR(x.name), val: v, top: hi ? 'true' : 'false', title: x.name + ' ' + v + (hi ? ' (highest)' : ''),
          style: 'display: flex; justify-content: space-between; align-items: baseline; gap: 5px; padding: 1px 6px; border-radius: 5px; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; line-height: 16px; box-sizing: border-box; '
            + (hi ? 'background: ' + x.ink + '; color: #0A0D13; border: 1px solid ' + x.ink : v > 1 ? 'color: ' + x.ink + '; border: 1px solid ' + x.ink + '66' : 'color: #7F8BA1; border: 1px solid #232D3F') }; }); };
    const BLANK_ATTRS = {};
    const leadsOf = (arch) => arch.leans.map((l) => CLASSNAME[l]).join(' or ');
    const archCards = S.fam === 'custom'
      ? [{ name: 'Custom', role: 'Your call', blurb: 'No preset. Every one of the 10 points is yours to place.', grid: attrGrid(BLANK_ATTRS), leads: 'Leads to: whatever you build', pick: set({ arch: 'custom' }), pressed: S.arch === 'custom' ? 'true' : 'false', style: '' }]
      : D.arch.items.filter((a) => S.fam === 'all' || a.family === S.fam).map((a) => ({ name: a.name, role: a.role.toUpperCase(), blurb: a.blurb, kicker: S.fam === 'all' ? (D.arch.families.find((f) => f.id === a.family) || {}).name : '', grid: attrGrid(a.attributes), leads: 'Leads to: ' + leadsOf(a), pick: set({ arch: a.id }), pressed: S.arch === a.id ? 'true' : 'false' }));
    // Every archetype spends all three budgets (decision 49); the card lists what it raises.
    const raisedOf = (arch) => D.attrs.filter((x) => arch.attributes[x.id] > 1).map((x) => x.name + ' ' + arch.attributes[x.id]).join(' · ');
    const budgetOf = (arch) => 'Every point placed. Attributes: ' + raisedOf(arch);
    archCards.forEach((c) => { const arch = D.arch.items.find((x) => x.name === c.name); c.card = cardFor(arch); c.hasCard = !!c.card; c.hasKicker = !!c.kicker; });
    archCards.forEach((c) => { const arch = D.arch.items.find((x) => x.name === c.name); c.budget = arch ? budgetOf(arch) : 'All ' + attrTotal + ' Attribute and ' + SKILL_PTS + ' Skill points are yours to place'; });
    archCards.forEach((c) => { c.key = (D.arch.items.find((x) => x.name === c.name) || { id: 'custom' }).id; c.style = 'display: flex; gap: 14px; align-items: stretch; text-align: left; padding: 12px; border-radius: 12px; color: #E7EBF3; font-family: inherit; cursor: pointer; ' + (c.pressed === 'true' ? 'background: #1C2536; border: 1px solid #E7EBF3' : 'background: #10151F; border: 1px solid #232D3F'); });
    const A = S.arch === 'custom' ? null : ARCH[S.arch];
    const pvAttrs = A ? A.attributes : BLANK_ATTRS, pvTop = Math.max(...D.attrs.map((x) => pvAttrs[x.id] || 1));
    const pv = {
      card: cardFor(A), hasCard: !!cardFor(A), zoomCard: zoomer(this, cardFor(A), A ? A.name + ': suggested portrait' : '', 'portrait'),
      name: A ? A.name : 'Custom', role: A ? A.role.toUpperCase() : 'YOUR CALL',
      // The nine attributes, three to a family (the family is a heading, nothing more), the highest marked.
      attrFams: CORES.map((c) => ({ key: c, name: c.toUpperCase(), nameStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.16em; color: ' + D.core[c],
        rows: D.attrs.filter((x) => x.core === c).map((x) => { const v = pvAttrs[x.id] || 1, hi = v === pvTop && pvTop > 1;
          return { key: x.id, name: x.name, val: v, top: hi, dia: dia(ATTR_CAP, v, x.ink, 8), gives: ATTR_NEXT[x.id],
            open: () => this.setState({ attrPage: x.id }), openLabel: x.name + ': what it gives',
            nameStyle: 'padding: 0; border: 0; background: none; text-align: left; font-family: inherit; cursor: pointer; text-decoration: underline dotted; text-underline-offset: 3px; font-size: 14px; font-weight: 700; color: ' + (v > 1 ? x.ink : '#A3AEC2'),
            valStyle: 'font-size: 18px; font-weight: 700; line-height: 1; color: ' + (v > 1 ? x.ink : '#A3AEC2'),
            tagStyle: 'padding: 0 6px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; background: ' + x.ink + '; color: #0A0D13' }; }) })),
      skills: A ? Object.entries(A.preset).map(([id, p]) => ({ name: SK[id].name, pts: p + ' pts', style: 'color: ' + ATTR[SK[id].attr].ink })) : [],
      leans: A ? leadsOf(A) : 'whatever you build',
      leanIcons: A ? A.leans.map((l) => ({ key: l, name: CLASSNAME[l], icon: emblemOf(l).icon, style: 'display: inline-flex; gap: 4px; align-items: center; font-weight: 700; color: ' + emblemOf(l).ink })) : [], hasLeans: !!A, noLeans: !A,
      budget: A ? budgetOf(A) : 'All ' + attrTotal + ' Attribute and ' + SKILL_PTS + ' Skill points are yours to place',
    };
    const useArch = () => this.setState({ skills: A ? { ...A.preset } : {}, aSet: A ? { ...A.attributes } : {}, applied: A ? A.id : null, hist: [], note: A ? { kind: 'ok', text: 'Started as the ' + A.name + ': every point is placed. Change anything you like.' } : null, step: 'skills', hover: A ? Object.keys(A.preset)[0] : 'durability' });
    const useLabel = A ? 'Use ' + A.name + ' ›' : 'Start from scratch ›';

    // The points step: three family names (Body, Mind, Soul: headings only), nine attributes, and each attribute's three
    // skills directly under it, so the ceiling is seen. Raising a skill past its attribute spends the Attribute points
    // for it; a refused click changes nothing and the status line says what is short and what to do.
    const now = { skills: S.skills, aSet: S.aSet };
    const pip = (on, reach, ink) => 'display: block; width: 9px; height: 14px; border-radius: 2px; box-sizing: border-box; ' + (on ? 'background: ' + ink : reach ? 'border: 1.5px solid ' + ink : 'border: 1px dashed #4A566C');
    const arrows = (up, down) => (e) => { const k = e.key; if (k === 'ArrowRight' || k === 'ArrowUp') { e.preventDefault(); up(); } else if (k === 'ArrowLeft' || k === 'ArrowDown') { e.preventDefault(); down(); } };
    const hoverOn = (id) => () => { if (this.state.hover !== id) this.setState({ hover: id }); };
    const families = CORES.map((c) => ({
      key: c, name: c.toUpperCase(), about: D.coreText[c][0],
      headStyle: 'display: flex; align-items: baseline; gap: 10px; padding: 0 2px 6px; border-bottom: 2px solid ' + D.core[c],
      nameStyle: 'font-size: 18px; font-weight: 700; letter-spacing: 0.14em; color: ' + D.core[c],
      attrs: D.attrs.filter((a) => a.core === c).map((a) => {
        const v = der.attr[a.id], up = _setAttr(now, a.id, v + 1, extra), dn = _setAttr(now, a.id, v - 1, extra), rs = _resetAttr(now, a.id, extra);
        const raise = () => this.pointsDo((st, x) => _setAttr(st, a.id, derive(st.skills, st.aSet, x).attr[a.id] + 1, x)), lower = () => this.pointsDo((st, x) => _setAttr(st, a.id, derive(st.skills, st.aSet, x).attr[a.id] - 1, x));
        return {
          key: a.id, name: a.name.toUpperCase(), val: v, open: () => this.setState({ attrPage: a.id }), openLabel: a.name + ': what it gives and what reads it',
          next: v < ATTR_CAP ? 'Next point: ' + ATTR_NEXT[a.id] + '.' : 'At ' + ATTR_CAP + ', the most at creation. Each point: ' + ATTR_NEXT[a.id] + '.',
          up: raise, down: lower, keys: arrows(raise, lower), upOff: up.ok ? 'false' : 'true', downOff: dn.ok ? 'false' : 'true',
          upAria: up.ok ? 'Raise ' + a.name + ' from ' + v + ' to ' + (v + 1) + ' for 1 Attribute point. Gives ' + ATTR_NEXT[a.id] + '.' : 'Raise ' + a.name + ', now ' + v + '. Not possible: ' + up.text,
          downAria: dn.ok ? 'Lower ' + a.name + ' from ' + v + ' to ' + (v - 1) + '. 1 Attribute point back.' : 'Lower ' + a.name + ', now ' + v + '. Not possible: ' + dn.text,
          upTitle: up.ok ? '1 Attribute point: ' + ATTR_NEXT[a.id] : up.text, downTitle: dn.ok ? '1 Attribute point back' : dn.text,
          reset: () => this.pointsDo((st, x) => _resetAttr(st, a.id, x)), resetOff: rs.ok ? 'false' : 'true', resetAria: 'Reset ' + a.name + ': its skills back to 0 and ' + a.name + ' back to 1' + (rs.ok ? '' : '. Nothing to reset'),
          pips: Array.from({ length: ATTR_CAP }, (_, i) => ({ key: i, style: pip(i < v, true, a.ink), title: 'Set ' + a.name + ' to ' + (i + 1),
            set: () => this.pointsDo((st, x) => { const cur = derive(st.skills, st.aSet, x).attr[a.id]; return _setAttr(st, a.id, i + 1 === cur ? i : i + 1, x); }) })),
          boxStyle: 'display: flex; flex-direction: column; gap: 6px; padding: 9px 10px 8px; border-radius: 10px; background: #10151F; border: 1px solid #232D3F; border-top: 3px solid ' + a.ink,
          nameStyle: 'padding: 0; border: 0; background: none; text-align: left; font-family: inherit; cursor: pointer; text-decoration: underline dotted; text-underline-offset: 3px; font-size: 14px; font-weight: 700; letter-spacing: 0.1em; color: ' + a.ink, valStyle: 'color: ' + a.ink,
          railStyle: 'display: flex; flex-direction: column; gap: 5px; margin-left: 4px; padding-left: 9px; border-left: 2px solid ' + a.ink,
          cards: skillsUnder(a.id).map((s) => {
            const p = S.skills[s.id] || 0, m = checkMod(s.id, p), m1 = checkMod(s.id, p + 1), up2 = _setSkill(now, s.id, p + 1, extra), dn2 = _setSkill(now, s.id, p - 1, extra);
            const give = perPoint(s.id), [tag, slot] = SLOT_WORD[s.slot], lifts = up2.ok && p + 1 > v, perk = PERK_AT.includes(p + 1) ? ' A perk at ' + (p + 1) + '.' : '';
            const inc = () => this.pointsDo((st, x) => _setSkill(st, s.id, (st.skills[s.id] || 0) + 1, x), s.id), dec = () => this.pointsDo((st, x) => _setSkill(st, s.id, (st.skills[s.id] || 0) - 1, x), s.id);
            return { ...s, key: s.id, pts: p, tag, need: lifts ? 'TAKES ' + a.name.toUpperCase() + ' TO ' + (p + 1) : '', hasNeed: lifts,
              line: p < ATTR_CAP ? 'Roll ' + fmt(m) + ', next ' + fmt(m1) + '. Next point: ' + give + perk : 'Roll ' + fmt(m) + '. At ' + ATTR_CAP + ', the most at creation. Each point: ' + give,
              lineTitle: s.name + ': ' + s.summary + ' ' + slot + '. Each point: ' + give,
              inc, dec, keys: arrows(inc, dec), incOff: up2.ok ? 'false' : 'true', decOff: dn2.ok ? 'false' : 'true',
              incAria: up2.ok ? 'Raise ' + s.name + ' from ' + p + ' to ' + (p + 1) + ' for 1 Skill point' + (lifts ? ' and 1 Attribute point: ' + a.name + ' rises from ' + v + ' to ' + (p + 1) : '') + '. Roll ' + fmt(m1) + '. ' + give : 'Raise ' + s.name + ', now ' + p + '. Not possible: ' + up2.text,
              decAria: dn2.ok ? 'Lower ' + s.name + ' from ' + p + ' to ' + (p - 1) + '. 1 Skill point back.' : 'Lower ' + s.name + ', now ' + p + '. Not possible: ' + dn2.text,
              incTitle: up2.ok ? (lifts ? '1 Skill point and 1 Attribute point: ' + a.name + ' ' + v + ' → ' + (p + 1) : '1 Skill point') + '. Roll ' + fmt(m1) : up2.text, decTitle: dn2.ok ? '1 Skill point back' : dn2.text,
              pips: Array.from({ length: ATTR_CAP }, (_, i) => ({ key: i, style: pip(i < p, i < v, a.ink), title: 'Set ' + s.name + ' to ' + (i + 1) + (i + 1 > v ? ': ' + a.name + ' rises to ' + (i + 1) + ' too' : ''),
                set: () => this.pointsDo((st, x) => { const cur = st.skills[s.id] || 0; return _setSkill(st, s.id, i + 1 === cur ? i : i + 1, x); }, s.id) })),
              hover: hoverOn(s.id), help: () => this.setState({ epccg: s.id, hover: s.id }), helpStyle: epBtnStyle(a.ink, 'width: 26px; height: 26px; font-size: 13px'),
              nameStyle: 'font-size: 14px; font-weight: 700; color: ' + (p ? a.ink : '#E7EBF3'), tagStyle: 'font-size: 10px; font-weight: 700; letter-spacing: 0.1em; color: ' + a.ink,
              style: 'display: flex; flex-direction: column; gap: 2px; padding: 4px 6px 5px 8px; border-radius: 8px; border: 1px solid ' + (S.hover === s.id ? '#5A6781' : 'transparent') + '; background: ' + (S.hover === s.id ? '#161D2B' : 'transparent') };
          }),
        };
      }),
    }));
    // Both budgets, always in view (the bar sticks to the top of the window), and what is still to place.
    const meter = (label, n, total, note) => ({ key: label, label, note, hasNote: !!note,
      text: n < 0 ? -n + ' TOO MANY' : n === 0 ? '✓ ALL ' + total + ' PLACED' : n + ' LEFT OF ' + total, aria: label + ': ' + (n < 0 ? -n + ' too many' : n + ' left of ' + total),
      numStyle: 'font-size: 20px; font-weight: 700; white-space: nowrap; color: ' + (n < 0 ? '#F65157' : n === 0 ? '#6FEA77' : '#FFFFFF'),
      pips: Array.from({ length: total }, (_, i) => ({ key: i, style: 'width: 8px; height: 8px; border-radius: 2px; box-sizing: border-box; ' + (i < total - Math.max(0, n) ? 'background: #5A6781' : 'background: #FFFFFF') })) });
    const meters = [meter('SKILL POINTS', left, SKILL_PTS, ''), meter('ATTRIBUTE POINTS', der.attrLeft, attrTotal, extra ? '+' + extra + ' from Mind Without Fog' : '')];
    const todo = _pointsTodo(der), pointsDone = !todo;
    const hist = S.hist || [], lastWhat = hist.length ? hist[hist.length - 1].what : '';
    const note = S.note && S.note.text ? S.note : { kind: 'tip', text: 'Press › on the skills you want. A skill can\'t be higher than the attribute above it: go past it and the Attribute points are spent for you.' };
    const points = {
      meters, todo: pointsDone ? '✓ Every point is placed. Go on to Traits when you like.' : '◆ ' + todo, todoStyle: 'font-size: 14px; font-weight: 600; line-height: 1.35; color: ' + (pointsDone ? '#6FEA77' : '#FFFFFF'),
      note: (note.kind === 'no' ? '✗ ' : note.kind === 'ok' ? '✓ ' : '') + note.text, noteStyle: 'margin: 0; min-height: 20px; font-size: 14px; line-height: 20px; font-weight: 600; color: ' + (note.kind === 'no' ? '#F65157' : note.kind === 'ok' ? '#E7EBF3' : '#A3AEC2'),
      undo: () => this.pointsUndo(), noUndo: !hist.length, undoAria: hist.length ? 'Undo the last change: ' + lastWhat : 'Undo: nothing to undo yet',
      resetAll: () => this.pointsDo(() => (der.spent || der.attrSpent ? { ok: true, skills: {}, aSet: {}, applied: null, what: 'everything reset', text: 'Everything reset: all ' + SKILL_PTS + ' Skill points and ' + attrTotal + ' Attribute points are yours to place.' } : no('Nothing is placed yet.'))),
    };
    const hv = SK[S.hover] || D.skills[0], hp = S.skills[hv.id] || 0;
    const detail = { zoom: zoomer(this, hv.img, hv.name, 'skill'), img: hv.img, name: hv.name.toUpperCase(), attr: ATTR[hv.attr].name, mod: 'roll ' + fmt(checkMod(hv.id, hp)) + (hp === 0 ? ' untrained' : ''), summary: hv.summary, quiet: hv.quiet,
      slot: SLOT_WORD[hv.slot][1] + '. Each point: ' + perPoint(hv.id),
      nameStyle: 'font-size: 13px; font-weight: 700; letter-spacing: 0.1em; color: ' + ATTR[hv.attr].ink,
      style: 'display: flex; align-items: center; gap: 14px; min-height: 100px; box-sizing: border-box; padding: 10px 14px; border-radius: 12px; background: #10151F; border: 1px solid #232D3F; border-left: 3px solid ' + ATTR[hv.attr].ink };
    // Class Roster Revision 3: level 3 offers the class of the highest attribute (every tied one).
    const leanChip = (ink) => 'display: inline-flex; gap: 5px; align-items: center; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; border: 1px solid ' + ink + '; color: ' + ink;
    const leanList = !der.leans.length ? [{ name: 'Place some points', total: '', icon: '', hasIcon: false, chip: 'font-size: 12px; color: #A3AEC2' }]
      : der.leans.length > 3 ? [{ name: der.leans.length + ' tied', total: '', icon: '', hasIcon: false, chip: leanChip('#E7EBF3') }]
        : der.leans.map((l) => ({ name: l.name, total: l.total, icon: emblemOf(l.id).icon, hasIcon: true, chip: leanChip(D.core[l.core]) }));
    const archNote = S.applied ? 'Started from the ' + ARCH[S.applied].name + ' archetype. Change anything; the archetype is not saved.' : 'Built from scratch.';

    // traits
    const cats = ['All', ...new Set(D.traits.map((t) => t.cat))];
    const catTabs = cats.map((c) => ({ name: c, pick: set({ tcat: c }), selected: S.tcat === c ? 'true' : 'false', style: btn(S.tcat === c, '#E7EBF3') }));
    const picked = S.traits;
    const blocked = new Set(); picked.forEach((id) => { const t = D.traits.find((x) => x.id === id); (t ? t.ex : []).forEach((e) => blocked.add(e)); });
    D.traits.forEach((t) => { if (t.ex.some((e) => picked.includes(e))) blocked.add(t.id); });
    const traitCards = D.traits.filter((t) => S.tcat === 'All' || t.cat === S.tcat).map((t) => {
      // One music trait per character (engine: Only one music trait.): once one is picked the others are shut.
      const on = picked.includes(t.id), music = !on && isMusicTrait(t.id) && picked.some(isMusicTrait), ex = (blocked.has(t.id) || music) && !on, full = picked.length >= 2 && !on;
      return { key: t.id, zoom: zoomer(this, t.icon, t.name, 'icon'), name: t.name, icon: t.icon, cat: t.cat.toUpperCase(), flavour: t.flavour, up: t.up.map((x) => ({ text: x })), down: t.down.map((x) => ({ text: x })),
        toggle: () => this.setState({ traits: on ? picked.filter((x) => x !== t.id) : [...picked, t.id] }), disabled: ex || full, pressed: on ? 'true' : 'false',
        btn: on ? 'Remove' : music ? 'Only one music trait' : ex ? 'Excluded by a pick' : full ? 'Two already picked' : 'Take this trait',
        btnStyle: 'flex: none; margin-top: auto; min-height: 42px; border-radius: 8px; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; ' + (on ? 'border: 0; background: #E7EBF3; color: #0A0D13' : 'border: 1px solid #2E3A50; background: transparent; color: ' + (ex || full ? '#7F8BA1' : '#E7EBF3')),
        style: 'display: flex; flex-direction: column; gap: 10px; padding: 18px; border-radius: 12px; background: #10151F; border: 1px solid ' + (on ? '#E7EBF3' : '#232D3F') + (ex ? '; opacity: 0.55' : '') };
    });
    const traitChip = picked.length + ' OF 2 PICKED';

    // kit
    // The kit's weapons as icons (gearIcons.ts): the one in hand, the focus in the off hand, then any in the pack. Its body armour is an Armour Class
    // from the kit, not an item, so it has no icon.
    const kitIcons = (id) => { const K = KITS[id]; if (!K) return [];
      return [K.weapon, ...(K.offHand ? [K.offHand] : []), ...K.pack.filter((it) => it.weapon).map((it) => it.weapon)].filter((w, i, a) => a.indexOf(w) === i).map((w) => ({ key: w, src: gearIconUri(w), name: WEAPON[w]?.name || ITEM[w]?.name || w })).filter((x) => x.src); };
    const kitCards = D.kits.map((k) => ({ name: k.name, items: k.items.map((x) => ({ text: x })), icons: kitIcons(k.id), hasIcons: kitIcons(k.id).length > 0, pick: set({ kit: k.id }), pressed: S.kit === k.id ? 'true' : 'false',
      style: 'position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 8px; text-align: left; padding: 18px; border-radius: 12px; color: #E7EBF3; font-family: inherit; cursor: pointer; ' + (S.kit === k.id ? 'background: #1C2536; border: 1px solid #E7EBF3' : 'background: #10151F; border: 1px solid #232D3F') }));

    // kit: starting magic (only for a build that can cast)
    const canSigil = canSigilOf(S), canSoul = canSoulOf(S), hasMagic = canSigil || canSoul;
    // Physical 2.0 (rules 1.12): starting techniques. Raw Power or Athletics picks 2 melee techniques (one an Opener),
    // Dexterity picks 2 ranged ones. The engine's defaults are picked already (Lunge and Sidestep; Suppress and Shift), so a
    // new player can just continue; the engine checks the picks (startingTechniquesError).
    const techPicks = techPicksOf(S), techSlots = startingTechniqueSlots({ skills: S.skills }), techErr = startingTechniquesError({ skills: S.skills, techniques: techPicks });
    const techSys = [['melee', 'MELEE TECHNIQUES · BODY · PICK ' + techSlots.melee + ' (ONE AN OPENER)', '#F68A38'], ['ranged', 'RANGED TECHNIQUES · BODY · PICK ' + techSlots.ranged, '#E3BF51']].filter(([sys]) => techSlots[sys] > 0).map(([sys, title, ink]) => {
      const picked = techPicks[sys], n = techSlots[sys];
      const groups = phys.groupsOf(sys).map((gr) => ({ key: gr, label: phys.groupName(gr).toUpperCase(),
        chips: startingTechniqueChoices(sys).filter((id) => phys.TECHNIQUE[id].group === gr).map((id) => { const t = phys.TECHNIQUE[id], on = picked.includes(id);
          return { key: id, label: t.name + (on ? ' ✓' : ''), pressed: on ? 'true' : 'false', title: t.name + ': ' + t.text, style: 'min-height: 34px; padding: 0 12px; border-radius: 999px; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; ' + (on ? 'border: 1px solid ' + ink + '; background: #1C2536; color: #FFFFFF' : 'border: 1px solid #2E3A50; background: transparent; color: #C9D3E3'),
            pick: () => { const cur = techPicksOf(this.state)[sys]; this.setState({ tech: { ...this.state.tech, [sys]: on ? cur.filter((x) => x !== id) : cur.length < n ? [...cur, id] : [...cur.slice(1), id] } }); } }; }) })).filter((gr) => gr.chips.length);
      return { key: sys, title, ink, titleStyle: 'font-size: 13px; font-weight: 700; letter-spacing: 0.16em; color: ' + ink, cardStyle: 'display: flex; flex-direction: column; gap: 10px; padding: 18px; border-radius: 14px; background: #10151F; border: 1px solid #232D3F; border-left: 3px solid ' + ink,
        groups, picked: picked.map((id) => phys.TECHNIQUE[id]?.name || id).join(' + ') || 'none yet', reset: () => this.setState({ tech: { ...this.state.tech, [sys]: null } }), resetLabel: 'Back to ' + defaultTechniques({ skills: S.skills })[sys].map((id) => phys.TECHNIQUE[id]?.name || id).join(' + ') };
    });
    const hasTech = techSys.length > 0, techVerdict = techErr || 'Ready: ' + techSys.map((x) => x.picked).join(' · ') + '.';
    const sig = S.sigils || [], sigErr = sig.length < 2 ? 'Pick ' + (2 - sig.length) + ' more word' + (sig.length === 1 ? '' : 's') + ': one Subject and one Reach word.' : startingMagicError({ sigils: sig, skills: S.skills });
    const pickWord = (w) => () => {
      const cur = this.state.sigils || [];
      if (cur.includes(w)) return this.setState({ sigils: cur.filter((x) => x !== w) });
      if (cur.length < 2) return this.setState({ sigils: [...cur, w] });
      // Two picked: the new word takes the place of the one doing the same job (Subject or Reach), so the spell stays whole.
      const same = cur.findIndex((x) => (isSubject(w) && isSubject(x)) || (isReachW(w) && isReachW(x)));
      this.setState({ sigils: same >= 0 ? cur.map((x, i) => (i === same ? w : x)) : [cur[1], w] });
    };
    const sigilGroups = WORD_CLASS.map(([cls, label]) => ({ label, words: SIGILS.filter((w) => w.class === cls).map((w) => {
      const on = sig.includes(w.id), isMod = !isSubject(w.id) && !isReachW(w.id); // a starting pair is a Subject and a Reach word
      return { id: w.id, word: w.word, img: glyphUri(w.id, on ? SIGIL_GLOW : SIGIL_INK, { glow: on }), charge: 'CHARGE ' + w.charge, text: w.text,
        pick: pickWord(w.id), pressed: on ? 'true' : 'false', disabled: isMod && !on, title: isMod ? w.word + ' is learned in play: your 2 starting words are a Subject and a Reach word. ' + w.text : w.word + ': ' + w.text,
        style: 'display: flex; gap: 10px; align-items: flex-start; text-align: left; padding: 10px; border-radius: 10px; color: #E7EBF3; font-family: inherit; cursor: ' + (isMod ? 'not-allowed' : 'pointer') + '; ' +
          (on ? 'background: #1C2536; border: 1px solid ' + SIGIL_GLOW : 'background: #10151F; border: 1px solid #232D3F') + (isMod ? '; opacity: 0.55' : '') };
    }) }));
    const sigilVerdict = sigErr ? '◆ ' + sigErr : '✓ ' + stackLine(sig, S.skills);
    const sigilVerdictStyle = 'font-size: 14px; line-height: 1.45; font-weight: 600; color: ' + (sigErr ? '#FFFFFF' : '#6FEA77');
    const ob = obOf(S), slots = slotsOf(S), obErr = startingMagicError({ outburst: ob, skills: S.skills });
    const setOb = (patch) => () => this.setState({ ob: { ...obOf(this.state), ...patch } });
    const schoolCards = SCHOOLS.map((x) => ({ name: x.name.toUpperCase(), cost: x.base_cost + ' MP BASE', text: x.text, pick: setOb({ school: x.id, option: '' }), pressed: ob.school === x.id ? 'true' : 'false',
      style: 'display: flex; flex-direction: column; gap: 4px; text-align: left; padding: 10px 12px; border-radius: 10px; color: #E7EBF3; font-family: inherit; cursor: pointer; ' + (ob.school === x.id ? 'background: #1C2536; border: 1px solid ' + SOUL_INK : 'background: #10151F; border: 1px solid #232D3F') }));
    const obOpts = (SCHOOL[ob.school]?.options || []).map(optId).map((id) => ({ name: OPT_NAME[id] || id, pick: setOb({ option: id }), pressed: ob.option === id ? 'true' : 'false', style: btn(ob.option === id, SOUL_INK) }));
    const toggleMod = (id) => () => {
      // The starting design is one school and exactly one module (spec: The Magic panel): a pick replaces the module.
      const cur = obOf(this.state);
      this.setState({ ob: { ...cur, modules: [id] } });
    };
    const FAM = { form: 'SHAPE (BOLT WITHOUT ONE)', behaviour: 'BEHAVIOUR', augment: 'AUGMENT', trigger: 'TRIGGER' };
    const modGroups = Object.keys(FAM).map((f) => ({ label: FAM[f], mods: MODULES.filter((m) => m.family === f && !(m.id === 'size')).map((m) => { const on = ob.modules.includes(m.id);
      return { icon: f === 'form' ? formIconUri(m.id, toneInk(ob.tone)) : '', hasIcon: f === 'form', name: m.name, cost: (m.cost > 0 ? '+' : m.cost < 0 ? '−' : '') + Math.abs(m.cost) + ' MP', text: m.text, pick: toggleMod(m.id), pressed: on ? 'true' : 'false', mark: on ? '✓' : '',
        style: 'display: flex; flex-direction: column; gap: 3px; text-align: left; padding: 8px 10px; border-radius: 9px; color: #E7EBF3; font-family: inherit; cursor: pointer; ' + (on ? 'background: #1C2536; border: 1px solid ' + SOUL_INK : 'background: #10151F; border: 1px solid #232D3F') }; }) }));
    const obName = ob.name.trim() || (SCHOOL[ob.school]?.name || 'Outburst') + ' Outburst';
    const normal = (MANA_BANDS.find((b) => b.id === 'normal') || MANA_BANDS[1]).min;
    const obDraft = { id: 'draft', name: obName, school: ob.school, modules: ob.modules, ...(ob.option ? { option: ob.option } : {}), ...(ob.tone !== 'raw' ? { tone: ob.tone } : {}) };
    const obCost = designCost({ costSave: soulCostSaving({ attrs: der.attr, skills: S.skills }) }, obDraft, normal);
    const obInfo = designInfo({ costSave: soulCostSaving({ attrs: der.attr, skills: S.skills }), soulRange: soulRangeBonus({ attrs: der.attr, skills: S.skills }) }, obDraft, normal);
    const obParts = [SCHOOL[ob.school]?.name, ob.option ? OPT_NAME[ob.option] || ob.option : '', ...ob.modules.map((m) => MODULE[m]?.name), ob.tone !== 'raw' ? toneName(ob.tone) + ' tone' : ''].filter(Boolean).join(' · ');
    const obVerdict = obErr ? '◆ ' + obErr : '✓ ' + obName + ': ' + obParts + '. Costs ' + obCost + ' MP in Normal mana.';
    // Tones (rules 1.5): Raw, or one element at Lore Master 1 (rules 1.8) (learned with this design).
    const visOk = (S.skills.lore_master || 0) >= 1;
    const obTones = toneChips([], visOk ? 1 : 0).map((t) => { const on = ob.tone === t.id, can = t.id === 'raw' || visOk;
      return { key: t.id, name: t.name, title: t.text + (can ? '' : ' Needs Lore Master 1.'), pick: can ? setOb({ tone: t.id }) : () => {}, pressed: on ? 'true' : 'false', locked: !can, style: btn(on, t.ink) + (can ? '' : '; opacity: 0.4; cursor: default') }; });
    const obVerdictStyle = 'font-size: 14px; line-height: 1.45; font-weight: 600; color: ' + (obErr ? '#FFFFFF' : '#6FEA77');
    // Rules 1.8: two starting feelings (default Rage and Love); the rest are felt in play.
    const feels = S.feelings && S.feelings.length ? S.feelings : FEELING_START;
    const feelChips = FEELINGS.map((f) => { const on = feels.includes(f.id), ink = feelingInk(f.id);
      return { key: f.id, name: f.name, icon: feelingIconSrc(f.id, on ? ink : '#7F8BA1'), iconStyle: iconStyle(feelingIconSrc(f.id, on ? ink : '#7F8BA1'), on ? ink : '#7F8BA1'), pressed: on ? 'true' : 'false', title: f.name + ': ' + f.pour.text + ' Felt first when: ' + f.trigger.text,
        // Always two: picking a third swaps out the older pick (a picked one stays until another replaces it).
        pick: () => { if (on) return; const cur = this.state.feelings && this.state.feelings.length === 2 ? this.state.feelings : FEELING_START; this.setState({ feelings: [...cur, f.id].slice(-2) }); },
        style: btn(on, ink) + '; display: inline-flex; align-items: center; gap: 6px' }; });
    const feelHint = 'Pick 2: ' + feels.map((x) => FEELINGS.find((f) => f.id === x)?.name || x).join(' and ') + '. Pour one in while you pump; the others you will feel in play, the first time they happen to you.';
    const slotChip = 'ONE MODULE TO START · ' + slots + ' SLOT' + (slots === 1 ? '' : 'S') + ' FOR DESIGNS IN PLAY';

    // lock in
    const trainedSkills = D.skills.filter((s) => S.skills[s.id]).map((s) => ({ label: s.name + ' ' + S.skills[s.id], style: 'font-size: 14px; font-weight: 600; color: ' + ATTR[s.attr].ink }));
    const traitNames = picked.length ? picked.map((id) => (D.traits.find((t) => t.id === id) || {}).name).join(' · ') : 'None';
    const statsPlaced = der.attrLeft === 0 && Object.values(der.attr).every((v) => v <= ATTR_CAP);
    const checks = [['Name', !!S.name], ['Origin', S.origin !== null], ['All ' + SKILL_PTS + ' Skill points placed', left === 0], ['All ' + attrTotal + ' Attribute points placed, none above ' + ATTR_CAP, statsPlaced], ['Starting kit', !!S.kit],
      ...(canSigil ? [['Sigil words: ' + sig.map((w) => SIGIL[w]?.word || w).join(' + '), !sigErr]] : []), ...(hasTech ? [['Techniques: ' + techSys.map((x) => x.picked).join(' · '), !techErr]] : []), ...(canSoul ? [['Outburst: ' + obName, !obErr]] : [])].map(([label, ok]) => ({
      label, mark: ok ? '✓' : '◆', markStyle: 'width: 20px; text-align: center; font-weight: 700; color: ' + (ok ? '#6FEA77' : '#FFFFFF') }));
    const cantLock = checks.some((c) => c.mark !== '✓');

    // lock in: the full record (spec formulas; identity fields are free text, the sample shows MPAT's)
    const AV = der.attr, PT = (id) => S.skills[id] || 0, MD = (id) => mod(PT(id)), pos = (m) => Math.max(0, m);
    const sample = !!this.props.sampleName;
    const I = S.idv; const record = [['Race', 'Human (races later)'], ['Gender', I.gender], ['Blood type', I.blood], ['Main hand', I.hand],
      ['Association', I.association], ['Favourite song', I.songTitle ? I.songTitle + (I.songArtist ? ' · ' + I.songArtist : '') : I.song], ['Last dream', I.dream], ['History', I.history]]
      .map(([k, v]) => ({ k, v: v || 'Not filled in', vStyle: 'max-height: 4.35em; overflow-wrap: anywhere; font-size: 14px; line-height: 1.45; color: ' + (v ? '#E7EBF3' : '#7F8BA1') }));
    const seenKey = o ? Object.keys(o).find((k) => k.startsWith('People see you as')) : null; // Bazaim's reads "(in Central City)"
    const originRows = o ? [['Home', o.Home], ['Upbringing', o.Upbringing], ['You know', o['You know']], [seenKey || 'People see you as', seenKey ? o[seenKey] : ''], ['Suggested skills', o.Skills], ['Hook', o.Hook]]
      .filter(([, v]) => typeof v === 'string' && v).map(([k, v]) => ({ k: k.toUpperCase(), v: v.charAt(0).toUpperCase() + v.slice(1) })) : [];
    const n2 = (x) => (Math.round(x * 100) / 100).toString();
    // Stats at level 1: the engine's numbers for a character built from these points (game/derived.ts), each with the
    // attribute and skill behind it.
    const pc1 = previewCharacter(S.skills, AV, S.traits, S.kit);
    const stats = pc1 ? [...derivedLines(pc1).map((r) => ({ key: r.key, k: r.k, v: r.v, from: r.from })), { key: 'ap', k: 'AP per turn', v: '6', from: 'Everyone' }, { key: 'echo', k: 'Echo', v: '1 at session start', from: 'Everyone' }] : [];
    const tree = CORES.map((c) => ({ name: c.toUpperCase(), nameStyle: 'font-size: 15px; font-weight: 700; letter-spacing: 0.1em; color: ' + D.core[c],
      attrs: D.attrs.filter((a) => a.core === c).map((a) => ({ name: a.name, val: AV[a.id], nameStyle: 'font-size: 13px; font-weight: 700; color: ' + a.ink,
        skills: D.skills.filter((sk) => sk.attr === a.id).map((sk) => { const p = PT(sk.id), m = checkMod(sk.id, p);
          return { name: sk.name, pts: p, mod: fmt(m) + (p >= 10 ? ' · Mastered' : p >= 9 ? ' · M4' : p >= 7 ? ' · M3' : p >= 5 ? ' · M2' : p >= 3 ? ' · M1' : ''),
            style: 'display: flex; justify-content: space-between; gap: 6px; font-size: 13px; color: ' + (p ? '#E7EBF3' : '#7F8BA1') }; }) })) }));
    const traitFull = picked.map((id) => D.traits.find((t) => t.id === id)).filter(Boolean).map((t) => ({ zoom: zoomer(this, t.icon, t.name, 'icon'), name: t.name, cat: t.cat.toUpperCase(), icon: t.icon, flavour: t.flavour,
      up: t.up.map((x) => ({ text: x })), down: t.down.map((x) => ({ text: x })) }));
    const kit = S.kit ? D.kits.find((k) => k.id === S.kit) : null;
    const kitItems = [...(kit ? kit.items : []), 'Essence of Experience ×1'].map((text) => ({ text }));
    const voiceList = D.skills.filter((sk) => PT(sk.id) > 0).sort((a, b) => PT(b.id) - PT(a.id)).slice(0, 4).map((sk) => ({ name: sk.name.toUpperCase(), line: sk.quiet,
      nameStyle: 'font-size: 12px; font-weight: 700; letter-spacing: 0.12em; color: ' + ATTR[sk.attr].ink }));
    const magicSigils = canSigil ? sig.map((w) => ({ word: SIGIL[w]?.word || w, img: glyphUri(w, SIGIL_INK), text: SIGIL[w]?.text || '' })) : [];
    const magicLine = canSigil && !sigErr ? stackLine(sig, S.skills) : '';
    const magicOb = { name: obName, school: (SCHOOL[ob.school]?.name || '').toUpperCase() + ' SCHOOL', parts: obParts, cost: obInfo.line, heart: obInfo.icon };
    const leanCards = der.leans.map((l) => { const c = D.classes.find((x) => x.id === l.id), an = ATTR[l.attribute].name;
      return { key: l.id, name: l.name, total: an + ' ' + l.total, icon: emblemOf(l.id).icon, sig: c.sig.map((id) => SK[id].name + ' ' + PT(id)).join(' · '), nameStyle: 'font-size: 15px; font-weight: 700; color: ' + D.core[l.core],
        attrStyle: 'font-size: 12px; font-weight: 700; color: ' + ATTR[l.attribute].ink }; });

    return { ...epccgVals(this), ...lightboxVals(this), zoomPortrait: zoomer(this, portrait.img, '', 'portrait'),
      steps, headerName: S.name || 'UNNAMED', budgetChip: left === 0 && statsPlaced ? '✓ EVERY POINT PLACED' : left + ' SKILL · ' + der.attrLeft + ' ATTRIBUTE LEFT', budgetChipStyle: chip(left === 0 && statsPlaced ? '#6FEA77' : '#FFFFFF'),
      isIdentity: S.step === 'identity', isArchetype: S.step === 'archetype', isSkills: S.step === 'skills', isTraits: S.step === 'traits', isKit: S.step === 'kit', isLockin: S.step === 'lockin', isBelief: S.step === 'belief',
      ...this.beliefVals(),
      name: S.name, onName: (e) => this.setState({ name: e.target.value }), originCards, hasOrigin: !!o, origin, portrait, portraitThumbs,
      famTabs, famBlurb, archCards, pv, useArch, useLabel,
      families, points, detail, leanList, archNote,
      catTabs, traitCards, traitChip, traitChipStyle: chip(picked.length ? '#6FEA77' : '#FFFFFF'),
      kitCards, hasTech, techSys, techVerdict, techVerdictStyle: 'font-size: 13px; font-weight: 700; color: ' + (techErr ? '#FFFFFF' : '#6FEA77'), hasMagic, canSigil, canSoul, sigilGroups, sigilVerdict, sigilVerdictStyle, sigilHead: glyphUri('spark', SIGIL_GLOW, { glow: true }), soulHead: heartUri(1),
      schoolCards, obOpts, hasOpts: obOpts.length > 0, obTones, feelChips, feelHint, obToneHint: visOk ? 'Raw ignores armour and has no rider; an element adds a rider that grows with the stage (armour counts half).' : 'An element tone needs Lore Master 1; your Outburst is Raw (it ignores armour).',
      obShapeIcon: obInfo.icon, obShapeLine: obInfo.line, obShapeStyle: 'font-size: 12px; font-weight: 700; letter-spacing: 0.06em; color: ' + obInfo.ink, modGroups, slotChip, slotChipStyle: chip(SOUL_INK), obName: S.ob ? S.ob.name : '', obPlaceholder: (SCHOOL[ob.school]?.name || 'Outburst') + ' Outburst',
      onObName: (e) => this.setState({ ob: { ...obOf(this.state), name: e.target.value.slice(0, 40) } }), obVerdict, obVerdictStyle,
      resetSigils: set({ sigils: [...DEFAULT_SIGILS] }), resetSigilsLabel: 'Back to ' + DEFAULT_SIGILS.map((w) => SIGIL[w]?.word || w).join(' + '), resetOb: set({ ob: { ...DEFAULT_OB } }),
      magicSigils, magicLine, hasMagicLine: !!magicLine, magicOb,
      summaryLine: [o ? o.name : 'No origin yet', S.kit ? (D.kits.find((k) => k.id === S.kit) || {}).name : 'No kit yet'].join(' · '),
      trainedSkills, traitNames, leanText: der.leans.length ? (der.leans.length > 1 ? 'Tied: at level 3 you choose one of these, for good.' : 'Your highest attribute decides it. A tie lets you choose.') : 'Place some points first: your highest attribute decides your class.',
      record, originRows, stats, tree, traitFull, hasTraits: traitFull.length > 0, noTraits: traitFull.length === 0, kitItems, kitName: kit ? kit.name : 'No kit yet', voiceList, hasVoices: voiceList.length > 0, leanCards,
      originName: o ? o.name : 'No origin yet', hasOriginRows: !!o,
      checks, cantLock, lockOff: cantLock, lockStyle: 'min-height: 50px; border-radius: 10px; border: 0; font-family: inherit; font-size: 16px; font-weight: 700; cursor: ' + (S.stamp ? 'default' : 'pointer') + '; ' + (S.stamp ? 'background: ' + STAMP_RED + '; color: #FFFFFF' : cantLock ? 'background: #1C2536; color: #7F8BA1' : 'background: #6FEA77; color: #0A0D13'),
      stamped: !!S.stamp, stampMode: S.stamp || 'on', sealStyle: SEAL_STYLE + (S.stamp ? '0' : '0.55'),
      ...(() => { const yt = ytId(S.idv.song), st = S.songState;
        const note = !S.idv.song ? 'Played for the whole room when you do something amazing. Pick a video that allows embedding.' : !yt ? 'Not a YouTube link: it stays as text and won\'t play.' : st === 'checking' ? 'Checking the video…' : st === 'bad' ? '✗ This video doesn\'t allow embedding, so it can\'t play in the game. Try another upload of the song.' : st === 'ok' ? '✓ Plays in the game' + (ytStart(S.idv.song) ? ' from ' + Math.floor(ytStart(S.idv.song) / 60) + ':' + String(ytStart(S.idv.song) % 60).padStart(2, '0') : '') + '.' : 'Leave the field to check the link.';
        return { songHas: !!yt, songNote: note, songNoteStyle: 'font-size: 12px; color: ' + (st === 'ok' && yt ? '#6FEA77' : st === 'bad' && yt ? '#F65157' : '#A3AEC2'),
          songCheck: async () => { const link = this.state.idv.song, id = ytId(link); if (!id) return this.setState({ songState: null });
            this.setState({ songState: 'checking' });
            try { const r = await fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id));
              if (!r.ok) return this.setState({ songState: 'bad' });
              const j = await r.json(), I = this.state.idv;
              this.setState({ songState: 'ok', idv: { ...I, songTitle: I.songTitle || (j.title || '').replace(/\s*[\[(][^\])]*[\])]/g, '').replace(new RegExp('\\s*-\\s*' + (j.author_name || '').replace(/ - Topic$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'), '').replace(/^['"‘“](.*)['"’”]$/, '$1').trim() || j.title || '', songArtist: I.songArtist || (j.author_name || '').replace(/ - Topic$/, '') } });
            } catch { this.setState({ songState: null }); } } }; })(),
      idv: S.idv, idc: { ...Object.fromEntries(ID_KEYS.map((k) => [k, (e) => this.setState({ idv: { ...this.state.idv, [k]: e.target.value } })])), song: (e) => this.setState({ songState: null, idv: { ...this.state.idv, song: e.target.value, ...(ytId(e.target.value) !== ytId(this.state.idv.song) ? { songTitle: '', songArtist: '' } : {}) } }) },
      lockIn: () => this.lockIn(der), saveDraft: () => this.saveDraft(der), exit: () => go(getState().code ? 'room' : 'home', { draft: null }), exitLabel: getState().code ? 'Back to the room' : 'Home',
      lockLabel: S.stamp ? 'Approved ✓' : getState().code && getState().game?.phase === 'lobby' ? 'Lock in and bring to the room' : 'Lock in',
      generate: () => this.setState({ name: NAMES[Math.floor(Math.random() * NAMES.length)], origin: Math.floor(Math.random() * D.origins.length), portrait: Math.floor(Math.random() * D.portraits.length), upload: null }),
      upload: () => uploadPortrait((url) => this.setState({ upload: url, portraitEye: null })),
      // Decision 113: where an uploaded portrait's eyes are, for the spotlight cut-in's torn strip (a live preview of the crop).
      hasUpload: !!S.upload, eyePct: Math.round((S.portraitEye ?? EYE_DEFAULT) * 100),
      onEye: (e) => this.setState({ portraitEye: Math.max(0.05, Math.min(0.7, Number(e.target.value) / 100)) }),
      eyePreview: eyePreviewStyle(S.upload, S.portraitEye ?? EYE_DEFAULT),
      back: set({ step: STEPS[Math.max(0, stepIdx - 1)][0] }), next: set({ step: STEPS[Math.min(STEPS.length - 1, stepIdx + 1)][0] }), atStart: stepIdx === 0, atEnd: stepIdx === STEPS.length - 1,
    };
  }

  /** The Belief step (Blessing 2.0, rules 1.6): Faithful or Atheist as two big cards; the Faithful pick one of the eight
   *  patrons (game/faithView.ts patronCards). Buttons only; the choice goes on the sheet. */
  beliefVals() {
    const S = this.state, b = S.belief, faithful = b && b.kind === 'faithful', faith = (S.skills || {}).faith || 0;
    const card = (on) => 'display: flex; flex-direction: column; gap: 8px; padding: 18px; border-radius: 14px; text-align: left; font-family: inherit; color: #E7EBF3; cursor: pointer; flex: 1 1 320px; '
      + (on ? 'border: 2px solid #FFFFFF; background: #1C2536' : 'border: 1px solid #2E3A50; background: #10151F');
    const pick = (x) => () => this.setState({ belief: x });
    const cards = patronCards().map((p) => {
      const on = faithful && b.patron === p.id;
      // The art: the patron's portrait (click to view it large); until it is painted, their mark on the dark ground.
      const art = patronPortrait(p.id), big = patronPortrait(p.id, true) || art;
      return { key: p.id, name: p.name, archetype: p.archetype, costume: p.costume, mark: p.mark, portrait: art || p.mark, hasPortrait: !!art,
        zoom: zoomer(this, big || p.mark, p.name + (p.archetype ? ' · ' + p.archetype : ''), art ? 'patron' : 'icon'),
        artStyle: 'width: 300px; border: 1px solid ' + (on ? '#FFFFFF' : '#232D3F'), imgStyle: art ? '' : 'object-fit: contain; padding: 48px; box-sizing: border-box',
        likes: p.likes.map((t) => ({ key: t, text: t })), taboos: p.taboos.map((t) => ({ key: t, text: t })), rule: p.ruleText, hymns: p.hymns.map((h, i) => ({ key: h, text: ['I', 'II', 'III'][i] + ' · ' + h })), miracle: p.miracle,
        pressed: on ? 'true' : 'false', pick: pick({ kind: 'faithful', patron: p.id }), btn: on ? '✓ Sworn to ' + p.name : 'Swear to ' + p.name,
        style: 'display: flex; gap: 16px; padding: 14px; border-radius: 12px; background: #10151F; border: ' + (on ? '2px solid #FFFFFF' : '1px solid #232D3F'),
        btnStyle: 'flex: none; min-height: 42px; border-radius: 10px; font-size: 14px; font-family: inherit; font-weight: 700; cursor: pointer; ' + (on ? 'border: 0; background: #E7EBF3; color: #0A0D13' : 'border: 1px solid #2E3A50; background: transparent; color: #E7EBF3') };
    });
    return {
      beliefFaithful: { pick: pick(faithful ? b : { kind: 'faithful', patron: (patronCards()[0] || {}).id }), pressed: faithful ? 'true' : 'false', style: card(faithful), text: BELIEF_TEXT.faithful },
      beliefAtheist: { pick: pick({ kind: 'atheist' }), pressed: b && b.kind === 'atheist' ? 'true' : 'false', style: card(b && b.kind === 'atheist'), text: BELIEF_TEXT.atheist },
      beliefNote: BELIEF_TEXT.faith3 + (faith < 3 ? ' You have Faith ' + faith + ' now: you can choose your belief, and pray once Faith reaches 3.' : ' You have Faith ' + faith + '.'),
      beliefChip: !b ? 'NOT CHOSEN · YOU START AS AN ATHEIST' : b.kind === 'atheist' ? 'ATHEIST · PILGRIM' : 'FAITHFUL · ' + ((patronCards().find((p) => p.id === b.patron) || {}).name || b.patron).toUpperCase(),
      showPatrons: !!faithful, patronCards: cards, faithInk: FAITH_INK,
    };
  }
  /** One change on the points step: apply it (remembering what was there, for Undo) or say why it is refused. */
  pointsDo(fn, hover) {
    const S = this.state, r = fn({ skills: S.skills, aSet: S.aSet }, fogOf(S.traits)), at = hover ? { hover } : {};
    if (!r.ok) { if (r.text) this.setState({ note: { kind: 'no', text: r.text }, ...at }); return r; }
    this.setState({ skills: r.skills, aSet: r.aSet, ...('applied' in r ? { applied: r.applied } : {}), note: { kind: 'ok', text: r.text }, ...at,
      hist: [...(S.hist || []), { skills: S.skills, aSet: S.aSet, applied: S.applied, what: r.what }].slice(-HIST_MAX) });
    return r;
  }
  /** Undo the last point (or the last reset): the sheet goes back to what it was before it. */
  pointsUndo() {
    const h = this.state.hist || [], last = h[h.length - 1];
    if (!last) return;
    this.setState({ skills: last.skills, aSet: last.aSet, applied: last.applied, hist: h.slice(0, -1), note: { kind: 'ok', text: 'Undone: ' + last.what + '.' } });
  }
  sheet() {
    const S = this.state, o = S.origin === null ? null : D.origins[S.origin];
    return { name: S.name.trim(), portrait: S.upload || D.portraits[S.portrait].img, ...(S.upload ? { portraitEye: Math.round((S.portraitEye ?? EYE_DEFAULT) * 100) / 100 } : {}), origin: o ? o.name : '', kit: S.kit || '', traits: [...S.traits], rulesRev: SHEET_REV,
      skills: { ...S.skills }, attrs: derive(S.skills, S.aSet).attr, cores: derive(S.skills, S.aSet).core, identity: { ...S.idv }, archetype: S.applied || null,
      // Blessing 2.0: Faithful (to a patron) or Atheist; not chosen reads as Atheist (the engine's rule for old saves).
      ...(S.belief ? { belief: { ...S.belief } } : {}),
      // Starting magic goes on the sheet only for a build that can cast; the engine fills in the defaults otherwise.
      ...(canSigilOf(S) ? { sigils: [...(S.sigils || [])] } : {}),
      ...((() => { const sl = startingTechniqueSlots({ skills: S.skills }); return sl.melee || sl.ranged ? { techniques: techPicksOf(S) } : {}; })()),
      ...(canSoulOf(S) ? { feelings: [...(S.feelings && S.feelings.length === 2 ? S.feelings : FEELING_START)] } : {}),
      ...(canSoulOf(S) ? { outburst: (() => { const ob = obOf(S); return { ...(ob.name.trim() ? { name: ob.name.trim() } : {}), school: ob.school, modules: [...ob.modules], ...(ob.option ? { option: ob.option } : {}), ...(ob.tone && ob.tone !== 'raw' ? { tone: ob.tone } : {}) }; })() } : {}) };
  }
  /** Lock in: validate, stamp the record, then file it (bring it to the room or save it to the library). A refused
   *  record gets no stamp, only the reason; a second press while the stamp is down does nothing. */
  lockIn() {
    if (this.state.stamp || this.locking) return;
    const sheet = this.sheet(), err = this.refusal(sheet);
    if (err) { sfx('error'); return toast(err); }
    this.locking = true;
    saveToLibrary(sheet);
    const motion = !reducedMotion();
    // On a narrow screen the button sits below the record: bring the record into view first, so the stamp is seen.
    const rec = typeof document !== 'undefined' && document.querySelector('[data-phc-record]');
    const r = rec && rec.getBoundingClientRect ? rec.getBoundingClientRect() : null;
    const away = !!r && typeof window !== 'undefined' && window.innerHeight > 0 && (r.top < 0 || r.top + Math.min(r.height, 260) > window.innerHeight);
    if (away) rec.scrollIntoView({ behavior: motion ? 'smooth' : 'auto', block: 'start' });
    const wait = away && motion ? 380 : 0;
    const stamp = () => {
      if (CreateLogic.current !== this) return;
      this.setState({ stamp: motion ? 'slam' : 'fade' });
      sfx('stamp', { delay: motion ? STAMP_LAND_MS - 10 : 0 });
      if (motion) setTimeout(shakePage, STAMP_LAND_MS);
      setTimeout(() => this.file(sheet), motion ? STAMP_MS : STAMP_MS_REDUCED);
    };
    if (wait) setTimeout(stamp, wait); else stamp();
  }
  /** Why the record can't be filed, checked before the stamp: the sheet's rules, and when it goes to a room's lobby, the
   *  room's own checks (size, two per player) on the room as this browser sees it, and a live link for a guest. */
  refusal(sheet) {
    const err = validateSheet(sheet); if (err) return err;
    const st = getState();
    if (!(st.code && st.game && st.game.phase === 'lobby')) return null;
    if (st.role === 'guest' && st.conn !== 'online') return 'Not connected to the room: wait for the link, or save it as a draft.';
    return st.me && st.game.players ? roomSheetError(st.game, st.me.id, sheet) : null;
  }
  /** After the stamp: bring the record into the room's lobby, or save it; leave the screen only if the player is still on it. */
  file(sheet) {
    const st = getState(), here = CreateLogic.current === this && st.screen === 'create';
    if (st.code && st.game && st.game.phase === 'lobby') { act({ type: 'char/add', sheet }); if (here) go('room', { draft: null }); }
    else { toast(sheet.name + ' is saved to your library.', true); if (here) go(st.code ? 'room' : 'home', { draft: null }); }
  }
  saveDraft() { const sheet = this.sheet(); if (!sheet.name) return toast('Give the draft a name first.'); saveToLibrary({ ...sheet, draft: true }); toast('Draft saved: ' + sheet.name, true); }
}

