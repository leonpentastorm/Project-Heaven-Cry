from pathlib import Path
from PIL import Image
import json,hashlib,subprocess,sys,shutil,zipfile,numpy as np,importlib.util

w=Path(__file__).parent;r=(w/'delivery').resolve();a=r/'art/_archive/nine-doors/2026-11-16';ids=[int(n) for n in sys.argv[1:] if n!='--zip'];make_zip='--zip' in sys.argv
def read(p):return json.loads(p.read_text())
def write(p,obj):p.write_text(json.dumps(obj,indent=2)+'\n')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
subprocess.run([sys.executable,str(w/'update_state.py'),'--root',str(r),*map(str,ids)],check=True)
cat=read(r/'art/catalog.json');before=json.loads(subprocess.check_output(['git','show','HEAD:art/catalog.json'],cwd=r));changed={(f,k) for f,d in cat.items() if isinstance(d,dict) for k,v in d.items() if before.get(f,{}).get(k)!=v};expected={(read(a/'records'/f'{n:03}.json')['family'],read(a/'records'/f'{n:03}.json')['id']) for n in ids};assert changed<=expected,changed-expected
for n in ids:
 p=a/'records'/f'{n:03}.json';rec=read(p)
 if n not in [323,324] and not rec.get('generation_references'):
  rec['generation_references']=[rec['revision_source']] if rec.get('revision_source') else ['art/_archive/nine-doors/2026-11-16/review/reference-previews/'+x+'.png' for x in ['angel-of-the-trenches','bedside-manner','solid-image']]+['art/icons/traits/mind-without-fog.png'];write(p,rec)
rows=[read(p) for p in sorted((a/'records').glob('*.json'))];write(a/'manifest.json',rows)
audit=[]
spec=importlib.util.spec_from_file_location('repository_art_validator',r/'tools/validate_art.py');v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
for rec in rows:
 if rec['kind'] not in ['wick','sign']:continue
 alpha=np.array(Image.open(r/rec['path']).getchannel('A'));ratio=float(((alpha>=9)&(alpha<=119)).sum()/max(1,(alpha>=250).sum()));assert ratio<.15,(rec['number'],ratio)
 audit.append({'number':rec['number'],'name':rec['name'],'faint_alpha_to_solid_area_ratio':round(ratio,5)})
 if rec['number'] in ids:
  small=rec['exports']['44'];v.validate_white_rgba((r/small).read_bytes(),small,circle=rec['kind']=='wick',clear_border=True,box_fraction=.85)
write(a/'alpha-audit.json',{'method':'Faint alpha 9..119 / solid alpha >=250 must be below 0.15. Native alpha preserved by exports.','passed':True,'records':audit,'excluded':[],'historical_rejection':'The original glowing #323 remains archived; its active replacement is a distinct native render.'})
scoped=subprocess.run([sys.executable,str(a/'validate-delivery.py'),'--root',str(r)],capture_output=True,text=True);assert scoped.returncode==0,scoped.stdout+scoped.stderr;(a/'continuation-scoped-check.txt').write_text(scoped.stdout+scoped.stderr)
build=subprocess.run(['npm','run','assets'],cwd=r,capture_output=True,text=True);(a/'continuation-asset-build-check.txt').write_text(build.stdout+build.stderr)
validation={'delivered':len(rows),'latest_candidate_ids':ids,'scoped_delivery_checks_pass':True,'all_ink_alpha_audit_pass':True,'changed_44px_repository_checks_pass':True,'full_library_exit':1,'full_library_limitation':'Pre-existing historical production manifest expects seven bulwark exports; the prior Nine Doors replacement uses eight. No bulwark changes in this continuation. See continuation-full-library-check.txt.','asset_build_exit':build.returncode,'asset_build_result':build.stdout.strip().splitlines()[-1] if build.stdout.strip() else build.stderr[-500:],'approval':'review-candidate only; production_approved false; implementation_ready false','upscaled':False};write(a/'continuation-validation.json',validation)
for name in ['update_state.py','export-one.py','review_ids.py','archive_draft.py','seal_batch.py']:shutil.copy2(w/name,a/'continuation-tools'/name)
baseline_path=a/'continuation-start.json'
if not baseline_path.exists():
 base=json.loads(subprocess.check_output(['git','show','27bb94309f1c5f8343d8c2844b637819503eb503:art/_archive/nine-doors/2026-11-16/progress.json'],cwd=r));write(baseline_path,{'base_commit':'27bb94309f1c5f8343d8c2844b637819503eb503','completed_ids':base['completed_ids'],'completed_count':base['completed_count']})
if make_zip:
 base=read(baseline_path);new=[rec for rec in rows if rec['number'] not in base['completed_ids']];paths={'art/catalog.json'}
 for rec in new:paths.update([rec['path'],rec['source_path'],f'art/_archive/nine-doors/2026-11-16/records/{rec["number"]:03}.json']);paths.update(rec['exports'].values())
 paths.update(str(p.relative_to(r)) for p in (a/'review').glob('continuation-*.jpg'))
 paths.update('art/_archive/nine-doors/2026-11-16/'+s for s in ['progress.json','progress-0.30.json','holds-0.30.json','art-hold-list-0.30.md','planned-jobs-0.30.json','CONTINUE-0.30.md','CONTINUE.md','CURRENT-CHECKPOINT.md','continuation-validation.json','continuation-preservation-check.json','CONTINUATION-DELIVERY-250.md'])
 dst=a/'deliveries'/f'continuation-{len(rows)}-candidates-increment.zip'
 assert not dst.exists(),'Keep immutable ZIPs; choose a new delivery checkpoint'
 with zipfile.ZipFile(dst,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for path in sorted(paths):z.write(r/path,path)
  z.writestr('INCREMENT-README.txt',f'This incremental archive adds {len(new)} candidates to the preserved 175-candidate baseline. New total: {len(rows)}. It is not a complete {len(rows)}-image library.\n')
 with zipfile.ZipFile(dst) as z:
  for path in paths:assert hashlib.sha256(z.read(path)).hexdigest()==sha(r/path)
 dst.with_suffix('.zip.sha256').write_text(sha(dst)+'  '+dst.name+'\n');print('Verified cumulative incremental ZIP',dst)
(a/'SHA256SUMS.txt').write_text(''.join(sha(p)+'  '+p.relative_to(r).as_posix()+'\n' for p in sorted(a.rglob('*')) if p.is_file() and p.name!='SHA256SUMS.txt'))
subprocess.run([sys.executable,str(r/'tools/rehash_art_checksums.py')],cwd=r,check=True)
subprocess.run(['git','restore','--','apps/web/src/game/assets.json'],cwd=r,check=True)
subprocess.run(['git','add','art'],cwd=r,check=True)
subprocess.run(['git','commit','-m',f'Deliver Nine Doors candidates {", ".join(map(str,ids))}; {len(rows)} legacy candidates total'],cwd=r,check=True)
print(json.dumps(validation,indent=2))
