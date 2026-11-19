"""Validate the grade lane's actual images, portable provenance and exports."""
import hashlib,importlib.util,json
from pathlib import Path
from PIL import Image
A=Path(__file__).resolve().parent.relative_to(Path.cwd().resolve())
spec=importlib.util.spec_from_file_location('gear_validator','tools/validate_gear_art.py')
v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
catalog=json.loads(Path('art/catalog.json').read_text())['gear']
rows=list((A/'delivered').glob('*.json'))
for p in rows:
 r=json.loads(p.read_text());a=catalog[Path(r['path']).stem]
 assert a['status']=='review-candidate' and a['production_approved'] is False and a['implementation_ready'] is False,p
 assert not Path(a['source_path']).is_absolute() and Path(a['source_path']).is_file(),p
 assert Path(a['standard_path']).is_file(),p
 assert hashlib.sha256(Path(a['path']).read_bytes()).hexdigest()==a['sha256']==r['sha256'],p
 assert hashlib.sha256(Path(r['candidate']).read_bytes()).hexdigest()==r['sha256'],p
 assert hashlib.sha256(Path(a['source_path']).read_bytes()).hexdigest()==r['source_sha256'],p
 assert list(Image.open(a['source_path']).size)==a['native_dimensions'],p
 assert set(a['exports'])=={'256','128','64','32'},p
 v.validate_images({1024:a['path'],**{int(k):q for k,q in a['exports'].items()}})
print(f'PASS: {len(rows)} grade masters; hashes, portable native provenance, candidate flags and {len(rows)*4} clear-border RGBA exports.')
