// Level up, ported from design/canvas-build/levelup.logic.js onto the real character: spend skill, Attribute and
// Core points under the tree's caps, take perk steps, and earn a class at level 3 (closest-class rule).
import { DCLogic } from '../dc/runtime';
import { D, ATTR, SK, IMG, epccgVals, lightboxVals, zoomer, epBtnStyle } from './shared';
import { CLASS, PERK, canRaise, classRank, classTotals, eligibleClasses, maxHp, pendingPerkSteps, SKILL } from '@engine';
import { act, getState, go } from '../game/store';

const WORDS = ['', 'FEEBLE', 'WEAK', 'AVERAGE', 'GOOD', 'GREAT', 'EXCEPTIONAL', 'LEGENDARY', 'LEGENDARY', 'LEGENDARY', 'LEGENDARY'];
const PERK_ICON = {};
D.skills.forEach((s) => s.ep.perks.forEach((p) => { PERK_ICON[p.id] = p.icon; }));
const dia = (n, filled, color) => Array.from({ length: n }, (_, i) => ({ style: 'width: 9px; height: 9px; transform: rotate(45deg); box-sizing: border-box; ' + (i < filled ? 'background: ' + color : 'border: 1px solid #3B475D') }));
const chip = (ok) => 'padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; letter-spacing: 0.1em; border: 1px solid ' + (ok ? '#6FEA77' : '#FFFFFF') + '; color: ' + (ok ? '#6FEA77' : '#FFFFFF');

export class LevelUpLogic extends DCLogic {
  constructor(props) { super(props); this.state = {}; }
  renderVals() {
    const st = getState(), g = st.game, c = g && g.characters[st.levelupChar];
    if (!c || c.owner !== st.me.id) { queueMicrotask(() => go(g ? (g.phase === 'combat' ? 'combat' : 'main') : 'home')); return { ...lightboxVals(this), ...epccgVals(this), classCards: [], skillRows: [], coreRows: [], steps: [], attrBtns: [], coreBtns: [] }; }
    const choosing = c.level >= 3 && !c.classId;
    const classCards = choosing ? eligibleClasses(c.skills).map((t) => { const k = D.classesFull.find((x) => x.id === t.id);
      return { key: k.id, name: k.name, total: t.total, meta: k.core.toUpperCase() + ' · ' + k.role.replace(/_/g, ' ').toUpperCase(), sig: k.sig.map((s) => SK[s].name + ' ' + (c.skills[s] || 0)).join(' · '),
        resource: k.resource, move: k.move, moveText: k.moveText, pick: () => act({ type: 'levelup/class', charId: c.id, classId: k.id }), pressed: 'false', nameStyle: 'font-size: 22px; font-weight: 700; color: ' + D.core[k.core],
        style: 'display: flex; flex-direction: column; align-items: flex-start; gap: 8px; text-align: left; padding: 16px; border-radius: 12px; font-family: inherit; color: #E7EBF3; cursor: pointer; background: #10151F; border: 2px solid #232D3F' }; }) : [];
    const skillRows = D.skills.map((s) => {
      const p = c.skills[s.id] || 0, why = canRaise(c, 'skill', s.id), ink = ATTR[s.attr].ink, cap = c.attrs[s.attr];
      return { key: s.id, img: s.img, name: s.name, pts: p, blocked: !!why, why: why || '', note: why && c.unspent.skill ? why : ATTR[s.attr].name + ' ' + cap,
        pick: () => act({ type: 'levelup/raise', charId: c.id, kind: 'skill', id: s.id }), help: () => this.setState({ epccg: s.id }), helpStyle: epBtnStyle(ink),
        nameStyle: 'font-size: 14px; font-weight: 700; color: ' + (why ? '#7F8BA1' : ink),
        style: 'flex: 1; min-width: 0; display: flex; gap: 10px; align-items: center; padding: 8px 10px; border-radius: 10px; font-family: inherit; color: #E7EBF3; cursor: pointer; background: #0A0D13; border: 1px solid #232D3F' + (why ? '; opacity: 0.6' : '') };
    });
    const coreRows = ['body', 'mind', 'soul'].map((k) => ({ name: k.toUpperCase(), word: WORDS[c.cores[k]], val: c.cores[k], dia: dia(10, c.cores[k], D.core[k]),
      nameStyle: 'font-size: 20px; font-weight: 700; letter-spacing: 0.1em; color: ' + D.core[k], valStyle: 'font-size: 40px; font-weight: 700; color: ' + D.core[k] }));
    const btn = (on, color) => 'min-height: 40px; border-radius: 8px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; border: 1px solid ' + (on ? color : '#232D3F') + '; background: transparent; color: ' + (on ? color : '#7F8BA1');
    const attrBtns = D.attrs.map((a) => { const why = canRaise(c, 'attr', a.id); return { key: a.id, label: a.name + ' ' + c.attrs[a.id] + ' ›', blocked: !!why, why: why || '', pick: () => act({ type: 'levelup/raise', charId: c.id, kind: 'attr', id: a.id }), style: btn(!why, a.ink) }; });
    const coreBtns = ['body', 'mind', 'soul'].map((k) => { const why = canRaise(c, 'core', k); return { key: k, label: k.toUpperCase() + ' ' + c.cores[k] + ' ›', blocked: !!why, why: why || '', pick: () => act({ type: 'levelup/raise', charId: c.id, kind: 'core', id: k }), style: btn(!why, D.core[k]) }; });
    const steps = pendingPerkSteps(c).map((x) => { const ink = ATTR[SK[x.skill].attr].ink;
      return { key: x.skill, head: SKILL[x.skill].name.toUpperCase() + ' ' + (c.skills[x.skill] || 0) + ' · TAKE ONE STEP', headStyle: 'font-size: 12px; font-weight: 700; letter-spacing: 0.12em; color: ' + ink,
        choices: x.choices.map((ch) => { const p = PERK[ch.id], t = p.tiers[ch.tier].text; return { key: ch.id + ch.tier, name: p.name, tier: ch.tier === 'I' ? 'Tier I' : 'Upgrade to Tier II', text: t.charAt(0).toUpperCase() + t.slice(1), icon: PERK_ICON[ch.id] || IMG['wick-mind-without-fog'], pick: () => act({ type: 'levelup/perk', charId: c.id, perkId: ch.id }) }; }) };
    });
    const left = c.unspent.skill, rank = classRank(c), total = c.classId ? classTotals(c.skills).find((x) => x.id === c.classId).total : 0;
    const allDone = !left && !c.unspent.attr && !c.unspent.core && !choosing && !steps.length;
    return {
      ...epccgVals(this), ...lightboxVals(this), zoomPc: zoomer(this, c.portrait, c.name, 'portrait'), pc: c.portrait, name: c.name,
      kicker: 'LEVEL ' + c.level + ' · ' + c.xp.toLocaleString() + ' XP', title: c.name + (choosing ? ' reaches level ' + c.level : ' grows'), hpChip: 'MAX HP ' + maxHp(c),
      pointChip: left ? '◆ ' + left + ' SKILL POINT' + (left > 1 ? 'S' : '') : '✓ SKILL POINTS SPENT', pointChipStyle: chip(!left),
      classChip: c.classId ? '✓ ' + CLASS[c.classId].name.toUpperCase() : c.level >= 3 ? '◆ CHOOSE A CLASS' : 'CLASS AT LEVEL 3', classChipStyle: chip(!!c.classId || c.level < 3),
      choosing, classCards, hasClass: !!c.classId, waitClass: !c.classId && c.level < 3,
      classLine: c.classId ? CLASS[c.classId].name + ' · rank ' + ['', 'I', 'II', 'III'][rank] : '', rankLine: c.classId ? 'Signature total ' + total + '. Rank II at 13, rank III at 18.' : '',
      skillHead: left ? 'SPEND ' + left + ' SKILL POINT' + (left > 1 ? 'S' : '') + ' · A SKILL CAN\'T PASS ITS ATTRIBUTE' : 'NO SKILL POINTS TO SPEND · YOUR SKILLS',
      skillRows, coreRows, hasSteps: steps.length > 0, steps,
      hasAttr: c.unspent.attr > 0, attrHead: 'SPEND ' + c.unspent.attr + ' ATTRIBUTE POINT' + (c.unspent.attr > 1 ? 'S' : '') + ' · CAN\'T PASS ITS CORE', attrBtns,
      hasCore: c.unspent.core > 0, coreHead: 'SPEND ' + c.unspent.core + ' CORE POINT' + (c.unspent.core > 1 ? 'S' : ''), coreBtns,
      pointsNote: 'Every level: +1 Skill point. Even levels: +1 Attribute point. Every 5th level: +1 Core point. Unspent points keep.',
      done: () => go(g.phase === 'combat' ? 'combat' : 'main', { levelupChar: null }), doneLabel: allDone ? 'Done · back to the story' : 'Back to the story (finish later)',
      doneStyle: 'min-height: 50px; border-radius: 12px; border: 0; font-family: inherit; font-size: 15px; font-weight: 700; cursor: pointer; ' + (allDone ? 'background: #6FEA77; color: #0A0D13' : 'background: #1C2536; color: #E7EBF3'),
    };
  }
}
