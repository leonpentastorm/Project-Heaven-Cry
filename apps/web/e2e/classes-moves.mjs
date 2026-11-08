// Class Roster Revision 3's new moves in play (Proving Ground with a friend: the host acts, the guest is the squadmate):
//  · Fighter: Shove (the "Knock Prone" chip) and Unstoppable (+2 Momentum);
//  · Guardian: Command (click the squadmate, then the tile: they walk for free);
//  · Infiltrator: Vanish (out of every enemy's sight), Field Fix (the "Clear the jam" chip on a jammed squadmate),
//    Sabotage on a drone, and Rig (the rigged tile marked on the grid);
//  · Trickster: Read (Analyze names the enemy's next move: a marker on the enemy and its target), False Image (a
//    translucent copy of the caster on the grid), Silver Tongue, Sleight (swap with the squadmate);
//  · Bard: Rally; Marksman: Duck and Roll off and on (the one in force ticked); Channeler: Eye of the Storm (ARMED);
//  · Mage: Vent and Swap core read the engine's AP (Bleed the Flux 0, Core Change 1).
// Every move through its real button on the CLASS tab, its picker's chips and the grid; the engine state checked and the
// fx events seen playing (the layer draws). Screenshots: e2e/shots/classes-moves-*.png (deviceScaleFactor 1).
import { chromium, player, click, BASE, OUT, pickAction } from './lib.mjs';
const browser = await chromium.launch();
const host = await player(browser, 'host'), mai = await player(browser, 'mai');
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const snap = (n, p = host) => p.screenshot({ path: OUT + 'classes-moves-' + n + '.png' });
const G = (p = host) => p.evaluate(() => window.__phc.getState().game);
const act = (p, a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const until = (p, f, arg, t = 15000) => p.waitForFunction(f, arg, { timeout: t });
const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };
const xy = (k) => k.split(',').map(Number);
const dist = (a, b) => { const [x1, y1] = xy(a), [x2, y2] = xy(b); return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2)); };
for (const p of [host, mai]) p.on('dialog', (d) => d.accept());
const dismissCut = async (p = host) => { for (let i = 0; i < 3; i++) { if (!(await p.locator('[data-phc-cutin]').count())) return; await p.mouse.click(1430, 990); await p.waitForTimeout(380); } };
const tok = (k) => host.locator('button.phc-tok[aria-label^="' + ref(k) + ' ·"]').first();
const log = async () => ((await G()).combat?.log || []).map((l) => (typeof l === 'string' ? l : l.text || '')).join('\n');
const fxSince = async (n) => ((await G()).combat?.fx || []).filter((e) => e.n > n);
const fxN = async () => { const f = (await G()).combat?.fx || []; return f.length ? f[f.length - 1].n : 0; };
let hostChar, maiChar;
const me = async () => (await G()).combat.units.find((u) => u.charId === hostChar);
const mate = async () => (await G()).combat.units.find((u) => u.charId === maiChar);

/** The host's turn with full AP: the guest ends theirs, enemies pass (AI off). */
async function toHost() {
  for (let i = 0; i < 40; i++) {
    const g = await G(); const cb = g.combat; if (!cb) return false;
    const cur = cb.units.find((u) => u.id === cb.order[cb.turn]);
    if (cur && cur.charId === hostChar && cur.ap >= 5) { await host.waitForTimeout(300); await dismissCut(); return true; }
    if (cur && cur.charId === maiChar) { await dismissCut(mai); await act(mai, { type: 'combat/end-turn', unitId: cur.id }); }
    else if (cur && cur.charId === hostChar) { await dismissCut(); await act(host, { type: 'combat/end-turn', unitId: cur.id }); }
    await host.waitForTimeout(350);
  }
  return false;
}
async function newTurn() { const u = await me(); await dismissCut(); await act(host, { type: 'combat/end-turn', unitId: u.id }); await host.waitForTimeout(300); return toHost(); }
/** The guest walks (on their own turn) to a tile near the host, then hands the turn back. */
async function mateNear(maxD = 1) {
  for (let i = 0; i < 4; i++) {
    const g = await G(), u = await me(), m = await mate(); if (dist(u.pos, m.pos) <= maxD) return true;
    const cb = g.combat;
    if (cb.order[cb.turn] !== m.id) { await act(host, { type: 'combat/end-turn', unitId: u.id }); await until(host, (id) => { const c = window.__phc.getState().game.combat; return c.order[c.turn] === id; }, m.id, 10000).catch(() => {}); }
    const [x, y] = xy(u.pos), free = (k) => { const [a, b] = xy(k); return a >= 0 && b >= 0 && a < cb.map.w && b < cb.map.h && !cb.map.solid.includes(k) && !cb.units.some((v) => !v.dead && v.pos === k); };
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].map(([dx, dy]) => (x + dx) + ',' + (y + dy)).filter(free).sort((a, b) => dist(a, m.pos) - dist(b, m.pos));
    for (const k of near) { if (!(await act(mai, { type: 'combat/move', unitId: m.id, to: k, how: 'sprint' }))) break; }
    await act(mai, { type: 'combat/end-turn', unitId: (await mate()).id });
    await toHost();
  }
  return dist((await me()).pos, (await mate()).pos) <= maxD;
}
/** A free tile next to (dx, dy) of a key, else any free neighbour. */
async function freeNear(k, prefer = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]], avoid = []) {
  const cb = (await G()).combat, [x, y] = xy(k);
  for (const [dx, dy] of prefer) { const t = (x + dx) + ',' + (y + dy), [a, b] = xy(t); if (a < 0 || b < 0 || a >= cb.map.w || b >= cb.map.h || cb.map.solid.includes(t) || avoid.includes(t)) continue; if (cb.units.some((v) => !v.dead && v.pos === t)) continue; if ((cb.objects || []).some((o) => o.pos === t && ['crate', 'pillar', 'barricade', 'door', 'wall'].includes(o.kind))) continue; return t; }
  return null;
}
async function spawnNear(tier, weapon, name, avoid = []) {
  const u = await me();
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const at = (xy(u.pos)[0] + dx) + ',' + (xy(u.pos)[1] + dy); if (avoid.includes(at)) continue;
    const n0 = (await G()).combat.units.length;
    if (await act(host, { type: 'sandbox/spawn', tier, weapon, at: ref(at), ...(name ? { name } : {}) })) continue;
    if ((await G()).combat.units.length > n0) return (await G()).combat.units.at(-1);
  }
  return null;
}
async function setClass(id, rank, extra = async () => {}) {
  await act(host, { type: 'sandbox/class', charId: hostChar, classId: id, rank });
  await extra();
  await host.waitForTimeout(250);
}
/** The magic kit with its focus in a hand (spec: Hands 2, item 630: a focus counts only in a hand): a one-handed pistol
 *  in the main hand first (the Recruit's rifle fills both) and a free off hand, so the kit puts the Evoker or Emanator in the off hand. */
async function withFocus(kind) {
  await act(host, { type: 'sandbox/give', charId: hostChar, item: 'service_pistol', equip: true });
  await act(host, { type: 'sandbox/unequip', charId: hostChar, slot: 'off' }); // an earlier kit's focus there goes to the pack
  return act(host, { type: 'sandbox/kit', charId: hostChar, kind });
}
/** Open the CLASS tab and press a move's button there (the base Shove lives on another tab under the same name). */
async function pickClass(name) {
  await host.locator('#phc-tab-class').click(); await host.waitForTimeout(120);
  await host.locator('[role="tabpanel"]').getByRole('button', { name }).first().click(); await host.waitForTimeout(150);
}
/** Click a CLASS-tab move, then its grid picks and chips, then Confirm. Returns the footer's text if Confirm is disabled. */
async function useMove(name, o = {}) {
  await dismissCut();
  await pickClass(name);
  if (o.target) { await tok(o.target).click(); await host.waitForTimeout(150); }
  if (o.chip) { await host.locator('.phc-cb-pick').getByRole('button', { name: o.chip }).first().click(); await host.waitForTimeout(120); }
  if (o.tile) { await tok(o.tile).click(); await host.waitForTimeout(150); }
  if (o.shot) await snap(o.shot);
  const b = host.getByRole('button', { name: /^Confirm/ }).first();
  await b.waitFor({ timeout: 4000 }).catch(() => {});
  if (!(await b.isEnabled().catch(() => false))) return 'Confirm disabled: ' + ((await host.locator('[aria-live]').allTextContents().catch(() => [])).join(' ').slice(0, 300));
  await b.click(); await host.waitForTimeout(500);
  return null;
}
async function fxSeenSince(mark) { return host.evaluate((m) => (window.__fxSeen || []).slice(m), mark); }
const fxMark = () => host.evaluate(() => (window.__fxSeen || []).length);
const layerKids = () => host.evaluate(() => document.querySelector('.phc-fx-layer')?.childElementCount || 0);

// ---------- 0. The Proving Ground with a friend ----------
await host.goto(BASE);
await click(host, 'PROVING GROUND', { timeout: 20000 });
await host.getByPlaceholder('Leon').fill('Leon');
await click(host, 'With friends ›');
await until(host, () => !!window.__phc.getState().game?.sandbox);
const invite = host.locator('div[role="dialog"][aria-label="Invite friends"]');
await invite.waitFor({ timeout: 6000 });
const code = (await G()).code;
await invite.getByRole('button', { name: 'Gear up ›' }).click();
await mai.goto(BASE);
await click(mai, 'JOIN A FRIEND', { timeout: 20000 });
await mai.getByPlaceholder('Leon').fill('Mai');
await mai.getByPlaceholder('ROOM CODE').fill(code);
await click(mai, 'Join ›');
await until(mai, () => !!window.__phc.getState().game?.sandbox && window.__phc.getState().screen === 'main');
const maiId = await mai.evaluate(() => window.__phc.getState().me.id);
let g = await G();
maiChar = Object.values(g.characters).find((c) => c.owner === maiId).id;
hostChar = Object.values(g.characters).find((c) => c.owner !== maiId).id;
ok('host and guest each have a fighter', !!hostChar && !!maiChar);
await host.evaluate(() => { window.__fxSeen = []; addEventListener('phc-fx', (e) => window.__fxSeen.push(e.detail.k)); });
await act(host, { type: 'sandbox/ai', on: false });
await act(host, { type: 'sandbox/auto', on: false });
await act(host, { type: 'sandbox/fight' });
await until(host, () => window.__phc.getState().screen === 'combat');
await until(mai, () => window.__phc.getState().screen === 'combat');
await act(host, { type: 'sandbox/clear' });
ok('the fight is on, host to act', await toHost());

// ---------- 1. Fighter: Shove and Unstoppable ----------
await setClass('fighter', 3);
let foe = await spawnNear('soldier', 'fists', 'Brute');
ok('a drill unit stands next to the Fighter', !!foe);
let n0 = await fxN(), m0 = await fxMark(), ap0 = (await me()).ap;
let r = await useMove(/^Shove/, { target: foe.pos, chip: /^Knock Prone/, shot: '01-shove-picker' });
ok('Shove (Knock Prone) through its button: ' + (r || 'confirmed'), !r);
let u = await me(); let fx = await fxSince(n0);
ok('Shove cost 1 AP (' + ap0 + ' → ' + u.ap + ') and sent a shove event', u.ap === ap0 - 1 && fx.some((e) => e.k === 'shove'));
n0 = await fxN();
r = await useMove(/^Unstoppable/);
u = await me(); fx = await fxSince(n0);
ok('Unstoppable: +2 Momentum (' + JSON.stringify(u.res || {}) + ') and its event', !r && (u.res?.momentum || 0) >= 2 && fx.some((e) => e.k === 'unstoppable'));
await host.waitForTimeout(200);
ok('the fx layer draws them (' + (await layerKids()) + ' nodes) and they played: ' + (await fxSeenSince(m0)).join(','), (await fxSeenSince(m0)).includes('unstoppable') && (await fxSeenSince(m0)).includes('shove'));
await snap('02-unstoppable');
const tabTxt = await host.locator('[role="tabpanel"]').first().textContent();
ok('the Class tab shows Unstoppable as used for the scene: ' + (tabTxt.match(/Unstoppable[^A-Z]*/) || [''])[0], /Unstoppable/.test(tabTxt));
const unBtn = host.locator('[role="tabpanel"] button', { hasText: 'Unstoppable' }).first();
ok('its button carries the reason: ' + (await unBtn.getAttribute('title')).slice(0, 40), /Used until the next scene/.test(await unBtn.getAttribute('title')));

// ---------- 2. Guardian: Command ----------
await act(host, { type: 'sandbox/clear' });
await setClass('guardian', 1, () => act(host, { type: 'sandbox/skill', charId: hostChar, skill: 'authority', points: 1 }));
ok('host turn', await newTurn());
let m = await mate(); u = await me();
const dest = await freeNear(m.pos, [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1]]);
n0 = await fxN();
r = await useMove(/^Command/, { target: m.pos, tile: dest, shot: '03-command-picker' });
m = await mate(); fx = await fxSince(n0);
ok('Command: ' + (r || 'confirmed') + '; the squadmate walked to ' + ref(dest) + ' (now ' + ref(m.pos) + ') for free', !r && m.pos === dest && fx.some((e) => e.k === 'command_move'));

// ---------- 3. Infiltrator: Vanish, Field Fix, Rig, Sabotage ----------
await setClass('infiltrator', 3);
ok('host turn', await newTurn());
// Vanish: no enemy on the field (a cleared field) sees anyone.
n0 = await fxN();
r = await useMove(/^Vanish/);
u = await me();
ok('Vanish: Hidden (' + (r || 'confirmed') + ')', !r && !!u.hidden);
ok('next to the squadmate', await mateNear(1));
// Field Fix: the squadmate's gun jams (set up by hand), the chip clears it.
await host.evaluate((id) => { const cb = window.__phc.getState().game.combat; const x = cb.units.find((v) => v.charId === id); x.jammed = true; }, maiChar);
m = await mate();
await dismissCut(); await pickClass(/^Field Fix/); await tok(m.pos).click(); await host.waitForTimeout(200);
const chips = await host.locator('.phc-cb-pick button').allTextContents();
ok('Field Fix offers its three jobs, the ones that don\'t apply greyed with a reason: ' + chips.join(' | '), chips.length === 3 && /Restore durability · /.test(chips.join('|')) && !/Clear the jam ·/.test(chips.join('|')));
const greyed = await host.locator('.phc-cb-pick button[disabled]').count();
ok('the greyed chips are disabled (' + greyed + ')', greyed >= 1);
await snap('04-field-fix-picker');
r = await useMove(/^Field Fix/, { target: m.pos, chip: /^Clear the jam/ });
m = await mate();
ok('Field Fix cleared the jam: ' + (r || 'confirmed'), !r && !m.jammed);
ok('host turn', await newTurn());
n0 = await fxN();
r = await useMove(/^Sabotage: rig your tile/);
u = await me(); g = await G();
const rig = (g.combat.objects || []).find((o) => o.rig && o.pos === u.pos);
ok('Rig: a rigged tile under the Infiltrator (' + (r || 'confirmed') + ')', !r && !!rig && rig.side === 'pc');
fx = await fxSince(n0); ok('the rig event', fx.some((e) => e.k === 'rig'));
await host.waitForTimeout(300);
ok('the grid marks it: ✱ RIG on ' + ref(u.pos), (await tok(u.pos).locator('span', { hasText: '✱ RIG' }).count()) > 0);
const drone = await spawnNear('soldier', 'fists', 'Drone 1');
ok('a drone stands next to the Infiltrator', !!drone);
n0 = await fxN();
r = await useMove(/^Sabotage: disable a machine/, { target: drone.pos });
g = await G(); const dr = g.combat.units.find((x) => x.id === drone.id); fx = await fxSince(n0);
ok('Sabotage: the drone is disabled (stunned ' + (dr.conds?.stunned || 0) + '): ' + (r || 'confirmed'), !r && (dr.conds?.stunned || 0) > 0 && fx.some((e) => e.k === 'sabotage'));
await host.waitForTimeout(250);
await snap('05-sabotage');

// ---------- 4. Trickster: Read, False Image, Silver Tongue, Sleight ----------
await act(host, { type: 'sandbox/clear' });
await setClass('trickster', 3, () => withFocus('sigil'));
await act(host, { type: 'sandbox/refill', charId: hostChar });
u = await me();
const far = await (async () => { const cb = (await G()).combat, [x, y] = xy(u.pos); for (const d of [4, 5, 3, 6]) for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d], [d, 1], [-d, 1]]) { const k = (x + dx) + ',' + (y + dy), [a, b] = xy(k); if (a < 0 || b < 0 || a >= cb.map.w || b >= cb.map.h || cb.map.solid.includes(k) || cb.units.some((v) => !v.dead && v.pos === k)) continue; if (!(await act(host, { type: 'sandbox/spawn', tier: 'soldier', weapon: 'service_pistol', at: ref(k), name: 'Gunner' }))) return k; } return null; })();
ok('an armed enemy a few tiles off', !!far);
ok('host turn', await newTurn());
foe = (await G()).combat.units.find((x) => x.side === 'foe' && !x.dead);
n0 = await fxN(); ap0 = (await me()).ap;
await dismissCut(); await pickAction(host, /^Analyze/); await tok(foe.pos).click(); await host.waitForTimeout(150);
await host.getByRole('button', { name: /^Confirm/ }).first().click(); await host.waitForTimeout(600);
g = await G(); foe = g.combat.units.find((x) => x.id === foe.id); u = await me();
ok('Read: Analyze cost 1 AP (' + ap0 + ' → ' + u.ap + ') and named its next move: ' + (foe.readIntent && foe.readIntent.text), u.ap === ap0 - 1 && !!foe.readIntent);
fx = await fxSince(n0); ok('the intent event', fx.some((e) => e.k === 'intent'));
const intentMark = tok(foe.pos).locator('span[title^="Read: "]');
ok('the enemy wears its intent marker: ' + (await intentMark.first().textContent().catch(() => '')), (await intentMark.count()) > 0);
const tgtPos = foe.readIntent.targetId ? g.combat.units.find((x) => x.id === foe.readIntent.targetId)?.pos : foe.readIntent.to;
if (tgtPos) ok('its target tile is marked too (' + ref(tgtPos) + ')', (await tok(tgtPos).locator('span[title^="Read: "]').count()) > 0);
await snap('06-read');
const imgAt = await freeNear(u.pos, [[1, 1], [-1, 1], [1, -1], [-1, -1], [0, 2], [2, 0]]);
n0 = await fxN();
r = await useMove(/^False Image/, { target: null, tile: imgAt });
g = await G();
ok('False Image at ' + ref(imgAt) + ': ' + (r || 'confirmed'), !r && (g.combat.images || []).some((i) => i.pos === imgAt));
await host.waitForTimeout(400);
const decoy = tok(imgAt).locator('span[title^="False Image of"]');
ok('the grid draws the decoy (a translucent copy): ' + (await decoy.count()) + ' marks', (await decoy.count()) >= 1 && /opacity: 0\.55/.test((await decoy.first().getAttribute('style')) || ''));
ok('the guest (same side) sees it too', (await mai.locator('button.phc-tok[aria-label^="' + ref(imgAt) + ' ·"] span[title^="False Image of"]').count()) >= 1);
await snap('07-false-image');
n0 = await fxN();
r = await useMove(/^Silver Tongue/, { target: foe.pos });
fx = await fxSince(n0);
ok('Silver Tongue at the gunner: ' + (r || 'confirmed'), !r && fx.some((e) => e.k === 'silver_tongue'));
m = await mate(); u = await me();
if (dist(m.pos, u.pos) > 6) ok('squadmate within 6', await mateNear(5));
m = await mate(); u = await me();
const before = [u.pos, m.pos];
r = await useMove(/^Sleight: swap with a squadmate/, { target: m.pos });
m = await mate(); u = await me();
ok('Sleight: the two swapped places (' + before.map(ref).join('↔') + '): ' + (r || 'confirmed'), !r && u.pos === before[1] && m.pos === before[0]);
await host.waitForTimeout(300); await snap('08-sleight');

// ---------- 5. Bard: Rally ----------
await act(host, { type: 'sandbox/clear' });
await setClass('bard', 3);
ok('host turn', await newTurn());
ok('squadmate within 4', await mateNear(3));
n0 = await fxN();
r = await useMove(/^Rally/);
fx = await fxSince(n0);
ok('Rally: ' + (r || 'confirmed'), !r && fx.some((e) => e.k === 'rally') && /rallies the squad/.test(await log()));
await host.waitForTimeout(250); await snap('09-rally');

// ---------- 6. Marksman: Duck and Roll off and on ----------
await setClass('marksman', 2);
ok('host turn', await newTurn());
await pickClass(/^Duck and Roll: on/);
const onTitle = await host.locator('[role="tabpanel"] button', { hasText: 'Duck and Roll: on' }).first().getAttribute('title');
ok('Duck and Roll: on is ticked as in force: ' + onTitle.slice(0, 40), /In force now/.test(onTitle) && (await host.locator('[role="tabpanel"] button', { hasText: 'Duck and Roll: on ✓' }).count()) > 0);
r = await useMove(/^Duck and Roll: off/);
await host.waitForTimeout(250);
ok('Duck and Roll: off now ticked (' + (r || 'confirmed') + ')', !r && (await host.locator('[role="tabpanel"] button', { hasText: 'Duck and Roll: off ✓' }).count()) > 0);
r = await useMove(/^Duck and Roll: on/);
ok('and on again (' + (r || 'confirmed') + ')', !r && (await host.locator('[role="tabpanel"] button', { hasText: 'Duck and Roll: on ✓' }).count()) > 0);
await snap('10-duck-toggles');

// ---------- 7. Mage: Vent and Swap core at the engine's AP ----------
await setClass('mage', 2, () => withFocus('sigil'));
ok('host turn', await newTurn());
await pickAction(host, /^Swap core/);
const costOf = (t) => host.locator('[role="tabpanel"] button', { hasText: t }).first().locator('span').last().textContent();
const ventC = await costOf('Vent Flux'), coreC = await costOf('Swap core');
ok('Vent 0 AP and Swap core 1 AP on the Sigils tab (Bleed the Flux, Core Change): ' + ventC + ' · ' + coreC, ventC.trim() === '0 AP' && coreC.trim() === '1 AP');
await snap('11-mage-costs');

// ---------- 8. Channeler: Eye of the Storm ----------
await setClass('channeler', 3, () => withFocus('soul'));
ok('host turn', await newTurn());
n0 = await fxN();
r = await useMove(/^Eye of the Storm/);
fx = await fxSince(n0);
await host.waitForTimeout(250);
ok('Eye of the Storm armed: ' + (r || 'confirmed'), !r && fx.some((e) => e.k === 'eye_storm'));
ok('its button reads ARMED', (await host.locator('[role="tabpanel"] button', { hasText: 'Eye of the Storm · ARMED' }).count()) > 0);
await snap('12-eye-of-the-storm');
const bodyTxt = async () => (await host.locator('body').textContent()).replace(/\s+/g, ' ');
ok('the Channeler\'s panel reads Strain and MP', /STRAIN\s*\d+ \/ \d+/i.test(await bodyTxt()) && /MP\s*\d+ \/ \d+/.test(await bodyTxt()));

// ---------- 9. Defender: the resource panel reads Guard; Shrug It Off's toggle names the one in force ----------
await setClass('defender', 2);
ok('host turn', await newTurn());
ok('the Defender\'s panel reads Guard: ' + ((await bodyTxt()).match(/GUARD\s*\d+ \/ \d+/i) || [''])[0], /GUARD\s*\d+ \/ 5/i.test(await bodyTxt()));
r = await useMove(/^Shrug It Off: off/);
await host.waitForTimeout(250);
ok('Shrug It Off: off is in force (' + (r || 'confirmed') + ')', !r && (await host.locator('[role="tabpanel"] button', { hasText: 'Shrug It Off: off ✓' }).count()) > 0);
await snap('13-defender');

const seen = new Set(await fxSeenSince(0));
ok('the fx played: ' + [...seen].filter((k) => ['shove', 'unstoppable', 'command_move', 'stance', 'rig', 'sabotage', 'intent', 'image', 'silver_tongue', 'swap', 'rally', 'eye_storm'].includes(k)).join(', '),
  ['shove', 'unstoppable', 'command_move', 'rig', 'sabotage', 'intent', 'image', 'silver_tongue', 'swap', 'rally', 'eye_storm'].every((k) => seen.has(k)));
ok('no page errors: ' + [...host.errors, ...mai.errors].join(' | '), ![...host.errors, ...mai.errors].length);
await browser.close();
