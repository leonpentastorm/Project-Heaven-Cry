// Combat feel v1 in a real browser: the combat-start transition, turn banners and the your-turn card, shot / reload /
// melee / explosion / Sigil / Outburst effects over the grid, Fan the Hammer across several volleys (a target dying
// mid-volley, the volley that ends the wave) with no page errors, then the story screen: the area map's red attack
// grid and move planning, Ask / Silent on the skill panel, and an Echo reroll that keeps the dice table open.
// Screenshots (deviceScaleFactor 1) land in e2e/shots/feel-*.png; effects are caught ~80–300 ms after the action.
import { chromium, player, click, hostAs, BASE, OUT, pickAction } from './lib.mjs';
const browser = await chromium.launch();
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };
const xy = (k) => k.split(',').map(Number);
const cheb = (a, b) => { const [ax, ay] = xy(a), [bx, by] = xy(b); return Math.max(Math.abs(ax - bx), Math.abs(ay - by)); };

// ======================================================================================================
// Part 1: the Proving Ground (fast fights, no Narrator)
// ======================================================================================================
const p = await player(browser, 'host');
p.on('response', (r) => { if (r.status() >= 400) console.log('  http', r.status(), r.url()); });
const snap = (n) => p.screenshot({ path: OUT + 'feel-' + n + '.png' });
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const st = () => p.evaluate(() => { const s = window.__phc.getState(), g = s.game, cb = g.combat; const u = cb && cb.units.find((x) => x.side === 'pc'); return { g, cb, u, c: u && g.characters[u.charId], toast: s.toast }; });
const fxCount = () => p.evaluate(() => document.querySelector('.phc-fx-layer')?.childElementCount || 0);
const tok = (k) => p.locator('button.phc-tok[aria-label^="' + ref(k) + ' ·"]').first();
const fxSeq = async () => (await st()).cb.fxSeq || 0;
/** Run an action, then screenshots at the given ms; returns how many effect elements were up at the first one. */
async function catchFx(name, go, at = [90, 220, 380]) {
  await dismissCut();
  const n0 = await fxSeq();
  await go();
  let peak = 0, t = 0;
  for (const ms of at) { await p.waitForTimeout(Math.max(0, ms - t)); t = ms; peak = Math.max(peak, await fxCount()); await snap(name + '-' + ms); }
  return { peak, events: (await st()).cb.fx.filter((e) => e.n > n0) };
}
const dismissCut = async () => { if (await p.locator('[data-phc-cutin]').count()) { await p.mouse.click(1430, 990); await p.waitForTimeout(380); } };
const pickAct = async (re) => { await dismissCut(); await pickAction(p, re); await p.waitForTimeout(120); };
const confirm = async () => { const b = p.getByRole('button', { name: /^Confirm/ }).first(); if (!(await b.isEnabled())) return false; await b.click(); return true; };
async function newRound() {
  // Enemy AI is off: ending the turn hands it straight back with full AP.
  await dismissCut();
  await p.getByRole('button', { name: 'End turn', exact: true }).click();
  await p.waitForFunction(() => { const cb = window.__phc.getState().game.combat; const u = cb.units.find((x) => x.id === cb.order[cb.turn]); return u && u.side === 'pc' && u.ap >= 5; }, null, { timeout: 8000 });
  await p.waitForSelector('[data-phc-cutin]', { timeout: 1800 }).catch(() => {}); await dismissCut();
}
/** Clear the field but keep one far-off hostile, so killing the test target doesn't end the wave. */
async function clearField() {
  await act({ type: 'sandbox/clear' });
  const me = (await st()).u.pos, [mx] = xy(me);
  for (const k of (mx < 8 ? ['15,11', '15,0', '14,11', '14,0', '15,6'] : ['0,11', '0,0', '1,11', '1,0', '0,6'])) if (!(await act({ type: 'sandbox/spawn', tier: 'minion', weapon: 'fists', at: ref(k) }))) break;
}
async function spawnNear(at, dists, tier = 'minion', weapon = 'fists') {
  const [x, y] = xy(at), out = [];
  for (const d of dists) for (const [dx, dy] of [[d, 0], [d, 1], [d, -1], [0, d], [0, -d], [-d, 0], [d, 2], [d, -2], [-d, 1]]) {
    const k = (x + dx) + ',' + (y + dy); if (x + dx < 0 || y + dy < 0 || x + dx > 15 || y + dy > 11) continue;
    const before = (await st()).cb.units.length;
    const err = await act({ type: 'sandbox/spawn', tier, weapon, at: ref(k) });
    if (!err && (await st()).cb.units.length > before) { out.push(k); return out; }
  }
  return out;
}

await p.goto(BASE);
await click(p, 'PROVING GROUND');
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 8000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 8000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
await p.mouse.move(1430, 990); // the cursor rests away from the card
// The Proving Ground opens gearing up on the map: start the fight with the tools' button.
await p.waitForFunction(() => window.__phc.getState().game?.sandbox?.state === 'ready', null, { timeout: 15000 });
await p.getByRole('button', { name: /^⚔ Start the fight/ }).first().click();
await p.mouse.move(1430, 990);
await p.waitForFunction(() => window.__phc.getState().game?.phase === 'combat', null, { timeout: 15000 });
const t0 = Date.now();
// 1. Into the fight, the banner, the card
await p.waitForTimeout(250); await snap('01-into-fight');
await p.waitForSelector('text=YOUR TURN', { timeout: 6000 });
await snap('02-turn-banner');
ok('the turn banner drops in (' + (Date.now() - t0) + ' ms after the fight began)', true);
await p.waitForSelector('[data-phc-cutin]', { timeout: 12000 }); // after the hostiles' opening turns, when they act first
await p.waitForTimeout(450); await snap('03-cut-in');
ok('the your-turn card slides in', true);
const cutCmds = await p.locator('[data-phc-cutin] button').allTextContents();
console.log('  card commands:', cutCmds.map((x) => x.replace(/\s+/g, ' ')).join(' | '));
// The card goes by itself after ~2 s when the cursor isn't on it
await p.waitForFunction(() => !document.querySelector('[data-phc-cutin]'), null, { timeout: 4500 }).then(() => ok('the card leaves by itself', true), () => ok('the card leaves by itself', false));
// A command on the card picks that action: bring the card back with a new round and press its first command
await act({ type: 'sandbox/ai', on: false }); await act({ type: 'sandbox/auto', on: false }); await clearField();
await p.getByRole('button', { name: 'End turn', exact: true }).click();
await p.waitForSelector('[data-phc-cutin]', { timeout: 6000 });
await p.locator('[data-phc-cutin] button', { hasText: /^1/ }).first().click();
await p.waitForTimeout(300);
const pressed = await p.locator('button.phc-cb-act[aria-pressed="true"]').allTextContents();
ok('a command on the card selects it on the panel: ' + pressed.join(','), pressed.some((t) => /^Shot/.test(t)));

// 2. A shot: muzzle flash, tracer, hit shake, damage number, decal
let s = await st();
const me = s.u, cid = s.c.id;
console.log('  me at', ref(me.pos), me.weapon);
const foes = await spawnNear(me.pos, [3, 4]);
ok('a target stands at ' + foes.map(ref).join(','), foes.length === 1);
await p.waitForTimeout(400);
await pickAct(/^Shot/);
await tok(foes[0]).hover(); await p.waitForTimeout(200);
await snap('04-shot-aim');
const chip = await p.locator('text=/HIT \\d+%/').count();
ok('hovering the target shows the odds', chip > 0);
await tok(foes[0]).click(); await p.waitForTimeout(120);
let r = await catchFx('05-shot', confirm, [70, 160, 300]);
ok('the shot plays: ' + r.events.map((e) => e.k + (e.hit ? '(hit ' + e.dmg + ')' : e.k === 'shot' ? '(miss)' : '')).join(' ') + ' · peak ' + r.peak + ' fx nodes', r.events.some((e) => e.k === 'shot') && r.peak > 0);

// 3. Reload: a timer ring over the shooter
s = await st();
if (s.u.ammo >= (s.u.ammo ?? 0) && s.u.ap < 2) await newRound();
await pickAct(/^(Reload|Swap magazine|Speedloader|Swap drum|Feed belt)/);
r = await catchFx('06-reload', confirm, [120, 450, 900]);
const ringUp = r.events.some((e) => e.k === 'reload');
ok('reload plays a timer ring: ' + r.events.map((e) => e.k + (e.dur ? ':' + e.dur + 'ms' : '')).join(' '), ringUp && r.peak > 0);

// 4. Melee: a knife, a foe next to us, an arc
await newRound();
await act({ type: 'sandbox/give', charId: cid, item: 'combat_knife', equip: true });
await clearField();
s = await st();
const adj = await spawnNear(s.u.pos, [1]);
await p.waitForTimeout(300);
await pickAct(/^(Melee|Strike)/);
await tok(adj[0]).click(); await p.waitForTimeout(120);
r = await catchFx('07-melee', confirm, [60, 140, 260]);
ok('melee plays an arc: ' + r.events.map((e) => e.k).join(' '), r.events.some((e) => e.k === 'melee') && r.peak > 0);

// 5. An explosion: shoot a fuel drum
await newRound();
await act({ type: 'sandbox/give', charId: cid, item: 'hellraiser_service_rifle', equip: true });
await clearField();
s = await st();
const drums = await p.evaluate(() => { const cb = window.__phc.getState().game.combat; return (cb.objects || []).filter((o) => /drum|barrel|fuel/i.test(o.name || o.id || '') && (o.hp ?? 1) > 0).map((o) => o.pos); });
console.log('  drums at', drums.map(ref).join(','));
let boom = false;
for (const d of drums) {
  if ((await st()).u.ap < 2) await newRound();
  r = await catchFx('08-explosion', () => act({ type: 'combat/shoot-cover', unitId: s.u.id, tile: d }), [80, 200, 420]);
  if (r.events.some((e) => e.k === 'explode')) { boom = true; break; }
  console.log('  drum', ref(d), '->', (await st()).toast?.text || r.events.map((e) => e.k).join(' '));
}
ok('a fuel drum goes up with an explosion', boom);

// 6. Magic: a Sigil evoke and an Outburst release
await newRound();
// A focus counts only in a hand (spec: Hands 2, item 630): the rifle fills both, so a one-handed revolver goes in the main
// hand and the Evoker in the off hand (the Emanator stays in the pack: the Outburst draws on the air).
for (const a of [{ item: 'drifter_revolver', equip: true }, { item: 'evoker', equip: true }, { item: 'emanator' }, { item: 'standard_core', qty: 4 }]) { const e = await act({ type: 'sandbox/give', charId: cid, ...a }); if (e) console.log('  give', a.item, e); }
for (const w of ['fire', 'seek']) await act({ type: 'sandbox/learn', charId: cid, word: w });
await act({ type: 'sandbox/learn', charId: cid, school: 'damage' });
const designErr = await act({ type: 'sandbox/design', charId: cid, design: { id: '', name: 'Red Hand', school: 'damage', modules: [] } });
if (designErr) console.log('  design:', designErr);
await clearField();
s = await st();
// A row through us with a free tile behind (the Line's far end) and a free tile 2 ahead (the target): rules 1.4 Lines
// fire along themselves from their end.
const lane = await p.evaluate((at) => { const cb = window.__phc.getState().game.combat, m = cb.map, [x, y] = at.split(',').map(Number);
  const bad = new Set([...(m.solid || []), ...(m.cover || []), ...(m.full || []), ...(cb.objects || []).map((o) => o.pos), ...cb.units.filter((u) => !u.dead).map((u) => u.pos)]);
  const free = (a, b) => a >= 0 && b >= 0 && a < m.w && b < m.h && !bad.has(a + ',' + b);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) if (free(x - dx, y - dy) && free(x + dx, y + dy) && free(x + 2 * dx, y + 2 * dy)) return { back: (x - dx) + ',' + (y - dy), foe: (x + 2 * dx) + ',' + (y + 2 * dy) };
  return null; }, s.u.pos);
const mfoe = lane && !(await act({ type: 'sandbox/spawn', tier: 'minion', weapon: 'fists', at: ref(lane.foe) })) ? [lane.foe] : await spawnNear(s.u.pos, [2]);
await p.waitForTimeout(300);
s = await st();
console.log('  magic:', JSON.stringify({ words: s.u.mg?.words, designs: s.u.mg?.designs?.map((d) => d.name), charge: s.u.mg?.charge, mp: s.u.mg?.mp }));
if (!s.u.mg?.charge) { const e = await act({ type: 'combat/core', unitId: s.u.id }); if (e) console.log('  core', e); await p.waitForTimeout(300); s = await st(); }
// Rules 1.4: a Line is drawn on your own tiles, one glyph a tile. FIRE here, a step away from the foe, SEEK there; from
// that end the Line fires back along itself at the foe.
{ const e = await act({ type: 'combat/draw', unitId: s.u.id, word: 'fire', tile: s.u.pos }); if (e) console.log('  draw fire', e); }
const [fx0, fy0] = xy(s.u.pos), [tx0, ty0] = xy(mfoe[0]), back = lane ? lane.back : (fx0 + Math.sign(fx0 - tx0)) + ',' + (fy0 + Math.sign(fy0 - ty0));
{ const e = await act({ type: 'combat/move', unitId: s.u.id, to: back }); if (e) console.log('  step', e); }
s = await st();
{ const e = await act({ type: 'combat/draw', unitId: s.u.id, word: 'seek', tile: s.u.pos }); if (e) console.log('  draw seek', e); }
await p.waitForTimeout(500); await snap('09-glyphs');
r = await catchFx('10-evoke', () => act({ type: 'combat/evoke', unitId: s.u.id, tile: s.u.pos, aim: mfoe[0] }), [120, 300, 600]);
ok('a Sigil evoke plays: ' + r.events.map((e) => e.k).join(' ') + ((await st()).toast ? ' · ' + (await st()).toast.text : ''), r.events.some((e) => e.k === 'evoke') && r.peak > 0);
await newRound();
s = await st();
const d0 = s.u.mg?.designs?.[0];
if (!s.cb.units.some((x) => x.side === 'foe' && !x.dead && cheb(x.pos, s.u.pos) <= 3)) { await spawnNear(s.u.pos, [2, 3]); await p.waitForTimeout(300); s = await st(); }
const live = s.cb.units.filter((x) => x.side === 'foe' && !x.dead).sort((a, b) => cheb(a.pos, s.u.pos) - cheb(b.pos, s.u.pos))[0] || { pos: mfoe[0] };
r = await catchFx('11-outburst', () => act({ type: 'combat/outburst', unitId: s.u.id, design: d0?.id, aim: live.pos }), [150, 350, 700]);
ok('an Outburst release plays: ' + r.events.map((e) => e.k).join(' ') + ((await st()).toast ? ' · ' + (await st()).toast.text : ''), r.events.some((e) => e.k === 'release' || e.k === 'outburst') && r.peak > 0);

// 7. Fan the Hammer: several volleys, a target dying mid-volley, the volley that ends the wave. No page errors.
await newRound();
await act({ type: 'sandbox/give', charId: cid, item: 'drifter_revolver', equip: true });
await act({ type: 'sandbox/clear' });
s = await st();
const fanFoes = [...await spawnNear(s.u.pos, [2]), ...await spawnNear(s.u.pos, [3]), ...await spawnNear(s.u.pos, [4])];
ok('three targets for Fan the Hammer: ' + fanFoes.map(ref).join(','), fanFoes.length === 3);
await p.waitForTimeout(400);
let volleys = 0, midDeath = false, ended = false;
for (let i = 0; i < 14 && !ended; i++) {
  s = await st();
  if (s.cb.over || s.g.sandbox?.state !== 'fighting') { ended = true; break; }
  const foe = s.cb.units.find((x) => x.side === 'foe' && !x.dead && !x.downed);
  if (!foe) break;
  if (s.u.jammed || s.u.ammo <= 0 || s.u.ap < 3) {
    if (s.u.ap < 2) { await newRound(); continue; }
    await pickAct(s.u.jammed ? /^Clear/ : /^(Reload|Swap magazine|Speedloader|Swap drum|Feed belt)/); await confirm(); await p.waitForTimeout(900); continue;
  }
  await pickAct(/^Fan the Hammer/);
  await tok(foe.pos).click(); await p.waitForTimeout(100);
  const hp0 = foe.hp;
  r = await catchFx('12-fan-' + volleys, confirm, [90, 260, 520]);
  volleys++;
  const shots = r.events.filter((e) => e.k === 'shot'), killedAt = shots.findIndex((e) => e.killed);
  if (killedAt >= 0 && killedAt < shots.length - 1) midDeath = true;
  if (killedAt >= 0 && killedAt < 2) midDeath = true; // it died before the third shot: the volley stopped there
  console.log('  volley', volleys, 'at', foe.name, hp0 + 'HP:', shots.map((e) => (e.hit ? e.dmg + (e.killed ? '†' : '') : 'miss') + (e.jam ? '/jam' : '')).join(' '), '· errors', p.errors.length);
  await p.waitForTimeout(700);
}
s = await st();
ended = ended || s.g.sandbox?.state === 'cleared';
ok('Fan the Hammer: ' + volleys + ' volleys, no page errors', volleys >= 2 && p.errors.length === 0);
ok('a target died mid-volley (the rest of the volley stopped)', midDeath);
ok('the last volley cleared the wave (state ' + s.g.sandbox?.state + ')', ended);
await p.waitForTimeout(900); await snap('13-wave-cleared');
ok('the app is still on screen', await p.evaluate(() => (document.getElementById('root')?.innerHTML.length || 0) > 5000));

// 8. An enemy turn gets its own banner
await act({ type: 'sandbox/wave' });
await p.waitForFunction(() => window.__phc.getState().game.sandbox?.state === 'fighting', null, { timeout: 8000 });
await act({ type: 'sandbox/ai', on: true });
await p.waitForTimeout(1600); await dismissCut();
s = await st();
const foeBanner = p.waitForSelector('text=HOSTILE', { timeout: 8000 }).then(() => true, () => false);
if ((s.cb.units.find((x) => x.id === s.cb.order[s.cb.turn]) || {}).side === 'pc') await p.getByRole('button', { name: 'End turn', exact: true }).click().catch(() => {});
const sawFoe = await foeBanner; await snap('14-hostile-banner');
ok('a hostile turn shows its banner', sawFoe);
console.log('  page errors:', JSON.stringify(p.errors));
if (p.errors.length) process.exitCode = 1;
await p.close();

// ======================================================================================================
// Part 2: the story screen (scripted Narrator)
// ======================================================================================================
const h = await player(browser, 'story');
const hs = (n) => h.screenshot({ path: OUT + 'feel-' + n + '.png' });
const hact = (a) => h.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const G = () => h.evaluate(() => window.__phc.getState().game);
const waitPlayers = () => h.waitForFunction(() => window.__phc.getState().game.story.await === 'players', null, { timeout: 15000 });
await hostAs(h, 'Leon');
await click(h, 'Create a character');
await h.getByPlaceholder('What the squad calls you').fill('MPAT');
await h.locator('main button[aria-pressed]').first().click();
await click(h, 'Next ›'); await h.locator('button', { hasText: /^Use .* ›$/ }).first().click();
await click(h, 'Next ›'); await click(h, 'Next ›'); await click(h, 'Next ›'); await h.locator('button', { hasText: 'Line soldier' }).first().click();
await click(h, 'Next ›'); await click(h, 'Lock in and bring to the room');
await h.evaluate(() => window.__phc.setNarrator({ scripted: true }));
await click(h, 'Start session');
await h.waitForSelector('.phc-story', { timeout: 15000 });
await waitPlayers();
let g = await G();
const ch = Object.values(g.characters)[0];
const trained = Object.entries(ch.skills).filter(([, v]) => v > 0).map(([k]) => k);
console.log('  trained skills:', trained.join(', '));

// 9. Ask / Silent: a hook on one trained skill (TN too high to come through on its own)
const voicedSkill = trained[0];
await hact({ type: 'narrator/turn', turn: { narration: 'The hangar hums. Somewhere a relay clicks twice.', hooks: [{ skill: voicedSkill, tn: 20, truth: 'true', line: 'Two clicks. Somebody is listening on this channel.' }] } });
await waitPlayers(); await h.waitForTimeout(400);
const skillsTab = h.getByRole('tab', { name: /SKILLS/ }).first();
if (await skillsTab.count()) await skillsTab.click();
await h.waitForTimeout(400);
const asks = await h.getByRole('button', { name: /^Ask: / }).count(), silents = await h.getByRole('button', { name: /^Silent: / }).count();
await hs('15-skills-ask-silent');
ok('the skill panel: ' + asks + ' Ask, ' + silents + ' Silent (Body tab)', asks === 1 && silents >= 8);
ok('Silent is disabled', await h.getByRole('button', { name: /^Silent: / }).first().isDisabled());

// 10. Echo reroll: the table stays and the throw plays again. The scripted Narrator answers a finished check at once
// (with the M813 fight), so from here on the test plays the Narrator itself: no provider, its turns sent by hand.
await h.evaluate(() => window.__phc.setNarrator({ scripted: false, key: '' }));
let rerolled = false;
for (let tries = 0; tries < 6 && !rerolled; tries++) {
  g = await G();
  await hact({ type: 'narrator/turn', turn: { narration: 'The lock on the gantry door is a cheap one, rusted shut.', checks: [{ charId: ch.id, skills: [trained[trained.length - 1]], tn: 20, stakes: 'Force the rusted lock.' }] } });
  await h.waitForSelector('text=CLICK TO ROLL', { timeout: 10000 }).catch(() => {});
  const callBtn = h.locator('button', { hasText: 'Force the rusted lock.' }).last();
  await h.waitForTimeout(300); // a new check of yours opens the dice table by itself; else open it from its line
  if (await callBtn.count() && !(await h.locator('div[aria-label="Dice table"]').count())) await callBtn.click();
  await h.waitForSelector('div[aria-label="Dice table"]', { timeout: 5000 });
  await click(h, /Throw/);
  await h.waitForSelector('text=/SUCCESS|FAILURE|COMPLICATION/', { timeout: 6000 });
  await h.waitForTimeout(500);
  const rb = h.getByRole('button', { name: /Spend 1 Echo/ });
  if (await rb.count() && await rb.isEnabled()) {
    await hs('16-dice-failed');
    await rb.click();
    for (const ms of [150, 500, 1100]) { await h.waitForTimeout(ms === 150 ? 150 : ms === 500 ? 350 : 600); await hs('17-reroll-' + ms); }
    const still = await h.locator('div[aria-label="Dice table"]').count();
    const math = await h.locator('div[aria-label="Dice table"]').textContent();
    ok('the dice table stays open through the reroll: ' + (math.match(/Echo reroll \(was \d+\)[^A-Z]*/) || [''])[0].trim(), still > 0 && /Echo reroll/.test(math));
    rerolled = true;
  }
  if (await h.getByRole('button', { name: 'Continue', exact: true }).count()) await click(h, 'Continue', { exact: true });
  await h.waitForTimeout(400);
  const close = h.locator('div[role="dialog"] button', { hasText: /^Close$/ });
  if (await close.count()) await close.first().click().catch(() => {});
}
ok('an Echo reroll was offered on a failure', rerolled);
await h.waitForTimeout(400);
await h.waitForFunction(() => !document.querySelector('div[aria-label="Dice table"]'), null, { timeout: 5000 }).then(() => ok('Continue closes the table', true), () => ok('Continue closes the table', false));

// 11. The area map: move planning and the red attack grid
await hact({ type: 'narrator/turn', turn: { narration: 'The lock gives with a shriek of rust.' } });
await waitPlayers();
g = await G();
const at = g.story.positions[ch.id], [cx, cy] = xy(at);
const occ = new Set([...Object.values(g.story.positions), ...(g.story.npcs || []).map((n) => n.pos), ...(g.story.objects || []).map((o) => o.pos)]);
const spot = [[4, 0], [-4, 0], [0, 4], [0, -4], [4, 2], [-4, 2], [3, 3], [5, 1]].map(([dx, dy]) => (cx + dx) + ',' + (cy + dy)).find((k) => { const [x, y] = xy(k); return !occ.has(k) && x >= 0 && y >= 0 && x < 16 && y < 11; });
await hact({ type: 'narrator/turn', turn: { narration: 'A raider steps out from behind the crates.', npcs: [{ action: 'place', name: 'Raider', side: 'hostile', tier: 'minion', weapon: 'fists', at: ref(spot) }] } });
await waitPlayers(); await h.waitForTimeout(600);
await click(h, 'Area map');
const dlg = h.locator('div[role="dialog"][aria-label="Area map"]');
await dlg.waitFor();
await h.waitForTimeout(500);
const atile = (k) => dlg.locator('button.phc-tok[aria-label^="' + ref(k) + ':"], button.phc-tok[aria-label^="' + ref(k) + ' ·"]').first();
// Move: hover a tile two steps off, the path and its cost
const mv = dlg.getByRole('button', { name: /^Move/ }).first();
if (await mv.count()) await mv.click();
const two = [[2, 0], [-2, 0], [0, 2], [0, -2], [1, 1]].map(([dx, dy]) => (cx + dx) + ',' + (cy + dy)).find((k) => !occ.has(k) && xy(k)[0] >= 0 && xy(k)[1] >= 0);
await atile(two).hover(); await h.waitForTimeout(300);
await hs('18-area-move-plan');
const plan = (await dlg.textContent()).match(/−\d+(\.\d+)? AP · \d+ tiles?/);
ok('move planning shows the cost: ' + (plan && plan[0]), !!plan);
// Shot: the red grid and the target's odds
await dlg.getByRole('button', { name: /^Shot/ }).first().click(); await h.waitForTimeout(300);
const npc = (await G()).story.npcs.find((n) => n.name === 'Raider');
await atile(npc.pos).hover(); await h.waitForTimeout(300);
await hs('19-area-red-grid');
const reds = await dlg.evaluate((d) => [...d.querySelectorAll('*')].filter((e) => /246, 81, 87|F65157/i.test(getComputedStyle(e).backgroundColor + getComputedStyle(e).borderColor)).length);
ok('the attack range shows in red (' + reds + ' red cells)', reds > 8);
const odds = (await dlg.textContent()).match(/\d+% · \d+ AP/);
ok('hovering the raider shows the odds: ' + (odds && odds[0]), !!odds);

// 12. The fight starts: blur, slash, flip
const startAt = Date.now();
await hact({ type: 'narrator/turn', turn: { narration: 'The raider shouts and his friends come running.', combat: { name: 'Crates', enemies: [{ name: 'Raider', tier: 'minion', weapon: 'fists' }, { name: 'Raider Two', tier: 'minion', weapon: 'fists' }] } } });
await h.waitForTimeout(120); await hs('20-combat-transition-120');
await h.waitForTimeout(250); await hs('21-combat-transition-370');
await h.waitForTimeout(450); await hs('22-combat-transition-820');
await h.waitForSelector('text=ACTION POINTS', { timeout: 10000 });
ok('the fight screen is up ' + (Date.now() - startAt) + ' ms after the call', true);
await h.waitForTimeout(1200); await hs('23-combat-first-turn');
console.log('  page errors:', JSON.stringify(h.errors));
if (h.errors.length) process.exitCode = 1;
await browser.close();
