import { chromium, player, click, shot, BASE, hostAs, answerAsk, settle } from './lib.mjs';
const browser = await chromium.launch();
const host = await player(browser, 'host'), guest = await player(browser, 'guest');
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
  await click(page, 'Next ›'); await click(page, 'Lock in and bring to the room');
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
await guest.waitForSelector('text=Outpost-813\'s rear landing pad', { timeout: 15000 });
// Rerolls and edits by unanimous vote (spec: Rerolls and edits)
// The note is asked in the game's own dialog (game/dialog.tsx), never the browser's prompt().
const narr = (p) => p.evaluate(() => window.__phc.getState().game.story.entries.filter((e) => e.kind === 'narration'));
await guest.locator('button', { hasText: '⟲ Suggest reroll' }).first().click();
await answerAsk(guest, 'Keel would not shoot first');
await host.waitForSelector('text=SUGGESTIONS FOR YOU', { timeout: 15000 });
await host.locator('button', { hasText: 'Start the vote' }).first().click();
await guest.waitForSelector('text=VOTE · REROLL', { timeout: 15000 });
ok('a guest suggests a reroll with a note, the host starts the vote, the guest is asked', true);
// a "no" ends it: nothing changes
const before = (await narr(host)).length;
await guest.locator('div[aria-label="Vote"] button', { hasText: /^No$/ }).click();
// (until the host's state says the vote is closed: the guest's No has crossed the room)
const closed = await host.waitForFunction(() => !window.__phc.getState().game.votes.open, null, { timeout: 15000 }).then(() => true, () => false);
ok('a No ends the vote and changes nothing (the vote is closed: ' + closed + ', the Narrator\'s lines are as they were)', closed && (await narr(host)).length === before);
// host starts it again from the line itself; this time everyone agrees
await host.locator('button', { hasText: '⟲ Vote to reroll' }).first().click();
await answerAsk(host, 'Make it quieter');
await guest.waitForSelector('text=VOTE · REROLL', { timeout: 15000 });
await guest.locator('div[aria-label="Vote"] button', { hasText: /^Yes$/ }).click();
await guest.waitForSelector('text=REROLLED BY VOTE', { timeout: 15000 });
await host.waitForFunction(() => window.__phc.getState().game.story.entries.filter((e) => e.kind === 'narration' && !e.rerolled).length >= 1, null, { timeout: 15000 });
ok('everyone agrees: the line is rerolled, the old one kept and marked REROLLED BY VOTE, a new one told', await guest.locator('text=REROLLED BY VOTE').count() > 0 && (await narr(host)).some((e) => e.rerolled) && (await narr(host)).some((e) => !e.rerolled));
// an edit: only the words change
await host.locator('button', { hasText: '✎ Vote to reword' }).last().click();
await answerAsk(host, 'Make it quieter');
await guest.waitForSelector('text=VOTE · REWORD', { timeout: 15000 });
await guest.locator('div[aria-label="Vote"] button', { hasText: /^Yes$/ }).click();
await guest.waitForSelector('text=REWORDED BY VOTE', { timeout: 15000 });
ok('a vote to reword changes only the words: REWORDED BY VOTE, with the note', await guest.locator('text=(Reworded: Make it quieter)').count() > 0);
// the Narrator refuses a rewording that would change what happened
await host.locator('button', { hasText: '✎ Vote to reword' }).last().click();
await answerAsk(host, 'MPAT steals 2 million from the vault');
await guest.locator('div[aria-label="Vote"] button', { hasText: /^Yes$/ }).click();
await guest.waitForSelector('text=/The Narrator kept its words/', { timeout: 15000 });
ok('the Narrator refuses a rewording that would change what happened ("The Narrator kept its words")', true);
console.log('errors', host.errors, guest.errors);
const errs = [...host.errors, ...guest.errors].filter((e) => !/Failed to load resource|favicon|youtube|ERR_|net::/i.test(e));
ok('no page errors (' + errs.slice(0, 3).join(' | ') + ')', errs.length === 0);
await browser.close();
