from pathlib import Path
import json,hashlib,shutil,subprocess,os,xml.etree.ElementTree as ET
R=Path(__file__).parent;O=R/'delivery';ARC='art/_archive/nine-doors/2026-11-16';A=O/ARC
j=next(x for x in json.loads((R/'jobs.json').read_text()) if x['number']==137);p=O/j['path'];tree=ET.fromstring(p.read_text());assert tree.attrib['viewBox']=='0 0 64 64';assert tree.attrib['stroke-width']=='2';assert not any(e.tag.endswith('text') for e in tree.iter())
src=A/'native-vectors/137-figment-glimmer.svg';src.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,src)
proof=A/'review-source/137-figment-glimmer.svg';proof.parent.mkdir(parents=True,exist_ok=True);proof.write_text(p.read_text().replace('stroke="currentColor"','stroke="#FFFFFF"'))
png=A/'previews/137-figment-glimmer.png';png.parent.mkdir(exist_ok=True);env=dict(os.environ,XDG_CACHE_HOME='/tmp/phc-inkscape-cache',INKSCAPE_PROFILE_DIR='/tmp/phc-inkscape-profile')
r=subprocess.run(['inkscape',str(proof),'--export-type=png','--export-filename='+str(png),'--export-width=1024','--export-background-opacity=0'],env=env,capture_output=True,text=True);(A/'glimmer-render.txt').write_text(r.stdout+r.stderr);assert r.returncode==0,r.stderr
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
rec={**j,'status':'review-candidate','production_approved':False,'implementation_ready':False,'format':'svg','native_dimensions':[64,64],'export_dimensions':[64,64],'sha256':sha(p),'source_path':str(src.relative_to(O)),'source_sha256':sha(src),'review_path':str(png.relative_to(O)),'review_sha256':sha(png),'exports':{},'upscaled':False,'creation_method':'Original vector geometry drawn in house as explicitly permitted by the brief; 2-unit currentColor stroke, no fill; Inkscape proof rasterization'}
(A/'records/137.json').write_text(json.dumps(rec,indent=2)+'\n');done=sorted(int(p.stem) for p in (A/'records').glob('*.json'));(R/'progress.json').write_text(json.dumps({'total':375,'completed_count':len(done),'completed_ids':done,'remaining_count':375-len(done)},indent=2)+'\n');print('Recorded original Glimmer SVG and Inkscape review proof')
