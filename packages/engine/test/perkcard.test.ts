// The perk card in a fight as the engine tells it (rules 1.14; engine review 4, finding 9): each held item's shelf from
// its runtime definition, its trigger from data/perk_cards.json, its state from the counters and the log. The client
// only words these facts (apps/web/src/game/perkShelves.ts and its tests pin every line a player reads).
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { perkCards, shelfOf, cardTrigger, cardText, coreWired, PERK_CARDS, holdersOf, stateOf, allItems, type Unit } from '../src';
import { fightWith, withGame } from './helpers/perkfight';

type F = ReturnType<typeof fightWith>;
const cards = (f: F, u: Unit = f.pc, o: any = {}) => withGame(f.g, () => perkCards({ u, cb: f.cb, g: f.g }, o));
const card = (f: F, key: string) => cards(f).find((k) => k.key === key)!;

describe('perkCards', () => {
  it('a passive with a declared trigger waits for it; one with none is simply on; a standing one works', () => {
    const f = fightWith([{ perks: { used_to_the_pain: 'I', bulwark: 'I' }, traits: ['pain_eater'] }], [{ at: 'F6' }]); f.turn(f.pc);
    expect(card(f, 'perk:used_to_the_pain')).toMatchObject({ shelf: 'always', state: 'waiting', trigger: 'the first time you are hit in each fight', standing: false, button: false });
    expect(card(f, 'perk:bulwark')).toMatchObject({ shelf: 'always', state: 'active', trigger: '' });
    expect(card(f, 'trait:pain_eater')).toMatchObject({ shelf: 'always', state: 'active', standing: true });
    expect(card(f, 'perk:used_to_the_pain').text).toBe(cardText(holdersOf({ u: f.pc, c: Object.values(f.g.characters)[0], cb: f.cb }).find((h) => h.key === 'perk:used_to_the_pain')!));
  });
  it('state follows what the engine keeps: a spent use is "used" with its window; a private count never says ready', () => {
    const f = fightWith([{ perks: { into_the_dark: 'I' } }], [{ at: 'F6' }]); f.turn(f.pc);
    const h = withGame(f.g, () => holdersOf({ u: f.pc, c: Object.values(f.g.characters)[0], cb: f.cb }).find((x) => x.key === 'perk:into_the_dark')!);
    expect(card(f, 'perk:into_the_dark').state).not.toBe('used');
    stateOf(h).used = true;
    expect(card(f, 'perk:into_the_dark')).toMatchObject({ state: 'used', spent: 'per_combat' });
    expect(PERK_CARDS.private_count).toContain('skill:composure.5');
  });
  it('an item whose button is up is left to USE NOW; an enemy\'s items are not the squad\'s to read; class moves have their own tab', () => {
    const f = fightWith([{ perks: { used_to_the_pain: 'I' }, classId: 'bard' }], [{ at: 'F6' }]); f.turn(f.pc);
    expect(cards(f, f.pc, { up: ['perk:used_to_the_pain'] }).map((k) => k.key)).not.toContain('perk:used_to_the_pain');
    expect(cards(f, f.foe)).toEqual([]);
    expect(cards(f).every((k) => k.kind !== 'class')).toBe(true);
    const h = withGame(f.g, () => holdersOf({ u: f.pc, c: Object.values(f.g.characters)[0], cb: f.cb }).find((x) => x.key === 'perk:used_to_the_pain')!);
    expect(shelfOf(h, true)).toBe('use'); expect(shelfOf(h, false)).toBe('always');
  });
  it('reading the card changes nothing', () => {
    const f = fightWith([{ perks: { used_to_the_pain: 'I', bulwark: 'II' }, traits: ['pain_eater', 'gambler'] }], [{ at: 'F6' }]); f.turn(f.pc);
    f.pc.uses ||= {}; const before = JSON.stringify(f.g);
    cards(f); cards(f);
    expect(JSON.stringify(f.g)).toBe(before);
  });
});

describe('data/perk_cards.json', () => {
  it('every entry is a real item at a real tier, and its trigger is in that card\'s own words', () => {
    const infos = new Map((allItems() as any[]).filter(Boolean).map((x) => [x.key + '@' + (x.kind === 'perk' ? x.tier : ''), x]));
    for (const r of PERK_CARDS.items) {
      const info: any = infos.get(r.id + '@' + (r.tier || '')); expect(info, r.id).toBeTruthy();
      expect((cardText({ kind: info.kind, itemId: info.id, tier: info.tier, info }) + ' ' + info.text).toLowerCase().replace(/\s+/g, ' '), r.id).toContain(r.trigger.toLowerCase());
      expect(cardTrigger(r.id, r.tier)).toEqual({ trigger: r.trigger, standing: !!r.standing });
    }
  });
  it('core_wired items sit on ALWAYS ON by declaration', () => {
    expect(PERK_CARDS.core_wired.length).toBeGreaterThan(0);
    for (const id of PERK_CARDS.core_wired) expect(coreWired(id)).toBe(true);
    expect(coreWired('bulwark')).toBe(false);
  });
});
