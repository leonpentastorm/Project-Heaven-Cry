// The faces of Survival's foes (survival.json foe_faces; the artist's 14 Nov delivery, catalog collection survival-foes):
// a composed fight's foes wear a face picked from data (a caster's, the setting's Boss's or vault guard's, else its kind
// and tier's), with a variant fixed by the fight's seed, node and the foe's place: never a die. Every face the game can
// pick is a built asset (apps/web/src/game/assets.json, `npm run assets`); a missing one would draw the token's letter.
import { describe, expect, it } from 'vitest';
import { apply, reachable, composeEncounter, SETTINGS, type GameState } from '../src';
import { type Pc } from './helpers/replay';
import { survivalRoom, startRun, ownerOf } from './helpers/survival';
import assets from '../../../apps/web/src/game/assets.json';
import svJ from '../../../data/survival.json';
import enJ from '../../../data/enemies.json';

const SV: any = svJ, ASSETS: Record<string, string> = assets as any;
const TIERS: string[] = (enJ as any).items.map((t: any) => t.id);
const KINDS = ['fight', 'elite', 'boss', 'vault_guard'];
const SEEDS = Array.from({ length: 24 }, (_, i) => 'PHC-F' + i);
const enc = (setting: string, kind: string, seed: string, depth = 5, levels = [4, 4, 4]) =>
  composeEncounter({ levels, node: { id: 'n-' + kind + '-' + depth, depth, kind }, stage: 2, setting, seed });

describe('Survival foe faces', () => {
  it('every setting: every foe of every node kind wears a built face; Bosses and vault guards wear their setting\'s', () => {
    const seen: Record<string, Set<string>> = {};
    for (const st of SETTINGS) for (const kind of KINDS) for (const seed of SEEDS) for (const depth of [4, 6, 10]) {
      for (const f of enc(st.id, kind, seed, depth).foes) {
        expect(f.portrait, st.id + ' ' + kind + ' ' + f.name).toBeTruthy();
        expect(ASSETS[f.portrait!], 'built: ' + f.portrait).toBeTruthy();
        (seen[st.id] ||= new Set()).add(f.tier);
        if (f.caster) expect(f.portrait).toBe(SV.foe_faces.asset.replace('{id}', SV.foe_faces.caster.replace('{caster}', SV.foe_faces.words[f.caster])));
        else if (kind === 'boss' && f.tier === 'boss') expect(f.portrait).toBe(SV.foe_faces.asset.replace('{id}', st.boss.portrait));
        else if (kind === 'vault_guard' && st.vault_guard && f.name === st.vault_guard.name) expect(f.portrait).toBe(SV.foe_faces.asset.replace('{id}', st.vault_guard.portrait));
      }
    }
    // the fights above field every tier somewhere in each setting
    for (const st of SETTINGS) for (const t of TIERS) expect(seen[st.id].has(t), st.id + ' fields a ' + t).toBe(true);
  });

  it('every setting\'s kinds have a face (each variant built) for every tier but the Boss\'s own', () => {
    const F = SV.foe_faces;
    for (const st of SETTINGS) for (const k of Object.keys(st.kinds)) for (const t of TIERS) {
      if (t === 'boss') continue;
      for (const v of F.variants[t] || ['']) {
        const id = F.asset.replace('{id}', F.kind.replace('{kind}', F.words[k]).replace('{tier}', t).replace('{variant}', v));
        expect(ASSETS[id], st.id + ': ' + id).toBeTruthy();
      }
    }
  });

  it('two foes of one kind and tier get different variants; one foe always the same; no die is drawn for it', () => {
    let pair = 0;
    for (const st of SETTINGS) for (const seed of SEEDS) {
      const a = enc(st.id, 'fight', seed), b = enc(st.id, 'fight', seed);
      expect(b.foes.map((f) => f.portrait)).toEqual(a.foes.map((f) => f.portrait));
      const plain = a.foes.filter((f) => !f.caster && SV.foe_faces.variants[f.tier]);
      for (let i = 0; i < plain.length; i++) for (let j = i + 1; j < plain.length; j++) {
        if (plain[i].tier !== plain[j].tier || plain[i].kind !== plain[j].kind) continue;
        pair++;
        if (SV.foe_faces.variants[plain[i].tier].length >= 2 && j === i + 1) expect(plain[j].portrait, st.id + ' ' + seed).not.toBe(plain[i].portrait);
      }
    }
    expect(pair).toBeGreaterThan(0);
  });

  it('through the reducer: the fight\'s units wear the composed faces, and the same move gives the same faces and the same dice', () => {
    const DUO: Pc[] = [{ build: 'plain_gun', level: 1 }, { build: 'sigil', level: 1 }];
    const g = startRun(survivalRoom('PHC-0001', DUO, { test: true }), 'PHC-0001');
    const node = reachable(g.run!).find((n) => n.kind === 'fight')!;
    const go = (x: GameState) => { for (let i = 0; i < 2 && x.run!.state === 'map'; i++) x = apply(x, { type: 'run/move', node: node.id }, ownerOf(i)); return x; };
    const x = go(JSON.parse(JSON.stringify(g))), y = go(JSON.parse(JSON.stringify(g)));
    expect(x.run!.state).toBe('fight');
    const foes = x.combat!.units.filter((u) => u.side === 'foe');
    expect(foes.length).toBeGreaterThan(0);
    for (const u of foes) { expect(u.img, u.name).toBeTruthy(); expect(ASSETS[u.img!], u.img).toBeTruthy(); }
    expect(y.combat!.units.filter((u) => u.side === 'foe').map((u) => u.img)).toEqual(foes.map((u) => u.img));
    expect(y.rng).toEqual(x.rng);
  });
});
