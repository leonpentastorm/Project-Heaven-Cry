// @ts-nocheck (a measuring tool)
// 0.28.3, rules 1.55 item 46: how many heals a Tending healer has. Skipped unless asked for:
//
//   TEND_MP_MEASURE=1 npx vitest run --config vitest.balance.config.ts test/balance/tend-mp-measure.test.ts --silent=false
//     TEND_MP_SEEDS=6   simulated stage-1 runs of two gunners (the incoming damage a fight)
//
// Through the reducer, in Survival: the Empath archetype on the camp's Recommended loadout at level 1, and the same
// sheet at level 3 as a Mender (class bard). For each: Max MP, each verb's MP (the descriptor's cost site figure), the
// HP one heal gives a hurt ally (applied, the start boon taken off so nothing gives MP back), heals from a full bar,
// HP from a full bar, and the MP the supply pack gives back after a fight (rewards.ts mpBack, survival.json ammo_pack).
// The incoming damage of a stage-1 fight: survival-run.ts's runs of two gunners (no healer), HP lost a fight.
// Run it once on the old data and once on the new to compare (nothing here knows a price).
import { describe, it, expect } from 'vitest';
import { apply, newGame, ARCHETYPES, beginTurn, withGame, reachable, actionsFor, sendDescriptor, maxMp } from '../../src';
import svJ from '../../../../data/survival.json';
import { simRun, PARTIES } from './survival-run';

const ON = !!process.env.TEND_MP_MEASURE, SEEDS = Math.max(1, Number(process.env.TEND_MP_SEEDS) || 6);
const sheet = (name: string, arch: string) => { const a: any = ARCHETYPES.find((x) => x.id === arch); return { name, portrait: '', origin: 'Thousand-Planet frontier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} }; };
function fightAt(level: number, cls: string | null) {
  let g: any = newGame('TMPM', { id: 'host', name: 'L' }, 'seed-m'); g.settings.play = 'survival';
  g = apply(g, { type: 'char/add', sheet: sheet('Medic', 'mender') }, 'host');
  g = apply(g, { type: 'player/join', id: 'p2', name: 'M' }, 'host'); g = apply(g, { type: 'char/add', sheet: sheet('Gun', 'sharpshooter') }, 'p2');
  g = apply(g, { type: 'run/start', seed: 'PHC-0001' }, 'host'); g = apply(g, { type: 'run/ready', close: true }, 'host');
  const med0: any = Object.values(g.characters).find((c: any) => c.name === 'Medic'); // Survival starts at 1: the level-3 Mender is set after the camp
  if (level > 1) { med0.level = level; med0.xp = 250; }
  if (cls) med0.classId = cls;
  const node = reachable(g.run).find((n: any) => n.kind === 'fight') || reachable(g.run)[0];
  for (const by of ['host', 'p2']) if (g.run.state === 'map') g = apply(g, { type: 'run/move', node: node.id }, by);
  const cb = g.combat, med: any = Object.values(g.characters).find((c: any) => c.name === 'Medic');
  const mu = cb.units.find((u: any) => u.charId === med.id), al = cb.units.find((u: any) => u.side === 'pc' && u.id !== mu.id);
  const [x, y] = mu.pos.split(',').map(Number); al.pos = x + ',' + (y + 1); al.maxHp = 5000; al.hp = 100;
  med.relics = []; if (mu.held) mu.held = { ...mu.held, relics: [] };
  cb.turn = cb.order.indexOf(mu.id); delete cb.window; withGame(g, () => beginTurn(cb, g.rng)); mu.ap = 9;
  return { g, mu, al, c: med };
}
/** One use through the reducer: its MP (the descriptor's figure) and the HP or shield it gave. */
function once(level: number, cls: string | null, id: string) {
  const s = fightAt(level, cls), d: any = actionsFor(s.g, s.mu.id, 'host').find((q: any) => q.id === id);
  if (!d) return null;
  const U = (g: any, k: string) => g.combat.units.find((u: any) => u.id === k);
  const hp0 = s.al.hp, sh0 = s.al.shield || 0;
  const g2 = apply(s.g, sendDescriptor(s.g, s.mu.id, id, { targetId: s.al.id }, 'host'), 'host');
  return { mp: d.cost.res?.mp || 0, ap: d.cost.ap, gave: U(g2, s.al.id).hp - hp0 + ((U(g2, s.al.id).shield || 0) - sh0), max: maxMp(s.c) };
}
const VERBS: [string, string][] = [['Mend', 'pk:verb:tend.mend#tend_mend'], ['Touch', 'pk:verb:tend.touch#tend_touch'], ['Shield', 'pk:verb:tend.shield#tend_shield'], ['Triage', 'pk:class:medic.triage#triage']];

describe('0.28.3: a Tending healer\'s heals (rules 1.55 item 46)', () => {
  (ON ? it : it.skip)('heals from a bar, a fight\'s MP back, a stage-1 fight\'s incoming damage', () => {
    const AP: any = (svJ as any).ammo_pack;
    let md = '| Who | Verb | AP | MP | Max MP | gives (HP) | from a full bar | HP from a full bar | MP back after a fight / elite / boss | heals a fight from MP back |\n|---|---|---|---|---|---|---|---|---|---|\n';
    for (const [who, lv, cls] of [['Empath L1', 1, null], ['Mender L3', 3, 'bard']] as const) {
      for (const [name, id] of VERBS) {
        const r = once(lv, cls, id); if (!r) continue;
        const per = r.mp ? Math.floor(r.max / r.mp) : Infinity, back = ['fight', 'elite', 'boss'].map((k) => Math.round(AP.mp_share * AP.supply[k] * r.max));
        md += '| ' + who + ' | ' + name + ' | ' + r.ap + ' | ' + r.mp + ' | ' + r.max + ' | ' + Math.round(r.gave) + ' | ' + per + ' | ' + Math.round(per * r.gave) + ' | ' + back.join(' / ') + ' | ' + (r.mp ? (back[0] / r.mp).toFixed(1) : '-') + ' |\n';
      }
    }
    // a stage-1 fight's incoming damage: two gunners, no healer, HP lost a fight (the share x their max HP)
    PARTIES.tmp_guns = ['gunner', 'gunner'];
    const lost: number[] = [], fights: number[] = [];
    for (let i = 0; i < SEEDS; i++) {
      const r = simRun({ party: 'tmp_guns', route: 'gear', seed: 'TMP-' + i, maxStages: 1 });
      const s1 = r.fights.filter((f: any) => f.stage === 1); fights.push(s1.length);
      for (const f of s1) if (f.won) lost.push(Math.max(0, f.hpBefore - f.hpAfter));
    }
    const mean = (a: number[]) => a.reduce((t, v) => t + v, 0) / Math.max(1, a.length);
    md += '\nStage 1, two gunners (no healer), ' + SEEDS + ' runs: ' + mean(fights).toFixed(1) + ' fights a stage; HP lost a won fight: ' + (mean(lost) * 100).toFixed(1) + '% of the party\'s HP (x 2 characters).\n';
    console.log(md);
    expect(lost.length).toBeGreaterThan(0);
  }, 3600000);
});
