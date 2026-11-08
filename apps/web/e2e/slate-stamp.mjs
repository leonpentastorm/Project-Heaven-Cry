// The Lock in stamp: make a character in a room, press "Lock in and bring to the room", and catch the big red AHOC seal
// mid-slam (~120 ms) and landed (~500 ms) with APPROVED across it; the lock-in still completes. Shots: slate-stamp-*.png.
import { chromium, player, click, BASE, OUT, hostAs } from './lib.mjs';
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const browser = await chromium.launch();
const p = await player(browser, 'host');
const sounds = []; p.on('request', (r) => { if (/\/sfx\//.test(r.url())) sounds.push(r.url().split('/').pop()); });
await hostAs(p, 'Leon');
await p.waitForSelector('text=The squad', { timeout: 90000 });
await click(p, 'Create a character');
await p.getByPlaceholder('What the squad calls you').fill('Stamp Test');
await p.locator('main button[aria-pressed]').first().click();
await click(p, 'Next ›');
await p.locator('button', { hasText: /^Use .* ›$/ }).first().click();
await click(p, 'Next ›'); await click(p, 'Next ›'); await click(p, 'Next ›');
await p.locator('button', { hasText: 'Line soldier' }).first().click();
await click(p, 'Next ›');
await p.waitForSelector('[data-phc-record]');
await p.waitForTimeout(500);
await p.screenshot({ path: OUT + 'slate-stamp-0-before.png' });
const btn = p.getByRole('button', { name: 'Lock in and bring to the room' });
await btn.click();
const t0 = Date.now();
await p.waitForTimeout(Math.max(0, 120 - (Date.now() - t0)));
await p.screenshot({ path: OUT + 'slate-stamp-120.png' });
const mid = await p.evaluate(() => { const s = document.querySelector('.phc-stamp'); return s && { mode: s.getAttribute('data-stamp'), op: getComputedStyle(s).opacity, tf: getComputedStyle(s).transform }; });
ok('the stamp is falling at ~120 ms: ' + JSON.stringify(mid), !!mid);
await p.waitForTimeout(Math.max(0, 500 - (Date.now() - t0)));
await p.screenshot({ path: OUT + 'slate-stamp-500.png' });
const landed = await p.evaluate(() => {
  const s = document.querySelector('.phc-stamp'), rec = document.querySelector('[data-phc-record]');
  if (!s) return null; const r = s.getBoundingClientRect(), rr = rec.getBoundingClientRect();
  return { w: Math.round(r.width), h: Math.round(r.height), op: getComputedStyle(s).opacity, label: s.getAttribute('aria-label'), overRecord: r.left < rr.right && r.right > rr.left && r.top < rr.bottom && r.bottom > rr.top };
});
ok('landed on the record, big: ' + JSON.stringify(landed), !!landed && landed.w >= 250 && landed.overRecord && Number(landed.op) > 0.8);
ok('APPROVED is on the stamp', (await p.locator('.phc-stamp', { hasText: 'APPROVED' }).count()) + (await p.locator('[role="img"][aria-label^="Approved"]').count()) > 0);
ok('the button reads Approved ✓', (await p.locator('button:has-text("Approved ✓")').count()) === 1);
await btn.click({ timeout: 300 }).catch(() => {}); // a second press files nothing more
await p.waitForSelector('text=✓ LOCKED IN', { timeout: 8000 });
ok('the lock-in completes (✓ LOCKED IN in the room) after ' + (Date.now() - t0) + ' ms', true);
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
  await click(q, 'Next ›'); await click(q, 'Next ›'); await click(q, 'Next ›'); await q.locator('button', { hasText: 'Line soldier' }).first().click(); await click(q, 'Next ›');
  await q.getByRole('button', { name: 'Lock in and bring to the room' }).click(); await q.waitForTimeout(100);
  ok('reduced motion: the stamp fades (data-stamp ' + await q.locator('.phc-stamp').getAttribute('data-stamp').catch(() => null) + ')', (await q.locator('.phc-stamp').getAttribute('data-stamp').catch(() => null)) === 'fade');
  await q.waitForSelector('text=✓ LOCKED IN', { timeout: 8000 });
  ok('reduced motion: lock-in completes', true);
  ok('no page errors (reduced motion)' + (q.errors.length ? ': ' + q.errors.join(' | ') : ''), !q.errors.length);
}
ok('no page errors' + (p.errors.length ? ': ' + p.errors.join(' | ') : ''), !p.errors.length);
await browser.close();
