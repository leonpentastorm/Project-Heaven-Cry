from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import struct, json, hashlib, itertools, zlib

ROOT=Path(__file__).resolve().parents[2]
ART=ROOT/'art/ui/title-screen'; PRE=ART/'previews'
PRE.mkdir(parents=True,exist_ok=True)
W,H=4096,2304; SAFE=(256,144,3840,2160)
hashfile=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
sources={name:ART/'source-renders'/f'title-{name}-native.png' for name in ['back','mid','front']}
layers={}; native={}
placement=json.loads((ART/'foreground-placement.json').read_text())
for name,path in sources.items():
 with Image.open(path) as im:
  native[name]=list(im.size)
  if name in ['back','mid']:
   layers[name]=Image.open(ART/f'title-{name}.png').convert('RGBA')
  else:
   export=Image.new('RGBA',(W,H))
   export.alpha_composite(im.convert('RGBA').resize(tuple(placement['scaled_dimensions']),Image.Resampling.LANCZOS),tuple(placement['destination_xy']))
   export.save(ART/'title-front.png',optimize=True)
   layers[name]=export
def composite(shifts=None):
 out=Image.new('RGBA',(W,H))
 for name in ['back','mid','front']:
  if shifts:
   shifted=Image.new('RGBA',(W,H));shifted.alpha_composite(layers[name],shifts[name]);im=shifted
  else:im=layers[name]
  out=Image.alpha_composite(out,im)
 return out
full=composite()
full.convert('RGB').resize((1920,1080),Image.Resampling.LANCZOS).save(PRE/'composite-1920.jpg',quality=95)
view=full.crop(SAFE)
view.convert('RGB').resize((1920,1080),Image.Resampling.LANCZOS).save(PRE/'screen-crop-1920.jpg',quality=95)
cx=round(W*.68); cw=1134;PHONE=(cx-cw//2,144,cx+cw//2,2160)
full.crop(PHONE).convert('RGB').resize((540,960),Image.Resampling.LANCZOS).save(PRE/'phone-crop.jpg',quality=95)
zone=full.convert('RGB').resize((1920,1080));d=ImageDraw.Draw(zone)
font=lambda n:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',n)
d.rectangle((0,162,round(1920*.38),918),outline='#E6A743',width=3)
d.text((20,174),'TITLE / MENU: x 0–38%',fill='white',font=font(20))
d.rectangle(tuple(round(v*1920/W) for v in SAFE),outline='#EEEECC',width=2)
d.rectangle(tuple(round(v*1920/W) for v in PHONE),outline='#70D8D8',width=2)
d.text((1020,30),'CYAN: phone crop / IVORY: overscan safe area',fill='white',font=font(18))
zone.save(PRE/'safe-zones.jpg',quality=94)
# Technical test typography is a separate preview; never bake it into masters.
textpreview=view.convert('RGB').resize((1920,1080),Image.Resampling.LANCZOS)
td=ImageDraw.Draw(textpreview);mask=Image.new('L',textpreview.size);md=ImageDraw.Draw(mask)
titlefont=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed.ttf',72)
for y,text in [(190,'PROJECT HEAVEN'),(272,'CRY')]:
 td.text((40,y),text,font=titlefont,fill='white');md.text((40,y),text,font=titlefont,fill=255)
for i,text in enumerate(['CONTINUE','NEW GAME','JOIN A FRIEND','CHARACTERS','SAVED GAMES','SETTINGS','CREDITS']):
 pos=(76,410+i*61);td.text(pos,text,font=font(28),fill='white');md.text(pos,text,font=font(28),fill=255)
textpreview.save(PRE/'menu-readability-72px.jpg',quality=95)
pixels=np.asarray(view.convert('RGB').resize((1920,1080),Image.Resampling.LANCZOS))/255
linear=np.where(pixels<=.04045,pixels/12.92,((pixels+.055)/1.055)**2.4)
lum=linear@np.array([.2126,.7152,.0722]);contrast=1.05/(lum+.05)
textmask=np.asarray(mask)>220
contrast_result={'minimum_under_solid_text':float(contrast[textmask].min()),'p01':float(np.percentile(contrast[textmask],1)),'pixels_below_4_5':int(np.sum(contrast[textmask]<4.5))}
# Every layer at +/-6% width, +/-3% height; all 8 direction combinations.
grid=Image.new('RGB',(1920,3*390),'#101218');gd=ImageDraw.Draw(grid)
coverage=[]
for i,signs in enumerate(itertools.product([-1,1],repeat=3)):
 shifts={n:(s*round(W*.06),s*round(H*.03)) for n,s in zip(['back','mid','front'],signs)}
 test=composite(shifts).crop(SAFE)
 alpha=np.asarray(test)[:,:,3];coverage.append(int(alpha.min()))
 tile=test.convert('RGB').resize((640,360),Image.Resampling.LANCZOS)
 x=i%3*640;y=i//3*390;grid.paste(tile,(x,y+28));gd.text((x+8,y+5),'back/mid/front '+str(signs),font=font(15),fill='white')
grid.save(PRE/'parallax-extremes.jpg',quality=93)
# Alpha-edge inspection on light and dark grounds, same artwork, no recolouring.
edge=Image.new('RGB',(1920,1080),'#101218')
for row,name in enumerate(['mid','front']):
 for col,bg in enumerate(['#101218','#D8D2C6']):
  ground=Image.new('RGBA',(W,H),bg);ground.alpha_composite(layers[name])
  edge.paste(ground.convert('RGB').resize((960,540),Image.Resampling.LANCZOS),(col*960,row*540))
edge.save(PRE/'alpha-edge-review.jpg',quality=95)

# Real layered PSD v1: three named RGBA pixel layers and RGB merged image.
# ZIP channel compression keeps the layered source below GitHub file limits.
def write_psd(destination, pixel_layers, size):
 W,H=size
 layers=pixel_layers
 full=Image.new('RGBA',size)
 for name in ['back','mid','front']: full=Image.alpha_composite(full,layers[name])
 u16=lambda n:struct.pack('>H',n);u32=lambda n:struct.pack('>I',n)
 records=[];channel_blocks=[]
 for name in ['front','mid','back']:
  im=layers[name]; channels=im.split();data=[channels[3].tobytes()]+[c.tobytes() for c in channels[:3]]
  encoded=[zlib.compress(raw,6) for raw in data]
  rec=struct.pack('>iiiiH',0,0,H,W,4)
  for channel_id,raw in zip([-1,0,1,2],encoded):rec+=struct.pack('>hI',channel_id,len(raw)+2)
  label=('Title '+name).encode('ascii');pascal=bytes([len(label)])+label;pascal+=b'\0'*((-len(pascal))%4)
  extra=u32(0)+u32(0)+pascal
  rec+=b'8BIMnorm'+bytes([255,0,0,0])+u32(len(extra))+extra
  records.append(rec);channel_blocks.extend([u16(2)+raw for raw in encoded])
 info=struct.pack('>h',3)+b''.join(records)+b''.join(channel_blocks)
 info+=b'\0'*(len(info)%2)
 layer_mask=u32(len(info))+info+u32(0)
 psd=destination
 with psd.open('wb') as f:
  f.write(b'8BPS'+u16(1)+b'\0'*6+u16(3)+u32(H)+u32(W)+u16(8)+u16(3))
  f.write(u32(0)+u32(0)+u32(len(layer_mask))+layer_mask+u16(2))
  merged=b''.join(c.tobytes() for c in full.convert('RGB').split())
  compressed=zlib.compress(merged,6);f.write(compressed)
  assert zlib.decompress(compressed)==merged
(ROOT/'production').mkdir(parents=True,exist_ok=True)
write_psd(ROOT/'production/title-screen-4k.psd',layers,(W,H))
psd_size=(1672,941)
write_psd(ART/'title-screen.psd',{n:im.resize(psd_size,Image.Resampling.LANCZOS) for n,im in layers.items()},psd_size)

alpha_stats={}
for n in ['mid','front']:
 a=np.asarray(layers[n])[:,:,3]
 alpha_stats[n]={'transparent_pixels':int(np.sum(a==0)),'partial_alpha_pixels':int(np.sum((a>0)&(a<255))),'opaque_pixels':int(np.sum(a==255)),'left38_max_alpha':int(a[:,:int(W*.38)].max()),'top40_max_alpha':int(a[:int(H*.4)].max())}
report={'canvas':[W,H],'central_safe_rect':list(SAFE),'phone_crop':list(PHONE),'native_dimensions':native,'back_preserved':hashfile(ART/'title-back.png'),'parallax_shift_pixels':[round(W*.06),round(H*.03)],'parallax_crop_min_alphas':coverage,'white_text_contrast':contrast_result,'alpha':alpha_stats,'psd_layers':['Title front','Title mid','Title back'],'psd_merged_pixels_match':True,'layered_source_canvas':[1672,941],'foreground_placement':placement,'visual_review':'pending','full_repository_validation':'not run by this export script'}
(ART/'technical-review.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
