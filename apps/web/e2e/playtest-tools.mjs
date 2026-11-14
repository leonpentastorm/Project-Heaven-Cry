// Character files, portrait upload, the Report button, the spend meter and first-time tips, in two browsers.
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { chromium, player, click, BASE, answerAsk, settle, lockIn } from './lib.mjs';
const require = createRequire(import.meta.url);
const { unzipSync, strFromU8 } = require('fflate');

const browser = await chromium.launch();
const host = await player(browser, 'host', { campaigns: ['m813'] });
// The guest keeps the tips on (lib turns them off for the other tests).
const gctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
await gctx.addInitScript(() => { localStorage.setItem('phc.voice', JSON.stringify({ auto: false })); });
const guest = await gctx.newPage(); guest.errors = [];
guest.on('pageerror', (e) => guest.errors.push('pageerror: ' + e.message));
guest.on('console', (m) => { if (m.type() === 'error' && !/Permissions policy violation/.test(m.text())) guest.errors.push('console: ' + m.text()); });
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };

await host.goto(BASE);
const photo = await host.screenshot({ type: 'jpeg', quality: 90 }); // any real image will do: 1440 × 1000

// 1. Upload a portrait on the creation screen
await click(host, 'CHARACTERS', { exact: true });
await click(host, 'Make a character');
await host.getByPlaceholder('What the squad calls you').fill('Upload Test');
const [chooser] = await Promise.all([host.waitForEvent('filechooser'), click(host, 'Upload', { exact: true })]);
await chooser.setFiles({ name: 'me.jpg', mimeType: 'image/jpeg', buffer: photo });
await host.waitForSelector('img[alt="Your portrait (uploaded)"]', { timeout: 30000 });
ok('upload shows the portrait', /^data:image\/jpeg/.test(await host.locator('img[alt="Your portrait (uploaded)"]').first().getAttribute('src')));
await host.locator('main button[aria-pressed]').first().click().catch(() => {});
await host.locator('button:has-text("Thousand-Planet")').first().click().catch(() => {});
await click(host, 'Next ›');
await host.locator('button', { hasText: /^Use .* ›$/ }).first().click();
await click(host, 'Next ›'); await click(host, 'Next ›'); await click(host, 'Next ›');
await click(host, 'Next ›'); await lockIn(host, { solo: true });
await host.waitForSelector('text=Upload Test', { timeout: 30000 });

// 2. Download it as a file
const [dl] = await Promise.all([host.waitForEvent('download'), host.getByRole('button', { name: 'Download Upload Test as a file' }).click()]);
const zipPath = await dl.path(), files = unzipSync(new Uint8Array(readFileSync(zipPath)));
const json = JSON.parse(strFromU8(files['character.json']));
ok('file is named ' + dl.suggestedFilename(), dl.suggestedFilename() === 'Upload-Test.phc.zip');
ok('file holds the sheet and a full-size portrait (' + Math.round(files['portrait.jpg']?.length / 1024) + ' KB)', json.format === 'phc-character' && json.sheet.name === 'Upload Test' && json.sheet.portrait === 'portrait.jpg' && files['portrait.jpg']?.length > 10000);

// 3. A friend imports it in their room
await host.getByRole('button', { name: 'Delete Upload Test' }).click();
await answerAsk(host); // the game's own dialog: Delete
await click(host, '‹ Back');
await click(host, 'NEW GAME', { exact: true });
await host.getByPlaceholder('Leon').fill('Leon');
await click(host, 'Open a room ›');
await host.waitForSelector('text=The squad');
const code = (await host.locator('text=/ROOM [A-Z0-9]{6}/').first().textContent()).match(/ROOM ([A-Z0-9]{6})/)[1];
await click(host, 'Bring a saved character');
const [hc] = await Promise.all([host.waitForEvent('filechooser'), click(host, 'Import a character file…')]);
await hc.setFiles(zipPath);
await host.waitForSelector('text=✓ LOCKED IN', { timeout: 30000 });
const room = await host.evaluate(() => Object.values(window.__phc.getState().game.characters).map((c) => ({ name: c.name, p: c.portrait.length })));
ok('imported into the room with the small portrait (' + Math.round(room[0].p / 1024) + ' KB)', room[0].name === 'Upload Test' && room[0].p < 80000);
await guest.goto(BASE + '/?room=' + code); await guest.waitForSelector('text=PRESS ANY KEY'); await guest.keyboard.press('Enter'); await guest.getByPlaceholder('Leon').fill('Mai'); await click(guest, 'Join ›');
await guest.waitForSelector('text=Upload Test');
ok('the guest sees the uploaded portrait', await guest.locator('img[src^="data:image/jpeg"]').count() > 0);
await click(guest, 'Create a character');
await guest.getByPlaceholder('What the squad calls you').fill('Ninety-Two');
await guest.locator('main button[aria-pressed]').first().click();
await click(guest, 'Next ›'); await guest.locator('button', { hasText: /^Use .* ›$/ }).first().click();
await click(guest, 'Next ›'); await click(guest, 'Next ›'); await click(guest, 'Next ›');
await click(guest, 'Next ›'); await lockIn(guest);
await guest.waitForSelector('text=✓ LOCKED IN', { timeout: 30000 }); // the Approved stamp files the record ~0.9 s after the press

// 4. Tips for a new player
await host.evaluate(() => window.__phc.setNarrator({ scripted: true }));
await click(host, 'Start session');
await guest.waitForSelector('text=Outpost-813\'s rear landing pad', { timeout: 30000 });
await guest.waitForSelector('text=TIP · YOUR ROUND', { timeout: 30000 });
ok('tip: your round', true);
if (process.env.SHOTS) await guest.screenshot({ path: process.env.SHOTS + '/tip.png' });
await guest.getByRole('button', { name: 'Got it' }).click();
await guest.waitForSelector('text=/TIP · (THE NARRATOR SPEAKS|YOUR SKILLS TALK|SOMETHING BROKE)/', { timeout: 30000 });
await guest.getByRole('button', { name: 'No more tips' }).click();
await settle(guest, 300);
ok('no more tips', await guest.locator('text=/^TIP · /').count() === 0);

// 5. The Report button: one file, never the key
await host.evaluate(() => { window.__phc.setNarrator({ key: 'sk-ant-api03-SECRETSECRET123456', remember: false }); console.warn('test warning for the report'); });
await click(host, '⚑ Report');
await host.getByPlaceholder('What you did, what you expected, what happened instead.').fill('The ramp would not lower.');
if (process.env.SHOTS) await host.screenshot({ path: process.env.SHOTS + '/report.png' });
const [rep] = await Promise.all([host.waitForEvent('download'), click(host, 'Download report')]);
const rj = strFromU8(unzipSync(new Uint8Array(readFileSync(await rep.path())))['report.json']), r = JSON.parse(rj);
ok('report: ' + rep.suggestedFilename(), /^phc-report-[A-Z0-9]{6}-.*\.zip$/.test(rep.suggestedFilename()));
ok('report holds what happened, the save and the error', r.what === 'The ramp would not lower.' && r.game?.characters && r.log.some((l) => /test warning for the report/.test(l.text)));
ok('report never holds the key', !/SECRETSECRET/.test(rj) && r.narrator.hasKey === true);
await host.evaluate(() => window.__phc.setNarrator({ key: '' }));

// 6. The spend meter
// The spend lives in the Narrator chip's menu (UI pass): This session: $… · n Narrator turns [Spend…].
await host.locator('[data-phc-narr-chip]').click();
ok('the Narrator menu shows the spend', /This session: (\$[\d.]+ · \d+ Narrator turns?|no Narrator turns yet)/.test(await host.locator('[data-phc-narr-menu]').textContent()));
await host.locator('[data-phc-narr-menu]').getByRole('button', { name: 'Spend…' }).click();
await host.waitForSelector('text=NARRATOR SPEND');
ok('spend meter opens', true);
if (process.env.SHOTS) await host.screenshot({ path: process.env.SHOTS + '/spend.png' });
await click(host, 'Close');
console.log('errors', host.errors, guest.errors);
await browser.close();
