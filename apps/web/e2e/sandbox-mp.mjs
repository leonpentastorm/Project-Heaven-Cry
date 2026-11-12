// The Proving Ground with friends (multiplayer): the host opens PROVING GROUND → With friends (the room code shown big),
// a guest joins by the code and gets "Recruit 2", both gear up, the guest presses READY, the host starts the fight, both
// see each other's turns (the cut-in on your own, "Waiting for …" on the other's) and the same effects, the squad
// falls and the guest Retries for everyone, the guest leaves (their fighter goes, they land on the title), a third
// player joins for a team fight (Team A against Team B) fought until one side wins, then the host leaves and the
// guest sees "The host closed the Proving Ground." on the title. No Narrator, ever.
// Screenshots land in e2e/shots/sandbox-mp-*.png.
import { chromium, player, click, BASE, OUT, autoConfirm, pause } from './lib.mjs';
const browser = await chromium.launch();
const host = await player(browser, 'host'), mai = await player(browser, 'mai');
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const snap = (p, n) => p.screenshot({ path: OUT + 'sandbox-mp-' + n + '.png' });
const G = (p) => p.evaluate(() => window.__phc.getState().game);
const screen = (p) => p.evaluate(() => window.__phc.getState().screen);
const act = (p, a) => p.evaluate((a) => window.__phc.act(a), a);
const until = (p, f, arg, t = 15000) => p.waitForFunction(f, arg, { timeout: t });
for (const p of [host, mai]) await autoConfirm(p); // Leave and Remove ask in the game's own dialog
const PROVIDERS = /api\.anthropic\.com|api\.openai\.com|generativelanguage\.googleapis\.com|openrouter\.ai|localhost:11434/;
const calls = [];
const watch = (p) => p.on('request', (r) => { if (PROVIDERS.test(r.url())) calls.push(r.url()); });
watch(host); watch(mai);
const drawerOf = (p) => p.locator('aside[aria-label="Proving Ground tools"]');
const openTools = async (p) => { if (!(await drawerOf(p).count())) await p.getByRole('button', { name: 'Open the Proving Ground tools' }).click(); await drawerOf(p).waitFor(); };
const dismissCut = async (p) => { if (await p.locator('[data-phc-cutin]').count()) { await p.mouse.click(1430, 990); await pause(p, 380); } };
const pages = {};
const ownerPage = async (g, u) => { const c = g.characters[u.charId]; return c ? pages[c.owner] : null; };

// 1. The host: PROVING GROUND → With friends
await host.goto(BASE);
await click(host, 'PROVING GROUND', { timeout: 20000 });
await host.getByPlaceholder('Leon').fill('Leon');
await click(host, 'With friends ›');
await until(host, () => !!window.__phc.getState().game?.sandbox);
const invite = host.locator('div[role="dialog"][aria-label="Invite friends"]');
await invite.waitFor({ timeout: 15000 });
let g = await G(host);
const code = g.code;
ok('With friends: the room code ' + code + ' is shown big, with Copy and the link', (await invite.getByText(code, { exact: true }).count()) > 0 && (await invite.getByRole('button', { name: 'Copy the code' }).count()) > 0 && (await invite.getByText('/?room=' + code).count()) > 0);
ok('the host has a Recruit, standalone (from the title)', Object.values(g.characters).map((c) => c.name).join() === 'Recruit' && g.sandbox.standalone === true);
await snap(host, '01-invite');
await invite.getByRole('button', { name: 'Gear up ›' }).click();
pages[(await host.evaluate(() => window.__phc.getState().me.id))] = host;

// 2. A guest joins by the code and gets "Recruit 2", straight into the Proving Ground
await mai.goto(BASE);
await click(mai, 'JOIN A FRIEND', { timeout: 20000 });
await mai.getByPlaceholder('Leon').fill('Mai');
await mai.getByPlaceholder('ROOM CODE').fill(code);
await click(mai, 'Join ›');
await until(mai, () => !!window.__phc.getState().game?.sandbox && window.__phc.getState().screen === 'main');
const maiId = await mai.evaluate(() => window.__phc.getState().me.id); pages[maiId] = mai;
g = await G(mai);
const maiChar = Object.values(g.characters).find((c) => c.owner === maiId);
ok('the guest lands in the Proving Ground with "Recruit 2" (' + (maiChar && maiChar.name) + ')', !!maiChar && maiChar.name === 'Recruit 2' && maiChar.portrait.includes('wick'));
ok('the header chip reads PROVING GROUND · 2 PLAYERS', (await host.getByText('PROVING GROUND · 2 PLAYERS').count()) > 0 && (await mai.getByText('PROVING GROUND · 2 PLAYERS').count()) > 0);
await openTools(mai);
await drawerOf(mai).getByRole('tab', { name: 'Squad' }).click();
const players = drawerOf(mai).locator('section[aria-label="Players"]');
ok('the Squad tab lists both players with their fighters and READY', (await players.getByText('Leon · host').count()) > 0 && (await players.getByText(/Mai \(you\)/).count()) > 0 && (await players.getByText(/Recruit 2/).count()) > 0 && (await players.getByText('○ NOT READY').count()) === 2);
await snap(mai, '02-guest-squad');

// 3. Both gear up; the guest presses READY; the host starts the fight (it shows 1 / 2 ready)
await drawerOf(mai).getByRole('tab', { name: 'Gear' }).click();
await drawerOf(mai).getByRole('button', { name: '✦ Magic kit' }).first().click();
const hostChar = Object.values(g.characters).find((c) => c.owner !== maiId);
await act(host, { type: 'sandbox/give', charId: hostChar.id, item: 'hellraiser_service_rifle', equip: true });
await until(mai, (id) => (window.__phc.getState().game.characters[id].sigils || []).length > 0, maiChar.id);
g = await G(host);
ok('both geared up: the guest has the magic kit, the host a rifle', (g.characters[maiChar.id].sigils || []).length >= 4 && g.characters[hostChar.id].weapon === 'hellraiser_service_rifle');
const refusedStart = await mai.evaluate(() => { const b = [...document.querySelectorAll('aside[aria-label="Proving Ground tools"] button')].find((x) => /Waiting for the host/.test(x.textContent)); return !!b && b.disabled; });
ok('the guest cannot start the fight before everyone is ready (Waiting for the host)', refusedStart);
await drawerOf(mai).getByRole('button', { name: '○ READY?' }).first().click();
await until(host, () => window.__phc.getState().game.sandbox.ready && Object.values(window.__phc.getState().game.sandbox.ready).some(Boolean));
await openTools(host);
const start = drawerOf(host).getByRole('button', { name: /^⚔ Start the fight .*1 \/ 2 ready/ });
ok('the host\'s Start the fight shows 1 / 2 ready', (await start.count()) > 0);
await snap(host, '03-ready');
await act(host, { type: 'sandbox/ai', on: true });
await start.click();
await until(host, () => window.__phc.getState().screen === 'combat');
await until(mai, () => window.__phc.getState().screen === 'combat');
ok('both are on the combat screen, wave 1', (await G(mai)).sandbox.state === 'fighting');

// 4. Both see each other's turns and the effects
let sawMaiCut = false, sawHostWaiting = false, sawHostCut = false, sawMaiWaiting = false, fxSame = true;
for (let i = 0; i < 30 && !(sawMaiCut && sawHostWaiting && sawHostCut && sawMaiWaiting); i++) {
  g = await G(host); if (g.phase !== 'combat') break;
  const cur = g.combat.units.find((u) => u.id === g.combat.order[g.combat.turn]);
  if (!cur || cur.side !== 'pc') { await pause(host, 250); continue; }
  const mine = await ownerPage(g, cur), other = mine === host ? mai : host, name = mine === host ? 'Leon' : 'Mai';
  await mine.waitForSelector('div[data-phc-cutin][aria-label="Your turn: ' + cur.name + '"]', { timeout: 15000 }).then(() => { if (mine === mai) sawMaiCut = true; else sawHostCut = true; }, () => {});
  const waiting = await other.getByText(new RegExp('WAITING FOR ' + name.toUpperCase())).count() + await other.getByText(new RegExp('Waiting for ' + name)).count();
  if (waiting) { if (other === host) sawHostWaiting = true; else sawMaiWaiting = true; }
  await dismissCut(mine);
  const t = g.combat.units.find((u) => u.side === 'foe' && !u.dead);
  if (t && cur.ap >= 2 && cur.ammo > 0) await act(mine, { type: 'combat/attack', unitId: cur.id, targetId: t.id, mode: 'shot' });
  await pause(mine, 400);
  const [a, b] = [await G(host), await G(mai)];
  if (a.combat && b.combat && a.combat.fxSeq !== b.combat.fxSeq) { await pause(mai, 500); const b2 = await G(mai); if (b2.combat && b2.combat.fxSeq !== (await G(host)).combat?.fxSeq) fxSame = false; }
  g = await G(host); const c2 = g.combat && g.combat.units.find((u) => u.id === g.combat.order[g.combat.turn]);
  if (c2 && c2.id === cur.id && g.phase === 'combat') await act(mine, { type: 'combat/end-turn', unitId: cur.id });
  await pause(mine, 300);
}
ok('the guest gets the turn cut-in on their own turn', sawMaiCut);
ok('the host gets the turn cut-in on their own turn', sawHostCut);
ok('the other player sees "Waiting for …" on each turn (host ' + sawHostWaiting + ', guest ' + sawMaiWaiting + ')', sawHostWaiting && sawMaiWaiting);
ok('both browsers carry the same effects (fx sequence)', fxSame);
await snap(mai, '04-guest-fight');

// 5. The squad falls (a few champions join); the guest presses Retry: the wave starts again for everyone
g = await G(host);
if (g.phase === 'combat') {
  for (const at of ['H6', 'H7', 'I6']) await act(host, { type: 'sandbox/spawn', tier: 'boss', weapon: 'hellraiser_lmg', at });
  for (let i = 0; i < 80; i++) {
    g = await G(host); if (g.sandbox.state === 'fallen' || g.phase !== 'combat') break;
    const cur = g.combat.units.find((u) => u.id === g.combat.order[g.combat.turn]);
    if (cur && cur.side === 'pc') { const p = await ownerPage(g, cur); await dismissCut(p); await act(p, { type: 'combat/end-turn', unitId: cur.id }); }
    await pause(host, 250);
  }
}
g = await G(host);
if (g.sandbox.state === 'cleared') { // cleared before it could fall: fight the next one and fall there
  await act(host, { type: 'sandbox/wave', wave: 9 });
  for (let i = 0; i < 80; i++) { g = await G(host); if (g.sandbox.state === 'fallen') break; const cur = g.combat.units.find((u) => u.id === g.combat.order[g.combat.turn]); if (cur && cur.side === 'pc') { const p = await ownerPage(g, cur); await dismissCut(p); await act(p, { type: 'combat/end-turn', unitId: cur.id }); } await pause(host, 250); }
}
g = await G(host);
ok('the squad fell (state ' + g.sandbox.state + ')', g.sandbox.state === 'fallen');
const fell = mai.locator('div[role="dialog"][aria-label="The squad fell"]');
await fell.waitFor({ timeout: 9000 }).catch(() => {});
ok('the guest sees the squad-fell card with Retry', (await fell.getByRole('button', { name: /Retry wave/ }).count()) > 0);
await snap(mai, '05-fell');
const attempt = g.sandbox.attempt;
await fell.getByRole('button', { name: /Retry wave/ }).click();
await until(host, (a) => { const g = window.__phc.getState().game; return g.sandbox.state === 'fighting' && g.sandbox.attempt > a; }, attempt);
await until(mai, (a) => window.__phc.getState().game.sandbox.attempt > a, attempt);
g = await G(host);
ok('Retry for everyone: both fighters back in the fight (attempt ' + g.sandbox.attempt + ')', g.combat.units.filter((u) => u.charId && !u.dead).length === 2);

// 6. The guest leaves: their fighter goes, they land on the title
await pause(mai, 1500); await dismissCut(mai);
await openTools(mai);
await drawerOf(mai).getByRole('button', { name: 'Leave', exact: true }).click();
await until(mai, () => window.__phc.getState().screen === 'home' && !window.__phc.getState().game);
await until(host, (id) => !window.__phc.getState().game.players.some((p) => p.id === id), maiId);
g = await G(host);
ok('the guest is on the title; their fighter is gone from the host\'s game', !Object.values(g.characters).some((c) => c.owner === maiId) && !g.combat.units.some((u) => u.charId === maiChar.id));
await snap(mai, '06-guest-left');

// 7. PvP: a third player joins; the host switches to Team fight; Team A against Team B until one side wins
const ona = await player(browser, 'ona'); await autoConfirm(ona); watch(ona);
await act(host, { type: 'sandbox/stop' });
await until(host, () => window.__phc.getState().game.phase === 'story');
await ona.goto(BASE + '/?room=' + code);
await ona.getByPlaceholder('Leon').fill('Ona');
await click(ona, 'Join ›');
await until(ona, () => !!window.__phc.getState().game?.sandbox);
const onaId = await ona.evaluate(() => window.__phc.getState().me.id); pages[onaId] = ona;
await act(host, { type: 'sandbox/settings', mode: 'teams' });
await until(ona, () => window.__phc.getState().game.sandbox.mode === 'teams');
g = await G(host);
ok('Team fight: no drill units on the map; Leon on Team A, Ona on Team B (' + JSON.stringify(g.sandbox.team) + ')', !(g.story.npcs || []).some((n) => n.side === 'hostile') && g.sandbox.team[g.hostId] === 'A' && g.sandbox.team[onaId] === 'B');
await openTools(ona);
await drawerOf(ona).getByRole('tab', { name: 'Squad' }).click();
ok('the Squad tab shows each player\'s team', (await drawerOf(ona).getByText('■ TEAM B').count()) > 0 && (await drawerOf(ona).getByText('◆ TEAM A').count()) > 0);
await snap(ona, '07-teams');
for (const c of Object.values(g.characters)) await act(pages[c.owner], { type: 'sandbox/give', charId: c.id, item: 'hellraiser_lmg', equip: true });
await act(host, { type: 'sandbox/fight' });
await until(ona, () => window.__phc.getState().game.phase === 'combat');
await until(ona, () => window.__phc.getState().screen === 'combat');
const vOna = await G(ona), vHost = await G(host);
const onaUnit = vOna.combat.units.find((u) => vOna.characters[u.charId]?.owner === onaId);
ok('Team B sees its own fighter as the squad, the host sees it as hostile', onaUnit.side === 'pc' && vHost.combat.units.find((u) => u.id === onaUnit.id).side === 'foe');
const xy = (k) => k.split(',').map(Number);
/** The shortest path (tile keys, from the unit's own tile) to a tile next to the target, around walls, cover, objects
 *  and other units; hazards are avoided when there is another way. */
function pathTo(cb, from, to) {
  const m = cb.map, live = (o) => o.hp == null || o.hp > 0;
  const hard = new Set([...m.solid, ...m.cover, ...(m.full || []), ...(cb.objects || []).filter((o) => live(o) && !/trap|fire|toxic|rubble/.test(o.kind) && !(/door/.test(o.kind) && o.open)).map((o) => o.pos),
    ...cb.units.filter((u) => !u.dead && u.id !== from.id).map((u) => u.pos)]);
  const soft = new Set((cb.objects || []).filter((o) => live(o) && /trap|fire|toxic/.test(o.kind)).map((o) => o.pos));
  const goal = (k) => { const [x, y] = xy(k), [a, b] = xy(to.pos); return Math.max(Math.abs(x - a), Math.abs(y - b)) === 1; };
  for (const avoid of [true, false]) {
    const prev = { [from.pos]: null }, q = [from.pos];
    while (q.length) {
      const k = q.shift(); if (goal(k)) { const out = []; for (let c = k; c; c = prev[c]) out.unshift(c); return out; }
      const [x, y] = xy(k);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const n = (x + dx) + ',' + (y + dy);
        if (x + dx < 0 || y + dy < 0 || x + dx >= m.w || y + dy >= m.h || n in prev || hard.has(n) || (avoid && soft.has(n))) continue;
        prev[n] = k; q.push(n);
      }
    }
  }
  return [from.pos];
}
let winner = null;
for (let i = 0; i < 240 && !winner; i++) {
  g = await G(host);
  if (g.phase !== 'combat') { winner = g.sandbox.lastWin; break; }
  const cur = g.combat.units.find((u) => u.id === g.combat.order[g.combat.turn]);
  const p = cur && cur.charId ? await ownerPage(g, cur) : null;
  if (!p) { await pause(host, 250); continue; }
  await dismissCut(p);
  const foe = g.combat.units.find((u) => u.charId && u.side !== cur.side && !u.dead && !u.downed);
  if (!foe) { await pause(host, 250); continue; }
  const before = JSON.stringify([cur.ap, cur.pos, cur.ammo]);
  if (cur.ap >= 2 && cur.ammo > 0) { await act(p, { type: 'combat/attack', unitId: cur.id, targetId: foe.id, mode: 'shot' }); await pause(p, 350); }
  let now = (await G(host)).combat?.units.find((u) => u.id === cur.id);
  if (now && cur.ammo === 0 && cur.ap >= 2) { await act(p, { type: 'combat/reload', unitId: cur.id }); await pause(p, 300); now = (await G(host)).combat?.units.find((u) => u.id === cur.id); }
  if (now && JSON.stringify([now.ap, now.pos, now.ammo]) === before && now.ap >= 1) {
    // Out of reach or sight: walk the shortest open path toward the other team (a search over the map the view carries).
    const path = pathTo(g.combat, cur, foe);
    for (let k = Math.min(4, path.length - 1); k >= 1; k--) {
      await act(p, { type: 'combat/move', unitId: cur.id, to: path[k] });
      await pause(p, 200);
      const moved = (await G(host)).combat?.units.find((u) => u.id === cur.id);
      if (!moved || moved.pos !== cur.pos) break;
    }
    const now2 = (await G(host)).combat?.units.find((u) => u.id === cur.id);
    if (now2 && now2.ap >= 2) { const adj = Math.max(Math.abs(xy(now2.pos)[0] - xy(foe.pos)[0]), Math.abs(xy(now2.pos)[1] - xy(foe.pos)[1])) <= 1; await act(p, { type: 'combat/attack', unitId: cur.id, targetId: foe.id, mode: adj ? 'melee' : 'shot' }); await pause(p, 300); }
  }
  if (i % 20 === 19) { const x = (await G(host)).combat; if (x) console.log('  team fight round ' + x.round + ': ' + x.units.filter((u) => u.charId).map((u) => u.name + ' ' + u.hp + ' HP at ' + u.pos).join(' · ')); }
  g = await G(host); if (g.phase !== 'combat') { winner = g.sandbox.lastWin; break; }
  const c2 = g.combat.units.find((u) => u.id === g.combat.order[g.combat.turn]);
  if (c2 && c2.id === cur.id) await act(p, { type: 'combat/end-turn', unitId: cur.id });
  await pause(p, 200);
}
g = await G(host);
ok('the team fight ends with a winner: Team ' + winner + ' (' + (g.combat?.summary || '') + ')', !!winner && g.phase === 'story');
ok('everyone is back to gearing up with full HP', Object.values(g.characters).every((c) => !c.dead && c.hp > 1));
const endCard = ona.locator('div[role="dialog"][aria-label="Team ' + winner + ' wins"]');
await endCard.waitFor({ timeout: 6000 }).catch(() => {});
ok('Team B\'s player sees the result from their side', (await endCard.getByText(winner === 'B' ? '✓ YOUR TEAM WINS' : '✕ YOUR TEAM IS DOWN').count()) > 0);
await snap(ona, '08-team-end');

// 8. The host leaves: the room closes, the guest sees why and lands on the title
const hostEnd = host.locator('div[role="dialog"][aria-label="Team ' + winner + ' wins"]');
if (await hostEnd.count()) await hostEnd.getByRole('button', { name: 'Gear up ›' }).click();
await pause(host, 600);
await openTools(host);
await drawerOf(host).getByRole('button', { name: 'Leave', exact: true }).click();
await until(host, () => window.__phc.getState().screen === 'home' && !window.__phc.getState().game);
ok('the host leaves to the title (the room was only for the Proving Ground)', true);
await until(ona, () => window.__phc.getState().screen === 'home' && !window.__phc.getState().game);
ok('the guest sees "The host closed the Proving Ground." on the title', (await ona.getByText('The host closed the Proving Ground.').count()) > 0);
await snap(ona, '09-closed');

// 9. No Narrator anywhere
ok('no request went to an AI provider (' + calls.length + ')', calls.length === 0);
const errs = [...host.errors, ...mai.errors, ...ona.errors];
console.log('  page errors:', JSON.stringify(errs));
if (errs.length) process.exitCode = 1;
await browser.close();
