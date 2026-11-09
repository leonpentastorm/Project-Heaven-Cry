// One stage for the big screen moments (decision 113, docs/design/cutin-spec.md section 12): Faith 2.2's Miracle scene
// (game/cutIn.ts, showCutIn) and the spotlight cut-ins' torn strips (game/spotlight/) never draw over each other.
//
//   - A Miracle takes the stage when it starts: a spotlight cut-in on screen clears at once (no way-out animation), and
//     spotlight cut-ins that come while the Miracle's scene is up wait their turn (the spotlight queue).
//   - The Miracle's scene ends at its landing (the portrait pulled away into the map): the stage is free again and the
//     spotlight queue moves on. Its "what it did" box stays a while after, under the map's dialogs; when a spotlight
//     cut-in starts while that box is up, the box closes first (the newer moment owns the screen).
//
// The two modules know nothing of each other: both talk to this one. Nothing here touches the game.

type Fn = () => void;
let scene = 0; // Miracle scenes up (the portrait not landed yet)
const boxes = new Set<Fn>(); // the Miracle boxes still up: each closes itself when asked
const onTake = new Set<Fn>(); // the spotlight layer: clear what you show, now
const onFree = new Set<Fn>(); // the spotlight layer: the stage is free, start the next one

const call = (fs: Set<Fn>) => { for (const f of [...fs]) try { f(); } catch { /* the stage never breaks the game */ } };

/** Is a Miracle's scene on screen (a spotlight cut-in must wait)? */
export const stageBusy = () => scene > 0;
/** A Miracle starts: any spotlight cut-in on screen clears now. Returns the landing call (the scene is over: the stage
 *  is free; idempotent). */
export function takeStage(): () => void {
  scene++; call(onTake);
  let done = false;
  return () => { if (done) return; done = true; scene = Math.max(0, scene - 1); if (!scene) call(onFree); };
}
/** A Miracle's box is up: close() is how a spotlight cut-in clears it. Returns the unregister call. */
export function stageBox(close: Fn): Fn { boxes.add(close); return () => { boxes.delete(close); }; }
/** A spotlight cut-in starts: any Miracle box still up closes. */
export function claimStage() { call(boxes); boxes.clear(); }
/** The spotlight layer listens: take (a Miracle came on: clear yours now) and free (start the next one). */
export function onStage(take: Fn, free: Fn): Fn { onTake.add(take); onFree.add(free); return () => { onTake.delete(take); onFree.delete(free); }; }
/** Tests: forget everything. */
export function resetStage() { scene = 0; boxes.clear(); }
