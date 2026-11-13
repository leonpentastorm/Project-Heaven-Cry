// OOC, the mission board and the act's end (spec: OOC, missions and end states), with the scripted Narrator (no API).
// The scripted Narrator answers OOC questions in its ooc field and marks "done:<objective id>" from a player's line.
import { chromium, player, click, hostAs, settle, lockIn } from './lib.mjs';
const browser = await chromium.launch();
const host = await player(browser, 'host', { campaigns: ['m813'] });
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const SHOTS = process.env.SHOTS;
const G = () => host.evaluate(() => window.__phc.getState().game);

await hostAs(host, 'Leon');
await click(host, 'Create a character');
await host.getByPlaceholder('What the squad calls you').fill('MPAT');
await host.locator('main button[aria-pressed]').first().click();
await click(host, 'Next ›'); await host.locator('button', { hasText: /^Use .* ›$/ }).first().click();
await click(host, 'Next ›'); await click(host, 'Next ›'); await click(host, 'Next ›'); await host.locator('button', { hasText: 'Line soldier' }).first().click();
await click(host, 'Next ›'); await lockIn(host);
await host.evaluate(() => window.__phc.setNarrator({ scripted: true }));
await click(host, 'Start session');
await host.waitForSelector('.phc-story', { timeout: 30000 });
await host.waitForFunction(() => window.__phc.getState().game.story.await === 'players', null, { timeout: 30000 });

// 1. The board: the quest board in the right column counts the open objectives (UI pass 3.3); Full board ⤢ opens the
// whole board.
const qb = host.locator('[data-quest-board]');
const count = () => qb.locator('[data-qb-count]').textContent().then((t) => t.trim());
const mb = { click: () => qb.getByRole('button', { name: 'Full board' }).click() };
ok('the quest board counts 5 open', (await count()) === '· 5');
ok('it lists the objectives without opening anything', /Report to Sergeant Nine-Nine/.test(await qb.textContent()));
await mb.click();
const board = host.getByRole('dialog', { name: 'Mission board' });
await board.waitFor({ timeout: 30000 });
const bt = await board.textContent();
ok('the board shows the mission, its goal and its objectives', /The Shield Line/.test(bt) && /Get the wounded line to the rear pad/.test(bt) && /☐Report to Sergeant Nine-Nine/.test(bt));
ok('no Narrator notes or done_when on the board', !/Done when|done when|Narrator only/.test(bt));
if (SHOTS) { await settle(host, 900); await host.screenshot({ path: SHOTS + '/missions-board.png' }); }
await host.getByRole('button', { name: 'Close the mission board' }).click();
await board.waitFor({ state: 'detached', timeout: 30000 });

// 2. OOC: the chip, the muted line, the Say still unused.
await host.getByRole('button', { name: 'OOC', exact: true }).click();
await host.getByLabel('What do you do?').fill('Quest complete, now what?');
await click(host, 'Ask OOC', { exact: true });
await host.waitForSelector('.phc-ooc', { timeout: 30000 });
const line = await host.locator('.phc-ooc').last().textContent();
ok('the OOC line shows muted and labelled: ' + line, /^OOC · Leon/.test(line) && /Quest complete, now what\?/.test(line));
const g1 = await G();
ok('it did not use the Say', g1.story.spoken[g1.hostId] == null && g1.story.oocAsk.length === 1);
// a marker works with the chip off, too
await host.getByLabel('What do you do?').fill('(OOC: and is there a map?)');
await click(host, 'Send', { exact: true });
await host.waitForFunction(() => window.__phc.getState().game.story.oocAsk?.length === 2, null, { timeout: 30000 });
ok('a typed [OOC]-style marker is OOC too', true);

// The round closes (end turn): the scripted Narrator answers in its own box.
const endTurn = () => host.evaluate(() => { const g = window.__phc.getState().game, me = Object.keys(g.characters)[0]; window.__phc.act({ type: 'world/act', charId: me, act: 'end' }); });
await endTurn();
await host.waitForFunction(() => window.__phc.getState().game.story.entries.some((e) => e.kind === 'ooc' && e.head === 'NARRATOR · OOC'), null, { timeout: 30000 });
await settle(host, 400);
const box = await host.locator('.phc-ooc', { hasText: 'NARRATOR · OOC' }).last().textContent();
ok('the Narrator\'s OOC answer shows in its box: ' + box.slice(0, 90), /NARRATOR · OOC/.test(box) && /The Shield Line/.test(box));
ok('the questions are answered', !(await G()).story.oocAsk);
if (SHOTS) await host.screenshot({ path: SHOTS + '/missions-ooc.png' });

// 3. An objective completes: the toast for everyone and the board's tick.
const say = async (text) => {
  await host.waitForFunction(() => window.__phc.getState().game.story.await === 'players', null, { timeout: 30000 });
  await host.getByLabel('What do you do?').fill(text); await click(host, 'Send', { exact: true }); await endTurn();
};
await say('I go to the sergeant and listen. done:reach_nine_nine');
const toast = host.locator('[role="status"]', { hasText: '✓ OBJECTIVE' });
await toast.first().waitFor({ timeout: 30000 });
ok('the toast slides in: ' + (await toast.first().textContent()), /Report to Sergeant Nine-Nine/.test(await toast.first().textContent()));
ok('the quest board counts one fewer', (await count()) === '· 4');
ok('…and ticks it in its DONE group (folded until opened)', (await qb.locator('[data-qb-group="done"]').count()) === 1);
await mb.click(); await board.waitFor({ timeout: 30000 });
ok('the board ticks it', /✓Report to Sergeant Nine-Nine/.test(await board.textContent()));
if (SHOTS) await host.screenshot({ path: SHOTS + '/missions-tick.png' });
await host.getByRole('button', { name: 'Close the mission board' }).click();

// 4. The act ends: the rest of the tutorial, then the ramp. The MISSION COMPLETE card, then Continue.
await say('We work the line, drive off the drones, choose, and carry them east. done:tend_the_line done:first_fight done:who_stays done:carry_east');
await host.waitForFunction(() => window.__phc.getState().game.story.missions?.active[0] === 'the_ramp', null, { timeout: 30000 });
ok('the next mission activates', /^· [1-9]/.test(await count()) && /THE RAMP|Get aboard|aboard/i.test(await qb.textContent()));
await say('Everyone goes up the ramp. done:get_aboard');
const card = host.getByRole('dialog', { name: 'Mission complete' });
await card.waitFor({ timeout: 30000 });
const ct = await card.textContent();
ok('the act-end card shows: ' + ct.slice(0, 80), /MISSION COMPLETE/.test(ct) && /Act 1 · The Last Ship/.test(ct) && /Get the wounded aboard/.test(ct));
if (SHOTS) { await settle(host, 900); await host.screenshot({ path: SHOTS + '/missions-act-end.png' }); }
await card.getByRole('button', { name: 'Continue' }).click();
await card.waitFor({ state: 'detached', timeout: 30000 });
ok('Continue returns to the story', await host.locator('.phc-story').isVisible());
await host.reload(); await host.waitForSelector('.phc-story', { timeout: 90000 }); await settle(host, 800); // a reload took over 30 s beside other suites (load 35)
ok('the card stays closed after a reload', !(await host.getByRole('dialog', { name: 'Mission complete' }).count()));
console.log('errors', host.errors.filter((e) => !/ERR_TUNNEL_CONNECTION_FAILED|youtube/i.test(e)));
await browser.close();
