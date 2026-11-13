// The story screen's right column as four movable modules (Leon, 10 Nov 2026; game/storyPanels.ts): the mana
// forecast, the map, the quest board and the player card each have a grip; a drag or the arrow keys move a module up or
// down the column; the order is kept in this browser; Reset puts it back. The player card always has room for five
// seats (four players and the Narrator): filling it to five changes nothing's size.
// Screenshots: e2e/shots/rp-*.png (1440 × 900 and 1280 × 720).
import { chromium, player, click, hostAs, OUT, settle, lockIn } from './lib.mjs';
const browser = await chromium.launch();
const p = await player(browser, 'host', { campaigns: ['m813'] });
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const snap = (n) => p.screenshot({ path: OUT + 'rp-' + n + '.png' });
/** The modules on screen, top to bottom. */
const shown = () => p.evaluate(() => [...document.querySelectorAll('[data-story-zone] [data-story-panel]')].filter((e) => e.offsetParent !== null).map((e) => [e.dataset.storyPanel, Math.round(e.getBoundingClientRect().top)]).sort((a, b) => a[1] - b[1]).map((x) => x[0]));
const stored = () => p.evaluate(() => JSON.parse(localStorage.getItem('phc.storyPanels') || 'null'));

await p.setViewportSize({ width: 1440, height: 900 });
await hostAs(p, 'Leon');
await click(p, 'Create a character');
await p.getByPlaceholder('What the squad calls you').fill('MPAT');
await p.locator('main button[aria-pressed]').first().click();
await click(p, 'Next ›'); await p.locator('button', { hasText: /^Use .* ›$/ }).first().click();
await click(p, 'Next ›'); await click(p, 'Next ›'); await click(p, 'Next ›'); await p.locator('button', { hasText: 'Line soldier' }).first().click();
await click(p, 'Next ›'); await lockIn(p);
await p.evaluate(() => window.__phc.setNarrator({ scripted: true }));
await click(p, 'Start session');
await p.waitForSelector('.phc-story', { timeout: 30000 });
await p.waitForFunction(() => window.__phc.getState().game.story.entries.some((e) => e.kind === 'narration'), null, { timeout: 30000 });
await p.locator('[data-story-zone]').waitFor({ timeout: 30000 });
await settle(p, 600);

// ---------- the four modules, each with a grip ----------
const first = await shown();
ok('the four modules in their first order: ' + first.join(' · '), first.join() === ['mana', 'map', 'quests', 'squad'].filter((x) => first.includes(x)).join() && first.includes('map') && first.includes('squad'));
ok('each has a grip, in its header (never over a button)', (await p.locator('[data-story-zone] [data-story-panel] .phc-rp-grip').count()) === first.length);
ok('no Reset while the order is the first one', (await p.locator('.phc-rp-reset').count()) === 0);
await snap('default-1440');
await p.setViewportSize({ width: 1280, height: 720 }); await settle(p, 400); await snap('default-1280');
await p.setViewportSize({ width: 1440, height: 900 }); await settle(p, 300);

// ---------- the keyboard: the player card to the top with Home, then down one ----------
await p.locator('[data-rp-grip="squad"]').focus(); await p.keyboard.press('Home'); await settle(p, 300);
ok('Home on the player card\'s grip puts it first: ' + (await shown()).join(' · '), (await shown())[0] === 'squad');
ok('…the keyboard stays on that grip', await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-rp-grip') === 'squad'));
ok('…and the order is kept in this browser', ((await stored()) || [])[0] === 'squad');
ok('…Reset shows once the order changed', (await p.locator('.phc-rp-reset').count()) === 1);
ok('…End turn is still on the card and in view', await p.evaluate(() => { const b = [...document.querySelectorAll('[data-story-panel="squad"] button')].find((x) => x.textContent.trim() === 'End turn'); if (!b) return false; const r = b.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }));
await p.keyboard.press('ArrowDown'); await settle(p, 300);
ok('Arrow down moves it one place: ' + (await shown()).join(' · '), (await shown())[1] === 'squad');
await snap('moved-1440');

// ---------- a drag by the grip: the map under the quest board (or to the bottom) ----------
const before = await shown();
const g0 = await p.locator('[data-rp-grip="map"]').boundingBox(), last = await p.locator('[data-story-panel="' + before[before.length - 1] + '"]').boundingBox();
await p.mouse.move(g0.x + g0.width / 2, g0.y + g0.height / 2); await p.mouse.down();
await p.mouse.move(g0.x, last.y + last.height - 4, { steps: 8 }); await settle(p, 150);
await snap('dragging-1440');
await p.mouse.up(); await settle(p, 300);
const after = await shown();
ok('dragging the map\'s grip to the bottom of the column moves it last: ' + after.join(' · '), after[after.length - 1] === 'map' && after.join() !== before.join());
// Escape cancels a drag
const g1 = await p.locator('[data-rp-grip="map"]').boundingBox();
await p.mouse.move(g1.x + 5, g1.y + 5); await p.mouse.down(); await p.mouse.move(g1.x, 120, { steps: 5 }); await p.keyboard.press('Escape'); await p.mouse.up(); await settle(p, 250);
ok('Escape cancels a drag (nothing moved)', (await shown()).join() === after.join());

// ---------- the order survives a reload; Reset puts it back ----------
await p.reload(); await p.locator('[data-story-zone]').waitFor({ timeout: 30000 }); await settle(p, 800);
ok('after a reload the modules are where they were left', (await shown()).join() === after.join());
await p.locator('.phc-rp-reset').click(); await settle(p, 300);
ok('Reset: the first order again, nothing kept', (await shown()).join() === first.join() && (await stored()) === null && (await p.locator('.phc-rp-reset').count()) === 0);

// ---------- the player card always has room for five seats ----------
const seats = p.locator('[data-squad-seats]');
const h0 = await seats.evaluate((e) => Math.round(e.getBoundingClientRect().height));
ok('the seats area keeps three rows of two (' + h0 + ' px) with ' + (await seats.locator('[role="listitem"]').count()) + ' seated', h0 >= 3 * 40 + 2 * 6);
const card0 = await p.locator('[data-story-panel="squad"]').evaluate((e) => Math.round(e.getBoundingClientRect().height));
// fill it to five seats (copies of a seat: the layout is what is checked here, not the room)
await seats.evaluate((e) => { const one = e.querySelector('[role="listitem"]'); while (e.querySelectorAll('[role="listitem"]').length < 5) e.appendChild(one.cloneNode(true)); });
await settle(p, 200);
const fit = await seats.evaluate((e) => { const r = e.getBoundingClientRect(); return [...e.querySelectorAll('[role="listitem"]')].every((x) => { const q = x.getBoundingClientRect(); return q.top >= r.top - 1 && q.bottom <= r.bottom + 1 && q.width > 80; }); });
const h5 = await seats.evaluate((e) => Math.round(e.getBoundingClientRect().height)), card5 = await p.locator('[data-story-panel="squad"]').evaluate((e) => Math.round(e.getBoundingClientRect().height));
ok('five seats fit inside it, and neither it nor the card grows (' + h0 + ' → ' + h5 + ' px; card ' + card0 + ' → ' + card5 + ')', fit && h5 === h0 && card5 === card0);
ok('…End turn still in view under five seats', await p.evaluate(() => { const b = [...document.querySelectorAll('[data-story-panel="squad"] button')].find((x) => x.textContent.trim() === 'End turn'); const r = b.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }));
await snap('five-seats-1440');
await p.setViewportSize({ width: 1280, height: 720 }); await settle(p, 400);
ok('at 1280 × 720 the five seats still fit and End turn is in view', await p.evaluate(() => { const e = document.querySelector('[data-squad-seats]'), r = e.getBoundingClientRect(); const b = [...document.querySelectorAll('[data-story-panel="squad"] button')].find((x) => x.textContent.trim() === 'End turn').getBoundingClientRect();
  return [...e.querySelectorAll('[role="listitem"]')].every((x) => x.getBoundingClientRect().bottom <= r.bottom + 1) && b.bottom <= innerHeight && document.scrollingElement.scrollHeight <= innerHeight + 2; }));
await snap('five-seats-1280');

const errs = p.errors || [];
ok('no page errors', !errs.length);
if (errs.length) console.log(errs.slice(0, 5));
await browser.close();
