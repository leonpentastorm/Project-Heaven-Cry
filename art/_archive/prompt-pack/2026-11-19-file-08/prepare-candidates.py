import hashlib,json
from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np
A=Path(__file__).resolve().parent.relative_to(Path.cwd().resolve())
def stem(ident):return ident if ident.startswith(('shield-','armour-','focus-','quiver-')) else 'weapon-'+ident
ids=('katana','combat_knife','sabre','legion_gladius','recurve_bow','longbow','drifter_revolver','crossbow','repeating_crossbow','shield-buckler','shield-riot_shield','shield-pavise')
tiers=('fine','masterwork','relic','celestial')
manifest=[]
out=Image.new('RGB',(840,150*len(ids)),'#10151F')
d=ImageDraw.Draw(out)
def maskbox(im):
 return im.getchannel('A').point(lambda v:255 if v>=128 else 0).getbbox()
for r,ident in enumerate(ids):
 standard=Image.open(f'art/icons/gear/{stem(ident)}.png').convert('RGBA')
 b=maskbox(standard)
 for c,tier in enumerate(('standard',*tiers)):
  im=standard
  if tier!='standard':
   src=A/'drafts'/f'{stem(ident)}--{tier}.png'
   if tier=='fine' and (A/'drafts'/f'{stem(ident)}--fine-retry.png').exists():src=A/'drafts'/f'{stem(ident)}--fine-retry.png'
   if not src.exists():
    d.text((c*168+8,r*150+50),'Pending',fill='#AAAAAA')
    continue
   native=Image.open(src).convert('RGBA');g=maskbox(native)
   scale=min((b[2]-b[0])/(g[2]-g[0]),(b[3]-b[1])/(g[3]-g[1]))
   small=native.resize(tuple(round(v*scale) for v in native.size),Image.Resampling.LANCZOS)
   pos=tuple(round((b[k]+b[k+2]-scale*(g[k]+g[k+2]))/2) for k in range(2))
   im=Image.new('RGBA',(1024,1024));im.paste(small,pos)
   dest=A/'candidate-masters'/f'{stem(ident)}--{tier}.png';dest.parent.mkdir(exist_ok=True)
   im.save(dest,optimize=True)
   x=np.asarray(standard.resize((64,64)).getchannel('A'))>=128
   y=np.asarray(im.resize((64,64)).getchannel('A'))>=128
   manifest.append(dict(id=ident,tier=tier,source=src.as_posix(),candidate=dest.as_posix(),size64_mask_differing_pixels=int((x^y).sum()),sha256=hashlib.sha256(dest.read_bytes()).hexdigest()))
  px=c*168+8;py=r*150
  d.text((px,py+4),ident+' '+tier,fill='white')
  for xx,size in ((0,100),(106,32)):
   v=im.resize((size,size),Image.Resampling.LANCZOS);out.paste(v,(px+xx,py+30),v)
out.save(A/'review/finish-candidates-small.jpg',quality=95)
(A/'candidate-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print([(m['id'],m['tier'],m['size64_mask_differing_pixels']) for m in manifest])
