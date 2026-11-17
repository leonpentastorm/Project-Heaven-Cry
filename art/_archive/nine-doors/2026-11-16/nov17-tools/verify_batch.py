from pathlib import Path
from PIL import Image
import json,hashlib,numpy as np,importlib.util
R=Path(__file__).parent;O=R/'delivery';A=O/'art/_archive/nine-doors/2026-11-16';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
spec=importlib.util.spec_from_file_location('repo_art',O/'tools/validate_art.py');v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
records=[json.loads(p.read_text()) for p in (A/'records').glob('*.json')]+([json.loads(p.read_text()) for p in (A/'records-0.30').glob('*.json')] if (A/'records-0.30').exists() else []);audits=[]
for r in records:
 p=O/r['path'];src=O/r['source_path'];assert sha(p)==r['sha256'] and sha(src)==r['source_sha256'];im=Image.open(p);native=Image.open(src);assert list(native.size)==r['native_dimensions'] and list(im.size)==r['export_dimensions'];assert not r['upscaled'];assert im.mode=='RGBA' and im.size==(1024,1024);a=np.array(im.getchannel('A'));assert a.min()==0 and a.max()==255;b=im.getchannel('A').getbbox();assert b[0]>=100 and b[1]>=100 and b[2]<=924 and b[3]<=924
 if r['kind'] in ['wick','sign']:
  assert im.convert('RGB').getextrema()==((255,255),)*3;ratio=float(((a>=9)&(a<=119)).sum()/max(1,(a>=250).sum()));assert ratio<.15,(r.get('number',r.get('request_key')),ratio);audits.append({'asset':r.get('number',r.get('request_key')),'faint_alpha_to_solid_area_ratio':ratio})
  v.validate_white_rgba((O/r['exports']['44']).read_bytes(),r['exports']['44'],circle=r['kind']=='wick',clear_border=True,box_fraction=.85)
 for size,path in r['exports'].items():
  ex=Image.open(O/path);assert ex.size==(int(size),int(size)) and sha(O/path)==r['export_sha256'][size]
  if r['kind'] in ['wick','sign']:assert ex.convert('RGB').getextrema()==((255,255),)*3
base=json.loads((R/'baselines/art/_archive/nine-doors/2026-11-16/manifest.json').read_text());now={r['number']:r for r in json.loads((A/'manifest.json').read_text())};assert all(now[r['number']]==r for r in base),'Old 344 record metadata changed';assert len(now)==348
report={'checked_new_filesets':len(records),'legacy_delivered':348,'new_030_delivered':len(records)-4,'all_new_source_master_export_hashes_pass':True,'new_pixel_alpha_dimensions_safe_box_and_ui_checks_pass':True,'repository_44px_white_alpha_check_pass':True,'original_344_records_unchanged':True,'alpha_audits':audits,'approval':'All unapproved review candidates'};(A/'new-scoped-validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
