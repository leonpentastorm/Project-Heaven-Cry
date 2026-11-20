"""Validate archived provenance, catalog binding and actual 256px tile joins."""
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image

root=Path(__file__).resolve().parents[4]
base=Path(__file__).resolve().parent
record=json.loads((base/'selected/013-v1/delivery.json').read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
checksums={p:h for h,p in (s.split('  ',1) for s in (root/'art/checksums.sha256').read_text().splitlines())}
records=[record[k] for k in ['production','source','prompt','master','previous','join_review']]+list(record['exports'].values())
for reference in record['references']:
    records.extend(reference.values())
for item in records:
    assert sha(root/item['path'])==item['sha256']==checksums[item['path']],item['path']
assert record['previous']['sha256']==record['job']['original_sha256']
catalog=json.loads((root/'art/catalog.json').read_text())
for family,key in [('survival_art','survival-k188'),('kit','kit-rim-wall-corner')]:
    entry=catalog[family][key]
    assert entry['path']==record['production']['path']
    assert entry['sha256']==record['production']['sha256']
    assert entry['source_path']==record['source']['path']
    assert entry['previous_path']==record['previous']['path']
    assert entry['status']=='review-candidate'
    assert entry['production_approved'] is entry['implementation_ready'] is False
im=Image.open(root/record['production']['path']);assert im.mode=='RGBA' and im.size==(256,256)
a=np.array(im.getchannel('A'))>=127
s=np.array(Image.open(root/'art/sprites/kit/rim/wall-straight.png').getchannel('A'))>=127
assert np.array_equal(a[:,0],s[:,-1]) and np.array_equal(a[-1],s[:,0])
assert not a[0].any() and not a[:,-1].any()
assert not im.getchannel('A').crop((0,0,256,1)).getbbox()
assert not im.getchannel('A').crop((255,0,256,256)).getbbox()
for size,item in record['exports'].items():
    with Image.open(root/item['path']) as image:
        assert image.mode=='RGBA' and image.size==(int(size),int(size))
assert Image.open(root/record['master']['path']).size==(1024,1024)
assert Image.open(root/record['source']['path']).size==tuple(record['job'].get('native_dimensions',(1254,1254)))
assert record['count_contribution']==1 and record['production_approved'] is record['implementation_ready'] is False
assert next(j for j in json.loads((base/'queue.json').read_text()) if j['id']=='kit-rim-wall-corner')['status']=='delivered'
print('PASS: Rim corner exact alpha openings, empty top/right edges, native/prompt/reference/master/export/previous hashes, both catalog bindings, candidate flags. Paint RGB is not pixel-identical; visual approval remains pending.')
