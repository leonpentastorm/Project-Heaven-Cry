// Perks, traits and class moves in play (rules 1.3), in the Proving Ground and one story check:
//  · the tools' new Perks and Traits sections (sandbox/perk, sandbox/trait) give the Recruit Breaching Strike and Used
//    to the Pain; the PERKS tab shows Breaching Strike; it hits a drill unit, knocks it back a tile, and the log says so;
//  · a class from the tools (Fighter): the CLASS tab carries the emblem, the You card too, and Lunge (a class move) runs;
//  · a passive: Used to the Pain's AP line in the fight log after a drill unit's hit;
//  · weapon-granted actions: the gun shows its reload (Swap magazine…), the sabre shows none;
//  · the level-up screen's class panel (emblem, rank, the class attribute's progress, moves by rank);
//  · a story check in a room with the scripted Narrator: a trait's +1 is named in the dice table's roll math.
// Screenshots: e2e/shots/perks-*.png.
import { readFileSync } from 'fs';
import { chromium, player, click, BASE, OUT, pickAction, settle } from './lib.mjs';
const FIGHTER = JSON.parse(readFileSync(new URL('../../../data/classes.json', import.meta.url), 'utf8')).base.find((c) => c.id === 'fighter').name; // the class's display name, from the data (Classes 3.0 renamed it)
const browser = await chromium.launch();
const p = await player(browser, 'host', { campaigns: ['m813'] });
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const snap = (pg, n) => pg.screenshot({ path: OUT + 'perks-' + n + '.png' });
const G = (pg = p) => pg.evaluate(() => window.__phc.getState().game);
const act = (a, pg = p) => pg.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };
const xy = (k) => k.split(',').map(Number);
const dismissCut = async () => { for (let i = 0; i < 3; i++) { if (!(await p.locator('[data-phc-cutin]').count())) return; await p.mouse.click(1430, 990); await settle(p, 380); } };
const me = async () => { const g = await G(); return g.combat.units.find((u) => u.side === 'pc'); };
const log = async () => ((await G()).combat?.log || []).map((l) => (typeof l === 'string' ? l : l.text || '')).join('\n');
const confirm = async () => { const b = p.getByRole('button', { name: /^Confirm/ }).first(); await b.waitFor({ timeout: 20000 }).catch(() => {}); if (!(await b.isEnabled().catch(() => false))) return false; await b.click(); return true; };
const tok = (k) => p.locator('button.phc-tok[aria-label^="' + ref(k) + ' ·"]').first();
/** Every action button across the action tabs (names only). */
async function allActions() {
  const names = [], tabs = p.locator('[role="tablist"][aria-label="Actions"]').first().locator('[role="tab"]'), n = await tabs.count();
  for (let i = 0; i < n; i++) { await tabs.nth(i).click(); await settle(p, 120); names.push(...(await p.locator('[role="tabpanel"] button').allTextContents())); }
  return names.map((t) => t.replace(/\s+/g, ' ').trim());
}
/** Back to my turn with full AP (enemy AI off: ending the turn hands it straight back). */
async function newTurn() {
  await dismissCut();
  await p.getByRole('button', { name: 'End turn', exact: true }).click();
  await p.waitForFunction(() => { const cb = window.__phc.getState().game.combat; const u = cb.units.find((x) => x.id === cb.order[cb.turn]); return cb.over || (u && u.side === 'pc' && u.ap >= 5); }, null, { timeout: 30000 });
  await p.waitForSelector('[data-phc-cutin]', { timeout: 1800 }).catch(() => {}); await dismissCut();
}
/** One drill unit (minion, fists) on a free tile east of me with two free tiles behind it, plus one far off. */
async function setField() {
  await act({ type: 'sandbox/clear' });
  const u = await me(), [x, y] = xy(u.pos);
  const far = x < 8 ? '15,11' : '0,11'; await act({ type: 'sandbox/spawn', tier: 'minion', weapon: 'fists', at: ref(far) });
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const at = (x + dx) + ',' + (y + dy), n0 = (await G()).combat.units.length;
    if (await act({ type: 'sandbox/spawn', tier: 'soldier', weapon: 'fists', at: ref(at) })) continue;
    if ((await G()).combat.units.length > n0) return { at, dir: [dx, dy] };
  }
  return null;
}

// ---------- 1. The Proving Ground, gearing up: perks and a trait from the tools ----------
await p.goto(BASE);
await click(p, 'PROVING GROUND');
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 20000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 20000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
await p.mouse.move(1430, 990);
await p.waitForFunction(() => window.__phc.getState().game?.sandbox?.state === 'ready', null, { timeout: 30000 });
let g = await G();
const cid = Object.keys(g.characters)[0];
const drawer = p.locator('aside[aria-label="Proving Ground tools"]');
if (!(await drawer.count())) await p.getByRole('button', { name: 'Open the Proving Ground tools' }).click();
await drawer.waitFor();
await drawer.getByRole('tab', { name: 'Squad' }).click();
await drawer.getByLabel('Perk', { exact: true }).selectOption('breaching_strike');
await drawer.locator('button[data-sb-perk="I"]').click();
await drawer.getByLabel('Trait', { exact: true }).selectOption('pain_eater');
await drawer.locator('button[data-sb-trait="give"]').click();
await settle(p, 250);
g = await G();
ok('the tools give Breaching Strike I: ' + JSON.stringify(g.characters[cid].perks), g.characters[cid].perks.some((x) => x.id === 'breaching_strike' && x.tier === 'I'));
ok('the tools give a trait: ' + g.characters[cid].traits.join(', '), g.characters[cid].traits.includes('pain_eater'));
ok('the held perk shows in the tools with a take-away button', (await drawer.getByRole('button', { name: /^Breaching Strike I ✕/ }).count()) > 0);
await snap(p, '01-tools');
await act({ type: 'sandbox/perk', charId: cid, perk: 'no_such_perk' });
const toast = await p.evaluate(() => { const t = window.__phc.getState().toast; return t ? (t.text || String(t)) : ''; });
ok('a perk that does not exist is refused: ' + toast, /No such perk/.test(toast));
await act({ type: 'sandbox/perk', charId: cid, perk: 'used_to_the_pain', tier: 'I' });
await act({ type: 'sandbox/perk', charId: cid, perk: 'litany', tier: 'I' });
await act({ type: 'sandbox/class', charId: cid, classId: 'fighter', rank: 1 });
await act({ type: 'sandbox/ai', on: false });
await act({ type: 'sandbox/auto', on: false });
g = await G();
ok('Fighter rank I from the tools: ' + g.characters[cid].classId, g.characters[cid].classId === 'fighter');
await drawer.getByRole('button', { name: 'Close the tools' }).click().catch(() => {});

// ---------- 2. The fight: PERKS and CLASS tabs, the emblem, weapon-granted reload ----------
await p.getByRole('button', { name: /^⚔ Start the fight/ }).first().click().catch(async () => { await act({ type: 'sandbox/fight' }); });
await p.waitForFunction(() => window.__phc.getState().game?.phase === 'combat', null, { timeout: 30000 });
await p.waitForSelector('text=YOUR TURN', { timeout: 30000 });
await p.waitForSelector('[data-phc-cutin]', { timeout: 20000 }).catch(() => {}); await dismissCut();
const field = await setField();
ok('a drill unit stands next to the Recruit at ' + (field && ref(field.at)), !!field);
const tabNames = await p.locator('[role="tablist"][aria-label="Actions"]').first().locator('[role="tab"]').allTextContents();
ok('the action tabs include PERKS and CLASS: ' + tabNames.map((t) => t.replace(/\s+/g, ' ').trim()).join(' | '), tabNames.some((t) => /PERK/i.test(t)) && tabNames.some((t) => /FIGHTER|CLASS/i.test(t)));
ok('the CLASS tab carries the class emblem', (await p.locator('#phc-tab-class img').count()) > 0);
ok('the You card shows the emblem beside the class', (await p.locator('.phc-me-class img.phc-class-emblem, .phc-me-class img').count()) > 0);
let names = await allActions();
const RELOAD = /^(Swap magazine|Speedloader|Swap drum|Feed belt|Load rounds|Nock an arrow|Load a bolt|Reload)/;
const gun = (await me()).weapon;
ok('the gun (' + gun + ') grants its reload: ' + names.filter((n) => RELOAD.test(n)).join(', '), names.some((n) => RELOAD.test(n)));
await p.locator('#phc-tab-perks').click().catch(() => {});
await settle(p, 150);
ok('the PERKS tab lists Litany to use, and the passive Breaching Strike on the Always on shelf', (await p.locator('[role="tabpanel"]').getByRole('button', { name: /Litany/ }).count()) > 0 && /Breaching Strike/.test(await p.locator('[data-shelf="always"]').innerText().catch(() => '')));
await snap(p, '02-perks-tab');
// a sabre in hand: no reload any more
await act({ type: 'sandbox/give', charId: cid, item: 'sabre', equip: true });
await act({ type: 'sandbox/skill', charId: cid, skill: 'athletics', points: 7 }); // the sabre's skill: hits land often enough to test
await settle(p, 300);
names = await allActions();
ok('with the sabre (' + (await me()).weapon + ') no reload action shows: ' + (names.filter((n) => RELOAD.test(n)).join(', ') || 'none'), (await me()).weapon === 'sabre' && !names.some((n) => RELOAD.test(n)));

// ---------- 3. A perk action from the PERKS tab (Litany); Breaching Strike is passive since rules 1.13 ----------
{
  await dismissCut();
  const u0 = await me();
  await pickAction(p, /Litany/);
  await settle(p, 150);
  if (!(await confirm())) { await act({ type: 'combat/perk', unitId: u0.id, id: 'litany' }); }
  await settle(p, 500);
  ok('Litany costs its 2 AP (' + u0.ap + ' → ' + (await me()).ap + ')', (await me()).ap === u0.ap - 2);
  ok('the fight log names the Litany', /Litany/.test(await log()));
  // a plain attack with the sabre: the only thing that builds Momentum
  const gg = await G(), t = gg.combat.units.find((u) => u.side === 'foe' && !u.dead && u.pos === field.at);
  if (t) await act({ type: 'combat/attack', unitId: u0.id, targetId: t.id });
  await settle(p, 400);
}
await settle(p, 300); await snap(p, '03-litany');

// ---------- 4. A class move: Lunge (Fighter I), with the Momentum the strike earned ----------
g = await G();
let mu = await me();
const mom = (u) => (u.res && u.res.momentum) || 0;
if (mom(mu) < 1 || mu.ap < 3) { await newTurn(); mu = await me(); }
ok('Momentum from the melee hit: ' + mom(mu), mom(mu) >= 1);
const foe = (await G()).combat.units.find((u) => u.side === 'foe' && !u.dead && u.pos !== mu.pos && Math.max(Math.abs(xy(u.pos)[0] - xy(mu.pos)[0]), Math.abs(xy(u.pos)[1] - xy(mu.pos)[1])) <= 3);
let lunged = false;
if (foe) {
  await dismissCut();
  await pickAction(p, /^Lunge/).catch(() => {});
  await settle(p, 150);
  await tok(foe.pos).click().catch(() => {});
  await settle(p, 150);
  if (!(await confirm())) await act({ type: 'combat/perk', unitId: mu.id, id: 'class:fighter.lunge', actionId: 'lunge', targetId: foe.id });
  await settle(p, 500);
  const mu2 = await me();
  lunged = mu2.pos !== mu.pos || mom(mu2) < mom(mu) || mu2.ap < mu.ap;
  console.log('  lunge at ' + ref(foe.pos) + ' from ' + ref(mu.pos) + ' → ' + ref(mu2.pos) + ', Momentum ' + mom(mu) + ' → ' + mom(mu2) + ', AP ' + mu.ap + ' → ' + mu2.ap);
}
ok('Lunge (class move) spent its Momentum and struck', lunged);
await snap(p, '04-lunge');

// ---------- 5. A passive: Used to the Pain after a drill unit's hit ----------
// Physical 2.0: a melee fighter answers misses (Riposte), so a lone drill unit can fall before it lands a hit and the
// wave ends. A champion next to the Recruit lasts the six rounds and hits.
{ const gg = await G(), m = gg.combat.units.find((u) => u.side === 'pc'), [mx, my] = xy(m.pos);
  for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) { const k = (mx + dx) + ',' + (my + dy); const n0 = gg.combat.units.length;
    if (mx + dx < 0 || my + dy < 0 || gg.combat.units.some((u) => !u.dead && u.pos === k) || gg.combat.map.solid.includes(k)) continue;
    await act({ type: 'sandbox/spawn', tier: 'boss', weapon: 'fists', at: ref(k) }); await settle(p, 300); if ((await G()).combat.units.length > n0) break; } }
await act({ type: 'sandbox/ai', on: true });
let pain = false;
for (let i = 0; i < 6 && !pain; i++) {
  if ((await G()).combat.over) break;
  await dismissCut();
  await p.getByRole('button', { name: 'End turn', exact: true }).click().catch(() => {});
  await p.waitForFunction(() => { const cb = window.__phc.getState().game.combat; const u = cb.units.find((x) => x.id === cb.order[cb.turn]); return cb.over || (u && u.side === 'pc'); }, null, { timeout: 20000 }).catch(() => {});
  await settle(p, 400);
  pain = /Used to the Pain/.test(await log());
  if (!pain) { const u = await me(); if (u.hp < u.maxHp * 0.5) await act({ type: 'sandbox/refill', charId: cid }); }
}
const painLine = (await log()).split('\n').filter((l) => /Used to the Pain/.test(l)).slice(-1)[0] || '';
ok('Used to the Pain shows in the log: ' + painLine, pain);
await act({ type: 'sandbox/ai', on: false });
await snap(p, '05-used-to-the-pain');

// ---------- 6. The level-up screen's class panel ----------
await act({ type: 'sandbox/stop' }).catch(() => {});
await p.waitForFunction(() => window.__phc.getState().game?.phase === 'story', null, { timeout: 20000 }).catch(() => {});
await act({ type: 'sandbox/level', charId: cid, level: 5 });
await p.evaluate(() => window.__phc.getState().screen !== 'main' && null);
if ((await p.evaluate(() => window.__phc.getState().screen)) !== 'main') await p.getByRole('button', { name: /Gear up first|Back to the map/ }).first().click().catch(() => {});
await settle(p, 400);
const lvl = p.locator('button', { hasText: /Level up|Earn your class/ }).first();
await lvl.waitFor({ timeout: 20000 }).catch(() => {});
if (await lvl.count()) await lvl.click();
await p.waitForSelector('.phc-lu-class', { timeout: 20000 }).catch(() => {});
ok('the level-up screen shows the class panel', (await p.locator('.phc-lu-class').count()) > 0);
ok('class name, rank and emblem: ' + ((await p.locator('.phc-lu-class-name').first().textContent().catch(() => '')) || '').trim() + ' ' + ((await p.locator('.phc-lu-rank').first().textContent().catch(() => '')) || '').trim(),
  new RegExp(FIGHTER, 'i').test(await p.locator('.phc-lu-class-name').first().textContent().catch(() => '')) && (await p.locator('.phc-lu-class img.phc-lu-emblem, .phc-lu-class img').count()) > 0);
ok('the Fighter moves are listed: ' + (await p.locator('.phc-lu-move').count()), (await p.locator('.phc-lu-move[data-move^="class:fighter."]').count()) >= 3);
await settle(p, 300); await snap(p, '06-levelup-class');
const sbErrors = [...p.errors];

// ---------- 7. A story check: the trait's +1 is named in the roll math ----------
const q = await player(browser, 'story', { campaigns: ['m813'] });
await q.goto(BASE);
await click(q, 'NEW GAME', { exact: true });
await q.getByPlaceholder('Leon').fill('Leon');
await click(q, 'Open a room ›');
await q.waitForSelector('text=The squad', { timeout: 30000 });
// The field medic archetype (its best skill is Camaraderie, which the scripted Narrator checks) with Oil in My Soul (+1).
const ARCH = JSON.parse(readFileSync(new URL('../../../data/archetypes.json', import.meta.url), 'utf8'));
const fm = (ARCH.items || ARCH).find((x) => x.id === 'field_medic');
const sheet = { name: 'Oil Test', portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: ['oil_in_my_soul'], skills: { ...fm.preset }, attrs: { ...fm.attributes }, cores: { ...fm.cores }, identity: {} };
const addErr = await act({ type: 'char/add', sheet }, q);
ok('char/add with Oil in My Soul: ' + (addErr || 'accepted'), !addErr);
await settle(q, 500);
let qg = await G(q);
let oc = Object.values(qg.characters)[0];
ok('a character with Oil in My Soul is in the room: ' + (oc && oc.name) + ' · ' + (oc && oc.traits.join(', ')), !!oc && oc.traits.includes('oil_in_my_soul'));
await q.evaluate(() => window.__phc.setNarrator({ scripted: true }));
await click(q, 'Start session');
await q.waitForSelector('text=The rear pad', { timeout: 30000 });
await q.getByLabel('What do you do?').fill('I ask Keel nicely, one medic to another.'); await click(q, 'Send', { exact: true }); await click(q, 'End turn', { exact: true });
await q.waitForSelector('text=CLICK TO ROLL', { timeout: 30000 });
await settle(q, 600);
if (!(await q.locator('[aria-label="Dice table"]').count())) await q.locator('button', { hasText: 'Get Keel to lower the ramp.' }).click();
await click(q, /Throw/);
await q.waitForSelector('text=/SUCCESS|FAILURE|COMPLICATION/', { timeout: 30000 });
await settle(q, 600);
qg = await G(q);
const ck = qg.checks.find((k) => k.roll) || qg.checks[0];
ok('the check is on ' + (ck && ck.skills.join('+')) + ' with item mods ' + JSON.stringify(ck && ck.mods), !!ck && (ck.mods || []).some((m) => /Oil in My Soul/.test(m.label)));
const math = await q.locator('text=/incl\\. .*Oil in My Soul/').first().textContent().catch(() => '');
ok('the roll math names the trait: ' + (math || '').trim(), /Oil in My Soul/.test(math || ''));
const story = qg.story.entries.filter((e) => e.kind === 'check').map((e) => e.head).join(' | ');
ok('the story line names it too: ' + story, /Oil in My Soul/.test(story));
await settle(q, 1800); await snap(q, '07-story-check');

ok('no page errors: ' + [...sbErrors, ...q.errors].join(' | '), ![...sbErrors, ...q.errors].length);
await browser.close();
