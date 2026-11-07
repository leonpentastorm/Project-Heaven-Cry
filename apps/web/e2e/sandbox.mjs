// The Proving Ground: start it from the title (gearing up on the map, tools open, wave 1 standing idle), take the magic
// kit and change gear in the tools, start the fight by clicking a drill unit on the mini map, clear wave 1 with the
// tools, gear up between waves, cast a Sigil, lose on purpose and Retry, then leave back to the room (not the title),
// and never call a Narrator (no provider host is contacted, the Narrator is never busy).
// Screenshots land in e2e/shots/sandbox-*.png.
import { chromium, player, click, BASE, OUT } from './lib.mjs';
const browser = await chromium.launch();
const p = await player(browser, 'host');
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const snap = (n) => p.screenshot({ path: OUT + 'sandbox-' + n + '.png' });
const G = () => p.evaluate(() => window.__phc.getState().game);
const screen = () => p.evaluate(() => window.__phc.getState().screen);
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };
p.on('dialog', (d) => d.accept()); // Leave asks first
// No Narrator, ever: watch every request for an AI provider's host, and the Narrator's busy flag.
const PROVIDERS = /api\.anthropic\.com|api\.openai\.com|generativelanguage\.googleapis\.com|openrouter\.ai|localhost:11434/;
const calls = [];
p.on('request', (r) => { if (PROVIDERS.test(r.url())) calls.push(r.url()); });
let busySeen = false;
const watchBusy = setInterval(() => { p.evaluate(() => !!window.__phc?.getState().game?.narrator?.busy).then((b) => { if (b) busySeen = true; }, () => {}); }, 250);
const dismissCut = async () => { if (await p.locator('[data-phc-cutin]').count()) { await p.mouse.click(1430, 990); await p.waitForTimeout(380); } };
const drawer = p.locator('aside[aria-label="Proving Ground tools"]');
const openTools = async () => { if (!(await drawer.count())) await p.getByRole('button', { name: 'Open the Proving Ground tools' }).click(); await drawer.waitFor(); };
/** Shoot (or strike) the one drill unit on the field until the wave is cleared. */
const clearField = async () => {
  for (let i = 0; i < 40; i++) {
    const g = await G(); if (g.sandbox.state !== 'fighting') break;
    const cur = g.combat.units.find((u) => u.id === g.combat.order[g.combat.turn]), t = g.combat.units.find((u) => u.side === 'foe' && !u.dead);
    if (!cur || cur.side !== 'pc') { await p.waitForTimeout(200); continue; }
    if (t && cur.ap >= 2 && (cur.ammo > 0 || cur.weapon === 'fists') && !cur.jammed) await act({ type: 'combat/attack', unitId: cur.id, targetId: t.id, mode: cur.weapon === 'fists' ? 'melee' : 'shot' });
    else if (cur.jammed && cur.ap >= 2) await act({ type: 'combat/clear', unitId: cur.id });
    else await act({ type: 'combat/end-turn', unitId: cur.id });
    await p.waitForTimeout(150);
  }
};

// 1. From the title: gearing up, not fighting
await p.goto(BASE);
await click(p, 'PROVING GROUND');
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 8000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 8000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, 'To the Proving Ground ›'); }
await p.mouse.move(1430, 990);
await p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 15000 });
await drawer.waitFor({ timeout: 6000 }).catch(() => {});
let g = await G();
ok('gearing up: phase ' + g.phase + ', no fight, on the ' + (await screen()) + ' screen', g.phase === 'story' && !g.combat && (await screen()) === 'main' && g.sandbox.state === 'ready');
ok('wave 1 stands idle on the map: ' + (g.story.npcs || []).map((n) => n.name + ' at ' + ref(n.pos)).join(', '), (g.story.npcs || []).length > 0 && (g.story.npcs || []).every((n) => n.side === 'hostile'));
ok('the tools are open, with Start the fight and the hint', (await drawer.count()) > 0 && (await drawer.getByRole('button', { name: /^⚔ Start the fight/ }).count()) > 0 && (await drawer.getByText('Gear up here, then click the map to start a fight.').count()) > 0);
await p.waitForTimeout(300); await snap('01-gear-up');
const me = Object.values(g.characters)[0];

// 2. Gear: the magic kit, give and equip a revolver, unequip it, equip it back from the pack
await drawer.getByRole('tab', { name: 'Gear' }).click();
await drawer.getByRole('button', { name: '✦ Magic kit' }).first().click();
await p.waitForTimeout(250);
g = await G(); let c = g.characters[me.id];
const carries = (c, id) => c.weapon === id || c.offHand?.id === id || (c.pack || []).some((x) => (x.item || x.id) === id);
ok('the magic kit: Evoker ' + carries(c, 'evoker') + ', Emanator ' + carries(c, 'emanator') + ', words ' + (c.sigils || []).join(' ') + ', designs ' + (c.outbursts || []).map((d) => d.name).join(', '),
  carries(c, 'evoker') && carries(c, 'emanator') && (c.sigils || []).includes('fire') && (c.outbursts || []).length >= 2);
await drawer.getByPlaceholder('Search weapons and items…').fill('drifter');
await p.waitForTimeout(200);
await drawer.getByRole('button', { name: 'Give + equip' }).first().click();
await p.waitForTimeout(250);
g = await G();
ok('the revolver is given and equipped while gearing up: ' + g.characters[me.id].weapon, g.characters[me.id].weapon === 'drifter_revolver');
await drawer.locator('section[aria-label="Equipped"]').getByRole('button', { name: /^Unequip Drifter/ }).click();
await p.waitForTimeout(200);
g = await G();
ok('Unequip empties the main hand: ' + g.characters[me.id].weapon, g.characters[me.id].weapon === 'fists');
await drawer.locator('section[aria-label="Pack"]').getByRole('button', { name: /^Equip · main hand: Drifter/ }).first().click();
await p.waitForTimeout(200);
g = await G();
ok('Equip from the pack puts it back in hand, loaded: ' + g.characters[me.id].weapon + ' ' + g.characters[me.id].loaded, g.characters[me.id].weapon === 'drifter_revolver' && g.characters[me.id].loaded > 0);
await snap('02-gear');
await drawer.getByRole('tab', { name: 'Squad' }).click();
const sel = drawer.getByLabel('Class', { exact: true });
const opts = await sel.locator('option').evaluateAll((os) => os.map((o) => o.value).filter(Boolean));
await sel.selectOption(opts.find((v) => !v.startsWith('adv:')) || opts[0]);
await p.waitForTimeout(250);
g = await G();
ok('the class changes to ' + g.characters[me.id].classId, !!g.characters[me.id].classId);
await drawer.getByRole('tab', { name: 'Field' }).click();
if (/ON/.test(await drawer.getByRole('button', { name: /^Enemy AI/ }).textContent())) await drawer.getByRole('button', { name: /^Enemy AI/ }).click();
if (/ON/.test(await drawer.getByRole('button', { name: /^Endless waves/ }).textContent())) await drawer.getByRole('button', { name: /^Endless waves/ }).click();
await p.waitForTimeout(200);

// 3. Start the fight by clicking a drill unit on the mini map
g = await G();
const target = g.story.npcs[0];
await p.locator('.phc-mini button.phc-tok[aria-label^="' + ref(target.pos) + ': "]').first().click();
await p.waitForFunction(() => window.__phc.getState().game?.phase === 'combat', null, { timeout: 6000 }).then(() => ok('a click on a drill unit starts the fight', true), () => ok('a click on a drill unit starts the fight', false));
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 6000 }).catch(() => {});
await p.waitForSelector('div[aria-live="polite"] >> text=/WAVE\\s*1/', { timeout: 5000 }).then(() => ok('the WAVE 1 banner', true), () => ok('the WAVE 1 banner', false));
g = await G();
ok('wave 1 is on: ' + g.combat.units.filter((u) => u.side === 'foe').length + ' drill units, ' + g.combat.name, g.sandbox.state === 'fighting' && g.combat.name === 'Proving Ground · Wave 1');
ok('the gear came into the fight: ' + g.combat.units.find((u) => u.charId === me.id).weapon, g.combat.units.find((u) => u.charId === me.id).weapon === 'drifter_revolver');
await p.waitForTimeout(300); await snap('03-wave1');
await p.waitForTimeout(2300); await dismissCut();

// 4. Clear wave 1 with the tools: clear the field, one drill drone next to us, shoot it
await openTools();
await drawer.getByRole('tab', { name: 'Field' }).click();
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
await drawer.getByRole('button', { name: 'Close the tools' }).click();
await clearField();
await p.waitForFunction(() => window.__phc.getState().game.sandbox?.state === 'cleared', null, { timeout: 5000 }).then(() => ok('wave 1 cleared', true), () => ok('wave 1 cleared', false));
g = await G();
ok('after the fight the Proving Ground is gearing up again (phase ' + g.phase + ')', g.phase === 'story' && g.combat?.over === 'win');
await p.waitForSelector('div[role="dialog"][aria-label="Wave cleared"]', { timeout: 6000 }).then(() => ok('the Wave cleared card shows', true), () => ok('the Wave cleared card shows', false));
await p.waitForTimeout(400); await snap('04-wave-cleared');
await p.locator('div[aria-label="Wave cleared"] button', { hasText: 'Gear up first' }).click();
await p.waitForFunction(() => window.__phc.getState().screen === 'main', null, { timeout: 4000 }).catch(() => {});
await drawer.waitFor({ timeout: 4000 }).catch(() => {});
ok('Gear up first: the map with the tools open (' + (await screen()) + ')', (await screen()) === 'main' && (await drawer.count()) > 0 && (await drawer.getByText(/Wave 1 cleared/).count()) > 0);
await p.waitForTimeout(300); await snap('05-gear-up-again');

// 5. Wave 2 from the Start button; cast a Sigil in it
await drawer.getByRole('button', { name: /^⚔ Start the fight/ }).click();
await p.waitForFunction(() => { const g = window.__phc.getState().game; return g.phase === 'combat' && g.sandbox?.wave === 2 && g.sandbox.state === 'fighting'; }, null, { timeout: 6000 });
g = await G();
ok('Start the fight brings wave 2: ' + g.combat.units.filter((u) => u.side === 'foe' && !u.dead).map((u) => u.name).join(', '), g.combat.units.some((u) => u.side === 'foe' && !u.dead));
await p.waitForTimeout(2600); await dismissCut();
for (let i = 0; i < 12; i++) { g = await G(); const cur = g.combat.units.find((u) => u.id === g.combat.order[g.combat.turn]); if (cur?.charId === me.id) break; if (cur?.side === 'pc') await act({ type: 'combat/end-turn', unitId: cur.id }); await p.waitForTimeout(200); }
g = await G();
const u1 = g.combat.units.find((u) => u.charId === me.id);
const drew = await act({ type: 'combat/draw', unitId: u1.id, word: 'fire', tile: ref(u1.pos) });
await p.waitForTimeout(300);
g = await G();
ok('a Sigil is drawn in the fight (FIRE at ' + ref(u1.pos) + ')' + (drew ? ': ' + drew : ''), !drew && (g.combat.glyphs || []).some((x) => x.word === 'fire'));
await snap('06-wave2-sigil');

// 6. Lose on purpose: armour off, level 1, champions next to us, end turns until the squad is down
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
ok('the squad is down (state ' + g.sandbox.state + '), and back to gearing up with everyone refilled', g.sandbox.state === 'fallen' && g.phase === 'story' && g.characters[me.id].hp > 1);
await p.waitForSelector('div[role="dialog"][aria-label="The squad fell"]', { timeout: 8000 });
await p.waitForTimeout(500); await snap('07-squad-down');
const attempt = g.sandbox.attempt;
await p.locator('div[aria-label="The squad fell"] button', { hasText: /Retry wave/ }).click();
await p.waitForFunction((a) => { const g = window.__phc.getState().game; return g.sandbox?.state === 'fighting' && g.sandbox.attempt > a; }, attempt, { timeout: 6000 });
g = await G();
const u2 = g.combat.units.find((u) => u.charId === me.id);
ok('Retry: wave ' + g.sandbox.wave + ' again, attempt ' + g.sandbox.attempt + ', HP ' + u2.hp + '/' + u2.maxHp, g.sandbox.wave === 2 && u2.hp === u2.maxHp && !u2.downed);
await p.waitForTimeout(700); await snap('08-retry');

// 7. Leave: back to the room, not the title
await p.waitForTimeout(2200); await dismissCut();
await openTools();
await drawer.getByRole('button', { name: 'Leave', exact: true }).click();
await p.waitForFunction(() => window.__phc.getState().game?.phase === 'lobby', null, { timeout: 6000 }).catch(() => {});
await p.waitForTimeout(500);
g = await G();
ok('leaving lands on the room screen (' + (await screen()) + '), the room as it was', (await screen()) === 'room' && g.phase === 'lobby' && !g.sandbox && !g.combat);
await snap('09-left-to-room');

// 8. No Narrator anywhere
clearInterval(watchBusy);
g = await G();
ok('no request went to an AI provider (' + calls.length + ')' + (calls.length ? ': ' + calls.join(' ') : ''), calls.length === 0);
ok('the Narrator was never busy, never in error', !busySeen && !g.narrator.busy && !g.narrator.error);
console.log('  page errors:', JSON.stringify(p.errors));
if (p.errors.length) process.exitCode = 1;
await browser.close();
