// A save from before 0.19.0 holding perks that were renamed since (Grapple, Origami Hands) and one that never existed:
// the game must open it, show the renamed perks, and not crash (0.19.0 crashed on start for such a save).
import { chromium, player, click, BASE, settle } from './lib.mjs';
const browser = await chromium.launch(); const p = await player(browser, 'host');
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const errors = []; p.on('pageerror', (e) => errors.push(String(e.message || e)));
await p.goto(BASE); await click(p, 'PROVING GROUND');
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 8000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 8000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
await p.waitForFunction(() => window.__phc.getState().game?.sandbox?.state === 'ready', null, { timeout: 30000 });
await p.evaluate(() => { const g = window.__phc.getState().game; window.__phc.act({ type: 'sandbox/perk', charId: Object.keys(g.characters)[0], perk: 'bulwark', tier: 'I' }); });
await settle(p, 600);
// rewrite the stored save the way an old build left it
const changed = await p.evaluate(() => { let n = 0;
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i), v = localStorage.getItem(k);
    try { const g = JSON.parse(v); if (!g || !g.characters) continue; for (const c of Object.values(g.characters)) { c.perks = [{ id: 'grapple', tier: 'II' }, { id: 'origami_hands', tier: 'I' }, { id: 'long_gone', tier: 'I' }, ...(c.perks || [])]; n++; } localStorage.setItem(k, JSON.stringify(g)); } catch { /* not a save */ } }
  return n; });
ok('an old-style save was written (' + changed + ' sheet)', changed > 0);
await p.reload(); await settle(p, 2500);
const body = await p.locator('body').innerText();
ok('the game opens the old save: no error screen', !/renderVals|TypeError|undefined is not/.test(body) && errors.length === 0);
const perks = await p.evaluate(() => { const g = window.__phc.getState().game; return g ? Object.values(g.characters)[0].perks.map((x) => x.id) : null; });
ok('the sheet holds the renamed perks: ' + JSON.stringify(perks), !!perks && perks.includes('iron_grip') && perks.includes('both_hands') && !perks.includes('grapple') && !perks.includes('long_gone'));
ok('no page errors: ' + errors.join(' | ').slice(0, 300), errors.length === 0);
await p.screenshot({ path: (process.env.SHOT || '/tmp/old-save') + '.png' });
await browser.close();
