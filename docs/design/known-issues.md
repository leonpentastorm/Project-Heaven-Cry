# Known issues to come back to

Found while doing other work and deliberately left alone. Each has where it was found. Add to the bottom; strike a line through when fixed, with the commit.

## Data that disagrees with the spec or the engine

1. **Will Power's Soul multiplier.** `data/skills.json` says +15% a point; the spec and the engine say 10%. (Nine doors draft, 10 Nov 2026.)
2. **The elemental multiplier.** The spec has 1 + 0.2 × (Expression − 1) + 0.1 × Visualization; the engine and the skill data use other figures. (Same.)
3. **Empathy's per-point line** in `data/skills.json` ("−0.5 AP Soul cast cost") is stale: the spec and the engine have a flat cost with free Pumps. (Same.)
4. **Threaten** sets Shaken, a Heart condition, but is saved with the Body save. (Same.)
5. **Five heavy weapons cost 2 AP an attack** in `data/weapons.json` (war axe, greatsword, glaive, rip-saw, servo-fist); the spec says heavy melee costs 3. (Melee techniques proposal, section 5.)
6. **Southern Fist:** its text and what the engine does differ. (First-read review, `docs/reviews/2026-11-PHC-review-fable.md`.)

## Rules that break alpha, beta, gamma (spec item 953)

7. **Eight Mastery unlocks on the wrong slot:** Tuned (Proficiency), Weak Point (Analysis), Proven Formula (Rumination), Paint the Field (Visualization), Hand-Off (Camaraderie), Second Wind (Durability), Stand Still (Composure), and the Soul module gates on Lore Master, Implication and Composure. (Nine doors, section 9.5.)
8. **Gear gated by a beta or an alpha the wrong way round:** the servo-fist and core rifle (Proficiency), the bot-thread banner (Camaraderie), heavy armour (Durability). (Nine doors, section 6.)

## Engine

9. **Enemies with loose-loaded weapons never reload.** (Physical 2.0 code map.)
10. **Mana-category melee weapons** (Evoker blade, banner, grand staff, Emanator gauntlet) are a ranged 'shot' through the old plain attack; only techniques treat them as melee. Goes away when the plain attack row becomes Cut at integration. (Foundation review.)
11. **Draw Cut** doesn't check that the weapon was stowed at the start of the turn, only that it is stowed now. A Hot-Swap loop was suggested and not checked. (Second review; spec item 952.)
12. **A Marksman's Fire Discipline** takes Heat off aimed shots, so a card with several aimed strikes could show a jam that wouldn't happen. (Second review.)
13. **Fire Discipline's once-a-turn 2 AP burst** must be spent by the Burst technique's first round, or every Burst in a turn is priced at 2 AP. For whoever builds Burst. (First review.)

## Docs

14. `docs/HANDOFF.md` and `docs/ROADMAP.md` still say v0.0.1 in their titles.
15. **Tri-scale armour** is not in the 2020 files in the repo; the nine doors proposal has stand-in sketches.
16. **The Visualizer** is not named in the 2020 files in the repo (the EPCCG says "Projector Gear®"); the proposal uses Leon's name.
