from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,shutil,hashlib,importlib.util
R=Path('/workspace/phc-survival-foes-2026-11-14');O=R/'recovered-delivery';G=Path('/workspace/phc-gear-publish');ARC='art/_archive/survival/2026-11-14-foes';A=O/ARC;REV=ARC+'/revisions/2026-11-14-corrections'
rows=[json.loads(p.read_text()) for p in sorted((R/'revisions').glob('*.json'))];assert len(rows)==10
manifest=json.loads((A/'manifest.json').read_text());byid={e['id']:e for e in manifest};cpath=G/'art/catalog.json';cat=json.loads(cpath.read_text());changed=[]
for folder in ['superseded','native-renders','prompts']:(O/REV/folder).mkdir(parents=True,exist_ok=True)
shutil.copy2(A/'manifest.json',O/REV/'superseded/manifest.json')
# Manual positions estimated on the native-head review; transform them with each export crop.
eyes={'elite-crawler':(.51,.216),'foe-crawler-elite':(.52,.182),'foe-crawler-minion-a':(.52,.18),'foe-crawler-minion-b':(.49,.182),'foe-crawler-soldier-a':(.535,.163),'foe-crawler-soldier-b':(.48,.22),'foe-crawler-vermin':(.49,.229),'foe-drone-vermin':(.50,.30),'foe-ork-soldier-b':(.50,.13),'vault-guard-city':(.55,.215)}
for r in rows:
 id=r['id'];e=byid[id];old=O/e['path'];prev=REV+'/superseded/'+id+'.png';shutil.copy2(old,O/prev)
 src=Image.open(r['source']).convert('RGB');w,h=src.size;box=(0,0,w,h)
 if id=='foe-drone-vermin':
  top=round(.10*h);ch=h-top;cw=round(ch*.8);left=(w-cw)//2;box=(left,top,left+cw,h)
 if id=='foe-ork-soldier-b':
  ch=round(.65*h);cw=round(ch*.8);left=(w-cw)//2;box=(left,0,left+cw,ch)
 im=src.crop(box).resize((800,1000),Image.Resampling.LANCZOS);im.save(old,optimize=True)
 sourcepath=REV+'/native-renders/'+id+'.png';shutil.copy2(r['source'],O/sourcepath)
 (O/REV/'prompts'/f'{id}.json').write_text(json.dumps(r,indent=2)+'\n')
 ex,ey=eyes[id];eye={'x':round((ex*w-box[0])/(box[2]-box[0]),3),'y':round((ey*h-box[1])/(box[3]-box[1]),3)}
 asset=cat['characters'][id];asset.update(sha256=hashlib.sha256(old.read_bytes()).hexdigest(),eye_line=eye,source_path=sourcepath,previous_path=prev,status='review-candidate',production_approved=False)
 e.update(sha256=asset['sha256'],eye_line=eye,source_path=sourcepath,native_dimensions=[w,h],native_sha256=hashlib.sha256((O/sourcepath).read_bytes()).hexdigest(),previous_path=prev,export_crop=list(box),eye_line_method='manual estimate on native review, transformed with export crop',revision='2026-11-14-corrections')
 if 'prompt' in r:e['prompt']=r['prompt']
 else:e.pop('prompt',None);e['prompt_summary']=r['prompt_summary']
 e['references']=r.get('references',['art/style-guide/references/approved-original-27.jpg','art/style-guide/references/approved-new-faces-27.jpg'])
 changed.extend([e['path'],sourcepath,prev,REV+'/prompts/'+id+'.json'])
cattext=json.dumps(cat,indent=2)+'\n';cpath.write_text(cattext)
(A/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');(O/'catalog-fragment.json').write_text(json.dumps({'characters':{k:a for k,a in cat['characters'].items() if a.get('collection')=='survival-foes'}},indent=2)+'\n')
(O/'art/catalog.json').write_text(cattext)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',11)
def token(e,size=40):
 im=Image.open(O/e['path']).convert('RGB');x=e['eye_line']['x']*800;y=e['eye_line']['y']*1000;b=230;cy=y+45
 crop=im.crop((round(x-b/2),round(cy-b/2),round(x+b/2),round(cy+b/2))).resize((size,size),Image.Resampling.LANCZOS)
 mask=Image.new('L',(size,size));ImageDraw.Draw(mask).ellipse((0,0,size-1,size-1),fill=255);return crop,mask
for kind in ['crawler','ork','drone']:
 old=A/f'review/{kind}.jpg';shutil.copy2(old,O/REV/'superseded'/f'{kind}-sheet.jpg');entries=[e for e in manifest if e['kind']==kind];entries.sort(key=lambda e:e['prompt_number'])
 sheet=Image.new('RGB',(1000,285*((len(entries)+3)//4)),'#10151f');d=ImageDraw.Draw(sheet)
 for k,e in enumerate(entries):
  x=k%4*250;y=k//4*285;im=Image.open(O/e['path']).resize((180,225),Image.Resampling.LANCZOS);sheet.paste(im,(x,y));t,mask=token(e);sheet.paste(t,(x+195,y+15),mask);d.text((x+2,y+230),e['id'],font=font,fill='white');d.text((x+2,y+246),e['tier']+' / '+e['role'],font=font,fill='#b8bec9')
 sheet.save(old,quality=94)
review=Image.new('RGB',(1200,330*((len(rows)+3)//4)),'#10151f');d=ImageDraw.Draw(review)
for k,r in enumerate(rows):
 e=byid[r['id']];x=k%4*300;y=k//4*330;im=Image.open(O/e['path']).resize((216,270),Image.Resampling.LANCZOS);review.paste(im,(x,y));t,mask=token(e);review.paste(t,(x+235,y+20),mask);d.text((x,y+275),e['id'],font=font,fill='white')
review.save(O/REV/'corrections-review.jpg',quality=94)
notes='''# Survival foes: correction round\n\nFull delivery coverage remains 71/71. This turn recovered the existing 71-portrait branch and painted ten replacements: eight Crawlers, the Ork soldier B, and the vermin drone. The other 61 portraits are retained.\n\nCrawlers now depict the frightening nonhuman forms ordinary humans perceive, with human eyes/posture expressing the tragedy. The Ork has a broad tusked grey-green jaw; the drone lens is centred. Previous masters, sources and sheets remain preserved. All are review candidates, not production-approved.\n\nMasters are 800x1000 opaque RGB. New native renders are recorded per entry; export cropping on the drone and Ork improves eye-line placement. Eye lines are manual review estimates, not claims of automated landmark precision. Revised 40px round crops are included on the kind sheets and corrections review. No game code is changed.\n'''
(O/REV/'README.md').write_text(notes)
(A/'README.md').write_text('# Survival foes\n\n71/71 portraits, with ten corrected candidates from this turn. Start with `revisions/2026-11-14-corrections/corrections-review.jpg`, then the nine kind sheets in `review/`. All masters are 800x1000 opaque RGB; native renders, generation records, previous versions and eye-line metadata remain available. See the correction README for provenance and export notes.\n')
(O/'README.md').write_text(notes)
(O/'validation.json').write_text(json.dumps({'count':71,'repainted_this_turn':10,'retained':61,'master_dimensions':[800,1000],'status':'review-candidate','eye_line_method':'manual estimates, transformed with crop where applicable','commit_base':'b7897d5f9590ac6d982043518c1d2c3fae4d6b9b'},indent=2)+'\n')
for e in manifest:
 asset=cat['characters'][e['id']];data=(O/e['path']).read_bytes();assert hashlib.sha256(data).hexdigest()==e['sha256']==asset['sha256']
 im=Image.open(O/e['path']);im.load();assert im.mode=='RGB' and im.size==(800,1000)
 assert hashlib.sha256((O/e['source_path']).read_bytes()).hexdigest()==e['native_sha256']
 assert .4<=asset['eye_line']['x']<=.6
# Run the repository's specific validation against the complete recovered 71-portrait snapshot.
spec=importlib.util.spec_from_file_location('phc_validate',G/'tools/validate_art.py');v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v);v.ROOT=O;v.validate_survival_foes(cat);v.validate_eye_lines(cat)
changed.extend([ARC+'/manifest.json',ARC+'/README.md']+[ARC+f'/review/{k}.jpg' for k in ['crawler','ork','drone']]+[str(p.relative_to(O)) for p in (O/REV).rglob('*') if p.is_file()])
changed=sorted(set(changed))
for path in changed:
 dest=G/path;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(O/path,dest)
(R/'publish-paths.json').write_text(json.dumps(changed+['art/catalog.json'],indent=2)+'\n')
print('PASS: all 71 masters, source hashes, manifest/catalog bindings and eye lines; ten corrected candidates prepared for publication.')
