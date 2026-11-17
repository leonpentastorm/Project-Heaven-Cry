from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,math,sys
R=Path(__file__).parent;O=R/'delivery';A=O/'art/_archive/nine-doors/2026-11-16';ids=[int(x) for x in sys.argv[1:]];rows=[json.loads((A/'records'/f'{n:03d}.json').read_text()) for n in ids if (A/'records'/f'{n:03d}.json').exists()]
if rows:
 cols=min(3,len(rows));w,h=300,310;out=Image.new('RGB',(w*cols,math.ceil(len(rows)/cols)*h),'#10151f');d=ImageDraw.Draw(out);font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',12)
 for i,r in enumerate(rows):
  x=i%cols*w;y=i//cols*h;im=Image.open(O/r.get('review_path',r['path'])).convert('RGBA');sm=im.copy();sm.thumbnail((270,205));out.paste(sm,(x+(w-sm.width)//2,y+5),sm);d.text((x+8,y+215),f"{r['number']:03d} {r['name']}"[:38],font=font,fill='white')
  for dx,size in ([(10,24),(70,48)] if r['kind']=='sign' else [(10,32),(70,44)]):
   sm=im.resize((size,size),Image.Resampling.LANCZOS);out.paste(sm,(x+dx,y+250),sm);d.text((x+dx,y+295),str(size),font=font,fill='#a3aec2')
 p=A/'review'/('batch-'+'-'.join(str(n) for n in ids)+'.jpg');p.parent.mkdir(exist_ok=True);out.save(p,quality=94);print(str(p))
done=sorted(int(p.stem) for p in (A/'records').glob('*.json') if p.stem.isdigit());(R/'progress.json').write_text(json.dumps({'total':375,'completed_count':len(done),'completed_ids':done,'remaining_count':375-len(done)},indent=2)+'\n')
