from pathlib import Path
from PIL import Image
import numpy as np
import json,hashlib,os,re,sys,base64,shutil
R=Path(__file__).parent;O=R/'delivery';ARC='art/_archive/nine-doors/2026-11-16';A=O/ARC
n=int(sys.argv[1]);hold=json.loads((A/'holds-0.30.json').read_text());assert n not in hold['held_legacy_ids'], 'HELD legacy job';raw=json.loads((R/f'result-{n}.json').read_text());j=raw['job'];r=raw['result'];m=re.search(r'/workspace/[^\s]+\.png',r.get('output_hint',''))
if m:src=Path(m[0])
else:
 url=r.get('image_url','');assert url.startswith('data:image/png;base64,');src=R/f'recovered-{n}.png';src.write_bytes(base64.b64decode(url.split(',',1)[1]))
im=Image.open(src);native=list(im.size);dest=O/j['path'];dest.parent.mkdir(parents=True,exist_ok=True);source=A/'native-renders'/f'{n:03d}-{dest.name}';source.parent.mkdir(parents=True,exist_ok=True)
if source.exists():assert hashlib.sha256(source.read_bytes()).digest()==hashlib.sha256(src.read_bytes()).digest(),'Archive revision before replacing source'
else:shutil.copy2(src,source)
crop=[0,0,im.width,im.height];exports={};frame={}
if j['kind'] in ['wick','sign','gear']:
 im=im.convert('RGBA');alpha=im.getchannel('A');assert alpha.getextrema()[0]==0,'Source lacks transparency';crop=alpha.getbbox();assert crop
 sub=im.crop(crop);mask=np.array(sub.getchannel('A'));ys,xs=np.where(mask>0);cx=(sub.width-1)/2;cy=(sub.height-1)/2;radius=float(np.sqrt((xs-cx)**2+(ys-cy)**2).max());scale=min(820/sub.width,820/sub.height,440/radius) if j['kind']=='wick' else min(820/sub.width,820/sub.height);scale=min(scale,1)
 sub=sub.resize((round(sub.width*scale),round(sub.height*scale)),Image.Resampling.LANCZOS);offset=[(1024-sub.width)//2,(1024-sub.height)//2];im=Image.new('RGBA',(1024,1024));im.alpha_composite(sub,tuple(offset));frame={'scale':scale,'offset':offset,'subject_box':820,'perk_safe_radius':460.8 if j['kind']=='wick' else None}
 if j['kind'] in ['wick','sign']:
  a=im.getchannel('A');im=Image.new('RGBA',im.size,(255,255,255,0));im.putalpha(a)
else:im=im.convert('RGB').resize((800,1000),Image.Resampling.LANCZOS)
tmp=dest.with_suffix('.tmp.png');im.save(tmp,optimize=True);os.replace(tmp,dest)
if j['kind'] in ['wick','sign','gear']:
 sizes=[256,128,64,56,48,44,40,32] if j['family']=='perks' else [256,128,64,32] if j['kind']=='gear' else [128,64,48,44,32,24]
 for size in sizes:
  out=dest.parent/'exports'/str(size)/dest.name;out.parent.mkdir(parents=True,exist_ok=True);small=im.resize((size,size),Image.Resampling.LANCZOS)
  if j['kind'] in ['wick','sign']:
   a=small.getchannel('A');small=Image.new('RGBA',small.size,(255,255,255,0));small.putalpha(a)
  tmp=out.with_suffix('.tmp.png');small.save(tmp,optimize=True);os.replace(tmp,out);exports[str(size)]=str(out.relative_to(O))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
record={**j,'status':'review-candidate','production_approved':False,'implementation_ready':False,'native_dimensions':native,'export_dimensions':list(im.size),'sha256':sha(dest),'source_path':str(source.relative_to(O)),'source_sha256':sha(source),'export_crop':list(crop),'exports':exports,'framing':frame,'upscaled':False,'export_processing':'Aspect-preserving alpha-bounds framing, Lanczos downsample/UI exports; white RGB enforced preserving generated alpha for ink modes'}
p=A/'records'/f'{n:03d}.json';p.parent.mkdir(parents=True,exist_ok=True);temp=p.with_suffix('.tmp.json');temp.write_text(json.dumps(record,indent=2)+'\n');os.replace(temp,p);(R/f'result-{n}.json').write_text(json.dumps({'job':j,'result':{'output_hint':str(source)}})+'\n')
done=sorted(int(p.stem) for p in (A/'records').glob('*.json') if p.stem.isdigit());progress=R/f'progress-{n}.tmp.json';progress.write_text(json.dumps({'total':375,'completed_count':len(done),'completed_ids':done,'remaining_count':375-len(done)},indent=2)+'\n');os.replace(progress,R/'progress.json')
print(json.dumps({'number':n,'name':j['name'],'kind':j['kind'],'native':native,'export':list(im.size)}))
