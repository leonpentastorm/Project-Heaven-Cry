#!/usr/bin/env python3
"""The physical techniques and what each plays on screen (docs/design/handoffs/technique-fx.md).

Generated from data and code, never typed:
  * every technique in data/techniques.json (melee and ranged, every weapon family: a weapon teaches through
    weapons.json `phys.teaches`, and its `grants` name is shown beside the technique it teaches);
  * every base-class move (data/classes.json, refs resolved) whose engine handler makes a physical attack
    (packages/engine/src/classes/*.ts: its register block calls resolveAttack, opportunityStrike or shoves);
  * what it played BEFORE the technique table: a beat of its own (a melee_fx beat in its engine block other than the
    shared Prone `fall`, or its id handled by fx/ranged.ts) is UNIQUE; a plain swing or shot that is right for it (Cut,
    Shot, or a ranged technique that fires plain rounds) is SHARED; anything else (only the token's lunge and the name)
    is GENERIC;
  * what it plays NOW: its row in apps/web/src/game/fx/techniqueFx.ts (TECH_FX) and the parts that row composes.

Usage: python3 tools/technique_fx_inventory.py [--write]   (prints the markdown; --write saves it to the doc)
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOC = ROOT / 'docs/design/handoffs/technique-fx.md'
ENGINE = ROOT / 'packages/engine/src'
FX = ROOT / 'apps/web/src/game/fx'


def blocks(text, opener):
    """{id: block text} for every `opener` block whose next line is `  id: '<id>'`."""
    out = {}
    starts = [m.start() for m in re.finditer(re.escape(opener), text)]
    for i, s in enumerate(starts):
        end = starts[i + 1] if i + 1 < len(starts) else len(text)
        m = re.search(r"id: '([a-z_.]+)'", text[s:s + 200])
        if m:
            out[m.group(1)] = text[s:end]
    return out


def engine_blocks(folder, opener):
    out = {}
    for f in sorted((ENGINE / folder).glob('*.ts')):
        out.update(blocks(f.read_text(), opener))
    return out


def tech_rows():
    """TECH_FX's rows: {key: (signature, parts text)}."""
    f = FX / 'techniqueFx.ts'
    if not f.exists():
        return {}
    text = f.read_text()
    m = re.search(r'export const TECH_FX[^=]*=\s*\{(.*?)\n\};', text, re.S)
    if not m:
        return {}
    rows = {}
    for line in m.group(1).splitlines():
        lm = re.match(r"\s*'?([a-z_.:]+)'?\s*:\s*((?:row|use)\(.*\)|\{ attack:.*\}),?\s*(//.*)?$", line)
        if lm:
            rows[lm.group(1)] = lm.group(2)
    return rows


def parts_of(row):
    return sorted(set(re.findall(r"p\('([a-zA-Z]+)'", row)) | set(re.findall(r"\b([a-zA-Z]+)\(", '')))


def main():
    techs = json.loads((ROOT / 'data/techniques.json').read_text())['items']
    weapons = json.loads((ROOT / 'data/weapons.json').read_text())['items']
    classes = json.loads((ROOT / 'data/classes.json').read_text())
    melee_src = engine_blocks('physical/melee', 'technique({')
    ranged_src = engine_blocks('physical/ranged', 'technique({')
    class_src = engine_blocks('classes', 'register({')
    ranged_fx = (FX / 'ranged.ts').read_text()
    rows = tech_rows()

    teaches = {}
    for w in weapons:
        t = (w.get('phys') or {}).get('teaches')
        if t:
            teaches.setdefault(t, []).append(w['id'] + ((' ("' + w['grants']['name'] + '")') if w.get('grants') else ''))

    entries = []
    for t in techs:
        tid, sysm = t['id'], t['system']
        src = (melee_src if sysm == 'melee' else ranged_src).get(tid, '')
        beats = sorted(set(re.findall(r"meleeFx\(t, '([a-z]+)'", src)) - {'fall'})
        own = beats or (sysm == 'ranged' and re.search(r"'" + tid + r"'", ranged_fx))
        strikes = 'strike(' in src or 'volley(' in src or 'looseRound(' in src
        if tid in ('cut', 'shot'):
            before, today = 'SHARED', ('plain swing (slash sprite)' if sysm == 'melee' else 'plain shot (tracer)')
        elif own:
            before = 'UNIQUE'
            today = ('melee_fx ' + ', '.join(beats)) if beats else 'fx/ranged.ts case'
        elif tid in ('cut', 'shot') or (sysm == 'ranged' and strikes):
            before, today = 'SHARED', ('plain swing (slash sprite)' if sysm == 'melee' else 'plain shot (tracer)')
        else:
            before = 'GENERIC'
            today = 'lunge + name' if strikes else 'name only'
        if 'fallFx' in src and 'fall' not in today:
            today += ' (+ Prone fall)'
        entries.append(dict(key=tid, name=t['name'], kind=sysm, group=t['group'], today=today, before=before,
                            weapons=', '.join(teaches.get(tid, []))))

    # base-class moves that are physical attacks
    pool = {m.get('origin', '') + '.' + m['id']: m for m in classes['move_pool']['moves']}
    names = {}

    def walk(x):
        if isinstance(x, dict):
            if isinstance(x.get('id'), str) and isinstance(x.get('name'), str) and 'text' in x:
                names.setdefault(x['id'], x)
            for v in x.values():
                walk(v)
        elif isinstance(x, list):
            for v in x:
                walk(v)
    walk(classes)
    for cl in classes['base']:
        for rank in cl['ranks'].values():
            for m in rank['moves']:
                key = m.get('ref') or (m.get('origin', cl['id']) + '.' + m['id'])
                mv = pool.get(key) or names.get(key.split('.')[-1]) or m
                src = class_src.get(key, '')
                if not re.search(r"resolveAttack\(|opportunityStrike\(|emitFx\(cb, 'shove'", src) or 'interpose: true' in src:
                    continue
                shove = "'shove'" in src and 'resolveAttack(' not in src
                entries.append(dict(key='move:' + key, name=mv.get('name', key), kind='class (' + cl['name'] + ')', group='move',
                                    today='shove slide' if shove else 'plain ' + ('swing' if 'melee' in src else 'attack'),
                                    before='SHARED' if shove else 'GENERIC', weapons=''))

    sigs = Counter(rows.values())
    for e in entries:
        r = rows.get(e['key'])
        if not r:
            e['now'], e['parts'] = 'GENERIC', ''
        else:
            e['now'] = 'UNIQUE' if sigs[r] == 1 else 'SHARED'
            e['parts'] = ' · '.join(sorted(set(re.findall(r"p\('([a-zA-Z]+)'", r))))

    cb, cn = Counter(e['before'] for e in entries), Counter(e['now'] for e in entries)
    out = ['# Technique effects: the inventory', '',
           'Generated by `python3 tools/technique_fx_inventory.py --write` from `data/techniques.json`, `data/classes.json`,',
           '`data/weapons.json`, the engine\'s technique and class blocks and the effects code; do not edit by hand.',
           '', 'BEFORE is what each played before the technique table (fx/techniqueFx.ts): UNIQUE (an animation of its own),',
           'SHARED (a family animation that is right for it), GENERIC (only the token lunge or shake and its name). NOW is its',
           'row in `TECH_FX` (UNIQUE when no other row is the same). A row has the technique\'s own attack parts, if it has',
           'any, and two results (hit, crit); a miss draws nothing but the word MISS. The parts are in `fx/techniqueParts.ts`.', '',
           '## What Leon took out on live 0.25.0 (13 Nov 2026), and what came in', '',
           '"Please disable the yellow lines effect when shooting, the half circle effect when meleeing, the miss shot effect and',
           'the melee miss effect: they look SO BAD. Just keep the slash effect on hit, and change the effect for shots to a',
           'bullet hole." And: "Rake and Mag Dump on a shotgun also use the shoot effect even though it says right on the card:',
           'double barrel."', '',
           '- **Removed parts** (deleted, with every row that named them): `tracer` (the round\'s line in the ink from the',
           '  muzzle, one a round, the yellow lines), `slash` (the half circle swept across the target\'s front on every cut),',
           '  `whiff` and `deflect` (the melee misses: the stroke passing wide, the bounce tick), `wide` (the shot\'s miss: the',
           '  tick past the target and its dust). The `miss` column is gone from the table: a miss draws no result.',
           '- **Removed outside the parts:** the bright arc sprite swept in front of every swinging attacker (fx/play.ts melee),',
           '  the dust kicked up where a missed shot went.',
           '- **Wrongly removed on 13 Nov, restored on 14 Nov: the bullet in flight.** Leon on the live build: "FUCK i told you',
           '  to remove the yellow line not the bullet effect", and "the yellow line was added in a later effect update, the gun',
           '  always got bullets shot VFX, we even spent many token making sure the shot sycn perfectly". Two things were drawn',
           '  for a round, added at different times: the bullet\'s flight (fx/play.ts `projectile`: a short pale streak that',
           '  travels from the muzzle to where the round lands, since the first effects work, then synced round by round with',
           '  the sound, the casings and the numbers) and the yellow line (the `tracer` part, added with the technique table on',
           '  12 Nov, a stroke drawn from the muzzle to the target and held). The cleanup took both; the flight is back exactly',
           '  as it was (its look, colour, speed and timing, from history: `git show 1f918427^:apps/web/src/game/fx/play.ts`),',
           '  for every round fired, hit or miss: a bullet\'s streak, a shotgun shell\'s five pellets, an arrow\'s shaft, a',
           '  bolt, a rocket, a lobbed grenade. A miss still flies past the target and leaves nothing where it lands. A shell',
           '  fired without its own roll (a double barrel\'s second, a shotgun\'s Suppress, Rake or full-auto rounds) now flies',
           '  as its five pellets too (it was one streak). The `tracer` part stays deleted. The flight box carries',
           '  `data-fx-flight` and traces `flight`; every part traces `part` with its tag, so the suites can tell a round in',
           '  the air from a removed piece (rounds.test.ts, ranged.test.ts, brass, fx-room, fx-sweep).',
           '- **Kept, redrawn not to be a line from the shooter:** `aim` (was a line of aim from the shooter: now the sight, a',
           '  thin ring with four ticks closing on the target), `heavy` (was a thick line from the muzzle through the target:',
           '  now the round driven out of the target\'s far side, played with the hit), `cone` (was two lines from the shooter',
           '  and a fill: now the cone\'s far band over the target), Flush Arc\'s drop (fx/ranged.ts: the last tile and a half',
           '  only, white). Kept as they were: the white aim line of Aimed Shot, Crossfire\'s two lines and Storm\'s red charge',
           '  line (fx/ranged.ts technique beats, not the yellow tracer style), Sweep\'s own wide arc (`sweep`) and every',
           '  other part.',
           '- **New: the weapon\'s mark** (`round`, playing `hole`, `pellets` or `shaft`): a shot that hits leaves it on the',
           '  target (or on the object, or on the cover that stopped it), on the lower half of the token, clear of the damage',
           '  number, as its round lands, and it fades in about a second at Normal speed. `hole`: a small dark puncture with a',
           '  ragged pale edge and short cracks. `pellets`: a shotgun shell\'s tight cluster of small holes. `shaft`: an arrow\'s',
           '  or a bolt\'s shaft stuck in, fletched. Which one is the weapon\'s family, read from its `ammo` in',
           '  data/weapons.json (fx/techniqueFx.ts `shotMarkOf`, `AMMO_MARK`): a shell the pellets, an arrow or a bolt the',
           '  shaft, a grenade, a rocket or fuel nothing (their landing is a blast or a flame), any other cartridge and a core',
           '  rifle\'s charge the hole. A shotgun also fires a wide muzzle blast (fx/play.ts muzzle).',
           '- **The counting rule:** bullet holes drawn = rounds that hit; casings = rounds spent (it was "shots on screen',
           '  match rounds spent"). A roll that hit marks once, and once more for each round it carries beyond itself (a',
           '  Burst\'s third, a double barrel\'s second shell: two blasts one-two, two clusters); a spray\'s rounds (full auto,',
           '  a Mag Dump stream, Suppress\'s two before its roll) mark nothing. Proved by fx/rounds.test.ts (every gun ×',
           '  every shooting technique, through the engine) and fx/techniqueFx.test.ts (every gun family × every shooting',
           '  technique it can use leaves its family\'s mark).', '',
           '| | UNIQUE | SHARED | GENERIC | total |', '| --- | --- | --- | --- | --- |',
           '| before | %d | %d | %d | %d |' % (cb['UNIQUE'], cb['SHARED'], cb['GENERIC'], len(entries)),
           '| now | %d | %d | %d | %d |' % (cn['UNIQUE'], cn['SHARED'], cn['GENERIC'], len(entries)), '',
           '| technique | kind | group | before | played before | now | parts now | taught by |',
           '| --- | --- | --- | --- | --- | --- | --- | --- |']
    for e in entries:
        out.append('| %s (`%s`) | %s | %s | %s | %s | %s | %s | %s |' % (e['name'], e['key'], e['kind'], e['group'], e['before'], e['today'], e['now'], e['parts'], e['weapons']))
    text = '\n'.join(out) + '\n'
    if '--write' in sys.argv:
        DOC.write_text(text)
        print('wrote', DOC.relative_to(ROOT), dict(before=dict(cb), now=dict(cn)))
    else:
        print(text)


if __name__ == '__main__':
    main()
