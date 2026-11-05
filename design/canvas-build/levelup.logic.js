const D = __DATA__;
const WORDS = ['', 'FEEBLE', 'WEAK', 'AVERAGE', 'GOOD', 'GREAT', 'EXCEPTIONAL', 'LEGENDARY', 'LEGENDARY', 'LEGENDARY', 'LEGENDARY'];
const ATTR = {}; D.attrs.forEach((a) => { ATTR[a.id] = a; });
const SK = {}; D.skills.forEach((s) => { SK[s.id] = s; });
// MPAT at level 3: the EPCCG creation build plus the level-2 point (Sensory 1). Attributes were set at creation and level 2.
const BASE = { athletics: 3, dexterity: 2, camaraderie: 3, authority: 2, sensory: 1 };
const ATTRV = { endurance: 1, strength: 1, agility: 3, perception: 1, intelligence: 1, expression: 1, insight: 3, determination: 1, virtue: 2 };
const dia = (n, filled, color) => Array.from({ length: n }, (_, i) => ({ style: 'width: 9px; height: 9px; transform: rotate(45deg); box-sizing: border-box; ' + (i < filled ? 'background: ' + color : 'border: 1px solid #3B475D') }));

class Component extends DCLogic {
  constructor(props) { super(props); this.state = { spent: null, cls: null }; }

  renderVals() {
    const S = this.state;
    const pts = { ...BASE }; if (S.spent) pts[S.spent] = (pts[S.spent] || 0) + 1;
    const totals = D.classes.map((c) => ({ ...c, total: c.sig.reduce((t, s) => t + (pts[s] || 0), 0) }));
    const top = [...new Set(totals.map((t) => t.total))].sort((a, b) => b - a).slice(0, 2);
    const eligible = totals.filter((t) => top.includes(t.total)).sort((a, b) => b.total - a.total);
    const cls = S.cls && eligible.some((c) => c.id === S.cls) ? S.cls : null;
    const classCards = eligible.map((c) => ({
      name: c.name, total: c.total, meta: c.core.toUpperCase() + ' · ' + c.role.replace(/_/g, ' ').toUpperCase(), sig: c.sig.map((s) => SK[s].name + ' ' + (pts[s] || 0)).join(' · '),
      resource: c.resource, move: c.move, moveText: c.moveText, pick: () => this.setState({ cls: c.id }), pressed: cls === c.id ? 'true' : 'false',
      nameStyle: 'font-size: 22px; font-weight: 700; color: ' + D.core[c.core],
      style: 'display: flex; flex-direction: column; align-items: flex-start; gap: 8px; text-align: left; padding: 16px; border-radius: 12px; font-family: inherit; color: #E7EBF3; cursor: pointer; ' + (cls === c.id ? 'background: #1C2536; border: 2px solid ' + D.core[c.core] : 'background: #10151F; border: 2px solid #232D3F'),
    }));
    const skillRows = D.skills.map((s) => {
      const p = pts[s.id] || 0, cap = ATTRV[s.attr], base = BASE[s.id] || 0, mine = S.spent === s.id, blocked = !mine && (base >= cap || (S.spent && !mine));
      const ink = ATTR[s.attr].ink;
      return { img: s.img, name: s.name, pts: p, blocked, why: base >= cap ? 'Needs ' + ATTR[s.attr].name + ' ' + (cap + 1) + ': an attribute point at level 4' : '',
        note: mine ? '+1 this level · tap to undo' : base >= cap ? 'Capped by ' + ATTR[s.attr].name + ' ' + cap : ATTR[s.attr].name + ' ' + cap,
        pick: () => this.setState({ spent: mine ? null : s.id }), nameStyle: 'font-size: 14px; font-weight: 700; color: ' + (blocked && !mine ? '#7F8BA1' : ink),
        style: 'display: flex; gap: 10px; align-items: center; padding: 8px 10px; border-radius: 10px; font-family: inherit; color: #E7EBF3; cursor: pointer; ' + (mine ? 'background: #1C2536; border: 1px solid ' + ink : 'background: #0A0D13; border: 1px solid #232D3F') + (blocked && !mine ? '; opacity: 0.6' : '') };
    });
    const cores = { body: 1, mind: 1, soul: 1 };
    D.attrs.forEach((a) => { if (ATTRV[a.id] > cores[a.core]) cores[a.core] = ATTRV[a.id]; });
    const coreRows = ['body', 'mind', 'soul'].map((c) => ({ name: c.toUpperCase(), word: WORDS[cores[c]], val: cores[c], dia: dia(10, cores[c], D.core[c]),
      nameStyle: 'font-size: 20px; font-weight: 700; letter-spacing: 0.1em; color: ' + D.core[c], valStyle: 'font-size: 40px; font-weight: 700; color: ' + D.core[c] }));
    const done = !!S.spent && !!cls;
    const chip = (ok) => 'padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; letter-spacing: 0.1em; border: 1px solid ' + (ok ? '#6FEA77' : '#FFFFFF') + '; color: ' + (ok ? '#6FEA77' : '#FFFFFF');
    return { pc: D.pc, classCards, skillRows, coreRows, pointChip: S.spent ? '✓ SKILL POINT SPENT' : '◆ 1 SKILL POINT', pointChipStyle: chip(!!S.spent),
      classChip: cls ? '✓ ' + D.classes.find((c) => c.id === cls).name.toUpperCase() : '◆ CHOOSE A CLASS', classChipStyle: chip(!!cls), notDone: !done,
      doneLabel: done ? 'Confirm level 3' : 'Spend the point and choose a class',
      doneStyle: 'min-height: 50px; border-radius: 12px; border: 0; font-family: inherit; font-size: 15px; font-weight: 700; ' + (done ? 'background: #6FEA77; color: #0A0D13; cursor: pointer' : 'background: #1C2536; color: #A3AEC2') };
  }
}
