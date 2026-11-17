// 0.31.x, the SKILLS tab and the skill page (Leon, 17 Nov 2026: "fork menu need to be closeable, and sit below the skill
// in the skill menu"; "make the 'what each point gives' menu collapsable too, and write the text for player reading";
// "In the gamma tab, highlight the call action and how it grows in that menu too"). docs/design/ui-screens.md.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, SKILL, CALL_RULES, callOfSkill, type GameState, type Sheet } from '@engine';

vi.stubGlobal('window', { scrollTo: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => true, location: { search: '', hash: '' }, innerWidth: 1400, innerHeight: 900 });
vi.stubGlobal('location', { search: '', hash: '' });
let G: GameState;
const view = () => ({ game: viewFor(G, 'host'), me: { id: 'host', name: 'Leon' }, role: 'host', screen: 'main', toast: null, savedAt: 0 });
vi.mock('../game/store', () => ({ getState: () => view(), act: (a: any) => { G = apply(G, a, 'host'); }, go: () => {}, toast: () => {}, polishText: async () => '', retryNarrator: () => {}, saveNow: () => {}, subscribe: () => () => {} }));
const { MainLogic } = await import('./main.js');
const { D, epccgVals, callBlock } = await import('./shared');


const MAIN_TPL = readFileSync(new URL('../templates/main.template.html', import.meta.url), 'utf-8');
const EP_TPL = readFileSync(new URL('../templates/epccg.template.html', import.meta.url), 'utf-8');
const holder = (state: any) => { const h: any = { state, setState: (x: any) => { h.state = { ...h.state, ...x }; } }; return h; };

function story(skills: Record<string, number>) {
  const a = ARCHETYPES.find((x) => x.id === 'field_medic')!;
  const sheet = { name: 'MPAT', portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any as Sheet;
  G = newGame('ROOM', { id: 'host', name: 'Leon' }, 'seed-skilltab');
  G = apply(G, { type: 'char/add', sheet } as any, 'host');
  G = apply(G, { type: 'session/start' } as any, 'host');
  const c: any = Object.values(G.characters)[0]; Object.assign(c.skills, skills); for (const k of Object.keys(c.attrs)) c.attrs[k] = 10;
  return { c, L: new MainLogic({}) as any };
}

describe('S1: each door\'s forks sit under its own skill and fold', () => {
  it('the template has no separate forks section: the fork card is inside the skill row\'s loop, after the row', () => {
    expect(MAIN_TPL).not.toMatch(/forks\.has|Your doors' forks/);
    const loop = MAIN_TPL.slice(MAIN_TPL.indexOf('<sc-for list="{{sheetSkills}}"'), MAIN_TPL.indexOf('</sc-for>\n</div>\n</sc-if>', MAIN_TPL.indexOf('<sc-for list="{{sheetSkills}}"')));
    expect(loop).toContain('data-fork-sheet="1"');
    expect(loop.indexOf('data-fork-sheet')).toBeGreaterThan(loop.indexOf('{{s.rowCls}}'));
    expect(loop).toMatch(/data-fold="\{\{s\.fork\.fold\.id\}\}"[^>]*aria-expanded="\{\{s\.fork\.fold\.expanded\}\}"/);
  });
  it('Durability 4: one line "Forks · 1 to pick", folded by default, white; a click opens it and it is remembered', () => {
    const { L } = story({ durability: 4 }); L.state.tab = 'skills'; L.state.core = 'body';
    const row = () => L.renderVals().sheetSkills.find((s: any) => s.key === 'durability');
    expect(row().hasFork).toBe(true);
    expect(row().fork.summary).toBe('Forks · 1 to pick'); expect(row().fork.summaryStyle).toContain('#FFFFFF');
    expect(row().fork.fold.folded).toBe(true); expect(row().fork.fold.expanded).toBe('false');
    row().fork.fold.toggle();
    expect(row().fork.fold.open).toBe(true); expect(row().fork.steps[0].opts.length).toBe(2);
    // a skill that is no door, or a door with no step reached, has no fork card
    expect(L.renderVals().sheetSkills.find((s: any) => s.key === 'pain_threshold').hasFork).toBe(false);
    expect(L.renderVals().sheetSkills.find((s: any) => s.key === 'raw_power').hasFork).toBe(false);
  });
  it('a pick made reads "1 chosen" in the door\'s ink', () => {
    const { c, L } = story({ durability: 5 }); c.doorPicks = { durability: ['fork.guard.provoke'] }; L.state.tab = 'skills'; L.state.core = 'body';
    const f = L.renderVals().sheetSkills.find((s: any) => s.key === 'durability').fork;
    expect(f.summary).toBe('Forks · 1 chosen'); expect(f.summaryStyle).not.toContain('#FFFFFF');
  });
});

describe('S2: what each point gives folds, per skill, remembered', () => {
  it('opens by default (the page was opened for this skill); a click folds it and the fold is kept for that skill only', () => {
    expect(EP_TPL).toMatch(/class="phc-fold-h phc-ep-fold" data-fold="\{\{ep\.fold\.id\}\}"/);
    expect(EP_TPL).toMatch(/<sc-if value="\{\{ep\.fold\.open\}\}"[^>]*>\s*<sc-if value="\{\{ep\.call\.has\}\}"/);
    const h = holder({ epccg: 'guts' });
    expect(epccgVals(h).ep.fold.open).toBe(true);
    epccgVals(h).ep.fold.toggle();
    expect(epccgVals(h).ep.fold.open).toBe(false);
    expect(epccgVals(holder({ epccg: 'durability' })).ep.fold.open).toBe(true);
    epccgVals(h).ep.fold.toggle(); expect(epccgVals(h).ep.fold.open).toBe(true);
  });
});

describe('S3: every skill\'s page has the same layout parts', () => {
  for (const s of D.skills as any[]) {
    it(s.id + ' (' + s.slot + ')', () => {
      const v = epccgVals(holder({ epccg: s.id }), (id: string) => (id === s.id ? 5 : 3)).ep;
      expect(v.steps).toHaveLength(10);
      expect(v.atLabel).toMatch(/^AT \d+( \/ \d+)+$/);
      expect(v.hasHead || v.steps.some((t: any) => t.lines.length)).toBe(true);
      const at = (n: number) => v.steps[n - 1].lines.map((l: any) => l.kind);
      expect(at(10)).toContain('mastered');
      if (s.slot === 'beta') { expect(v.feed.has).toBe(true); expect(v.feed.head).toMatch(/^Feeds [A-Z][\w ]+: \S/); expect(v.feed.top).toMatch(/×/); expect(v.feed.now).toMatch(/^You now: /); }
      else expect(v.feed.has).toBe(false);
      if (s.slot === 'alpha' && (SKILL as any)[s.id].forks?.length) { expect(at(4)).toContain('fork'); expect(at(6)).toContain('fork'); }
      if (s.slot === 'gamma') expect(v.call.has).toBe(true); else expect(v.call.has).toBe(false);
      for (const t of v.steps) for (const l of t.lines) expect(l.text, s.id + ' ' + t.n).not.toMatch(/\{=|undefined|NaN|\bM[1-4]:/);
    });
  }
});

describe('S4: a gamma skill\'s page leads with its Call and how it grows', () => {
  for (const s of (D.skills as any[]).filter((x) => x.slot === 'gamma')) {
    it(s.id + ': YOUR CALL, its AP now, the ladder at its steps, the AP drop and the top, this character\'s step marked', () => {
      const def = callOfSkill(s.id)!;
      const v = epccgVals(holder({ epccg: s.id }), () => 5).ep.call;
      expect(v.name).toBe(def.name); expect(v.text).toBe(def.text);
      const ns = v.ladder.map((x: any) => x.n);
      for (const st of def.steps) expect(ns).toContain(st.at);
      expect(ns).toContain(CALL_RULES.cheap_at); expect(ns).toContain(CALL_RULES.free_at);
      expect(v.ladder.filter((x: any) => x.now).map((x: any) => x.n)).toEqual([CALL_RULES.cheap_at]);
      expect(v.ladder.find((x: any) => x.n === CALL_RULES.cheap_at)!.what).toMatch(new RegExp(CALL_RULES.cheap_ap + ' AP'));
      expect(v.now).toMatch(new RegExp('^' + CALL_RULES.cheap_ap + ' AP now'));
      expect(v.checks).toMatch(/^On checks and Asks you roll \+5/);
      for (const x of v.ladder) expect(x.what).not.toMatch(/\{=|undefined/);
      expect(callBlock(s.id, 2)!.ladder.filter((x: any) => x.now).map((x: any) => x.n)).toEqual([1]);
    });
  }
  it('the Call box is the first thing inside the fold', () => {
    const i = EP_TPL.indexOf('{{ep.fold.open}}'); expect(EP_TPL.indexOf('phc-ep-call')).toBeGreaterThan(i);
    expect(EP_TPL.indexOf('phc-ep-call')).toBeLessThan(EP_TPL.indexOf('phc-ep-every'));
  });
});

