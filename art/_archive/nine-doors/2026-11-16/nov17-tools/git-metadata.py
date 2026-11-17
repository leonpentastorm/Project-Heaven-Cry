from pathlib import Path
import json,subprocess,hashlib,os
R=Path(__file__).parent;G=str(R/'publisher.git');BASE=(R/'base-commit.txt').read_text().strip();t=json.loads((R/'base-tree.json').read_text());assert not t.get('truncated');env=dict(os.environ,GIT_NO_LAZY_FETCH='1');groups={};expected={'':json.loads((R/'base-commit.json').read_text())['tree']['sha']}
for e in t['tree']:
 p=Path(e['path']);parent=p.parent.as_posix();parent='' if parent=='.' else parent;groups.setdefault(parent,[]).append(e)
 if e['type']=='tree':expected[e['path']]=e['sha']
for folder in sorted(groups,key=lambda s:len(s.split('/')),reverse=True):
 entries=sorted(groups[folder],key=lambda e:(Path(e['path']).name+('/' if e['type']=='tree' else '')).encode());data=b''.join(format(int(e['mode'],8),'o').encode()+b' '+Path(e['path']).name.encode()+b'\0'+bytes.fromhex(e['sha']) for e in entries);oid=hashlib.sha1(b'tree '+str(len(data)).encode()+b'\0'+data).hexdigest();assert oid==expected[folder],folder
 got=subprocess.run(['git','--git-dir='+G,'hash-object','-w','-t','tree','--stdin'],input=data,capture_output=True,check=True,env=env).stdout.decode().strip();assert got==oid
subprocess.run(['git','--git-dir='+G,'update-ref','refs/heads/art/nine-doors-2026-11-16',BASE],check=True,env=env);print('Verified metadata-only Git trees:',len(groups))
