# Starting a local session: the total hand-off (rewritten 13 Nov 2026, at the close of Classes 3.0; brought up to date 14 Nov, at the close of Survival)

For Leon, and for the **Fable-class Claude Code session he starts on his own Windows PC (WSL2)**. Written by the cloud
lead's builder at the close of Classes 3.0. Read this top to bottom once; after that the standing documents (section
4) take over. Where this file and a standing document disagree, the standing document is newer.

## 1. Where everything is

- **Live:** 0.26.0 (Classes 3.0, `backup/live-0.26.0`). **0.27.0 is Survival mode** (rules 1.39 to 1.49), built on
  `claude/charming-gauss-hbq4n0` and **not deployed without Leon's word** for it; its pick-up is
  `docs/design/handoffs/SURVIVAL-PICKUP.md` and what to try is `docs/PLAYTEST-CHECKLIST.md` section S. Find out what
  is live: `git log -1 origin/main`, the top of `CHANGELOG.md`, and the `backup/live-*` branches on the remote.
- **The site:** https://project-heaven-cry.leonpentastorm.workers.dev (the title shows the version, bottom right).
- **Branches:** `main` = live. `develop` = `main` plus docs (from the first Classes 3.0 code commit `develop` was kept
  equal to live so a hotfix could be made from it). `claude/charming-gauss-hbq4n0` is the Classes 3.0 working branch;
  once 0.26.0 is merged, start new work from `develop`.
- **Backups:** `backup/live-<version>` for every deploy. Keep the two latest live versions; an older one is deleted only
  when a newer deploy makes it the third. **Two are kept for good, never deleted:** `backup/live-0.22.0` and
  `backup/live-0.23.0` (the last before and the first after the engine foundation). Older ones (0.12.0 to 0.21.0) are
  still on the remote and may be pruned by that rule.
- **Stale branches on the remote:** about 40 `wip/worktree-agent-*` branches (the watchdog's pushes of agents' work in
  flight; every one whose step is ticked in `CLASSES-3.0-PICKUP.md` section 4 is merged), `art/briefs-complete`,
  `music/new-tracks`, the old `feature/*` and `claude/physical-2.0-*` branches. **The remote refused deletes from the
  cloud session's credentials**, so they are still there: delete them from Leon's own login (`gh` or the GitHub web
  page), after checking each is merged (`git branch -r --merged origin/develop`). Never delete a `backup/` branch that
  the rule above keeps.
- **Local worktree branches** (`worktree-agent-*`) exist only in the cloud container; a fresh clone has none.

## 2. Setting the computer up (once)

Leon's PC: Windows with **WSL2, Ubuntu 22.04** (the same WSL that runs Gun Forge, `D:\LocalAI`, on the RX 9070 XT).
Work inside the Linux file system (`~/`), never under `/mnt/c` or `/mnt/d`: the repo's tools walk thousands of files and
are many times slower across the Windows boundary.

```bash
sudo apt-get update && sudo apt-get install -y git python3 python3-pip build-essential
```

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash && source ~/.bashrc && nvm install 22
```

```bash
cd ~ && git clone https://github.com/leonpentastorm/Project-Heaven-Cry.git && cd Project-Heaven-Cry && git checkout develop && npm install
```

```bash
npx playwright install --with-deps chromium
```

```bash
npm run assets && python3 design/canvas-build/build.py --web && npm run build
```

```bash
npm run check
```

That last one must end `ALL GREEN` (a minute or two on a good machine). Python must be 3.11 or later (`python3
--version`; Ubuntu 22.04 ships 3.10: `sudo apt-get install -y python3.11` and run the tools with it if a tool
complains). Then install Claude Code in WSL, start it in the folder (`claude`), and say: "Read CLAUDE.md, then
docs/design/handoffs/LOCAL-SESSION-START.md, and continue from its section 6."

- **Play it locally:** `npm run dev -w @phc/server`, then http://127.0.0.1:8787 (from Windows too: WSL2 forwards it).
- **Browser tests:** `npm run e2e -- smoke` (5 suites), `npm run e2e -- all` (about 65 suites; raise `--jobs` from 3 to
  half your cores). Several runs at once each need their own server: start one with
  `npx wrangler dev -c wrangler.dev.jsonc --port <port> --inspector-port <port+400>` in `apps/server` and pass
  `--base http://127.0.0.1:<port> --no-build` (the cloud agents did this on ports 8800 to 8950).
- **Deploying from the PC** needs a Cloudflare API token with Workers and Workers KV edit rights as
  `CLOUDFLARE_API_TOKEN` (the cloud session had it injected; a local one does not). Then, on `main`: `npm run build`,
  `python3 tools/deploy_site.py`, and `npx wrangler deploy` in `apps/server`; then the `backup/live-<version>` branch.
  **Never without Leon's word for that release.**
- **GitHub:** the local session uses Leon's own `git` and `gh` login; nothing else to set up.

## 3. The standing documents (what to read for what)

| For | Read |
| --- | --- |
| The project, the rules of working with Leon | `CLAUDE.md` (its "Working agreements" are binding) |
| The mission just finished, its calls, its state | `docs/design/handoffs/CLASSES-3.0-PICKUP.md` (sections 4 to 7) |
| What is live, on the branch, in flight, next | `docs/design/handoffs/SESSION-HANDOFF.md` |
| The rules and every number | `docs/rules/PHC-Core-Rules-v1.0.md` (later revisions override the body; Classes 3.0 is 1.28 to 1.38) |
| Extending the engine: where a thing goes | `docs/ENGINE-GUIDE.md` ("Stop: before you build") and `docs/ENGINE-HOOKS.md` (generated) |
| Which test proves which change | `docs/TESTING.md`, and `apps/web/e2e/README.md` for the browser suites |
| The balance ceilings and how to measure | `docs/design/balance-contract.md`; the numbers of Classes 3.0 in `classes-3.0-step-11.md` |
| What changed against live, by system | `docs/design/handoffs/PATCH-TALLY.md`, `CHANGELOG.md` |
| What to try by hand, and the calls to reverse | `docs/PLAYTEST-CHECKLIST.md` (section 0 and its 53 calls) |
| Each piece of Classes 3.0, with "How to add" | `docs/design/handoffs/classes-3.0-step-*.md` (1a, 1b, 2-4, 3, 5, 6, 7, 7b, 8, 9, 10, 11) |
| How a branch is taken in | `docs/design/handoffs/PICKUP.md` section 3 |
| Art for an artist or the Forge | `art/briefs/ART-REQUESTS.md`, `art/briefs/FORGE-PHC.md` |
| What is next, long term | `docs/ROADMAP.md` |

## 4. How the lead works

1. **Who does what** (Leon, 12 Nov): the Fable-class session is the game designer, lead and delegator. It keeps what is
   expensive to get wrong: design and rulings, a new primitive and its migration, balance fitting, adversarial review,
   merges and conflicts, and what is said to Leon. Everything easier goes down (Agent tool `model`): `haiku` for
   lookups and re-running a command; `sonnet` for mechanical edits from a verified list and docs; `opus` for contained
   building with a clear brief and a test to pass. A lighter model that finds the task was not easy hands back.
2. **Use the engine, don't build beside it** (Leon, 13 Nov): before anything that touches rules, read
   `docs/ENGINE-GUIDE.md` and `docs/ENGINE-HOOKS.md` and write a "Built from" table; `npm run built-from -- <range>` on
   every diff. The lints' baselines only shrink.
3. **Worktrees:** one per builder agent (`isolation: "worktree"`), at most two or three at once, never two on one
   system. A new worktree starts from a stale commit: the brief says `git merge --ff-only <working branch>` first,
   commit to the worktree branch, push nothing, report the branch. Want 8 GB free before starting one (a worktree with
   `node_modules` is about 2.5 GB); remove it as soon as its branch is merged (`git worktree remove --force`, then
   `git worktree prune`). Long lists go to an agent as a file path, never pasted.
4. **The watchdog,** `tools/agent_watch.sh` (Leon: "make sure they push their WIP branch and don't time out without us
   knowing"): run it in the background while builders work; every five minutes it pushes each unmerged worktree branch
   to `wip/<branch>`, and it exits with a line (which wakes the session) when a worktree shows no sign of life for 40
   minutes or disk falls under 7 GB; it runs just under two hours, then re-arm it. **Locally, edit its two constants
   first:** the `cd` path (it says `/home/user/Project-Heaven-Cry`) and `MAIN` (the working branch). On a STALL line:
   look at the worktree; if its agent is dead its work is on `wip/`, and a new builder fast-forwards to it and finishes.
5. **The integration routine** (taking a branch in; `PICKUP.md` section 3): `git merge --no-ff`, keep both sides'
   intent in a conflict; then both type checks, the validator, and the pins (`test/golden`, `test/replay-hash`,
   `lint-foundations`, `paths-order`, `sight-order`, `shared-state`, `old-save`). **A golden line that moved** is either
   the ruling the branch's hand-off names (re-record on purpose, say which in the commit) or a merge mistake (fix the
   code, never the table). **Replay hashes** move whenever a rule moved on either side: run the oracles first, then
   `REPLAY_RECORD=1 REPLAY_FULL=1` on the MERGED code; never hand-merge `replays.json`. Every step since 7b re-records
   it, so the last merge of a batch does it once.
6. **Reviewer pass:** for a new system or a rule change, a fresh agent gets only the spec and the diff and is told to
   find where the diff departs from the spec, builds beside the engine, or leaves a number out of data.
7. **Versions:** whoever merges a branch into `develop` bumps the middle number in all four `package.json` files and
   writes the `CHANGELOG.md` entry in the same merge; a hotfix straight on `develop` bumps the last.

## 5. The rules that cost the most to learn

1. **Nothing goes live without Leon's explicit word for that release.** "No answer means yes" covers building a
   recommendation (listed as a call made for him), never a deploy.
2. **Spec first, then data, then the validator** (`python3 tools/validate.py data`: 0 errors). A number in a data text is
   a `{=placeholder}`; a provisional number is flagged and listed in spec section 14.
3. **Pin, then move.** Golden tables on unmodified code are the reference for any change to an existing rule.
4. **A browser suite that fails only beside others is a fault in the suite** (it measured the machine: wait on the
   page's state, never on time); **one that fails alone is a real bug until proven stale.** Never weaken or skip a check.
   At the close of Classes 3.0 two "flaky" suites turned out to be one stale check and one real bug (a feeling's card
   between a gun's sound and its flash), so look before you label.
5. **`npm run assets` after any merge that brings art**, or the game shows broken images.
6. **Disk and launch failures:** an agent that fails at once with no transcript is a disk or usage problem; look at
   `df -h` before relaunching, and never relaunch in a loop.
7. **Checkpoint** (Leon's word when usage runs out): commit and push everything at once as "CHECKPOINT, not verified:",
   then bring `SESSION-HANDOFF.md` up to date and push that, before anything else asked in the same message.

## 6. What is next, in order

1. **Leon's word on Survival (0.27.0)** and his playtest with `docs/PLAYTEST-CHECKLIST.md` section S (seven blocks;
   the calls made for him are numbered at its end). Each reversal: spec line, data field, validator, the test that
   pins it. On his word: merge, deploy, `backup/live-0.27.0`. Classes 3.0's own checklist (section 0, 53 calls) still
   stands.
2. **Survival's open items** (`SURVIVAL-PICKUP.md` section 2) and what the fit could not reach with data dials
   (`survival-steps-9-10.md` section 5); how to tune and measure it is `SURVIVAL-PICKUP.md` section 3.
3. **The Forge art run on Leon's GPU,** `art/briefs/FORGE-PHC.md`: one LoRA per art mode (Wick first, then gear,
   portraits, scenes only if the count supports it), `D:\LocalAI\Forge.bat` from WSL (`/mnt/d/LocalAI`); the tool's own
   `CLAUDE.md` wins over the brief. `Forge.bat doctor` first; one GPU job at a time; report run times to Leon before the
   long runs. What to generate first: `art/briefs/ART-REQUESTS.md` section 5 (the Classes 3.0 icons, the six Figment
   portraits C6, the Attuner and Visualizer gloves) and E2b (the gear icons that do not read at 32 px).
4. **The open items each Classes 3.0 step left** (each hand-off's "Not built" or "What is left"):
   - Shadow: Parting Cut and Case (step 6); the pip-ring effect and the "Seen: −1 Shadow" floater (step 10).
   - Bonds: the aim marks on a Bonded ally and the enemy's save record (need an engine read); the "—" enemy faces
     greyed per target; "Bonded to" on portraits and the thread and echo effects.
   - Figments: NULL does not unmake a Figment (figments-spec rule 12, then the AI's weight); "Out of projection range"
     on the tile; the bots' stream and scatter effects and sounds (sourced assets); the Rigger and the door under their
     lines with no gap (rules 1.38 point 5: a class-only multiplier, a new primitive); Salvage, Overclock and Scrap
     Turret still handlers.
   - The Chaplain: two Sanctuaries on one tile stack; Smite's chip on the attack card (riders in `previewAttack`, one
     general addition); the Ward pip and Sanctuary's outline; the presence brightening on an intervention.
   - Reactions: the Answer list has no screen to set it; "(reaction 1 of 2)" in the log; Run and Gun's chip on the move
     preview; Reflex measures +0 (the simulator's enemies never cross a held line).
   - The enemy side: the squad plan (bait the first reaction, two movers into a Killzone), waiting out a Sanctuary, a
     Visualist enemy caster, enemy versions of the new doors (step 9 section 6).
   - The level scale: objects of the shelved advanced classes and the Sentry turret's 40 not scaled (item 2309).
   - Still for Leon's eye: Aimed Shot's and Crossfire's white lines and Storm's red line.
5. **Then the long list:** `docs/ROADMAP.md` (the advanced classes back as attribute pairs, the M813 rewrite for World
   Play, Weapon Arts, armour, the item ops second pass, the roguelike beyond Survival).

## 7. What a local machine changes

- **Better:** the cloud container was small and shared by every agent the lead started (load averages of 20 to 35;
  browser suites timed out beside each other; the disk filled at ten worktrees). A good PC runs `npm run check` in a
  minute or two and the full browser run while agents work, and gives every agent its own server port.
- **Worse:** nothing runs while the PC sleeps or the terminal closes: no watchdog, no background agents. Before
  stepping away, run a checkpoint (section 5 item 7). WSL2 also sleeps with Windows.
- **The same:** how well the model reasons and the usage limits (they belong to the account, not the machine).
- **New:** the GPU (the Forge, section 6 item 3) and Leon's own Cloudflare token for deploys (section 2).
