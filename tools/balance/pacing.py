"""Pacing tables for the 0.34 rebalance (docs/design/growth/05-pacing.md).

Reads data (never writes it) and prints the working behind every pacing number in the design file:
the time model, the XP table, the worth of a fight by level gap, the points and three spend plans, the
practice tracks, the credit economy and the 0-to-50-hour calendar for three characters.

    PYTHONUTF8=1 python tools/balance/pacing.py            # every table
    PYTHONUTF8=1 python tools/balance/pacing.py xp credits # only those sections

Every number set in this file under PROPOSED is PROVISIONAL (the design file gives each its reason). The
ASSUMED block is the time model: minutes a player spends, which no data holds; change it here and every
table moves with it. Nothing here is a line to fit to: it is a reading of what the proposal would play like.
"""
import json
import math
import os
import sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))


def load(name):
    with open(os.path.join(ROOT, 'data', name), encoding='utf-8') as f:
        return json.load(f)


RULES, SV, TECH, SIG, SOUL, PAT, FEEL = (load(n) for n in (
    'rules.json', 'survival.json', 'techniques.json', 'sigils.json', 'soul_modules.json', 'patrons.json', 'feelings.json'))

# ---------------------------------------------------------------- TODAY (read from data)
TODAY = {
    'xp_total': {int(k): v for k, v in RULES['character']['levels']['xp_total'].items()},
    'xp': SV['xp'], 'credits': SV['credits'], 'stage': SV['stage'], 'rounds': SV['rounds'],
    'path': SV['map']['expect']['path'], 'rows': SV['map']['rows'],
    'drill': TECH['rules']['drill'], 'study': SIG['grammar']['study'], 'practice': SOUL['practice'],
    'dev_curve': PAT['devotion']['xp']['curve'] if 'devotion' in PAT else None,
    'grade_up': SV['grade_up'], 'ceiling': SV['rewards']['ceiling'], 'vault': SV['vault'],
    'cap_by_level': RULES['character']['creation']['attributes']['cap_by_level'],
    'feelings': len(FEEL['items']), 'feel_start': FEEL['start_count'],
    'words': len(SIG['items']), 'words_start': SIG['grammar']['starting']['words'],
    'modules': sum(1 for m in SOUL['items'] if not m.get('locked')),
    'techniques': len(TECH['items']), 'train': SV['train'], 'training': SV['training'],
}
if TODAY['dev_curve'] is None:  # the curve sits one level down in some revisions
    for v in PAT.values():
        if isinstance(v, dict) and isinstance(v.get('xp'), dict) and 'curve' in v['xp']:
            TODAY['dev_curve'] = v['xp']['curve']

# ---------------------------------------------------------------- ASSUMED (the time model; no data holds these)
ASSUMED = {
    'turn_min_l1': 1.25,     # a player's 6-AP turn at level 1, in minutes (read the board, act, watch it resolve)
    'turn_min_per_level': 0.05,  # more choices each level (techniques, longer Lines, feelings): 1.95 min at level 20
    'foe_turn_min': 0.15,    # one foe's animated turn
    'foes': {'fight': 3, 'elite': 3, 'boss': 3, 'vault_guard': 3},  # a solo party's foes on the board
    'rounds_vs_target': 1.1,  # measured standard fights run about 10% over survival.json rounds (0.33/0.34 MEASURES)
    'rounds_per_level': 0.015,  # the scale drafter's "a level-20 fight has room for the long cash-outs": x1.29 at 20
    'after_fight_min': 2.0,  # the field's 3 rounds (no foes) and the reward panel
    'node_min': {'shop': 4, 'forge': 3, 'rest': 2, 'training': 2, 'shrine': 2, 'event': 2, 'cache': 1, 'vault': 1.5},
    'choose_min': 0.5,       # reading the map and choosing the next node
    'camp_min': 5, 'boon_min': 1.5,
    'gear_share': 0.5,       # of credits earned, the share that goes to grades, mods and armour (the rest: rounds, cores, stims, repair)
}
# A route through one map (15 rows; survival.json map.expect.path gives the ranges): the reference walk.
ROUTE = {'fight': 6, 'elite': 2, 'boss': 1, 'shop': 2, 'forge': 1, 'rest': 1, 'training': 0.5, 'shrine': 0.5,
         'cache': 0.5, 'event': 0.5, 'vault_guard': 0.5, 'vault': 0.5}
DEPTH = {'fight': 6, 'elite': 8.5, 'boss': 15, 'vault_guard': 8, 'vault': 8, 'cache': 7}

# ---------------------------------------------------------------- PROPOSED (PROVISIONAL; reasons in 05-pacing.md)
LEVEL_HOUR = {1: 0, 2: 0.5, 3: 1.25, 4: 2.5, 5: 4.0}
for L in range(6, 21):
    LEVEL_HOUR[L] = 4.0 + (L - 5) * 2.4          # 10 at 16, 15 at 28, 20 at 40
XP_FIGHT_L1, XP_FIGHT_GROWTH = 50, 1.15             # a standard fight's XP at its level: 50 at 1, about 710 at 20
KIND_MULT = {'fight': 1, 'elite': 1.5, 'boss': 5, 'vault_guard': 1.5, 'cache': 0.25, 'vault': 0}  # today's, kept
WORTH = {-5: 0, -4: 0.33, -3: 0.67, -2: 1, -1: 1, 0: 1, 1: 1.1, 2: 1.2, 3: 1.3, 4: 1.4, 5: 1.5}  # foe level - yours
CAP_BY_LEVEL = {1: 7, 5: 8, 10: 9, 15: 10}
RANK_LEVELS = {'I': 3, 'II': 5, 'III': 15}
DRILL_PER_KILL = {'vermin': 20, 'minion': 35, 'soldier': 70, 'elite': 180, 'boss': 360}
# a solo walk's kills by node (stage 1: a fight's budget is about 1.25 Soldier-equivalents solo, an Elite fight 1.6)
KILLS = {'fight': {'soldier': 1, 'minion': 1, 'vermin': 1}, 'elite': {'elite': 1, 'soldier': 1},
         'boss': {'boss': 1, 'soldier': 2}, 'vault_guard': {'elite': 1, 'soldier': 1}}
DRILL_MARKS = [300, 900, 1800]
MARTIAL_MULT = 1.5
STUDY = {'first': 10, 'step': 60, 'mastery_study': 30, 'copy': 10, 'rest': 30, 'training': 60}
PRACTICE = {'thresholds': [10], 'then_every': 80, 'mastery_bonus': 40, 'rest': 40, 'training': 80}
DEV_CURVE = [0, 10, 25, 42, 68, 100, 140, 185, 225, 260, 300]
DEV_TAGS_A_FIGHT, DEV_FIGHT_CAP, DEV_STAGE_CAP = 2.2, 3, 30   # liked tags a worthy fight (mean), the cap a fight, a run's cap a stage
FORM_MARKS = [3, 7, 13]           # fights a form is held through (worthy foes): about 25 / 75 / 150 minutes, as a weapon
DOOR_MARK_HOURS = [2, 11, 17, 23]  # Mark I, II, the middle, III for a specialist
CEILING = ['fine', 'masterwork', 'masterwork', 'masterwork', 'masterwork', 'relic', 'relic', 'relic', 'relic', 'celestial']
GRADE_STEP = {'fine': 1500, 'masterwork': 3500, 'relic': 12000}   # forge x0.8 for Fine and Masterwork, as today
FEELING_UNLOCK_EVERY_H = 2.5
# PACING_NOFIX=1 prints the calendar before the two peak fixes (the collection stopped at 80%; mods stopped at hour 40)
NOFIX = os.environ.get('PACING_NOFIX') == '1'


def sect(title):
    print('\n## ' + title + '\n')


def table(head, rows):
    print('| ' + ' | '.join(head) + ' |')
    print('|' + '---|' * len(head))
    for r in rows:
        print('| ' + ' | '.join(str(x) for x in r) + ' |')


def nice(x):
    """Round to two significant figures, so a number on the screen reads clean."""
    if x <= 0:
        return 0
    d = 10 ** max(0, int(math.floor(math.log10(x))) - 1)
    return int(round(x / d) * d)


# ---------------------------------------------------------------- the time model
def level_at(h):
    """The proposed level at an hour of play (linear between the targets)."""
    for L in range(1, 20):
        if h < LEVEL_HOUR[L + 1]:
            return L + (h - LEVEL_HOUR[L]) / (LEVEL_HOUR[L + 1] - LEVEL_HOUR[L])
    return 20.0


def fight_min(kind, L):
    A = ASSUMED
    target = TODAY['rounds']['boss' if kind == 'boss' else ('elite' if kind in ('elite', 'vault_guard') else 'fight')]
    rounds = target * A['rounds_vs_target'] * (1 + A['rounds_per_level'] * (L - 1))
    per_round = A['turn_min_l1'] + A['turn_min_per_level'] * (L - 1) + A['foes'][kind] * A['foe_turn_min']
    return rounds * per_round + A['after_fight_min'], rounds


def map_minutes(L, first=False):
    A, total = ASSUMED, 0.0
    for k, n in ROUTE.items():
        total += n * (fight_min(k, L)[0] if k in A['foes'] else A['node_min'][k]) + n * A['choose_min']
    return total + A['boon_min'] + (A['camp_min'] if first else 0)


def raw_maps(n=14):
    """The model's own hours (the ASSUMED minutes, unscaled)."""
    out, h = [], 0.0
    for s in range(1, n + 1):
        L = level_at(h + 1.5)
        m = map_minutes(L, s == 1) / 60
        out.append({'stage': s, 'from': h, 'to': h + m, 'hours': m, 'L': L})
        h += m
    return out


# The XP table is pinned to the CONTENT, not to the minute guesses: level 10 arrives as Survival's final Boss falls
# (the end of map 5), at the charter's hour 16. The model's own end of map 5 is printed beside it; the gap between the
# two is how far the minute guesses are from the charter, and it moves every hour in these tables by the same factor.
FINAL_BOSS_HOUR = 16.0
_CACHE = {}


def maps(n=14):
    """The hour each map starts and ends (model hours x CONTENT_SCALE), its mean level, fight-equivalents an hour."""
    if n in _CACHE:
        return _CACHE[n]
    raw = raw_maps(max(n, 5))
    k = FINAL_BOSS_HOUR / raw[4]['to']
    fe = sum(ROUTE[x] * KIND_MULT[x] for x in KIND_MULT)
    out = [{'stage': m['stage'], 'from': m['from'] * k, 'to': m['to'] * k, 'hours': m['hours'] * k, 'L': m['L'],
            'fe_h': fe / (m['hours'] * k), 'raw_to': m['to']} for m in raw[:n]]
    _CACHE[n] = out
    return out


def xp_fight(L):
    return nice(XP_FIGHT_L1 * XP_FIGHT_GROWTH ** (L - 1))


def fe_per_hour(h):
    for m in maps():
        if m['from'] <= h < m['to']:
            return m['fe_h']
    return maps()[-1]['fe_h']


def xp_table():
    total, rows, out = 0, [], {1: 0}
    for L in range(1, 20):
        hrs = LEVEL_HOUR[L + 1] - LEVEL_HOUR[L]
        fe = fe_per_hour((LEVEL_HOUR[L] + LEVEL_HOUR[L + 1]) / 2)
        need = nice(hrs * fe * xp_fight(L))
        total += need
        out[L + 1] = total
        rows.append((L + 1, round(LEVEL_HOUR[L + 1], 1), xp_fight(L), round(fe, 1), need, total, TODAY['xp_total'][L + 1],
                     round(need / xp_fight(L), 1)))
    return out, rows


# ---------------------------------------------------------------- sections
def s_time():
    sect('1. Time: a fight, a node, a map (solo; ASSUMED block)')
    rows = []
    for k in ('fight', 'elite', 'vault_guard', 'boss'):
        for L in (1, 10, 20):
            m, r = fight_min(k, L)
            rows.append((k, L, round(r, 1), round(m, 1)))
    table(['kind', 'level', 'rounds', 'minutes (fight + field + reward)'], rows)
    print()
    rows = [(m['stage'], 'map ' + str(m['stage']) if m['stage'] <= 5 else 'endless ' + str(m['stage'] - 5),
             round(m['from'], 1), round(m['to'], 1), round(m['raw_to'], 1), round(m['hours'], 2), round(m['L'], 1), round(m['fe_h'], 2))
            for m in maps()]
    table(['stage', 'map', 'starts (h)', 'ends (h)', 'ends (model h, unscaled)', 'hours', 'level at its middle', 'fight-equivalents an hour'], rows)
    print('\nContent scale: the model ends map 5 at hour %.1f; the tables pin it to hour %.0f (x%.2f on every model hour).'
          % (raw_maps()[4]['to'], FINAL_BOSS_HOUR, FINAL_BOSS_HOUR / raw_maps()[4]['to']))
    fe = sum(ROUTE[k] * KIND_MULT[k] for k in KIND_MULT)
    print('\nA map is %.1f fight-equivalents (fight 1, Elite 1.5, vault guard 1.5, Boss 5, cache 0.25) on the reference route.' % fe)
    t = TODAY['xp']
    pay = sum(ROUTE[k] * (t['base'] + t['per_depth'] * (DEPTH.get(k, 6) - 1)) * {'fight': 1, 'elite': t['elite'], 'boss': t['boss'],
              'vault_guard': t['vault_guard'], 'cache': t['cache'], 'vault': t['vault']}[k] for k in KIND_MULT)
    print('Today a stage-1 map pays about %d XP a character (survival.json xp: base %d, elite x%s, boss x%s); stage multipliers %s.'
          % (pay, t['base'], t['elite'], t['boss'], TODAY['stage']['xp']))
    lv = max(L for L, x in TODAY['xp_total'].items() if x <= pay)
    print('So today map 1 ends at level %d; level 20 (%d XP) needs about %.1f stage-1 maps.' % (lv, TODAY['xp_total'][20], TODAY['xp_total'][20] / pay))


def s_xp():
    sect('2. The XP table (rules.json character.levels.xp_total) and a fight\'s XP')
    out, rows = xp_table()
    table(['level', 'arrives at hour', 'a standard fight pays (at the level before)', 'fight-eq an hour', 'XP for this level',
           'xp_total PROPOSED', 'xp_total today', 'fight-equivalents for this level'], rows)
    print('\nThe worth of a fight by its level against yours (PROPOSED; foe level minus yours):')
    table(['gap'] + [str(g) for g in sorted(WORTH)], [['worth'] + [WORTH[g] for g in sorted(WORTH)]])
    print('\nLevel at the end of each map (the reference walk, every fight worthy):')
    table(['map', 'ends at hour', 'level'], [(m['stage'], round(m['to'], 1), round(level_at(m['to']), 1)) for m in maps()[:12]])


def points_at(L):
    sp = 10 + sum(2 if l % 2 else 1 for l in range(2, L + 1))
    ap = 10 + sum(1 for l in range(2, L + 1) if l % 2 == 0)
    return sp, ap


def cap_at(L):
    return max(v for l, v in CAP_BY_LEVEL.items() if L >= l)


def plan(name, wants, L_max=20):
    """A greedy spend plan: `wants` is an ordered list of (attribute, skill-or-None, target); each level the points go to
    the first want that is not met and is legal (skill <= attribute <= the level's ceiling). An Attribute point waits
    (held, as c.unspent.attr allows) when the next want is blocked by the ceiling."""
    attrs, skills, log = {}, {}, []
    sp_used = ap_used = 0
    for L in range(1, L_max + 1):
        sp, ap = points_at(L)
        cap = cap_at(L)
        moved = True
        while moved:
            moved = False
            for attr, skill, target in wants:
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


PLANS = {
    'specialist (Breaker: Strength and its three skills)': [
        ('strength', 'raw_power', 7), ('endurance', None, 4), ('strength', 'guts', 3), ('strength', 'raw_power', 10),
        ('strength', 'guts', 10), ('strength', 'intimidation', 10), ('endurance', 'pain_threshold', 4),
        ('endurance', 'durability', 4), ('endurance', None, 10)],
    'two doors (Breaker and Sigils: Strength and Intelligence)': [
        ('strength', 'raw_power', 7), ('intelligence', 'brain_power', 3), ('strength', 'raw_power', 8),
        ('intelligence', 'brain_power', 8), ('strength', 'raw_power', 9), ('intelligence', 'brain_power', 9),
        ('strength', 'raw_power', 10), ('intelligence', 'brain_power', 10), ('strength', 'guts', 5),
        ('intelligence', 'rumination', 5), ('endurance', 'pain_threshold', 3), ('endurance', None, 4)],
    'wide (five doors at about five)': [
        ('strength', 'raw_power', 4), ('agility', 'dexterity', 4), ('intelligence', 'brain_power', 2),
        ('determination', 'will_power', 2), ('virtue', 'faith', 2), ('intelligence', 'brain_power', 5),
        ('determination', 'will_power', 5), ('virtue', 'faith', 5), ('strength', 'raw_power', 6),
        ('agility', 'dexterity', 6), ('strength', 'guts', 3), ('agility', 'athletics', 3), ('intelligence', 'rumination', 3),
        ('determination', 'composure', 3), ('virtue', 'conscience', 3), ('endurance', 'pain_threshold', 2),
        ('endurance', None, 4), ('agility', None, 7)],
}


def s_points():
    sect('3. Ceilings, ranks, points and three spend plans')
    rows = [(L, cap_at(L), *points_at(L), ', '.join(r for r, l in RANK_LEVELS.items() if l == L) or '')
            for L in range(1, 21)]
    table(['level', 'attribute ceiling PROPOSED', 'Skill points (career)', 'Attribute points (career)', 'class rank'], rows)
    for name, wants in PLANS.items():
        print('\n**' + name + '** (skill <= attribute <= ceiling; an Attribute point the ceiling blocks is held for the next level)\n')
        log = plan(name, wants)
        keep = [r for r in log if r[0] in (1, 3, 5, 6, 10, 11, 15, 16, 20)]
        table(['level', 'attributes above 1', 'skills', 'unspent S / A'],
              [(L, ' '.join('%s %d' % (k[:4], v) for k, v in a.items()), ' '.join('%s %d' % (k[:10], v) for k, v in s.items()),
                '%d / %d' % (su, au)) for L, a, s, su, au in keep])
        tens = {}
        for L, a, s, _, _ in log:
            for k, v in list(a.items()) + list(s.items()):
                if v >= 10 and k not in tens:
                    tens[k] = L
        print('\nAt 10 (capped): ' + (', '.join('%s at level %d' % (k, L) for k, L in tens.items()) or 'nothing'))


def s_practice():
    sect('4. Practice tracks: per worthy fight and per hour')
    fe_h = maps()[0]['fe_h']
    fights_h = sum(ROUTE[k] for k in ('fight', 'elite', 'boss', 'vault_guard')) / maps()[0]['hours']
    print('Reference: %.1f fights an hour (map 1), %.1f fight-equivalents an hour.\n' % (fights_h, fe_h))
    per = {k: sum(DRILL_PER_KILL[t] * n for t, n in v.items()) for k, v in KILLS.items()}
    now = {k: sum(TODAY['drill']['per_kill'][t] * n for t, n in v.items()) for k, v in KILLS.items()}
    walk_now = sum(ROUTE[k] * now[k] for k in now) / maps()[0]['hours']
    rows = [('weapon drill (one weapon used every fight)', 'today %s (Elite %s, Boss %s)' % (now['fight'], now['elite'], now['boss']),
             'PROPOSED %s (Elite %s, Boss %s)' % (per['fight'], per['elite'], per['boss']),
             'today %d, PROPOSED %d (rests and training included)' % (walk_now, drill_per_hour()),
             'Mark III today %.1f h (martial x%s: %.1f); PROPOSED %.1f h (martial x%s: %.1f)' % (
                 DRILL_MARKS[2] / max(1, walk_now), TODAY['drill']['martial_mult'], DRILL_MARKS[2] / max(1, walk_now * TODAY['drill']['martial_mult']),
                 DRILL_MARKS[2] / drill_per_hour(), MARTIAL_MULT, DRILL_MARKS[2] / drill_per_hour(MARTIAL_MULT)))]
    # study: a Sigil specialist Evokes about 3 times a fight; each Evoke 1 + 1 past the second glyph + 1 on a hit
    ev, st = 3, 3
    study_h = ev * st * fights_h + (ROUTE['rest'] * STUDY['rest'] * 0.5 + ROUTE['training'] * STUDY['training'] * 0.5) / maps()[0]['hours']
    word_h = STUDY['step'] / study_h
    words_48 = TODAY['words_start'] + 1 + (48 - STUDY['first'] / study_h) / word_h
    now_study_h = ev * st * fights_h
    rows.append(('Sigil words (study)', '%d study' % (ev * st), 'same (an Evoke is 1, +1 a glyph past 2, +1 on a hit)',
                 'today %d, PROPOSED %d with rests' % (now_study_h, study_h),
                 'a word every %.1f h (today every %.0f min, held only by the words-known cap); %d of %d words by hour 48' % (
                     word_h, 60 * TODAY['study']['step'] / now_study_h, min(TODAY['words'], words_48), TODAY['words'])))
    rel, pr = 2, 4
    prac_h = rel * pr * fights_h + (ROUTE['rest'] * PRACTICE['rest'] * 0.5 + ROUTE['training'] * PRACTICE['training'] * 0.5) / maps()[0]['hours']
    mod_h = PRACTICE['then_every'] / prac_h
    mods45 = 1 + 1 + (45 - PRACTICE['thresholds'][0] / prac_h) / mod_h
    rows.append(('Outburst modules (practice)', '%d practice' % (rel * pr), 'same (a Release is 1, +1 a stage past 1, +1 a feeling)',
                 'today %d, PROPOSED %d with rests' % (rel * pr * fights_h, prac_h),
                 'a module every %.1f h (today every %.0f min); %d of %d by hour 45' % (
                     mod_h, 60 * TODAY['practice']['then_every'] / (rel * pr * fights_h), min(TODAY['modules'], mods45), TODAY['modules'])))
    f45 = TODAY['feel_start'] + 45 / FEELING_UNLOCK_EVERY_H
    rows.append(('feelings (happening to you)', 'by event', 'a feeling unlocks at Mark I of its own bar',
                 '1 every %.1f h' % FEELING_UNLOCK_EVERY_H, '%d of %d by hour 45' % (min(25, f45), TODAY['feelings'])))
    rows.append(('Figment forms (held through a fight)', '1 a form held', 'marks at %s fights' % FORM_MARKS, '%.1f' % fights_h,
                 'a held form: Mark I %.0f min, II %.0f min, III %.1f h' % tuple([60 * FORM_MARKS[0] / fights_h, 60 * FORM_MARKS[1] / fights_h, FORM_MARKS[2] / fights_h])))
    rows.append(('a door\'s Marks (units spent in cash-outs)', 'by door', 'thresholds = hours x the door\'s units an hour',
                 'measured per door', 'specialist I %s h, II %s, middle %s, III %s; two doors at 60/40: x1.7 and x2.5' % tuple(DOOR_MARK_HOURS)))
    dev_h = devotion_per_hour()
    reach = [round(DEV_CURVE[d] / dev_h, 1) for d in (3, 5, 7, 10)]
    reach_now = [round(TODAY['dev_curve'][d] / dev_h, 1) for d in (3, 5, 7, 10)]
    rows.append(('Devotion (liked tags, rests, shrines)', 'at most 2 tag XP; 6 a session in all',
                 '%.1f tag XP (cap %d a fight, %d a stage in a run); curve %s' % (DEV_TAGS_A_FIGHT, DEV_FIGHT_CAP, DEV_STAGE_CAP, DEV_CURVE),
                 '%.1f Devotion XP' % dev_h, 'Devotion 3 / 5 / 7 / 10 at hours %s (the curve of today at this rate: %s)' % (reach, reach_now)))
    table(['track', 'per worthy fight today', 'per worthy fight PROPOSED', 'per hour', 'what it gives, when'], rows)


def gear_hours():
    """Hours at which a character who saves its gear share buys each step, in order, under the stage ceilings."""
    t, A, buys, money = TODAY['credits'], ASSUMED, [], 0.0
    order = [('Fine (Forge)', 'fine', GRADE_STEP['fine'] * 0.8), ('Medium armour', 'fine', 250),
             ('Masterwork (Forge)', 'masterwork', GRADE_STEP['masterwork'] * 0.8), ('first mod, fitted', 'masterwork', 400 + 80),
             ('Heavy armour', 'masterwork', 600), ('second mod, fitted', 'masterwork', 480), ('Relic (Forge)', 'relic', GRADE_STEP['relic']),
             ('Relic armour step', 'relic', 3500 * 0.8)]
    rows, i = [], 0
    for m in maps(14):
        s = m['stage']
        stage_k = 1 + SV['stage']['credits'] * (s - 1)
        income = sum(ROUTE[k] * (t['base'] + t['per_depth'] * DEPTH[k]) * {'fight': 1, 'elite': t['elite'], 'boss': t['boss'],
                     'vault_guard': t['vault_guard'], 'cache': t['cache'], 'vault': t['vault']}[k] for k in DEPTH) * stage_k
        ceil = CEILING[min(s - 1, len(CEILING) - 1)]
        rank = ['standard', 'fine', 'masterwork', 'relic', 'celestial']
        steps = 20
        for j in range(steps):
            money += income * A['gear_share'] / steps
            h = m['from'] + m['hours'] * (j + 1) / steps
            while i < len(order) and rank.index(order[i][1]) <= rank.index(ceil) and money >= order[i][2]:
                money -= order[i][2]; buys.append((order[i][0], round(h, 1), s)); i += 1
        nxt = CEILING[min(s, len(CEILING) - 1)]
        rows.append((s, round(m['to'], 1), int(income), int(income / m['hours']), ceil, 'vault: ' + nxt))
    return rows, buys


def s_credits():
    sect('5. Credits by map and the gear calendar')
    rows, buys = gear_hours()
    table(['stage', 'ends at hour', 'credits a map (a character)', 'an hour', 'grade ceiling PROPOSED', 'the vault gives'], rows)
    print('\nBought with %d%% of income (ASSUMED), in this order:\n' % (100 * ASSUMED['gear_share']))
    table(['purchase', 'hour', 'stage'], buys)
    print('\nCelestial: found, not bought: the stage-9 vault (the next stage\'s ceiling) at about hour %.1f, and Boss picks from stage 10.'
          % (maps()[8]['from'] + maps()[8]['hours'] * 0.55))


def devotion_per_hour():
    m0 = maps()[0]
    fights = sum(ROUTE[k] for k in ('fight', 'elite', 'boss', 'vault_guard'))
    return (fights * DEV_TAGS_A_FIGHT + ROUTE['rest'] * TODAY['train']['devotion'] * 0.5 + ROUTE['shrine'] * SV['shrine']['rite'] * 0.5) / m0['hours']


def drill_per_hour(mult=1.0):
    """Drill an hour on a weapon that hits in every fight (kills of a solo stage-1 walk), plus the rests' and training's."""
    m0 = maps()[0]
    per = {k: sum(DRILL_PER_KILL[t] * n for t, n in v.items()) for k, v in KILLS.items()}
    walk = sum(ROUTE[k] * per[k] for k in per) / m0['hours']
    rest = (ROUTE['rest'] * TODAY['train']['drill'] * 0.5 + ROUTE['training'] * TODAY['training']['drill'] * 0.5) / m0['hours']
    return walk * mult + rest


def calendar():
    """What each of three characters gains in each hour 0..50, from the proposed rates. An hour with nothing is flagged."""
    ev = {name: {h: [] for h in range(51)} for name in ('specialist', 'two doors', 'wide')}

    def add(who, h, what):
        if 0 <= h < 50:
            ev[who][int(h)].append(what)
    for who in ev:
        for L in range(2, 21):
            h = LEVEL_HOUR[L]
            add(who, h - 1e-9 if h == int(h) and h > 0 else h, 'L%d' % L)

    def drills(who, share, weapons):
        """Weapon bars one after another; `share` of the fights' kills land on the bar being drilled."""
        h = 0.0
        for w in range(weapons):
            for i, m in enumerate(DRILL_MARKS):
                prev = DRILL_MARKS[i - 1] if i else 0
                h += (m - prev) / drill_per_hour(share)
                add(who, h, 'w%d M%s' % (w + 1, 'I' * (i + 1)))
    # (the specialist is a Breaker, martial; the two-door character too; the wide one a Skirmisher, martial, at half use)
    drills('specialist', MARTIAL_MULT * 0.7, 18 if NOFIX else 21)   # two weapons hit in most fights: the bar being drilled gets 70%
    drills('two doors', MARTIAL_MULT * 0.45, 11 if NOFIX else 14)
    drills('wide', MARTIAL_MULT * 0.3, 8)
    for who, k in (('specialist', 1), ('two doors', 1.7), ('wide', 2.0)):
        for i, hh in enumerate(DOOR_MARK_HOURS):
            add(who, hh * k, 'door %s' % ['I', 'II', 'mid', 'III'][i])
    for who, k in (('two doors', 2.5), ('wide', 2.2)):
        for i, hh in enumerate(DOOR_MARK_HOURS[:3]):
            add(who, hh * k, 'door2 %s' % ['I', 'II', 'mid'][i])
    for who, every in (('two doors', 1.6), ('wide', 2.6)):
        h, n = 0.25, TODAY['words_start']
        while n < 34:
            h += every if n > TODAY['words_start'] else 0.25; n += 1; add(who, h, 'word %d' % n)
        h = 5.0                       # found spells: five or six words is enough to start combining
        while h < 50:
            add(who, h, 'found spell'); h += 1.0 if h < 20 else 2.0
    h, n = 0.0, 1
    while n < 23:                     # the wide character's Outburst door (Will Power 5)
        h += 2.1 * 1.4; n += 1; add('wide', h, 'module %d' % n)
    h = 0.0
    for n in range(TODAY['feel_start'] + 1, 21):
        h += FEELING_UNLOCK_EVERY_H * 1.2; add('wide', h, 'feeling %d' % n)
    rows, buys = gear_hours()
    for name, hh, _ in buys:
        for who in ev:
            add(who, hh, name.split(' (')[0])
    for who in ev:                    # mods: from Masterwork's slot (hour 8) every 1.5 hours; past 40, the Celestial piece's slots
        h = 9.5
        while h < (40 if NOFIX else 50):
            add(who, h, 'mod'); h += 1.5
        add(who, maps()[8]['from'] + maps()[8]['hours'] * 0.55, 'Celestial (vault)')
        add(who, maps()[9]['to'] - 0.1, 'Celestial (Boss pick, 1 in 4)')
    for m in maps(14):
        for who in ev:
            add(who, m['to'] - 0.05, 'boon')
    for who in ev:
        for d in range(1, 11):
            add(who, DEV_CURVE[d] / devotion_per_hour(), 'Dev %d' % d)
    return ev


def s_calendar():
    sect('6. The calendar, hours 0 to 50 (three characters)')
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
    table(['hour', 'specialist', 'two doors', 'wide'], rows)
    for who, hs in empty.items():
        print('\n%s: hours with nothing: %s' % (who, hs or 'none'))


SECTIONS = {'time': s_time, 'xp': s_xp, 'points': s_points, 'practice': s_practice, 'credits': s_credits, 'calendar': s_calendar}

if __name__ == '__main__':
    want = sys.argv[1:] or list(SECTIONS)
    print('# Pacing tables (tools/balance/pacing.py; read-only; PROPOSED numbers are PROVISIONAL)')
    for w in want:
        SECTIONS[w]()
