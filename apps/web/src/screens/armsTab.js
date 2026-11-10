// The sheet's ARMS tab (Physical 2.0, rules 1.12; docs/design/handoffs/physical-2.0-C-client.md, part 5): the
// techniques you know (melee and ranged, by kind, each with its property lines), your two ready lists with their caps,
// a drill bar per weapon you have drilled or hold (its three marks, what each gives, a pick chooser), and the quiver
// menu for each bow you carry. Every number is the engine's (physOf, readyCap, readyTechniques, drillMarks, picksOwed,
// pickable); this file is screen glue: state, words and styles. Modelled on faithTab.js; computed only while open.
import { WEAPON, phys, packOf } from '@engine';
import { act, toast } from '../game/store';
import { gearIconUri } from '../game/gearIcons';

const { TECHNIQUE, TECHNIQUES, physOf, readyCap, readyTechniques, drillOf, drillMarks, picksOwed, pickable, weaponProps, weaponSystem, weaponTeaches, groupName, groupsOf, propText, PHYS_RULES } = phys;
const SYS = [['melee', 'MELEE'], ['ranged', 'RANGED']];
const INK = { melee: '#F68A38', ranged: '#E3BF51' }; // Strength (Raw Power, Athletics) and Agility (Dexterity): the skills that wield them
const chip = (on, off, ink = '#E7EBF3') => 'min-height: 30px; padding: 0 12px; border-radius: 999px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: ' + (off ? 'default; opacity: 0.5; ' : 'pointer; ')
  + (on ? 'border: 1px solid ' + ink + '; background: #1C2536; color: #FFFFFF' : 'border: 1px dashed #2E3A50; background: transparent; color: #A3AEC2');
const card = 'display: flex; flex-direction: column; gap: 6px; padding: 10px; border-radius: 10px; background: #10151F; border: 1px solid #232D3F';
/** Run an action; a refusal is a toast, never a thrown error on screen. */
const run = (a) => { try { const r = act(a); if (r && typeof r.then === 'function') r.catch((e) => toast(String((e && e.message) || e))); } catch (e) { toast(String((e && e.message) || e)); } };
/** The weapons that teach a technique (its signature), by name. */
const teachers = (id) => Object.values(WEAPON).filter((w) => weaponTeaches(w.id) === id).map((w) => w.name);
const lineView = (l, i) => ({ key: i + ':' + l.props.join('+'), props: l.props.map((p) => p.toUpperCase()).join(l.match === 'all' ? ' + ' : ' / '), text: l.text, help: l.props.map((p) => p + ': ' + propText(p)).filter((x) => !/: $/.test(x)).join(' · ') });

/** The values the ARMS tab's template reads (ar.*). `sc` is the main screen (state: arPick, arQuiver). */
export function armsTabVals(sc, g, c) {
  const S = sc.state || {};
  if (!g || !c) return { has: false };
  const P = physOf(c), fight = g.phase === 'combat' && !!g.combat && !g.combat.over;
  const lockText = fight ? 'In a fight: change your techniques, drill picks and quivers after it.' : '';
  // ---------- what you know ----------
  const knownIds = new Set([...TECHNIQUES.filter((t) => t.free).map((t) => t.id), ...P.known]);
  const known = SYS.map(([sys, title]) => {
    const groups = groupsOf(sys).map((gr) => ({ key: gr, label: groupName(gr).toUpperCase(),
      items: TECHNIQUES.filter((t) => t.system === sys && t.group === gr && knownIds.has(t.id)).map((t) => {
        const by = teachers(t.id);
        return { key: t.id, name: t.name, free: t.free, tag: t.free ? 'EVERYONE KNOWS IT' : by.length ? 'SIGNATURE · ' + by.join(', ') : '', hasTag: t.free || by.length > 0,
          text: t.text, lines: (t.lines || []).map(lineView), hasLines: (t.lines || []).length > 0, help: t.name + ': ' + t.text, ap: t.ap.base === 'flat' ? (t.ap.value || 0) + ' AP' : t.ap.base === 'reaction' ? 'reaction' : 'weapon AP' + (t.ap.add ? ' +' + t.ap.add : '') };
      }) })).filter((gr) => gr.items.length);
    return { key: sys, title, ink: INK[sys], titleStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.16em; color: ' + INK[sys], groups, has: groups.length > 0 };
  });
  // ---------- ready lists ----------
  const ready = SYS.map(([sys, title]) => {
    const cap = readyCap(c, sys), now = readyTechniques(c, sys), set = new Set(now);
    const items = P.known.filter((id) => TECHNIQUE[id] && TECHNIQUE[id].system === sys && !TECHNIQUE[id].free).map((id) => {
      const on = set.has(id), full = !on && now.length >= cap, off = fight || full;
      return { key: id, label: TECHNIQUE[id].name + (on ? ' ✓' : ''), pressed: on ? 'true' : 'false', off, title: fight ? lockText : full ? cap + ' ready: take one out first.' : (on ? 'Take it out of your ready list.' : 'Ready it.'),
        style: chip(on, off && !on, INK[sys]), toggle: () => { if (off) return toast(fight ? lockText : cap + ' ready: take one out first.'); run({ type: 'phys/ready', charId: c.id, system: sys, ids: on ? now.filter((x) => x !== id) : [...now, id] }); } };
    });
    return { key: sys, title: title + ' · READY ' + now.length + ' / ' + cap, titleStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.16em; color: ' + INK[sys], items, has: items.length > 0, none: !items.length,
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
      style: 'display: flex; justify-content: space-between; gap: 8px; font-size: 12px; ' + (m.reached ? 'color: #E7EBF3' : 'color: #7F8BA1'), mark: m.reached ? '✓' : '○' }));
    const picks = open ? pickable(c, wid).map((id) => ({ key: id, label: TECHNIQUE[id].name, title: TECHNIQUE[id].text, style: chip(false, false, INK[weaponSystem(wid)]), pick: () => { run({ type: 'phys/pick', charId: c.id, weaponId: wid, id }); sc.setState({ arPick: null }); } })) : [];
    return { key: wid, name: w.name, icon: gearIconUri(wid), hasIcon: !!gearIconUri(wid), total: d + ' drill', next: next ? (next.at - d) + ' drill to mark ' + ['I', 'II', 'III'][M.indexOf(next)] : 'All three marks reached',
      props: weaponProps(wid).map((p) => p.toUpperCase()).join(' · '), held: held.includes(wid) ? 'IN HAND' : '', hasHeld: held.includes(wid),
      fill: 'height: 100%; border-radius: 99px; background: ' + INK[weaponSystem(wid)] + '; width: ' + fill + '%', ticks: marksAt.map((at, i) => ({ key: 't' + i, style: 'position: absolute; top: -2px; bottom: -2px; width: 2px; background: #0A0D13; left: ' + Math.round((at / top) * 100) + '%' })),
      marks, owed, hasOwed: owed > 0, owedText: owed + (owed === 1 ? ' pick waiting' : ' picks waiting'), open, picks, noPicks: open && !picks.length,
      toggle: () => { if (fight) return toast(lockText); sc.setState({ arPick: open ? null : wid }); }, toggleLabel: open ? 'Close' : 'Pick a technique' };
  });
  // ---------- quivers: each bow carried, loaded out of a fight from the arrows you carry ----------
  const bows = [...new Set([...held, ...packOf(c).filter((it) => it.weapon && WEAPON[it.weapon]).map((it) => it.weapon)])].filter((id) => weaponProps(id).includes('drawn'));
  const arrows = {}; for (const it of packOf(c)) if (it.calibre && /arrow/i.test(it.calibre)) { const t = it.ammoType || 'standard'; arrows[t] = (arrows[t] || 0) + (it.qty || 0); }
  const quivers = bows.map((wid) => {
    const w = WEAPON[wid], cap = w.magazine || 0, saved = (P.quiver || {})[wid] || {}, draft = (S.arQuiver && S.arQuiver[wid]) || saved;
    const types = [...new Set([...Object.keys(arrows), ...Object.keys(saved)])];
    const total = types.reduce((s, t) => s + (draft[t] || 0), 0);
    const set = (t, n) => sc.setState({ arQuiver: { ...(sc.state.arQuiver || {}), [wid]: { ...draft, [t]: Math.max(0, n) } } });
    return { key: wid, name: w.name, icon: gearIconUri(wid), hasIcon: !!gearIconUri(wid), cap: 'Capacity ' + cap, total: total + ' / ' + cap + ' loaded', over: total > cap, totalStyle: 'font-size: 12px; font-weight: 700; color: ' + (total > cap ? '#F65157' : '#E7EBF3'),
      rows: types.map((t) => { const n = draft[t] || 0, have = arrows[t] || 0;
        return { key: t, label: (t === 'standard' ? 'Standard' : t.replace(/_/g, ' ')) + ' arrows', have: have + ' carried', n: String(n), dec: () => set(t, n - 1), inc: () => set(t, n + 1), decOff: fight || n <= 0, incOff: fight || n >= have || total >= cap }; }),
      hasRows: types.length > 0, noRows: !types.length, none: 'You carry no arrows for it.', apply: () => { if (fight) return toast(lockText); run({ type: 'phys/quiver', charId: c.id, weaponId: wid, load: draft }); sc.setState({ arQuiver: null }); },
      applyOff: fight || total > cap, note: 'A quiver is filled before the fight: in a fight a bow can\'t be reloaded, and you pick each shot\'s arrow from what is loaded.' };
  });
  return { has: true, fight, lockText, hasLock: fight, known, ready, drill, hasDrill: drill.length > 0, noDrills: !drill.length, noDrill: 'Hold a weapon (or fight with one) to start its drill bar.', quivers, hasQuivers: quivers.length > 0, card,
    headStyle: 'display: flex; flex-direction: column; gap: 8px' };
}
