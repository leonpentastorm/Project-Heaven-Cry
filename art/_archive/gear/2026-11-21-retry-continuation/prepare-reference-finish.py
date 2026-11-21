#!/usr/bin/env python3
"""Prepare reference-first cosmetic grade edits; preserve every earlier request."""
from pathlib import Path
import argparse
import datetime
import hashlib
import json

BASE = Path(__file__).resolve().parent

def prepare(ids):
    path = BASE / 'queue.json'
    queue = json.loads(path.read_text())
    changed = []
    for job in queue:
        if job['status'] != 'pending' or (ids and job['id'] not in ids):
            continue
        if job.get('request_layout') == 'reference-first-cosmetic-v1':
            continue
        original = job['prompt']
        index = original.find('Grade: ')
        assert index >= 0, job['id']
        grade_and_constraints = original[index:]
        name = job['standard_id'].removeprefix('weapon-').replace('_', ' ')
        prompt = (
            f"Create the {job['grade'].title()}-finish cosmetic variant of the attached fictional RPG {name} inventory painting for Project Heaven Cry. This is a 2D digital game-art asset. "
            "FIRST attachment fixes the exact visible object geometry and registration: preserve its complete outline, every part and opening, camera, pose, scale and margins. "
            "Where a preceding grade is attached, retain its existing surface additions except for the finish changes specified below. The portrait supplies Heavenprint ink and gouache brushwork only, never a person or scene.\n\n"
            + grade_and_constraints +
            "\n\nApply surface changes only. Do not add, remove, move or resize a part or opening. Preserve the exact visible part counts, original maker accents and any lens/filter colours from the references. "
            "Hand-painted opaque gouache and ink, broken directional strokes, selective dry-brush, charcoal shadows, warm ivory focal edges and upper-left light. "
            "1024x1024 RGBA, fully transparent background, same reference framing and at least50px clear margin. No cast shadow, ground, scene, figure, hand, text, letters, numbers, logo, label, frame, border or external effects. "
            "This is an exterior painted illustration only, with no technical diagram, internal mechanism, measurements, assembly steps or operating instructions."
        )
        job.setdefault('prompt_revisions', []).append({
            'previous_prompt': original,
            'previous_sha256': hashlib.sha256(original.encode()).hexdigest(),
            'reason': 'Reference-first cosmetic editing for a grade-only task: exact visible geometry comes from the attached Standard, while the complete grade block and all following class-specific constraints are retained verbatim. Explicit item identity remains; every previous request is preserved.',
            'changed_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        })
        job['prompt'] = prompt
        job['active_prompt_sha256'] = hashlib.sha256(prompt.encode()).hexdigest()
        job['request_layout'] = 'reference-first-cosmetic-v1'
        assert grade_and_constraints in prompt
        changed.append(job['id'])
    path.write_text(json.dumps(queue, indent=2) + '\n')
    print(json.dumps({'prepared': changed, 'new_pictures': 0}))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--id', action='append', dest='ids')
    args = parser.parse_args()
    prepare(set(args.ids or []))
