# End-to-end tests

Two real browsers play a session through the room relay, with the scripted Narrator (no API key needed).

- `two-players.mjs`: host opens a room, both make characters through the creation screens, the session starts, both speak, the Narrator calls a check (rolled on the dice table), a fight runs to the end on the grid, the story resumes, Level up opens.
- `tabs.mjs`: the combat action tabs in the Proving Ground at 1440×900 and 1280×720 (every tab, the glyph keyboard and the Outburst design cards open; the grid and Confirm stay on screen with no page scroll), keys 1–6 and arrows, the turn card and a hostile click switching tabs, the last tab remembered, and a 900 px window with the action dock at the bottom. Shots: `tabs-*.png`. Combat tests click actions with `pickAction()` from `lib.mjs`, which opens the tab that holds the action first.
- `slate-title.mjs`: the title at 1280×720, 1440×900, 1920×1080, 2560×1440, 900×800 and 390×844: the words never clip, the back and mid key art load, parallax moves, Wick runs / idles / says hello, hover works on other rows during his hello, and the first-key greeting. Shots: `slate-title-*.png`.
- `slate.mjs`: the combat panel in a Proving Ground fight: the Say row stays on screen (1440×900, 1280×720, 1093×526, 900×800), Hide panel (the map widens and stays clear of the mini-bar, keys 1–4 and H, remembered after a reload), and customising the turn card's four commands (slot 1 → Reload shows on the next card, Reset). Shots: `slate-combat-*.png`.
- `slate-stamp.mjs`: the Lock in stamp caught at ~120 ms and ~500 ms, APPROVED, filed once, reduced motion fades. Shots: `slate-stamp-*.png`.
- `slate-music.mjs`: two players in the Proving Ground: no fight music while gearing up, Gunline for a wave, Heaven Falls for a boss, Last Rounds with half the party Downed (both browsers), then Leave puts both on the room screen.
- `sandbox.mjs`: the Proving Ground from the title: gearing up, the magic kit, give / unequip / equip, a mini-map click starts the fight, waves, a Sigil, Retry, Leave to the room, no Narrator calls.
- `reconnect.mjs`: both players refresh mid-session and come back to the story; the EPCCG "?" entry and the lightbox open.

Run against local dev (`npm run dev -w @phc/server` after `npm run build`) or the live site:

```bash
node apps/web/e2e/two-players.mjs
BASE=https://project-heaven-cry.leonpentastorm.workers.dev node apps/web/e2e/reconnect.mjs
```

Screenshots land in `apps/web/e2e/shots/`. Playwright is loaded with `require('playwright')`.
