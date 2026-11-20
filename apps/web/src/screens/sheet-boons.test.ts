// 0.33 (Leon on live 0.32.0: "Add a 'from boons' tab for the perk tab that show the boons taken"): the sheet's PERKS tab
// has a FROM BOONS fold beside TRAITS, PERKS and FROM YOUR SKILLS. Through the reducer: a Survival test room's camp gives
// its starting boon (run/start with the Recommended loadout), and the fold lists it by name with its text from data
// (numbers filled); with no run, and on a run with no boon, it says so in words.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, relicRow, type GameState, type Sheet } from '@engine';

vi.stubGlobal('window', { scrollTo: () => {}, addEventListener: () => {}, removeEventListener: () => {}, location: { search: '', hash: '' }, innerWidth: 1400, innerHeight: 900 });
vi.stubGlobal('location', { search: '', hash: '' });
let G: GameState;
const view = () => ({ game: viewFor(G, 'host'), me: { id: 'host', name: 'Leon' }, role: 'host', screen: 'main', toast: null, savedAt: 0 });
const doAct = (a: any) => { G = apply(G, a, 'host'); };
vi.mock('../game/store', () => ({ getState: () => view(), act: (a: any) => doAct(a), go: () => {}, toast: () => {}, polishText: async () => '', retryNarrator: () => {}, saveNow: () => {} }));
const { MainLogic } = await import('./main.js');
const TPL = readFileSync(new URL('../templates/main.template.html', import.meta.url), 'utf-8');
const sheetFrom = (archId: string, name: string): Sheet => { const a = ARCHETYPES.find((x) => x.id === archId)!;
  return { name, portrait: '', origin: 'Thousand-Planet frontier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any; };
const perksTab = () => { const L: any = new MainLogic({}); L.setState({ tab: 'perks' }); return L.renderVals(); };

describe('the PERKS tab: FROM BOONS (0.33)', () => {
  it('a run\'s boons by name with their text from data; none, and no run, in words', () => {
    G = newGame('BOONS', { id: 'host', name: 'Leon' }, 'boons'); (G as any).settings.play = 'survival'; (G as any).settings.test = true;
    doAct({ type: 'char/add', sheet: sheetFrom('sharpshooter', 'Gun') });
    let v = perksTab();
    expect(v.noBoons).toBe(true); expect(v.boons).toEqual([]); expect(v.noBoonsLine).toMatch(/^No run under way\./);
    doAct({ type: 'run/start', seed: 'PHC-0003', camp: 'recommended' });
    if ((G as any).run.state === 'loadout') doAct({ type: 'run/ready', close: true });
    const c: any = Object.values(G.characters)[0];
    expect(c.relics.length).toBeGreaterThan(0); // the camp's starting boon
    v = perksTab();
    expect(v.hasBoons).toBe(true);
    const want = c.relics.map((id: string) => relicRow(id)).filter(Boolean);
    expect(v.boons.map((b: any) => b.name)).toEqual(want.map((r: any) => r.name));
    for (const b of v.boons) { expect(b.text).toBeTruthy(); expect(b.text).not.toMatch(/\{=|undefined|NaN/); expect(b.icon).toBeTruthy(); expect(b.sub).toMatch(/From the camp/); }
    c.relics = []; (G.characters as any)[c.id] = c;
    v = perksTab(); expect(v.noBoons).toBe(true); expect(v.noBoonsLine).toMatch(/^No boons yet\./);
  });
  it('the fold sits beside TRAITS, PERKS and FROM YOUR SKILLS on the PERKS tab, remembered as the others', () => {
    const tab = TPL.slice(TPL.indexOf('{{tabPerks}}'), TPL.indexOf('{{tabGear}}'));
    const at = (w: string) => tab.indexOf('>' + w + '<');
    expect(at('TRAITS')).toBeGreaterThan(0); expect(at('PERKS')).toBeGreaterThan(at('TRAITS')); expect(at('FROM YOUR SKILLS')).toBeGreaterThan(at('PERKS'));
    expect(at('FROM BOONS')).toBeGreaterThan(at('FROM YOUR SKILLS'));
    expect(tab).toContain('data-fold="{{pkFold.boons.id}}"'); expect(perksTab().pkFold.boons.id).toBe('sheet:perks:boons');
  });
});
