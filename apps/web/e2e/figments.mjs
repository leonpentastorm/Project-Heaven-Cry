// Figments in the Proving Ground (Classes 3.0 step 8; rules 1.34; docs/design/figments-spec.md section 1): the worked
// example's turn, solo. Visualization 5, a service pistol and the Visualizer (a fresh core, spare cores); a design
// "Hound" (Beast + Swift) kept out of the fight. In the fight: Picture the Hound and a bare Wall (the reducer, as the
// descriptor sends it); the meter line reads FIGMENTS 2/2 and the Visualizer's charge; the Hound's verbs are rows of the
// owner's Utility tab (Move, Strike, Pounce, Let go) priced at their sites; a third Picture is refused in words ("Hold is
// full"); Let go gives charge back; the fight's end unravels what is left. The rows are the engine's descriptors.
import { chromium, BASE, pause, settle, click } from './lib.mjs';
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

// ---------- set-up: Visualization 5, the pistol, the Visualizer, cores; the design ----------
ok('Visualization 5', (await act({ type: 'sandbox/skill', charId: cid, skill: 'visualization', points: 5 })) === null);
await act({ type: 'sandbox/give', charId: cid, item: 'service_pistol', equip: true });
ok('the Visualizer in the off hand', (await act({ type: 'sandbox/give', charId: cid, item: 'visualizer', equip: true })) === null);
await act({ type: 'sandbox/give', charId: cid, item: 'standard_core', qty: 3 });
ok('the design Hound (Beast + Swift) kept out of the fight', (await act({ type: 'figments/design', charId: cid, design: { id: 'hound', name: 'Hound', form: 'beast', traits: ['swift'] } })) === null);
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
const e3 = await act({ type: 'combat/perk', unitId: u.id, id: 'verb:picture', choice: 'double', tile: await free(u.pos) });
ok('a third Picture is refused in words (' + e3 + ')', /Hold is full/.test(e3 || ''));
await settle(p, 300);
const body = (await p.locator('body').textContent()) || '';
ok('the meter line: FIGMENTS 2/2 · VISUALIZER 2/10', /FIGMENTS 2\/2/.test(body) && /VISUALIZER 2\/10/.test(body));

// ---------- the Hound's verbs are the owner's rows (Utility) ----------
await p.locator('[role="tab"][data-tab="utility"]').click().catch(() => {}); await settle(p, 300);
const hound = F.find((x) => x.name === 'Hound');
const rows = await p.evaluate((id) => [...document.querySelectorAll('[data-act^="ow:' + id + ':"]')].map((e) => e.getAttribute('data-act')), hound.id);
ok('the Hound\'s rows: ' + rows.map((r) => r.split(':').pop()).join(', '), ['move', 'figment_strike', 'figment_pounce', 'let_go'].every((v) => rows.includes('ow:' + hound.id + ':' + v)));

// ---------- Let go: half its charge back ----------
const c0 = u.mg.vcharge, eg = await act({ type: 'combat/owned', unitId: u.id, owned: hound.id, verb: 'let_go' });
u = await me();
ok('Let go: the Hound is unmade and half its charge comes back (' + c0 + ' → ' + u.mg.vcharge + ')', !eg && u.mg.vcharge === c0 + 2 && (await figs()).length === 1);

// ---------- the fight's end unravels the rest ----------
await act({ type: 'sandbox/stop' }).catch(() => {});
await p.waitForFunction(() => window.__phc.getState().screen !== 'combat', null, { timeout: 30000 }).catch(() => {});
const g2 = await G();
ok('the fight\'s end: no Figment stands; the spent charge stays spent (' + g2.characters[cid].visCharge + ')', !(g2.combat?.units || []).some((x) => x.owned?.kind === 'figment' && !x.dead) && g2.characters[cid].visCharge === 4);
ok('no page errors (' + errors.join(' | ').slice(0, 200) + ')', errors.length === 0);
await browser.close();
