// The Perks tab's dead Confirm (Leon, 9 Nov 2026: "many perks in the perk tab have the 'Confirm' button that consumes a
// use but does not do anything. The button in the perspective move is used instead (example being overdraw and the
// twin pays). Keep these in the perk tab so you can read that you have the skill and what it does, but remove the
// confirm button"). An item whose lane runs it another way (a toggle on another action, or a hook) must not keep the
// data's default action button; the tab lists it to read instead (perkInfoFor).
import { describe, expect, it } from 'vitest';
import { allItems, handlerOf, defaultActions, perkActionsFor, perkInfoFor } from '../src';
import { fightWith } from './helpers/perkfight';

const SOUL = { archetype: 'stormcaller', kit: 'soul' } as const;

describe('perks used from another action have no button of their own', () => {
  it('no item whose lane registers a handler but no actions keeps the data\'s default button (it would run nothing)', () => {
    const dead = allItems().filter((i) => { const h = handlerOf(i.key); return !!h && !(h.actions || []).length && !h.noDefaultActions && defaultActions(i).length > 0; }).map((i) => i.key);
    expect(dead).toEqual([]);
  });
  it('Overdraw, Pure Heart and The Twin Pays: no action entry anywhere; listed to read, with where they are used and the uses left', () => {
    const f = fightWith([{ ...SOUL, skills: { will_power: 10 }, perks: ['the_twin_pays'] } as any], [{}]);
    const u = f.turn(f.pc), who = { u: f.unit(u.id), c: f.g.characters[f.pc.charId!], cb: f.cb, g: f.g };
    const ids = perkActionsFor(who, 'combat').map((e) => e.id);
    for (const k of ['skill:will_power.3', 'skill:will_power.5', 'perk:the_twin_pays']) expect(ids).not.toContain(k);
    const info = perkInfoFor(who, 'combat'), by = (k: string) => info.find((e) => e.id === k);
    expect(by('skill:will_power.3')).toMatchObject({ label: 'Overdraw', via: 'Used from Pump', tab: 'perks' });
    expect(by('skill:will_power.5')).toMatchObject({ label: 'Pure Heart', via: 'Automatic' });
    expect(by('perk:the_twin_pays')).toMatchObject({ via: 'Used from Begin' });
    expect(by('perk:the_twin_pays')!.uses).toMatchObject({ per: 'per_combat', n: 1, left: 1 });
    // a real button item is not listed to read (it has its own entry)
    for (const e of info) expect(ids).not.toContain(e.id);
  });
});
