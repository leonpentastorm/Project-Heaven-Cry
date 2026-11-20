// No silent HP change (0.32 effects lane; Leon: "no silent heal or damage through a Bond"). The engine stamps every
// effect that follows an HP change with hp: {unit: [was, now]} (fx-hp-stamp.test.ts), so the screen can see a change
// that no event of the batch draws a number for: a share of damage through a Bond or a Ward (the `redirect` op), a
// `deal` row (a Husk's burst), a heal a Miracle gives to many at once, a Raise. This pass finds them in a batch and marks
// the event that carries the unit's last stamp with the change (e._silent: {unit: delta}); play.ts floats the number on
// the unit when that event plays. A unit any event of the batch already names with a number (a hurt, a heal, a stim, a
// shot or a swing on it) is left alone: its number is drawn by that event, never twice. Pure (tests).
import type { FxEvent } from '@engine';

/** The fields an event's handler draws a number from, on the unit it names as its target. */
const NUMBER_FIELDS = ['dmg', 'amount', 'heal'] as const;

export function silentBatch(evs: FxEvent[]): void {
  const first = new Map<string, number>(), last = new Map<string, { now: number; i: number }>(), named = new Set<string>();
  evs.forEach((e: any, i) => {
    if (e.target && NUMBER_FIELDS.some((f) => typeof e[f] === 'number')) named.add(String(e.target));
    if (e.revive && e.target) named.add(String(e.target));
    if (!e.hp) return;
    for (const [id, v] of Object.entries(e.hp as Record<string, [number, number]>)) {
      if (!Array.isArray(v)) continue;
      if (!first.has(id)) first.set(id, Number(v[0]) || 0);
      last.set(id, { now: Number(v[1]) || 0, i });
    }
  });
  for (const [id, { now, i }] of last) {
    const d = Math.round(now - (first.get(id) ?? now));
    if (!d || named.has(id)) continue;
    const e: any = evs[i]; (e._silent ||= {})[id] = d;
  }
}
