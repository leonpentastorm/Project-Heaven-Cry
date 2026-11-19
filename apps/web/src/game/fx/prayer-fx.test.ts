// 0.32 effects lane: a prayer's effect (fx/faith.ts): the units it touched from the batch; its element and a state-only
// prayer's name from the engine's own events (rules 1.72 items 5702, 5704); the Canticle's reach from the class row.
import { describe, expect, it } from 'vitest';
import { CLASS } from '@engine';
import PJ from '../../../../../data/patrons.json';
import { faithBatch, prayerData, prayerWounds, saidByPrayer, songReach } from './faith';

const overcast: any = (PJ as any).items.find((p: any) => (p.hymns || []).some((h: any) => (h.effects || []).some((x: any) => x.damage_type === 'lightning')));
const storm: any = overcast.hymns.find((h: any) => (h.effects || []).some((x: any) => x.damage_type === 'lightning'));

describe('a prayer and its effects', () => {
  it('the entry by kind, id and patron; whether it wounds', () => {
    expect(prayerData({ kind: 'hymn', id: storm.id, patron: overcast.id })).toBe(storm);
    expect(prayerData({ kind: 'hymn', id: overcast.id + '.' + storm.id, patron: overcast.id })).toBe(storm); // the action's own key
    const heal = (PJ as any).whispers.find((w: any) => (w.effects || []).every((x: any) => !x.damage_type));
    expect(prayerWounds((PJ as any).whispers.find((w: any) => w.target === 'enemy'))).toBe(true);
    expect(prayerWounds(heal)).toBe(false);
  });
  it('faithBatch ties a prayer to every unit its batch touched; its element is the one the engine\'s hurt carries (no data read)', () => {
    const evs: any[] = [{ k: 'prayer', kind: 'hymn', id: storm.id, patron: overcast.id, unit: 'pc-1', n: 1 }, { k: 'hurt', target: 'foe-0', dmg: 9, element: 'lightning', n: 2 }, { k: 'hurt', target: 'foe-1', dmg: 9, n: 3 }, { k: 'cond', target: 'pc-1', id: 'witnessed', n: 4 }, { k: 'turn', n: 5 }, { k: 'hurt', target: 'foe-2', n: 6 }];
    faithBatch(evs);
    expect(evs[0]._hits).toEqual(['foe-0', 'foe-1']); expect(evs[0]._el).toBe('shock'); expect(evs[0]._effect).toBe(1);
    expect(evs[1]._prayer).toBe(1); expect(evs[2].element).toBeUndefined(); expect(evs[2]._prayer).toBeUndefined();
  });
  it('a prayer that changes only a state says the name the engine\'s stance gives, and that stance draws nothing else', () => {
    const evs: any[] = [{ k: 'prayer', kind: 'hymn', id: 'x', patron: 'nobody', unit: 'pc-1', target: 'pc-2', n: 1 }, { k: 'cond', target: 'pc-1', id: 'witnessed', n: 2 }, { k: 'stance', what: 'prayer', unit: 'pc-2', at: '3,3', word: 'Dig In', n: 3 }];
    faithBatch(evs); expect(evs[0]._effect).toBe(0); expect(evs[0]._hits).toEqual(['pc-2']);
    expect(evs[0]._name).toBe('Dig In'); expect(evs[0]._nameAt).toBe('3,3'); expect(saidByPrayer(evs[2])).toBe(true);
  });
  it('the Canticle\'s ground: the first verse\'s condition reach, the widest from the third verse (classes.json, no number in code)', () => {
    const all: any[] = []; const walk = (xs: any[]) => { for (const x of xs || []) { all.push(x); walk(x.effects); } };
    const rows: any[] = []; const visit = (o: any) => { if (!o || typeof o !== 'object') return; if (Array.isArray(o.effects) && JSON.stringify(o.effects).includes('"k":"canticle"')) { rows.push(o); return; } for (const v of Object.values(o)) visit(v); };
    visit(CLASS); expect(rows.length).toBeGreaterThan(0); walk(rows[0].effects);
    const within = all.filter((x) => x.op === 'condition' && x.targets?.of === 'self').map((x) => x.targets.within);
    expect(songReach('canticle', 1)).toBe(within[0]); expect(songReach('canticle', 3)).toBe(Math.max(...within));
  });
});
