// Story mode, ported from design/canvas-build/main.logic.js. Everything the prototype faked now comes from the game:
// the sheet is your character, the stream is the session, voices and Overreach are the engine's private entries,
// the dice table rolls the checks the Narrator called (the engine rolls; Echo rerolls), and Send speaks in turn.
import { DCLogic } from '../dc/runtime';
import { D, ATTR, SK, IMG, mod, fmt, epccgVals, lightboxVals, zoomer, epBtnStyle, masteredVals, bodyFigure, SLOT_PARTS, tokenVals } from './shared';
import { SKILL, PERK, WEAPON, MAPS, CLASS, maxHp, maxMp, xpForLevel, defense, initiativeBonus, movement, healingMult, classRank, pendingPerkSteps, ARMOUR, KITS, packOf, mainHandSide, injuryText, itemKg, carriedKg, carryLimit, loadedOf, ITEM, overweightKg, weaponDurOf, maxDurOf, coverOf, difficultOf, magsOf, WEAPONS, zoneMap, positionsOf, refOf, notesAt, visibility, defaultObjects, kindOf, coverKind, blocksMove, isDifficult, SKILL as SKILLS_BY_ID, TN_LADDER } from '@engine';
import { startOf } from '../game/starts';
import { act, getState, go, polishText, retryNarrator, saveNow, toast } from '../game/store';
const WORN_SLOT = { head: 'head', head_accessory: 'headAcc', inner_torso: 'inner', lower_torso: 'lower', legs: 'legs', hands: 'hands', footwear: 'feet' };
const SLOT_TO_WORN = Object.fromEntries(Object.entries(WORN_SLOT).map(([a, b]) => [b, a]));

const TABLES = [['felt', 'Field felt', '#1F4D3A', '#123526'], ['oak', 'Mess-hall oak', '#5B3A22', '#3D2716'], ['velvet', 'Lumeri velvet', '#4A1830', '#2E0F1E'],
  ['slate', 'Outpost slate', '#2B3138', '#1B2026'], ['hull', 'Ship hull', '#3A3F47', '#5B6270'], ['void', 'Black-hole glass', '#0B0F1E', '#AE9BFF']];
const SKINS = [['ivory', 'Ivory', '#EFE6D2', '#8C7B5A', '#1A1A1A'], ['obsidian', 'Obsidian', '#15171C', '#6B7280', '#E7EBF3'], ['brass', 'Brass', '#C9A25A', '#6B4F1F', '#1A1208'],
  ['glass', 'Sigil glass', '#173640', '#8BDEEE', '#E7EBF3'], ['bone', 'Bone', '#D9CBB0', '#7A6A4F', '#3A2E20'], ['blood', 'Oil-red', '#7A1121', '#F65157', '#FFFFFF']];
const ARMOUR_NAMES = ['No armour', 'Light (Class I)', 'Medium (Class II)', 'Heavy (Class III)', 'Assault (Class IV)', 'Juggernaut (Class V)'];
const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V'];
const SLOTS = [['main', 'MAIN HAND'], ['off', 'OFF HAND'], ['head', 'HEAD'], ['headAcc', 'HEAD ACC.'], ['outer', 'OUTER TORSO'], ['inner', 'INNER TORSO'], ['lower', 'LOWER TORSO'],
  ['legs', 'LEGS'], ['hands', 'HANDS'], ['feet', 'FOOTWEAR'], ['veil', 'VEIL'], ['pack', 'BACKPACK']];
const KIND = { weapon: 'WEAPON', ammo: 'AMMO', med: 'MED', tool: 'TOOL', focus: 'FOCUS', food: 'FOOD', loot: 'LOOT' };
const REGIONS = [['OUTPOST-813', 'Barracks, infirmary, comms', 6, 8, 30, 30], ['SHIELD LINE', 'Where the five squads held', 40, 6, 40, 22], ['WRECK FIELD', '100 infantry robots, most still', 6, 44, 34, 40],
  ['ENGINEERS’ SHIP', 'Platinum hold, sealed hatch', 74, 34, 22, 20], ['B813', 'The black hole, overhead', 72, 76, 24, 18]];
const TRAIT = {}; D.traits.forEach((t) => { TRAIT[t.id] = t; });
const PERK_ICON = {};
D.skills.forEach((s) => { s.ep.perks.forEach((p) => { PERK_ICON[p.id] = p.icon; }); PERK_ICON[s.ep.mastered.id] = s.ep.mastered.icon; s.ep.combos.forEach((c) => { PERK_ICON[c.id] = c.icon; }); });
D.ults.forEach((u) => { PERK_ICON[u.id] = u.icon; });
const side0 = (c) => (c ? mainHandSide(c) : 'right');
const pref = (k, d) => { try { return localStorage.getItem('phc.' + k) || d; } catch { return d; } };
const savePref = (k, v) => { try { localStorage.setItem('phc.' + k, v); } catch { /* */ } };

export class MainLogic extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { tab: 'skills', core: 'body', sel: null, draft: '', rawDraft: '', polished: false, polishing: false, pickRoll: false, dice: null, custom: false, area: false, table: pref('table', 'felt'), skin: pref('skin', 'ivory') };
  }

  renderVals() {
    const S = this.state, st = getState(), g = st.game, me = st.me.id, isHost = st.role === 'host';
    if (!g) return { ...lightboxVals(this), ...epccgVals(this), stream: [], order: [], tabs: [], coreTabs: [], sheetSkills: [], bars: [], echoPips: [], pc: {} };
    const mine = Object.values(g.characters).filter((c) => c.owner === me);
    const c = mine.find((x) => x.id === S.sel) || mine[0] || null;
    const P = (id) => (c ? c.skills[id] || 0 : 0), A = (id) => (c ? c.attrs[id] || 1 : 1);
    const playerOf = (pid) => g.players.find((p) => p.id === pid) || { name: '?', initials: '?', color: '#A3AEC2' };
    const myColor = playerOf(me).color;

    // ---------- the sheet ----------
    const echo = c ? c.echo : 0;
    const echoPips = [0, 1, 2].map((i) => ({ style: 'width: 12px; height: 12px; transform: rotate(45deg); box-sizing: border-box; ' + (i < echo ? 'background: #FFFFFF' : 'border: 1px solid #FFFFFF') }));
    const hpMax = c ? maxHp(c) : 1, mpMax = c ? maxMp(c) : 1, next = c ? xpForLevel(c.level + 1) : 1, prevXp = c ? xpForLevel(c.level) : 0;
    const bars = c ? [['HP', '#F65157', Math.round(c.hp / hpMax * 100), c.hp + ' / ' + hpMax], ['MP', '#5C9EFF', 100, mpMax + ' / ' + mpMax],
      ['XP', '#A3AEC2', c.level >= 20 ? 100 : Math.round((c.xp - prevXp) / Math.max(1, next - prevXp) * 100), c.xp.toLocaleString() + ' / ' + next.toLocaleString()]]
      .map(([label, col, pct, text]) => ({ label, text, labelStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: ' + col, fill: 'width: ' + Math.max(0, Math.min(100, pct)) + '%; height: 100%; background: ' + col })) : [];
    const tabs = [['skills', 'SKILLS'], ['status', 'STATUS'], ['gear', 'GEAR'], ['bio', 'BIO']].map(([id, label]) => ({ label, pick: () => this.setState({ tab: id }), selected: S.tab === id ? 'true' : 'false',
      style: 'min-height: 38px; border-radius: 8px; font-family: inherit; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; cursor: pointer; ' + (S.tab === id ? 'border: 1px solid #E7EBF3; background: #1C2536; color: #E7EBF3' : 'border: 1px solid #232D3F; background: transparent; color: #A3AEC2') }));
    const coreTabs = ['body', 'mind', 'soul'].map((k) => ({ label: k.toUpperCase(), pick: () => this.setState({ core: k }), pressed: S.core === k ? 'true' : 'false',
      style: 'flex: 1; min-height: 36px; border-radius: 8px; font-family: inherit; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; cursor: pointer; color: ' + D.core[k] + '; ' + (S.core === k ? 'border: 1px solid ' + D.core[k] + '; background: #1C2536' : 'border: 1px solid #232D3F; background: transparent') }));
    const asked = (c && g.story.scene.asked[c.id]) || [];
    const sheetSkills = D.skills.filter((s) => s.core === S.core).map((s) => {
      const p = P(s.id), m = mod(p), ink = ATTR[s.attr].ink, done = asked.includes(s.id), off = !c || p === 0 || g.phase !== 'story';
      return { key: s.id, zoom: zoomer(this, s.img, s.name, 'skill'), img: s.img, name: s.name, attr: ATTR[s.attr].name, pts: p, mod: fmt(m), help: () => this.setState({ epccg: s.id }), helpStyle: epBtnStyle(ink),
        ask: () => act({ type: 'voice/ask', charId: c.id, skill: s.id }), noAsk: done || off, askLabel: done ? 'Asked' : 'Ask',
        nameStyle: 'font-size: 14px; font-weight: 700; color: ' + (p ? ink : '#A3AEC2'), modStyle: 'font-size: 13px; text-align: right; color: ' + (p ? '#E7EBF3' : '#7F8BA1'),
        askStyle: 'min-height: 32px; border-radius: 6px; font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer; ' + (done || off ? 'border: 1px solid #232D3F; background: transparent; color: #7F8BA1' : 'border: 1px solid ' + ink + '; background: transparent; color: ' + ink) };
    });
    const au = P('authority'), lead = au >= 5 ? 'Command' : au >= 3 ? 'Platoon' : au >= 1 ? 'Squad' : 'Unfit';
    const w = c ? WEAPON[c.weapon] : null;
    const status = c ? [['Defense', String(defense(c))], ['Initiative', fmt(initiativeBonus(c))], ['Movement', movement(c) + ' tiles per AP'], ['Vision', (12 + 2 * (A('perception') - 1)) + ' tiles'],
      ['Healing given', '×' + (Math.round(healingMult(c) * 100) / 100)], ['Carry', (20 + 5 * (A('strength') - 1)) + ' kg'], ['Body save', fmt(mod(P('guts')))], ['Brain save', fmt(mod(P('charisma')))],
      ['Heart save', fmt(mod(P('composure')))], ['Cores', 'B' + c.cores.body + ' · M' + c.cores.mind + ' · S' + c.cores.soul], ['Leadership', lead], ['Karma', '0 · Neutral']].map(([k, v]) => ({ k, v })) : [];
    const rep = [{ k: 'Factions', v: 'No standing yet' }];
    const inj = c ? c.injuries || [] : [];
    const statusFig = bodyFigure({ injuries: inj, mainSide: side0(c) });
    const ow = c ? overweightKg(c) : 0;
    const injuries = [...inj.map((i, n) => ({ key: n, where: ((i.side ? i.side + ' ' : '') + i.loc).toUpperCase() + ' · INJURED', what: injuryText[i.loc] })),
      ...(ow > 0 ? [{ key: 'ow', where: 'OVERBURDENED', what: ow + ' kg over your carry limit: −' + Math.ceil(ow / 5) + ' Movement and no Sprint until you drop something.' }] : [])];
    const traits = c ? c.traits.map((id) => TRAIT[id]).filter(Boolean).map((t) => ({ key: t.id, name: t.name, icon: t.icon, text: t.up[0] || t.flavour, zoom: zoomer(this, t.icon, t.name, 'icon') })) : [];
    const perks = c ? c.perks.map((x) => { const p = PERK[x.id], sk = p.skills[0], ink = sk ? ATTR[SK[sk].attr].ink : '#FFFFFF', icon = PERK_ICON[x.id] || IMG['wick-mind-without-fog'];
      const text = p.tiers ? (x.tier === 'II' ? p.tiers.II.text : p.tiers.I.text) : p.text;
      return { key: x.id, zoom: zoomer(this, icon, p.name, 'perk'), name: p.name, icon, text: text.charAt(0).toUpperCase() + text.slice(1),
        tier: x.tier === 'I' || x.tier === 'II' ? 'TIER ' + x.tier : x.tier.toUpperCase(), chip: p.skills.map((s) => SKILL[s].name).join(' + ') || 'Ultimate',
        chipStyle: 'padding: 1px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; border: 1px solid ' + ink + '; color: ' + ink }; }) : [];
    const top = c ? Object.entries(c.skills).filter(([, p]) => p > 0 && p < 10).sort((a, b) => b[1] - a[1])[0] : null;
    const mp = top ? masteredVals(this, SK[top[0]].ep.mastered, ATTR[SK[top[0]].attr].ink, SK[top[0]].name, top[1]) : {};
    // Gear: the body figure, the slot list beside it, and the backpack rig.
    const kitDef = c ? KITS[c.kit] || KITS.medic : null, side = c ? mainHandSide(c) : 'right';
    const ws = c ? c.weaponState || {} : {}, wd = c ? weaponDurOf(c) : 0, wmax = c ? maxDurOf(c.weapon, ws.rarity) : 0;
    const wear = (d, m) => (m ? (d <= 0 ? 'BROKEN' : d <= m * 0.25 ? 'worn ' + d + '/' + m : 'durability ' + d + '/' + m) : '');
    const worn = c ? { main: [(ws.name || (w.name === WEAPON[kitDef.weapon]?.name && kitDef.weaponName ? kitDef.weaponName : w.name)) + (ws.rarity && ws.rarity !== 'standard' ? ' · ' + ws.rarity.toUpperCase() : ''),
        [(typeof w.damage === 'number' ? w.damage + ' dmg' : 'damage varies') + (typeof w.range_tiles === 'number' ? ' · ' + w.range_tiles + ' tiles' : '') + (w.magazine ? ' · ' + loadedOf(c) + '/' + w.magazine + ' loaded' : ''), wear(wd, wmax),
          (ws.mods || []).map((m) => ITEM[m]?.name).filter(Boolean).join(', '), w.grants ? 'Skill: ' + w.grants.name : ''].filter(Boolean).join(' · ')],
      outer: c.armourClass ? [kitDef.armourName + ' (Class ' + ROMAN[c.armourClass] + ')', 'Armour ' + (ARMOUR[c.armourClass]?.value || 0)] : null,
      off: c.offHand ? [WEAPON[c.offHand.id]?.name || ITEM[c.offHand.id]?.name || c.offHand.id, WEAPON[c.offHand.id] ? 'Paired attacks · ' + (WEAPON[c.offHand.id].grants?.name || '') : (ITEM[c.offHand.id]?.text || '').slice(0, 80)] : null } : {};
    if (c) for (const [slot, id] of Object.entries(c.worn || {})) if (WORN_SLOT[slot]) worn[WORN_SLOT[slot]] = [ITEM[id]?.name || id, (ITEM[id]?.text || '').replace(/^[^:]+: /, '')];
    const pack = c ? [...(c.stims ? [{ id: 'stim', item: 'stim_injector', name: 'Stim injector', qty: c.stims, kind: 'med', note: 'Heals 30 × Healing given; stabilises the Downed; stops Bleeding' }] : []), ...packOf(c),
      ...(c.essence ? [{ id: 'eoe', item: 'essence_of_experience', name: 'Essence of Experience', qty: c.essence, kind: 'loot', note: 'Sells for 300' }] : [])] : [];
    worn.pack = c ? ['Pack', pack.length + (pack.length === 1 ? ' item' : ' items')] : null;
    const hotParts = S.hotSlot ? (S.hotSlot === 'main' ? [side === 'left' ? 'lHand' : 'rHand'] : SLOT_PARTS[S.hotSlot] || []) : [];
    const wornParts = Object.keys(worn).filter((k) => worn[k]).flatMap((k) => (k === 'main' ? [side === 'left' ? 'lHand' : 'rHand'] : SLOT_PARTS[k] || []));
    const gearFig = bodyFigure({ worn: wornParts, hot: hotParts, mainSide: side, weapon: !!c, injuries: [] });
    const gearLocked = g.phase === 'combat';
    const slots = SLOTS.map(([id, label]) => { const x = worn[id], removable = !!x && (id === 'off' || !!SLOT_TO_WORN[id]);
      return { key: id, label, name: x ? x[0] : '—', note: x ? x[1] : '', canRemove: removable && !gearLocked, remove: () => act({ type: 'gear/unequip', charId: c.id, slot: id === 'off' ? 'off' : SLOT_TO_WORN[id] }), hover: () => this.setState({ hotSlot: id }), leave: () => this.setState({ hotSlot: null }),
        style: 'display: grid; grid-template-columns: 78px minmax(0, 1fr); gap: 2px 8px; padding: 4px 6px; border-radius: 6px; font-size: 12px; ' + (S.hotSlot === id ? 'background: #1C2536' : '') ,
        nameStyle: 'font-weight: ' + (x ? '600; color: #E7EBF3' : '400; color: #5B6577') }; });
    const kg = (x) => (Math.round(x * 1000) / 1000) + ' kg';
    // Magazines show as separate lines: full, part-loaded (each count) and empty (spec: Magazines and rounds are inventory).
    const rig = pack.flatMap((it, ri) => {
      if (!it.mags) { const pi0 = ri - (c && c.stims ? 1 : 0), pi = c && pi0 >= 0 && pi0 < packOf(c).length && it.id !== 'eoe' && it.id !== 'stim' ? pi0 : -1, def = ITEM[it.item || it.id] || {}, wdef = it.weapon ? WEAPON[it.weapon] : null, acts = [];
        if (pi >= 0 && !gearLocked) {
          if (wdef && it.kind === 'weapon') { acts.push({ key: 'm', label: 'Main hand', go: () => act({ type: 'gear/equip', charId: c.id, idx: pi, to: 'main' }) }); if (wdef.hands === '1H') acts.push({ key: 'o', label: 'Off hand', go: () => act({ type: 'gear/equip', charId: c.id, idx: pi, to: 'off' }) }); }
          else if (def.slot === 'off_hand') acts.push({ key: 'o', label: 'Off hand', go: () => act({ type: 'gear/equip', charId: c.id, idx: pi, to: 'off' }) });
          else if (def.category === 'armour') acts.push({ key: 'w', label: 'Wear', go: () => act({ type: 'gear/equip', charId: c.id, idx: pi, to: 'worn' }) });
          else if (def.category === 'mod') acts.push({ key: 'f', label: 'Fit', go: () => act({ type: 'gear/mod', charId: c.id, idx: pi }) });
        }
        const tag = wdef ? 'WEAPON' : def.category === 'armour' ? 'ARMOUR' : def.category === 'mod' ? 'MOD' : def.slot === 'off_hand' ? 'OFF HAND' : KIND[it.kind] || 'ITEM';
        return [{ key: it.id + ':' + pi, tag, name: it.name + (it.rarity && it.rarity !== 'standard' ? ' · ' + it.rarity.toUpperCase() : ''), qty: '×' + it.qty, kg: kg(itemKg(it)),
          note: wdef ? [(typeof wdef.damage === 'number' ? wdef.damage + ' dmg' : ''), wdef.hands, wdef.grants ? wdef.grants.name + ': ' + wdef.grants.text : ''].filter(Boolean).join(' · ') : it.note || def.text || '', acts, hasActs: acts.length > 0 }]; }
      const cap = WEAPON[it.weapon]?.magazine || 0, by = {};
      it.mags.forEach((n) => { by[n] = (by[n] || 0) + 1; });
      return Object.keys(by).map(Number).sort((a, b) => b - a).map((n) => ({ key: it.id + ':' + n, tag: n ? 'AMMO' : 'EMPTY', name: it.name + (n === cap ? ' (full)' : n ? ' (' + n + '/' + cap + ')' : ' (empty)'),
        qty: '×' + by[n], kg: kg(itemKg({ ...it, mags: Array(by[n]).fill(n) })), note: n ? by[n] * n + ' rounds' : 'Load it from loose rounds' }));
    });
    const canLoad = !!c && packOf(c).some((m) => m.mags && m.mags.some((n) => n < (WEAPON[m.weapon]?.magazine || 0)) && packOf(c).some((r) => r.calibre && r.calibre === WEAPON[m.weapon]?.ammo && r.qty > 0));
    const KG = c ? carriedKg(c) : { total: 0, weapon: 0, armour: 0, pack: 0 }, lim = c ? carryLimit(c) : 0, over = KG.total > lim;
    const gear = [];
    const lvlOf = (k) => { let l = D.wm.levels[0]; D.wm.levels.forEach((x) => { if (k >= x.kills) l = x; }); return l; };
    const mastery = c ? Object.entries(c.weaponKills).filter(([, k]) => k > 0).map(([fid, kills]) => {
      const fam = D.wm.families.find((f) => f.id === fid) || { name: fid }, lv = lvlOf(kills), nx = D.wm.levels[lv.level + 1];
      const pk = D.wm.perks.filter((p) => p.family === fid && p.mastery_level <= lv.level).map((p) => p.name);
      return { key: fid, name: fam.name, level: 'L' + lv.level + ' ' + lv.name, kills: kills + (kills === 1 ? ' kill' : ' kills') + (nx ? ' · ' + nx.name + ' at ' + nx.kills : ''),
        bonus: '+' + (lv.attack_bonus || 0) + ' to hit', perk: pk.length ? 'Perk: ' + pk.join(', ') : 'Perk at ' + D.wm.levels[1].kills + ' kills',
        fill: 'height: 100%; border-radius: 99px; background: #E7EBF3; width: ' + (nx ? Math.round((kills - lv.kills) / (nx.kills - lv.kills) * 100) : 100) + '%' };
    }) : [];
    const kit = c ? (D.kits.find((k) => k.id === c.kit) || {}).name : '';
    const I = (c && c.identity) || {};
    const bio = c ? [['Origin', c.origin], ['Kit', kit], ['Gender', I.gender], ['Blood type', I.blood], ['Main hand', I.hand], ['Association', I.association], ['Favourite song', I.song], ['Last dream', I.dream], ['History', I.history]]
      .filter(([, v]) => v).map(([k, v]) => ({ k, v })) : [];
    const lvlUp = c && (c.unspent.skill + c.unspent.attr + c.unspent.core > 0 || (c.level >= 3 && !c.classId) || pendingPerkSteps(c).length > 0);
    const pc = c ? { name: c.name, img: c.portrait, line1: [I.association, c.origin].filter(Boolean).join(' · ') || c.origin,
      line2: 'Level ' + c.level + ' · ' + (c.classId ? CLASS[c.classId].name + ' ' + ['', 'I', 'II', 'III'][classRank(c)] : 'No class yet') + (c.dead ? ' · DEAD' : '') } : { name: 'Spectating', img: IMG['wick-welcome'], line1: 'You have no character in this session.', line2: '' };
    const myChars = mine.map((x) => ({ key: x.id, name: x.name, pick: () => this.setState({ sel: x.id }), pressed: x.id === (c && c.id) ? 'true' : 'false',
      style: 'min-height: 32px; padding: 0 10px; border-radius: 8px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; ' + (x.id === (c && c.id) ? 'border: 1px solid #E7EBF3; background: #1C2536; color: #E7EBF3' : 'border: 1px solid #232D3F; background: transparent; color: #A3AEC2') }));

    // ---------- the story stream ----------
    const st0 = startOf(g);
    const heroImg = IMG[st0.art] || IMG['world-pilot'];
    const hero = { zoom: zoomer(this, heroImg, st0.title + ' · ' + st0.artNote, 'world'), img: heroImg, title: g.story.scene.title || st0.title, kicker: st0.kicker, imgStyle: 'width: 100%; height: 260px; object-fit: cover; object-position: ' + st0.focus + '; display: block' };
    const charOf = (id) => g.characters[id];
    const stream = g.story.entries.slice(-150).map((e) => {
      const base = { key: e.id, text: e.text, head: e.head || '', isScene: false, isNarration: false, isPlayer: false, isVoice: false, isCheck: false, isNote: false, paras: [] };
      if (e.kind === 'scene') return { ...base, isScene: true, text: e.text.toUpperCase() };
      if (e.kind === 'narration') return { ...base, isNarration: true, paras: e.text.split(/\n\s*\n/).map((t) => ({ text: t.trim() })).filter((x) => x.text) };
      if (e.kind === 'player') {
        const p = playerOf(e.who), first = Object.values(g.characters).find((x) => x.owner === e.who);
        return { ...base, isPlayer: true, roll: !!e.roll, img: first ? first.portrait : IMG['wick-welcome'], nameStyle: 'color: ' + p.color + '; font-weight: 600',
          imgStyle: 'width: 40px; height: 40px; object-fit: cover; border-radius: 50%; background: #000; flex: none; border: 2px solid ' + p.color };
      }
      if (e.kind === 'voice' || e.kind === 'overreach') {
        const s = SK[e.skill] || D.skills[0], ink = ATTR[s.attr].ink, ch = charOf(e.charId);
        return { ...base, isVoice: true, img: s.img, zoom: zoomer(this, s.img, s.name, 'skill'), head: (mine.length > 1 && ch ? ch.name.toUpperCase() + ' · ' : '') + e.head, headStyle: 'font-size: 12px; font-weight: 700; letter-spacing: 0.16em; color: ' + ink,
          style: 'display: flex; gap: 14px; align-items: flex-start; padding: 14px 16px; border-radius: 12px; background: #10151F; border: 1px solid #232D3F; border-left: 3px solid ' + ink };
      }
      if (e.kind === 'check') return { ...base, isCheck: true, headStyle: 'font-weight: 700; letter-spacing: 0.06em; color: ' + (e.ok ? '#6FEA77' : '#A3AEC2') };
      return { ...base, isNote: true, noteStyle: 'margin: 0; font-size: 13px; line-height: 1.5; color: ' + (e.kind === 'xp' ? '#FFFFFF' : e.kind === 'combat' ? '#F65157' : '#A3AEC2') };
    });
    const busy = g.narrator.busy, err = g.narrator.error;
    const pushes = g.overreach.filter((o) => !o.choice && charOf(o.charId)?.owner === me).map((o) => {
      const s = SK[o.skill], ink = ATTR[s.attr].ink, cost = (charOf(o.charId).skills[o.skill] || 0) >= 10 ? 2 : 1, cons = SKILL[o.skill]?.overreach?.consequence;
      return { key: o.id, img: s.img, zoom: zoomer(this, s.img, s.name, 'skill'), head: s.name.toUpperCase() + ' PUSHES · OVERREACH · ONLY YOU SEE THIS', headStyle: 'font-size: 12px; font-weight: 700; letter-spacing: 0.16em; color: ' + ink,
        text: o.push, consequence: cons ? 'If you indulge: ' + cons : '', indulge: () => act({ type: 'overreach/choose', id: o.id, choice: 'indulge' }), resist: () => act({ type: 'overreach/choose', id: o.id, choice: 'resist' }),
        cantResist: charOf(o.charId).echo < cost, resistLabel: 'Resist · −' + cost + ' Echo' };
    });

    // ---------- checks the Narrator called, and the dice table ----------
    const myChecks = g.checks.filter((k) => !k.done && charOf(k.charId)?.owner === me);
    const label = (tn) => ({ 8: 'Easy', 12: 'Standard', 16: 'Hard', 20: 'Heroic' }[tn] || 'TN');
    const comboOf = (ch, ids) => { const mods = ids.map((i) => mod(ch.skills[i] || 0)), low = Math.min(...mods), lowIx = mods.indexOf(low);
      const bonus = ids.filter((i, k) => k !== lowIx && (ch.skills[i] || 0) > 0).length * 2; return { low, bonus, total: low + bonus, lowId: ids[lowIx] }; };
    const actions = myChecks.map((k) => { const ch = charOf(k.charId), cb = comboOf(ch, k.skills), ink = ATTR[SK[k.skills[0]].attr].ink;
      return { key: k.id, title: (mine.length > 1 ? ch.name + ': ' : '') + k.stakes, tag: k.skills.map((i) => SK[i].name.toUpperCase()).join(' + ') + ' · ' + label(k.tn).toUpperCase() + ' ' + k.tn + ' · ' + fmt(cb.total) + (k.roll ? ' · ROLLED' : ''),
        roll: () => this.setState({ dice: k.id }), tagStyle: 'font-size: 11px; letter-spacing: 0.08em; color: ' + ink,
        style: 'display: flex; flex-direction: column; align-items: flex-start; gap: 2px; min-height: 52px; padding: 8px 12px; border-radius: 10px; border: 1px solid ' + ink + '; background: #10151F; color: #E7EBF3; font-family: inherit; font-size: 14px; text-align: left; cursor: pointer' }; });
    const ck = S.dice ? g.checks.find((k) => k.id === S.dice) : null;
    if (S.dice && (!ck || ck.done)) queueMicrotask(() => this.setState({ dice: null }));
    let roll = { kicker: '', head: '', headStyle: '', pre: '', die: '', math: '', verdict: '', verdictStyle: '' };
    if (ck) {
      const ch = charOf(ck.charId), cb = comboOf(ch, ck.skills), ink = ATTR[SK[ck.skills[0]].attr].ink, r = ck.roll;
      roll = { kicker: 'THE NARRATOR CALLS FOR A CHECK · ' + ch.name.toUpperCase(), head: ck.skills.map((i) => SK[i].name.toUpperCase()).join(' + ') + ' · ' + label(ck.tn).toUpperCase() + ' ' + ck.tn, headStyle: 'font-size: 18px; font-weight: 700; letter-spacing: 0.14em; color: ' + ink,
        pre: ck.skills.length > 1 ? 'Lowest ' + fmt(cb.low) + ' (' + SK[cb.lowId].name + ') + ' + cb.bonus + ' for trained partners = ' + fmt(cb.total) + ' vs TN ' + ck.tn + ' · ' + ck.stakes : 'd20 ' + fmt(cb.total) + ' (' + SK[ck.skills[0]].name + ' ' + (ch.skills[ck.skills[0]] || 0) + ') vs TN ' + ck.tn + ' · ' + ck.stakes,
        die: r ? r.die : '', math: r ? (r.rerolled ? 'Echo reroll (was ' + r.first + ') · ' : '') + 'd20 ' + r.die + ' ' + fmt(r.mod) + ' = ' + r.total + '  vs  TN ' + ck.tn : '',
        verdict: r ? (r.crit ? '★ CRITICAL SUCCESS' : r.fumble ? '⚠ COMPLICATION' : r.ok ? '✓ SUCCESS' : '✕ FAILURE') : '',
        verdictStyle: 'font-size: 28px; font-weight: 700; letter-spacing: 0.14em; color: ' + (r && r.fumble ? '#F65157' : r && r.ok ? '#6FEA77' : '#A3AEC2') };
    }
    const T = TABLES.find((t) => t[0] === S.table) || TABLES[0], K = SKINS.find((k) => k[0] === S.skin) || SKINS[0];
    const opt = (on) => 'display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 8px 4px; border-radius: 8px; font-family: inherit; font-size: 11px; color: #E7EBF3; cursor: pointer; ' + (on ? 'border: 1px solid #E7EBF3; background: #1C2536' : 'border: 1px solid #232D3F; background: transparent');
    const tables = TABLES.map(([id, name, c1, c2]) => ({ name, pick: () => { savePref('table', id); this.setState({ table: id }); }, pressed: S.table === id ? 'true' : 'false', style: opt(S.table === id), swatch: 'width: 40px; height: 26px; border-radius: 6px; background: ' + c1 + '; border: 3px solid ' + c2 }));
    const skins = SKINS.map(([id, name, face, edge]) => ({ name, pick: () => { savePref('skin', id); this.setState({ skin: id }); }, pressed: S.skin === id ? 'true' : 'false', style: opt(S.skin === id), swatch: 'width: 24px; height: 24px; transform: rotate(45deg); background: ' + face + '; border: 2px solid ' + edge }));
    const rolled = !!(ck && ck.roll);

    // ---------- speaking order ----------
    const speakers = g.players.filter((p) => Object.values(g.characters).some((x) => x.owner === p.id && !x.dead));
    const waitingOn = speakers.filter((p) => g.story.spoken[p.id] == null);
    const order = [...speakers.map((p) => { const chs = Object.values(g.characters).filter((x) => x.owner === p.id), spoke = g.story.spoken[p.id] != null, now = g.story.await === 'players' && !spoke;
      return { key: p.id, img: chs[0]?.portrait || IMG['wick-welcome'], name: chs.map((x) => x.name).join(' & ') + (p.id === me ? ' (you)' : ''), player: p.initials + ' · ' + p.name.toUpperCase() + (p.online ? '' : ' · AWAY'),
        playerStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.12em; color: ' + p.color, imgStyle: 'width: 36px; height: 36px; border-radius: 50%; object-fit: cover; background: #000; border: 2px solid ' + p.color,
        state: spoke ? '✓ SPOKE' : now ? 'SPEAKING' : 'WAITING', stateStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: ' + (spoke ? '#6FEA77' : now ? '#FFFFFF' : '#A3AEC2'), zoom: zoomer(this, chs[0]?.portrait, chs[0]?.name, 'portrait') }; }),
      { key: 'narrator', img: IMG['wick-narrator-placeholder'], name: 'Narrator', player: 'AI', playerStyle: 'font-size: 11px; letter-spacing: 0.12em; color: #A3AEC2', imgStyle: 'width: 36px; height: 36px; border-radius: 50%; object-fit: cover; background: #000; border: 2px solid #232D3F',
        state: busy ? 'THINKING…' : err ? 'STUCK' : 'AFTER ALL', stateStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: ' + (busy ? '#FFFFFF' : err ? '#F65157' : '#A3AEC2'), zoom: zoomer(this, IMG['wick-narrator-placeholder'], 'The Narrator', 'portrait') }];
    const iSpoke = g.story.spoken[me] != null;
    const cantSpeak = !c || c.dead || g.phase !== 'story' || g.story.await !== 'players' || iSpoke;
    const why = !c ? 'You have no character in this session.' : g.phase !== 'story' ? 'A fight is on: go to Combat.' : busy ? 'The Narrator is answering…' : err ? 'The Narrator is stuck; the host can retry.'
      : g.story.await === 'rolls' ? 'Waiting for the checks to be rolled.' : g.story.await === 'choices' ? 'Waiting for an Overreach choice.' : g.story.await === 'narrator' ? 'The Narrator is about to answer…'
      : iSpoke ? 'You spoke. Waiting for ' + waitingOn.map((p) => p.name).join(', ') + '.' : 'Your turn: everyone speaks once, then the Narrator answers.';

    // ---------- the zone: the story's map (or the fight's), with grid references (spec: Grid references) ----------
    const cb = g.combat, inFight = g.phase === 'combat', map = inFight && cb ? cb.map : zoneMap(g);
    const pos = inFight ? {} : positionsOf({ ...g, story: { ...g.story, positions: { ...(g.story.positions || {}) } } });
    const seenNow = inFight && cb ? visibility(cb, 'pc').seen : null;
    const units = inFight ? cb.units.filter((u) => !(u.dead && u.side === 'foe') && (u.side === 'pc' || seenNow.has(u.id)))
      : Object.values(g.characters).filter((x) => !x.dead && pos[x.id]).map((x) => ({ id: 'pc-' + x.id, side: 'pc', charId: x.id, name: x.name, short: x.name.slice(0, 2).toUpperCase(), img: x.portrait,
        pos: pos[x.id], hp: x.hp, maxHp: maxHp(x), movement: movement(x), ap: 0, injuries: x.injuries || [], downed: false, dead: false }));
    const tok = {}; units.forEach((u) => { tok[u.pos] = u; });
    const objs = (inFight && cb ? cb.objects : g.story.objects) || defaultObjects(map), objAt = {};
    objs.forEach((o) => { if (!objAt[o.pos] || kindOf(o).blocks_move) objAt[o.pos] = o; });
    const cov = {}; objs.forEach((o) => { const k = coverKind(o); if (k) cov[o.pos] = { kind: k }; });
    const solid = new Set(map.solid), diff = new Set([...map.difficult, ...objs.filter(isDifficult).map((o) => o.pos)]);
    const interesting = (o) => o && (o.approaches.length || ['poi', 'door', 'barricade', 'container', 'terminal', 'exit', 'trap', 'hole'].includes(o.kind));
    const cellBg = (k) => (solid.has(k) ? '#1C2536' : cov[k] ? (cov[k].kind === 'full' ? '#6B5430' : '#4A3A20') : diff.has(k) ? '#232D3F' : '#0D1119');
    const mover = c && !c.dead && !inFight && g.phase === 'story' ? c : null;
    const moveTo = (k) => () => { if (!mover) return toast(inFight ? 'A fight is on: move on the combat grid.' : 'You have no character to move.'); act({ type: 'story/move', charId: mover.id, to: k }); };
    const cellsFor = (labels, onClick) => {
      const out = [], lab = (key, text) => ({ key, isLabel: true, isTile: false, text, style: 'display: grid; place-items: center; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; color: #7F8BA1' });
      if (labels) { out.push(lab('h-', '')); for (let x = 0; x < map.w; x++) out.push(lab('h' + x, refOf(x + ',0').replace(/\d+$/, ''))); }
      for (let y = 0; y < map.h; y++) {
        if (labels) out.push(lab('r' + y, String(y + 1)));
        for (let x = 0; x < map.w; x++) { const k = x + ',' + y, u = tok[k], p = u && u.side === 'pc' ? playerOf(charOf(u.charId)?.owner) : null, ref = refOf(k), note = notesAt(map, k)[0] || '', o = objAt[k];
          const what = solid.has(k) ? 'blocked' : o && o.kind !== 'crate' && o.kind !== 'pillar' ? o.name + (o.hp != null ? ' (' + o.hp + '/' + o.max + ' HP)' : '') + (o.locked ? ', locked' : o.open ? ', open' : '') + (o.approaches.length ? ', ' + o.approaches.length + ' approaches' : '') : cov[k] ? cov[k].kind + ' cover' : diff.has(k) ? 'slow ground' : 'open';
          const glyph = o && !u && !(cov[k] && (o.kind === 'crate' || o.kind === 'pillar')) ? kindOf(o).glyph : '';
          out.push({ key: k, isLabel: false, isTile: true, has: !!u, glyph, hasGlyph: !!glyph, glyphStyle: 'position: absolute; inset: 0; display: grid; place-items: center; font-size: ' + (labels ? 18 : 9) + 'px; line-height: 1; color: ' + (o && (o.approaches.some((a) => !a.tries.length) || o.kind === 'poi') && !o.resolved ? '#FFFFFF' : o && (kindOf(o).hazard || o.kind === 'trap') ? '#F65157' : '#C9D3E3'),
            click: interesting(o) && labels ? () => this.setState({ objPanel: o.id }) : onClick(k), hover: () => { if (this.state.hoverTile !== k) this.setState({ hoverTile: k }); },
            t: u ? tokenVals(u, { ref, ally: u.side === 'pc', player: p ? p.initials + ' · ' + p.name.toUpperCase() : '', color: p ? p.color : '#F65157', inFight, right: x >= map.w / 2, up: y >= map.h / 2 }) : null,
            label: ref + (u ? ': ' + u.name : '') + ' · ' + what + (note ? ' · ' + note : ''), title: u ? '' : ref + ' · ' + what + (note ? '\n' + note : ''),
            style: 'position: relative; display: block; aspect-ratio: 1; padding: 0; border: 0; border-radius: 1px; cursor: ' + (mover && !u && !solid.has(k) && !cov[k] ? 'pointer' : 'default') + '; background: ' + (u ? '#0D1119' : cellBg(k)) });
        }
      }
      return out;
    };
    // ---------- points of interest: the panel (like an event with choices) and what's nearby ----------
    const myPos = c ? pos[c.id] : null;
    const near = !inFight && myPos ? objs.filter((o) => !o.hidden && interesting(o) && Math.max(Math.abs(+o.pos.split(',')[0] - +myPos.split(',')[0]), Math.abs(+o.pos.split(',')[1] - +myPos.split(',')[1])) <= 1) : [];
    const nearby = near.map((o) => ({ key: o.id, label: kindOf(o).glyph + ' ' + o.name + ' · ' + refOf(o.pos) + (o.approaches.length ? ' · ' + o.approaches.length + ' approaches' : ''), open: () => this.setState({ objPanel: o.id }) }));
    const P0 = S.objPanel ? objs.find((o) => o.id === S.objPanel && !o.hidden) : null;
    if (S.objPanel && !P0) queueMicrotask(() => this.setState({ objPanel: null }));
    const isNear = !!(P0 && near.includes(P0));
    const myTurn = !!c && !c.dead && g.phase === 'story' && g.story.await === 'players' && g.story.spoken[me] == null && !g.checks.some((k) => !k.done && k.poi && charOf(k.charId)?.owner === me);
    const tnWord = (tn) => ({ 8: 'Easy', 12: 'Standard', 16: 'Hard', 20: 'Heroic' }[tn] || 'TN');
    const poiWhy = !c ? 'You have no character here.' : g.phase !== 'story' ? 'After the fight.' : !isNear ? 'Walk up to it first.' : g.story.await !== 'players' ? 'Wait for your turn to speak.' : g.story.spoken[me] != null ? 'You already acted this round.' : '';
    const objPanel = P0 ? { name: P0.name, kicker: kindOf(P0).name.toUpperCase() + ' · ' + refOf(P0.pos) + (P0.hp != null ? ' · ' + P0.hp + '/' + P0.max + ' HP' : '') + (P0.locked ? ' · LOCKED' : P0.open ? ' · OPEN' : '') + (P0.resolved ? ' · DEALT WITH' : ''),
      text: P0.text || kindOf(P0).text, rules: P0.text ? kindOf(P0).text : '', hasRules: !!P0.text, why: poiWhy, hasWhy: !!poiWhy,
      approaches: P0.approaches.map((a, i) => { const tried = c && a.tries.some((t) => t.charId === c.id && t.scene === g.story.scene.n), ink = a.skills[0] && SK[a.skills[0]] ? ATTR[SK[a.skills[0]].attr].ink : '#FFFFFF';
        const best = c ? (() => { const mods = a.skills.map((s) => mod(c.skills[s] || 0)), low = Math.min(...mods), li = mods.indexOf(low); return low + 2 * a.skills.filter((s, j) => j !== li && (c.skills[s] || 0) > 0).length; })() : 0;
        return { key: i, label: a.label, stakes: a.stakes, skills: a.skills.map((s) => ({ key: s, name: SK[s] ? SK[s].name : s, style: 'padding: 1px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; border: 1px solid ' + (SK[s] ? ATTR[SK[s].attr].ink : '#A3AEC2') + '; color: ' + (SK[s] ? ATTR[SK[s].attr].ink : '#A3AEC2') })),
          tn: tnWord(a.tn).toUpperCase() + ' ' + a.tn + (c ? ' · YOU ROLL d20 ' + fmt(best) : '') + (a.success ? ' · SUCCESS: ' + ({ remove: 'CLEARS IT', open: 'OPENS IT', reveal: 'REVEALS', disarm: 'DISARMS' }[a.success]) : ''),
          tries: a.tries.map((t, j) => ({ key: j, text: (t.ok ? '✓ ' : '✕ ') + t.name + ' · ' + t.total, style: 'font-size: 11px; font-weight: 700; color: ' + (t.ok ? '#6FEA77' : '#A3AEC2') })), hasTries: a.tries.length > 0,
          cant: !myTurn || !isNear || !!tried || !!P0.resolved, label2: tried ? 'Tried this scene' : 'Try this',
          go: () => { act({ type: 'poi/try', charId: c.id, objId: P0.id, idx: i }); this.setState({ objPanel: null }); },
          style: 'display: flex; flex-direction: column; gap: 6px; padding: 12px; border-radius: 10px; background: #0D1119; border: 1px solid #232D3F; border-left: 3px solid ' + ink }; }),
      noApproaches: !P0.approaches.length, cantExamine: !(myTurn && isNear),
      examine: () => { act({ type: 'poi/examine', charId: c.id, objId: P0.id }); this.setState({ objPanel: null }); },
      isExit: !!P0.to, cantTravel: !(myTurn && isNear), travel: () => { act({ type: 'poi/travel', charId: c.id, objId: P0.id }); this.setState({ objPanel: null }); },
      isDoor: !!kindOf(P0).door, doorLabel: P0.open ? 'Close it' : 'Open it', cantDoor: !isNear || !!P0.locked || g.phase !== 'story', door: () => act({ type: 'story/door', charId: c.id, objId: P0.id }),
      canWalk: !!mover && !isNear, walk: () => { const [ox, oy] = P0.pos.split(',').map(Number), taken = new Set(Object.values(pos)); let best = null, bd = 1e9;
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const k = (ox + dx) + ',' + (oy + dy), d = myPos ? Math.abs(ox + dx - +myPos.split(',')[0]) + Math.abs(oy + dy - +myPos.split(',')[1]) : 0;
          if ((dx || dy || !kindOf(P0).blocks_move) && ox + dx >= 0 && oy + dy >= 0 && ox + dx < map.w && oy + dy < map.h && !solid.has(k) && !objs.some((o) => o.pos === k && blocksMove(o)) && !taken.has(k) && d < bd) { bd = d; best = k; } }
        if (best) act({ type: 'story/move', charId: mover.id, to: best }); else toast('No free tile next to it.'); },
      close: () => this.setState({ objPanel: null }) } : null;
    const mini = cellsFor(false, () => () => this.setState({ area: true }));
    const areaCells = cellsFor(true, (k) => moveTo(k));
    const regions = [];
    const u = g.narrator.usage, host = playerOf(g.hostId);

    return {
      ...epccgVals(this), ...lightboxVals(this), code: g.code, costText: (u.calls ? '$' + u.costUsd.toFixed(2) + ' · ' + u.calls + ' Narrator turns' : 'no Narrator turns yet'),
      toRoom: () => go('room'), isHost, save: () => saveNow(), saveLabel: st.savedAt && Date.now() - st.savedAt < 4000 ? 'Saved ✓' : 'Save', toCombat: () => { if (g.combat) go('combat'); }, noCombat: !g.combat,
      narrChip: 'AI NARRATOR · ' + (busy ? 'THINKING…' : err ? 'STUCK' : isHost ? 'YOUR KEY' : host.name.toUpperCase() + '’S KEY'),
      narrChipStyle: 'padding: 6px 12px; border-radius: 999px; border: 1px solid ' + (err ? '#F65157' : '#232D3F') + '; font-size: 12px; color: ' + (err ? '#F65157' : busy ? '#FFFFFF' : '#A3AEC2'),
      narrError: !!err, narrErrorText: (err || '') + (isHost ? '' : ' Ask ' + host.name + ' to retry.'), retry: () => (isHost ? retryNarrator() : toast('Only the host can retry the Narrator.')), retryLabel: isHost ? 'Retry' : 'Host retries',
      thinking: busy, thinkingText: 'The Narrator is writing…', narratorImg: IMG['wick-narrator-placeholder'],
      echoPips, echo, pc, multi: mine.length > 1, myChars, bars, tabs, coreTabs, sheetSkills, tabSkills: S.tab === 'skills', tabStatus: S.tab === 'status', tabGear: S.tab === 'gear', tabBio: S.tab === 'bio',
      zoomPc: zoomer(this, pc.img, pc.name, 'portrait'), canLevel: !!lvlUp, toLevelUp: () => go('levelup', { levelupChar: c.id }), levelLabel: c && c.level >= 3 && !c.classId ? '★ Earn your class' : 'Level up · spend points',
      status, rep, statusFig, injuries, noInjuries: !injuries.length, hpLine: c ? c.hp + ' / ' + hpMax + ' HP' + (c.dead ? ' · DEAD' : '') : '', traits, noTraits: !traits.length, perks, noPerks: !perks.length, mp, hasMp: !!top, gear, gearFig, slots, rig, noRig: !rig.length, backpackImg: '',
      canLoad, cantLoad: !canLoad || g.phase === 'combat', loadMags: () => act({ type: 'gear/load', charId: c.id }),
      load: c ? 'Carrying ' + KG.total + ' kg of ' + lim + ' kg' + (over ? ' · OVER THE LIMIT' : '') + ' (weapon ' + kg(KG.weapon) + ', armour ' + kg(KG.armour) + ', pack ' + kg(KG.pack) + ')' : '', loadStyle: 'font-size: 12px; color: ' + (over ? '#F65157' : '#A3AEC2'), eoe: { locked: true, why: 'Cracking needs Mastery 2 in Brain Power with an Evoker, or Will Power with an Emanator.' }, mastery, noMastery: !mastery.length, bio,
      hero, stream, pushes,
      hasChecks: actions.length > 0, actions,
      dice: !!ck, roll, closeDice: () => { if (ck && ck.roll && !ck.done) act({ type: 'check/accept', checkId: ck.id }); this.setState({ dice: null }); },
      waiting: !!ck && !rolled, rolled, rolledA: rolled && !ck.roll.rerolled, rolledB: rolled && ck.roll.rerolled,
      throwDie: () => act({ type: 'check/roll', checkId: ck.id }), reroll: () => act({ type: 'check/reroll', checkId: ck.id }),
      noReroll: !ck || !ck.roll || ck.roll.rerolled || (charOf(ck.charId)?.echo || 0) < 1,
      tables, skins, skin: { face: K[2], edge: K[3], ink: K[4] }, tableName: T[1].toUpperCase(),
      tableStyle: 'position: relative; height: 300px; border-radius: 16px; overflow: hidden; background: ' + T[2] + '; border: 10px solid ' + T[3] + '; box-shadow: inset 0 0 60px rgba(0, 0, 0, 0.55)',
      custom: S.custom, toggleCustom: () => this.setState({ custom: !S.custom }), customPressed: S.custom ? 'true' : 'false', customLabel: S.custom ? 'Done' : 'Customise',
      draft: S.draft, onDraft: (e) => this.setState({ draft: e.target.value, polished: false }), placeholder: cantSpeak ? why : 'Say or do something… (' + (c ? c.name : '') + ')',
      polishLabel: S.polishing ? 'Polishing…' : S.polished ? 'Undo polish' : 'Polish with AI', cantPolish: !isHost || S.polishing || cantSpeak, polishTitle: isHost ? 'Rewrite your words as in-world prose (a small Haiku call on your key)' : 'Only the host\'s key can polish',
      polish: async () => {
        if (S.polished) return this.setState({ draft: S.rawDraft, polished: false });
        const text = S.draft.trim(); if (!text) return;
        this.setState({ polishing: true });
        try { const out = await polishText(text, c ? c.name : ''); this.setState({ rawDraft: text, draft: out, polished: true, polishing: false }); }
        catch (e2) { this.setState({ polishing: false }); toast(String(e2.message || e2)); }
      },
      send: () => { const text = (this.state.draft || '').trim(); if (!text) return toast('Say something first, or Pass.'); act({ type: 'story/speak', text, roll: this.state.pickRoll }); this.setState({ draft: '', polished: false }); },
      cantSpeak, turnText: why, turnStyle: 'font-size: 13px; color: ' + (cantSpeak ? '#A3AEC2' : myColor),
      pass: () => act({ type: 'story/speak', text: '(passes this round)' }),
      skipRest: () => waitingOn.forEach((p) => act({ type: 'story/skip', playerId: p.id })), cantSkip: !isHost || g.story.await !== 'players' || !waitingOn.length,
      pickRoll: S.pickRoll, togglePick: () => this.setState({ pickRoll: !S.pickRoll }),
      zoneLabel: 'ZONE · ' + map.name.toUpperCase(), zoneAria: inFight ? 'Open the combat zone' : 'Combat zone',
      zoneStyle: 'display: block; width: 100%; box-sizing: border-box; padding: 6px; border-radius: 10px; background: #05070B; border: 1px solid ' + (inFight ? '#F65157' : '#232D3F'),
      miniGrid: 'display: grid; grid-template-columns: repeat(' + map.w + ', minmax(0, 1fr)); gap: 1px',
      objPanelOpen: !!objPanel, objPanel: objPanel || { approaches: [] }, nearby, hasNearby: nearby.length > 0,
      areaCells, hereText: (() => { const k = S.hoverTile; if (!k || !areaCells.some((c) => c.key === k)) return 'Hover a tile to see what is there.';
        const cell = areaCells.find((c) => c.key === k); return cell.label; })(), areaHint: mover ? 'Click an open tile to move ' + mover.name + ' there. Hover any tile for what is at it.' : 'Hover any tile for what is at it.',
      areaGrid: 'display: grid; grid-template-columns: 18px repeat(' + map.w + ', minmax(0, 1fr)); gap: 2px; margin: 0 auto; width: min(100%, calc((100vh - 260px) * ' + ((map.w + 0.4) / (map.h + 0.4)).toFixed(3) + '))',
      areaTitle: 'AREA MAP · ' + st0.short.toUpperCase() + ' · ' + map.name.toUpperCase(), inFight,
      areaNote: inFight ? 'Fight on: round ' + cb.round + '. Tokens show where everyone stands.' : 'Grid references: columns A–' + refOf((map.w - 1) + ',0').replace(/\d+$/, '') + ', rows 1–' + map.h + '. Tell the Narrator "I move to C7", or click a tile.',
      zoneNote: inFight ? 'COMBAT ZONE · ENTER ›' : cb ? 'LAST FIGHT · ' + (cb.over === 'win' ? 'WON' : 'LOST') + ' · VIEW ›' : 'NO FIGHT YET · HOVER A TOKEN',
      zoneNoteStyle: 'display: block; padding-top: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; color: ' + (inFight ? '#F65157' : '#A3AEC2'),
      mini, regions, area: S.area, openArea: () => this.setState({ area: true }), closeArea: () => this.setState({ area: false }), order,
    };
  }
}
