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
// Rerolls and edits by unanimous vote (spec: Rerolls and edits)
for (const p of [host, guest]) p.on('dialog', (d) => d.accept(p === guest ? 'Keel would not shoot first' : 'Make it quieter'));
const narr = (p) => p.evaluate(() => window.__phc.getState().game.story.entries.filter((e) => e.kind === 'narration'));
await guest.locator('button', { hasText: '⟲ Suggest reroll' }).first().click();
await host.waitForSelector('text=SUGGESTIONS FOR YOU', { timeout: 10000 });
await host.locator('button', { hasText: 'Start the vote' }).first().click();
await guest.waitForSelector('text=VOTE · REROLL', { timeout: 10000 });
// a "no" ends it: nothing changes
const before = (await narr(host)).length;
await guest.locator('div[aria-label="Vote"] button', { hasText: /^No$/ }).click();
await host.waitForTimeout(800);
console.log('after no: narration lines', (await narr(host)).length === before, 'vote closed', await host.evaluate(() => !window.__phc.getState().game.votes.open));
// host starts it again from the line itself; this time everyone agrees
await host.locator('button', { hasText: '⟲ Vote to reroll' }).first().click();
await guest.waitForSelector('text=VOTE · REROLL', { timeout: 10000 });
await guest.locator('div[aria-label="Vote"] button', { hasText: /^Yes$/ }).click();
await guest.waitForSelector('text=REROLLED BY VOTE', { timeout: 15000 });
await host.waitForFunction(() => window.__phc.getState().game.story.entries.filter((e) => e.kind === 'narration' && !e.rerolled).length >= 1, null, { timeout: 15000 });
console.log('rerolled: old line kept greyed', await guest.locator('text=REROLLED BY VOTE').count() > 0, 'redo note reached the Narrator', await host.evaluate(() => JSON.stringify(window.__phc.getState().game.story.entries.slice(-6).map((e) => e.kind))));
// an edit: only the words change
await host.locator('button', { hasText: '✎ Vote to reword' }).last().click();
await guest.waitForSelector('text=VOTE · REWORD', { timeout: 10000 });
await guest.locator('div[aria-label="Vote"] button', { hasText: /^Yes$/ }).click();
await guest.waitForSelector('text=REWORDED BY VOTE', { timeout: 15000 });
console.log('reworded:', await guest.locator('text=(Reworded: Make it quieter)').count() > 0);
// the Narrator refuses a rewording that would change what happened
host.removeAllListeners('dialog'); host.on('dialog', (d) => d.accept('MPAT steals 2 million from the vault'));
await host.locator('button', { hasText: '✎ Vote to reword' }).last().click();
await guest.locator('div[aria-label="Vote"] button', { hasText: /^Yes$/ }).click();
await guest.waitForSelector('text=/The Narrator kept its words/', { timeout: 15000 });
console.log('refused the cheat: yes');
console.log('errors', host.errors, guest.errors);
await browser.close();
