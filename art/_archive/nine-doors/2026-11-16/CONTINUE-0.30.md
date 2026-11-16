# Nine Doors 0.30 queue additions

The user authorized adding the 0.30 proposals already present in the supplied hold list and project design sources. This addendum adds **41 source-backed request records**, while preserving every old HOLD.

- Original delivery ledger: **225/375 delivered**, unchanged.
- Original unfinished rows: **123 eligible + 27 held**. Palm #258 was already delivered and is now held for review; preserve it.
- Additional 0.30 queue: **41 requests, 0 delivered**: 32 forks, Stand Behind Me, four replacement depictions, and four shared requests.
- Combined remaining queue: **164 request records**, not a promise of 214 unique new paintings. Four replacements reuse existing icon bindings and Follow may reuse #19's artwork.

Read `art-hold-list-0.30.md`, `holds-0.30.json`, and `planned-jobs-0.30.json` before using the older handoff. The updated `CONTINUE.md` excludes every held old recipe. `planned-jobs.json` is retained as the historical 0.29 recipe source; its pending flags are not the queue.

## Source-backed additions

The 32 fork icon IDs and complete rule excerpts come from [Doors 3.0 revision 2](https://github.com/leonpentastorm/Project-Heaven-Cry/blob/5b62e6d04a31116f55ebc52d7026be08eec084fb/docs/design/proposals/2026-11-doors-3.0-spec.md), sections 2 and 7, on `wip/design-three-layers`. The five class-move additions/replacements come from that spec and the uploaded hold list. Afterword and Mana Shock have existing ART-REQUESTS rows (E2f and F3), and Follow has the shield-lane proposal.

Names marked Suggested remain provisional. Eight fork assets carry open source questions: Cover Them, Drive, Lightkiller, Keep the Thread, Benediction, Held Breath, Walk It In and Lockdown. They are included in scope, with the questions retained; inclusion does not settle their depicted behaviour. Where the source gives only a directory or rule, its final filename/catalog binding or visual recipe is still to be prepared; the queue does not invent production IDs.

The four replacement depictions (Wind-up, Read the Swing, Hold the Lane, Scrap Sentinel) are NEW 0.30 recipes using the old icon bindings. Their old #33, #35, #63 and #163 recipes stay held. Scrap Turret portrait #164 stays held: do not add a replacement portrait when the Sentinel already has one. #19 The Shield Follows stays held; inspect for a reusable source for the separately queued Follow before painting once, never twice.

For Mana Shock, the earlier F3 colour/glow request yields to the later Nine Doors pure-white, no-glow condition-sign requirement. No UI code, gameplay, production asset, active catalog binding or original delivery count is changed by this queue update.

## Added request records

| Name | Source icon/binding | State |
|---|---|---|
| Provoke | fork.guard.provoke | queued-proposal |
| Cover Them | fork.guard.cover_them | Source question 1 |
| Stand Fast | fork.guard.stand_fast | queued-proposal |
| Drive | fork.guard.drive | Source question 11 |
| Light Fingers | fork.shadow.light_fingers | queued-proposal |
| Lend the Dark | fork.shadow.lend_the_dark | queued-proposal |
| Lightkiller | fork.shadow.lightkiller | Source question 2 |
| Spotter | fork.shadow.spotter | queued-proposal |
| Keep the Thread | fork.tend.keep_the_thread | Source question 7 |
| Short Thread | fork.tend.short_thread | queued-proposal |
| Shared Pulse | fork.tend.shared_pulse | queued-proposal |
| Long Thread | fork.tend.long_thread | queued-proposal |
| Round of Blessings | fork.prayer.round_of_blessings | queued-proposal |
| Steadfast | fork.prayer.steadfast | queued-proposal |
| Benediction | fork.prayer.benediction | Source question 3 |
| Held Breath | fork.prayer.held_breath | Source question 3 |
| Rolling Start | fork.momentum.rolling_start | queued-proposal |
| Grindstone | fork.momentum.grindstone | queued-proposal |
| Spill | fork.momentum.spill | queued-proposal |
| Headlong | fork.momentum.headlong | queued-proposal |
| Converging Fire | fork.pressure.converging_fire | queued-proposal |
| Walk It In | fork.pressure.walk_it_in | Source question 15 |
| Through the Gap | fork.pressure.through_the_gap | queued-proposal |
| Lockdown | fork.pressure.lockdown | Source question 6 |
| Overflux | fork.sigil.overflux | queued-proposal |
| Clean Vent | fork.sigil.clean_vent | queued-proposal |
| Written in Advance | fork.sigil.written_in_advance | queued-proposal |
| Running Script | fork.sigil.running_script | queued-proposal |
| Ride the Edge | fork.soul.ride_the_edge | queued-proposal |
| Slow Burn | fork.soul.slow_burn | queued-proposal |
| Blood Price | fork.soul.blood_price | queued-proposal |
| Clean Break | fork.soul.clean_break | queued-proposal |
| Stand Behind Me | verify binding from source | queued-proposal |
| Wind-up | move-shove | queued-proposal |
| Read the Swing | move-lingering-dread | queued-proposal |
| Hold the Lane | move-speed-loader | queued-proposal |
| Scrap Sentinel | move-scrap-turret | queued-proposal |
| Follow | verify binding from source | queued-reuse-check |
| Afterword | weapon-afterword | queued |
| Mana Shock | cond-mana-shock | queued |
| Staggered | verify binding from source | queued-proposal |

All future paintings remain review candidates until approved. Follow the existing mode references, safe bounds, alpha and UI export checks. See the archived continuation attempt for the previous native renders of #323 and #324; neither is delivered.
