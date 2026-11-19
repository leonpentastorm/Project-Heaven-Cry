// 0.32 effects lane: screenshots of the new effects as they play, for the lead's look (OUT, KEEP_SHOTS=1), with a check
// that each was seen: a Hymn landing with its numbers (Lightning Rod on a soldier: the bolt, the patron's light on the
// struck tokens, the numbers), a Figment's strike with its number, and the vow pop-up on entering Survival's camp.
import { chromium, BASE, OUT, pause, click, hostAs, lockIn, campConfirmGo } from './lib.mjs';
const browser = await chromium.launch();
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { localStorage.setItem('phc.voice', JSON.stringify({ auto: false })); localStorage.setItem('phc.tips', '["*"]'); sessionStorage.setItem('phc.pressedAnyKey', '1'); } catch { /* */ } });
const p = await ctx.newPage();
const errors = []; p.on('pageerror', (e) => errors.push(e.message));
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const G = () => p.evaluate(() => window.__phc.getState().game);
const dismiss = async () => { for (let i = 0; i < 4 && (await p.locator('[data-phc-cutin]').count()); i++) { await p.keyboard.press('Escape'); await pause(p, 300); } };
/** A float on the effects layer whose text matches (a number: "−12"). */
const floatSeen = (re, timeout = 10000) => p.waitForFunction((src) => { const r = new RegExp(src); return [...document.querySelectorAll('div > span')].some((s) => r.test(s.textContent || '') && getComputedStyle(s.parentElement).fontWeight === '700'); }, re.source, { timeout, polling: 30 }).catch(() => false).then((x) => x !== false);

await p.goto(BASE);
await click(p, 'PROVING GROUND', { timeout: 90000 });
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 20000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 20000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, /^Solo ›/); }
await p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 30000 });
const cid = Object.keys((await G()).characters)[0];
await act({ type: 'sandbox/ai', on: false });

// ---------- a Hymn landing: Lightning Rod (Old Overcast) on a soldier beside the Chaplain ----------
await act({ type: 'sandbox/faith', charId: cid, belief: 'faithful', patron: 'old_overcast', faith: 7, devotion: 10, reset: true });
await act({ type: 'sandbox/fight' });
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 30000 });
await p.waitForFunction(() => { const cb = window.__phc.getState().game.combat; const u = cb && cb.units.find((x) => x.id === cb.order[cb.turn]); return u && u.side === 'pc'; }, null, { timeout: 30000 });
await dismiss();
const me = async () => (await G()).combat.units.find((u) => u.charId === cid);
let u = await me();
const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };
const near = (k, d) => { const [x, y] = k.split(',').map(Number); return (x + d[0]) + ',' + (y + d[1]); };
for (const d of [[2, 0], [-2, 0], [0, 2], [0, -2], [2, 1]]) { const k = near(u.pos, d); if (k.split(',').some((n) => +n < 0)) continue; if (!(await act({ type: 'sandbox/spawn', tier: 'soldier', weapon: 'service_pistol', at: ref(k) }))) break; }
for (const d of [[3, 0], [-3, 0], [0, 3], [0, -3]]) { const k = near(u.pos, d); if (k.split(',').some((n) => +n < 0)) continue; if (!(await act({ type: 'sandbox/spawn', tier: 'soldier', weapon: 'service_pistol', at: ref(k) }))) break; }
await pause(p, 600);
const foe = (await G()).combat.units.find((x) => x.side === 'foe' && !x.dead && Math.max(Math.abs(+x.pos.split(',')[0] - +u.pos.split(',')[0]), Math.abs(+x.pos.split(',')[1] - +u.pos.split(',')[1])) <= 3);
ok('a soldier stands beside the Chaplain', !!foe);
if (foe) {
  const land = p.waitForSelector('[data-phc-prayer-land]', { state: 'attached', timeout: 15000 }).catch(() => false).then((x) => x !== false);
  const er = await act({ type: 'faith/pray', unitId: u.id, kind: 'hymn', id: 'lightning_rod', targetId: foe.id });
  const landed = await land; await pause(p, 140);
  await p.screenshot({ path: OUT + 'effects-hymn-lands.png' });
  const num = await floatSeen(/^−\d/);
  await p.screenshot({ path: OUT + 'effects-hymn-numbers.png' });
  ok('Lightning Rod lands on its targets (' + (er || 'prayed') + ') and their numbers float', !er && landed && num);
}
await act({ type: 'sandbox/stop' }).catch(() => {});
await p.waitForFunction(() => window.__phc.getState().game.phase === 'story', null, { timeout: 30000 }).catch(() => {});

// ---------- a Figment's strike and its number ----------
await act({ type: 'sandbox/faith', charId: cid, belief: 'atheist', reset: true });
await act({ type: 'sandbox/skill', charId: cid, skill: 'visualization', points: 6 });
await act({ type: 'sandbox/class', charId: cid, classId: 'marksman', rank: 1 });
await act({ type: 'sandbox/give', charId: cid, item: 'service_pistol', equip: true });
await act({ type: 'sandbox/give', charId: cid, item: 'visualizer', equip: true });
await act({ type: 'sandbox/give', charId: cid, item: 'standard_core', qty: 3 });
await act({ type: 'door/pick', charId: cid, door: 'visualization', option: 'wall' });
await act({ type: 'door/pick', charId: cid, door: 'visualization', option: 'beast' });
await act({ type: 'sandbox/fight' });
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 30000 });
await p.waitForFunction(() => { const cb = window.__phc.getState().game.combat; const v = cb && cb.units.find((x) => x.id === cb.order[cb.turn]); return v && v.side === 'pc'; }, null, { timeout: 30000 });
await dismiss();
u = await me();
const fT = near(u.pos, [1, 0]), sT = near(u.pos, [2, 0]);
await act({ type: 'sandbox/spawn', tier: 'soldier', weapon: 'service_pistol', at: ref(sT) });
const pe = await act({ type: 'combat/perk', unitId: u.id, id: 'verb:picture', choice: 'beast', tile: fT });
await pause(p, 1500);
const beast = (await G()).combat.units.find((x) => x.owned?.kind === 'figment' && !x.dead);
const target = (await G()).combat.units.find((x) => x.side === 'foe' && !x.dead && x.pos === sT);
ok('a Beast pictured beside a soldier (' + (pe || 'done') + ')', !!beast && !!target);
let struck = false;
for (let i = 0; i < 6 && beast && target && !struck; i++) {
  const hp0 = (await G()).combat.units.find((x) => x.id === target.id).hp;
  const num = floatSeen(/^−\d/, 6000);
  const e = await act({ type: 'combat/owned', unitId: u.id, owned: beast.id, verb: 'figment_strike', targetId: target.id });
  if (e) { console.log('note ' + e); break; }
  const hp1 = (await G()).combat.units.find((x) => x.id === target.id).hp;
  if (hp1 < hp0 && await num) { await pause(p, 60); await p.screenshot({ path: OUT + 'effects-figment-strike.png' }); struck = true; }
  else { await pause(p, 1200); await act({ type: 'sandbox/refill', charId: cid }).catch(() => {}); }
}
ok('a Figment\'s strike shows its number', struck);
await act({ type: 'sandbox/stop' }).catch(() => {});
await browser.close();

// ---------- the vow pop-up: Survival's camp, a Faithful character ----------
const b2 = await chromium.launch(); const c2 = await b2.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
await c2.addInitScript(() => { try { localStorage.setItem('phc.voice', JSON.stringify({ auto: false })); localStorage.setItem('phc.tips', '["*"]'); sessionStorage.setItem('phc.pressedAnyKey', '1'); } catch { /* */ } });
const q = await c2.newPage(); q.on('pageerror', (e) => errors.push(e.message));
await hostAs(q, 'Leon');
await click(q, 'Create a character');
await q.getByPlaceholder('What the squad calls you').fill('Saint');
await q.locator('main button[aria-pressed]').first().click();
await click(q, 'Next ›');
await q.locator('button', { hasText: /^Use .* ›$/ }).first().click();
await click(q, 'Next ›'); await click(q, 'Next ›'); await click(q, 'Next ›');
await click(q, 'Next ›'); await lockIn(q);
await q.waitForSelector('text=✓ LOCKED IN');
// (a test room: the character is made Faithful on this page before the run starts; the pop-up reads the engine's faithView)
await q.evaluate(() => { const g = window.__phc.getState().game, c = Object.values(g.characters)[0]; c.belief = { kind: 'faithful', patron: 'mother_ember' }; c.patron = 'mother_ember'; c.skills.faith = Math.max(1, c.skills.faith || 0); });
await click(q, 'Start the run');
await campConfirmGo(q);
const pop = await q.waitForSelector('[data-phc-vow-popup="enter"]', { timeout: 30000 }).catch(() => false).then((x) => x !== false);
await pause(q, 500); await q.screenshot({ path: OUT + 'effects-vow-popup.png' });
ok('entering Survival\'s camp, the vow pop-up asks the Faithful character', pop);
if (pop) {
  await q.locator('[data-phc-vow]').first().click(); await pause(q, 200);
  const cur = await q.locator('[data-phc-vow-current]').first().textContent();
  ok('a vow chosen is the standing vow (' + cur + ')', /^Vow: /.test(cur || ''));
  await q.locator('[data-phc-vow-done]').click(); await pause(q, 300);
  ok('Done closes it; the camp is behind it, with its side panels', (await q.locator('[data-phc-vow-popup]').count()) === 0 && (await q.locator('[data-phc-camp]').count()) === 1);
}
ok('no page errors (' + errors.join(' | ').slice(0, 200) + ')', errors.length === 0);
await b2.close();
