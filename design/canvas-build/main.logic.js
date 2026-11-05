const D = __DATA__;
const ATTR = {}; D.attrs.forEach((a) => { ATTR[a.id] = a; });
const SK = {}; D.skills.forEach((s) => { SK[s.id] = s; });
// MPAT: the EPCCG's own 10-point build (Athletics 3, Dexterity 2, Camaraderie 3, Authority 2), levelled to 5.
const PTS = { athletics: 3, dexterity: 2, camaraderie: 5, authority: 2, sensory: 1, proficiency: 1 };
const mod = (p) => (p === 0 ? -2 : p - 1);
const fmt = (m) => (m > 0 ? '+' + m : m < 0 ? '−' + Math.abs(m) : '0');
const DICE = [14, 7, 19, 3, 20, 11, 1, 16, 9, 12];
const ASK_ROLLS = { athletics: 15, dexterity: 6, camaraderie: 13, authority: 4, sensory: 17, proficiency: 12, durability: 8, pain_threshold: 10 };
const ASK_TN = 12;

const voiceCard = (id, head, line) => {
  const s = SK[id], ink = ATTR[s.attr].ink;
  return { img: s.img, head, line, headStyle: 'font-size: 12px; font-weight: 700; letter-spacing: 0.16em; color: ' + ink,
    style: 'display: flex; gap: 14px; align-items: flex-start; padding: 14px 16px; border-radius: 12px; background: #10151F; border: 1px solid #232D3F; border-left: 3px solid ' + ink };
};

class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { tab: 'skills', core: 'soul', echo: 1, push: 'open', asked: {}, extra: [], dice: false, roll: null, rollIx: 0 };
  }

  renderVals() {
    const S = this.state;
    const echoPips = [0, 1, 2].map((i) => ({ style: 'width: 12px; height: 12px; transform: rotate(45deg); box-sizing: border-box; ' + (i < S.echo ? 'background: #FFFFFF' : 'border: 1px solid #FFFFFF') }));
    const bars = [
      ['HP', '#F65157', 100, '120 / 120'], ['MP', '#5C9EFF', 85, '170 / 200'], ['XP', '#A3AEC2', 46, '1,640 / 2,050'],
    ].map(([label, c, pct, text]) => ({ label, text, labelStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: ' + c, fill: 'width: ' + pct + '%; height: 100%; background: ' + c }));
    const tabs = [['skills', 'SKILLS'], ['status', 'STATUS'], ['gear', 'GEAR'], ['bio', 'BIO']].map(([id, label]) => ({ label, pick: () => this.setState({ tab: id }), selected: S.tab === id ? 'true' : 'false',
      style: 'min-height: 38px; border-radius: 8px; font-family: inherit; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; cursor: pointer; ' + (S.tab === id ? 'border: 1px solid #E7EBF3; background: #1C2536; color: #E7EBF3' : 'border: 1px solid #232D3F; background: transparent; color: #A3AEC2') }));
    const coreTabs = ['body', 'mind', 'soul'].map((c) => ({ label: c.toUpperCase(), pick: () => this.setState({ core: c }), pressed: S.core === c ? 'true' : 'false',
      style: 'flex: 1; min-height: 36px; border-radius: 8px; font-family: inherit; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; cursor: pointer; color: ' + D.core[c] + '; ' + (S.core === c ? 'border: 1px solid ' + D.core[c] + '; background: #1C2536' : 'border: 1px solid #232D3F; background: transparent') }));

    const ask = (id) => () => {
      if (this.state.asked[id]) return;
      const s = SK[id], p = PTS[id] || 0, m = mod(p), d = ASK_ROLLS[id] || 10, total = d + m, ok = total >= ASK_TN;
      const head = s.name.toUpperCase() + ' · YOU ASKED · d20 ' + d + ' ' + fmt(m) + ' = ' + total + ' vs ' + ASK_TN + ' · ' + (ok ? '✓ SPEAKS' : '✕ NOTHING TO SAY');
      const card = voiceCard(id, head, ok ? s.notices : s.name + ' has nothing to say about this.');
      this.setState({ asked: { ...this.state.asked, [id]: true }, extra: [...this.state.extra, card] });
    };
    const sheetSkills = D.skills.filter((s) => s.core === S.core).map((s) => {
      const p = PTS[s.id] || 0, m = mod(p), ink = ATTR[s.attr].ink, done = !!S.asked[s.id];
      return { img: s.img, name: s.name, attr: ATTR[s.attr].name, pts: p, mod: fmt(m), ask: ask(s.id), noAsk: done || p === 0, askLabel: done ? 'Asked' : 'Ask',
        nameStyle: 'font-size: 14px; font-weight: 700; color: ' + (p ? ink : '#A3AEC2'), modStyle: 'font-size: 13px; text-align: right; color: ' + (p ? '#E7EBF3' : '#7F8BA1'),
        askStyle: 'min-height: 32px; border-radius: 6px; font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer; ' + (done || p === 0 ? 'border: 1px solid #232D3F; background: transparent; color: #7F8BA1' : 'border: 1px solid ' + ink + '; background: transparent; color: ' + ink) };
    });

    const voices = [
      voiceCard('sensory', 'SENSORY · PASSIVE 10 vs EASY 8 · ONLY YOU', 'The deck plates are still warm from the last launch. Their engines are hot. They mean to leave now, not later.'),
      voiceCard('athletics', 'ATHLETICS · PASSIVE 12 vs STANDARD 12 · ONLY YOU', 'There\'s a gap between Keel and the hatch control. Two steps. She swings like an engineer; you move like you.'),
      ...S.extra,
    ];
    const indulge = () => this.setState({ push: 'indulged', echo: Math.min(3, this.state.echo + 1) });
    const resist = () => { if (this.state.echo >= 1) this.setState({ push: 'resisted', echo: this.state.echo - 1 }); };
    const pushResult = S.push === 'indulged' ? 'You indulged: MPAT sides with the squad, whatever the orders say. +1 Echo.' : 'You resisted: MPAT holds the line and waits for orders. −1 Echo.';

    const actions = [
      ['Order the robots up the ramp', 'authority', 'Standard', 12], ['Rig a lift for the damaged units', 'proficiency', 'Standard', 12],
      ['Get between Keel and the hatch', 'athletics', 'Hard', 16], ['Argue the cargo math', 'eloquence', 'Standard', 12],
    ].map(([title, id, label, tn]) => {
      const p = PTS[id] || 0, m = mod(p), ink = ATTR[SK[id].attr].ink;
      return { title, tag: SK[id].name.toUpperCase() + ' · ' + label.toUpperCase() + ' ' + tn + ' · ' + fmt(m) + (p ? '' : ' UNTRAINED'),
        roll: () => this.rollFor(id, label, tn), tagStyle: 'font-size: 11px; letter-spacing: 0.08em; color: ' + ink,
        style: 'display: flex; flex-direction: column; align-items: flex-start; gap: 2px; min-height: 52px; padding: 8px 12px; border-radius: 10px; border: 1px solid #2E3A50; background: #10151F; color: #E7EBF3; font-family: inherit; font-size: 14px; text-align: left; cursor: pointer' };
    });

    const order = [{ img: D.pc, name: 'MPAT (you)', state: 'SPEAKING', stateStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: #FFFFFF' },
      { img: D.p2, name: 'Ninety-Two', state: '✓ SPOKE', stateStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: #6FEA77' },
      { img: D.wick, name: 'Narrator', state: 'AFTER ALL', stateStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: #A3AEC2' }];

    const status = [['Defense', '12'], ['Initiative', '+0'], ['Move', '4 tiles'], ['Vision', '12 tiles'], ['Healing given', '×1.9'], ['Carry', '20 kg'],
      ['Body save', '−2'], ['Brain save', '−2'], ['Heart save', '−2'], ['Cores', 'B3 · M1 · S5']].map(([k, v]) => ({ k, v }));
    const gear = [['Service pistol (.32 Decrkm)', '20 dmg · 8 tiles · 9/12'], ['Stim injector', '3 stims'], ['Medic plate', 'Armour Class II'], ['Field kit', 'Supplies 3'], ['Surgical manipulators', 'Right hand']].map(([name, note]) => ({ name, note }));
    const bio = [['Unit', '258th Medical Unit'], ['Origin', 'The Factory · Thousand-Planet frontier'], ['Race', 'Robot'], ['Age', '7'], ['Height', '180 cm'], ['Blood type', 'Oil'],
      ['Gender', 'Plug'], ['Main hand', 'Right'], ['Trivia', 'Can\'t tell a joke. Cooks well. Never leaves a teammate behind.']].map(([k, v]) => ({ k, v }));

    let roll = {};
    if (S.roll) {
      const r = S.roll, total = r.die + r.mod, ink = ATTR[SK[r.id].attr].ink;
      const [verdict, color] = r.die === 20 ? ['★ CRITICAL SUCCESS', '#6FEA77'] : r.die === 1 ? ['⚠ COMPLICATION', '#F65157'] : total >= r.tn ? ['✓ SUCCESS', '#6FEA77'] : ['✕ FAILURE', '#A3AEC2'];
      roll = { head: SK[r.id].name.toUpperCase() + ' · ' + r.label.toUpperCase() + ' ' + r.tn, headStyle: 'font-size: 14px; font-weight: 700; letter-spacing: 0.16em; color: ' + ink,
        die: r.die, math: 'd20 ' + r.die + ' ' + fmt(r.mod) + ' = ' + total + '  vs  TN ' + r.tn, verdict, verdictStyle: 'font-size: 28px; font-weight: 700; letter-spacing: 0.14em; color: ' + color };
    }

    return {
      echoPips, echo: S.echo, pc: { img: D.pc }, bars, tabs, coreTabs, sheetSkills, tabSkills: S.tab === 'skills', tabStatus: S.tab === 'status', tabGear: S.tab === 'gear', tabBio: S.tab === 'bio',
      status, gear, bio, wick: D.wick, pilot: D.pilot, npc: D.npc, p2: D.p2, voices, pushImg: SK.camaraderie.img,
      showPush: S.push === 'open', pushDone: S.push !== 'open', pushResult, indulge, resist, cantResist: S.echo < 1,
      actions, order, dice: S.dice, roll, closeDice: () => this.setState({ dice: false }),
      reroll: () => { if (this.state.echo < 1) return; const ix = this.state.rollIx + 1; this.setState({ echo: this.state.echo - 1, rollIx: ix, roll: { ...this.state.roll, die: DICE[ix % DICE.length] } }); },
      noReroll: S.echo < 1,
    };
  }

  rollFor(id, label, tn) {
    const ix = this.state.rollIx + 1;
    this.setState({ dice: true, rollIx: ix, roll: { id, label, tn, mod: mod(PTS[id] || 0), die: DICE[ix % DICE.length] } });
  }
}
