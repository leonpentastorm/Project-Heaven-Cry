// The Proving Ground: start it from the title (gearing up on the map, tools open, wave 1 standing idle), take the magic
// kit and change gear in the tools, start the fight by clicking a drill unit on the mini map, clear wave 1 with the
// tools, gear up between waves, cast a Sigil, lose on purpose and Retry, then leave back to the room (not the title),
// and never call a Narrator (no provider host is contacted, the Narrator is never busy).
// Screenshots land in e2e/shots/sandbox-*.png.
import { chromium, player, click, pickAction, BASE, OUT } from './lib.mjs';
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
// PROVING GROUND asks Solo or With friends (multiplayer); Solo is the Proving Ground as it always was.
if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
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
// A focus counts only in a hand (spec: Hands 2, item 630): the Recruit's rifle filled both hands, so the kit put the
// Evoker in the pack. With the one-handed revolver in hand, the pack's button takes it into the off hand.
await drawer.locator('section[aria-label="Pack"]').getByRole('button', { name: /^Equip · off hand: Evoker/ }).first().click();
await p.waitForTimeout(200);
g = await G();
ok('the Evoker goes into the off hand from the pack: ' + g.characters[me.id].offHand?.id + ' (' + ((await drawer.locator('section[aria-label="Magic kit"]').textContent()) || '').match(/Now: [^·]+/)?.[0] + ')',
  g.characters[me.id].offHand?.id === 'evoker' && /✓ Evoker \(off hand\)/.test((await drawer.locator('section[aria-label="Magic kit"]').textContent()) || ''));
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
// A focus counts only in a hand (spec: Hands 2, items 630 and 633): stow the Evoker (the tools), and the Sigil buttons
// grey with the reason; the backpack (rules 1.9, Gear in a fight) draws it back into the off hand for 1 AP.
await act({ type: 'sandbox/unequip', charId: me.id, slot: 'off' });
await p.waitForTimeout(300); await dismissCut();
if (await drawer.count()) { await drawer.getByRole('button', { name: 'Close the tools' }).click().catch(() => {}); await p.waitForTimeout(200); }
await pickAction(p, /^Draw a glyph/).catch(() => {});
const drawTxt = ((await p.locator('[role="tabpanel"] button', { hasText: 'Draw a glyph' }).first().getAttribute('title').catch(() => '')) || '') + ' ' + ((await p.locator('[role="tabpanel"] button', { hasText: 'Draw a glyph' }).first().textContent().catch(() => '')) || '');
ok('the Evoker stowed: Draw a glyph says "Needs an Evoker in hand."', /Needs an Evoker in hand\./.test(drawTxt));
const ap0 = (await G()).combat.units.find((u) => u.charId === me.id).ap;
await p.locator('[data-backpack]:visible').first().click();
const bpPanel = p.locator('[data-bp-panel]');
await bpPanel.waitFor({ timeout: 3000 }).then(() => ok('the backpack button opens the inventory panel over the fight', true), () => ok('the backpack button opens the inventory panel over the fight', false));
const evoRow = bpPanel.locator('[data-bp-row]', { hasText: 'counts only in a hand' }).filter({ hasText: /FOCUS\s*Evoker/ }).first();
const evoTxt = (await evoRow.textContent().catch(() => '')) || '';
ok('the Evoker in the pack: "' + evoTxt.replace(/\s+/g, ' ').trim() + '"', /counts only in a hand/.test(evoTxt) && /Draw · 1 AP · off hand/.test(evoTxt));
const heavyTxt = (await bpPanel.textContent().catch(() => '')) || '';
ok('the panel names the hands, armour, backpack and ammo, and the actions with their costs', /HANDS/.test(heavyTxt) && /BACKPACK/.test(heavyTxt) && /AMMO AND THROWABLES/.test(heavyTxt) && /Drop · 0 AP/.test(heavyTxt));
await p.waitForTimeout(300); await snap('05b-backpack');
await evoRow.locator('button', { hasText: /^Draw · 1 AP/ }).click(); await p.waitForTimeout(400);
g = await G();
const u0 = g.combat.units.find((u) => u.charId === me.id);
ok('Draw the Evoker from the backpack (1 AP): back in the off hand (' + g.characters[me.id].offHand?.id + ', AP ' + ap0 + ' → ' + u0.ap + ', ' + g.combat.log.at(-1) + ')', g.characters[me.id].offHand?.id === 'evoker' && u0.mg?.evoker && u0.ap === ap0 - 1);
const offTxt = ((await bpPanel.locator('[data-bp-row="off"]').textContent().catch(() => '')) || '').replace(/\s+/g, ' ');
ok('the panel shows it in the off hand now: "' + offTxt.trim() + '"', /Evoker/.test(offTxt) && /Put away · 1 AP/.test(offTxt));
await snap('05c-backpack-drawn');
await p.keyboard.press('Escape'); await p.waitForTimeout(250);
ok('Escape closes the backpack', (await bpPanel.count()) === 0);
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
// Refilled at the start: full HP unless a drill unit (wave 2 has a Sigil novice) already acted before this check.
const hitSince = g.combat.log.some((l) => /Recruit/.test(l) && /damage|bleeds|burns/.test(l) && !/Recruit (attacks|shoots|strikes|evokes)/.test(l));
if (u2.hp !== u2.maxHp) console.log('  after the retry:', g.combat.log.slice(-8).join(' | ').slice(0, 600));
ok('Retry: wave ' + g.sandbox.wave + ' again, attempt ' + g.sandbox.attempt + ', HP ' + u2.hp + '/' + u2.maxHp + (hitSince ? ' (hit since)' : ''), g.sandbox.wave === 2 && (u2.hp === u2.maxHp || hitSince) && !u2.downed);
await p.waitForTimeout(700); await snap('08-retry');

// 7. Leave: opened from the title, the Proving Ground's room closes with it, back to the title (opened from a room,
// leaving goes back to that room: e2e/sandbox-mp.mjs and the engine tests cover it).
await p.waitForTimeout(2200); await dismissCut();
await openTools();
const lastG = await G();
await drawer.getByRole('button', { name: 'Leave', exact: true }).click();
await p.waitForFunction(() => window.__phc.getState().screen === 'home' && !window.__phc.getState().game, null, { timeout: 6000 }).catch(() => {});
await p.waitForTimeout(500);
ok('leaving (from the title) lands on the title screen (' + (await screen()) + '), the room closed', (await screen()) === 'home' && !(await G()));
await snap('09-left-to-title');

// 8. No Narrator anywhere
clearInterval(watchBusy);
ok('no request went to an AI provider (' + calls.length + ')' + (calls.length ? ': ' + calls.join(' ') : ''), calls.length === 0);
ok('the Narrator was never busy, never in error', !busySeen && !lastG.narrator.busy && !lastG.narrator.error);
console.log('  page errors:', JSON.stringify(p.errors));
if (p.errors.length) process.exitCode = 1;
await browser.close();
