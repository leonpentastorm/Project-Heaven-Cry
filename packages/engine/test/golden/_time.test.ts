// @ts-nocheck
import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import * as R from './record';
it('x', () => {
  const T: any = {}; const times: any = {};
  for (const s of (process.env.SECT || 'Builds,Weapons,Enemies,Techniques,Sigil,Outburst,Faith,Items,Flat').split(',')) {
    const t0 = Date.now(); let ret: any;
    try { ret = R['record' + s](T); } catch (e) { console.log(s, 'THREW', e.stack.split('\n').slice(0, 6).join('\n')); }
    times[s] = Date.now() - t0;
    if (ret) writeFileSync('/tmp/claude-0/-home-user-Project-Heaven-Cry/40abf8cd-77d7-5315-b669-cee39d0cd8b9/scratchpad/ret-' + s + '.json', JSON.stringify(ret, null, 1));
  }
  console.log(JSON.stringify(times), Object.keys(T).length);
  writeFileSync('/tmp/claude-0/-home-user-Project-Heaven-Cry/40abf8cd-77d7-5315-b669-cee39d0cd8b9/scratchpad/out.json', JSON.stringify(T, null, 0).replace(/","/g, '",\n"'));
}, 120000);
