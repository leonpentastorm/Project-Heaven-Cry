// A skill ladder's capped per-point gains (0.31.11; docs/design/handoffs/2026-11-18-skill-screens-redesign.md section 4,
// the lead's ruling of 19 Nov). A per_point row of data/skills.json that says what a point gives on every level ("each")
// may stop adding before the skill's top: Pain Threshold's elemental resistance at its cap, Durability's Guard plates
// held at the pool's cap, Faith's Hymn wait at its floor. Such a row names, in data, the engine value it grows
// (`grows`); this module evaluates that value through the engine's own function at each point, for the character (or a
// blank one), and says the last point where it still moves. The ladder shows the row on the levels up to that point
// and marks that level as the most; the page never types a cap.
import { SKILL } from './data';
import { classResources, elementalTakenPct, guardPool, prayerCooldown, type Character } from './character';

/** The engine values a ladder row may name (data/skills.json per_point.rows[].grows; tools/validate.py mirrors the
 *  keys). Each reads the engine's own function, so the cap is the one the game plays. */
export const LADDER_GROWS: Record<string, (c: Character) => number> = {
  /** Elemental damage taken off (character.ts elementalTakenPct, held under its cap). */
  elemental_taken: (c) => elementalTakenPct(c),
  /** Guard plates held: the larger of Durability's pool and a class's own (character.ts classResources). */
  guard_pool: (c) => Math.max(guardPool(c), ...classResources(c).filter((r) => r.id === 'guard').map((r) => r.max)),
  /** Rounds between Hymns (character.ts prayerCooldown, never under its floor). */
  hymn_wait: (c) => prayerCooldown(c),
};

/** A blank character for a ladder read with no character (the "?" page from the title or creation's start). */
const blank = (): Character => ({ skills: {}, attrs: {}, cores: {}, perks: [], traits: [], classId: null, level: 1 } as any);

/** The skill's capped rows: { row index in per_point.rows: the last point (1..top) where its value still moves }. A
 *  row whose value never moves for this character (a class that already holds more) has 0. `c` null: a blank one. */
export function ladderCaps(skillId: string, c?: Character | null): Record<number, number> {
  const k: any = SKILL[skillId]; const rows: any[] = k?.per_point?.rows || []; const out: Record<number, number> = {};
  const top = Math.max(1, ...Object.keys(k?.unlocks || {}).map(Number).filter((n) => n > 0));
  const base = c || blank();
  rows.forEach((r, i) => {
    const f = r && typeof r.grows === 'string' ? LADDER_GROWS[r.grows] : null; if (!f) return;
    const at = (n: number) => f({ ...base, skills: { ...(base.skills || {}), [skillId]: n } } as Character);
    let last = 0; for (let n = 1; n <= top; n++) if (Math.abs(at(n) - at(n - 1)) > 1e-9) last = n;
    out[i] = last;
  });
  return out;
}
