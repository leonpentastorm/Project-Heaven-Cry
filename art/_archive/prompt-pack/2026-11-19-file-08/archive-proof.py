import json,shutil,hashlib
from pathlib import Path
from PIL import Image,ImageDraw
A=Path(__file__).resolve().parent.relative_to(Path.cwd().resolve())
def stem(ident):return ident if ident.startswith(('shield-','armour-','focus-','quiver-')) else 'weapon-'+ident
m=json.loads(Path('/workspace/work/prompt-pack-08/current-grade.json').read_text())
m['refs']=[Path(p).resolve().relative_to(Path.cwd().resolve()).as_posix() for p in m['refs']]
dest=A/'drafts'/f"{stem(m['id'])}--{m['tier']}.png"
assert not dest.exists(),dest
shutil.copy2(m['src'],dest)
m['src']=dest.as_posix()
m['sha256']=hashlib.sha256(dest.read_bytes()).hexdigest()
dest.with_suffix('.json').write_text(json.dumps(m,indent=2)+'\n')
ids=tuple(dict.fromkeys(('katana','drifter_revolver',*[json.loads(p.read_text())['id'] for p in sorted((A/'drafts').glob('*.json')) if 'id' in json.loads(p.read_text())])))
tiers=('standard','fine','masterwork','relic','celestial')
out=Image.new('RGB',(1000,235*len(ids)),'#10151F')
d=ImageDraw.Draw(out)
for r,ident in enumerate(ids):
 for c,tier in enumerate(tiers):
  p=Path(f'art/icons/gear/{stem(ident)}.png') if tier=='standard' else A/'drafts'/f'{stem(ident)}--{tier}.png'
  if tier=='fine' and (A/'drafts'/f'{stem(ident)}--fine-retry.png').exists():p=A/'drafts'/f'{stem(ident)}--fine-retry.png'
  d.text((c*200+10,r*235+4),ident+' '+tier,fill='white')
  if p.exists():
   im=Image.open(p).convert('RGBA');im.thumbnail((190,190),Image.Resampling.LANCZOS)
   out.paste(im,(c*200+(200-im.width)//2,r*235+25),im)
out.save(A/'review/complete-proof-progress.jpg',quality=95)
paths=list((A/'drafts').glob('*.png'))
(A/'PROGRESS.md').write_text('# Grade proof progress\n\n'+str(len(list((A/'delivered').glob('*.json'))))+' registered review-candidate masters. '+str(len(paths))+' archived PNG attempts, including earlier Fine trials. The composite shows the current candidate for each finish.\n\n[Proof progress](review/complete-proof-progress.jpg) · [Inventory sizes](review/finish-candidates-small.jpg) · [Claims](WORK-CLAIMS.md) · [Handoff](HANDOFF.md)\n')
print(dest)
