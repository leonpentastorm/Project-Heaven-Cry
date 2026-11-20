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
// Upgrade tab takes 4a's grade step at the full price; solo it has no Give tab; every safe node
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
// Rules 1.54 item 11 (every mode keeps the side panels): every run screen is the play screen's middle; at every run
// state (the camp, the path map, the shop, a place, the rewards, the stage cleared, the summary) the left sheet and the
// right panel are both on screen at 1280 x 720 (lib.mjs sidePanels); a weapon taken after node 1 is equipped through
// the sheet's GEAR tab by a click; the phase control (Ready, Leave, Go) is the right panel's squad.
// Rules 1.54 items 2 to 10 (materials, making, the training bar): node 1's pick is two large cards, the Materials card
// (gunpowder, casings, mana residue, each with its count) and one weapon (its 72 px icon, its grade, the gear preview's
// numbers in its hover card); the Materials card clicked, the three arrive in the pack (state). At the shop the ammo
// maker is bought from the counter by a click, and rounds for the gun in hand are made through the sheet's GEAR tab
// (Make: the stepper to 2, Make): the rounds arrive, the gunpowder and casings leave, the visit's log says so. A
// training ground's drill card shows its bar (where you stand, +the ground's drill, the next mark in words). At stage 1's
// end a focus is placed in the pack (the suite's set-up), held in the off hand through the sheet (the knife in the main
// hand), and ten mana residue are pressed into a core through Make. TOP_SHOTS=dir copies top-make, top-lootcards and
// top-trainingbar there.
import { readFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium, player, click, hostAs, lockIn, until, pickAction, settle, OUT, BASE, campStart, campConfirmGo, sidePanels } from './lib.mjs';
// PHC_SHOTS=1: the ambush screens for the lead (rules 1.90), at 1280 x 720, in .check/ambush-033/
const AMBUSH_SHOTS = process.env.PHC_SHOTS ? fileURLToPath(new URL('../../../.check/ambush-033', import.meta.url)) : null;
if (AMBUSH_SHOTS) mkdirSync(AMBUSH_SHOTS, { recursive: true });
const CARDS = JSON.parse(readFileSync(new URL('../../../data/rules.json', import.meta.url), 'utf8')).combat.cards;
const DATA = (f) => JSON.parse(readFileSync(new URL('../../../data/' + f, import.meta.url), 'utf8'));
const SVD = DATA('survival.json'), WPN = Object.fromEntries(DATA('weapons.json').items.map((w) => [w.id, w])), RAR = DATA('rules.json').rarity;
// rules 1.54 (materials and making): the recipes and the items, from data (no item id typed here)
const RECIPES = DATA('recipes.json').items, ITM = DATA('items.json').items;
const MAKER = RECIPES.find((x) => x.tool.item).tool.item, CORE = RECIPES.find((x) => x.tool.focus === 'any');
/** How many of an item id a character carries (its pack lines); rounds of a calibre: the loose rounds. */
const held = (c, id) => (c.pack || []).filter((x) => (x.item || x.id) === id).reduce((t, x) => t + (x.qty || 0), 0);
const loose = (c, cal) => (c.pack || []).filter((x) => x.calibre === cal && !x.mags && !x.ammoType).reduce((t, x) => t + (x.qty || 0), 0);
/** rules 1.54 item 2: the pick a walk by actions takes: the Materials card where the pick has one, else the first weapon. */
const pickOf = (o) => (o && o.materials && o.materials.length ? 'materials' : 0);
/** The screenshots this build is judged by (top-make, top-lootcards, top-trainingbar), copied from OUT by name. */
const TOP = process.env.TOP_SHOTS ? process.env.TOP_SHOTS.replace(/\/?$/, '/') : null;
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
// Items 2.0 lane A3 (design section 6): every item drawn is the one item card. Its picture is never an empty box (the
// chain's picture or the general placeholder, loaded), and a grade's frame is never alone: the card it sits in says the
// grade's word. ITEM_SHOTS (a folder): the place at 1280 x 720 and 1600 x 900, for the lead's look.
const ITEM_SHOTS = process.env.ITEM_SHOTS ? process.env.ITEM_SHOTS.replace(/\/?$/, '/') : null;
const itemCards = async (where) => {
  const r = await p.evaluate(() => { const pics = [...document.querySelectorAll('[data-phc-item-pic]')], bad = [];
    for (const e of pics) { const im = e.querySelector('img'); if (!im || !im.getAttribute('src') || (im.complete && !im.naturalWidth)) bad.push('empty: ' + e.getAttribute('data-phc-item-pic')); }
    for (const e of document.querySelectorAll('[data-phc-grade-frame]')) { const g = e.getAttribute('data-phc-grade-frame'); if (g === 'standard') continue; const box = e.closest('[data-phc-item-card], [data-phc-pick], [data-phc-service], [data-phc-choice], article, button');
      if (!box || !box.querySelector('[data-phc-grade="' + g + '"], [data-phc-step]')) bad.push('a ' + g + ' frame with no word: ' + e.getAttribute('data-phc-item-pic')); }
    return { n: pics.length, bad }; });
  ok('Items 2.0 A3, ' + where + ': ' + r.n + ' item pictures, none empty, no grade frame without its word' + (r.bad.length ? ' (' + r.bad.slice(0, 4).join('; ') + ')' : ''), !r.bad.length);
  if (ITEM_SHOTS) { for (const [w, hh] of [[1280, 720], [1600, 900]]) { await p.setViewportSize({ width: w, height: hh }); await p.mouse.move(2, 2); await settle(p, 500); await p.screenshot({ path: ITEM_SHOTS + where.replace(/[^a-z0-9]+/gi, '-') + '-' + w + '.png' }); } await p.setViewportSize({ width: 1280, height: 720 }); await settle(p, 300); }
  return r;
};
const shot = async (name) => { await p.waitForFunction(() => !document.querySelector('.phc-cb-dock'), null, { timeout: 30000 }).catch(() => {}); await settle(p, 1200); return p.screenshot({ path: OUT + name + '.png' }); };

// ---------- the lobby: a character, then Start the run ----------
await hostAs(p, 'Leon');
await click(p, 'Create a character');
await p.getByPlaceholder('What the squad calls you').fill('Kade');
await p.locator('main button[aria-pressed]').first().click();
await click(p, 'Next ›');
await p.locator('button', { hasText: /^Use .* ›$/ }).first().click();
await click(p, 'Next ›'); await click(p, 'Next ›'); await click(p, 'Next ›');
await click(p, 'Next ›'); await lockIn(p);
await p.waitForSelector('text=✓ LOCKED IN');
ok('a test room (settings.test, from the test hook)', (await G()).settings.test === true);
// B3 (0.32): at 1280 x 720 the lobby's mode cards and Start the run are on the first screen (they ran below the fold)
const fold = await p.evaluate(() => { const s = document.querySelector('[data-phc-start]').getBoundingClientRect(), m = [...document.querySelectorAll('[data-phc-mode]')].map((e) => e.getBoundingClientRect().bottom); return { start: s.bottom, modes: Math.max(...m), vh: innerHeight }; });
ok('B3: the lobby at 1280 x 720 shows the mode cards (to ' + Math.round(fold.modes) + ') and Start the run (to ' + Math.round(fold.start) + ') above the fold', fold.start <= fold.vh && fold.modes <= fold.vh);
await click(p, 'Start the run');
// item E (0.31.12): a level-up due (unclaimed steps) asks first, from the lobby's Start the run as from the camp's Ready; going on starts the run
{ await settle(p, 400); const dlg = p.locator('[data-phc-dialog]'); const asked = (await dlg.count()) > 0 && /Level up first\?/.test(await dlg.first().innerText());
  if (asked) await p.screenshot({ path: OUT + 'survival-levelup-first-lobby.png' });
  ok('Start the run with a level-up due asks "Level up first?" and offers to open Level up or start without it', !asked || ((await dlg.first().innerText()).includes('Open Level up') && (await dlg.first().innerText()).includes('Start without')));
  console.log('note the lobby prompt was ' + (asked ? 'asked' : 'not asked')); }
await campConfirmGo(p);
// ---------- rules 1.51, 1.52: the camp, one flow: the loadout (a free weapon from the rack, a free focus, a budget at the
// shop's prices), then the starting boon, then Ready ----------
await p.waitForSelector('[data-phc-camp]', { timeout: 60000 });
const LO = SVD.loadout, campId = Object.keys((await G()).characters)[0];
/** An archetype's weapons cheapest first (Leon, 14 Nov: the free one is the most basic, the rack's better one the next). */
const archOf = (id) => { const a = LO.archetypes.list.find((x) => x.id === id); return Object.values(WPN).filter((w) => w.mastery_family === a.family && w.category === a.category && !(a.skip || []).includes(w.id) && w.price_credits > 0).sort((x, y) => x.price_credits - y.price_credits || (x.id < y.id ? -1 : 1)).map((w) => w.id); };
const FREE = (id) => archOf(id)[0], GUN = FREE('smgs');
const pick0 = () => G().then((g) => g.run.loadout?.[campId]), me0 = () => G().then((g) => g.characters[campId]);
const numIn = (sel) => p.locator(sel).textContent().then((t) => Number((t.match(/\d+/g) || []).pop()));
ok('Start the run opens the camp first (state loadout), the budget whole: ' + LO.budget, (await run()).state === 'loadout' && await numIn('[data-phc-camp-left]') === LO.budget && await numIn('[data-phc-camp-used]') === 0);
// rules 1.55 item 49: the camp is a checklist: step 1 the free weapon (one FREE card an archetype, no price), step 2 the free
// focus (the four, only for a character with a door skill: its chip says so), step 3 the budget (another one and the better
// one of each family, priced, the better one compared with the free one)
const focusStep = await p.locator('[data-phc-camp-check="focus"]').count() === 1;
ok('the checklist and step 1: one FREE card an archetype (' + LO.archetypes.list.length + '), no price among them; the focus step ' + (focusStep ? 'with the four foci' : 'absent (no door skill)') + '; the better ones priced on step 3',
  await p.locator('[data-phc-camp-rack]').count() === LO.archetypes.list.length && await p.locator('[data-phc-camp-row="weapon"] [data-phc-camp-pick]').count() === LO.archetypes.list.length
  && await p.locator('[data-phc-camp-row="weapon"] [data-phc-camp-price]').count() === 0 && await p.locator('[data-phc-camp-row="weapon"] [data-phc-camp-freetag]').count() === LO.archetypes.list.length
  && await p.locator('[data-phc-camp-row="focus"] [data-phc-camp-pick]').count() === (focusStep ? 4 : 0) && await p.locator('[data-phc-camp-row="budget"] [data-phc-camp-compare]').count() > 0
  && /NOT PICKED/.test(await p.locator('[data-phc-camp-check="weapon"]').textContent()) && /costs nothing/.test(await p.locator('[data-phc-camp-check="weapon"]').getAttribute('data-tip-text'))); // (0.31.11: the help line is gone, the step says it)
// moving on with nothing taken asks first, in plain words; Go back and pick closes it and leaves the camp as it was
await p.locator('[data-phc-camp-next]').click(); await settle(p, 300);
const askText = await p.locator('[data-phc-dialog] p').textContent().catch(() => '');
await p.locator('[data-phc-dialog] button', { hasText: 'Go back and pick' }).click(); await settle(p, 300);
ok('Next with the free weapon not taken asks first ("' + askText + '"); Go back and pick stays on the loadout', /You have not taken your free weapon/.test(askText) && /costs? nothing/.test(askText)
  && !(await p.locator('[data-phc-dialog]').count()) && await p.locator('[data-phc-camp-row="weapon"]').count() === 1 && !(await pick0()).weapon);
await p.locator('[data-phc-camp-recommended]').click(); await settle(p, 300);
const rec = await pick0();
ok('Recommended fills a weapon and spends from the budget (' + rec.weapon + ', ' + JSON.stringify(rec.take) + '); the weapon chip is ticked', !!rec.weapon && Object.keys(rec.take).length > 0 && await numIn('[data-phc-camp-left]') < LO.budget
  && (await p.locator('[data-phc-camp-check="weapon"]').getAttribute('data-phc-done')) === '1');
// rules 1.55 item 51: a tank's Recommended kit holds an off-hand item (the shield); put back every off-hand line it bought
// so the two-handed bow below can be taken (a two-hander beside a shield is refused in words, item 50); rules 1.57: a shield
// is a weapons.json row (phys.props holds "shield", character.ts isShieldId), no longer an items.json off-hand item
const offHandBuy = (id) => (WPN[id]?.phys?.props || []).includes('shield') || ITM.some((it) => it.id === id && it.slot === 'off_hand' && !it.focus);
for (const k of Object.keys(rec.take)) if (k.startsWith('stock:') && offHandBuy(k.slice(6))) { await p.locator('[data-phc-camp-less="' + k + '"]').click(); await settle(p, 300); }
await p.locator('[data-phc-camp-pick="weapon:' + FREE('bows') + '"]').click(); await settle(p, 300);
ok('ONE weapon: the bow taken replaces the last pick, with one quiver loaded', (await pick0()).weapon === FREE('bows') && (await me0()).weapon === FREE('bows') && (await me0()).quivers?.length === 1 && (await me0()).loaded > 0); // rules 1.53: one quiver, full
await p.locator('[data-phc-camp-pick="weapon:' + GUN + '"]').click(); await settle(p, 300);
const fp = (await pick0()).focus; if (fp) { await p.locator('[data-phc-camp-pick="focus:' + fp + '"]').click(); await settle(p, 300); }
ok('the free gun (a loaded magazine and a spare), the focus declined', (await me0()).weapon === GUN && !(await pick0()).focus && (await me0()).pack.some((x) => x.weapon === GUN && x.mags));
const left0 = await numIn('[data-phc-camp-left]');
// rules 1.55: the camp lists nothing over its budget (a second focus at 1000 is not on the menu), nothing changes
const campPrices = await p.locator('[data-phc-camp-card] [data-phc-camp-price]').evaluateAll((l) => l.map((e) => Number((e.textContent.match(/\d+/g) || ['0']).pop())));
ok('rules 1.55: no line over the budget on the camp menu (' + campPrices.length + ' priced), no second focus (the Visualizer is not sold)', campPrices.length > 0 && campPrices.every((n) => n <= LO.budget) && await p.locator('[data-phc-camp-card="stock:visualizer"]').count() === 0 && await numIn('[data-phc-camp-left]') === left0);
const stim = await numIn('[data-phc-camp-card="stim_injector"] [data-phc-camp-price]');
const had = (await pick0()).take.stim_injector || 0;
if (left0 >= stim) { await p.locator('[data-phc-camp-more="stim_injector"]').click(); await settle(p, 300); }
ok('a stim from the budget at the shop\'s price (' + stim + '): Budget left and Budget used move, the purse is what is left',
  left0 < stim || ((await pick0()).take.stim_injector === had + 1 && await numIn('[data-phc-camp-left]') === left0 - stim && (await me0()).credits === left0 - stim));
// a second weapon from the rack (another one of a free weapon, at its price): a knife in the pack
if ((await pick0()).take['stock:armour:1']) { await p.locator('[data-phc-camp-less="stock:armour:1"]').click(); await settle(p, 300); }
const KN = FREE('light_blades'), knife = await numIn('[data-phc-camp-card="stock:' + KN + '"] [data-phc-camp-price]');
await p.locator('[data-phc-camp-more="stock:' + KN + '"]').click(); await settle(p, 300);
ok('a second weapon from the rack at its price (' + knife + '): it goes in the pack', (await me0()).pack.some((x) => x.weapon === KN) && knife === WPN[KN].price_credits);
await p.screenshot({ path: OUT + 'survival-camp-1280.png' });
await itemCards('camp');
if (process.env.CAMP_SHOT) { await p.setViewportSize({ width: 1920, height: 1080 }); await settle(p, 500); await p.screenshot({ path: process.env.CAMP_SHOT }); await p.setViewportSize({ width: 1280, height: 720 }); await settle(p, 300); } // the camp at 1920, on request
await sidePanels(p, 'the camp');
// Leon, 15 Nov: the camp's top bar (the budget, Next) stays in sight however far the camp is scrolled; nothing on a card
// spills (a name, a stat row: its scrollWidth inside its box); two cards a family ("another one" at the free one's foot);
// the families use the width (no family grid leaves more than a card's width empty on the right)
const campOverflow = () => p.evaluate(() => { const bad = []; for (const e of document.querySelectorAll('[data-phc-camp-name], [data-phc-camp-stats] dt, [data-phc-camp-stats] dd, [data-phc-camp-card], [data-phc-camp-free], [data-phc-startboon]')) if (e.scrollWidth > e.clientWidth + 1) bad.push((e.textContent || '').slice(0, 24)); return bad; });
for (const [w, hh] of [[1280, 720], [1920, 1080]]) {
  await p.setViewportSize({ width: w, height: hh }); await settle(p, 500);
  const bad = await campOverflow();
  ok('the camp at ' + w + ': no card\'s name or stat row overflows its box' + (bad.length ? ' (' + bad.join(' | ') + ')' : ''), !bad.length);
  const fam = await p.evaluate(() => [...document.querySelectorAll('[data-phc-camp-family]')].map((f) => f.querySelectorAll('.phc-camp-pair > *').length)); // step 3: another one, the better one
  const gap = await p.evaluate(() => { const g = document.querySelector('.phc-camp-families'), r = g.getBoundingClientRect(); let right = 0, card = 0; for (const k of g.children) { const b = k.getBoundingClientRect(); if (b.top - r.top < 5) { right = Math.max(right, b.right); card = b.width; } } return { empty: r.right - right, card }; });
  ok('the camp at ' + w + ': each weapon family two cards at most (' + fam.join('') + '), the first row of families fills the width (' + Math.round(gap.empty) + ' px empty)', fam.every((n) => n >= 1 && n <= 2) && gap.empty < gap.card);
  const bar = await p.evaluate(async () => { const s = document.querySelector('[data-phc-camp]').parentElement; s.scrollTop = s.scrollHeight; await new Promise((r) => setTimeout(r, 300));
    const b = document.querySelector('[data-phc-camp-bar]').getBoundingClientRect(), c = s.getBoundingClientRect(), hit = document.elementFromPoint(b.left + 20, b.top + b.height / 2);
    const next = document.querySelector('[data-phc-camp-next]')?.getBoundingClientRect(); const out = { scrolled: s.scrollTop, top: b.top - c.top, hit: !!hit?.closest('[data-phc-camp-bar]'), next: !!next && next.top >= c.top && next.bottom <= c.bottom };
    s.scrollTop = 0; return out; });
  ok('the camp at ' + w + ': scrolled to its end (' + bar.scrolled + ' px), the top bar is still at the top, in front, with Next in sight', bar.scrolled > 0 && Math.abs(bar.top) < 2 && bar.hit && bar.next);
}
await p.setViewportSize({ width: 1280, height: 720 }); await settle(p, 300);
const kept = (await me0()).credits;
// the starting boon: the camp's second step, three large cards offered by what the loadout holds
ok('Ready waits for the starting boon: the button reads Next', await p.locator('[data-phc-camp-next]').count() === 1 && !(await p.locator('[data-phc-camp-ready]').count()));
await p.locator('[data-phc-camp-next]').click(); await campConfirmGo(p); await p.waitForSelector('[data-phc-startboon]', { timeout: 30000 });
const campCards = await p.locator('[data-phc-startboon]').allTextContents(), offer0 = await p.locator('[data-phc-startboon]').evaluateAll((e) => e.map((x) => x.getAttribute('data-phc-startboon')));
ok('the starting boon: three large cards, each its name, its sentence with its number from data, its line\'s word and its worth on the cap (' + offer0.join(', ') + ')', campCards.length === 3
  && campCards.every((t) => /\d/.test(t) && /of your 50/.test(t) && /GUNS|BLADES|GUARD|SHADOW|SIGIL|OUTBURST|BONDS|FIGMENTS|FAITH/.test(t)) && await p.locator('[data-phc-startboon] [data-phc-boon-icon]').count() === 3); // 0.28.1: the artist's icon (its line's)
await act({ type: 'run/move', node: (await run()).nodes.find((n) => n.depth === 1).id }); await settle(p, 300);
ok('the map waits at the camp (a stop asked for is refused)', (await run()).state === 'loadout' && (await run()).at === null);
const pickId = offer0.includes('start.zeroed') ? 'start.zeroed' : offer0[0];
await p.locator('[data-phc-startboon="' + pickId + '"]').click(); await settle(p, 300);
for (const [w, hh] of [[1280, 720], [1920, 1080]]) { // the boon step: the cards centred, nothing spills; at 1080 Carrying in sight
  await p.setViewportSize({ width: w, height: hh }); await settle(p, 500);
  const bad = await campOverflow(), m = await p.evaluate(() => { const t = document.querySelector('[data-phc-camp-take]').getBoundingClientRect(), cs = [...document.querySelectorAll('[data-phc-startboon]')].map((e) => e.getBoundingClientRect());
    const l = Math.min(...cs.map((c) => c.left)), r = Math.max(...cs.map((c) => c.right)), bt = [...document.querySelectorAll('[data-phc-boon-choose]')].map((e) => e.getBoundingClientRect().bottom);
    return { off: Math.abs((l - t.left) - (t.right - r)), w: Math.min(...cs.map((c) => c.width)), row: cs.every((c) => Math.abs(c.top - cs[0].top) < 2), choose: Math.max(...bt), carry: document.querySelector('[data-phc-camp-carry]').getBoundingClientRect().bottom, vh: innerHeight }; });
  // B2 (0.32): the three cards in one row, each CHOOSE on the first screen (at 1280 they stacked, the first CHOOSE cut)
  ok('the starting boon at ' + w + ': the three cards in a row, centred (' + Math.round(m.off) + ' px off), each ' + Math.round(m.w) + ' px wide, every CHOOSE in the window (' + Math.round(m.choose) + ' of ' + m.vh + '), no text spills' + (bad.length ? ' (' + bad.join(' | ') + ')' : '') + (hh >= 1080 ? ', Carrying in sight' : ''),
    !bad.length && m.off < 24 && m.row && m.w >= 160 && m.choose <= m.vh && (hh < 1080 || m.carry <= m.vh));
}
await p.setViewportSize({ width: 1280, height: 720 }); await settle(p, 300);
ok('a starting boon chosen (' + pickId + '): marked, given when the camp closes', (await pick0()).boon === pickId && !((await me0()).relics || []).includes(pickId) && await p.locator('[data-phc-camp-ready]').count() === 1);
await p.locator('[data-phc-camp-ready]').click(); await campConfirmGo(p); // item E: Ready asks "Level up first?" when a level-up is due
await p.waitForSelector('[data-phc-run-screen]', { timeout: 60000 });
let r = await run();
ok('Start the run leaves the camp for the path map, seed ' + r.seed + ', stage 1; the unspent budget kept (' + kept + ')', r.seed === SEED && r.stage === 1 && r.state === 'map' && await screen() === 'main' && (await me0()).credits === kept);
ok('the starting boon is the character\'s relic for the run; the squad panel shows it, marked Camp, and the run power against the cap', ((await me0()).relics || []).includes(pickId)
  && await p.locator('[data-phc-held="' + pickId + '"]').count() === 1 && /Camp/.test(await p.locator('[data-phc-held="' + pickId + '"]').textContent()) && /of 50/.test(await p.locator('[data-phc-member-cap="' + campId + '"]').textContent()));

// ---------- the path map ----------
const drawn = await p.locator('[data-phc-node]').count();
// (B1, 0.32: a word with no room beside its marker is left out of the picture; the node still names itself to a screen
// reader and on hover, and the B1 check below proves the Boss and the lit stops always show theirs)
ok('every node of the stage is drawn (' + drawn + ' of ' + r.nodes.length + '), each with its word (drawn, or in its name) and its icon', drawn === r.nodes.length
  && await p.locator('[data-phc-node] [data-phc-marker]').count() === r.nodes.length
  && (await p.locator('[data-phc-node]').evaluateAll((l) => l.map((e) => (e.textContent || '') + ' ' + e.getAttribute('aria-label')))).every((t) => /Fight|Elite|Boss|Shop|Forge|Training|Shrine|Rest|Cache|Crossroads|Gate|Vault/.test(t)));
// ART-REQUESTS S9 (the artist's 14 Nov delivery): the inked markers replace the SVG stand-ins (was: an svg in every node);
// the kinds with no marker (the vault's guard and chest, the camp) keep their line icon; the setting's painted backdrop
// is drawn by catalog id, not the field chart
const marks = await p.locator('[data-phc-node]').evaluateAll((b) => b.map((x) => [x.getAttribute('data-phc-kind'), x.getAttribute('data-phc-spur'), x.querySelector('[data-phc-marker]')?.getAttribute('data-phc-marker')]));
ok('the inked markers: every kind with one draws it (' + marks.filter((m) => m[2] === 'art').length + '), the vault\'s spur too (0.28.1)', marks.every(([, , m]) => m === 'art'));
ok('the path map draws its setting\'s painted backdrop (survival-map-' + (await run()).world.at(-1)?.setting + ')', /survival-map-/.test(await p.locator('[data-phc-pathmap-art]').getAttribute('src').catch(() => '') || ''));
const lit = await p.locator('[data-phc-node][data-phc-state="reachable"]').evaluateAll((b) => b.map((x) => x.getAttribute('data-phc-node')));
const first = r.nodes.filter((n) => n.depth === 1).map((n) => n.id);
ok('the first row is lit, nothing else (' + lit.join(', ') + ')', JSON.stringify(lit.sort()) === JSON.stringify(first.sort()));
const tip0 = await p.locator('[data-phc-node="' + lit[0] + '"]').getAttribute('data-tip-text');
ok('a fight node\'s hover card says what it gives, with the engine\'s numbers: "' + tip0 + '"', /XP/.test(tip0 || '') && /credits/.test(tip0 || '') && /materials/.test(tip0 || '') && /one weapon/.test(tip0 || ''));
const far = r.nodes.find((n) => n.depth === 3);
await p.locator('[data-phc-node="' + far.id + '"]').click();
const tip1 = await until(p, () => (document.querySelector('.phc-atip')?.textContent || '').trim() || null, null, 5000).catch(() => '');
ok('an unlit node can\'t be taken and its card says why ("' + tip1.slice(0, 90) + '")', (await run()).at === null && /can.t reach/.test(tip1));
const covers = await p.evaluate(() => { const t = document.querySelector('.phc-atip')?.getBoundingClientRect(); if (!t) return ['no card'];
  return [...document.querySelectorAll('[data-phc-node][data-phc-state="reachable"]')].map((n) => [n.getAttribute('data-phc-node'), n.getBoundingClientRect()]).filter(([, b]) => t.left < b.right && b.left < t.right && t.top < b.bottom && b.top < t.bottom).map(([id]) => id); });
ok('rules 1.46: the path map\'s hover card sits beside its node and covers no reachable node (' + covers.join(', ') + ')', !covers.length);
await sidePanels(p, 'the path map');
// ui-screens.md "The three columns": a run has no area map: no header button, and M opens nothing.
await p.keyboard.press('m'); await settle(p, 400);
const areaMap = await p.evaluate(() => ({ button: document.querySelectorAll('[data-phc-areamap]').length, dialog: document.querySelectorAll('[role="dialog"][aria-label="Area map"]').length }));
ok('a run offers no area map: no AREA MAP button (' + areaMap.button + '), and M opens nothing (' + areaMap.dialog + ')', areaMap.button === 0 && areaMap.dialog === 0);
await shot("survival-path-map"); await p.setViewportSize({ width: 1920, height: 1080 }); await shot("survival-path-map-1920"); await p.setViewportSize({ width: 1280, height: 720 });
// rules 1.49 (build step 10): the map always fits its frame: every marker, its word and the camp inside the map's frame
// (the vault's guard and chest were clipped by the frame's bottom at 1280 x 720), at three screen sizes
const mapFits = async (when) => { for (const [w, hh] of [[1280, 720], [1280, 800], [1600, 900], [1920, 1080], [2560, 1080]]) {
  await p.setViewportSize({ width: w, height: hh }); await settle(p, 500);
  const out = await p.evaluate(() => { const f = document.querySelector('[data-phc-pathmap]')?.getBoundingClientRect(); if (!f) return ['no map'];
    const bad = []; for (const n of document.querySelectorAll('[data-phc-node], [data-phc-node-camp]')) for (const e of [n, ...n.querySelectorAll('span')]) { const b = e.getBoundingClientRect(); if (!b.width) continue;
      if (b.left < f.left - 0.5 || b.right > f.right + 0.5 || b.top < f.top - 0.5 || b.bottom > f.bottom + 0.5) { bad.push(n.getAttribute('data-phc-node') || 'camp'); break; } } return bad; });
  ok('rules 1.49: ' + when + ' at ' + w + ' x ' + hh + ': every marker and its word inside the map\'s frame, the vault\'s spur too' + (out.length ? ' (outside: ' + out.join(', ') + ')' : ''), !out.length);
  // Leon, 15 Nov: the map fills its box: the layer (markers, trails) is the backdrop's box exactly, and it fills 90% of the
  // middle's width or reaches the height cap (the legend and the hint still on screen); a frame never wider than its map
  const fill = await p.evaluate(() => { const r = (s) => document.querySelector(s)?.getBoundingClientRect(); const m = r('[data-phc-pathmap]'), a = r('[data-phc-pathmap-art]') || r('[data-phc-pathmap-box]'), sc = r('[data-phc-pathmap-scroll]'), sec = r('[aria-label="Path map"]'), hint = r('[data-phc-map-hint]');
    return { same: Math.abs(m.left - a.left) < 1.5 && Math.abs(m.top - a.top) < 1.5 && Math.abs(m.width - a.width) < 1.5 && Math.abs(m.height - a.height) < 1.5, share: Math.min(m.width, sc.width) / sec.width, capped: hint.bottom <= innerHeight + 1 && hint.bottom >= innerHeight - 60, frameOver: sc.width - m.width, hintOn: hint.bottom <= innerHeight + 1 }; });
  ok('the path map at ' + w + ' x ' + hh + ': the layer is the backdrop\'s box, ' + Math.round(fill.share * 100) + '% of the width' + (fill.capped ? ' (height cap)' : '') + ', no black remainder (' + Math.round(fill.frameOver) + ' px)',
    fill.same && (fill.share >= 0.9 || fill.capped) && fill.frameOver <= 4);
  // B1 (0.32): the whole map fits its column (at 1280 it scrolled, the Boss and the vault cut off at the right), and no
  // marker's word touches another or leaves the frame (at 1600 CROSSROADS ran into REST); the Boss's word is drawn
  const words = await p.evaluate(() => { const sc = document.querySelector('[data-phc-pathmap-scroll]'), f = sc.getBoundingClientRect();
    const r = [...document.querySelectorAll('[data-phc-node-word]')].map((e) => e.getBoundingClientRect()); let touch = 0;
    for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) if (r[i].left < r[j].right - 1 && r[j].left < r[i].right - 1 && r[i].top < r[j].bottom - 1 && r[j].top < r[i].bottom - 1) touch++;
    return { n: r.length, touch, out: r.filter((b) => b.left < f.left - 0.5 || b.right > f.right + 0.5 || b.top < f.top - 0.5 || b.bottom > f.bottom + 0.5).length,
      scrolls: sc.scrollWidth > sc.clientWidth + 1, inView: f.right <= innerWidth + 0.5, boss: !!document.querySelector('[data-phc-kind="boss"] [data-phc-node-word]') }; });
  ok('B1: the path map at ' + w + ' x ' + hh + ' fits its column (no sideways scroll, inside the window), ' + words.n + ' words, none touching (' + words.touch + ') or cut (' + words.out + '), the Boss named',
    !words.scrolls && words.inView && !words.touch && !words.out && words.boss); }
  await p.setViewportSize({ width: 1280, height: 720 }); await settle(p, 300); };
await mapFits('stage 1\'s map');

// ---------- node 1 by hand ----------
await p.locator('[data-phc-node="' + lit[0] + '"]').click();
// rules 1.90 items 7801, 7803, 7805, 7807: the fight node asks first; Try an ambush, won (the game's next d20 a natural 20):
// the hostiles sit round 1 out, the fight opens with SQUAD ADVANTAGE, the roll's sum and TN under it
await p.waitForSelector('[data-phc-engage-screen]', { timeout: 60000 });
ok('rules 1.90: node 1 stops at the engage screen, both choices offered, the odds with TN and % ("' + (await p.locator('[data-phc-ambush-odds]').textContent()) + '")', (await run()).state === 'engage' && await p.locator('[data-phc-engage="walk"]').isEnabled() && await p.locator('[data-phc-engage="ambush"]').isEnabled() && /TN \d+[\s\S]*\d+%/.test(await p.locator('[data-phc-ambush-odds]').textContent()));
await p.evaluate((d) => { window.__phc.getState().game.rng.state = d; }, dieSeed(20));
await p.locator('[data-phc-engage="ambush"]').click();
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 60000 });
{ const card = await p.waitForSelector('[data-phc-card="fight"]', { timeout: 30000 }).then((e) => e.textContent(), () => ''), cb = (await G()).combat, o = cb.opening || {};
  if (AMBUSH_SHOTS) { await settle(p, 500); await p.screenshot({ path: AMBUSH_SHOTS + '/banner-squad-advantage.png' }); }
  ok('Try an ambush won: SQUAD ADVANTAGE with the roll\'s total and TN ("' + card.slice(0, 90) + '"), every hostile caught (round 1 out)', o.ambush && o.won === true && card.includes(CARDS.ambush_won.name) && card.includes(String(o.total)) && card.includes(String(o.tn))
    && cb.units.filter((u) => u.side === 'foe').every((u) => u.caught)); }
{ // the host's browser asks no Narrator in a run (rules 1.54 item 1): no narrator/ action is sent, so no refusal toast
  await settle(p, 1500);
  const seen = await p.evaluate(() => ({ mode: window.__phc.getState().game.settings.mode, toast: window.__phc.getState().toast?.text || '' }));
  ok('a run fight starts with no refusal toast (settings.mode ' + seen.mode + ', toast "' + seen.toast + '")', !/no Narrator and no story|refused/i.test(seen.toast));
}
r = await run();
ok('a lit node is taken: the fight begins (' + r.stats.fights[0].template + ', ' + r.stats.fights[0].foes.length + ' foe(s))', r.at === lit[0] && r.state === 'fight');
{ // rules 1.51: the starting boon is felt in the first fight: Zeroed a +1 term named for it on a shot; Set Feet a Guard point
  // at the fight's start (each its number from data)
  const felt = await p.evaluate((pick) => { const g = window.__phc.getState().game, cb = g.combat, me = cb.units.find((u) => u.charId && u.side === 'pc');
    if (pick === 'start.set_feet') return { guard: me?.res?.guard ?? 0 };
    const foe = cb.units.find((u) => u.side === 'foe' && !u.dead && u.id); if (!me || !foe) return null;
    return { term: (window.__phc.attackTerms(me.id, foe.id, 'shot') || []).find((t) => t.label === 'Zeroed') || null }; }, pickId);
  ok('rules 1.51: the starting boon (' + pickId + ') is felt in the first fight (' + JSON.stringify(felt) + ')', pickId === 'start.set_feet' ? (felt?.guard ?? 0) >= 1 : pickId === 'start.zeroed' ? felt?.term?.v === 1 : true);
}
for (let i = 0; i < 400; i++) {
  const s = await p.evaluate(() => { const g = window.__phc.getState().game, cb = g.combat; if (!cb || cb.over || cb.field || g.phase !== 'combat') return 'over'; const u = cb.units.find((x) => x.id === cb.order[cb.turn]); return u && u.charId ? 'mine' : 'theirs'; });
  if (s === 'over') break;
  if (s !== 'mine' || !(await p.locator('text=ACTION POINTS').count()) || await p.evaluate(() => { const d = document.querySelector('.phc-cb-dock'); return d ? d.getAttribute('data-lock') || '' : 'none'; })) { await settle(p, 120); continue; }
  await pickAction(p, /^(Shot|Strike)/, { timeout: 2000 }).catch(() => {});
  await p.evaluate((s) => { window.__phc.getState().game.rng.state = s; }, D18); // rules 1.46: node 1 cannot lose (every shot an 18)
  const conf = p.locator('button[aria-keyshortcuts="Space"]:not([hidden])').first(); // the fight's Confirm (its SPACE hint, CSS ::after, is in its accessible name since 0.33: no name match)
  // rules 1.45: a generated map has walls and cover, so the target the Shot starts on may be out of sight; aim at each
  // standing hostile in turn (by clicking its tile, as a player does) until the Shot can be confirmed
  if (!(await conf.isEnabled({ timeout: 2000 }).catch(() => false))) {
    const foes = await p.evaluate(() => window.__phc.getState().game.combat.units.filter((u) => u.side === 'foe' && !u.dead && !u.downed).map((u) => { const [x, y] = u.pos.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); }));
    for (const r of foes) { const t = p.locator('button.phc-tok[aria-label^="' + r + ' · "]').first(); if (!(await t.count())) continue; await t.click({ timeout: 5000 }).catch(() => {}); await settle(p, 60); if (await conf.isEnabled({ timeout: 2000 }).catch(() => false)) break; }
  }
  // (rules 1.90: no approach brings the foes into sight first: a turn with no Shot to confirm ends, never waits on a Confirm that is not there)
  try { if (await conf.isEnabled({ timeout: 2000 }).catch(() => false)) await conf.click({ timeout: 30000 }); else await p.getByRole('button', { name: 'End turn', exact: true }).click({ timeout: 30000 }); } catch { /* the turn moved on under us */ }
  await settle(p, 60);
}
let g = await G();
ok('node 1 fought by hand to its last foe: the fight goes on as its field (' + (g.combat?.summary || '?') + ')', !!g.combat?.field && !g.combat?.over && g.phase === 'combat' && g.run.state === 'field');
// rules 1.55 item 61 and rules 1.62 item 4906: the field is the fight screen, with turns: End turn, NOW, the AP pips;
// the header (FREE ROAM, its round of its rounds), what lies on the ground, a pickup (the fight's own), then Leave (solo:
// one click) and the rewards
await p.waitForSelector('[data-phc-field-head]', { timeout: 30000 });
{ const head = await p.locator('[data-phc-field-head]').innerText();
  ok('the field: "' + head + '" with what lies on the ground (' + (await p.locator('[data-phc-field-ground]').innerText()) + ')', head.includes(SVD.run.after_fight.field.name) && head.includes('ROUND 1 OF ' + SVD.field.rounds)); }
await p.waitForFunction(() => { const g = window.__phc.getState().game, cb = g.combat, u = cb && cb.units.find((x) => x.id === cb.order[cb.turn]); return !!u && !!u.charId; }, null, { timeout: 60000 }).catch(() => {});
ok('the field has turns: End turn is offered, no "no turns" words, no "free" for the AP, the strip has its NOW', (await p.getByRole('button', { name: 'End turn', exact: true }).first().isVisible().catch(() => false)) && (await p.locator('[data-phc-no-turns]').count()) === 0 && (await p.locator('[data-phc-ap-free]').count()) === 0 && /NOW/.test(await p.locator('.phc-init').first().innerText().catch(() => '')));
if (await p.locator('[data-phc-field-take]').count()) { const piles = async () => (await G()).combat.objects.filter((o) => o.kind === 'pile' && o.items?.length && !o.hidden).length, before = await piles(); await p.locator('[data-phc-field-take]').click(); await settle(p, 300); ok('Take all picks up the pile in reach', (await piles()) === before - 1); }
await shot('field');
if (process.env.FIELD_SHOT) copyFileSync(OUT + 'field.png', process.env.FIELD_SHOT);
await p.locator('[data-phc-field-leave]').click();
await p.waitForFunction(() => window.__phc.getState().game.run.state === 'reward', null, { timeout: 30000 });
ok('Leave the field: the rewards', (await G()).run.state === 'reward');
g = await G(); // what the field's pickup brought is the pack the pick adds to
await p.waitForSelector('[data-phc-offer]', { timeout: 30000 }); // rules 1.62 item 4903: straight to the rewards, no click
ok('leaving the field goes straight to the rewards: no end card to click', (await p.locator('[role="dialog"][aria-label="The fight is over"]').count()) === 0);
{ // the music's Now playing card leaves within its 5 s after a fight (it stayed over the sheet for 30 s and more)
  const gone = await p.waitForFunction(() => ![...document.querySelectorAll('[role="status"]')].some((e) => /NOW PLAYING/.test(e.textContent || '')), null, { timeout: 8000 }).catch(() => 'stayed') !== 'stayed';
  ok('after the fight the Now playing card is gone within 8 s (it does not sit over the sheet)', gone);
}
r = await run();
const c = Object.values(g.characters)[0];
ok('the rewards: XP (' + SVD.xp.base + ' at stop 1, rules 1.54 item 9) and credits each, no ammunition pack (rules 1.55: ' + (r.note.ammo[c.id] || []).length + ' lines)', r.note.xp === SVD.xp.base && c.xp === r.note.xp && c.credits === kept + r.note.credits && (r.note.ammo[c.id] || []).length === 0
  && new RegExp(r.note.xp + ' XP').test(await p.locator('[data-phc-note], [data-phc-reward-panel]').first().textContent()));
const o1 = r.offers[c.id], wcard = p.locator('[data-phc-offer="' + c.id + '"] [data-phc-pick]');
{ // rules 1.54 item 2: Materials or One weapon, two large cards; credits instead is gone
  const mats = await p.locator('[data-phc-offer="' + c.id + '"] [data-phc-material]').evaluateAll((l) => l.map((e) => [e.getAttribute('data-phc-material'), Number(e.getAttribute('data-phc-material-n'))]));
  // rules 1.55 item 21: an ordinary fight's weapon card is a roll (rewards.weapon_card.fight), so stop 1 may show the
  // Materials card alone: both shapes are accepted (the card count must match the engine's offer); Materials is taken either way
  const hasW = o1.weapons.length > 0;
  ok('the pick: the materials card (' + mats.map((m) => m.join(' ')).join(', ') + ', the engine\'s offer)' + (hasW ? ' and one weapon' : ', no weapon card this time (the 1.55 roll)') + '; no credits instead', await p.locator('[data-phc-pick-materials]').count() === 1 && await wcard.count() === (hasW ? 1 : 0)
    && !(await p.locator('[data-phc-instead]').count()) && JSON.stringify(mats) === JSON.stringify(o1.materials.map((m) => [m.item, m.n])) && mats.length >= SVD.rewards.materials.items.filter((x) => x.per_credits).length);
  if (!hasW) console.log('NOTE: stop 1 rolled no weapon card (rules 1.55 item 21): the weapon card checks are skipped here; the walk still takes and equips the first weapon card it meets (an Elite always offers one)');
  else {
  const wt = await wcard.textContent(), icon = await wcard.locator('img').first().getAttribute('width'), tip = await wcard.getAttribute('data-tip-text');
  const pv = await p.evaluate(([cid, w]) => window.__phc.gearPreview(cid, { id: w.id, rarity: w.rarity }), [c.id, o1.weapons[0]]);
  ok('the weapon card: its icon at 72 px, its grade word, its worth; its hover card holds every number of the engine\'s gear preview (' + pv.lines.length + ')', icon === '72' && /(STANDARD|FINE)/.test(wt) && /\d+ credits/.test(wt)
    && pv.lines.every((l) => (tip || '').includes(l.label + ': ' + l.value)));
  // rules 1.56 L3: a mod may be the card: its button says what the engine's preview calls it (a weapon "Take the weapon", else "Take it")
  const take = (await wcard.locator('[data-phc-pick-take]').textContent()).trim();
  ok('… its button by the engine kind (' + pv.kind + ': "' + take + '")', take === (['weapon', 'thrown'].includes(pv.kind) ? 'Take the weapon' : 'Take it'));
  const sz = await p.locator('[data-phc-pick-materials]').boundingBox(), sw = await wcard.boundingBox();
  ok('… both cards large and side by side (' + Math.round(sz?.width || 0) + ' and ' + Math.round(sw?.width || 0) + ' px wide, ' + Math.round(sz?.height || 0) + ' px tall)', !!sz && !!sw && sz.height >= 280 && Math.abs(sz.y - sw.y) < 2 && sz.width >= 200);
  }
  if (!hasW) { const sz = await p.locator('[data-phc-pick-materials]').boundingBox(); ok('… the materials card large (' + Math.round(sz?.width || 0) + ' px wide, ' + Math.round(sz?.height || 0) + ' px tall)', !!sz && sz.height >= 280 && sz.width >= 200); }
}
await p.mouse.move(2, 2);
await shot('survival-reward-pick');
await itemCards('rewards');
if (TOP) copyFileSync(OUT + 'survival-reward-pick.png', TOP + 'top-lootcards.png');
await sidePanels(p, 'the rewards');
// ---------- rules 1.64: the reward panel (Leon: players zoomed into the map never saw the rewards above it) ----------
{
  const rp = await run(), f = rp.stats.fights[rp.stats.fights.length - 1], paid = f.paid?.[c.id];
  const inView = () => p.evaluate(() => { const pn = document.querySelector('[data-phc-reward-panel]'); if (!pn) return { err: 'no panel' };
    const b = pn.getBoundingClientRect(), m = pn.querySelector('[data-phc-pick-materials], [data-phc-pick]'), mb = m?.getBoundingClientRect(), mid = document.querySelector('[data-phc-centre]').getBoundingClientRect();
    const hit = mb ? document.elementFromPoint(mb.left + mb.width / 2, mb.top + Math.min(mb.height / 2, 60)) : null;
    return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right), h: innerHeight, inMid: b.left >= mid.left - 1 && b.right <= mid.right + 1, card: !!mb && mb.top >= 0 && mb.top < innerHeight - 60 && !!hit && m.contains(hit) }; });
  const bad = [], fine = (x) => !x.err && x.top >= 0 && x.bottom <= x.h && x.card && x.inMid;
  for (const [w, hh] of [[1280, 720], [1600, 900]]) { await p.setViewportSize({ width: w, height: hh }); await settle(p, 500); const r1 = await inView(); if (!fine(r1)) bad.push(w + ': ' + JSON.stringify(r1)); await p.mouse.move(2, 2); await settle(p, 200); await p.screenshot({ path: OUT + 'reward-panel-' + w + '.png' }); }
  await p.setViewportSize({ width: 1280, height: 720 }); await settle(p, 300);
  // where a zoomed-in player is: the middle scrolled down to the map
  await p.evaluate(() => { const s = document.querySelector('[data-phc-centre]'); s.scrollTop = s.scrollHeight; window.scrollTo(0, document.documentElement.scrollHeight); }); await settle(p, 500);
  const r2 = await inView(); if (!fine(r2)) bad.push('scrolled to the map: ' + JSON.stringify(r2));
  await p.mouse.move(2, 2); await settle(p, 200); await p.screenshot({ path: OUT + 'reward-panel-scrolled.png' });
  ok('rules 1.64: the reward panel opens by itself over the middle, in view at 1280 x 720 and 1600 x 900 and with the middle scrolled down to the map' + (bad.length ? ' (' + bad.join('; ') + ')' : ''), !bad.length);
  await sidePanels(p, 'the reward panel open');
  const pay = p.locator('[data-phc-reward-pay="' + c.id + '"]'), num = async (k) => Number(await pay.locator('[data-phc-reward-' + k + ']').getAttribute('data-phc-reward-' + k));
  const xpS = await num('xp'), crS = await num('credits'), xpT = await num('xp-total'), crT = await num('credits-total'), payText = await pay.textContent();
  ok('… it shows the XP and credits the engine recorded on the fight (+' + xpS + ' XP of ' + paid?.xp + ', +' + crS + ' credits of ' + paid?.credits + ') and the totals now (' + xpT + ' XP, ' + crT + ' credits)', !!paid && xpS === paid.xp && crS === paid.credits
    && xpT === c.xp && crT === c.credits && payText.includes('+' + paid.xp) && payText.includes('+' + paid.credits) && (await p.locator('[data-phc-reward-kicker]').textContent()).trim().startsWith(g.combat?.name || ' ')); // one heading: the fight and how it went
  // its sections fold and remember
  await p.locator('[data-phc-reward-fold="reward:pay"] > button').click(); await settle(p, 200);
  const shut = await pay.count(), exp = await p.locator('[data-phc-reward-fold="reward:pay"] > button').getAttribute('aria-expanded');
  await p.locator('[data-phc-reward-close]').click(); await settle(p, 300);
  // closed early: the pinned bar; a click on the map reopens the panel (it never eats the click)
  const barShown = await p.locator('[data-phc-reward-bar]').isVisible().catch(() => false), gone = await p.locator('[data-phc-reward-panel]').count() === 0;
  await p.mouse.move(2, 2); await settle(p, 200); await p.screenshot({ path: OUT + 'reward-bar.png' });
  // the next stop (the one a zoomed-in player clicks): while a pick is owed nothing is lit, and a click on it reopens the panel
  const litOwed = await p.locator('[data-phc-node][data-phc-state="reachable"]').count(), nextId = rp.nodes.find((n) => n.id === rp.at).links[0];
  const nextStop = p.locator('[data-phc-node="' + nextId + '"]'); await nextStop.scrollIntoViewIfNeeded(); await nextStop.click(); await settle(p, 400);
  const reopenedNext = await p.locator('[data-phc-reward-panel]').count() === 1, stillThere = (await run()).state === 'reward';
  await p.mouse.move(2, 2); await settle(p, 200); await p.screenshot({ path: OUT + 'reward-next-stop.png' });
  ok('… while a pick is owed no stop is lit (' + litOwed + '), and a click on the next stop (' + nextId + ') reopens the panel and moves nothing', litOwed === 0 && reopenedNext && stillThere);
  await p.locator('[data-phc-reward-close]').click(); await settle(p, 300);
  const far = p.locator('[data-phc-node][data-phc-state="ahead"]').first(); await far.scrollIntoViewIfNeeded(); await far.click(); await settle(p, 400);
  const reopened = await p.locator('[data-phc-reward-panel]').count() === 1, still = await pay.count();
  await p.locator('[data-phc-reward-fold="reward:pay"] > button').click(); await settle(p, 200);
  ok('… the pay section folds (' + exp + ') and stays folded when the panel opens again (' + still + ')', shut === 0 && exp === 'false' && still === 0 && await pay.count() === 1);
  ok('… closed early, the pinned bar "' + SVD.run.reward_panel.bar + '" shows; a click on a map stop while the pick is owed reopens the panel', barShown && gone && reopened);
  await p.locator('[data-phc-reward-close]').click(); await settle(p, 200);
  await p.locator('[data-phc-reward-bar]').click(); await settle(p, 300);
  ok('… and the pinned bar reopens it', await p.locator('[data-phc-reward-panel]').count() === 1);
  // rules 1.66 item 5206: the WHOLE bar reopens it (a real mouse press near each end, the pointer moved between press and
  // release), and the whole card is the pick (the element at each corner of a card is the card)
  const ends = [];
  for (const fx of [0.03, 0.97]) {
    await p.locator('[data-phc-reward-close]').click(); await settle(p, 200);
    const b = await p.locator('[data-phc-reward-bar]').boundingBox();
    await p.mouse.move(b.x + b.width * fx, b.y + b.height / 2); await p.mouse.down(); await p.mouse.move(b.x + b.width * fx + 3, b.y + b.height / 2 + 2); await p.mouse.up(); await settle(p, 300);
    ends.push(await p.locator('[data-phc-reward-panel]').count() === 1);
  }
  const corners = await p.evaluate(() => [...document.querySelectorAll('[data-phc-reward-panel] [data-phc-pick-materials], [data-phc-reward-panel] [data-phc-pick]')].map((el) => { const r = el.getBoundingClientRect(); return [[r.left + 4, r.top + 4], [r.right - 4, r.top + 4], [r.left + 4, r.bottom - 4], [r.right - 4, r.bottom - 4]].every(([x, y]) => y < 0 || y > innerHeight || el.contains(document.elementFromPoint(x, y))); }));
  ok('… the whole bar reopens it (near each end, the mouse moved while held: ' + ends.join(', ') + '), and each reward card is clickable to its corners (' + corners.join(', ') + ')', ends.every(Boolean) && corners.length > 0 && corners.every(Boolean));
  await p.evaluate(() => { const s = document.querySelector('[data-phc-centre]'); s.scrollTop = 0; window.scrollTo(0, 0); }); await settle(p, 200);
}
// ---------- rules 1.47 (build step 6): the fight's tally on the reward screen ----------
{
  const t = r.stats.fights[0].tally, row = p.locator('[data-phc-tally="fight"] [data-phc-tally-row="' + c.id + '"]');
  const cell = async (k) => Number(await row.locator('[data-phc-tally-cell="' + k + '"]').textContent());
  ok('the reward screen shows the fight\'s tally: a row for the character with the engine\'s damage dealt (' + t.chars[c.id].dealt + '), taken and kills', await p.locator('[data-phc-tally="fight"]').count() === 1 && t.chars[c.id].dealt > 0
    && await cell('dealt') === t.chars[c.id].dealt && await cell('taken') === t.chars[c.id].taken && await cell('kills') === t.chars[c.id].kills && /of \d+/.test(await row.locator('[data-phc-tally-cell="aim"]').textContent()));
}
await p.locator('[data-phc-reward-panel] [data-phc-pick-materials]').click(); // rules 1.64: picked inside the panel
await p.waitForFunction(() => window.__phc.getState().game.run.state === 'map', null, { timeout: 30000 });
g = await G();
await settle(p, 300);
ok('rules 1.64: the pick made inside the panel closes it (the picks are all made) and the pinned bar is gone', await p.locator('[data-phc-reward-panel]').count() === 0 && await p.locator('[data-phc-reward-bar]').count() === 0);
{ const c1 = Object.values(g.characters)[0];
  ok('the Materials card taken: gunpowder, casings and mana residue arrive in the pack (' + o1.materials.map((m) => m.item + ' ' + held(c, m.item) + ' → ' + held(c1, m.item)).join(', ') + ')', o1.materials.every((m) => held(c1, m.item) === held(c, m.item) + m.n));
  ok('… and the run board says what was taken, in words', /takes the materials|: \+\w/.test(await p.locator('[data-phc-board-pick]').first().textContent().catch(() => '')));
}
/** Rules 1.54 item 11: a weapon taken from a pick, equipped through the sheet's GEAR tab (the one place for gear) by a click. */
const equipCheck = async (want) => {
  const wname = WPN[want.id]?.name || want.id;
  await p.locator('#phc-sheet-tab-gear').click(); await settle(p, 300);
  const row = p.locator('[aria-label="Backpack contents"] [role="listitem"]').filter({ hasText: wname }).first();
  await row.locator('button').first().click(); await settle(p, 200);
  await row.getByRole('button', { name: 'Main hand', exact: true }).click();
  await p.waitForFunction((id) => Object.values(window.__phc.getState().game.characters)[0].weapon === id, want.id, { timeout: 30000 }).catch(() => {});
  ok('the weapon taken (' + wname + ') is equipped through the sheet\'s GEAR tab by a click: the character\'s weapon is ' + want.id, Object.values((await G()).characters)[0].weapon === want.id);
  await p.locator('#phc-sheet-tab-skills').click(); await settle(p, 200);
};
let equipped = false;
ok('… and the map lights the node\'s links', JSON.stringify((await p.locator('[data-phc-node][data-phc-state="reachable"]').evaluateAll((b) => b.map((x) => x.getAttribute('data-phc-node')))).sort()) === JSON.stringify([...g.run.nodes.find((n) => n.id === g.run.at).links].sort()));
{ // rules 1.64: a map click the engine refuses says its reason on the say line (the stop's hover card still opens)
  const far = p.locator('[data-phc-node][data-phc-state="ahead"]').first(); await far.scrollIntoViewIfNeeded();
  const tip = (await far.getAttribute('data-tip-text')) || ''; await far.click();
  const say = await until(p, () => document.querySelector('[data-phc-map-say]')?.textContent || null, null, 5000).catch(() => '');
  ok('a click on a stop out of reach says the engine\'s reason by the map ("' + say + '")', !!say && tip.endsWith(say));
  await p.mouse.move(2, 2); await settle(p, 200); await p.screenshot({ path: OUT + 'map-say.png' });
  await p.evaluate(() => { const s = document.querySelector('[data-phc-centre]'); s.scrollTop = 0; window.scrollTo(0, 0); });
}

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
/** The visibility standard (Leon, 15 Nov 2026; ui-screens.md "The place header stays"): a place's header (PlaceBar) stays
 * at the top of the middle column's scroll: scrolled to its end, the header's money and its move-on button are still in
 * the viewport, in front; the header compact (the portrait small, the line hidden) once scrolled. At 1280 x 720 and 1920 x 1080. */
let headerPlaces = 0;
async function headerStays(where, shot) {
  const bad = [];
  for (const [w, hh] of [[1280, 720], [1920, 1080]]) {
    await p.setViewportSize({ width: w, height: hh }); await settle(p, 500);
    if (shot && w === 1920) { await p.mouse.move(2, 2); await settle(p, 400); await p.screenshot({ path: OUT + shot + '-1920.png' }); }
    const r = await p.evaluate(async () => { const bar = document.querySelector('[data-phc-place-bar]'); if (!bar) return { err: 'no header' };
      let s = bar.parentElement; while (s && !(/(auto|scroll)/.test(getComputedStyle(s).overflowY) && s.scrollHeight > s.clientHeight + 1)) s = s.parentElement;
      if (s) s.scrollTop = s.scrollHeight; else window.scrollTo(0, document.documentElement.scrollHeight);
      await new Promise((ok) => setTimeout(ok, 600));
      const inView = (e) => { const b = e?.getBoundingClientRect(); if (!b || !b.width) return false; const t = document.elementFromPoint(b.left + Math.min(b.width / 2, 20), b.top + b.height / 2); return b.top >= 0 && b.bottom <= innerHeight && !!t && bar.contains(t); };
      const money = bar.querySelector('[data-phc-bar-money]'), move = bar.querySelector('[data-phc-bar-move] button'), b = bar.getBoundingClientRect(), top = s ? s.getBoundingClientRect().top : 0;
      return { scrolled: s ? s.scrollTop : window.scrollY, money: inView(money), move: inView(move), atTop: s ? Math.abs(b.top - top) < 2 : b.top >= 0, compact: bar.getAttribute('data-phc-compact'), tall: Math.round(b.height) }; });
    if (shot && w === 1920) { await p.mouse.move(2, 2); await settle(p, 300); await p.screenshot({ path: OUT + shot + '-1920-scrolled.png' }); }
    if (r.err || !r.money || !r.move || !r.atTop || (r.scrolled > 330 && r.compact !== '1')) bad.push(w + ': ' + JSON.stringify(r));
    await p.evaluate(() => { const bar = document.querySelector('[data-phc-place-bar]'); let s = bar?.parentElement; while (s && !/(auto|scroll)/.test(getComputedStyle(s).overflowY)) s = s.parentElement; if (s) s.scrollTop = 0; window.scrollTo(0, 0); });
  }
  await p.setViewportSize({ width: 1280, height: 720 }); await settle(p, 300);
  ok('the visibility standard: ' + where + ' scrolled to its end, its header (the credits, the button that moves on) still in sight at the top, compact' + (bad.length ? ' (' + bad.join('; ') + ')' : ''), !bad.length);
  if (!bad.length) headerPlaces++;
}
async function shopChecks() {
  sawShop = true;
  await p.waitForSelector('[data-phc-place-frame]', { timeout: 30000 });
  ok('a shop node opens the shop in the middle: the keeper, the tabs, the purse; the path map is gone', await p.locator('[data-phc-pathmap]').count() === 0
    && /\S/.test(await p.locator('[data-phc-keeper-name]').textContent()) && await p.locator('[data-phc-place-frame] [role="tab"]').count() === 4 && /\d/.test(await p.locator('[data-phc-purse-n]').textContent()));
  await sidePanels(p, 'the shop');
  await headerStays('the shop', 'shop');
  ok('solo: no Give tab (there is no one to hand anything to; docs/design/ui-screens.md, Writing for the player)', await p.locator('[data-phc-tab="give"]').count() === 0);
  {
    // the keeper speaks as a tab opens: one of its own lines for that tab (data survival.json faces), never a designer's note
    const kname = ((await p.locator('[data-phc-keeper-name]').textContent()) || '').trim(), face = SVD.faces.items.find((f) => f.name === kname);
    await p.locator('[data-phc-tab="gear"]').click(); await settle(p, 200);
    const said = ((await p.locator('[data-phc-speech]').textContent()) || '').replace(/[\u201c\u201d]/g, '').trim();
    ok('the keeper says one of its own "gear" lines as Today\'s gear opens ("' + said + '")', !!face && (face.lines.gear || []).includes(said));
  }
  await p.locator('[data-phc-tab="always"]').click();
  const cal = await p.locator('[data-phc-shelf="calibres"] [data-phc-card]').count(), m0 = Object.values((await G()).characters)[0];
  const cals = new Set([m0.weapon, m0.offHand?.id, ...(m0.pack || []).map((x) => x.weapon)].map((id) => WPN[id || '']).filter((w) => w && w.magazine != null && w.ammo && w.category !== 'thrown').map((w) => w.ammo));
  ok('rules 1.55: the calibres of the guns carried on their own shelf (' + cal + ' of ' + cals.size + ')', cal === cals.size);
  const magShelf = WPN[m0.weapon]?.reload === 'magazine' ? await p.locator('[data-phc-shelf="magazines"] [data-phc-card]').count() : 2;
  ok('rules 1.55: a Magazines shelf: a full and an empty magazine for the gun in hand (' + magShelf + ' cards)', magShelf >= 2 && (WPN[m0.weapon]?.reload !== 'magazine' || await p.locator('[data-phc-card="mag:' + m0.weapon + ':0"]').count() === 1));
  await settle(p, 1400); await p.screenshot({ path: OUT + 'survival-shop-1280.png' });
  await itemCards('shop');
  ok('at 1280: nothing clipped, nothing overlaps (' + (await fitsCheck()).join('; ') + ')', !(await fitsCheck()).length);
  // buy ammunition
  const me = Object.values((await G()).characters)[0];
  const c0 = me.credits, rifle = p.locator('[data-phc-shelf="calibres"] [data-phc-card]').first(); // rules 1.55: the rounds of the gun carried
  const price = Number((await rifle.locator('[data-phc-price]').textContent()).replace(/\D/g, ''));
  await rifle.locator('[data-phc-buy]').click();
  await p.waitForFunction((c) => Object.values(window.__phc.getState().game.characters)[0].credits !== c, c0, { timeout: 30000 });
  const c1 = Object.values((await G()).characters)[0].credits;
  ok('buy rounds at the card\'s price (' + price + '): ' + c0 + ' → ' + c1 + ', logged', c0 - c1 === price && /bought/.test(await p.locator('[data-phc-visit-log]').textContent()));
  // today's gear: a card's numbers are the engine's
  await p.locator('[data-phc-tab="gear"]').click();
  const gear = await p.locator('[data-phc-shelf="gear"] [data-phc-card]').evaluateAll((l) => l.map((e) => ({ key: e.getAttribute('data-phc-card'), id: e.getAttribute('data-phc-card-id'), hit: e.querySelector('[data-phc-num="hit"]')?.textContent || null, dmg: e.querySelector('[data-phc-num="dmg"]')?.textContent || null, price: Number(e.querySelector('[data-phc-price]').textContent.replace(/\D/g, '')) })));
  const sh = (await run()).shop, gun = gear.find((x) => x.hit);
  const pv = gun ? await p.evaluate(([cid, id, rar]) => window.__phc.gearPreview(cid, { id, rarity: rar }), [me.id, gun.id, sh.stock.find((s) => s.key === gun.key).rarity]) : null;
  ok('a gear card\'s numbers equal the engine\'s preview (' + (gun ? gun.id + ': ' + gun.hit + ', ' + gun.dmg : 'none') + ')', !!pv && pv.lines.find((l) => l.key === 'hit').value === gun.hit && pv.lines.find((l) => l.key === 'dmg').value === gun.dmg);
  await p.locator('[data-phc-card="' + gun.key + '"]').hover();
  ok('hovering a card fills the compare panel (holding against this)', await p.locator('[data-phc-compare]').count() === 1);
  await settle(p, 400); await p.screenshot({ path: OUT + 'survival-shop-gear-1280.png' });
  await itemCards('shop-gear-compare');
  // a purse too short says why
  const credits = Object.values((await G()).characters)[0].credits, dear = gear.filter((x) => x.price > credits).sort((a, b) => b.price - a.price)[0];
  if (dear) {
    const status = await p.locator('[data-phc-card="' + dear.key + '"] [data-phc-status]').textContent();
    await p.locator('[data-phc-card="' + dear.key + '"] [data-phc-buy]').click();
    const t = await until(p, () => window.__phc.getState().toast?.text || null, null, 10000).catch(() => '');
    ok('a purse too short says why, on the card and when tried ("' + status + '" / "' + t + '")', status === Object.values((await G()).characters)[0].name + ' is ' + (dear.price - credits) + ' credits short.' && t === status);
  } else ok('a purse too short says why (every piece affordable: nothing to test)', false);
  await p.waitForFunction(() => !window.__phc.getState().toast, null, { timeout: 15000 }).catch(() => {}); // its toast gone before the next shots
  // rules 1.48: the lanes put the first shop early in the stage, before a purse can afford a rolled weapon and a grade
  // step: the test purse is topped up here (as node 1's dice are pinned), so the shop's and the Forge's checks have money (after the short-purse check, which wants a piece it can't afford)
  await p.evaluate(() => { for (const c of Object.values(window.__phc.getState().game.characters)) c.credits = Math.max(c.credits || 0, 6000); });
  { // rules 1.54 items 4 and 5: the ammo maker from the counter's supplies shelf, then rounds made through the sheet's GEAR tab
    await p.locator('[data-phc-tab="always"]').click(); await settle(p, 300);
    const m0 = Object.values((await G()).characters)[0], card = p.locator('[data-phc-card="' + MAKER + '"]');
    await card.locator('[data-phc-buy]').click();
    await p.waitForFunction((id) => (Object.values(window.__phc.getState().game.characters)[0].pack || []).some((x) => (x.item || x.id) === id), MAKER, { timeout: 30000 }).catch(() => {});
    const m1 = Object.values((await G()).characters)[0];
    ok('the ammo maker bought from the counter by a click (' + (m0.credits - m1.credits) + ' credits): it is in the pack', held(m1, MAKER) === 1 && m0.credits - m1.credits === ITM.find((x) => x.id === MAKER).price_credits);
    const cal = WPN[m1.weapon]?.ammo, rec = RECIPES.find((x) => x.gives[0].item === 'rounds:' + cal) || RECIPES.find((x) => x.tool.item);
    const rcal = rec.gives[0].item.replace(/^rounds:/, ''), times = 2;
    await p.locator('#phc-sheet-tab-gear').click();
    await p.waitForSelector('[data-phc-make]', { timeout: 30000 }).catch(() => {});
    const row = p.locator('[data-phc-recipe="' + rec.id + '"]');
    { // rules 1.56 (L2): the special rounds are one recipe a calibre, so the rows are the engine's make view's (its rows
      // with the tool in hand), not the data's lines; Leon, 15 Nov 2026: the list is grouped, the first group open and the
      // rest folded under its own header (until the view says which rows fit what is carried: the special rounds)
      const mv = await p.evaluate((id) => window.__phc.makeView(id), m1.id), want = mv.rows.filter((r) => r.tool.held).map((r) => r.recipe);
      const shown0 = await p.locator('[data-phc-recipe]').count(), restHead = p.locator('[data-phc-make-rest]');
      const restText = (await restHead.count()) ? (await restHead.textContent()).trim() : '', restN = Number((restText.match(/\((\d+)\)/) || [])[1] || 0);
      if (restN) { await restHead.click(); await settle(p, 200); }
      const keys = await p.locator('[data-phc-recipe]').evaluateAll((es) => es.map((e) => e.getAttribute('data-phc-recipe')));
      ok('the sheet\'s GEAR tab shows Make with a row for each recipe of the ammo maker the engine lists (' + shown0 + ' shown, ' + restN + ' folded under "' + restText + '"; ' + keys.length + ' of ' + want.length + '), the core\'s not (no focus in hand)',
        await p.locator('[data-phc-make]').count() === 1 && shown0 > 0 && shown0 + restN === want.length && keys.length === want.length && want.every((k) => keys.includes(k))
        && want.every((k) => RECIPES.some((x) => (k === x.id || k.startsWith(x.id + ':')) && x.tool.item === MAKER)) && !keys.includes(CORE.id));
      if (restN) { await restHead.click(); await settle(p, 200); }
      ok('… folded again, the rest of the list is hidden (' + await p.locator('[data-phc-recipe]').count() + ' rows)', await p.locator('[data-phc-recipe]').count() === shown0);
    }
    const most = Number(await row.getAttribute('data-phc-recipe-most'));
    ok('… the ' + rec.name + ' row: what it takes with what you have, what it makes, the engine\'s most (' + most + ')', most === Math.min(...rec.needs.map((l) => Math.floor(held(m1, l.item) / l.n)))
      && new RegExp('\\(have ' + held(m1, rec.needs[0].item) + '\\)').test(await row.locator('[data-phc-recipe-needs]').textContent()));
    await row.locator('[data-phc-make-more]').click(); await settle(p, 150);
    ok('… the stepper reads 2 and the button Make × 2', (await row.locator('[data-phc-make-n]').textContent()).trim() === '2' && /Make × 2/.test(await row.locator('[data-phc-make-go]').textContent()));
    await p.locator('[data-phc-make]').scrollIntoViewIfNeeded(); await p.mouse.move(2, 2); await settle(p, 400);
    await p.screenshot({ path: OUT + 'survival-make-1280.png' }); if (TOP) copyFileSync(OUT + 'survival-make-1280.png', TOP + 'top-make.png');
    await row.locator('[data-phc-make-go]').click();
    await p.waitForFunction(([cal, n]) => (Object.values(window.__phc.getState().game.characters)[0].pack || []).filter((x) => x.calibre === cal && !x.mags && !x.ammoType).reduce((t, x) => t + x.qty, 0) !== n, [rcal, loose(m1, rcal)], { timeout: 30000 }).catch(() => {});
    const m2 = Object.values((await G()).characters)[0];
    ok('Make × 2 clicked: ' + rec.gives[0].n * times + ' rounds arrive (' + loose(m1, rcal) + ' → ' + loose(m2, rcal) + '), the gunpowder and casings leave (' + rec.needs.map((l) => held(m1, l.item) + ' → ' + held(m2, l.item)).join(', ') + '), free',
      loose(m2, rcal) === loose(m1, rcal) + rec.gives[0].n * times && rec.needs.every((l) => held(m2, l.item) === held(m1, l.item) - l.n * times) && m2.credits === m1.credits);
    ok('… the visit\'s log says what was made', /makes /.test(await p.locator('[data-phc-visit-log]').textContent()));
    { // Leon, 15 Nov 2026: Make folds (the sheet's one fold) and the fold survives a change of sheet tab; each recipe one row
      await p.locator('[data-phc-make]').scrollIntoViewIfNeeded(); await p.mouse.move(2, 2); await settle(p, 300);
      await p.screenshot({ path: OUT + 'make-expanded.png' });
      const nOpen = await p.locator('[data-phc-recipe]').count(), tall = await p.locator('[data-phc-recipe]').first().evaluate((e) => e.getBoundingClientRect().height);
      await p.locator('[data-phc-gear-head="make"]').click(); await settle(p, 300);
      await p.screenshot({ path: OUT + 'make-collapsed.png' });
      const nShut = await p.locator('[data-phc-recipe]').count();
      await p.locator('#phc-sheet-tab-skills').click(); await settle(p, 200); await p.locator('#phc-sheet-tab-gear').click(); await settle(p, 300);
      const nBack = await p.locator('[data-phc-recipe]').count(), exp = await p.locator('[data-phc-gear-head="make"]').getAttribute('aria-expanded');
      await p.locator('[data-phc-gear-head="make"]').click(); await settle(p, 300);
      ok('Make folds: ' + nOpen + ' rows, folded none (' + nShut + '), still folded after another sheet tab (' + nBack + ', ' + exp + '), open again (' + await p.locator('[data-phc-recipe]').count() + '); a recipe is one compact row (' + Math.round(tall) + ' px)',
        nOpen > 0 && nShut === 0 && nBack === 0 && exp === 'false' && await p.locator('[data-phc-recipe]').count() === nOpen && tall <= 140);
    }
    { // Leon, 15 Nov 2026: the backpack first, folding, and Expand opens it large over the middle (both side panels stay):
      // an action there goes through its real button; Escape closes it
      await p.locator('[data-phc-pack]').scrollIntoViewIfNeeded(); await p.mouse.move(2, 2); await settle(p, 300);
      await p.locator('[data-phc-pack]').screenshot({ path: OUT + 'pack-docked.png' });
      await itemCards('sheet-gear');
      const order = await p.evaluate(() => { const y = (s) => document.querySelector(s)?.getBoundingClientRect().top ?? null; return [y('[data-phc-gear-sec="worn"]'), y('[data-phc-pack]'), y('[data-phc-make]')]; });
      ok('the GEAR tab: in hand and worn, then the Backpack, then Make (' + order.map(Math.round).join(' < ') + ')', !order.includes(null) && order[0] < order[1] && order[1] < order[2]);
      await p.locator('[data-phc-gear-head="pack"]').click(); await settle(p, 200);
      const packShut = await p.locator('[aria-label="Backpack contents"]').count();
      await p.locator('[data-phc-gear-head="pack"]').click(); await settle(p, 200);
      ok('the Backpack folds and opens (' + packShut + ' → ' + await p.locator('[aria-label="Backpack contents"]').count() + ')', packShut === 0 && await p.locator('[aria-label="Backpack contents"]').count() === 1);
      for (const [w, hh] of [[1920, 1080], [1280, 720]]) {
        await p.setViewportSize({ width: w, height: hh }); await settle(p, 400);
        await p.locator('[data-phc-pack-expand]').click(); await p.waitForSelector('[data-phc-pack-big]', { timeout: 30000 }); await p.mouse.move(2, 2); await settle(p, 400);
        await p.screenshot({ path: OUT + 'pack-expanded-' + w + '.png' });
        const big = await p.evaluate(() => { const b = document.querySelector('[data-phc-pack-big]').getBoundingClientRect(), l = document.querySelector('aside[aria-label="Character sheet"]').getBoundingClientRect(), r = document.querySelector('[data-story-zone]').getBoundingClientRect();
          return { left: b.left >= l.right - 2, right: b.right <= r.left + 2, wide: b.width > 300, groups: document.querySelectorAll('[data-phc-pack-group]').length, rows: document.querySelectorAll('[data-phc-pack-big-row]').length }; });
        ok('Expand at ' + w + ': the backpack large over the middle only (' + big.groups + ' groups, ' + big.rows + ' rows), both side panels still there', big.left && big.right && big.wide && big.groups > 0 && big.rows > 0);
        await sidePanels(p, 'the large backpack'); if (w !== 1280) { await p.keyboard.press('Escape'); await settle(p, 300); }
      }
      const w0 = (await me0()).weapon, other = (await me0()).pack.find((x) => x.kind === 'weapon' && x.weapon && x.weapon !== w0);
      if (other) {
        await p.locator('[data-phc-pack-big-row]', { hasText: WPN[other.weapon].name }).locator('[data-phc-pack-act="m"]').first().click(); await settle(p, 400);
        const w1 = (await me0()).weapon;
        await p.locator('[data-phc-pack-big-row]', { hasText: WPN[w0].name }).locator('[data-phc-pack-act="m"]').first().click(); await settle(p, 400);
        ok('… its Main hand button equips ' + WPN[other.weapon].name + ' (' + w1 + '), and back (' + (await me0()).weapon + ')', w1 === other.weapon && (await me0()).weapon === w0);
      } else ok('… a weapon in the pack to equip from the large backpack', false);
      await p.keyboard.press('Escape'); await settle(p, 300);
      ok('… Escape closes it', await p.locator('[data-phc-pack-big]').count() === 0);
    }
    await p.locator('#phc-sheet-tab-skills').click(); await settle(p, 200);
  }
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
    await p.locator('[data-phc-tab="sell"]').click(); await p.locator('[data-phc-tab="upgrade"]').click(); await p.evaluate(() => window.__phc.go("main")); // drawn again from the state (the shelves and the right panel: a test hand-off is no action)
    const card = p.locator('[data-phc-repair="repair:main"]');
    await card.waitFor({ timeout: 30000 }).catch(() => {});
    const me0 = Object.values((await G()).characters)[0], w = WPN[me0.weapon], rar = me0.weaponState?.rarity || 'standard';
    const full = Math.round(w.durability * RAR[rar].dur), R = SVD.repair, want = Math.ceil(Math.max(R.floor, R.rate * Math.round(w.price_credits * RAR[rar].price) * ((full - 60) / full)) * R.places.shop);
    const price = Number(((await card.locator('[data-phc-price]').textContent().catch(() => '')) || '').replace(/\D/g, ''));
    const bar = await card.locator('[data-phc-wear]').evaluate((e) => ({ state: e.getAttribute('data-phc-wear'), now: e.getAttribute('data-phc-wear-now'), max: e.getAttribute('data-phc-wear-max'), mark: e.querySelector('[data-phc-wear-mark]')?.textContent || '' })).catch(() => null);
    ok('the Repair shelf: the worn rifle\'s card, its bar 60 → ' + full + ' marked WORN, its price from data (' + price + ' = ' + want + ')', !!bar && bar.state === 'worn' && bar.now === '60' && bar.max === String(full) && /WORN/.test(bar.mark) && price === want);
    const status = (await card.locator('[data-phc-status]').textContent().catch(() => '')) || '';
    ok('a purse too short for the repair says by how much ("' + status + '")', (await card.getAttribute('data-phc-service-why')) === '' && status.includes((want - 3) + ' credits short'));
    ok('the right panel\'s squad marks the rifle in hand WORN', await p.locator('[data-phc-member-wear="main"] [data-phc-wear="worn"]').count() === 1);
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
      && await p.locator('[data-phc-repair]').count() === 0 && await p.locator('[data-phc-repair-empty]').count() === 1 && await p.locator('[data-phc-member-wear="main"]').count() === 0);
  }
  const ups = await p.locator('[data-phc-service]:not([data-phc-repair])').evaluateAll((l) => l.map((e) => ({ key: e.getAttribute('data-phc-service'), why: e.hasAttribute('data-phc-service-why'), price: Number(e.querySelector('[data-phc-price]')?.textContent.replace(/\D/g, '') || 0), lines: e.querySelectorAll('[data-phc-upgrade-lines] b').length })));
  const up = ups.find((x) => !x.why && x.key !== 'grade:main') || ups.find((x) => !x.why);
  ok('the Upgrade tab: a card per weapon or focus, each with its price here and what changes (' + ups.map((x) => x.key + ' ' + x.price + (x.why ? ' refused' : '')).join(', ') + ')', !!up && up.lines > 0);
  await settle(p, 400); await p.screenshot({ path: OUT + 'survival-shop-upgrade-1280.png' });
  await itemCards('shop-upgrade');
  if (up) {
    const u0 = Object.values((await G()).characters)[0].credits;
    await p.locator('[data-phc-service="' + up.key + '"] [data-phc-upgrade-go]').click();
    await p.waitForFunction((c) => Object.values(window.__phc.getState().game.characters)[0].credits !== c, u0, { timeout: 30000 });
    const after = Object.values((await G()).characters)[0];
    ok('a shop upgrade clicked (' + up.key + '): the full price paid (' + up.price + '), the step logged, a second refused in words', u0 - after.credits === up.price && /Fine now/.test(await p.locator('[data-phc-visit-log]').textContent())
      && /One upgrade per visit\. /.test(await p.locator('[data-phc-shelf="upgrade"]').textContent()));
  }
  await p.setViewportSize({ width: 1920, height: 1080 }); await settle(p, 600); await p.screenshot({ path: OUT + 'survival-shop-upgrade-1920.png' });
  await p.setViewportSize({ width: 1280, height: 720 });
  // rules 1.54: the shelves scroll inside the middle column: every Buy button, scrolled to, sits inside it (never under a side panel)
  await p.locator('[data-phc-tab="gear"]').click(); await settle(p, 300);
  const under = await p.evaluate(async () => { const mid = document.querySelector('[data-phc-centre]').getBoundingClientRect(), bad = [];
    for (const b of document.querySelectorAll('[data-phc-buy]')) { b.scrollIntoView({ block: 'nearest' }); await new Promise((r) => setTimeout(r, 30)); const r = b.getBoundingClientRect(); if (r.left < mid.left - 1 || r.right > mid.right + 1 || r.bottom > mid.bottom + 1) bad.push(b.getAttribute('data-phc-buy')); }
    return bad; });
  ok('every Buy button, scrolled to, sits inside the middle column (' + under.join(', ') + ')', !under.length);
  await p.locator('[data-phc-tab="always"]').click();
  await p.setViewportSize({ width: 1920, height: 1080 });
  await settle(p, 900); await p.screenshot({ path: OUT + 'survival-shop-1920.png' });
  ok('at 1920: nothing clipped, nothing overlaps (' + (await fitsCheck()).join('; ') + ')', !(await fitsCheck()).length);
  await p.locator('[data-phc-tab="gear"]').click(); await settle(p, 500); await p.screenshot({ path: OUT + 'survival-shop-gear-1920.png' });
  await p.setViewportSize({ width: 1280, height: 720 });
  await p.evaluate(() => { const c = Object.values(window.__phc.getState().game.characters)[0]; c.weaponState = { ...(c.weaponState || {}), dur: 60 }; }); // rules 1.50: worn again, for the map's mark
  await p.locator('[data-phc-phase="leave"]').click();
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
  const bad = [], foot = document.querySelector('[data-phc-centre]')?.getBoundingClientRect().bottom ?? Infinity; // (rules 1.54: the middle column's foot)
  if (document.documentElement.scrollWidth > innerWidth + 1) bad.push('the page scrolls sideways');
  for (const el of document.querySelectorAll('[data-phc-keeper-name], [data-phc-tab], [data-phc-price]')) if (el.scrollWidth > el.clientWidth + 1) bad.push('clipped: ' + el.textContent.slice(0, 30));
  const cards = [...new Set([...document.querySelectorAll('[data-phc-choice], [data-phc-service]')].map((e) => e.closest('[data-phc-service]') || e))].map((e) => e.getBoundingClientRect());
  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) { const a = cards[i], b = cards[j]; if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) bad.push('cards overlap'); }
  const first = document.querySelector('[data-phc-choice], [data-phc-service]'); if (first && first.getBoundingClientRect().top > foot) bad.push('the first card is below the middle column');
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
    if (await p.locator('[data-phc-place]').count()) { await p.locator('[data-phc-phase="leave"]').click(); await p.waitForSelector('[data-phc-pathmap]', { timeout: 30000 }); } // back at a place after its pick (a crate)
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
        await sidePanels(p, 'a place: the ' + k);
        await headerStays('the ' + k, k === 'forge' ? 'forge' : null);
        ok('rules 1.46: the ' + k + ' opens in the middle: its face, its tabs, large cards (solo: no Give tab); the path map is gone', await p.locator('[data-phc-pathmap]').count() === 0 && /\S/.test(await p.locator('[data-phc-keeper-name]').textContent())
          && await p.locator('[data-phc-tab="give"]').count() === 0 && !!(await p.locator('[data-phc-keeper-portrait]').getAttribute('src').catch(() => '')));
        await p.mouse.move(2, 2); // no hover card over the shot
        await settle(p, 900); await p.screenshot({ path: OUT + 'survival-place-' + k + '-1280.png' });
        if (k === 'forge') await itemCards('forge');
        const bad1 = await placeFits(); await p.setViewportSize({ width: 1920, height: 1080 }); await settle(p, 700); await p.screenshot({ path: OUT + 'survival-place-' + k + '-1920.png' });
        const bad2 = await placeFits(); await p.setViewportSize({ width: 1280, height: 720 }); await settle(p, 300);
        ok('… at 1280 and 1920 nothing is clipped, overlapping or covered (' + [...bad1, ...bad2].join('; ') + ')', !bad1.length && !bad2.length);
      }
    }
    if (k === 'training' && !done.training) {
      { // rules 1.54 item 10: the drill card's bar, from the engine's view
        const dc = p.locator('[data-phc-choices] [data-phc-choice^="drill:"]:not([data-phc-why])').first(), dk = await dc.getAttribute('data-phc-choice').catch(() => null), dw = dk && dk.slice(6), gx = await G();
        const bar = await dc.locator('[data-phc-trainbar]').evaluate((e) => ({ now: Number(e.getAttribute('data-phc-trainbar-now')), add: Number(e.getAttribute('data-phc-trainbar-add')), to: e.getAttribute('data-phc-trainbar-to'), mark: e.querySelector('[data-phc-trainbar-mark]')?.textContent || '' })).catch(() => null);
        ok('a training card shows its bar: where you stand (' + bar?.now + '), what it adds (+' + bar?.add + '), the next mark in words ("' + bar?.mark + '")', !!bar && bar.now === (gx.characters[cid].phys?.drill?.[dw] || 0) && bar.add === SVD.training.drill && /^Mark I+ at \d+/.test(bar.mark) && bar.mark.includes(bar.to));
        if (TOP) copyFileSync(OUT + 'survival-place-training-1280.png', TOP + 'top-trainingbar.png');
      }
      const { before, after, key } = await choose('drill:'), w = key && key.slice(6);
      done.training = !!key && (after.characters[cid].phys?.drill?.[w] || 0) - (before.characters[cid].phys?.drill?.[w] || 0) === SVD.training.drill;
      ok('a training ground: a drill clicked (' + key + '), +' + SVD.training.drill + ' drill, free', done.training && after.characters[cid].credits === before.characters[cid].credits);
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
      ok('… and a second step this visit is shown refused in words', /One upgrade per visit\. /.test((await p.locator('[data-phc-choices]').allTextContents()).join(' ')));
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
      await p.locator('[data-phc-phase="leave"]').click();
      await p.waitForSelector('[data-phc-pathmap]', { timeout: 30000 });
    }
  } else if (r.state === 'shop') {
    if (!sawShop) await shopChecks();
    else { await p.locator('[data-phc-phase="leave"]').click(); await p.waitForFunction(() => window.__phc.getState().game.run.state !== 'shop', null, { timeout: 30000 }); }
  } else if (r.state === 'engage') { // rules 1.90: a fight node asks first; walk in
    await p.locator('[data-phc-engage="walk"]').click({ timeout: 30000 }); await p.waitForFunction(() => window.__phc.getState().game.run.state !== 'engage', null, { timeout: 30000 });
  } else if (r.state === 'fight') {
    await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 60000 }).catch(() => {});
    const e = await act({ type: 'run/skip' }); if (e) { ok('run/skip in a fight: ' + e, false); break; }
    await p.locator('[data-phc-field-leave]').click({ timeout: 60000 }); await p.waitForFunction(() => window.__phc.getState().game.run.state !== 'field', null, { timeout: 30000 }); // rules 1.55: the field, left at once
    await p.waitForFunction(() => window.__phc.getState().screen !== 'combat', null, { timeout: 30000 }); // rules 1.62 item 4903: no end card, straight on
  } else if (r.state === 'reward') {
    await p.waitForSelector('[data-phc-pick-materials], [data-phc-pick], [data-phc-kit] [data-phc-choice]', { timeout: 30000 });
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
      await click(p, /Back to the map|Finish later/, { timeout: 30000 });
      await p.waitForSelector('[data-phc-run-screen]', { timeout: 30000 });
    }
    const ro = Object.values((await run()).offers || {})[0];
    if (!equipped && ro && ro.weapons.length === 1 && WPN[ro.weapons[0].id] && ro.weapons[0].id !== Object.values((await G()).characters)[0].weapon) { // the first weapon card of the walk: taken, then equipped through the sheet
      await p.locator('[data-phc-pick="0"]').first().click();
      await p.waitForFunction(() => window.__phc.getState().game.run.state !== 'reward', null, { timeout: 30000 });
      if ((await run()).state === 'map') { equipped = true; await equipCheck(ro.weapons[0]); }
    } else {
      await p.locator('[data-phc-pick-materials], [data-phc-pick="0"]').first().click(); // rules 1.54 item 2: the materials (else the first weapon)
      await p.waitForFunction(() => window.__phc.getState().game.run.state !== 'reward', null, { timeout: 30000 });
    }
  }
}
r = await run(); g = await G();
ok('the level-up waits on the map at level 3 (the class is earned there), and Back to the map returns', sawLevelUp && Object.values(g.characters)[0].level >= 3);
ok('rules 1.43: the route passed a training ground, a shrine, a Forge, a crossroads and a rest, each choice landed (' + JSON.stringify(done) + ')', ['training', 'shrine', 'forge', 'event', 'rest'].every((k) => done[k]));
ok('a shop was on the way and opened full screen', sawShop);
ok('the visibility standard held on the shop and at least two other places (' + headerPlaces + ')', headerPlaces >= 3);
ok('rules 1.46: every safe node on the route opened full screen (' + Object.keys(placeShots).join(', ') + ')', ['forge', 'training', 'shrine', 'event', 'rest'].every((k) => placeShots[k]));
ok('the whole stage walked to the Boss: 15 nodes, STAGE 1 CLEARED', r.state === 'boon' && r.path.length === 15 && /STAGE 1 CLEARED/.test(await p.locator('[data-phc-cleared]').textContent()));
ok('rules 1.54 item 11: a weapon taken from a pick on the walk was equipped through the sheet', equipped);
await sidePanels(p, 'the stage cleared');
{ // rules 1.54 item 7: with a focus in hand, ten mana residue pressed into a core through the sheet's Make
  const F = ITM.find((x) => x.focus && x.pack_kind), RES = CORE.needs[0].item, MADE = CORE.gives[0].item;
  await p.evaluate(([f, name, kind]) => { const c = Object.values(window.__phc.getState().game.characters)[0]; c.pack = [...(c.pack || []), { id: f, item: f, name, qty: 1, kind }]; }, [F.id, F.name, F.pack_kind]); // the suite's set-up: a focus in the pack
  await p.evaluate(() => window.__phc.go('main')); // drawn again from the state (a test hand-off is no action)
  const hold = async (name, button) => { const row = p.locator('[aria-label="Backpack contents"] [role="listitem"]').filter({ hasText: name }).first();
    await row.locator('button').first().click(); await settle(p, 200); await row.getByRole('button', { name: button, exact: true }).click(); await settle(p, 300); };
  await p.locator('#phc-sheet-tab-gear').click(); await settle(p, 300);
  const c0 = Object.values((await G()).characters)[0];
  if (WPN[c0.weapon]?.hands === '2H') await hold(WPN[KN].name, 'Main hand'); // a one-handed knife in the main hand, so the off hand is free
  await hold(F.name, 'Off hand');
  const c1 = Object.values((await G()).characters)[0];
  ok('the focus held in the off hand through the sheet (' + F.name + '), ' + held(c1, RES) + ' mana residue carried', c1.offHand?.id === F.id && held(c1, RES) >= CORE.needs[0].n);
  await p.waitForSelector('[data-phc-recipe="' + CORE.id + '"]', { timeout: 15000 }).catch(() => {});
  const row = p.locator('[data-phc-recipe="' + CORE.id + '"]');
  ok('Make shows the core: it takes ' + CORE.needs[0].n + ' mana residue with the focus in hand', await row.count() === 1 && new RegExp('^' + CORE.needs[0].n + ' mana residue').test(await row.locator('[data-phc-recipe-needs]').textContent()));
  await row.locator('[data-phc-make-go]').click();
  await p.waitForFunction(([id, n]) => (Object.values(window.__phc.getState().game.characters)[0].pack || []).filter((x) => (x.item || x.id) === id).reduce((t, x) => t + x.qty, 0) !== n, [MADE, held(c1, MADE)], { timeout: 30000 }).catch(() => {});
  const c2 = Object.values((await G()).characters)[0];
  ok('Make clicked: a core arrives (' + held(c1, MADE) + ' → ' + held(c2, MADE) + '), ' + CORE.needs[0].n + ' mana residue leave (' + held(c1, RES) + ' → ' + held(c2, RES) + ')', held(c2, MADE) === held(c1, MADE) + CORE.gives[0].n && held(c2, RES) === held(c1, RES) - CORE.needs[0].n);
  await p.locator('#phc-sheet-tab-skills').click(); await settle(p, 200);
}

// ---------- rules 1.44 (build step 5): the boon, the next tile, stage 2, retire, the summary ----------
const both = async (name) => { await shot(name + '-1280'); await p.setViewportSize({ width: 1920, height: 1080 }); await settle(p, 600); await shot(name + '-1920'); await p.setViewportSize({ width: 1280, height: 720 }); await settle(p, 300); };
const cid0 = Object.keys(g.characters)[0], offer = r.boons[cid0];
const cards = await p.locator('[data-phc-boons="' + cid0 + '"] [data-phc-boon]').allTextContents();
ok('the boon pick: three large cards, each its name, its sentence with its number from data and its worth (' + offer.join(', ') + ')', cards.length === 3 && offer.length === 3
  && cards.every((t) => /\d/.test(t) && /Uses \d+ of your boon room|Uses no boon room/.test(t)) /* 0.32 B10 wording: 'Uses N of your boon room' */ && await p.locator('[data-phc-boons] [data-phc-boon] [data-phc-boon-icon]').count() === 3); // 0.28.1: the artist's icon
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
  if (await p.locator('[data-phc-place]').count()) { await p.locator('[data-phc-phase="leave"]').click(); } // a safe node is a place (rules 1.46): walk out to the map
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
      seen.fork = ids.includes(vg.id) && ids.length === 2 && (tip || '').includes(SVD.tips.vault_guard); // the hover card carries the data's own words
      ok('the vault\'s fork: the lane and the guarded vault both lit, its card says so ("' + (tip || '').slice(0, 70) + '")', seen.fork);
      await both('survival-vault-fork');
    }
    if (here && here.id === vc.id && !seen.back) { seen.back = JSON.stringify(ids) === JSON.stringify(fork.links.filter((l) => l !== vg.id)); ok('after the chest the squad is back on its lane: the fork\'s next node lit (' + ids.join(', ') + ')', seen.back); }
    const next = !here ? s2route[0] : s2route.includes(here.id) && here.id !== fork.id ? (here.links.find((l) => s2route.includes(l)) || here.links[0]) : here.id === fork.id ? vg.id : here.id === vg.id ? vc.id : here.links.filter((l) => l !== vg.id)[0];
    await p.locator('[data-phc-node="' + next + '"]').click();
    await p.waitForFunction((id) => window.__phc.getState().game.run.at === id, next, { timeout: 30000 }).catch(() => {});
    if ((await run()).at !== next) { ok('stage 2: the click on ' + next + ' moved the squad', false); break; }
  } else if (r.state === 'engage') { // rules 1.90: a fight node asks first; walk in
    await p.locator('[data-phc-engage="walk"]').click({ timeout: 30000 }); await p.waitForFunction(() => window.__phc.getState().game.run.state !== 'engage', null, { timeout: 30000 }).catch(() => {});
  } else if (r.state === 'fight') {
    e = await act({ type: 'run/skip' });
    if (!e && s2by[r.at]?.kind === 'vault_guard' && !seen.guard) { const f = (await run()).stats.fights.at(-1), name = (await G()).run && f.foes.map((x) => x.name);
      seen.guard = f.kind === 'vault_guard' && f.template === 'vault_watch' && f.foes.some((x) => x.tier === 'elite'); ok('the vault\'s guard: a fight of its own (' + f.template + ': ' + name.join(', ') + '), harder than an Elite\'s', seen.guard); }
  } else if (r.state === 'field') { e = await act({ type: 'run/leave' }); // rules 1.55: the field (solo: one Leave)
  } else if (r.state === 'shop') { e = await act({ type: 'run/leave' }); // rules 1.42: a shop on the way (solo: leaving is the close)
  } else if (r.state === 'reward') {
    if (s2by[r.at]?.kind === 'vault' && !seen.chest) { const o = Object.values(r.offers)[0]; seen.chest = o.weapons.length === 3 && o.weapons.every((w) => w.rarity === 'relic' || w.rarity === 'masterwork') && (r.note.credits || 0) > 0;
      ok('the vault\'s chest: credits (' + r.note.credits + ') and three weapons a grade above stage 2\'s picks (' + o.weapons.map((w) => w.rarity).join(', ') + ')', seen.chest); await both('survival-vault-chest'); }
    for (const [id, o] of Object.entries(r.offers || {})) e = e || await act({ type: 'run/pick', charId: id, choice: pickOf(o) }); for (const id of Object.keys(r.lasting || {})) e = e || await act({ type: 'run/take', charId: id, choice: 0 });
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
  && /2 stages cleared/.test(sum) && /32 stops walked/.test(sum) && await p.locator('[data-phc-stage-row]').count() === 2 && sum.includes(g.run.end.stages[0].boons[cid0] ? 'Kade: ' : 'Boons'));
await both('survival-summary');
// B11 (0.32): the stage table fits its panel at 1280 x 720 (its BOONS column ran past the right edge)
const stTable = await p.evaluate(() => { const t = document.querySelector('[data-phc-stages]'), w = t.parentElement; return { t: t.getBoundingClientRect().right, w: w.getBoundingClientRect().right, scroll: w.scrollWidth > w.clientWidth + 1, vw: innerWidth }; });
ok('B11: the run summary stage table fits its panel at ' + stTable.vw + ' (table to ' + Math.round(stTable.t) + ', panel to ' + Math.round(stTable.w) + ')', !stTable.scroll && stTable.t <= stTable.w + 0.5);
await sidePanels(p, 'the summary');
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
  await click(page, 'Next ›'); await lockIn(page);
  await page.waitForSelector('text=✓ LOCKED IN');
};
await hostAs(h, 'Leon');
await h.waitForSelector('[role="radiogroup"]');
const code = (await h.locator('text=/ROOM [A-Z0-9]{6}/').first().textContent()).match(/ROOM ([A-Z0-9]{6})/)[1];
await gu.goto(BASE + '/?room=' + code); await gu.getByPlaceholder('Leon').fill('Mai'); await click(gu, 'Join ›'); await gu.waitForSelector('text=The squad');
await create(h, 'Kade'); await create(gu, 'Ha');
await h.waitForFunction(() => Object.keys(window.__phc.getState().game?.characters || {}).length === 2, null, { timeout: 60000 }).catch(() => {}); // both locked in, on the host's side, before Start
await h.locator('button[data-phc-start]').click(); await campConfirmGo(h); // item E
await campStart(gu, { weapon: GUN }); // rules 1.51, 1.52: the guest's loadout, its starting boon, Ready
await until(h, () => [...document.querySelectorAll('[data-phc-member]')].some((e) => e.getAttribute('data-phc-ready') === '1'), null, 15000).catch(() => false);
ok('two browsers at the camp: the guest\'s Ready shows on the host\'s squad panel live, the map still waits for the host', (await h.locator('[data-phc-member][data-phc-ready="1"]').count()) === 1 && (await h.evaluate(() => window.__phc.getState().game.run.state)) === 'loadout');
await h.locator('[data-phc-camp-close]').click(); // the host starts for everyone: its own untouched loadout is the Recommended one, with the first card
await until(gu, () => !!document.querySelector('[data-phc-run-screen]'), null, 30000).catch(() => false);
const HG = () => h.evaluate(() => window.__phc.getState().game), GG = () => gu.evaluate(() => window.__phc.getState().game);
const actOn = (page, a) => page.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
let hr = (await HG()).run;
// the way to the first shop: a path through the links from the first row
const byId = Object.fromEntries(hr.nodes.map((n) => [n.id, n])), shopN = hr.nodes.filter((n) => n.kind === 'shop').sort((a, b) => a.depth - b.depth)[0];
const way = (() => { const back = (id) => { const n = byId[id]; if (n.depth === 1) return [id]; const prev = hr.nodes.find((x) => x.links.includes(id) && back(x.id)); return prev ? [...back(prev.id), id] : null; }; return back(shopN.id) || []; })();
let coopReward = false, coopEngage = false;
for (let i = 0; i < 80; i++) {
  hr = (await HG()).run; if (hr.state === 'shop' || hr.state === 'over') break;
  let e = null;
  // the guest's move only where the way forks (on a lane with one way forward the host's click walks the squad on)
  if (hr.state === 'map') { const next = way[hr.path.length], at = hr.nodes.find((n) => n.id === hr.at), forks = !at || at.links.length >= 2; e = await actOn(h, { type: 'run/move', node: next }); if (!e && forks) { await settle(h, 150); e = await actOn(gu, { type: 'run/move', node: next }); } }
  else if (hr.state === 'engage' && !coopEngage) { // rules 1.90 items 7801, 7805, 7811: the guest sees the choice greyed; the host tries an ambush, lost (a natural 1): the squad sits round 1 out
    coopEngage = true;
    await gu.waitForSelector('[data-phc-engage-screen]', { timeout: 30000 }).catch(() => {});
    const gWait = (await gu.locator('[data-phc-waiting]').textContent().catch(() => '')) || '';
    const gNow = await actOn(gu, { type: 'run/engage', how: 'walk' }); await settle(gu, 1200); // a guest's action goes to the host: its refusal comes back as the guest's toast
    const gRefused = gNow || await gu.evaluate(() => window.__phc.getState().toast?.text || '');
    if (AMBUSH_SHOTS) { await gu.mouse.move(2, 2); await settle(gu, 400); await gu.screenshot({ path: AMBUSH_SHOTS + '/engage-guest.png' }); }
    ok('C: the guest sees the engage screen with both choices greyed and "' + gWait + '"; its run/engage is refused ("' + gRefused + '")', await gu.locator('[data-phc-engage="walk"]').isDisabled() && await gu.locator('[data-phc-engage="ambush"]').isDisabled() && gWait === SVD.ambush.words.waiting && !!gRefused && (await HG()).run.state === 'engage');
    await h.evaluate((d) => { window.__phc.getState().game.rng.state = d; }, dieSeed(1));
    await h.evaluate(() => { const w = window; w.__ambCard = ''; new MutationObserver(() => { const el = document.querySelector('[data-phc-card="fight"]'); if (el && !w.__ambCard) w.__ambCard = el.textContent || ''; }).observe(document, { childList: true, subtree: true }); }); // the opening banner's words, whenever it shows
    await h.waitForSelector('[data-phc-engage="ambush"]', { timeout: 30000 }); await h.locator('[data-phc-engage="ambush"]').click();
    await h.waitForFunction(() => !!window.__phc.getState().game.combat, null, { timeout: 30000 }).catch(() => {});
    const cb = (await HG()).combat, o = cb.opening || {}, first = cb.units.find((u) => u.id === cb.order[cb.turn]); // read at once: round 1 is the hostiles' (the caught characters' turns pass)
    const card = await h.waitForFunction(() => window.__ambCard || null, null, { timeout: 30000 }).then((x) => x.jsonValue(), () => '');
    ok('C: Try an ambush lost by two: ENEMY ADVANTAGE with the total and TN ("' + card.slice(0, 80) + '"), every character caught, no fumble, the first turn a hostile\'s (' + first?.name + ')', o.ambush && o.won === false && !o.fumble && card.includes(CARDS.ambush_lost.name) && card.includes(String(o.total)) && card.includes(String(o.tn))
      && cb.units.filter((u) => u.charId).every((u) => u.caught) && (await HG()).combat.log.filter((l) => /is caught by the ambush/.test(l)).length >= 2 && (cb.round > 1 || first?.side !== 'pc'));
  }
  else if (hr.state === 'engage') e = await actOn(h, { type: 'run/engage', how: 'walk' });
  else if (hr.state === 'fight') e = await actOn(h, { type: 'run/skip' });
  else if (hr.state === 'field') e = await actOn(h, { type: 'run/leave', close: true }); // rules 1.55: the host closes the field
  else if (hr.state === 'reward' && !coopReward && Object.keys(hr.offers || {}).length === 2) { // rules 1.64: each player's own reward panel
    coopReward = true;
    const G0 = await HG(), kId = Object.values(G0.characters).find((x) => x.owner === G0.hostId).id, hId = Object.keys(G0.characters).find((id) => id !== kId);
    await gu.waitForSelector('[data-phc-reward-panel]', { timeout: 30000 }).catch(() => {}); await h.waitForSelector('[data-phc-reward-panel]', { timeout: 30000 }).catch(() => {});
    const guOffers = await gu.locator('[data-phc-reward-panel] [data-phc-offer]').evaluateAll((l) => l.map((x) => x.getAttribute('data-phc-offer')));
    const stillG = (await gu.locator('[data-phc-reward-still]').textContent().catch(() => '')) || '';
    await gu.mouse.move(2, 2); await settle(gu, 300); await gu.screenshot({ path: OUT + 'reward-panel-guest.png' });
    ok('C: the guest\'s reward panel holds its own pick only (' + guOffers.join() + ') and says who is still choosing ("' + stillG + '")', guOffers.length === 1 && guOffers[0] === hId && stillG.includes(G0.characters[kId].name));
    await h.locator('[data-phc-reward-panel] [data-phc-pick-materials], [data-phc-reward-panel] [data-phc-pick="0"]').first().click();
    await h.waitForFunction((id) => !window.__phc.getState().game.run.offers?.[id], kId, { timeout: 30000 }).catch(() => {});
    await settle(h, 400);
    if (!(await h.locator('[data-phc-reward-panel]').count()) && (await HG()).run.state === 'reward') {
      const want = SVD.run.reward_panel.waiting_for.replace('{names}', G0.characters[hId].name);
      const foot = (await h.locator('[data-phc-waiting]').textContent().catch(() => '')) || '';
      const H1 = await HG(), litH = await h.locator('[data-phc-node][data-phc-state="reachable"]').count();
      const node = h.locator('[data-phc-node="' + H1.run.nodes.find((n) => n.id === H1.run.at).links[0] + '"]'); await node.scrollIntoViewIfNeeded(); await node.click();
      const say = await until(h, () => document.querySelector('[data-phc-map-say]')?.textContent || null, null, 5000).catch(() => '');
      await h.mouse.move(2, 2); await settle(h, 200); await h.screenshot({ path: OUT + 'reward-host-waits.png' });
      ok('C: the host, picked, clicks the next stop (nothing lit: ' + litH + '): the engine says who it waits for ("' + say + '"), and the header says it too', say === want && foot === want && litH === 0 && (await HG()).run.state === 'reward');
    } else ok('C: the host\'s panel closed after its pick (a pick of kit still open: ' + await h.locator('[data-phc-reward-panel]').count() + ')', false);
    await gu.locator('[data-phc-reward-panel] [data-phc-pick-materials], [data-phc-reward-panel] [data-phc-pick="0"]').first().click();
    await gu.waitForFunction((id) => !window.__phc.getState().game.run.offers?.[id], hId, { timeout: 30000 }).catch(() => {});
    ok('C: the guest\'s pick, made inside its panel, is applied', !(await HG()).run.offers?.[hId]);
  }
  else if (hr.state === 'reward') { for (const [id, o] of Object.entries(hr.offers || {})) e = e || await actOn(h, { type: 'run/pick', charId: id, choice: pickOf(o) }); for (const id of Object.keys(hr.lasting || {})) e = e || await actOn(h, { type: 'run/take', charId: id, choice: 'none' }); }
  if (e) { ok('C: walked to the shop: ' + e, false); break; }
  await settle(h, 120);
}
await h.evaluate(() => window.__phc.go('run')).catch(() => {}); await gu.evaluate(() => window.__phc.go('run')).catch(() => {});
await h.waitForSelector('[data-phc-place-frame]', { timeout: 60000 }); await gu.waitForSelector('[data-phc-place-frame]', { timeout: 60000 });
ok('C: both browsers stand in the shop (node ' + shopN.id + ')', (await HG()).run.state === 'shop');
// a graded weapon with a mod in Kade's pack (a test hand-off: the host's state, as the purse above)
let hg = await HG(); const kade = Object.values(hg.characters).find((c) => c.owner === hg.hostId), ha = Object.values(hg.characters).find((c) => c.id !== kade.id);
await h.evaluate(([cid, gun]) => { const c = window.__phc.getState().game.characters[cid]; c.pack = [...(c.pack || []), { id: gun, weapon: gun, name: 'Kade\'s old rifle', qty: 1, kind: 'weapon', rarity: 'fine', mods: ['mod_red_dot'] }]; c.credits += 400; }, [kade.id, kade.weapon]);
await h.locator('[data-phc-tab="give"]').click();
await h.waitForSelector('[data-phc-give]:not([data-phc-give-compact]) [data-phc-give-to]');
// the place's own Give tab; the Survival right panel holds a compact Give module too (rules 1.55: modes.json panels `give`),
// so every locator below is scoped to the tab, and the module is checked to be there beside it
const GV = h.locator('[data-phc-give]:not([data-phc-give-compact])');
ok('C: the Give tab is one, and the right panel keeps its compact Give module beside it', await GV.count() === 1 && await h.locator('[data-phc-give-compact] [data-phc-give-to="' + ha.id + '"]').count() === 1);
ok('C: the Give tab: the party as cards (' + (await GV.locator('[data-phc-give-to]').allTextContents()).join(', ') + '), what can\'t be given greyed with its reason', await GV.locator('[data-phc-give-to="' + ha.id + '"]').count() === 1
  && /can't be handed over/.test(await GV.locator('[data-phc-give-row="train"]').textContent()));
const haC0 = (await GG()).characters[ha.id].credits;
await GV.locator('[data-phc-give-row="credits"]').click();
for (let i = 0; i < 3; i++) await GV.locator('[data-phc-give-send] [data-phc-amount-step="10"]').click(); // rules 1.55 item 54: the amount control, 100 → 130
await GV.locator('[data-phc-give-send] [data-phc-amount-input]').fill('125'); // a typed amount
const n = Number((await GV.locator('[data-phc-give-send] [data-phc-amount-input]').inputValue()).replace(/\D/g, ''));
ok('C: the amount control: a typed 125 is the amount, of what Kade holds (' + (await GV.locator('[data-phc-amount-held]').textContent()) + ')', n === 125 && /^of [\d,]+$/.test(await GV.locator('[data-phc-amount-held]').textContent()));
ok('C: the button reads what it does ("' + (await GV.locator('[data-phc-give-go]').textContent()) + '")', new RegExp('^Give ' + n + ' credits to Ha$').test(await GV.locator('[data-phc-give-go]').textContent()));
await h.screenshot({ path: OUT + 'survival-shop-give-1280.png' });
await GV.locator('[data-phc-give-go]').click();
const toastC = await until(gu, () => { const t = window.__phc.getState().toast?.text || ''; return /gives Ha \d+ credits/.test(t) ? t : null; }, null, 15000).catch(() => ''); // the give's own toast
await gu.waitForFunction(([cid, want]) => window.__phc.getState().game.characters[cid].credits === want, [ha.id, haC0 + n], { timeout: 15000 }).catch(() => {}); // and the purse at its new number
ok('C: the guest sees the credits arrive: a toast ("' + toastC + '") and the purse (' + haC0 + ' → ' + (await GG()).characters[ha.id].credits + ')', /gives Ha \d+ credits/.test(toastC) && (await GG()).characters[ha.id].credits === haC0 + n);
const idx = (await HG()).characters[kade.id].pack.findIndex((x) => x.name === 'Kade\'s old rifle');
await GV.locator('[data-phc-give-row="pack:' + idx + '"]').click();
await GV.locator('[data-phc-give-go]').click();
await gu.waitForFunction((cid) => (window.__phc.getState().game.characters[cid].pack || []).some((x) => x.name === 'Kade\'s old rifle'), ha.id, { timeout: 30000 }).catch(() => {});
const got = ((await GG()).characters[ha.id].pack || []).find((x) => x.name === 'Kade\'s old rifle');
ok('C: the graded weapon arrives whole on the guest\'s side (Fine, its mod, its own pack line)', !!got && got.rarity === 'fine' && JSON.stringify(got.mods) === '["mod_red_dot"]' && got.qty === 1);
ok('C: both browsers\' visit logs say who gave what', /gives Ha/.test(await gu.locator('[data-phc-visit-log]').textContent()) && /gives Ha/.test(await h.locator('[data-phc-visit-log]').textContent()));
await h.setViewportSize({ width: 1920, height: 1080 }); await settle(h, 600); await h.screenshot({ path: OUT + 'survival-shop-give-1920.png' }); await h.setViewportSize({ width: 1280, height: 720 });
await gu.locator('[data-phc-phase="leave"]').click();
await h.waitForFunction((pid) => !!window.__phc.getState().game.run.ready?.[pid], (await GG()).players.find((x) => x.name === 'Mai').id, { timeout: 30000 }).catch(() => {});
ok('C: the guest marks Ready to leave; the host sees READY and the shop stays open', (await HG()).run.state === 'shop' && /READY/.test(await h.locator('[data-phc-member][data-phc-ready="1"]').first().textContent().catch(() => '')));
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
  else if (hr.state === 'engage') e = await actOn(h, { type: 'run/engage', how: 'walk' }); // rules 1.90
  else if (hr.state === 'fight') e = await actOn(h, { type: 'run/skip' });
  else if (hr.state === 'shop') { e = await actOn(h, { type: 'run/leave', close: true }); }
  else if (hr.state === 'field') e = await actOn(h, { type: 'run/leave', close: true }); // rules 1.55: the host closes the field
  else if (hr.state === 'reward') { for (const [id, o] of Object.entries(hr.offers || {})) e = e || await actOn(h, { type: 'run/pick', charId: id, choice: pickOf(o) }); for (const id of Object.keys(hr.lasting || {})) e = e || await actOn(h, { type: 'run/take', charId: id, choice: 'none' }); }
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
    await x.waitForSelector('[data-phc-pathmap], [data-phc-place], [data-phc-place-frame]', { timeout: 30000, state: 'attached' });
    if (!(await x.locator('[data-phc-pathmap]').count()) && await x.locator('[data-phc-phase="leave"]').count()) await x.locator('[data-phc-phase="leave"]').first().click();
    await x.waitForSelector('[data-phc-pathmap]', { timeout: 30000 });
  }
  await h.locator('[data-phc-node="' + tA + '"]').click();
  const marked = await until(gu, (id) => /marked by Leon/.test(document.querySelector('[data-phc-node="' + id + '"]')?.getAttribute('aria-label') || '') || null, tA, 15000).catch(() => false);
  ok('C2: the host\'s mark shows live on the guest\'s map (' + tA + ': "marked by Leon"), the squad waits for the guest', !!marked && (await GG()).run.at === forkN.id);
  await h.screenshot({ path: OUT + 'survival-lean-1280.png' });
  await gu.locator('[data-phc-node="' + tB + '"]').click();
  await h.waitForFunction((id) => window.__phc.getState().game.run.at !== id, forkN.id, { timeout: 30000 }).catch(() => {});
  await gu.waitForFunction((id) => window.__phc.getState().game.run.at === id, tA, { timeout: 30000 }).catch(() => {}); // the guest's copy at the target too
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
await d.locator('button[data-phc-start]').click(); await campConfirmGo(d); // item E
// rules 1.51, 1.52: the camp's one flow. Ash is a tank (Durability on top): Recommended gives the Hand wraps and a Buckler
// (rules 1.55 item 51, 1.59), and a two-handed gun beside the shield is refused (item 50), so the free gun here is the
// revolver (one-handed, a magazine gun): the Hand wraps take no Relic property (power.ts FITS: unarmed is not melee),
// the revolver takes three (Keen, True, Quick), so the Relic step below still tests a real weapon's three properties
await campStart(d, { weapon: FREE('revolvers') });
await d.waitForSelector('[data-phc-run-screen]', { timeout: 60000 });
const dcid = Object.keys((await DG()).characters)[0];
/** Walk by the engine's actions until `stop` says so (fights skipped, picks the materials, shops left, the first trail). */
const walkD = async (stop, why) => { for (let i = 0; i < 400; i++) {
  const dr = (await DG()).run; if (!dr || dr.state === 'over' || await stop(dr)) return true;
  let e = null;
  if (dr.state === 'map') { const here = dr.nodes.find((n) => n.id === dr.at), nx = here ? here.links.filter((l) => dr.nodes.find((n) => n.id === l)?.kind !== 'vault_guard') : dr.nodes.filter((n) => n.depth === 1).map((n) => n.id); e = await dAct({ type: 'run/move', node: nx[0] }); }
  else if (dr.state === 'engage') e = await dAct({ type: 'run/engage', how: 'walk' }); // rules 1.90
  else if (dr.state === 'fight') e = await dAct({ type: 'run/skip' });
  else if (dr.state === 'shop') e = await dAct({ type: 'run/leave' });
  else if (dr.state === 'field') e = await dAct({ type: 'run/leave', close: true }); // rules 1.55: the host closes the field
  else if (dr.state === 'reward') { for (const [id, o] of Object.entries(dr.offers || {})) e = e || await dAct({ type: 'run/pick', charId: id, choice: pickOf(o) }); for (const id of Object.keys(dr.lasting || {})) e = e || await dAct({ type: 'run/take', charId: id, choice: 'none' }); }
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
  else if (dr.state === 'engage') e = await dAct({ type: 'run/engage', how: 'walk' }); // rules 1.90
  else if (dr.state === 'fight') e = await dAct({ type: 'run/skip' });
  else if (dr.state === 'shop') e = await dAct({ type: 'run/leave' });
  else if (dr.state === 'field') e = await dAct({ type: 'run/leave', close: true }); // rules 1.55: the host closes the field
  else if (dr.state === 'reward') { for (const [id, o] of Object.entries(dr.offers || {})) e = e || await dAct({ type: 'run/pick', charId: id, choice: pickOf(o) }); for (const id of Object.keys(dr.lasting || {})) e = e || await dAct({ type: 'run/take', charId: id, choice: 'none' }); }
  if (e) { ok('D: the way to the Forge: ' + e, false); break; }
}
await d.evaluate(() => window.__phc.go('run')).catch(() => {});
await d.waitForSelector('[data-phc-choices] [data-phc-choice^="relic:main:"]', { timeout: 30000 }).catch(() => {});
const relics = await d.locator('[data-phc-choices] [data-phc-choice^="relic:main:"]').evaluateAll((l) => l.map((e) => ({ key: e.getAttribute('data-phc-choice'), why: e.hasAttribute('data-phc-why'), text: e.textContent })));
ok('D: at stage 3\'s Forge the Relic step offers three named properties, each with the boon room it uses (' + relics.map((x) => x.key.split(':')[2]).join(', ') + ')', relics.length === 3 && relics.every((x) => !x.why && /Uses \d+ boon room/.test(x.text)));
await d.screenshot({ path: OUT + 'survival-relic-step-1280.png' });
const c0 = (await DG()).characters[dcid];
if (relics[0]) await d.locator('[data-phc-choice="' + relics[0].key + '"]').click();
await d.waitForFunction((cid) => window.__phc.getState().game.characters[cid].weaponState?.rarity === 'relic', dcid, { timeout: 30000 }).catch(() => {});
const c1 = (await DG()).characters[dcid], prop = relics[0] && relics[0].key.split(':')[2];
ok('D: the Relic step taken: the rifle is a Relic with ' + prop + ', 6,500 credits paid (' + c0.credits + ' → ' + c1.credits + ')', c1.weaponState?.rarity === 'relic' && c1.weaponState?.prop === prop && c0.credits - c1.credits === 6500);
ok('D: no page errors (' + d.errors.slice(0, 3).join(' | ') + ')', !d.errors.length);
await browser.close();
