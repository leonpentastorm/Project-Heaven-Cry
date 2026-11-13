import { describe, it, expect } from 'vitest';
import { figFight } from './helpers/figfight';

describe('figments smoke', () => {
  it('pictures a Beast and strikes', () => {
    const f = figFight([{ skills: { visualization: 5 }, level: 5, weapon: 'service_pistol' }], [{ tier: 'soldier', at: '8,5' }]);
    let u = f.turn(f.pc);
    console.log('mg', JSON.stringify({ vis: u.mg?.vis, v: u.mg?.visualizer, c: u.mg?.vcharge, ap: u.ap, pos: u.pos }));
    try { f.picture(u, 'beast', '7,5'); } catch (e) { console.log('ERR', String(e)); }
    u = f.unit(u.id);
    const b = f.figments(u)[0];
    console.log('beast', b && JSON.stringify({ id: b.id, hp: b.hp, def: b.def, attack: b.attack, lvlDmg: b.lvlDmg, mv: b.movement, held: (b as any).held, owned: (b as any).owned }), u.ap, u.mg?.vcharge);
    try { f.order(u, b, 'figment_strike', { targetId: f.foe.id }); } catch (e) { console.log('ERR2', String(e)); }
    console.log(f.cb.log.slice(-6).map((l: any) => l.text || l).join('\n'));
    expect(b).toBeTruthy();
  });
});
