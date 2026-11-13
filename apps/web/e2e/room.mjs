// The room's mode picker (rules 1.39; docs/design/survival-spec.md section 8.1, Leon's sketch; Survival build step 1).
// A. What a player sees (no test hook): three cards, Survival selected; a locked card can't be picked, by click or by
//    keyboard, and says why through the one hover card; the chips row is gone; the Narrator panel is collapsed and
//    opens on asking; a guest sees the host's room and can't pick; both lock in and the host starts the run, which both
//    see. B. A guest sees the host's pick live: a room opened on Campaign (the suites' test hook) switches to Survival,
//    and Campaign can't be picked back (the engine refuses a locked mode).
import { chromium, player, click, BASE, hostAs, lockIn, until, OUT } from './lib.mjs';
const browser = await chromium.launch();
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const cards = (p) => p.locator('[role="radiogroup"] [role="radio"]');
const card = (p, id) => p.locator('[role="radio"][data-phc-mode="' + id + '"]');
const checked = (p) => p.evaluate(() => [...document.querySelectorAll('[role="radio"][data-phc-mode]')].filter((b) => b.getAttribute('aria-checked') === 'true').map((b) => b.getAttribute('data-phc-mode')).join(','));
const tipShown = (p) => p.evaluate(() => (document.querySelector('.phc-atip')?.textContent || '').trim());
const play = (p) => p.evaluate(() => window.__phc.getState().game?.settings?.play);
const codeOf = async (p) => (await p.locator('text=/ROOM [A-Z0-9]{6}/').first().textContent()).match(/ROOM ([A-Z0-9]{6})/)[1];
async function create(page, name) {
  await click(page, 'Create a character');
  await page.getByPlaceholder('What the squad calls you').fill(name);
  await page.locator('main button[aria-pressed]').first().click();
  await click(page, 'Next ›');
  await page.locator('button', { hasText: /^Use .* ›$/ }).first().click();
  await click(page, 'Next ›'); await click(page, 'Next ›'); await click(page, 'Next ›');
  await page.locator('button', { hasText: 'Line soldier' }).first().click();
  await click(page, 'Next ›'); await lockIn(page);
  await page.waitForSelector('text=✓ LOCKED IN');
}
async function join(page, code, name) {
  await page.goto(BASE + '/?room=' + code); await page.getByPlaceholder('Leon').fill(name); await click(page, 'Join ›');
  await page.waitForSelector('text=The squad');
}

// ---------- A. a player's room ----------
const host = await player(browser, 'host', { play: 'survival' }), guest = await player(browser, 'guest', { play: 'survival' });
await hostAs(host, 'Leon');
await host.waitForSelector('[role="radiogroup"]');
ok('three cards, side by side, in order: SURVIVAL, ROGUELIKE, CAMPAIGN', JSON.stringify(await cards(host).evaluateAll((b) => b.map((x) => x.getAttribute('data-phc-mode')))) === '["survival","roguelike","campaign"]'
  && await host.evaluate(() => { const r = [...document.querySelectorAll('[role="radio"][data-phc-mode]')].map((b) => b.getBoundingClientRect()); return r[0].top === r[1].top && r[1].top === r[2].top && r[0].right <= r[1].left && r[1].right <= r[2].left; }));
ok('a new room selects Survival: its card is checked and says Selected', await checked(host) === 'survival' && await play(host) === 'survival' && /Selected/.test(await card(host, 'survival').textContent()));
ok('Roguelike and Campaign are locked: dimmed, a lock mark, the word "Coming"', (await card(host, 'roguelike').getAttribute('data-locked')) === 'true' && (await card(host, 'campaign').getAttribute('data-locked')) === 'true'
  && /Coming/.test(await card(host, 'campaign').textContent()) && /Coming/.test(await card(host, 'roguelike').textContent()));
ok('the chips row is gone (no "WHERE IT STARTS", no campaign file loader)', !(await host.locator('text=WHERE IT STARTS').count()) && !(await host.locator('text=Load a campaign file').count()));
ok('the Proving Ground is a text button under the cards, not a card', (await host.getByRole('button', { name: /Proving Ground · practice range/ }).count()) === 1 && (await cards(host).count()) === 3);
// a locked card can't be picked: a click ticks nothing and opens its hover card with the reason
const v0 = await host.evaluate(() => window.__phc.getState().game.v);
await card(host, 'campaign').click();
const tip1 = await until(host, () => (document.querySelector('.phc-atip')?.textContent || '').trim() || null, null, 5000).catch(() => '');
ok('clicking the locked Campaign card ticks nothing (' + await checked(host) + ', ' + await play(host) + ') and the hover card says why: "' + tip1 + '"', await checked(host) === 'survival' && await play(host) === 'survival' && /Coming when the campaigns are rewritten/.test(tip1));
ok('… and sends no action', await host.evaluate(() => window.__phc.getState().game.v) === v0);
// keyboard: arrows move, Enter on a locked card picks nothing
await card(host, 'survival').focus(); await host.keyboard.press('ArrowRight');
ok('arrows move between the cards (focus on Roguelike, announced as locked)', await host.evaluate(() => document.activeElement?.getAttribute('data-phc-mode')) === 'roguelike'
  && /locked, coming/.test(await card(host, 'roguelike').getAttribute('aria-label')));
await host.keyboard.press('Enter'); await host.keyboard.press('Space');
ok('Enter and Space on a locked card pick nothing', await checked(host) === 'survival' && await play(host) === 'survival');
// the Narrator panel: collapsed, not hidden
ok('the Narrator panel is collapsed: "Survival needs no Narrator." and no key box', (await host.locator('text=Survival needs no Narrator.').count()) === 1 && !(await host.locator('input[data-narrator-key]').count()));
await click(host, 'Add a Narrator for flavour (optional)');
ok('"Add a Narrator for flavour" opens it (the key box shows)', (await host.locator('input[data-narrator-key]').count()) === 1);
await host.locator('[data-phc-narr-hide]').click();
ok('… and it folds back', !(await host.locator('input[data-narrator-key]').count()));
await host.screenshot({ path: OUT + 'room-picker-host.png' });
// a guest
const code = await codeOf(host);
await join(guest, code, 'Mai');
await guest.waitForSelector('[role="radiogroup"]');
ok('the guest sees the room\'s mode: Survival selected', await checked(guest) === 'survival');
await card(guest, 'roguelike').click();
const tipG1 = await until(guest, () => (document.querySelector('.phc-atip')?.textContent || '').trim() || null, null, 5000).catch(() => '');
ok('a guest\'s click on a locked card says why ("' + tipG1 + '")', /Coming after the advanced classes/.test(tipG1) && await checked(guest) === 'survival');
await guest.mouse.click(5, 5);
await card(guest, 'survival').click();
const tipG2 = await until(guest, () => { const t = (document.querySelector('.phc-atip')?.textContent || '').trim(); return /host/.test(t) ? t : null; }, null, 5000).catch(() => '');
ok('a guest can\'t pick: "Only the host picks this." in the hover card', /Only the host picks this/.test(tipG2) && await play(host) === 'survival');
ok('the guest sees no Narrator box either: "Survival needs no Narrator."', (await guest.locator('text=Survival needs no Narrator.').count()) === 1);
// Start: the run (no key needed)
await create(host, 'Kade');
await create(guest, 'Ha');
const label = (await host.locator('button[data-phc-start]').textContent()).trim();
ok('Start reads "Start the run" and needs no key (' + label + ')', label === 'Start the run' && await host.locator('button[data-phc-start]').isEnabled());
await host.locator('button[data-phc-start]').click();
const hostRun = await until(host, () => !!document.querySelector('[data-phc-run]'), null, 15000).catch(() => false);
const guestRun = await until(guest, () => !!document.querySelector('[data-phc-run]'), null, 15000).catch(() => false);
const run = await host.evaluate(() => { const r = window.__phc.getState().game.run; return r && { state: r.state, stage: r.stage, seed: r.seed }; });
ok('the host starts the run: g.run at stage 1 on the map (' + JSON.stringify(run) + '), shown to host and guest', !!hostRun && !!guestRun && run && run.state === 'map' && run.stage === 1 && /^PHC-/.test(run.seed));
ok('the cards are gone while the run is on', !(await cards(host).count()) && !(await cards(guest).count()));
const errsA = [host, guest].flatMap((p) => p.errors || []);
await host.context().close(); await guest.context().close();

// ---------- B. the host's pick, live on the guest's screen ----------
const host2 = await player(browser, 'host2', { play: 'campaign' }), guest2 = await player(browser, 'guest2', { play: 'survival' });
await hostAs(host2, 'Nora');
await host2.waitForSelector('[role="radiogroup"]');
ok('a room opened on Campaign by the test hook shows its campaign starts', await checked(host2) === 'campaign' && (await host2.locator('text=WHERE IT STARTS').count()) === 1);
await join(guest2, await codeOf(host2), 'Zed');
await guest2.waitForSelector('[role="radiogroup"]');
ok('the guest sees Campaign selected (locked on their page, and selected)', await checked(guest2) === 'campaign' && /Selected/.test(await card(guest2, 'campaign').textContent()));
await card(host2, 'survival').click();
const live = await until(guest2, () => [...document.querySelectorAll('[role="radio"][data-phc-mode]')].find((b) => b.getAttribute('aria-checked') === 'true')?.getAttribute('data-phc-mode') === 'survival', null, 15000).then(() => true, () => false);
ok('the host picks Survival and the guest sees it change live', live && await play(host2) === 'survival');
ok('the campaign starts are gone with it', !(await guest2.locator('text=WHERE IT STARTS').count()) && !(await host2.locator('text=WHERE IT STARTS').count()));
await card(host2, 'campaign').click();
const toast = await until(host2, () => { const t = document.body.innerText; return /Campaign is not open yet/.test(t) ? 'shown' : null; }, null, 5000).catch(() => '');
ok('the locked Campaign can\'t be picked back: the engine refuses it in words, both still on Survival', toast === 'shown' && await play(host2) === 'survival' && await checked(guest2) === 'survival');
await guest2.screenshot({ path: OUT + 'room-picker-guest.png' });

const errs = [...errsA, ...[host2, guest2].flatMap((p) => p.errors || [])];
ok('no page errors (' + errs.slice(0, 3).join(' | ') + ')', !errs.length);
await browser.close();
