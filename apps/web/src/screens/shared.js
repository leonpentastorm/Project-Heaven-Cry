// Shared screen helpers: the prototypes' D data, the EPCCG "?" pop-up, the lightbox and the Mastered card,
// ported from design/canvas-build/{epccg,lightbox}.logic.js. Screens import what they need.
import PD from '../game/protodata.json';
import epTpl from '../templates/epccg.template.html?raw';
import lbTpl from '../templates/lightbox.template.html?raw';
import mastTpl from '../templates/mastered.template.html?raw';

export const D = PD;
export const ATTR = {}; D.attrs.forEach((a) => { ATTR[a.id] = a; });
export const SK = {}; D.skills.forEach((s) => { SK[s.id] = s; });
export const mod = (p) => (p <= 0 ? -2 : p - 1);
export const fmt = (m) => (m > 0 ? '+' + m : m < 0 ? '−' + Math.abs(m) : '0');
export const IMG = D.img;

/** Expand the shared template pieces exactly as design/canvas-build/build.py does. */
export function expand(tpl) {
  let t = tpl.replace('<!--EPCCG-->', epTpl).replace('<!--LIGHTBOX-->', lbTpl);
  t = t.replace(/<!--MASTERED:([\w.]+)-->/g, (_, p) => mastTpl.replace(/X\./g, p + '.'));
  return t.replace(/__WICKMARK__/g, IMG['wick-welcome']).replace(/__WICK__/g, IMG['wick-mind-without-fog']).replace(/__SEAL__/g, IMG['emblem-ahoc-seal']);
}

// ---------- lightbox ----------
const LB_BIG = D.big || {};
const LB_KIND = { portrait: 'CHARACTER PORTRAIT', skill: 'SKILL PORTRAIT', icon: 'WICK ICON', perk: 'WICK PERK ICON', world: 'WORLD ILLUSTRATION' };
export function zoomer(self, img, caption, kind) { return () => { if (img) self.setState({ lb: { img: LB_BIG[img] || img, caption: caption || '', kind: kind || 'portrait' } }); }; }
export const zoomBtn = 'display: block; flex: none; padding: 0; border: 0; background: none; cursor: zoom-in; border-radius: inherit';
export function lightboxVals(self) {
  const L = self.state.lb, closeLb = () => self.setState({ lb: null });
  if (!L) return { lbOpen: false, closeLb, lb: { img: '', caption: '', kind: '', imgStyle: '' }, zoomBtn };
  const icon = L.kind === 'icon' || L.kind === 'perk';
  return { lbOpen: true, closeLb, zoomBtn, lb: { img: L.img, caption: L.caption, kind: LB_KIND[L.kind] || '',
    imgStyle: 'display: block; max-width: min(92vw, ' + (icon ? '512px' : '800px') + '); max-height: 80vh; object-fit: contain; border-radius: ' + (icon ? '16px; background: #10151F; padding: 24px' : '10px; background: #000') } };
}

// ---------- EPCCG "?" pop-up (ported verbatim from epccg.logic.js) ----------
const EP_SLOT = { alpha: 'α', beta: 'β', gamma: 'γ' };
const EP_BLANK = { zoom: () => {}, title: '', kicker: '', name: '', line: '', img: '', alt: '', pictured: '', caption: '', speaker: '', intro: '', quote: [], rows: [], perks: [], perkHead: '', perkNote: '', perkNameStyle: '', m: {}, combos: [], hasCombos: false, boxStyle: '', nameStyle: '', quoteStyle: '' };
export const epBtnStyle = (ink, extra) => 'display: grid; place-items: center; width: 28px; height: 28px; flex: none; padding: 0; border-radius: 50%; border: 1px solid ' + ink + '; background: rgba(10, 13, 19, 0.85); color: ' + ink + '; font-family: inherit; font-size: 14px; font-weight: 700; line-height: 1; cursor: pointer' + (extra ? '; ' + extra : '');
export const epRgba = (hex, a) => 'rgba(' + [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ') + ', ' + a + ')';
export function masteredVals(self, m, ink, skillName, pts) {
  const locked = typeof pts === 'number' && pts < 10, big = !locked;
  const corner = (v, h) => ({ style: 'position: absolute; ' + v + ': -5px; ' + h + ': 26px; width: 9px; height: 9px; transform: rotate(45deg); background: ' + ink + '; box-shadow: 0 0 0 3px #0C1018' });
  return {
    name: m.name, flavour: '“' + m.flavour + '”', text: m.text, meta: m.meta + ' · Automatic at 10 points',
    icon: m.icon, has: !!m.icon, none: !m.icon, zoom: m.icon ? zoomer(self, m.icon, m.name, 'perk') : () => {}, alt: m.name + ' Mastered perk icon (Wick)',
    kicker: '◆  MASTERED PERK · ' + skillName.toUpperCase() + ' 10  ◆', locked, lockLabel: locked ? 'LOCKED · ' + skillName.toUpperCase() + ' ' + pts + ' / 10' : '',
    pips: Array.from({ length: 10 }, (_, i) => ({ style: 'width: 8px; height: 8px; transform: rotate(45deg); box-sizing: border-box; ' + (i < pts ? 'background: ' + ink : 'border: 1px solid ' + epRgba(ink, 0.45)) })),
    corners: [corner('top', 'left'), corner('top', 'right'), corner('bottom', 'left'), corner('bottom', 'right')],
    boxStyle: 'position: relative; display: flex; flex-wrap: wrap; gap: 22px; align-items: center; padding: ' + (big ? '26px 28px' : '20px 22px') + '; border-radius: 14px; background: #0C1018; border: 1px solid ' + ink +
      '; box-shadow: inset 0 0 0 5px #0C1018, inset 0 0 0 6px ' + epRgba(ink, 0.4) + ', 0 0 36px ' + epRgba(ink, 0.16),
    ringStyle: 'display: grid; place-items: center; width: ' + (big ? 120 : 96) + 'px; height: ' + (big ? 120 : 96) + 'px; flex: none; border-radius: 50%; background: #10151F; border: 1px solid ' + ink +
      '; box-shadow: inset 0 0 0 5px #10151F, inset 0 0 0 6px ' + epRgba(ink, 0.5) + ', 0 0 22px ' + epRgba(ink, 0.28) + (locked ? '; opacity: 0.7' : ''),
    imgStyle: 'width: ' + (big ? 92 : 72) + 'px; height: ' + (big ? 92 : 72) + 'px',
    starStyle: 'display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: ' + (big ? 34 : 28) + 'px; line-height: 1; color: ' + ink,
    kickerStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.22em; color: ' + ink,
    nameStyle: 'margin: 0; font-family: \'Spectral\', serif; font-size: ' + (big ? 30 : 24) + 'px; font-weight: 600; line-height: 1.15; letter-spacing: 0.01em; color: ' + ink,
    ruleStyle: 'width: 64px; height: 1px; background: ' + ink,
  };
}
export function epccgVals(self) {
  const id = self.state.epccg, s = id && D.skills.find((x) => x.id === id);
  const closeEpccg = () => self.setState({ epccg: null });
  if (!s) return { epOpen: false, ep: EP_BLANK, closeEpccg };
  const e = s.ep, a = ATTR[s.attr], ink = a.ink;
  const same = e.speaker.indexOf(e.portrait.split(' ').slice(-1)[0]) >= 0;
  return { epOpen: true, closeEpccg, ep: {
    title: s.name + ': EPCCG entry', kicker: 'EPCCG · ARTICLE 5 · ENTRY ' + String(e.entry).padStart(2, '0'),
    name: s.name, line: EP_SLOT[s.slot] + ' skill of ' + a.name + ' · ' + s.core.charAt(0).toUpperCase() + s.core.slice(1),
    img: e.img, zoom: zoomer(self, e.img, e.portrait, 'portrait'), alt: e.portrait + ', First-Patch Revival portrait for ' + s.name, pictured: e.portrait,
    caption: same ? 'Speaks for ' + s.name + ' in the EPCCG.' : 'The one these words are about. Words by ' + e.speaker + '.',
    quote: e.quote.map((t) => { const stage = /^\*.*\*$/.test(t); return { text: stage ? t.slice(1, -1) : t.replace(/\*/g, ''),
      style: 'margin: 0; font-family: \'Spectral\', serif; line-height: 1.55; ' + (stage ? 'font-size: 14px; color: #A3AEC2; letter-spacing: 0.04em' : 'font-size: 17px; font-style: italic; color: #E7EBF3') }; }),
    speaker: '— ' + e.speaker, intro: e.intro,
    perks: e.perks.map((p) => ({ name: p.name, meta: p.meta, t1: p.t1, t2: p.t2, icon: p.icon, has: !!p.icon, none: !p.icon, zoom: p.icon ? zoomer(self, p.icon, p.name, 'perk') : () => {}, alt: p.name + ' perk icon (Wick)' })),
    perkHead: 'PERKS · ONE STEP AT EACH MASTERY LEVEL',
    perkNote: 'At 3, 5, 7 and 9 points in ' + s.name + ', take one step: one of these perks at Tier I, or a Tier I you hold upgraded to Tier II. By 9 points both are at Tier II. At 10, the Mastered perk is yours.',
    m: masteredVals(self, e.mastered, ink, s.name),
    hasCombos: e.combos.length > 0,
    combos: e.combos.map((c) => ({ name: c.name, text: c.text, deed: c.deed, icon: c.icon, has: !!c.icon, none: !c.icon,
      zoom: c.icon ? zoomer(self, c.icon, c.name, 'perk') : () => {}, alt: c.name + ' combo perk icon (Wick)',
      segs: c.skills.map((k) => ({ style: 'flex: 1; height: 4px; background: ' + k.ink })),
      chips: c.skills.map((k, i) => ({ plus: i > 0, label: k.name + ' ' + k.min,
        style: 'padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap; border: 1px solid ' + k.ink + '; color: ' + k.ink + (k.id === s.id ? '; background: ' + epRgba(k.ink, 0.16) : '') })) })),
    rows: [['EFFECT', e.effect], ['AT HIGH LEVELS', e.high], ['GOOD FOR', e.good], ['BAD FOR', e.bad]].filter((r) => r[1]).map(([k, v]) => ({ k, v: v.charAt(0).toUpperCase() + v.slice(1) })),
    boxStyle: 'width: min(960px, 100%); max-height: calc(100vh - 40px); overflow-y: auto; box-sizing: border-box; display: flex; flex-direction: column; gap: 18px; padding: 22px 24px; border-radius: 16px; background: #10151F; border: 1px solid #232D3F; border-top: 4px solid ' + ink,
    nameStyle: 'margin: 0; font-family: \'Spectral\', serif; font-size: 32px; font-weight: 600; color: ' + ink,
    quoteStyle: 'margin: 0; display: flex; flex-direction: column; gap: 8px; padding: 4px 0 4px 16px; border-left: 3px solid ' + ink,
  } };
}

/** Small shared bits for game chrome: player colour badge styles. */
export const badge = (color, size = 34) => 'display: grid; place-items: center; width: ' + size + 'px; height: ' + size + 'px; border-radius: 50%; flex: none; font-size: 12px; font-weight: 700; background: ' + color + '; color: #0A0D13';

// ---------- the body figure (Status: injuries; Gear: what's worn where) ----------
// A plain front-facing figure in a 120 × 240 box. The character's right side is on the viewer's left.
const BODY = {
  head: 'M44,22 a16,16 0 1,0 32,0 a16,16 0 1,0 -32,0 z',
  eyes: 'M45,17 h30 v7 h-30 z',
  torso: 'M38,44 h44 l6,8 v50 h-56 v-50 z',
  pelvis: 'M36,104 h48 v22 h-48 z',
  rArm: 'M20,50 h12 l-1,60 h-13 z', lArm: 'M88,50 h12 l2,60 h-13 z',
  rHand: 'M17,113 h15 v14 h-15 z', lHand: 'M88,113 h15 v14 h-15 z',
  rLeg: 'M37,128 h21 v84 h-19 z', lLeg: 'M62,128 h21 l-2,84 h-19 z',
  rFoot: 'M32,214 h26 v11 h-26 z', lFoot: 'M62,214 h26 v11 h-26 z',
};
/** Which parts of the figure each equipment slot covers (spec: Equipment slots). */
export const SLOT_PARTS = { main: [], off: [], head: ['head'], headAcc: ['eyes'], outer: ['torso'], inner: ['torso'], lower: ['pelvis'], legs: ['rLeg', 'lLeg'], hands: ['rHand', 'lHand'], feet: ['rFoot', 'lFoot'], veil: [], pack: [] };
const INJ_PARTS = { head: ['head'], torso: ['torso'], arm: { left: ['lArm', 'lHand'], right: ['rArm', 'rHand'] }, leg: { left: ['lLeg', 'lFoot'], right: ['rLeg', 'rFoot'] } };
export function bodyFigure({ worn = [], injuries = [], hot = [], mainSide = 'right', weapon = false, veil = false }) {
  const hurt = new Set(); injuries.forEach((i) => { const p = INJ_PARTS[i.loc]; (Array.isArray(p) ? p : p[i.side || 'right']).forEach((x) => hurt.add(x)); });
  const on = new Set(worn), hi = new Set(hot);
  const parts = Object.entries(BODY).filter(([k]) => k !== 'eyes' || on.has('eyes') || hi.has('eyes')).map(([k, d]) => ({ key: k, d,
    fill: hurt.has(k) ? 'rgba(246, 81, 87, 0.28)' : hi.has(k) ? '#2E3A50' : on.has(k) ? '#1C2536' : '#0D1119',
    stroke: hurt.has(k) ? '#F65157' : hi.has(k) ? '#FFFFFF' : on.has(k) ? '#E7EBF3' : '#3B475D', sw: hurt.has(k) || hi.has(k) ? '2.5' : '1.5' }));
  const hx = mainSide === 'left' ? 95 : 24;
  return { parts, weapon, weaponD: 'M' + hx + ',128 v34', veil, veilD: 'M60,0 C96,0 116,40 116,120 C116,200 96,238 60,238 C24,238 4,200 4,120 C4,40 24,0 60,0 z' };
}

// ---------- map tokens (minimap and area map) with a hover card ----------
export function tokenVals(u, opt) {
  const hpPct = Math.max(0, Math.min(100, Math.round(u.hp / Math.max(1, u.maxHp) * 100)));
  const word = u.dead ? 'DEAD' : u.downed ? 'DOWNED' : hpPct >= 100 ? 'UNHURT' : hpPct > 50 ? 'WOUNDED' : 'BADLY HURT';
  return {
    ally: !!opt.ally, foe: !opt.ally, img: u.img || '', hasImg: !!u.img, noImg: !u.img, short: u.short, name: u.name,
    sub: opt.ally ? opt.player : 'ENEMY · ' + (u.tier || 'hostile').toUpperCase(), subStyle: 'font-size: 10px; font-weight: 700; letter-spacing: 0.12em; color: ' + (opt.ally ? opt.color : '#F65157'),
    hp: u.hp + ' / ' + u.maxHp + ' HP', hpFill: 'height: 100%; width: ' + hpPct + '%; background: #F65157', state: word,
    stateStyle: 'font-size: 10px; font-weight: 700; letter-spacing: 0.12em; color: ' + (u.downed || u.dead ? '#F65157' : '#A3AEC2'),
    ap: opt.inFight && opt.ally ? 'AP ' + u.ap + ' · Movement ' + u.movement : '', hasAp: !!(opt.inFight && opt.ally),
    inj: (u.injuries || []).map((i) => ((i.side ? i.side + ' ' : '') + i.loc).toUpperCase()).concat(u.bleed ? ['BLEEDING'] : []).join(' · '), hasInj: !!((u.injuries || []).length || u.bleed),
    tokStyle: 'display: grid; place-items: center; width: 100%; height: 100%; border-radius: 50%; overflow: hidden; box-sizing: border-box; font-size: 9px; font-weight: 700; '
      + (opt.ally ? 'border: 2px solid ' + opt.color + '; background: #000' : 'border: 2px solid #F65157; background: #2A0F14; color: #F65157') + (u.downed || u.dead ? '; opacity: 0.45' : ''),
    popStyle: 'position: absolute; z-index: 30; ' + (opt.up ? 'bottom' : 'top') + ': calc(100% + 6px); ' + (opt.right ? 'right: 0' : 'left: 0') + '; width: 200px; flex-direction: column; gap: 6px; padding: 10px; border-radius: 10px; background: #10151F; border: 1px solid ' + (opt.ally ? opt.color : '#F65157') + '; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6); color: #E7EBF3; text-align: left; pointer-events: none',
  };
}
