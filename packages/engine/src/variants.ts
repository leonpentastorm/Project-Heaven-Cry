// VARIANTS (rules 1.56, Balance 2.0, L4; data/variants.json; docs/design/proposals/2026-11-balance-2.0.md section 4).
// A variant is a named weapon or focus: a base row plus one or two modifiers of a closed list of kinds (the file's
// `kinds`). This is the one loader: data.ts calls it once, when the WEAPON and ITEM tables are made, and adds what it
// returns. Nothing here prices, deals or rolls:
//   - a field kind (deep magazine, long reach, runs cool, kicks less) changes the base row's own number field in the
//     variant's row, so everything that reads the row (the card, the fight, magazineSize, gearNum's recoil) reads it;
//   - an effect kind (harder, true, quick hands, rider, kind, and the stat kinds) becomes one modifier item (a `relic`
//     row with the kind's effects, its value written in), carried by the variant's row (`variant_mods`): it is held only
//     while the instance is in a hand (hooks.ts heldOfChar, character.ts handProps) and acts only through `with_this`;
//   - the price is credits.ts priceOf's (base price x (1 + worth / 100), at the variant's grade).
// No code per variant or per kind: a new variant is one line in data; a new kind is a line too when it maps to an op the
// engine runs. tools/validate.py refuses a third modifier, an unknown kind, a misfit, a duplicate and a worth over the cap.
import { renderText } from './datatext';

/** One modifier of a variant line: a kind, its form (when the kind has more than one), its value. */
export interface VariantMod { kind: string; form?: string; value?: number }
/** A variant line of data/variants.json. */
export interface VariantLine { id: string; name: string; base: string; rarity?: string; mods: VariantMod[]; provisional?: boolean;
  /** Rules 1.91 item 7917: a unique line. Its `rarity` is its FIXED grade (itemtags.ts fixedGradeOf, written to the
   * instance at every grant and pool; the Forge's grade step refuses it); no modifier cap and no worth cap. */
  unique?: boolean;
  /** A unique's own effects (item-op effects): made into one modifier item of the row (`vmod.<id>.unique`), held while
   * the instance is in a hand as every variant modifier is, or worn (N4, rules 1.91 item 7956; hooks.ts heldOfChar). */
  effects?: any[]; text?: string;
  /** Rules 1.91 item 7918: the Weapon Art slot, null until the Weapon Art patch. */
  weapon_art?: null }

const clone = (o: any) => JSON.parse(JSON.stringify(o));
function putAt(root: any, path: string, v: number) {
  const parts = path.split('.'); let n = root;
  for (const p of parts.slice(0, -1)) n = Array.isArray(n) ? n[Number(p)] : n[p];
  const last = parts[parts.length - 1]; if (Array.isArray(n)) n[Number(last)] = v; else n[last] = v;
}

/** Expand the variant lines: the variant rows for the weapon table and for the item table (a focus), and the modifier
 * items their effect kinds make. A line whose base or kind is unknown throws (the validator refuses it first). */
export function expandVariants(file: any, weapons: Record<string, any>, items: Record<string, any>,
  /** rules 1.91 item 7957: a body armour class as a base (`armour:<n>`: data.ts makes it an items row), or null */ classBase: (id: string) => any | null = () => null): { weapons: any[]; items: any[]; mods: any[] } {
  const kinds: Record<string, any> = Object.fromEntries(((file?.kinds || []) as any[]).map((k) => [k.id, k]));
  const out = { weapons: [] as any[], items: [] as any[], mods: [] as any[] };
  for (const line of (file?.items || []) as VariantLine[]) {
    // rules 1.91 item 7957: a body armour class (armour:<n>) is a base too, made an items row of the armour kind
    const baseRow = weapons[line.base] || items[line.base] || classBase(line.base);
    if (!baseRow) throw new Error('data/variants.json ' + line.id + ': base "' + line.base + '" is neither a weapon, an item nor a body armour class');
    const row: any = { ...clone(baseRow), id: line.id, name: line.name, variant_of: line.base, variant_grade: line.rarity || 'standard', variant_worth: 0, variant_mods: [] as string[], provisional: true };
    const lines: { kind: string; name: string; text: string }[] = [];
    for (const m of line.mods || []) {
      const k = kinds[m.kind]; if (!k) throw new Error('data/variants.json ' + line.id + ': unknown kind "' + m.kind + '"');
      const f = (k.forms || []).find((x: any) => x.id === (m.form || k.forms[0]?.id));
      if (!f) throw new Error('data/variants.json ' + line.id + ': kind ' + m.kind + ' has no form "' + m.form + '"');
      const value = typeof f.value_fixed === 'number' ? f.value_fixed : Number(m.value);
      row.variant_worth += Math.abs(value - Number(k.neutral || 0)) * Number(f.worth_per || 0);
      // the kind's sentence is a template ({value}, {value|more}: filled per variant here, so the text guard reads the
      // variant's text, not the template); renderText fills it, the one placeholder filler
      const text = renderText(String(f.sentence || '').replace(/\{(?!=)/g, '{='), { ...f, value }, f);
      lines.push({ kind: k.id, name: k.name, text });
      if (f.field) { row[f.field] = Number(baseRow[f.field] ?? 0) + Number(f.sign ?? 1) * value; continue; }
      const id = 'vmod.' + line.id + '.' + k.id;
      const effects = clone(f.effects || []);
      for (const p of f.puts || []) putAt({ effects }, p, value);
      out.mods.push({ id, kind: 'relic', name: k.name, text, value, effects, variant_of: line.id, adjudication: 'engine', provisional: true });
      row.variant_mods.push(id);
    }
    if (line.unique) {
      row.unique = true;
      if ((line.effects || []).length) {
        const id = 'vmod.' + line.id + '.unique';
        out.mods.push({ id, kind: 'relic', name: line.name, text: line.text || '', effects: clone(line.effects), variant_of: line.id, adjudication: 'engine', provisional: true });
        row.variant_mods.push(id);
      }
    }
    row.variant_worth = Math.round(row.variant_worth * 100) / 100;
    row.variant_lines = lines;
    (weapons[line.base] ? out.weapons : out.items).push(row);
  }
  return out;
}
