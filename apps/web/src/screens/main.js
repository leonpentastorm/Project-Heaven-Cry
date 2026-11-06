// Story mode, ported from design/canvas-build/main.logic.js. Everything the prototype faked now comes from the game:
// the sheet is your character, the stream is the session, voices and Overreach are the engine's private entries,
// the dice table rolls the checks the Narrator called (the engine rolls; Echo rerolls), and Send speaks in turn.
import { DCLogic } from '../dc/runtime';
import { D, ATTR, SK, IMG, mod, fmt, epccgVals, lightboxVals, zoomer, epBtnStyle, masteredVals, bodyFigure, SLOT_PARTS, tokenVals, effectsOf, ART, ART_BIG, zoneOf, spriteOf, tileBg, spriteStyle } from './shared';
import { SKILL, PERK, WEAPON, MAPS, CLASS, maxHp, maxMp, xpForLevel, defense, initiativeBonus, movement, healingMult, classRank, pendingPerkSteps, ARMOUR, KITS, packOf, mainHandSide, injuryText, itemKg, carriedKg, carryLimit, loadedOf, ITEM, overweightKg, weaponDurOf, maxDurOf, RARITY, coverOf, difficultOf, magsOf, WEAPONS, zoneMap, positionsOf, refOf, notesAt, visibility, defaultObjects, kindOf, coverKind, blocksMove, isDifficult, SKILL as SKILLS_BY_ID, TN_LADDER } from '@engine';
import { startOf } from '../game/starts';
import { voiceState, speak, stopVoice, CORE_VOICE } from '../game/voice';
import { npcsOf, apLeft, ROUND_AP, ENEMY, attackApCost, isMelee, isPersonObj, songStateOf, musicTraitOf, gearEffects } from '@engine';
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
    const tabs = [['skills', 'SKILLS'], ['status', 'STATUS'], ['perks', 'PERKS'], ['gear', 'GEAR']].map(([id, label]) => ({ label, pick: () => this.setState({ tab: id }), selected: S.tab === id ? 'true' : 'false',
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
          note: wdef ? [(typeof wdef.damage === 'number' ? wdef.damage + ' dmg' : ''), wdef.hands, wdef.grants ? wdef.grants.name + ': ' + wdef.grants.text : ''].filter(Boolean).join(' · ') : it.note || def.text || '', acts, hasActs: acts.length > 0, src: it }]; }
      const cap = WEAPON[it.weapon]?.magazine || 0, by = {};
      it.mags.forEach((n) => { by[n] = (by[n] || 0) + 1; });
      return Object.keys(by).map(Number).sort((a, b) => b - a).map((n) => ({ key: it.id + ':' + n, tag: n ? 'AMMO' : 'EMPTY', name: it.name + (n === cap ? ' (full)' : n ? ' (' + n + '/' + cap + ')' : ' (empty)'),
        qty: '×' + by[n], kg: kg(itemKg({ ...it, mags: Array(by[n]).fill(n) })), note: n ? by[n] * n + ' rounds' : 'Load it from loose rounds', acts: [], hasActs: false, src: it }));
    });
    const canLoad = !!c && packOf(c).some((m) => m.mags && m.mags.some((n) => n < (WEAPON[m.weapon]?.magazine || 0)) && packOf(c).some((r) => r.calibre && r.calibre === WEAPON[m.weapon]?.ammo && r.qty > 0));
    const KG = c ? carriedKg(c) : { total: 0, weapon: 0, armour: 0, pack: 0 }, lim = c ? carryLimit(c) : 0, over = KG.total > lim;
    const gear = [];
    // ---------- Gear: hands as panels, the body's slots by name, the backpack; hover for details, click for actions ----------
    const RW = (r) => (r && r !== 'standard' ? r.charAt(0).toUpperCase() + r.slice(1) : 'Standard');
    const marks = (r) => '◆'.repeat(RARITY[r || 'standard']?.marks || 0);
    const artOf = (id) => IMG['weapon-' + id] || IMG['item-' + id] || '';
    const glyphOf = (id) => { const wd = WEAPON[id], it = ITEM[id] || {}; if (wd) return ({ pistol: '⌐', revolver: '⌐', smg: '╤', rifle: '═', shotgun: '╦', heavy: '▬', bow: ')', light_melee: '†', heavy_melee: '⚒', unarmed: '✊', thrown: '●', mana: '✧' })[wd.category] || '⚔';
      return it.category === 'shield' ? '⛉' : it.category === 'light' ? '✦' : it.category === 'armour' ? '▣' : it.category === 'mod' ? '⚙' : '▪'; };
    const tips = {};
    const weaponTip = (id, st = {}) => { const wd = WEAPON[id]; if (!wd) return null; const r = st.rarity || 'standard', m = maxDurOf(id, r), d = st.dur ?? m;
      return { title: st.name || wd.name, sub: (RW(r) + ' ' + marks(r)).trim() + ' · ' + (wd.hands || '') + ' · ' + wd.category.replace('_', ' '), img: artOf(id), glyph: glyphOf(id),
        lines: [(typeof wd.damage === 'number' ? wd.damage : typeof wd.damage === 'object' && wd.damage ? Object.values(wd.damage).join(' / ') : wd.damage) + ' damage' + (typeof wd.range_tiles === 'number' && wd.range_tiles > 1 ? ' · ' + wd.range_tiles + ' tiles' : '') + (wd.magazine ? ' · ' + wd.magazine + ' rounds' + (wd.ammo ? ' (' + wd.ammo + ')' : '') : ''),
          m ? 'Durability ' + d + ' / ' + m + (d <= 0 ? ' · BROKEN' : d <= m * 0.25 ? ' · worn' : '') : '', (st.mods || []).length ? 'Mods: ' + st.mods.map((x) => ITEM[x]?.name || x).join(', ') : '', wd.mod_slots && wd.mod_slots.length ? 'Mod slots: ' + wd.mod_slots.join(', ') : '',
          wd.grants ? wd.grants.name + ': ' + wd.grants.text : '', wd.requires ? 'Needs ' + Object.entries(wd.requires).map(([k, v]) => SK[k]?.name + ' ' + v).join(', ') : '',
          wd.weight_kg + ' kg · ' + Math.round((wd.price_credits || 0) * (RARITY[r]?.price || 1)) + ' credits'].filter(Boolean), lore: wd.lore || '' }; };
    const itemTip = (id, extra = {}) => { const it = ITEM[id]; if (!it) return null;
      return { title: it.name, sub: (it.slot ? it.slot.replace('_', ' ') : it.category || 'item'), img: artOf(id), glyph: glyphOf(id), lines: [it.text, it.weight_kg + ' kg' + (it.price_credits ? ' · ' + it.price_credits + ' credits' : '')].filter(Boolean), lore: '', ...extra }; };
    const tipHandlers = (key) => ({ hover: (e) => { const r = e.currentTarget.getBoundingClientRect(), x = r.right + 270 > window.innerWidth ? Math.max(8, r.left - 268) : r.right + 8;
      if (!this.state.tip || this.state.tip.key !== key) this.setState({ tip: { key, x, y: Math.min(r.top, window.innerHeight - 280) } }); }, leave: () => this.setState({ tip: null }) });
    const menuFor = (key) => ({ open: S.gearMenu === key, toggle: () => this.setState({ gearMenu: S.gearMenu === key ? null : key, tip: null }) });
    const pk = c ? packOf(c) : [];
    const cand = (pred, label, to) => pk.map((it, i) => ({ it, i })).filter(({ it }) => pred(it)).map(({ it, i }) => ({ key: to + i, label: label + ' ' + it.name, go: () => { act({ type: 'gear/equip', charId: c.id, idx: i, to }); this.setState({ gearMenu: null }); } }));
    const mainSide = c ? mainHandSide(c) : 'right';
    const handCard = (which) => {
      if (!c) return null;
      const isMain = which === 'main', id = isMain ? c.weapon : c.offHand?.id, st = isMain ? c.weaponState || {} : c.offHand || {};
      const key = 'hand-' + which; tips[key] = id ? (weaponTip(id, st) || itemTip(id)) : { title: 'Empty', sub: isMain ? 'main hand' : 'off hand', lines: [isMain ? 'Your main-hand weapon.' : 'Hold a one-handed weapon, a shield, a torch, a flare or a focus here.'], glyph: '·', img: '', lore: '' };
      const twoHanded = !isMain && WEAPON[c.weapon]?.hands === '2H';
      const acts = gearLocked ? [] : isMain ? cand((it) => it.kind === 'weapon' && it.weapon && WEAPON[it.weapon], 'Equip', 'main')
        : twoHanded ? [] : [...(c.offHand ? [{ key: 'off-x', label: 'Take off', go: () => { act({ type: 'gear/unequip', charId: c.id, slot: 'off' }); this.setState({ gearMenu: null }); } }] : []),
          ...cand((it) => (it.weapon && WEAPON[it.weapon]?.hands === '1H') || ITEM[it.item || it.id]?.slot === 'off_hand', 'Hold', 'off')];
      const r = st.rarity || 'standard';
      return { key, side: ((isMain ? mainSide : mainSide === 'right' ? 'left' : 'right') + ' hand').toUpperCase(), tag: isMain ? 'MAIN' : 'OFF', name: twoHanded ? 'Both hands: ' + (WEAPON[c.weapon]?.name || '') : id ? tips[key].title : 'Empty',
        img: id ? artOf(id) : '', hasImg: !!(id && artOf(id)), noImg: !(id && artOf(id)), glyph: twoHanded ? '═' : id ? glyphOf(id) : '·', marks: id ? marks(r) : '', rarity: id ? RW(r) : '',
        frameStyle: 'position: relative; display: grid; place-items: center; width: 100%; aspect-ratio: 1; border-radius: 10px; background: #0D1119; border: ' + (id ? (RARITY[r]?.marks ? 2 + RARITY[r].marks : 1) + 'px solid ' + (RARITY[r]?.marks ? '#E7EBF3' : '#3B475D') : '1px dashed #3B475D') + '; font-size: 40px; color: #5B6577; cursor: pointer',
        nameStyle: 'font-size: 13px; font-weight: 700; color: ' + (id || twoHanded ? '#E7EBF3' : '#5B6577'), ...tipHandlers(key), ...menuFor(key), acts, hasActs: acts.length > 0, noActs: !acts.length,
        noActText: gearLocked ? 'Change gear after the fight.' : twoHanded ? 'Your weapon needs both hands.' : 'Nothing in the pack fits here.' };
    };
    const hands = c ? (mainSide === 'right' ? [handCard('main'), handCard('off')] : [handCard('off'), handCard('main')]) : [];
    const bodySlots = SLOTS.filter(([id]) => !['main', 'off', 'pack'].includes(id)).map(([id, label]) => {
      const x = worn[id], wslot = SLOT_TO_WORN[id], wid = wslot && c?.worn?.[wslot], key = 'slot-' + id;
      tips[key] = wid ? itemTip(wid) : id === 'outer' && c && c.armourClass ? { title: x[0], sub: 'outer torso · Armour Class', glyph: '▣', img: '', lines: ['Armour ' + (ARMOUR[c.armourClass]?.value || 0) + ' against every hit.', 'Sets your Armour Class.'], lore: '' } : { title: 'Empty', sub: label.toLowerCase(), glyph: '·', img: '', lines: [id === 'veil' ? 'The Veil: a special equipment type; its rules aren\'t written yet.' : 'Wear a piece here from your backpack.'], lore: '' };
      const acts = gearLocked || !wslot ? [] : [...(wid ? [{ key: key + '-x', label: 'Take off', go: () => { act({ type: 'gear/unequip', charId: c.id, slot: wslot }); this.setState({ gearMenu: null }); } }] : []), ...cand((it) => ITEM[it.item || it.id]?.slot === wslot, 'Wear', 'worn')];
      return { key, label, name: x ? x[0] : '—', ...tipHandlers(key), ...menuFor(key), acts, hasActs: acts.length > 0, noActs: !acts.length, noActText: gearLocked ? 'Change gear after the fight.' : id === 'outer' ? 'Armour Class comes from your kit for now.' : 'Nothing in the pack fits here.',
        hover2: () => this.setState({ hotSlot: id }),
        style: 'display: grid; grid-template-columns: 78px minmax(0, 1fr); gap: 2px 8px; align-items: center; padding: 5px 6px; border-radius: 6px; font-size: 12px; cursor: pointer; width: 100%; text-align: left; color: inherit; font: inherit; border: 0; background: ' + (S.hotSlot === id || S.gearMenu === key ? '#1C2536' : 'transparent'),
        nameStyle: 'font-weight: ' + (x ? '600; color: #E7EBF3' : '400; color: #5B6577') };
    });
    // (backpack rows: hover for details, click for actions)
    const rigView = rig.map((r) => { const key = 'rig-' + r.key, it = r.src || {}, id = it.item || it.id;
      tips[key] = (it.weapon && it.kind === 'weapon' ? weaponTip(it.weapon, it) : null) || (ITEM[id] && !it.mags && !it.calibre ? itemTip(id) : null) || { title: r.name, sub: r.tag.toLowerCase(), glyph: it.mags ? '▮' : it.calibre ? '⁝' : '▪', img: '', lines: [r.note, r.kg].filter(Boolean), lore: '' };
      const acts = [...r.acts.map((a) => ({ ...a, go: () => { a.go(); this.setState({ gearMenu: null }); } })), ...((it.mags || it.calibre) && canLoad && !gearLocked ? [{ key: 'load', label: 'Load magazines', go: () => { act({ type: 'gear/load', charId: c.id }); this.setState({ gearMenu: null }); } }] : [])];
      return { ...r, ...tipHandlers(key), ...menuFor(key), acts, hasActs: acts.length > 0, noActs: !acts.length, noActText: gearLocked ? 'Change gear after the fight.' : 'Nothing to do with it here yet.',
        img: tips[key].img, hasImg: !!tips[key].img, noImg: !tips[key].img, glyph: tips[key].glyph,
        style: 'display: grid; grid-template-columns: 30px minmax(0, 1fr) auto; gap: 2px 8px; align-items: center; padding: 6px 8px; border-radius: 8px; cursor: pointer; font-size: 12px; background: ' + (S.gearMenu === key ? '#1C2536' : '#0D1119') + '; border: 1px solid #1C2536' }; });
    const TIP = S.tip && tips[S.tip.key];
    const tipCard = TIP ? { ...TIP, lines: TIP.lines.map((t, i) => ({ key: i, t })), hasImg: !!TIP.img, noImg: !TIP.img, hasLore: !!TIP.lore,
      style: 'position: fixed; z-index: 40; left: ' + S.tip.x + 'px; top: ' + S.tip.y + 'px; width: 260px; display: flex; flex-direction: column; gap: 6px; padding: 12px; border-radius: 12px; background: #10151F; border: 1px solid #3B475D; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6); pointer-events: none' } : null;

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
    const bio = c ? [['Origin', c.origin], ['Kit', kit], ['Gender', I.gender], ['Blood type', I.blood], ['Main hand', I.hand], ['Association', I.association], ['Favourite song', I.songTitle ? I.songTitle + (I.songArtist ? ' · ' + I.songArtist : '') : I.song], ['Last dream', I.dream], ['History', I.history]]
      .filter(([, v]) => v).map(([k, v]) => ({ k, v })) : [];
    const lvlUp = c && (c.unspent.skill + c.unspent.attr + c.unspent.core > 0 || (c.level >= 3 && !c.classId) || pendingPerkSteps(c).length > 0);
    const pc = c ? { name: c.name, img: c.portrait, line1: [I.association, c.origin].filter(Boolean).join(' · ') || c.origin,
      line2: 'Level ' + c.level + ' · ' + (c.classId ? CLASS[c.classId].name + ' ' + ['', 'I', 'II', 'III'][classRank(c)] : 'No class yet') + (c.dead ? ' · DEAD' : '') } : { name: 'Spectating', img: IMG['wick-welcome'], line1: 'You have no character in this session.', line2: '' };
    const myChars = mine.map((x) => ({ key: x.id, name: x.name, pick: () => this.setState({ sel: x.id }), pressed: x.id === (c && c.id) ? 'true' : 'false',
      style: 'min-height: 32px; padding: 0 10px; border-radius: 8px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; ' + (x.id === (c && c.id) ? 'border: 1px solid #E7EBF3; background: #1C2536; color: #E7EBF3' : 'border: 1px solid #232D3F; background: transparent; color: #A3AEC2') }));

    // ---------- the story stream ----------
    const st0 = startOf(g);
    // The zone's banner when the campaign has one (spec: Campaigns, art), else the campaign's card art.
    const zone0 = zoneOf(g), banner = zone0?.art?.banner;
    const heroImg = ART(banner) || IMG[st0.art] || ART(st0.art) || IMG['world-pilot'];
    const hero = { zoom: zoomer(this, ART_BIG(banner) || ART_BIG(st0.art) || heroImg, (zone0 ? zone0.name : st0.title) + (banner ? '' : ' · ' + st0.artNote), 'world'), img: heroImg, title: g.story.scene.title || st0.title, kicker: st0.kicker + (zone0 ? ' · ' + zone0.name.toUpperCase() : ''), imgStyle: 'width: 100%; height: 260px; object-fit: cover; object-position: ' + (banner ? 'center 45%' : st0.focus) + '; display: block' };
    const charOf = (id) => g.characters[id];
    // The Narrator's voice (spec: The Narrator's voice): a line waiting for its voice, and everything after it, stays hidden.
    const VS = voiceState(), heldAt = g.story.entries.findIndex((x) => VS.held.includes(x.id));
    const shown = heldAt >= 0 ? g.story.entries.slice(0, heldAt) : g.story.entries;
    const readFor = (e, voice) => ({ read: () => (VS.speaking === e.id ? stopVoice() : speak(e.id, e.text, voice)), readIcon: VS.speaking === e.id ? '■' : '🔊', readLabel: VS.speaking === e.id ? 'Stop reading' : 'Read aloud',
      readStyle: 'flex: none; min-height: 28px; min-width: 28px; padding: 0 8px; border-radius: 999px; border: 1px solid ' + (VS.speaking === e.id ? '#FFFFFF' : '#2E3A50') + '; background: transparent; color: ' + (VS.speaking === e.id ? '#FFFFFF' : '#A3AEC2') + '; font-family: inherit; font-size: 12px; cursor: pointer; align-self: flex-start' });
    const stream = [...shown.slice(-150).map((e) => {
      const base = { key: e.id, text: e.text, head: e.head || '', isScene: false, isNarration: false, isPlayer: false, isVoice: false, isCheck: false, isNote: false, isArt: false, isGathering: false, paras: [] };
      if (e.kind === 'scene') return { ...base, isScene: true, text: e.text.toUpperCase() };
      if (e.kind === 'art') return { ...base, isArt: true, img: ART(e.art), zoom: zoomer(this, ART_BIG(e.art), e.text, 'world') };
      if (e.kind === 'narration') {
        // Rerolls and edits (spec: Rerolls and edits): players suggest, the host starts a vote, everyone must agree.
        const V = g.votes || { turns: [], open: null }, canReroll = V.turns.includes(e.id) && !e.rerolled, busyVote = !!(V.open && V.open.status === 'open');
        const ask = (kind) => { const note = window.prompt(kind === 'reroll' ? 'What should the Narrator do differently? (optional)' : 'How should it be reworded? Only the words change, never what happened.', ''); if (note === null) return null; return note; };
        const undoText = () => { const i = g.story.entries.findIndex((x) => x.id === e.id), after = g.story.entries.slice(i + 1); const pl = after.filter((x) => x.kind === 'player').length, ck = after.filter((x) => x.kind === 'check').length, fights = after.filter((x) => x.kind === 'combat' && /^Combat: /.test(x.text)).map((x) => x.text.replace(/^Combat: /, ''));
          return [pl ? pl + (pl === 1 ? ' player action' : ' player actions') : '', ck ? ck + (ck === 1 ? ' roll' : ' rolls') : '', fights.length ? 'the fight ' + fights.join(', ') : ''].filter(Boolean).join(', ') || 'nothing after it'; };
        const voteActs = e.rerolled || !c ? [] : isHost
          ? [...(canReroll ? [{ key: 'r', label: '⟲ Vote to reroll', title: 'Everyone must agree. Undoes this turn and everything after it.', go: () => { if (busyVote) return toast('A vote is already under way.'); const n = ask('reroll'); if (n !== null) act({ type: 'vote/start', kind: 'reroll', entryId: e.id, note: n, undo: undoText() }); } }] : []),
             { key: 'e', label: '✎ Vote to reword', title: 'Everyone must agree. Only the words change.', go: () => { if (busyVote) return toast('A vote is already under way.'); const n = ask('edit'); if (n !== null) act({ type: 'vote/start', kind: 'edit', entryId: e.id, note: n }); } }]
          : [...(canReroll ? [{ key: 'r', label: '⟲ Suggest reroll', title: 'The host can put it to a vote.', go: () => { const n = ask('reroll'); if (n !== null) { act({ type: 'vote/suggest', kind: 'reroll', entryId: e.id, note: n }); toast('Suggested to the host.', true); } } }] : []),
             { key: 'e', label: '✎ Suggest rewording', title: 'The host can put it to a vote.', go: () => { const n = ask('edit'); if (n !== null) { act({ type: 'vote/suggest', kind: 'edit', entryId: e.id, note: n }); toast('Suggested to the host.', true); } } }];
        return { ...base, ...readFor(e), isNarration: true, paras: e.text.split(/\n\s*\n/).map((t) => ({ text: t.trim() })).filter((x) => x.text),
          wrapStyle: 'display: flex; flex-direction: column; gap: 12px' + (e.rerolled ? '; opacity: 0.45' : ''), pStyle: "margin: 0; font-family: 'Spectral', serif; font-size: 18px; line-height: 1.7; color: #DCE2EC" + (e.rerolled ? '; text-decoration: line-through' : ''),
          hasTag: !!(e.rerolled || e.original), tag: e.rerolled ? 'REROLLED BY VOTE' : '✎ REWORDED BY VOTE', tagStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.14em; color: #A3AEC2',
          voteActs, hasVoteActs: voteActs.length > 0 };
      }
      if (e.kind === 'player') {
        const p = playerOf(e.who), first = Object.values(g.characters).find((x) => x.owner === e.who);
        return { ...base, isPlayer: true, roll: !!e.roll, img: first ? first.portrait : IMG['wick-welcome'], nameStyle: 'color: ' + p.color + '; font-weight: 600',
          imgStyle: 'width: 40px; height: 40px; object-fit: cover; border-radius: 50%; background: #000; flex: none; border: 2px solid ' + p.color };
      }
      if (e.kind === 'voice' || e.kind === 'overreach') {
        const s = SK[e.skill] || D.skills[0], ink = ATTR[s.attr].ink, ch = charOf(e.charId);
        return { ...base, ...readFor(e, CORE_VOICE[SKILL[e.skill]?.core] || undefined), isVoice: true, img: s.img, zoom: zoomer(this, s.img, s.name, 'skill'), head: (mine.length > 1 && ch ? ch.name.toUpperCase() + ' · ' : '') + e.head, headStyle: 'font-size: 12px; font-weight: 700; letter-spacing: 0.16em; color: ' + ink,
          style: 'display: flex; gap: 14px; align-items: flex-start; padding: 14px 16px; border-radius: 12px; background: #10151F; border: 1px solid #232D3F; border-left: 3px solid ' + ink };
      }
      if (e.kind === 'check') return { ...base, isCheck: true, headStyle: 'font-weight: 700; letter-spacing: 0.06em; color: ' + (e.ok ? '#6FEA77' : '#A3AEC2') };
      return { ...base, isNote: true, noteStyle: 'margin: 0; font-size: 13px; line-height: 1.5; color: ' + (e.kind === 'xp' ? '#FFFFFF' : e.kind === 'combat' ? '#F65157' : '#A3AEC2') };
    }), ...(heldAt >= 0 ? [{ key: 'gathering', text: 'The Narrator gathers their voice…' + (VS.status === 'loading' && VS.progress < 100 ? ' (preparing the voice on this device, once: ' + VS.progress + '%)' : ''), isGathering: true, paras: [] }] : [])];
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
    const watchCk = !S.dice ? g.checks.find((k) => !k.done && charOf(k.charId) && charOf(k.charId).owner !== me && !(S.dismissed || {})['k' + k.id]) : null;
    const ck = S.dice ? g.checks.find((k) => k.id === S.dice) : watchCk;
    if (S.dice && (!g.checks.find((k) => k.id === S.dice) || g.checks.find((k) => k.id === S.dice).done)) queueMicrotask(() => this.setState({ dice: null }));
    const diceOwner = ck ? playerOf(charOf(ck.charId)?.owner) : null, watching = !!(ck && !S.dice);
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
        state: (() => { const done = spoke && chs.filter((x) => !x.dead).every((x) => (g.story.ended || {})[x.id] || apLeft(g, x) <= 0), apTxt = chs.filter((x) => !x.dead).map((x) => apLeft(g, x)).join('/') + ' AP';
          return g.story.await !== 'players' ? (spoke ? '✓ DONE' : 'WAITING') : done ? '✓ DONE' : (spoke ? 'SPOKE · ' : 'ACTING · ') + apTxt; })(),
        stateStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: ' + (spoke ? '#6FEA77' : now ? '#FFFFFF' : '#A3AEC2'), zoom: zoomer(this, chs[0]?.portrait, chs[0]?.name, 'portrait') }; }),
      { key: 'narrator', img: IMG['wick-narrator-placeholder'], name: 'Narrator', player: 'AI', playerStyle: 'font-size: 11px; letter-spacing: 0.12em; color: #A3AEC2', imgStyle: 'width: 36px; height: 36px; border-radius: 50%; object-fit: cover; background: #000; border: 2px solid #232D3F',
        state: busy ? 'THINKING…' : err ? 'STUCK' : 'AFTER ALL', stateStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: ' + (busy ? '#FFFFFF' : err ? '#F65157' : '#A3AEC2'), zoom: zoomer(this, IMG['wick-narrator-placeholder'], 'The Narrator', 'portrait') }];
    const iSpoke = g.story.spoken[me] != null;
    const cantSpeak = !c || c.dead || g.phase !== 'story' || g.story.await !== 'players' || iSpoke;
    const why = !c ? 'You have no character in this session.' : g.phase !== 'story' ? 'A fight is on: go to Combat.' : busy ? 'The Narrator is answering…' : err ? 'The Narrator is stuck; the host can retry.'
      : g.story.await === 'rolls' ? 'Waiting for the checks to be rolled.' : g.story.await === 'choices' ? 'Waiting for an Overreach choice.' : g.story.await === 'narrator' ? 'The Narrator is about to answer…'
      : c && (g.story.ended || {})[c.id] ? 'Turn ended. Waiting for the others.' : iSpoke ? 'You spoke. Use your ' + apLeft(g, c) + ' AP on the area map, or End turn.' : 'Your turn: ' + (c ? apLeft(g, c) : 0) + ' AP and one Say. Open the area map to act; End turn when done.';

    // ---------- the zone: the story's map (or the fight's), with grid references (spec: Grid references) ----------
    const cb = g.combat, inFight = g.phase === 'combat', map = inFight && cb ? cb.map : zoneMap(g);
    const pos = inFight ? {} : positionsOf({ ...g, story: { ...g.story, positions: { ...(g.story.positions || {}) } } });
    const seenNow = inFight && cb ? visibility(cb, 'pc').seen : null;
    const units = inFight ? cb.units.filter((u) => !(u.dead && u.side === 'foe') && (u.side === 'pc' || seenNow.has(u.id)))
      : Object.values(g.characters).filter((x) => !x.dead && pos[x.id]).map((x) => ({ id: 'pc-' + x.id, side: 'pc', charId: x.id, name: x.name, short: x.name.slice(0, 2).toUpperCase(), img: x.portrait,
        pos: pos[x.id], hp: x.hp, maxHp: maxHp(x), movement: movement(x), ap: 0, injuries: x.injuries || [], downed: false, dead: false }))
        .concat(npcsOf({ ...g, story: { ...g.story } }).map((n) => ({ id: n.id, side: 'foe', npc: n, name: n.name, short: n.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase(), img: n.portrait,
          pos: n.pos, hp: ENEMY[n.tier]?.hp || 30, maxHp: ENEMY[n.tier]?.hp || 30, analyzedBy: n.analyzed ? 'party' : undefined, injuries: [], downed: false, dead: false })));
    const tok = {}; units.forEach((u) => { tok[u.pos] = u; });
    const objs = (inFight && cb ? cb.objects : g.story.objects) || defaultObjects(map), objAt = {};
    objs.forEach((o) => { if (!objAt[o.pos] || kindOf(o).blocks_move) objAt[o.pos] = o; });
    const cov = {}; objs.forEach((o) => { const k = coverKind(o); if (k) cov[o.pos] = { kind: k }; });
    const solid = new Set(map.solid), diff = new Set([...map.difficult, ...objs.filter(isDifficult).map((o) => o.pos)]);
    const interesting = (o) => o && (o.approaches.length || ['poi', 'door', 'barricade', 'container', 'terminal', 'exit', 'trap', 'hole'].includes(o.kind));
    const mapArt = ART(zoneOf(g)?.art?.map);
    const cellBg = (k) => (mapArt
      ? tileBg(mapArt, k, map.w, map.h, solid.has(k) ? 'rgba(10, 13, 19, 0.55)' : diff.has(k) ? 'rgba(22, 28, 40, 0.3)' : 'rgba(10, 13, 19, 0.08)')
      : solid.has(k) ? '#1C2536' : cov[k] ? (cov[k].kind === 'full' ? '#6B5430' : '#4A3A20') : diff.has(k) ? '#232D3F' : '#0D1119');
    const mover = c && !c.dead && !inFight && g.phase === 'story' ? c : null;
    const W = S.wAct || 'move', TARGETED = ['shot', 'aimed', 'melee', 'analyze', 'stim'];
    // This round's paths, in each player's colour (spec: Overworld rounds): everyone sees where everyone went.
    const trailAt = {}; if (!inFight) for (const [cid, ks] of Object.entries(g.story.trail || {})) { const col = playerOf(charOf(cid)?.owner)?.color || '#FFFFFF'; ks.forEach((k) => { trailAt[k] = col; }); }
    const moveTo = (k) => () => { if (!mover) return toast(inFight ? 'A fight is on: move on the combat grid.' : 'You have no character to move.'); act({ type: 'story/move', charId: mover.id, to: k }); };
    const cellsFor = (labels, onClick) => {
      const out = [], lab = (key, text) => ({ key, isLabel: true, isTile: false, text, style: 'display: grid; place-items: center; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; color: #7F8BA1' });
      if (labels) { out.push(lab('h-', '')); for (let x = 0; x < map.w; x++) out.push(lab('h' + x, refOf(x + ',0').replace(/\d+$/, ''))); }
      for (let y = 0; y < map.h; y++) {
        if (labels) out.push(lab('r' + y, String(y + 1)));
        for (let x = 0; x < map.w; x++) { const k = x + ',' + y, u = tok[k], p = u && u.side === 'pc' ? playerOf(charOf(u.charId)?.owner) : null, ref = refOf(k), note = notesAt(map, k)[0] || '', o = objAt[k];
          const what = solid.has(k) ? 'blocked' : o && o.kind !== 'crate' && o.kind !== 'pillar' ? o.name + (o.hp != null ? ' (' + o.hp + '/' + o.max + ' HP)' : '') + (o.locked ? ', locked' : o.open ? ', open' : '') + (o.approaches.length ? ', ' + o.approaches.length + ' approaches' : '') : cov[k] ? cov[k].kind + ' cover' : diff.has(k) ? 'slow ground' : 'open';
          const spr = o ? spriteOf(g, o) : '';
          const glyph = o && !u && !spr && !(cov[k] && (o.kind === 'crate' || o.kind === 'pillar')) ? kindOf(o).glyph : '';
          out.push({ key: k, isLabel: false, isTile: true, has: !!u, glyph, hasGlyph: !!glyph, hasSprite: !!spr, sprite: spr, spriteStyle: o ? spriteStyle(o) : '', glyphStyle: 'position: absolute; inset: 0; display: grid; place-items: center; font-size: ' + (labels ? 18 : 9) + 'px; line-height: 1; color: ' + (o && (o.approaches.some((a) => !a.tries.length) || o.kind === 'poi') && !o.resolved ? '#FFFFFF' : o && (kindOf(o).hazard || o.kind === 'trap') ? '#F65157' : '#C9D3E3'),
            click: interesting(o) && labels && W === 'move' ? () => openObj(o) : onClick(k), hover: () => { if (this.state.hoverTile !== k) this.setState({ hoverTile: k }); },
            t: u ? tokenVals(u, { ref, ally: u.side === 'pc', player: p ? p.initials + ' · ' + p.name.toUpperCase() : u.npc ? u.npc.side.toUpperCase() + ' · ' + u.npc.tier.toUpperCase() : '', color: p ? p.color : u.npc && u.npc.side === 'neutral' ? '#A3AEC2' : '#F65157', inFight, right: x >= map.w / 2, up: y >= map.h / 2 }) : null,
            hasTrail: !!trailAt[k] && !u, trailStyle: trailAt[k] ? 'position: absolute; left: 50%; top: 50%; width: ' + (labels ? 10 : 5) + 'px; height: ' + (labels ? 10 : 5) + 'px; margin: -' + (labels ? 5 : 2.5) + 'px 0 0 -' + (labels ? 5 : 2.5) + 'px; border-radius: 50%; z-index: 2; pointer-events: none; background: ' + trailAt[k] + '; box-shadow: 0 0 0 2px rgba(5, 7, 11, 0.6)' : '',
            picked: S.wTarget && u && u.id === S.wTarget,
            label: ref + (u ? ': ' + u.name : '') + ' · ' + what + (note ? ' · ' + note : ''), title: u ? '' : ref + ' · ' + what + (note ? '\n' + note : ''),
            style: 'position: relative; display: block; aspect-ratio: 1; padding: 0; border: 0; border-radius: 1px; cursor: ' + (mover && !u && !solid.has(k) && !cov[k] ? 'pointer' : 'default') + '; background: ' + (u && !mapArt ? '#0D1119' : cellBg(k)) + ((S.wTarget && u && u.id === S.wTarget) || (S.wTarget && !u && o && S.wTarget === 'obj:' + o.id) ? '; outline: 2px solid #FFFFFF; outline-offset: -2px' : '') });
        }
      }
      return out;
    };
    // ---------- points of interest: the panel (like an event with choices) and what's nearby ----------
    const myPos = c ? pos[c.id] : null;
    const near = !inFight && myPos ? objs.filter((o) => !o.hidden && interesting(o) && Math.max(Math.abs(+o.pos.split(',')[0] - +myPos.split(',')[0]), Math.abs(+o.pos.split(',')[1] - +myPos.split(',')[1])) <= 1) : [];
    const nearby = near.map((o) => ({ key: o.id, label: kindOf(o).glyph + ' ' + o.name + ' · ' + refOf(o.pos) + (o.approaches.length ? ' · ' + o.approaches.length + ' approaches' : ''), open: () => openObj(o) }));
    // The shared spotlight (spec: Overworld rounds): a point of interest someone else opened shows for everyone, read-only,
    // with what they hover, unless this player closed it. Opening or hovering your own sends it to the party.
    const F = !inFight ? g.story.focus : null, fChar = F ? charOf(F.charId) : null, fMine = !!(fChar && fChar.owner === me);
    const spectating = !S.objPanel && !!(F && F.objId && !fMine && !(S.dismissed || {})['f' + F.seq]);
    const P0 = S.objPanel ? objs.find((o) => o.id === S.objPanel && !o.hidden) : spectating ? objs.find((o) => o.id === F.objId && !o.hidden) : null;
    if (S.objPanel && !P0) queueMicrotask(() => this.setState({ objPanel: null }));
    const openObj = (o) => { this.setState({ objPanel: o.id }); if (c && !inFight && g.phase === 'story') act({ type: 'story/focus', charId: c.id, objId: o.id }); };
    const fOwner = fChar ? playerOf(fChar.owner) : null;
    const isNear = !!(P0 && near.includes(P0));
    const myTurn = !!c && !c.dead && g.phase === 'story' && g.story.await === 'players' && !(g.story.ended || {})[c.id] && !g.checks.some((k) => !k.done && k.poi && charOf(k.charId)?.owner === me);
    const tnWord = (tn) => ({ 8: 'Easy', 12: 'Standard', 16: 'Hard', 20: 'Heroic' }[tn] || 'TN');
    const poiWhy = spectating ? '' : !c ? 'You have no character here.' : g.phase !== 'story' ? 'After the fight.' : !isNear ? 'Walk up to it first.' : g.story.await !== 'players' ? 'Wait for the round to open.' : (g.story.ended || {})[c.id] ? 'You ended your turn this round.' : apLeft(g, c) < 1 ? 'No AP left this round.' : '';
    const objPanel = P0 ? { hasPic: !!(P0.portrait || spriteOf(g, P0)), pic: ART(P0.portrait) || spriteOf(g, P0), zoomPic: zoomer(this, ART_BIG(P0.portrait) || spriteOf(g, P0), P0.name, 'portrait'), name: P0.name, kicker: kindOf(P0).name.toUpperCase() + ' · ' + refOf(P0.pos) + (P0.hp != null ? ' · ' + P0.hp + '/' + P0.max + ' HP' : '') + (P0.locked ? ' · LOCKED' : P0.open ? ' · OPEN' : '') + (P0.resolved ? ' · DEALT WITH' : ''),
      text: P0.text || kindOf(P0).text, rules: P0.text ? kindOf(P0).text : '', hasRules: !!P0.text, why: poiWhy, hasWhy: !!poiWhy,
      approaches: P0.approaches.map((a, i) => { const tried = c && a.tries.some((t) => t.charId === c.id && t.scene === g.story.scene.n), ink = a.skills[0] && SK[a.skills[0]] ? ATTR[SK[a.skills[0]].attr].ink : '#FFFFFF';
        const best = c ? (() => { const mods = a.skills.map((s) => mod(c.skills[s] || 0)), low = Math.min(...mods), li = mods.indexOf(low); return low + 2 * a.skills.filter((s, j) => j !== li && (c.skills[s] || 0) > 0).length; })() : 0;
        return { key: i, label: a.label, stakes: a.stakes, skills: a.skills.map((s) => ({ key: s, name: SK[s] ? SK[s].name : s, style: 'padding: 1px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; border: 1px solid ' + (SK[s] ? ATTR[SK[s].attr].ink : '#A3AEC2') + '; color: ' + (SK[s] ? ATTR[SK[s].attr].ink : '#A3AEC2') })),
          tn: tnWord(a.tn).toUpperCase() + ' ' + a.tn + (c ? ' · YOU ROLL d20 ' + fmt(best) : '') + (a.success ? ' · SUCCESS: ' + ({ remove: 'CLEARS IT', open: 'OPENS IT', reveal: 'REVEALS', disarm: 'DISARMS' }[a.success]) : ''),
          tries: a.tries.map((t, j) => ({ key: j, text: (t.ok ? '✓ ' : '✕ ') + t.name + ' · ' + t.total, style: 'font-size: 11px; font-weight: 700; color: ' + (t.ok ? '#6FEA77' : '#A3AEC2') })), hasTries: a.tries.length > 0,
          cant: spectating || !myTurn || !isNear || !!tried || !!P0.resolved || apLeft(g, c) < 2, label2: tried ? 'Tried this scene' : 'Try this · 2 AP',
          hover: () => { if (!spectating && c && F && fMine && F.hover !== i) act({ type: 'story/focus', charId: c.id, objId: P0.id, hover: i }); },
          go: () => { act({ type: 'poi/try', charId: c.id, objId: P0.id, idx: i }); this.setState({ objPanel: null }); },
          style: 'display: flex; flex-direction: column; gap: 6px; padding: 12px; border-radius: 10px; background: ' + (F && F.objId === P0.id && F.hover === i ? '#1C2536' : '#0D1119') + '; border: 1px solid ' + (F && F.objId === P0.id && F.hover === i ? (fOwner?.color || '#FFFFFF') : '#232D3F') + '; border-left: 3px solid ' + ink }; }),
      noApproaches: !P0.approaches.length, cantExamine: spectating || !(myTurn && isNear) || apLeft(g, c) < 1,
      spectating, turnBanner: spectating && fChar ? fChar.name.toUpperCase() + '\'S TURN' : '', turnSub: spectating && fOwner ? fOwner.name + ' is looking at this. Close it to wait for the story to tell you what they do.' : '',
      turnBannerStyle: 'padding: 14px 18px; border-radius: 12px; text-align: center; font-size: 30px; font-weight: 700; letter-spacing: 0.16em; color: #0A0D13; background: ' + (fOwner?.color || '#FFFFFF'),
      examine: () => { act({ type: 'poi/examine', charId: c.id, objId: P0.id }); this.setState({ objPanel: null }); },
      isExit: !!P0.to, cantTravel: spectating || !(myTurn && isNear) || apLeft(g, c) < 1, travel: () => { act({ type: 'poi/travel', charId: c.id, objId: P0.id }); this.setState({ objPanel: null }); },
      isDoor: !!kindOf(P0).door, doorLabel: P0.open ? 'Close it' : 'Open it', cantDoor: spectating || !isNear || !!P0.locked || g.phase !== 'story' || !myTurn, door: () => act({ type: 'story/door', charId: c.id, objId: P0.id }),
      canWalk: !spectating && !!mover && !isNear, walk: () => { const [ox, oy] = P0.pos.split(',').map(Number), taken = new Set(Object.values(pos)); let best = null, bd = 1e9;
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const k = (ox + dx) + ',' + (oy + dy), d = myPos ? Math.abs(ox + dx - +myPos.split(',')[0]) + Math.abs(oy + dy - +myPos.split(',')[1]) : 0;
          if ((dx || dy || !kindOf(P0).blocks_move) && ox + dx >= 0 && oy + dy >= 0 && ox + dx < map.w && oy + dy < map.h && !solid.has(k) && !objs.some((o) => o.pos === k && blocksMove(o)) && !taken.has(k) && d < bd) { bd = d; best = k; } }
        if (best) act({ type: 'story/move', charId: mover.id, to: best }); else toast('No free tile next to it.'); },
      close: () => { if (spectating) return this.setState({ dismissed: { ...(S.dismissed || {}), ['f' + F.seq]: true } }); this.setState({ objPanel: null }); if (fMine) act({ type: 'story/unfocus' }); } } : null;
    const mini = cellsFor(false, () => () => this.setState({ area: true }));
    const worldClick = (k) => () => {
      if (!mover) return toast(inFight ? 'A fight is on: act on the combat grid.' : 'You have no character to act with.');
      const u = tok[k];
      if (TARGETED.includes(W)) {
        // Anyone and anything is a target (spec: Anyone is a target): people, allies, points of interest, objects.
        const attacking = ['shot', 'aimed', 'melee'].includes(W), o = objAt[k];
        if (W === 'stim') { if (!u || u.side !== 'pc') return toast('Click an ally.'); return this.setState({ wTarget: u.id }); }
        if (u && u.charId === mover.id) return toast('Pick someone else.');
        if (W === 'analyze') { if (!u || u.side !== 'foe') return toast('Click a person or enemy on the map.'); return this.setState({ wTarget: u.id }); }
        if (attacking && u) return this.setState({ wTarget: u.id });
        if (attacking && o && !o.hidden) { if (o.dead) return toast(o.name + ' is dead.'); return this.setState({ wTarget: 'obj:' + o.id }); }
        return toast('Click a person, an ally or an object.');
      }
      if (['move', 'sprint', 'sneak'].includes(W)) act({ type: 'world/act', charId: mover.id, act: 'move', to: k, how: W });
    };
    const areaCells = cellsFor(true, worldClick);
    // ---------- buffs and debuffs (the Status tab) ----------
    const fxList = (() => {
      if (!c) return [];
      const out = [], add = (name, text, bad) => out.push({ key: name + out.length, name, text, mark: bad ? '▼' : '▲',
        style: 'display: flex; flex-direction: column; gap: 2px; padding: 6px 8px; border-radius: 8px; border: 1px solid ' + (bad ? '#F65157' : '#2F6B3A') + '; background: ' + (bad ? 'rgba(246, 81, 87, 0.08)' : 'rgba(111, 234, 119, 0.06)'),
        headStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: ' + (bad ? '#F65157' : '#6FEA77') });
      const cu = inFight && cb ? cb.units.find((u) => u.charId === c.id) : null;
      if (cu) {
        effectsOf(cu).forEach(([n, t]) => add(n, t, !/WEAK POINT/.test(n)));
        if (cu.prone) add('PRONE', 'Harder to hit from range, easier up close; standing up costs 1 AP.', true);
        if (cu.braced) add('BRACED', 'Weapon set: steadier fire until you move.', false);
        if (cu.overwatch) add('OVERWATCH', 'Holding a shot for the first enemy that moves in sight.', false);
      } else {
        if (c.hp <= 0 && !c.dead) add('DOWNED', 'Can\'t act until an ally\'s stim or the Narrator gets you up.' + (c.downedFails ? ' Death saves failed: ' + c.downedFails + ' / 3.' : ''), true);
        (c.injuries || []).forEach((i) => add(((i.side ? i.side + ' ' : '') + i.loc).toUpperCase() + ' INJURED', injuryText[i.loc] || 'Injured.', true));
        if (ow > 0) add('OVERBURDENED', ow + ' kg over your carry limit: −' + Math.ceil(ow / 5) + ' Movement and no Sprint until you drop something.', true);
      }
      if ((g.story.sneak || {})[c.id] && !inFight) add((g.story.hidden || {})[c.id] ? 'HIDDEN' : 'SNEAKING · SEEN', (g.story.hidden || {})[c.id] ? 'Sneaking and unseen: an attack from here is an ambush.' : 'Sneaking, but a hostile has seen you. Move normally and sneak again to hide.', !(g.story.hidden || {})[c.id]);
      const ss = songStateOf(g, c), mt = musicTraitOf(c);
      if (ss === 'on') add('SONG · ' + mt.name.toUpperCase(), String((mt.upsides || [])[0] || '+1 while your song plays.'), false);
      if (ss === 'off') add('SILENCE · ' + mt.name.toUpperCase(), String((mt.downsides || [])[0] || '−1: silent too long.'), true);
      const GEAR_FX = { dark_sight: ['NIGHT SIGHT', 'Darkness doesn\'t halve your sight.'], light: ['LIGHT', 'You light the tiles around you.'], armour_bonus: ['ARMOUR', '+{v} armour against every hit.'], defense_bonus: ['GUARD', '+{v} Defense.'],
        movement_bonus: ['QUICK', '+{v} Movement.'], carry_bonus: ['PACK', '+{v} kg carry.'], hazard_immune: ['SEALED', 'Immune to {h} hazards.'], ignore_difficult: ['SURE-FOOTED', 'Rough ground costs no extra.'], unarmed_damage_bonus: ['HEAVY HANDS', '+{v} unarmed damage.'] };
      for (const e of gearEffects(c)) { const d = GEAR_FX[e.op]; if (d) add(d[0], d[1].replace('{v}', e.value).replace('{h}', e.hazard || ''), false); }
      return out;
    })();
    // The overworld action panel (spec: Overworld rounds): the combat actions, the same AP, on the story's map.
    const wW = c ? WEAPON[c.weapon] : null, wMelee = wW ? isMelee(wW) : false, apNow = c ? apLeft(g, c) : 0, mv = c ? movement(c) : 1;
    const sneaking = !!(c && (g.story.sneak || {})[c.id]), hiddenNow = sneaking && !!(g.story.hidden || {})[c.id];
    const tgtObj = S.wTarget && S.wTarget.startsWith('obj:') ? objs.find((o) => o.id === S.wTarget.slice(4)) : null;
    const tgt = S.wTarget ? (tgtObj ? { id: S.wTarget, name: tgtObj.name, obj: tgtObj, side: 'obj', person: isPersonObj(g, tgtObj) } : units.find((u) => u.id === S.wTarget)) : null;
    const W_ITEMS = [
      ['MOVEMENT', [['move', 'Move', '1 AP / ' + mv + (mv === 1 ? ' tile' : ' tiles')], ['sprint', 'Sprint', '2 AP · ' + Math.floor(3 * mv) + ' tiles'], ['sneak', 'Sneak', '+1 AP a tile']]],
      ['ATTACK & DEFEND', [...(wW && !wMelee ? [['shot', 'Shot', attackApCost(wW, 'shot') + ' AP'], ['aimed', 'Aimed shot', attackApCost(wW, 'aimed') + ' AP']] : []), ['melee', wMelee ? 'Strike' : 'Melee (fists)', (wW && wMelee ? attackApCost(wW, 'melee') : 2) + ' AP'], ['analyze', 'Analyze', '2 AP']]],
      ['UTILITY', [['reload', 'Reload', '2 AP'], ['load', 'Load a magazine', 'AP by rounds'], ['clear', 'Clear a jam', '2 AP'], ['repair', 'Field Repair', '2 AP'], ['stim', 'Stim an ally', '1–2 AP'], ['prone', 'Drop prone / stand', '1 AP']]],
    ];
    const canAct = !!mover && mover.hp > 0 && g.story.await === 'players' && !(g.story.ended || {})[c.id];
    const wGroups = W_ITEMS.map(([name, items]) => ({ name, items: items.map(([id, label, cost]) => ({ key: id, name: label, cost, locked: !canAct, pressed: W === id ? 'true' : 'false',
      pick: () => this.setState({ wAct: id, wTarget: null }),
      style: 'display: flex; justify-content: space-between; align-items: center; gap: 8px; min-height: 36px; padding: 0 10px; border-radius: 8px; font-family: inherit; font-size: 13px; cursor: pointer; color: #E7EBF3; ' + (W === id ? 'border: 1px solid #E7EBF3; background: #1C2536' : 'border: 1px solid #232D3F; background: #10151F') })) }));
    const isAttack = ['shot', 'aimed', 'melee'].includes(W), instant = ['reload', 'load', 'clear', 'repair', 'prone'].includes(W);
    const wHint = !mover ? 'You have no character to act with.' : mover.hp <= 0 ? mover.name + ' is Downed: an ally\'s stim, or the Narrator, gets them up. End turn when ready.' : !canAct ? (g.story.await !== 'players' ? 'Wait for the round to open.' : 'Your turn is over this round.')
      : ['move', 'sprint', 'sneak'].includes(W) ? 'Click an open tile.' + (W === 'sneak' ? ' Sneaking hides you until a hostile notices you (Ingenuity to stay hidden).' : '')
      : TARGETED.includes(W) ? (tgt ? (W === 'stim' ? 'Stim ' + tgt.name + '.' : W === 'analyze' ? 'Read ' + tgt.name + ': its HP and armour, for everyone.' : (tgt.obj ? 'Attack ' + (tgt.person ? tgt.name + ': a person; this starts a fight.' : 'the ' + tgt.name.toLowerCase() + (tgt.obj.hp != null ? ' (' + tgt.obj.hp + ' HP).' : ': the Narrator rules what happens.')) : tgt.side === 'pc' ? 'FRIENDLY FIRE: you are attacking ' + tgt.name + '. It resolves on the map; no fight starts. Confirm if you mean it.' : 'Attack ' + tgt.name + ': this starts a fight. ' + (hiddenNow ? 'You are hidden: an ambush, your turn first' + ' (from its front: Ingenuity first).' : 'You are seen: you act from round 2.'))) : W === 'stim' ? 'Click an adjacent ally.' : 'Click a person or enemy on the map.')
      : 'Confirm to ' + ({ reload: 'reload', load: 'load loose rounds into a magazine', clear: 'clear a jam', repair: 'repair your weapon', prone: (c && c.prone ? 'stand up' : 'drop prone') }[W]) + '.';
    const wConfirm = () => { if (!c) return; if (TARGETED.includes(W)) { if (!tgt) return; const fight = isAttack && tgt.side !== 'pc' && (!tgt.obj || tgt.person);
        act({ type: 'world/act', charId: c.id, act: isAttack ? 'attack' : W, mode: isAttack ? W : undefined, ...(tgt.obj ? { objId: tgt.obj.id } : { targetId: tgt.npc ? tgt.id : tgt.charId }) }); this.setState({ wTarget: null, ...(fight ? { area: false } : {}) }); if (fight && getState().game.phase === 'combat') go('combat'); return; } if (instant) act({ type: 'world/act', charId: c.id, act: W }); };
    const regions = [];
    const u = g.narrator.usage, host = playerOf(g.hostId);

    return {
      ...epccgVals(this), ...lightboxVals(this), code: g.code, costText: (u.calls ? '$' + u.costUsd.toFixed(2) + ' · ' + u.calls + ' Narrator turns' : 'no Narrator turns yet'),
      toRoom: () => go('room'), isHost, save: () => saveNow(), saveLabel: st.savedAt && Date.now() - st.savedAt < 4000 ? 'Saved ✓' : 'Save', toCombat: () => { if (g.combat) go('combat'); }, noCombat: !g.combat,
      narrChip: 'AI NARRATOR · ' + (busy ? 'THINKING…' : err ? 'STUCK' : isHost ? 'YOUR KEY' : host.name.toUpperCase() + '’S KEY'),
      narrChipStyle: 'padding: 6px 12px; border-radius: 999px; border: 1px solid ' + (err ? '#F65157' : '#232D3F') + '; font-size: 12px; color: ' + (err ? '#F65157' : busy ? '#FFFFFF' : '#A3AEC2'),
      narrError: !!err, narrErrorText: (err || '') + (isHost ? '' : ' Ask ' + host.name + ' to retry.'), retry: () => (isHost ? retryNarrator() : toast('Only the host can retry the Narrator.')), retryLabel: isHost ? 'Retry' : 'Host retries',
      thinking: busy, thinkingText: 'The Narrator is writing…', narratorImg: IMG['wick-narrator-placeholder'],
      echoPips, echo, pc, multi: mine.length > 1, myChars, bars, tabs, coreTabs, sheetSkills, tabSkills: S.tab === 'skills', tabStatus: S.tab === 'status', tabPerks: S.tab === 'perks', tabGear: S.tab === 'gear', tabBio: S.tab === 'bio',
      zoomPc: () => this.setState({ card: true }), cardOpen: !!S.card && !!c, closeCard: () => this.setState({ card: false }), zoomPcBig: zoomer(this, pc.img, pc.name, 'portrait'),
      fx: fxList, noFx: !fxList.length, canLevel: !!lvlUp, toLevelUp: () => go('levelup', { levelupChar: c.id }), levelLabel: c && c.level >= 3 && !c.classId ? '★ Earn your class' : 'Level up · spend points',
      status, rep, statusFig, injuries, noInjuries: !injuries.length, hpLine: c ? c.hp + ' / ' + hpMax + ' HP' + (c.dead ? ' · DEAD' : '') : '', traits, noTraits: !traits.length, perks, noPerks: !perks.length, mp, hasMp: !!top, gear, gearFig, slots, rig, hands, bodySlots, rigView, tipOpen: !!tipCard, tipCard: tipCard || { lines: [] }, noRig: !rig.length, backpackImg: '',
      canLoad, cantLoad: !canLoad || g.phase === 'combat', loadMags: () => act({ type: 'gear/load', charId: c.id }),
      load: c ? 'Carrying ' + KG.total + ' kg of ' + lim + ' kg' + (over ? ' · OVER THE LIMIT' : '') + ' (weapon ' + kg(KG.weapon) + ', armour ' + kg(KG.armour) + ', pack ' + kg(KG.pack) + ')' : '', loadStyle: 'font-size: 12px; color: ' + (over ? '#F65157' : '#A3AEC2'), eoe: { locked: true, why: 'Cracking needs Mastery 2 in Brain Power with an Evoker, or Will Power with an Emanator.' }, mastery, noMastery: !mastery.length, bio,
      hero, stream, pushes,
      hasChecks: actions.length > 0, actions,
      dice: !!ck, roll, closeDice: () => { if (watching) return this.setState({ dismissed: { ...(S.dismissed || {}), ['k' + ck.id]: true } }); if (ck && ck.roll && !ck.done) act({ type: 'check/accept', checkId: ck.id }); this.setState({ dice: null }); },
      watching, canThrow: !!ck && !rolled && !watching, handText: watching ? 'In ' + (charOf(ck.charId)?.name || 'their') + '\'s hand' : 'In your hand', closeLabel: watching ? 'Close' : 'Done',
      diceBanner: watching ? (charOf(ck.charId)?.name || '').toUpperCase() + '\'S ROLL' : '', diceBannerStyle: 'padding: 12px 18px; border-radius: 12px; text-align: center; font-size: 30px; font-weight: 700; letter-spacing: 0.16em; color: #0A0D13; background: ' + (diceOwner?.color || '#FFFFFF'),
      watchClose: () => this.setState({ dismissed: { ...(S.dismissed || {}), ['k' + (ck ? ck.id : '')]: true } }),
      waiting: !!ck && !rolled, rolled, rolledA: rolled && !ck.roll.rerolled, rolledB: rolled && ck.roll.rerolled,
      throwDie: () => act({ type: 'check/roll', checkId: ck.id }), reroll: () => act({ type: 'check/reroll', checkId: ck.id }),
      noReroll: watching || !ck || !ck.roll || ck.roll.rerolled || (charOf(ck.charId)?.echo || 0) < 1,
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
      pass: () => act({ type: 'story/pass' }),
      endTurn: () => { if (c) act({ type: 'world/act', charId: c.id, act: 'end' }); this.setState({ area: false, wTarget: null }); },
      cantEnd: !c || c.dead || g.phase !== 'story' || g.story.await !== 'players' || !!(g.story.ended || {})[c.id],
      apText: c && g.phase === 'story' ? 'AP ' + apLeft(g, c) + ' / ' + ROUND_AP : '',
      skipRest: () => waitingOn.forEach((p) => act({ type: 'story/skip', playerId: p.id })), cantSkip: !isHost || g.story.await !== 'players' || !waitingOn.length,
      pickRoll: S.pickRoll, togglePick: () => this.setState({ pickRoll: !S.pickRoll }),
      zoneLabel: 'ZONE · ' + map.name.toUpperCase(), zoneAria: inFight ? 'Open the combat zone' : 'Combat zone',
      zoneStyle: 'display: block; width: 100%; box-sizing: border-box; padding: 6px; border-radius: 10px; background: #05070B; border: 1px solid ' + (inFight ? '#F65157' : '#232D3F'),
      miniGrid: 'display: grid; grid-template-columns: repeat(' + map.w + ', minmax(0, 1fr)); gap: 1px',
      objPanelOpen: !!objPanel, objPanel: objPanel || { approaches: [] }, nearby, hasNearby: nearby.length > 0,
      wGroups, wHint, wHasConfirm: canAct && (instant || (TARGETED.includes(W) && !!tgt)), wConfirm, wConfirmLabel: isAttack ? (tgt && tgt.side === 'pc' ? 'Attack ' + tgt.name + ' (friendly fire)' : tgt && tgt.obj && !tgt.person ? 'Attack it' : 'Attack · starts the fight') : 'Confirm',
      wHead: c ? c.name.toUpperCase() + ' · AP ' + apNow + ' / ' + ROUND_AP : '', wStatus: sneaking ? (hiddenNow ? 'Sneaking · hidden' : 'Sneaking · seen') : 'In the open',
      wStatusStyle: 'font-size: 12px; font-weight: 700; letter-spacing: 0.1em; color: ' + (hiddenNow ? '#6FEA77' : sneaking ? '#F65157' : '#A3AEC2'),
      wPips: Array.from({ length: ROUND_AP }, (_, i) => ({ key: i, style: 'flex: 1; height: 8px; border-radius: 3px; background: ' + (i < apNow ? '#FFFFFF' : '#232D3F') })),
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
