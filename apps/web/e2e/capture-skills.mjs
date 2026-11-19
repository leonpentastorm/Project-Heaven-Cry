// The skill screens, captured and measured (0.31.11; docs/design/handoffs/2026-11-18-skill-screens-redesign.md sections 4
// and 5). Part 1, each skill's "?" page from creation's Skills step at 1600x900 and 1280x720 ->
// .check/capture/skills/<w>-<nn>-<id>.png: the lore face with its folds closed fits the window without scrolling inside
// the panel; opened, the ladder has ten rows and no perk or fork row wraps (one line each at 1280); nothing is cut
// sideways. Part 2, the final shots for the lead -> .check/capture/final/: a beta's "?" page folds closed and all open, an
// alpha's and a gamma's closed, creation's Skills step, and from the Proving Ground the level-up screen (nothing open, a
// perk step chooser, a fork chooser, three choices waiting), the Outburst workshop's ways row and the Faith tab.
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { chromium, click, player, hostAs, settle, here, openGround } from './lib.mjs';
const OUTD = here('../../../.check/capture/skills', import.meta.url), FINAL = here('../../../.check/capture/final', import.meta.url);
mkdirSync(OUTD, { recursive: true }); mkdirSync(FINAL, { recursive: true });
const skills = JSON.parse(readFileSync(here('../../../data/skills.json', import.meta.url), 'utf8'));
const ids = (skills.items || skills).filter((s) => ['alpha', 'beta', 'gamma'].includes(s.slot)).map((s) => s.id);
const slotOf = Object.fromEntries((skills.items || skills).map((s) => [s.id, s.slot]));
const browser = await chromium.launch();
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const SIZES = [[1600, 900], [1280, 720]];
/** Open (true) or close (false) the "?" page's three folds. */
const folds = (pg, open) => pg.evaluate((open) => { for (const s of ['.phc-ep-fold', '.phc-ep-perks-fold', '.phc-ep-forks-fold']) { const f = document.querySelector(s); if (f && (f.getAttribute('aria-expanded') === 'true') !== open) f.click(); } }, open);
const foldsAre = (pg, open) => pg.waitForFunction((open) => ['.phc-ep-fold', '.phc-ep-perks-fold', '.phc-ep-forks-fold'].every((s) => { const f = document.querySelector(s); return !f || (f.getAttribute('aria-expanded') === 'true') === open; }), open, { timeout: 30000 });
const p = await player(browser, 'A');
await hostAs(p, 'Leon');
await click(p, 'Create a character');
await p.getByPlaceholder('What the squad calls you').fill('Vess');
await p.getByRole('navigation', { name: 'Creation steps' }).getByRole('button', { name: 'Skills' }).click();
await settle(p, 300);
const done = [];
// ---------- Part 1: every skill's "?" page ----------
for (const [w, h] of SIZES) {
  await p.setViewportSize({ width: w, height: h }); await settle(p, 300);
  let n = 0;
  for (const id of ids) {
    n++;
    const file = w + '-' + String(n).padStart(2, '0') + '-' + id + '.png';
    try {
      await p.locator('[data-skill="' + id + '"] [data-skill-face]').click();
      await p.locator('.phc-ep-lore').waitFor({ timeout: 30000 });
      await folds(p, false); await foldsAre(p, false); await p.mouse.move(w - 4, 4); await settle(p, 200); // the pointer off the icons
      const face = await p.evaluate(() => { const box = document.querySelector('[role="dialog"] article');
        return { scroll: box.scrollHeight - box.clientHeight, lore: !!document.querySelector('.phc-ep-quote') && !!document.querySelector('.phc-ep-intro') }; });
      ok(w + 'x' + h + ' ' + id + ': the lore face, folds closed, fits without scrolling inside the panel (' + face.scroll + ' px over)', face.lore && face.scroll <= 1);
      await folds(p, true); await foldsAre(p, true); await settle(p, 200);
      const look = await p.evaluate(() => { const box = document.querySelector('[role="dialog"] article');
        // a row wraps when one of its text cells takes more than one line
        const wraps = [...document.querySelectorAll('.phc-perk-row, .phc-fork-row')].filter((r) => [...r.querySelectorAll('.phc-perk-t1, .phc-perk-t2, .phc-fork-line, .phc-perk-name')].some((c) => { const lh = parseFloat(getComputedStyle(c).lineHeight) || 20; return c.getBoundingClientRect().height > lh * 1.5; })).map((r) => r.getAttribute('data-perk') || r.getAttribute('data-fork-opt'));
        return { rows: document.querySelectorAll('.phc-ep-road .phc-ep-step').length, perks: document.querySelectorAll('.phc-ep-perks .phc-perk-row').length, wraps, wide: box ? box.scrollWidth > box.clientWidth + 1 : true }; });
      await p.screenshot({ path: OUTD + '/' + file });
      ok(w + 'x' + h + ' ' + id + ': ten level rows, ' + look.perks + ' perk rows, nothing cut sideways' + (w === 1280 ? ', no perk or fork row wraps (' + look.wraps.join(', ') + ')' : ''), look.rows === 10 && look.perks >= 2 && !look.wide && (w !== 1280 || look.wraps.length === 0));
      done.push(file);
      await folds(p, false); await foldsAre(p, false);
      await p.getByRole('button', { name: 'Close the EPCCG entry' }).click(); await settle(p, 200);
    } catch (e) {
      ok(w + 'x' + h + ' ' + id + ': ' + String(e.message).split('\n')[0], false);
      await p.keyboard.press('Escape').catch(() => {}); await settle(p, 200);
    }
  }
}
writeFileSync(OUTD + '/index.md', '# Skill "?" pages, the three folds open\n\n' + done.map((f) => '- ' + f).join('\n') + '\n');
ok('captured ' + done.length + ' of ' + ids.length * 2, done.length === ids.length * 2);

// ---------- Part 2: the final shots ----------
const finals = [];
const shoot = async (pg, name, w) => { await pg.mouse.move(w - 4, 4); await settle(pg, 250); const f = name + '-' + w + '.png'; await pg.screenshot({ path: FINAL + '/' + f }); finals.push(f); return f; };
const beta = ids.find((x) => slotOf[x] === 'beta'), alpha = ids.find((x) => slotOf[x] === 'alpha'), gamma = ids.find((x) => slotOf[x] === 'gamma');
for (const [w, h] of SIZES) {
  await p.setViewportSize({ width: w, height: h }); await settle(p, 300);
  await p.evaluate(() => window.scrollTo(0, 0));
  ok(w + ': creation\'s Skills step (' + await shoot(p, 'creation-skills', w) + ')', true);
  for (const [id, tag, open] of [[beta, 'beta', false], [beta, 'beta-open', true], [alpha, 'alpha', false], [gamma, 'gamma', false]]) {
    await p.locator('[data-skill="' + id + '"] [data-skill-face]').click(); await p.locator('.phc-ep-lore').waitFor({ timeout: 30000 });
    await folds(p, open); await foldsAre(p, open);
    ok(w + ': the ' + tag + ' "?" page (' + id + ', folds ' + (open ? 'open' : 'closed') + ') ' + await shoot(p, 'skill-' + tag + '-' + id, w), true);
    await folds(p, false); await foldsAre(p, false);
    await p.getByRole('button', { name: 'Close the EPCCG entry' }).click(); await settle(p, 200);
  }
}
await p.context().close();

// the Proving Ground: one character, set up by the playtest tools, for the level-up, workshop and Faith shots
const q = await player(browser, 'B');
await openGround(q, 'Leon');
const act = (a) => q.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const cid = await q.evaluate(() => Object.keys(window.__phc.getState().game.characters)[0]);
const toLevelUp = async () => { await q.locator('button', { hasText: /Level up|Earn your class/ }).first().click(); await q.locator('.phc-lu-core').first().waitFor({ timeout: 30000 }); await settle(q, 300); };
const leaveLevelUp = async () => { await q.locator('button.phc-lu-later').click(); await q.waitForFunction(() => !document.querySelector('.phc-lu-core'), null, { timeout: 30000 }); await settle(q, 300); };
// three choices waiting: level 3 with no class yet, Durability 4 (a fork and a perk step), Dexterity 3 (a perk step)
for (const a of [{ type: 'sandbox/class', charId: cid, classId: null }, { type: 'sandbox/level', charId: cid, level: 3 }, { type: 'sandbox/skill', charId: cid, skill: 'durability', points: 4 }, { type: 'sandbox/skill', charId: cid, skill: 'dexterity', points: 3 }]) { const e = await act(a); if (e) ok('playtest tool ' + a.type + ': ' + e, false); }
await settle(q, 400);
await toLevelUp();
for (const [w, h] of SIZES) {
  await q.setViewportSize({ width: w, height: h }); await settle(q, 300);
  const chips = await q.locator('.phc-lu-tochoose .phc-lu-tc').evaluateAll((bs) => bs.map((b) => b.getAttribute('data-kind')));
  ok(w + ': three or more choices waiting in the strip, Class first (' + chips.join(', ') + ') ' + await shoot(q, 'levelup-three-waiting', w), chips.length >= 3 && chips[0] === 'class');
  // item B (0.31.11): the label whole and outside the scroller, every shown chip whole inside the strip, the strip clear
  // of the MAX HP chip, and the chips that do not fit counted on '+N more' (a fail at 1280 is a fail of the suite)
  const strip = await q.evaluate(() => {
    const r = (e) => e && e.getBoundingClientRect(), lab = document.querySelector('.phc-lu-tc-label'), box = document.querySelector('.phc-lu-tc-scroll'), hp = document.querySelector('.phc-lu-hp'), more = document.querySelector('.phc-lu-tc-more'), all = document.querySelector('.phc-lu-tochoose');
    const L = r(lab), B = r(box), H = r(hp), A = r(all), bad = [];
    if (!L || !B || !H || !A) return { bad: ['missing piece'], hidden: 0, more: '' };
    if (box.contains(lab)) bad.push('label inside the scroller');
    if (lab.scrollWidth > lab.clientWidth + 1 || L.left < A.left - 0.5 || L.right > B.left + 0.5) bad.push('label clipped');
    const chips = [...box.querySelectorAll('.phc-lu-tc')], shown = chips.filter((b) => getComputedStyle(b).visibility !== 'hidden');
    for (const b of shown) { const c = r(b); if (c.left < B.left - 0.5 || c.right > B.right + 0.5 || b.scrollWidth > b.clientWidth + 1) bad.push('chip cut: ' + b.textContent.trim()); }
    if (A.right > H.left + 0.5 || (more && r(more).right > H.left + 0.5)) bad.push('strip under the MAX HP chip');
    const hidden = chips.length - shown.length;
    if (hidden && more && shown.length) { const g = r(more).left - r(shown[shown.length - 1]).right; if (g > 10) bad.push('a gap of ' + Math.round(g) + ' px before +N more'); }
    if (hidden && (!more || !more.textContent.includes('+' + hidden + ' more'))) bad.push('hidden chips with no +N more');
    return { bad, hidden, more: more ? more.textContent.trim() : '' };
  });
  ok(w + ': the TO CHOOSE strip: label whole, chips whole, clear of MAX HP' + (strip.hidden ? ', ' + strip.more : '') + (strip.bad.length ? ' (' + strip.bad.join('; ') + ')' : ''), strip.bad.length === 0);
  // a chip that does not fit is counted on '+N more', which opens the first hidden choice (item B)
  { const pc = q.locator('.phc-lu-tc[data-kind="perk"]').first(); if (await pc.isVisible()) await pc.click(); else await q.locator('.phc-lu-tc-more').click(); }
  await q.locator('.phc-lu-chooser[data-chooser="perk"]').waitFor({ timeout: 30000 });
  const cw = await q.evaluate(() => [...document.querySelectorAll('.phc-lu-chooser .phc-perk-row')].filter((r) => [...r.querySelectorAll('.phc-perk-t1, .phc-perk-t2, .phc-perk-name')].some((c) => c.getBoundingClientRect().height > (parseFloat(getComputedStyle(c).lineHeight) || 20) * 1.5)).map((r) => r.getAttribute('data-perk')));
  ok(w + ': a perk step chooser open, its rows one line each (' + cw.join(', ') + ') ' + await shoot(q, 'levelup-perk-chooser', w), (await q.locator('.phc-lu-chooser .phc-perk-row').count()) >= 2 && (w !== 1280 || cw.length === 0));
  await q.locator('.phc-lu-tc[data-kind="fork"]').first().click(); await q.locator('.phc-lu-chooser[data-chooser="fork"]').waitFor({ timeout: 30000 });
  ok(w + ': a fork chooser open ' + await shoot(q, 'levelup-fork-chooser', w), (await q.locator('.phc-lu-chooser [data-fork-opt]').count()) === 2);
  await q.locator('.phc-lu-ch-close').click(); await q.waitForFunction(() => !document.querySelector('.phc-lu-chooser'), null, { timeout: 30000 });
}
await leaveLevelUp();
// nothing open: a class held, the skills set where no step waits
await act({ type: 'sandbox/class', charId: cid, classId: 'marksman', rank: 1 });
await act({ type: 'sandbox/skill', charId: cid, skill: 'durability', points: 0 }); await act({ type: 'sandbox/skill', charId: cid, skill: 'dexterity', points: 2 });
await act({ type: 'sandbox/level', charId: cid, level: 4 }); await settle(q, 300);
await toLevelUp();
for (const [w, h] of SIZES) { await q.setViewportSize({ width: w, height: h }); await settle(q, 300); ok(w + ': the level-up screen, nothing open (' + (await q.locator('.phc-lu-chooser').count()) + ' panels) ' + await shoot(q, 'levelup-nothing-open', w), (await q.locator('.phc-lu-chooser').count()) === 0); }
await leaveLevelUp();
// the Outburst workshop's ways row (a Damage design being made) and the Faith tab
await act({ type: 'sandbox/kit', charId: cid, kind: 'soul' }); await act({ type: 'sandbox/learn', charId: cid, school: 'damage' });
await act({ type: 'sandbox/faith', charId: cid, belief: 'faithful', patron: 'mother_ember', faith: 5, devotion: 5, reset: true }); await settle(q, 400);
const tab = async (name) => { const t = q.locator('[role="tab"]', { hasText: new RegExp('^' + name, 'i') }).first(); await t.click(); await settle(q, 300); };
for (const [w, h] of SIZES) {
  await q.setViewportSize({ width: w, height: h }); await settle(q, 300);
  await tab('MAGIC');
  if (!(await q.locator('.phc-mg-ways').count())) { await q.locator('button', { hasText: '+ NEW DESIGN' }).first().click(); await q.locator('.phc-mg-ways').waitFor({ timeout: 30000 }); }
  await q.locator('.phc-mg-ways').scrollIntoViewIfNeeded();
  ok(w + ': the Outburst workshop\'s ways row (' + await q.locator('.phc-mg-ways [data-way]').count() + ' ways) ' + await shoot(q, 'workshop-ways', w), (await q.locator('.phc-mg-ways [data-way]').count()) >= 2);
  await tab('FAITH');
  const wh = q.getByText('WHISPERS', { exact: true }).first(); await wh.waitFor({ timeout: 30000 }); await wh.scrollIntoViewIfNeeded();
  ok(w + ': the Faith tab, its Whispers in view ' + await shoot(q, 'faith-tab', w), await wh.isVisible());
}
writeFileSync(FINAL + '/index.md', '# Final shots, 0.31.11\n\n' + finals.map((f) => '- ' + f).join('\n') + '\n');
ok('final shots: ' + finals.length, finals.length >= 22);
ok('no page errors' + (q.errors.length ? ': ' + q.errors.join(' | ') : ''), !q.errors.length);
await browser.close();
