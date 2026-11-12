// Sigil 1.5 growth (rules 1.10) in a real browser, the Proving Ground solo, through real buttons where there are any:
// the tools' MAGIC tab (the word groups, collapsible; grant study; set a word's use count; place a sigil mark; the
// Junctions switch), the sheet's MAGIC tab (the study bar, Learn a word in the five groups, the known-to-study list,
// word chips with uses and stars, inflections greyed until earned; the Sigil and Outburst sections collapse and stay
// collapsed after a reload), and a sigil mark on the area map with its Investigate panel. Screenshots
// (deviceScaleFactor 1): e2e/shots/sigil15g-*.png, or SHOTS=dir.
import { chromium, player, click, BASE, OUT as OUT0, pause } from './lib.mjs';
const OUT = process.env.SHOTS ? process.env.SHOTS.replace(/\/?$/, '/') : OUT0;
const browser = await chromium.launch();
const p = await player(browser, 'host');
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
const snap = (n) => p.screenshot({ path: OUT + 'sigil15g-' + n + '.png' });
const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };
const G = () => p.evaluate(() => window.__phc.getState().game);
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const drawer = p.locator('aside[aria-label="Proving Ground tools"]');
const openTools = async () => { if (!(await drawer.count())) await p.getByRole('button', { name: 'Open the Proving Ground tools' }).click(); await drawer.waitFor(); };
const closeTools = async () => { if (await drawer.count()) { await drawer.getByRole('button', { name: 'Close the tools' }).click(); await drawer.waitFor({ state: 'detached' }).catch(() => {}); } };
const area = p.locator('div[role="dialog"][aria-label="Area map"]');
const openArea = async () => { if (!(await area.count())) await p.getByRole('button', { name: 'Area map', exact: true }).first().click(); await area.waitFor(); await pause(p, 250); };

await p.setViewportSize({ width: 1440, height: 1000 });
await p.goto(BASE);
await click(p, 'PROVING GROUND');
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 8000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 8000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
await p.mouse.move(1430, 990);
await p.waitForFunction(() => window.__phc.getState().game?.sandbox?.state === 'ready', null, { timeout: 15000 });
let g = await G();
const cid = Object.values(g.characters)[0].id;
await act({ type: 'sandbox/clear' });
await act({ type: 'sandbox/kit', charId: cid, kind: 'both' });
await act({ type: 'sandbox/skill', charId: cid, skill: 'brain_power', points: 5 });
for (const w of ['fire', 'seek']) await act({ type: 'sandbox/learn', charId: cid, word: w });

// 1. The tools' MAGIC tab: words in the five groups (collapsible), the growth tools.
await openTools();
await drawer.getByRole('tab', { name: 'Magic' }).click(); await pause(p, 200);
const groups = await drawer.locator('[data-ws-section="sb.sigil"] [data-ws-group]').evaluateAll((els) => els.map((e) => e.getAttribute('data-ws-group')));
ok('tools: the Sigil words in five groups (' + groups.join(' ') + ')', groups.join(' ') === 'subject reach delivery burst filter');
for (const w of ['mend', 'arc']) await drawer.locator('[data-ws-section="sb.sigil"] button[data-word="' + w + '"]').click();
await pause(p, 200);
g = await G(); ok('tools: learned MEND and ARC by their buttons', ['mend', 'arc'].every((w) => g.characters[cid].sigils.includes(w)));
// The arrow keys move along the word keys (glyphKeyNav: each open group is a keyboard row, data-word-row).
await drawer.locator('[data-ws-section="sb.sigil"] button[data-word="fire"]').focus();
await p.keyboard.press('ArrowRight');
const navTo = await p.evaluate(() => document.activeElement?.getAttribute('data-word'));
await p.keyboard.press('ArrowDown');
const navDown = await p.evaluate(() => document.activeElement?.getAttribute('data-word'));
ok('tools: arrow keys move along the Sigil words (' + navTo + ', then ' + navDown + ')', !!navTo && navTo !== 'fire' && !!navDown && navDown !== navTo);
await drawer.locator('[data-ws-section="sb.sigil"] [data-ws-group="delivery"] > button[data-ws-toggle]').click();
ok('tools: a group closes', (await drawer.locator('[data-ws-section="sb.sigil"] [data-ws-group="delivery"] button[data-word]').count()) === 0);
const soulGroups = await drawer.locator('[data-ws-section="sb.soul"] [data-ws-group]').evaluateAll((els) => els.map((e) => e.getAttribute('data-ws-group')));
ok('tools: Outburst lessons grouped as Outburst 4.0 has them (' + soulGroups.join(' ') + ')', soulGroups.join(' ') === 'schools modules feelings practice fx');
const tools = drawer.locator('section[aria-label="Sigil growth tools"]');
await tools.scrollIntoViewIfNeeded();
const s0 = (await G()).characters[cid].sigilGrowth?.study || 0;
await tools.getByRole('button', { name: '+8 study' }).click(); await pause(p, 150);
await tools.getByRole('button', { name: '+6 study' }).click(); await pause(p, 150);
g = await G(); const s1 = g.characters[cid].sigilGrowth?.study; ok('tools: +8 and +6 study (' + s0 + ' → ' + s1 + ', Mastery study included)', s1 === s0 + 14);
await tools.getByLabel('Word to set uses for').selectOption('fire');
await tools.getByRole('button', { name: /^Practised/ }).click(); await pause(p, 150);
await tools.getByLabel('Word to set uses for').selectOption('ward');
await tools.getByRole('button', { name: /^Mastered/ }).click(); await pause(p, 150);
g = await G(); ok('tools: FIRE 10 uses, WARD 30', g.characters[cid].sigilGrowth.uses.fire === 10 && g.characters[cid].sigilGrowth.uses.ward === 30);
const jBox = tools.locator('[data-sb-junctions] input');
await jBox.check(); await pause(p, 150);
ok('tools: Junctions on for everyone', (await G()).sandbox.junctions === true);
await jBox.uncheck(); await pause(p, 150);
// The mark: by tile, next to us.
g = await G();
const at0 = g.story.positions[cid], [mx, my] = at0.split(',').map(Number);
const taken = new Set([...Object.values(g.story.positions), ...(g.story.objects || []).map((o) => o.pos), ...(g.story.npcs || []).map((n) => n.pos)]);
const markAt = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]].map(([dx, dy]) => (mx + dx) + ',' + (my + dy)).find((k) => !taken.has(k));
await tools.getByLabel('Mark word').selectOption('pull');
await tools.getByLabel('Mark age').selectOption('fresh');
await tools.getByLabel('Mark damage').selectOption('worn');
await tools.getByLabel('Tile for the mark').fill(ref(markAt));
await snap('01-tools');
await tools.locator('[data-sb-mark-place]').click(); await pause(p, 250);
g = await G();
let mark = (g.story.objects || []).find((o) => o.kind === 'sigil_mark' && o.pos === markAt);
if (!mark) { // the tile was blocked: try the others
  for (const k of [[2, 0], [0, 2], [-2, 0], [0, -2]].map(([dx, dy]) => (mx + dx) + ',' + (my + dy))) { await tools.getByLabel('Tile for the mark').fill(ref(k)); await tools.locator('[data-sb-mark-place]').click(); await pause(p, 200); g = await G(); mark = (g.story.objects || []).find((o) => o.kind === 'sigil_mark' && o.pos === k); if (mark) break; }
}
ok('tools: a sigil mark placed at ' + (mark ? ref(mark.pos) : '?') + ' (PULL, fresh, worn)', !!mark && mark.word === 'pull' && mark.age === 'fresh' && mark.damage === 'worn' && mark.name === 'Sigil mark');
await closeTools();

// 2. The sheet's MAGIC tab: study, Learn a word, chips with stars, inflections.
await p.getByRole('tab', { name: 'MAGIC', exact: true }).click(); await pause(p, 300);
const study = p.locator('[data-study]');
ok('sheet: the study bar (' + (await study.innerText()).split('\n').slice(0, 2).join(' / ') + ')', new RegExp(s1 + ' STUDY').test(await study.innerText()) && /NEXT WORD AT \d+/.test(await study.innerText()));
const fireCard = p.locator('[data-word-card="fire"]'), wardCard = p.locator('[data-word-card="ward"]');
ok('sheet: FIRE is Practised, with a hollow star', /PRACTISED · 10 USES \/ 30/.test(await fireCard.innerText()) && (await fireCard.locator('img[alt="PRACTISED"]').count()) === 1);
ok('sheet: WARD is Mastered, its inflection on', /MASTERED · 30 USES/.test(await wardCard.innerText()) && /INFLECTION ON · /.test(await wardCard.locator('[data-inflection]').innerText()));
ok('sheet: FIRE\'s inflection waits (greyed)', /^AT 30 USES · /.test(await fireCard.locator('[data-inflection]').innerText()));
await p.locator('section[aria-label="Sigils"]').scrollIntoViewIfNeeded();
await snap('02-sheet-magic');
await p.locator('[data-learn-open="pick"]').click(); await pause(p, 250);
const pk = p.locator('[data-learn-picker]');
const pkGroups = await pk.locator('[data-ws-group]').evaluateAll((els) => els.map((e) => e.getAttribute('data-ws-group')));
ok('sheet: Learn a word lists the groups (' + pkGroups.join(' ') + ')', pkGroups.join(' ') === 'subject reach delivery burst filter');
await pk.scrollIntoViewIfNeeded();
await snap('03-learn-picker');
await pk.locator('button[data-learn="shock"]').click(); await pause(p, 300);
g = await G(); ok('sheet: SHOCK learned with a study pick', g.characters[cid].sigils.includes('shock') && g.characters[cid].sigilGrowth.picksUsed === 1);
// Collapse: the Reach group, then the whole Outburst section; both stay so after a reload.
await p.locator('section[aria-label="Sigils"] [data-ws-group="reach"] > button[data-ws-toggle]').click(); await pause(p, 150);
await p.locator('[data-ws-head="magic.soul"]').click(); await pause(p, 150);
ok('sheet: Reach closed, Outbursts closed', (await p.locator('[data-word-card="seek"]').count()) === 0 && (await p.locator('section[aria-label="Outbursts"] [data-ws-group]').count()) === 0);
await snap('04-collapsed');
await p.reload(); await p.waitForFunction(() => !!window.__phc?.getState().game?.sandbox, null, { timeout: 15000 });
await p.mouse.move(1430, 990); await pause(p, 800);
if (await drawer.count()) await closeTools();
await p.getByRole('tab', { name: 'MAGIC', exact: true }).click(); await pause(p, 300);
ok('sheet: still closed after a reload', (await p.locator('[data-ws-head="magic.soul"]').getAttribute('aria-expanded')) === 'false' && (await p.locator('section[aria-label="Sigils"] [data-ws-group="reach"] > button[data-ws-toggle]').getAttribute('aria-expanded')) === 'false');
await p.locator('section[aria-label="Sigils"] [data-ws-group="reach"] > button[data-ws-toggle]').click();
await p.locator('[data-ws-head="magic.soul"]').click(); await pause(p, 150);
const soulG = await p.locator('section[aria-label="Outbursts"] [data-ws-group]').evaluateAll((els) => els.map((e) => e.getAttribute('data-ws-group')));
ok('sheet: the Outburst section in groups (' + soulG.join(' ') + ')', soulG.join(' ').startsWith('designs templates feelings modules'));
await p.locator('section[aria-label="Outbursts"]').scrollIntoViewIfNeeded();
await snap('04b-outbursts');

// 3. The mark on the area map, and its panel.
await closeTools();
await openArea();
const cell = area.locator('button.phc-tok[aria-label^="' + ref(mark.pos) + ' "], button.phc-tok[aria-label^="' + ref(mark.pos) + ':"]').first();
ok('area map: the carved mark is drawn', (await cell.locator('img[data-sigil-mark]').count()) === 1);
await cell.scrollIntoViewIfNeeded();
await snap('05-area-mark');
await cell.click(); await pause(p, 400);
const mp = p.locator('[data-mark-panel]');
await mp.waitFor({ timeout: 4000 }).catch(() => {});
ok('panel: the mark section', (await mp.count()) === 1);
const mtext = await mp.innerText().catch(() => '');
ok('panel: age, damage and TN (' + mtext.split('\n')[0] + ')', /FRESH · WORN · TN 12/.test(mtext));
ok('panel: the word is unread before Investigate', /An unread word/.test(mtext));
const dlg = p.locator('div[role="dialog"][aria-label="Sigil mark"]');
ok('panel: Investigate with Acuity or Rumination (the skill is Acuity since Skeleton 2.0)', (await dlg.getByText('Acuity or Rumination').count()) > 0);
await snap('06-mark-panel');
// Investigate it (the roll is the engine's; either outcome is fine here, the panel must say it).
const tryBtn = dlg.getByRole('button', { name: /Try this · 2 AP|Try it · 2 AP/ }).first();
await closeTools();
if (await tryBtn.isEnabled().catch(() => false)) {
  await tryBtn.click(); await pause(p, 600);
  const roll = p.getByRole('button', { name: /^Roll/ }).first();
  if (await roll.count()) { await roll.click().catch(() => {}); await pause(p, 2500); }
  for (const t of ['Continue', 'Done', 'Close']) { const b = p.locator('[aria-label="Dice"] button', { hasText: t }).first(); if (await b.count()) { await b.click().catch(() => {}); await pause(p, 300); } }
  g = await G(); const m2 = g.story.objects.find((o) => o.id === mark.id), tr = m2.approaches[0].tries.find((t) => t.charId === cid);
  console.log('  investigate:', tr ? (tr.ok ? 'success ' + tr.total : 'fail ' + tr.total) : 'no try recorded');
  if (!(await dlg.count())) { await openArea(); await cell.click(); await pause(p, 400); }
  if (tr) { const out = await p.locator('[data-mark-outcome]').innerText().catch(() => '');
    ok('panel: the outcome is said (' + out + ')', tr.ok ? /Copied: PULL|PULL is yours/.test(out) : /couldn't make it out/.test(out));
    await snap('07-mark-outcome'); }
} else console.log('  (Investigate not available now: ' + (await dlg.innerText()).slice(0, 120).replace(/\n/g, ' ') + ')');
ok('no page errors (' + errors.join(' | ') + ')', errors.length === 0);
await browser.close();
