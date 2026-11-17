from pathlib import Path
import json,sys
R=Path(__file__).parent;A=R/'delivery/art/_archive/nine-doors/2026-11-16';jobs=json.loads((R/'new-jobs.json').read_text());dest=A/'records-0.30';dest.mkdir(exist_ok=True)
for i in map(int,sys.argv[1:]):
 j=jobs[i];p=A/'draft-records-0.30'/(j['file_key']+'.json');r=json.loads(p.read_text());assert r['request_key']==j['request_key'];r.update(status='review-candidate',visual_review='Inspected charcoal preview and actual use-size silhouettes; anatomy, props, white ink and source-rule depiction reviewed. Unapproved proposal, not gameplay approval.');q=dest/p.name;assert not q.exists(),'Archive an existing candidate before replacing';q.write_text(json.dumps(r,indent=2)+'\n');p.unlink();print('Accepted review candidate:',i,r['name'])
