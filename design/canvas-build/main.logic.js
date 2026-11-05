const D = __DATA__;
/*EPCCG*/
const ATTR = {}; D.attrs.forEach((a) => { ATTR[a.id] = a; });
const SK = {}; D.skills.forEach((s) => { SK[s.id] = s; });
// MPAT: the EPCCG's own 10-point build (Athletics 3, Dexterity 2, Camaraderie 3, Authority 2), levelled to 5.
const PTS = { athletics: 3, dexterity: 2, camaraderie: 5, authority: 2, sensory: 1, proficiency: 1 };
const mod = (p) => (p === 0 ? -2 : p - 1);
const fmt = (m) => (m > 0 ? '+' + m : m < 0 ? '−' + Math.abs(m) : '0');
const DICE = [14, 7, 19, 3, 20, 11, 1, 16, 9, 12];
// Combined check (rules 1.1 + item 42): lowest modifier among the 1-3 skills, +2 for each other skill with >= 1 point.
const combo = (ids) => { const mods = ids.map((i) => mod(PTS[i] || 0)), low = Math.min(...mods), lowIx = mods.indexOf(low);
  const bonus = ids.filter((i, k) => k !== lowIx && (PTS[i] || 0) > 0).length * 2; return { low, bonus, total: low + bonus, lowId: ids[lowIx] }; };
const PLAYER = { leon: ['LEON', '#7FD4FF'], guest: ['GUEST', '#FF9EC7'] };
const W = 16, H = 11;
const HULL = new Set(); for (let x = 13; x < 16; x++) for (let y = 0; y < 6; y++) HULL.add(x + ',' + y);
const CRATES = new Set(['11,2', '11,3', '11,4', '10,6']);
const WRECK = new Set(['1,9', '2,9', '3,9', '4,9', '6,9', '7,9', '1,10', '3,10', '5,10', '8,10']);
const TOKENS = { '3,6': '#7FD4FF', '2,8': '#FF9EC7', '5,8': '#A3AEC2', '12,3': '#F65157', '12,6': '#F65157', '12,1': '#F65157' };
const POLISHED = 'MPAT hauls 4-Ten across its shoulders and starts up the ramp, servos whining, looking Keel in the eye the whole way. “Then shoot me first, Chief. I can carry two.”';
const ASK_ROLLS = { athletics: 15, dexterity: 6, camaraderie: 13, authority: 4, sensory: 17, proficiency: 12, durability: 8, pain_threshold: 10 };
const ASK_TN = 12;
const TABLES = [['felt', 'Field felt', '#1F4D3A', '#123526'], ['oak', 'Mess-hall oak', '#5B3A22', '#3D2716'], ['velvet', 'Lumeri velvet', '#4A1830', '#2E0F1E'],
  ['slate', 'Outpost slate', '#2B3138', '#1B2026'], ['hull', 'Ship hull', '#3A3F47', '#5B6270'], ['void', 'Black-hole glass', '#0B0F1E', '#AE9BFF']];
const SKINS = [['ivory', 'Ivory', '#EFE6D2', '#8C7B5A', '#1A1A1A'], ['obsidian', 'Obsidian', '#15171C', '#6B7280', '#E7EBF3'], ['brass', 'Brass', '#C9A25A', '#6B4F1F', '#1A1208'],
  ['glass', 'Sigil glass', '#173640', '#8BDEEE', '#E7EBF3'], ['bone', 'Bone', '#D9CBB0', '#7A6A4F', '#3A2E20'], ['blood', 'Oil-red', '#7A1121', '#F65157', '#FFFFFF']];

const voiceCard = (id, head, line) => {
  const s = SK[id], ink = ATTR[s.attr].ink;
  return { img: s.img, head, line, headStyle: 'font-size: 12px; font-weight: 700; letter-spacing: 0.16em; color: ' + ink,
    style: 'display: flex; gap: 14px; align-items: flex-start; padding: 14px 16px; border-radius: 12px; background: #10151F; border: 1px solid #232D3F; border-left: 3px solid ' + ink };
};

class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { tab: 'skills', core: 'soul', echo: 1, push: 'open', asked: {}, extra: [], dice: false, roll: null, rollIx: 0, phase: 'ready', throws: 0, table: 'felt', skin: 'ivory', custom: false, draft: 'i grab 4-ten and walk up the ramp. tell keel to shoot me first', polished: false, pickRoll: true, sent: [], area: false };
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
      return { img: s.img, name: s.name, attr: ATTR[s.attr].name, pts: p, mod: fmt(m), ask: ask(s.id), help: () => this.setState({ epccg: s.id }), helpStyle: epBtnStyle(ink), noAsk: done || p === 0, askLabel: done ? 'Asked' : 'Ask',
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
      ['Order the robots up the ramp', ['authority', 'camaraderie'], 'Standard', 12], ['Rig a lift for the damaged units', ['proficiency', 'athletics'], 'Standard', 12],
      ['Get between Keel and the hatch', ['athletics'], 'Hard', 16], ['Talk her through the cargo maths', ['eloquence', 'authority', 'camaraderie'], 'Hard', 16],
    ].map(([title, ids, label, tn]) => {
      const c = combo(ids), ink = ATTR[SK[ids[0]].attr].ink;
      return { title, tag: ids.map((i) => SK[i].name.toUpperCase()).join(' + ') + ' · ' + label.toUpperCase() + ' ' + tn + ' · ' + fmt(c.total),
        roll: () => this.rollFor(ids, label, tn), tagStyle: 'font-size: 11px; letter-spacing: 0.08em; color: ' + ink,
        style: 'display: flex; flex-direction: column; align-items: flex-start; gap: 2px; min-height: 52px; padding: 8px 12px; border-radius: 10px; border: 1px solid #2E3A50; background: #10151F; color: #E7EBF3; font-family: inherit; font-size: 14px; text-align: left; cursor: pointer' };
    });

    const who = (key) => ({ player: PLAYER[key][0], playerStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.12em; color: ' + PLAYER[key][1],
      imgStyle: 'width: 36px; height: 36px; border-radius: 50%; object-fit: cover; background: #000; border: 2px solid ' + PLAYER[key][1] });
    const order = [{ img: D.pc, name: 'MPAT (you)', ...who('leon'), state: 'SPEAKING', stateStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: #FFFFFF' },
      { img: D.p2, name: 'Ninety-Two', ...who('guest'), state: '✓ SPOKE', stateStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: #6FEA77' },
      { img: D.narrator, name: 'Narrator', player: 'AI', playerStyle: 'font-size: 11px; letter-spacing: 0.12em; color: #A3AEC2', imgStyle: 'width: 36px; height: 36px; border-radius: 50%; object-fit: cover; background: #000; border: 2px solid #232D3F', state: 'AFTER ALL', stateStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: #A3AEC2' }];
    const mini = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = x + ',' + y, tok = TOKENS[k];
      mini.push({ style: 'aspect-ratio: 1; border-radius: ' + (tok ? '50%' : '1px') + '; background: ' + (tok || (HULL.has(k) ? '#1C2536' : CRATES.has(k) ? '#4A3A20' : WRECK.has(k) ? '#232D3F' : '#0D1119')) }); }
    const regions = [['OUTPOST-813', 'Barracks, infirmary, comms', 6, 8, 30, 30], ['SHIELD LINE', 'Where the five squads held', 40, 6, 40, 22], ['WRECK FIELD', '100 infantry robots, most still', 6, 44, 34, 40],
      ['ENGINEERS\u2019 SHIP', 'Platinum hold, sealed hatch', 74, 34, 22, 20], ['B813', 'The black hole, overhead', 72, 76, 24, 18]].map(([name, note, l, t2, w, h]) => ({ name, note,
      style: 'position: absolute; left: ' + l + '%; top: ' + t2 + '%; width: ' + w + '%; height: ' + h + '%; box-sizing: border-box; padding: 8px; border-radius: 10px; border: 1px dashed #3B475D; color: #C9D3E3; display: flex; flex-direction: column; gap: 3px' }));

    // Leadership from Authority (spec: 0 Unfit, 1-2 Squad, 3-4 Platoon, 5+ Command); carry 20 kg + 5 kg x (Strength - 1).
    const au = PTS.authority || 0, lead = au >= 5 ? 'Command' : au >= 3 ? 'Platoon' : au >= 1 ? 'Squad' : 'Unfit';
    const status = [['Defense', '12'], ['Initiative', '+0'], ['Move', '4 tiles'], ['Vision', '12 tiles'], ['Healing given', '×1.9'], ['Carry', '9 / 20 kg'],
      ['Body save', '−2'], ['Brain save', '−2'], ['Heart save', '−2'], ['Cores', 'B3 · M1 · S5'], ['Leadership', lead], ['Karma', '0 · Neutral']].map(([k, v]) => ({ k, v }));
    const rep = [['258th Medical Unit', 'Known', '+24'], ['Thousand World Legion', 'Unknown', '0'], ['The engineers', 'Hostile', '−22']].map(([k, band, v]) => ({ k, v: band + ' ' + v }));
    // Slots follow the 2020 sheet (spec: Equipment slots); outer torso sets Armour Class; the Veil is reserved.
    const gear = [['MAIN HAND', 'Service pistol (.32 Decrkm)', '20 dmg · 8 tiles · 9/12'], ['OUTER TORSO', 'Medic plate', 'Armour Class II'],
      ['HANDS', 'Surgical manipulators', 'Built in'], ['FOOTWEAR', 'Mag-lock feet', 'Built in'], ['BACKPACK', 'Stim injector', '3 stims · 1 kg'], ['BACKPACK', 'Field kit', 'Supplies 3 · 4 kg'],
      ['BACKPACK', 'Essence of Experience', '×1 · 0 kg · sells 300']].map(([slot, name, note]) => ({ slot, name, note, nameStyle: 'font-weight: 600; color: #E7EBF3' }));
    const emptySlots = 'Off hand · Head · Head accessory · Inner torso · Lower torso · Legs · Veil';
    // Weapon mastery by kills per family (spec: Weapon mastery; weapon_mastery.json levels).
    const lvlOf = (k) => { let l = D.wm.levels[0]; D.wm.levels.forEach((x) => { if (k >= x.kills) l = x; }); return l; };
    const mastery = [['sidearms', 7], ['unarmed', 1]].map(([fid, kills]) => {
      const fam = D.wm.families.find((f) => f.id === fid), lv = lvlOf(kills), nx = D.wm.levels[lv.level + 1];
      const perks = D.wm.perks.filter((p) => p.family === fid && p.mastery_level <= lv.level).map((p) => p.name);
      const lo = lv.kills, hi = nx ? nx.kills : lv.kills;
      return { name: fam.name, level: 'L' + lv.level + ' ' + lv.name, kills: kills + (kills === 1 ? ' kill' : ' kills') + (nx ? ' · ' + nx.name + ' at ' + nx.kills : ''),
        bonus: lv.attack_bonus ? '+' + lv.attack_bonus + ' to hit' : '+0 to hit', perk: perks.length ? 'Perk: ' + perks.join(', ') : 'Perk at ' + D.wm.levels[1].kills + ' kills',
        fill: 'height: 100%; border-radius: 99px; background: #E7EBF3; width: ' + (nx ? Math.round((kills - lo) / (hi - lo) * 100) : 100) + '%' };
    });
    // Acquired perks at Mastery 1 (3 points). Requirement chips use the attribute's UI ink (colour-system.md, Icons).
    const perks = [['rally_cry', 'camaraderie'], ['roll_with_it', 'athletics']].map(([id, sk]) => { const k = D.perks.find((x) => x.id === id), ink = ATTR[SK[sk].attr].ink;
      return { name: k.name, tier: 'ACQUIRED · TIER I', text: k.text, icon: k.icon, chip: SK[sk].name + ' ' + PTS[sk],
        chipStyle: 'padding: 1px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; border: 1px solid ' + ink + '; color: ' + ink }; });
    const eoe = { locked: true, why: 'Needs Mastery 2 in Brain Power with an Evoker, or Will Power with an Emanator. Nobody in the squad can crack it yet.' };
    const bio = [['Original name', 'M1.4 8R4-D83-RRY'], ['Unit', '258th Medical Unit'], ['Origin', 'The Factory · Thousand-Planet frontier'], ['Race', 'Robot'], ['Age', '7'], ['Height', '180 cm'], ['Blood type', 'Oil'],
      ['Gender', 'Plug'], ['Main hand', 'Right'], ['Trivia', 'Can\'t tell a joke. Cooks well. Never leaves a teammate behind.']].map(([k, v]) => ({ k, v }));

    let roll = {};
    if (S.roll) {
      const r = S.roll, total = r.die + r.mod, ink = ATTR[SK[r.ids[0]].attr].ink, c = combo(r.ids);
      const [verdict, color] = r.die === 20 ? ['★ CRITICAL SUCCESS', '#6FEA77'] : r.die === 1 ? ['⚠ COMPLICATION', '#F65157'] : total >= r.tn ? ['✓ SUCCESS', '#6FEA77'] : ['✕ FAILURE', '#A3AEC2'];
      roll = { head: (r.picked ? 'NARRATOR PICKS · ' : '') + r.ids.map((i) => SK[i].name.toUpperCase()).join(' + ') + ' · ' + r.label.toUpperCase() + ' ' + r.tn, headStyle: 'font-size: 18px; font-weight: 700; letter-spacing: 0.14em; color: ' + ink,
        pre: r.ids.length > 1 ? 'Lowest ' + fmt(c.low) + ' (' + SK[c.lowId].name + ') + ' + c.bonus + ' for trained partners = ' + fmt(c.total) + ' vs TN ' + r.tn : 'd20 ' + fmt(c.total) + ' (' + SK[r.ids[0]].name + ' ' + (PTS[r.ids[0]] || 0) + ') vs TN ' + r.tn,
        die: r.die, math: 'd20 ' + r.die + ' ' + fmt(r.mod) + ' = ' + total + '  vs  TN ' + r.tn, verdict, verdictStyle: 'font-size: 28px; font-weight: 700; letter-spacing: 0.14em; color: ' + color };
    }

    const T = TABLES.find((t) => t[0] === S.table), K = SKINS.find((k) => k[0] === S.skin);
    const opt = (on) => 'display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 8px 4px; border-radius: 8px; font-family: inherit; font-size: 11px; color: #E7EBF3; cursor: pointer; ' + (on ? 'border: 1px solid #E7EBF3; background: #1C2536' : 'border: 1px solid #232D3F; background: transparent');
    const tables = TABLES.map(([id, name, c1, c2]) => ({ name, pick: () => this.setState({ table: id }), pressed: S.table === id ? 'true' : 'false', style: opt(S.table === id),
      swatch: 'width: 40px; height: 26px; border-radius: 6px; background: ' + c1 + '; border: 3px solid ' + c2 }));
    const skins = SKINS.map(([id, name, face, edge]) => ({ name, pick: () => this.setState({ skin: id }), pressed: S.skin === id ? 'true' : 'false', style: opt(S.skin === id),
      swatch: 'width: 24px; height: 24px; transform: rotate(45deg); background: ' + face + '; border: 2px solid ' + edge }));
    const rolled = S.phase === 'rolled';
    const send = () => {
      const text = (this.state.draft || '').trim(); if (!text) return;
      this.setState({ sent: [...this.state.sent, { text }], draft: '', polished: false });
      if (this.state.pickRoll) this.rollFor(['athletics', 'camaraderie'], 'Hard', 16, true);
    };
    return {
      draft: S.draft, onDraft: (e) => this.setState({ draft: e.target.value, polished: false }), polishLabel: S.polished ? 'Undo polish' : 'Polish with AI',
      polish: () => this.setState(this.state.polished ? { draft: this.state.rawDraft, polished: false } : { rawDraft: this.state.draft, draft: POLISHED, polished: true }),
      send, sent: S.sent, pickRoll: S.pickRoll, togglePick: () => this.setState({ pickRoll: !this.state.pickRoll }),
      mini, regions, area: S.area, openArea: () => this.setState({ area: true }), closeArea: () => this.setState({ area: false }),
      tables, skins, skin: { face: K[2], edge: K[3], ink: K[4] }, tableName: T[1].toUpperCase(),
      tableStyle: 'position: relative; height: 300px; border-radius: 16px; overflow: hidden; background: ' + T[2] + '; border: 10px solid ' + T[3] + '; box-shadow: inset 0 0 60px rgba(0, 0, 0, 0.55)',
      custom: S.custom, toggleCustom: () => this.setState({ custom: !this.state.custom }), customPressed: S.custom ? 'true' : 'false', customLabel: S.custom ? 'Done' : 'Customise',
      waiting: !rolled, rolled, rolledA: rolled && S.throws % 2 === 1, rolledB: rolled && S.throws % 2 === 0,
      throwDie: () => this.setState({ phase: 'rolled', throws: this.state.throws + 1 }),
      ...epccgVals(this), echoPips, echo: S.echo, pc: { img: D.pc }, bars, tabs, coreTabs, sheetSkills, tabSkills: S.tab === 'skills', tabStatus: S.tab === 'status', tabGear: S.tab === 'gear', tabBio: S.tab === 'bio',
      status, rep, perks, gear, emptySlots, mastery, eoe, bio, wick: D.wick, factoryIcon: D.factoryIcon, pilot: D.pilot, outpost: D.outpost, npc: D.npc, p2: D.p2, voices, pushImg: SK.camaraderie.img,
      showPush: S.push === 'open', pushDone: S.push !== 'open', pushResult, indulge, resist, cantResist: S.echo < 1,
      actions, order, dice: S.dice, roll, closeDice: () => this.setState({ dice: false }),
      reroll: () => { if (this.state.echo < 1) return; const ix = this.state.rollIx + 1; this.setState({ echo: this.state.echo - 1, rollIx: ix, throws: this.state.throws + 1, roll: { ...this.state.roll, die: DICE[ix % DICE.length] } }); },
      noReroll: S.echo < 1,
    };
  }

  rollFor(ids, label, tn, picked) {
    const ix = this.state.rollIx + 1;
    this.setState({ dice: true, phase: 'ready', custom: false, rollIx: ix, roll: { ids, label, tn, picked: !!picked, mod: combo(ids).total, die: DICE[ix % DICE.length] } });
  }
}
