from pathlib import Path
import json,shutil,sys,hashlib
r=(Path(__file__).parent/'delivery').resolve();a=r/'art/_archive/nine-doors/2026-11-16';n=int(sys.argv[1]);reason=sys.argv[2]
progress=json.loads((a/'progress.json').read_text());assert n not in progress['completed_ids'],'Never remove a delivered candidate here'
path=a/'records'/f'{n:03d}.json';rec=json.loads(path.read_text());cat=json.loads((r/'art/catalog.json').read_text());assert cat[rec['family']][rec['id']].get('placeholder'),'Draft must not be active'
dest=a/'superseded'/f'{n:03d}-{reason}';assert not dest.exists();dest.mkdir(parents=True)
for source,name in [(r/rec['path'],'master.png'),(r/rec['source_path'],'native.png'),(path,'record.json')]:shutil.copy2(source,dest/name)
for size,source in rec['exports'].items():
 target=dest/'exports'/size/Path(source).name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(r/source,target)
(dest/'REVIEW.md').write_text(reason+'; not delivered. Immutable source, master, exports and record retained.\n')
for source in [rec['path'],rec['source_path'],*rec['exports'].values()]:(r/source).unlink()
path.unlink();print('Archived draft',n,'to',dest)
