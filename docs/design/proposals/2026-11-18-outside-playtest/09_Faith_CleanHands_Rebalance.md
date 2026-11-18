# Faith / Clean Hands / Mercy Rebalance (v0.31.10) Playtest Report
Room Code: `ZV6PPU` (Seed: `PHC-KM1PNT`, Mode: Survival) · Character: **Sister Mercy** (`04 · Lumeri cloisters`, VIR 7 / END 3 / INS 3, Faith 7, Conscience 3, Patron: **Holy Father Nerukhan**).

### 1. Exact Verified Rules & Numbers: Clean Hands, Conscience, Saint's Shield & Faith
- **Clean Hands I (Passive, Conscience 3+):**
  > *"Up to 2 times a fight, when you spare an enemy or protect an innocent, you gain a shield worth **15% of your max HP**; a new one **does not add to a shield you hold (the larger stands)**. To spare an enemy, attack with Spare on: a blow that would take its last HP subdues it instead. Outside a fight, the Narrator decides what counts."*
- **Clean Hands II (Passive, Conscience 5+):**
  > *"Up to 2 times a fight, when you spare an enemy or protect an innocent, you gain a shield worth **25% of your max HP**; a new one **does not add to a shield you hold (the larger stands)**."*
- **Key Rebalance Takeaways:**
  1. **Hard Cap Per Fight:** Capped at **up to 2 times a fight**.
  2. **Non-Stacking Shield Rule ("the larger stands"):** A newly triggered Clean Hands shield **does not stack/add** onto an existing shield you already hold (`max(current_shield, new_shield)` applies). This completely solves the pre-patch invulnerability loop where sparing enemies stacked additive +24–29 shields on top of *Saint's Shield*.
  3. **Conscience Cross-Scaling ("Feeds Faith"):** `+10% to every shield you are given` per point (`×1.3` at Conscience 3) and **`+7% to the shields your prayers give`** per point (`+21%` at Conscience 3).

### 2. UX / Balance Issues Found
1. **"Mercy" Vow Offered in 100% Drone Fights:** In Fight 1 (*A swarm*, 3× robotic Mite drones), the Round 1 **Swear a Vow** banner still offered **`Mercy ("I spare who yields")`** as the second vow button despite all foes in the encounter being mechanical Mite drones.
2. **Archetype Sidebar Button Occlusion (`step 2 Archetype`):** The `"Use Prophet ›"` button at the bottom of the right-hand preview sidebar is partially overlapped by the sticky bottom navigation bar (`footer.phc-cc-foot`).
3. **Perk Selection Timing in Character Creation vs. Camp:** Placing 7 points in Faith and 3 in Conscience creates 4 unspent Perk Steps (`Clean Hands`, `Unbroken Litany I & II`, `Sinner's Due I`), which are only accessible by clicking `"Level up · pick a perk"` on the character sheet after entering the Camp.
