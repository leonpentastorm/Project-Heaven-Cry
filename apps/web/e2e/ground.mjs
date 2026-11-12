// World Play 1.1 (rules revision 1.9) in the Proving Ground, through the real buttons: a speed reload in a fight drops
// the old magazine into a pile on the tile, drawn on the grid as a stack with its count, with a legend entry and a hover
// that lists it; the tactical reload row at its own cost; a second drop, then Pick up's checklist (both ticked, one
// unticked) takes only the ticked one; the fight stops and the pile is still there on the minimap and the area map;
// Near you opens the checklist on the area map and takes it into the pack; the area map's own speed reload drops a pile;
// a minefield across the way: the move preview marks the tile it crosses and says "Path crosses: …".
// Setup the buttons don't cover (a shot to empty a round, reading state) goes through window.__phc. Screens in
// e2e/shots/ground-*.png.
import { chromium, player, click, pickAction, BASE, OUT, settle } from './lib.mjs';
const browser = await chromium.launch();
const p = await player(browser, 'host');
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const snap = (n) => p.screenshot({ path: OUT + 'ground-' + n + '.png' });
const G = () => p.evaluate(() => window.__phc.getState().game);
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };
const key = (x, y) => x + ',' + y;
p.on('dialog', (d) => d.accept());
const drawer = p.locator('aside[aria-label="Proving Ground tools"]');
const openTools = async () => { if (!(await drawer.count())) await p.getByRole('button', { name: 'Open the Proving Ground tools' }).click(); await drawer.waitFor(); };
const closeTools = async () => { if (await drawer.count()) { await drawer.getByRole('button', { name: /^Close the tools/ }).first().click(); await drawer.waitFor({ state: 'detached' }).catch(() => {}); } };
const area = p.locator('div[role="dialog"][aria-label="Area map"]');
const openArea = async () => { if (!(await area.count())) await p.getByRole('button', { name: 'Area map', exact: true }).first().click(); await area.waitFor(); await settle(p, 250); };
const closeArea = async () => { if (await area.count()) { await area.getByRole('button', { name: 'Close', exact: true }).first().click(); await area.waitFor({ state: 'hidden' }).catch(() => {}); await settle(p, 250); } };
const tile = (scope, r) => scope.locator('button.phc-tok[aria-label^="' + r + ' "], button.phc-tok[aria-label^="' + r + ':"]').first();
const dismissCut = async () => { for (let i = 0; i < 3 && (await p.locator('[data-phc-cutin]').count()); i++) { await p.mouse.click(1430, 990); await settle(p, 400); } };
const pileAt = (objs, k) => (objs || []).find((o) => o.kind === 'pile' && o.pos === k);
const mine = (g) => g.combat.units.find((u) => u.charId === meId);
const myTurn = () => p.waitForFunction((id) => { const cb = window.__phc.getState().game.combat; const u = cb && cb.units.find((x) => x.id === cb.order[cb.turn]); return !!u && u.charId === id && u.ap >= 6; }, meId, { timeout: 30000 });
const confirmBtn = () => p.locator('.phc-cb-confirm button').first();
/** Spend a round on something with HP (no hostile needed): the pillar, then the crates. */
// (a refusal is only a toast, so success is read from the magazine: Physical 2.0's damage breaks the pillar in two shots)
const nearTiles = async () => { const [ux, uy] = mine(await G()).pos.split(',').map(Number), out = []; for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) if (dx || dy) out.push([dx * dx + dy * dy, (ux + dx) + ',' + (uy + dy)]); return out.sort((a, b) => a[0] - b[0]).map((x) => x[1]); };
// any cover in reach will do (the maps were redrawn at 26 x 26 in rules 1.16: no tile is named here)
const burn = async () => { for (const k of await nearTiles()) { const a0 = mine(await G()).ammo; const refused = await act({ type: 'combat/shoot-cover', unitId: mine(await G()).id, tile: k }); if (refused) continue; await settle(p, 150); if (mine(await G()).ammo < a0) return true; } return false; };

// 1. The Proving Ground, solo, the enemies passing their turns (Enemy AI off); start the fight.
await p.setViewportSize({ width: 1440, height: 1000 });
await p.goto(BASE);
await click(p, 'PROVING GROUND');
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 20000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 20000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
await p.mouse.move(1430, 990);
await p.waitForFunction(() => window.__phc.getState().game?.sandbox?.state === 'ready', null, { timeout: 30000 });
let g = await G();
const meId = Object.values(g.characters)[0].id;
await openTools();
await drawer.getByRole('tab', { name: 'Field' }).click();
const aiBtn = drawer.getByRole('button', { name: /^Enemy AI: ON/ });
if (await aiBtn.count()) await aiBtn.click();
await drawer.getByRole('button', { name: /^⚔ Start the fight/ }).first().click();
await p.waitForFunction(() => window.__phc.getState().game?.phase === 'combat', null, { timeout: 30000 });
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 20000 }).catch(() => {});
await closeTools();
await myTurn(); await dismissCut();
g = await G();
const at = mine(g).pos, R = ref(at), gun = mine(g).weapon, loaded0 = mine(g).ammo;
console.log('me at', R, 'with', gun, loaded0, 'loaded, spares', JSON.stringify(mine(g).mags));

// 2. A shot spends a round; Reload (speed) and Reload (tactical) at their costs; the speed reload drops the magazine.
ok('a round spent on the pillar', await burn());
await pickAction(p, /^Reload \(speed\)/);
const rowSpeed = (await p.locator('[role="tabpanel"] button[data-act="reload"]').textContent()) || '';
const rowTac = (await p.locator('[role="tabpanel"] button[data-act="reload-tac"]').textContent()) || '';
ok('the two reloads: "' + rowSpeed + '" and "' + rowTac + '"', /^Reload \(speed\)2 AP · the magazine drops$/.test(rowSpeed) && /^Reload \(tactical\)3 AP · the magazine goes in your pack$/.test(rowTac));
await confirmBtn().click(); await settle(p, 700);
g = await G();
let pile = pileAt(g.combat.objects, at);
ok('the speed reload dropped the magazine into a pile at ' + R + ': ' + JSON.stringify((pile?.items || []).map((e) => e.name)), !!pile && pile.items.length === 1 && / \d+\/\d+$/.test(pile.items[0].name));
const lab1 = pile.items[0].name;
const cbGrid = p.locator('.phc-grid');
ok('the grid draws the pile as a stack with its count on ' + R, (await tile(cbGrid, R).locator('[data-pile="1"]').count()) === 1);
ok('the legend has the pile entry', (await p.locator('[data-legend="pile"]').count()) >= 1 && /Pile: things on the ground/.test(await p.locator('[data-legend="pile"]').first().textContent()));
await tile(cbGrid, R).hover(); await settle(p, 250);
const tip1 = (await tile(cbGrid, R).locator('[data-pile-tip]').textContent().catch(() => '')) || '';
ok('hovering the tile lists the pile: ' + tip1.replace(/\n/g, ' | '), tip1.includes(lab1) && /^PILE AT /.test(tip1));
await snap('01-pile-in-fight');
await pickAction(p, /^Reload \(tactical\)/); await settle(p, 200);
await snap('02-tactical-row');
ok('a second round spent', await burn());
await p.getByRole('button', { name: 'End turn', exact: true }).first().click();
await myTurn(); await dismissCut();

// 3. Another speed reload on the same tile: two entries. Pick up: the checklist, both ticked; untick one, take one.
await pickAction(p, /^Reload \(speed\)/); await confirmBtn().click(); await settle(p, 700);
g = await G(); pile = pileAt(g.combat.objects, at);
ok('two magazines in the one pile: ' + JSON.stringify(pile.items.map((e) => e.name)), pile.items.length === 2);
ok('the count on the grid reads 2', (await tile(cbGrid, R).locator('[data-pile="2"]').count()) === 1);
await pickAction(p, /^Pick up ?1 AP/); await settle(p, 250);
const list = p.locator('[data-pile-list]');
const boxes = list.locator('input[type="checkbox"]');
ok('Pick up opens the checklist with both entries ticked (' + (await boxes.count()) + ')', (await boxes.count()) === 2 && (await boxes.nth(0).isChecked()) && (await boxes.nth(1).isChecked()));
ok('the button says everything: ' + (await confirmBtn().textContent()), (await confirmBtn().textContent()) === 'Pick up everything · 1 AP');
await boxes.nth(1).click(); await settle(p, 200);
ok('unticked one: ' + (await confirmBtn().textContent()), (await confirmBtn().textContent()) === 'Pick up 1 of 2 · 1 AP' && !(await boxes.nth(1).isChecked()));
await snap('03-pickup-checklist');
const mags0 = mine(await G()).mags.length;
await confirmBtn().click(); await settle(p, 600);
g = await G(); pile = pileAt(g.combat.objects, at);
ok('took the ticked one into the spares (' + mags0 + ' → ' + mine(g).mags.length + '); one left on the ground', mine(g).mags.length === mags0 + 1 && pile && pile.items.length === 1);
const pfx = (g.combat.fx || []).filter((e) => e.k === 'pickup').at(-1);
ok('the pick-up effect names what was taken: ' + JSON.stringify(pfx?.items), Array.isArray(pfx?.items) && pfx.items.length === 1 && /\d+\/\d+/.test(pfx.items[0]));
await settle(p, 400); await snap('04-after-pickup');
await burn(); // a round out, for the area map's reload later

// 4. Stop the fight: the pile is still there, on the minimap and on the area map (drawn, in the legend, hover lists it).
await openTools();
await drawer.getByRole('button', { name: /Stop the fight/ }).first().click();
await p.waitForFunction(() => window.__phc.getState().game?.phase === 'story', null, { timeout: 30000 });
await p.waitForFunction(() => window.__phc.getState().screen === 'main', null, { timeout: 20000 }).catch(() => {});
await closeTools();
g = await G();
const sp = pileAt(g.story.objects, at);
ok('the pile came back to the area map at ' + R + ': ' + JSON.stringify((sp?.items || []).map((e) => e.name)), !!sp && sp.items.length === 1);
const mini = p.locator('.phc-mini');
ok('the minimap draws it with its count', (await tile(mini, R).locator('[data-pile="1"]').count()) === 1);
await openArea();
ok('the area map draws it, with the legend entry', (await tile(area, R).locator('[data-pile="1"]').count()) === 1 && (await area.locator('[data-legend="pile"]').count()) === 1);
await tile(area, R).hover(); await settle(p, 250);
const tip2 = (await tile(area, R).locator('[data-pile-tip]').textContent().catch(() => '')) || '';
ok('the area map hover lists it: ' + tip2.replace(/\n/g, ' | '), tip2.includes(sp.items[0].name));
await snap('05-pile-on-area-map');
await closeArea();

// 5. Near you: the pile is offered; it opens the area map's checklist; Pick up everything takes it into the pack.
const near = p.locator('button[data-near="p' + sp.id + '"]').first();
ok('Near you offers it: ' + (await near.textContent().catch(() => '')), (await near.count()) === 1 && /Pick up from the pile/.test(await near.textContent()));
await near.click(); await area.waitFor(); await settle(p, 300);
const wlist = area.locator('[data-pile-list]');
ok('the area map opens Pick up with its checklist ticked', (await wlist.locator('input[type="checkbox"]').count()) === 1 && (await wlist.locator('input[type="checkbox"]').first().isChecked()));
const wConfirm = area.getByRole('button', { name: 'Pick up everything · 1 AP', exact: true });
ok('the area map\'s button: Pick up everything · 1 AP', (await wConfirm.count()) === 1);
await snap('06-area-pickup');
const spares = (c) => ((c.pack || []).find((x) => x.weapon === gun && x.mags) || { mags: [] }).mags.length;
const s0 = spares(g.characters[meId]);
await wConfirm.click(); await settle(p, 500);
g = await G();
ok('into the pack: spares ' + s0 + ' → ' + spares(g.characters[meId]) + '; the pile is gone', spares(g.characters[meId]) === s0 + 1 && !pileAt(g.story.objects, at));

// 6. The area map's own speed reload drops a real pile (the magazine is kept).
const wReload = area.getByRole('button', { name: /^Reload \(speed\)/ }).first();
ok('the area map lists both reloads', (await wReload.count()) === 1 && (await area.getByRole('button', { name: /^Reload \(tactical\)/ }).count()) === 1);
await wReload.click(); await settle(p, 200);
await area.getByRole('button', { name: 'Confirm', exact: true }).first().click(); await settle(p, 500);
g = await G();
const sp2 = pileAt(g.story.objects, at);
ok('the area-map reload dropped its magazine here: ' + JSON.stringify((sp2?.items || []).map((e) => e.name)), !!sp2 && sp2.items.length === 1);
ok('drawn on the area map', (await tile(area, R).locator('[data-pile="1"]').count()) === 1);
await closeArea();

// 7. A minefield across the way (a full column, no way round): the move preview marks the crossed tile and says so.
await openTools();
await drawer.getByRole('tab', { name: 'World' }).click(); await settle(p, 150);
const [mx, my] = at.split(',').map(Number), col = mx + 2, H = (g.campaign?.zones || []).find((z) => z.id === g.story.zone)?.h || 12;
const sh = drawer.locator('section[aria-label="World: a hazard"]');
await sh.getByLabel('Hazard kind', { exact: true }).selectOption('minefield');
await sh.getByLabel('Tile for hazard', { exact: true }).fill(ref(key(col, 0)) + ':' + ref(key(col, H - 1)));
await sh.locator('button[data-world-place="hazard"]').click(); await settle(p, 300);
await closeTools();
await openArea();
await area.getByRole('button', { name: /^Move/ }).first().click().catch(() => {});
const dest = key(col + 1, my);
await tile(area, ref(dest)).hover(); await settle(p, 300);
const crossN = await area.locator('[data-cross]').count();
const said = (await area.locator('span[aria-live="polite"]').allTextContents()).join(' | ');
ok('the path to ' + ref(dest) + ' is marked where it crosses the mines (' + crossN + ' tile)', crossN === 1);
ok('and the hint says so: ' + said.slice(0, 160), /Path crosses: minefield at [A-Z]\d+/.test(said));
await snap('07-path-crosses');
await closeArea();

ok('no page errors: ' + p.errors.join(' | '), p.errors.length === 0);
await browser.close();
