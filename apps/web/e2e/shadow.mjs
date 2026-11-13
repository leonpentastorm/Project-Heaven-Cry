// Shadow and the Operative (rules 1.32; docs/design/shadow-spec.md section 1's worked example, in the Proving Ground):
//  · an Operative (Ingenuity 7) starts the fight with 1 Shadow: the meter row reads "Shadow 1 / 4" with its eye word;
//  · Vanish (CLASS tab) out of every enemy's view: Hidden; the turn ends Hidden with no attack: +1 Shadow;
//  · the SHADOW tab lists the door verbs; Read Intent on a Soldier that can't see you: the Soldier is Read;
//  · a shot with the Break toggle from Hidden: one `shadow` term on the preview, the meter spent, the shooter revealed.
// Every action through its real button, except the Break shot, sent as the attack card sends it (its toggle id in mods).
// Screenshots: e2e/shots/shadow-*.png.
import { chromium, player, click, BASE, OUT, settle } from './lib.mjs';
import { tipOf } from './lib.mjs';
const browser = await chromium.launch();
const host = await player(browser, 'host');
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const snap = (n) => host.screenshot({ path: OUT + 'shadow-' + n + '.png' });
const G = () => host.evaluate(() => window.__phc.getState().game);
const act = (a) => host.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };
const tok = (k) => host.locator('button.phc-tok[aria-label^="' + ref(k) + ' ·"]').first();
const dismissCut = async () => { for (let i = 0; i < 3; i++) { if (!(await host.locator('[data-phc-cutin]').count())) return; await host.mouse.click(1430, 990); await settle(host, 380); } };
let charId;
const me = async () => (await G()).combat.units.find((u) => u.charId === charId);
async function toMe() {
  for (let i = 0; i < 30; i++) {
    const cb = (await G()).combat, cur = cb.units.find((u) => u.id === cb.order[cb.turn]);
    if (cur && cur.charId === charId) { await dismissCut(); return true; }
    if (cur) await act({ type: 'combat/end-turn', unitId: cur.id });
    await settle(host, 250);
  }
  return false;
}
async function tabMove(tab, name, o = {}) {
  await dismissCut();
  await host.locator('#phc-tab-' + tab).click(); await settle(host, 150);
  await host.locator('[role="tabpanel"]').getByRole('button', { name }).first().click(); await settle(host, 150);
  if (o.target) { await tok(o.target).click(); await settle(host, 150); }
  const b = host.getByRole('button', { name: /^Confirm/ }).first();
  await b.waitFor({ timeout: 20000 }).catch(() => {});
  if (!(await b.isEnabled().catch(() => false))) return 'Confirm disabled';
  await b.click(); await settle(host, 500); return null;
}

// ---------- 0. The Proving Ground, an Operative with Ingenuity 7 ----------
await host.goto(BASE);
await click(host, 'PROVING GROUND', { timeout: 30000 });
const nm = host.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 20000 }).catch(() => {}), host.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 20000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(host, 'Solo ›'); }
await host.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 30000 });
charId = Object.keys((await G()).characters)[0];
await act({ type: 'sandbox/class', charId, classId: 'infiltrator', rank: 3 });
await act({ type: 'sandbox/skill', charId, skill: 'ingenuity', points: 7 });
await act({ type: 'sandbox/ai', on: false }); await act({ type: 'sandbox/auto', on: false });
if ((await G()).phase !== 'combat') await act({ type: 'sandbox/fight' });
await host.waitForFunction(() => window.__phc.getState().game?.phase === 'combat', null, { timeout: 30000 });
await act({ type: 'sandbox/clear' });
ok('my turn', await toMe());
let u = await me();
ok('the Operative starts with Shadow ' + (u.res?.shadow ?? 0) + ' of ' + (u.resMax?.shadow ?? 0), u.res?.shadow === 1 && u.resMax?.shadow === 4);
await settle(host, 300);
const meterText = await host.locator('text=Shadow').first().textContent().catch(() => '');
ok('the meter row is on the screen ("' + (meterText || '').slice(0, 40) + '")', !!meterText);
await snap('01-meter');
// Classes 3.0 step 10 (shadow-spec.md section 9): the meter shows the engine's value, once; the SHADOW tab in its groups;
// a verb that needs you Hidden is refused in the spec's words while you are seen
{
  const row = (await host.locator('.phc-res-row:not(.phc-res-mini)[data-res="res-shadow"]').first().textContent().catch(() => '')) || '';
  ok('the meter row reads the engine\'s Shadow (' + row.replace(/\s+/g, ' ').slice(0, 60) + ')', row.includes((u.res?.shadow ?? 0) + ' / ' + (u.resMax?.shadow ?? 0)) && (await host.locator('.phc-res-row:not(.phc-res-mini)[data-res="res-shadow"]').count()) === 1);
  ok('the eye word under it (Unseen / In view / Seen)', /Eye: (Unseen|In view|Seen)/.test(row));
  await host.locator('#phc-tab-shadow').click(); await settle(host, 200);
  const tab = (await host.locator('[role="tabpanel"]').textContent()) || '';
  const groups = ['SLIP', 'MARK', 'WORK', 'BREAK'].filter((w) => tab.includes(w));
  ok('the SHADOW tab in its groups: ' + groups.join(', '), groups.length >= 3);
  const ri = host.locator('[role="tabpanel"] button', { hasText: 'Read Intent' }).first();
  const tip = (await ri.count()) ? await tipOf(ri) : '';
  ok('Read Intent while seen, refused in the spec\'s words (' + tip.slice(0, 70) + ')', /An enemy sees you/.test(tip));
}

// ---------- 1. Vanish, then a turn ended Hidden with no attack ----------
let r = await tabMove('class', /^Vanish/);
u = await me();
ok('Vanish: Hidden (' + (r || 'confirmed') + ')', !r && !!u.hidden);
await act({ type: 'combat/end-turn', unitId: u.id }); await settle(host, 300);
ok('my turn again', await toMe());
u = await me();
ok('the turn ended Hidden with no attack: Shadow ' + u.res?.shadow, u.res?.shadow === 2 && !!u.hidden);

// ---------- 2. The SHADOW tab: Read Intent on a Soldier that can't see you ----------
const [x, y] = u.pos.split(',').map(Number), at = (x + 3) + ',' + y;
await act({ type: 'sandbox/spawn', tier: 'soldier', weapon: 'hellraiser_service_rifle', at: ref(at), name: 'Watchman' });
const foe = (await G()).combat.units.find((v) => v.name === 'Watchman');
ok('a Soldier on the field', !!foe);
await host.locator('#phc-tab-shadow').click(); await settle(host, 200);
const verbs = await host.locator('[role="tabpanel"] button').allTextContents();
ok('the SHADOW tab lists the verbs: ' + verbs.slice(0, 6).join(' | ').slice(0, 160), verbs.some((t) => /Read Intent/.test(t)) && verbs.some((t) => /Lift/.test(t)));
await snap('02-tab');
r = await tabMove('shadow', /^Read Intent/, { target: foe.pos });
const read = (await G()).combat.units.find((v) => v.id === foe.id);
ok('Read Intent: the Soldier is Read (' + (r || 'confirmed') + ')', !r && (read.conds?.read || 0) > 0);

// ---------- 3. The Break: one shadow term, the meter spent, revealed ----------
u = await me();
// Classes 3.0 step 10: on the attack card the Break is a toggle; switching it on changes the previewed damage
{
  await host.locator('#phc-tab-attack').click(); await settle(host, 150);
  await host.locator('[role="tabpanel"]').getByRole('button', { name: /^Shot/ }).first().click(); await settle(host, 150);
  await tok(foe.pos).click(); await settle(host, 200);
  const brk = host.locator('[aria-label="Perk options on this action"] button', { hasText: 'Break' }).first();
  const has = await brk.waitFor({ timeout: 10000 }).then(() => true, () => false);
  const card = async () => ((await host.locator('.phc-cb-dock').first().textContent().catch(() => '')) || '').replace(/\s+/g, ' ');
  const before = await card();
  if (has) { await brk.click(); await host.waitForFunction(() => document.querySelector('[aria-label="Perk options on this action"] button[aria-pressed="true"]'), null, { timeout: 10000 }).catch(() => {}); }
  const after = await card();
  let i = 0; while (i < before.length && before[i] === after[i]) i++;
  const at = Math.max(0, i - 20), seen = after.slice(at, at + 70);
  ok('the Break is a toggle on the attack card, and switching it changes the preview ("…' + seen + '…")', has && before !== after && /shadow|Break/i.test(after));
  if (process.env.SHOTS_C3) await host.screenshot({ path: process.env.SHOTS_C3 + 'operative-shadow-break.png' });
  await snap('02b-break-toggle');
}
const mods = ['skill:ingenuity.1#shadow.break'];
const pv = await host.evaluate(({ id, t, mods }) => { const g = window.__phc.getState().game; const E = window.__phcEngine; if (!E?.previewAttack) return null; const cb = { ...g.combat, mods }; return E.previewAttack(cb, cb.units.find((v) => v.id === id), cb.units.find((v) => v.id === t), 'shot').dmg?.mults?.map((m) => m.label); }, { id: u.id, t: foe.id, mods });
if (pv) ok('the preview lists one shadow term and no ambush term: ' + pv.join(', '), pv.includes('shadow') && !pv.includes('ambush'));
r = await act({ type: 'combat/attack', unitId: u.id, targetId: foe.id, mode: 'shot', mods }); await settle(host, 600);
u = await me();
ok('the Break shot: the meter spent (' + (u.res?.shadow ?? 0) + ') and revealed (' + (r || 'sent') + ')', !r && (u.res?.shadow ?? 0) === 0 && !u.hidden);
const log = ((await G()).combat.log || []).map((l) => (typeof l === 'string' ? l : l.text || '')).join('\n');
ok('the log says so', /breaks from the shadows/.test(log));
await snap('03-break');
await browser.close();
