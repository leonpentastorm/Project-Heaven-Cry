// The sheet's ARMS tab (Physical 2.0, rules 1.12; docs/design/handoffs/physical-2.0-C-client.md, part 5): the
// techniques you know (melee and ranged, by kind, each with its property lines), your two ready lists with their caps,
// a drill bar per weapon you have drilled or hold (its three marks, what each gives, a pick chooser), and the quiver
// menu for each quiver you carry (rules 1.53: two, worn and ready). Every number is the engine's (physOf, readyCap, readyTechniques, drillMarks, picksOwed,
// pickable); this file is screen glue: state, words and styles. Modelled on faithTab.js; computed only while open.
import { techIconOf } from '../game/doorArt';
import { WEAPON, phys, packOf, quiverCards } from '@engine';
import { enchantMark } from '../game/quiverView';
import { act, toast } from '../game/store';
import { cardOf, cardHoles, gradeText } from '../game/itemCardView';

const { TECHNIQUE, TECHNIQUES, physOf, readyCap, readyTechniques, drillOf, drillMarks, picksOwed, pickable, weaponProps, weaponSystem, weaponTeaches, groupName, groupsOf, propText, PHYS_RULES } = phys;
const SYS = [['melee', 'MELEE'], ['ranged', 'RANGED']];
const INK = { melee: '#F68A38', ranged: '#E3BF51' }; // Strength (Raw Power, Athletics) and Agility (Dexterity): the skills that wield them
const chip = (on, off, ink = '#E7EBF3') => 'min-height: 30px; padding: 0 12px; border-radius: 999px; font-family: inherit; font-size: var(--fs-sub); font-weight: 700; cursor: ' + (off ? 'default; opacity: 0.5; ' : 'pointer; ')
  + (on ? 'border: 1px solid ' + ink + '; background: #1C2536; color: #FFFFFF' : 'border: 1px dashed #2E3A50; background: transparent; color: #A3AEC2');
const card = 'display: flex; flex-direction: column; gap: 6px; padding: 10px; border-radius: 10px; background: #10151F; border: 1px solid #232D3F';
/** Run an action; a refusal is a toast, never a thrown error on screen. */
const run = (a) => { try { const r = act(a); if (r && typeof r.then === 'function') r.catch((e) => toast(String((e && e.message) || e))); } catch (e) { toast(String((e && e.message) || e)); } };
/** The weapons that teach a technique (its signature), by name. */
const teachers = (id) => Object.values(WEAPON).filter((w) => weaponTeaches(w.id) === id).map((w) => w.name);
/** Rules 1.63 (D5): the techniques a weapon's own properties give whoever holds it (Throw with a Thrown weapon), read
 * from the engine's technique list (each row's `comes_with`, the list physical/core.ts usable offers them by), in the
 * weapon's own system: id and the property that brings it. */
export const propTechniques = (wid) => { const pr = weaponProps(wid), sys = weaponSystem(wid);
  return TECHNIQUES.filter((t) => t.system === sys && !t.free && (t.comes_with || []).some((p) => pr.includes(p))).map((t) => ({ id: t.id, prop: (t.comes_with || []).find((p) => pr.includes(p)) })); };
const lineView = (l, i) => ({ key: i + ':' + l.props.join('+'), props: l.props.map((p) => p.toUpperCase()).join(l.match === 'all' ? ' + ' : ' / '), text: l.text, help: l.props.map((p) => p + ': ' + propText(p)).filter((x) => !/: $/.test(x)).join(' · ') });

/** The values the ARMS tab's template reads (ar.*). `sc` is the main screen (state: arPick, arQuiver). */
export function armsTabVals(sc, g, c) {
  const S = sc.state || {};
  if (!g || !c) return { has: false };
  const P = physOf(c), fight = g.phase === 'combat' && !!g.combat && !g.combat.over;
  const lockText = fight ? 'In a fight: change your techniques, drill picks and quivers after it.' : '';
  // ---------- what you know ----------
  // (rules 1.63, D5: and what the held weapons' properties give, named by the property: Throw with a Thrown weapon)
  const comes = new Map([c.weapon, c.offHand && WEAPON[c.offHand.id] ? c.offHand.id : null].filter((id) => id && WEAPON[id]).flatMap((id) => propTechniques(id).map((x) => [x.id, x.prop])));
  const knownIds = new Set([...TECHNIQUES.filter((t) => t.free).map((t) => t.id), ...P.known, ...comes.keys()]);
  const known = SYS.map(([sys, title]) => {
    const groups = groupsOf(sys).map((gr) => ({ key: gr, label: groupName(gr).toUpperCase(),
      items: TECHNIQUES.filter((t) => t.system === sys && t.group === gr && knownIds.has(t.id)).map((t) => {
        const by = teachers(t.id);
        const tag = t.free ? 'EVERYONE KNOWS IT' + (t.needs && t.needs.stuck ? ' · ONLY WHILE A WEAPON IS STUCK' : '') : comes.has(t.id) ? 'COMES WITH ' + String(comes.get(t.id)).toUpperCase() : by.length ? 'SIGNATURE · ' + by.join(', ') : '';
        return { key: t.id, name: t.name, free: t.free, tag, hasTag: !!tag, ...((ic) => ({ icon: ic, hasIcon: !!ic }))(techIconOf(t.id)),
          text: t.text, lines: (t.lines || []).map(lineView), hasLines: (t.lines || []).length > 0, help: t.name + ': ' + t.text, ap: t.ap.base === 'flat' ? (t.ap.value || 0) + ' AP' : t.ap.base === 'reaction' ? 'reaction' : 'weapon AP' + (t.ap.add ? ' +' + t.ap.add : '') };
      }) })).filter((gr) => gr.items.length);
    return { key: sys, title, ink: INK[sys], titleStyle: 'font-size: var(--fs-sub); font-weight: 700; letter-spacing: 0.16em; color: ' + INK[sys], groups, has: groups.length > 0 };
  });
  // ---------- ready lists ----------
  const ready = SYS.map(([sys, title]) => {
    const cap = readyCap(c, sys), now = readyTechniques(c, sys), set = new Set(now);
    const items = P.known.filter((id) => TECHNIQUE[id] && TECHNIQUE[id].system === sys && !TECHNIQUE[id].free).map((id) => {
      const on = set.has(id), full = !on && now.length >= cap, off = fight || full;
      return { key: id, label: TECHNIQUE[id].name + (on ? ' ✓' : ''), pressed: on ? 'true' : 'false', off, title: fight ? lockText : full ? cap + ' ready: take one out first.' : (on ? 'Take it out of your ready list.' : 'Ready it.'),
        style: chip(on, off && !on, INK[sys]), toggle: () => { if (off) return toast(fight ? lockText : cap + ' ready: take one out first.'); run({ type: 'phys/ready', charId: c.id, system: sys, ids: on ? now.filter((x) => x !== id) : [...now, id] }); } };
    });
    return { key: sys, title: title + ' · READY ' + now.length + ' / ' + cap, titleStyle: 'font-size: var(--fs-sub); font-weight: 700; letter-spacing: 0.16em; color: ' + INK[sys], items, has: items.length > 0, none: !items.length,
      empty: 'You know no ' + sys + ' techniques beyond the ones everyone knows. Drill a weapon to learn more.', why: sys === 'melee' ? 'Cap: 3 + half the better of Raw Power and Athletics.' : 'Cap: 3 + half your Dexterity.' };
  });
  // ---------- drill: every weapon drilled or held ----------
  const held = [c.weapon, c.offHand && WEAPON[c.offHand.id] ? c.offHand.id : null].filter((id) => id && WEAPON[id] && id !== 'fists');
  const wids = [...new Set([...held, ...Object.keys(P.drill || {}).filter((id) => WEAPON[id])])];
  const marksAt = PHYS_RULES.drill.marks;
  const drill = wids.map((wid) => {
    const w = WEAPON[wid], d = drillOf(c, wid), M = drillMarks(c, wid), next = M.find((m) => !m.reached), owed = picksOwed(c, wid), open = S.arPick === wid && owed > 0;
    const top = marksAt[marksAt.length - 1], fill = Math.min(100, Math.round((d / top) * 100));
    const marks = M.map((m, i) => ({ key: 'm' + i, label: 'MARK ' + ['I', 'II', 'III'][i] + ' · ' + m.at, gives: m.gives === 'signature' ? (TECHNIQUE[m.id]?.name || m.id) + ' (its signature)' : 'a pick of any ' + weaponSystem(wid) + ' technique', reached: m.reached,
      style: 'display: flex; justify-content: space-between; gap: 8px; font-size: var(--fs-sub); ' + (m.reached ? 'color: #E7EBF3' : 'color: #7F8BA1'), mark: m.reached ? '✓' : '○' }));
    const picks = open ? pickable(c, wid).map((id) => ({ key: id, label: TECHNIQUE[id].name, title: TECHNIQUE[id].text, style: chip(false, false, INK[weaponSystem(wid)]), pick: () => { run({ type: 'phys/pick', charId: c.id, weaponId: wid, id }); sc.setState({ arPick: null }); } })) : [];
    // Items 2.0 lane A3: the one item card's picture (game/itemCardView.ts: the picture chain, else the placeholder)
    const heldSt = wid === c.weapon ? c.weaponState : wid === c.offHand?.id ? c.offHand : null, pic = cardHoles(cardOf(wid, heldSt?.rarity)).img;
    return { key: wid, name: w.name, icon: pic, hasIcon: !!pic, total: d + ' drill', next: next ? (next.at - d) + ' drill to mark ' + ['I', 'II', 'III'][M.indexOf(next)] : 'All three marks reached',
      props: weaponProps(wid).map((p) => p.toUpperCase()).join(' · '), held: held.includes(wid) ? 'IN HAND' : '', hasHeld: held.includes(wid),
      fill: 'height: 100%; border-radius: 99px; background: ' + INK[weaponSystem(wid)] + '; width: ' + fill + '%', ticks: marksAt.map((at, i) => ({ key: 't' + i, style: 'position: absolute; top: -2px; bottom: -2px; width: 2px; background: #0A0D13; left: ' + Math.round((at / top) * 100) + '%' })),
      marks, owed, hasOwed: owed > 0, owedText: owed + (owed === 1 ? ' pick waiting' : ' picks waiting'), open, picks, noPicks: open && !picks.length,
      toggle: () => { if (fight) return toast(lockText); sc.setState({ arPick: open ? null : wid }); }, toggleLabel: open ? 'Close' : 'Pick a technique' };
  });
  // ---------- quivers (rules 1.53): the character's, two carried (worn and ready), filled out of a fight from the arrows carried ----------
  const bows = [...new Set([...held, ...packOf(c).filter((it) => it.weapon && WEAPON[it.weapon]).map((it) => it.weapon)])].filter((id) => weaponProps(id).includes('drawn'));
  const arrows = {}; for (const it of packOf(c)) if (it.calibre && /arrow/i.test(it.calibre)) { const t = it.ammoType || 'standard'; arrows[t] = (arrows[t] || 0) + (it.qty || 0); }
  const bow = bows[0], qc = bow ? quiverCards(c) : [];
  const quivers = qc.map((q) => {
    const cap = q.holds, saved = q.arrows, draft = (S.arQuiver && S.arQuiver[q.i]) || saved;
    const types = [...new Set([...Object.keys(arrows), ...Object.keys(saved)])];
    const total = types.reduce((n, t) => n + (draft[t] || 0), 0);
    const set = (t, n) => sc.setState({ arQuiver: { ...(sc.state.arQuiver || {}), [q.i]: { ...draft, [t]: Math.max(0, n) } } });
    const mark = enchantMark(q.ench);
    const qk = cardOf(q.id || bow, q.rarity), qpic = cardHoles(qk).img; // Items 2.0 lane A3: the quiver's own card (its grade's word)
    return { key: 'q' + q.i, name: q.name + ' · ' + (gradeText(qk) || q.rarity.toUpperCase()) + (q.worn ? ' · WORN' : ' · READY'), icon: qpic, hasIcon: !!qpic, cap: 'Holds ' + cap, total: total + ' / ' + cap + ' loaded', over: total > cap, totalStyle: 'font-size: var(--fs-sub); font-weight: 700; color: ' + (total > cap ? '#F65157' : '#E7EBF3'),
      hasEnch: !!mark, enchText: mark ? mark.text : '', enchStyle: mark ? mark.style : '',
      rows: types.map((t) => { const n = draft[t] || 0, have = (arrows[t] || 0) + (saved[t] || 0);
        return { key: t, label: (t === 'standard' ? 'Standard' : t.replace(/_/g, ' ')) + ' arrows', have: have + ' to hand', n: String(n), dec: () => set(t, n - 1), inc: () => set(t, n + 1), decOff: fight || n <= 0, incOff: fight || n >= have || total >= cap }; }),
      hasRows: types.length > 0, noRows: !types.length, none: 'You carry no arrows.', apply: () => { if (fight) return toast(lockText); run({ type: 'phys/quiver', charId: c.id, weaponId: bow, load: draft, which: q.i }); sc.setState({ arQuiver: null }); },
      applyOff: fight || total > cap, note: q.worn ? 'Arrows are drawn from the worn quiver as part of each shot. A quiver is never refilled in a fight.' : 'In a fight, Switch quiver (the bow\'s reload) makes this one the worn quiver.' };
  });
  const quiverSwap = { has: qc.length > 1, off: fight, label: 'Swap worn and ready', go: () => { if (fight) return toast(lockText); run({ type: 'phys/quiver', charId: c.id, weaponId: bow, load: {}, swap: true }); } };
  return { has: true, fight, lockText, hasLock: fight, known, ready, drill, hasDrill: drill.length > 0, noDrills: !drill.length, noDrill: 'Hold a weapon (or fight with one) to start its drill bar.', quivers, hasQuivers: quivers.length > 0, quiverSwap, card,
    headStyle: 'display: flex; flex-direction: column; gap: 8px' };
}
