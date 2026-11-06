// The Proving Ground: start it from the title, clear wave 1 with the tools, wave 2 spawns, lose on purpose and Retry,
// give a weapon and change class from the tools drawer, and never call a Narrator (no provider host is contacted, the
// Narrator is never busy). Screenshots land in e2e/shots/sandbox-*.png.
import { chromium, player, click, BASE, OUT } from './lib.mjs';
const browser = await chromium.launch();
const p = await player(browser, 'host');
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const snap = (n) => p.screenshot({ path: OUT + 'sandbox-' + n + '.png' });
const G = () => p.evaluate(() => window.__phc.getState().game);
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };
// No Narrator, ever: watch every request for an AI provider's host, and the Narrator's busy flag.
const PROVIDERS = /api\.anthropic\.com|api\.openai\.com|generativelanguage\.googleapis\.com|openrouter\.ai|localhost:11434/;
const calls = [];
p.on('request', (r) => { if (PROVIDERS.test(r.url())) calls.push(r.url()); });
let busySeen = false;
const watchBusy = setInterval(() => { p.evaluate(() => !!window.__phc?.getState().game?.narrator?.busy).then((b) => { if (b) busySeen = true; }, () => {}); }, 250);
const dismissCut = async () => { if (await p.locator('[data-phc-cutin]').count()) { await p.mouse.click(1430, 990); await p.waitForTimeout(380); } };

// 1. From the title
await p.goto(BASE);
await click(p, 'PROVING GROUND');
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 8000 }).catch(() => {}), p.waitForFunction(() => window.__phc.getState().game?.phase === 'combat', null, { timeout: 8000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, 'To the Proving Ground ›'); }
await p.mouse.move(1430, 990);
await p.waitForFunction(() => window.__phc.getState().game?.phase === 'combat', null, { timeout: 15000 });
await p.waitForSelector('text=/WAVE\\s*1/', { timeout: 5000 }).then(() => ok('the WAVE 1 banner', true), () => ok('the WAVE 1 banner', false));
await p.waitForTimeout(300); await snap('01-wave1');
let g = await G();
ok('wave 1 is on: ' + g.combat.units.filter((u) => u.side === 'foe').length + ' hostiles, ' + g.combat.name, g.sandbox?.wave === 1 && g.sandbox.state === 'fighting' && g.combat.units.some((u) => u.side === 'foe'));
const me = Object.values(g.characters)[0];
await p.waitForTimeout(2600); await dismissCut();

// 2. Clear wave 1 quickly with the tools: enemy AI off, clear the field, one drill drone next to us (Field tab), shoot it
await p.getByRole('button', { name: 'Open the Proving Ground tools' }).click();
const drawer = p.locator('aside[aria-label="Proving Ground tools"]');
await drawer.waitFor();
await drawer.getByRole('tab', { name: 'Field' }).click();
await snap('02-tools-field');
if (/ON/.test(await drawer.getByRole('button', { name: /^Enemy AI/ }).textContent())) await drawer.getByRole('button', { name: /^Enemy AI/ }).click();
if (/ON/.test(await drawer.getByRole('button', { name: /^Auto next wave/ }).textContent())) await drawer.getByRole('button', { name: /^Auto next wave/ }).click();
await drawer.getByRole('button', { name: /^Clear all enemies/ }).click();
await p.waitForTimeout(200);
g = await G();
const mine = g.combat.units.find((u) => u.charId === me.id), [ux, uy] = mine.pos.split(',').map(Number);
await drawer.getByLabel('Enemy tier').selectOption('minion');
await drawer.getByLabel('Tile', { exact: true }).fill(ref((ux + 2) + ',' + uy));
await drawer.getByRole('button', { name: 'Spawn', exact: true }).click();
await p.waitForTimeout(300);
g = await G();
ok('the field is cleared and one drone stands at ' + ref((ux + 2) + ',' + uy), g.combat.units.filter((u) => u.side === 'foe' && !u.dead).length === 1);
for (let i = 0; i < 30; i++) {
  g = await G(); if (g.sandbox.state !== 'fighting') break;
  const cur = g.combat.units.find((u) => u.id === g.combat.order[g.combat.turn]), t = g.combat.units.find((u) => u.side === 'foe' && !u.dead);
  if (!cur || cur.side !== 'pc') { await p.waitForTimeout(200); continue; }
  if (t && cur.ap >= 2 && cur.ammo > 0 && !cur.jammed) await act({ type: 'combat/attack', unitId: cur.id, targetId: t.id, mode: 'shot' });
  else if (cur.jammed && cur.ap >= 2) await act({ type: 'combat/clear', unitId: cur.id });
  else await act({ type: 'combat/end-turn', unitId: cur.id });
  await p.waitForTimeout(150);
}
await p.waitForFunction(() => window.__phc.getState().game.sandbox?.state === 'cleared', null, { timeout: 5000 }).then(() => ok('wave 1 cleared', true), () => ok('wave 1 cleared', false));
await drawer.getByRole('button', { name: 'Close the tools' }).click();
await p.waitForSelector('div[role="dialog"][aria-label="Wave cleared"]', { timeout: 6000 });
await p.waitForTimeout(400); await snap('03-wave-cleared');
ok('the Wave cleared card shows', true);
await p.locator('div[aria-label="Wave cleared"] button', { hasText: /^Next wave/ }).click();
await p.waitForFunction(() => { const g = window.__phc.getState().game; return g.sandbox?.wave === 2 && g.sandbox.state === 'fighting'; }, null, { timeout: 6000 });
g = await G();
ok('wave 2 spawns: ' + g.combat.units.filter((u) => u.side === 'foe' && !u.dead).map((u) => u.name).join(', '), g.combat.units.some((u) => u.side === 'foe' && !u.dead));
await p.waitForTimeout(500); await snap('04-wave2');

// 3. Give a weapon and change class (tools drawer)
await p.waitForTimeout(2200); await dismissCut();
await p.getByRole('button', { name: 'Open the Proving Ground tools' }).click();
await drawer.waitFor();
await drawer.getByRole('tab', { name: 'Gear' }).click();
await drawer.getByPlaceholder('Search weapons and items…').fill('drifter');
await p.waitForTimeout(200);
await drawer.getByRole('button', { name: 'Give + equip' }).first().click();
await p.waitForTimeout(300);
g = await G();
ok('the revolver is given and equipped: ' + g.characters[me.id].weapon, g.characters[me.id].weapon === 'drifter_revolver' && g.combat.units.find((u) => u.charId === me.id).weapon === 'drifter_revolver');
await snap('05-tools-gear');
await drawer.getByRole('tab', { name: 'Squad' }).click();
const sel = drawer.getByLabel('Class', { exact: true });
const opts = await sel.locator('option').evaluateAll((os) => os.map((o) => o.value).filter(Boolean));
await sel.selectOption(opts.find((v) => !v.startsWith('adv:')) || opts[0]);
await p.waitForTimeout(300);
g = await G();
ok('the class changes to ' + g.characters[me.id].classId, !!g.characters[me.id].classId);
await snap('06-tools-squad');
ok('the Fan the Hammer action is on the panel', await p.getByRole('button', { name: /^Fan the Hammer/ }).count() > 0);
await drawer.getByRole('button', { name: 'Close the tools' }).click();

// 4. Lose on purpose: armour off, level 1, three champions next to us, end turns until the squad is down
await act({ type: 'sandbox/level', charId: me.id, level: 1 });
await act({ type: 'sandbox/armour', charId: me.id, armourClass: 0 });
await act({ type: 'sandbox/ai', on: true });
g = await G();
const [mx, my] = g.combat.units.find((u) => u.charId === me.id).pos.split(',').map(Number);
for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, -1]]) if (mx + dx >= 0 && my + dy >= 0) await act({ type: 'sandbox/spawn', tier: 'boss', weapon: 'adamantile_greatsword', at: ref((mx + dx) + ',' + (my + dy)) });
for (let i = 0; i < 40; i++) {
  g = await G();
  if (g.sandbox.state === 'fallen') break;
  const cur = g.combat.units.find((u) => u.id === g.combat.order[g.combat.turn]);
  if (cur && cur.side === 'pc' && !cur.downed) await act({ type: 'combat/end-turn', unitId: cur.id });
  await p.waitForTimeout(300);
}
g = await G();
ok('the squad is down (state ' + g.sandbox.state + ')', g.sandbox.state === 'fallen');
await p.waitForSelector('div[role="dialog"][aria-label="The squad fell"]', { timeout: 8000 });
await p.waitForTimeout(500); await snap('07-squad-down');
const attempt = g.sandbox.attempt;
await p.locator('div[aria-label="The squad fell"] button', { hasText: /Retry wave/ }).click();
await p.waitForFunction((a) => { const g = window.__phc.getState().game; return g.sandbox?.state === 'fighting' && g.sandbox.attempt > a; }, attempt, { timeout: 6000 });
g = await G();
const u2 = g.combat.units.find((u) => u.charId === me.id);
ok('Retry: wave ' + g.sandbox.wave + ' again, attempt ' + g.sandbox.attempt + ', HP ' + u2.hp + '/' + u2.maxHp, g.sandbox.wave === 2 && u2.hp === u2.maxHp && !u2.downed);
await p.waitForTimeout(700); await snap('08-retry');

// 5. No Narrator anywhere
clearInterval(watchBusy);
g = await G();
ok('no request went to an AI provider (' + calls.length + ')' + (calls.length ? ': ' + calls.join(' ') : ''), calls.length === 0);
ok('the Narrator was never busy, never in error', !busySeen && !g.narrator.busy && !g.narrator.error);
console.log('  page errors:', JSON.stringify(p.errors));
if (p.errors.length) process.exitCode = 1;
await browser.close();
