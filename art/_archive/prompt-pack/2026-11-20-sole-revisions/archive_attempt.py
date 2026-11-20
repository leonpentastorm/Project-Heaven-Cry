"""Preserve an unselected imagegen attempt; technical exports only, no drawing."""
import hashlib
import json
import shutil
import sys
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[4]
archive = Path(__file__).resolve().parent
payload = json.loads(Path(sys.argv[1]).read_text())
job = payload['job']
attempt = archive / 'attempts' / payload['attempt']
attempt.mkdir(parents=True, exist_ok=False)
source = Path(payload['src'])
shutil.copyfile(source, attempt / 'native.png')
(attempt / 'prompt.txt').write_text(job['prompt'] + '\n')
references = []
for index, path in enumerate(job['references']):
    dest = attempt / 'references' / f'{index:02d}-{Path(path).name}'
    dest.parent.mkdir(exist_ok=True)
    shutil.copyfile(root / path, dest)
    digest = hashlib.sha256(dest.read_bytes()).hexdigest()
    assert digest == job['reference_sha256'][path]
    references.append({'original_path': path, 'snapshot': str(dest.relative_to(root)), 'sha256': digest})
image = Image.open(source).convert('RGBA')
files = {}
for size in (1024, 256, 128, 64, 32):
    path = attempt / f'preview-{size}.png'
    image.resize((size, size), Image.Resampling.LANCZOS).save(path)
    files[str(size)] = {'path': str(path.relative_to(root)), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
record = {**payload, 'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'native_dimensions': list(image.size), 'native_mode': Image.open(source).mode, 'native_alpha_bbox': image.getchannel('A').getbbox(), 'references': references, 'technical_previews': files, 'selected': False, 'count_contribution': 0, 'status': payload.get('status', 'quality-rejected'), 'production_approved': False, 'implementation_ready': False}
(attempt / 'review.json').write_text(json.dumps(record, indent=2) + '\n')
assert hashlib.sha256((root / job['path']).read_bytes()).hexdigest() == job['original_sha256']
print(json.dumps({'archived': str(attempt.relative_to(root)), 'original_unchanged': True, 'count_contribution': 0, 'selected': False}))
