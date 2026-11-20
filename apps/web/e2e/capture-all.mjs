// The whole-game screenshot pass (0.32): walks the real game and saves a PNG of each screen at 1280x720 and 1600x900
// into .check/capture/all/ (<w>-<nn>-<name>.png), with an index.md of them and of the states it could not reach.
// It changes nothing in the game: it plays a Survival room (seeded, a test room), then the Proving Ground's tools for
// the fight screens, the level-up screens, the skill pages and the sheet's tabs. A step that cannot be reached is
// noted (SKIPPED) and the walk goes on; the suite fails only when a browser or the room itself fails.
import { mkdirSync, writeFileSync, readFileSync } from 'fs';
import { chromium, click, player, hostAs, lockIn, settle, here, openGround, campStart, campConfirmGo, pickAction, pause, BASE } from './lib.mjs';
const OUTD = process.env.CAPTURE_OUT || here('../../../.check/capture/all', import.meta.url);
mkdirSync(OUTD, { recursive: true });
const browser = await chromium.launch();
const SIZES = [[1280, 720], [1600, 900]];
const done = [], skipped = [], quickShots = []; // quickShots: a moment caught at the size of the moment only (a banner)
let seq = Number(process.env.CAPTURE_SEQ_START || 0);
const log = (s) => console.log(s);
/** A picture of the page's current state at both sizes. */
async function snap(pg, name, o = {}) {
  const n = String(++seq).padStart(3, '0');
  for (const [w, h] of SIZES) {
    try {
      await pg.setViewportSize({ width: w, height: h }); await settle(pg, o.wait ?? 350);
      await pg.mouse.move(w - 3, 3); await settle(pg, 100);
      const f = w + '-' + n + '-' + name + '.png';
      await pg.screenshot({ path: OUTD + '/' + f }); done.push(f);
    } catch (e) { skipped.push(name + ' at ' + w + ': ' + String(e.message).split('\n')[0]); }
  }
  log('shot ' + n + ' ' + name);
  await pg.setViewportSize({ width: 1280, height: 720 }).catch(() => {});
}
/** Run one reach-and-shoot step; a failure is a skipped state, not a failed suite. */
async function step(name, fn) {
  try { await fn(); } catch (e) { skipped.push(name + ': ' + String(e.message).split('\n')[0]); log('SKIP ' + name + ': ' + String(e.message).split('\n')[0]); }
}
process.on('exit', () => {
  writeFileSync(OUTD + '/index.md', '# Whole-game screenshots (capture-all.mjs)\n\n' + done.length + ' pictures (' + done.length / 2 + ' screens at 1280x720 and 1600x900)\n\n' + done.map((f) => '- ' + f).join('\n') + '\n\n## Not reached\n\n' + (skipped.map((s) => '- ' + s).join('\n') || '- none') + '\n');
});
const mkAct = (pg) => (a) => pg.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const G = (pg) => pg.evaluate(() => window.__phc.getState().game);

// ---------- 1. the title ----------
{
  const t = await browser.newContext({ viewport: { width: 1280, height: 720 }, ignoreHTTPSErrors: true });
  const tp = await t.newPage();
  await tp.goto(BASE, { timeout: 120000, waitUntil: "domcontentloaded" }); await settle(tp, 2500);
  await snap(tp, 'title-press-any-key', { wait: 1500 });
  await tp.keyboard.press('Space').catch(() => {}); await settle(tp, 2500);
  await snap(tp, 'title-menu', { wait: 1500 });
  await tp.getByRole('button', { name: 'SETTINGS' }).first().click().catch(() => {}); await settle(tp, 1200);
  await snap(tp, 'settings-from-title');
  await t.close();
}

// ---------- 2. the lobby and creation (a Survival room) ----------
const p = await player(browser, 'host', { play: 'survival' });
await p.context().addInitScript(() => { try { localStorage.setItem('phc.testRoom', '1'); localStorage.setItem('phc.testSeed', 'PHC-0046'); } catch { /* */ } });
await p.setViewportSize({ width: 1280, height: 720 });
const act = mkAct(p);
await hostAs(p, 'Leon');
await settle(p, 600);
await snap(p, 'lobby-empty-three-modes');
await click(p, 'Create a character');
await p.getByPlaceholder('What the squad calls you').fill('Kade');
const steps = await p.getByRole('navigation', { name: 'Creation steps' }).getByRole('button').allInnerTexts();
log('creation steps: ' + steps.join(' | '));
for (let i = 0; i < steps.length; i++) {
  await step('creation step ' + (i + 1), async () => {
    if (i === 1) { /* the origin step needs a pick before archetypes */ }
    await p.getByRole('navigation', { name: 'Creation steps' }).getByRole('button').nth(i).click(); await settle(p, 400);
    await snap(p, 'creation-' + (i + 1) + '-' + steps[i].replace(/[^A-Za-z]+/g, '').toLowerCase());
  });
}
await p.getByRole('navigation', { name: 'Creation steps' }).getByRole('button').nth(0).click(); await settle(p, 300);
await p.locator('main button[aria-pressed]').first().click().catch(() => {});
await click(p, 'Next ›'); await settle(p, 300);
await p.locator('button', { hasText: /^Use .* ›$/ }).first().click();
for (let i = 0; i < 3; i++) await click(p, 'Next ›');
await click(p, 'Next ›'); await lockIn(p);
await p.waitForSelector('text=✓ LOCKED IN');
await settle(p, 500);
await snap(p, 'lobby-character-locked-in');

// ---------- 3. Survival: the vow pop-up, the camp ----------
// (a test room: the character is made Faithful on this page first, so the vow pop-up and the FAITH tab have something to show)
await p.evaluate(() => { const g = window.__phc.getState().game, c = Object.values(g.characters)[0]; c.belief = { kind: 'faithful', patron: 'mother_ember' }; c.patron = 'mother_ember'; c.skills.faith = Math.max(1, c.skills.faith || 0); });
await click(p, 'Start the run');
await settle(p, 500);
await step('level-up first dialog', async () => { if (await p.locator('[data-phc-dialog]').count()) { await snap(p, 'lobby-level-up-first-dialog'); } await campConfirmGo(p); });
await step('vow pop-up', async () => {
  await p.waitForSelector('[data-phc-vow-popup="enter"]', { timeout: 30000 }); await settle(p, 600);
  await snap(p, 'camp-vow-popup');
  await p.locator('[data-phc-vow-done]').click(); await settle(p, 400);
});
await p.waitForSelector('[data-phc-camp]', { timeout: 60000 });
await settle(p, 500);
await snap(p, 'camp-step1-checklist-free-weapon');
await step('camp scroll', async () => {
  await p.evaluate(() => { const s = document.querySelector('[data-phc-camp]').parentElement; s.scrollTop = s.scrollHeight / 2; }); await settle(p, 300);
  await snap(p, 'camp-step1-scrolled-middle');
  await p.evaluate(() => { const s = document.querySelector('[data-phc-camp]').parentElement; s.scrollTop = s.scrollHeight; }); await settle(p, 300);
  await snap(p, 'camp-step1-scrolled-end-budget');
  await p.evaluate(() => { const s = document.querySelector('[data-phc-camp]').parentElement; s.scrollTop = 0; });
});
await step('camp recommended', async () => { await p.locator('[data-phc-camp-recommended]').click(); await settle(p, 400); await snap(p, 'camp-step1-recommended-taken'); });
await step('camp: a magazine gun for the Magazines shelf', async () => {
  const WPN = Object.fromEntries(JSON.parse(readFileSync(here('../../../data/weapons.json', import.meta.url), 'utf8')).items.map((w) => [w.id, w]));
  const gun = await p.locator('[data-phc-camp-pick^="weapon:"]').evaluateAll((l) => l.map((e) => e.getAttribute('data-phc-camp-pick'))).then((l) => l.find((x) => WPN[x.slice(7)]?.reload === 'magazine'));
  if (gun) { await p.locator('[data-phc-camp-pick="' + gun + '"]').click(); await settle(p, 400); log('gun ' + gun); } else skipped.push('no magazine gun among the free weapons for the Magazines shelf');
});
await step('camp next to boon', async () => {
  if (await p.locator('[data-phc-camp-next]').count()) await p.locator('[data-phc-camp-next]').click(); else await p.locator('[data-phc-camp-step="2"]').click();
  await campConfirmGo(p); await p.waitForSelector('[data-phc-startboon]', { timeout: 30000 }); await settle(p, 400);
  await snap(p, 'camp-step2-starting-boon');
  await p.locator('[data-phc-startboon]').first().click(); await settle(p, 300);
  await snap(p, 'camp-step2-boon-chosen');
});
await p.locator('[data-phc-camp-ready]').click(); await campConfirmGo(p);
await p.waitForSelector('[data-phc-run-screen]', { timeout: 60000 });
await settle(p, 800);
await snap(p, 'path-map-stage1');
await step('node card', async () => {
  const id = await p.locator('[data-phc-node][data-phc-state="reachable"]').first().getAttribute('data-phc-node');
  await p.locator('[data-phc-node="' + id + '"]').hover(); await settle(p, 600);
  const b = await p.locator('[data-phc-node="' + id + '"]').boundingBox();
  for (const [w, h] of SIZES) { await p.setViewportSize({ width: w, height: h }); await settle(p, 400); const bb = await p.locator('[data-phc-node="' + id + '"]').boundingBox(); await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await settle(p, 500); const f = w + '-' + String(++seq).padStart(3, '0') + '-path-map-node-card-open.png'; await p.screenshot({ path: OUTD + '/' + f }); done.push(f); }
  await p.setViewportSize({ width: 1280, height: 720 });
});

// ---------- 4. node 1: the fight, by hand, then its win ----------
await p.evaluate(() => { const w = window; w.__cards = []; const seen = new Set();
  new MutationObserver(() => { for (const el of document.querySelectorAll('[data-phc-card]')) { const id = el.getAttribute('data-phc-card-id'); if (seen.has(id)) continue; seen.add(id); w.__cards.push({ kind: el.getAttribute('data-phc-card'), id, t: performance.now(), text: el.textContent || '' }); } }).observe(document, { childList: true, subtree: true }); });
const waitCard = (kind, timeout = 60000) => p.waitForFunction((kind) => window.__cards.some((c) => c.kind === kind), kind, { timeout, polling: 20 }).then(() => true, () => false);
/** A picture at the current size, right now (for a banner that does not stay): saved under the size it was taken at. */
const quick = async (name) => { const vs = p.viewportSize(); const f = vs.width + '-' + String(++seq).padStart(3, '0') + '-' + name + '.png'; await p.screenshot({ path: OUTD + '/' + f }); done.push(f); quickShots.push(f); log('quick ' + f); };
const myTurn = () => p.waitForFunction(() => { const g = window.__phc.getState().game, cb = g.combat; if (!cb || cb.over) return false; const u = cb.units.find((x) => x.id === cb.order[cb.turn]); const d = document.querySelector('.phc-cb-dock'); return !!u && !!u.charId && !!d && !d.getAttribute('data-lock'); }, null, { timeout: 90000 }).then(() => true, () => false);
const state = () => p.evaluate(() => window.__phc.getState().game.run?.state);
const route1 = await p.evaluate(() => { const r = window.__phc.getState().game.run; const n = r.nodes.filter((x) => x.depth === 1 && x.kind === 'fight'); return n[0]?.id || r.nodes.find((x) => x.depth === 1).id; });
const fightNo = { n: 0 };
async function fightScreens(tag, size) {
  let gotFight = false;
  // the approach banner, BATTLE START, the first turn's card, the action tabs, a token card, the Backpack
  await p.setViewportSize({ width: size[0], height: size[1] }); await settle(p, 300);
  await p.locator('[data-phc-node="' + tag + '"]').click();
  await p.waitForFunction(() => window.__phc?.getState().screen === 'combat', null, { timeout: 90000 });
  if ((await G(p)).combat?.approach) {
    if (await waitCard('approach', 15000)) { await settle(p, 0); await new Promise((r) => setTimeout(r, 250)); await quick('fight-APPROACH-banner'); } else skipped.push('APPROACH banner not seen');
    await myTurn();
    await snap(p, 'fight-approach-first-turn');
    for (let i = 0; i < 14 && (await G(p)).combat?.approach; i++) {
      const cb = (await G(p)).combat; await act({ type: 'combat/end-turn', unitId: cb.order[cb.turn] });
      for (let k = 0; k < 8 && !gotFight; k++) { await pause(p, 90); if (await p.locator('[data-phc-card="fight"]').count()) { await pause(p, 120); await quick('fight-BATTLE-START-banner'); gotFight = true; } }
      await settle(p, 250);
    }
  } else skipped.push('this fight had no approach (APPROACH banner)');
  if (!gotFight) { if (await waitCard('fight', 30000)) { await pause(p, 200); if (await p.locator('[data-phc-card="fight"]').count()) { await quick('fight-BATTLE-START-banner'); gotFight = true; } } if (!gotFight) skipped.push('BATTLE START banner: not on screen when looked for'); }
  await myTurn();
  await settle(p, 600);
  await quick('fight-turn-intro-card-and-board');
  await settle(p, 2500);
  await snap(p, 'fight-my-turn-default-tab');
  const tabs = p.locator('[role="tablist"][aria-label="Actions"] [role="tab"]');
  const names = await tabs.allInnerTexts();
  log('tabs: ' + names.join(' | '));
  for (let i = 0; i < names.length; i++) await step('action tab ' + names[i], async () => { await tabs.nth(i).click(); await settle(p, 350); await snap(p, 'fight-tab-' + names[i].replace(/[^A-Za-z]+/g, '').toLowerCase()); });
  await step('token card', async () => {
    const me = await p.evaluate(() => { const cb = window.__phc.getState().game.combat; const u = cb.units.find((x) => x.charId); const [x, y] = u.pos.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); });
    await p.locator('button.phc-tok[aria-label^="' + me + ' · "]').first().click(); await settle(p, 500);
    await snap(p, 'fight-token-card-own');
    const toks = await p.locator('button.phc-tok').evaluateAll((l) => l.map((e) => e.getAttribute('aria-label')));
    const other = toks.find((t) => t && !t.startsWith(me + ' · '));
    await p.locator('button.phc-tok[aria-label="' + other + '"]').first().click(); await settle(p, 500);
    await snap(p, 'fight-token-card-foe');
  });
  await step('backpack', async () => { await p.keyboard.press('Escape'); await p.getByRole('button', { name: /Backpack/ }).first().click(); await settle(p, 500); await snap(p, 'fight-backpack-open'); await p.keyboard.press('Escape'); await settle(p, 300); });
}
await fightScreens(route1, [1280, 720]);
// win it: VICTORY, the field (FREE ROAM) with its action bar, then Leave and the reward panel
await step('victory and field', async () => {
  await act({ type: 'run/skip' });
  if (await waitCard('victory', 20000)) { await new Promise((r) => setTimeout(r, 350)); await quick('fight-VICTORY-banner'); } else skipped.push('VICTORY banner not seen');
  if (await waitCard('field', 20000)) { await new Promise((r) => setTimeout(r, 300)); await quick('field-FREE-ROAM-banner'); }
  await p.waitForSelector('[data-phc-field-head]', { timeout: 30000 }); await myTurn(); await settle(p, 1500);
  await snap(p, 'field-turn-card-over-the-action-bar');
  await p.keyboard.press('Shift'); await settle(p, 800);
  await snap(p, 'field-after-the-fight-action-bar');
  const tabs = p.locator('[role="tablist"][aria-label="Actions"] [role="tab"]');
  if (await tabs.count()) { await tabs.nth(2).click().catch(() => {}); await settle(p, 300); await snap(p, 'field-utility-tab'); }
  await p.locator('[data-phc-field-leave]').click();
  await p.waitForSelector('[data-phc-offer]', { timeout: 30000 }); await settle(p, 3000);
  await snap(p, 'reward-panel-after-fight', { wait: 800 });
});

// ---------- 5. the walk: every kind of node the seeded map reaches, the rewards, the boon, the summary ----------
const run = () => p.evaluate(() => window.__phc.getState().game.run);
const WANT = ['shop', 'forge', 'training', 'shrine', 'event', 'cache', 'rest', 'vault_guard', 'vault', 'elite', 'boss'];
const seenKind = new Set(['fight']);
const rewardKinds = new Set(['fight']); // (the first fight's reward panel is shot already)
/** The trail (no spur) through the map that passes the most kinds not yet seen, as the list of ids to click. */
function planTrail(r) {
  const by = Object.fromEntries(r.nodes.map((n) => [n.id, n])), starts = r.at ? [r.at] : r.nodes.filter((n) => n.depth === 1 && !n.spur).map((n) => n.id);
  const vaultAt = (n) => n.links.some((l) => by[l]?.kind === 'vault_guard');
  let best = null;
  const go = (id, path) => { const n = by[id]; const np = [...path, id]; const nxt = n.links.filter((l) => by[l].kind !== 'vault_guard' && !by[l].spur);
    if (!nxt.length) { const kinds = new Set(np.map((x) => by[x].kind)); for (const x of np) if (vaultAt(by[x])) { kinds.add('vault_guard'); kinds.add('vault'); } const sc = [...kinds].filter((k) => WANT.includes(k) && !seenKind.has(k)).length; if (!best || sc > best.sc) best = { sc, path: np }; return; }
    for (const l of nxt) go(l, np); };
  for (const st of starts) go(st, []);
  return best?.path || [];
}
async function placeShots(kind) {
  await settle(p, 700);
  await snap(p, 'node-' + kind);
  const tabs = p.locator('[data-phc-tab]');
  const n = await tabs.count();
  for (let i = 0; i < n; i++) await step(kind + ' tab ' + i, async () => {
    const id = await tabs.nth(i).getAttribute('data-phc-tab'); await tabs.nth(i).click(); await settle(p, 400);
    if (kind === 'shop' && id === 'always') {
      for (const sh of ['calibres', 'magazines']) if (await p.locator('[data-phc-shelf="' + sh + '"]').count()) { await p.locator('[data-phc-shelf="' + sh + '"]').scrollIntoViewIfNeeded(); await settle(p, 300); await snap(p, 'node-shop-shelf-' + sh); }
    }
    await snap(p, 'node-' + kind + '-tab-' + id);
  });
}
async function walk() {
let plan = [], vg0 = null;
for (let i = 0; i < 90; i++) {
  let r = await run();
  if (r.state === 'map') {
    if (!plan.length) { plan = planTrail(r); log('plan ' + plan.join(' > ')); }
    const by = Object.fromEntries(r.nodes.map((n) => [n.id, n])), here = r.at ? by[r.at] : null;
    let nextId;
    const vg = here && here.links.find((l) => by[l].kind === 'vault_guard');
    if (vg && !seenKind.has('vault_guard')) nextId = vg;
    else if (here && by[r.at].kind === 'vault_guard') nextId = here.links[0];
    else if (here && by[r.at].kind === 'vault') { const fork = r.nodes.find((n) => n.links.includes(vg0)); nextId = plan[plan.indexOf(fork.id) + 1]; }
    else nextId = plan[here ? plan.indexOf(r.at) + 1 : 0];
    if (here && !plan.includes(r.at) && !['vault', 'vault_guard'].includes(by[r.at].kind)) break;
    if (!nextId) break;
    if (vg) vg0 = vg;
    await p.locator('[data-phc-node="' + nextId + '"]').click({ timeout: 20000 }).catch(async () => { await act({ type: 'run/move', node: nextId }); });
    await p.waitForFunction((id) => window.__phc.getState().game.run.at === id, nextId, { timeout: 20000 }).catch(() => {});
    const kind = (await run()).nodes.find((n) => n.id === nextId)?.kind;
    const st = (await run()).state;
    log('arrived ' + nextId + ' ' + kind + ' state ' + st);
    if (['shop', 'forge', 'training', 'shrine', 'event', 'cache', 'rest'].includes(kind) && st !== 'fight' && st !== 'reward') {
      if (!seenKind.has(kind)) { seenKind.add(kind); await step('place ' + kind, () => placeShots(kind)); }
      if (st === 'shop') await act({ type: 'run/leave' });
      else if (await p.locator('[data-phc-phase="leave"]').count()) await p.locator('[data-phc-phase="leave"]').click();
      else await act({ type: 'run/leave' });
      await settle(p, 300);
    } else if (['vault_guard', 'elite', 'boss'].includes(kind)) seenKind.add(kind);
    continue;
  }
  if (r.state === 'fight') { const e = await act({ type: 'run/skip' }); if (e) { skipped.push('run/skip: ' + e); break; } continue; }
  if (r.state === 'field') { await act({ type: 'run/leave' }); continue; }
  if (r.state === 'shop') { await act({ type: 'run/leave' }); continue; }
  if (r.state === 'reward') {
    const at = r.nodes.find((n) => n.id === r.at)?.kind;
    if (!rewardKinds.has(at)) { rewardKinds.add(at); await step('reward ' + at, async () => { await p.waitForSelector('[data-phc-offer]', { timeout: 6000 }).catch(() => {}); await settle(p, 1500); await snap(p, 'reward-panel-' + at); seenKind.add(at === 'vault' ? 'vault' : at); }); }
    for (const [id, o] of Object.entries(r.offers || {})) await act({ type: 'run/pick', charId: id, choice: o.materials && o.materials.length ? 'materials' : 0 });
    for (const id of Object.keys(r.lasting || {})) await act({ type: 'run/take', charId: id, choice: 0 });
    continue;
  }
  if (r.state === 'boon' || r.state === 'tile' || r.state === 'over') break;
  log('state ' + r.state + ' not handled'); await settle(p, 500);
}
}
await walk();
// ---------- 6. the boon, the next tile, stage 2 (its own kinds), the summary ----------
let retired = false;
/** After a Boss: the boon of three, then the next tile; with `retire` the tile pick is left by retiring (the run summary). */
async function afterBoss(tag, retire) {
  for (let i = 0; i < 6; i++) {
    const r = await run();
    if (r.state === 'boon') { await step('boon', async () => { await p.waitForFunction(() => !document.querySelector('[data-phc-card]'), null, { timeout: 15000 }).catch(() => {}); await settle(p, 1200); await snap(p, tag + '-boon-of-three'); }); await act({ type: 'run/boon', charId: Object.keys((await G(p)).characters)[0], choice: 0 }); await settle(p, 400); }
    else if (r.state === 'tile') {
      await step('tile', async () => { await p.waitForFunction(() => !document.querySelector('[data-phc-card]'), null, { timeout: 15000 }).catch(() => {}); await settle(p, 1000); await snap(p, tag + '-next-tile'); });
      if (retire) { const e = await act({ type: 'run/retire' }); if (!e) { retired = true; await settle(p, 1500); await snap(p, 'run-summary-retired'); return; } skipped.push('retire at the tile pick: ' + e); }
      await act({ type: 'run/tile', tile: r.tiles[0].id }); await settle(p, 800); return;
    } else return;
  }
}
await afterBoss('stage1-after-boss', false);
await step('stage 2 map', async () => { await settle(p, 1000); await snap(p, 'path-map-stage2'); });
seenKind.delete('elite'); seenKind.delete('boss'); rewardKinds.delete('boss');
await walk();
await afterBoss('stage2-after-boss', true);
skipped.push('node kinds not reached in the seeded map (two stages): ' + (WANT.filter((k) => !seenKind.has(k)).join(', ') || 'none'));
console.log('done part 6; run state ' + (await run())?.state);
await p.context().close();

// ---------- 7. the Proving Ground: its tools, the doors ----------
function nextR(r) { let t = (r.state = (r.state + 0x6d2b79f5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const dieSeed = (v) => { for (let s = 1; s < 1e7; s++) { const r = { state: s }; if (1 + Math.floor(nextR(r) * 20) === v) return s; } return 1; };
let q, qa, GQ, cid;
/** A fresh Proving Ground (its own browser context): every class starts from the one starting character. */
async function newPg() {
  if (q) await q.context().close().catch(() => {});
  q = await player(browser, 'pg');
  await q.context().addInitScript(() => { try { localStorage.setItem('phc.combatSpeed', 'test'); } catch { /* */ } }); // (the rounds in between play fast; the banners were shot in the Survival walk at real speed)
  await q.setViewportSize({ width: 1280, height: 720 });
  await openGround(q, 'Leon');
  qa = mkAct(q); GQ = () => G(q);
  cid = await q.evaluate(() => Object.keys(window.__phc.getState().game.characters)[0]);
}
await newPg();
const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };
const must = async (a) => { const e = await qa(a); if (e) { skipped.push('PG action ' + a.type + ': ' + e); log('PG ' + a.type + ': ' + e); } return e; };
await step('PG tools panel', async () => { await settle(q, 800); await snap(q, 'pg-gear-up-tools-panel'); });
const dismissCut = async () => { for (let i = 0; i < 3; i++) { if (!(await q.locator('[data-phc-cutin]').count())) return; await q.mouse.click(1270, 710); await settle(q, 380); } };
const free = (near, r0 = 3) => q.evaluate(({ near, r0 }) => { const g = window.__phc.getState().game, cb = g.combat, [x0, y0] = near.split(',').map(Number);
  const taken = new Set(cb.units.filter((u) => !u.dead).map((u) => u.pos)), bad = new Set([...(cb.map.solid || []), ...(cb.map.cover || []), ...(cb.map.full || [])]);
  for (let r = r0; r <= 6; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) { const k = (x0 + dx) + ',' + (y0 + dy); if (x0 + dx < 0 || y0 + dy < 0 || x0 + dx >= cb.map.w || y0 + dy >= cb.map.h || taken.has(k) || bad.has(k)) continue; return k; } return null; }, { near, r0 });
const meU = () => q.evaluate((cid) => { const cb = window.__phc.getState().game.combat; return cb.units.find((u) => u.charId === cid); }, cid);
/** Fresh fight for a class: stop any fight, set the character up, start, clear the drill units, wait for the first turn. */
let fresh = false; // (the first fight uses the Proving Ground opened for its tools panel)
async function pgFight(acts, spawns = 1) {
  if (fresh) await newPg();
  fresh = true;
  for (const a of acts) await must({ charId: cid, ...a });
  await qa({ type: 'sandbox/ai', on: false }); await qa({ type: 'sandbox/auto', on: false });
  await must({ type: 'sandbox/fight' });
  await q.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 30000 });
  await q.waitForFunction(() => { const cb = window.__phc.getState().game.combat; const u = cb && cb.units.find((x) => x.id === cb.order[cb.turn]); return u && u.side === 'pc'; }, null, { timeout: 30000 });
  await dismissCut(); await qa({ type: 'sandbox/clear' });
  const u = await meU();
  for (let i = 0; i < spawns; i++) { const at = await free(u.pos, 3 + i); if (at) await qa({ type: 'sandbox/spawn', tier: 'soldier', weapon: 'service_pistol', at: ref(at), name: 'Watchman ' + (i + 1) }); }
  await must({ type: 'sandbox/refill', charId: cid }); await settle(q, 500); await dismissCut();
}
async function allTabs(prefix, only) {
  const tabs = q.locator('[role="tablist"][aria-label="Actions"] [role="tab"]');
  await tabs.first().waitFor({ timeout: 20000 }).catch(() => {}); await settle(q, 300);
  const names = await tabs.allInnerTexts();
  log(prefix + ' tabs: ' + names.join(' | ').replace(/\n/g, ' '));
  for (let i = 0; i < names.length; i++) {
    const nm = names[i].replace(/\d+/g, '').replace(/[^A-Za-z]+/g, '').toLowerCase();
    if (only && !only.includes(nm)) continue;
    await step(prefix + ' tab ' + nm, async () => { await tabs.nth(i).click(); await settle(q, 350); await snap(q, prefix + '-tab-' + nm); });
  }
  return names;
}
const CLASSES = [
  ['bulwark', [{ type: 'sandbox/class', classId: 'defender', rank: 2 }, { type: 'sandbox/skill', skill: 'durability', points: 6 }]],
  ['breaker', [{ type: 'sandbox/class', classId: 'fighter', rank: 2 }, { type: 'sandbox/skill', skill: 'raw_power', points: 6 }]],
  ['operative', [{ type: 'sandbox/class', classId: 'infiltrator', rank: 3 }, { type: 'sandbox/skill', skill: 'ingenuity', points: 7 }]],
];
for (const [nm, acts] of CLASSES) {
  await step('class ' + nm, async () => {
    await pgFight(acts, 2);
    await snap(q, 'fight-' + nm + '-board');
    await allTabs('fight-' + nm);
    if (nm === 'operative') {
      await q.locator('#phc-tab-shadow').click().catch(() => {}); await settle(q, 300);
      await q.getByRole('button', { name: /SIGHTLINE/ }).first().click().catch(() => skipped.push('no SIGHTLINE button'));
      await settle(q, 500); await snap(q, 'fight-operative-shadow-tab-sightline-on');
    }
  });
}
// the Sigilist mid-Line: two glyphs drawn on its own tiles, the Line not yet evoked
await step('sigilist mid-Line', async () => {
  await pgFight([{ type: 'sandbox/class', classId: 'mage', rank: 2 }, { type: 'sandbox/skill', skill: 'brain_power', points: 6 }, { type: 'sandbox/kit', kind: 'sigil' }, { type: 'sandbox/give', item: 'service_pistol', equip: true }, { type: 'sandbox/give', item: 'evoker', equip: true }], 1);
  const u = await meU();
  await allTabs('fight-sigilist');
  const e1 = await qa({ type: 'combat/draw', unitId: u.id, word: 'fire', tile: ref(u.pos) });
  const t2 = await free(u.pos, 1);
  const e2 = (await qa({ type: 'combat/move', unitId: u.id, to: t2 })) || (await qa({ type: 'combat/draw', unitId: u.id, word: 'seek', tile: ref(t2) }));
  log('draw ' + e1 + ' / ' + e2 + ' toast ' + (await q.evaluate(() => window.__phc.getState().toast?.text || '')) + ';')
  log(' glyphs ' + JSON.stringify(((await GQ()).combat.glyphs || []).map((g) => g.pos + ':' + g.word)) + '; log ' + JSON.stringify((await GQ()).combat.log.slice(-2)));
  await settle(q, 600); await dismissCut();
  const tabs = q.locator('[role="tablist"][aria-label="Actions"] [role="tab"]');
  const n = await tabs.count(); for (let i = 0; i < n; i++) { const t = (await tabs.nth(i).innerText()).toLowerCase(); if (/sigil/.test(t)) { await tabs.nth(i).click(); await settle(q, 400); } }
  await snap(q, 'fight-sigilist-mid-line-two-glyphs');
  if (e1 || e2) skipped.push('sigilist mid-Line: draw said ' + (e1 || e2));
});
// the Channeler holding an Outburst
await step('channeler holding an Outburst', async () => {
  await pgFight([{ type: 'sandbox/level', level: 10 }, { type: 'sandbox/class', classId: 'channeler', rank: 2 }, ...['will_power', 'empathy', 'visualization'].map((sk) => ({ type: 'sandbox/skill', skill: sk, points: 8 })),
    { type: 'sandbox/give', item: 'emanator_gauntlet', equip: true }, { type: 'sandbox/kit', kind: 'both' },
    ...[{ school: 'damage' }, { tone: 'fire' }, { module: 'burst' }].map((x) => ({ type: 'sandbox/learn', ...x })),
    { type: 'sandbox/design', design: { id: 'fb', name: 'Heartfire', school: 'damage', modules: ['burst'], tone: 'fire' } }], 1);
  await allTabs('fight-channeler');
  const tabs = q.locator('[role="tablist"][aria-label="Actions"] [role="tab"]'); await tabs.filter({ hasText: /Outburst/i }).first().click(); await settle(q, 400);
  await q.locator('[role="tabpanel"] [data-act="outburst"]').click(); await settle(q, 300);
  await q.locator('[aria-label="Your Outbursts"] button', { hasText: 'Heartfire' }).first().click(); await settle(q, 300);
  await snap(q, 'fight-channeler-outburst-design-picked');
  await q.locator('.phc-cb-foot [aria-label="Begin or snap"] button', { hasText: 'Begin' }).click(); await settle(q, 900); await dismissCut();
  for (let i = 0; i < 2; i++) { await q.locator('.phc-heart-panel button[data-hact="pump"]').click().catch(() => {}); await settle(q, 500); }
  await snap(q, 'fight-channeler-holding-an-outburst-pumped', { wait: 600 });
});
// the Mender with a Bond
await step('mender with a Bond', async () => {
  await pgFight([{ type: 'sandbox/class', classId: 'bard', rank: 2 }, { type: 'sandbox/skill', skill: 'empathy', points: 6 }, { type: 'sandbox/give', item: 'service_pistol', equip: true }, { type: 'sandbox/give', item: 'attuner', equip: true }], 1);
  await allTabs('fight-mender');
  let bonded = false, why = '';
  for (let i = 0; i < 6 && !bonded; i++) {
    const u = await meU(), foe = (await GQ()).combat.units.find((x) => x.side === 'foe' && !x.dead);
    await q.evaluate((s0) => { window.__phc.getState().game.rng.state = s0; }, dieSeed(1)); // (the foe's heart save is a 1: the Bond takes)
    const e = await qa({ type: 'combat/perk', unitId: u.id, id: 'verb:tend.bond_free', targetId: foe.id });
    bonded = (await GQ()).combat.ties?.some((t) => t.kind === 'bond'); if (bonded) break;
    why = e || String((await GQ()).combat.log.slice(-1)[0] || ''); // (the engine's refusal, or the line that says the save held)
    if (i < 2) log('bond try ' + i + ': ' + e + ' ties ' + JSON.stringify((await GQ()).combat.ties) + ' log ' + JSON.stringify((await GQ()).combat.log.slice(-2)));
    await qa({ type: 'combat/end-turn', unitId: u.id }); await q.waitForFunction(() => { const cb = window.__phc.getState().game.combat; const u = cb.units.find((x) => x.id === cb.order[cb.turn]); return u && u.side === 'pc'; }, null, { timeout: 30000 }).catch(() => {}); await dismissCut();
  }
  await settle(q, 600);
  await q.locator('#phc-tab-tend').click().catch(() => {}); await settle(q, 400);
  await snap(q, 'fight-mender-with-a-bond');
  if (!bonded) skipped.push('Mender: the Bond did not take in 6 turns (the picture shows the TEND tab without one); the last answer: ' + why);
});
// the Rigger with a Figment
await step('a Figment held (a door user with the Visualizer; two forms learned out of the fight, as Level up offers them)', async () => {
  await pgFight([{ type: 'sandbox/class', classId: 'marksman', rank: 1 }, { type: 'sandbox/skill', skill: 'visualization', points: 6 }, { type: 'sandbox/give', item: 'service_pistol', equip: true }, { type: 'sandbox/give', item: 'visualizer', equip: true }, { type: 'sandbox/give', item: 'standard_core', qty: 3 },
    { type: 'door/pick', door: 'figment_forms', option: 'wall' }, { type: 'door/pick', door: 'figment_forms', option: 'beast' }], 1);
  await allTabs('fight-skirmisher-visualizer');
  const u = await meU(), t1 = await free(u.pos, 2);
  let e = null; for (const choice of ['wall', 'beast']) { e = await qa({ type: 'combat/perk', unitId: u.id, id: 'verb:picture', choice, tile: t1 }); if ((await GQ()).combat.units.some((x) => x.owned?.kind === 'figment')) { e = null; break; } e = 'toast: ' + (await q.evaluate(() => window.__phc.getState().toast?.text || '')); }
  log('picture: ' + e + ' toast ' + (await q.evaluate(() => window.__phc.getState().toast?.text || '')) + ' owned ' + JSON.stringify((await GQ()).combat.units.filter((x) => x.owned).map((x) => x.name)) + ' log ' + JSON.stringify((await GQ()).combat.log.slice(-2)));
  if (e) skipped.push('Rigger: Picture refused: ' + e);
  await settle(q, 700); await dismissCut();
  await q.locator('[role="tab"][data-tab="figments"]').click().catch(() => {}); await settle(q, 400);
  await snap(q, 'fight-skirmisher-visualizer-with-a-figment');
});
// the Chaplain's FAITH tab
await step('chaplain faith tab', async () => {
  await pgFight([{ type: 'sandbox/class', classId: 'guardian', rank: 2 }, { type: 'sandbox/skill', skill: 'faith', points: 6 }, { type: 'sandbox/faith', belief: 'faithful', patron: 'mother_ember', faith: 6, devotion: 6, reset: true }], 1);
  await allTabs('fight-chaplain');
});
// the defeat: the squad falls to three Bosses
await step('defeat', async () => {
  await pgFight([{ type: 'sandbox/class', classId: 'defender', rank: 1 }], 0);
  const u = await meU();
  for (let i = 0; i < 5; i++) { const at = await free(u.pos, 2 + i % 3); if (at) await qa({ type: 'sandbox/spawn', tier: 'boss', weapon: 'service_pistol', at: ref(at), name: 'Executioner ' + (i + 1), level: 20 }); }
  await qa({ type: 'sandbox/ai', on: true });
  for (let i = 0; i < 12; i++) {
    if ((await GQ()).combat?.over) break;
    const cur = await q.evaluate(() => { const cb = window.__phc.getState().game.combat; if (!cb || cb.over) return null; const x = cb.units.find((y) => y.id === cb.order[cb.turn]); return x && x.side === 'pc' ? x.id : null; });
    if (cur) await qa({ type: 'combat/end-turn', unitId: cur });
    await settle(q, 600);
    log('defeat round ' + i + ' hp ' + JSON.stringify((await GQ()).combat.units.filter((x) => x.charId).map((x) => x.hp)) + ' over ' + (await GQ()).combat.over);
  }
  await q.waitForFunction(() => !!window.__phc.getState().game.combat?.over, null, { timeout: 40000 });
  await settle(q, 1500); await snap(q, 'fight-DEFEAT-end-panel');
});

// ---------- 8. the sheet's tabs, the level-up screens (with an old save's re-pick), the skill "?" pages ----------
await step('sheet tabs and level-up', async () => {
  await newPg();
  await settle(q, 800);
  await must({ type: 'sandbox/kit', charId: cid, kind: 'both' }); await must({ type: 'sandbox/faith', charId: cid, belief: 'faithful', patron: 'mother_ember', faith: 5, devotion: 5, reset: true });
  await must({ type: 'sandbox/skill', charId: cid, skill: 'faith', points: 5 });
  await settle(q, 500);
  const sheet = q.locator('aside[aria-label="Character sheet"]');
  const tabs = sheet.locator('[role="tab"]');
  const names = await tabs.allInnerTexts();
  log('sheet tabs: ' + names.join(' | '));
  if (!names.length) skipped.push('the sheet shows no role=tab buttons in the Proving Ground');
  for (let i = 0; i < names.length; i++) await step('sheet tab ' + names[i], async () => {
    await tabs.nth(i).click(); await settle(q, 400);
    await snap(q, 'sheet-tab-' + names[i].replace(/[^A-Za-z]+/g, '').toLowerCase());
  });
  // the level-up screen: level 3 with no class, a fork and perk steps waiting
  const toLevelUp = async () => { await q.locator('button', { hasText: /Level up|Earn your class/ }).first().click(); await q.locator('.phc-lu-core').first().waitFor({ timeout: 30000 }); await settle(q, 400); };
  const leaveLevelUp = async () => { await q.locator('button.phc-lu-later').click({ timeout: 6000 }).catch(async () => { await q.keyboard.press('Escape'); await settle(q, 300); await q.locator('button.phc-lu-later').click({ timeout: 30000 }); }); await q.waitForFunction(() => !document.querySelector('.phc-lu-core'), null, { timeout: 30000 }); await settle(q, 300); };
  for (const a of [{ type: 'sandbox/class', classId: null }, { type: 'sandbox/level', level: 3 }, { type: 'sandbox/skill', skill: 'durability', points: 4 }, { type: 'sandbox/skill', skill: 'dexterity', points: 3 },
    { type: 'sandbox/skill', skill: 'pain_threshold', points: 3 }, { type: 'sandbox/skill', skill: 'sensory', points: 3 }]) await must({ charId: cid, ...a });
  await settle(q, 500);
  await toLevelUp();
  await snap(q, 'levelup-to-choose-strip');
  const chips = q.locator('.phc-lu-tc');
  const kinds = await chips.evaluateAll((l) => l.map((b) => b.getAttribute('data-kind') + ':' + (b.textContent || '').trim().slice(0, 30)));
  log('level-up chips: ' + kinds.join(' | '));
  const n = kinds.length;
  let nper = 0;
  for (let i = 0; i < n; i++) if (/^class|Fork · Durability|Pain Threshold|Senses|Dexterity/.test(kinds[i].replace('◆ ', ''))) await step('level-up chip ' + kinds[i], async () => {
    const chip = chips.nth(i);
    await chip.evaluate((e) => e.click());
    await q.locator('.phc-lu-chooser').waitFor({ timeout: 30000 }); await settle(q, 400);
    const rows = await q.locator('.phc-lu-chooser .phc-perk-row').count(), opts = await q.locator('.phc-lu-chooser [data-fork-opt]').count();
    await snap(q, 'levelup-chooser-' + (++nper) + '-' + kinds[i].split(':')[0] + (rows ? '-' + rows + 'perks' : '') + (opts ? '-fork' : ''));
    await q.locator('.phc-lu-ch-close').first().click({ timeout: 4000 }).catch(() => q.keyboard.press('Escape')); await q.waitForFunction(() => !document.querySelector('.phc-lu-chooser'), null, { timeout: 8000 }).catch(() => {}); await settle(q, 200);
  });
  await leaveLevelUp();
  // an old save's re-pick chip
  await q.evaluate((cid) => { const c = window.__phc.getState().game.characters[cid]; c.skills.pain_threshold = 3; c.perks = [{ id: 'scar_tissue', tier: 'I' }]; c.perkRepick = { pain_threshold: [{ id: 'scar_tissue', tier: 'I' }] }; }, cid);
  await settle(q, 500);
  await toLevelUp();
  if (await q.locator('.phc-lu-tc[data-kind="repick"]').count()) {
    await snap(q, 'levelup-repick-chip-strip');
    await q.locator('.phc-lu-tc[data-kind="repick"]').first().evaluate((e) => e.click()); await q.locator('.phc-lu-chooser').waitFor({ timeout: 15000 }).catch(() => {}); await settle(q, 400);
    await snap(q, 'levelup-repick-keep-or-choose-again');
  } else skipped.push('the re-pick chip did not appear for a hand-made old save (perkRepick set on the sheet in the page)');
  await leaveLevelUp().catch(() => {});
  // settings from inside a game
  await step('settings in a room', async () => { await q.locator('header button, nav button, button').filter({ hasText: /^⚙$/ }).first().click({ timeout: 30000 }); await settle(q, 600); await snap(q, 'settings-in-game'); await q.keyboard.press('Escape'); });
});

// the skill "?" pages from creation's Skills step: one alpha, one beta, one gamma, every fold open
await step('skill pages', async () => {
  const c = await player(browser, 'cr', { play: 'survival' });
  await c.setViewportSize({ width: 1280, height: 720 });
  await hostAs(c, 'Leon');
  await click(c, 'Create a character');
  await c.getByPlaceholder('What the squad calls you').fill('Vess');
  await c.getByRole('navigation', { name: 'Creation steps' }).getByRole('button', { name: 'Skills' }).click(); await settle(c, 400);
  const folds = (open) => c.evaluate((open) => { for (const s of ['.phc-ep-fold', '.phc-ep-perks-fold', '.phc-ep-forks-fold']) { const f = document.querySelector(s); if (f && (f.getAttribute('aria-expanded') === 'true') !== open) f.click(); } }, open);
  for (const [id, tag] of [['durability', 'alpha'], ['pain_threshold', 'beta'], ['sensory', 'gamma']]) await step('skill page ' + tag, async () => {
    await c.locator('[data-skill="' + id + '"] [data-skill-face]').click(); await c.locator('.phc-ep-lore').waitFor({ timeout: 30000 }); await settle(c, 400);
    await snap(c, 'skill-page-' + tag + '-' + id + '-folds-closed');
    await folds(true); await settle(c, 500);
    await snap(c, 'skill-page-' + tag + '-' + id + '-all-folds-open');
    await folds(false); await c.getByRole('button', { name: 'Close the EPCCG entry' }).click(); await settle(c, 300);
  });
  await c.context().close();
});

// ---------- 9. "I'll narrate": the Narrator's desk (a host and a guest with a character) ----------
await step('the Narrator\'s desk', async () => {
  const host = await player(browser, 'nhost'), guest = await player(browser, 'nguest');
  await host.setViewportSize({ width: 1280, height: 720 });
  await hostAs(host, 'Leon');
  await host.waitForSelector('text=The squad');
  const code = (await host.locator('text=/ROOM [A-Z0-9]{6}/').first().textContent()).match(/ROOM ([A-Z0-9]{6})/)[1];
  await snap(host, 'lobby-campaign-mode-room');
  const pick = host.locator('button', { hasText: 'I\'ll narrate' }).first();
  await pick.click();
  await host.waitForFunction(() => window.__phc.getState().game.settings.mode === 'human', null, { timeout: 30000 });
  await settle(host, 500); await snap(host, 'lobby-ill-narrate-selected');
  await guest.goto(BASE + '/?room=' + code); await guest.getByPlaceholder('Leon').fill('Mai'); await click(guest, 'Join ›');
  await guest.waitForSelector('text=The squad');
  const ARCH = JSON.parse(readFileSync(here('../../../data/archetypes.json', import.meta.url), 'utf8'));
  const cf = (ARCH.items || ARCH).find((x) => x.id === 'confessor');
  await guest.evaluate((sheet) => window.__phc.act({ type: 'char/add', sheet }), { name: 'Sister Vey', portrait: '', origin: 'Thousand-Planet frontier', traits: [], skills: { ...cf.preset }, attrs: { ...cf.attributes }, cores: { ...cf.cores }, identity: {} });
  await host.waitForFunction(() => Object.keys(window.__phc.truth().characters).length === 1, null, { timeout: 30000 });
  await click(host, 'Start session');
  await host.locator('[data-gm-desk]').waitFor({ timeout: 60000 }); await settle(host, 800);
  await snap(host, 'narrators-desk-the-opening');
  await host.locator('[data-gm-add-check]').click().catch(() => {}); await settle(host, 400);
  await snap(host, 'narrators-desk-with-a-check-row');
  await host.context().close(); await guest.context().close();
});
// three named checks (a green line must mean something was looked at): the pictures, and the two doors the 0.32 pass
// found unshown (a held Bond, a held Figment); any other state not reached is noted in index.md and fails nothing
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
{ const paired = done.filter((f) => !quickShots.includes(f)); // every screen is shot at both sizes; a banner (quick) only at the size it played in
  ok('pictures taken at both sizes: ' + paired.length + ' screens' + ' (+' + quickShots.length + ' banner moments)', paired.length > 0 && paired.length % 2 === 0); }
ok("the Mender's picture shows a Bond held", !skipped.some((x) => /^Mender: the Bond/.test(x)));
ok('the Figment picture shows a Figment held', !skipped.some((x) => /^Rigger: Picture/.test(x)));
console.log('done');
await browser.close();
