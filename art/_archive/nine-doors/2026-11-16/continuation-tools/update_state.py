from pathlib import Path
from collections import Counter
import argparse, hashlib, json, re, shutil

p=argparse.ArgumentParser();p.add_argument('--root',type=Path,required=True);p.add_argument('ids',type=int,nargs='+');args=p.parse_args()
root=args.root.resolve();arc=root/'art/_archive/nine-doors/2026-11-16'
read=lambda p:json.loads(p.read_text())
def write(p,value):
    p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(value,indent=2)+'\n')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
jobs=read(arc/'planned-jobs.json');byid={j['number']:j for j in jobs};policy=read(arc/'holds-0.30.json');held=set(policy['held_legacy_ids'])
cat=read(root/'art/catalog.json')
for n in args.ids:
    assert n not in held, f'Held legacy recipe #{n}'
    r=read(arc/'records'/f'{n:03d}.json');old=cat[r['family']][r['id']].copy()
    assert sha(root/r['path'])==r['sha256'] and sha(root/r['source_path'])==r['source_sha256']
    if old.get('placeholder'):
        previous=root/old['path'];dest=arc/'superseded/placeholders'/r['id']/previous.name
        dest.parent.mkdir(parents=True,exist_ok=True)
        if dest.exists():assert sha(dest)==sha(previous)
        else:shutil.copy2(previous,dest)
        old.update(previous_path=dest.relative_to(root).as_posix(),previous_sha256=sha(dest))
    elif old.get('sha256')!=r['sha256']:
        raise AssertionError('Archive an existing non-placeholder candidate before replacement')
    old.update(label=('Wick — ' if r['kind']=='wick' and 'Wick' in r['paint'] else '')+r['name'],path=r['path'],sha256=r['sha256'],width=r['export_dimensions'][0],height=r['export_dimensions'][1],background='transparent' if r['transparent'] else 'opaque',status='review-candidate',production_approved=False,implementation_ready=False,collection='nine-doors-2026-11-16',native_dimensions=r['native_dimensions'],source_path=r['source_path'],upscaled=False,format='png',mode=r['kind'],brief_number=n,exports=r.get('exports',{}))
    if r['kind'] in ['wick','sign']:old['ink']='#FFFFFF'
    old.pop('placeholder',None);old.pop('wanted',None)
    cat[r['family']][r['id']]=old
    r['export_sha256']={size:sha(root/path) for size,path in r.get('exports',{}).items()}
    if n in [323,324]:r['continuation_review']='Reinspection on charcoal and quantitative alpha audit supersede the earlier preview-only rejection in continuation-attempts. Native source bytes and alpha were preserved.'
    r['visual_review']='Inspected on #10151F at the actual target sizes; delivered as an unapproved review candidate.'
    write(arc/'records'/f'{n:03d}.json',r)
write(root/'art/catalog.json',cat)
rows=[read(f) for f in sorted((arc/'records').glob('*.json'))];done={r['number'] for r in rows}
assert len(rows)==len(done)
write(arc/'manifest.json',rows)
fragment={}
for r in rows:fragment.setdefault(r['family'],{})[r['id']]=cat[r['family']][r['id']]
write(arc/'catalog-fragment.json',fragment)
remaining=[j for j in sorted(jobs,key=lambda j:(j['priority'],j['number'])) if j['number'] not in done]
eligible=[j for j in remaining if j['number'] not in held]
write(arc/'progress.json',{'total':375,'completed_count':len(done),'completed_ids':sorted(done),'remaining_count':len(remaining),'remaining_by_priority':{str(p):sum(j['priority']==p for j in remaining) for p in range(1,9)}})
new=read(arc/'planned-jobs-0.30.json');new_progress=read(arc/'progress-0.30.json');new_remaining=new_progress['remaining_count']
policy.update(held_legacy_already_delivered=sorted(held&done),held_legacy_pending=sorted(held-done),legacy_remaining=len(remaining),legacy_safe_remaining=len(eligible),combined_remaining_request_records=len(eligible)+new_remaining)
write(arc/'holds-0.30.json',policy)
write(arc/'delivery-counts.json',{'delivered':len(done),'delivered_by_kind':dict(Counter(r['kind'] for r in rows)),'remaining':len(remaining),'remaining_by_kind':dict(Counter(j['kind'] for j in remaining)),'remaining_by_priority':{str(p):sum(j['priority']==p for j in remaining) for p in range(1,9)},'remaining_by_mode':dict(Counter(j['mode'] for j in remaining)),'eligible_legacy_remaining':len(eligible),'held_legacy_remaining':len(held-done),'new_030_remaining':new_remaining,'combined_remaining_request_records':len(eligible)+new_remaining})
continuation=['# Continue the Nine Doors artwork — 0.30 scope applied','',f'Original ledger: **{len(done)}/375 delivered**. Original unfinished: **{len(remaining)} = {len(eligible)} eligible + {len(held-done)} held**. The 0.30 additions have **{new_progress["completed_count"]}/41 delivered**. Combined remaining: **{len(eligible)+new_remaining} request records**, including replacement/reuse checks.','', 'Read art-hold-list-0.30.md, holds-0.30.json and CONTINUE-0.30.md. All 28 old holds remain enforced. progress.json and records/ own old completion; progress-0.30.json owns added-request completion. Recipe pending flags are not ledgers.','', 'The latest delivered images are review candidates, never automatically approved. Preserve all originals and old assets. No gameplay or UI changes.','', '## Eligible old recipes, in priority order','']
continuation += [f'- P{j["priority"]} · #{j["number"]} · {j["name"]} · `{j["path"]}` · {j["mode"]}' for j in eligible]
continuation += ['', '## Additional 0.30 requests','', 'Use planned-jobs-0.30.json for exact source excerpts, provisional names, source questions and generation gates. Follow checks reuse first; four replacement depictions use the new rules, never held old recipes.','']
continuation += [f'- `{j["request_key"]}` · {j["name"]} · {j["status"]}'+(f' · source questions {j["open_source_questions"]}' if j['open_source_questions'] else '') for j in new['items'] if j['request_key'] not in new_progress['completed_keys']]
continuation += ['', '## Held old recipes — do not paint','']+[f'- #{n} · {byid[n]["name"]}' for n in sorted(held-done)]
continuation += ['', 'Already delivered and held for review: '+', '.join('#'+str(n) for n in sorted(held&done))+'. Preserve these files.','']
(arc/'CONTINUE.md').write_text('\n'.join(continuation))
scope=(arc/'CONTINUE-0.30.md').read_text();scope=re.sub(r'\*\*\d+/375 delivered\*\*',f'**{len(done)}/375 delivered**',scope);scope=re.sub(r'\*\*\d+ eligible \+ \d+ held\*\*',f'**{len(eligible)} eligible + {len(held-done)} held**',scope);scope=re.sub(r'\*\*\d+ request records\*\*',f'**{len(eligible)+new_remaining} request records**',scope);(arc/'CONTINUE-0.30.md').write_text(scope)
report=f'''# Current continuation checkpoint — 16 November 2026

Legacy delivery: {len(done)}/375 review candidates. Unfinished old rows: {len(remaining)}, of which {len(eligible)} eligible and {len(held-done)} held. New 0.30 additions: {new_progress['completed_count']}/41 delivered. Combined outstanding request records: {len(eligible)+new_remaining}.

The 28 old hold recipes remain enforced. Palm #258 remains preserved and held for review. None of the 41 newly queued proposals is completed merely by being queued.

The actual source composites for Last Turn #323 and Augment Offline #324 are clean. Their quantitative faint-alpha audit and actual-size review supersede the earlier preview-only rejection; no native source was altered. The original rejected glowing #323 remains archived separately and is not reactivated.

Review sheets are in review/. Master/export/source paths, actual native dimensions and SHA-256 values are in records/ and manifest.json. Every new image is review-candidate, production_approved false and implementation_ready false. See continuation-validation.json for the latest checks. Historical validation and blocker reports remain records of their original checkpoints.
'''
(arc/'CURRENT-CHECKPOINT.md').write_text(report)
resume=f'''# Resume the Nine Doors artwork

Continue art/nine-doors-2026-11-16 from its latest remote head. Read CURRENT-CHECKPOINT.md, CONTINUE.md, holds-0.30.json and the current style guide. Legacy delivered {len(done)}/375; {len(eligible)} eligible old jobs and {len(held-done)} held. New 0.30 requests remaining {new_remaining}/41. Combined outstanding request records {len(eligible)+new_remaining}.

Use records/progress as completion ledgers, not recipe pending fields. All 28 old hold recipes remain blocked, including Palm #258 already delivered. The four separately authorized replacement depictions use the new 0.30 rules, not old Paint instructions. Follow must check reuse; eight fork proposals retain source questions. Never invent approval or completion.

Wick is the approved ceramic pixel-screen automaton with capelet, lantern heart, chunky limbs and asymmetry. No default bowl, cup, halo or copied arrows. Sign and object-only rows must not gain a full Wick. Pure-white ink, transparency and no glow. Inspect source composites on charcoal; raw transparent chat thumbnails can misrepresent faint alpha. Preserve all native renders and replaced files. Use image generation for creative painting and edits; technical exports preserve source alpha.

Continue priority order from CONTINUE.md. Export exact UI sizes and review them, update catalog/records/manifests/queue/checksums, validate scoped assets and the full library/build where available. Check actual tools rather than trusting historical quota/environment blockers. Push reviewable completed work to the art branch, with preview/ZIP/checksum and a truthful fresh handoff. No game/UI changes and no automatic resume promise.
'''
(arc/'RESUME-PROMPT.md').write_text(resume)
handoff=root/'art/briefs/NINE-DOORS-ART-HANDOFF-2026-11-16.md';text=handoff.read_text();text=re.sub(r'<!-- current-continuation -->.*?<!-- /current-continuation -->\n*','',text,flags=re.S)
notice=f'<!-- current-continuation -->\n> **Latest delivery:** {len(done)}/375 legacy candidates; {len(eligible)} eligible old jobs + {len(held-done)} held; {new_remaining}/41 added 0.30 requests remain. Read [CURRENT-CHECKPOINT.md](../_archive/nine-doors/2026-11-16/CURRENT-CHECKPOINT.md) and the filtered CONTINUE.md. Earlier counts/tables below are historical.\n<!-- /current-continuation -->\n\n'
pos=text.index('\n\n')+2;handoff.write_text(text[:pos]+notice+text[pos:])
print(json.dumps({'delivered':len(done),'remaining_legacy_eligible':len(eligible),'held':len(held-done),'new_030_remaining':new_remaining,'total_outstanding_request_records':len(eligible)+new_remaining}))
