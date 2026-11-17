from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import urllib.request,urllib.parse,json,hashlib,shutil,os
R=Path(__file__).parent;O=R/'delivery';A='art/_archive/nine-doors/2026-11-16/';REPO='leonpentastorm/Project-Heaven-Cry';HEAD='3963ec1a9b6b88a5808566878bd7fe19bcf2d564'
def get(url):
 req=urllib.request.Request(url,headers={'User-Agent':'PHC-art-continuation','Accept':'application/vnd.github+json'})
 return urllib.request.urlopen(req,timeout=90).read()
commit=json.loads(get(f'https://api.github.com/repos/{REPO}/git/commits/{HEAD}'));(R/'base-commit.json').write_text(json.dumps(commit,indent=2)+'\n')
tree=json.loads(get(f'https://api.github.com/repos/{REPO}/git/trees/{commit["tree"]["sha"]}?recursive=1'));assert not tree.get('truncated');(R/'base-tree.json').write_text(json.dumps(tree,separators=(',',':'))+'\n');by={e['path']:e for e in tree['tree']}
paths=['art/AGENTS.md','art/style-guide/PHC-Style-Guide.md','art/style-guide/palette.json','art/catalog.json','art/checksums.sha256','tools/validate_art.py','tools/rehash_art_checksums.py','tools/build_web_assets.py','package.json','art/briefs/NINE-DOORS-ART-HANDOFF-2026-11-16.md']
paths += [A+x for x in ['manifest.json','planned-jobs.json','planned-jobs-0.30.json','progress.json','progress-0.30.json','holds-0.30.json','source-doors-3.0-revision-2.md','CONTINUE.md','CONTINUE-0.30.md','RESUME-AUDIT-2026-11-17.md','CURRENT-CHECKPOINT.md','RESUME-PROMPT.md','README.md','alpha-audit.json','delivery-counts.json','catalog-fragment.json','SHA256SUMS.txt','USER-CORRECTIONS.md','continuation-validation.json','validate-delivery.py']]
paths += [e['path'] for e in tree['tree'] if e['path'].startswith(A+'continuation-tools/') and e['type']=='blob']
refs=['art/icons/traits/mind-without-fog.png','art/icons/perks/angel-of-the-trenches.png','art/icons/perks/bedside-manner.png','art/icons/perks/solid-image.png','art/icons/survival/markers/shop.png','art/icons/boons/edge.png','art/icons/shadow/cut-strap.png','art/icons/shadow/hijack.png','art/icons/shadow/decoy.png','art/icons/gear/weapon-knuckledusters.png','art/icons/gear/weapon-hellraiser_servo_fist.png']
if 'AGENTS.md' in by:paths.append('AGENTS.md')
paths=list(dict.fromkeys(paths+refs));missing=[p for p in paths if p not in by];assert not missing,missing
def fetch(path):
 data=get(f'https://raw.githubusercontent.com/{REPO}/{HEAD}/'+urllib.parse.quote(path));actual=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest();assert actual==by[path]['sha'],path
 dest=O/path;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data);return path
with ThreadPoolExecutor(max_workers=6) as pool:result=list(pool.map(fetch,paths))
baselines=R/'baselines';baselines.mkdir(exist_ok=True)
for path in paths:
 if not path.endswith('.png'):
  dest=baselines/path;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(O/path,dest)
(R/'downloaded-paths.json').write_text(json.dumps(paths,indent=2)+'\n');(R/'base-commit.txt').write_text(HEAD+'\n')
print(json.dumps({'base':HEAD,'tree_objects':sum(e['type']=='tree' for e in tree['tree']),'files_downloaded':len(result),'tree_entries':len(tree['tree']),'free_MiB':round(shutil.disk_usage(R).free/1048576,1)}))
