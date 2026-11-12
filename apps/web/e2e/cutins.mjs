// Spotlight cut-ins (docs/design/cutin-spec.md, decision 113), in the Proving Ground with two browsers:
//  (a) the host's fighter takes down a boss: the cut-in plays (the screen behind blurred), then that attack's effects play
//      15% slower (window.__phcCutins records the slowed events and their beats), and the input hold releases;
//  (d) the guest, on the same fight, sees the same cut-in from the shared state;
//  (e) the trigger API (window 'phc:cutin') with a patron shows that patron's torn strip; a click skips it;
//  (b) in a story room (the scripted Narrator), a natural 20 on a Hard check on the area map plays a cut-in, no slow-mo;
//  (c) a player in that room who set Cut-ins: Off on the title's Settings sees none of it;
//  (f) a crit in the Proving Ground (the host's dice set to a natural 20): the short crit cut-in, then the shot 15% slower,
//      its casing thrown after the cut-in, in step; the guest sees it too;
//  (g) a crit that takes down a boss: one cut-in, the takedown;
//  (h) a patron intervention (Faith 2.2: the Quartermaster refunds a Witnessed reload): the patron's strip, once, and no
//      second (Faith 2.2) cut-in;
//  (i) a Miracle (Faith 2.2's scene) and the strips share one stage: a strip asked for while the Miracle is up waits
//      until it lands.
// Screens at deviceScaleFactor 1 in e2e/shots/cutins-*.png (DSF=2 SHOTS=<dir> for sharper copies in <dir>).
const SHOTS = process.env.SHOTS;
import { chromium, player, click, hostAs, BASE, OUT, pause } from './lib.mjs';
const browser = await chromium.launch();
const host = await player(browser, 'host'), mai = await player(browser, 'mai');
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const snap = (p, n) => p.screenshot({ path: (SHOTS ? SHOTS + '/' : OUT) + 'cutins-' + n + '.png' });
const G = (p) => p.evaluate(() => window.__phc.getState().game);
const act = (p, a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const until = (p, f, arg, t = 15000) => p.waitForFunction(f, arg, { timeout: t });
const logs = (p) => p.evaluate(() => (window.__phcCutins || []).map((x) => ({ ...x, slowed: [...x.slowed] })));
const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };
for (const p of [host, mai]) p.on('dialog', (d) => d.accept());
// The engine's dice (packages/engine/src/rng.ts): a state whose next d20 is a natural 20.
function next(r) { let t = (r.state = (r.state + 0x6d2b79f5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
/** A state whose next d20 is v (skip: the next one after that). */
const dieSeed = (v, skip = 0) => { for (let s = 1; s < 1e7; s++) { const r = { state: s }; if (1 + Math.floor(next(r) * 20) === v && skip-- <= 0) return s; } return 1; };
const nat20 = (skip = 0) => { for (let s = 1; s < 1e7; s++) { const r = { state: s }; if (1 + Math.floor(next(r) * 20) === 20 && skip-- <= 0) return s; } return 1; };

// 1. The host opens the Proving Ground with friends; the guest joins by the code.
await host.goto(BASE);
await click(host, 'PROVING GROUND', { timeout: 60000 });
await host.getByPlaceholder('Leon').fill('Leon');
await click(host, 'With friends ›');
await until(host, () => !!window.__phc.getState().game?.sandbox);
const invite = host.locator('div[role="dialog"][aria-label="Invite friends"]');
await invite.waitFor({ timeout: 30000 });
const code = (await G(host)).code;
await invite.getByRole('button', { name: 'Gear up ›' }).click();
await mai.goto(BASE);
await click(mai, 'JOIN A FRIEND', { timeout: 30000 });
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
// The combat speed (game/combatSpeed.ts): every length below is Fast's, × K at the player's speed (Normal ≈ 1.176).
const K = (await host.evaluate(() => window.__phcCombatTempo())).mult;
ok('the combat speed in force: × ' + K.toFixed(4), K >= 1 && K < 1.2);

// 2. (a) The host's turn: a boss next to the host's fighter, at 1 HP; shoot it down.
const cur = (p) => p.evaluate(() => { const cb = window.__phc.getState().game.combat; return cb && cb.units.find((x) => x.id === cb.order[cb.turn]); });
/** A watcher IN the page (it cannot miss a cut-in the way a poll from this script can on a busy machine): from now on it
 *  notes every strip that shows, whether the screen behind one was blurred, whether input was held while one showed, and
 *  whether a strip was ever on the page together with a Miracle's full cut-in. Read it with spied(). */
const spy = (p) => p.evaluate(() => {
  window.__spyObs?.disconnect(); const S = (window.__spy = { strips: [], blur: false, held: false, overlap: false, crit: 0 });
  const look = () => {
    const v = document.querySelector('[data-phc-spotlight-blur]'), cs = v && getComputedStyle(v), strips = [...document.querySelectorAll('[data-phc-spotlight-strip]')].map((e) => e.getAttribute('data-phc-spotlight-strip'));
    if (cs && /blur\(/.test(cs.backdropFilter || cs.webkitBackdropFilter || '')) S.blur = true;
    for (const x of strips) if (!S.strips.includes(x)) S.strips.push(x);
    if (strips.length && (window.__phcHold?.() || 0) > performance.now() + 100) S.held = true;
    if (strips.length && document.querySelector('[data-phc-cut="full"]')) S.overlap = true;
    S.crit = Math.max(S.crit, document.querySelectorAll('[data-phc-spotlight="crit"] [data-phc-spotlight-strip]').length);
  };
  window.__spyObs = new MutationObserver(look); window.__spyObs.observe(document.documentElement, { childList: true, subtree: true, attributes: true }); look();
});
const spied = (p) => p.evaluate(() => window.__spy || { strips: [], blur: false, held: false, overlap: false, crit: 0 });
const settle = async (p) => { await p.waitForFunction(() => (window.__phcHold?.() || 0) <= performance.now() + 5 && !window.__phcCutin?.showing, null, { timeout: 20000 }).catch(() => {}); await pause(p, 150); };
async function hostsTurn() {
  for (let i = 0; i < 40; i++) {
    const u = await cur(host); if (!u) { await pause(host, 200); continue; }
    const owner = u.charId ? (await G(host)).characters[u.charId]?.owner : null;
    if (owner === hostId) return u;
    if (owner === maiId) { await settle(mai); await act(mai, { type: 'combat/end-turn', unitId: u.id }); }
    await pause(host, 300);
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
  // a sure hit that is no crit (an 18 on the die): the takedown alone, not the crit's moment
  await host.evaluate((s) => { window.__phc.getState().game.rng.state = s; }, dieSeed(18, tries));
  await spy(host);
  const err = await act(host, { type: 'combat/attack', unitId: me.id, targetId: boss, mode: 'shot' });
  if (err) { console.log('note the shot at the Warden: ' + err); await act(host, { type: 'combat/end-turn', unitId: me.id }); continue; }
  killed = await host.evaluate(() => window.__phc.getState().game.combat.units.some((u) => u.name === 'Warden' && u.dead));
  if (!killed) { await settle(host); const u = await cur(host); if (u && u.id === me.id && u.ap < 3) await act(host, { type: 'combat/end-turn', unitId: me.id }); continue; }
  // While it shows: the blur behind, the strip, the input held (noted by the watcher in the page, from the moment the
  // strip is put on it; a poll from here missed all three when the machine was busy for longer than the cut-in lasts).
  await host.waitForFunction(() => window.__spy.strips.length > 0, null, { timeout: 20000 }).catch(() => {});
  await pause(host, 350); await snap(host, 'a-takedown');
  const sp = await spied(host); sawBlur = sp.blur; sawStrip = sp.strips.length > 0; holdDuring = sp.held;
}
ok('the Warden is taken down', killed);
ok('the cut-in shows its torn strip over a blurred screen', sawStrip && sawBlur);
ok('input is held while it shows', holdDuring);
await settle(host);
let L = (await logs(host)).slice(before), td = L.find((x) => x.kind === 'takedown');
ok('the host\'s cut-in is a takedown, "' + (td && td.caption) + '", ' + (td && td.label), !!td && /Took down Warden/.test(td.caption) && /^TAKEDOWN · /.test(td.label));
// WALL CLOCK, on purpose (the page's own record of when the cut-in began and ended): its length is the thing under test.
// A timer never fires early, so the lower bound is the plan's; the upper bound is twice the plan and a second more, for a
// busy machine. The exact length is pinned without a browser in apps/web/src/game/spotlight/spotlight.test.ts.
ok('it lasts about 1.4 s × the speed (' + (td && td.end - td.at) + ' ms)', !!td && td.end - td.at >= 1300 * K && td.end - td.at <= 2800 * K + 1000);
await pause(host, 800); L = (await logs(host)).slice(before); td = L.find((x) => x.kind === 'takedown');
const sl = td ? td.slowed : [];
ok('the shot that took it down plays after the cut-in, slowed (tempo ' + (td && td.tempo) + '; ' + sl.map((x) => x.k + ' ' + x.beat).join(', ') + ')', !!td && td.slow && td.tempo === 0.85 && sl.length >= 2 && sl[0].at >= td.end - 5);
const shotEv = sl.find((x) => x.k === 'shot'), i0 = sl.indexOf(shotEv);
const gap = shotEv && sl[i0 + 1] ? sl[i0 + 1].at - shotEv.at : 0;
ok('the shot holds 400 / 0.85 ≈ 471 ms (× the speed: ' + Math.round(400 / 0.85 * K) + ') instead of 400 (beat ' + (shotEv && shotEv.beat) + ', measured ' + gap + ' ms)', !!shotEv && Math.abs(shotEv.beat - 400 / 0.85 * K) <= 6 && gap >= 440 * K);
await settle(host);
ok('and the input hold releases', await host.evaluate(() => window.__phcHold() <= performance.now() + 5));

// 3. (d) The guest saw the same moment.
await pause(mai, 500);
const M = (await logs(mai)).slice(beforeMai), mtd = M.find((x) => x.kind === 'takedown');
ok('the guest sees the same cut-in (' + (mtd && mtd.label + ' · ' + mtd.caption) + ')', !!mtd && !!td && mtd.caption === td.caption && mtd.label === td.label);

// 4. (e) The trigger API: a patron breaks in (the god interjection system's client door), and a click skips it.
await settle(host);
const n0 = (await logs(host)).length;
await host.evaluate((id) => window.dispatchEvent(new CustomEvent('phc:cutin', { detail: { kind: 'god', patron: 'toll_keeper', char: id, reason: 'Stays at 1 HP', line: 'Not yet. You haven\'t paid.' } })), hostChar.id);
const godStrip = await host.locator('[data-phc-spotlight-strip="p:toll_keeper"]').waitFor({ timeout: 30000 }).then(() => true, () => false);
await pause(host, 550); await snap(host, 'e-god');
let last = (await logs(host)).slice(n0)[0];
ok('the trigger API shows the patron\'s torn strip first (' + (last && last.label) + ': ' + (last && last.strips.join(' + ')) + ')', godStrip && !!last && last.label === 'INTERVENTION · THE TOLL-KEEPER' && last.strips[0] === 'The Toll-Keeper');
await pause(host, 1600);
// A click skips it. The cut-in is up for 1.4 s and takes a click from 150 ms in (spotlight/timing.ts CUTIN_ARM_MS): a
// real click from this script has to land in that window, and on a busy machine it can land after it. The page notes
// when the click reached it; a click that came too early or too late proves nothing either way, and the cut-in is asked
// for again (five times at most). A click that came in time must end it, at once, and the page must call it skipped.
let skip = null, skipTries = 0;
for (; skipTries < 5 && !skip; skipTries++) {
  await settle(host);
  const n1 = (await logs(host)).length;
  await host.evaluate(() => { window.__clickAt = 0; window.addEventListener('pointerdown', () => { window.__clickAt = performance.now(); }, { capture: true, once: true });
    window.dispatchEvent(new CustomEvent('phc:cutin', { detail: { kind: 'god', patron: 'old_overcast', char: null, reason: 'Rain' } })); });
  await host.locator('[data-phc-spotlight-strip="p:old_overcast"]').waitFor({ timeout: 30000 }).catch(() => {});
  await pause(host, 160);
  await host.mouse.click(700, 500);
  await host.waitForFunction((b) => { const c = (window.__phcCutins || []).slice(b)[0]; return !!c && !!c.end && !document.querySelector('[data-phc-spotlight]'); }, n1, { timeout: 30000 }).catch(() => {});
  last = (await logs(host)).slice(n1)[0];
  const clickAt = await host.evaluate(() => window.__clickAt);
  if (last && clickAt && clickAt >= last.at + 150 && clickAt < last.at + 1300 * K) skip = { skipped: last.skipped, after: Math.round(last.end - clickAt), len: Math.round(last.end - last.at) };
}
ok('a click skips it (the click reached the page ' + (skip ? 'in time on try ' + skipTries + ': gone ' + skip.after + ' ms after it, ' + skip.len + ' ms in all' : 'too late, ' + skipTries + ' times') + ')', !!skip && skip.skipped === true && skip.after < 600 && !(await host.locator('[data-phc-spotlight]').count()));

// 4b. (f) A crit (Leon: "play it when a critical hit appear in combat too"): a sturdy trooper beside the host's fighter,
// the host's dice set so the shot's d20 is a natural 20 (a test hook on the host's own state, as the Warden's HP above).
const freeBeside = (p, pos) => p.evaluate((pos) => { const cb = window.__phc.getState().game.combat, m = cb.map, [x, y] = pos.split(',').map(Number);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1], [2, 0], [-2, 0], [0, 2], [0, -2]]) {
    const k = (x + dx) + ',' + (y + dy); if (x + dx < 0 || y + dy < 0 || x + dx >= m.w || y + dy >= m.h) continue;
    if ((m.solid || []).includes(k) || cb.units.some((u) => !u.dead && u.pos === k) || (cb.objects || []).some((o) => o.pos === k)) continue; return k; } return null; }, pos);
/** Shoot target (by name) with the next d20 a natural 20, until a shot crits; returns the new cut-ins. */
async function critShot(name, prep) {
  for (let tries = 0, k = 0; tries < 10; tries++) {
    me = await hostsTurn(); if (!me) return null;
    await settle(host);
    const tid = await host.evaluate(([n, prep]) => { const cb = window.__phc.getState().game.combat; const b = cb.units.find((u) => u.name === n && !u.dead); if (!b) return null; if (prep === 'sturdy') { b.hp = b.maxHp = 999; } else { b.hp = 1; } b.armour = 0; return b.id; }, [name, prep]);
    if (!tid) return null;
    const nb = (await logs(host)).length, nbM = (await logs(mai)).length;
    // casings already on the floor are marked, so the check below sees only this shot's
    const seq = await host.evaluate((s) => { document.querySelectorAll('[data-fx-piece]').forEach((e) => e.setAttribute('data-old', ''));
      // when this shot's first casing comes (a watcher, so a slow screenshot can't miss it)
      window.__casingAt = 0; window.__casingObs?.disconnect();
      window.__casingObs = new MutationObserver(() => { if (!window.__casingAt && document.querySelector('[data-fx-piece^="shell:"]:not([data-old])')) window.__casingAt = performance.now(); });
      window.__casingObs.observe(document.body, { childList: true, subtree: true }); const g = window.__phc.getState().game; g.rng.state = s; return g.combat.fxSeq || 0; }, nat20(k++));
    await spy(host);
    const err = await act(host, { type: 'combat/attack', unitId: me.id, targetId: tid, mode: 'shot' });
    if (err) { await act(host, { type: 'combat/end-turn', unitId: me.id }); continue; }
    const shotCrit = await host.evaluate(([seq, uid]) => (window.__phc.getState().game.combat.fx || []).some((e) => e.n > seq && e.k === 'shot' && e.unit === uid && e.crit && e.hit), [seq, me.id]);
    if (!shotCrit) { await settle(host); const u = await cur(host); if (u && u.id === me.id && u.ap < 3) await act(host, { type: 'combat/end-turn', unitId: me.id }); continue; }
    return { nb, nbM, seq };
  }
  return null;
}
await settle(host);
{ const k = await freeBeside(host, (await cur(host)).pos); const e = k ? await act(host, { type: 'sandbox/spawn', tier: 'soldier', weapon: 'fists', at: ref(k), name: 'Rook' }) : 'no free tile'; ok('a sturdy trooper (Rook) beside the host\'s fighter (' + (e || ref(k)) + ')', !e); }
const cr = await critShot('Rook', 'sturdy');
ok('the host\'s shot is a critical hit (a natural 20)', !!cr);
let critCut = null, critStrip = false, casingAt = 0;
if (cr) {
  // the short cut-in is 2.24 s (× the speed): the screenshot is taken as soon as the strip is in (its slide-in ends at 280 ms)
  // (the watcher in the page counts the strips: a count taken from here can come after the cut-in is over)
  await host.waitForFunction(() => window.__spy.crit > 0, null, { timeout: 20000 }).catch(() => {});
  critStrip = (await spied(host)).crit === 1;
  await pause(host, 140); await snap(host, 'f-crit');
  // the casing: thrown out behind the shooter when the slowed shot plays (after the cut-in), never before it
  casingAt = await host.waitForFunction(() => window.__casingAt || 0, null, { timeout: 30000 }).then((h) => h.jsonValue(), () => 0);
  await settle(host); await pause(host, 700);
  critCut = (await logs(host)).slice(cr.nb).find((x) => x.kind === 'crit');
}
ok('the crit cut-in: one strip, "' + (critCut && critCut.label) + '", "' + (critCut && critCut.caption) + '"', critStrip && !!critCut && /^CRITICAL HIT · /.test(critCut.label) && /^Critical hit on (Rook|an unseen hostile)$/.test(critCut.caption) && critCut.strips.length === 1);
ok('it is the short one: its words held 1.6 s to read (' + (critCut && critCut.end - critCut.at) + ' ms in all, words ' + (critCut && critCut.outAt - critCut.textIn) + ' ms)', // (WALL CLOCK, on purpose, from the page's own record: lower bounds from the plan, the upper one with room for a busy machine)
  !!critCut && critCut.end - critCut.at >= 2140 * K && critCut.end - critCut.at <= 4800 * K + 1000 && critCut.outAt - critCut.textIn >= 1600 * K - 1);
const csl = critCut ? critCut.slowed : [], cShot = csl.find((x) => x.k === 'shot');
ok('then the shot plays 15% slower (tempo ' + (critCut && critCut.tempo) + '; ' + csl.map((x) => x.k + ' ' + x.beat).join(', ') + ')', !!critCut && critCut.slow && critCut.tempo === 0.85 && !!cShot && Math.abs(cShot.beat - 400 / 0.85 * K) <= 6 && cShot.at >= critCut.end - 5);
ok('its casing comes with the slowed shot, after the cut-in (' + Math.round(casingAt - (critCut ? critCut.end : 0)) + ' ms after it ended; cut-in ' + (critCut && critCut.at) + '–' + (critCut && critCut.end) + ', casing ' + Math.round(casingAt) + ')', !!critCut && casingAt >= critCut.end - 5);
if (cr) { await pause(mai, 400); const mc = (await logs(mai)).slice(cr.nbM).find((x) => x.kind === 'crit'); ok('the guest sees the same crit cut-in (' + (mc && mc.caption) + ')', !!mc && !!critCut && mc.caption === critCut.caption && mc.label === critCut.label); }

// 4c. (g) A crit that takes down a boss: one moment, the takedown (the crit gives way).
await settle(host);
{ const k = await freeBeside(host, (await cur(host)).pos); const e = k ? await act(host, { type: 'sandbox/spawn', tier: 'boss', weapon: 'fists', at: ref(k), name: 'Titan' }) : 'no free tile'; ok('a boss (Titan) beside the host\'s fighter (' + (e || ref(k)) + ')', !e); }
const cr2 = await critShot('Titan', 'one');
let kd = [];
if (cr2) { await pause(host, 400); await snap(host, 'g-crit-takedown'); await settle(host); await pause(host, 900); kd = (await logs(host)).slice(cr2.nb); }
ok('a crit that takes down a boss plays ONE cut-in, the takedown (' + kd.map((x) => x.kind + ' "' + x.caption + '"').join(', ') + ')', !!cr2 && kd.length === 1 && kd[0].kind === 'takedown' && /Took down Titan/.test(kd[0].caption));

// 4d. (h) A patron intervention (Faith 2.2): the Quartermaster refunds a Witnessed fighter's reload. The patron's strip
// shows once (the engine's spotlight), the map effect plays, and Faith 2.2 draws no cut-in of its own.
await settle(host);
me = await hostsTurn(); await settle(host);
const fe = await act(host, { type: 'sandbox/faith', charId: hostChar.id, belief: 'faithful', patron: 'the_quartermaster', faith: 7, devotion: 5, reset: true });
ok('the host\'s fighter is the Quartermaster\'s (' + (fe || 'ok') + ')', !fe);
const nh = (await logs(host)).length;
await host.evaluate((uid) => { const cb = window.__phc.getState().game.combat, u = cb.units.find((x) => x.id === uid); u.conds = { ...(u.conds || {}), witnessed: 99 }; u.ammo = 0; delete (u.faith || {}).intervened; if (u.faith) u.faith.interventions = 0; u.ap = Math.max(u.ap, 4); }, me.id);
await spy(host);
const re = await act(host, { type: 'combat/reload', unitId: me.id });
const god = await host.waitForFunction((b) => (window.__phcCutins || []).slice(b).some((c) => c.kind === 'god'), nh, { timeout: 30000 }).then(() => true, () => false);
let godStrip2 = false, faithCut = 0;
if (god) { await host.waitForFunction(() => window.__spy.strips.length > 0, null, { timeout: 20000 }).catch(() => {}); const sp = await spied(host); godStrip2 = sp.strips.filter((x) => x === 'p:the_quartermaster').length === 1; faithCut = sp.overlap ? 1 : await host.locator('[data-phc-cut]').count(); await pause(host, 450); await snap(host, 'h-god'); }
await settle(host); await pause(host, 600);
const gl = (await logs(host)).slice(nh).filter((x) => x.kind === 'god');
const qmLog = await host.evaluate(() => window.__phc.getState().game.combat.log.some((l) => /Quartermaster intervenes/.test(l)));
ok('a Witnessed reload: the Quartermaster intervenes (' + (re || 'reloaded') + ')', !re && qmLog);
ok('the patron\'s strip shows once: "' + (gl[0] && gl[0].label) + '" (' + gl.length + ' god cut-in' + (gl.length === 1 ? '' : 's') + ')', god && godStrip2 && gl.length === 1 && /^INTERVENTION · THE QUARTERMASTER$/.test(gl[0].label) && gl[0].strips[0] === 'The Quartermaster');
ok('and Faith 2.2 draws no second cut-in for it', faithCut === 0);

// 4e. (i) One stage: a Miracle (Faith 2.2's scene, Mother Ember at Devotion 10) and a strip asked for while it is up.
await settle(host);
me = await hostsTurn(); await settle(host);
const fm = await act(host, { type: 'sandbox/faith', charId: hostChar.id, belief: 'faithful', patron: 'mother_ember', faith: 7, devotion: 10, reset: true });
const ni = (await logs(host)).length;
const pe = await act(host, { type: 'faith/pray', unitId: me.id, kind: 'miracle' });
const mUp = await host.locator('[data-phc-cut="full"]').waitFor({ timeout: 30000 }).then(() => true, () => false);
let overlap = false;
if (mUp) {
  await pause(host, 700); await snap(host, 'i-miracle');
  await spy(host);
  await host.evaluate(() => window.dispatchEvent(new CustomEvent('phc:cutin', { detail: { kind: 'god', patron: 'nerukhan', char: null, reason: 'speaks' } })));
  // watch until the strip comes on (after the landing): never both at once; a screenshot of the strip once it is in
  // (the watcher in the page notes any moment the two are on the page together)
  if (await host.locator('[data-phc-spotlight-strip="p:nerukhan"]').waitFor({ timeout: 30000 }).then(() => true, () => false)) { await pause(host, 250); await snap(host, 'i-after-miracle'); }
  overlap = (await spied(host)).overlap;
}
const waited = await host.waitForFunction((b) => (window.__phcCutins || []).slice(b).some((c) => c.kind === 'god'), ni, { timeout: 30000 }).then(() => true, () => false);
await settle(host); await pause(host, 400);
ok('a Miracle cuts in (' + (fm || pe || 'prayed') + ')', !fm && !pe && mUp);
const after = (await logs(host)).slice(ni).find((x) => x.kind === 'god');
ok('a strip asked for during it waits for the landing: never drawn over the Miracle, then shown in full (' + (after && (after.end - after.at) + ' ms' + (after.skipped ? ', skipped' : '')) + ')', !overlap && waited && !!after && !after.skipped && after.end - after.at >= 1300);
if (await host.locator('[data-phc-cut-box] .c').count()) await host.locator('[data-phc-cut-box] .c').first().click().catch(() => {});

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
await nora.waitForFunction(() => window.__phc.getState().game.story.entries.some((e) => e.kind === 'narration'), null, { timeout: 30000 });
const room2 = (await G(nora)).code;
await zed.goto(BASE);
await click(zed, 'SETTINGS', { timeout: 30000 });
await zed.getByRole('tab', { name: 'Combat' }).click(); // the shared settings body (UI pass): cut-ins are on its Combat tab
await zed.locator('[data-phc-cutins="off"]').click();
const pref = await zed.evaluate(() => JSON.parse(localStorage.getItem('phc.ui') || '{}').cutins);
ok('Settings: Cut-ins Off is saved (' + pref + ') and pressed', pref === 'off' && (await zed.locator('[data-phc-cutins="off"]').getAttribute('aria-pressed')) === 'true');
await zed.goto(BASE);
await click(zed, 'JOIN A FRIEND', { timeout: 30000 });
await zed.getByPlaceholder('Leon').fill('Zed');
await zed.getByPlaceholder('ROOM CODE').fill(room2);
await click(zed, 'Join ›');
await until(zed, () => !!window.__phc.getState().game && window.__phc.getState().conn === 'online', null, 20000);
await nora.waitForFunction(() => { const g = window.__phc.getState().game; return g.story.await === 'players' && !g.narrator.busy; }, null, { timeout: 20000 }).catch(() => {});
await pause(zed, 800);
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
await spy(nora);
await act(nora, { type: 'check/accept', checkId: ck.id });
const critShown = await nora.waitForFunction((b) => (window.__phcCutins || []).slice(b).some((x) => x.kind === 'crit'), b1, { timeout: 30000 }).then(() => true, () => false);
await nora.waitForFunction(() => window.__spy.strips.length > 0, null, { timeout: 20000 }).catch(() => {});
const blurNow = (await spied(nora)).blur;
await pause(nora, 400); await snap(nora, 'b-crit');
// (until the page's own record says the cut-in ended)
await nora.waitForFunction((b) => { const c = (window.__phcCutins || []).slice(b).find((x) => x.kind === 'crit'); return !!c && !!c.end && !document.querySelector('[data-phc-spotlight]'); }, b1, { timeout: 20000 }).catch(() => {});
await pause(nora, 200);
const crit = (await logs(nora)).slice(b1).find((x) => x.kind === 'crit');
ok('the crit cut-in plays over the blurred area map: "' + (crit && crit.caption) + '"', critShown && blurNow && !!crit && crit.caption === 'Natural 20 on Composure · Hard');
ok('with no slow-mo (nothing slowed, no hold)', !!crit && !crit.slow && crit.slowed.length === 0 && (await nora.evaluate(() => window.__phcHold() <= performance.now() + 5)));
await zed.evaluate(() => window.dispatchEvent(new CustomEvent('phc:cutin', { detail: { kind: 'god', patron: 'nerukhan', char: null, reason: 'speaks' } })));
await pause(zed, 1200);
const zl = await logs(zed), zsaw = await zed.evaluate(() => window.__phc.getState().game.checks.some((k) => k.done && k.roll && k.roll.die === 20));
ok('the Off player had the crit in the state (' + zsaw + ') but saw no cut-in (' + zl.length + '), not even the trigger API\'s', zsaw && zl.length === 0 && !(await zed.locator('[data-phc-spotlight]').count()));

const errs = [...host.errors, ...mai.errors, ...nora.errors, ...zed.errors].filter((e) => !/Failed to load resource|youtube|ERR_|net::/i.test(e));
ok('no page errors (' + errs.slice(0, 3).join(' | ') + ')', errs.length === 0);
await browser.close();
