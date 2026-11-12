// The camera (roadmap 2c) on the 26 x 26 Proving Ground, at real speed: the map's window keeps the usual tile size and
// follows the play; the player drags it, moves it with the keys, jumps back with Home, sees the whole map with M and
// uses the small map; what plays off screen raises an arrow at the window's edge. Then the area map's own camera.
// Screenshots with SHOTS=dir: camera-<width>-view.png, -whole.png, -area.png at 1280 x 720, 1440 x 900, 1920 x 1080.
import { chromium, click, BASE, pause } from './lib.mjs';
const browser = await chromium.launch();
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const SHOTS = process.env.SHOTS;
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { localStorage.setItem('phc.voice', JSON.stringify({ auto: false })); localStorage.setItem('phc.tips', '["*"]'); sessionStorage.setItem('phc.pressedAnyKey', '1'); } catch { /* */ } });
const p = await ctx.newPage();
const errors = []; p.on('pageerror', (e) => errors.push(e.message));
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const G = () => p.evaluate(() => window.__phc.getState().game);
const cam = () => p.evaluate(() => window.__phcCamera());
const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };
const shows = (c, k) => { const [x, y] = k.split(',').map(Number); return !!c && x >= c.tiles.x0 && x <= c.tiles.x1 && y >= c.tiles.y0 && y <= c.tiles.y1; };
const calm = async () => { for (let i = 0; i < 4 && (await p.locator('[data-phc-cutin]').count()); i++) { await p.keyboard.press('Escape'); await pause(p, 450); } };
const settle = async () => { await p.waitForFunction(() => { const c = window.__phcCamera(); return !!c && !c.gliding; }, null, { timeout: 5000 }).catch(() => {}); await pause(p, 120); };
const tileBox = (k) => p.locator('.phc-grid button.phc-tok[aria-label^="' + ref(k) + ' ·"]').boundingBox();
const myTurn = () => p.waitForFunction(() => { const d = document.querySelector('.phc-cb-dock'); return !!d && !d.getAttribute('data-lock') && !!document.querySelector('[role="tablist"][aria-label="Actions"] [role="tab"]'); }, null, { timeout: 60000 });

await p.goto(BASE);
await click(p, 'PROVING GROUND', { timeout: 90000 });
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 8000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 8000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
await p.waitForFunction(() => window.__phc.getState().game?.sandbox?.state === 'ready', null, { timeout: 30000 });
let g = await G(); const cid = Object.keys(g.characters)[0];
await act({ type: 'sandbox/skill', charId: cid, skill: 'durability', points: 10 }); await act({ type: 'sandbox/level', charId: cid, level: 12 });
await act({ type: 'sandbox/ai', on: false });
await act({ type: 'sandbox/fight' });
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 30000 });
await pause(p, 2400); await calm(); await act({ type: 'sandbox/clear' }); await pause(p, 500); await settle();
g = await G(); const me = g.combat.units.find((u) => u.side === 'pc'), [mx, my] = me.pos.split(',').map(Number);
ok('the Proving Ground is 26 x 26', g.combat.map.w === 26 && g.combat.map.h === 26);

// 1. The usual tile size, and the map bigger than its window.
let c = await cam();
const size = await p.evaluate(() => { const t = document.querySelector('.phc-grid button.phc-tok').getBoundingClientRect(), s = document.querySelector('.phc-grid-scroll'), a = document.querySelector('.phc-cb-aside').getBoundingClientRect();
  return { tile: t.width, zoom: Number(getComputedStyle(document.querySelector('.phc-grid')).zoom) || 1, vw: s.clientWidth, vh: s.clientHeight, cw: s.scrollWidth, ch: s.scrollHeight, aside: a.width, pageScroll: document.documentElement.scrollHeight - innerHeight }; });
const cols = c.tiles.x1 - c.tiles.x0 + 1, rows = c.tiles.y1 - c.tiles.y0 + 1;
ok(`at 1440 x 900 a tile is ${size.tile.toFixed(1)} px (${Math.round(size.zoom * 100)}%): the size a 16 x 11 map had, not the 21 px of a 26 x 26 map fitted`, size.tile >= 44 && size.tile <= 56 && Math.abs(size.tile - 46 * size.zoom) < 1);
ok(`the window shows ${cols} x ${rows} tiles of the 26 x 26 map and the map scrolls inside it`, c.scrolls && cols >= 15 && cols <= 18 && rows >= 10 && rows <= 13 && size.cw > size.vw && size.ch > size.vh);
ok(`the action zone keeps its room (${Math.round(size.aside)} px) and the page does not scroll`, size.aside >= 400 && size.pageScroll <= 1);
ok('Usual size is on in the toolbar', (await p.locator('.phc-mz-auto').getAttribute('aria-pressed')) === 'true' && (await p.locator('.phc-mz-whole').getAttribute('aria-pressed')) === 'false');
ok('the fight opens on your unit (' + ref(me.pos) + ')', shows(c, me.pos));
if (SHOTS) await p.screenshot({ path: SHOTS + 'camera-1440-view.png' });

// 2. A drag moves the view and does not act.
const before = await G(), a0 = await tileBox((mx + 3) + ',' + (my - 1));
const s0 = c.frame;
await p.mouse.move(a0.x + a0.width / 2, a0.y + a0.height / 2); await p.mouse.down(); await p.mouse.move(a0.x - 160, a0.y - 90, { steps: 8 }); await p.mouse.up(); await pause(p, 350);
c = await cam(); let after = await G();
const meNow = (gg) => gg.combat.units.find((u) => u.id === me.id);
ok(`a drag moved the view (${Math.round(c.frame.x - s0.x)}, ${Math.round(c.frame.y - s0.y)} px)`, c.frame.x - s0.x > 100 && c.frame.y - s0.y > 50);
ok('and did not act: your unit has not moved and has spent nothing', meNow(after).pos === me.pos && meNow(after).ap === meNow(before).ap && after.combat.log.length === before.combat.log.length);
// a plain click still acts (Move is picked: a click on a tile in reach moves there)
// (the view has come to rest after the drag before a tile's place on screen is read: read while it still glided, the
// click landed on the tile beside it)
await settle();
// (and the action panel is yours: while the fight's opening still plays the panel is locked and a click on a tile does
// nothing, which on a busy machine lasted past this point)
await myTurn().catch(() => {});
const near = (mx + 1) + ',' + my, nb = await tileBox(near);
const panelAt = await p.evaluate(() => { const d = document.querySelector('.phc-cb-dock'), t = document.querySelector('[role="tablist"][aria-label="Actions"] [role="tab"][aria-selected="true"]'); return (d && d.getAttribute('data-lock') ? 'locked: ' + d.getAttribute('data-lock') : 'open') + ', tab ' + (t ? (t.textContent || '').trim() : '?'); });
await p.mouse.click(nb.x + nb.width / 2, nb.y + nb.height / 2);
const confirm = p.getByRole('button', { name: 'Confirm', exact: true }).first();
// (until the click has done its work: the unit is there already, or Confirm has lit up for the picked tile. A look at
// Confirm a quarter of a second after the click found it still grey on a busy machine, and nothing was pressed.)
const there = (a) => window.__phc.getState().game.combat.units.find((u) => u.id === a.id).pos === a.to;
await p.waitForFunction((a) => { const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').trim() === 'Confirm'); return window.__phc.getState().game.combat.units.find((u) => u.id === a.id).pos === a.to || (!!b && !b.disabled); }, { id: me.id, to: near }, { timeout: 20000 }).catch(() => {});
if (!(await p.evaluate(there, { id: me.id, to: near })) && await confirm.isEnabled().catch(() => false)) await confirm.click();
await p.waitForFunction(there, { id: me.id, to: near }, { timeout: 20000 }).catch(() => {});
after = await G();
ok('a click without a drag still acts (the unit walked to ' + ref(near) + '; at the click the panel was ' + panelAt + '; the unit is at ' + ref(meNow(after).pos) + ', AP ' + meNow(after).ap + ')', meNow(after).pos === near);
await pause(p, 700);

// 3. The keys: arrows and WASD move the view, Home jumps back to your unit.
await p.mouse.move(5, 500); await p.mouse.click(5, 500);
c = await cam(); const k0 = c.frame;
await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('d'); await p.keyboard.press('s'); await p.keyboard.press('ArrowDown'); await settle();
c = await cam();
ok(`the arrow keys and W A S D move the view (${Math.round(c.frame.x - k0.x)}, ${Math.round(c.frame.y - k0.y)} px)`, c.frame.x - k0.x > 150 && c.frame.y - k0.y > 90);
for (let i = 0; i < 9; i++) await p.keyboard.press('ArrowRight'); for (let i = 0; i < 9; i++) await p.keyboard.press('ArrowUp'); await settle();
c = await cam();
ok('far away, your unit is off screen', !shows(c, near));
await p.keyboard.press('Home'); await settle(); c = await cam();
ok('Home jumps back to your unit', shows(c, near));
ok('the keys did not act either', meNow(await G()).pos === near);

// 4. The small map: there, with the frame; a click on it moves the view; it can be hidden, and that is remembered.
const mini = p.locator('.phc-cam-mini-map'), cv = p.locator('.phc-cam-mini-map canvas');
const fr = () => cv.getAttribute('data-frame').then((v) => (v || '').split(',').map(Number));
const mb = await cv.boundingBox(), f0 = await fr();
ok(`the small map is in the map's corner, ${Math.round(mb.width)} px wide, with the camera's frame on it (${f0[2]} x ${f0[3]} px)`, !!mb && mb.width >= 140 && mb.width <= 160 && f0[2] > 20 && f0[2] < 150 && f0[3] > 20 && f0[3] < 150);
ok('it is named for screen readers and stands clear of the action panel', /Small map of the whole field/.test(await mini.getAttribute('aria-label')) && await p.evaluate(() => { const m = document.querySelector('.phc-cam-mini-map').getBoundingClientRect(), a = document.querySelector('.phc-cb-aside').getBoundingClientRect(); return m.right <= a.left; }));
await p.mouse.click(mb.x + mb.width - 6, mb.y + mb.height - 6); await settle();
c = await cam(); const f1 = await fr();
ok('a click in its bottom-right corner sends the view to the map\'s bottom-right corner', shows(c, '25,25') && f1[0] > f0[0] && f1[1] > f0[1]);
await p.mouse.move(mb.x + mb.width - 6, mb.y + mb.height - 6); await p.mouse.down(); await p.mouse.move(mb.x + 8, mb.y + 8, { steps: 6 }); await p.mouse.up(); await settle();
c = await cam();
ok('a drag on it carries the view along (now the top-left corner)', shows(c, '0,0'));
await p.locator('.phc-cam-mini-tog').click(); await pause(p, 250);
ok('its button hides it, and this browser remembers', !(await mini.isVisible()) && await p.evaluate(() => localStorage.getItem('phc.miniMap') === 'hidden'));
await p.locator('.phc-cam-mini-tog').click(); await pause(p, 250);
ok('and shows it again', await mini.isVisible() && await p.evaluate(() => localStorage.getItem('phc.miniMap') === null));

// 5. M: the whole map, and back; in the overview a click on a tile goes there and does not act.
await p.mouse.click(5, 500); await p.keyboard.press('Home'); await settle();
const zBefore = size.zoom;
await p.keyboard.press('m'); await pause(p, 500);
c = await cam();
const whole = await p.evaluate(() => { const g = document.querySelector('.phc-grid').getBoundingClientRect(), s = document.querySelector('.phc-grid-scroll').getBoundingClientRect(); return { zoom: Number(getComputedStyle(document.querySelector('.phc-grid')).zoom) || 1, fits: g.width <= s.width + 2 && g.height <= s.height + 2, bottom: g.bottom, vh: innerHeight }; });
ok(`M shows the whole map (${Math.round(whole.zoom * 100)}%, all 26 x 26 tiles on screen)`, c.overview && whole.fits && whole.zoom < zBefore && whole.bottom <= whole.vh + 1 && c.tiles.x0 === 0 && c.tiles.x1 === 25 && c.tiles.y1 === 25 && (await p.locator('.phc-mz-whole').getAttribute('aria-pressed')) === 'true');
if (SHOTS) await p.screenshot({ path: SHOTS + 'camera-1440-whole.png' });
const farTile = '21,21', fb = await tileBox(farTile), gBefore = await G();
await p.mouse.click(fb.x + fb.width / 2, fb.y + fb.height / 2); await pause(p, 600); await settle();
c = await cam(); const gAfter = await G();
ok('a click on a tile in the overview goes back to the usual size, at that tile (' + ref(farTile) + ')', !c.overview && shows(c, farTile) && Math.abs((Number(await p.evaluate(() => getComputedStyle(document.querySelector('.phc-grid')).zoom)) || 1) - zBefore) < 0.011);
ok('and did not act', meNow(gAfter).pos === meNow(gBefore).pos && gAfter.combat.log.length === gBefore.combat.log.length);
await p.mouse.click(5, 500); await p.keyboard.press('m'); await pause(p, 400); ok('M again: the overview', (await cam()).overview);
await p.keyboard.press('m'); await pause(p, 500); await settle(); c = await cam();
ok('and M once more: back on your unit', !c.overview && shows(c, near));
await p.locator('.phc-mz-whole').click(); await pause(p, 400); const viaBtn = (await cam()).overview;
await p.locator('.phc-mz-home').click(); await pause(p, 500); await settle(); c = await cam();
ok('the toolbar does the same: Whole map, then My unit', viaBtn && !c.overview && shows(c, near));

// 6. An effect off screen raises an arrow at the window's edge; a click on it goes there.
const far = (mx + 5) + ',' + my;
await act({ type: 'sandbox/spawn', tier: 'boss', weapon: 'hellraiser_service_rifle', at: ref(far), name: 'Far Target' }); await pause(p, 500);
g = await G(); const farU = g.combat.units.find((u) => u.side === 'foe' && !u.dead && u.pos === far) || g.combat.units.find((u) => u.side === 'foe' && !u.dead);
const sees = await p.evaluate((id) => { const d = document.querySelector('[data-init="' + id + '"] [data-init-show]'); return !!d && !d.disabled; }, farU.id);
ok('a hostile stands at ' + ref(farU.pos) + (sees ? ', in sight' : ' (NOT in sight: the next checks need it seen)'), sees);
// you look at another part of the map, your pointer over it on your own turn (you are aiming): the camera stays, so the
// shot's far end gets an arrow
await p.mouse.click(5, 500); for (let i = 0; i < 9; i++) await p.keyboard.press('ArrowDown'); await settle();
c = await cam(); ok('you look elsewhere: the hostile is off screen', !shows(c, farU.pos));
const vb = await p.locator('.phc-grid-scroll').boundingBox(); await p.mouse.move(vb.x + vb.width / 2, vb.y + vb.height / 2); await pause(p, 200);
const e1 = await act({ type: 'combat/attack', unitId: me.id, targetId: farU.id, mode: 'shot' });
await p.waitForSelector('.phc-cam-arrow[data-cam-arrow="' + farU.pos + '"]', { timeout: 6000 }).catch(() => {});
const arrow = p.locator('.phc-cam-arrow[data-cam-arrow="' + farU.pos + '"]').first();
const hasArrow = (await arrow.count()) > 0;
ok('shooting a target that is off screen while you aim raises an arrow at the edge' + (e1 ? ' (the shot was refused: ' + e1 + ')' : ''), hasArrow);
if (hasArrow) {
  const info = await arrow.evaluate((el) => { const r = el.getBoundingClientRect(), s = document.querySelector('.phc-grid-scroll').getBoundingClientRect(); return { label: el.getAttribute('aria-label'), color: el.style.color, top: r.top - s.top, n: document.querySelectorAll('.phc-cam-arrow').length }; });
  ok(`it sits on the edge nearest the target (${Math.round(info.top)} px from the top edge), in the side's colour (${info.color}), and is named: "${info.label}"`, info.top < 40 && /is off screen\. Go there\.$/.test(info.label) && !!info.color);
  c = await cam(); ok('the camera stayed where you were looking', !shows(c, farU.pos));
  if (SHOTS) await p.screenshot({ path: SHOTS + 'camera-1440-arrow.png' });
  await arrow.click(); await settle(); c = await cam();
  ok('a click on the arrow goes there', shows(c, farU.pos) && (await p.locator('.phc-cam-arrow[data-cam-arrow="' + farU.pos + '"]').count()) === 0);
}
// a portrait in the initiative strip moves the camera to that unit
await p.mouse.click(5, 500); await p.keyboard.press('Home'); await settle();
await p.locator('[data-init="' + farU.id + '"] [data-init-show]').click(); await settle(); c = await cam();
ok('a click on a portrait in the initiative strip shows that unit', shows(c, farU.pos));
await p.locator('[data-init="' + me.id + '"] [data-init-show]').click(); await settle(); c = await cam();
ok('and on your own portrait, your unit', shows(c, near));

// 7. The camera follows the play: an attack on a target that was off screen has the target in frame when its hit plays,
//    and your own turn brings the camera back to your unit.
await act({ type: 'sandbox/clear' }); await pause(p, 400);
const foeAt = (mx + 5) + ',' + my;
await act({ type: 'sandbox/spawn', tier: 'soldier', weapon: 'hellraiser_service_rifle', at: ref(foeAt), name: 'Near Rifle' });
await act({ type: 'sandbox/ai', on: true }); await pause(p, 500);
await p.mouse.move(5, 500);
const mbb = await cv.boundingBox(); await p.mouse.click(mbb.x + mbb.width - 6, mbb.y + mbb.height - 6); await settle(); await p.mouse.move(5, 500);
c = await cam();
ok('the view is in the far corner: neither your unit nor the hostile shows', !shows(c, near) && !shows(c, foeAt));
await pause(p, 1700); // a hand move holds the camera for a moment on someone else's turn; let it pass
const seen = await p.evaluate(async (meId) => {
  const rows = []; let turnMine = null;
  const inView = (k) => { const c = window.__phcCamera(); if (!c || !k) return null; const [x, y] = String(k).split(',').map(Number); return x >= c.tiles.x0 && x <= c.tiles.x1 && y >= c.tiles.y0 && y <= c.tiles.y1; };
  const on = (ev) => { const d = ev.detail; if (!d) return; if (d.k === 'turn') rows.push({ k: 'turn', unit: d.unit, at: d.at, shown: inView(d.at), gliding: window.__phcCamera().gliding });
    if (d.k === 'shot' || d.k === 'melee') rows.push({ k: d.k, unit: d.unit, to: d.to, shown: inView(d.to || d.at), gliding: window.__phcCamera().gliding }); };
  window.addEventListener('phc-fx', on);
  const onTurn = (ev) => { if (ev.detail && ev.detail.mine) turnMine = performance.now(); };
  window.addEventListener('phc:turn-shown', onTurn);
  const pos0 = window.__phc.getState().game.combat.units.find((u) => u.id === meId).pos;
  window.__phc.act({ type: 'combat/end-turn', unitId: meId });
  const t0 = performance.now();
  while (performance.now() - t0 < 40000) { await new Promise((r) => setTimeout(r, 100)); const d = document.querySelector('.phc-cb-dock'); if (rows.some((r) => r.k !== 'turn' || r.unit !== meId) && d && !d.getAttribute('data-lock') && performance.now() - t0 > 2500) break; }
  await new Promise((r) => setTimeout(r, 900));
  window.removeEventListener('phc-fx', on); window.removeEventListener('phc:turn-shown', onTurn);
  const me = window.__phc.getState().game.combat.units.find((u) => u.id === meId);
  return { rows, home: me.pos, pos0, homeShown: inView(me.pos), hp: me.hp };
}, me.id);
if (process.env.DEBUG) console.log(JSON.stringify(seen), JSON.stringify((await G()).combat.log.slice(-8)));
const hits = seen.rows.filter((r) => (r.k === 'shot' || r.k === 'melee') && r.unit !== me.id);
ok(`the hostile attacked (${hits.length} ${hits.length === 1 ? 'hit or miss' : 'hits or misses'} played)`, hits.length > 0);
ok('each time, its target was in frame when the attack played, and the glide was over', hits.length > 0 && hits.every((r) => r.shown === true && !r.gliding));
const foeTurn = seen.rows.find((r) => r.k === 'turn' && r.unit !== me.id);
ok('the camera had gone to the hostile for its turn', !!foeTurn && (hits.length ? true : foeTurn.shown !== null));
ok('when your turn came the camera was back on your unit (' + ref(seen.home) + ')', seen.homeShown === true);
await act({ type: 'sandbox/ai', on: false }); await calm();

// 7b. A hostile too far away to share the window shoots as its turn starts: the camera stays on its target (it does
//     not swing to the shooter and back inside half a second) and the shooter gets an arrow at the edge.
await act({ type: 'sandbox/clear' }); await pause(p, 300); await myTurn().catch(() => {});
const farShooter = mx + ',' + (my - 10);
await act({ type: 'sandbox/spawn', tier: 'boss', weapon: 'hellraiser_service_rifle', at: ref(farShooter), name: 'Far Rifle' }); await pause(p, 500);
g = await G(); const fs = g.combat.units.find((u) => u.name === 'Far Rifle');
const fsSeen = !!fs && await p.evaluate((id) => { const d = document.querySelector('[data-init="' + id + '"] [data-init-show]'); return !!d && !d.disabled; }, fs.id);
ok('a rifle stands 10 tiles north of your unit, in sight, too far to share the window', fsSeen);
await p.mouse.move(5, 500); await p.mouse.click(5, 500); await p.keyboard.press('Home'); await settle(); await pause(p, 4200);
const watchCam = () => p.evaluate(() => { const w = (window.__camWatch = { frames: [], arrows: new Set(), shots: [], on: true }); let last = null;
  const tick = () => { if (!w.on) return; const c = window.__phcCamera(); if (c && c.frame) { const k = c.frame.x + ',' + c.frame.y; if (k !== last) { w.frames.push([c.frame.x, c.frame.y]); last = k; } } for (const a of document.querySelectorAll('.phc-cam-arrow')) w.arrows.add(a.getAttribute('data-cam-arrow')); requestAnimationFrame(tick); }; tick();
  w.fx = (ev) => { const d = ev.detail; if (!d || (d.k !== 'shot' && d.k !== 'melee')) return; const c = window.__phcCamera(); const [x, y] = String(d.to || d.at).split(',').map(Number); w.shots.push(!!c && x >= c.tiles.x0 && x <= c.tiles.x1 && y >= c.tiles.y0 && y <= c.tiles.y1); };
  window.addEventListener('phc-fx', w.fx); });
const readCam = () => p.evaluate(() => { const w = window.__camWatch; w.on = false; window.removeEventListener('phc-fx', w.fx); return { frames: w.frames, arrows: [...w.arrows], shots: w.shots }; });
await act({ type: 'sandbox/ai', on: true }); await watchCam();
await act({ type: 'combat/end-turn', unitId: me.id }); await pause(p, 1500); await myTurn().catch(() => {}); await pause(p, 500);
let w7 = await readCam();
const travel = w7.frames.length ? Math.max(...w7.frames.map((f) => Math.abs(f[1] - w7.frames[0][1]) + Math.abs(f[0] - w7.frames[0][0]))) : 0;
ok(`it shot ${w7.shots.length} time(s), each with its target on screen`, w7.shots.length > 0 && w7.shots.every(Boolean));
ok(`the camera stayed on the target the whole time (it moved ${Math.round(travel)} px)`, travel <= 2);
ok('and the shooter got an arrow at the window\'s edge', w7.arrows.includes(farShooter));
await act({ type: 'sandbox/ai', on: false }); await calm();

// 8. Fog of war: an unseen hostile gives nothing away: no dot on the small map, a portrait that cannot be clicked, and
//    its turn moves the camera nowhere and raises no arrow.
await act({ type: 'sandbox/clear' }); await pause(p, 300); await myTurn().catch(() => {});
await act({ type: 'sandbox/spawn', tier: 'soldier', weapon: 'combat_knife', at: 'X3', name: 'Unseen One' }); await pause(p, 500);
g = await G(); const un = g.combat.units.find((u) => u.name === 'Unseen One');
const unseenNow = () => p.evaluate((id) => { const d = document.querySelector('[data-init="' + id + '"] [data-init-show]'); return !!d && d.disabled; }, un.id);
const redDots = () => p.evaluate(() => { const cv = document.querySelector('.phc-cam-mini-map canvas'); if (!cv) return -1; const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 220 && d[i + 1] < 110 && d[i + 2] < 110) n++; return n; });
ok('a hostile stands at X3, out of your sight: its portrait cannot be clicked', !!un && await unseenNow());
ok('and the small map shows no dot for it', (await redDots()) === 0);
await p.mouse.move(5, 500); await p.mouse.click(5, 500); await p.keyboard.press('Home'); await settle(); await pause(p, 4200);
await act({ type: 'sandbox/ai', on: true }); await watchCam();
await act({ type: 'combat/end-turn', unitId: me.id }); await pause(p, 1500); await myTurn().catch(() => {}); await pause(p, 500);
w7 = await readCam(); g = await G();
const un2 = g.combat.units.find((u) => u.id === un.id), stillUnseen = await unseenNow();
if (stillUnseen) {
  ok('it took its turn out of sight (it is at ' + ref(un2.pos) + ' now, was at X3)', un2.pos !== un.pos);
  ok('and that moved your camera nowhere (' + w7.frames.length + ' position seen)', w7.frames.length <= 1);
  ok('raised no arrow', w7.arrows.length === 0);
  ok('and put no dot on the small map', (await redDots()) === 0);
} else console.log('     (the hostile walked into sight this time: the fog checks need it unseen)');
await act({ type: 'sandbox/ai', on: false }); await calm(); await act({ type: 'sandbox/clear' }); await pause(p, 300);

// 8b. To the level-up screen and back in the middle of a fight: the camera is on your unit again, not in the map's corner.
await myTurn().catch(() => {});
await p.mouse.click(5, 500); for (let i = 0; i < 6; i++) await p.keyboard.press('ArrowRight'); await settle();
await p.evaluate((id) => window.__phc.go('levelup', { levelupChar: id }), cid);
await p.waitForFunction(() => window.__phc.getState().screen === 'levelup', null, { timeout: 8000 }).catch(() => {});
await pause(p, 600);
const lvl = await p.evaluate(() => ({ cam: window.__phcCamera(), clip: document.querySelector('.phc-fx-layer')?.style.clipPath || '' }));
ok('on the level-up screen there is no camera and the effects layer is whole again', lvl.cam === null && lvl.clip === '');
await p.evaluate(() => window.__phc.go('combat', { levelupChar: null }));
await p.waitForFunction(() => window.__phc.getState().screen === 'combat' && !!window.__phcCamera(), null, { timeout: 8000 }).catch(() => {});
await pause(p, 900); await calm(); await settle();
c = await cam(); g = await G();
ok('back in the fight the camera shows your unit (' + ref(g.combat.units.find((u) => u.id === me.id).pos) + ')', !!c && c.scrolls && shows(c, g.combat.units.find((u) => u.id === me.id).pos));

// 9. Screenshots at three window sizes: the camera view and the overview; the tile keeps the size a 16 x 11 map had.
await myTurn().catch(() => {});
await act({ type: 'sandbox/spawn', tier: 'soldier', weapon: 'hellraiser_service_rifle', at: ref((mx + 4) + ',' + (my - 1)) });
await act({ type: 'sandbox/spawn', tier: 'elite', weapon: 'hellraiser_service_rifle', at: ref((mx + 5) + ',' + (my + 2)) });
await act({ type: 'sandbox/meter', unitId: me.id, guard: 3 }).catch(() => {});
const sizes = {};
for (const [w, h] of [[1280, 720], [1440, 900], [1920, 1080]]) {
  await p.setViewportSize({ width: w, height: h }); await pause(p, 800); await p.mouse.click(5, 300); await p.keyboard.press('Home'); await settle();
  const t = await p.evaluate(() => { const b = document.querySelector('.phc-grid button.phc-tok').getBoundingClientRect(), s = document.querySelector('.phc-grid-scroll'); return { tile: b.width, pitch: (window.__phcCamera().grid || {}).pitch, vw: s.clientWidth, vh: s.clientHeight, aside: document.querySelector('.phc-cb-aside').getBoundingClientRect().width, pageScroll: document.documentElement.scrollHeight - innerHeight }; });
  sizes[w] = t; c = await cam();
  ok(`${w} x ${h}: a tile is ${t.tile.toFixed(1)} px, the window ${t.vw} x ${t.vh} px shows ${c.tiles.x1 - c.tiles.x0 + 1} x ${c.tiles.y1 - c.tiles.y0 + 1} tiles, your unit in it; the action zone keeps ${Math.round(t.aside)} px`, t.tile >= 32 && shows(c, (await G()).combat.units.find((u) => u.id === me.id).pos) && t.aside >= 400 && t.pageScroll <= 1);
  if (SHOTS) { await p.screenshot({ path: SHOTS + `camera-${w}-view.png` }); await p.keyboard.press('m'); await pause(p, 500); await p.screenshot({ path: SHOTS + `camera-${w}-whole.png` }); await p.keyboard.press('m'); await pause(p, 500); }
}
ok('a bigger window gives bigger tiles, never smaller: ' + [1280, 1440, 1920].map((w) => sizes[w].tile.toFixed(0) + ' px').join(' → '), sizes[1280].tile <= sizes[1440].tile && sizes[1440].tile <= sizes[1920].tile);

// 10. The area map has the same camera (the Proving Ground between fights).
await p.setViewportSize({ width: 1440, height: 900 }); await pause(p, 500);
await act({ type: 'sandbox/stop' }); await p.waitForFunction(() => window.__phc.getState().game?.phase !== 'combat', null, { timeout: 15000 }).catch(() => {});
await p.waitForFunction(() => window.__phc.getState().screen === 'main', null, { timeout: 15000 }).catch(() => p.evaluate(() => window.__phc.go && window.__phc.go('main')));
await pause(p, 1200); await calm();
await p.mouse.click(5, 500); await p.keyboard.press('m');
await p.waitForSelector('[role="dialog"][aria-label="Area map"]', { timeout: 8000 }).catch(() => {});
await pause(p, 900); await settle();
c = await cam();
const area = await p.evaluate(() => { const s = document.querySelector('.phc-area-scroll'); if (!s) return null; const t = s.querySelector('button.phc-tok').getBoundingClientRect(); return { tile: t.width, vw: s.clientWidth, vh: s.clientHeight, cw: s.scrollWidth, ch: s.scrollHeight, mini: !!document.querySelector('[data-phc-cam="area"] .phc-cam-mini-map') }; });
ok('M outside a fight still opens the area map', !!area);
if (area && c) {
  g = await G(); const my2 = g.story && c.home;
  ok(`the area map keeps its usual tile size too (${area.tile.toFixed(1)} px) and scrolls in its window (${area.vw} x ${area.vh} px of ${area.cw} x ${area.ch})`, c.id === 'area' && c.scrolls && area.tile >= 40 && area.tile <= 60 && area.cw > area.vw);
  ok('it opens on your character (' + (my2 ? ref(my2) : '?') + ') and has the small map', !!my2 && shows(c, my2) && area.mini);
  if (SHOTS) await p.screenshot({ path: SHOTS + 'camera-1440-area.png' });
  const a0 = c.frame; await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('s'); await settle(); c = await cam();
  ok('the arrow keys and W A S D move it', c.frame.x - a0.x > 60 && c.frame.y - a0.y > 30);
  const sb = await p.locator('.phc-area-scroll').boundingBox(), b0 = c.frame;
  await p.mouse.move(sb.x + 300, sb.y + 200); await p.mouse.down(); await p.mouse.move(sb.x + 180, sb.y + 140, { steps: 6 }); await p.mouse.up(); await pause(p, 300); c = await cam();
  ok('a drag moves it', c.frame.x - b0.x > 80);
  await p.keyboard.press('Home'); await settle(); c = await cam();
  ok('Home goes back to your character', shows(c, c.home));
  await p.locator('[role="dialog"][aria-label="Area map"] .phc-mz-whole').click(); await pause(p, 500);
  const fit = await p.evaluate(() => { const s = document.querySelector('.phc-area-scroll'), t = s.querySelector('button.phc-tok').getBoundingClientRect(); return { tile: t.width, all: s.scrollWidth <= s.clientWidth + 2 }; });
  ok(`Whole map fits it all (tiles ${fit.tile.toFixed(1)} px)`, fit.tile < area.tile);
  if (SHOTS) await p.screenshot({ path: SHOTS + 'camera-1440-area-whole.png' });
  for (const [w, h] of [[1280, 720], [1920, 1080]]) { await p.setViewportSize({ width: w, height: h }); await pause(p, 700); if (SHOTS) await p.screenshot({ path: SHOTS + `camera-${w}-area-whole.png` }); }
  await p.locator('[role="dialog"][aria-label="Area map"] .phc-mz-whole').click(); await pause(p, 600);
  for (const [w, h] of [[1280, 720], [1920, 1080]]) { await p.setViewportSize({ width: w, height: h }); await pause(p, 800); await p.keyboard.press('Home'); await settle(); if (SHOTS) await p.screenshot({ path: SHOTS + `camera-${w}-area.png` }); }
  await p.keyboard.press('m'); await pause(p, 600);
  ok('M closes the area map again', (await p.locator('[role="dialog"][aria-label="Area map"]').count()) === 0);
}
ok('no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''), errors.length === 0);
await browser.close();
