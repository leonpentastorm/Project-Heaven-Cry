// Survival, one stage (rules 1.41; docs/design/survival-spec.md section 8.2; build step 3). Solo, seed fixed
// (localStorage phc.testSeed), the room a test room (phc.testRoom: the engine takes run/skip only there), at 1280 x 720.
// Start a run from the picker; the path map: every node drawn with its word and icon, the first row lit, a node's hover
// card says what it gives with the engine's XP and credits, an unlit node can't be taken and says why; walk node 1 by
// hand and fight it at fast pace (Shot until it is won); the rewards: XP and credits, the ammunition pack, a pick of
// three; take one; then the rest of the stage with run/skip (a fight won at once) to the Boss: the level-up waiting at
// level 3, the nodes still to be built saying what will be there, the Boss's rewards, STAGE 1 CLEARED, retire, and the
// room back in its lobby with the last run's score. SHOTS=dir saves the path map and the reward pick (DSF=2 for 2x).
import { chromium, player, click, hostAs, lockIn, until, pickAction, settle, OUT } from './lib.mjs';
const browser = await chromium.launch();
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const SEED = 'PHC-0001';
const p = await player(browser, 'host', { play: 'survival' });
await p.context().addInitScript((seed) => { try { localStorage.setItem('phc.testRoom', '1'); localStorage.setItem('phc.testSeed', seed); } catch { /* */ } }, SEED);
await p.setViewportSize({ width: 1280, height: 720 });
const G = () => p.evaluate(() => window.__phc.getState().game);
const run = () => p.evaluate(() => window.__phc.getState().game?.run);
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const screen = () => p.evaluate(() => window.__phc.getState().screen);
// a screenshot when the screen change has played out (no fight screen still fading under the run's)
const shot = async (name) => { await p.waitForFunction(() => !document.querySelector('.phc-cb-dock'), null, { timeout: 30000 }).catch(() => {}); await settle(p, 1200); return p.screenshot({ path: OUT + name + '.png' }); };

// ---------- the lobby: a character, then Start the run ----------
await hostAs(p, 'Leon');
await click(p, 'Create a character');
await p.getByPlaceholder('What the squad calls you').fill('Kade');
await p.locator('main button[aria-pressed]').first().click();
await click(p, 'Next ›');
await p.locator('button', { hasText: /^Use .* ›$/ }).first().click();
await click(p, 'Next ›'); await click(p, 'Next ›'); await click(p, 'Next ›');
await p.locator('button', { hasText: 'Line soldier' }).first().click();
await click(p, 'Next ›'); await lockIn(p);
await p.waitForSelector('text=✓ LOCKED IN');
ok('a test room (settings.test, from the test hook)', (await G()).settings.test === true);
await click(p, 'Start the run');
await p.waitForSelector('[data-phc-run-screen]', { timeout: 60000 });
let r = await run();
ok('Start the run opens the path map, seed ' + r.seed + ', stage 1', r.seed === SEED && r.stage === 1 && r.state === 'map' && await screen() === 'run');

// ---------- the path map ----------
const drawn = await p.locator('[data-phc-node]').count();
ok('every node of the stage is drawn (' + drawn + ' of ' + r.nodes.length + '), each with its word and its icon', drawn === r.nodes.length
  && await p.locator('[data-phc-node] svg').count() === r.nodes.length
  && (await p.locator('[data-phc-node]').allTextContents()).every((t) => /Fight|Elite|Boss|Shop|Forge|Training|Shrine|Rest|Cache|Crossroads|Gate/.test(t)));
const lit = await p.locator('[data-phc-node][data-phc-state="reachable"]').evaluateAll((b) => b.map((x) => x.getAttribute('data-phc-node')));
const first = r.nodes.filter((n) => n.depth === 1).map((n) => n.id);
ok('the first row is lit, nothing else (' + lit.join(', ') + ')', JSON.stringify(lit.sort()) === JSON.stringify(first.sort()));
const tip0 = await p.locator('[data-phc-node="' + lit[0] + '"]').getAttribute('data-tip-text');
ok('a fight node\'s hover card says what it gives, with the engine\'s numbers: "' + tip0 + '"', /XP/.test(tip0 || '') && /credits/.test(tip0 || '') && /pick of three weapons/.test(tip0 || ''));
const far = r.nodes.find((n) => n.depth === 3);
await p.locator('[data-phc-node="' + far.id + '"]').click();
const tip1 = await until(p, () => (document.querySelector('.phc-atip')?.textContent || '').trim() || null, null, 5000).catch(() => '');
ok('an unlit node can\'t be taken and its card says why ("' + tip1.slice(0, 90) + '")', (await run()).at === null && /can.t reach/.test(tip1));
await shot('survival-path-map');

// ---------- node 1 by hand ----------
await p.locator('[data-phc-node="' + lit[0] + '"]').click();
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 60000 });
r = await run();
ok('a lit node is taken: the fight begins (' + r.stats.fights[0].template + ', ' + r.stats.fights[0].foes.length + ' foe(s))', r.at === lit[0] && r.state === 'fight');
for (let i = 0; i < 400; i++) {
  const s = await p.evaluate(() => { const g = window.__phc.getState().game, cb = g.combat; if (!cb || cb.over || g.phase !== 'combat') return 'over'; const u = cb.units.find((x) => x.id === cb.order[cb.turn]); return u && u.charId ? 'mine' : 'theirs'; });
  if (s === 'over') break;
  if (s !== 'mine' || !(await p.locator('text=ACTION POINTS').count()) || await p.evaluate(() => { const d = document.querySelector('.phc-cb-dock'); return d ? d.getAttribute('data-lock') || '' : 'none'; })) { await settle(p, 120); continue; }
  await pickAction(p, /^(Shot|Strike)/, { timeout: 2000 }).catch(() => {});
  const conf = p.getByRole('button', { name: 'Confirm', exact: true });
  try { if (await conf.isEnabled({ timeout: 30000 })) await conf.click({ timeout: 30000 }); else await p.getByRole('button', { name: 'End turn', exact: true }).click({ timeout: 30000 }); } catch { /* the turn moved on under us */ }
  await settle(p, 60);
}
let g = await G();
ok('node 1 fought by hand to its end: ' + (g.combat?.summary || '?'), g.combat?.over === 'win' && g.run.state === 'reward');
await click(p, 'Back to the map ›', { timeout: 60000 });
await p.waitForSelector('[data-phc-offer]', { timeout: 30000 });
r = await run();
const c = Object.values(g.characters)[0];
ok('the rewards: XP and credits each, the ammunition pack (' + (r.note.ammo[c.id] || []).join(', ') + ')', r.note.xp === 100 && c.xp === 100 && c.credits === 150 + r.note.credits && (r.note.ammo[c.id] || []).length > 0
  && /100 XP/.test(await p.locator('[data-phc-note]').textContent()));
ok('a pick of three weapons, each with its rarity word and price, and credits instead', await p.locator('[data-phc-pick]').count() === 3 && /Take \d+ credits instead/.test(await p.locator('[data-phc-instead]').textContent())
  && (await p.locator('[data-phc-pick]').allTextContents()).every((t) => /(STANDARD|FINE)/.test(t) && /\d+ credits/.test(t)));
await shot('survival-reward-pick');
const want = r.offers[c.id].weapons[0];
await p.locator('[data-phc-pick="0"]').click();
await p.waitForFunction(() => window.__phc.getState().game.run.state === 'map', null, { timeout: 30000 });
g = await G();
ok('the weapon taken is in the pack at its rarity (' + want.id + ', ' + want.rarity + ')', (Object.values(g.characters)[0].pack || []).some((x) => (x.weapon || x.item || x.id) === want.id && (x.rarity || 'standard') === want.rarity));
ok('… and the map lights the node\'s links', JSON.stringify((await p.locator('[data-phc-node][data-phc-state="reachable"]').evaluateAll((b) => b.map((x) => x.getAttribute('data-phc-node')))).sort()) === JSON.stringify([...g.run.nodes.find((n) => n.id === g.run.at).links].sort()));

// ---------- the rest of the stage, fights won by run/skip ----------
await act({ type: 'run/skip' }); // a refused action comes back as the player's toast, in the engine's words
const plain = await until(p, () => window.__phc.getState().toast?.text || null, null, 10000).catch(() => '');
ok('run/skip with no fight on is refused: "' + plain + '"', plain === 'No fight is under way.');
let sawLevelUp = false, sawPanel = 0, guard = 0;
while (guard++ < 40) {
  r = await run(); if (!r || r.state === 'boon' || r.state === 'over') break;
  if (r.state === 'map') {
    const ids = await p.locator('[data-phc-node][data-phc-state="reachable"]').evaluateAll((b) => b.map((x) => x.getAttribute('data-phc-node')));
    const kinds = Object.fromEntries(r.nodes.map((n) => [n.id, n.kind]));
    const next = ids.find((id) => !['fight', 'elite', 'boss'].includes(kinds[id])) || ids[0]; // walk past the panels too
    await p.locator('[data-phc-node="' + next + '"]').click();
    await p.waitForFunction((id) => window.__phc.getState().game.run.at === id, next, { timeout: 30000 });
    if (['shop', 'forge', 'training', 'shrine', 'event'].includes(kinds[next])) { await p.waitForSelector('[data-phc-note]'); if (/will stand here/.test(await p.locator('[data-phc-note]').textContent())) sawPanel++; }
  } else if (r.state === 'fight') {
    await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 60000 }).catch(() => {});
    const e = await act({ type: 'run/skip' }); if (e) { ok('run/skip in a fight: ' + e, false); break; }
    await click(p, 'Back to the map ›', { timeout: 60000 });
  } else if (r.state === 'reward') {
    await p.waitForSelector('[data-phc-instead]', { timeout: 30000 });
    if (!sawLevelUp && await p.locator('[data-phc-levelup]').count()) {
      sawLevelUp = true;
      await p.locator('[data-phc-levelup]').first().click();
      await p.waitForFunction(() => window.__phc.getState().screen === 'levelup', null, { timeout: 30000 });
      await click(p, /Back to the map/, { timeout: 30000 });
      await p.waitForSelector('[data-phc-run-screen]', { timeout: 30000 });
    }
    await p.locator('[data-phc-instead]').first().click();
    await p.waitForFunction(() => window.__phc.getState().game.run.state !== 'reward', null, { timeout: 30000 });
  }
}
r = await run(); g = await G();
ok('the level-up waits on the map at level 3 (the class is earned there), and Back to the map returns', sawLevelUp && Object.values(g.characters)[0].level >= 3);
ok('the nodes still to be built say what will be there (' + sawPanel + ' seen)', sawPanel >= 1);
ok('the whole stage walked to the Boss: 15 nodes, STAGE 1 CLEARED', r.state === 'boon' && r.path.length === 15 && /STAGE 1 CLEARED/.test(await p.locator('[data-phc-cleared]').textContent()));
await shot('survival-stage-cleared');
await p.locator('[data-phc-cleared] [data-phc-retire]').click();
await p.waitForFunction(() => window.__phc.getState().game.phase === 'lobby', null, { timeout: 30000 });
await p.waitForFunction(() => window.__phc.getState().screen === 'room', null, { timeout: 30000 });
const last = await p.locator('[data-phc-run]').textContent().catch(() => '');
ok('retired: the room is back in its lobby with the last run\'s score ("' + last.replace(/\s+/g, ' ').slice(0, 120) + '")', /The last run/.test(last) && /retired after 1 stage cleared and 15 nodes walked/.test(last) && await p.locator('[role="radiogroup"]').count() === 1);
ok('no page errors (' + p.errors.slice(0, 3).join(' | ') + ')', !p.errors.length);
await browser.close();
