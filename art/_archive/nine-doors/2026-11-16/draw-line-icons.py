from pathlib import Path
import json,hashlib,subprocess,shutil,os,xml.etree.ElementTree as ET
R=Path(__file__).parent;O=R/'delivery';A=O/'art/_archive/nine-doors/2026-11-16';jobs=json.loads((R/'jobs.json').read_text())
geometry={
167: '''  <path d="M44 34 L44 9 L20 11 L20 55 L44 53 L44 48"/>
  <path d="M38 18 L28 30 L34 34 L25 46"/>
  <circle cx="44" cy="38" r="0.5"/><circle cx="44" cy="41.5" r="0.5"/><circle cx="44" cy="45" r="0.5"/>''',
168: '''  <path d="M47 34 H10 Q8 34 8 37 Q8 40 11 40 H47"/>
  <circle cx="29" cy="26" r="8"/>
  <path d="M8 50 Q14 45 20 50 T32 50 T44 50 T56 50"/>
  <circle cx="50" cy="37" r="0.5"/><circle cx="53.5" cy="37" r="0.5"/><circle cx="57" cy="37" r="0.5"/>''',
169: '''  <path d="M12 32 V20 Q12 16 16 16 H33 L38 22 H45 Q49 22 49 26 V29 H51 Q55 29 55 33 V39 Q55 45 49 46 L37 49 H12 V44"/>
  <path d="M21 17 L25 27 L21 32 M35 38 L30 41 L32 48"/>
  <circle cx="12" cy="35" r="0.5"/><circle cx="12" cy="38" r="0.5"/><circle cx="12" cy="41" r="0.5"/>''',
170: '''  <path d="M24 55 H15 V36 C15 23 23 13 32 9 C41 13 49 23 49 36 V55 H40"/>
  <path d="M24 28 Q32 23 40 28 L39 39 Q36 44 32 45 Q28 44 25 39 Z"/>
  <path d="M33 32 V42"/>
  <circle cx="28" cy="55" r="0.5"/><circle cx="32" cy="55" r="0.5"/><circle cx="36" cy="55" r="0.5"/>'''
}
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
env=dict(os.environ,XDG_CACHE_HOME='/tmp/phc-inkscape-cache',INKSCAPE_PROFILE_DIR='/tmp/phc-inkscape-profile')
for n,body in geometry.items():
 j=next(x for x in jobs if x['number']==n);p=O/j['path'];assert not p.exists();p.parent.mkdir(parents=True,exist_ok=True)
 svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n'+body+'\n</svg>\n';p.write_text(svg)
 ET.fromstring(svg);src=A/'native-vectors'/f'{n:03d}-{p.name}';src.parent.mkdir(exist_ok=True);shutil.copy2(p,src);proof=A/'review-source'/src.name;proof.parent.mkdir(exist_ok=True);proof.write_text(svg.replace('stroke="currentColor"','stroke="#FFFFFF"'));png=A/'previews'/f'{n:03d}-{p.stem}.png';png.parent.mkdir(exist_ok=True)
 r=subprocess.run(['inkscape',str(proof),'--export-type=png','--export-filename='+str(png),'--export-width=1024','--export-background-opacity=0'],env=env,capture_output=True,text=True);(A/f'vector-{n}-render.txt').write_text(r.stdout+r.stderr);assert r.returncode==0,r.stderr
 rec={**j,'status':'review-candidate','production_approved':False,'implementation_ready':False,'format':'svg','native_dimensions':[64,64],'export_dimensions':[64,64],'sha256':sha(p),'source_path':str(src.relative_to(O)),'source_sha256':sha(src),'review_path':str(png.relative_to(O)),'review_sha256':sha(png),'exports':{},'upscaled':False,'creation_method':'Original vector geometry drawn in house as explicitly permitted by the brief; 2-unit currentColor stroke, no fill; Inkscape proof rasterization'}
 (A/'records'/f'{n:03d}.json').write_text(json.dumps(rec,indent=2)+'\n')
print('Drew four original SVG masters: Glass, Ferry, Breaker, Hush.')
