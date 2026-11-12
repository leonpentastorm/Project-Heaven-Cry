// Class Roster Revision 3 in the browser (Proving Ground, Solo, no Narrator):
//  · every attribute tied at level 3: the level-up picker offers all nine classes (emblem, name, the attribute in its
//    ink, the fantasy line, resource, both rank I moves, the "permanent" warning), laid out at 1440×1000 and 420 wide;
//  · a card selects and previews, the confirm bar commits; a second pick is refused by the engine;
//  · the class attribute raised to 5 at level 6: rank II's two moves unlock in the class panel;
//  · in a fight, the CLASS tab wears the class's emblem and lists its moves (the Infiltrator's Mark and Toxin);
//  · the Proving Ground's class menu lists only the nine base classes.
// Screenshots: e2e/shots/classes-*.png (deviceScaleFactor 1).
import { readFileSync } from 'fs';
import { chromium, player, click, BASE, OUT, settle } from './lib.mjs';
const browser = await chromium.launch();
const p = await player(browser, 'host');
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const snap = (n, full = false) => p.screenshot({ path: OUT + 'classes-' + n + '.png', fullPage: full });
const G = () => p.evaluate(() => window.__phc.getState().game);
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const SKILLS = JSON.parse(readFileSync(new URL('../../../data/skills.json', import.meta.url), 'utf8')).items;
const CLASSES = JSON.parse(readFileSync(new URL('../../../data/classes.json', import.meta.url), 'utf8')).base;
const dismissCut = async () => { for (let i = 0; i < 3; i++) { if (!(await p.locator('[data-phc-cutin]').count())) return; await p.mouse.click(1430, 990); await settle(p, 380); } };

// ---------- 1. The Proving Ground, then every attribute tied at level 3 ----------
await p.goto(BASE);
await click(p, 'PROVING GROUND');
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 8000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 8000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
await p.mouse.move(1430, 990);
await p.waitForFunction(() => window.__phc.getState().game?.sandbox?.state === 'ready', null, { timeout: 15000 });
let g = await G();
const cid = Object.keys(g.characters)[0];
await act({ type: 'sandbox/class', charId: cid, classId: null });
const top = Math.max(...Object.values(g.characters[cid].attrs));
// One skill per attribute raised to the highest attribute's value: every attribute ends tied at `top`.
for (const a of Object.keys(g.characters[cid].attrs)) {
  const s = SKILLS.find((k) => k.attribute === a || k.attr === a);
  if (s && (g.characters[cid].attrs[a] || 1) < top) await act({ type: 'sandbox/skill', charId: cid, skill: s.id, points: top });
}
await act({ type: 'sandbox/level', charId: cid, level: 3 });
g = await G();
const attrs = Object.values(g.characters[cid].attrs);
ok('every attribute tied at ' + top + ': ' + attrs.join(' '), attrs.length === 9 && attrs.every((v) => v === top));
ok('level 3, no class yet: level ' + g.characters[cid].level + ', class ' + g.characters[cid].classId, g.characters[cid].level === 3 && !g.characters[cid].classId);

// ---------- 2. The picker: nine cards ----------
const lvl = p.locator('button', { hasText: /Earn your class|Level up/ }).first();
await lvl.waitFor({ timeout: 15000 });
await lvl.click();
await p.waitForSelector('.phc-lu-pick', { timeout: 15000 });
await settle(p, 700); // the pop-in animations
const cards = p.locator('button.phc-lu-class-card');
ok('the picker offers all nine classes: ' + (await cards.count()), (await cards.count()) === 9);
const ids = (await cards.evaluateAll((bs) => bs.map((b) => b.getAttribute('data-class')))).sort();
ok('one card per base class', JSON.stringify(ids) === JSON.stringify(CLASSES.map((c) => c.id).sort()));
const card = p.locator('button.phc-lu-class-card[data-class="infiltrator"]');
ok('a card has its emblem', (await card.locator('img.phc-lu-emblem').count()) === 1);
ok('a card names its attribute in the attribute ink: ' + (await card.locator('.phc-lu-card-attr').textContent()),
  /PERCEPTION/.test(await card.locator('.phc-lu-card-attr').textContent()) && (await card.locator('.phc-lu-card-attr').evaluate((e) => getComputedStyle(e).color)) === 'rgb(64, 186, 160)');
ok('a card has the fantasy line, the resource and both rank I moves', (await card.textContent()).includes(CLASSES.find((c) => c.id === 'infiltrator').tagline) && /Resource: Marks/.test(await card.textContent()) && (await card.locator('.phc-lu-card-move').count()) === 2);
ok('the choice is marked permanent', /PERMANENT/.test(await p.locator('.phc-lu-permanent').textContent()));
ok('no advanced class is offered anywhere on the screen', !/Gunslinger|Spellslinger|tutor|signature/i.test(await p.locator('body').textContent()));
// Layout at 1440×1000: three cards to a row, nothing past the right edge.
const rects = await cards.evaluateAll((bs) => bs.map((b) => { const r = b.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; }));
const cols = new Set(rects.map((r) => r[0])).size, rows = new Set(rects.map((r) => r[1])).size;
ok('1440×1000: ' + cols + ' columns × ' + rows + ' rows, card width ' + rects[0][2] + ', tallest ' + Math.max(...rects.map((r) => r[3])), cols === 3 && rows === 3);
const over = () => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok('1440×1000: no horizontal overflow (' + (await over()) + ')', (await over()) <= 0);
await snap('01-picker-1440');
await snap('01-picker-1440-full', true);
// A narrow screen: one column, no overflow, the confirm bar at the bottom.
await p.setViewportSize({ width: 420, height: 900 });
await settle(p, 400);
const nrects = await cards.evaluateAll((bs) => bs.map((b) => Math.round(b.getBoundingClientRect().left)));
ok('420 wide: one column (' + new Set(nrects).size + '), no overflow (' + (await over()) + ')', new Set(nrects).size === 1 && (await over()) <= 0);
await snap('02-picker-narrow');
await p.setViewportSize({ width: 1440, height: 1000 });
await settle(p, 300);

// ---------- 3. Select, preview, confirm; a second pick is refused ----------
ok('nothing selected yet: no confirm button', (await p.locator('button.phc-lu-confirm-btn').count()) === 0);
await card.click();
await settle(p, 250);
ok('the selected card previews the class: ' + (await p.locator('.phc-lu-class-kicker').textContent()), /PREVIEW/.test(await p.locator('.phc-lu-class-kicker').textContent()) && /Infiltrator/.test(await p.locator('.phc-lu-class-name').textContent()));
ok('a card only selects (no class yet)', !(await G()).characters[cid].classId);
await snap('03-picker-selected');
await p.locator('button.phc-lu-confirm-btn').click();
await settle(p, 300);
g = await G();
ok('confirmed: the Infiltrator', g.characters[cid].classId === 'infiltrator');
ok('the picker is gone', (await cards.count()) === 0);
const again = await act({ type: 'levelup/class', charId: cid, classId: 'mage' });
const t = await p.evaluate(() => { const x = window.__phc.getState().toast; return x ? (x.text || String(x)) : ''; });
ok('a second pick is refused: ' + (again || t), /set/i.test(again || t) && (await G()).characters[cid].classId === 'infiltrator');
const states = async () => (await p.locator('.phc-lu-rank-state').allTextContents()).map((s) => s.trim());
ok('rank I unlocked, II and III locked: ' + (await states()).join(' | '), JSON.stringify(await states()) === JSON.stringify(['✓ UNLOCKED', 'LOCKED', 'LOCKED']));
ok('the class panel reads the attribute: ' + (await p.locator('.phc-lu-attr').textContent()), (await p.locator('.phc-lu-attr').textContent()).trim() === 'PERCEPTION ' + top);
ok('the quiet advanced line', (await p.locator('.phc-lu-adv-note').textContent()) === 'Advanced classes are being rebuilt.');

// ---------- 4. Perception to 5 and level 6: rank II (rules 1.11: a rank needs its level too) ----------
const per = SKILLS.find((k) => (k.attribute || k.attr) === 'perception');
await act({ type: 'sandbox/level', charId: cid, level: 6 });
await act({ type: 'sandbox/skill', charId: cid, skill: per.id, points: 5 });
await settle(p, 400);
g = await G();
ok('Perception 5: ' + g.characters[cid].attrs.perception, g.characters[cid].attrs.perception >= 5);
ok('rank II: ' + (await p.locator('.phc-lu-rank').textContent()), (await p.locator('.phc-lu-rank').textContent()).trim() === 'RANK II');
ok('rank II unlocked: ' + (await states()).join(' | '), JSON.stringify(await states()) === JSON.stringify(['✓ UNLOCKED', '✓ UNLOCKED', 'LOCKED']));
const r2 = p.locator('.phc-lu-rank-group[data-rank="II"] .phc-lu-move');
const r2Names = (await r2.allTextContents()).map((x) => x.replace(/\s+/g, ' ').trim());
ok('rank II has both moves, unlocked: ' + r2Names.map((x) => x.slice(0, 14)).join(' | '), (await r2.count()) === 2 && !r2Names.some((x) => /LOCKED/.test(x)));
await p.locator('.phc-lu-class').scrollIntoViewIfNeeded();
await snap('04-rank-two');
await snap('04-rank-two-full', true);

// ---------- 5. The fight: the CLASS tab's emblem and moves ----------
await p.locator('button.phc-lu-done').click();
await settle(p, 400);
await act({ type: 'sandbox/ai', on: false });
await act({ type: 'sandbox/auto', on: false });
await p.getByRole('button', { name: /^⚔ Start the fight/ }).first().click().catch(async () => { await act({ type: 'sandbox/fight' }); });
await p.waitForFunction(() => window.__phc.getState().game?.phase === 'combat', null, { timeout: 15000 });
await p.waitForSelector('text=YOUR TURN', { timeout: 15000 });
await p.waitForSelector('[data-phc-cutin]', { timeout: 3000 }).catch(() => {}); await dismissCut();
const tab = p.locator('#phc-tab-class');
ok('a CLASS tab', (await tab.count()) === 1);
const src = decodeURIComponent((await tab.locator('img').first().getAttribute('src').catch(() => '')) || '');
ok('the CLASS tab wears the Infiltrator emblem (Mind cyan, the eye)', src.includes('#4FC8DF') && src.includes('M6.4 10.2 Q12 4.6'));
await tab.click();
await settle(p, 200);
const panel = await p.locator('[role="tabpanel"]').first().textContent();
ok('the Class tab names the Infiltrator: ' + panel.slice(0, 40), /INFILTRATOR/i.test(panel));
ok('the Class tab lists Mark (rank I) and Toxin (rank II)', /Mark/.test(panel) && /Toxin/.test(panel));
ok('the You card carries the emblem', (await p.locator('.phc-me-class img.phc-class-emblem').count()) > 0);
await snap('05-class-tab');

// ---------- 6. The Proving Ground class menu: the nine base classes ----------
const drawer = p.locator('aside[aria-label="Proving Ground tools"]');
if (!(await drawer.count())) await p.getByRole('button', { name: 'Open the Proving Ground tools' }).click();
await drawer.waitFor();
await drawer.getByRole('tab', { name: 'Squad' }).click();
const opts = await drawer.getByLabel('Class', { exact: true }).locator('option').allTextContents();
const base = opts.filter((o) => o !== 'Classless');
ok('the class menu has nine classes: ' + base.join(', '), base.length === 9 && !opts.some((o) => /Gunslinger|Shade|Templar|advanced/i.test(o)));
ok('no advanced optgroup in the class menu', (await drawer.getByLabel('Class', { exact: true }).locator('optgroup').count()) === 0);
const help = await drawer.getByText(/Rank reads/).first().textContent().catch(() => '');
ok('the helper text gives the new rank rule: ' + help, /rank II at Perception 5 and level 6, rank III at 8 and level 12/.test(help) && !/signature|13 and 18/.test(help));
await snap('06-tools-class');

ok('no page errors: ' + p.errors.join(' | '), !p.errors.length);
await browser.close();
