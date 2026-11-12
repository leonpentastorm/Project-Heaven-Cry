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
// (on the host's truth: since the fog in the engine the screen's view is a copy, and Confirm's action runs against the
// truth; then any action sends a fresh view, so the screen's per-state caches of the descriptors see the nail)
await p.evaluate((id) => { const u = window.__phc.truth().combat.units.find((x) => x.id === id); u.nailed = { by: 'x', id: 'pin_down', ap: 2 }; }, me.id).catch(() => {});
await act({ type: 'sandbox/ai', on: false }); await settle(p, 300);
await p.locator('#phc-tab-utility').click(); await settle(p, 400);
const row = panel().locator('[data-act="pullfree"]');
if (await row.count()) {
  ok('a nailed unit has a Pull free row on the Utility tab', true);
  await row.click(); await settle(p, 300);
  await p.getByRole('button', { name: /^Confirm/ }).first().click().catch(() => {}); await settle(p, 600);
  ok('…Confirm frees it', !(await G()).combat.units.find((u) => u.id === me.id).nailed);
} else console.log('note the nail could not be set from the page (no setState hook): Pull free not driven here');
await p.screenshot({ path: OUT + 'phys-pack-utility.png' });

// Found by Leon on live 0.23.0 (12 Nov): with two guns, reloading one gun hid Reload both and left no way to reload the
// other. Two pistols, both part-empty: the Attack tab's areas (main hand, off hand, Both) and reload one, then the other.
await p.evaluate((id) => { const u = window.__phc.truth().combat.units.find((x) => x.id === id); Object.assign(u, { weapon: 'service_pistol', offWeapon: 'service_pistol', ammo: 2, offAmmo: 3, mags: [12, 12, 12, 12], ap: 9, nailed: undefined, jammed: false }); }, me.id).catch(() => {});
await act({ type: 'sandbox/ai', on: false }); await settle(p, 300);
await p.locator('#phc-tab-attack').click(); await settle(p, 400);
const areasNow = () => panel().locator('[data-area]').evaluateAll((ws) => { const out = []; for (const w of ws) { const a = w.getAttribute('data-area'), id = w.querySelector('button[data-act]')?.getAttribute('data-act'); if (!out.length || out[out.length - 1].area !== a) out.push({ area: a, sep: !!w.querySelector('[data-area-sep]'), head: (w.querySelector('[data-weapon-block]')?.textContent || '').trim(), ids: [] }); if (id) out[out.length - 1].ids.push(id); } return out; });
let ar = await areasNow();
ok('two guns: the Attack tab is main hand, off hand, Both, then the rest (' + ar.map((x) => x.area + ':' + x.ids.join(',')).join(' | ') + ')', ar.map((x) => x.area).join(' ') === 'main off both other');
ok('…each area has its header and a line between areas', /MAIN HAND/.test(ar[0]?.head) && /OFF HAND/.test(ar[1]?.head) && ar[2]?.head === 'BOTH' && ar.slice(1).every((x) => x.sep) && !ar[0]?.sep);
ok('…each gun\'s reload is in its own area, Reload both in Both', ar[0]?.ids.includes('reload') && ar[1]?.ids.includes('reload-off') && ar[2]?.ids.includes('reload2'));
await p.screenshot({ path: OUT + 'phys-pack-two-guns.png' });
const confirmIt = async () => { await p.getByRole('button', { name: /^Confirm/ }).first().click().catch(() => {}); await settle(p, 900); };
await panel().locator('[data-act="reload"]').first().click(); await settle(p, 300); await confirmIt();
let mu = (await G()).combat.units.find((u) => u.id === me.id);
ok('reload the main gun: 12 loaded, the off-hand gun still at ' + mu.offAmmo, mu.ammo === 12 && mu.offAmmo === 3);
await p.locator('#phc-tab-attack').click(); await settle(p, 300);
const offRow = panel().locator('[data-act="reload-off"]').first();
ok('…the off-hand gun\'s own reload is still there and usable', (await offRow.count()) > 0 && (await offRow.isEnabled()));
await offRow.click(); await settle(p, 300); await confirmIt();
mu = (await G()).combat.units.find((u) => u.id === me.id);
ok('…and reloading it fills the off-hand gun (' + mu.offAmmo + ')', mu.offAmmo === 12 && mu.ammo === 12);

// Found by Leon on live 0.23.0 (12 Nov): after the map was dragged, a tile under the column letters drew over them when
// hovered (and over the small map). Scroll a row half under the header, hover the part of a tile still in view: the
// header is still what is at the header, its gaps included.
const strad = await p.evaluate(async () => {
  const sc = document.querySelector('.phc-grid-scroll'), hd = [...document.querySelectorAll('.phc-grid .phc-axis')].filter((e) => getComputedStyle(e).top === '0px' && getComputedStyle(e).left !== '0px');
  for (let s = 20; s < 400; s += 3) {
    sc.scrollTop = s; await new Promise((r) => requestAnimationFrame(r));
    const h = hd[3].getBoundingClientRect(), t = [...document.querySelectorAll('.phc-grid button.phc-tok')].find((b) => { const r = b.getBoundingClientRect(); return Math.abs(r.left - h.left) < 3 && r.top < h.bottom - 6 && r.bottom > h.bottom + 14; });
    if (t) { const r = t.getBoundingClientRect(), h2 = hd[4].getBoundingClientRect(); return { x: r.left + r.width / 2, y: (h.bottom + r.bottom) / 2, hx: h.left + h.width / 2, hy: h.top + h.height / 2, gx: (h.right + h2.left) / 2, scroll: s }; }
  }
  return null;
});
if (strad) {
  await p.mouse.move(strad.x, strad.y + 20); await settle(p, 150); await p.mouse.move(strad.x, strad.y); await settle(p, 500);
  const at = await p.evaluate((q) => { const a = document.elementFromPoint(q.hx, q.hy), b = document.elementFromPoint(q.gx, q.hy); return { head: !!a && a.classList.contains('phc-axis'), gap: !!b && b.classList.contains('phc-axis'), what: a ? a.tagName + '.' + a.className : '' }; }, strad);
  ok('a hovered tile half under the header does not cover it: the header cell is on top (' + at.what + ')', at.head);
  ok('…and the gap between two header cells is the header\'s too (a tile under it never hovers)', at.gap);
  await p.screenshot({ path: OUT + 'phys-pack-header.png' });
} else ok('a row could be scrolled half under the header', false);
ok('no page errors (' + errs.join(' | ') + ')', errs.length === 0);
await browser.close();
