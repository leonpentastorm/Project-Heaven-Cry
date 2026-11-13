import { chromium, player, click, shot, BASE, hostAs, lockIn } from './lib.mjs';
const browser = await chromium.launch();
const host = await player(browser, 'host', { campaigns: ['m813'] }), guest = await player(browser, 'guest');
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
  await click(page, 'Next ›'); await lockIn(page);
  await page.waitForSelector('text=✓ LOCKED IN');
}
await hostAs(host, 'Leon');
await host.waitForSelector('text=The squad');
const code = (await host.locator('text=/ROOM [A-Z0-9]{6}/').first().textContent()).match(/ROOM ([A-Z0-9]{6})/)[1];
await create(host, 'MPAT', null, 'Field medic');
await guest.goto(BASE + '/?room=' + code); await guest.getByPlaceholder('Leon').fill('Mai'); await click(guest, 'Join ›');
await create(guest, 'Ninety-Two', 'Guns and hunters', 'Line soldier');
await host.evaluate(() => window.__phc.setNarrator({ scripted: true }));
await click(host, 'Start session');
await guest.waitForSelector('text=Outpost-813\'s rear landing pad', { timeout: 30000 });
// guest speaks, then refreshes: should land back in the story with their line
await guest.getByLabel('What do you do?').fill('I check the wreck line for survivors.'); await click(guest, 'Send', { exact: true }); await click(guest, 'End turn', { exact: true });
await guest.reload();
await guest.waitForSelector('text=I check the wreck line for survivors.', { timeout: 60000 }); // (a reload, the room joined again and the story drawn: 20 s beside two other suites)
ok('the guest refreshes mid-session and lands back in the story, with the line they spoke', await guest.locator('text=Outpost-813\'s rear landing pad').count() > 0);
// host refreshes: state comes back from this browser's save, the round continues
await host.reload();
await host.evaluate(() => window.__phc.setNarrator({ scripted: true }));
await host.waitForSelector('text=I check the wreck line for survivors.', { timeout: 60000 });
ok('the host refreshes: the story comes back from this browser\'s save, the guest\'s line with it', true);
await host.getByLabel('What do you do?').fill('I walk up the ramp.'); await click(host, 'Send', { exact: true }); await click(host, 'End turn', { exact: true });
await host.waitForSelector('text=CLICK TO ROLL', { timeout: 30000 });
ok('the round goes on after both refreshes: the host speaks, the round closes, the Narrator calls a check', true);
// the EPCCG "?" and the lightbox
// the guest watches the host's roll by default (spec: Overworld rounds); close it to read the sheet
// (Since the playtest fixes the table opens only for the roller until they throw: close it if it is up.)
const watchClose = guest.getByRole('button', { name: 'Close and wait for the story' });
if (await watchClose.waitFor({ timeout: 30000 }).then(() => true, () => false)) await watchClose.click();
await guest.getByRole('button', { name: /What is Durability\?/ }).first().click();
await guest.waitForSelector('text=EPCCG · ARTICLE 5');
ok('the "?" on a skill opens its EPCCG entry', true);
await shot(guest, '30-epccg');
await guest.getByRole('button', { name: /Close the EPCCG entry/ }).click();
await guest.getByRole('button', { name: /Enlarge the Durability skill portrait/ }).first().click();
await guest.waitForSelector('text=SKILL PORTRAIT');
ok('the skill portrait opens large in the lightbox', true);
await shot(guest, '31-lightbox');
console.log('errors', host.errors, guest.errors);
const errs = [...host.errors, ...guest.errors].filter((e) => !/Failed to load resource|favicon|youtube|ERR_|net::/i.test(e));
ok('no page errors (' + errs.slice(0, 3).join(' | ') + ')', errs.length === 0);
await browser.close();
