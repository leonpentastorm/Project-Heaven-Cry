// Rules 1.14: the Narrator's answer inside a fight. The small prompt (the fight, the speaker, the words, the rules of
// what it may answer), the answer's schema and its parsing, the three providers (Anthropic, OpenAI-compatible,
// scripted), and the main brief's words about speech in a fight.
import { describe, expect, it } from 'vitest';
import { apply, newGame, ARCHETYPES, active, fightRulingOf, type GameState, type FightRuling } from '@engine';
import { anthropicProvider, scriptedProvider } from './anthropic';
import { openaiProvider, resetQuirks } from './providers';
import { RULES_PROMPT, campaignPrompt, turnPrompt } from './context';
import { FIGHT_SYSTEM, FIGHT_MAX_TOKENS, FIGHT_TIMEOUT_MS, fightAsk, fightTool, fightJsonAsk, parseFightAnswer, scriptedFightAnswer } from './fight';

function fight(perks: any[] = []): { g: GameState; r: FightRuling } {
  let g = newGame('ABC123', { id: 'host', name: 'Leon' });
  const a = ARCHETYPES.find((x: any) => x.id === 'field_medic')!;
  g = apply(g, { type: 'char/add', sheet: { name: 'MPAT', portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } }, 'host');
  const c = Object.values(g.characters)[0]; if (perks.length) g.characters[c.id].perks = perks;
  g = apply(g, { type: 'session/start' }, 'host');
  g = apply(g, { type: 'narrator/turn', turn: { narration: 'Guns.', sceneTitle: 'The rear pad', combat: { name: 'The rear pad', difficulty: 'easy', enemies: [{ name: 'Engineer', tier: 'minion', weapon: 'service_pistol' }, { name: 'Chief Engineer Keel', tier: 'soldier', weapon: 'drifter_revolver' }] } } } as any, 'host');
  const u = g.combat!.units.find((x) => x.side === 'pc')!; g.combat!.turn = g.combat!.order.indexOf(u.id); u.ap = 6; u.downed = false; u.hp = u.maxHp;
  expect(active(g.combat!)!.id).toBe(u.id);
  g = apply(g, { type: 'combat/say', charId: u.charId!, text: 'Keel, think about your crew.' }, 'host');
  if (perks.length) g = apply(g, { type: 'combat/perk', unitId: u.id, id: perks[0].id, text: 'This hull was never rated for a second burn.' } as any, 'host');
  else g = apply(g, { type: 'combat/attempt', unitId: u.id, text: 'Drop the gun, Keel. The ship is already ours.' }, 'host');
  return { g, r: fightRulingOf(g.combat)! };
}
const applied = (g: GameState, r: FightRuling, a: { lines: string[]; effect?: any }) => apply(g, { type: 'narrator/fight-ruling', id: r.id, lines: a.lines, effect: a.effect } as any, 'host');

describe('the fight prompt is small and says exactly what the Narrator may answer', () => {
  it('names the fight, the units with side, HP band and conditions, the speaker, the words and the last log lines', () => {
    const { g, r } = fight(); const p = fightAsk(g, r);
    expect(p).toContain('THE FIGHT: The rear pad, round 1'); expect(p).toMatch(/MPAT \(the speaker\) at [A-Z]+\d+: unhurt/);
    expect(p).toMatch(/Chief Engineer Keel \(enemy, soldier\) at [A-Z]+\d+: unhurt/); expect(p).toMatch(/Engineer \(enemy, minion\)/);
    expect(p).toContain('WHAT THEY ATTEMPT: "Drop the gun, Keel. The ship is already ours."');
    expect(p).toContain('MPAT: "Keel, think about your crew."'); // what was said earlier reaches the Narrator
    expect(p).toMatch(/LAST LINES OF THE FIGHT/);
  });
  it('gives HP as a band, never as numbers, and marks who may surrender without a check', () => {
    const { g, r } = fight(); const keel = g.combat!.units.find((u) => /Keel/.test(u.name))!;
    expect(fightAsk(g, r)).not.toMatch(/\d+\s*\/\s*\d+ HP|\bHP \d/); expect(fightAsk(g, r)).not.toContain('may surrender');
    keel.hp = Math.floor(keel.maxHp / 2);
    expect(fightAsk(g, r)).toMatch(/Chief Engineer Keel .*at half or less; may surrender/);
    keel.conds = { shaken: 2 } as any; expect(fightAsk(g, r)).toMatch(/Chief Engineer Keel .*Shaken/);
  });
  it('is a fraction of a Narrator turn: no campaign, no memory, no map', () => {
    const { g, r } = fight(); const small = FIGHT_SYSTEM.length + fightAsk(g, r).length + JSON.stringify(fightTool(g, r)).length;
    expect(small).toBeLessThan(6500);
    expect(small).toBeLessThan((RULES_PROMPT.length + campaignPrompt(g).length) / 8);
    expect(fightAsk(g, r)).not.toMatch(/ACTIVE MEMORY|THE MAP WHERE|RECENT SCENES/);
    expect(FIGHT_MAX_TOKENS).toBeLessThanOrEqual(600); expect(FIGHT_TIMEOUT_MS).toBe(20000);
  });
  it('never shows a player\'s real name', () => { const { g, r } = fight(); expect(FIGHT_SYSTEM + fightAsk(g, r)).not.toMatch(/Leon/); });
  it('states the rules of the answer: one or two lines, exactly one of four things, and what it never does', () => {
    expect(FIGHT_SYSTEM).toMatch(/ONE or TWO short lines/); expect(FIGHT_SYSTEM).toMatch(/EXACTLY ONE of these, or nothing/);
    for (const k of ['check:', 'condition:', 'surrender:', 'perk:']) expect(FIGHT_SYSTEM).toContain('- ' + k);
    expect(FIGHT_SYSTEM).toMatch(/shaken, taunted \(by the speaker\), lowered .*, hesitates \(it loses 1 AP on its next turn\)/);
    expect(FIGHT_SYSTEM).toMatch(/never deal damage, heal, move anyone, or change AP in any other way/);
    expect(FIGHT_SYSTEM).toMatch(/A check comes first whenever the outcome is in doubt/);
  });
  it('with a perk: its name, its card text and the Narrator\'s part of it', () => {
    const { g, r } = fight([{ id: 'established_fact', tier: 'mastered' }]); const p = fightAsk(g, r);
    expect(p).toContain('THE PERK THEY USED: Established Fact. Its card:'); expect(p).toMatch(/Your part: Established Fact\. Make it true/);
    expect(p).toContain('THEIR WORDS: "This hull was never rated for a second burn."');
  });
});

describe('the answer\'s schema', () => {
  it('is strict: two lines at most, one effect, only this fight\'s enemies, only the four conditions, only the ladder\'s TNs', () => {
    const { g, r } = fight(); const s: any = fightTool(g, r).input_schema, e = s.properties.effect;
    expect(s.additionalProperties).toBe(false); expect(s.required).toEqual(['lines', 'effect']); expect(s.properties.lines.maxItems).toBe(2); expect(s.properties.lines.minItems).toBe(1);
    expect(e.additionalProperties).toBe(false); expect(e.properties.kind.enum).toEqual(['none', 'check', 'condition', 'surrender']);
    expect(e.properties.condition.enum).toEqual(['shaken', 'taunted', 'lowered', 'hesitates']); expect(e.properties.tn.enum).toEqual([8, 12, 16, 20]);
    expect(e.properties.target.enum).toEqual(g.combat!.units.filter((u) => u.side === 'foe').map((u) => u.id));
    expect(Object.keys(e.properties).sort()).toEqual(['accepted', 'condition', 'kind', 'onSuccess', 'skill', 'target', 'tn']); // nothing for damage, healing, movement or AP
    expect(e.properties.onSuccess.properties.kind.enum).toEqual(['none', 'condition', 'surrender']);
  });
  it('offers the perk answer only when a perk asked', () => {
    const { g, r } = fight([{ id: 'established_fact', tier: 'mastered' }]);
    expect((fightTool(g, r).input_schema as any).properties.effect.properties.kind.enum).toContain('perk');
  });
  it('a service without tools gets the same schema in the prompt', () => { const { g, r } = fight(); expect(fightJsonAsk(g, r)).toContain('"maxItems":2'); });
});

describe('parsing the answer', () => {
  it('turns the flat shape into the engine\'s: each of the four kinds, and none', () => {
    expect(parseFightAnswer({ lines: ['He blinks.'], effect: { kind: 'none' } })).toEqual({ lines: ['He blinks.'] });
    expect(parseFightAnswer({ lines: ['a'], effect: { kind: 'check', skill: 'intimidation', tn: 16, onSuccess: { kind: 'condition', target: 'u2', condition: 'shaken' } } }))
      .toEqual({ lines: ['a'], effect: { check: { skill: 'intimidation', tn: 16, onSuccess: { condition: { target: 'u2', id: 'shaken' } } } } });
    expect(parseFightAnswer({ lines: ['a'], effect: { kind: 'check', skill: 'charisma', tn: 12, onSuccess: { kind: 'none' } } }).effect).toEqual({ check: { skill: 'charisma', tn: 12 } });
    expect(parseFightAnswer({ lines: ['a'], effect: { kind: 'condition', target: 'u2', condition: 'hesitates' } }).effect).toEqual({ condition: { target: 'u2', id: 'hesitates' } });
    expect(parseFightAnswer({ lines: ['a'], effect: { kind: 'surrender', target: 'u3' } }).effect).toEqual({ surrender: { target: 'u3' } });
    expect(parseFightAnswer({ lines: ['a'], effect: { kind: 'perk', accepted: false } }).effect).toEqual({ perk: { accepted: false } });
  });
  it('takes the engine\'s own shape too', () => {
    expect(parseFightAnswer({ lines: ['a'], effect: { surrender: { target: 'u3' } } }).effect).toEqual({ surrender: { target: 'u3' } });
    expect(parseFightAnswer({ lines: ['a'], effect: { check: { skill: 'charisma', tn: 8, onSuccess: { surrender: { target: 'u3' } } } } }).effect).toEqual({ check: { skill: 'charisma', tn: 8, onSuccess: { surrender: { target: 'u3' } } } });
  });
  it('keeps two lines at most, short, and strings only', () => {
    const a = parseFightAnswer({ lines: ['  One.  ', 7, 'Two.', 'Three.', 'z'.repeat(999)] });
    expect(a.lines).toEqual(['One.', 'Two.']); expect(parseFightAnswer({ lines: ['z'.repeat(999)] }).lines[0].length).toBe(240);
    expect(parseFightAnswer({ lines: 'A single line.' }).lines).toEqual(['A single line.']);
  });
  it('leaves out anything that is not one of the four (the engine would drop it anyway)', () => {
    for (const effect of [{ kind: 'damage', target: 'u2', amount: 40 }, { kind: 'heal', amount: 10 }, { kind: 'move', to: 'A1' }, { damage: 5 }, 'kill', ['x'], { kind: 'perk' }])
      expect(parseFightAnswer({ lines: ['a'], effect })).toEqual({ lines: ['a'] });
  });
  it('an empty answer is an error (the host gives the attempt back)', () => {
    expect(() => parseFightAnswer(null)).toThrow(/empty/); expect(() => parseFightAnswer({ lines: [], effect: { kind: 'none' } })).toThrow(/empty/);
  });
});

describe('the scripted Narrator answers a fight, so tests and scripts never hang', () => {
  it('a plain attempt: two lines and a standard check that earns Shaken; the engine takes it and shows the dice', async () => {
    const { g, r } = fight(); const { answer, usage } = await scriptedProvider().fight!(g, r);
    expect(answer.lines.length).toBe(2); expect((answer.effect as any).check.tn).toBe(12); expect(usage.costUsd).toBe(0);
    const after = applied(g, r, answer);
    expect(after.combat!.log.some((l) => /^Narrator: /.test(l))).toBe(true); expect(after.combat!.log.some((l) => / CHECK · d20 \d+ [+−] \d+ = -?\d+ vs 12 · [✓✕]/.test(l))).toBe(true);
    expect(fightRulingOf(after.combat)).toBeNull();
  });
  it('the words pick the other answers: a condition, a surrender after a check, nothing at all', () => {
    const { g, r } = fight(); const foe = g.combat!.units.find((u) => u.side === 'foe')!;
    expect(scriptedFightAnswer(g, { ...r, text: 'I taunt him.' }).effect).toEqual({ condition: { target: foe.id, id: 'taunted' } });
    expect(scriptedFightAnswer(g, { ...r, text: 'Lower it.' }).effect).toEqual({ condition: { target: foe.id, id: 'lowered' } });
    expect(scriptedFightAnswer(g, { ...r, text: 'You hesitate.' }).effect).toEqual({ condition: { target: foe.id, id: 'hesitates' } });
    expect((scriptedFightAnswer(g, { ...r, text: 'Surrender!' }).effect as any).check.onSuccess).toEqual({ surrender: { target: foe.id } });
    expect(scriptedFightAnswer(g, { ...r, text: 'just talk' }).effect).toBeUndefined();
  });
  it('a perk: yes, or no when the words say "refuse"; the no gives the use back', async () => {
    const { g, r } = fight([{ id: 'established_fact', tier: 'mastered' }]);
    expect((await scriptedProvider().fight!(g, r)).answer.effect).toEqual({ perk: { accepted: true } });
    const no = scriptedFightAnswer(g, { ...r, text: 'refuse this' }); expect(no.effect).toEqual({ perk: { accepted: false } });
    expect(applied(g, r, no).combat!.log.at(-1)).toMatch(/Established Fact is refused: the use of Established Fact comes back/);
  });
});

describe('the Anthropic adapter\'s fight call', () => {
  const ok = (body: any) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json', 'request-id': 'req_test' } });
  const msg = (content: any[]) => ({ id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5-5', stop_reason: 'tool_use', stop_sequence: null, content, usage: { input_tokens: 700, output_tokens: 80, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } });
  it('is one small request: the fight system text, one tool, a short reply, low effort; its cost is counted', async () => {
    const { g, r } = fight(); const bodies: any[] = [];
    const fake = (async (_u: any, init: any) => { bodies.push(JSON.parse(init.body)); return ok(msg([{ type: 'tool_use', id: 'tu_1', name: 'submit_fight_answer', input: { lines: ['Keel\'s jaw works.'], effect: { kind: 'check', skill: 'intimidation', tn: 16, onSuccess: { kind: 'surrender', target: g.combat!.units.find((u) => /Keel/.test(u.name))!.id } } } }])); }) as typeof fetch;
    const { answer, usage } = await anthropicProvider('sk-test', 'claude-opus-5-5', 'high', fake).fight!(g, r);
    expect(bodies.length).toBe(1); const b = bodies[0];
    expect(b.system).toHaveLength(1); expect(b.system[0].text).toBe(FIGHT_SYSTEM); expect(b.tools.map((t: any) => t.name)).toEqual(['submit_fight_answer']);
    expect(b.max_tokens).toBe(FIGHT_MAX_TOKENS); expect(b.output_config.effort).toBe('low'); expect(b.messages).toHaveLength(1);
    expect(JSON.stringify(b).length).toBeLessThan(9000);
    expect(answer.lines).toEqual(['Keel\'s jaw works.']); expect((answer.effect as any).check.onSuccess.surrender.target).toBeTruthy();
    expect(usage.input).toBe(700); expect(usage.costUsd).toBeCloseTo((700 * 4 + 80 * 20) / 1e6, 8);
    expect(applied(g, r, answer).combat!.log.some((l) => /INTIMIDATION CHECK/.test(l))).toBe(true);
  });
  it('a reply in plain JSON or plain words still gives lines', async () => {
    const { g, r } = fight();
    const json = (async () => ok(msg([{ type: 'text', text: '{"lines":["No."],"effect":{"kind":"none"}}' }]))) as typeof fetch;
    expect((await anthropicProvider('sk-test', 'claude-opus-5-5', 'low', json).fight!(g, r)).answer).toEqual({ lines: ['No.'] });
    const words = (async () => ok(msg([{ type: 'text', text: 'Keel spits on the deck.' }]))) as typeof fetch;
    expect((await anthropicProvider('sk-test', 'claude-opus-5-5', 'low', words).fight!(g, r)).answer).toEqual({ lines: ['Keel spits on the deck.'] });
  });
  it('an empty reply is an error that still carries what it cost', async () => {
    const { g, r } = fight(); const empty = (async () => ok(msg([]))) as typeof fetch;
    const e: any = await anthropicProvider('sk-test', 'claude-opus-5-5', 'low', empty).fight!(g, r).catch((x) => x);
    expect(e).toBeInstanceOf(Error); expect(e.usage.input).toBe(700);
  });
  it('a refused key is an error, with no retry (the fight is waiting)', async () => {
    const { g, r } = fight(); let n = 0;
    const bad = (async () => { n++; return new Response(JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }), { status: 401, headers: { 'content-type': 'application/json' } }); }) as typeof fetch;
    await expect(anthropicProvider('sk-bad', 'claude-opus-5-5', 'low', bad).fight!(g, r)).rejects.toThrow(/rejected the API key/); expect(n).toBe(1);
  });
});

describe('the OpenAI-compatible adapter\'s fight call', () => {
  const reply = (message: any) => new Response(JSON.stringify({ choices: [{ message, finish_reason: 'stop' }], usage: { prompt_tokens: 650, completion_tokens: 70 } }), { status: 200, headers: { 'content-type': 'application/json' } });
  it('one request with the one tool; tokens are counted', async () => {
    resetQuirks(); const { g, r } = fight(); const bodies: any[] = []; const foe = g.combat!.units.find((u) => u.side === 'foe')!;
    const fake = (async (_u: any, init: any) => { bodies.push(JSON.parse(init.body)); return reply({ role: 'assistant', content: null, tool_calls: [{ id: 'c1', type: 'function', function: { name: 'submit_fight_answer', arguments: JSON.stringify({ lines: ['It flinches.'], effect: { kind: 'condition', target: foe.id, condition: 'shaken' } }) } }] }); }) as typeof fetch;
    const { answer, usage } = await openaiProvider({ label: 'Test', baseUrl: 'https://x.test/v1', apiKey: 'k', model: 'm', fetchImpl: fake }).fight!(g, r);
    expect(bodies.length).toBe(1); expect(bodies[0].tools).toHaveLength(1); expect(bodies[0].messages[0].content).toBe(FIGHT_SYSTEM); expect(bodies[0].max_tokens).toBe(FIGHT_MAX_TOKENS);
    expect(answer).toEqual({ lines: ['It flinches.'], effect: { condition: { target: foe.id, id: 'shaken' } } }); expect(usage).toMatchObject({ input: 650, output: 70, costUsd: 0 });
  });
  it('a JSON answer in the text is read too', async () => {
    resetQuirks(); const { g, r } = fight();
    const fake = (async () => reply({ role: 'assistant', content: '```json\n{"lines":["Nothing."],"effect":{"kind":"none"}}\n```' })) as typeof fetch;
    expect((await openaiProvider({ label: 'Test', baseUrl: 'https://x.test/v1', apiKey: 'k', model: 'm', fetchImpl: fake }).fight!(g, r)).answer).toEqual({ lines: ['Nothing.'] });
  });
});

describe('the Narrator\'s main brief', () => {
  it('says speech in a fight is free, an attempt is answered inside the fight, and never ruled on twice', () => {
    expect(RULES_PROMPT).toMatch(/Speech in a fight is free and has no effect on it/);
    expect(RULES_PROMPT).toMatch(/An attempt \(words that want something to happen; 1 AP, once a turn\) is answered inside the fight in its own short call, and so is a perk that asks for words/);
    expect(RULES_PROMPT).toMatch(/never rule on them a second time/);
    expect(RULES_PROMPT).not.toMatch(/Rule on those in your aftermath/);
  });
  it('the after-fight job follows answered attempts through instead of ruling on them', () => {
    const { g, r } = fight(); let after = applied(g, r, { lines: ['He does not.'] });
    after = { ...after, story: { ...after.story, work: { kind: 'combat_end', note: (after.combat!.notes || []).join('\n') } as any } };
    const p = turnPrompt(after);
    expect(p).toMatch(/answered in the fight: He does not\./); expect(p).toMatch(/lines marked "answered in the fight" are settled/); expect(p).not.toMatch(/rule on anything said or attempted mid-fight/);
  });
});
