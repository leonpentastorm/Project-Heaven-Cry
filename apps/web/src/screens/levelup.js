// Level up, ported from design/canvas-build/levelup.logic.js onto the real character: spend skill, Attribute and
// Core points under the tree's caps, take perk steps, and earn a class at level 3 (closest-class rule).
// Layout (Leon, 7 Nov 2026: "the level up screen is super lopsided"): the left two thirds hold the work (the class
// choice at level 3, the perk steps as a 3-column grid of cards with both choices side by side, skill points, then
// Attributes and Cores); the right third is the class panel (emblem, name and rank, signature totals with the progress
// to the next rank, every move by rank with who runs it, and the advanced classes in reach). Narrow screens stack the
// class panel above the work.
import { DCLogic } from '../dc/runtime';
import { D, ATTR, SK, IMG, epccgVals, lightboxVals, zoomer, epBtnStyle, ensureStyle } from './shared';
import { CLASS, PERK, ADVANCED, canRaise, classRank, eligibleClasses, maxHp, pendingPerkSteps, SKILL, verdictFor } from '@engine';
import { act, getState, go } from '../game/store';
import { emblemOf, classMoves, advancedMoves, signatureOf, closestClasses, advancedInReach, ROMAN_RANK } from '../game/classView';

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
  '@media (max-width:1400px){.phc-lu-steps{grid-template-columns:repeat(2,minmax(0,1fr))}}',
  '@media (max-width:1000px){.phc-lu-body{grid-template-columns:minmax(0,1fr);padding:16px}.phc-lu-class{order:-1;position:static}}',
  '@media (max-width:640px){.phc-lu-steps{grid-template-columns:minmax(0,1fr)}}',
  '@media (max-width:420px){.phc-lu-pair{grid-template-columns:minmax(0,1fr)}}',
].join(''));

export class LevelUpLogic extends DCLogic {
  constructor(props) { super(props); this.state = {}; }
  renderVals() {
    const st = getState(), g = st.game, c = g && g.characters[st.levelupChar];
    if (!c || c.owner !== st.me.id) { queueMicrotask(() => go(g ? (g.phase === 'combat' ? 'combat' : 'main') : 'home')); return { ...lightboxVals(this), ...epccgVals(this), classCards: [], skillRows: [], coreRows: [], steps: [], attrBtns: [], coreBtns: [], nextSteps: [], cls: { sig: [], moves: [], adv: [], closest: [], advMoves: [] } }; }
    const choosing = c.level >= 3 && !c.classId;
    // ---------- the class choice at level 3 (closest-class rule), each card with its emblem ----------
    const classCards = choosing ? eligibleClasses(c).map((t) => { const k = D.classesFull.find((x) => x.id === t.id), em = emblemOf(k.id);
      return { key: k.id, name: k.name, total: t.total, icon: em.icon, meta: k.core.toUpperCase() + ' · ' + k.role.replace(/_/g, ' ').toUpperCase(), sig: (ATTR[k.attribute]?.name || k.attribute) + ' ' + t.total + ' · ' + k.sig.map((s) => SK[s].name + ' ' + (c.skills[s] || 0)).join(' · '),
        resource: k.resource, move: k.move, moveText: k.moveText, pick: () => act({ type: 'levelup/class', charId: c.id, classId: k.id }), pressed: 'false', nameStyle: 'font-size: 22px; font-weight: 700; color: ' + D.core[k.core],
        style: 'display: flex; flex-direction: column; align-items: flex-start; gap: 8px; text-align: left; padding: 16px; border-radius: 12px; font-family: inherit; color: #E7EBF3; cursor: pointer; background: #10151F; border: 2px solid #232D3F' }; }) : [];
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
    // ---------- the class panel ----------
    const id = c.classId, k = id ? CLASS[id] : null, rank = id ? classRank(c) : 0, sig = id ? signatureOf(c, id) : null, em = emblemOf(c.advancedClass || id);
    const moveRow = (m) => ({ ...m, badgeStyle: badgeStyle(m.verdict), hasUses: !!m.uses, hasUnlock: !!m.unlock, meta: [m.rank, m.ap].filter(Boolean).join(' · '),
      nameStyle: 'font-size: 14px; font-weight: 700; color: ' + (m.earned ? '#E7EBF3' : '#7F8BA1'),
      style: 'display: flex; flex-direction: column; gap: 4px; padding: 10px; border-radius: 10px; background: #0A0D13; border: 1px solid ' + (m.earned ? em.ink : '#232D3F') + (m.earned ? '' : '; opacity: 0.55') });
    const adv = id ? advancedInReach(c, 3).map((a) => ({ ...a, key: a.id, learn: () => act({ type: 'levelup/advanced', charId: c.id, classId: a.id }), hasMissing: a.missing.length > 0, missingLine: 'Missing: ' + a.missing.join(' · '),
      nameStyle: 'font-size: 14px; font-weight: 700; color: ' + a.ink, tutorLine: a.tutorMet ? '✓ Tutor met: ' + a.tutor : 'Tutor: ' + a.tutor })) : [];
    const closest = !id ? closestClasses(c, 4).map((x) => ({ ...x, key: x.id, tag: x.offered ? (c.level >= 3 ? 'ON OFFER' : 'CLOSEST') : '', hasTag: x.offered, nameStyle: 'font-size: 14px; font-weight: 700; color: ' + x.ink,
      style: 'display: grid; grid-template-columns: 32px minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 8px 10px; border-radius: 10px; background: #0A0D13; border: 1px solid ' + (x.offered ? x.ink : '#232D3F') })) : [];
    const cls = {
      has: !!id, none: !id, icon: em.icon, ink: em.ink,
      name: id ? (c.advancedClass && ADVANCED[c.advancedClass] ? ADVANCED[c.advancedClass].name : k.name) : c.level >= 3 ? 'Choose your class' : 'No class yet',
      nameStyle: "font-family: 'Spectral', serif; font-size: 34px; font-weight: 600; line-height: 1.05; color: " + (id ? em.ink : '#E7EBF3'),
      rank: id ? 'RANK ' + ROMAN_RANK[rank] : '', rankStyle: 'font-size: 22px; font-weight: 700; letter-spacing: 0.14em; color: #E7EBF3',
      sub: id ? (c.advancedClass ? 'Advanced class · ' + k.name + ' ' + ROMAN_RANK[rank] : k.core.toUpperCase() + ' · ' + (k.tagline || '')) : c.level >= 3 ? 'Pick one on the left.' : 'Your class finds you at level 3 (250 XP), from your signature totals. Until then, these are closest.',
      sig: sig ? sig.skills.map((s) => ({ key: s.id, name: s.name, pts: s.pts, style: 'font-size: 13px; font-weight: 700; color: ' + ATTR[SK[s.id].attr].ink })) : [],
      total: sig ? 'SIGNATURE ' + sig.total : '', nextLine: sig ? sig.nextLine : '', bar: sig ? 'height: 100%; border-radius: 99px; background: ' + em.ink + '; width: ' + sig.pct + '%' : '',
      moves: id ? classMoves(g, c, id).map(moveRow) : [], advMoves: c.advancedClass ? advancedMoves(g, c, c.advancedClass).map(moveRow) : [], hasAdvMoves: !!c.advancedClass,
      advName: c.advancedClass && ADVANCED[c.advancedClass] ? 'ADVANCED · ' + ADVANCED[c.advancedClass].name.toUpperCase() : '',
      adv, hasAdv: !c.advancedClass && adv.length > 0, closest, hasClosest: closest.length > 0,
    };
    const left = c.unspent.skill;
    const owed = pendingPerkSteps(c).reduce((n, x) => n + (x.free || 1), 0); // steps owed, not skills (a 2→5 jump owes two)
    const allDone = !left && !c.unspent.attr && !c.unspent.core && !choosing && !steps.length;
    return {
      ...epccgVals(this), ...lightboxVals(this), zoomPc: zoomer(this, c.portrait, c.name, 'portrait'), pc: c.portrait, name: c.name,
      kicker: 'LEVEL ' + c.level + ' · ' + c.xp.toLocaleString() + ' XP', title: c.name + (choosing ? ' reaches level ' + c.level : ' grows'), hpChip: 'MAX HP ' + maxHp(c),
      pointChip: left ? '◆ ' + left + ' SKILL POINT' + (left > 1 ? 'S' : '') : '✓ SKILL POINTS SPENT', pointChipStyle: chip(!left),
      stepChip: owed ? '◆ ' + owed + ' PERK STEP' + (owed > 1 ? 'S' : '') : '✓ NO PERK STEPS', stepChipStyle: chip(!steps.length),
      classChip: id ? '✓ ' + k.name.toUpperCase() + ' ' + ROMAN_RANK[rank] : c.level >= 3 ? '◆ CHOOSE A CLASS' : 'CLASS AT LEVEL 3', classChipStyle: chip(!!id || c.level < 3), hasClassIcon: !!id, classIcon: em.icon,
      choosing, classCards, cls,
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
