# Wording replacements, pass 2 (the lead, 18 Nov 2026, eight more screens)

Continues `2026-11-18-wording-replacements.md` (same format and rules). Screens read from live 0.31.10.

## 6. Fight, PERKS tab (pgl-perks-tab.png)

| Now | Write | Where |
| --- | --- | --- |
| Overdraw: a six-line paragraph starting "No button here. Its switch..." | "Overdraw · once a turn" / "A Pump adds 2 stages. +1 Strain after the first." | the unlock text in data/skills.json (will_power); the PERKS shelf row |
| The same paragraph again in the box below, ending "Nothing to confirm: this one is here to read." | delete: selecting a passive opens no second box | apps/web/src/screens/combat.js perks shelf preview |
| "The Twin Pays, on Begin · 1/1 combat" | "The Twin Pays · once a fight" | same |
| Turn order: "Unseen hostile / NEXT · INIT / UNHURT" three times | one chip: "3 unseen" | turn order strip |
| "AP 6 · Movement 2 · Stims 3" and "REACTION" on its own line | one line: "AP 6 · Move 2 · Stims 3 · Reaction" | You card |
| "AMMO 6 / 6 loaded · 3 spare speedloaders" | "AMMO 6 / 6 · 3 spare" | apps/web/src/game/resources.ts |

## 7. Level-up screen (pgl-levelup-1440.png)

| Now | Write | Where |
| --- | --- | --- |
| The three-line rules paragraph under TO SPEND ("A skill can't be higher than the attribute above it...") | off the face; behind a "?" beside TO SPEND | apps/web/src/templates/levelup.template.html |
| Legend row "TIER I / II yours · Take a step is waiting · LOCKED until the next step · the Mastered perk" | delete | same |
| "Recruit grows" | "Level 9" | header |
| "Back to the story (finish later)" | "Finish later" | header |
| Skill card: eleven lines of "Next point (1): ..." | the one card line from pass 1's table; the full ladder is in "?" | shared.js nextLine; skills.json short |
| "Next point (5): +15 max HP, +10% chance to ignore an injury." / "Its skills go up to 4." | "+15 max HP · +10% to ignore an injury" / "Skills up to 4" | attribute cards |
| "DEXTERITY · FORKS · 1 STILL TO DO" then "DEXTERITY 4 · CHOOSE ONE · STILL TO DO" | "Fork at 4: choose one" (once) | apps/web/src/game/forkView.ts |
| Fork option paragraph ("Each ally's hit rolled with Dexterity (a gun, a bow, a throw...") | one line per option, e.g. "Converging Fire: allies' Dexterity hits on a foe you hit add +1 Pressure" | data/forks.json texts |
| Fire Discipline: five lines | "Aimed: +1 to hit, no Heat · Once a turn: a 3+ AP technique costs 1 less" | data/classes.json move texts (all nine classes get the same cut) |
| Hold the Lane: "Your held shots (Overwatch, Deny, Cover Me, Dead to Rights) cost 1 AP less, never less than 1 AP." | "Held shots cost 1 AP less (min 1)" | same |
| "MOVES · RANK II AT AGILITY 5 AND LEVEL 6, RANK III AT 8 AND LEVEL 12" | delete: each rank header below says it | class panel |
| "Rank II at Agility 5 · 1 to go and level 6" | "Rank II: Agility 5 (1 to go)" | same |

## 8. Survival shop (shop-1920.png) and Forge (forge-1920.png)

| Now | Write | Where |
| --- | --- | --- |
| "You can buy this" under every card | delete; show a line only when you cannot, with the reason | apps/web/src/game/ShopScreen.tsx |
| "Decrkm SMG (.32 Decrkm) magazine (empty)" plus rows Rounds / Calibre / Used by 8 guns | "SMG magazine, empty" / ".32 Decrkm · fits 8 guns" | item names; card rows |
| "20 CREDITS · 20 ROUNDS" | "20 cr for 20" | card |
| Forge: "STANDARD TO FINE" / "In your hand · 300 less than a shop" | "Standard → Fine" / "In hand" | run/progress.ts upgrade option detail |
| "To hit 40% → 45% ▲ better" / "Durability 300 → 375 ▲ better" | "To hit 40 → 45%" / "Durability 300 → 375" | Forge card |
| "You can upgrade it" | delete | Forge card |
| "Masterwork upgrades open in stage 2." | "Opens in stage 2" | run/progress.ts upgradeProblem |
| "Upgrade / One upgrade per visit" | "Upgrade · 1 a visit" | Forge header |
| Give panel, solo: big "Give" title and "No one to hand anything to." | hide the panel when solo and nothing is usable | apps/web/src/game/GiveTab.tsx |
| "Crack it with a focus in a hand: an Evoker, an Emanator, a Visualizer or an Attuner." | "Needs a focus in hand" | GiveTab use reason |
| Sheet: "ENDURANCE / its skills can reach 5 / 5" | "ENDURANCE 5" | sheet SKILLS tab |
| "MP / no MP focus" | "MP —" | sheet rows |

## 9. Reward panel (reward-panel-1600.png) and boon pick (survival-boon-pick-1280.png)

| Now | Write | Where |
| --- | --- | --- |
| Seven headings for one choice: "SURVIVAL · A SWARM", "Rewards / Won in 2 rounds", "YOUR PAY", "KADE LEVEL 1", "YOUR PICK", "YOUR PICK · KADE", "MATERIALS / For making" | "A Swarm · won in 2 rounds" / "+35 XP · +100 credits" / "Pick one:" then the cards | apps/web/src/game/RewardPanel.tsx, rewardCards.tsx |
| "+35 now 35 XP" / "+100 now 180" | "+35 XP" / "+100 cr" | same |
| "Level up waiting: open Level up on your sheet" | a button: "Level up" | same |
| "Sells for 2 credits" | delete | reward card |
| "Take the materials" | "Take" | reward card |
| Boon: "Uses 5 boon room · 41 left after" | "Room 5" | apps/web/src/game/RunScreen.tsx boon cards |
| "YOUR BOON · KADE · BOON ROOM 46 left" | "Boon room 46" | same |
| "Pick a boon for the rest of the run / STAGE 1 CLEARED" | "Stage 1 cleared: pick a boon" | same |
| "Kade takes the materials: 95 × Gunpowder, 95 × Casing, 11 × Mana residue." | "+95 Gunpowder · +95 Casing · +11 Residue" | run note text |

## 10. FAITH tab (faith-tab.png)

Every prayer card is a paragraph. One line each; the number is the engine's own value for this character.

| Now | Write | Where |
| --- | --- | --- |
| "Luck 1 AP · ANYONE · SURE / You or an ally you can see gets +2 on their next attack roll or check." | "Luck · 1 AP" / "+2 on the next roll" | data/patrons.json and whisper texts (short) |
| "Health ... heals 8.5 × your Blessing power. The heal grows with your level, like all healing and shields from prayer." | "Health · 1 AP" / "Heal 20" | same; read the engine's preview value |
| "Protection ... gains a shield of 10 × your Blessing power..." | "Protection · 1 AP" / "Shield 20" | same |
| "Courage / Ends Fear and Shaken on you or an ally you can see." | "Courage · 1 AP" / "Ends Fear and Shaken" | same |
| "Guidance / Reveals Hidden enemies and traps within 6 tiles of you, and gives you +2 on your next roll to spot something." | "Guidance · 1 AP" / "Reveals Hidden, 6 tiles" | same |
| "Safe Passage / Your next move this turn provokes no opportunity attacks." | "Safe Passage · 1 AP" / "Next move: no opportunity attacks" | same |
| "Rebuke / An enemy you can see takes 20 Soul damage × your Blessing power. There is no roll, and armour doesn't lower it. In the story, the Narrator rules where it lands." | "Rebuke · 1 AP" / "27 Soul · no roll" | same |
| "Warm Hands / 3 AP · HYMN I · DEVOTION 3 · SURE / ... heals 28 × your Blessing power..." | "Warm Hands · 3 AP" / "Heal 66" | same |
| "ANYONE · SURE" on every card | delete; show "roll 12" only where a roll happens | faith card chips |
| "LIKED TAGS · 0/2 THIS SCENE · 0/6 THIS SESSION" | "Favour 0 / 2" | faith panel |
| "PRAY · THE STORY · WHISPERS" / "HYMNS · EVERY 5 ROUNDS · READY" | "WHISPERS" / "HYMNS · ready" | faith panel |
| "Overreach: TN 16 · a miss costs 3 Devotion XP" | "Overreach: roll 16 or lose 3 Devotion" | faith panel |
| Story composer: a row of greyed perk chips ("Field Surgery: treat an injury...", "Snap · 1/1 turn") | hide chips that cannot be used here | story composer |

## 11. The camp (survival-camp-1280.png)

| Now | Write | Where |
| --- | --- | --- |
| "Before the run: take one free weapon and spend your budget on anything else." | delete: the three steps under it say it | apps/web/src/game/LoadoutScreen.tsx |
| "used 220 · what you don't spend, you keep" | "Unspent credits stay with you" | same |
| Card tags "ANOTHER ONE" / "THE BETTER ONE" | "FREE" on the free pick, nothing on the rest | same |
| "Hits with / Dexterity · −2" and "Damage / Agility · −23%" | "To hit −2 (Dexterity)" / "Damage −23% (Agility)" | gear card rows (gearpreview.ts skillLines) |
| "Over the budget by 170 credits (470 of 300)." | "170 over budget" | camp option reason |
| "You can take this" | delete | same |
| Sheet button "Level up · pick a perk" | "Level up" | sheet header |

## 12. Seen on several screens (fix once)

1. The NOW PLAYING toast covers the left panel on every screen: move it to the bottom-right of the middle column, 4 s.
2. "You can ..." confirmation lines: delete everywhere; speak only when the answer is no.
3. A heading that repeats its parent ("YOUR PICK" then "YOUR PICK · KADE"): one heading.
4. "× your Blessing power", "grows with your level": the card shows the engine's number for this character.
5. Class moves, fork options, perks, unlocks: one line each on the face; the full rule behind "?".

## Still not read

The sheet's SKILLS ladder open, GEAR, ARMS, STATUS; the Outburst designer (the Damage paragraph); the Shadow,
Tending and Figments fight tabs with a tooltip; token hover cards; rest and Training; shrine; Crossroads; the run
summary; creation's Identity, Archetype, Traits, Belief, Moves, Lock in.
