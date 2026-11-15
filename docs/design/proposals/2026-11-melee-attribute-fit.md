# Melee damage from Strength or Agility: the fit (release 0.29, lane L6)

Rules 1.56 (Balance 2.0), L6; build plan 0.29 section 10, items B1 and B2. Leon, 15 Nov 2026: *"melee get dmg increase
from strengh attribute, small blandes and weapon that feels like it need finesse is from agility. guns comes from the gun
and the ammo"*. Every number here is PROVISIONAL; the lead fits in P3.

## What was built

- **No new code path.** The weapon multiplier (`character.ts weaponMult`) already read each weapon's `phys.scales_with`
  Attribute through a damage profile (`effects/output.ts statOf`); the profile it read was always `weapon` (no slope
  since rules 1.26). A weapon row now names its profile (`weapons.json phys.profile`; absent: `weapon`). One new profile
  in data, `rules.json output.profiles.melee`: k 1.15385, attr 0.05, skill 0, Level `deal`, shape `struck`.
- **Which Attribute** is the row's existing `phys.scales_with` (already Strength for heavy melee and the fists, Agility
  for the light and thrown blades). Nothing typed in code.
- **The bases are not lowered.** The brief asked for each melee base to come down so the all-in build stays put; the
  profile's k does the same thing in one number (k x (1 + 0.05 x 6) = 1.5, the weapon profile's k), and lowering the
  bases would also have weakened the enemies that carry a sabre, a combat knife or fists (they read the base with their
  tier and level, not the profile). Same result for characters, nothing moved for enemies.
- **Guns, bows, thrown charges, foci:** no profile, no slope; the validator refuses a slope on a non-melee weapon.
- The weapon card's "Damage scales with" line now shows on every melee weapon, naming its Attribute only.

## The finesse list (for the lead to rule)

- **Agility:** combat knife, sabre, throwing knives, hatchet, Legion gladius, Kemizuchi duelling blade, katana.
- **Strength:** Ork machete, maul, lance, war axe, Adamantile greatsword, glaive, Ork rip-saw, fists, knuckledusters,
  Hellraiser servo-fist.
- **Not scaled (they are foci, "foci: nothing from the user"):** Evoker blade, Emanator gauntlet, Emanator katana,
  bot-thread banner, grand staff. Companion bites and claws (beast bite, Figment claws and edge) are not a character's.
- Open: the hatchet (light, edge, hook, thrown) is Agility by the "anything thrown" rule, though a chopper reads as
  Strength; the gun butt and the bayonet blow strike as fists, so they now scale with Strength.

## The measure (MELEE_MEASURE, masterwork, 8 fights a cell, levels 1 / 6 / 12, the optimised policy, the walk counted)

Percent of the plain rifle a turn. The builds' Attribute: heavy (Strength) normal 4 / 7 / 9, all in 7 / 9 / 10;
finesse (Agility) normal 5 / 6 / 9, all in 7 / 9 / 10 (levels 1 / 6 / 12). The multiplier column is exact (after ÷
before for that Attribute); the Attribute 1 and 4 columns at level 1 are the all-in level-1 row times it (the same
build with only the Attribute changed: an estimate, the hit chance unchanged).

| Weapon | Attribute | x at 1 / 4 / 7 / 10 (after ÷ before) | All in L1 (Attr 7) before → after | Attr 1 at L1 (estimate) | Attr 4 at L1 (estimate) | Normal L1 before → after | Normal L6 before → after | Normal L12 before → after | All in L6 before → after | All in L12 before → after |
|---|---|---|---|---|---|---|---|---|---|---|
| Combat knife | Agility | 0.769 / 0.885 / 1.000 / 1.115 | 99 → 99 | 76 | 88 | 84 → 77 | 82 → 78 | 77 → 85 | 97 → 106 | 91 → 103 |
| Sabre | Agility | 0.769 / 0.885 / 1.000 / 1.115 | 168 → 168 | 129 | 149 | 126 → 116 | 152 → 146 | 166 → 180 | 180 → 195 | 188 → 211 |
| Ork machete | Strength | 0.769 / 0.885 / 1.000 / 1.115 | 111 → 111 | 85 | 98 | 120 → 105 | 138 → 138 | 148 → 160 | 128 → 138 | 130 → 146 |
| Maul | Strength | 0.769 / 0.885 / 1.000 / 1.115 | 152 → 152 | 117 | 134 | 164 → 143 | 162 → 162 | 208 → 226 | 153 → 166 | 172 → 193 |
| Lance | Strength | 0.769 / 0.885 / 1.000 / 1.115 | 126 → 126 | 97 | 111 | 113 → 99 | 111 → 111 | 114 → 124 | 123 → 133 | 112 → 126 |
| Throwing knives | Agility | 0.769 / 0.885 / 1.000 / 1.115 | 66 → 66 | 51 | 58 | 55 → 49 | 61 → 57 | 65 → 71 | 75 → 83 | 70 → 81 |
| Hatchet | Agility | 0.769 / 0.885 / 1.000 / 1.115 | 134 → 134 | 103 | 119 | 96 → 89 | 113 → 108 | 131 → 142 | 149 → 162 | 158 → 177 |
| Legion gladius | Agility | 0.769 / 0.885 / 1.000 / 1.115 | 179 → 179 | 138 | 158 | 125 → 114 | 147 → 141 | 135 → 146 | 165 → 179 | 156 → 175 |
| Kemizuchi duelling blade | Agility | 0.769 / 0.885 / 1.000 / 1.115 | 152 → 152 | 117 | 134 | 131 → 119 | 139 → 134 | 138 → 150 | 158 → 171 | 163 → 184 |
| Katana | Agility | 0.769 / 0.885 / 1.000 / 1.115 | 181 → 181 | 139 | 160 | 147 → 136 | 140 → 133 | 177 → 192 | 176 → 191 | 178 → 200 |
| War axe | Strength | 0.769 / 0.885 / 1.000 / 1.115 | 139 → 139 | 107 | 123 | 123 → 108 | 149 → 149 | 152 → 164 | 139 → 150 | 137 → 153 |
| Adamantile greatsword | Strength | 0.769 / 0.885 / 1.000 / 1.115 | 146 → 146 | 112 | 129 | 138 → 121 | 149 → 149 | 178 → 193 | 155 → 167 | 150 → 168 |
| Glaive | Strength | 0.769 / 0.885 / 1.000 / 1.115 | 122 → 122 | 94 | 108 | 106 → 94 | 127 → 127 | 147 → 159 | 138 → 150 | 125 → 141 |
| Ork rip-saw | Strength | 0.769 / 0.885 / 1.000 / 1.115 | 146 → 146 | 112 | 129 | 122 → 109 | 133 → 133 | 169 → 182 | 139 → 149 | 129 → 143 |
| Knuckledusters | Strength | 0.769 / 0.885 / 1.000 / 1.115 | 76 → 76 | 58 | 67 | 71 → 61 | 63 → 63 | 85 → 92 | 82 → 89 | 86 → 97 |
| Hellraiser servo-fist | Strength | 0.769 / 0.885 / 1.000 / 1.115 | 128 → 128 | 98 | 113 | 122 → 107 | 116 → 116 | 139 → 150 | 128 → 139 | 129 → 145 |

**Reading.** The all-in build at creation (Attribute 7) is unchanged to the point. A low Attribute is weaker than
before (x0.77 at 1, x0.88 at 4: the normal share at level 1 loses 7 to 15 points). The slope then lifts every row as
the Attribute climbs past 7 with levels: all in at level 12 (Attribute 10) is +11.5% (the sabre 188 → 211, the katana
178 → 200, the maul 172 → 193); the normal share at level 12 (Attribute 9) is +8%. `npm run balance` (the contract) is
green. For P3: if the high-level rise is too much against the 165 melee line, the dials are `output.profiles.melee.attr`
(the slope) and `.k` (where Attribute 7 sits); fitting k to Attribute 10 instead would cost level 1 about 10%.

## The baseline's odd rows (traced through the reducer, niche-measure cells, level 1, normal share, 4 fights)

1. **Hellraiser servo-fist, 10% next to the target: a measuring fault.** Its grant ("a plain attack that hits pushes
   the target 2 tiles away") pushes the target out of reach on the first hit, and the "next to it" cell holds the
   attacker where it stands: 4 attacks in 4 fights, 184 AP unspent. Walking in it reads 132 to 146%. Not a weakness;
   the held cell cannot measure a knockback weapon.
2. **Combat knife, hatchet, throwing knives, 11 to 35% walking in from 6: a real weakness of the policy and the AI,
   not of the numbers.** In every fight the optimised policy throws the weapon once on the way in (Throw scores 4 at
   range), the weapon sticks in the target, and the rest of the fight is fists (about 85 fist cuts in 4 fights, 0 Pull
   Outs): Pull Out's AI score is 0 (`physical/melee/strikes-b.ts`, `ai: () => 0`), so neither the simulator nor an
   enemy ever pulls a weapon back. Next to the target the same weapons read 44 to 87 a turn (61 to 122%). A player
   would Pull Out (now offered only then, rules 1.56). The fix is a Pull Out AI score next to a stuck weapon (moves
   enemy behaviour and the replay hashes: not done here, for the lead), or the policy not throwing its only weapon.
