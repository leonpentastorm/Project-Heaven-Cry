from pathlib import Path
import json,hashlib,subprocess,os,shutil,importlib.util,numpy as np
from PIL import Image,ImageOps
R=Path(__file__).parent;O=R/'delivery';A=O/'art/_archive/after-0.30/2026-11-17';G=Path('/workspace/phc-nine-doors-2026-11-17/publisher.git');BR='art/after-0.30-2026-11-17';BASE='1317c61d984409c0516034bead8d1dbb6678d77d';read=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
jobs=read(R/'jobs.json');records=sorted([read(p) for p in (A/'records').glob('*.json')],key=lambda r:r['number']);done={r['number'] for r in records};pending=[j for j in jobs if j['number'] not in done]
spec=importlib.util.spec_from_file_location('repo_art',O/'tools/validate_art.py');v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
for r in records:
 im=Image.open(O/r['path']);a=np.array(im.getchannel('A'));assert im.size==(1024,1024) and im.mode=='RGBA';assert im.convert('RGB').getextrema()==((255,255),)*3;assert a.min()==0 and a.max()==255;assert sha(O/r['path'])==r['sha256'] and sha(O/r['source_path'])==r['source_sha256'];assert list(Image.open(O/r['source_path']).size)==r['native_dimensions'];b=im.getchannel('A').getbbox();assert min(b[:2])>=100 and max(b[2:])<=924;assert ((a>=9)&(a<=119)).sum()/max(1,(a>=250).sum())<.15;assert not r['upscaled']
 for s,p in r['exports'].items():
  ex=Image.open(O/p);assert ex.size==(int(s),int(s)) and sha(O/p)==r['export_sha256'][s];assert ex.convert('RGB').getextrema()==((255,255),)*3
 v.validate_white_rgba((O/r['exports']['44']).read_bytes(),r['path'],circle=r['kind']=='wick',clear_border=True,box_fraction=.85)
if {5,6}<=done:
 pair={r['number']:r for r in records};left=Image.open(O/pair[5]['path']);right=Image.open(O/pair[6]['path']);assert np.array_equal(np.array(ImageOps.mirror(left)),np.array(right))
report={'checked_candidates':len(records),'source_hashes_master_ui_sizes_alpha_white_rgb_and_safe_bounds_pass':True,'brain_pair_exact_pixel_mirror':{5,6}<=done,'native_resolution':'1254x1254 generated sources; right brain shares left native with explicit mirror export','master_resolution':'1024x1024; no upscaling','approval':'review candidates; production_approved false','catalog_intake':'Deferred to Claude by source brief; supplied family/id fragment, no game code or catalog modification.'}
(A/'validation.json').write_text(json.dumps(report,indent=2)+'\n');(A/'manifest.json').write_text(json.dumps(records,indent=2)+'\n');(A/'progress.json').write_text(json.dumps({'total':54,'completed':len(records),'remaining':len(pending),'completed_numbers':sorted(done),'pending_numbers':[j['number'] for j in pending]},indent=2)+'\n')
fragment={}
for r in records:fragment.setdefault(r['family'],{})[r['id']]={k:r[k] for k in ['path','sha256','mode','production_approved','implementation_ready']}
(A/'catalog-intake-fragment.json').write_text(json.dumps(fragment,indent=2)+'\n')
(A/'CONTINUE.md').write_text('# After-0.30 art checkpoint\n\n'+str(len(records))+'/54 review candidates complete; '+str(len(pending))+' remain. Source brief pinned at45bb92679410814489d3bb5704a51e2754f04c97 on wip/lane-0.31-art. Branch starts at1317c61, preserving all prior41 version0.30 candidates.\n\nRead source-brief.md and planned-jobs.json. New candidates are in records/; master, native and all eight UI export hashes are recorded. No catalog entries or screen slots added: the brief assigns intake to Claude. Use catalog-intake-fragment.json. The old27 holds and all prior art remain untouched. Wick has the ceramic pixel screen/cape/lantern, no flame head/default cup.\n\nRemaining:\n'+''.join('- '+str(j['number'])+' '+j['name']+' — '+j['path']+'\n' for j in pending)+'\nValidation.json covers this new scope. Full checks in a partial checkout cannot validate absent historic assets. All pictures remain unapproved.\n')
for script in ['prepare.py','process.py','seal.py','generate.js']:
 shutil.copy2(R/script,A/'tools'/script)
checks={}
for line in (R/'baseline-checksums.sha256').read_text().splitlines():
 if line.strip():h,p=line.split(None,1);checks[p.lstrip('*')]=h
paths=set()
for r in records:paths.update([r['path'],*r['exports'].values()])
paths.update(p.relative_to(O).as_posix() for p in A.rglob('*') if p.is_file())
for path in paths:checks[path]=sha(O/path)
(O/'art/checksums.sha256').write_text(''.join(checks[p]+'  '+p+'\n' for p in sorted(checks)));paths.add('art/checksums.sha256')
env=dict(os.environ,GIT_DIR=str(G),GIT_WORK_TREE=str(O),GIT_INDEX_FILE=str(R/'publish.index'),GIT_NO_LAZY_FETCH='1')
def git(*args):return subprocess.run(['git',*args],env=env,capture_output=True,text=True,check=True).stdout.strip()
ref='refs/heads/'+BR;parent=git('rev-parse',ref);git('read-tree',parent);before={x.split('\t')[1]:x.split()[1] for x in git('ls-files','--stage').splitlines()};changed=[]
for path in paths:
 data=(O/path).read_bytes();h=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
 if before.get(path)!=h:changed.append(path)
assert changed;(R/'stage-paths.nul').write_bytes(b'\0'.join(p.encode() for p in changed)+b'\0');git('add','--pathspec-from-file='+str(R/'stage-paths.nul'),'--pathspec-file-nul');staged={x.split('\t')[1]:x.split()[1] for x in git('ls-files','--stage').splitlines()};base=read(R/'base-tree-blobs.json')
assert all(staged[p]==h for p,h in base.items() if p!='art/checksums.sha256'),'An existing file changed'
tree=git('write-tree','--missing-ok');message=R/'commit-message.txt';message.write_text(f'Deliver {len(records)}/54 after-0.30 art candidates\n\nPreserve prior artwork and game code; provide exact source paths, catalog intake fragment, native sources, UI exports and small-size review sheets.\n');commit=git('commit-tree',tree,'-p',parent,'-F',str(message));git('update-ref',ref,commit,parent)
result={'commit':commit,'parent':parent,'branch':BR,'completed':len(records),'remaining':len(pending),'preserved_prior_file_blobs':len(base)-1,'changed_files':len(changed)};(R/'checkpoint.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
