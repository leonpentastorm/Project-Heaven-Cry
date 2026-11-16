from pathlib import Path
from PIL import Image
import json,hashlib,shutil,subprocess,xml.etree.ElementTree as ET
import numpy as np
R=Path(__file__).parent;O=R/'delivery';ARC='art/_archive/nine-doors/2026-11-16';A=O/ARC
jobs=json.loads((R/'jobs.json').read_text());byid={j['number']:j for j in jobs};rows=[json.loads(p.read_text()) for p in sorted((A/'records').glob('*.json'))];cat=json.loads((R/'catalog-baseline.json').read_text());fragment={};refs={Path(p).name:p for p in json.loads((R/'reference-paths.json').read_text())}
if (R/'phase2-reference-paths.json').exists():refs.update({Path(p).name:p for p in json.loads((R/'phase2-reference-paths.json').read_text())})
def portable(p):
 if '/delivery/art/' in p:return 'art/'+p.split('/delivery/art/',1)[1]
 if '/references/' in p:return refs.get(Path(p).name,p)
 return p
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
for r in rows:
 r['priority']=byid[r['number']]['priority'];r['refs']=[portable(p) for p in r['refs']];old=dict(cat.get(r['family'],{}).get(r['id'],{}));e=dict(old)
 e.update(label='Wick — '+r['name'] if r['kind']=='wick' and 'Wick' in r['paint'] else r['name'],path=r['path'],sha256=r['sha256'],width=r['export_dimensions'][0],height=r['export_dimensions'][1],background='transparent' if r['transparent'] or r['kind']=='monoline' else 'opaque',status='review-candidate',production_approved=False,implementation_ready=False,collection='nine-doors-2026-11-16',native_dimensions=r['native_dimensions'],source_path=r['source_path'],upscaled=r['upscaled'],format='svg' if r['kind']=='monoline' else 'png',mode=r['kind'],brief_number=r['number'])
 if r['kind'] in ['wick','sign']:e['ink']='#FFFFFF'
 elif r['kind']=='monoline':e['ink']='currentColor'
 if r.get('exports'):e['exports']=r['exports']
 for k in ['placeholder','wanted']:e.pop(k,None)
 if old.get('placeholder'):
  p=O/ARC/'superseded/placeholders'/r['id']/Path(old['path']).name
  if p.exists():e['previous_path']=str(p.relative_to(O))
  else:e['previous_path']=old['path']
 if r['family']=='perks':
  oldart=O/'art/_archive/perks/wick/replaced/2026-11-16'/Path(r['path']).name;assert oldart.exists();assert sha(oldart)==old['previous_sha256'];e['previous_revision_path']=str(oldart.relative_to(O));e['previous_exports']={size:'art/_archive/perks/wick/replaced/2026-11-16/exports/'+size+'/'+Path(path).name for size,path in old.get('previous_exports',{}).items()}
  for path in e['previous_exports'].values():assert (O/path).exists()
 cat.setdefault(r['family'],{})[r['id']]=e;fragment.setdefault(r['family'],{})[r['id']]=e
 (A/'records'/f"{r['number']:03d}.json").write_text(json.dumps(r,indent=2)+'\n')
(O/'art/catalog.json').write_text(json.dumps(cat,indent=2)+'\n');(A/'catalog-fragment.json').write_text(json.dumps(fragment,indent=2)+'\n');(A/'manifest.json').write_text(json.dumps(rows,indent=2)+'\n')
done={r['number'] for r in rows};remaining=[j for j in sorted(jobs,key=lambda j:(j['priority'],j['number'])) if j['number'] not in done];progress={'total':375,'completed_count':len(done),'completed_ids':sorted(done),'remaining_count':len(remaining),'remaining_by_priority':{str(p):sum(j['priority']==p for j in remaining) for p in range(1,9)}};(R/'progress.json').write_text(json.dumps(progress,indent=2)+'\n');(A/'progress.json').write_text(json.dumps(progress,indent=2)+'\n')
continuation=['# Continue the Nine Doors artwork','',f"{len(done)}/375 candidates delivered; {len(remaining)} remain. Do not count the three nothing-to-paint rows. Read the original brief and the current style guide. The CUP over Wick in Mind Without Fog belongs ONLY to that trait, never to Wick anatomy. Wick is the ceramic pixel-screen automaton with capelet, lantern-heart and asymmetry; do not turn him into a literal flame head.",'','Continue in the priority order below, one image per prompt. Source scripts and prompts are in this collection; current records must be preserved. The proposed paths/catalog IDs are exact. Every image remains review-candidate until Leon approves it. No new action-row UI is authorised by this art task.','']
for j in remaining:continuation.append(f"- P{j['priority']} · #{j['number']} · {j['name']} · `{j['path']}` · {j['mode']} · {j['state']}")
if (A/'BLOCKERS.md').exists():continuation[4:4]=['See BLOCKERS.md for the exact image-generation quota response and the archived Last Turn repaint.','']
(A/'CONTINUE.md').write_text('\n'.join(continuation)+'\n');(A/'planned-jobs.json').write_text(json.dumps([{**j,'refs':[portable(p) for p in j['refs']]} for j in jobs],indent=2)+'\n')
readme=f'''# Nine Doors artwork — 16 November 2026

Checkpoint: {len(done)} of 375 requested assets are painted/drawn as review candidates. {len(remaining)} remain; see CONTINUE.md and progress.json. The source branch snapshot is wip/feature-0.29 at {(R/'base-commit.txt').read_text().strip()}. Delivery branch: art/nine-doors-2026-11-16.

Start with review/DELIVERY-OVERVIEW.jpg, review/ALPHA-18.jpg and review/VISIBLE-EXTRAS-02.jpg. Section sheets check Wick icons at actual 32px and 44px and condition signs at 24px and 48px on #10151F. Ink masters are 1024 RGBA, pure-white visible RGB with transparent cuts and clear edges. Wick icons fit the central 80% box and 90%-diameter medallion. Native image renders and exact prompts are retained. Glimmer, Glass, Ferry, Breaker and Hush are original in-house monoline SVGs on the required 64 grid, 2-unit currentColor stroke, no fill; their Inkscape PNGs are review rasters, not painted masters. Gear uses Heavenprint gouache and material colour. See BLOCKERS.md for the quota reset and pending Last Turn repaint.

The cup is specific to Mind Without Fog. The canonical trait master is unchanged; the guide and STYLE-LOCK now state the explicit user clarification. The first cup-bearing candidates are preserved in superseded/. Replaced alpha-perk masters and their old UI exports are retained in art/_archive/perks/wick/replaced/2026-11-16/. Old placeholders are preserved too. Concept corrections are retained, including Many-Eyed Dream's first sparkle version and Sinner's Due's full-mascot version; the revised Sinner's Due uses a cracked stone-effigy fragment as its partial-figure metaphor.

Catalog entries now point to the new master/export paths and have their placeholder flag removed. Existing IDs and data bindings are retained. No UI slot or game code is added. The 18 alpha perks, Open Hand and Glimmer use existing screen slots; merge/build in the complete repository to show the new candidates. Designed rows and action families without slots still await the builder's separate UI work.

Every asset remains review-candidate, production_approved false. Source and master dimensions, hashes and processing are in manifest.json and records/. Full historical-library and npm asset-build checks require the historical art inputs absent from this delivery checkout; exact results are in validation logs. Scoped pixel/file checks cover the delivered records.
'''
(A/'README.md').write_text(readme);(O/'README.md').write_text(readme)
for src,name in [('brief.md','original-brief.md'),('audit.json','inventory-audit.json'),('export-one.py','export-one.py'),('review.py','review.py'),('record-glimmer.py','record-glimmer.py'),('generation-worker.js','generation-worker.js'),('checkpoint.py','checkpoint.py')]:shutil.copy2(R/src,A/name)
tools=O/'tools';tools.mkdir(exist_ok=True)
for name in ['validate_art.py','rehash_art_checksums.py','build_web_assets.py']:shutil.copy2(R/'repo-inputs/tools'/name,tools/name)
shutil.copy2(R/'repo-inputs/package.json',O/'package.json')
print(json.dumps(progress,indent=2))
