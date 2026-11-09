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
  // Leon: "remove the confirm button if the skill already have a use button in its perspective action". An item whose
  // toggle rides a combat action (a chip on Move, Begin, Release, an attack) keeps no combat button of its own. The one
  // intended double is listed with why.
  const DOUBLES: Record<string, string> = {
    // Its action is a 1-AP free melee strike; the chip rides any attack at that weapon's own AP (a shelved class's move).
    'class:vessel.release_strike': 'a cheaper strike of its own',
  };
  it('no item with a chip on a combat action also keeps a combat button (bar the listed doubles)', () => {
    const both = allItems().filter((i) => { const h = handlerOf(i.key); return !!h && (h.toggles || []).some((t) => t.on.some((o) => o.startsWith('combat/')))
      && (h.actions || []).some((a) => a.scope.includes('combat')); }).map((i) => i.key);
    expect([...new Set(both)].sort()).toEqual(Object.keys(DOUBLES).sort());
  });
  it('an item used only from a chip in a fight is listed to read there (Running Reload on Move, Verse of War on Begin and Release)', () => {
    const f = fightWith([{ ...SOUL, skills: { will_power: 10 }, perks: ['the_twin_pays', 'running_reload', 'verse_of_war'] } as any], [{}]);
    const u = f.turn(f.pc), who = { u: f.unit(u.id), c: f.g.characters[f.pc.charId!], cb: f.cb, g: f.g };
    const ids = perkActionsFor(who, 'combat').map((e) => e.id), info = perkInfoFor(who, 'combat'), by = (k: string) => info.find((e) => e.id === k);
    expect(ids).not.toContain('perk:verse_of_war'); expect(ids).not.toContain('perk:running_reload');
    expect(by('perk:running_reload')).toMatchObject({ via: 'Used from a move' });
    expect(by('perk:verse_of_war')).toMatchObject({ via: 'Used from Begin or Release' });
    expect(by('perk:verse_of_war')!.uses.label).toBe('');
    // on the area map Running Reload keeps its own button ("Move and reload"), so it is not listed to read there
    expect(perkInfoFor(who, 'world').map((e) => e.id)).not.toContain('perk:running_reload');
  });
});
