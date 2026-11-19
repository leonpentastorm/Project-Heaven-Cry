// Figments in the Proving Ground (Classes 3.0 step 8; rules 1.34; docs/design/figments-spec.md section 1): the worked
// example's turn, solo. Visualization 5, a service pistol and the Visualizer (a fresh core, spare cores); a design
// "Hound" (Beast + Swift) kept out of the fight. In the fight: Picture the Hound and a bare Wall (the reducer, as the
// descriptor sends it); the meter line reads FIGMENTS 2/2 and the Visualizer's charge; the Hound's verbs are rows of the
// owner's Utility tab (Move, Strike, Pounce, Let go) priced at their sites; a third Picture is refused in words ("Hold is
// full"); Let go gives charge back; the fight's end unravels what is left. The rows are the engine's descriptors.
import { chromium, BASE, OUT, pause, settle, click, tipOf } from './lib.mjs';
const browser = await chromium.launch();
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { localStorage.setItem('phc.voice', JSON.stringify({ auto: false })); localStorage.setItem('phc.tips', '["*"]'); sessionStorage.setItem('phc.pressedAnyKey', '1'); } catch { /* */ } });
const p = await ctx.newPage();
const errors = []; p.on('pageerror', (e) => errors.push(e.message));
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const G = () => p.evaluate(() => window.__phc.getState().game);
const dismiss = async () => { for (let i = 0; i < 4 && (await p.locator('[data-phc-cutin]').count()); i++) { await p.keyboard.press('Escape'); await pause(p, 300); } };

await p.goto(BASE);
await click(p, 'PROVING GROUND', { timeout: 90000 });
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 20000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 20000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, /^Solo ›/); }
await p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 30000 });
const cid = Object.keys((await G()).characters)[0];

// ---------- set-up: Visualization 6 (rules 1.60: the second fork opens at 6), the pistol, the Visualizer, cores; the design ----------
ok('Visualization 6', (await act({ type: 'sandbox/skill', charId: cid, skill: 'visualization', points: 6 })) === null);
await act({ type: 'sandbox/class', charId: cid, classId: 'marksman', rank: 1 }); // a door user (not the Rigger: its held count is the door's)
await act({ type: 'sandbox/give', charId: cid, item: 'service_pistol', equip: true });
ok('the Visualizer in the off hand', (await act({ type: 'sandbox/give', charId: cid, item: 'visualizer', equip: true })) === null);
await act({ type: 'sandbox/give', charId: cid, item: 'standard_core', qty: 3 });
// rules 1.70 item 5541: forms are learned at the door figment_forms (forms known by Visualization), through door/pick
ok('the forms: the Wall and the Beast learned', (await act({ type: 'door/pick', charId: cid, door: 'figment_forms', option: 'wall' })) === null && (await act({ type: 'door/pick', charId: cid, door: 'figment_forms', option: 'beast' })) === null);
ok('the design Hound (Beast + Swift) kept out of the fight',(await act({ type: 'figments/design', charId: cid, design: { id: 'hound', name: 'Hound', form: 'beast', traits: ['swift'] } })) === null);
await act({ type: 'sandbox/ai', on: false });
await act({ type: 'sandbox/fight' });
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 30000 });
await p.waitForFunction(() => { const cb = window.__phc.getState().game.combat; const u = cb && cb.units.find((x) => x.id === cb.order[cb.turn]); return u && u.side === 'pc'; }, null, { timeout: 30000 });
await dismiss();
const me = async () => (await G()).combat.units.find((u) => u.charId === cid);
const free = async (near) => p.evaluate(({ near }) => { // a free tile 2 to 4 from `near` the PC sees (the engine's canStand / sight)
  const g = window.__phc.getState().game, cb = g.combat, [x0, y0] = near.split(',').map(Number);
  const taken = new Set(cb.units.filter((u) => !u.dead).map((u) => u.pos)), bad = new Set([...(cb.map.solid || []), ...(cb.map.cover || []), ...(cb.map.full || [])]);
  for (let r = 2; r <= 4; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) { const k = (x0 + dx) + ',' + (y0 + dy); if (x0 + dx < 0 || y0 + dy < 0 || x0 + dx >= cb.map.w || y0 + dy >= cb.map.h || taken.has(k) || bad.has(k)) continue; return k; }
  return null; }, { near });
let u = await me();
ok('in the fight: the Visualizer in hand (charge ' + u.mg?.vcharge + ')', !!u.mg?.visualizer && u.mg.vcharge === 10);

// ---------- Picture the Hound, then a Wall ----------
const t1 = await free(u.pos);
const e1 = await act({ type: 'combat/perk', unitId: u.id, id: 'verb:picture', choice: 'd:hound', tile: t1 });
u = await me();
const figs = async () => (await G()).combat.units.filter((x) => x.owned?.kind === 'figment' && x.ctrl === cid && !x.dead);
let F = await figs();
ok('Picture the Hound: 2 AP and 5 charge (' + (e1 || 'done') + '; AP ' + u.ap + ', charge ' + u.mg.vcharge + ')', !e1 && F.length === 1 && F[0].name === 'Hound' && u.mg.vcharge === 5);
const t2 = await free(u.pos);
const e2 = await act({ type: 'combat/perk', unitId: u.id, id: 'verb:picture', choice: 'wall', tile: t2 });
u = await me(); F = await figs();
ok('Picture a bare Wall: 3 charge (' + (e2 || 'done') + ')', !e2 && F.length === 2 && u.mg.vcharge === 2);
await act({ type: 'combat/perk', unitId: u.id, id: 'verb:picture', choice: 'wall', tile: await free(u.pos) }); // a learned form (rules 1.70: an unlearned one is refused before the hold)
await settle(p, 300);
const body = (await p.locator('body').textContent()) || '';
ok('a third Picture is refused in words (' + ((body.match(/Hold is full[^.]*\./) || [])[0] || 'no words') + '; ' + (await figs()).length + ' held)', (await figs()).length === 2 && /Hold is full/.test(body));
const rowVal = (label) => p.evaluate((label) => { const l = [...document.querySelectorAll('.phc-res-line')].find((e) => (e.firstElementChild?.textContent || '').trim().toLowerCase() === label); return l ? [...l.children].map((c) => c.textContent.trim()).filter(Boolean).slice(1).join(' ') : ''; }, label);
const vis = (body.match(/VISUALIZER[^0-9A-Za-z]{0,40}(\d+ ?\/ ?\d+|EMPTY)/) || [])[1] || '';
const meter = ('FIGMENTS ' + (await rowVal('figments')) + ' · VISUALIZER ' + vis).replace(/ \/ /g, '/'); // the row's label and its value, once each
ok('the meter: ' + (meter || 'none: ' + ((body.match(/HP \d+ \/ \d+ · AP.{0,160}/) || [])[0] || '')), meter === 'FIGMENTS 2/2 · VISUALIZER 2/10');

// ---------- the Hound's verbs are the owner's rows, on the Figments tab (Classes 3.0 step 10's integration) ----------
await p.locator('[role="tab"][data-tab="figments"]').click({ timeout: 30000 }).catch(() => {}); await settle(p, 300);
const hound = F.find((x) => x.name === 'Hound'), wall = F.find((x) => x.name !== 'Hound');
const rows = await p.evaluate((id) => [...document.querySelectorAll('[data-act^="ow:' + id + ':"]')].map((e) => e.getAttribute('data-act')), hound.id);
ok('the Hound\'s rows on the FIGMENTS tab: ' + rows.map((r) => r.split(':').pop()).join(', '), ['move', 'figment_strike', 'figment_pounce', 'let_go'].every((v) => rows.includes('ow:' + hound.id + ':' + v)));
// the tab's groups: PICTURE, then one per held Figment headed by its name and the engine's HP
const tabText = ((await p.locator('body').textContent()) || '').toUpperCase();
const head = (x) => (x.name + ' · HP ' + Math.max(0, Math.round(x.hp)) + '/' + x.maxHp).toUpperCase();
ok('the groups: PICTURE, ' + head(hound) + ', ' + head(wall), tabText.includes('PICTURE') && tabText.includes(head(hound)) && tabText.includes(head(wall)));
// each held Figment's header wears its face as its map token does: the portrait when the catalog has one, else the
// token's own badge (its short name in its owner's ring colour); no Figment portrait is painted yet (ART-REQUESTS C6)
const faces = await p.locator('[role="tabpanel"] [data-fig-face]').evaluateAll((els) => els.map((e) => ({ unit: e.getAttribute('data-fig-face'), text: e.textContent.trim(), img: !!e.querySelector('img') })));
await p.locator('[role="tabpanel"]').screenshot({ path: OUT + 'figments-tab.png' }).catch(() => {});
const shorts = await p.evaluate(() => Object.fromEntries(window.__phc.getState().game.combat.units.map((v) => [v.id, v.short || ''])));
ok('each Figment\'s header shows its face (' + faces.map((f) => f.unit + ':' + (f.img ? 'portrait' : f.text)).join(', ') + ')',
  faces.length === 2 && [hound.id, wall.id].every((id) => faces.some((f) => f.unit === id && (f.img || (!!f.text && f.text === shorts[id])))));
// the Visualizer named as the door's focus on its row; a Figment's token names its owner
const meName = (await me()).name;
// 0.31.0: the focus line is the mini meter's hover card; its value (the charge) stays on the row, read without a hover
const vMeter = p.locator('[aria-label="Your resources"] [data-res="vcharge"]');
const vRow = ((await tipOf(vMeter)).match(/Visualizer · (off hand|main hand|in the pack)/) || [])[0] || '';
const vTxt = ((await vMeter.first().textContent().catch(() => '')) || '').replace(/\s+/g, ' ');
ok('the Visualizer meter shows its charge on the row (' + vTxt + ')', /VISUALIZER/.test(vTxt) && /\d+\/\d+/.test(vTxt));
ok('the Visualizer row names the focus (' + (vRow || 'none') + ')', /Visualizer · (off hand|main hand)/.test(vRow));
const tokLabel = await p.evaluate((name) => { const b = [...document.querySelectorAll('button.phc-tok')].find((e) => (e.getAttribute('aria-label') || '').includes(' · ' + name + ' · ')); return b ? b.getAttribute('aria-label') : ''; }, hound.name);
ok('a Figment\'s token reads as ' + meName + '\'s (' + tokLabel.slice(0, 90) + ')', tokLabel.includes(meName + '\'s Figment'));

// ---------- 0.32: an order shown (Redraw: the maker's command, the Figment comes apart and reforms; never a shove's thud) ----------
let redrawSpent = 0;
{ const tR = await free(wall.pos), cR = (await me()).mg.vcharge;
  await p.evaluate(() => { const W = (window.__e2eWatch ||= {}); W.order = { up: null }; const mo = new MutationObserver(() => { if (W.order.up == null && document.querySelector('[data-phc-fig-order]')) W.order.up = performance.now(); }); mo.observe(document.documentElement, { childList: true, subtree: true }); });
  const er = await act({ type: 'combat/owned', unitId: u.id, owned: wall.id, verb: 'figment_redraw', tile: tR });
  const seen = await p.waitForFunction(() => window.__e2eWatch.order.up != null, null, { timeout: 8000 }).catch(() => false).then((x) => x !== false);
  if (seen) { await pause(p, 150); await p.screenshot({ path: OUT + 'figments-redraw.png' }).catch(() => {}); }
  const logT = (await G()).combat.log.join(' ');
  ok('0.32: Redraw is shown (the order mark on the map) and said in the log (' + (er || 'done') + ')', !er && seen && /comes apart and reforms/.test(logT));
  u = await me(); redrawSpent = cR - u.mg.vcharge; }

// ---------- Let go: half its charge back ----------
const c0 = u.mg.vcharge, eg = await act({ type: 'combat/owned', unitId: u.id, owned: hound.id, verb: 'let_go' });
u = await me();
ok('Let go: the Hound is unmade and half its charge comes back (' + c0 + ' → ' + u.mg.vcharge + ')', !eg && u.mg.vcharge === c0 + 2 && (await figs()).length === 1);

// ---------- the fight's end unravels the rest ----------
await act({ type: 'sandbox/stop' }).catch(() => {});
await p.waitForFunction(() => window.__phc.getState().screen !== 'combat', null, { timeout: 30000 }).catch(() => {});
const g2 = await G();
ok('the fight\'s end: no Figment stands; the spent charge stays spent (' + g2.characters[cid].visCharge + ')', !(g2.combat?.units || []).some((x) => x.owned?.kind === 'figment' && !x.dead) && g2.characters[cid].visCharge === 4 - redrawSpent); // (0.32: less the Redraw's own charge, spent above)
ok('no page errors (' + errors.join(' | ').slice(0, 200) + ')', errors.length === 0);
await browser.close();
