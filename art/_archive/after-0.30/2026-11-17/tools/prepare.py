from pathlib import Path
import json,re,subprocess,hashlib,os,shutil,urllib.request,concurrent.futures,zlib
R=Path(__file__).parent;OLD=Path('/workspace/phc-nine-doors-2026-11-17');O=R/'delivery';A=O/'art/_archive/after-0.30/2026-11-17';G=OLD/'publisher.git';BASE='1317c61d984409c0516034bead8d1dbb6678d77d';SRC='45bb92679410814489d3bb5704a51e2754f04c97';BR='art/after-0.30-2026-11-17'
A.mkdir(parents=True,exist_ok=True)
tree=subprocess.check_output(['git','--git-dir='+str(G),'ls-tree','-r',BASE],text=True);by={x.split('\t')[1]:x.split()[2] for x in tree.splitlines()};(R/'base-tree-blobs.json').write_text(json.dumps(by))
for p in (G/'objects').glob('??/*'):
 if p.is_file() and p.parent.name+p.name in set(by.values()) and zlib.decompress(p.read_bytes()).startswith(b'blob '):p.unlink()
refs=['art/icons/traits/mind-without-fog.png','art/icons/perks/angel-of-the-trenches.png','art/icons/perks/bedside-manner.png','art/icons/perks/solid-image.png','art/icons/survival/markers/shop.png','art/icons/boons/edge.png','art/icons/banners/fight-start.png','art/icons/banners/fight-won.png','art/icons/banners/fight-lost.png','art/icons/tending/bond.png','art/icons/tending/tug.png']
refs+=sorted(p for p in by if re.fullmatch(r'art/icons/prayers/whisper-[^/]+\.png',p))[:2]
refs+=sorted(p for p in by if re.fullmatch(r'art/icons/conditions/[^/]+\.png',p))[:3]
refs+=sorted(p for p in by if re.fullmatch(r'art/icons/feelings/[^/]+\.png',p))[:2]
refs+=sorted(p for p in by if re.fullmatch(r'art/icons/survival/markers/[^/]+\.png',p))[:3]
refs=list(dict.fromkeys(refs));assert all(p in by for p in refs)
def fetch(path):
 dest=O/path;dest.parent.mkdir(parents=True,exist_ok=True);src=OLD/'delivery'/path
 if src.exists():data=src.read_bytes()
 else:data=urllib.request.urlopen(urllib.request.Request('https://raw.githubusercontent.com/leonpentastorm/Project-Heaven-Cry/'+BASE+'/'+path,headers={'User-Agent':'PHC-art'}),timeout=90).read()
 assert hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()==by[path],path
 if not dest.exists():
  if src.exists():os.link(src,dest)
  else:dest.write_bytes(data)
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:list(pool.map(fetch,refs))
for name in ['tools/validate_art.py','tools/rehash_art_checksums.py','tools/build_web_assets.py','package.json','art/checksums.sha256']:
 src=OLD/'delivery'/name;dest=O/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dest)
shutil.copy2(O/'art/checksums.sha256',R/'baseline-checksums.sha256')
shutil.copy2(R/'brief.md',A/'source-brief.md')
jobs=[];section=0
common='Create ONE original PHC icon in pure WHITE #FFFFFF flat ink on fully TRANSPARENT background. Bold confident hand-inked silhouette, broad clear negative-space interior cuts, no gray, shading, gradients, texture, glow, opaque black paint, text, letters, numbers, frame or border. All dark gaps must be transparent. Center whole compact action inside generous 15% clear margin, square 1024x1024 composition. '
wick='Exactly the approved WICK: ceramic chibi automaton, broad chamfered rectangular head with inset pixel-screen expression, small side discs, chunky mitten hands and boots, short ASYMMETRIC CAPELET and visible round LANTERN HEART with thick equal cross arms. About 2.4 heads tall. No flame head or human face. ONE full Wick maximum; other people only cropped partials. No default bowl/cup/head halo, arrows or corner star copied from references. Read at32px/44px; cape wedge and lantern remain distinct. '
sign='This is a SIGN, not a scene. NO WICK, robot head, mascot cape or lantern-heart chest. A generic human silhouette only if specifically requested. One very simple subject, two interior cuts at most, broad strokes and generous gaps that remain legible at16px,24px and48px. '
for line in (R/'brief.md').read_text().splitlines():
 m=re.match(r'## (\d)\.',line)
 if m:section=int(m.group(1))
 if not re.match(r'\| \d+ \|',line):continue
 cells=[x.strip() for x in line.strip('|').split('|')];assert len(cells)==9,cells
 n=int(cells[0]);family,key=re.findall(r'`([^`]+)`',cells[1]);path=cells[2].strip('`');kind='wick' if cells[4]=='Wick icon' else 'sign'
 assert path not in by,'Already present: '+path
 base=refs[:6]
 extra=([p for p in refs if '/banners/' in p] if section==1 else [p for p in refs if '/conditions/' in p] if section==2 else [p for p in refs if '/survival/markers/' in p] if section in [3,4] else [p for p in refs if '/prayers/whisper-' in p] if section==5 else [p for p in refs if '/tending/' in p] if section==6 else [p for p in refs if '/feelings/' in p])
 refpaths=(refs[:4] if kind=='wick' else [refs[0],refs[4],refs[5]])+extra
 jobs.append({'number':n,'section':section,'family':family,'id':key,'path':path,'name':cells[3],'kind':kind,'mode':cells[4],'state':cells[5],'use':cells[6],'paint':cells[7],'avoid':cells[8],'file_key':f'{n:02d}-'+Path(path).stem,'source_commit':SRC,'source_brief_blob':'98e885b64ac839060b34eff2d58304065213359e','prompt':common+(wick if kind=='wick' else sign)+'\nPAINT: '+cells[7]+'\nAVOID: '+cells[8],'refs':[str(O/p) for p in dict.fromkeys(refpaths)],'production_approved':False,'implementation_ready':False})
assert len(jobs)==54 and sum(j['kind']=='wick' for j in jobs)==11
jobs[5]['derived_exact_mirror_of']=5
for d in ['records','draft-records','native-renders','review','tools','superseded']: (A/d).mkdir(exist_ok=True)
(R/'jobs.json').write_text(json.dumps(jobs,indent=2)+'\n');(A/'planned-jobs.json').write_text(json.dumps([{**j,'refs':[str(Path(p).relative_to(O)) for p in j['refs']]} for j in jobs],indent=2)+'\n')
subprocess.run(['git','--git-dir='+str(G),'update-ref','refs/heads/'+BR,BASE],check=True)
(R/'WORK-STATE.md').write_text('# After-0.30 artwork\n\nSource brief on wip/lane-0.31-art at '+SRC+'. Delivery branch '+BR+' starts at prior complete art commit '+BASE+', preserving all 41 v0.30 candidates. 54 new files:43 signs,11 Wick. No UI/catalog additions: the brief assigns catalog intake to Claude; deliver exact family/id fragment. Signs check16/24/48. Use approved ceramic pixel-screen Wick, no flame head/default cup. Exact brain pair uses one native drawing plus explicit mirrored technical export, recorded honestly. All review candidates.\n')
print(json.dumps({'jobs':len(jobs),'refs':len(refs),'branch':BR,'free_MiB':shutil.disk_usage(R).free/1048576}))
