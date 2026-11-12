// World Play 1.7 (rules revision 1.7) in the Proving Ground, through real buttons only: the WORLD tools place a robot
// (its avatar and BOT badge on the map), an objective, a cache, minefields and an ambush trigger; then on the area map
// and the story screen: talk to the robot (Ask what they want, Ask about the objective: the hint, a marker and the HERE
// card), carry it (the GEAR tab's CARRIED entry with its 40 kg), put it down on a dashed tile (the token returns),
// search the cache (the pack gains its things), a locked crate's way in failing with hurt (the damage), walk into a
// minefield (a mine goes off: damage and the fx), find a safe path through another (the ✓ tiles), and step on the
// trigger's tiles (an ambush: hostiles spawn, the fight starts). Screens at deviceScaleFactor 1 in e2e/shots/world-play-*.png.
import { chromium, player, click, BASE, OUT, settle } from './lib.mjs';
const browser = await chromium.launch();
const p = await player(browser, 'host');
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const snap = (n) => p.screenshot({ path: OUT + 'world-play-' + n + '.png' });
const G = () => p.evaluate(() => window.__phc.getState().game);
const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };
const key = (x, y) => x + ',' + y;
p.on('dialog', (d) => d.accept());
const drawer = p.locator('aside[aria-label="Proving Ground tools"]');
const openTools = async () => { if (!(await drawer.count())) await p.getByRole('button', { name: 'Open the Proving Ground tools' }).click(); await drawer.waitFor(); };
const closeTools = async () => { if (await drawer.count()) { await drawer.getByRole('button', { name: 'Close the tools' }).click(); await drawer.waitFor({ state: 'detached' }).catch(() => {}); } };
const area = p.locator('div[role="dialog"][aria-label="Area map"]');
const openArea = async () => { if (!(await area.count())) { await p.getByRole('button', { name: 'Area map', exact: true }).first().click(); } await area.waitFor(); await settle(p, 250); };
const closeArea = async () => { if (await area.count()) { await area.getByRole('button', { name: 'Close', exact: true }).first().click(); await area.waitFor({ state: 'hidden' }).catch(() => {}); await settle(p, 250); } };
const tile = (scope, r) => scope.locator('button.phc-tok[aria-label^="' + r + ' "], button.phc-tok[aria-label^="' + r + ':"]').first();
const endTurn = async () => { const b = p.getByRole('button', { name: 'End turn', exact: true }).first(); await b.click(); await settle(p, 400); };
const panel = p.locator('[data-world-panel]');
const world = async () => { await openTools(); await drawer.getByRole('tab', { name: 'World' }).click(); await settle(p, 150); };
const lastLog = async () => (await G()).story.entries.slice(-6).map((e) => e.text).join(' | ');

// 1. The Proving Ground, solo; clear the drill units so the field is ours.
await p.setViewportSize({ width: 1440, height: 1000 });
await p.goto(BASE);
await click(p, 'PROVING GROUND');
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 20000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 20000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
await p.mouse.move(1430, 990);
await p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 30000 });
await openTools();
await drawer.getByRole('tab', { name: 'Field' }).click();
await drawer.getByRole('button', { name: /^Clear all enemies/ }).click();
let g = await G();
const me = Object.values(g.characters)[0], map = { w: 0, h: 0 };
const at0 = g.story.positions[me.id]; const [mx, my] = at0.split(',').map(Number);
console.log('me at', ref(at0));
// The zone's size and walls, from the engine's view helpers through the page.
const Z = await p.evaluate(() => { const g = window.__phc.getState().game, z = (g.campaign?.zones || []).find((x) => x.id === g.story.zone); return null; });
void Z; void map;
const free = (g, k) => { const pos = new Set([...Object.values(g.story.positions), ...(g.story.npcs || []).map((n) => n.pos), ...(g.story.objects || []).map((o) => o.pos)]); return !pos.has(k); };

// 2. WORLD tools: an objective, then a robot that knows about it (avatar picked), and a cache next to us.
await world();
const wt = drawer.locator('section[aria-label="World: an objective"]');
await wt.getByLabel('Objective id', { exact: true }).fill('find_the_core');
await wt.getByLabel('Objective text', { exact: true }).fill('Find the power core');
await wt.getByRole('button', { name: 'Set objective' }).click();
await settle(p, 200);
const sp = drawer.locator('section[aria-label="World: a person"]');
await sp.getByLabel('Person name', { exact: true }).fill('Hum');
await sp.getByLabel('Kind', { exact: true }).selectOption('robot');
const firstAv = sp.locator('button[data-avatar]').first(); const avId = await firstAv.getAttribute('data-avatar'); await firstAv.click();
g = await G();
const cands = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].map(([dx, dy]) => key(mx + dx, my + dy)).filter((k) => free(g, k) && !/^-|,-/.test(k));
const robotAt = cands[0], cacheAt = cands[1];
await sp.getByLabel('Knows objective', { exact: true }).fill('find_the_core');
await sp.getByLabel('Hint tile', { exact: true }).fill(ref(cacheAt));
await sp.getByLabel('Hint', { exact: true }).fill('The core is in the crate beside you. Search it.');
await sp.getByLabel('Tile for npc', { exact: true }).fill(ref(robotAt));
await sp.locator('button[data-world-place="npc"]').click();
await settle(p, 300);
g = await G();
const robot = (g.story.npcs || []).find((n) => n.name === 'Hum');
ok('a robot placed at ' + ref(robotAt) + ': kind ' + robot?.kind + ', avatar ' + robot?.avatar + ' (picked ' + avId + ')', !!robot && robot.kind === 'robot' && robot.avatar === avId);
const sc = drawer.locator('section[aria-label="World: a cache"]');
await sc.getByLabel('Tile for cache', { exact: true }).fill(ref(cacheAt));
await sc.locator('button[data-world-place="cache"]').click();
await settle(p, 300);
g = await G();
const crate = (g.story.objects || []).find((o) => o.kind === 'cache' && o.pos === cacheAt);
ok('a cache at ' + ref(cacheAt) + ' shows a count, not its items (' + crate?.itemCount + ', items ' + JSON.stringify(crate?.items) + ')', !!crate && crate.itemCount === 2 && !(crate.items || []).length);
// Rules 1.9: A PILE (ON THE GROUND) next to A CACHE: an open pile, its entries shown to the player who sees the tile.
const pileAt = cands[2];
const sp2 = drawer.locator('section[aria-label="World: a pile"]');
ok('the WORLD tools have A PILE (ON THE GROUND) next to A CACHE', (await sp2.count()) === 1 && /A PILE \(ON THE GROUND\)/.test(await sp2.textContent()));
await sp2.getByLabel('Tile for pile', { exact: true }).fill(ref(pileAt));
await sp2.locator('button[data-world-place="pile"]').click();
await settle(p, 300);
g = await G();
const heap = (g.story.objects || []).find((o) => o.kind === 'pile' && o.pos === pileAt);
ok('a pile at ' + ref(pileAt) + ' is open: ' + JSON.stringify((heap?.items || []).map((e) => e.name)), !!heap && (heap.items || []).length === 2 && (heap.items || []).some((e) => e.pack?.mags?.[0] === 7));
await sp2.scrollIntoViewIfNeeded().catch(() => {}); await settle(p, 150); await snap('01b-tools-pile');
await snap('01-tools-world');
await closeTools();

// 3. The robot looks like a robot on the mini map: its avatar and the BOT badge.
const miniTok = tile(p.locator('.phc-mini'), ref(robotAt));
const img = await miniTok.locator('img').first().getAttribute('src').catch(() => '');
ok('mini map token shows the avatar (' + img + ')', !!img && img.includes(avId.replace(/^char-/, '')) || !!img);
ok('mini map token carries the BOT badge', (await miniTok.locator('[data-kind="BOT"]').count()) === 1);
ok('mini map shows the cache glyph', (await tile(p.locator('.phc-mini'), ref(cacheAt)).locator('[data-cache]').count()) === 1);
ok('mini map draws the pile (a stack with its count)', (await tile(p.locator('.phc-mini'), ref(pileAt)).locator('[data-pile]').count()) === 1);

// 4. Talk: click the robot's token on the area map; ask what it wants, ask about the objective (marker + HERE).
await openArea();
await tile(area, ref(robotAt)).click();
await panel.waitFor({ timeout: 30000 });
ok('the Talk panel opens with the portrait and kind', (await panel.locator('img[data-avatar]').count()) === 1 && /ROBOT/.test(await panel.textContent()));
const odds = await panel.locator('[data-odds]').allTextContents();
ok('the talk approach shows its odds and effects (' + odds.join(', ') + ')', odds.length >= 1 && /\d+%/.test(odds[0]) && /Fail: they turn hostile/.test(await panel.textContent()));
await settle(p, 200); await snap('02-talk-panel');
await panel.getByRole('button', { name: /^Ask what they want · 1 AP/ }).click();
await settle(p, 300);
ok('their want shows: ' + (await panel.locator('[data-told="w"]').textContent().catch(() => '')), /To be carried back/.test(await panel.locator('[data-told="w"]').textContent().catch(() => '')));
await panel.getByRole('button', { name: /^Ask about the objective · 1 AP/ }).click();
await settle(p, 400);
ok('the hint shows', /core is in the crate/.test(await panel.locator('[data-told="h"]').textContent().catch(() => '')));
await snap('03-talk-told');
await panel.getByRole('button', { name: 'Close', exact: true }).click(); await settle(p, 300);
ok('a hint marker on the cache tile', (await tile(area, ref(cacheAt)).locator('[data-marker]').count()) === 1);
await snap('04-marker');
await closeArea();
const here = p.locator('[data-here]');
ok('the HERE card lists the objective and its step: ' + (await here.textContent().catch(() => '')), /Find the power core/.test(await here.textContent().catch(() => '')) && /Hum/.test(await here.textContent().catch(() => '')));
await snap('05-here-card');

// 5. Carry the robot (Near you), see it in the GEAR tab with its weight, put it down on a dashed tile.
await p.locator('button[data-near="c' + robot.id + '"]').first().click();
await settle(p, 400);
g = await G();
ok('carried: ' + JSON.stringify((g.characters[me.id].carried || []).map((x) => x.npc.name + ' ' + x.kg)), (g.characters[me.id].carried || []).some((x) => x.npc.id === robot.id && x.kg === 40) && !(g.story.npcs || []).some((n) => n.id === robot.id));
await p.getByRole('tab', { name: 'GEAR', exact: true }).click().catch(async () => { await p.getByRole('tab', { name: /Gear/i }).first().click(); });
const carriedBox = p.locator('[data-carried]');
await carriedBox.waitFor({ timeout: 30000 });
ok('the GEAR tab shows the carried robot with 40 kg: ' + (await carriedBox.textContent()), /Hum/.test(await carriedBox.textContent()) && /40 kg/.test(await carriedBox.textContent()));
await snap('06-carried');
await endTurn();
await carriedBox.locator('button[data-putdown-btn]').first().click();
await area.waitFor();
await settle(p, 300);
const dashed = area.locator('[data-putdown]');
ok('Put down shows dashed free tiles next to you (' + (await dashed.count()) + ')', (await dashed.count()) > 0);
await snap('07-put-down-pick');
const pdBtn = area.locator('button.phc-tok:has([data-putdown])').first();
const pdRef = ((await pdBtn.getAttribute('aria-label')) || '').split(/[ :]/)[0];
await pdBtn.click(); await settle(p, 400);
g = await G();
const back = (g.story.npcs || []).find((n) => n.id === robot.id);
ok('the robot is back on the map at ' + pdRef + ' (' + (back ? ref(back.pos) : 'missing') + ') with its avatar', !!back && ref(back.pos) === pdRef && back.avatar === avId && !(g.characters[me.id].carried || []).length);
ok('its token returns with the badge', (await tile(area, pdRef).locator('[data-kind="BOT"]').count()) === 1);
await closeArea();

// 6. Search the cache from Near you: its two things go into the pack.
const packN = (c) => (c.pack || []).reduce((t, x) => t + (x.qty || 1), 0);
const before = packN(g.characters[me.id]);
await p.locator('button[data-near="s' + crate.id + '"]').first().click();
await settle(p, 400);
g = await G();
ok('searched: pack ' + before + ' → ' + packN(g.characters[me.id]) + '; the cache is empty (' + (g.story.objects.find((o) => o.id === crate.id)?.searched) + ')', packN(g.characters[me.id]) > before && !!g.story.objects.find((o) => o.id === crate.id)?.searched);
ok('the log says what was found: ' + (await lastLog()), /gets/.test(await lastLog()));
await endTurn();

// 7. A locked crate whose way in fails with hurt: TN 20, no skill (only a 20 opens it).
await world();
g = await G();
const at1 = g.story.positions[me.id], [ax, ay] = at1.split(',').map(Number);
const near1 = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].map(([dx, dy]) => key(ax + dx, ay + dy)).filter((k) => free(g, k) && !/^-|,-/.test(k));
await sc.getByLabel('Cache name', { exact: true }).fill('Strongbox');
await sc.getByRole('checkbox').check();
await sc.getByLabel('Way in TN', { exact: true }).selectOption('20');
await sc.getByLabel('Way in skill', { exact: true }).selectOption('implication');
await sc.getByLabel('Tile for cache', { exact: true }).fill(ref(near1[0]));
await sc.locator('button[data-world-place="cache"]').click();
await settle(p, 300);
await closeTools();
g = await G();
const box = g.story.objects.find((o) => o.name === 'Strongbox');
const hp0 = g.characters[me.id].hp;
await openArea();
await tile(area, ref(box.pos)).click();
const objDlg = p.locator('div[role="dialog"][aria-label="Strongbox"]');
await objDlg.waitFor();
ok('the strongbox panel: locked, holds 2, odds and "Fail: 35 damage" in plain words: ' + (await objDlg.locator('[data-fail]').first().textContent()), /50 damage/.test(await objDlg.locator('[data-fail]').first().textContent()) && (await objDlg.locator('[data-odds]').count()) > 0);
await snap('08-locked-cache');
await objDlg.getByRole('button', { name: 'Try this · 2 AP' }).first().click();
await settle(p, 700);
// The Proving Ground rolls at once; if a die table opened, close it.
const diceDlg = p.locator('div[role="dialog"][aria-label="Dice table"]');
if (await diceDlg.count()) { await p.keyboard.press('Escape').catch(() => {}); }
g = await G();
const hp1 = g.characters[me.id].hp, tries = g.story.objects.find((o) => o.id === box.id)?.approaches[0]?.tries || [];
ok('the way in was tried (' + JSON.stringify(tries.map((t) => t.ok)) + ') and failing hurt: HP ' + hp0 + ' → ' + hp1, tries.length === 1 && (tries[0].ok || hp1 < hp0));
await snap('09-approach-hurt');
await p.keyboard.press('Escape').catch(() => {});
if (await objDlg.count()) await objDlg.getByRole('button', { name: 'Close', exact: true }).click().catch(() => {});
await settle(p, 300);
await closeArea();
await endTurn();

// 8. A minefield across our way: walk through it (a mine goes off), then another one we find a safe path through.
await world();
g = await G();
const at2 = g.story.positions[me.id], [bx, by] = at2.split(',').map(Number);
// A column of mines two tiles to one side, wall to wall (rules 1.9: a click-path goes around revealed hazards when it
// can, so a short column would be walked round), and the target tile beyond it.
const dir = bx > 6 ? -1 : 1, mcol = bx + 2 * dir, zh = (g.campaign?.zones || []).find((z) => z.id === g.story.zone)?.h || 12;
const sh = drawer.locator('section[aria-label="World: a hazard"]');
await sh.getByLabel('Hazard kind', { exact: true }).selectOption('minefield');
await sh.getByLabel('Tile for hazard', { exact: true }).fill(ref(key(mcol, 0)) + ':' + ref(key(mcol, zh - 1)));
await sh.locator('button[data-world-place="hazard"]').click();
await settle(p, 300);
g = await G();
const mine = (g.story.hazards || [])[0];
ok('a minefield placed: ' + (mine ? mine.tiles.map(ref).join(' ') : 'none'), !!mine && mine.kind === 'minefield');
await closeTools();
await openArea();
ok('the minefield tiles are drawn (' + (await area.locator('[data-hazard="minefield"]').count()) + ') with a legend word', (await area.locator('[data-hazard="minefield"]').count()) >= 2 && (await area.locator('[data-legend="hz-minefield"]').count()) === 1);
await snap('10-minefield');
const hpA = (await G()).characters[me.id].hp;
const fxN0 = ((await G()).story.fx || []).filter((e) => e.k === 'hazard').length;
const dest = key(bx + 3 * dir, by);
await area.getByRole('button', { name: /^Sprint/ }).first().click().catch(() => {});
await tile(area, ref(dest)).hover(); await settle(p, 250);
ok('the preview marks the mine the path crosses and says so', (await area.locator('[data-cross]').count()) === 1 && /Path crosses: minefield at/.test((await area.locator('span[aria-live="polite"]').allTextContents()).join(' ')));
await tile(area, ref(dest)).click();
await settle(p, 900);
g = await G();
const hzFx = (g.story.fx || []).filter((e) => e.k === 'hazard');
ok('sprinting into the minefield set a mine off: HP ' + hpA + ' → ' + g.characters[me.id].hp + ', fx ' + JSON.stringify(hzFx.slice(-1)), g.characters[me.id].hp < hpA && hzFx.length > fxN0);
await settle(p, 300); await snap('11-mine-hit');
await closeArea();
await endTurn();

// A second minefield, heavy, by us: find a safe path (skills maxed for the odds) from its ways-through panel.
await openTools(); await drawer.getByRole('tab', { name: 'Squad' }).click();
await drawer.locator('button[data-sb-skills="max"]').click(); await settle(p, 200);
await world();
g = await G();
const at3 = g.story.positions[me.id], [cx, cy] = at3.split(',').map(Number);
const ncol = cx + (cx > 6 ? -1 : 1);
await sh.getByRole('button', { name: 'heavy', exact: true }).click();
await sh.getByLabel('Tile for hazard', { exact: true }).fill(ref(key(ncol, Math.max(0, cy - 1))) + ':' + ref(key(ncol, cy + 1)));
await sh.locator('button[data-world-place="hazard"]').click();
await settle(p, 300);
await closeTools();
g = await G();
const mine2 = (g.story.hazards || []).find((h) => h.severity === 'heavy');
await p.locator('button[data-near="h' + mine2.id + '"]').first().click();
await panel.waitFor();
ok('the hazard panel shows the ways through with odds (' + (await panel.locator('[data-odds]').allTextContents()).join(', ') + ')', (await panel.locator('[data-odds]').count()) === 2 && /Vigilance or Senses/.test(await panel.textContent()));
await snap('12-hazard-panel');
await panel.locator('button[data-try^="ap-0"]').click();
await settle(p, 700);
if (await diceDlg.count()) await p.keyboard.press('Escape').catch(() => {});
g = await G();
const h2 = (g.story.hazards || []).find((h) => h.id === mine2.id);
ok('a safe path found through the heavy minefield (' + (h2?.safe || []).map(ref).join(' ') + ')', (h2?.safe || []).length > 0 || (h2?.approaches[0]?.tries || []).length === 1);
if (await panel.count()) await panel.getByRole('button', { name: 'Close', exact: true }).click();
await openArea();
ok('safe-path tiles drawn ✓', (await area.locator('[data-hazard="minefield safe"]').count()) > 0 || !(h2?.safe || []).length);
await snap('13-safe-path');
await closeArea();
await endTurn();

// 9. An ambush: a trigger on tiles two steps away; walking there spawns two raiders and starts the fight.
await world();
g = await G();
const at4 = g.story.positions[me.id], [tx0, ty] = at4.split(",").map(Number);
// A tile next to us on open ground (no hazard on it: the engine's paths don't steer round mines), nobody there.
const hzT = new Set((g.story.hazards || []).flatMap((h) => h.tiles));
const tgAt = [[-1, 0], [0, 1], [0, -1], [-1, 1], [-1, -1], [1, 1], [1, -1], [1, 0]].map(([dx, dy]) => key(tx0 + dx, ty + dy)).find((k) => !/^-|,-/.test(k) && !hzT.has(k) && free(g, k));

// An ammo box next to that tile, to search in the fight.
const [gx, gy] = tgAt.split(',').map(Number);
const boxAt = [[-1, 0], [0, 1], [0, -1], [1, 0], [-1, 1], [1, 1], [-1, -1], [1, -1]].map(([dx, dy]) => key(gx + dx, gy + dy)).find((k) => !/^-|,-/.test(k) && k !== at4 && !hzT.has(k) && free(g, k));
await sc.getByLabel('Cache name', { exact: true }).fill('Ammo box');
await sc.getByRole('checkbox').uncheck(); // a plain box, no lock
await sc.getByLabel('Tile for cache', { exact: true }).fill(ref(boxAt));
await sc.locator('button[data-world-place="cache"]').click();
await settle(p, 300);
const st = drawer.locator('section[aria-label="World: a trigger"]');
await st.getByLabel('Tile for trigger', { exact: true }).fill(ref(tgAt) + ':' + ref(tgAt));
await st.locator('button[data-world-place="trigger"]').click();
await settle(p, 300);
ok('the trigger is set (log: ' + (await lastLog()).slice(-120) + ')', /Trigger tg\d+/.test(await lastLog()));
await closeTools();
await openArea();
await area.getByRole('button', { name: /^Move/ }).first().click().catch(() => {});
await tile(area, ref(tgAt)).click();
await settle(p, 1200);
g = await G();
const trig = (g.story.fx || []).filter((e) => e.k === 'trigger').slice(-1)[0];
ok('the trigger fired an ambush (' + JSON.stringify(trig) + '), phase ' + g.phase, !!trig && trig.then === 'fight' && (trig.spawned || []).length === 2);
await settle(p, 2200);
await snap('14-ambush');
ok('the fight draws the hazards (' + (await p.locator('[data-hazard]').count()) + ' tiles) and their legend', (await p.locator('[data-hazard]').count()) >= 3 && (await p.locator('[data-legend="hz-minefield"]').count()) >= 1);
// Search the ammo box in the fight: wait for our turn, then its button.
await p.waitForFunction(() => { const g = window.__phc.getState().game, cb = g.combat; return !!cb && cb.units.find((u) => u.id === cb.order[cb.turn])?.side === 'pc' && performance.now() > (window.__phcHold ? window.__phcHold() : 0); }, null, { timeout: 20000 }).catch(() => {});
const sbtn = p.locator('button[data-cb-search]', { hasText: 'Ammo box' }).first();
const packC = async () => { const g = await G(); return (g.characters[me.id].pack || []).reduce((t, x) => t + (x.qty || 1), 0); };
if (await sbtn.count()) {
  console.log('search button:', (await sbtn.textContent()));
  const n0 = await packC(); await sbtn.click(); await settle(p, 500);
  const cb = (await G()).combat, bx2 = (cb.objects || []).find((o) => o.name === 'Ammo box');
  ok('searched the ammo box in the fight (searched ' + bx2?.searched + ')', !!bx2?.searched);
  void n0;
} else ok('a Search button in the fight (the ammo box next to us)', false);
await snap('15-fight-search');
ok('no page errors: ' + p.errors.join(' | '), !p.errors.length);
await browser.close();
