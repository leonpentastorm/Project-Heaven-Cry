// @ts-nocheck (a tool run by hand)
// "What does the game do if…": play a few actions in a fight straight through the rules, with no browser and no new
// test file, and print what happened. Run it with:   npm run try -- '<scenario as JSON>'   (see tools/try_fight.py for
// the fields and examples). Without a scenario this file does nothing.
import { it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fightWith, withGame } from './helpers/perkfight';
import { previewTechnique, previewAttack, toHitTerms } from '../src';

const raw = process.env.PHC_TRY;
(raw ? it : it.skip)('try', () => {
  const sc = JSON.parse(existsSync(raw) ? readFileSync(raw, 'utf8') : raw);
  const f = fightWith(sc.pcs || [{}], sc.foes || [{ tier: 'soldier', at: 'F6' }], { seed: sc.seed, map: sc.map, ...(sc.level != null ? { level: sc.level } : {}) });
  const out: string[] = [], say = (s: string) => out.push(s);
  const unitOf = (ref: any) => (typeof ref !== 'string' ? ref : ref === '$pc' ? f.pcs[0] : ref === '$foe' ? f.foes[0] : /^\$pc(\d)$/.test(ref) ? f.pcs[+ref.slice(3)] : /^\$foe(\d)$/.test(ref) ? f.foes[+ref.slice(4)] : null);
  const fill = (v: any): any => (typeof v === 'string' && v.startsWith('$') ? (v.endsWith('.pos') ? unitOf(v.slice(0, -4))?.pos : unitOf(v)?.id) ?? v : Array.isArray(v) ? v.map(fill) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fill(x)])) : v);
  const line = (u: any) => `${u.name} [${u.pos}] HP ${u.hp}/${u.maxHp} AP ${u.ap}` + (u.shield ? ` shield ${u.shield}` : '') + (u.res && Object.keys(u.res).length ? ' ' + JSON.stringify(u.res) : '') + (u.conds && Object.keys(u.conds).length ? ' conds ' + JSON.stringify(u.conds) : '') + (u.mg ? ` MP ${u.mg.mp} strain ${u.mg.strain}/${u.mg.strainLimit}` + (u.mg.held ? ` holding stage ${u.mg.held.stage}` : '') : '') + (u.hidden ? ' HIDDEN' : '') + (u.dead ? ' DEAD' : u.downed ? ' DOWNED' : '');
  const state = () => f.cb.units.map(line).join('\n  ');
  for (const [k, v] of Object.entries(sc.set || {})) Object.assign(unitOf(k), fill(v)); // e.g. {"$pc": {"pos": "5,5", "ap": 9}}
  if (sc.turn !== false) f.turn(unitOf(sc.turn || '$pc'));
  say('START\n  ' + state());
  let n = f.cb.log.length;
  for (const [i, st0] of (sc.steps || []).entries()) {
    const st = fill(st0); let res = 'ok';
    try {
      if (st.turn) f.turn(unitOf(st0.turn));
      else if (st.set) for (const [k, v] of Object.entries(st0.set)) Object.assign(unitOf(k), fill(v));
      else if (st.preview) { const u = unitOf(st0.unit || '$pc'); const p = withGame(f.g, () => (st.preview.mode ? previewAttack(f.cb, u, unitOf(st0.preview.target || '$foe'), st.preview.mode) : previewTechnique(f.cb, u, st.preview.id, st.preview))); if (p && p.dmg) delete p.dmg.src; res = 'preview ' + JSON.stringify(p).slice(0, 900); }
      else if (st.tohit) { const u = unitOf(st0.unit || '$pc'); res = 'to-hit terms (' + st.tohit.type + ', the one hook) ' + JSON.stringify(withGame(f.g, () => toHitTerms(f.cb, u, unitOf(st0.tohit.target || '$foe'), st.tohit.type))); } // rules 1.43
      else { const a = { unitId: f.pcs[0].id, ...st }; f.act(a, st.by || 'host'); }
    } catch (e) { res = 'REFUSED: ' + e.message; }
    const fresh = f.cb.log.slice(n).map((l) => (typeof l === 'string' ? l : l.text)); n = f.cb.log.length;
    say(`STEP ${i + 1} ${JSON.stringify(st0).slice(0, 200)} -> ${res}` + (fresh.length ? '\n  log: ' + fresh.join('\n  log: ') : '') + '\n  ' + state());
  }
  console.log('\n' + out.join('\n') + '\n');
});
