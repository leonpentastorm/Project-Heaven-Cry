from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,math
R=Path(__file__).parent;O=R/'delivery';A=O/'art/_archive/figments/2026-11-15';records=[json.loads(p.read_text()) for p in sorted((A/'records').glob('*.json'))];(A/'review').mkdir(exist_ok=True)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',12)
for mode in ['portrait','ink']:
 rows=[r for r in records if r['mode']==mode]
 if not rows:continue
 w,h=(410,540) if mode=='portrait' else (270,340);cols=min(4,len(rows));out=Image.new('RGB',(w*cols,h*math.ceil(len(rows)/cols)),'#10151f');d=ImageDraw.Draw(out)
 for i,r in enumerate(rows):
  x=i%cols*w;y=i//cols*h;im=Image.open(O/r['path']).convert('RGBA');sm=im.copy();sm.thumbnail((w-20,h-200));out.paste(sm,(x+(w-sm.width)//2,y+5),sm);d.text((x+10,y+h-170),f"{r['number']:02d}  {r['name']}",font=font,fill='white')
  if mode=='portrait':
   sx=x+10
   for s in [40,64,128]:
    token=im.crop((120,200,680,760)).resize((s,s),Image.Resampling.LANCZOS);m=Image.new('L',(s,s));ImageDraw.Draw(m).ellipse((0,0,s-1,s-1),fill=255);out.paste(token,(sx,y+h-145),m);sx+=s+12
  else:
   for dx,s in [(10,32),(60,64),(140,128)]:
    t=im.resize((s,s),Image.Resampling.LANCZOS);out.paste(t,(x+dx,y+h-140),t)
 out.save(A/'review'/f'{mode}s.jpg',quality=94)
print('Review sheets:',len(records),'candidates')
