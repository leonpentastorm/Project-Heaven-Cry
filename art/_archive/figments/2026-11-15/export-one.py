from pathlib import Path
from PIL import Image
import numpy as np
import json,hashlib,os,re,sys,base64
R=Path(__file__).parent;O=R/'delivery';ARC='art/_archive/figments/2026-11-15';A=O/ARC
n=int(sys.argv[1]);data=json.loads((R/f'result-{n}.json').read_text());j=data['job'];result=data['result'];hint=result.get('output_hint','');m=re.search(r'/workspace/[^\s]+\.png',hint)
if m:src=Path(m[0])
else:
 raw=result.get('image_url','');assert raw.startswith('data:image/png;base64,');src=R/f'recovered-{n}.png';src.write_bytes(base64.b64decode(raw.split(',',1)[1]))
im=Image.open(src);native=list(im.size);dest=O/j['path'];dest.parent.mkdir(parents=True,exist_ok=True);source=A/'native-renders'/dest.name;source.parent.mkdir(parents=True,exist_ok=True)
if not source.exists():os.link(src,source)
exports={};crop=[0,0,im.width,im.height]
if j['mode']=='ink':
 im=im.convert('RGBA');a=im.getchannel('A');assert a.getextrema()[0]==0,'No transparency';crop=a.getbbox();assert crop
 subject=im.crop(crop);subject.thumbnail((820,820),Image.Resampling.LANCZOS);im=Image.new('RGBA',(1024,1024));im.alpha_composite(subject,((1024-subject.width)//2,(1024-subject.height)//2));a=im.getchannel('A');im=Image.new('RGBA',im.size,(255,255,255,0));im.putalpha(a)
else:
 im=im.convert('RGB');arr=np.array(im);ys,xs=np.where(arr.max(2)>4);assert len(xs),'Empty Figment'
 cx=(xs.min()+xs.max())/2;cy=(ys.min()+ys.max())/2;radius=float(np.sqrt((xs-cx)**2+(ys-cy)**2).max());scale=248/radius
 crop=[max(0,int(xs.min())-4),max(0,int(ys.min())-4),min(im.width,int(xs.max())+5),min(im.height,int(ys.max())+5)]
 sub=im.crop(crop);sub=sub.resize((round(sub.width*scale),round(sub.height*scale)),Image.Resampling.LANCZOS)
 offset=[round(400-(cx-crop[0])*scale),round(480-(cy-crop[1])*scale)];im=Image.new('RGB',(800,1000),'black');im.paste(sub,tuple(offset))
temp=dest.with_suffix('.tmp.png');im.save(temp,optimize=True);os.replace(temp,dest)
if j['mode']=='ink':
 for s in [128,64,32]:
  p=dest.parent/'exports'/str(s)/dest.name;p.parent.mkdir(parents=True,exist_ok=True);small=im.resize((s,s),Image.Resampling.LANCZOS);a=small.getchannel('A');small=Image.new('RGBA',small.size,(255,255,255,0));small.putalpha(a);small.save(p,optimize=True);exports[str(s)]=str(p.relative_to(O))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
record={**j,'status':'review-candidate','production_approved':False,'implementation_ready':False,'native_dimensions':native,'export_dimensions':list(im.size),'sha256':sha(dest),'source_path':str(source.relative_to(O)),'source_sha256':sha(source),'exports':exports,'export_crop':list(crop),'upscaled':False,'export_processing':'Lanczos resize' if j['mode']=='portrait' else 'Alpha-bounds crop, aspect-preserving fit to central 820px safe box; pure-white RGB preserving generated alpha; Lanczos exports'}
if j['mode']=='portrait':record.update(export_processing='Aspect-preserving crop/scale/placement on pure black to fit complete painted silhouette inside round-token safe area; no repaint',framing={'threshold':4,'scale':scale,'offset':offset,'token_center':[400,480],'token_radius':280,'paint_radius_target':248},token_crop=[120,200,680,760])
p=A/'records'/f'{n:02d}.json';p.parent.mkdir(parents=True,exist_ok=True);tmp=p.with_suffix('.tmp.json');tmp.write_text(json.dumps(record,indent=2)+'\n');os.replace(tmp,p);(R/f'result-{n}.json').write_text(json.dumps({'job':j,'result':{'output_hint':str(source)}})+'\n')
print(json.dumps({k:record[k] for k in ['number','path','native_dimensions','export_dimensions']}))
