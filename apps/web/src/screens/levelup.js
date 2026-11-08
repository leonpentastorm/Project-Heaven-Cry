// Level up, ported from design/canvas-build/levelup.logic.js onto the real character: spend skill, Attribute and
// Core points under the tree's caps, take perk steps, and earn a class at level 3 (Class Roster Revision 3: the class
// of the highest attribute; on a tie, the player picks among the tied, and the pick is for good).
// Layout (Leon, 7 Nov 2026: "the level up screen is super lopsided"): at level 3 the class picker runs the full width
// on top (up to nine cards, three to a row, then a confirm bar: the choice is permanent); below it the left two thirds
// hold the work (the perk steps as a 3-column grid of cards with both choices side by side, skill points, then
// Attributes and Cores); the right third is the class panel (emblem, name and rank, the class attribute with the
// progress to rank II at 5 and III at 8, the three ranks with both moves each and who runs them; while picking, a
// preview of the selected class). Narrow screens stack the class panel above the work.
import { DCLogic } from '../dc/runtime';
import { D, ATTR, SK, IMG, epccgVals, lightboxVals, zoomer, epBtnStyle, ensureStyle } from './shared';
import { CLASS, PERK, canRaise, classRank, eligibleClasses, maxHp, pendingPerkSteps, SKILL, verdictFor } from '@engine';
import { act, getState, go } from '../game/store';
import { emblemOf, classRanks, attributeProgress, closestClasses, classCard, advancedLive, ROMAN_RANK } from '../game/classView';

const WORDS = ['', 'FEEBLE', 'WEAK', 'AVERAGE', 'GOOD', 'GREAT', 'EXCEPTIONAL', 'LEGENDARY', 'LEGENDARY', 'LEGENDARY', 'LEGENDARY'];
const PERK_ICON = {};
D.skills.forEach((s) => s.ep.perks.forEach((p) => { PERK_ICON[p.id] = p.icon; }));
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
].join(''));

export class LevelUpLogic extends DCLogic {
  constructor(props) { super(props); this.state = {}; }
  renderVals() {
    const st = getState(), g = st.game, c = g && g.characters[st.levelupChar];
    if (!c || c.owner !== st.me.id) { queueMicrotask(() => go(g ? (g.phase === 'combat' ? 'combat' : 'main') : 'home')); return { ...lightboxVals(this), ...epccgVals(this), classCards: [], skillRows: [], coreRows: [], steps: [], attrBtns: [], coreBtns: [], nextSteps: [], pick: {}, cls: { sig: [], ranks: [], closest: [] } }; }
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
      hint: c.unspent.attr || c.unspent.core ? 'You still have Attribute or Core points to spend below: raising an attribute first can change what is on offer.' : '',
      hasHint: !!(c.unspent.attr || c.unspent.core), count: offered.length + (offered.length === 1 ? ' CLASS ON OFFER' : ' CLASSES ON OFFER'),
      hasSel: !!sel, noSel: !sel, confirmLabel: selK ? 'Become ' + (/^[AEIOU]/.test(selK.name) ? 'an ' : 'a ') + selK.name : '', selIcon: sel ? emblemOf(sel).icon : '',
      confirm: () => { if (sel) { act({ type: 'levelup/class', charId: c.id, classId: sel }); this.setState({ pickCls: null }); } },
      confirmStyle: 'min-height: 44px; display: inline-flex; align-items: center; gap: 8px; padding: 0 18px; border-radius: 10px; border: 0; background: #FFFFFF; color: #0A0D13; font-family: inherit; font-size: 15px; font-weight: 700; cursor: pointer',
    };
    // ---------- skill points ----------
    const skillRows = D.skills.map((s) => {
      const p = c.skills[s.id] || 0, why = canRaise(c, 'skill', s.id), ink = ATTR[s.attr].ink, cap = c.attrs[s.attr];
      return { key: s.id, img: s.img, name: s.name, pts: p, blocked: !!why, why: why || '', note: why && c.unspent.skill ? why : ATTR[s.attr].name + ' ' + cap,
        pick: () => act({ type: 'levelup/raise', charId: c.id, kind: 'skill', id: s.id }), help: () => this.setState({ epccg: s.id }), helpStyle: epBtnStyle(ink),
        nameStyle: 'font-size: 14px; font-weight: 700; color: ' + (why ? '#7F8BA1' : ink),
        style: 'flex: 1; min-width: 0; display: flex; gap: 10px; align-items: center; padding: 8px 10px; border-radius: 10px; font-family: inherit; color: #E7EBF3; cursor: pointer; background: #0A0D13; border: 1px solid #232D3F' + (why ? '; opacity: 0.6' : '') };
    });
    // ---------- Cores, Attributes ----------
    const coreRows = ['body', 'mind', 'soul'].map((k) => ({ key: k, name: k.toUpperCase(), word: WORDS[c.cores[k]], val: c.cores[k], dia: dia(10, c.cores[k], D.core[k]),
      nameStyle: 'font-size: 16px; font-weight: 700; letter-spacing: 0.1em; color: ' + D.core[k], valStyle: 'font-size: 32px; font-weight: 700; line-height: 1; color: ' + D.core[k] }));
    const btn = (on, color) => 'min-height: 40px; border-radius: 8px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; border: 1px solid ' + (on ? color : '#232D3F') + '; background: transparent; color: ' + (on ? color : '#7F8BA1');
    const attrBtns = D.attrs.map((a) => { const why = canRaise(c, 'attr', a.id); return { key: a.id, label: a.name + ' ' + c.attrs[a.id] + ' ›', blocked: !!why, why: why || '', pick: () => act({ type: 'levelup/raise', charId: c.id, kind: 'attr', id: a.id }), style: btn(!why, a.ink) }; });
    const coreBtns = ['body', 'mind', 'soul'].map((k) => { const why = canRaise(c, 'core', k); return { key: k, label: k.toUpperCase() + ' ' + c.cores[k] + ' ›', blocked: !!why, why: why || '', pick: () => act({ type: 'levelup/raise', charId: c.id, kind: 'core', id: k }), style: btn(!why, D.core[k]) }; });
    // ---------- perk steps: one card per skill step, its choices side by side ----------
    const steps = pendingPerkSteps(c).map((x) => { const ink = ATTR[SK[x.skill].attr].ink, p = c.skills[x.skill] || 0;
      return { key: x.skill, img: SK[x.skill].img, head: SKILL[x.skill].name.toUpperCase(), sub: p + ' points · ' + mLevel(p) + ' · take one step', headStyle: 'font-size: 13px; font-weight: 700; letter-spacing: 0.12em; color: ' + ink,
        style: 'display: flex; flex-direction: column; gap: 10px; padding: 12px; border-radius: 12px; background: #10151F; border: 1px solid #232D3F; border-top: 3px solid ' + ink,
        choices: x.choices.map((ch) => { const pk = PERK[ch.id], t = pk.tiers[ch.tier].text, v = verdictFor('perk:' + ch.id, ch.tier);
          return { key: ch.id + ch.tier, name: pk.name, tier: ch.tier === 'I' ? 'Tier I' : 'Upgrade to Tier II', text: t.charAt(0).toUpperCase() + t.slice(1), icon: PERK_ICON[ch.id] || IMG['wick-mind-without-fog'],
            badge: v.label, badgeStyle: badgeStyle(v.verdict), pick: () => act({ type: 'levelup/perk', charId: c.id, perkId: ch.id }),
            style: 'display: flex; flex-direction: column; gap: 6px; align-items: flex-start; min-width: 0; padding: 10px; border-radius: 10px; border: 1px solid #2E3A50; background: #0A0D13; color: #E7EBF3; font-family: inherit; text-align: left; cursor: pointer' }; }) };
    });
    // With no step waiting: the trained skills closest to their next Mastery level.
    const nextSteps = steps.length ? [] : D.skills.map((s) => ({ s, p: c.skills[s.id] || 0 })).filter((x) => x.p > 0 && x.p < 10)
      .map((x) => { const nx = MASTERY.find(([n]) => n > x.p); return { key: x.s.id, name: x.s.name, at: nx[0], gap: nx[0] - x.p, word: nx[1], style: 'font-size: 12px; font-weight: 700; color: ' + ATTR[x.s.attr].ink }; })
      .sort((a, b) => a.gap - b.gap).slice(0, 3).map((x) => ({ ...x, line: x.word + ' at ' + x.at + ' points (' + x.gap + ' more)' }));
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
      movesHead: k ? 'MOVES · RANK II AT ' + (ATTR[k.attribute]?.name || k.attribute).toUpperCase() + ' 5, RANK III AT 8' : '',
      ranks, closest, hasClosest: closest.length > 0,
      // Advanced classes are shelved (Class Roster Revision 3): one quiet line, nothing to learn.
      advNote: 'Advanced classes are being rebuilt.', hasAdvNote: !!c.classId && !advancedLive(),
    };
    const left = c.unspent.skill;
    const owed = pendingPerkSteps(c).reduce((n, x) => n + (x.free || 1), 0); // steps owed, not skills (a 2→5 jump owes two)
    const allDone = !left && !c.unspent.attr && !c.unspent.core && !choosing && !steps.length;
    return {
      ...epccgVals(this), ...lightboxVals(this), zoomPc: zoomer(this, c.portrait, c.name, 'portrait'), pc: c.portrait, name: c.name,
      kicker: 'LEVEL ' + c.level + ' · ' + c.xp.toLocaleString() + ' XP', title: c.name + (choosing ? ' reaches level ' + c.level : ' grows'), hpChip: 'MAX HP ' + maxHp(c),
      pointChip: left ? '◆ ' + left + ' SKILL POINT' + (left > 1 ? 'S' : '') : '✓ SKILL POINTS SPENT', pointChipStyle: chip(!left),
      stepChip: owed ? '◆ ' + owed + ' PERK STEP' + (owed > 1 ? 'S' : '') : '✓ NO PERK STEPS', stepChipStyle: chip(!steps.length),
      classChip: c.classId ? '✓ ' + k.name.toUpperCase() + ' ' + ROMAN_RANK[rank] : c.level >= 3 ? '◆ CHOOSE A CLASS' : 'CLASS AT LEVEL 3', classChipStyle: chip(!!c.classId || c.level < 3), hasClassIcon: !!c.classId, classIcon: em.icon,
      choosing, classCards, pick, cls,
      skillHead: left ? 'SPEND ' + left + ' SKILL POINT' + (left > 1 ? 'S' : '') + ' · A SKILL CAN\'T PASS ITS ATTRIBUTE' : 'NO SKILL POINTS TO SPEND · YOUR SKILLS',
      skillRows, coreRows, hasSteps: steps.length > 0, noSteps: !steps.length, steps, nextSteps, hasNext: nextSteps.length > 0,
      stepsHead: owed ? 'PERK STEPS · ' + owed + ' WAITING · ONE PER MASTERY LEVEL (3, 5, 7, 9 POINTS)' : 'PERK STEPS · NONE WAITING',
      hasAttr: c.unspent.attr > 0, attrHead: 'SPEND ' + c.unspent.attr + ' ATTRIBUTE POINT' + (c.unspent.attr > 1 ? 'S' : '') + ' · CAN\'T PASS ITS CORE', attrBtns,
      hasCore: c.unspent.core > 0, coreHead: 'SPEND ' + c.unspent.core + ' CORE POINT' + (c.unspent.core > 1 ? 'S' : ''), coreBtns,
      pointsNote: 'Every level: +1 Skill point. Even levels: +1 Attribute point. Every 5th level: +1 Core point. Unspent points keep.',
      done: () => go(g.phase === 'combat' ? 'combat' : 'main', { levelupChar: null }), doneLabel: allDone ? 'Done · back to the story' : 'Back to the story (finish later)',
      doneStyle: 'min-height: 44px; padding: 0 18px; border-radius: 12px; border: 0; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; ' + (allDone ? 'background: #6FEA77; color: #0A0D13' : 'background: #1C2536; color: #E7EBF3'),
    };
  }
}
