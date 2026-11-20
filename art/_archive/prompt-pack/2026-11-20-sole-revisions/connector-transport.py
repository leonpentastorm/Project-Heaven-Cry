import base64, hashlib, json, subprocess, sys
from datetime import datetime
from pathlib import Path

def git(*args, **kw):
    return subprocess.check_output(['git',*args],**kw)

mode=sys.argv[1]
if mode=='manifest':
    head=git('rev-parse','HEAD',text=True).strip();parent=git('rev-parse','HEAD^',text=True).strip()
    tree=git('rev-parse','HEAD^{tree}',text=True).strip();base=git('rev-parse','HEAD^'+'^{tree}',text=True).strip();files=[]
    existing=set(git('ls-tree','-r','--format=%(objectname)','HEAD^',text=True).splitlines())
    for path in git('diff','--name-only','HEAD^','HEAD',text=True).splitlines():
        assert path.startswith('art/') or path.startswith('tools/')
        data=Path(path).read_bytes()
        blob=git('hash-object',path,text=True).strip()
        files.append({'path':path,'sha':blob,'length':len(data),'b64_length':len(base64.b64encode(data)),'mode':'100644','type':'blob','existing_blob':blob in existing})
    result={'head':head,'parent':parent,'tree':tree,'base_tree':base,'files':files,'message':git('log','-1','--format=%B',text=True).strip()}
    print(json.dumps(result))
elif mode=='read':
    encoded=base64.b64encode(Path(sys.argv[2]).read_bytes()).decode()
    print(encoded[int(sys.argv[3]):int(sys.argv[3])+int(sys.argv[4])])
elif mode=='import-commit':
    obj=json.loads(Path(sys.argv[2]).read_text());expected=sys.argv[3]
    def identity(key):
        x=obj[key];dt=datetime.fromisoformat(x['date'].replace('Z','+00:00'))
        return f"{key} {x['name']} <{x['email']}> {int(dt.timestamp())} +0700\n"
    raw=f"tree {obj['tree']['sha']}\n"+''.join('parent '+x['sha']+'\n' for x in obj['parents'])+identity('author')+identity('committer')
    signature=obj.get('verification',{}).get('signature')
    if signature:
        raw+='gpgsig '+signature.replace('\n','\n ').rstrip(' ')+'\n'
    raw+='\n'+obj['message']
    variants=[raw,raw+'\n']
    found=None
    for item in variants:
        data=item.encode();digest=hashlib.sha1(f'commit {len(data)}\0'.encode()+data).hexdigest()
        if digest==obj['sha']:
            actual=git('hash-object','-t','commit','-w','--stdin',input=data).decode().strip();assert actual==digest;found=actual;break
    assert found,'Could not reconstruct exact API commit; do not change local branch'
    assert git('rev-parse','HEAD^{tree}',text=True).strip()==obj['tree']['sha']
    git('update-ref','refs/heads/art/2026-11-20-reset-continuation',found,expected)
    git('update-ref','refs/remotes/origin/art/2026-11-20-reset-continuation',found)
    print(json.dumps({'local_head':found,'tree_preserved':True,'working_tree_unchanged':True}))
