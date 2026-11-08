// Combat and area-map effects: a fixed overlay over every screen that plays the engine's presentation events
// (game.combat.fx in a fight, game.story.fx on the area map) as sprites, tracers, rings, numbers and sounds. It reads
// only the shared game state, so every player in the room sees and hears the same thing. New events play in order
// (by n); on first mount, a new game or a returning tab the history is synced silently, never replayed. A new fight's
// opening events do play (the enemies who act before you). It never takes a click: pointer-events are off throughout.
import React from 'react';
import type { FxEvent, GameState } from '@engine';
import { preloadCombatSfx, reducedMotion } from '../sfx';
import { COMBAT_IN_MS } from '../presence';
import { setLayer } from './dom';
import { canDraw, clearFx, queueFx, rememberTokens, setContext, seenNow } from './play';
import { ambientOf, clearAmbient, syncAmbient } from './ambient';
import { getState } from '../store';

/** A decided fight plays only its last few effects (fx/play.ts queueFx keep). */
const DECIDED_KEEP = 6;

export { playFx, queueFx, fxBusyUntil, FX_EVENT, FX_IDLE } from './play';

/** The fight's effects stream key (its numbering restarts with every fight): the turn intro matches 'phc:fx-at' on it. */
export const combatStreamKey = (g: GameState | null | undefined): string | null =>
  g && g.combat ? 'cb|' + g.code + '|' + g.combat.name + '|' + (g.combat.log[0] || '') : null;
/** Which event stream is on screen: the fight's (named by the fight) or the area map's (named by the game). */
function streamOf(g: GameState | null, screen: string): { key: string; list: FxEvent[] } | null {
  if (!g) return null;
  if (screen === 'combat' && g.combat) return { key: combatStreamKey(g)!, list: g.combat.fx || [] };
  if (screen === 'main') return { key: 'st|' + g.code, list: g.story.fx || [] };
  return null;
}
const lastN = (l: FxEvent[]) => (l.length ? l[l.length - 1].n : 0);

export function FxLayer({ game, screen }: { game: GameState | null; screen: string }) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const seen = React.useRef<{ key: string | null; n: number; code: string | null }>({ key: null, n: 0, code: null });
  // The fight this layer has already watched, and how far: coming back to it (from the story tab, a level-up) plays only
  // what is new, and what happened while away is not replayed late.
  const fight = React.useRef<{ key: string; n: number } | null>(null);
  const latest = React.useRef({ game, screen }); latest.current = { game, screen };
  // When the combat screen came up (a new fight's opening waits for the combat-in transition to finish).
  const screenAt = React.useRef({ screen, at: 0 }); if (screenAt.current.screen !== screen) screenAt.current = { screen, at: Date.now() };
  React.useEffect(() => { setLayer(ref.current); if (game) preloadCombatSfx(); return () => setLayer(null); }, [!!game]);
  // Leaving the room unmounts the layer in the same render that drops the game: nothing queued may play on the title.
  React.useEffect(() => () => { clearFx(); clearAmbient(); }, []);
  // A hidden tab plays nothing: on return it catches up silently.
  React.useEffect(() => {
    const vis = () => { if (!document.hidden) { syncAmbient(ambientOf(latest.current.game, latest.current.screen, seenNow())); return; } if (document.hidden) { clearFx(); clearAmbient(); const s = streamOf(latest.current.game, latest.current.screen); if (s) seen.current = { ...seen.current, key: s.key, n: lastN(s.list) }; const ck = combatStreamKey(latest.current.game); if (ck) fight.current = { key: ck, n: lastN(latest.current.game!.combat!.fx || []) }; } };
    document.addEventListener('visibilitychange', vis); return () => document.removeEventListener('visibilitychange', vis);
  }, []);
  // Where everyone stands now and what the squad sees, for effects already queued as well as new ones.
  React.useEffect(() => { setContext(game, screen); if (!document.hidden) syncAmbient(ambientOf(game, screen, seenNow())); }, [game, screen]);
  // After the play effect below has read this render's tokens, keep copies of the living ones for the next kill.
  React.useEffect(() => { rememberTokens(); });
  const s = streamOf(game, screen), top = s ? lastN(s.list) : 0;
  const ck = combatStreamKey(game), ctop = game?.combat ? lastN(game.combat.fx || []) : 0;
  React.useEffect(() => {
    const h = seen.current;
    if (!game) { clearFx(); seen.current = { key: null, n: 0, code: null }; fight.current = null; return; }
    if (h.code !== game.code) { // a new or loaded game: sync silently
      clearFx(); seen.current = { key: s?.key ?? null, n: top, code: game.code }; fight.current = ck ? { key: ck, n: ctop } : null; return;
    }
    // Not watching the fight we know (another screen, the story tab): keep up with it silently.
    if (ck && fight.current?.key === ck && (!s || s.key !== ck)) fight.current = { key: ck, n: ctop };
    if (!s) return;
    if (document.hidden) { seen.current = { ...h, key: s.key, n: top }; if (ck) fight.current = { key: ck, n: ctop }; return; }
    let fresh: FxEvent[], opening = false;
    if (h.key !== s.key) {
      if (s.key.startsWith('cb|') && fight.current?.key === s.key) fresh = s.list.filter((e) => e.n > fight.current!.n); // back to a fight already seen
      else {
        // Another stream came on screen. A fight that has just begun plays from its start (who acts before you); going
        // back to the area map, or a fight already well under way, syncs silently.
        opening = s.key.startsWith('cb|') && (game.combat?.round || 1) <= 1 && s.list.length <= 40 && (s.list[0]?.n || 1) <= 1;
        fresh = opening ? s.list.slice(-24) : [];
      }
    } else if (s.key.startsWith('cb|') && top < h.n) { opening = true; fresh = s.list.slice(-24); } // the same fight started over (its numbering restarted)
    else fresh = s.list.filter((e) => e.n > h.n);
    seen.current = { key: s.key, n: top, code: game.code };
    if (s.key.startsWith('cb|')) fight.current = { key: s.key, n: top };
    if (!fresh.length) return;
    // Wait for the grid to be on screen (a screen change may still be sliding in), then play; give up after ~3 s. A new
    // fight's opening also waits out the combat-in transition: until it ends the grid is under the old screen's copy
    // and mid-flip, so the effects would be hidden and drawn in the wrong places.
    const stream = s.key, readyAt = opening ? screenAt.current.at + (reducedMotion() ? 220 : COMBAT_IN_MS) : 0;
    let tries = 0;
    const go = () => {
      if (latest.current.game?.code !== game.code) return;
      const busy = Date.now() < readyAt || (opening && !!document.querySelector('.phc-combat-in'));
      // A decided fight (won, lost, or every one of the viewer's fighters down): only its last moments play, at normal
      // speed; the steps the engine ran after it was decided aren't replayed.
      const cb = latest.current.game?.combat as any, me = latest.current.game ? Object.values(latest.current.game.characters || {}).filter((c: any) => c.owner === getState().me.id).map((c: any) => c.id) : [];
      const mine = cb ? (cb.units || []).filter((u: any) => u.charId && me.includes(u.charId)) : [];
      const decided = !!cb && (!!cb.over || (mine.length > 0 && mine.every((u: any) => u.dead || u.downed)));
      if ((!busy && canDraw()) || tries++ > 30) { queueFx(fresh, stream, decided ? { keep: DECIDED_KEEP } : {}); return; }
      setTimeout(go, busy ? 60 : 150);
    };
    go();
  }, [s?.key, top, game?.code, ck, ctop]);
  return <div ref={ref} aria-hidden="true" className="phc-fx-layer" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 45, overflow: 'hidden', contain: 'strict' }} />;
}
