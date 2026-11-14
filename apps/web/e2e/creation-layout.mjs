// Character creation's card layout (Leon, 8 Nov): at most two archetypes, three traits and two patrons a row (bigger
// pictures and text, at any screen width); every card in a grid the same height, long text scrolling inside its card;
// a god's art opens large; picking another archetype or origin moves nothing; no sideways scroll at phone width.
import { chromium, click, player, hostAs, settle, LOCK_IN } from './lib.mjs';
const browser = await chromium.launch();
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const SHOTS = process.env.SHOTS;
const p = await player(browser, 'A');
await hostAs(p, 'Leon');
await click(p, 'Create a character');
await p.getByPlaceholder('What the squad calls you').fill('Vess');
const step = async (name) => { await p.getByRole('navigation', { name: 'Creation steps' }).getByRole('button', { name }).click(); await settle(p, 350); };
/** A grid's columns and its cards' heights. */
const grid = (sel) => p.evaluate((sel) => {
  const g = document.querySelector(sel); if (!g) return null;
  const hs = [...g.children].map((c) => Math.round(c.getBoundingClientRect().height));
  const scrolls = [...g.querySelectorAll('.phc-cc-scroll')].filter((x) => x.scrollHeight > x.clientHeight + 2).length;
  return { cols: getComputedStyle(g).gridTemplateColumns.split(' ').length, n: hs.length, min: Math.min(...hs), max: Math.max(...hs), scrolls };
}, sel);

for (const W of [1440, 1920, 2560]) {
  await p.setViewportSize({ width: W, height: 1000 });
  await step('Archetype'); const a = await grid('[data-arch-grid]');
  await step('Traits'); const t = await grid('[data-trait-grid]');
  await step('Belief'); await p.locator('[data-belief="faithful"]').click(); await settle(p, 250); const b = await grid('[data-patron-grid]');
  // rules 1.52: the Kit step is gone (gear is given by the mode); its techniques and magic are the Moves step
  await step('Moves'); ok(W + ' px: the Moves step holds no kit cards', (await p.locator('[data-kit-grid]').count()) === 0);
  ok(W + ' px: archetypes ' + a.cols + ', traits ' + t.cols + ', patrons ' + b.cols + ' a row (at most 2 / 3 / 2)', a.cols <= 2 && t.cols <= 3 && b.cols <= 2);
  ok(W + ' px: every card in a grid is the same height (' + [a, t, b].map((x) => x.min + '–' + x.max).join(', ') + ')', [a, t, b].every((x) => x.max - x.min <= 1));
}

// Text that doesn't fit scrolls inside its card (the longest trait, at the narrowest desktop width).
await p.setViewportSize({ width: 1440, height: 1000 });
await step('Traits');
const tr = await grid('[data-trait-grid]');
ok('a trait longer than its card scrolls inside it (' + tr.scrolls + ' of ' + tr.n + '), the cards stay ' + tr.max + ' px', tr.scrolls >= 1 && tr.max - tr.min <= 1);
const lunar = p.locator('[data-trait="lunarshine"] .phc-cc-scroll');
if (await lunar.count()) {
  const btnY0 = await p.locator('[data-trait="lunarshine"] button').last().boundingBox();
  await lunar.evaluate((el) => { el.scrollTop = el.scrollHeight; }); await settle(p, 100);
  const btnY1 = await p.locator('[data-trait="lunarshine"] button').last().boundingBox();
  ok('scrolling a card\'s text leaves its button where it was', Math.abs(btnY0.y - btnY1.y) < 1);
}

// The archetype preview: Use doesn't move from one archetype to another (5-row skill list held).
await step('Archetype');
// Measured inside the panel (it is sticky, so its place on screen follows the page's scroll).
const useAt = async (id) => { await p.locator('[data-arch="' + id + '"]').click(); await settle(p, 150);
  return p.locator('[data-arch-preview]').evaluate((a) => { const b = [...a.querySelectorAll('button')].find((x) => /^Use /.test(x.textContent)); return b.getBoundingClientRect().top - a.getBoundingClientRect().top + a.scrollTop; }); };
const ys = [await useAt('bulwark'), await useAt('prophet'), await useAt('sharpshooter')];
ok('the preview\'s Use button stays put across archetypes (' + ys.map(Math.round).join(', ') + ')', Math.max(...ys) - Math.min(...ys) < 1);

// Identity: the origin details are one height whatever the origin.
await step('Identity');
const det = [];
for (const n of ['01', '06', '10']) { await p.locator('[data-origin="' + n + '"]').click(); await settle(p, 120); det.push(Math.round((await p.locator('[data-origin-detail]').boundingBox()).height)); }
ok('the origin details are one height for every origin (' + det.join(', ') + ')', Math.max(...det) - Math.min(...det) <= 1);

// Belief: a god's art opens large, then closes.
await step('Belief');
const art = p.locator('[data-patron-art="mother_ember"]');
ok('every patron card leads with its art, as a button', (await p.locator('[data-patron-art]').count()) === 8 && (await art.getAttribute('aria-label')) === 'View the art of Mother Ember');
await art.click();
const lb = p.getByRole('dialog', { name: /Mother Ember/ });
await lb.waitFor({ timeout: 30000 });
const big = await lb.locator('img').evaluate((img) => ({ src: img.getAttribute('src'), w: img.naturalWidth }));
ok('clicking the art opens it large (' + big.src + ', ' + big.w + ' px wide)', /patron-mother_ember.*-lg/.test(big.src) || big.w >= 600);
if (SHOTS) { await settle(p, 600); await p.screenshot({ path: SHOTS + '/creation-patron-art.png' }); }
await lb.getByRole('button', { name: 'Close the enlarged image' }).click();
await lb.waitFor({ state: 'detached', timeout: 30000 });
ok('and closes', (await p.getByRole('dialog').count()) === 0);
ok('the art click doesn\'t swear you to the patron', (await p.locator('[data-swear="mother_ember"]').getAttribute('aria-checked')) === 'false');

// Skills: a mastery mark (+3 M1) never adds a line, so every skill card, and every attribute row, keeps one height.
await step('Archetype'); await p.locator('[data-arch="bulwark"]').click(); await p.locator('[data-arch-preview] button', { hasText: /^Use / }).click(); await settle(p, 300);
for (const W of [1100, 1440]) {
  await p.setViewportSize({ width: W, height: 1000 }); await settle(p, 250);
  const hs = await p.evaluate(() => [...document.querySelectorAll('.phc-card')].map((c) => Math.round(c.getBoundingClientRect().height)));
  ok(W + ' px, Skills: all ' + hs.length + ' skill cards one height, mastered or not (' + Math.min(...hs) + '–' + Math.max(...hs) + ')', hs.length === 27 && Math.max(...hs) - Math.min(...hs) <= 1);
}
// Phone width: one card a row, nothing wider than the screen.
await p.setViewportSize({ width: 390, height: 844 });
for (const s of ['Identity', 'Archetype', 'Skills', 'Traits', 'Belief', 'Moves', 'Lock in']) {
  await step(s);
  const wide = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  ok('390 px, ' + s + ': no sideways scroll (' + wide + ' px over)', wide <= 1);
}
await step('Belief');
ok('390 px: one patron a row', (await grid('[data-patron-grid]')).cols === 1);
if (SHOTS) { await p.locator('[data-patron="mother_ember"]').scrollIntoViewIfNeeded(); await settle(p, 300); await p.screenshot({ path: SHOTS + '/creation-belief-phone.png' }); }
// Short screens (an outside review of 0.25.0): on every step Back and Next stay in view at the foot of the page, at
// the top of a long step and at its end, with a fade above them; on the Lock in step its own button is in view too.
const inView = (sel, name) => p.evaluate(([sel, name]) => {
  const b = [...document.querySelectorAll(sel)].find((x) => x.textContent.replace(/\s+/g, ' ').trim() === name); if (!b) return false;
  const r = b.getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return r.top >= 0 && r.bottom <= innerHeight && !!e && (e === b || b.contains(e));
}, [sel, name]);
for (const [W, H] of [[1280, 720], [1366, 768]]) {
  await p.setViewportSize({ width: W, height: H }); await settle(p, 250);
  for (const s of ['Identity', 'Archetype', 'Skills', 'Traits', 'Belief', 'Moves', 'Lock in']) {
    await step(s);
    const seen = [];
    for (const y of [0, 1e6]) {
      await p.evaluate((y) => { window.scrollTo(0, y); for (const e of document.querySelectorAll('*')) if (e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY) && e.contains(document.querySelector('[data-phc-create]'))) e.scrollTop = y; }, y); await settle(p, 150);
      seen.push(await inView('footer.phc-cc-foot button', '‹ Back') && await inView('footer.phc-cc-foot button', 'Next ›'));
      if (s === 'Lock in') seen.push(await inView('button', LOCK_IN.room));
    }
    const fade = await p.evaluate(() => { const f = document.querySelector('footer.phc-cc-foot'); return !!f && getComputedStyle(f).position === 'sticky' && getComputedStyle(f, '::before').backgroundImage.includes('gradient'); });
    ok(`${W}x${H}, ${s}: Back and Next${s === 'Lock in' ? ' and the Lock in button' : ''} in view at the top and the end of the step, a fade above them (${seen.join(',')})`, seen.every(Boolean) && fade);
    if (SHOTS && s === 'Archetype' && W === 1280) await p.screenshot({ path: SHOTS + '/creation-short-archetype.png' });
  }
}
// The Belief step at Faith 0: a plain note says what Whispers and Hymns each need (the engine's numbers).
await step('Belief');
const low = await p.locator('[data-belief-faith]').textContent().catch(() => '');
ok('Belief at Faith 0: the note says the Faith Whispers and Hymns need ("' + low + '")', /^Your Faith is 0\. Whispers need Faith \d+; Hymns need Faith \d+\./.test(low || ''));
ok('no page errors' + (p.errors.length ? ': ' + p.errors.join(' | ') : ''), !p.errors.filter((e) => !/ERR_TUNNEL_CONNECTION_FAILED/.test(e)).length);
await browser.close();
