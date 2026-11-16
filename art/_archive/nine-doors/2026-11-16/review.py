from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,math,re
R=Path(__file__).parent;O=R/'delivery';A=O/'art/_archive/nine-doors/2026-11-16';rows=[json.loads(p.read_text()) for p in sorted((A/'records').glob('*.json'))];(A/'review').mkdir(exist_ok=True);font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',12)
def sheet(records,name,cols=4):
 if not records:return
 cols=min(cols,len(records));w,h=280,310;out=Image.new('RGB',(cols*w,math.ceil(len(records)/cols)*h),'#10151f');d=ImageDraw.Draw(out)
 for i,r in enumerate(records):
  x=i%cols*w;y=i//cols*h;im=Image.open(O/r.get('review_path',r['path'])).convert('RGBA');sm=im.copy();sm.thumbnail((250,205));out.paste(sm,(x+(w-sm.width)//2,y+5),sm);d.text((x+8,y+215),f"{r['number']:03d} {r['name']}"[:35],font=font,fill='white')
  for dx,size in [(10,32),(70,44)]:
   sm=im.resize((size,size),Image.Resampling.LANCZOS);out.paste(sm,(x+dx,y+250),sm);d.text((x+dx,y+295),str(size),font=font,fill='#a3aec2')
 out.save(A/'review'/name,quality=94)
sections=list(dict.fromkeys(r['section'] for r in json.loads((R/'rows.json').read_text())))
for i,section in enumerate(sections):
 recs=[r for r in rows if r['section']==section];slug=re.sub('[^a-z0-9]+','-',section.lower()).strip('-');sheet(recs,f'{i+1:02d}-{slug}.jpg')
sheet([r for r in rows if 'shows the OLD' in r['state']],'ALPHA-18.jpg',6)
sheet([r for r in rows if r['number'] in [137,251]],'VISIBLE-EXTRAS-02.jpg',2)
print('Reviewed exports:',len(rows),'of 375')
