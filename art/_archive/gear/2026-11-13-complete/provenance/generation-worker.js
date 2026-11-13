async function runChunk(start,end) {
 const jobs=load("remaining_gear").filter(p=>p.number>=start&&p.number<=end);let next=0,blocked=false;
 async function worker(){while(next<jobs.length&&!blocked){const p=jobs[next++];try{
 const r=await tools.image_gen__imagegen({prompt:p.prompt,referenced_image_paths:p.references,transparent_background:true});
 const source=r.output_hint.match(/\/workspace\/generated_images\/[^\s]+\.png/)[0];
 const rec={number:p.number,filename:p.filename,source,prompt:p.prompt};
 const q=s=>"'"+s.replace(/'/g,"'\\''")+"'";
 await tools.exec_command({cmd:"cp "+q(source)+" "+q("/workspace/phc-gear-2026-11-13/remaining-native/"+p.filename)+"\nprintf '%s\\n' "+q(JSON.stringify(rec,null,2))+" > /workspace/phc-gear-2026-11-13/remaining-results/"+p.number+".json",max_output_tokens:100});
 store("gear_rest_"+p.number,rec); generatedImage(r);text({completed:p.number,name:p.filename});
 }catch(e){const error=String(e);store("gear_error_"+p.number,error);text({failed:p.number,error});if(/quota|rate.limit|limit reached|too many/i.test(error)){blocked=true;store("gear_quota_block",error);}}}}
 await Promise.allSettled(Array.from({length:4},()=>worker())).then(rs=>rs.forEach(r=>{if(r.status==="rejected")text(String(r.reason))}));
}
