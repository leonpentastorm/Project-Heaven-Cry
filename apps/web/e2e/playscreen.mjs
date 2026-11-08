// The play screen (Leon, 6 Nov): fixed panels that scroll on their own, the story sticking to the newest line with a
// Latest button, a point of interest rolled in its own popup, and the area map's status and log, with real ammo.
import { chromium, player, click, BASE, hostAs } from './lib.mjs';
const browser = await chromium.launch();
const host = await player(browser, 'host');
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const SHOTS = process.env.SHOTS;

await hostAs(host, 'Leon');
await click(host, 'Create a character');
await host.getByPlaceholder('What the squad calls you').fill('MPAT');
await host.locator('main button[aria-pressed]').first().click();
await click(host, 'Next ›'); await host.locator('button', { hasText: /^Use .* ›$/ }).first().click();
await click(host, 'Next ›'); await click(host, 'Next ›'); await click(host, 'Next ›'); await host.locator('button', { hasText: 'Line soldier' }).first().click();
await click(host, 'Next ›'); await click(host, 'Lock in and bring to the room');
await host.evaluate(() => window.__phc.setNarrator({ scripted: true }));
await click(host, 'Start session');
await host.waitForSelector('.phc-story', { timeout: 15000 });
await host.waitForFunction(() => window.__phc.getState().game.story.entries.some((e) => e.kind === 'narration'), null, { timeout: 15000 });

// 1. Layout: the page never scrolls; the story does.
const lay = await host.evaluate(() => { const s = document.querySelector('.phc-story'); return { page: document.documentElement.scrollHeight <= innerHeight + 2, story: getComputedStyle(s).overflowY, input: !!document.querySelector('.phc-input') }; });
ok('the page stays put; the story column scrolls on its own', lay.page && lay.story === 'auto' && lay.input);
// fill the story so it scrolls, then scroll up: the Latest button appears and takes you back
await host.setViewportSize({ width: 1440, height: 640 }); await host.waitForTimeout(600);
ok('the story overflows at this size', await host.evaluate(() => { const s = document.querySelector('.phc-story'); return s.scrollHeight > s.clientHeight + 50; }));
await host.evaluate(() => { const s = document.querySelector('.phc-story'); s.scrollTop = s.scrollHeight; }); await host.waitForTimeout(300);
const atBottom = () => host.evaluate(() => { const s = document.querySelector('.phc-story'); return s.scrollHeight - s.scrollTop - s.clientHeight < 170; });
ok('it sticks to the newest line', await atBottom());
await host.evaluate(() => { document.querySelector('.phc-story').scrollTop = 0; });
await host.waitForSelector('button[aria-label="Jump to the latest line"]', { timeout: 3000 });
if (SHOTS) await host.screenshot({ path: SHOTS + '/play-latest.png' });
await host.click('button[aria-label="Jump to the latest line"]'); await host.waitForTimeout(900);
ok('Latest jumps back down', await atBottom());
await host.setViewportSize({ width: 1440, height: 1000 });

// 2. A point of interest: walk up, try an approach, the dice open right there.
await host.evaluate(() => { const g = window.__phc.getState().game; const me = Object.keys(g.characters)[0]; window.__phc.act({ type: 'world/act', charId: me, act: 'end' }); });
await host.waitForFunction(() => window.__phc.getState().game.story.await === 'players', null, { timeout: 15000 });
const nearby = host.locator('aside[aria-label="Map and speaking order"] button', { hasText: 'approaches' }).first();
await nearby.click();
if (await host.locator('button', { hasText: 'Walk up to it' }).count()) { await click(host, 'Walk up to it'); await host.waitForTimeout(500); }
await host.locator('button', { hasText: 'Try this · 2 AP' }).first().click();
await host.waitForSelector('div[aria-label="Dice table"]', { timeout: 5000 });
ok('trying an approach opens the dice right there', true);
const inBar = await host.locator('text=THE NARRATOR CALLS FOR A CHECK · CLICK TO ROLL').count();
ok('the chat bar stays for the Narrator\'s own checks', inBar === 0);
await click(host, 'Throw the d20'); await host.waitForTimeout(400);
if (await host.locator('button', { hasText: 'Continue' }).count()) await click(host, 'Continue');
await host.waitForTimeout(400);
ok('the attempt is settled', await host.evaluate(() => window.__phc.getState().game.checks.every((k) => k.done || !k.poi)));
await host.locator('div[role="dialog"] button', { hasText: /^Close$/ }).first().click();

// 3. The area map: status, ammo, a log; a shot at a thing spends a round and shows.
await host.evaluate(() => { const g = window.__phc.getState().game; const me = Object.keys(g.characters)[0]; window.__phc.act({ type: 'world/act', charId: me, act: 'end' }); });
await host.waitForFunction(() => { const g = window.__phc.getState().game; return g.story.await === 'players' && !g.checks.some((k) => !k.done); }, null, { timeout: 15000 });
const before = await host.evaluate(() => { const g = window.__phc.getState().game; return Object.values(g.characters)[0].loaded; });
await host.evaluate(() => {
  const g = window.__phc.getState().game, c = Object.values(g.characters)[0], [x, y] = g.story.positions[c.id].split(',').map(Number);
  const o = g.story.objects.find((o) => o.hp == null && !o.hidden && Math.abs(o.pos.split(',')[0] - x) + Math.abs(o.pos.split(',')[1] - y) <= 6);
  window.__shotAt = o && o.name; if (o) window.__phc.act({ type: 'world/act', charId: c.id, act: 'attack', objId: o.id, mode: 'shot' });
});
await host.waitForTimeout(600);
const after = await host.evaluate(() => { const g = window.__phc.getState().game; return { loaded: Object.values(g.characters)[0].loaded, last: g.story.entries.filter((e) => e.act).at(-1), at: window.__shotAt }; });
ok('a shot at "' + after.at + '" spends a round (' + before + ' -> ' + after.loaded + ') and shows as an action', after.at ? (before == null ? after.loaded < 30 : after.loaded === before - 1) && /fires at/.test(after.last?.text || '') : true);
await click(host, 'Area map');
await host.waitForSelector('div[aria-label="Your status"]', { timeout: 4000 });
const hud = await host.locator('div[aria-label="Your status"]').textContent();
ok('the area map shows HP, AP and ammo: ' + hud.replace(/\s+/g, ' ').slice(0, 90), /HP/.test(hud) && /AP/.test(hud) && /loaded/.test(hud));
const log = await host.locator('div[aria-label="What just happened"]').textContent();
ok('the area map has a log with the shot', !after.at || /fires at/.test(log));
if (SHOTS) await host.screenshot({ path: SHOTS + '/play-area.png' });
console.log('errors', host.errors);
await browser.close();
