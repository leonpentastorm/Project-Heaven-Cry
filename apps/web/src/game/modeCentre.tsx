// The mode's centre (rules 1.54 item 11; ui-screens.md "The three columns (every mode)"): every mode plays on the one
// play screen (main.template.html), the character sheet on the left and the mode's right panel on the right; the mode's
// own content is the middle. The middle is the template's centre slot ([data-phc-centre], the slot the Proving Ground's
// tools have used since 9 Nov), filled through a portal; while it is filled the story column and its input bar are
// hidden. The right panel's modules that React draws (panels.tsx) are portalled into their own slots the same way.
// Mounted once in App.tsx.
import React from 'react';
import { createPortal } from 'react-dom';
import type { GameState } from '@engine';
import { RunScreen } from './RunScreen';

/** Render children into a node of the screen's template (found again after every render: the template remounts it). */
export function Portal({ at, children }: { at: string; children: React.ReactNode }) {
  const [host, setHost] = React.useState<Element | null>(null);
  React.useLayoutEffect(() => { const el = document.querySelector(at); if (el !== host) setHost(el); });
  return host && host.isConnected ? createPortal(children, host) : null;
}

const CSS = '.phc-sb-centre[data-centre-on]{display:flex!important;flex:1;min-height:0;overflow:auto;flex-direction:column}'
  + 'main[aria-label="Story"]>.phc-story[data-centre-off],main[aria-label="Story"]>.phc-input[data-centre-off]{display:none!important}';

/** What fills the middle in this game: a Survival run's screens (the path map, the camp, a shop, a place, the rewards,
 * the stage's end, the summary), or nothing (the story, or the Proving Ground's own tools). */
export const centreOf = (g: GameState | null | undefined, screen: string): 'run' | null => (g && g.run && screen === 'main' ? 'run' : null);

export function ModeCentre({ game, screen }: { game: GameState | null; screen: string }) {
  React.useEffect(() => { if (document.getElementById('phc-centre-css')) return; const s = document.createElement('style'); s.id = 'phc-centre-css'; s.textContent = CSS; document.head.appendChild(s); }, []);
  const on = centreOf(game, screen);
  // The state is set on the nodes themselves (as the Proving Ground does): a screen change copies the old screen into a
  // shadow root, where a class on <html> can't reach.
  React.useLayoutEffect(() => {
    if (!on) return;
    const story = document.querySelector('main[aria-label="Story"]>.phc-story'), input = document.querySelector('main[aria-label="Story"]>.phc-input'), centre = document.querySelector('[data-phc-centre]');
    story?.setAttribute('data-centre-off', '1'); input?.setAttribute('data-centre-off', '1'); centre?.setAttribute('data-centre-on', on);
    return () => { story?.removeAttribute('data-centre-off'); input?.removeAttribute('data-centre-off'); centre?.removeAttribute('data-centre-on'); };
  });
  if (!on) return null;
  return <Portal at="[data-phc-centre]"><RunScreen /></Portal>;
}
