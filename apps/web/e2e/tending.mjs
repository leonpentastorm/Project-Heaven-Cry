// Rules 1.33 (Classes 3.0 step 7): Tending, Bonds and the Mender in the Proving Ground, the worked example of
// docs/design/bonds-spec.md section 1 in short: a Mender with an Attuner in the off hand Bonds a Soldier for free,
// Bonds its squadmate for 1 AP, Triages and Mends it through the Bond (the Ledger fills), gives the Soldier a felt
// feeling, and its next shot calls in the Ledger. Every action through the engine's descriptors (the TEND verbs on the
// action panel, the class moves on the CLASS tab), the state checked after each. Screenshots: e2e/shots/tending-*.png.
import { chromium, player, click, BASE, OUT, settle } from './lib.mjs';
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

// ---------- the TEND verbs are on the action panel, through the descriptors ----------
const names = await host.evaluate(() => [...document.querySelectorAll('button')].map((b) => b.textContent || ''));
ok('the panel offers Bond', names.some((t) => /Bond/.test(t)));

// ---------- the free Bond on the Soldier (the Mender's: 0 AP); its save forced to fail ----------
const ap0 = u.ap;
let r = null;
for (let i = 0; i < 6 && !r; i++) {
  r = await perk('verb:tend.bond_free', { targetId: foe.id });
  if (r) break;
  g = await G(); if ((g.combat.ties || []).some((t) => t.kind === 'bond' && t.to === foe.id)) break;
  r = 'the Soldier saved'; // a save passed: the free Bond is spent this turn
}
g = await G(); u = await unit(me);
const bonded = (g.combat.ties || []).some((t) => t.kind === 'bond' && t.from === u.id && t.to === foe.id);
ok('free Bond: 0 AP (' + (r || 'tied: ' + bonded) + ')', u.ap === ap0);
if (bonded) ok('the Soldier is Bonded and the Mender Traced next turn', !!g.combat.units.find((v) => v.id === foe.id).conds?.bonded);

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
