// The cog's Fight tabs panel (Leon, 16 Nov 2026): a character's fight tabs as a list, each with move up / move down
// and Show / Hide, and Reset to default. The same panel in a fight and out of one (the map, a shop, the camp): the
// cog is one dialog everywhere (game/settings.tsx). Which tabs a character has is the fight screen's (the engine's
// action list, recorded in game/tabPrefs.ts the first time a fight shows each one); this panel only arranges them.
// A display preference kept in this browser: never game state, never sent to the room.
import React from 'react';
import { active } from '@engine';
import { getState, subscribe } from './store';
import { TAB_NAME, tabIdsKnown } from './commands';
import { loadTabPrefs, saveTabPrefs, withPresent, moveTab, setHidden, hideWhy, resetTabs, tabKey, liveTabs, EV_TABS_CHANGED, type TabPrefs } from './tabPrefs';

const C = { raised: '#1C2536', line: '#232D3F', edge: '#3B475D', text: '#E7EBF3', muted: '#A3AEC2', white: '#FFFFFF' };
const note: React.CSSProperties = { fontSize: 'var(--fs-sub)', lineHeight: 1.45, color: C.muted };
const btn = (on = false, off = false): React.CSSProperties => ({ minHeight: 30, minWidth: 34, padding: '0 10px', borderRadius: 8, border: '1px solid ' + (on ? C.text : '#2E3A50'), background: on ? C.raised : 'transparent', color: off ? '#5D6A80' : on ? C.white : C.text, fontFamily: 'inherit', fontSize: 'var(--fs-sub)', fontWeight: 600, cursor: off ? 'default' : 'pointer' });

/** The characters this player controls in the game open now (none: no game). */
export function myCharacters(st: any = getState()): any[] {
  const g = st?.game, me = st?.me?.id;
  return g && g.characters ? Object.values(g.characters).filter((c: any) => c && c.owner === me) : [];
}
/** The character the panel opens on: the one acting in the fight when it is this player's, else the first. */
export function defaultCharacter(st: any = getState()): string | null {
  const mine = myCharacters(st), g = st?.game;
  let acting: string | null = null; try { acting = g?.combat ? active(g.combat)?.charId || null : null; } catch { acting = null; }
  return (acting && mine.some((c) => c.id === acting) ? acting : mine[0]?.id) || null;
}

export function FightTabsPanel() {
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => subscribe(force), []);
  React.useEffect(() => { window.addEventListener(EV_TABS_CHANGED, force); return () => window.removeEventListener(EV_TABS_CHANGED, force); }, []);
  const st = getState(), g = st.game, mine = myCharacters(st);
  const [pick, setPick] = React.useState<string | null>(() => defaultCharacter(st));
  const charId = pick && mine.some((c) => c.id === pick) ? pick : defaultCharacter(st);
  if (!g || !charId) return <span style={note}>Each character you play keeps its own fight tabs: their order, and which ones show. Join or start a game to arrange them.</span>;
  const key = tabKey(charId), p: TabPrefs = withPresent(loadTabPrefs(key), [], tabIdsKnown());
  // In a fight: the tabs this character has now and the bar's order as the fight screen last drew them (the number keys
  // are positions on that bar). A tab it does not have this fight is marked and not numbered.
  const lv = g.combat ? liveTabs(key) : null;
  const save = (q: TabPrefs) => saveTabPrefs(key, q);
  const name = (id: string) => TAB_NAME[id] || id.charAt(0).toUpperCase() + id.slice(1);
  let shownN = 0;
  return <>
    <span style={note}>The tabs of a fight's action panel, for one character: their order, and which ones show. Number keys follow the order shown (1 is the first tab shown). Until you arrange them, a tab the character gets later takes its usual place; once arranged, it goes at the end. A hidden Outbursts tab still shows while an Outburst is held. Yours only, kept in this browser, for this character in any room.</span>
    {mine.length > 1 && <div role="group" aria-label="Character" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {mine.map((c) => <button key={c.id} type="button" data-phc-tabs-char={c.id} aria-pressed={c.id === charId} onClick={() => setPick(c.id)} style={btn(c.id === charId)}>{c.name}</button>)}
    </div>}
    {!p.order.length
      ? <span style={note}>{(mine.find((c) => c.id === charId)?.name || 'This character') + '’s tabs show here after its first fight.'}</span>
      : <ol data-phc-fight-tabs={charId} style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {p.order.map((id, i) => {
          const hidden = p.hidden.includes(id), absent = !!lv && !lv.present.includes(id), why = hidden ? null : hideWhy(p, id);
          const n = lv ? (lv.shown.includes(id) ? String(lv.shown.indexOf(id) + 1) : '') : hidden ? '' : String(++shownN);
          return <li key={id} data-phc-fight-tab={id} data-phc-tab-absent={absent ? '' : undefined} style={{ display: 'grid', gridTemplateColumns: '22px minmax(0, 1fr) auto auto auto', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 8, border: '1px solid ' + C.line, opacity: hidden || absent ? 0.6 : 1 }}>
            <span aria-hidden style={{ fontSize: 'var(--fs-sub)', fontWeight: 600, color: C.muted, textAlign: 'center' }}>{n && Number(n) <= 9 ? n : ''}</span>
            <span style={{ fontSize: 'var(--fs-body)', fontWeight: 700, letterSpacing: '0.06em' }}>{name(id)}{hidden ? <span style={{ ...note, marginLeft: 8 }}>hidden</span> : null}{absent ? <span style={{ ...note, marginLeft: 8 }}>not this fight</span> : null}</span>
            <button type="button" aria-label={'Move ' + name(id) + ' up'} disabled={i === 0} onClick={() => save(moveTab(p, id, -1))} style={btn(false, i === 0)}>↑</button>
            <button type="button" aria-label={'Move ' + name(id) + ' down'} disabled={i === p.order.length - 1} onClick={() => save(moveTab(p, id, 1))} style={btn(false, i === p.order.length - 1)}>↓</button>
            <button type="button" data-phc-tab-show={id} aria-pressed={!hidden} disabled={!!why} aria-label={(hidden ? 'Show ' : 'Hide ') + name(id) + (why ? ': ' + why : '')} onClick={() => save(setHidden(p, id, !hidden))} style={btn(!hidden, !!why)}>{hidden ? 'Show' : 'Hide'}</button>
          </li>;
        })}
      </ol>}
    {!!p.order.length && <div><button type="button" data-phc-tabs-reset="" disabled={!p.custom} onClick={() => save(resetTabs(p, tabIdsKnown()))} style={btn(false, !p.custom)}>Reset to default</button></div>}
  </>;
}
