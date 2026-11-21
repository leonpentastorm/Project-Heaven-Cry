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

running=base/'selected/066-v1/delivery.json'
if running.exists():
    row=json.loads(running.read_text())
    for item in [row[k] for k in ['candidate','original','component','imagegen_native','imagegen_prompt','component_plan','assembly_instruction','previous_catalog','preview','review','production']]+list(row['exports'].values())+list(row['production_exports'].values()):
        assert sha(root/item['path'])==item['sha256'],item['path']
    original=Image.open(root/row['original']['path']).convert('RGBA')
    current=Image.open(root/row['production']['path']).convert('RGBA')
    assert current.size==(1024,1024)
    old=np.array(original);new=np.array(current);marks=old[:,:,3]>0
    assert np.array_equal(old[marks],new[marks]),'Original Wick/glyph pixel changed'
    component=Image.open(root/row['component']['path']).convert('RGBA');ink=np.array(component)[:,:,3]
    x,y=row['placement'];outside=np.ones((1024,1024),bool);outside[y:y+component.height,x:x+component.width]=False
    assert np.array_equal(old[outside],new[outside])
    assert not ((old[y:y+component.height,x:x+component.width,3]>0)&(ink>0)).any()
    assert np.array_equal(new[y:y+component.height,x:x+component.width,3][ink>0],ink[ink>0])
    assert current.convert('RGB').getextrema()==((255,255),)*3
    entry=catalog['fork_icons']['fork-sigil-running_script']
    assert entry['sha256']==row['production']['sha256']==checksums[row['path']]
    assert entry['source_path']==row['candidate']['path'] and entry['previous_path']==row['original']['path']
    assert entry['status']=='review-candidate' and entry['production_approved'] is entry['implementation_ready'] is False
    for size,item in row['production_exports'].items():
        assert entry['exports'][size]==item['path'] and checksums[item['path']]==item['sha256']
        with Image.open(root/item['path']) as image:
            assert image.mode=='RGBA' and image.size==(int(size),int(size))
            assert image.convert('RGB').getextrema()==((255,255),)*3
            a=image.getchannel('A')
            # Small white line icons need not contain a fully opaque pixel after antialiasing.
            baseline=original.resize((int(size),int(size)),Image.Resampling.LANCZOS).getchannel('A')
            assert a.getextrema()[0]==0 and a.getextrema()[1]>=baseline.getextrema()[1]
            assert not a.crop((0,0,int(size),1)).getbbox() and not a.crop((0,int(size)-1,int(size),int(size))).getbbox()
    assert row['proof']['original_mark_rgba_pixels_changed']==row['proof']['outside_addition_rgba_pixels_changed']==0
    print('PASS: Running Script original158252 drawn RGBA pixels unchanged; only328 new-alpha pixels, original/component/native/prompt/export hashes and catalog binding verified; approvals false.')
