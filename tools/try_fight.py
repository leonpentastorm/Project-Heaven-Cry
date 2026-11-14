#!/usr/bin/env python3
"""Ask the rules "what happens if…" in seconds, with no browser and no new test file.

    npm run try -- '<scenario JSON>'      or      npm run try -- path/to/scenario.json

The scenario (every field optional):
  pcs    characters: [{"archetype": "sharpshooter", "weapon": "sabre", "level": 6, "kit": "soul", "classId": "fighter",
         "perks": {"last_wall": "mastered", "bulwark": "II"}, "traits": ["pain_eater"],
         "skills": {"dexterity": 9}, "attrs": {"agility": 9}, "grade": {"main": "fine", "off": "fine"}}]   (default: one sharpshooter)
  foes   [{"tier": "vermin|minion|soldier|elite|boss", "weapon": "fists", "at": "F6", "level": 9}]   (default: one soldier at F6;
         an enemy is the squad's level unless it has its own; "classic": true gives it the old fixed numbers)
  level  the fight's level, 1 to 20 (default: the average level of the characters, rounded down)
  seed   a string: the dice. Change it to see other rolls.
  set    put things where you need them first: {"$pc": {"pos": "5,5", "ap": 9}, "$foe": {"pos": "6,5", "hp": 20}}
  turn   whose turn it starts on ("$pc" by default, "$foe", "$pc1"…; false: leave the turn order alone)
  steps  what to do, in order. Each is an engine action (unitId defaults to the first character), or
         {"turn": "$foe"}  make it that unit's turn      {"set": {...}}  as above
         {"preview": {"id": "lunge", "targetId": "$foe"}}  what a technique would do, without doing it
         {"preview": {"mode": "shot", "target": "$foe"}}   hit chance and damage of a plain attack
         {"tohit": {"type": "sigil", "target": "$foe"}}    the terms the one to-hit hook adds (weapon, sigil, soul)
  In any value, "$pc", "$foe", "$pc1", "$foe2" become that unit's id, and "$foe.pos" its tile.

Examples
  a shot:        npm run try -- '{"steps":[{"type":"combat/technique","id":"shot","targetId":"$foe"}]}'
  a perk button: npm run try -- '{"pcs":[{"perks":{"shrug_it_off":"I"}}],"steps":[{"type":"combat/perk","id":"shrug_it_off"}]}'
  end my turn and see what the enemy does:   … "steps":[{"type":"combat/end-turn"}]

It prints the units before, then after every step the fight log lines it wrote and every unit's HP, AP, meters and
conditions. A refused action prints its reason.
"""
import os, re, shutil, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if len(sys.argv) < 2 or sys.argv[1] in ('-h', '--help'): print(__doc__); sys.exit(0)
env = dict(os.environ, PHC_TRY=sys.argv[1] if not os.path.exists(sys.argv[1]) else os.path.abspath(sys.argv[1]))
p = subprocess.run([shutil.which('npx') or 'npx', 'vitest', 'run', '--root', 'packages/engine', 'test/try.test.ts', '--silent=false'], cwd=ROOT, capture_output=True, text=True, encoding='utf-8', errors='replace', env=env)
out = re.sub(r'\x1b\[[0-9;]*m', '', p.stdout + p.stderr)
m = re.search(r'\nSTART\n.*?(?=\n\s*(?:✓|×|❯| Test Files|stdout \|))', out, re.S)
print(m.group(0).strip() if m else out[-3000:])
sys.exit(p.returncode)
