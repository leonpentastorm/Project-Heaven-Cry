// The tips a player has seen (localStorage phc.tips): its own module (the client load lane, 0.33), so the settings
// page (on the title too) can reset them without the tips' rules, which read the engine (game/tips.tsx).
const LS = 'phc.tips';
export const seen: Set<string> = (() => { try { return new Set(JSON.parse(localStorage.getItem(LS) || '[]')); } catch { return new Set(); } })();
export const saveSeen = () => { try { localStorage.setItem(LS, JSON.stringify([...seen])); } catch { /* */ } };
/** Settings: show every tip again. */
export function resetTips() { seen.clear(); saveSeen(); }
