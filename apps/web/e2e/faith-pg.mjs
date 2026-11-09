// The Proving Ground's FAITH tools (rules 1.6; sandbox/faith): make the fighter Faithful to Mother Ember with Faith 7
// and Devotion 7, start a fight, set a vow from the tools, pray the Miracle (the full-screen answer, skippable), then
// reset the limits; then an Atheist with knowledge pieces prays a learned Hymn by dice. Then Old Overcast: Witnessed,
// a Hymn at its gate, an overreach, an intervention (a kill brings 20 Storm on the next enemy), a vow kept to the end
// of the fight and one broken; an Atheist's Whisper by dice; a conversion to an Open patron, then to a Jealous one.
import { chromium, click, BASE } from './lib.mjs';
const browser = await chromium.launch();
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const SHOTS = process.env.SHOTS;
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { localStorage.setItem('phc.voice', JSON.stringify({ auto: false })); localStorage.setItem('phc.tips', '["*"]'); sessionStorage.setItem('phc.pressedAnyKey', '1'); } catch { /* */ } });
const p = await ctx.newPage();
const errors = []; p.on('pageerror', (e) => errors.push(e.message));
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const me = () => p.evaluate(() => Object.values(window.__phc.getState().game.characters)[0]);

await p.goto(BASE);
await click(p, 'PROVING GROUND', { timeout: 90000 });
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 8000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 8000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, /^Solo ›/); }
await p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 15000 });
const drawer = p.locator('aside[aria-label="Proving Ground tools"]');
if (!(await drawer.count())) await p.getByRole('button', { name: 'Open the Proving Ground tools' }).click();
await drawer.waitFor();
await drawer.getByRole('tab', { name: 'Faith' }).click();
await drawer.locator('[data-sb-belief="faithful"]').click(); await p.waitForTimeout(200);
await drawer.locator('[data-sb-patron="mother_ember"]').click(); await p.waitForTimeout(200);
for (let i = 0; i < 7; i++) { const r = drawer.getByRole('button', { name: 'Raise Faith' }); if (await r.isEnabled()) await r.click(); await p.waitForTimeout(60); }
await drawer.getByRole('button', { name: '10', exact: true }).click(); await p.waitForTimeout(200);
let c = await me();
ok('the tools make a Faithful of Mother Ember, Faith ' + (c.skills.faith || 0) + ', Devotion ' + c.devotion, c.belief?.kind === 'faithful' && c.belief.patron === 'mother_ember' && (c.skills.faith || 0) >= 7 && c.devotion === 10);
if (SHOTS) await p.screenshot({ path: SHOTS + '/faith-pg-tools.png' });
await act({ type: 'sandbox/ai', on: false });
await act({ type: 'sandbox/fight' });
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 15000 });
await p.waitForFunction(() => { const cb = window.__phc.getState().game.combat; const u = cb && cb.units.find((x) => x.id === cb.order[cb.turn]); return u && u.side === 'pc'; }, null, { timeout: 20000 });
await p.waitForTimeout(800); if (await p.locator('[data-phc-cutin]').count()) { await p.keyboard.press('Escape'); await p.waitForTimeout(400); }
if (!(await drawer.count())) await p.getByRole('button', { name: 'Open the Proving Ground tools' }).click();
await drawer.getByRole('tab', { name: 'Faith' }).click();
await drawer.locator('[data-sb-vow="stand"]').click(); await p.waitForTimeout(300);
const vow = await p.evaluate(() => { const cb = window.__phc.getState().game.combat; return cb.units.find((x) => x.charId).vow; });
ok('a vow set from the tools is on the unit (' + JSON.stringify(vow) + ')', vow?.id === 'stand');
await drawer.getByRole('button', { name: 'Close the tools' }).click().catch(() => {});
await p.locator('[role="tab"][data-tab="faith"]').click();
const mir = p.locator('[role="tabpanel"] [data-act^="pr:miracle:"]');
ok('the Miracle is in the FAITH tab and ready', (await mir.count()) === 1);
await mir.click(); await p.waitForTimeout(300);
const t0 = Date.now();
await p.getByRole('button', { name: 'Confirm', exact: true }).first().click();
const shown = await p.locator('[data-phc-miracle]').waitFor({ timeout: 3000 }).then(() => true, () => false);
ok('the Miracle answers on the whole screen', shown);
if (shown && SHOTS) { await p.waitForTimeout(900); await p.screenshot({ path: SHOTS + '/faith-miracle.png' }); }
await p.locator('[data-phc-miracle]').waitFor({ state: 'detached', timeout: 4000 }).catch(() => {});
ok('and clears within 2.5 s (' + (Date.now() - t0) + ' ms)', Date.now() - t0 < 3200 && (await p.locator('[data-phc-miracle]').count()) === 0);
c = await me();
ok('the Miracle spends the Devotion and is once a session', /One Miracle a session|Miracle needs Devotion/.test(await p.locator('[role="tabpanel"]').textContent() + (await mir.getAttribute('title') || '')) || (c.devotion ?? 10) < 10);
if (!(await drawer.count())) await p.getByRole('button', { name: 'Open the Proving Ground tools' }).click();
await drawer.getByRole('tab', { name: 'Faith' }).click();
await drawer.locator('[data-sb-faith-reset]').click(); await p.waitForTimeout(300);
c = await me();
ok('Reset the limits clears the Miracle\'s session mark', c.miracleSession == null);
// An Atheist with two pieces of Mother Ember: her first two Hymns, by dice.
await drawer.locator('[data-sb-belief="atheist"]').click(); await p.waitForTimeout(200);
await drawer.getByRole('button', { name: 'Raise Mother Ember pieces' }).click(); await p.waitForTimeout(150);
await drawer.getByRole('button', { name: 'Raise Mother Ember pieces' }).click(); await p.waitForTimeout(200);
c = await me();
ok('an Atheist with 2 pieces learns 2 Hymns (' + (c.hymns || []).join(', ') + ')', c.belief?.kind === 'atheist' && (c.hymns || []).length === 2);
await drawer.getByRole('button', { name: 'Close the tools' }).click().catch(() => {});
await p.locator('[role="tab"][data-tab="faith"]').click();
const hy = await p.locator('[role="tabpanel"] [data-act^="pr:hymn:"]').allTextContents();
ok('the FAITH tab shows them by dice (' + hy.join(' / ').slice(0, 80) + ')', hy.length === 2 && hy.every((t) => /BY DICE|TN \d+/.test(t)));

// ---------- Old Overcast: Witnessed, Hymns at the gate and above it, an intervention, vows ----------
const cid = c.id, G = () => p.evaluate(() => window.__phc.getState().game);
const myU = () => p.evaluate(() => { const cb = window.__phc.getState().game.combat; return cb && cb.units.find((x) => x.charId); });
const myTurn = () => p.waitForFunction(() => { const cb = window.__phc.getState().game.combat; const u = cb && !cb.over && cb.units.find((x) => x.id === cb.order[cb.turn]); return u && u.side === 'pc'; }, null, { timeout: 20000 });
const calm = async () => { await p.waitForTimeout(700); if (await p.locator('[data-phc-cutin]').count()) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } };
const logHas = async (re) => re.test((await G()).combat.log.join('\n'));
await act({ type: 'sandbox/stop' });
await p.waitForFunction(() => window.__phc.getState().game.phase === 'story', null, { timeout: 10000 });
await act({ type: 'sandbox/faith', charId: cid, belief: 'faithful', patron: 'old_overcast', faith: 7, devotion: 5, reset: true });
await act({ type: 'sandbox/give', charId: cid, item: 'hellraiser_lmg', equip: true });
await act({ type: 'sandbox/fight' });
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 15000 });
await myTurn(); await calm();
let u = await myU();
ok('not Witnessed yet: it comes with your patron\'s first Hymn', !(u.conds && u.conds.witnessed));
await p.locator('[data-phc-vow-prompt] [data-vow="mercy"]').click(); await p.waitForTimeout(300);
ok('Mercy sworn from the prompt', (await myU()).vow?.id === 'mercy');
// A Hymn at its gate (Thunderclap, Hymn I, Devotion 5): SURE, aimed at a tile on the grid.
await p.locator('[role="tab"][data-tab="faith"]').click();
await p.locator('[role="tabpanel"] [data-act="pr:hymn:old_overcast.thunderclap"]').click(); await p.waitForTimeout(250);
ok('Thunderclap at its gate reads SURE', /HYMN · Thunderclap · 3 AP · SURE/.test(await p.locator('aside').first().textContent()));
const g1 = await G(), mapW = g1.combat.map.w;
const foes1 = g1.combat.units.filter((x) => x.side === 'foe' && !x.dead), meU = g1.combat.units.find((x) => x.charId);
// Aim at our own tile (always in sight; the far foes may be in fog).
const [ux, uy] = meU.pos.split(',').map(Number), foe = { pos: meU.pos }; void ux; void uy;
const tileBtn = (k) => { const [x, y] = k.split(',').map(Number); return p.locator('.phc-grid button.phc-tok').nth(y * mapW + x); };
await tileBtn(foe.pos).click(); await p.waitForTimeout(250);
const n1 = (await G()).combat.log.length;
await p.getByRole('button', { name: 'Confirm', exact: true }).first().click(); await p.waitForTimeout(600);
ok('Thunderclap is prayed by standing: 3 AP, in the log', (await G()).combat.log.length > n1 && (await myU()).ap <= 3);
ok('Faith 7 and your patron\'s Hymn: Witnessed', !!(await myU()).conds?.witnessed);
ok('the resource rows say WITNESSED', /WITNESSED/.test(await p.locator('aside').first().textContent()));
if (SHOTS) await p.screenshot({ path: SHOTS + '/faith-hymn.png' });
// An overreach: Gather the Clouds (Hymn III, gate 7) at Devotion 5: TN 16; the limits reset so the cooldown allows it.
await act({ type: 'sandbox/faith', charId: cid, reset: true });
await p.locator('[role="tabpanel"] [data-act="pr:hymn:old_overcast.gather_the_clouds"]').click(); await p.waitForTimeout(250);
ok('Gather the Clouds is an overreach (TN 16, a miss costs 3 Devotion XP)', /OVERREACH · TN 16/.test(await p.locator('aside').first().textContent()) && /a miss costs 3 Devotion XP/.test(await p.locator('aside').first().textContent()));
const c0 = (await G()).characters[cid], dv0 = c0.devotion, xp0 = c0.devotionXp, n2 = (await G()).combat.log.length;
ok('the tools\' Devotion 5 is the level-5 threshold (' + xp0 + ' XP)', xp0 === 102);
await p.getByRole('button', { name: 'Confirm', exact: true }).first().click(); await p.waitForTimeout(600);
const c1 = (await G()).characters[cid], dv1 = c1.devotion, xp1 = c1.devotionXp, lg2 = (await G()).combat.log.slice(n2).join(' | ');
ok('the overreach rolls: answered, or missed for −3 Devotion XP (' + dv0 + ' · ' + xp0 + ' XP → ' + dv1 + ' · ' + xp1 + ' XP)', (await G()).combat.log.length > n2 && (xp1 === xp0 || (xp1 === xp0 - 3 && dv1 === dv0 - 1)));
if (xp1 < xp0) ok('a miss below the threshold drops the level, and the log says so (' + lg2.slice(0, 120) + ')', /−3 Devotion XP \(a failed overreach\): DEVOTION 4/.test(lg2));
// The intervention and the kept vow: shoot (and pray) until a foe dies; Old Overcast answers the kill once a fight.
// The wave's units are far off: clear the field and set two minions beside us.
await act({ type: 'sandbox/clear' });
{ const gq = await G(), mu = gq.combat.units.find((x) => x.charId), [qx, qy] = mu.pos.split(',').map(Number), M = gq.combat.map;
  const free = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1], [2, 0], [0, 2], [-2, 0], [0, -2]].map(([dx, dy]) => [qx + dx, qy + dy])
    .filter(([x, y]) => x >= 0 && y >= 0 && x < M.w && y < M.h && !M.solid.includes(x + ',' + y) && !(M.cover || []).includes(x + ',' + y) && !(M.full || []).includes(x + ',' + y)).slice(0, 2);
  for (const [x, y] of free) console.log('note spawn at ' + String.fromCharCode(65 + x) + (y + 1) + ': ' + (await act({ type: 'sandbox/spawn', tier: 'minion', weapon: 'fists', at: String.fromCharCode(65 + x) + (y + 1) }) || 'ok')); }
for (let i = 0; i < 14 && !(await logHas(/Old Overcast intervenes/)); i++) {
  await myTurn().catch(() => {}); const gg = await G(); if (!gg.combat || gg.combat.over) break;
  const me2 = gg.combat.units.find((x) => x.charId), t = gg.combat.units.filter((x) => x.side === 'foe' && !x.dead && !x.downed).sort((a, b) => a.hp - b.hp)[0]; if (!t) break;
  await act({ type: 'sandbox/faith', charId: cid, reset: true });
  await act({ type: 'faith/pray', unitId: me2.id, kind: 'hymn', id: 'old_overcast.lightning_rod', targetId: t.id });
  for (let k = 0; k < 3; k++) { const e = await act({ type: 'combat/attack', unitId: me2.id, targetId: t.id, mode: 'shot' }); if (e) break; }
  const g3 = await G(); if (g3.combat && !g3.combat.over && g3.combat.order[g3.combat.turn] === me2.id) await act({ type: 'combat/end-turn', unitId: me2.id });
  await p.waitForTimeout(400);
}
ok('a kill while Witnessed: Old Overcast intervenes (20 Storm to the nearest other enemy)', await logHas(/Old Overcast intervenes/));
// Finish them: the fight ends with Mercy kept (+3 Devotion XP).
const dvK = (await G()).characters[cid].devotion;
for (let i = 0; i < 14; i++) {
  const gg = await G(); if (!gg.combat || gg.combat.over || !gg.combat.units.some((x) => x.side === 'foe' && !x.dead && !x.downed)) break;
  await myTurn().catch(() => {}); const g5 = await G(); if (!g5.combat || g5.combat.over) break;
  const me5 = g5.combat.units.find((x) => x.charId), t = g5.combat.units.filter((x) => x.side === 'foe' && !x.dead && !x.downed)[0]; if (!t) break;
  for (let k = 0; k < 3; k++) { const e = await act({ type: 'combat/attack', unitId: me5.id, targetId: t.id, mode: 'shot' }); if (e) break; }
  const g6 = await G(); if (g6.combat && !g6.combat.over && g6.combat.order[g6.combat.turn] === me5.id) await act({ type: 'combat/end-turn', unitId: me5.id });
  await p.waitForTimeout(400);
}
await p.waitForTimeout(800);
const kept = [...((await G()).combat?.log || []), ...(await G()).story.entries.map((e) => (e.head || '') + ' ' + e.text)].filter((t) => /kept|vow/i.test(t)).slice(-3).join(' | ');
ok('the fight won with Mercy unbroken: the vow is kept (' + kept.slice(0, 140) + '; Devotion ' + dvK + ' → ' + (await G()).characters[cid].devotion + ')', /kept/i.test(kept));
const cards = await p.locator('[data-phc-patron-line]').count();
console.log('note patron line cards in the combat log: ' + cards);
if (SHOTS) await p.screenshot({ path: SHOTS + '/faith-intervention.png' });
await act({ type: 'sandbox/clear' }); await p.waitForTimeout(300);
await act({ type: 'sandbox/stop' }); await p.waitForTimeout(800);
// A vow broken: Stand, then end the turn farther from the nearest enemy.
await act({ type: 'sandbox/fight' });
await p.waitForFunction(() => window.__phc.getState().screen === 'combat' && !window.__phc.getState().game.combat.over, null, { timeout: 15000 });
await myTurn(); await calm();
await p.locator('[data-phc-vow-prompt] [data-vow="stand"]').click(); await p.waitForTimeout(300);
// Step toward them this turn (no break), then back the next: the turn ends farther than it began.
const step = async (dx) => { const gq = await G(), mu = gq.combat.units.find((x) => x.charId), [x, y] = mu.pos.split(',').map(Number), to = (x + dx) + ',' + y;
  const e = await act({ type: 'combat/move', unitId: mu.id, to, how: 'move' }); await act({ type: 'combat/end-turn', unitId: mu.id }); await p.waitForTimeout(400); return e; };
const e41 = await step(1);
ok('a step toward the enemy keeps Stand (' + (e41 || 'moved') + ')', (await myU()).vow?.state === 'sworn');
await myTurn(); await calm();
const e42 = await step(-1);
ok('a step back the next turn breaks it (' + (e42 || '') + JSON.stringify((await G()).combat?.units.find((x) => x.charId)?.vow) + ')', (await G()).combat?.units.find((x) => x.charId)?.vow?.state === 'broken');
// An Atheist's Whisper by dice.
await myTurn().catch(() => {}); await calm();
await act({ type: 'sandbox/faith', charId: cid, belief: 'atheist', faith: 7, reset: true }); await p.waitForTimeout(300);
await p.locator('[role="tab"][data-tab="faith"]').click();
await p.locator('[role="tabpanel"] [data-act="pr:whisper:guidance"]').click(); await p.waitForTimeout(250);
ok('an Atheist\'s Whisper is by dice (TN 12)', /WHISPER · Guidance · 1 AP · TN 12/.test(await p.locator('aside').first().textContent()));
const n5 = (await G()).combat.log.length;
await p.getByRole('button', { name: 'Confirm', exact: true }).first().click(); await p.waitForTimeout(600);
ok('and it rolls: ' + (await G()).combat.log.slice(n5).join(' | ').slice(0, 90), /d20/.test((await G()).combat.log.slice(n5).join(' ')));
// Conversion (the Narrator's pact): an Atheist with 2 pieces of Mother Ember swears to the Quartermaster (Open: the
// Hymns stay, by dice), then to Holy Father Nerukhan (Jealous: the other Hymns go).
await act({ type: 'sandbox/stop' }); await p.waitForTimeout(500);
await act({ type: 'sandbox/faith', charId: cid, belief: 'atheist', pieces: { mother_ember: 2 } });
const e1 = await act({ type: 'faith/pact', charId: cid, patron: 'the_quartermaster' }); await p.waitForTimeout(200);
let cc = (await G()).characters[cid];
ok('a pact with an Open patron keeps the learned Hymns (' + (e1 || (cc.belief?.patron + ', Hymns ' + (cc.hymns || []).join(', '))) + ')', cc.belief?.kind === 'faithful' && cc.belief.patron === 'the_quartermaster' && (cc.hymns || []).length === 2);
const e2 = await act({ type: 'faith/pact', charId: cid, patron: 'nerukhan' }); await p.waitForTimeout(200);
cc = (await G()).characters[cid];
ok('a pact with a Jealous patron ends the others\' Hymns (' + (e2 || (cc.belief?.patron + ', Hymns ' + (cc.hymns || []).join(', '))) + ')', cc.belief?.patron === 'nerukhan' && !(cc.hymns || []).length);
const pactLines = (await G()).story.entries.filter((e) => /^PACT/.test(e.head || '')).length;
ok('the story says so (PACT entries: ' + pactLines + ')', pactLines >= 2);
// ---------- leaving a patron (rules 1.6.1): a switch from a Jealous patron leaves a grudge; apostasy has the cooldown ----------
const openFaithTab = async () => { await drawer.getByRole('button', { name: 'Close the tools' }).click({ timeout: 1500 }).catch(() => {}); await p.getByRole('tab', { name: 'FAITH', exact: true }).first().click(); const fp = p.locator('[data-phc-faith-panel]'); await fp.waitFor({ timeout: 5000 }); return fp; };
const e3 = await act({ type: 'faith/pact', charId: cid, patron: 'mother_ember' }); await p.waitForTimeout(300);
cc = (await G()).characters[cid];
ok('leaving Nerukhan (Jealous) for Mother Ember: no cooldown, and his grudge (' + (e3 || JSON.stringify(cc.grudge || null).slice(0, 90)) + ')', cc.belief?.patron === 'mother_ember' && cc.grudge?.patron === 'nerukhan' && !cc.faithLeft);
const fp = await openFaithTab(); await p.waitForTimeout(300);
const gtxt = (await fp.locator('[data-faith-grudge]').textContent().catch(() => '')) || '';
ok('the faith tab shows the grudge: who, what, how long (' + gtxt.slice(0, 140) + ')', /GRUDGE · HOLY FATHER NERUKHAN/.test(gtxt) && /Marked for 2 rounds at the start of every fight/.test(gtxt) && /cut by 50%/.test(gtxt) && /Ends after 3 more sessions/.test(gtxt));
ok('the switch has no APOSTASY line', !(await G()).story.entries.some((e) => e.head === 'APOSTASY'));
const tc = (await fp.locator('[data-faith-tagcaps]').textContent().catch(() => '')) || '';
ok('the tag caps on the faith tab, with no session part in the Proving Ground (' + tc + ')', /^LIKED TAGS · \d\/2 THIS (SCENE|FIGHT)/.test(tc) && !/SESSION/.test(tc));
if (SHOTS) { await fp.locator('[data-faith-grudge]').scrollIntoViewIfNeeded().catch(() => {}); await p.waitForTimeout(300); await p.screenshot({ path: SHOTS + '/faith-pg-grudge.png' }); }
const e4 = await act({ type: 'faith/apostasy', charId: cid }); await p.waitForTimeout(300);
cc = (await G()).characters[cid];
ok('apostasy: an Atheist, Devotion XP 0, the day recorded (' + (e4 || JSON.stringify(cc.faithLeft)) + ')', cc.belief?.kind === 'atheist' && !cc.devotionXp && !!cc.faithLeft);
const ctxt = (await fp.locator('[data-faith-day]').textContent().catch(() => '')) || '';
ok('the faith tab: the day and "Nobody answers yet: 90 days" (' + ctxt + ')', /DAY \d+/.test(ctxt) && /Nobody answers yet: 90 days/.test(ctxt));
ok('apostasy ends the grudge (item 720): no grudge card, nothing on the character', !cc.grudge && (await fp.locator('[data-faith-grudge]').count()) === 0);
if (SHOTS) { await fp.locator('[data-faith-day]').scrollIntoViewIfNeeded().catch(() => {}); await p.waitForTimeout(300); await p.screenshot({ path: SHOTS + '/faith-pg-cooldown.png' }); }
const e5 = await act({ type: 'faith/pact', charId: cid, patron: 'the_matchmaker' }); await p.waitForTimeout(200);
ok('a pact during the cooldown is refused: still an Atheist' + (e5 ? ' (' + e5 + ')' : ''), (await G()).characters[cid].belief?.kind === 'atheist');
// The Proving Ground has no Narrator (no days pass here: a room's long rests and the Narrator's days do that, faith.mjs and
// the unit tests); its tools ignore the cooldown, as they say.
await act({ type: 'sandbox/faith', charId: cid, belief: 'faithful', patron: 'the_matchmaker' }); await p.waitForTimeout(300);
cc = (await G()).characters[cid];
const lbl = (await fp.locator('[data-devotion-label]').textContent().catch(() => '')) || '';
ok('the tools swear a patron anyway: the cooldown is gone and the meter reads "' + lbl + '"', cc.belief?.patron === 'the_matchmaker' && (await fp.locator('[data-faith-cooldown]').count()) === 0 && lbl === 'DEVOTION 3 · 0/25 XP');
console.log('errors', errors);
await browser.close();
