// 0.31.11 (ATTACK-PLAN 19 Nov, lane 1; docs/design/proposals/2026-11-18-scout-outburst-and-strain.md 1.3): the Outburst
// workshop draws the first school's ways (Damage: Strike, Finish, Brand, Drain), one line a way, from the school's data;
// a way picked is what the design saves (the real magic/design action through the store).
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, SCHOOL, type GameState, type Sheet } from '@engine';

vi.stubGlobal('window', { scrollTo: () => {}, addEventListener: () => {}, removeEventListener: () => {}, location: { search: '', hash: '' }, innerWidth: 1400, innerHeight: 900 });
vi.stubGlobal('location', { search: '', hash: '' });
let G: GameState;
const view = () => ({ game: viewFor(G, 'host'), me: { id: 'host', name: 'Leon' }, role: 'host', screen: 'main', toast: null, savedAt: 0 });
vi.mock('../game/store', () => ({ getState: () => view(), act: (a: any) => { G = apply(G, a, 'host'); }, go: () => {}, toast: () => {}, polishText: async () => '', retryNarrator: () => {}, saveNow: () => {}, subscribe: () => () => {} }));
const { MainLogic } = await import('./main.js');
const TPL = readFileSync(new URL('../templates/main.template.html', import.meta.url), 'utf-8');

function story() {
  const a = ARCHETYPES.find((x) => x.id === 'field_medic') || ARCHETYPES[0];
  const sheet = { name: 'Vale', portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any as Sheet;
  G = newGame('ROOM', { id: 'host', name: 'Leon' }, 'seed-ways');
  G = apply(G, { type: 'char/add', sheet } as any, 'host'); G = apply(G, { type: 'session/start' } as any, 'host');
  const c: any = Object.values(G.characters)[0];
  c.soulKnown = { schools: ['damage'], modules: [], tones: [] }; c.skills.will_power = Math.max(c.skills.will_power || 0, 2); c.outbursts = [];
  const L: any = new MainLogic({}); L.setState({ tab: 'magic' });
  return { c, L };
}

describe('the Outburst workshop: the first school\'s ways', () => {
  it('Damage shows its four ways, one line each from the school\'s data; Strike is picked first; a pick is what the design saves', () => {
    const { c, L } = story();
    expect(L.renderVals().mg.soul.canNew).toBe(true);
    L.renderVals().mg.soul.newDesign();
    const b = () => L.renderVals().mg.b;
    expect(b().hasOptions).toBe(true);
    expect(b().options.map((o: any) => o.label)).toEqual(['Strike', 'Finish', 'Brand', 'Drain']);
    const OT = (SCHOOL as any).damage.option_text;
    for (const o of b().options) { expect(o.text.length, o.key).toBeGreaterThan(0); expect(OT[o.key]).toContain(o.text); expect(o.text).not.toMatch(/^(Strike|Finish|Brand|Drain): /); }
    expect(b().options.filter((o: any) => o.pressed === 'true').map((o: any) => o.label)).toEqual(['Strike']);
    b().options.find((o: any) => o.label === 'Brand').pick();
    expect(b().options.filter((o: any) => o.pressed === 'true').map((o: any) => o.label)).toEqual(['Brand']);
    L.setState({ mgDraft: { ...L.state.mgDraft, name: 'Mark' } });
    b().save();
    const d = (G.characters[c.id] as any).outbursts.find((x: any) => x.name === 'Mark');
    expect(d && d.school).toBe('damage'); expect(d.option).toBe('brand');
  });
  it('the template draws the row: one row a way (its button, then its line)', () => {
    const i = TPL.indexOf('{{mg.b.hasOptions}}'), row = TPL.slice(i, TPL.indexOf('</sc-if>', TPL.indexOf('</sc-for>', i)) + 8);
    expect(row).toMatch(/<sc-for list="\{\{mg\.b\.options\}\}" as="o"><div data-way="\{\{o\.key\}\}"/);
    expect(row).toContain('{{o.label}}'); expect(row).toContain('{{o.text}}');
  });
});
