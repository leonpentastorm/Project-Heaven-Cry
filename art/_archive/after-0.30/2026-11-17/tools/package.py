from pathlib import Path
import json,hashlib,zipfile,os
R=Path(__file__).parent;O=R/'delivery';A=O/'art/_archive/after-0.30/2026-11-17';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();read=lambda p:json.loads(p.read_text())
rows=read(A/'manifest.json');assert len(rows)==54 and read(A/'progress.json')['remaining']==0
paths=set()
for r in rows:paths.update([r['path'],r['source_path'],*r['exports'].values(),(A/'records'/f'{r["number"]:02d}.json').relative_to(O).as_posix()])
for folder in ['review','guide-snapshots','tools','references']:
 for p in (A/folder).rglob('*'):
  if p.is_file():paths.add(p.relative_to(O).as_posix())
for name in ['README.md','CONTINUE.md','source-brief.md','manifest.json','planned-jobs.json','progress.json','validation.json','validation-limitations.json','catalog-intake-fragment.json','full-library-check.txt','asset-build-check.txt']:paths.add((A/name).relative_to(O).as_posix())
dest=A/'deliveries/PHC-After-0.30-54-Icons-2026-11-17.zip';dest.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for path in sorted(paths):z.write(O/path,path)
 z.writestr('README.md',(A/'README.md').read_text());z.writestr('SHA256SUMS.txt',''.join(sha(O/p)+'  '+p+'\n' for p in sorted(paths)))
with zipfile.ZipFile(dest) as z:
 assert z.testzip() is None
 for p in paths:assert hashlib.sha256(z.read(p)).hexdigest()==sha(O/p)
checksum=dest.with_suffix('.zip.sha256');checksum.write_text(sha(dest)+'  '+dest.name+'\n')
for src in [dest,checksum,A/'review/all-54.jpg']:
 out=R/src.name
 if out.exists():out.unlink()
 os.link(src,out)
print(json.dumps({'zip':str(dest),'bytes':dest.stat().st_size,'sha256':sha(dest),'files':len(paths),'unique_native_sources':len({r['source_path'] for r in rows})}))
