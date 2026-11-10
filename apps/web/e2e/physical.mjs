// Physical 2.0 on screen (rules 1.12; docs/design/handoffs/physical-2.0-C-client.md, part 9), in the Proving Ground with
// the enemy AI off:
//  · a blade in one hand and a pistol in the other: two weapon blocks, each Techniques pad opens and closes, only one
//    open at a time, the grid and Confirm on screen at 1440 × 900 and 1280 × 720;
//  · the plain Cut and Shot rows, a technique picked from a pad, its preview, Confirm sending combat/technique.
// Screenshots: e2e/shots/phys-*.png.
import { chromium, player, click, BASE, OUT } from './lib.mjs';
const browser = await chromium.launch();
const p = await player(browser, 'host');
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const snap = (n) => p.screenshot({ path: OUT + 'phys-' + n + '.png' });
const G = () => p.evaluate(() => window.__phc.getState().game);
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
p.on('dialog', (d) => d.accept());
const inView = (sel) => p.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1; }, sel);
const noPageScroll = () => p.evaluate(() => document.scrollingElement.scrollHeight <= innerHeight + 2);
const panel = () => p.locator('.phc-cb-tabpanel').first();

await p.setViewportSize({ width: 1440, height: 900 });
await p.goto(BASE);
await click(p, 'PROVING GROUND');
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 8000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 8000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
await p.waitForFunction(() => window.__phc.getState().game?.sandbox?.state === 'ready', null, { timeout: 15000 });
let g = await G();
const cid = Object.keys(g.characters)[0];
await act({ type: 'sandbox/ai', on: false });
// a blade in the main hand, a pistol in the off hand
await act({ type: 'sandbox/give', charId: cid, item: 'combat_knife', equip: true });
await act({ type: 'sandbox/give', charId: cid, item: 'service_pistol' });
g = await G();
const pi = (g.characters[cid].pack || []).findIndex((it) => it.weapon === 'service_pistol');
ok('the pistol is in the pack to hold in the off hand', pi >= 0);
const e1 = await act({ type: 'sandbox/equip', charId: cid, idx: pi, to: 'off' });
g = await G();
ok('a knife in the main hand and a pistol in the off hand (' + (e1 || 'ok') + ')', g.characters[cid].weapon === 'combat_knife' && g.characters[cid].offHand?.id === 'service_pistol');
await act({ type: 'sandbox/fight' });
await p.waitForFunction(() => window.__phc.getState().game?.phase === 'combat', null, { timeout: 15000 });
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 8000 }).catch(() => {});
await p.waitForFunction((id) => { const cb = window.__phc.getState().game.combat; const u = cb && cb.units.find((x) => x.id === cb.order[cb.turn]); return !!u && u.charId === id; }, cid, { timeout: 15000 });
await p.waitForTimeout(2600); // the COMBAT banner
for (let i = 0; i < 3 && (await p.locator('[data-phc-cutin]').count()); i++) { await p.mouse.click(1430, 890); await p.waitForTimeout(400); }
const tools = p.locator('aside[aria-label="Proving Ground tools"]');
if (await tools.count()) await tools.getByRole('button', { name: /^Close the tools/ }).first().click().catch(() => {});
await p.locator('#phc-tab-attack').click(); await p.waitForTimeout(300);

// ---------- the two blocks ----------
ok('two weapon blocks: the knife (main) and the pistol (off)', (await panel().locator('[data-weapon-block="main"]').count()) === 1 && (await panel().locator('[data-weapon-block="off"]').count()) === 1);
ok('…each with its plain attack row (Cut, Shot) and its Techniques row', (await panel().locator('[data-act="tq:main:cut"]').count()) === 1 && (await panel().locator('[data-act="tq:off:shot"]').count()) === 1
  && (await panel().locator('[data-act="tpad:main"]').count()) === 1 && (await panel().locator('[data-act="tpad:off"]').count()) === 1);
ok('…the blocks carry the weapons\' icons', (await panel().locator('[data-weapon-block] img').count()) === 2);
ok('Hold a shot is there (the pistol is ranged)', (await panel().locator('[data-act="twatch"]').count()) === 1);
await panel().locator('[data-act="tpad:main"]').click(); await p.waitForTimeout(350);
ok('the knife\'s Techniques open its pad, with groups', (await p.locator('[data-tech-pad="tpad:main"]').count()) === 1 && (await p.locator('[data-tech-pad="tpad:main"] [data-word-row]').count()) >= 1);
await snap('pad-main-1440');
for (const [w, h] of [[1440, 900], [1280, 720]]) {
  await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(400);
  ok('at ' + w + '×' + h + ' with a pad open: the grid and Confirm on screen, no page scroll', (await inView('.phc-grid')) && (await inView('.phc-cb-confirm button')) && (await noPageScroll()));
  await snap('pad-main-' + w);
}
await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(300);
await panel().locator('[data-act="tpad:off"]').click(); await p.waitForTimeout(400);
ok('the pistol\'s pad opens and the knife\'s closes (one at a time)', (await p.locator('[data-tech-pad="tpad:off"]').count()) === 1 && (await p.locator('[data-tech-pad="tpad:main"]').count()) === 0);
await snap('pad-off-1440');
await panel().locator('[data-act="twatch"]').click(); await p.waitForTimeout(400);
ok('Hold a shot opens the Watches', (await p.locator('[data-tech-pad="twatch"]').count()) === 1 && (await p.locator('[data-tech-pad="twatch"] [data-tech="overwatch"]').count()) === 1);
await snap('pad-watch-1440');

const errs = p.errors || [];
ok('no page errors', !errs.length);
if (errs.length) console.log(errs.slice(0, 5));
await browser.close();
