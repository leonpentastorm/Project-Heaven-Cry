// Skeleton 2.0 on screen, walked in a real browser at 1440×900 and 1280×720:
//   1. creation's Archetype step: 46 cards, each with its nine attributes (the highest marked) and the class it leads
//      to; the preview's nine attributes; no Core chips or rows;
//   2. the "?" skill page (the slot in words, what a point gives) and the attribute page behind an attribute's name;
//   3. the level-up screen in the Proving Ground: no Core widgets, what a point of each attribute gives, the ceiling
//      for the level, and the engine's reason beside a refused raise;
//   4. the story screen's sheet tabs and the fight panel's action tabs wrapping onto two lines (no sideways scroll,
//      arrow keys in the order on screen, the grid and Confirm still in view);
//   5. a fight with three talking skills and a shield: the Calls tab, a Call made, the shield's block with its Guard pips.
// Shots for Leon: docs/design/handoffs/skeleton-2.0-shots/{archetypes,skillpage,levelup,tabs-wrap,calls,shield}-*.png
// (or SHOTS=<dir>).
import { mkdirSync } from 'fs';
import { chromium, click, player, hostAs, BASE, settle } from './lib.mjs';
const SHOTS = process.env.SHOTS || new URL('../../../docs/design/handoffs/skeleton-2.0-shots/', import.meta.url).pathname.replace(/\/$/, '');
mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch();
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const SIZES = [[1440, 900], [1280, 720]];
const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };
const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);

// ---------- 1 and 2: creation ----------
{
  const p = await player(browser, 'A');
  await hostAs(p, 'Leon');
  await click(p, 'Create a character');
  await p.getByPlaceholder('What the squad calls you').fill('Vess');
  const step = async (name) => { await p.getByRole('navigation', { name: 'Creation steps' }).getByRole('button', { name }).click(); await settle(p, 300); };
  for (const [W, H] of SIZES) {
    const at = W + '×' + H + ': ';
    await p.setViewportSize({ width: W, height: H });
    await step('Archetype');
    await p.locator('[data-arch="bulwark"]').click(); await settle(p, 200);
    const A = await p.evaluate(() => {
      const cards = [...document.querySelectorAll('[data-arch-grid] [data-arch]')];
      const grids = cards.map((c) => { const cells = [...c.querySelectorAll('.phc-arch-attrs [data-attr]')]; const vals = cells.map((x) => Number(x.lastElementChild.textContent));
        const top = cells.filter((x) => x.getAttribute('data-top') === 'true').map((x) => Number(x.lastElementChild.textContent));
        const box = c.getBoundingClientRect(), g = c.querySelector('.phc-arch-attrs').getBoundingClientRect();
        return { id: c.getAttribute('data-arch'), n: cells.length, vals, topOk: top.length > 0 && top.every((v) => v === Math.max(...vals)), inside: g.bottom <= box.bottom + 1 && g.right <= box.right + 1 && g.top >= box.top, leads: (c.querySelector('.phc-arch-leads') || {}).textContent || '', text: c.innerText,
          inks: new Set(cells.filter((x) => Number(x.lastElementChild.textContent) > 1).map((x) => getComputedStyle(x).borderTopColor)).size }; });
      const pv = document.querySelector('[data-arch-preview]');
      return { grids, pvRows: pv.querySelectorAll('.phc-arch-pv-attrs [data-attr]').length, pvTop: pv.querySelectorAll('.phc-arch-top').length, pvText: pv.innerText };
    });
    ok(at + '46 archetype cards, each with nine attributes', A.grids.length === 46 && A.grids.every((g) => g.n === 9));
    ok(at + 'every card marks its highest attribute, and says the class it leads to', A.grids.every((g) => g.topOk && /^Leads to: \w/.test(g.leads)));
    ok(at + 'the nine sit inside their card', A.grids.every((g) => g.inside));
    ok(at + 'the attributes wear their own inks (a card with several raised shows several colours)', A.grids.some((g) => g.inks >= 3));
    const stray = A.grids.map((g) => g.text).join('\n').match(/\b(BODY|MIND|SOUL) \d|\bcore\b/i);
    ok(at + 'no Core chips on the cards' + (stray ? ' (' + stray[0] + ')' : ''), !stray);
    ok(at + 'the preview: nine attributes, the highest marked, "Leads to", no Core rows', A.pvRows === 9 && A.pvTop >= 1 && /Leads to:/.test(A.pvText) && !/FEEBLE|LEGENDARY|EXCEPTIONAL/.test(A.pvText));
    ok(at + 'no sideways page scroll (' + await sideways(p) + ' px over)', (await sideways(p)) <= 1);
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.screenshot({ path: SHOTS + '/archetypes-' + W + '.png' });

    // the attribute page, from the preview's attribute name
    await p.locator('[data-arch-preview] .phc-arch-attrname').first().click(); await settle(p, 250);
    const ap = p.locator('.phc-attr-page');
    ok(at + 'an attribute\'s name opens its page: what a point gives, three skills, what reads it',
      (await ap.count()) === 1 && /WHAT A POINT GIVES/.test(await ap.innerText()) && (await ap.locator('button.phc-attr-skill').count()) === 3 && /WHAT READS IT/.test(await ap.innerText()) && /CLASS/.test(await ap.innerText()) && /CALL/.test(await ap.innerText()));
    await p.screenshot({ path: SHOTS + '/skillpage-attribute-' + W + '.png' });
    // one of its skills opens the skill's own page
    await ap.locator('button.phc-attr-skill').nth(2).click(); await settle(p, 300);
    const ep = p.locator('[role="dialog"][aria-label$="EPCCG entry"]');
    const line = (await ep.locator('.phc-ep-line').innerText()).replace(/\s+/g, ' ');
    ok(at + 'the "?" page says the slot in words: ' + line, /^How you talk and notice: it rolls 1 better on checks · \w+/.test(line) && !/[αβγ]|Body|Mind|Soul/.test(line));
    ok(at + '…and what a point gives', /WHAT A POINT GIVES\s*\S/.test(await ep.locator('.phc-ep-give').innerText()));
    await p.screenshot({ path: SHOTS + '/skillpage-' + W + '.png' });
    await ep.getByRole('button', { name: 'Close the EPCCG entry' }).click(); await settle(p, 150);
    // from the points step: an attribute's name opens the page; a skill's "?" a fighting skill's page
    await p.locator('[data-arch-preview] button', { hasText: /^Use / }).click(); await settle(p, 300);
    await p.locator('[data-attr-page="agility"]').click(); await settle(p, 250);
    ok(at + 'on the points step, AGILITY opens the Agility page', (await p.locator('.phc-attr-page h2').innerText()) === 'Agility');
    await p.locator('.phc-attr-page button.phc-attr-skill').first().click(); await settle(p, 250);
    const line2 = (await ep.locator('.phc-ep-line').innerText()).replace(/\s+/g, ' ');
    ok(at + 'its first skill is how you fight: ' + line2, line2 === 'How you fight · Agility');
    await ep.locator('.phc-ep-attr').click(); await settle(p, 200);
    ok(at + 'the attribute in the skill page\'s header goes back to the attribute page', (await p.locator('.phc-attr-page').count()) === 1 && (await ep.count()) === 0);
    await p.locator('.phc-attr-close').click(); await settle(p, 150);
  }
  ok('creation: no page errors' + (p.errors.length ? ': ' + p.errors.join(' | ') : ''), !p.errors.length);
  await p.context().close();
}

// ---------- 3, 4, 5: the Proving Ground ----------
{
  const p = await player(browser, 'host');
  const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
  const G = () => p.evaluate(() => window.__phc.getState().game);
  p.on('dialog', (d) => d.accept());
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.goto(BASE);
  await click(p, 'PROVING GROUND');
  const nm = p.getByPlaceholder('Leon');
  await Promise.race([nm.waitFor({ timeout: 20000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 20000 }).catch(() => {})]);
  if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
  await p.waitForFunction(() => window.__phc.getState().game?.sandbox?.state === 'ready', null, { timeout: 30000 });
  let g = await G(); const cid = Object.keys(g.characters)[0];
  await act({ type: 'sandbox/ai', on: false }); await act({ type: 'sandbox/auto', on: false });
  // level 4 (ceiling 8), points to spend; three talking skills, Durability for a Guard pool, a blade and a shield
  await act({ type: 'sandbox/level', charId: cid, level: 4 });
  for (const [sk, n] of [['intimidation', 5], ['charisma', 3], ['authority', 7], ['durability', 8], ['raw_power', 5], ['athletics', 4]]) ok('skill ' + sk + ' ' + n, (await act({ type: 'sandbox/skill', charId: cid, skill: sk, points: n })) === null);
  ok('a sabre in the main hand', (await act({ type: 'sandbox/give', charId: cid, item: 'sabre', equip: true })) === null);
  ok('a riot shield in the off hand', (await act({ type: 'sandbox/give', charId: cid, item: 'riot_shield', equip: true })) === null);
  g = await G();
  const c0 = g.characters[cid];
  console.log('note level ' + c0.level + ', unspent ' + JSON.stringify(c0.unspent) + ', off hand ' + JSON.stringify(c0.offHand) + ', Endurance ' + c0.attrs.endurance);
  const tools = p.locator('aside[aria-label="Proving Ground tools"]').first();
  const closeTools = async () => { if (await tools.count()) await tools.getByRole('button', { name: /^Close the tools/ }).first().click().catch(() => {}); };

  // ----- 4a. the sheet's tabs on the story screen -----
  await closeTools();
  for (const [W, H] of SIZES) {
    await p.setViewportSize({ width: W, height: H }); await settle(p, 300);
    const T = await p.evaluate(() => { const list = document.querySelector('[role="tablist"][aria-label="Sheet"]'); if (!list) return null; const tabs = [...list.querySelectorAll('[role="tab"]')], r = tabs.map((t) => t.getBoundingClientRect());
      return { n: tabs.length, names: tabs.map((t) => t.textContent), rows: new Set(r.map((x) => Math.round(x.top))).size, over: list.scrollWidth - list.clientWidth, cut: tabs.filter((t) => t.scrollWidth > t.clientWidth + 1).length, wrap: getComputedStyle(list).flexWrap, minW: Math.min(...r.map((x) => Math.round(x.width))), inside: r.every((x) => x.left >= list.getBoundingClientRect().left - 1 && x.right <= list.getBoundingClientRect().right + 1) }; });
    ok(W + '×' + H + ': the sheet has seven tabs that wrap (' + (T && T.rows) + ' line' + (T && T.rows > 1 ? 's' : '') + '), none cut, no sideways scroll', !!T && T.n === 7 && T.wrap === 'wrap' && T.over <= 1 && T.cut === 0 && T.inside && T.rows <= 2);
    if (T) console.log('note sheet tabs: ' + T.names.join(' | ') + ' · narrowest ' + T.minW + ' px');
  }
  await p.setViewportSize({ width: 1440, height: 900 }); await settle(p, 200);
  {
    const first = p.locator('[role="tablist"][aria-label="Sheet"] [role="tab"]').first(); await first.click(); await first.focus();
    const seen = [];
    for (let i = 0; i < 7; i++) { seen.push(await p.evaluate(() => document.activeElement.getAttribute('data-tab'))); await p.keyboard.press('ArrowRight'); await settle(p, 80); }
    const vis = await p.evaluate(() => [...document.querySelectorAll('[role="tablist"][aria-label="Sheet"] [role="tab"]')].map((t) => ({ id: t.getAttribute('data-tab'), r: t.getBoundingClientRect() })).sort((a, b) => Math.round(a.r.top) - Math.round(b.r.top) || a.r.left - b.r.left).map((x) => x.id));
    ok('sheet tabs: ArrowRight walks them in the order on screen (' + seen.join(' → ') + ') and wraps', seen.join() === vis.join() && (await p.evaluate(() => document.activeElement.getAttribute('data-tab'))) === vis[0]);
    const rows = await p.evaluate(() => new Set([...document.querySelectorAll('[role="tablist"][aria-label="Sheet"] [role="tab"]')].map((t) => Math.round(t.getBoundingClientRect().top))).size);
    if (rows > 1) { await p.keyboard.press('ArrowDown'); await settle(p, 80);
      const d = await p.evaluate(() => { const a = document.activeElement, tabs = [...document.querySelectorAll('[role="tablist"][aria-label="Sheet"] [role="tab"]')]; return Math.round(a.getBoundingClientRect().top) > Math.round(tabs[0].getBoundingClientRect().top) && a.getAttribute('aria-selected') === 'true'; });
      ok('sheet tabs: ArrowDown goes to the line below and opens that tab', d); }
    await p.locator('[role="tablist"][aria-label="Sheet"] [role="tab"][data-tab="arms"]').click(); await settle(p, 250);
    const mark = await p.evaluate(() => { const tabs = [...document.querySelectorAll('[role="tablist"][aria-label="Sheet"] [role="tab"]')]; const on = tabs.filter((t) => getComputedStyle(t).borderBottomColor === 'rgb(231, 235, 243)'); return on.map((t) => t.getAttribute('data-tab')); });
    ok('the open tab\'s mark is on that tab only (' + mark.join() + ')', mark.join() === 'arms');
  }
  for (const [W, H] of SIZES) { await p.setViewportSize({ width: W, height: H }); await settle(p, 300); await p.screenshot({ path: SHOTS + '/tabs-wrap-sheet-' + W + '.png' }); }
  // the Status tab's derived lines name the skills the rules read
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.locator('[role="tablist"][aria-label="Sheet"] [role="tab"][data-tab="status"]').click(); await settle(p, 300);
  const from = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-derived]')].map((r) => [r.getAttribute('data-derived'), (r.querySelector('[data-derived-from]') || {}).textContent || ''])));
  ok('Status: HP per level from Pain Threshold, healing given Empathy, received Camaraderie, shields Conscience', from.hp_level === 'Pain Threshold' && /Empathy/.test(from.heal_given) && from.heal_received === 'Camaraderie' && from.shield_received === 'Conscience');
  ok('Status: Brain save Rumination, critical damage taken Acuity, ambush damage taken Improvisation, ranges Brain Power and Will Power', from.save_brain === 'Rumination' && /Acuity/.test(from.crit_taken) && from.ambush_taken === 'Improvisation' && from.sigil_range === 'Brain Power' && from.soul_range === 'Will Power' && from.ready_designs === 'Will Power');
  await p.screenshot({ path: SHOTS + '/sheet-status-1440.png' });

  // ----- 3. level up -----
  await p.locator('button', { hasText: /Level up|Earn your class/ }).first().click();
  await p.locator('.phc-lu-core').first().waitFor({ timeout: 30000 });
  for (const [W, H] of SIZES) {
    const at = W + '×' + H + ': ';
    await p.setViewportSize({ width: W, height: H }); await settle(p, 400);
    const L = await p.evaluate(() => ({ fams: document.querySelectorAll('.phc-lu-core').length, attrs: document.querySelectorAll('.phc-lu-attrcol').length, skills: document.querySelectorAll('.phc-lu-skill').length,
      coreBtn: document.querySelectorAll('button[data-raise="core"]').length, ceil: (document.querySelector('.phc-lu-ceiling') || {}).textContent || '', ceils: [...document.querySelectorAll('.phc-lu-ceil')].map((x) => x.textContent),
      next: [...document.querySelectorAll('.phc-lu-attr-next')].map((x) => x.textContent), gives: document.querySelectorAll('.phc-lu-give').length, slots: [...document.querySelectorAll('.phc-lu-attrcol[data-attr="endurance"] .phc-lu-slot')].map((x) => x.textContent),
      why: (document.querySelector('.phc-lu-attrcol[data-attr="endurance"] .phc-lu-attr-why') || {}).textContent || '', off: (document.querySelector('.phc-lu-attrcol[data-attr="endurance"] button[data-raise="attr"]') || {}).disabled,
      spend: (document.querySelector('.phc-lu-spend') || {}).textContent || '', text: document.querySelector('.phc-lu-body').innerText + ' ' + document.querySelector('header').innerText }));
    ok(at + 'three families as headings, nine attributes, 27 skills, no Core button', L.fams === 3 && L.attrs === 9 && L.skills === 27 && L.coreBtn === 0);
    const stray = L.text.replace(/mana cores?|core charge|Sigil Core|a core\b|cores\b/gi, '').match(/Core points?|its Core|\d Core\b|FEEBLE|LEGENDARY|rules \d|[a-z]_[a-z]/);
    ok(at + 'nothing says Core points, a rules number or an id' + (stray ? ' (' + stray[0] + ')' : ''), !stray);
    ok(at + 'the ceiling is said beside the attributes: ' + L.ceil, L.ceil === 'Attributes: ceiling 8 at this level (9 from level 6, 10 from level 9)' && L.ceils.length === 3 && L.ceils.every((x) => x === 'ceiling 8 at this level'));
    ok(at + 'every attribute says what a point gives', L.next.length === 9 && L.next.some((t) => /\+15 max HP/.test(t)) && L.next.some((t) => /\+0\.5 tile of movement an AP/.test(t)));
    ok(at + 'every skill says what a point gives, and its slot in words (' + L.slots.join(', ') + ')', L.gives === 27 && L.slots.join() === 'FIGHT,SURVIVE,TALK · NOTICE');
    ok(at + 'Endurance 8 is at the ceiling: +1 off, with the engine\'s reason: ' + L.why, L.off === true && /^Endurance 9 opens at level 6/.test(L.why));
    ok(at + 'what is left to spend, in words: ' + L.spend, /Skill point|Attribute point/.test(L.spend) && !/Core/.test(L.spend));
    ok(at + 'no sideways page scroll (' + await sideways(p) + ' px over)', (await sideways(p)) <= 1);
    // the window shot shows the tree (the class picker above it is in the full-page shot)
    await p.evaluate(() => { const el = document.querySelector('.phc-lu-guide'); window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 12); }); await settle(p, 150);
    await p.screenshot({ path: SHOTS + '/levelup-' + W + '.png' }); await p.evaluate(() => window.scrollTo(0, 0));
    await p.screenshot({ path: SHOTS + '/levelup-' + W + '-full.png', fullPage: true });
  }
  // an Attribute point spent with a +1, and an attribute's name opens its page
  { const before = (await G()).characters[cid];
    await p.locator('.phc-lu-attrcol[data-attr="perception"] button[data-raise="attr"]').click(); await settle(p, 250);
    const after = (await G()).characters[cid];
    ok('an Attribute point spent on Perception (' + before.attrs.perception + ' → ' + after.attrs.perception + ')', after.attrs.perception === before.attrs.perception + 1 && after.unspent.attr === before.unspent.attr - 1);
    await p.locator('.phc-lu-attrcol[data-attr="endurance"] .phc-lu-attrname').click(); await settle(p, 250);
    ok('level up: Endurance\'s name opens the Endurance page', (await p.locator('.phc-attr-page h2').innerText()) === 'Endurance');
    await p.screenshot({ path: SHOTS + '/levelup-attribute-page.png' });
    await p.locator('.phc-attr-close').click(); }
  await p.locator('button.phc-lu-done').click(); await settle(p, 500);

  // ----- 5. the fight -----
  // every tab up: a class, a patron, words and designs known (no focus in hand: the tabs still show)
  await act({ type: 'sandbox/class', charId: cid, classId: 'defender', rank: 1 });
  for (const w of ['fire', 'seek']) await act({ type: 'sandbox/learn', charId: cid, word: w });
  await act({ type: 'sandbox/learn', charId: cid, school: 'damage' });
  await act({ type: 'sandbox/design', charId: cid, design: { id: '', name: 'Red Hand', school: 'damage', modules: [] } });
  await act({ type: 'sandbox/faith', charId: cid, belief: 'faithful', patron: 'old_overcast', faith: 3, devotion: 5, reset: true });
  await act({ type: 'sandbox/skill', charId: cid, skill: 'will_power', points: 10 }); // its Mastered perk: a row on the Perks tab, so all nine tabs are up
  await act({ type: 'sandbox/fight' });
  await p.waitForFunction(() => window.__phc.getState().game?.phase === 'combat', null, { timeout: 30000 });
  await p.waitForFunction((id) => { const cb = window.__phc.getState().game.combat; const u = cb && cb.units.find((x) => x.id === cb.order[cb.turn]); return !!u && u.charId === id && u.ap >= 4; }, cid, { timeout: 45000 });
  await settle(p, 2600);
  const dismiss = async () => { for (let i = 0; i < 3 && (await p.locator('[data-phc-cutin]').count()); i++) { await p.mouse.click(1430, 890); await settle(p, 400); } };
  await dismiss(); await closeTools();
  // (a Faithful character is asked for a vow as the fight opens: answered, so the panel is the turn's)
  { const un = p.getByRole('button', { name: 'Fight unsworn' }); if (await un.count()) { await un.first().click(); await settle(p, 400); } }
  // a foe four tiles away, in earshot and in the open
  let me = (await G()).combat.units.find((u) => u.charId === cid);
  const spot = await p.evaluate((pos) => { const cb = window.__phc.getState().game.combat, [x, y] = pos.split(',').map(Number), taken = new Set(cb.units.filter((u) => !u.dead).map((u) => u.pos));
    const out = []; for (const d of [3, 4, 2, 5]) for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d], [d, 1], [-d, 1], [d, -1], [-d, -1]]) { const k = (x + dx) + ',' + (y + dy); if (x + dx >= 0 && y + dy >= 0 && x + dx < cb.map.w && y + dy < cb.map.h && !taken.has(k)) out.push(k); } return out; }, me.pos);
  let rook = null;
  for (const k of spot) { if ((await act({ type: 'sandbox/spawn', tier: 'soldier', weapon: 'fists', at: ref(k), name: 'Rook' })) === null) { rook = k; break; } }
  ok('a trooper (Rook) stands ' + (rook ? 'at ' + ref(rook) : 'nowhere'), !!rook);
  await settle(p, 400);
  const tabsOf = () => p.evaluate(() => { const list = document.querySelector('[role="tablist"][aria-label="Actions"]'); const tabs = [...list.querySelectorAll('[role="tab"]')], r = tabs.map((t) => t.getBoundingClientRect()), lb = list.getBoundingClientRect();
    return { ids: tabs.map((t) => t.getAttribute('data-tab')), rows: new Set(r.map((x) => Math.round(x.top))).size, over: list.scrollWidth - list.clientWidth, wrap: getComputedStyle(list).flexWrap, ox: getComputedStyle(list).overflowX, cut: tabs.filter((t) => t.scrollWidth > t.clientWidth + 1).map((t) => t.getAttribute('data-tab')),
      inside: r.every((x) => x.left >= lb.left - 1 && x.right <= lb.right + 1), vis: tabs.map((t, i) => ({ id: t.getAttribute('data-tab'), r: r[i] })).sort((a, b) => Math.round(a.r.top) - Math.round(b.r.top) || a.r.left - b.r.left).map((x) => x.id),
      under: tabs.filter((t) => getComputedStyle(t).backgroundColor === 'rgb(28, 37, 54)').map((t) => t.getAttribute('data-tab')), sel: tabs.filter((t) => t.getAttribute('aria-selected') === 'true').map((t) => t.getAttribute('data-tab')) }; });
  const inView = () => p.evaluate(() => { const r = (el) => el && el.getBoundingClientRect(), W = innerWidth, H = innerHeight;
    const grid = r(document.querySelector('.phc-grid-scroll')), conf = r(Array.from(document.querySelectorAll('button')).find((b) => /^(Confirm|Click a tile|End turn)/.test(b.textContent.trim())));
    const fits = (b) => !!b && b.top >= -1 && b.left >= -1 && b.bottom <= H + 1 && b.right <= W + 1;
    return { grid: fits(grid), confirm: fits(conf), pageScroll: document.documentElement.scrollHeight - H }; });
  const panel = () => p.locator('.phc-cb-tabpanel').first();

  for (const [W, H] of SIZES) {
    const at = W + '×' + H + ': ';
    await p.setViewportSize({ width: W, height: H }); await settle(p, 500); await dismiss();
    // ----- 4b. the action tabs -----
    await p.locator('#phc-tab-move').click(); await settle(p, 250);
    let T = await tabsOf();
    console.log('note ' + at + 'action tabs: ' + T.ids.join(' | ') + ' on ' + T.rows + ' line(s)');
    ok(at + 'the Calls tab is there, last (' + T.ids.length + ' tabs)', T.ids[T.ids.length - 1] === 'calls' && T.ids.length === 9);
    ok(at + 'the action tabs wrap: flex-wrap, no sideways scroll, none cut, all inside the panel', T.wrap === 'wrap' && T.ox !== 'auto' && T.ox !== 'scroll' && T.over <= 1 && !T.cut.length && T.inside);
    ok(at + 'the row is on ' + T.rows + ' lines (two at most)', T.rows >= 1 && T.rows <= 2);
    ok(at + 'the open tab\'s underline and fill are on that tab only (' + T.under.join() + ')', T.under.join() === T.sel.join() && T.sel.join() === 'move');
    let v = await inView();
    ok(at + 'the grid and the footer are in view, the page does not scroll (' + v.pageScroll + ' px)', v.grid && v.confirm && v.pageScroll <= 1);
    await p.screenshot({ path: SHOTS + '/tabs-wrap-' + W + '.png' });
    // keyboard: arrows in the order on screen, Up and Down between the lines, number keys to the ninth
    await p.locator('#phc-tab-move').focus();
    const seen = [];
    for (let i = 0; i < T.ids.length; i++) { seen.push(await p.evaluate(() => document.activeElement.getAttribute('data-tab'))); await p.keyboard.press('ArrowRight'); await settle(p, 90); }
    ok(at + 'ArrowRight walks the tabs in the order on screen and wraps (' + seen.join(' → ') + ')', seen.join() === T.vis.join() && (await p.evaluate(() => document.activeElement.getAttribute('data-tab'))) === T.vis[0]);
    if (T.rows > 1) {
      await p.keyboard.press('ArrowDown'); await settle(p, 90);
      const dn = await p.evaluate(() => { const a = document.activeElement, first = document.querySelector('#phc-tab-move'); return { id: a.getAttribute('data-tab'), lower: Math.round(a.getBoundingClientRect().top) > Math.round(first.getBoundingClientRect().top), sel: a.getAttribute('aria-selected') }; });
      ok(at + 'ArrowDown goes to the line below (' + dn.id + ')', dn.lower && dn.sel === 'true');
      await p.keyboard.press('ArrowUp'); await settle(p, 90);
      const up = await p.evaluate(() => { const a = document.activeElement, first = document.querySelector('#phc-tab-move'); return { id: a.getAttribute('data-tab'), top: Math.round(a.getBoundingClientRect().top) === Math.round(first.getBoundingClientRect().top) }; });
      ok(at + '…and ArrowUp comes back to the first line (' + up.id + ')', up.top);
    }
    await p.keyboard.press('End'); await settle(p, 90);
    ok(at + 'End opens the last tab (Calls)', (await tabsOf()).sel.join() === 'calls');
    await p.evaluate(() => document.activeElement && document.activeElement.blur()); await p.keyboard.press('1'); await settle(p, 120);
    const n = T.ids.length; if (n <= 9) { await p.keyboard.press(String(n)); await settle(p, 150); ok(at + 'key ' + n + ' opens the last tab too', (await tabsOf()).sel.join() === 'calls'); }

    // ----- 5a. the Calls tab -----
    await p.locator('#phc-tab-calls').click(); await settle(p, 300);
    const chips = await panel().locator('button[data-call]').evaluateAll((xs) => xs.map((x) => ({ id: x.getAttribute('data-call'), meta: (x.querySelector('[data-call-meta]') || {}).textContent, text: (x.querySelector('[data-call-text]') || {}).textContent, save: (x.querySelector('[data-call-save]') || {}).textContent || '', off: x.getAttribute('aria-disabled') })));
    ok(at + 'one chip per Call the speaker has: ' + chips.map((c) => c.id.replace('call.', '')).join(', '), ['call.order', 'call.rally', 'call.threaten'].every((id) => chips.some((c) => c.id === id)));
    ok(at + 'each chip has its AP, its reach and the text of its step', chips.every((c) => /^(\d AP|free) · \d+ tiles$/.test(c.meta) && c.text.length > 8));
    const th = chips.find((c) => c.id === 'call.threaten');
    ok(at + 'Threaten is 1 AP at 5 points and shows its save: ' + th.meta + ' · ' + th.save, /^1 AP/.test(th.meta) && /^Heart save, TN \d+$/.test(th.save));
    await panel().locator('button[data-call="call.threaten"]').click(); await settle(p, 300);
    const reach = await p.evaluate(() => [...document.querySelectorAll('.phc-plan')].length);
    ok(at + 'the grid shows the Call\'s reach (' + reach + ' tiles marked)', reach > 20);
    await p.locator('button.phc-tok[aria-label^="' + ref(rook) + ' ·"]').first().click(); await settle(p, 350);
    const foot = (await p.locator('.phc-cb-foot').first().innerText()).replace(/\s+/g, ' ');
    ok(at + 'the card: the Call, its target and the save with its TN', /Threaten · 1 AP · within \d+ tiles/.test(foot) && /To Rook\./.test(foot) && /Rook rolls a Heart save against TN \d+/.test(foot));
    v = await inView();
    ok(at + 'with a Call picked the grid and Confirm are in view (page scroll ' + v.pageScroll + ' px)', v.grid && v.confirm && v.pageScroll <= 1);
    await p.screenshot({ path: SHOTS + '/calls-' + W + '.png' });
    // Order: its things as toggles
    await panel().locator('button[data-call="call.order"]').click(); await settle(p, 300);
    const tg = await p.locator('.phc-cb-foot [role="group"][aria-label="Perk options on this action"] button').allTextContents();
    ok(at + 'Order shows what can be ordered as toggles (' + tg.join(', ') + ')', tg.join() === 'RELOAD,STAND UP,PICK UP,MOVE');
    await p.screenshot({ path: SHOTS + '/calls-order-' + W + '.png' });

    // ----- 5b. the shield's block on the Attack tab -----
    await p.locator('#phc-tab-attack').click(); await settle(p, 300);
    const head = panel().locator('[data-weapon-block="off"]');
    const hd = await head.evaluate((el) => ({ text: el.innerText.replace(/\s+/g, ' '), pips: el.querySelectorAll('[data-pips="guard"] > span').length, on: el.querySelectorAll('[data-pips="guard"] > span[data-on="true"]').length })).catch(() => null);
    me = (await G()).combat.units.find((u) => u.charId === cid);
    const gRow = await p.locator('[aria-label="Your resources"] [data-res="res-guard"]').first().innerText().then((t) => t.replace(/\s+/g, ' ')).catch(() => '');
    ok(at + 'the shield has its own block; its Guard is the unit panel\'s row, said once: ' + (hd && hd.text) + ' | ' + gRow, !!hd && /RIOT SHIELD/i.test(hd.text) && !/Guard \d/.test(hd.text) && hd.pips === 0 && gRow.includes((me.res.guard || 0) + ' / ' + me.resMax.guard));
    await panel().locator('[data-act="tpad:off"]').click(); await settle(p, 350);
    const sc = await p.locator('[data-tech-pad="tpad:off"] button[data-tech]').evaluateAll((xs) => xs.map((x) => [x.getAttribute('data-tech'), x.getAttribute('data-reaction')]));
    ok(at + 'its pad: Shield Bash and Raise Shield to use, Shield Wall and Interpose as reactions', sc.filter((x) => x[1] !== 'true').map((x) => x[0]).sort().join() === 'raise_shield,shield_bash' && sc.filter((x) => x[1] === 'true').map((x) => x[0]).sort().join() === 'interpose,shield_wall');
    await p.locator('[data-tech-pad="tpad:off"]').evaluate((el) => el.scrollIntoView({ block: 'end' })); await settle(p, 200);
    await p.screenshot({ path: SHOTS + '/shield-' + W + '.png' });
    await p.locator('[data-tech-pad="tpad:off"] button[data-tech="raise_shield"]').click(); await settle(p, 300);
    const rt = await p.locator('.phc-cb-foot [role="group"][aria-label="Perk options on this action"] button').allTextContents();
    ok(at + 'Raise Shield: how much Momentum to turn, as toggles (' + rt.join(', ') + ')', rt.join() === 'TURN 1,TURN 2,ALL ✓');
    v = await inView();
    ok(at + 'with the shield\'s technique picked the grid and Confirm are in view', v.grid && v.confirm && v.pageScroll <= 1);
    await p.screenshot({ path: SHOTS + '/shield-raise-' + W + '.png' });
  }
  // the resources strip says Guard's rule
  const gr = await p.evaluate(() => { const el = [...document.querySelectorAll('[data-tip-text], [aria-label]')].find((x) => /Guard: each point soaks 10 damage; Brace and the Guard technique refill it\./.test((x.getAttribute('data-tip-text') || '') + (x.getAttribute('aria-label') || '') + x.textContent)); return !!el; });
  ok('the resources strip says Guard\'s rule in a sentence', gr || /Guard: each point soaks 10 damage/.test(await p.locator('body').innerText()));

  // ----- use a Call -----
  await p.locator('#phc-tab-calls').click(); await settle(p, 250);
  await panel().locator('button[data-call="call.threaten"]').click(); await settle(p, 250);
  await p.locator('button.phc-tok[aria-label^="' + ref(rook) + ' ·"]').first().click(); await settle(p, 300);
  const ap0 = (await G()).combat.units.find((u) => u.charId === cid).ap;
  await p.getByRole('button', { name: /^Confirm/ }).first().click(); await settle(p, 1200);
  const cbA = (await G()).combat, meA = cbA.units.find((u) => u.charId === cid);
  ok('Confirm makes the Call: 1 AP spent (' + ap0 + ' → ' + meA.ap + ') and the log says so', meA.ap === ap0 - 1 && cbA.log.some((l) => /calls Threaten at Rook/.test(l)));
  console.log('note log: ' + cbA.log.filter((l) => /Threaten|Rook|Shaken|save/i.test(l)).slice(-4).join(' / '));
  await p.locator('#phc-tab-calls').click(); await settle(p, 300);
  const again = await panel().locator('button[data-call="call.threaten"]').click().then(() => p.locator('.phc-cb-foot').first().innerText());
  ok('a second hindering Call at the same enemy this round is refused with the engine\'s reason', /already been hindered by a Call this round/.test(again.replace(/\s+/g, ' ')));
  await p.screenshot({ path: SHOTS + '/calls-after-1280.png' });
  ok('the Proving Ground: no page errors' + (p.errors.length ? ': ' + p.errors.join(' | ') : ''), !p.errors.length);
  await p.context().close();
}
await browser.close();
