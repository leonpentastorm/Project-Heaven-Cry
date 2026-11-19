async function run(ids){
const j=load("phc19jobs"),root=load("phc19root"), stage="/workspace/work/prompt-pack-19";
const wick=["art/icons/traits/mind-without-fog.png","art/icons/perks/bulwark.png","art/icons/perks/bedside-manner.png","art/icons/perks/before-the-blink.png"];
const signs=["art/icons/banners/fight-start.png","art/icons/banners/fight-won.png","art/icons/banners/fight-lost.png","art/icons/banners/fight-field.png","art/icons/boons/edge.png"];
await Promise.allSettled(ids.map(async n=>{
const a=j.find(q=>q.n===n);if(!a||a.status!=="pending")throw Error("not pending: "+n);
const block=(load("latest-"+a.source)??load(a.source)).split("\n").filter(x=>x.startsWith("> Draw one icon"));
const base=(a.kind==="sign"?block.find(x=>x.includes("This icon is a sign")):block.find(x=>x.includes("Wick is the only full"))).slice(2).replace("small flame-headed figure","small ceramic pixel-screen automaton");
const style=a.kind==="wick"?"Wick always has the exact approved oversized rounded ceramic screen head, transparent face recess with white pixel expression, ear discs, offset shell fittings, short asymmetric capelet, lantern-heart inset, chunky mitten hands and cuffed boots. The silhouette of the head ends at the smooth ceramic shell. There is NO flame, tuft, plume, candle or object attached to or above his head. Resolve any stale flame wording through the angle or pixel expression. Omit default floating cup and reference arrows.":"One crisp standalone symbol with generous transparent margin. No Wick. Use only the requested components.";
const extra=(a.staging??"")+" "+(n===3?"Show recovery through posture and pixel expression; retain the usual round chest lantern with a simple dark slit, no separate plus or external health glyph. Two tiny breath ticks inside the outer silhouette.":"");
const refs=a.refs??(a.kind==="sign"?signs:wick);
const prompt=[base,(a.renderPaint??a.paint).replace(/the flame of his head burning taller than a moment ago/gi,"his rectangular screen head rising and pixel eyes opening with renewed resolve").replace(/flame-headed/gi,"ceramic screen-headed").replace(/flame head/gi,"ceramic screen head").replace(/flame of (his|Wick's) head/gi,"tilt of $1 ceramic screen head"),style,extra,"All dark voids are physically transparent alpha cutouts, never solid black or gray. Clear border, stable negative space at game size, pure white flat ink."].join("\n");
try{
const r=await tools.image_gen__imagegen({prompt,transparent_background:true,referenced_image_paths:refs.map(x=>root+"/"+x)});
const src=r.output_hint?.match(/\/workspace\/[^\s]+\.png/)?.[0];if(!src)throw Error("No native path returned");
const saved=await tools.apply_patch("*** Begin Patch\n*** Add File: "+stage+"/result-"+n+".json\n+"+JSON.stringify({n,src,prompt,refs})+"\n*** End Patch");store("phc19result"+n,{n,src,prompt,refs});generatedImage(r);await yield_control();
}catch(e){const error=String(e);store("phc19error"+n,error);text({n,error});if(/usage_limit_reached|HTTP 429|http 429/.test(error))store("phc19limit",error);await tools.apply_patch("*** Begin Patch\n*** Add File: "+stage+"/failure-"+n+"-"+Date.now()+".json\n+"+JSON.stringify({n,error,prompt,refs})+"\n*** End Patch");}
}));}
