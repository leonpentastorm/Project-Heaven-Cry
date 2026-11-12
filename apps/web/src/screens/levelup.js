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
import { D, ATTR, SK, IMG, epccgVals, lightboxVals, zoomer, epBtnStyle, ensureStyle, checkMod, ATTR_GIVES, SLOT_WORD, SLOT_ORDER, perPoint, ceilingLine } from './shared';
import { CLASS, PERK, PERKS, attrCapAt, attrCapLevel, canRaise, canRevertLevelUp, legendRoom, classRank, eligibleClasses, maxHp, pendingPerkSteps, SKILL, verdictFor } from '@engine';
import { act, getState, go } from '../game/store';
import { emblemOf, classRanks, attributeProgress, closestClasses, classCard, advancedLive, ROMAN_RANK } from '../game/classView';

const PERK_ICON = {};
D.skills.forEach((s) => { s.ep.perks.forEach((p) => { PERK_ICON[p.id] = p.icon; }); if (s.ep.mastered) PERK_ICON[s.ep.mastered.id] = s.ep.mastered.icon; });
// A skill's perks (perks.json): its two acquired perks (Tier I, then II) and its Mastered perk.
const ACQUIRED = {}, MASTERED = {};
for (const p of PERKS) { const sk = p.skills && p.skills[0]; if (!sk) continue; if (p.tier === 'acquired') (ACQUIRED[sk] ||= []).push(p); else if (p.tier === 'mastered') MASTERED[sk] = p; }
const STEP_AT = [3, 5, 7, 9];
/** The engine's refusal, with the attribute's name ("Needs agility 5" → "Needs Agility 5"). */
const nice = (why) => (why ? why.replace(/Needs (\w+) (\d+)/, (m, a, n) => 'Needs ' + (ATTR[a] ? ATTR[a].name : a) + ' ' + n) : '');
const OWNED = '#6FEA77', LOCKED = '#7F8BA1';
const dia = (n, filled, color) => Array.from({ length: n }, (_, i) => ({ style: 'width: 8px; height: 8px; transform: rotate(45deg); box-sizing: border-box; ' + (i < filled ? 'background: ' + color : 'border: 1px solid #3B475D') }));
const chip = (ok) => 'padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; letter-spacing: 0.1em; border: 1px solid ' + (ok ? '#6FEA77' : '#FFFFFF') + '; color: ' + (ok ? '#6FEA77' : '#FFFFFF');
const MASTERY = [[3, 'M1'], [5, 'M2'], [7, 'M3'], [9, 'M4'], [10, 'Mastered']];
const mLevel = (p) => MASTERY.filter(([n]) => p >= n).map(([, w]) => w).pop() || '';
// Who runs it, always in words (colour pairs with the word): solid for the engine, dashed for the Narrator.
const BADGE_INK = { engine: '#E7EBF3', both: '#C9D3E3', narrator: '#A3AEC2' };
const badgeStyle = (v) => 'flex: none; padding: 1px 8px; border-radius: 999px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; white-space: nowrap; border: 1px ' + (v === 'narrator' ? 'dashed' : 'solid') + ' ' + BADGE_INK[v] + '; color: ' + BADGE_INK[v];
ensureStyle('phc-levelup', [
  '.phc-lu-body{flex:1;display:grid;grid-template-columns:minmax(0,2fr) minmax(320px,1fr);gap:24px;padding:24px 32px;align-items:start}',
  '.phc-lu-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}',
  '.phc-lu-pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}',
  '.phc-lu-class{position:sticky;top:16px}',
  '.phc-lu-pick{display:flex;flex-direction:column;gap:14px;padding:24px 32px 0}',
  '.phc-lu-pick-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(max(280px,calc((100% - 24px) / 3)),1fr));gap:12px}',
  '.phc-lu-confirm{position:sticky;bottom:0;z-index:3;display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;padding:12px 132px 12px 16px;border-radius:12px;background:#10151F;border:1px solid #232D3F;box-shadow:0 -8px 24px rgba(10,13,19,0.85)}',
  '@media (max-width:1000px){.phc-lu-pick{padding:16px 16px 0}}',
  '@media (max-width:1400px){.phc-lu-steps{grid-template-columns:repeat(2,minmax(0,1fr))}}',
  '@media (max-width:1000px){.phc-lu-body{grid-template-columns:minmax(0,1fr);padding:16px}.phc-lu-class{order:-1;position:static}}',
  '@media (max-width:640px){.phc-lu-steps{grid-template-columns:minmax(0,1fr)}}',
  '@media (max-width:420px){.phc-lu-pair{grid-template-columns:minmax(0,1fr)}}',
  '.phc-lu-attrs{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}',
  '.phc-lu-raise:not(:disabled):hover{background:#FFFFFF!important;color:#0A0D13!important}',
  '.phc-lu-choice:hover{background:#FFFFFF!important;color:#0A0D13!important}',
  '.phc-lu-perk{display:grid;grid-template-columns:22px minmax(0,1fr) auto;gap:8px;align-items:center;min-height:30px}',
  // The tree's first column runs down the left edge, where the floating ♪ and ◈ buttons sit (bottom left, every screen):
  // at any scroll they covered a skill's portrait, its +1 or a Core's name. Level up is a short focused screen with its
  // own way back, so they step aside while it is open (the music plays on; they are back on the story screen).
  'html:has(.phc-lu-body) [data-phc-float]{display:none!important}',
].join(''));

export class LevelUpLogic extends DCLogic {
  constructor(props) { super(props); this.state = {}; }
  renderVals() {
    const st = getState(), g = st.game, c = g && g.characters[st.levelupChar];
    if (!c || c.owner !== st.me.id) { queueMicrotask(() => go(g ? (g.phase === 'combat' ? 'combat' : 'main') : 'home')); return { ...lightboxVals(this), ...epccgVals(this), classCards: [], tree: [], steps: [], pick: {}, cls: { sig: [], ranks: [], closest: [] } }; }
    const choosing = c.level >= 3 && !c.classId;
    // ---------- the class choice at level 3 (Class Roster Revision 3): every class of the highest attribute, ties all
    // offered; a card selects, the confirm bar commits (the class is for good) ----------
    const offered = choosing ? eligibleClasses(c) : [], onlyOne = offered.length === 1;
    const sel = choosing ? (offered.some((t) => t.id === this.state.pickCls) ? this.state.pickCls : onlyOne ? offered[0].id : null) : null;
    const classCards = offered.map((t) => { const v = classCard(c, t.id), on = sel === t.id, ink = D.core[v.core];
      return { ...v, key: v.id, pick: () => this.setState({ pickCls: v.id }), pressed: on ? 'true' : 'false', label: v.name + ', ' + v.attributeName + ' ' + v.value + (on ? ', selected' : ''),
        attr: v.attributeName.toUpperCase() + ' ' + v.value, attrStyle: 'flex: none; margin-left: auto; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; border: 1px solid ' + v.attrInk + '; color: ' + v.attrInk,
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
    // ---------- the character tree: the three families (headings only) → Attributes → Skills, each skill with its perks ----------
    const pend = {}; for (const x of pendingPerkSteps(c)) pend[x.skill] = x;
    const held = (id) => (c.perks || []).find((h) => h.id === id) || null;
    const raiseStyle = (ok, ink) => 'flex: none; min-width: 34px; min-height: 30px; padding: 0 8px; border-radius: 8px; font-family: inherit; font-size: 13px; font-weight: 700; cursor: ' + (ok ? 'pointer' : 'not-allowed') + '; border: 1px solid ' + (ok ? ink : '#2E3A50') + '; background: transparent; color: ' + (ok ? ink : LOCKED);
    const chipStyle = (ink, solid) => 'flex: none; padding: 2px 8px; border-radius: 999px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em; white-space: nowrap; border: 1px ' + (solid ? 'solid' : 'dashed') + ' ' + ink + '; color: ' + ink;
    const perkRow = (pk, x, p) => {
      const h = held(pk.id), ch = x ? x.choices.find((y) => y.id === pk.id) : null, nextAt = STEP_AT.find((n) => n > p);
      const tier = ch ? ch.tier : h && h.tier === 'II' ? 'II' : 'I', t = (pk.tiers[tier] || pk.tiers.I || {}).text || pk.text || '', v = verdictFor('perk:' + pk.id, tier);
      // What you hold always shows (✓ Tier I / II); a waiting step adds its button beside it (Take, or Upgrade to II).
      const state = h ? 'owned' : ch ? 'available' : 'locked';
      const label = ch ? (ch.tier === 'I' ? 'Take · Tier I' : 'Upgrade · Tier II') : '';
      const chip = h ? '✓ TIER ' + (h.tier === 'II' ? 'II' : 'I') : ch ? '' : nextAt ? 'LOCKED · ' + nextAt + ' PTS' : 'NO STEP LEFT';
      // The visible words first (speech input says what it sees), then which perk of which skill.
      const aria = ch ? label + ': ' + pk.name + ' (' + ((SKILL[x.skill] && SKILL[x.skill].name) || x.skill) + ')' : '';
      return { key: pk.id, name: pk.name, aria, icon: PERK_ICON[pk.id] || IMG['wick-mind-without-fog'], state, can: !!ch, label, chip, hasChip: !!chip,
        title: pk.name + (ch ? ' · ' + (ch.tier === 'I' ? 'Tier I' : 'Tier II') : h ? ' · Tier ' + (h.tier === 'II' ? 'II' : 'I') + ' (yours)' : ' · locked') + ': ' + t + ' (' + v.label + ')',
        // What it does shows for a waiting step and for what you hold (readable on touch and by keyboard, not only on
        // hover); a locked perk keeps it in the title and the skill's "?" EPCCG entry.
        text: ch || h ? t.charAt(0).toUpperCase() + t.slice(1) : '', hasText: !!(ch || h),
        textStyle: 'grid-column: 2 / -1; font-size: 11.5px; line-height: 1.4; color: ' + (ch ? '#C9D3E3' : '#A3AEC2'),
        pick: () => act({ type: 'levelup/perk', charId: c.id, perkId: pk.id }),
        nameStyle: 'font-size: 12.5px; font-weight: 700; line-height: 1.2; min-width: 0; overflow-wrap: anywhere; color: ' + (state === 'locked' ? LOCKED : '#E7EBF3'),
        iconStyle: 'width: 22px; height: 22px; object-fit: contain' + (state === 'locked' ? '; opacity: 0.4; filter: grayscale(1)' : ''),
        chipStyle: state === 'owned' ? chipStyle(OWNED, true) : chipStyle(LOCKED, false),
        btnStyle: 'flex: none; padding: 3px 10px; border-radius: 999px; font-family: inherit; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; cursor: pointer; white-space: nowrap; border: 1px solid #FFFFFF; background: #1C2536; color: #FFFFFF' };
    };
    const skillCard = (s) => {
      const p = c.skills[s.id] || 0, ink = ATTR[s.attr].ink, why = canRaise(c, 'skill', s.id), x = pend[s.id], free = x ? x.free || 1 : 0;
      const m = MASTERED[s.id], mh = m ? held(m.id) : null, un = (SKILL[s.id] && SKILL[s.id].unlocks) || {}, np = p + 1;
      const brings = np > 10 ? '' : [STEP_AT.includes(np) ? 'M' + (STEP_AT.indexOf(np) + 1) + ': a perk step' : np === 10 ? 'Mastered: ' + (m ? m.name : 'its Mastered perk') : '', un[np] && un[np].name && np <= 5 ? 'unlocks ' + un[np].name : ''].filter(Boolean).join(' · ');
      const [tag, slotWords] = SLOT_WORD[s.slot] || ['', ''];
      return { key: s.id, img: s.img, name: s.name, pts: p, tag, tagTitle: slotWords, tagStyle: 'font-size: 10px; font-weight: 700; letter-spacing: 0.1em; color: ' + ink, give: 'Each point: ' + perPoint(s.id), mod: (checkMod(s.id, p) >= 0 ? '+' : '') + checkMod(s.id, p),
        cls: 'phc-lu-skill' + (free ? ' phc-lu-step' : ''), help: () => this.setState({ epccg: s.id }), helpStyle: epBtnStyle(ink),
        canRaise: !!c.unspent.skill, blocked: !!why, why: nice(why), raise: () => act({ type: 'levelup/raise', charId: c.id, kind: 'skill', id: s.id }), raiseStyle: raiseStyle(!why, ink), raiseLabel: 'Raise ' + s.name,
        hasWhy: !!(why && c.unspent.skill && p < 10), hasNext: !!(c.unspent.skill && !why && brings), next: 'Next point (' + np + '): ' + brings,
        marks: [...STEP_AT, 10].map((n, i) => ({ key: n, label: i < 4 ? 'M' + (i + 1) : '★', title: (i < 4 ? 'M' + (i + 1) + ' (a perk step)' : 'Mastered (the Mastered perk)') + ' at ' + n + ' points',
          style: 'flex: 1; text-align: center; padding: 1px 0; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; ' + (p >= n ? 'background: ' + ink + '; color: #0A0D13' : 'border: 1px solid #2E3A50; color: ' + LOCKED) })),
        hasSteps: free > 0, stepsLine: '◆ ' + free + ' PERK STEP' + (free > 1 ? 'S' : '') + ' TO TAKE',
        perks: (ACQUIRED[s.id] || []).map((pk) => perkRow(pk, x, p)),
        hasMastered: !!m, mName: m ? m.name : '', mIcon: m ? PERK_ICON[m.id] || IMG['wick-mind-without-fog'] : '', mHeld: !!mh, mLabel: mh ? '✓ MASTERED' : 'AT 10 PTS',
        mTitle: m ? m.name + ' · Mastered' + (mh ? ' (yours)' : ' · at 10 points') + ': ' + (m.text || m.flavour || '') : '',
        mNameStyle: 'font-size: 12.5px; font-weight: 700; line-height: 1.2; min-width: 0; overflow-wrap: anywhere; color: ' + (mh ? '#F2C46A' : LOCKED),
        mIconStyle: 'width: 22px; height: 22px; object-fit: contain' + (mh ? '' : '; opacity: 0.4; filter: grayscale(1)'), mChipStyle: mh ? chipStyle('#F2C46A', true) : chipStyle(LOCKED, false),
        nameStyle: 'font-size: 14px; font-weight: 700; line-height: 1.15; color: ' + ink,
        style: 'display: flex; flex-direction: column; gap: 8px; padding: 10px; border-radius: 10px; background: #0A0D13; border: 1px solid ' + (free ? '#FFFFFF' : '#232D3F') + '; border-left: 3px solid ' + ink + (free ? '; box-shadow: 0 0 0 1px rgba(255,255,255,0.25)' : '') };
    };
    const cap = attrCapAt(c.level), ceil = ceilingLine(c.level);
    const tree = ['body', 'mind', 'soul'].map((k) => {
      const ink = D.core[k];
      return { key: k, name: k.toUpperCase(), label: k.charAt(0).toUpperCase() + k.slice(1), about: (D.coreText && D.coreText[k] && D.coreText[k][0]) || '', ceil,
        nameStyle: 'font-size: 16px; font-weight: 700; letter-spacing: 0.14em; color: ' + ink,
        style: 'display: flex; flex-direction: column; gap: 12px; padding: 14px 16px; border-radius: 14px; background: #10151F; border: 1px solid #232D3F; border-top: 3px solid ' + ink,
        attrs: D.attrs.filter((a) => a.core === k).map((a) => { const aw = canRaise(c, 'attr', a.id), v = c.attrs[a.id] || 1;
          return { key: a.id, name: a.name, val: v, pips: dia(10, v, a.ink).map((d, i) => (i >= cap ? { style: d.style + '; opacity: 0.35' } : d)), cap: 'Its skills go up to ' + v + '.',
            // What a point gives (the creation step's lines), and the change before the point is placed.
            next: v >= 10 ? 'At 10, the top. Each point gave: ' + ATTR_GIVES[a.id] + '.' : v >= cap ? 'At ' + v + ', the ' + ceil + '. Each point: ' + ATTR_GIVES[a.id] + '.' : 'Next point (' + (v + 1) + '): ' + ATTR_GIVES[a.id] + '.',
            open: () => this.setState({ epccg: null, attrPage: a.id }), openLabel: a.name + ': what it gives', openStyle: 'padding: 0; border: 0; background: none; font-family: inherit; cursor: pointer; text-decoration: underline dotted; text-underline-offset: 3px; font-size: 13px; font-weight: 700; letter-spacing: 0.1em; color: ' + a.ink,
            canRaise: !!c.unspent.attr, blocked: !!aw, why: nice(aw), hasWhy: !!(aw && c.unspent.attr && v < 10), raise: () => act({ type: 'levelup/raise', charId: c.id, kind: 'attr', id: a.id }), raiseStyle: raiseStyle(!aw, a.ink), raiseLabel: 'Raise ' + a.name,
            nameStyle: 'font-size: 13px; font-weight: 700; letter-spacing: 0.1em; color: ' + a.ink, valStyle: 'font-size: 20px; font-weight: 700; line-height: 1; color: ' + a.ink,
            skills: D.skills.filter((sk) => sk.attr === a.id).sort((x, y) => SLOT_ORDER[x.slot] - SLOT_ORDER[y.slot]).map(skillCard) }; }) };
    });
    // ---------- the perk steps waiting (the skill cards hold them; these jump there) ----------
    const steps = pendingPerkSteps(c).map((x) => ({ key: x.skill, name: SKILL[x.skill].name, n: x.free || 1,
      go: () => { const el = document.querySelector('.phc-lu-skill[data-skill="' + x.skill + '"]'); if (!el) return; if (el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const b = el.querySelector('button.phc-lu-choice'); if (b) b.focus({ preventScroll: true }); },
      style: 'padding: 3px 10px; border-radius: 999px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; background: transparent; border: 1px solid ' + ATTR[SK[x.skill].attr].ink + '; color: ' + ATTR[SK[x.skill].attr].ink }));
    // ---------- the class panel (the held class, or while picking a preview of the selected one) ----------
    const id = c.classId || sel, preview = !c.classId && !!sel, k = id ? CLASS[id] : null;
    const pc = preview ? { ...c, classId: sel } : c, rank = id ? classRank(pc) : 0, prog = id ? attributeProgress(c, id) : null, em = emblemOf(id);
    const moveRow = (m) => ({ ...m, badgeStyle: badgeStyle(m.verdict), hasUses: !!m.uses, hasUnlock: !m.earned && !preview, meta: m.ap,
      nameStyle: 'font-size: 14px; font-weight: 700; color: ' + (m.earned ? '#E7EBF3' : '#7F8BA1'),
      style: 'display: flex; flex-direction: column; gap: 4px; padding: 10px; border-radius: 10px; background: #0A0D13; border: 1px solid ' + (m.earned ? em.ink : '#232D3F') + (m.earned ? '' : '; opacity: 0.6') });
    const ranks = id ? classRanks(g, pc, id).map((r) => ({ ...r, key: r.rank, state: r.unlocked ? (preview ? '✓ WITH THE CLASS' : '✓ UNLOCKED') : 'LOCKED',
      stateStyle: 'font-size: 10.5px; font-weight: 700; letter-spacing: 0.12em; color: ' + (r.unlocked ? '#6FEA77' : '#FFFFFF'), moves: r.moves.map(moveRow) })) : [];
    const closest = !id && c.level < 3 ? closestClasses(c, 4).map((x) => ({ ...x, key: x.id, tag: x.offered ? 'LEADS' : '', hasTag: x.offered, nameStyle: 'font-size: 14px; font-weight: 700; color: ' + x.ink,
      sigStyle: 'font-size: 11px; font-weight: 700; color: ' + x.attrInk,
      style: 'display: grid; grid-template-columns: 32px minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 8px 10px; border-radius: 10px; background: #0A0D13; border: 1px solid ' + (x.offered ? x.ink : '#232D3F') })) : [];
    const cls = {
      has: !!id, none: !id, icon: em.icon, ink: em.ink, preview, kicker: preview ? 'PREVIEW · NOT CHOSEN YET' : 'CLASS',
      name: id ? k.name : c.level >= 3 ? 'Choose your class' : 'No class yet',
      nameStyle: "font-family: 'Spectral', serif; font-size: 34px; font-weight: 600; line-height: 1.05; color: " + (id ? em.ink : '#E7EBF3'),
      rank: id ? 'RANK ' + ROMAN_RANK[rank] : '', rankStyle: 'font-size: 22px; font-weight: 700; letter-spacing: 0.14em; color: #E7EBF3',
      sub: id ? k.core.toUpperCase() + ' · ' + (k.tagline || '') : c.level >= 3 ? 'Pick one of the classes above, then confirm.' : 'Your class finds you at level 3 (250 XP): the class of your highest attribute (on a tie, you choose). Until then, these lead.',
      sig: prog ? prog.skills.map((s) => ({ key: s.id, name: s.name, pts: s.pts, style: 'font-size: 13px; font-weight: 700; color: ' + ATTR[SK[s.id].attr].ink })) : [],
      total: prog ? prog.label : '', totalStyle: 'font-size: 12px; font-weight: 700; letter-spacing: 0.14em; color: ' + (prog ? prog.ink : '#A3AEC2'), nextLine: prog ? prog.nextLine : '',
      bar: prog ? 'height: 100%; border-radius: 99px; background: ' + (prog.ink) + '; width: ' + prog.pct + '%' : '',
      movesHead: k ? 'MOVES · RANK II AT ' + (ATTR[k.attribute]?.name || k.attribute).toUpperCase() + ' 5 AND LEVEL 6, RANK III AT 8 AND LEVEL 12' : '',
      ranks, closest, hasClosest: closest.length > 0,
      // Advanced classes are shelved (Class Roster Revision 3): one quiet line, nothing to learn.
      advNote: 'Advanced classes are being rebuilt.', hasAdvNote: !!c.classId && !advancedLive(),
    };
    const left = c.unspent.skill;
    const owed = pendingPerkSteps(c).reduce((n, x) => n + (x.free || 1), 0); // steps owed, not skills (a 2→5 jump owes two)
    const allDone = !left && !c.unspent.attr && !choosing && !steps.length;
    return {
      ...epccgVals(this), ...lightboxVals(this), zoomPc: zoomer(this, c.portrait, c.name, 'portrait'), pc: c.portrait, name: c.name,
      kicker: 'LEVEL ' + c.level + ' · ' + c.xp.toLocaleString() + ' XP', title: c.name + (choosing ? ' reaches level ' + c.level : ' grows'), hpChip: 'MAX HP ' + maxHp(c),
      pointChip: left ? '◆ ' + left + ' SKILL POINT' + (left > 1 ? 'S' : '') : '✓ SKILL POINTS SPENT', pointChipStyle: chip(!left),
      stepChip: owed ? '◆ ' + owed + ' PERK STEP' + (owed > 1 ? 'S' : '') : '✓ NO PERK STEPS', stepChipStyle: chip(!steps.length),
      classChip: c.classId ? '✓ ' + k.name.toUpperCase() + ' ' + ROMAN_RANK[rank] : c.level >= 3 ? '◆ CHOOSE A CLASS' : 'CLASS AT LEVEL 3', classChipStyle: chip(!!c.classId || c.level < 3), hasClassIcon: !!c.classId, classIcon: em.icon,
      choosing, classCards, pick, cls,
      tree, steps, hasSteps: steps.length > 0,
      spend: [left ? left + ' Skill point' + (left > 1 ? 's' : '') : '', c.unspent.attr ? c.unspent.attr + ' Attribute point' + (c.unspent.attr > 1 ? 's' : '') : ''].filter(Boolean).join(' · ') || 'Nothing to spend',
      ceil: 'Attributes: ' + ceil + (cap < 10 ? ' (' + [8, 9, 10].filter((n) => n > cap).map((n) => n + ' from level ' + attrCapLevel(n)).join(', ') + ')' : '') + (cap < 10 && legendRoom(c) > 0 ? ' · your Legendary Deed lets one Attribute go 1 above it' : ''),
      spendHead: left || c.unspent.attr ? 'TO SPEND' : 'ALL POINTS SPENT',
      rules: 'A skill can\'t be higher than the attribute above it, and an attribute can\'t pass the ceiling for your level; 10 is the top. Each Mastery level (3, 5, 7, 9 points) gives one perk step: one of the skill\'s two perks at Tier I, or a Tier I raised to Tier II. 10 points give the skill\'s Mastered perk.',
      stepsHead: owed ? 'PERK STEPS WAITING · ' + owed : '',
      pointsNote: 'Odd levels: +2 Skill points. Even levels: +1 Skill point and +1 Attribute point. Unspent points keep.',
      // Take back what this visit spent (points and perk steps), until a fight or a class settles it.
      canRevert: !canRevertLevelUp(g, c), revert: () => act({ type: 'levelup/revert', charId: c.id }),
      revertStyle: 'min-height: 44px; padding: 0 16px; border-radius: 12px; border: 1px solid #A3AEC2; background: transparent; color: #E7EBF3; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer',
      done: () => go(g.phase === 'combat' ? 'combat' : 'main', { levelupChar: null }), doneLabel: g.phase === 'combat' ? (allDone ? 'Done · back to the fight' : 'Back to the fight (finish later)') : allDone ? 'Done · back to the story' : 'Back to the story (finish later)',
      doneStyle: 'min-height: 44px; padding: 0 18px; border-radius: 12px; border: 0; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; ' + (allDone ? 'background: #6FEA77; color: #0A0D13' : 'background: #1C2536; color: #E7EBF3'),
    };
  }
}
