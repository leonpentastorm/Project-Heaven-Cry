"""Place only the existing imagegen rune; preserve every original drawn pixel."""
import hashlib
import json
import shutil
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[4]
BASE=Path(__file__).resolve().parent
DEST=BASE/'selected/066-v1'

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def rec(path):
    return {'path':path.relative_to(ROOT).as_posix(),'sha256':sha(path)}

def dump(path,value):
    path.write_text(json.dumps(value,indent=2)+'\n')

if __name__=='__main__':
    assert not DEST.exists(),'Preserve existing attempt; do not overwrite'
    DEST.mkdir(parents=True)
    plan=json.loads((BASE/'attempts/066-rune-only-v2/component-plan.json').read_text())
    source=ROOT/plan['source_path'];component=ROOT/plan['component_path']
    assert sha(source)==plan['source_sha256'] and sha(component)==plan['component_sha256']
    original=Image.open(source).convert('RGBA');rune=Image.open(component).convert('RGBA')
    x,y=plan['proposed_top_left'];assert original.size==(1024,1024) and rune.size==tuple(plan['size'])
    old=np.array(original);new_ink=np.array(rune)[:,:,3]>0
    assert not ((old[y:y+rune.height,x:x+rune.width,3]>0)&new_ink).any()
    assembled=original.copy();assembled.alpha_composite(rune,(x,y));new=np.array(assembled)
    old_marks=old[:,:,3]>0;outside=np.ones((1024,1024),bool);outside[y:y+rune.height,x:x+rune.width]=False
    assert np.array_equal(old[old_marks],new[old_marks]),'An original mark changed'
    assert np.array_equal(old[outside],new[outside]),'Pixels outside addition changed'
    assert assembled.convert('RGB').getextrema()==((255,255),)*3
    shutil.copyfile(source,DEST/'original-1024.png')
    shutil.copyfile(component,DEST/'generated-rune-31x50.png')
    assembled.save(DEST/'assembled-1024.png')
    catalog=json.loads((ROOT/'art/catalog.json').read_text());bindings=[]
    for family,entries in catalog.items():
        if not isinstance(entries,dict):continue
        for key,entry in entries.items():
            if isinstance(entry,dict) and entry.get('path')==plan['source_path']:
                bindings.append({'family':family,'key':key,'entry':entry})
                for path in entry.get('exports',{}).values():
                    previous=DEST/'superseded'/path;previous.parent.mkdir(parents=True,exist_ok=True)
                    assert (ROOT/path).is_file(),path;shutil.copyfile(ROOT/path,previous)
    assert len(bindings)==1
    dump(DEST/'previous-catalog.json',bindings)
    exports={}
    for size in (256,128,64,56,48,44,40,32,24):
        target=DEST/f'exports/{size}/sigil-running-script.png';target.parent.mkdir(parents=True,exist_ok=True)
        small=assembled.resize((size,size),Image.Resampling.LANCZOS)
        white=Image.new('RGBA',small.size,'white');white.putalpha(small.getchannel('A'))
        white.save(target);exports[str(size)]=rec(target)
    background=Image.new('RGBA',assembled.size,'#10151F');background.alpha_composite(assembled);background.convert('RGB').save(DEST/'preview-1024.png')
    sheet=Image.new('RGB',(620,290),'#10151F');draw=ImageDraw.Draw(sheet)
    for col,(name,image) in enumerate([('Original',original),('Added generated rune',assembled)]):
        draw.text((col*310+12,10),name,fill='white')
        for size,xx,yy in [(160,20,40),(64,200,40),(44,200,125),(32,200,190)]:
            item=image.resize((size,size),Image.Resampling.LANCZOS);sheet.paste(item,(col*310+xx,yy),item)
            draw.text((col*310+xx,yy+size+4),str(size)+'px',fill='white')
    sheet.save(DEST/'before-after-review.png')
    instruction='User continued with "continue working until 871" after the concrete question proposing only a generated-rune composite preserving all existing marks. Proceeding with that proposed localized assembly. New run sole-20261121-0109, issue3 RESUME7054863397. No artistic approval is implied. Component is actual imagegen art; no new strokes are drawn in code. Placement exactly630,620.\n'
    (DEST/'assembly-instruction.txt').write_text(instruction)
    record={'id':'fork.sigil.running_script','number':66,'file':3,'path':plan['source_path'],'candidate':rec(DEST/'assembled-1024.png'),'original':rec(DEST/'original-1024.png'),'component':rec(DEST/'generated-rune-31x50.png'),'imagegen_native':rec(ROOT/plan['native_path']),'imagegen_prompt':rec(BASE/'attempts/066-rune-only-v2/prompt.txt'),'component_plan':rec(BASE/'attempts/066-rune-only-v2/component-plan.json'),'assembly_instruction':rec(DEST/'assembly-instruction.txt'),'previous_catalog':rec(DEST/'previous-catalog.json'),'exports':exports,'preview':rec(DEST/'preview-1024.png'),'review':rec(DEST/'before-after-review.png'),'placement':[x,y],'proof':{'original_nonzero_alpha_pixels':int(old_marks.sum()),'original_mark_rgba_pixels_changed':int(np.any(old[old_marks]!=new[old_marks],axis=1).sum()),'outside_addition_rgba_pixels_changed':int(np.any(old[outside]!=new[outside],axis=1).sum()),'existing_mark_overlap':0,'added_nonzero_alpha_pixels':int(((new[:,:,3]>0)&~old_marks).sum())},'status':'review-candidate','production_approved':False,'implementation_ready':False,'count_contribution':1,'origin':'image_gen-drawn rune component; user-authorized localized alpha composition, original marks byte-identical'}
    dump(DEST/'delivery.json',record);print(json.dumps(record['proof']))
