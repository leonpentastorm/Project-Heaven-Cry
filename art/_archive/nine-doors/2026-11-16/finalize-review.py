from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from collections import Counter
import json,numpy as np
R=Path(__file__).parent;O=R/'delivery';A=O/'art/_archive/nine-doors/2026-11-16';rows=[json.loads(p.read_text()) for p in (A/'records').glob('*.json') if p.stem.isdigit()];byid={r['number']:r for r in rows}
assert len(rows)==175 and 323 not in byid and 324 not in byid
audit=[]
for r in rows:
 if r['kind'] not in ['wick','sign']:continue
 mask=np.array(Image.open(O/r['path']).getchannel('A'));soft=int(((mask>8)&(mask<120)).sum());solid=int((mask>=250).sum());ratio=soft/max(solid,1);assert ratio<.15,(r['number'],ratio);audit.append({'number':r['number'],'name':r['name'],'faint_alpha_to_solid_area_ratio':round(ratio,4)})
(A/'alpha-audit.json').write_text(json.dumps({'method':'For delivered ink masters compare faint-alpha pixels 9..119 to solid-alpha pixels >=250. Ratio <0.15 distinguishes edge antialiasing from the rejected diffuse halos. No raster art was altered by this check.','passed':True,'records':audit,'excluded':[{'number':323,'reason':'Diffuse alpha glow; archived for repaint, excluded from delivered count and active catalog replacement.'}]},indent=2)+'\n')
ids=[1,2,123,135,171,220,251,137,3,27,58,83,104,140,173,183,258,287,291,167]
cw,ch=280,225;header=100;out=Image.new('RGB',(cw*5,header+ch*4+65),'#10151f');d=ImageDraw.Draw(out);font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';title=ImageFont.truetype(font,27);small=ImageFont.truetype(font,13);label=ImageFont.truetype(font,15)
d.text((24,18),'PROJECT HEAVEN CRY / NINE DOORS',font=title,fill='#eee6d4');d.text((24,59),'175 review candidates  /  Wick, combat actions, condition signs, gear and Figment lines',font=label,fill='#9da7bb')
for i,n in enumerate(ids):
 r=byid[n];x=i%5*cw;y=header+i//5*ch;im=Image.open(O/r.get('review_path',r['path'])).convert('RGBA');thumb=im.copy();thumb.thumbnail((220,155));out.paste(thumb,(x+(cw-thumb.width)//2,y),thumb);d.text((x+15,y+156),f'{n:03d}  {r["name"]}'[:31],font=label,fill='#eee6d4');d.text((x+15,y+178),r['mode'],font=small,fill='#a3aec2')
 s=24 if r['kind']=='sign' else 32;thumb=im.resize((s,s),Image.Resampling.LANCZOS);out.paste(thumb,(x+221,y+175),thumb)
d.text((24,out.height-43),'200 rows remain: image-generation quota reached. Cup/bowl is exclusive to Mind Without Fog.',font=label,fill='#e3bf51');out.save(A/'review/DELIVERY-OVERVIEW.jpg',quality=95)
counts=Counter(r['kind'] for r in rows);jobs=json.loads((R/'jobs.json').read_text());remaining=[j for j in sorted(jobs,key=lambda x:(x['priority'],x['number'])) if j['number'] not in byid];remaining_counts=Counter(j['kind'] for j in remaining)
resume='''# Resume the Nine Doors art delivery

Continue the unfinished 375-image brief for leonpentastorm/Project-Heaven-Cry. Do the artwork, not a reminder. Start from art/nine-doors-2026-11-16, which preserves the wip/feature-0.29 source brief at commit 8f9d45ae5c219bea418fac92d60a453b7af44d9a.

175 review candidates are complete; 200 rows remain. See art/_archive/nine-doors/2026-11-16/CONTINUE.md for the exact ordered rows, planned-jobs.json for each full Paint/Avoid prompt and filename, and records/ for authoritative completion. Recipe status fields are not completion records. Read the current style guide's mode table and attach the listed references. Existing completed work must be preserved. No new UI slots or game code.

Image generation returned usage_limit_reached (HTTP 429) on row #324. Reported reset is 16 November 2026 at 23:57:55 UTC / 17 November at 06:57:55 Bangkok. Check actual tool availability after that time. Do not fabricate painted art if still blocked.

Start with #323 Last Turn: repaint its simple one-grain hourglass with hard flat white edges and absolutely NO glow. The rejected source/master/exports are preserved in superseded/323-glow-repaint-pending/ and are not activated. Then #324 Augment Offline. Continue priority 5 class-rank moves/weapon techniques, priority 6 class portraits/door emblems, priority 7 four painted gloves plus Scrap Turret, then remaining designed rows. All five monoline SVGs (including Glass/Ferry/Breaker/Hush) are finished; do not redraw them. Their vector geometry and Inkscape proofs are genuine, not image-generation substitutes.

Wick is the approved ceramic automaton: pixel screen face, capelet, lantern heart and asymmetry. The cup/bowl over Mind Without Fog is that trait's prop ONLY, never Wick anatomy. Ignore the old brief's flame-head wording. White ink on transparency for Wick and signs, no glow/gray. Use generic human silhouettes for condition signs, never Wick. Object-only actions use object-only references, not full mascot casting. A 24px sign must remain legible; Wick is checked at 32/44px. Source PNGs are native 1254 square, exported aspect-preservingly at 1024; do not call them native 1024 or invent higher render resolution. Keep native sources and all replaced art.

Continue with image generation for painting/edits. Monoline SVGs may be drawn in house as the brief explicitly permits, but those five are already done. Class portraits require Original Heavenprint/New Faces casting anchors; gear needs painted object refs; Scrap Turret is cream welded junk and Expression blue on black, not a fleck creature. Reference preparation is incomplete for those future painted modes: read the guide before generating them.

Update catalog IDs/bindings, native/master/export checksums and exact remaining counts. Run rehash_art_checksums.py and validate_art.py plus relevant scoped checks and npm assets. Full historical checks currently stop at absent art/icons/skills/durability.png in the delivery-only checkout; do not claim they passed. Re-run in the full checkout when available. All new art stays review-candidate until approved. Push to the art branch; provide previews, a ZIP, checksum and a concise remaining list.

The workspace may retain /workspace/phc-nine-doors-2026-11-16 with exporter, review, checkpoint and sealing scripts, jobs, source refs and progress. Use these if present. The dedicated bare publisher is metadata-only after a verified push to save disk; use GIT_NO_LAZY_FETCH=1, changed-only staging, write-tree --missing-ok, pack.window=0 and push.negotiate=true. Do not fetch the entire art history. Preserve final ZIPs and generated originals. Do not promise automatic resumption unless a task scheduler is explicitly configured.
'''
(A/'RESUME-PROMPT.md').write_text(resume);(A/'delivery-counts.json').write_text(json.dumps({'delivered':len(rows),'delivered_by_kind':dict(counts),'remaining':len(remaining),'remaining_by_kind':dict(remaining_counts),'remaining_by_priority':{str(p):sum(j['priority']==p for j in remaining) for p in range(1,9)}},indent=2)+'\n');print((A/'delivery-counts.json').read_text())
