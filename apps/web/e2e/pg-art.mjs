// The Proving Ground's zone art (Leon's drill-yard painting) and the title theme starting on load (Leon, 9 Nov 2026).
// 1. With autoplay allowed (as Chrome allows it on sites you use often), the title theme plays as soon as the page
//    loads, before any key. 2. With autoplay refused (a fresh browser), the first key starts it. 3. The Proving
//    Ground's story screen shows its banner art (it was an empty box).
import { chromium, click, BASE, OUT } from './lib.mjs';
let fails = 0; const ok = (m, c) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const playing = (p) => p.evaluate(() => [...document.querySelectorAll('audio')].some((a) => !a.paused) || !!window.__phcTitleMusicPlaying?.());
const titleAudio = (p) => p.evaluate(() => { const a = window.__phcTitleAudio?.(); return a ? { paused: a.paused, src: a.src, t: a.currentTime } : null; });

// 1. Autoplay allowed
let b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
let p = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
await p.goto(BASE);
// The title opens once its small images are in (slow on a fresh server): wait for it, then give the theme a moment.
await p.waitForFunction(() => !!window.__phcTitleAudio?.(), null, { timeout: 90000 }).catch(() => {}); await p.waitForTimeout(1500);
let a = await titleAudio(p);
ok('autoplay allowed: the title theme plays on load, before any key (' + JSON.stringify(a) + ')', !!a && !a.paused && /heaven-cry/.test(a.src));
await b.close();

// 2. Autoplay refused: the first key starts it
b = await chromium.launch({ args: ['--autoplay-policy=document-user-activation-required'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
p = await ctx.newPage();
await p.goto(BASE); await p.waitForTimeout(4000);
a = await titleAudio(p);
ok('autoplay refused: nothing plays before a gesture (' + JSON.stringify(a) + ')', !a || a.paused);
await p.keyboard.press('Space'); await p.waitForTimeout(1200);
a = await titleAudio(p);
ok('the first key starts it (' + JSON.stringify(a) + ')', !!a && !a.paused);

// 3. The Proving Ground's banner (a fresh page, as sandbox.mjs opens it)
await b.close(); b = await chromium.launch();
const c3 = await b.newContext({ viewport: { width: 1440, height: 1000 } });
await c3.addInitScript(() => { try { localStorage.setItem('phc.voice', JSON.stringify({ auto: false })); localStorage.setItem('phc.tips', '["*"]'); sessionStorage.setItem('phc.pressedAnyKey', '1'); } catch { /* */ } });
p = await c3.newPage();
await p.goto(BASE);
await click(p, 'PROVING GROUND', { timeout: 90000 });
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 8000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 8000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
await p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 15000 });
await p.waitForTimeout(1500);
// the tools centre's banner (the story column's copy is hidden under it)
const img = await p.evaluate(() => { const all = [...document.querySelectorAll('img')].filter((x) => /ill-proving-ground-drill-yard/.test(x.src)), i = all.find((x) => x.getBoundingClientRect().height > 0) || all[0]; return i ? { src: i.src, w: i.naturalWidth, h: i.getBoundingClientRect().height } : null; });
ok('the Proving Ground shows its drill-yard banner (' + JSON.stringify(img) + ')', !!img && img.w > 0 && img.h > 100);
await p.screenshot({ path: OUT + 'pg-art/pg-banner.png' });
await b.close();
console.log(fails ? fails + ' FAIL' : 'all ok'); process.exit(fails ? 1 : 0);
