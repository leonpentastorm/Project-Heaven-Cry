#!/usr/bin/env python3
"""Pack unchanged Standard/preceding-grade references into labelled technical panels."""
from pathlib import Path
import argparse
import datetime
import hashlib
import json
from PIL import Image, ImageDraw

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[3]

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def pack(asset_id):
    queue_path = BASE / 'queue.json'
    queue = json.loads(queue_path.read_text())
    job = next(j for j in queue if j['id'] == asset_id)
    assert job['status'] == 'pending' and job['grade'] != 'fine'
    assert not job.get('reference_packing'), 'Already packed; preserve prior layout'
    previous = job['depends_on']
    catalog = json.loads((ROOT/'art/catalog.json').read_text())['gear']
    sources = [catalog[job['standard_id']]['path'], catalog[previous]['path']]
    assert sources == job['references'][:2]
    source_hashes = {p: sha(ROOT/p) for p in sources}
    for p in sources:
        assert source_hashes[p] == catalog[Path(p).stem]['sha256']
    old_refs = list(job['references'])
    old_prompt = job['prompt']
    sheet = Image.new('RGB', (2048, 1072), '#10151F')
    draw = ImageDraw.Draw(sheet)
    labels = ['LEFT: Standard — geometry / pose / framing', 'RIGHT: '+previous+' — preceding surface finish']
    for n, path in enumerate(sources):
        with Image.open(ROOT/path) as image:
            assert image.size == (1024,1024)
            rgba = image.convert('RGBA')
            sheet.paste(rgba, (n*1024,48), rgba)
        draw.text((n*1024+16,16), labels[n], fill='#EEE9DF')
    target = BASE/'references/packed'/f'{asset_id}.png'
    target.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(target)
    path = target.relative_to(ROOT).as_posix()
    metadata = {'path': path, 'sha256': sha(target), 'dimensions': list(sheet.size),
                'method': 'Two full-size1024x1024 originals composited over technical #10151F at (0,48)/(1024,48); no crop, resize or repaint. Original files unchanged.',
                'sources': [{'path': p, 'sha256': source_hashes[p]} for p in sources], 'new_picture_count': 0}
    target.with_suffix('.json').write_text(json.dumps(metadata,indent=2)+'\n')
    index = old_prompt.index('\n\nGrade: ')
    item = job['standard_id'].removeprefix('weapon-').replace('_',' ')
    prefix = (
        f"Create one {job['grade'].title()}-finish cosmetic variant of the fictional RPG {item} inventory painting for Project Heaven Cry. This is a2D digital game-art asset. "
        "FIRST attachment is a labelled TECHNICAL REFERENCE PAIR, not the output composition: LEFT panel is the exact Standard geometry/pose/framing master; RIGHT panel is the preceding grade with surface additions to retain. "
        "Both are unchanged full-size originals. Produce ONE complete object only, matching the LEFT geometry and the requested higher finish, retaining prior additions from the RIGHT. "
        "SECOND attachment supplies Heavenprint ink/gouache brushwork only, never a person or scene. No reference panel, label or second object in the output."
    )
    job.setdefault('prompt_revisions',[]).append({
        'previous_prompt': old_prompt, 'previous_sha256': hashlib.sha256(old_prompt.encode()).hexdigest(),
        'previous_references': old_refs,
        'reason': 'Clarify geometry-versus-finish reference roles in a single labelled technical pair. Both original images remain visible at full size with their original source hashes; item identity and complete grade/body constraints unchanged.',
        'changed_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    })
    job['prompt'] = prefix + old_prompt[index:]
    job['active_prompt_sha256'] = hashlib.sha256(job['prompt'].encode()).hexdigest()
    job['references'] = [path,old_refs[-1]]
    job['reference_sources'] = sources
    job['reference_source_hashes'] = source_hashes
    job['reference_packing'] = metadata
    job['request_layout'] = 'reference-first-cosmetic-paired'
    queue_path.write_text(json.dumps(queue,indent=2)+'\n')
    print(json.dumps(metadata))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--id',required=True)
    pack(parser.parse_args().id)
