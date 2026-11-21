# START HERE (22 Nov 2026): the one entry file

Any model picking this project up reads this file first, then `CLAUDE.md`. If a longer version of this file exists on `wip/release-0.34`, that one is newer and wins. (The 14 Nov version of this file is in git history.)

## 1. What is where

- **Live:** 0.33.0 (`main`, `backup/live-0.33.0`). Account: `docs/design/handoffs/0.33.0-LIVE.md`. Nothing goes live without Leon's explicit word for that release. Deploy only with `python tools/deploy_site.py --deploy --build`; never run that script otherwise.
- **The work:** branch `wip/release-0.34` (worktree `E:/phc-wt/rel030`). It holds 0.34.0 "Items 2.0" (built, gate green) and, on top, **the total rebalance**, part-built. It is NOT merged into `develop` or `main` and is NOT playable as a whole yet: the new number scale sits under doors that are being converted one by one.
- **Owed work:** `docs/ROADMAP.md` on that branch (the only list).

## 2. The rebalance: one file of each kind (all on `wip/release-0.34`)

| Role | File |
| --- | --- |
| The laws, Leon's rulings by debate round, the charter | `docs/design/proposals/2026-11-21-the-curve.md` |
| The lead's and Leon's rulings, A to M (the newest section wins) | `docs/design/growth/00-rulings.md` |
| Every number, machine-readable, with its checker | `tools/balance/bible/*.json`, `python tools/balance/check.py` |
| What each door costs to use (why its payoff is what it is) | `docs/design/growth/10-effort-ledger.md` |
| New engine pieces approved | `docs/design/growth/08-primitives.md` |
| The build order | `docs/design/growth/09-build-order.md` |
| Where the build stands | `docs/design/growth/README.md` and the hand-offs `docs/design/handoffs/0.34-REBALANCE-*.md` |

The prose drafts `01` to `07` and the `critic-*.md` files in `docs/design/growth/` are history; the JSON is the truth.

## 3. How far the build is (22 Nov)

Built, gate green: step 1 (the scale: every flat number x0.6, level columns, cards that do what they say, HP, MP, grades with damage, the enemy table); step 2a (Margins, the door ladder, the cash-out source, res_max, wear, Grace, the squad's one mark and one gift); the Body doors (Guard, Momentum, Pressure); Shadow (committed; check its gate and hand-off first).

**Next, one door to one builder, in this order:** Sigils, Figments, Bonds, Outbursts, Prayer. Then step 3 (pacing: XP table, gates on fives, Marks, rates, Devotion, credits), step 4 (Survival: five maps, the final boss, endless; enemy levels from the map), step 5 (perks, mods, maker signatures, leftover old-scale numbers and texts), step 6 (migration: a free re-spend is the lead's pick, Leon has not ruled), step 7 (the whole gate, the full browser run, the account for Leon).

The gate: in `E:/phc-wt/rel030`, `export PYTHONUTF8=1`, `python tools/check.py` (ALL GREEN), `REPLAY_FULL=1 npm test -w @phc/engine -- replay-hash`, `npm run build`. Golden tables and replays are re-recorded on purpose and the reason written down; never blind.

## 4. Leon's rulings of 21 Nov, in one screen

- **Motto: effort is always rewarded, and actions have consequences.**
- **A number Leon gives is shorthand for a feeling, never a target or a cap.** All balance "ceilings" are deleted (rules 1.94). Nothing is fitted to a percentage or a line; no reward is shrunk to make a number land; a measuring tool only reports.
- **A door's payoff comes from what it costs to use** (attacks given up, resources, turns the counter must survive, with interest for risk). Sigils pay the most, with a top (a two-glyph Line repeated every turn sits a little under an Outburst caster; only the all-in Line reaches about 11 plain attacks). Outbursts are the steady magic, never underwhelming (about 5 a turn; two Emanators begin two at once, a double Release about 9 to 10). Figments are already steady: the Curtain spends them and is modest. Shadow's full Break is about 9 and needs real set-up time (no stealth-archer). Melee and guns stay modest: Weapon Arts come later. The Hymn is prayer's cash-out; the Miracle breaks every scale and has no once-a-session limit (its price is its limit). Guard fills fast; advanced classes will spend plates.
- **Scale:** a hit is one or two digits at level 1 and four at level 20, something super five; this describes the feel, it is not a check.
- **Every class has something only it can use**; Reach (how much a door holds) is bought with skill points, and a door's top Reach needs its whole family (beta 7, gamma 4).
- **Gates on fives:** class at 3, rank II and attribute ceiling 8 at level 5, ceiling 9 at 10, ceiling 10 and rank III at 15, cap 20 at about hour 40, then about ten hours at the peak. A career is 38 Skill and 20 Attribute points. A capped character holds about 80% of all techniques, words and Outburst modifiers.
- **Survival:** five maps, a final boss (a permanent account upgrade later), then endless. Tiers I and II end at the final boss; tier III is the advanced classes' box. Fight nodes ask Walk in or Try an ambush (live in 0.33).
- **Advanced classes** (later): bought with a trainer's currency; fall out with the trainer and one or two passives work differently (not always the dark version); the squared and the hybrid kind are equal in power. Later, unique ones (a point in every skill, none above 4).
- **Not in 0.34:** advanced classes, Weapon Arts, named Crossings, Scars and Deeds, the account upgrade.
- "Arts" means Weapon Arts. Empty guns between fights are intentional. Essence of Experience: anyone at the chapel, only focus-holders elsewhere.

## 5. The rules that save usage (paid for with about 25 points of one week)

1. A number Leon gives is a feeling, never a target. Do not build a checker or a "ceiling" from it.
2. Design by thinking, then ask Leon early and short: he answers in minutes. No multi-agent "design passes" with critics.
3. One source of truth for numbers (the bible JSON), never prose files quoting each other.
4. **One bounded job per builder: one door, one screen, one data file**, with the test that proves it. A builder given a whole Core runs out of room.
5. Every builder ends with the gate green before it pushes. Never push red.
6. Say the cost before launching (an Opus lane is about half a point to a point of the week); check the meter before every launch; stop and ask before the last tenth.
7. No blind re-records: a test that proves a rule computes its expectation from data.
8. One agent per folder. Never message an agent inside a workflow (it starts a duplicate): stop the workflow, edit its script, resume. Give every agent an explicit model (Opus builds, Sonnet types from tables, the lead designs and rules).
9. Never run `tools/deploy_site.py` without `--deploy` and Leon's word.
10. Report short and plain: what is true now, what is not done, what was not seen on a screen.

## 6. Waiting on Leon

The free re-spend for live characters (or keep their old Reach); the Miracle's price as it stands; the wide character (four doors at 4 to 5) has nothing of its own until the unique classes; a second focus for a two-door caster; go-live of 0.34.
