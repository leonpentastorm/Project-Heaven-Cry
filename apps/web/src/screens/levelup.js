// Level up, ported from design/canvas-build/levelup.logic.js onto the real character: spend Skill and Attribute
// points under the tree's caps (a skill never above its attribute; an attribute never above the level's ceiling), take perk steps, and earn a class at level 3 (Class Roster Revision 3: the class
// of the highest attribute; on a tie, the player picks among the tied, and the pick is for good).
// Layout (Leon, 7 Nov 2026: "the level up screen is super lopsided"): at level 3 the class picker runs the full width
// on top (up to nine cards, three to a row, then a confirm bar: the choice is permanent); the right third is the class
// panel (emblem, name and rank, the class attribute with the progress to rank II at 5 and III at 8, the three ranks
// with both moves each and who runs them; while picking, a preview of the selected class). Narrow screens stack the
// class panel above the work.
// The work is the character tree (Leon, 9 Nov 2026: "skills lying next to each other in a row, cores sit below and
// perks strewn about, you can't even see which perk you already have from that skill tree"): each Core with its three
// Attributes, each Attribute with its three skills; each skill shows its points and modifier, its Mastery marks (3, 5,
// 7, 9, Mastered at 10), what its next point brings, and its perks attached: owned (Tier I or II), take now (a step is
// waiting: one click takes it), locked (until the next step), and the Mastered perk. Every number is the engine's
// (canRaise, pendingPerkSteps, the character's perks); one click is one engine action, as before.
import { DCLogic } from '../dc/runtime';
import { D, ATTR, SK, IMG, epccgVals, lightboxVals, zoomer, epBtnStyle, epRgba, ensureStyle, checkMod, ATTR_GIVES, SLOT_WORD, SLOT_ORDER, roadMap, nextLine, ceilingLine, perkRow } from './shared';
import { CLASS, PERKS, attrCapAt, attrCapLevel, canRaise, canRevertLevelUp, legendRoom, classRank, eligibleClasses, maxHp, pendingPerkSteps, SKILL, ADVANCED_SHELVED, doorForkView } from '@engine';
import { act, getState, go, homeScreen } from '../game/store';
import { emblemOf, classRanks, attributeProgress, closestClasses, classCard, advancedLive, ROMAN_RANK } from '../game/classView';
import { figmentLadderView } from '@engine';
import { figmentIconUri, FIG_LINE } from '../game/figmentIcons';
import { forkCard } from '../game/forkView';
import { foldVals } from '../game/fold';

// A skill's two acquired perks (perks.json), the ones its perk steps offer.
const ACQUIRED = {};
for (const p of PERKS) { const sk = p.skills && p.skills[0]; if (sk && p.tier === 'acquired') (ACQUIRED[sk] ||= []).push(p); }
/** The engine's refusal, with the attribute's name ("Needs agility 5" → "Needs Agility 5"). */
const nice = (why) => (why ? why.replace(/Needs (\w+) (\d+)/, (m, a, n) => 'Needs ' + (ATTR[a] ? ATTR[a].name : a) + ' ' + n) : '');
const LOCKED = '#7F8BA1';
/** Rules 1.34, 0.28.2: the Figments door's card (the skill figments.json visualizer.door names) says what its points
 *  open (the engine's ladder view): "New" with the forms' icons when these points reached a step, else the next step,
 *  locked with its points. Every other skill: none. */
export function figLevelUp(skillId, p) {
  const L = figmentLadderView(p || 0); if (skillId !== L.door) return { has: false, forms: [] };
  const just = L.latest && L.latest.points === p ? L.latest : null, nx = L.next;
  const look = (st, ink) => st.forms.map((f) => ({ key: f.id, name: f.name, icon: figmentIconUri(f.icon, ink), title: f.name + ': ' + f.text }));
  if (!just && !nx) return { has: false, forms: [] };
  const st = just || nx, shown = [...st.forms, ...(st.choose ? st.choose.of : [])]; // rules 1.56: a fork's forms too
  return { has: true, state: just ? 'new' : 'next', head: just ? 'NEW · FIGMENTS AT VISUALIZATION ' + p + (st.forms.length ? ': ' + st.forms.map((f) => f.name).join(', ') : '') : 'LOCKED · FIGMENTS AT VISUALIZATION ' + nx.points,
    headInk: just ? '#FFFFFF' : '#A3AEC2', forms: look({ forms: shown }, just ? FIG_LINE : '#7F8BA1'), hasForms: shown.length > 0, text: st.text,
    hasNext: !!(just && nx), next: just && nx ? 'Next, at Visualization ' + nx.points + ': ' + nx.text : '',
    style: 'display: flex; flex-direction: column; gap: 4px; padding: 6px 8px; border-radius: 8px; ' + (just ? 'border: 1px solid ' + FIG_LINE + '; background: rgba(83, 148, 172, 0.18)' : 'border: 1px dashed #2E3A50') };
}
// Who runs it, always in words (colour pairs with the word): solid for the engine, dashed for the Narrator.
const BADGE_INK = { engine: '#E7EBF3', both: '#C9D3E3', narrator: '#A3AEC2' };
const badgeStyle = (v) => 'flex: none; padding: 1px 8px; border-radius: 999px; font-size: var(--fs-sub); font-weight: 700; letter-spacing: 0.04em; white-space: nowrap; border: 1px ' + (v === 'narrator' ? 'dashed' : 'solid') + ' ' + BADGE_INK[v] + '; color: ' + BADGE_INK[v];
ensureStyle('phc-levelup', [
  '.phc-lu-head{position:sticky;top:0;z-index:5;background:#0A0D13}',
  '.phc-lu-body{flex:1;display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,280px);gap:20px;padding:8px 28px 24px;align-items:start}',
  '.phc-lu-class{position:sticky;top:96px}',
  '.phc-lu-pick{display:flex;flex-direction:column;gap:14px;padding:24px 32px 0}',
  '.phc-lu-pick-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(max(280px,calc((100% - 24px) / 3)),1fr));gap:12px}',
  '.phc-lu-confirm{position:sticky;bottom:0;z-index:3;display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;padding:12px 132px 12px 16px;border-radius:12px;background:#10151F;border:1px solid #232D3F;box-shadow:0 -8px 24px rgba(10,13,19,0.85)}',
  '@media (max-width:1000px){.phc-lu-pick{padding:16px 16px 0}}',
  '@media (max-width:1000px){.phc-lu-body{grid-template-columns:minmax(0,1fr);padding:12px 16px}.phc-lu-class{order:-1;position:static}}',
  '.phc-lu-raise:not(:disabled):hover{background:#FFFFFF!important;color:#0A0D13!important}',
  '.phc-lu-choice:hover{background:#FFFFFF!important;color:#0A0D13!important}',
  '.phc-lu-row{display:flex;align-items:center;gap:10px;min-width:0}',
  '.phc-lu-row .phc-lu-next{flex:1 1 0;min-width:0}',
  '.phc-lu-row{flex-wrap:wrap}.phc-lu-row .phc-lu-next{min-width:200px}',
  '.phc-lu-pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px}',
  '@keyframes phc-lu-gain{0%{opacity:0;transform:translateY(4px)}15%{opacity:1;transform:none}80%{opacity:1}100%{opacity:0}}',
  '.phc-lu-gain{animation:phc-lu-gain 1.6s ease-out forwards}',
  '@media (prefers-reduced-motion:reduce){.phc-lu-gain{animation:none}}',
  // The floating ♪ and ◈ buttons (bottom left, every screen) sat over the rows' left edge: level up is a short focused
  // screen with its own way back, so they step aside while it is open (the music plays on).
  'html:has(.phc-lu-body) [data-phc-float]{display:none!important}',
].join(''));

export class LevelUpLogic extends DCLogic {
  constructor(props) { super(props); this.state = {}; }
  /** After a +1, the row says what was gained for a moment, at the place clicked. */
  flash(id, text) { if (!text) return; this.setState({ flash: { id, text } }); clearTimeout(this._fl); this._fl = setTimeout(() => this.setState({ flash: null }), 1600); }
  renderVals() {
    const st = getState(), g = st.game, c = g && g.characters[st.levelupChar];
    if (!c || c.owner !== st.me.id) { queueMicrotask(() => go(g ? homeScreen(g) : 'home')); return { ...lightboxVals(this), ...epccgVals(this), classCards: [], tree: [], toChoose: [], ch: {}, pick: {}, cls: { sig: [], ranks: [], closest: [] } }; }
    const choosing = c.level >= 3 && !c.classId;
    // ---------- the class choice at level 3 (Class Roster Revision 3): every class of the highest attribute, ties all
    // offered; a card selects, the confirm bar commits (the class is for good) ----------
    const offered = choosing ? eligibleClasses(c) : [], onlyOne = offered.length === 1;
    const sel = choosing ? (offered.some((t) => t.id === this.state.pickCls) ? this.state.pickCls : onlyOne ? offered[0].id : null) : null;
    const classCards = offered.map((t) => { const v = classCard(c, t.id), on = sel === t.id, ink = D.core[v.core];
      return { ...v, key: v.id, pick: () => this.setState({ pickCls: v.id }), pressed: on ? 'true' : 'false', label: v.name + ', ' + v.attributeName + ' ' + v.value + (on ? ', selected' : ''),
        attr: v.attributeName.toUpperCase() + ' ' + v.value, attrStyle: 'flex: none; margin-left: auto; padding: 2px 10px; border-radius: 999px; font-size: var(--fs-sub); font-weight: 700; letter-spacing: 0.08em; border: 1px solid ' + v.attrInk + '; color: ' + v.attrInk,
        coreLine: v.core.toUpperCase() + ' CLASS · ' + v.skills.join(' · '), nameStyle: 'font-size: 22px; font-weight: 700; line-height: 1.1; color: ' + ink,
        moves: v.moves.map((m) => ({ ...m, head: m.name + (m.ap ? ' · ' + m.ap : '') })),
        style: 'display: flex; flex-direction: column; align-items: stretch; gap: 8px; min-width: 0; text-align: left; padding: 14px 16px; border-radius: 12px; font-family: inherit; color: #E7EBF3; cursor: pointer; background: ' + (on ? '#1C2536' : '#10151F') + '; border: 2px solid ' + (on ? ink : '#232D3F') + (on ? '; box-shadow: 0 0 0 1px ' + ink + '55, 0 0 24px ' + ink + '22' : '') }; });
    const selK = sel ? CLASS[sel] : null, tiedAttrs = offered.map((t) => ATTR[t.attribute]?.name || t.attribute);
    const pick = !choosing ? {} : {
      intro: onlyOne ? 'Your highest attribute is ' + tiedAttrs[0] + ' ' + offered[0].total + ', so the ' + CLASS[offered[0].id].name + ' has found you.'
        : offered.length === 9 ? 'All nine attributes are tied at ' + offered[0].total + ', so every class is open to you. Choose the one you mean to be.'
          : tiedAttrs.slice(0, -1).join(', ') + ' and ' + tiedAttrs[tiedAttrs.length - 1] + ' are tied at ' + offered[0].total + ' as your highest attributes: choose among their classes.',
      hint: c.unspent.attr ? 'You still have Attribute points to spend below: raising an attribute first can change what is on offer.' : '',
      hasHint: !!c.unspent.attr, count: offered.length + (offered.length === 1 ? ' CLASS ON OFFER' : ' CLASSES ON OFFER'),
      hasSel: !!sel, noSel: !sel, confirmLabel: selK ? 'Become ' + (/^[AEIOU]/.test(selK.name) ? 'an ' : 'a ') + selK.name : '', selIcon: sel ? emblemOf(sel).icon : '',
      confirm: () => { if (sel) { act({ type: 'levelup/class', charId: c.id, classId: sel }); this.setState({ pickCls: null }); } },
      confirmStyle: 'min-height: 44px; display: inline-flex; align-items: center; gap: 8px; padding: 0 18px; border-radius: 10px; border: 0; background: #FFFFFF; color: #0A0D13; font-family: inherit; font-size: 15px; font-weight: 700; cursor: pointer',
    };
    // ---------- spend first (docs/design/handoffs/2026-11-18-skill-screens-redesign.md section 2): one family on screen
    // (BODY / MIND / SOUL tabs), an attribute row then its three skills, one row a skill: name, points, a big +1, the one
    // line its next point gives (shared.js nextLine, the ladder's own row), a chip for a waiting perk step or fork that
    // opens just that choice under the row, the reason for a refused +1 on its row. Every number is the engine's. ----------
    const pend = {}; for (const x of pendingPerkSteps(c)) pend[x.skill] = x;
    const held = (id) => (c.perks || []).find((h) => h.id === id) || null;
    const inFight = g.phase === 'combat', redraw = () => this.setState({ foldTick: Date.now() });
    const raiseStyle = (ok, ink, big) => 'flex: none; min-width: ' + (big ? 40 : 34) + 'px; min-height: ' + (big ? 40 : 32) + 'px; padding: 0 8px; border-radius: 10px; font-family: inherit; font-size: var(--fs-body); font-weight: 700; cursor: ' + (ok ? 'pointer' : 'not-allowed') + '; border: 1px solid ' + (ok ? ink : '#2E3A50') + '; background: ' + (ok ? epRgba(ink, 0.12) : 'transparent') + '; color: ' + (ok ? ink : LOCKED);
    const chipStyle = (ink, solid) => 'flex: none; padding: 2px 8px; border-radius: 999px; font-size: var(--fs-sub); font-weight: 700; letter-spacing: 0.06em; white-space: nowrap; border: 1px ' + (solid ? 'solid' : 'dashed') + ' ' + ink + '; color: ' + ink;
    const famOf = {}; D.attrs.forEach((a) => { famOf[a.id] = a.core; });
    const forkPend = (id) => { const v = (() => { try { return doorForkView(c, id); } catch { return null; } })(); return v ? v.steps.filter((s) => s.pending) : []; };
    const skillRow = (s) => {
      const p = c.skills[s.id] || 0, a = ATTR[s.attr], ink = a.ink, why = canRaise(c, 'skill', s.id), x = pend[s.id], fp = forkPend(s.id);
      const nxt = nextLine(s.id, p), [tag, slotWords] = SLOT_WORD[s.slot] || ['', ''];
      // a refused +1: its reason on this row only, with a way to fix it when an Attribute point would ("Raise Agility")
      const needAttr = !!why && /^Needs \w+ \d+/.test(why) && !!c.unspent.attr && !canRaise(c, 'attr', a.id);
      const waits = (x ? x.free || 1 : 0) + fp.length, fl = this.state.flash && this.state.flash.id === s.id ? this.state.flash.text : '';
      return { key: s.id, img: s.img, name: s.name, pts: p, tag, tagTitle: slotWords, mod: (checkMod(s.id, p) >= 0 ? '+' : '') + checkMod(s.id, p),
        cls: 'phc-lu-skill' + (x ? ' phc-lu-step' : '') + (fp.length ? ' phc-lu-forkwait' : ''), help: () => this.setState({ epccg: s.id }), helpStyle: epBtnStyle(ink),
        canRaise: !!c.unspent.skill, blocked: !!why, why: nice(why), hasWhy: !!(why && c.unspent.skill && p < 10), raiseLabel: 'Raise ' + s.name,
        raise: () => { const gain = nextLine(s.id, c.skills[s.id] || 0); act({ type: 'levelup/raise', charId: c.id, kind: 'skill', id: s.id }); this.flash(s.id, gain); }, raiseStyle: raiseStyle(!why, ink, true),
        hasFix: needAttr, fixLabel: 'Raise ' + a.name, fix: () => act({ type: 'levelup/raise', charId: c.id, kind: 'attr', id: a.id }),
        fixStyle: 'flex: none; min-height: 30px; padding: 0 12px; border-radius: 999px; font-family: inherit; font-size: var(--fs-sub); font-weight: 700; cursor: pointer; border: 1px solid ' + a.ink + '; background: transparent; color: ' + a.ink,
        // a refused +1 shows its reason in the place of the next line (what the point gives stays on the "?" page)
        hasNext: !!nxt, showNext: !!nxt && !(why && c.unspent.skill && p < 10), next: nxt, nextAt: p + 1,
        // a waiting perk step or fork: a white chip on the row; it opens that choice in the chooser panel (never in the row)
        hasChip: waits > 0, chip: '◆ ' + (x ? (x.free > 1 ? x.free + ' perk steps' : 'Perk step') : '') + (x && fp.length ? ' · ' : '') + (fp.length ? (fp.length > 1 ? fp.length + ' forks' : 'Fork') : ''),
        chipExpanded: 'false', toggleChoice: () => this.setState({ chooser: fp.length ? 'fork:' + s.id + ':' + fp[0].at : 'perk:' + s.id, armPerk: null }),
        chipStyle: 'flex: none; min-height: 30px; padding: 0 12px; border-radius: 999px; font-family: inherit; font-size: var(--fs-sub); font-weight: 700; letter-spacing: 0.04em; cursor: pointer; white-space: nowrap; border: 1px solid #FFFFFF; background: transparent; color: #FFFFFF',
        hasFlash: !!fl, flash: fl, fig: ((f) => (f.has && f.state === 'new' ? f : { has: false, forms: [] }))(figLevelUp(s.id, p)), // the Figments a point just opened, with their icons
        nameStyle: 'font-size: var(--fs-body); font-weight: 700; line-height: 1.15; color: ' + ink, tagStyle: 'font-size: var(--fs-sub); font-weight: 700; letter-spacing: 0.08em; color: ' + ink,
        style: 'display: flex; flex-direction: column; gap: 4px; padding: 1px 8px; border-radius: 10px; background: #0A0D13; border: 1px solid ' + (waits ? '#FFFFFF' : '#232D3F') + '; border-left: 3px solid ' + ink };
    };
    const cap = attrCapAt(c.level), ceil = ceilingLine(c.level);
    const waitingIn = (k) => D.skills.some((s) => famOf[s.attr] === k && (pend[s.id] || forkPend(s.id).length));
    const fam = ['body', 'mind', 'soul'].includes(this.state.fam) ? this.state.fam : ['body', 'mind', 'soul'].find(waitingIn) || 'body';
    const famTabs = ['body', 'mind', 'soul'].map((k) => { const on = k === fam, w = D.skills.filter((s) => famOf[s.attr] === k).reduce((n, s) => n + (pend[s.id] ? pend[s.id].free || 1 : 0) + forkPend(s.id).length, 0);
      return { key: k, name: k.toUpperCase(), selected: on ? 'true' : 'false', pick: () => this.setState({ fam: k }), hasWait: w > 0, wait: '◆ ' + w,
        style: 'min-height: 34px; padding: 0 18px; border-radius: 10px 10px 0 0; font-family: inherit; font-size: var(--fs-body); font-weight: 700; letter-spacing: 0.14em; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; border: 1px solid ' + (on ? D.core[k] : '#232D3F') + '; border-bottom: 0; background: ' + (on ? '#10151F' : 'transparent') + '; color: ' + (on ? D.core[k] : '#A3AEC2') }; });
    const tree = [fam].map((k) => {
      const ink = D.core[k];
      return { key: k, name: k.toUpperCase(), label: k.charAt(0).toUpperCase() + k.slice(1), ceil,
        style: 'display: flex; flex-direction: column; gap: 6px; padding: 8px 12px; border-radius: 0 12px 12px 12px; background: #10151F; border: 1px solid ' + ink,
        attrs: D.attrs.filter((a) => a.core === k).map((a) => { const aw = canRaise(c, 'attr', a.id), v = c.attrs[a.id] || 1;
          return { key: a.id, name: a.name.toUpperCase(), val: v, cap: 'Skills up to ' + v,
            next: v >= 10 ? 'Top' : ATTR_GIVES[a.id],
            open: () => this.setState({ epccg: null, attrPage: a.id }), openLabel: a.name + ': what it gives', openStyle: 'padding: 0; border: 0; background: none; font-family: inherit; cursor: pointer; text-decoration: underline dotted; text-underline-offset: 3px; font-size: var(--fs-body); font-weight: 700; letter-spacing: 0.1em; color: ' + a.ink,
            canRaise: !!c.unspent.attr, blocked: !!aw, why: nice(aw), hasWhy: !!(aw && c.unspent.attr && v < 10), raise: () => { act({ type: 'levelup/raise', charId: c.id, kind: 'attr', id: a.id }); this.flash('attr:' + a.id, ATTR_GIVES[a.id]); }, raiseStyle: raiseStyle(!aw, a.ink, true), raiseLabel: 'Raise ' + a.name,
            hasFlash: !!(this.state.flash && this.state.flash.id === 'attr:' + a.id), flash: this.state.flash && this.state.flash.id === 'attr:' + a.id ? this.state.flash.text : '',
            valStyle: 'font-size: 22px; font-weight: 700; line-height: 1; min-width: 26px; text-align: center; color: ' + a.ink,
            skills: D.skills.filter((sk) => sk.attr === a.id).sort((x, y) => SLOT_ORDER[x.slot] - SLOT_ORDER[y.slot]).map(skillRow) }; }) };
    });
    // ---------- the class panel (the held class, or while picking a preview of the selected one) ----------
    const id = c.classId || sel, preview = !c.classId && !!sel, k = id ? CLASS[id] : null;
    const pc = preview ? { ...c, classId: sel } : c, rank = id ? classRank(pc) : 0, prog = id ? attributeProgress(c, id) : null, em = emblemOf(id);
    const moveRow = (m) => ({ ...m, badgeStyle: m.badge ? badgeStyle(m.verdict) : 'display: none', hasUses: !!m.uses, hasUnlock: !m.earned && !preview, meta: m.ap,
      nameStyle: 'font-size: var(--fs-body); font-weight: 700; color: ' + (m.earned ? '#E7EBF3' : '#7F8BA1'),
      style: 'display: flex; flex-direction: column; gap: 4px; padding: 10px; border-radius: 10px; background: #0A0D13; border: 1px solid ' + (m.earned ? em.ink : '#232D3F') + (m.earned ? '' : '; opacity: 0.6') });
    const ranks = id ? classRanks(g, pc, id).map((r) => ({ ...r, key: r.rank, state: r.unlocked ? (preview ? '✓ WITH THE CLASS' : '✓ UNLOCKED') : 'LOCKED',
      stateStyle: 'font-size: var(--fs-sub); font-weight: 700; letter-spacing: 0.12em; color: ' + (r.unlocked ? '#6FEA77' : '#FFFFFF'), moves: r.moves.map(moveRow) })) : [];
    const closest = !id && c.level < 3 ? closestClasses(c, 4).map((x) => ({ ...x, key: x.id, tag: x.offered ? 'LEADS' : '', hasTag: x.offered, nameStyle: 'font-size: var(--fs-body); font-weight: 700; color: ' + x.ink,
      sigStyle: 'font-size: var(--fs-sub); font-weight: 700; color: ' + x.attrInk,
      style: 'display: grid; grid-template-columns: 32px minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 8px 10px; border-radius: 10px; background: #0A0D13; border: 1px solid ' + (x.offered ? x.ink : '#232D3F') })) : [];
    const cls = {
      has: !!id, none: !id, icon: em.icon, ink: em.ink, preview, kicker: preview ? 'PREVIEW · NOT CHOSEN YET' : 'CLASS',
      name: id ? k.name : c.level >= 3 ? 'Choose your class' : 'No class yet',
      nameStyle: "font-family: 'Spectral', serif; font-size: 34px; font-weight: 600; line-height: 1.05; color: " + (id ? em.ink : '#E7EBF3'),
      rank: id ? 'RANK ' + ROMAN_RANK[rank] : '', rankStyle: 'font-size: 22px; font-weight: 700; letter-spacing: 0.14em; color: #E7EBF3',
      sub: id ? k.core.toUpperCase() + ' · ' + (k.tagline || '') : c.level >= 3 ? 'Pick one of the classes above, then confirm.' : 'Your class finds you at level 3 (250 XP): the class of your highest attribute (on a tie, you choose). Until then, these lead.',
      sig: prog ? prog.skills.map((s) => ({ key: s.id, name: s.name, pts: s.pts, style: 'font-size: var(--fs-sub); font-weight: 700; color: ' + ATTR[SK[s.id].attr].ink })) : [],
      total: prog ? prog.label : '', totalStyle: 'font-size: var(--fs-sub); font-weight: 700; letter-spacing: 0.14em; color: ' + (prog ? prog.ink : '#A3AEC2'), nextLine: prog ? prog.nextLine : '',
      bar: prog ? 'height: 100%; border-radius: 99px; background: ' + (prog.ink) + '; width: ' + prog.pct + '%' : '',
      movesHead: '',
      ranks, closest, hasClosest: closest.length > 0,
      // Advanced classes are shelved (Class Roster Revision 3): one quiet line, nothing to learn.
      advNote: ADVANCED_SHELVED, hasAdvNote: !!c.classId && !advancedLive(),
      // the panel folds to one line (its class, rank and the next rank's need); open while a class is being chosen
      fold: foldVals('levelup:class', { byRule: !!c.classId, redraw }),
      line: id ? k.name + ' ' + ROMAN_RANK[rank] + (prog && prog.nextLine ? ' · ' + prog.nextLine : '') : c.level >= 3 ? 'Choose your class' : 'Class at level 3',
    };
    // ---------- TO CHOOSE (docs/design/handoffs/2026-11-18-skill-screens-redesign.md section 4 item 5): one chip a choice
    // waiting, in a fixed order (Class, then forks, then perk steps, each named with its skill); a chip opens its chooser
    // as ONE centred panel over the screen, with "Next choice" when more wait. Every choice is the engine's. ----------
    const nameOf = (id) => (SKILL[id] && SKILL[id].name) || id;
    const queue = [
      ...(choosing ? [{ key: 'class', kind: 'class', text: 'Class' }] : []),
      ...D.skills.flatMap((s) => forkPend(s.id).map((f) => ({ key: 'fork:' + s.id + ':' + f.at, kind: 'fork', skill: s.id, at: f.at, text: 'Fork · ' + s.name }))),
      ...pendingPerkSteps(c).map((x) => ({ key: 'perk:' + x.skill, kind: 'perk', skill: x.skill, text: (x.free > 1 ? x.free + ' perk steps' : 'Perk step') + ' · ' + nameOf(x.skill) })),
    ];
    const cur = queue.find((q) => q.key === this.state.chooser) || null, openCh = (key) => this.setState({ chooser: key, armPerk: null });
    const toChoose = queue.map((q) => ({ key: q.key, kind: q.kind, text: q.text, open: () => openCh(q.key), expanded: cur && cur.key === q.key ? 'true' : 'false',
      style: 'min-height: 30px; padding: 0 12px; border-radius: 999px; font-family: inherit; font-size: var(--fs-sub); font-weight: 700; cursor: pointer; white-space: nowrap; border: 1px solid #FFFFFF; '
        + (cur && cur.key === q.key ? 'background: #FFFFFF; color: #0A0D13' : 'background: transparent; color: #FFFFFF') }));
    const after = cur ? queue.find((q) => q.key !== cur.key) : null;
    const chBtn = 'min-height: 36px; padding: 0 14px; border-radius: 10px; border: 1px solid #2E3A50; background: transparent; color: #E7EBF3; font-family: inherit; font-size: var(--fs-body); font-weight: 700; cursor: pointer';
    const ch = { open: !!cur, kind: cur ? cur.kind : '', isPerk: !!cur && cur.kind === 'perk', isFork: !!cur && cur.kind === 'fork', isClass: !!cur && cur.kind === 'class',
      title: !cur ? '' : cur.kind === 'class' ? 'Your class has found you' : cur.kind === 'fork' ? 'Fork at ' + cur.at + ' · ' + nameOf(cur.skill) : 'Perk step · ' + nameOf(cur.skill),
      hasNext: !!after, next: () => (after ? openCh(after.key) : null), close: () => this.setState({ chooser: null, armPerk: null }), btnStyle: chBtn,
      perks: [], armed: false, confirmText: '', confirm: () => {}, back: () => this.setState({ armPerk: null }), forkOpts: [],
      okStyle: 'min-height: 36px; padding: 0 16px; border-radius: 10px; border: 0; background: #FFFFFF; color: #0A0D13; font-family: inherit; font-size: var(--fs-body); font-weight: 700; cursor: pointer' };
    if (ch.isPerk) {
      // the skill's perks as rows, one button on each legal row (Take: tier I; Upgrade: tier II), a one-line confirm
      const x = pend[cur.skill], ink = ATTR[SK[cur.skill].attr].ink, armed = this.state.armPerk;
      ch.perks = (ACQUIRED[cur.skill] || []).map((pk) => { const h = held(pk.id), legal = x && x.choices.find((y) => y.id === pk.id);
        return perkRow(pk.id, { held: h ? h.tier : '', ink, on: armed === pk.id, why: legal ? '' : h && h.tier === 'II' ? 'Tier II' : 'Not now',
          act: legal ? { label: legal.tier === 'I' ? 'Take' : 'Upgrade', aria: (legal.tier === 'I' ? 'Take ' : 'Upgrade ') + pk.name, click: () => this.setState({ armPerk: pk.id }) } : null }); });
      const a = armed && x && x.choices.find((y) => y.id === armed), pk = a ? PERKS.find((q) => q.id === armed) : null;
      if (a && pk) { ch.armed = true; ch.confirmText = (a.tier === 'I' ? 'Take ' + pk.name : 'Upgrade ' + pk.name + ' to II') + '? Kept for good.';
        ch.confirm = () => { act({ type: 'levelup/perk', charId: c.id, perkId: pk.id }); this.setState({ armPerk: null }); }; }
    }
    if (ch.isFork) {
      // two columns: icon, name, the one line, the cost line if any, Choose (the fork view arms, then confirms)
      const fk = forkCard(c, cur.skill, { inFight, only: [cur.at], rerender: () => this.setState({ forkArm: Date.now() }) });
      ch.forkOpts = fk && fk.steps[0] ? fk.steps[0].opts.map((o) => ({ ...o, cost: '', hasCost: false })) : [];
    }
    const left = c.unspent.skill, attrLeft = c.unspent.attr;
    const owed = pendingPerkSteps(c).reduce((n, x) => n + (x.free || 1), 0); // steps owed, not skills (a 2→5 jump owes two)
    const forksOwed = D.skills.reduce((n, s) => n + forkPend(s.id).length, 0);
    const allDone = queue.length === 0; // Done is lit when the strip is empty (unspent points keep)
    const budgetChip = (n, word, ink) => ({ key: word, text: n + ' ' + word, style: 'padding: 4px 12px; border-radius: 999px; font-size: var(--fs-body); font-weight: 700; white-space: nowrap; border: 1px solid ' + (n ? '#FFFFFF' : '#2E3A50') + '; color: ' + (n ? '#FFFFFF' : ink) });
    return {
      ...epccgVals(this, (id) => c.skills[id] || 0, c, { noNarrator: !!g.run }), ...lightboxVals(this), zoomPc: zoomer(this, c.portrait, c.name, 'portrait'), pc: c.portrait, name: c.name,
      kicker: c.xp.toLocaleString() + ' XP', title: 'LEVEL ' + c.level, hpChip: 'MAX HP ' + maxHp(c),
      // the header is the budget, always in view: what is left to spend (the rules behind its "?")
      budget: [budgetChip(left, 'Skill', '#7F8BA1'), budgetChip(attrLeft, 'Attribute', '#7F8BA1'), budgetChip(owed, owed === 1 ? 'Perk step' : 'Perk steps', '#7F8BA1'),
        ...(forksOwed ? [budgetChip(forksOwed, forksOwed === 1 ? 'Fork' : 'Forks', '#7F8BA1')] : [])],
      spend: [left ? left + ' Skill point' + (left > 1 ? 's' : '') : '', attrLeft ? attrLeft + ' Attribute point' + (attrLeft > 1 ? 's' : '') : ''].filter(Boolean).join(' · ') || 'Nothing to spend',
      choosing, classCards, pick, cls,
      famTabs, tree, toChoose, hasToChoose: toChoose.length > 0, ch,
      ceil: 'Attributes: ' + ceil + (cap < 10 ? ' (' + [8, 9, 10].filter((n) => n > cap).map((n) => n + ' from level ' + attrCapLevel(n)).join(', ') + ')' : '') + (cap < 10 && legendRoom(c) > 0 ? ' · your Legendary Deed lets one Attribute go 1 above it' : ''),
      rules: "A skill can't be higher than the attribute above it, and an attribute can't pass the ceiling for your level; 10 is the top. At 3, 5, 7 and 9 points in a skill: one perk step. Odd levels: +2 Skill points. Even levels: +1 Skill point and +1 Attribute point. Unspent points keep.",
      // Take back what this visit spent (points and perk steps), until a fight or a class settles it.
      canRevert: !canRevertLevelUp(g, c), revert: () => act({ type: 'levelup/revert', charId: c.id }),
      revertStyle: 'min-height: 44px; padding: 0 16px; border-radius: 12px; border: 1px solid #A3AEC2; background: transparent; color: #E7EBF3; font-family: inherit; font-size: var(--fs-body); font-weight: 700; cursor: pointer',
      done: () => go(homeScreen(g), { levelupChar: null }), doneLabel: 'Done', notDone: !allDone, doneAria: allDone ? 'Done' : 'Done: ' + queue.length + ' still to choose',
      doneStyle: 'min-height: 44px; padding: 0 18px; border-radius: 12px; border: 0; font-family: inherit; font-size: var(--fs-body); font-weight: 700; ' + (allDone ? 'cursor: pointer; background: #6FEA77; color: #0A0D13' : 'cursor: not-allowed; background: #1C2536; color: #7F8BA1'),
      laterStyle: 'min-height: 44px; padding: 0 16px; border-radius: 12px; border: 1px solid #A3AEC2; background: transparent; color: #E7EBF3; font-family: inherit; font-size: var(--fs-body); font-weight: 700; cursor: pointer',
    };
  }
}
