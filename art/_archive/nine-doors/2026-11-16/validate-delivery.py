from pathlib import Path
from PIL import Image
import json,hashlib,argparse,xml.etree.ElementTree as ET
import numpy as np
ARC='art/_archive/nine-doors/2026-11-16'
def validate(root):
 a=root/ARC;rows=json.loads((a/'manifest.json').read_text());cat=json.loads((root/'art/catalog.json').read_text());assert len({r['number'] for r in rows})==len(rows)
 for r in rows:
  p=root/r['path'];e=cat[r['family']][r['id']];assert p.exists() and hashlib.sha256(p.read_bytes()).hexdigest()==r['sha256']==e['sha256'];assert not e.get('placeholder');assert e['status']=='review-candidate' and not e['production_approved'];src=root/r['source_path'];assert hashlib.sha256(src.read_bytes()).hexdigest()==r['source_sha256']
  if r['kind']=='monoline':
   svg=ET.fromstring(p.read_text());assert svg.attrib['viewBox']=='0 0 64 64' and svg.attrib['stroke-width']=='2' and svg.attrib['fill']=='none' and svg.attrib['stroke']=='currentColor';assert not any(x.tag.endswith(('text','image','script')) for x in svg.iter());assert hashlib.sha256((root/r['review_path']).read_bytes()).hexdigest()==r['review_sha256'];continue
  im=Image.open(p);assert list(im.size)==r['export_dimensions'];assert list(Image.open(src).size)==r['native_dimensions']
  if r['kind'] in ['wick','sign','gear']:
   assert im.mode=='RGBA' and im.size==(1024,1024);alpha=np.array(im.getchannel('A'));assert alpha.min()==0 and alpha.max()==255;b=im.getchannel('A').getbbox();assert b[0]>=100 and b[1]>=100 and b[2]<=924 and b[3]<=924
   if r['kind'] in ['wick','sign']:assert im.convert('RGB').getextrema()==((255,255),)*3
   if r['kind']=='wick':
    y,x=np.where(alpha>=16);assert ((x-511.5)**2+(y-511.5)**2).max()<=(.45*1024+1)**2
  for size,path in r.get('exports',{}).items():
   ex=Image.open(root/path);assert ex.size==(int(size),int(size))
   if r['kind'] in ['wick','sign']:assert ex.convert('RGB').getextrema()==((255,255),)*3
 for prev in (a/'superseded').iterdir():
  if (prev/'record.json').exists():
   old=json.loads((prev/'record.json').read_text());assert hashlib.sha256((prev/'master.png').read_bytes()).hexdigest()==old['sha256'];assert hashlib.sha256((prev/'native.png').read_bytes()).hexdigest()==old['source_sha256']
 print(f'PASS: {len(rows)}/375 candidates; catalog/master/native hashes, PNG dimensions/alpha/white ink and safe bounds, SVG rules, UI exports and preserved candidate hashes.')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--root',type=Path,default=Path.cwd());args=p.parse_args();validate(args.root)
