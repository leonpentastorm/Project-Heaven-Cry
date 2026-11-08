// Speaks each new Narrator line in this player's browser (spec: The Narrator's voice). Lines already in the log when
// the screen opens are not read; new ones are held until their voice is ready, then shown as it starts.
import React from 'react';
import type { GameState } from '@engine';
import { hold, loadVoice, speak, voicePrefs } from './voice';

export function NarratorVoice({ game }: { game: GameState | null }) {
  const seen = React.useRef<Set<string> | null>(null);
  const entries = game?.story.entries || [];
  React.useEffect(() => {
    if (!game || game.phase === 'lobby') return;
    if (voicePrefs().install) loadVoice(); // installed (or opted in): load it from the cache before the first line
    if (!seen.current) { seen.current = new Set(entries.map((e) => e.id)); return; }
    const fresh = entries.filter((e) => !seen.current!.has(e.id));
    for (const e of fresh) seen.current.add(e.id);
    const line = fresh.filter((e) => e.kind === 'narration' && !e.rerolled && !e.ooc).at(-1);
    if (line && voicePrefs().auto) { hold(line.id); speak(line.id, line.text); }
  }, [entries.length, entries.at(-1)?.id, game?.phase]);
  return null;
}
