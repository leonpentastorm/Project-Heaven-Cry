// Rules 1.65 (the picking contract, 0.31.5), in the Proving Ground: every aimed action shows its picking through the one
// overlay (game/pickOverlay.ts), from the engine's own marks. For Vault, Decoy, Douse (Shadow), a Whisper (Health), a
// Hymn with an area (Thunderclap), the Miracle The Sky Answers, Picture and a Figment's Move, a technique, a thrown
// stim and the Throw row (a frag grenade, on the Attack tab):
//   · selected: its reach is shaded (tiles whose hover card says "in reach" or "you can pick this tile"), or its legal
//     units ringed ("you can pick them");
//   · the pointer on a legal tile or unit: the area it covers ("it covers this tile"), whom it touches, or the hover line;
//   · a click on a tile or unit it can't take: the engine's refusal is a line by the action box ("✕ …"), nothing picked.
// The review (rules 1.65 item 5108): each action must show the kinds it has (a unit pick its reach too; Vault's and
// Douse's choices a strict subset of their reach), The Sky Answers' and Thunderclap's area is exactly 25 tiles, a mend's
// hover line leads with its net gain, and an empty tile clicked while a unit pick is open says "Nobody there.".
// Screenshots: picking-*.png (KEEP_SHOTS=1 keeps them).
import { chromium, player, settle, pickAction, openGround, OUT } from './lib.mjs';
const browser = await chromium.launch();
const p = await player(browser, 'host');
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const snap = (n) => p.screenshot({ path: OUT + 'picking-' + n + '.png' });
const G = () => p.evaluate(() => window.__phc.getState().game);
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };
const tok = (k) => p.locator('button.phc-tok[aria-label^="' + ref(k) + ' ·"]').first();
const dismissCut = async () => { for (let i = 0; i < 4; i++) { if (!(await p.locator('[data-phc-cutin]').count())) return; await p.keyboard.press('Escape'); await settle(p, 300); } };
/** The tiles whose hover card carries this word (the overlay writes its kind into each tile's card). */
const tilesWith = (word) => p.evaluate((w) => [...document.querySelectorAll('button.phc-tok')].filter((b) => (b.getAttribute('aria-label') || '').includes(w)).map((b) => (b.getAttribute('aria-label') || '').split(' · ')[0]), word);
/** The tiles whose pick-overlay layer matches (pickOverlay.ts: a reach tile's shade 0.06, a choice's 0.12 with its solid
 *  outline, the area's 0.3): since the wording pass the tiles' names no longer say "in reach" or "it covers this tile". */
const tilesLayer = (src) => p.evaluate((src) => { const r = new RegExp(src); return [...document.querySelectorAll('button.phc-tok')].filter((b) => [...b.querySelectorAll('span[aria-hidden="true"]')].some((s) => r.test(s.getAttribute('style') || ''))).map((b) => (b.getAttribute('aria-label') || '').split(/[ ·]/)[0]); }, src);
const REACH = /background: rgba\([^)]*, 0\.06\)/.source, CHOICE = /background: rgba\([^)]*, 0\.12\)/.source, AREA = /background: rgba\([^)]*, 0\.3\)/.source;
const keyOf = (r) => ('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(r[0])) + ',' + (Number(r.slice(1)) - 1);
/** The action box's words (the refusal line is there). */
const dock = () => p.evaluate(() => (document.querySelector('.phc-cb-dock') || document.body).innerText || '');
/** The hover chip over a tile (z-index 30 inside a tile button): the engine's hover line. */
const chip = () => p.evaluate(() => { const s = [...document.querySelectorAll('button.phc-tok span')].find((e) => e.style.zIndex === '30' && e.style.padding === '2px 6px' && (e.textContent || '').trim()); return s ? s.textContent.trim() : ''; });
let charId;
/** An empty tile next to me, in sight (a unit pick can't take it: "Nobody there."). */
const emptyNear = async () => { const g = await G(), u = g.combat.units.find((v) => v.charId === charId), [x, y] = u.pos.split(',').map(Number), solid = new Set(g.combat.map.solid || []);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1], [2, 0], [0, 2]]) { const k = (x + dx) + ',' + (y + dy); if (!solid.has(k) && !g.combat.units.some((v) => v.pos === k && !v.dead) && !(g.combat.objects || []).some((o) => o.pos === k)) return k; } return null; };
const me = async () => (await G()).combat.units.find((u) => u.charId === charId);
async function toMe() {
  for (let i = 0; i < 30; i++) {
    const cb = (await G()).combat, cur = cb.units.find((u) => u.id === cb.order[cb.turn]);
    if (cur && cur.charId === charId) { await dismissCut(); return true; }
    if (cur) await act({ type: 'combat/end-turn', unitId: cur.id });
    await settle(p, 250);
  }
  return false;
}
/** Walk to a tile through the reducer, a few tiles at a time, ending turns when the AP runs out. */
let last = '';
async function walkTo(to) {
  for (let i = 0; i < 40; i++) {
    const u = await me(); if (u.pos === to) return true;
    const [x, y] = u.pos.split(',').map(Number), [tx, ty] = to.split(',').map(Number);
    let moved = false;
    for (const n of [4, 3, 2, 1]) {
      const nx = x + Math.sign(tx - x) * Math.min(n, Math.abs(tx - x)), ny = y + Math.sign(ty - y) * Math.min(n, Math.abs(ty - y));
      for (const k of [nx + ',' + ny, nx + ',' + y, x + ',' + ny]) { if (k === u.pos) continue; const e = await act({ type: 'combat/move', unitId: u.id, to: k, how: 'move' }); await settle(p, 100); if (!e && (await me()).pos !== u.pos) { moved = true; break; } last = k + ': ' + (e || 'no move (still at ' + (await me()).pos + ')'); }
      if (moved) break;
    }
    if (!moved) { await act({ type: 'combat/end-turn', unitId: u.id }); if (!(await toMe())) return false; }
    await settle(p, 120);
  }
  if ((await me()).pos !== to) console.log('INFO walk stopped at ' + (await me()).pos + ': ' + last);
  return (await me()).pos === to;
}
/** One aimed action: select it, read its reach or choices, hover a legal pick, click an illegal one. */
async function check(name, btn, o = {}) {
  await dismissCut();
  await p.keyboard.press('Escape').catch(() => {}); await settle(p, 100);
  const miss = (e) => ok(name + ': its button (' + String(e.message || e).slice(0, 60) + ')', false);
  if (o.tab) { await p.locator('#phc-tab-' + o.tab).click(); await settle(p, 200); await p.locator('[role="tabpanel"]').getByRole('button', { name: btn }).first().click({ timeout: 15000 }).catch(async (e) => { console.log('INFO the tab buttons: ' + (await p.locator('[role="tabpanel"] button').allTextContents()).map((t) => t.trim().slice(0, 30)).join(' | ')); miss(e); }); }
  else await pickAction(p, btn, { timeout: 15000 }).catch(miss);
  await settle(p, 400);
  const choice = await tilesLayer(CHOICE), reach = [...new Set([...(await tilesLayer(REACH)), ...choice])], units = await tilesWith('you can pick them'); // a choice is drawn over its reach
  ok(name + ': selected, its reach or choices shown (reach ' + reach.length + ', tiles ' + choice.length + ', units ' + units.length + ')', reach.length + choice.length + units.length > 0);
  // the review: each action shows the kinds it must (a unit pick its reach too), and its choices lie in its reach
  for (const k of o.need || []) ok(name + ': it shows its ' + k + ' (' + ({ reach, choice, units })[k].length + ')', ({ reach, choice, units })[k].length > 0);
  if (o.subset) ok(name + ': its choices (' + choice.length + ') are a strict subset of its reach (' + reach.length + ')', choice.length > 0 && choice.length < reach.length && choice.every((r) => reach.includes(r)));
  await snap(o.shot + '-1-select');
  // the pointer on a legal pick: the area it covers, whom it touches, or the engine's hover line
  // the legal pick nearest to the unit (a corner tile's area is cut by the map's edge)
  const at = (await me()).pos, near = (l) => [...l].sort((a, b) => { const d = (r) => { const [x, y] = keyOf(r).split(',').map(Number), [ux, uy] = at.split(',').map(Number); return Math.max(Math.abs(x - ux), Math.abs(y - uy)) || 99; }; return d(a) - d(b); })[0];
  const map = (await G()).combat.map, inside = (r) => { if (!o.fit) return true; const [x, y] = keyOf(r).split(',').map(Number); return x >= o.fit && y >= o.fit && x < map.w - o.fit && y < map.h - o.fit; };
  const pick = o.hoverUnit ? near(units) : near(choice.filter(inside)) || near(choice) || near(units);
  if (pick) {
    await tok(keyOf(pick)).hover(); await settle(p, 500);
    const cov = await tilesLayer(AREA), line = await chip();
    ok(name + ': on ' + pick + ', the area (' + cov.length + ' tiles) or the hover line ("' + line.slice(0, 60) + '")', cov.length > 0 || !!line);
    if (o.area) ok(name + ': the area under the pointer is the data\'s ' + o.area + ' tiles (' + cov.length + ')', cov.length === o.area);
    if (o.short) ok(name + ': the hover line stays short (' + line.length + ' characters, at most 90)', line.length > 0 && line.length <= 90);
    if (o.chip) ok(name + ': the hover line leads with ' + o.chip + ' ("' + line.slice(0, 70) + '")', o.chip.test(line));
    await snap(o.shot + '-2-hover');
  } else ok(name + ': a legal pick to hover', false);
  // a click on what it can't take: the refusal by the action box
  if (o.bad) {
    const bad = typeof o.bad === 'function' ? await o.bad({ reach, choice, units }) : o.bad;
    if (!bad) { ok(name + ': an illegal tile to click (none on this map)', true); return; }
    const before = (await G()).combat.log.length;
    await p.mouse.move(5, 5); await tok(bad).click(); await settle(p, 400);
    const d = await dock();
    ok(name + ': a click on ' + ref(bad) + ' it can\'t take says why by the action box ("' + (d.match(/✕[^\n]*/) || [''])[0].slice(0, 70) + '")', /✕/.test(d));
    ok(name + ': and nothing was done', (await G()).combat.log.length === before);
    await snap(o.shot + '-3-refused');
  }
}

// ---------- the Proving Ground: an Operative, Faithful of the Old Overcast, with the Visualizer and a pistol ----------
await openGround(p);
charId = Object.keys((await G()).characters)[0];
await act({ type: 'sandbox/class', charId, classId: 'infiltrator', rank: 3 });
await act({ type: 'sandbox/skill', charId, skill: 'ingenuity', points: 7 });
await act({ type: 'sandbox/skill', charId, skill: 'visualization', points: 6 });
await act({ type: 'sandbox/faith', charId, belief: 'faithful', patron: 'old_overcast', faith: 7, devotion: 10 });
await act({ type: 'sandbox/give', charId, item: 'service_pistol', equip: true });
await act({ type: 'sandbox/give', charId, item: 'visualizer', equip: true });
await act({ type: 'sandbox/give', charId, item: 'standard_core', qty: 3 });
await act({ type: 'door/pick', charId, door: 'visualization', option: 'wall' }); await act({ type: 'door/pick', charId, door: 'visualization', option: 'beast' });
const c0 = (await G()).characters[charId];
ok('set up: Ingenuity ' + c0.skills.ingenuity + ', Visualization ' + c0.skills.visualization + ', Faith ' + c0.skills.faith + ', Devotion ' + c0.devotion, c0.skills.ingenuity >= 7 && c0.skills.faith >= 7 && c0.devotion === 10);
await act({ type: 'sandbox/ai', on: false }); await act({ type: 'sandbox/auto', on: false });
if ((await G()).phase !== 'combat') await act({ type: 'sandbox/fight' });
await p.waitForFunction(() => window.__phc.getState().game?.phase === 'combat', null, { timeout: 30000 });
await act({ type: 'sandbox/clear' });
ok('my turn', await toMe());
// Hidden (no foe on the map), then to the sandbags at I11 (the crate at 8,10: a Vault over it lands on 9,10)
ok('Hidden', (await act({ type: 'combat/hide', unitId: (await me()).id })) === null && !!(await me()).hidden);
ok('walked to H11, beside the sandbags', await walkTo('7,10'));
await act({ type: 'combat/end-turn', unitId: (await me()).id }); await toMe();
await check('Vault', /^Vault/, { shot: 'vault', need: ['reach', 'choice'], subset: true, bad: async ({ choice }) => ['7,12', '5,10', '7,8'].find((k) => !choice.includes(ref(k))) });
await check('Decoy', /^Decoy/, { shot: 'decoy', need: ['reach', 'choice'], bad: '20,20' });
// a technique: a foe in sight; clicking yourself is refused in the engine's words
await act({ type: 'sandbox/spawn', tier: 'soldier', weapon: 'combat_knife', at: ref('11,7'), name: 'Target' }); await settle(p, 400);
await check('a technique (Shot)', /^Shot/, { shot: 'technique', hoverUnit: true, need: ['reach', 'units'], bad: async () => (await me()).pos });
await check('a thrown stim', /^Throw a stim/, { shot: 'stim', hoverUnit: true, need: ['reach', 'units'], chip: /no gain|→|stands again/, bad: emptyNear });
// the Throw row (0.31.6, the outside playtest's "throwables cannot be thrown"): a grenade in the pack is a Throw row on the
// Attack tab; selected, its reach is shaded; on a tile in reach, the blast it covers; a tile past its range is refused
await act({ type: 'sandbox/give', charId, item: 'frag_grenade', qty: 2 }); await settle(p, 300);
await check('the Throw row (a frag grenade)', /^Throw Frag grenade/, { shot: 'throw', tab: 'attack', need: ['reach'], bad: '25,25' });
// 0.31.12 row 1: a stim on yourself, from your own token and from the Backpack's stims row (Use)
{ const stims = async () => (await G()).characters[charId].stims || 0, s0 = await stims();
  await dismissCut(); await p.keyboard.press('Escape').catch(() => {}); await settle(p, 100);
  await p.evaluate(() => { const cb = window.__phc.getState().game.combat, u = cb.units.find((x) => x.charId); u.hp = Math.max(1, Math.floor(u.maxHp / 2)); }); await settle(p, 200); // hurt, so a stim has something to heal
  await p.locator('#phc-tab-utility').click(); await settle(p, 200);
  await p.locator('[role="tabpanel"]').getByRole('button', { name: /^\d*\s*Stim\b/ }).first().click({ timeout: 15000 }).catch((e) => ok('self-stim: its button (' + String(e.message || e).slice(0, 60) + ')', false)); await settle(p, 400);
  await tok((await me()).pos).click(); await settle(p, 400); await snap('stim-self-1-token');
  await p.getByRole('button', { name: 'Confirm', exact: true }).click(); await settle(p, 600);
  ok('a stim on yourself from your own token: one stim used (' + s0 + ' -> ' + (await stims()) + ')', s0 > 0 && (await stims()) === s0 - 1);
  const s1 = await stims(); await dismissCut(); await p.keyboard.press('Escape').catch(() => {}); await settle(p, 100);
  await p.getByRole('button', { name: /Backpack/ }).first().click(); await p.waitForSelector('[data-bp-panel]', { timeout: 30000 }); await settle(p, 300);
  const use = p.locator('[data-bp-row="stims"] button', { hasText: /^Use/ }).first(); await snap('stim-self-2-backpack');
  ok('the Backpack stims row has Use', (await use.count()) > 0 && await use.isEnabled());
  await use.click(); await settle(p, 600); await snap('stim-self-3-backpack-used');
  ok('Backpack Use on the stims row: one stim used (' + s1 + ' -> ' + (await stims()) + ')', s1 > 0 && (await stims()) === s1 - 1);
  await p.keyboard.press('Escape').catch(() => {}); await settle(p, 200); if (await p.locator('[data-bp-panel]').count()) await p.locator('[data-bp-panel] button', { hasText: /Close|✕|×/ }).first().click().catch(() => {}); }
// the FAITH tab: a Whisper, a Hymn with an area, the Miracle
await check('a Whisper (Health)', /^Health/, { shot: 'whisper', hoverUnit: true, need: ['reach', 'units'], chip: /^[^·]*(no gain|→|stands again)/, short: true, bad: emptyNear });
await check('a Hymn with an area (Thunderclap, radius 2)', /^Thunderclap/, { shot: 'hymn', area: 25, fit: 2, need: ['reach', 'choice'], bad: async ({ reach, choice }) => { const out = await p.evaluate(() => [...document.querySelectorAll('button.phc-tok')].map((b) => b.getAttribute('aria-label') || '').filter((l) => l.includes('out of sight')).map((l) => l.split(' · ')[0])); return out[0] ? keyOf(out[0]) : null; } });
await check('the Miracle (The Sky Answers, 5×5)', /The Sky Answers/, { shot: 'miracle', area: 25, fit: 2, need: ['reach', 'choice'] });
// Figments: Picture, then a Beast's Move
await check('Picture', /^Picture/, { shot: 'picture', need: ['reach', 'choice'], bad: '25,25' });
{ const u = await me(), [x, y] = u.pos.split(',').map(Number); let made = null;
  const figs = async () => (await G()).combat.units.filter((v) => v.owned?.kind === 'figment' && !v.dead).length, n0 = await figs();
  for (const k of [x + ',' + (y + 1), (x - 1) + ',' + y, x + ',' + (y - 1), (x - 1) + ',' + (y + 1)]) { await act({ type: 'combat/perk', unitId: u.id, id: 'verb:picture', choice: 'beast', tile: k }); await settle(p, 300); if ((await figs()) > n0) { made = k; break; } }
  ok('a Beast pictured at ' + (made && ref(made)), !!made); await settle(p, 600); }
await check('a Figment\'s Move', /Move/, { shot: 'figment-move', tab: 'figments', need: ['reach', 'choice'], bad: '12,2' });
// Douse: to C2 (the lamp at M4 is 2 tiles off through the blockhouse wall)
await act({ type: 'combat/end-turn', unitId: (await me()).id }); await toMe();
// into the blockhouse (the lamp at M4 is seen from inside): to J5, open the door at K5, step in to L5
ok('walked to J5, by the blockhouse door', (await walkTo('7,1')) && (await walkTo('9,4')));
await act({ type: 'combat/end-turn', unitId: (await me()).id }); await toMe();
{ const e = await act({ type: 'combat/door', unitId: (await me()).id, tile: '10,4' }); await settle(p, 300); const dr = (await G()).combat.objects.find((o) => o.pos === '10,4'); ok('the blockhouse door opened (' + (e || (dr && dr.open ? 'open' : 'shut')) + ')', !!dr && !!dr.open); }
ok('inside the blockhouse at L5, next to the lamp', await walkTo('11,4'));
await act({ type: 'combat/end-turn', unitId: (await me()).id }); await toMe();
await check('Douse', /^Douse/, { shot: 'douse', need: ['reach', 'choice'], subset: true, bad: '11,5' });
await browser.close();
