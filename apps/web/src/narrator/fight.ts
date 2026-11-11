// The Narrator's answer inside a fight (rules 1.14). A player made an attempt (1 AP, once a turn) or used a perk that
// asks for words, and the fight waits. This is a SMALL call, not a Narrator turn: no campaign, no memory, no lookups.
// The prompt is the fight as it stands, the words, and the exact list of what the answer may ask the engine for; the
// answer comes back through one tool (or as JSON), is reshaped here, and the engine validates it again before anything
// happens (narrator/fight-ruling). Nothing here sets a number.
import { FIGHT_CONDS, FIGHT_COND_NAME, SKILL, TN_LADDER, condName, condOn, refOf, talkOf, type FightEffect, type FightRuling, type GameState, type Unit } from '@engine';

/** How long the host waits for a fight answer before the attempt is given back (ms). */
export const FIGHT_TIMEOUT_MS = 20_000;
/** The reply's size: two short lines and one small effect. */
export const FIGHT_MAX_TOKENS = 500;
export interface FightAnswerOut { lines: string[]; effect?: FightEffect }
export interface FightResult { answer: FightAnswerOut; usage: { input: number; output: number; cacheRead: number; costUsd: number } }

export const FIGHT_SYSTEM = `You are the Narrator of Project Heaven Cry, a tactical RPG. A fight is running and a player's character has just said or tried something that wants an answer. The fight is paused until you answer, so answer now and briefly.

Answer with ONE or TWO short lines (each under 200 characters): what the enemy says or does in reply, or what the character notices. Present tense, in the world, no numbers, no rules talk, no real-world names. Never speak or decide for a player's character.

After the lines you may ask the rules engine for EXACTLY ONE of these, or nothing (kind "none"):
- check: the speaker rolls a skill you name against a TN you set (8 easy, 12 standard, 16 hard, 20 heroic). The engine rolls it. You may add onSuccess: one condition or one surrender that the success earns. Write your lines so they fit either result (the dice come after you).
- condition: ONE condition on ONE enemy for ONE round, from this list only: shaken, taunted (by the speaker), lowered (its weapon is lowered), hesitates (it loses 1 AP on its next turn).
- surrender: ONE enemy stops fighting. Only an enemy marked "may surrender" below. A healthier enemy surrenders only as the onSuccess of a check.
- perk: only when the player used a perk: accepted true, or false (the player gets the use and the AP back).

You never deal damage, heal, move anyone, or change AP in any other way. The engine keeps every number; anything else you ask for is thrown away.
A check comes first whenever the outcome is in doubt. A condition or a surrender with no check is only for what the fight has already earned (a beaten enemy, a threat the squad just carried out).
Plain speech, a taunt with nothing behind it, or words nobody could hear: answer with lines and kind "none".`;

const band = (u: Unit) => (u.dead ? 'dead' : u.surrendered ? 'surrendered' : u.downed ? 'down' : u.hp >= u.maxHp ? 'unhurt' : u.hp > u.maxHp / 2 ? 'hurt' : u.hp > u.maxHp / 4 ? 'at half or less' : 'nearly down');
const condsOf = (u: Unit) => Object.keys(u.conds || {}).filter((c) => condOn(u, c)).map((c) => condName(c)).join(', ');
const NEVER = ['machine', 'robot', 'turret', 'drone'];
/** May this enemy be named in a surrender with no check (the engine checks again)? */
const yields = (u: Unit) => u.hp <= u.maxHp / 2 && u.tier !== 'boss' && !NEVER.includes(u.kind || '') && !(u.tags || []).includes('no_surrender');
/** The enemies the speaker may name: still in the fight, on the other side. */
export function fightTargets(g: GameState, r: FightRuling): Unit[] {
  const cb = g.combat, u = cb?.units.find((x) => x.id === r.unit); if (!cb || !u) return [];
  return cb.units.filter((x) => x.side !== u.side && !x.dead && !x.surrendered);
}

/** The user message: the fight in a few lines, the speaker, the words, the perk's card if one, and the last log lines. */
export function fightAsk(g: GameState, r: FightRuling): string {
  const cb = g.combat!, u = cb.units.find((x) => x.id === r.unit), c = g.characters[r.charId];
  const units = cb.units.filter((x) => !x.dead).map((x) => `- ${x.id} ${x.name} (${x.side === (u?.side || 'pc') ? (x.id === r.unit ? 'the speaker' : 'ally') : 'enemy'}${x.tier && x.side !== (u?.side || 'pc') ? ', ' + x.tier : ''}${x.kind && x.kind !== 'human' ? ', ' + x.kind : ''}) at ${refOf(x.pos)}: ${band(x)}${condsOf(x) ? '; ' + condsOf(x) : ''}${x.side !== (u?.side || 'pc') && !x.surrendered && yields(x) ? '; may surrender' : ''}`).join('\n');
  const skills = c ? Object.entries(c.skills).filter(([, p]) => (p as number) > 0).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 10).map(([s, p]) => `${s} ${p}`).join(', ') : '';
  const said = (talkOf(cb).said || []).slice(-4).map((s) => `- ${s.who}: "${s.text}"`).join('\n');
  // The engine's own log, newest last, without the attempt itself (it is quoted below) and without older Narrator lines' dice.
  const recent = cb.log.slice(-9).filter((l) => !l.includes('"' + r.text + '"')).slice(-7).map((l) => '- ' + l.slice(0, 220)).join('\n');
  const perk = r.perk ? `\n\nTHE PERK THEY USED: ${r.perk.name}. Its card: ${r.perk.card}${r.perk.ask ? '\nYour part: ' + r.perk.ask : ''}${r.perk.target ? '\nAimed at: ' + (cb.units.find((x) => x.id === r.perk!.target)?.name || r.perk.target) + ' (' + r.perk.target + ')' : ''}\nAnswer with kind "perk" (accepted true or false), unless a check should decide it.` : '';
  return `THE FIGHT: ${cb.name}, round ${cb.round}. Scene: ${g.story.scene.title || 'unnamed'}.\n\nWHO IS IN IT (id, name, side, where, how hurt):\n${units}\n\nTHE SPEAKER: ${u?.name || c?.name || 'a character'} (${r.unit})${skills ? '. Their skills (id and points): ' + skills : ''}.\n\nLAST LINES OF THE FIGHT (oldest first):\n${recent || '- (the fight has just begun)'}${said ? '\n\nSAID EARLIER IN THIS FIGHT:\n' + said : ''}${perk}\n\n${r.perk ? 'THEIR WORDS' : 'WHAT THEY ATTEMPT'}: "${r.text}"\n\nAnswer now with submit_fight_answer. Skill ids: ${Object.keys(SKILL).join(', ')}.`;
}

/** The answer's tool: a flat effect (kind + the fields that kind uses), with the ids of this fight filled in. */
export function fightTool(g: GameState, r: FightRuling) {
  const targets = fightTargets(g, r).map((u) => u.id), kinds = ['none', 'check', 'condition', 'surrender', ...(r.perk ? ['perk'] : [])];
  const target = { type: 'string', ...(targets.length ? { enum: targets } : {}), description: 'An enemy unit id from WHO IS IN IT' };
  const condition = { type: 'string', enum: [...FIGHT_CONDS], description: FIGHT_CONDS.map((c) => c + ' = ' + FIGHT_COND_NAME[c]).join('; ') };
  return {
    name: 'submit_fight_answer', description: 'Hand in your answer to the words said in the fight: one or two short lines, and at most one effect for the engine.',
    input_schema: { type: 'object', additionalProperties: false, required: ['lines', 'effect'], properties: {
      lines: { type: 'array', minItems: 1, maxItems: 2, items: { type: 'string', maxLength: 200 } },
      effect: { type: 'object', additionalProperties: false, required: ['kind'], properties: {
        kind: { type: 'string', enum: kinds },
        skill: { type: 'string', enum: Object.keys(SKILL), description: 'check only: the skill the speaker rolls' },
        tn: { type: 'integer', enum: [...TN_LADDER], description: 'check only' },
        onSuccess: { type: 'object', additionalProperties: false, required: ['kind'], description: 'check only: what a success earns',
          properties: { kind: { type: 'string', enum: ['none', 'condition', 'surrender'] }, target, condition } },
        target, condition,
        accepted: { type: 'boolean', description: 'perk only' },
      } },
    } },
  };
}
/** The same request for a service that can't call tools: one JSON object in the reply. */
export const fightJsonAsk = (g: GameState, r: FightRuling) => fightAsk(g, r) + '\n\nYou cannot call tools here. Answer with ONLY one JSON object (no prose, no code fence) matching this JSON schema:\n' + JSON.stringify(fightTool(g, r).input_schema);

const outcome = (e: any): any => (!e || typeof e !== 'object' ? null
  : e.kind === 'condition' ? { condition: { target: String(e.target ?? ''), id: String(e.condition ?? e.id ?? '') } }
  : e.kind === 'surrender' ? { surrender: { target: String(e.target ?? '') } }
  : e.condition && typeof e.condition === 'object' ? { condition: { target: String(e.condition.target ?? ''), id: String(e.condition.id ?? '') } }
  : e.surrender && typeof e.surrender === 'object' ? { surrender: { target: String(e.surrender.target ?? '') } } : null);
/** Reshape a model's reply into the engine's answer: lines (strings only, two at most) and one effect in the engine's
 *  shape. It accepts the tool's flat shape and the engine's own; everything else is left out (the engine validates what
 *  is left). Throws when there is nothing to show. */
export function parseFightAnswer(raw: any): FightAnswerOut {
  const j = raw && typeof raw === 'object' ? raw : {};
  const lines = (Array.isArray(j.lines) ? j.lines : typeof j.lines === 'string' ? [j.lines] : typeof j.line === 'string' ? [j.line] : [])
    .filter((x: any) => typeof x === 'string').map((x: string) => x.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 2).map((x: string) => x.slice(0, 240));
  const e = j.effect && typeof j.effect === 'object' && !Array.isArray(j.effect) ? j.effect : null;
  let effect: any = null;
  if (e) {
    if (e.kind === 'check' || (e.check && typeof e.check === 'object')) { const k = e.kind === 'check' ? e : e.check, on = outcome(k.onSuccess); effect = { check: { skill: String(k.skill ?? ''), tn: Number(k.tn), ...(on ? { onSuccess: on } : {}) } }; }
    else if (e.kind === 'perk' || (e.perk && typeof e.perk === 'object')) { const a = e.kind === 'perk' ? e.accepted : e.perk.accepted; if (typeof a === 'boolean') effect = { perk: { accepted: a } }; }
    else effect = outcome(e);
  }
  if (!lines.length && !effect) throw new Error('The Narrator\'s answer was empty.');
  return { lines, ...(effect ? { effect } : {}) };
}

/** The scripted Narrator's fight answer (tests, the e2e scripts, offline demos): it never waits and never hangs. The
 *  words pick the answer: "refuse" says no to a perk; "taunt", "lower", "hesitate" put that condition on the first
 *  enemy; "surrender" asks for a check that earns a surrender; anything else is a standard check that earns Shaken. */
export function scriptedFightAnswer(g: GameState, r: FightRuling): FightAnswerOut {
  const foe = fightTargets(g, r)[0], c = g.characters[r.charId], w = r.text.toLowerCase();
  const best = (ids: string[]) => ids.slice().sort((a, b) => (c?.skills[b] || 0) - (c?.skills[a] || 0))[0];
  if (r.perk) return /refuse/.test(w) ? { lines: ['Nothing here bears that out.'], effect: { perk: { accepted: false } } } : { lines: ['It lands as you meant it to.'], effect: { perk: { accepted: true } } };
  if (!foe) return { lines: ['Nobody is left to hear it.'] };
  if (/just talk|nothing/.test(w)) return { lines: [foe.name + ' says nothing back.'] };
  for (const [re, id] of [[/taunt/, 'taunted'], [/lower/, 'lowered'], [/hesitat/, 'hesitates']] as const) if (re.test(w)) return { lines: [foe.name + ' hears you.'], effect: { condition: { target: foe.id, id } } };
  if (/surrender|give up/.test(w)) return { lines: [foe.name + ' looks at the others, then back at you.'], effect: { check: { skill: best(['charisma', 'authority', 'intimidation']), tn: 12, onSuccess: { surrender: { target: foe.id } } } } };
  return { lines: [foe.name + ' hears every word.', 'Whether it matters is another thing.'], effect: { check: { skill: best(['intimidation', 'charisma', 'eloquence']), tn: 12, onSuccess: { condition: { target: foe.id, id: 'shaken' } } } } };
}
