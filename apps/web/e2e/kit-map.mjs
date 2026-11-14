// Survival's generated fight maps drawn from the setting's kit (rules 1.45; survival-spec 4.3; build steps 7 and 8). Solo,
// seed fixed, a test room (run/skip wins a fight at once), at 1280 x 720. Three fights of stage 1 (the AHOC outpost):
// each map is the generator's (its skin names the kit), the ground is drawn under the tiles from the kit, every wall
// tile carries a wall piece and every doorway its doorway piece, cover and objects draw the kit's sprites, and the
// tokens, the hover and the fog are still drawn above it (a hover changes the hovered tile only). Then the FALLBACK: the
// same map with its skin's kit swapped for one with no art draws pixel for pixel as the same map with no skin at all
// (today's flat tiles). SHOTS=dir: kit-map-1..3.png (whole map) and the fallback pair; DSF=2 for 2x.
import { chromium, player, click, hostAs, lockIn, settle, OUT } from './lib.mjs';
const browser = await chromium.launch();
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const SEED = process.env.KIT_SEED || 'PHC-0001';
const p = await player(browser, 'host', { play: 'survival' });
await p.context().addInitScript((seed) => { try { localStorage.setItem('phc.testRoom', '1'); localStorage.setItem('phc.testSeed', seed); } catch { /* */ } }, SEED);
await p.setViewportSize({ width: 1280, height: 720 });
const G = () => p.evaluate(() => window.__phc.getState().game);
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const grid = p.locator('.phc-grid').first();

await hostAs(p, 'Leon');
await click(p, 'Create a character');
await p.getByPlaceholder('What the squad calls you').fill('Kade');
await p.locator('main button[aria-pressed]').first().click();
await click(p, 'Next ›');
await p.locator('button', { hasText: /^Use .* ›$/ }).first().click();
await click(p, 'Next ›'); await click(p, 'Next ›'); await click(p, 'Next ›');
await p.locator('button', { hasText: 'Line soldier' }).first().click();
await click(p, 'Next ›'); await lockIn(p);
await p.waitForSelector('text=✓ LOCKED IN');
await click(p, 'Start the run');
// the music's "now playing" card floats over the map's corner for a few seconds: hidden here, so the pictures compare
await p.addStyleTag({ content: 'div[role="status"][style*="position: fixed"]{display:none!important}' });
await p.waitForSelector('[data-phc-camp-screen]', { timeout: 60000 }); // rules 1.51: the camp first
await p.locator('[data-phc-startboon]').first().click();
await p.waitForSelector('[data-phc-run-screen]', { timeout: 60000 });

/** What the grid shows, read from the page: kit layers by kind, tiles with the kit ground, sprites by source. */
const drawn = () => p.evaluate(() => {
  const tiles = [...document.querySelectorAll('.phc-grid button.phc-tok')];
  const kit = {}; for (const i of document.querySelectorAll('.phc-grid img[data-kit]')) kit[i.dataset.kit] = (kit[i.dataset.kit] || 0) + 1;
  // the ground is the tile's floor layer (it reaches over the grid's gap: one floor, a faint line between tiles)
  const ground = tiles.filter((t) => { const f = t.querySelector(':scope > i[data-kit-floor]'); return !!f && /kit-ahoc-ground/.test(f.style.background); }).length;
  const sprites = [...document.querySelectorAll('.phc-grid button.phc-tok > img')].map((i) => i.getAttribute('src') || '').filter((s) => /\/assets\/kit-/.test(s) && !/wall-|ground-|dress-|decal-rubble/.test(s)).length;
  return { tiles: tiles.length, kit, ground, sprites };
});
const toWhole = async () => { const b = p.locator('.phc-mz-whole').first(); if (await b.count() && (await b.getAttribute('aria-pressed')) !== 'true' && !(await b.isDisabled())) { await b.click(); await settle(p, 600); } };

let fights = 0;
for (let step = 0; step < 40 && fights < 3; step++) {
  const r = (await G()).run;
  if (r.state === 'map') {
    const lit = await p.locator('[data-phc-node][data-phc-state="reachable"]').evaluateAll((b) => b.map((x) => x.getAttribute('data-phc-node')));
    const fight = lit.find((id) => ['fight', 'elite'].includes(r.nodes.find((n) => n.id === id)?.kind)) || lit[0];
    await p.locator('[data-phc-node="' + fight + '"]').click();
    await settle(p, 400);
    if ((await G()).run.state !== 'fight') { // a safe node: leave it the way the run's suite does
      await act({ type: 'run/leave' }).catch(() => {});
      // rules 1.48's lanes can lead the walk into a rest or another place, which opens full screen (rules 1.46): walk
      // out of it to the path map, as the survival suite does
      if (await p.locator('[data-phc-place] [data-phc-leave], [data-phc-leave]').count()) { await p.locator('[data-phc-leave]').first().click(); await p.waitForSelector('[data-phc-pathmap]', { timeout: 30000 }); }
      continue;
    }
  } else if (r.state === 'fight') {
    await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 60000 });
    await settle(p, 1500);
    for (let i = 0; i < 4 && (await p.locator('[data-phc-cutin]').count()); i++) { await p.keyboard.press('Escape'); await settle(p, 400); }
    fights++;
    const g = await G(), m = g.combat.map, d = await drawn();
    const walls = m.solid.length, doorways = await p.evaluate(() => document.querySelectorAll('.phc-grid img[data-kit="door"]').length);
    ok('fight ' + fights + ': a generated map (' + m.name + '), its skin the AHOC kit, ' + m.w + ' x ' + m.h, m.skin?.setting === 'ahoc' && /AHOC chapter outpost/.test(m.name));
    ok('fight ' + fights + ': the kit ground under every tile but the bare walls (' + d.ground + ' of ' + d.tiles + ')', d.ground >= d.tiles - walls && d.ground > 0);
    ok('fight ' + fights + ': a wall piece on every wall tile (' + (d.kit.wall || 0) + ' pieces on ' + walls + ' walls; ' + doorways + ' doorway pieces)', (d.kit.wall || 0) >= walls);
    ok('fight ' + fights + ': cover and objects draw the kit\'s sprites (' + d.sprites + ')', d.sprites > 0);
    ok('fight ' + fights + ': the tokens stay above the kit (a token image in front of the layers)', await p.evaluate(() => { const i = document.querySelector('.phc-grid button.phc-tok img[style*="object-fit: cover"]'); return !!i && getComputedStyle(i).zIndex === '2'; }));
    await toWhole();
    await p.mouse.move(5, 5); await settle(p, 300);
    await grid.screenshot({ path: OUT + 'kit-map-' + fights + '.png', animations: 'disabled', mask: [p.locator('[data-phc-float]')] });
    if (fights === 1) {
      // a hover changes the hovered tile only: the kit layers are static values of the memoised tiles
      const before = await drawn(), t = p.locator('.phc-grid button.phc-tok').nth(40); await t.hover(); await settle(p, 300);
      ok('a hover leaves the kit as it was (static layers: ' + JSON.stringify(before.kit) + ')', JSON.stringify((await drawn()).kit) === JSON.stringify(before.kit));
      await p.mouse.move(5, 5); await settle(p, 400);
      // THE FALLBACK: a kit with no art draws as a map with no skin (today's flat tiles), pixel for pixel
      // a picture is taken when the grid is still: two shots in a row the same (a late effect or fade settles first)
      const shot = async (name) => { await p.mouse.move(5, 5); await settle(p, 500); const o = { animations: 'disabled', mask: [p.locator('[data-phc-float]')] };
        let b = await grid.screenshot(o); for (let i = 0; i < 8; i++) { await settle(p, 250); const c = await grid.screenshot(o); if (Buffer.compare(b, c) === 0) break; b = c; }
        if (process.env.SHOTS) (await import('node:fs')).writeFileSync(OUT + name + '.png', b); return b; };
      const kitShot = await shot('kit-map-with-kit');
      await p.evaluate(() => { const g = window.__phc.getState().game; g.combat.map.skin = { ...g.combat.map.skin, setting: 'no-such-kit' }; window.__phc.go('combat'); });
      await settle(p, 600);
      const noArt = await shot('kit-map-kit-without-art'), noArtDrawn = await drawn();
      await p.evaluate(() => { const g = window.__phc.getState().game; delete g.combat.map.skin; window.__phc.go('combat'); });
      await settle(p, 600);
      const noSkin = await shot('kit-map-no-skin');
      ok('the fallback: a kit with no art draws no kit layer and no kit sprite', !Object.keys(noArtDrawn.kit).length && !noArtDrawn.sprites && !noArtDrawn.ground);
      ok('the fallback: a kit with no art is pixel for pixel the map with no skin (today\'s rendering): ' + noArt.length + ' and ' + noSkin.length + ' bytes', Buffer.compare(noArt, noSkin) === 0);
      ok('and the kit does change the picture', Buffer.compare(kitShot, noSkin) !== 0);
      await p.evaluate((skin) => { const g = window.__phc.getState().game; g.combat.map.skin = skin; window.__phc.go('combat'); }, m.skin);
      await settle(p, 400);
    }
    const e = await act({ type: 'run/skip' }); if (e) { ok('run/skip: ' + e, false); break; }
    await click(p, 'Back to the map ›', { timeout: 60000 });
  } else if (r.state === 'reward') {
    await p.waitForSelector('[data-phc-instead], [data-phc-kit] [data-phc-choice]', { timeout: 30000 });
    if (await p.locator('[data-phc-kit] [data-phc-choice]').count()) { await p.locator('[data-phc-kit] [data-phc-choice]').first().click(); await settle(p, 300); if (!(await G()).run.offers) continue; }
    await p.locator('[data-phc-instead]').first().click();
    await p.waitForFunction(() => window.__phc.getState().game.run.state !== 'reward', null, { timeout: 30000 });
  } else break;
}
ok('three fights seen', fights === 3);
await browser.close();
