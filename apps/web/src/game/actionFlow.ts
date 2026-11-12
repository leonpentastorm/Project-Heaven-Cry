// The one action flow (client boundary 3; engine review 4, finding 3). A screen holds the picked action's id and what
// has been picked for it; everything else is the engine's descriptor (actionsFor) and preview (previewDescriptor):
//
//   flowView(g, me, cur, S)     the picked action on the flow: its descriptor, the engine's preview, the panel's words
//                               (name, text, extra), the option chips, the units and tiles to mark, and
//     .click(unit, tile)        what a grid click picks next (a state patch), or null for the screen's own default
//     .action                   what Confirm sends (null: not ready; .why says why)
//
// Where a pick lives in the screen's state: a unit in S.target (S.target2 for a second one), a tile in S.tile, and every
// other pick (an option, a perk's form, a pile's checklist) in S.picks[key]. Nothing here works out a cost, a range, a
// legality check or a target list: a step's choices and the verdict are the engine's. A system whose actions are
// descriptors needs NO code here (docs/design/handoffs/client-boundary-3-actions.md, "How to add an action").
import { previewDescriptor, actionsFor, stepOn, type ActionDescriptor, type DescriptorPreview, type PickStep, type Picks } from '@engine';

/** The descriptor previews that run on this flow. A system not listed keeps its own screen code (Sigils and Outbursts:
 *  the glyph keyboard and the HEART panel; a Move's hover route), until it moves here. */
export const FLOW_PREVIEWS = new Set(['basic', 'attack', 'perk']);
/** Ids that stay with their own screen code even though their system is on the flow. */
const OWN = new Set(['move', 'sprint', 'disengage']);

const UNIT_KINDS = ['enemy', 'ally', 'unit'];
const memo = new WeakMap<object, Map<string, any>>();
/** Ask the engine once per game state and question (a mouse move re-renders the screen; the state hasn't changed). */
function cached<T>(g: any, key: string, f: () => T): T {
  if (!g || typeof g !== 'object') return f();
  let m = memo.get(g); if (!m) memo.set(g, (m = new Map()));
  if (!m.has(key)) m.set(key, f());
  return m.get(key);
}
/** Every descriptor of this unit for this viewer, once per game state. */
export const descriptorsOf = (g: any, unitId: string, me: string | null): ActionDescriptor[] => cached(g, 'list|' + unitId + '|' + me, () => { try { return actionsFor(g, unitId, me); } catch { return []; } });

export interface FlowChip { key: string; label: string; title: string; on: boolean; off: boolean; pick: Picks }
export interface FlowView {
  d: ActionDescriptor; pv: DescriptorPreview; picks: Picks;
  /** AP the picked action will take (the engine's: after the picks, the items and anything lent). */
  cost: number;
  sel: { name: string; text: string; extra: string };
  /** The option steps as chips under the action (Order's things, a technique's line and its options). */
  chips: FlowChip[];
  /** Units to ring (a prayer's picks) and the preview's area and targets (a technique, a perk). */
  ring: Set<string>; area: string[]; targets: string[];
  ready: boolean; action: any | null;
  /** What a grid click does: a state patch for the screen, or null (the screen's own default runs). */
  click: (u: { id: string; side: string } | null, k: string) => Record<string, any> | null;
  /** The state to clear after Confirm. */
  after: Record<string, any>;
}

/** Where the screen keeps a step's pick. */
const slot = (st: PickStep) => (UNIT_KINDS.includes(st.kind) ? (st.key === 'targetId2' ? 'target2' : 'target') : st.kind === 'tile' ? 'tile' : null);
/** The picks the screen holds for this descriptor. An enemy pick starts on the screen's target (or the first hostile
 *  standing), as the target card does; a unit or a tile is kept only while it is one of the step's choices. */
export function picksOf(d: ActionDescriptor, S: any, cb: any, cur: any, extra: Picks = {}): Picks {
  const p: Picks = {}, own = S.picks && S.picks.__id === d.id ? S.picks : {};
  for (const st of d.picks) {
    const where = slot(st);
    if (!where) { if (own[st.key] != null) p[st.key] = own[st.key]; continue; }
    const v = S[where], ok = (x: any) => x != null && (!st.choices || st.choices.includes(x));
    if (ok(v)) { p[st.key] = v; continue; }
    // the first standing hostile, as the target card has it (an enemy or "anyone" pick, never a prayer's or an ally's)
    if (where === 'target' && (st.kind === 'enemy' || st.kind === 'unit') && d.preview !== 'prayer' && !st.optional && cb) {
      const f = cb.units.find((u: any) => u.side !== cur.side && !u.dead && !u.downed && (!st.choices || st.choices.includes(u.id)));
      if (f) p[st.key] = f.id;
    }
  }
  if (Array.isArray(S.mods) && S.mods.length) p.mods = S.mods;
  return { ...p, ...extra };
}

/** The picked action on the flow, or null when it is not (no action, not this player's turn, a system with its own
 *  screen code). extra: picks a bespoke panel made (a perk's form, a pile's checklist). */
export function flowView(g: any, me: string | null, cur: any, S: any, extra: Picks = {}): FlowView | null {
  if (!g || !cur || !S || !S.action || OWN.has(S.action)) return null;
  const d = descriptorsOf(g, cur.id, me).find((x) => x.id === S.action);
  if (!d || !FLOW_PREVIEWS.has(d.preview)) return null;
  const cb = g.combat, picks = picksOf(d, S, cb, cur, extra);
  const pv = cached(g, 'pv|' + cur.id + '|' + me + '|' + d.id + '|' + JSON.stringify(picks), () => { try { return previewDescriptor(g, cur.id, d.id, picks, me); } catch (e: any) { return null; } });
  if (!pv) return null;
  const say = (ks: string[]) => pv.lines.filter((l) => ks.includes(l.k)).map((l) => l.text);
  const notes = say(['odds', 'note']), more = say(['meter', 'save', 'cost']);
  const text = !pv.ok && pv.why && !pv.ask ? pv.why : pv.ask ? pv.ask + (d.preview === 'technique' || d.preview === 'call' ? ' ' + d.text : '') : notes.join(' ') || d.text;
  const own = S.picks && S.picks.__id === d.id ? S.picks : {};
  const chips: FlowChip[] = [];
  for (const st of d.picks) {
    if (st.kind !== 'option' || st.renderer || !stepOn(st, picks)) continue;
    const cur0 = own[st.key], list: string[] = Array.isArray(cur0) ? cur0 : cur0 != null ? [cur0] : [];
    for (const o of st.options || []) {
      const on = !!(list.includes(o.id)) || (cur0 == null && st.optional && st.key === 'line' && o === st.options![0]) || (cur0 == null && st.optional && st.key === 'opt' && o.id === '') || false;
      const next = st.max && st.max > 1 ? (list.includes(o.id) ? list.filter((x) => x !== o.id) : [...list, o.id].slice(-st.max)) : on && st.optional ? null : o.id;
      chips.push({ key: st.key + '-' + (o.id || 'plain'), label: o.label, title: (o.text || o.label) + (o.why ? ' · ' + o.why : ''), on, off: !!o.why, pick: { picks: { ...own, __id: d.id, [st.key]: next }, ...(st.key === 'opt' && d.preview === 'call' ? { tile: null } : {}) } });
    }
  }
  const ring = new Set<string>(), area: string[] = [], targets: string[] = [];
  if (d.preview === 'prayer') for (const k of ['targetId', 'targetId2']) if (picks[k]) ring.add(picks[k]);
  if (d.preview === 'perk' || d.preview === 'technique') {
    area.push(...pv.marks.tiles.filter((t) => t.kind === 'area').map((t) => t.tile));
    const ids = pv.marks.units.map((m) => m.id);
    if (d.preview === 'perk' || ids.length > 1 || area.length) targets.push(...ids); // one target: the target card names it
  }
  const action = pv.ok && !pv.ask ? pv.action : null;
  const click = (u: { id: string; side: string } | null, k: string): Record<string, any> | null => {
    const steps = d.picks.filter((st) => stepOn(st, picks));
    if (u && u.id) {
      const fits = steps.filter((st) => UNIT_KINDS.includes(st.kind) && (!st.choices || st.choices.includes(u.id)));
      if (!fits.length) return null;
      // two at once (a prayer for two): a click adds or takes one away
      const two = fits.find((st) => st.key === 'targetId2');
      if (two) { const now = [S.target, S.target2].filter((x) => x && x !== u.id && (!two.choices || two.choices.includes(x))); const sel = [S.target, S.target2].includes(u.id) ? now : [...now, u.id].slice(-2); return { target: sel[0] || null, target2: sel[1] || null }; }
      return { target: u.id, readTile: null };
    }
    const tile = steps.find((st) => st.kind === 'tile' && (!st.choices || st.choices.includes(k)));
    if (!tile) return null;
    return { tile: S.tile === k && tile.optional ? null : k };
  };
  return { d, pv, picks, cost: pv.ap, sel: { name: d.name + (pv.cost ? ' · ' + pv.cost : ''), text, extra: more.join(' · ') }, chips, ring, area, targets, ready: !!action, action, click,
    after: { tile: null, picks: null, ...(d.preview === 'prayer' ? { target: null, target2: null } : {}) } };
}
