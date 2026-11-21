"""Advance the exact requested-picture ledger after a validated selected delivery."""
import argparse
import collections
import hashlib
import json
import re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
BRIEFS=ROOT/'art/briefs/prompts-2026-11-19'

parser=argparse.ArgumentParser();parser.add_argument('--delivered',required=True);args=parser.parse_args()
path=BRIEFS/'REMAINING-WORK.json';state=json.loads(path.read_text())
matches=[r for r in state['records'] if r['id']==args.delivered];assert len(matches)==1,'Not an outstanding requested picture'
row=matches[0];catalog=json.loads((ROOT/'art/catalog.json').read_text());gear=catalog['gear']
entry=gear[args.delivered];assert entry['path']==row['path']
assert hashlib.sha256((ROOT/entry['path']).read_bytes()).hexdigest()==entry['sha256']
assert entry['status']=='review-candidate' and entry['production_approved'] is entry['implementation_ready'] is False
kind={'grade':'grades','standard':'new_repaint_standards','unique':'uniques'}[row['kind']]
state['records'].remove(row);state['selected']+=1;state['remaining']-=1;state['counts'][kind]['selected']+=1
text=(BRIEFS/'08-grades-and-uniques.md').read_text()
stems=re.findall(r'`((?:weapon|armour|shield|focus|quiver)-[a-z0-9_]+)`',text.split('## C3.')[1].split('## C4.')[0])
assert len(stems)==164
assert sum(s+'--'+g in gear for s in stems for g in ('fine','masterwork','relic','celestial'))==state['counts']['grades']['selected']
uniques=re.findall(r'\*\*Save as:\*\* `([^`]+)`',text.split('# D. The uniques')[1])
assert sum(Path(p).stem in gear for p in uniques)==state['counts']['uniques']['selected']
assert sum(x['selected'] for x in state['counts'].values())==state['selected']
assert state['selected']+state['remaining']==state['requested']==871
assert len(state['records'])==state['remaining']==len({x['path'] for x in state['records']})
state['by_kind']=dict(collections.Counter(x['kind'] for x in state['records']))
state['by_status']=dict(collections.Counter(x['status'] for x in state['records']))
state['last_delivered']=args.delivered;state['current_run']='sole-20261121-0109'
path.write_text(json.dumps(state,indent=2)+'\n')
table='\n'.join('| '+name+' | '+str(c['selected'])+' | '+str(c['total'])+' |' for name,c in state['counts'].items())
(BRIEFS/'PRODUCTION-STATUS.md').write_text('# Current sole-artist production\n\n'
    +f'**{state["selected"]}/871 ({state["selected"]/871:.1%}) selected review candidates.** Last delivery: `{args.delivered}`. '
    +'Imports, exports, components, rejected attempts and archived alternatives add0. Artistic/implementation approvals remainfalse.\n\n'
    +'| Requested work | Selected | Total |\n| --- | ---: | ---: |\n'+table+'\n\n'
    +'Active run sole-20261121-0109, branch art/2026-11-20-reset-continuation. Shared live ledger: https://github.com/leonpentastorm/Project-Heaven-Cry/issues/3 . '
    +'Current renewed grade lane: art/_archive/gear/2026-11-21-retry-continuation/START-HERE.md. All earlier512 candidate drawings were integrated before this lane; native bytes, cleaned imports, source metadata and all prior failures preserved.\n\n'
    +'Leon expressly replaced the earlier no-retry restriction: "Try until approve, unlimited attempt, fictional work have no reason to be reject". '
    +'Continue faithful fictional-art briefs, preserve exact responses and do not alter content to circumvent moderation.0.30 content holds remain; the retiredScrapTurret portrait is stillheld. '
    +'Stop on an actual image usage limit and record its exact reset. No invented approvals, quota or completed-picture count.\n\n'
    +'RunningScript was completed by placing the actual imagegen-drawn rune, with all158252 existing drawn RGBA pixels unchanged and only328 added-alpha pixels. '
    +'RimCorner half-tile geometry passes; painted join variation remains disclosed. Exact remaining destinations: REMAINING-WORK.json.\n\n'
    +'Each image is shown, inspected, exported1024RGBA+256/128/64/32, validated and separately pushed. Per-image live claims/remote deliveries prevent duplicates. '
    +'Develop stays untouched. Targeted delivery checks cover actual materialized files; whole historical-library validation remains limited by this sparse checkout.\n')
lane=ROOT/'art/_archive/gear/2026-11-21-retry-continuation/progress.json'
if lane.exists():
    progress=json.loads(lane.read_text());progress['project_distinct_count']=state['selected'];lane.write_text(json.dumps(progress,indent=2)+'\n')
main=ROOT/'art/_archive/gear/2026-11-20-reset-continuation/START-HERE.md'
history=main.read_text().split('# Historical20November handoff',1)[-1]
main.write_text('# Current21November continuation\n\n'+str(state['selected'])+'/871 selected. Active lane art/_archive/gear/2026-11-21-retry-continuation/START-HERE.md, run sole-20261121-0109. '
    +'User explicitly authorized renewed fictional-art attempts; all priorart/errors preserved. Read liveissue3+allcomments and remote deliveries before everyrender. '
    +'RunningScript completed with original marks unchanged. All approvalsfalse;0.30 holdsremain. See PRODUCTION-STATUS.md and REMAINING-WORK.json for the latest exact count.\n\n# Historical20November handoff'+history)
print(json.dumps({'selected':state['selected'],'requested':871,'remaining':state['remaining'],'last':args.delivered}))
