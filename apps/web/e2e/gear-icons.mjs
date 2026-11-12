// Item icons on screen (Physical 2.0, implementer C part 1; art/style-guide/weapon-icons.md): a weapon's, armour
// piece's or shield's monoline icon beside its name wherever an item is listed:
//  · the creation Kit step (each kit's weapons);
//  · the Proving Ground's Equipped, Pack and Give lists;
//  · the sheet's GEAR tab (the hands, the body slots, the backpack rows);
//  · the backpack in a fight, the reload card, a pile's hover and the pick-up checklist.
// An item with no icon (a magazine, rounds, a ration pack) draws nothing in the slot.
// Screenshots: e2e/shots/icons-*.png (1440 × 900 and 1280 × 720).
import { chromium, player, hostAs, click, pickAction, BASE, OUT, settle } from './lib.mjs';
const browser = await chromium.launch();
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const ICON = 'img[src^="data:image/svg+xml"]';

// ---------- 1. the Kit step ----------
{
  const p = await player(browser, 'kit');
  await p.setViewportSize({ width: 1440, height: 900 });
  await hostAs(p, 'Leon');
  await click(p, 'Create a character');
  for (const [w, h] of [[1440, 900], [1280, 720]]) {
    await p.setViewportSize({ width: w, height: h });
    await p.getByRole('navigation', { name: 'Creation steps' }).getByRole('button', { name: 'Kit' }).click(); await settle(p, 350);
    await p.locator('[data-kit-icons]').first().waitFor({ timeout: 30000 });
    if (w === 1440) {
      const per = await p.locator('[data-kit-icons]').evaluateAll((xs) => xs.map((x) => x.querySelectorAll('img').length));
      ok('the Kit step: every kit card shows its weapons as icons (' + per.join(', ') + ')', per.length >= 4 && per.every((n) => n >= 1));
      ok('…the Sigil student shows the Evoker glove and the Soul initiate the Emanator glove', (await p.locator('[data-kit-icons] img[title="Evoker"]').count()) === 1 && (await p.locator('[data-kit-icons] img[title="Emanator"]').count()) === 1);
      ok('…at 48 px', (await p.locator('[data-kit-icons] img').first().evaluate((e) => Math.round(e.getBoundingClientRect().width))) === 48);
    }
    await p.screenshot({ path: OUT + 'icons-kit-' + w + '.png' });
  }
  await p.close();
}

// ---------- 2. the Proving Ground: gearing up ----------
const p = await player(browser, 'host');
const G = () => p.evaluate(() => window.__phc.getState().game);
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const snap = (n) => p.screenshot({ path: OUT + 'icons-' + n + '.png' });
p.on('dialog', (d) => d.accept());
await p.setViewportSize({ width: 1440, height: 900 });
await p.goto(BASE);
await click(p, 'PROVING GROUND');
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 20000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 20000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
await p.waitForFunction(() => window.__phc.getState().game?.sandbox?.state === 'ready', null, { timeout: 30000 });
let g = await G();
const cid = Object.keys(g.characters)[0];
await act({ type: 'sandbox/ai', on: false });
// a pistol in hand, a buckler in the off hand, a helmet worn, a knife and a rifle in the pack
await act({ type: 'sandbox/give', charId: cid, item: 'service_pistol', equip: true });
await act({ type: 'sandbox/give', charId: cid, item: 'buckler', equip: true });
await act({ type: 'sandbox/give', charId: cid, item: 'field_helmet', equip: true });
await act({ type: 'sandbox/give', charId: cid, item: 'combat_knife' });
await act({ type: 'sandbox/give', charId: cid, item: 'evoker' });
await settle(p, 400);
const tools = p.locator('aside[aria-label="Proving Ground tools"]').first();
await tools.waitFor({ timeout: 30000 });
const eq = tools.locator('section[aria-label="Equipped"]');
ok('the Proving Ground: Equipped shows the pistol\'s, the buckler\'s and the helmet\'s icons', (await eq.locator(ICON).count()) >= 3);
ok('…the Pack shows the Evoker glove', (await tools.locator('section[aria-label="Pack"]').getByText(/^Evoker/).first().locator('xpath=ancestor::div[1]').locator(ICON).count()) === 1);
ok('…the Pack shows the knife\'s icon, and nothing for magazines and rounds', await (async () => {
  const rows = tools.locator('section[aria-label="Pack"] > div > div, section[aria-label="Pack"] div[style*="flex-wrap"]');
  const knife = tools.locator('section[aria-label="Pack"]').getByText(/Combat knife/).first();
  const kRow = knife.locator('xpath=ancestor::div[1]');
  const mag = tools.locator('section[aria-label="Pack"]').getByText(/magazine/i).first().locator('xpath=ancestor::div[1]');
  void rows; return (await kRow.locator(ICON).count()) === 1 && (await mag.locator(ICON).count()) === 0;
})());
ok('the Give list: weapons and armour carry icons, at 32 px', (await tools.locator('section[aria-label="Give"] ' + ICON).count()) >= 10
  && (await tools.locator('section[aria-label="Give"] ' + ICON).first().evaluate((e) => Math.round(e.getBoundingClientRect().width))) === 32);
await snap('pg-1440');
await p.setViewportSize({ width: 1280, height: 720 }); await settle(p, 400); await snap('pg-1280');
await p.setViewportSize({ width: 1440, height: 900 }); await settle(p, 300);

// ---------- 3. the sheet's GEAR tab ----------
await p.getByRole('tab', { name: 'GEAR', exact: true }).first().click(); await settle(p, 300);
const sheetIcons = await p.locator('img').evaluateAll((xs) => xs.filter((x) => (x.getAttribute('src') || '').startsWith('data:image/svg+xml') && x.getBoundingClientRect().left < 340 && x.getBoundingClientRect().width > 0).length);
ok('the sheet\'s GEAR tab: the hands, the helmet\'s slot and the pack\'s knife have icons (' + sheetIcons + ')', sheetIcons >= 4);
await snap('sheet-gear-1440');
await p.setViewportSize({ width: 1280, height: 720 }); await settle(p, 400); await snap('sheet-gear-1280');
await p.setViewportSize({ width: 1440, height: 900 }); await settle(p, 300);

// ---------- 4. a fight: the backpack, the reload card, a pile ----------
await act({ type: 'sandbox/fight' });
await p.waitForFunction(() => window.__phc.getState().game?.phase === 'combat', null, { timeout: 30000 });
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 20000 }).catch(() => {});
const mine = (g) => g.combat.units.find((u) => u.charId === cid);
await p.waitForFunction((id) => { const cb = window.__phc.getState().game.combat; const u = cb && cb.units.find((x) => x.id === cb.order[cb.turn]); return !!u && u.charId === id; }, cid, { timeout: 30000 });
for (let i = 0; i < 3 && (await p.locator('[data-phc-cutin]').count()); i++) { await p.mouse.click(1430, 890); await settle(p, 400); }
await p.locator('.phc-grid').first().waitFor();
await settle(p, 2500); // the COMBAT banner
await p.getByRole('button', { name: /^Open your backpack/ }).first().click().catch(async () => { await p.keyboard.press('b'); }); await settle(p, 500);
const bp = p.locator('[data-bp-row]');
ok('the backpack in a fight: hands, the helmet and the pack\'s knife have icons', (await p.locator('[data-bp-row="main"] ' + ICON).count()) === 1 && (await p.locator('[data-bp-row^="worn-"] ' + ICON).count()) >= 1 && (await bp.filter({ hasText: /Combat knife/ }).first().locator(ICON).count()) === 1);
ok('…and the magazines row has none', (await p.locator('[data-bp-row="mags"] ' + ICON).count()) === 0);
await snap('backpack-1440');
await p.setViewportSize({ width: 1280, height: 720 }); await settle(p, 400); await snap('backpack-1280');
await p.setViewportSize({ width: 1440, height: 900 }); await settle(p, 300);
await p.keyboard.press('Escape'); await settle(p, 300);
// the reload card: spend a round on the nearest foe, then reload
g = await G();
const me = mine(g);
// spend a round on something with HP (no target in sight needed): cover, as ground.mjs does
let e1 = 'no cover in range';
{ // any cover in reach will do (the maps were redrawn at 26 x 26 in rules 1.16: no tile is named here)
  const [ux, uy] = (await G()).combat.units.find((u) => u.id === me.id).pos.split(',').map(Number), near = [];
  for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) if (dx || dy) near.push([dx * dx + dy * dy, (ux + dx) + ',' + (uy + dy)]);
  const a0 = mine(await G()).ammo;
  for (const [, k] of near.sort((a, b) => a[0] - b[0])) { const r = await act({ type: 'combat/shoot-cover', unitId: me.id, tile: k }); if (mine(await G()).ammo < a0) { e1 = null; break; } if (r) e1 = r; } }
await settle(p, 1500);
const e2 = await act({ type: 'combat/reload', unitId: me.id });
if (e1 || e2) console.log('     shot:', e1, '· reload:', e2, '· ammo', mine(await G()).ammo);
const card = await p.locator('[data-fx="reload"] [data-reload-icon]').first().waitFor({ timeout: 30000 }).then(() => true).catch(() => false);
ok('the reload card shows the pistol\'s icon in its title', card && (await p.locator('[data-fx="reload"] [data-reload-icon="service_pistol"]').count()) >= 1);
await settle(p, 250); await snap('reload-1440');
await settle(p, 1600);
// a pile: drop the buckler on the tile, then hover it and open Pick up
await act({ type: 'combat/drop', unitId: me.id, slot: 'off' });
await settle(p, 500);
g = await G();
const at = mine(g).pos, [x, y] = at.split(',').map(Number), R = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1);
const tok = p.locator('.phc-grid button.phc-tok[aria-label^="' + R + ' "], .phc-grid button.phc-tok[aria-label^="' + R + ':"]').first();
await tok.hover(); await settle(p, 300);
const tip = tok.locator('[data-pile-tip]');
ok('a pile\'s hover lists the buckler with its icon', /Buckler/.test((await tip.textContent().catch(() => '')) || '') && (await tip.locator(ICON).count()) === 1);
await snap('pile-hover-1440');
await p.mouse.move(1430, 890);
await pickAction(p, /^Pick up/); await settle(p, 300);
ok('the pick-up checklist: the buckler\'s row has its icon', (await p.locator('label[data-pile-entry]').filter({ hasText: /Buckler/ }).locator(ICON).count()) === 1);
await snap('pickup-1440');
await p.setViewportSize({ width: 1280, height: 720 }); await settle(p, 400); await snap('pickup-1280');

const errs = p.errors || [];
ok('no page errors', !errs.length);
if (errs.length) console.log(errs);
await browser.close();
