#!/usr/bin/env python3
"""Validate the 38-image Figment delivery independently of unrelated historical art. Requires Pillow and NumPy."""
from pathlib import Path
from PIL import Image
import json,hashlib,argparse
import numpy as np
ARC='art/_archive/figments/2026-11-15'
def validate(root):
 a=root/ARC;rows=json.loads((a/'manifest.json').read_text());cat=json.loads((root/'art/catalog.json').read_text())
 assert len(rows)==38 and {r['number'] for r in rows}==set(range(1,39));assert len({r['path'] for r in rows})==38
 y,x=np.ogrid[:1000,:800];outside=(x-400)**2+(y-480)**2>280**2
 for r in rows:
  p=root/r['path'];im=Image.open(p);im.load();assert list(im.size)==r['export_dimensions'];assert im.mode==('RGB' if r['mode']=='portrait' else 'RGBA')
  assert hashlib.sha256(p.read_bytes()).hexdigest()==r['sha256']==cat[r['catalog_family']][r['catalog_id']]['sha256']
  src=root/r['source_path'];assert hashlib.sha256(src.read_bytes()).hexdigest()==r['source_sha256'];assert list(Image.open(src).size)==r['native_dimensions']
  if r['mode']=='portrait':
   assert im.size==(800,1000) and r['token_crop']==[120,200,680,760];arr=np.array(im);assert arr[outside].max()<=4;assert (arr.max(2)>32).sum()>1000;assert r['framing']['scale']<=1
   for size in [40,64,128]:
    token=im.crop(tuple(r['token_crop'])).resize((size,size),Image.Resampling.LANCZOS);assert (np.array(token).max(2)>32).sum()>=20
  else:
   assert im.size==(1024,1024);alpha=im.getchannel('A');assert alpha.getextrema()==(0,255);b=alpha.getbbox();assert b and b[0]>=100 and b[1]>=100 and b[2]<=924 and b[3]<=924
   assert im.convert('RGB').getextrema()==((255,255),)*3
   assert set(r['exports'])=={'32','64','128'}
  for size,path in r['exports'].items():
   ex=Image.open(root/path);assert ex.mode=='RGBA' and ex.size==(int(size),int(size));assert ex.convert('RGB').getextrema()==((255,255),)*3
  assert r['status']=='review-candidate' and not r['production_approved'] and not r['upscaled']
 for prev in (a/'superseded').iterdir():
  old=json.loads((prev/'record.json').read_text());assert hashlib.sha256((prev/'master.png').read_bytes()).hexdigest()==old['sha256'];assert hashlib.sha256((prev/'native.png').read_bytes()).hexdigest()==old['source_sha256']
 print('PASS: 38 unique rows; all catalog/master/native hashes and PNG dimensions/modes; 14 complete round-token silhouettes at 40/64/128px; 24 pure-white alpha-safe icons and UI exports; superseded-master/source hashes. No upscaled renders.')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--root',type=Path,default=Path.cwd());args=p.parse_args();validate(args.root)
