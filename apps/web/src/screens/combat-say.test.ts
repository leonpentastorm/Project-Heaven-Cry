// @vitest-environment jsdom
// The fight screen's Say row (rules 1.14): one input, Say (free) and Attempt · 1 AP, the Attempt's reason when it can't
// be used, the wait for the Narrator, the answer in the log with its dice, the host's Skip, and a human Narrator's four
// answers. Rendered for real from the template with the engine underneath.
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, active, fightRulingOf, type GameState, type Sheet } from '@engine';

let G: GameState; let ME = 'host', ROLE = 'host';
const listeners = new Set<() => void>();
let snap: any = null;
const view = () => ({ game: viewFor(G, ME), me: { id: ME, name: ME === 'host' ? 'Leon' : 'Mai' }, role: ROLE, screen: 'combat', toast: null, savedAt: 0 });
const refresh = () => { snap = view(); listeners.forEach((f) => f()); };
const doAct = (a: any, by = ME) => { G = apply(G, a, by); refresh(); };
vi.mock('../game/store', () => ({ getState: () => snap || (snap = view()), subscribe: (f: any) => { listeners.add(f); return () => listeners.delete(f); },
  act: (a: any) => { try { doAct(a); } catch (e: any) { if (e?.name !== 'RuleError' && e?.constructor?.name !== 'RuleError') throw e; } }, go: () => {}, toast: () => {}, polishText: async () => '', retryNarrator: () => {}, saveNow: () => {}, poke: () => {} }));
vi.mock('../game/report', () => ({ openReport: () => {}, PlaytestTools: () => null }));
const { CombatLogic } = await import('./combat.js');
const React = await import('react'); const { createRoot } = await import('react-dom/client');
const { makeScreen } = await import('../dc/runtime'); const { expand } = await import('./shared');
const tpl = (await import('../templates/combat.template.html?raw')).default;
const Screen = makeScreen(expand(tpl), CombatLogic as any);
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const sheetFrom = (name: string): Sheet => { const a = ARCHETYPES[0];
  return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any; };
function fight(o: { guest?: boolean; perks?: any[] } = {}) {
  ME = 'host'; ROLE = 'host'; snap = null; G = newGame('ROOM', { id: 'host', name: 'Leon' }, 'say-row');
  if (o.guest) G = apply(G, { type: 'player/join', id: 'mai', name: 'Mai' }, 'host');
  G = apply(G, { type: 'char/add', sheet: sheetFrom('MPAT') }, o.guest ? 'mai' : 'host');
  if (o.perks) Object.values(G.characters)[0].perks = o.perks;
  G = apply(G, { type: 'session/start' }, 'host');
  G = apply(G, { type: 'narrator/turn', turn: { narration: 'Guns.', combat: { name: 'Pad', difficulty: 'easy', enemies: [{ name: 'Engineer', tier: 'minion', weapon: 'service_pistol' }, { name: 'Keel', tier: 'soldier', weapon: 'drifter_revolver' }] } } } as any, 'host');
  const u = pc(); G.combat!.turn = G.combat!.order.indexOf(u.id); u.ap = 6; u.hp = u.maxHp; u.downed = false; G.combat!.fx = [];
  expect(active(G.combat!)!.id).toBe(u.id);
  if (o.guest) { ME = 'mai'; ROLE = 'guest'; }
  refresh();
}
const pc = () => G.combat!.units.find((u) => u.side === 'pc')!;
function App() { const st = React.useSyncExternalStore((f) => { listeners.add(f); return () => { listeners.delete(f); }; }, () => snap); return React.createElement(Screen as any, { tick: st }); }
async function mount() {
  vi.useFakeTimers();
  const el = document.createElement('div'); document.body.appendChild(el); const root = createRoot(el);
  await React.act(async () => { root.render(React.createElement(App)); });
  await React.act(async () => { vi.advanceTimersByTime(15000); });
  return { el, done: async () => { await React.act(async () => { root.unmount(); }); el.remove(); vi.useRealTimers(); } };
}
const settle = () => React.act(async () => { vi.advanceTimersByTime(15000); });
const q = <T extends Element = HTMLElement>(el: HTMLElement, sel: string) => Array.from(el.querySelectorAll<T>(sel));
const sayBtn = (el: HTMLElement) => q<HTMLButtonElement>(el, 'button[data-say="say"]')[0];
const attemptBtn = (el: HTMLElement) => q<HTMLButtonElement>(el, 'button[data-say="attempt"]')[0];
async function type(el: HTMLElement, text: string) {
  const input = q<HTMLInputElement>(el, 'input[aria-label^="Say something"]')[0];
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  await React.act(async () => { set.call(input, text); input.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function typeIn(input: HTMLInputElement | HTMLSelectElement, value: string) {
  const proto = input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  const set = Object.getOwnPropertyDescriptor(proto, 'value')!.set!;
  await React.act(async () => { set.call(input, value); input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true })); });
}
const click = (b: Element) => React.act(async () => { (b as HTMLElement).click(); });

describe('the Say row in a fight (rules 1.14)', () => {
  it('has one input, Say (free) and Attempt · 1 AP', async () => {
    fight(); const { el, done } = await mount();
    expect(sayBtn(el).textContent).toBe('Say'); expect(sayBtn(el).title).toMatch(/^Free\./);
    expect(attemptBtn(el).textContent).toBe('Attempt · 1 AP'); expect(attemptBtn(el).disabled).toBe(false);
    expect(attemptBtn(el).title).toMatch(/Costs 1 AP, once a turn\. The Narrator answers at once/);
    await done();
  });
  it('Say is free: the words go in the log and nothing waits', async () => {
    fight(); const { el, done } = await mount(); const ap = pc().ap;
    await type(el, 'Keel! Look at me.'); await click(sayBtn(el));
    expect(G.combat!.log.at(-1)).toBe('MPAT: "Keel! Look at me."'); expect(pc().ap).toBe(ap); expect(fightRulingOf(G.combat)).toBeNull();
    expect(el.textContent).toContain('MPAT: "Keel! Look at me."');
    await done();
  });
  it('Attempt costs 1 AP; the row says the Narrator is deciding and the action panel is locked', async () => {
    fight(); const { el, done } = await mount();
    await type(el, 'Drop it, Keel.'); await click(attemptBtn(el)); await settle();
    expect(pc().ap).toBe(5); expect(fightRulingOf(G.combat)!.text).toBe('Drop it, Keel.');
    const talk = q(el, '[data-fight-ruling]')[0]; expect(talk.textContent).toContain('The Narrator is deciding…'); expect(talk.textContent).toContain('MPAT attempts: “Drop it, Keel.”');
    expect(attemptBtn(el).disabled).toBe(true); expect(attemptBtn(el).title).toBe('The Narrator is deciding.');
    expect(q(el, '.phc-cb-dock')[0].getAttribute('data-lock')).toBe('wait'); expect(q(el, '.phc-cb-lockmsg')[0].textContent).toBe('The Narrator is deciding…');
    expect(sayBtn(el).disabled).toBe(false); // you can still talk
    await done();
  });
  it('the answer shows in the log like any other line, a check with its dice; the panel unlocks', async () => {
    fight(); const { el, done } = await mount();
    await type(el, 'Drop it, Keel.'); await click(attemptBtn(el));
    const keel = G.combat!.units.find((u) => u.name === 'Keel')!;
    await React.act(async () => { doAct({ type: 'narrator/fight-ruling', id: fightRulingOf(G.combat)!.id, lines: ['Keel\'s eyes flick to the ramp.'], effect: { check: { skill: 'intimidation', tn: 12, onSuccess: { condition: { target: keel.id, id: 'shaken' } } } } }, 'host'); });
    await settle();
    expect(el.textContent).toContain('Narrator: Keel\'s eyes flick to the ramp.');
    expect(el.textContent).toMatch(/MPAT · INTIMIDATION CHECK · d20 \d+ [+−] \d+ = -?\d+ vs 12 · [✓✕]/);
    expect(q(el, '[data-fight-ruling]').length).toBe(0); expect(q(el, '.phc-cb-dock')[0].getAttribute('data-lock')).toBe('');
    expect(attemptBtn(el).disabled).toBe(true); expect(attemptBtn(el).title).toBe('You already made an attempt this turn.');
    await type(el, 'And another thing.'); expect(q(el, '[data-say="why"]')[0].textContent).toBe('✕ Attempt: You already made an attempt this turn.');
    await done();
  });
  it('Attempt is off with its reason: under 1 AP', async () => {
    fight(); pc().ap = 0.5; refresh(); const { el, done } = await mount();
    expect(attemptBtn(el).disabled).toBe(true); expect(attemptBtn(el).title).toBe('Needs 1 AP.');
    await done();
  });
  it('Attempt is off with its reason: no Narrator connected (Say still works)', async () => {
    fight(); doAct({ type: 'narrator/ready', ready: false }); const { el, done } = await mount();
    expect(attemptBtn(el).disabled).toBe(true); expect(attemptBtn(el).title).toBe('No Narrator is connected.');
    await type(el, 'Hello?'); await click(sayBtn(el)); expect(G.combat!.log.at(-1)).toBe('MPAT: "Hello?"');
    await done();
  });
  it('Attempt is off with its reason: it isn\'t your turn', async () => {
    fight(); const foe = G.combat!.units.find((u) => u.side === 'foe')!; G.combat!.turn = G.combat!.order.indexOf(foe.id); refresh();
    const { el, done } = await mount();
    expect(attemptBtn(el).disabled).toBe(true); expect(attemptBtn(el).title).toBe('Only on your own turn.');
    await done();
  });
  it('the host can end the wait: the AP comes back; a guest has no such button', async () => {
    fight(); const { el, done } = await mount();
    await type(el, 'Anyone?'); await click(attemptBtn(el)); await settle();
    const skip = q<HTMLButtonElement>(el, '[data-fight-skip]')[0]; expect(skip.textContent).toBe('Skip and give it back'); expect(skip.title).toMatch(/MPAT gets back what this cost \(1 AP\) and may try again/);
    await click(skip); await settle();
    expect(pc().ap).toBe(6); expect(fightRulingOf(G.combat)).toBeNull(); expect(el.textContent).toContain('The host ended the wait. MPAT gets 1 AP back.');
    await done();
    fight({ guest: true }); const g2 = await mount();
    await type(g2.el, 'Anyone?'); await click(attemptBtn(g2.el)); await settle();
    expect(q(g2.el, '[data-fight-ruling]')[0].textContent).toContain('The Narrator is deciding…'); expect(q(g2.el, '[data-fight-skip]').length).toBe(0); expect(q(g2.el, '[data-fight-gm]').length).toBe(0);
    await g2.done();
  });
});

describe('a human Narrator answers on the fight screen (rules 1.14, point 7)', () => {
  async function waiting(o: { perks?: any[] } = {}) {
    fight({ guest: true, ...o }); G.settings.mode = 'human';
    if (o.perks) doAct({ type: 'combat/perk', unitId: pc().id, id: o.perks[0].id, text: 'This hull was never rated for it.' }, 'mai');
    else doAct({ type: 'combat/attempt', unitId: pc().id, text: 'I shout that the reactor is going.' }, 'mai');
    ME = 'host'; ROLE = 'host'; refresh();
    return mount();
  }
  const answer = (el: HTMLElement, k: string) => q<HTMLButtonElement>(el, '[data-fight-answer="' + k + '"]')[0];
  it('gets the words and the four answers as buttons; the perk answer only when a perk asked', async () => {
    const { el, done } = await waiting();
    const talk = q(el, '[data-fight-ruling]')[0];
    expect(talk.textContent).toContain('Your answer, Narrator'); expect(talk.textContent).toContain('MPAT attempts: “I shout that the reactor is going.”');
    expect(answer(el, 'check').textContent).toBe('Ask a check'); expect(answer(el, 'condition').textContent).toBe('Condition'); expect(answer(el, 'surrender').textContent).toBe('Surrender');
    expect(answer(el, 'line').textContent).toBe('Just the line'); expect(answer(el, 'yes')).toBeUndefined();
    expect(q<HTMLOptionElement>(el, 'select[aria-label="Condition"] option').map((o) => o.value)).toEqual(['shaken', 'taunted', 'lowered', 'hesitates']);
    expect(q<HTMLOptionElement>(el, 'select[aria-label="TN"] option').map((o) => o.value)).toEqual(['8', '12', '16', '20']);
    expect(q<HTMLOptionElement>(el, 'select[aria-label="Skill to roll"] option').length).toBe(27);
    await done();
  });
  it('a line of their own with a check: the game rolls it and shows the dice', async () => {
    const { el, done } = await waiting();
    await typeIn(q<HTMLInputElement>(el, 'input[aria-label="Your line as the Narrator"]')[0], 'The engineer looks up at the lights.');
    await typeIn(q<HTMLSelectElement>(el, 'select[aria-label="Skill to roll"]')[0], 'eloquence'); await typeIn(q<HTMLSelectElement>(el, 'select[aria-label="TN"]')[0], '16');
    await click(answer(el, 'check')); await settle();
    expect(G.combat!.log.some((l) => l === 'Narrator: The engineer looks up at the lights.')).toBe(true);
    expect(G.combat!.log.some((l) => /MPAT · ELOQUENCE CHECK · d20 \d+ .* vs 16/.test(l))).toBe(true); expect(fightRulingOf(G.combat)).toBeNull();
    await done();
  });
  it('a condition on a target', async () => {
    const { el, done } = await waiting(); const keel = G.combat!.units.find((u) => u.name === 'Keel')!;
    await typeIn(q<HTMLSelectElement>(el, 'select[aria-label="Condition"]')[0], 'hesitates'); await typeIn(q<HTMLSelectElement>(el, 'select[aria-label="Enemy"]')[0], keel.id);
    await click(answer(el, 'condition'));
    expect(G.combat!.units.find((u) => u.id === keel.id)!.stunnedNext).toBe(1); expect(G.combat!.log.at(-1)).toBe('Keel hesitates (−1 AP on its next turn).');
    await done();
  });
  it('a surrender: off with its reason on a healthy enemy, on for a beaten one', async () => {
    const { el, done } = await waiting(); const foe = G.combat!.units.find((u) => u.side === 'foe')!;
    expect(answer(el, 'surrender').disabled).toBe(true); expect(answer(el, 'surrender').title).toMatch(/is above half HP: it gives up only after a successful check/);
    foe.hp = 1; await React.act(async () => { refresh(); });
    expect(answer(el, 'surrender').disabled).toBe(false); await click(answer(el, 'surrender'));
    expect(G.combat!.units.find((u) => u.id === foe.id)!.surrendered).toBe(true);
    await done();
  });
  it('yes or no on the perk: a no gives the use back', async () => {
    const { el, done } = await waiting({ perks: [{ id: 'established_fact', tier: 'mastered' }] });
    expect(q(el, '[data-fight-ruling]')[0].textContent).toContain('MPAT · Established Fact: “This hull was never rated for it.”');
    expect(answer(el, 'yes').textContent).toBe('Yes'); expect(answer(el, 'no').textContent).toBe('No, give it back');
    expect(q(el, '[data-fight-gm]')[0].textContent).toMatch(/Your part: Established Fact\. Make it true/); // what the perk asks of the Narrator
    await click(answer(el, 'no'));
    expect(G.combat!.log.at(-1)).toMatch(/Established Fact is refused: the use of Established Fact comes back\./);
    await done();
  });
});
