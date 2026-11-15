from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,math
R=Path(__file__).parent;O=R/'delivery';A=O/'art/_archive/everything-missing/2026-11-15';recs=[json.loads(p.read_text()) for p in sorted((A/'records').glob('*.json'))]
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',13)
for section,lo,hi in [('A-gear',1,8),('B-materials',9,13),('C-boons',14,42),('D-markers',43,45),('E1-keepers',46,48),('E2-places',49,60),('F-interface',61,65),('G-mode-card',66,66)]:
 rows=[r for r in recs if lo<=r['number']<=hi]
 if not rows:continue
 w=330 if rows[0]['mode'] in ['ink','gear'] else 420;h=320 if w==330 else 300;cols=min(4,len(rows));out=Image.new('RGB',(cols*w,math.ceil(len(rows)/cols)*h),'#10151f');d=ImageDraw.Draw(out)
 for i,r in enumerate(rows):
  x=i%cols*w;y=i//cols*h;im=Image.open(O/r['path']).convert('RGBA');im.thumbnail((w-30,h-90));out.paste(im,(x+12,y+8),im);d.text((x+12,y+h-70),str(r['number'])+' '+Path(r['path']).stem,font=font,fill='white')
  sizes=[24,56] if r['mode']=='ink' else [32,40,64,72] if r['mode']=='gear' else []
  sx=x+12
  for s in sizes:
   sm=Image.open(O/r['path']).convert('RGBA').resize((s,s),Image.Resampling.LANCZOS);out.paste(sm,(sx,y+h-50),sm);sx+=s+12
  if r['mode']=='scene':
   # Additional darkened UI preview: exact 40% exposure is a mechanical display test.
   sm=Image.open(O/r['path']).convert('RGB').resize((140,79));sm=sm.point(lambda v:round(v*.4));out.paste(sm,(x+w-152,y+h-90))
 (A/'review').mkdir(exist_ok=True);out.save(A/'review'/f'{section}.jpg',quality=94)
print('Updated review sheets for',len(recs),'completed candidates')
