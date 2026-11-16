from pathlib import Path
import json,hashlib,subprocess,os,shutil,zipfile,sys,importlib.util
R=Path(__file__).parent;O=R/'delivery';ARC='art/_archive/nine-doors/2026-11-16';A=O/ARC;G='/workspace/phc-nine-doors-publish.git';BRANCH='art/nine-doors-2026-11-16'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def sums(paths):return ''.join(sha(p)+'  '+p.relative_to(O).as_posix()+'\n' for p in sorted(paths))
subprocess.run(['python3',str(R/'checkpoint.py')],check=True,capture_output=True)
for name in ['validate-delivery.py','seal-checkpoint.py']:shutil.copy2(R/name,A/name)
scoped=subprocess.run(['python3',str(A/'validate-delivery.py'),'--root',str(O)],capture_output=True,text=True);(A/'validation-run.txt').write_text(scoped.stdout+scoped.stderr);assert scoped.returncode==0,scoped.stdout+scoped.stderr
spec=importlib.util.spec_from_file_location('phc_art',O/'tools/validate_art.py');v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
rows=json.loads((A/'manifest.json').read_text())
for r in rows:
 if r['kind'] in ['wick','sign']:v.validate_white_rgba((O/r['exports']['44']).read_bytes(),r['exports']['44'],circle=r['kind']=='wick',clear_border=True,box_fraction=.85)
full=subprocess.run(['python3',str(O/'tools/validate_art.py')],capture_output=True,text=True);(A/'full-library-check.txt').write_text(full.stdout+full.stderr)
build=subprocess.run(['npm','run','assets'],cwd=O,env=dict(os.environ,npm_config_cache='/tmp/phc-nine-doors-npm-cache'),capture_output=True,text=True);(A/'asset-build-check.txt').write_text(build.stdout+build.stderr)
validation={'delivered':len(rows),'total':375,'scoped_checks_pass':True,'repository_white_alpha_checks_pass':True,'full_library_exit':full.returncode,'asset_build_exit':build.returncode,'limitation':'Full-library and full asset-build checks require historical files absent from the delivery checkout; see exact logs.','upscaled':sum(bool(r['upscaled']) for r in rows)};(A/'validation.json').write_text(json.dumps(validation,indent=2)+'\n')
def parse(path):
 out={}
 for line in path.read_text().splitlines():
  if line.strip():h,p=line.split(None,1);out[p.strip().lstrip('*')]=h
 return out
baseline=parse(R/'checksums-baseline.txt');shutil.copy2(R/'checksums-baseline.txt',O/'art/checksums.sha256');rehash=subprocess.run(['python3',str(O/'tools/rehash_art_checksums.py')],capture_output=True,text=True);(A/'rehash-run.txt').write_text(rehash.stdout+rehash.stderr);assert rehash.returncode==0
(A/'SHA256SUMS.txt').write_text(sums([p for p in A.rglob('*') if p.is_file() and p.name!='SHA256SUMS.txt']))
merged={**baseline,**parse(O/'art/checksums.sha256')}
for p in (O/'art').rglob('*'):
 if p.is_file() and p!=O/'art/checksums.sha256':merged[p.relative_to(O).as_posix()]=sha(p)
assert set(baseline)<=set(merged);(O/'art/checksums.sha256').write_text(''.join(merged[p]+'  '+p+'\n' for p in sorted(merged)))
(O/'SHA256SUMS.txt').write_text(sums([p for p in O.rglob('*') if p.is_file() and p!=O/'SHA256SUMS.txt']))
zip_path=None
if '--zip' in sys.argv:
 zip_path=Path(f'/workspace/PHC-Nine-Doors-{len(rows)}-Candidates-2026-11-16.zip')
 with zipfile.ZipFile(zip_path,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for p in sorted(O.rglob('*')):
   if p.is_file():z.write(p,p.relative_to(O).as_posix())
 with zipfile.ZipFile(zip_path) as z:
  for p in O.rglob('*'):
   if p.is_file():assert hashlib.sha256(z.read(p.relative_to(O).as_posix())).hexdigest()==sha(p)
 zip_path.with_suffix('.zip.sha256').write_text(sha(zip_path)+'  '+zip_path.name+'\n')
env=dict(os.environ,GIT_DIR=G,GIT_WORK_TREE=str(O),GIT_INDEX_FILE=str(R/'publish.index'),GIT_NO_LAZY_FETCH='1')
def git(*args):return subprocess.run(['git',*args],env=env,capture_output=True,text=True,check=True).stdout.strip()
ref='refs/heads/'+BRANCH;old=subprocess.run(['git','--git-dir='+G,'rev-parse','--verify',ref],capture_output=True,text=True).stdout.strip();parent=old or (R/'base-commit.txt').read_text().strip();git('read-tree',parent)
paths=sorted(p.relative_to(O).as_posix() for p in (O/'art').rglob('*') if p.is_file());(R/'publish-paths.nul').write_bytes(b'\0'.join(p.encode() for p in paths)+b'\0');git('add','--pathspec-from-file='+str(R/'publish-paths.nul'),'--pathspec-file-nul');staged={line.split('\t',1)[1]:line.split()[1] for line in git('ls-files','--stage').splitlines()}
for p in paths:
 b=(O/p).read_bytes();assert staged[p]==hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest(),p
tree=git('write-tree','--missing-ok');message=R/'commit-message.txt';message.write_text(f'Deliver {len(rows)} Nine Doors artwork candidates\n\nPaint the requested actions in Heavenprint/Wick, preserve replaced masters and exports, clarify that the Still Water cup is perk-specific, and add review sheets, prompts, native sources, catalog bindings, hashes and scoped validation. Record {375-len(rows)} remaining rows and full-repository check limits.\n');commit=git('commit-tree',tree,'-p',parent,'-F',str(message));git('update-ref',ref,commit,old or '0'*40);state={'commit':commit,'branch':BRANCH,'delivered':len(rows),'remaining':375-len(rows),'zip':str(zip_path) if zip_path else None,'zip_MiB':round(zip_path.stat().st_size/1048576,1) if zip_path else None,'validation':validation};(R/'latest-checkpoint.json').write_text(json.dumps(state,indent=2)+'\n');print(json.dumps(state,indent=2))
