#!/usr/bin/env python
"""Retired (ruling F of docs/design/growth/00-rulings.md, 21 Nov 2026).

The pacing numbers now live once, in tools/balance/bible/pacing.json (the clock, its time model and route, XP, gains,
gates, every practice rate, the door Marks' one formula, credits, grades by map, the spend plans, the calendar, the
collection and the migration), and the bible's one checker computes every table from it and fails on a contradiction
(check (e) CLOCK recomputes the hours and the XP table from the time model and the route). This script only forwards
there, so old notes that say `python tools/balance/pacing.py <section>` still work:

    PYTHONUTF8=1 python tools/balance/check.py --tables pacing     # the clock, XP, door Marks, Devotion, credits, the step price, co-op
    PYTHONUTF8=1 python tools/balance/check.py --tables calendar   # every character's hours 0 to 49
    PYTHONUTF8=1 python tools/balance/check.py --tables spend      # the spend plans, level by level

It reads data/*.json and the bible and writes nothing.
"""
import os, subprocess, sys

OLD = {'time': 'pacing', 'levels': 'pacing', 'xp': 'pacing', 'points': 'spend', 'practice': 'pacing', 'eighty': 'calendar',
       'credits': 'pacing', 'coop': 'pacing', 'calendar': 'calendar'}
here = os.path.dirname(os.path.abspath(__file__))
want = list(dict.fromkeys(OLD.get(a, a) for a in sys.argv[1:])) or ['pacing', 'spend', 'calendar']
sys.exit(subprocess.call([sys.executable, os.path.join(here, 'check.py'), '--tables'] + want))
