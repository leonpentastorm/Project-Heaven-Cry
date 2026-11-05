const D = __DATA__;
/*EPCCG*/
const STEPS = [['identity', 'Identity'], ['archetype', 'Archetype'], ['skills', 'Skills'], ['traits', 'Traits'], ['kit', 'Kit'], ['lockin', 'Lock in']];
const WORDS = ['', 'FEEBLE', 'WEAK', 'AVERAGE', 'GOOD', 'GREAT', 'EXCEPTIONAL', 'LEGENDARY', 'LEGENDARY', 'LEGENDARY', 'LEGENDARY'];
const CORES = ['body', 'mind', 'soul'];
const ATTR = {}; D.attrs.forEach((a) => { ATTR[a.id] = a; });
const SK = {}; D.skills.forEach((s) => { SK[s.id] = s; });
const ARCH = {}; D.arch.items.forEach((a) => { ARCH[a.id] = a; });
const CLASSNAME = {}; D.classes.forEach((c) => { CLASSNAME[c.id] = c.name; });
const title = (id) => id.charAt(0).toUpperCase() + id.slice(1);
const mod = (p) => (p === 0 ? -2 : p - 1);
const fmt = (m) => (m > 0 ? '+' + m : m < 0 ? '−' + Math.abs(m) : '0');
// Creation budgets (spec: Creation budget; rules.character.creation): 10 Skill, 10 Attribute, 6 Core points,
// and an unspent Core point trades for 2 Attribute points. No creation caps (Leon): only the tree's own,
// skill <= attribute <= core <= 10, so 6 Core points into Body make a legal 7/1/1 character.
const BUDGET = 10, CAP = 10, ATTR_PTS = 10, BASE_CORE_PTS = 6, TRADE = 2, STAT_CAP = 10;
let CORE_PTS = BASE_CORE_PTS; // Mind Without Fog: +2 Core points at creation (set each render from the picked traits)

function derive(skills, aSet, cSet) {
  aSet = aSet || {}; cSet = cSet || {};
  const attr = {}, core = { body: 1, mind: 1, soul: 1 };
  D.attrs.forEach((a) => { attr[a.id] = Math.max(1, aSet[a.id] || 1); });
  D.skills.forEach((s) => { const p = skills[s.id] || 0; if (p > attr[s.attr]) attr[s.attr] = p; });
  CORES.forEach((c) => { core[c] = Math.max(1, cSet[c] || 1); });
  D.attrs.forEach((a) => { if (attr[a.id] > core[a.core]) core[a.core] = attr[a.id]; });
  const spent = Object.values(skills).reduce((x, y) => x + y, 0);
  const attrSpent = D.attrs.reduce((t, a) => t + attr[a.id] - 1, 0), coreSpent = CORES.reduce((t, c) => t + core[c] - 1, 0);
  // Unspent Core points are traded for Attribute points only as far as the Attributes need them.
  const attrOver = Math.max(0, attrSpent - ATTR_PTS), traded = Math.ceil(attrOver / TRADE);
  const coreLeft = CORE_PTS - coreSpent - traded, attrLeft = ATTR_PTS + traded * TRADE - attrSpent;
  const ok = coreLeft >= 0 && Object.values(attr).every((v) => v <= STAT_CAP) && Object.values(core).every((v) => v <= STAT_CAP) && spent <= BUDGET;
  const totals = D.classes.map((c) => ({ id: c.id, name: c.name, core: c.core, total: c.sig.reduce((t, s) => t + (skills[s] || 0), 0) }));
  const top = [...new Set(totals.map((t) => t.total))].sort((a, b) => b - a).slice(0, 2);
  const leans = spent ? totals.filter((t) => top.includes(t.total)).sort((a, b) => b.total - a.total) : [];
  return { attr, core, spent, leans, attrSpent, coreSpent, traded, coreLeft, attrLeft, ok };
}

const btn = (on, color) => 'min-height: 40px; padding: 0 14px; border-radius: 8px; font-family: inherit; font-size: 13px; font-weight: 600; letter-spacing: 0.06em; cursor: pointer; ' +
  (on ? 'border: 1px solid ' + color + '; background: #1C2536; color: ' + color : 'border: 1px solid #232D3F; background: transparent; color: #A3AEC2');
const chip = (color) => 'padding: 4px 10px; border-radius: 999px; border: 1px solid ' + color + '; color: ' + color + '; font-size: 12px; font-weight: 700; letter-spacing: 0.1em';
const dia = (n, filled, color, size) => Array.from({ length: n }, (_, i) => ({ style: 'width: ' + size + 'px; height: ' + size + 'px; transform: rotate(45deg); box-sizing: border-box; ' +
  (i < filled ? 'background: ' + color : 'border: 1px solid #3B475D') }));

class Component extends DCLogic {
  constructor(props) {
    super(props);
    const arch = props.sampleArch && ARCH[props.sampleArch] ? props.sampleArch : null;
    this.state = {
      step: props.startStep || 'identity', name: props.sampleName || '', origin: props.sampleName ? 1 : null, portrait: props.sampleName ? 0 : 1,
      fam: 'frontline', arch: arch || 'bulwark', skills: arch ? { ...ARCH[arch].preset } : {}, aSet: arch ? { ...ARCH[arch].attributes } : {}, cSet: arch ? { ...ARCH[arch].cores } : {}, applied: arch,
      hover: 'durability', tcat: 'All', traits: props.sampleName ? ['factory_made'] : [], kit: props.sampleName ? 'medic' : null,
    };
  }

  renderVals() {
    const S = this.state;
    const set = (patch) => () => this.setState(patch);
    CORE_PTS = BASE_CORE_PTS + (S.traits.includes('mind_without_fog') ? 2 : 0);
    const der = derive(S.skills, S.aSet, S.cSet);
    const left = BUDGET - der.spent;
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
      style: 'display: flex; flex-direction: column; align-items: flex-start; gap: 4px; text-align: left; padding: 12px 14px; border-radius: 10px; color: #E7EBF3; font-family: inherit; cursor: pointer; ' +
        (S.origin === i ? 'background: #1C2536; border: 1px solid #E7EBF3' : 'background: #10151F; border: 1px solid #232D3F'),
    }));
    const o = S.origin === null ? null : D.origins[S.origin];
    const origin = o ? { ...o, knows: o['You know'], seen: o['People see you as'], traitsFit: o['Traits that fit'] } : {};
    const portrait = D.portraits[S.portrait];
    const portraitThumbs = D.portraits.map((p, i) => ({ ...p, pick: set({ portrait: i }), pressed: S.portrait === i ? 'true' : 'false',
      style: 'padding: 0; aspect-ratio: 4 / 5; border-radius: 6px; cursor: pointer; background: #000; ' + (S.portrait === i ? 'border: 2px solid #E7EBF3' : 'border: 2px solid transparent') }));

    // archetype
    const fams = [...D.arch.families, { id: 'custom', name: 'Custom', blurb: 'Start from zero and place all 10 points yourself.' }];
    const famTabs = fams.map((f) => ({ name: f.name, pick: set({ fam: f.id, arch: f.id === 'custom' ? 'custom' : (D.arch.items.find((a) => a.family === f.id) || {}).id }), selected: S.fam === f.id ? 'true' : 'false', style: btn(S.fam === f.id, '#E7EBF3') }));
    const famBlurb = (fams.find((f) => f.id === S.fam) || {}).blurb || '';
    const coreChips = (cores) => CORES.map((c) => ({ label: c.toUpperCase() + ' ' + cores[c], style: 'padding: 3px 8px; border-radius: 6px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; ' + (cores[c] > 1 ? 'color: #0A0D13; background: ' + D.core[c] : 'color: #A3AEC2; background: #1C2536') }));
    const archCards = S.fam === 'custom'
      ? [{ name: 'Custom', role: 'Your call', blurb: 'No preset. Every one of the 10 points is yours to place.', cores: coreChips({ body: 1, mind: 1, soul: 1 }), leans: 'whatever you build', pick: set({ arch: 'custom' }), pressed: S.arch === 'custom' ? 'true' : 'false', style: '' }]
      : D.arch.items.filter((a) => a.family === S.fam).map((a) => ({ name: a.name, role: a.role.toUpperCase(), blurb: a.blurb, cores: coreChips(a.cores), leans: a.leans.map((l) => CLASSNAME[l]).join(' · '), pick: set({ arch: a.id }), pressed: S.arch === a.id ? 'true' : 'false' }));
    // Every archetype spends all three budgets (decision 49); the card lists what it raises.
    const raisedOf = (arch) => D.attrs.filter((x) => arch.attributes[x.id] > 1).map((x) => x.name + ' ' + arch.attributes[x.id]).join(' · ');
    const budgetOf = (arch) => 'Every point placed. Attributes: ' + raisedOf(arch);
    archCards.forEach((c) => { const arch = D.arch.items.find((x) => x.name === c.name); c.budget = arch ? budgetOf(arch) : 'All ' + CORE_PTS + ' Core, 10 Attribute and 10 Skill points are yours to place'; });
    archCards.forEach((c) => { c.style = 'display: flex; flex-direction: column; align-items: flex-start; gap: 10px; text-align: left; padding: 16px; border-radius: 12px; color: #E7EBF3; font-family: inherit; cursor: pointer; ' + (c.pressed === 'true' ? 'background: #1C2536; border: 1px solid #E7EBF3' : 'background: #10151F; border: 1px solid #232D3F'); });
    const A = S.arch === 'custom' ? null : ARCH[S.arch];
    const pvCores = A ? A.cores : { body: 1, mind: 1, soul: 1 };
    const pv = {
      name: A ? A.name : 'Custom', role: A ? A.role.toUpperCase() : 'YOUR CALL',
      coreRows: CORES.map((c) => ({ name: c.toUpperCase(), word: WORDS[pvCores[c]], val: pvCores[c], dia: dia(10, pvCores[c], D.core[c], 9),
        nameStyle: 'font-size: 18px; font-weight: 700; letter-spacing: 0.1em; color: ' + D.core[c], valStyle: 'font-size: 34px; font-weight: 700; color: ' + D.core[c] })),
      skills: A ? Object.entries(A.preset).map(([id, p]) => ({ name: SK[id].name, pts: p + ' pts', style: 'color: ' + ATTR[SK[id].attr].ink })) : [],
      leans: A ? A.leans.map((l) => CLASSNAME[l]).join(' · ') : 'whatever you build',
      budget: A ? budgetOf(A) : 'All ' + CORE_PTS + ' Core, 10 Attribute and 10 Skill points are yours to place',
    };
    const useArch = () => this.setState({ skills: A ? { ...A.preset } : {}, aSet: A ? { ...A.attributes } : {}, cSet: A ? { ...A.cores } : {}, applied: A ? A.id : null, step: 'skills', hover: A ? Object.keys(A.preset)[0] : 'durability' });
    const useLabel = A ? 'Use ' + A.name + ' ›' : 'Start from scratch ›';

    // skills: all 27 at once, three Core columns, each attribute linked to its skills
    const setSkill = (id, v) => () => {
      const cur = this.state.skills[id] || 0;
      if (v < 0 || v > CAP) return;
      const next = { ...this.state.skills }; if (v === 0) delete next[id]; else next[id] = v;
      if (v > cur && !derive(next, this.state.aSet, this.state.cSet).ok) return;
      this.setState({ skills: next, hover: id });
    };
    // What one more point in a skill costs, as the stepper preview says it (spec: "Order doesn't matter").
    const costOf = (id) => {
      const k = SK[id], p = S.skills[id] || 0;
      if (p >= CAP) return { ok: false, text: k.name + ' is at 10, the most anything can be' };
      if (der.spent >= BUDGET) return { ok: false, text: 'No Skill points left' };
      const nx = derive({ ...S.skills, [id]: p + 1 }, S.aSet, S.cSet), at = ATTR[k.attr], parts = ['−1 Skill'];
      if (nx.attr[k.attr] > der.attr[k.attr]) parts.push('−1 Attribute (' + at.name + ' ' + der.attr[k.attr] + '→' + nx.attr[k.attr] + ')');
      if (nx.core[k.core] > der.core[k.core]) parts.push('−1 Core (' + title(k.core) + ' ' + der.core[k.core] + '→' + nx.core[k.core] + ')');
      if (!nx.ok) return { ok: false, text: 'Not enough ' + (nx.coreLeft < 0 ? 'Core' : 'Attribute') + ' points left for ' + k.name + ' ' + (p + 1) };
      return { ok: true, text: parts.join(' · ') };
    };
    // Raise or lower a Core or Attribute by hand. Lowering stops at what the skills under it need.
    const statStep = (kind, id, dir) => () => {
      const St = this.state, d0 = derive(St.skills, St.aSet, St.cSet), cur = kind === 'core' ? d0.core[id] : d0.attr[id];
      const key = kind === 'core' ? 'cSet' : 'aSet', next = { ...St[key], [id]: cur + dir };
      const d1 = kind === 'core' ? derive(St.skills, St.aSet, next) : derive(St.skills, next, St.cSet);
      const now = kind === 'core' ? d1.core[id] : d1.attr[id];
      if (dir > 0 && (!d1.ok || now === cur)) return;
      if (dir < 0 && now === cur) return;
      this.setState({ [key]: next });
    };
    const floorOf = (kind, id) => (kind === 'core' ? derive(S.skills, S.aSet, {}).core[id] : derive(S.skills, {}, {}).attr[id]);
    const canUp = (kind, id) => { const v = kind === 'core' ? der.core[id] : der.attr[id]; if (v >= STAT_CAP) return false;
      const d1 = kind === 'core' ? derive(S.skills, S.aSet, { ...S.cSet, [id]: v + 1 }) : derive(S.skills, { ...S.aSet, [id]: v + 1 }, S.cSet); return d1.ok; };
    const stepStyle = (color) => 'width: 26px; height: 26px; border-radius: 6px; border: 1px solid ' + color + '; background: transparent; color: ' + color + '; font-family: inherit; font-size: 15px; line-height: 1; padding: 0; cursor: pointer';
    const coreCols = CORES.map((c) => ({
      name: c.toUpperCase(), val: der.core[c], word: WORDS[der.core[c]],
      up: statStep('core', c, 1), down: statStep('core', c, -1), noUp: !canUp('core', c), noDown: der.core[c] <= floorOf('core', c), stepStyle: stepStyle(D.core[c]),
      headStyle: 'display: flex; align-items: baseline; gap: 10px; padding: 8px 14px; border-radius: 10px; background: #10151F; border: 1px solid ' + D.core[c] + '; color: ' + D.core[c],
      attrs: D.attrs.filter((a) => a.core === c).map((a) => ({
        name: a.name.toUpperCase(), val: der.attr[a.id], fx: a.fx,
        up: statStep('attr', a.id, 1), down: statStep('attr', a.id, -1), noUp: !canUp('attr', a.id), noDown: der.attr[a.id] <= floorOf('attr', a.id), stepStyle: stepStyle(a.ink),
        spineStyle: 'display: flex; flex-direction: column; margin-left: 12px; padding: 4px 0 4px 14px; border-left: 2px solid ' + a.ink,
        nodeStyle: 'width: 14px; height: 14px; transform: rotate(45deg); background: ' + a.ink + '; flex: none',
        nameStyle: 'font-size: 13px; font-weight: 700; letter-spacing: 0.12em; color: ' + a.ink + '; white-space: nowrap',
        barStyle: 'position: absolute; left: -14px; right: 0; top: 0; height: 2px; background: ' + a.ink + '; opacity: 0.6',
        cards: D.skills.filter((s) => s.attr === a.id).map((s) => {
          const p = S.skills[s.id] || 0, m = mod(p);
          return { ...s, pts: p, modShort: fmt(m) + (p >= 5 ? ' M2' : p >= 3 ? ' M1' : ''),
            modStyle: 'font-size: 11px; color: ' + (m < 0 ? '#7F8BA1' : a.ink),
            nameStyle: 'font-size: 12px; font-weight: 700; line-height: 1.2; min-height: 29px; color: ' + (p ? a.ink : '#C9D3E3'),
            inc: setSkill(s.id, p + 1), dec: setSkill(s.id, p - 1), noInc: !costOf(s.id).ok, incTitle: costOf(s.id).text, noDec: p <= 0, hover: () => { if (this.state.hover !== s.id) this.setState({ hover: s.id }); },
            help: () => this.setState({ epccg: s.id, hover: s.id }), helpStyle: epBtnStyle(a.ink, 'position: absolute; top: 10px; right: 10px'),
            style: 'position: relative; display: flex; flex-direction: column; gap: 5px; padding: 6px; border-radius: 9px; background: #10151F; border: 1px solid ' + (S.hover === s.id ? '#E7EBF3' : p > 0 ? a.ink : '#232D3F') };
        }),
      })),
    }));
    const hv = SK[S.hover] || D.skills[0], hp = S.skills[hv.id] || 0;
    const detail = { img: hv.img, name: hv.name.toUpperCase(), attr: ATTR[hv.attr].name, mod: fmt(mod(hp)) + (hp === 0 ? ' untrained' : ''), summary: hv.summary, quiet: hv.quiet,
      nameStyle: 'font-size: 13px; font-weight: 700; letter-spacing: 0.1em; color: ' + ATTR[hv.attr].ink,
      style: 'display: flex; align-items: center; gap: 14px; padding: 10px 14px; border-radius: 12px; background: #10151F; border: 1px solid #232D3F; border-left: 3px solid ' + ATTR[hv.attr].ink };
    const sideCores = CORES.map((c) => ({ name: c.toUpperCase(), val: der.core[c], word: WORDS[der.core[c]], nameStyle: 'font-size: 15px; font-weight: 700; letter-spacing: 0.1em; color: ' + D.core[c] }));
    const leanList = der.leans.length ? der.leans.map((l) => ({ name: l.name, total: l.total, chip: 'padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; border: 1px solid ' + D.core[l.core] + '; color: ' + D.core[l.core] }))
      : [{ name: 'Place some points', total: '', chip: 'font-size: 12px; color: #A3AEC2' }];
    const archNote = S.applied ? 'Started from the ' + ARCH[S.applied].name + ' archetype. Change anything; the archetype is not saved.' : 'Built from scratch.';

    // traits
    const cats = ['All', ...new Set(D.traits.map((t) => t.cat))];
    const catTabs = cats.map((c) => ({ name: c, pick: set({ tcat: c }), selected: S.tcat === c ? 'true' : 'false', style: btn(S.tcat === c, '#E7EBF3') }));
    const picked = S.traits;
    const blocked = new Set(); picked.forEach((id) => { const t = D.traits.find((x) => x.id === id); (t ? t.ex : []).forEach((e) => blocked.add(e)); });
    D.traits.forEach((t) => { if (t.ex.some((e) => picked.includes(e))) blocked.add(t.id); });
    const traitCards = D.traits.filter((t) => S.tcat === 'All' || t.cat === S.tcat).map((t) => {
      const on = picked.includes(t.id), ex = blocked.has(t.id) && !on, full = picked.length >= 2 && !on;
      return { name: t.name, icon: t.icon, cat: t.cat.toUpperCase(), flavour: t.flavour, up: t.up.map((x) => ({ text: x })), down: t.down.map((x) => ({ text: x })),
        toggle: () => this.setState({ traits: on ? picked.filter((x) => x !== t.id) : [...picked, t.id] }), disabled: ex || full, pressed: on ? 'true' : 'false',
        btn: on ? 'Remove' : ex ? 'Excluded by a pick' : full ? 'Two already picked' : 'Take this trait',
        btnStyle: 'margin-top: auto; min-height: 40px; border-radius: 8px; font-family: inherit; font-weight: 700; cursor: pointer; ' + (on ? 'border: 0; background: #E7EBF3; color: #0A0D13' : 'border: 1px solid #2E3A50; background: transparent; color: ' + (ex || full ? '#7F8BA1' : '#E7EBF3')),
        style: 'display: flex; flex-direction: column; gap: 8px; padding: 16px; border-radius: 12px; background: #10151F; border: 1px solid ' + (on ? '#E7EBF3' : '#232D3F') + (ex ? '; opacity: 0.55' : '') };
    });
    const traitChip = picked.length + ' OF 2 PICKED';

    // kit
    const kitCards = D.kits.map((k) => ({ name: k.name, items: k.items.map((x) => ({ text: x })), pick: set({ kit: k.id }), pressed: S.kit === k.id ? 'true' : 'false',
      style: 'display: flex; flex-direction: column; align-items: flex-start; gap: 8px; text-align: left; padding: 18px; border-radius: 12px; color: #E7EBF3; font-family: inherit; cursor: pointer; ' + (S.kit === k.id ? 'background: #1C2536; border: 1px solid #E7EBF3' : 'background: #10151F; border: 1px solid #232D3F') }));

    // lock in
    const trainedSkills = D.skills.filter((s) => S.skills[s.id]).map((s) => ({ label: s.name + ' ' + S.skills[s.id], style: 'font-size: 14px; font-weight: 600; color: ' + ATTR[s.attr].ink }));
    const traitNames = picked.length ? picked.map((id) => (D.traits.find((t) => t.id === id) || {}).name).join(' · ') : 'None';
    const budgets = [[left, 'SKILL'], [der.attrLeft, 'ATTRIBUTE'], [der.coreLeft, 'CORE']].map(([n, k]) => ({ text: n + ' ' + k + ' LEFT', style: chip(n === 0 ? '#6FEA77' : '#FFFFFF') }));
    const statsPlaced = der.attrLeft === 0 && der.coreLeft === 0;
    const checks = [['Name', !!S.name], ['Origin', S.origin !== null], ['All 10 Skill points spent', left === 0], ['All Attribute and Core points placed', statsPlaced], ['Starting kit', !!S.kit]].map(([label, ok]) => ({
      label, mark: ok ? '✓' : '◆', markStyle: 'width: 20px; text-align: center; font-weight: 700; color: ' + (ok ? '#6FEA77' : '#FFFFFF') }));
    const cantLock = checks.some((c) => c.mark !== '✓');

    // lock in: the full record (spec formulas; identity fields are free text, the sample shows MPAT's)
    const AV = der.attr, PT = (id) => S.skills[id] || 0, MD = (id) => mod(PT(id)), pos = (m) => Math.max(0, m);
    const sample = !!this.props.sampleName;
    const record = [['Race', sample ? 'Robot' : ''], ['Gender', sample ? 'Plug' : ''], ['Blood type', sample ? 'Oil' : ''], ['Main hand', sample ? 'Right' : ''],
      ['Association', sample ? '258th Medical Unit' : ''], ['Favourite song', ''], ['Last dream', ''],
      ['History', sample ? 'Seven years with the 258th Medical Unit. Last posting: Outpost-813, on the rim of B813.' : '']]
      .map(([k, v]) => ({ k, v: v || 'Not filled in', vStyle: 'font-size: 14px; line-height: 1.45; color: ' + (v ? '#E7EBF3' : '#7F8BA1') }));
    const originRows = o ? [['Home', o.Home], ['Upbringing', o.Upbringing], ['You know', o['You know']], ['People see you as', o['People see you as']], ['Suggested skills', o.Skills], ['Hook', o.Hook]]
      .map(([k, v]) => ({ k: k.toUpperCase(), v: v.charAt(0).toUpperCase() + v.slice(1) })) : [];
    const n2 = (x) => (Math.round(x * 100) / 100).toString();
    const stats = [['Max HP', 100 + 15 * (AV.endurance - 1)], ['HP per level', 5 + 2 * PT('durability')], ['Max MP', 100 + 100 * (AV.virtue - 1)], ['AP per turn', 6],
      ['Echo', '1 at session start'], ['Initiative', fmt(AV.agility - 1 + MD('reaction_speed'))], ['Movement', (1 + 0.5 * (AV.agility - 1)) + ' tiles per AP'],
      ['Defense', 10 + pos(MD('athletics'))], ['Carry', (20 + 5 * (AV.strength - 1)) + ' kg'], ['Vision', (12 + 2 * (AV.perception - 1)) + ' tiles'],
      ['Saves B / Br / H', fmt(MD('guts')) + ' / ' + fmt(MD('charisma')) + ' / ' + fmt(MD('composure'))], ['Healing given', '×' + n2(1 + 0.1 * (AV.insight - 1) + 0.1 * PT('camaraderie'))]]
      .map(([k, v]) => ({ k, v: String(v) }));
    const tree = CORES.map((c) => ({ name: c.toUpperCase(), val: der.core[c], word: WORDS[der.core[c]], nameStyle: 'font-size: 15px; font-weight: 700; letter-spacing: 0.1em; color: ' + D.core[c],
      attrs: D.attrs.filter((a) => a.core === c).map((a) => ({ name: a.name, val: AV[a.id], nameStyle: 'font-size: 13px; font-weight: 700; color: ' + a.ink,
        skills: D.skills.filter((sk) => sk.attr === a.id).map((sk) => { const p = PT(sk.id), m = mod(p);
          return { name: sk.name, pts: p, mod: fmt(m) + (p >= 10 ? ' · Mastered' : p >= 9 ? ' · M4' : p >= 7 ? ' · M3' : p >= 5 ? ' · M2' : p >= 3 ? ' · M1' : ''),
            style: 'display: flex; justify-content: space-between; gap: 6px; font-size: 13px; color: ' + (p ? '#E7EBF3' : '#7F8BA1') }; }) })) }));
    const traitFull = picked.map((id) => D.traits.find((t) => t.id === id)).filter(Boolean).map((t) => ({ name: t.name, cat: t.cat.toUpperCase(), icon: t.icon, flavour: t.flavour,
      up: t.up.map((x) => ({ text: x })), down: t.down.map((x) => ({ text: x })) }));
    const kit = S.kit ? D.kits.find((k) => k.id === S.kit) : null;
    const kitItems = [...(kit ? kit.items : []), 'Essence of Experience ×1'].map((text) => ({ text }));
    const voiceList = D.skills.filter((sk) => PT(sk.id) > 0).sort((a, b) => PT(b.id) - PT(a.id)).slice(0, 4).map((sk) => ({ name: sk.name.toUpperCase(), line: sk.quiet,
      nameStyle: 'font-size: 12px; font-weight: 700; letter-spacing: 0.12em; color: ' + ATTR[sk.attr].ink }));
    const leanCards = der.leans.map((l) => { const c = D.classes.find((x) => x.id === l.id);
      return { name: l.name, total: l.total, sig: c.sig.map((id) => SK[id].name + ' ' + PT(id)).join(' · '), nameStyle: 'font-size: 15px; font-weight: 700; color: ' + D.core[l.core] }; });

    return { ...epccgVals(this),
      steps, headerName: S.name || 'UNNAMED', budgetChip: left + ' SKILL · ' + der.attrLeft + ' ATTRIBUTE · ' + der.coreLeft + ' CORE LEFT', budgetChipStyle: chip(left === 0 && statsPlaced ? '#6FEA77' : '#FFFFFF'), budgets,
      isIdentity: S.step === 'identity', isArchetype: S.step === 'archetype', isSkills: S.step === 'skills', isTraits: S.step === 'traits', isKit: S.step === 'kit', isLockin: S.step === 'lockin',
      name: S.name, onName: (e) => this.setState({ name: e.target.value }), originCards, hasOrigin: !!o, origin, portrait, portraitThumbs,
      famTabs, famBlurb, archCards, pv, useArch, useLabel,
      budgetText: left + ' OF 10 LEFT', budgetStyle: chip(left === 0 ? '#6FEA77' : '#FFFFFF'), resetSkills: set({ skills: {}, aSet: {}, cSet: {}, applied: null }), coreCols, detail, sideCores, leanList, archNote,
      catTabs, traitCards, traitChip, traitChipStyle: chip(picked.length ? '#6FEA77' : '#FFFFFF'),
      kitCards,
      summaryLine: [o ? o.name : 'No origin yet', S.kit ? (D.kits.find((k) => k.id === S.kit) || {}).name : 'No kit yet'].join(' · '),
      trainedSkills, traitNames, leanText: der.leans.length ? der.leans.map((l) => l.name).join(' or ') : 'Place some points first',
      record, originRows, stats, tree, traitFull, hasTraits: traitFull.length > 0, noTraits: traitFull.length === 0, kitItems, kitName: kit ? kit.name : 'No kit yet', voiceList, hasVoices: voiceList.length > 0, leanCards,
      originName: o ? o.name : 'No origin yet', hasOriginRows: !!o,
      checks, cantLock, lockStyle: 'min-height: 50px; border-radius: 10px; border: 0; font-family: inherit; font-size: 16px; font-weight: 700; cursor: pointer; ' + (cantLock ? 'background: #1C2536; color: #7F8BA1' : 'background: #6FEA77; color: #0A0D13'),
      back: set({ step: STEPS[Math.max(0, stepIdx - 1)][0] }), next: set({ step: STEPS[Math.min(STEPS.length - 1, stepIdx + 1)][0] }), atStart: stepIdx === 0, atEnd: stepIdx === STEPS.length - 1,
    };
  }
}
