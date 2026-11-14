// Survival, one stage (rules 1.41; docs/design/survival-spec.md section 8.2; build step 3). Solo, seed fixed
// (localStorage phc.testSeed), the room a test room (phc.testRoom: the engine takes run/skip only there), at 1280 x 720.
// Start a run from the picker; the path map: every node drawn with its word and icon, the first row lit, a node's hover
// card says what it gives with the engine's XP and credits, an unlit node can't be taken and says why; walk node 1 by
// hand and fight it at fast pace (Shot until it is won); the rewards: XP and credits, the ammunition pack, a pick of
// three; take one; then the rest of the stage with run/skip (a fight won at once) to the Boss: the level-up waiting at
// level 3, the nodes still to be built saying what will be there, the Boss's rewards, STAGE 1 CLEARED, retire, and the
// room back in its lobby with the last run's score. SHOTS=dir saves the path map and the reward pick (DSF=2 for 2x).
// In-run progression (rules 1.43, build step 4a), its own section inside the walk: the squad follows the route through
// the seed's map that passes a training ground, a shrine, a Forge, a crossroads and a rest (computed from the map), and
// at each takes one of the engine's choices by clicking it: a drill at the training ground, the shrine's first offer, a
// grade step at the Forge, a trade, the rest's small training; and each change is checked in the state. The kit picks
// after the gate and a cache are taken on the way.
// The fight tally and Report a run (rules 1.47, build step 6), its own small section: after node 1 by hand the reward screen
// shows the fight's tally (a row a character, the engine's numbers); on the summary the run's and each stage's tables, and
// "Report a run" saves a file that holds the seed, the mode and the stage log.
// Stages and boons (rules 1.44, build step 5), its own section after STAGE 1 CLEARED: three boon cards, one clicked (a
// relic for the run); the next tile's cards, one clicked; stage 2's fresh map; stage 2 walked by the engine's actions
// (run/skip) to its Boss; retire; the summary (a row a stage); keep the character as a draft; back to the room. The boon
// pick, the next tile and the summary are saved at 1280 and 1920 (SHOTS, DSF=2).
// Rules 1.46 (build step 4b): node 1's shots are pinned (the d20 an 18, as chaplain.mjs does: it cannot lose); the shop's
// Upgrade tab takes 4a's grade step at the full price; its Give tab says solo there is nobody to give to; every safe node
// opens full screen (the Forge, a training ground, a shrine, a crossroads, a rest; each saved at 1280 and 1920 and checked
// for clipping) and "To the path map" walks out of it; the path map's hover card covers no reachable node. Then C, two
// browsers: a host and a guest walk to a shop, the host gives credits and a graded weapon with a mod, the guest sees each
// arrive (a toast, the purse, the pack line whole), the guest marks Ready and the host closes the shop for both.
// Rules 1.49 (build step 10): the path map fits its frame (every marker, its word and the vault's spur inside it) at
// 1280 x 720, 1280 x 800 and 1920 x 1080, on stage 1's map and stage 2's; C2, the two browsers walk on to a fork, the
// host marks one trail (the guest sees the mark live) and the guest another: the tie goes to the host's; D, solo: the
// boon clicked at stage 1's Boss is felt on the rifle's card (the engine's gear preview), stage 2 and stage 3 reached,
// and at a stage 3 Forge the Relic step's three named properties offered, one clicked, the rifle a Relic with it.
// Rules 1.50 (the repair service): at the shop the rifle is worn by a test hand-off (as the purse is) and the Repair
// shelf shows its card (the bar now → full, the price from data, the short purse's reason in words); the purse topped
// up, it is repaired by a click: the purse down by the card's price, the rifle at full, the card gone; the Repair shelf
// saved at 1280 and 1920; leaving with the rifle worn again, the path map's squad panel shows the WORN mark.
import { readFileSync } from 'node:fs';
import { chromium, player, click, hostAs, lockIn, until, pickAction, settle, OUT, BASE } from './lib.mjs';
const DATA = (f) => JSON.parse(readFileSync(new URL('../../../data/' + f, import.meta.url), 'utf8'));
const SVD = DATA('survival.json'), WPN = Object.fromEntries(DATA('weapons.json').items.map((w) => [w.id, w])), RAR = DATA('rules.json').rarity;
const browser = await chromium.launch();
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const SEED = 'PHC-0046'; // rules 1.48: a seed whose stage 1 has a lane route from its first node (a swarm, which the pinned shots can reach) through a training ground, a shrine, a Forge, a crossroads and a rest
const p = await player(browser, 'host', { play: 'survival' });
await p.context().addInitScript((seed) => { try { localStorage.setItem('phc.testRoom', '1'); localStorage.setItem('phc.testSeed', seed); } catch { /* */ } }, SEED);
await p.setViewportSize({ width: 1280, height: 720 });
const G = () => p.evaluate(() => window.__phc.getState().game);
const run = () => p.evaluate(() => window.__phc.getState().game?.run);
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const screen = () => p.evaluate(() => window.__phc.getState().screen);
// a screenshot when the screen change has played out (no fight screen still fading under the run's)
// The engine's dice (packages/engine/src/rng.ts, as in cutins.mjs and chaplain.mjs): a state whose next d20 is v.
function nextR(r) { let t = (r.state = (r.state + 0x6d2b79f5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const dieSeed = (v) => { for (let s = 1; s < 1e7; s++) { const r = { state: s }; if (1 + Math.floor(nextR(r) * 20) === v) return s; } return 1; };
const D18 = dieSeed(18);
const shot = async (name) => { await p.waitForFunction(() => !document.querySelector('.phc-cb-dock'), null, { timeout: 30000 }).catch(() => {}); await settle(p, 1200); return p.screenshot({ path: OUT + name + '.png' }); };

// ---------- the lobby: a character, then Start the run ----------
await hostAs(p, 'Leon');
await click(p, 'Create a character');
await p.getByPlaceholder('What the squad calls you').fill('Kade');
await p.locator('main button[aria-pressed]').first().click();
await click(p, 'Next ›');
await p.locator('button', { hasText: /^Use .* ›$/ }).first().click();
await click(p, 'Next ›'); await click(p, 'Next ›'); await click(p, 'Next ›');
await p.locator('button', { hasText: 'Line soldier' }).first().click();
await click(p, 'Next ›'); await lockIn(p);
await p.waitForSelector('text=✓ LOCKED IN');
ok('a test room (settings.test, from the test hook)', (await G()).settings.test === true);
await click(p, 'Start the run');
await p.waitForSelector('[data-phc-run-screen]', { timeout: 60000 });
let r = await run();
ok('Start the run opens the path map, seed ' + r.seed + ', stage 1', r.seed === SEED && r.stage === 1 && r.state === 'map' && await screen() === 'run');

// ---------- the path map ----------
const drawn = await p.locator('[data-phc-node]').count();
ok('every node of the stage is drawn (' + drawn + ' of ' + r.nodes.length + '), each with its word and its icon', drawn === r.nodes.length
  && await p.locator('[data-phc-node] [data-phc-marker]').count() === r.nodes.length
  && (await p.locator('[data-phc-node]').allTextContents()).every((t) => /Fight|Elite|Boss|Shop|Forge|Training|Shrine|Rest|Cache|Crossroads|Gate|Vault/.test(t)));
// ART-REQUESTS S9 (the artist's 14 Nov delivery): the inked markers replace the SVG stand-ins (was: an svg in every node);
// the kinds with no marker (the vault's guard and chest, the camp) keep their line icon; the setting's painted backdrop
// is drawn by catalog id, not the field chart
const marks = await p.locator('[data-phc-node]').evaluateAll((b) => b.map((x) => [x.getAttribute('data-phc-kind'), x.getAttribute('data-phc-spur'), x.querySelector('[data-phc-marker]')?.getAttribute('data-phc-marker')]));
ok('the inked markers: every kind with one draws it (' + marks.filter((m) => m[2] === 'art').length + '), only the vault\'s spur the line icon', marks.every(([, spur, m]) => (spur ? m === 'line' : m === 'art')));
ok('the path map draws its setting\'s painted backdrop (survival-map-' + (await run()).world.at(-1)?.setting + ')', /survival-map-/.test(await p.locator('[data-phc-pathmap-art]').getAttribute('src').catch(() => '') || ''));
const lit = await p.locator('[data-phc-node][data-phc-state="reachable"]').evaluateAll((b) => b.map((x) => x.getAttribute('data-phc-node')));
const first = r.nodes.filter((n) => n.depth === 1).map((n) => n.id);
ok('the first row is lit, nothing else (' + lit.join(', ') + ')', JSON.stringify(lit.sort()) === JSON.stringify(first.sort()));
const tip0 = await p.locator('[data-phc-node="' + lit[0] + '"]').getAttribute('data-tip-text');
ok('a fight node\'s hover card says what it gives, with the engine\'s numbers: "' + tip0 + '"', /XP/.test(tip0 || '') && /credits/.test(tip0 || '') && /pick of three weapons/.test(tip0 || ''));
const far = r.nodes.find((n) => n.depth === 3);
await p.locator('[data-phc-node="' + far.id + '"]').click();
const tip1 = await until(p, () => (document.querySelector('.phc-atip')?.textContent || '').trim() || null, null, 5000).catch(() => '');
ok('an unlit node can\'t be taken and its card says why ("' + tip1.slice(0, 90) + '")', (await run()).at === null && /can.t reach/.test(tip1));
const covers = await p.evaluate(() => { const t = document.querySelector('.phc-atip')?.getBoundingClientRect(); if (!t) return ['no card'];
  return [...document.querySelectorAll('[data-phc-node][data-phc-state="reachable"]')].map((n) => [n.getAttribute('data-phc-node'), n.getBoundingClientRect()]).filter(([, b]) => t.left < b.right && b.left < t.right && t.top < b.bottom && b.top < t.bottom).map(([id]) => id); });
ok('rules 1.46: the path map\'s hover card sits beside its node and covers no reachable node (' + covers.join(', ') + ')', !covers.length);
await shot("survival-path-map"); await p.setViewportSize({ width: 1920, height: 1080 }); await shot("survival-path-map-1920"); await p.setViewportSize({ width: 1280, height: 720 });
// rules 1.49 (build step 10): the map always fits its frame: every marker, its word and the camp inside the map's frame
// (the vault's guard and chest were clipped by the frame's bottom at 1280 x 720), at three screen sizes
const mapFits = async (when) => { for (const [w, hh] of [[1280, 720], [1280, 800], [1920, 1080]]) {
  await p.setViewportSize({ width: w, height: hh }); await settle(p, 500);
  const out = await p.evaluate(() => { const f = document.querySelector('[data-phc-pathmap]')?.getBoundingClientRect(); if (!f) return ['no map'];
    const bad = []; for (const n of document.querySelectorAll('[data-phc-node], [data-phc-node-camp]')) for (const e of [n, ...n.querySelectorAll('span')]) { const b = e.getBoundingClientRect(); if (!b.width) continue;
      if (b.left < f.left - 0.5 || b.right > f.right + 0.5 || b.top < f.top - 0.5 || b.bottom > f.bottom + 0.5) { bad.push(n.getAttribute('data-phc-node') || 'camp'); break; } } return bad; });
  ok('rules 1.49: ' + when + ' at ' + w + ' x ' + hh + ': every marker and its word inside the map\'s frame, the vault\'s spur too' + (out.length ? ' (outside: ' + out.join(', ') + ')' : ''), !out.length); }
  await p.setViewportSize({ width: 1280, height: 720 }); await settle(p, 300); };
await mapFits('stage 1\'s map');

// ---------- node 1 by hand ----------
await p.locator('[data-phc-node="' + lit[0] + '"]').click();
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 60000 });
r = await run();
ok('a lit node is taken: the fight begins (' + r.stats.fights[0].template + ', ' + r.stats.fights[0].foes.length + ' foe(s))', r.at === lit[0] && r.state === 'fight');
for (let i = 0; i < 400; i++) {
  const s = await p.evaluate(() => { const g = window.__phc.getState().game, cb = g.combat; if (!cb || cb.over || g.phase !== 'combat') return 'over'; const u = cb.units.find((x) => x.id === cb.order[cb.turn]); return u && u.charId ? 'mine' : 'theirs'; });
  if (s === 'over') break;
  if (s !== 'mine' || !(await p.locator('text=ACTION POINTS').count()) || await p.evaluate(() => { const d = document.querySelector('.phc-cb-dock'); return d ? d.getAttribute('data-lock') || '' : 'none'; })) { await settle(p, 120); continue; }
  await pickAction(p, /^(Shot|Strike)/, { timeout: 2000 }).catch(() => {});
  await p.evaluate((s) => { window.__phc.getState().game.rng.state = s; }, D18); // rules 1.46: node 1 cannot lose (every shot an 18)
  const conf = p.getByRole('button', { name: 'Confirm', exact: true });
  // rules 1.45: a generated map has walls and cover, so the target the Shot starts on may be out of sight; aim at each
  // standing hostile in turn (by clicking its tile, as a player does) until the Shot can be confirmed
  if (!(await conf.isEnabled().catch(() => false))) {
    const foes = await p.evaluate(() => window.__phc.getState().game.combat.units.filter((u) => u.side === 'foe' && !u.dead && !u.downed).map((u) => { const [x, y] = u.pos.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); }));
    for (const r of foes) { const t = p.locator('button.phc-tok[aria-label^="' + r + ' · "]').first(); if (!(await t.count())) continue; await t.click({ timeout: 5000 }).catch(() => {}); await settle(p, 60); if (await conf.isEnabled().catch(() => false)) break; }
  }
  try { if (await conf.isEnabled({ timeout: 30000 })) await conf.click({ timeout: 30000 }); else await p.getByRole('button', { name: 'End turn', exact: true }).click({ timeout: 30000 }); } catch { /* the turn moved on under us */ }
  await settle(p, 60);
}
let g = await G();
ok('node 1 fought by hand to its end: ' + (g.combat?.summary || '?'), g.combat?.over === 'win' && g.run.state === 'reward');
await click(p, 'Back to the map ›', { timeout: 60000 });
await p.waitForSelector('[data-phc-offer]', { timeout: 30000 });
r = await run();
const c = Object.values(g.characters)[0];
ok('the rewards: XP and credits each, the ammunition pack (' + (r.note.ammo[c.id] || []).join(', ') + ')', r.note.xp === 100 && c.xp === 100 && c.credits === 150 + r.note.credits && (r.note.ammo[c.id] || []).length > 0
  && /100 XP/.test(await p.locator('[data-phc-note]').textContent()));
ok('a pick of three weapons, each with its rarity word and price, and credits instead', await p.locator('[data-phc-pick]').count() === 3 && /Take \d+ credits instead/.test(await p.locator('[data-phc-instead]').textContent())
  && (await p.locator('[data-phc-pick]').allTextContents()).every((t) => /(STANDARD|FINE)/.test(t) && /\d+ credits/.test(t)));
await shot('survival-reward-pick');
// ---------- rules 1.47 (build step 6): the fight's tally on the reward screen ----------
{
  const t = r.stats.fights[0].tally, row = p.locator('[data-phc-tally="fight"] [data-phc-tally-row="' + c.id + '"]');
  const cell = async (k) => Number(await row.locator('[data-phc-tally-cell="' + k + '"]').textContent());
  ok('the reward screen shows the fight\'s tally: a row for the character with the engine\'s damage dealt (' + t.chars[c.id].dealt + '), taken and kills', await p.locator('[data-phc-tally="fight"]').count() === 1 && t.chars[c.id].dealt > 0
    && await cell('dealt') === t.chars[c.id].dealt && await cell('taken') === t.chars[c.id].taken && await cell('kills') === t.chars[c.id].kills && /of \d+/.test(await row.locator('[data-phc-tally-cell="aim"]').textContent()));
}
const want = r.offers[c.id].weapons[0];
await p.locator('[data-phc-pick="0"]').click();
await p.waitForFunction(() => window.__phc.getState().game.run.state === 'map', null, { timeout: 30000 });
g = await G();
ok('the weapon taken is in the pack at its rarity (' + want.id + ', ' + want.rarity + ')', (Object.values(g.characters)[0].pack || []).some((x) => (x.weapon || x.item || x.id) === want.id && (x.rarity || 'standard') === want.rarity));
ok('… and the map lights the node\'s links', JSON.stringify((await p.locator('[data-phc-node][data-phc-state="reachable"]').evaluateAll((b) => b.map((x) => x.getAttribute('data-phc-node')))).sort()) === JSON.stringify([...g.run.nodes.find((n) => n.id === g.run.at).links].sort()));

// ---------- the rest of the stage, fights won by run/skip ----------
await act({ type: 'run/skip' }); // a refused action comes back as the player's toast, in the engine's words
const plain = await until(p, () => window.__phc.getState().toast?.text || null, null, 10000).catch(() => '');
ok('run/skip with no fight on is refused: "' + plain + '"', plain === 'No fight is under way.');
await p.waitForFunction(() => !window.__phc.getState().toast, null, { timeout: 15000 }).catch(() => {}); // rules 1.46: the refusal's toast is gone before the shop opens (it showed over the shop)
// ---------- the shop (rules 1.42, spec 8.3): full screen, at 1280 and 1920 ----------
let sawShop = false;
const fitsCheck = () => p.evaluate(() => {
  const bad = [];
  if (document.documentElement.scrollWidth > innerWidth + 1) bad.push('the page scrolls sideways');
  for (const el of document.querySelectorAll('[data-phc-card-name], [data-phc-keeper-name], [data-phc-tab], [data-phc-price]')) if (el.scrollWidth > el.clientWidth + 1) bad.push('clipped: ' + el.textContent.slice(0, 30));
  const cards = [...document.querySelectorAll('[data-phc-card]')].map((e) => e.getBoundingClientRect());
  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) { const a = cards[i], b = cards[j]; if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) bad.push('cards overlap'); }
  return bad.slice(0, 4);
});
async function shopChecks() {
  sawShop = true;
  await p.waitForSelector('[data-phc-fullscreen]', { timeout: 30000 });
  ok('a shop node opens the shop full screen: the keeper, the tabs, the purse; the path map is gone', await p.locator('[data-phc-pathmap]').count() === 0
    && /\S/.test(await p.locator('[data-phc-keeper-name]').textContent()) && await p.locator('[role="tab"]').count() === 5 && /\d/.test(await p.locator('[data-phc-purse-n]').textContent()));
  await p.locator('[data-phc-tab="give"]').click();
  ok('rules 1.46: the Give tab opens; solo it says there is nobody to give to', await p.locator('[data-phc-give-none]').count() === 1 && /nobody to give to/.test(await p.locator('[data-phc-give]').textContent()));
  await p.locator('[data-phc-tab="always"]').click();
  const cal = await p.locator('[data-phc-shelf="calibres"] [data-phc-card]').count();
  ok('Always in stock: every calibre on its own shelf (' + cal + ')', cal === 12);
  await settle(p, 1400); await p.screenshot({ path: OUT + 'survival-shop-1280.png' });
  ok('at 1280: nothing clipped, nothing overlaps (' + (await fitsCheck()).join('; ') + ')', !(await fitsCheck()).length);
  // buy ammunition
  const me = Object.values((await G()).characters)[0];
  const c0 = me.credits, rifle = p.locator('[data-phc-card="rounds:rifle"]');
  const price = Number((await rifle.locator('[data-phc-price]').textContent()).replace(/\D/g, ''));
  await rifle.locator('[data-phc-buy]').click();
  await p.waitForFunction((c) => Object.values(window.__phc.getState().game.characters)[0].credits !== c, c0, { timeout: 30000 });
  const c1 = Object.values((await G()).characters)[0].credits;
  ok('buy rifle rounds at the card\'s price (' + price + '): ' + c0 + ' → ' + c1 + ', logged', c0 - c1 === price && /bought/.test(await p.locator('[data-phc-visit-log]').textContent()));
  // today's gear: a card's numbers are the engine's
  await p.locator('[data-phc-tab="gear"]').click();
  const gear = await p.locator('[data-phc-shelf="gear"] [data-phc-card]').evaluateAll((l) => l.map((e) => ({ key: e.getAttribute('data-phc-card'), id: e.getAttribute('data-phc-card-id'), hit: e.querySelector('[data-phc-num="hit"]')?.textContent || null, dmg: e.querySelector('[data-phc-num="dmg"]')?.textContent || null, price: Number(e.querySelector('[data-phc-price]').textContent.replace(/\D/g, '')) })));
  const sh = (await run()).shop, gun = gear.find((x) => x.hit);
  const pv = gun ? await p.evaluate(([cid, id, rar]) => window.__phc.gearPreview(cid, { id, rarity: rar }), [me.id, gun.id, sh.stock.find((s) => s.key === gun.key).rarity]) : null;
  ok('a gear card\'s numbers equal the engine\'s preview (' + (gun ? gun.id + ': ' + gun.hit + ', ' + gun.dmg : 'none') + ')', !!pv && pv.lines.find((l) => l.key === 'hit').value === gun.hit && pv.lines.find((l) => l.key === 'dmg').value === gun.dmg);
  await p.locator('[data-phc-card="' + gun.key + '"]').hover();
  ok('hovering a card fills the compare panel (holding against this)', await p.locator('[data-phc-compare]').count() === 1);
  await settle(p, 400); await p.screenshot({ path: OUT + 'survival-shop-gear-1280.png' });
  // a purse too short says why
  const credits = Object.values((await G()).characters)[0].credits, dear = gear.filter((x) => x.price > credits).sort((a, b) => b.price - a.price)[0];
  if (dear) {
    const status = await p.locator('[data-phc-card="' + dear.key + '"] [data-phc-status]').textContent();
    await p.locator('[data-phc-card="' + dear.key + '"] [data-phc-buy]').click();
    const t = await until(p, () => window.__phc.getState().toast?.text || null, null, 10000).catch(() => '');
    ok('a purse too short says why, on the card and when tried ("' + status + '" / "' + t + '")', status === 'Short ' + (dear.price - credits) + ' credits.' && t === status);
  } else ok('a purse too short says why (every piece affordable: nothing to test)', false);
  await p.waitForFunction(() => !window.__phc.getState().toast, null, { timeout: 15000 }).catch(() => {}); // its toast gone before the next shots
  // rules 1.48: the lanes put the first shop early in the stage, before a purse can afford a rolled weapon and a grade
  // step: the test purse is topped up here (as node 1's dice are pinned), so the shop's and the Forge's checks have money (after the short-purse check, which wants a piece it can't afford)
  await p.evaluate(() => { for (const c of Object.values(window.__phc.getState().game.characters)) c.credits = Math.max(c.credits || 0, 6000); });
  // sell one (the weapon picked after node 1), then buy a rolled weapon
  await p.locator('[data-phc-tab="sell"]').click();
  const rows = await p.locator('[data-phc-sell]').evaluateAll((l) => l.map((e) => ({ idx: e.getAttribute('data-phc-sell'), v: Number(e.querySelector('[data-phc-sell-value]')?.textContent.replace(/\D/g, '') || 0), btn: !!e.querySelector('[data-phc-sell-btn]') })));
  const best = rows.filter((x) => x.btn).sort((a, b) => b.v - a.v)[0], s0 = Object.values((await G()).characters)[0].credits;
  await p.locator('[data-phc-sell="' + best.idx + '"] [data-phc-sell-btn]').click();
  if (await p.locator('[data-phc-sell-yes]').count()) await p.locator('[data-phc-sell-yes]').click();
  await p.waitForFunction((c) => Object.values(window.__phc.getState().game.characters)[0].credits !== c, s0, { timeout: 30000 });
  ok('sell one at the row\'s price (+' + best.v + ')', Object.values((await G()).characters)[0].credits - s0 === best.v);
  await p.locator('[data-phc-tab="gear"]').click();
  const now = Object.values((await G()).characters)[0].credits, cheap = gear.filter((x) => (WEAPONISH.test(x.id)) && x.price <= now).sort((a, b) => a.price - b.price)[0];
  if (cheap) {
    await p.locator('[data-phc-card="' + cheap.key + '"] [data-phc-buy]').click();
    await p.waitForFunction((k) => window.__phc.getState().game.run.shop?.stock.find((s) => s.key === k)?.sold, cheap.key, { timeout: 30000 });
    ok('buy a rolled weapon (' + cheap.id + ' for ' + cheap.price + '): it is marked "Sold to" and in the pack', /Sold to/.test(await p.locator('[data-phc-card="' + cheap.key + '"] [data-phc-status]').textContent())
      && (Object.values((await G()).characters)[0].pack || []).some((x) => (x.weapon || x.item || x.id) === cheap.id));
  } else ok('buy a rolled weapon: none affordable (' + now + ' credits; ' + gear.map((x) => x.id + ' ' + x.price).join(', ') + ')', false);
  // rules 1.46: the Upgrade tab is 4a's grade step at the full price (a weapon in the pack; the Forge grades the one in hand)
  await p.evaluate(() => { const c = Object.values(window.__phc.getState().game.characters)[0]; c.credits += 5000; }); // a test purse, so the step is affordable
  await p.locator('[data-phc-tab="upgrade"]').click();
  // rules 1.50: the Repair shelf, a worn rifle repaired at the shop
  {
    const hold = await p.evaluate(() => { const c = Object.values(window.__phc.getState().game.characters)[0], was = c.credits; c.weaponState = { ...(c.weaponState || {}), dur: 60 }; c.credits = 3; return was; });
    await p.locator('[data-phc-tab="sell"]').click(); await p.locator('[data-phc-tab="upgrade"]').click(); // drawn again from the state
    const card = p.locator('[data-phc-repair="repair:main"]');
    await card.waitFor({ timeout: 30000 }).catch(() => {});
    const me0 = Object.values((await G()).characters)[0], w = WPN[me0.weapon], rar = me0.weaponState?.rarity || 'standard';
    const full = Math.round(w.durability * RAR[rar].dur), R = SVD.repair, want = Math.ceil(Math.max(R.floor, R.rate * Math.round(w.price_credits * RAR[rar].price) * ((full - 60) / full)) * R.places.shop);
    const price = Number(((await card.locator('[data-phc-price]').textContent().catch(() => '')) || '').replace(/\D/g, ''));
    const bar = await card.locator('[data-phc-wear]').evaluate((e) => ({ state: e.getAttribute('data-phc-wear'), now: e.getAttribute('data-phc-wear-now'), max: e.getAttribute('data-phc-wear-max'), mark: e.querySelector('[data-phc-wear-mark]')?.textContent || '' })).catch(() => null);
    ok('the Repair shelf: the worn rifle\'s card, its bar 60 → ' + full + ' marked WORN, its price from data (' + price + ' = ' + want + ')', !!bar && bar.state === 'worn' && bar.now === '60' && bar.max === String(full) && /WORN/.test(bar.mark) && price === want);
    const status = (await card.locator('[data-phc-status]').textContent().catch(() => '')) || '';
    ok('a purse too short for the repair says by how much ("' + status + '")', (await card.getAttribute('data-phc-service-why')) === '' && status.includes('short ' + (want - 3) + ' credits'));
    ok('the "you" panel marks the rifle in hand WORN', await p.locator('[data-phc-hand-wear="main"] [data-phc-wear="worn"]').count() === 1);
    await p.evaluate((h) => { Object.values(window.__phc.getState().game.characters)[0].credits = h; }, hold);
    await p.locator('[data-phc-tab="sell"]').click(); await p.locator('[data-phc-tab="upgrade"]').click();
    await settle(p, 500); await p.screenshot({ path: OUT + 'survival-repair-1280.png' });
    await p.setViewportSize({ width: 1920, height: 1080 }); await settle(p, 700); await p.screenshot({ path: OUT + 'survival-repair-1920.png' });
    ok('the Repair shelf at 1920: nothing clipped, nothing overlaps (' + (await fitsCheck()).join('; ') + ')', !(await fitsCheck()).length);
    await p.setViewportSize({ width: 1280, height: 720 }); await settle(p, 400);
    const r0 = Object.values((await G()).characters)[0].credits;
    await card.locator('[data-phc-upgrade-go]').click();
    await p.waitForFunction((c) => Object.values(window.__phc.getState().game.characters)[0].credits !== c, r0, { timeout: 30000 }).catch(() => {});
    const me1 = Object.values((await G()).characters)[0];
    ok('Repair clicked: the purse down by the card\'s price (' + (r0 - me1.credits) + '), the rifle at full (' + me1.weaponState?.dur + '), logged, the card gone',
      r0 - me1.credits === want && me1.weaponState?.dur === full && /repaired to full/.test(await p.locator('[data-phc-visit-log]').textContent())
      && await p.locator('[data-phc-repair]').count() === 0 && await p.locator('[data-phc-repair-empty]').count() === 1 && await p.locator('[data-phc-hand-wear="main"] [data-phc-wear="sound"]').count() === 1);
  }
  const ups = await p.locator('[data-phc-service]:not([data-phc-repair])').evaluateAll((l) => l.map((e) => ({ key: e.getAttribute('data-phc-service'), why: e.hasAttribute('data-phc-service-why'), price: Number(e.querySelector('[data-phc-price]')?.textContent.replace(/\D/g, '') || 0), lines: e.querySelectorAll('[data-phc-upgrade-lines] b').length })));
  const up = ups.find((x) => !x.why && x.key !== 'grade:main') || ups.find((x) => !x.why);
  ok('the Upgrade tab: a card per weapon or focus, each with its price here and what changes (' + ups.map((x) => x.key + ' ' + x.price + (x.why ? ' refused' : '')).join(', ') + ')', !!up && up.lines > 0);
  await settle(p, 400); await p.screenshot({ path: OUT + 'survival-shop-upgrade-1280.png' });
  if (up) {
    const u0 = Object.values((await G()).characters)[0].credits;
    await p.locator('[data-phc-service="' + up.key + '"] [data-phc-upgrade-go]').click();
    await p.waitForFunction((c) => Object.values(window.__phc.getState().game.characters)[0].credits !== c, u0, { timeout: 30000 });
    const after = Object.values((await G()).characters)[0];
    ok('a shop upgrade clicked (' + up.key + '): the full price paid (' + up.price + '), the step logged, a second refused in words', u0 - after.credits === up.price && /Fine now/.test(await p.locator('[data-phc-visit-log]').textContent())
      && /One grade step a visit/.test(await p.locator('[data-phc-shelf="upgrade"]').textContent()));
  }
  await p.setViewportSize({ width: 1920, height: 1080 }); await settle(p, 600); await p.screenshot({ path: OUT + 'survival-shop-upgrade-1920.png' });
  await p.locator('[data-phc-tab="give"]').click(); await settle(p, 400); await p.screenshot({ path: OUT + 'survival-shop-give-solo-1920.png' });
  await p.setViewportSize({ width: 1280, height: 720 });
  // the shelves scroll inside their region: no card's price or button sits under the visit's strip
  await p.locator('[data-phc-tab="gear"]').click(); await settle(p, 300);
  const under = await p.evaluate(async () => { const foot = document.querySelector('[data-phc-visit-log]').getBoundingClientRect().top, bad = [];
    for (const b of document.querySelectorAll('[data-phc-buy]')) { b.scrollIntoView({ block: 'nearest' }); await new Promise((r) => setTimeout(r, 30)); const r = b.getBoundingClientRect(); if (r.bottom > foot) bad.push(b.getAttribute('data-phc-buy')); }
    return bad; });
  ok('every Buy button, scrolled to, sits above the visit\'s strip (' + under.join(', ') + ')', !under.length);
  await p.locator('[data-phc-tab="always"]').click();
  await p.setViewportSize({ width: 1920, height: 1080 });
  await settle(p, 900); await p.screenshot({ path: OUT + 'survival-shop-1920.png' });
  ok('at 1920: nothing clipped, nothing overlaps (' + (await fitsCheck()).join('; ') + ')', !(await fitsCheck()).length);
  await p.locator('[data-phc-tab="gear"]').click(); await settle(p, 500); await p.screenshot({ path: OUT + 'survival-shop-gear-1920.png' });
  await p.setViewportSize({ width: 1280, height: 720 });
  await p.evaluate(() => { const c = Object.values(window.__phc.getState().game.characters)[0]; c.weaponState = { ...(c.weaponState || {}), dur: 60 }; }); // rules 1.50: worn again, for the map's mark
  await p.locator('[data-phc-leave]').click();
  await p.waitForFunction(() => window.__phc.getState().game.run.state === 'map', null, { timeout: 30000 });
  ok('Leave the shop: back on the path map', await p.locator('[data-phc-pathmap]').count() === 1);
  ok('rules 1.50: the path map\'s squad panel marks the worn rifle before a lane is chosen', await p.locator('[data-phc-member] [data-phc-wear="worn"] [data-phc-wear-mark]').count() === 1);
  await p.evaluate(() => { const c = Object.values(window.__phc.getState().game.characters)[0]; delete c.weaponState.dur; }); // back to full for the rest of the walk
}
const WEAPONISH = /^(?!.*(kit|ration|parts|torch|flare|beads|chalk|toolbox|spirits|cigarettes|plate|shield|buckler|pavise|essence|stim|core$|musek))/;
let sawLevelUp = false, guard = 0;
const PLACES = ['forge', 'training', 'shrine', 'event', 'rest'], placeShots = {};
/** A full-screen place's layout check: no clipped words, no overlapping cards, no card under the visit's strip. */
const placeFits = () => p.evaluate(() => {
  const bad = [], foot = document.querySelector('[data-phc-visit-log]')?.getBoundingClientRect().top ?? Infinity;
  if (document.documentElement.scrollWidth > innerWidth + 1) bad.push('the page scrolls sideways');
  for (const el of document.querySelectorAll('[data-phc-keeper-name], [data-phc-tab], [data-phc-price]')) if (el.scrollWidth > el.clientWidth + 1) bad.push('clipped: ' + el.textContent.slice(0, 30));
  const cards = [...new Set([...document.querySelectorAll('[data-phc-choice], [data-phc-service]')].map((e) => e.closest('[data-phc-service]') || e))].map((e) => e.getBoundingClientRect());
  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) { const a = cards[i], b = cards[j]; if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) bad.push('cards overlap'); }
  const first = document.querySelector('[data-phc-choice], [data-phc-service]'); if (first && first.getBoundingClientRect().top > foot) bad.push('the first card is under the strip');
  return bad.slice(0, 4);
});
// rules 1.43: the route from here that passes the most of the five progression nodes (then the most fights)
const WANT = ['training', 'shrine', 'forge', 'event', 'rest', 'shop'];
const route = (() => { const by = Object.fromEntries(r.nodes.map((n) => [n.id, n])); let best = { n: -1, path: [] };
  const walk = (id, path) => { const pp = [...path, id], n = by[id]; if (!n.links.length) { const k = new Set(pp.map((x) => by[x].kind).filter((x) => WANT.includes(x))); const sc = k.size * 10 + Math.min(4, pp.filter((x) => by[x].kind === 'fight').length); if (sc > best.n) best = { n: sc, path: pp }; return; } for (const l of n.links) walk(l, pp); };
  for (const l of by[r.at].links) walk(l, []); return best.path; })();
const done = {};
/** At a progression node: click the first choice the engine allows whose key starts with `pre` (any, when empty), and
 * wait for the visit to record it; returns the state before and after. */
const choose = async (pre) => {
  await p.waitForSelector('[data-phc-choices] [data-phc-choice]', { timeout: 30000 });
  const sel = '[data-phc-choices]:not([data-phc-kit]) [data-phc-choice' + (pre ? '^="' + pre + '"' : '') + ']:not([data-phc-why])';
  const before = await G(); const key = await p.locator(sel).first().getAttribute('data-phc-choice', { timeout: 10000 }).catch(() => null);
  if (!key) return { before, after: before, key: null };
  await p.locator(sel).first().click();
  await p.waitForFunction((k) => { const r = window.__phc.getState().game.run; return !!r.visit && (Object.values(r.visit.did).some((n) => n > 0) || Object.values(r.visit.steps).some((n) => n > 0)); }, key, { timeout: 30000 });
  return { before, after: await G(), key };
};
while (guard++ < 40) {
  r = await run(); if (!r || r.state === 'boon' || r.state === 'over') break;
  if (r.state === 'map') {
    if (await p.locator('[data-phc-place]').count()) { await p.locator('[data-phc-leave]').click(); await p.waitForSelector('[data-phc-pathmap]', { timeout: 30000 }); } // back at a place after its pick (a crate)
    const ids = await p.locator('[data-phc-node][data-phc-state="reachable"]').evaluateAll((b) => b.map((x) => x.getAttribute('data-phc-node')));
    const kinds = Object.fromEntries(r.nodes.map((n) => [n.id, n.kind]));
    const next = ids.find((id) => route.includes(id)) || ids.find((id) => !['fight', 'elite', 'boss', 'vault_guard', 'vault'].includes(kinds[id])) || ids.find((id) => kinds[id] !== 'vault_guard') || ids[0]; // stage 1 leaves the vault (stage 2 takes it)
    await p.locator('[data-phc-node="' + next + '"]').click();
    await p.waitForFunction((id) => window.__phc.getState().game.run.at === id, next, { timeout: 30000 });
    const k = kinds[next], cid = (await G()).characters && Object.keys((await G()).characters)[0];
    if (PLACES.includes(k)) await p.waitForSelector('[data-phc-place="' + k + '"]', { timeout: 30000 }).catch(() => {});
    if (PLACES.includes(k) && await p.locator('[data-phc-place]').count()) { // rules 1.46: every safe node opens full screen (seen on arrival)
      if (!placeShots[k]) {
        placeShots[k] = true;
        ok('rules 1.46: the ' + k + ' opens full screen: its face, its tabs, large cards, the Give tab; the path map is gone', await p.locator('[data-phc-pathmap]').count() === 0 && /\S/.test(await p.locator('[data-phc-keeper-name]').textContent())
          && await p.locator('[data-phc-tab="give"]').count() === 1 && !!(await p.locator('[data-phc-keeper-portrait]').getAttribute('src').catch(() => '')));
        await p.mouse.move(2, 2); // no hover card over the shot
        await settle(p, 900); await p.screenshot({ path: OUT + 'survival-place-' + k + '-1280.png' });
        const bad1 = await placeFits(); await p.setViewportSize({ width: 1920, height: 1080 }); await settle(p, 700); await p.screenshot({ path: OUT + 'survival-place-' + k + '-1920.png' });
        const bad2 = await placeFits(); await p.setViewportSize({ width: 1280, height: 720 }); await settle(p, 300);
        ok('… at 1280 and 1920 nothing is clipped, overlapping or covered (' + [...bad1, ...bad2].join('; ') + ')', !bad1.length && !bad2.length);
      }
    }
    if (k === 'training' && !done.training) {
      const { before, after, key } = await choose('drill:'), w = key && key.slice(6);
      done.training = !!key && (after.characters[cid].phys?.drill?.[w] || 0) - (before.characters[cid].phys?.drill?.[w] || 0) === 300;
      ok('a training ground: a drill clicked (' + key + '), +300 drill, free', done.training && after.characters[cid].credits === before.characters[cid].credits);
    } else if (k === 'shrine' && !done.shrine) {
      const { before, after, key } = await choose('');
      const b = before.characters[cid], a = after.characters[cid];
      done.shrine = !!key && ((a.devotionXp || 0) > (b.devotionXp || 0) || JSON.stringify(a.faithPieces || {}) !== JSON.stringify(b.faithPieces || {}) || (a.relics || []).length > (b.relics || []).length);
      ok('a shrine: its first open offer clicked (' + key + ') and it landed', done.shrine);
    } else if (k === 'forge' && !done.forge) {
      const { before, after, key } = await choose('grade:main');
      const b = before.characters[cid], a = after.characters[cid];
      done.forge = !!key && (a.weaponState?.rarity === 'fine') && b.credits - a.credits === 1200;
      ok('a Forge: the grade step clicked (' + key + '): Fine, 1,200 credits (' + b.credits + ' → ' + a.credits + ')', done.forge);
      ok('… and a second step this visit is shown refused in words', /One grade step a visit/.test(await p.locator('[data-phc-choices]').first().textContent()));
    } else if (k === 'event' && !done.event) {
      const { after, key } = await choose('');
      done.event = !!key && after.run.visit.did[cid] === 1;
      ok('a crossroads: a trade clicked (' + key + '), one a character', done.event);
    } else if (k === 'rest' && !done.rest) {
      const { after, key } = await choose('');
      done.rest = !!key && after.run.visit.did[cid] === 1;
      ok('a rest: its small training clicked (' + key + ')', done.rest);
    }
    if (await p.locator('[data-phc-place]').count()) { // rules 1.46: every safe node is a full-screen place; walk out to the map
      await p.locator('[data-phc-leave]').click();
      await p.waitForSelector('[data-phc-pathmap]', { timeout: 30000 });
    }
  } else if (r.state === 'shop') {
    if (!sawShop) await shopChecks();
    else { await p.locator('[data-phc-leave]').click(); await p.waitForFunction(() => window.__phc.getState().game.run.state !== 'shop', null, { timeout: 30000 }); }
  } else if (r.state === 'fight') {
    await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 60000 }).catch(() => {});
    const e = await act({ type: 'run/skip' }); if (e) { ok('run/skip in a fight: ' + e, false); break; }
    await click(p, 'Back to the map ›', { timeout: 60000 });
  } else if (r.state === 'reward') {
    await p.waitForSelector('[data-phc-instead], [data-phc-kit] [data-phc-choice]', { timeout: 30000 });
    if (await p.locator('[data-phc-kit] [data-phc-choice]').count()) { // rules 1.43: the pick of kit (an Elite's, a cache's)
      const before = await G(); await p.locator('[data-phc-kit] [data-phc-choice]').first().click();
      await p.waitForFunction(() => !window.__phc.getState().game.run.lasting, null, { timeout: 30000 });
      if (!done.kit) { done.kit = true; const after = await G(), cid = Object.keys(after.characters)[0]; ok('a pick of kit: one taken into the pack', (after.characters[cid].pack || []).length >= (before.characters[cid].pack || []).length); }
      if (!(await run()).offers) continue;
    }
    if (!sawLevelUp && await p.locator('[data-phc-levelup]').count()) {
      sawLevelUp = true;
      await p.locator('[data-phc-levelup]').first().click();
      await p.waitForFunction(() => window.__phc.getState().screen === 'levelup', null, { timeout: 30000 });
      await click(p, /Back to the map/, { timeout: 30000 });
      await p.waitForSelector('[data-phc-run-screen]', { timeout: 30000 });
    }
    await p.locator('[data-phc-instead]').first().click();
    await p.waitForFunction(() => window.__phc.getState().game.run.state !== 'reward', null, { timeout: 30000 });
  }
}
r = await run(); g = await G();
ok('the level-up waits on the map at level 3 (the class is earned there), and Back to the map returns', sawLevelUp && Object.values(g.characters)[0].level >= 3);
ok('rules 1.43: the route passed a training ground, a shrine, a Forge, a crossroads and a rest, each choice landed (' + JSON.stringify(done) + ')', ['training', 'shrine', 'forge', 'event', 'rest'].every((k) => done[k]));
ok('a shop was on the way and opened full screen', sawShop);
ok('rules 1.46: every safe node on the route opened full screen (' + Object.keys(placeShots).join(', ') + ')', ['forge', 'training', 'shrine', 'event', 'rest'].every((k) => placeShots[k]));
ok('the whole stage walked to the Boss: 15 nodes, STAGE 1 CLEARED', r.state === 'boon' && r.path.length === 15 && /STAGE 1 CLEARED/.test(await p.locator('[data-phc-cleared]').textContent()));

// ---------- rules 1.44 (build step 5): the boon, the next tile, stage 2, retire, the summary ----------
const both = async (name) => { await shot(name + '-1280'); await p.setViewportSize({ width: 1920, height: 1080 }); await settle(p, 600); await shot(name + '-1920'); await p.setViewportSize({ width: 1280, height: 720 }); await settle(p, 300); };
const cid0 = Object.keys(g.characters)[0], offer = r.boons[cid0];
const cards = await p.locator('[data-phc-boons="' + cid0 + '"] [data-phc-boon]').allTextContents();
ok('the boon pick: three large cards, each its name, its sentence with its number from data and its worth (' + offer.join(', ') + ')', cards.length === 3 && offer.length === 3
  && cards.every((t) => /\d/.test(t) && /of your 50|No run power/.test(t)) && await p.locator('[data-phc-boons] [data-phc-boon] svg').count() === 3);
await both('survival-boon-pick');
await p.locator('[data-phc-boon="' + offer[0] + '"]').click();
await p.waitForFunction(() => window.__phc.getState().game.run.state === 'tile', null, { timeout: 30000 });
g = await G(); r = g.run;
ok('a boon clicked: it is the character\'s relic for the run (' + offer[0] + '), and the next tile is offered', (g.characters[cid0].relics || []).includes(offer[0]) && r.tiles.length >= 2 && r.tiles.length <= 3);
const tcards = await p.locator('[data-phc-tile]').allTextContents();
ok('the next tile: ' + tcards.length + ' cards, each its setting, a line, its Boss and its boon theme, none the tile just played', tcards.length === r.tiles.length && tcards.every((t) => /Boss:/.test(t) && /Boons:/.test(t)) && r.tiles.every((t) => t.setting !== 'ahoc'));
const tbg = await p.locator('[data-phc-tile]').evaluateAll((els) => els.map((e) => { const s = e.querySelector('span[aria-hidden="true"]'); return s ? getComputedStyle(s).backgroundImage : ''; }));
ok('each tile card draws its setting\'s backdrop by catalog id (survival-backdrop-<setting>-a), not the plain panel', tbg.length === r.tiles.length && r.tiles.every((t, i) => tbg[i].includes('survival-backdrop-' + t.setting + '-a')));
await both('survival-next-tile');
const tile = r.tiles[0];
await p.locator('[data-phc-tile="' + tile.id + '"]').click();
await p.waitForFunction(() => window.__phc.getState().game.run.stage === 2, null, { timeout: 30000 });
await p.waitForSelector('[data-phc-run-screen]', { timeout: 30000 });
r = await run();
ok('stage 2 on the tile picked (' + tile.setting + '): a fresh map of its own, the first row lit, "Stage 2" on the header', r.state === 'map' && r.world.at(-1).setting === tile.setting && r.nodes.every((n) => n.id.startsWith('s2.'))
  && /Stage 2/.test(await p.locator('[data-phc-run-where]').textContent()) && await p.locator('[data-phc-node][data-phc-state="reachable"]').count() === r.nodes.filter((n) => n.depth === 1).length);
await shot('survival-stage-2-map');
await mapFits('stage 2\'s map');
// ---------- rules 1.48: stage 2 walked along its lanes by clicking the map: a lane, a junction, the vault and back ----------
// (fights won by the tests-only run/skip, picks taken by the engine's actions; every move is a click on a lit marker)
const s2 = r, s2by = Object.fromEntries(s2.nodes.map((n) => [n.id, n])), vg = s2.nodes.find((n) => n.kind === 'vault_guard'), vc = s2.nodes.find((n) => n.kind === 'vault'), fork = s2by[vg.from];
const s2route = []; for (let id = fork.id; id; id = s2.nodes.find((n) => n.links.includes(id) && !n.spur)?.id) s2route.unshift(id);
const litNow = () => p.locator('[data-phc-node][data-phc-state="reachable"]').evaluateAll((b) => b.map((x) => x.getAttribute('data-phc-node')));
const seen = { lane: false, junction: false, fork: false, guard: false, chest: false, back: false };
const toMap = async () => { await p.evaluate(() => { const s = window.__phc.getState(); if (s.screen !== 'run') window.__phc.go?.('run'); }).catch(() => {}); await p.waitForSelector('[data-phc-run-screen], [data-phc-place]', { timeout: 30000, state: 'attached' }); await settle(p, 300);
  if (await p.locator('[data-phc-place]').count()) { await p.locator('[data-phc-leave]').click(); } // a safe node is a place (rules 1.46): walk out to the map
  await p.waitForSelector('[data-phc-pathmap]', { timeout: 30000 }); await settle(p, 60); };
for (let i = 0; i < 160; i++) {
  r = await run(); if (r.state === 'boon' || r.state === 'over') break;
  let e = null;
  if (r.state === 'map') {
    await toMap();
    const here = r.at ? s2by[r.at] : null, ids = await litNow();
    if (here && here.lane != null && !seen.lane && here.id !== fork.id && !here.spur) { seen.lane = ids.length === 1 && ids[0] === here.links[0]; ok('stage 2, on a lane (' + here.id + '): one way on, one lit marker', seen.lane); }
    if (here && here.junction && !here.gate && !seen.junction) { seen.junction = ids.length === here.links.length && ids.length >= 2 && await p.locator('[data-phc-node="' + here.id + '"][data-phc-junction]').count() === 1; ok('stage 2, at a junction (' + here.id + '): its ' + ids.length + ' trails lit, drawn as a meeting of trails', seen.junction); }
    if (here && here.id === fork.id && !seen.fork) {
      const tip = await p.locator('[data-phc-node="' + vg.id + '"]').getAttribute('data-tip-text');
      seen.fork = ids.includes(vg.id) && ids.length === 2 && /trail forks: a guarded vault/.test(tip || '');
      ok('the vault\'s fork: the lane and the guarded vault both lit, its card says so ("' + (tip || '').slice(0, 70) + '")', seen.fork);
      await both('survival-vault-fork');
    }
    if (here && here.id === vc.id && !seen.back) { seen.back = JSON.stringify(ids) === JSON.stringify(fork.links.filter((l) => l !== vg.id)); ok('after the chest the squad is back on its lane: the fork\'s next node lit (' + ids.join(', ') + ')', seen.back); }
    const next = !here ? s2route[0] : s2route.includes(here.id) && here.id !== fork.id ? (here.links.find((l) => s2route.includes(l)) || here.links[0]) : here.id === fork.id ? vg.id : here.id === vg.id ? vc.id : here.links.filter((l) => l !== vg.id)[0];
    await p.locator('[data-phc-node="' + next + '"]').click();
    await p.waitForFunction((id) => window.__phc.getState().game.run.at === id, next, { timeout: 30000 }).catch(() => {});
    if ((await run()).at !== next) { ok('stage 2: the click on ' + next + ' moved the squad', false); break; }
  } else if (r.state === 'fight') {
    e = await act({ type: 'run/skip' });
    if (!e && s2by[r.at]?.kind === 'vault_guard' && !seen.guard) { const f = (await run()).stats.fights.at(-1), name = (await G()).run && f.foes.map((x) => x.name);
      seen.guard = f.kind === 'vault_guard' && f.template === 'vault_watch' && f.foes.some((x) => x.tier === 'elite'); ok('the vault\'s guard: a fight of its own (' + f.template + ': ' + name.join(', ') + '), harder than an Elite\'s', seen.guard); }
  } else if (r.state === 'shop') { e = await act({ type: 'run/leave' }); // rules 1.42: a shop on the way (solo: leaving is the close)
  } else if (r.state === 'reward') {
    if (s2by[r.at]?.kind === 'vault' && !seen.chest) { const o = Object.values(r.offers)[0]; seen.chest = o.weapons.length === 3 && o.weapons.every((w) => w.rarity === 'relic' || w.rarity === 'masterwork') && (r.note.credits || 0) > 0;
      ok('the vault\'s chest: credits (' + r.note.credits + ') and three weapons a grade above stage 2\'s picks (' + o.weapons.map((w) => w.rarity).join(', ') + ')', seen.chest); await both('survival-vault-chest'); }
    for (const id of Object.keys(r.offers || {})) e = e || await act({ type: 'run/pick', charId: id, choice: 'credits' }); for (const id of Object.keys(r.lasting || {})) e = e || await act({ type: 'run/take', charId: id, choice: 0 });
  }
  if (e) { ok('stage 2 walked: ' + e, false); break; }
  await settle(p, 40);
}
ok('rules 1.48: stage 2 walked a lane, a junction and the vault and back (' + JSON.stringify(seen) + ')', Object.values(seen).every(Boolean));
await p.evaluate(() => window.__phc.go && window.__phc.go('run')).catch(() => {});
await p.waitForSelector('[data-phc-stage-screen="boon"]', { timeout: 60000 }).catch(() => {});
r = await run();
ok('stage 2 walked to its Boss: STAGE 2 CLEARED', r.stage === 2 && r.state === 'boon' && /STAGE 2 CLEARED/.test(await p.locator('[data-phc-cleared]').textContent().catch(() => '')));
await p.locator('[data-phc-retire]').click();
await p.waitForSelector('[data-phc-summary="retired"]', { timeout: 30000 });
g = await G();
const sum = (await p.locator('[data-phc-summary]').textContent()).replace(/\s+/g, ' ');
ok('retire: the summary (' + sum.slice(0, 110) + '): 2 stages cleared, 32 nodes (stage 2 took the vault\'s two), a row a stage with its fights, foes, credits, grade steps and boons', g.run.end.how === 'retired' && g.run.end.cleared === 2
  && /2 stages cleared/.test(sum) && /32 nodes walked/.test(sum) && await p.locator('[data-phc-stage-row]').count() === 2 && sum.includes(g.run.end.stages[0].boons[cid0] ? 'Kade: ' : 'Boons'));
await both('survival-summary');
// ---------- rules 1.47 (build step 6): the summary's tallies and Report a run ----------
{
  const sumTx = await p.locator('[data-phc-tallies]').textContent(), k = g.run.stats.fights.filter((f) => f.tally);
  ok('the summary sums the tallies: the whole run, then each stage (' + (await p.locator('[data-phc-tally]').count()) + ' tables), the run\'s dealt = the fights\' sum', await p.locator('[data-phc-tally="run"]').count() === 1 && await p.locator('[data-phc-tally="stage"]').count() === 2
    && Number(await p.locator('[data-phc-tally="run"] [data-phc-tally-cell="dealt"]').first().textContent()) === k.reduce((n, f) => n + Object.values(f.tally.chars)[0].dealt, 0) && /WHOLE RUN/.test(sumTx));
  const dl = p.waitForEvent('download', { timeout: 30000 });
  await p.locator('[data-phc-report-run]').click();
  const d = await dl, text = await (await import('node:fs/promises')).readFile(await d.path(), 'utf8'), rep = JSON.parse(text);
  ok('Report a run saves a file (' + d.suggestedFilename() + ') that holds the seed, the mode and the stage log, the fights\' tallies and the build', d.suggestedFilename().includes(SEED) && rep.format === 'phc-run-report' && rep.seed === SEED && rep.mode === 'Survival'
    && rep.stages.length === 2 && rep.fights.length === g.run.stats.fights.length && rep.fights[0].tally && rep.characters.length === 1 && !!rep.characters[0].gear.weapon && typeof rep.gameVersion === 'string' && rep.outcome.how === 'retired');
}
await p.locator('[data-phc-keep]').first().click();
const lib = await until(p, () => (window.__phc.getState().library || []).find((x) => x.kept) || null, null, 10000).catch(() => null);
ok('keep this character as a draft: in the library at its level (' + (lib && lib.name) + ')', !!lib && lib.kept.level === Object.values(g.characters)[0].level && lib.draft === true);
await p.locator('[data-phc-to-room]').click();
await p.waitForFunction(() => window.__phc.getState().screen === 'room', null, { timeout: 30000 });
const last = await p.locator('[data-phc-run]').textContent().catch(() => '');
ok('back in the room: the lobby with the last run\'s score and a way back to its summary ("' + last.replace(/\s+/g, ' ').slice(0, 120) + '")', /The last run/.test(last) && /retired after 2 stages cleared and 32 nodes walked/.test(last) && await p.locator('[role="radiogroup"]').count() === 1 && await p.locator('[data-phc-to-summary]').count() === 1);
ok('no page errors (' + p.errors.slice(0, 3).join(' | ') + ')', !p.errors.length);
await p.context().close();

// ---------- C. rules 1.46 (build step 4b): two browsers, a give seen arriving, ready and the host's close ----------
const h = await player(browser, 'host-c', { play: 'survival' }), gu = await player(browser, 'guest-c', { play: 'survival' });
await h.context().addInitScript((seed) => { try { localStorage.setItem('phc.testRoom', '1'); localStorage.setItem('phc.testSeed', seed); } catch { /* */ } }, SEED);
for (const x of [h, gu]) await x.setViewportSize({ width: 1280, height: 720 });
const create = async (page, name) => {
  await click(page, 'Create a character');
  await page.getByPlaceholder('What the squad calls you').fill(name);
  await page.locator('main button[aria-pressed]').first().click();
  await click(page, 'Next ›');
  await page.locator('button', { hasText: /^Use .* ›$/ }).first().click();
  await click(page, 'Next ›'); await click(page, 'Next ›'); await click(page, 'Next ›');
  await page.locator('button', { hasText: 'Line soldier' }).first().click();
  await click(page, 'Next ›'); await lockIn(page);
  await page.waitForSelector('text=✓ LOCKED IN');
};
await hostAs(h, 'Leon');
await h.waitForSelector('[role="radiogroup"]');
const code = (await h.locator('text=/ROOM [A-Z0-9]{6}/').first().textContent()).match(/ROOM ([A-Z0-9]{6})/)[1];
await gu.goto(BASE + '/?room=' + code); await gu.getByPlaceholder('Leon').fill('Mai'); await click(gu, 'Join ›'); await gu.waitForSelector('text=The squad');
await create(h, 'Kade'); await create(gu, 'Ha');
await h.locator('button[data-phc-start]').click();
await until(gu, () => !!document.querySelector('[data-phc-run-screen]'), null, 30000).catch(() => false);
const HG = () => h.evaluate(() => window.__phc.getState().game), GG = () => gu.evaluate(() => window.__phc.getState().game);
const actOn = (page, a) => page.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
let hr = (await HG()).run;
// the way to the first shop: a path through the links from the first row
const byId = Object.fromEntries(hr.nodes.map((n) => [n.id, n])), shopN = hr.nodes.filter((n) => n.kind === 'shop').sort((a, b) => a.depth - b.depth)[0];
const way = (() => { const back = (id) => { const n = byId[id]; if (n.depth === 1) return [id]; const prev = hr.nodes.find((x) => x.links.includes(id) && back(x.id)); return prev ? [...back(prev.id), id] : null; }; return back(shopN.id) || []; })();
for (let i = 0; i < 80; i++) {
  hr = (await HG()).run; if (hr.state === 'shop' || hr.state === 'over') break;
  let e = null;
  if (hr.state === 'map') { const next = way[hr.path.length]; e = await actOn(h, { type: 'run/move', node: next }); if (!e) { await settle(h, 150); e = await actOn(gu, { type: 'run/move', node: next }); } }
  else if (hr.state === 'fight') e = await actOn(h, { type: 'run/skip' });
  else if (hr.state === 'reward') { for (const id of Object.keys(hr.offers || {})) e = e || await actOn(h, { type: 'run/pick', charId: id, choice: 'credits' }); for (const id of Object.keys(hr.lasting || {})) e = e || await actOn(h, { type: 'run/take', charId: id, choice: 'none' }); }
  if (e) { ok('C: walked to the shop: ' + e, false); break; }
  await settle(h, 120);
}
await h.evaluate(() => window.__phc.go('run')).catch(() => {}); await gu.evaluate(() => window.__phc.go('run')).catch(() => {});
await h.waitForSelector('[data-phc-fullscreen]', { timeout: 60000 }); await gu.waitForSelector('[data-phc-fullscreen]', { timeout: 60000 });
ok('C: both browsers stand in the shop, full screen (node ' + shopN.id + ')', (await HG()).run.state === 'shop');
// a graded weapon with a mod in Kade's pack (a test hand-off: the host's state, as the purse above)
let hg = await HG(); const kade = Object.values(hg.characters).find((c) => c.owner === hg.hostId), ha = Object.values(hg.characters).find((c) => c.id !== kade.id);
await h.evaluate(([cid, gun]) => { const c = window.__phc.getState().game.characters[cid]; c.pack = [...(c.pack || []), { id: gun, weapon: gun, name: 'Kade\'s old rifle', qty: 1, kind: 'weapon', rarity: 'fine', mods: ['mod_red_dot'] }]; c.credits += 400; }, [kade.id, kade.weapon]);
await h.locator('[data-phc-tab="give"]').click();
await h.waitForSelector('[data-phc-give-to]');
ok('C: the Give tab: the party as cards (' + (await h.locator('[data-phc-give-to]').allTextContents()).join(', ') + '), what can\'t be given greyed with its reason', await h.locator('[data-phc-give-to="' + ha.id + '"]').count() === 1
  && /never given/.test(await h.locator('[data-phc-give-row="train"]').textContent()));
const haC0 = (await GG()).characters[ha.id].credits;
await h.locator('[data-phc-give-row="credits"]').click();
for (let i = 0; i < 3; i++) await h.locator('[data-phc-give-send] [aria-label="More"]').click(); // 100 → 130 → 140 → 150? (steps of 10 above 10)
const n = Number((await h.locator('[data-phc-give-n]').textContent()).replace(/\D/g, ''));
ok('C: the button reads what it does ("' + (await h.locator('[data-phc-give-go]').textContent()) + '")', new RegExp('^Give ' + n + ' credits to Ha$').test(await h.locator('[data-phc-give-go]').textContent()));
await h.screenshot({ path: OUT + 'survival-shop-give-1280.png' });
await h.locator('[data-phc-give-go]').click();
const toastC = await until(gu, () => window.__phc.getState().toast?.text || null, null, 15000).catch(() => '');
ok('C: the guest sees the credits arrive: a toast ("' + toastC + '") and the purse (' + haC0 + ' → ' + (await GG()).characters[ha.id].credits + ')', /gives Ha \d+ credits/.test(toastC) && (await GG()).characters[ha.id].credits === haC0 + n);
const idx = (await HG()).characters[kade.id].pack.findIndex((x) => x.name === 'Kade\'s old rifle');
await h.locator('[data-phc-give-row="pack:' + idx + '"]').click();
await h.locator('[data-phc-give-go]').click();
await gu.waitForFunction((cid) => (window.__phc.getState().game.characters[cid].pack || []).some((x) => x.name === 'Kade\'s old rifle'), ha.id, { timeout: 30000 }).catch(() => {});
const got = ((await GG()).characters[ha.id].pack || []).find((x) => x.name === 'Kade\'s old rifle');
ok('C: the graded weapon arrives whole on the guest\'s side (Fine, its mod, its own pack line)', !!got && got.rarity === 'fine' && JSON.stringify(got.mods) === '["mod_red_dot"]' && got.qty === 1);
ok('C: both browsers\' visit logs say who gave what', /gives Ha/.test(await gu.locator('[data-phc-visit-log]').textContent()) && /gives Ha/.test(await h.locator('[data-phc-visit-log]').textContent()));
await h.setViewportSize({ width: 1920, height: 1080 }); await settle(h, 600); await h.screenshot({ path: OUT + 'survival-shop-give-1920.png' }); await h.setViewportSize({ width: 1280, height: 720 });
await gu.locator('[data-phc-leave]').click();
await h.waitForFunction((pid) => !!window.__phc.getState().game.run.ready?.[pid], (await GG()).players.find((x) => x.name === 'Mai').id, { timeout: 30000 }).catch(() => {});
ok('C: the guest marks Ready to leave; the host sees READY and the shop stays open', (await HG()).run.state === 'shop' && /READY/.test(await h.locator('[data-phc-party][data-phc-ready="1"]').first().textContent().catch(() => '')));
await h.locator('[data-phc-close]').click();
await gu.waitForSelector('[data-phc-pathmap]', { timeout: 30000 }).catch(() => {});
ok('C: the host closes the shop: both browsers are back on the path map', (await HG()).run.state === 'map' && await gu.locator('[data-phc-pathmap]').count() === 1 && await h.locator('[data-phc-pathmap]').count() === 1);
// ---------- C2. rules 1.49 (build step 10): a lean and a tie where the way forks (rules 1.48, spec rule 11) ----------
// Both walk on along the lane (the first click walks the squad on: one way forward) to the next fork; there the host
// clicks one trail and the guest another: the guest sees the host's mark live, and the tie goes to the host's.
for (let i = 0; i < 80; i++) {
  hr = (await HG()).run; if (hr.state === 'over') break;
  const here = hr.nodes.find((n) => n.id === hr.at), nexts = here ? here.links : [];
  if (hr.state === 'map' && nexts.length >= 2) break;
  let e = null;
  if (hr.state === 'map') e = await actOn(h, { type: 'run/move', node: nexts[0] });
  else if (hr.state === 'fight') e = await actOn(h, { type: 'run/skip' });
  else if (hr.state === 'shop') { e = await actOn(h, { type: 'run/leave', close: true }); }
  else if (hr.state === 'reward') { for (const id of Object.keys(hr.offers || {})) e = e || await actOn(h, { type: 'run/pick', charId: id, choice: 'credits' }); for (const id of Object.keys(hr.lasting || {})) e = e || await actOn(h, { type: 'run/take', charId: id, choice: 'none' }); }
  if (e) { ok('C2: walked on to a fork: ' + e, false); break; }
  await settle(h, 120);
}
hr = (await HG()).run;
const forkN = hr.nodes.find((n) => n.id === hr.at), [tA, tB] = forkN ? forkN.links : [];
ok('C2: the squad stands where the way forks (' + (forkN && forkN.id) + ': ' + (forkN ? forkN.links.join(', ') : '-') + ')', !!tA && !!tB && hr.state === 'map');
if (tA && tB) {
  // each browser on its path map (a place still open on a screen is walked out of, as the stage 2 walk does)
  for (const x of [h, gu]) {
    if (!(await x.locator('[data-phc-pathmap]').count())) await x.evaluate(() => window.__phc.go('run')).catch(() => {});
    await x.waitForSelector('[data-phc-pathmap], [data-phc-place], [data-phc-fullscreen]', { timeout: 30000, state: 'attached' });
    if (!(await x.locator('[data-phc-pathmap]').count()) && await x.locator('[data-phc-leave]').count()) await x.locator('[data-phc-leave]').first().click();
    await x.waitForSelector('[data-phc-pathmap]', { timeout: 30000 });
  }
  await h.locator('[data-phc-node="' + tA + '"]').click();
  const marked = await until(gu, (id) => /marked by Leon/.test(document.querySelector('[data-phc-node="' + id + '"]')?.getAttribute('aria-label') || '') || null, tA, 15000).catch(() => false);
  ok('C2: the host\'s mark shows live on the guest\'s map (' + tA + ': "marked by Leon"), the squad waits for the guest', !!marked && (await GG()).run.at === forkN.id);
  await h.screenshot({ path: OUT + 'survival-lean-1280.png' });
  await gu.locator('[data-phc-node="' + tB + '"]').click();
  await h.waitForFunction((id) => window.__phc.getState().game.run.at !== id, forkN.id, { timeout: 30000 }).catch(() => {});
  ok('C2: one mark each is a tie, and it goes to the host\'s trail (' + tA + ', not ' + tB + ')', (await HG()).run.at === tA && (await GG()).run.at === tA);
}
ok('C: no page errors (' + [...h.errors, ...gu.errors].slice(0, 3).join(' | ') + ')', !h.errors.length && !gu.errors.length);
await h.context().close(); await gu.context().close();

// ---------- D. rules 1.49 (build step 10): a boon felt, stage 2 and 3 reached, a Relic step at a Forge in stage 3 ----------
// Solo, the run walked by the engine's actions (fights won by run/skip). At stage 1's Boss the boon is clicked on its
// card; the gear card's own numbers (the engine's gear preview) show it felt. In stage 3 the rifle is made Masterwork and
// the purse topped up (a test hand-off, as section C's graded rifle), the squad walks to a Forge, and the Relic step is
// clicked: three named properties offered, one taken, the rifle a Relic with it, 6,500 credits paid.
const d = await player(browser, 'host-d', { play: 'survival' });
await d.context().addInitScript((seed) => { try { localStorage.setItem('phc.testRoom', '1'); localStorage.setItem('phc.testSeed', seed); } catch { /* */ } }, SEED);
await d.setViewportSize({ width: 1280, height: 720 });
const DG = () => d.evaluate(() => window.__phc.getState().game), dAct = (a) => actOn(d, a);
await hostAs(d, 'Leon'); await create(d, 'Ash');
await d.locator('button[data-phc-start]').click();
await d.waitForSelector('[data-phc-run-screen]', { timeout: 60000 });
const dcid = Object.keys((await DG()).characters)[0];
/** Walk by the engine's actions until `stop` says so (fights skipped, picks as credits, shops left, the first trail). */
const walkD = async (stop, why) => { for (let i = 0; i < 400; i++) {
  const dr = (await DG()).run; if (!dr || dr.state === 'over' || await stop(dr)) return true;
  let e = null;
  if (dr.state === 'map') { const here = dr.nodes.find((n) => n.id === dr.at), nx = here ? here.links.filter((l) => dr.nodes.find((n) => n.id === l)?.kind !== 'vault_guard') : dr.nodes.filter((n) => n.depth === 1).map((n) => n.id); e = await dAct({ type: 'run/move', node: nx[0] }); }
  else if (dr.state === 'fight') e = await dAct({ type: 'run/skip' });
  else if (dr.state === 'shop') e = await dAct({ type: 'run/leave' });
  else if (dr.state === 'reward') { for (const id of Object.keys(dr.offers || {})) e = e || await dAct({ type: 'run/pick', charId: id, choice: 'credits' }); for (const id of Object.keys(dr.lasting || {})) e = e || await dAct({ type: 'run/take', charId: id, choice: 'none' }); }
  else if (dr.state === 'boon') e = await dAct({ type: 'run/boon', charId: dcid, choice: 0 });
  else if (dr.state === 'tile') e = await dAct({ type: 'run/tile', tile: dr.tiles[0].id });
  if (e) { ok('D: ' + why + ': ' + e, false); return false; }
} return false; };
await walkD((dr) => dr.state === 'boon', 'stage 1 walked to its Boss');
let dg = await DG(); const dOffer = dg.run.boons[dcid];
const felt = ['boon.true_aim', 'boon.edge'].find((b) => dOffer.includes(b));
const wpn = () => ({ id: dg.characters[dcid].weapon, rarity: dg.characters[dcid].weaponState?.rarity || 'standard' });
const before = await d.evaluate(([cid, w]) => window.__phc.gearPreview(cid, w), [dcid, wpn()]);
await d.evaluate(() => window.__phc.go('run')).catch(() => {});
await d.waitForSelector('[data-phc-boon]', { timeout: 30000 });
await d.locator('[data-phc-boon="' + (felt || dOffer[0]) + '"]').click();
await d.waitForFunction(() => window.__phc.getState().game.run.state === 'tile', null, { timeout: 30000 });
dg = await DG();
const after = await d.evaluate(([cid, w]) => window.__phc.gearPreview(cid, w), [dcid, wpn()]);
const line = (pv, k) => pv?.lines?.find((l) => l.key === k)?.num;
ok('D: a boon felt: ' + (felt || dOffer[0]) + ' clicked, and the rifle\'s card reads it (to hit ' + line(before, 'hit') + ' → ' + line(after, 'hit') + '%, damage ' + line(before, 'dmg') + ' → ' + line(after, 'dmg') + ')',
  !!felt && (dg.characters[dcid].relics || []).includes(felt) && (felt === 'boon.true_aim' ? line(after, 'hit') > line(before, 'hit') : line(after, 'dmg') > line(before, 'dmg')));
await walkD((dr) => dr.stage === 2 && dr.state === 'map', 'the next tile');
ok('D: stage 2 reached with the boon carried', (await DG()).run.stage === 2 && ((await DG()).characters[dcid].relics || []).includes(felt));
await walkD((dr) => dr.stage === 3 && dr.state === 'map', 'stage 2 walked');
dg = await DG(); let dr = dg.run;
ok('D: stage 3 reached (its fresh map: ' + dr.nodes.length + ' nodes)', dr.stage === 3 && dr.nodes.every((n) => n.id.startsWith('s3.')));
// the way to the first Forge stage 3's map can reach (a path through the links from the camp)
const dby = Object.fromEntries(dr.nodes.map((n) => [n.id, n]));
const toForge = (() => { const back = (id) => { const n = dby[id]; if (n.depth === 1) return [id]; for (const x of dr.nodes) if (x.links.includes(id) && !x.spur) { const b = back(x.id); if (b) return [...b, id]; } return null; };
  for (const f of dr.nodes.filter((n) => n.kind === 'forge').sort((a, b) => a.depth - b.depth)) { const b = back(f.id); if (b) return b; } return []; })();
await d.evaluate((cid) => { const c = window.__phc.getState().game.characters[cid]; c.weaponState = { ...(c.weaponState || {}), rarity: 'masterwork' }; c.credits = Math.max(c.credits || 0, 8000); }, dcid);
for (let i = 0; i < 80; i++) {
  dr = (await DG()).run; if (dr.at === toForge.at(-1) || dr.state === 'over') break;
  let e = null;
  if (dr.state === 'map') e = await dAct({ type: 'run/move', node: toForge[dr.path.filter((x) => x.startsWith('s3.')).length] });
  else if (dr.state === 'fight') e = await dAct({ type: 'run/skip' });
  else if (dr.state === 'shop') e = await dAct({ type: 'run/leave' });
  else if (dr.state === 'reward') { for (const id of Object.keys(dr.offers || {})) e = e || await dAct({ type: 'run/pick', charId: id, choice: 'credits' }); for (const id of Object.keys(dr.lasting || {})) e = e || await dAct({ type: 'run/take', charId: id, choice: 'none' }); }
  if (e) { ok('D: the way to the Forge: ' + e, false); break; }
}
await d.evaluate(() => window.__phc.go('run')).catch(() => {});
await d.waitForSelector('[data-phc-choices] [data-phc-choice^="relic:main:"]', { timeout: 30000 }).catch(() => {});
const relics = await d.locator('[data-phc-choices] [data-phc-choice^="relic:main:"]').evaluateAll((l) => l.map((e) => ({ key: e.getAttribute('data-phc-choice'), why: e.hasAttribute('data-phc-why'), text: e.textContent })));
ok('D: at stage 3\'s Forge the Relic step offers three named properties, each with its worth against the cap (' + relics.map((x) => x.key.split(':')[2]).join(', ') + ')', relics.length === 3 && relics.every((x) => !x.why && /Worth \d+ of 50/.test(x.text)));
await d.screenshot({ path: OUT + 'survival-relic-step-1280.png' });
const c0 = (await DG()).characters[dcid];
if (relics[0]) await d.locator('[data-phc-choice="' + relics[0].key + '"]').click();
await d.waitForFunction((cid) => window.__phc.getState().game.characters[cid].weaponState?.rarity === 'relic', dcid, { timeout: 30000 }).catch(() => {});
const c1 = (await DG()).characters[dcid], prop = relics[0] && relics[0].key.split(':')[2];
ok('D: the Relic step taken: the rifle is a Relic with ' + prop + ', 6,500 credits paid (' + c0.credits + ' → ' + c1.credits + ')', c1.weaponState?.rarity === 'relic' && c1.weaponState?.prop === prop && c0.credits - c1.credits === 6500);
ok('D: no page errors (' + d.errors.slice(0, 3).join(' | ') + ')', !d.errors.length);
await browser.close();
