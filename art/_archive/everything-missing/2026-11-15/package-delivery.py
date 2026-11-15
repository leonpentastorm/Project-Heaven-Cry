from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,hashlib,shutil,importlib.util,math,zipfile,sys
import numpy as np
R=Path(__file__).parent;O=R/'delivery';ARC='art/_archive/everything-missing/2026-11-15';A=O/ARC
BASE='ff4e1d4bec7d07548d3ff3c0a5f89080bfc933d4'
records=[json.loads(p.read_text()) for p in sorted((A/'records').glob('*.json'))]
assert len(records)==66 and {r['number'] for r in records}==set(range(1,67))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
refs={Path(p).name:p for p in json.loads((R/'reference-paths.json').read_text())}
def portable(p):
 if p.startswith(str(R/'references')+'/'):return refs.get(Path(p).name,p)
 if '/delivery/art/' in p:return 'art/'+p.split('/delivery/art/',1)[1]
 return p
catalog=json.loads((R/'catalog-baseline.json').read_text());fragment={};changes=[]
for r in records:
 r['refs']=[portable(p) for p in r['refs']]
 r['native_minimum_met']=r['native_dimensions'][0]>=1920 and r['native_dimensions'][1]>=1080 if r['mode']=='scene' else r['native_dimensions'][0]>=r['export_dimensions'][0] and r['native_dimensions'][1]>=r['export_dimensions'][1]
 r['implementation_ready']=False
 n=r['number'];stem=Path(r['path']).stem
 if n<=13:family='gear';key=stem
 elif n<=42:family='boons';key='icon-boon-'+stem
 elif n<=45:family='survival_art';key='survival-node-'+stem
 elif n<=60:family='survival_art';key=stem
 elif n<=62:family='interface_icons';key='icon-panel-'+stem
 elif n<=65:family='interface_icons';key='banner-'+stem
 else:family='survival_art';key='roguelike-card-title'
 r['catalog_family']=family;r['catalog_id']=key
 entry={'label':r['name'],'path':r['path'],'sha256':r['sha256'],'width':r['export_dimensions'][0],'height':r['export_dimensions'][1],'background':'transparent' if r['transparent'] else 'opaque','status':'review-candidate','production_approved':False,'implementation_ready':False,'collection':'everything-missing-2026-11-15','source_path':r['source_path'],'native_dimensions':r['native_dimensions'],'native_minimum_met':r['native_minimum_met'],'upscaled':r['upscaled'],'mode':r['mode'],'brief_number':n}
 if r['exports']:entry['exports']=r['exports']
 if 'eye_line' in r:entry['eye_line']=r['eye_line'];entry['eye_line_method']=r['eye_line_method']
 if n==59:
  entry['previous_path']=ARC+'/superseded/art/illustrations/survival/nodes/rest-safe-room.png';r['previous_path']=entry['previous_path']
 # Preserve every existing catalog alias to the replacement's production path.
 for fam,entries in catalog.items():
  if isinstance(entries,dict):
   for k,e in entries.items():
    if isinstance(e,dict) and e.get('path')==r['path']:e.update(entry)
 catalog.setdefault(family,{})[key]=entry;fragment.setdefault(family,{})[key]=entry
 if 43<=n<=45:
  catalog['survival_art']['survival-path-node-markers']['marker_exports'][stem]={'path':r['path'],'sha256':r['sha256'],'width':1024,'height':1024,'standalone':True}
 (A/'records'/f'{n:02d}.json').write_text(json.dumps(r,indent=2)+'\n')
 changes.append(r['path'])
(O/'art/catalog.json').write_text(json.dumps(catalog,indent=2)+'\n');(A/'catalog-fragment.json').write_text(json.dumps(fragment,indent=2)+'\n');(A/'manifest.json').write_text(json.dumps(records,indent=2)+'\n')
# Check all delivered pixels, hashes and UI exports, with the repository decoder on every white-ink 64px export.
spec=importlib.util.spec_from_file_location('phc_validate','/workspace/phc-gear-publish/tools/validate_art.py');v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
checks=[]
for r in records:
 p=O/r['path'];im=Image.open(p);im.load();assert list(im.size)==r['export_dimensions'];assert sha(p)==r['sha256'];assert sha(O/r['source_path'])==r['source_sha256']
 assert im.mode==('RGBA' if r['transparent'] else 'RGB')
 if r['transparent']:
  arr=np.array(im);a=arr[:,:,3];assert (a==0).any() and (a>0).any();assert not a[0,:].any() and not a[-1,:].any() and not a[:,0].any() and not a[:,-1].any()
  bbox=im.getchannel('A').getbbox();assert bbox[0]>=100 and bbox[1]>=100 and bbox[2]<=924 and bbox[3]<=924,(r['number'],bbox)
  if r['mode']=='ink':
   assert np.all(arr[:,:,:3][a>0]==255);v.validate_white_rgba((O/r['exports']['64']).read_bytes(),r['exports']['64'],clear_border=True,box_fraction=.85)
 for s,pth in r['exports'].items():
  ex=Image.open(O/pth);assert ex.size==(int(s),int(s)) and ex.mode=='RGBA'
 checks.append({'number':r['number'],'path':r['path'],'pass':True})
validation={'asset_count':66,'masters':{'gear':13,'ink':37,'portrait':3,'scene':13},'coverage_pass':True,'master_hashes_pass':True,'native_hashes_pass':True,'dimensions_pass':True,'alpha_clear_borders_pass':True,'central_80_percent_framing_pass':True,'pure_white_visible_rgb_pass':True,'repository_white_rgba_decoder_64px_exports_pass':True,'all_ui_export_dimensions_pass':True,'full_repository_validation':'Not established: unrelated historical art is absent from this sparse checkout. See full-library-check.txt.','scene_native_minimum_met':sum(r['native_minimum_met'] for r in records if r['mode']=='scene'),'scene_native_minimum_total':13,'checks':checks}
(A/'validation.json').write_text(json.dumps(validation,indent=2)+'\n')
# Compact overview, while each full section sheet retains actual-size UI checks.
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',12);sheet=Image.new('RGB',(1560,11*210),'#10151f');d=ImageDraw.Draw(sheet)
for i,r in enumerate(records):
 x=(i%6)*260;y=(i//6)*210;im=Image.open(O/r['path']).convert('RGBA');im.thumbnail((242,175));sheet.paste(im,(x+(260-im.width)//2,y+(175-im.height)//2),im);d.text((x+8,y+180),f"{r['number']:02d}  "+Path(r['path']).stem[:30],font=font,fill='white')
sheet.save(A/'review/ALL-66.jpg',quality=94)
remaining='''# What remains after the 15 November delivery

## This brief: 0 unpainted rows

All 66 rows in GPT-PROMPTS-2026-11-15-everything-missing.md have new review candidates. They still require Leon's approval and the builder's asset-map/UI wiring. Thirteen scene exports are upscaled; none meets the native 1920x1080 minimum. City and Works use centre crops from 4:3 originals; every uncropped native is retained. Review the keeper eye-line placement in the final compositions before approval.

## Other briefs: 202 art requests still outstanding according to the audited brief

- 145 character portrait repaints: GPT-PROMPTS-2026-11-14-portraits.md.
- 51 Classes 3.0 assets: 45 white-ink icons and 6 Figment portraits; GPT-PROMPTS-2026-11-13-classes-3.0.md.
- 4 held-back map-kit pieces: AHOC ground-2 and dress-2, shrine ground-2, rim wall-corner.
- 2 fight maps: M1 Proving Ground and M6 Open Ground; layout approval remains the prerequisite stated in the brief.

These are the source brief's backlog states, not a new visual audit of those separate deliveries. The optional six one-tile containers and six wall posts remain optional and are outside its totals.

## Delivered art awaiting merge or wiring

The 71 Survival foes are already delivered on art/survival-foes-2026-11-14, including the ten corrections committed as 89f5b04. Do not repaint them. Merge and wire their portraits.

Section I's existing-art wiring jobs remain: Contraband/personal effects resolver; three magazine lookups; shop supplies/toxins restock icons; Survival lobby/run-over/run-won cards; rest-medic catalog binding; shrine patron's deliberate rolled-portrait behavior.

For this delivery, wire icon-boon-*; survival-node-start/vault_guard/vault; the three keeper IDs; the twelve place IDs; icon-panel-run/run_board; banner-fight-start/won/lost; roguelike-card-title; and the thirteen gear IDs. Confirm provisional 0.28 Materials-card and interface names on intake. Four material/tool item IDs were confirmed in develop data/items.json. Keep material- filenames until the documented loot-prefix resolver is fixed.
'''
(A/'MISSING-AFTER-DELIVERY.md').write_text(remaining);(O/'MISSING-AFTER-DELIVERY.md').write_text(remaining)
readme='''# Heavenprint: everything missing, 15 November 2026

66 new review candidates: 13 painted gear images, 29 white-ink boons, 3 map markers, 3 keeper portraits, 12 place backdrops, 5 interface marks and 1 Roguelike card. No rows from this brief remain unpainted. No Wick assets or game code were changed.

Start with art/_archive/everything-missing/2026-11-15/review/ALL-66.jpg, then the eight section sheets beside it. Transparent icons have 1024px masters and a central 820px subject box; the exports beside their production folder cover the UI sizes in the brief. Portraits are opaque 800x1000. Scenes are opaque 2560x1440 exports, all upscaled from native renders. Two scene renders were 4:3 and have recorded central widescreen crops. No upscale adds detail. Every native is retained unchanged.

Production files are under art/icons, art/portraits/survival and art/illustrations/survival. The archive contains manifest.json, per-image records, prompts in those records, exact native dimensions, SHA-256 values, the original brief, audit, scripts, UI-size sheets and superseded paintings. The previous safe-room painting and portrait/Devout revisions are preserved. No previously approved art is discarded.

art/catalog.json is updated; catalog-fragment.json supplies only the new entries for easier intake. New boons and interface_icons maps hold the proposed runtime IDs; the marker sheet's marker_exports also includes the three standalone new masters. The builder still must wire those IDs and remove pending flags after approval; the code fallback remains until then. All entries are review-candidate, production_approved false and implementation_ready false.

Validation covers all 66 master/source hashes, output dimensions, 50 transparent master borders/margins, pure-white ink, every UI export, and the repository PNG/white-alpha decoder on all 37 flat-ink 64px exports. Full historical-library validation is limited by the sparse checkout. Read validation.json and full-library-check.txt. Existing global checksum entries are preserved; new and changed files are rehashed without removing absent historical entries.

See MISSING-AFTER-DELIVERY.md for the separate 202-request backlog and delivered art needing integration. This delivery was audited against develop commit ff4e1d4bec7d07548d3ff3c0a5f89080bfc933d4. Branch: art/everything-missing-2026-11-15. All artwork is for review, not a claim of production approval.
'''
(A/'README.md').write_text(readme);(O/'README.md').write_text(readme)
for src,name in [('brief.md','original-brief.md'),('audit.json','audit.json'),('export-one.py','export-one.py'),('review.py','review.py'),('package-delivery.py','package-delivery.py')]:shutil.copy2(R/src,A/name)
# Do not retain redundant first-pass UI exports in the archive; production exports and native source are the retained copies.
old=A/'exports'
if old.exists():shutil.rmtree(old)
print('PASS: 66/66 masters and sources; 50 alpha margins; 37 pure-white masters + repository decoder UI checks; all exports.')
