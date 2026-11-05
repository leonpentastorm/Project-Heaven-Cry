const D = __DATA__;
/*LIGHTBOX*/
// The Ultimate perk award: the one moment an Ultimate is shown. Ultimates are secret everywhere else (spec, Perks):
// no list, hint or progress until the engine grants one. Two held combo perks converge on a white medallion.
// White is the colour system's rarest state colour, so the Ultimate takes no skill's ink; its skills appear as chips.
const rgba = (hex, a) => 'rgba(' + [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ') + ', ' + a + ')';
const START = Math.max(0, D.ults.findIndex((u) => u.id === 'angel_of_the_trenches')); // MPAT's natural Ultimate (Field Surgeon + Between Heartbeats)

class Component extends DCLogic {
  constructor(props) { super(props); this.state = { i: START, taken: false, run: 0 }; }

  renderVals() {
    const S = this.state, n = D.ults.length, u = D.ults[S.i];
    const go = (d) => () => this.setState({ i: (S.i + d + n) % n, taken: false, run: S.run + 1 });
    const chip = (k) => ({ label: k.name, style: 'padding: 3px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; border: 1px solid ' + k.ink + '; color: ' + k.ink + '; background: ' + rgba(k.ink, 0.1) });
    const sources = u.sources.map((q, k) => ({
      name: q.name, icon: q.icon, has: !!q.icon, none: !q.icon, zoom: q.icon ? zoomer(this, q.icon, q.name, 'perk') : () => {}, alt: q.name + ' combo perk icon (Wick)',
      segs: q.skills.map((x) => ({ style: 'flex: 1; height: 3px; background: ' + x.ink })), skills: q.skills.map((x) => x.name).join(' + '),
      lineStyle: 'flex: 1 1 60px; min-width: 40px; height: 1px; background: ' + (k === 0 ? 'linear-gradient(90deg, #2E3A50, #FFFFFF)' : 'linear-gradient(90deg, #FFFFFF, #2E3A50)'),
    }));
    return {
      ...lightboxVals(this),
      key: 'u' + S.run, name: u.name, flavour: u.flavour ? '“' + u.flavour + '”' : '', hasFlavour: !!u.flavour, text: u.text,
      icon: u.icon, has: !!u.icon, none: !u.icon, zoom: u.icon ? zoomer(this, u.icon, u.name, 'perk') : () => {}, alt: u.name + ' Ultimate perk icon (Wick)',
      left: sources[0], right: sources[1], chips: u.skills.map(chip),
      from: 'Earned by holding ' + u.sources[0].name + ' and ' + u.sources[1].name + '.',
      taken: S.taken, notTaken: !S.taken, take: () => this.setState({ taken: true }),
      takenLine: 'On MPAT’s sheet now. Nobody else’s screens will ever list it.',
      prev: go(-1), next: go(1), counter: (S.i + 1) + ' of ' + n, pc: D.pc,
    };
  }
}
