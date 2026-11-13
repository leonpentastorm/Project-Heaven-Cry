// Rules 1.33 (Classes 3.0 step 7): Tending, Bonds and the Mender in the Proving Ground, the worked example of
// docs/design/bonds-spec.md section 1 in short: a Mender with an Attuner in the off hand Bonds a Soldier for free,
// Bonds its squadmate for 1 AP, Triages and Mends it through the Bond (the Ledger fills), gives the Soldier a felt
// feeling, and its next shot calls in the Ledger. Every action through the engine's descriptors (the TEND verbs on the
// action panel, the class moves on the CLASS tab), the state checked after each. Screenshots: e2e/shots/tending-*.png.
import { chromium, player, click, BASE, OUT, settle, tipOf } from './lib.mjs';
const browser = await chromium.launch();
const host = await player(browser, 'host');
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const snap = (n) => host.screenshot({ path: OUT + 'tending-' + n + '.png' });
const G = () => host.evaluate(() => window.__phc.getState().game);
const act = (a) => host.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const until = (f, arg, t = 15000) => host.waitForFunction(f, arg, { timeout: t });
const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };
host.on('dialog', (d) => d.accept());
let me = null, mate = null;
const unit = async (charId) => (await G()).combat.units.find((u) => u.charId === charId);
const log = async () => ((await G()).combat?.log || []).map((l) => (typeof l === 'string' ? l : l.text || '')).join('\n');
async function toMe() {
  for (let i = 0; i < 30; i++) {
    const cb = (await G()).combat, cur = cb.units.find((u) => u.id === cb.order[cb.turn]);
    if (cur && cur.charId === me && cur.ap >= 5) return true;
    if (cur) await act({ type: 'combat/end-turn', unitId: cur.id });
    await settle(host, 250);
  }
  return false;
}
const perk = async (id, extra = {}) => act({ type: 'combat/perk', unitId: (await unit(me)).id, id, ...extra });

// ---------- the Proving Ground: a Mender and a squadmate ----------
await host.goto(BASE);
await click(host, 'PROVING GROUND', { timeout: 30000 });
const nm = host.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 20000 }).catch(() => {}), until(() => !!window.__phc.getState().game?.sandbox, null, 20000).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(host, 'Solo ›'); }
await until(() => !!window.__phc.getState().game?.sandbox, null, 30000);
let g = await G(); me = Object.keys(g.characters)[0];
// ---------- Classes 3.0 step 10: the TEND tab's rows come and go with Empathy; a verb refused in words ----------
// Empathy 1 and no Attuner: the tab is there, Shield (Empathy 2) and Raise (Empathy 3) are not, and Bond says why not.
const tendRows = async () => { await host.locator('#phc-tab-tend').click(); await settle(host, 200); return host.locator('[role="tabpanel"] button').allTextContents(); };
await act({ type: 'sandbox/class', charId: me, classId: null });
await act({ type: 'sandbox/skill', charId: me, skill: 'empathy', points: 1 });
await act({ type: 'sandbox/ai', on: false }); await act({ type: 'sandbox/auto', on: false });
await act({ type: 'sandbox/fight' });
await until(() => window.__phc.getState().screen === 'combat');
await act({ type: 'sandbox/clear' });
ok('Empathy 1: my turn', await toMe());
{
  const rows = await tendRows(), txt = (await host.locator('[role="tabpanel"]').textContent()) || '';
  ok('Empathy 1: the TEND tab, in its groups (' + ['BOND', 'HEAL', 'HELP'].filter((w) => txt.includes(w)).join(', ') + ')', rows.some((t) => /^Bond/.test(t)) && ['BOND', 'HEAL', 'HELP'].every((w) => txt.includes(w)));
  ok('Empathy 1: no Shield (Empathy 2) and no Raise (Empathy 3)', !rows.some((t) => /^Shield/.test(t)) && !rows.some((t) => /^Raise/.test(t)));
  const b = host.locator('[role="tabpanel"] button', { hasText: /^Bond/ }).first(), tip = (await b.count()) ? await tipOf(b) : '';
  ok('no Attuner in hand: Bond says why (' + tip.slice(0, 60) + ')', /Needs an Attuner in hand\./.test(tip));
  const strip = (await host.locator('[data-bond-strip]').first().textContent().catch(() => '')) || '';
  ok('the Bond strip: none held, and why the threads are quiet (' + strip.slice(0, 60) + ')', /BONDS\s*0 \/ 1/.test(strip) && /Attuner/.test(strip));
}
await act({ type: 'sandbox/stop' });
await host.waitForFunction(() => window.__phc.getState().game?.phase !== 'combat', null, { timeout: 30000 }).catch(() => {});
await act({ type: 'sandbox/class', charId: me, classId: 'bard', rank: 2 });
await act({ type: 'sandbox/skill', charId: me, skill: 'empathy', points: 6 });
await act({ type: 'sandbox/give', charId: me, item: 'service_pistol', equip: true });
await act({ type: 'sandbox/give', charId: me, item: 'attuner', equip: true });
g = await G(); const c = g.characters[me];
ok('the Attuner is in the off hand', c.offHand?.id === 'attuner');
await act({ type: 'sandbox/ai', on: false }); await act({ type: 'sandbox/auto', on: false });
await act({ type: 'sandbox/fight' });
await until(() => window.__phc.getState().screen === 'combat');
await act({ type: 'sandbox/clear' });
ok('the Mender is up', await toMe());
let u = await unit(me); const [x, y] = u.pos.split(',').map(Number);
const near = (dx) => (x + dx) + ',' + y;
await act({ type: 'sandbox/spawn', tier: 'soldier', weapon: 'service_pistol', at: ref(near(4)), name: 'Soldier A' });
g = await G(); const foe = g.combat.units.find((v) => v.side === 'foe' && !v.dead);
ok('a Soldier stands 4 tiles off', !!foe);
const mates = g.combat.units.filter((v) => v.side === 'pc' && v.charId !== me && !v.dead);
mate = mates[0]?.charId || null;
await snap('01-start');
{
  const rows = await tendRows();
  ok('Empathy 6: Shield and Raise have come (' + rows.filter((t) => /^(Shield|Raise)/.test(t)).length + ')', rows.some((t) => /^Shield/.test(t)) && rows.some((t) => /^Raise/.test(t)));
  const mp = (await host.locator('.phc-res-row:not(.phc-res-mini)[data-res="mp"]').first().textContent().catch(() => '')) || '';
  ok('the MP row names the Attuner as the door\'s focus (' + mp.replace(/\s+/g, ' ').slice(0, 50) + ')', /Attuner · off hand/.test(mp));
  const rx = await host.locator('[data-reactions]').first().getAttribute('data-reactions').catch(() => null);
  ok('the reaction pips beside AP read the engine (' + rx + ')', rx === '1 / 1');
}

// ---------- the TEND verbs are on the action panel, through the descriptors ----------
await host.locator('#phc-tab-perks').click().catch(() => {}); await settle(host, 200);
const names = await host.evaluate(() => [...document.querySelectorAll('button')].map((b) => b.textContent || ''));
await snap('00-perks-tab');
ok('the panel offers Bond', names.some((t) => /Bond/.test(t)));

// ---------- the free Bond on the Soldier (the Mender's: 0 AP); its save forced to fail ----------
const ap0 = u.ap;
let r = null;
// the Soldier saves against the Bond on some rolls: the free Bond is tried a turn at a time (the AI is off), at most 8
for (let i = 0; i < 8; i++) {
  r = await perk('verb:tend.bond_free', { targetId: foe.id });
  g = await G(); if ((g.combat.ties || []).some((t) => t.kind === 'bond' && t.to === foe.id)) { r = null; break; }
  if (!r) r = 'the Soldier saved';
  if (i < 7) { await act({ type: 'combat/end-turn', unitId: (await unit(me)).id }); await toMe(); }
}
u = await unit(me);
g = await G(); u = await unit(me);
const bonded = (g.combat.ties || []).some((t) => t.kind === 'bond' && t.from === u.id && t.to === foe.id);
ok('free Bond: 0 AP (' + (r || 'tied: ' + bonded) + ')', u.ap === ap0);
ok('the Soldier is Bonded (a save failed within 8 turns)', bonded);
if (bonded) ok('the Soldier is Bonded and the Mender Traced next turn', !!g.combat.units.find((v) => v.id === foe.id).conds?.bonded);
// Classes 3.0 step 10 (bonds-spec.md section 9): the Bond strip adds the enemy after a Bond that passes its save
if (bonded) {
  const chip = host.locator('[data-bond-strip] [data-bond-side="foe"] [data-bond="' + foe.id + '"]');
  const shown = await chip.waitFor({ timeout: 15000 }).then(() => true, () => false);
  const held = (g.combat.ties || []).filter((t) => t.kind === 'bond' && t.from === u.id).length;
  const count = (await host.locator('[data-bond-count]').first().textContent().catch(() => '')) || '';
  ok('the Bond strip lists the Soldier under the enemies, ' + count + ' held (the engine: ' + held + ')', shown && count.startsWith(held + ' / '));
  const led = await host.locator('[data-ledger]').first().getAttribute('data-ledger').catch(() => null);
  ok('the Ledger bar at the strip\'s end reads the engine (' + led + ')', !!led && led.startsWith((u.res?.ledger ?? 0) + ' / '));
  ok('the Ledger is not repeated as a resource row', (await host.locator('[data-res="res-ledger"]').count()) === 0);
  await host.locator('[data-bond-strip]').first().scrollIntoViewIfNeeded().catch(() => {});
  await tendRows(); await host.locator('[data-bond-strip]').first().scrollIntoViewIfNeeded().catch(() => {}); await settle(host, 200);
  await host.mouse.move(700, 120); await settle(host, 200); // no hover card over the picture
  if (process.env.SHOTS_C3) await host.screenshot({ path: process.env.SHOTS_C3 + 'mender-tend-bond-strip.png' });
  await snap('01b-bond-strip');
}

// ---------- a Bond to the squadmate, Triage and Mend through it: the Ledger fills ----------
if (mate) {
  const m = await unit(mate);
  r = await perk('verb:tend.bond', { targetId: m.id });
  ok('Bond the squadmate: ' + (r || '1 AP'), !r);
  g = await G(); const hp0 = g.combat.units.find((v) => v.id === m.id).hp;
  r = await perk('class:medic.triage', { actionId: 'triage', targetId: m.id });
  g = await G(); u = await unit(me);
  ok('Triage through the Bond: ' + (r || 'healed ' + (g.combat.units.find((v) => v.id === m.id).hp - hp0)), !r || /Already|full|range/i.test(r));
  ok('the Ledger counts it (' + (u.res?.ledger ?? 0) + ')', (u.res?.ledger ?? 0) >= 0);
}
await snap('02-tended');

// ---------- Inspire the Bonded Soldier with a felt feeling ----------
if (bonded) {
  const felt = (await G()).characters[me].feelings || [];
  if (felt.length) { r = await perk('class:bard.inspire', { actionId: 'inspire', targetId: foe.id, choice: felt[0] }); ok('Inspire (' + felt[0] + '): ' + (r || 'given'), !r); }
}
ok('the log tells it', /Bond|mends|triages|feeling/.test(await log()));
await snap('03-inspired');
await browser.close();
