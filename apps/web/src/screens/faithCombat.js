// Faith in a fight (Blessing 2.0, rules 1.6): a prayer's targets picked on the grid with the engine's preview as the
// verdict, the vow prompt at the start of a fight, and the patron's lines as cards beside the combat log. The rules are
// the engine's (faithView, previewPrayer); this is screen glue for screens/combat.js.
import { faithView, previewPrayer, beliefOf, FAITH_MIN, FAITH_PATRON } from '@engine';
import { prayAction, pickerFor, oddsText, FAITH_INK } from '../game/faithView';
import { accentOf, patronMarkUri, vowIconUri } from '../game/faithArt';
import { PATRON_LINES } from '../game/fx/faith';

const NEED = { unit: 'Click who it goes to.', two: 'Click two on the grid.', tile: 'Click a tile.' };
const SIDE = { ally: 'an ally', enemy: 'an enemy', any: 'anyone' };

/** The chosen prayer: its picks (S.target, S.target2, S.tile), the engine's verdict, the payload, and the grid click. */
export function prayerView(g, cb, cur, sel, S) {
  const pv0 = previewPrayer(g, cur.id, sel.kind, sel.id), pk = pickerFor(pv0.target), valid = new Set(pv0.targets || []);
  const nameOf = (id) => (cb.units.find((u) => u.id === id) || {}).name || id;
  const chosen = pk.kind === 'unit' ? [S.target].filter((id) => id && valid.has(id)) : pk.kind === 'two' ? [S.target, S.target2].filter((id) => id && valid.has(id)) : [];
  const tile = pk.kind === 'tile' ? S.tile || null : null;
  const args = pk.kind === 'unit' && chosen[0] ? { targetId: chosen[0] } : pk.kind === 'two' ? { ...(chosen[0] ? { targetId: chosen[0] } : {}), ...(chosen[1] ? { targetId2: chosen[1] } : {}) } : tile ? { tile } : {};
  const missing = pk.kind === 'none' ? '' : pk.kind === 'tile' ? (tile ? '' : NEED.tile) : pk.kind === 'two' ? (chosen.length < 2 ? (chosen.length ? 'Click a second one.' : NEED.two) : '')
    : chosen.length ? '' : !valid.size ? 'No one in sight to pray for.' : 'Click ' + (pk.dead ? 'a fallen ally' : pk.downed ? 'a Downed ally' : pk.self ? 'yourself or an ally' : SIDE[pk.side] || 'a target') + '.';
  const pv = !pv0.ok ? pv0 : missing ? null : previewPrayer(g, cur.id, sel.kind, sel.id, args);
  const ready = !!pv && pv.ok, picked = chosen.map(nameOf).join(' and ') || (tile ? 'tile ' + tile : '');
  const why = !pv0.ok ? pv0.why : pv && !pv.ok ? pv.why : '';
  return {
    ink: FAITH_INK, ap: pv0.ap, ready, chosen, tile,
    payload: prayAction({ unitId: cur.id }, sel, args),
    sel: {
      name: (sel.kind === 'miracle' ? '✦ MIRACLE · ' : sel.kind === 'hymn' ? 'HYMN · ' : 'WHISPER · ') + pv0.name + ' · ' + pv0.ap + ' AP · ' + oddsText(pv || pv0),
      text: why ? '✕ ' + why : (picked ? 'Target: ' + picked + '. ' : '') + (missing || pv0.effectText),
      extra: pv0.mode === 'overreach' && pv0.overreach ? 'Overreach: you ask above your standing. TN ' + pv0.overreach.tn + '; a miss costs 1 Devotion.'
        : pv0.mode === 'dice' && pv0.roll ? 'By dice: d20 ' + (pv0.roll.mod >= 0 ? '+ ' : '− ') + Math.abs(pv0.roll.mod) + ' against TN ' + pv0.roll.tn + '.' : 'By standing: no roll.',
    },
    /** A grid click while this prayer is chosen: the state patch, or null to let the screen handle it. */
    click(u, k) {
      if (pk.kind === 'tile') return { tile: k };
      if (!u || !valid.has(u.id)) return null;
      if (pk.kind === 'unit') return { target: u.id };
      if (pk.kind === 'two') { const now = chosen.includes(u.id) ? chosen.filter((x) => x !== u.id) : [...chosen, u.id].slice(-2); return { target: now[0] || null, target2: now[1] || null }; }
      return null;
    },
  };
}

// ---------- the vow prompt (round 1, a Faithful character's first turn; skippable) ----------
const SKIPPED = new Set();
/** The quiet prompt: the 6 vows as buttons; "Shield" asks for the ally (a chip or a click on the grid). */
export function vowPromptVals(sc, g, cb, cur, mineTurn, act) {
  const no = { show: false, vows: [], allies: [], hasAllies: false };
  if (!mineTurn || !cur || !cur.charId || cb.round !== 1 || cur.vow || cb.over) return no;
  const c = g.characters[cur.charId]; if (!c || beliefOf(c).kind !== 'faithful' || (c.skills?.faith || 0) < FAITH_MIN) return no;
  const key = (g.code || '') + ':' + (cb.id || cb.name) + ':' + cur.id; if (SKIPPED.has(key)) return no;
  const v = faithView(g, c.id); if (!v) return no;
  const S = sc.state, shield = S.vowShield === key;
  const swear = (id, allyId) => { act({ type: 'faith/vow', unitId: cur.id, id, ...(allyId ? { allyId } : {}) }); sc.setState({ vowShield: null }); };
  const allies = shield ? cb.units.filter((u) => u.side === cur.side && u.id !== cur.id && !u.dead).map((u) => ({ key: u.id, label: u.name, pick: () => swear('shield', u.id) })) : [];
  return {
    show: true, key, shield, allies, hasAllies: allies.length > 0, noAllies: shield && !allies.length,
    head: 'SWEAR A VOW · ' + (v.patron ? v.patron.name.toUpperCase() : 'YOUR PATRON'),
    sub: 'Kept to the end of the fight: +1 Devotion. Broken: −2, and your patron says so. Or fight unsworn.',
    vows: v.vows.map((x) => ({ key: x.id, icon: vowIconUri(x.id), name: x.name, words: x.words, title: 'Broken when: ' + x.brokenWhen, pressed: shield && x.id === 'shield' ? 'true' : 'false',
      pick: () => (x.needsAlly ? sc.setState({ vowShield: shield ? null : key }) : swear(x.id)),
      style: 'display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: 1px 8px; align-items: center; text-align: left; min-height: 40px; padding: 5px 8px; border-radius: 8px; font-family: inherit; color: #E7EBF3; cursor: pointer; '
        + (shield && x.id === 'shield' ? 'border: 1px solid ' + FAITH_INK + '; background: #1C2536' : 'border: 1px solid #2E3A50; background: #10151F') })),
    skip: () => { SKIPPED.add(key); sc.setState({ vowShield: null }); },
    /** A grid click while Shield waits for its ally. */
    click: (u) => (shield && u && u.side === cur.side && u.id !== cur.id && !u.dead ? (swear('shield', u.id), true) : false),
    style: 'display: flex; flex-direction: column; gap: 6px; padding: 10px; border-radius: 10px; background: #0D1119; border: 1px solid #232D3F; border-left: 3px solid ' + FAITH_INK,
  };
}

/** The patron lines heard since this fight began, as cards (newest first, at most 3). */
export function patronLogCards(since) {
  return PATRON_LINES.filter((l) => l.t >= since).slice(-3).reverse().map((l, i) => ({
    key: l.t + ':' + i, mark: patronMarkUri(l.patron), text: l.text, head: ((FAITH_PATRON[l.patron]?.name || l.patron) + ' · ' + (l.event || 'answer').replace(/_/g, ' ')).toUpperCase(),
    style: 'display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: 1px 8px; align-items: start; padding: 6px 8px; border-radius: 8px; background: #10151F; border: 1px solid #232D3F; border-left: 3px solid ' + accentOf(l.patron),
  }));
}
