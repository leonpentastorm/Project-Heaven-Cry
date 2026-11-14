from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageEnhance
import json, hashlib, shutil, zipfile
import numpy as np

R=Path('/workspace/phc-survival-2026-11-13');O=R/'delivery';A=O/'art/_archive/survival/2026-11-13-trial'
A.mkdir(parents=True,exist_ok=True);(A/'review').mkdir(exist_ok=True)
records=sorted([json.loads(p.read_text()) for p in (R/'results').glob('*.json')],key=lambda e:e['id'])
manifest=[];checks={}
for e in records:
    src=Image.open(e['source']);native=src.size
    p=O/e['path'];p.parent.mkdir(parents=True,exist_ok=True)
    if e['mode']=='backdrop':im=src.convert('RGB').resize((2560,1440),Image.Resampling.LANCZOS)
    elif e['mode']=='ground':im=src.convert('RGB').resize((1024,1024),Image.Resampling.LANCZOS)
    else:
        im=src.convert('RGBA');size=(384,256) if e['filename']=='container.png' else (256,256)
        if e['mode']=='wall' or e['filename'] in ['door.png','door-open.png']:
            im=im.resize(size,Image.Resampling.LANCZOS)
        else:
            obj=im.crop(im.getchannel('A').getbbox());obj.thumbnail((round(size[0]*.8),round(size[1]*.8)),Image.Resampling.LANCZOS)
            im=Image.new('RGBA',size);im.paste(obj,((size[0]-obj.width)//2,(size[1]-obj.height)//2))
    im.save(p,optimize=True)
    dest=A/'native-renders'/f"{e['id']}.png";dest.parent.mkdir(exist_ok=True);shutil.copy2(e['source'],dest)
    entry={k:e[k] for k in ['id','path','mode','filename']};entry.update(native_dimensions=list(native),export_dimensions=list(im.size),upscaled=im.width>native[0] or im.height>native[1],status='review-candidate',sha256=hashlib.sha256(p.read_bytes()).hexdigest(),source=str(dest.relative_to(O)))
    if im.mode=='RGBA':
        alpha=im.getchannel('A');entry['alpha_bbox']=list(alpha.getbbox());entry['alpha_extrema']=alpha.getextrema()
    manifest.append(entry)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',16)
backs=[e for e in manifest if e['mode']=='backdrop']
for page in range((len(backs)+5)//6):
    sheet=Image.new('RGB',(1440,1350),'#10151f');d=ImageDraw.Draw(sheet)
    for k,e in enumerate(backs[page*6:page*6+6]):
        im=Image.open(O/e['path']);im.thumbnail((710,400));x=k%2*720;y=k//2*450;sheet.paste(im,(x,y));d.text((x+10,y+405),e['id']+' '+e['filename'],font=font,fill='white')
    sheet.save(A/f'review/backdrops-{page+1:02}.jpg',quality=92)
kit=[e for e in manifest if e['mode']!='backdrop']
sheet=Image.new('RGB',(1280,((len(kit)+5)//6)*210+40),'#10151f');d=ImageDraw.Draw(sheet)
for k,e in enumerate(kit):
    im=Image.open(O/e['path']).convert('RGBA');im.thumbnail((180,170));x=k%6*210+10;y=k//6*210+10;sheet.paste(im,(x,y),im);d.text((x,y+175),e['filename'],font=font,fill='white')
sheet.save(A/'review/ahoc-kit.png')
seams={};walls={}
for e in kit:
    im=Image.open(O/e['path'])
    if e['mode']=='ground':
        a=np.asarray(im,dtype=float)
        dx=np.abs(np.diff(a,axis=1)).mean();dy=np.abs(np.diff(a,axis=0)).mean()
        sx=np.abs(a[:,0]-a[:,-1]).mean();sy=np.abs(a[0]-a[-1]).mean()
        seams[e['filename']]={'join_mean_abs_rgb_x':sx,'join_mean_abs_rgb_y':sy,'interior_mean_abs_rgb_x':dx,'interior_mean_abs_rgb_y':dy,'join_to_interior_ratio_x':sx/max(dx,.01),'join_to_interior_ratio_y':sy/max(dy,.01),'note':'Continuity metric only, not a substitute for visual inspection.'}
        for scale,label in [(384,'repeat'),(64,'game-scale-repeat')]:
            tile=im.resize((scale,scale),Image.Resampling.LANCZOS);patch=Image.new('RGB',(scale*3,scale*3))
            for x in range(3):
                for y in range(3):patch.paste(tile,(x*scale,y*scale))
            patch.save(A/f"review/{e['filename'][:-4]}-{label}.png")
    if e['mode']=='wall':
        a=np.array(im.getchannel('A'));edges={name:np.flatnonzero(v>=128).tolist() for name,v in [('left',a[:,0]),('right',a[:,-1]),('bottom',a[-1,:])]}
        walls[e['filename']]={'opaque_connection_edge_indices':edges,'bbox':im.getchannel('A').getbbox(),'expected_band_indices':list(range(64,192))}
straight=next((e for e in kit if e['filename']=='wall-straight.png'),None)
if straight:
    im=Image.open(O/straight['path']);patch=Image.new('RGBA',(1024,512));
    for x in range(4):patch.alpha_composite(im,(x*256,0))
    for k,name in enumerate(['wall-end.png','wall-corner.png','wall-door.png','wall-broken.png']):
        e=next((e for e in kit if e['filename']==name),None)
        if e:patch.alpha_composite(Image.open(O/e['path']),(k*256,256))
    bg=Image.new('RGBA',patch.size,'#62666a');bg.alpha_composite(patch);bg.convert('RGB').save(A/'review/wall-joins.png')
(A/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');(A/'texture-seams.json').write_text(json.dumps(seams,indent=2)+'\n');(A/'wall-geometry.json').write_text(json.dumps(walls,indent=2)+'\n')
for f in ['brief.md','backdrop-prompts.json','kit-prompts.json','wall-revision-prompts.json','generation-worker.js','package-trial.py']:
    if (R/f).exists():shutil.copy2(R/f,A/f)
shutil.copytree(R/'results',A/'generation-records',dirs_exist_ok=True)
for name in ['superseded','geometry-guides']:
    if (R/name).exists():shutil.copytree(R/name,A/name,dirs_exist_ok=True)
(O/'README.md').write_text(f'''# Heavenprint Survival — first trial delivery

{len(backs)} of 24 fight backdrops and {len(kit)} of 21 starred AHOC trial pieces are included. All are review candidates. This is the first stage of the 294-image brief, not the completed commission.

The brief's opening make-order says to stop after the AHOC core kit and show its texture repeats and wall joins before the other five kits. Painted maps and the remaining batches are queued after that review. No game code or catalog has been modified.

Use individual files under art/ for artwork. Native renders, prompts, generation records, contact sheets and technical seam/geometry reports are under art/_archive/survival/2026-11-13-trial/. Review the 3x3 ground repeats and wall-joins.png, not isolated thumbnails. Texture continuity metrics do not prove perceptual seamlessness; wall-geometry.json records the actual edge profiles rather than assuming exact grid fits.

Backdrops are exported at 2560x1440; generation-native dimensions are recorded per file. Any export larger than its source is explicitly marked upscaled in manifest.json. No AI detail enhancement is claimed. Ground tiles are 1024 square; sprites and walls 256 square except the 384x256 container. Native originals remain intact.
''')
files=sorted(p for p in O.rglob('*') if p.is_file() and p.name!='SHA256SUMS.txt');(O/'SHA256SUMS.txt').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+str(p.relative_to(O))+'\n' for p in files))
zpath=Path('/workspace/PHC-Survival-Backdrops-AHOC-Trial.zip')
with zipfile.ZipFile(zpath,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for p in sorted(O.rglob('*')):
        if p.is_file():z.write(p,str(p.relative_to(O)))
with zipfile.ZipFile(zpath) as z:assert z.testzip() is None
print(json.dumps({'backdrops':len(backs),'kit':len(kit),'zip':str(zpath),'seams':seams}))
