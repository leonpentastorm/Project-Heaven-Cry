// Faith in a fight (Blessing 2.0, rules 1.6): the vow prompt at the start of a fight, and the patron's lines as cards
// beside the combat log. A prayer itself is on the one action flow (game/actionFlow.ts): its targets, verdict, words and
// what Confirm sends are the engine's descriptor (descriptors.ts). This is screen glue for screens/combat.js.
import { faithView, beliefOf, FAITH_MIN, FAITH_PATRON, DEVOTION_XP, HYMN_COOLDOWN } from '@engine';
import { faithPanel, FAITH_INK, FAITH_GOLD } from '../game/faithView';
import { accentOf, patronFace, patronMarkUri, vowIconUri } from '../game/faithArt';
import { patronOfLog, FACE_BOX } from './faithTab';

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
    sub: 'Fulfilled in the fight: your next Hymn comes ' + HYMN_COOLDOWN.vowCut + ' round sooner (once for each Hymn). Kept to the end of the fight: +' + DEVOTION_XP.vowKept + ' Devotion XP. Broken: −' + DEVOTION_XP.vowBroken + ', and your patron says so. Or fight unsworn.',
    vows: v.vows.map((x) => ({ key: x.id, icon: vowIconUri(x.id), name: x.name, words: x.words, title: (x.fulfilledWhen ? 'Fulfilled when: ' + x.fulfilledWhen + '. ' : '') + 'Broken when: ' + x.brokenWhen, pressed: shield && x.id === 'shield' ? 'true' : 'false',
      pick: () => (x.needsAlly ? sc.setState({ vowShield: shield ? null : key }) : swear(x.id)),
      style: 'display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: 1px 8px; align-items: center; text-align: left; min-height: 40px; padding: 5px 8px; border-radius: 8px; font-family: inherit; color: #E7EBF3; cursor: pointer; '
        + (shield && x.id === 'shield' ? 'border: 1px solid ' + FAITH_INK + '; background: #1C2536' : 'border: 1px solid #2E3A50; background: #10151F') })),
    skip: () => { SKIPPED.add(key); sc.setState({ vowShield: null }); },
    /** A grid click while Shield waits for its ally. */
    click: (u) => (shield && u && u.side === cur.side && u.id !== cur.id && !u.dead ? (swear('shield', u.id), true) : false),
    style: 'display: flex; flex-direction: column; gap: 6px; padding: 10px; border-radius: 10px; background: #0D1119; border: 1px solid #232D3F; border-left: 3px solid ' + FAITH_INK,
  };
}

/** A combat log line as a patron's card when it is one ('Mother Ember: "…"', faith.ts), else null. */
export function patronLogCard(line) {
  const x = patronOfLog(line); if (!x) return null;
  // Faith 2.2 (spec 2.6): a small round crop of the patron's face (the mark where there is no painting).
  const f = patronFace(x.patron);
  return { isPatron: true, patron: x.patron, mark: patronMarkUri(x.patron), face: f.src, faceStyle: f.imgStyle, faceBox: FACE_BOX(26, accentOf(x.patron), true), text: x.text, head: (FAITH_PATRON[x.patron]?.name || x.patron).toUpperCase(),
    style: 'display: grid; grid-template-columns: 26px minmax(0, 1fr); gap: 1px 8px; align-items: start; padding: 6px 8px; border-radius: 8px; background: #10151F; border: 1px solid #232D3F; border-left: 3px solid ' + accentOf(x.patron) };
}

// ---------- the FAITH tab's header in a fight (Faith 2.2, spec 2.4) ----------
/** Your patron's portrait beside the Devotion meter (its words and the XP toward the next level) and whether you are
 *  Witnessed; a click on the portrait opens it large (the lightbox). Faithful characters only. */
export function faithHeadVals(sc, g, cur, zoomer) {
  const no = { show: false };
  if (!g || !cur || !cur.charId) return no;
  const P = faithPanel(faithView(g, cur.charId));
  if (!P || !P.faithful || !P.patronId) return no;
  const name = P.title, NAME = String(name).toUpperCase();
  return {
    show: true, patron: P.patronId, name, hasPortrait: !!P.portrait, noPortrait: !P.portrait, img: P.portrait || P.mark,
    zoom: zoomer(sc, P.portraitLarge || P.portrait || P.mark, name, 'patron'), label: 'View ' + name + ' large',
    devotion: P.devotion, devotionText: P.devotionText, xpNext: P.xpNextText,
    xpFillStyle: 'height: 100%; border-radius: 99px; width: ' + Math.round(P.xpFill * 100) + '%; background: var(--faith-light, ' + FAITH_GOLD + ')',
    witnessed: P.witnessed.on, witnessedText: P.witnessed.on ? 'WITNESSED · UNTIL THE FIGHT ENDS OR ' + NAME + ' ACTS' : P.witnessed.can ? 'NOT WITNESSED · A HYMN ANSWERED MAKES YOU' : 'NOT WITNESSED',
    witnessedIcon: P.witnessed.icon,
    witnessedStyle: 'display: inline-flex; align-items: center; gap: 5px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em; line-height: 1.3; color: ' + (P.witnessed.on ? '#FFFFFF' : '#7F8BA1'),
    btnStyle: 'display: block; flex: none; width: 44px; height: 55px; padding: 0; border-radius: 6px; overflow: hidden; background: #05070B; cursor: zoom-in; border: 1px solid ' + P.accent,
    style: 'display: flex; gap: 10px; align-items: center; padding: 6px 8px; border-radius: 10px; background: #0D1119; border: 1px solid #232D3F; border-left: 3px solid ' + P.accent,
  };
}
