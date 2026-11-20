// @ts-nocheck (runs tools/validate.py on a copy of data/: node's fs and child_process)
// Rules 1.91 (Items 2.0 stage A, lane A1): the validator and the item model. A copy of data/ gets test lines: a unique
// variants line (no modifier at all, then three modifiers worth over the cap: both allowed on a unique), an ordinary
// line with effects (refused), a non-null weapon_art (refused), a row that repeats its family's technique (refused), a
// row whose form disagrees with what it hits with (refused), a family that names an unknown form (refused). The
// validator's errors must name every wrong one and none of the right ones (it prints its first 80 errors: the copy
// carries the files beside data/ that the validator reads, so the shipped data adds none).
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
    // the files outside data/ the validator reads beside it (root.parent): the art catalog, the web asset list, the music
    for (const f of ['art/catalog.json', 'apps/web/src/game/assets.json', 'packages/engine/src/music.ts']) cpSync(join(ROOT, f), join(dir, f), { recursive: true });
    const files = ['variants', 'weapons', 'families'], d: Record<string, any> = {};
    for (const f of files) d[f] = JSON.parse(readFileSync(join(data, f + '.json'), 'utf8'));
    edit(d);
    for (const f of files) writeFileSync(join(data, f + '.json'), JSON.stringify(d[f]));
    try { return execFileSync(PY, [join(ROOT, 'tools/validate.py'), data], { encoding: 'utf8', cwd: ROOT, env: { ...process.env, PYTHONUTF8: '1' } }); } catch (e: any) { return String(e.stdout || '') + String(e.stderr || ''); }
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
const lines = (out: string, key: string) => out.split('\n').filter((l) => l.includes(key));

describe('the validator and the item model (rules 1.91)', () => {
  it('refuses each misuse by name, and passes the right uses', () => {
    const out = validateWith((d) => {
      d.variants.items.push(
        // right: a unique with effects and no modifier; a unique with three modifiers over the worth cap
        { id: 'sabre.test_good_unique', name: 'Good unique', base: 'sabre', rarity: 'relic', unique: true, effects: [{ op: 'stat_mod', stat: 'injury_resist', value: 5 }], weapon_art: null },
        { id: 'service_pistol.test_good_big', name: 'Big unique', base: 'service_pistol', rarity: 'celestial', unique: true,
          mods: [{ kind: 'harder', form: 'weapon', value: 2 }, { kind: 'true', form: 'weapon', value: 3 }, { kind: 'long_reach', value: 5 }] },
        // wrong
        { id: 'sabre.test_bad_effects', name: 'Bad effects', base: 'sabre', mods: [{ kind: 'true', form: 'weapon', value: 1 }], effects: [{ op: 'stat_mod', stat: 'injury_resist', value: 5 }] },
        { id: 'sabre.test_bad_art', name: 'Bad art', base: 'sabre', mods: [{ kind: 'true', form: 'weapon', value: 1 }], weapon_art: 'some_card' },
        { id: 'sabre.test_bad_empty', name: 'Bad empty', base: 'sabre', unique: true },
      );
      const w = (id: string) => d.weapons.items.find((x: any) => x.id === id);
      Object.assign(w('sabre'), { family: 'cavalry_blades', form: 'dex' }); w('sabre').phys.teaches = 'riposte'; // repeats riposte, the family's dex technique (the live row names none since lane A4)
      Object.assign(w('war_axe'), { family: 'axes', form: 'dex' }); // a Raw Power row in a dex form
      Object.assign(w('hatchet'), { family: 'axes', form: 'hybrid', weapon_art: 'a_card' }); // its pattern is a hybrid's (right), the card is not (wrong)
      Object.assign(w('afterword'), { form: 'str' }); // a form with no family (a row in no family; the maul is in hammers since lane A4)
      d.families.items.push({ id: 'test_bad_family', name: 'Bad', line: 'frontier', form_kind: 'melee', weapon_art: null, forms: [{ id: 'long' }] });
    });
    expect(lines(out, 'test_good'), 'the right uses').toEqual([]);
    expect(lines(out, 'test_bad_effects').join('\n')).toMatch(/effects belong to a unique line only/);
    expect(lines(out, 'test_bad_art').join('\n')).toMatch(/weapon_art is null/);
    expect(lines(out, 'test_bad_empty').join('\n')).toMatch(/a unique carries effects or modifiers/);
    expect(lines(out, 'weapons:sabre').join('\n')).toMatch(/repeats its family's form/);
    expect(lines(out, 'weapons:war_axe').join('\n')).toMatch(/a dex form hits with and grows with/);
    expect(lines(out, 'weapons:hatchet').join('\n')).toMatch(/weapon_art is null/);
    expect(lines(out, 'weapons:hatchet').join('\n')).not.toMatch(/form hits with/);
    expect(lines(out, 'weapons:afterword').join('\n')).toMatch(/a form belongs to a family/);
    expect(lines(out, 'test_bad_family').join('\n')).toMatch(/its forms are distinct forms of its kind/);
  }, 60000);
  it('the data as it ships: 0 errors', () => {
    expect(validateWith(() => {})).toMatch(/\n0 errors/);
  }, 60000);
});
