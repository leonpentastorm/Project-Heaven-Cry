# Hand-off: `feature/proving-ground-mp` (8 Nov 2026)

For Leon, Leon's Claude, and the other sessions on this project. Written by the Claude session that built Proving Ground multiplayer. It is a separate file from the `HANDOFF.md` on `feature/ooc-mission-board` and `feature/combat-layout`, so the branches don't collide on it; delete it once this branch is merged.

Not merged, not deployed, no pull request. Built from `develop` at `0c4884c`; only this branch was pushed.

| Branch | Built from | Commits (oldest first) | Merges into `develop` |
|---|---|---|---|
| `feature/proving-ground-mp` | `develop` at `0c4884c` | engine · client · spec and decisions · e2e · renumbering and this file | Cleanly |

**Against the other branches (checked locally):**
- `feature/combat-layout`: merges cleanly.
- `feature/ooc-mission-board`: the code merges cleanly. The only conflicts are at the end of `docs/rules/PHC-Core-Rules-v1.0.md` (section 14) and `docs/design/decisions.md`, because both branches append there. Keep both blocks.
- **Numbering:** the missions branch uses decision **95** and spec items **377–382**. This branch uses decision **96** and spec items **383–385** so they don't clash.

---

## What it does

Turns the Proving Ground (practice mode, no Narrator) into a multiplayer practice mode. Full rules: the new **"The Proving Ground"** section of the spec, and decision 96.

- **Title:** PROVING GROUND asks **Solo** or **With friends**. Both open a room just for it (`sandbox.standalone`). With friends shows the room code big, with copy buttons and the link. The Squad tab's "+ Invite friends" shows it again.
- **A fighter for everyone:** a joiner gets "Recruit 2", "Recruit 3"… (Wick's face), or brings a **copy** of a saved character or draft (library or `.phc.zip`). Copies and Recruits are removed when the Proving Ground ends. Up to 4 players. A dropped connection keeps the fighter and READY.
- **READY:** a toggle per player. Start the fight is the host's and shows "2 / 3 ready". Anyone can start it once everyone is ready. Attacking a drill unit still starts it at once, and the log says how many were ready.
- **Permissions:** everyone gears their own fighter, readies, picks a team, and can use Next wave and Retry (the host can turn guest Retry off). The field tools (spawn, clear, waves, mana), AI, endless waves, settings, removing players and ending are the host's. "Everyone can spawn" opens the field tools to all.
- **Waves scale with the party:** × (0.6 + 0.4 × players). One player gives the solo waves. Provisional, item 383.
- **Best wave** per room and per player; team-fight wins per player. The Squad tab lists every player.
- **Team fight (PvP):** a room setting, Mode: Co-op waves | Team fight.
  - Team B's fighters sit on the engine's existing foe side but are players' units: `runEnemies` skips any unit with a `charId`.
  - Each Team B player's **view** is flipped (unit sides, glyphs, walls, effects, the result). The combat screen needed no changes, and fog of war is per team.
  - Downed is out on both sides (item 384).
- **Leaving:**
  - A guest's fighter leaves with them, mid-fight too.
  - The host's end restores the room: characters, story, and now the player list.
  - Opened from the title, the host leaving closes the room. Guests see "The host closed the Proving Ground." and land on the title.
- **No Narrator:** none on any path. The `g.sandbox` gate in `store.ts` `maybeNarrate` stays, and a new store test proves it.

## Where the code is

- `packages/engine/src/game.ts`:
  - A new block at the **end of the file**, "the Proving Ground multiplayer": `SandboxMpAction`, `sandboxMp`, `sbBeginTeams`, `sbTeamsOver`, `sandboxAfter`, `sandboxView`, and the helpers `sandboxScale`, `sandboxReady`, `sandboxTeam`, `sbParty`.
  - Small edits elsewhere:
    - Optional fields on `Sandbox`, so old saves load.
    - `sandboxWave(n, party = 1)`.
    - Permission checks in the existing `sandboxAction` cases.
    - One line each in `apply` (calls `sandboxAfter`), `viewFor` (calls `sandboxView`) and `runEnemies` (skips player units).
    - `combat/stim` checks the stimmer's own side instead of `'pc'`.
- `apps/web/src/game/sandbox.tsx`:
  - Changed: Solo / With friends start, leave flow, READY, the ready count on Start the fight.
  - New: the invite card, the Players section on the Squad tab, Bring a character, the team fight's end card.
- `apps/web/src/game/store.ts`: `provingClosed` (what a guest sees when the host closes it).
- `apps/web/src/title/Title.tsx`: the `ProvingPanel`.
- `screens/main.js`: the header chip text.
- `screens/room.js`: Leave for guests in the Proving Ground.

**For the perk, trait and class session:** if you add `sandbox/*` actions, add them to `SandboxAction` and to the existing `sandboxAction` switch as usual. The multiplayer actions are a separate set (`SB_MP_ACTIONS`) and don't overlap.

## Tests

| Check | Result |
|---|---|
| Engine tests | 727 passed, 1 skipped (18 new in `test/sandbox-mp.test.ts`) |
| Web tests and type check | 94 passed (new: `store-narrator.test.ts`, plus With friends in `sandbox.test.ts`) |
| `tools/validate.py data` | 0 errors |
| Build | Passes |
| `e2e/sandbox-mp.mjs` (new, 3 browsers) | 26 / 26 checks pass on the final run. The team-fight section needed two fixes to the test's own movement before it reliably ended with a winner. That part has passed once since, so run it a few more times. |
| `e2e/sandbox.mjs` | Passes (now clicks Solo). One check, the HP right after Retry, is flaky on plain `develop` too: enemies with higher initiative shoot first. |
| `e2e/two-players.mjs` | Completes. The only console errors are a font blocked by the sandbox's network proxy. |

## For Leon to decide

1. **Solo vs With friends.** Solo still accepts joiners if someone has the code; only the invite card differs. Should Solo refuse joins?
2. **Leaving from the title now goes back to the title** for everyone. Before, a solo run from the title went back to a room lobby.
3. **A removed player's fighter** is removed, not kept as an AI-less dummy (the simpler option).
4. **Provisional:**
   - 383: the 0.6 + 0.4 × players wave scaling.
   - 384: "Downed is out" in team fights.
   - 385: Team B can't use Analyze or Weak Point and doesn't spot traps while moving, because those rules still assume the player side.
5. **Two existing sandbox tests changed:** a guest can no longer start the fight unless everyone is READY (it's the host's button now).
