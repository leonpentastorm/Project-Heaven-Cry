# Hand-offs

Notes one session (or one person) left for the next. The project-wide hand-off is [`docs/HANDOFF.md`](../../HANDOFF.md); start there. These are the detailed ones still worth reading at 0.0.1; finished ones are in [`_archive/`](_archive/).

## Current

| Hand-off | What it covers | Why it is still current |
| --- | --- | --- |
| [physical-2.0-PLAN.md](physical-2.0-PLAN.md), with the briefs [A: melee](physical-2.0-A-melee.md), [B: ranged](physical-2.0-B-ranged.md), [C: client](physical-2.0-C-client.md), the [code map](physical-2.0-code-map.md) and [A: melee technique effects](physical-2.0-A-FX.md) (Leon, 10 Nov 2026: one clear beat per technique; built: [the result](physical-2.0-A-FX-RESULT.md)) | Physical 2.0 (rules 1.12): melee and ranged techniques, weapon properties, drill, the Attack tab's pads, item icons. The split between the lead and three implementers, and the contract they share | In progress |
| [world-play-A-HANDOFF.md](world-play-A-HANDOFF.md) | World Play 1.0 part A: engine, data and Narrator tools (rules 1.7, items 636–670) | The contract the web layer and the M813 World Play rewrite build on |
| [world-play-B-HANDOFF.md](world-play-B-HANDOFF.md) (+ `world-play-B-shots/`) | World Play part B: what the map draws, carry/search/talk UI | Known gaps and the scenario rewrite still to do |
| [world-play-1.1-HANDOFF.md](world-play-1.1-HANDOFF.md) | World Play 1.1 (rules 1.9, items 671–700): piles, speed and tactical reloads, gear in a fight and the combat backpack, drop tables, the Narrator's `ground[]` and `drops` | The newest rules change: its contracts, tests and known gaps |
| [narrator-craft-HANDOFF.md](narrator-craft-HANDOFF.md) (+ `narrator-craft-transcripts/`) | The AI Narrator's prose rules, pacing and map placement | Length is still long; the live playtest harness lives here |
| [narrator-voice-HANDOFF.md](narrator-voice-HANDOFF.md) (+ `narrator-voice-shots/`) | Kokoro TTS, the Worker proxy, browser voice fallback | Open issues and measurements for the voice |
| [faith-presence-HANDOFF.md](faith-presence-HANDOFF.md) | Faith 2.2 (rules 1.6.3, items 738–746, decision 111): Witnessed until the fight ends or the patron acts, stronger interventions, the grant bank; the cut-in system and the Miracle's cut-in (`game/cutIn.ts`) | Merged (develop 0.7.0); the contracts of Faith 2.2. Its intervention cut-in trigger (spec section 3) was taken up by the spotlight cut-ins (decision 113, `docs/design/cutin-spec.md` section 12): don't build its small cut-in |
| [faith-2.1-HANDOFF.md](faith-2.1-HANDOFF.md) | Faith 2.1 (rules 1.6.1, items 701–723, decision 107; Miracle 2.1, rules 1.6.2, items 724–737): Devotion XP, tag caps on the character, the day counter, leaving a patron, `--faith-light`, the patron art direction | The latest faith change; the Miracle's price is still for Leon |
| [blessing-engine-HANDOFF.md](blessing-engine-HANDOFF.md) | Blessing 2.0 engine (rules 1.6, items 592–629) | The faith contract Faith 2.1 builds on (its Devotion levels are now XP: see the Faith 2.1 hand-off) |
| [blessing-ui-HANDOFF.md](blessing-ui-HANDOFF.md) (+ `blessing-ui-shots/`) | Blessing 2.0 web UI | Same |
| [blessing-art-brief.md](blessing-art-brief.md) | The patron, mark and prayer art brief | Referenced by the asset pipeline (`tools/build_web_assets.py`, `faithArt.ts`) |
| [focus-in-hand-HANDOFF.md](focus-in-hand-HANDOFF.md) | Focus in hand: the browser follow-up (decision 103) | Its rule stands; its Hold the Evoker / Hold the Emanator actions were replaced by the combat backpack (World Play 1.1) |
| [outburst-4.0-HANDOFF.md](outburst-4.0-HANDOFF.md) (+ `outburst-4.0-shots/`) | Outburst 4.0 (rules 1.8, items 801–818): feelings, residue, Revert, new modules and gates, practice; the web panel, codex, tools, icons and sounds | The feeling colours, readings, icons and sounds wait for Leon's verdict |
| [grand-sigilist.md](grand-sigilist.md) | Open design for the Grand Sigilist's Grand forms | Input to the first advanced-class batch |

## Archived (`_archive/`)

- `blessing-implementer-1-engine.md`, `blessing-implementer-2-web.md`: the briefs the two Blessing 2.0 sessions were started with (done; their results are the two Blessing hand-offs above).
- `ooc-mission-board.md`: the friend's three-branch hand-off (mission board / OOC, combat layout, map zoom; all merged). It was `HANDOFF.md` on those branches.
- `proving-ground-mp.md`: Proving Ground multiplayer (merged).
