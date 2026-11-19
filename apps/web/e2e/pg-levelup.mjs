// The UI pass for the Proving Ground, the level-up screen and the Perks tab (Leon, 9 Nov 2026):
//  · gearing up, the whole centre column is the tools: the Practice card, Start the fight, a search across every tool,
//    the tabs, and collapsible cards in columns (one at 1280, two at 1440, three at 1920); the hint and the wave lines in
//    the bottom panel; Close the tools brings the story log back, the side tab brings the tools back; a fight still
//    starts, and in it the tools are the floating drawer again;
//  · level up as the character tree: a Core, an Attribute and a skill point spent with the +1 buttons, a perk step taken
//    from the skill's own card, and the perk then reads as yours;
//  · the Perks tab: Overdraw, Pure Heart and The Twin Pays (a switch on a Pump, a passive, a switch on Begin) are rows to read,
//    with no Confirm.
// Screenshots: e2e/shots/pgl-*.png.
import { chromium, player, click, BASE, OUT, settle } from './lib.mjs';
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
await Promise.race([nm.waitFor({ timeout: 20000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 20000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
await p.waitForFunction(() => window.__phc.getState().game?.sandbox?.state === 'ready', null, { timeout: 30000 });
await centre.waitFor({ timeout: 30000 });
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
  await p.setViewportSize({ width: w, height: h }); await settle(p, 500);
  const n = await columns(); ok('at ' + w + '×' + h + ' the cards sit in ' + n + ' column' + (n === 1 ? '' : 's') + ' (want ' + want + ')', n === want);
  await snap('gear-' + w);
  if (w === 1280) {
    // the tools get the height: the first card starts in the upper part of the centre (the Practice card is one strip)
    const top = await p.evaluate(() => { const sc = document.querySelector('[data-phc-sb-centre]').getBoundingClientRect(), c = document.querySelector('main[aria-label="Story"] [data-pg-card]').getBoundingClientRect(); return (c.top - sc.top) / sc.height; });
    ok('at 1280×720 the first tool card starts in the upper 60% of the centre (' + Math.round(top * 100) + '%)', top < 0.6);
    // the short-window rule hides the minimap only for the quest board's room; the Proving Ground has no board, and its
    // loop is "click the map", so the minimap stays
    ok('at 1280×720 the right column\'s minimap is on screen while gearing up', await p.locator('.phc-right-col .phc-mini-box').first().isVisible());
  }
}
ok('the bottom panel says it once: no engine welcome note and no "has no Narrator" line under the hint', (await dock.getByText(/^⚙ The Proving Ground\./).count()) === 0 && !(await p.getByText('The Proving Ground has no Narrator', { exact: false }).first().isVisible().catch(() => false)));
ok('the centre and the story column carry the state on themselves (a screen change\'s copy keeps it)', await p.evaluate(() => !!document.querySelector('[data-phc-sb-centre][data-sb-on]') && !!document.querySelector('main[aria-label="Story"]>.phc-story[data-sb-off]') && !!document.querySelector('[data-phc-sb-dock][data-sb-on]')));
for (const w of [1100, 420]) {
  await p.setViewportSize({ width: w, height: 900 }); await settle(p, 400);
  const clip = await p.evaluate(() => { const f = document.querySelector('.phc-pg-fig'), c = f.querySelector('figcaption'); return Math.round(c.getBoundingClientRect().top - f.getBoundingClientRect().top); });
  ok('at ' + w + ' px the Practice card holds its whole caption (kicker and title not clipped)', clip >= 0);
}
await p.setViewportSize({ width: 1440, height: 900 }); await settle(p, 400);
// the search: a weapon by name shows in the Give list; other sections hide
const search = centre.getByRole('searchbox', { name: 'Search the tools' });
await search.fill('drifter'); await settle(p, 300);
const give = centre.locator('section[aria-label="Give"]');
ok('searching "drifter" finds it in the Give list', (await give.count()) >= 1 && (await give.first().getByText('Drifter revolver').count()) >= 1);
ok('…and hides what doesn\'t match (no Magic kit card)', (await centre.locator('section[aria-label="Magic kit"]:visible').count()) === 0);
await give.first().locator('div', { hasText: /^Drifter revolver/ }).first().getByRole('button', { name: 'Give + equip' }).click().catch(async () => { await give.first().getByRole('button', { name: 'Give + equip' }).first().click(); });
await settle(p, 400);
ok('Give + equip from the search result: the revolver is in hand', (await G()).characters[cid].weapon === 'drifter_revolver');
await search.fill('spawn'); await settle(p, 300);
ok('searching "spawn" finds the Field tab\'s spawn card', (await centre.locator('[data-pg-card]', { hasText: /SPAWN/ }).count()) >= 1);
ok('under a search a card head can\'t fold (nothing stored that the screen can\'t show)', (await centre.locator('button[data-pg-head]:visible').count()) === 0);
ok('under a search the character row is there too (pick whose tools; Recruit or Bring with none)', (await centre.locator('.phc-pg-results [role="group"][aria-label="Character"]').count()) === 1);
await search.fill('twin pays'); await settle(p, 300);
ok('searching a perk by name ("twin pays") finds the Perks card, with it picked in the menu', (await centre.locator('[data-pg-card]', { hasText: /^PERKS/ }).count()) >= 1 && (await centre.getByRole('combobox', { name: 'Perk' }).first().inputValue()) === 'the_twin_pays');
await search.fill('fire'); await settle(p, 300);
ok('searching a Sigil word ("fire") shows the word itself (its group opens)', await centre.locator('[data-word="fire"]').first().isVisible());
await search.fill('homing'); await settle(p, 300);
ok('searching a module ("homing") shows it, two folded levels down on a fresh browser', await centre.locator('[data-module="homing"]').first().isVisible());

await search.fill('zzqq'); await settle(p, 300);
ok('a search with no match says so', await centre.locator('.phc-pg-none').isVisible());
await centre.getByRole('button', { name: 'Clear' }).click(); await settle(p, 300);
// a card folds, and stays folded
const head = centre.locator('section[aria-label="Equipped"] button[data-pg-head]');
await head.click(); await settle(p, 200);
ok('a card folds (Equipped: closed, its rows gone)', (await head.getAttribute('aria-expanded')) === 'false' && (await centre.locator('section[aria-label="Equipped"] button', { hasText: 'Unequip' }).count()) === 0);
await centre.getByRole('tab', { name: 'Squad' }).click(); await centre.getByRole('tab', { name: 'Gear' }).click(); await settle(p, 200);
ok('…and stays folded when you come back to the tab', (await centre.locator('section[aria-label="Equipped"] button[data-pg-head]').getAttribute('aria-expanded')) === 'false');
await centre.locator('section[aria-label="Equipped"] button[data-pg-head]').click();
// a search keeps the tools' own state: an armed "Place by clicking the map" is still armed after the search is cleared
await centre.getByRole('tab', { name: 'Field' }).click(); await settle(p, 200);
const armBtn = centre.getByRole('button', { name: 'Place by clicking the map' });
await armBtn.click(); await settle(p, 150);
await search.fill('rifle'); await settle(p, 300); await centre.getByRole('button', { name: 'Clear' }).click(); await settle(p, 300);
const stillArmed = centre.locator('button[aria-pressed="true"]', { hasText: 'Click tiles on the map' });
ok('an armed spawn survives a search (typed and cleared): still armed', (await stillArmed.count()) === 1);
if (await stillArmed.count()) await stillArmed.click();
await centre.getByRole('tab', { name: 'Gear' }).click(); await settle(p, 200);
// with the hint dismissed, the turn line (no Narrator here) is back in the bottom panel
await dock.getByRole('button', { name: 'Hide the hint' }).click(); await settle(p, 200);
ok('the hint dismissed: the bottom panel still says there is no Narrator (the turn line)', await p.getByText('The Proving Ground has no Narrator', { exact: false }).first().isVisible());
// Close the tools: the story log; the side tab brings them back. The button says what it does ("Story log ›", not a ✕).
const logBtn = centre.getByRole('button', { name: 'Close the tools and show the story log' });
ok('the Practice card\'s button reads "Story log ›" (no ✕ that reads as closing the log)', (await logBtn.textContent()).trim() === 'Story log ›');
await logBtn.click(); await settle(p, 400);
ok('Close the tools: the story log is back, the tools are gone', (await tools.count()) === 0 && await p.locator('main[aria-label="Story"] > .phc-story').isVisible());
await p.getByRole('button', { name: 'Open the Proving Ground tools' }).click(); await centre.waitFor({ timeout: 30000 });
ok('the side tab brings the tools back to the centre', (await centre.count()) === 1);
// a fight still starts; in it, the tools are the floating drawer
await centre.getByRole('button', { name: /^⚔ Start the fight/ }).click();
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 30000 });
await settle(p, 1500);
ok('Start the fight: the fight begins (combat screen)', (await G()).phase === 'combat');
if (!(await tools.count())) await p.getByRole('button', { name: 'Open the Proving Ground tools' }).click();
await tools.waitFor({ timeout: 30000 });
ok('in the fight the tools are the floating drawer (not in a story column)', (await centre.count()) === 0 && (await tools.evaluate((e) => getComputedStyle(e).position)) === 'fixed');
await snap('fight-drawer');

// ---------- 3. The Perks tab: read-only rows (here, in the fight) ----------
await act({ type: 'sandbox/kit', charId: cid, kind: 'soul' });
await act({ type: 'sandbox/skill', charId: cid, skill: 'will_power', points: 10 });
await act({ type: 'sandbox/skill', charId: cid, skill: 'composure', points: 3 }); await act({ type: 'sandbox/perk', charId: cid, perk: 'pure_heart', tier: 'I' }); // rules 1.75 item 6203: Pure Heart is a Composure perk
await settle(p, 500);
if (await tools.count()) await tools.getByRole('button', { name: 'Close the tools' }).click().catch(() => {});
await settle(p, 300);
const perkTab = p.locator('#phc-tab-perks');
ok('the Perks tab is there', (await perkTab.count()) === 1);
await perkTab.click(); await settle(p, 300);
// 0.31.9: the shelves fold, closed by default: open them to read
for (let i = 0; i < 3; i++) { const h = p.locator('[data-shelf] .phc-fold-h[aria-expanded="false"]').first(); if (!(await h.count())) break; await h.click(); await settle(p, 150); }
const rows = await p.locator('[role="tabpanel"] button').allTextContents();
const has = (re) => rows.some((t) => re.test(t.replace(/\s+/g, ' ')));
// Rules 1.14, the perk card in a fight: a switch on another action says where it is; a passive shows a live line.
ok('Overdraw, Pure Heart and The Twin Pays are listed to read (their count · a live line · their count)', has(/Overdraw ?Once a turn/) && has(/Pure Heart.*(Ready|Waiting: |Used |Last: |Active all fight|Its button appears|Once a fight)/) && has(/The Twin Pays ?Once a fight/));
ok('the shelves are labelled, in order', (await p.locator('[role="tabpanel"] [data-shelf]').evaluateAll((els) => els.map((e) => e.getAttribute('data-shelf')).join(','))).replace(/^use,/, '') === 'rides,always');
{ const lab = await perkTab.getAttribute('aria-label'), m = /, (\d+) actions?, (\d+) to read/.exec(lab || ''), badge = (await perkTab.locator('span').last().textContent()).trim();
  ok('the Perks tab counts actions apart from rows to read (' + lab + '; badge ' + badge + ')', !!m && +m[2] >= 3 && badge === m[1]); }
await p.locator('[role="tabpanel"] button', { hasText: 'Overdraw' }).first().click(); await settle(p, 300);
const conf = p.getByRole('button', { name: /^Confirm/ });
ok('picking Overdraw: no Confirm (hidden), End turn stays', (await conf.count()) === 0 || !(await conf.first().isVisible()));
{ const body = await p.locator('body').innerText(); ok('…and the footer names it as riding an action, with what it does on its Pump', /Overdraw · RIDES AN ACTION/i.test(body) && /Once a turn: a Pump adds \d+ stages/.test(body)); }
await snap('perks-tab');

// ---------- 2. Level up: the character tree ----------
await act({ type: 'sandbox/stop' }); await settle(p, 800);
await p.waitForFunction(() => window.__phc.getState().screen === 'main', null, { timeout: 20000 }).catch(() => {});
await act({ type: 'sandbox/skill', charId: cid, skill: 'will_power', points: 0 });
await act({ type: 'sandbox/class', charId: cid, classId: 'marksman', rank: 1 });
await act({ type: 'sandbox/level', charId: cid, level: 9 });
await settle(p, 500);
await p.locator('button', { hasText: /Level up|Earn your class/ }).first().click();
await p.locator('.phc-lu-core').first().waitFor({ timeout: 30000 });
const fam = (f) => p.locator('[data-fam="' + f + '"]').click().then(() => settle(p, 200));
ok('spend first: three family tabs, one family on screen (three attributes, nine skills)', (await p.locator('[role="tablist"][aria-label="Families"] [role="tab"]').count()) === 3 && (await p.locator('.phc-lu-core').count()) === 1 && (await p.locator('.phc-lu-attrcol').count()) === 3 && (await p.locator('.phc-lu-skill').count()) === 9);
ok('the floating ♪ / ◈ buttons step aside on level up (they sat over the rows\' left edge)', (await p.locator('[data-phc-float]:visible').count()) === 0);
for (const [w, h] of [[1280, 720], [1440, 900], [1920, 1080]]) { await p.setViewportSize({ width: w, height: h }); await settle(p, 500); await snap('levelup-' + w); }
await p.setViewportSize({ width: 1440, height: 900 }); await settle(p, 300);
const u0 = (await G()).characters[cid].unspent;
// rules 1.13: no Core points; an Attribute at its level's ceiling can't rise (its +1 is disabled)
ok('no Core raise button anywhere (Cores are group names)', (await p.locator('button[data-raise="core"]').count()) === 0);
await fam('mind');
await p.locator('.phc-lu-attrcol[data-attr="intelligence"] button[data-raise="attr"]').click(); await settle(p, 250);
ok('an Attribute point spent with Intelligence\'s +1', (await G()).characters[cid].unspent.attr === u0.attr - 1);
const bpBefore = (await G()).characters[cid].skills.brain_power || 0;
await p.locator('.phc-lu-skill[data-skill="brain_power"] button[data-raise="skill"]').click(); await settle(p, 100);
ok('a skill point spent with Brain Power\'s +1', ((await G()).characters[cid].skills.brain_power || 0) === bpBefore + 1);
ok('…and its row says what was gained, where it was clicked', (await p.locator('.phc-lu-skill[data-skill="brain_power"] .phc-lu-gain').count()) === 1);
// a perk step waiting: a chip in the TO CHOOSE strip opens ONE centred chooser panel over the screen (never rows that
// push the page): the skill's perks as rows, one button on each legal row, a one-line confirm
const tc = p.locator('.phc-lu-tochoose .phc-lu-tc[data-kind="perk"]');
ok('a perk step waiting is a chip in the TO CHOOSE strip, named with its skill (' + (await tc.count() ? await tc.first().textContent() : 'none') + ')', (await tc.count()) > 0 && /^◆ (Perk step|\d+ perk steps) · \S/.test(await tc.first().textContent()));
const sk = (await tc.first().getAttribute('data-choose')).replace(/^perk:/, '');
const row = p.locator('.phc-lu-skill[data-skill="' + sk + '"]');
ok('the row with a step waiting carries a white chip too', await row.count() === 0 || /^◆ .*(Perk step|perk steps)/.test(await row.locator('.phc-lu-chip').textContent()));
const top0 = await p.evaluate(() => document.querySelector('.phc-lu-core').getBoundingClientRect().top);
await tc.first().click(); await settle(p, 400);
const panel = p.locator('.phc-lu-chooser[data-chooser="perk"]');
const look = await p.evaluate(() => { const b = document.querySelector('.phc-lu-chooser').getBoundingClientRect(); return { cx: Math.abs((b.left + b.right) / 2 - innerWidth / 2), top: document.querySelector('.phc-lu-core').getBoundingClientRect().top, fixed: getComputedStyle(document.querySelector('.phc-lu-chooser-back')).position }; });
ok('the chip opens one centred panel over the screen; the page under it does not move (' + look.cx + ' px off centre, ' + look.fixed + ')', (await panel.count()) === 1 && look.cx <= 2 && look.fixed === 'fixed' && Math.abs(look.top - top0) < 1);
const acts = await panel.locator('button.phc-perk-act').evaluateAll((bs) => bs.map((b) => [b.textContent, b.getAttribute('aria-label') || '']));
ok('each legal row has one button, Take or Upgrade, naming its perk (' + acts.map((a) => a[1]).join(', ') + ')', acts.length > 0 && acts.every(([l, a]) => /^(Take|Upgrade)$/.test(l) && new RegExp('^' + l + ' \\S').test(a)) && new Set(acts.map((a) => a[1])).size === acts.length);
ok('…every perk is a row: name, I, II, the state pips (no paragraph, no Passive tag)', (await panel.locator('.phc-perk-row').count()) >= 2 && (await panel.locator('.phc-perk-row .phc-perk-t1').count()) === (await panel.locator('.phc-perk-row').count()) && !/Passive|TIER/.test(await panel.innerText()));
const perks0 = (await G()).characters[cid].perks.length;
await panel.locator('button.phc-perk-act').first().click(); await settle(p, 300);
ok('one click arms it: a one-line confirm under the rows (' + (await panel.locator('.phc-lu-ch-confirm').textContent().catch(() => '')) + ')', /\? Kept for good\./.test(await panel.locator('.phc-lu-ch-confirm').textContent()) && (await G()).characters[cid].perks.length === perks0);
await panel.locator('button.phc-lu-ch-ok').click(); await settle(p, 300);
const c2 = (await G()).characters[cid], took = c2.perks.length > perks0 ? c2.perks.at(-1).id : null;
ok('Confirm takes the perk step (' + sk + ': ' + took + ')', !!took);
if (await p.locator('.phc-lu-chooser').count()) { await p.locator('.phc-lu-ch-close').click(); await settle(p, 200); }
ok('Close: the panel goes, the screen is as it was', (await p.locator('.phc-lu-chooser').count()) === 0);
// Revert (11 Nov 2026): what this visit spent comes back, then it is spent again so the rest of the script stands
{ const spent = JSON.stringify((await G()).characters[cid].unspent);
  ok('a Revert button shows once something is spent', (await p.locator('button.phc-lu-revert').count()) === 1);
  await p.locator('button.phc-lu-revert').click(); await settle(p, 300);
  const c3 = (await G()).characters[cid];
  ok('Revert gives the points back (' + spent + ' → ' + JSON.stringify(c3.unspent) + ') and the button goes', c3.unspent.attr === u0.attr && c3.unspent.skill > JSON.parse(spent).skill && (await p.locator('button.phc-lu-revert').count()) === 0);
  await fam('mind');
  await p.locator('.phc-lu-attrcol[data-attr="intelligence"] button[data-raise="attr"]').click(); await settle(p, 200);
  await p.locator('.phc-lu-skill[data-skill="brain_power"] button[data-raise="skill"]').click(); await settle(p, 200); }
await snap('levelup-after');
ok('Done is lit only when the strip is empty; Finish later stays', (await p.locator('button.phc-lu-later').count()) === 1 && (await p.locator('button.phc-lu-done').isDisabled()) === ((await p.locator('.phc-lu-tc').count()) > 0));
await p.locator('button.phc-lu-later').click(); await settle(p, 600); // Finish later: back to the story
ok('back on the story screen the ♪ button is there again', (await p.locator('[data-phc-float="music"]').count()) === 1 && await p.locator('[data-phc-float="music"]').isVisible());
ok('no page errors', p.errors.length === 0);
if (p.errors.length) console.log(p.errors);
await browser.close();
