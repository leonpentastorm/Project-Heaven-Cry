import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
export const BASE = process.env.BASE || 'http://127.0.0.1:8787';
export const OUT = new URL('./shots/', import.meta.url).pathname;
export async function player(browser, name) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ignoreHTTPSErrors: true });
  // The Narrator's voice holds new lines until it is ready; tests read the text, so they start with auto-read off (and no tips).
  await ctx.addInitScript((voice) => { try { if (!voice) localStorage.setItem('phc.voice', JSON.stringify({ auto: false })); localStorage.setItem('phc.tips', '["*"]'); } catch { /* */ } }, !!process.env.VOICE);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Permissions policy violation/.test(m.text())) errors.push('console: ' + m.text()); });
  page.errors = errors; page.pname = name;
  return page;
}
export const click = async (page, text, opts = {}) => { const b = page.getByRole('button', { name: text, exact: !!opts.exact }).first(); await b.waitFor({ timeout: opts.timeout || 8000 }); await b.click(); };
export const shot = (page, n) => page.screenshot({ path: OUT + n + '.png', fullPage: !!0 });
export async function makeCharacter(page, name, archFamily, archName, kit) {
  await click(page, 'Make a character');
  await page.getByPlaceholder('What the squad calls you').fill(name);
  await page.locator('button:has-text("Thousand-Planet")').first().click().catch(async () => { await page.locator('[aria-pressed]').nth(0).click(); });
  await click(page, 'Next ›');
  if (archFamily) await click(page, archFamily, { exact: true });
  if (archName) await page.locator('button', { hasText: archName }).first().click();
  await page.locator('button', { hasText: /^Use .* ›$/ }).first().click();
  await click(page, 'Next ›'); // traits
  await click(page, 'Next ›'); // kit
  await page.locator('button', { hasText: kit }).first().click();
  await click(page, 'Next ›'); // lock in
}
const launch = chromium.launch.bind(chromium);
chromium.launch = (o = {}) => launch({ ...o, ...(process.env.BASE && process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {}) });
export { chromium };
