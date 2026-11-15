from pathlib import Path
import json,hashlib,subprocess,os,zipfile,shutil
R=Path(__file__).parent;O=R/'delivery';ARC='art/_archive/figments/2026-11-15';A=O/ARC;G='/workspace/phc-figments-publish.git';BASE='89c59126941eb2ae074616adff26ef001104c117';BRANCH='art/figments-2026-11-15'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def lines(files,root):return ''.join(sha(p)+'  '+p.relative_to(root).as_posix()+'\n' for p in sorted(files))
shutil.copy2(__file__,A/'seal-and-publish.py')
def parse(path):
 out={}
 for line in path.read_text().splitlines():
  if line.strip():h,p=line.split(None,1);out[p.strip().lstrip('*')]=h
 return out
original=parse(R/'checksums-baseline.sha256');shutil.copy2(R/'checksums-baseline.sha256',O/'art/checksums.sha256')
rehash=subprocess.run(['python3',str(O/'tools/rehash_art_checksums.py')],capture_output=True,text=True);(A/'rehash-run.txt').write_text(rehash.stdout+rehash.stderr);assert rehash.returncode==0
(A/'SHA256SUMS.txt').write_text(lines([p for p in A.rglob('*') if p.is_file() and p.name!='SHA256SUMS.txt'],O))
# Merge the tool's snapshot checksums with the preserved historical list; refresh final archive metadata too.
merged={**original,**parse(O/'art/checksums.sha256')}
for p in (O/'art').rglob('*'):
 if p.is_file() and p!=O/'art/checksums.sha256':merged[p.relative_to(O).as_posix()]=sha(p)
assert set(original)<=set(merged)
(O/'art/checksums.sha256').write_text(''.join(merged[p]+'  '+p+'\n' for p in sorted(merged)))
(O/'SHA256SUMS.txt').write_text(lines([p for p in O.rglob('*') if p.is_file() and p!=O/'SHA256SUMS.txt'],O))
zp=Path('/workspace/PHC-Figments-38-2026-11-15.zip')
with zipfile.ZipFile(zp,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in sorted(O.rglob('*')):
  if p.is_file():z.write(p,p.relative_to(O).as_posix())
with zipfile.ZipFile(zp) as z:
 for p in O.rglob('*'):
  if p.is_file():assert hashlib.sha256(z.read(p.relative_to(O).as_posix())).hexdigest()==sha(p)
zp.with_suffix('.zip.sha256').write_text(sha(zp)+'  '+zp.name+'\n')
paths=sorted(p.relative_to(O).as_posix() for p in (O/'art').rglob('*') if p.is_file());(R/'publish-paths.nul').write_bytes(b'\0'.join(p.encode() for p in paths)+b'\0')
env=dict(os.environ,GIT_DIR=G,GIT_WORK_TREE=str(O),GIT_INDEX_FILE=str(R/'publish.index'),GIT_NO_LAZY_FETCH='1')
def git(*args):return subprocess.run(['git',*args],capture_output=True,text=True,env=env,check=True).stdout.strip()
git('read-tree',BASE);git('add','--pathspec-from-file='+str(R/'publish-paths.nul'),'--pathspec-file-nul')
staged={line.split('\t',1)[1]:line.split()[1] for line in git('ls-files','--stage').splitlines()}
for p in paths:
 b=(O/p).read_bytes();assert staged[p]==hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest(),p
tree=git('write-tree','--missing-ok');msg=R/'commit-message.txt';msg.write_text('Paint 14 Heavenprint Figments and 24 trait/order icons\n\nComplete the 15 November Figment art brief. Add token-safe abstract portraits, white-ink icons, small UI exports, native sources, prompts, preserved candidates, contact sheet, proposed catalog bindings and scoped validation. Retain all historical checksums and record runtime integration as pending.\n');commit=git('commit-tree',tree,'-p',BASE,'-F',str(msg));git('update-ref','refs/heads/'+BRANCH,commit,'0'*40);(R/'published-commit.txt').write_text(commit+'\n')
print(json.dumps({'count':38,'portraits':14,'icons':24,'zip':str(zp),'zip_MiB':round(zp.stat().st_size/1048576,1),'zip_sha256':sha(zp),'checksum_entries':len(merged),'publish_files':len(paths),'branch':BRANCH,'commit':commit},indent=2))
