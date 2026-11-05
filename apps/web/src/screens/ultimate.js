// The Ultimate perk award, ported from design/canvas-build/ultimate.logic.js. Shown only when the engine grants an
// Ultimate to one of your characters; the prototype's "preview all six" strip is gone (Ultimates stay secret).
import { DCLogic } from '../dc/runtime';
import { D, lightboxVals, zoomer } from './shared';
import { act, getState, go } from '../game/store';

const rgba = (hex, a) => 'rgba(' + [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ') + ', ' + a + ')';

export class UltimateLogic extends DCLogic {
  constructor(props) { super(props); this.state = { taken: false }; }
  renderVals() {
    const st = getState(), g = st.game;
    const award = g && g.awards.find((a) => g.characters[a.charId]?.owner === st.me.id);
    const u = award && D.ults.find((x) => x.id === award.perkId);
    if (!award || !u) { if (!this.state.taken) queueMicrotask(() => go(g ? (g.phase === 'combat' ? 'combat' : 'main') : 'home')); }
    const shown = u || D.ults[0], c = award ? g.characters[award.charId] : null;
    const chip = (k) => ({ label: k.name, style: 'padding: 3px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; border: 1px solid ' + k.ink + '; color: ' + k.ink + '; background: ' + rgba(k.ink, 0.1) });
    const sources = shown.sources.map((q, k) => ({ name: q.name, icon: q.icon, has: !!q.icon, none: !q.icon, zoom: q.icon ? zoomer(this, q.icon, q.name, 'perk') : () => {}, alt: q.name + ' combo perk icon (Wick)',
      segs: q.skills.map((x) => ({ style: 'flex: 1; height: 3px; background: ' + x.ink })), skills: q.skills.map((x) => x.name).join(' + '),
      lineStyle: 'flex: 1 1 60px; min-width: 40px; height: 1px; background: ' + (k === 0 ? 'linear-gradient(90deg, #2E3A50, #FFFFFF)' : 'linear-gradient(90deg, #FFFFFF, #2E3A50)') }));
    return {
      ...lightboxVals(this), name: shown.name, flavour: shown.flavour ? '“' + shown.flavour + '”' : '', hasFlavour: !!shown.flavour, text: shown.text,
      icon: shown.icon, has: !!shown.icon, none: !shown.icon, zoom: shown.icon ? zoomer(this, shown.icon, shown.name, 'perk') : () => {}, alt: shown.name + ' Ultimate perk icon (Wick)',
      left: sources[0], right: sources[1], chips: shown.skills.map(chip), from: 'Earned by holding ' + shown.sources[0].name + ' and ' + shown.sources[1].name + '.',
      pc: c ? c.portrait : '', whoName: c ? c.name : '', taken: this.state.taken, notTaken: !this.state.taken,
      take: () => { this.setState({ taken: true }); act({ type: 'award/ack', charId: award.charId, perkId: award.perkId }); setTimeout(() => go(g.phase === 'combat' ? 'combat' : 'main'), 1800); },
      takenLine: 'On ' + (c ? c.name : 'your') + '’s sheet now. Nobody else’s screens will ever list it.',
      prev: () => {}, next: () => {}, counter: '',
    };
  }
}
