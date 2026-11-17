from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib, json, zipfile, os, math
R=Path(__file__).parent; O=R/'delivery'; A=O/'art/_archive/nine-doors/2026-11-16'
read=lambda p:json.loads(p.read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
rows=[read(A/'records'/f'{n:03d}.json') for n in [271,272,273,274]]
rows+=sorted([read(p) for p in (A/'records-0.30').glob('*.json')],key=lambda r:r['recipe_index'])
assert len(rows)==45 and read(A/'progress-0.30.json')['remaining_count']==0
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',14)
small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',11)
w,h=280,235; sheet=Image.new('RGB',(w*5,h*9+65),'#10151f'); d=ImageDraw.Draw(sheet)
d.text((20,12),'HEAVEN CRY / 45 NEW ART CANDIDATES / 17 NOV 2026',font=font,fill='white')
d.text((20,36),'4 camp signs + 41 version 0.30 requests. White areas are ink; dark areas show transparency.',font=small,fill='#a3aec2')
paths=set(); inventory=[]
for i,r in enumerate(rows):
 x=(i%5)*w; y=(i//5)*h+65
 im=Image.open(O/r['path']).convert('RGBA'); im.thumbnail((180,180),Image.Resampling.LANCZOS)
 sheet.paste(im,(x+50,y),im)
 d.text((x+12,y+180),r['name'][:34],font=font,fill='white')
 label='Camp '+str(r['number']) if 'number' in r else '0.30 / '+r['file_key']
 d.text((x+12,y+202),label[:42],font=small,fill='#a3aec2')
 rp=(A/'records'/f'{r["number"]:03d}.json') if 'number' in r else A/'records-0.30'/(r['file_key']+'.json')
 assets=[r['path'],r['source_path'],*r['exports'].values(),rp.relative_to(O).as_posix()]
 paths.update(assets)
 inventory.append({'name':r['name'],'key':r.get('request_key',r.get('number')),'master':r['path'],'native_source':r['source_path'],'native_dimensions':r['native_dimensions'],'export_dimensions':r['export_dimensions'],'exports':r['exports'],'record':rp.relative_to(O).as_posix(),'production_approved':False})
preview=A/'review/continuation-45-complete.jpg'; sheet.save(preview,quality=95)
(A/'delivery-inventory-45.json').write_text(json.dumps(inventory,indent=2)+'\n')
report=A/'DELIVERY-COMPLETE-2026-11-17.md'
report.write_text('''# Nine Doors continuation complete — 17 November 2026

45 new image candidates: the four camp signs (#271–274) and all 41 separate version-0.30 requests. The legacy ledger is 348/375; its 27 unfinished retired or blocked recipes remain held. No eligible painting requests remain in this audited scope. Palm #258 remains delivered and held for review.

[45-image preview](review/continuation-45-complete.jpg) · [Incremental download](deliveries/PHC-Nine-Doors-45-New-Candidates-2026-11-17.zip) · [Inventory](delivery-inventory-45.json)

## Implementation and review

Use records-0.30/ and candidate-fragment-0.30.json for the new requests. Known source catalog bindings are registered; candidates without source-backed bindings are not wired to invented IDs. Four revised move images reuse their documented old paths, but their held numeric recipes remain held. Follow has exactly one new painting after the reuse audit. No gameplay or UI code changed.

Leon explicitly authorized the pinned revision-2 visual basis for the eight questioned fork proposals. Their gameplay alternatives remain unresolved. All 45 images are unapproved review candidates; assistant visual checks do not constitute production approval.

## Files and checks

The incremental ZIP contains these 45 masters, immutable native PNGs, UI exports, per-image records, source recipes, current ledgers and checks. It is not the complete 348-image legacy library. The full manifests are context; absent historical files must be obtained from the Git branch.

Native renders are 1254×1254. Master exports are 1024×1024, with no upscaling. Ink UI exports are 128/64/48/44/32/24; Afterword gear uses 256/128/64/32. White-ink RGB, alpha, bounds, safe framing, file hashes and repository 44px checks pass for all applicable new candidates. All original 344 records and 2703 source/master/export Git blobs are preserved unchanged.

This runtime is a partial checkout. Full-library validation and npm asset build were attempted; missing historical inputs prevent a complete pass. Exact logs are included. The prior full checkout also recorded a historical Bulwark export-set mismatch. These limitations are not reported as passing checks.

Do not repaint held legacy recipes, restore rejected #44 axe versions, add a default cup to Wick, or treat the 41 additions as legacy denominator progress. Review the actual small-size sheets before production approval.
''')
paths.update([preview.relative_to(O).as_posix(),report.relative_to(O).as_posix(),(A/'delivery-inventory-45.json').relative_to(O).as_posix()])
for name in ['manifest.json','manifest-0.30.json','progress.json','progress-0.30.json','holds-0.30.json','candidate-fragment-0.30.json','catalog-fragment.json','prepared-render-jobs-0.30.json','user-direction-2026-11-17.json','CURRENT-CHECKPOINT.md','CONTINUE.md','RESUME-AUDIT-2026-11-17.md','USER-CORRECTIONS.md','current-run-validation.json','new-scoped-validation.json','current-scoped-check.txt','current-full-library-check.txt','current-asset-build-check.txt']:
 p=A/name
 if p.exists():paths.add(p.relative_to(O).as_posix())
for folder in ['review','references-0.30','nov17-tools']:
 for p in (A/folder).rglob('*'):
  if p.is_file():paths.add(p.relative_to(O).as_posix())
for r in rows:
 for ref in r.get('generation_references',[]):
  if (O/ref).is_file():paths.add(ref)
dest=A/'deliveries/PHC-Nine-Doors-45-New-Candidates-2026-11-17.zip';dest.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for path in sorted(paths):z.write(O/path,path)
 z.writestr('README.md',report.read_text())
 z.writestr('SHA256SUMS.txt',''.join(sha(O/p)+'  '+p+'\n' for p in sorted(paths)))
with zipfile.ZipFile(dest) as z:
 assert z.testzip() is None
 for path in paths:assert hashlib.sha256(z.read(path)).hexdigest()==sha(O/path)
checksum=dest.with_suffix('.zip.sha256');checksum.write_text(sha(dest)+'  '+dest.name+'\n')
for src in [dest,checksum,preview]:
 out=R/src.name
 if out.exists():out.unlink()
 os.link(src,out)
print(json.dumps({'new_images':45,'zip':str(dest),'zip_bytes':dest.stat().st_size,'preview':str(preview),'sha256':sha(dest),'files':len(paths)}))
