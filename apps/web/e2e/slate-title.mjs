// Title screen at six window sizes (the slate pass): the title words never clip, the layered key art is in,
// Wick's clips play, and hover still works on other rows while Wick says hello after a press.
import { chromium, OUT, BASE, pause, titleHoverDuringHello } from './lib.mjs';
const SHOTS = process.env.SHOTS || OUT;
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const browser = await chromium.launch();
const SIZES = [[1280, 720], [1440, 900], [1920, 1080], [2560, 1440], [900, 800], [390, 844]];
// One context for every size, so the art preloader runs once and later sizes come from the cache.
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { if (!location.search.includes('fresh')) sessionStorage.setItem('phc.pressedAnyKey', '1'); localStorage.setItem('phc.tips', '["*"]'); } catch { /* */ } });
const page = await ctx.newPage(), errors = [];
page.on('pageerror', (e) => errors.push(e.message));
for (const [w, h] of SIZES) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto(BASE);
  await page.waitForSelector('nav[aria-label="Main menu"] [data-item]', { timeout: 90000 });
  await page.evaluate(() => document.fonts.ready);
  await pause(page, 1600);
  const fit = await page.evaluate(() => {
    const words = [...document.querySelectorAll('.phc-word')];
    const col = document.querySelector('.phc-col');
    const cr = col.getBoundingClientRect();
    const right = Math.max(...words.map((x) => x.getBoundingClientRect().right));
    const imgs = [...document.querySelectorAll('.phc-layer-img')].map((i) => ({ src: i.currentSrc.split('/').pop(), done: i.complete && i.naturalWidth > 0, op: getComputedStyle(i).opacity }));
    return { right, colRight: cr.right - parseFloat(getComputedStyle(col).paddingRight || '0'), sh: col.scrollHeight, ch: col.clientHeight, px: getComputedStyle(document.querySelector('.phc-wordmark')).fontSize, words: words.map((x) => x.textContent), imgs, inner: innerWidth };
  });
  ok(`${w}x${h}: title words fit (${fit.px}, right ${Math.round(fit.right)} <= col ${Math.round(fit.colRight)}, vw ${fit.inner})`, fit.right <= fit.colRight + 0.5 && fit.right <= fit.inner);
  ok(`${w}x${h}: menu column does not scroll (${fit.sh} <= ${fit.ch})`, fit.sh <= fit.ch);
  ok(`${w}x${h}: back + mid layers loaded ${JSON.stringify(fit.imgs)}`, fit.imgs.length >= 2 && fit.imgs.every((i) => i.done));
  await page.screenshot({ path: `${SHOTS}/slate-title-${w}x${h}.png` });
  // parallax: move the pointer and see a layer shift
  if (w >= 900) {
    const t = () => page.evaluate(() => [...document.querySelectorAll('.phc-layer')].map((l) => getComputedStyle(l).transform).join('|'));
    await page.mouse.move(10, 10); await pause(page, 700); const a = await t();
    await page.mouse.move(w - 10, h - 10); await pause(page, 700); const b = await t();
    ok(`${w}x${h}: parallax moves the layers`, a !== b);
  }
  if (w === 1440) {
    const act = () => page.locator('.phc-wick').getAttribute('data-act');
    await page.getByRole('button', { name: 'CREDITS', exact: true }).hover(); await pause(page, 60);
    ok('Wick runs to a hovered row (data-act ' + (await act()) + ')', ['run', 'stop'].includes(await act()));
    await pause(page, 1500);
    ok('then idles (data-act ' + (await act()) + ')', ['idle', 'stop'].includes(await act()));
    // hover during hello (lib.mjs titleHoverDuringHello: the press, the pointer onto SETTINGS, and a watcher in the page)
    const hl = await titleHoverDuringHello(page), sn = hl.seen || {};
    ok(`hover during hello: SETTINGS highlighted (on=${sn.on}, pressed=${sn.pressed}, colour ${hl.before} -> ${hl.colour})`, sn.on === 'settings' && sn.pressed === 'chars' && !!hl.colour && hl.before !== hl.colour);
    ok('Wick is in hello (data-act ' + sn.act + ', bubble ' + sn.bubble + ')', sn.act === 'hello' && sn.bubble === 1);
    await page.screenshot({ path: `${SHOTS}/slate-title-hello-hover.png` }).catch(() => {});
    await page.waitForSelector('text=Your characters', { timeout: 30000 });
    ok('the pressed row (CHARACTERS) still opens', true);
  }
  if (errors.length) ok(`${w}x${h}: no page errors ${errors}`, false);
}
// The greeting: after the first key press Wick jumps and waves with "Hi!"
{
  const p2 = await ctx.newPage(); await page.close(); await p2.setViewportSize({ width: 1440, height: 900 });
  await p2.goto(BASE + '/?fresh=1'); await p2.waitForSelector('text=PRESS ANY KEY', { timeout: 90000 }); await p2.keyboard.press("Space");
  const got = await p2.waitForFunction(() => document.querySelector('.phc-wick')?.getAttribute('data-act') === 'greet', null, { timeout: 30000 }).then(() => true, () => false);
  await pause(p2, 300);
  ok('greeting: Wick jumps and waves with Hi! (' + (await p2.locator('.phc-bubble').textContent().catch(() => '')) + ')', got);
  await p2.screenshot({ path: `${SHOTS}/slate-title-greet.png` });
}
await browser.close();
