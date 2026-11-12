// The Effect testing room (Leon, 11 Nov 2026), the two-key codes, the AP the picked action will take, and a fight's last
// blow playing in full.
import { chromium, player, click, BASE, pause } from './lib.mjs';
const browser = await chromium.launch(); const p = await player(browser, 'host');
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const errors = []; p.on('pageerror', (e) => errors.push(String(e.message || e)));
const G = () => p.evaluate(() => window.__phc.getState().game);
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };
const cutOff = async () => { for (let i = 0; i < 4; i++) { if (await p.locator('[data-phc-cutin]').count()) { await p.keyboard.press('Escape'); await pause(p, 400); } } };
await p.goto(BASE); await click(p, 'PROVING GROUND', { timeout: 90000 });
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 8000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 8000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
await p.waitForFunction(() => window.__phc.getState().game?.sandbox?.state === 'ready', null, { timeout: 15000 });

// 1. The button, the room
const btn = p.getByRole('button', { name: 'Effect testing', exact: true }).first();
ok('the Effect testing button is on the gearing-up screen', (await btn.count()) > 0);
await btn.click();
await p.waitForFunction(() => window.__phc.getState().game?.phase === 'combat', null, { timeout: 15000 });
let g = await G();
const dummy = g.combat.units.find((u) => u.side === 'foe'), me = g.combat.units.find((u) => u.side === 'pc');
ok('one dummy with 9,999 HP: ' + dummy?.name + ' ' + dummy?.hp, g.combat.units.filter((u) => u.side === 'foe').length === 1 && dummy.hp === 9999);
ok('your AP is 9', me.ap === 9);
await p.waitForSelector('text=YOUR TURN', { timeout: 15000 }); await pause(p, 1500); await cutOff();
ok('the dummy is on the map', (await p.locator('[data-unit="' + dummy.id + '"], [data-token="' + dummy.id + '"]').count()) > 0 || (await p.getByText('Target dummy').count()) > 0);

// 2. Two-key codes: every button shows one; pressing it picks that action
const codes = await p.evaluate(() => [...document.querySelectorAll('.phc-cb-tabpanel [data-code]')].map((el) => ({ code: el.getAttribute('data-code'), act: el.closest('button')?.getAttribute('data-act') })));
ok('the open tab\'s actions show their codes (' + codes.map((c) => c.code).join(' ') + ')', codes.length > 0 && codes.every((c) => /^[1-9][1-9]$/.test(c.code)));
// from another tab: press the code of the first tab's second action (or first, if it has one)
const tabsN = await p.locator('[role="tab"][id^="phc-tab-"]').count();
await p.keyboard.press(String(Math.min(tabsN, 2))); await pause(p, 1300); // a lone number: the tab opens, and the code window closes
const target = codes[Math.min(1, codes.length - 1)];
await p.keyboard.press(target.code[0]); await p.keyboard.press(target.code[1]); await pause(p, 400);
const pressed = await p.evaluate((a) => { const b = document.querySelector('.phc-cb-tabpanel button[data-act="' + CSS.escape(a) + '"]'); return b ? b.getAttribute('aria-pressed') : 'gone'; }, target.act);
ok('pressing ' + target.code + ' from another tab picks ' + target.act + ' (pressed: ' + pressed + ')', pressed === 'true');

// 3. The AP the picked action will take pulses on the AP bar
const costAct = await p.evaluate(() => { const b = [...document.querySelectorAll('.phc-cb-tabpanel button[data-act]')].find((x) => /\b[1-9] AP/.test(x.textContent || '') && x.getAttribute('aria-disabled') !== 'true' && !x.disabled); if (b) b.click(); return b ? b.getAttribute('data-act') + ' · ' + (b.textContent || '').slice(0, 40) : null; });
await pause(p, 400);
const pips = await p.evaluate(() => ({ cost: document.querySelectorAll('.phc-pips .phc-pip-cost').length, all: document.querySelectorAll('.phc-pips > span').length }));
ok('picked ' + costAct + ': ' + pips.cost + ' of ' + pips.all + ' AP pips pulse as its cost', !!costAct && pips.cost > 0);

// 4. Attacks: the dummy takes them and never dies; AP comes back
for (let i = 0; i < 6; i++) { const e = await act({ type: 'combat/attack', unitId: me.id, targetId: dummy.id }); if (e) await act({ type: /jam/.test(e) ? 'combat/clear' : 'combat/reload', unitId: me.id }); }
g = await G();
ok('after six actions: AP ' + g.combat.units.find((u) => u.id === me.id).ap + ', the dummy alive, the fight on', g.combat.units.find((u) => u.id === me.id).ap === 9 && !g.combat.units.find((u) => u.id === dummy.id).dead && !g.combat.over);
await pause(p, 2500);
await act({ type: 'sandbox/stop' }); await pause(p, 600); g = await G();
ok('Stop the fight leaves the room (phase ' + g.phase + ', no dummy left)', g.phase === 'story' && !g.sandbox.fx && !(g.story.npcs || []).some((n) => n.name === 'Target dummy'));

// 5. A fight's last blow plays in full: the swing or shot before the fall
await act({ type: 'sandbox/ai', on: false }); await act({ type: 'sandbox/fight' });
await p.waitForFunction(() => window.__phc.getState().game?.phase === 'combat', null, { timeout: 15000 });
await p.waitForSelector('text=YOUR TURN', { timeout: 15000 }); await pause(p, 1500); await cutOff();
await act({ type: 'sandbox/clear' }); g = await G();
const m2 = g.combat.units.find((u) => u.side === 'pc'), [x, y] = m2.pos.split(',').map(Number);
await act({ type: 'sandbox/spawn', tier: 'minion', weapon: 'combat_knife', at: ref((x + 2) + ',' + y), level: 1 });
g = await G(); const foe = g.combat.units.find((u) => u.side === 'foe' && !u.dead);
await pause(p, 800);
const res = await p.evaluate(async ({ meId, foeId }) => {
  const fx = []; const on = (ev) => { const d = ev.detail; if (d && d.n) fx.push({ n: d.n, k: d.k }); };
  window.addEventListener('phc-fx', on);
  let last = 0, n = 0;
  for (; n < 40; n++) {
    const s = window.__phc.getState().game; if (!s.combat || s.combat.over || s.phase !== 'combat') break;
    last = s.combat.fxSeq || 0;
    try { window.__phc.act({ type: 'combat/attack', unitId: meId, targetId: foeId }); }
    catch (e) { const m = String(e.message || e); try { window.__phc.act({ type: /jam/.test(m) ? 'combat/clear' : /AP|turn/.test(m) ? 'combat/end-turn' : 'combat/reload', unitId: meId }); } catch { /* */ } }
    await new Promise((r) => setTimeout(r, 2200));
  }
  await new Promise((r) => setTimeout(r, 3000));
  window.removeEventListener('phc-fx', on);
  const s = window.__phc.getState().game, cb = s.combat;
  const final = (cb?.fx || []).filter((e) => e.n > last).map((e) => ({ n: e.n, k: e.k }));
  return { over: cb?.over, final, played: fx.filter((e) => e.n > last).map((e) => e.n), tries: n };
}, { meId: m2.id, foeId: foe.id });
const missing = res.final.filter((e) => !res.played.includes(e.n));
ok('the fight was won (' + res.over + ', ' + res.tries + ' actions)', res.over === 'win');
ok('the last blow: ' + res.final.map((e) => e.k).join(' ') + '; every one of its effects played' + (missing.length ? ' (missing: ' + missing.map((e) => e.k).join(' ') + ')' : ''), res.final.length > 0 && missing.length === 0);
ok('no page errors: ' + errors.join(' | ').slice(0, 300), errors.length === 0);
await browser.close();
