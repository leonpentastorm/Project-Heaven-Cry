// Rules 1.65 (the picking contract, 0.31.5): every action that asks the player to choose a unit or a tile sends, from
// the engine's own preview, the legal choices of the step that is open (GridMarks: units with the tone 'choice', tiles
// of the kind 'choice'), and its reach; and those choices are exactly what the reducer takes. The guard walks every
// action a unit is offered in a prepared fight (actionsFor), over characters that between them hold every base class,
// every door, a patron of each kind and the common items, and for each pick step:
//   1. a legal target exists → the preview sends a non-empty 'choice' (or 'reach') set;
//   2. every choice, with the later picks filled from the engine's own next choices, goes through the reducer (on a
//      copy: previewAction);
//   3. three candidates that are not choices are refused by the reducer.
// An action that fails is a defect; the exempt list below says why each one is left out (none should be).
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { actionsFor, previewDescriptor, sendDescriptor, previewAction, stepOn, CLASS, makeObject, setDevotionXp, devotionThreshold, visibility, type ActionDescriptor, type Picks, type PickStep, type GameState } from '../src';
import { fightWith, type CharSpec } from './helpers/perkfight';

/** Left out, and why. */
const EXEMPT: Record<string, string> = {
  // the Outburst's own overlay (aimOverlay: its reach ring, its area and whom it touches, by the stage) draws the Release's
  // and the Snap's aim; the descriptor's aim step is optional and any tile is an aim (a direction): it satisfies the contract
  release: 'Outburst aim: any tile is a direction; its own overlay (aimOverlay) draws reach, area and marks',
};
const UNIT_KINDS = ['enemy', 'ally', 'unit'];
const aimOf = (st: PickStep) => (UNIT_KINDS.includes(st.kind) ? 'unit' : st.kind === 'tile' ? 'tile' : null);

/** Fill the picks before the first unit or tile step (options: the first open one; a perk's form: its first open
 * choice; an optional custom panel: left), and return that step, or null (no grid pick, or a required custom panel:
 * the Evoke planner, the glyph keyboard's own). */
function upToAim(d: ActionDescriptor, p: Picks): PickStep | null | 'custom' {
  for (const st of d.picks) {
    if (!stepOn(st, p) || p[st.key] != null) continue;
    if (aimOf(st)) return st;
    if (st.kind === 'option') { const o = (st.options || []).find((x) => !x.why); if (o) p[st.key] = st.max && st.max > 1 ? [o.id] : o.id; else if (!st.optional) return null; continue; }
    if (st.renderer === 'perk-form') { const o = (st.options || []).find((x) => !x.why); if (o) p[st.key] = { choice: o.id }; else if (!st.optional) return null; continue; }
    if (st.optional) continue;
    return 'custom';
  }
  return null;
}
/** Fill every later pick from the engine's own preview, then ask the reducer (on a copy). */
function goes(g: GameState, uid: string, d: ActionDescriptor, p: Picks): boolean {
  const q: Picks = { ...p };
  for (let i = 0; i < 6; i++) {
    const st = upToAim(d, q); if (st === 'custom') return false; if (!st) break;
    const pv = previewDescriptor(g, uid, d.id, q, 'host'); const live = pv?.next?.key === st.key ? pv.next : null;
    const c = (live?.choices || []).find((k) => !Object.values(q).includes(k));
    if (!c) { if (st.optional) break; return false; }
    q[st.key] = c;
  }
  const a = sendDescriptor(g, uid, d.id, q, 'host'); if (!a) return false;
  return previewAction(g, a, 'host').ok;
}
/** The choices the preview marks for the open step. */
function marked(g: GameState, uid: string, d: ActionDescriptor, p: Picks, st: PickStep): { choices: string[]; reach: string[] } {
  const pv = previewDescriptor(g, uid, d.id, p, 'host')!;
  if (aimOf(st) === 'unit') return { choices: pv.marks.units.filter((m) => m.tone === 'choice').map((m) => m.id), reach: pv.marks.tiles.filter((t) => t.kind === 'reach').map((t) => t.tile) };
  return { choices: pv.marks.tiles.filter((t) => t.kind === 'choice').map((t) => t.tile), reach: pv.marks.tiles.filter((t) => t.kind === 'reach').map((t) => t.tile) };
}
const dist = (a: string, b: string) => { const [ax, ay] = a.split(',').map(Number), [bx, by] = b.split(',').map(Number); return Math.max(Math.abs(ax - bx), Math.abs(ay - by)); };

const PATRONS = ['nerukhan', 'the_quartermaster', 'the_laughing_mask', 'toll_keeper', 'mother_ember', 'old_overcast', 'the_matchmaker', 'counting_weaver'];
const ALPHA: Record<string, string> = { endurance: 'durability', strength: 'raw_power', agility: 'dexterity', perception: 'ingenuity', intelligence: 'brain_power', expression: 'visualization', insight: 'empathy', determination: 'will_power', virtue: 'faith' };
const KIT: Record<string, string> = { mage: 'sigil', channeler: 'soul' };
/** A base class at rank III, its door's alpha skill full. */
const cls = (id: string): CharSpec => { const at = (CLASS as any)[id].attribute; return { classId: id, level: 12, attrs: { [at]: 10 }, skills: { [ALPHA[at]]: 10 }, ...(KIT[id] ? { kit: KIT[id] } : {}), ...(id === 'trickster' ? { forms: ['eye', 'wall', 'ward', 'beast', 'blade', 'husk', 'sentinel'], offHand: 'visualizer', weapon: 'service_pistol' } : {}), ...(id === 'bard' ? { offHand: 'attuner', weapon: 'service_pistol' } : {}) }; };
const BUILDS: [string, CharSpec, (f: any) => void][] = [
  ...['defender', 'fighter', 'marksman', 'infiltrator', 'mage', 'trickster', 'bard', 'channeler', 'guardian'].map((id) => [id, cls(id), (f: any) => {
    // the Rigger: a Beast pictured through the reducer, so its orders are on the list too
    if (id === 'trickster') { const u = f.turn(f.pc.id); f.act({ type: 'combat/perk', unitId: u.id, id: 'verb:picture', choice: 'beast', tile: '5,6' } as any); }
    if (id === 'infiltrator') { const u = f.unit(f.pc.id); u.hidden = true; u.res = { ...(u.res || {}), shadow: 2 }; }
  }] as [string, CharSpec, (f: any) => void]),
  ...PATRONS.map((p) => ['faithful of ' + p, { archetype: 'confessor', level: 12, attrs: { virtue: 10 }, skills: { faith: 10 } }, (f: any) => { const c = f.g.characters[f.pc.charId]; c.belief = { kind: 'faithful', patron: p }; c.patron = p; setDevotionXp(c, devotionThreshold(10)); c.devotion = 10; }] as [string, CharSpec, (f: any) => void]),
  ['items', { archetype: 'field_medic' }, (f: any) => { f.g.characters[f.pc.charId].stims = 3; f.unit(f.pc.id).throwables = { frag_grenade: 2, smoke_grenade: 1 } as any; }],
];

describe('rules 1.65: the picking contract', () => {
  for (const [name, spec, setup] of BUILDS) it(name + ': every pick step marks its choices, and they are what the reducer takes', () => {
    const f = fightWith([spec, { name: 'Ally', archetype: 'field_medic' }], [{ at: '7,5' }, { at: '5,8' }], { level: 12 });
    // the stage: the unit at 5,5, an ally beside it hurt, a low wall to vault, a door, a lamp, a turret
    const me = f.unit(f.pc.id), ally = f.pcs.find((u: any) => u.id !== me.id)!;
    me.pos = '5,5'; ally.pos = '4,5'; ally.hp = Math.max(1, ally.maxHp - 30);
    f.cb.objects = [...(f.cb.objects || []), makeObject('pk_wall', 'low_wall', '6,6'), makeObject('pk_door', 'door', '5,4'), makeObject('pk_lamp', 'lamp', '3,6'), makeObject('pk_turret', 'turret', '6,4')];
    setup(f);
    const u = f.turn(me.id), g = f.g; u.ap = Math.max(u.ap, 6);
    const seenT = [...visibility(f.cb, 'pc').tiles] as string[];
    const bad: string[] = []; let tried = 0;
    for (const d of actionsFor(g, u.id, 'host')) {
      if (d.pad || !d.available || EXEMPT[d.id] || ['move', 'sprint', 'disengage'].includes(d.id)) continue;
      const p: Picks = {}; const st = upToAim(d, p); if (!st || st === 'custom') continue;
      tried++;
      const m = marked(g, u.id, d, p, st);
      const cands = aimOf(st) === 'unit' ? f.cb.units.filter((v: any) => v.id !== u.id || st.kind !== 'enemy').map((v: any) => v.id) : seenT;
      if (!m.choices.length) {
        // no choice marked: then nothing near is legal (each unit; for tiles, the ones within 3 and under the units)
        const probe = aimOf(st) === 'unit' ? cands : cands.filter((k) => dist(k, u.pos) <= 3 || f.cb.units.some((v: any) => v.pos === k));
        const any = probe.find((k) => goes(g, u.id, d, { ...p, [st.key]: k }));
        if (any) bad.push(d.id + ': no choice marked, but ' + any + ' goes');
        continue;
      }
      for (const k of m.choices) if (!goes(g, u.id, d, { ...p, [st.key]: k })) { bad.push(d.id + ': choice ' + k + ' is refused'); break; }
      const others = cands.filter((k) => !m.choices.includes(k)).sort((a, b) => dist(a, u.pos) - dist(b, u.pos)).slice(0, 3);
      for (const k of others) if (goes(g, u.id, d, { ...p, [st.key]: k })) { bad.push(d.id + ': ' + k + ' is not a choice, yet it goes'); break; }
    }
    expect(bad, name).toEqual([]);
    expect(tried, name + ': pick steps walked').toBeGreaterThan(0);
  });
});
