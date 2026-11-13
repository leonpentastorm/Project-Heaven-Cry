# Starting a local session: the total hand-off (12 Nov 2026)

For Leon, and for the Claude Code session he starts on his own computer. Written by the cloud lead session that shipped
0.23.0. Read this top to bottom once; after that the standing documents take over (section 4).

## 1. Where everything is

- **Live:** 0.24.0 (deployed 12 Nov, later the same night; `backup/live-0.24.0`; the three UI fixes of section 3 item 1 are in it, with rules 1.27, the technique animations and the camera: see `CHANGELOG.md`). Before it: 0.23.0, https://project-heaven-cry.leonpentastorm.workers.dev (deployed 12 Nov on Leon's word).
- **Branches:** `main` = live. `develop` = `main` plus docs. Backups: `backup/live-0.23.0`, `backup/live-0.22.0`.
  `claude/charming-gauss-hbq4n0` was the cloud session's working branch; it is merged, start new work from `develop`.
- **Stale branches on the remote, safe to delete:** every `wip/worktree-*` (work in flight that has since been merged),
  `art/briefs-complete` (merged), `music/new-tracks` (merged in 0.22.0).
- **In flight when this was written:** one agent on three UI fixes Leon reported on live 0.23.0 (section 3, item 1).
  If its work is on `develop` when you start, the BUGLIST section "Found by Leon on live 0.23.0" says so; if not, it is
  the first job.

## 2. Setting the computer up (once)

Needs: Git, Node 22, Python 3.11 or later, about 6 GB of disk. Then:

```bash
git clone https://github.com/leonpentastorm/Project-Heaven-Cry.git
```

```bash
cd Project-Heaven-Cry && git checkout develop && npm install
```

```bash
npx playwright install chromium
```

```bash
npm run assets && python3 design/canvas-build/build.py --web && npm run build
```

```bash
npm run check
```

That last one must end `ALL GREEN` (about 3 minutes). Then start Claude Code in the folder (`claude`), and say:
"Read CLAUDE.md, then docs/design/handoffs/LOCAL-SESSION-START.md, and continue from its section 3."

- **Play it locally:** `npm run dev -w @phc/server`, then http://127.0.0.1:8787.
- **Browser tests:** `npm run e2e -- smoke` (5 suites), `npm run e2e -- all` (61 suites; 24 minutes on the cloud
  machine, less on a good one; raise `--jobs` from 3 to half your cores).
- **Deploying from a local machine** needs a Cloudflare API token with Workers and Workers KV edit rights in the
  environment as `CLOUDFLARE_API_TOKEN` (the cloud session had it injected; a local one does not). Then, on `main`:
  `npm run build`, `python3 tools/deploy_site.py`, and `npx wrangler deploy` in `apps/server`. Never without Leon's
  word for that release; make the `backup/live-<version>` branch each time.
- **GitHub:** the local session uses your own `git` and `gh` login; nothing else to set up.

**What a better computer changes, honestly.** The cloud container was small and shared by every agent the lead
started: with three agents each running the test suites, tests timed out, a browser run took eight hours of retries,
and ten work copies filled the disk. A good local machine fixes exactly that: checks in a minute or two, the full
browser run while agents work, several agents at once (each agent's work copy is about 2.5 GB). It does **not** change
how well the model reasons, and it does not change the usage limits: those belong to the account, not the machine.
One thing is worse locally: nothing keeps running when the computer sleeps or the terminal closes.

## 3. What to do next, in order

1. **Three UI fixes from Leon's first play of 0.23.0** (if not already merged): a hovered map tile and its tooltip draw
   over the column header and the mini-map after the map is dragged; action tooltips are one wall of text and should
   be lines (name and cost, one line a sentence, the weapon's modifier and each weapon trait on their own lines);
   dual wielding: after reloading one gun "reload both" goes away and the second gun cannot be reloaded, and the
   Attack tab should group actions by weapon (main hand, off hand, Both; Reload, Unjam and "shoot an object" inside
   each weapon's group; a thin line between groups). The full brief is in the BUGLIST section named above.
2. **Leon's playtest** with `docs/PLAYTEST-CHECKLIST.md`. Nobody had played 0.23.0 before it went live; every check
   was automated. Its last section is the 29 calls made for him: he may reverse any.
3. **Small and ready:** the painted vow, Witnessed and prayer icons ignore their colour (put them on `paintedStyle` in
   `apps/web/src/game/heartIcons.ts`, as the feelings and modules were). Bug 12 still waits on Leon's answer.
4. **Balance, what the re-fit left** (`docs/design/handoffs/balance-refit.md`, `docs/design/balance-contract.md`):
   melee cannot hold the 1.25 gap between all-in and normal (blows nearly always land); Hymn turns are low at levels
   1 to 5; boss fights last 5 to 8 rounds against 8 to 10 aimed for; the Defender is not yet lower than the other
   melee classes; class moves, perks, special rounds, Calls, reactions and armour were never measured; the control
   yardstick is an estimate. Any number change: spec first (a new revision, 1.27), then data, then the validator.
5. **Engine foundation, what wave 3 left** (`docs/design/proposals/2026-11-engine-review/PLAN.md`, and
   `docs/ENGINE-GUIDE.md` "unfinished edges"): item ops second pass (289 of 310 per-item handlers are still code; the
   order to take them is in `engine-foundations-3-item-ops.md`; this is what the roguelike needs most); preview as a
   dry run; one state table for character, unit and story; the combat screen split; effects with a schema; rooms sent
   by hash and the Narrator prompt cut down; the spec's revisions 1.14 to 1.26 folded into its body.
6. **Then new systems** (`docs/ROADMAP.md`): Weapon Arts, armour, the open playstyles, the advanced classes, the
   roguelike. Each is balanced against the contract before it ships.

**How to ship from now on (the lead's advice after 0.23.0):** one system or one foundation piece per version, each
with its own short browser run and a playtest Leon can do in ten minutes. 0.23.0 carried twelve rules revisions and a
rebuilt foundation in one release, and a bug like "an element loses its area effect when the hit kills" sat unseen
for a week of stacked changes.

## 4. The standing documents (what to read for what)

| For | Read |
| --- | --- |
| The project, the rules of working with Leon | `CLAUDE.md` |
| Extending the engine: where a thing goes, what proves it | `docs/ENGINE-GUIDE.md` |
| Which test proves which change | `docs/TESTING.md` |
| The rules and every number | `docs/rules/PHC-Core-Rules-v1.0.md` (the revisions override the body) |
| What changed in 0.23.0 against 0.22.0, by system | `docs/design/handoffs/PATCH-TALLY.md`, `CHANGELOG.md` |
| The balance ceilings and how to measure against them | `docs/design/balance-contract.md` |
| Every piece of the foundation, with "How to add things" | `docs/design/handoffs/README.md` lists them |
| Bugs: fixed, open, waiting on Leon's eye | `docs/design/handoffs/BUGLIST-0.22.md` |
| How the cloud lead took in an agent's branch | `docs/design/handoffs/PICKUP.md` section 3 |
| What is next, long term | `docs/ROADMAP.md` |

## 5. The rules that cost the most to learn

1. **Never deploy without Leon's explicit word for that release.** If he does not answer a recommendation, build it
   and list it as a call made for him.
2. **Pin, then move.** Before a refactor, record what the engine does as a golden table on unmodified code; refactor
   until it is identical. A golden line that changes is either the ruling you meant (re-record on purpose, say so in
   the commit) or a mistake (fix the code, never the table).
3. **One primitive per concept, numbers in data.** The lints fail when someone goes round a primitive; they say what
   to call instead.
4. **Agents:** each in its own git worktree, started from the current `develop` (a new worktree may start from a stale
   commit: the brief must say to fast-forward first); remove the worktree as soon as its branch is merged; check free
   disk before starting one; hand long lists to an agent as a file, never pasted; an agent that fails at once with no
   output is a launch failure (disk, usage), not a reason to relaunch in a loop.
5. **Who does what:** the top model designs, rules, reviews and merges; everything easier goes to the cheapest model
   that can do it from a brief it cannot misread, with the test that proves it done.
6. **A browser suite that fails only beside others is a fault in the suite; one that fails alone is a real bug** until
   proven stale. Never weaken or skip a check to get green: on 12 Nov three of eight "stale-looking" failures were
   real bugs a player would have hit.
