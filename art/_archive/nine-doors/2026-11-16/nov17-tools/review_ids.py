from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import sys,json,numpy as np
root=Path(__file__).parent/'delivery';arc=root/'art/_archive/nine-doors/2026-11-16';ids=[int(n) for n in sys.argv[1:]]
rows=[json.loads((arc/'records'/f'{n:03d}.json').read_text()) for n in ids]
cols=min(3,len(rows));out=Image.new('RGB',(cols*350,((len(rows)+cols-1)//cols)*390),'#10151F');d=ImageDraw.Draw(out);font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',13)
for i,r in enumerate(rows):
 im=Image.open(root/r['path']).convert('RGBA');alpha=np.array(im.getchannel('A'));ratio=float(((alpha>=9)&(alpha<=119)).sum()/max(1,(alpha>=250).sum()));assert ratio<.15,(r['number'],ratio)
 assert im.convert('RGB').getextrema()==((255,255),)*3
 x=(i%cols)*350;y=(i//cols)*390
 sm=im.resize((256,256),Image.Resampling.LANCZOS);out.paste(sm,(x+47,y+5),sm)
 d.text((x+15,y+272),f'{r["number"]:03d} {r["name"]}',fill='white',font=font)
 sizes=[20,24,48] if r['family']=='door_emblems' else [24,48,64] if r['kind']=='sign' else [32,44,64]
 for k,size in enumerate(sizes):
  sm=im.resize((size,size),Image.Resampling.LANCZOS);out.paste(sm,(x+30+k*95,y+310+(64-size)//2),sm);d.text((x+30+k*95,y+375),str(size),fill='white',font=font)
 print(r['number'],'faint-alpha',round(ratio,5))
path=arc/'review'/('continuation-'+'-'.join(str(n) for n in ids)+'.jpg');out.save(path,quality=96);print(path)
