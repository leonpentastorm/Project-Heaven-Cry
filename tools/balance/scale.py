#!/usr/bin/env python
"""The number scale of the 0.34 rebalance (docs/design/growth/01-scale.md, second draft on the lead's rulings
docs/design/growth/00-rulings.md): every table of that file, printed.

READS data/*.json and prints. It writes nothing (no data change). Run from the repo root:

    PYTHONUTF8=1 python tools/balance/scale.py              # every table
    PYTHONUTF8=1 python tools/balance/scale.py top          # one section: today factor weapons digits columns cards
                                                            #   hp costs plate grades margins top check caps

The PROPOSAL block below holds every proposed number (all PROVISIONAL). Change one there and run again: every table
that reads it moves. Nothing here is fitted to a line or a ceiling: a table is a reading of what a player will see.
The one test this script applies is Leon's digits rule (a hit is one or two digits at level 1, four at level 20, five
for something super, never six), as ruling A8 asks.
"""
import json, math, os, re, sys, collections

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
def L(name):
    with open(os.path.join(ROOT, 'data', name), encoding='utf-8') as f:
        return json.load(f)

RULES, ENEM, WEAP, SKILLS = L('rules.json'), L('enemies.json'), L('weapons.json'), L('skills.json')
OUT = RULES['output']; FACT = OUT['factors']; PROF = OUT['profiles']
LEVELS = list(range(1, 21))
WEAP_BY = {w['id']: w for w in WEAP['items']}
TIERS = {t['id']: t for t in ENEM['items']}

# ------------------------------------------------------------------------------------------------ THE PROPOSAL
PROPOSAL = {
    # A1: one factor on every flat number (damage, HP, healing, shields, armour, soak, plates, cover, hazards, ticks,
    # enemy HP, items)
    'F': 0.6,
    # A1, Leon's "one or two digits at level 1": the four one-shot launcher rows whose level-1 hit would be three digits
    # at x0.6 take their own factor (their order among themselves is kept; they stay the biggest level-1 single hits)
    # A1 with Leon's "one or two digits at level 1": a row whose level-1 hit by a specialist (7 and 7) in Fine would be
    # three digits at x0.6 takes a factor of its own: the largest step of `digit_step` under F that keeps it two digits,
    # one factor for every such row of a category (so their order among themselves holds). Computed, never typed.
    'digit_step': 0.05,
    # A2: the level column every character amount, HP bar, armour value, soak and plate reads
    'deal_end': 40,
    # A5: character HP = (base + per_end x (End - 1) + per_level x (L - 1)) x (1 + pt_pct x PT) x deal(L)
    'hp': {'base': 60, 'per_end': 10, 'per_level': 1, 'pt_pct': 0.06},
    # A6 (04's): Max MP = (base + det x (Det - 1) + ins x (Ins - 1)) x mp(L); mp(L) = 1 + per_level x (L - 1)
    'mp_pool': {'base': 40, 'det': 12, 'ins': 8},
    'mp_per_level': 0.06,
    # A4: every door attribute +10% a point above 1, every alpha skill +5% a point; the two multiply
    'attr_slope': 0.10, 'skill_slope': 0.05,
    # A9: the grade ladder (damage or armour x, to hit +)
    'grades': {'standard': (1.0, 0), 'fine': (1.15, 1), 'masterwork': (1.3, 2), 'relic': (1.5, 3), 'celestial': (1.75, 3)},
    'devotion_grade_at': [(3, 'fine'), (5, 'masterwork'), (7, 'relic'), (10, 'celestial')],
    # A7: Margins
    'margins': {'step': 4, 'per': 0.25, 'per_perception': 0.01, 'crit': 2},
    # Law 2: each unit spent is worth `grow` x the one before
    'grow': 1.2,
    # enemies (A3, and the stated attacker and defender of item 10)
    'tier_damage_x': 1.28,
    'tier_defense': {'vermin': 8, 'minion': 9, 'soldier': 11, 'elite': 14, 'boss': 15},
    'ordinary_sum_per_level': 0.02,       # the ordinary sheet bonus a character of level L holds: +2% a level over 1
    'fight_length_at_20': 1.3,            # a level-20 fight is this many times a level-1 fight's length in plain hits
    'enemy_hp_end': 140,                  # hp_mult at level 20 (the working: T4b)
    'enemy_dmg_end': 54,                  # damage_mult at level 20 (the working: T4c)
    # the self-paid HP prices that become a share of the payer's max HP (A6 and its reason): today's number over the
    # old reference bar (rules.json mending.gate.hp, 145), to a whole percent
    'old_ref_bar': 145,
    # 07 section 5.4's sources of a squad's set-up on one blow, as A8 adds them (a sum, not a product)
    'squad_sum': [('Iron Grip II, the target Grappled or Prone', 0.30), ('Raised by Orks', 0.20), ('Pain Eater, below half HP', 0.50),
                  ('Biting (a mod)', 0.10), ('the weighted head (a mod)', 0.20), ('Honed (a boon)', 0.10),
                  ("an ally's True Name", 0.50), ('Case Closed', 0.30)],
}

# ------------------------------------------------------------------------------------------------ helpers
def geo(end, lvl): return end ** ((lvl - 1) / 19)
def deal(l): return geo(PROPOSAL['deal_end'], l)
def H(): return PROPOSAL['hp']
def hp_of(l, e, pt):
    h = H(); return (h['base'] + h['per_end'] * (e - 1) + h['per_level'] * (l - 1)) * (1 + h['pt_pct'] * pt) * deal(l)
NORMAL_BAR0 = H()['base'] + 3 * H()['per_end']   # Endurance 4: 90 before Pain Threshold
def mend(l): return deal(l) * (NORMAL_BAR0 + H()['per_level'] * (l - 1)) / NORMAL_BAR0
def mpcol(l): return 1 + PROPOSAL['mp_per_level'] * (l - 1)
def mp_pool(l, det, ins):
    m = PROPOSAL['mp_pool']; return (m['base'] + m['det'] * (det - 1) + m['ins'] * (ins - 1)) * mpcol(l)
def ehp(l): return geo(PROPOSAL['enemy_hp_end'], l)
def edmg(l): return geo(PROPOSAL['enemy_dmg_end'], l)
def S(n, g=None):
    g = g or PROPOSAL['grow']; return (g ** n - 1) / (g - 1)
def rnd(x): return int(math.floor(x + 0.5))
def fmt(x, d=0):
    if isinstance(x, str): return x
    if d == 0: return '{:,}'.format(int(round(x)))
    return ('{:,.%df}' % d).format(x)
def digits(x): return len(str(int(round(abs(x))))) if abs(x) >= 1 else 1
def table(head, rows):
    print('| ' + ' | '.join(head) + ' |')
    print('| ' + ' | '.join('---' for _ in head) + ' |')
    for r in rows: print('| ' + ' | '.join(str(c) for c in r) + ' |')
    print()
def G(g): return PROPOSAL['grades'][g][0]
def ACC(g): return PROPOSAL['grades'][g][1]

def old_stat(pid, a, s):
    p = PROF[pid]; return p['k'] * (1 + p['attr'] * (a - 1) + p['skill'] * s)

# The profiles after ruling A4. today: the profile's Stat term at a normal share (4 and 4, output.floor_reference),
# its system factor folded in; k is set so the same share deals today's number x F at level 1.
NEW_PROFILES = collections.OrderedDict([
    # id: (reads, today's normal share, level column, grade from, slopes on)
    ('melee',      ("the row's scales_with Attribute and hits_with skill (heavy and light melee, unarmed, shields)", old_stat('melee', 4, 4) * FACT['melee'], 'deal', 'the weapon', True)),
    ('gun',        ("the row's pair: Agility and Dexterity", old_stat('gun', 4, 4), 'deal', 'the weapon', True)),
    ('bow',        ("the row's pair: Agility and Dexterity (new row; bows read `weapon` today)", PROF['weapon']['k'], 'deal', 'the weapon', True)),
    ('thrown',     ("the row's pair: Agility and Dexterity (new row; factors.thrown folded in)", PROF['weapon']['k'] * FACT['thrown'], 'deal', 'the weapon', True)),
    ('weapon',     ("nothing (focus weapons, a beast's bite): unchanged", PROF['weapon']['k'], 'deal', 'the weapon', False)),
    ('physical',   ('Strength and Raw Power (Hurl, Grenadier\'s Arm)', old_stat('physical', 4, 4), 'deal', 'none', True)),
    ('guard',      ('Endurance and Durability (new row: a plate\'s soak)', 1.0, 'deal', 'the worn armour', True)),
    ('sigil',      ('Intelligence and Brain Power', old_stat('sigil', 4, 4), 'deal', 'the Evoker', True)),
    ('elemental',  ('Expression and Visualization', old_stat('elemental', 4, 4), 'deal', 'the Evoker', True)),
    ('figment',    ('Expression and Visualization (factors.figment folded in)', PROF['figment']['k'] * FACT['figment'], 'deal', 'the Visualizer', True)),
    ('figment_hp', ('Expression and Visualization', old_stat('figment_hp', 4, 4), 'enemy damage_mult (figments.json level.hp)', 'the Visualizer', True)),
    ('soul',       ('Determination and Will Power', old_stat('soul', 4, 4), 'deal', 'the Emanator', True)),
    ('blessing',   ('Virtue and Faith', old_stat('blessing', 4, 4), 'deal', 'Devotion', True)),
    ('healing',    ('Insight and Empathy', old_stat('healing', 4, 4), 'mend', 'the Attuner', True)),
    ('mend',       ('Insight and Empathy', old_stat('mend', 4, 4), 'mend', 'the Attuner', True)),
    ('tend',       ('Insight and Empathy (a damage amount on it reads deal)', old_stat('tend', 4, 4), 'mend', 'the Attuner', True)),
    ('sigil_mend', ('Intelligence and Brain Power', old_stat('sigil_mend', 4, 4), 'mend', 'the Evoker', True)),
    ('soul_mend',  ('Determination and Will Power', old_stat('soul_mend', 4, 4), 'mend', 'the Emanator', True)),
    ('blessing_mend', ('Virtue and Faith', old_stat('blessing_mend', 4, 4), 'mend', 'Devotion', True)),
    ('repair',     ('Expression and Proficiency (the beta: Proficiency\'s own line)', old_stat('repair', 4, 4), 'mend', 'none', True)),
    ('flat',       ('nothing: unchanged', 1.0, 'deal', 'none', False)),
])
def bracket(a, s, slopes=True):
    if not slopes: return 1.0
    return (1 + PROPOSAL['attr_slope'] * (a - 1)) * (1 + PROPOSAL['skill_slope'] * s)
K = {p: (v[1] / bracket(4, 4, v[4])) for p, v in NEW_PROFILES.items()}
def stat(p, a, s): return K[p] * bracket(a, s, NEW_PROFILES[p][4])
def margin_per(perception): M = PROPOSAL['margins']; return M['per'] + M['per_perception'] * perception

# ------------------------------------------------------------------------------------------------ the gates (B12) and the world (rulings 24, 25)
def spec_main(l):
    """A specialist's door attribute and alpha: 7 at creation (ceiling 7 to level 4), 8 at 5, 9 at 10, 10 at 15 (B12: the
    gate and the Attribute point that uses it land on the same level)."""
    return 7 if l < 5 else 8 if l < 10 else 9 if l < 15 else 10
def best_grade(l):
    """The best grade of the map that holds foes of level l (rulings 24, 25): maps 1 and 2 (levels 1 to 5) Fine; maps 3
    and 4 (to 9) Masterwork; map 5 and endless maps 6 to 9 (levels 10 to 15) Relic; endless map 10 on (16 on) Celestial."""
    return 'fine' if l <= 5 else 'masterwork' if l <= 9 else 'relic' if l <= 15 else 'celestial'
ORDER = ['standard', 'fine', 'masterwork', 'relic', 'celestial']
def stated_grade(l): return ORDER[ORDER.index(best_grade(l)) - 1]
def ord_sum(l): return PROPOSAL['ordinary_sum_per_level'] * (l - 1)

# ------------------------------------------------------------------------------------------------ T1 today
def sec_today():
    print('#### T1. Today: the output formula\'s terms as data holds them (rules.json output)\n')
    rows = []
    for pid, p in PROF.items():
        if not isinstance(p, dict): continue
        pair = OUT['pairs'].get(p.get('pair') or '', {})
        rows.append([pid, p.get('k'), p.get('attr'), p.get('skill'), p.get('level'), '/'.join(pair.get('attrs', [])) + ' ; ' + '/'.join(pair.get('skills', [])), p.get('floor', ''), p.get('min_pct', '')])
    table(['profile', 'k', 'attr', 'skill', 'level column', 'pair (attrs ; skills)', 'floor', 'min_pct'], rows)
    print('factors: ' + ', '.join('%s %s' % (k, v) for k, v in FACT.items() if isinstance(v, (int, float))) + '\n')
    rows = [[l, OUT['level']['deal'][l - 1], OUT['level']['scale'][l - 1], OUT['level']['mend'][l - 1]] for l in (1, 5, 10, 15, 20)]
    table(['level', 'deal', 'scale', 'mend'], rows)
    lt = ENEM['levels']['table']
    table(['level', 'hp_mult', 'armour_mult', 'damage_mult', 'defense_plus', 'attack_plus'],
          [[l, lt[l - 1]['hp_mult'], lt[l - 1]['armour_mult'], lt[l - 1]['damage_mult'], lt[l - 1]['defense_plus'], lt[l - 1]['attack_plus']] for l in (1, 5, 10, 15, 20)])

# ------------------------------------------------------------------------------------------------ T2 the factor
FLAT_KEYS = {'damage', 'hp', 'heal', 'shield', 'armour', 'splash_damage', 'tick', 'tick_damage', 'melee_damage', 'burn_per_point',
             'hp_per_step', 'self_damage', 'soak', 'damage_per_flux_over', 'heal_enemy', 'shield_enemy', 'boss_damage'}
SHARE_OF = re.compile(r'^(event:|self:max_hp|max_hp|res:ledger|damage$)')
HP_OPS = {'heal', 'shield', 'damage', 'deal', 'shield_grant'}
# self-paid HP prices: a share of the payer's max HP (section 7)
SELF_PRICE = {('soul_modules.json', '.strain.burn_per_point'), ('feelings.json', '.price.hp_per_step'), ('feelings.json', '.items[shame].pour.self_damage'),
              ('rules.json', '.mana.sigil.flux.overload.damage_per_flux_over'), ('rules.json', '.output.amounts.flux_overload.damage.per[0](flux_over)'),
              ('traits.json', '.items[crawler_blooded].amounts.blessing_burn.base')}
def flat_numbers():
    out = []
    def walk(o, path, f):
        if isinstance(o, dict):
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
                    out.append((f, p, v)); continue
                if isinstance(v, (int, float)) and not isinstance(v, bool) and (k in FLAT_KEYS or k == 'hp_per_point') and abs(v) >= 1:
                    if f == 'enemies.json' and ('.levels' in p): continue
                    if f == 'enemies.json' and k == 'damage' and p.startswith('.items'): continue
                    if f == 'skills.json' and '.per_point.numbers' in p: continue
                    if f == 'rules.json' and k == 'hp' and '.gate' in p: continue
                    if o.get('kind') in ('damage', 'heal', 'shield') and k == 'base': continue
                    out.append((f, p, v))
                elif isinstance(v, (dict, list)): walk(v, p, f)
        elif isinstance(o, list):
            for i, v in enumerate(o):
                walk(v, path + '[%s]' % ((v.get('id') if isinstance(v, dict) and v.get('id') else i)), f)
    for f in sorted(os.listdir(os.path.join(ROOT, 'data'))):
        if f.endswith('.json') and f != 'weapons.json': walk(L(f), '', f)
    return out
def rule_of(f, p):
    if (f, p) in SELF_PRICE: return 'share'
    if p.endswith('hp_per_level'): return '07'
    return 'F'
def new_value(f, p, v):
    r = rule_of(f, p)
    if r == 'share': return '%d%% of max HP' % rnd(100 * abs(v) / PROPOSAL['old_ref_bar'])
    if r == '07': return '07 restates (a share of max HP)'
    n = v * PROPOSAL['F']
    return round(n) if float(v).is_integer() and abs(n) >= 10 else round(n, 2)
def key_tail(p):
    t = re.sub(r'\[[^\]]*\]', '[]', p)
    t = re.sub(r'\(\w+\)', '', t)
    parts = t.strip('.').split('.')
    if parts[-1] in ('base', 'value') and len(parts) >= 3 and parts[-3].startswith('amounts'):
        return 'amounts.*.' + parts[-1]
    if parts[-1] == 'value' and 'effects' in t: return 'effects[].value (op heal / shield / damage / stat_mod hp)'
    if re.match(r'per$', parts[-1]) or 'per[]' in parts[-1]: return 'amounts.*.per[] (a part per Momentum, kg, charge, Guard, armour value...)'
    return parts[-1]
def sec_factor():
    out = flat_numbers()
    print('#### T2. The factor x%s: every data file and key it applies to\n' % PROPOSAL['F'])
    agg = collections.OrderedDict()
    for f, p, v in out:
        r = rule_of(f, p)
        k = (f, key_tail(p) if r == 'F' else p.strip('.'), r)
        agg[k] = agg.get(k, 0) + 1
    rows = [[f, k, n, {'F': 'x%s' % PROPOSAL['F'], 'share': 'a share of max HP (section 6)', '07': 'restated by 07'}[r]] for (f, k, r), n in agg.items()]
    rows.insert(0, ['weapons.json', 'items[].damage (a number, a within_4 / within_8 band, or a bow\'s base + per-point formula), items[].splash_damage', len(WEAP['items']), 'x%s, half up; the launcher rows x their own (T3)' % PROPOSAL['F']])
    rows += [['rules.json', 'combat.armor.classes[].value', len(RULES['combat']['armor']['classes']), 'x%s' % PROPOSAL['F']],
             ['rules.json', 'combat.attack.cover.half.hp, .full.hp', 2, 'x%s' % PROPOSAL['F']],
             ['rules.json', 'mending.gate.hp (the normal bar the heal gate counts to)', 1, 'becomes the normal bar at level 1 (section 3.1)'],
             ['soul_modules.json', 'damage.base, damage.enemy_base', 2, 'x%s' % PROPOSAL['F']],
             ['patrons.json', 'prayer.intervention.amount.base, .per_devotion', 2, 'x%s' % PROPOSAL['F']],
             ['enemies.json', 'items[].damage (a tier\'s damage factor, not HP)', 5, 'x%s (section 3.4)' % PROPOSAL['tier_damage_x']]]
    table(['file', 'key', 'numbers', 'rule'], rows)
    print('Not touched by the factor: every share (`*_pct`, `*_share`, `*_mult`, `hp_frac`, `min_pct`, `cap_pct`, `stim_pct`, a `per[]` of `event:*`, `self:max_hp`, `max_hp`, `res:ledger`, `damage`) and every count (plates, pips, Shadow, glyphs, charge, cores, Flux, Strain, Echo, Devotion, AP).\n')
    print('#### T2b. Every number the factor moves outside weapons.json (%d), today and new\n' % len(out))
    table(['file', 'path', 'today', 'new'], [[f, p, v, new_value(f, p, v)] for f, p, v in out])

# ------------------------------------------------------------------------------------------------ T3 weapons
def row_F(wid): return LAUNCHER_F.get(wid, PROPOSAL['F'])
LAUNCHER_F = {}
def _launchers():
    """The rows that break the digits rule at level 1 at x F, and their category's own factor (see PROPOSAL)."""
    def l1(w, f):
        d = w['damage']; v = max(d.values()) if isinstance(d, dict) else d
        return rnd(v * f) * wstat(w, 7, 7, 3) * G('fine')
    out = {}
    by = collections.defaultdict(list)
    for w in WEAP['items']:
        if not isinstance(w['damage'], str) and base_num(w['damage']) and l1(w, PROPOSAL['F']) >= 100: by[w['category']].append(w)
    for cat, ws in by.items():
        f = PROPOSAL['F']
        while f > PROPOSAL['digit_step'] and any(l1(w, f) >= 100 for w in ws): f = round(f - PROPOSAL['digit_step'], 2)
        for w in ws: out[w['id']] = f
    return out
def is_draw(w): return isinstance(w['damage'], str)
def draw_bracket(a, dex, rp): return (1 + PROPOSAL['attr_slope'] * (a - 1)) * (1 + PROPOSAL['skill_slope'] * (dex + rp))
def wstat(w, a, s, rp=4):
    """A weapon's Stat term on the new profiles (a draw bow reads Dexterity and Raw Power)."""
    if is_draw(w): return K['bow'] * draw_bracket(a, s, rp)
    return stat(new_profile(w), a, s)
def new_weapon_damage():
    out = {}
    for w in WEAP['items']:
        d = w['damage']; F = row_F(w['id'])
        if isinstance(d, (int, float)): out[w['id']] = max(1, rnd(d * F)) if d > 0 else 0
        elif isinstance(d, dict): out[w['id']] = {k: max(1, rnd(v * F)) for k, v in d.items()}
        else:
            # a draw bow (base + per x Raw Power): the draw moves onto the Stat term (phys.also_scales [dexterity,
            # raw_power]); the row's number is set so a normal share (Agility 4, Dexterity 4, Raw Power 4) deals
            # today's blow x F, the same pin as every profile's k
            m = re.match(r'\s*(\d+)\s*\+\s*(\d+)\s*\*\s*(\w+)', d)
            today = (int(m.group(1)) + 4 * int(m.group(2))) * PROF['weapon']['k']
            out[w['id']] = rnd(today * F / (K['bow'] * draw_bracket(4, 4, 4)))
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
def new_profile(w):
    ph = w.get('phys') or {}; prof = ph.get('profile'); cat = w['category']
    if prof in ('melee', 'gun'): return prof
    if cat == 'bow': return 'bow'
    if cat == 'thrown': return 'thrown'
    return 'weapon'
def pair_word(w):
    ph = w.get('phys') or {}
    return '/'.join(ph.get('scales_with') or []) + ' x ' + ('dexterity + raw_power (also_scales)' if is_draw(w) else (ph.get('hits_with') or ''))
def base_num(d, rp=10):
    if isinstance(d, dict): return max(d.values())
    if isinstance(d, str):
        m = re.match(r'(\d+) \+ (\d+)\*', d); return int(m.group(1)) + rp * int(m.group(2))
    return d
def sec_weapons():
    new, meets = new_weapon_damage()
    print('#### T3. Every weapon row: damage today and new (x%s half up; the rows of the last table of T3b x their own), and its profile\n' % PROPOSAL['F'])
    rows = []
    for w in sorted(WEAP['items'], key=lambda w: (w['category'], str(w['damage']))):
        ph = w.get('phys') or {}
        rows.append([w['category'], w['id'], json.dumps(w['damage']).replace('"', ''), json.dumps(new[w['id']]).replace('"', ''), row_F(w['id']),
                     (ph.get('profile') or 'weapon'), new_profile(w), pair_word(w)])
    table(['category', 'id', 'damage today', 'damage new', 'factor', 'profile today', 'profile new', 'pair the row reads (scales_with x hits_with)'], rows)
    print('Rows of one category that meet on one new number: %d\n' % len(meets))
    if meets: table(['category', 'lower row', 'today', 'higher row', 'today', 'new (both)', 'gap today'], meets)
    print('Meetings where the gap today was a tenth or more: %d\n' % len([m for m in meets if float(m[-1].rstrip('%')) >= 10]))
    table(['id', 'splash_damage today', 'new'], [(w['id'], w['splash_damage'], rnd(w['splash_damage'] * row_F(w['id']))) for w in WEAP['items'] if w.get('splash_damage')])

def sec_digits():
    new, _ = new_weapon_damage()
    print('#### T3b. Leon\'s digits rule, weapon by category: the strongest row of each, one plain hit (no Margins, no sheet; a draw bow at Raw Power 0 / 4 / 3 / 3 at level 1, 10 at level 20)\n')
    best = {}
    for w in WEAP['items']:
        v = base_num(new[w['id']])
        if v and (w['category'] not in best or v > best[w['category']][1]): best[w['category']] = (w['id'], v, w)
    rows = []; worst1 = 0
    for cat, (wid, v, w) in sorted(best.items()):
        p = new_profile(w)
        l1 = [v * wstat(w, a, s, rp) * g for a, s, rp, g in ((1, 0, 0, 1), (4, 4, 4, 1), (7, 7, 3, 1), (7, 7, 3, G('fine')))]
        l20 = [v * wstat(w, 10, 10, 10) * deal(20) * G(g) for g in ('relic', 'celestial')]
        worst1 = max(worst1, l1[-1])
        flag = ('over 2 digits at L1' if l1[-1] >= 100 else '') + (' over 4 at L20' if l20[-1] >= 10000 else '')
        rows.append([cat, wid, v, p] + [fmt(x) for x in l1] + [fmt(x) for x in l20] + [flag or '-'])
    table(['category', 'strongest row', 'new base', 'profile', 'L1 at 1/0', 'L1 at 4/4', 'L1 at 7/7', 'L1 at 7/7 Fine', 'L20 at 10/10 Relic', 'L20 at 10/10 Celestial', 'flag'], rows)
    lw = [(w['id'], w['damage'], rnd(w['damage'] * PROPOSAL['F']), new[w['id']]) for w in WEAP['items'] if w['id'] in LAUNCHER_F]
    rows = []
    for wid, old, at06, now in lw:
        w = WEAP_BY[wid]; top = wstat(w, 7, 7) * G('fine')
        rows.append([wid, old, at06, fmt(at06 * top), LAUNCHER_F[wid], now, fmt(now * top), fmt(now * wstat(w, 10, 10) * deal(20) * G('celestial'))])
    print('The rows that take a factor of their own: at x%s a level-1 specialist in Fine would put three digits on screen\n' % PROPOSAL['F'])
    table(['row', 'today', 'at x0.6', 'L1 7/7 Fine at x0.6', 'own factor', 'new', 'L1 7/7 Fine', 'L20 10/10 Celestial'], rows)

# ------------------------------------------------------------------------------------------------ T4 columns
def attacker_growth(l):
    a = spec_main(l)
    st = (stat('melee', a, a) / stat('melee', 7, 7) + stat('gun', a, a) / stat('gun', 7, 7)) / 2
    return deal(l) * st * G(stated_grade(l)) / G(stated_grade(1)) * (1 + ord_sum(l)) / (1 + ord_sum(1)), a, st
def frail_need(l):
    """damage_mult that keeps the stated frail defender (Endurance 1, Pain Threshold 0, Light armour in the stated grade)
    at its level-1 count of a same-level Soldier's rifle hits."""
    sol = PROPOSAL['tier_damage_x'] * TIERS['soldier']['damage']; base = rnd(30 * PROPOSAL['F'])
    arm = lambda lv: 5 * PROPOSAL['F'] * deal(lv) * G(stated_grade(lv))
    n1 = hp_of(1, 1, 0) / (base * sol - arm(1))
    return (hp_of(l, 1, 0) / n1 + arm(l)) / (base * sol), n1
def sec_columns():
    print('#### T4. The level columns, levels 1 to 20\n')
    print('deal(L) = %s ^ ((L - 1) / 19); mend(L) = deal(L) x (%d + %s x (L - 1)) / %d (the normal bar\'s growth: Endurance 4, any Pain Threshold); '
          'mp(L) = 1 + %s x (L - 1); hp_mult(L) = %s ^ ((L - 1) / 19); damage_mult(L) = %s ^ ((L - 1) / 19); armour_mult(L) = deal(L); defense_plus and attack_plus 0.\n'
          % (PROPOSAL['deal_end'], NORMAL_BAR0, H()['per_level'], NORMAL_BAR0, PROPOSAL['mp_per_level'], PROPOSAL['enemy_hp_end'], PROPOSAL['enemy_dmg_end']))
    rows = [[l, fmt(deal(l), 3), fmt(mend(l), 3), fmt(mpcol(l), 2), fmt(ehp(l), 3), fmt(edmg(l), 3), fmt(deal(l), 3), 0, 0] for l in LEVELS]
    table(['level', 'deal', 'mend', 'mp', 'enemy hp_mult', 'enemy damage_mult', 'enemy armour_mult', 'defense_plus', 'attack_plus'], rows)
    print('#### T4b. The enemy HP column\'s working: the stated attacker\n')
    rows = []
    for l in (1, 5, 6, 10, 15, 16, 20):
        g, a, st = attacker_growth(l)
        rows.append([l, '%d/%d' % (a, a), stated_grade(l), '+%d%%' % rnd(100 * ord_sum(l)), fmt(deal(l), 2), fmt(st, 3), fmt(g, 1), fmt(ehp(l), 1), fmt(ehp(l) / g, 2)])
    table(['level', 'door attribute / alpha', 'grade (one under the map\'s best)', 'ordinary sheet sum', 'deal', 'Stat growth (melee and gun)', 'attacker growth', 'hp_mult', 'fight length vs level 1'], rows)
    g20 = attacker_growth(20)[0]
    print('At level 20 the stated attacker hits x%s harder than at level 1; x %s (the fight a little longer, the charter) is %s; the PROPOSAL rounds it to %s.\n' % (fmt(g20, 1), PROPOSAL['fight_length_at_20'], fmt(g20 * PROPOSAL['fight_length_at_20'], 1), PROPOSAL['enemy_hp_end']))
    print('#### T4c. The enemy damage column\'s working: the stated defender\n')
    rows = []
    for l in (1, 5, 10, 15, 20):
        need, n1 = frail_need(l)
        rows.append([l, fmt(hp_of(l, 1, 0)), stated_grade(l), fmt(5 * PROPOSAL['F'] * deal(l) * G(stated_grade(l)), 1), fmt(need, 2), fmt(edmg(l), 2), fmt(hp_of(l, 1, 0) / (rnd(30 * PROPOSAL['F']) * PROPOSAL['tier_damage_x'] * TIERS['soldier']['damage'] * edmg(l) - 5 * PROPOSAL['F'] * deal(l) * G(stated_grade(l))), 1)])
    table(['level', 'frail HP (End 1, PT 0)', 'armour grade', 'Light armour', 'damage_mult that keeps its count', 'damage_mult (proposed)', 'Soldier rifle hits it survives'], rows)

# ------------------------------------------------------------------------------------------------ T5 the cards
CARDS = [
    # attribute, alpha, door, card (attribute), card (alpha), profiles, reference action (name, base, profile, column)
    ('endurance', 'durability', 'Guard', '+10 base HP, +10% a plate soaks and a Slam, +10% shield blows, +10% to ignore an injury', '+5% a plate soaks and a Slam, +5% shield blows', 'guard; melee on shield rows',
     ('a plate (3.6)', 3.6, 'guard', 'deal')),
    ('strength', 'raw_power', 'Momentum', '+10% melee damage (rows that scale with Strength), +5 kg carried', '+5% melee damage (rows that hit with Raw Power)', 'melee; physical',
     ('a maul blow (27)', 27, 'melee', 'deal')),
    ('agility', 'dexterity', 'Pressure', '+10% damage with Dexterity weapons (guns, bows, light blades, thrown), +0.5 tile an AP, +1 Initiative', '+5% damage with Dexterity weapons, +1 to hit with them', 'gun; bow; thrown; melee on Agility rows',
     ('a service rifle shot (18)', 18, 'gun', 'deal')),
    ('perception', 'ingenuity', 'Shadow', '+10% on a Break; +1 point on a Margin\'s worth (A7); +2 tiles of vision', '+5% on a Break', 'the Break\'s pair (section 4.3)',
     ('a Break\'s rifle shot (18)', 18, 'gun', 'deal')),
    ('intelligence', 'brain_power', 'Sigils', '+10% Sigil power', '+5% Sigil power', 'sigil; sigil_mend',
     ('a FIRE glyph (18)', 18, 'sigil', 'deal')),
    ('expression', 'visualization', 'Figments', '+10% Figment blows and HP, +10% elemental damage; glyphs 0.1 AP cheaper', '+5% Figment blows and HP, +5% elemental damage', 'figment; figment_hp; elemental',
     ('a beast\'s claws (18)', 18, 'figment', 'deal')),
    ('insight', 'empathy', 'Bonds', '+10% healing and shields given, +8 max MP (x mp), 5% cheaper Soul magic', '+5% healing and shields given', 'healing; mend; tend',
     ('a Mend (2.25)', 2.25, 'tend', 'mend')),
    ('determination', 'will_power', 'Outbursts', '+10% Soul power, +12 max MP (x mp), +5% mana syphoned', '+5% Soul power', 'soul; soul_mend',
     ('the Damage school (22.2)', 22.2, 'soul', 'deal')),
    ('virtue', 'faith', 'Prayer', '+10% Blessing power; Hymns return sooner (04)', '+5% Blessing power', 'blessing; blessing_mend',
     ('Judgement (34)', 34, 'blessing', 'deal')),
]
def sec_cards():
    print('#### T5. The profiles after ruling A4: attribute +%d%% a point above 1, alpha +%d%% a point, the two multiplied; k set so a normal share (4 and 4) deals today\'s number x%s at level 1\n'
          % (100 * PROPOSAL['attr_slope'], 100 * PROPOSAL['skill_slope'], PROPOSAL['F']))
    rows = []
    for p, (reads, today, col, grade, sl) in NEW_PROFILES.items():
        rows.append([p, reads, PROPOSAL['attr_slope'] if sl else 0, PROPOSAL['skill_slope'] if sl else 0, fmt(today, 3), fmt(K[p], 4), col, grade,
                     fmt(stat(p, 1, 0), 3), fmt(stat(p, 7, 7), 3), fmt(stat(p, 10, 10), 3)])
    table(['profile', 'reads', 'attr', 'skill', 'today at 4/4', 'k new', 'level column', 'grade from', 'Stat at 1/0', 'at 7/7', 'at 10/10'], rows)
    print('#### T5b. The nine attribute cards and the nine alpha cards: what one point is worth (the reference action, Standard grade, the other side of the pair at 4)\n')
    rows = []
    for attr, alpha, door, ca, cs, profs, (ref, base, p, col) in CARDS:
        c = deal if col == 'deal' else mend
        a1 = [base * K[p] * PROPOSAL['attr_slope'] * (1 + PROPOSAL['skill_slope'] * 4) * c(l) for l in (1, 10, 20)]
        s1 = [base * K[p] * PROPOSAL['skill_slope'] * (1 + PROPOSAL['attr_slope'] * 3) * c(l) for l in (1, 10, 20)]
        rows.append([door, attr, ca, ref, ' / '.join(fmt(x, 1) for x in a1), alpha, cs, ' / '.join(fmt(x, 1) for x in s1), profs])
    table(['door', 'attribute', 'its card', 'reference action', 'one attribute point adds, L1 / L10 / L20', 'alpha', 'its card', 'one alpha point adds, L1 / L10 / L20', 'profiles (rules.json output.profiles)'], rows)
    e1 = [hp_of(l, 2, 4) - hp_of(l, 1, 4) for l in (1, 10, 20)]
    print('Endurance\'s HP line on its own (Pain Threshold 4): one point is +%s HP at levels 1 / 10 / 20. Insight\'s and Determination\'s MP lines: +%s and +%s MP at level 1, x mp after.\n'
          % (' / '.join(fmt(x) for x in e1), PROPOSAL['mp_pool']['ins'], PROPOSAL['mp_pool']['det']))

# ------------------------------------------------------------------------------------------------ T6 HP
def sec_hp():
    h = H()
    print('#### T6. Character HP = (%d + %d x (Endurance - 1) + %d x (level - 1)) x (1 + %s x Pain Threshold) x deal(level)\n' % (h['base'], h['per_end'], h['per_level'], h['pt_pct']))
    rows = []
    for e in (1, 4, 7, 10):
        for pt in (0, 5, 10):
            rows.append(['End %d, PT %d' % (e, pt)] + [fmt(hp_of(l, e, pt)) for l in (1, 5, 10, 15, 20)])
    table(['build', 'L1', 'L5', 'L10', 'L15', 'L20'], rows)
    def hp_old(l, e, pt): return OUT['level']['scale'][l - 1] * (100 + 15 * (e - 1) + (l - 1) * (5 + 2 * pt))
    rows = [['End %d, PT %d' % (e, pt)] + ['%s (%s)' % (fmt(hp_of(l, e, pt)), fmt(hp_old(l, e, pt))) for l in (1, 10, 20)] for e, pt in ((1, 0), (4, 4), (7, 0), (10, 10))]
    print('Against today (in brackets; today\'s units, before x%s):\n' % PROPOSAL['F'])
    table(['build', 'L1', 'L10', 'L20'], rows)
    rows = []
    for l in (1, 10, 20):
        b = hp_of(l, 4, 4); e = hp_of(l, 5, 4) - b; p = hp_of(l, 4, 5) - b
        rows.append([l, fmt(b), '+%s (%s%%)' % (fmt(e), fmt(100 * e / b, 1)), '+%s (%s%%)' % (fmt(p), fmt(100 * p / b, 1))])
    table(['level', 'HP at End 4, PT 4', 'one Endurance point', 'one Pain Threshold point'], rows)

# ------------------------------------------------------------------------------------------------ T7 costs
def sec_costs():
    so = L('soul_modules.json'); te = L('techniques.json')['rules']; sg = RULES['mana']; fe = L('feelings.json'); fi = L('figments.json')
    print('#### T7a. The MP pool: (%d + %d x (Determination - 1) + %d x (Insight - 1)) x mp(level)\n' % tuple(PROPOSAL['mp_pool'][k] for k in ('base', 'det', 'ins')))
    rows = []
    for det, ins in ((1, 1), (4, 4), (7, 2), (2, 7), (10, 4), (10, 10)):
        rows.append(['Det %d, Ins %d' % (det, ins)] + [fmt(mp_pool(l, det, ins)) for l in (1, 5, 10, 15, 20)] + [fmt(100 + 75 * (det - 1) + 25 * (ins - 1))])
    table(['build', 'L1', 'L5', 'L10', 'L15', 'L20', 'today (every level)'], rows)
    bands = sg['meter']['bands']
    print('#### T7b. Every cost in the game, its data key and its rule\n')
    print('Rules: **clock** (AP, never scales); **count** (never scales: the pool grows by points, the bill by what you build); **design** (MP, flat: it grows with the design, never with the level); '
          '**mp** (MP, x the `mp` column at the payer\'s level); **share** (HP paid by yourself: a share of your own max HP); **deal** (HP dealt to someone else: x%s and the dealer\'s column).\n' % PROPOSAL['F'])
    cost = lambda path, data: data
    rows = [
        ['AP a turn, every action\'s AP', 'rules.json combat.ap; each action\'s `ap` / `ap_cost`', '%d a turn, 2 to 9' % RULES['combat']['ap']['base'], 'unchanged', 'clock'],
        ['Max MP', 'character.ts:860 `MP_BASE`... (typed) to attributes.json determination and insight `derived`', '100 + 75 x (Det - 1) + 25 x (Ins - 1)', '(40 + 12 x (Det - 1) + 8 x (Ins - 1)) x mp (04)', 'mp'],
        ['an Outburst school', 'soul_modules.json schools[].base_cost', ', '.join('%s %s' % (x['id'], x['base_cost']) for x in so['schools']), 'unchanged', 'design'],
        ['a module, a tone, a second school', 'soul_modules.json items[].cost, tones[].cost, second_school.cost; rules.json mana.soul.design.second_school_extra_cost', 'modules 5 to 20, tones 5, second school 10', 'unchanged', 'design'],
        ['a Pump', 'soul_modules.json cycle.pump_mp.share_per_stage (read at magic.ts:793-807)', '%s of the Begin for each stage it reaches' % so['cycle']['pump_mp']['share_per_stage'], 'a tenth of the Begin each (04), so the price grows with the design', 'design'],
        ['Syphon', 'rules.json mana.meter.bands[].syphon_mp; syphon_bonus_pct (:377); skills.json will_power per_point.numbers.syphon; character.ts:903 `syphonMult` (typed)', '/'.join(str(b['syphon_mp']) for b in bands) + ' x (1 + 0.1 x (Det - 1) + 0.1 x Will Power)', '10 / 20 / 30 / 40 x (1 + 0.05 x (Det - 1)) x mp (04); Will Power leaves it', 'mp'],
        ['the air\'s Soul cost', 'rules.json mana.meter.bands[].soul_cost_mult', '/'.join(str(b['soul_cost_mult']) for b in bands), 'unchanged', 'a share'],
        ['Mend, Mend Yourself, Shield, Field Surgery', 'tending.json items[tend.mend / tend.mend_self / tend.shield / tend.field_surgery].effects[0].res.mp.base', '24, 24, 30, 45 (Empathy 9: -6)', '12, 12, 15, 30; Empathy 9: a quarter less (04)', 'mp'],
        ['a Bonded ally goes Down', 'tending.json bond.down_mp', L('tending.json')['bond']['down_mp'], '8 (04)', 'mp'],
        ['Triage, Inspire, Rally (the Mender)', 'classes.json move_pool.moves[triage / inspire].effects[0].res.mp; base[bard].ranks.III.moves[rally].effects[0].res.mp', '18, 30, 60', '10, 12, 35 (04)', 'mp'],
        ['perks that cost MP', 'perks.json items[nobody_left_behind / steady_hands / pull_together] effects res.mp', '36; 15, 18; 12, 15', 'x0.5, as Tending (07 restates)', 'mp'],
        ['an enemy caster\'s pool', 'enemies.json soul_casters[].mp', '80, 140, 220', 'x mp at its level; 06 restates the number on the new pool', 'mp'],
        ['Strain', 'soul_modules.json cycle.begin_strain, swell_strain, flooded_strain, no_emanator_strain; items[].strain_extra; feelings.json items[].pour.strain; strain.limit', 'Begin 1, swell 1, Flooded 2, no Emanator 4; limit 3 + Composure steps', 'unchanged', 'count'],
        ['Strain\'s burn', 'soul_modules.json strain.burn_per_point (magic.ts:734 `STRAIN_BURN`); text rules.json:1486', '%d HP a point over, x scale' % so['strain']['burn_per_point'], '6% of max HP a point over (A6); the key becomes `burn_share` 0.06 and the text reads it', 'share'],
        ['Mana Shock', 'soul_modules.json strain.shock.hp_share', '%d%% of max HP' % rnd(100 * so['strain']['shock']['hp_share']), 'unchanged', 'share'],
        ['a feeling bought with HP', 'feelings.json price.hp_per_step', '%d HP a step' % fe['price']['hp_per_step'], '%d%% of max HP a step' % rnd(100 * fe['price']['hp_per_step'] / PROPOSAL['old_ref_bar']), 'share'],
        ['Shame\'s pour', 'feelings.json items[shame].pour.self_damage', '8 HP', '%d%% of max HP' % rnd(800 / PROPOSAL['old_ref_bar']), 'share'],
        ['Flux', 'sigils.json items[].flux; rules.json mana.sigil.flux.safe_max', '1 a glyph (2 for TWICE); safe %d' % sg['sigil']['flux']['safe_max'], 'unchanged in the rule (03 sets the limit by Rumination)', 'count'],
        ['Flux overload', 'rules.json mana.sigil.flux.overload.damage_per_flux_over; output.amounts.flux_overload', '%d true damage a Flux over' % sg['sigil']['flux']['overload']['damage_per_flux_over'], '%d%% of max HP a Flux over' % rnd(100 * sg['sigil']['flux']['overload']['damage_per_flux_over'] / PROPOSAL['old_ref_bar']), 'share'],
        ['a glyph\'s charge, a core', 'sigils.json items[].charge; rules.json mana.cores.*.charge; skills.json brain_power per_point.numbers.charge', 'words 1 to 2; cores 5 / 10 / 20', 'unchanged', 'count'],
        ['a Figment\'s charge, upkeep, the Visualizer\'s core', 'figments.json forms[].charge, trait_charge, upkeep, visualizer.charge', 'forms 1 to 4, traits 1, core %d' % fi['visualizer']['charge'], 'unchanged in the rule (03 sets the upkeep)', 'count'],
        ['Shadow spent', 'shadow.json items[].effects res.shadow; forks.json', '1 to 2', 'unchanged', 'count'],
        ['plates spent', 'skills.json durability unlocks res.guard; techniques.json rules.guard.interpose_cost, items[shield_bash].numbers.guard_cost', 'Challenge 1, Slam 2, Interpose 1, Shield Bash 1', 'unchanged in the rule (02 sets Slam to all)', 'count'],
        ['Momentum spent', 'techniques.json rules.momentum.strike_cost, opener_cost; items[].numbers.momentum_cost', '1, 1', 'unchanged', 'count'],
        ['pips spent', 'techniques.json rules.pressure.take_cost', te['pressure']['take_cost'], 'unchanged in the rule (02 makes a Take spend all)', 'count'],
        ['Devotion spent', 'patrons.json prayer.miracle.devotion_cost_levels', '5 levels', 'unchanged (04 adds the Push\'s XP)', 'count'],
        ['Echo', 'rules.json echo', '1 a reroll, 3 at most', 'unchanged', 'count'],
        ['Redline (the Rigger) hurts its Figment', 'classes.json base[trickster].ranks.II.moves[overclock].amounts.strain.base', '5 true damage', '3.0 on the flat profile (deal)', 'deal'],
        ['a trap, a hazard, a barrel, burning, bleeding', 'objects.json items[].trap / hazard / explodes.damage; conditions.json items[].amounts.tick', 'T2b', 'x%s; the dealer\'s column (a hazard with no dealer: the fight\'s level on damage_mult)' % PROPOSAL['F'], 'deal'],
    ]
    table(['cost', 'data key', 'today', 'new (PROVISIONAL)', 'rule'], rows)
    rows = []
    for l, det, ins, begin in ((1, 7, 2, 25), (10, 9, 3, 45), (20, 10, 4, 75)):
        pool = mp_pool(l, det, ins); full = begin * (1 + 0.1 * (4 if l < 20 else 5))
        rows.append([l, 'Det %d, Ins %d' % (det, ins), fmt(pool), begin, fmt(full, 1), fmt(pool / full, 1), fmt(12 * mpcol(l)), fmt(pool / (12 * mpcol(l)), 1)])
    print('What the pool buys (04\'s typical designs; a full cash-out is the Begin and a tenth of it for each Pump to Reach):\n')
    table(['level', 'Channeler', 'pool', 'a design\'s Begin', 'a full cash-out', 'full cash-outs a pool', 'a Mend (12 x mp)', 'Mends a pool'], rows)

# ------------------------------------------------------------------------------------------------ T8 plate and armour
def plate(l, e, d, g='standard'): return 3.6 * stat('guard', e, d) * deal(l) * G(g)
def sec_plate():
    print('#### T8. One plate\'s soak = 3.6 x Stat(guard: Endurance, Durability) x deal(level) x the worn armour\'s grade (then Pain Threshold\'s feed, 02\'s)\n')
    rows = []
    for e, d in ((1, 0), (4, 4), (7, 7), (10, 10)):
        rows.append(['End %d, Dur %d' % (e, d)] + [fmt(plate(l, e, d), 1) for l in (1, 5, 10, 15, 20)] + [fmt(plate(20, e, d, 'celestial'), 1)])
    table(['build', 'L1', 'L5', 'L10', 'L15', 'L20', 'L20 Celestial'], rows)
    sol = [rnd(30 * PROPOSAL['F']) * PROPOSAL['tier_damage_x'] * TIERS['soldier']['damage'] * edmg(l) for l in (1, 10, 20)]
    print('A same-level Soldier\'s rifle hit for comparison: %s at levels 1 / 10 / 20.\n' % ' / '.join(fmt(x) for x in sol))
    print('#### T8b. Armour values: class value x%s x deal(level) x the grade\n' % PROPOSAL['F'])
    rows = []
    for a in RULES['combat']['armor']['classes']:
        if not a['value']: continue
        v = a['value'] * PROPOSAL['F']
        rows.append([a['name'], a['value'], fmt(v, 1)] + [fmt(v * deal(l) * G(g), 1) for l, g in ((1, 'standard'), (1, 'fine'), (10, 'masterwork'), (10, 'relic'), (20, 'relic'), (20, 'celestial'))])
    table(['class', 'today', 'new at L1', 'L1 Standard', 'L1 Fine', 'L10 Masterwork', 'L10 Relic', 'L20 Relic', 'L20 Celestial'], rows)
    rows = [[t, TIERS[t]['armour'], fmt(TIERS[t]['armour'] * PROPOSAL['F'], 1)] + [fmt(TIERS[t]['armour'] * PROPOSAL['F'] * deal(l), 1) for l in (1, 5, 10, 15, 20)] for t in TIERS]
    print('An enemy\'s armour: the tier\'s value x%s x armour_mult (= deal):\n' % PROPOSAL['F'])
    table(['tier', 'today', 'new', 'L1', 'L5', 'L10', 'L15', 'L20'], rows)

# ------------------------------------------------------------------------------------------------ T9 grades
def sec_grades():
    print('#### T9. The grade ladder (A9): one row per grade, read by weapons, armour, the four foci and Devotion\n')
    rd = RULES['rarity']; dev = dict((g, d) for d, g in PROPOSAL['devotion_grade_at'])
    rows = []
    for g in ORDER:
        x, acc = PROPOSAL['grades'][g]
        also = {'masterwork': 'a mod slot more', 'relic': 'one property (no boon room)', 'celestial': 'two properties (no boon room)'}.get(g, '')
        rows.append([g, 'x%s, +%d' % (rd[g]['dmg'], rd[g]['acc']), 'x%s' % x, '+%d' % acc, 'x%s' % x, 'x%s, +%d to hit (a spell with a roll)' % (x, acc), 'standing %s: x%s' % (dev[g], x) if g in dev else 'standing 0 to 2: x1', also])
    table(['grade', 'today (dmg, acc)', 'weapon damage', 'weapon to hit', 'armour value (and a plate\'s soak)', 'Evoker, Emanator, Visualizer, Attuner', 'Devotion (the faithful\'s grade; prayers have no roll)', 'also'], rows)

# ------------------------------------------------------------------------------------------------ T10 margins
def margins_of(roll, mod, defense):
    M = PROPOSAL['margins']
    if roll == 1: return None
    t = roll + mod
    if roll != 20 and t < defense: return None
    return max(0, (t - defense) // M['step']) + (M['crit'] if roll == 20 else 0)
def exp_margins(mod, defense, per):
    tot = 0
    for r in range(1, 21):
        m = margins_of(r, mod, defense)
        if m is not None: tot += 1 + per * m
    return tot / 20
def sec_margins():
    print('#### T10. Margins: one Margin a full %d over the Defense or TN, %d more on a natural 20; each adds (%s + %s x Perception) of the plain hit\n'
          % (PROPOSAL['margins']['step'], PROPOSAL['margins']['crit'], PROPOSAL['margins']['per'], PROPOSAL['margins']['per_perception']))
    print('How many of the 20 faces give each count of Margins (a natural 1 always misses):\n')
    rows = []
    for d, who in ((11, 'Soldier 11'), (14, 'Elite 14'), (15, 'Boss 15')):
        for mod in (0, 3, 6, 9, 12):
            c = collections.Counter()
            for r in range(1, 21):
                m = margins_of(r, mod, d); c['miss' if m is None else m] += 1
            rows.append([who, '%+d' % mod] + [str(c.get(k, 0)) for k in ('miss', 0, 1, 2, 3, 4, 5, 6, 7)])
    table(['Defense', 'to hit', 'miss', '0', '1', '2', '3', '4', '5', '6', '7'], rows)
    print('Expected worth of one attack, in plain hits (misses count 0; Perception 1, a Margin %s; in brackets Perception 10, %s):\n' % (margin_per(1), margin_per(10)))
    rows = []
    for mod in range(-2, 13):
        rows.append(['%+d' % mod] + ['%s (%s)' % (fmt(exp_margins(mod, d, margin_per(1)), 2), fmt(exp_margins(mod, d, margin_per(10)), 2)) for d in (8, 11, 14, 15)])
    table(['to hit', 'Defense 8 (vermin)', '11 (Soldier)', '14 (Elite)', '15 (Boss)'], rows)

# ------------------------------------------------------------------------------------------------ T11 the top of the scale
def squad_sum(): return sum(v for _, v in PROPOSAL['squad_sum'])
def sec_top():
    sig = L('sigils.json'); subj = sorted([i['damage'] * PROPOSAL['F'] for i in sig['items'] if i.get('group') == 'subject' and i.get('damage')], reverse=True)
    def line_base(n): return subj[0] + 0.5 * sum(subj[1:n])
    new, _ = new_weapon_damage(); cel = G('celestial'); D20 = deal(20); A = 10
    st = lambda p: stat(p, A, A)
    plain_rifle = new['long_rifle'] * st('gun') * D20 * cel
    snap = 3.0 * PROPOSAL['F'] * st('tend') * D20 * cel   # a Snap is damage: deal (section 2.2)
    plate20 = plate(20, 10, 10, 'celestial')
    M = PROPOSAL['margins']; per = margin_per(10)
    m_max = (20 + 9 + 3 + 4 - PROPOSAL['tier_defense']['vermin']) // M['step'] + M['crit']   # skill +9, grade +3, a foe 4 levels under, vermin
    m_sol = (20 + 9 + 3 - PROPOSAL['tier_defense']['soldier']) // M['step'] + M['crit']
    doors = [
        # name, source drafts, plain hit (what), plain, the cash-out unit, the cash-out factor at Reach 10 (C), with the Push (Cp), rolled?, solve, own sum floor
        ('Guard: Slam (per foe)', '02 1(b)-(d): Reach 6, Bite 140% at 9, Slam = plate x Bite x S(n), Overbrace +1',
         'a ram plate blow', new['ram_plate'] * st('melee') * D20 * cel, plate20, 1.4 * S(6), 1.4 * S(7), False, ('mult', S(6)), 0),
        ('Momentum: Coup', '02 2(b)-(d): Reach x7, Bite 35% at 9, 1 + Bite x S(n), Overswing +1',
         'an Ork wreck saw blow', new['ork_wreck_saw'] * st('melee') * D20 * cel, None, 1 + 0.35 * S(7), 1 + 0.35 * S(8), True, ('one', S(7)), 0),
        ('Pressure: Dead Centre', '02 3(b)-(d): Reach 5, Bite 30% at 9, 1 + Bite x S(n), Overpress +1',
         'a long rifle shot', plain_rifle, None, 1 + 0.30 * S(5), 1 + 0.30 * S(6), True, ('one', S(5)), 0),
        ('Shadow: the Break', '03 1(b)-(d): Reach 5, Bite 1.05 at 9, 1 + Bite x S(n) (the fresh ambush +0.5 goes to the sum, A8), Last Shade +1',
         'a long rifle shot (the Break reads Perception and Ingenuity)', plain_rifle, None, 1 + 1.05 * S(5), 1 + 1.05 * S(6), True, ('one', S(5)), 0.5),
        ('Sigils: one Subject', '03 2(b)-(d): Reach 5, Bite 1.05 at 9, Line = Bite x S(n), Overclock +1; the Line\'s base is STONE',
         'a Line of 2 of STONE', subj[0] * st('sigil') * D20 * cel * 1.05 * S(2), subj[0] * st('sigil') * D20 * cel, 1.05 * S(5), 1.05 * S(6), True, ('mult', S(5)), 0),
        ('Sigils: every glyph a Subject', 'the same; the Line\'s base: the strongest Subject in full, every other half (rules.json output.systems.sigil_damage)',
         'a Line of 2 of STONE and FIRE', line_base(2) * st('sigil') * D20 * cel * 1.05 * S(2), line_base(5) * st('sigil') * D20 * cel, 1.05 * S(5), 1.05 * S(6) * line_base(6) / line_base(5), True, ('mult', S(5)), 0),
        ('Figments: Curtain', '03 3(b)-(d): Reach 4, Bite 0.9 at 9, Bite x S(n) Figment blows, Overhold +1',
         'a beast\'s claws', new['figment_claws'] * st('figment') * D20 * cel, None, 0.9 * S(4), 0.9 * S(5), True, ('mult', S(4)), 0),
        ('Bonds: Snap All (total)', '04 1(b)-(d): Reach 4, Bite x1.4 at 9, Bite x S(n) lone Snaps shared, Overbind +1',
         'a lone Snap', snap, None, 1.4 * S(4), 1.4 * S(5), False, ('mult', S(4)), 0),
        ('Bonds: Snap All (per foe)', 'the same, each Bond its share: Bite x S(n) / n',
         'a lone Snap', snap, None, 1.4 * S(4) / 4, 1.4 * S(5) / 5, False, ('mult', S(4) / 4), 0),
        ('Outbursts: the Release', '04 2(b)-(d): Reach 5, Bite 0.35 at 9, 0.8 + Bite x S(n); with four strong feelings about x6 (04 2(c)); Overdraw +1',
         'the Damage school at x1.0', 22.2 * st('soul') * D20 * cel, None, 0.8 + 0.35 * S(5), 6.0 + 0.35 * 1.2 ** 5, True, ('soul', S(5)), 0),
        ('Prayer: a Hymn', '04 3(b)-(d): Reach 5 Grace, Bite 25% at 9, 1 + Bite x S(n); the Push is a tier above (the Miracle, 90, x1)',
         'Judgement (no Grace), Devotion 10', 56 * PROPOSAL['F'] * st('blessing') * D20 * cel, None, 1 + 0.25 * S(5), max(1 + 0.25 * S(5), 150 / 56), False, ('one', S(5)), 0),
    ]
    print('#### T11. The top of the scale: a level-20 specialist of each door (door attribute and alpha 10, Perception 10 where it rolls: two attributes at 10 are legal by B11), Celestial\n')
    print('Margins at most: a natural 20 at +16 to hit (skill +9, Celestial +3, a foe four levels under +4) against a vermin\'s Defense 8: %d Margins at %s each = +%s plain hits. Against a same-level Soldier: %d (+%s). '
          'The squad\'s set-up is 07 section 5.4\'s list, added (A8): +%d%%.\n' % (m_max, per, fmt(m_max * per, 2), m_sol, fmt(m_sol * per, 2), rnd(100 * squad_sum())))
    rows = []; budgets = []
    for name, src, what, plain, unit, C, Cp, rolled, solve, floor in doors:
        u = unit if unit is not None else plain
        cash = u * C
        Mx = m_max * per if rolled else 0
        mbase = (u if name.startswith('Sigils') else plain)
        big0 = u * Cp + Mx * mbase
        big = big0 * (1 + squad_sum())
        budget = 99999 / big0 - 1
        budgets.append((name, budget, floor))
        kind, Sn = solve
        if cash >= 10000: need = 'holds'
        elif kind == 'mult': need = 'Bite %s' % fmt(10000 / (u * Sn), 2)
        elif kind == 'one': need = 'Bite %s' % fmt((10000 / u - 1) / Sn, 2)
        else: need = 'Bite %s' % fmt((10000 / u - 0.8) / Sn, 2)
        flag = []
        if digits(plain) != 4: flag.append('plain %d digits' % digits(plain))
        if digits(cash) < 5: flag.append('cash-out 4 digits')
        if big0 >= 100000: flag.append('six digits with no sum')
        elif budget < floor: flag.append('six digits with the door\'s own sum')
        rows.append([name, what, fmt(plain), fmt(cash), fmt(cash / G('celestial') * G('relic')), need, fmt(big0), fmt(big), '+%d%%' % rnd(100 * budget) if budget > -1 else 'none', '; '.join(flag) or '-'])
    table(['door', 'plain hit', 'plain', 'full cash-out (Reach 10)', 'the same in Relic', 'Bite at 9 for five digits', 'largest hit, no sum (Push, most Margins)', 'with the squad\'s +%d%%' % rnd(100 * squad_sum()),
           'sum it may carry under 100,000', 'flags'], rows)
    print('Sources used (each door drafter\'s current numbers):\n')
    table(['door', 'Reach and Bite read from'], [[d[0], d[1]] for d in doors])
    b = [x for x in budgets if x[1] >= x[2]]
    low = min(b, key=lambda x: x[1]) if b else None
    if low: print('The tightest door that can carry a sum at all: %s, +%d%%. 07 section 5.4\'s +%d%% must come down to that on its own doors\' blows (section 10.3).\n' % (low[0], rnd(100 * low[1]), rnd(100 * squad_sum())))

# ------------------------------------------------------------------------------------------------ T12 the check
BUILDS = [
    # name, action, door kind, (End, PT, armour class) at L1 and L20, AP of the plain action
    ('Two-handed Strength specialist (maul, Momentum)', 'maul', 'spec', (3, 2, 2), (5, 6, 3), 3),
    ('Rifle Dexterity specialist (service rifle, Pressure)', 'hellraiser_service_rifle', 'spec', (2, 1, 1), (4, 4, 1), 2),
    ('Pistol and knife, mixed (Agility and Dexterity 5 at L1 to 8 at L20)', 'service_pistol', 'mixed', (2, 1, 1), (3, 3, 1), 2),
    ('Sigilist (FIRE in a Line of two)', 'fire', 'spec', (1, 0, 1), (3, 2, 1), 3),
    ('Channeler (the Damage school at x1.0)', 'outburst', 'spec', (2, 1, 1), (4, 3, 1), 4),
    ('Chaplain (three pistol shots at Agility 2, Dexterity 2, and a Smite)', 'smite', 'spec', (4, 2, 2), (6, 5, 3), 2),
]
ARM = {a['class']: a['value'] for a in RULES['combat']['armor']['classes']}
ARM_NAME = {a['class']: a['name'] for a in RULES['combat']['armor']['classes']}
def lerp(a, b, l): return a + (b - a) * (l - 1) / 19
def enemy(tier, l):
    t = TIERS[tier]; F = PROPOSAL['F']
    return (t['hp'] * F * ehp(l), t['armour'] * F * deal(l), rnd(30 * F) * t['damage'] * PROPOSAL['tier_damage_x'] * edmg(l), PROPOSAL['tier_defense'][tier], t['attack_bonus'])
def brain_bite(bp): return 1.05 if bp >= 9 else 0.95 if bp >= 6 else 0.85
def plain_hit(act, l, a, s, gx):
    F = PROPOSAL['F']
    if act == 'fire': return 30 * F * stat('sigil', a, s) * brain_bite(s) * S(2) * deal(l) * gx
    if act == 'outburst': return 37 * F * stat('soul', a, s) * deal(l) * gx
    if act == 'smite': return 20 * F * stat('blessing', a, s) * deal(l) * gx
    w = WEAP_BY[act]; return rnd(w['damage'] * F) * wstat(w, a, s) * deal(l) * gx
def check_rows():
    rows = []
    for name, act, kind, lo, hi, ap in BUILDS:
        for l in (1, 5, 10, 15, 20):
            a = s = spec_main(l)
            if kind == 'mixed': a = s = rnd(lerp(5, 8, l))
            e, pt, ac = (rnd(lerp(lo[i], hi[i], l)) for i in range(3))
            g = stated_grade(l); gx, acc = G(g), ACC(g); sm = 1 + ord_sum(l)
            hit = plain_hit(act, l, a, s, gx) * sm
            if act == 'smite':
                pistol = rnd(20 * PROPOSAL['F']) * stat('gun', 2, 2) * deal(l) * gx * sm
                parts = [(pistol, 1 + acc, True)] * 3 + [(hit, 0, False)]; shown = hit
            else:
                parts = [(hit, s - 1 + acc, True)] * (6 // ap); shown = hit
            hp = hp_of(l, e, pt); myarm = ARM.get(ac, 0) * PROPOSAL['F'] * deal(l) * gx
            cells, surv, flags = [], [], []
            for tier in ('soldier', 'elite', 'boss'):
                ehp_, earm, edmg_, edef, eatk = enemy(tier, l)
                one = max(1, shown - (0 if act == 'smite' else earm))
                hits = ehp_ / one
                exp_turn = 0
                for x, m, rolled in parts:
                    if not rolled: exp_turn += x; continue
                    for r in range(1, 21):
                        mg = margins_of(r, m, edef)
                        if mg is not None: exp_turn += max(1, x * (1 + margin_per(1) * mg) - earm) / 20
                turns = ehp_ / max(1, exp_turn)
                mark = '*' if hits < 2 else ''
                cells.append('%s%s (%s)' % (fmt(hits, 1), mark, fmt(turns, 1)))
                sv = hp / max(1, edmg_ - myarm)
                surv.append(fmt(sv, 1) + ('*' if sv < 2 else ''))
            rows.append([name if l == 1 else '', l, '%d/%d' % (a, s), g, '+%d%%' % rnd(100 * ord_sum(l)), ARM_NAME.get(ac, ac), fmt(shown), fmt(hp)] + cells + surv)
    return rows
def sec_check():
    print('#### T12. The enemy columns read back: six builds against a same-level Soldier, Elite and Boss\n')
    print('Each build is the stated attacker of its kind: gear one grade under the map\'s best, the ordinary sheet sum of its level. Kill: plain hits to drop one foe after armour (no Margins), and in brackets turns of 6 AP counting misses and Margins (Perception 1). '
          'Survive: that foe\'s rifle hits taken before 0 HP, after the build\'s armour. A star marks a count under two: a fight shorter than two exchanges.\n')
    table(['build', 'L', 'attr/skill', 'grade', 'sheet sum', 'armour', 'plain hit', 'HP', 'hits to drop: Soldier (turns)', 'Elite', 'Boss', 'hits survived: Soldier', 'Elite', 'Boss'], check_rows())
    rows = []
    for tier in TIERS:
        r = [tier, PROPOSAL['tier_defense'][tier], '+%d' % TIERS[tier]['attack_bonus']]
        for l in (1, 5, 10, 15, 20):
            h, a, d, _, _ = enemy(tier, l); r.append('%s HP, %s armour, %s a rifle hit' % (fmt(h), fmt(a), fmt(d)))
        rows.append(r)
    print('The tiers on the new columns (HP x%s x hp_mult; armour x%s x deal; a service rifle of 18 x the tier\'s damage x%s x damage_mult):\n' % (PROPOSAL['F'], PROPOSAL['F'], PROPOSAL['tier_damage_x']))
    table(['tier', 'Defense', 'to hit', 'L1', 'L5', 'L10', 'L15', 'L20'], rows)

# ------------------------------------------------------------------------------------------------ T13 caps
def sec_caps():
    sv = L('survival.json')
    print('#### T13. The engine\'s caps that limit a number, as data and code hold them today\n')
    table(['cap', 'today'], [
        ['VS_CAP (target bonuses)', '+100% (output.ts:129)'], ['CRIT_MAX', '2.0 (character.ts:853)'],
        ['SIGIL_CAP / SIGIL_CAP_CRIT', '350 / 500 (sigil.ts:329, dead)'], ['mending.cap_pct', RULES['mending'].get('cap_pct')],
        ['boon_cap.cap', sv['boon_cap']['cap']], ['start_boon.max_worth', sv['start_boon']['max_worth']], ['shrine.token_max_worth', sv['shrine']['token_max_worth']],
        ['variants worth_cap', L('variants.json')['worth_cap']], ['rewards.ceiling', sv['rewards']['ceiling']], ['stage.elite_up', sv['stage']['elite_up']],
        ['loadout.budget', sv['loadout']['budget']], ['combat.elemental_taken_cap', RULES['combat']['elemental_taken_cap']],
    ])

LAUNCHER_F.update(_launchers())
SECTIONS = collections.OrderedDict([('today', sec_today), ('factor', sec_factor), ('weapons', sec_weapons), ('digits', sec_digits), ('columns', sec_columns),
            ('cards', sec_cards), ('hp', sec_hp), ('costs', sec_costs), ('plate', sec_plate), ('grades', sec_grades), ('margins', sec_margins),
            ('top', sec_top), ('check', sec_check), ('caps', sec_caps)])
if __name__ == '__main__':
    for s in (sys.argv[1:] or list(SECTIONS)): SECTIONS[s]()
