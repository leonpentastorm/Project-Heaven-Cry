// What every Narrator provider shares (anthropic.ts and providers.ts): the lookup limit, and the reword and Polish
// prompts. Kept apart from the providers so a test can mock one provider without losing these.
import type { GameState } from '@engine';

/** Wiki and recall lookups per Narrator turn before it must answer. */
export const MAX_LOOKUPS = 3;

export const REWRITE_TOOL = { name: 'submit_rewrite', description: 'Hand in the reworded line, or refuse.', input_schema: { type: 'object', properties: { text: { type: 'string' }, refused: { type: 'string', description: 'Empty if you reworded it; otherwise why the request would change what happened' } }, required: ['text', 'refused'] } };
export const REWRITE_SYSTEM = 'You are the Narrator of a tabletop RPG. The players voted to have one of your lines reworded. You may change wording, tone, emphasis, pacing, and descriptive detail that changes no outcome. You must NOT add, remove or change anything the game tracks or that happened: items, money, loot, injuries, deaths, HP, positions, who did what, results of rolls or fights, promises made, or new events. If the request asks for any of that (or for something absurd, out of character, or naming the players instead of their characters), refuse: return the original line unchanged and say why in refused. Keep the same length, give or take a third. Never name a real-world person, brand or work. Call submit_rewrite.';
export const rewriteAsk = (g: GameState, text: string, ask: string) => 'THE LINE:\n' + text + '\n\nWHAT THE PLAYERS ASKED:\n' + (ask || 'Tell it better.') + '\n\nRECENT STORY FOR CONTEXT:\n' + g.story.entries.filter((e) => e.kind === 'narration' && !e.rerolled).slice(-4).map((e) => e.text).join('\n---\n');

export const POLISH_SYSTEM = 'Rewrite a tabletop player\'s action as one to three vivid sentences of in-world prose about their character, third person, present tense. Keep every intention and every spoken line; add no new facts, outcomes or names. No real-world names. Reply with the prose only.';
export const polishAsk = (text: string, charName: string) => 'Character: ' + (charName || 'the character') + '\nPlayer wrote: ' + text;
