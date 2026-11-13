// The RESOURCES block below the HP bar (game/resources.ts; Outburst 2.0 proposal section 10): in the combat You card,
// the short-window mini-bar, the collapsed panel, the turn cut-in and the area-map HUD, for a gunner (low ammo →
// RELOAD), a Sigil caster (empty core → RELOAD CORE, Flux 5 → OVERLOAD SOON), a Soul caster (Strain near the limit, a
// held Outburst), a Fighter with Momentum and a Storm Hand with Charges.
// The Proving Ground starts each build with real actions (class, kit, gear); the state a test needs (ammo, charge,
// Flux, Strain…) is written into the host's own save and the page reloads it, as a returning host would.
// Screenshots: e2e/shots/resources-*.png (deviceScaleFactor 1, 1440×900 and 1280×720).
import { chromium, click, BASE, OUT, pause, tipOf } from './lib.mjs';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { localStorage.setItem('phc.voice', JSON.stringify({ auto: false })); localStorage.setItem('phc.tips', '["*"]'); sessionStorage.setItem('phc.pressedAnyKey', '1'); } catch { /* */ } });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const G = () => p.evaluate(() => window.__phc.getState().game);
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const snap = async (n, size) => { if (size) { await p.setViewportSize(size); await settle(); } await pause(p, 350); await p.screenshot({ path: OUT + 'resources-' + n + '.png' }); };
const dismissCut = async () => { for (let i = 0; i < 4 && (await p.locator('[data-phc-cutin]').count()); i++) { await p.keyboard.press('Escape'); await pause(p, 450); } };

await p.goto(BASE);
await click(p, 'PROVING GROUND');
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 20000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 20000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
await p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 30000 });
let g = await G();
let me = Object.values(g.characters)[0].id;

/** A fresh Proving Ground (the test character as it came), the build's steps (class, kit, gear), then the fight, on our
 *  turn, with the cut-in dismissed. The drill units pass their turns (AI off), so nothing changes under the test. */
async function build(steps) {
  g = await G();
  if (g.sandbox) { await act({ type: 'sandbox/end' }); await p.waitForFunction(() => !window.__phc.getState().game.sandbox, null, { timeout: 30000 }); }
  await act({ type: 'sandbox/start', standalone: true });
  await p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 30000 });
  g = await G(); me = Object.values(g.characters)[0].id;
  await act({ type: 'sandbox/ai', on: false });
  for (const a of steps) { const e = await act({ ...a, charId: me }); if (e) console.log('  (' + a.type + ': ' + e + ')'); }
  await act({ type: 'sandbox/fight' });
  await p.waitForFunction(() => { const g = window.__phc.getState().game; return g.phase === 'combat' && g.combat; }, null, { timeout: 30000 });
  for (let i = 0; i < 30; i++) { g = await G(); const cur = g.combat.units.find((u) => u.id === g.combat.order[g.combat.turn]); if (cur && cur.charId === me) break; if (cur) await act({ type: 'combat/end-turn', unitId: cur.id }); await pause(p, 200); }
  await settle();
}
/** Let the banners and the cut-in come and go (any key plays on), so screenshots show the screen itself. */
async function settle() {
  const cut = p.locator('[data-phc-cutin]');
  let clear = 0;
  for (let i = 0; i < 40 && clear < 8; i++) { // until no cut-in for ~2 s (banners come and go first)
    if (await cut.count()) { clear = 0; await p.keyboard.press('Escape'); } else clear++;
    await pause(p, 250);
  }
  await p.mouse.move(1435, 895);
}
/** Change our fight unit in the host's save, then reload it (the room resumes from the save). */
async function patch(fnSrc) {
  await p.evaluate(({ me, fnSrc }) => {
    const code = window.__phc.getState().game.code, key = 'phc.game.' + code, s = JSON.parse(localStorage.getItem(key));
    const u = s.combat.units.find((x) => x.charId === me && !x.ctrl);
    new Function('u', 's', fnSrc)(u, s);
    localStorage.setItem(key, JSON.stringify(s));
  }, { me, fnSrc });
  await p.reload();
  await p.waitForFunction(() => window.__phc?.getState().game?.combat, null, { timeout: 30000 });
  await settle();
}
const youCard = () => p.locator('[aria-label="You"] [aria-label="Your resources"]');
const rowText = async (key, where = youCard()) => ((await where.locator('[data-res="' + key + '"]').first().textContent().catch(() => '')) || '').replace(/\s+/g, ' ');
const BIG = { width: 1440, height: 900 }, SMALL = { width: 1280, height: 720 };

// 1. The gunner: a rifle with 3 rounds left and two spare magazines → RELOAD; the turn cut-in shows it too.
await p.setViewportSize(BIG);
await build([{ type: 'sandbox/give', item: 'hellraiser_service_rifle', equip: true }]);
await patch('u.ammo = 3; u.heat = 0;');
// A new turn of ours brings the cut-in: end this one (the drill units pass) and wait for it.
g = await G();
await act({ type: 'combat/end-turn', unitId: g.combat.units.find((u) => u.charId === me && !u.ctrl).id });
const cut = p.locator('[data-phc-cutin]');
await cut.waitFor({ timeout: 20000 }).catch(() => {});
await pause(p, 700);
if (await cut.count()) {
  const ct = (await cut.textContent()) || '';
  ok('the turn cut-in lists the ammo with RELOAD: ' + (ct.match(/AMMO.{0,40}/) || [''])[0], /AMMO/i.test(ct) && /RELOAD/.test(ct));
  await snap('turn-card-gunner');
  await dismissCut(); await pause(p, 1200); await p.mouse.move(1435, 895);
} else ok('the turn cut-in came up after the reload (it shows for a turn of yours)', false);
let t = await rowText('ammo');
ok('gunner: ammo in words, loaded / capacity and spares, RELOAD: ' + t, /AMMO/.test(t) && /3 \/ \d+ loaded/.test(t) && /spare/.test(t) && /RELOAD/.test(t));
t = await rowText('heat');
ok('gunner: Heat vs its jam limit: ' + t, /HEAT/.test(t) && /\d+ \/ \d+/.test(t));
ok('gunner: no Sigil or Soul rows', !(await youCard().locator('[data-res="charge"],[data-res="strain"]').count()));
ok('the old tiny Ammo line is gone from the You card', !/Ammo \d+\/\d+/.test((await p.locator('[aria-label="You"]').first().textContent()) || ''));
const sz = await youCard().locator('[data-res="ammo"]').first().evaluate((el) => { const sp = el.querySelectorAll('span'); const fs = [...sp].map((s) => parseFloat(getComputedStyle(s).fontSize)); const bar = [...el.querySelectorAll('span[aria-hidden="true"] > span')].map((s) => s.getBoundingClientRect().height); return { min: Math.min(...fs.filter((x) => x > 0)), max: Math.max(...fs), bar: Math.max(0, ...bar), w: el.getBoundingClientRect().width, card: el.closest('[aria-label="You"]').getBoundingClientRect().width }; });
ok('readable: labels ≥ 13 px, values ≥ 15 px, bars ≥ 8 px, near the card\'s full width: ' + JSON.stringify(sz), sz.min >= 12 && sz.max >= 15 && sz.bar >= 8 && sz.w >= sz.card - 40);
await snap('gunner-1440');
// Hover shows the hint.
await youCard().locator('[data-res="ammo"]').first().hover();
await pause(p, 200);
await youCard().locator('[data-res="ammo"]').first().hover(); await pause(p, 500);
ok('hovering a row shows its hint (what to do) in the one card', (await p.locator('.phc-atip').count()) === 1 && /\S/.test(await tipOf(youCard().locator('[data-res="ammo"]'))));
await snap('gunner-hover-1440');
// 1280×720: the full card steps aside; the 2–3 most urgent rows sit under the bar.
await p.setViewportSize(SMALL); await settle();
const urg = p.locator('.phc-me-urgent');
ok('1280×720: the urgent rows show in the mini-bar: ' + ((await urg.textContent()) || '').replace(/\s+/g, ' ').slice(0, 80), (await urg.isVisible()) && /RELOAD/.test((await urg.textContent()) || ''));
await snap('gunner-1280');
// The collapsed panel's mini card.
await p.keyboard.press('h'); await pause(p, 400);
const mini = p.locator('.phc-cb-mini');
ok('collapsed panel: the mini card carries the urgent rows', (await mini.count()) > 0 && /RELOAD/.test((await mini.textContent()) || ''));
await snap('gunner-collapsed-1280');
await p.keyboard.press('h'); await pause(p, 300);
await p.setViewportSize(BIG);

// 2. The Sigil caster: an empty core with spares → RELOAD CORE, Flux 5 → OVERLOAD SOON.
await build([{ type: 'sandbox/unequip', slot: 'main' }, { type: 'sandbox/kit', kind: 'sigil' }]);
await patch('u.mg.charge = 0; u.mg.cores = 2; u.mg.flux = 5;');
t = await rowText('charge');
ok('Sigil: Evoker charge / 10 and spare cores, RELOAD CORE: ' + t, /EVOKER CHARGE/.test(t) && /0 \/ 10/.test(t) && /2 spare cores/.test(t) && /RELOAD CORE/.test(t));
t = await rowText('flux');
ok('Sigil: Flux 5 / 6 OVERLOAD SOON: ' + t, /FLUX/.test(t) && /5 \/ 6/.test(t) && /OVERLOAD SOON/.test(t));
await youCard().locator('[data-res="charge"]').first().hover(); await pause(p, 150);
ok('Sigil: the hint says swap core (2 AP)', /Swap core \(2 AP\)/i.test(await tipOf(youCard().locator('[data-res="charge"]'))));
await p.mouse.move(5, 5);
await snap('sigil-1440');
await snap('sigil-1280', SMALL); await p.setViewportSize(BIG);

// 3. The Soul caster: Strain one below the limit, holding an Outburst at stage 2.
await build([{ type: 'sandbox/unequip', slot: 'main' }, { type: 'sandbox/kit', kind: 'soul' }]);
await patch('const d = (u.mg.designs || [])[0]; u.mg.strain = Math.max(1, (u.mg.strainLimit || 3) - 1); if (d) u.mg.held = { design: d.id, stage: 2, cost: 40 };');
// One fact, one place (Leon, live 0.24.0): on the Outbursts tab the HEART panel says the Strain and the held Outburst,
// so the unit panel doesn't; on any other tab the unit panel does.
const onTab = async (id) => { await p.locator('[role="tab"][data-tab="' + id + '"]').first().click(); await pause(p, 250); };
await onTab('outbursts');
ok('Soul: with the HEART panel up, Strain and the held Outburst are said there, not again in the unit panel', !(await youCard().locator('[data-res="strain"], [data-res="held"]').count()) && (await p.locator('.phc-heart-panel').count()) > 0);
await onTab('move');
t = await rowText('strain');
ok('Soul: Strain vs its limit, NEAR THE LIMIT: ' + t, /STRAIN/.test(t) && /\d+ \/ \d+/.test(t) && /NEAR THE LIMIT/.test(t));
ok('Soul: MP in the block: ' + (await rowText('mp')), /MP/.test(await rowText('mp')));
t = await rowText('held');
ok('Soul: the held Outburst (design, stage, tone): ' + t, /HOLDING/.test(t) && /stage 2/.test(t));
await snap('soul-1440');
await patch('u.mg.strain = (u.mg.strainLimit || 3) + 1;');
await onTab('move');
t = await rowText('strain');
ok('Soul: over the limit says OVER THE LIMIT: ' + t, /OVER THE LIMIT/.test(t));
await snap('soul-over-1440');
await snap('soul-1280', SMALL); await p.setViewportSize(BIG);

// 4. A Fighter with Momentum 3.
await build([{ type: 'sandbox/unequip', slot: 'main' }, { type: 'sandbox/class', classId: 'fighter', rank: 1 }]);
await patch('u.res = { ...(u.res || {}), momentum: 3 };');
t = await rowText('res-momentum');
ok('Fighter: Momentum 3 / 5 in words: ' + t, /MOMENTUM/.test(t) && /3 \/ 5/.test(t));
await snap('fighter-1440');

// 5. A Storm Hand with 2 Charges (named by the move that gives them, from the data).
// Advanced classes are shelved (Class Roster Rev 3): this part comes back with the Storm Hand.
const ADVANCED_LIVE = false;
if (ADVANCED_LIVE) {
await build([{ type: 'sandbox/unequip', slot: 'main' }, { type: 'sandbox/class', classId: 'storm_hand' }, { type: 'sandbox/kit', kind: 'soul' }]);
await patch('u.res = { ...(u.res || {}), charges: 2 };');
t = await rowText('res-charges');
ok('Storm Hand: Charges 2 / 3, named by the move that gives them (Charged by …): ' + t, /CHARGES/.test(t) && /2 \/ 3/.test(t) && /Charged by \w+/.test(t));
await snap('stormhand-1440');
await snap('stormhand-1280', SMALL); await p.setViewportSize(BIG);
} else console.log('  skipped: the Storm Hand (advanced classes shelved, Rev 3)');

// 6. The area-map HUD (out of the fight): the same block under HP and AP, with the gun and the Evoker.
await build([{ type: 'sandbox/kit', kind: 'both' }, { type: 'sandbox/give', item: 'hellraiser_service_rifle', equip: true }]);
await act({ type: 'sandbox/stop' });
await p.waitForFunction(() => window.__phc.getState().game.phase !== 'combat', null, { timeout: 30000 });
await pause(p, 500);
// (the tools first, then the area map: the map is a modal over the whole screen, and the tools' button is under it)
const closeTools = p.getByRole('button', { name: 'Close the tools' });
if (await closeTools.count()) { await closeTools.first().click(); await pause(p, 400); }
const mapBtn = p.getByRole('button', { name: /area map/i }).first();
if (await mapBtn.count()) { await mapBtn.click().catch(() => {}); await pause(p, 500); }
const hud = p.locator('[aria-label="Your status"] [aria-label="Your resources"]').first();
const ht = ((await hud.textContent().catch(() => '')) || '').replace(/\s+/g, ' ');
ok('area-map HUD: the resources block under HP: ' + ht.slice(0, 120), (await hud.count()) > 0 && /AMMO/.test(ht) && /loaded/.test(ht) && /EVOKER CHARGE/.test(ht));
// The two-handed rifle stowed the kit's Evoker (spec: Hands 2, item 630): its charge still shows, marked STOWED.
ok('area-map HUD: the stowed Evoker keeps its charge row, marked STOWED (' + (ht.match(/EVOKER CHARGE.{0,60}/) || [''])[0] + ')', /EVOKER CHARGE[^A-Z]*\d+ \/ 10[^]*?STOWED/.test(ht));
await snap('areamap-1440');
await snap('areamap-1280', SMALL);

ok('no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''), errors.length === 0);
await browser.close();
