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
  ['items', { archetype: 'field_medic', level: 12 }, (f: any) => { f.g.characters[f.pc.charId].stims = 3; f.unit(f.pc.id).throwables = { frag_grenade: 2, smoke_grenade: 1 } as any; }],
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
      // the review's reach finding: an aim step with choices also sends where it reaches (shaded on select)
      if (!m.reach.length) bad.push(d.id + ': choices but no reach');
      for (const k of m.choices) if (!goes(g, u.id, d, { ...p, [st.key]: k })) { bad.push(d.id + ': choice ' + k + ' is refused'); break; }
      const others = cands.filter((k) => !m.choices.includes(k)).sort((a, b) => dist(a, u.pos) - dist(b, u.pos)).slice(0, 3);
      for (const k of others) if (goes(g, u.id, d, { ...p, [st.key]: k })) { bad.push(d.id + ': ' + k + ' is not a choice, yet it goes'); break; }
    }
    expect(bad, name).toEqual([]);
    expect(tried, name + ': pick steps walked').toBeGreaterThan(0);
  });
});

// Rules 1.65 item 5108.1 (the review's fog finding): a pick's choices are worked out on the side's view. A Hidden hostile
// standing on a tile the side sees, inside a Figment's reach, makes no mark of any kind: no unit mark, no target or area
// mark on its tile, and no gap in the choices (its tile reads as free, as it does for the unit's own Move; the reducer
// refuses it on the click).
describe('rules 1.65: the picking contract keeps the fog', () => {
  it('a Hidden foe beside a Figment: no unit mark, no gap in its Move or Redraw choices', () => {
    const f = fightWith([cls('trickster')], [{ at: '12,12' }], { level: 12 });
    const me = f.unit(f.pc.id); me.pos = '5,5';
    f.turn(me.id); f.act({ type: 'combat/perk', unitId: me.id, id: 'verb:picture', choice: 'beast', tile: '5,6' } as any);
    const beast = f.cb.units.find((v: any) => v.owned?.kind === 'figment' && !v.dead)!;
    expect(beast, 'a Beast pictured').toBeTruthy();
    const foe = f.foe; foe.pos = '6,7'; foe.hidden = true;
    const u = f.turn(me.id); u.ap = Math.max(u.ap, 6);
    expect([...visibility(f.cb, 'pc').tiles], 'the foe\'s tile is in sight').toContain('6,7');
    const ids = actionsFor(f.g, u.id, 'host').map((d) => d.id).filter((id) => id.startsWith('ow:' + beast.id + ':') && /:(move|figment_redraw)$/.test(id));
    expect(ids.length, 'the Beast\'s Move or Redraw is offered').toBeGreaterThan(0);
    for (const id of ids) {
      const pv = previewDescriptor(f.g, u.id, id, {}, 'host')!;
      const choice = pv.marks.tiles.filter((t) => t.kind === 'choice').map((t) => t.tile);
      expect(pv.marks.units.map((m) => m.id), id + ': no mark on the hidden foe').not.toContain(foe.id);
      expect(pv.marks.tiles.filter((t) => t.tile === '6,7' && (t.kind === 'area' || t.kind === 'target' as any)).length, id + ': no area on its tile').toBe(0);
      // no gap: if the tiles round it are choices, so is its own
      const round = ['5,7', '7,7', '6,8', '7,6'].filter((k) => choice.includes(k));
      if (round.length >= 2) expect(choice, id + ': no hole on the hidden foe\'s tile').toContain('6,7');
      // and the hover on it tells nothing of the foe
      const hv = previewDescriptor(f.g, u.id, id, { tile: '6,7' }, 'host')!;
      expect(hv.marks.units.map((m) => m.id), id + ': hovering its tile names no one').not.toContain(foe.id);
      expect(JSON.stringify(hv.lines), id + ': no line names the foe').not.toContain(foe.name);
    }
  });
});

// Rules 1.65 items 5104, 5108.3 (E2, the review's finding): a heal's or a shield's net gain on whom it goes to, from the engine's own
// run (the one mend's report), FIRST among the preview's notes (the hover line reads the first two), "no gain" with why.
describe('rules 1.65: a mend says its net gain', () => {
  const firstNote = (pv: any) => (pv.lines.find((l: any) => l.k === 'note' || l.k === 'odds') || {}).text || '';
  const stage = (spec: CharSpec) => {
    const f = fightWith([spec, { name: 'Ally', archetype: 'field_medic' }], [{ at: '12,12' }], { level: 12 });
    const me = f.unit(f.pc.id), ally = f.pcs.find((u: any) => u.id !== me.id)!; me.pos = '5,5'; ally.pos = '4,5';
    const u = f.turn(me.id); u.ap = 9; return { f, u, ally };
  };
  const FAITHFUL: CharSpec = { archetype: 'confessor', level: 12, attrs: { virtue: 10 }, skills: { faith: 10 } };
  it('a Health Whisper: on a hurt ally the HP it brings, on a full one no gain, on a Downed one it stands again', () => {
    const { f, u, ally } = stage(FAITHFUL);
    ally.hp = ally.maxHp - 30;
    let pv = previewDescriptor(f.g, u.id, 'pr:whisper:health', { targetId: ally.id }, 'host')!;
    expect(pv.ok, pv.why || '').toBe(true);
    expect(firstNote(pv).startsWith('Ally: ' + (ally.maxHp - 30) + ' → '), firstNote(pv)).toBe(true); expect(firstNote(pv)).toMatch(/^Ally: \d+ → \d+ \(\+\d+\)/);
    expect(pv.marks.units.find((m) => m.id === ally.id)?.tag).toMatch(/→/);
    ally.hp = ally.maxHp;
    pv = previewDescriptor(f.g, u.id, 'pr:whisper:health', { targetId: ally.id }, 'host')!;
    if (pv.ok) expect(firstNote(pv)).toBe('Ally: no gain: already at full HP'); else expect(pv.why).toBeTruthy();
    ally.hp = 0; ally.downed = true;
    pv = previewDescriptor(f.g, u.id, 'pr:whisper:health', { targetId: ally.id }, 'host')!;
    if (pv.ok) expect(firstNote(pv)).toMatch(/^Ally: stands again at \d+ HP/); else expect(pv.why).toBeTruthy();
  });
  it('Protection twice: the second says your shield is already on them', () => {
    const { f, u, ally } = stage(FAITHFUL);
    let pv = previewDescriptor(f.g, u.id, 'pr:whisper:protection', { targetId: ally.id }, 'host')!;
    expect(pv.ok, pv.why || '').toBe(true);
    expect(firstNote(pv)).toMatch(/^Ally: shield 0 → \d+ \(\+\d+\)/);
    // the first one on: what it said it gives stands on them, given by you (as grantShield leaves it)
    const n = Number((firstNote(pv).match(/→ (\d+)/) || [])[1]); expect(n).toBeGreaterThan(0);
    const a1: any = f.unit(ally.id); a1.shield = n; a1.shieldBy = u.id;
    const u2 = u;
    pv = previewDescriptor(f.g, u2.id, 'pr:whisper:protection', { targetId: ally.id }, 'host')!;
    expect(pv.ok, pv.why || '').toBe(true);
    expect(firstNote(pv)).toBe('Ally: no gain: your shield is already on them');
    // someone else's shield as big: not "yours"
    const a2: any = f.unit(ally.id); a2.shieldBy = 'someone-else'; a2.shield = 999;
    pv = previewDescriptor(f.g, u2.id, 'pr:whisper:protection', { targetId: ally.id }, 'host')!;
    expect(firstNote(pv)).toBe('Ally: no gain: a shield as big already stands (999)');
  });
  it('a stim on a hurt ally says what it heals, on a full one no gain (or the refusal)', () => {
    const { f, u, ally } = stage({ archetype: 'field_medic' });
    f.g.characters[f.pc.charId!].stims = 3;
    ally.hp = ally.maxHp - 30;
    let pv = previewDescriptor(f.g, u.id, 'stim', { targetId: ally.id }, 'host')!;
    expect(pv.ok, pv.why || '').toBe(true);
    expect(firstNote(pv)).toMatch(/^Ally: \d+ → \d+ \(\+\d+\)/);
    ally.hp = ally.maxHp;
    pv = previewDescriptor(f.g, u.id, 'stim', { targetId: ally.id }, 'host')!;
    if (pv.ok) expect(firstNote(pv)).toBe('Ally: no gain: already at full HP'); else expect(pv.why).toBeTruthy();
    pv = previewDescriptor(f.g, u.id, 'stim_throw', { targetId: ally.id }, 'host')!;
    if (pv.ok) expect(firstNote(pv)).toBe('Ally: no gain: already at full HP'); else expect(pv.why).toBeTruthy();
  });
  it('Tending\'s Mend says what it heals first', () => {
    const { f, u, ally } = stage(cls('bard'));
    ally.hp = ally.maxHp - 30;
    const id = actionsFor(f.g, u.id, 'host').find((d) => /tend_mend$/.test(d.id))!.id;
    const pv = previewDescriptor(f.g, u.id, id, { targetId: ally.id }, 'host')!;
    expect(pv.ok, pv.why || '').toBe(true);
    expect(firstNote(pv)).toMatch(/^Ally: \d+ → \d+ \(\+\d+\)/);
  });
});
