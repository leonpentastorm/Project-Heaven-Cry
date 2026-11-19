// 0.31.x, the SKILLS tab and the skill page (Leon, 17 Nov 2026: "fork menu need to be closeable, and sit below the skill
// in the skill menu"; "make the 'what each point gives' menu collapsable too, and write the text for player reading";
// "In the gamma tab, highlight the call action and how it grows in that menu too"). docs/design/ui-screens.md.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, SKILL, CALL_RULES, callOfSkill, calls, ENGINE_DEEDS, ladderSchedule, type GameState, type Sheet } from '@engine';

vi.stubGlobal('window', { scrollTo: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => true, location: { search: '', hash: '' }, innerWidth: 1400, innerHeight: 900 });
vi.stubGlobal('location', { search: '', hash: '' });
let G: GameState;
const view = () => ({ game: viewFor(G, 'host'), me: { id: 'host', name: 'Leon' }, role: 'host', screen: 'main', toast: null, savedAt: 0 });
vi.mock('../game/store', () => ({ getState: () => view(), act: (a: any) => { G = apply(G, a, 'host'); }, go: () => {}, toast: () => {}, polishText: async () => '', retryNarrator: () => {}, saveNow: () => {}, subscribe: () => () => {} }));
const { MainLogic } = await import('./main.js');
const { D, epccgVals, callBlock, feedBlock } = await import('./shared');
const { doorFeedView } = await import('@engine');


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

describe('S2: the lore is the face; the three folds are closed by default and each kind remembered for all skills (Leon, 19 Nov; 0.31.11 item G)', () => {
  it('"What each level gives", "Perks" and "Forks" start closed; a click on one is kept for that fold kind on every skill, the other kinds untouched', () => {
    expect(EP_TPL).toMatch(/class="phc-fold-h phc-ep-fold" data-fold="\{\{ep\.ladderFold\.id\}\}"/);
    expect(EP_TPL).toMatch(/class="phc-fold-h phc-ep-perks-fold" data-fold="\{\{ep\.perksFold\.id\}\}"/);
    expect(EP_TPL).toMatch(/class="phc-fold-h phc-ep-forks-fold" data-fold="\{\{ep\.forksFold\.id\}\}"/);
    expect(EP_TPL).not.toMatch(/aboutFold|ABOUT THIS VOICE/);
    const h = holder({ epccg: 'guts' }), v = () => epccgVals(h).ep;
    expect([v().ladderFold.open, v().perksFold.open, v().forksFold.open]).toEqual([false, false, false]);
    v().ladderFold.toggle();
    expect([v().ladderFold.open, v().perksFold.open, v().forksFold.open]).toEqual([true, false, false]);
    // one state a fold kind (skill:levels, skill:perks, skill:forks) for the player across the 27 skills
    expect([v().ladderFold.id, v().perksFold.id, v().forksFold.id]).toEqual(['skill:levels', 'skill:perks', 'skill:forks']);
    const other = epccgVals(holder({ epccg: 'durability' })).ep;
    expect([other.ladderFold.open, other.perksFold.open, other.forksFold.open]).toEqual([true, false, false]);
    v().perksFold.toggle(); expect(v().perksFold.open).toBe(true);
    v().ladderFold.toggle(); v().perksFold.toggle();
    expect([v().ladderFold.open, v().perksFold.open]).toEqual([false, false]);
  });
  it('the lore is on the face, every line exactly as written in data: the quote, the lore paragraph, At high levels, Good for, Bad for', () => {
    // the lore sits above the one line and the folds, outside every fold
    expect(EP_TPL.indexOf('phc-ep-lore')).toBeGreaterThan(0);
    expect(EP_TPL.indexOf('phc-ep-lore')).toBeLessThan(EP_TPL.indexOf('class="phc-ep-line"'));
    expect(EP_TPL.indexOf('class="phc-ep-line"')).toBeLessThan(EP_TPL.indexOf('{{ep.ladderFold.open}}'));
    expect(EP_TPL).not.toMatch(/EVERY POINT|atLabel|ep\.head\b|phc-ep-every|YOUR DOOR|ep\.rows|>—</);
    for (const s of D.skills as any[]) {
      const v = epccgVals(holder({ epccg: s.id }), () => 3).ep;
      expect(v.intro, s.id).toBe(s.ep.intro);
      expect(v.loreRows.map((r: any) => [r.head, r.text]), s.id).toEqual([['At high levels:', s.ep.high], ['Good for:', s.ep.good], ['Bad for:', s.ep.bad]].filter((x) => x[1]));
      expect(v.quote.map((q: any) => q.text), s.id).toEqual(s.ep.quote.map((q: string) => (/^\*.*\*$/.test(q) ? q.slice(1, -1) : q.replace(/\*/g, ''))));
      // the lore reads in Spectral at the page's largest reading size
      expect(v.loreStyle).toMatch(/Spectral.*font-size: 17px/);
      // the two explainers every page repeated are said once, at the top of the perk fold (the points the skill's own
      // ladder schedule puts its perk steps at, rules 1.70 item 5537: an alpha's 3, 6, 7 and 9, a beta's or gamma's 3, 5, 7 and 9)
      const ps = ladderSchedule(s.id).perk_steps;
      expect(ps).toEqual(s.slot === 'alpha' ? [3, 6, 7, 9] : [3, 5, 7, 9]);
      expect(JSON.stringify(v).split('A perk step at ' + ps.slice(0, -1).join(', ') + ' and ' + ps[ps.length - 1] + ' points').length - 1, s.id).toBe(1);
    }
  });
});

describe('S3: every skill\'s page has the same layout parts', () => {
  for (const s of D.skills as any[]) {
    it(s.id + ' (' + s.slot + ')', () => {
      const v = epccgVals(holder({ epccg: s.id }), (id: string) => (id === s.id ? 5 : 3)).ep;
      // one row a level, ten of them; the owned bright, the next one marked, the later ones ahead
      expect(v.steps).toHaveLength(10);
      expect(v.steps.map((t: any) => t.state)).toEqual(['owned', 'owned', 'owned', 'owned', 'owned', 'next', 'ahead', 'ahead', 'ahead', 'ahead']);
      expect(v.steps.map((t: any) => t.dot).join('')).toBe('●●●●●◐○○○○');
      expect(v.steps[5].textStyle).toContain('font-weight: 700');
      for (const t of v.steps) {
        expect(t.text, s.id + ' ' + t.n).toBe(t.pieces.map((p: any) => p.text).join(' · '));
        expect(t.text, s.id + ' ' + t.n).not.toMatch(/\{=|undefined|NaN|\bM[1-4]:|^—$/);
        expect(t.pieces.map((p: any) => p.sep)).toEqual(t.pieces.map((_: any, i: number) => i > 0));
      }
      const at = (n: number) => v.steps[n - 1].pieces.map((l: any) => l.kind);
      expect(at(10)).toContain('mastered');
      expect(v.slot).toBe(({ alpha: 'FIGHT', beta: 'SURVIVE', gamma: 'TALK · NOTICE' } as any)[s.slot]);
      expect(v.line.length).toBeGreaterThan(0); expect(v.line).not.toMatch(/\{=/);
      if (s.slot === 'alpha') expect(v.line).toMatch(/^Your door is /);
      for (const t of v.steps) for (const p of t.pieces) if (p.tip) { expect(p.tip).not.toBe(p.text); expect(t.text.includes(p.tip), s.id + ' ' + t.n).toBe(false); }
      if (s.slot === 'beta' && (SKILL as any)[s.id].feed) { expect(v.feed.has).toBe(true); expect(v.feed.text).toMatch(/^Feeds [A-Z][\w ]+ · \S/); expect(v.feed.text).not.toMatch(/You now|Needs /); }
      else expect(v.feed.has).toBe(false);
      if (s.slot === 'alpha' && (SKILL as any)[s.id].forks?.length) for (const n of ladderSchedule(s.id).forks) expect(at(n), s.id + ' fork at ' + n).toContain('fork');
      if (s.slot === 'gamma') expect(v.call.has).toBe(true); else expect(v.call.has).toBe(false);
    });
  }
  it('a beta at 0 points shows no Feeds chip; a page with no character marks no level', () => {
    expect(epccgVals(holder({ epccg: 'pain_threshold' }), () => 0).ep.feed.has).toBe(false);
    const v = epccgVals(holder({ epccg: 'pain_threshold' })).ep;
    expect(v.feed.has).toBe(false); expect(v.steps.every((t: any) => t.state === 'ahead')).toBe(true); expect(v.ptsLine).toBe('');
  });
  it('the next level past the attribute says "Needs <Attribute> n" on its row, once', () => {
    const v = epccgVals(holder({ epccg: 'durability' }), () => 3, { skills: { durability: 3 }, attrs: { endurance: 3 } }).ep;
    expect(v.steps.filter((t: any) => t.hasNeeds).map((t: any) => [t.n, t.needs])).toEqual([[4, 'Needs Endurance 4']]);
    expect(epccgVals(holder({ epccg: 'durability' }), () => 3, { skills: { durability: 3 }, attrs: { endurance: 5 } }).ep.steps.some((t: any) => t.hasNeeds)).toBe(false);
  });
  it('a perk is a row: its name, I: its card line from data, II: only what changes, the state pips; no paragraph, no tag', () => {
    const v = epccgVals(holder({ epccg: 'durability' })).ep, p = v.perks.find((x: any) => x.name === 'Weight of the Wall');
    expect(p.s1).toBe('+2% weapon damage per Guard held, up to +10%');
    expect(p.s2).toBe('+3% per Guard, up to +15%');
    expect(p.pips).toHaveLength(2); expect(p.held).toBe('none');
    expect(EP_TPL).not.toMatch(/phc-ep-t1|p\.meta|Passive/);
    for (const s of D.skills as any[]) for (const q of epccgVals(holder({ epccg: s.id })).ep.perks) {
      expect(q.s1, s.id + ' ' + q.name).toMatch(/\S/); expect(q.s2, s.id + ' ' + q.name).toMatch(/\S/);
      expect(q.s1, s.id + ' ' + q.name).not.toMatch(/\{=|undefined|NaN|\.\s+[A-Z]/); // one line: never two sentences
      expect(q.s2).not.toBe(q.s1);
    }
    // the character's own tier fills the pips
    const held = epccgVals(holder({ epccg: 'durability' }), () => 5, { skills: { durability: 5 }, attrs: { endurance: 5 }, perks: [{ id: 'bulwark', tier: 'II' }] }).ep.perks.find((x: any) => x.key === 'bulwark');
    expect(held.held).toBe('II'); expect(held.pips.every((x: any) => x.style.includes('background:'))).toBe(true);
  });
  it('an alpha with forks has the Forks fold, one row an option with its one line; a beta or gamma has none', () => {
    const v = epccgVals(holder({ epccg: 'durability' })).ep;
    expect(v.hasForks).toBe(true); expect(v.forks.map((f: any) => f.at)).toEqual(ladderSchedule('durability').forks); expect(ladderSchedule('durability').forks).toEqual([4, 8]);
    for (const f of v.forks) for (const o of f.opts) { expect(o.text).toMatch(/\S/); expect(o.icon).toMatch(/\S/); }
    expect(epccgVals(holder({ epccg: 'pain_threshold' })).ep.hasForks).toBe(false);
    expect(epccgVals(holder({ epccg: 'sensory' })).ep.hasForks).toBe(false);
  });
  it('a combo perk whose deed only the Narrator can see is hidden in a run with no Narrator (Survival); the engine\'s deeds stay', () => {
    let hid = 0;
    for (const s of D.skills as any[]) {
      const all = epccgVals(holder({ epccg: s.id })).ep.combos.map((c: any) => c.name);
      const run = epccgVals(holder({ epccg: s.id }), undefined, undefined, { noNarrator: true }).ep.combos.map((c: any) => c.name);
      for (const c of s.ep.combos) expect(run.includes(c.name), s.id + ' ' + c.name).toBe(c.id in ENGINE_DEEDS);
      expect(all).toHaveLength(s.ep.combos.length); hid += all.length - run.length;
    }
    expect(hid).toBeGreaterThan(0);
  });
});

describe('S4: a gamma skill\'s page has its Call in one row; how it grows is on the levels', () => {
  for (const s of (D.skills as any[]).filter((x) => x.slot === 'gamma')) {
    it(s.id + ': YOUR CALL row (name, AP and reach now, what it does in the name\'s hover); each Call step on its level', () => {
      const def = callOfSkill(s.id)!;
      const v = epccgVals(holder({ epccg: s.id }), () => 5).ep;
      expect(v.call.name).toBe(def.name); expect(v.call.tip).toBe(def.text);
      expect(v.call.now).toMatch(new RegExp('^' + calls.callBaseAp(5) + ' AP · reach '));
      const lv = (n: number) => v.steps[n - 1].pieces.filter((p: any) => p.kind === 'call').map((p: any) => p.text);
      for (const st of def.steps) expect(lv(st.at).length, s.id + ' call step at ' + st.at).toBe(1);
      // rules 1.70 item 5535: each row of the price table where the AP drops says the new AP on its level
      for (const r of CALL_RULES.price.slice(1)) if (r.ap !== calls.callBaseAp(r.from - 1)) expect(lv(r.from)[0], s.id + ' price at ' + r.from).toMatch(new RegExp(r.ap + ' AP'));
      // and the top row: twice a turn, paid with the reaction
      expect(lv(calls.CALL_REACT_AT).length).toBe(1); expect(lv(calls.CALL_REACT_AT)[0]).toMatch(/twice/); expect(lv(calls.CALL_REACT_AT)[0]).toMatch(/reaction/);
      for (const t of v.steps) for (const p of t.pieces.filter((x: any) => x.kind === 'call')) expect(p.text.startsWith(def.name + ': ')).toBe(true);
      expect(callBlock(s.id, 2)!.ladder.filter((x: any) => x.now).map((x: any) => x.n)).toEqual([1]);
    });
  }
  it('the Call row sits above the ladder, outside its fold', () => {
    expect(EP_TPL.indexOf('phc-ep-call')).toBeGreaterThan(0);
    expect(EP_TPL.indexOf('phc-ep-call')).toBeLessThan(EP_TPL.indexOf('{{ep.ladderFold.open}}'));
  });
});


describe('the Feeds chip reads this character, not a sheet of its points', () => {
  it('Pain Threshold at level 6: the chip is the engine view on the character (the soak grows with level), with its unit', () => {
    const { c } = story({ durability: 3, pain_threshold: 3 }); c.level = 6;
    const pts = (id: string) => c.skills[id] || 0;
    const real = feedBlock('pain_threshold', pts, c)!, sheet = feedBlock('pain_threshold', pts)!;
    expect(real.now.toLowerCase()).toBe(doorFeedView(c, 'durability')!.line.replace(/^[^:]{1,40}: /, '').toLowerCase());
    expect(real.now).toMatch(/Each Guard plate takes \d+ damage off a hit/);
    expect(real.now).not.toBe(sheet.now); // the level-1 sheet soaks less
    // the page passes the character it was opened for
    const { L } = story({ durability: 3, pain_threshold: 3 }); L.state.epccg = 'pain_threshold';
    expect(L.renderVals().ep.feed.text).toMatch(/^Feeds Durability · Each Guard plate takes \d+ damage off a hit/);
  });
});
