import { chromium, player, click, shot, BASE, hostAs, pickAction } from './lib.mjs';
const browser = await chromium.launch();
const host = await player(browser, 'host'), guest = await player(browser, 'guest');
const log = (...a) => console.log(...a);
async function create(page, name, family, kit) {
  await click(page, 'Create a character');
  await page.getByPlaceholder('What the squad calls you').fill(name);
  await page.locator('main button[aria-pressed]').first().click();
  await click(page, 'Next ›');
  if (family) await page.getByRole('tab', { name: family, exact: true }).click();
  await page.locator('button', { hasText: /^Use .* ›$/ }).first().click();
  await click(page, 'Next ›'); await click(page, 'Next ›');
  await page.locator('button', { hasText: kit }).first().click();
  await click(page, 'Next ›');
  await click(page, 'Lock in and bring to the room');
  await page.waitForSelector('text=✓ LOCKED IN');
}
await hostAs(host, 'Leon');
await host.waitForSelector('text=The squad');
const code = (await host.locator('text=/ROOM [A-Z0-9]{6}/').first().textContent()).match(/ROOM ([A-Z0-9]{6})/)[1];
log('room', code);
await create(host, 'MPAT', null, 'Field medic');
await guest.goto(BASE + '/?room=' + code); await guest.getByPlaceholder('Leon').fill('Mai'); await click(guest, 'Join ›');
await guest.waitForSelector('text=The squad');
await create(guest, 'Ninety-Two', 'Guns and hunters', 'Line soldier');
await host.waitForTimeout(800);
await shot(host, '10-room-ready'); await shot(guest, '11-room-guest');
await host.evaluate(() => window.__phc.setNarrator({ scripted: true }));
await click(host, 'Start session');
await host.waitForSelector('text=The rear pad', { timeout: 10000 });
await guest.waitForSelector('text=Outpost-813\'s rear landing pad', { timeout: 10000 });
await shot(host, '12-main-opening');
await host.getByLabel('What do you do?').fill('I walk up the ramp with 4-Ten on my shoulders.'); await click(host, 'Send', { exact: true }); await click(host, 'End turn', { exact: true });
await guest.getByLabel('What do you do?').fill('I cover him from the wreck line.'); await click(guest, 'Send', { exact: true }); await click(guest, 'End turn', { exact: true });
await host.waitForSelector('text=CLICK TO ROLL', { timeout: 10000 });
await shot(host, '13-check-called');
await host.locator('button', { hasText: 'Get Keel to lower the ramp.' }).click();
await click(host, /Throw/);
await host.waitForSelector('text=/SUCCESS|FAILURE|COMPLICATION/');
await shot(host, '14-dice');
await click(host, 'Continue', { exact: true });
await host.waitForSelector('text=Initiative', { timeout: 10000 }).catch(() => {});
log('host url screen', await host.locator('text=/ROUND \\d+/').first().textContent().catch(() => 'no combat header'));
await shot(host, '15-combat');
// Both screens play the same beats from the shared state: record the turn banners and effects each one shows.
const watch = (p) => p.evaluate(() => { const seen = (window.__seen = { banners: new Set(), fx: 0, cut: 0 });
  setInterval(() => { for (const b of document.querySelectorAll('div[role="status"][aria-live="polite"]')) { const t = b.textContent.replace(/\s+/g, ' ').trim(); if (/ROUND \d/.test(t)) seen.banners.add(t.slice(0, 60)); }
    seen.fx = Math.max(seen.fx, document.querySelector('.phc-fx-layer')?.childElementCount || 0); if (document.querySelector('[data-phc-cutin]')) seen.cut++; }, 60); });
await watch(host); await watch(guest);
const seenOf = (p) => p.evaluate(() => ({ banners: [...window.__seen.banners], fx: window.__seen.fx, cut: window.__seen.cut }));
// fight until it's over: each player acts on their own unit's turn, read from the game state
const myTurn = (p) => p.evaluate(() => { const s = window.__phc.getState(), g = s.game, cb = g && g.combat; if (!cb || cb.over) return cb && cb.over ? 'over' : 'none';
  const u = cb.units.find((x) => x.id === cb.order[cb.turn]); return u && u.charId && g.characters[u.charId].owner === s.me.id ? 'mine' : 'other'; });
for (let i = 0; i < 300; i++) {
  const states = [await myTurn(host), await myTurn(guest)];
  if (states.includes('over')) break;
  for (const [k, p] of [[0, host], [1, guest]]) {
    if (states[k] !== 'mine') continue;
    if (!(await p.locator('text=ACTION POINTS').count())) { await p.waitForTimeout(200); continue; }
    await pickAction(p, /^(Shot|Strike)/, { timeout: 2000 }).catch(() => {});
    const conf = p.getByRole('button', { name: 'Confirm', exact: true });
    if (await conf.isEnabled()) await conf.click(); else await p.getByRole('button', { name: 'End turn', exact: true }).click();
    await p.waitForTimeout(60);
  }
  if (i % 20 === 0) console.log('loop', i, states.join(','));
  await host.waitForTimeout(80);
}
await shot(host, '16-combat-over'); await shot(guest, '17-combat-over-guest');
const hs = await seenOf(host), gs = await seenOf(guest);
log('host saw', hs.banners.length, 'banners, peak', hs.fx, 'fx nodes, cut-in', hs.cut > 0, '·', hs.banners.slice(0, 4).join(' | '));
log('guest saw', gs.banners.length, 'banners, peak', gs.fx, 'fx nodes, cut-in', gs.cut > 0, '·', gs.banners.slice(0, 4).join(' | '));
if (!gs.banners.length || !gs.fx || !hs.banners.length || !hs.fx) { log('FAIL a player missed the banners or the effects'); process.exitCode = 1; }
const named = (l) => l.filter((t) => /HOSTILE/.test(t)).length;
if (named(gs.banners) === 0 || named(hs.banners) === 0) { log('FAIL a player saw no hostile-turn banner'); process.exitCode = 1; }
log('combat over dialog', await host.locator('text=Back to the story ›').count(), await guest.locator('text=Back to the story ›').count());
await click(host, 'Back to the story ›'); await click(guest, 'Back to the story ›');
await host.waitForSelector('text=The pad goes quiet', { timeout: 10000 });
await host.waitForTimeout(500);
await shot(host, '18-after-fight');
const lvl = host.locator('button', { hasText: /Level up|Earn your class/ });
log('level button', await lvl.count());
if (await lvl.count()) { await lvl.first().click(); await host.waitForTimeout(300); await shot(host, '19-levelup'); }
log('host errors', host.errors); log('guest errors', guest.errors);
await browser.close();
