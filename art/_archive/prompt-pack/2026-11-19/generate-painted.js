async function paint(ids){
const root=load("phc19root"),arc=load("phc19arc"),rows=load("phc19jobs"),stage="/workspace/work/prompt-pack-19";
const base=load("latest-01-today-and-gaps.md").split("\n");
const gear=base.find(s=>s.startsWith("> Paint one game inventory icon")).slice(2);
const kit=base.find(s=>s.startsWith("> Paint one game-map kit piece")).slice(2);
await Promise.allSettled(ids.map(async n=>{
const row=rows.find(x=>x.n===n);
if(!row||row.status!=="pending"||!["gear","kit","ground"].includes(row.kind))throw Error("Cannot generate "+n);
const setting=row.path.split("/").at(-2);
const refs=row.kind==="gear"?["art/icons/gear/mod-foregrip.png","art/icons/gear/mod-bayonet.png","art/icons/gear/mod-compensator.png","art/portraits/world/new-faces/orren-vask.png",...(n===8?["art/icons/gear/weapon-afterword.png"]:[])]:[arc+"/references/"+setting+"-kit.jpg","art/sprites/objects/poi-marker.png","art/sprites/objects/fire.png","art/sprites/objects/rubble.png",...(n===13?["art/sprites/kit/rim/wall-straight.png"]:row.kind==="ground"?["art/sprites/kit/"+setting+"/ground-1.png"]:[])];
let prompt=(row.kind==="gear"?gear:kit)+"\n"+row.paint;
if(row.kind==="ground")prompt+="\nOne fully opaque square tile. Wrap geometry and lighting toroidally, exactly match opposite edges. No picture frame or margin.";
if(n===13)prompt+="\nUse the straight wall's cross-section. This joined piece intentionally touches ONLY the left and bottom frame edges, with exact flat open cut ends. The generic 80% safe-box instruction does not apply to the two joined wall ends.";
try{
const r=await tools.image_gen__imagegen({prompt,transparent_background:row.kind!=="ground",referenced_image_paths:refs.map(x=>root+"/"+x)});
const src=r.output_hint?.match(/\/workspace\/[^\s]+\.png/)?.[0];if(!src)throw Error("No native path returned");
await tools.apply_patch("*** Begin Patch\n*** Add File: "+stage+"/result-"+n+".json\n+"+JSON.stringify({n,src,prompt,refs})+"\n*** End Patch");store("phc19result"+n,{n,src,prompt,refs});generatedImage(r);await yield_control();
}catch(e){const error=String(e);store("phc19error"+n,error);text({n,error});if(/usage_limit_reached|http 429/i.test(error))store("phc19limit",error);await tools.apply_patch("*** Begin Patch\n*** Add File: "+stage+"/failure-"+n+"-"+Date.now()+".json\n+"+JSON.stringify({n,error,prompt,refs})+"\n*** End Patch");}
}));
}
