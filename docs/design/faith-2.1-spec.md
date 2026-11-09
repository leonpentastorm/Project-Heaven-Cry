# Faith 2.1: Leon's rulings and Devotion XP (design spec, 9 Nov 2026)

Status: **accepted direction (Leon, 8–9 Nov 2026), numbers provisional.** Rules revision **1.6.1** (Blessing 2.1). This
file is the shared source for the build on `feature/faith-2.1`; once written into `docs/rules/PHC-Core-Rules-v1.0.md`
("Patrons and prayer" and section 14 **from item 701**: World Play 1.1, built in parallel, takes 671–700; decision
**107**), the spec there wins.

## 0. Why

Playtest: a character reached **Devotion 10 on the area map by turn 3**. The cause, from the code:

- The +2-a-fight cap on liked tags is kept on the fight unit (`u.faith.liked`). The area map rebuilds every unit on
  every action (`storyCb`), and the per-action key uses `g.v`, so out of a fight **every action is a fresh +1**. A stim
  on an ally is heal +1 and supply +1 at once, every round.
- Devotion is a level that moves ±1 per event, and the Narrator can move it ±2 per op with up to 8 ops a turn.

So XP alone wouldn't fix it: any curve gets farmed the same way. Faith 2.1 adds an XP meter **and** fixes the caps.

## 1. Devotion XP

Devotion stays the **0–10 standing**; the gates are unchanged (Hymn I 3, Hymn II 5, Hymn III 7, Miracle 7 with Faith
7). What changes is how you get there: **each level needs XP**, and events give XP, not levels.

- The character stores **`devotionXp`**, the total. The level is derived from the table below; `c.devotion` is kept in
  sync as the level for old readers.
- **Gains and losses both move XP.** A loss can drop you a level (standing falls), never below 0.
- **Faithful characters still start at Devotion 3** (Leon, 9 Nov 2026): XP 45, the level-3 threshold.

**The curve** (PROVISIONAL; total XP to reach each level):

| Level | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Total XP | 0 | 10 | 25 | **45** | 70 | **102** | 152 | **212** | 277 | 347 | 432 |
| Step | | 10 | 15 | 20 | 25 | 32 | 50 | 60 | 65 | 70 | 85 |
| **Built (tuned)** | 0 | 10 | 25 | 45 | 70 | 102 | **147** | **200** | **270** | **350** | **450** |

**As built** (spec items 701 and 717): the pace simulation tuned levels 6–10 to 147 / 200 / 270 / 350 / 450 (steps 10,
15, 20, 25, 32, 45, 53, 70, 80, 100). With the numbers above, Devotion 7 averaged session 9.7 (up to 12) and 10 came as
early as session 19; tuned, 5 lands at session 3.6 on average, 7 at 9.0 and 10 at 23 (40 seeds). The table above is
the design as accepted, kept for the record; the spec wins.

Target pace (Leon's table), checked by a simulation test (section 6):

| Reach | Unlocks | Pace |
|---|---|---|
| 3 | Hymn I | at creation (start) |
| 5 | Hymn II | around sessions 3–4 |
| 7 | Hymn III and the Miracle (with Faith 7) | around sessions 8–10 |
| 10 | full standing | 20+ sessions |

**Sources** (PROVISIONAL):

| Source | XP |
|---|---|
| A liked tag | **+1** (capped: section 2) |
| A vow kept | **+3** |
| A rite kept (once per rite per session) | **+4** |
| Bringing someone into the faith (Narrator) | **+4** |
| A deed the Narrator marks | **+2 to +5** |
| A taboo tag | **−3**, or **−6** while Witnessed |
| A vow broken | **−5** |
| A failed overreach | **−3** |
| Breaking character where your patron can see (Narrator) | **−6** |
| The Guardian's Judgement ("spends 1 Devotion") | **−10** |
| A Miracle | spends it all: **XP 0, Devotion 0** |
| Each knowledge piece of your new patron, on conversion | **+1 level** (XP set to that level's threshold) |

Notes:

- **A Miracle resets you to 0**: getting back to 7 takes about 212 XP (200 as built), roughly 11 sessions (10 as
  built) at the target pace. That is
  the Miracle's real price now. (Flag for Leon at review.)
- **The Narrator's `faith` op `devotion`** now moves **XP**: `delta` from −6 to +5 with a reason ("a deed", "broke
  character"), and the Narrator's gains are capped at **+10 XP a session** per character (losses aren't capped). The old
  ±2 levels per op is gone. The legacy `patrons[]` path follows the same rule.
- The **sandbox** (Proving Ground) Devotion stepper sets the level (XP to that threshold), as before.
- Heretic's Stolen Fire snapshot/restore must include `devotionXp` and the cooldown fields.

## 2. Caps on tags (point 6)

- **Each liked tag counts once per scene and once per fight.** (A fight is one; a story *scene* is
  `g.story.scene.n` — a new `sceneTitle` starts a new one.)
- **Tag XP caps:** at most **2 XP a fight**, at most **2 XP a scene** out of fights, and at most **6 XP a session**
  from tags in all (PROVISIONAL). This replaces the old "+2 a fight" cap and Leon's 8 Nov ruling "+1 a fight" (that
  ruling was written in levels; in XP a liked tag is worth 1/20 to 1/85 of a level).
- **Taboo tags aren't capped** but also count once per action, as now.
- **The caps live on the character, not the fight unit** (`c.faithTally` or similar: `{ session, scene, sceneXp,
  sessionXp, sceneTags[], fight?: { id, xp, tags[] } }`), so the area map's throwaway units can't reset them. The
  per-action dedup must not use `g.v` alone on the area map.
- Vows, rites and Narrator deeds don't count toward the tag caps.

## 3. Leaving a patron (the 8 Nov rulings)

**Leaving (apostasy, `faith/apostasy`):** you walk away from the pact without joining anyone.

- Devotion XP 0, Devotion 0, you become an Atheist; the old patron's Hymns stay as pieces (item 606, unchanged).
- **A 90-day cooldown** before you can make a pact with any patron: pacts are refused until `day ≥ leftOn + 90`
  ("Nobody answers yet: N days").
- **The day counter** (new, Leon 9 Nov): `g.day` starts at 1. Each **long rest** is 1 day. The Narrator can advance days
  with an optional turn field **`days`** (an integer, 1–3650, for travel and time skips; "years passing" travel can use
  it). Shown on the faith tab with the cooldown and in the HERE card as "Day N". Old saves start at day 1.

**Leaving one patron to join another** (a `faith/pact` while Faithful to someone else):

- **No cooldown.** (As built, item 719: a switch never raises Devotion; the new pact starts at the lower of the XP you
  had and the conversion's.) It is no longer "apostasy, then the pact" (item 607 changes): no APOSTASY line, the old patron's
  pieces are handled as the conversion rules say (Jealous new patron: pieces gone; Open: kept).
- **The patron you leave may punish you**, as its data says:
  - each patron gets a **`leave`** block in `data/patrons.json`:
    `{ "lets_go": "never" | "roll", "tn": <number>, "grudge": { "sessions": n, "condition": <condition id>,
    "rounds": n, "xp_mult": 0.5, "text": "…" } }`;
  - **Open** patrons roll: d20 + Faith vs their `tn` (about 10–12); on a success they let you go (a farewell line, no
    grudge); on a miss, a **light grudge** (1 session);
  - **Jealous** patrons never let you go: always a **harder grudge** (2–3 sessions);
  - **A grudge** (PROVISIONAL): while it lasts, at the start of each fight you begin with the patron's chosen condition
    (from `data/conditions.json`) for `rounds` rounds, and your **new** patron's Devotion XP gains are multiplied by
    `xp_mult` (the old patron lobbies against you: Celestial politics). It ends after `sessions` sessions.
    *As built (spec item 713): "`sessions` sessions" counts full sessions after the one you switch in, so the rest of
    the current session is extra (a light grudge is never shorter than one full session, whenever you switch). Rooms
    move sessions on with the host's Next session (item 721). Apostasy ends a grudge (item 720); its condition lasts
    its rounds of your own turns and ends with the fight (item 723).*
  - Each patron picks its own condition and words, in character (Nerukhan judges, the Laughing Mask plays a trick, Old
    Overcast storms…); conditions must be ones the engine runs.
- **A new line bank `farewell`** (3 lines per patron) is spoken when you leave, either way. The validator's bank count
  rises from 9 to 10.

## 4. The faith gold

- **`--faith-light: #F2C46A`** is approved (Leon, 8 Nov): **light only** (glows, the Miracle, the Devotion meter's fill,
  a patron's mark lit), **always beside a word**, never the only carrier of meaning.
- The web app has no global stylesheet: add a `:root` block (for example in `apps/web/index.html`) defining
  `--faith-light`, and use `var(--faith-light)` where the gold is hardcoded today (`main.template.html` ~318–332, the
  faith tab and view) with `FAITH_GOLD` kept as the JS constant.
- Record it in `docs/design/colour-system.md` (and `art/style-guide/palette.json` `ui` if it fits the validator's
  contrast rule; then `tools/rehash_art_checksums.py`).

## 5. Art direction text

Patrons are painted **as a god appears to a human (an NPC)**: apparitions, effigies, masks — never the Celestial behind
the costume, never a real person. **The delivered set is right**; the documents just don't say so yet. Write it into:

- `art/style-guide/PHC-Style-Guide.md` (the patron section, ~483–500);
- `docs/design/handoffs/blessing-art-brief.md` ("The idea" and Deliverable A);
- `docs/design/blessing-2.0-spec.md` section 8.

## 6. Checks

- Engine tests for every row above: the curve, gains and losses crossing levels, the caps (fight, scene, session, and
  the area-map farm that broke the playtest: 20 story actions with heal/supply tags must not give more than the caps),
  vows, rites, the Narrator's XP and its session cap, the Miracle reset, Judgement, conversion pieces, apostasy's
  cooldown on the day counter (long rests and `days`), the direct switch with no cooldown, Open's roll and Jealous's
  grudge (the fight-start condition and the XP multiplier, ending after its sessions), save migration (old `devotion`
  level → `devotionXp` threshold), Stolen Fire, determinism.
- **A pace simulation test**: a seeded "typical session" (about 3 fights and 3 scenes; a vow sworn in most fights and
  usually kept; 1–2 rites; one Narrator deed of 2–5; liked tags as they come, a taboo now and then) run for 30 sessions,
  asserting Devotion 5 lands in sessions 3–4 (±1), 7 in sessions 8–10 (±1) and 10 after session 20. If it doesn't land,
  tune the numbers (they're all provisional) and say so.
- Web: the meter shows the level and the XP toward the next ("DEVOTION 4 · 12/32 XP"), the fx float says "+1 DEVOTION
  XP · HEAL" and a level change says "DEVOTION 5"; the cooldown and grudge show on the faith tab; the Narrator's FAITH
  block and schema describe XP and the caps; the prompt cost tests still pass.
