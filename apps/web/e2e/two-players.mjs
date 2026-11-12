import { chromium, player, click, shot, BASE, hostAs, pickAction, pause, settle } from './lib.mjs';
const browser = await chromium.launch();
const host = await player(browser, 'host'), guest = await player(browser, 'guest');
const log = (...a) => console.log(...a);
// Named checks (a green line in the runner must mean something was looked at; this suite printed none and showed "0 checks").
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
async function create(page, name, family, kit) {
  await click(page, 'Create a character');
  await page.getByPlaceholder('What the squad calls you').fill(name);
  await page.locator('main button[aria-pressed]').first().click();
  await click(page, 'Next ›');
  if (family) await page.getByRole('tab', { name: family, exact: true }).click();
  await page.locator('button', { hasText: /^Use .* ›$/ }).first().click();
  await click(page, 'Next ›'); await click(page, 'Next ›'); await click(page, 'Next ›');
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
// (the host's screen shows the guest's locked-in character: the room relay carried it)
const bothIn = await host.waitForFunction(() => Object.keys(window.__phc.getState().game.characters).length >= 2, null, { timeout: 30000 }).then(() => true, () => false);
ok('both players made a character through the creation screens and the host sees both in room ' + code, bothIn);
await shot(host, '10-room-ready'); await shot(guest, '11-room-guest');
await host.evaluate(() => window.__phc.setNarrator({ scripted: true }));
await click(host, 'Start session');
await host.waitForSelector('text=The rear pad', { timeout: 30000 });
await guest.waitForSelector('text=Outpost-813\'s rear landing pad', { timeout: 30000 });
ok('the session starts: both screens show the Narrator\'s opening', true);
await shot(host, '12-main-opening');
await host.getByLabel('What do you do?').fill('I walk up the ramp with 4-Ten on my shoulders.'); await click(host, 'Send', { exact: true }); await click(host, 'End turn', { exact: true });
await guest.getByLabel('What do you do?').fill('I cover him from the wreck line.'); await click(guest, 'Send', { exact: true }); await click(guest, 'End turn', { exact: true });
await host.waitForSelector('text=CLICK TO ROLL', { timeout: 30000 });
ok('both spoke, the round closed and the Narrator called a check', true);
await shot(host, '13-check-called');
// a new check of yours opens the dice table by itself; else open it from its line
if ((await host.locator('div[aria-label="Dice table"]').waitFor({ timeout: 3000 }).catch(() => 'not up')) === 'not up') await host.locator('button', { hasText: 'Get Keel to lower the ramp.' }).click();
await click(host, /Throw/);
await host.waitForSelector('text=/SUCCESS|FAILURE|COMPLICATION/');
ok('the check is rolled on the dice table and shows its outcome', true);
await shot(host, '14-dice');
await click(host, 'Continue', { exact: true });
await host.waitForSelector('text=Initiative', { timeout: 10000 }).catch(() => {});
ok('a fight starts on both screens', await host.waitForFunction(() => window.__phc.getState().game.phase === 'combat', null, { timeout: 30000 }).then(() => true, () => false) && await guest.waitForFunction(() => window.__phc.getState().game.phase === 'combat', null, { timeout: 30000 }).then(() => true, () => false));
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
// A fight can run long (one in five here: a round often ends with no shot to take, up to 130 actions and six minutes), so the loop
// has no fixed length: it ends when the fight does, or fails as a stall when the game has not moved for 45 s, printing
// both screens' books (docs/design/handoffs/coop-stall.md; the stall's own suite is coop-stall.mjs).
const books = (p) => p.evaluate(() => { const s = window.__phc.getState(), cb = s.game && s.game.combat, dock = document.querySelector('.phc-cb-dock');
  return { v: s.game && s.game.v, round: cb && cb.round, unit: cb && cb.order[cb.turn], lock: dock && dock.getAttribute('data-lock'), fx: window.__phcFxDebug && window.__phcFxDebug(), net: window.__phc.net && window.__phc.net() }; });
const version = (p) => p.evaluate(() => { const g = window.__phc.getState().game; return g ? g.v : -1; });
let lastKey = '', lastChange = Date.now(), fought = false;
for (let i = 0; i < 6000; i++) {
  const states = [await myTurn(host), await myTurn(guest)];
  if (states.includes('over')) { fought = true; break; }
  const key = states.join() + ':' + (await version(host)) + ':' + (await version(guest));
  if (key !== lastKey) { lastKey = key; lastChange = Date.now(); }
  if (Date.now() - lastChange > 45000) { log('FAIL the fight stood still for 45 s at', key); log('host', JSON.stringify(await books(host))); log('guest', JSON.stringify(await books(guest))); process.exitCode = 1; break; }
  for (const [k, p] of [[0, host], [1, guest]]) {
    if (states[k] !== 'mine') continue;
    if (!(await p.locator('text=ACTION POINTS').count())) { await pause(p, 200); continue; }
    // As a player: the action panel is greyed out while the other turns still play on screen, and takes no click.
    if (await p.evaluate(() => !!(document.querySelector('.phc-cb-dock') || { getAttribute: () => 'none' }).getAttribute('data-lock'))) continue;
    await pickAction(p, /^(Shot|Strike)/, { timeout: 2000 }).catch(() => {});
    const conf = p.getByRole('button', { name: 'Confirm', exact: true });
    // (a button that can't be pressed this moment, because the panel is still sliding or has just locked, is looked at
    // again on the next pass, as a player would; the fight standing still is what fails, 45 s below)
    if (await conf.isEnabled().catch(() => false)) await conf.click({ timeout: 5000 }).catch(() => {}); else await p.getByRole('button', { name: 'End turn', exact: true }).click({ timeout: 5000 }).catch(() => {});
    await pause(p, 60);
  }
  if (i % 100 === 0) console.log('loop', i, states.join(','));
  await pause(host, 80);
}
ok('the fight runs to its end with both players acting through their own action panels', fought);
await shot(host, '16-combat-over'); await shot(guest, '17-combat-over-guest');
const hs = await seenOf(host), gs = await seenOf(guest);
log('host saw', hs.banners.length, 'banners, peak', hs.fx, 'fx nodes, cut-in', hs.cut > 0, '·', hs.banners.slice(0, 4).join(' | '));
log('guest saw', gs.banners.length, 'banners, peak', gs.fx, 'fx nodes, cut-in', gs.cut > 0, '·', gs.banners.slice(0, 4).join(' | '));
ok('both players saw turn banners and effects (host ' + hs.banners.length + ' banners, ' + hs.fx + ' fx nodes; guest ' + gs.banners.length + ', ' + gs.fx + ')', !!gs.banners.length && !!gs.fx && !!hs.banners.length && !!hs.fx);
const named = (l) => l.filter((t) => /HOSTILE/.test(t)).length;
ok('both saw a hostile-turn banner (host ' + named(hs.banners) + ', guest ' + named(gs.banners) + ')', named(gs.banners) > 0 && named(hs.banners) > 0);
log('combat over dialog', await host.locator('text=Back to the story ›').count(), await guest.locator('text=Back to the story ›').count());
await click(host, 'Back to the story ›'); await click(guest, 'Back to the story ›');
await host.waitForSelector('text=The pad goes quiet', { timeout: 30000 });
ok('Back to the story: the story resumes after the fight', true);
await settle(host, 300);
await shot(host, '18-after-fight');
const lvl = host.locator('button', { hasText: /Level up|Earn your class/ });
log('level button', await lvl.count());
if (await lvl.count()) { await lvl.first().click(); await settle(host, 300); await shot(host, '19-levelup'); }
log('host errors', host.errors); log('guest errors', guest.errors);
// (the same filter as the other suites: a resource the test server doesn't have is not a page error)
const errs = [...host.errors, ...guest.errors].filter((e) => !/Failed to load resource|favicon|youtube|ERR_|net::/i.test(e));
ok('no page errors (' + errs.slice(0, 3).join(' | ') + ')', errs.length === 0);
await browser.close();
