// Who holds whom (one copy): Grappled by it (the grapple's source) or Bound by it (Bind: u.tech.bind.target). Throw Down
// reads it (physical/melee/finishers.ts), and the predicate target_held (effects/triggers.ts; rules 1.82 item 7010: Hurl's
// held small foe).
import type { Unit } from './combat';
import { condSource } from './magic';
/** Is `tgt` held by `u`: Grappled by it, or Bound by it. */
export const heldBy = (u: Unit, tgt: Unit): boolean => condSource(tgt, 'grappled') === u.id || (u as any).tech?.bind?.target === tgt.id;
