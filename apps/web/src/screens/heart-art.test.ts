// @vitest-environment jsdom
// Painted Outburst art by catalog id (art/icons/feelings, art/icons/modules, the UI marks), rendered for real: the sheet's
// Magic tab data (feelingCodex, moduleGroups) gives each feeling and module an icon src; mounted as <img>, every one is
// its own painted file from assets.json, and an item without a painted file still draws its code SVG.
import { describe, expect, it, afterEach } from 'vitest';
import ASSETS from '../game/assets.json';
import { feelingCodex, moduleGroups, feelingIconSrc, markIconSrc } from '../game/feelingsView';
import { setHeartArt, heartMarkKey } from '../game/heartIcons';
import { feltCard } from '../game/fx/feelings';
import { FEELINGS } from '@engine';

const A = ASSETS as Record<string, string>;
const mount = (srcs: string[]) => { const el = document.createElement('div'); srcs.forEach((s) => { const i = document.createElement('img'); i.src = s; i.alt = ''; el.appendChild(i); }); document.body.appendChild(el); return el; };
afterEach(() => { setHeartArt(null); document.body.innerHTML = ''; });

describe('painted feelings, modules and UI marks', () => {
  it('every feeling and every module with a painted file renders it by id', () => {
    const c = { skills: {}, soulKnown: { feelings: FEELINGS, modules: [] } };
    const fs = feelingCodex(c), ms = moduleGroups(c).flatMap((g) => g.modules);
    expect(fs.length).toBe(25);
    for (const f of fs) expect(f.icon, f.id).toBe(A['feeling-' + f.id]);
    const el = mount([...fs.map((f) => f.icon), ...ms.map((m) => m.icon)]);
    expect(el.querySelectorAll('img[src^="/assets/feeling-"]').length).toBe(25);
    for (const m of ms) { const key = ['module-' + m.id, 'module-' + m.id.replace(/_/g, '-')].find((k) => A[k]); if (key) expect(m.icon, m.id).toBe(A[key]); else expect(m.icon, m.id).toMatch(/^data:image\/svg\+xml/); }
    expect(ms.filter((m) => m.icon.startsWith('/assets/module-')).length).toBe(38);
  });
  it('an item with no painted file keeps its drawn icon; the UI marks use heart-ui-<mark>', () => {
    setHeartArt({});
    expect(feelingIconSrc('rage')).toMatch(/^data:image\/svg\+xml/);
    expect(markIconSrc('revert')).toMatch(/^data:image\/svg\+xml/);
    setHeartArt(null);
    for (const k of ['revert', 'practice', 'felt'] as const) { expect(markIconSrc(k)).toBe(A[heartMarkKey(k)]); expect(A[heartMarkKey(k)]).toBeTruthy(); }
  });
  it('the unlock card carries the feeling glyph and the Felt mark', () => {
    feltCard('rage');
    const card = document.querySelector('[data-felt-card="rage"]')!;
    expect(card.querySelector('img')!.getAttribute('src')).toBe(A['feeling-rage']);
    expect(card.querySelector('img[data-heart-mark="felt"]')!.getAttribute('src')).toBe(A['heart-ui-felt']);
  });
});
