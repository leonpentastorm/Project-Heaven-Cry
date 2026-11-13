from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,hashlib,shutil,zipfile,math
R=Path('/workspace/phc-gear-2026-11-13'); O=R/'complete-delivery'; A=O/'art/icons/gear'; C=O/'art/_archive/gear/2026-11-13-complete'
for p in [A,C/'native-renders',C/'superseded',C/'review',C/'provenance']:p.mkdir(parents=True,exist_ok=True)
entries={e['number']:e for e in json.loads((R/'generations.json').read_text())}
for e in json.loads((R/'revised-guns.json').read_text()):
 shutil.copy2(entries[e['number']]['source'],C/'superseded'/e['filename']);entries[e['number']]=e
for p in (R/'remaining-results').glob('*.json'):
 e=json.loads(p.read_text());entries[e['number']]=e
for p in (R/'revisions').glob('*.json'):
 e=json.loads(p.read_text());old=entries.get(e['number'])
 if old:shutil.copy2(old['source'],C/'superseded'/e['filename'])
 entries[e['number']]=e
meta={p['number']:p for p in json.loads((R/'production-prompts.json').read_text())+json.loads((R/'additional-prompts.json').read_text())}
starter_labels=['Service pistol','Drifter revolver','Decrkm SMG','Hellraiser rifle','Combat knife','Hand wraps','Evoker','Emanator','Padded coat','Medic plate','Flak vest','Pistol magazine','Rifle magazine','Revolver loader','.32 rounds','Revolver rounds','Rifle rounds','Field kit','Spare parts','Standard mana core','Chalk and wax','Ration pack','Prayer beads','Stim injector']
for n,label in enumerate(starter_labels,1):meta[n]={'label':label,'family':'Starting kit'}
manifest=[];fail=[]
for n,e in sorted(entries.items()):
 src=Image.open(e['source']).convert('RGBA');name=e['filename'];shutil.copy2(e['source'],C/'native-renders'/name)
 bbox=src.getchannel('A').getbbox();obj=src.crop(bbox);fam=meta.get(n,{}).get('family','');fill=.8
 if 'Submachine' in fam or n==3:fill=.7
 elif 'Heavy weapons' in fam:fill=.85
 elif any(t in fam for t in ['Rifles','Bows','Shields','Armour','Focuses']) or n in [4,7,8,9,10,11]:fill=.83
 elif any(t in fam for t in ['rounds','ammunition','Grenades']) or n in [15,16,17]:fill=.7
 elif any(t in fam for t in ['Consumables','Weapon mods','Unarmed']) or n in [6,18,19,20,21,22,23,24]:fill=.75
 obj.thumbnail((round(1024*fill),round(1024*fill)),Image.Resampling.LANCZOS)
 im=Image.new('RGBA',(1024,1024));im.paste(obj,((1024-obj.width)//2,(1024-obj.height)//2));im.save(A/name,optimize=True)
 exports={}
 for s in [256,128,64,32]:
  p=O/f'exports/{s}'/name;p.parent.mkdir(parents=True,exist_ok=True)
  target=Image.new('RGBA',(s,s));pad=1 if s==32 else 0
  target.paste(im.resize((s-2*pad,s-2*pad),Image.Resampling.LANCZOS),(pad,pad));target.save(p,optimize=True);exports[str(s)]=str(p.relative_to(O))
 for s in [1024,256,128,64,32]:
  p=A/name if s==1024 else O/f'exports/{s}'/name;t=Image.open(p);a=t.getchannel('A')
  assert t.mode=='RGBA' and t.size==(s,s) and a.getextrema()==(0,255),(name,s)
  assert all(a.crop(b).getbbox() is None for b in [(0,0,s,1),(0,s-1,s,s),(0,0,1,s),(s-1,0,s,s)]),(name,s,'border')
 manifest.append({'number':n,'filename':name,'label':meta.get(n,{}).get('label',name),'family':fam,'path':str((A/name).relative_to(O)),'native_dimensions':list(src.size),'export_dimensions':[1024,1024],'alpha_bbox':list(im.getchannel('A').getbbox()),'sha256':hashlib.sha256((A/name).read_bytes()).hexdigest(),'exports':exports,'status':'review-candidate','source':str((C/'native-renders'/name).relative_to(O)),'origin':'user-requested addition' if n>149 else 'brief'})
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',13)
smallfont=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',10)
for page in range(math.ceil(len(manifest)/24)):
 batch=manifest[page*24:(page+1)*24]
 dark=Image.new('RGB',(1200,920),'#10151f');light=Image.new('RGB',(1200,920),'#ddd9d0');small=Image.new('RGB',(1000,720),'#10151f')
 for sheet,title,color in [(dark,'HEAVENPRINT / GEAR / '+str(page+1),'#eee5d2'),(light,'ALPHA EDGES / LIGHT BACKGROUND','#10151f'),(small,'ACTUAL DISPLAY SIZE: 64 px + 32 px','#eee5d2')]:ImageDraw.Draw(sheet).text((15,12),title,font=font,fill=color)
 for k,e in enumerate(batch):
  im=Image.open(A/e['filename']);im.thumbnail((190,190));x=k%6*200+5;y=k//6*215+40;label=f"{e['number']:03d} {e['label']}"[:27]
  for sheet,color in [(dark,'#eee5d2'),(light,'#10151f')]:sheet.paste(im,(x,y),im);ImageDraw.Draw(sheet).text((x+2,y+190),label,font=smallfont,fill=color)
  sx=k%4*250;sy=k//4*110+40
  for s,dx in [(64,12),(32,100)]:
   icon=Image.open(O/f'exports/{s}'/e['filename']);small.paste(icon,(sx+dx,sy),icon)
  ImageDraw.Draw(small).text((sx+12,sy+73),label,font=smallfont,fill='#eee5d2')
 for sheet,prefix in [(dark,'overview'),(light,'alpha-light'),(small,'small-size')]:sheet.save(C/f'review/{prefix}-{page+1:02d}.png')
for f in ['brief.md','brief-latest.md','production-prompts.json','additional-prompts.json','prompts.json','revised-guns.json','revised-gun-prompts.json','rifle-revision-final-prompt.txt','corrections.json','generation-worker.js','package-full.py']:
 if (R/f).exists():shutil.copy2(R/f,C/'provenance'/f)
refout=C/'provenance/references';refout.mkdir(parents=True,exist_ok=True)
for name in ['fuel-drum.png','field-lamp.png','portrait-brushwork.png','AGENTS.md']:
 if (R/'references'/name).exists():shutil.copy2(R/'references'/name,refout/name)
if (R/'new-additions-preview.png').exists():shutil.copy2(R/'new-additions-preview.png',C/'review/new-additions.png')
(C/'provenance/brief-source.json').write_text(json.dumps({'repository':'leonpentastorm/Project-Heaven-Cry','branch':'develop','path':'art/briefs/GPT-PROMPTS-2026-11-13-gear.md','retrieved_content_sha':'0a4b6332c36f8a149eb46ea6343ecca6243bb366','additional_scope':'Two katanas requested in conversation'},indent=2)+'\n')
shutil.copytree(R/'remaining-results',C/'provenance/selected-records',dirs_exist_ok=True);shutil.copytree(R/'revisions',C/'provenance/revisions',dirs_exist_ok=True)
missing=sorted(set(range(1,152))-set(entries));report={'delivered':len(manifest),'expected':151,'missing_numbers':missing,'png_validation':'all masters and four runtime sizes passed RGBA, dimensions, nonempty opaque content and transparent borders','native_dimensions':sorted({tuple(e['native_dimensions']) for e in manifest}),'master_dimensions':[1024,1024],'runtime_sizes':[256,128,64,32],'integration':'Artist handoff only. Live game catalog and repository validators not run.','visual_review':'Review sheets provided on light/dark backgrounds and at actual 64/32 px.'}
(C/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');(C/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
(C/'catalog-fragment.json').write_text(json.dumps({'gear':{Path(e['filename']).stem:{k:e[k] for k in ['path','sha256','exports','status']} for e in manifest}},indent=2)+'\n')
(O/'README.md').write_text(f'''# Heavenprint gear artwork — 13 November 2026

{len(manifest)} individual painted inventory icons. Expected scope: 149 icons from the updated develop brief, plus the user-requested katana and Emanator katana (150–151). Missing numbers: {missing}.

## Handoff

- `art/icons/gear/`: transparent 1024 × 1024 PNG masters, exact brief filenames.
- `exports/256`, `128`, `64`, `32`: transparent runtime exports.
- `art/_archive/gear/2026-11-13-complete/`: original native renders, superseded guns/crossbow, numbered review sheets, manifest, validation and provenance.
- `SHA256SUMS.txt`: hashes of delivered files, excluding itself.

The first four firearms replace the earlier starter candidates with stronger silhouettes and hardware. The repeating crossbow was repainted to correct its string and remove surrounding haze. The other twenty starter assets are retained. The Attuner and toxin vial follow the updated brief. The two katanas are new user-requested designs; they do not imply added game statistics.

Each asset was generated individually. Contact sheets are review previews, never source atlases. Native dimensions are recorded per asset in the manifest. Exports use mechanical alpha-bound cropping, uniform downsampling and transparent-canvas centering; no AI upscaling, synthetic sharpening, recoloring or painted edits were applied during export. The 32 px exports include a one-pixel transparent guard to contain downsampling fringes. PNGs use straight alpha. Preserve the native originals for future revisions.

Review the overview, alpha-light and actual-size small-size sheets. These are artwork candidates for Leon's review. This package does not change the live game catalog; its catalog fragment is a handoff proposal for integration. Repository-wide game validators have not been run. No rarity variants are included.
''')
files=sorted(p for p in O.rglob('*') if p.is_file() and p.name!='SHA256SUMS.txt');(O/'SHA256SUMS.txt').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+str(p.relative_to(O))+'\n' for p in files))
for suffix,include in [('Complete',lambda p:True),('Runtime',lambda p:'_archive' not in p.parts)]:
 zpath=Path('/workspace')/f'PHC-Heavenprint-Gear-{len(manifest)}-{suffix}.zip'
 with zipfile.ZipFile(zpath,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for p in sorted(O.rglob('*')):
   if p.is_file() and include(p) and p.name!='SHA256SUMS.txt':z.write(p,str(p.relative_to(O)))
  selected=[p for p in sorted(O.rglob('*')) if p.is_file() and include(p) and p.name!='SHA256SUMS.txt']
  z.writestr('SHA256SUMS.txt',''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+str(p.relative_to(O))+'\n' for p in selected))
 with zipfile.ZipFile(zpath) as z:assert z.testzip() is None
 print(str(zpath),zpath.stat().st_size)
print(json.dumps(report))
