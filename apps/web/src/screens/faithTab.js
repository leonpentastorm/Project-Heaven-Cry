// The sheet's FAITH tab (Blessing 2.0, rules 1.6): the Faith panel, the story's prayer buttons with their targets, the
// engine's rites, and the patron's line cards in the story stream. Everything comes from game/faithView.ts (the engine's
// faithView and previewPrayer); this file is screen glue: state, words and styles. Buttons only, never a typed field.
import { faithView, previewPrayer, FAITH_PATRON } from '@engine';
import { faithPanel, prayerButtons, prayAction, pickerFor, FAITH_INK, FAITH_GOLD } from '../game/faithView';
import { accentOf, patronMarkUri } from '../game/faithArt';
import { act, toast } from '../game/store';

const btnStyle = (on, off, ink = '#FFFFFF') => 'display: grid; grid-template-columns: 32px minmax(0, 1fr); gap: 2px 10px; align-items: center; text-align: left; width: 100%; padding: 8px 10px; border-radius: 10px; font-family: inherit; color: #E7EBF3; cursor: ' + (off ? 'default' : 'pointer')
  + '; ' + (off ? 'border: 1px dashed #2E3A50; background: transparent; opacity: 0.6' : on ? 'border: 1px solid ' + ink + '; background: #1C2536' : 'border: 1px solid #2E3A50; background: #10151F');
const chip = (on, off) => 'min-height: 30px; padding: 0 12px; border-radius: 999px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: ' + (off ? 'default; opacity: 0.45; ' : 'pointer; ')
  + (on ? 'border: 1px solid ' + FAITH_INK + '; background: rgba(211, 106, 144, 0.16); color: #FFFFFF' : 'border: 1px solid #2E3A50; background: #10151F; color: #E7EBF3');

/** The values the FAITH tab's template reads (fa.*). `sc` is the main screen (state: faOpen, faPick). */
export function faithTabVals(sc, g, c) {
  const S = sc.state;
  if (!g || !c) return { has: false };
  const v = faithView(g, c.id), P = faithPanel(v);
  if (!P) return { has: false };
  const story = g.phase === 'story' && !c.dead;
  const B = prayerButtons(v), all = [...B.whispers, ...B.hymns, ...(B.miracle ? [B.miracle] : [])];
  const nameOf = (id) => g.characters[id]?.name || id;
  const pick = S.faPick || {}, setPick = (p) => sc.setState({ faPick: { ...(sc.state.faPick || {}), ...p } });
  const pray = (b, args) => { act(prayAction({ charId: c.id }, b, args)); sc.setState({ faOpen: null, faPick: null }); };
  const view = (b) => {
    const why = !story ? (g.phase === 'combat' ? 'In a fight, pray from the FAITH actions on your turn.' : 'Pray once the session is under way.') : !b.ok ? b.why : '';
    // A place or an enemy in the story is the Narrator's to rule (engine item 624): sent as it is, no pick.
    const pk = pickerFor(b.target), narr = pk.kind === 'tile' || b.target === 'enemy', open = !why && S.faOpen === b.key, needs = pk.kind !== 'none' && !narr;
    const tileWhy = '';
    let opts = [], verdict = '', ready = false, args = {};
    if (open) {
      const pv0 = previewPrayer(g, c.id, b.kind, b.id), ids = pv0.targets || [], two = pk.kind === 'two';
      const chosen = [pick.targetId, pick.targetId2].filter(Boolean);
      opts = ids.map((id) => { const on = chosen.includes(id);
        return { key: id, label: nameOf(id) + (id === c.id ? ' (you)' : ''), pressed: on ? 'true' : 'false', style: chip(on, false),
          pick: () => { if (!two) return setPick({ targetId: on ? undefined : id, targetId2: undefined });
            const now = [sc.state.faPick?.targetId, sc.state.faPick?.targetId2].filter(Boolean), next = on ? now.filter((x) => x !== id) : [...now, id].slice(-2);
            setPick({ targetId: next[0], targetId2: next[1] }); } }; });
      args = two ? { targetId: chosen[0], targetId2: chosen[1] } : { targetId: chosen[0] };
      const missing = tileWhy || (!ids.length ? 'No one to pray for here.' : !chosen.length ? (two ? 'Pick two.' : 'Pick who it goes to.') : two && chosen.length < 2 ? 'Pick a second one.' : '');
      const pv = missing ? null : previewPrayer(g, c.id, b.kind, b.id, args);
      ready = !!pv && pv.ok; verdict = missing || (pv.ok ? (pv.effectText || 'Ready.') : pv.why || 'Not now.');
    }
    return { key: b.key, icon: b.icon, name: b.name, text: b.text + (narr && story ? ' In the story, the Narrator rules where it lands.' : ''), meta: b.ap + ' · ' + b.gate + ' · ' + b.odds, warn: b.warn || '', hasWarn: !!b.warn, why: why || '', hasWhy: !!why,
      off: !!why, pressed: open ? 'true' : 'false', style: btnStyle(open, !!why, FAITH_INK),
      aria: b.name + ' (' + b.kind + ')' + (why ? ': ' + why : needs ? ': choose, then confirm' : ''),
      click: () => { if (why) return toast(why); if (!needs) return pray(b, {}); sc.setState({ faOpen: open ? null : b.key, faPick: null }); },
      open, opts, hasOpts: opts.length > 0, verdict, verdictStyle: 'font-size: 12px; line-height: 1.4; color: ' + (ready ? '#6FEA77' : '#A3AEC2'),
      cantConfirm: !ready, confirm: () => { if (!ready) return toast(verdict || 'Not now.'); pray(b, args); }, cancel: () => sc.setState({ faOpen: null, faPick: null }) };
  };
  const meter = P.meter.filter((m) => m.n > 0).map((m) => ({ key: m.n, gate: m.gate || '', hasGate: !!m.gate, label: String(m.n),
    style: 'height: 12px; border-radius: 3px; ' + (m.on ? 'background: ' + FAITH_INK : 'background: transparent; border: 1px solid #2E3A50') + (m.gate ? '; box-shadow: 0 0 0 1px ' + FAITH_GOLD : '') }));
  const rites = P.rites.map((r) => { const why = r.kept ? 'Kept this session.' : !story && r.engine ? 'Out of a fight.' : r.why || '';
    return { key: r.id, name: r.name, text: r.text, state: r.kept ? '✓ KEPT THIS SESSION' : r.engine ? (r.available ? 'READY' : 'NOT NOW') : 'THE NARRATOR MARKS IT',
      isEngine: r.engine, off: !r.available || r.kept || !story, why, label: r.kept ? '✓ Kept' : 'Keep the rite',
      keep: () => (why || !r.available ? toast(why || 'Not now.') : act({ type: 'faith/rite', charId: c.id, id: r.id })),
      style: 'min-height: 32px; padding: 0 12px; border-radius: 8px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; ' + (!r.available || r.kept || !story ? 'border: 1px dashed #2E3A50; background: transparent; color: #7F8BA1' : 'border: 1px solid ' + FAITH_INK + '; background: transparent; color: #FFFFFF') }; });
  return {
    has: true, ...P, faithful: P.faithful, atheist: !P.faithful, hasVow: !!P.vow, vow: P.vow || {}, hasRule: !!P.rule, hasLikes: P.likes.length > 0, hasTaboos: P.taboos.length > 0,
    likes: P.likes.map((t) => ({ key: t, t })), taboos: P.taboos.map((t) => ({ key: t, t })),
    meter, devotionLine: P.faithful ? 'DEVOTION ' + P.devotion + ' / 10' : '', faithLine: 'FAITH ' + v.faith,
    headStyle: 'display: flex; gap: 12px; align-items: center; padding: 12px; border-radius: 12px; background: #0D1119; border: 1px solid #232D3F; border-top: 3px solid ' + P.accent,
    witnessedStyle: 'display: inline-flex; align-items: center; gap: 6px; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; ' + (P.witnessed.on ? 'border: 1px solid ' + FAITH_GOLD + '; color: #FFFFFF' : 'border: 1px dashed #2E3A50; color: #7F8BA1'),
    witnessedTitle: P.witnessed.can ? 'Witnessed: your patron is watching this fight (Faith 5 and up).' : 'Being Witnessed needs a patron and Faith 5.',
    hasClosed: !!P.closed, rites, hasRites: rites.length > 0, hasPieces: P.pieces.length > 0, hasLearned: P.learned.length > 0,
    learned: P.learned.map((h) => ({ key: h.name, text: h.name + ' · ' + h.patronName + (h.tn ? ' · TN ' + h.tn : '') })),
    whispers: B.whispers.map(view), hymns: B.hymns.map(view), hasHymns: B.hymns.length > 0, miracle: B.miracle ? view(B.miracle) : {}, hasMiracle: !!B.miracle,
    prayHead: story ? 'PRAY · THE STORY' : 'PRAY', anyOpen: all.some((b) => S.faOpen === b.key),
  };
}

/** A patron's line as a card in the story stream or the combat log (an entry or a patron_line event that names a patron). */
const BY_NAME = () => Object.fromEntries(Object.values(FAITH_PATRON).map((p) => [String(p.name).toUpperCase(), p.id]));
/** Which patron a story entry is the voice of: its patron field, or a system line headed with the patron's name (faith.ts). */
export function patronOfEntry(e) {
  if (!e) return null; if (e.patron) return e.patron;
  return e.kind === 'system' && e.head && /^".*"$/s.test(String(e.text || '').trim()) ? BY_NAME()[String(e.head).toUpperCase()] || null : null;
}
/** A combat log line in the patron's voice ('Mother Ember: "…"'), as {patron, text}, or null. */
export function patronOfLog(line) {
  const m = /^(.+?): "(.*)"$/s.exec(String(line || '')); if (!m) return null;
  const id = BY_NAME()[m[1].toUpperCase()]; return id ? { patron: id, text: m[2] } : null;
}
export function patronLineCard(e) {
  const pid = patronOfEntry(e); if (!pid) return null;
  const name = (FAITH_PATRON[pid]?.name || pid).toUpperCase();
  return { patronMark: patronMarkUri(pid), patronName: name + (e.head && String(e.head).toUpperCase() !== name ? ' · ' + String(e.head).toUpperCase() : ''), patronText: String(e.text || '').replace(/^"(.*)"$/s, '$1'),
    patronStyle: 'margin: 0; display: grid; grid-template-columns: 32px minmax(0, 1fr); gap: 2px 10px; align-items: start; padding: 10px 12px; border-radius: 10px; background: #10151F; border: 1px solid #232D3F; border-left: 3px solid ' + accentOf(pid),
    patronHeadStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.14em; color: ' + FAITH_INK,
    patronTextStyle: "margin: 0; font-family: 'Spectral', serif; font-size: 15px; font-style: italic; line-height: 1.5; color: #E7EBF3" };
}
