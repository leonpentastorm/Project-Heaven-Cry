# Playtest fixes, second list (Leon, 10 to 11 Nov 2026): the items that need a ruling

The bugs on the list are fixed in code (see the changelog). These four are design changes: each has one draft, with
its numbers flagged provisional until Leon says yes.

## 1. Speaking in a fight does nothing

**Today.** "Say or attempt something" in a fight, and every perk with a text box, writes a line in the log. The Narrator reads it only
after the fight is over. Nothing happens in the fight.

**Draft: the Narrator answers inside the fight.**

1. Words in a fight go to the Narrator at once (the AI Narrator on the host's key; a human Narrator gets them on the
   Narrator screen and the fight waits for them).
2. The Narrator answers with one or two lines in the log, and may ask the engine for exactly one of these, nothing
   else: a check by the speaker (the engine rolls it against the TN the Narrator sets); one condition on one unit for
   one round from a fixed list (Shaken, Taunted, lowers its weapon, hesitates: −1 AP); one enemy surrenders (only
   below half HP, or on a check); a yes or no on a perk's use (a no gives the use back).
3. The Narrator can never deal damage, heal, move a unit or change AP beyond that −1. The engine keeps every number.
4. Price: plain speech is free and gets a line back but no effect. An **attempt** (anything that wants an effect)
   costs 1 AP. A perk costs what its card says. One attempt a turn for each player, so a fight can't be talked to a
   standstill and the host's key isn't drained.
5. No Narrator connected: the box says so and takes no AP.

*Provisional numbers:* 1 AP for an attempt; one a turn; the four effects and their one round.

## 2. Overdraw (Will Power 3)

**Today.** Once a fight, one Pump adds 2 stages instead of 1, and costs 1 Strain. It saves 1 AP once a fight and the
Strain can burn for 8.

**Draft.** **Once a turn**, a Pump adds 2 stages instead of 1. The first Overdraw of a fight costs no Strain; each
one after it costs 1. So it is a real choice every turn: reach stage 4 a turn sooner and pay with the heart.

*Provisional:* once a turn; free the first time, then 1 Strain.

## 3. Heart Overload and Resonance (the two Will Power perks)

**Today.** Heart Overload pays a Begin with HP at 2 HP a point of mana (1 at tier II), and blood can't heal or shield.
Resonance counts an ally's Release toward your Resonance bonus. Both only matter in narrow cases: an empty mana bar,
or two Soul casters in the squad.

**Draft: Heart Overload becomes the perk that keeps the heart beating.**
- **I:** once a turn, after you Release an Outburst at stage 2 or higher, you may Begin the same design again at once
  for 0 AP (you pay its mana and Strain as usual).
- **II:** it Begins at stage 1.
- The old effect stays as a rider on both tiers: if you can't pay the mana for that free Begin, you may pay it in HP
  at 1 HP a point.

**Draft: Resonance becomes your own echo.**
- **I:** each Outburst you Release makes your next Release in this fight 10% stronger, up to +20%. The bonus is spent
  when you end a turn without holding or releasing an Outburst.
- **II:** up to +30%, and an ally's Release in your sight adds to it too (the old effect, as the tier II rider).

Against the balance targets: Outburst is meant to be 125% of a plain weapon, steady. These two are the "optimised"
part of a Soul build, so they are measured with it in the balance pass and their numbers move there.

*Provisional:* stage 2 for the free Begin; 10% a step; the +20% and +30% ceilings.

## 4. The perk card in a fight

**Today.** The Perks tab lists every perk and trait with a button. Some buttons do something, some are passives that
do nothing when pressed, some belong to an attack and can't be used from there, and the ones the Narrator runs wait
until after the fight. Since 0.18.0 the toggles that ride an attack (Ricochet, Spare, Nonlethal, the class toggles)
were missing altogether; that part is fixed in 0.19.1.

**Draft: three shelves, and nothing on the card that can't be used.**
1. **Use now:** perks with an action. AP, uses left, and a greyed reason when it can't be used.
2. **Rides an action:** perks that change an attack, a move, a Pump or a Begin. They are not buttons here; each shows
   as a switch on the action it rides, and this shelf only lists them with "on your attacks", "on your Pumps".
3. **Always on:** passives, each with a live line: ready, used this fight, waiting for its trigger, or what it last
   did ("Used to the Pain: −25% on the next hit").
4. Perks that only matter in the story are not on the fight's card at all.
5. Before the layout changes, **an audit**: all 106 perks and 74 traits used once each in a fight by a script, with
   what the card said against what the engine did. Everything that lies or does nothing gets fixed or moved to the
   right shelf. The audit's table goes to Leon.
