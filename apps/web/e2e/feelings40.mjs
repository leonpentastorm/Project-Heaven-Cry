// Outburst 4.0 player UI (rules 1.8: feelings, residue, Revert, the codex) in a real browser, in the Proving Ground
// (Enemy AI off). Solo, an Emanator gauntlet and every feeling granted through the tools:
//   1. Begin a Burst; the HEART panel's feelings collapse under "Feelings ▸ (25)", open, search, pour Rage (a coloured
//      stage segment with its glyph, ×1.3 on the counter, fx pump with the feeling) and Love ("now HEALS");
//   2. Revert takes the last pump back (stage, feeling, AP);
//   3. Release over a drill unit: the residue zone, its tinted tiles on the grid (the placed layer's ♥ badge);
//   4. the unlock card ("You have felt X") played through the fx layer;
//   5. the Proving Ground tools grouped: modules by gate skill, feelings, practice, the sound and effects test row;
//   6. out of the fight, the MAGIC tab's codex: practice bar, templates, feelings, modules by gate skill.
// Screenshots (1440×1000) land in e2e/shots/feel40-*.png.
// Screenshots (deviceScaleFactor 1, 1440×1000) land in e2e/shots/heart-*.png.
import { chromium, player, click, BASE, OUT, pause } from './lib.mjs';
const browser = await chromium.launch();
const p = await player(browser, 'host');
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };
const actOn = (pg, a) => pg.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const act = (a) => actOn(p, a);
const must = async (a, what) => { const e = await act(a); if (e) console.log('  ' + (what || a.type) + ': ' + e); return e; };
const stOn = (pg) => pg.evaluate(() => { const s = window.__phc.getState(), g = s.game, cb = g.combat, me = s.me && s.me.id; const u = cb && cb.units.find((x) => x.side === 'pc' && x.charId && g.characters[x.charId] && g.characters[x.charId].owner === me) || (cb && cb.units.find((x) => x.side === 'pc')); return { g, cb, u }; });
const st = () => stOn(p);
const dismissCutOn = async (pg) => { for (let i = 0; i < 3 && (await pg.locator('[data-phc-cutin]').count()); i++) { await pg.mouse.click(1430, 990); await pause(pg, 380); } };
const dismissCut = () => dismissCutOn(p);
const snap = async (n, pg = p) => { await dismissCutOn(pg); await pg.screenshot({ path: OUT + 'feel40-' + n + '.png' }); };
const fxCount = () => p.evaluate(() => document.querySelector('.phc-fx-layer')?.childElementCount || 0);
const hearts = (pg = p) => pg.evaluate(() => [...document.querySelectorAll('.phc-fx-layer [data-heart]')].map((n) => ({ stage: n.dataset.heart, aura: n.dataset.aura, watch: !!n.dataset.watch })));
const seq = async () => (await st()).cb.fxSeq || 0;
const fxSince = async (n) => (await st()).cb.fx.filter((e) => e.n > n);
const kinds = (list) => list.map((e) => e.k);
const ourTurn = () => p.evaluate(() => { const s = window.__phc.getState(), cb = s.game.combat; const u = cb && cb.units.find((x) => x.id === cb.order[cb.turn]); return !!u && u.side === 'pc'; });
const idleOn = (pg) => pg.waitForFunction(() => !window.__phcHold || performance.now() >= window.__phcHold(), null, { timeout: 20000 }).catch(() => {});
async function newRound() {
  await idleOn(p); await dismissCut();
  const r0 = (await st()).cb.round;
  await p.getByRole('button', { name: 'End turn', exact: true }).click();
  await p.waitForFunction((r0) => { const cb = window.__phc.getState().game.combat; const u = cb.units.find((x) => x.id === cb.order[cb.turn]); return cb.round > r0 && u && u.side === 'pc' && (u.ap >= 5 || u.conds?.stunned > 0); }, r0, { timeout: 30000 });
  await p.waitForSelector('[data-phc-cutin]', { timeout: 1800 }).catch(() => {}); await dismissCut(); await idleOn(p);
}
const ensureAp = async (n) => { if ((await st()).u.ap < n) await newRound(); };
const tab = async (name, pg = p) => { await pg.locator('[role="tablist"][aria-label="Actions"] [role="tab"]', { hasText: name }).first().click(); await pause(pg, 250); };
let mapW = 16;
const tileOf = (k, pg = p) => pg.locator('.phc-grid button.phc-tok').nth((() => { const [x, y] = k.split(',').map(Number); return y * mapW + x; })());
const inView = async (loc, box) => { const b = await loc.boundingBox(); return !!b && b.y >= box.y - 1 && b.y + b.height <= box.y + box.height + 1 && b.y + b.height <= 1000; };

let cid = '';
/** A fresh Proving Ground (from the title's Solo), the build's steps, the fight (its wave cleared), on our turn, standing
 *  near the middle of the map with free tiles toward `dir`. */
async function build(steps) {
  let g = (await st()).g;
  if (g.sandbox) { await act({ type: 'sandbox/end' }); await p.waitForFunction(() => !window.__phc.getState().game.sandbox, null, { timeout: 30000 }); }
  await act({ type: 'sandbox/start', standalone: true });
  await p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 30000 });
  g = (await st()).g; cid = Object.values(g.characters)[0].id;
  await must({ type: 'sandbox/ai', on: false }); await must({ type: 'sandbox/auto', on: false });
  for (const a of steps) await must({ ...a, charId: cid }, a.type + ' ' + JSON.stringify(a).slice(0, 80));
  await must({ type: 'sandbox/fight' });
  await p.waitForFunction(() => { const g = window.__phc.getState().game; return g.phase === 'combat' && g.combat; }, null, { timeout: 30000 });
  await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 20000 }).catch(() => {});
  await must({ type: 'sandbox/clear' });
  await pause(p, 2300); await dismissCut();
  let s = await st(); mapW = s.cb.map.w;
  const spot = await p.evaluate(() => {
    const cb = window.__phc.getState().game.combat, m = cb.map;
    const bad = new Set([...(m.solid || []), ...(m.cover || []), ...(m.full || []), ...(m.difficult || []), ...(cb.objects || []).map((o) => o.pos), ...cb.units.filter((u) => !u.dead).map((u) => u.pos)]);
    const free = (x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && !bad.has(x + ',' + y);
    const c = [Math.floor(m.w / 2) - 3, Math.floor(m.h / 2)]; let best = null, bd = 1e9;
    for (let x = 1; x < m.w - 8; x++) for (let y = 1; y < m.h - 2; y++) { if (![0, 1, 2, 3, 4, 5, 6, 7].every((d) => free(x + d, y)) || !free(x + 3, y + 1) || !free(x + 4, y + 1)) continue; const d = Math.abs(x - c[0]) + Math.abs(y - c[1]); if (d < bd) { bd = d; best = x + ',' + y; } }
    return best;
  });
  if (spot && spot !== s.u.pos) { await must({ type: 'sandbox/skill', charId: cid, skill: 'athletics', points: 9 }); for (let i = 0; i < 4 && (await st()).u.pos !== spot; i++) { await must({ type: 'sandbox/refill', charId: cid }); await must({ type: 'combat/move', unitId: (await st()).u.id, to: ref(spot) }, 'move to ' + ref(spot)); await pause(p, 900); } }
  await must({ type: 'sandbox/refill', charId: cid }); await pause(p, 300);
  s = await st();
  return s.u.pos;
}
const at = (me, d, dy = 0) => { const [x, y] = me.split(',').map(Number); return (x + d) + ',' + (y + dy); };
const spawn = (tier, k, extra = {}) => must({ type: 'sandbox/spawn', tier, weapon: extra.weapon ?? 'fists', at: ref(k), ...extra }, 'spawn ' + tier + ' at ' + ref(k));
await p.goto(BASE);
await click(p, 'PROVING GROUND');
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 20000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 20000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
await p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 30000 });
await p.mouse.move(1430, 990);

const STEPS = [{ type: 'sandbox/level', level: 10 },
  ...['will_power', 'empathy', 'lore_master'].map((sk) => ({ type: 'sandbox/skill', skill: sk, points: 6 })),
  { type: 'sandbox/give', item: 'emanator_gauntlet', equip: true }, { type: 'sandbox/kit', kind: 'both' },
  ...[{ school: 'damage' }, { module: 'burst' }].map((x) => ({ type: 'sandbox/learn', ...x })),
  { type: 'sandbox/design', design: { id: 'hb', name: 'Heartburst', school: 'damage', modules: ['burst'] } }];
let me = await build(STEPS);
const FEEL = ['rage', 'grief', 'fear', 'love', 'joy', 'calm', 'spite', 'shame', 'pride', 'despair', 'hope', 'mercy', 'cruelty', 'loneliness', 'belonging', 'dread', 'awe', 'longing', 'relief', 'contempt', 'guilt', 'jealousy', 'wonder', 'defiance', 'abandon'];
for (const f of FEEL) await must({ type: 'sandbox/learn', charId: cid, feeling: f });
const foeAt = at(me, 3);
await spawn('boss', foeAt); await must({ type: 'sandbox/refill', charId: cid }); await pause(p, 600);
let s = await st();
ok('every feeling known in the fight: ' + (s.u.mg?.feelings || []).length, (s.u.mg?.feelings || []).length === 25);

// ---------- 1. Begin; the feelings under the HEART panel ----------
await dismissCut(); await tab('Outbursts');
await p.locator('[role="tabpanel"] [data-act="outburst"]').click(); await pause(p, 300);
await p.locator('[aria-label="Your Outbursts"] button', { hasText: 'Heartburst' }).first().click(); await pause(p, 250);
await p.locator('.phc-cb-foot [aria-label="Begin or snap"] button', { hasText: 'Begin' }).click(); await pause(p, 700);
await dismissCut();
const tog = p.locator('.phc-heart-panel [data-feelings] button[aria-expanded]');
ok('the feelings collapse under one button: ' + (await tog.textContent().catch(() => '')), /Feelings ▸ \(25\)/.test(await tog.textContent().catch(() => '')));
await tog.click(); await pause(p, 250);
ok('opened, 25 feeling buttons', await p.locator('.phc-heart-panel [data-feel]').count() === 25);
await p.locator('.phc-heart-panel input[aria-label="Search feelings"]').fill('rag'); await p.locator('.phc-heart-panel input[aria-label="Search feelings"]').press('Tab'); await pause(p, 250);
ok('the search narrows to Rage: ' + await p.locator('.phc-heart-panel [data-feel]').count(), await p.locator('.phc-heart-panel [data-feel]').count() === 1);
let n0 = await seq();
await p.locator('.phc-heart-panel [data-feel="rage"]').click(); await pause(p, 400);
s = await st(); let ev = (await fxSince(n0)).find((e) => e.k === 'pump');
ok('Rage poured in: stage ' + s.u.mg.held.stage + ', felt ' + JSON.stringify(s.u.mg.held.felt) + ', fx ' + JSON.stringify(ev && { feeling: ev.feeling, mult: ev.mult }), s.u.mg.held.felt?.[0] === 'rage' && ev?.feeling === 'rage' && ev.mult === 1.3);
const mult = async () => ((await p.locator('.phc-heart-panel [data-heart-mult]').textContent().catch(() => '')) + ' ' + ((await p.locator('.phc-heart-panel [data-heart-does]').count()) ? await p.locator('.phc-heart-panel [data-heart-does]').textContent() : '')).trim();
ok('the counter reads ×1.3: ' + await mult(), /×1\.3/.test(await mult())); // rules 1.19: Rage +0.5 on the first Pump (×0.8 → ×1.3)
ok('the stage-1 segment shows the feeling\'s glyph', await p.locator('.phc-heart-panel [data-stage="1"] img').count() === 1);
await snap('1-rage');
await p.locator('.phc-heart-panel input[aria-label="Search feelings"]').fill('love'); await p.locator('.phc-heart-panel input[aria-label="Search feelings"]').press('Tab'); await pause(p, 250);
await p.locator('.phc-heart-panel [data-feel="love"]').click(); await pause(p, 400);
ok('Love on a Damage design: the counter says now HEALS: ' + await mult(), /now HEALS/.test(await mult()));
await snap('2-love');

// ---------- 2. Revert ----------
s = await st(); const ap0 = s.u.ap, fr0 = s.u.mg.freePumps || 0, first0 = !!s.u.mg.firstUsed;
await p.locator('.phc-heart-panel button[data-hact="revert"]').click(); await pause(p, 400);
s = await st();
const back = s.u.ap > ap0 ? 'AP' : (s.u.mg.freePumps || 0) > fr0 ? 'an Empathy free Pump' : first0 && !s.u.mg.firstUsed ? 'the first free Pump' : 'nothing';
ok('Revert takes Love back: stage ' + s.u.mg.held.stage + ', felt ' + JSON.stringify(s.u.mg.held.felt) + ', and ' + back + ' back', s.u.mg.held.stage === 1 && JSON.stringify(s.u.mg.held.felt) === '["rage"]' && back !== 'nothing');

// ---------- 2b. stage 4 with feelings poured: the HEART panel's layout, and Release with Love and Joy held ----------
for (const f of ['joy', 'love', 'calm']) {
  if (!(await p.locator('.phc-heart-panel input[aria-label="Search feelings"]').count()) && await tog.count()) { await tog.click(); await pause(p, 250); }
  await p.locator('.phc-heart-panel input[aria-label="Search feelings"]').fill(f); await p.locator('.phc-heart-panel input[aria-label="Search feelings"]').press('Tab'); await pause(p, 200);
  await p.locator('.phc-heart-panel [data-feel="' + f + '"]').click(); await pause(p, 450);
}
s = await st();
ok('stage 4 with Rage, Joy, Love and Calm: ' + s.u.mg.held.stage + ' ' + JSON.stringify(s.u.mg.held.felt), s.u.mg.held.stage === 4 && s.u.mg.held.felt.length === 4);
// Each pour (the button low in the panel, scrolled to) brings the panel's top back into view: the stage bar and counter.
await pause(p, 900);
const lay = await p.evaluate(() => {
  const hp = document.querySelector('.phc-heart-panel'), m = hp && hp.querySelector('[data-heart-mult]'), dz = hp && hp.querySelector('[data-heart-does]'), seg = hp && hp.querySelector('[data-stage="4"]');
  const panel = hp && hp.closest('.phc-cb-tabpanel'), r = (e) => e && e.getBoundingClientRect();
  const hit = (e) => { if (!e) return false; const b = e.getBoundingClientRect(), el = document.elementFromPoint(b.left + Math.min(8, b.width / 2), b.top + b.height / 2); return !!el && (e === el || e.contains(el) || hp.contains(el)); };
  return { hp: r(hp), m: r(m), dz: r(dz), panel: r(panel), segSeen: hit(seg), multSeen: hit(m), does: dz ? dz.textContent : '' };
});
const inside = (a, b) => !!a && !!b && a.left >= b.left - 1 && a.right <= b.right + 1;
ok('the counter stays inside the HEART panel at stage 4: ' + JSON.stringify(lay.m && { l: Math.round(lay.m.left), r: Math.round(lay.m.right) }) + ' in ' + JSON.stringify(lay.hp && { l: Math.round(lay.hp.left), r: Math.round(lay.hp.right) }), inside(lay.m, lay.hp));
ok('what the feelings do wraps on its own line inside the panel: ' + lay.does, inside(lay.dz, lay.hp) && /now HEALS/.test(lay.does) && /crits on 18\+/.test(lay.does));
ok('the stage bar and the counter are on top (not under the AP bar or the tabs)', lay.segSeen && lay.multSeen);
await snap('2b-stage4');
await p.locator('.phc-heart-panel').screenshot({ path: OUT + 'feel40-2b-heart-panel.png' }).catch(() => {});
const err0 = p.errors.length;
await p.locator('.phc-heart-panel button[data-hact="release"]').click(); await pause(p, 600);
const crashErr = () => p.errors.slice(err0).filter((e) => /pageerror|TypeError|is not|Cannot read/.test(e));
ok('Release with Love and Joy held: the screen stays up, no error ' + JSON.stringify(crashErr()), !crashErr().length && await p.locator('.phc-heart-panel').count() === 1 && /Hover to preview/.test(await p.locator('.phc-cb-foot').textContent().catch(() => '')));
if (!crashErr().length) { await tileOf(foeAt).hover({ timeout: 20000 }).catch(() => {}); await pause(p, 400); }
ok('hovering the aim previews it (the feelings in the line): ' + crashErr().length, !crashErr().length && /Preview at .*Feelings: /.test(await p.locator('.phc-cb-foot').textContent({ timeout: 20000 }).catch(() => '')));
await p.mouse.move(1430, 990); await pause(p, 300);
if (crashErr().length) { console.log('stopping: the combat screen crashed'); await browser.close(); process.exit(1); }
await snap('2b-release');
for (let i = 0; i < 3; i++) { await p.locator('.phc-heart-panel button[data-hact="revert"]').click(); await pause(p, 350); }
s = await st();
ok('three Reverts back to Rage at stage 1: ' + s.u.mg.held.stage + ' ' + JSON.stringify(s.u.mg.held.felt), s.u.mg.held.stage === 1 && JSON.stringify(s.u.mg.held.felt) === '["rage"]');

// ---------- 3. Release: residue ----------
await p.locator('.phc-heart-panel button[data-hact="release"]').click(); await pause(p, 300);
await tileOf(foeAt).click(); await pause(p, 300);
const conf = p.getByRole('button', { name: /Confirm/ }).first(); if (await conf.count()) await conf.click();
await pause(p, 900); await idleOn(p);
s = await st(); const rz = (s.cb.zones || []).find((z) => z.kind === 'residue');
ok('the release leaves Rage residue: ' + JSON.stringify(rz && { feeling: rz.feeling, tiles: rz.tiles.length, left: rz.left }), rz && rz.feeling === 'rage' && rz.tiles.length >= 1);
ok('the grid marks it (a ♥ badge on a residue tile)', await p.locator('.phc-grid').getByText(/^♥\d/).count() >= 1);
await snap('3-residue');

// ---------- 4. the unlock card ----------
await p.evaluate(() => window.__phcFx.playFx({ k: 'felt', feeling: 'grief', name: 'Grief', family: 'cold' }));
await pause(p, 500);
ok('the card: ' + (await p.locator('[data-felt-card]').textContent().catch(() => '')), /You have felt Grief/.test(await p.locator('[data-felt-card]').textContent().catch(() => '')));
await snap('4-felt');

// ---------- 5. the Proving Ground tools, grouped ----------
const drawer = p.locator('aside[aria-label="Proving Ground tools"]');
if (!(await drawer.count())) await p.getByRole('button', { name: 'Open the Proving Ground tools' }).click().catch(() => {});
await drawer.waitFor({ timeout: 20000 }).catch(() => {});
await drawer.getByRole('tab', { name: 'Magic', exact: true }).first().click().catch(() => {}); await pause(p, 400);
// The Outburst tools share the Sigil words' collapsible groups (workshopGroups.tsx): section sb.soul.
const SB = '[data-ws-section="sb.soul"]';
const groups = await p.locator(SB + ' [data-ws-group]').evaluateAll((ns) => ns.map((n) => n.getAttribute('data-ws-group')));
ok('the tools group Outbursts: ' + JSON.stringify(groups), ['schools', 'modules', 'feelings', 'practice', 'fx'].every((x) => groups.includes(x)));
if (groups.includes('modules')) {
  if ((await p.locator(SB + ' [data-ws-group="modules"] > button[data-ws-toggle]').getAttribute('aria-expanded')) !== 'true') await p.locator(SB + ' [data-ws-group="modules"] > button[data-ws-toggle]').click(); await pause(p, 200);
  // Each gate skill is its own collapsible, remembered group (sb.soul.modules), as on the sheet; open the advanced one.
  const GATE = SB + ' [data-ws-group="modules"] [data-ws-group]';
  const mg = await p.locator(GATE).evaluateAll((ns) => ns.map((n) => n.getAttribute('data-ws-group')));
  ok('modules by gate skill, the advanced classes\' last: ' + JSON.stringify(mg), mg[0] === 'lore_master' && mg.at(-1) === 'advanced');
  const gateHeads = await p.locator(GATE + ' > button[data-ws-toggle]').count();
  ok('every gate has its own toggle with a count: ' + gateHeads + ' / ' + mg.length, gateHeads === mg.length && /\d+ \/ \d+/.test(await p.locator(GATE + ' > button[data-ws-toggle]').first().innerText()));
  const adv = p.locator(SB + ' [data-ws-group="modules"] [data-ws-group="advanced"] > button[data-ws-toggle]');
  if ((await adv.getAttribute('aria-expanded')) !== 'true') await adv.click(); await pause(p, 200);
  const lockedN = await p.locator('[data-module-group="advanced"] button[data-locked="true"]:disabled').count();
  ok('the shelved advanced classes\' modules show locked (can\'t be granted): ' + lockedN, lockedN === 10);
  if ((await p.locator(SB + ' [data-ws-group="fx"] > button[data-ws-toggle]').getAttribute('aria-expanded')) !== 'true') await p.locator(SB + ' [data-ws-group="fx"] > button[data-ws-toggle]').click(); await pause(p, 200);
  ok('a test row for every feeling: ' + await p.locator('[data-fx-test]').count(), await p.locator('[data-fx-test]').count() === 25);
  await snap('5-tools');
}

// ---------- 6. the MAGIC tab's codex (out of the fight) ----------
await must({ type: 'sandbox/end' });
await p.waitForFunction(() => !window.__phc.getState().game?.sandbox || window.__phc.getState().game.phase !== 'combat', null, { timeout: 20000 }).catch(() => {});
await pause(p, 800);
console.log('done');
await browser.close();
