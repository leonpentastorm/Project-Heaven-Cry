// Spotlight cut-ins (docs/design/cutin-spec.md, decision 113), in the Proving Ground with two browsers:
//  (a) the host's fighter takes down a boss: the cut-in plays (the screen behind blurred), then that attack's effects play
//      15% slower (window.__phcCutins records the slowed events and their beats), and the input hold releases;
//  (d) the guest, on the same fight, sees the same cut-in from the shared state;
//  (e) the trigger API (window 'phc:cutin') with a patron shows that patron's torn strip; a click skips it;
//  (b) in a story room (the scripted Narrator), a natural 20 on a Hard check on the area map plays a cut-in, no slow-mo;
//  (c) a player in that room who set Cut-ins: Off on the title's Settings sees none of it.
// Screens at deviceScaleFactor 1 in e2e/shots/cutins-*.png.
import { chromium, player, click, hostAs, BASE, OUT } from './lib.mjs';
const browser = await chromium.launch();
const host = await player(browser, 'host'), mai = await player(browser, 'mai');
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const snap = (p, n) => p.screenshot({ path: OUT + 'cutins-' + n + '.png' });
const G = (p) => p.evaluate(() => window.__phc.getState().game);
const act = (p, a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const until = (p, f, arg, t = 15000) => p.waitForFunction(f, arg, { timeout: t });
const logs = (p) => p.evaluate(() => (window.__phcCutins || []).map((x) => ({ ...x, slowed: [...x.slowed] })));
const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };
for (const p of [host, mai]) p.on('dialog', (d) => d.accept());
// The engine's dice (packages/engine/src/rng.ts): a state whose next d20 is a natural 20.
function next(r) { let t = (r.state = (r.state + 0x6d2b79f5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const nat20 = () => { for (let s = 1; s < 1e6; s++) { const r = { state: s }; if (1 + Math.floor(next(r) * 20) === 20) return s; } return 1; };

// 1. The host opens the Proving Ground with friends; the guest joins by the code.
await host.goto(BASE);
await click(host, 'PROVING GROUND', { timeout: 60000 });
await host.getByPlaceholder('Leon').fill('Leon');
await click(host, 'With friends ›');
await until(host, () => !!window.__phc.getState().game?.sandbox);
const invite = host.locator('div[role="dialog"][aria-label="Invite friends"]');
await invite.waitFor({ timeout: 6000 });
const code = (await G(host)).code;
await invite.getByRole('button', { name: 'Gear up ›' }).click();
await mai.goto(BASE);
await click(mai, 'JOIN A FRIEND', { timeout: 20000 });
await mai.getByPlaceholder('Leon').fill('Mai');
await mai.getByPlaceholder('ROOM CODE').fill(code);
await click(mai, 'Join ›');
await until(mai, () => !!window.__phc.getState().game?.sandbox && window.__phc.getState().screen === 'main');
const hostId = await host.evaluate(() => window.__phc.getState().me.id), maiId = await mai.evaluate(() => window.__phc.getState().me.id);
let g = await G(host);
const hostChar = Object.values(g.characters).find((c) => c.owner === hostId), maiChar = Object.values(g.characters).find((c) => c.owner === maiId);
// A painted portrait for the host's fighter (the strip shows its eyes).
await act(host, { type: 'sandbox/give', charId: hostChar.id, item: 'hellraiser_service_rifle', equip: true });
await host.evaluate((id) => { const c = window.__phc.getState().game.characters[id]; c.portrait = '/assets/char-arch-sharpshooter.webp'; }, hostChar.id);
await act(mai, { type: 'sandbox/ready', on: true });
await act(host, { type: 'sandbox/ai', on: false });
await act(host, { type: 'sandbox/fight' });
await until(host, () => window.__phc.getState().screen === 'combat');
await until(mai, () => window.__phc.getState().screen === 'combat');
ok('both players are on the combat screen', true);

// 2. (a) The host's turn: a boss next to the host's fighter, at 1 HP; shoot it down.
const cur = (p) => p.evaluate(() => { const cb = window.__phc.getState().game.combat; return cb && cb.units.find((x) => x.id === cb.order[cb.turn]); });
const settle = async (p) => { await p.waitForFunction(() => (window.__phcHold?.() || 0) <= performance.now() + 5 && !window.__phcCutin?.showing, null, { timeout: 12000 }).catch(() => {}); await p.waitForTimeout(150); };
async function hostsTurn() {
  for (let i = 0; i < 40; i++) {
    const u = await cur(host); if (!u) { await host.waitForTimeout(200); continue; }
    const owner = u.charId ? (await G(host)).characters[u.charId]?.owner : null;
    if (owner === hostId) return u;
    if (owner === maiId) { await settle(mai); await act(mai, { type: 'combat/end-turn', unitId: u.id }); }
    await host.waitForTimeout(300);
  }
  return null;
}
let me = await hostsTurn();
ok('the host\'s fighter is up', !!me);
await settle(host);
const spot = await host.evaluate((pos) => { const cb = window.__phc.getState().game.combat, m = cb.map, [x, y] = pos.split(',').map(Number);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1], [2, 0], [-2, 0], [0, 2], [0, -2]]) {
    const k = (x + dx) + ',' + (y + dy); if (x + dx < 0 || y + dy < 0 || x + dx >= m.w || y + dy >= m.h) continue;
    if ((m.solid || []).includes(k) || cb.units.some((u) => !u.dead && u.pos === k) || (cb.objects || []).some((o) => o.pos === k)) continue; return k; } return null; }, me.pos);
const sp = spot ? await act(host, { type: 'sandbox/spawn', tier: 'boss', weapon: 'fists', at: ref(spot), name: 'Warden' }) : 'no free tile';
ok('a boss (the Warden) stands next to the host\'s fighter (' + (sp || ref(spot)) + ')', !sp);
const before = (await logs(host)).length, beforeMai = (await logs(mai)).length;
let killed = false, sawBlur = false, sawStrip = false, holdDuring = false;
for (let tries = 0; tries < 12 && !killed; tries++) {
  me = await hostsTurn(); if (!me) break;
  await settle(host);
  // The Warden at 1 HP, no armour (a test hook on the host's own state: the next action carries it to everyone).
  const boss = await host.evaluate(() => { const cb = window.__phc.getState().game.combat; const b = cb.units.find((u) => u.name === 'Warden' && !u.dead); if (b) { b.hp = 1; b.armour = 0; } return b && b.id; });
  if (!boss) break;
  const err = await act(host, { type: 'combat/attack', unitId: me.id, targetId: boss, mode: 'shot' });
  if (err) { await act(host, { type: 'combat/end-turn', unitId: me.id }); continue; }
  killed = await host.evaluate(() => window.__phc.getState().game.combat.units.some((u) => u.name === 'Warden' && u.dead));
  if (!killed) { await settle(host); const u = await cur(host); if (u && u.id === me.id && u.ap < 3) await act(host, { type: 'combat/end-turn', unitId: me.id }); continue; }
  // While it shows: the blur behind, the strip, the input held.
  for (let i = 0; i < 40 && !(sawBlur && sawStrip); i++) {
    const st = await host.evaluate(() => { const v = document.querySelector('[data-phc-spotlight-blur]'); const cs = v && getComputedStyle(v); return { blur: !!cs && /blur\(/.test(cs.backdropFilter || cs.webkitBackdropFilter || ''), strip: !!document.querySelector('[data-phc-spotlight-strip]'), held: (window.__phcHold?.() || 0) > performance.now() + 100 }; });
    sawBlur ||= st.blur; sawStrip ||= st.strip; holdDuring ||= st.held;
    if (st.strip && i > 3) break;
    await host.waitForTimeout(60);
  }
  await host.waitForTimeout(350); await snap(host, 'a-takedown');
}
ok('the Warden is taken down', killed);
ok('the cut-in shows its torn strip over a blurred screen', sawStrip && sawBlur);
ok('input is held while it shows', holdDuring);
await settle(host);
let L = (await logs(host)).slice(before), td = L.find((x) => x.kind === 'takedown');
ok('the host\'s cut-in is a takedown, "' + (td && td.caption) + '", ' + (td && td.label), !!td && /Took down Warden/.test(td.caption) && /^TAKEDOWN · /.test(td.label));
ok('it lasts about 1.4 s (' + (td && td.end - td.at) + ' ms)', !!td && td.end - td.at >= 1300 && td.end - td.at <= 1700);
await host.waitForTimeout(800); L = (await logs(host)).slice(before); td = L.find((x) => x.kind === 'takedown');
const sl = td ? td.slowed : [];
ok('the shot that took it down plays after the cut-in, slowed (tempo ' + (td && td.tempo) + '; ' + sl.map((x) => x.k + ' ' + x.beat).join(', ') + ')', !!td && td.slow && td.tempo === 0.85 && sl.length >= 2 && sl[0].at >= td.end - 5);
const shotEv = sl.find((x) => x.k === 'shot'), i0 = sl.indexOf(shotEv);
const gap = shotEv && sl[i0 + 1] ? sl[i0 + 1].at - shotEv.at : 0;
ok('the shot holds 400 / 0.85 ≈ 471 ms instead of 400 (beat ' + (shotEv && shotEv.beat) + ', measured ' + gap + ' ms)', !!shotEv && shotEv.beat >= 465 && shotEv.beat <= 476 && gap >= 440);
await settle(host);
ok('and the input hold releases', await host.evaluate(() => window.__phcHold() <= performance.now() + 5));

// 3. (d) The guest saw the same moment.
await mai.waitForTimeout(500);
const M = (await logs(mai)).slice(beforeMai), mtd = M.find((x) => x.kind === 'takedown');
ok('the guest sees the same cut-in (' + (mtd && mtd.label + ' · ' + mtd.caption) + ')', !!mtd && !!td && mtd.caption === td.caption && mtd.label === td.label);

// 4. (e) The trigger API: a patron breaks in (the god interjection system's client door), and a click skips it.
await settle(host);
const n0 = (await logs(host)).length;
await host.evaluate((id) => window.dispatchEvent(new CustomEvent('phc:cutin', { detail: { kind: 'god', patron: 'toll_keeper', char: id, reason: 'Stays at 1 HP', line: 'Not yet. You haven\'t paid.' } })), hostChar.id);
const godStrip = await host.locator('[data-phc-spotlight-strip="p:toll_keeper"]').waitFor({ timeout: 2000 }).then(() => true, () => false);
await host.waitForTimeout(550); await snap(host, 'e-god');
let last = (await logs(host)).slice(n0)[0];
ok('the trigger API shows the patron\'s torn strip first (' + (last && last.label) + ': ' + (last && last.strips.join(' + ')) + ')', godStrip && !!last && last.label === 'INTERVENTION · THE TOLL-KEEPER' && last.strips[0] === 'The Toll-Keeper');
await host.waitForTimeout(1600);
const n1 = (await logs(host)).length;
await host.evaluate(() => window.dispatchEvent(new CustomEvent('phc:cutin', { detail: { kind: 'god', patron: 'old_overcast', char: null, reason: 'Rain' } })));
await host.waitForTimeout(400);
await host.mouse.click(700, 500);
await host.waitForTimeout(300);
last = (await logs(host)).slice(n1)[0];
ok('a click skips it (gone in ' + (last && last.end - last.at) + ' ms)', !!last && last.skipped === true && last.end - last.at < 800 && !(await host.locator('[data-phc-spotlight]').count()));

// 5. (b) + (c) A story room (the scripted Narrator): a natural 20 on a Hard check on the area map plays a cut-in with
// no slow-mo; a player who set Cut-ins: Off on the title's Settings sees none of it, nor the trigger API's.
const nora = await player(browser, 'nora'), zed = await player(browser, 'zed');
await hostAs(nora, 'Nora');
await click(nora, 'Create a character');
await nora.getByPlaceholder('What the squad calls you').fill('Nora Vale');
await nora.locator('main button[aria-pressed]').first().click();
await click(nora, 'Next ›'); await nora.locator('button', { hasText: /^Use .* ›$/ }).first().click();
await click(nora, 'Next ›'); await click(nora, 'Next ›'); await click(nora, 'Next ›'); await nora.locator('button', { hasText: 'Line soldier' }).first().click();
await click(nora, 'Next ›'); await click(nora, 'Lock in and bring to the room');
await nora.evaluate(() => window.__phc.setNarrator({ scripted: true }));
await click(nora, 'Start session');
await nora.waitForFunction(() => window.__phc.getState().game.story.entries.some((e) => e.kind === 'narration'), null, { timeout: 15000 });
const room2 = (await G(nora)).code;
await zed.goto(BASE);
await click(zed, 'SETTINGS', { timeout: 30000 });
await zed.locator('[data-phc-cutins="off"]').click();
const pref = await zed.evaluate(() => JSON.parse(localStorage.getItem('phc.ui') || '{}').cutins);
ok('Settings: Cut-ins Off is saved (' + pref + ') and pressed', pref === 'off' && (await zed.locator('[data-phc-cutins="off"]').getAttribute('aria-pressed')) === 'true');
await zed.goto(BASE);
await click(zed, 'JOIN A FRIEND', { timeout: 20000 });
await zed.getByPlaceholder('Leon').fill('Zed');
await zed.getByPlaceholder('ROOM CODE').fill(room2);
await click(zed, 'Join ›');
await until(zed, () => !!window.__phc.getState().game && window.__phc.getState().conn === 'online', null, 20000);
await nora.waitForFunction(() => { const g = window.__phc.getState().game; return g.story.await === 'players' && !g.narrator.busy; }, null, { timeout: 15000 }).catch(() => {});
await zed.waitForTimeout(800);
const b1 = (await logs(nora)).length;
const ncId = await nora.evaluate(() => Object.values(window.__phc.getState().game.characters)[0].id);
await act(nora, { type: 'narrator/turn', turn: { narration: 'The gate is jammed.', checks: [{ charId: ncId, skills: ['composure'], tn: 16, stakes: 'Hold it steady.' }] } });
const ck = await nora.evaluate((id) => (window.__phc.getState().game.checks || []).find((k) => !k.done && k.charId === id), ncId);
ok('a Hard check (TN 16) on the area map', !!ck && ck.tn === 16 && (await nora.evaluate(() => window.__phc.getState().screen)) === 'main');
const s20 = nat20();
await nora.evaluate((s) => { window.__phc.getState().game.rng.state = s; }, s20);
await act(nora, { type: 'check/roll', checkId: ck.id });
const rolled = await nora.evaluate((id) => window.__phc.getState().game.checks.find((k) => k.id === id).roll, ck.id);
ok('the die shows a natural 20 (' + (rolled && rolled.die) + ')', !!rolled && rolled.die === 20);
await act(nora, { type: 'check/accept', checkId: ck.id });
const critShown = await nora.waitForFunction((b) => (window.__phcCutins || []).slice(b).some((x) => x.kind === 'crit'), b1, { timeout: 4000 }).then(() => true, () => false);
const blurNow = await nora.evaluate(() => { const v = document.querySelector('[data-phc-spotlight-blur]'); return !!v && /blur\(/.test(getComputedStyle(v).backdropFilter || ''); });
await nora.waitForTimeout(400); await snap(nora, 'b-crit');
await nora.waitForTimeout(1600);
const crit = (await logs(nora)).slice(b1).find((x) => x.kind === 'crit');
ok('the crit cut-in plays over the blurred area map: "' + (crit && crit.caption) + '"', critShown && blurNow && !!crit && crit.caption === 'Natural 20 on Composure · Hard');
ok('with no slow-mo (nothing slowed, no hold)', !!crit && !crit.slow && crit.slowed.length === 0 && (await nora.evaluate(() => window.__phcHold() <= performance.now() + 5)));
await zed.evaluate(() => window.dispatchEvent(new CustomEvent('phc:cutin', { detail: { kind: 'god', patron: 'nerukhan', char: null, reason: 'speaks' } })));
await zed.waitForTimeout(1200);
const zl = await logs(zed), zsaw = await zed.evaluate(() => window.__phc.getState().game.checks.some((k) => k.done && k.roll && k.roll.die === 20));
ok('the Off player had the crit in the state (' + zsaw + ') but saw no cut-in (' + zl.length + '), not even the trigger API\'s', zsaw && zl.length === 0 && !(await zed.locator('[data-phc-spotlight]').count()));

const errs = [...host.errors, ...mai.errors, ...nora.errors, ...zed.errors].filter((e) => !/Failed to load resource|youtube|ERR_|net::/i.test(e));
ok('no page errors (' + errs.slice(0, 3).join(' | ') + ')', errs.length === 0);
await browser.close();
