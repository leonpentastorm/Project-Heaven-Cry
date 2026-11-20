// Starting and leaving the Proving Ground, and its invite card's state: the small part the title, the room and the
// header need. The Proving Ground's panel (game/sandbox.tsx) is its own chunk, loaded when the Proving Ground opens
// (the bundle split); it re-exports these.
import { ARCHETYPES } from '@engine';
import { act, hostRoom, getState, go, leaveRoom, forgetSession, poke } from './store';
import { askConfirm } from './dialog';

// ---------- starting it ----------
/** From the title: open a fresh room and go straight into the Proving Ground with a test character (or the host's
 *  locked-in ones, if the room already has some). */
export function startProvingGround(archetype?: string, opts: { friends?: boolean } = {}) {
  hostRoom();
  if (getState().role !== 'host') return;
  // Standalone: opened from the title, so leaving it closes the room (friends who joined go back to the title).
  act({ type: 'sandbox/start', ...(archetype ? { archetype } : {}), standalone: true });
  if (opts.friends) openInvite();
}
// ---------- inviting friends (the room code, big) ----------
let inviteShown = false;
/** Whether the invite card is up (the panel reads it). */
export const inviteOpen = () => inviteShown;
/** Show the invite card (the room code, a copy button and the shareable link). */
export function openInvite() { inviteShown = true; poke?.(); }
export const closeInvite = () => { inviteShown = false; poke?.(); };
export const inviteLink = (code: string) => location.origin + '/?room=' + code;
/** From the room (host): the room's locked-in characters, or a test character when the host has none. */
export const openProvingGround = (archetype?: string) => act({ type: 'sandbox/start', ...(archetype ? { archetype } : {}) });
export const QUICK_ARCHETYPES = ['sharpshooter', 'bulwark', 'sigilist', 'mender', 'brawler', 'heavy_gunner'].filter((id) => ARCHETYPES.some((a) => a.id === id));
/** Leave the Proving Ground (host): the room comes back as it was, and everyone returns to the room screen. */
export function leaveProvingGround(ask = true) {
  const st = getState(), sb = st.game?.sandbox;
  // A guest leaves on their own: their fighter goes, and they land on the title.
  if (st.role === 'guest') {
    if (ask) { askConfirm({ title: 'Leave the Proving Ground?', body: 'Your fighter goes with you.', confirm: 'Leave' }).then((ok) => ok && leaveProvingGround(false)); return; }
    act({ type: 'sandbox/leave' });
    setTimeout(() => leaveRoom(), 250); // let the action reach the host first
    return;
  }
  const standalone = !!sb?.standalone, others = (st.game?.players?.length || 1) > 1;
  if (ask) { askConfirm({ title: 'Leave the Proving Ground?', body: standalone ? (others ? 'It closes for everyone.' : 'Back to the title screen.') : 'The room goes back to how it was before.', confirm: 'Leave' }).then((ok) => ok && leaveProvingGround(false)); return; }
  act({ type: 'sandbox/end' });
  // From the title: the room was only for the Proving Ground; it closes, and everyone goes to the title.
  if (standalone) { const code = st.code; setTimeout(() => { leaveRoom(); if (code) forgetSession(code); }, others ? 250 : 0); return; }
  if (getState().game?.phase === 'lobby') go('room');
}
