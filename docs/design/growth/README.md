# The growth bible (the 0.34 rebalance): where it stands

Read in this order: `../proposals/2026-11-21-the-curve.md` (the laws, Leon's rulings by round, the charter), then `00-rulings.md` (the lead's rulings; sections A to F), then the files.

- **Pass 1** (commit `d61ec6f13`): seven drafts and two critics. They disagreed with each other.
- **Pass 2** (commit `b901387b5`): 01-scale made the owner of shared numbers, 02 to 07 re-derived, two more critics. Verdict: NOT READY (37 consistency findings, 16 from the player's walk). Cause: prose files quoting each other.
- **Pass 3** (ruling F): one machine-readable source in `tools/balance/bible/*.json` and one checker `tools/balance/check.py`. The bible is READY only when the checker prints no failure and both critics agree.
- **Pass 3 closed** (21 Nov 2026): `python tools/balance/check.py` prints 147 PASS, 0 FAIL, 0 WAITING. The computed tables are filed in `TABLES.md` (`check.py --tables`); the one list of new engine pieces is `08-primitives.md`; the build in steps is `09-build-order.md`. The last FAIL (Momentum's Coup at 109,042) was closed by making Iron Grip's tier II a plain-hit term (07 section 0), PROVISIONAL for the lead.
- **Then the build**, in ordered steps with the gate between each: (1) the scale, the columns, the cards, HP and the enemy table; (2) the ladders, the cash-out, Margins and the Push; (3) pacing: XP, gates, Marks, rates, credits; (4) Survival as five maps, the final boss, endless; (5) perks, grades, mods, signatures; (6) migration; (7) the whole gate, every golden table and replay re-recorded on purpose, the full browser run, simulated runs read (not fitted). Nothing goes live without Leon's word.

Nothing in `data/`, the engine or the client has been changed by the bible. `tools/balance/check.py` (shapes: `tools/balance/bible/SCHEMA.md`) and `pacing.py` only read data and print; `scale.py` is retired into `check.py --tables scale`. Pass 3's first file, `bible/scale.json`, is written; 01-scale.md now quotes its keys.
