// The shell (UI pass, docs/design/ui-pass-shell.md): the header in one row at every width, Save in one click, Leave
// that asks in the game's own dialog (Stay keeps you; Save and leave lands on the title with the room saved), the
// room's big button that takes you back (never a greyed "In session"), the key's Saved / Test key feedback, the Area
// map button and its M key, the settings cog (tabs, volumes that persist), the Music panel being music only, the
// floating buttons never covering End turn, and the fight's header with the same cluster. Throughout, the browser's
// own confirm(), prompt() and alert() are stubbed to throw: none of them may ever be called.
import { chromium, player, click, hostAs, settle, BASE } from './lib.mjs';
const browser = await chromium.launch();
const host = await player(browser, 'host');
const refused = []; host.on('response', (r) => { if (r.status() >= 400) refused.push(r.status() + ' ' + r.url().slice(0, 120)); });
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const SHOTS = process.env.SHOTS;
await host.context().addInitScript(() => {
  window.__browserDialogs = [];
  for (const n of ['confirm', 'prompt', 'alert']) window[n] = (...a) => { window.__browserDialogs.push(n + ': ' + a.join(' ')); throw new Error('browser ' + n + '() called'); };
});
const noBrowserDialogs = async (where) => ok('no browser confirm/prompt/alert (' + where + ')', (await host.evaluate(() => window.__browserDialogs.length)) === 0);
await host.setViewportSize({ width: 1440, height: 900 });

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
await host.waitForFunction(() => window.__phc.getState().game.story.await === 'players', null, { timeout: 15000 });
await settle(host, 600);
const code = await host.evaluate(() => window.__phc.getState().code);

// 1. The header: one row at 1280, 1440 and 1920; no STORY | COMBAT; Area map, Narrator chip, room, Save, ⚙, ⚑, Leave.
for (const w of [1280, 1440, 1920]) {
  await host.setViewportSize({ width: w, height: 900 }); await settle(host, 250);
  const h = await host.locator('header').first().evaluate((e) => e.getBoundingClientRect().height);
  ok('the header is one row at ' + w + ' wide (' + h + ' px)', h <= 64);
}
// 1b. Narrower (review of the UI pass): the header wraps instead of spilling off the page; the Narrator chip shrinks to its
// dot and word and never sits on ROOM; every button of the cluster is on screen and clickable.
for (const w of [1024, 768, 390]) {
  await host.setViewportSize({ width: w, height: 844 }); await settle(host, 300);
  const m = await host.evaluate(() => {
    const h = document.querySelector('header'), chip = h.querySelector('[data-phc-narr-chip]').getBoundingClientRect(), room = h.querySelector('[data-phc-room]').getBoundingClientRect();
    const hit = (sel) => { const b = h.querySelector(sel); const r = b.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return r.right <= innerWidth + 0.5 && r.left >= 0 && !!el && b.contains(el); };
    const overlap = !(chip.right <= room.left || room.right <= chip.left || chip.bottom <= room.top || room.bottom <= chip.top);
    return { hs: h.scrollWidth, hc: h.clientWidth, ds: document.documentElement.scrollWidth, iw: innerWidth, overlap, hits: ['[data-phc-room]', '[data-phc-save]', '[data-phc-cog]', '[data-phc-report]', '[data-phc-leave]', '[data-phc-narr-chip]', '[data-phc-areamap]'].filter((x) => !hit(x)) };
  });
  ok('at ' + w + ' wide the header fits (' + m.hs + ' / ' + m.hc + ', page ' + m.ds + ')', m.hs <= m.hc + 1 && m.ds <= m.iw + 1);
  ok('…the Narrator chip is clear of ROOM', !m.overlap);
  ok('…and every header button is on screen and clickable' + (m.hits.length ? ' (not: ' + m.hits.join(' ') + ')' : ''), m.hits.length === 0);
  if (SHOTS) await host.screenshot({ path: SHOTS + '/shell-header-' + w + '.png', clip: { x: 0, y: 0, width: w, height: 160 } });
}
await host.setViewportSize({ width: 1440, height: 900 }); await settle(host, 250);
const head = host.locator('header').first();
ok('no STORY | COMBAT toggle', (await head.getByRole('button', { name: 'STORY', exact: true }).count()) === 0 && (await head.getByRole('button', { name: 'COMBAT', exact: true }).count()) === 0);
ok('the header has Area map, the Narrator, ROOM ' + code + ' ›, Save, Settings, Report and Leave',
  (await head.locator('[data-phc-areamap]').count()) === 1 && (await head.locator('[data-phc-narr-chip]').count()) === 1 && (await head.getByRole('button', { name: new RegExp('^Room ' + code) }).count()) === 1
  && (await head.getByRole('button', { name: 'Save', exact: true }).count()) === 1 && (await head.getByRole('button', { name: 'Settings', exact: true }).count()) === 1
  && (await head.getByRole('button', { name: /Report a problem/ }).count()) === 1 && (await head.getByRole('button', { name: 'Leave the room', exact: true }).count()) === 1);
if (SHOTS) await host.screenshot({ path: SHOTS + '/shell-header.png', clip: { x: 0, y: 0, width: 1440, height: 64 } });

// 2. Save: one click, the button says so.
await head.getByRole('button', { name: 'Save', exact: true }).click(); await settle(host, 250);
ok('Save → Saved ✓ on the button', (await head.locator('[data-phc-save]').textContent()).trim() === 'Saved ✓');
await host.keyboard.press('Control+s'); await settle(host, 150);
ok('Ctrl+S saves too (no page save)', await host.evaluate(() => Date.now() - (window.__phc.getState().savedAt || 0) < 2000));

// 3. The Narrator chip's menu: state, spend, voice line, Voice settings, Change key, Memory; Escape closes it.
await head.locator('[data-phc-narr-chip]').click();
const menu = host.locator('[data-phc-narr-menu]');
ok('the Narrator menu opens with the spend, the voice and Change key', (await menu.count()) === 1 && /This session:/.test(await menu.textContent()) && (await menu.getByRole('button', { name: 'Voice settings ⚙' }).count()) === 1 && (await menu.getByRole('button', { name: 'Change key or model ›' }).count()) === 1);
ok('the voice line keeps its hook for the voice tests', (await host.locator('[data-phc-voice-chip]').count()) >= 1);
if (SHOTS) await host.screenshot({ path: SHOTS + '/shell-narrator-menu.png', clip: { x: 0, y: 0, width: 900, height: 340 } });
await host.keyboard.press('Escape'); await settle(host, 200);
ok('Escape closes it', (await menu.count()) === 0);

// 4. The Area map: the header button, and M (not while typing).
await head.locator('[data-phc-areamap]').click(); await settle(host, 500);
const area = host.locator('div[role="dialog"][aria-label="Area map"]');
ok('Area map opens the area map', (await area.count()) === 1);
await host.keyboard.press('m'); await settle(host, 500);
ok('M closes it', (await area.count()) === 0);
await host.keyboard.press('m'); await settle(host, 500);
ok('M opens it', (await area.count()) === 1);
await host.keyboard.press('m'); await settle(host, 500);
await host.getByLabel('What do you do?').fill('m'); await settle(host, 200);
ok('typing an m in the Say box does not open it', (await area.count()) === 0);
await host.getByLabel('What do you do?').fill('');

// 5. The settings cog: four tabs; volumes persist; the Music panel is music only and links here.
await head.getByRole('button', { name: 'Settings', exact: true }).click();
const set = host.locator('div[role="dialog"][aria-label="Settings"]');
await set.waitFor({ timeout: 15000 });
ok('the cog opens Settings with Audio, Voice, Combat and Display', (await set.getByRole('tab').allTextContents()).join(',') === 'Audio,Voice,Combat,Display');
ok('the default mix: combat 100%, interface 35%', (await set.locator('input[data-phc-vol="combat"]').inputValue()) === '100' && (await set.locator('input[data-phc-vol="ui"]').inputValue()) === '35');
await set.locator('input[data-phc-vol="combat"]').fill('130');
await set.locator('input[data-phc-vol="ui"]').fill('20');
if (SHOTS) await host.screenshot({ path: SHOTS + '/shell-settings-audio.png' });
await set.getByRole('tab', { name: 'Combat' }).click();
await set.locator('button[data-phc-speed="fast"]').click();
ok('Combat speed: Fast is stored for the combat track', (await host.evaluate(() => localStorage.getItem('phc.combatSpeed'))) === 'fast');
await set.locator('button[data-phc-speed="normal"]').click();
await set.getByRole('tab', { name: 'Display' }).click();
await set.locator('input[data-phc-vol="float"]').fill('40');
await set.getByRole('tab', { name: 'Voice' }).click();
ok('the Voice tab holds the voice settings', (await set.locator('[data-phc-voice-settings]').count()) === 1);
// Focus goes into the dialog and stays there; the screen's keys don't reach under it.
ok('Settings takes the focus (' + (await host.evaluate(() => document.activeElement?.textContent || '')) + ')', await host.evaluate(() => !!document.activeElement?.closest('[aria-label="Settings"]')));
for (let i = 0; i < 25; i++) await host.keyboard.press('Tab');
ok('…and Tab stays inside it', await host.evaluate(() => !!document.activeElement?.closest('[aria-label="Settings"]')));
await host.keyboard.press('m'); await settle(host, 300);
ok('…and M does not open the area map under it', (await host.locator('div[role="dialog"][aria-label="Area map"]').count()) === 0);
await set.getByRole('button', { name: 'Done' }).click(); await settle(host, 300);
ok('closing gives the focus back to the cog', await host.evaluate(() => document.activeElement?.hasAttribute('data-phc-cog')));
// At phone width: the tabs on top, the sliders full width, nothing cut off.
await host.setViewportSize({ width: 390, height: 844 }); await settle(host, 300);
await host.locator('header [data-phc-cog]').click(); await set.waitFor({ timeout: 15000 });
const nar = await set.evaluate((d) => { const b = d.querySelector('[data-phc-settings]'), r = d.querySelector('input[data-phc-vol="combat"]').getBoundingClientRect(); return { sw: b.scrollWidth, cw: b.clientWidth, slider: Math.round(r.width) }; });
ok('Settings at 390 wide: the combat slider is ' + nar.slider + ' px wide, nothing cut off (' + nar.sw + ' / ' + nar.cw + ')', nar.slider >= 200 && nar.sw <= nar.cw + 1);
if (SHOTS) await host.screenshot({ path: SHOTS + '/shell-settings-390.png' });
await host.keyboard.press('Escape'); await settle(host, 300);
await host.setViewportSize({ width: 1440, height: 900 }); await settle(host, 300);
const saved = await host.evaluate(() => JSON.parse(localStorage.getItem('phc.ui') || '{}'));
ok('the volumes and opacity are saved (combat ' + saved.combat + ', interface ' + saved.ui + ', opacity ' + saved.float + ')', saved.combat === 130 && saved.ui === 20 && saved.float === 40);
const music = host.locator('button[aria-label^="Music:"]');
await music.click(); await settle(host, 400);
const mpanel = host.locator('div[role="dialog"][aria-label="Music"]');
ok('the Music panel is music only (no voice settings in it)', (await mpanel.locator('[data-phc-voice-settings]').count()) === 0);
await mpanel.getByRole('button', { name: 'Voice settings ⚙' }).click(); await settle(host, 400);
ok('its Voice settings link opens Settings on the Voice tab', (await set.count()) === 1 && (await set.getByRole('tab', { name: 'Voice' }).getAttribute('aria-selected')) === 'true');
await host.keyboard.press('Escape'); await settle(host, 300);
await host.setViewportSize({ width: 1440, height: 900 }); await host.reload();
await host.waitForSelector('.phc-story', { timeout: 15000 }); await settle(host, 500);
ok('…and still there after a reload', (await host.evaluate(() => JSON.parse(localStorage.getItem('phc.ui') || '{}').combat)) === 130);

// 6. The floating buttons: bottom left, see-through at rest, never over End turn.
await host.mouse.move(720, 300); await settle(host, 400);
const fl = await host.evaluate(() => [...document.querySelectorAll('[data-phc-float]')].map((b) => { const r = b.getBoundingClientRect(); return { k: b.getAttribute('data-phc-float'), x: r.left, o: getComputedStyle(b).opacity }; }));
ok('the Music and Memory buttons sit bottom left at the chosen opacity (' + fl.map((f) => f.k + ' ' + f.o).join(', ') + ')', fl.length === 2 && fl.every((f) => f.x < 200 && Math.abs(Number(f.o) - 0.4) < 0.02));
const flw = await host.evaluate(() => [...document.querySelectorAll('[data-phc-float]')].map((b) => Math.round(b.getBoundingClientRect().width)));
ok('outside a fight too they are icons (' + flw.join(', ') + ' px wide)', flw.every((w) => w <= 44));
const box = await music.boundingBox(); await host.mouse.move(box.x + box.width / 2, box.y - 60); await settle(host, 400);
ok('they come up to full when the pointer is near', Number(await music.evaluate((b) => getComputedStyle(b).opacity)) === 1);
const endTurn = host.getByRole('button', { name: 'End turn', exact: true });
const eb = await endTurn.boundingBox();
ok('nothing covers End turn at 1440×900', await host.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y); return !!el && /End turn/.test(el.closest('button')?.textContent || ''); }, [eb.x + eb.width / 2, eb.y + eb.height / 2]));
if (SHOTS) await host.screenshot({ path: SHOTS + '/shell-story-1440.png' });

// 6b. The right column (UI pass 3): the mana forecast outside fights, NEAR YOU capped with its own scrollbar, the quest
// board always open, grouped, its own scrollbar with a town's worth of quests; the header has no MISSIONS or ECHO.
ok('the header no longer has MISSIONS or the ECHO pips', (await head.getByRole('button', { name: /^Mission board/ }).count()) === 0 && (await head.locator('[data-phc-echo-head]').count()) === 0);
const col = host.locator('aside[aria-label="Map and speaking order"]');
const sfc = col.locator('[data-story-forecast]');
ok('the mana forecast is on the story screen: ' + ((await sfc.textContent().catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 60), (await sfc.count()) === 1 && /NORMAL AIR/.test(await sfc.textContent()) && /15\/40/.test(await sfc.textContent()));
await sfc.getByRole('button', { name: 'More ▸' }).click(); await settle(host, 250);
ok('More ▸ opens what this air does and what moves it, over the column', /IN THIS AIR/.test(await sfc.textContent()) && /WHAT MOVES IT/.test(await sfc.textContent()));
await sfc.getByRole('button', { name: 'Less ▾' }).click();
await host.keyboard.press('m'); await settle(host, 500);
ok('the area map keeps its mana line', /MANA 15/.test(await host.locator('div[role="dialog"][aria-label="Area map"]').textContent()));
await host.keyboard.press('m'); await settle(host, 500);
const qb = col.locator('[data-quest-board]');
ok('the quest board is open in the right column with its count (' + (await qb.locator('[data-qb-count]').textContent()) + ')', (await qb.count()) === 1 && /· 5/.test(await qb.locator('[data-qb-count]').textContent()));
await host.evaluate(() => { const jobs = (from) => Array.from({ length: 12 }, (_, i) => ({ id: 'job' + (from + i), title: 'Job ' + (from + i) + ': fetch the thing from the market', text: 'The baker asked.' }));
  window.__phc.act({ type: 'narrator/turn', turn: { narration: 'The town is full of work.', side: jobs(0), missions: [{ mission: 'the_shield_line', objective: 'carry_east', status: 'revealed', where: { zone: 'rear_pad' } }] } });
  window.__phc.act({ type: 'narrator/turn', turn: { narration: 'More work.', side: jobs(12) } }); });
await settle(host, 800);
ok('29 open quests counted', /· 29/.test(await qb.locator('[data-qb-count]').textContent()));
const groups = await qb.locator('[data-qb-group]').evaluateAll((els) => els.map((e) => e.getAttribute('data-qb-group')));
ok('grouped by Area: ' + groups.join(', '), groups.join(',') === 'z:rear_pad,somewhere,side');
ok('every quest is listed (' + (await qb.locator('[data-qb-row]').count()) + ' rows)', (await qb.locator('[data-qb-row]').count()) === 29);
const scr = qb.locator('[data-qb-scroll]');
const sc = await scr.evaluate((e) => ({ sh: e.scrollHeight, ch: e.clientHeight, oy: getComputedStyle(e).overflowY }));
ok('the board scrolls inside itself (' + sc.ch + ' of ' + sc.sh + ' px shown)', sc.oy === 'auto' && sc.sh > sc.ch + 200);
const colScroll = await col.evaluate((e) => e.scrollHeight - e.clientHeight);
await scr.evaluate((e) => { e.scrollTop = e.scrollHeight; }); await settle(host, 200);
ok('…and the column around it does not move (' + colScroll + ' px of column overflow)', colScroll <= 2 && (await col.evaluate((e) => e.scrollTop)) === 0);
ok('the last side job is reachable by scrolling', await qb.locator('[data-qb-row="side/job23"]').isVisible());
const eb2 = await host.getByRole('button', { name: 'End turn', exact: true }).boundingBox();
ok('End turn stays on screen under the board', eb2 && eb2.y + eb2.height <= 900);
await qb.locator('[data-qb-group="side"] > button').first().click(); await settle(host, 200);
ok('a group folds (and the fold is remembered)', (await qb.locator('[data-qb-row="side/job0"]').count()) === 0 && /"area:side":true/.test(await host.evaluate(() => localStorage.getItem('phc.questFold') || '')));
await qb.locator('[data-qb-group="side"] > button').first().click();
await qb.getByRole('button', { name: 'Quest', exact: true }).click(); await settle(host, 200);
ok('by Quest: the mission, then the side jobs', (await qb.locator('[data-qb-group]').evaluateAll((els) => els.map((e) => e.getAttribute('data-qb-group')))).join(',') === 'm:the_shield_line,side');
await qb.getByRole('button', { name: 'Area', exact: true }).click();
if (SHOTS) await host.screenshot({ path: SHOTS + '/shell-story-quests-1440.png' });
await host.setViewportSize({ width: 1280, height: 720 }); await settle(host, 300);
const eb3 = await host.getByRole('button', { name: 'End turn', exact: true }).boundingBox();
const qh = await scr.evaluate((e) => e.clientHeight);
ok('at 1280×720 the board still shows ' + qh + ' px of quests and End turn is on screen', qh >= 120 && eb3 && eb3.y + eb3.height <= 720);
if (SHOTS) await host.screenshot({ path: SHOTS + '/shell-story-quests-1280.png' });
await host.setViewportSize({ width: 1440, height: 900 }); await settle(host, 300);
await qb.getByRole('button', { name: 'Full board' }).click();
ok('Full board ⤢ opens the whole mission board', await host.getByRole('dialog', { name: 'Mission board' }).waitFor({ timeout: 15000 }).then(() => true, () => false));
await host.getByRole('button', { name: 'Close the mission board' }).click(); await settle(host, 300);
const near = col.locator('[data-near-list] .phc-near-scroll');
ok('NEAR YOU is capped at 132 px with its own scrollbar', (await near.evaluate((e) => getComputedStyle(e).maxHeight + ' ' + getComputedStyle(e).overflowY)) === '132px auto');

// 6c. Echo's home: a row on the sheet next to HP and MP; it explains itself.
const er = host.locator('[data-phc-echo]');
ok('the Echo row sits with HP, MP and XP: ' + (await er.textContent()).replace(/\s+/g, ' ').trim(), /ECHO/.test(await er.textContent()) && /1 \/ 3/.test(await er.textContent()) && /reroll a d20/.test(await er.textContent()));
await er.click(); await settle(host, 250);
const eh = host.locator('[data-phc-echo-help]');
const et = await eh.textContent();
ok('it explains itself: what it does, how you get it, how much you hold, where you spend it', /A second chance/.test(et) && /GET IT/.test(et) && /HOLD/.test(et) && /SPEND IT/.test(et) && /indulge an Overreach/.test(et) && /in a fight: not yet/.test(et));
if (SHOTS) await host.screenshot({ path: SHOTS + '/shell-echo.png', clip: { x: 0, y: 60, width: 360, height: 600 } });
await er.click();
await host.evaluate(() => { const g = window.__phc.getState().game; window.__phc.act({ type: 'narrator/turn', turn: { narration: 'A good moment.', echo: [{ charId: Object.keys(g.characters)[0], n: 1, why: 'a fine call' }] } }); });
await settle(host, 250);
ok('a gain flares the new diamond and says so', (await host.locator('[data-phc-echo] .phc-echo-gain').count()) === 1 && /2 \/ 3/.test(await er.textContent()));
await host.waitForSelector('text=+1 ECHO', { timeout: 15000 }).then(() => ok('…with a toast', true), () => ok('…with a toast', false));

// 7. Leave: Stay keeps you here.
await head.getByRole('button', { name: 'Leave the room', exact: true }).click();
const dlg = host.locator('[role="alertdialog"]');
await dlg.waitFor({ timeout: 15000 });
ok('Leave asks in the game\'s own dialog: Save and leave or Stay', /Leave the room\?/.test(await dlg.textContent()) && (await dlg.getByRole('button', { name: 'Save and leave' }).count()) === 1);
if (SHOTS) await host.screenshot({ path: SHOTS + '/shell-leave-dialog.png' });
await dlg.getByRole('button', { name: 'Stay' }).click(); await settle(host, 300);
ok('Stay: still in the session', (await dlg.count()) === 0 && (await host.evaluate(() => window.__phc.getState().screen)) === 'main');

// 8. The room in session: the key says it saved, Test key reports, the big button takes you back.
await head.getByRole('button', { name: new RegExp('^Room ' + code) }).click();
await host.waitForSelector('input[data-narrator-key]', { timeout: 15000 });
// Nothing in this suite may reach the real provider: every other call to it (a Narrator turn made while the test key is
// in) gets the same 401 here. (It used to go out for real; behind a proxy that answered 403, which read as a page error.)
await host.route('https://api.anthropic.com/**', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }) }));
await host.route('https://api.anthropic.com/v1/models**', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }) }));
await host.locator('input[data-narrator-key]').fill('sk-' + 'ant-api03-not-a-real-key') // fake, split so the repo's key check stays clean;
await host.waitForSelector('[data-phc-key-saved]', { timeout: 15000 });
ok('typing a key says: Saved for this session, used from the next turn', /Saved for this session · the Narrator uses it from its next turn/.test(await host.locator('[data-phc-key-saved]').textContent()));
await host.locator('[data-phc-key-test]').click();
await host.waitForSelector('[data-phc-key-test-result]:has-text("✗")', { timeout: 15000 });
ok('Test key with a refused key says why, in red with ✗', /✗ Anthropic rejected the API key/.test(await host.locator('[data-phc-key-test-result]').textContent()));
await host.route('https://api.anthropic.com/v1/models**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [{ id: 'claude-opus-5-5' }, { id: 'claude-sonnet-5' }] }) }));
await host.locator('[data-phc-key-test]').click();
await host.waitForSelector('[data-phc-key-test-result]:has-text("✓")', { timeout: 15000 });
ok('…and a good one: ✓ the key works', /✓ Anthropic answered: the key works \(2 models\)/.test(await host.locator('[data-phc-key-test-result]').textContent()));
const start = host.locator('[data-phc-start]');
await start.scrollIntoViewIfNeeded();
ok('the big button reads Return to the session ›, enabled', (await start.textContent()).trim() === 'Return to the session ›' && !(await start.isDisabled()));
if (SHOTS) await host.screenshot({ path: SHOTS + '/shell-room-insession.png', fullPage: true });
ok('the room has no Save and leave any more', (await host.getByRole('button', { name: 'Save and leave' }).count()) === 0);
await start.click(); await settle(host, 500);
ok('…and it works', (await host.evaluate(() => window.__phc.getState().screen)) === 'main');
await host.waitForSelector('text=Narrator settings updated', { timeout: 15000 }).then(() => ok('returning says the Narrator settings were updated', true), () => ok('returning says the Narrator settings were updated', false));
// The header's Back to the session › says so too (review of the UI pass: only the big button did).
await host.waitForSelector('text=Narrator settings updated', { state: 'detached', timeout: 9000 }).catch(() => {});
await head.getByRole('button', { name: new RegExp('^Room ' + code) }).click();
await host.waitForSelector('input[data-narrator-key]', { timeout: 15000 });
await host.locator('input[data-narrator-key]').fill('sk-' + 'ant-api03-another-fake-key');
await host.waitForSelector('[data-phc-key-saved]', { timeout: 15000 });
await host.locator('header [data-phc-back-session]').click(); await settle(host, 300);
ok('the header\'s Back to the session › lands on the story', (await host.evaluate(() => window.__phc.getState().screen)) === 'main');
await host.waitForSelector('text=Narrator settings updated', { timeout: 15000 }).then(() => ok('…and says the Narrator settings were updated', true), () => ok('…and says the Narrator settings were updated', false));
await host.evaluate(() => window.__phc.setNarrator({ key: '', scripted: true }));
await host.unroute('https://api.anthropic.com/v1/models**');

// 9. The fight: the same cluster in the combat header; the story screen offers the way back.
await host.getByLabel('What do you do?').fill('I walk up the ramp with 4-Ten on my shoulders.'); await click(host, 'Send', { exact: true }); await click(host, 'End turn', { exact: true });
await host.waitForSelector('text=CLICK TO ROLL', { timeout: 20000 }).catch(() => {});
if (!(await host.locator('div[aria-label="Dice table"]').count())) await host.locator('button', { hasText: /CLICK TO ROLL/ }).first().click().catch(() => {});
await click(host, /Throw/).catch(() => {});
await click(host, 'Continue', { exact: true }).catch(() => {});
const fought = await host.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 30000 }).then(() => true, () => false);
if (fought) {
  await settle(host, 2500);
  const ch = host.locator('header.phc-cb-head');
  ok('the combat header has the room, Save, Settings, Report and Leave', (await ch.locator('[data-phc-room]').count()) === 1 && (await ch.locator('[data-phc-save]').count()) === 1 && (await ch.locator('[data-phc-cog]').count()) === 1 && (await ch.locator('[data-phc-report]').count()) === 1 && (await ch.getByRole('button', { name: 'Leave the room' }).count()) === 1);
  ok('…and no STORY tab', (await ch.getByRole('button', { name: 'STORY', exact: true }).count()) === 0);
  ok('the combat header is one row', (await ch.evaluate((e) => e.getBoundingClientRect().height)) <= 64);
  // Echo in a fight (review of the UI pass): its own row under HP in the You card, with the (?) explainer; the small
  // line no longer carries it.
  const ce = host.locator('.phc-me-full [data-phc-echo]');
  ok('the You card has the Echo row: ' + ((await ce.textContent().catch(() => '')) || '').replace(/\s+/g, ' ').trim(), (await ce.count()) === 1 && /ECHO/.test(await ce.textContent()) && /\/ 3/.test(await ce.textContent()));
  await ce.click(); await settle(host, 250);
  ok('…which explains itself', /A second chance/.test(await host.locator('.phc-me-full [data-phc-echo-help]').textContent().catch(() => '')));
  await ce.click();
  ok('…and the small lines no longer say "Echo n"', !/· Echo \d/.test(await host.locator('.phc-me-full').textContent()));
  const icons = await host.evaluate(() => [...document.querySelectorAll('[data-phc-float]')].map((b) => Math.round(b.getBoundingClientRect().width)));
  ok('in a fight the floating buttons are icons (' + icons.join(', ') + ' px wide)', icons.length === 2 && icons.every((w) => w <= 44));
  if (SHOTS) await host.screenshot({ path: SHOTS + '/shell-combat-1440.png' });
  await host.evaluate(() => window.__phc.go('main')); await settle(host, 600);
  ok('on the story screen during a fight: Back to the fight ›', (await host.locator('header [data-phc-tofight]').count()) === 1 && (await host.locator('header [data-phc-areamap]').count()) === 0);
  await host.locator('header [data-phc-tofight]').click(); await settle(host, 600);
  ok('…which goes back to the fight', (await host.evaluate(() => window.__phc.getState().screen)) === 'combat');
} else ok('the fight started (scripted Narrator)', false);

// 10. Save and leave: the title, with the room under Saved sessions.
await host.locator('[data-phc-leave]').first().click();
await dlg.waitFor({ timeout: 15000 });
ok('in a fight the dialog says the fight is saved where it is', /The fight is saved where it is/.test(await dlg.textContent()));
await dlg.getByRole('button', { name: 'Save and leave' }).click();
await host.waitForFunction(() => window.__phc.getState().screen === 'home', null, { timeout: 15000 });
ok('Save and leave lands on the title', true);
ok('…with the room saved', await host.evaluate((c) => JSON.parse(localStorage.getItem('phc.sessions') || '[]').some((s) => s.code === c), code));
await noBrowserDialogs('the whole walk');
// A resource that failed to load is a page error only when OUR server refused it. The other two are known: the stubbed
// provider's 401 (the Test key ✗ step), and the Music panel's video host, which a sandbox's proxy answers with 403.
const ours = refused.filter((x) => x.includes(' ' + BASE));
ok('no page errors (refused by our own server: ' + (ours.join(', ') || 'nothing') + '; by others: ' + refused.filter((x) => !ours.includes(x)).join(', ') + ')', host.errors.filter((e) => !/Failed to load resource/.test(e)).length === 0 && ours.length === 0);
if (host.errors.length) console.log(host.errors.slice(0, 5).join('\n'));
await browser.close();
