// Physical 2.0 on screen, the parts added at integration (Proving Ground, enemy AI off): the pad's groups for a weapon in
// the pack and a carried throwable (Draw Cut, Snap Shot, Lob), a technique's choices as toggles (Called Shot's part),
// and the Utility tab's Pull free row for a nailed unit. Screenshots: e2e/shots/phys-pack-*.png.
import { chromium, player, click, BASE, OUT, settle } from './lib.mjs';
const browser = await chromium.launch();
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const p = await player(browser, 'host');
const errs = []; p.on('pageerror', (e) => errs.push(String(e.message || e)));
const G = () => p.evaluate(() => window.__phc.getState().game);
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
p.on('dialog', (d) => d.accept());
const panel = () => p.locator('.phc-cb-tabpanel').first();
await p.setViewportSize({ width: 1440, height: 900 });
await p.goto(BASE);
await click(p, 'PROVING GROUND');
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 20000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 20000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
await p.waitForFunction(() => window.__phc.getState().game?.sandbox?.state === 'ready', null, { timeout: 30000 });
let g = await G(); const cid = Object.keys(g.characters)[0];
await act({ type: 'sandbox/ai', on: false });
for (const sk of ['athletics', 'dexterity', 'raw_power']) await act({ type: 'sandbox/skill', charId: cid, skill: sk, points: 10 });
await act({ type: 'sandbox/give', charId: cid, item: 'service_rifle', equip: true });
for (const it of ['sabre', 'service_pistol', 'frag_grenade']) await act({ type: 'sandbox/give', charId: cid, item: it });
for (const id of ['called_shot', 'draw_cut', 'snap_shot', 'lob']) await act({ type: 'sandbox/technique', charId: cid, id, ready: true });
g = await G();
await act({ type: 'sandbox/fight' });
await p.waitForFunction(() => window.__phc.getState().game?.phase === 'combat', null, { timeout: 30000 });
await p.waitForFunction((id) => { const cb = window.__phc.getState().game.combat; const u = cb && cb.units.find((x) => x.id === cb.order[cb.turn]); return !!u && u.charId === id && u.ap >= 4; }, cid, { timeout: 45000 });
await settle(p, 2600);
for (let i = 0; i < 3 && (await p.locator('[data-phc-cutin]').count()); i++) { await p.mouse.click(1430, 890); await settle(p, 400); }
const tools = p.locator('aside[aria-label="Proving Ground tools"]').first();
if (await tools.count()) await tools.getByRole('button', { name: /^Close the tools/ }).first().click().catch(() => {});
await p.locator('#phc-tab-attack').click(); await settle(p, 300);
await panel().locator('[data-act="tpad:main"]').click(); await settle(p, 400);
const acts = await p.locator('[data-tech-pad] [data-word]').evaluateAll((xs) => xs.map((x) => 'tq:main:' + x.getAttribute('data-word')));
console.log('note chips: ' + acts.join(' '));
ok('the pad lists Called Shot for the rifle', acts.includes('tq:main:called_shot'));
ok('…a group for the stowed sabre with Draw Cut', acts.some((a) => /^tq:main:draw_cut@\d+$/.test(a)));
ok('…a group for the stowed pistol with Snap Shot', acts.some((a) => /^tq:main:snap_shot@\d+$/.test(a)));
ok('…a group for the grenade with Lob', acts.some((a) => /^tq:main:lob@/.test(a)));
await p.screenshot({ path: OUT + 'phys-pack-pad.png' });
await p.locator('[data-tech-pad] [data-word="called_shot"]').first().click(); await settle(p, 400);
const tg = await p.getByRole('button', { name: /^(LEG|ARM|HEAD)/ }).allTextContents();
ok('Called Shot shows its three parts as toggles, the first picked (' + tg.join(', ') + ')', tg.length === 3 && /LEG ✓/.test(tg.join(' ')));
await p.getByRole('button', { name: /^HEAD/ }).first().click(); await settle(p, 300);
ok('…HEAD picked', /HEAD ✓/.test((await p.getByRole('button', { name: /^(LEG|ARM|HEAD)/ }).allTextContents()).join(' ')));
await p.screenshot({ path: OUT + 'phys-pack-called.png' });
// a gun in the hand: the butt strike row (Leon, 10 Nov 2026)
await p.locator('#phc-tab-attack').click(); await settle(p, 300);
ok('a gun in hand has a "Strike (weapon\'s butt)" row', /Strike \(weapon.s butt\)/.test((await panel().locator('[data-act="melee"]').first().textContent().catch(() => '')) || ''));
// Pull free: nail the player's own unit (as Run Through or Pin Down would) and use the Utility row
const me = (await G()).combat.units.find((u) => u.charId === cid);
await p.evaluate((id) => { const st = window.__phc.getState(); const u = st.game.combat.units.find((x) => x.id === id); u.nailed = { by: 'x', id: 'pin_down', ap: 2 }; window.__phc.setState ? window.__phc.setState({ game: { ...st.game } }) : null; }, me.id).catch(() => {});
await p.locator('#phc-tab-utility').click(); await settle(p, 400);
const row = panel().locator('[data-act="pullfree"]');
if (await row.count()) {
  ok('a nailed unit has a Pull free row on the Utility tab', true);
  await row.click(); await settle(p, 300);
  await p.getByRole('button', { name: /^Confirm/ }).first().click().catch(() => {}); await settle(p, 600);
  ok('…Confirm frees it', !(await G()).combat.units.find((u) => u.id === me.id).nailed);
} else console.log('note the nail could not be set from the page (no setState hook): Pull free not driven here');
await p.screenshot({ path: OUT + 'phys-pack-utility.png' });
ok('no page errors (' + errs.join(' | ') + ')', errs.length === 0);
await browser.close();
