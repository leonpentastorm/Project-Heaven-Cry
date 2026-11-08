// The Grand Sigilist's Grand forms on the ground (Proving Ground fight, no Narrator): a Grand Sigilist plants the staff
// for FIRE, WARD, VEIL and MEND (one of each look family: an element field, the grid, the mist, the ripple); each time
// the 5×5 is drawn tile by tile (ambient looks, the tint, the edge ring, the ◎ staff badge, the form in the tooltip),
// the planting plays its effect, the legend gains "Grand form", and pulling the staff out clears it all.
// Screenshots with SHOTS=dir: grand-*.png.
import { chromium, click, BASE } from './lib.mjs';
// Advanced classes are shelved (Class Roster Rev 3): this suite comes back with the Grand Sigilist (Intelligence squared).
const ADVANCED_LIVE = false;
if (!ADVANCED_LIVE) { console.log('skipped: the Grand Sigilist (advanced classes shelved, Rev 3)'); process.exit(0); }
const browser = await chromium.launch();
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const SHOTS = process.env.SHOTS;
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { localStorage.setItem('phc.voice', JSON.stringify({ auto: false })); localStorage.setItem('phc.tips', '["*"]'); sessionStorage.setItem('phc.pressedAnyKey', '1'); } catch { /* */ } });
const p = await ctx.newPage();
const errors = []; p.on('pageerror', (e) => errors.push(e.message));
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const st = () => p.evaluate(() => { const g = window.__phc.getState().game, cb = g.combat, c = Object.values(g.characters)[0]; const u = cb && cb.units.find((x) => x.charId === c.id); return { cid: c.id, u, cb: !!cb }; });

await p.goto(BASE);
await click(p, 'PROVING GROUND', { timeout: 90000 });
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 8000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 8000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, /^(Solo|To the Proving Ground) ›/); }
await p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 15000 });
let s = await st();
for (const a of [{ type: 'sandbox/ai', on: false }, { type: 'sandbox/class', charId: s.cid, classId: 'grand_sigilist' }, { type: 'sandbox/unequip', charId: s.cid, slot: 'main' },
  { type: 'sandbox/give', charId: s.cid, item: 'evoker' }, { type: 'sandbox/give', charId: s.cid, item: 'standard_core', qty: 6 }]) { const e = await act(a); if (e) console.log('  ', a.type, e); }
for (const w of ['fire', 'ward', 'veil', 'mend']) await act({ type: 'sandbox/learn', charId: s.cid, word: w });

async function plant(word) {
  await act({ type: 'sandbox/stop' }); await p.waitForTimeout(300);
  const e0 = await act({ type: 'sandbox/fight' }); if (e0) console.log('   fight', e0);
  await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 15000 });
  await p.waitForFunction(() => { const g = window.__phc.getState().game, cb = g.combat; const u = cb && cb.units.find((x) => x.id === cb.order[cb.turn]); return u && u.side === 'pc'; }, null, { timeout: 15000 });
  await p.waitForTimeout(900);
  for (let i = 0; i < 4 && (await p.locator('[data-phc-cutin]').count()); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(400); }
  s = await st();
  if ((s.u.mg?.charge || 0) < 3) { const e = await act({ type: 'combat/core', unitId: s.u.id }); if (e) console.log('   core', e); }
  s = await st();
  const err = await act({ type: 'combat/perk', unitId: s.u.id, id: 'grand_sigilist.enlarge', tile: s.u.pos, choice: word });
  await p.waitForTimeout(1500);
  return { err, staff: s.u.pos };
}
const ref = (k) => String.fromCharCode(65 + Number(k.split(',')[0])) + (Number(k.split(',')[1]) + 1);

for (const word of ['fire', 'ward', 'veil', 'mend']) {
  const r = await plant(word);
  ok(`${word.toUpperCase()}: the staff is planted at ${ref(r.staff)} (${r.err || 'ok'})`, !r.err);
  const look = await p.evaluate((w) => ({ nodes: document.querySelectorAll('[data-grand="' + w + '"]').length, staff: document.querySelectorAll('[data-grand="' + w + '"][data-where="staff"]').length,
    edge: document.querySelectorAll('[data-grand="' + w + '"][data-where="edge"]').length, badge: [...document.querySelectorAll('.phc-grid *')].some((x) => x.children.length === 0 && new RegExp('^◎ ' + w.toUpperCase() + ' \\d+$').test(x.textContent.trim())),
    tip: [...document.querySelectorAll('.phc-grid [title], .phc-grid [aria-label]')].some((x) => /Grand /.test(x.getAttribute('title') || x.getAttribute('aria-label') || '')),
    legend: /Grand form/.test(document.body.textContent) }), word);
  ok(`${word.toUpperCase()}: drawn tile by tile (${look.nodes} looks, the staff, ${look.edge} edge tiles), the ◎ badge, the tooltip and the legend`, look.nodes >= 9 && look.staff === 1 && look.edge >= 5 && look.badge && look.tip && look.legend);
  if (SHOTS) { await p.locator('.phc-grid').screenshot({ path: SHOTS + '/grand-' + word + '.png' }); }
}
// Pulling the staff out ends the form: the looks and the badge go.
s = await st();
const pe = await act({ type: 'combat/perk', unitId: s.u.id, id: 'grand_sigilist.enlarge', actionId: 'pull_staff' });
await p.waitForTimeout(600);
ok('pulling the staff out clears the form (' + (pe || 'ok') + ')', !pe && await p.evaluate(() => document.querySelectorAll('[data-grand]').length === 0));
console.log('errors', errors);
await browser.close();
