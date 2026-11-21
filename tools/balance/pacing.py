"""Pacing tables for the 0.34 rebalance (docs/design/growth/05-pacing.md, second draft).

Reads data (never writes it) and prints the working behind every pacing number in the design file: the time model,
the foe levels by map (ruling D24, read from 06), the XP table derived from the maps, the worth of a fight, the
points and the four spend plans (rulings B11 to B13), every practice track, the credit economy and the grades by
map (D25, D26), co-op pace (D27) and the 0-to-50-hour calendar for four characters.

    PYTHONUTF8=1 python tools/balance/pacing.py              # every table
    PYTHONUTF8=1 python tools/balance/pacing.py xp calendar  # some of: time levels xp points practice eighty credits coop calendar

Every number set below under PROPOSED is PROVISIONAL (05-pacing.md gives each its reason). ASSUMED is the time model
(minutes a player spends; no data holds them): change it and every hour in every table moves with it. The foe levels
are the reading of ruling D24 (06 owns the rows; if 06's rows differ, change boss_level / foe_level and run again).
Nothing here is a line to fit to: the XP table is the maps' XP summed, and the hours are a reading of the minutes.
"""
import json
import math
import os
import sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))


def load(name):
    with open(os.path.join(ROOT, 'data', name), encoding='utf-8') as f:
        return json.load(f)


RULES, SV, TECH, SIG, SOUL, PAT, FEEL, FIG, SKILLS, WEAP = (load(n) for n in (
    'rules.json', 'survival.json', 'techniques.json', 'sigils.json', 'soul_modules.json', 'patrons.json',
    'feelings.json', 'figments.json', 'skills.json', 'weapons.json'))

# ---------------------------------------------------------------- TODAY (read from data)
TODAY = {
    'xp_total': {int(k): v for k, v in RULES['character']['levels']['xp_total'].items()},
    'xp': SV['xp'], 'credits': SV['credits'], 'stage': SV['stage'], 'rounds': SV['rounds'],
    'drill': TECH['rules']['drill'], 'study': SIG['grammar']['study'], 'practice': SOUL['practice'],
    'dev_curve': PAT['devotion']['xp']['curve'], 'dev_start': PAT['devotion']['start'],
    'tag_caps': PAT['devotion']['tag_caps'],
    'grade_up': SV['grade_up'], 'ceiling': SV['rewards']['ceiling'], 'vault': SV['vault'],
    'cap_by_level': RULES['character']['creation']['attributes']['cap_by_level'],
    'feelings': len(FEEL['items']), 'feel_start': FEEL['start_count'],
    'words': len(SIG['items']), 'words_start': SIG['grammar']['starting']['words'],
    'modules': sum(1 for m in SOUL['items'] if not m.get('locked')),
    'forms': len(FIG['forms']),
    'techniques': len(TECH['items']), 'train': SV['train'], 'training': SV['training'], 'shrine_rite': SV['shrine']['rite'],
    'rarity_price': {k: v['price'] for k, v in RULES['rarity'].items() if isinstance(v, dict) and 'price' in v},
    'shields': sum(1 for w in WEAP['items'] if w.get('category') == 'shield'),
    'weapon_prices': sorted(w['price_credits'] for w in WEAP['items'] if isinstance(w.get('price_credits'), (int, float))),
}
FAMILY = {}   # attribute -> {alpha, beta, gamma} (skills.json items[].attribute, .slot)
for s in SKILLS['items']:
    FAMILY.setdefault(s['attribute'], {})[s['slot']] = s['id']

# ---------------------------------------------------------------- ASSUMED (the time model; no data holds these)
ASSUMED = {
    'turn_min_l1': 1.25,          # a player's 6-AP turn at level 1, in minutes (read the board, act, watch it resolve)
    'turn_min_per_level': 0.05,   # more to choose each level (techniques, longer Lines, feelings): 2.2 min at level 20
    'foe_turn_min': 0.15,         # one foe's animated turn
    'foes_solo': 3,               # foes on the board for one character (the budget scales them with the squad)
    'rounds_vs_target': 1.1,      # standard fights run about 10% over survival.json rounds (0.33 and 0.34 MEASURES)
    'rounds_per_level': 0.0,      # 01 T12: turns to drop a same-level foe at level 20 are at or under level 1's once Margins count
    'after_fight_min': 2.0,       # the field's 3 rounds (no foes) and the reward panel
    'node_min': {'shop': 4, 'forge': 3, 'rest': 2, 'training': 2, 'shrine': 2, 'event': 2, 'cache': 1, 'vault': 1.5},
    'choose_min': 0.5,            # reading the map and choosing the next node
    'camp_min': 5, 'boon_min': 1.5,
    'gear_share': 0.5,            # of credits earned, the share spent on grades, mods and armour (the rest: rounds, cores, stims, repair)
    'gear_share_by': {'specialist': 0.6, 'two doors': 0.5, 'wide': 0.4, 'wall': 0.7},  # a melee wall buys no rounds and no cores; a gun-and-magic character buys both
}
# A route through one map, in its two halves (15 rows; survival.json map.expect.path gives the ranges). Half A is
# rows 1 to 8 and ends on the gate Elite; half B is rows 9 to 15 and ends on the Boss. The same totals as the first
# draft: 6 fights, 2 Elites, the Boss, 2 shops, a Forge, a rest, and half a training ground, shrine, cache, event and vault.
HALF_A = {'fight': 3, 'shop': 1, 'rest': 0.5, 'training': 0.25, 'event': 0.25, 'cache': 0.25, 'gate': 1}
HALF_B = {'vault_guard': 0.5, 'vault': 0.5, 'fight': 3, 'elite': 1, 'shop': 1, 'forge': 1, 'rest': 0.5, 'training': 0.25,
          'shrine': 0.5, 'event': 0.25, 'cache': 0.25, 'boss': 1}
FIGHTS = ('fight', 'gate', 'elite', 'vault_guard', 'boss')
DEPTH = {'fight': 6, 'gate': 8, 'elite': 11, 'boss': 15, 'vault_guard': 9, 'vault': 9, 'cache': 7}


# ---------------------------------------------------------------- foe levels (ruling D24; the rows are 06's)
def boss_level(m, cap=True):
    """Map m's Boss: 2m + 1 on maps 1 to 5 (the final boss 11), then one level a map, at most 20."""
    B = 2 * m + 1 if m <= 5 else 11 + (m - 5)
    return min(20, B) if cap else B


def foe_level(m, kind, half):
    """Early foes (half A's fights) two under the Boss, late foes one under; Elites, the gate and the vault's guard at the Boss's."""
    B = boss_level(m, cap=False)
    if kind in ('gate', 'elite', 'vault_guard', 'boss'):
        return min(20, B)
    return min(20, max(1, B - 2 if half == 'A' else B - 1))


# ---------------------------------------------------------------- PROPOSED (PROVISIONAL; reasons in 05-pacing.md)
XP_FIGHT_L1, XP_FIGHT_GROWTH = 50, 1.15             # a standard fight's XP at its level: 50 at 1, about 710 at 20
KIND_MULT = {'fight': 1, 'gate': 1.5, 'elite': 1.5, 'boss': 5, 'vault_guard': 1.5, 'cache': 0.25, 'vault': 0}  # today's
WORTH = {-5: 0, -4: 0.33, -3: 0.67, -2: 1, -1: 1, 0: 1, 1: 1.1, 2: 1.2, 3: 1.3, 4: 1.4, 5: 1.5}  # foe level - yours
CAP_BY_LEVEL = {1: 7, 5: 8, 10: 9, 15: 10}
RANK_LEVELS = {'I': 3, 'II': 5, 'III': 15}
SWAP = {4: (2, 0), 5: (1, 1), 14: (2, 0), 15: (1, 1)}   # B12: (Skill, Attribute) points at the four swapped levels
DRILL_PER_KILL = {'vermin': 20, 'minion': 35, 'soldier': 70, 'elite': 180, 'boss': 360}   # D22
KILLS = {'fight': {'soldier': 1, 'minion': 1, 'vermin': 1}, 'gate': {'elite': 1, 'soldier': 1}, 'elite': {'elite': 1, 'soldier': 1},
         'boss': {'boss': 1, 'soldier': 2}, 'vault_guard': {'elite': 1, 'soldier': 1}}
DRILL_MARKS = [300, 900, 1800]   # today's, kept (no saved mark moves)
OVERFLOW = os.environ.get('PACING_OVERFLOW') == '1'   # a reading only (not proposed): drill a full bar earns passes to the weapon still learning
DRILL_PER_SOAK = 20              # PROPOSED: a shield's drill for each worthy blow its plates soak (B18's unit, on the shield)
SOAKS_A_FIGHT = 5                # ASSUMED: worthy blows a wall's plates soak in a fight
# Drill slots (ASSUMED play): (the share of kills the weapon is in on, or 'shield' for a shield's soaks; whether the
# slot moves to a new weapon at Mark III). Drill goes to every weapon that hit the victim. The main weapon is kept; the
# second hand is the collection, a new weapon each time its bar is full; the rests' and training's drill goes to it.
DRILL_SLOTS = {'specialist': [(0.8, False), (0.5, True)], 'two doors': [(0.6, False), (0.35, True)],
               'wide': [(0.45, False), (0.3, True)], 'wall': [('shield', True), (0.3, True)]}
MARTIAL_MULT = 1.5               # D22
STUDY = {'first': 10, 'step': 60, 'mastery_study': 30, 'copy': 10, 'found': 10, 'rest': 30, 'training': 60}
PRACTICE = {'thresholds': [10], 'then_every': 80, 'mastery_bonus': 40, 'found': 10, 'rest': 40, 'training': 80}
FORM_MARKS = [6, 20, 50]         # 03's form Marks (critic-consistency minor 3)
DEV_CURVE = [0, 10, 25, 42, 68, 100, 140, 185, 225, 260, 300]
DEV_TAGS_A_FIGHT, DEV_FIGHT_CAP, DEV_STAGE_CAP = 2.2, 3, 30
DOOR_MARK_HOURS = [2, 11, 17, 23]   # Mark I, II, the middle, III for a specialist (the charter, section 18)
DOOR_UNITS_A_FIGHT = {           # each door file's own unit and its specialist's count a worthy fight (02, 03, 04 state them)
    'Guard (plates soaked and spent, B18)': 9, 'Momentum (chain steps spent)': 9, 'Pressure (pips spent)': 9,
    'Shadow (Shadow spent in a Break)': 9, 'Sigils (glyphs past the first)': 10.5, 'Figments (blows; 2 a Figment cashed)': 9,
    'Bonds (Bonds snapped)': 4.5, 'Outbursts (stages Released)': 7, 'Prayer (Grace spent)': 6}
FINDS = ['fine', 'fine', 'masterwork', 'masterwork', 'relic', 'relic', 'relic', 'relic', 'relic', 'celestial']   # D25, by map, the last repeats
SHELF = ['fine', 'fine', 'masterwork', 'masterwork', 'masterwork', 'relic']                                     # D25: Relic sold only in endless
STEP_FLOOR = {'fine': 1500, 'masterwork': 3500, 'relic': 12000}  # D26's floors
PLACE = {'shop': 1.0, 'forge': 0.8}
PARTY_PACE = [1, 1.6, 2.2, 2.8]  # D27, squads of 1 to 4 (PROVISIONAL until a co-op playtest)
MODULES_OPEN = 23                # 04 2(e): an Outburst specialist's gates open 19, its six spare points the rest to 23
FEELING_UNLOCK_EVERY_H = 2.5     # a reading until the simulator counts each trigger (05 section 4)


def sect(title):
    print('\n## ' + title + '\n')


def table(head, rows):
    print('| ' + ' | '.join(head) + ' |')
    print('|' + ' --- |' * len(head))
    for r in rows:
        print('| ' + ' | '.join(str(x) for x in r) + ' |')


def nice(x):
    """Round to two significant figures, so a number on the screen reads clean."""
    if x <= 0:
        return 0
    d = 10 ** max(0, int(math.floor(math.log10(x))) - 1)
    return int(round(x / d) * d)


def fmt(n):
    return '{:,}'.format(int(round(n)))


# ---------------------------------------------------------------- the time model
def fight_min(kind, L, squad=1):
    A = ASSUMED
    rounds = TODAY['rounds'][kind] * A['rounds_vs_target'] * (1 + A['rounds_per_level'] * (L - 1))
    per_round = squad * (A['turn_min_l1'] + A['turn_min_per_level'] * (L - 1)) + squad * A['foes_solo'] * A['foe_turn_min']
    return rounds * per_round + A['after_fight_min'], rounds


def half_minutes(half, L, squad=1):
    A, total = ASSUMED, 0.0
    for k, n in (HALF_A if half == 'A' else HALF_B).items():
        total += n * (fight_min(k, L, squad)[0] if k in FIGHTS else A['node_min'][k] * (1 + 0.25 * (squad - 1))) + n * A['choose_min']
    return total


def node_xp(m, kind, half, my_level):
    lv = foe_level(m, kind, half)
    gap = max(-5, min(5, lv - my_level))
    return XP_FIGHT_L1 * XP_FIGHT_GROWTH ** (lv - 1) * KIND_MULT[kind] * WORTH[gap]


def designed_level(m, half):
    """The level a character holds while walking half A or B of map m (D24: two levels a map to 11, then one a map)."""
    if m <= 5:
        return 2 * m - 1 if half == 'A' else 2 * m
    return min(20, boss_level(m) - 1) if boss_level(m) > boss_level(m - 1) else 20


_MAPS = {}


def maps(n=18, squad=1):
    """Each map's halves: start and end hour, the level held, XP earned, fights."""
    if (n, squad) in _MAPS:
        return _MAPS[(n, squad)]
    out, h = [], 0.0
    for m in range(1, n + 1):
        row = {'map': m, 'from': h}
        for half in ('A', 'B'):
            L = designed_level(m, half)
            mins = half_minutes(half, L, squad) + (ASSUMED['camp_min'] if (m == 1 and half == 'A') else 0) + (ASSUMED['boon_min'] if half == 'B' else 0)
            nodes = HALF_A if half == 'A' else HALF_B
            xp = sum(n_ * node_xp(m, k, half, L) for k, n_ in nodes.items() if k in KIND_MULT)
            fights = sum(n_ for k, n_ in nodes.items() if k in FIGHTS)
            row[half] = {'from': h, 'to': h + mins / 60, 'L': L, 'xp': xp, 'fights': fights}
            h += mins / 60
        row['to'] = h
        out.append(row)
    _MAPS[(n, squad)] = out
    return out


def level_anchors():
    """xp_total from the maps: level 2m at map m's gate and 2m + 1 at its Boss (m <= 5); then one level at each Boss."""
    out, hours, cum = {1: 0}, {1: 0.0}, 0.0
    for mp in maps():
        m = mp['map']
        for half in ('A', 'B'):
            cum += mp[half]['xp']
            if m <= 5:
                L = 2 * m if half == 'A' else 2 * m + 1
            else:
                L = boss_level(m) if half == 'B' else None
            if L and L <= 20 and L not in out:
                out[L] = cum
                hours[L] = mp[half]['to']
    table_, run = {1: 0}, 0
    for L in range(2, 21):           # each level's own XP to two figures, then summed, so the table reads clean
        run += nice(out[L] - out[L - 1])
        table_[L] = run
    return table_, hours


XP_TOTAL, LEVEL_HOUR = level_anchors()


def map_at(h):
    for mp in maps():
        if mp['from'] <= h < mp['to']:
            return mp
    return maps()[-1]


# ---------------------------------------------------------------- sections
def s_time():
    sect('1. Time: a fight (solo; ASSUMED block)')
    rows = []
    for k in ('fight', 'elite', 'boss'):
        for L in (1, 10, 20):
            mi, r = fight_min(k, L)
            rows.append((k, L, round(r, 1), round(mi, 1)))
    table(['kind', 'level', 'rounds', 'minutes (fight + field + reward)'], rows)


def s_levels():
    sect('1b. Foe levels by map (ruling D24; 06 owns the rows) and the hours each map takes (solo)')
    rows = []
    for mp in maps():
        m = mp['map']
        rows.append((m, 'map %d' % m if m <= 5 else 'endless %d' % (m - 5), foe_level(m, 'fight', 'A'), foe_level(m, 'fight', 'B'),
                     boss_level(m), '%d / %d' % (designed_level(m, 'A'), min(20, boss_level(m))),
                     round(mp['from'], 1), round(mp['to'], 1), round(mp['to'] - mp['from'], 2),
                     FINDS[min(m - 1, len(FINDS) - 1)], SHELF[min(m - 1, len(SHELF) - 1)]))
    table(['map', 'name', 'early foes (rows 1-7)', 'late foes (rows 9-14)', 'Elites, gate, vault guard, Boss', 'character arrives / leaves at',
           'starts (h)', 'ends (h)', 'hours', 'finds and the vault (D25)', 'shelf (D25)'], rows)


def s_xp():
    sect('2. The XP table (rules.json character.levels.xp_total), derived from the maps')
    rows = []
    for L in range(2, 21):
        mp = map_at(LEVEL_HOUR[L] - 1e-6)
        fe = (XP_TOTAL[L] - XP_TOTAL[L - 1]) / (XP_FIGHT_L1 * XP_FIGHT_GROWTH ** (L - 2))
        where = ('map %d, its %s' % (mp['map'], 'gate' if L % 2 == 0 else 'Boss')) if L <= 11 else 'map %d (endless %d), its Boss' % (mp['map'], mp['map'] - 5)
        rows.append((L, where, round(LEVEL_HOUR[L], 1), fmt(XP_TOTAL[L] - XP_TOTAL[L - 1]), fmt(XP_TOTAL[L]), fmt(TODAY['xp_total'][L]),
                     nice(XP_FIGHT_L1 * XP_FIGHT_GROWTH ** (L - 1)), round(fe, 1)))
    table(['level', 'lands as this falls', 'hour (solo)', 'XP for it', 'xp_total PROPOSED', 'xp_total today',
           'fight_xp at this level', 'standard fights of the level before, for it'], rows)
    print('\nThe worth of a fight by its level against yours (PROPOSED; foe level minus yours):\n')
    table(['gap'] + [str(g) for g in sorted(WORTH)], [['worth'] + [WORTH[g] for g in sorted(WORTH)]])
    t = TODAY['xp']
    pay = 0
    for k, n in list(HALF_A.items()) + list(HALF_B.items()):
        if k in KIND_MULT:
            kk = 'elite' if k == 'gate' else k
            pay += n * (t['base'] + t['per_depth'] * (DEPTH.get(k, 6) - 1)) * (1 if kk == 'fight' else t[kk])
    print('\nToday a stage-1 map pays about %d XP a character (survival.json xp); with today\'s xp_total that is level %d after map 1.'
          % (pay, max(L for L, x in TODAY['xp_total'].items() if x <= pay)))


def points_at(L):
    sp, ap = 10, 10
    for l in range(2, L + 1):
        s, a = SWAP.get(l, (2, 0) if l % 2 else (1, 1))
        sp += s; ap += a
    return sp, ap


def cap_at(L):
    return max(v for l, v in CAP_BY_LEVEL.items() if L >= l)


def reach_step(skills, attr):
    """The highest Reach step (1, 4, 7, 10) a door holds by B13: 7 needs its beta at 4; 10 needs the beta at 7 and the gamma at 4."""
    f = FAMILY[attr]
    a, b, g = skills.get(f['alpha'], 0), skills.get(f['beta'], 0), skills.get(f['gamma'], 0)
    if a >= 10 and b >= 7 and g >= 4:
        return 10
    if a >= 7 and b >= 4:
        return 7
    if a >= 4:
        return 4
    return 1 if a >= 1 else 0


def plan(wants, L_max=20):
    """A greedy spend plan: `wants` is an ordered list of (skill or None, attribute, target); each level the points go to
    the first want that is not met and is legal (skill <= attribute <= the level's ceiling). An Attribute point waits
    (held, as c.unspent.attr allows) when every want it could serve is blocked by the ceiling."""
    attrs, skills, log = {}, {}, []
    sp_used = ap_used = 0
    for L in range(1, L_max + 1):
        sp, ap = points_at(L)
        cap = cap_at(L)
        moved = True
        while moved:
            moved = False
            for skill, attr, target in wants:
                a = attrs.get(attr, 1)
                if skill is None:
                    if a < min(target, cap) and ap_used < ap:
                        attrs[attr] = a + 1; ap_used += 1; moved = True; break
                    continue
                s = skills.get(skill, 0)
                if s >= target:
                    continue
                if s + 1 > a:
                    if a < cap and ap_used < ap:
                        attrs[attr] = a + 1; ap_used += 1; moved = True; break
                    continue
                if sp_used < sp:
                    skills[skill] = s + 1; sp_used += 1; moved = True; break
        log.append((L, dict(attrs), dict(skills), sp - sp_used, ap - ap_used))
    return log


def W(attr, *steps):
    """Wants for one door: (slot, target) pairs in order, on the attribute's family ('attr' is the attribute itself)."""
    return [(FAMILY[attr][slot] if slot != 'attr' else None, attr, t) for slot, t in steps]


PLANS = {
    'specialist (a Breaker: one door to its top)': (['strength'],
        W('strength', ('alpha', 7), ('beta', 4), ('alpha', 10), ('beta', 7), ('gamma', 4), ('beta', 10), ('gamma', 10))
        + W('endurance', ('attr', 4), ('beta', 4), ('alpha', 4), ('attr', 10)) + W('agility', ('attr', 3))),
    'two doors (a Breaker with Sigils: one door to its top, the second a step under)': (['strength', 'intelligence'],
        W('strength', ('alpha', 7)) + W('intelligence', ('alpha', 3)) + W('strength', ('beta', 4), ('alpha', 10))
        + W('intelligence', ('alpha', 7), ('beta', 4)) + W('strength', ('beta', 7), ('gamma', 4))
        + W('intelligence', ('alpha', 9)) + W('endurance', ('attr', 4), ('beta', 3))),
    'wide (four doors at 4 to 5: Pressure, Sigils, Outbursts, Prayer)': (['agility', 'intelligence', 'determination', 'virtue'],
        W('agility', ('alpha', 4)) + W('intelligence', ('alpha', 3)) + W('determination', ('alpha', 2)) + W('virtue', ('alpha', 1))
        + W('agility', ('alpha', 5)) + W('intelligence', ('alpha', 5)) + W('determination', ('alpha', 5)) + W('virtue', ('alpha', 5))
        + W('agility', ('beta', 4)) + W('intelligence', ('beta', 4)) + W('determination', ('beta', 4)) + W('virtue', ('beta', 4))
        + W('endurance', ('attr', 4)) + W('agility', ('gamma', 1)) + W('virtue', ('gamma', 1))),
    'wall (a Bulwark: Guard to its top, no faith)': (['endurance'],
        W('endurance', ('alpha', 7), ('beta', 4), ('alpha', 10), ('beta', 7), ('gamma', 4), ('beta', 10), ('gamma', 10))
        + W('agility', ('attr', 5), ('beta', 3)) + W('strength', ('attr', 4), ('alpha', 3)) + W('perception', ('attr', 5), ('alpha', 2))),
}


def plan_rows(doors, log):
    rows, last = [], {}
    for L, a, s, su, au in log:
        what = []
        for d in doors:
            st = reach_step(s, d)
            if st != last.get(d):
                what.append('%s Reach step %d' % (d.capitalize(), st))
                last[d] = st
            if s.get(FAMILY[d]['alpha'], 0) >= 8 and ('push', d) not in last:
                what.append('%s Push (8)' % d.capitalize()); last[('push', d)] = True
        if L in (1, 3, 4, 5, 10, 14, 15, 16, 20) or what:
            rows.append((L, ' '.join('%s %d' % (k[:3].capitalize(), v) for k, v in a.items()),
                         ', '.join('%s %d' % (k.replace('_', ' '), v) for k, v in s.items()),
                         '%d / %d' % (su, au), '; '.join(what)))
    return rows


def s_points():
    sect('3. Ceilings, ranks, points (B11, B12) and four spend plans (B13)')
    rows = []
    for L in range(1, 21):
        sp, ap = points_at(L)
        p0, a0 = points_at(L - 1) if L > 1 else (0, 0)
        rows.append((L, cap_at(L), '%d / %d' % (sp - p0, ap - a0) if L > 1 else 'creation 10 / 10', sp, ap,
                     ', '.join(r for r, l in RANK_LEVELS.items() if l == L) or ''))
    table(['level', 'attribute ceiling', 'this level gives (Skill / Attribute)', 'Skill points (career)', 'Attribute points (career, above the 1s)', 'class rank'], rows)
    for name, (doors, wants) in PLANS.items():
        print('\n**' + name + '**\n')
        table(['level', 'attributes above 1', 'skills', 'unspent S / A', 'door steps reached'], plan_rows(doors, plan(wants)))


def fights_between(h0, h1, squad=1):
    """Worthy fights walked between two hours (the reference route; every fight is worthy, its gap -1 to +2)."""
    n = 0.0
    for mp in maps(squad=squad):
        for half in ('A', 'B'):
            a, b = mp[half]['from'], mp[half]['to']
            lo, hi = max(a, h0), min(b, h1)
            if hi > lo:
                n += mp[half]['fights'] * (hi - lo) / (b - a)
    return n


def per_hour_track(per_fight, extra_per_map=0.0):
    """A function hour -> cumulative amount, for a gain per worthy fight and an amount a map out of fights."""
    def f(h):
        x = 0.0
        for mp in maps():
            a, b = mp['from'], mp['to']
            if h > a:
                x += extra_per_map * min(1.0, (h - a) / (b - a))
        return fights_between(0, h) * per_fight + x
    return f


def cross(f, thresholds, h_max=60.0, step=0.05):
    out, i, h = [], 0, 0.0
    while i < len(thresholds) and h < h_max:
        if f(h) >= thresholds[i]:
            out.append(h); i += 1
            continue
        h += step
    return out


def drill_track(mult):
    kills = {k: sum(DRILL_PER_KILL[t] * n for t, n in v.items()) for k, v in KILLS.items()}
    n_f = sum(HALF_A.get(k, 0) + HALF_B.get(k, 0) for k in FIGHTS)
    per_fight = sum((HALF_A.get(k, 0) + HALF_B.get(k, 0)) * kills[k] for k in KILLS) / n_f
    rest = (HALF_A['rest'] + HALF_B['rest']) * TODAY['train']['drill'] * 0.5 + (HALF_A['training'] + HALF_B['training']) * TODAY['training']['drill'] * 0.5
    return per_hour_track(per_fight * mult, rest), per_fight


def main_swaps():
    """The hours a character takes a better-grade weapon of a new id as its main (ASSUMED play): the first Masterwork,
    Relic and Celestial found (each map's vault and Boss picks), then each Celestial Boss pick (one Boss in four)."""
    hs = [first_found(g)['B']['from'] + 0.1 for g in ('masterwork', 'relic', 'celestial')]
    cel = first_found('celestial')['map']
    hs += [mp['to'] for mp in maps() if mp['map'] > cel and (mp['map'] - cel) % 4 == 0]
    return hs


def weapon_marks(slots, mult, h_max=50.0, dt=0.05):
    """Parallel drill bars: each slot fills by its share of the kills (or a shield by its soaks); the rests' and the
    training grounds' drill goes to the last rotating bar; a rotating bar at Mark III passes to a new weapon; the main
    (the first weapon slot) passes to a new weapon at each better grade taken (main_swaps)."""
    swaps = sorted(main_swaps())
    main = next(i for i, (sh, _) in enumerate(slots) if sh != 'shield')
    kills_f, _ = drill_track(1.0)
    rest_f = per_hour_track(0.0, (HALF_A['rest'] + HALF_B['rest']) * TODAY['train']['drill'] * 0.5 + (HALF_A['training'] + HALF_B['training']) * TODAY['training']['drill'] * 0.5)
    soak_f = per_hour_track(DRILL_PER_SOAK * SOAKS_A_FIGHT)
    bars = [0.0 for _ in slots]
    ids = list(range(1, len(slots) + 1))
    learner = max(i for i, (_, rot) in enumerate(slots) if rot) if any(r for _, r in slots) else 0
    nxt, out, h = len(slots) + 1, [], 0.0
    shields_done = [1]                # a wall can drill every shield row there is, and no more
    while h < h_max:
        if swaps and h >= swaps[0]:
            swaps.pop(0); bars[main] = 0.0; ids[main] = nxt; nxt += 1
        dk = kills_f(h + dt) - kills_f(h) - (rest_f(h + dt) - rest_f(h))
        dr = rest_f(h + dt) - rest_f(h)
        ds = soak_f(h + dt) - soak_f(h)
        spill = 0.0
        for i, (sh, rot) in enumerate(slots):
            if bars[i] >= DRILL_MARKS[-1]:    # a full bar's drill passes to the weapon still learning (OVERFLOW)
                spill += (ds if sh == 'shield' else dk * sh) * mult if OVERFLOW else 0.0
        for i, (sh, rot) in enumerate(slots):
            if bars[i] >= DRILL_MARKS[-1]:
                continue                  # a kept weapon at Mark III: its bar is full
            gain = (ds if sh == 'shield' else dk * sh) * mult + ((dr + spill) if i == learner else 0)
            before = bars[i]
            bars[i] += gain
            for k, t in enumerate(DRILL_MARKS):
                if before < t <= bars[i]:
                    out.append((h + dt, ids[i], k + 1))
            if bars[i] >= DRILL_MARKS[-1] and rot and not (sh == 'shield' and shields_done[0] >= TODAY['shields']):
                bars[i] = 0.0; ids[i] = nxt; nxt += 1
                if sh == 'shield':
                    shields_done[0] += 1
        h += dt
    return out


def door_thresholds(units):
    return [int(round(units * fights_between(0, h))) for h in DOOR_MARK_HOURS]


def dev_track(tags=DEV_TAGS_A_FIGHT):
    fights_per_map = sum(HALF_A.get(k, 0) + HALF_B.get(k, 0) for k in FIGHTS)
    per_map = min(DEV_STAGE_CAP, fights_per_map * min(tags, DEV_FIGHT_CAP))
    extra = (HALF_A['rest'] + HALF_B['rest']) * TODAY['train']['devotion'] * 0.5 + HALF_B['shrine'] * TODAY['shrine_rite']
    return per_hour_track(per_map / fights_per_map, extra)


def study_track(evokes):
    extra = (HALF_A['rest'] + HALF_B['rest']) * STUDY['rest'] * 0.5 + (HALF_A['training'] + HALF_B['training']) * STUDY['training'] * 0.5
    return per_hour_track(evokes * 3, extra)


def practice_track(releases):
    extra = (HALF_A['rest'] + HALF_B['rest']) * PRACTICE['rest'] * 0.5 + (HALF_A['training'] + HALF_B['training']) * PRACTICE['training'] * 0.5
    return per_hour_track(releases * 4, extra)


def found_spells(h):
    """Found spells (ASSUMED reading): one an hour from hour 5 (five or six words known) to hour 20, then one every two hours."""
    return sum(1 for x in range(5, int(h)) if x < 20 or x % 2 == 0)


def s_practice():
    sect('4. Practice tracks: per worthy fight and per hour (solo; every fight on the route is worthy)')
    f1 = fights_between(0, maps()[0]['to']) / maps()[0]['to']
    f14 = fights_between(maps()[12]['to'], maps()[13]['to']) / (maps()[13]['to'] - maps()[12]['to'])
    print('Worthy fights an hour: %.1f on map 1, %.1f on map 14.\n' % (f1, f14))
    rows = []
    for name, mult in (('one weapon in every fight', 1.0), ('a martial class (x%.1f)' % MARTIAL_MULT, MARTIAL_MULT)):
        f, pf = drill_track(mult)
        rows.append(('weapon drill, ' + name, 'about %d' % (pf * mult), 'Mark I %.1f h, II %.1f h, III %.1f h' % tuple(cross(f, DRILL_MARKS))))
    for who, ev in (('a Sigil specialist (3 Evokes a fight)', 3), ('a two-door character (2)', 2), ('a wide character (1.2)', 1.2)):
        f = study_track(ev)
        hs = cross(f, [STUDY['first'] + STUDY['step'] * i for i in range(40)])
        rows.append(('Sigil study, ' + who, '%d' % (ev * 3), 'a word every %.1f h on average; %d learned by hour 48 from study alone' % (
            (hs[-1] - hs[0]) / max(1, len(hs) - 1), sum(1 for h in hs if h <= 48))))
    for who, rel in (('an Outburst specialist (2 Releases a fight)', 2), ('a wide character (0.8)', 0.8)):
        f = practice_track(rel)
        hs = cross(f, [PRACTICE['thresholds'][0] + PRACTICE['then_every'] * i for i in range(40)])
        rows.append(('Outburst practice, ' + who, '%d' % (rel * 4), 'a module every %.1f h on average; %d by hour 45 from practice alone' % (
            (hs[-1] - hs[0]) / max(1, len(hs) - 1), sum(1 for h in hs if h <= 45))))
    f = per_hour_track(1.0)
    rows.append(('one Figment form held through every fight', '1', 'form Mark I %.1f h, II %.1f h, III %.1f h' % tuple(cross(f, FORM_MARKS))))
    f = dev_track()
    hs = cross(f, [DEV_CURVE[d] for d in (3, 5, 7, 10)])
    hs_now = cross(f, [TODAY['dev_curve'][d] for d in (3, 5, 7, 10)], h_max=90)
    rows.append(('Devotion (liked tags, a rest\'s rite, the shrine)', '%.1f tag XP (cap %d a fight, %d a map)' % (DEV_TAGS_A_FIGHT, DEV_FIGHT_CAP, DEV_STAGE_CAP),
                 'from 0: standing 3 at %.1f h, 5 at %.1f, 7 at %.1f, 10 at %.1f (today\'s curve at this rate: %s)' % (tuple(hs) + (', '.join('%.1f' % x for x in hs_now),))))
    table(['track', 'per worthy fight', 'when'], rows)
    print('\nA door\'s Marks: each threshold = the door\'s units a worthy fight x the worthy fights a specialist has walked by hours %s (%s fights):\n'
          % (DOOR_MARK_HOURS, ', '.join('%.1f' % fights_between(0, h) for h in DOOR_MARK_HOURS)))
    table(['door (its unit)', 'units a worthy fight (the door file\'s)', 'Mark I', 'Mark II', 'middle', 'Mark III'],
          [(d, u, *door_thresholds(u)) for d, u in DOOR_UNITS_A_FIGHT.items()])


def eighty_at(H):
    """What each door's specialist holds at hour H, by system."""
    w = sum(1 for _, _, mk in weapon_marks(DRILL_SLOTS['specialist'], MARTIAL_MULT, h_max=H) if mk == 3)
    out_c = sum(1 for _, _, mk in weapon_marks([(0.8, True), (0.5, True)], MARTIAL_MULT, h_max=H) if mk == 3)
    out = {'techniques': min(TODAY['techniques'], 4 + round(w * 3 * 0.92)),
           'techniques (a collector)': min(TODAY['techniques'], 4 + round(out_c * 3 * 0.92))}
    f = study_track(3)
    g = lambda h: f(h) + STUDY['found'] * found_spells(h) + STUDY['mastery_study'] * min(12, int(h / 4))
    learned = len(cross(g, [STUDY['first'] + STUDY['step'] * i for i in range(40)], h_max=H))
    out['words'] = min(TODAY['words'], learned + TODAY['words_start'], 4 + 3 * 10 + 3)   # B19: words held 4 + 3 x Brain Power, + the 3 Mastered free words
    f = practice_track(2)
    g = lambda h: f(h) + PRACTICE['found'] * found_spells(h) + PRACTICE['mastery_bonus'] * min(12, int(h / 4))
    out['modules'] = min(MODULES_OPEN, len(cross(g, [PRACTICE['thresholds'][0] + PRACTICE['then_every'] * i for i in range(40)], h_max=H)) + 3)
    out['feelings'] = min(TODAY['feelings'], TODAY['feel_start'] + int(H / FEELING_UNLOCK_EVERY_H))
    per_form = per_hour_track(3.0)(H) / 7.5   # 03: about 3 forms held a fight, over the 7 or 8 forms it uses
    out['forms'] = sum(sum(1 for t in FORM_MARKS if (per_form if i < 7 else per_form * 0.3) >= t) for i in range(TODAY['forms']))
    out['weapons'] = w
    return out


def s_eighty():
    sect("4b. The 80% (ruling D23): each system its door opens, for that door's specialist, at level 20 and at hour 50")
    a, b = eighty_at(LEVEL_HOUR[20]), eighty_at(50)
    tot = {'techniques': TODAY['techniques'], 'techniques (a collector)': TODAY['techniques'], 'words': TODAY['words'], 'modules': TODAY['modules'], 'feelings': TODAY['feelings'], 'forms': TODAY['forms'] * 3}
    how = {'techniques (a collector)': 'both hands move to a new weapon at Mark III',
           'techniques': 'a martial specialist keeping its main weapon until a better grade, its second hand drilling the collection: %d and %d weapons to Mark III; 4 at the start, 3 a weapon, one signature in twelve repeats' % (a['weapons'], b['weapons']),
           'words': 'study, found spells, 12 Mastery levels x %d study; held at most 4 + 3 x Brain Power and the 3 Mastered free words (37)' % STUDY['mastery_study'],
           'modules': 'practice, found designs, 12 Mastery levels x %d, 3 Mastered free picks; at most the %d its gates and six spare points open (04 2(e))' % (PRACTICE['mastery_bonus'], MODULES_OPEN),
           'feelings': "Mark I of each feeling's bar", 'forms': 'Figment form Marks, about 3 forms held a fight over 7 or 8 forms (03)'}
    table(['system', 'how', 'at level 20 (hour %.0f)' % LEVEL_HOUR[20], 'at hour 50', 'of'],
          [(k, how[k], '%d (%d%%)' % (a[k], 100 * a[k] / tot[k]), '%d (%d%%)' % (b[k], 100 * b[k] / tot[k]), tot[k]) for k in tot])


def step_price(base, frm, to, place):
    rp = TODAY['rarity_price']
    return max(STEP_FLOOR[to], base * (rp[to] - rp[frm])) * PLACE[place]


def gear_buys(who=''):
    t, buys, money = TODAY['credits'], [], 0.0
    med = TODAY['weapon_prices'][len(TODAY['weapon_prices']) // 2]
    order = [('Fine weapon (Forge step)', 'fine', step_price(med, 'standard', 'fine', 'forge')),
             ('Medium armour', 'fine', 250),
             ('Masterwork weapon (Forge step)', 'masterwork', step_price(med, 'fine', 'masterwork', 'forge')),
             ('first mod, fitted', 'masterwork', 480), ('Heavy armour', 'masterwork', 600),
             ('Masterwork armour (two Forge steps)', 'masterwork', step_price(600, 'standard', 'fine', 'forge') + step_price(600, 'fine', 'masterwork', 'forge')),
             ('second mod, fitted', 'masterwork', 480),
             ('Relic weapon (Forge step)', 'relic', step_price(med, 'masterwork', 'relic', 'forge')),
             ('Relic armour (Forge step)', 'relic', step_price(600, 'masterwork', 'relic', 'forge'))]
    if who == 'wall':                 # a wall puts its credits into its armour first (Assault: armour_fit 4, gated by Pain Threshold)
        order += [('Assault armour (fit)', 'masterwork', SV['armour_fit']['price']['4']),
                  ('Masterwork Assault armour (two Forge steps)', 'masterwork', step_price(1200, 'standard', 'fine', 'forge') + step_price(1200, 'fine', 'masterwork', 'forge')),
                  ('Relic Assault armour (Forge step)', 'relic', step_price(1200, 'masterwork', 'relic', 'forge'))]
    for piece in ('second weapon or shield', 'off-hand focus or sidearm', 'third carried piece'):   # every carried piece, one at a time
        order += [('Masterwork %s (two Forge steps)' % piece, 'masterwork', step_price(med, 'standard', 'fine', 'forge') + step_price(med, 'fine', 'masterwork', 'forge')),
                  ('Relic %s (Forge step)' % piece, 'relic', step_price(med, 'masterwork', 'relic', 'forge'))]
    order += [('re-forge a property (Forge)', 'relic', STEP_FLOOR['relic'] * PLACE['forge'])] * 12   # PROPOSED: the peak's sink
    rows, i = [], 0
    rank = ['standard', 'fine', 'masterwork', 'relic', 'celestial']
    for mp in maps():
        s = mp['map']
        stage_k = 1 + SV['stage']['credits'] * (s - 1)
        income = 0
        for k, n in list(HALF_A.items()) + list(HALF_B.items()):
            if k in DEPTH:
                kk = 'elite' if k == 'gate' else k
                income += n * (t['base'] + t['per_depth'] * DEPTH[k]) * (1 if kk == 'fight' else t[kk]) * stage_k
        shelf = SHELF[min(s - 1, len(SHELF) - 1)]
        for j in range(20):
            money += income * ASSUMED['gear_share_by'].get(who, ASSUMED['gear_share']) / 20
            h = mp['from'] + (mp['to'] - mp['from']) * (j + 1) / 20
            while i < len(order) and rank.index(order[i][1]) <= rank.index(shelf) and money >= order[i][2]:
                money -= order[i][2]; buys.append((order[i][0], round(h, 1), s, fmt(order[i][2]))); i += 1
        if s <= 16:
            rows.append((s, round(mp['to'], 1), fmt(income), fmt(income / (mp['to'] - mp['from'])), FINDS[min(s - 1, 9)], shelf))
    return rows, buys, med


def first_found(grade):
    for mp in maps():
        if FINDS[min(mp['map'] - 1, 9)] == grade:
            return mp
    return None


def s_credits():
    sect('5. Credits by map, the one grade-step price (D26) and the gear calendar')
    rows, buys, med = gear_buys()
    table(['map', 'ends at hour', 'credits a map (a character)', 'an hour', 'finds and the vault', 'shelf (sold, and the steps)'], rows)
    print('\nThe one grade-step price: max(the step\'s floor, priceOf(item, to) - priceOf(item, from)) x the place (shop 1, Forge 0.8):\n')
    prows = [(fmt(b), *[fmt(step_price(b, a, c, 'forge')) for a, c in (('standard', 'fine'), ('fine', 'masterwork'), ('masterwork', 'relic'))])
             for b in (100, med, 2000, 4500, 8000)]
    table(['item price', 'to Fine (Forge)', 'to Masterwork (Forge)', 'to Relic (Forge)'], prows)
    print('\nBought with %d%% of income (ASSUMED), in this order (the median weapon: %d credits):\n' % (100 * ASSUMED['gear_share'], med))
    table(['purchase', 'hour', 'map', 'price'], buys)
    for g in ('masterwork', 'relic', 'celestial'):
        mp = first_found(g)
        print('\nFirst %s found: map %d (its vault and its Boss picks), hours %.1f to %.1f.' % (g, mp['map'], mp['from'], mp['to']))


def s_coop():
    sect('6. Co-op (D27): the hours by squad size, against the party_pace row')
    rows = []
    for n in (1, 2, 3, 4):
        ms = maps(14, squad=n)
        rows.append((n, round(ms[4]['to'], 1), round(ms[13]['to'], 1), round(ms[13]['to'] / maps(14)[13]['to'], 2), PARTY_PACE[n - 1]))
    table(['squad', 'map 5 ends (h)', 'map 14 ends, level 20 (h)', 'x solo', 'party_pace (D27)'], rows)


def calendar():
    """What each of four characters gains in each hour 0..49, from the proposed rates."""
    who_all = ('specialist', 'two doors', 'wide', 'wall')
    ev = {w: {h: [] for h in range(60)} for w in who_all}

    def add(who, h, what):
        if 0 <= h < 50:
            ev[who][int(h)].append(what)
    for who in who_all:
        for L in range(2, 21):
            add(who, LEVEL_HOUR[L] - 1e-6, 'L%d' % L)
    for who, slots in DRILL_SLOTS.items():
        for h, w, mk in weapon_marks(slots, MARTIAL_MULT):
            add(who, h, 'w%d M%s' % (w, 'I' * mk))
    base = per_hour_track(1.0)
    thr = [fights_between(0, h) for h in DOOR_MARK_HOURS]
    for who, ks in (('specialist', [1]), ('wall', [1]), ('two doors', [0.6, 0.4]), ('wide', [0.3] * 4)):
        for j, k in enumerate(ks):
            for i, h in enumerate(cross(lambda h, k=k: base(h) * k, thr, h_max=50)):
                add(who, h, 'door%s %s' % ('' if j == 0 else str(j + 1), ['I', 'II', 'mid', 'III'][i]))
    for who, evk in (('two doors', 2), ('wide', 1.2)):
        f = study_track(evk)
        g = lambda h, f=f: f(h) + STUDY['found'] * found_spells(h)
        for i, h in enumerate(cross(g, [STUDY['first'] + STUDY['step'] * i for i in range(40)], h_max=50)):
            add(who, h, 'word %d' % (TODAY['words_start'] + i + 1))
        for x in range(5, 50):
            if x < 20 or x % 2 == 0:
                add(who, x + 0.5, 'found spell')
    f = practice_track(0.8)
    for i, h in enumerate(cross(f, [PRACTICE['thresholds'][0] + PRACTICE['then_every'] * i for i in range(40)], h_max=50)):
        add('wide', h, 'module %d' % (i + 2))
    h = 0.0
    for n in range(TODAY['feel_start'] + 1, 26):
        h += FEELING_UNLOCK_EVERY_H * 1.2
        add('wide', h, 'feeling %d' % n)
    for who in who_all:
        for name, hh, _, _ in gear_buys(who)[1]:
            if 'mod' not in name:     # mods land at the Forge (below)
                add(who, hh, name.split(' (')[0])
    for g, word in (('masterwork', 'Masterwork found'), ('relic', 'Relic found')):
        mp = first_found(g)
        for who in who_all:
            add(who, mp['B']['from'] + 0.1, word)
    cel = first_found('celestial')
    for who in who_all:
        for mp in maps():             # mods are fitted only at a Forge (survival.json forge.fit): one at each map's Forge from
            if mp['map'] >= 3:        # Masterwork's slot (map 3), two from the shelf's Relic (map 6: more pieces, more slots)
                add(who, (mp['B']['from'] + mp['B']['to']) / 2, 'mod' if mp['map'] < 6 else 'two mods')
        add(who, cel['B']['from'] + 0.1, 'Celestial (vault)')
        for mp in maps():
            if mp['map'] >= cel['map'] and (mp['map'] - cel['map']) % 4 == 0:
                add(who, mp['to'] - 0.02, 'Celestial (Boss pick, 1 in 4)')
    for mp in maps():
        for who in who_all:
            add(who, mp['to'] - 0.01, 'boon')
            add(who, mp['A']['to'] - 0.01, 'gate pick (%s)' % SHELF[min(mp['map'] - 1, len(SHELF) - 1)])
    f = dev_track()
    for who in ('wide',):             # only a character with Faith can use its standing (the specialist, two doors and wall have none)
        for d, h in zip(range(1, 11), cross(f, DEV_CURVE[1:], h_max=50)):
            add(who, h, 'Dev %d' % d)
    return ev


def s_calendar():
    sect('7. The calendar, hours 0 to 49 (four characters, solo)')
    ev = calendar()
    rows, empty = [], {k: [] for k in ev}
    for h in range(50):
        r = [h]
        for who in ev:
            items = ev[who][h]
            if not items:
                empty[who].append(h)
            r.append(', '.join(items) if items else '**NOTHING**')
        rows.append(r)
    table(['hour', 'specialist', 'two doors', 'wide', 'wall'], rows)
    for who, hs in empty.items():
        print('\n%s: hours with nothing: %s' % (who, hs or 'none'))


SECTIONS = {'time': s_time, 'levels': s_levels, 'xp': s_xp, 'points': s_points, 'practice': s_practice,
            'eighty': s_eighty, 'credits': s_credits, 'coop': s_coop, 'calendar': s_calendar}

if __name__ == '__main__':
    want = sys.argv[1:] or list(SECTIONS)
    print('# Pacing tables (tools/balance/pacing.py; read-only; PROPOSED numbers are PROVISIONAL)')
    for w in want:
        SECTIONS[w]()
