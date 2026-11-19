// "I'll narrate" (rules 1.80 item 6801; docs/design/handoffs/0.32-COOP.md item 3): the host picks the human Narrator
// in the room, a guest plays, and the host narrates from the Narrator's desk on their own screen: the opening with a
// check they call (the TN is theirs, the engine rolls it on the guest's screen), the results, a ruling the story owes
// (the guest's Clean Hands, refused: the use comes back), a prepared fight started from the desk, and in the fight an
// attempt answered with a check from the fight screen's Narrator buttons. The desk keeps both side panels.
// Run: BASE=http://127.0.0.1:8787 node apps/web/e2e/narrate.mjs
import { readFileSync } from 'fs';
import { chromium, player, click, BASE, OUT, hostAs, sidePanels } from './lib.mjs';

const browser = await chromium.launch();
const host = await player(browser, 'host', { campaigns: ['m813'] }), guest = await player(browser, 'guest');
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const T = (p) => p.evaluate(() => window.__phc.truth());
const G = (p) => p.evaluate(() => window.__phc.getState().game);
const act = (p, a) => p.evaluate((a) => window.__phc.act(a), a);
const desk = host.locator('[data-gm-desk]');
try {
  await hostAs(host, 'Leon');
  await host.waitForSelector('text=The squad');
  const code = (await host.locator('text=/ROOM [A-Z0-9]{6}/').first().textContent()).match(/ROOM ([A-Z0-9]{6})/)[1];
  // 1. the room: "I'll narrate" is selectable now (it showed "coming soon")
  const pick = host.locator('button', { hasText: 'I\'ll narrate' }).first();
  await pick.click();
  await host.waitForFunction(() => window.__phc.getState().game.settings.mode === 'human', null, { timeout: 30000 });
  ok('the host picks "I\'ll narrate": the room is in the human Narrator\'s mode, the card pressed', (await pick.getAttribute('aria-pressed')) === 'true');
  ok('the room says what the Narrator\'s seat does', (await host.locator('text=/takes the Narrator\'s seat/').count()) > 0);

  // 2. a guest joins and brings a Confessor with Clean Hands (Conscience 3: one perk step), through the room link
  await guest.goto(BASE + '/?room=' + code); await guest.getByPlaceholder('Leon').fill('Mai'); await click(guest, 'Join ›');
  await guest.waitForSelector('text=The squad');
  const ARCH = JSON.parse(readFileSync(new URL('../../../data/archetypes.json', import.meta.url), 'utf8'));
  const cf = (ARCH.items || ARCH).find((x) => x.id === 'confessor');
  await act(guest, { type: 'char/add', sheet: { name: 'Sister Vey', portrait: '', origin: 'Thousand-Planet frontier', traits: [], skills: { ...cf.preset }, attrs: { ...cf.attributes }, cores: { ...cf.cores }, identity: {} } });
  await host.waitForFunction(() => Object.keys(window.__phc.truth().characters).length === 1, null, { timeout: 30000 });
  const charId = Object.keys((await T(host)).characters)[0];
  await act(guest, { type: 'levelup/perk', charId, perkId: 'clean_hands' });
  await host.waitForFunction((id) => window.__phc.truth().characters[id].perks.some((p) => p.id === 'clean_hands'), charId, { timeout: 30000 });
  ok('the guest\'s character is in the room with Clean Hands; the host brings none', true);

  // 3. the opening: the desk on the host's screen, "is writing" on the guest's
  await click(host, 'Start session');
  await desk.waitFor({ timeout: 60000 });
  ok('the session starts and the Narrator\'s desk opens on the host\'s screen for the opening', /THE OPENING/.test(await desk.textContent()));
  await guest.waitForSelector('text=/Leon, the Narrator, is writing/', { timeout: 30000 });
  ok('the guest sees the Narrator writing, and no desk', (await guest.locator('[data-gm-desk]').count()) === 0);
  await sidePanels(host, 'the Narrator\'s desk');
  await host.getByLabel('Your narration').fill('The rear pad hums under a dead sky. Keel waits at the ramp, arms folded.');
  await host.locator('[data-gm-add-check]').click();
  const row = host.locator('[data-gm-check]').first();
  await row.locator('select[aria-label="Who rolls"]').selectOption(charId);
  await row.locator('select[aria-label="Skill to roll"]').selectOption('conscience');
  await row.locator('select[aria-label="TN"]').selectOption('16');
  await row.getByLabel('What is at stake').fill('Talk Keel into lowering the ramp');
  await host.locator('[data-gm-send]').click();
  await guest.waitForSelector('text=Keel waits at the ramp', { timeout: 30000 });
  const ck = (await T(host)).checks.find((k) => !k.done);
  ok('the host\'s turn lands: the narration on the guest\'s screen, a Conscience check at TN 16 called on the guest (' + JSON.stringify(ck && { skills: ck.skills, tn: ck.tn }) + ')', !!ck && ck.tn === 16 && ck.skills[0] === 'conscience' && ck.charId === charId);
  ok('the desk closes once the turn is sent', await desk.waitFor({ state: 'detached', timeout: 30000 }).then(() => true, () => false));

  // 4. the guest rolls it: the engine rolls against the Narrator's TN, shown on the guest's screen
  await guest.waitForSelector('text=CLICK TO ROLL', { timeout: 30000 });
  ok('the guest\'s check shows the Narrator\'s TN (HARD 16)', (await guest.locator('text=/HARD 16/').count()) > 0);
  if (!(await guest.locator('div[aria-label="Dice table"]').count())) await guest.locator('button', { hasText: 'Talk Keel into lowering the ramp' }).first().click();
  await click(guest, /Throw/);
  await guest.waitForSelector('text=/SUCCESS|FAILURE|COMPLICATION/', { timeout: 30000 });
  await click(guest, 'Continue', { exact: true });
  await desk.waitFor({ timeout: 30000 });
  const rolled = (await T(host)).story.entries.filter((e) => e.kind === 'check').at(-1);
  ok('the engine rolled it (' + (rolled && rolled.text) + ') and the desk opens again for the results', /THE RESULTS/.test(await desk.textContent()) && !!rolled);
  // the Narrator watched the roll on the dice table (as every player does): close it to write
  const watch = host.locator('div[aria-label="Dice table"]').getByRole('button', { name: 'Close', exact: true });
  if (await watch.count()) await watch.first().click();
  await host.getByLabel('Your narration').fill('Keel shrugs and hits the switch. The ramp groans down.');
  await host.locator('[data-gm-send]').click();
  await guest.waitForFunction(() => window.__phc.getState().game.story.await === 'players', null, { timeout: 30000 });
  ok('the results are told and the next round opens for the players', true);

  // 5. a ruling the story owes: the guest claims Clean Hands, speaks and ends the turn; the Narrator refuses it
  await act(guest, { type: 'story/perk', charId, id: 'clean_hands', actionId: 'clean_story', text: 'the wounded pilot on the pad' });
  await host.waitForFunction(() => (window.__phc.truth().story.rulings || []).length === 1, null, { timeout: 30000 });
  await guest.getByLabel('What do you do?').fill('I kneel by the pilot and keep pressure on the wound.'); await click(guest, 'Send', { exact: true }); await click(guest, 'End turn', { exact: true });
  await desk.waitFor({ timeout: 30000 });
  const rul = host.locator('[data-gm-ruling]');
  ok('the desk opens for the round with the ruling the story owes (' + ((await rul.first().textContent().catch(() => '')) || '').slice(0, 80) + ')', (await rul.count()) === 1 && /Clean Hands/.test(await rul.first().textContent()));
  await rul.first().locator('[data-gm-ruling-no]').click();
  ok('the Narrator marks it refused (No pressed)', (await rul.first().locator('[data-gm-ruling-no]').getAttribute('aria-pressed')) === 'true');
  // 6. and starts the campaign's prepared fight from the desk
  await host.getByLabel('Your narration').fill('A whine overhead: scavenger drones dive on the pad.');
  const fights = await host.locator('select[data-gm-fight] option').allTextContents();
  await host.locator('select[data-gm-fight]').selectOption({ index: 1 });
  await host.locator('[data-gm-send]').click();
  // (the fight opens at once, so the guest's story line is read from the guest's own game, not the screen)
  await guest.waitForFunction(() => window.__phc.getState().game.story.entries.some((e) => /is refused; the use comes back/.test(e.text || '')), null, { timeout: 30000 }).catch(() => {});
  const t1 = await T(host), gRef = (await G(guest)).story.entries.some((e) => /Clean Hands is refused; the use comes back/.test(e.text || ''));
  ok('the refusal is applied by the engine: the ruling is settled and the use comes back (the guest\'s story says so)', !(t1.story.rulings || []).length && gRef);
  await host.waitForFunction(() => !!window.__phc.truth().combat, null, { timeout: 30000 });
  ok('the prepared fight starts from the desk (' + fights.slice(1).join(' | ').slice(0, 120) + ')', !!(await T(host)).combat);

  // 7. in the fight: the guest attempts on their turn; the host answers with a check at the TN they pick
  await guest.waitForFunction(() => { const s = window.__phc.getState(), g = s.game, cb = g && g.combat; if (!cb || cb.over) return false; const u = cb.units.find((x) => x.id === cb.order[cb.turn]); const d = document.querySelector('.phc-cb-dock');
    return !!(u && u.charId && g.characters[u.charId].owner === s.me.id) && !!d && !d.getAttribute('data-lock'); }, null, { timeout: 120000 });
  const say = guest.getByLabel('Say something, or attempt it').first();
  await say.fill('Drones! Scatter, you tin vultures!');
  await guest.locator('[data-say="attempt"]').first().click();
  await host.waitForSelector('[data-fight-gm]', { timeout: 30000 });
  ok('the attempt waits on the Narrator: the fight screen\'s Narrator buttons are on the host\'s screen', true);
  const gm = host.locator('[data-fight-gm]');
  await gm.locator('select[aria-label="Skill to roll"]').selectOption('intimidation');
  await gm.locator('select[aria-label="TN"]').selectOption('8');
  await gm.locator('[data-fight-answer="check"]').click();
  await host.waitForFunction(() => { const cb = window.__phc.truth().combat; return !!cb && !cb.ruling; }, null, { timeout: 30000 });
  const line = (g) => (g.combat.log || []).map((x) => (typeof x === 'string' ? x : x.text || '')).find((x) => /INTIMIDATION CHECK .* vs 8 /.test(x)) || '';
  const hl = line(await T(host));
  if (!hl) console.log('      the fight log: ' + JSON.stringify(((await T(host)).combat.log || []).slice(-12)));
  ok('the engine rolls the check the Narrator asked, at TN 8 and the fight goes on (' + hl + ')', !!hl);
  await guest.waitForFunction(() => JSON.stringify(window.__phc.getState().game.combat.log || []).includes('INTIMIDATION CHECK'), null, { timeout: 30000 }).catch(() => {});
  ok('the guest sees the same roll in the fight log', !!hl && line(await G(guest)) === hl);
  const errs = [...host.errors, ...guest.errors].filter((e) => !/WebSocket|Failed to load resource|net::|favicon|youtube/i.test(e));
  ok('no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''), !errs.length);
} catch (e) { await host.screenshot({ path: OUT + 'narrate-fail-host.png' }).catch(() => {}); await guest.screenshot({ path: OUT + 'narrate-fail-guest.png' }).catch(() => {}); ok('the suite ran to its end: ' + String(e && e.message || e).split('\n').slice(0, 4).join(' · '), false); }
finally { await browser.close(); }
