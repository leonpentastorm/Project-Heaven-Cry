// @ts-nocheck (runs tools/validate.py on a copy of data/: node's fs and child_process)
// Rules 1.91 items 7950, 7951, 7957, 7958 (lane A2): the validator on the body armour class rows, the slot table and the
// armour bases of a variants line. A copy of data/ gets wrong lines (a class inserted out of its place, a second
// light_cap, a class form that is no gear form, an armour gate on a class that is no row, a worn piece in no slot of
// the table, graded: false on a non-armour row, a variant on class 0) and right ones (a unique on a body armour class
// and on a worn piece); the errors name every wrong one and none of the right.
import { describe, it, expect } from 'vitest';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const PY = process.platform === 'win32' ? 'python' : 'python3';
function validateWith(edit: (d: Record<string, any>) => void): string {
  const dir = mkdtempSync(join(tmpdir(), 'phc-validate-')), data = join(dir, 'data');
  try {
    cpSync(join(ROOT, 'data'), data, { recursive: true });
    for (const f of ['art/catalog.json', 'apps/web/src/game/assets.json', 'packages/engine/src/music.ts']) cpSync(join(ROOT, f), join(dir, f), { recursive: true });
    const files = ['variants', 'rules', 'items', 'techniques'], d: Record<string, any> = {};
    for (const f of files) d[f] = JSON.parse(readFileSync(join(data, f + '.json'), 'utf8'));
    edit(d);
    for (const f of files) writeFileSync(join(data, f + '.json'), JSON.stringify(d[f]));
    try { return execFileSync(PY, [join(ROOT, 'tools/validate.py'), data], { encoding: 'utf8', cwd: ROOT, env: { ...process.env, PYTHONUTF8: '1' } }); } catch (e: any) { return String(e.stdout || '') + String(e.stderr || ''); }
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

describe('the validator and the armour (rules 1.91 lane A2)', () => {
  it('the shipped data passes', () => {
    expect(validateWith(() => {})).toMatch(/\n0 errors/);
  });
  it('refuses each misuse by name, and passes the right uses', () => {
    const out = validateWith((d) => {
      const cls = d.rules.combat.armor.classes;
      cls[6] = { ...cls[6], class: 7, form: 'long' }; // out of its place; not a gear form
      cls[2] = { ...cls[2], light_cap: true }; // a second light cap
      d.techniques.rules.gear_gates.heavy_armour.classes['9'] = 4; // no such class
      d.items.items.push({ id: 'test_a2_slotless', name: 'Slotless', category: 'armour', slot: 'torso_inner', weight_kg: 1, effects: [] },
        { id: 'test_a2_graded_tool', name: 'Graded tool', category: 'tool', graded: false, weight_kg: 1 });
      d.variants.items.push(
        { id: 'test_a2_good_plate', name: 'Good plate', base: 'armour:5', rarity: 'relic', unique: true, effects: [{ op: 'stat_mod', stat: 'injury_resist', value: 5 }], weapon_art: null },
        { id: 'test_a2_good_helm', name: 'Good helm', base: 'ballistic_helmet', rarity: 'relic', unique: true, effects: [{ op: 'stat_mod', stat: 'injury_resist', value: 5 }], weapon_art: null },
        { id: 'test_a2_bad_none', name: 'Bad none', base: 'armour:0', rarity: 'relic', unique: true, effects: [{ op: 'stat_mod', stat: 'injury_resist', value: 5 }], weapon_art: null });
    });
    expect(out).toMatch(/classes\[6\]: class is its place in the list/);
    expect(out).toMatch(/classes\[6\]: form 'long' is one of the gear forms/);
    expect(out).toMatch(/one row is the light_cap/);
    expect(out).toMatch(/heavy_armour.classes: '9': 4 is not an armour class/);
    expect(out).toMatch(/items:test_a2_slotless: slot 'torso_inner' is not a slot/);
    expect(out).toMatch(/items:test_a2_graded_tool: graded: false is for a worn armour piece/);
    expect(out).toMatch(/test_a2_bad_none: base 'armour:0'/);
    expect(out).not.toMatch(/test_a2_good_plate|test_a2_good_helm/);
  });
});
