// Rules 1.78 item 6609: a skill's "?" page lists its door's passive steps (a door verb with no action of its own) under
// its perks, one row each, with its picture by the item key (doorArt.ts moveIconOf: the catalog's data_ids).
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

vi.stubGlobal('window', { scrollTo: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => true, location: { search: '', hash: '' }, innerWidth: 1400, innerHeight: 900 });
vi.stubGlobal('location', { search: '', hash: '' });
const { epccgVals } = await import('./shared');
const EP_TPL = readFileSync(new URL('../templates/epccg.template.html', import.meta.url), 'utf-8');
const page = (id: string) => { const self: any = { state: { epccg: id }, setState: () => {} }; return (epccgVals(self, null, null) as any).ep; };

describe('item 6609: the door passive steps on the skill page', () => {
  it('Empathy lists Threads, Two Bonds, Three Bonds and the Mender’s One More Bond, each with where it comes and its picture', () => {
    const ep = page('empathy');
    expect(ep.hasAlwaysOn).toBe(true);
    expect(ep.passives.map((p: any) => p.key)).toEqual(['verb:tend.threads', 'verb:tend.bonds_5', 'verb:tend.bonds_8', 'verb:tend.mender_bonds']);
    expect(ep.passives.map((p: any) => p.at)).toEqual(['at 1', 'at 5', 'at 8', 'Mender rank I']);
    for (const p of ep.passives) { expect(p.has, p.key).toBe(true); expect(p.icon).toMatch(/^\/assets\/tend-/); expect(p.text).not.toMatch(/\{=/); }
  });
  it('a skill whose door has no passive verb shows none; the template has the row inside the Perks fold', () => {
    expect(page('raw_power').hasAlwaysOn).toBe(false);
    const fold = EP_TPL.slice(EP_TPL.indexOf('aria-label="Perks"'), EP_TPL.indexOf('<!--MASTERED:ep.m-->'));
    expect(fold).toContain('data-passive="{{ps.key}}"');
  });
});
