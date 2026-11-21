"""Technical portrait placement and exports; the unchanged native is retained."""
from pathlib import Path
import hashlib,json,math,shutil,sys
import numpy as np
from PIL import Image,ImageDraw

ROOT=Path(__file__).resolve().parents[4]
A=Path(__file__).resolve().parent
ID='figment-scrap-sentinel'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def validate():
    r=json.loads((A/'delivery.json').read_text());cat=json.loads((ROOT/'art/catalog.json').read_text())['figments'][ID]
    for p,h in r['file_hashes'].items():assert sha(ROOT/p)==h,p
    assert cat['sha256']==sha(ROOT/cat['path']) and cat['status']=='review-candidate'
    assert cat['production_approved'] is cat['implementation_ready'] is False
    im=Image.open(ROOT/cat['path']);assert im.size==(800,1000) and im.mode=='RGB'
    a=np.array(im);y,x=np.where(a.max(2)>8);radius=np.sqrt((x-400)**2+(y-480)**2)
    assert radius.max()<=249,radius.max()
    yy,xx=np.indices((1000,800));assert not a[((xx-400)**2+(yy-480)**2)>280**2].any()
    assert sha(ROOT/'art/portraits/figments/figment-sentinel.png')==r['reference_hashes']['art/portraits/figments/figment-sentinel.png']
    for n in (256,128,64,40,32):
        t=Image.open(A/f'exports/{n}.png');assert t.mode=='RGBA' and t.size==(n,n)
        assert t.getchannel('A').getextrema()==(0,255)
        assert np.count_nonzero(np.array(t)[:,:,:3].max(2)>32)>10
    print(json.dumps({'validated':ID,'master':[800,1000],'max_visible_radius':float(radius.max()),'token_sizes':[256,128,64,40,32],'native_unchanged':True,'candidate_only':True}))
if '--validate' in sys.argv:validate();raise SystemExit
job=json.loads((A/'queue.json').read_text())[0];target=ROOT/job['path'];catalog=json.loads((ROOT/'art/catalog.json').read_text())
assert ID not in catalog['figments'] and not target.exists()
native=A/'attempts/001/native.png';request=json.loads((A/'attempts/001/request.json').read_text())
for p,h in request['reference_hashes'].items():assert sha(ROOT/p)==h
source=A/'sources/v1/native.png';source.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(native,source)
a=np.array(Image.open(native).convert('RGB'));a[a.max(2)<=3]=0
y,x=np.where(a.max(2)>3);bbox=(int(x.min()),int(y.min()),int(x.max()+1),int(y.max()+1));cx=(bbox[0]+bbox[2]-1)/2;cy=(bbox[1]+bbox[3]-1)/2
radius=float(np.sqrt((x-cx)**2+(y-cy)**2).max());scale=min(1,246/radius)
crop=Image.fromarray(a).crop(bbox);w,h=round(crop.width*scale),round(crop.height*scale);small=crop.resize((w,h),Image.Resampling.LANCZOS)
master=Image.new('RGB',(800,1000));placement=(round(400-w/2),round(480-h/2));master.paste(small,placement);target.parent.mkdir(parents=True,exist_ok=True);master.save(target)
(A/'masters/v1').mkdir(parents=True,exist_ok=True);shutil.copyfile(target,A/'masters/v1/master.png');(A/'exports').mkdir(exist_ok=True)
token=master.crop((120,200,680,760));mask=Image.new('L',(2240,2240));ImageDraw.Draw(mask).ellipse((0,0,2239,2239),fill=255);mask=mask.resize((560,560),Image.Resampling.LANCZOS)
for n in (256,128,64,40,32):
    t=token.convert('RGBA');t.putalpha(mask);t.resize((n,n),Image.Resampling.LANCZOS).save(A/f'exports/{n}.png')
review=Image.new('RGB',(600,320),(26,26,26))
for off,n in zip((0,280,420,500,550),(256,128,64,40,32)):
    t=Image.open(A/f'exports/{n}.png');review.paste(t,(off,20),t)
review.save(A/'token-review.png')
(A/'prompt.txt').write_text(job['prompt']+'\n')
entry={'label':'Scrap Sentinel','path':job['path'],'sha256':sha(target),'width':800,'height':1000,'native_dimensions':list(Image.open(native).size),'source_path':str(source.relative_to(ROOT)),'background':'opaque','mode':'heavenprint-abstract-figment','status':'review-candidate','production_approved':False,'implementation_ready':False,'collection':'figments-2026-11-21-scrap-sentinel','brief_number':9,'upscaled':False,'form':'sentinel','variant':'rising-from-wreckage','token_crop':[120,200,680,760],'token_center':[400,480],'token_radius':280,'replaces_requested_id':job['replaces_requested_id'],'delivery_record':str((A/'delivery.json').relative_to(ROOT))}
catalog['figments'][ID]=entry;(ROOT/'art/catalog.json').write_text(json.dumps(catalog,indent=2)+'\n')
record={'id':ID,'status':'review-candidate','production_approved':False,'implementation_ready':False,'authorization':job['authorization'],'replaces_requested_id':job['replaces_requested_id'],'count_change':1,'native_sha256':sha(native),'reference_hashes':request['reference_hashes'],'prompt_sha256':hashlib.sha256(job['prompt'].encode()).hexdigest(),'technical_transform':{'source_bbox_threshold3':bbox,'background_normalization':'Only pixels with every RGB channel <=3 set to pure black; native unchanged','uniform_scale':scale,'resized_dimensions':[w,h],'placement':placement,'target_center':[400,480],'target_max_radius':246},'visual_review':'Tall slender Sentinel matches the existing one-lens, one continuous right-facing barrel and exactly three braced legs; all three feet rise from a low compact plate wreckage base. Cream and petrol-blue, fraying bot-flecks, no face or living anatomy. Native framing normalized by uniform scaling for complete circular-token coverage. All artistic approvals remain pending.','file_hashes':{}}
files=[target,source,native,A/'prompt.txt',A/'masters/v1/master.png',A/'token-review.png',*sorted((A/'exports').glob('*.png'))]
record['file_hashes']={str(p.relative_to(ROOT)):sha(p) for p in files};(A/'delivery.json').write_text(json.dumps(record,indent=2)+'\n')
job['status']='delivered';job['native_sha256']=sha(native);(A/'queue.json').write_text(json.dumps([job],indent=2)+'\n')
claim=json.loads((A/'claim.json').read_text());claim['status']='complete-delivered';(A/'claim.json').write_text(json.dumps(claim,indent=2)+'\n');validate()
