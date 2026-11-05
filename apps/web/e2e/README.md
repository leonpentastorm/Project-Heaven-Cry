# End-to-end tests

Two real browsers play a session through the room relay, with the scripted Narrator (no API key needed).

- `two-players.mjs`: host opens a room, both make characters through the creation screens, the session starts, both speak, the Narrator calls a check (rolled on the dice table), a fight runs to the end on the grid, the story resumes, Level up opens.
- `reconnect.mjs`: both players refresh mid-session and come back to the story; the EPCCG "?" entry and the lightbox open.

Run against local dev (`npm run dev -w @phc/server` after `npm run build`) or the live site:

```bash
node apps/web/e2e/two-players.mjs
BASE=https://project-heaven-cry.leonpentastorm.workers.dev node apps/web/e2e/reconnect.mjs
```

Screenshots land in `apps/web/e2e/shots/`. Playwright is loaded with `require('playwright')`.
