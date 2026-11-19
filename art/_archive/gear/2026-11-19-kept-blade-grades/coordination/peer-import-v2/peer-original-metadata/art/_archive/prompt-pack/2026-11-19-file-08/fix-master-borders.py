"""Technical one-pixel frame correction; preserve prior candidate bytes."""
import hashlib,json,shutil
from pathlib import Path
from PIL import Image
A=Path(__file__).resolve().parent.relative_to(Path.cwd().resolve())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
manifest=json.loads((A/'candidate-manifest.json').read_text())
cp=Path('art/catalog.json');catalog=json.loads(cp.read_text())
for stem in ('shield-buckler--relic','shield-buckler--celestial','shield-pavise--celestial'):
 asset=catalog['gear'][stem];target=Path(asset['path'])
 row=next(r for r in manifest if Path(r['candidate']).stem==stem)
 archive=A/'border-revisions'/stem;archive.mkdir(parents=True,exist_ok=True)
 old=archive/target.name;assert not old.exists();shutil.copy2(target,old)
 original=dict(asset)
 for size,path in asset['exports'].items():
  dest=archive/'exports'/size/Path(path).name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(path,dest)
 (archive/'previous-catalog.json').write_text(json.dumps(original,indent=2)+'\n')
 shutil.copy2(row['candidate'],target)
 im=Image.open(target).convert('RGBA')
 for size,path in asset['exports'].items():
  n=int(size);thumb=im.resize((n,n),Image.Resampling.LANCZOS);box=thumb.getchannel('A').getbbox()
  if min(box[0],box[1],n-box[2],n-box[3])==0:
   thumb=Image.new('RGBA',(n,n));thumb.alpha_composite(im.resize((n-2,n-2),Image.Resampling.LANCZOS),(1,1))
  thumb.save(path,optimize=True)
 asset['sha256']=sha(target);asset['previous_path']=old.as_posix()
 asset['review_notes']+=' One-pixel transparent frame guard removes edge contact by alpha-1 residue; prior candidate bytes and exports retained in border-revisions.'
 record=A/'delivered'/(stem+'.json');oldrecord=json.loads(record.read_text())
 (archive/'previous-delivery.json').write_text(json.dumps(oldrecord,indent=2)+'\n')
 oldrecord.update(row);oldrecord['previous_path']=old.as_posix()
 record.write_text(json.dumps(oldrecord,indent=2)+'\n')
 print('Corrected',stem)
cp.write_text(json.dumps(catalog,indent=2,ensure_ascii=False)+'\n')
