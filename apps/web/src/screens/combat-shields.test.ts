// 0.30.0, the shield display (Leon, 16 Nov 2026: one tiny bar over the HP made every shield look like one sum, and
// hovering a token, even a friend's, showed only HP). Through the real screen (CombatLogic.renderVals) on a real fight:
// a unit with two shields has two segments on its token's strip and two lines on its card, in the order a blow meets
// them; a friend's card shows them exactly; a foe's shows its shields by name with a size word, never a number; Guard
// is a line of its own (and stays the token's plates), never a segment.
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, active, RULES, shieldsView, type GameState, type Sheet } from '@engine';

let G: GameState; const ME = 'host';
let snap: any = null;
const view = () => ({ game: viewFor(G, ME), me: { id: ME, name: 'Leon' }, role: 'host', screen: 'combat', toast: null, savedAt: 0 });
const doAct = (a: any) => { G = apply(G, a, ME); snap = view(); };
vi.mock('../game/store', () => ({ getState: () => snap || (snap = view()), subscribe: () => () => {}, act: (a: any) => { try { doAct(a); } catch (e: any) { if (e?.name !== 'RuleError' && e?.constructor?.name !== 'RuleError') throw e; } },
  go: () => {}, toast: () => {}, polishText: async () => '', retryNarrator: () => {}, saveNow: () => {}, poke: () => {} }));
vi.mock('../game/report', () => ({ openReport: () => {}, PlaytestTools: () => null }));
const { CombatLogic } = await import('./combat.js');
const { shieldStrip, shieldBlock, inkOf, GLYPH, hpShieldBar } = await import('../game/shieldLook');
const L: any = (RULES as any).combat.shield_look;

const sheetFrom = (archId: string, name: string): Sheet => { const a = ARCHETYPES.find((x) => x.id === archId) || ARCHETYPES[0];
  return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'soldier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any; };
/** Two of the squad (yours and a friend's, both the host's here) and a hostile, on your turn. */
function fight(room = 'ROOM') {
  snap = null; G = newGame(room, { id: 'host', name: 'Leon' }, 'shield-ui');
  doAct({ type: 'char/add', sheet: sheetFrom('sharpshooter', 'Ilse') }); doAct({ type: 'char/add', sheet: sheetFrom('sharpshooter', 'Bram') });
  doAct({ type: 'session/start' }); doAct({ type: 'narrator/begin' });
  doAct({ type: 'narrator/turn', turn: { narration: 'Guns.', combat: { name: 'Yard', difficulty: 'easy', enemies: [{ name: 'Keel', tier: 'soldier', weapon: 'service_pistol' }] } } });
  const cb: any = G.combat;
  cb.map = { ...cb.map, w: Math.max(14, cb.map.w), h: Math.max(10, cb.map.h), cover: [], full: [], solid: [], difficult: [], dark: false }; cb.objects = []; cb.glyphs = []; cb.zones = [];
  const [u, f] = cb.units.filter((x: any) => x.side === 'pc'), e = cb.units.find((x: any) => x.side === 'foe');
  cb.turn = cb.order.indexOf(u.id); if (cb.turn < 0) cb.turn = 0;
  Object.assign(u, { pos: '2,5', ap: 6 }); Object.assign(f, { pos: '2,6' }); Object.assign(e, { pos: '6,5' });
  for (const x of [u, f, e]) { x.hp = x.maxHp = 200; x.shield = 0; delete x.shields; }
  expect(active(cb)!.id).toBe(u.id);
  return { u, f, e, cb };
}
/** Two shields as the engine keeps them: a layer (the Chaplain's Ward, given by `by`) over the base shield. */
const twoShields = (x: any, by: string) => { x.shields = [{ layer: 'ward', n: 30, by, s: 1 }]; x.shield = 50; snap = view(); };
function screen() { const l: any = new CombatLogic({}); l.setState = (s: any) => { l.state = { ...l.state, ...(typeof s === 'function' ? s(l.state) : s) }; }; return l; }
const tileOf = (v: any, x: any) => v.tiles.find((t: any) => t.key === x.pos);

describe('shields on the token and the card', () => {
  it('your own unit with two shields: one segment at the end of the HP fill (0.31.0), two lines on your card and your panel, in the order a blow meets them', () => {
    const { u, f } = fight(); twoShields(u, f.id);
    const v = screen().renderVals(), t = tileOf(v, u);
    // 0.31.0 (U3): no strip of its own: the pale segment rides the token's HP bar, the bar rescaled (200 HP + 80 shield)
    expect(t.hasShield).toBeUndefined(); expect(t.hasHpSh).toBe(true);
    const hb = hpShieldBar(u.hp, u.maxHp, shieldsView(G.combat as any, u));
    expect(hb.amount).toBe(80); expect(hb.rescaled).toBe(true); expect(hb.hpW).toBeCloseTo(200 / 280 * 100); expect(hb.shW).toBeCloseTo(80 / 280 * 100);
    expect(t.hpSeg).toBe(hb.segStyle); expect(t.hpFill).toContain('width: ' + hb.hpW + '%');
    expect(t.t.sh.lines.map((l: any) => [l.glyph, l.name, l.amount])).toEqual([[GLYPH.layer, 'Ward', '30'], [GLYPH.base, L.base.name, '50']]);
    expect(t.t.sh.absorb).toBe('Absorbs up to 80 before HP'); expect(t.t.sh.head).toBe(L.head);
    // the rule line is your panel's and the target card's, never every hover card (it ran the card off the screen)
    // (0.31.0: on your panel the rule is behind the Shields fold's "?", never a paragraph)
    expect(t.t.sh.hasRule).toBe(false); expect(v.me.sh.hasRule).toBe(false); expect(v.me.hasShRule).toBe(true); expect(v.me.shRule).toBe(L.rule);
    expect(v.me.hb.hasSh).toBe(true); expect(v.me.hb.plus).toBe('+80'); expect(v.me.hb.shTip).toContain('Ward 30'); expect(v.me.shHead).toContain('80');
    expect(v.me.sh.lines).toHaveLength(2); expect(v.me.sh.absorb).toBe('Absorbs up to 80 before HP');
    expect(t.label).toContain(L.head + ': '); expect(t.label).toContain('Ward 30');
    // the chip and the status read every shield, never the base one alone (a friend's row once said +50 with 80 in front)
    // (0.31.0: never a chip of the status strip, never in the one-line summary: the HP bar's segment and its "+80" say it)
    expect(v.me.st.groups.flatMap((g: any) => g.chips).find((c: any) => /shield/i.test(c.key))).toBeUndefined(); expect(v.me.miniLine).not.toContain('SHIELD');
    // the turn strip shows it too, as the same segment on its HP bar
    const card = v.initiative.find((i: any) => i.key === u.id); expect(card.hasSh).toBe(true); expect(card.shSeg).toBe(hb.segStyle); expect(card.shTip).toContain('+80');
  });
  it("a friend's card shows its shields exactly (it used to show only HP)", () => {
    const { u, f } = fight('ROOM-F'); twoShields(f, u.id);
    const v = screen().renderVals(), t = tileOf(v, f);
    expect(t.t.ally).toBe(true); expect(t.t.sh.has).toBe(true);
    expect(t.t.sh.lines.map((l: any) => l.amount)).toEqual(['30', '50']); expect(t.t.sh.lines[0].lasts).toContain('from ' + u.name);
    const row = v.allyRows.find((r: any) => r.key === f.id); expect(row.t.sh.lines).toHaveLength(2);
    expect(row.fx).toContain('+80 SHIELD'); expect(row.fx).not.toContain('+50 SHIELD');
  });
  it("a foe's shields read by name with a size word (shield_look.size), never a number; its strip is drawn at the word's width", () => {
    const { u, e } = fight('ROOM-E'); e.shield = 60; snap = view(); // 30% of its max HP
    const v = screen().renderVals(), t = tileOf(v, e), sv = shieldsView(G.combat as any, e);
    expect(sv.known).toBe(false);
    expect(t.t.sh.lines.map((l: any) => [l.name, l.amount])).toEqual([[L.base.name, 'STRONG']]);
    expect(t.t.sh.absorb).toBe('Absorbs ' + sv.allWord + ' before HP'); expect(t.t.sh.absorb).not.toMatch(/\d/);
    expect(t.label).not.toContain('60');
    // its HP is not known: the bar holds only the segment, at the word's share of max HP
    expect(t.hasHp).toBe(true); expect(t.hpSeg).toContain('width: ' + (L.size.find((r: any) => r.word === 'strong').bar * 100).toFixed(2) + '%');
    // the target card: the same block, and the line that says the attack's damage is shown before the shields
    const l = screen(); l.setState({ target: e.id, action: 'shot' }); const tv = l.renderVals().target;
    expect(tv.sh.lines).toHaveLength(1); expect(tv.sh.hasRule).toBe(true); void u;
  });
  it('Guard is listed apart, "Guard N plates, each soaks S", and is never a segment of the strip; your own panel says it once (its row)', () => {
    const { u } = fight('ROOM-G'); u.resMax = { ...(u.resMax || {}), guard: 5 }; u.res = { ...(u.res || {}), guard: 3 }; u.shield = 20; snap = view();
    const v = screen().renderVals(), t = tileOf(v, u), sv = shieldsView(G.combat as any, u);
    expect(t.hasHpSh).toBe(true); expect(t.hpSeg).not.toContain('NaN'); expect(t.hasGuard).toBe(true);
    expect(t.t.sh.hasGuard).toBe(true); expect(t.t.sh.hasGuardLast).toBe(true); expect(t.t.sh.guardLine).toBe('Guard 3 plates, each soaks ' + sv.guard!.soak);
    // the headline is what an ordinary blow meets (a plate is kept back); the drop case is its own line
    expect(t.t.sh.absorb).toBe('Absorbs up to ' + (20 + 2 * sv.guard!.soak) + ' before HP');
    expect(t.t.sh.absorbDrop).toBe('up to ' + (20 + 3 * sv.guard!.soak) + ' against a blow that would drop it');
    expect(v.me.sh.hasGuard).toBe(false); expect(v.me.sh.has).toBe(true);
  });
  it('the strip: a small shield still shows; the strip stops at the HP bar with a "+"; each pip pairs its ink with a glyph and a name', () => {
    const base = { known: true, maxHp: 100, guard: null, blow: 0, all: 0, allWord: 'faint', rule: 'r' };
    // the kinds differ by more than colour: a layer is solid, the base shield hatched
    const e = (key: string, kind: 'layer' | 'base', bar: number, attribute: string | null) => ({ key, kind, name: key, attribute, by: null, amount: bar * 100, size: null, bar, lasts: 'x', combines: 'separate', how: '', order: 1 });
    const small = shieldStrip({ ...base, entries: [e('a', 'base', 0.01, null)] });
    expect(small.segs[0].width).toBe(10); expect(small.over).toBe(false);
    const big = shieldStrip({ ...base, entries: [e('a', 'layer', 0.8, 'virtue'), e('b', 'base', 0.6, null)] });
    expect(big.segs.reduce((a, s) => a + s.width, 0)).toBe(100); expect(big.over).toBe(true);
    const b = shieldBlock({ ...base, entries: [e('a', 'layer', 0.2, 'virtue')] });
    expect(b.lines[0]).toMatchObject({ glyph: GLYPH.layer, name: 'a', ink: inkOf({ attribute: 'virtue' }) });
    expect(big.segs[0].style).toContain('background: ' + inkOf({ attribute: 'virtue' })); expect(big.segs[1].style).toContain('repeating-linear-gradient');
  });
});
