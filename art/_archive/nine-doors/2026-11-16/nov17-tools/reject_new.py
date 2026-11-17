from pathlib import Path
import json,shutil,sys
R=Path(__file__).parent;O=R/'delivery';A=O/'art/_archive/nine-doors/2026-11-16';jobs=json.loads((R/'new-jobs.json').read_text());i=int(sys.argv[1]);reason=' '.join(sys.argv[2:]);j=jobs[i];p=A/'draft-records-0.30'/(j['file_key']+'.json');r=json.loads(p.read_text());arc=A/'superseded/0.30'/f'{j["file_key"]}-v{r["generation_attempt"]}';arc.mkdir(parents=True,exist_ok=False);shutil.copy2(p,arc/'record.json');shutil.copy2(O/r['path'],arc/'master.png');(arc/'REASON.md').write_text(reason+'\n')
for size,path in r['exports'].items():
 d=arc/'exports'/size/Path(path).name;d.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(O/path,d);(O/path).unlink()
(O/r['path']).unlink();p.unlink();print('Archived rejected draft:',i,reason)
