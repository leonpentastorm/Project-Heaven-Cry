// Bows and quivers on screen (rules 1.53; docs/design/handoffs/bows-quivers.md), in the Proving Ground with the enemy
// AI off: an archer with two quivers, the ready one enchanted (Ember):
//  · the ARMS tab: two quiver cards, WORN and READY, what each holds, the enchantment's mark in words;
//  · no Nock an arrow anywhere; the Attack tab's reload for the bow is Switch quiver, at a reload's price;
//  · Switch quiver: the enchanted quiver is worn, its arrows counted on the Quiver row;
//  · a shot from it: the arrow's hit carries the element (the shot's fx event names fire) and the target Burns.
// Screenshots: e2e/shots/quivers-*.png.
import { chromium, player, click, BASE, OUT, settle } from './lib.mjs';
const browser = await chromium.launch();
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const p = await player(browser, 'host');
const G = () => p.evaluate(() => window.__phc.getState().game);
const T = () => p.evaluate(() => JSON.parse(JSON.stringify(window.__phc.truth()))); // the host's whole state (no fog)
const act = (a) => p.evaluate(async (a) => { try { await window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const panel = () => p.locator('.phc-cb-tabpanel').first();
p.on('dialog', (d) => d.accept());
await p.setViewportSize({ width: 1440, height: 900 });
await p.goto(BASE);
await click(p, 'PROVING GROUND');
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 20000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 20000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
await p.waitForFunction(() => window.__phc.getState().game?.sandbox?.state === 'ready', null, { timeout: 30000 });
let g = await G();
const cid = Object.keys(g.characters)[0];
await act({ type: 'sandbox/ai', on: false });
await act({ type: 'sandbox/skill', charId: cid, skill: 'dexterity', points: 10 });
await act({ type: 'sandbox/give', charId: cid, item: 'recurve_bow', equip: true });
// two quivers: the worn one plain with 3 arrows, the ready one enchanted (Ember) with 10 (set on the host's state, as the
// sandbox would after carrying, enchanting and loading them out of a fight)
await p.evaluate((id) => { const c = window.__phc.truth().characters[id]; c.quivers = [{ id: 'quiver', arrows: { standard: 3 } }, { id: 'quiver', mods: ['ench_fire'], arrows: { standard: 10 } }]; c.loaded = 3; }, cid);
await act({ type: 'sandbox/skill', charId: cid, skill: 'dexterity', points: 10 }); // an action, so the screens read the new state
g = await G();
ok('the character carries two quivers, the ready one enchanted', (g.characters[cid].quivers || []).length === 2 && g.characters[cid].quivers[1].mods?.[0] === 'ench_fire');

// ---------- the ARMS tab ----------
await p.getByRole('tab', { name: 'ARMS', exact: true }).first().click(); await settle(p, 400);
const arms = p.locator('[data-arms-tab]');
const q0 = arms.locator('[data-quiver="q0"]'), q1 = arms.locator('[data-quiver="q1"]');
ok('ARMS: two quiver cards, WORN and READY, each with what it holds', (await q0.count()) === 1 && (await q1.count()) === 1 && /WORN/.test(await q0.textContent()) && /READY/.test(await q1.textContent()) && /\/ 40 loaded/.test(await q0.textContent()));
ok('…the ready quiver shows its enchantment\'s mark in words', /EMBER ENCHANTMENT/.test((await q1.locator('[data-quiver-ench]').textContent().catch(() => '')) || ''));
ok('…a swap button out of a fight', (await arms.locator('[data-quiver-swap]').count()) === 1);
await p.screenshot({ path: OUT + 'quivers-arms.png' });

// ---------- the fight ----------
await act({ type: 'sandbox/fight' });
await p.waitForFunction(() => window.__phc.getState().game?.phase === 'combat', null, { timeout: 30000 });
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 20000 }).catch(() => {});
await p.waitForFunction((id) => { const cb = window.__phc.getState().game.combat; const u = cb && cb.units.find((x) => x.id === cb.order[cb.turn]); return !!u && u.charId === id && u.ap >= 4; }, cid, { timeout: 45000 });
await settle(p, 2600);
for (let i = 0; i < 3 && (await p.locator('[data-phc-cutin]').count()); i++) { await p.mouse.click(1430, 890); await settle(p, 400); }
const tools = p.locator('aside[aria-label="Proving Ground tools"]').first();
if (await tools.count()) await tools.getByRole('button', { name: /^Close the tools/ }).first().click().catch(() => {});
await p.locator('#phc-tab-attack').click(); await settle(p, 400);
const body = (await panel().textContent()) || '';
ok('no Nock an arrow on the Attack tab', !/Nock an arrow/.test(body));
const sw = panel().locator('[data-act="reload"]').first();
ok('the bow\'s reload is Switch quiver, at a reload\'s price (2 AP)', (await sw.count()) === 1 && /Switch quiver/.test(await sw.textContent()) && /2 AP/.test(await sw.textContent()));
await sw.hover().catch(() => {}); await settle(p, 500); await p.screenshot({ path: OUT + 'quivers-switch-card.png' });
await sw.click(); await settle(p, 300);
await p.getByRole('button', { name: /^Confirm/ }).first().click().catch(() => {}); await settle(p, 1200);
g = await G();
let me = g.combat.units.find((u) => u.charId === cid);
ok('Switch quiver: the Ember quiver is worn, its 10 arrows counted (' + me.ammo + ')', me.ammo === 10 && (me.quiverGear?.mods || []).includes('ench_fire') && me.quiverReady?.arrows?.standard === 3);
const row = p.locator('[data-res="ammo"], [data-res="res-ammo"]').first();
ok('…the Quiver row reads the worn quiver and its enchantment (' + ((await row.innerText().catch(() => '')) || '').replace(/\s+/g, ' ') + ')', /QUIVER/i.test((await row.innerText().catch(() => '')) || '') && /10 \/ 40/.test((await row.innerText().catch(() => '')) || ''));
await p.screenshot({ path: OUT + 'quivers-switched.png' });

// a shot from the enchanted quiver: make it land (the target's Defense down on the host's state), up to three tries
g = await T();
const foe = g.combat.units.find((u) => u.side !== me.side && !u.dead && !u.downed);
let hit = null;
for (let i = 0; i < 3 && !hit; i++) {
  await p.evaluate(([id, mid]) => { const cb = window.__phc.truth().combat, u = cb.units.find((x) => x.id === id), m = cb.units.find((x) => x.id === mid); u.def = -10; const [x, y] = m.pos.split(',').map(Number); u.pos = (x + 3) + ',' + y; }, [foe.id, me.id]); // in plain sight, 3 tiles off
  const err = await act({ type: 'combat/technique', unitId: me.id, id: 'shot', targetId: foe.id });
  if (err) { console.log('note the shot was refused: ' + err); break; }
  await settle(p, 1500);
  g = await T(); hit = (g.combat.fx || []).filter((e) => e.k === 'shot' && e.unit === me.id && e.hit).at(-1) || null;
}
console.log('note last shots: ' + JSON.stringify((g.combat.fx || []).filter((e) => e.k === 'shot').slice(-2)) + ' log: ' + g.combat.log.slice(-4).join(' | '));
ok('an enchanted arrow\'s hit: the shot names the element (fire) for its hit effect', !!hit && hit.element === 'fire');
const t = g.combat.units.find((u) => u.id === foe.id);
ok('…and the target Burns (the Fire tone\'s rider)', !!t && (t.dead || !!(t.conds && t.conds.burning) || !!t.burning));
await p.screenshot({ path: OUT + 'quivers-hit.png' });
await browser.close();
