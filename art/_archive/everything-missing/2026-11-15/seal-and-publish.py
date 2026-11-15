from pathlib import Path
import json,hashlib,zipfile,os,subprocess,shutil
R=Path(__file__).parent;O=R/'delivery';A=O/'art/_archive/everything-missing/2026-11-15';G=Path('/workspace/phc-gear-publish');BRANCH='art/everything-missing-2026-11-15';BASE='ff4e1d4bec7d07548d3ff3c0a5f89080bfc933d4'
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def manifest(paths,root):return ''.join(digest(p)+'  '+p.relative_to(root).as_posix()+'\n' for p in sorted(paths))
shutil.copy2(__file__,A/'seal-and-publish.py')
res=subprocess.run(['python3',str(A/'validate-delivery.py'),'--root',str(O)],capture_output=True,text=True);(A/'validation-run.txt').write_text(res.stdout+res.stderr);assert res.returncode==0,res.stdout+res.stderr
(A/'SHA256SUMS.txt').write_text(manifest([p for p in A.rglob('*') if p.is_file() and p.name!='SHA256SUMS.txt'],O))
baseline={}
for line in (R/'checksums-baseline.sha256').read_text().splitlines():
 if not line.strip():continue
 h,p=line.split(None,1);baseline[p.lstrip('*').strip()]=h
original_keys=set(baseline)
for p in (O/'art').rglob('*'):
 if p.is_file() and p!=O/'art/checksums.sha256':baseline[p.relative_to(O).as_posix()]=digest(p)
assert original_keys<=set(baseline)
(O/'art/checksums.sha256').write_text(''.join(baseline[p]+'  '+p+'\n' for p in sorted(baseline)))
(O/'SHA256SUMS.txt').write_text(manifest([p for p in O.rglob('*') if p.is_file() and p!=O/'SHA256SUMS.txt'],O))
zp=Path('/workspace/PHC-Everything-Missing-66.zip')
with zipfile.ZipFile(zp,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in sorted(O.rglob('*')):
  if p.is_file():z.write(p,p.relative_to(O).as_posix())
with zipfile.ZipFile(zp) as z:
 for p in O.rglob('*'):
  if p.is_file():assert hashlib.sha256(z.read(p.relative_to(O).as_posix())).hexdigest()==digest(p)
(zp.with_suffix('.zip.sha256')).write_text(digest(zp)+'  '+zp.name+'\n')
paths=sorted(p.relative_to(O).as_posix() for p in (O/'art').rglob('*') if p.is_file());(R/'publish-paths.nul').write_bytes(b'\0'.join(p.encode() for p in paths)+b'\0')
env=dict(os.environ,GIT_NO_LAZY_FETCH='1',GIT_INDEX_FILE=str(R/'publish.index'),GIT_WORK_TREE=str(O),GIT_DIR=str(G/'.git'))
def git(*args):return subprocess.run(['git',*args],env=env,capture_output=True,text=True,check=True).stdout.strip()
git('read-tree',BASE);git('add','--sparse','--pathspec-from-file='+str(R/'publish-paths.nul'),'--pathspec-file-nul')
staged={line.split('\t',1)[1]:line.split()[1] for line in git('ls-files','--stage').splitlines()}
for p in paths:
 data=(O/p).read_bytes();oid=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest();assert staged[p]==oid,p
tree=git('write-tree','--missing-ok')
msg=R/'commit-message.txt';msg.write_text('Complete 66 Heavenprint missing-art candidates and review handoff\n\nPaint all rows of the 15 November brief: gear, boons, markers, keepers, places, interface marks and Roguelike card. Preserve native renders and superseded art, add UI-size reviews, proposed catalog IDs, checksums and scoped validation. Record scene upscaling and pending runtime integration.\n')
commit=git('commit-tree',tree,'-p',BASE,'-F',str(msg))
git('update-ref','refs/heads/'+BRANCH,commit,'0'*40)
(R/'published-commit.txt').write_text(commit+'\n')
print(json.dumps({'count':66,'zip':str(zp),'zip_MiB':round(zp.stat().st_size/1048576,1),'zip_sha256':digest(zp),'global_checksum_entries':len(baseline),'publish_file_count':len(paths),'branch':BRANCH,'commit':commit},indent=2))
