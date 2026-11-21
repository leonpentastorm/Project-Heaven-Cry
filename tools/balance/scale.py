#!/usr/bin/env python
"""The number scale of the 0.34 rebalance (docs/design/growth/01-scale.md): every table of that file, printed.

READS data/*.json and prints. It writes nothing (no data change). Run from the repo root:

    PYTHONUTF8=1 python tools/balance/scale.py            # every table
    PYTHONUTF8=1 python tools/balance/scale.py weapons    # one section: today, columns, weapons, flat, stats,
                                                          #   hp, check, costs, margins, caps

The PROPOSAL block below holds every proposed number (all PROVISIONAL). Change one there and run again: every table
that reads it moves. Nothing here is a line or a ceiling: a table is a reading of what a player will see.
"""
import json, math, os, re, sys, collections

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
def L(name):
    with open(os.path.join(ROOT, 'data', name), encoding='utf-8') as f:
        return json.load(f)

RULES, ENEM, WEAP, SKILLS = L('rules.json'), L('enemies.json'), L('weapons.json'), L('skills.json')
OUT = RULES['output']
LEVELS = list(range(1, 21))

# ------------------------------------------------------------------------------------------------ THE PROPOSAL
PROPOSAL = {
    # one factor for every flat number of damage, HP, healing, shield, armour and soak (section 3 of 01-scale.md)
    'F': 0.6,
    # the level column: x deal_end at level 20, geometric (x1.2142 a level)
    'deal_end': 40,
    # character HP bracket: base + per_end x (Endurance - 1) + (level - 1) x (per_level + per_level_pt x Pain Threshold)
    'hp': {'base': 60, 'per_end': 10, 'per_level': 1, 'per_level_pt': 0.5},
    # the slopes the cards promise (attr: a point of the Attribute over 1; skill: a point of the skill). k is set so a
    # normal share (output.floor_reference: 4 and 4) at level 1 deals today's normal share x F (see re-pin below)
    'slopes': {
        'melee':     {'attr': 0.10, 'skill': 0.05, 'reads': 'Strength (or the row\'s scales_with) and Raw Power'},
        'blade':     {'attr': 0.0,  'skill': 0.04, 'reads': 'Dexterity (light blades that scale with Agility today)'},
        'gun':       {'attr': 0.0,  'skill': 0.04, 'reads': 'Dexterity (Agility no longer)'},
        'thrown':    {'attr': 0.0,  'skill': 0.04, 'reads': 'Dexterity'},
        'sigil':     {'attr': 0.10, 'skill': 0.10, 'reads': 'Intelligence and Brain Power'},
        'elemental': {'attr': 0.10, 'skill': 0.0,  'reads': 'Expression'},
        'soul':      {'attr': 0.05, 'skill': 0.10, 'reads': 'Determination and Will Power'},
        'blessing':  {'attr': 0.05, 'skill': 0.10, 'reads': 'Virtue and Faith'},
        'healing':   {'attr': 0.06, 'skill': 0.06, 'reads': 'Insight and Empathy (as built)'},
    },
    # the grade ladder: damage x dmg, armour x arm, + acc to hit
    'grades': {'standard': (1.0, 0), 'fine': (1.15, 1), 'masterwork': (1.3, 2), 'relic': (1.5, 3), 'celestial': (1.75, 3)},
    # enemy columns (enemies.json levels.table): damage and armour on the level column; HP on its own
    'enemy_hp_end': 90,          # hp_mult at level 20 (worked in section 2.4)
    'enemy_dmg_end': 60,         # damage_mult at level 20: the level column x the expected defender's armour grade (x1.5)
    'tier_damage_x': 1.28,       # every tier's `damage` x this (Soldier 0.78 -> 1.0: a frail character takes 3 to 4 hits)
    # Margins (rules: every full `step` over the Defense or TN adds `per`; a natural 20 adds `crit` Margins;
    # Perception at 4, 7 and 10 adds one more to a critical)
    'margins': {'step': 4, 'per': 0.25, 'crit': 2, 'crit_perception_at': [4, 7, 10]},
    # the Law 2 cash-out pattern (the curve section 2 and 16): units spent n, each worth `grow` x the one before,
    # Bite a unit by door skill points; Reach by door skill points
    'cashout': {'grow': 1.2, 'bite': [(1, 0.25), (6, 0.30), (9, 0.35)]},
    'reach': {'momentum': [(1, 3), (4, 4), (7, 5), (10, 7)], 'generic': [(1, 2), (4, 3), (7, 4), (10, 5)]},
}

# ------------------------------------------------------------------------------------------------ helpers
def step_at(table, pts):
    v = table[0][1]
    for at, x in table:
        if pts >= at: v = x
    return v

def geo(end, lvl):
    return end ** ((lvl - 1) / 19)

def deal_new(lvl): return geo(PROPOSAL['deal_end'], lvl)
def ehp_new(lvl):  return geo(PROPOSAL['enemy_hp_end'], lvl)
def edmg_new(lvl): return geo(PROPOSAL['enemy_dmg_end'], lvl)

def mend_new(lvl):
    """Heals and shields: the level column x the growth of a normal-share bar (Endurance 4, Pain Threshold 4)."""
    h = PROPOSAL['hp']; n0 = h['base'] + 3 * h['per_end']
    return deal_new(lvl) * (n0 + (lvl - 1) * (h['per_level'] + 4 * h['per_level_pt'])) / n0

def fmt(x, d=0):
    if isinstance(x, str): return x
    if d == 0: return '{:,}'.format(int(round(x)))
    return ('{:,.%df}' % d).format(x)

def table(head, rows):
    print('| ' + ' | '.join(head) + ' |')
    print('| ' + ' | '.join('---' for _ in head) + ' |')
    for r in rows: print('| ' + ' | '.join(str(c) for c in r) + ' |')
    print()

def old_stat(profile, attr, skill):
    p = OUT['profiles'][profile]
    return p['k'] * (1 + p['attr'] * (attr - 1) + p['skill'] * skill)

FACT = OUT['factors']
# today's Stat term of each system at a normal share (4, 4), with the system's own factor folded in
OLD_NORMAL = {
    'melee': old_stat('melee', 4, 4) * FACT['melee'],      # character melee: profile x factors.melee
    'blade': old_stat('melee', 4, 4) * FACT['melee'],      # light blades read the melee profile on Agility today
    'gun': old_stat('gun', 4, 4),
    'thrown': OUT['profiles']['weapon']['k'] * FACT['thrown'],
    'sigil': old_stat('sigil', 4, 4),
    'elemental': old_stat('elemental', 4, 4),
    'soul': old_stat('soul', 4, 4),
    'blessing': old_stat('blessing', 4, 4),
    'healing': old_stat('healing', 4, 4),
}
def bracket(prof, a, s):
    sl = PROPOSAL['slopes'][prof]; return 1 + sl['attr'] * (a - 1) + sl['skill'] * s
K_NEW = {p: OLD_NORMAL[p] / bracket(p, 4, 4) for p in PROPOSAL['slopes']}
def stat_new(prof, a, s): return K_NEW[prof] * bracket(prof, a, s)

def digits(x): return len(str(int(round(abs(x))))) if x >= 1 else 1

# ------------------------------------------------------------------------------------------------ 1. today
def sec_today():
    print('## T1. Today: the output formula\'s terms, as data holds them (rules.json output)\n')
    rows = []
    for pid, p in OUT['profiles'].items():
        if not isinstance(p, dict): continue
        pair = OUT['pairs'].get(p.get('pair') or '', {})
        rows.append([pid, p.get('k'), p.get('attr'), p.get('skill'), p.get('level'), '/'.join(pair.get('attrs', [])) + ' ; ' + '/'.join(pair.get('skills', [])),
                     p.get('floor', ''), p.get('min_pct', '')])
    table(['profile', 'k', 'attr', 'skill', 'level column', 'pair (attrs ; skills)', 'floor', 'min_pct'], rows)
    print('factors: ' + ', '.join('%s %s' % (k, v) for k, v in FACT.items() if isinstance(v, (int, float))) + '\n')
    rows = [[l, OUT['level']['deal'][l - 1], OUT['level']['scale'][l - 1], OUT['level']['mend'][l - 1]] for l in LEVELS]
    table(['level', 'deal', 'scale', 'mend'], rows)

# ------------------------------------------------------------------------------------------------ 2. columns
def sec_columns():
    print('## T2. The new columns, levels 1 to 20\n')
    h = PROPOSAL['hp']
    rows = []
    for l in LEVELS:
        frail = round(deal_new(l) * (h['base'] + (l - 1) * h['per_level']))
        normal = round(deal_new(l) * (h['base'] + 3 * h['per_end'] + (l - 1) * (h['per_level'] + 4 * h['per_level_pt'])))
        hardy = round(deal_new(l) * (h['base'] + 9 * h['per_end'] + (l - 1) * (h['per_level'] + 10 * h['per_level_pt'])))
        rows.append([l, fmt(deal_new(l), 3), fmt(mend_new(l), 3), fmt(ehp_new(l), 3), fmt(edmg_new(l), 3), fmt(deal_new(l), 3), 0, 0,
                     fmt(frail), fmt(normal), fmt(hardy)])
    table(['level', 'deal (hits, HP, armour, soak)', 'mend (heals, shields)', 'enemy hp_mult', 'enemy damage_mult', 'enemy armour_mult',
           'defense_plus', 'attack_plus', 'HP End 1 PT 0', 'HP End 4 PT 4', 'HP End 10 PT 10'], rows)
    print('Today, for comparison: deal x%.2f, scale x%.2f, mend x%.2f at level 20; enemy hp_mult x%.2f, damage_mult x%.2f, defense_plus %d, attack_plus %d.\n' % (
        OUT['level']['deal'][-1], OUT['level']['scale'][-1], OUT['level']['mend'][-1], ENEM['levels']['table'][-1]['hp_mult'],
        ENEM['levels']['table'][-1]['damage_mult'], ENEM['levels']['table'][-1]['defense_plus'], ENEM['levels']['table'][-1]['attack_plus']))
    # the enemy HP working
    print('### T2b. The enemy HP column\'s working (the expected attacker: a specialist, gear one grade under the stage\'s best)\n')
    rows = []
    for l in (1, 5, 10, 15, 20):
        a = spec_main(l)
        g = PROPOSAL['grades'][expected_grade(l)][0]
        mel = stat_new('melee', a, a) / stat_new('melee', 7, 7)
        gun = stat_new('gun', a, a) / stat_new('gun', 7, 7)
        grow = deal_new(l) * (mel + gun) / 2 * g
        rows.append([l, a, expected_grade(l), fmt(deal_new(l), 2), fmt((mel + gun) / 2, 3), g, fmt(grow, 1), fmt(ehp_new(l), 1), fmt(ehp_new(l) / grow, 2)])
    table(['level', 'main attr = skill', 'expected grade', 'deal', 'stat growth (melee and gun mean)', 'grade x', 'attacker growth', 'enemy hp_mult', 'fight length vs level 1'], rows)

def spec_main(l):
    """A specialist's main Attribute and its alpha skill: 7 at creation; the ceiling 8 / 9 / 10 at levels 5 / 10 / 15,
    reached with the Attribute point of the next even level (points are not banked)."""
    if l >= 16: return 10
    if l >= 10: return 9
    if l >= 6: return 8
    return 7

def expected_grade(l):
    """One step under the stage's best (the chase calendar: Fine by level 4, Masterwork by 7, Relic by 12, Celestial by 17)."""
    if l >= 17: return 'relic'
    if l >= 12: return 'masterwork'
    if l >= 7: return 'fine'
    return 'standard'

def own_grade(l):
    """The grade a character holds at that level (the chase calendar)."""
    if l >= 17: return 'celestial'
    if l >= 12: return 'relic'
    if l >= 7: return 'masterwork'
    if l >= 4: return 'fine'
    return 'standard'

# ------------------------------------------------------------------------------------------------ 3. weapons
def rnd(x):
    """Half up (Python's round() is half to even: 13.5 would go to 14 and 12.5 to 12)."""
    return int(math.floor(x + 0.5))

def new_weapon_damage():
    """Every row: old x F, rounded half up. No row is bumped: two rows whose new numbers meet are listed with how far
    apart they were (a gap under a tenth was never felt, so nothing a player could see is lost)."""
    F = PROPOSAL['F']; out = {}
    for w in WEAP['items']:
        d = w['damage']
        if isinstance(d, (int, float)): out[w['id']] = max(1, rnd(d * F)) if d > 0 else 0
        elif isinstance(d, dict): out[w['id']] = {k: max(1, rnd(v * F)) for k, v in d.items()}
        else:
            m = re.match(r'\s*(\d+)\s*\+\s*(\d+)\s*\*\s*(\w+)', d)
            out[w['id']] = '%d + %d*%s' % (rnd(int(m.group(1)) * F), rnd(int(m.group(2)) * F), m.group(3))
    by = collections.defaultdict(list)
    for w in WEAP['items']:
        if isinstance(w['damage'], (int, float)) and w['damage'] > 0: by[w['category']].append(w)
    meets = []
    for cat, ws in by.items():
        seen = {}
        for w in sorted(ws, key=lambda w: w['damage']):
            n = out[w['id']]
            if n in seen and seen[n]['damage'] != w['damage']:
                lo = seen[n]['damage']; meets.append((cat, seen[n]['id'], lo, w['id'], w['damage'], n, '%.1f%%' % (100 * (w['damage'] - lo) / lo)))
            seen.setdefault(n, w)
    return out, meets

def sec_weapons():
    print('## T3. Every weapon row, old and new (weapons.json damage x F, rounded half up)\n')
    new, bumps = new_weapon_damage()
    rows = []
    for w in sorted(WEAP['items'], key=lambda w: (w['category'], str(w['damage']))):
        prof = (w.get('phys') or {}).get('profile') or 'weapon'
        sw = '/'.join((w.get('phys') or {}).get('scales_with') or [])
        nprof = new_profile_of(w)
        rows.append([w['category'], w['id'], json.dumps(w['damage']).replace('"', ''), json.dumps(new[w['id']]).replace('"', ''), prof + ' (' + sw + ')', nprof])
    table(['category', 'id', 'damage today', 'damage new', 'profile today (scales_with)', 'profile new'], rows)
    print('Rows of one category that meet on one new number: %d (the gap between them today in the last column)\n' % len(bumps))
    if bumps: table(['category', 'lower row', 'today', 'higher row', 'today', 'new (both)', 'gap today'], bumps)
    big = [m for m in bumps if float(m[-1].rstrip('%')) >= 10]
    print('Meetings where the gap today was a tenth or more (a gap a player could feel): %d\n' % len(big))
    splash = [(w['id'], w['splash_damage'], rnd(w['splash_damage'] * PROPOSAL['F'])) for w in WEAP['items'] if w.get('splash_damage')]
    table(['id', 'splash_damage today', 'new'], splash)

def new_profile_of(w):
    ph = w.get('phys') or {}; prof = ph.get('profile'); sw = ph.get('scales_with') or []
    if prof == 'gun': return 'gun (Dexterity)'
    if prof == 'melee':
        if w['category'] == 'light_melee' and 'agility' in sw: return 'blade (Dexterity)'
        return 'melee (' + '/'.join(sw) + ' and Raw Power)'
    if w['category'] == 'thrown': return 'thrown (Dexterity)'
    return 'weapon (no slope, k 1.5)'


# ------------------------------------------------------------------------------------------------ 3b. digits by category
def sec_digits():
    print('## T3b. The digits rule by category: the strongest row of each, a plain hit (no Margins; a bow at Raw Power 10)\n')
    new, _ = new_weapon_damage()
    best = {}
    for w in WEAP['items']:
        d = new[w['id']]
        v = max(d.values()) if isinstance(d, dict) else (d if isinstance(d, (int, float)) else None)
        if isinstance(d, str):
            m = re.match(r'(\d+) \+ (\d+)\*', d); v = int(m.group(1)) + 10 * int(m.group(2))
        if v and (w['category'] not in best or v > best[w['category']][1]): best[w['category']] = (w['id'], v, w)
    rows = []
    for cat, (wid, v, w) in sorted(best.items()):
        prof = new_profile_of(w).split(' ')[0]
        st = (lambda a, s: stat_new(prof, a, s)) if prof in K_NEW else (lambda a, s: 1.5)
        n1 = v * st(1, 0); a1 = v * st(4, 4); s1 = v * st(7, 7); s20 = v * st(10, 10) * deal_new(20) * PROPOSAL['grades']['celestial'][0]
        rows.append([cat, wid, v, prof, fmt(n1), fmt(a1), fmt(s1), fmt(s20)])
    table(['category', 'strongest row', 'new base', 'profile', 'L1 at 1/0', 'L1 at 4/4', 'L1 at 7/7', 'L20 at 10/10, Celestial'], rows)

# ------------------------------------------------------------------------------------------------ 4. every other flat number
FLAT_KEYS = {'damage', 'hp', 'heal', 'shield', 'armour', 'splash_damage', 'tick', 'tick_damage', 'melee_damage', 'burn_per_point',
             'hp_per_step', 'self_damage', 'soak', 'damage_per_flux_over', 'heal_enemy', 'shield_enemy', 'boss_damage'}
SHARE_OF = re.compile(r'^(event:|self:max_hp|max_hp|res:ledger|damage$)')
HP_OPS = {'heal', 'shield', 'damage', 'deal', 'shield_grant'}

def flat_numbers():
    """(file, path, old) for every flat number of damage, HP, healing, shield, armour or soak outside weapons.json damage
    and the enemy and level tables (which have their own sections)."""
    out = []
    skip_files = {'weapons.json'}
    def walk(o, path, f, parent_key=''):
        if isinstance(o, dict):
            # an amount block: its base, and per-point parts that are not a share of something
            if o.get('kind') in ('damage', 'heal', 'shield') and isinstance(o.get('base'), (int, float)):
                if o['base']: out.append((f, path + '.base', o['base']))
                for i, p in enumerate(o.get('per') or []):
                    if isinstance(p.get('value'), (int, float)) and not SHARE_OF.match(str(p.get('of', ''))):
                        out.append((f, path + '.per[%d](%s)' % (i, p.get('of')), p['value']))
            if o.get('op') in HP_OPS or (o.get('op') == 'stat_mod' and o.get('stat') == 'hp'):
                if isinstance(o.get('value'), (int, float)) and abs(o['value']) >= 1: out.append((f, path + '.value', o['value']))
            for k, v in o.items():
                p = path + '.' + k
                if isinstance(v, (int, float)) and not isinstance(v, bool) and k == 'hp_per_level' and f != 'skills.json':
                    out.append((f, p + ' (a per-level HP number: at the Pain Threshold rate, x0.25)', v)); continue
                if isinstance(v, (int, float)) and not isinstance(v, bool) and (k in FLAT_KEYS or k == 'hp_per_point') and abs(v) >= 1:
                    if f == 'enemies.json' and ('.levels' in p): continue
                    if f == 'enemies.json' and k == 'damage' and p.startswith('.items'): continue  # a tier's damage multiplier, not a number of HP
                    if f == 'skills.json' and '.per_point.numbers' in p: continue  # plate counts
                    if f == 'rules.json' and k == 'hp' and '.gate' in p: continue
                    if o.get('kind') in ('damage', 'heal', 'shield') and k == 'base': continue
                    out.append((f, p, v))
                elif isinstance(v, (dict, list)): walk(v, p, f, k)
        elif isinstance(o, list):
            for i, v in enumerate(o):
                walk(v, path + '[%s]' % ((v.get('id') if isinstance(v, dict) and v.get('id') else i)), f, parent_key)
    for f in sorted(os.listdir(os.path.join(ROOT, 'data'))):
        if f.endswith('.json') and f not in skip_files: walk(L(f), '', f)
    # the named ones the walk cannot tell from their key
    extra = [('rules.json', '.combat.armor.classes[*].value', None), ('techniques.json', '.rules.guard.soak', None),
             ('rules.json', '.mending.gate.hp', RULES['mending']['gate']['hp']), ('soul_modules.json', '.damage.base', None),
             ('soul_modules.json', '.damage.enemy_base', None), ('patrons.json', '.prayer.intervention.amount.base', 20),
             ('patrons.json', '.prayer.intervention.amount.per_devotion', 4)]
    return out, extra

def sec_flat():
    F = PROPOSAL['F']
    print('## T4. Every other flat number of damage, HP, healing, shield, armour and soak: x F, rounded as its file rounds\n')
    out, extra = flat_numbers()
    rows = []
    for f, p, v in out:
        n = v * (0.25 if 'per-level HP number' in p else F)
        n = round(n) if float(v).is_integer() and abs(n) >= 10 else round(n, 2)
        rows.append([f, p, v, n])
    table(['file', 'path', 'today', 'new'], rows)
    arm = RULES['combat']['armor']['classes']
    table(['armour class', 'value today', 'new'], [[a['name'], a['value'], round(a['value'] * F, 1)] for a in arm])
    g = L('techniques.json')['rules']['guard']['soak']
    so = L('soul_modules.json')['damage']
    table(['named number', 'today', 'new'], [
        ['techniques.json rules.guard.soak (a plate, x the level column)', g, round(g * F, 2)],
        ['soul_modules.json damage.base (a character\'s Damage school)', so['base'], round(so['base'] * F, 1)],
        ['soul_modules.json damage.enemy_base', so['enemy_base'], round(so['enemy_base'] * F, 1)],
        ['rules.json mending.gate.hp (the reference bar the gate counts to)', RULES['mending']['gate']['hp'], PROPOSAL['hp']['base'] + 3 * PROPOSAL['hp']['per_end']],
        ['patrons.json prayer.intervention.amount (base, per Devotion)', '20, 4', '%s, %s' % (round(20 * F), round(4 * F, 1))],
        ['rules.json combat.attack.cover half / full hp', '%d / %d' % (RULES['combat']['attack']['cover']['half']['hp'], RULES['combat']['attack']['cover']['full']['hp']),
         '%d / %d' % (round(RULES['combat']['attack']['cover']['half']['hp'] * F), round(RULES['combat']['attack']['cover']['full']['hp'] * F))],
    ])
    print('Counted: %d flat numbers outside weapons.json (plus the named rows above).\n' % len(out))

# ------------------------------------------------------------------------------------------------ 5. the stat terms
def sec_stats():
    print('## T5. The Stat terms: today and new (k re-pinned so a normal share, 4 and 4, deals today\'s x F at level 1)\n')
    rows = []
    for p, sl in PROPOSAL['slopes'].items():
        row = [p, sl['reads'], sl['attr'], sl['skill'], fmt(K_NEW[p], 3), fmt(OLD_NORMAL[p], 3)]
        for a, s in ((1, 0), (4, 4), (7, 7), (10, 10)):
            row.append('%s / %s' % (fmt(stat_new(p, a, s), 3), fmt(old_at(p, a, s), 3)))
        rows.append(row)
    table(['profile', 'reads', 'attr a point', 'skill a point', 'k new', 'today at 4/4', 'new / today at 1/0', 'at 4/4', 'at 7/7', 'at 10/10'], rows)
    print('A card\'s promise holds against the 1-point character: a Strength point is +10% of the Strength-1 blow (k x 0.1 over k), whatever k is.\n')
    table(['grade', 'damage x', 'armour x', 'to hit', 'today'], [[g, v[0], v[0], '+%d' % v[1], 'x1 damage, +%s' % RULES['rarity'][g]['acc']] for g, v in PROPOSAL['grades'].items()])

def old_at(p, a, s):
    if p in ('melee', 'blade'): return old_stat('melee', a, s) * FACT['melee']
    if p == 'thrown': return OUT['profiles']['weapon']['k'] * FACT['thrown']
    return old_stat(p, a, s)

# ------------------------------------------------------------------------------------------------ 6. HP
def sec_hp():
    h = PROPOSAL['hp']
    print('## T6. Character HP: deal(L) x (%d + %d x (End - 1) + (L - 1) x (%s + %s x PT)), and what one point gives\n' % (h['base'], h['per_end'], h['per_level'], h['per_level_pt']))
    def hp(l, e, pt): return deal_new(l) * (h['base'] + h['per_end'] * (e - 1) + (l - 1) * (h['per_level'] + h['per_level_pt'] * pt))
    def hp_old(l, e, pt): return OUT['level']['scale'][l - 1] * (100 + 15 * (e - 1) + (l - 1) * (5 + 2 * pt))
    rows = []
    for e, pt in ((1, 0), (4, 2), (4, 4), (7, 0), (7, 4), (10, 10)):
        rows.append(['End %d PT %d' % (e, pt)] + ['%s (%s)' % (fmt(hp(l, e, pt)), fmt(hp_old(l, e, pt))) for l in (1, 5, 10, 15, 20)])
    table(['build', 'L1 new (today)', 'L5', 'L10', 'L15', 'L20'], rows)
    rows = []
    for l in (1, 10, 20):
        base = hp(l, 1, 0)
        e1 = hp(l, 2, 0) - base; p1 = hp(l, 1, 1) - base
        rows.append([l, fmt(base), '+%s (%s%%)' % (fmt(e1), fmt(100 * e1 / base, 1)), '+%s (%s%%)' % (fmt(p1), fmt(100 * p1 / base, 1))])
    table(['level', 'HP at End 1 PT 0', 'one Endurance point', 'one Pain Threshold point'], rows)

# ------------------------------------------------------------------------------------------------ 7. the check
TIERS = {t['id']: t for t in ENEM['items']}
def enemy(tier, l):
    t = TIERS[tier]; F = PROPOSAL['F']
    hp = t['hp'] * F * ehp_new(l); arm = t['armour'] * F * deal_new(l)
    dmg = rnd(WEAP_BY['hellraiser_service_rifle']['damage'] * F) * t['damage'] * PROPOSAL['tier_damage_x'] * edmg_new(l)
    return hp, arm, dmg, t['defense'], t['attack_bonus']
WEAP_BY = {w['id']: w for w in WEAP['items']}

def margin_mult(mod, defense, perception=1):
    """E[damage multiplier] of one attack with this to-hit modifier against this Defense (misses count 0)."""
    M = PROPOSAL['margins']; tot = 0
    for r in range(1, 21):
        if r == 1: continue
        total = r + mod
        if r != 20 and total < defense: continue
        m = max(0, (total - defense) // M['step'])
        if r == 20: m += M['crit'] + sum(1 for a in M['crit_perception_at'] if perception >= a)
        tot += 1 + M['per'] * m
    return tot / 20

def cash(points, door):
    G = PROPOSAL['cashout']
    n = step_at(PROPOSAL['reach']['momentum' if door == 'momentum' else 'generic'], points)
    b = step_at(G['bite'], points)
    return n, 1 + b * sum(G['grow'] ** i for i in range(n))

def lerp(a, b, l): return a + (b - a) * (l - 1) / 19

BUILDS = [
    # name, what it attacks with, profile, door, (End, PT, armour class) at L1 and at L20, AP of the plain action
    ('Two-handed Strength specialist (maul, Momentum)', 'maul', 'melee', 'momentum', (3, 2, 2), (5, 6, 3), 3),
    ('Rifle Dexterity specialist (service rifle, Pressure)', 'hellraiser_service_rifle', 'gun', 'pressure', (2, 1, 1), (4, 4, 1), 2),
    ('Pistol and knife, mixed (Dexterity and Ingenuity 5/4 at L1, 8/8 at L20)', 'service_pistol', 'gun', 'mixed', (2, 1, 1), (3, 3, 1), 2),
    ('Sigilist (FIRE in a Line of two, Evoker grade)', 'fire', 'sigil', 'sigil', (1, 0, 1), (3, 2, 1), 3),
    ('Channeler (Damage school Bolt at stage 1, Emanator grade)', 'outburst', 'soul', 'outburst', (2, 1, 1), (4, 3, 1), 4),
    ('Chaplain (pistol at Dexterity 2 plus Smite; Devotion as its grade)', 'smite', 'blessing', 'prayer', (4, 2, 2), (6, 5, 3), 2),
]
ARM = {a['class']: a['value'] for a in RULES['combat']['armor']['classes']}
ARM_NAME = {a['class']: a['name'] for a in RULES['combat']['armor']['classes']}
def hitp(mod, d): return sum(1 for x in range(2, 21) if x == 20 or x + mod >= d) / 20

def plain_hit(b, l, a, s, grade_x):
    F = PROPOSAL['F']; prof = b[2]
    if b[1] == 'fire':
        base = L('sigils.json')
        fire = [i for i in base['items'] if i['id'] == 'fire'][0]['damage'] * F
        return fire * stat_new('sigil', a, s) * base['grammar']['line_mult']['by_glyphs']['2'] * deal_new(l) * grade_x
    if b[1] == 'outburst':
        return L('soul_modules.json')['damage']['base'] * F * stat_new('soul', a, s) * 1.0 * deal_new(l) * grade_x
    if b[1] == 'smite':
        return 20 * F * stat_new('blessing', a, s) * deal_new(l) * grade_x
    base = rnd(WEAP_BY[b[1]]['damage'] * F)
    return base * stat_new(prof, a, s) * deal_new(l) * grade_x

def check_rows():
    rows = []
    for b in BUILDS:
        for l in (1, 5, 10, 15, 20):
            a = spec_main(l); s = a
            if b[3] == 'mixed': a, s = round(lerp(5, 8, l)), round(lerp(5, 8, l))
            e, pt, ac = (round(lerp(b[4][i], b[5][i], l)) for i in range(3))
            g = own_grade(l); gx, acc = PROPOSAL['grades'][g]
            hit = plain_hit(b, l, a, s, gx)
            per_turn = 6 // b[6]
            door_pts = s if b[3] != 'mixed' else round(lerp(4, 8, l))
            n, cm = cash(door_pts, b[3])
            co = hit * cm
            if b[1] == 'smite':
                pistol = rnd(WEAP_BY['service_pistol']['damage'] * PROPOSAL['F']) * stat_new('gun', 1, 2) * deal_new(l) * gx
                turn_parts = [(pistol, 1 + acc), (pistol, 1 + acc), (pistol + hit, 1 + acc)]
                shown = pistol + hit
            else:
                turn_parts = [(hit, s - 1 + acc)] * per_turn
                shown = hit
            h = PROPOSAL['hp']
            hp = deal_new(l) * (h['base'] + h['per_end'] * (e - 1) + (l - 1) * (h['per_level'] + h['per_level_pt'] * pt))
            myarm = ARM.get(ac, 0) * PROPOSAL['F'] * gx * deal_new(l)
            cells, flags = [], []
            if l == 1 and shown >= 100: flags.append('D')
            if l == 20 and b[3] != 'mixed' and (shown < 1000 or co < 10000): flags.append('D')
            for tier in ('soldier', 'elite', 'boss'):
                ehp, earm, edmg, edef, eatk = enemy(tier, l)
                plain_turn = sum(max(1, x - earm) for x, m in turn_parts)
                # expected: each hit lands with chance hitp and is worth x (1 + Margins) minus armour
                exp_turn = 0
                for x, m in turn_parts:
                    for r in range(2, 21):
                        tot = r + m
                        if r != 20 and tot < edef: continue
                        mg = max(0, (tot - edef) // PROPOSAL['margins']['step']) + (PROPOSAL['margins']['crit'] if r == 20 else 0)
                        exp_turn += max(1, x * (1 + PROPOSAL['margins']['per'] * mg) - earm) / 20
                t1, t2 = ehp / plain_turn, ehp / max(1, exp_turn)
                if tier == 'elite' and t1 < 1: flags.append('E')
                if tier == 'boss' and t1 < 2: flags.append('B')
                if tier == 'boss' and t1 > 12: flags.append('L')
                cells.append('%s (%s)' % (fmt(t1, 1), fmt(t2, 1)))
            surv = []
            for tier in ('soldier', 'elite', 'boss'):
                ehp, earm, edmg, edef, eatk = enemy(tier, l)
                sv = hp / max(1, edmg - myarm)
                if tier == 'soldier' and sv < 2: flags.append('F')
                surv.append(fmt(sv, 1))
            rows.append([b[0] if l == 1 else '', l, '%d/%d' % (a, s), g, ARM_NAME.get(ac, ac), fmt(shown), 'x%d: %s' % (n, fmt(co)), fmt(hp)] + cells + surv + [' '.join(sorted(set(flags))) or '-'])
    return rows

def sec_check():
    print('## T7. The check: six builds against a same-level Soldier, Elite and Boss\n')
    print('Plain: one plain attack or cast, no Margins. A turn: 6 AP of it (the Chaplain: three pistol shots and one Smite). Cash-out: the Law 2 pattern at the door\'s Reach '
          '(each unit 1.2 x the one before, Bite 25 / 30 / 35%), on one plain hit. Kill: plain turns to kill one foe of that tier alone, after armour; in brackets counting misses and Margins. '
          'Survive: the same-level foe\'s rifle hits taken before 0 HP, after armour. Flags: D (digits: a level-1 plain hit over two digits; at level 20 a specialist\'s plain hit under four or its cash-out under five), '
          'E (a same-level Elite in under one turn), B (a Boss in under two turns alone), L (a Boss over twelve turns alone), F (under two Soldier hits survived).\n')
    table(['build', 'L', 'attr/skill', 'grade', 'armour', 'plain', 'cash-out', 'HP', 'turns: Soldier', 'Elite', 'Boss', 'survives: Soldier', 'Elite', 'Boss', 'flags'], check_rows())
    rows = []
    for tier in ('vermin', 'minion', 'soldier', 'elite', 'boss'):
        r = [tier]
        for l in (1, 5, 10, 15, 20):
            ehp, earm, edmg, edef, eatk = enemy(tier, l)
            r.append('%s HP, %s armour, %s a rifle hit' % (fmt(ehp), fmt(earm), fmt(edmg)))
        rows.append(r)
    table(['tier', 'L1', 'L5', 'L10', 'L15', 'L20'], rows)

# ------------------------------------------------------------------------------------------------ 8. costs
def sec_costs():
    print('## T8. Pools and costs as data holds them today\n')
    so = L('soul_modules.json'); te = L('techniques.json')['rules']['guard']; sg = RULES['mana']
    rows = [
        ['AP a turn', RULES['combat']['ap']['base'], 'rules.json combat.ap', 'flat: the clock'],
        ['Max MP', '100 + 75 x (Det - 1) + 25 x (Ins - 1) (typed in character.ts:860)', 'character.ts MP_BASE...', 'grows by points only'],
        ['Outburst school base cost', ', '.join('%s %s' % (x['id'], x['base_cost']) for x in so['schools']), 'soul_modules.json schools[].base_cost', 'flat MP; the bill grows with what is built'],
        ['Pump', RULES['mana']['soul'].get('pump_mp', '10% of the Begin a stage reached'), 'soul_modules.json cycle.pump_mp', 'share of the Begin'],
        ['Strain limit', '%d, +1 at Composure 1, 2, 4, 6, 8' % so['strain']['limit']['base'], 'soul_modules.json strain.limit', 'flat count'],
        ['Strain burn', '%d HP a point over (x the level column)' % so['strain']['burn_per_point'], 'soul_modules.json strain.burn_per_point', 'HP: on the deal column'],
        ['Mana Shock', '%d%% of max HP' % (100 * so['strain']['shock']['hp_share']), 'soul_modules.json strain.shock.hp_share', 'share of the bar'],
        ['Flux safe max', sg['sigil']['flux']['safe_max'], 'rules.json mana.sigil.flux.safe_max', 'flat count'],
        ['Flux overload', '%d true damage a Flux over' % sg['sigil']['flux']['overload']['damage_per_flux_over'], 'rules.json output.amounts.flux_overload', 'HP: on the deal column (flat profile)'],
        ['Core charge', 'standard %d, small %d, heavy %d' % (sg['cores']['standard']['charge'], sg['cores']['small']['charge'], sg['cores']['heavy']['charge']), 'rules.json mana.cores', 'flat count'],
        ['Guard plates', 'pool %s, max %s; soak %s a plate' % (te.get('gain_base'), L('skills.json')['items'][0]['per_point']['numbers']['pool_max'], te['soak']), 'techniques.json rules.guard; skills.json durability', 'count flat; soak on the deal column'],
        ['Devotion', '0 to 10; XP curve %s' % json.dumps(L('patrons.json')['devotion'].get('xp_curve') or L('patrons.json')['devotion'].get('curve') or '45/102/200/450'), 'patrons.json devotion', 'flat standing'],
        ['Echo', RULES['character'].get('echo', {}).get('max', 3) if isinstance(RULES['character'].get('echo'), dict) else 3, 'rules.json echo.max', 'flat count'],
        ['Feeling HP price', '%d HP a step' % L('feelings.json')['price']['hp_per_step'], 'feelings.json price.hp_per_step', 'HP: on the deal column'],
    ]
    table(['pool or cost', 'today', 'where', 'kind (section 7 of 01-scale.md)'], rows)

# ------------------------------------------------------------------------------------------------ 9. margins
def sec_margins():
    M = PROPOSAL['margins']
    print('## T9. Margins: the expected damage multiplier of one attack (misses count 0; in brackets the chance to hit)\n')
    rows = []
    for mod in range(-2, 10):
        r = ['%+d' % mod]
        for d in (10, 12, 14, 16):
            hits = sum(1 for x in range(2, 21) if x == 20 or x + mod >= d) / 20
            r.append('%s (%d%%)' % (fmt(margin_mult(mod, d), 2), round(100 * hits)))
        rows.append(r)
    table(['to-hit modifier', 'Defense 10', 'Defense 12', 'Defense 14', 'Defense 16'], rows)
    rows = []
    for mod in (0, 3, 6, 9, 12):
        d = 11; dist = collections.Counter()
        for x in range(2, 21):
            t = x + mod
            if x != 20 and t < d: dist['miss'] += 1; continue
            m = max(0, (t - d) // M['step']) + (M['crit'] if x == 20 else 0)
            dist[m] += 1
        dist['miss'] += 1
        rows.append(['%+d' % mod] + [str(dist.get(k, 0)) for k in ('miss', 0, 1, 2, 3, 4, 5, 6)])
    print('How many of the 20 faces give each count of Margins against a Soldier\'s Defense 11:\n')
    table(['modifier', 'miss', '0', '1', '2', '3', '4', '5', '6'], rows)

def sec_caps():
    print('## T10. The engine\'s caps that limit a reward (docs/design/proposals/2026-11-21-caps-the-engine-reads.md): see section 9 of 01-scale.md for the rulings\n')
    sv = L('survival.json')
    table(['cap', 'today'], [
        ['VS_CAP (target bonuses)', '+100% (output.ts:129)'],
        ['CRIT_MAX', '2.0 (character.ts:853)'],
        ['SIGIL_CAP / SIGIL_CAP_CRIT', '350 / 500 (sigil.ts:329, dead)'],
        ['boon_cap.cap', sv['boon_cap']['cap']],
        ['start_boon.max_worth', sv['start_boon']['max_worth']],
        ['shrine.token_max_worth', sv['shrine']['token_max_worth']],
        ['variants worth_cap', L('variants.json')['worth_cap']],
        ['rewards.ceiling', sv['rewards']['ceiling']],
        ['stage.elite_up', sv['stage']['elite_up']],
        ['loadout.budget', sv['loadout']['budget']],
        ['mending.cap_pct', RULES['mending']['cap_pct']],
        ['combat.elemental_taken_cap', RULES['combat']['elemental_taken_cap']],
    ])

SECTIONS = {'today': sec_today, 'columns': sec_columns, 'weapons': sec_weapons, 'digits': sec_digits, 'flat': sec_flat, 'stats': sec_stats,
            'hp': sec_hp, 'check': sec_check, 'costs': sec_costs, 'margins': sec_margins, 'caps': sec_caps}

if __name__ == '__main__':
    want = sys.argv[1:] or list(SECTIONS)
    for s in want: SECTIONS[s]()
