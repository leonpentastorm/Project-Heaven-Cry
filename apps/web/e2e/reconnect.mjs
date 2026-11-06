import { chromium, player, click, shot, BASE } from './lib.mjs';
const browser = await chromium.launch();
const host = await player(browser, 'host'), guest = await player(browser, 'guest');
async function create(page, name, family, kit) {
  await click(page, 'Create a character');
  await page.getByPlaceholder('What the squad calls you').fill(name);
  await page.locator('main button[aria-pressed]').first().click();
  await click(page, 'Next ›');
  if (family) await page.getByRole('tab', { name: family, exact: true }).click();
  await page.locator('button', { hasText: /^Use .* ›$/ }).first().click();
  await click(page, 'Next ›'); await click(page, 'Next ›');
  await page.locator('button', { hasText: kit }).first().click();
  await click(page, 'Next ›'); await click(page, 'Lock in and bring to the room');
  await page.waitForSelector('text=✓ LOCKED IN');
}
await host.goto(BASE); await host.getByPlaceholder('Leon').fill('Leon'); await click(host, 'Open a room ›');
await host.waitForSelector('text=The squad');
const code = (await host.locator('text=/ROOM [A-Z0-9]{6}/').first().textContent()).match(/ROOM ([A-Z0-9]{6})/)[1];
await create(host, 'MPAT', null, 'Field medic');
await guest.goto(BASE + '/?room=' + code); await guest.getByPlaceholder('Leon').fill('Mai'); await click(guest, 'Join ›');
await create(guest, 'Ninety-Two', 'Guns and hunters', 'Line soldier');
await host.evaluate(() => window.__phc.setNarrator({ scripted: true }));
await click(host, 'Start session');
await guest.waitForSelector('text=Outpost-813\'s rear landing pad', { timeout: 15000 });
// guest speaks, then refreshes: should land back in the story with their line
await guest.getByLabel('What do you do?').fill('I check the wreck line for survivors.'); await click(guest, 'Send', { exact: true }); await click(guest, 'End turn', { exact: true });
await guest.reload();
await guest.waitForSelector('text=I check the wreck line for survivors.', { timeout: 15000 });
console.log('guest resumed after refresh:', await guest.locator('text=Outpost-813\'s rear landing pad').count() > 0);
// host refreshes: state comes back from this browser's save, the round continues
await host.reload();
await host.evaluate(() => window.__phc.setNarrator({ scripted: true }));
await host.waitForSelector('text=I check the wreck line for survivors.', { timeout: 15000 });
await host.getByLabel('What do you do?').fill('I walk up the ramp.'); await click(host, 'Send', { exact: true }); await click(host, 'End turn', { exact: true });
await host.waitForSelector('text=CLICK TO ROLL', { timeout: 15000 });
console.log('host resumed and the round closed: check called');
// the EPCCG "?" and the lightbox
// the guest watches the host's roll by default (spec: Overworld rounds); close it to read the sheet
await guest.getByRole('button', { name: 'Close and wait for the story' }).click({ timeout: 5000 });
await guest.getByRole('button', { name: /What is Durability\?/ }).first().click();
await guest.waitForSelector('text=EPCCG · ARTICLE 5');
await shot(guest, '30-epccg');
await guest.getByRole('button', { name: /Close the EPCCG entry/ }).click();
await guest.getByRole('button', { name: /Enlarge the Durability skill portrait/ }).first().click();
await guest.waitForSelector('text=SKILL PORTRAIT');
await shot(guest, '31-lightbox');
console.log('errors', host.errors, guest.errors);
await browser.close();
