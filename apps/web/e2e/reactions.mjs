// Classes 3.0 step 10 (reactions-spec.md section 9): the reaction pips beside AP on the unit card, in the Proving Ground.
// A Skirmisher (Reflex: two reactions a round) shows two white pips and "2 / 2", read from the engine (reactionView); its
// hover card names the Answers kept on, and follows the switch (phys/answers, set out of a fight); Killzone's card
// says it spends both reactions. A classless fighter shows one pip. Waits on state, never sleeps.
import { chromium, player, click, OUT, settle, tipOf, openGround } from './lib.mjs';
const browser = await chromium.launch();
const host = await player(browser, 'host');
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const snap = (n) => host.screenshot({ path: OUT + 'reactions-' + n + '.png' });
const G = () => host.evaluate(() => window.__phc.getState().game);
const act = (a) => host.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const until = (f, arg, t = 30000) => host.waitForFunction(f, arg, { timeout: t });
host.on('dialog', (d) => d.accept());
let me = null;
const unit = async () => (await G()).combat.units.find((u) => u.charId === me);
async function toMe() {
  for (let i = 0; i < 30; i++) {
    const cb = (await G()).combat, cur = cb.units.find((u) => u.id === cb.order[cb.turn]);
    if (cur && cur.charId === me) return true;
    if (cur) await act({ type: 'combat/end-turn', unitId: cur.id });
    await settle(host, 250);
  }
  return false;
}
/** The pips as drawn: the value, and how many are lit. */
const pips = () => host.evaluate(() => { const el = document.querySelector('[data-reactions]'); return el ? { value: el.getAttribute('data-reactions'), lit: el.querySelectorAll('[data-on="true"]').length, all: el.querySelectorAll('[data-on]').length } : null; });
/** What the engine says (window.__phcEngine.reactionView, the same function the screen reads). */
const engine = () => host.evaluate((id) => { const g = window.__phc.getState().game, E = window.__phcEngine; const u = g.combat.units.find((x) => x.charId === id); return E && E.reactionView ? E.reactionView(g.combat, u, g.characters[id]) : null; }, me);
async function fight(cls, answers) {
  if ((await G()).phase === 'combat') { await act({ type: 'sandbox/stop' }); await until(() => window.__phc.getState().game?.phase !== 'combat'); }
  await act({ type: 'sandbox/class', charId: me, classId: cls, rank: 3 });
  if (answers !== undefined) { const r = await act({ type: 'phys/answers', charId: me, ids: answers }); if (r) console.log('note answers: ' + r); } // (the Answer list is set out of a fight)
  await act({ type: 'sandbox/ai', on: false }); await act({ type: 'sandbox/auto', on: false });
  await act({ type: 'sandbox/fight' });
  await until(() => window.__phc.getState().screen === 'combat');
  await act({ type: 'sandbox/clear' });
  return toMe();
}

await openGround(host);
me = Object.keys((await G()).characters)[0];

// ---------- one reaction: no class ----------
ok('a classless fighter, my turn', await fight(null));
await until(() => !!document.querySelector('[data-reactions]'));
let p = await pips(), e = await engine();
ok('its hover card: every Answer on by default (' + (await tipOf(host.locator('[data-reactions]').first())).slice(-40) + ')', /Every Answer you know is on/.test(await tipOf(host.locator('[data-reactions]').first())));
ok('one pip, lit, as the engine says (' + JSON.stringify(p) + ', engine ' + (e && e.max) + ')', !!p && p.value === '1 / 1' && p.lit === 1 && p.all === 1 && (!e || e.max === 1));

// ---------- the Skirmisher: two ----------
ok('a Skirmisher rank III with only Share a Hit switched on, my turn', await fight('marksman', ['share_a_hit']));
await until(() => document.querySelector('[data-reactions]')?.getAttribute('data-reactions') === '2 / 2').catch(() => {});
p = await pips(); e = await engine();
ok('two pips, both lit: "' + (p && p.value) + '" (engine ' + (e ? e.left + ' / ' + e.max : 'n/a') + ')', !!p && p.value === '2 / 2' && p.lit === 2 && p.all === 2 && (!e || (e.max === 2 && e.left === 2)));
const rx = host.locator('[data-reactions]').first();
const tip = await tipOf(rx);
ok('its hover card follows the Answer switch: only Share a Hit on (' + tip.slice(-40) + ')', /Answers on: Share a Hit\./.test(tip));
await host.locator('#phc-tab-class').click(); await settle(host, 150);
const kz = host.locator('[role="tabpanel"] button', { hasText: /^Killzone/ }).first();
const kzTip = (await kz.count()) ? await tipOf(kz) : '';
ok('Killzone\'s card: two attacks held, both reactions (' + kzTip.slice(0, 80) + ')', /two/i.test(kzTip) && /reactions/i.test(kzTip));
await host.locator('[data-reactions]').first().scrollIntoViewIfNeeded().catch(() => {});
await host.mouse.move(700, 120); await settle(host, 200); // no hover card over the picture
if (process.env.SHOTS_C3) await host.screenshot({ path: process.env.SHOTS_C3 + 'skirmisher-two-reactions.png' });
await snap('01-two');
ok('no page errors: ' + host.errors.join(' | '), !host.errors.length);
await browser.close();
