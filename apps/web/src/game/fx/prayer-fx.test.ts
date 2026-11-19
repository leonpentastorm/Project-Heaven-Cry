// 0.32 effects lane: a prayer's effect is read from its data (fx/faith.ts): its element from the effect's damage_type,
// the units it touched from the batch, a state-only prayer's name where it lands, the Canticle's reach from the class row.
import { describe, expect, it } from 'vitest';
import { CLASS } from '@engine';
import PJ from '../../../../../data/patrons.json';
import { faithBatch, prayerData, prayerElement, prayerWounds, songReach } from './faith';

const overcast: any = (PJ as any).items.find((p: any) => (p.hymns || []).some((h: any) => (h.effects || []).some((x: any) => x.damage_type === 'lightning')));
const storm: any = overcast.hymns.find((h: any) => (h.effects || []).some((x: any) => x.damage_type === 'lightning'));

describe('a prayer read from data', () => {
  it('the entry by kind, id and patron; its element from damage_type (lightning is shock); plain light has none', () => {
    expect(prayerData({ kind: 'hymn', id: storm.id, patron: overcast.id })).toBe(storm);
    expect(prayerElement(storm)).toBe('shock');
    const heal = (PJ as any).whispers.find((w: any) => (w.effects || []).every((x: any) => !x.damage_type));
    expect(prayerElement(heal)).toBeNull();
    expect(prayerWounds((PJ as any).whispers.find((w: any) => w.target === 'enemy'))).toBe(true);
    expect(prayerWounds(heal)).toBe(false);
  });
  it('faithBatch ties a prayer to every unit its batch touched and gives its wounds its element (a hurt\'s own wins)', () => {
    const evs: any[] = [{ k: 'prayer', kind: 'hymn', id: storm.id, patron: overcast.id, unit: 'pc-1', n: 1 }, { k: 'hurt', target: 'foe-0', dmg: 9, n: 2 }, { k: 'hurt', target: 'foe-1', dmg: 9, element: 'fire', n: 3 }, { k: 'cond', target: 'pc-1', id: 'witnessed', n: 4 }, { k: 'turn', n: 5 }, { k: 'hurt', target: 'foe-2', n: 6 }];
    faithBatch(evs);
    expect(evs[0]._hits).toEqual(['foe-0', 'foe-1']); expect(evs[0]._el).toBe('shock'); expect(evs[0]._effect).toBe(1);
    expect(evs[1].element).toBe('shock'); expect(evs[1]._prayer).toBe(1); expect(evs[2].element).toBe('fire'); expect(evs[5].element).toBeUndefined();
  });
  it('a prayer that changes only a state (the caster\'s Witnessed aside) is marked so its name is said', () => {
    const evs: any[] = [{ k: 'prayer', kind: 'hymn', id: 'x', patron: 'nobody', unit: 'pc-1', target: 'pc-2', n: 1 }, { k: 'cond', target: 'pc-1', id: 'witnessed', n: 2 }];
    faithBatch(evs); expect(evs[0]._effect).toBe(0); expect(evs[0]._hits).toEqual(['pc-2']);
  });
  it('the Canticle\'s ground: the first verse\'s condition reach, the widest from the third verse (classes.json, no number in code)', () => {
    const all: any[] = []; const walk = (xs: any[]) => { for (const x of xs || []) { all.push(x); walk(x.effects); } };
    const rows: any[] = []; const visit = (o: any) => { if (!o || typeof o !== 'object') return; if (Array.isArray(o.effects) && JSON.stringify(o.effects).includes('"k":"canticle"')) { rows.push(o); return; } for (const v of Object.values(o)) visit(v); };
    visit(CLASS); expect(rows.length).toBeGreaterThan(0); walk(rows[0].effects);
    const within = all.filter((x) => x.op === 'condition' && x.targets?.of === 'self').map((x) => x.targets.within);
    expect(songReach('canticle', 1)).toBe(within[0]); expect(songReach('canticle', 3)).toBe(Math.max(...within));
  });
});
