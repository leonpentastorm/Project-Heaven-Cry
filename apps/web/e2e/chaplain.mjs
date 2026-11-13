// The Chaplain in the Proving Ground (Classes 3.0 step 5; rules 1.31; docs/design/chaplain-spec.md section 1): the
// worked example's turn, solo. A Chaplain rank III (Faith 6, Old Overcast, Devotion 6, a service rifle) against two drill
// soldiers: the FAITH tab offers Whispers at Faith 1 and refuses a Hymn below Faith 3 in words; then a Hymn makes the
// Chaplain Witnessed; a shot that hits carries Smite (the log names the patron and the amount) and leaves the target
// Judged; a second hit that turn carries none; Rebuke after it (the turn's Whisper); the CLASS tab lists Ward and
// Sanctuary (and Verdict), and Sanctuary (a Hymn) is refused during the Hymn's wait, in words. Ward is in classes-moves.
// Everything through the real buttons where the screen has one, the reducer (window.__phc.act) for the drill's set-up.
import { chromium, click, BASE, pause, settle } from './lib.mjs';
const browser = await chromium.launch();
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { localStorage.setItem('phc.voice', JSON.stringify({ auto: false })); localStorage.setItem('phc.tips', '["*"]'); sessionStorage.setItem('phc.pressedAnyKey', '1'); } catch { /* */ } });
const p = await ctx.newPage();
const errors = []; p.on('pageerror', (e) => errors.push(e.message));
const act = (a) => p.evaluate((a) => { try { window.__phc.act(a); return null; } catch (e) { return String(e.message || e); } }, a);
const G = () => p.evaluate(() => window.__phc.getState().game);
const ref = (k) => { const [x, y] = k.split(',').map(Number); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1); };
const xy = (k) => k.split(',').map(Number);
const dismiss = async () => { for (let i = 0; i < 4 && (await p.locator('[data-phc-cutin]').count()); i++) { await p.keyboard.press('Escape'); await pause(p, 300); } };
const log = async () => ((await G()).combat?.log || []).map((l) => (typeof l === 'string' ? l : l.text || '')).join('\n');

await p.goto(BASE);
await click(p, 'PROVING GROUND', { timeout: 90000 });
const nm = p.getByPlaceholder('Leon');
await Promise.race([nm.waitFor({ timeout: 20000 }).catch(() => {}), p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 20000 }).catch(() => {})]);
if (await nm.count()) { await nm.fill('Leon'); await click(p, /^Solo ›/); }
await p.waitForFunction(() => !!window.__phc.getState().game?.sandbox, null, { timeout: 30000 });
const cid = Object.keys((await G()).characters)[0];

// ---------- 1. Prayer opens at Faith 1 (rules 1.31) ----------
await act({ type: 'sandbox/faith', charId: cid, belief: 'faithful', patron: 'old_overcast', faith: 1, devotion: 6, reset: true });
await act({ type: 'sandbox/ai', on: false });
await act({ type: 'sandbox/fight' });
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 30000 });
await p.waitForFunction(() => { const cb = window.__phc.getState().game.combat; const u = cb && cb.units.find((x) => x.id === cb.order[cb.turn]); return u && u.side === 'pc'; }, null, { timeout: 30000 });
await dismiss();
await p.locator('[role="tab"][data-tab="faith"]').click(); await settle(p, 200);
{
  const panel = p.locator('[role="tabpanel"]');
  const rebuke = panel.locator('[data-act="pr:whisper:rebuke"]');
  const txt = (await panel.textContent()) || '';
  ok('Faith 1: the FAITH tab is open (no "Praying needs" line) and offers Rebuke', (await rebuke.count()) === 1 && !/Praying needs Faith/.test(txt));
  ok('Faith 1: a Hymn is refused in words ("A Hymn needs Faith 3")', /A Hymn needs Faith 3/.test(txt) || /A Hymn needs Faith 3/.test(String(await act({ type: 'faith/pray', unitId: (await G()).combat.order[(await G()).combat.turn], kind: 'hymn', id: 'thunderclap' }))));
}

// ---------- 2. The Chaplain: the worked example's turn ----------
await act({ type: 'sandbox/stop' }).catch(() => {});
await p.waitForFunction(() => window.__phc.getState().screen !== 'combat', null, { timeout: 30000 }).catch(() => {});
await act({ type: 'sandbox/class', charId: cid, classId: 'guardian', rank: 3 });
await act({ type: 'sandbox/faith', charId: cid, belief: 'faithful', patron: 'old_overcast', faith: 6, devotion: 6, reset: true });
const c0 = (await G()).characters[cid];
ok('a Chaplain rank III (class ' + c0.classId + ', level ' + c0.level + ', Faith ' + c0.skills.faith + ')', c0.classId === 'guardian' && (c0.skills.faith || 0) >= 6);
await act({ type: 'sandbox/fight' });
await p.waitForFunction(() => window.__phc.getState().screen === 'combat', null, { timeout: 30000 });
await p.waitForFunction(() => { const cb = window.__phc.getState().game.combat; const u = cb && cb.units.find((x) => x.id === cb.order[cb.turn]); return u && u.side === 'pc'; }, null, { timeout: 30000 });
await dismiss();
await act({ type: 'sandbox/clear' });
const me = async () => (await G()).combat.units.find((u) => u.charId === cid);
let u = await me();
const [mx, my] = xy(u.pos);
let foe = null;
for (const [dx, dy] of [[3, 0], [-3, 0], [0, 3], [0, -3], [2, 2], [-2, -2], [2, 0], [0, 2]]) {
  const at = (mx + dx) + ',' + (my + dy); const n0 = (await G()).combat.units.length;
  if (await act({ type: 'sandbox/spawn', tier: 'boss', weapon: 'fists', at: ref(at), name: 'Drill Sergeant' })) continue;
  if ((await G()).combat.units.length > n0) { foe = (await G()).combat.units.at(-1); break; }
}
ok('a drill sergeant stands in range', !!foe);
await p.locator('[role="tab"][data-tab="faith"]').click(); await settle(p, 200);
const hymnErr = await act({ type: 'faith/pray', unitId: u.id, kind: 'hymn', id: 'thunderclap' });
u = await me();
ok('the Hymn (Thunderclap): ' + (hymnErr || 'answered') + '; Witnessed, the patron at the side', !hymnErr && !!u.conds?.witnessed);
// Sanctuary is a Hymn: right after the Hymn it waits for the Hymn's wait, in words; the CLASS tab lists the moves
await p.locator('#phc-tab-class').click(); await settle(p, 200);
{
  const txt = (await p.locator('[role="tabpanel"]').textContent()) || '';
  ok('the CLASS tab lists Ward, Smite, Sanctuary and Verdict', /Ward/.test(txt) && /Smite/.test(txt) && /Sanctuary/.test(txt) && /Verdict/.test(txt));
  const sErr = await act({ type: 'combat/perk', unitId: u.id, id: 'class:guardian.sanctuary', actionId: 'sanctuary', tile: u.pos });
  ok('Sanctuary is a Hymn: refused during the Hymn\'s wait (' + sErr + ')', /wait/.test(String(sErr)));
}
/** End the Chaplain's turn and come back to it (the AI is off: the drill units pass). */
async function nextTurn() {
  for (let i = 0; i < 30; i++) {
    const cb = (await G()).combat, cur = cb.units.find((x) => x.id === cb.order[cb.turn]), mine = await me();
    if (i > 0 && cur && cur.id === mine.id) { await dismiss(); return true; }
    if (cur && cur.side === 'pc') await act({ type: 'combat/end-turn', unitId: cur.id });
    await settle(p, 300);
  }
  return false;
}
// the shot: a hit carries Smite and Judged; a later hit that turn carries none (a few turns, until a hit lands)
let smote = false, judged = false, second = null;
for (let t = 0; t < 5 && !smote; t++) {
  if (t > 0) ok('turn ' + (t + 1), await nextTurn());
  u = await me();
  while (u.ap >= 2 && !smote) {
    const before = (await G()).combat.log.length;
    const e = await act({ type: 'combat/attack', unitId: u.id, targetId: foe.id, mode: 'shot' });
    if (e) { console.log('note shot: ' + e); break; }
    const lines = (await G()).combat.log.slice(before).map((l) => (typeof l === 'string' ? l : l.text || '')).join('\n');
    smote = /Old Overcast smites Drill Sergeant \(Smite\): \d+/.test(lines);
    judged = !!(await G()).combat.units.find((x) => x.id === foe.id)?.conds?.judged;
    u = await me();
  }
  if (smote && u.ap >= 2) {
    const n = ((await log()).match(/\(Smite\)/g) || []).length;
    while (u.ap >= 2) { if (await act({ type: 'combat/attack', unitId: u.id, targetId: foe.id, mode: 'shot' })) break; u = await me(); }
    second = ((await log()).match(/\(Smite\)/g) || []).length === n;
  }
}
ok('Smite rides the hit: "Old Overcast smites Drill Sergeant (Smite): n" in the log', smote);
ok('the sergeant is Judged (the Chaplain\'s weapon struck it on its turn)', judged);
if (second !== null) ok('once a turn: later hits that turn carry no Smite', second);
u = await me();
if (u.ap >= 1) { const e = await act({ type: 'faith/pray', unitId: u.id, kind: 'whisper', id: 'rebuke', targetId: foe.id }); ok('Rebuke, the turn\'s Whisper, after Smite: ' + (e || 'answered'), !e); }
ok('no page errors: ' + errors.join(' | '), !errors.length);
await browser.close();
