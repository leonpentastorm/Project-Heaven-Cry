import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
export const BASE = process.env.BASE || 'http://127.0.0.1:8787';
export const OUT = new URL('./shots/', import.meta.url).pathname;
export async function player(browser, name) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ignoreHTTPSErrors: true, deviceScaleFactor: Number(process.env.DSF) || 1 }); // DSF=2: sharper screenshots
  // The Narrator's voice holds new lines until it is ready; tests read the text, so they start with auto-read off (and no tips).
  await ctx.addInitScript((voice) => { try { if (!voice) localStorage.setItem('phc.voice', JSON.stringify({ auto: false })); localStorage.setItem('phc.tips', '["*"]'); sessionStorage.setItem('phc.pressedAnyKey', '1'); } catch { /* */ } }, !!process.env.VOICE);
  // FAST=1: a fight plays every effect in order at about 25 times the speed (game/combatSpeed.ts 'test'). For suites
  // that check rules and screens, not animation; the animation suites (melee-fx, brass, reload, cutins, clarity,
  // turn-order, combat-speed) run without it.
  if (process.env.FAST) await ctx.addInitScript(() => { try { localStorage.setItem('phc.combatSpeed', 'test'); } catch { /* */ } });
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
export const click = async (page, text, opts = {}) => { const b = page.getByRole('button', { name: text, exact: !!opts.exact }).first(); await b.waitFor({ timeout: opts.timeout || 30000 }); await b.click(); }; // (30 s: a wait only costs time when the button never comes; the title can take 10 s to load beside two other suites)
/** Click a combat action by its button name (string or RegExp). The actions live in tabs (Move · Attack · Utility ·
 *  Sigils · Outbursts) and only the open tab's buttons are on the page, so this flips to the tab that holds it first. */
export async function pickAction(page, name, opts = {}) {
  const btn = () => page.locator('[role="tabpanel"]').getByRole('button', { name, exact: !!opts.exact }).first();
  // The action panel is yours only when the other turns (and a Miracle's hold) have played out on screen: wait for
  // it as a player does, instead of clicking a panel that isn't up or is still locked.
  await page.waitForFunction(() => { const d = document.querySelector('.phc-cb-dock'); return !!d && !d.getAttribute('data-lock') && !!document.querySelector('[role="tablist"][aria-label="Actions"] [role="tab"]'); }, null, { timeout: opts.wait ?? opts.timeout ?? 60000 }).catch(() => {});
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
/** The game asks in its own dialog (game/dialog.tsx, never the browser's confirm): answer every ask on this page with
 *  its primary button, as page.on('dialog', d => d.accept()) did for the browser's. */
export async function autoConfirm(page) {
  const f = () => {
    if (window.__phcAutoConfirm) return; window.__phcAutoConfirm = true;
    const go = () => { const d = document.querySelector('[data-phc-dialog] [role="alertdialog"]'); if (d && !d.__auto) { d.__auto = true; setTimeout(() => { const b = d.querySelectorAll('button'); if (b.length) b[b.length - 1].click(); }, 60); } };
    new MutationObserver(go).observe(document, { childList: true, subtree: true }); go();
  };
  await page.addInitScript(f); await page.evaluate(f).catch(() => {});
}
/** Answer the game's own dialog now on screen: type the text (an askText), then press its primary button. */
export async function answerAsk(page, text) {
  const d = page.locator('[data-phc-dialog] [role="alertdialog"]');
  await d.waitFor({ timeout: 5000 });
  if (text != null) await d.locator('textarea, input').first().fill(text);
  await d.locator('button').last().click();
}

// ---------- waiting without a stopwatch (apps/web/e2e/README.md, "A suite that does not flake") ----------
/** Wait until `fn` (run in the page, with `arg`) returns something truthy, and return it. THE way to wait: name the
 *  state you are waiting for. It throws after `timeout` ms (default 15 s; generous on purpose: it only costs time when
 *  the thing never comes, and then the suite is red for a reason). */
export async function until(page, fn, arg, timeout = 15000) { return (await page.waitForFunction(fn, arg, { timeout })).jsonValue(); }
/** Has the fight on this page played everything the engine sent it (every effect taken up and played, no timer
 *  waiting, no cut-in up, the other turns shown)? Run inside the page. */
const FX_IDLE = () => {
  const g = window.__phc?.getState?.().game, cb = g && g.phase === 'combat' ? g.combat : null, d = window.__phcFxDebug?.();
  if (!d) return true;
  if (document.querySelector('[data-phc-cutin], [data-phc-cut]')) return false;
  if (d.timers > 0 || d.queueEndIn > 0 || d.heldBehindGate || d.gateShowing) return false;
  if (!cb) return true;
  return (window.__phcHold?.() || 0) <= performance.now() + 5;
};
/** Wait until the fight's effects have all played and the input hold is over (the screen has caught up with the
 *  state). Use it after an action in a fight in place of a sleep. False when it didn't happen in `timeout` ms. */
export async function fxIdle(page, timeout = 30000) { return page.waitForFunction(FX_IDLE, null, { timeout, polling: 30 }).then(() => true, () => false); }
/** Wait for the page to go QUIET after a click, a key or an action, in place of `waitForTimeout(ms)`.
 *  It waits `ms` on the PAGE's own clock (a timer in the page: the page's own shorter timers always run before it, so
 *  a busy machine stretches both alike, which a sleep in this script does not), then until the effects queue has
 *  nothing left to play and two frames have passed with nothing added to or taken from the page. It never throws: after `ms` + `cap`
 *  it returns anyway, and the check that follows says what is wrong.
 *  Prefer `until(page, () => <the state you wait for>)` whenever you can name the state. */
export async function settle(page, ms = 0, cap = 3000) {
  await page.evaluate(async ({ ms, cap }) => {
    // (the effects queue only: a cut-in on screen or the turn hold is not waited out here; fxIdle() does that)
    const fxIdle = () => { const d = window.__phcFxDebug?.(); return !d || !(d.timers > 0 || d.queueEndIn > 0 || d.heldBehindGate); };
    const sleep = (t) => new Promise((r) => setTimeout(r, t));
    // (a frame, or 50 ms where the page gets no frames)
    const frame = () => new Promise((r) => { let done = false; const go = () => { if (!done) { done = true; r(); } }; requestAnimationFrame(go); setTimeout(go, 50); });
    if (ms > 0) await sleep(ms);
    let dirty = false; const mo = new MutationObserver(() => { dirty = true; }); mo.observe(document.body, { childList: true, subtree: true });
    const t0 = performance.now(); let quiet = 0;
    while (quiet < 2 && performance.now() - t0 < cap) { dirty = false; await frame(); quiet = !dirty && fxIdle() ? quiet + 1 : 0; }
    mo.disconnect();
  }, { ms, cap }).catch(() => {}); // (the page navigated or closed under us: nothing to wait for)
}
/** Wait `ms` on the PAGE's own clock and nothing more (no waiting for quiet): for a suite that looks at an animation
 *  part-way through. A timer in the page runs after every shorter timer the page set before it, so "600 ms after the
 *  click" still means "after everything the game planned for the first 600 ms" on a busy machine; a sleep in this script
 *  (page.waitForTimeout) promises nothing of the kind, and is not to be used. */
export async function pause(page, ms) {
  const t0 = Date.now();
  const ran = await page.evaluate((ms) => new Promise((r) => setTimeout(() => r(true), ms)), ms).catch(() => false);
  // (the page reloaded or closed under the timer: wait the rest out here)
  if (!ran && !page.isClosed()) await new Promise((r) => setTimeout(r, Math.max(0, ms - (Date.now() - t0))));
}
/** A stopwatch IN the page, for the few checks where a length of time IS the thing under test: it notes (on the page's
 *  own performance.now()) when something matching `sel` is first on the page and when it is gone again. Start it BEFORE
 *  the click that brings the thing up. Read it with watched(). Why in the page: this script learns of a change one
 *  round trip late, and on a busy machine a round trip can take a second; the page's own clock is what the player saw.
 *  And when you assert on it: a timer never fires EARLY, so the lower bound can be exact; the upper bound must leave
 *  room for a busy machine (twice the plan plus a second or two), and a comment must say that it does. */
export const watch = (page, name, sel) => page.evaluate(({ name, sel }) => {
  const W = (window.__e2eWatch ||= {}); if (W[name]) W[name].mo.disconnect();
  const w = (W[name] = { up: null, down: null, mo: null });
  const look = () => { const on = !!document.querySelector(sel), now = performance.now(); if (on && w.up == null) w.up = now; else if (!on && w.up != null && w.down == null) w.down = now; };
  w.mo = new MutationObserver(look); w.mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true }); look();
}, { name, sel });
/** What watch() saw: { up, down, ms (how long it was on the page; null while it still is, or never was), now }. */
export const watched = (page, name) => page.evaluate((name) => { const w = window.__e2eWatch?.[name]; return w ? { up: w.up, down: w.down, now: performance.now(), ms: w.up != null && w.down != null ? Math.round(w.down - w.up) : null } : null; }, name);
/** Wait until what watch() watches has come and gone (or `timeout`), and return watched(). */
export async function watchedGone(page, name, timeout = 30000) { await page.waitForFunction((name) => { const w = window.__e2eWatch?.[name]; return !!w && w.down != null; }, name, { timeout }).catch(() => {}); return watched(page, name); }
/** Start recording the effects layer's own trace (apps/web/src/game/fx/dom.ts trace()): what was drawn and heard, with
 *  `t`, the time the PLAN gave it (the same on a busy machine), and `rt`, when it ran. Judge the ORDER and the PRESENCE
 *  of effects from `t`; never from a stopwatch in this script. */
export const traceStart = (page) => page.evaluate(() => { window.__phcFxTrace = []; });
/** The trace so far (and stop recording unless `keep`). */
export const traceTake = (page, keep) => page.evaluate((keep) => { const t = window.__phcFxTrace || []; if (!keep) window.__phcFxTrace = null; return t; }, !!keep);
/** Open the Proving Ground alone from the title and wait until it is ready (gearing up). */
export async function openGround(page, name = 'Leon') {
  await page.goto(BASE);
  await click(page, 'PROVING GROUND', { timeout: 90000 });
  const nm = page.getByPlaceholder('Leon');
  await Promise.race([nm.waitFor({ timeout: 15000 }).catch(() => {}), page.waitForFunction(() => !!window.__phc?.getState().game?.sandbox, null, { timeout: 15000 }).catch(() => {})]);
  if (await nm.count()) { await nm.fill(name); await click(page, 'Solo ›'); }
  await page.waitForFunction(() => window.__phc.getState().game?.sandbox?.state === 'ready', null, { timeout: 30000 });
}
