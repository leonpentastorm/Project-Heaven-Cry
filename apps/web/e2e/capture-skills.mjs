// Screenshots only: each skill's "?" page (the ladder open) at 1600x900 and 1280x720, from creation's Skills step ->
// .check/capture/skills/<w>-<nn>-<id>.png, for the lead's wording pass. One check a page: it opened, its ten level rows
// show, and nothing in it is cut sideways.
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { chromium, click, player, hostAs, settle, here } from './lib.mjs';
const OUTD = here('../../../.check/capture/skills', import.meta.url);
mkdirSync(OUTD, { recursive: true });
const skills = JSON.parse(readFileSync(here('../../../data/skills.json', import.meta.url), 'utf8'));
const ids = (skills.items || skills).filter((s) => ['alpha', 'beta', 'gamma'].includes(s.slot)).map((s) => s.id);
const browser = await chromium.launch();
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const p = await player(browser, 'A');
await hostAs(p, 'Leon');
await click(p, 'Create a character');
await p.getByPlaceholder('What the squad calls you').fill('Vess');
await p.getByRole('navigation', { name: 'Creation steps' }).getByRole('button', { name: 'Skills' }).click();
await settle(p, 300);
const done = [];
for (const [w, h] of [[1600, 900], [1280, 720]]) {
  await p.setViewportSize({ width: w, height: h }); await settle(p, 300);
  let n = 0;
  for (const id of ids) {
    n++;
    const file = w + '-' + String(n).padStart(2, '0') + '-' + id + '.png';
    try {
      await p.locator('[data-skill="' + id + '"] [data-skill-face]').click(); await settle(p, 350);
      await p.evaluate(() => { const f = document.querySelector('.phc-ep-fold'); if (f && f.getAttribute('aria-expanded') === 'false') f.click(); }); await p.mouse.move(w - 4, 4); await settle(p, 250); // the pointer off the icons (one under it grows on hover)
      const look = await p.evaluate(() => { const box = document.querySelector('[role="dialog"] article');
        return { rows: document.querySelectorAll('.phc-ep-road .phc-ep-step').length, wide: box ? box.scrollWidth > box.clientWidth + 1 : true }; });
      await p.screenshot({ path: OUTD + '/' + file });
      ok(w + 'x' + h + ' ' + id + ': ten level rows, nothing cut sideways (' + look.rows + ')', look.rows === 10 && !look.wide);
      done.push(file);
      await p.getByRole('button', { name: 'Close the EPCCG entry' }).click(); await settle(p, 200);
    } catch (e) {
      ok(w + 'x' + h + ' ' + id + ': ' + String(e.message).split('\n')[0], false);
      await p.keyboard.press('Escape').catch(() => {}); await settle(p, 200);
    }
  }
}
writeFileSync(OUTD + '/index.md', '# Skill "?" pages, the ladder open\n\n' + done.map((f) => '- ' + f).join('\n') + '\n');
ok('captured ' + done.length + ' of ' + ids.length * 2, done.length === ids.length * 2);
await browser.close();
