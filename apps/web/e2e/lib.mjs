import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
export const BASE = process.env.BASE || 'http://127.0.0.1:8787';
export const OUT = new URL('./shots/', import.meta.url).pathname;
export async function player(browser, name) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ignoreHTTPSErrors: true, deviceScaleFactor: Number(process.env.DSF) || 1 }); // DSF=2: sharper screenshots
  // The Narrator's voice holds new lines until it is ready; tests read the text, so they start with auto-read off (and no tips).
  await ctx.addInitScript((voice) => { try { if (!voice) localStorage.setItem('phc.voice', JSON.stringify({ auto: false })); localStorage.setItem('phc.tips', '["*"]'); sessionStorage.setItem('phc.pressedAnyKey', '1'); } catch { /* */ } }, !!process.env.VOICE);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Permissions policy violation/.test(m.text())) errors.push('console: ' + m.text()); });
  page.errors = errors; page.pname = name;
  return page;
}
/** Host a room from the title screen: NEW GAME, then your name, then Open a room. */
export async function hostAs(page, name) {
  await page.goto(BASE);
  await page.getByRole('button', { name: 'NEW GAME', exact: true }).first().waitFor({ timeout: 90000 });
  await click(page, 'NEW GAME', { exact: true });
  await page.getByPlaceholder('Leon').fill(name);
  await click(page, 'Open a room ›');
}
export const click = async (page, text, opts = {}) => { const b = page.getByRole('button', { name: text, exact: !!opts.exact }).first(); await b.waitFor({ timeout: opts.timeout || 8000 }); await b.click(); };
/** Click a combat action by its button name (string or RegExp). The actions live in tabs (Move · Attack · Utility ·
 *  Sigils · Outbursts) and only the open tab's buttons are on the page, so this flips to the tab that holds it first. */
export async function pickAction(page, name, opts = {}) {
  const btn = () => page.locator('[role="tabpanel"]').getByRole('button', { name, exact: !!opts.exact }).first();
  if (!(await btn().count())) {
    const tabs = page.locator('[role="tablist"][aria-label="Actions"] [role="tab"]');
    const n = await tabs.count();
    for (let i = 0; i < n; i++) {
      await tabs.nth(i).click();
      if (await btn().waitFor({ timeout: 250 }).then(() => true, () => false)) break;
    }
  }
  await btn().click({ timeout: opts.timeout || 8000 });
}
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
  await click(page, 'Next ›'); // Belief (rules 1.6; not chosen: Atheist)
  await click(page, 'Next ›'); // kit
  await page.locator('button', { hasText: kit }).first().click();
  await click(page, 'Next ›'); // lock in
}
/** A BASE on this machine (127.0.0.1, localhost, ::1, or any 127.x address). */
export function isLoopback(base) {
  let host = '';
  try { host = new URL(base).hostname.toLowerCase(); } catch { return false; }
  host = host.replace(/^\[|\]$/g, '');
  return host === 'localhost' || host.endsWith('.localhost') || host === '::1' || /^127(\.\d{1,3}){3}$/.test(host);
}
// A remote BASE goes through HTTPS_PROXY when one is set (an agent sandbox's only way out). A loopback BASE never does:
// such a proxy only takes CONNECT to the outside, so a local wrangler dev page sent through it never loads.
const useProxy = !!(process.env.BASE && process.env.HTTPS_PROXY && !isLoopback(process.env.BASE));
const launch = chromium.launch.bind(chromium);
chromium.launch = (o = {}) => launch({ ...o, ...(useProxy ? { proxy: { server: process.env.HTTPS_PROXY, bypass: '<-loopback>' } } : {}) });
export { chromium };
