from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from collections import Counter
from datetime import datetime
from zoneinfo import ZoneInfo
import json,hashlib,zipfile,shutil,math

r=Path('/workspace/work/phc-nine-doors-production');rel='art/_archive/nine-doors/2026-11-16';a=r/rel
read=lambda p:json.loads(p.read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
rows=read(a/'manifest.json');base=read(a/'continuation-run2-start.json');new=[x for x in rows if x['number'] not in base['completed_ids']]
assert len(rows)==344 and len(new)==94
jobs=read(a/'planned-jobs.json');held=set(read(a/'holds-0.30.json')['held_legacy_ids']);done={x['number'] for x in rows};pending=[x for x in jobs if x['number'] not in done and x['number'] not in held]
assert {x['number'] for x in pending}=={271,272,273,274}
assert read(a/'progress-0.30.json')['completed_count']==0
stamp=datetime.now(ZoneInfo('Asia/Bangkok')).isoformat(timespec='seconds')
overview=a/'review/continuation-overview-344-from-250.jpg';assert not overview.exists()
cw,ch,cols=200,224,8;canvas=Image.new('RGB',(cw*cols,74+ch*math.ceil(len(new)/cols)),'#10151f');d=ImageDraw.Draw(canvas)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',13);title=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',22)
d.text((18,12),'94 new review candidates | checkpoint 344/375',font=title,fill='white');d.text((18,43),'Since checkpoint 250. Active fresh Breaker remake included. 0.30 additions remain 0/41.',font=font,fill='#b8c0cd')
for idx,x in enumerate(sorted(new,key=lambda x:x['number'])):
 xx=(idx%cols)*cw;yy=74+(idx//cols)*ch;im=Image.open(r/x['path']).convert('RGBA');im.thumbnail((176,174),Image.Resampling.LANCZOS)
 canvas.paste(im,(xx+(cw-im.width)//2,yy+(174-im.height)//2),im)
 label=f"{x['number']:03} {x['name']}";words=label.split();lines=['']
 for word in words:
  test=(lines[-1]+' '+word).strip()
  if d.textlength(test,font=font)>184:lines.append(word)
  else:lines[-1]=test
 for k,line in enumerate(lines[:3]):d.text((xx+8,yy+178+k*15),line,font=font,fill='white')
canvas.save(overview,quality=91)
shutil.copy2('/workspace/work/nine-doors-0.30/source-spec.md',a/'source-doors-3.0-revision-2.md')
detail='''# Resume after actual image limit — 17 November 2026

This is the current handoff. The 16 November RESUME-AUDIT and blockers.json describe historical states. The latest numeric records and progress.json agree on **344/375 legacy candidates**. This continuation adds **94** to checkpoint 250. All 54 techniques, nine door emblems, nine class portraits, four remaining gloves, and 18 of 22 final legacy jobs are delivered.

**Actual blocker:** image generation returned HTTP 429 `usage_limit_reached` on #271–274 at approximately 07:46 Bangkok on 17 November. #270 rendered successfully and was exported/reviewed. No image exists for the four failed jobs; do not mark them delivered. See generation-limit-2026-11-17.json and generation-failures/. The service reports reset **17 November 2026 13:28:30 Asia/Bangkok**, epoch 1794896910. Check current tools at resumption; do not promise automatic continuation or keep retrying before reset.

## Exact remaining work

1. Four eligible legacy signs, in order: **#271 free focus**, `art/icons/camp/free-focus.png`; **#272 spend budget**, **#273 starting boon**, **#274 ready**. The exact authoritative paths, ids and Paint/Avoid text are in planned-jobs.json and CONTINUE.md; use those even if a descriptive name here differs. These are object-only pure-white signs, no full Wick. Prepared staging is in continuation-tools/remaining-camp-config.json.
2. **All 41 separate 0.30 requests remain undelivered**: 32 forks, Stand Behind Me, four replacement depictions, Follow, Afterword, Mana Shock and Staggered. Read planned-jobs-0.30.json, CONTINUE-0.30.md, the uploaded art-hold-list-0.30.md, and the pinned source spec now archived as source-doors-3.0-revision-2.md. Derive visual recipes from rules rather than names alone. Keep provisional names and eight source questions explicit; do not imply gameplay approval. Follow inspects reuse before painting once. Scrap Turret portrait #164 remains held; do not add a duplicate Sentinel portrait.
3. **27 unfinished old recipes remain held**. All 28 holds are enforced; already-delivered Palm #258 stays preserved and held for review. The four authorized replacement pictures use NEW 0.30 recipes at old bindings, and must not complete or revive the held old recipe records.

Combined outstanding authorized request records: **45 = 4 legacy + 41 additions**. Three original rows #267–269 are non-painting. Ultimate eligible legacy completion is 348/375, not 375 while these holds remain.

## User correction: fresh Breaker

The user rejected two versions of #44 for impossible axe geometry and explicitly required the whole image remade from scratch before continuing. The active `art/portraits/classes/fighter.png` and records/044.json are a fresh generation with NO prior image references: a new person carrying one conventional single-bit axe upright beside the body, continuous shaft through grip and head socket. Both rejected portraits remain under superseded/044-axe-head-geometry-fix/ and superseded/044-rejected-axe-correction/. Never reactivate them or restore the stale shoulder-carry recipe. See USER-CORRECTIONS.md. Review equipment anatomy, grip and contact visually; technical validators cannot certify them.

## Working tools and resumption setup

The repository is `/workspace/work/phc-nine-doors-production`, a separate sparse worktree on the art branch. Original `/workspace/Project-Heaven-Cry` is preserved. Scratch tools are `/workspace/work/nine-doors-run` with `delivery` symlink to this checkout. All helper sources are archived under continuation-tools/. A different runtime should recreate scratch and symlink, then copy the Python helpers there. Do not use stale paths or checkout-wide resets.

For #271–274, load the full legacy jobs as `store('batchJobs', jobs)` and the checkout as `store('production_root', checkout)`. Evaluate generate-ink-batch.js in functions.exec and call it with the prepared config. It uses tools.image_gen__imagegen, saves result-N.json, then yields the generated image. View actual reference images first. Each tool call accepts at most FIVE referenced paths. Use the image tool for all creative work. Gear requires its own painted references, never the flat-ink helper. Brand-new images without style-reference inputs omit both reference fields.

For each successful legacy render: export-one.py N, review_ids.py N... (or review_painted.py for gear/portraits), VIEW the charcoal sheet and actual-size silhouettes, then seal_batch.py N... . Only seal reviewed candidates: the updater collects all numeric records. On rejection, preserve the draft and native before replacement. Do not numerically complete failed calls. Native images must be copied into the archive before runtime loss.

The existing Python export/update/seal pipeline is for numeric LEGACY records only. Before producing 0.30 additions, extend it deliberately or create a separate pipeline writing records-0.30/<key>.json and progress-0.30.json. Do not place added records into numeric records/ or inflate the 375 denominator. Four replacement bindings require archiving prior placeholder/artwork; newly specified fork IDs do not imply implemented UI lookups. Keep unbound proposed bindings explicit in a separate candidate fragment. No game/UI source changes are authorized by this artwork run.

Wick is the canonical ceramic automaton, pixel screen face, ear discs, offset fasteners, short asymmetric capelet, lantern heart, chunky mittens/boots. The Mind Without Fog cup is only that trait's prop. Pure-white flat ink and real transparent holes, no glow or gray. Object-only recipes must stay object-only. Raw chat thumbnails can make faint transparent RGB look like grunge; inspect charcoal composites and alpha. Faint alpha 9..119 divided by solid alpha >=250 must stay below 0.15. No source upscaling. Portraits use centered aspect-preserving 4:5 crop, then 800x1000 export.

## Verified checkpoint

Scoped delivery validator, all ink alpha audits and changed 44px safe-box/circle checks pass at 344. Web asset build passes, 1960 assets. A fresh baseline check confirms all 1,404 master/native/export files from the original 175, including Palm #258, are unchanged. Full-library validation still fails at the pre-existing historical Bulwark export-set mismatch (`Production UI sizes missing: bulwark`); see full-library-check-344.txt. Do not hide this or claim full validation passed.

The 94-candidate incremental ZIP, preview, SHA-256 and delivery note are linked from CONTINUATION-DELIVERY-344.md. It adds to checkpoint 250; it is not a full 344-image library. Old ZIPs are immutable. Preserve every native render and replaced asset. All delivered images are unapproved review candidates. Publish completed work to art/nine-doors-2026-11-16 with current ledgers, previews, checksums and honest handoff; never promise auto-resume.
'''
# The brief owns exact filenames; spell them accurately in the next-job table below.
detail=detail.replace('**#271 free focus**, `art/icons/camp/free-focus.png`; **#272 spend budget**, **#273 starting boon**, **#274 ready**.', '; '.join(f"**#{x['number']} {x['name']}**, `{x['path']}`" for x in sorted(pending,key=lambda x:x['number']))+'.')
(a/'RESUME-AUDIT-2026-11-17.md').write_text(detail)
notice='\n\n**Current image-generation blocker:** actual HTTP 429 usage limit on 17 November 2026; reset reported at 13:28:30 Bangkok. Read [the fresh resumption handoff](RESUME-AUDIT-2026-11-17.md) and [service details](generation-limit-2026-11-17.json). Next legacy jobs: #271–274. Added 0.30 requests: 0/41 delivered.\n'
for name in ['CURRENT-CHECKPOINT.md','CONTINUE.md','RESUME-PROMPT.md']:
 p=a/name;p.write_text(p.read_text()+notice)
p=r/'art/briefs/NINE-DOORS-ART-HANDOFF-2026-11-16.md';s=p.read_text();s=s.replace('<!-- /current-continuation -->','> **Current blocker:** actual image quota, 17 Nov; reset reported 13:28:30 Bangkok. [Fresh resumption handoff](../_archive/nine-doors/2026-11-16/RESUME-AUDIT-2026-11-17.md).\n<!-- /current-continuation -->');p.write_text(s)
delivery='''# Nine Doors — 344-candidate checkpoint

**94 new review candidates since checkpoint 250; legacy total 344/375.** These include all 54 techniques, nine class portraits, nine door emblems, four painted gloves and 18 final legacy icons/signs. The Breaker portrait was remade completely from scratch after the user's axe correction; both rejected versions remain archived.

- [Preview the 94 additions](review/continuation-overview-344-from-250.jpg).
- [Download the incremental ZIP](deliveries/continuation-344-from-250-candidates.zip) and [SHA-256](deliveries/continuation-344-from-250-candidates.zip.sha256). This adds 94 candidates to checkpoint 250; it is not the full 344-image library.
- [Fresh handoff for the next GPT](RESUME-AUDIT-2026-11-17.md), [remaining queue](CONTINUE.md), [0.30 queue](planned-jobs-0.30.json), and [user corrections](USER-CORRECTIONS.md).

Image generation hit HTTP 429 usage_limit_reached at the four remaining camp signs #271–274. Reported reset: **17 November 2026 13:28:30 Bangkok**. There are **4 eligible legacy jobs + 41 additional 0.30 requests = 45 outstanding request records**. All 27 unfinished held old recipes remain held; previously delivered Palm #258 remains unchanged and held for review. The added proposals remain **0/41 delivered**.

Scoped source/master/catalog/export checks pass; white-ink alpha and changed 44px bounds pass; asset build passes (1960 assets). All 1,404 original baseline files remain byte-identical, including Palm. Native sources are preserved without upscaling. Full-library validation still reports the pre-existing Bulwark export-set mismatch; see [validation](continuation-validation.json), [full-library log](full-library-check-344.txt) and [fresh preservation check](continuation-preservation-check-344.json).

No gameplay or UI source changes. Every delivered asset remains a review candidate, with production_approved and implementation_ready false. Quota failures are documented and are not counted as completed artwork.
'''
(a/'CONTINUATION-DELIVERY-344.md').write_text(delivery)
paths={'art/catalog.json'}
for x in new:
 paths.update([x['path'],x['source_path'],f"{rel}/records/{x['number']:03}.json"]);paths.update(x.get('exports',{}).values())
for p in (a/'review').glob('continuation*.jpg'):
 if p.name!='continuation-overview-250.jpg' and p.name!='continuation-preview-178.jpg':paths.add(p.relative_to(r).as_posix())
for parent in ['superseded/044-axe-head-geometry-fix','superseded/044-rejected-axe-correction','continuation-tools','generation-failures']:
 paths.update(p.relative_to(r).as_posix() for p in (a/parent).rglob('*') if p.is_file())
for name in ['CONTINUATION-DELIVERY-344.md','RESUME-AUDIT-2026-11-17.md','USER-CORRECTIONS.md','generation-limit-2026-11-17.json','CURRENT-CHECKPOINT.md','CONTINUE.md','CONTINUE-0.30.md','RESUME-PROMPT.md','planned-jobs.json','planned-jobs-0.30.json','source-doors-3.0-revision-2.md','holds-0.30.json','art-hold-list-0.30.md','progress.json','progress-0.30.json','delivery-counts.json','manifest.json','catalog-fragment.json','continuation-validation.json','continuation-preservation-check-344.json','full-library-check-344.txt','continuation-scoped-check.txt','continuation-asset-build-check.txt','alpha-audit.json']:
 paths.add(f'{rel}/{name}')
dst=a/'deliveries/continuation-344-from-250-candidates.zip';assert not dst.exists()
with zipfile.ZipFile(dst,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for path in sorted(paths):z.write(r/path,path)
 z.writestr('README.txt',delivery+'\nBuilt '+stamp+'\n')
with zipfile.ZipFile(dst) as z:
 assert z.testzip() is None
 for path in paths:assert hashlib.sha256(z.read(path)).hexdigest()==sha(r/path)
assert dst.stat().st_size<100_000_000,'Split archive before publishing to GitHub'
dst.with_suffix('.zip.sha256').write_text(sha(dst)+'  '+dst.name+'\n')
(a/'delivery-344-verification.json').write_text(json.dumps({'built_at':stamp,'legacy_total':344,'increment_baseline':250,'new_candidates':94,'new_by_kind':dict(Counter(x['kind'] for x in new)),'zip_files':len(paths)+1,'zip_bytes':dst.stat().st_size,'zip_sha256':sha(dst),'zip_crc_and_every_source_file_hash_verified':True,'remaining_eligible_legacy':[x['number'] for x in pending],'added_030_delivered':0,'added_030_pending':41},indent=2)+'\n')
print((a/'delivery-344-verification.json').read_text())
