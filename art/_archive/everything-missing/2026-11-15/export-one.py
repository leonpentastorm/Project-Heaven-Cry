from pathlib import Path
from PIL import Image
import json,hashlib,os,sys
R=Path(__file__).parent; O=R/'delivery'; A='art/_archive/everything-missing/2026-11-15'
n=int(sys.argv[1]); j=next(x for x in json.loads((R/'jobs.json').read_text()) if x['number']==n)
r=json.loads((R/f'result-{n}.json').read_text())
oldrecord=O/A/'records'/f'{n:02d}.json'
if oldrecord.exists():
 prev=json.loads(oldrecord.read_text());j={k:prev.get(k,v) for k,v in j.items()}
j=r.get('job',j);hint=r['result'].get('output_hint','')
import re
m=re.search(r'/workspace/[^\s]+\.png',hint)
if not m:
 import base64
 data=r['result'].get('image_url','');assert data.startswith('data:image/png;base64,'),'No returned image data'
 recovered=R/'recovered-native';recovered.mkdir(exist_ok=True);src=recovered/f'{n:02d}.png';src.write_bytes(base64.b64decode(data.split(',',1)[1]))
else: src=Path(m[0])
im=Image.open(src); native=list(im.size); dest=O/j['path'];dest.parent.mkdir(parents=True,exist_ok=True)
source=O/A/'native-renders'/dest.name;source.parent.mkdir(parents=True,exist_ok=True)
if not source.exists(): os.link(src,source)
crop=(0,0,im.width,im.height)
if j['mode'] in ['ink','gear']:
 im=im.convert('RGBA');alpha=im.getchannel('A');assert alpha.getextrema()[0]==0,'Source has no transparent background'
 crop=im.getchannel('A').getbbox();assert crop,'Empty alpha mask'
 subject=im.crop(crop);subject.thumbnail((820,820),Image.Resampling.LANCZOS)
 im=Image.new('RGBA',(1024,1024));im.alpha_composite(subject,((1024-subject.width)//2,(1024-subject.height)//2))
 if j['mode']=='ink':
  alpha=im.getchannel('A');im=Image.new('RGBA',im.size,(255,255,255,0));im.putalpha(alpha)
else:
 im=im.convert('RGB');target=(800,1000) if j['mode']=='portrait' else (2560,1440)
 if j['mode']=='portrait':
  # Manual native eye midpoint estimates; use the deliberately added headroom for an aspect-preserving crop.
  ex,ey={46:(.45,.260),47:(.46,.287),48:(.46,.287)}[n];w,h=im.size;top=round((ey-.22)*h/.78);ch=h-top;cw=round(ch*.8);left=(w-cw)//2;crop=(left,top,left+cw,h);im=im.crop(crop)
 if j['mode']=='scene' and abs(im.width/im.height-16/9)>.01:
  w,h=im.size;ch=round(w*9/16);cw=round(h*16/9)
  crop=(0,(h-ch)//2,w,(h+ch)//2) if ch<=h else ((w-cw)//2,0,(w+cw)//2,h)
  im=im.crop(crop)
 im=im.resize(target,Image.Resampling.LANCZOS)
im.save(dest,optimize=True)
exports={}
if j['mode'] in ['gear','ink']:
 for s in ([256,128,64,32] if j['mode']=='gear' else [64,56,48,32,24]):
  p=dest.parent/'exports'/str(s)/dest.name;p.parent.mkdir(parents=True,exist_ok=True);small=im.resize((s,s),Image.Resampling.LANCZOS)
  if j['mode']=='ink':
   a=small.getchannel('A');small=Image.new('RGBA',small.size,(255,255,255,0));small.putalpha(a)
  small.save(p,optimize=True);exports[str(s)]=str(p.relative_to(O))
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
record={**j,'status':'review-candidate','production_approved':False,'native_dimensions':native,'export_dimensions':list(im.size),'source_path':str(source.relative_to(O)),'source_sha256':sha(source),'sha256':sha(dest),'exports':exports,'upscaled':native[0]<im.width or native[1]<im.height,'export_processing':'Lanczos resize; white RGB standardized preserving generated alpha' if j['mode']=='ink' else 'Lanczos resize; no repaint or added detail'}
p=O/A/'records'/f'{n:02d}.json';p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(record,indent=2)+'\n')
record['export_crop']=list(crop)
if j['mode'] in ['ink','gear']:record['export_processing']='Alpha-bounds crop and aspect-preserving fit inside central 820px of 1024px canvas; Lanczos UI exports; pure-white RGB enforced preserving generated alpha' if j['mode']=='ink' else 'Alpha-bounds crop and aspect-preserving fit inside central 820px of 1024px canvas; Lanczos UI exports'
elif j['mode']=='scene':record['export_processing']='Aspect-preserving central 16:9 crop when native ratio differs, then Lanczos upscale; no added detail'
elif j['mode']=='portrait':
 record['eye_line']={'x':round((ex*native[0]-crop[0])/(crop[2]-crop[0]),3),'y':round((ey*native[1]-crop[1])/(crop[3]-crop[1]),3)};record['eye_line_method']='Manual estimate on native render, transformed through recorded export crop';record['export_processing']='Aspect-preserving portrait crop using painted headroom to align estimated eye midpoint to 22%; Lanczos downsample'
p.write_text(json.dumps(record,indent=2)+'\n')
(R/f'result-{n}.json').write_text(json.dumps({'number':n,'result':{'output_hint':str(source),'recovered_from_returned_base64':not bool(m)}})+'\n')
print(json.dumps({k:record[k] for k in ['number','path','native_dimensions','export_dimensions','upscaled']}))
