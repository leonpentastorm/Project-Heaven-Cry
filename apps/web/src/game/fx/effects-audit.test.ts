// @vitest-environment jsdom
// 0.32 effects lane: the effect audit by trace (docs/design/handoffs/0.32-EFFECTS-AUDIT.md). Every prayer, every Bond and
// Tending verb and every Figment action is done through the reducer (the real path), and the fx events the engine sent
// are played through play.ts's real handlers on a jsdom grid. For each action: did something draw on the map, did the
// caster's and each target's token move, does every HP / shield change have its number, is there a sound, a log line.
// With AUDIT_OUT set it writes the table (the audit document's rows); without it, it pins what this lane fixed.
import { describe, expect, it, vi, beforeAll, afterAll } from 'vitest';
import { writeFileSync } from 'node:fs';
import { refOf, FORM, type GameState, type Unit } from '@engine';
import PJ from '../../../../../data/patrons.json';
import FJ from '../../../../../data/figments.json';
import '../../../../../packages/engine/test/helpers/yard16';
import { fightWith, withGame } from '../../../../../packages/engine/test/helpers/perkfight';
import { figFight } from '../../../../../packages/engine/test/helpers/figfight';
import { setDevotionXp, devotionThreshold, clearPrayerLimits } from '@engine';
import { setLayer } from './dom';
import { queueFx, setContext, clearFx } from './play';
let SEQ = 0;

type Row = { group: string; action: string; events: string; visual: string; number: string; sound: string; log: string; fault: string };
const ROWS: Row[] = [];
let layer: HTMLElement, root: HTMLElement, animated: Set<Element>, puts = 0;

function grid(w = 16, h = 11) {
  root = document.createElement('div'); document.body.appendChild(root);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const b = document.createElement('button'); b.className = 'phc-tok'; b.setAttribute('aria-label', refOf(x + ',' + y) + ' · open');
    const img = document.createElement('img'); img.setAttribute('style', 'position: relative; z-index: 2; width: 38px'); b.appendChild(img);
    (b as any).getBoundingClientRect = () => ({ left: x * 40, top: y * 40, width: 40, height: 40, right: x * 40 + 40, bottom: y * 40 + 40 });
    root.appendChild(b);
  }
  layer = document.createElement('div'); document.body.appendChild(layer); setLayer(layer as HTMLDivElement);
  const add = layer.appendChild.bind(layer); (layer as any).appendChild = (n: any) => { puts++; return add(n); };
}
const tileOfTok = (el: Element): string | null => { const b = el.closest('button.phc-tok'); const m = b?.getAttribute('aria-label')?.match(/^([A-Z]+\d+)/); return m ? m[1] : null; };

const shieldOf = (u: any) => (u?.shield || 0) + ((u?.shields || []) as any[]).reduce((s, l) => s + (Number(l.n) || 0), 0);
const snap = (g: GameState) => new Map(g.combat!.units.map((u: any) => [u.id, { hp: u.hp, sh: shieldOf(u), mp: u.mp ?? u.mg?.mp ?? 0, pos: u.pos, name: u.name, dead: !!u.dead }]));

/** Do the action, play what it sent, and write the row. */
function audit(group: string, action: string, h: { g: GameState }, casterId: string, run: () => void, o: { skipFloat?: boolean } = {}) {
  const before = snap(h.g), n0 = (h.g.combat!.fx || []).length ? Math.max(...h.g.combat!.fx!.map((e: any) => e.n || 0)) : 0, l0 = h.g.combat!.log.length;
  let err = '';
  try { run(); } catch (e: any) { err = String(e?.message || e).slice(0, 90); }
  if (err) { ROWS.push({ group, action, events: '-', visual: '-', number: '-', sound: '-', log: '-', fault: 'REFUSED in the harness: ' + err }); return; }
  const g = h.g, cb = g.combat!, evs = (cb.fx || []).filter((e: any) => (e.n || 0) > n0), log = cb.log.slice(l0);
  (window as any).__phcFxTrace = []; animated = new Set(); puts = 0;
  setContext(g, 'combat');
  queueFx(evs as any, 'cb|audit' + (++SEQ)); for (let i = 0; i < 40; i++) vi.advanceTimersByTime(500);
  const T = (window as any).__phcFxTrace as any[];
  if (process.env.AUDIT_DEBUG && action.includes(process.env.AUDIT_DEBUG)) console.log(action, JSON.stringify(evs.map((e: any) => [e.k, e.target, e.dmg ?? e.amount, e.hp ? JSON.stringify(e.hp) : ''])), JSON.stringify(T.filter((t) => t.w === 'float').map((t) => t.text)));
  const floats = T.filter((t) => t.w === 'float').map((t) => String(t.text));
  const sfx = [...new Set(T.filter((t) => t.w === 'sfx').map((t) => String(t.s)))];
  const after = snap(g), faults: string[] = [], nums: string[] = [];
  const posOf = (id: string) => (after.get(id) || before.get(id))?.pos;
  const animTiles = new Set([...animated].map(tileOfTok).filter(Boolean) as string[]);
  const changed: string[] = [];
  for (const [id, a] of after) {
    const b = before.get(id); if (!b) { changed.push(id); continue; }
    for (const [key, word] of [['hp', 'HP'], ['sh', 'shield']] as const) {
      const d = Math.round((a as any)[key] - (b as any)[key]); if (!d) continue;
      changed.push(id);
      const evAmt = evs.filter((e: any) => (e.target === id || e.unit === id) && (e.dmg != null || e.amount != null)).map((e: any) => String(Math.round(Math.abs(Number(e.dmg ?? e.amount)))));
      const shown = [String(Math.abs(d)), ...evAmt].some((x) => x !== '0' && floats.some((f) => f.includes(x)));
      nums.push(a.name + ' ' + word + (d > 0 ? ' +' : ' ') + d + (shown ? ' shown' : ' NOT SHOWN'));
      if (!shown && !o.skipFloat) faults.push(a.name + ' ' + word + ' ' + (d > 0 ? '+' : '') + d + ' has no number');
    }
  }
  const cPos = posOf(casterId), casterAnim = !!cPos && animTiles.has(refOf(cPos));
  const targets = [...new Set(changed)].filter((id) => id !== casterId);
  const tAnim = targets.filter((id) => { const p = posOf(id); return p && animTiles.has(refOf(p)); });
  if (!puts) faults.push('nothing drawn on the map');
  if (!casterAnim) faults.push('caster token still');
  if (targets.length && tAnim.length < targets.length) faults.push('target token still (' + (targets.length - tAnim.length) + ')');
  if (!sfx.length) faults.push('silent');
  if (!log.length) faults.push('no log line');
  ROWS.push({
    group, action, events: [...new Set(evs.map((e: any) => e.k))].join(' ') || '(none)',
    visual: puts + ' drawn; caster ' + (casterAnim ? 'moves' : 'still') + (targets.length ? '; targets ' + tAnim.length + '/' + targets.length + ' move' : ''),
    number: nums.join('; ') || (floats.length ? 'words: ' + floats.slice(0, 3).join(', ') : '-'), sound: sfx.join(' ') || '-', log: log.length ? log[log.length - 1].slice(0, 70).replace(/\|/g, '/') : '-',
    fault: faults.join('; ') || 'ok',
  });
}

beforeAll(() => {
  vi.useFakeTimers(); grid();
  (Element.prototype as any).animate = function () { animated?.add(this); return { cancel() {}, finished: Promise.resolve(), onfinish: null } as any; };
});
afterAll(() => {
  clearFx(); vi.useRealTimers();
  if (process.env.AUDIT_OUT) {
    const head = '| group | action | events | visual | number | sound | log | fault |\n|---|---|---|---|---|---|---|---|\n';
    writeFileSync(process.env.AUDIT_OUT, head + ROWS.map((r) => '| ' + [r.group, r.action, r.events, r.visual, r.number, r.sound, r.log, r.fault].join(' | ') + ' |').join('\n') + '\n');
  }
});

// ---------- prayers ----------
function chap(patron: string) {
  const f = fightWith([{ name: 'Chaplain', skills: { faith: 7 }, attrs: { virtue: 8 }, level: 12 }, { name: 'Medic' }, { name: 'Gunner' }], [{ at: 'F6' }, { at: 'G6' }], { level: 12 });
  const c = f.g.characters[f.pc.charId!]; c.belief = { kind: 'faithful', patron } as any; c.patron = patron; setDevotionXp(c, devotionThreshold(10)); c.devotion = 10;
  const [me, a1, a2] = f.pcs, [f0, f1] = f.foes;
  me.pos = '2,5'; a1.pos = '2,6'; a2.pos = '3,5'; f0.pos = '6,5'; f1.pos = '7,5';
  for (const u of f.cb.units) { u.conds = {}; u.shield = 0; delete (u as any).shields; }
  a1.hp = Math.round(a1.maxHp / 2); a2.hp = Math.round(a2.maxHp / 2);
  f.turn(me);
  return { f, me: () => f.unit(me.id), a1: () => f.unit(a1.id), a2: () => f.unit(a2.id), foe: () => f.unit(f0.id) };
}
function prayCase(kind: string, patron: string, e: any) {
  const h = chap(patron), me = h.me();
  const t = String(e.target || 'none'), x: any = {};
  if (t === 'self_or_ally' || t === 'ally') x.targetId = h.a1().id;
  else if (t === 'downed_ally') { const a = h.a1(); a.hp = 0; (a as any).downed = true; x.targetId = a.id; }
  else if (t === 'enemy') x.targetId = h.foe().id;
  else if (t === 'tile') x.tile = h.foe().pos;
  else if (t === 'two_units' || t === 'two_allies') { x.targetId = h.a1().id; x.targetId2 = t === 'two_units' ? h.foe().id : h.a2().id; }
  if (kind === 'miracle') { for (const u of h.f.foes) u.hp = Math.min(u.hp, 30); h.a1().hp = 10; }
  audit('prayer', kind + ' ' + (kind === 'whisper' ? '' : patron + '.') + e.id + ' (' + t + ')', h.f as any, me.id, () => {
    me.ap = 9; withGame(h.f.g, () => clearPrayerLimits(me, h.f.g, h.f.g.characters[me.charId!]));
    h.f.act({ type: 'faith/pray', unitId: me.id, kind, id: e.id, ...x } as any);
  });
}

describe('effects audit', () => {
  it('prayers', () => {
    const pj: any = PJ, any = pj.items[0].id;
    for (const w of pj.whispers) prayCase('whisper', any, w);
    for (const it of pj.items) { for (const hy of it.hymns) prayCase('hymn', it.id, hy); prayCase('miracle', it.id, it.miracle); }
    expect(ROWS.length).toBeGreaterThan(30);
    // 0.33: Everyone Home's allies answer on their tokens (the Miracle's landing runs landOn)
    expect(ROWS.find((r) => r.action.includes('everyone_home'))!.fault).toBe('ok');
    // 0.33 sound lane: every Hymn and Miracle plays its patron's own layer (data: patrons.json `sound`); a storm's bolt
    // cracks apart from the thunder; a prayer's wound on a foe lands with the divine impact
    for (const it of pj.items) for (const r of ROWS.filter((x) => x.group === 'prayer' && x.action.includes(it.id + '.') && !/REFUSED/.test(x.fault))) expect(r.sound).toContain(it.sound);
    const row = (a: string) => ROWS.find((r) => r.action.includes(a))!;
    expect(row('thunderclap').sound).toContain('lightning'); expect(row('thunderclap').sound).toContain('thunder');
    expect(row('nerukhan.judgement').sound).toContain('divine_hit'); expect(row('whisper rebuke').sound).toContain('divine_hit');
    expect(row('nerukhan.absolution').sound).not.toContain('divine_hit');
  }, 60000); // every prayer through the reducer: seconds on a quiet machine, past 5 s on a busy one

  it('bonds and tending', () => {
    const MOVED: Record<string, string> = { settle: 'steady_hands', soothe: 'steady_hands', tug: 'pull_together', guide: 'pull_together', raise: 'nobody_left_behind' };
    const verbs: [string, string, string?][] = [['bond', 'ally'], ['mend', 'ally', 'bond'], ['shield', 'ally', 'bond'], ['settle', 'ally', 'bond'], ['soothe', 'ally', 'bond'], ['tug', 'ally', 'bond'], ['guide', 'ally', 'bond'], ['raise', 'downed', 'bond'], ['snap', 'ally', 'bond'], ['let_go', 'ally', 'bond'], ['bond', 'foe'], ['mend_self', 'self', 'bondfoe'], ['echo: foe hits the Bonded ally', 'hit', 'bond']];
    for (const [v, who, pre] of verbs) {
      const f = fightWith([{ name: 'Medic', archetype: 'mender', skills: { empathy: 10 }, attrs: { insight: 10 }, offHand: 'attuner', weapon: 'service_pistol', level: 12, perks: { steady_hands: 'II', pull_together: 'II', nobody_left_behind: 'II' } }, { name: 'Gun' }], [{ at: 'F6' }], { level: 12 });
      const [me, al] = f.pcs, foe = f.foe; me.pos = '2,5'; al.pos = '3,5'; foe.pos = '5,5'; (foe as any).sv = { heart: -99 };
      for (const u of f.cb.units) { u.conds = {}; u.shield = 0; delete (u as any).shields; }
      me.hp = Math.round(me.maxHp * 0.6); al.hp = Math.round(al.maxHp / 2);
      f.turn(me);
      // since rules 1.75 Settle, Soothe, Tug, Guide and Raise are perks' actions (the perk's row, by its action id)
      const perk = (id: string, t?: Unit, x: any = {}) => { f.unit(me.id).ap = 9; const m = MOVED[id]; f.act({ type: 'combat/perk', unitId: me.id, id: m ? 'perk:' + m : 'verb:tend.' + id, ...(m ? { actionId: 'tend_' + id } : {}), ...(t ? { targetId: t.id } : {}), ...x } as any); };
      try { if (pre === 'bond') perk('bond', f.unit(al.id)); if (pre === 'bondfoe') perk('bond', f.unit(foe.id)); } catch { /* the row says it */ }
      if (who === 'downed') { const a = f.unit(al.id); a.hp = 0; (a as any).downed = true; }
      audit('bond', v + (pre ? ' (after Bond' + (pre === 'bondfoe' ? ' on a foe' : '') + ')' : ''), f as any, me.id, () => {
        if (who === 'hit') { f.unit(foe.id).pos = '4,5'; f.act({ type: 'combat/end-turn', unitId: me.id } as any); return; }
        if (v === 'guide') { perk('guide', f.unit(al.id), { tile: '3,4' }); return; }
        perk(v, who === 'ally' || who === 'downed' ? f.unit(al.id) : who === 'foe' ? f.unit(foe.id) : undefined);
      });
    }
    expect(ROWS.some((r) => r.group === 'bond')).toBe(true);
  }, 60000);

  it('figments', () => {
    const forms = ['beast', 'husk', 'ward', 'blade', 'double', 'eye', 'hand', 'sentinel'];
    const FIG_VERB = Object.fromEntries(((FJ as any).verbs as any[]).map((v) => [v.id, v]));
    const mk = () => { const s = figFight([{ name: 'Rigger', skills: { visualization: 10, ingenuity: 6 }, attrs: { intelligence: 10 }, forms, level: 12, cores: 6, weapon: 'service_pistol' } as any, { name: 'Gun' }], [{ at: 'F6' }], { level: 12 });
      const me = s.pc; me.pos = '2,5'; s.pcs[1].pos = '2,7'; s.foe.pos = '6,5'; s.foe.hp = s.foe.maxHp = 2000; s.turn(me); return s; };
    const VT: Record<string, string> = { figment_interpose: '4,6', figment_redraw: '3,6' };
    for (const form of forms) {
      const s = mk(), me = s.pc;
      audit('figment', 'Picture ' + form, s as any, me.id, () => { s.unit(me.id).ap = 9; s.picture(s.unit(me.id), form, '4,5'); });
      for (const v of ((FORM as any)[form]?.verbs || []) as string[]) {
        const s2 = mk(); s2.unit(s2.pc.id).ap = 9; try { s2.picture(s2.pc, form, '4,5'); } catch { continue; }
        const f2 = s2.figments(s2.pc)[0]; if (!f2) continue; f2.pos = '5,5'; s2.pcs[1].pos = '5,6'; s2.unit(s2.pc.id).ap = 9;
        const side = (FIG_VERB as any)[v]?.reach?.side;
        audit('figment', form + ': ' + v, s2 as any, s2.pc.id, () => s2.order(s2.pc, f2, v, VT[v] ? { tile: VT[v] } : side === 'ally' ? { targetId: s2.pcs[1].id } : side === 'foe' ? { targetId: s2.foe.id } : {}));
      }
    }
    expect(ROWS.some((r) => r.group === 'figment')).toBe(true);
  }, 60000);
});
