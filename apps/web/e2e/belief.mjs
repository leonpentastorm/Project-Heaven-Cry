// The Belief step in creation (rules 1.6): Faithful with a patron sworn, then Atheist; the sheet carries the belief.
// Then the story's FAITH tab: the panel, the prayer buttons with AP, gate and odds, a target picker, the rites.
import { chromium, click, player, hostAs } from './lib.mjs';
const browser = await chromium.launch();
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const SHOTS = process.env.SHOTS;
const p = await player(browser, 'A');
await hostAs(p, 'Leon');
await click(p, 'Create a character');
await p.getByPlaceholder('What the squad calls you').fill('Vess');
await p.locator('main button[aria-pressed]').first().click();
await click(p, 'Next ›');
// The Confessor (Faith 4): praying is open from the start.
await p.locator('button', { hasText: 'Confessor' }).first().click();
await p.locator('button', { hasText: /^Use .* ›$/ }).first().click();
await click(p, 'Next ›');
await click(p, 'Next ›'); // traits
await p.locator('[data-belief]').first().waitFor();
ok('the Belief step shows its two choices', (await p.locator('[data-belief]').count()) === 2);
ok('not chosen yet: the chip says Atheist by default', /NOT CHOSEN/.test(await p.textContent('body')));
await p.locator('[data-belief="faithful"]').click();
ok('Faithful shows the 8 patrons', (await p.locator('[data-patron]').count()) === 8);
await p.locator('[data-patron="mother_ember"] [data-swear]').click();
ok('sworn to Mother Ember', /FAITHFUL · MOTHER EMBER/i.test(await p.textContent('body')));
if (SHOTS) await p.screenshot({ path: SHOTS + '/belief-faithful.png' });
await p.locator('[data-belief="atheist"]').click();
ok('Atheist hides the patrons', (await p.locator('[data-patron]').count()) === 0);
if (SHOTS) await p.screenshot({ path: SHOTS + '/belief-atheist.png' });
await p.locator('[data-belief="faithful"]').click();
await p.locator('[data-patron="mother_ember"] [data-swear]').click();
await click(p, 'Next ›'); // kit
await p.locator('button', { hasText: 'Line soldier' }).first().click();
await click(p, 'Next ›'); await click(p, 'Lock in and bring to the room', { timeout: 3000 });
await p.waitForFunction(() => Object.keys(window.__phc.getState().game?.characters || {}).length > 0, null, { timeout: 10000 });
const sheet = await p.evaluate(() => Object.values(window.__phc.getState().game.characters)[0]);
ok('the sheet carries the belief (Faithful, Mother Ember)', sheet.belief?.kind === 'faithful' && sheet.belief?.patron === 'mother_ember');
ok('and Faith 3', (sheet.skills.faith || 0) >= 3);
await p.evaluate(() => window.__phc.setNarrator({ scripted: true }));
await click(p, 'Start session');
await p.waitForSelector('.phc-story', { timeout: 15000 });
await p.getByRole('tab', { name: 'FAITH' }).click().catch(async () => { await p.getByRole('button', { name: 'FAITH', exact: true }).click(); });
const panel = p.locator('[data-phc-faith-panel]'); await panel.waitFor({ timeout: 5000 });
const txt = await panel.textContent();
ok('the panel: Mother Ember, Devotion 3 / 10 with the gates', /Mother Ember/.test(txt) && /DEVOTION · 3 \/ 10/.test(txt) && /HYMN I/.test(txt) && /HYMN III · MIRACLE/.test(txt));
ok('likes and taboos, in words with their marks', /✓ HEAL/.test(txt) && /✕ BETRAY/.test(txt));
ok('6 Whispers, 3 Hymns, the Miracle', (await panel.locator('[data-prayer^="whisper:"]').count()) === 6 && (await panel.locator('[data-prayer^="hymn:"]').count()) === 3 && (await panel.locator('[data-prayer^="miracle:"]').count()) === 1);
ok('a Hymn shows AP, gate and odds', /3 AP · HYMN I · DEVOTION 3 · SURE/.test(await panel.locator('[data-prayer^="hymn:"]').first().textContent()));
ok('an overreach shows its TN and the cost', /OVERREACH · TN \d+/.test(txt) && /a miss costs 1 Devotion/.test(txt));
ok('the Miracle is disabled with its reason', /✕ A Miracle needs Faith 7/.test(await panel.locator('[data-prayer^="miracle:"]').textContent()));
// A targeted Whisper opens the party chips, then Pray (the reducer answers once implementer 1's rules land).
const wBtns = panel.locator('[data-prayer^="whisper:"]');
let opened = false;
for (let i = 0; i < 6 && !opened; i++) { await wBtns.nth(i).click(); opened = (await panel.locator('[role="group"][aria-label="Choose the target"]').count()) > 0; if (!opened) await p.waitForTimeout(150); }
ok('a Whisper with a target opens the party chips', opened);
if (opened) { const grp = panel.locator('[role="group"][aria-label="Choose the target"]'); await grp.getByRole('button').first().click();
  ok('picking someone gives the verdict and Pray', /Pray/.test(await grp.textContent())); }
ok('rites: listed, with the engine ones as buttons', (await panel.locator('[data-rite]').count()) >= 1);
if (SHOTS) { await p.setViewportSize({ width: 1440, height: 1400 }); await p.waitForTimeout(300); await p.screenshot({ path: SHOTS + '/faith-tab.png' }); await panel.evaluate((el) => el.scrollIntoView({ block: 'start' })); await p.locator('[data-phc-cutin]').count() && await p.keyboard.press('Escape'); await p.waitForTimeout(600); await panel.screenshot({ path: SHOTS + '/faith-panel-top.png', clip: undefined }); }
console.log('errors', p.errors);
await browser.close();
