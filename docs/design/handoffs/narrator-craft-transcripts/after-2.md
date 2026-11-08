# Narrator craft playtest: After, second pass (the iteration: recaps reworded as openers, tics, length, closing hooks)

Model claude-opus-5-5, effort medium. M813, seed "narrator-craft", room LIVE13, two scripted players (MPAT and Rook), the same player script in every run (apps/web/src/narrator/live-playtest.test.ts). Total cost $0.94. Machine-readable: after-2.json.

## Turn 1 (opening) · $0.305

**Since the last narration:**

- [system] Session 1 begins.
- [system] ▶ Mission: The Shield Line · Get the wounded line to the rear pad before the last ship leaves.

**Narration:**

> The last shell lands somewhere north and nobody answers it.
>
> Then nothing. No rotary whine, no tracer, no enemy drums. Smoke lies flat over no-man's-land, and through it the black hole climbs above the stakes: a hole in the sky ringed with a thin bleeding light, so heavy it bends the dusk around it. Your optics adjust. The field holds still for the first time in nineteen hours.
>
> Behind you, in a row that runs past J7, twenty-three infantry robots lie where you dragged them. One is counting out loud: "Two thousand and six. Two thousand and seven." One is humming a tune with no words. One lies with both hands pressed flat over its own chest plate.
>
> The squad channel clicks. A voice box full of grit, from the stakes at H5:
>
> "Two-five-eight. Medics. This is Nine-Nine. The line held." A crackle, then what might be a laugh. "Humans are boarding the last ship on the rear pad. Engines are warm. I can hear them through the ground. Come here. Both of you. I'm not going anywhere, which is the point of this conversation."
>
> Far east, a low turbine note rises and stays up.
>
> "Before you come, look down that row and do the arithmetic. How many of us can you carry?"

**Turn fields:**

- sceneTitle: `"The Guns Stop"`
- npcs: `[{"action": "place", "name": "Seven-Seven", "at": "I7", "side": "neutral", "tier": "minion", "weapon": "fists", "kind": "robot"}, {"action": "place", "name": "Hum", "at": "J8", "side": "neutral", "tier": "minion", "weapon": "fists", "kind": "robot"}, {"action": "place", "name": "Lantern", "at": "K7", "side": "neutral", "tier": "minion", "weapon": "fists", "kind": "robot"}]`
- hooks: 5

Map after: Seven-Seven I7 (neutral), Hum J8 (neutral), Lantern K7 (neutral); party MPAT I4, Rook I5. Mission: the_shield_line: reach_nine_nine=open, tend_the_line=open, first_fight=open, who_stays=open, carry_east=open.

## Turn 2 (round) · $0.064

**Since the last narration:**

- [art] "How many of us can you carry?"
- [system] Seven-Seven at I7.
- [system] Hum at J8.
- [system] Lantern at K7.
- [MPAT] I head for the stake line. "Sergeant. Medics of the 258th, reporting. What do you need?"
- [system] Rook moves to J6 (1 tile, 1 AP).
- [Rook] I go to the row of broken infantry behind the stakes and listen to who is still making noise.

**Narration:**

> Up close, Nine-Nine is less than the voice promised: a torso, one shoulder, a jaw plate hanging by a cable, wedged so deep in the stakes that the stakes are the only thing holding him up. His one optic tracks MPAT and brightens a notch.
>
> "Report received. Here's mine. Hundred and twenty of us held. Twenty-seven still talking, me included, and I'm the one you leave." A dry click. "Don't argue, medic, that's an order and I'm still the rank out here. Orders: sort that line behind you. Who walks, who you carry, who's parts. Hands and eyes on every one. Then come back and tell me a number."
>
> Behind the stakes, Rook's audio sorts the row the way a medic's should. Seven-Seven, near I7: "Two thousand and forty." Hum at J8, the same four notes, looping. Lantern, beside the line's middle, ticking faintly where its fingers press the chest seam. Most of the others are silent, cooling. And from the north, from the shell crater past J2, something no one dragged here: a thin voice under shifting dirt, calling a squad number, then "Hello?"
>
> Seven-Seven's count stops. "Two thousand and forty-one. Medic. Is that one ours?"

**Turn fields:**

- missions: `[{"mission": "the_shield_line", "objective": "reach_nine_nine", "status": "done", "note": "MPAT reported; Nine-Nine ordered the line sorted."}]`
- hooks: 6

Map after: Seven-Seven I7 (neutral), Hum J8 (neutral), Lantern K7 (neutral); party MPAT I4, Rook J6. Mission: the_shield_line: reach_nine_nine=done, tend_the_line=open, first_fight=open, who_stays=open, carry_east=open.

## Turn 3 (round) · $0.072

**Since the last narration:**

- [xp] MPAT +50 XP (quest: Reported to Sergeant Nine-Nine on the stake line)
- [xp] Rook +50 XP (quest: Reported to Sergeant Nine-Nine on the stake line)
- [system] ✓ Objective: Report to Sergeant Nine-Nine in the stake line · MPAT reported; Nine-Nine ordered the line sorted.
- [MPAT] MPAT examines the sergeant nine-nine at H5 [m12].
- [MPAT] "Before we talk numbers, Sergeant, let me look at you." I check his leaks.
- [Rook] Rook examines the the triage line at J7 [m13].
- [Rook] I kneel by the one that is counting out loud. "Hey. What are you counting?"

**Narration:**

> Nine-Nine's coolant runs where MPAT's hand finds it: warm, sweet-smelling, threading out of a split line under his collar and pooling in the stake's scorch marks. More of it than a torso should still hold.
>
> "You're spending a clamp on a fencepost," he says. His optic dims, steadies. "If I had an arm, I'd fix myself and you could go. Factory never saw the point. Go on, then. Quick hands."
>
> Behind the stakes, Seven-Seven turns its head toward Rook with a grind of neck servos. "Seconds. Since the Colonel said hold." Its fingers tap the dirt in time. "Two thousand and ninety. Stop counting, and you're just lying here." Then the voice from the crater calls again, the squad number clearer now, and the tapping stops dead.
>
> "That's Four-squad," Seven-Seven says. "That's Dace. I watched the shell take Dace." It grips Rook's wrist. "Two thousand and ninety-four. Is it Dace?"

**Turn fields:**

- checks: `[{"charId": "c2", "skills": ["proficiency", "sensory"], "tn": 8, "stakes": "Clamp Nine-Nine's split coolant line and buy him hours; fail and the clamp slips, costing coolant and time."}]`
- hooks: 5

Map after: Seven-Seven I7 (neutral), Hum J8 (neutral), Lantern K7 (neutral); party MPAT I4, Rook J6. Mission: the_shield_line: reach_nine_nine=done, tend_the_line=open, first_fight=open, who_stays=open, carry_east=open.

## Turn 4 (results) · $0.062

**Since the last narration:**

- [check] PROFICIENCY + SENSORY · d20 9 +3 = 12 vs 8 · ✓ SUCCESS — MPAT: Clamp Nine-Nine's split coolant line and buy him hours; fail and the clamp slips, costing coolant and time.

**The craft checks told the Narrator:**

- OPENINGS YOU KEEP USING (start differently): "behind the…"

**Narration:**

> The clamp bites on the second turn. The thread of coolant thins, beads, stops. Under MPAT's palm the collar housing goes from warm to cool, and Nine-Nine's optic stops flickering.
>
> "Huh." He sounds almost offended. "Hours, that buys. Not days. Don't let it go to your head." His jaw plate swings as he tips what is left of his chin toward the crater. "Now you've got two problems instead of one, medic. Somebody down that hole wants a hand, and twenty-three up here want a number. The engines won't wait for both."
>
> The turbine note from the east climbs a step and holds there, a pitch higher than before.
>
> At I7 Seven-Seven has not let go of Rook's wrist. Its fingers have started tapping again, on Rook's armour this time. "Two thousand one hundred and twelve. You didn't answer."

**Turn fields:**

- objects: `[{"action": "update", "id": "m12"}]`
- hooks: 6

Map after: Seven-Seven I7 (neutral), Hum J8 (neutral), Lantern K7 (neutral); party MPAT I4, Rook J6. Mission: the_shield_line: reach_nine_nine=done, tend_the_line=open, first_fight=open, who_stays=open, carry_east=open.

## Turn 5 (round) · $0.072

**Since the last narration:**

- [MPAT] MPAT tries: Ask for his report (Sergeant Nine-Nine, H5).
- [check] AUTHORITY · d20 3 −2 = 1 vs 8 · ✕ FAILURE — MPAT: Learn what he knows of the line, the crater and the pad.
- [Rook] Rook tries: Sort who can be saved (The triage line, J7).
- [check] SENSORY + ANALYSIS · d20 4 −2 = 2 vs 12 · ✕ FAILURE — Rook: Triage by touch and data: who can walk, who must be carried, who can't be saved.

**The craft checks told the Narrator:**

- OPENINGS YOU KEEP USING (start differently): "behind the…", "its fingers…"

**Narration:**

> Nine-Nine's optic narrows. "Report? I gave you one. You want it again with a salute on top?" The jaw plate clacks once. "Medic, you don't outrank a fencepost. Ask me something useful, or go do your job." Whatever he knows about the crater and the pad, he keeps it behind that grille.
>
> At J7 Rook works down the row by feel. The plating is cold in some places and warm in others, and none of it makes sense. A robot near the middle reads as sound. Rook grips Hum's shoulder: "This one walks." Hum gets halfway up before its left knee folds sideways with a crack of snapped linkage, and it goes down hard. The four notes stop. For three long seconds the row hears nothing at all.
>
> Then Hum starts again, quieter, a note lower.
>
> "Two thousand one hundred and forty," Seven-Seven says. It lets go of Rook's wrist. "You don't know either."
>
> From the east the turbines cough, catch, and settle into a rhythm, like an engine being tested before it's trusted. Down in the crater the voice says the squad number again and stops halfway through.

**Turn fields:**

- objects: `[{"action": "update", "id": "m13"}]`
- hooks: 7

Map after: Seven-Seven I7 (neutral), Hum J8 (neutral), Lantern K7 (neutral); party MPAT I4, Rook J6. Mission: the_shield_line: reach_nine_nine=done, tend_the_line=open, first_fight=open, who_stays=open, carry_east=open.

## Turn 6 (round) · $0.068

**Since the last narration:**

- [MPAT] "How many of us can we carry? Depends on how many of them can still walk, Sergeant."
- [Rook] I ask the one humming what the song is.

**The craft checks told the Narrator:**

- REPEATED ACROSS YOUR LAST TURNS (retire these): "go of rook's wrist", "two thousand one hundred", "thousand one hundred and"
- OPENINGS YOU KEEP USING (start differently): "its fingers…", "seven-seven says…"

**Narration:**

> "Now that's a question." Nine-Nine's grille rattles, something close to approval. "Walkers. Look at their legs, not their faces. Most of that row lost legs first, that's how the line breaks. I'd say four can stand if you hold them up, and one more if somebody finds a knee pin." His optic slides toward the humming. "That one. Four-squad's post out past the stakes has eleven dead with good knees. And the drones know it."
>
> At J8 Hum keeps the four notes going a moment longer before it answers Rook. "Don't know the name. It was in me when they switched me on at the Factory." The servos in its neck tick. "Maybe before that. Can there be a before that?" It looks up. "Nobody taught me. I checked. I asked everyone."
>
> Over the fallen squad at D4, a drone drops low enough to catch the black hole's light on its rotors, and the scrape of metal on metal carries back across the mines.

**Turn fields:**

- hooks: 5

Map after: Seven-Seven I7 (neutral), Hum J8 (neutral), Lantern K7 (neutral); party MPAT I4, Rook J6. Mission: the_shield_line: reach_nine_nine=done, tend_the_line=open, first_fight=open, who_stays=open, carry_east=open.

## Turn 7 (round) · $0.072

**Since the last narration:**

- [MPAT] We wait for Nine-Nine to decide.
- [Rook] I wait too.

**The craft checks told the Narrator:**

- REPEATED ACROSS YOUR LAST TURNS (retire these): "go of rook's wrist", "two thousand one hundred", "thousand one hundred and"

**Narration:**

> Nine-Nine lets the silence run long enough to make his point.
>
> "No. You don't get to hand that to me." His optic swings between the two of you. "I'm a fencepost with opinions. You're the medics. Waiting's a decision too, and here's what it decides."
>
> At the far end of the row, past K7, a ticking you'd stopped noticing stops. Nobody touched it. The plating there gives off a last breath of heat and goes the same temperature as the dirt.
>
> "Twenty-two," Nine-Nine says. "Pick something. Knee pin's out past the stakes, if you like drones. Hole's to the north, if you like digging. And that radio at M8 is still open to the pad. Somebody could ask them for minutes." A rattle in the grille. "They won't like being asked."
>
> Lantern turns its head toward the end of the row and presses its chest plate harder. Seven-Seven's count skips a number, then goes back for it.

**Turn fields:**

- objects: `[{"action": "update", "id": "m13"}]`
- hooks: 5

Map after: Seven-Seven I7 (neutral), Hum J8 (neutral), Lantern K7 (neutral); party MPAT I4, Rook J6. Mission: the_shield_line: reach_nine_nine=done, tend_the_line=open, first_fight=open, who_stays=open, carry_east=open.

## Turn 8 (round) · $0.074

**Since the last narration:**

- [system] MPAT moves to H4 (1 tile, 1 AP).
- [MPAT] I look out at the fallen squad past the stakes. Is anything still moving out there?
- [Rook] "Lantern, is it? What are you holding shut?"

**The craft checks told the Narrator:**

- REPEATED ACROSS YOUR LAST TURNS (retire these): "out past the stakes"
- OPENINGS YOU KEEP USING (start differently): "the plating…", "his optic…"

**Narration:**

> Across the mines, two things still move. At D4, among the half-buried squad, two status lights blink out of step, green and amber. And nearer, at E7, a lone infantry robot lies on its back, one leg scraping the dirt, its voice box looping the same squad number the crater voice called. A drone peels off from the circle above D4 and drifts toward it, low and patient.
>
> Lantern doesn't answer Rook at once. Then it lifts two fingers off the seam, just enough. Inside, folded against the coolant pump, is a square of paper soft with handling: a corner of wax colour, red and yellow, a round shape that could be a sun or a face.
>
> "Not mine," it says, and presses the plate shut again. "I'm keeping it for someone. If you carry me, carry this. If you don't—" its head turns toward the cold end of the row "—take it out first. Don't let it go in the scrap bin with me."
>
> At I7, Seven-Seven has stopped counting to listen.

**Turn fields:**

- hooks: 6

Map after: Seven-Seven I7 (neutral), Hum J8 (neutral), Lantern K7 (neutral); party MPAT H4, Rook J6. Mission: the_shield_line: reach_nine_nine=done, tend_the_line=open, first_fight=open, who_stays=open, carry_east=open.

## Turn 9 (round) · $0.082

**Since the last narration:**

- [MPAT] I stand up on the stakes and shout at the drones to get off our people.
- [Rook] I back MPAT up, banging two plates together.

**The craft checks told the Narrator:**

- REPEATED ACROSS YOUR LAST TURNS (retire these): "out past the stakes", "end of the row"
- OPENINGS YOU KEEP USING (start differently): "his optic…"

**Narration:**

> The stake under MPAT's boot shifts a finger's width, and the whole row of them creaks in sympathy. At H5 Nine-Nine's grille spits static. "Easy. That's my spine you're standing on."
>
> The shout goes out over the mines anyway, and Rook's plates crack together behind it, flat and ugly, steel on steel, loud enough to buzz in your own chassis. The drone sliding toward E7 stops dead in the air, rotors trimming. Over D4 the other one lifts off the fallen squad with something trailing from its claws, a ribbon of cable, and turns its sensor cluster toward the stakes.
>
> Neither leaves. Both hang there, deciding what you are: a threat, or two more pieces of salvage that haven't fallen over yet.
>
> "Louder," Seven-Seven says from I7. "Two thousand two hundred. They count too."

**Turn fields:**

- npcs: `[{"action": "place", "name": "Scavenger drone", "at": "D3", "side": "hostile", "tier": "minion", "weapon": "service_pistol", "kind": "machine"}, {"action": "place", "name": "Scavenger drone", "at": "E6", "side": "hostile", "tier": "minion", "weapon": "service_pistol", "kind": "machine"}]`
- moves: `[{"charId": "c2", "to": "G4"}]`
- checks: `[{"charId": "c4", "skills": ["intimidation", "guts"], "tn": 12, "stakes": "Drive the drones off the fallen squad and away from E7 without a fight; fail and they decide the medics are salvage and dive."}]`
- hooks: 6

Map after: Seven-Seven I7 (neutral), Hum J8 (neutral), Lantern K7 (neutral), Scavenger drone D3 (hostile), Scavenger drone E6 (hostile); party MPAT G4, Rook J6. Mission: the_shield_line: reach_nine_nine=done, tend_the_line=open, first_fight=open, who_stays=open, carry_east=open.

## Turn 10 (results) · $0.070

**Since the last narration:**

- [system] MPAT moves to G4.
- [system] Scavenger drone at D3.
- [system] Scavenger drone at E6.
- [check] INTIMIDATION + GUTS · d20 3 +2 = 5 vs 12 · ✕ FAILURE — Rook: Drive the drones off the fallen squad and away from E7 without a fight; fail and they decide the medics are salvage and dive.

**The craft checks told the Narrator:**

- REPEATED ACROSS YOUR LAST TURNS (retire these): "end of the row"

**Narration:**

> The clang dies over the mines and the drones answer it together: rotors flatten, pitch climbs to a whine, and both tip their noses toward the stakes. The one over D4 lets the cable ribbon fall. It wants new salvage now.
>
> "Well, you've got their attention," Nine-Nine says. "Down, medic. Stakes are half cover, so use them. You get so much effort each turn. Spend it moving, shooting or looking, and don't waste it standing tall." His optic flicks to the nearer drone. "Analyze one before you shoot it. Know where the plating's thin. And nobody walks out there. That ground was mined on the way out."
>
> At J8 Hum's song breaks off mid-note. Lantern folds over its chest plate. Seven-Seven goes on counting, faster now. "Two thousand two hundred and six. Seven. Eight."
>
> The first drone opens up, and a round sparks off the stake beside MPAT's boot.

**Turn fields:**

- combat: `{"name": "Picking at the Dead", "map": "shield_line", "difficulty": "easy", "enemies": [{"name": "Scavenger drone", "tier": "minion", "weapon": "service_pistol", "at": "D3", "kind": "machine"}, {"name": "Scavenger drone", "tier": "minion", "weapon": "service_pistol", "at": "E6", "kind": "machine"}]}`
- hooks: 5

Map after: Seven-Seven I7 (neutral), Hum J8 (neutral), Lantern K7 (neutral); party MPAT G4, Rook J6. Mission: the_shield_line: reach_nine_nine=done, tend_the_line=open, first_fight=open, who_stays=open, carry_east=open.
