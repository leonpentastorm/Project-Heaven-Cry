// The fight's banners (rules 1.62 item 4900; Leon on live 0.29.0: "Need a Big ass Battle start, battle finish (won/lost)
// and a Free roam banner. appear on the screen for at least 1.25s"; docs/design/ui-screens.md "The fight cards"): BATTLE
// START as a fight begins, VICTORY or DEFEAT when it ends, FREE ROAM as a run's field opens: big banners in the middle of
// the screen (game/turnIntro.tsx BigBanner), each on screen at least rules.json combat.cards.hold_ms, no click, clear of
// the action bar. In a Survival test room: node 1's BATTLE START plays before the first turn's banner; VICTORY (the
// run's line of what follows, from data) once the fight is won, then FREE ROAM; leaving the field goes straight to the
// rewards with no end card (rules 1.62 item 4903); the next fight's BATTLE START
// under reduced motion (shown, not moved); a reload in the middle of it shows no FIGHT again; DEFEAT once the
// squad falls, after the fight's last effect has played. Each card once, read from its data-phc-card attribute.
import { readFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { chromium, player, click, hostAs, lockIn, until, settle, pause, OUT, campStart, campConfirmGo, sidePanels } from './lib.mjs';
const SHOTS = process.env.SHOTS || OUT;
// PHC_SHOTS=1: the ambush screens for the lead (rules 1.87), at 1280 x 720, in .check/ambush-033/
const AMBUSH_SHOTS = process.env.PHC_SHOTS ? fileURLToPath(new URL('../../../.check/ambush-033', import.meta.url)) : null;
if (AMBUSH_SHOTS) mkdirSync(AMBUSH_SHOTS, { recursive: true });
const SVD = JSON.parse(readFileSync(new URL('../../../data/survival.json', import.meta.url), 'utf8'));
const CARDS = JSON.parse(readFileSync(new URL('../../../data/rules.json', import.meta.url), 'utf8')).combat.cards;
// The engine's dice (packages/engine/src/rng.ts): a state whose next d20 is v.
function nextR(r) { let t = (r.state = (r.state + 0x6d2b79f5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const dieSeed = (v) => { for (let s = 1; s < 1e7; s++) { const r = { state: s }; if (1 + Math.floor(nextR(r) * 20) === v) return s; } return 1; };
const browser = await chromium.launch();
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const p = await player(browser, 'host', { play: 'survival' });
await p.context().addInitScript(() => { try { localStorage.setItem('phc.testRoom', '1'); localStorage.setItem('phc.testSeed', 'PHC-0046'); } catch { /* */ } });
// Every card the page shows, once each (by its id), with when it came, what it said and how it moved; and the effects
// and turn banners as they play (the cards' places in the queue).
await p.context().addInitScript(() => {
  const w = window; w.__cards = []; w.__fxT = []; w.__turnT = []; const seen = new Set();
  const look = () => { const now = new Set();
    for (const el of document.querySelectorAll('[data-phc-card]')) { const id = el.getAttribute('data-phc-card-id'); now.add(id); if (seen.has(id)) continue; seen.add(id);
      const inner = el.firstElementChild, r = inner ? inner.getBoundingClientRect() : null;
      w.__cards.push({ kind: el.getAttribute('data-phc-card'), id, t: performance.now(), after: el.getAttribute('data-phc-card-after'), text: el.textContent || '', anim: inner ? getComputedStyle(inner).animationName : '', box: r ? Math.round(r.height) : 0,
        big: el.hasAttribute('data-phc-big'), hold: Number(el.getAttribute('data-phc-card-hold') || 0), pe: getComputedStyle(el).pointerEvents, bottom: r ? Math.round(r.bottom) : 0, vh: innerHeight }); }
    for (const c of w.__cards) if (!c.gone && !now.has(c.id)) c.gone = performance.now(); };
  new MutationObserver(look).observe(document, { childList: true, subtree: true });
  w.addEventListener('phc-fx', (e) => { const d = e.detail; if (d && d.n) w.__fxT.push({ t: performance.now(), n: d.n, k: d.k }); });
  w.addEventListener('phc:turn-shown', (e) => { w.__turnT.push({ t: performance.now(), mine: !!e.detail?.mine }); });
  // 0.31.1: the leave control and the end panel, every frame (the panel comes first; the leave control is never seen with it)
  w.__leave = []; const vis = (el) => !!el && getComputedStyle(el).visibility !== 'hidden' && el.getBoundingClientRect().height > 0;
  const tick = () => { const lv = vis(document.querySelector('[data-phc-field-leave]')), pn = !!document.querySelector('[data-phc-end]');
    const last = w.__leave[w.__leave.length - 1]; if (!last || last.lv !== lv || last.pn !== pn) w.__leave.push({ t: performance.now(), lv, pn }); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
});
await p.setViewportSize({ width: 1280, height: 720 });
const G = () => p.evaluate(() => window.__phc.getState().game);
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const cards = (kind) => p.evaluate((kind) => window.__cards.filter((c) => !kind || c.kind === kind), kind);
const waitCard = (kind, n = 1, timeout = 60000) => p.waitForFunction(({ kind, n }) => window.__cards.filter((c) => c.kind === kind).length >= n, { kind, n }, { timeout, polling: 20 }).then(() => true, () => false);
// Two fights in a row: a first-row fight with a fight among its links (the run's own map, read from the state).
const route = () => p.evaluate(() => { const r = window.__phc.getState().game.run, at = (id) => r.nodes.find((m) => m.id === id), fight = (n) => !!n && n.kind === 'fight';
  const a = r.nodes.find((n) => n.depth === 1 && fight(n) && n.links.some((l) => fight(at(l)))); return a ? [a.id, a.links.find((l) => fight(at(l)))] : null; });

// ---------- the room, a character, the camp ----------
await hostAs(p, 'Leon');
await click(p, 'Create a character');
await p.getByPlaceholder('What the squad calls you').fill('Kade');
await p.locator('main button[aria-pressed]').first().click();
await click(p, 'Next ›');
await p.locator('button', { hasText: /^Use .* ›$/ }).first().click();
await click(p, 'Next ›'); await click(p, 'Next ›'); await click(p, 'Next ›');
await click(p, 'Next ›'); await lockIn(p);
await p.waitForSelector('text=✓ LOCKED IN');
await click(p, 'Start the run'); await campConfirmGo(p); // item E: a level-up due asks first; go on without it
await campStart(p);
await p.waitForSelector('[data-phc-run-screen]', { timeout: 60000 });
ok('no fight card outside a fight (the lobby, the camp, the path map)', (await cards()).filter((c) => c.kind !== 'turn' && c.kind !== 'round').length === 0);

// ---------- node 1: FIGHT, then the first turn's banner ----------
const way = await route();
ok('the map has two fights in a row from the first row (' + (way || []).join(' then ') + ')', !!way);
const [n1, n2] = way || [];
await p.locator('[data-phc-node="' + n1 + '"]').click();
// rules 1.87 items 7500, 7501, 7511: a fight node asks first (Walk in or Try an ambush): no fight, no BATTLE START yet
await p.waitForSelector('[data-phc-engage-screen]', { timeout: 60000 });
{ const odds = (await p.locator('[data-phc-ambush-odds]').textContent()) || '';
  ok('rules 1.87: a fight node stops at the engage screen (run ' + (await G()).run.state + '), Walk in and Try an ambush offered, the odds "' + odds + '" with TN and %', (await G()).run.state === 'engage' && !(await G()).combat
    && await p.locator('[data-phc-engage="walk"]').isEnabled() && await p.locator('[data-phc-engage="ambush"]').isEnabled() && /TN \d+/.test(odds) && /\d+%/.test(odds) && (await cards('fight')).length === 0); }
await sidePanels(p, 'the engage screen');
if (AMBUSH_SHOTS) { await p.mouse.move(2, 2); await pause(p, 400); await p.screenshot({ path: AMBUSH_SHOTS + '/engage-solo.png' }); }
await p.locator('[data-phc-engage="walk"]').click();
await p.waitForFunction(() => window.__phc?.getState().screen === 'combat', null, { timeout: 90000 });
const turnSkip = 0;
ok('Walk in: the fight starts joined at round 1, no ambush roll (rules 1.87 item 7502)', !(await G()).combat.opening?.ambush && (await G()).combat.round === 1);
ok('BATTLE START comes up as the fight is joined', await waitCard('fight'));
await pause(p, 260); await p.screenshot({ path: SHOTS + '/card-fight.png' });
await p.waitForFunction((n) => window.__turnT.length > n, turnSkip, { timeout: 60000 }).catch(() => {});
let g = await G();
{ const f = (await cards('fight'))[0], turn0 = (await p.evaluate((n) => window.__turnT[n] || window.__turnT[window.__turnT.length - 1], turnSkip)) || null;
  ok('… with the fight\'s name from the engine (' + g.combat.name + ') and who goes first', !!f && f.text.toUpperCase().includes(g.combat.name.toUpperCase()) && /GO(ES)? FIRST/i.test(f.text));
  ok('… before the first turn\'s banner (FIGHT at ' + Math.round(f?.t) + ' ms, the first turn at ' + Math.round(turn0?.t) + ' ms)', !!f && !!turn0 && f.t < turn0.t);
  ok('… big, in the middle, its own slide (' + f?.anim + '), the data\'s words (' + CARDS.joined.name + ')', !!f && f.big && /^phcBig\w/.test(f.anim) && !/^phcBigFade/.test(f.anim) && f.text.includes(CARDS.joined.name));
  ok('… takes no click (' + f?.pe + ') and stays clear of the action bar (bottom ' + f?.bottom + ' of ' + f?.vh + ')', f?.pe === 'none' && f.bottom < f.vh * 0.62); }
await pause(p, 1500);
{ const f = (await cards('fight'))[0]; ok('… on screen at least the data\'s hold (' + Math.round((f?.gone || 0) - (f?.t || 0)) + ' ms ≥ ' + CARDS.hold_ms + ')', !!f && f.hold === CARDS.hold_ms && f.gone - f.t >= CARDS.hold_ms); }

// ---------- won: VICTORY, with the run's line of what follows ----------
const fx1 = await p.evaluate(() => window.__fxT.length);
// 0.33 (Leon on live 0.32.0: "It still take like legit 30 second after you kill the last enemy for victory to show up"):
// won by a real last kill, not run/skip: the falling foe side's sight effects the squad's view never holds came after the
// kill, and the panel waited for them by its 20 s safety net. Set-up by hand (as fog-victory.test.ts): every foe but one
// fallen, the last on 1 HP beside the squad's character; then its real strike.
for (let i = 0; i < 120; i++) { const up = await p.evaluate(() => { const cb = window.__phc.getState().game.combat, u = cb && cb.units.find((x) => x.id === cb.order[cb.turn]); return !!(u && u.charId) && !(window.__phcHold?.() > performance.now()); }); if (up) break; await pause(p, 500); }
const kill = await p.evaluate(() => { const g = window.__phc.truth(), cb = g.combat, pc = cb.units.find((x) => x.id === cb.order[cb.turn] && x.charId); if (!pc) return null; const [px, py] = pc.pos.split(',').map(Number);
  const foes = cb.units.filter((x) => x.side === 'foe' && !x.dead); for (const f of foes.slice(1)) { f.hp = 0; f.dead = true; }
  const last = foes[0], taken = new Set(cb.units.filter((v) => !v.dead && v !== last).map((v) => v.pos)), bad = new Set([...(cb.map.solid || []), ...(cb.map.cover || []), ...(cb.map.full || [])]);
  last.hp = 1; last.hidden = false; last.pos = [[1, 0], [0, 1], [-1, 0], [0, -1]].map(([dx, dy]) => (px + dx) + ',' + (py + dy)).find((k) => !taken.has(k) && !bad.has(k)); pc.ap = 9; return { pc: pc.id, last: last.id }; });
let killAt = 0;
if (!kill) console.log('(no character turn came up for the set-up kill)');
if (kill) for (let k = 0; k < 6; k++) { killAt = await p.evaluate(() => performance.now()); const ke = await act({ type: 'combat/attack', unitId: kill.pc, targetId: kill.last, mode: 'melee' }); if (ke) console.log('(the strike: ' + ke + ')'); if ((await G()).run?.state === 'field') break; }
if ((await G()).run?.state !== 'field') { console.log('(the strike did not end it: run/skip)'); killAt = 0; ok('the fight is won (run/skip, the test room\'s)', (await act({ type: 'run/skip' })) === null); }
ok('VICTORY comes up when it is won', await waitCard('victory'));
{ const v = (await cards('victory'))[0]; ok('0.33: VICTORY within 2.5 s of the last kill (' + (killAt ? ((v.t - killAt) / 1000).toFixed(2) + ' s' : 'no real kill') + ')', !!killAt && !!v && v.t - killAt <= 2500); }
await pause(p, 260); await p.screenshot({ path: SHOTS + '/card-victory.png' });
{ const v = (await cards('victory'))[0], lastFx = await p.evaluate(() => window.__fxT.at(-1)?.t || 0);
  ok('… with what follows, from data (' + v?.after + ')', v?.after === SVD.run.after_fight.won && v.text.includes(SVD.run.after_fight.won));
  ok('… after the fight\'s last effect has played (' + Math.round(v?.t) + ' ≥ ' + Math.round(lastFx) + ')', !!v && v.t >= lastFx);
  const stats = (await p.locator('[data-phc-end-stats]').textContent().catch(() => '')) || '';
  ok('… a panel with the fight\'s lines from the engine (' + stats + ')', stats.toUpperCase().includes(CARDS.end.felled.toUpperCase()) && (await p.locator('[data-phc-end]').count()) === 1);
  ok('… the leave control is not visible while the panel is', !(await p.locator('[data-phc-field-leave]').isVisible().catch(() => false))); }
void fx1;
ok('FREE ROAM comes up after VICTORY as the field opens', await waitCard('field'));
{ const v = (await cards('victory'))[0], m = (await cards('field'))[0];
  ok('… after VICTORY has gone (VICTORY ' + Math.round(v?.t) + ' to ' + Math.round(v?.gone) + ' ms, FREE ROAM at ' + Math.round(m?.t) + ' ms)', !!v && !!m && !!v.gone && m.t >= v.gone - 50);
  ok('… with the field\'s words and its rounds, from data (' + m?.text + ')', !!m && m.text.includes(SVD.run.after_fight.field.name) && m.text.includes(String(SVD.field.rounds)));
  ok('… VICTORY on screen at least the data\'s hold (' + Math.round((v?.gone || 0) - (v?.t || 0)) + ' ms)', !!v && v.gone - v.t >= CARDS.hold_ms);
  ok('… and at least the end panel\'s hold, 2.5 s or more (' + CARDS.end.hold_ms + ')', !!v && CARDS.end.hold_ms >= 2500 && v.gone - v.t >= CARDS.end.hold_ms);
  const L = await p.evaluate(() => window.__leave), firstLeave = L.find((x) => x.lv), firstPanel = L.find((x) => x.pn);
  ok('… the panel came before the leave control (panel at ' + Math.round(firstPanel?.t) + ', leave at ' + Math.round(firstLeave?.t) + ' ms) and never beside it', !!firstPanel && !!firstLeave && firstPanel.t < firstLeave.t && !L.some((x) => x.lv && x.pn));
  ok('… its sounds are named in data (' + CARDS.end.won.sounds.join(' ') + ' / ' + CARDS.end.lost.sounds.join(' ') + ')', CARDS.end.won.sounds.length > 0 && CARDS.end.lost.sounds.length > 0); }
await pause(p, 2500);
ok('one BATTLE START, one VICTORY and one FREE ROAM for the fight, no DEFEAT', (await cards('fight')).length === 1 && (await cards('victory')).length === 1 && (await cards('field')).length === 1 && !(await cards('defeat')).length);

// ---------- the next fight, under reduced motion; a reload in the middle of it ----------
await p.locator('[data-phc-field-leave]').click({ timeout: 60000 }); await p.waitForFunction(() => window.__phc.getState().game.run.state !== 'field', null, { timeout: 30000 }); // rules 1.55: the field, left at once
await p.waitForSelector('[data-phc-offer]', { timeout: 30000 }); // rules 1.62 item 4903: straight to the rewards, no click
ok('leaving the field goes straight to the rewards: no end card, no click', (await p.locator('[role="dialog"][aria-label="The fight is over"]').count()) === 0);
g = await G();
const cid = Object.keys(g.characters)[0];
ok('the reward taken as the materials (rules 1.54 item 2)', (await act({ type: 'run/pick', charId: cid, choice: 'materials' })) === null);
await p.waitForFunction(() => window.__phc.getState().game.run.state === 'map', null, { timeout: 30000 });
await p.emulateMedia({ reducedMotion: 'reduce' });
await p.locator('[data-phc-node="' + n2 + '"]').click();
// rules 1.87 items 7503, 7507, 7508: Try an ambush, solo, the roll lost (the game's next d20 a natural 1): the fumble, no
// free turn, the character's damage, the ENEMY ADVANTAGE banner with the roll's sum and TN
await p.waitForSelector('[data-phc-engage="ambush"]', { timeout: 60000 });
const hpBefore = (await G()).characters[cid].hp;
await p.evaluate((d) => { window.__phc.getState().game.rng.state = d; }, dieSeed(1));
await p.locator('[data-phc-engage="ambush"]').click();
ok('the next fight has its own opening banner (a fight of the same template is no longer skipped)', await waitCard('fight', 2));
{ const f2 = (await cards('fight'))[1], cb = (await G()).combat, o = cb.opening || {}, me = cb.units.find((u) => u.charId === cid);
  ok('Try an ambush lost solo: a fumble, ENEMY ADVANTAGE with the roll\'s total and TN ("' + (f2?.text || '').slice(0, 90) + '")', o.ambush && o.won === false && !!f2 && f2.text.includes(CARDS.ambush_lost.name) && f2.text.includes(String(o.total)) && f2.text.includes(String(o.tn)) && !f2.text.includes(CARDS.joined.name));
  ok('… the fumble: no free turn (nobody caught), ' + Math.max(0, hpBefore - me?.hp) + ' damage = opening.fumble.dmg (' + o.fumble?.dmg + ')', !!o.fumble && o.fumble.dmg > 0 && me.hp === hpBefore - o.fumble.dmg && !cb.units.some((u) => u.caught));
  ok('… under reduced motion it is shown, not moving (animation ' + f2?.anim + ', ' + f2?.box + ' px tall)', /^(phcBigFade|none)/.test(f2?.anim || '') && f2.box > 0);
  if (AMBUSH_SHOTS) { await pause(p, 300); await p.screenshot({ path: AMBUSH_SHOTS + '/banner-enemy-advantage.png' }); } }
await p.waitForFunction(() => window.__turnT.length > 1, null, { timeout: 60000 }).catch(() => {});
await pause(p, 1500);
await p.reload();
await p.waitForFunction(() => window.__phc?.getState().screen === 'combat', null, { timeout: 90000 });
await p.waitForFunction(() => window.__turnT.length > 0, null, { timeout: 60000 }).catch(() => {});
await pause(p, 3000);
ok('a reload in the middle of the fight shows no FIGHT again (' + (await cards()).map((c) => c.kind).join(', ') + ')', (await cards('fight')).length === 0);

// ---------- lost: DEFEAT, after the last hostile effect ----------
// The squad ends every turn until it falls; the dice favour the hostiles (the engine's rng, as survival.mjs and cutins.mjs
// set it: a state whose next d20 is high).
const D19 = dieSeed(19), t0 = Date.now();
while (Date.now() - t0 < 240000) {
  const s = await p.evaluate(() => { const g = window.__phc.getState().game, cb = g.combat; if (!cb || cb.over) return 'over'; const u = cb.units.find((x) => x.id === cb.order[cb.turn]); return u && u.charId && !(window.__phcHold?.() > performance.now()) ? u.id : ''; });
  if (s === 'over') break;
  if (s) { await p.evaluate((d) => { window.__phc.getState().game.rng.state = d; }, D19); await act({ type: 'combat/end-turn', unitId: s }); }
  await settle(p, 200);
}
g = await G();
ok('the squad falls (' + g.combat?.over + ', the run ' + g.run?.state + ')', g.combat?.over === 'loss' && g.run?.state === 'over');
ok('DEFEAT comes up when it is lost', await waitCard('defeat'));
await pause(p, 200); await p.screenshot({ path: SHOTS + '/card-defeat.png' });
{ const d = (await cards('defeat'))[0], lastFx = await p.evaluate(() => window.__fxT.at(-1)?.t || 0);
  ok('… with what follows, from data (' + d?.after + ')', d?.after === SVD.run.after_fight.lost && d.text.includes(SVD.run.after_fight.lost));
  ok('… after the fight\'s last effect has played (' + Math.round(d?.t) + ' ≥ ' + Math.round(lastFx) + ')', !!d && d.t >= lastFx);
  ok('… shown under reduced motion too, not moving (animation ' + d?.anim + ', ' + d?.box + ' px tall)', /^(phcBigFade|none)/.test(d?.anim || '') && d.box > 0); }
await pause(p, 3000);
ok('one DEFEAT after the reload, no VICTORY, no FIGHT', (await cards('defeat')).length === 1 && !(await cards('victory')).length && !(await cards('fight')).length);
ok('no page errors: ' + p.errors.join(' | ').slice(0, 300), p.errors.length === 0);
await browser.close();
