// The Lock in stamp: make a character in a room, press "Lock in and bring to the room", and catch the big red AHOC seal
// mid-slam (~120 ms) and landed (~500 ms) with APPROVED across it; the lock-in still completes. Shots: slate-stamp-*.png.
import { chromium, player, click, BASE, OUT, hostAs, settle, pause, LOCK_IN } from './lib.mjs';
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const browser = await chromium.launch();
const p = await player(browser, 'host');
/** The stamp is on the page for about half a second before the screen leaves: it is looked at IN the page, by a watcher
 *  started before the click (asking for it from here, "at 120 ms" and "at 500 ms" on this script's clock, found nothing
 *  at all when the machine was busy). `mid`: the stamp the moment it is put on the page (still falling); `landed`: the
 *  moment its slam animation has finished (down on the record). No counted milliseconds. */
const watchStamp = (pg) => pg.evaluate(() => {
  const W = (window.__stamp = { mid: null, landed: null });
  const read = (s) => { const rec = document.querySelector('[data-phc-record]'), r = s.getBoundingClientRect(), rr = rec ? rec.getBoundingClientRect() : null;
    return { mode: s.getAttribute('data-stamp'), op: getComputedStyle(s).opacity, tf: getComputedStyle(s).transform, w: Math.round(r.width), h: Math.round(r.height), label: s.getAttribute('aria-label'),
      overRecord: !!rr && r.left < rr.right && r.right > rr.left && r.top < rr.bottom && r.bottom > rr.top,
      approved: /APPROVED/.test(s.textContent || '') || !!document.querySelector('[role="img"][aria-label^="Approved"]'),
      button: [...document.querySelectorAll('button')].filter((b) => /Approved ✓/.test(b.textContent || '')).length }; };
  const look = () => {
    const s = document.querySelector('.phc-stamp'); if (!s || W.mid) return;
    W.mid = read(s); mo.disconnect();
    const done = () => { if (!W.landed && s.isConnected) W.landed = read(s); };
    const anims = s.getAnimations();
    if (anims.length) Promise.all(anims.map((a) => a.finished.catch(() => {}))).then(done);
    s.addEventListener('animationend', done); setTimeout(done, 2000);
  };
  const mo = new MutationObserver(look); mo.observe(document.documentElement, { childList: true, subtree: true }); look();
});
const stampSeen = (pg, what) => pg.waitForFunction((what) => window.__stamp && window.__stamp[what], what, { timeout: 30000 }).then((h) => h.jsonValue(), () => null);
const sounds = []; p.on('request', (r) => { if (/\/sfx\//.test(r.url())) sounds.push(r.url().split('/').pop()); });
await hostAs(p, 'Leon');
await p.waitForSelector('text=The squad', { timeout: 90000 });
await click(p, 'Create a character');
await p.getByPlaceholder('What the squad calls you').fill('Stamp Test');
await p.locator('main button[aria-pressed]').first().click();
await click(p, 'Next ›');
await p.locator('button', { hasText: /^Use .* ›$/ }).first().click();
await click(p, 'Next ›'); await click(p, 'Next ›'); await click(p, 'Next ›');
await click(p, 'Next ›');
await p.waitForSelector('[data-phc-record]');
await settle(p, 500);
await p.screenshot({ path: OUT + 'slate-stamp-0-before.png' });
const btn = p.getByRole('button', { name: LOCK_IN.room, exact: true });
await watchStamp(p);
await btn.click();
await btn.click({ timeout: 300 }).catch(() => {}); // a second press files nothing more
// (the two pictures are for a person to look at; on a busy machine they come late, and nothing is judged from them)
await p.screenshot({ path: OUT + 'slate-stamp-120.png' }).catch(() => {});
const mid = await stampSeen(p, 'mid');
ok('the stamp is on the page, falling (' + JSON.stringify(mid && { mode: mid.mode, op: mid.op, tf: mid.tf }) + ')', !!mid);
const landed = await stampSeen(p, 'landed');
await p.screenshot({ path: OUT + 'slate-stamp-500.png' }).catch(() => {});
ok('landed on the record, big: ' + JSON.stringify(landed && { w: landed.w, h: landed.h, op: landed.op, label: landed.label, overRecord: landed.overRecord }), !!landed && landed.w >= 250 && landed.overRecord && Number(landed.op) > 0.8);
ok('APPROVED is on the stamp', !!landed && landed.approved);
ok('the button reads Approved ✓', !!landed && landed.button === 1);
await p.waitForSelector('text=✓ LOCKED IN', { timeout: 30000 });
ok('the lock-in completes (✓ LOCKED IN in the room)', true);
const chars = await p.evaluate(() => Object.values(window.__phc.getState().game?.characters || {}).filter((c) => c.name === 'Stamp Test').length);
// The screen leaves as a frozen copy (App.tsx): the stamp in that copy carries on from where it was, never slams twice.
const ghost = await p.evaluate(() => window.__phcGhostAnims || []);
const slam = ghost.find((a) => a.name === 'phc-stamp-slam');
ok('the leaving copy keeps the stamp down (slam at ' + (slam && Math.round(slam.t)) + ' ms of 300, not replayed)', !!slam && slam.t >= 290);
ok('filed once: ' + chars + ' character(s) named Stamp Test', chars === 1);
ok('the stamp sound was fetched: ' + sounds.filter((s) => /stamp/.test(s)).join(','), sounds.some((s) => /stamp/.test(s)));
await p.screenshot({ path: OUT + 'slate-stamp-after.png' });
// reduced motion: a fade, no shake
{
  const q = await player(browser, 'rm');
  await q.emulateMedia({ reducedMotion: 'reduce' });
  await hostAs(q, 'Mai'); await q.waitForSelector('text=The squad', { timeout: 90000 });
  await click(q, 'Create a character');
  await q.getByPlaceholder('What the squad calls you').fill('Calm Stamp');
  await q.locator('main button[aria-pressed]').first().click();
  await click(q, 'Next ›'); await q.locator('button', { hasText: /^Use .* ›$/ }).first().click();
  await click(q, 'Next ›'); await click(q, 'Next ›'); await click(q, 'Next ›'); await click(q, 'Next ›');
  await watchStamp(q);
  await q.getByRole('button', { name: LOCK_IN.room, exact: true }).click();
  const calm = await stampSeen(q, 'mid');
  ok('reduced motion: the stamp fades (data-stamp ' + (calm && calm.mode) + ')', !!calm && calm.mode === 'fade');
  await q.waitForSelector('text=✓ LOCKED IN', { timeout: 30000 });
  ok('reduced motion: lock-in completes', true);
  ok('no page errors (reduced motion)' + (q.errors.length ? ': ' + q.errors.join(' | ') : ''), !q.errors.length);
}
ok('no page errors' + (p.errors.length ? ': ' + p.errors.join(' | ') : ''), !p.errors.length);
await browser.close();
