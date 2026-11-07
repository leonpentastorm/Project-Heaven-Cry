// The turn card's four commands, customised: which actions the your-turn cut-in (and the mini-bar when the combat
// panel is hidden) offers on keys 1–4, per character. Opened from the cut-in ("Customise", or C) and from the combat
// panel's "⚙ Customise" (window event 'phc:customise-cmds'); mounted by TurnIntro (game/turnIntro.tsx).
//
// The list is the combat panel's own (game/commands.ts actionGroups), so whatever the tabs offer can be a command. An
// empty slot keeps the smart default for that slot. Saved in this browser per character (a UI preference, not game
// state): nothing here goes to the room.
import React from 'react';
import { type GameState } from '@engine';
import { ART } from '../screens/shared';
import { castFight } from './cast';
import { catalogue, readPrefs, resolveCommands, writePrefs, TAB_NAME, type CatEntry } from './commands';
import { SIGIL_INK, SOUL_INK } from './glyphs';

const INK: Record<string, string> = { attack: '#F65157', sigils: SIGIL_INK, outbursts: SOUL_INK };
const UI = "'Chakra Petch', sans-serif";
const btn = (on = false): React.CSSProperties => ({ minHeight: 36, padding: '0 14px', borderRadius: 8, border: '1px solid ' + (on ? '#E7EBF3' : '#2E3A50'), background: on ? '#E7EBF3' : 'transparent', color: on ? '#0A0D13' : '#E7EBF3', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, cursor: 'pointer' });
const mini: React.CSSProperties = { display: 'grid', placeItems: 'center', width: 24, height: 24, padding: 0, borderRadius: 6, border: '1px solid #2E3A50', background: 'transparent', color: '#C9D3E3', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer' };

/** Four borders with a heavier left one (no shorthand mixed with longhand: React warns when they change). */
const edges = (all: string, left: string): React.CSSProperties => ({ borderTop: all, borderRight: all, borderBottom: all, borderLeft: left });
/** Actions that make no sense as a command (an always-on weapon skill, one the Narrator rules) stay off the list. */
const pickable = (e: CatEntry) => !(e.action === 'skill' && e.why && /Always on|Narrator rules/.test(e.why));

export function CommandsDialog({ game, charId, onClose }: { game: GameState | null; charId: string; onClose: () => void }) {
  const cb: any = game?.combat || null;
  const cast: any = game && cb ? castFight(game, cb, ART) || cb : null;
  const u = cast ? cast.units.find((x: any) => x.charId === charId && !x.dead) || null : null;
  const ch: any = game ? (game.characters as any)[charId] || null : null;
  const cat = u ? catalogue(cast, u, ch).filter(pickable) : [];
  const by = new Map(cat.map((e) => [e.action, e]));
  const [slots, setSlots] = React.useState<(string | null)[]>(() => readPrefs(charId));
  const [at, setAt] = React.useState(0);
  const shown = u ? resolveCommands(cast, u, ch, slots) : [];
  const box = React.useRef<HTMLDivElement | null>(null);

  // Focus: into the dialog on open, kept inside it (Tab wraps), back where it was on close. Escape closes.
  React.useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const first = box.current?.querySelector<HTMLElement>('[data-slot="1"]') || box.current;
    first?.focus?.();
    return () => { try { if (before && document.contains(before)) before.focus(); } catch { /* */ } };
  }, []);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); return; }
    if (e.key !== 'Tab' || !box.current) return;
    const f = Array.from(box.current.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]'));
    if (!f.length) return;
    const i = f.indexOf(document.activeElement as HTMLElement), n = f.length;
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[n - 1].focus(); } else if (!e.shiftKey && i === n - 1) { e.preventDefault(); f[0].focus(); }
  };

  const put = (action: string) => setSlots((s) => {
    const next = [...s], j = next.indexOf(action);
    if (j >= 0 && j !== at) next[j] = next[at]; // already in another slot: the two swap
    next[at] = action;
    return next;
  });
  const pick = (action: string) => { put(action); setAt((a) => Math.min(3, a + 1)); };
  const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j > 3) return; setSlots((s) => { const n = [...s]; [n[i], n[j]] = [n[j], n[i]]; return n; }); setAt(j); };
  const clear = (i: number) => setSlots((s) => { const n = [...s]; n[i] = null; return n; });
  const save = () => { writePrefs(charId, slots); onClose(); };

  const name = ch?.name || u?.name || 'this character';
  const tabs = Array.from(new Set(cat.map((e) => e.tab)));
  return (
    <div onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'grid', placeItems: 'center', padding: 12, background: 'rgba(5, 7, 11, 0.82)', fontFamily: UI, color: '#E7EBF3' }}>
      <div ref={box} role="dialog" aria-modal="true" aria-labelledby="phc-cmds-title" data-phc-cmds-dialog="" tabIndex={-1} onKeyDown={onKey}
        style={{ width: 'min(760px, 100%)', maxHeight: 'min(92vh, 900px)', display: 'flex', flexDirection: 'column', gap: 12, padding: 18, borderRadius: 14, background: '#10151F', border: '1px solid #232D3F', borderTop: '3px solid #FFFFFF', boxShadow: '0 24px 70px rgba(0,0,0,.7)', outline: 'none' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: '#A3AEC2' }}>TURN CARD · {name.toUpperCase()}</span>
          <span id="phc-cmds-title" style={{ fontFamily: "'Spectral', serif", fontSize: 24, fontWeight: 600 }}>Your four commands</span>
          <span style={{ fontSize: 12, lineHeight: 1.45, color: '#C9D3E3' }}>The turn card offers these on keys 1–4. Pick a slot, then an action. A slot left on <b>Smart</b> follows the fight (Clear jam when you jam, Release while you hold an Outburst). Saved for {name} in this browser.</span>
        </div>
        <div role="group" aria-label="The four slots" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
          {[0, 1, 2, 3].map((i) => {
            const set = slots[i], e = set ? by.get(set) : undefined, c = shown[i], on = at === i;
            const ink = e ? INK[e.tab] || '#E7EBF3' : '#5D6A80';
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 8, borderRadius: 10, background: on ? '#1C2536' : '#0D1119', ...edges(on ? '2px solid #FFFFFF' : '2px solid #232D3F', '4px solid ' + ink) }}>
                <button type="button" data-slot={i + 1} aria-pressed={on} onClick={() => setAt(i)} title={'Fill slot ' + (i + 1)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 0, border: 0, background: 'transparent', color: 'inherit', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: 22, height: 22, flex: 'none', border: '1px solid currentColor', fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
                  <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: c?.off ? '#7F8BA1' : '#E7EBF3' }}>{c ? c.label : '—'}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: e ? '#FFFFFF' : '#A3AEC2' }}>{e ? 'YOUR PICK' : set ? 'SMART (NOT IN YOUR KIT NOW)' : 'SMART'}</span>
                    {c?.off && <span style={{ fontSize: 10, color: '#A3AEC2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.sub}</span>}
                  </span>
                </button>
                <span style={{ display: 'flex', gap: 4 }}>
                  <button type="button" aria-label={'Move slot ' + (i + 1) + ' left'} disabled={i === 0} onClick={() => move(i, -1)} style={{ ...mini, opacity: i === 0 ? 0.35 : 1 }}>‹</button>
                  <button type="button" aria-label={'Move slot ' + (i + 1) + ' right'} disabled={i === 3} onClick={() => move(i, 1)} style={{ ...mini, opacity: i === 3 ? 0.35 : 1 }}>›</button>
                  <button type="button" aria-label={'Slot ' + (i + 1) + ' back to smart'} disabled={!set} onClick={() => clear(i)} style={{ ...mini, width: 'auto', padding: '0 7px', fontSize: 10, letterSpacing: '0.08em', opacity: set ? 1 : 0.35 }}>SMART</button>
                </span>
              </div>
            );
          })}
        </div>
        <div aria-label={'Actions for slot ' + (at + 1)} style={{ flex: '1 1 auto', minHeight: 120, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
          {!u && <span style={{ fontSize: 13, color: '#A3AEC2' }}>{name} isn't in this fight: their commands can be set once they are.</span>}
          {tabs.map((t) => (
            <div key={t} role="group" aria-label={TAB_NAME[t] || t} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: INK[t] || '#A3AEC2' }}>{(TAB_NAME[t] || t).toUpperCase()}</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 5 }}>
                {cat.filter((e) => e.tab === t).map((e) => {
                  const inSlot = slots.indexOf(e.action), here = inSlot === at, ink = INK[e.tab];
                  return (
                    <button key={e.action} type="button" data-cmd={e.action} aria-pressed={here} onClick={() => pick(e.action)} title={e.text}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 2, padding: '6px 10px', borderRadius: 8, ...edges('1px solid ' + (here ? '#FFFFFF' : '#232D3F'), '3px solid ' + (ink || (here ? '#FFFFFF' : '#232D3F'))), background: here ? '#1C2536' : '#10151F', color: '#E7EBF3', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
                      <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.label}</span>
                        <span style={{ flex: 'none', fontSize: 11, fontWeight: 700, color: '#C9D3E3' }}>{inSlot >= 0 ? 'SLOT ' + (inSlot + 1) + ' · ' : ''}{e.cost}</span>
                      </span>
                      {e.why && <span style={{ fontSize: 10, color: '#A3AEC2' }}>Not now: {e.why.replace(/\.$/, '')}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <button type="button" onClick={() => { setSlots([null, null, null, null]); setAt(0); }} style={btn()}>Reset to smart default</button>
          <span style={{ flex: 1 }} />
          <button type="button" onClick={onClose} style={btn()}>Cancel</button>
          <button type="button" onClick={save} style={btn(true)}>Save</button>
        </div>
      </div>
    </div>
  );
}
