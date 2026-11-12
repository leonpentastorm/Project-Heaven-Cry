// Combat portraits (Leon, 9 Nov 2026), in a Proving Ground fight:
//  1. "Combat screen target picture is now blacked for some of them (drill drone)": every enemy kind (the four drill
//     tiers, the Sigil and Heart casters, a beast, a machine, a turret, a Narrator-placed NPC with an avatar, an uploaded
//     portrait) is targeted in turn; the TARGET card's picture is a loaded image that is not black (pixels sampled on a
//     canvas) and the same face its token draws, or, for a thing with no art, the token's initials.
//  2. "Remove backpack button next to your AP bar, extend the backpack button next to your name instead": the unit card
//     has one labelled Backpack button (aria-pressed, key B) and the AP bar none.
//  3. "The cut in animation uses some random character's profile instead even though i just got a crit as the recruit":
//     a real crit by the recruit (the next d20 set to a natural 20) cuts in with the recruit's own picture (the HUD's),
//     shown whole; a crit by a companion drone cuts in with the drone's own face.
// Screens in e2e/shots/combat-polish/ (DSF=2 for sharper copies).
import { mkdirSync } from 'fs';
import { chromium, player, click, BASE, OUT, pause } from './lib.mjs';
const DIR = OUT + 'combat-polish/'; mkdirSync(DIR, { recursive: true });
const browser = await chromium.launch();
const p = await player(browser, 'host');
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const snap = (n, clip) => p.screenshot({ path: DIR + n + (Number(process.env.DSF) > 1 ? '@2x' : '') + '.png', ...(clip ? { clip } : {}) });
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const settle = async () => { await p.waitForFunction(() => (window.__phcHold?.() || 0) <= performance.now() + 5 && !window.__phcCutin?.showing, null, { timeout: 20000 }).catch(() => {}); await pause(p, 150); };
const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };
function next(r) { let t = (r.state = (r.state + 0x6d2b79f5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const nat20 = (skip = 0) => { for (let s = 1; s < 1e7; s++) { const r = { state: s }; if (1 + Math.floor(next(r) * 20) === 20 && skip-- <= 0) return s; } return 1; };

await p.setViewportSize({ width: 1440, height: 900 });
await p.goto(BASE);
await click(p, 'PROVING GROUND');
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 20000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 20000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, 'Solo ›'); }
await p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 30000 });
const meChar = await p.evaluate(() => { const g = window.__phc.getState().game, me = window.__phc.getState().me.id; return Object.values(g.characters).find((c) => c.owner === me).id; });
await act({ type: 'sandbox/give', charId: meChar, item: 'hellraiser_service_rifle', equip: true });
// A combat drone companion with its own face, and a beast with none (rules 1.3: they fight beside their owner).
await p.evaluate((id) => { const c = window.__phc.getState().game.characters[id]; c.companions = [{ id: 'd1', kind: 'drone', name: 'Combat drone', img: 'char-m813-scavenger-drone' }, { id: 'b1', kind: 'beast', name: 'Grey hound' }]; }, meChar);
await act({ type: 'sandbox/ai', on: false }); await act({ type: 'sandbox/fight' });
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 30000 });
await pause(p, 2400);
for (let i = 0; i < 3 && (await p.locator('[data-phc-cutin]').count()); i++) { await p.mouse.click(1430, 880); await pause(p, 380); }
await settle();
const cur = () => p.evaluate(() => { const cb = window.__phc.getState().game.combat; return cb && cb.units.find((x) => x.id === cb.order[cb.turn]); });
async function turnOf(test) { for (let i = 0; i < 40; i++) { await settle(); const u = await cur(); if (u && test(u)) return u; if (u) await act({ type: 'combat/end-turn', unitId: u.id }); await pause(p, 250); } return null; }
const recruitTurn = () => turnOf((u) => u.charId === meChar);
const comps = await p.evaluate(() => window.__phc.getState().game.combat.units.filter((u) => u.companion).map((u) => ({ id: u.id, name: u.name, img: u.img || '' })));
ok('the companions joined the fight: ' + comps.map((c) => c.name + (c.img ? ' (' + c.img + ')' : '')).join(', '), comps.length === 2 && comps.some((c) => c.img === 'char-m813-scavenger-drone'));

// ---------- 1. every enemy kind on the TARGET card ----------
let me = await recruitTurn();
ok('the recruit\'s turn', !!me);
const free = await p.evaluate(() => { const cb = window.__phc.getState().game.combat, m = cb.map, out = [];
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { const k = x + ',' + y; if ((m.solid || []).includes(k) || cb.units.some((u) => !u.dead && u.pos === k) || (cb.objects || []).some((o) => o.pos === k)) continue; out.push(k); }
  const me = cb.units.find((u) => u.id === cb.order[cb.turn]), [mx, my] = me.pos.split(',').map(Number);
  return out.map((k) => { const [x, y] = k.split(',').map(Number); return [k, Math.abs(x - mx) + Math.abs(y - my)]; }).filter(([, d]) => d >= 2).sort((a, b) => a[1] - b[1]).map(([k]) => k); });
const SPAWN = [
  { tier: 'minion', weapon: 'service_pistol' }, { tier: 'soldier', weapon: 'service_pistol' }, { tier: 'elite', weapon: 'service_pistol' }, { tier: 'boss', weapon: 'service_pistol' },
  { tier: 'minion', caster: 'sigil_novice' }, { tier: 'soldier', caster: 'sigil_adept' }, { tier: 'elite', caster: 'sigil_warden' }, { tier: 'boss', caster: 'sigil_magister' },
  { tier: 'soldier', caster: 'heart_adept' }, { tier: 'elite', caster: 'heartfire_elite' }, { tier: 'boss', caster: 'heart_sovereign' },
  { tier: 'minion', weapon: 'fists', name: 'Grey hound', kind: 'beast' }, { tier: 'soldier', weapon: 'service_pistol', name: 'Loader frame', kind: 'machine', img: 'char-m813-hum' },
  { tier: 'minion', weapon: 'service_pistol', name: 'Sentry turret', kind: 'turret' },
  { tier: 'soldier', weapon: 'service_pistol', name: 'Quartermaster Ilse', img: 'char-m813-ilse-varga' }, // a Narrator NPC with an avatar (an art library name)
  { tier: 'soldier', weapon: 'service_pistol', name: 'Rook', img: '/assets/char-m813-rook.webp' }, // a URL
  { tier: 'elite', weapon: 'service_pistol', name: 'Upload', img: 'upload' }, // an uploaded portrait (a data: URL)
];
const upload = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 64; c.height = 80; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 64, 80); g.addColorStop(0, '#E3BF51'); g.addColorStop(1, '#5394AC'); x.fillStyle = g; x.fillRect(0, 0, 64, 80); x.fillStyle = '#F6F0E0'; x.beginPath(); x.arc(32, 30, 14, 0, 7); x.fill(); return c.toDataURL('image/jpeg', 0.9); });
const spawned = [];
for (const s of SPAWN) {
  const at = free.shift(); if (!at) break;
  const before = await p.evaluate(() => window.__phc.getState().game.combat.units.map((u) => u.id));
  const e = await act({ type: 'sandbox/spawn', tier: s.tier, weapon: s.weapon || '', at: ref(at), ...(s.name ? { name: s.name } : {}), ...(s.caster ? { caster: s.caster } : {}) });
  if (e) { ok('spawn ' + (s.name || s.caster || s.tier) + ': ' + e, false); continue; }
  const id = await p.evaluate(([before, s, upload]) => { const cb = window.__phc.getState().game.combat, u = cb.units.find((x) => !before.includes(x.id));
    if (s.kind) u.kind = s.kind; if (s.img) u.img = s.img === 'upload' ? upload : s.img; u.hp = u.maxHp = 999; cb.sighted = [...new Set([...(cb.sighted || []), u.id])]; return u.id; }, [before, s, upload]);
  spawned.push({ id, ...s });
}
me = await recruitTurn();
const pickAttack = async () => { const tabs = p.locator('[role="tablist"][aria-label="Actions"] [role="tab"]'); for (let i = 0; i < await tabs.count(); i++) { await tabs.nth(i).click(); const b = p.locator('[role="tabpanel"] button', { hasText: /^Analyze/ }).first(); if (await b.count()) { await b.click(); return true; } } return false; };
ok('Analyze picked (the TARGET card shows for it)', await pickAttack());
const results = [];
for (const s of spawned) {
  const u = await p.evaluate((id) => window.__phc.getState().game.combat.units.find((x) => x.id === id), s.id);
  // Click its token on the grid (by its tile's aria-label, which names the unit).
  const tile = p.locator('button.phc-tok[aria-label*="· ' + u.name.replace(/"/g, '') + ' ("]').first();
  if (!(await tile.count())) { ok(u.name + ': its token is on the grid', false); continue; }
  await tile.click(); await pause(p, 180);
  const card = p.locator('[aria-label="Target"]').first();
  const info = await card.evaluate(async (el) => {
    const img = el.querySelector('img[data-target-face="img"]'), badge = el.querySelector('[data-target-face="badge"]');
    const name = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!img) return { name, badge: badge ? badge.textContent : null };
    if (!img.complete) await new Promise((r) => { img.onload = img.onerror = r; setTimeout(r, 3000); });
    let mean = -1, dark = -1;
    try { const c = document.createElement('canvas'); c.width = 20; c.height = 25; const x = c.getContext('2d'); x.drawImage(img, 0, 0, 20, 25); const d = x.getImageData(0, 0, 20, 25).data; let s = 0, k = 0; for (let i = 0; i < d.length; i += 4) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3; s += l; if (l < 12) k++; } mean = s / (d.length / 4); dark = k / (d.length / 4); } catch { /* */ }
    return { name, src: img.getAttribute('src'), w: img.naturalWidth, mean, dark };
  });
  const tokSrc = await tile.locator('img').first().getAttribute('src').catch(() => null);
  const tokBadge = (await tile.textContent().catch(() => '')) || '';
  results.push({ who: u.name, ...info });
  if (info.src != null) ok(u.name + ': the TARGET card shows ' + info.src.slice(0, 48) + ' (' + info.w + ' px wide, mean light ' + Math.round(info.mean) + ', ' + Math.round(info.dark * 100) + '% black) = its token\'s',
    info.w > 0 && info.mean > 18 && info.dark < 0.6 && info.src === tokSrc && !/^char-|^\w[\w-]+$/.test(info.src));
  else ok(u.name + ': no art, so the TARGET card shows the token\'s initials "' + info.badge + '"', !!info.badge && !tokSrc && tokBadge.includes(info.badge));
  if (['Drill drone 1', 'Sentry turret', 'Upload', 'Grey hound'].includes(u.name) || /^Drill drone/.test(u.name) && !results.some((r) => /^Drill drone/.test(r.who) && r !== results.at(-1))) {
    const box = await card.boundingBox(); if (box) await snap('target-' + u.name.toLowerCase().replace(/\W+/g, '-'), { x: box.x - 8, y: box.y - 8, width: box.width + 16, height: box.height + 16 });
  }
}
ok('every enemy kind targeted (' + results.length + ' of ' + spawned.length + ')', results.length === spawned.length && spawned.length === SPAWN.length);
await snap('target-card-panel');
// The initiative bar keeps an unseen hostile's face and initials to itself, as the turn card does (review fix).
{
  const unseen = await p.locator('[data-init]').evaluateAll((els) => els.filter((el) => /Unseen hostile/.test(el.textContent || '')).map((el) => ({ img: el.querySelector('img')?.getAttribute('src') || null, text: (el.textContent || '').replace(/\s+/g, ' ').trim() })));
  if (unseen.length) ok('the initiative bar shows no face for an unseen hostile, only "?": ' + JSON.stringify(unseen.slice(0, 3)), unseen.every((x) => !x.img && /^\?/.test(x.text)));
  else console.log('note: no unseen hostile in the initiative bar this run');
  const bar = await p.locator('[aria-label="Initiative order"]').first().boundingBox(); if (bar) await snap('initiative-unseen', { x: bar.x, y: bar.y, width: Math.min(bar.width, 1440 - bar.x), height: bar.height });
}

// ---------- 2. the Backpack button ----------
{
  const bps = await p.locator('[data-backpack]:visible').evaluateAll((els) => els.map((b) => ({ where: b.getAttribute('data-backpack'), text: (b.textContent || '').trim(), pressed: b.getAttribute('aria-pressed'), keys: b.getAttribute('aria-keyshortcuts'), inCard: !!b.closest('.phc-me-full') })));
  ok('one visible Backpack button, labelled, in your card beside your name: ' + JSON.stringify(bps), bps.length === 1 && bps[0].text === 'Backpack' && bps[0].inCard && bps[0].keys === 'B' && bps[0].pressed === 'false');
  ok('no backpack button by the ACTION POINTS bar', (await p.locator('.phc-cb-aplabel button').count()) === 0);
  const card = p.locator('.phc-me-full').first(); const box = await card.boundingBox();
  if (box) await snap('backpack-button', { x: box.x - 8, y: box.y - 8, width: box.width + 16, height: Math.min(box.height, 120) + 16 });
  await p.locator('[data-backpack]:visible').first().click(); await pause(p, 300);
  ok('it opens the backpack and shows pressed', (await p.locator('[data-bp-panel]').count()) === 1 && (await p.locator('[data-backpack]:visible').first().getAttribute('aria-pressed')) === 'true');
  await snap('backpack-open');
  await p.keyboard.press('b'); await pause(p, 250);
  ok('key B closes it', (await p.locator('[data-bp-panel]').count()) === 0);
  // A short window: the card folds into the one-line bar, which carries the same button.
  await p.setViewportSize({ width: 1440, height: 780 }); await pause(p, 400);
  const mini = await p.locator('[data-backpack]:visible').evaluateAll((els) => els.map((b) => b.getAttribute('data-backpack')));
  ok('a short window: the Backpack button rides in the one-line bar (' + mini.join(', ') + ')', mini.length === 1 && mini[0] === 'mini');
  const bar = await p.locator('.phc-cb-bar').first().boundingBox(); if (bar) await snap('backpack-button-short', { x: bar.x - 8, y: bar.y - 6, width: bar.width + 16, height: bar.height + 12 });
  // (review: the name and the AP were cut to 'Rec…' and 'A…' while 80 px stood empty; the bar now grows into it)
  for (const [w, h] of [[1440, 780], [1366, 768], [1280, 720]]) {
    await p.setViewportSize({ width: w, height: h }); await pause(p, 350);
    const cut = await p.evaluate(() => [...document.querySelectorAll('.phc-me-mini > span')].filter((s) => /\S/.test(s.textContent || '') && s.scrollWidth > s.clientWidth + 1).map((s) => (s.textContent || '').trim()));
    ok(w + '×' + h + ': the one-line bar shows your name and AP whole (cut: ' + JSON.stringify(cut) + ')', cut.length === 0);
  }
  await p.setViewportSize({ width: 1440, height: 900 }); await pause(p, 400);
}

// ---------- 3. the cut-in shows the one who acted ----------
const hudSrc = await p.locator('.phc-me-full img').first().getAttribute('src');
ok('the HUD shows the recruit\'s own picture: ' + hudSrc, /wick-narrator-placeholder/.test(hudSrc || ''));
let skip = 0;
async function critBy(test, target) {
  for (let tries = 0; tries < 8; tries++) {
    const u = await turnOf(test); if (!u) return null;
    if (u.ap < 3) { await act({ type: 'combat/end-turn', unitId: u.id }); continue; }
    const tid = await p.evaluate(([name, from]) => { const cb = window.__phc.getState().game.combat, [fx, fy] = from.split(',').map(Number);
      const t = cb.units.filter((x) => x.side === 'foe' && !x.dead).sort((a, b) => { const d = (v) => { const [x, y] = v.pos.split(',').map(Number); return Math.abs(x - fx) + Math.abs(y - fy); }; return d(a) - d(b); }).find((x) => !name || x.name === name);
      if (!t) return null; t.hp = t.maxHp = 999; t.armour = 0; return t.id; }, [target, u.pos]);
    if (!tid) return null;
    await p.evaluate((s) => { window.__phc.getState().game.rng.state = s; }, nat20(skip++));
    const err = await act({ type: 'combat/attack', unitId: u.id, targetId: tid, mode: 'shot' });
    if (err) { console.log('note ' + u.name + ': ' + err); await act({ type: 'combat/end-turn', unitId: u.id }); continue; }
    const strip = p.locator('[data-phc-spotlight="crit"] [data-phc-spotlight-face]').first();
    if (!(await strip.waitFor({ timeout: 30000 }).then(() => true, () => false))) continue;
    await p.locator('[data-phc-spotlight="crit"] [data-phc-spotlight-words]').first().waitFor({ timeout: 20000 }).catch(() => {});
    await pause(p, 450);
    const face = await strip.evaluate((el) => ({ kind: el.getAttribute('data-phc-spotlight-face'), href: el.getAttribute('href') || el.textContent }));
    const words = ((await p.locator('[data-phc-spotlight="crit"] [data-phc-spotlight-words]').first().textContent()) || '').replace(/\s+/g, ' ').trim();
    return { u, face, words };
  }
  return null;
}
await settle();
const rc = await critBy((u) => u.charId === meChar);
if (rc) await snap('cutin-crit-recruit');
ok('a crit by the recruit cuts in with the recruit\'s own picture, whole: ' + (rc && rc.face.kind + ' ' + rc.face.href) + ' (HUD ' + hudSrc + ')', !!rc && rc.face.kind === 'whole' && rc.face.href === hudSrc);
ok('and its words name the recruit: "' + (rc && rc.words) + '"', !!rc && /Recruit/.test(rc.words) && !/char-arch/.test(rc.face.href));
await settle(); await pause(p, 600);
const dc = await critBy((u) => u.companion === 'drone');
if (dc) await snap('cutin-crit-drone');
ok('a crit by the companion drone cuts in with the drone\'s own face: ' + (dc && dc.face.kind + ' ' + dc.face.href) + ' · "' + (dc && dc.words) + '"', !!dc && /char-m813-scavenger-drone/.test(dc.face.href) && /Combat drone/.test(dc.words) && !/Combat drone:/.test(dc.words));
await settle();
const errs = p.errors.filter((e) => !/Failed to load resource|favicon|net::ERR/.test(e));
ok('no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''), !errs.length);
await browser.close();
