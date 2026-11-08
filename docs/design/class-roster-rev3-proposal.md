# Class Roster, Revision 3: one base class per attribute (DRAFT for Leon, 8 Nov 2026)

Status: **draft, nothing in the spec, data or engine has changed.** Leon's direction (8 Nov 2026): each attribute gets
a base class; advanced classes are shelved and rethought later as attribute pairs; base classes are rebuilt from the
pooled abilities of all 34 classes, because base classes "are missing too many fantasy" and advanced classes "are a
BITCH to get in gameplay". All thresholds are provisional.

## 1. The shape

- **9 base classes, one per attribute.** Each attribute owns an α (combat), a β (utility) and a γ (social) skill,
  so each class covers fighting, utility and talk in one fantasy.
- **The cores line up by themselves:** Body (Endurance, Strength, Agility) gets Defender, Fighter, Marksman; Mind
  (Perception, Intelligence, Expression) gets Assassin, Mage, Trickster; Soul (Insight, Determination, Virtue) gets
  Bard, Channeler, Guardian. The Assassin moves from Body to Mind (Perception is a Mind attribute); it needs no magic.
- **Two moves per rank, six per class** (was one per rank, three per class): 54 moves in all.
- **Every one of the 39 old base moves is kept**, and 15 advanced moves join them. The other 48 advanced moves are
  shelved (section 4): their engine code and tests stay as they are; nobody can learn them until the advanced rethink.
- Names: the nine keep today's names, so nothing the testers know is renamed. Renames are a free choice (section 6).

## 2. Getting a class and ranking up (provisional)

| | Rule |
|---|---|
| Earn the class | Level 3 (unchanged): the class of your **highest attribute**; on a tie you choose among the tied ones. Nobody is classless. |
| Rank I | On gaining the class: both rank I moves. |
| Rank II | That attribute at **5**: both rank II moves. |
| Rank III | That attribute at **8**: both rank III moves. |
| Changing class | At a level-up where another attribute has become your highest, you may switch (you keep nothing of the old class). PROVISIONAL; the alternative is that the class is fixed at level 3. |

Rank is read from the attribute, not from signature skill totals (the old 13 / 18). Attributes run 1 to 10 and are
capped by their core, so a rank III class needs that core at 8+.

## 3. The nine classes

Source in brackets: the move's id stays the old one (`medic.triage`), so the engine runs it unchanged. AP and uses are
today's. A resource travels with the moves that spend it.

### Body

**Defender (Endurance): the wall.** Durability, Pain Threshold, Sensory. Resource: Guard.
| Rank | Move | What it does |
|---|---|---|
| I | Brace (2 AP) [defender] | Gain Guard (1 + Durability modifier, max 5), +2 Defense until you move; Interpose while you hold Guard. |
| I | Deploy Cover (2 AP) [siege_engineer] | An adjacent barricade: half cover, 40 HP (full with a STAY glyph next to it). |
| II | Draw Fire (1 AP, 1 Guard) [defender] | One enemy must attack you next turn or take −2 against anyone else. |
| II | Unbroken (once a scene) [adamantile_knight] | The first time you'd drop to 0 HP, drop to 1 and gain 3 Guard. |
| III | Reactive Plate (reaction) [defender] | Spend Guard as you take damage: −10 per point; shed bots raise the meter. |
| III | Bulwark Line (4 AP, once a scene) [siege_engineer] | Until your next turn all cover within 3 tiles is full cover and gains 20 HP. |

**Fighter (Strength): blades, fists and fear.** Raw Power, Guts, Intimidation. Resource: Momentum.
| Rank | Move | What it does |
|---|---|---|
| I | Lunge (1 Momentum) [fighter] | Move 2 tiles as part of a melee attack, no opportunity attacks. |
| I | Empty Hand [grand_sigilist] | With empty hands, unarmed strikes deal 20 Physical for 2 AP, and +2 Defense. The brawler is a real build. |
| II | Riposte (reaction, 1 Momentum) [fighter] | When a melee attack misses you, hit back for 0 AP. |
| II | Lingering Dread [shade] | When you kill, enemies within 3 who saw it save or are Shaken. Intimidation in action. |
| III | Finisher (3 AP) [fighter] | Spend all Momentum: +20% damage per point (up to +100%). |
| III | Sweep (3 AP, 3 Momentum) [banner_dancer] | Move 3 tiles, one melee attack on each enemy you pass; each ally you pass heals 10. |

**Marksman (Agility): the gun hand.** Athletics, Dexterity, Reaction Speed. Resource: Heat.
| Rank | Move | What it does |
|---|---|---|
| I | Fire Discipline [marksman] | Aimed shots add no Heat; one Burst a turn costs 2 AP; bows +3 on Aimed. |
| I | The Draw (once a combat) [gunslinger] | A free pistol or revolver shot before the first turn. |
| II | Special Ammo (per rest) [marksman] | One magazine each of AP, hollow-point and incendiary; swap type while reloading. |
| II | Called Shot (3 AP, −2) [gunslinger] | Head, arm or leg: on a hit, that injury without a crit. |
| III | Killzone [marksman] | Overwatch holds two shots, at the first two enemies to move, both +2. |
| III | Six for Six (4 AP, once a scene) [gunslinger] | Up to six pistol shots at targets within 4 tiles. |

### Mind

**Assassin (Perception): eyes, poison, the patient kill.** Ingenuity, Proficiency, Vigilant. Resource: Marks, toxin doses.
| Rank | Move | What it does |
|---|---|---|
| I | Mark (1 AP) [assassin] | Marked: your squad +1 to hit it; it can't hide. |
| I | Case File [ccec_ballistician] | Analyze costs 1 AP and also Marks the target. |
| II | Toxin (1 AP, 1 dose) [assassin] | Next hit adds Weakened, Slowed or Bleeding (save). |
| II | Silent Kill [shade] | A kill from Hidden doesn't reveal you. |
| III | Execution [assassin] | A hit on a Marked enemy at a quarter HP or less kills it (not bosses or Celestials). |
| III | Weak Point [ccec_ballistician] | Aimed shots at a Marked target ignore armour and crit on 18–20. |

**Mage (Intelligence): Sigil damage and the long script.** Brain Power, Rumination, Eloquence. Resource: Flux. (Mage + Scribe.)
| Rank | Move | What it does |
|---|---|---|
| I | Barrage [mage] | FIRE, FREEZE, SHOCK, STONE, ACID cost 1 charge less. |
| I | Quicken (2 AP, 1 charge, once a turn) [scribe] | An ally gets +1 AP next turn. |
| II | Overcharge (once a combat) [mage] | One word past your limit (4 glyphs max), free. |
| II | Inscribe Gear (3 AP, 2 charge) [scribe] | Ally's weapon +10% damage or armour +5 until rest. |
| III | Payload [mage] | Double area, or one more missile; Flux = glyph count. |
| III | Stored Spell (per rest) [scribe] | Write a spell into an object; anyone fires it later for 1 AP. |

**Trickster (Expression): walls, binds and lies.** Visualization, Analysis, Charisma. Resource: Flux. (Trickster + Warden.)
| Rank | Move | What it does |
|---|---|---|
| I | Bind [trickster] | BIND costs 1 less; its save is 14 + your debuff strength. |
| I | Raise Cover [warden] | A lone STAY glyph Evoked as full cover on 2 tiles. |
| II | Blind and Slow [trickster] | Learn BLIND, SLOW and MUDDLE, each 1 charge cheaper. |
| II | Ward (2 AP, 1–3 charge) [warden] | Shield an ally: 10 per charge × healing multiplier. |
| III | Rewrite (3 AP, 3 charge) [trickster] | An enemy buff flips into its opposite (save). |
| III | Seal (3 AP, 2 charge) [warden] | A 3×3 zone where enemy Sigils and Soul spells cost double, 2 rounds. |

### Soul

**Bard (Insight): nobody stays behind.** Empathy, Camaraderie, Implication. Resources: Supplies, MP and Strain. (Bard + Medic.)
| Rank | Move | What it does |
|---|---|---|
| I | Triage (2 AP) [medic] | Heal an adjacent ally 20 × healing multiplier, end Bleeding; stabilise for 1 AP. No Supplies. |
| I | Inspire (1 AP, 10 MP) [bard] | An ally +2 on their next roll; no Strain. |
| II | Stim Throw (1 AP, 1 Supply) [medic] | Heal an ally within 4 tiles 30 × multiplier. |
| II | Mend [bard] | A Buff-school heal of 40 × multiplier, stronger in rich air. |
| III | Field Surgery (1 Supply, out of combat) [medic] | Treat a limb injury or clear every Body condition; repairs robots too. |
| III | Gift (per rest) [bard] | Lend an ally one design; they cast it once for 3 AP at stage 1, on your MP and Strain. |

Without an Emanator a Bard is a field medic through rank II (Triage, Stim Throw, Field Surgery work; Inspire, Mend and
Gift need one).

**Channeler (Determination): the storm and the nightmare.** Will Power, Lore Master, Composure. Resource: Strain. (Channeler + Hexer.)
| Rank | Move | What it does |
|---|---|---|
| I | Shape [channeler] | First paid Pump a turn is free on a Damage design. |
| I | Dread [hexer] | Fear spells cost 5 MP less; Fear lasts a round longer. |
| II | Storm Front (+10 MP, once a turn) [channeler] | A Damage Bolt or Lance arcs to 2 more enemies with its tone's rider. |
| II | Mind Fog [hexer] | Status spells can inflict a Brain Debuff, save TN +2. |
| III | Heart Surge (once a turn) [channeler] | A Release fires a stage higher (×2.6 past 4) for double Strain. |
| III | Puppet (60 MP, once a scene) [hexer] | You choose the target's next action (save; bosses roll twice). |

**Guardian (Virtue): the shield and the judgement.** Faith, Conscience, Authority. Resources: MP, Strain, Devotion. (Guardian + Lumeri Templar.)
| Rank | Move | What it does |
|---|---|---|
| I | Will Shield (20 MP) [guardian] | An ally gains a 30 × multiplier shield for the combat. |
| I | Blessed Shells [lumeri_templar] | A successful prayer's Blessing loads into your weapon; it resolves on your next hit. |
| II | Drink It In (reaction) [guardian] | An enemy spell hitting your shield feeds you its MP. |
| II | Under the Eye [lumeri_templar] | While Witnessed, allies within 3 get +2 on your patron's theme. |
| III | Sanctuary (60 MP, +1 Strain, once a scene) [guardian] | A 3×3 zone where allies take half damage until your next turn. |
| III | Judgement (4 AP, 3 Devotion, once a scene) [lumeri_templar] | One attack dealing damage × (1 + Blessing power). |

## 4. Shelved for the advanced rethink (48 moves)

Kept in the engine, tested, unlearnable. Suggested attribute pair in brackets, to start the rethink.

- **Fully absorbed (nothing shelved):** Gunslinger (into Marksman), Lumeri Templar (into Guardian).
- **Partly absorbed:** CCEC Ballistician (One Shot) [Perception + Agility]; Banner Dancer (Banner Thread, Rally Banner)
  [Agility + Insight]; Siege Engineer (Sentry Turret) [Endurance + Expression]; Adamantile Knight (Adamantile Plate,
  Bulwark of Will) [Endurance + Virtue]; Shade (Nightmare Mark) [Perception + Determination]; Grand Sigilist (Enlarge,
  Earthed) [Intelligence + Endurance].
- **Whole:** Hellraiser Heavy [Agility + Endurance], RTC Contractor [Virtue + Perception], Blade Scribe [Strength +
  Intelligence], Spellslinger [Agility + Intelligence], Storm Hand [Strength + Determination], Stroke Gambler
  [Intelligence + Expression], Devoted [Determination + Insight], Circuit Mage [Intelligence + Insight], Glyph Mason
  [Expression + Endurance], Heartfed [Determination + Strength], Heartbinder [Insight + Endurance], Vessel [Determination
  + Endurance], Twinbound [Determination + Expression].
- Collisions to settle then: Glyph Mason, Heartbinder and Vessel all lean on Endurance; the 36-pair grid has room.

## 5. What changes, and what it costs

- **Engine:** class from the highest attribute; rank from that attribute; a class's move list may name an old move id
  (one function, `classMove`); resources follow their moves (`CLASS_RES`); advanced learning returns "shelved".
- **Saves:** old classes map to new ones (medic → bard, scribe → mage, warden → trickster, hexer → channeler; the rest
  keep their id). A character with an advanced class **keeps it working** (grandfathered); nobody new can learn one.
- **Data and spec:** the Classes section and classes.json rewritten; signature skills replaced by the attribute.
- **UI:** level-up picker and class panel; the 34 emblems are reused.
- **Narrator: lighter.** 9 classes to know instead of 34; no tutors to place.
- **Tests:** eligibility and rank tests rewritten; every move test stays as it is.

## 6. Flags for Leon

1. **Ranks at attribute 5 and 8** (provisional). With 10 attribute points at creation, a focused build reaches rank II
   early; rank III needs the core at 8.
2. **Switching class** at a level-up when your highest attribute changes: yes (my pick) or fixed at level 3?
3. **Sweep** keeps its "each ally you pass heals 10", a Banner Dancer leftover on a Fighter. Keep, or drop the heal?
4. **The Bard's rank III is quiet in combat** (Field Surgery and Gift both work out of combat). Swap Gift for Rally
   Banner (a per-scene shield banner) if you want a combat capstone.
5. **Proficiency (the mechanic) has no move** in the Assassin: the only tinker moves (Inscribe Gear, Sentry Turret) need
   Sigil charge. A mechanic move is a gap for a new move or for the advanced rethink.
6. **Names:** keep all nine, or rename (for example Assassin → Infiltrator, Guardian → Templar, Bard → Heart).
7. **Two moves per rank** doubles what a class gives. If that's too much at level 3, rank I can give one move and the
   second at rank I½ (attribute 3).
