// capture-all: every screen and state of the game, 1600x900, one PNG each, for the wording pass (to-do section U).
// Read-only: it changes nothing but the throw-away rooms it opens.
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { chromium, player, click, hostAs, lockIn, openGround, settle, pause, pickAction, campStart, tipOf, BASE, here } from './lib.mjs';

const ROOT = here('../../../.check/capture/', import.meta.url);
const W = 1600, H = 900;
const browser = await chromium.launch();
const index = []; let missing = 0;
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const act = (p, a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const G = (p) => p.evaluate(() => window.__phc.getState().game);
const dismissCut = async (p) => { await p.keyboard.press('Escape'); await settle(p, 300); for (let i = 0; i < 3; i++) { if (!(await p.locator('[data-phc-cutin]').count())) break; await p.mouse.click(W - 10, H - 10); await settle(p, 300); } };
const counters = {};
/** cap(p, group, name, screen, sources, extraText): one PNG and one TXT. `sources` says where the words are edited. */
async function cap(p, group, name, screen, sources, extra = '') {
  mkdirSync(ROOT + group, { recursive: true });
  const n = String((counters[group] = (counters[group] || 0) + 1)).padStart(2, '0');
  const file = group + '/' + n + '-' + name + '.png';
  await settle(p, 300);
  await p.screenshot({ path: ROOT + file });
  const text = await p.evaluate(() => document.body.innerText).catch(() => '');
  writeFileSync(ROOT + file.replace(/\.png$/, '.txt'), (extra ? extra + '\n----\n' : '') + text);
  index.push({ file, screen, sources });
  ok('captured ' + file, true);
}
/** try a state; on a throw, index it as MISSING with the reason. */
async function state(group, name, screen, sources, fn) {
  try { await fn(); }
  catch (e) { missing++; index.push({ file: 'MISSING ' + group + '/' + name, screen, sources, why: String(e.message || e).split('\n')[0] }); console.log('SKIP ' + group + '/' + name + ': ' + String(e.message || e).split('\n')[0]);  }
}
const hoverText = async (loc) => { await loc.hover({ timeout: 30000 }); await settle(loc.page(), 400); return (await tipOf(loc)) || ''; };
const sized = async (p) => { await p.setViewportSize({ width: W, height: H }); await settle(p, 300); };

// ------------------------------------------------------------------ 01 title
{ const p = await player(browser, 'title'); await sized(p); await p.goto(BASE);
  const T = 'apps/web/src/title/Title.tsx; game/settings.tsx; game/credits.ts; game/tips.tsx';
  await state('01-title', 'menu', 'Title menu', T, async () => { await settle(p, 1500); await cap(p, '01-title', 'menu', 'Title menu', T); });
  for (const [id, name] of [['proving', 'proving-ground-panel'], ['new', 'new-game-name'], ['join', 'join-a-friend'], ['chars', 'characters'], ['saved', 'saved-games'], ['settings', 'settings'], ['credits', 'credits']]) {
    await state('01-title', name, 'Title: ' + id, T, async () => {
      await p.locator('[data-item="' + id + '"]').waitFor({ timeout: 30000 });
      await p.locator('[data-item="' + id + '"]').click(); await settle(p, 1500);
      await cap(p, '01-title', name, 'Title: ' + id, T);
      await p.keyboard.press('Escape'); await settle(p, 800);
      if (!(await p.locator('nav[aria-label="Main menu"]').count())) await p.goto(BASE);
    });
  }
  await p.context().close(); }

// ------------------------------------------------------------------ 02 lobby and 03 creation
{ const p = await player(browser, 'host', { play: 'survival' }); await sized(p);
  const L = 'templates/room.template.html; screens/room.js; game/modeCentre.tsx; data/modes.json; templates/shell.template.html';
  await hostAs(p, 'Leon');
  await state('02-lobby', 'empty-room', 'Room lobby, no character', L, () => cap(p, '02-lobby', 'empty-room', 'Room lobby, no character', L));
  const C = 'templates/create.template.html; screens/create.js; screens/shared.js; data/skills.json; data/archetypes.json; data/traits.json; data/patrons.json';
  await click(p, 'Create a character');
  await p.getByPlaceholder('What the squad calls you').fill('Vess');
  const step = async (name) => { await p.getByRole('navigation', { name: 'Creation steps' }).getByRole('button', { name }).click(); await settle(p, 400); };
  await state('03-creation', 'identity', 'Creation 1 Identity', C, () => cap(p, '03-creation', 'identity', 'Creation 1 Identity', C));
  await p.locator('main button[aria-pressed]').first().click();
  await state('03-creation', 'identity-origin-selected', 'Creation 1 Identity, origin selected', C, () => cap(p, '03-creation', 'identity-origin-selected', 'Creation 1 Identity, origin selected', C));
  await click(p, 'Next ›');
  await state('03-creation', 'archetype', 'Creation 2 Archetype', C, () => cap(p, '03-creation', 'archetype', 'Creation 2 Archetype', C));
  await p.locator('[data-arch]').first().click(); await settle(p, 300);
  await state('03-creation', 'archetype-preview', 'Creation 2 Archetype, preview', C, () => cap(p, '03-creation', 'archetype-preview', 'Creation 2 Archetype, preview', C));
  await p.locator('button', { hasText: /^Use .* ›$/ }).first().click(); await settle(p, 400);
  await state('03-creation', 'skills', 'Creation 3 Skills', C, () => cap(p, '03-creation', 'skills', 'Creation 3 Skills', C));
  // the "?" page: one alpha, one beta, one gamma skill; fold open, ladder visible
  const helps = p.getByRole('button', { name: /^What is .*\? Read its EPCCG entry$/ });
  const nHelp = await helps.count();
  for (const i of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26].filter((x) => x < nHelp)) {
    await state('03-creation', 'skill-page-' + i, 'Creation skill "?" page #' + i, C + '; templates/epccg.template.html; data/calls.json', async () => {
      await helps.nth(i).click(); await settle(p, 500);
      for (const f of await p.locator('button[data-fold][aria-expanded="false"]').all()) if (await f.isVisible()) await f.click({ timeout: 3000 }).catch(() => {});
      await cap(p, '03-creation', 'skill-page-' + String(i).padStart(2, '0'), 'Creation skill "?" page #' + i, C + '; templates/epccg.template.html; data/calls.json');
      await p.keyboard.press('Escape'); await settle(p, 300);
    });
  }
  await click(p, 'Next ›');
  await state('03-creation', 'traits', 'Creation 4 Traits', C, () => cap(p, '03-creation', 'traits', 'Creation 4 Traits', C));
  await state('03-creation', 'trait-selected', 'Creation 4 Traits, one chosen', C, async () => { await p.locator('[data-trait]').first().click(); await cap(p, '03-creation', 'trait-selected', 'Creation 4 Traits, one chosen', C); });
  await click(p, 'Next ›');
  await state('03-creation', 'belief', 'Creation 5 Belief', C, () => cap(p, '03-creation', 'belief', 'Creation 5 Belief', C));
  await state('03-creation', 'belief-patron', 'Creation 5 Belief, a patron', C, async () => { await p.locator('[data-belief="faithful"]').click(); await settle(p, 300); await p.locator('[data-patron="mother_ember"]').first().click(); await settle(p, 300); await cap(p, '03-creation', 'belief-patron', 'Creation 5 Belief, a patron', C + '; data/patrons.json'); });
  await click(p, 'Next ›');
  await state('03-creation', 'moves', 'Creation 6 Moves', C, () => cap(p, '03-creation', 'moves', 'Creation 6 Moves', C));
  await click(p, 'Next ›');
  await state('03-creation', 'lock-in', 'Creation 7 Lock in', C, () => cap(p, '03-creation', 'lock-in', 'Creation 7 Lock in', C));
  await lockIn(p); await p.waitForSelector('text=✓ LOCKED IN', { timeout: 30000 });
  await state('02-lobby', 'character-locked', 'Room lobby, character locked in', L, () => cap(p, '02-lobby', 'character-locked', 'Room lobby, character locked in', L));
  // (NOT YET CAPTURED: Moves step for a Mind build (Sigil picker) and a Soul build (Outburst picks): run the creation again with another archetype; see plan 2.3)
  await p.context().close(); }

// ------------------------------------------------------------------ 04 sheet, 05 level-up, 06 fight, 07 Proving Ground tools
{ const p = await player(browser, 'pg'); await sized(p); await openGround(p, 'Leon');
  const cid = Object.keys((await G(p)).characters)[0];
  const PG = 'game/sandbox.tsx';
  await state('07-proving-ground', 'tools-gear', 'Proving Ground tools: Gear', PG, () => cap(p, '07-proving-ground', 'tools-gear', 'Proving Ground tools: Gear', PG));
  for (const t of ['Squad', 'Magic', 'Faith']) await state('07-proving-ground', 'tools-' + t.toLowerCase(), 'Proving Ground tools: ' + t, PG, async () => { await p.locator('nav[aria-label="Tools"] [role="tab"]', { hasText: t }).click(); await cap(p, '07-proving-ground', 'tools-' + t.toLowerCase(), 'Proving Ground tools: ' + t, PG); });
  // every door open (fight-panel.mjs everyDoor)
  await act(p, { type: 'sandbox/ai', on: false }); await act(p, { type: 'sandbox/auto', on: false });
  for (const [skill, points] of [['durability', 3], ['raw_power', 3], ['dexterity', 3], ['ingenuity', 3], ['visualization', 3], ['empathy', 3], ['will_power', 3], ['faith', 3]]) await act(p, { type: 'sandbox/skill', charId: cid, skill, points });
  await act(p, { type: 'sandbox/faith', charId: cid, belief: 'faithful', patron: 'mother_ember', faith: 3, devotion: 3, reset: true });
  for (const item of ['evoker', 'emanator', 'visualizer', 'attuner']) await act(p, { type: 'sandbox/give', charId: cid, item });
  await act(p, { type: 'sandbox/give', charId: cid, item: 'standard_core', qty: 4 });
  await act(p, { type: 'sandbox/give', charId: cid, item: 'combat_knife', equip: true });
  await act(p, { type: 'sandbox/design', charId: cid, design: { id: 'fb', name: 'Heartfire', school: 'damage', modules: ['burst'], tone: 'fire' } });
  for (const w of ['fire', 'seek', 'spark', 'arc', 'spread']) await act(p, { type: 'sandbox/learn', charId: cid, word: w });
  // the sheet: every tab, folds closed then open
  const SH = 'templates/main.template.html; screens/main.js; screens/armsTab.js; screens/faithTab.js; screens/figmentsTab.js';
  await p.goto(BASE); // (the Proving Ground survives a reload through the room save; if it does not, this state is MISSING)
  for (const t of ['skills', 'status', 'perks', 'gear', 'arms', 'magic', 'faith']) {
    await state('04-sheet', t, 'Sheet tab ' + t, SH, async () => {
      await p.locator('[role="tablist"][aria-label="Sheet"] [role="tab"][data-tab="' + t + '"]').click(); await settle(p, 500);
      await cap(p, '04-sheet', t + '-closed', 'Sheet tab ' + t + ' (folds as found)', SH);
      for (let r = 0; r < 3; r++) { for (const f of await p.locator('button[data-fold][aria-expanded="false"], [data-ws-toggle][aria-expanded="false"]').all()) if (await f.isVisible()) await f.click({ timeout: 3000 }).catch(() => {}); await settle(p, 200); }
      await cap(p, '04-sheet', t + '-open', 'Sheet tab ' + t + ' (every fold open)', SH);
    });
  }
  await state('04-sheet', 'outburst-schools', 'Sheet MAGIC: Outburst designer, each school', SH + '; data/soul_modules.json', async () => {
    await p.locator('[role="tablist"][aria-label="Sheet"] [role="tab"][data-tab="magic"]').click(); await settle(p, 400);
    for (const school of ['damage', 'buff', 'control', 'status']) {
      await act(p, { type: 'sandbox/learn', charId: cid, school });
      const sel = p.locator('select').filter({ has: p.locator('option[value="' + school + '"]') }).first();
      await sel.selectOption(school); await settle(p, 400);
      await cap(p, '04-sheet', 'magic-school-' + school, 'Outburst designer, school ' + school, SH + '; data/soul_modules.json');
    } });
  // level-up
  await state('05-levelup', 'levelup', 'Level-up screen', 'templates/levelup.template.html; screens/levelup.js', async () => {
    await act(p, { type: 'sandbox/class', charId: cid, classId: 'marksman', rank: 1 }); await act(p, { type: 'sandbox/level', charId: cid, level: 9 }); await settle(p, 500);
    await p.locator('button', { hasText: /Level up|Earn your class/ }).first().click(); await p.locator('.phc-lu-core').first().waitFor({ timeout: 30000 });
    await cap(p, '05-levelup', 'levelup', 'Level-up screen', 'templates/levelup.template.html; screens/levelup.js; data/classes.json');
    await p.getByRole('button', { name: /^What is .*\? Read its EPCCG entry$/ }).first().click(); await settle(p, 400);
    await cap(p, '05-levelup', 'levelup-skill-page', 'Level-up skill "?" page', 'screens/levelup.js; screens/shared.js; templates/epccg.template.html');
    await p.keyboard.press('Escape'); await settle(p, 300);
    await p.evaluate(() => window.__phc.go('main')); await settle(p, 400);
  });
  // the fight
  const FT = 'templates/combat.template.html; screens/combat.js; game/actionTip.ts; game/commands.ts; data/actions.json; data/techniques.json; data/conditions.json';
  await state('06-fight', 'start', 'Fight screen at the start', FT, async () => {
    await act(p, { type: 'sandbox/skill', charId: cid, skill: 'ingenuity', points: 7 });
    await act(p, { type: 'sandbox/fight' });
    await p.waitForFunction(() => window.__phc.getState().game?.phase === 'combat', null, { timeout: 30000 });
    await act(p, { type: 'sandbox/clear' }); await act(p, { type: 'sandbox/spawn', tier: 'soldier', weapon: 'combat_knife', at: 'F4' });
    for (let i = 0; i < 30; i++) { const cb = (await G(p)).combat, cur = cb.units.find((u) => u.id === cb.order[cb.turn]); if (cur && cur.side === 'pc' && cur.charId && cur.ap >= 5) break; if (cur) await act(p, { type: 'combat/end-turn', unitId: cur.id }); await settle(p, 250); }
    await settle(p, 800); await dismissCut(p);
    await p.waitForSelector('[role="tablist"][aria-label="Actions"] [role="tab"]', { timeout: 30000 });
    await cap(p, '06-fight', 'start', 'Fight screen at the start', FT);
  });
  const tabs = p.locator('[role="tablist"][aria-label="Actions"] [role="tab"]');
  const nTabs = await tabs.count().catch(() => 0);
  for (let i = 0; i < nTabs; i++) await state('06-fight', 'tab-' + i, 'Fight tab #' + i, FT, async () => {
    await tabs.nth(i).click(); await settle(p, 400);
    const id = (await tabs.nth(i).getAttribute('id')) || ('tab' + i);
    await cap(p, '06-fight', id, 'Fight tab ' + id, FT);
    const row = p.locator('[role="tabpanel"] button.phc-cb-act[data-act]').first();
    if (await row.count()) {
      const tip = await hoverText(row);
      await cap(p, '06-fight', id + '-row-tooltip', 'Fight tab ' + id + ', first row hovered', FT, 'TOOLTIP: ' + tip);
      await row.click(); await settle(p, 400);
      await cap(p, '06-fight', id + '-row-selected', 'Fight tab ' + id + ', first row selected (preview box)', FT);
      await p.keyboard.press('Escape'); await settle(p, 200);
    } });
  await state('06-fight', 'token-hover', 'Fight: token hover card', FT, async () => {
    const tok = p.locator('.phc-grid button.phc-tok[aria-label^="F4 ·"]').first(); await tok.scrollIntoViewIfNeeded(); await tok.hover(); await settle(p, 400);
    await cap(p, '06-fight', 'token-hover', 'Fight: token hover card (enemy)', FT, 'LABEL: ' + (await tok.getAttribute('aria-label')));
  });
  await state('06-fight', 'all-open', 'Fight: every fold open', FT, async () => {
    for (const m of await p.locator('[data-meter-more]:visible').all()) await m.click().catch(() => {});
    for (const f of await p.locator('button[data-fold][aria-expanded="false"]').all()) if (await f.isVisible()) await f.click({ timeout: 3000 }).catch(() => {});
    await cap(p, '06-fight', 'all-open', 'Fight: every fold open', FT);
  });
  await state('06-fight', 'shield-strip', 'Fight: shield and status strip', FT, async () => {
    const me = (await G(p)).combat.units.find((u) => u.side === 'pc' && u.charId);
    await act(p, { type: 'sandbox/meter', unitId: me.id, shield: 30 }); await settle(p, 500);
    await cap(p, '06-fight', 'shield-strip', 'Fight: a shield on the HP bar and the status strip', FT);
  });
  await state('06-fight', 'outburst-held', 'Fight: Outburst begun', FT + '; game/heartView.ts', async () => {
    await pickAction(p, /Begin/); await settle(p, 400); await cap(p, '06-fight', 'outburst-begin-selected', 'Fight: Begin selected', FT + '; game/heartView.ts');
    await p.getByRole('button', { name: /^Confirm/ }).first().click(); await settle(p, 800); await dismissCut(p);
    await cap(p, '06-fight', 'outburst-held', 'Fight: an Outburst held (heart panel)', FT + '; game/heartView.ts');
  });
  await state('06-fight', 'victory', 'Fight: victory panel', FT, async () => {
    await act(p, { type: 'sandbox/clear' }); await settle(p, 600);   // (clear leaves no foe: may not end the fight; if the panel is not up, MISSING)
    await p.getByText('VICTORY').first().waitFor({ timeout: 30000 }); await cap(p, '06-fight', 'victory', 'Fight: victory panel', FT);
  });
  await p.context().close(); }

// ------------------------------------------------------------------ 08 Survival
{ const SEED = 'PHC-0046';
  const p = await player(browser, 'host', { play: 'survival' });
  await p.context().addInitScript((seed) => { try { localStorage.setItem('phc.testRoom', '1'); localStorage.setItem('phc.testSeed', seed); } catch { /* */ } }, SEED);
  await sized(p);
  const S = 'game/LoadoutScreen.tsx; game/PathMap.tsx; game/PlaceScreen.tsx; game/ShopScreen.tsx; game/RewardPanel.tsx; game/StageScreen.tsx; data/survival.json';
  await hostAs(p, 'Leon'); await click(p, 'Create a character');
  await p.getByPlaceholder('What the squad calls you').fill('Kade');
  await p.locator('main button[aria-pressed]').first().click(); await click(p, 'Next ›');
  await p.locator('button', { hasText: /^Use .* ›$/ }).first().click();
  for (let i = 0; i < 4; i++) await click(p, 'Next ›');
  await click(p, 'Next ›'); await lockIn(p); await p.waitForSelector('text=✓ LOCKED IN', { timeout: 30000 });
  await click(p, 'Start the run');
  await p.waitForSelector('[data-phc-camp]', { timeout: 60000 });
  await state('08-survival', 'camp-1', 'Camp step 1', S, () => cap(p, '08-survival', 'camp-1', 'Camp step 1: free weapon', S));
  for (const n of [2, 3]) await state('08-survival', 'camp-' + n, 'Camp step ' + n, S, async () => { await p.locator('[data-phc-camp-step="' + n + '"]').click(); await cap(p, '08-survival', 'camp-' + n, 'Camp step ' + n, S); });
  await state('08-survival', 'camp-recommended', 'Camp after Recommended', S, async () => { await p.locator('[data-phc-camp-recommended]').click(); await cap(p, '08-survival', 'camp-recommended', 'Camp after Recommended', S); });
  // campStart goes the rest of the way: the starting boon, then Ready
  await p.locator('[data-phc-camp-step="1"]').click();
  await state('08-survival', 'camp-boon', 'Camp starting boon', S, async () => {
    if (await p.locator('[data-phc-camp-next]').count()) await p.locator('[data-phc-camp-next]').click(); else await p.locator('[data-phc-camp-step="2"]').click();
    await settle(p, 300); const b = p.locator('[data-phc-dialog] button', { hasText: /without/ }); if (await b.count()) await b.click();
    await p.waitForSelector('[data-phc-startboon]', { timeout: 30000 }); await cap(p, '08-survival', 'camp-boon', 'Camp: the starting boon', S);
    await p.locator('[data-phc-startboon]').first().click(); await p.locator('[data-phc-camp-ready]').click(); await settle(p, 400);
    const d = p.locator('[data-phc-dialog] button', { hasText: /without/ }); if (await d.count()) await d.click();
  });
  await p.waitForSelector('[data-phc-pathmap]', { timeout: 60000 });
  await state('08-survival', 'path-map', 'Path map', S, () => cap(p, '08-survival', 'path-map', 'Path map, stage 1', S));
  await state('08-survival', 'node-hover-reachable', 'Path map node hover (reachable)', S, async () => {
    const n = p.locator('[data-phc-node][data-phc-state="reachable"]').first(); const t = await hoverText(n); await cap(p, '08-survival', 'node-hover-reachable', 'Node hover card, reachable node', S, 'NODE TIP: ' + (await n.getAttribute('data-tip-text') || t));
  });
  await state('08-survival', 'node-hover-locked', 'Path map node hover (locked)', S, async () => {
    const n = p.locator('[data-phc-node]:not([data-phc-state="reachable"])').first(); await n.hover(); await settle(p, 400); await cap(p, '08-survival', 'node-hover-locked', 'Node hover card, locked node', S, 'NODE TIP: ' + (await n.getAttribute('data-tip-text')));
  });
  // walk to each kind; the helper is plan 2.5's walkTo (inline it here)
  const run = () => p.evaluate(() => window.__phc.getState().game?.run);
  async function walkTo(kind) {
    for (let i = 0; i < 60; i++) {
      const r = await run(); if (!r) return false;
      const by = Object.fromEntries(r.nodes.map((n) => [n.id, n])), at = r.at ? by[r.at] : null;
      if (r.state === 'fight') { await act(p, { type: 'run/skip' }); await settle(p, 300); continue; }
      if (r.state === 'field') { await act(p, { type: 'run/leave', close: true }); await settle(p, 300); continue; }
      if (r.state === 'reward') { for (const [id, o] of Object.entries(r.offers || {})) await act(p, { type: 'run/pick', charId: id, choice: o.materials && o.materials.length ? 'materials' : 0 }); for (const id of Object.keys(r.lasting || {})) await act(p, { type: 'run/take', charId: id, choice: 0 }); await settle(p, 300); continue; }
      if (r.state === 'shop') { if (kind === 'shop') return true; await act(p, { type: 'run/leave' }); await settle(p, 300); continue; }
      if (r.state === 'map') {
        if (at && at.kind === kind && r.visit) return true;
        if (r.visit && await p.locator('[data-phc-phase="leave"]').count()) { await p.locator('[data-phc-phase="leave"]').click(); await settle(p, 400); continue; }
        const ids = at ? at.links : r.nodes.filter((n) => n.depth === 1).map((n) => n.id);
        const next = ids.find((id) => by[id].kind === kind) || ids.find((id) => by[id].kind !== 'vault_guard') || ids[0];
        const e = await act(p, { type: 'run/move', node: next }); if (e) return false; await settle(p, 500); continue;
      }
      return false;
    }
    return false;
  }
  const PL = 'game/PlaceScreen.tsx; engine run/places.ts TABS; engine run/placeview.ts; data/survival.json';
  const tabsOf = { shop: ['always', 'gear', 'upgrade', 'sell'], forge: ['upgrade', 'stock', 'fit'], training: ['train'], shrine: ['shrine'], event: ['trade'], rest: ['train'] };
  for (const kind of ['training', 'shrine', 'forge', 'event', 'rest', 'shop']) {
    await state('08-survival', kind, 'Survival node ' + kind, PL, async () => {
      if (!(await walkTo(kind))) throw new Error('no route to a ' + kind + ' node on this seed (plan 2.5)');
      await settle(p, 600); await cap(p, '08-survival', 'node-' + kind, 'Node ' + kind + ' on arrival', PL);
      for (const t of tabsOf[kind]) { const b = p.locator('[data-phc-tab="' + t + '"]'); if (await b.count()) { await b.click(); await settle(p, 400); await cap(p, '08-survival', 'node-' + kind + '-tab-' + t, 'Node ' + kind + ', tab ' + t, PL); } }
    });
  }
  // the fight, the field, the reward panel (a won fight): walk to the next fight node by hand
  await state('08-survival', 'fight-field-reward', 'Survival fight, field, reward', S, async () => {
    for (let i = 0; i < 30; i++) { const r = await run(); if (r.state === 'map' && !r.visit) { const by = Object.fromEntries(r.nodes.map((n) => [n.id, n])), at = r.at ? by[r.at] : null, ids = at ? at.links : []; const f = ids.find((id) => by[id].kind === 'fight') || ids[0]; if (!f) break; if (await act(p, { type: 'run/move', node: f })) break; await settle(p, 500); if ((await run()).state === 'fight') break; } else if (r.state === 'map' && r.visit) { await p.locator('[data-phc-phase="leave"]').click(); await settle(p, 400); } else break; }
    if ((await run()).state !== 'fight') throw new Error('no fight node reached');
    await settle(p, 1500); await dismissCut(p); await cap(p, '08-survival', 'fight-start', 'Survival fight start', 'screens/combat.js; templates/combat.template.html');
    await act(p, { type: 'run/skip' }); await settle(p, 1500); await dismissCut(p);
    await cap(p, '08-survival', 'field', 'Survival: the field after a won fight', 'templates/combat.template.html; game/fieldView.ts; data/survival.json field');
    await act(p, { type: 'run/leave', close: true }); await settle(p, 800);
    await cap(p, '08-survival', 'reward-panel', 'Survival: reward panel', 'game/RewardPanel.tsx; game/rewardCards.tsx; game/rewardPanelView.ts');
  });
  // the boss, the boon pick, the next tile, the summary: walk with run/skip to the Boss
  await state('08-survival', 'boon-tile-summary', 'Survival: boon pick, next tile, summary', 'game/StageScreen.tsx; game/stageView.ts; data/survival.json boons', async () => {
    for (let i = 0; i < 80; i++) {
      const r = await run(); if (r.state === 'boon') break;
      if (r.state === 'fight') await act(p, { type: 'run/skip' });
      else if (r.state === 'field') await act(p, { type: 'run/leave', close: true });
      else if (r.state === 'shop') await act(p, { type: 'run/leave' });
      else if (r.state === 'reward') { for (const [id, o] of Object.entries(r.offers || {})) await act(p, { type: 'run/pick', charId: id, choice: o.materials && o.materials.length ? 'materials' : 0 }); for (const id of Object.keys(r.lasting || {})) await act(p, { type: 'run/take', charId: id, choice: 0 }); }
      else if (r.state === 'map') { const by = Object.fromEntries(r.nodes.map((n) => [n.id, n])), at = r.at ? by[r.at] : null; if (r.visit && await p.locator('[data-phc-phase="leave"]').count()) { await p.locator('[data-phc-phase="leave"]').click(); } else { const ids = (at ? at.links : r.nodes.filter((n) => n.depth === 1).map((n) => n.id)).filter((id) => by[id].kind !== 'vault_guard'); if (!ids.length || await act(p, { type: 'run/move', node: ids[0] })) break; } }
      await settle(p, 300);
    }
    if ((await run()).state !== 'boon') throw new Error('the Boss was not reached');
    await settle(p, 800); await cap(p, '08-survival', 'boon-pick', 'Survival: boon pick', 'game/StageScreen.tsx; data/survival.json boons');
    const cid = Object.keys((await G(p)).characters)[0];
    await act(p, { type: 'run/boon', charId: cid, choice: 0 }); await settle(p, 600);
    await cap(p, '08-survival', 'next-tile', 'Survival: the next tile', 'game/StageScreen.tsx; data/survival.json world');
    await act(p, { type: 'run/retire' }); await settle(p, 800);
    await cap(p, '08-survival', 'summary', 'Survival: run summary', 'game/StageScreen.tsx; game/RunTally.tsx; game/runReport.ts');
  });
  // settings from inside a room
  await state('09-settings', 'settings', 'Settings panel', 'game/settings.tsx', async () => {
    await p.locator('[data-phc-cog]').click(); await settle(p, 500);
    for (const t of ['audio', 'voice', 'combat', 'tabs', 'display']) { await p.locator('#phc-set-' + t).click(); await settle(p, 400); await cap(p, '09-settings', 'settings-' + t, 'Settings, tab ' + t, 'game/settings.tsx; game/voiceSettings.tsx; game/fightTabsPanel.tsx'); }
  });
  await p.context().close(); }

await browser.close();
mkdirSync(ROOT, { recursive: true });
writeFileSync(ROOT + 'index.md', '# Capture index (' + new Date().toISOString() + ')\n\n| file | screen | where its words are edited | note |\n| --- | --- | --- | --- |\n' + index.map((r) => '| ' + r.file + ' | ' + r.screen + ' | ' + r.sources + ' | ' + (r.why || '') + ' |').join('\n') + '\n');
console.log('done: ' + index.length + ' rows, ' + missing + ' states missing; see ' + ROOT + 'index.md');
ok('captured ' + index.length + ' rows', index.length > 0);
ok('every state reached (' + missing + ' missing)', missing === 0);
