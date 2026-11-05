const D = __DATA__;
/*LIGHTBOX*/
const W = 16, H = 11;
// Movement is tiles per AP (spec: Moving): 1 + 0.5 x (Agility - 1). MPAT has Agility 3, so 2 tiles per AP.
const AGILITY = 3, MOV = 1 + 0.5 * (AGILITY - 1);
const HULL = new Set(); for (let x = 13; x < 16; x++) for (let y = 0; y < 6; y++) HULL.add(x + ',' + y);
const CRATES = new Set(['11,2', '11,3', '11,4', '10,6']);
const WRECK = new Set(['1,9', '2,9', '3,9', '4,9', '6,9', '7,9', '1,10', '3,10', '5,10', '8,10']);
const HOSTILES = {
  keel: { name: 'Chief Engineer Keel', short: 'KE', img: D.npc, pos: '12,3', hp: 110, max: 110, def: 12, cover: 'half cover' },
  e1: { name: 'Engineer', short: 'E1', pos: '12,6', hp: 100, max: 100, def: 10, cover: 'no cover' },
  e2: { name: 'Engineer', short: 'E2', pos: '12,1', hp: 64, max: 100, def: 12, cover: 'half cover' },
};
const ACTIONS = [
  ['CLASS · MEDIC I', [['triage', 'Triage', 2, 'Heal an adjacent ally 20 × your Healing given multiplier (×1.9 = 38) and end their Bleeding. No Supplies. Stabilise a Downed ally for 1 AP.'],
    ['stim_throw', 'Stim Throw', 1, 'Spend 1 Supply: an ally within 4 tiles heals 30 × Healing given and stops Bleeding.', 'Locked: rank II at a signature total of 13 (MPAT has 7).']]],
  ['MOVEMENT', [['move', 'Move', 1, 'Each AP moves you ' + MOV + ' tiles (Movement, from Agility ' + AGILITY + '). Wrecked robots count double. Tiles you paid for and didn\'t walk stay yours this turn.'], ['sprint', 'Sprint', 2, 'Move up to ' + 3 * MOV + ' tiles (3 × Movement).'], ['disengage', 'Disengage', 1, 'Move 1 tile without provoking opportunity attacks.'], ['prone', 'Drop prone', 1, 'Melee against you +2, ranged against you −2.']]],
  ['ATTACK · SERVICE PISTOL', [['shot', 'Shot', 2, 'd20 + Dexterity (+1) vs Defense. 20 damage, Heat +1.'], ['aimed', 'Aimed shot', 3, '+2 to hit; crits on 19–20.'], ['melee', 'Melee (fists)', 2, 'd20 + Raw Power (−2) vs Defense. 10 damage.'], ['overwatch', 'Overwatch', 2, 'Hold 2 AP for one shot at the first enemy that moves into your line.']]],
  ['UTILITY', [['reload', 'Reload', 2, 'Reload a magazine.'], ['analyze', 'Analyze', 2, 'Reveal one enemy\'s HP, armour, resistances and weak points.'], ['item', 'Use item', 1, 'Use an item, draw or swap a weapon, open a door.'], ['parley', 'Parley', 2, 'Persuade or threaten mid-fight: a skill check against the target\'s disposition.']]],
];
const COST = {}; const INFO = {};
ACTIONS.forEach(([, items]) => items.forEach(([id, name, ap, text, lock]) => { COST[id] = ap; INFO[id] = { name, text, lock }; }));
// Cheapest path over the grid: 8 directions, a wreck tile counts double, hull and units block.
// (Diagonal cost is spec open item 3; the prototype counts a diagonal step as 1.)
const ARROWS = { '1,0': '→', '-1,0': '←', '0,1': '↓', '0,-1': '↑', '1,1': '↘', '-1,1': '↙', '1,-1': '↗', '-1,-1': '↖' };
function paths(from, blocked) {
  const dist = { [from]: 0 }, prev = {}, open = [from];
  while (open.length) {
    open.sort((a, b) => dist[a] - dist[b]); const k = open.shift(); const [x, y] = k.split(',').map(Number);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      if (!dx && !dy) continue; const nx = x + dx, ny = y + dy, n = nx + ',' + ny;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || HULL.has(n) || blocked.has(n)) continue;
      // a tiny extra on diagonals breaks ties toward straight lines; the tile count stays whole
      const d = dist[k] + (WRECK.has(n) ? 2 : 1) + (dx && dy ? 0.001 : 0);
      if (dist[n] === undefined || d < dist[n] - 1e-9) { dist[n] = d; prev[n] = k; open.push(n); }
    }
  }
  Object.keys(dist).forEach((k) => { dist[k] = Math.round(dist[k]); });
  return { dist, prev };
}
const apFor = (tiles, bank) => Math.ceil(Math.max(0, tiles - bank) / MOV);

class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { pos: '3,6', ap: 6, bank: 0, hover: null, action: 'shot', target: 'keel', log: [
      'Keel fires from behind the platinum crates. The round sparks off the deck a hand\'s width from 4-Ten.',
      'Ninety-Two drags 4-Ten behind the wreck line. One of his legs stays where it was.'] };
  }

  renderVals() {
    const S = this.state;
    const blocked = new Set(['2,8', '5,8', ...Object.values(HOSTILES).map((h) => h.pos)]);
    const P = paths(S.pos, blocked);
    const reach = (k) => P.dist[k] !== undefined && k !== S.pos && apFor(P.dist[k], S.bank) <= S.ap;
    const isMove = S.action === 'move', hv = isMove && S.hover && reach(S.hover) ? S.hover : null;
    const route = {}; let moveAp = 0;
    if (hv) { moveAp = apFor(P.dist[hv], S.bank); let k = hv; while (P.prev[k]) { const p = P.prev[k]; const [ax, ay] = p.split(',').map(Number), [bx, by] = k.split(',').map(Number); route[p] = ARROWS[(bx - ax) + ',' + (by - ay)]; k = p; } }
    const cost = isMove ? moveAp : (COST[S.action] || 0);
    const party = { [S.pos]: { img: D.pc, label: 'MPAT (you, Leon)', ring: '#7FD4FF' }, '2,8': { img: D.p2, label: 'Ninety-Two (Mai)', ring: '#FF9EC7' }, '5,8': { badge: '4-10', label: '4-Ten, Downed (Leon)', ring: '#7FD4FF' } };
    const foes = {}; Object.entries(HOSTILES).forEach(([id, h]) => { foes[h.pos] = { id, ...h }; });
    const tiles = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = x + ',' + y, p = party[k], f = foes[k], inRange = isMove && !p && !f && reach(k);
      let bg = '#0D1119', border = '1px solid #151C29';
      if (HULL.has(k)) { bg = '#1C2536'; border = '1px solid #232D3F'; }
      if (CRATES.has(k)) { bg = '#2A2113'; border = '1px solid #4A3A20'; }
      if (inRange) { bg = 'rgba(231, 235, 243, 0.12)'; border = '1px dashed #E7EBF3'; }
      const sel = f && S.target === f.id;
      tiles.push({
        label: p ? p.label : f ? f.name + ' (hostile)' : HULL.has(k) ? 'Ship hull' : CRATES.has(k) ? 'Platinum crates, half cover' : WRECK.has(k) ? 'Wrecked robots, difficult terrain' : 'Tile ' + k,
        click: () => this.tileClick(k), hover: () => { if (this.state.hover !== k) this.setState({ hover: k }); },
        hasArrow: !!route[k] && k !== S.pos, arrow: route[k] || '', hasCost: k === hv, cost: (moveAp ? '−' + moveAp + ' AP' : 'Paid') + ' · ' + P.dist[k] + (P.dist[k] === 1 ? ' tile' : ' tiles'),
        hasImg: !!((p && p.img) || (f && f.img)), img: (p && p.img) || (f && f.img) || '',
        imgStyle: 'width: 38px; height: 38px; object-fit: cover; ' + (p ? 'border-radius: 50%; border: 3px solid ' + p.ring : 'border-radius: 4px; border: 2px solid ' + (sel ? '#FFFFFF' : '#F65157')),
        hasBadge: !!((p && p.badge) || (f && !f.img)), badge: (p && p.badge) || (f && f.short) || '',
        badgeStyle: 'display: grid; place-items: center; width: 36px; height: 36px; font-size: 11px; font-weight: 700; ' + (p ? 'border-radius: 50%; border: 2px dashed ' + p.ring + '; color: ' + p.ring : 'border-radius: 4px; border: 2px solid ' + (sel ? '#FFFFFF' : '#F65157') + '; color: #F65157'),
        hasText: WRECK.has(k) && !p, text: 'WRECK',
        style: 'position: relative; display: grid; place-items: center; padding: 0; border-radius: 4px; cursor: pointer; background: ' + (k === hv ? 'rgba(255, 255, 255, 0.28)' : route[k] && k !== S.pos ? 'rgba(255, 255, 255, 0.18)' : bg) + '; border: ' + (k === hv ? '2px solid #FFFFFF' : border),
      });
    }
    const RING = { MPAT: '#7FD4FF', 'Ninety-Two': '#FF9EC7' };
    const initiative = [['Keel', 17, 'foe', D.npc], ['MPAT', 14, 'pc', D.pc], ['E1', 11, 'foe'], ['Ninety-Two', 9, 'pc', D.p2], ['E2', 6, 'foe']].map(([name, init, side, img]) => ({
      zoom: zoomer(this, img || '', name === 'Keel' ? 'Chief Engineer Keel' : name, 'portrait'), name, init, hasImg: !!img, noImg: !img, img: img || '', short: name.slice(0, 2).toUpperCase(),
      imgStyle: 'width: 36px; height: 36px; object-fit: cover; ' + (side === 'pc' ? 'border-radius: 50%; border: 3px solid ' + RING[name] : 'border-radius: 4px; border: 2px solid #F65157'),
      badgeStyle: 'display: grid; place-items: center; width: 36px; height: 36px; border-radius: 4px; border: 2px solid #F65157; color: #F65157; font-size: 11px; font-weight: 700',
      style: 'display: flex; gap: 8px; align-items: center; padding: 6px 12px 6px 6px; border-radius: 999px; flex: none; ' + (name === 'MPAT' ? 'border: 1px solid #E7EBF3; background: #1C2536' : 'border: 1px solid #232D3F'),
    }));
    const apPips = Array.from({ length: 6 }, (_, i) => ({ style: 'height: 14px; border-radius: 4px; ' + (i < S.ap - cost ? 'background: #E7EBF3' : i < S.ap ? 'background: transparent; border: 2px solid #FFFFFF; box-sizing: border-box' : 'background: #1C2536') }));
    const groups = ACTIONS.map(([name, items]) => ({ name, items: items.map(([id, label, ap, text, lock]) => ({
      name: label, cost: id === 'move' ? '1 AP / ' + MOV + ' tiles' : ap + ' AP', text: lock || text, locked: !!lock || ap > S.ap, pressed: S.action === id ? 'true' : 'false', pick: () => this.setState({ action: id }),
      costStyle: 'font-size: 12px; font-weight: 700; color: ' + (lock ? '#7F8BA1' : '#E7EBF3'),
      style: 'display: flex; justify-content: space-between; align-items: center; min-height: 40px; padding: 0 12px; border-radius: 8px; font-family: inherit; font-size: 14px; cursor: pointer; ' +
        (S.action === id ? 'border: 1px solid #E7EBF3; background: #1C2536; color: #E7EBF3' : lock ? 'border: 1px solid #1C2536; background: transparent; color: #7F8BA1' : 'border: 1px solid #232D3F; background: #10151F; color: #E7EBF3') })) }));
    const info = INFO[S.action] || {};
    const sel = { name: info.name + ' · ' + (isMove ? (hv ? moveAp + ' AP for ' + P.dist[hv] + (P.dist[hv] === 1 ? ' tile' : ' tiles') : '1 AP per ' + MOV + ' tiles') : COST[S.action] + ' AP'), text: info.lock || info.text,
      extra: isMove ? (S.bank ? S.bank + ' paid-for tile' + (S.bank > 1 ? 's' : '') + ' left this turn. ' : '') + 'Hover a highlighted tile to see the path and its AP cost; click to move.' : (S.action === 'shot' || S.action === 'aimed') ? 'Click a hostile to target it.' : '' };
    const h = HOSTILES[S.target];
    const bonus = S.action === 'aimed' ? 3 : 1, need = h.def - bonus, pct = Math.max(5, Math.min(95, (21 - need) * 5));
    const target = { zoom: zoomer(this, h.img || '', h.name, 'portrait'), name: h.name, img: h.img || '', hasImg: !!h.img, hpFill: 'width: ' + Math.round(h.hp / h.max * 100) + '%; height: 100%; background: #F65157',
      line: 'HP ' + h.hp + ' / ' + h.max + ' · Defense ' + h.def + ' (' + h.cover + ')', odds: (S.action === 'shot' || S.action === 'aimed') ? 'Hit ' + pct + '% · crit ' + (S.action === 'aimed' ? '10' : '5') + '%' : 'Pick Shot or Aimed shot to see odds' };
    return { ...lightboxVals(this), zoomPc: zoomer(this, D.pc, 'MPAT', 'portrait'),
      initiative, tiles, pc: D.pc, apPips, apText: (S.ap - cost) + ' / 6 after this', groups, sel, hasTarget: !!h, target,
      log: S.log.slice(-4).map((text) => ({ text })), cantConfirm: cost > S.ap || S.action === 'move',
      confirm: () => this.confirm(), endTurn: () => this.setState({ ap: 6, bank: 0, log: [...this.state.log, 'MPAT ends the turn. The engineers reload behind the crates.'] }),
    };
  }

  tileClick(k) {
    const S = this.state;
    const foe = Object.entries(HOSTILES).find(([, h]) => h.pos === k);
    if (foe) { this.setState({ target: foe[0] }); return; }
    if (S.action !== 'move') return;
    const P = paths(S.pos, new Set(['2,8', '5,8', ...Object.values(HOSTILES).map((h) => h.pos)]));
    const tiles = P.dist[k]; if (tiles === undefined || k === S.pos) return;
    const ap = apFor(tiles, S.bank); if (ap > S.ap) return;
    // Paid-for tiles not walked carry over to the rest of the turn.
    this.setState({ pos: k, ap: S.ap - ap, bank: S.bank + ap * MOV - tiles, hover: null,
      log: [...S.log, 'MPAT moves ' + tiles + (tiles === 1 ? ' tile' : ' tiles') + ' for ' + ap + ' AP, keeping the wreck line between the engineers and 4-Ten.'] });
  }

  confirm() {
    const S = this.state, c = COST[S.action];
    if (c > S.ap) return;
    const h = HOSTILES[S.target];
    const line = S.action === 'triage' ? 'MPAT kneels over 4-Ten and seals the coolant line. 38 HP back, and the bleeding stops.'
      : (S.action === 'shot' || S.action === 'aimed') ? 'MPAT fires at ' + h.name + '. d20 13 + ' + (S.action === 'aimed' ? 3 : 1) + ' = ' + (S.action === 'aimed' ? 16 : 14) + ' vs Defense ' + h.def + ': hit, 20 damage.'
      : 'MPAT: ' + INFO[S.action].name + '.';
    this.setState({ ap: S.ap - c, log: [...S.log, line] });
  }
}
