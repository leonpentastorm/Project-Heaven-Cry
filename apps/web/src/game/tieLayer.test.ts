// @vitest-environment jsdom
// The map's tie lines (game/tieLayer.ts) and a Hidden unit's token (game/tokenFade.ts), Leon's two asks at Classes 3.0
// step 10's integration. The layer is rendered for real: the combat template's own <svg data-tie-layer> element through
// the screen runtime, from a combat with one ally Bond and one enemy Bond; then a combat without the ties draws nothing.
import { describe, expect, it } from 'vitest';
import RULES from '../../../../data/rules.json';
import { tieLayerVals, TIE_OPACITY, TIE_WIDTH, TIE_MARK } from './tieLayer';
import { tokenOpacity, fadeStyle, HIDDEN_OPACITY } from './tokenFade';

const React = await import('react'); const { createRoot } = await import('react-dom/client'); const { act } = await import('react');
const { makeScreen } = await import('../dc/runtime');
const tpl: string = (await import('../templates/combat.template.html?raw')).default;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const BOND: any = (RULES as any).ties.kinds.find((k: any) => k.id === 'bond');
// the template's one line for the layer (so the test follows the screen's own markup)
const layerTpl = tpl.split('\n').find((l) => l.includes('data-tie-layer'))!;

const unit = (id: string, side: string, pos: string, o: any = {}) => ({ id, side, pos, name: id, hp: 10, maxHp: 10, ...o });
const fight = (ties: any[]) => ({ map: { w: 10, h: 8 }, units: [unit('me', 'pc', '1,1'), unit('mate', 'pc', '5,1'), unit('foe', 'foe', '1,6')], ties });
const BONDS = [{ kind: 'bond', from: 'me', to: 'mate' }, { kind: 'bond', from: 'me', to: 'foe' }];

function render(vals: any): HTMLElement {
  class L { props: any; _update: any; constructor(p: any) { this.props = p; } renderVals() { return { tieLayer: vals }; } setState() {} }
  const Screen = makeScreen(layerTpl, L as any);
  const host = document.createElement('div'); document.body.appendChild(host);
  act(() => { createRoot(host).render(React.createElement(Screen as any, {})); });
  return host;
}

describe('the tie lines: one ally Bond and one enemy Bond', () => {
  it('two lines, in Insight\'s ink from data; the ally solid, the enemy dashed; thin and faint; no pointer', () => {
    const v = tieLayerVals(fight(BONDS), { motion: false });
    const host = render(v);
    const svg = host.querySelector('svg[data-tie-layer]') as SVGElement;
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('style') || '').toContain('pointer-events: none');
    const lines = [...host.querySelectorAll('line[data-tie]')];
    expect(lines.length).toBe(2);
    const ally = lines.find((l) => l.getAttribute('data-tie-side') === 'ally')!, foe = lines.find((l) => l.getAttribute('data-tie-side') === 'foe')!;
    for (const l of [ally, foe]) {
      expect(l.getAttribute('stroke')).toBe(BOND.line.ink);
      expect(Number(l.getAttribute('stroke-width'))).toBe(TIE_WIDTH);
      expect(Number(l.getAttribute('stroke-opacity'))).toBe(TIE_OPACITY.rest);
    }
    expect(ally.getAttribute('stroke-dasharray') || '').toBe('');
    expect(foe.getAttribute('stroke-dasharray')).toBe(BOND.line.foe_dash);
  });
  it('the Bonder\'s turn and a hovered chip draw stronger; reduced motion has no pulse', () => {
    const turn = tieLayerVals(fight(BONDS), { turnOf: 'me' });
    expect(turn.lines.every((l) => l.opacity === TIE_OPACITY.hot && l.cls === 'phc-tie-pulse')).toBe(true);
    const chip = tieLayerVals(fight(BONDS), { hotTo: 'foe', motion: false });
    expect(chip.lines.find((l) => l.to === 'foe')!.opacity).toBe(TIE_OPACITY.hot);
    expect(chip.lines.find((l) => l.to === 'mate')!.opacity).toBe(TIE_OPACITY.rest);
    expect(chip.lines.every((l) => l.cls === '')).toBe(true);
  });
  it('a line follows its tokens: moved, it is redrawn from the new tile', () => {
    const a = tieLayerVals(fight([BONDS[0]])).lines[0];
    const f = fight([BONDS[0]]); f.units[1].pos = '5,4';
    const b = tieLayerVals(f).lines[0];
    expect(b.key).toBe(a.key); expect(b.y2).toBeGreaterThan(a.y2);
  });
});
describe('adjacent tokens: the link mark at the shared edge (Leon: the line between neighbours was invisible)', () => {
  // the Mender beside its Bonded ally (east) and beside a Bonded enemy (south): the rims leave a few pixels between them
  const near = () => ({ map: { w: 10, h: 8 }, units: [unit('me', 'pc', '3,3'), unit('mate', 'pc', '4,3'), unit('foe', 'foe', '3,4')], ties: BONDS });
  it('each near pair draws a mark at least TIE_MARK.len long, thicker and stronger than the far line, with a knot; ally solid and filled, enemy dashed and hollow; no pointer', () => {
    const v = tieLayerVals(near(), { motion: false });
    const host = render(v);
    const svg = host.querySelector('svg[data-tie-layer]') as SVGElement;
    expect(svg.getAttribute('style') || '').toContain('pointer-events: none');
    const lines = [...host.querySelectorAll('line[data-tie]')];
    expect(lines.length).toBe(2);
    for (const l of lines) {
      const len = Math.hypot(Number(l.getAttribute('x2')) - Number(l.getAttribute('x1')), Number(l.getAttribute('y2')) - Number(l.getAttribute('y1')));
      expect(len).toBeGreaterThanOrEqual(TIE_MARK.len - 1);
      expect(Number(l.getAttribute('stroke-width'))).toBeGreaterThan(TIE_WIDTH);
      expect(Number(l.getAttribute('stroke-opacity'))).toBeGreaterThan(TIE_OPACITY.hot);
      expect(l.getAttribute('stroke')).toBe(BOND.line.ink);
    }
    const ally = lines.find((l) => l.getAttribute('data-tie-side') === 'ally')!, foe = lines.find((l) => l.getAttribute('data-tie-side') === 'foe')!;
    expect(ally.getAttribute('stroke-dasharray') || '').toBe('');
    expect(foe.getAttribute('stroke-dasharray')).toBe(BOND.line.foe_dash);
    const knots = [...host.querySelectorAll('circle[data-tie-knot]')];
    expect(knots.length).toBe(2);
    const ka = knots.find((k) => k.getAttribute('data-tie-side') === 'ally')!, kf = knots.find((k) => k.getAttribute('data-tie-side') === 'foe')!;
    expect(ka.getAttribute('fill')).toBe(BOND.line.ink);
    expect(kf.getAttribute('fill')).not.toBe(BOND.line.ink); expect(kf.getAttribute('stroke')).toBe(BOND.line.ink);
    // the knot sits on the shared edge: halfway between the two tiles' centres (the ally is east, the enemy south)
    expect(Number(ka.getAttribute('cy'))).toBe(Number(ally.getAttribute('y1')));
    expect(Number(kf.getAttribute('cx'))).toBe(Number(foe.getAttribute('x1')));
  });
  it('far pairs keep the faint line and no knot', () => {
    const v = tieLayerVals(fight(BONDS), { motion: false });
    expect(v.knots.length).toBe(0); expect(v.lines.every((l) => !l.mark && l.width === TIE_WIDTH)).toBe(true);
  });
});
describe('no tie, no line', () => {
  it('a view without ties (or with a far end it cannot see) renders none', () => {
    expect(render(tieLayerVals(fight([]))).querySelectorAll('line[data-tie]').length).toBe(0);
    const unseen = tieLayerVals(fight([{ kind: 'bond', from: 'me', to: '?' }]));
    expect(unseen.lines.length).toBe(0); expect(unseen.has).toBe(false);
    expect(tieLayerVals(fight([{ kind: 'owned', from: 'me', to: 'mate' }])).lines.length).toBe(0); // a kind with no line
  });
});
describe('a Hidden unit\'s token', () => {
  it('60% while Hidden; Downed wins; a held portrait is not drawn; plain otherwise', () => {
    expect(tokenOpacity({ hidden: true })).toBe(HIDDEN_OPACITY);
    expect(HIDDEN_OPACITY).toBe(0.6);
    expect(tokenOpacity({ hidden: true, downed: true })).toBe(0.5);
    expect(tokenOpacity({ hidden: true }, { held: true })).toBe(0);
    expect(tokenOpacity({})).toBe(1);
    expect(fadeStyle({})).toBe(''); expect(fadeStyle({ hidden: true })).toBe('; opacity: 0.6');
  });
});
