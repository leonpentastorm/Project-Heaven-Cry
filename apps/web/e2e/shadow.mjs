// Shadow and the Operative (rules 1.32; docs/design/shadow-spec.md section 1's worked example, in the Proving Ground):
//  · an Operative (Ingenuity 7) starts the fight with 1 Shadow: the meter row reads "Shadow 1 / 4" with its eye word;
//  · Fade (SHADOW tab; rules 1.60 item 4628: the Operative's Vanish makes it cost no Shadow): Hidden, the meter kept;
//    the turn ends Hidden with no attack: +1 Shadow;
//  · the SHADOW tab lists the door verbs; Read Intent on a Soldier that can't see you: the Soldier is Read;
//  · a shot with the Break toggle from Hidden: one `shadow` term on the preview, the meter spent, the shooter revealed.
// Every action through its real button, except the Break shot, sent as the attack card sends it (its toggle id in mods).
// Screenshots: e2e/shots/shadow-*.png.
import { chromium, player, click, BASE, OUT, settle, hostAs, lockIn } from './lib.mjs';
import { tipOf } from './lib.mjs';
import { readFileSync } from 'fs';
const FADE_SHADOW = JSON.parse(readFileSync(new URL('../../../data/shadow.json', import.meta.url), 'utf8')).items.find((x) => x.id === 'shadow.fade').effects[0].res.shadow; // rules 1.74 item 6011
const browser = await chromium.launch();
const host = await player(browser, 'host');
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const snap = (n) => host.screenshot({ path: OUT + 'shadow-' + n + '.png' });
const G = () => host.evaluate(() => window.__phc.getState().game);
const act = (a) => host.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };
const tok = (k) => host.locator('button.phc-tok[aria-label^="' + ref(k) + ' ·"]').first();
const dismissCut = async () => { for (let i = 0; i < 3; i++) { if (!(await host.locator('[data-phc-cutin]').count())) return; await host.mouse.click(1430, 990); await settle(host, 380); } };
// a token's drawn opacity (the portrait or the initials badge inside the tile button; game/tokenFade.ts)
const tokOpacity = (k) => host.evaluate((lab) => { const b = [...document.querySelectorAll('button.phc-tok')].find((e) => (e.getAttribute('aria-label') || '').startsWith(lab + ' ·')); if (!b) return null;
  const f = [...b.querySelectorAll('img, span')].find((e) => { const z = getComputedStyle(e).zIndex; return z === '2' && (e.tagName === 'IMG' || /50%|4px/.test(e.style.borderRadius)); }); return f ? Number(getComputedStyle(f).opacity) : null; }, ref(k));
let charId;
const me = async () => (await G()).combat.units.find((u) => u.charId === charId);
async function toMe() {
  for (let i = 0; i < 30; i++) {
    const cb = (await G()).combat, cur = cb.units.find((u) => u.id === cb.order[cb.turn]);
    if (cur && cur.charId === charId) { await dismissCut(); return true; }
    if (cur) await act({ type: 'combat/end-turn', unitId: cur.id });
    await settle(host, 250);
  }
  return false;
}
async function tabMove(tab, name, o = {}) {
  await dismissCut();
  await host.locator('#phc-tab-' + tab).click(); await settle(host, 150);
  await host.locator('[role="tabpanel"]').getByRole('button', { name }).first().click(); await settle(host, 150);
  if (o.target) { await tok(o.target).click(); await settle(host, 150); }
  const b = host.getByRole('button', { name: /^Confirm/ }).first();
  await b.waitFor({ timeout: 20000 }).catch(() => {});
  if (!(await b.isEnabled().catch(() => false))) return 'Confirm disabled';
  await b.click(); await settle(host, 500); return null;
}

// ---------- 0. The Proving Ground, an Operative with Ingenuity 7 ----------
await host.goto(BASE);
await click(host, 'PROVING GROUND', { timeout: 30000 });
const nm = host.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 20000 }).catch(() => {}), host.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 20000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(host, 'Solo ›'); }
await host.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 30000 });
charId = Object.keys((await G()).characters)[0];
await act({ type: 'sandbox/class', charId, classId: 'infiltrator', rank: 3 });
await act({ type: 'sandbox/skill', charId, skill: 'ingenuity', points: 7 });
await act({ type: 'sandbox/ai', on: false }); await act({ type: 'sandbox/auto', on: false });
if ((await G()).phase !== 'combat') await act({ type: 'sandbox/fight' });
await host.waitForFunction(() => window.__phc.getState().game?.phase === 'combat', null, { timeout: 30000 });
await act({ type: 'sandbox/clear' });
ok('my turn', await toMe());
let u = await me();
ok('the Operative starts with Shadow ' + (u.res?.shadow ?? 0) + ' of ' + (u.resMax?.shadow ?? 0), u.res?.shadow === 1 && u.resMax?.shadow === 4);
await settle(host, 300);
const meterText = await host.locator('text=Shadow').first().textContent().catch(() => '');
ok('the meter row is on the screen ("' + (meterText || '').slice(0, 40) + '")', !!meterText);
await snap('01-meter');
// Classes 3.0 step 10 (shadow-spec.md section 9): the meter shows the engine's value, once; the SHADOW tab in its groups;
// a verb that needs you Hidden is refused in the spec's words while you are seen
{
  // (0.31.0: a mini meter; its second line, the eye word, is its hover card now: both are read)
  const rowEl = host.locator('.phc-res-row:not(.phc-res-mini)[data-res="res-shadow"]').first();
  const row = ((await rowEl.textContent().catch(() => '')) || '') + ' ' + (await tipOf(rowEl));
  ok('the meter row reads the engine\'s Shadow (' + row.replace(/\s+/g, ' ').slice(0, 60) + ')', row.includes((u.res?.shadow ?? 0) + ' / ' + (u.resMax?.shadow ?? 0)) && (await host.locator('.phc-res-row:not(.phc-res-mini)[data-res="res-shadow"]').count()) === 1);
  ok('the eye word in its hover card (Unseen / In view / Seen)', /Eye: (Unseen|In view|Seen)/.test(row));
  await host.locator('#phc-tab-shadow').click(); await settle(host, 200);
  const tab = (await host.locator('[role="tabpanel"]').textContent()) || '';
  const groups = ['SLIP', 'MARK', 'WORK', 'BREAK'].filter((w) => tab.includes(w));
  ok('the SHADOW tab in its groups: ' + groups.join(', '), groups.length >= 3);
  const ri = host.locator('[role="tabpanel"] button', { hasText: 'Tag' }).first(); // rules 1.74 item 6009: Read Intent is a Vigilance perk now; Tag needs you Hidden too
  const tip = (await ri.count()) ? await tipOf(ri) : '';
  ok('Tag while seen, refused in the spec\'s words (' + tip.slice(0, 70) + ')', /An enemy sees you/.test(tip));
}

// ---------- 1. Fade at its Shadow (rules 1.74 item 6011: Vanish is the Operative's free Hide now), then a turn ended Hidden with no attack ----------
await host.evaluate(([id, n]) => { const cb = window.__phc.getState().game.combat; const x = cb.units.find((v) => v.id === id); (x.res ||= {}).shadow = n; }, [u.id, FADE_SHADOW]); // Fade's Shadow, set by hand
u = await me(); const sh0 = u.res?.shadow ?? 0;
let r = await tabMove('shadow', /^Fade/);
u = await me();
ok('Fade: Hidden, its Shadow spent (' + (r || 'confirmed') + ', Shadow ' + sh0 + ' -> ' + (u.res?.shadow ?? 0) + ')', !r && !!u.hidden && (u.res?.shadow ?? 0) === sh0 - FADE_SHADOW);
const sh1 = u.res?.shadow ?? 0;
await settle(host, 300);
let op = await tokOpacity(u.pos);
ok('Hidden: my token drawn at 60% (' + op + '), the Hidden word kept', op === 0.6 && /HIDDEN/.test((await tok(u.pos).getAttribute('aria-label')) || ''));
await act({ type: 'combat/end-turn', unitId: u.id }); await settle(host, 300);
ok('my turn again', await toMe());
u = await me();
ok('the turn ended Hidden with no attack: Shadow ' + u.res?.shadow, u.res?.shadow === sh1 + 1 && !!u.hidden);

// ---------- 2. The SHADOW tab: Tag on a Soldier that can't see you (rules 1.74: Read Intent left the tab) ----------
const [x, y] = u.pos.split(',').map(Number), at = (x + 3) + ',' + y;
await act({ type: 'sandbox/spawn', tier: 'soldier', weapon: 'hellraiser_service_rifle', at: ref(at), name: 'Watchman' });
const foe = (await G()).combat.units.find((v) => v.name === 'Watchman');
ok('a Soldier on the field', !!foe);
await host.locator('#phc-tab-shadow').click(); await settle(host, 200);
const verbs = await host.locator('[role="tabpanel"] button').allTextContents();
ok('the SHADOW tab lists the verbs: ' + verbs.slice(0, 6).join(' | ').slice(0, 160), verbs.some((t) => /Tag/.test(t)) && verbs.some((t) => /Lift/.test(t)) && !verbs.some((t) => /Read Intent/.test(t)));
await snap('02-tab');
r = await tabMove('shadow', /^Tag/, { target: foe.pos });
const read = (await G()).combat.units.find((v) => v.id === foe.id);
ok('Tag: the Soldier is Marked (' + (r || 'confirmed') + ')', !r && (read.conds?.marked || 0) > 0);

// ---------- 3. The Break: one shadow term, the meter spent, revealed ----------
u = await me();
// Classes 3.0 step 10: on the attack card the Break is a toggle; switching it on changes the previewed damage
{
  await host.locator('#phc-tab-attack').click(); await settle(host, 150);
  await host.locator('[role="tabpanel"]').getByRole('button', { name: /^Shot/ }).first().click(); await settle(host, 150);
  await tok(foe.pos).click(); await settle(host, 200);
  const brk = host.locator('[aria-label="Perk options on this action"] button', { hasText: 'Break' }).first();
  const has = await brk.waitFor({ timeout: 30000 }).then(() => true, () => false);
  const card = async () => ((await host.locator('.phc-cb-dock').first().textContent().catch(() => '')) || '').replace(/\s+/g, ' ');
  const before = await card();
  if (has) { await brk.click(); await host.waitForFunction(() => document.querySelector('[aria-label="Perk options on this action"] button[aria-pressed="true"]'), null, { timeout: 10000 }).catch(() => {}); }
  const after = await card();
  let i = 0; while (i < before.length && before[i] === after[i]) i++;
  const at = Math.max(0, i - 20), seen = after.slice(at, at + 70);
  ok('the Break is a toggle on the attack card, and switching it changes the preview ("…' + seen + '…")', has && before !== after && /shadow|Break/i.test(after));
  await host.locator('.phc-res-row:not(.phc-res-mini)[data-res="res-shadow"]').first().scrollIntoViewIfNeeded().catch(() => {}); await settle(host, 150);
  await host.mouse.move(700, 120); await settle(host, 200); // no hover card over the picture
  if (process.env.SHOTS_C3) await host.screenshot({ path: process.env.SHOTS_C3 + 'operative-shadow-break.png' });
  await snap('02b-break-toggle');
}
const mods = ['skill:ingenuity.1#shadow.break'];
const pv = await host.evaluate(({ id, t, mods }) => { const g = window.__phc.getState().game; const E = window.__phcEngine; if (!E?.previewAttack) return null; const cb = { ...g.combat, mods }; return E.previewAttack(cb, cb.units.find((v) => v.id === id), cb.units.find((v) => v.id === t), 'shot').dmg?.mults?.map((m) => m.label); }, { id: u.id, t: foe.id, mods });
if (pv) ok('the preview lists one shadow term and no ambush term: ' + pv.join(', '), pv.includes('shadow') && !pv.includes('ambush'));
r = await act({ type: 'combat/attack', unitId: u.id, targetId: foe.id, mode: 'shot', mods }); await settle(host, 600);
u = await me();
ok('the Break shot: the meter spent (' + (u.res?.shadow ?? 0) + ') and revealed (' + (r || 'sent') + ')', !r && (u.res?.shadow ?? 0) === 0 && !u.hidden);
await settle(host, 300);
op = await tokOpacity(u.pos);
ok('revealed: my token drawn plainly again (' + op + ')', op === 1);
const log = ((await G()).combat.log || []).map((l) => (typeof l === 'string' ? l : l.text || '')).join('\n');
ok('the log says so', /breaks from the shadows/.test(log));
await snap('03-break');

// ---------- 4. The shadow sightline on a dark map (rules 1.76 items 6400-6404): M813's outpost, a Phantom, two foes ----------
// The scripted Narrator places the Phantom by the south hall's lamp (I9) and starts a fight with two unaware Soldiers 9 tiles
// east. Standing in the lamp's light both see it; Prone (8 tiles: 12 less Prone's 4) neither does; Hide, then Douse the
// lamp: the tile goes dark and the watched tiles shrink. Every number is the engine's (the watched tiles are Hide's row).
{
  const SH = process.env.SHADOW_SHOTS ? process.env.SHADOW_SHOTS.replace(/\/?$/, '/') : '';
  const p = await player(browser, 'host', { campaigns: ['m813'] });
  await p.setViewportSize({ width: 1600, height: 1000 });
  const snapP = async (n, keep) => { await p.screenshot({ path: OUT + 'shadow-' + n + '.png' }); if (SH && keep) await p.screenshot({ path: SH + keep + '.png' }); };
  await hostAs(p, 'Leon');
  await click(p, 'Create a character');
  await p.getByPlaceholder('What the squad calls you').fill('Wren');
  await p.locator('main button[aria-pressed]').first().click();
  await click(p, 'Next ›');
  await p.locator('button', { hasText: /^All-in$/ }).first().click({ timeout: 5000 }).catch(() => {});
  await p.locator('button', { hasText: 'Phantom' }).first().click();
  await p.locator('button', { hasText: /^Use .* ›$/ }).first().click();
  await click(p, 'Next ›'); await click(p, 'Next ›'); await click(p, 'Next ›'); await click(p, 'Next ›');
  await lockIn(p, { timeout: 30000 });
  await p.waitForFunction(() => Object.keys(window.__phc.getState().game?.characters || {}).length > 0, null, { timeout: 30000 });
  await p.evaluate(() => window.__phc.setNarrator({ scripted: true }));
  await click(p, 'Start session');
  await p.waitForSelector('.phc-story', { timeout: 30000 });
  await p.waitForFunction(() => window.__phc.getState().game.story.entries.some((e) => e.kind === 'narration'), null, { timeout: 30000 });
  const actP = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
  const GP = () => p.evaluate(() => window.__phc.getState().game);
  const wren = await p.evaluate(() => Object.keys(window.__phc.getState().game.characters)[0]);
  await actP({ type: 'narrator/turn', turn: { narration: 'The squad reaches the outpost: no power, two work lamps.', travel: 'outpost' } });
  await p.waitForFunction(() => window.__phc.getState().game.story.await === 'players', null, { timeout: 30000 }).catch(() => {});
  await actP({ type: 'narrator/turn', turn: { narration: 'Wren slips down to the south hall, under the work lamp.', moves: [{ charId: wren, to: 'G11' }] } });
  await p.waitForFunction(() => window.__phc.getState().game.story.await === 'players', null, { timeout: 30000 }).catch(() => {});
  const fe = await actP({ type: 'narrator/turn', turn: { narration: 'Two guards come through the east door.', combat: { name: 'South hall', enemies: [{ name: 'Guard One', tier: 'soldier', weapon: 'service_pistol', at: 'P9', unaware: true }, { name: 'Guard Two', tier: 'soldier', weapon: 'service_pistol', at: 'P11', unaware: true }] } } });
  ok('the Narrator\'s fight in the outpost (' + (fe || 'started') + ')', !fe);
  await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 30000 });
  for (let i = 0; i < 20; i++) { // to my turn (the host ends the guards' turns: it is their Narrator)
    const cb = (await GP()).combat, cur = cb.units.find((u) => u.id === cb.order[cb.turn]);
    if (cur && cur.charId === wren) break;
    if (cur) await actP({ type: 'combat/end-turn', unitId: cur.id });
    await settle(p, 250);
  }
  await settle(p, 1200);
  for (let i = 0; i < 3; i++) { if (!(await p.locator('[data-phc-cutin]').count())) break; await p.mouse.click(1590, 990); await settle(p, 380); }
  const cbP = async () => (await GP()).combat;
  const meP = async () => (await cbP()).units.find((u) => u.charId === wren);
  let w = await meP();
  ok('a dark map (the outpost) with the Phantom at G11 (' + w.pos + ') and two foes', !!(await cbP()).map.dark && w.pos === '6,10' && (await cbP()).units.filter((u) => u.side === 'foe').length === 2);
  // the switch: on by default with the SHADOW tab open
  await p.locator('#phc-tab-shadow').click(); await settle(p, 300);
  const tog = p.locator('[data-sightline-toggle]');
  ok('the SIGHTLINE switch is on the map, on with the SHADOW tab open', (await tog.count()) === 1 && (await tog.getAttribute('data-sightline-toggle')) === '1');
  const watched = () => p.evaluate(() => document.querySelectorAll('[data-sightline]').length);
  const twice = () => p.evaluate(() => document.querySelectorAll('[data-sightline="2"]').length);
  const read = async () => ((await p.locator('[data-sightline-read]').first().textContent().catch(() => '')) || '').trim();
  const lines = () => p.locator('[data-tie-kind="eyes"]').count();
  const tileAt = (r) => p.locator('button.phc-tok[aria-label^="' + r + ' ·"]').first();
  await p.mouse.move(5, 5); await settle(p, 200);
  const w0 = await watched();
  ok('watched tiles are shaded (' + w0 + ', ' + (await twice()) + ' by both guards)', w0 > 0 && (await twice()) > 0);
  ok('the read-out says who sees me where I stand: "' + (await read()) + '"', /G11 · seen here by Guard (One|Two) and Guard (One|Two)/.test(await read()));
  ok('a line from each guard that sees me (' + (await lines()) + ')', (await lines()) === 2);
  await tileAt('B2').hover(); await settle(p, 250);
  ok('hovering a tile behind the north wall: "' + (await read()) + '"', /B2 · unseen here/.test(await read()) && /sightline: unseen here/.test((await tileAt('B2').getAttribute('aria-label')) || ''));
  await p.mouse.move(5, 5); await settle(p, 200);
  await snapP('04-sightline-dark-two-foes', 'sightline-dark-two-foes');
  // Prone at the edge of their reach (rules 1.76 item 6402)
  await actP({ type: 'combat/prone', unitId: w.id }); await settle(p, 500);
  w = await meP();
  const w1 = await watched();
  ok('Prone: the watched tiles shrink (' + w0 + ' -> ' + w1 + ') and I am unseen where I lie: "' + (await read()) + '"', !!w.prone && w1 < w0 && /G11 · unseen here/.test(await read()));
  await snapP('05-prone-edge', 'prone-at-the-edge');
  // Hide (out of every guard's eyes now), then Douse the lamp at I9
  let er = await actP({ type: 'combat/hide', unitId: w.id }); await settle(p, 400);
  w = await meP();
  ok('Hide from Prone (' + (er || 'hidden') + ')', !er && !!w.hidden);
  await snapP('06-douse-before', 'douse-before');
  const lampBefore = (await cbP()).objects.some((o) => o.kind === 'lamp' && o.pos === '8,8');
  er = await actP({ type: 'combat/perk', unitId: w.id, id: 'verb:shadow.douse', tile: '8,8' }); await settle(p, 500);
  const lampAfter = (await cbP()).objects.some((o) => o.kind === 'lamp' && o.pos === '8,8');
  ok('Douse: the lamp at I9 goes out (' + (er || 'doused') + ') and my tile is dark', !er && lampBefore && !lampAfter && /· dark/.test((await tileAt('G11').getAttribute('aria-label')) || ''));
  await actP({ type: 'combat/prone', unitId: w.id }); await settle(p, 400); // stand up: in the dark their eyes reach 6 tiles
  await p.mouse.move(5, 5); await settle(p, 200);
  const w2 = await watched();
  ok('standing again in the dark: fewer tiles watched than in the light (' + w0 + ' -> ' + w2 + '), unseen here: "' + (await read()) + '"', w2 < w0 && /G11 · unseen here/.test(await read()));
  await snapP('07-douse-after', 'douse-after');
  await tog.click(); await settle(p, 250);
  ok('the switch turns it off: no shading, no read-out', (await p.locator('[data-sightline]').count()) === 0 && (await p.locator('[data-sightline-read]').count()) === 0);
  await tog.click(); await settle(p, 150);
  ok('no page errors' + (p.errors?.length ? ': ' + p.errors.slice(0, 2).join(' | ') : ''), !(p.errors?.length));
  await p.context().close();
}
await browser.close();
