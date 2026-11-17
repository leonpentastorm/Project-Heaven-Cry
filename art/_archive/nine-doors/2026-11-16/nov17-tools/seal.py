from pathlib import Path
from PIL import Image
import json,hashlib,subprocess,os,shutil,sys,zipfile
R=Path(__file__).parent;O=R/'delivery';A=O/'art/_archive/nine-doors/2026-11-16';G=R/'publisher.git';BR='art/nine-doors-2026-11-16';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def read(p):return json.loads(p.read_text())
def sums(p):
 result={}
 for line in p.read_text().splitlines():
  if line.strip():h,path=line.split(None,1);result[path.strip().lstrip('*')]=h
 return result
subprocess.run(['python3',str(R/'update_state.py')],check=True);scoped=subprocess.run(['python3',str(R/'verify_batch.py')],capture_output=True,text=True);(A/'current-scoped-check.txt').write_text(scoped.stdout+scoped.stderr);assert scoped.returncode==0,scoped.stdout+scoped.stderr
full=subprocess.run(['python3',str(O/'tools/validate_art.py')],cwd=O,capture_output=True,text=True);(A/'current-full-library-check.txt').write_text(full.stdout+full.stderr)
build=subprocess.run(['npm','run','assets'],cwd=O,capture_output=True,text=True);(A/'current-asset-build-check.txt').write_text(build.stdout+build.stderr)
progress=read(A/'progress-0.30.json');validation={'legacy_delivered':348,'new_030_delivered':progress['completed_count'],'new_scoped_validation_pass':True,'full_library_exit':full.returncode,'asset_build_exit':build.returncode,'limitation':'This runtime is a verified partial art checkout: historical inputs are not downloaded. Exact current logs are preserved; do not claim the complete repository validator/build passed. The preceding full 344 worktree had a historical Bulwark export-set mismatch.','native_render_dimensions_recorded_honestly':True,'approval':'unapproved review candidates'};(A/'current-run-validation.json').write_text(json.dumps(validation,indent=2)+'\n')
tools=A/'nov17-tools';tools.mkdir(exist_ok=True)
for name in ['update_state.py','verify_batch.py','seal.py','export-one.py','review_ids.py','prepare-camp.py','setup.py','git-metadata.py']:
 if (R/name).exists():shutil.copy2(R/name,tools/name)
if '--zip-camp' in sys.argv:
 paths=set()
 for n in [271,272,273,274]:
  r=read(A/'records'/f'{n:03d}.json');paths.update([r['path'],r['source_path'],f'art/_archive/nine-doors/2026-11-16/records/{n:03d}.json',*r['exports'].values()])
 paths.update(str(p.relative_to(O)) for p in tools.glob('*.py'));paths.update(str(p.relative_to(O)) for p in (A/'review').glob('continuation-271-272-273-274.jpg'))
 paths.update('art/_archive/nine-doors/2026-11-16/'+n for n in ['progress.json','progress-0.30.json','holds-0.30.json','CURRENT-CHECKPOINT.md','CONTINUE.md','RESUME-AUDIT-2026-11-17.md','current-run-validation.json','new-scoped-validation.json','user-direction-2026-11-17.json'])
 dest=R/'PHC-Camp-4-to-348-2026-11-17.zip'
 with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for path in sorted(paths):z.write(O/path,path)
  z.writestr('INCREMENT-README.txt','Four new camp signs (#271–274) add to checkpoint 344, bringing eligible legacy delivery to 348/375. This is not the full 348-image library. The original 27 held recipes are excluded. Native sources, exports, honest checks and prompts are included. All art remains unapproved review candidates.\n')
  z.writestr('SHA256SUMS.txt',''.join(sha(O/path)+'  '+path+'\n' for path in sorted(paths)))
 with zipfile.ZipFile(dest) as z:
  assert z.testzip() is None
  for path in paths:assert hashlib.sha256(z.read(path)).hexdigest()==sha(O/path)
 archive=A/'deliveries'/dest.name;archive.parent.mkdir(exist_ok=True);shutil.copy2(dest,archive);archive.with_suffix('.zip.sha256').write_text(sha(archive)+'  '+archive.name+'\n');dest.with_suffix('.zip.sha256').write_text(sha(dest)+'  '+dest.name+'\n')
 (A/'CONTINUATION-DELIVERY-348.md').write_text('# Four camp signs complete the eligible legacy queue\n\n348/375 legacy review candidates delivered; zero eligible original jobs remain and 27 original recipes are held. #271–274 have real native sources, masters and six UI exports. The separate 0.30 requests use their own ledger.\n\n[Preview](review/continuation-271-272-273-274.jpg) · [Four-candidate incremental ZIP](deliveries/'+dest.name+') · [Checksum](deliveries/'+dest.name+'.sha256)\n\nThe ZIP adds only these four to checkpoint 344, not a full 348-image library. Native sources are 1254×1254, exports 1024×1024; no upscaling. Current scoped checks passed. Complete validator/build are limited by missing historical inputs in this partial checkout; see current-run-validation.json. All art remains unapproved.\n')
arc_sums=sums(R/'baselines/art/_archive/nine-doors/2026-11-16/SHA256SUMS.txt')
for p in A.rglob('*'):
 if p.is_file() and p.name!='SHA256SUMS.txt':arc_sums[p.relative_to(O).as_posix()]=sha(p)
(A/'SHA256SUMS.txt').write_text(''.join(arc_sums[p]+'  '+p+'\n' for p in sorted(arc_sums)))
baseline=sums(R/'baselines/art/checksums.sha256');subprocess.run(['python3',str(O/'tools/rehash_art_checksums.py')],cwd=O,check=True);merged={**baseline,**sums(O/'art/checksums.sha256')};assert set(baseline)<=set(merged);(O/'art/checksums.sha256').write_text(''.join(merged[p]+'  '+p+'\n' for p in sorted(merged)))
env=dict(os.environ,GIT_DIR=str(G),GIT_WORK_TREE=str(O),GIT_INDEX_FILE=str(R/'publish.index'),GIT_NO_LAZY_FETCH='1')
def git(*args):return subprocess.run(['git',*args],env=env,capture_output=True,text=True,check=True).stdout.strip()
ref='refs/heads/'+BR;parent=git('rev-parse',ref);git('read-tree',parent);before={x.split('\t',1)[1]:x.split()[1] for x in git('ls-files','--stage').splitlines()};changed=[]
for p in (O/'art').rglob('*'):
 if p.is_file():
  data=p.read_bytes();oid=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest();path=p.relative_to(O).as_posix()
  if before.get(path)!=oid:changed.append(path)
assert changed;(R/'stage-paths.nul').write_bytes(b'\0'.join(p.encode() for p in changed)+b'\0');git('add','--pathspec-from-file='+str(R/'stage-paths.nul'),'--pathspec-file-nul')
base_tree={e['path']:e['sha'] for e in read(R/'base-tree.json')['tree'] if e['type']=='blob'};staged={x.split('\t',1)[1]:x.split()[1] for x in git('ls-files','--stage').splitlines()};old=read(R/'baselines/art/_archive/nine-doors/2026-11-16/manifest.json');preserved=set()
for r in old:
 for path in [r['path'],r['source_path'],*r.get('exports',{}).values()]:assert staged[path]==base_tree[path],path;preserved.add(path)
tree=git('write-tree','--missing-ok');message=R/'commit-message.txt';message.write_text(f'Complete camp signs and deliver {progress["completed_count"]}/41 version 0.30 art candidates\n\nPreserve the 348 eligible legacy candidates and all old holds, keep separate ledgers and honest native/export metadata, archive sources and reviewed UI exports, and record current scoped/full-check limitations.\n');commit=git('commit-tree',tree,'-p',parent,'-F',str(message));git('update-ref',ref,commit,parent)
result={'commit':commit,'parent':parent,'branch':BR,'legacy_delivered':348,'new_030_delivered':progress['completed_count'],'remaining':progress['remaining_count'],'files_changed':len(changed),'previous_344_art_files_preserved_by_git_blob':len(preserved),'validation':validation};(R/'latest-checkpoint.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
