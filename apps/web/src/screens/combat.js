// Combat, ported from design/canvas-build/combat.logic.js onto the engine's fight: real initiative, the grid,
// path arrows with their AP cost, real hit odds, and every action checked by the engine. Enemies act on their own.
import { DCLogic } from '../dc/runtime';
import { D, IMG, lightboxVals, zoomer, mod, fmt, tokenVals, effectsOf, bodyFigure } from './shared';
import { WEAPON, active, apForTiles, paths, previewAttack, isMelee, attackApCost, analyzeCost, maxMp, coverOf, difficultOf, dist, ROUNDS_PER_AP, refOf, notesAt } from '@engine';
import { act, getState, go } from '../game/store';

const ARROWS = { '1,0': '→', '-1,0': '←', '0,1': '↓', '0,-1': '↑', '1,1': '↘', '-1,1': '↙', '1,-1': '↗', '-1,-1': '↖' };

export class CombatLogic extends DCLogic {
  constructor(props) { super(props); this.state = { action: 'move', hover: null, target: null };  }

  renderVals() {
    const S = this.state, st = getState(), g = st.game, me = st.me.id;
    const cb = g && g.combat;
    if (!cb) return { ...lightboxVals(this), initiative: [], tiles: [], legend: [], apPips: [], groups: [], log: [], who: {}, sel: {}, target: {}, toStory: () => go('main'), roundText: 'NO FIGHT', gridStyle: '' };
    const cur = active(cb), owner = (u) => (u.charId ? g.characters[u.charId]?.owner : null), playerOf = (pid) => g.players.find((p) => p.id === pid);
    const ring = (u) => (u.side === 'pc' ? playerOf(owner(u))?.color || '#7FD4FF' : '#F65157');
    const mineTurn = !cb.over && cur && cur.side === 'pc' && owner(cur) === me && !cur.downed;
    const ch = mineTurn ? g.characters[cur.charId] : null;
    const w = cur ? WEAPON[cur.weapon] : null, melee = w ? isMelee(w) : false;
    const P = mineTurn ? paths(cb, cur.pos, cur.id) : { dist: {}, prev: {} };
    const reach = (k) => mineTurn && P.dist[k] !== undefined && k !== cur.pos && apForTiles(P.dist[k], cur.bank, cur.movement) <= cur.ap;
    const isMove = S.action === 'move', hv = isMove && S.hover && reach(S.hover) ? S.hover : null;
    const route = {}; let moveAp = 0;
    if (hv) { moveAp = apForTiles(P.dist[hv], cur.bank, cur.movement); let k = hv; while (P.prev[k]) { const p = P.prev[k]; const [ax, ay] = p.split(',').map(Number), [bx, by] = k.split(',').map(Number); route[p] = ARROWS[(bx - ax) + ',' + (by - ay)]; k = p; } }
    const foes = cb.units.filter((u) => u.side === 'foe' && !u.dead);
    const tgtUnit = cb.units.find((u) => u.id === S.target && !u.dead) || foes.find((u) => !u.downed) || null;
    const attackMode = S.action === 'aimed' ? 'aimed' : S.action === 'melee' ? 'melee' : 'shot';
    const pv = mineTurn && tgtUnit && ['shot', 'aimed', 'melee'].includes(S.action) ? previewAttack(cb, cur, tgtUnit, attackMode) : null;
    const allies = cb.units.filter((u) => u.side === 'pc' && !u.dead && cur && u.id !== cur.id);
    const stimTarget = cb.units.find((u) => u.id === S.target && u.side === 'pc' && !u.dead);
    const covers = coverOf(cb), coverSel = S.action === 'cover' && covers[S.tile] ? S.tile : null, pickSel = S.action === 'pickup' && (cb.floor || []).some((f) => f.pos === S.tile && f.weapon) ? S.tile : null;
    const loadInfo = (() => { if (!cur || !w || w.reload !== 'magazine' || !cur.mags) return null; const cap = w.magazine || 0, open = cur.mags.filter((n) => n < cap).sort((a, b) => b - a); if (!open.length || !cur.loose) return null; const r = Math.min(cap - open[0], cur.loose, cur.ap * ROUNDS_PER_AP); return { rounds: r, ap: Math.ceil(r / ROUNDS_PER_AP) }; })();
    const cost = isMove ? moveAp : S.action === 'stim' ? 1 : S.action === 'reload' || S.action === 'clear' ? 2 : S.action === 'analyze' ? (cur ? analyzeCost(cur) : 2) : S.action === 'pickup' ? 1 : S.action === 'load' ? (loadInfo ? loadInfo.ap : 0) : S.action === 'cover' ? (w ? attackApCost(w, melee ? 'melee' : 'shot') : 2) : pv ? pv.ap : 0;
    const tokOpt = (u, x, y) => { const p = u.side === 'pc' ? playerOf(owner(u)) : null; return { ref: refOf(x + ',' + y), ally: u.side === 'pc', player: p ? p.initials + ' · ' + p.name.toUpperCase() : '', color: p ? p.color : '#F65157', inFight: true, right: x >= cb.map.w / 2, up: y >= cb.map.h / 2 }; };
    const floorAt = {}; (cb.floor || []).forEach((f) => { (floorAt[f.pos] ||= []).push(f.text); });
    const condWord = (u) => (u.dead ? 'dead' : u.downed ? 'down' : u.hp >= u.maxHp ? 'unhurt' : u.hp > u.maxHp / 2 ? 'wounded' : 'badly hurt');

    const at = {}; cb.units.filter((u) => !u.dead).forEach((u) => { at[u.pos] = u; });
    const solid = new Set(cb.map.solid), diff = difficultOf(cb);
    const tiles = [], axis = (key, text) => ({ key, isLabel: true, isTile: false, text });
    tiles.push(axis('h-', '')); for (let x = 0; x < cb.map.w; x++) tiles.push(axis('h' + x, refOf(x + ',0').replace(/\d+$/, '')));
    for (let y = 0; y < cb.map.h; y++) for (let x = -1; x < cb.map.w; x++) {
      if (x < 0) { tiles.push(axis('r' + y, String(y + 1))); continue; }
      const k = x + ',' + y, u = at[k], inRange = isMove && !u && reach(k), note = notesAt(cb.map, k)[0];
      let bg = '#0D1119', border = '1px solid #151C29';
      if (solid.has(k)) { bg = '#1C2536'; border = '1px solid #232D3F'; }
      const cv = covers[k];
      if (cv) { bg = cv.kind === 'full' ? '#4A3A20' : '#2A2113'; border = (cv.kind === 'full' ? '2px solid #8C6F3A' : '1px solid #4A3A20'); }
      if (k === coverSel || k === pickSel) border = '2px solid #FFFFFF';
      if (diff.has(k) && !u) { bg = '#161C28'; }
      if (inRange) { bg = 'rgba(231, 235, 243, 0.12)'; border = '1px dashed #E7EBF3'; }
      const sel = u && tgtUnit && u.id === tgtUnit.id;
      const isCur = u && cur && u.id === cur.id;
      tiles.push({
        key: k, isLabel: false, isTile: true, cover: cv, label: refOf(k) + ' · ' + (u ? u.name + (u.side === 'foe' ? ' (hostile)' : '') + (u.side === 'pc' || u.analyzedBy ? ' · HP ' + u.hp + '/' + u.maxHp : ' · looks ' + condWord(u)) + (u.downed ? ' · Downed' : '') : solid.has(k) ? 'Solid' : cv ? (cv.kind === 'full' ? 'Full cover (blocks sight)' : 'Half cover (−5 to shots at whoever is behind it)') + ' · HP ' + cv.hp + '/' + cv.max : diff.has(k) ? ((cb.rubble || []).includes(k) ? 'Rubble' : 'Difficult terrain') : 'open') + (floorAt[k] ? ' · on the floor: ' + floorAt[k].join(', ') : '') + (note ? ' · ' + note : ''), title: u ? '' : refOf(k) + (note ? ' · ' + note : ''),
        hasTok: !!u, t: u ? tokenVals(u, tokOpt(u, x, y)) : null, hasFloor: !!floorAt[k], floor: floorAt[k] ? '▪' + (floorAt[k].length > 1 ? floorAt[k].length : '') : '',
        click: () => this.tileClick(k), hover: () => { if (this.state.hover !== k) this.setState({ hover: k }); },
        hasArrow: !!route[k] && k !== (cur && cur.pos), arrow: route[k] || '', hasCost: k === hv, cost: (moveAp ? '−' + moveAp + ' AP' : 'Paid') + ' · ' + P.dist[k] + (P.dist[k] === 1 ? ' tile' : ' tiles'),
        hasImg: !!(u && u.img), img: (u && u.img) || '',
        imgStyle: 'width: 38px; height: 38px; object-fit: cover; ' + (u && u.side === 'pc' ? 'border-radius: 50%; border: 3px ' + (u.downed ? 'dashed ' : 'solid ') + ring(u) : 'border-radius: 4px; border: 2px solid ' + (sel ? '#FFFFFF' : '#F65157')) + (u && u.downed ? '; opacity: 0.5' : '') + (isCur ? '; box-shadow: 0 0 0 3px #FFFFFF' : ''),
        hasBadge: !!(u && !u.img), badge: u ? u.short : '',
        badgeStyle: 'display: grid; place-items: center; width: 36px; height: 36px; font-size: 11px; font-weight: 700; ' + (u && u.side === 'pc' ? 'border-radius: 50%; border: 2px dashed ' + ring(u) + '; color: ' + ring(u) : 'border-radius: 4px; border: 2px solid ' + (sel ? '#FFFFFF' : '#F65157') + '; color: #F65157') + (isCur ? '; box-shadow: 0 0 0 3px #FFFFFF' : '') + (u && u.downed ? '; opacity: 0.5' : ''),
        hasText: (diff.has(k) || !!cv) && !u, text: cv ? (cv.kind === 'full' ? 'FULL ' : 'HALF ') + cv.hp : (cb.rubble || []).includes(k) ? 'RUBBLE' : 'ROUGH',
        style: 'position: relative; display: grid; place-items: center; padding: 0; border-radius: 4px; cursor: pointer; background: ' + (k === hv ? 'rgba(255, 255, 255, 0.28)' : route[k] && k !== (cur && cur.pos) ? 'rgba(255, 255, 255, 0.18)' : bg) + '; border: ' + (k === hv ? '2px solid #FFFFFF' : border),
      });
    }
    const initiative = cb.order.map((id) => cb.units.find((u) => u.id === id)).filter((u) => !u.dead).map((u) => ({
      key: u.id, zoom: zoomer(this, u.img || '', u.name, 'portrait'), name: u.name + (u.downed ? ' (down)' : ''), init: u.init, hasImg: !!u.img, noImg: !u.img, img: u.img || '', short: u.short,
      imgStyle: 'width: 36px; height: 36px; object-fit: cover; ' + (u.side === 'pc' ? 'border-radius: 50%; border: 3px solid ' + ring(u) : 'border-radius: 4px; border: 2px solid #F65157'),
      badgeStyle: 'display: grid; place-items: center; width: 36px; height: 36px; border-radius: ' + (u.side === 'pc' ? '50%' : '4px') + '; border: 2px solid ' + ring(u) + '; color: ' + ring(u) + '; font-size: 11px; font-weight: 700',
      style: 'display: flex; gap: 8px; align-items: center; padding: 6px 12px 6px 6px; border-radius: 999px; flex: none; ' + (cur && u.id === cur.id ? 'border: 1px solid #E7EBF3; background: #1C2536' : 'border: 1px solid #232D3F'),
    }));
    const ap = cur ? cur.ap : 0, maxAp = Math.max(6, ap);
    const apPips = Array.from({ length: maxAp }, (_, i) => ({ style: 'height: 14px; border-radius: 4px; ' + (i < ap - cost ? 'background: #E7EBF3' : i < ap ? 'background: transparent; border: 2px solid #FFFFFF; box-sizing: border-box' : 'background: #1C2536') }));
    const mv = cur ? cur.movement : 1;
    const ITEMS = [
      ['MOVEMENT', [['move', 'Move', '1 AP / ' + mv + ' tiles', 'Each AP moves you ' + mv + ' tiles (Movement, from Agility and armour). Rough tiles count double. Tiles you paid for and didn\'t walk stay yours this turn.']]],
      ['ATTACK · ' + (w ? w.name.toUpperCase() : ''), melee ? [['melee', 'Strike', attackApCost(w, 'melee') + ' AP', 'd20 + ' + w.skill.replace('_', ' ') + ' vs Defense. ' + w.damage + ' damage.']]
        : [['shot', 'Shot', (w ? attackApCost(w, 'shot') : 2) + ' AP', 'd20 + Dexterity vs Defense + cover. ' + (w && typeof w.damage === 'number' ? w.damage + ' damage. ' : '') + 'Heat +1.'],
          ['aimed', 'Aimed shot', '3 AP', '+2 to hit; crits on 19–20.'], ['melee', 'Melee (fists)', '2 AP', 'd20 + Raw Power vs Defense. 10 damage.'],
          ['cover', 'Shoot cover', (w ? attackApCost(w, 'shot') : 2) + ' AP', 'Break cover: no roll, your weapon\'s damage to the cover\'s HP. Half cover 30 HP, full cover 80. Broken cover becomes rubble.']]],
      ['UTILITY', [['reload', 'Reload', '2 AP', !w || w.magazine == null ? 'Nothing to reload.' : w.reload === 'loose' ? 'Top up from loose rounds (' + (cur.loose ?? 0) + ' carried). Nothing drops.' : 'Swap in your fullest spare ' + (w.reload_unit || 'magazine') + ' (' + (cur.mags ? cur.mags.length + ' left' : 'unlimited') + '). The one in the gun drops on the floor with any rounds left in it. ' + cur.ammo + ' / ' + w.magazine + ' loaded now.'],
        ['pickup', 'Pick up', '1 AP', 'Take everything on your tile or one adjacent tile (marked ▪): dropped magazines, empty or not.'],
        ['load', 'Load a magazine', loadInfo ? loadInfo.ap + ' AP' : '1 AP / ' + ROUNDS_PER_AP + ' rds', loadInfo ? 'Load ' + loadInfo.rounds + ' loose rounds into your fullest part-empty ' + (w.reload_unit || 'magazine') + '.' : 'Load loose rounds into an empty or part-empty magazine, 1 AP per ' + ROUNDS_PER_AP + ' rounds. You need both.'],
        ['analyze', 'Analyze', (cur ? analyzeCost(cur) : 2) + ' AP', 'Read one enemy: its HP, Defense, armour and status, for the whole squad, the rest of the fight. Range ' + (4 + (cur && cur.analysis || 0)) + ' tiles; needs line of sight. No roll.'], ['clear', 'Clear a jam', '2 AP', 'A jammed gun can\'t fire until cleared.'],
        ['stim', 'Stim an ally', '1–2 AP', 'Adjacent ally: stabilise a Downed ally at 1 HP (1 AP for a Medic, 2 for others), or heal 30 × your Healing given. Uses a stim' + (ch ? ' (' + ch.stims + ' left)' : '') + '.']]],
    ];
    const groups = ITEMS.map(([name, items]) => ({ name, items: items.map(([id, label, costText, text]) => ({
      name: label, cost: costText, text, locked: !mineTurn, pressed: S.action === id ? 'true' : 'false', pick: () => this.setState({ action: id, target: id === 'stim' ? null : this.state.target }),
      costStyle: 'font-size: 12px; font-weight: 700; color: #E7EBF3',
      style: 'display: flex; justify-content: space-between; align-items: center; min-height: 40px; padding: 0 12px; border-radius: 8px; font-family: inherit; font-size: 14px; cursor: pointer; ' +
        (S.action === id ? 'border: 1px solid #E7EBF3; background: #1C2536; color: #E7EBF3' : 'border: 1px solid #232D3F; background: #10151F; color: #E7EBF3') })) }));
    const actName = { move: 'Move', shot: 'Shot', aimed: 'Aimed shot', melee: 'Melee', reload: 'Reload', clear: 'Clear a jam', stim: 'Stim an ally', analyze: 'Analyze', cover: 'Shoot cover', pickup: 'Pick up', load: 'Load a magazine' }[S.action];
    const sel = { name: actName + (isMove ? ' · ' + (hv ? moveAp + ' AP for ' + P.dist[hv] + (P.dist[hv] === 1 ? ' tile' : ' tiles') : '1 AP per ' + mv + ' tiles') : pv ? ' · ' + pv.ap + ' AP' : ''),
      text: !mineTurn ? (cb.over ? 'The fight is over.' : cur && cur.side === 'foe' ? cur.name + ' is acting…' : cur ? 'Waiting for ' + (playerOf(owner(cur))?.name || 'a player') + ' (' + cur.name + ').' : '') : isMove ? 'Hover a highlighted tile to see the path and its AP cost; click to move.' : S.action === 'stim' ? (stimTarget ? 'Target: ' + stimTarget.name + '. Confirm to use a stim.' : 'Click an adjacent ally.') : S.action === 'cover' ? (coverSel ? 'Target: ' + covers[coverSel].kind + ' cover, HP ' + covers[coverSel].hp + '/' + covers[coverSel].max + '. Confirm to shoot it.' : 'Click a cover tile.') : S.action === 'pickup' ? (pickSel ? 'Pick up: ' + (cb.floor || []).filter((f) => f.pos === pickSel).map((f) => f.text).join(', ') + '.' : 'Click your tile or an adjacent tile marked ▪.') : S.action === 'load' ? (loadInfo ? 'Confirm to load ' + loadInfo.rounds + ' rounds for ' + loadInfo.ap + ' AP.' : 'Nothing to load: you need loose rounds and a part-empty magazine.') : S.action === 'analyze' ? (tgtUnit ? (tgtUnit.analyzedBy ? tgtUnit.name + ' is already analyzed.' : 'Target: ' + tgtUnit.name + '. Click a hostile to change. Confirm to analyze.') : 'Click a hostile.') : pv ? (pv.ok ? 'Click a hostile to change target. Confirm to attack.' : pv.why) : 'Click a hostile to target it.',
      extra: mineTurn && isMove && cur.bank ? cur.bank + ' paid-for tile' + (cur.bank > 1 ? 's' : '') + ' left this turn.' : '' };
    const target = tgtUnit ? { zoom: zoomer(this, tgtUnit.img || '', tgtUnit.name, 'portrait'), name: tgtUnit.name, img: tgtUnit.img || '', hasImg: !!tgtUnit.img,
      known: !!tgtUnit.analyzedBy, hpFill: 'width: ' + Math.round(tgtUnit.hp / tgtUnit.maxHp * 100) + '%; height: 100%; background: #F65157',
      line: tgtUnit.analyzedBy ? 'HP ' + tgtUnit.hp + ' / ' + tgtUnit.maxHp + ' · Defense ' + tgtUnit.def +  + ' · Armour ' + tgtUnit.armour + (effectsOf(tgtUnit).length ? ' · ' + effectsOf(tgtUnit).map((f) => f[0]).join(', ') : '')
        : 'Looks ' + condWord(tgtUnit) + ' · ' + (tgtUnit.tier || 'hostile') + ' · Analyze to see its HP and status',
      odds: pv ? (pv.ok ? 'Hit ' + pv.pct + '% · need ' + pv.need + ' (you roll d20 ' + fmt(pv.toHit) + ')' + (pv.rangePenalty ? ' · range ' + pv.rangePenalty : '') + (pv.cover ? ' · behind half cover −5' : '') : pv.why) : 'Pick an attack to see the odds' } : null;
    const curOwner = cur ? playerOf(owner(cur)) : null;
    const who = cur ? { name: cur.name, img: cur.img || IMG['wick-welcome'], title: cb.over ? 'The fight is over' : cur.side === 'foe' ? cur.name + ' acts' : mineTurn ? 'Your turn: ' + cur.name : cur.name + '\'s turn' + (curOwner ? ' (' + curOwner.name + ')' : ''),
      line: 'HP ' + cur.hp + ' / ' + cur.maxHp + ' · AP ' + cur.ap + (w && w.magazine ? ' · Ammo ' + cur.ammo + '/' + w.magazine : '') + (cur.heat ? ' · Heat ' + cur.heat : '') + (cur.jammed ? ' · JAMMED' : '') + (ch ? ' · Stims ' + ch.stims + ' · Echo ' + ch.echo : ''),
      imgStyle: 'width: 56px; height: 56px; border-radius: 50%; object-fit: cover; background: #000; border: 2px solid ' + ring(cur) } : {};
    const legend = [...g.players.filter((p) => cb.units.some((u) => owner(u) === p.id)).map((p) => ({ name: p.name + '\'s', style: 'width: 14px; height: 14px; border-radius: 50%; border: 3px solid ' + p.color }))];
    // ---------- the squad panel: you, then your allies (hover a row for the full card) ----------
    const bar = (pct, col) => 'display: block; height: 100%; width: ' + Math.max(0, Math.min(100, pct)) + '%; background: ' + col;
    const myU = (mineTurn ? cur : null) || cb.units.find((u) => u.side === 'pc' && owner(u) === me && !u.dead) || null;
    const mc = myU ? g.characters[myU.charId] : null, mw = myU ? WEAPON[myU.weapon] : null;
    const mePanel = myU && mc ? { name: myU.name, img: myU.img || IMG['wick-welcome'], zoom: zoomer(this, myU.img || '', myU.name, 'portrait'),
      hp: myU.hp + ' / ' + myU.maxHp, hpFill: bar(myU.hp / myU.maxHp * 100, '#F65157'), mp: maxMp(mc) + ' / ' + maxMp(mc), mpFill: bar(100, '#5C9EFF'),
      line: 'AP ' + myU.ap + ' · Movement ' + myU.movement + (mw && mw.magazine != null ? ' · Ammo ' + myU.ammo + '/' + mw.magazine + (mw.reload === 'loose' ? ' · ' + (myU.loose ?? 0) + ' loose' : myU.mags ? ' · ' + myU.mags.length + ' spare' : '') : '') + ' · Stims ' + mc.stims + ' · Echo ' + mc.echo,
      fx: effectsOf(myU).map(([k, t]) => ({ key: k, k, t })), noFx: !effectsOf(myU).length, fig: bodyFigure({ injuries: myU.injuries || [], mainSide: myU.hand || 'right' }) } : null;
    const allyRows = cb.units.filter((u) => u.side === 'pc' && (!myU || u.id !== myU.id)).map((u, i) => { const p = playerOf(owner(u)), fx = effectsOf(u);
      return { key: u.id, name: u.name, img: u.img || '', hasImg: !!u.img, short: u.short, player: p ? p.name : '', hp: u.dead ? 'DEAD' : u.hp + ' / ' + u.maxHp, hpFill: bar(u.hp / u.maxHp * 100, '#F65157'),
        fx: fx.map((f) => f[0]).join(' · '), hasFx: fx.length > 0, t: tokenVals(u, { ally: true, player: p ? p.initials + ' · ' + p.name.toUpperCase() : '', color: p ? p.color : '#7FD4FF', inFight: true, right: false, up: false }),
        imgStyle: 'width: 34px; height: 34px; border-radius: 50%; object-fit: cover; background: #000; flex: none; border: 2px solid ' + (p ? p.color : '#7FD4FF') + (u.downed || u.dead ? '; opacity: 0.5' : '') }; });
    const squad = true;
    const say = { can: !!myU && !cb.over, value: S.say || '', onChange: (e) => this.setState({ say: e.target.value }),
      send: () => { const text = (this.state.say || '').trim(); if (!text || !myU) return; act({ type: 'combat/say', charId: myU.charId, text }); this.setState({ say: '' }); } };
    const won = cb.over === 'win';
    return {
      ...lightboxVals(this), zoomPc: zoomer(this, who.img, who.name, 'portrait'), who, legend,
      gridStyle: 'display: grid; grid-template-columns: 18px repeat(' + cb.map.w + ', 46px); grid-template-rows: 18px repeat(' + cb.map.h + ', 46px); gap: 2px; width: max-content; padding: 8px; border-radius: 12px; background: #05070B; border: 1px solid #232D3F',
      roundText: 'ROUND ' + cb.round + ' · ' + cb.map.name.toUpperCase() + ' · ' + cb.name.toUpperCase(),
      turnChip: cb.over ? (won ? 'VICTORY' : 'DEFEAT') : mineTurn ? 'YOUR TURN' : cur && cur.side === 'foe' ? 'HOSTILES ACTING' : 'WAITING', turnChipStyle: 'padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; border: 1px solid ' + (mineTurn ? '#FFFFFF' : '#232D3F') + '; color: ' + (mineTurn ? '#FFFFFF' : '#A3AEC2'),
      initiative, tiles, apPips, apText: mineTurn ? (ap - cost) + ' / ' + ap + ' after this' : ap + ' AP', groups, sel, hasTarget: !!target && !['move', 'reload', 'clear', 'stim', 'cover', 'pickup', 'load'].includes(S.action), squad, say, me: mePanel, hasMe: !!mePanel, allyRows, hasAllies: allyRows.length > 0, target: target || {},
      log: cb.log.slice(-6).map((text, i) => ({ key: cb.log.length - 6 + i, text })),
      cantConfirm: !mineTurn || isMove || (pv && !pv.ok) || (S.action === 'stim' && !stimTarget) || (S.action === 'cover' && !coverSel) || (S.action === 'pickup' && !pickSel) || (S.action === 'load' && !loadInfo) || (S.action === 'analyze' && (!tgtUnit || !!tgtUnit.analyzedBy)) || ((S.action === 'shot' || S.action === 'aimed' || S.action === 'melee') && !pv),
      confirm: () => this.confirm(tgtUnit, attackMode, stimTarget), endTurn: () => act({ type: 'combat/end-turn', unitId: cur.id }), notMine: !mineTurn,
      toStory: () => go('main'), over: !!cb.over, overColor: won ? '#6FEA77' : '#F65157', overKicker: won ? 'VICTORY' : 'DEFEAT',
      overTitle: cb.name, overText: (cb.summary || '') + ' The Narrator picks up the story.',
    };
  }

  tileClick(k) {
    const S = this.state, g = getState().game, cb = g.combat, cur = active(cb);
    const u = cb.units.find((x) => x.pos === k && !x.dead);
    if (u && u.side === 'foe') { this.setState({ target: u.id, action: ['shot', 'aimed', 'melee', 'analyze'].includes(S.action) ? S.action : (WEAPON[cur?.weapon] && isMelee(WEAPON[cur.weapon]) ? 'melee' : 'shot') }); return; }
    if (u && u.side === 'pc' && S.action === 'stim') { this.setState({ target: u.id }); return; }
    if (S.action === 'cover' || S.action === 'pickup') { this.setState({ tile: k }); return; }
    if (coverOf(cb)[k] && ['shot', 'aimed', 'melee'].includes(S.action)) { this.setState({ action: 'cover', tile: k }); return; }
    if (S.action !== 'move' || !cur) return;
    act({ type: 'combat/move', unitId: cur.id, to: k });
    this.setState({ hover: null });
  }

  confirm(tgt, mode, stimTarget) {
    const cur = active(getState().game.combat), a = this.state.action;
    if (a === 'reload') return act({ type: 'combat/reload', unitId: cur.id });
    if (a === 'clear') return act({ type: 'combat/clear', unitId: cur.id });
    if (a === 'analyze') return tgt && act({ type: 'combat/analyze', unitId: cur.id, targetId: tgt.id });
    if (a === 'cover') return act({ type: 'combat/shoot-cover', unitId: cur.id, tile: this.state.tile });
    if (a === 'pickup') return act({ type: 'combat/pickup', unitId: cur.id, tile: this.state.tile });
    if (a === 'load') return act({ type: 'combat/load', unitId: cur.id });
    if (a === 'stim') return stimTarget && act({ type: 'combat/stim', unitId: cur.id, targetId: stimTarget.id });
    if (tgt) act({ type: 'combat/attack', unitId: cur.id, targetId: tgt.id, mode });
  }
}
