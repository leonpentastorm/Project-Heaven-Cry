from pathlib import Path
from PIL import Image,ImageDraw
import json,hashlib,shutil,subprocess,importlib.util
R=Path(__file__).parent;O=R/'delivery';ARC='art/_archive/figments/2026-11-15';A=O/ARC
rows=[json.loads(p.read_text()) for p in sorted((A/'records').glob('*.json'))];assert len(rows)==38
refs={Path(p).name:p for p in json.loads((R/'reference-paths.json').read_text())};refs.update({'mind-without-fog.png':'art/icons/traits/mind-without-fog.png','shop.png':'art/icons/survival/markers/shop.png'})
def portable(p):
 if '/delivery/art/' in p:return 'art/'+p.split('/delivery/art/',1)[1]
 if '/references/' in p:return refs.get(Path(p).name,p)
 return p
cat=json.loads((R/'catalog-baseline.json').read_text());fragment={}
for r in rows:
 r['refs']=[portable(p) for p in r['refs']];stem=Path(r['path']).stem;family='figments' if r['mode']=='portrait' else 'figment_icons';key=stem;r['catalog_family']=family;r['catalog_id']=key
 e={'label':r['name'],'path':r['path'],'sha256':r['sha256'],'width':r['export_dimensions'][0],'height':r['export_dimensions'][1],'native_dimensions':r['native_dimensions'],'source_path':r['source_path'],'background':'opaque' if r['mode']=='portrait' else 'transparent','mode':'heavenprint-abstract-figment' if r['mode']=='portrait' else 'white-flat-ink','status':'review-candidate','production_approved':False,'implementation_ready':False,'collection':'figments-2026-11-15','brief_number':r['number'],'upscaled':False}
 if r['mode']=='portrait':e.update(form=stem.removeprefix('figment-'),token_crop=r['token_crop'],token_center=[400,480],token_radius=280)
 else:e.update(exports=r['exports'],kind='trait' if stem.startswith('trait-') else 'order')
 cat.setdefault(family,{})[key]=e;fragment.setdefault(family,{})[key]=e;(A/'records'/f"{r['number']:02d}.json").write_text(json.dumps(r,indent=2)+'\n')
(O/'art/catalog.json').write_text(json.dumps(cat,indent=2)+'\n');(A/'catalog-fragment.json').write_text(json.dumps(fragment,indent=2)+'\n');(A/'manifest.json').write_text(json.dumps(rows,indent=2)+'\n')
for src,name in [('brief.md','original-brief.md'),('audit.json','audit.json'),('export-one.py','export-one.py'),('review.py','review.py'),('validate-delivery.py','validate-delivery.py'),('package-delivery.py','package-delivery.py')]:shutil.copy2(R/src,A/name)
# Preserve actual review pixel sizes when joining the two section sheets.
sheets=[Image.open(A/'review/portraits.jpg'),Image.open(A/'review/inks.jpg')];width=max(s.width for s in sheets);height=sum(s.height for s in sheets)+80;contact=Image.new('RGB',(width,height),'#10151f');d=ImageDraw.Draw(contact);y=0
for title,s in zip(['14 Figment portraits: 40 / 64 / 128 px token checks','24 trait and order icons: 32 / 64 / 128 px checks'],sheets):
 d.text((12,y+10),title,fill='white');y+=40;contact.paste(s,((width-s.width)//2,y));y+=s.height
contact.save(A/'contact-sheet.jpg',quality=94)
readme='''# Figments: 14 portraits and 24 icons, 15 November 2026

All 38 rows of GPT-PROMPTS-2026-11-15-figments.md have new review candidates. Source brief and design branch: wip/design-figments-2, commit 89c59126941eb2ae074616adff26ef001104c117. Delivery branch: art/figments-2026-11-15. No production approval or runtime wiring is implied.

Start with contact-sheet.jpg in this archive. The section sheets in review/ retain actual-size 40/64/128px portrait token crops and 32/64/128px ink exports. The portraits are opaque 800x1000 RGB, cream and Expression petrol-blue on black. They depict made bot forms, not living people or animals. No separate token artwork is needed: use the portrait crop rectangle [120,200,680,760], then a circular mask. That corresponds to the requested diameter 560 circle centred at [400,480]. Export framing uniformly scales and centres the complete native painting; no figure or cue is chopped off. A 32px radial margin protects the token edge. Pixels below a visibility threshold are reported in validation, rather than represented as an indexed-palette guarantee.

The 24 new icons are pure-white RGBA at 1024px with transparent cuts and a central 820px safe box; UI exports are under art/icons/figments/exports/. Icons show objects and gestures, with no additional Wick figure. No monoline SVG, older trait, Picture/Let Go, Visualizer glove, Scrap Turret or effect-sheet work was created. The immutable original brief is only copied into this archive; its production copy is unchanged.

Every generated native is retained unchanged. Portrait natives are 1122x1402 and icon natives 1254x1254; exports are downsampled, with no upscaling or invented extra detail. Per-image records contain prompts, reference paths, native/source hashes, export crop/placement and token coordinates. Masters, sources and recorded first candidates are preserved in superseded/. Double and Ferry received silhouette corrections; Draw Fire and Fix received semantic corrections. The historical archive notes any master reconstructed from its unchanged native with the original export procedure.

Catalog proposals are in the new figments (14 portraits) and figment_icons (24 icons) maps. catalog-fragment.json supplies only those additions. File names are the exact brief names. A builder still needs to register these maps in the asset build and bind form/trait/order IDs, then review and remove pending flags. Keep the existing code glyphs as fallbacks until that intake is complete. These entries remain review-candidate, production_approved false and implementation_ready false.

Run python3 art/_archive/figments/2026-11-15/validate-delivery.py from the repository root (or pass --root). It checks all 38 master/catalog/source hashes, modes and dimensions, full token-circle coverage, small-token visible content, all white-icon RGB/alpha bounds and UI exports, and superseded file hashes. The repository white-alpha decoder also checks each ink 64px export. Full historical-library validation stops on assets absent from this delivery checkout; see full-library-check.txt. The repository checksum tool is run on the delivery snapshot and its result merged with the unchanged baseline checksum entries, retaining absent historical files.

All 38 artwork rows in this brief are painted. Runtime integration and Leon's visual approval remain pending. Older Classes 3.0 assets requested elsewhere remain outside this delivery.
'''
(A/'README.md').write_text(readme);(O/'README.md').write_text(readme)
style=O/'art/style-guide';style.mkdir(exist_ok=True);shutil.copy2(R/'style-guide-baseline.md',style/'PHC-Style-Guide.md');shutil.copy2('/workspace/phc-gear-publish/art/style-guide/palette.json',style/'palette.json')
tools=O/'tools';tools.mkdir(exist_ok=True)
for f in ['validate_art.py','rehash_art_checksums.py']:shutil.copy2(R/'tools-baseline'/f,tools/f)
res=subprocess.run(['python3',str(A/'validate-delivery.py'),'--root',str(O)],capture_output=True,text=True);(A/'validation-run.txt').write_text(res.stdout+res.stderr);assert res.returncode==0,res.stdout+res.stderr
spec=importlib.util.spec_from_file_location('phc_validate',tools/'validate_art.py');v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
for r in rows:
 if r['mode']=='ink':v.validate_white_rgba((O/r['exports']['64']).read_bytes(),r['exports']['64'],clear_border=True,box_fraction=.85)
full=subprocess.run(['python3',str(tools/'validate_art.py')],capture_output=True,text=True);(A/'full-library-check.txt').write_text(full.stdout+full.stderr)
validation={'count':38,'portraits':14,'trait_icons':12,'order_icons':12,'master_catalog_native_hashes_pass':True,'dimensions_modes_pass':True,'whole_painted_form_inside_token_circle_pass':True,'portrait_token_sizes_checked':[40,64,128],'portrait_outside_circle_maximum_rgb':4,'white_ink_24_masters_and_exports_pass':True,'repository_white_alpha_decoder_24_exports_pass':True,'superseded_hashes_pass':True,'upscaled_count':0,'full_library_validation_exit':full.returncode,'full_library_limitation':'Historical assets absent from this sparse delivery snapshot; see full-library-check.txt','palette_review':'Visual check against Expression anchors; generated gouache is not claimed to be an indexed hex palette.'}
(A/'validation.json').write_text(json.dumps(validation,indent=2)+'\n');print(res.stdout);print('PASS: repository white-alpha decoder on all 24 ink 64px exports. Full library exit:',full.returncode)
