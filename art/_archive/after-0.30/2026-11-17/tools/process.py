from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps
import json,sys,os,hashlib,re,shutil,math,numpy as np
R=Path(__file__).parent;O=R/'delivery';A=O/'art/_archive/after-0.30/2026-11-17';jobs=json.loads((R/'jobs.json').read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();read=lambda p:json.loads(p.read_text())
def export(n,v=1):
 j=jobs[n-1];rawfile=R/f'result-{n}-v{v}.json';raw=read(rawfile);res=raw['result'];m=re.search(r'/workspace/[^\s]+\.png',res.get('output_hint',''));assert m,res;src=Path(m[0]);im=Image.open(src).convert('RGBA');native=list(im.size);source=A/'native-renders'/f'{j["file_key"]}-v{v}.png'
 if not source.exists():os.link(src,source)
 assert sha(source)==sha(src) and im.getchannel('A').getextrema()[0]==0
 crop=im.getchannel('A').getbbox();sub=im.crop(crop);scale=min(820/sub.width,820/sub.height,1)
 if j['kind']=='wick':
  ys,xs=np.where(np.array(sub.getchannel('A'))>0);radius=np.sqrt((xs-(sub.width-1)/2)**2+(ys-(sub.height-1)/2)**2).max();scale=min(scale,440/radius)
 sub=sub.resize((round(sub.width*scale),round(sub.height*scale)),Image.Resampling.LANCZOS);im=Image.new('RGBA',(1024,1024));offset=[(1024-sub.width)//2,(1024-sub.height)//2];im.alpha_composite(sub,offset);a=im.getchannel('A');im=Image.new('RGBA',im.size,(255,255,255,0));im.putalpha(a)
 r={**j,'refs':[str(Path(p).relative_to(O)) for p in j['refs']],'native_dimensions':native,'export_dimensions':[1024,1024],'source_path':source.relative_to(O).as_posix(),'source_sha256':sha(source),'generation_attempt':v,'export_crop':list(crop),'scale':scale,'offset':offset,'upscaled':False,'status':'draft-pending-visual-review','export_processing':'Aspect-preserving alpha framing, pure white RGB retaining source alpha, Lanczos downsample.'}
 save(r,im);rawfile.write_text(json.dumps({'result':{'output_hint':str(source)}})+'\n');print(json.dumps({'number':n,'native':native,'export':[1024,1024]}))
def save(r,im):
 dest=O/r['path'];dest.parent.mkdir(parents=True,exist_ok=True);im.save(dest,optimize=True);r['sha256']=sha(dest);r['exports']={};r['export_sha256']={}
 for s in [256,128,64,48,44,32,24,16]:
  a=im.getchannel('A').resize((s,s),Image.Resampling.LANCZOS);ex=Image.new('RGBA',(s,s),(255,255,255,0));ex.putalpha(a);p=dest.parent/'exports'/str(s)/dest.name;p.parent.mkdir(parents=True,exist_ok=True);ex.save(p,optimize=True);r['exports'][str(s)]=p.relative_to(O).as_posix();r['export_sha256'][str(s)]=sha(p)
 (A/'draft-records'/f'{r["number"]:02d}.json').write_text(json.dumps(r,indent=2)+'\n')
def mirror():
 r=read(A/'records/05.json');j=jobs[5];im=ImageOps.mirror(Image.open(O/r['path']));r={**r,**j,'refs':[str(Path(p).relative_to(O)) for p in j['refs']],'status':'draft-pending-visual-review','derived_exact_mirror_of':5,'render_type':'Exact horizontal mirror export of generated left-brain master; no independent native render','source_path':r['source_path'],'source_sha256':r['source_sha256'],'export_processing':'Explicit brief-requested exact horizontal mirror of left master, then Lanczos UI export.'};save(r,im)
def review(ids,name=None,refs=False):
 rows=([{'path':p,'name':Path(p).stem,'kind':'sign','number':i} for i,p in enumerate(sorted(set(str(Path(x).relative_to(O)) for j in jobs for x in j['refs'])))]) if refs else [read((A/'draft-records'/f'{i:02d}.json') if (A/'draft-records'/f'{i:02d}.json').exists() else A/'records'/f'{i:02d}.json') for i in ids]
 w,h=300,320;cols=min(4,len(rows));out=Image.new('RGB',(cols*w,math.ceil(len(rows)/cols)*h),'#10151f');d=ImageDraw.Draw(out);font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',12)
 for i,r in enumerate(rows):
  im=Image.open(O/r['path']).convert('RGBA');x=i%cols*w;y=i//cols*h;sm=im.resize((200,200),Image.Resampling.LANCZOS);out.paste(sm,(x+50,y),sm);d.text((x+10,y+201),f'{r["number"]:02d} '+r['name'][:34],font=font,fill='white')
  for k,s in enumerate([16,24,48] if r['kind']=='sign' else [32,44,64]):
   sm=im.resize((s,s),Image.Resampling.LANCZOS);out.paste(sm,(x+25+k*90,y+230+(64-s)//2),sm);d.text((x+25+k*90,y+298),str(s),font=font,fill='#b0bccf')
 dest=A/'review'/((name or 'batch-'+'-'.join(map(str,ids)))+'.jpg');out.save(dest,quality=95);print(str(dest))
def accept(ids):
 for i in ids:
  p=A/'draft-records'/f'{i:02d}.json';r=read(p);r.update(status='review-candidate',visual_review='Inspected charcoal preview and actual small sizes; assistant review only, production approval pending.');dest=A/'records'/p.name;assert not dest.exists();dest.write_text(json.dumps(r,indent=2)+'\n');p.unlink()
 print('Accepted',ids)
if __name__=='__main__':
 mode=sys.argv[1];ids=list(map(int,sys.argv[2:])) if mode not in ['refs','mirror'] else []
 if mode=='export':export(*ids)
 elif mode=='review':review(ids)
 elif mode=='refs':review([],name='reference-anchors',refs=True)
 elif mode=='accept':accept(ids)
 elif mode=='mirror':mirror()
