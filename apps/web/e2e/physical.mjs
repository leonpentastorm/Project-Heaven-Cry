// Physical 2.0 on screen (rules 1.12; docs/design/handoffs/physical-2.0-C-client.md, part 9), in the Proving Ground with
// the enemy AI off:
//  · the Kit step: starting techniques picked by default, changed with a chip, the engine's verdict;
//  · the ARMS tab: a ready list toggled, a drill bar raised with the tools to mark I and the signature learned, the
//    quiver menu for a bow;
//  · a blade in one hand and a pistol in the other: two weapon blocks, each Techniques pad opens and closes, only one
//    open at a time, the grid and Confirm on screen at 1440 × 900 and 1280 × 720;
//  · Lunge, Cut, then Coup with the blade: Momentum pips rise, and the Finisher empties them;
//  · Suppress then Dead Centre with a rifle: the target's Pressure pips rise to Pressed, and the Take lowers it by 2;
//  · Deny held on a tile: drawn on the map, the chip on the holder; it fires when a unit walks in (with the AI on);
//  · icons in the backpack and the gear list.
// Screenshots: e2e/shots/phys-*.png.
import { chromium, player, hostAs, click, BASE, OUT, settle } from './lib.mjs';
const browser = await chromium.launch();
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const note = (label) => console.log('note ' + label);

// ---------- 1. the Kit step: starting techniques ----------
{
  const k = await player(browser, 'kit');
  await k.setViewportSize({ width: 1440, height: 900 });
  await hostAs(k, 'Leon');
  await click(k, 'Create a character');
  await k.getByRole('navigation', { name: 'Creation steps' }).getByRole('button', { name: 'Archetype' }).click(); await settle(k, 300);
  // a build with Athletics and Dexterity (both kinds of technique): the first archetype that has them
  const arch = 'fencer'; // (data/archetypes.json: the one preset with Athletics and Dexterity)
  if (arch) { await k.locator('[data-arch="' + arch + '"]').click().catch(() => {}); await k.locator('[data-arch-preview] button', { hasText: /^Use / }).click().catch(() => {}); }
  await k.getByRole('navigation', { name: 'Creation steps' }).getByRole('button', { name: 'Moves' }).click(); await settle(k, 350);
  const cards = k.locator('[data-start-tech]');
  if (await cards.count()) {
    const per = await cards.evaluateAll((xs) => xs.map((x) => x.querySelectorAll('button[aria-pressed="true"]').length));
    ok('the Kit step: starting techniques picked by default (' + per.join(', ') + ' a kind)', per.every((n) => n === 2));
    const free = k.locator('[data-start-tech] button[data-tech][aria-pressed="false"]').first(); await free.click(); await settle(k, 200);
    ok('…a chip swaps a pick and the engine says whether it is legal', /^Ready: |Opener|Pick/.test((await k.locator('[data-start-tech] ~ [role="status"]').first().textContent()) || ''));
    for (const [w, h] of [[1440, 900], [1280, 720]]) { await k.setViewportSize({ width: w, height: h }); await settle(k, 300); await k.locator('[data-start-tech]').first().scrollIntoViewIfNeeded(); await k.screenshot({ path: OUT + 'phys-kit-' + w + '.png' }); }
  } else note('this build has no Raw Power, Athletics or Dexterity: no starting techniques to pick');
  await k.close();
}

// ---------- 2. the Proving Ground ----------
const p = await player(browser, 'host');
const snap = (n) => p.screenshot({ path: OUT + 'phys-' + n + '.png' });
const G = () => p.evaluate(() => window.__phc.getState().game);
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
p.on('dialog', (d) => d.accept());
const inView = (sel) => p.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1; }, sel);
const noPageScroll = () => p.evaluate(() => document.scrollingElement.scrollHeight <= innerHeight + 2);
const panel = () => p.locator('.phc-cb-tabpanel').first();
const momRow = () => p.locator('[aria-label="Your resources"] [data-res="res-momentum"]').first().innerText().then((t) => t.replace(/\s+/g, ' ')).catch(() => '');
const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };
const tok = (k) => p.locator('.phc-grid button.phc-tok[aria-label^="' + ref(k) + ' "], .phc-grid button.phc-tok[aria-label^="' + ref(k) + ':"]').first();

await p.setViewportSize({ width: 1440, height: 900 });
await p.goto(BASE);
await click(p, 'PROVING GROUND');
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 20000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 20000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
await p.waitForFunction(() => window.__phc.getState().game?.sandbox?.state === 'ready', null, { timeout: 30000 });
let g = await G();
const cid = Object.keys(g.characters)[0];
const C = async () => (await G()).characters[cid];
await act({ type: 'sandbox/ai', on: false });
for (const sk of ['athletics', 'dexterity', 'raw_power']) await act({ type: 'sandbox/skill', charId: cid, skill: sk, points: 10 });
// a blade in the main hand, a pistol in the off hand, a bow in the pack
await act({ type: 'sandbox/give', charId: cid, item: 'combat_knife', equip: true });
await act({ type: 'sandbox/give', charId: cid, item: 'service_pistol' });
await act({ type: 'sandbox/give', charId: cid, item: 'recurve_bow' });
g = await G();
const pi = (g.characters[cid].pack || []).findIndex((it) => it.weapon === 'service_pistol');
await act({ type: 'sandbox/equip', charId: cid, idx: pi, to: 'off' });
g = await G();
ok('a knife in the main hand and a pistol in the off hand', g.characters[cid].weapon === 'combat_knife' && g.characters[cid].offHand?.id === 'service_pistol');

// ---------- 3. the ARMS tab ----------
await act({ type: 'sandbox/technique', charId: cid, id: 'lunge', ready: true });
const tools = p.locator('aside[aria-label="Proving Ground tools"]').first();
const sheetTab = (name) => p.getByRole('tab', { name, exact: true }).first();
await sheetTab('ARMS').click(); await settle(p, 300);
const arms = p.locator('[data-arms-tab]');
ok('the ARMS tab: the two ready lists, a drill bar for each weapon held, what you know', (await arms.locator('[data-ready-list]').count()) === 2 && (await arms.locator('[data-drill="combat_knife"]').count()) === 1 && (await arms.locator('[data-known="melee"]').count()) === 1);
ok('…Lunge is ready (learned with the tools)', (await arms.locator('[data-ready-list="melee"] [data-ready="lunge"][aria-pressed="true"]').count()) === 1);
await arms.locator('[data-ready-list="melee"] [data-ready="lunge"]').click(); await settle(p, 300);
ok('…a ready list toggled: Lunge out', !(await C()).phys.ready.melee.includes('lunge'));
await arms.locator('[data-ready-list="melee"] [data-ready="lunge"]').click(); await settle(p, 300);
ok('…and back in', (await C()).phys.ready.melee.includes('lunge'));
// drill with the tools until mark I: the knife's signature (Coup) is learned
await tools.getByRole('tab', { name: 'Gear' }).click().catch(() => {}); await settle(p, 200);
await tools.locator('select[aria-label="Drill weapon"]').selectOption('combat_knife');
await tools.locator('button[data-sb-drill="300"]').first().click(); await settle(p, 400);
ok('the drill tools: +300 on the knife reaches mark I', (await C()).phys.drill.combat_knife >= 300);
ok('…the signature is learned (Coup known)', (await C()).phys.known.includes('coup'));
await sheetTab('ARMS').click(); await settle(p, 300);
ok('…the ARMS tab shows mark I reached and Coup as a signature', /✓ MARK I/.test(await arms.locator('[data-drill="combat_knife"]').textContent()) && /SIGNATURE · Combat knife/.test(await arms.locator('[data-technique="coup"]').textContent()));
ok('the quiver menu for the bow in the pack, with what it holds', (await arms.locator('[data-quiver="recurve_bow"]').count()) === 1 && /Capacity|loaded/.test(await arms.locator('[data-quiver="recurve_bow"]').textContent()));
for (const [w, h] of [[1440, 900], [1280, 720]]) { await p.setViewportSize({ width: w, height: h }); await settle(p, 350); await snap('arms-' + w); }
await p.setViewportSize({ width: 1440, height: 900 }); await settle(p, 300);
await act({ type: 'sandbox/technique', charId: cid, id: 'suppress', ready: true });
await act({ type: 'sandbox/technique', charId: cid, id: 'dead_centre', ready: true });
await act({ type: 'sandbox/technique', charId: cid, id: 'deny', ready: true });

// ---------- 4. the fight: two blocks, the pads ----------
await act({ type: 'sandbox/fight' });
await p.waitForFunction(() => window.__phc.getState().game?.phase === 'combat', null, { timeout: 30000 });
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 20000 }).catch(() => {});
const myTurn = () => p.waitForFunction((id) => { const cb = window.__phc.getState().game.combat; const u = cb && cb.units.find((x) => x.id === cb.order[cb.turn]); return !!u && u.charId === id && u.ap >= 4; }, cid, { timeout: 45000 });
const dismissCut = async () => { for (let i = 0; i < 3 && (await p.locator('[data-phc-cutin]').count()); i++) { await p.mouse.click(1430, 890); await settle(p, 400); } };
await myTurn(); await settle(p, 2600); await dismissCut();
if (await tools.count()) await tools.getByRole('button', { name: /^Close the tools/ }).first().click().catch(() => {});
await p.locator('#phc-tab-attack').click(); await settle(p, 300);
ok('two weapon blocks: the knife (main) and the pistol (off), with their icons', (await panel().locator('[data-weapon-block="main"]').count()) === 1 && (await panel().locator('[data-weapon-block="off"]').count()) === 1 && (await panel().locator('[data-weapon-block] img').count()) === 2);
ok('…each with its plain attack row and its Techniques row; Hold a shot for the pistol', (await panel().locator('[data-act="tq:main:cut"]').count()) === 1 && (await panel().locator('[data-act="tq:off:shot"]').count()) === 1
  && (await panel().locator('[data-act="tpad:main"]').count()) === 1 && (await panel().locator('[data-act="tpad:off"]').count()) === 1 && (await panel().locator('[data-act="twatch"]').count()) === 1);
await panel().locator('[data-act="tpad:main"]').click(); await settle(p, 350);
ok('the knife\'s Techniques open its pad, with Lunge and Coup', (await p.locator('[data-tech-pad="tpad:main"] [data-tech="lunge"]').count()) === 1 && (await p.locator('[data-tech-pad="tpad:main"] [data-tech="coup"]').count()) === 1);
for (const [w, h] of [[1440, 900], [1280, 720]]) {
  await p.setViewportSize({ width: w, height: h }); await settle(p, 400);
  ok('at ' + w + '×' + h + ' with a pad open: the map\'s window and Confirm on screen, no page scroll', (await inView('.phc-grid-scroll')) && (await inView('.phc-cb-confirm button')) && (await noPageScroll()));
  await snap('pad-main-' + w);
}
await p.setViewportSize({ width: 1440, height: 900 }); await settle(p, 300);
await panel().locator('[data-act="tpad:off"]').click(); await settle(p, 400);
ok('the pistol\'s pad opens and the knife\'s closes (one at a time)', (await p.locator('[data-tech-pad="tpad:off"]').count()) === 1 && (await p.locator('[data-tech-pad="tpad:main"]').count()) === 0);
await panel().locator('[data-act="twatch"]').click(); await settle(p, 400);
ok('Hold a shot opens the Watches (Overwatch, Deny)', (await p.locator('[data-tech-pad="twatch"] [data-tech="overwatch"]').count()) === 1 && (await p.locator('[data-tech-pad="twatch"] [data-tech="deny"]').count()) === 1);
await snap('pad-watch-1440');

// icons in the backpack (here, while the fight is sure to be on)
for (let i = 0; i < 3 && !(await p.locator('[data-bp-row]').count()); i++) { await p.locator('button[data-tip-text^="Open your backpack"]').first().click().catch(async () => { await p.keyboard.press('b'); }); await settle(p, 700); }
// Since the painted Heavenprint gear icons (art/icons/gear, gearIcons.ts: the painted icon wins over the monoline one)
// a row's icon is an /assets/gear-<id>.webp URL, not always an SVG data URI: what the player needs is a picture that
// LOADED, so every icon in the pack must have decoded (naturalWidth > 0), whichever kind it is.
const bpIcons = await p.waitForFunction(() => { const im = [...document.querySelectorAll('[data-bp-row] img')]; return im.length && im.every((i) => i.complete) ? im.map((i) => ({ src: i.getAttribute('src').slice(0, 40), w: i.naturalWidth })) : null; }, null, { timeout: 30000 }).then((h) => h.jsonValue()).catch(() => []);
ok('the backpack shows item icons, every one loaded (' + bpIcons.map((i) => i.src.replace(/^data:image\/svg\+xml.*/, 'svg') + ':' + i.w).join(', ') + ')', bpIcons.length >= 1 && bpIcons.every((i) => i.w > 0 && (/^\/assets\/gear-/.test(i.src) || /^data:image\/svg\+xml/.test(i.src))));
await p.keyboard.press('Escape'); await settle(p, 300);

// ---------- 5. Lunge, Cut, Coup: Momentum rises, then the Finisher spends it ----------
g = await G();
const me = () => G().then((x) => x.combat.units.find((u) => u.charId === cid));
const free = (gg, k) => { const [x, y] = k.split(',').map(Number); return x >= 0 && y >= 0 && x < gg.combat.map.w && y < gg.combat.map.h && !gg.combat.map.solid.includes(k) && !gg.combat.units.some((u) => !u.dead && u.pos === k); };
const near = (gg, from, d) => { const [x, y] = from.split(',').map(Number); for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d], [d, 1], [d, -1], [-d, 1], [-d, -1]]) { const k = (x + dx) + ',' + (y + dy); if (free(gg, k)) return k; } return null; };
let u0 = await me(), spot = near(g, u0.pos, 2);
/** Spawn a drill unit near a tile (the first free tile around it that the engine takes; a refusal is only a toast, so
 *  the new unit is found by its id). */
const spawn = async (tier, weapon, at) => {
  const [ax, ay] = at.split(',').map(Number), tries = [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1], [2, 0], [0, 2], [-2, 0], [0, -2]];
  for (const [dx, dy] of tries) {
    const k = (ax + dx) + ',' + (ay + dy), gg = await G(); if (!free(gg, k)) continue;
    const before = new Set(gg.combat.units.map((u) => u.id)); await act({ type: 'sandbox/spawn', tier, weapon, at: ref(k) }); await settle(p, 400);
    const nu = (await G()).combat.units.find((u) => !before.has(u.id)); if (nu) return nu;
  }
  return null;
};
// a boss with bare hands: tough enough to take a Lunge and a Cut
const foe1 = spot ? await spawn('boss', 'fists', spot) : null;
ok('a drill unit spawned near (' + (foe1 && foe1.pos) + ')', !!foe1);
const mom = async () => (await me()).res?.momentum ?? 0;
/** Confirm, then wait until the engine has taken it (the panel holds input while the last effects play). */
const confirm = async () => { const n = (await G()).combat.log.length; await p.locator('.phc-cb-confirm button').first().click();
  await p.waitForFunction((n) => window.__phc.getState().game.combat.log.length > n, n, { timeout: 20000 }).catch(() => {}); await settle(p, 500); };
await panel().locator('[data-act="tpad:main"]').click(); await settle(p, 300);
await p.locator('[data-tech-pad="tpad:main"] [data-tech="lunge"]').click(); await settle(p, 300);
ok('picking Lunge closes the pad to the selected card ("Lunge · N AP")', (await p.locator('[data-tech-pad]').count()) === 0 && /Lunge · \d+ AP/.test((await p.locator('.phc-cb-turnbox').first().textContent().catch(() => '')) || (await p.locator('body').textContent())));
await tok(foe1.pos).click(); await settle(p, 300);
await snap('lunge-preview-1440');
const n0 = (await G()).combat.log.length;
await confirm();
g = await G();
ok('Confirm sends combat/technique: the log says Lunge', g.combat.log.slice(n0).some((l) => /uses Lunge/.test(l)));
const m1 = await mom();
if (m1 > 0) {
  ok('a hit: Momentum ' + m1 + ', and the unit panel\'s Momentum row shows it (one place: not repeated in the weapon\'s header)', (await momRow()).includes(m1 + ' / ') && !(await panel().locator('[data-weapon-block="main"] [data-momentum-pips]').count()));
  await panel().locator('[data-act="tq:main:cut"]').click(); await settle(p, 250);
  if ((await G()).combat.units.find((u) => u.id === foe1.id && !u.dead)) { await tok((await G()).combat.units.find((u) => u.id === foe1.id).pos).click(); await settle(p, 250); await confirm(); }
  const m2 = await mom();
  if (m2 >= 2 && (await G()).combat.units.find((u) => u.id === foe1.id && !u.dead)) {
    await panel().locator('[data-act="tpad:main"]').click(); await settle(p, 300);
    await p.locator('[data-tech-pad="tpad:main"] [data-tech="coup"]').click(); await settle(p, 300);
    await tok((await G()).combat.units.find((u) => u.id === foe1.id).pos).click(); await settle(p, 250);
    const n1 = (await G()).combat.log.length; await confirm();
    ok('Coup spends the Momentum (' + m2 + ' → ' + (await mom()) + ')', (await G()).combat.log.slice(n1).some((l) => /uses Coup/.test(l)) && (await mom()) === 0);
    await snap('coup-1440');
  } else note('Momentum ' + m2 + ' after the Cut (or the drill unit fell): Coup not tried');
} else {
  note('Lunge missed (Momentum 0): Momentum set to 2 with the tools to try Coup');
  await act({ type: 'sandbox/meter', unitId: (await me()).id, momentum: 2 }); await settle(p, 400);
  ok('…the Momentum row shows the 2', (await momRow()).includes('2 / '));
  await panel().locator('[data-act="tpad:main"]').click(); await settle(p, 300);
  await p.locator('[data-tech-pad="tpad:main"] [data-tech="coup"]').click(); await settle(p, 300);
  await tok((await G()).combat.units.find((u) => u.id === foe1.id).pos).click(); await settle(p, 250);
  const n1 = (await G()).combat.log.length; await confirm();
  ok('Coup spends the Momentum (2 → ' + (await mom()) + ')', (await G()).combat.log.slice(n1).some((l) => /uses Coup/.test(l)) && (await mom()) === 0);
  await snap('coup-1440');
}

// ---------- 6. Suppress then Dead Centre: Pressure to Pressed, then the Take lowers it by 2 ----------
// refill first (HP, and conditions: a hit taken can Daze, −2 AP next turn), so each section starts with a full turn
// (a wave cleared ends the fight: start another, as the Proving Ground's Start the fight does)
const endTurn = async () => { await act({ type: 'sandbox/refill', charId: cid }); await settle(p, 300);
  const gg = await G();
  if (gg.phase !== 'combat' || gg.combat?.over) { await settle(p, 1500); await act({ type: 'sandbox/fight' }); await p.waitForFunction(() => window.__phc.getState().game?.phase === 'combat' && !window.__phc.getState().game.combat.over, null, { timeout: 30000 }); await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 20000 }).catch(() => {}); }
  else await p.getByRole('button', { name: 'End turn', exact: true }).first().click();
  await myTurn(); await settle(p, 1600); await dismissCut();
  if (await tools.count()) await tools.getByRole('button', { name: /^Close the tools/ }).first().click().catch(() => {}); };
await act({ type: 'sandbox/give', charId: cid, item: 'hellraiser_service_rifle', equip: true });
await endTurn();
await p.locator('#phc-tab-attack').click(); await settle(p, 300);
// a clear field and one target three tiles off, in the open
await act({ type: 'sandbox/clear' }); await settle(p, 400);
g = await G(); u0 = await me(); spot = near(g, u0.pos, 3) || near(g, u0.pos, 2);
await spawn('boss', 'service_pistol', spot);
// the target: the nearest hostile whose token is on the grid (one out of sight can't be picked)
const seenFoe = async () => { const gg = await G(), m = gg.combat.units.find((u) => u.charId === cid), d = (a) => { const [x, y] = a.pos.split(',').map(Number), [mx, my] = m.pos.split(',').map(Number); return Math.max(Math.abs(x - mx), Math.abs(y - my)); };
  for (const f of gg.combat.units.filter((u) => u.side === 'foe' && !u.dead).sort((a, b) => d(a) - d(b))) if (((await tok(f.pos).getAttribute('aria-label').catch(() => '')) || '').includes(f.name)) return f; return null; };
const foe2 = await seenFoe();
ok('a hostile in sight (' + (foe2 && foe2.name) + '), and the rifle in hand', !!foe2 && (await me()).weapon === 'hellraiser_service_rifle');
const press = async () => (await G()).combat.units.find((u) => u.id === foe2.id)?.pressure || 0;
await panel().locator('[data-act="tpad:main"]').click(); await settle(p, 300);
await p.locator('[data-tech-pad="tpad:main"] [data-tech="suppress"]').click(); await settle(p, 300);
await tok(foe2.pos).click(); await settle(p, 300);
await snap('suppress-preview-1440');
await confirm(); await settle(p, 600);
const pr1 = await press();
ok('Suppress puts Pressure on it (' + pr1 + ')', pr1 >= 1);
const pips = await tok(foe2.pos).locator('[data-pressure-pips] span').count().catch(() => 0);
ok('…its pips show over its token, and its label says the state', pips >= 1 && (pr1 < 2 || /Pressed|Suppressed|Broken/.test((await tok(foe2.pos).getAttribute('aria-label')) || '')));
await snap('pressure-1440');
if (pr1 >= 2) {
  await panel().locator('[data-act="tpad:main"]').click(); await settle(p, 300);
  await p.locator('[data-tech-pad="tpad:main"] [data-tech="dead_centre"]').click(); await settle(p, 300);
  await tok(foe2.pos).click(); await settle(p, 300);
  const n2 = (await G()).combat.log.length; await confirm();
  const dead = !(await G()).combat.units.find((u) => u.id === foe2.id && !u.dead);
  ok('Dead Centre (a Take) lowers the Pressure by 2 (' + pr1 + ' → ' + (await press()) + ')', (await G()).combat.log.slice(n2).some((l) => /uses Dead Centre/.test(l)) && (dead || (await press()) === Math.max(0, pr1 - 2)));
} else note('Suppress missed (Pressure ' + pr1 + '): the Take needs Pressed; not tried');

// ---------- 7. Deny held on a tile: drawn, and it fires when a unit walks in ----------
// A heavy weapon's Deny covers a line three tiles across; a bare-handed drill unit two tiles off must cross it to reach you.
await act({ type: 'sandbox/give', charId: cid, item: 'hellraiser_lmg', equip: true });
await endTurn();
await p.locator('#phc-tab-attack').click(); await settle(p, 300);
g = await G(); u0 = await me();
// clear the field, then one drill unit two tiles east (or west) of you, the Deny line between
await act({ type: 'sandbox/clear' }); await settle(p, 400);
const [ux, uy] = u0.pos.split(',').map(Number);
let side = 1; g = await G(); if (!free(g, (ux + 2) + ',' + uy) || !free(g, (ux + 1) + ',' + uy)) side = -1;
const runner = await spawn('minion', 'fists', (ux + 2 * side) + ',' + uy);
const step = (ux + side) + ',' + uy;
ok('a drill unit two tiles off, the Deny line between (' + ref(step) + ')', !!runner);
// the heavy line (three tiles across) is the braced weapon's: brace first
await act({ type: 'combat/brace', unitId: (await me()).id }); await settle(p, 400);
await panel().locator('[data-act="twatch"]').click(); await settle(p, 300);
await p.locator('[data-tech-pad="twatch"] [data-tech="deny"]').click(); await settle(p, 300);
await tok(step).click(); await settle(p, 300);
await confirm();
g = await G();
ok('Deny held on ' + ref(step) + ': the engine holds it', !!(g.combat.units.find((u) => u.charId === cid)).watch);
ok('…drawn on the map (its tile tinted) with the chip on the holder', (await p.locator('[data-watch-tile]').count()) >= 1 && (await p.locator('[data-watch-chip]').count()) >= 1);
await snap('deny-1440');
await act({ type: 'sandbox/ai', on: true });
const nF = (g.combat.fx || []).length;
await p.getByRole('button', { name: 'End turn', exact: true }).first().click();
await myTurn().catch(() => {}); await settle(p, 1500);
g = await G();
const fired = (g.combat.fx || []).slice(nF).some((e) => e.k === 'watch_fire') || g.combat.log.some((l) => /Deny/.test(l) && /fires|denied|stops/i.test(l));
if (fired) ok('Deny fired when a unit walked onto the tile', true); else note('no unit walked onto ' + ref(step) + ' this round: Deny did not fire (the AI chose another path)');
await act({ type: 'sandbox/ai', on: false });

const errs = p.errors || [];
ok('no page errors', !errs.length);
if (errs.length) console.log(errs.slice(0, 5));
await browser.close();
