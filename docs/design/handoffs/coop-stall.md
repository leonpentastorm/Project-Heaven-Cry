# The co-op fight that stood still

11 Nov 2026. A two-player fight (host and guest) sometimes stopped: seen once on the live site and once on this
machine. This note says what was seen, what was found, what was changed, and what is still not explained.

**Status: persistent, with safety nets.** One real cause was found and fixed (the room relay, cause 1). The stall
itself could not be made to happen again, in 34 fights before the fixes and 41 after them, so nobody can say
the fix is the whole story. Both kinds of stall now have a way out that does not depend on knowing the cause. Leon
tests it live; what to send if it happens again is at the end.

## 1. What was seen

1. **Live site, the guest fell behind.** `apps/web/e2e/two-players.mjs` against the live site printed `other,other`
   for hundreds of loops: neither browser thought it was its own turn. The host's screen had shown banners up to
   "MAI Ninety-Two ROUND 2" (the guest's character's turn). The guest's screen had only shown "LEON MPAT ROUND 1". The
   guest was still on a round 1 state while the host had moved on, so the host waited for the guest and the guest
   waited for the host.
2. **This machine, the panel stayed locked.** About once in ten runs the guest's End turn click never landed: the
   action panel stayed greyed out with `data-lock="held"` ("The other turns are still playing out…") on the guest's own
   turn for at least 30 s (the click's timeout).

These are two different stalls. In the first the guest's **state** stops advancing (sync). In the second the state is
right and the **screen** does not unlock (display).

Since both sightings the turn display was reworked (commit 6fc6166, "A fight plays every effect in order"): the
screen now treats the turn as not yours until every turn banner in the effects has played. That made a display stall
easier to cause, not harder, which is why the way out in section 4 matters.

## 2. How it was looked for

Everything ran on this machine: `npm run build`, `npm run dev -w @phc/server`, two headless Chromium pages per run.

| What | Runs | Stalls |
| --- | --- | --- |
| The fight of `two-players.mjs`, before any fix, each player acting only when their panel is unlocked | 25 | 0 |
| Same, a tab hidden and shown again after every third action (`visibilitychange` with `document.hidden` forced) | 3 | 0 |
| Same, the guest's network off for 1.5 to 4.5 s after every fourth action | 3 | 0 |
| Same, the guest refreshing after every fifth action (up to 28 refreshes in one fight) | 3 | 0 |
| The relay alone: a guest's old socket that never answers, then the same guest again on a new socket | 2 | **2** (every time) |

The fights before the fixes were run with a diagnostics copy of `two-players.mjs` (since removed; `coop-stall.mjs`
part C is the same loop). A stall was "45 s without the game's version or whose turn it is changing on either screen". When that happens the
script prints both screens' books (section 6).

Two things came out of the 25 plain runs that are not stalls but look like one from the old script:

- **Long fights.** 5 of the 25 fights took 130 to 370 s and 37 to 132 actions; the rest took 30 to 60 s. The old
  `two-players.mjs` loop stopped after 300 passes whatever the fight was doing, then failed on "Back to the story". A
  long fight was reported as a failure. The loop now runs until the fight ends.
- **Clicks during the hold.** The old loop clicked End turn the moment the state said "your turn", while the other
  turns were still playing on screen. The panel takes no click then, so the click waited. That is harmless when the
  hold is short, but it is the path sighting 2 came through. The loop now waits for the panel, as a player does.

Neither explains a panel locked for 30 s. Sighting 2 was not reproduced.

## 3. Cause 1 (found, fixed): a dead socket stopped the relay

`apps/server/src/index.ts`, `Room.webSocketMessage`, `Room.toHost`, `Room.toGuests` and `Room.fetch`.

The room object sends a player's view to every socket filed under that player:

```ts
for (const g of this.ctx.getWebSockets(m.pid)) g.send(s);
await this.ctx.storage.put('view:' + m.pid, m.state);
```

When a player connects again, the room closes their old socket (`ws.close(4000, …)`). A closed socket stays in
`getWebSockets()` until the other end answers the close. If the other end is gone without a word (a network that
dropped, a laptop lid, a proxy that cut the line), it never answers, and `send()` on it throws
`TypeError: Can't call WebSocket send() after close()`. The loop ended there. So:

- the player's **new** socket, later in the list, never got the view;
- the line after the loop never ran, so the view kept for reconnects went stale too;
- the same throw in `toHost` stopped a guest's actions reaching the host, and in `Room.fetch` (`toGuests`, `toHost`)
  it failed the upgrade of whoever tried to connect next.

The guest then sits on the last state it got. The host sees nothing wrong. This is exactly sighting 1's picture: the
host on round 2 waiting for the guest, the guest on round 1.

It is reproduced every time by `apps/web/e2e/coop-stall.mjs` part A (a raw socket that does the handshake and never
reads again, then the same player on a normal socket): before the fix the new socket got no view at all and the
server log showed the `TypeError` at `index.ts:109`; with an old socket that answers its close (the control) all three
views arrived.

**Honest limit:** this is proven as a bug and as a cause of that exact picture. It is **not** proven that it is what
happened on the live site that day. The live run went through this sandbox's network proxy, which makes a silently
dropped socket plausible, but there is no log from that run to confirm it.

**Fix.** Every send in the room goes through `post(ws, s)`, which skips a socket that is not open and never throws.
The loops always finish and the kept view is always written. "Is the host online" and "has this player any other
socket" count open sockets only.

## 4. The safety nets

These do not depend on cause 1 being the whole story.

### 4.1 A guest that has fallen behind catches up by itself

`apps/web/src/game/store.ts` (`syncTick`, `answerSync`) and the room's `sync` message.

Before, a lost view was lost for good: nothing sent it again until the host's next action, and in a fight the host may
be waiting for that very guest. Now a guest says which version of the game it has (`{ t: 'sync', v }`) every 5 s in a
fight and every 30 s otherwise. The room passes it to the host, and the host sends the view again when that version is
not its own (marked `resync: true`, counted in `window.__phc.net().resyncs`). With the host away, the room answers
from the view it kept. A player the host has down as away is marked back. Someone who is not in the room gets
nothing: joining is still by arriving.

Cost: one small message per guest every 5 s in a fight. Outside a fight it is about the same traffic as the link's
existing 25 s ping.

Also in `store.ts`: when the host's link comes back, the "here is the state now" broadcast goes out one beat later, so
it is the last thing to arrive. `net.ts` sends whatever it queued while the link was down right after it reports the
link open; the broadcast used to go out before that queue, so an older view could land after the newest one.

### 4.2 The screen never waits for good on effects that will not play

`apps/web/src/game/fx/play.ts` (`waitingIn`, used by `fxShownTurn`, `fxShownLog` and `fxShownHp`).

The combat screen shows the turn, the log and the HP as far as the effects have played. An effect counted as waiting
that never plays would lock the panel for ever. Now the wait has a bound. A fight's effects are **settled** (all
counted as played, so the screen shows the real state) when they are still waiting and either:

- nothing has been queued, taken up or played for `STUCK_MS` (6 s) **and** nothing is left that could play them (no
  timer, no closed cut-in gate, the queue's end is in the past); or
- nothing has moved at all for `STUCK_HARD_MS` (45 s), whatever is still scheduled.

The clock starts when the screen first sees a state's newest effect, so a long quiet spell before an action does not
count. A long enemy phase that is actually playing is never cut: each effect that plays restarts the clock. Settling
writes one `console.warn` with the numbers and counts in `window.__phcFxDebug().settled`. The combat screen already
looks again at least every 4 s while it waits (`combat.js`, `_turnTimer`), so it picks the change up without a new
timer.

In the same file, `turnsBusyUntil()` (the "held" lock after the other turns) was capped at "now + 8 s", a cap that
moves with the clock and so never runs out. With nothing left to play and no cut-in on screen it is now a banner's
tail at most (`TURN_TAIL_MS`, 120 ms).

### 4.3 Batches are queued in the order they came

`apps/web/src/game/fx/FxLayer.tsx`.

A fight's opening batch waits out the combat-in transition before it is queued. A state that arrived during that wait
was queued at once, ahead of the opening, so its effects played first and the opening's turn banners played after
them. Found by reading the code; not seen to cause a stall. Batches now wait in line. A batch still waiting when the
tab goes out of sight is dropped (the queue is cleared then and its effects already count as played).

## 5. What was checked and ruled out

| Suspect | Verdict | Evidence |
| --- | --- | --- |
| A hidden tab (`visibilitychange`, the `document.hidden` paths in `FxLayer`) | No stall | 3 fights with a tab hidden and shown after every third action, before the fixes: 0 stalls. On hide `clearFx` counts everything queued as played. |
| A cut-in gate that never reopens | No path found | `closeGate` always arms a cap timer; `clearFx` resets the gate. The new 45 s bound covers it anyway. |
| The stream key changing in the middle of a fight | No stall | A new key has no books, so the screen shows the real state. |
| More than 40 effects in one host action (`FX_CAP` in `packages/engine/src/combat.ts`) | No stall, but a real loss | Unit test "a phase longer than the engine keeps". The screen only waits for effects that are in the list. **The dropped effects never play on any screen**: see section 7. |
| A guest that joins, refreshes or reconnects in the middle of a fight | No stall | 3 fights with up to 28 guest refreshes, before the fixes: 0 stalls. |
| The guest's network dropping for a few seconds | No stall | 3 fights. Note: Playwright's `setOffline` may not cut a socket that is already open, so this says little about a real drop. Part A of the suite is the real test of that. |
| The message being too big for the room (`raw.length > 2_000_000` is dropped without a word) | Not in this fight | A fresh room's view is far under the limit. A long campaign's could reach it: see section 7. |

## 6. Evidence after the fixes

| What | Runs | Stalls |
| --- | --- | --- |
| `coop-stall.mjs`, all three parts, nothing disturbing the fight | 25 | 0 (every check passed in all 25) |
| Same, part C with 35% of the views to the guest dropped at random (`MODE=lossy`) | 3 | 0 (2 to 6 views lost per fight, each made up by a check-in) |
| Same, a tab hidden and shown again (`MODE=hide`) | 3 | 0 |
| Same, the guest's network off and on (`MODE=offline`) | 3 | 0 |
| Same, the guest refreshing (`MODE=reload`; one fight had 34 refreshes in 169 actions) | 3 | 0 |
| `two-players.mjs` with its new loop | 3 | 0 |
| The relay with a silent old socket (part A) | 27 | 0 (was 2 of 2) |

That is 41 fights after the fixes with no stall (the 40 above and the first trial run), against 34 before with none
either. **The fight loop therefore proves nothing about the original stalls**: they did not happen before the fixes
in these runs, so their absence afterwards is not evidence. What the runs do show:

- the relay bug is gone (2 of 2 before, 0 of 27 after);
- a lost view no longer strands the guest (part B in 37 runs, and the `lossy` fights);
- the way out in 4.2 was **never used** in any run (`settled` was 0 on both screens every time), so it changed nothing
  in a healthy fight;
- the fixes did not slow or break anything: `reconnect.mjs` passes, the web unit tests pass (813).

One caveat on the numbers: the 25 plain runs used a first form of the relay fix that also skipped sockets by their
`readyState`; the final form (never throw, and count a socket out only when it says closing or closed) ran part A, the
12 disturbed fights and the 3 `two-players.mjs` runs. A fourth `two-players.mjs` run failed with "connection refused"
because the dev server reached its two-hour limit and was stopped in the middle of it; it was run again and passed.

Automated tests added:

- `apps/web/src/game/fx/stall.test.ts` (7 tests, fake clocks): a batch counted as queued that never reaches the queue
  is settled after `STUCK_MS` and not before; effects never taken up are settled the same way; a 9 s enemy phase that
  is playing is waited for in full and not settled; a long quiet spell before new effects does not count; the 45 s
  bound; a phase longer than `FX_CAP`; the input hold ends with the queue.
- `apps/web/src/game/sync.test.ts` (3 tests): the guest's check-in rhythm (30 s, 5 s in a fight, never while the link
  is down); an answer is taken and counted; the host answers a player on another version, says nothing to one in step
  or to a stranger, and marks a player back.
- `apps/web/e2e/coop-stall.mjs`: part A, the relay with a silent old socket, and the `sync` message with the host
  there and away; part B, two browsers in a fight, the view of a host action dropped on the wire, the guest catching
  up by its own check-in; part C, the fight to its end with stall detection. `MODE=hide|offline|reload|lossy` disturbs
  it on the way (`lossy` drops 35% of the views to the guest).
- `apps/web/e2e/two-players.mjs`: no fixed loop length, waits for the panel like a player, fails as a stall after
  45 s without movement and prints both screens' books.

## 7. Still not explained, and things found on the way

1. **Sighting 2 (the panel locked for 30 s on the guest's own turn) has no proven cause.** No path was found in the
   code that keeps the hold up that long, and it did not happen again. The bound in 4.2 is the answer to it until it
   does.
2. **Sighting 1 on the live site is explained by cause 1 but not proven to be it** (section 3).
3. **Effects past 40 in one host action are lost for everyone.** `emitFx` keeps the last `FX_CAP` = 40. A big enemy
   phase writes more than that in one step, so its first moves and banners never reach any screen: units jump to where
   they ended. It is not a stall. The fix belongs in the engine (keep a whole action's effects, or send effects by
   number instead of as a window) and was outside this task's files.
4. **A view over 2,000,000 characters is dropped by the room without a word** (`Room.webSocketMessage`). With 4.1 the
   guest would ask again and again and never get it. Not reachable in a short session; worth a size check on the host
   before a long campaign is played in co-op.
5. **`net.ts` keeps at most 200 messages while the link is down and drops the newest past that.** With 4.1 a guest
   catches up anyway; the cleaner fix is to keep only the newest view per player. Outside this task's files.
6. **Long fights.** One fight in five here ran over two minutes. In the one that was looked at, 26 of the first 40
   actions were End turn with no attack to confirm (round 14, one hostile left on 45 HP two tiles away). The test only
   knows Shot and Strike, so this may be the script's play more than the game's balance; it was not looked into
   further. It is why the old test looked flaky.

## 8. If it happens again: what to send

In the browser console of **both** players, while it is stuck:

```js
JSON.stringify({ net: __phc.net(), fx: __phcFxDebug(), v: __phc.getState().game.v,
  turn: (c => c && [c.round, c.turn, c.order[c.turn]])(__phc.getState().game.combat),
  lock: document.querySelector('.phc-cb-dock')?.getAttribute('data-lock') })
```

- `net`: this player's role, the link's state, the last message's kind and how long ago it came, how many resyncs,
  the game's version (`v`; on the host also `hostV`).
- `fx`: per fight, how far the effects were taken up (`processed`), queued (`queuedTo`) and played (`playedTo`); how
  long until the queue ends; whether a cut-in gate is closed; how many timers wait; how long nothing has moved
  (`quietMs`); how many times the way out was used (`settled`).

How to read it: different `v` on the two screens for more than 10 s is a sync stall (and `resyncs` not rising means
the check-in is not getting through). The same `v` with a `lock` that stays is a display stall (and `quietMs` over
6000 with `timers` 0 means the way out should already have opened it). Any `[phc] a fight's effects stopped playing`
warning in the console is the way out firing: send that line too.

Both hooks are permanent and cost nothing until called.
