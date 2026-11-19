#!/usr/bin/env python3
"""Technical delivery and provenance for the claimed File10 section1 repaints."""
import argparse, importlib.util, json, hashlib, shutil, sys
from pathlib import Path
from datetime import datetime, timezone
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'art/_archive/gear/2026-11-19-repaint-continuation'
OLD=ROOT/'art/_archive/prompt-pack/2026-11-19-file-10'
def read(p):return json.loads(p.read_text())
def dump(p,v):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,indent=2)+'\n')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def rec(p):return {'path':str(p.relative_to(ROOT)),'sha256':sha(p)}
def module():
 s=importlib.util.spec_from_file_location('file10_delivery',OLD/'deliver.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
def export(asset,source):
 q=read(BASE/'queue.json');j=next(j for j in q if j['id']==asset);assert j['status']=='pending'
 cat=read(ROOT/'art/catalog.json');target=ROOT/j['path'];assert sha(target)==cat['gear'][asset]['sha256']
 dump(BASE/f'previous-catalog/{asset}.json',cat['gear'][asset])
 stage=BASE/'invocations';stage.mkdir(exist_ok=True)
 dump(stage/f'result-{j["n"]}.json',{'src':str(source.resolve()),'prompt':j['prompt']})
 m=module();job=next(x for x in read(OLD/'queue.json') if x['n']==j['n']);job['span']=j['span'];m.preview([job],stage);m.register([job],stage);m.verify()
 master=BASE/f'masters/v1/{asset}.png';master.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(target,master)
 row=read(OLD/f'records/{j["n"]:02}.json');record={'id':asset,'record':str((OLD/f'records/{j["n"]:02}.json').relative_to(ROOT)),'references':[rec(ROOT/p) for p in j['refs']],'reference_sources':[rec(ROOT/p) for p in j.get('reference_sources',[])],'prompt':rec(BASE/f'prompts/{asset}.txt'),'master':rec(master),'previous_catalog':rec(BASE/f'previous-catalog/{asset}.json')}
 dump(BASE/f'records/{asset}.json',record);j['status']='delivered';dump(BASE/'queue.json',q)
 progress=read(BASE/'progress.json');progress.update(status='drawing' if any(x['status']!='delivered' for x in q) else 'complete-review-pending',delivered=[x['id'] for x in q if x['status']=='delivered'],remaining=[x['id'] for x in q if x['status']!='delivered'],updated_utc=datetime.now(timezone.utc).isoformat());dump(BASE/'progress.json',progress)
 font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',12)
 for size in (64,32):
  paths=[ROOT/p for p in j['refs'] if '/gear/' in p or '/before/' in p];paths.append(target)
  canvas=Image.new('RGB',(220*len(paths),size+80),'#10151F');d=ImageDraw.Draw(canvas)
  for i,p in enumerate(paths):
   im=Image.open(p).convert('RGBA').resize((size,size),Image.Resampling.LANCZOS);canvas.paste(im,(i*220+(220-size)//2,25),im);d.text((i*220+5,size+36),('NEW ' if p==target else 'REF ')+p.stem.replace('weapon-',''),font=font,fill='white')
  out=BASE/f'reviews/{asset}-{size}px.png';out.parent.mkdir(exist_ok=True);canvas.save(out)
 note=f'\n\nContinuation: **{len(progress["delivered"])}/14** previously unfinished section1 repaints delivered on `art/2026-11-19-repaint-continuation`; **{3+len(progress["delivered"])}/17** section1 total including the3 earlier candidates. Exact remaining: '+', '.join(progress['remaining'])+'. All new candidates are unapproved. See `progress.json`, per-asset records and source brief. Full-library validation needs a full checkout.\n'
 claimtext=(ROOT/'art/briefs/prompts-2026-11-19/WORK-CLAIMS.md').read_text();(BASE/'HANDOFF.md').write_text(claimtext+note)
 sys.path.insert(0,str(ROOT/'tools'));from rehash_art_checksums import main;main()
 validate(asset)
def validate(asset=None):
 q=read(BASE/'queue.json');p=read(BASE/'progress.json');assert len(q)==14
 assert (BASE/'source-brief.md').read_bytes()==(ROOT/'art/briefs/prompts-2026-11-19/10-rifle-analogues.md').read_bytes()
 hashes={p:h for h,p in (x.split('  ',1) for x in (ROOT/'art/checksums.sha256').read_text().splitlines())}
 cat=read(ROOT/'art/catalog.json')['gear'];m=module()
 for j in q:
  if j['status']!='delivered':continue
  r=read(BASE/f'records/{j["id"]}.json');row=read(ROOT/r['record']);a=cat[j['id']]
  assert a['path']==j['path'] and a['status']=='review-candidate' and a['production_approved'] is False
  for record in [*r['references'],*r['reference_sources'],r['prompt'],r['master'],r['previous_catalog']]:assert sha(ROOT/record['path'])==record['sha256']==hashes[record['path']]
  assert sha(ROOT/a['path'])==a['sha256']==row['sha256']==r['master']['sha256']
  assert sha(ROOT/a['source_path'])==row['source_sha256']==hashes[a['source_path']]
  assert sha(ROOT/a['previous_path'])==a['previous_sha256']
  before=read(ROOT/r['previous_catalog']['path']);assert before['sha256']==a['previous_sha256']
  for size,path in a['previous_exports'].items():assert sha(ROOT/path)==sha(ROOT/(str(BASE.relative_to(ROOT))+f'/references/previous-exports/{size}/{j["id"]}.png'))
  if asset and j['id']!=asset:continue
  for size,path in [(1024,a['path']),*[(int(s),v) for s,v in a['exports'].items()]]:
   assert sha(ROOT/path)==hashes[path]
   if size!=1024:assert sha(ROOT/path)==row['export_sha256'][str(size)]
   with Image.open(ROOT/path) as im:
    box=m.check_frame(im,size)
    if size==1024:assert min(box[0],box[1],size-box[2],size-box[3])>=50
  for size in (64,32):assert (BASE/f'reviews/{j["id"]}-{size}px.png').is_file()
 assert p['delivered']==[j['id'] for j in q if j['status']=='delivered'];assert p['remaining']==[j['id'] for j in q if j['status']!='delivered']
 print(f'PASS: {len(p["delivered"])}/14 selected File10 repaints; sources, archived previous masters/exports, references, hashes, RGBA margins and progress. Pixel scope: {asset or "all delivered"}. Historical omitted art not byte-validated.')
if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('--id');ap.add_argument('--source',type=Path);ap.add_argument('--validate',action='store_true');args=ap.parse_args()
 if args.validate:validate(args.id)
 else:export(args.id,args.source)
