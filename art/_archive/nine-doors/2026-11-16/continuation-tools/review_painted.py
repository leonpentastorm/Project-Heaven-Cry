from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,sys,math
r=(Path(__file__).parent/'delivery').resolve();a=r/'art/_archive/nine-doors/2026-11-16';ids=list(map(int,sys.argv[1:]));rows=[json.loads((a/'records'/f'{n:03}.json').read_text()) for n in ids];cols=min(3,len(rows));out=Image.new('RGB',(cols*360,math.ceil(len(rows)/cols)*520),'#10151F');d=ImageDraw.Draw(out);font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',14)
for i,rec in enumerate(rows):
 im=Image.open(r/rec['path']);x=i%cols*360;y=i//cols*520
 if rec['kind']=='gear':
  im=im.convert('RGBA');sm=im.resize((320,320),Image.Resampling.LANCZOS);out.paste(sm,(x+20,y+10),sm)
  for j,size in enumerate([32,64,128]):
   sm=im.resize((size,size),Image.Resampling.LANCZOS);out.paste(sm,(x+15+j*110,y+360+(128-size)//2),sm);d.text((x+15+j*110,y+495),str(size),fill='white',font=font)
 else:
  sm=im.convert('RGB').resize((320,400),Image.Resampling.LANCZOS);out.paste(sm,(x+20,y+10));d.line((x+5,y+98,x+17,y+98),fill='#EB95B7',width=2);d.text((x+20,y+430),'4:5 / 800 x 1000; eye-line guide at22%',fill='#CBD0DB',font=font)
 d.text((x+20,y+412 if rec['kind']!='gear' else y+335),f'{rec["number"]} {rec["name"]}',fill='white',font=font)
p=a/'review'/('continuation-painted-'+'-'.join(map(str,ids))+'.jpg');out.save(p,quality=97);print(p)
