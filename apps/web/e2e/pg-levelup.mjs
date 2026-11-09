// The UI pass for the Proving Ground, the level-up screen and the Perks tab (Leon, 9 Nov 2026):
//  · gearing up, the whole centre column is the tools: the Practice card, Start the fight, a search across every tool,
//    the tabs, and collapsible cards in columns (one at 1280, two at 1440, three at 1920); the hint and the wave lines in
//    the bottom panel; Close the tools brings the story log back, the side tab brings the tools back; a fight still
//    starts, and in it the tools are the floating drawer again;
//  · level up as the character tree: a Core, an Attribute and a skill point spent with the +1 buttons, a perk step taken
//    from the skill's own card, and the perk then reads as yours;
//  · the Perks tab: Overdraw, Pure Heart and The Twin Pays (used from Pump, automatic, used from Begin) are rows to read,
//    with no Confirm.
// Screenshots: e2e/shots/pgl-*.png.
import { chromium, player, click, BASE, OUT } from './lib.mjs';
const browser = await chromium.launch();
const p = await player(browser, 'host');
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const snap = (n) => p.screenshot({ path: OUT + 'pgl-' + n + '.png' });
const G = () => p.evaluate(() => window.__phc.getState().game);
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const tools = p.locator('aside[aria-label="Proving Ground tools"]'), centre = p.locator('main[aria-label="Story"] aside[aria-label="Proving Ground tools"]');
const dock = p.locator('[role="region"][aria-label="Proving Ground messages"]');
/** How many columns the tool cards sit in (distinct left edges of the cards). */
const columns = () => p.evaluate(() => new Set([...document.querySelectorAll('main[aria-label="Story"] [data-pg-card]')].map((e) => Math.round(e.getBoundingClientRect().left))).size);

await p.setViewportSize({ width: 1440, height: 900 });
await p.goto(BASE);
await click(p, 'PROVING GROUND');
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 8000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 8000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
await p.waitForFunction(() => window.__phc.getState().game?.sandbox?.state === 'ready', null, { timeout: 15000 });
await centre.waitFor({ timeout: 8000 });
let g = await G();
const cid = Object.keys(g.characters)[0];

// ---------- 1. The gearing-up screen ----------
ok('gearing up: the tools fill the centre column (one tools view, inside the story column)', (await centre.count()) === 1 && (await tools.count()) === 1);
ok('the story column is hidden meanwhile', !(await p.locator('main[aria-label="Story"] > .phc-story').isVisible()));
ok('the Practice card stays on top: "Practice fights · no Narrator"', (await centre.getByText('Practice fights · no Narrator').count()) === 1);
ok('Start the fight is in the centre', (await centre.getByRole('button', { name: /^⚔ Start the fight/ }).count()) === 1);
ok('the hint is in the bottom panel, not in the tools', (await dock.getByText('Gear up here, then click the map to start a fight.').count()) === 1 && (await centre.getByText('Gear up here, then click the map to start a fight.').count()) === 0);
ok('the six tabs are there', (await centre.getByRole('tab').allTextContents()).join(',') === 'Gear,Squad,Magic,Faith,Field,World');
for (const [w, h, want] of [[1280, 720, 1], [1440, 900, 2], [1920, 1080, 3]]) {
  await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(500);
  const n = await columns(); ok('at ' + w + '×' + h + ' the cards sit in ' + n + ' column' + (n === 1 ? '' : 's') + ' (want ' + want + ')', n === want);
  await snap('gear-' + w);
}
await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(400);
// the search: a weapon by name shows in the Give list; other sections hide
const search = centre.getByRole('searchbox', { name: 'Search the tools' });
await search.fill('drifter'); await p.waitForTimeout(300);
const give = centre.locator('section[aria-label="Give"]');
ok('searching "drifter" finds it in the Give list', (await give.count()) >= 1 && (await give.first().getByText('Drifter revolver').count()) >= 1);
ok('…and hides what doesn\'t match (no Magic kit card)', (await centre.locator('section[aria-label="Magic kit"]').count()) === 0);
await give.first().locator('div', { hasText: /^Drifter revolver/ }).first().getByRole('button', { name: 'Give + equip' }).click().catch(async () => { await give.first().getByRole('button', { name: 'Give + equip' }).first().click(); });
await p.waitForTimeout(400);
ok('Give + equip from the search result: the revolver is in hand', (await G()).characters[cid].weapon === 'drifter_revolver');
await search.fill('spawn'); await p.waitForTimeout(300);
ok('searching "spawn" finds the Field tab\'s spawn card', (await centre.locator('[data-pg-card]', { hasText: /SPAWN/ }).count()) >= 1);
await search.fill('zzqq'); await p.waitForTimeout(300);
ok('a search with no match says so', await centre.locator('.phc-pg-none').isVisible());
await centre.getByRole('button', { name: 'Clear' }).click(); await p.waitForTimeout(300);
// a card folds, and stays folded
const head = centre.locator('section[aria-label="Equipped"] button[data-pg-head]');
await head.click(); await p.waitForTimeout(200);
ok('a card folds (Equipped: closed, its rows gone)', (await head.getAttribute('aria-expanded')) === 'false' && (await centre.locator('section[aria-label="Equipped"] button', { hasText: 'Unequip' }).count()) === 0);
await centre.getByRole('tab', { name: 'Squad' }).click(); await centre.getByRole('tab', { name: 'Gear' }).click(); await p.waitForTimeout(200);
ok('…and stays folded when you come back to the tab', (await centre.locator('section[aria-label="Equipped"] button[data-pg-head]').getAttribute('aria-expanded')) === 'false');
await centre.locator('section[aria-label="Equipped"] button[data-pg-head]').click();
// Close the tools: the story log; the side tab brings them back
await centre.getByRole('button', { name: 'Close the tools' }).click(); await p.waitForTimeout(400);
ok('Close the tools: the story log is back, the tools are gone', (await tools.count()) === 0 && await p.locator('main[aria-label="Story"] > .phc-story').isVisible());
await p.getByRole('button', { name: 'Open the Proving Ground tools' }).click(); await centre.waitFor({ timeout: 4000 });
ok('the side tab brings the tools back to the centre', (await centre.count()) === 1);
// a fight still starts; in it, the tools are the floating drawer
await centre.getByRole('button', { name: /^⚔ Start the fight/ }).click();
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 15000 });
await p.waitForTimeout(1500);
ok('Start the fight: the fight begins (combat screen)', (await G()).phase === 'combat');
if (!(await tools.count())) await p.getByRole('button', { name: 'Open the Proving Ground tools' }).click();
await tools.waitFor({ timeout: 4000 });
ok('in the fight the tools are the floating drawer (not in a story column)', (await centre.count()) === 0 && (await tools.evaluate((e) => getComputedStyle(e).position)) === 'fixed');
await snap('fight-drawer');

// ---------- 3. The Perks tab: read-only rows (here, in the fight) ----------
await act({ type: 'sandbox/kit', charId: cid, kind: 'soul' });
await act({ type: 'sandbox/skill', charId: cid, skill: 'will_power', points: 10 });
await p.waitForTimeout(500);
if (await tools.count()) await tools.getByRole('button', { name: 'Close the tools' }).click().catch(() => {});
await p.waitForTimeout(300);
const perkTab = p.locator('#phc-tab-perks');
ok('the Perks tab is there', (await perkTab.count()) === 1);
await perkTab.click(); await p.waitForTimeout(300);
const rows = await p.locator('[role="tabpanel"] button').allTextContents();
const has = (re) => rows.some((t) => re.test(t.replace(/\s+/g, ' ')));
ok('Overdraw, Pure Heart and The Twin Pays are listed to read (on Pump · automatic · on Begin)', has(/Overdraw.*on Pump/) && has(/Pure Heart.*automatic/) && has(/The Twin Pays.*on Begin/));
await p.locator('[role="tabpanel"] button', { hasText: 'Overdraw' }).first().click(); await p.waitForTimeout(300);
const conf = p.getByRole('button', { name: /^Confirm/ });
ok('picking Overdraw: no Confirm (hidden), End turn stays', (await conf.count()) === 0 || !(await conf.first().isVisible()));
ok('…and the footer says where it is used', (await p.getByText(/Used from Pump: its chip is there/).count()) >= 1);
await snap('perks-tab');

// ---------- 2. Level up: the character tree ----------
await act({ type: 'sandbox/stop' }); await p.waitForTimeout(800);
await p.waitForFunction(() => window.__phc.getState().screen === 'main', null, { timeout: 8000 }).catch(() => {});
await act({ type: 'sandbox/skill', charId: cid, skill: 'will_power', points: 0 });
await act({ type: 'sandbox/class', charId: cid, classId: 'marksman', rank: 1 });
await act({ type: 'sandbox/level', charId: cid, level: 9 });
await p.waitForTimeout(500);
await p.locator('button', { hasText: /Level up|Earn your class/ }).first().click();
await p.locator('.phc-lu-core').first().waitFor({ timeout: 8000 });
ok('the tree: three cores, nine attributes, twenty-seven skills', (await p.locator('.phc-lu-core').count()) === 3 && (await p.locator('.phc-lu-attrcol').count()) === 9 && (await p.locator('.phc-lu-skill').count()) === 27);
for (const [w, h] of [[1280, 720], [1440, 900], [1920, 1080]]) { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(500); await snap('levelup-' + w); }
await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(300);
const u0 = (await G()).characters[cid].unspent;
await p.locator('.phc-lu-core[data-core="mind"] button[data-raise="core"]').click(); await p.waitForTimeout(250);
ok('a Core point spent with Mind\'s +1', (await G()).characters[cid].unspent.core === u0.core - 1);
// the caps: an Attribute at its Core can't rise (its +1 is disabled, the reason beside it); the one Mind just raised can
const capped = await p.evaluate(() => { const c = Object.values(window.__phc.getState().game.characters)[0]; const CORE = { endurance: 'body', strength: 'body', agility: 'body', perception: 'mind', intelligence: 'mind', expression: 'mind', insight: 'soul', determination: 'soul', virtue: 'soul' }; return Object.keys(CORE).find((a) => c.attrs[a] >= c.cores[CORE[a]]) || null; });
if (capped) ok('an Attribute at its Core\'s value: +1 disabled, with the reason (' + capped + ')', await p.locator('.phc-lu-attrcol[data-attr="' + capped + '"] button[data-raise="attr"]').isDisabled());
await p.locator('.phc-lu-attrcol[data-attr="intelligence"] button[data-raise="attr"]').click(); await p.waitForTimeout(250);
ok('an Attribute point spent with Intelligence\'s +1', (await G()).characters[cid].unspent.attr === u0.attr - 1);
const bpBefore = (await G()).characters[cid].skills.brain_power || 0;
await p.locator('.phc-lu-skill[data-skill="brain_power"] button[data-raise="skill"]').click(); await p.waitForTimeout(250);
ok('a skill point spent with Brain Power\'s +1', ((await G()).characters[cid].skills.brain_power || 0) === bpBefore + 1);
const step = p.locator('.phc-lu-skill.phc-lu-step').first();
ok('a skill with a perk step waiting is marked on its card', (await step.count()) === 1);
const sk = await step.getAttribute('data-skill'), perks0 = (await G()).characters[cid].perks.length;
await step.locator('button.phc-lu-choice').first().click(); await p.waitForTimeout(300);
const c2 = (await G()).characters[cid], took = c2.perks.length > perks0 ? c2.perks.at(-1).id : null;
ok('a perk step taken from the skill\'s own card (' + sk + ': ' + took + ')', !!took);
ok('…and that perk now reads as yours on the card', !!took && /✓ TIER/.test(await p.locator('.phc-lu-skill[data-skill="' + sk + '"] .phc-lu-perk[data-perk="' + took + '"]').textContent()));
await snap('levelup-after');
ok('no page errors', p.errors.length === 0);
if (p.errors.length) console.log(p.errors);
await browser.close();
