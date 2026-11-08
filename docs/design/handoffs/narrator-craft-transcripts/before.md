# Narrator craft playtest: Before (origin/develop prompt)

Model claude-opus-5-5, effort medium. M813, seed "narrator-craft", room LIVE13, two scripted players (MPAT and Rook), the same player script in every run (apps/web/src/narrator/live-playtest.test.ts). Total cost $0.96. Machine-readable: before.json.

## Turn 1 (opening) · $0.288

**Since the last narration:**

- [system] Session 1 begins.
- [system] ▶ Mission: The Shield Line · Get the wounded line to the rear pad before the last ship leaves.

**Narration:**

> The guns stop. Not all at once: one last rifle coughs somewhere west, then nothing. The silence is so complete you can hear smoke settling. Over the stakes, B813 rises into the dusk, a black hole with a ring of bent light around it, and the scorched barrier stakes throw long shadows across the triage ground.
>
> You are medics of the 258th, MPAT and Rook, standing among what is left. Behind you, in a row at the triage line, Seven-Seven is counting seconds out loud and hasn't stopped since the line broke. Something in the row is humming a tune nobody taught it. Out past the stakes, scavenger drones circle low over a fallen squad. From the east comes a steady, rising thrum: engines warming on the rear pad.
>
> The squad channel crackles. The voice is coming from the stake line, a step away at H5, where a torso and one shoulder are wedged between two stakes.
>
> "Medics. Good. Sergeant Nine-Nine, what's left of him. The line held. Tell the Colonel, if anyone's still listening." A burst of static, maybe a laugh. "Humans are boarding the last ship. Platinum's going up the ramp ahead of us. Come here. Orders."
>
> His one working optic finds you both.
>
> "First question, and I need a straight answer. How many of us can you carry?"

**Turn fields:**

- sceneTitle: `"The Guns Stop"`
- hooks: 5

Map after: no tokens; party MPAT I4, Rook I5. Mission: the_shield_line: reach_nine_nine=open, tend_the_line=open, first_fight=open, who_stays=open, carry_east=open.

## Turn 2 (round) · $0.066

**Since the last narration:**

- [art] "How many of us can you carry?"
- [MPAT] I head for the stake line. "Sergeant. Medics of the 258th, reporting. What do you need?"
- [system] Rook moves to J6 (1 tile, 1 AP).
- [Rook] I go to the row of broken infantry behind the stakes and listen to who is still making noise.

**Narration:**

> MPAT, you crouch at the stakes, close enough to hear Nine-Nine's fans grinding on grit. "Reporting. Good. Eighteen months I've waited for someone to say that to me." His optic clicks down to you. "Orders, one at a time, the way they taught you. One: the line behind you. Sort it. Who walks, who's carried, who's past it. Two: something's alive in that crater at K2, calling out. Three: the drones are stripping my far post. And four, medic, look at me properly before you decide I'm worth the weight. Everything on this field is worth a proper look."
>
> Rook, you walk the row at J7 and listen. A voice counts, steady and thin: "four hundred and twelve, four hundred and thirteen." Its plate is stencilled SEVEN-SEVEN. Beside it, a robot with no legs below the hip hums a tune that goes up and comes back, over and over; someone has scratched HUM on its shoulder. Further down, one holds its chest plate shut with both hands and turns its optic toward you. "Lantern," it says, before you ask. "Don't open me."
>
> East, the engine thrum climbs half a note.

**Turn fields:**

- npcs: `[{"action": "place", "name": "Seven-Seven", "side": "neutral", "tier": "minion", "weapon": "fists", "at": "K7", "kind": "robot"}, {"action": "place", "name": "Hum", "side": "neutral", "tier": "minion", "weapon": "fists", "at": "L7", "kind": "robot"}, {"action": "place", "name": "Lantern", "side": "neutral", "tier": "minion", "weapon": "fists", "at": "M7", "kind": "robot"}]`
- missions: `[{"mission": "the_shield_line", "objective": "reach_nine_nine", "status": "done"}]`
- hooks: 7

Map after: Seven-Seven K7 (neutral), Hum L7 (neutral), Lantern M7 (neutral); party MPAT I4, Rook J6. Mission: the_shield_line: reach_nine_nine=done, tend_the_line=open, first_fight=open, who_stays=open, carry_east=open.

## Turn 3 (round) · $0.063

**Since the last narration:**

- [xp] MPAT +50 XP (quest: Reported to Sergeant Nine-Nine and took his orders)
- [xp] Rook +50 XP (quest: Reported to Sergeant Nine-Nine and took his orders)
- [system] Seven-Seven at K7.
- [system] Hum at L7.
- [system] Lantern at M7.
- [system] ✓ Objective: Report to Sergeant Nine-Nine in the stake line
- [MPAT] MPAT examines the sergeant nine-nine at H5 [m12].
- [MPAT] "Before we talk numbers, Sergeant, let me look at you." I check his leaks.
- [Rook] Rook examines the the triage line at J7 [m13].
- [Rook] I kneel by the one that is counting out loud. "Hey. What are you counting?"

**Narration:**

> MPAT, you get your hands into the stakes and look at Nine-Nine properly. Coolant beads at a split line under his collar, slow and warm, pooling where the stake pins him. Below the ribs there's nothing: torn cable and a power cell scored black, its gauge needle trembling a hair above red. His fans hitch every fourth turn. "Well?" he crackles. "Don't be polite. Polite takes longer." The split is small. You could clamp it and reroute the cell before it bleeds him dry, if your hands are steady and he trusts you enough to stop moving.
>
> Rook, you kneel by the counting one. Seven-Seven's optic swings to you without the count breaking. "Four hundred and forty. Since the last order. Four hundred and forty-one. The Colonel said hold. Nobody said stop. Four hundred and forty-two." A pause long enough for one second to go uncounted, then it starts again, quicker. "If I stop, I don't know how long it's been." Beside it, Hum's tune falters, then comes back. Down the row, twenty-three bodies, some stirring, some not. Somebody is going to have to sort them, and somebody strong is going to have to lift.
>
> East, the engines climb again.

**Turn fields:**

- checks: `[{"charId": "c2", "skills": ["proficiency", "camaraderie"], "tn": 8, "stakes": "Clamp Nine-Nine's coolant split and reroute his cell. Success buys him hours and his trust; failure costs time and parts as the line sprays and you start over."}]`
- hooks: 6

Map after: Seven-Seven K7 (neutral), Hum L7 (neutral), Lantern M7 (neutral); party MPAT I4, Rook J6. Mission: the_shield_line: reach_nine_nine=done, tend_the_line=open, first_fight=open, who_stays=open, carry_east=open.

## Turn 4 (results) · $0.070

**Since the last narration:**

- [check] PROFICIENCY + CAMARADERIE · d20 9 +3 = 12 vs 8 · ✓ SUCCESS — MPAT: Clamp Nine-Nine's coolant split and reroute his cell. Success buys him hours and his trust; failure costs time and parts as the line sprays and you start over.

**Narration:**

> MPAT, your hands go in steady. Nine-Nine stops moving the moment you tell him to, which is its own kind of answer. The clamp bites, the coolant bead slows, thins, stops. You jumper the scored cell past the dead run of cable and the gauge needle climbs off red, a hair, then a finger's width. His fans stop hitching. "Hours," he says, testing the word. "You bought me hours. Don't spend them all on me." His optic rolls toward his own shoulder, the one with nothing hanging from it. "Funny thing. If I had an arm, I'd fix myself and you could go."
>
> Rook, Seven-Seven's count goes on beside you: "four hundred and ninety-eight, four hundred and ninety-nine." Hum's tune rises and comes back. Lantern's hands haven't moved from its chest. Twenty-three bodies down the row, and only two of you with working legs. Some of them will need lifting two at a time, and someone has to decide which ones are worth the lift.
>
> From the crater at K2, the voice calls again, weaker, and gravel hisses down the slope. Out west the drones dip lower over the far post. East, the engines climb another half note. Nine-Nine's optic finds you both. "Clock's running, medics. Pick."

**Turn fields:**

- objects: `[{"action": "update", "id": "m12"}]`
- hooks: 6

Map after: Seven-Seven K7 (neutral), Hum L7 (neutral), Lantern M7 (neutral); party MPAT I4, Rook J6. Mission: the_shield_line: reach_nine_nine=done, tend_the_line=open, first_fight=open, who_stays=open, carry_east=open.

## Turn 5 (round) · $0.064

**Since the last narration:**

- [MPAT] MPAT tries: Ask for his report (Sergeant Nine-Nine, H5).
- [check] AUTHORITY · d20 3 −2 = 1 vs 8 · ✕ FAILURE — MPAT: He tells you what he knows of the line, the crater and the ramp.
- [Rook] Rook tries: Sort who can be saved (The triage line, J7).
- [check] SENSORY + ANALYSIS · d20 4 −2 = 2 vs 12 · ✕ FAILURE — Rook: Triage by touch and data: who can walk, who must be carried, who can't be saved.

**Narration:**

> MPAT, you ask for his report, but it comes out like a question, and Nine-Nine hears that. "Report. Right." His voice box catches, spits static, catches again. "Crater's... someone from Fourth, I think. Ramp's..." The rest dissolves into a long hiss. When it clears he only says, "Ask me straight next time, medic. I'm a sergeant, not a weather service." Whatever he knew about the ramp is lost in his throat for now, and the clock kept running while you waited.
>
> Rook, you go down the row with big careful hands, pressing chassis, listening for fans. It isn't careful enough. You shift Seven-Seven to reach the one beneath it, and the count breaks. "Five hundred and... five hundred and..." Silence. Then, very small: "I lost it. I don't know how long it's been." It starts again from zero, faster, and its optic doesn't follow you any more. Two you marked as gone are still ticking. One you marked as fine has stopped.
>
> Hum keeps humming. Lantern watches you both.
>
> The crater calls again, weaker. The drones drop lower over the far post. East, the engines climb. Nine-Nine's optic swings between you. "Row's still unsorted. Somebody fix that, or somebody start lifting."

**Turn fields:**

- hooks: 5

Map after: Seven-Seven K7 (neutral), Hum L7 (neutral), Lantern M7 (neutral); party MPAT I4, Rook J6. Mission: the_shield_line: reach_nine_nine=done, tend_the_line=open, first_fight=open, who_stays=open, carry_east=open.

## Turn 6 (round) · $0.073

**Since the last narration:**

- [MPAT] "How many of us can we carry? Depends on how many of them can still walk, Sergeant."
- [Rook] I ask the one humming what the song is.

**Narration:**

> MPAT, Nine-Nine's optic holds on you, and this time he hears a straight answer. "Better. Walkers, then." His voice box grinds through the row. "Four, maybe five can limp if someone points them east. Everyone else rides on a medic's back. Two of you, one each, two if your shoulders hold. Road to the pad's a long walk. You do the sum." A pause. "Or you find them legs. My far post is lying out there with eleven pairs, and the drones are eating them while we talk."
>
> Rook, Hum's tune stops when you ask. Its optic flickers, embarrassed. "I don't know what it is. It was in me when I came off the Factory line. Nobody loaded it. Nobody taught me." It starts again, softer, the same rise and fall. Then, quietly, so the row won't hear: "Seven-Seven counts better when I hum. Keeps the beat even. It isn't angry with you. It's scared it lost five hundred seconds that mattered." Two bodies down, Seven-Seven's count has slipped into time with the tune without noticing.
>
> West, a drone lands on the far post and something metal tears. From the crater, the voice calls once more and gravel slides. East, the engines climb. Nobody has said stop.

**Turn fields:**

- hooks: 7

Map after: Seven-Seven K7 (neutral), Hum L7 (neutral), Lantern M7 (neutral); party MPAT I4, Rook J6. Mission: the_shield_line: reach_nine_nine=done, tend_the_line=open, first_fight=open, who_stays=open, carry_east=open.

## Turn 7 (round) · $0.076

**Since the last narration:**

- [MPAT] We wait for Nine-Nine to decide.
- [Rook] I wait too.

**Narration:**

> You wait, and Nine-Nine lets the silence run exactly one breath. "Waiting for the sergeant. Good instinct. Wrong moment." His optic snaps west. "Here's the decision, then. Drones first. Legs change the sum, and every pair they eat is one of mine riding your back to the pad."
>
> Before he finishes, the drone on the far post lifts off with a strip of plating in its claws. A second one rises beside it. They turn together, lenses swinging over the stakes, over the row, over Hum's open chest and Seven-Seven's ticking voice. The far post is picked clean of anything easy. The triage line is next.
>
> "Here they come. Listen, medics, one thing at a time. Get a stake between you and them; it's half cover and half's better than none. Look before you shoot: a proper look tells you what they are and where they're soft. Every step and every shot costs you. Spend it like it's the last you've got." Static, then drier: "And don't let them land on the row."
>
> Seven-Seven's count speeds up. Hum hums louder. Lantern presses both hands flat to its chest plate.
>
> The drones dive.

**Turn fields:**

- combat: `{"name": "Picking at the dead", "map": "shield_line", "difficulty": "easy", "enemies": [{"name": "Scavenger drone", "tier": "minion", "weapon": "service_pistol", "at": "D3", "kind": "machine"}, {"name": "Scavenger drone", "tier": "minion", "weapon": "service_pistol", "at": "D6", "kind": "machine"}]}`
- hooks: 6

Map after: Seven-Seven K7 (neutral), Hum L7 (neutral), Lantern M7 (neutral); party MPAT I4, Rook J6. Mission: the_shield_line: reach_nine_nine=done, tend_the_line=open, first_fight=open, who_stays=open, carry_east=open.

## Turn 8 (combat_end) · $0.082

**Since the last narration:**

- [combat] Combat: Picking at the dead
- [combat] Won "Picking at the dead" in 1 rounds. MPAT 100/130 HP, Rook 160/160 HP, Scavenger drone (dead), Scavenger drone (dead).
- [xp] MPAT +25 XP (combat: easy fight)
- [xp] Rook +25 XP (combat: easy fight)

**Narration:**

> Rook, you don't wait for a second lesson. The first drone comes over the stakes low, claws open for Hum, and your pistol barks once: its lens bursts and it cartwheels into the grit behind the line, sparking at H8. The second banks hard to go around you and you track it like you've done this all your life. One shot. It folds in the air and drops into no-man's-land, a twist of smoking rotor. The whole thing took less time than Seven-Seven needs to count to ten.
>
> MPAT, you're still crouched at Nine-Nine's stake, a fresh dent in your shoulder plate where a claw raked past on the first dive. Nothing that stops your hands.
>
> "Two shots," Nine-Nine crackles. "I've had corporals who couldn't do that with a lamp-post." Down the row, Seven-Seven's count stumbles, then goes on, and for the first time since you broke it, its optic swivels toward Rook and stays there a moment. "Sixty-one," it says. "Sixty-two. That was well done. Sixty-three."
>
> The sky is empty. The far post lies open now: eleven fallen, two lights still blinking, legs nobody's eating any more. From the crater at K2 the voice calls again, thinner, and gravel slides. East, the engines climb another half note. Nine-Nine's optic rolls between you. "Legs, the crater, or the row. Pick, medics."

**Turn fields:**

- missions: `[{"mission": "the_shield_line", "objective": "first_fight", "status": "done", "note": "Rook shot both scavenger drones down."}]`
- objects: `[{"action": "place", "name": "Drone wreck", "at": "H8"}]`
- hooks: 5

Map after: Seven-Seven K7 (neutral), Hum L7 (neutral), Lantern M7 (neutral); party MPAT I4, Rook J6. Mission: the_shield_line: reach_nine_nine=done, tend_the_line=open, first_fight=done, who_stays=open, carry_east=open.

## Turn 9 (round) · $0.081

**Since the last narration:**

- [system] ✓ Objective: Drive the scavenger drones off the fallen squad (optional) · Rook shot both scavenger drones down.
- [system] MPAT moves to H4 (1 tile, 1 AP).
- [MPAT] I look out at the fallen squad past the stakes. Is anything still moving out there?
- [Rook] "Lantern, is it? What are you holding shut?"

**Narration:**

> MPAT, you look past the stakes and let the field settle. The far post lies in a heap of grey plating at the edge of the craters, and two of its lights are still blinking, out of step, like they're arguing. Nearer, at E7, one body isn't lying still at all: an infantry frame twitching on its back, one leg scraping a slow arc in the grit, its voice box looping the same thing over and over. "Four-Four, far post, Four-Four, far post, reporting. Four-Four, far post..." Nobody has answered it in a long time. Between you and it, the ground is churned and quiet. Too quiet, maybe.
>
> Rook, Lantern's optic dims when you ask, the way a person looks at their shoes. Its hands don't move from its chest plate. "A drawing," it says at last. "Paper. A child made it. Four people and a house and a sun with a face." A long pause. "It isn't mine. I'm keeping it for someone." It won't say who. "If I don't make it to the pad, don't leave it in the dirt. Please."
>
> Nine-Nine's optic swings west, toward the looping voice. "Four-Four. Corporal. Stubborn as a bolt." Then, quieter: "Mind the ground out there. They mined it before they left."

**Turn fields:**

- objects: `[{"action": "update", "id": "m16", "name": "Four-Four, still moving"}]`
- hooks: 5

Map after: Seven-Seven K7 (neutral), Hum L7 (neutral), Lantern M7 (neutral); party MPAT H4, Rook J6. Mission: the_shield_line: reach_nine_nine=done, tend_the_line=open, first_fight=done, who_stays=open, carry_east=open.

## Turn 10 (round) · $0.094

**Since the last narration:**

- [xp] MPAT +25 XP (discovery: Spotted Four-Four still alive in no-man's-land and the far post's blinking lights)
- [system] MPAT reaches level 2.
- [xp] Rook +25 XP (dialogue: Earned Lantern's trust about the drawing)
- [system] Rook reaches level 2.
- [MPAT] I stand up on the stakes and shout at the drones to get off our people.
- [Rook] I back MPAT up, banging two plates together.

**Narration:**

> MPAT, you climb the stakes at H4 and the scorched wood creaks under your feet. From up here you see what the ground hid: the sky over the far post isn't empty. Three more drones hang high above the craters, smaller, patient, circling the eleven fallen the way gulls circle a boat. The two wrecks drew them in. You fill your voice box and shout across no-man's-land, "Get off our people!" It rolls out flat and huge over the dead ground.
>
> Rook, you snatch two loose plates off the stake line and slam them together, again and again, a clang like a shift siren. The circling stops. Three lenses tilt toward the noise.
>
> Behind you the row stirs. Seven-Seven's count jumps a beat. Hum stops humming. Lantern lifts its head. Some of them have voice boxes left. Some of them could add to the noise, if someone asked.
>
> Nine-Nine's optic swivels up at you, MPAT. "Well. That's one way to say it." Then, sharp: "Don't flinch now. They're deciding if you're worth the trouble. Make sure you are."
>
> The drones drop a little lower. Make the noise count.

**Turn fields:**

- npcs: `[{"action": "place", "name": "Scavenger drone", "side": "hostile", "tier": "minion", "weapon": "service_pistol", "at": "C3", "kind": "machine"}, {"action": "place", "name": "Scavenger drone", "side": "hostile", "tier": "minion", "weapon": "service_pistol", "at": "D2", "kind": "machine"}, {"action": "place", "name": "Scavenger drone", "side": "hostile", "tier": "minion", "weapon": "service_pistol", "at": "B4", "kind": "machine"}]`
- checks: `[{"charId": "c4", "skills": ["intimidation", "guts"], "tn": 12, "stakes": "Drive the circling drones off the far post with sheer noise and nerve. Success sends them away with no fight; failure, they decide the row is worth a dive."}, {"charId": "c2", "skills": ["camaraderie"], "tn": 12, "stakes": "Get the triage line to shout with you. Success turns the row's voices into one din, and their trust; failure, the row stays silent and you shout alone."}]`
- hooks: 5

Map after: Seven-Seven K7 (neutral), Hum L7 (neutral), Lantern M7 (neutral), Scavenger drone C3 (hostile), Scavenger drone D2 (hostile), Scavenger drone B4 (hostile); party MPAT H4, Rook J6. Mission: the_shield_line: reach_nine_nine=done, tend_the_line=open, first_fight=done, who_stays=open, carry_east=open.
