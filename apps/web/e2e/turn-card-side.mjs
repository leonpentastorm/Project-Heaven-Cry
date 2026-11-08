// The turn card's side (Proving Ground fight, no Narrator): the customise dialog's CARD SIDE (Auto, Left, Right).
// Right: the next turn's card comes in on the right of the screen; Left: on the left; kept in the browser.
import { chromium, click, BASE } from './lib.mjs';
const browser = await chromium.launch();
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const SHOTS = process.env.SHOTS;
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { localStorage.setItem('phc.voice', JSON.stringify({ auto: false })); localStorage.setItem('phc.tips', '["*"]'); sessionStorage.setItem('phc.pressedAnyKey', '1'); } catch { /* */ } });
const p = await ctx.newPage();
const errors = []; p.on('pageerror', (e) => errors.push(e.message));
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);

await p.goto(BASE);
await click(p, 'PROVING GROUND', { timeout: 90000 });
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 8000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 8000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, /^Solo ›/); }
await p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 15000 });
await act({ type: 'sandbox/ai', on: false });
await act({ type: 'sandbox/fight' });
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 15000 });

const card = p.locator('[data-phc-cutin]');
/** The next card of ours: end the turn (the drill units pass), wait for the card, and say which half of the screen it is on. */
async function nextCard() {
  await p.waitForFunction(() => { const cb = window.__phc.getState().game.combat; const u = cb && cb.units.find((x) => x.id === cb.order[cb.turn]); return u && u.side === 'pc'; }, null, { timeout: 20000 });
  if (await card.count()) { await p.keyboard.press('Escape'); await p.waitForTimeout(500); }
  await act({ type: 'combat/end-turn', unitId: await p.evaluate(() => { const cb = window.__phc.getState().game.combat; return cb.order[cb.turn]; }) });
  await card.waitFor({ timeout: 15000 }); await p.waitForTimeout(700);
  const r = await card.boundingBox();
  return r.x + r.width / 2 > 800 ? 'right' : 'left';
}
async function choose(side) {
  // From the card's own button when it is up, else the combat panel's ⚙ Customise.
  if (await p.locator('[data-phc-customise]').count()) await p.locator('[data-phc-customise]').click();
  else await p.getByRole('button', { name: /Customise/ }).first().click();
  const dlg = p.locator('[data-phc-cmds-dialog]'); await dlg.waitFor({ timeout: 5000 });
  ok('the dialog offers CARD SIDE: Auto, Left, Right', (await dlg.getByRole('radiogroup', { name: 'Card side' }).getByRole('radio').count()) === 3);
  await dlg.locator('[data-card-side="' + side + '"]').click();
  ok(side + ' is checked', (await dlg.locator('[data-card-side="' + side + '"]').getAttribute('aria-checked')) === 'true');
  await dlg.getByRole('button', { name: 'Save' }).click(); await p.waitForTimeout(300);
}

await card.waitFor({ timeout: 20000 }).catch(() => {});
if (!(await card.count())) await nextCard();
ok('Auto by default (nothing stored)', await p.evaluate(() => localStorage.getItem('phc.cutinSide') === null));
await choose('right');
const r1 = await nextCard();
ok('Right: the next card comes in on the right (' + r1 + ')', r1 === 'right' && await p.evaluate(() => localStorage.getItem('phc.cutinSide') === 'right'));
if (SHOTS) await p.screenshot({ path: SHOTS + '/turn-card-right.png' });
await choose('left');
const r2 = await nextCard();
ok('Left: the next card comes in on the left (' + r2 + ')', r2 === 'left');
await p.reload();
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 20000 });
ok('kept after a reload', await p.evaluate(() => localStorage.getItem('phc.cutinSide') === 'left'));
await choose('auto');
ok('Auto clears the choice', await p.evaluate(() => localStorage.getItem('phc.cutinSide') === null));
console.log('errors', errors);
await browser.close();
