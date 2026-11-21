"""Technical reference contact strip only; no new artwork or path changes."""
from pathlib import Path
import json,hashlib
from PIL import Image
ROOT=Path(__file__).resolve().parents[4]
A=Path(__file__).resolve().parent
paths=['art/sprites/objects/fuel-drum.png','art/sprites/objects/tool-rack.png','art/sprites/objects/field-lamp.png']
ims=[Image.open(ROOT/p).convert('RGBA') for p in paths]
width=sum(im.width for im in ims);height=max(im.height for im in ims)
sheet=Image.new('RGB',(width,height),'#10151F');x=0
for im in ims:sheet.paste(im,(x,(height-im.height)//2),im);x+=im.width
out=A/'references/material-anchors.png';sheet.save(out)
record={'operation':'Native-size contact strip; original RGB/alpha source files unchanged, no crop or rescale. Original transparency composited on #10151F for reference viewing only. Count0.','source_hashes':{p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in paths},'packed_path':str(out.relative_to(ROOT)),'packed_sha256':hashlib.sha256(out.read_bytes()).hexdigest()}
(A/'references/material-packing.json').write_text(json.dumps(record,indent=2)+'\n')
p=A/'queue.json';q=json.loads(p.read_text())
for j in q:
    j['unpacked_required_references']=j['references'].copy();j['unpacked_reference_hashes']=j['expected_reference_hashes'].copy()
    j['references']=[r for r in j['references'] if r not in paths]+[record['packed_path']]
    assert len(j['references'])<=5
    j['reference_sources']=list(dict.fromkeys(j['reference_sources']+paths))
    j['expected_reference_hashes']={r:hashlib.sha256((ROOT/r).read_bytes()).hexdigest() for r in j['references']}
    j['reference_packing']=record
p.write_text(json.dumps(q,indent=2)+'\n')
print(json.dumps({'reference_only_count':0,'packed_size':[width,height],'all_original_anchors_retained':True,'request_reference_counts':[len(j['references']) for j in q]}))
