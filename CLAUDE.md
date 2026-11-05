# Project Heaven Cry (PHC) — working brief for Claude Code

PHC began in 2020 as a Vietnamese tabletop RPG by Leon ("Romantic B0ss") and friends. It adapts Disco Elysium's skill web (27 skills that are also inner voices) to tactical squad combat. In Nov 2026 it was revived, translated to English, rebalanced and turned into a game-ready rules spec and data pack. **The goal now is a web game**: play immersively in the browser with an AI Narrator (bring-your-own API key, any provider), or with a human Narrator, solo or co-op with up to 4 players in a room.

This file is the hand-off from the design sessions in claude.ai. Read it first, then `docs/rules/PHC-Core-Rules-v1.0.md`.

## Source of truth (in this order)

1. **`docs/rules/PHC-Core-Rules-v1.0.md`** — the rules spec, every number. Exported from the living Claude Doc (links below). If the spec and the data disagree, **the spec wins and the data is the bug**.
2. **`data/*.json`** — machine-readable rules the engine loads. Conventions in `data/CONVENTIONS.md`. Run `python3 tools/validate.py data` after any change; it must print `0 errors`.
3. **`docs/lore/`** and **`docs/design/`** — world, classes, decisions, UI.
4. **`design/canvas/`** — UI prototypes (Design Component `.dc.html` files from the claude.ai design canvas). Reference for layout and interaction, not production code.

Living versions (edit there, then re-export here):

| Doc | Link |
| --- | --- |
| PHC Core Rules v1.0 (Game Spec) | https://claude.ai/artifact/Mm2PsQVYuBKoFybSUTFii5 |
| Narrator's World Bible | https://claude.ai/artifact/Ctq7fiFpGoiw9uCP7Cuzak |
| Class Roster, Revision 2 | https://claude.ai/artifact/WDw4EasGci2xjyK6oFKo3g |
| EPCCG: Trait Edition, Revision 2 (74 traits) | https://claude.ai/artifact/QKMjjcQpEzEXWuu5AdndYQ |
| EPCCG: Perk Edition, Revision 2 (76 perks) | https://claude.ai/artifact/1k8iRfFnw165NAvmEANttY |
| Skills v2 / Traits v2 (design rationale) | https://claude.ai/artifact/Cfh3EJCbWZ1w9ivmPACtdR · https://claude.ai/artifact/45tVns1AJavokwAZGu4cSp |
| Rulebook, English Edition (2020 rules translated; superseded by the spec) | https://claude.ai/artifact/DupaUzweyVDdbcx4mJGoqs |
| Recovered Design Notes (2020) | https://claude.ai/artifact/8zMzay23SbWCiPC97cDbuC |
| UI design canvas (play screens + character creation) | https://claude.ai/artifact/9kVVNppZERUaCxBCMWbZgM |

The 2020 originals (`Official_EPCCG.docx`, `PHC_Official_Character_Sheet.xlsx`, the MPAT sheet `M1.4_8R4-D83-RRY_A5.xlsx`) live in the claude.ai Project "Project Heaven Cry". `source/2020/` holds what could be exported (see its README).

## Repo map

```
CLAUDE.md                 this brief
docs/rules/               PHC-Core-Rules-v1.0.md (the spec)
docs/lore/                Narrators-World-Bible.md, MPAT-and-M813.md
docs/design/              Class-Roster-Rev2.md, Recovered-Design-Notes-2020.md,
                          decisions.md (why things are the way they are), ui-screens.md
data/                     the JSON data pack + CONVENTIONS.md + README.md
tools/                    validate.py (cross-reference checker), fix_pack.py (normaliser)
design/canvas/            UI prototypes (.dc.html) + canvas.json layout
source/2020/              original material that could be exported
```

## The game in one screen

- **Character tree:** 3 Cores (Body, Mind, Soul) → 9 Attributes → 27 Skills (α combat, β utility/defence, γ dialogue/exploration per Attribute). Caps: Skill ≤ Attribute ≤ Core ≤ 10.
- **Rolls:** d20 + skill modifier vs TN 8 / 12 / 16 / 20 (Easy / Standard / Hard / Heroic). Modifier = −2 at 0 points, else floor(points ÷ 2). Nat 20 critical success, nat 1 complication.
- **Mastery:** at 3/5/7/9 points (M1–M4), Mastered at 10. From Mastery 2 the Narrator can call an **Overreach** (plain d20 vs 15/17/19; Mastered auto-fails unless an Echo is spent). **Echo** tokens (max 3) reroll a d20. **Inner Voice**: hidden check at scene start, the highest skill (≥3 points) whispers one private line in its own voice.
- **Creation:** cores start 1 (+6 points), attributes 1 (+10), skills 0 (+10); 0–2 traits; class is **earned** at level 3, not chosen.
- **Classes:** 13 base classes, each with 3 signature skills covering all 27 skills. At level 3 you choose among the classes with your two highest signature totals (closest-class rule: nobody is classless). Rank II at total 15, rank III at 21. 15 advanced classes need 15 in one parent's signatures + 9 in the other + a tutor. Body classes run on ammo/weapons/tech; Mind classes burn mana cores to make mana (Sigils); Soul classes spend mana and crystallise cores (Soul spells). Any class with a patron and Faith can pray.
- **Combat:** tactical grid, 1.5 m tiles, 6 AP per turn (ceiling 9, floor 2; perks add at most +3), one reaction per round, initiative by Agility.
- **Mana:** ambient meter 0–40 (Thin / Normal / Rich / Flooded). Deaths raise it. Sigil magic (Evoker + cores, English command words like FIRE · CONDENSE · PUSH, excess becomes Flux and is vented). Soul magic (Emanator + MP, heart link, Strain, Mana Short; spells built from a school + modules; Crystallise makes cores). Blessings via patron pacts: Devotion, Witnessed (Faith 5), Miracle (Faith 7).

## Lore essentials (canon decided with Leon)

- The world is a **simulation**. NPCs are its people. **Nanobots are mana.** Players are a layer above even Earth.
- **Celestials** are trapped Earth humans acting as gods, bound by treaties (the Celestial Accords). Creation ladder: players → Earth → Celestials → NPCs → robots (a robot is an NPC made by NPCs).
- **The Knowing:** an NPC who learns the truth is killed or made a demigod.
- **Evoker = Sigil magic. Emanator = Soul magic.** Locked; never swap them.
- Kills spawn bots; Sigil users vent Flux, Soul users crystallise cores.
- In-universe language only. The 2020 drafts leaned on pop-culture references; those were deliberately removed. Some traits are deliberately ugly (the racism trait is kept in clean in-world language, plus a xenophobe trait, Humanity First). That's intentional design, not something to sand off.

## Two referees: engine vs Narrator

The **engine owns numbers**: rolls, AP, damage, caps, resources, conditions, the grid. The **Narrator** (AI or human) owns judgement: TNs, scene, NPCs, consequences, whether a trigger happened, Achieved perks, legendary deeds. Every rule-bearing data item has `adjudication: engine | hybrid | narrator`. Effects use ops from `data/effect_ops.json`: 50 **core** ops the engine implements generically, 81 **bespoke** ops (~10% of uses) that are per-item hooks. **An op the engine doesn't recognise falls back to the Narrator with the item's `text`; never silently ignore it.** The AI Narrator never sets numbers the engine owns; it requests checks and the engine resolves them.

## Product decisions so far

- Web game; tactical grid combat; story mode with narrative stream.
- AI Narrator: **bring your own key, any provider** (Anthropic, OpenAI, Google, OpenRouter, local OpenAI-compatible). Key stays in the browser and goes only to the provider.
- Human Narrator mode ("I'll narrate") with a private Narrator screen; the engine still handles dice, grid and numbers.
- Co-op up to **4 players per room**; solo works too.
- **Speaking order:** in story mode each player speaks once per round, then the Narrator answers everyone together. Players can request a turn; the host can skip an away player.
- **Characters are locked in before a session starts** (or saved as drafts and brought into any room).
- Stack: open. Claude Code proposes the tech plan with Leon. Context-only hand-off by request; no app skeleton yet.

## UI direction (see `docs/design/ui-screens.md` and the canvas)

- Inspired by AI-DM web RPGs (character panel | narrative stream | dice) and by **Disco Elysium's** skill screens: inner-voice cards in the story, a portrait card wall for skills, big `‹ 3 ›` steppers. Original art and text only; no DE assets.
- Colour = meaning everywhere: **Body amber `#F2A54A`, Mind cyan `#4FC8DF`, Soul violet `#AE9BFF`**. Ground `#0A0D13`, panels `#10151F`, lines `#232D3F`, text `#E7EBF3`, muted `#A3AEC2`. Success `#6FD8A0`, failure/HP `#F0907F`/`#E8604F`, Echo/critical `#FFD27A`.
- Type: **Spectral** for narrative prose and titles, **Chakra Petch** for UI and numbers.
- Skill art: 27 portraits at 4:5 (800 × 1000), tinted per core. The art library README describes Heavenprint portrait collections and Wick perk/trait icons as the approved direction.
- Dice are transparent: the screen always shows TN and the sum, so players can see the AI isn't fudging.

## Working agreements with Leon

- He wants **direct pushback**, **numbered feedback** and **full drafts**, not hedged options.
- Change the spec first, then the data, then run the validator.
- Never invent a number silently. Provisional numbers are flagged (`provisional: true`) and listed in spec section 14.
- Keep text in-universe; no pop-culture references in game text.
- Pending proposal (not yet accepted): simplify creation to **10 skill points only**, with Attributes and Cores auto-rising to what skills need, and attribute/core points coming only from levelling. The UI already behaves this way.

## Next steps

1. Tech plan with Leon (engine as pure, deterministic TypeScript with seeded RNG; authoritative room server; client with a grid renderer; provider-agnostic Narrator adapter using structured tool calls).
2. Starter mode: character creation → story scene → one combat, single player with the AI Narrator.
3. The **M813 one-shot** (Outpost-813 on the rim of a black hole; MPAT's story; see `docs/lore/MPAT-and-M813.md`).
4. Settle the 34 open items in spec section 14 through playtests.
