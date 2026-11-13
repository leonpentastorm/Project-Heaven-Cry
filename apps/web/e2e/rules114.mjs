// Rules 1.14 in a real browser: the perk card's three shelves, Heart Overload's offer and Resonance on the HEART panel
// (the Proving Ground), then speaking and attempting in a fight with the scripted Narrator (a solo room).
import { chromium, player, click, BASE, hostAs, settle, lockIn } from './lib.mjs';
const SHOTS = process.env.SHOTS || 'apps/web/e2e/shots/';
const browser = await chromium.launch();
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const mk = async () => { const p = await player(browser, 'host', { campaigns: ['m813'] }); const errors = []; p.on('pageerror', (e) => errors.push(String(e.message || e))); p.errs = errors; return p; };
const G = (p) => p.evaluate(() => window.__phc.getState().game);
const act = (p, a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const toast = (p) => p.evaluate(() => window.__phc.getState().toast?.text || '');
const dismiss = async (p) => { for (let i = 0; i < 4; i++) { if (!(await p.locator('[data-phc-cutin]').count())) return; await p.mouse.click(1430, 990); await settle(p, 350); } };
const myTurnPanel = (p) => p.waitForFunction(() => { const d = document.querySelector('.phc-cb-dock'); return !!d && !d.getAttribute('data-lock') && !!document.querySelector('[role="tablist"][aria-label="Actions"] [role="tab"]'); }, null, { timeout: 60000 });

// ---------- 1. The Proving Ground: the perk card ----------
{ const p = await mk();
  await p.goto(BASE); await click(p, 'PROVING GROUND');
  const nm = p.getByPlaceholder('Leon');
  await Promise.race([nm.waitFor({ timeout: 20000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 20000 }).catch(() => {})]);
  if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
  await p.waitForFunction(() => window.__phc.getState().game?.sandbox?.state === 'ready', null, { timeout: 30000 });
  const cid = Object.keys((await G(p)).characters)[0];
  for (const [perk, tier] of [['shrug_it_off', 'I'], ['trick_shot', 'mastered'], ['last_wall', 'mastered'], ['used_to_the_pain', 'I'], ['real_power', 'I']]) await act(p, { type: 'sandbox/perk', charId: cid, perk, tier });
  await act(p, { type: 'sandbox/ai', on: false }); await act(p, { type: 'sandbox/fight' });
  await p.waitForFunction(() => window.__phc.getState().game?.phase === 'combat', null, { timeout: 30000 });
  await myTurnPanel(p); await settle(p, 800); await dismiss(p);
  await p.locator('#phc-tab-perks').click(); await settle(p, 300);
  const panel = p.locator('[role="tabpanel"]');
  const text = (await panel.innerText()).replace(/\s+/g, ' ');
  const shelves = await p.locator('[data-shelf]').evaluateAll((els) => els.map((e) => e.getAttribute('data-shelf')));
  ok('the Perks tab shows its three shelves in order (' + shelves.join(', ') + ')', shelves.join(',') === 'use,rides,always');
  ok('Use now holds the action (Shrug It Off) as a button', (await panel.getByRole('button', { name: /Shrug It Off/ }).count()) > 0);
  ok('Rides an action lists Trick Shot with where its switch is: ' + ((text.match(/Trick Shot[^.]{0,60}/) || [''])[0]), /Trick Shot/.test(text) && /on your attacks/i.test(text));
  ok('Always on lists Last Wall with a live line: ' + ((text.match(/Last Wall.{0,40}/) || [''])[0]), /Last Wall/.test(text) && /Ready/.test(text));
  ok('a story-only perk (Real Power) is not on the fight\'s card', !/Real Power/.test(text));
  const badge = (await p.locator('#phc-tab-perks').innerText()).replace(/\s+/g, ' ');
  ok('the tab badge counts only what can be used now: ' + badge, /1\b/.test(badge.replace(/^\d\s*/, '')));
  await p.screenshot({ path: SHOTS + 'rules114-perk-card.png' });
  // a read-only row opens its card and hides Confirm
  const row = p.locator('[data-shelf="always"] [role="listitem"], [data-shelf="always"] li, [data-shelf="always"] button').first();
  if (await row.count()) { await row.click().catch(() => {}); await settle(p, 250); }
  ok('no page errors (perk card): ' + p.errs.join(' | ').slice(0, 200), p.errs.length === 0);

  // ---------- 2. Heart Overload and Resonance on the HEART panel ----------
  await act(p, { type: 'sandbox/kit', charId: cid, kind: 'soul' });
  await act(p, { type: 'sandbox/skill', charId: cid, skill: 'will_power', points: 7 });
  for (const perk of ['heart_overload', 'resonance']) await act(p, { type: 'sandbox/perk', charId: cid, perk, tier: 'I' });
  await act(p, { type: 'sandbox/mana', value: 30 });
  const meU = async () => (await G(p)).combat.units.find((u) => u.side === 'pc');
  await p.getByRole('button', { name: 'End turn', exact: true }).click(); await myTurnPanel(p); await dismiss(p);
  let u = await meU(); const d = u.mg && u.mg.designs && u.mg.designs.find((x) => x.school === 'damage') || (u.mg && u.mg.designs[0]);
  if (u.mg && !u.mg.emanator) { await act(p, { type: 'sandbox/give', charId: cid, item: 'service_pistol', equip: true }); await settle(p, 200); await act(p, { type: 'sandbox/give', charId: cid, item: 'emanator', equip: true }); await settle(p, 300); u = await meU(); }
  ok('the Recruit holds an Emanator in hand (' + (u.mg && u.mg.emanator) + ') and a design (' + (d && d.name) + ', ' + (u.mg ? u.mg.mp : '?') + ' MP)', !!d && !!u.mg && !!u.mg.emanator);
  if (d) {
    { const [x, y] = u.pos.split(',').map(Number); await act(p, { type: 'sandbox/clear' }); await act(p, { type: 'sandbox/spawn', tier: 'elite', weapon: 'fists', at: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x + 3] + (y + 1) }); await settle(p, 300); }
    const foe = (await G(p)).combat.units.find((x) => x.side === 'foe' && !x.dead);
    let e = await act(p, { type: 'combat/outburst', unitId: u.id, design: d.id, hold: true }); await settle(p, 250);
    e = e || await act(p, { type: 'combat/pump', unitId: u.id, mods: ['overdraw'] }); await settle(p, 250);
    u = await meU(); ok('Overdraw: one Pump took the held Outburst to stage ' + (u.mg.held && u.mg.held.stage) + ' (' + (e || await toast(p) || 'ok') + ')', !!u.mg.held && u.mg.held.stage === 2);
    const ap0 = u.ap; e = await act(p, { type: 'combat/release', unitId: u.id, aim: foe.pos }); await settle(p, 900);
    u = await meU(); ok('Released at stage 2 (' + (e || await toast(p) || 'ok') + '; AP ' + ap0 + ' → ' + u.ap + ')', !u.mg.held);
    await p.locator('[role="tablist"][aria-label="Actions"] [role="tab"]', { hasText: /OUTBURST|HEART/i }).first().click().catch(() => {}); await settle(p, 400);
    const rowT = (await p.locator('.phc-cb-dock').innerText()).replace(/\s+/g, ' ');
    ok('the Outburst row itself says the free Begin is waiting: ' + ((rowT.match(/Heart Overload[^.]{0,40}/) || ['(not found)'])[0]), /Heart Overload: .* again, 0 AP/.test(rowT));
    await p.locator('[role="tabpanel"]').getByRole('button', { name: /^Outburst/ }).first().click().catch(() => {}); await settle(p, 400);
    const t2 = (await p.locator('.phc-cb-dock').innerText()).replace(/\s+/g, ' ');
    ok('the design\'s card offers Heart Overload: ' + ((t2.match(/Heart Overload[^.]{0,50}/) || ['(not found)'])[0]), /Heart Overload/.test(t2) && /0 AP/.test(t2));
    await p.screenshot({ path: SHOTS + 'rules114-heart-overload.png' });
    const ap1 = (await meU()).ap; e = await act(p, { type: 'combat/outburst', unitId: u.id, design: d.id, hold: true }); await settle(p, 300);
    u = await meU(); ok('the free Begin costs 0 AP (' + ap1 + ' → ' + u.ap + '; ' + (e || 'ok') + ')', !!u.mg.held && u.ap === ap1);
    await p.locator('[role="tablist"][aria-label="Actions"] [role="tab"]', { hasText: /OUTBURST|HEART/i }).first().click().catch(() => {}); await settle(p, 400);
    const t3 = (await p.locator('.phc-cb-dock').innerText()).replace(/\s+/g, ' ');
    ok('the HEART panel shows the Resonance built by the first Release: ' + ((t3.match(/Resonance[^.]{0,30}/) || ['(not found)'])[0]), /Resonance \+10%/.test(t3));
    await p.screenshot({ path: SHOTS + 'rules114-resonance.png' });
  }
  // no Narrator in the Proving Ground: an attempt is refused with its reason, plain speech still goes in the log
  const say = p.locator('form.phc-cb-say, form.phc-cb-say2').filter({ has: p.locator(':visible') }).first();
  const att = p.locator('[data-say="attempt"]:visible').first();
  ok('the Say row has Say and Attempt (' + (await att.innerText().catch(() => '?')) + ')', (await p.locator('[data-say="say"]:visible').count()) > 0 && (await att.count()) > 0);
  ok('with no Narrator the Attempt is off, with the reason: ' + (await att.getAttribute('data-tip-text')), await att.isDisabled());
  void say; ok('no page errors (heart): ' + p.errs.join(' | ').slice(0, 200), p.errs.length === 0);
  await p.context().close(); }

// ---------- 3. A room with the scripted Narrator: say, attempt, the answer ----------
{ const p = await mk();
  await hostAs(p, 'Leon'); await p.waitForSelector('text=The squad');
  await click(p, 'Create a character'); await p.getByPlaceholder('What the squad calls you').fill('MPAT');
  await p.locator('main button[aria-pressed]').first().click(); await click(p, 'Next ›');
  await p.locator('button', { hasText: /^Use .* ›$/ }).first().click();
  await click(p, 'Next ›'); await click(p, 'Next ›'); await click(p, 'Next ›');
  await p.locator('button', { hasText: 'Field medic' }).first().click(); await click(p, 'Next ›');
  await lockIn(p); await p.waitForSelector('text=✓ LOCKED IN');
  await p.evaluate(() => window.__phc.setNarrator({ scripted: true }));
  await click(p, 'Start session'); await p.waitForSelector('text=The rear pad', { timeout: 30000 });
  await p.getByLabel('What do you do?').fill('I walk up the ramp.'); await click(p, 'Send', { exact: true }); await click(p, 'End turn', { exact: true });
  await p.waitForSelector('text=CLICK TO ROLL', { timeout: 30000 }); await settle(p, 300);
  if (!(await p.locator('div[aria-label="Dice table"]').count())) await p.locator('button', { hasText: 'Get Keel to lower the ramp.' }).click();
  await click(p, /Throw/); await p.waitForSelector('text=/SUCCESS|FAILURE|COMPLICATION/'); await click(p, 'Continue', { exact: true });
  await p.waitForFunction(() => window.__phc.getState().game?.phase === 'combat', null, { timeout: 30000 });
  // wait for MPAT's own turn on screen (hostiles may go first)
  for (let i = 0; i < 6; i++) { const mine = await p.evaluate(() => { const g = window.__phc.getState().game, cb = g.combat, u = cb.units.find((x) => x.id === cb.order[cb.turn]); return !!u && u.side === 'pc'; }); if (mine) break; await settle(p, 2500); }
  await myTurnPanel(p); await dismiss(p);
  const me = async () => (await G(p)).combat.units.find((u) => u.side === 'pc');
  const att = () => p.locator('[data-say="attempt"]:visible').first(), box = () => p.locator('form.phc-cb-say input:visible, form.phc-cb-say2 input:visible, form.phc-cb-say textarea:visible').first();
  const n0 = (await G(p)).combat.log.length, ap0 = (await me()).ap;
  await box().fill('Easy now, friend.'); await p.locator('[data-say="say"]:visible').first().click(); await settle(p, 500);
  ok('plain speech is free and goes in the log (AP ' + ap0 + ' → ' + (await me()).ap + ')', (await me()).ap === ap0 && (await G(p)).combat.log.slice(n0).some((l) => /Easy now/.test(l)));
  await box().fill('I taunt him: is that all you have?'); await settle(p, 600);
  const attOn = await att().evaluate((b) => new Promise((res) => { const t0 = Date.now(); const tick = () => (!b.disabled ? res(true) : Date.now() - t0 > 3000 ? res(false) : setTimeout(tick, 100)); tick(); }));
  ok('Attempt is on, and says its price: ' + (await att().innerText()) + ' (' + (await att().getAttribute('data-tip-text')) + ')', attOn && /1 AP/.test(await att().innerText()));
  const n1 = (await G(p)).combat.log.length; await att().click();
  const deciding = await p.waitForSelector('text=/The Narrator is deciding/', { timeout: 30000 }).then(() => true, () => false);
  await p.waitForFunction(() => !window.__phc.getState().game.combat.ruling && !(window.__phc.getState().game.combat.pending || []).length, null, { timeout: 30000 }).catch(() => {});
  await settle(p, 800);
  const g2 = await G(p), fresh = g2.combat.log.slice(n1);
  ok('an attempt costs 1 AP (' + ap0 + ' → ' + (await me()).ap + ')', (await me()).ap === ap0 - 1);
  ok('the Narrator answered in the log (the waiting line was seen: ' + deciding + '; the scripted Narrator answers at once): ' + JSON.stringify(fresh).slice(0, 260), fresh.some((l) => /Narrator/.test(l)));
  await p.screenshot({ path: SHOTS + 'rules114-attempt.png' });
  await box().fill('And another thing.'); await settle(p, 150);
  ok('a second attempt the same turn is off: ' + (await att().getAttribute('data-tip-text')), await att().isDisabled());
  ok('no page errors (speech): ' + p.errs.join(' | ').slice(0, 300), p.errs.length === 0);
  await p.context().close(); }
await browser.close();
