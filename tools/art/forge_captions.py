#!/usr/bin/env python3
"""Write Forge training captions for one PHC art mode, from text the project already has.

    python3 tools/art/forge_captions.py --mode gear|wick|glyph|portraits|patrons|skills --out DIR
        [--trigger WORD] [--images-out DIR] [--gear-src DIR] [--holdout id,id] [--list-ids]

One <id>.txt per image: "<trigger>, <object description>". Descriptions come from the prompt files in
art/briefs/ (by file name), the Wick production brief (by data id), the archetype table, the M813 brief rows
(catalog `brief_row`) and m813-mpat.md for the M813 cast, the patron manifest's one-line looks, the catalog label,
and data/skills.json; style words are stripped (the trigger word is what learns the style). Ids with no
description found are listed under "missing" and are written NOWHERE: caption those by eye.

--images-out DIR also copies each master into DIR as <id>.png (so the ingest folder and the captions share
ids). --gear-src DIR: the gear masters are not in the repo until delivered; point at the folder they were
delivered to (files named <kind>-<id>.png) and only those stems are written. --holdout keeps listed ids out
of both outputs (the test set to compare against). Standard library only. Never writes under the repo's
art/ tree and never modifies a repo file. Prints one JSON summary.
"""
import argparse, json, re, shutil, sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
ART = REPO / 'art'
BRIEFS = ART / 'briefs'
TRIGGERS = {'gear': 'phcgear', 'wick': 'phcwick', 'glyph': 'phcglyph', 'portraits': 'phcportrait', 'patrons': 'phcpatron', 'skills': 'phcskill'}
# What the caption says about the ground: it must match how the masters are flattened for training (see the brief).
BACKGROUNDS = {'gear': 'three-quarter view, single object, plain flat grey background',
               'wick': 'plain flat dark blue background', 'glyph': 'plain flat dark blue background',
               'portraits': '', 'patrons': '', 'skills': 'plain black background'}
EXCLUDED_STATUS = {'rejected', 'superseded', 'retired', 'archived'}

# Style, brand and artist words: never in a caption (the trigger word learns the style).
STYLE_PATTERNS = [
    r'\bHeavenprint\b', r'\bpainted\b', r'\bhand-painted\b', r'\bgouache\b', r'\bopaque\b', r'\bbrush\w*', r'\bdry-brush\b',
    r'\bflat[- ]ink\b', r'\bwhite[- ]ink\b', r'\bpure white\b', r'\bink\b', r'\bmonoline\b', r'\bline[- ]art\b', r'\bstyle\b',
    r'\bstyles\b', r'\bhatching\b', r'\bscumbl\w*', r'\bcharcoal shadows?\b', r'\bivory accents?\b', r'\bSTYLE-LOCK\b',
    r'\bPNG\b', r'\balpha\b', r'\btransparen\w*', r'\b1024\b', r'\bpixels?\b', r'\bpx\b', r'\bartist\b', r'\bGPT\b',
    r'\bmascot icon\b', r'\bicon\b',
]
STYLE_RE = re.compile('|'.join(STYLE_PATTERNS), re.I)


def clean(text):
    t = re.sub(r'`|\*\*|\*', '', text)
    t = re.sub(r"\bWick's\b", "the mascot's", t)
    t = re.sub(r'\bWick\b', 'the robot mascot', t)
    t = re.sub(r'\(Suggested[^)]*\)', '', t)
    t = re.sub(r'\bAt 32 px:.*$', '', t)
    t = re.sub(r';?\s*accent: none\.?', '', t)
    t = re.sub(r'\bNo (text|letters|numbers)[^.]*\.', '', t, flags=re.I)
    t = STYLE_RE.sub('', t)
    t = re.sub(r'\s+', ' ', t)
    t = re.sub(r'\s+([,.;:])', r'\1', t)
    t = re.sub(r'([,;:])\s*([,.;:])', r'\2', t)
    return t.strip(' ,;:-')


# Names of M813 cast members that appear inside other people's brief rows: a caption never carries a name.
NAME_SCRUB = re.compile(r'\b(Keel|Novikov|Ilse|Varga|MPAT|Nine-Nine|Seven-Seven|Soft-Hands|Penny|Rook|Hum|Lantern)(\'s)?\b')


def read(p):
    return Path(p).read_text(encoding='utf-8') if Path(p).exists() else ''


# ---- prompt-file indexes: stem -> raw text --------------------------------------------------------------
def gear_index():
    """gear prompts: '**N. `weapon-x.png`** | Name | faction' then a '> **Subject:** ... **Silhouette feature:** ...' line."""
    out, name_of = {}, {}
    lines = read(BRIEFS / 'GPT-PROMPTS-2026-11-13-gear.md').splitlines()
    for i, ln in enumerate(lines):
        m = re.match(r'\*\*\d+\. `([^`]+?)(?:\.png)?`\*\* \| ([^|]+)', ln)
        if not m or i + 1 >= len(lines) or not lines[i + 1].startswith('>'):
            continue
        stem, name = m.group(1), m.group(2).strip()
        body = lines[i + 1][1:].strip()
        sil = re.search(r'\*\*Silhouette feature:\*\*\s*(.*?)(?=\*\*Materials|\*\*At 32|$)', body)
        mat = re.search(r'\*\*Materials and accent:\*\*\s*(.*?)(?=\*\*At 32|$)', body)
        subj = re.search(r'\*\*Subject:\*\*\s*(.*?)(?=\*\*Silhouette|$)', body)
        parts = []
        if not name.startswith(stem.split('-')[0] + '-'):  # a real name, not just the id repeated
            parts.append(name)
        elif subj:                                          # id-only name: the subject's text names the object
            parts.append(re.sub(r'^[^:]{0,40}:\s*', '', subj.group(1)))
        if sil:
            parts.append(sil.group(1))
        if mat:
            parts.append(mat.group(1))
        parts = [p.strip().rstrip('.') for p in parts]
        out[stem] = ', '.join(p for p in parts if p)
        name_of[stem] = name
    return out


def wick_prompt_index():
    """classes-3.0 file ('**N. `art/icons/x/y.png`** | Name' + '> **Add to the block:** text') and the 12 Nov tables."""
    out = {}
    lines = read(BRIEFS / 'GPT-PROMPTS-2026-11-13-classes-3.0.md').splitlines()
    for i, ln in enumerate(lines):
        m = re.match(r'\*\*\d+\. `([^`]+)`\*\* \| (.*)', ln)
        if m and i + 1 < len(lines) and lines[i + 1].startswith('>'):
            add = re.sub(r'^\>\s*\*\*Add to the block:\*\*\s*', '', lines[i + 1])
            out[Path(m.group(1)).stem] = add
    text = read(BRIEFS / 'GPT-PROMPTS-2026-11-12.md')
    for m in re.finditer(r'^\| `([^`]+\.png)` \| (.*?) \|\s*$', text, re.M):          # perks/calls/prayers: path | text
        out.setdefault(Path(m.group(1)).stem, re.sub(r'^\*\*[^*]+\*\*\s*', '', m.group(2)))
    for m in re.finditer(r'^\| `(feeling-[\w-]+\.png)` \| \*\*[^*]+\*\*\s*(.*?) \|\s*$', text, re.M):
        out.setdefault(Path(m.group(1)).stem, m.group(2))
    for m in re.finditer(r'^\| `(module-[\w]+\.png)`(?: / `(module-[\w]+\.png)`)? \| (.*?) \|\s*$', text, re.M):
        for g in (m.group(1), m.group(2)):
            if g:
                out.setdefault(Path(g).stem, m.group(3))
    return out


def production_index():
    """wick-production-icons.md rows '| ... (`data_id`) | ... | action | screen | prop |': data id -> the action cell."""
    out = {}
    for ln in read(BRIEFS / 'wick-production-icons.md').splitlines():
        m = re.search(r'\(`([a-z0-9_]+)`[;)]', ln)
        if not m or not ln.startswith('|'):
            continue
        cells = [c.strip() for c in ln.strip().strip('|').split(' | ')]
        action = max(cells, key=len)
        if action.startswith('Wick') or ' Wick ' in action or action.startswith('Seen from'):
            out[m.group(1)] = action
    return out


def archetype_index():
    """archetype-portraits.md table '| `id` | Suggested | Beat | Tags |'."""
    out = {}
    for ln in read(BRIEFS / 'archetype-portraits.md').splitlines():
        m = re.match(r'\| `([a-z0-9_]+)` \| (.*?) \| (.*?) \| (.*?) \|\s*$', ln)
        if m:
            out[m.group(1)] = f'{m.group(2)}. {m.group(3)}'
    return out


def m813_row_caption(brief_row):
    """'| B1 | `id` | **Name**, who | action and emotion |' -> who (name dropped) + the first sentence of the action
    (the pose; the rest is mood and lore, not something seen)."""
    cells = [c.strip() for c in brief_row.strip().strip('|').split(' | ')]
    if len(cells) < 4:
        return None
    role = re.match(r'\*\*((?:Engineer|Station|Guard|Scavenger|Enemy)[^*]*)\*\*', cells[2])  # a role, not a name: keep it
    who = re.sub(r'^\*\*[^*]+\*\*\s*[,:]?\s*', '', cells[2])
    who = re.sub(r'\(\*?proposal\*?:?\s*[^)]*\)', '', who)
    who = re.sub(r'^(generic token|a second face)\s*[:,]?\s*', '', who.replace('generic token, a second face', 'a second face').replace('generic token:', ''))
    action = re.split(r'(?<=[.!?])\s|;', cells[3])[0].strip().rstrip('.')   # first sentence or clause: the pose
    who = who.strip(' .:,')
    if role:
        who = f'{role.group(1).lower()}, {who}'.rstrip(' ,')
    text = f'{who}, {action[:1].lower()}{action[1:]}'
    return NAME_SCRUB.sub('someone', text)


def mpat_index():
    """art/briefs/m813-mpat.md sections 1 and 2: the two portraits of MPAT and the robot head."""
    t = read(BRIEFS / 'm813-mpat.md')
    def field(name, block):
        m = re.search(r'\*\*' + name + r'[^*]*\*\*\s*(.*)', block)
        return re.sub(r'\([^)]*\)', '', m.group(1)).strip() if m else ''
    sec1 = t.split('## 1.')[-1].split('## 2.')[0]
    sec2 = t.split('## 2.')[-1].split('## 3.')[0]
    out = {}
    cons, act, setting = field('Construction', sec1), field('Action', sec1), field('Setting', sec1)
    out['mpat'] = ' '.join(x for x in (f'a robot combat medic: {cons}', f'Pose: {act}', f'Setting: {setting}') if x)
    out['mpat'] = NAME_SCRUB.sub('the robot', out['mpat'])
    subj = re.sub(r'\s*Its name was never recorded.*$', '', field('Subject', sec2)).strip().rstrip('.')
    out['mpat-comrade'] = f'{subj}, {field("Action", sec2)}'
    return out


def patron_index():
    """One-line looks of the eight patron portraits, from the archived delivery manifest (read only)."""
    m = json.loads(read(ART / '_archive/character-portraits/patrons/v1/manifest.json') or '{"portraits":[]}')
    return {p['id']: p.get('description', '') for p in m['portraits']}


# ---- catalog ----------------------------------------------------------------------------------------------
def usable(entry):
    p = entry.get('path', '')
    return not (p.startswith('art/_archive') or '/spoilers/' in p or entry.get('status') in EXCLUDED_STATUS)


def catalog():
    return json.loads((ART / 'catalog.json').read_text(encoding='utf-8'))


def items_for(mode, cat, gear_src):
    """-> list of (id, image_path or None, raw description or None, stem)."""
    rows = []
    if mode == 'gear':
        idx = gear_index()
        if gear_src:
            have = {p.stem: p for p in Path(gear_src).glob('*.png')}
            ids = sorted(set(have) | set())
        else:
            have, ids = {}, sorted(idx)
        for s in ids:
            rows.append((s, have.get(s), idx.get(s), s))
    elif mode == 'wick':
        wp, prod = wick_prompt_index(), production_index()
        for fam, prefix in (('traits', 'trait'), ('perks', 'perk'), ('calls', 'call')):
            for key, e in cat[fam].items():
                if not usable(e):
                    continue
                stem = Path(e['path']).stem
                raw = wp.get(stem) or prod.get(e.get('data_id', '')) or prod.get(key.replace('-', '_'))
                rows.append((f'{prefix}-{key}', REPO / e['path'], raw, stem))
    elif mode == 'glyph':
        wp = wick_prompt_index()
        for fam in ('prayers', 'feelings', 'modules'):
            for key, e in cat[fam].items():
                if not usable(e):
                    continue
                stem = Path(e['path']).stem
                label = e.get('label') or ''
                raw = wp.get(stem) or (label if fam != 'prayers' and not label.startswith('Wick') else None)
                if raw and fam == 'feelings':
                    raw = 'an abstract ribbon glyph of a feeling, ' + raw
                elif raw and fam == 'modules':
                    raw = 'a small diagram glyph: ' + raw
                rows.append((key if fam != 'prayers' else key, REPO / e['path'], raw, stem))
    elif mode == 'portraits':
        arch, mpat = archetype_index(), mpat_index()
        for key, e in cat['characters'].items():
            if not usable(e):
                continue
            raw = arch.get(e.get('archetype', '')) or mpat.get(key)
            if not raw and e.get('brief_row') and key.startswith('m813-'):
                raw = m813_row_caption(e['brief_row'])
            rows.append((key, REPO / e['path'], raw, Path(e['path']).stem))
    elif mode == 'patrons':
        pat = patron_index()
        for key, e in cat['patrons'].items():
            if usable(e):
                rows.append((key, REPO / e['path'], pat.get(key), key))
    elif mode == 'skills':
        data = {s['id']: s for s in json.loads(read(REPO / 'data/skills.json'))['items']}
        for key, e in cat['skills'].items():
            if not usable(e):
                continue
            s = data.get(key.replace('-', '_'))
            raw = f"a faceless gesture figure for the skill {e['label']}: {s['summary']}" if s and s.get('summary') else None
            rows.append((key, REPO / e['path'], raw, key))
    return rows


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--mode', required=True, choices=sorted(TRIGGERS))
    ap.add_argument('--out', required=True, help='folder for the <id>.txt files (outside the repo art/ tree)')
    ap.add_argument('--trigger')
    ap.add_argument('--background', help='override the background phrase appended to every caption ("" for none)')
    ap.add_argument('--images-out', help='also copy masters here as <id>.png')
    ap.add_argument('--gear-src', help='folder holding delivered gear masters (gear mode)')
    ap.add_argument('--holdout', default='', help='comma-separated ids to leave out of training')
    a = ap.parse_args()

    out = Path(a.out).resolve()
    outs = [out] + ([Path(a.images_out).resolve()] if a.images_out else [])
    for o in outs:
        if o == ART or ART in o.parents:
            sys.exit(f'refusing to write inside the repo art/ tree: {o}')
    trigger = a.trigger or TRIGGERS[a.mode]
    hold = {h.strip() for h in a.holdout.split(',') if h.strip()}
    rows = items_for(a.mode, catalog(), a.gear_src)

    written, missing, held, copied, noimage = [], [], [], [], []
    for o in outs:
        o.mkdir(parents=True, exist_ok=True)
    for iid, img, raw, stem in rows:
        if iid in hold:
            held.append(iid)
            continue
        if a.images_out and img is not None:
            if Path(img).exists():
                shutil.copyfile(img, Path(a.images_out) / f'{iid}.png')
                copied.append(iid)
            else:
                noimage.append(iid)
        desc = clean(raw).rstrip('. ') if raw else ''
        if len(desc) < 12:
            missing.append(iid)
            continue
        bg = BACKGROUNDS[a.mode] if a.background is None else a.background
        (out / f'{iid}.txt').write_text(f'{trigger}, {desc}' + (f', {bg}' if bg else '') + '\n', encoding='utf-8')
        written.append(iid)
    unknown_hold = sorted(hold - set(held))
    print(json.dumps({'mode': a.mode, 'trigger': trigger, 'out': str(out), 'images_out': a.images_out,
                      'total': len(rows), 'written': len(written), 'missing_count': len(missing), 'missing': missing,
                      'held_out': held, 'holdout_not_found': unknown_hold, 'images_copied': len(copied),
                      'images_not_found': noimage}, indent=1))


if __name__ == '__main__':
    main()
