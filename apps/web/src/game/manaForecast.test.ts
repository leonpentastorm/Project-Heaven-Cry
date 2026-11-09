// The mana forecast (game/manaForecast.ts): the band as weather, the gauge, the trend from the client's memory of each
// round's start, the outlook to the next band, and what the air does and what moves it, all from the rules data.
import { beforeEach, describe, expect, it } from 'vitest';
import { MANA_BANDS } from '@engine';
import { manaForecast, noteMana, outlookOf, bandEffects, movers, forecastVals, skyIcon, _resetManaHistory } from './manaForecast';

const fight = (mana: number, round = 1) => ({ name: 'Test fight', map: { id: 'yard' }, order: ['a', 'b'], round, mana });
beforeEach(() => _resetManaHistory());

describe('the mana forecast', () => {
  it('names the band like the weather, with the number, a gauge of the four bands and the marker', () => {
    const f = manaForecast(fight(24));
    expect(f).toMatchObject({ mana: 24, max: 40, band: 'rich', bandName: 'Rich', headline: 'RICH AIR · 24 / 40' });
    expect(f.sky).toMatch(/cheap/); expect(f.icon).toMatch(/^data:image\/svg\+xml,/);
    expect(f.gauge.map((g) => g.id)).toEqual(MANA_BANDS.map((b) => b.id)); expect(f.gauge.filter((g) => g.now).map((g) => g.id)).toEqual(['rich']);
    expect(manaForecast(fight(3)).band).toBe('thin'); expect(manaForecast(fight(35)).band).toBe('flooded'); expect(manaForecast(fight(99)).mana).toBe(40);
    expect(new Set(['thin', 'normal', 'rich', 'flooded'].map((b) => skyIcon(b, '#fff'))).size).toBe(4);
    // the gauge covers all 41 values (Flooded 30–40 is 11 of them), and 40 sits inside the Flooded segment
    const w = (st: string) => Number(/flex: 0 0 ([\d.]+)%/.exec(st)![1]);
    expect(f.gauge.reduce((t, g) => t + w(g.style), 0)).toBeCloseTo(100, 1); expect(w(f.gauge[3].style)).toBeCloseTo(11 / 41 * 100, 1);
    expect(Number(/left: calc\(([\d.]+)%/.exec(manaForecast(fight(40)).marker)![1])).toBeLessThan(100);
  });
  it('what the air does comes from its data row (cost, Syphon, healing, rider shift, Strain)', () => {
    expect(bandEffects('normal')).toEqual(['Outbursts cost their plain MP', 'Syphon draws 20 MP', 'Magical healing at full']);
    expect(bandEffects('thin')).toEqual(expect.arrayContaining(['Outbursts cost ×1.5 MP (+50%)', 'Magical healing ×0.75', 'Outburst riders read a stage lower']));
    expect(bandEffects('flooded')).toEqual(expect.arrayContaining(['Outbursts cost ×0.5 MP (−50%)', 'Outburst riders read a stage higher', '+1 Strain on every Begin and swell']));
    expect(movers()[0]).toMatch(/^A person dies: \+5 \(a beast \+3, a robot \+2\)/); expect(movers().some((m) => /Crystallise: −10/.test(m))).toBe(true);
  });
  it('the outlook: how far to the next band up and down, in deaths and Crystallises', () => {
    expect(outlookOf(24)).toEqual([
      { dir: 'up', band: 'flooded', at: 30, need: 6, text: 'Flooded at 30: 6 to go (2 deaths)' },
      { dir: 'down', band: 'normal', at: 19, need: 5, text: 'Normal at 19: 5 below (one Crystallise)' }]);
    expect(outlookOf(0).map((o) => o.dir)).toEqual(['up']); expect(outlookOf(40).map((o) => o.dir)).toEqual(['down']);
  });
  it('the trend: the meter at each round\'s start, kept per fight; this round and last round', () => {
    noteMana(fight(15, 1)); let h = noteMana(fight(20, 1)); // the first reading of a round is its start
    expect(manaForecast(fight(20, 1), h).trend).toMatchObject({ thisRound: 5, lastRound: null, arrow: '▲', text: '+5 this round' });
    h = noteMana(fight(18, 2));
    expect(manaForecast(fight(12, 2), h).trend).toMatchObject({ thisRound: -6, lastRound: 3, arrow: '▼', text: '−6 this round · +3 last round' });
    const other = noteMana({ ...fight(30, 2), name: 'Another fight' }); expect(other[1]).toBeUndefined(); // another fight, its own memory
    // a spawn or an extra turn changes the order mid-round: the same fight, the same memory
    expect(noteMana({ ...fight(25, 2), order: ['a', 'b', 'c'] })[2]).toBe(18);
    // the round goes back (a rewind to round 1, or the fight started again): the readings after it go, the rest stay
    const again = noteMana(fight(15, 1)); expect(again).toEqual({ 1: 15 });
    // a rewind within the round keeps the round's start
    noteMana(fight(20, 2)); expect(noteMana(fight(17, 2))[2]).toBe(20);
  });
  it('the panel values: the toggle, the lists and the styles', () => {
    let n = 0; const v = forecastVals(fight(31), false, () => { n++; });
    expect(v).toMatchObject({ open: false, openStr: 'false', toggleLabel: 'More ▸', band: 'flooded' });
    v.toggle(); expect(n).toBe(1);
    expect(v.effects[0]).toMatchObject({ key: 'e0' }); expect(v.gauge[3].title).toBe('Flooded 30–40 (now)'); expect(v.boxStyle).toMatch(/border-left: 3px solid #D6A8FF/);
    expect(forecastVals(fight(31), true, () => {}).toggleLabel).toBe('Less ▾');
  });
});

describe('the forecast outside fights (UI pass 5)', () => {
  it('reads the story meter, the story round and the zone; the trend per story round', async () => {
    const { storyForecastVals, storyForecastCb } = await import('./manaForecast');
    _resetManaHistory();
    const g: any = { story: { mana: 15, round: 1, zone: 'shield_line' } };
    expect(storyForecastCb(g)).toEqual({ mana: 15, round: 1, name: 'story', map: { id: 'shield_line' } });
    let v = storyForecastVals(g, false, () => {});
    expect(v.has).toBe(true); expect(v.headline).toBe('NORMAL AIR · 15 / 40'); expect(v.trendShort).toBe('steady');
    g.story.mana = 20; v = storyForecastVals(g, true, () => {});
    expect(v.trendShort).toBe('+5'); expect(v.toggleLabel).toBe('Less ▾');
    expect(storyForecastVals(null, false, () => {}).has).toBe(false);
  });
});
