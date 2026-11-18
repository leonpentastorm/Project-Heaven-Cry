// Screenshots only: each skill's "?" page with WHAT EACH POINT GIVES open -> .check/capture/skills/<nn>-<id>.png
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
await p.setViewportSize({ width: 1600, height: 2800 });
await settle(p, 300);
const done = [];
let n = 0;
for (const id of ids) {
  n++;
  const nn = String(n).padStart(2, '0');
  try {
    await p.locator('[data-skill="' + id + '"] [data-skill-face]').click(); await settle(p, 350);
    await p.evaluate(() => { const f = document.querySelector('.phc-ep-fold'); if (f && f.getAttribute('aria-expanded') === 'false') f.click(); });
    await p.waitForTimeout(200);
    await p.screenshot({ path: OUTD + '/' + nn + '-' + id + '.png' });
    done.push(nn + '-' + id + '.png');
    await p.getByRole('button', { name: 'Close the EPCCG entry' }).click(); await settle(p, 200);
  } catch (e) {
    console.log('SKIP ' + id + ': ' + String(e.message).split('\n')[0]);
    await p.keyboard.press('Escape').catch(() => {}); await p.waitForTimeout(200);
  }
}
writeFileSync(OUTD + '/index.md', '# Skill "?" pages, point ladder open\n\n' + done.map((f) => '- ' + f).join('\n') + '\n');
ok('captured ' + done.length + ' of ' + ids.length, done.length > 0);
await browser.close();
