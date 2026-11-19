// Shared screen helpers: the prototypes' D data, the EPCCG "?" pop-up, the lightbox and the Mastered card,
// ported from design/canvas-build/{epccg,lightbox}.logic.js. Screens import what they need.
import PD from '../game/protodata.json';
import ASSETS from '../game/assets.json';
import epTpl from '../templates/epccg.template.html?raw';
import lbTpl from '../templates/lightbox.template.html?raw';
import shellTpl from '../templates/shell.template.html?raw';
import mastTpl from '../templates/mastered.template.html?raw';
import { bigPortrait } from '../game/charfile';
import { reducedMotion } from '../game/sfx';
import { checkModOf, SKILL as ENGINE_SKILL, attrCapAt, callOfSkill, SAVE_SKILL_OF, CRIT_PER_PERCEPTION, healthView, shieldsView, CALL_RULES, callRangeAt, calls as CALLS_NS, doorForkView, doorFeedView, ENGINE_DEEDS, PERKS as ENGINE_PERKS, ladderCaps } from '@engine';
import { forkIconOf } from '../game/forkIcon';
import { foldVals } from '../game/fold';
import { shieldBlock } from '../game/shieldLook';
import { kitSprite } from '../game/kitMap';
import { figmentFaceOf } from '../game/figmentIcons';
import { bigOf } from '../game/doorArt';
import { fmtNum } from '../game/numbers'; // rules 1.36: HP and damage readouts through the one formatter

export const D = PD;
export const ATTR = {}; D.attrs.forEach((a) => { ATTR[a.id] = a; });
export const SK = {}; D.skills.forEach((s) => { SK[s.id] = s; });
export const mod = (p) => (p <= 0 ? -2 : p - 1);
/** A skill's modifier on a CHECK, as the engine rolls it (rules 1.13: a gamma skill counts its full points; the slot is
 * read from the engine's data, never from the screen data). Saves, attacks and Initiative keep mod(). */
export const checkMod = (skillId, p) => checkModOf(skillId, p || 0);
/** What one more point of an attribute gives, in the game's numbers (creation, level up, the attribute page). */
export const ATTR_GIVES = {
  endurance: '+15 max HP · +10% to ignore an injury', strength: '+10% physical damage · +5 kg carried', agility: '+0.5 tile of movement an AP · +1 Initiative',
  perception: '+2 tiles of vision · +' + Math.round(CRIT_PER_PERCEPTION * 100) + '% critical damage · −10% critical damage taken', intelligence: '+10% Sigil power · +1 Line length every 2 points', expression: '+10% elemental damage · glyphs 0.1 AP cheaper',
  insight: '+10% healing given · −5% Soul magic MP cost · +25 max MP', determination: '+5% Soul power · +75 max MP · +10% mana syphoned', virtue: 'Hymns return sooner', // rules 1.24: Max MP is Determination's and Insight's
};
/** A skill's place under its attribute, in words: the first is how you fight, the second how you survive, the third how
 *  you talk and notice (the third rolls checks one better than the others, which the roll shown already counts). */
export const SLOT_WORD = { alpha: ['FIGHT', 'How you fight'], beta: ['SURVIVE', 'How you survive'], gamma: ['TALK · NOTICE', 'How you talk and notice · +1 on checks'] };
export const SLOT_ORDER = { alpha: 0, beta: 1, gamma: 2 };
// ---------- the skill road map (rules 1.54 item 4119; ui-screens "Skill texts on the three skill screens") ----------
// A skill's gains are rows tied to points (skills.json per_point.rows, numbers already filled by the engine's data
// load). ONE helper places them on the points 1 to 10 for all three screens (creation, the "?" pop-up, level up):
// `each` is the head line ("Every point: ..."), `every 2` lands on 2, 4, 6, 8, 10, `every 3` on 3, 6, 9, `from n`,
// `at n` and `each from n` once on n. The steps also carry what the skill's own unlocks put there: a named unlock (one
// with a category), a perk step (mastery 1 to 4) with the skill's two perks, the Mastered perk (mastery 5).
const AT = /^(?:(each)|every (\d+)|(each from|from|at) (\d+))$/;
/** The points a row lands on, out of 1..top (an `each` row lands on none: it is the head line). */
export const rowPoints = (at, top = 10) => {
  const m = AT.exec(String(at || '')); if (!m || m[1]) return [];
  if (m[2]) return Array.from({ length: top }, (_, i) => i + 1).filter((n) => n % Number(m[2]) === 0);
  const n = Number(m[4]); return n >= 1 && n <= top ? [n] : [];
};
const rowsOf = (id) => (ENGINE_SKILL[id] && ENGINE_SKILL[id].per_point && ENGINE_SKILL[id].per_point.rows) || [];
const fromOf = (at) => { const m = AT.exec(String(at || '')); return m && m[3] === 'each from' ? Number(m[4]) : 0; };
/** A beta skill's first row is its door line (what it multiplies on its attribute's alpha door): the page shows it
 *  under "Feeds <door>", apart from what every point gives (web test: every beta's first row reads its feed number). */
const feedRowIdx = (id) => (ENGINE_SKILL[id] && ENGINE_SKILL[id].feed ? 0 : -1);
/** The alpha door a beta skill multiplies (its attribute's alpha skill), or null. */
export const doorOfBeta = (id) => { const k = ENGINE_SKILL[id]; if (!k || !k.feed) return null; const a = Object.values(ENGINE_SKILL).find((x) => x.attribute === k.attribute && x.slot === 'alpha'); return a ? a.id : null; };
/** The skill's road map, the ONE source of the ladder (the "?" page's rows, the level-up row's next line, creation's
 *  line): { head: [texts every point gives], feed: the beta's door line or '', top, steps: [{ n, lines: [{ key, kind,
 *  text, at, tip }], step: 'M1'..'M4' | 'mastered' | '', perks: [{ id, name, icon }] }] }. A level's lines are its
 *  per-point gains first (kind 'each': an `each` row on every level, an `each from n` row from n on), then its own:
 *  the rows that land on it ('row'), its Call's step ('call', gamma skills), its unlock ('unlock': the name on the face,
 *  its player line in `tip`), its fork ('fork'), its perk step ('perk') or Mastered perk ('mastered'). Points, perks and
 *  names all come from the data; a fork step's options from the engine's doorForkView (no character: every option).
 *  A capped per-point row (its `grows`, read by the engine's ladderCaps for `who`, or a blank character) is on the levels
 *  where it still adds, and the last of them says it is the most. */
export function roadMap(id, who) {
  const k = ENGINE_SKILL[id] || {}, un = k.unlocks || {}, ep = (SK[id] && SK[id].ep) || {}, rows = rowsOf(id), fi = feedRowIdx(id);
  const top = Math.max(1, ...Object.keys(un).map(Number).filter((n) => n > 0));
  const isEach = (r) => r.at === 'each' || fromOf(r.at) > 0;
  const head = rows.filter((r, j) => j !== fi && isEach(r)).map((r) => (fromOf(r.at) > 1 ? r.text + ' (from ' + fromOf(r.at) + ')' : r.text));
  const forks = (() => { try { return doorForkView(null, id); } catch { return null; } })();
  const cb = callBlock(id, null), perkNames = (ep.perks || []).map((p) => p.name).join(' or ');
  const perkTip = (ps) => ps.map((p) => p.name + ': ' + (p.t1 || p.text || '')).join(' / ');
  let firstPerk = true;
  const caps = (() => { try { return ladderCaps(id, who || null); } catch { return {}; } })();
  const steps = Array.from({ length: top }, (_, i) => {
    const n = i + 1, lines = [];
    rows.forEach((r, j) => { if (j !== fi && isEach(r) && n >= Math.max(1, fromOf(r.at)) && !(j in caps && n > caps[j])) lines.push({ key: 'e' + j, kind: 'each', at: r.at, text: r.text + (j in caps && n === caps[j] ? ' (max)' : ''), tip: '' }); });
    rows.forEach((r, j) => { if (j !== fi && !isEach(r) && rowPoints(r.at, top).includes(n)) lines.push({ key: 'r' + j, kind: 'row', at: r.at, text: r.text, tip: '' }); });
    const cs = cb ? cb.ladder.find((x) => x.n === n) : null;
    if (cs) lines.push({ key: 'c', kind: 'call', at: 'at ' + n, text: cb.name + ': ' + cs.what.charAt(0).toLowerCase() + cs.what.slice(1), tip: '' });
    const u = un[n], m = u ? Number(u.mastery) || 0 : 0;
    const fs = u && u.category === 'Fork' && forks ? forks.steps.find((x) => x.at === n) : null;
    if (fs) lines.push({ key: 'u', kind: 'fork', at: 'at ' + n, text: 'Fork: ' + fs.options.map((o) => o.name).join(' or ') + (fs.offered ? '' : ' · sealed'),
      tip: fs.options.filter((o) => o.text).map((o) => o.name + ': ' + o.text).join(' / ') });
    else if (u && u.category === 'Fork' && u.name) lines.push({ key: 'u', kind: 'fork', at: 'at ' + n, text: 'Fork: ' + u.name, tip: '' });
    // a named unlock: its name on the face, its player line in the hover (an unlock named only for its mastery step, or
    // with no name of its own, shows its player line on the face, and has no hover)
    else if (u && (u.category || u.player) && u.name && (u.player || !lines.some((l) => l.text.includes(u.name)))) {
      const bare = /^Mastery \d+$|^Mastered$/.test(u.name) || !u.category;
      if (u.player && bare) lines.push({ key: 'u', kind: 'unlock', at: 'at ' + n, text: u.player, tip: '' });
      else lines.push({ key: 'u', kind: 'unlock', at: 'at ' + n, text: u.player ? u.name : 'Unlocks ' + u.name, tip: u.player ? u.name + ': ' + u.player : '' });
    }
    const step = m >= 1 && m <= 4 ? 'M' + m : m === 5 ? 'mastered' : '';
    const perks = step === 'mastered' ? (ep.mastered ? [ep.mastered] : []) : step ? ep.perks || [] : [];
    // the first perk step names the two perks; a later one says "Perk" (the names and what they do in its hover)
    if (step === 'mastered') lines.push({ key: 'm', kind: 'mastered', at: 'at ' + n, text: 'Mastered: ' + (ep.mastered ? ep.mastered.name : 'its Mastered perk'), tip: ep.mastered && ep.mastered.text ? ep.mastered.name + ': ' + ep.mastered.text : '' });
    else if (step) { lines.push({ key: 'm', kind: 'perk', at: 'at ' + n, text: firstPerk ? 'Perk: ' + perkNames : 'Perk', tip: (firstPerk ? '' : 'Perk: ' + perkNames + ', or a Tier II · ') + perkTip(perks) }); firstPerk = false; }
    return { n, lines, step, perks: perks.map((p) => ({ id: p.id, name: p.name, icon: p.icon || '' })) };
  });
  return { head, feed: fi >= 0 && rows[fi] ? rows[fi].text : '', top, steps };
}
/** A level's row as one line of text: its lines joined by " · " (what the "?" page's row shows, piece by piece). */
export const rowText = (step) => (step ? step.lines.map((l) => l.text).join(' · ') : '');
/** A gamma skill's Call (data/calls.json, read through the engine's own ladder functions): its name, what it does, the
 *  AP and reach at these points, and how it grows: the points where it changes (its three steps, the AP drop, the
 *  reaction for a helping Call, the free first Call), the character's step marked. `pts` null: no character. */
export function callBlock(id, pts) {
  const def = callOfSkill(id); if (!def) return null;
  const R = CALL_RULES, has = typeof pts === 'number', p = has ? pts : 0, C = CALLS_NS;
  const marks = [
    ...def.steps.map((st) => ({ n: st.at, what: st.short || st.text })),
    { n: R.cheap_at, what: 'costs ' + C.callBaseAp(R.cheap_at) + ' AP instead of ' + R.ap },
    ...(C.callReactWhy(def) ? [] : [{ n: R.reaction_at, what: 'also as a reaction, for ' + R.reaction_ap + ' AP, once a round' }]),
    { n: R.free_at, what: 'your first Call each turn costs no AP' },
  ].sort((a, b) => a.n - b.n);
  const merged = []; for (const x of marks) { const last = merged[merged.length - 1]; if (last && last.n === x.n) last.what += '; ' + x.what; else merged.push({ ...x }); }
  const cur = has ? merged.filter((x) => x.n <= p).map((x) => x.n).pop() : undefined;
  const cm = has ? checkModOf(id, p) : 0;
  return { name: def.name, text: def.text, kind: def.kind,
    now: has && p > 0 ? C.callBaseAp(p) + ' AP · reach ' + callRangeAt(p) : R.ap + ' AP · reach ' + callRangeAt(1) + ', +1 each point',
    checks: has && p > 0 ? (cm >= 0 ? '+' : '') + cm + ' on checks and Asks' : 'Checks and Asks: +1 each point',
    ladder: merged.map((x) => ({ key: x.n, n: x.n, what: x.what.charAt(0).toUpperCase() + x.what.slice(1), now: x.n === cur, owned: has && x.n <= p })) };
}
/** A beta skill's door line on its page: what it multiplies on its alpha door, the top (both skills at the top, the
 *  engine's doorFeedView on a sheet there), and this character's number now: the engine's doorFeedView on the character
 *  itself (`who`: its perks, class and items move some numbers, the Strain limit and the plate soak), else on a sheet of
 *  its points. `ptsOf` null: no character. */
export function feedBlock(id, ptsOf, who) {
  const door = doorOfBeta(id), r = roadMap(id); if (!door || !r.feed) return null;
  const Dk = ENGINE_SKILL[door], name = (Dk && Dk.name) || door, mine = (SK[id] && SK[id].name) || id, top = r.top;
  const v = (sheet) => { try { return doorFeedView(sheet, door); } catch { return null; } };
  const at = v({ skills: { [door]: top, [id]: top } }), mult = at ? Math.round(at.mult * 100) / 100 : 0;
  const has = typeof ptsOf === 'function', now = has ? v(who && who.skills ? who : { skills: { [door]: ptsOf(door) || 0, [id]: ptsOf(id) || 0 } }) : null;
  return { door, doorName: name, head: 'Feeds ' + name,
    top: '',
    now: now && has && (ptsOf(door) || 0) > 0 && (ptsOf(id) || 0) > 0 ? ((l) => l.charAt(0).toUpperCase() + l.slice(1))(now.line.replace(/^[^:]{1,40}: /, '')) : has ? 'Needs ' + name + ' and ' + mine : '' };
}
/** "Every point: ..." (empty when no row is for every point). */
export const headLine = (id) => { const h = roadMap(id).head; return h.length ? 'Every point: ' + h.join(' · ') : ''; };
/** What the point after `p` gives, as one line: that step's lines, else what every point gives ('' past the top). */
export const nextLine = (id, p, who) => {
  const r = roadMap(id, who), s = r.steps[(p || 0)]; if (!s) return '';
  // card style: what the point opens (its named unlock or fork, its Call's step, its rows), else what every point
  // gives, then its perk step; at most two pieces, so the card never cuts
  const rank = { unlock: 0, fork: 0, call: 1, row: 2 };
  const own = s.lines.filter((l) => l.kind in rank).sort((x, y) => rank[x.kind] - rank[y.kind]).map((l) => l.text);
  const each = s.lines.filter((l) => l.kind === 'each').map((l) => l.text), extra = s.lines.filter((l) => l.kind === 'perk' || l.kind === 'mastered').map((l) => l.text);
  return [...(own.length ? own : each.length ? each : r.head), ...extra].slice(0, 2).join(' · ');
};
/** What each point of a skill gives, in one line (the attribute page's skill cards): the head line's texts. */
export const perPoint = (id) => roadMap(id).head.join(' · ') || (SK[id] && SK[id].summary) || '';
/** The attribute ceiling at a level, as the screens say it. */
export const ceilingLine = (level) => 'ceiling ' + attrCapAt(level) + ' at this level';
export const fmt = (m) => (m > 0 ? '+' + m : m < 0 ? '−' + Math.abs(m) : '0');
export const IMG = D.img;
/** Any built asset by name (tools/build_web_assets.py): campaign maps, sprites, banners, portraits. URLs pass through. */
export const ART = (n) => (!n ? '' : ASSETS[n] || (/^(\/|https?:|data:|blob:)/.test(n) ? n : ''));
export const ART_BIG = (n) => ASSETS[n + '-lg'] || ART(n);
/** A unit's face as its token draws it: the portrait or avatar resolved through the art library (an asset name like
 *  'char-m813-scavenger-drone', a built URL, an upload). '' when nothing resolves (an archived or unknown id): the
 *  token, the target card and the HUD then show the unit's initials, never a broken black square. A Figment or a Scrap
 *  Turret with no portrait shows its row's line icon on a dark plate (game/figmentIcons.ts; 0.28.2). */
export const faceOf = (u) => (u && u.img && ART(u.img)) || (u && u.owned ? figmentFaceOf(u) : '');
/** The campaign zone a state is in (the fight's map during a fight). */
export const zoneOf = (g) => g?.campaign?.zones?.find((z) => z.id === (g.phase === 'combat' && g.combat ? g.combat.map.id : g.story.zone)) || null;
/** An object's sprite: its own, else the campaign's for its kind (an open door has its own), else (rules 1.45) the fight
 *  map's kit piece for its kind (game/kitMap.ts); '' when none: the object draws its glyph. */
export const spriteOf = (g, o) => { const S = g?.campaign?.sprites || {}; return ART(o.sprite || (o.kind === 'door' && o.open && S['door:open']) || S[o.kind]) || kitSprite(g?.combat?.map?.skin?.setting, o); };
/** CSS for one tile showing its slice of the map painting, under a tint (the painting is the whole grid, w × h tiles). */
export const tileBg = (url, k, w, h, tint) => { const [x, y] = k.split(',').map(Number);
  return 'linear-gradient(' + tint + ', ' + tint + '), url("' + url + '") ' + (w > 1 ? (x / (w - 1)) * 100 : 0) + '% ' + (h > 1 ? (y / (h - 1)) * 100 : 0) + '% / ' + w * 100 + '% ' + h * 100 + '% no-repeat'; };
/** An <img> style for a sprite on its tile; a spriteBox (in tiles) lets big art overflow onto its neighbours. */
export const spriteStyle = (o) => { const b = o.spriteBox || { w: 1, h: 1, dx: 0, dy: 0 };
  return 'position: absolute; left: ' + b.dx * 100 + '%; top: ' + b.dy * 100 + '%; width: ' + b.w * 100 + '%; height: ' + b.h * 100 + '%; object-fit: contain; pointer-events: none; z-index: 1' + (o.hp != null && o.hp <= 0 ? '; opacity: 0.35' : ''); };

/** 0.30.0: a card's SHIELDS block (game/shieldLook.ts shieldBlock), Y. its values: in the hover card and, by
 *  <!--SHIELDS:path-->, wherever a template shows a unit's HP (the target card, your own panel). */
const SHIELDS_TPL = '<sc-if value="{{Y.has}}"><span data-shields-block style="display: flex; flex-direction: column; gap: 2px"><span style="{{Y.headStyle}}">{{Y.head}}</span><sc-if value="{{Y.hasGuardFirst}}"><span data-shield-guard="first" tip="{{Y.guardTitle}}" style="{{Y.lineStyle}}"><span aria-hidden="true" style="flex: none; width: 10px; text-align: center; font-size: var(--fs-sub); color: #E7EBF3">{{Y.guardGlyph}}</span><span>{{Y.guardLine}}</span></span></sc-if><sc-for list="{{Y.lines}}" as="shl"><span data-shield-line="{{shl.kind}}" style="{{Y.lineStyle}}"><span aria-hidden="true" style="{{shl.pipStyle}}">{{shl.glyph}}</span><span style="{{shl.nameStyle}}">{{shl.name}}</span><span style="font-weight: 700; font-variant-numeric: tabular-nums">{{shl.amount}}</span><span style="font-size: var(--fs-sub); color: #A3AEC2">· {{shl.lasts}}</span></span></sc-for><sc-if value="{{Y.hasGuardLast}}"><span data-shield-guard="last" tip="{{Y.guardTitle}}" style="{{Y.lineStyle}}"><span aria-hidden="true" style="flex: none; width: 10px; text-align: center; font-size: var(--fs-sub); color: #E7EBF3">{{Y.guardGlyph}}</span><span>{{Y.guardLine}}</span></span></sc-if><span data-shield-absorb style="font-size: var(--fs-sub); font-weight: 700; color: #FFFFFF">{{Y.absorb}}</span><sc-if value="{{Y.hasAbsorbDrop}}"><span data-shield-absorb-drop style="{{Y.subStyle}}">{{Y.absorbDrop}}</span></sc-if><sc-if value="{{Y.hasRule}}"><span data-shield-rule style="{{Y.subStyle}}">{{Y.rule}}</span><sc-if value="{{Y.hasGuard}}"><span data-shield-guard-how style="{{Y.subStyle}}">{{Y.guardName}}: {{Y.guardTitle}}</span></sc-if></sc-if></span></sc-if>';
/** A perk as ONE row (docs/design/handoffs/2026-11-18-skill-screens-redesign.md section 4): icon (click to enlarge) |
 *  name | I: its card line | II: only what changes | the state pips; on a chooser, its one button or its reason. No
 *  paragraph, no tag, no hover box: the row is the whole text. <!--PERKROW:path--> expands it for `path`. */
const PERKROW_TPL = '<div class="phc-perk-row" data-perk="{{X.key}}" data-held="{{X.held}}" style="{{X.style}}"><sc-if value="{{X.has}}"><img data-zoom="{{X.name}}" data-zoom-text="{{X.zoomText}}" class="phc-icon" src="{{X.icon}}" alt="{{X.alt}}" style="width: 32px; height: 32px; flex: none; object-fit: contain; border-radius: 6px; background: #10151F; border: 1px solid #232D3F"></sc-if><sc-if value="{{X.none}}"><span aria-hidden="true" style="width: 32px; height: 32px; flex: none; box-sizing: border-box; display: grid; place-items: center; border-radius: 6px; border: 1px dashed #3B475D; font-size: var(--fs-sub); color: #7F8BA1">?</span></sc-if><span class="phc-perk-name" style="{{X.nameStyle}}">{{X.name}}</span><span class="phc-perk-t1" style="{{X.t1Style}}"><b style="color: #A3AEC2">I</b> {{X.s1}}</span><sc-if value="{{X.hasS2}}"><span class="phc-perk-t2" style="{{X.t2Style}}"><b style="color: #A3AEC2">II</b> {{X.s2}}</span></sc-if><span class="phc-perk-state" role="img" aria-label="{{X.stateLabel}}" style="flex: none; display: inline-flex; gap: 5px; align-items: center; padding: 0 4px"><sc-for list="{{X.pips}}" as="xp"><span style="{{xp.style}}"></span></sc-for></span><sc-if value="{{X.hasWhy}}"><span class="phc-perk-why" style="flex: none; font-size: var(--fs-sub); font-weight: 700; color: #A3AEC2">{{X.why}}</span></sc-if><sc-if value="{{X.hasBtn}}"><button type="button" class="phc-perk-act phc-lu-choice" data-perk-act="{{X.key}}" onClick="{{X.act}}" aria-label="{{X.actAria}}" style="{{X.actStyle}}">{{X.actLabel}}</button></sc-if></div>';
/** A fork option as ONE row ("?" page): icon | name | its one line | its cost line, if it has one. */
const FORKROW_TPL = '<div class="phc-fork-row" data-fork-opt="{{X.key}}" style="{{X.style}}"><img data-zoom="{{X.name}}" data-zoom-text="{{X.text}}" class="phc-icon" src="{{X.icon}}" alt="" style="width: 32px; height: 32px; flex: none; object-fit: contain"><span style="{{X.nameStyle}}">{{X.name}}</span><span class="phc-fork-line" style="flex: 1 1 auto; min-width: 0; font-size: var(--fs-body); line-height: 1.35; color: #E7EBF3">{{X.text}}</span><sc-if value="{{X.hasCost}}"><span class="phc-fork-cost" style="flex: none; font-size: var(--fs-sub); font-weight: 700; color: #A3AEC2">{{X.cost}}</span></sc-if></div>';
const PERK_OF = {}; ENGINE_PERKS.forEach((p) => { PERK_OF[p.id] = p; });
const PERK_ART = {}; D.skills.forEach((s) => { s.ep.perks.forEach((p) => { PERK_ART[p.id] = p.icon; }); if (s.ep.mastered) PERK_ART[s.ep.mastered.id] = s.ep.mastered.icon; });
const cap1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
/** One perk's row. `o.held`: 'I' | 'II' | '' (the pips); `o.ink`: the skill's ink; `o.act`: { label, click, aria } for a
 *  chooser's one button; `o.why`: the reason a chooser's row is not legal (it is dimmed); `o.on`: the row picked. */
export function perkRow(id, o = {}) {
  const p = PERK_OF[id] || { name: id, tiers: {} }, T = p.tiers || {}, s1 = cap1((T.I && T.I.short) || ''), s2 = cap1((T.II && T.II.short) || '');
  const held = o.held === 'II' ? 2 : o.held === 'I' ? 1 : 0, ink = o.ink || '#E7EBF3', icon = PERK_ART[id] || '', act = o.act || null;
  return { key: id, name: p.name, icon, has: !!icon, none: !icon, alt: p.name + ' perk icon (Wick)', zoomText: cap1((T.I && T.I.text) || p.text || ''),
    s1, s2, hasS2: !!s2, held: held ? (held === 2 ? 'II' : 'I') : 'none', stateLabel: held === 2 ? 'Tier II' : held ? 'Tier I' : 'Not taken',
    pips: [0, 1].map((i) => ({ key: i, style: 'display: block; width: 9px; height: 9px; transform: rotate(45deg); box-sizing: border-box; ' + (i < held ? 'background: ' + ink : 'border: 1px solid #5A6781') })),
    why: o.why || '', hasWhy: !!o.why, hasBtn: !!act, actLabel: act ? act.label : '', act: act ? act.click : () => {}, actAria: act ? act.aria || act.label : '',
    actStyle: 'flex: none; min-height: 32px; padding: 0 14px; border-radius: 999px; font-family: inherit; font-size: var(--fs-body); font-weight: 700; cursor: pointer; white-space: nowrap; '
      + (o.on ? 'border: 0; background: #FFFFFF; color: #0A0D13' : 'border: 1px solid #FFFFFF; background: transparent; color: #FFFFFF'),
    nameStyle: 'flex: 0 0 170px; min-width: 0; font-size: var(--fs-body); font-weight: 700; line-height: 1.3; color: ' + (held ? ink : '#E7EBF3'),
    t1Style: 'flex: 1 1 auto; min-width: 0; font-size: var(--fs-body); line-height: 1.35; color: #E7EBF3',
    t2Style: 'flex: 0 1 auto; min-width: 0; font-size: var(--fs-body); line-height: 1.35; color: #C9D3E3',
    style: 'display: flex; align-items: center; gap: 12px; min-height: 40px; padding: 4px 10px; border-radius: 8px; background: ' + (o.on ? '#1C2536' : '#0A0D13') + '; border: 1px solid ' + (o.on ? '#FFFFFF' : '#232D3F') + (o.why ? '; opacity: 0.55' : '') };
}
/** One fork option's row ("?" page): from the engine's doorForkView option. */
export function forkRow(op, skill, ink) {
  const cost = op.cost || '';
  return { key: op.id, name: op.name, text: op.text, icon: forkIconOf(op.id, skill), cost, hasCost: !!cost,
    nameStyle: 'flex: 0 0 170px; min-width: 0; font-size: var(--fs-body); font-weight: 700; line-height: 1.3; color: ' + (op.picked ? ink : op.built ? '#E7EBF3' : '#7F8BA1'),
    style: 'display: flex; align-items: center; gap: 12px; min-height: 40px; padding: 4px 10px; border-radius: 8px; background: #0A0D13; border: 1px solid ' + (op.picked ? ink : '#232D3F') + (op.built ? '' : '; opacity: 0.7') };
}
/** Expand the shared template pieces exactly as design/canvas-build/build.py does. */
const popTpl = '<span class="phc-pop" role="tooltip" style="{{X.popStyle}}">\n<span style="display: flex; gap: 8px; align-items: center"><sc-if value="{{X.hasImg}}"><img src="{{X.img}}" alt="" style="width: 52px; height: 52px; border-radius: 8px; object-fit: cover; background: #000; flex: none"></sc-if><span style="display: flex; flex-direction: column; gap: 2px; min-width: 0"><span style="font-size: var(--fs-body); font-weight: 700">{{X.name}}</span><span style="{{X.subStyle}}">{{X.sub}}</span></span></span>\n<sc-if value="{{X.known}}"><span style="display: flex; justify-content: space-between; font-size: var(--fs-sub)"><span style="font-weight: 700; color: #F65157">{{X.hp}}</span><span style="{{X.stateStyle}}">{{X.state}}</span></span><span style="display: block; height: 5px; border-radius: 99px; background: #1C2536; overflow: hidden"><span style="display: block; {{X.hpFill}}"></span></span><sc-if value="{{X.hasAp}}"><span style="font-size: var(--fs-sub); color: #A3AEC2">{{X.ap}}</span></sc-if><sc-if value="{{X.hasInj}}"><span style="font-size: var(--fs-sub); font-weight: 700; letter-spacing: 0.1em; color: #F65157">⚠ {{X.inj}}</span></sc-if><sc-if value="{{X.hasSt}}"><span data-token-status="" style="display: flex; flex-wrap: wrap; gap: 3px 8px"><sc-for list="{{X.st}}" as="sg"><span data-status-group="{{sg.side}}" style="display: inline-flex; flex-wrap: wrap; gap: 3px"><sc-for list="{{sg.chips}}" as="sc"><span data-status="{{sc.key}}" style="{{sc.style}}"><sc-if value="{{sc.hasIcon}}" hint-placeholder-val="{{false}}"><img class="phc-cond-icon" src="{{sc.icon}}" alt="" style="{{sc.iconStyle}}"></sc-if><sc-if value="{{sc.noIcon}}" hint-placeholder-val="{{true}}"><span aria-hidden="true">{{sc.glyph}}</span></sc-if><span>{{sc.word}}</span></span></sc-for><sc-if value="{{sg.hasMore}}"><span style="{{sg.moreStyle}}">{{sg.moreText}}</span></sc-if></span></sc-for></span></sc-if></sc-if>\n<sc-if value="{{X.unknown}}"><span style="{{X.stateStyle}}">{{X.state}}</span><span style="font-size: var(--fs-sub); color: #A3AEC2">{{X.hint}}</span></sc-if>\n' + SHIELDS_TPL.replace(/Y\./g, 'X.sh.') + '\n';
export function expand(tpl) {
  let t = tpl.replace('<!--EPCCG-->', epTpl).replace('<!--LIGHTBOX-->', lbTpl).replace('<!--SHELL-->', shellTpl);
  t = t.replace(/<!--MASTERED:([\w.]+)-->/g, (_, p) => mastTpl.replace(/X\./g, p + '.'));
  t = t.replace(/<!--TOKPOP:([\w.]+)-->/g, (_, p) => popTpl.replace(/X\./g, p + '.'));
  t = t.replace(/<!--SHIELDS:([\w.]+)-->/g, (_, p) => SHIELDS_TPL.replace(/Y\./g, p + '.'));
  t = t.replace(/<!--PERKROW:([\w.]+)-->/g, (_, p) => PERKROW_TPL.replace(/X\./g, p + '.'));
  t = t.replace(/<!--FORKROW:([\w.]+)-->/g, (_, p) => FORKROW_TPL.replace(/X\./g, p + '.'));
  return t.replace(/__WICKMARK__/g, IMG['wick-welcome']).replace(/__WICK__/g, IMG['wick-mind-without-fog']).replace(/__SEAL__/g, IMG['emblem-ahoc-seal']);
}

// ---------- lightbox ----------
const LB_BIG = D.big || {};
const LB_KIND = { portrait: 'CHARACTER PORTRAIT', patron: 'PATRON · CELESTIAL PORTRAIT', skill: 'SKILL PORTRAIT', icon: 'ICON', perk: 'WICK PERK ICON', world: 'WORLD ILLUSTRATION' };
export function zoomer(self, img, caption, kind, text) { return () => {
  if (!img) return;
  self.setState({ lb: { img: LB_BIG[img] || bigOf(img), caption: caption || '', kind: kind || 'portrait', text: text || '' } });
  // Your own uploaded portrait: show the full size this browser keeps, if it has it.
  if (/^data:image\//.test(img)) bigPortrait(img).then((big) => { if (big !== img && self.state.lb && self.state.lb.img === img) self.setState({ lb: { ...self.state.lb, img: big } }); });
}; }
// Click to enlarge, everywhere (the owner, 17 Nov 2026: "make these icons click enlargeable too"): any <img> carrying
// data-zoom opens THIS lightbox (the one enlarge view; the screen that last rendered lightboxVals hosts it) with the
// picture's large copy (its assets.json key + '-lg', the 512 px build; else the same picture), the name (data-zoom, else
// the alt) and the thing's text (data-zoom-text) under it. Clicking the icon enlarges only: the row or card it sits in
// is not picked (the click stops here, in the capture phase, before React sees it).
let LB_HOST = null;
/** The enlarge request an icon slot carries: its name, its text (the slot's data-zoom / data-zoom-text attributes). */
export function zoomAttrs(name, text) { return { 'data-zoom': name || '', 'data-zoom-text': text || '' }; }
if (typeof document !== 'undefined' && !globalThis.__phcZoom) {
  globalThis.__phcZoom = true;
  document.addEventListener('click', (e) => {
    const img = e.target && e.target.closest ? e.target.closest('img[data-zoom]') : null;
    if (!img || !LB_HOST || !img.getAttribute('src')) return;
    e.preventDefault(); e.stopPropagation();
    LB_HOST.setState({ lb: { img: bigOf(img.getAttribute('src')), caption: img.getAttribute('data-zoom') || img.getAttribute('alt') || '', kind: 'icon', text: img.getAttribute('data-zoom-text') || '' } });
  }, true);
  const st = document.createElement('style'); st.textContent = 'img[data-zoom]{cursor:zoom-in}'; document.head.appendChild(st);
}
export const zoomBtn = 'display: block; flex: none; padding: 0; border: 0; background: none; cursor: zoom-in; border-radius: inherit';
export function lightboxVals(self) {
  LB_HOST = self;
  // Closing plays the modal's out animation first (closeAnim, below; hoisted), then drops the picture.
  const L = self.state.lb, closeLb = () => closeAnim(self, 'lb', () => self.setState({ lb: null }));
  if (!L) return { lbOpen: false, closeLb, lbCls: 'phc-m-backdrop', lb: { img: '', caption: '', kind: '', imgStyle: '', text: '', hasText: false }, zoomBtn };
  const icon = L.kind === 'icon' || L.kind === 'perk';
  return { lbOpen: true, closeLb, lbCls: modalCls(self, 'lb'), zoomBtn, lb: { img: L.img, caption: L.caption, kind: LB_KIND[L.kind] || '', text: L.text || '', hasText: !!L.text,
    imgStyle: 'display: block; width: ' + (icon ? 'min(80vw, 512px)' : 'auto') + '; max-width: min(92vw, ' + (icon ? '512px' : '800px') + '); max-height: 80vh; object-fit: contain; border-radius: ' + (icon ? '16px; background: #10151F; padding: 24px' : '10px; background: #000') } };
}

// ---------- EPCCG "?" pop-up (ported verbatim from epccg.logic.js) ----------
/** The skill page's header: the skill's place under its attribute, in words. */
export const slotLine = (slot) => (slot === 'gamma' ? 'How you talk and notice · +1 on checks' : (SLOT_WORD[slot] || ['', ''])[1]);
const SAVE_NAME = { body: 'Body', brain: 'Brain', heart: 'Heart' };
const AP_BLANK = { title: '', kicker: '', name: '', gives: [], skills: [], reads: [], hasReads: false, boxStyle: '', nameStyle: '', about: '' };
/** The attribute page (opened from an attribute's name on the creation and level-up screens, and from a skill page):
 *  what a point gives, its three skills, and what reads it: its class, the Call its talking skill makes, the save its
 *  surviving skill rolls. `self.state.attrPage` holds the open attribute. */
export function attrPageVals(self) {
  const id = self.state.attrPage, a = id && ATTR[id];
  const closeAttrPage = () => self.setState({ attrPage: null });
  if (!a) return { apOpen: false, ap: AP_BLANK, closeAttrPage };
  const ink = a.ink, fam = a.core.charAt(0).toUpperCase() + a.core.slice(1);
  const skills = D.skills.filter((k) => k.attr === id).sort((x, y) => SLOT_ORDER[x.slot] - SLOT_ORDER[y.slot]);
  const reads = [];
  const cls = D.classes.find((c) => c.attribute === id);
  if (cls) reads.push({ k: 'CLASS', name: cls.name, text: 'The class that finds you at level 3 when ' + a.name + ' is your highest attribute. Its rank grows with ' + a.name + ': II at 5, III at 8.' });
  for (const k of skills) {
    const call = callOfSkill(k.id);
    if (call) reads.push({ k: 'CALL', name: call.name, text: 'Spoken in a fight with ' + k.name + ': ' + call.text });
    const save = Object.keys(SAVE_SKILL_OF).find((f) => SAVE_SKILL_OF[f] === k.id);
    if (save) reads.push({ k: 'SAVE', name: SAVE_NAME[save] + ' save', text: 'Rolled with ' + k.name + ' when something tries to ' + (save === 'body' ? 'knock you down, push you or poison you' : save === 'brain' ? 'cloud or trick your mind' : 'frighten or break you') + '.' });
  }
  return { apOpen: true, closeAttrPage, ap: {
    title: a.name + ': attribute', kicker: fam.toUpperCase() + ' · ATTRIBUTE', name: a.name, about: a.fx ? a.fx + '.' : '',
    gives: String(ATTR_GIVES[id] || '').split(' · ').map((t) => ({ text: t.charAt(0).toUpperCase() + t.slice(1) })),
    rule: 'A skill can\'t be higher than the attribute above it: ' + a.name + ' is the ceiling of ' + skills.map((k) => k.name).join(', ').replace(/, ([^,]*)$/, ' and $1') + '.',
    skills: skills.map((k) => ({ key: k.id, name: k.name, img: k.img, slot: slotLine(k.slot), give: perPoint(k.id), summary: k.summary,
      open: () => self.setState({ attrPage: null, epccg: k.id }), label: k.name + ': open its page',
      style: 'display: flex; gap: 12px; align-items: flex-start; text-align: left; padding: 12px; border-radius: 12px; background: #0A0D13; border: 1px solid #232D3F; border-left: 3px solid ' + ink + '; color: #E7EBF3; font-family: inherit; cursor: pointer' })),
    reads: reads.map((r, i) => ({ ...r, key: i })), hasReads: reads.length > 0,
    inkStyle: 'color: ' + ink,
    boxStyle: 'width: min(820px, 100%); max-height: calc(100vh - 40px); overflow-y: auto; box-sizing: border-box; display: flex; flex-direction: column; gap: 16px; padding: 22px 24px; border-radius: 16px; background: #10151F; border: 1px solid #232D3F; border-top: 4px solid ' + ink + '; font-family: \'Chakra Petch\', sans-serif; color: #E7EBF3',
    nameStyle: 'margin: 0; font-family: \'Spectral\', serif; font-size: 32px; font-weight: 600; color: ' + ink,
  } };
}
const CALL_BLANK = { has: false, name: '', tip: '', now: '', inkStyle: '' }, FOLD_BLANK = { open: false, expanded: 'false', chev: '▸', toggle: () => {}, headStyle: '', chevStyle: '', id: '' };
const EP_BLANK = { zoom: () => {}, openAttr: () => {}, attrName: '', attrLabel: '', attrStyle: '', slot: '', line: '', steps: [], ladderFold: FOLD_BLANK, perksFold: FOLD_BLANK, forksFold: FOLD_BLANK, call: CALL_BLANK, feed: { has: false, text: '', style: '' }, ptsLine: '', inkStyle: '', title: '', name: '', img: '', alt: '', pictured: '', speaker: '', intro: '', loreRows: [], loreStyle: '', loreHeadStyle: '', foldHeadStyle: '', quote: [], perks: [], perkHelp: '', m: {}, combos: [], hasCombos: false, forks: [], hasForks: false, boxStyle: '', nameStyle: '', quoteStyle: '' };
export const epBtnStyle = (ink, extra) => 'display: grid; place-items: center; width: 28px; height: 28px; flex: none; padding: 0; border-radius: 50%; border: 1px solid ' + ink + '; background: rgba(10, 13, 19, 0.85); color: ' + ink + '; font-family: inherit; font-size: var(--fs-body); font-weight: 700; line-height: 1; cursor: pointer' + (extra ? '; ' + extra : '');
export const epRgba = (hex, a) => 'rgba(' + [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ') + ', ' + a + ')';
export function masteredVals(self, m, ink, skillName, pts) {
  const locked = typeof pts === 'number' && pts < 10, big = !locked;
  const corner = (v, h) => ({ style: 'position: absolute; ' + v + ': -5px; ' + h + ': 26px; width: 9px; height: 9px; transform: rotate(45deg); background: ' + ink + '; box-shadow: 0 0 0 3px #0C1018' });
  return {
    name: m.name, flavour: '“' + m.flavour + '”', text: m.text, meta: m.meta + ' · Automatic at 10 points',
    icon: m.icon, has: !!m.icon, none: !m.icon, zoom: m.icon ? zoomer(self, m.icon, m.name, 'perk', m.text) : () => {}, alt: m.name + ' Mastered perk icon (Wick)',
    kicker: '◆  MASTERED PERK · ' + skillName.toUpperCase() + ' 10  ◆', locked, lockLabel: locked ? 'LOCKED · ' + skillName.toUpperCase() + ' ' + pts + ' / 10' : '',
    pips: Array.from({ length: 10 }, (_, i) => ({ style: 'width: 8px; height: 8px; transform: rotate(45deg); box-sizing: border-box; ' + (i < pts ? 'background: ' + ink : 'border: 1px solid ' + epRgba(ink, 0.45)) })),
    corners: [corner('top', 'left'), corner('top', 'right'), corner('bottom', 'left'), corner('bottom', 'right')],
    boxStyle: 'position: relative; display: flex; flex-wrap: wrap; gap: 22px; align-items: center; padding: ' + (big ? '26px 28px' : '20px 22px') + '; border-radius: 14px; background: #0C1018; border: 1px solid ' + ink +
      '; box-shadow: inset 0 0 0 5px #0C1018, inset 0 0 0 6px ' + epRgba(ink, 0.4) + ', 0 0 36px ' + epRgba(ink, 0.16),
    ringStyle: 'display: grid; place-items: center; width: ' + (big ? 120 : 96) + 'px; height: ' + (big ? 120 : 96) + 'px; flex: none; border-radius: 50%; background: #10151F; border: 1px solid ' + ink +
      '; box-shadow: inset 0 0 0 5px #10151F, inset 0 0 0 6px ' + epRgba(ink, 0.5) + ', 0 0 22px ' + epRgba(ink, 0.28) + (locked ? '; opacity: 0.7' : ''),
    imgStyle: 'width: ' + (big ? 92 : 72) + 'px; height: ' + (big ? 92 : 72) + 'px',
    starStyle: 'display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: ' + (big ? 34 : 28) + 'px; line-height: 1; color: ' + ink,
    kickerStyle: 'font-size: var(--fs-sub); font-weight: 700; letter-spacing: 0.22em; color: ' + ink,
    nameStyle: 'margin: 0; font-family: \'Spectral\', serif; font-size: ' + (big ? 30 : 24) + 'px; font-weight: 600; line-height: 1.15; letter-spacing: 0.01em; color: ' + ink,
    ruleStyle: 'width: 64px; height: 1px; background: ' + ink,
  };
}
/** What tier II changes, said once (the perk card shows tier I, then only this): when the two texts differ only in
 *  their numbers, the numbers that change ("2% → 3% · 10% → 15%"); when II only adds to I, what it adds; else II's text. */
export function tierDelta(t1, t2) {
  const a = String(t1 || '').trim(), b = String(t2 || '').trim(); if (!b || a === b) return '';
  const wa = a.split(/\s+/), wb = b.split(/\s+/), num = (w) => /\d/.test(w), bare = (w) => w.replace(/^[^\w+−-]+|[^\w%]+$/g, '');
  if (wa.length === wb.length) {
    const diff = wa.map((w, i) => [w, wb[i]]).filter(([x, y]) => x !== y);
    if (diff.length && diff.every(([x, y]) => num(x) && num(y))) return diff.map(([x, y]) => bare(x) + ' → ' + bare(y)).join(' · ');
  }
  if (b.startsWith(a)) { const more = b.slice(a.length).trim(); if (more) return 'Adds: ' + more; }
  return b;
}
/** The ladder as the "?" page draws it: one row a level (a state dot, the level, its pieces joined by " · "), the
 *  character's owned levels bright, the next one highlighted, the later ones dim; `pts` null when the screen has no
 *  character (nothing marked). `attr`: the character's attribute value (the next level past it says "Needs <Attr> n").
 *  A per-point gain that repeats is drawn dim after its first row (the level's own thing is what the eye lands on). */
export function roadTrack(self, id, pts, ink, attr, who) {
  const r = roadMap(id, who), has = typeof pts === 'number', A = SK[id] && ATTR[SK[id].attr], seen = new Set();
  return r.steps.map((s) => {
    const state = !has ? 'ahead' : s.n <= pts ? 'owned' : s.n === pts + 1 ? 'next' : 'ahead';
    const needs = state === 'next' && typeof attr === 'number' && A && s.n > attr ? 'Needs ' + A.name + ' ' + s.n : '';
    const bright = state === 'next' ? '#FFFFFF' : state === 'owned' ? '#E7EBF3' : '#A3AEC2';
    return { key: s.n, n: s.n, state, step: s.step || 'none', text: rowText(s), needs, hasNeeds: !!needs,
      dot: state === 'owned' ? '●' : state === 'next' ? '◐' : '○', hasPerks: s.perks.length > 0,
      pieces: s.lines.map((l, i) => { const again = l.kind === 'each' && seen.has(l.key) && !/ \(max\)$/.test(l.text); if (l.kind === 'each') seen.add(l.key);
        return { key: l.key, kind: l.kind, text: l.text, tip: l.tip || '', sep: i > 0, repeat: again ? 'yes' : 'no',
          style: (l.tip ? 'text-decoration: underline dotted; text-underline-offset: 3px; cursor: help; ' : '') + (l.kind === 'mastered' ? 'font-weight: 700; color: ' + (state === 'ahead' ? '#C9A85A' : '#F2C46A')
            : again ? 'color: #5A6781' : l.kind === 'each' || l.kind === 'row' ? 'color: ' + bright : 'font-weight: 700; color: ' + (state === 'ahead' ? '#A3AEC2' : ink)) }; }),
      perks: s.perks.map((p) => ({ ...p, key: p.id, has: !!p.icon, zoom: p.icon ? zoomer(self, p.icon, p.name, 'perk', p.text || p.t1 || '') : () => {}, alt: p.name + ' perk icon (Wick)',
        style: 'width: 26px; height: 26px; object-fit: contain; border-radius: 6px; background: #10151F; border: 1px solid ' + (s.step === 'mastered' ? '#F2C46A' : '#2E3A50') + (state === 'ahead' ? '; opacity: 0.6' : '') })),
      label: 'Level ' + s.n + (state === 'owned' ? ', yours' : state === 'next' ? ', next' : ''),
      dotStyle: 'flex: none; width: 16px; text-align: center; font-size: var(--fs-body); line-height: 1; color: ' + (state === 'ahead' ? '#5A6781' : ink),
      numStyle: 'flex: none; width: 22px; text-align: right; font-size: var(--fs-body); font-weight: 700; font-variant-numeric: tabular-nums; color: ' + (state === 'next' ? ink : state === 'owned' ? '#E7EBF3' : '#7F8BA1'),
      textStyle: 'flex: 1 1 0; min-width: 0; font-size: var(--fs-body); line-height: 1.35' + (state === 'next' ? '; font-weight: 700' : ''),
      style: 'display: flex; gap: 10px; align-items: center; min-height: 30px; padding: 2px 10px 2px 6px; border-radius: 8px; '
        + (state === 'next' ? 'background: ' + epRgba(ink, 0.16) + '; box-shadow: inset 0 0 0 1px ' + ink : state === 'owned' ? 'background: #121826' : 'background: transparent'),
    };
  });
}
/** The "?" pop-up: one fixed layout for all 27 skills (docs/design/handoffs/2026-11-18-skill-screens-redesign.md,
 *  section 5, Leon's ruling of 19 Nov): the lore is the face (the portrait, name, attribute, the voice's quote, the lore
 *  paragraph, "At high levels", "Good for" and "Bad for", every line exactly as written in data), then one line of what
 *  the skill does and, for a gamma, its Call in one row; then three folds, closed by default and each remembering its
 *  state: "What each level gives" (the ladder), "Perks" (one row a perk), "Forks" (alphas). `ptsOf(id)`: the character's
 *  points in a skill when the screen has one (creation, level up); `who`: that character (its attributes, its forks; the
 *  Feeds chip reads the engine's view on it); `opt.noNarrator`: a run with no Narrator (Survival), where a combo perk
 *  whose deed only the Narrator can see is not shown (the engine watches the deeds in ENGINE_DEEDS). */
export function epccgVals(self, ptsOf, who, opt) {
  const id = self.state.epccg, s = id && D.skills.find((x) => x.id === id);
  const closeEpccg = () => self.setState({ epccg: null });
  if (!s) return { epOpen: false, ep: EP_BLANK, closeEpccg, ...attrPageVals(self) };
  const e = s.ep, a = ATTR[s.attr], ink = a.ink, pts = typeof ptsOf === 'function' ? ptsOf(s.id) : null, redraw = () => self.setState({ foldTick: Date.now() });
  const attrVal = who && who.attrs && typeof who.attrs[s.attr] === 'number' ? who.attrs[s.attr] : null;
  const doorLine = (ENGINE_SKILL[s.id] && ENGINE_SKILL[s.id].door_line) || '', first = doorLine.split(/(?<=[.!?])\s+(?=[A-Z])/)[0] || '';
  const fb = feedBlock(s.id, typeof ptsOf === 'function' ? ptsOf : null, who), feedNow = fb && fb.now && !/^Needs /.test(fb.now) ? fb.now : '';
  const cb = callBlock(s.id, typeof pts === 'number' ? pts : null);
  const noNarr = !!(opt && opt.noNarrator);
  const combos = e.combos.filter((c) => !noNarr || (c.id && c.id in ENGINE_DEEDS));
  const heldOf = (pid) => { const h = who && Array.isArray(who.perks) ? who.perks.find((x) => x.id === pid) : null; return h ? h.tier : ''; };
  const fv = (() => { try { return doorForkView(who && who.skills ? who : null, s.id); } catch { return null; } })();
  const forks = fv ? fv.steps.map((st) => ({ key: st.id, at: st.at, head: 'At ' + st.at + ': choose one' + (st.offered ? '' : ' · sealed'), opts: st.options.map((op) => forkRow(op, fv.skill, ink)) })) : [];
  const loreStyle = "margin: 0; font-family: 'Spectral', serif; font-size: 17px; line-height: 1.5; color: #E7EBF3";
  return { ...attrPageVals(self), epOpen: true, closeEpccg, ep: {
    title: s.name + ': EPCCG entry', name: s.name, slot: (SLOT_WORD[s.slot] || [''])[0], attrName: a.name,
    openAttr: () => self.setState({ epccg: null, attrPage: a.id }), attrLabel: a.name + ': what the attribute gives',
    attrStyle: 'padding: 0; border: 0; background: none; font-family: inherit; font-size: var(--fs-body); font-weight: 700; cursor: pointer; text-decoration: underline dotted; text-underline-offset: 3px; color: ' + ink,
    // one line of what it does: the door's first sentence, else the skill's own line
    line: first || s.summary,
    feed: { has: !!feedNow, text: fb ? 'Feeds ' + fb.doorName + ' · ' + feedNow : '', style: 'flex: none; padding: 3px 10px; border-radius: 999px; font-size: var(--fs-sub); font-weight: 700; border: 1px solid ' + ink + '; color: ' + ink },
    // a gamma skill's Call: one row (its name, AP and reach now; what it does in the name's hover); how it grows is on the levels
    call: cb ? { has: true, name: cb.name, tip: cb.text, now: cb.now, inkStyle: 'color: ' + ink } : CALL_BLANK,
    // the three folds, closed by default, each remembering its state (Leon, 19 Nov: the lore is the face)
    ladderFold: foldVals('skill:levels:' + s.id, { byRule: true, redraw }),
    perksFold: foldVals('skill:perks:' + s.id, { byRule: true, redraw }),
    forksFold: foldVals('skill:forks:' + s.id, { byRule: true, redraw }),
    foldHeadStyle: 'font-size: var(--fs-body); font-weight: 700; letter-spacing: 0.04em; color: #E7EBF3',
    ptsLine: typeof pts === 'number' ? pts + ' / ' + roadMap(s.id).top : '',
    steps: roadTrack(self, s.id, typeof pts === 'number' ? pts : null, ink, attrVal, who && who.skills ? who : null),
    inkStyle: 'color: ' + ink,
    img: e.img, zoom: zoomer(self, e.img, e.portrait, 'portrait'), alt: e.portrait + ', First-Patch Revival portrait for ' + s.name, pictured: e.portrait,
    // the lore, open, every line exactly as written (the 2020 voice is not ours to edit)
    quote: e.quote.map((q, n) => { const stage = /^\*.*\*$/.test(q); return { key: n, text: stage ? q.slice(1, -1) : q.replace(/\*/g, ''),
      style: "margin: 0; font-family: 'Spectral', serif; line-height: 1.5; " + (stage ? 'font-size: var(--fs-body); color: #A3AEC2; letter-spacing: 0.02em' : 'font-size: 17px; font-style: italic; color: #E7EBF3') }; }),
    speaker: '— ' + e.speaker, intro: e.intro, loreStyle,
    loreRows: [['high', 'At high levels:', e.high], ['good', 'Good for:', e.good], ['bad', 'Bad for:', e.bad]].filter((x) => x[2]).map(([key, head, text]) => ({ key, head, text })),
    loreHeadStyle: "font-family: 'Chakra Petch', sans-serif; font-size: var(--fs-sub); font-weight: 700; letter-spacing: 0.08em; color: " + ink,
    perks: e.perks.map((p) => perkRow(p.id, { held: heldOf(p.id), ink })),
    // the two rules every page shared, said once at the top of the perk fold
    perkHelp: 'A perk step at 3, 5, 7 and 9 points: a perk at I, or I raised to II. At 10: the Mastered perk.'
      + (combos.length ? ' A combo perk: 5 points in every skill on its card, then its deed.' : ''),
    m: masteredVals(self, e.mastered, ink, s.name),
    hasCombos: combos.length > 0,
    combos: combos.map((c) => ({ name: c.name, text: c.text, deed: c.deed, icon: c.icon, has: !!c.icon, none: !c.icon,
      zoom: c.icon ? zoomer(self, c.icon, c.name, 'perk', c.text) : () => {}, alt: c.name + ' combo perk icon (Wick)',
      segs: c.skills.map((k) => ({ style: 'flex: 1; height: 4px; background: ' + k.ink })),
      chips: c.skills.map((k, i) => ({ plus: i > 0, label: k.name + ' ' + k.min,
        style: 'padding: 2px 10px; border-radius: 999px; font-size: var(--fs-sub); font-weight: 700; white-space: nowrap; border: 1px solid ' + k.ink + '; color: ' + k.ink + (k.id === s.id ? '; background: ' + epRgba(k.ink, 0.16) : '') })) })),
    forks, hasForks: forks.length > 0,
    boxStyle: 'width: min(1200px, 100%); max-height: calc(100vh - 40px); overflow-y: auto; box-sizing: border-box; display: flex; flex-direction: column; gap: 12px; padding: 16px 22px; border-radius: 16px; background: #10151F; border: 1px solid #232D3F; border-top: 4px solid ' + ink,
    nameStyle: "margin: 0; font-family: 'Spectral', serif; font-size: 30px; font-weight: 600; line-height: 1.1; color: " + ink,
    quoteStyle: 'margin: 0; display: flex; flex-direction: column; gap: 6px; padding: 2px 0 2px 16px; border-left: 3px solid ' + ink,
  } };
}

/** Arrow keys in a tab row that may wrap onto two lines. Left and Right follow the reading order (the order on screen,
 *  wrapping at the ends); Up and Down go to the nearest tab on the line above or below (nothing on a single line);
 *  Home and End are the first and last. `e` is the key event on a tab inside a role="tablist", `n` the number of tabs,
 *  `i` the open one. Returns the index to open, or -1 when the key isn't one of these. */
export function tabNavIndex(e, n, i) {
  const k = e && e.key;
  if (!n || i < 0) return -1;
  if (k === 'ArrowRight') return (i + 1) % n;
  if (k === 'ArrowLeft') return (i - 1 + n) % n;
  if (k === 'Home') return 0;
  if (k === 'End') return n - 1;
  if (k !== 'ArrowDown' && k !== 'ArrowUp') return -1;
  const el = e.currentTarget || e.target, list = el && typeof el.closest === 'function' ? el.closest('[role="tablist"]') : null;
  if (!list) return -1;
  const r = Array.from(list.querySelectorAll('[role="tab"]')).map((t) => t.getBoundingClientRect()), me = r[i];
  if (!me) return -1;
  const rows = Array.from(new Set(r.map((x) => Math.round(x.top)))).sort((a, b) => a - b);
  if (rows.length < 2) return -1;
  const to = rows[(rows.indexOf(Math.round(me.top)) + (k === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length], cx = me.left + me.width / 2;
  let best = -1, bd = Infinity;
  r.forEach((x, j) => { if (Math.round(x.top) !== to) return; const d = Math.abs(x.left + x.width / 2 - cx); if (d < bd) { bd = d; best = j; } });
  return best;
}

/** Small shared bits for game chrome: player colour badge styles. */
export const badge = (color, size = 34) => 'display: grid; place-items: center; width: ' + size + 'px; height: ' + size + 'px; border-radius: 50%; flex: none; font-size: var(--fs-sub); font-weight: 700; background: ' + color + '; color: #0A0D13';

// ---------- the body figure (Status: injuries; Gear: what's worn where) ----------
// A plain front-facing figure in a 120 × 240 box. The character's right side is on the viewer's left.
const BODY = {
  head: 'M44,22 a16,16 0 1,0 32,0 a16,16 0 1,0 -32,0 z',
  eyes: 'M45,17 h30 v7 h-30 z',
  torso: 'M38,44 h44 l6,8 v50 h-56 v-50 z',
  pelvis: 'M36,104 h48 v22 h-48 z',
  rArm: 'M20,50 h12 l-1,60 h-13 z', lArm: 'M88,50 h12 l2,60 h-13 z',
  rHand: 'M17,113 h15 v14 h-15 z', lHand: 'M88,113 h15 v14 h-15 z',
  rLeg: 'M37,128 h21 v84 h-19 z', lLeg: 'M62,128 h21 l-2,84 h-19 z',
  rFoot: 'M32,214 h26 v11 h-26 z', lFoot: 'M62,214 h26 v11 h-26 z',
};
/** Which parts of the figure each equipment slot covers (spec: Equipment slots). */
export const SLOT_PARTS = { main: [], off: [], head: ['head'], headAcc: ['eyes'], outer: ['torso'], inner: ['torso'], lower: ['pelvis'], legs: ['rLeg', 'lLeg'], hands: ['rHand', 'lHand'], feet: ['rFoot', 'lFoot'], veil: [], pack: [] };
const INJ_PARTS = { head: ['head'], torso: ['torso'], arm: { left: ['lArm', 'lHand'], right: ['rArm', 'rHand'] }, leg: { left: ['lLeg', 'lFoot'], right: ['rLeg', 'rFoot'] } };
export function bodyFigure({ worn = [], injuries = [], hot = [], mainSide = 'right', weapon = false, veil = false }) {
  const hurt = new Set(); injuries.forEach((i) => { const p = INJ_PARTS[i.loc]; (Array.isArray(p) ? p : p[i.side || 'right']).forEach((x) => hurt.add(x)); });
  const on = new Set(worn), hi = new Set(hot);
  const parts = Object.entries(BODY).filter(([k]) => k !== 'eyes' || on.has('eyes') || hi.has('eyes')).map(([k, d]) => ({ key: k, d,
    fill: hurt.has(k) ? 'rgba(246, 81, 87, 0.28)' : hi.has(k) ? '#2E3A50' : on.has(k) ? '#1C2536' : '#0D1119',
    stroke: hurt.has(k) ? '#F65157' : hi.has(k) ? '#FFFFFF' : on.has(k) ? '#E7EBF3' : '#3B475D', sw: hurt.has(k) || hi.has(k) ? '2.5' : '1.5' }));
  const hx = mainSide === 'left' ? 95 : 24;
  return { parts, weapon, weaponD: 'M' + hx + ',128 v34', veil, veilD: 'M60,0 C96,0 116,40 116,120 C116,200 96,238 60,238 C24,238 4,200 4,120 C4,40 24,0 60,0 z' };
}

// ---------- status effects, in words (combat panel, hover cards) ----------
/** Each entry: [label, words, its conditions.json row id when it is one (the status strip reads that row's `side`)].
 *  own: the unit panel of your own fighter, where the resource rows already say Heat and each gun's jam (one fact, one
 *  place: Leon, live 0.24.0); elsewhere (an ally's line, a target's line) the chips say them. */
export function effectsOf(u, own = false) {
  const fx = [];
  if (u.dead) fx.push(['DEAD', 'Out of the fight for good.', 'downed']);
  else if (u.downed) fx.push(['DOWNED', 'Death saves ' + (u.saves ? u.saves.ok + ' ✓ / ' + u.saves.fail + ' ✕' : '') + '. A stim stabilises.', 'downed']);
  if (u.hidden) fx.push(['HIDDEN', 'Enemies can\'t see you or aim at you, and your next attack is an ambush. Attacking, being hit, or an enemy ending its move next to you gives you away.', 'hidden']);
  if (u.bleed) fx.push(['BLEEDING', '5 damage at the start of each turn, ' + u.bleed + (u.bleed === 1 ? ' round' : ' rounds') + ' left. A stim stops it.', 'bleeding']);
  if (u.dazedNext) fx.push(['DAZED', '−2 AP next turn.', 'dazed']);
  if (u.stunnedNext) fx.push(['OFF BALANCE', '−1 AP next turn (fumbled a strike).', 'off_balance']);
  if (!own && (u.jammed || u.offJammed)) fx.push(['JAMMED', (u.jammed && u.offJammed ? 'Both guns are' : u.offJammed ? 'The off-hand gun is' : 'The gun is') + ' jammed: it won\'t fire until cleared.']);
  if (u.heat && !own) fx.push(['HEAT ' + u.heat, '−' + Math.floor(u.heat / 2) + ' to hit; drops by 2 each turn.']);
  (u.injuries || []).forEach((i) => fx.push([((i.side ? i.side + ' ' : '') + i.loc).toUpperCase(), i.loc === 'arm' ? '−2 to attacks with that arm, until treated.' : i.loc === 'leg' ? 'Half Movement, until treated.' : 'Injured.', 'injured']));
  if (u.weakPoint) fx.push(['READ', 'It deals 15% less damage to the squad.', 'read']);
  if (u.overweight > 0) fx.push(['OVERBURDENED', u.overweight + ' kg over the carry limit: −' + Math.ceil(u.overweight / 5) + ' Movement, no Sprint.']);
  return fx;
}

// ---------- map tokens (minimap, area map, combat grid) with a hover card ----------
export function tokenVals(u, opt) {
  const hpPct = Math.max(0, Math.min(100, Math.round(u.hp / Math.max(1, u.maxHp) * 100)));
  const word = healthView(u).word.toUpperCase(); // the engine's word (rules.json combat.health_look), never a ladder of the screen's
  const known = !!opt.ally || !!u.analyzedBy, fx = known ? effectsOf(u) : [];
  return {
    ally: !!opt.ally, foe: !opt.ally, known, unknown: !known, img: faceOf(u), hasImg: !!faceOf(u), noImg: !faceOf(u), short: u.short, name: u.name,
    sub: (opt.ref ? opt.ref + ' · ' : '') + (opt.ally ? opt.player : u.npc ? opt.player + (u.analyzedBy ? ' · ANALYZED' : '') : 'ENEMY · ' + (u.tier || 'hostile').toUpperCase() + (u.analyzedBy ? ' · ANALYZED' : '')), subStyle: 'font-size: var(--fs-sub); font-weight: 700; letter-spacing: 0.12em; color: ' + (opt.ally ? opt.color : '#F65157'),
    hp: fmtNum(u.hp) + ' / ' + fmtNum(u.maxHp) + ' HP', hpFill: 'height: 100%; width: ' + hpPct + '%; background: #F65157', state: word,
    stateStyle: 'font-size: var(--fs-sub); font-weight: 700; letter-spacing: 0.12em; color: ' + (u.downed || u.dead ? '#F65157' : '#A3AEC2'),
    ap: opt.inFight && opt.ally ? 'AP ' + u.ap + ' · Movement ' + u.movement : !opt.ally && known ? 'Defense ' + u.def + ' · Armour ' + u.armour : '', hasAp: !!(opt.inFight && opt.ally) || (!opt.ally && known),
    // opt.extra: lines anyone may read (Physical 2.0: Pressure and its state, Stopped once, a held Watch).
    // 0.31.0 (U4): given the unit's status groups (game/statusStrip.ts, the fight screen), the card shows the strip, small;
    // the old red line stays only where no groups are given (the map outside a fight)
    st: opt.status || [], hasSt: !!(opt.status && opt.status.length),
    inj: [...fx.map((f) => f[0]), ...(opt.extra || [])].join(' · '), hasInj: !opt.status && fx.length + (opt.extra || []).length > 0, hint: opt.ally ? '' : 'Analyze to see its HP and status.',
    // 0.30.0: the SHIELDS block (the engine's shieldsView: exact for the squad and an Analyzed foe, size words for any
    // other; game/shieldLook.ts draws it), on every card: yours, a friend's, a foe's. opt.sv: the view the screen already
    // worked out for this unit this render. No rule line here: it is the target card's and your own panel's.
    sh: shieldBlock(opt.sv || shieldsView(opt.cb || null, u, null, fmtNum)),
    tokStyle: 'position: absolute; inset: 6%; z-index: 2; display: grid; place-items: center; border-radius: 50%; overflow: hidden; box-sizing: border-box; font-size: 9px; font-weight: 700; '
      + (opt.ally ? 'border: 2px solid ' + opt.color + '; background: #000' : opt.color && opt.color !== '#F65157' ? 'border: 2px solid ' + opt.color + '; background: #141922; color: ' + opt.color : 'border: 2px solid #F65157; background: #2A0F14; color: #F65157') + (u.downed || u.dead ? '; opacity: 0.45' : '') + (opt.pose ? '; ' + opt.pose : ''), // opt.pose: Pressure 2.0's crouch (techView pressureLook)
    popStyle: 'position: absolute; z-index: 30; ' + (opt.up ? 'bottom' : 'top') + ': calc(100% + 6px); ' + (opt.right ? 'right: 0' : 'left: 0') + '; width: 210px; flex-direction: column; gap: 6px; padding: 10px; border-radius: 10px; background: #10151F; border: 1px solid ' + (opt.ally ? opt.color : '#F65157') + '; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6); color: #E7EBF3; text-align: left; pointer-events: none; white-space: normal',
  };
}

// ---------- motion: slide and pop in AND out for a screen's own panels (main screen; reusable by any DC screen) ----------
// Classes (all respect Reduce motion: the app's toggle turns the slides into fades via .phc-rm on a screen root, and the
// system setting stops them in the global CSS; nothing waits on an animation event, so a hidden tab never sticks):
//   .phc-m-backdrop   a modal's dim backdrop: fades in; with .phc-m-closing it fades out and stops taking clicks
//   .phc-m-card       the modal's card inside a backdrop: rises and grows in; inside .phc-m-closing it sinks out
//   .phc-m-rise       anything arriving in a list (story entries, prompts, check buttons): a short slide up
//   .phc-m-tab-l / -r tab content switching: slides in from the left / right (the direction of the tab picked)
//   .phc-m-tip        a tooltip or a small popover: drops in fast
//   .phc-m-pop        a button or badge that appears (Level up): pops in, then .phc-m-glow pulses its outline
//   .phc-m-flip       a value that just changed (a reroll result): flips in
export const MOTION_MS = 180;
// Entrances fill backwards only: a transform animation still filling forwards turns its element into the containing
// block of every position: fixed child (Chrome), so a tooltip inside an animated tab was clipped by its column.
export const MOTION_CSS = [
  '@keyframes phcMFadeIn{from{opacity:0}to{opacity:1}}@keyframes phcMFadeOut{from{opacity:1}to{opacity:0}}',
  '@keyframes phcMCardIn{from{opacity:0;transform:translateY(22px) scale(.965)}to{opacity:1;transform:none}}',
  '@keyframes phcMCardOut{from{opacity:1;transform:none}to{opacity:0;transform:translateY(16px) scale(.97)}}',
  '@keyframes phcMRise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}',
  '@keyframes phcMFromL{from{opacity:0;transform:translateX(-22px)}to{opacity:1;transform:none}}@keyframes phcMFromR{from{opacity:0;transform:translateX(22px)}to{opacity:1;transform:none}}',
  '@keyframes phcMDrop{from{opacity:0;transform:translateY(-6px) scale(.98)}to{opacity:1;transform:none}}',
  '@keyframes phcMPop{0%{opacity:0;transform:scale(.6)}70%{opacity:1;transform:scale(1.06)}100%{transform:none}}',
  '@keyframes phcMGlow{0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,0)}50%{box-shadow:0 0 0 4px rgba(255,255,255,.28)}}',
  '@keyframes phcMFlip{0%{opacity:0;transform:rotateX(90deg)}100%{opacity:1;transform:none}}',
  '.phc-m-backdrop{animation:phcMFadeIn .2s ease-out both}',
  '.phc-m-backdrop.phc-m-closing{animation:phcMFadeOut ' + MOTION_MS + 'ms ease-in both;pointer-events:none}',
  '.phc-m-card{animation:phcMCardIn .3s cubic-bezier(.2,.8,.2,1) backwards}',
  '.phc-m-closing .phc-m-card{animation:phcMCardOut ' + MOTION_MS + 'ms ease-in both}',
  '.phc-m-rise{animation:phcMRise .32s cubic-bezier(.2,.8,.2,1) backwards}',
  '.phc-m-tab-l{animation:phcMFromL .24s cubic-bezier(.2,.8,.2,1) backwards}.phc-m-tab-r{animation:phcMFromR .24s cubic-bezier(.2,.8,.2,1) backwards}',
  '.phc-m-tip{animation:phcMDrop .14s ease-out backwards}',
  '.phc-m-pop{animation:phcMPop .36s cubic-bezier(.2,.8,.2,1) backwards,phcMGlow 2.4s ease-in-out .4s infinite}',
  '.phc-m-flip{animation:phcMFlip .3s ease-out backwards}',
  // Reduce motion (the app's own toggle): every slide becomes a plain fade.
  '.phc-rm .phc-m-card,.phc-rm .phc-m-rise,.phc-rm .phc-m-tab-l,.phc-rm .phc-m-tab-r,.phc-rm .phc-m-tip,.phc-rm .phc-m-pop,.phc-rm .phc-m-flip{animation:phcMFadeIn .15s ease-out both}',
  '.phc-rm .phc-m-closing .phc-m-card{animation:phcMFadeOut .15s ease-in both}',
].join('');
/** Put a stylesheet in the page once (by id). Safe outside a browser. */
export function ensureStyle(id, css) {
  if (typeof document === 'undefined' || document.getElementById(id)) return;
  const el = document.createElement('style'); el.id = id; el.textContent = css; document.head.appendChild(el);
}
export const ensureMotionCss = () => ensureStyle('phc-motion', MOTION_CSS);
/** The class for a screen root: 'phc-rm' when Reduce motion is on (slides become fades). */
export const motionRoot = () => (reducedMotion() ? 'phc-rm' : '');
/** Close something with its out animation: mark it closing (state.closing[name]), then run done() after the animation.
 *  A second call while it is closing does nothing. */
export function closeAnim(self, name, done) {
  if ((self.state.closing || {})[name]) return;
  self.setState({ closing: { ...(self.state.closing || {}), [name]: true } });
  setTimeout(() => { try { done(); } finally { self.setState({ closing: { ...(self.state.closing || {}), [name]: false } }); } }, reducedMotion() ? 150 : MOTION_MS);
}
/** A modal backdrop's class, with the closing state. */
export const modalCls = (self, name) => 'phc-m-backdrop' + ((self.state.closing || {})[name] ? ' phc-m-closing' : '');
