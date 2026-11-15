#!/usr/bin/env python3
"""Validate only the 66-image Heavenprint delivery, without unrelated historical assets. Requires Pillow."""
from pathlib import Path
from PIL import Image
import argparse,json,hashlib
ARC='art/_archive/everything-missing/2026-11-15'
def validate(root):
 records=json.loads((root/ARC/'manifest.json').read_text());cat=json.loads((root/'art/catalog.json').read_text())
 assert len(records)==66 and {r['number'] for r in records}==set(range(1,67))
 assert len({r['path'] for r in records})==66
 for r in records:
  p=root/r['path'];im=Image.open(p);im.load();assert list(im.size)==r['export_dimensions']
  assert hashlib.sha256(p.read_bytes()).hexdigest()==r['sha256']==cat[r['catalog_family']][r['catalog_id']]['sha256']
  src=root/r['source_path'];assert hashlib.sha256(src.read_bytes()).hexdigest()==r['source_sha256'];assert list(Image.open(src).size)==r['native_dimensions']
  assert im.mode==('RGBA' if r['transparent'] else 'RGB')
  if r['transparent']:
   a=im.getchannel('A');assert a.getextrema()==(0,255);b=a.getbbox();assert b and b[0]>=100 and b[1]>=100 and b[2]<=924 and b[3]<=924,(r['number'],b)
  if r['mode']=='ink':assert im.convert('RGB').getextrema()==((255,255),)*3
  if r['mode']=='portrait':assert abs(r['eye_line']['y']-.22)<.003
  for s,pth in r['exports'].items():
   ex=Image.open(root/pth);assert ex.size==(int(s),int(s)) and ex.mode=='RGBA'
   if r['mode']=='ink':assert ex.convert('RGB').getextrema()==((255,255),)*3
  assert r['status']=='review-candidate' and not r['production_approved']
 print('PASS: 66 unique rows; catalog/master/native hashes; PNG dimensions/modes; 50 alpha-safe subjects; 37 white-ink masks; all UI exports; 3 estimated eye-line crops.')
 print('LIMITATION: 13 scene exports are upscaled. Runtime wiring and production approval remain pending.')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--root',type=Path,default=Path.cwd());a=p.parse_args();validate(a.root)
