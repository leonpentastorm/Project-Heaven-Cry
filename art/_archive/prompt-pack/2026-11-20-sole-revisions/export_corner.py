"""Archive and technically export the inspected Rim corner; never draws artwork."""
import hashlib
import json
import shutil
import sys
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[4]
BASE = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT/'tools/art'))
from export_nov12_icons import set_catalog_entry

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def rec(path):
    return {'path': path.relative_to(ROOT).as_posix(), 'sha256': sha(path)}

def dump(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2)+'\n')

if __name__ == '__main__':
    payload=json.loads(Path(sys.argv[1]).read_text()); job=payload['job']
    assert job['id']=='kit-rim-wall-corner'
    target=ROOT/job['path']; assert sha(target)==job['original_sha256']
    folder=BASE/'selected/013-v1'; folder.mkdir(parents=True, exist_ok=False)
    native=folder/'native.png'; shutil.copyfile(payload['src'],native)
    prompt=folder/'prompt.txt'; prompt.write_text(job['prompt']+'\n')
    previous=folder/'superseded'/job['path']; previous.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(target,previous)
    catpath=ROOT/'art/catalog.json'; catalog=json.loads(catpath.read_text())
    old={'survival_art':catalog['survival_art']['survival-k188'],'kit':catalog['kit']['kit-rim-wall-corner']}
    dump(folder/'previous-catalog.json',old)
    refs=[]
    for n,p in enumerate(job['references']):
        source=ROOT/p;assert sha(source)==job['reference_sha256'][p]
        copy=folder/'references'/f'{n:02d}-{source.name}';copy.parent.mkdir(exist_ok=True);shutil.copyfile(source,copy)
        refs.append({'original':rec(source),'snapshot':rec(copy)})
    image=Image.open(native).convert('RGBA')
    image.putalpha(image.getchannel('A').point(lambda x:0 if x<8 else x))
    master=folder/'master-1024.png';image.resize((1024,1024),Image.Resampling.LANCZOS).save(master)
    production=image.resize((256,256),Image.Resampling.LANCZOS)
    production.putalpha(production.getchannel('A').point(lambda x:0 if x<8 else x))
    a=np.array(production.getchannel('A'))>=127
    straight=Image.open(ROOT/'art/sprites/kit/rim/wall-straight.png').convert('RGBA');s=np.array(straight.getchannel('A'))>=127
    assert np.array_equal(a[:,0],s[:,-1]) and np.array_equal(a[-1,:],s[:,0])
    assert not a[0].any() and not a[:,-1].any()
    rgb=np.array(production);cyan=(rgb[:,:,2].astype(int)-rgb[:,:,0]>30)&(rgb[:,:,1].astype(int)-rgb[:,:,0]>18)&a
    assert np.flatnonzero(cyan[-1]).tolist()==[127,128]
    assert not production.getchannel('A').crop((0,0,256,1)).getbbox()
    assert not production.getchannel('A').crop((255,0,256,256)).getbbox()
    production.save(target)
    exports={}
    for size in (256,128,64,32):
        p=folder/f'exports/{size}/wall-corner.png';p.parent.mkdir(parents=True,exist_ok=True)
        production.resize((size,size),Image.Resampling.LANCZOS).save(p);exports[str(size)]=rec(p)
    review=folder/'join-review.png';montage=Image.new('RGBA',(768,768),(16,21,31,255));montage.alpha_composite(straight,(0,256));montage.alpha_composite(production,(256,256));montage.alpha_composite(straight.transpose(Image.Transpose.ROTATE_90),(256,512));montage.convert('RGB').save(review)
    metrics={'alpha_threshold':127,'left_opening':[64,191],'bottom_opening':[64,191],'top_right_empty':True,'bottom_cyan':[127,128],'left_cyan':np.flatnonzero(cyan[:,0]).tolist(),'left_join_rgb_mean_absolute_difference':float(np.abs(rgb[64:192,0,:3].astype(int)-np.array(straight)[64:192,-1,:3].astype(int)).mean()),'pixel_identical_paint':False}
    entry={**old['survival_art'],'sha256':sha(target),'native_dimensions':list(Image.open(native).size),'source_path':native.relative_to(ROOT).as_posix(),'previous_path':previous.relative_to(ROOT).as_posix(),'collection':'2026-11-20-sole-revisions','implementation_ready':False,'production_approved':False,'status':'review-candidate','technical_exports':exports}
    text=set_catalog_entry(catpath.read_text(),'survival_art','survival-k188',entry)
    kit={**old['kit'],'sha256':sha(target),'source_path':entry['source_path'],'previous_path':entry['previous_path'],'implementation_ready':False,'production_approved':False,'use':False,'why':'Replacement review candidate; exact half-tile geometry checked, painted value/strip joins await Leon approval.'}
    catpath.write_text(set_catalog_entry(text,'kit','kit-rim-wall-corner',kit))
    record={**payload,'id':job['id'],'path':job['path'],'production':rec(target),'source':rec(native),'prompt':rec(prompt),'master':rec(master),'references':refs,'previous':rec(previous),'exports':exports,'join_review':rec(review),'metrics':metrics,'status':'review-candidate','production_approved':False,'implementation_ready':False,'count_contribution':1}
    dump(folder/'delivery.json',record)
    queue=json.loads((BASE/'queue.json').read_text());next(j for j in queue if j['id']==job['id']).update(status='delivered',delivery=(folder/'delivery.json').relative_to(ROOT).as_posix());dump(BASE/'queue.json',queue)
    dump(BASE/'progress.json',{'delivered':[job['id']],'remaining':['fork.sigil.running_script'],'selected_count':1,'project_distinct_count':511,'project_total':871,'image_quota':None})
    print(json.dumps({'exported':rec(target),'metrics':metrics,'project_count':511}))
