from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,hashlib,subprocess,os,math,shutil,sys,zipfile,re
import process
R=Path(__file__).parent;O=R/'delivery';A=O/'art/_archive/after-0.30/2026-11-17';read=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
jobs=read(R/'jobs.json')
def portable(p):
 try:return Path(p).relative_to(O).as_posix()
 except ValueError:return p
for p in (A/'records').glob('*.json'):
 r=read(p)
 if 'reference_images_requested' in r:r['reference_images_requested']=[portable(x) for x in r['reference_images_requested']]
 if r['number']==6:r['independent_native_render']=False;r['source_generation_prompt']=read(A/'records/05.json')['prompt']
 p.write_text(json.dumps(r,indent=2)+'\n')
(A/'planned-jobs.json').write_text(json.dumps([{**j,'refs':[portable(p) for p in j['refs']],'reference_images_requested':[portable(p) for p in j.get('reference_images_requested',[])]} for j in jobs],indent=2)+'\n')
for p in (A/'review').glob('batch-*.jpg'):
 ids=list(map(int,p.stem.removeprefix('batch-').split('-')));process.review(ids)
sections=['fight-screen','conditions','hazards-and-zones','place-cards','faith','tending','resources-and-tones']
for s,name in enumerate(sections,1):process.review([j['number'] for j in jobs if j['section']==s],name=f'section-{s}-{name}')
rows=sorted([read(p) for p in (A/'records').glob('*.json')],key=lambda r:r['number']);assert len(rows)==54
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',12);small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',10)
w,h=240,220;out=Image.new('RGB',(w*6,h*9+60),'#10151f');d=ImageDraw.Draw(out);d.text((18,10),'HEAVEN CRY / AFTER 0.30 / 54 NEW ICON CANDIDATES',font=font,fill='white');d.text((18,32),'43 white-ink signs + 11 Wick icons. Dark areas show transparency. Review candidates, not approval.',font=small,fill='#a3aec2')
for i,r in enumerate(rows):
 x=i%6*w;y=i//6*h+60;im=Image.open(O/r['path']).convert('RGBA');im.thumbnail((170,170),Image.Resampling.LANCZOS);out.paste(im,(x+(w-im.width)//2,y),im);name=r['name'].split(' (')[0];d.text((x+10,y+174),str(r['number']).zfill(2)+' '+name[:31],font=font,fill='white');d.text((x+10,y+195),r['id'][:36],font=small,fill='#a3aec2')
overview=A/'review/all-54.jpg';out.save(overview,quality=95)
limits={}
for key,cmd in [('full-library',['python3','tools/validate_art.py']),('asset-build',['npm','run','assets'])]:
 p=subprocess.run(cmd,cwd=O,capture_output=True,text=True);(A/(key+'-check.txt')).write_text(p.stdout+p.stderr);limits[key]={'exit_code':p.returncode,'log':key+'-check.txt'}
(A/'validation-limitations.json').write_text(json.dumps({'partial_checkout':True,'attempted_repository_checks':limits,'catalog_and_ui_intake_deferred_by_brief':True,'not_claimed':'Complete repository validation/build pass; visual production approval.'},indent=2)+'\n')
(A/'README.md').write_text('''# After-0.30 artwork — complete, 17 November 2026

54/54 review candidates: 43 white-ink signs and 11 Wick icons, including the ten lower-priority resource/tone marks. Source brief: GPT-PROMPTS-2026-11-17-after-0.30.md, blob98e885b64ac839060b34eff2d58304065213359e, pinned lane commit45bb92679410814489d3bb5704a51e2754f04c97. This delivery branch starts at the prior complete-art commit1317c61, preserving the earlier348 legacy and41 version0.30 candidates and all held recipes.

[All 54](review/all-54.jpg) · [Download](deliveries/PHC-After-0.30-54-Icons-2026-11-17.zip) · [Manifest](manifest.json) · [Intake fragment](catalog-intake-fragment.json)

## Seven review sheets

- [Fight screen](review/section-1-fight-screen.jpg)
- [Conditions](review/section-2-conditions.jpg)
- [Hazards and zones](review/section-3-hazards-and-zones.jpg)
- [Place cards](review/section-4-place-cards.jpg)
- [Faith](review/section-5-faith.jpg)
- [Tending](review/section-6-tending.jpg)
- [Resources and tones](review/section-7-resources-and-tones.jpg)

## Intake

Use the exact family/id/path bindings in catalog-intake-fragment.json. The brief expressly assigns catalog registration and screen slots to Claude/the builder, so no catalog or gameplay/UI code is changed here. These images do not automatically replace current text glyphs until the builder adds those lookups. Candidate metadata is not production approval.

The brief's phrase "flame-headed" conflicts with Wick's approved lock. These drawings retain his ceramic chamfered pixel-screen head, asymmetric capelet and medical lantern heart. No default cup or bowl. Superseded duplicate-Hurting, brush-like Swinging, flame-crowned Bare Hands and wand-holding vow renders are archived, never active.

## Source and export honesty

53 independent accepted generated PNG sources, each1254×1254, plus one exact horizontal mirror export for Right Brain Debuff as explicitly required by the brief. Both brain entries point to the same immutable left-brain native source; the right entry records that derivation. This is54 distinct delivered icons, not54 independently generated drawings. Master exports are1024×1024, no upscaling. PNGs use straight alpha and pure-white RGB; antialiasing is carried by alpha. UI exports:256/128/64/48/44/32/24/16px.

Every sign was reviewed at16/24/48px on#10151F. Wick actions were reviewed at32/44/64px. Scoped hash, alpha, white-RGB, bounds, safe-circle and export-size validation passes; the brain masters are a pixel-exact mirror. The Git publisher verifies that every pre-existing file blob except the aggregate checksum file remains unchanged.

Full-library validation and npm asset build were attempted in a partial checkout; historical files and intake catalog entries are absent locally, so a full pass cannot be claimed. See exact logs and validation-limitations.json. Re-run them in the complete repository after catalog/UI intake.

The incremental ZIP contains only these54 new candidates, native sources, UI exports, records, review sheets, guide snapshots, source brief, intake fragment and checksums. It is not a complete repository or the older art library. All pictures remain unapproved review candidates until Leon approves them.
''')
guide=A/'guide-snapshots';guide.mkdir(exist_ok=True)
for p in ['art/AGENTS.md','art/README.md','art/style-guide/PHC-Style-Guide.md','art/icons/STYLE-LOCK.md']:
 dest=guide/(Path(p).name if Path(p).name!='README.md' else 'Art-README.md');shutil.copy2(O/p,dest)
for name in ['finalize.py','package.py']:
 if (R/name).exists():shutil.copy2(R/name,A/'tools'/name)
print('54 reviewed; seven section sheets, overview and intake handoff written.')
