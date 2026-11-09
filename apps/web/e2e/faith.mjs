// The Belief step in creation (rules 1.6): Faithful with a patron sworn, then Atheist; the sheet carries the belief.
// Then the story's FAITH tab: the panel, the prayer buttons with AP, gate and odds, a target picker, the rites.
// Then a fight: the vow prompt (Shield asks for the ally; skippable), the combat FAITH tab, a prayer aimed on the grid.
// The rules are implementer 1's (packages/engine/src/faith.ts); this checks the screens send them and show what comes back.
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
ok('the panel: Mother Ember, Devotion 3 with its XP toward 4 (DEVOTION 3 · 0/25 XP) and the gates (Hymn III at 7, the Miracle at 10: rules 1.6.2)', /Mother Ember/.test(txt) && /DEVOTION 3 · 0\/25 XP/.test(txt) && /HYMN I/.test(txt) && /HYMN III/.test(txt) && !/HYMN III · MIRACLE/.test(txt) && /MIRACLE/.test(txt));
ok('the Miracle\'s heading gives its gate and price', /✦ MIRACLE · AT DEVOTION 10 · ONCE A SESSION · COSTS 5 LEVELS/.test(txt));
ok('the panel shows the day (DAY 1), no cooldown and no grudge', /DAY 1/.test(await panel.locator('[data-faith-day]').textContent()) && (await panel.locator('[data-faith-cooldown]').count()) === 0 && (await panel.locator('[data-faith-grudge]').count()) === 0);
ok('the meter says its words to a screen reader too', /DEVOTION 3 · 0\/25 XP/.test((await panel.locator('[role="meter"]').getAttribute('aria-valuetext')) || ''));
ok('the gate marks are faith light (var(--faith-light) = #F2C46A)', await panel.evaluate((el) => { const s = [...el.querySelectorAll('[role="meter"] span')].find((x) => x.textContent === 'HYMN I'); return !!s && getComputedStyle(s).color === 'rgb(242, 196, 106)'; }));
ok('likes and taboos, in words with their marks', /✓ HEAL/.test(txt) && /✕ BETRAY/.test(txt));
ok('6 Whispers, 3 Hymns, the Miracle', (await panel.locator('[data-prayer^="whisper:"]').count()) === 6 && (await panel.locator('[data-prayer^="hymn:"]').count()) === 3 && (await panel.locator('[data-prayer^="miracle:"]').count()) === 1);
ok('a Hymn shows AP, gate and odds', /3 AP · HYMN I · DEVOTION 3 · SURE/.test(await panel.locator('[data-prayer^="hymn:"]').first().textContent()));
ok('an overreach shows its TN and the cost in Devotion XP', /OVERREACH · TN \d+/.test(txt) && /a miss costs 3 Devotion XP/.test(txt));
ok('the Miracle is disabled with its reason', /✕ A Miracle needs Faith 7/.test(await panel.locator('[data-prayer^="miracle:"]').textContent()));
// A targeted Whisper opens the party chips, then Pray (the reducer answers once implementer 1's rules land).
const wBtns = panel.locator('[data-prayer^="whisper:"]');
let opened = false;
for (let i = 0; i < 6 && !opened; i++) { await wBtns.nth(i).click(); opened = (await panel.locator('[role="group"][aria-label="Choose the target"]').count()) > 0; if (!opened) await p.waitForTimeout(150); }
ok('a Whisper with a target opens the party chips', opened);
if (opened) { const grp = panel.locator('[role="group"][aria-label="Choose the target"]'); await grp.getByRole('button').first().click();
  ok('picking someone gives the verdict and Pray', /Pray/.test(await grp.textContent()));
  const n0 = await p.evaluate(() => window.__phc.getState().game.story.entries.length);
  await grp.locator('[data-prayer-confirm]').click(); await p.waitForTimeout(600);
  const said = await p.evaluate((n0) => window.__phc.getState().game.story.entries.slice(n0).map((e) => (e.head || '') + ' ' + e.text).join(' | '), n0);
  ok('Pray: the story answers (' + said.slice(0, 90) + ')', /ANSWERED|SILENCE/.test(said));
  ok('and the next Whisper waits: "One Whisper a round."', /One Whisper a round/.test(await panel.textContent())); }
ok('rites: listed, with the engine ones as buttons', (await panel.locator('[data-rite]').count()) >= 1);
const keep = panel.locator('[data-rite] button').first();
if (await keep.count() && (await keep.getAttribute('aria-disabled')) !== 'true') {
  await keep.click(); await p.waitForTimeout(500);
  ok('keeping a rite: the story says so and the card reads KEPT', /RITE ·/.test(await p.evaluate(() => window.__phc.getState().game.story.entries.map((e) => e.head || '').join(' '))) && /KEPT THIS SESSION/.test(await panel.textContent()));
} else console.log('note no engine rite could be kept now: ' + ((await panel.locator('[data-rite]').first().textContent()) || '').slice(0, 120));
const hereDay = p.locator('[data-here-day]').first();
ok('the HERE card shows the day even with no objectives (' + ((await hereDay.count()) ? await hereDay.textContent() : 'no card') + ')', (await hereDay.count()) > 0 && /^DAY \d+$/.test((await hereDay.textContent()) || ''));
ok('the liked-tag caps are on the faith tab (' + ((await panel.locator('[data-faith-tagcaps]').textContent()) || '') + ')', /^LIKED TAGS · \d\/2 THIS SCENE · \d\/6 THIS SESSION/.test((await panel.locator('[data-faith-tagcaps]').textContent()) || ''));
// A day passes on a long rest: the faith tab and the HERE card follow.
await p.evaluate(() => window.__phc.act({ type: 'narrator/turn', turn: { narration: 'They sleep by the fire.', rest: { kind: 'long' } } }));
await p.waitForTimeout(400);
ok('a long rest is a day: the faith tab reads DAY 2', /DAY 2/.test(await panel.locator('[data-faith-day]').textContent()));
ok('and the HERE card follows (DAY 2)', /^DAY 2$/.test((await p.locator('[data-here-day]').first().textContent()) || ''));
// The host's Next session (item 721): from Rest…, the session counter moves on in the same room.
await p.locator('.phc-rest').first().click(); await p.waitForTimeout(200);
const nextOpt = p.locator('.phc-rest-opt', { hasText: 'Next session' });
ok('Rest… offers the host Next session', (await nextOpt.count()) === 1);
if (await nextOpt.count()) { await nextOpt.click(); await p.waitForTimeout(500);
  const sn = await p.evaluate(() => window.__phc.getState().game.sessionN);
  ok('Next session: session 2 begins in the room (sessionN ' + sn + '), not a day (still DAY 2)', sn === 2 && /SESSION 2/.test(await p.evaluate(() => window.__phc.getState().game.story.entries.map((e) => e.head || '').join(' '))) && /DAY 2/.test(await panel.locator('[data-faith-day]').textContent())); }
if (SHOTS) { await p.setViewportSize({ width: 1440, height: 1400 }); await p.waitForTimeout(300); await p.screenshot({ path: SHOTS + '/faith-tab.png' }); await panel.evaluate((el) => el.scrollIntoView({ block: 'start' })); await p.locator('[data-phc-cutin]').count() && await p.keyboard.press('Escape'); await p.waitForTimeout(600); await panel.screenshot({ path: SHOTS + '/faith-panel-top.png', clip: undefined }); }

// ---------- a fight ----------
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
await p.setViewportSize({ width: 1600, height: 1000 });
await act({ type: 'narrator/turn', turn: { narration: 'Two raiders come over the crates.', combat: { name: 'Crates', enemies: [{ name: 'Raider', tier: 'minion', weapon: 'fists' }, { name: 'Raider Two', tier: 'minion', weapon: 'fists' }] } } });
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 15000 });
await p.waitForFunction(() => { const cb = window.__phc.getState().game.combat; const u = cb && cb.units.find((x) => x.id === cb.order[cb.turn]); return u && u.side === 'pc'; }, null, { timeout: 30000 });
await p.waitForTimeout(1500); if (await p.locator('[data-phc-cutin]').count()) { await p.keyboard.press('Escape'); await p.waitForTimeout(500); }
const vow = p.locator('[data-phc-vow-prompt]');
ok('round 1: the vow prompt, with the 6 vows', (await vow.count()) === 1 && (await vow.locator('[data-vow]').count()) === 6);
await vow.locator('[data-vow="shield"]').click();
ok('Shield asks whom (no ally here: it says so)', /SHIELD WHOM/.test(await vow.textContent()) && /No ally in this fight/.test(await vow.textContent()));
if (SHOTS) await p.screenshot({ path: SHOTS + '/faith-vow.png' });
await vow.locator('[data-vow="stand"]').click(); await p.waitForTimeout(400);
const sworn = await p.evaluate(() => { const cb = window.__phc.getState().game.combat; const u = cb.units.find((x) => x.id === cb.order[cb.turn]); return u.vow || null; });
ok('swearing Stand: the vow is on the unit and the prompt closes (' + JSON.stringify(sworn) + ')', !!sworn && sworn.id === 'stand' && (await p.locator('[data-phc-vow-prompt]').count()) === 0);
ok('the vow shows under the HP bar', /VOW/i.test(await p.locator('aside').first().textContent()) && /Stand|give ground/i.test(await p.locator('aside').first().textContent()));
const ftab = p.locator('[role="tab"][data-tab="faith"]');
ok('the FAITH tab is there', (await ftab.count()) === 1);
await ftab.click();
const panelC = p.locator('[role="tabpanel"]');
ok('it lists the Whispers, the Hymns and the Miracle', (await panelC.locator('[data-act^="pr:whisper:"]').count()) === 6 && (await panelC.locator('[data-act^="pr:hymn:"]').count()) === 3 && (await panelC.locator('[data-act^="pr:miracle:"]').count()) === 1);
await panelC.locator('[data-act="pr:whisper:health"]').click(); await p.waitForTimeout(300);
const selTxt = async () => (await p.locator('aside').first().textContent()) || '';
ok('choosing Health asks for the target', /WHISPER · Health · 1 AP · SURE/.test(await selTxt()) && /Click yourself or an ally/.test(await selTxt()));
const me = await p.evaluate(() => { const cb = window.__phc.getState().game.combat; return cb.units.find((x) => x.id === cb.order[cb.turn]).pos; });
const mapW = await p.evaluate(() => window.__phc.getState().game.combat.map.w);
const [mx, my] = me.split(',').map(Number);
await p.locator('.phc-grid button.phc-tok').nth(my * mapW + mx).click();
await p.waitForTimeout(300);
ok('clicking yourself on the grid picks the target, and Confirm opens', /Target: Vess/.test(await selTxt()));
if (SHOTS) await p.screenshot({ path: SHOTS + '/faith-combat.png' });
const before = await p.evaluate(() => window.__phc.getState().game.combat.log.length);
await p.getByRole('button', { name: 'Confirm', exact: true }).first().click(); await p.waitForTimeout(500);
const st = await p.evaluate(() => { const cb = window.__phc.getState().game.combat; const u = cb.units.find((x) => x.charId && x.side === 'pc'); return { n: cb.log.length, ap: u.ap, last: cb.log.slice(-2).join(' | ') }; });
ok('Health is prayed: 1 AP spent and the log says so (' + st.last.slice(0, 80) + ')', st.n > before && st.ap === 5);
await panelC.locator('[data-act="pr:whisper:luck"]').click(); await p.waitForTimeout(300);
ok('a second Whisper this turn is refused, with the reason', /One Whisper a turn/.test(await selTxt()));
const cards = await p.locator('[data-phc-patron-line]').count();
console.log('note patron line cards in the log now: ' + cards);
if (SHOTS) await p.screenshot({ path: SHOTS + '/faith-combat-after.png' });
console.log('errors', p.errors);
await browser.close();
