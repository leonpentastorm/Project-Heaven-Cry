// The reducer's own verdict on an action a button would send (preview.ts previewAction: the reducer on a copy), asked
// once per game state: what the area map's buttons read for their enabled state (rules 1.62 item 4744), never a
// second legality check of the screen's. The fight screen's buttons ask the descriptor (actionFlow.ts verdictOf).
import { previewAction } from '@engine';

const memo = new WeakMap<object, Map<string, { ok: boolean; why: string | null }>>();
export function actionVerdict(g: any, action: any, me: string | null): { ok: boolean; why: string | null } {
  const key = (me || '') + '|' + JSON.stringify(action);
  let m = g && typeof g === 'object' ? memo.get(g) : undefined; if (g && typeof g === 'object' && !m) memo.set(g, (m = new Map()));
  if (m && m.has(key)) return m.get(key)!;
  let v: { ok: boolean; why: string | null };
  try { const r = previewAction(g, action, me || ''); v = { ok: !!r.ok, why: r.ok ? null : r.why || 'Not now.' }; } catch (e: any) { v = { ok: false, why: e?.message || 'Not now.' }; }
  if (m) m.set(key, v);
  return v;
}
