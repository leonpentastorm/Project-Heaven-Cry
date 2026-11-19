import hashlib,json,sys,shutil
from pathlib import Path
from PIL import Image
A=Path(__file__).parent
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
rows=json.loads((A/'candidate-manifest.json').read_text())
ident,tier=sys.argv[1:]
row=next(r for r in rows if (r['id'],r['tier'])==(ident,tier))
catalog=Path('art/catalog.json');c=json.loads(catalog.read_text())
stem=f'weapon-{ident}--{tier}';target=Path('art/icons/gear')/(stem+'.png')
assert stem not in c['gear'] and not target.exists()
shutil.copy2(row['candidate'],target)
im=Image.open(target).convert('RGBA');exports={}
for size in (256,128,64,32):
 out=target.parent/'exports'/str(size)/target.name
 out.parent.mkdir(parents=True,exist_ok=True)
 thumb=im.resize((size,size),Image.Resampling.LANCZOS)
 guard=Image.new('RGBA',(size,size))
 guard.alpha_composite(im.resize((size-2,size-2),Image.Resampling.LANCZOS),(1,1))
 alpha=thumb.getchannel('A');box=alpha.getbbox()
 if min(box[0],box[1],size-box[2],size-box[3])==0:thumb=guard
 thumb.save(out,optimize=True);exports[str(size)]=out.as_posix()
c['gear'][stem]=dict(label=ident.replace('_',' ').title()+' '+tier.title(),path=target.as_posix(),sha256=sha(target),width=1024,height=1024,background='transparent',status='review-candidate',production_approved=False,implementation_ready=False,grade=tier,standard_path=f'art/icons/gear/weapon-{ident}.png',source_path=row['source'],native_dimensions=list(Image.open(row['source']).size),exports=exports,collection='nov19-grade-candidates',review_notes='Finish proof retained after visual review at inventory size. Exact alpha differs from Standard. See shape measurements and combined proof sheet.')
if ident in ('recurve_bow','longbow'):
 c['gear'][stem]['review_notes'] += ' Bow fittings and limb contours drift, particularly the Longbow upper fitting; artistic approval and an exact-outline pass remain pending.'
catalog.write_text(json.dumps(c,indent=2,ensure_ascii=False)+'\n')
dest=A/'delivered';dest.mkdir(exist_ok=True)
row.update(path=target.as_posix(),exports=exports,source_sha256=sha(Path(row['source'])))
(dest/(stem+'.json')).write_text(json.dumps(row,indent=2)+'\n')
print('Registered',stem)
