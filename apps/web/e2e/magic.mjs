// Magic (rules 1.2) end to end: a caster picks 2 Sigil words and an Outburst on the Kit step, the MAGIC sheet tab shows
// them, a glyph is drawn and evoked on the area map, then a fight: draw + evoke, begin/hold/release an Outburst.
// Screenshots (deviceScaleFactor 1) land in e2e/shots/magic-*.png.
import { chromium, player, click, hostAs, OUT, pickAction } from './lib.mjs';
const browser = await chromium.launch();
const host = await player(browser, 'host');
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const snap = (n) => host.screenshot({ path: OUT + 'magic-' + n + '.png' });
const G = () => host.evaluate(() => window.__phc.getState().game);
const act = (a) => host.evaluate((a) => window.__phc.act(a), a);
const lastLines = (n = 8) => host.evaluate((n) => { const g = window.__phc.getState().game; return (g.combat ? g.combat.log : g.story.entries).slice(-n).map((e) => (typeof e === 'string' ? e : e.text || e.head || '')); }, n);

// ---------- 1. Creation: Sigilist (Brain Power 4), trade a Vigilant point for Will Power 1, the Sigil student kit ----------
await hostAs(host, 'Leon');
await click(host, 'Create a character');
await host.getByPlaceholder('What the squad calls you').fill('Chalkhand');
await host.locator('main button[aria-pressed]').first().click();
await click(host, 'Next ›');
await host.getByRole('tab', { name: 'Sigil casters', exact: true }).click();
await host.locator('button', { hasText: 'Sigilist' }).first().click();
await host.locator('button', { hasText: /^Use .* ›$/ }).first().click();
await host.getByRole('button', { name: 'Lower Vigilant', exact: true }).first().click();
await host.getByRole('button', { name: 'Raise Will Power', exact: true }).first().click();
await click(host, 'Next ›'); // traits
await click(host, 'Next ›'); // kit
await host.locator('button', { hasText: 'Sigil student' }).first().click();
await host.waitForSelector('text=SIGIL WORDS · MIND · PICK 2');
await host.waitForSelector('text=OUTBURST · SOUL · 1 DESIGN');
ok('the Kit step shows both magic sections', true);
const verdict = () => host.locator('[role="status"]').allTextContents();
ok('defaults are a legal Stack: ' + (await verdict())[0], /✓ SPARK \+ CONDENSE/.test((await verdict())[0]));
// pick FROST (a Subject) and PUSH (a Motion): they swap out SPARK and CONDENSE
const word = (w) => host.locator('button[aria-pressed]').filter({ has: host.locator('span', { hasText: new RegExp('^' + w + '$') }) }).first();
await word('FIRE').click();
await word('PUSH').click();
const v2 = (await verdict())[0];
ok('FIRE + PUSH replace the defaults: ' + v2, /✓ FIRE \+ PUSH/.test(v2) || /✓ PUSH \+ FIRE/.test(v2));
// Outburst: Control school, a name
await host.locator('button[aria-pressed]').filter({ has: host.locator('span', { hasText: /^DAMAGE$/ }) }).first().click();
await host.getByPlaceholder(/Outburst/).first().fill('Red Hand');
await host.getByPlaceholder(/Outburst/).first().press('Tab');
const v3 = (await verdict())[1];
ok('the Outburst verdict is legal: ' + v3, /^✓ Red Hand/.test(v3));
await snap('01-kit');
await click(host, 'Next ›');
await host.waitForSelector('text=Lock in and bring to the room');
await snap('02-lockin');
await host.locator('text=SIGIL WORDS · MIND').first().scrollIntoViewIfNeeded(); await snap('02b-lockin-magic');
ok('Lock in shows the Sigil and Outburst cards', await host.locator('text=SIGIL WORDS · MIND').count() > 0 && await host.locator('text=OUTBURST · SOUL').count() > 0);
ok('Lock in lists the Sigil words and the Outburst', await host.locator('text=/Sigil words: (FIRE|PUSH)/').count() > 0 && await host.locator('text=Outburst: Red Hand').count() > 0);
await click(host, 'Lock in and bring to the room');
await host.waitForSelector('text=✓ LOCKED IN');
const me0 = Object.values((await G()).characters)[0];
ok('the character keeps the picks: ' + JSON.stringify(me0.sigils) + ' / ' + JSON.stringify(me0.outbursts), me0.sigils.includes('fire') && me0.sigils.includes('push') && me0.outbursts[0]?.name === 'Red Hand');

// ---------- 2. Session ----------
await host.evaluate(() => window.__phc.setNarrator({ scripted: true }));
await click(host, 'Start session');
await host.waitForSelector('.phc-story', { timeout: 15000 });
await host.waitForFunction(() => window.__phc.getState().game.story.entries.some((e) => e.kind === 'narration'), null, { timeout: 15000 });
const me = me0.id;
const story = () => host.evaluate(() => { const g = window.__phc.getState().game; return { await: g.story.await, round: g.story.round, phase: g.phase }; });
console.log('story', await story());
// The Sigil student kit carries an Evoker; the Narrator hands over an Emanator so this one character can test both families.
await act({ type: 'narrator/turn', turn: { narration: 'A crate by the ramp holds a spare heart link.', loot: [{ charId: me, item: 'emanator' }, { charId: me, item: 'standard_core', qty: 2 }] } });
await host.waitForTimeout(400);
const meNow = () => host.evaluate((id) => window.__phc.getState().game.characters[id], me);
ok('the Emanator is in the pack', (await meNow()).pack.some((x) => (x.item || x.id) === 'emanator'));
await host.waitForFunction(() => window.__phc.getState().game.story.await === 'players', null, { timeout: 15000 });

// ---------- 3. The MAGIC sheet tab ----------
await host.getByRole('tab', { name: 'MAGIC', exact: true }).click();
await host.waitForSelector('section[aria-label="Sigils"]');
const sigSec = await host.locator('section[aria-label="Sigils"]').textContent();
const soulSec = await host.locator('section[aria-label="Outbursts"]').textContent();
ok('the Sigil section lists FIRE and PUSH', /FIRE/.test(sigSec) && /PUSH/.test(sigSec));
ok('no "no Evoker" warning with an Evoker', !/no Evoker/i.test(sigSec));
ok('the Soul section lists Red Hand with its MP bar', /Red Hand/.test(soulSec) && /MP/.test(soulSec) && !/No Emanator/i.test(soulSec));
console.log('  sigil:', sigSec.replace(/\s+/g, ' ').slice(0, 220));
console.log('  soul :', soulSec.replace(/\s+/g, ' ').slice(0, 260));
await snap('03-sheet-tab');

// ---------- 4. The area map: draw FIRE and PUSH on one tile, evoke the Stack ----------
await click(host, 'Area map');
await host.waitForSelector('div[role="dialog"][aria-label="Area map"]');
const dlg = host.locator('div[role="dialog"][aria-label="Area map"]');
const myPos = async () => (await G()).story.positions[me];
const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };
const tile = (k) => dlg.locator('button.phc-tok[aria-label^="' + ref(k) + ':"], button.phc-tok[aria-label^="' + ref(k) + ' ·"]').first();
const hint = async () => (await dlg.textContent()).replace(/\s+/g, ' ');
await dlg.getByRole('button', { name: /Draw a glyph/ }).click();
await dlg.locator('div[aria-label="Words you know"] button', { hasText: 'FIRE' }).click();
const at = await myPos();
console.log('me at', at, ref(at));
await tile(at).click();
await host.waitForTimeout(300);
await dlg.locator('div[aria-label="Words you know"] button', { hasText: 'PUSH' }).click();
await tile(at).click();
await host.waitForTimeout(300);
const gl = (await G()).story.glyphs || [];
ok('two glyphs on the story map: ' + gl.map((x) => x.word + '@' + x.pos).join(', '), gl.length === 2 && gl.every((x) => x.pos === at));
console.log('  lines:', (await lastLines(3)).join(' | '));
await snap('04-area-drawn');
await dlg.getByRole('button', { name: /^Evoke/ }).first().click();
await tile(at).click();
await host.waitForTimeout(200);
console.log('  hint after picking the stack:', (await hint()).match(/Evoke [^.]*\.[^.]*\./)?.[0] || '(no Evoke line)');
// aim 3 tiles away along a free row
const [x0, y0] = at.split(',').map(Number);
const aimK = await host.evaluate(([x0, y0]) => { const g = window.__phc.getState().game; const occ = new Set(Object.values(g.story.positions)); for (const [dx, dy] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) { const k = (x0 + dx) + ',' + (y0 + dy); if (!occ.has(k) && x0 + dx >= 0 && y0 + dy >= 0) return k; } return null; }, [x0, y0]);
await tile(aimK).click();
await host.waitForTimeout(200);
await snap('05-area-evoke-aim');
const conf = dlg.getByRole('button', { name: /^Evoke ·/ }).first();
ok('Confirm reads "Evoke · AP · charge"', await conf.count() > 0);
if (await conf.count()) await conf.click();
await host.waitForTimeout(400);
const ev = await lastLines(4);
ok('the evoke lands: ' + ev.join(' | '), ev.some((l) => /evokes/i.test(l)));
ok('the Stack is spent', ((await G()).story.glyphs || []).length === 0);
await snap('06-area-after-evoke');

await dlg.getByRole('button', { name: 'Close', exact: true }).first().click();

// ---------- 5. An Outburst let go at a hostile on the area map starts the fight ----------
const cAt = (await G()).story.positions[me], [cx, cy] = cAt.split(',').map(Number);
const free = await host.evaluate(([cx, cy]) => { const g = window.__phc.getState().game, occ = new Set([...Object.values(g.story.positions), ...(g.story.npcs || []).map((n) => n.pos), ...(g.story.objects || []).map((o) => o.pos)]);
  const out = []; for (const [dx, dy] of [[4, 0], [4, 1], [-4, 0], [0, 4], [3, 2], [-3, 2], [2, 3], [7, 0], [-7, 0], [6, 3], [-6, 3], [7, 5], [-7, 5]]) { const k = (cx + dx) + ',' + (cy + dy); if (!occ.has(k) && cx + dx >= 0 && cy + dy >= 0 && cx + dx < 16 && cy + dy < 11) out.push(k); } return out; }, [cx, cy]);
await act({ type: 'narrator/turn', turn: { narration: 'Two raiders step out of the smoke, fists up.', npcs: [{ action: 'place', name: 'Raider', side: 'hostile', tier: 'minion', weapon: 'fists', at: ref(free[0]) }, { action: 'place', name: 'Raider Two', side: 'hostile', tier: 'minion', weapon: 'fists', at: ref(free.find((k) => Math.abs(k.split(',')[0] - cx) + Math.abs(k.split(',')[1] - cy) >= 7) || free[1]) }] } });
await host.waitForFunction(() => window.__phc.getState().game.story.await === 'players', null, { timeout: 15000 });
const raider = (await G()).story.npcs.find((n) => n.name === 'Raider');
ok('a hostile raider stands on the area map at ' + (raider && ref(raider.pos)), !!raider);
await click(host, 'Area map');
await dlg.waitFor();
await dlg.getByRole('button', { name: /^Outburst/ }).first().click();
await dlg.locator('div[aria-label="Your Outburst designs"]').waitFor();
await tile(raider.pos).click(); await host.waitForTimeout(250);
const obHint = await hint();
ok('the hint warns that this starts a fight', /starts a fight/.test(obHint));
const letGo = dlg.getByRole('button', { name: /^Let it go ·/ }).first();
ok('Confirm reads "Let it go · AP"', await letGo.count() > 0);
await snap('06b-area-outburst-aim');
await letGo.click();
await host.waitForFunction(() => window.__phc.getState().game.phase === 'combat', null, { timeout: 10000 });
await host.waitForSelector('text=ACTION POINTS', { timeout: 10000 });
ok('the screen goes to combat', true);
const opener = await host.evaluate(() => window.__phc.getState().game.combat.log.slice(0, 6).join(' | '));
console.log('  combat opens:', opener);
// wait for our turn
const myTurn = () => host.evaluate((id) => { const g = window.__phc.getState().game, cb = g.combat; if (!cb || cb.over) return 'over'; const u = cb.units.find((x) => x.id === cb.order[cb.turn]); return u && u.charId === id ? 'mine' : 'other'; }, me);
const waitMine = async () => { for (let i = 0; i < 100 && (await myTurn()) === 'other'; i++) await host.waitForTimeout(150); return myTurn(); };
ok('our turn comes up', (await waitMine()) === 'mine');
const CB = () => host.evaluate((id) => { const cb = window.__phc.getState().game.combat; const u = cb.units.find((x) => x.charId === id); return { cb, u }; }, me);
let { cb, u } = await CB();
console.log('combat: me', u.pos, 'AP', u.ap, 'mg', JSON.stringify({ charge: u.mg?.charge, flux: u.mg?.flux, mp: u.mg?.mp, words: u.mg?.words, designs: u.mg?.designs?.map((d) => d.id) }), 'mana', cb.mana);
const grid = host.locator('button.phc-tok');
const ctile = (k) => host.locator('button.phc-tok[aria-label^="' + ref(k) + ' ·"]').first();
const groups = await host.locator('[role="tablist"][aria-label="Actions"] [role="tab"][data-tab$="s"]').evaluateAll((ts) => ts.map((t) => t.getAttribute('data-tab')).filter((x) => x === 'sigils' || x === 'outbursts'));
ok('combat shows both magic tabs: ' + groups.join(', '), groups.length === 2);
ok('the header shows the mana', await host.locator('text=/MANA \\d+ · /').count() > 0);
await snap('07-combat-start');

// Draw FIRE then PUSH on our own tile
await pickAction(host, /^Draw a glyph/);
await host.waitForSelector('div[aria-label="Glyph keyboard"]');
await host.locator('div[aria-label="Glyph keyboard"] button', { hasText: 'FIRE' }).click();
await ctile(u.pos).hover(); await host.waitForTimeout(150);
await snap('08-combat-draw-hover');
await ctile(u.pos).click(); await host.waitForTimeout(300);
await pickAction(host, /^Draw a glyph/).catch(() => {});
await host.locator('div[aria-label="Glyph keyboard"] button', { hasText: 'PUSH' }).click();
await ctile(u.pos).click(); await host.waitForTimeout(300);
({ cb, u } = await CB());
ok('two glyphs on the grid: ' + (cb.glyphs || []).map((x) => x.word + '@' + x.pos).join(', '), (cb.glyphs || []).filter((x) => x.pos === u.pos).length === 2);
ok('draw lines in the log', cb.log.filter((l) => /draws (FIRE|PUSH)/.test(l)).length === 2);
await host.evaluate(() => scrollTo(0, 0)); await snap('09-combat-drawn');

// Evoke it at the raider
const foe = cb.units.find((x) => x.side === 'foe' && !x.dead);
await pickAction(host, /^Evoke/);
await ctile(u.pos).click(); await host.waitForTimeout(200);
await ctile(foe.pos).click(); await host.waitForTimeout(250);
await snap('10-combat-evoke-aim');
const conf2 = host.getByRole('button', { name: /^Confirm/ }).first();
console.log('  confirm:', await conf2.textContent(), 'enabled', await conf2.isEnabled());
if (await conf2.isEnabled()) await conf2.click();
await host.waitForTimeout(500);
({ cb, u } = await CB());
const evl = cb.log.filter((l) => /evokes/.test(l));
ok('evoke in the combat log: ' + evl.at(-1), evl.length > 0);
ok('glyphs spent', !(cb.glyphs || []).some((x) => x.pos === u.pos));

// A critical evoke can end the fight here (both raiders down): then the held-Outburst steps have nothing to do.
if (cb.over) console.log('  (the evoke ended the fight: the Outburst steps are skipped this run)');
else {
// Outburst: hold it. A turn that began short of AP (round 1 can) may not afford it after drawing and evoking: wait a turn.
if (u.ap < 3 && !cb.over) {
  await host.getByRole('button', { name: 'End turn', exact: true }).click();
  await host.waitForTimeout(300); await waitMine(); ({ cb, u } = await CB());
}
await pickAction(host, /^Outburst/);
await host.waitForSelector('div[aria-label="Your Outbursts"]');
await host.locator('div[aria-label="Release now or hold"] button', { hasText: 'Hold' }).click();
await host.waitForTimeout(200);
await snap('11-combat-outburst-hold');
const conf3 = host.getByRole('button', { name: /^Confirm/ }).first();
console.log('  confirm:', await conf3.textContent(), 'enabled', await conf3.isEnabled(), 'AP', u.ap);
if (await conf3.isEnabled()) await conf3.click();
await host.waitForTimeout(500);
({ cb, u } = await CB());
ok('the Outburst is held: ' + JSON.stringify(u.mg?.held), !!u.mg?.held);
console.log('  log:', cb.log.slice(-3).join(' | '));
await host.evaluate(() => scrollTo(0, 0)); await snap('12-combat-holding');
// end turn, come back, release at the raider
await host.getByRole('button', { name: 'End turn', exact: true }).click();
const back = await waitMine();
ok('our turn comes back (' + back + ')', back === 'mine');
if (back !== 'mine') console.log('  state:', await host.evaluate(() => { const cb = window.__phc.getState().game.combat; return JSON.stringify({ over: cb.over, round: cb.round, turn: cb.order[cb.turn], units: cb.units.map((u) => [u.id, u.name, u.hp, u.ap, u.downed, u.dead]) }) + ' | ' + cb.log.slice(-6).join(' | '); }));
({ cb, u } = await CB());
console.log('  held now', JSON.stringify(u.mg?.held), 'strain', u.mg?.strain, 'AP', u.ap);
await host.evaluate(() => scrollTo(0, 0)); await snap('13-combat-held-next-turn');
const relOk = await pickAction(host, /^Release ·/, { timeout: 4000 }).then(() => true, () => false);
ok('Release appears while holding', relOk);
if (relOk) {
  await host.waitForTimeout(200);
  // the nearest live raider if it's within the design's reach (8), else open ground two tiles off
  const d1 = (a, b) => { const [ax, ay] = a.split(',').map(Number), [bx, by] = b.split(',').map(Number); return Math.max(Math.abs(ax - bx), Math.abs(ay - by)); };
  const f2 = cb.units.filter((x) => x.side === 'foe' && !x.dead).sort((a, b) => d1(a.pos, u.pos) - d1(b.pos, u.pos))[0];
  const [ux, uy] = u.pos.split(',').map(Number);
  await ctile(f2 && d1(f2.pos, u.pos) <= 7 ? f2.pos : (ux > 3 ? ux - 2 : ux + 2) + ',' + uy).click(); await host.waitForTimeout(250);
  await snap('14-combat-release-aim');
  const conf4 = host.getByRole('button', { name: /^Confirm/ }).first();
  console.log('  confirm:', await conf4.textContent(), 'enabled', await conf4.isEnabled());
  if (await conf4.isEnabled()) await conf4.click();
  await host.waitForTimeout(500);
  ({ cb, u } = await CB());
  ok('released: ' + cb.log.slice(-3).join(' | '), !u.mg?.held && cb.log.some((l) => /releases/.test(l)));
}
await snap('15-combat-after-release');
({ cb, u } = await CB());
if (!cb.over && (await myTurn()) === 'mine' && u.mg?.flux) {
  await pickAction(host, /^Vent Flux/); await host.waitForTimeout(150);
  const cv = host.getByRole('button', { name: /^Confirm/ }).first();
  if (await cv.isEnabled()) await cv.click(); await host.waitForTimeout(400);
  ({ cb, u } = await CB());
  ok('vent: ' + cb.log.filter((l) => /vents/.test(l)).at(-1) + ' · mana ' + cb.mana, cb.log.some((l) => /vents \d+ Flux/.test(l)) && !u.mg.flux);
}
}
await host.evaluate(() => scrollTo(0, 0)); await snap('16-combat-after-vent');

// ---------- 6. Back to the story: what the fight spent stays spent ----------
// finish the fight: shoot the nearest raider each turn (through the engine), else end the turn
for (let i = 0; i < 40; i++) {
  const st = await waitMine(); if (st === 'over') break;
  await host.evaluate((id) => { const g = window.__phc.getState().game, cb = g.combat, u = cb.units.find((x) => x.charId === id), t = cb.units.find((x) => x.side === 'foe' && !x.dead);
    const before = cb.log.length; if (t && u.ap >= 2) window.__phc.act({ type: 'combat/attack', unitId: u.id, targetId: t.id, mode: 'shot' });
    const g2 = window.__phc.getState().game; if (!g2.combat.over && (g2.combat.log.length === before || u.ap < 2)) window.__phc.act({ type: 'combat/end-turn', unitId: u.id }); }, me);
  await host.waitForTimeout(150);
}
await host.waitForSelector('text=Back to the story ›', { timeout: 15000 });
await click(host, 'Back to the story ›');
await host.waitForSelector('.phc-story', { timeout: 10000 });
await host.getByRole('tab', { name: 'MAGIC', exact: true }).click();
const after = await host.evaluate((id) => { const g = window.__phc.getState().game, c = g.characters[id]; return { mp: c.mp, evo: c.evoCharge, glyphs: (g.story.glyphs || []).length, magic: (g.story.magic || {})[id] }; }, me);
const soul2 = (await host.locator('section[aria-label="Outbursts"]').textContent()).replace(/\s+/g, ' ');
ok('the sheet shows the MP the fight left (' + after.mp + '): ' + soul2.match(/MP\s*\d+ \/ \d+ MP/)?.[0], after.mp != null && soul2.includes(after.mp + ' / 100 MP'));
const marks = await host.locator('.phc-story').textContent();
ok('story magic lines carry the Sigil mark ✧ (an evoke that strikes is still a spell, not ⚔)', /✧ Chalkhand draws FIRE/.test(marks) && /✧ Chalkhand evokes/.test(marks) && !/⚔ Chalkhand evokes/.test(marks));
await host.evaluate(() => { const s = document.querySelector('.phc-story'); s.scrollTop = 0; });
await snap('17-story-after');
// the workshop: a second design, saved through the engine
await host.getByRole('button', { name: '+ NEW DESIGN' }).click();
const ws = host.locator('div[aria-label="Outburst workshop"]');
await ws.waitFor();
await ws.getByPlaceholder('What you call it').fill('Quiet Hand');
await ws.getByPlaceholder('What you call it').press('Tab');
await ws.locator('button', { hasText: /^Move/ }).first().click().catch(() => {});
await ws.scrollIntoViewIfNeeded(); await snap('18-workshop');
await ws.getByRole('button', { name: 'Save design' }).click();
await host.waitForTimeout(400);
const ds = await host.evaluate((id) => window.__phc.getState().game.characters[id].outbursts.map((d) => d.name + ':' + d.school + '/' + d.modules.join('+')), me);
ok('a second design is saved: ' + ds.join(', '), ds.length === 2 && ds.some((x) => x.startsWith('Quiet Hand:')));
ok('the workshop closes after the save', await ws.count() === 0);
console.log('errors', JSON.stringify(host.errors));
if (host.errors.length) process.exitCode = 1;
await browser.close();
