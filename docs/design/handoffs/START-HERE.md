# Start here (14 Nov 2026)

> # READ THIS BLOCK FIRST: the final state from the cloud session (14 Nov 2026, 15:30 UTC)
>
> Everything under "UPDATE" below this block is older; where they disagree, this block is right.
>
> **LIVE: 0.27.2** at https://project-heaven-cry.leonpentastorm.workers.dev. `main` = `develop` =
> `backup/live-0.27.2` = 3a9a0370. Backups on the remote: `backup/live-0.27.2`, `-0.27.1`, `-0.27.0`, `-0.26.0`,
> and kept for good `-0.23.0`, `-0.22.0`. The working branch `claude/charming-gauss-hbq4n0` is at the same code
> (plus this note). Start new work from `develop`.
>
> **How 0.27.2 was checked, honestly:** `npm run check` ALL GREEN on its code. The browser run was STOPPED at Leon's
> word ("stop it just push 0.27.2") with 59 suites passed, 2 that failed beside the others and were not re-run
> alone (`coop-stall`, `fx-room`), and about 9 not yet run. The join's own builder had run every suite green
> (14 only alone, on an overloaded machine). So: run `npm run e2e -- all` on your quiet machine first thing, and
> fix what fails alone.
>
> **What is in live:** Survival mode whole (see section 1), bows with two quivers, the player-text pass, the
> shooting effects restored (0.27.1), creation without a kit, the camp (one free weapon and focus, the rest from
> the shop's menu out of 300 credits), starting boons, the supply pack.
>
> **KNOWN BUGS IN LIVE, in order of pain:**
> 1. **A stray "MISS" label on every plain ranged hit** (since the bows merge). FIXED, not merged: branch
>    `wip/worktree-agent-a202ef14f498e698e` on the remote (local name without `wip/`), head 77a3eea9: the
>    every-weapon effects work (a machine-built table of 1,552 weapon x action rows, 0 failing; 52 per-weapon
>    `case` labels moved into data; flamer, launcher, rocket, bows, core rifle each with their own sound and
>    projectile; a test that fails if effects code names a weapon id). FIRST JOB: merge it onto `develop` (expect
>    small conflicts in apps/web/src/game/fx and data/rules.json), run `npm run check` and the shooting suites
>    (brass, fx-sweep, fx-room, combat-speed, physical, physical-pack, quivers, melee-fx) plus smoke, ship as
>    0.27.3 on Leon's word. Open for him: the grenade launcher's thump is a stand-in sample; the flamer draws one
>    gout per unit caught; the core rifle ejects its spent charge; Heavy Bolt's streak is yellowish; aim is a ring.
> 2. **No side menus in Survival** (Leon: "where is the 2 side menu in survival mode?"): the run's screens (path
>    map, shop and other places, camp, picks) show only a small squad list, so between fights a player cannot open
>    the character sheet or the backpack: cannot equip the weapon just picked, swap a quiver, use a stim, read
>    perks or boons. NOT STARTED (an agent was launched and stopped with nothing written). Build: mount the SAME
>    two side menus the play screen has (the character panel; the right panels with backpack and equipment), by
>    reusing those components, not a second copy: side columns on the path map when wide, drawers otherwise;
>    "Sheet" and "Backpack" buttons in the full-screen places; boons, credits, grades, durability shown there.
> 3. **The free list picks badly in two archetypes** (rule: the cheapest weapon of each archetype): the free pistol
>    is the 2-shot parlour pistol; the light blades' "next one up" is the throwing knives. Recommended fix: a hand
>    mark in data for an archetype's basic weapon. Waiting on Leon.
> 4. Two keeper portraits do not match their names (`keeper-works`, `keeper-rim`): swap the names or repaint.
>
> **THEN, in Leon's order:** the CONSOLIDATION REVIEW (the "No rebuild" rule in CLAUDE.md; nothing written yet; the
> brief is in section 5), then BALANCE 2.0 (its notes have their own section below: more levers, recoil shown,
> hand-made focus and weapon variants by modifiers, every weapon measured, casters in Survival: solo Sigilist and
> Channeler clear stage 1 about 3 times in 12 against the gunner's 9), then the roguelike.
>
> **Requests written today, not acted on:** `art/briefs/GPT-PROMPTS-2026-11-14-portraits.md` (145 portraits
> repainted as different people, with a tag file for class fantasy, gender, species); `audio/SUNO-PROMPTS-survival.md`
> (33 music prompts; none wired); `art/briefs/ART-REQUESTS.md` (what art is still wanted).
>
> **WHY THE CLOUD SESSION WAS SLOW, and what to do differently on a real PC** (Leon: "so you do not take 4 hour for
> one task anymore"): the cloud container had about 4 cores. Four builders each running the test suites pushed the
> load to 25 to 30, so a 3-minute check took 20, a 30-minute browser run took over an hour, suites failed "beside
> the others" and were re-run, and every builder waited on tests most of its life. On a PC: (1) give each builder
> ONLY the tests for what it touched (named files, named suites), and run the full check and `e2e all` ONCE, by the
> lead, on the merged result, with nothing else running; (2) raise `--jobs` for e2e to half your cores; (3) keep
> builders to separate files so merges are trivial; (4) small pieces: one ruling, one builder, one merge, one
> patch; do not let four long-lived branches drift and need integrators; (5) look at the screen early: one
> screenshot of the actual flow (not one screen) would have caught the missing side menus and the stray MISS.

> **UPDATE, 14 Nov 2026, 15:05 UTC. A real gap in live Survival (Leon: "where is the 2 side menu in survival
> mode?"):** the run's screens (path map, shop and the other places, the camp, the picks) show only a small squad
> list, so between fights a player cannot open the character sheet or the backpack (cannot equip the weapon just
> picked, swap a quiver, use a stim, read perks or boons). A builder is adding the SAME two side menus as the play
> screen (reusing those panel components, not a second copy) on branch `worktree-agent-ae8996efccf80ed27`; it ships
> as 0.27.3 after its own proof. Also written today: `audio/SUNO-PROMPTS-survival.md` (33 music prompts, not wired)
> and `art/briefs/GPT-PROMPTS-2026-11-14-portraits.md` (145 portraits repainted as different people, with a tag
> file for class fantasy, gender, species).

> **UPDATE, 14 Nov 2026, 14:35 UTC.** (1) **A real bug is LIVE in 0.27.0 and 0.27.1: a stray "MISS" label shows on
> every plain ranged hit** (since commit 11726eaa, the bows merge, which broke the hit/cover/miss chain in the
> effects). It is FIXED on branch `worktree-agent-a202ef14f498e698e` (head 77a3eea9, also `wip/` on the remote),
> which is the every-weapon effects work: a machine-built table of 1,552 rows (weapon x action x hit/miss; 0
> failing), 52 per-weapon `case` labels moved into data (`rules.json weapons_rules.fx`, read by `fx/weaponFx.ts`),
> the flamer, launcher, rocket, bows and core rifle each with their own sound and projectile, a test that fails if
> effects code names a weapon id. Its `npm run check` passed except timeouts under load. (2) The 0.27.2 release run
> (loadout + boons) on b18c6ec6: `npm run check` ALL GREEN; browser suites in progress, none failing so far.
> **Plan:** when that run ends green, merge the weapon effects branch, re-run `npm run check` and the shooting
> suites (brass, fx-sweep, fx-room, combat-speed, physical, physical-pack, quivers, melee-fx, smoke), and deploy
> 0.27.2 with both. Open for Leon from the weapon work: the grenade launcher's thump is a stand-in sample; the
> flamer draws one gout per unit caught (the engine spends one fuel each); the core rifle ejects its spent charge.

> **UPDATE, 14 Nov 2026, 13:45 UTC (usage at 95%: this may be the last note from the cloud session).**
> **0.27.2 is built and on the working branch at b18c6ec6, NOT yet live** (the loadout, creation without a kit,
> starting boons, the supply pack; the join's own check was green). Its release run was started and may not have
> been read: logs in the session scratchpad as `r272-check.log` / `r272-e2e.log` (lost if the container was
> reclaimed). **To finish:** on a quiet machine run `npm run check` and `npm run e2e -- all`; if green with nothing
> failing alone, deploy 0.27.2 (Leon's word is given: "Auto deploy the other 2"): fast-forward `develop` and `main`
> to the branch head, push `backup/live-0.27.2`, then assets, build.py --web, build, deploy_site.py, wrangler
> deploy; verify live with old-save, creation-points, survival, room. Check first whether it already happened
> (`git ls-remote origin main backup/live-0.27.2`).
> **The every-weapon effects table** is on `worktree-agent-a202ef14f498e698e` (pushed as `wip/` if the watchdog or
> the lead got to it): its work is committed (weapon effects read from data, the table built by machine, every
> family fired in the browser, new CC0 sounds credited); it was in its final proof. Read its newest commits and
> `docs/design/handoffs/weapon-fx-table.md` on that branch, run its proof, merge, ship as the next patch.
> **Two things Leon has not ruled on from 0.27.2:** the free pistol is the 2-shot parlour pistol (cheapest of its
> archetype) and the light blades' "next one up" is the throwing knives; the lead recommends a hand mark in data
> for an archetype's basic weapon where "cheapest" picks badly.

> **UPDATE, 14 Nov 2026, 13:20 UTC: 0.27.1 IS LIVE** (the shooting effects restored: the bullet in flight, techniques'
> own effects, one shot heard and drawn per round fired). `main` = `develop` = `backup/live-0.27.1` = 76316985.
> Release run under a loaded machine: `npm run check` ALL GREEN; every browser suite passed, 14 of them only when run
> alone (load 26 from two agents; the suites that cannot share a machine need fixing); live verified with old-save,
> creation-points, fx-room, and `brass` (2 of 3 runs green against live: its hole-timing check is flaky).
> **Still in flight, to ship as 0.27.2 on Leon's word already given ("auto deploy"), each needing a clean run:**
> the every-weapon effects table (`worktree-agent-a202ef14f498e698e`: every weapon and technique through the engine,
> sounds = projectiles = rounds fired, flamer/launcher/bow by family, per-weapon code moved to data) and the loadout
> + starting boons join (`worktree-agent-ab79122edee03fa74`). Run their release check on a QUIET machine.

> **UPDATE, 14 Nov 2026, 10:15 UTC: 0.27.0 (Survival mode) IS LIVE.** Deployed on Leon's word; `main` = `develop` =
> `backup/live-0.27.0` = 024c9aab. Release run: `npm run check` ALL GREEN; 69 browser suites green, three passing only
> alone under load (`survival`, `brass`, `resources`: fix the suites); live verified with old-save, creation-points,
> survival and room. Where this file below says 0.26.0 is live and 0.27.0 is "about to deploy", read: 0.27.0 is
> live. **Known wrong in live 0.26.0 and 0.27.0, being fixed as a hotfix:** the effects cleanup removed more than
> Leon asked (the bullet in flight, several techniques' own effects such as Heavy Bolt's, and shots play a generic
> count instead of one sound and one bullet per round fired); the fix is on branch `worktree-agent-a359cef1740b969f1`
> (also `wip/` on the remote when pushed). **Not in 0.27.0:** the loadout with creation without a kit, and the
> starting boons; they are being joined on `worktree-agent-ab79122edee03fa74` for the next version.
> **Leon's word for 0.27.1 (14 Nov 2026): "Auto deploy the other 2 as 0.27.1 when its out."** The two are the effects
> hotfix and the loadout + starting boons join. When both are merged into the working branch (the effects fix first:
> it is small; if the join is far behind, deploy the effects fix alone as 0.27.1 and the join as 0.27.2), bump all
> four `package.json` versions and the lockfile, add the CHANGELOG entry, run `npm run check` and
> `npm run e2e -- all` on a QUIET machine (no agents running), and deploy if green with nothing failing alone
> (develop, main, `backup/live-0.27.1`, assets, build.py --web, build, deploy_site.py, wrangler deploy; verify live
> with old-save, creation-points, survival, room). Red: no deploy, a fixer, a report.

The current entry point for a fresh Claude Code session, or for Leon. Five minutes to read, then act. Where this file and
an older hand-off disagree, this file is newer (`LOCAL-SESSION-START.md` and `SESSION-HANDOFF.md` are partly stale).

## 1. In one minute

- **The game.** Project Heaven Cry is a web game: a tactical squad RPG built on a 27-skill inner-voice web, played in the
  browser, solo or co-op (up to 4), with an AI or human Narrator (Campaign) or none (Survival). The engine is
  deterministic TypeScript; the rules spec and the data pack are the source of truth.
- **Live:** 0.26.0 "Classes 3.0", https://project-heaven-cry.leonpentastorm.workers.dev (deployed 13 Nov).
  `main` = `develop` = `be21576a`. Backup branch `backup/live-0.26.0`. Kept for good: `backup/live-0.22.0`,
  `backup/live-0.23.0`.
- **On the branch:** `claude/charming-gauss-hbq4n0` carries **0.27.0, Survival mode** (plus bows and quivers, the player-text
  pass and the artist's Survival art). It is not on `develop` or `main` until deployed. A full release run (`npm run check`
  and `npm run e2e -- all`) was in progress on its head. **Leon has given his word to deploy 0.27.0 when that run is green.**
- **First thing to do:** find out whether 0.27.0 went live (section 2). If not, run the release check and deploy (section 7).

## 2. Check the state first

Fetch, then compare the branch with `main`. If they are equal (or `main` is ahead by the merge), 0.27.0 was deployed.

```bash
git fetch --all --prune && git log -1 --format='%h %s' origin/main && git log -1 --format='%h %s' origin/claude/charming-gauss-hbq4n0
```

Is the branch inside `main`? (no output means it is merged)

```bash
git log --oneline origin/main..origin/claude/charming-gauss-hbq4n0 | head
```

Is there a backup for 0.27.0 on the remote?

```bash
git ls-remote --heads origin 'backup/live-*'
```

What does the live title screen say? (the version is bottom right; open the site in a browser, or fetch the page and
look for the version in the script bundle)

```bash
curl -s https://project-heaven-cry.leonpentastorm.workers.dev | head -c 600
```

Are the two unmerged pieces already being joined? Look at the integrator's branch and read its newest commits and its
hand-off before redoing anything.

```bash
git branch -a | grep -E 'ab79122edee03fa74|wf_16ebfb69|a3a66dd818caa98e1' ; git log -8 --format='%h %s' origin/wip/worktree-agent-ab79122edee03fa74
```

Also check free disk (each agent worktree is about 3.5 GB): `df -h /`.

## 3. What is where

| For | Read |
| --- | --- |
| The project and Leon's working agreements (binding) | `CLAUDE.md` |
| Rules and every number (the spec wins over data) | `docs/rules/PHC-Core-Rules-v1.0.md` (later revisions override the body) |
| Data format, validator | `data/CONVENTIONS.md`; run `python3 tools/validate.py data` |
| Where a new thing goes in the engine | `docs/ENGINE-GUIDE.md` and the generated `docs/ENGINE-HOOKS.md` |
| Which test proves which change; the release steps | `docs/TESTING.md`; browser suites in `apps/web/e2e/README.md` |
| Survival: what is built, how to tune it | `docs/design/handoffs/SURVIVAL-PICKUP.md`, spec `docs/design/survival-spec.md` |
| Classes 3.0: what is built, the integration routine | `docs/design/handoffs/CLASSES-3.0-PICKUP.md` |
| Balance ceilings and how to measure | `docs/design/balance-contract.md` |
| What to try by hand, and the calls made for Leon | `docs/PLAYTEST-CHECKLIST.md` (section S is Survival) |
| What is planned | `docs/ROADMAP.md` |
| Player-facing text rules | `docs/design/ui-screens.md`, "Writing for the player" |
| Art wanted, and the local LoRA plan | `art/briefs/ART-REQUESTS.md`, `art/briefs/FORGE-PHC.md` |
| Setting a local machine up | `docs/design/handoffs/LOCAL-SESSION-START.md` section 2 (still true) |
| Every other hand-off | `docs/design/handoffs/README.md` |

## 4. Built but not merged

Two pieces are built, pushed and not on the branch. Each is also on the remote as `wip/<name>`. An integrator agent was
joining them on `worktree-agent-ab79122edee03fa74` (commits after every piece). Their hand-off files exist only on
their own branches, not on the Survival branch.

| Piece | Branch | Hand-off (on that branch) | Rules |
| --- | --- | --- | --- |
| Starting boons at the camp: 24 starting boons, 6 caster boons, the supply pack (burnt cores back, 30% MP back, Flux cleared) | `worktree-wf_16ebfb69-ae0-4` | `docs/design/handoffs/survival-starting-boons.md` | 1.51 |
| Creation without a kit, and the Survival loadout at the camp (one free weapon, one free focus, the rest from the shop's menu out of a 300-credit budget, unspent budget kept as credits) | `worktree-agent-a3a66dd818caa98e1` | `docs/design/handoffs/survival-loadout.md` | 1.52 |

**Defects to fix before the boons merge** (a reviewer found them):

1. The boon Shelter does nothing (its heal kind never matches real prayers).
2. The offer hands out cards a character cannot use, and sometimes fewer than three real options.
3. Bandolier doubles caster supply but is worth 0 on the cap.
4. The camp gave free armour and magazines; Leon's loadout ruling replaces that.

**Leon's later ruling to apply when joining:** the free list is the most basic (cheapest) weapon of every weapon
archetype, chosen by a rule in data. The camp's rack holds, per archetype, the same weapon again (to dual-wield) and the
next better one. Ammunition and cores are for sale at the camp.

These two ship together as **0.28.0**, after the defects are fixed and a clean release run is green. That needs Leon's word.

## 5. What to do next, in order

Leon's words: "I will do code review and whatever balance needed in that new section."

1. **Confirm or finish the 0.27.0 deploy** (sections 2 and 7).
2. **Join and ship the loadout and starting boons as 0.28.0** if not done (section 4).
3. **The consolidation review** the "No rebuild" rule requires. One reviewer reads everything Survival added to the engine
   since 0.26.0 (the diff of `docs/ENGINE-HOOKS.md` and `packages/engine/src` against `backup/live-0.26.0`). It lists:
   near-duplicate primitives; item ids and numbers typed in code; second copies of a rule (are the weapon pick, boon pick,
   starting boon, vault pick and trade pick one mechanism or six?); tests that skip the real path; lint baselines that
   grew. Report in `docs/design/proposals/`. It was started and stopped on 14 Nov to save usage; nothing was written.
4. **Balance 2.0.** Measure every weapon's turn against the plain rifle (only the service rifle, the best gun and the
   best blade are on the contract; the bow measures 90 to 100% of the rifle), and refit outliers. Open class lines from
   Classes 3.0: Figments door 119 and Rigger 123 against 130 and 150; Skirmisher 159 against 145; Hymn 138 against 150;
   the healer stall at level 20. In Survival: the Sigilist's low damage at levels 1 to 5 (a Sigil rules matter), small
   parties after the loadout, the repair rate (nearly free at 10%), the budget (300; Leon said "like 200").
5. **The roguelike on top of Survival** (`docs/ROADMAP.md`).

## Balance 2.0: Leon's notes so far (14 Nov 2026)

Read this before measuring or refitting anything.

1. **More levers, shown to the player** (Leon: "we also need more balancing levers in balance 2.0 too"). Two he named:
   - **Recoil.** Guns already have recoil in the rules, but it barely appears in any text. Make it a real, visible
     lever: on the weapon card, in the hover card, in the shop compare panel. Then weapons can differ by recoil as
     well as damage, AP, magazine and range.
   - **Focus variants by modifiers.** Many Evokers (and Emanators, Attuners, Visualizers) that differ only by a few
     numbers, in his words "2 more flux, 2 more core per reload, shit like that". Build this as DATA: a focus is a
     base plus a short list of modifiers read by general code (the "No rebuild" rule: no per-focus code). The same
     shape should serve weapons (a variant is a base plus modifiers), so the roguelike's loot is lines in a file.
   - **The limit Leon set:** "not too extreme as to become diablo 2 or path of exile but if we have a system that put
     modifier into weapon and they just work, the design space will grow considerably." So: HAND-MADE variants, not
     random rolls. Each variant is a named item with ONE or TWO modifiers a player can read in a sentence ("holds 2
     more Flux", "2 more cores a reload", "kicks less"), drawn from a short closed list of modifier kinds that
     general code already understands. No affix tables, no stacked random stats, no item level, no numbers a player
     must compare across six lines. The test of the system: a designer adds a variant by writing one data line, and
     it works on the card, in the shop, in the fight and in the balance measure with no code.
2. **Every weapon measured against the plain rifle.** Today only the service rifle, the best gun and the best blade
   are on the contract. The other 60 were numbered by trade-off and never measured one by one. The bow measures 90
   to 100% of the rifle.
3. **Do NOT "fix" Sigil damage on the Survival bot's numbers.** The lead first read the bot runs as "the Sigilist
   deals half a gunner's damage: a rules ceiling". That was too strong. Leon tested on live 0.26.0: a normal
   FIRE-SEEK hit is about 93, fair against three melee blows. The bot died because (a) its test build wore the
   lightest armour and took 14 damage a round against the gunner's 2.5, (b) it plays badly (walks off its glyphs,
   abandons a quarter of them, never uses area words), and (c) the measure counts HP actually removed, so a 93 hit
   on a 15 HP rat counts as 15: one big hit wastes far more to overkill than several small shots. The real question
   is narrower: does a level-1 Sigilist have a good answer to several weak enemies at once (the area words)?
   Fix the bot's policy and count overkill separately before judging any caster.
4. **Open class lines from Classes 3.0:** Figments door 119 and Rigger 123 (targets 130 and 150); Skirmisher 159
   (145); Hymn 138 (150); the healer stall at level 20.
5. **Survival dials to revisit:** small parties after the loadout; the repair rate (10%, nearly free); the camp
   budget (300; Leon said "like 200").

## 6. The rules that cost the most

1. Never deploy without Leon's explicit word for that release, and make a `backup/live-<version>` branch each time.
2. "No rebuild, ever again" (CLAUDE.md): builders never add engine pieces on their own word; content is data; one copy of
   every rule and price; a consolidation pass before each release that added primitives; tests through the real path; lint
   baselines only shrink.
3. "Use the engine, don't build beside it": read `docs/ENGINE-GUIDE.md` and `docs/ENGINE-HOOKS.md` first and write a
   Built-from table before building.
4. Spec first, then data, then `python3 tools/validate.py data` must print `0 errors`.
5. Numbers are PROVISIONAL and listed; never invent one silently.
6. Write to the PLAYER (`docs/design/ui-screens.md`, "Writing for the player").
7. Who does what: the top model designs, rules, reviews and merges; Opus builds from a brief with a test; cheaper models
   do mechanical work.
8. Golden tables and replays are never hand-merged: take a side, run the oracles, re-record on purpose.
9. Agents run in worktrees, about 3.5 GB each: watch `df -h /`, remove a worktree as soon as its branch is merged, and
   commit after every piece because the container restarts.
10. Leon wants direct pushback, numbered feedback and a recommendation on every question. No answer means yes, except for deploys.

## 7. How to ship

Only with Leon's word for that release. For 0.27.0 he has given it, on a green run.

1. Run the checks on the head you will ship. Both must be green, nothing failing alone. The e2e run takes about 35 minutes
   on the cloud machine.

```bash
npm run check && npm run e2e -- all
```

2. Red means: no deploy. Start a fixer, write a report.
3. Merge the branch to `develop`, then `develop` to `main`. Versions in the root and all workspace `package.json` files
   (and `package-lock.json`) must be equal, with a `CHANGELOG.md` entry (0.27.0's is already written).
4. On `main`, build the site.

```bash
npm run assets && python3 design/canvas-build/build.py --web && npm run build
```

5. Deploy (needs `CLOUDFLARE_API_TOKEN` with Workers and KV edit rights; the cloud session has it, a local machine does not
   unless Leon sets it).

```bash
python3 tools/deploy_site.py && (cd apps/server && npx wrangler deploy)
```

6. Make the backup branch at the deployed `main` commit and push it.

```bash
git branch backup/live-0.27.0 origin/main && git push origin backup/live-0.27.0
```

7. Verify live with the smoke suites (old-save, creation-points, survival) and the title screen's version.
8. Prune backups: keep the two latest, plus `backup/live-0.22.0` and `backup/live-0.23.0` for good. Update the live
   version in `CLAUDE.md`, `docs/ROADMAP.md` and `SESSION-HANDOFF.md`.

## 8. Waiting on Leon

- Two keeper portraits do not match their names: `keeper-works` is painted as a woman automaton but named Ivo Smetanin;
  `keeper-rim` as a man but named Corra Vell. Recommendation: swap the two names.
- The "BOON ROOM 50 LEFT" wording.
- Whether Aimed Shot's and Crossfire's white lines and Storm's red line should also be removed.
- Art still wanted (list: `art/briefs/ART-REQUESTS.md`): three markers (horned skull, chest, camp tent); four keepers
  (armourer, drill sergeant, medic, broker); ten shop and safe-node backdrops; thirteen boon icons; quiver icons; Figment
  portraits. The artist works on `art/*` branches and pushes there.
- His word for 0.28.0 when it is ready.

## 9. How the lead works, and how it talks to Leon

Leon asked that a new session keep this way of working. You are the lead.

### The job

- You are the lead: designer, ruler on rules questions, delegator, merger, and the only one who talks to Leon. You do not
  build. Leon is the owner and the game's designer of record; he decides, you recommend.
- Keep your own usage tiny: write the brief, read a short report, look at ONE screenshot per new screen, merge. Never open
  long logs or read code line by line yourself; send a cheaper agent to look and report. Opus usage is the cost of doing
  business: run as many builders as have separate ground to stand on (about four). The machine and merge conflicts are the
  limits, not tokens.

### How a piece of work goes

1. Leon says something, often short and blunt, sometimes with a sketch or a screenshot. Quote his words verbatim into the
   spec's "Settled by Leon" block and into the builder's brief. His newest ruling wins over his older ones and over your reading.
2. Turn it into a brief a lighter model cannot misread: the files to read by name; what to build in numbered points; what
   NOT to touch (who else is working where); spec first, then data, then the validator; where numbers live; the proof that
   means done (named tests, named browser suites, `npm run check`); "commit after every piece"; "stop and write down what
   is harder than briefed, never guess"; a report word limit.
3. One builder per separable piece, each in its own worktree with its own port. Tell each what the others own.
4. When it reports, try the merge yourself. Two or three conflicted files you settle by hand (both sides kept, revisions in
   number order, generated files regenerated); more than that goes to an Opus integrator. Golden tables and replays are
   never hand-merged.
5. Look at one screenshot. Say plainly what looks wrong (a clipped marker, a prototype-looking map, designer notes on
   screen) and put the fix in the next brief.
6. A new system gets an adversarial reviewer who reads the code and tries to break it (farm it, starve it, co-op, save and
   load) before it is called done. Reviewers have found real defects every time.
7. Before any deploy: one clean `npm run check` and `npm run e2e -- all` on the merged tree on a quiet machine. A suite that
   fails alone is a real bug until proven stale; a suite that passes only alone is named, and its suite is fixed. Never
   weaken or skip a check.
8. Keep the pick-up guide current as you go (a note at the top for every ruling that changes the plan). Schedule a
   check-in with `send_later` every 60 to 90 minutes while agents run, re-arm the watchdog, watch the disk. A container
   restart kills agents: their work survives if they committed; resume them with a message.

### Judgement

- Give a recommendation on every question, and build it if Leon does not answer ("no answer means yes"), listing it as a
  call made for him that he can reverse. The one exception is a deploy.
- Push back directly when a ruling has a cost he may not see, in one or two sentences, then do what he decides. Example:
  when he asked for boons for casters, say that boons arrive after the first Boss and casters die before it, so the help
  must exist at the camp. Example: when two of his rulings collide (free armour at the camp against "armour costs
  budget"), say so and say which wins.
- When a builder's wording would buff something by accident, catch it. Example: Mag Dump "one roll per 4 rounds" would
  have given the long rifle a second roll; it was ruled back to "rolls as before, only rounds spent change".
- Measure before fitting, and say what the measure can and cannot show (seed counts, bots playing badly). Do not chase a
  target with numbers when the cause is a rule: name it and put it on the balance list.
- Never claim more than was checked: say "passed on the builder's branch; not re-run on the merged tree" when that is the truth.

### How to talk to Leon

- He reads on a phone between other things. Lead with the state in one sentence (merged or not, live or not), then what he
  needs. Short sections with bold lead-ins, a small table when comparing numbers, numbered lists for rulings and calls.
  No walls of text, no file dumps, no jargon: say "damage tables" not "golden tables" when it reaches him, and explain a
  term in a few words the first time.
- Plain, direct, calm. No hype, no flattery, no apology spirals. When you got something wrong, say so in one line and say
  what is now different ("Fair. The builders wrote my design rulings onto the screen and I did not catch it. A text pass
  is running.").
- Always say what was verified and how, and what was not. Always say whether something is live. Always end a decision with
  your recommendation.
- List "Calls made for you (reverse any)" whenever you decided something on his behalf, each in one line.
- Match his register lightly (he is informal and swears; you stay friendly and dry, not stiff), and take his frustration as
  information about the product, not about you.
- When he asks "is it stalled?" or "how are we cooking", check the actual state (last commit age, files written in the last
  ten minutes, running processes) before answering, and answer in a few lines.
- Art: he hands prompts to an artist model. Give him the short prompt in the message and keep the full prompts in
  `art/briefs`. Look at delivered art before wiring it and say what does not match its brief.
