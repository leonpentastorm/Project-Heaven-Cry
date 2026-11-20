// 0.32 final pass B8 (the most important check of the release: a door that does not open for a new character blocks a
// player). Two brand-new characters in one Survival room, two browsers, at 1280 x 720, every step a player's click:
//   A. the host's Rigger, Visualization 1 (the only door it has), locked in with no form learned. Start the run asks
//      "Level up first?"; Open Level up shows the TO CHOOSE chip "2 choices · Figment form"; its chooser's Choose is
//      clicked twice (two forms learned, door/pick); Done; Start the run again goes to the camp with no question.
//   B. the guest's Mender (the Empath archetype as creation fills it: Empathy 4), its camp on the Recommended loadout
//      (the Attuner in the off hand).
//   C. the first fight: on the Rigger's turn the FIGMENTS tab names no form still to choose, Picture offers the two
//      learned forms; one chosen, a tile clicked, Confirm: a Figment stands. On the Mender's turn, TEND, Bond, the
//      Rigger's token clicked, Confirm: the Bond holds (combat.ties).
//   D. the hint for a Rigger who went on without choosing (the Proving Ground, Visualization 1, the Visualizer): the
//      FIGMENTS tab says the forms still to choose and where, and Picture's empty pick says the same, never a bare
//      "Nothing to pick.".
// The characters are added by char/add, the action creation's Lock in sends, with sheets as creation fills them.
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium, player, click, hostAs, settle, until, pickAction, campStart, OUT, BASE } from './lib.mjs';
const DATA = (f) => JSON.parse(readFileSync(new URL('../../../data/' + f, import.meta.url), 'utf8'));
const ARCH = DATA('archetypes.json'), ARCHS = Array.isArray(ARCH) ? ARCH : ARCH.items;
const browser = await chromium.launch();
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const SEED = 'PHC-0046';
const h = await player(browser, 'host', { play: 'survival' }), gu = await player(browser, 'guest', { play: 'survival' });
for (const x of [h, gu]) { await x.context().addInitScript((seed) => { try { localStorage.setItem('phc.testRoom', '1'); localStorage.setItem('phc.testSeed', seed); } catch { /* */ } }, SEED); await x.setViewportSize({ width: 1280, height: 720 }); }
const mkAct = (pg) => (a) => pg.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const actH = mkAct(h), actG = mkAct(gu);
const G = () => h.evaluate(() => window.__phc.getState().game);
const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };
const tok = (pg, k) => pg.locator('button.phc-tok[aria-label^="' + ref(k) + ' ·"]').first();
/** A button that comes live within 5 s (a check made the instant after a click read the dock mid-update). */
const liveSoon = async (b) => { for (let i = 0; i < 25; i++) { if (await b.isEnabled().catch(() => false)) return true; await new Promise((r) => setTimeout(r, 200)); } return false; };
const dismissCut = async (pg) => { for (let i = 0; i < 4; i++) { if (!(await pg.locator('[data-phc-cutin]').count())) return; await pg.keyboard.press('Escape'); await settle(pg, 300); } };

// the sheets, as creation fills them (10 Skill points, 10 Attribute points)
const RIGGER = { name: 'Wren', portrait: '', origin: 'Thousand-Planet frontier', traits: [], identity: {},
  skills: { visualization: 1, charisma: 2, proficiency: 2, vigilant: 2, analysis: 2, eloquence: 1 },
  attrs: { endurance: 3, strength: 1, agility: 3, perception: 3, intelligence: 3, expression: 3, insight: 1, determination: 1, virtue: 1 }, cores: { body: 3, mind: 3, soul: 1 } };
const EMP = ARCHS.find((a) => a.id === 'mender');
const MENDER = { name: 'Ama', portrait: '', origin: 'Thousand-Planet frontier', traits: [], identity: {}, skills: { ...EMP.preset }, attrs: { ...EMP.attributes }, cores: { ...EMP.cores } };

// ---------- the room: host and guest, each locks in a new character ----------
await hostAs(h, 'Leon');
await h.waitForSelector('[role="radiogroup"]');
const code = (await h.locator('text=/ROOM [A-Z0-9]{6}/').first().textContent()).match(/ROOM ([A-Z0-9]{6})/)[1];
await gu.goto(BASE + '/?room=' + code); await gu.getByPlaceholder('Leon').fill('Mai'); await click(gu, 'Join ›'); await gu.waitForSelector('text=The squad');
ok('the Rigger locked in (char/add)', (await actH({ type: 'char/add', sheet: RIGGER })) === null);
ok('the Mender locked in (char/add)', (await actG({ type: 'char/add', sheet: MENDER })) === null);
await h.waitForFunction(() => Object.keys(window.__phc.getState().game?.characters || {}).length === 2, null, { timeout: 60000 }).catch(() => {});
let g = await G();
const guestId = await gu.evaluate(() => window.__phc.getState().me.id);
const rigId = Object.values(g.characters).find((c) => c.owner !== guestId).id, menId = Object.values(g.characters).find((c) => c.owner === guestId).id;
ok('the Rigger knows no form yet (' + JSON.stringify(g.characters[rigId].doorPicks || {}) + ')', !(g.characters[rigId].doorPicks || {}).figment_forms);

// ---------- A. Start the run asks first; the forms are chosen on Level up ----------
await h.locator('button[data-phc-start]').click(); await settle(h, 400);
const dlg = h.locator('[data-phc-dialog]');
const asked = (await dlg.count()) > 0 ? await dlg.first().innerText() : '';
await h.screenshot({ path: OUT + 'doors-new-rigger-asked.png' });
ok('Start the run asks "Level up first?" with Open Level up (' + asked.replace(/\s+/g, ' ').slice(0, 80) + ')', /Level up first\?/.test(asked) && /Open Level up/.test(asked));
await dlg.locator('button', { hasText: 'Open Level up' }).click();
await h.waitForFunction(() => window.__phc.getState().screen === 'levelup', null, { timeout: 30000 });
const chipB = h.getByRole('button', { name: /2 choices · Figment form/ });
ok('Level up: the TO CHOOSE chip "2 choices · Figment form"', (await chipB.count()) > 0);
await chipB.first().click(); await settle(h, 300);
await h.screenshot({ path: OUT + 'doors-new-rigger-chooser.png' });
const picks = h.locator('[data-fork-pick]');
ok('the chooser offers the forms, each with Choose (' + (await picks.count()) + ')', (await picks.count()) >= 2);
const first = await picks.nth(0).getAttribute('data-fork-pick');
await picks.nth(0).click(); await settle(h, 400);
await h.locator('[data-fork-pick]').nth(0).click(); await settle(h, 400);
g = await G();
const forms = (g.characters[rigId].doorPicks || {}).figment_forms || [];
ok('two forms learned by two clicks (' + forms.join(', ') + ')', forms.length === 2 && forms[0] === first);
await h.getByRole('button', { name: /^Done/ }).first().click();
await h.waitForFunction(() => window.__phc.getState().screen !== 'levelup', null, { timeout: 30000 });
await h.locator('button[data-phc-start]').click(); await settle(h, 500);
ok('Start the run again: no question now, the camp opens', (await h.locator('[data-phc-dialog]').count()) === 0);

// ---------- B. the camp: each on the Recommended loadout ----------
await campStart(gu);
await campStart(h);
await until(h, () => window.__phc.getState().game.run?.state === 'map' || !!document.querySelector('[data-phc-camp-close]'), null, 30000).catch(() => false);
if ((await G()).run.state !== 'map') { await h.locator('[data-phc-camp-close]').click().catch(() => {}); }
await until(h, () => window.__phc.getState().game.run?.state === 'map', null, 30000).catch(() => false);
g = await G();
ok('the camp done: the path map (' + g.run.state + '); the Rigger holds the Visualizer, the Mender the Attuner (' + g.characters[rigId].offHand?.id + ', ' + g.characters[menId].offHand?.id + ')',
  g.run.state === 'map' && g.characters[rigId].offHand?.id === 'visualizer' && g.characters[menId].offHand?.id === 'attuner');

// ---------- C. the first fight ----------
const node = g.run.nodes.find((n) => n.depth === 1 && n.kind === 'fight') || g.run.nodes.find((n) => n.depth === 1);
await actH({ type: 'run/move', node: node.id }); await actG({ type: 'run/move', node: node.id });
// rules 1.87 items 7500, 7501: a fight node asks first; the host walks the squad in (a scout's line shown when one goes ahead, item 7512)
await h.waitForSelector('[data-phc-engage-screen]', { timeout: 60000 }).catch(() => {});
ok('the fight node asks first: the engage screen (run ' + (await G()).run.state + ')', (await G()).run.state === 'engage' && await h.locator('[data-phc-engage="walk"]').count() === 1);
if (process.env.PHC_SHOTS && await h.locator('[data-phc-scout]').count()) { const dir = fileURLToPath(new URL('../../../.check/ambush-033', import.meta.url)); mkdirSync(dir, { recursive: true }); await h.mouse.move(2, 2); await settle(h, 400); await h.screenshot({ path: dir + '/engage-scout.png' }); }
console.log('note the scout line: ' + ((await h.locator('[data-phc-scout]').textContent().catch(() => '')) || 'none'));
await h.locator('[data-phc-engage="walk"]').click();
await h.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 60000 }).catch(() => {});
await gu.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 60000 }).catch(() => {});
ok('the first fight begins', (await G()).phase === 'combat');
/** Play on (other turns ended by their owners) until this character's turn is up and its panel is live. */
async function upFor(charId) {
  for (let i = 0; i < 40; i++) {
    const cb = (await G()).combat, cur = cb && cb.units.find((u) => u.id === cb.order[cb.turn]);
    if (!cb || cb.over) return false;
    if (cur && cur.charId === charId) return true;
    if (cur && cur.side === 'pc') await (cur.charId === menId ? actG : actH)({ type: 'combat/end-turn', unitId: cur.id });
    await settle(h, 300);
  }
  return false;
}
const unitOf = async (charId) => (await G()).combat.units.find((u) => u.charId === charId);
// the two stand side by side on open ground (the test's set-up: the Bond's reach and a free tile are not what is checked)
ok('the Rigger is up', await upFor(rigId));
await dismissCut(h);
let ru = await unitOf(rigId);
const freeNear = async (k) => h.evaluate((k) => { const cb = window.__phc.getState().game.combat, [x0, y0] = k.split(',').map(Number);
  const taken = new Set(cb.units.filter((u) => !u.dead).map((u) => u.pos)), bad = new Set([...(cb.map.solid || []), ...(cb.map.cover || []), ...(cb.map.full || []), ...(cb.objects || []).map((o) => o.pos)]);
  for (let r = 1; r <= 3; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) { const kk = (x0 + dx) + ',' + (y0 + dy); if (x0 + dx < 0 || y0 + dy < 0 || x0 + dx >= cb.map.w || y0 + dy >= cb.map.h || taken.has(kk) || bad.has(kk)) continue; return kk; } return null; }, k);
const figOf = async () => (await G()).combat.units.find((u) => u.owned?.kind === 'figment' && !u.dead) || null;
async function pictureByHand(first) {
  await dismissCut(h);
  await h.waitForFunction(() => { const d = document.querySelector('.phc-cb-dock'); return !!d && !d.getAttribute('data-lock'); }, null, { timeout: 60000 }).catch(() => {});
  await h.locator('[role="tab"][data-tab="figments"]').click({ timeout: 30000 }); await settle(h, 300);
  if (first) ok('the FIGMENTS tab names no form still to choose', (await h.locator('[data-door-choice]').count()) === 0);
  await pickAction(h, /Picture/); await settle(h, 300);
  const chips = h.locator('.phc-cb-dock button:has(img[data-fig-chip])');
  const chipNames = (await chips.allTextContents()).map((t) => t.trim());
  if (first) ok('Picture offers the two learned forms (' + chipNames.join(', ') + ')', chipNames.length === 2 && forms.every((f) => chipNames.some((n) => n.toLowerCase().startsWith(f))));
  if ((await chips.first().getAttribute('aria-pressed')) !== 'true') await chips.first().click(); await settle(h, 200); // (a chip stays picked from the try before)
  const at = await freeNear((await unitOf(rigId)).pos);
  await tok(h, at).click({ force: true }); await settle(h, 300);
  const conf = h.locator('button[aria-keyshortcuts="Space"]:not([hidden])').first();
  const live = await liveSoon(conf); // (the dock may still be settling from the turn's banner: up to 5 s)
  ok('Picture: a form chosen and a tile clicked, Confirm is live (the dock: ' + ((await h.locator('.phc-cb-dock').first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 120) + ')', live);
  await h.screenshot({ path: OUT + 'doors-new-rigger-picture.png' });
  if (live) await conf.click(); await settle(h, 800);
}
await pictureByHand(true);
g = await G();
const fig = await figOf();
ok('Picture: a Figment stands (' + (fig ? fig.name + ' at ' + ref(fig.pos) : 'none; toast ' + JSON.stringify(await h.evaluate(() => window.__phc.getState().toast?.text || '')) + ' log ' + JSON.stringify(g.combat.log.slice(-2))) + ')', !!fig);
await h.screenshot({ path: OUT + 'doors-new-rigger-figment.png' });
// the Mender's turn: TEND, Bond, the Rigger's token, Confirm
ru = await unitOf(rigId);
await actH({ type: 'combat/end-turn', unitId: ru.id });
ok('the Mender is up', await upFor(menId));
const bondOf = async () => { const g2 = await G(), mu = g2.combat.units.find((u) => u.charId === menId), r2 = g2.combat.units.find((u) => u.charId === rigId); return (g2.combat.ties || []).find((t) => t.kind === 'bond' && t.from === mu.id && t.to === r2.id) || null; };
async function bondByHand() {
  await dismissCut(gu);
  await gu.waitForFunction(() => { const d = document.querySelector('.phc-cb-dock'); return !!d && !d.getAttribute('data-lock'); }, null, { timeout: 60000 }).catch(() => {});
  await gu.locator('#phc-tab-tend').click({ timeout: 30000 }); await settle(gu, 300);
  await pickAction(gu, /^\d*\s*Bond/); await settle(gu, 300);
  await tok(gu, (await unitOf(rigId)).pos).click({ force: true }); await settle(gu, 300);
  const conf = gu.locator('button[aria-keyshortcuts="Space"]:not([hidden])').first();
  const live = await liveSoon(conf); // (the dock may still be settling from the turn's banner: up to 5 s)
  ok('Bond: the Rigger clicked, Confirm is live (the dock: ' + ((await gu.locator('.phc-cb-dock').first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 120) + ')', live);
  await gu.screenshot({ path: OUT + 'doors-new-mender-bond.png' });
  if (live) await conf.click(); await settle(gu, 800);
}
await bondByHand();
g = await G();
ok('Bond on the Rigger holds (' + ((await bondOf()) ? 'tied' : 'none; toast ' + JSON.stringify(await gu.evaluate(() => window.__phc.getState().toast?.text || '')) + ' log ' + JSON.stringify(g.combat.log.slice(-2))) + ')', !!(await bondOf()));
await gu.screenshot({ path: OUT + 'doors-new-mender-bonded.png' });
ok('no page errors (' + [...h.errors, ...gu.errors].join(' | ').slice(0, 200) + ')', !h.errors.length && !gu.errors.length);
await h.context().close(); await gu.context().close();

// ---------- D. the hint for a Rigger who went on without choosing (the Proving Ground) ----------
{
  const p = await player(browser, 'pg');
  await p.setViewportSize({ width: 1280, height: 720 });
  const act = mkAct(p), GP = () => p.evaluate(() => window.__phc.getState().game);
  await p.goto(BASE);
  await click(p, 'PROVING GROUND', { timeout: 90000 });
  const nm = p.getByPlaceholder('Leon');
  await Promise.race([nm.waitFor({ timeout: 20000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 20000 }).catch(() => {})]);
  if (await nm.count()) { await nm.fill('Leon'); await click(p, /^Solo ›/); }
  await p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 30000 });
  const cid = Object.keys((await GP()).characters)[0];
  await act({ type: 'sandbox/skill', charId: cid, skill: 'visualization', points: 1 });
  await act({ type: 'sandbox/give', charId: cid, item: 'service_pistol', equip: true }); // (one hand free for the focus, as the camp's revolver leaves it)
  await act({ type: 'sandbox/give', charId: cid, item: 'visualizer', equip: true });
  await act({ type: 'sandbox/ai', on: false }); await act({ type: 'sandbox/auto', on: false });
  await act({ type: 'sandbox/fight' });
  await p.waitForFunction(() => { const cb = window.__phc.getState().game.combat; const u = cb && cb.units.find((x) => x.id === cb.order[cb.turn]); return u && u.side === 'pc'; }, null, { timeout: 30000 });
  await dismissCut(p);
  await p.waitForFunction(() => { const d = document.querySelector('.phc-cb-dock'); return !!d && !d.getAttribute('data-lock') && !!document.querySelector('[role="tablist"][aria-label="Actions"] [role="tab"]'); }, null, { timeout: 60000 }).catch(() => {});
  const tabs = (await p.locator('[role="tablist"][aria-label="Actions"] [role="tab"]').allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim());
  const g0 = await GP(), c0 = g0.characters[cid];
  ok('the Proving Ground: Visualization 1, the Visualizer in hand, the FIGMENTS tab (' + (c0.skills.visualization || 0) + ', ' + (c0.offHand?.id || c0.weapon) + '; tabs: ' + tabs.join(' | ') + ')', (await p.locator('[role="tab"][data-tab="figments"]').count()) > 0);
  await p.screenshot({ path: OUT + 'doors-new-pg-start.png' });
  await p.locator('[role="tab"][data-tab="figments"]').click({ timeout: 30000 }); await settle(p, 300);
  const line = ((await p.locator('[data-door-choice]').first().textContent().catch(() => '')) || '').trim();
  ok('no form learned: the FIGMENTS tab says what to choose and where ("' + line + '")', /^Figment form: 2 to choose \(out of a fight, on Level up\)$/.test(line));
  await pickAction(p, /Picture/); await settle(p, 300);
  const dock = (await p.locator('.phc-cb-dock').first().innerText().catch(() => '')) || '';
  await p.screenshot({ path: OUT + 'doors-new-rigger-no-form.png' });
  ok('Picture with no form says where forms come from, never a bare "Nothing to pick." (' + dock.replace(/\s+/g, ' ').slice(0, 160) + ')', /Nothing learned yet: 2 Figment forms to choose, out of a fight, on Level up\./.test(dock) && !/Nothing to pick/.test(dock));
  const cut = await p.evaluate(() => { const r = document.querySelector('[data-door-choice]')?.getBoundingClientRect(); return !r ? 'none' : r.right > innerWidth + 0.5 || r.bottom > innerHeight + 0.5 ? 'cut' : ''; });
  ok('at 1280 x 720 the tab\'s line is whole on screen (' + (cut || 'whole') + ')', cut === '');
  ok('no page errors (' + p.errors.join(' | ').slice(0, 200) + ')', !p.errors.length);
  await p.context().close();
}
await browser.close();
