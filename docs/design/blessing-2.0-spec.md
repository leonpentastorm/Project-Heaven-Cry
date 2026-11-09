# Blessing 2.0: faith is a relationship (design spec, 8 Nov 2026)

Status: **accepted direction, numbers provisional.** Built from Leon's brainstorm answers (8 Nov 2026). Rules revision
1.6. This file is the shared source for the three work pieces:

- the art brief: `docs/design/handoffs/blessing-art-brief.md`
- implementer 1, engine: `docs/design/handoffs/_archive/blessing-implementer-1-engine.md`
- implementer 2, web: `docs/design/handoffs/_archive/blessing-implementer-2-web.md`

Once implementer 1 has written this into `docs/rules/PHC-Core-Rules-v1.0.md`, the spec there wins. Until then this file is
the rule.

## 0. Why

Playtest verdict (Leon): "the current system feels like it's not even there."

What was wrong with prayer:

- Prayer was 3 AP and a d20. A miss did nothing.
- The patron never reacted.
- Nothing you did in a fight mattered to the patron.
- Nothing built up.

The three magics now split like this:

| Magic | Owns | Pays with |
|---|---|---|
| Sigil (rules 1.4) | space: placement, Lines, setups | cores and Flux |
| Outburst (rules 1.5) | time and the body | blood and Strain |
| **Blessing (rules 1.6)** | **a relationship: someone is watching** | **obedience: vows, rites, taboos** |

## 1. Belief (chosen at creation)

Every character is either **Faithful** or **Atheist**. The choice is a new step in character creation.

- **Faithful:** sworn to one patron. Devotion starts at 3.
  - The patron list is the patrons of the character's Sector (all 8 below for the Earth Sector).
- **Atheist:** no patron and no Devotion. Prays by dice (section 4). This is the **pilgrim** path.
- **Praying at all needs Faith 3.** Belief is still chosen at Faith 0: it is who you are, and the Faith skill is what you can do with it.
- **Old saves:**
  - A character with no pact becomes Atheist.
  - A character with a pact becomes Faithful to that patron with their current Devotion.
  - (Leon: test characters are made fresh each session, so this only has to be safe.)

## 2. Devotion: the one meter (Faithful only)

> **Superseded in part by Faith 2.1** (rules 1.6.1, 9 Nov 2026; `docs/design/faith-2.1-spec.md`, decision 107, spec
> items 701–723). Devotion is still the 0–10 standing with the same gates, but events now move **Devotion XP** toward
> the next level (a curve from 0 to 450 XP), not levels: the +1 / −1 / −2 values below are replaced by XP values, the
> "+2 a fight" cap by tag caps kept on the character (2 XP a fight, 2 a scene, 6 a session), the Narrator's ±2 by −6 to
> +5 XP with +10 a session, and a failed overreach costs 3 XP. The tables below are the 1.6 rules, kept for the record.

Devotion runs 0–10 and is your **standing** with your patron. You do **not** spend it to ask for things; asking is
limited by cooldowns.

**It rises when:**

| Event | Change |
|---|---|
| An action in a fight carries a tag your patron likes (section 6) | +1, at most +2 a fight |
| A vow is kept (section 5) | +1 |
| A rite is kept (once per rite per session; engine button or Narrator) | +1 |
| Bringing someone into the faith (Narrator) | +1 |
| Each knowledge piece of your new patron, on conversion (section 7) | +1 |

**It falls when:**

| Event | Change |
|---|---|
| An action carries a taboo tag | −1, or −2 while Witnessed |
| A vow is broken | −2 |
| A failed overreach (asking above your standing) | −1 |
| Breaking character where your patron can see (Narrator) | −2 |

**A Miracle is the one thing that spends Devotion:** all of it.

**Standing gates what you may ask for:**

| Ask | Needs |
|---|---|
| Whisper | anything (Devotion 0 works) |
| Hymn I | Devotion 3 |
| Hymn II | Devotion 5 |
| Hymn III | Devotion 7 |
| Miracle | Faith 7, Devotion 7, once a session; spends all Devotion |

**Overreach: asking above your standing.**

- You may ask for a Hymn above your Devotion.
- Roll d20 + Faith modifier against 12 + 2 × (the gate minus your Devotion).
- A miss: nothing happens, the AP is spent, and Devotion −1.
- There is no overreach for Miracles.

## 3. The three sizes of prayer

Shared rules:

- Every prayer drops the ambient mana meter by 5 (as now).
- Silenced characters can't pray.
- Any prayer can be made in a fight or in the story.
  - Outside a fight the engine applies the numbers that still mean something there (heals, shields, conditions).
  - The Narrator narrates the rest.

| Size | AP | Limit | Who |
|---|---|---|---|
| **Whisper** | 1 | once per turn | anyone with Faith 3 |
| **Hymn** | 3 | the prayer cooldown (derived stat, rounds) | Faithful: their patron's Hymns. Atheist: the Hymns they have learned (section 4) |
| **Miracle** | 3 | once per session | Faithful only, Faith 7 (**atheists never**) |

### Whispers: the same six for every patron

Everyone wishes for luck and good health, and every god can grant it. The patron changes only the look, the sound and the
line spoken.

| Id | Name | Effect |
|---|---|---|
| luck | Luck | You or an ally in sight: +2 on the next roll |
| health | Health | You or an ally in sight heals 15 × Blessing power |
| protection | Protection | You or an ally in sight gains a 15 × Blessing power shield |
| courage | Courage | End Fear or Shaken on you or an ally in sight |
| guidance | Guidance | Reveal Hidden enemies and traps within 6, and +2 on your next notice roll |
| safe_passage | Safe Passage | Your next move this turn provokes no opportunity attacks |

### Hymns and Miracles: specific to each patron

Each patron has three Hymns (I, II and III) and one Miracle (section 8).

### Witnessed (Faith 5)

After a successful Hymn or Miracle, you are Witnessed until your next turn:

- actions with tags your patron likes get +2;
- taboo actions cost double.

Only the Faithful can be Witnessed.

## 4. Atheists and pilgrims

- An Atheist prays **by dice** and has no meter.
  - Whisper: d20 + Faith modifier vs **12**.
  - A learned Hymn I, II or III: vs **14 / 16 / 18**.
  - A miss: nothing happens and the AP is spent.
- At first an Atheist can only Whisper.
- **Knowledge pieces.**
  - An NPC with Faith above 5 can teach you about their patron.
  - Each lesson is one **piece**, granted by the Narrator.
  - Each piece unlocks that patron's **next Hymn in order** (I, then II, then III).
  - Three pieces from one patron is that patron's whole kit.
  - Pieces from many patrons give a mixed kit: the pilgrim.
- **Atheists never get a Miracle**, and are never Witnessed.

## 5. Vows

- At the start of a fight, any Faithful character may swear one vow from the shared list. It is free.
- The engine tracks it and settles it at the end of the fight:
  - kept: +1 Devotion;
  - broken: −2 Devotion, the moment it breaks.
- The patron speaks a line either way.

| Id | Vow | Broken when |
|---|---|---|
| shield | "None of them falls." (name an ally) | that ally is Downed |
| mercy | "I spare who yields." | you damage a surrendered or Downed enemy |
| stand | "I don't give ground." | you end a turn farther from the nearest enemy than you started it |
| bare | "By my own hands." | you attack with a gun or a spell |
| unarmed_faith | "No magic but theirs." | you draw, Evoke or Begin (Sigil or Outburst) |
| no_one_behind | "Nobody left behind." | an ally is still Downed when the fight ends |

## 6. Tags: what your patron sees

The engine tags actions in a fight. Each patron has 3 liked tags and 2 taboo tags (section 8). A tag fires once per
action.

| Tag | Fires when you… |
|---|---|
| protect | shield, Interpose, Brace, take a hit for someone |
| heal | heal or stabilise someone else |
| mercy | accept a surrender, or end a fight without killing a surrendered enemy |
| judge | kill or Down an enemy that harmed a surrendered or Downed creature this fight |
| kill | kill an enemy |
| burn | deal Fire damage or set Burning |
| storm | deal Storm damage (SHOCK, the Storm tone) |
| trick | use a Trickster move, Hidden, False Image, a feint or a swap |
| supply | reload an ally, throw a stim, hand over items, place cover |
| hold | end a turn Braced, Anchored or in Overwatch |
| flee | retreat out of a fight or Disengage away from enemies |
| desecrate | damage a shrine, a corpse or holy ground (map objects tagged holy) |
| betray | attack a creature on your own side |
| cower | end a turn Hidden while an ally is Downed |

## 7. Conversion and the patron's rule about other gods

- An Atheist can convert: the Narrator makes a pact with a patron.
  - That patron's knowledge pieces turn into Devotion, +1 each, on top of the starting 3, capped at 10.
  - Those Hymns are now prayed by standing, not dice.
- **Every patron states one rule about other gods' Hymns:**
  - **Open:** you keep Hymns learned from other patrons. You pray them by dice, as an Atheist would. As a Faithful you may
    keep learning more.
  - **Jealous:** on the pact, every other patron's Hymn and piece is gone. A Faithful of a jealous patron can't learn from
    other patrons.
- **Leaving a pact** (apostasy) is a Narrator event:
  - Devotion goes to 0;
  - you become Atheist;
  - the old patron's Hymns stay as pieces.

  PROVISIONAL; open item.

> **Settled by Faith 2.1** (Leon, 8 Nov 2026; `docs/design/faith-2.1-spec.md` section 3, spec items 709–714).
> Apostasy also starts a **90-day cooldown** on the new day counter before any pact. A pact while Faithful to someone
> else is a **direct switch**, not apostasy: no cooldown, but the patron you leave may punish you (its `leave` block in
> `patrons.json`): Open patrons roll d20 + Faith against their TN to let you go, Jealous ones never do, and a grudge
> puts a condition on you at each fight's start and halves your new Devotion XP gains for its sessions. The old patron
> speaks a farewell line either way.

## 8. The eight launch patrons

Every patron is a Celestial LARPing a god archetype (the Unspoken Name rule: no real god is ever named). We stay away
from the central figures of living religions.

**How patrons are painted** (Leon, 8 Nov 2026): as a god appears to a human of the world, an NPC. The portraits show
apparitions, effigies and masks lit by the patron's answering light; never the Celestial behind the costume, never a
player breaking character, never a real person. The LARP is the Narrator's truth (World Bible), not the portrait's: the
art keeps the Veil as the world does, and any wink lives in the costume's details. **The delivered set in
`art/portraits/patrons/` is right** and is the reference for new patrons. Rules for the artist: `art/style-guide/PHC-Style-Guide.md`
("Patron apparition colour identities") and `docs/design/handoffs/blessing-art-brief.md`.

Each patron has the following:

- a costume;
- 3 liked tags and 2 taboo tags;
- 2 rites (one engine button, one Narrator);
- an Open or Jealous rule;
- an intervention: once a fight, while you are Witnessed, the patron acts unasked when its trigger happens;
- 3 Hymns and a Miracle;
- an FX accent (for light and particles only, never for UI text);
- voice-line banks.

| # | Patron | Archetype, and the Celestial's LARP | Likes | Taboos | Rule |
|---|---|---|---|---|---|
| 1 | **Holy Father Nerukhan** (exists) | The judge-saint of the Lumeri saint-church; never breaks costume | judge, mercy, protect | betray, desecrate | Jealous |
| 2 | **The Quartermaster** (exists) | Logistics god of a war that never ended; loves stamped forms | supply, hold, protect | flee, desecrate | Open |
| 3 | **The Laughing Mask** (exists) | The trickster; joined the Accords to troll them; demands a show | trick, burn, flee | cower, mercy | Open |
| 4 | **The Toll-Keeper** | The guide of the dead at the last crossing. A quiet Celestial in a boatman's oilskin with a coin box, who answers at dusk | mercy, heal, hold | kill (of the surrendered), desecrate | Jealous |
| 5 | **Mother Ember** | The hearth-mother: kettle, apron, flour on the sleeves; calls everyone "love" | heal, protect, supply | betray, cower | Open |
| 6 | **Old Overcast** | The thunder sky-father, played big and theatrical: a beard of cloud, a lightning rod like a sceptre. Has a rival Thunder-Father (a future patron) | storm, kill, hold | flee, cower | Jealous |
| 7 | **The Matchmaker** | The love goddess, played as a wedding planner with spools of red thread | protect, mercy, heal | betray, kill (of the surrendered) | Open |
| 8 | **The Counting Weaver** | The fate-spinner, played as an auditor: a loom of ledger tape, an abacus of beads | hold, trick, judge | flee, betray | Open |

### Hymns and Miracles

Effects use existing engine conditions and ops where possible. All numbers are × Blessing power and provisional.

| Patron | Hymn I (Devotion 3) | Hymn II (Devotion 5) | Hymn III (Devotion 7) | Miracle |
|---|---|---|---|---|
| Nerukhan | **Saint's Shield:** an ally in sight gains a 40 shield | **Judgement:** an enemy in sight takes 40 Soul; ×2 if it harmed the helpless this fight | **Absolution:** an ally is cleansed of every condition and heals 30 | **The Saints' Verdict:** every enemy that harmed the helpless this fight takes 60 Soul and is Stunned 1 round |
| Quartermaster | **Resupply:** an ally in sight reloads every weapon for free and regains 1 Supply | **Dig In:** an ally gains half cover where they stand until they move, and is Braced | **Covering Fire:** a 3×3 area in sight; every enemy in it makes a Body save or is Pinned 1 round | **Requisition Approved:** the whole squad is restocked (ammo, Supplies, one standard core each) and gets +2 AP next turn |
| Laughing Mask | **Lucky Break:** an ally's next failed roll is rerolled at +5 | **Switcheroo:** swap two units in sight within 6 (an enemy gets a Brain save) | **Pratfall:** an enemy in sight makes a Body save or falls Prone and drops its held weapon | **Encore:** every ally may repeat the last action they took this round, for free, now |
| Toll-Keeper | **Coin for the Ferry:** a Downed ally in sight is stabilised and stands at 10 HP | **Hold the Gate:** until your next turn, allies in sight can't drop below 1 HP | **Last Crossing:** an enemy in sight at a quarter HP or less makes a Heart save or dies (bosses take 40 Soul instead) | **Turned Back at the Shore:** an ally who died this fight returns at 1 HP |
| Mother Ember | **Warm Hands:** an ally in sight heals 40 | **Hearthlight:** a 3×3 area in sight; allies starting a turn in it heal 10, for 3 rounds | **Feed the Fire:** an ally gets +1 AP now (ceiling applies) and loses Weakened and Slowed | **Everyone Home:** the whole squad heals to full, and Downed allies stand |
| Old Overcast | **Thunderclap:** every enemy within 2 of a tile in sight is pushed 1 and makes a Heart save or is Shaken | **Lightning Rod:** 50 Elemental (Storm) to an enemy in sight, chaining to 1 more within 2 at half | **Gather the Clouds:** until your next turn, allies' Storm riders count one stage higher | **The Sky Answers:** a 3×3 area in sight takes 80 Elemental (Storm), and everyone in it is Shaken |
| Matchmaker | **Red Thread:** link two allies in sight for 2 rounds; damage to either is split between them | **Sweet Nothings:** an enemy in sight makes a Heart save or can't attack you or your linked allies next turn | **Together:** two adjacent allies each get +2 to hit and +2 Defense until your next turn | **Love Conquers:** every non-boss enemy in sight makes a Heart save or surrenders |
| Counting Weaver | **Foreknowing:** the next attack against an ally in sight misses | **Unravel:** every buff, shield and helpful state on an enemy in sight ends | **Cut Short:** an enemy in sight makes a Heart save or loses its next turn (bosses lose 2 AP) | **Rewoven:** your squad takes another turn, now, in initiative order |

### Interventions

Once per fight, while you are Witnessed, the patron acts unasked when its trigger happens.

| Patron | Trigger | Intervention |
|---|---|---|
| Nerukhan | an enemy damages a surrendered or Downed creature | that enemy takes 20 Soul |
| Quartermaster | your gun runs dry | it reloads, free |
| Laughing Mask | an enemy rolls a natural 1 against you | it falls Prone |
| Toll-Keeper | an ally would die | they stay at 1 HP instead |
| Mother Ember | an ally drops below a quarter HP | they heal 15 |
| Old Overcast | you kill an enemy | 20 Storm to the nearest other enemy |
| Matchmaker | an ally is hit while adjacent to you | half the damage moves to you |
| Counting Weaver | an enemy crits you | it becomes a normal hit |

### Rites (two per patron)

- **Engine rites** are buttons in the story: a confession before a fight, a tithe of credits, a vigil at rest.
- **Narrator rites** are ones like keeping a shrine.
- Implementer 1 writes them per patron and marks which is which.

### Voice lines

Each patron has a bank per event, 3 lines each, in their costume's voice:

- answered
- refused (a missed overreach)
- taboo
- vow kept
- vow broken
- Witnessed
- intervention
- Miracle
- conversion

The engine picks a line deterministically (seeded). The Narrator doesn't write them, so it costs nothing per turn.

## 9. What the Narrator still owns

The Narrator:

- makes pacts (and conversions);
- grants knowledge pieces (an NPC with Faith above 5 taught you);
- marks Narrator rites kept;
- moves Devotion by at most ±2 per call, with a reason (breaking character, bringing in a believer);
- tags holy ground;
- decides what a prayer means in the story.

The engine owns:

- every number;
- the tags;
- vows;
- Witnessed;
- interventions;
- the dice.

Patron mood (the old prayer TN) is retired: the overreach TN and the Atheist TNs above replace it.

## 10. Compatibility

These must keep working:

- the Guardian's Blessed Shells, Under the Eye and Judgement (Judgement spends 1 Devotion, the only other spend; flag
  for Leon);
- Blessing power (`blessPower`) and the Faith perks;
- Rite in the Field;
- prayer-related traits;
- Factory Made / The Old Blood hooks on `blessing_in`.

Implementer 1 audits every reader of `pray`, `blessing`, `devotion`, `patron` and `prayedRound`.

## 11. Open items (for Leon)

1. **Apostasy:** the rule in section 7 is a guess. *Settled by Faith 2.1* (decision 107): the 90-day cooldown, the
   direct switch with the leave roll and grudges (section 7's note).
2. **The +2 a fight cap** on tag gains. *Replaced by Faith 2.1*: Devotion XP with tag caps of 2 XP a fight, 2 a scene
   and 6 a session, kept on the character (section 2's note; spec items 701–704).
3. **Judgement (Guardian)** still spends Devotion. *Faith 2.1:* it spends 10 Devotion XP (spec item 706), so it can
   drop a level but no longer costs a whole one.
4. **Hymn numbers.** Every Hymn and Miracle number above needs a pass against `docs/design/balance-targets.md`.
5. **The rival Thunder-Father,** and the many-masks pantheon, for later patrons.
