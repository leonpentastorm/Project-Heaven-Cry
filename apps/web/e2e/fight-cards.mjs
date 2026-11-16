// The fight's banners (rules 1.62 item 4740; Leon on live 0.29.0: "Need a Big ass Battle start, battle finish (won/lost)
// and a Free roam banner. appear on the screen for at least 1.25s"; docs/design/ui-screens.md "The fight cards"): BATTLE
// START as a fight begins, VICTORY or DEFEAT when it ends, FREE ROAM as a run's field opens: big banners in the middle of
// the screen (game/turnIntro.tsx BigBanner), each on screen at least rules.json combat.cards.hold_ms, no click, clear of
// the action bar. In a Survival test room: node 1's BATTLE START plays before the first turn's banner; VICTORY (the
// run's line of what follows, from data) once the fight is won, then FREE ROAM; leaving the field goes straight to the
// rewards with no end card (rules 1.62 item 4743); the next fight's BATTLE START
// under reduced motion (shown, not moved); a reload in the middle of it shows no FIGHT again; DEFEAT once the
// squad falls, after the fight's last effect has played. Each card once, read from its data-phc-card attribute.
import { readFileSync } from 'fs';
import { chromium, player, click, hostAs, lockIn, until, settle, pause, OUT, campStart } from './lib.mjs';
const SHOTS = process.env.SHOTS || OUT;
const SVD = JSON.parse(readFileSync(new URL('../../../data/survival.json', import.meta.url), 'utf8'));
const CARDS = JSON.parse(readFileSync(new URL('../../../data/rules.json', import.meta.url), 'utf8')).combat.cards;
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
await click(p, 'Start the run');
await campStart(p);
await p.waitForSelector('[data-phc-run-screen]', { timeout: 60000 });
ok('no fight card outside a fight (the lobby, the camp, the path map)', (await cards()).filter((c) => c.kind !== 'turn' && c.kind !== 'round').length === 0);

// ---------- node 1: FIGHT, then the first turn's banner ----------
const way = await route();
ok('the map has two fights in a row from the first row (' + (way || []).join(' then ') + ')', !!way);
const [n1, n2] = way || [];
await p.locator('[data-phc-node="' + n1 + '"]').click();
ok('BATTLE START comes up as the fight begins', await waitCard('fight'));
await pause(p, 260); await p.screenshot({ path: SHOTS + '/card-fight.png' });
await p.waitForFunction(() => window.__turnT.length > 0, null, { timeout: 60000 }).catch(() => {});
let g = await G();
{ const f = (await cards('fight'))[0], turn0 = (await p.evaluate(() => window.__turnT[0])) || null;
  ok('… with the fight\'s name from the engine (' + g.combat.name + ') and who goes first', !!f && f.text.toUpperCase().includes(g.combat.name.toUpperCase()) && /GO(ES)? FIRST/i.test(f.text));
  ok('… before the first turn\'s banner (FIGHT at ' + Math.round(f?.t) + ' ms, the first turn at ' + Math.round(turn0?.t) + ' ms)', !!f && !!turn0 && f.t < turn0.t);
  ok('… big, in the middle, its own slide (' + f?.anim + '), the data\'s words (' + CARDS.joined.name + ')', !!f && f.big && /^phcBig\w/.test(f.anim) && !/^phcBigFade/.test(f.anim) && f.text.includes(CARDS.joined.name));
  ok('… takes no click (' + f?.pe + ') and stays clear of the action bar (bottom ' + f?.bottom + ' of ' + f?.vh + ')', f?.pe === 'none' && f.bottom < f.vh * 0.62); }
await pause(p, 1500);
{ const f = (await cards('fight'))[0]; ok('… on screen at least the data\'s hold (' + Math.round((f?.gone || 0) - (f?.t || 0)) + ' ms ≥ ' + CARDS.hold_ms + ')', !!f && f.hold === CARDS.hold_ms && f.gone - f.t >= CARDS.hold_ms); }

// ---------- won: VICTORY, with the run's line of what follows ----------
const fx1 = await p.evaluate(() => window.__fxT.length);
ok('the fight is won (run/skip, the test room\'s)', (await act({ type: 'run/skip' })) === null);
ok('VICTORY comes up when it is won', await waitCard('victory'));
await pause(p, 260); await p.screenshot({ path: SHOTS + '/card-victory.png' });
{ const v = (await cards('victory'))[0], lastFx = await p.evaluate(() => window.__fxT.at(-1)?.t || 0);
  ok('… with what follows, from data (' + v?.after + ')', v?.after === SVD.run.after_fight.won && v.text.includes(SVD.run.after_fight.won));
  ok('… after the fight\'s last effect has played (' + Math.round(v?.t) + ' ≥ ' + Math.round(lastFx) + ')', !!v && v.t >= lastFx); }
void fx1;
ok('FREE ROAM comes up after VICTORY as the field opens', await waitCard('field'));
{ const v = (await cards('victory'))[0], m = (await cards('field'))[0];
  ok('… after VICTORY has gone (VICTORY ' + Math.round(v?.t) + ' to ' + Math.round(v?.gone) + ' ms, FREE ROAM at ' + Math.round(m?.t) + ' ms)', !!v && !!m && !!v.gone && m.t >= v.gone - 50);
  ok('… with the field\'s words and its rounds, from data (' + m?.text + ')', !!m && m.text.includes(SVD.run.after_fight.field.name) && m.text.includes(String(SVD.field.rounds)));
  ok('… VICTORY on screen at least the data\'s hold (' + Math.round((v?.gone || 0) - (v?.t || 0)) + ' ms)', !!v && v.gone - v.t >= CARDS.hold_ms); }
await pause(p, 2500);
ok('one BATTLE START, one VICTORY and one FREE ROAM for the fight, no DEFEAT', (await cards('fight')).length === 1 && (await cards('victory')).length === 1 && (await cards('field')).length === 1 && !(await cards('defeat')).length);

// ---------- the next fight, under reduced motion; a reload in the middle of it ----------
await p.locator('[data-phc-field-leave]').click({ timeout: 60000 }); await p.waitForFunction(() => window.__phc.getState().game.run.state !== 'field', null, { timeout: 30000 }); // rules 1.55: the field, left at once
await p.waitForSelector('[data-phc-offer]', { timeout: 30000 }); // rules 1.62 item 4743: straight to the rewards, no click
ok('leaving the field goes straight to the rewards: no end card, no click', (await p.locator('[role="dialog"][aria-label="The fight is over"]').count()) === 0);
g = await G();
const cid = Object.keys(g.characters)[0];
ok('the reward taken as the materials (rules 1.54 item 2)', (await act({ type: 'run/pick', charId: cid, choice: 'materials' })) === null);
await p.waitForFunction(() => window.__phc.getState().game.run.state === 'map', null, { timeout: 30000 });
await p.emulateMedia({ reducedMotion: 'reduce' });
await p.locator('[data-phc-node="' + n2 + '"]').click();
ok('the next fight has its own BATTLE START (a fight of the same template is no longer skipped)', await waitCard('fight', 2));
{ const f2 = (await cards('fight'))[1];
  ok('… under reduced motion it is shown, not moving (animation ' + f2?.anim + ', ' + f2?.box + ' px tall)', /^(phcBigFade|none)/.test(f2?.anim || '') && f2.box > 0); }
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
function nextR(r) { let t = (r.state = (r.state + 0x6d2b79f5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const dieSeed = (v) => { for (let s = 1; s < 1e7; s++) { const r = { state: s }; if (1 + Math.floor(nextR(r) * 20) === v) return s; } return 1; };
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
