from pathlib import Path
from PIL import Image
import json,hashlib,base64,re,sys,os,shutil,numpy as np
R=Path(__file__).parent;O=R/'delivery';A=O/'art/_archive/nine-doors/2026-11-16';i=int(sys.argv[1]);v=int(sys.argv[2]) if len(sys.argv)>2 else 1;rawfile=R/f'new-result-{i}-v{v}.json';raw=json.loads(rawfile.read_text());j=raw['job'];res=raw['result'];m=re.search(r'/workspace/[^\s]+\.png',res.get('output_hint',''))
if m:src=Path(m[0])
else:
 data=res.get('image_url','');assert data.startswith('data:image/png;base64,');src=R/f'generated-{j["file_key"]}-v{v}.png';src.write_bytes(base64.b64decode(data.split(',',1)[1]))
im=Image.open(src).convert('RGBA');native=list(im.size);source=A/'native-renders-0.30'/f'{j["file_key"]}-v{v}.png';source.parent.mkdir(exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
if source.exists():assert sha(source)==sha(src)
else:
 try:os.link(src,source)
 except OSError:shutil.copy2(src,source)
assert im.getchannel('A').getextrema()[0]==0;crop=im.getchannel('A').getbbox();assert crop;sub=im.crop(crop);mask=np.array(sub.getchannel('A'));ys,xs=np.where(mask>0);radius=float(np.sqrt((xs-(sub.width-1)/2)**2+(ys-(sub.height-1)/2)**2).max());scale=min(820/sub.width,820/sub.height,440/radius,1) if j['kind']=='wick' else min(820/sub.width,820/sub.height,1);sub=sub.resize((round(sub.width*scale),round(sub.height*scale)),Image.Resampling.LANCZOS);offset=[(1024-sub.width)//2,(1024-sub.height)//2];im=Image.new('RGBA',(1024,1024));im.alpha_composite(sub,tuple(offset))
if j['kind'] in ['wick','sign']:
 a=im.getchannel('A');im=Image.new('RGBA',im.size,(255,255,255,0));im.putalpha(a)
dest=O/j['path'];dest.parent.mkdir(parents=True,exist_ok=True);im.save(dest,optimize=True);exports={};hashes={}
for s in ([256,128,64,32,44,48,24] if j['kind']=='gear' else [128,64,48,44,32,24]):
 ex=im.resize((s,s),Image.Resampling.LANCZOS)
 if j['kind'] in ['wick','sign']:
  a=ex.getchannel('A');ex=Image.new('RGBA',ex.size,(255,255,255,0));ex.putalpha(a)
 p=dest.parent/'exports'/str(s)/dest.name;p.parent.mkdir(parents=True,exist_ok=True);ex.save(p,optimize=True);exports[str(s)]=p.relative_to(O).as_posix();hashes[str(s)]=sha(p)
def portable(p):
 try:return Path(p).relative_to(O).as_posix()
 except ValueError:return 'art/_archive/nine-doors/2026-11-16/references-0.30/'+Path(p).name
record={**j,'recipe_index':i,'generation_attempt':v,'refs':[portable(p) for p in j['refs']],'generation_references':[portable(p) for p in j['refs']],'status':'draft-pending-visual-review','production_approved':False,'implementation_ready':False,'native_dimensions':native,'export_dimensions':[1024,1024],'sha256':sha(dest),'source_path':source.relative_to(O).as_posix(),'source_sha256':sha(source),'export_crop':list(crop),'exports':exports,'export_sha256':hashes,'framing':{'scale':scale,'offset':offset,'subject_box':820,'perk_safe_radius':460.8 if j['kind']=='wick' else None},'upscaled':False,'export_processing':'Aspect-preserving alpha-bounds framing, Lanczos RGBA/UI export; pure-white RGB retaining alpha for ink modes.'}
draft=A/'draft-records-0.30';draft.mkdir(exist_ok=True);(draft/(j['file_key']+'.json')).write_text(json.dumps(record,indent=2)+'\n');rawfile.write_text(json.dumps({'job':j,'result':{'output_hint':str(source)}},indent=2)+'\n');print(json.dumps({'index':i,'key':j['request_key'],'native':native,'export':[1024,1024],'awaits_visual_review':True}))
