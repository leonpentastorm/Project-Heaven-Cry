# A referee in the room: the engine in the Durable Object (proposal, not built)

20 Nov 2026, lane 0.33 online. Asked for by the ROADMAP's "Multiplayer input delay" ("a referee in the room server is
the big option"). **Recommendation: do not build it for the delay.** Read the live delay first (0.33's ping line and
report bundle); build it later, if at all, for what it buys besides milliseconds.

## Today

Rooms are host-authoritative (decision 62). A guest's click travels guest -> room -> host's browser (the engine
applies it, builds every player's view) -> room -> guest. The host's own clicks never leave its browser. Locally the
whole trip is about 52 ms median (0.32-COOP.md); Leon measures 2 to 3 s from Vietnam with a host in the US.

What a view weighs (measured 20 Nov 2026, two players, Survival stages 1 and 2, seed PHC-0003, 342 views): **35 to
61 KB of JSON, about 10 KB deflated**. Size alone does not make seconds on a working link.

The trip's network part is two round trips: guest <-> room and room <-> host. The room is made near the first
connection to it (Cloudflare: Data location), which is the host's; 0.33 adds a location hint from the host's continent
so a guest's link arriving first cannot place it far from both. With the room near a US host, guest <-> room is the
Vietnam to US round trip (about 200 to 300 ms on a good day) and room <-> host is tens of ms.

## What a referee would be

The engine (`packages/engine`, deterministic, no DOM) runs inside the `Room` Durable Object. Every player, the host
included, sends actions to the room; the room applies them and sends each player its view (`viewFor`). The room holds
the state (it already holds the save). The AI Narrator stays in the host's browser (the key never leaves it: BYOK), so
a Narrator turn becomes host -> room as an action, as a guest's is now.

## What it buys, in ms

- A guest's action: guest -> room -> guest. It saves the room <-> host round trip and the host's own time: with the
  room near the host, **about 20 to 80 ms**. Of a 2 to 3 s delay, nothing worth the work.
- The host's own actions get slower: today they are instant, then host <-> room (tens of ms near, 200+ ms if the room
  were moved toward the guest).
- Placing the room between the players does not help: any place on the way has the same total.
- Only a guest predicting its own result would hide the guest <-> room trip, and a guest cannot: its view is fogged
  (fog.ts), so it does not hold the state the engine needs. 0.33's "sending" mark is the honest part of that.

## What it buys besides

- The game goes on when the host's browser sleeps, crashes or closes (today the room waits for it).
- One authority nobody's browser can change (a host can edit its own state today).
- A background host tab cannot slow guests (browsers run hidden tabs' timers late; the store already works round it).

## Cost and risk

- **Size:** the engine with its data is 3.0 MB minified, about 0.95 MB gzipped: inside a Worker's 10 MB (Paid plan).
  Each cold start parses it (tens to a few hundred ms, once per room wake).
- **CPU:** an action is a few ms locally (0.32-COOP.md: median 2 ms apply, 1 ms views). Durable Object duration is
  billed while the room works; a fight of a few hundred actions is seconds of CPU a session. Cheap.
- **Work (the risk):** the store's host path (`store.ts runHost`, `broadcast`, persistence, votes, rerolls kept as
  "befores" on the host, the Narrator's loop and its fight rulings) moves to the server or is split across the link.
  Rerolls keep copies of state before each Narrator turn in the host's IndexedDB: those move to room storage. The
  engine needs a server build target and its data loaded in the Worker. Every co-op suite is rewritten against it.
  This is close to the kind of rebuild Leon has ruled out (CLAUDE.md, "No rebuild, ever again"); it would have to be
  staged (the room as a mirror first, applying actions and comparing versions with the host's, then the switch).
- **Saves:** old rooms' saves are already the full state (slim), so they load; the host's IndexedDB copy with its
  archive becomes a backup only.

## What to do first instead

1. Read the live delay with 0.33: two players far apart, the ping line on both screens, one Report a problem bundle
   from the guest (its `net.acts` hold each action's parts). If **you–room** is most of it, it is the guest's own
   route to Cloudflare (Vietnamese networks often reach it through Hong Kong, Singapore or further; undersea cable
   faults on those routes have made seconds of delay before): nothing in the game fixes that but fewer round trips.
   If **room–host** is most of it, look at the host's machine and tab (a hidden tab, a busy laptop). If **host** is,
   the engine or the views are slow there.
2. If bytes matter on the measured link: send views as differences from the last one the guest has (it already says
   its version on each check-in), about 1 to 2 KB an action instead of 35 to 60 KB.
3. If the round trips themselves are the delay, a referee saves one of the two only when the room is far from the host;
   reconsider then, staged as above.
