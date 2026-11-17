from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,sys,math,numpy as np
R=Path(__file__).parent;O=R/'delivery';A=O/'art/_archive/nine-doors/2026-11-16';ids=list(map(int,sys.argv[1:]));jobs=json.loads((R/'new-jobs.json').read_text());rows=[]
for i in ids:
 j=jobs[i];draft=A/'draft-records-0.30'/(j['file_key']+'.json');active=A/'records-0.30'/(j['file_key']+'.json');p=draft if draft.exists() else active
 if p.exists():rows.append(json.loads(p.read_text()))
assert rows;cols=min(4,len(rows));w,h=330,390;out=Image.new('RGB',(cols*w,math.ceil(len(rows)/cols)*h),'#10151f');d=ImageDraw.Draw(out);font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',13)
for i,r in enumerate(rows):
 im=Image.open(O/r['path']).convert('RGBA');x=i%cols*w;y=i//cols*h;sm=im.resize((280,280),Image.Resampling.LANCZOS);out.paste(sm,(x+25,y),sm);d.text((x+12,y+279),f'{r["recipe_index"]:02d}  {r["name"]}',font=font,fill='white');sizes=[24,48,64] if r['kind']=='sign' else [32,44,64]
 if r['kind'] in ['wick','sign']:
  a=np.array(im.getchannel('A'));ratio=float(((a>=9)&(a<=119)).sum()/max(1,(a>=250).sum()));assert ratio<.15,(r['name'],ratio);d.text((x+12,y+298),f'alpha ratio {ratio:.3f}',font=font,fill='#a3aec2')
 for k,s in enumerate(sizes):
  sm=im.resize((s,s),Image.Resampling.LANCZOS);out.paste(sm,(x+25+k*95,y+320+(64-s)//2),sm);d.text((x+25+k*95,y+373),str(s),font=font,fill='#a3aec2')
dest=A/'review'/('v030-'+ '-'.join(map(str,ids))+'.jpg');out.save(dest,quality=96);print(str(dest))
