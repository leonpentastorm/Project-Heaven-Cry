#!/usr/bin/env python
"""Retired (ruling F of docs/design/growth/00-rulings.md, 21 Nov 2026).

The scale's numbers now live once, in tools/balance/bible/scale.json, and its tables are printed by the bible's one
checker. This script only forwards there, so old notes that say `python tools/balance/scale.py <section>` still work:

    PYTHONUTF8=1 python tools/balance/check.py --tables scale       # every table of the scale
    PYTHONUTF8=1 python tools/balance/check.py --tables columns     # one section

The second draft's `top` and `check` sections (T11, T12) are checks (a) and (b) of check.py, computed from the door
and world files instead of numbers typed here. It reads data/*.json and writes nothing.
"""
import os, subprocess, sys

OLD = {'today': 'profiles', 'factor': 'factor', 'weapons': 'weapons', 'digits': 'weapons', 'columns': 'columns', 'cards': 'profiles',
       'hp': 'hp', 'costs': 'mp', 'plate': 'plate', 'grades': 'grades', 'margins': 'margins', 'top': 'doors', 'check': 'hits', 'caps': 'caps'}
here = os.path.dirname(os.path.abspath(__file__))
want = [OLD.get(a, a) for a in sys.argv[1:]] or ['scale']
sys.exit(subprocess.call([sys.executable, os.path.join(here, 'check.py'), '--tables'] + want))
