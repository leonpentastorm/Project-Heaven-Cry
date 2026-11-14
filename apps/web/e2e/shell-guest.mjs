// The shell with a guest (review of the UI pass): a guest who presses Leave mid-fight is told the truth (the host passes
// their character's turns), the host gets "Pass Mai's turn ›" on the waiting card when the guest's unit comes up, and the
// fight goes on; when the host leaves, the guest's "host is offline" bar sits under the header (Leave stays clickable)
// and carries its own Leave the room. No browser confirm/prompt/alert anywhere.
import { chromium, player, click, BASE, hostAs, settle, lockIn } from './lib.mjs';
const browser = await chromium.launch();
const host = await player(browser, 'host', { campaigns: ['m813'] }), guest = await player(browser, 'guest');
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const SHOTS = process.env.SHOTS;
for (const p of [host, guest]) await p.context().addInitScript(() => {
  window.__browserDialogs = [];
  for (const k of ['alert', 'confirm', 'prompt']) window[k] = (...a) => { window.__browserDialogs.push(k); throw new Error('browser ' + k + ' called: ' + a[0]); };
});
async function create(page, name, family, kit) {
  await click(page, 'Create a character');
  await page.getByPlaceholder('What the squad calls you').fill(name);
  await page.locator('main button[aria-pressed]').first().click();
  await click(page, 'Next ›');
  if (family) await page.getByRole('tab', { name: family, exact: true }).click();
  await page.locator('button', { hasText: /^Use .* ›$/ }).first().click();
  await click(page, 'Next ›'); await click(page, 'Next ›'); await click(page, 'Next ›');
  await click(page, 'Next ›'); await lockIn(page);
  await page.waitForSelector('text=✓ LOCKED IN');
}
await hostAs(host, 'Leon');
await host.waitForSelector('text=The squad');
const code = (await host.locator('text=/ROOM [A-Z0-9]{6}/').first().textContent()).match(/ROOM ([A-Z0-9]{6})/)[1];
await create(host, 'MPAT', null, 'Field medic');
await guest.goto(BASE + '/?room=' + code); await guest.getByPlaceholder('Leon').fill('Mai'); await click(guest, 'Join ›');
await guest.waitForSelector('text=The squad');
await create(guest, 'Ninety-Two', 'Guns and hunters', 'Line soldier');
await host.evaluate(() => window.__phc.setNarrator({ scripted: true }));
await click(host, 'Start session');
await guest.waitForSelector('text=Outpost-813\'s rear landing pad', { timeout: 30000 });
await host.getByLabel('What do you do?').fill('I walk up the ramp with 4-Ten on my shoulders.'); await click(host, 'Send', { exact: true }); await click(host, 'End turn', { exact: true });
await guest.getByLabel('What do you do?').fill('I cover him from the wreck line.'); await click(guest, 'Send', { exact: true }); await click(guest, 'End turn', { exact: true });
await host.waitForSelector('text=CLICK TO ROLL', { timeout: 30000 });
await settle(host, 300);
if (!(await host.locator('div[aria-label="Dice table"]').count())) await host.locator('button', { hasText: 'Get Keel to lower the ramp.' }).click();
await click(host, /Throw/);
await host.waitForSelector('text=/SUCCESS|FAILURE|COMPLICATION/');
await click(host, 'Continue', { exact: true });
const fought = await host.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 30000 }).then(() => true, () => false);
ok('the fight started', fought);
await guest.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 30000 });
await settle(guest, 2500);

// 1. The guest leaves mid-fight: the dialog says what really happens.
await guest.locator('header [data-phc-leave]').click();
const gd = guest.locator('[data-phc-dialog] [role="alertdialog"]');
await gd.waitFor({ timeout: 30000 });
const gtext = await gd.textContent();
ok('the guest is told the host passes their turns while away', /the host passes your character's turns while you are away/.test(gtext) && !/goes on without you/.test(gtext));
await gd.getByRole('button', { name: 'Leave', exact: true }).click();
await guest.waitForFunction(() => window.__phc.getState().screen === 'home', null, { timeout: 30000 });
ok('…and lands on the title', true);

// 2. The host: when the guest's unit comes up, "Pass Mai's turn ›" ends it; the fight goes on.
const turnOf = () => host.evaluate(() => { const s = window.__phc.getState(), g = s.game, cb = g && g.combat; if (!cb || cb.over) return 'over';
  const u = cb.units.find((x) => x.id === cb.order[cb.turn]); if (!u || u.side === 'foe') return 'foe'; return u.charId && g.characters[u.charId].owner === s.me.id ? 'mine' : 'guest'; });
let passed = false, sawButton = false;
for (let i = 0; i < 200 && !passed; i++) {
  const t = await turnOf();
  if (t === 'over') break;
  if (t === 'mine') { const e = host.getByRole('button', { name: 'End turn', exact: true }); if (await e.isEnabled().catch(() => false)) await e.click().catch(() => {}); await settle(host, 300); continue; }
  if (t === 'guest') {
    const b = host.locator('[data-phc-skip-away]');
    if (await b.count()) {
      sawButton = true;
      ok('the waiting card offers "' + (await b.textContent()).trim() + '"', /Pass Mai’s turn/.test(await b.textContent()));
      if (SHOTS) await host.screenshot({ path: SHOTS + '/shell-pass-turn.png' });
      const before = await host.evaluate(() => { const cb = window.__phc.getState().game.combat; return cb.round + ':' + cb.turn; });
      await b.click(); await settle(host, 800);
      const after = await host.evaluate(() => { const cb = window.__phc.getState().game.combat; return { at: cb.round + ':' + cb.turn, away: cb.log.find((l) => /is away/.test(l)) || '' }; });
      ok('…which passes it ("' + after.away + '")', after.at !== before && !!after.away);
      passed = true; break;
    }
  }
  await settle(host, 250);
}
ok('the host saw the Pass button on the away guest\'s turn', sawButton);

// 3. The guest comes back; the host leaves: the bar sits under the header, Leave stays clickable, the bar has its own.
await guest.goto(BASE + '/?room=' + code); await guest.getByPlaceholder('Leon').fill('Mai').catch(() => {}); await click(guest, 'Join ›').catch(() => {});
await guest.waitForFunction(() => ['combat', 'main'].includes(window.__phc.getState().screen), null, { timeout: 30000 });
await settle(guest, 1500);
await host.close();
const bar = guest.locator('[data-phc-conn-bar]');
const away = await bar.waitFor({ timeout: 30000 }).then(() => true, () => false);
ok('the guest sees the host is offline', away && /host is offline/.test(await bar.textContent()));
await settle(guest, 1200);
const hit = await guest.evaluate(() => { const b = document.querySelector('header [data-phc-leave]'); if (!b) return 'no Leave'; const r = b.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!el && b.contains(el) ? 'ok' : 'covered by ' + (el && el.outerHTML.slice(0, 80)); });
ok('the header\'s Leave is not covered by the bar (' + hit + ')', hit === 'ok');
ok('the bar has its own Leave the room', (await bar.getByRole('button', { name: 'Leave the room' }).count()) === 1);
if (SHOTS) await guest.screenshot({ path: SHOTS + '/shell-host-away.png' });
await bar.getByRole('button', { name: 'Leave the room' }).click();
await gd.waitFor({ timeout: 30000 });
await gd.getByRole('button', { name: 'Leave', exact: true }).click();
await guest.waitForFunction(() => window.__phc.getState().screen === 'home', null, { timeout: 30000 }).then(() => ok('…which leaves', true), () => ok('…which leaves', false));
ok('no browser confirm/prompt/alert', (await guest.evaluate(() => window.__browserDialogs.length)) === 0);
ok('no page errors on the guest', guest.errors.length === 0);
if (guest.errors.length) console.log(guest.errors.slice(0, 5).join('\n'));
await browser.close();
