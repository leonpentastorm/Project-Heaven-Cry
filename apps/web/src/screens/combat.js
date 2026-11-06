// Combat, ported from design/canvas-build/combat.logic.js onto the engine's fight: real initiative, the grid,
// path arrows with their AP cost, real hit odds, and every action checked by the engine. Enemies act on their own.
import { DCLogic } from '../dc/runtime';
import { D, IMG, ART, zoneOf, spriteOf, tileBg, spriteStyle, lightboxVals, zoomer, mod, fmt, tokenVals, effectsOf, bodyFigure } from './shared';
import { WEAPON, musicTraitOf, songOf, active, apForTiles, paths, previewAttack, isMelee, attackApCost, analyzeCost, maxMp, coverOf, difficultOf, dist, ROUNDS_PER_AP, refOf, notesAt, objectsOf, kindOf, visibility, litAt } from '@engine';
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
    const MOVES = ['move', 'sprint', 'disengage'], isMove = MOVES.includes(S.action);
    const moveCost = (k) => (S.action === 'sprint' ? 2 : S.action === 'disengage' ? 1 : apForTiles(P.dist[k], cur.bank, cur.movement));
    const reach = (k) => mineTurn && P.dist[k] !== undefined && k !== cur.pos && !cur.prone && moveCost(k) <= cur.ap
      && (S.action === 'sprint' ? !cur.noSprint && P.dist[k] <= Math.floor(3 * cur.movement) : S.action === 'disengage' ? P.dist[k] === 1 : true);
    const hv = isMove && S.hover && reach(S.hover) ? S.hover : null;
    const vis = visibility(cb, 'pc'), seenFoe = (u) => u.side === 'pc' || vis.seen.has(u.id);
    const route = {}; let moveAp = 0;
    if (hv) { moveAp = moveCost(hv); let k = hv; while (P.prev[k]) { const p = P.prev[k]; const [ax, ay] = p.split(',').map(Number), [bx, by] = k.split(',').map(Number); route[p] = ARROWS[(bx - ax) + ',' + (by - ay)]; k = p; } }
    const foes = cb.units.filter((u) => u.side === 'foe' && !u.dead);
    const tgtUnit = cb.units.find((u) => u.id === S.target && !u.dead && seenFoe(u)) || foes.find((u) => !u.downed && seenFoe(u)) || null;
    const ATTACKS = ['shot', 'aimed', 'melee', 'burst', 'auto'];
    const attackMode = ATTACKS.includes(S.action) ? S.action : 'shot';
    const pv = mineTurn && tgtUnit && ATTACKS.includes(S.action) ? previewAttack(cb, cur, tgtUnit, attackMode) : null;
    const allies = cb.units.filter((u) => u.side === 'pc' && !u.dead && cur && u.id !== cur.id);
    const stimTarget = cb.units.find((u) => u.id === S.target && u.side === 'pc' && !u.dead);
    const covers = coverOf(cb), allObjs = objectsOf(cb), shootable = (k) => allObjs.some((o) => o.pos === k && o.hp != null && o.hp > 0), doorAt = (k) => allObjs.find((o) => o.pos === k && kindOf(o).door);
    const coverSel = S.action === 'cover' && shootable(S.tile) ? S.tile : null, doorSel = S.action === 'door' && doorAt(S.tile) ? S.tile : null, pickSel = S.action === 'pickup' && (cb.floor || []).some((f) => f.pos === S.tile && f.weapon) ? S.tile : null;
    const loadInfo = (() => { if (!cur || !w || w.reload !== 'magazine' || !cur.mags) return null; const cap = w.magazine || 0, open = cur.mags.filter((n) => n < cap).sort((a, b) => b - a); if (!open.length || !cur.loose) return null; const r = Math.min(cap - open[0], cur.loose, cur.ap * ROUNDS_PER_AP); return { rounds: r, ap: Math.ceil(r / ROUNDS_PER_AP) }; })();
    const cost = isMove ? moveAp : S.action === 'skill' ? (skFx.ap || 0) : S.action === 'repair' || S.action === 'song' ? 2 : S.action === 'shove' ? 2 : S.action === 'prone' || S.action === 'brace' ? 1 : S.action === 'overwatch' ? (w ? attackApCost(w, melee ? 'melee' : 'shot') : 2) : S.action === 'stim' ? 1 : S.action === 'reload' || S.action === 'clear' ? 2 : S.action === 'analyze' ? (cur ? analyzeCost(cur) : 2) : S.action === 'pickup' || S.action === 'door' ? 1 : S.action === 'load' ? (loadInfo ? loadInfo.ap : 0) : S.action === 'cover' ? (w ? attackApCost(w, melee ? 'melee' : 'shot') : 2) : pv ? pv.ap : 0;
    const tokOpt = (u, x, y) => { const p = u.side === 'pc' ? playerOf(owner(u)) : null; return { ref: refOf(x + ',' + y), ally: u.side === 'pc', player: p ? p.initials + ' · ' + p.name.toUpperCase() : '', color: p ? p.color : '#F65157', inFight: true, right: x >= cb.map.w / 2, up: y >= cb.map.h / 2 }; };
    const floorAt = {}; (cb.floor || []).forEach((f) => { (floorAt[f.pos] ||= []).push(f.text); });
    const condWord = (u) => (u.dead ? 'dead' : u.downed ? 'down' : u.hp >= u.maxHp ? 'unhurt' : u.hp > u.maxHp / 2 ? 'wounded' : 'badly hurt');

    const at = {}; cb.units.filter((u) => !u.dead && seenFoe(u)).forEach((u) => { at[u.pos] = u; });
    const sensedAt = {}; cb.units.filter((u) => vis.sensed.has(u.id)).forEach((u) => { sensedAt[u.pos] = u; });
    const solid = new Set(cb.map.solid), diff = difficultOf(cb);
    // The zone's map painting under the grid (spec: Campaigns, art): each tile shows its slice, colours become tints.
    const mapArt = ART(zoneOf(g)?.art?.map), TINT = { '#0D1119': 'rgba(10, 13, 19, 0.1)', '#1C2536': 'rgba(10, 13, 19, 0.55)', '#4A3A20': 'rgba(140, 111, 58, 0.22)', '#2A2113': 'rgba(140, 111, 58, 0.12)', '#3A2E1A': 'rgba(58, 46, 26, 0.3)', '#161C28': 'rgba(22, 28, 40, 0.3)' };
    const paint = (k, col) => (mapArt && !String(col).startsWith('rgba(255') ? tileBg(mapArt, k, cb.map.w, cb.map.h, TINT[col] || (String(col).startsWith('rgba') ? col : 'rgba(10, 13, 19, 0.1)')) : col);
    const tiles = [], axis = (key, text) => ({ key, isLabel: true, isTile: false, text });
    tiles.push(axis('h-', '')); for (let x = 0; x < cb.map.w; x++) tiles.push(axis('h' + x, refOf(x + ',0').replace(/\d+$/, '')));
    for (let y = 0; y < cb.map.h; y++) for (let x = -1; x < cb.map.w; x++) {
      if (x < 0) { tiles.push(axis('r' + y, String(y + 1))); continue; }
      const k = x + ',' + y, u = at[k], inRange = isMove && !u && reach(k), note = notesAt(cb.map, k)[0];
      let bg = '#0D1119', border = '1px solid #151C29';
      if (solid.has(k)) { bg = '#1C2536'; border = '1px solid #232D3F'; }
      const cv = covers[k], ob = allObjs.find((o) => o.pos === k && !(cv && (o.kind === 'crate' || o.kind === 'pillar')) && o.kind !== 'rubble');
      if (cv) { bg = cv.kind === 'full' ? '#4A3A20' : '#2A2113'; border = (cv.kind === 'full' ? '2px solid #8C6F3A' : '1px solid #4A3A20'); }
      const spr = allObjs.filter((o) => o.pos === k && spriteOf(g, o)).sort((a, b) => (a.kind === 'rubble') - (b.kind === 'rubble'))[0];
      if (k === coverSel || k === pickSel || k === doorSel) border = '2px solid #FFFFFF';
      if (ob && kindOf(ob).door && !ob.open) { bg = '#3A2E1A'; }
      if (diff.has(k) && !u) { bg = '#161C28'; }
      if (inRange) { bg = 'rgba(231, 235, 243, 0.12)'; border = '1px dashed #E7EBF3'; }
      const sel = u && tgtUnit && u.id === tgtUnit.id;
      const isCur = u && cur && u.id === cur.id;
      tiles.push({
        key: k, isLabel: false, isTile: true, cover: cv, label: refOf(k) + ' · ' + (u ? u.name + (u.side === 'foe' ? ' (hostile)' : '') + (u.side === 'pc' || u.analyzedBy ? ' · HP ' + u.hp + '/' + u.maxHp : ' · looks ' + condWord(u)) + (u.downed ? ' · Downed' : '') : solid.has(k) ? 'Solid' : ob ? ob.name + (ob.hp != null ? ' · HP ' + ob.hp + '/' + ob.max : '') + (kindOf(ob).door ? (ob.locked ? ' · locked' : ob.open ? ' · open' : ' · closed') : '') + (ob.text ? ' · ' + ob.text : '') + (cv ? ' · ' + cv.kind + ' cover' : '') : cv ? (cv.kind === 'full' ? 'Full cover (blocks sight)' : 'Half cover (−5 to shots at whoever is behind it)') + ' · HP ' + cv.hp + '/' + cv.max : diff.has(k) ? ((cb.rubble || []).includes(k) ? 'Rubble' : 'Difficult terrain') : 'open') + (!vis.tiles.has(k) ? ' · out of sight' : '') + (cb.map.dark && !litAt(cb, k) ? ' · dark' : '') + (floorAt[k] ? ' · on the floor: ' + floorAt[k].join(', ') : '') + (note ? ' · ' + note : ''), title: u ? '' : refOf(k) + (note ? ' · ' + note : ''),
        unseen: !vis.tiles.has(k), sensed: !!sensedAt[k], dark: !!cb.map.dark && !litAt(cb, k),
        hasTok: !!u, t: u ? tokenVals(u, tokOpt(u, x, y)) : null, hasObj: !!ob && !u && !spr, objGlyph: ob ? kindOf(ob).glyph : '', objStyle: 'position: absolute; inset: 0 0 12px 0; display: grid; place-items: center; font-size: 20px; color: ' + (ob && (kindOf(ob).hazard || ob.kind === 'trap' || kindOf(ob).explodes) ? '#F65157' : ob && ob.kind === 'poi' ? '#FFFFFF' : '#C9D3E3'), hasFloor: !!floorAt[k], floor: floorAt[k] ? '▪' + (floorAt[k].length > 1 ? floorAt[k].length : '') : '',
        click: () => this.tileClick(k), hover: () => { if (this.state.hover !== k) this.setState({ hover: k }); },
        hasArrow: !!route[k] && k !== (cur && cur.pos), arrow: route[k] || '', hasCost: k === hv, cost: (moveAp ? '−' + moveAp + ' AP' : 'Paid') + ' · ' + P.dist[k] + (P.dist[k] === 1 ? ' tile' : ' tiles'),
        hasSprite: !!spr, sprite: spr ? spriteOf(g, spr) : '', spriteStyle: spr ? spriteStyle(spr) : '',
        hasImg: !!(u && u.img), img: (u && (ART(u.img) || u.img)) || '',
        imgStyle: 'position: relative; z-index: 2; width: 38px; height: 38px; object-fit: cover; ' + (u && u.side === 'pc' ? 'border-radius: 50%; border: 3px ' + (u.downed ? 'dashed ' : 'solid ') + ring(u) : 'border-radius: 4px; border: 2px solid ' + (sel ? '#FFFFFF' : '#F65157')) + (u && u.downed ? '; opacity: 0.5' : '') + (isCur ? '; box-shadow: 0 0 0 3px #FFFFFF' : ''),
        hasBadge: !!(u && !u.img), badge: u ? u.short : '',
        badgeStyle: 'position: relative; z-index: 2; display: grid; place-items: center; width: 36px; height: 36px; font-size: 11px; font-weight: 700; ' + (u && u.side === 'pc' ? 'border-radius: 50%; border: 2px dashed ' + ring(u) + '; color: ' + ring(u) : 'border-radius: 4px; border: 2px solid ' + (sel ? '#FFFFFF' : '#F65157') + '; color: #F65157') + (isCur ? '; box-shadow: 0 0 0 3px #FFFFFF' : '') + (u && u.downed ? '; opacity: 0.5' : ''),
        hasText: ((diff.has(k) && !mapArt) || !!cv) && !u, text: cv ? (ob ? cv.hp + '' : (cv.kind === 'full' ? 'FULL ' : 'HALF ') + cv.hp) : (cb.rubble || []).includes(k) ? 'RUBBLE' : 'ROUGH',
        style: 'position: relative; display: grid; place-items: center; padding: 0; border-radius: 4px; cursor: pointer; background: ' + (k === hv ? 'rgba(255, 255, 255, 0.28)' : route[k] && k !== (cur && cur.pos) ? 'rgba(255, 255, 255, 0.18)' : paint(k, bg)) + '; border: ' + (k === hv ? '2px solid #FFFFFF' : border) + (!vis.tiles.has(k) ? '; box-shadow: inset 0 0 0 46px rgba(5, 7, 11, ' + (cb.map.dark && !litAt(cb, k) ? '0.72' : '0.5') + ')' : cb.map.dark && !litAt(cb, k) ? '; box-shadow: inset 0 0 0 46px rgba(5, 7, 11, 0.25)' : ''),
      });
    }
    const initiative = cb.order.map((id) => cb.units.find((u) => u.id === id)).filter((u) => !u.dead).map((u) => ({
      key: u.id, zoom: zoomer(this, ART(u.img) || u.img || '', u.name, 'portrait'), name: seenFoe(u) ? u.name + (u.downed ? ' (down)' : '') : 'Unseen hostile', init: u.init, hasImg: !!u.img, noImg: !u.img, img: ART(u.img) || u.img || '', short: u.short,
      imgStyle: 'width: 36px; height: 36px; object-fit: cover; ' + (u.side === 'pc' ? 'border-radius: 50%; border: 3px solid ' + ring(u) : 'border-radius: 4px; border: 2px solid #F65157'),
      badgeStyle: 'display: grid; place-items: center; width: 36px; height: 36px; border-radius: ' + (u.side === 'pc' ? '50%' : '4px') + '; border: 2px solid ' + ring(u) + '; color: ' + ring(u) + '; font-size: 11px; font-weight: 700',
      style: 'display: flex; gap: 8px; align-items: center; padding: 6px 12px 6px 6px; border-radius: 999px; flex: none; ' + (cur && u.id === cur.id ? 'border: 1px solid #E7EBF3; background: #1C2536' : 'border: 1px solid #232D3F'),
    }));
    const ap = cur ? cur.ap : 0, maxAp = Math.max(6, ap);
    const apPips = Array.from({ length: maxAp }, (_, i) => ({ style: 'height: 14px; border-radius: 4px; ' + (i < ap - cost ? 'background: #E7EBF3' : i < ap ? 'background: transparent; border: 2px solid #FFFFFF; box-sizing: border-box' : 'background: #1C2536') }));
    const mv = cur ? cur.movement : 1;
    const heavy = w && /heavy/.test(w.category) && !isMelee(w), modes = (w && w.modes) || [];
    const sk = w && w.grants, skFx = (sk && sk.effect) || {}, skRuns = ['multi_shot', 'sweep'].includes(skFx.op), skPassive = sk && !skRuns && skFx.op !== 'narrator';
    const offW = cur && cur.offWeapon ? WEAPON[cur.offWeapon] : null;
    const ITEMS = [
      ['MOVEMENT', [['move', 'Move', '1 AP / ' + mv + ' tiles', 'Each AP moves you ' + mv + ' tiles (Movement). Rough tiles count double. Leaving an enemy\'s reach without Disengaging invites an opportunity attack.'],
        ['sprint', 'Sprint', '2 AP', cur && cur.noSprint ? 'Not while Overburdened or in Juggernaut armour.' : 'Up to ' + Math.floor(3 * mv) + ' tiles (3 × Movement) for 2 AP.'],
        ['disengage', 'Disengage', '1 AP', 'Step 1 tile with no opportunity attacks.'],
        ['prone', cur && cur.prone ? 'Stand up' : 'Drop prone', '1 AP', 'Prone: ranged attacks against you −2, melee +2; you can\'t move until you stand.']]],
      ['ATTACK & DEFEND · ' + (w ? w.name.toUpperCase() : ''), [
        ...(melee ? [['melee', 'Strike', attackApCost(w, 'melee') + ' AP', 'd20 + ' + w.skill.replace('_', ' ') + ' vs Defense. ' + w.damage + ' damage.']]
          : [['shot', 'Shot', (w ? attackApCost(w, 'shot') : 2) + ' AP', 'd20 + Dexterity vs Defense; −5 if they\'re behind half cover. ' + (w && typeof w.damage === 'number' ? w.damage + ' damage. ' : '') + 'Heat +1.'],
            ['aimed', 'Aimed shot', '3 AP', '+2 to hit; crits on 19–20.'],
            ...(modes.includes('burst') ? [['burst', 'Burst', '3 AP', '3 rounds at one target, each later round −1 more.']] : []),
            ...(modes.includes('auto') ? [['auto', 'Full auto', '4 AP', '10 rounds: one roll at −2 against every enemy near the line to your target.']] : []),
            ['melee', 'Melee (fists)', '2 AP', 'd20 + Raw Power vs Defense. 10 damage.']]),
        ...(sk ? [['skill', sk.name + (skPassive ? ' (always on)' : ''), skRuns ? skFx.ap + ' AP' : skPassive ? '—' : 'Narrator', sk.text + (skPassive ? ' The engine applies it on every attack.' : skRuns ? '' : ' The engine doesn\'t run this one yet: use Say, and the Narrator rules it after the fight.')]] : []),
        ...(offW ? [['paired', 'Both hands (' + offW.name + ')', 'AP +1', 'Attack with both weapons in one action: AP = the higher cost + 1. Main hand −1, off hand −3 (better by 1 per 3 points in its skill).']] : []),
        ['shove', 'Shove', '2 AP', 'An adjacent enemy: d20 + Raw Power vs 10 + its best of Raw Power and Athletics. Pushed 1 tile, or prone if blocked. Shove them into fire.'],
        ['overwatch', 'Overwatch', (w ? attackApCost(w, melee ? 'melee' : 'shot') : 2) + ' AP', 'Hold a shot until your next turn: the first enemy that moves in your sight and range takes it, as your reaction.'],
        ...(heavy ? [['brace', 'Brace', '1 AP', 'Set the weapon: no −2 for the LMG, the .700 can fire, Recoil halved. Moving ends it.']] : []),
        ['cover', 'Shoot an object', (w ? attackApCost(w, 'shot') : 2) + ' AP', 'Cover, a barricade, a door, a barrel, a lamp: no roll, your weapon\'s damage to its HP. Broken cover becomes rubble; barrels explode.']]],
      ['UTILITY', [['reload', 'Reload', '2 AP', !w || w.magazine == null ? 'Nothing to reload.' : w.reload === 'loose' ? 'Top up from loose rounds (' + (cur.loose ?? 0) + ' carried). Nothing drops.' : 'Swap in your fullest spare ' + (w.reload_unit || 'magazine') + ' (' + (cur.mags ? cur.mags.length + ' left' : 'unlimited') + '). The one in the gun drops on the floor with any rounds left in it. ' + cur.ammo + ' / ' + w.magazine + ' loaded now.'],
        ['load', 'Load a magazine', loadInfo ? loadInfo.ap + ' AP' : '1 AP / ' + ROUNDS_PER_AP + ' rds', loadInfo ? 'Load ' + loadInfo.rounds + ' loose rounds into your fullest part-empty ' + (w.reload_unit || 'magazine') + '.' : 'Load loose rounds into an empty or part-empty magazine, 1 AP per ' + ROUNDS_PER_AP + ' rounds. You need both.'],
        ['clear', 'Clear a jam', '2 AP', 'A jammed gun can\'t fire until cleared.'],
        ['repair', 'Field Repair', '2 AP', 'Proficiency 3+, one spare-parts charge (' + (cur && cur.parts || 0) + ' left): +10% durability, +5% per Proficiency above 3. Weapon ' + (cur && cur.maxDur ? (cur.dur ?? cur.maxDur) + '/' + cur.maxDur : 'n/a') + '.'],
        ['pickup', 'Pick up', '1 AP', 'Take everything on your tile or one adjacent tile (marked ▪): dropped magazines, empty or not.'],
        ['door', 'Open or close a door', '1 AP', 'An adjacent door. Closed, it blocks movement and sight. Locked doors need a check after the fight, or enough damage.'],
        ['stim', 'Stim an ally', '1–2 AP', 'Adjacent ally: stabilise a Downed ally at 1 HP (1 AP for a Medic, 2 for others), or heal 30 × your Healing given. Stops Bleeding. Uses a stim' + (ch ? ' (' + ch.stims + ' left)' : '') + '.'],
        ...(ch && musicTraitOf(ch) && songOf(ch) ? [['song', 'Play my song', '2 AP', 'Your Musek Blestor: your favourite song takes over the room until the fight ends, and your music trait\'s bonus is on while it plays. It can replace another holder\'s kept-on song, never a spotlight.']] : []),
        ['analyze', 'Analyze', (cur ? analyzeCost(cur) : 2) + ' AP', 'Read one enemy: its HP, Defense, armour and status, for the whole squad, the rest of the fight. Range ' + (4 + (cur && cur.analysis || 0)) + ' tiles; needs line of sight. No roll.']]],
    ];
    const groups = ITEMS.map(([name, items]) => ({ name, items: items.map(([id, label, costText, text]) => ({
      name: label, cost: costText, text, locked: !mineTurn, pressed: S.action === id ? 'true' : 'false', pick: () => this.setState({ action: id, target: id === 'stim' ? null : this.state.target }),
      costStyle: 'font-size: 12px; font-weight: 700; color: #E7EBF3',
      style: 'display: flex; justify-content: space-between; align-items: center; min-height: 40px; padding: 0 12px; border-radius: 8px; font-family: inherit; font-size: 14px; cursor: pointer; ' +
        (S.action === id ? 'border: 1px solid #E7EBF3; background: #1C2536; color: #E7EBF3' : 'border: 1px solid #232D3F; background: #10151F; color: #E7EBF3') })) }));
    const actName = { skill: sk ? sk.name : 'Weapon skill', paired: 'Both hands', repair: 'Field Repair', song: 'Play my song', sprint: 'Sprint', disengage: 'Disengage', prone: cur && cur.prone ? 'Stand up' : 'Drop prone', burst: 'Burst', auto: 'Full auto', shove: 'Shove', overwatch: 'Overwatch', brace: 'Brace', move: 'Move', shot: 'Shot', aimed: 'Aimed shot', melee: 'Melee', reload: 'Reload', clear: 'Clear a jam', stim: 'Stim an ally', analyze: 'Analyze', cover: 'Shoot an object', door: 'Open or close a door', pickup: 'Pick up', load: 'Load a magazine' }[S.action];
    const sel = { name: actName + (isMove ? ' · ' + (hv ? moveAp + ' AP for ' + P.dist[hv] + (P.dist[hv] === 1 ? ' tile' : ' tiles') : '1 AP per ' + mv + ' tiles') : pv ? ' · ' + pv.ap + ' AP' : ''),
      text: !mineTurn ? (cb.over ? 'The fight is over.' : cur && cur.side === 'foe' ? cur.name + ' is acting…' : cur ? 'Waiting for ' + (playerOf(owner(cur))?.name || 'a player') + ' (' + cur.name + ').' : '') : isMove ? 'Hover a highlighted tile to see the path and its AP cost; click to move.' : S.action === 'stim' ? (stimTarget ? 'Target: ' + stimTarget.name + '. Confirm to use a stim.' : 'Click an adjacent ally.') : S.action === 'skill' ? (skRuns ? (skFx.op === 'multi_shot' ? (tgtUnit ? sk.name + ' at ' + tgtUnit.name + '. Confirm.' : 'Click a hostile.') : 'Confirm to strike every adjacent enemy.') : skPassive ? 'Always on: it applies to every attack you make.' : 'Not run by the engine yet: use Say, and the Narrator rules it.') : S.action === 'paired' ? (tgtUnit ? 'Both hands at ' + tgtUnit.name + '. Confirm.' : 'Click a hostile.') : S.action === 'repair' ? 'Confirm to repair your weapon.' : S.action === 'song' ? 'Confirm to play your song for the room.' : ['prone', 'brace', 'overwatch'].includes(S.action) ? 'Confirm to ' + ({ prone: cur.prone ? 'stand up' : 'drop prone', brace: 'brace your weapon', overwatch: 'hold a shot on overwatch' }[S.action]) + '.' : S.action === 'shove' ? (tgtUnit ? 'Shove ' + tgtUnit.name + (Math.max(Math.abs(+tgtUnit.pos.split(',')[0] - +cur.pos.split(',')[0]), Math.abs(+tgtUnit.pos.split(',')[1] - +cur.pos.split(',')[1])) > 1 ? ': get next to it first.' : '. Confirm.') : 'Click an adjacent enemy.') : S.action === 'cover' ? (coverSel ? 'Target: ' + allObjs.find((o) => o.pos === coverSel && o.hp > 0).name + ', HP ' + allObjs.find((o) => o.pos === coverSel && o.hp > 0).hp + '. Confirm to shoot it.' : 'Click an object with HP.') : S.action === 'door' ? (doorSel ? (doorAt(doorSel).open ? 'Close' : 'Open') + ' the door at ' + refOf(doorSel) + '. Confirm.' : 'Click an adjacent door.') : S.action === 'pickup' ? (pickSel ? 'Pick up: ' + (cb.floor || []).filter((f) => f.pos === pickSel).map((f) => f.text).join(', ') + '.' : 'Click your tile or an adjacent tile marked ▪.') : S.action === 'load' ? (loadInfo ? 'Confirm to load ' + loadInfo.rounds + ' rounds for ' + loadInfo.ap + ' AP.' : 'Nothing to load: you need loose rounds and a part-empty magazine.') : S.action === 'analyze' ? (tgtUnit ? (tgtUnit.analyzedBy ? tgtUnit.name + ' is already analyzed.' : 'Target: ' + tgtUnit.name + '. Click a hostile to change. Confirm to analyze.') : 'Click a hostile.') : pv ? (pv.ok ? 'Click a hostile to change target. Confirm to attack.' : pv.why) : 'Click a hostile to target it.',
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
      line: 'AP ' + myU.ap + ' · Movement ' + myU.movement + (mw && mw.magazine != null ? ' · Ammo ' + myU.ammo + '/' + mw.magazine + (mw.reload === 'loose' ? ' · ' + (myU.loose ?? 0) + ' loose' : myU.mags ? ' · ' + myU.mags.length + ' spare' : '') : '') + (myU.maxDur ? ' · Weapon ' + ((myU.dur ?? myU.maxDur) <= 0 ? 'BROKEN' : (myU.dur ?? myU.maxDur) + '/' + myU.maxDur) : '') + ' · Stims ' + mc.stims + ' · Echo ' + mc.echo,
      fx: effectsOf(myU).map(([k, t]) => ({ key: k, k, t })), noFx: !effectsOf(myU).length, fig: bodyFigure({ injuries: myU.injuries || [], mainSide: myU.hand || 'right' }) } : null;
    const allyRows = cb.units.filter((u) => u.side === 'pc' && (!myU || u.id !== myU.id)).map((u, i) => { const p = playerOf(owner(u)), fx = effectsOf(u);
      return { key: u.id, name: u.name, img: ART(u.img) || u.img || '', hasImg: !!u.img, short: u.short, player: p ? p.name : '', hp: u.dead ? 'DEAD' : u.hp + ' / ' + u.maxHp, hpFill: bar(u.hp / u.maxHp * 100, '#F65157'),
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
      initiative, tiles, apPips, apText: mineTurn ? (ap - cost) + ' / ' + ap + ' after this' : ap + ' AP', groups, sel, hasTarget: !!target && ([...ATTACKS, 'shove', 'analyze', 'paired'].includes(S.action) || (S.action === 'skill' && skFx.op === 'multi_shot')), squad, say, me: mePanel, hasMe: !!mePanel, allyRows, hasAllies: allyRows.length > 0, target: target || {},
      log: cb.log.slice(-6).map((text, i) => ({ key: cb.log.length - 6 + i, text })),
      cantConfirm: !mineTurn || isMove || (pv && !pv.ok) || (S.action === 'stim' && !stimTarget) || (S.action === 'cover' && !coverSel) || (S.action === 'door' && !doorSel) || (S.action === 'pickup' && !pickSel) || (S.action === 'load' && !loadInfo) || (S.action === 'analyze' && (!tgtUnit || !!tgtUnit.analyzedBy)) || (S.action === 'shove' && !tgtUnit) || (S.action === 'skill' && (!skRuns || (skFx.op === 'multi_shot' && !tgtUnit))) || (S.action === 'paired' && !tgtUnit) || (ATTACKS.includes(S.action) && !pv),
      confirm: () => this.confirm(tgtUnit, attackMode, stimTarget), endTurn: () => act({ type: 'combat/end-turn', unitId: cur.id }), notMine: !mineTurn,
      toStory: () => go('main'), over: !!cb.over, overColor: won ? '#6FEA77' : '#F65157', overKicker: won ? 'VICTORY' : 'DEFEAT',
      overTitle: cb.name, overText: (cb.summary || '') + ' The Narrator picks up the story.',
    };
  }

  tileClick(k) {
    const S = this.state, g = getState().game, cb = g.combat, cur = active(cb);
    const u = cb.units.find((x) => x.pos === k && !x.dead);
    if (u && u.side === 'foe') { this.setState({ target: u.id, action: ['shot', 'aimed', 'melee', 'burst', 'auto', 'shove', 'analyze', 'skill', 'paired'].includes(S.action) ? S.action : (WEAPON[cur?.weapon] && isMelee(WEAPON[cur.weapon]) ? 'melee' : 'shot') }); return; }
    if (u && u.side === 'pc' && S.action === 'stim') { this.setState({ target: u.id }); return; }
    if (S.action === 'cover' || S.action === 'pickup' || S.action === 'door') { this.setState({ tile: k }); return; }
    if (objectsOf(cb).some((o) => o.pos === k && o.hp > 0) && ['shot', 'aimed', 'melee'].includes(S.action)) { this.setState({ action: 'cover', tile: k }); return; }
    if (!['move', 'sprint', 'disengage'].includes(S.action) || !cur) return;
    act({ type: 'combat/move', unitId: cur.id, to: k, how: S.action });
    this.setState({ hover: null });
  }

  confirm(tgt, mode, stimTarget) {
    const cur = active(getState().game.combat), a = this.state.action;
    if (a === 'reload') return act({ type: 'combat/reload', unitId: cur.id });
    if (a === 'prone') return act({ type: 'combat/prone', unitId: cur.id });
    if (a === 'skill') return act({ type: 'combat/skill', unitId: cur.id, targetId: tgt ? tgt.id : undefined });
    if (a === 'paired') return tgt && act({ type: 'combat/paired', unitId: cur.id, targetId: tgt.id });
    if (a === 'repair') return act({ type: 'combat/repair', unitId: cur.id });
    if (a === 'song') return act({ type: 'combat/song', unitId: cur.id });
    if (a === 'brace') return act({ type: 'combat/brace', unitId: cur.id });
    if (a === 'overwatch') { const w = WEAPON[cur.weapon]; return act({ type: 'combat/overwatch', unitId: cur.id, mode: isMelee(w) ? 'melee' : 'shot' }); }
    if (a === 'shove') return tgt && act({ type: 'combat/shove', unitId: cur.id, targetId: tgt.id });
    if (a === 'clear') return act({ type: 'combat/clear', unitId: cur.id });
    if (a === 'analyze') return tgt && act({ type: 'combat/analyze', unitId: cur.id, targetId: tgt.id });
    if (a === 'cover') return act({ type: 'combat/shoot-cover', unitId: cur.id, tile: this.state.tile });
    if (a === 'door') return act({ type: 'combat/door', unitId: cur.id, tile: this.state.tile });
    if (a === 'pickup') return act({ type: 'combat/pickup', unitId: cur.id, tile: this.state.tile });
    if (a === 'load') return act({ type: 'combat/load', unitId: cur.id });
    if (a === 'stim') return stimTarget && act({ type: 'combat/stim', unitId: cur.id, targetId: stimTarget.id });
    if (tgt) act({ type: 'combat/attack', unitId: cur.id, targetId: tgt.id, mode });
  }
}
