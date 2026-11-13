// The Memory menu (spec: The Narrator's memory, editing by hand): the host reads and fixes everything the Narrator
// remembers. Built to serve the human Narrator later as their memory aid. Every change is an engine action.
import React from 'react';
import { askConfirm } from './dialog';
import { useFloatStyle } from './floaters';
import type { GameState, MemEdit } from '@engine';
import { act } from './store';
import { usePresence, presenceCls } from './presence';
import { tipProps } from './actionTip';

type Tab = 'story' | 'people' | 'threads' | 'facts' | 'more';
const ATT = ['−3 hostile', '−2 hostile', '−1 unfriendly', '0 neutral', '+1 friendly', '+2 warm', '+3 devoted'];
const ink = { text: '#E7EBF3', muted: '#A3AEC2', line: '#232D3F', panel: '#10151F', raised: '#1C2536', red: '#F65157', green: '#6FEA77' };
const btn: React.CSSProperties = { minHeight: 32, padding: '0 10px', borderRadius: 8, border: '1px solid #2E3A50', background: 'transparent', color: ink.text, fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '6px 8px', borderRadius: 6, border: '1px solid #2E3A50', background: '#0D1119', color: ink.text, fontFamily: 'inherit', fontSize: 13 };
const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: ink.muted };
const edit = (e: MemEdit) => act({ type: 'memory/edit', edit: e });

function Record({ head, sub, body, fields, values, onSave, onRemove }: {
  head: string; sub?: string; body?: string; values: Record<string, any>;
  fields: { key: string; name: string; type: 'text' | 'area' | 'num' | 'check' | 'select'; options?: string[] }[];
  onSave: (patch: Record<string, any>) => void; onRemove?: () => void;
}) {
  const [open, setOpen] = React.useState(false), [draft, setDraft] = React.useState<Record<string, any>>(values);
  React.useEffect(() => { if (!open) setDraft(values); }, [open, JSON.stringify(values)]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, borderRadius: 10, background: '#0D1119', border: '1px solid ' + ink.line }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: ink.text }}>{head}</span>
        {sub && <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: ink.muted }}>{sub}</span>}
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button type="button" style={btn} onClick={() => setOpen(!open)}>{open ? 'Cancel' : 'Edit'}</button>
          {onRemove && <button type="button" style={{ ...btn, color: ink.red, borderColor: '#5A2A30' }} onClick={() => { askConfirm({ title: 'Delete "' + head + '"?', body: 'The Narrator forgets it from its next turn.', confirm: 'Delete', danger: true }).then((ok) => { if (ok) onRemove(); }); }}>Delete</button>}
        </span>
      </div>
      {!open && body && <span style={{ fontSize: 13, lineHeight: 1.5, color: '#C9D3E3', whiteSpace: 'pre-wrap' }}>{body}</span>}
      {open && (
        <div className="phc-drop-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          {fields.map((f) => (
            <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: f.type === 'area' ? '1 / -1' : undefined }}>
              <span style={label}>{f.name}</span>
              {f.type === 'area' ? <textarea rows={3} style={field} value={draft[f.key] ?? ''} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />
                : f.type === 'check' ? <input type="checkbox" checked={!!draft[f.key]} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.checked })} />
                : f.type === 'select' ? <select style={field} value={draft[f.key] ?? ''} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}>{f.options!.map((o) => <option key={o} value={o}>{o}</option>)}</select>
                : <input style={field} type={f.type === 'num' ? 'number' : 'text'} value={draft[f.key] ?? ''} onChange={(e) => setDraft({ ...draft, [f.key]: f.type === 'num' ? Number(e.target.value) : e.target.value })} />}
            </label>
          ))}
          <button type="button" style={{ ...btn, gridColumn: '1 / -1', background: ink.text, color: '#0A0D13', border: 0, minHeight: 36 }}
            onClick={() => { const patch: Record<string, any> = {}; for (const f of fields) if (JSON.stringify(draft[f.key]) !== JSON.stringify(values[f.key])) patch[f.key] = draft[f.key]; onSave(patch); setOpen(false); }}>Save</button>
        </div>
      )}
    </div>
  );
}

// Open from anywhere (the Narrator chip's menu in the header): the same dialog as the floating button.
let openFromAfar: (() => void) | null = null;
export const openMemory = () => openFromAfar?.();

/** compact: the button is its icon only, beside the ♪ button (every screen since the UI pass review), so it keeps off
 *  the combat log and the sheet; its name shows on hover. */
export function MemoryPanel({ game, isHost, side, compact = false }: { game: GameState | null; isHost: boolean; side: 'left' | 'right'; compact?: boolean }) {
  const btnRef = React.useRef<HTMLButtonElement>(null), [hover, setHover] = React.useState(false);
  const [open, setOpen] = React.useState(false), [tab, setTab] = React.useState<Tab>('story'), [q, setQ] = React.useState(''), [adding, setAdding] = React.useState('');
  const pres = usePresence(open); // fades in with the card popping up; out the same way
  // The music shares the dock (floaters.ts): while this one's name shows or its dialog is open, the ♪ button slides away.
  const { place, ...floatStyle } = useFloatStyle(btnRef, open, 'memory', compact && hover && isHost && !!game && game.phase !== 'lobby');
  React.useEffect(() => { openFromAfar = () => setOpen(true); return () => { openFromAfar = null; }; }, []);
  if (!isHost || !game || game.phase === 'lobby') return null;
  const m = game.memory || { people: [], threads: [], facts: [], factions: [], scenes: [], chapters: [], saga: '', pins: [] } as any;
  const match = (s: string) => !q || s.toLowerCase().includes(q.toLowerCase());
  const tabs: [Tab, string, number][] = [['story', 'Story so far', m.chapters.length + m.scenes.length], ['people', 'People', m.people.length], ['threads', 'Threads', m.threads.length], ['facts', 'Facts', m.facts.length], ['more', 'Factions & pins', m.factions.length + m.pins.length]];
  const add = (kind: string, patch: Record<string, any>) => { edit({ kind, patch } as MemEdit); setAdding(''); };
  return (
    <>
      <button ref={btnRef} type="button" data-phc-float="memory" data-phc-float-place={place} onClick={() => setOpen(true)} aria-label="The Narrator's memory (host)" {...tipProps(compact && !hover ? 'The Narrator\'s memory' : undefined)}
        onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}
        style={{ position: 'fixed', [side]: compact ? 64 : 16, bottom: compact ? 16 : 64, zIndex: 9, minHeight: 40, minWidth: 40, padding: compact && !hover ? 0 : '0 14px', borderRadius: 999, border: '1px solid #3B475D', background: ink.panel, color: ink.text, fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.5)', ...floatStyle }}>
        {compact && !hover ? '◈' : '◈ Memory'}
      </button>
      {pres.shown && (
        <div role="dialog" aria-modal="true" aria-label="The Narrator's memory" className={presenceCls('phc-a-fade', pres.closing)} style={{ position: 'fixed', inset: 0, zIndex: 20, background: 'rgba(5, 7, 11, 0.88)', display: 'grid', placeItems: 'center', padding: 16 }}>
          <div className={presenceCls('phc-a-pop', pres.closing)} style={{ width: 'min(980px, 100%)', maxHeight: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12, padding: 20, borderRadius: 18, background: ink.panel, border: '1px solid ' + ink.line, boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={label}>THE NARRATOR'S MEMORY · HOST ONLY</span>
                <span style={{ fontSize: 12, color: ink.muted }}>Everything the Narrator remembers, secrets and spoilers included. Fix what it got wrong; it reads this every turn.</span>
              </div>
              <button type="button" style={{ ...btn, marginLeft: 'auto', minHeight: 38 }} onClick={() => setOpen(false)}>Close</button>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {tabs.map(([id, name, n]) => <button key={id} type="button" aria-pressed={tab === id} onClick={() => { setTab(id); setAdding(''); }} style={{ ...btn, minHeight: 36, ...(tab === id ? { background: ink.raised, borderColor: ink.text } : {}) }}>{name} · {n}</button>)}
              <input aria-label="Search memory" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} style={{ ...field, width: 200, marginLeft: 'auto' }} />
            </div>

            {tab === 'story' && <>
              <Record head="The saga (the story so far)" body={m.saga || 'Nothing yet: it is written at the first chapter.'} values={{ text: m.saga }} fields={[{ key: 'text', name: 'Saga', type: 'area' }]} onSave={(p) => p.text != null && edit({ kind: 'saga', text: p.text })} />
              {[...m.chapters].reverse().filter((c: any) => match(c.title + c.summary)).map((c: any) => <Record key={'c' + c.n} head={'Chapter ' + c.n + ': ' + c.title} sub={'SCENES ' + c.scenes[0] + '–' + c.scenes[1]} body={c.summary} values={{ title: c.title, summary: c.summary }} fields={[{ key: 'title', name: 'Title', type: 'text' }, { key: 'summary', name: 'Summary', type: 'area' }]} onSave={(p) => edit({ kind: 'chapter', n: c.n, ...p })} onRemove={() => edit({ kind: 'chapter', n: c.n, remove: true })} />)}
              <span style={label}>SCENES NOT YET IN A CHAPTER</span>
              {[...m.scenes].reverse().filter((x: any) => match(x.title + x.summary)).map((x: any) => <Record key={'s' + x.n} head={'Scene ' + x.n + ': ' + x.title} sub={x.zone} body={x.summary} values={{ title: x.title, summary: x.summary }} fields={[{ key: 'title', name: 'Title', type: 'text' }, { key: 'summary', name: 'Summary', type: 'area' }]} onSave={(p) => edit({ kind: 'scene', n: x.n, ...p })} onRemove={() => edit({ kind: 'scene', n: x.n, remove: true })} />)}
              {!m.scenes.length && <span style={{ fontSize: 13, color: ink.muted }}>None: scene summaries appear when the Narrator closes a scene.</span>}
            </>}

            {tab === 'people' && <>
              <button type="button" style={btn} onClick={() => setAdding(adding === 'person' ? '' : 'person')}>+ Add a person</button>
              {adding === 'person' && <Record head="New person" values={{ attitude: 0, importance: 3, status: 'alive' }} fields={PERSON} onSave={(p) => add('person', p)} />}
              {[...m.people].sort((a: any, b: any) => b.last - a.last).filter((p: any) => match(p.name + p.role + p.notes + (p.aliases || []).join(' '))).map((p: any) => (
                <Record key={p.id} head={p.name} sub={[p.role, p.status.toUpperCase(), ATT[p.attitude + 3], p.where, 'IMPORTANCE ' + p.importance, 'SCENE ' + p.last].filter(Boolean).join(' · ')} body={[p.notes, ...(p.log || [])].filter(Boolean).join('\n')}
                  values={{ name: p.name, role: p.role, where: p.where, attitude: p.attitude, status: p.status, importance: p.importance, notes: p.notes }} fields={PERSON}
                  onSave={(x) => edit({ kind: 'person', id: p.id, patch: x })} onRemove={() => edit({ kind: 'person', id: p.id, remove: true })} />))}
            </>}

            {tab === 'threads' && <>
              <button type="button" style={btn} onClick={() => setAdding(adding === 'thread' ? '' : 'thread')}>+ Add a thread</button>
              {adding === 'thread' && <Record head="New thread" values={{ kind: 'quest', status: 'open', importance: 3 }} fields={THREAD} onSave={(p) => add('thread', p)} />}
              {[...m.threads].sort((a: any, b: any) => (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1) || b.last - a.last).filter((t: any) => match(t.title + t.text + t.who.join(' '))).map((t: any) => (
                <Record key={t.id} head={t.title} sub={[t.kind.toUpperCase(), t.status.toUpperCase(), t.who.join(', '), 'IMPORTANCE ' + t.importance].filter(Boolean).join(' · ')} body={[t.text, ...t.log].filter(Boolean).join('\n')}
                  values={{ title: t.title, kind: t.kind, status: t.status, importance: t.importance, text: t.text }} fields={THREAD}
                  onSave={(x) => edit({ kind: 'thread', id: t.id, patch: x })} onRemove={() => edit({ kind: 'thread', id: t.id, remove: true })} />))}
            </>}

            {tab === 'facts' && <>
              <button type="button" style={btn} onClick={() => setAdding(adding === 'fact' ? '' : 'fact')}>+ Add a fact</button>
              {adding === 'fact' && <Record head="New fact" values={{ importance: 3, secret: false }} fields={FACT} onSave={(p) => add('fact', p)} />}
              {[...m.facts].sort((a: any, b: any) => b.scene - a.scene).filter((f: any) => match(f.text + f.about.join(' '))).slice(0, 300).map((f: any) => (
                <Record key={f.id} head={f.text} sub={['SCENE ' + f.scene, 'IMPORTANCE ' + f.importance, f.canon ? 'CANON (ENGINE)' : '', f.secret ? 'SECRET' : '', f.about.join(', ')].filter(Boolean).join(' · ')}
                  values={{ text: f.text, importance: f.importance, secret: f.secret, canon: f.canon }} fields={[...FACT, { key: 'canon', name: 'Canon (the Narrator may not contradict it)', type: 'check' }]}
                  onSave={(x) => edit({ kind: 'fact', id: f.id, patch: x })} onRemove={() => edit({ kind: 'fact', id: f.id, remove: true })} />))}
              {m.facts.length > 300 && <span style={{ fontSize: 12, color: ink.muted }}>Showing the 300 latest of {m.facts.length}; search to find older ones.</span>}
            </>}

            {tab === 'more' && <>
              <span style={label}>PLOT ESSENTIALS (always in the Narrator's view)</span>
              {m.pins.map((p: string) => <Record key={p} head={p} values={{ text: p }} fields={[{ key: 'text', name: 'Pin', type: 'area' }]} onSave={(x) => { if (x.text != null) { edit({ kind: 'pin', text: p, remove: true }); edit({ kind: 'pin', text: x.text }); } }} onRemove={() => edit({ kind: 'pin', text: p, remove: true })} />)}
              <button type="button" style={btn} onClick={() => setAdding(adding === 'pin' ? '' : 'pin')}>+ Pin a plot essential</button>
              {adding === 'pin' && <Record head="New pin" values={{}} fields={[{ key: 'text', name: 'Pin', type: 'area' }]} onSave={(p) => { if (p.text) edit({ kind: 'pin', text: p.text }); setAdding(''); }} />}
              <span style={label}>FACTIONS</span>
              {m.factions.filter((f: any) => match(f.name + f.notes)).map((f: any) => <Record key={f.id} head={f.name} sub={'STANDING ' + (f.standing >= 0 ? '+' : '') + f.standing} body={f.notes} values={{ name: f.name, standing: f.standing, notes: f.notes }} fields={FACTION} onSave={(x) => edit({ kind: 'faction', id: f.id, patch: x })} onRemove={() => edit({ kind: 'faction', id: f.id, remove: true })} />)}
              <button type="button" style={btn} onClick={() => setAdding(adding === 'faction' ? '' : 'faction')}>+ Add a faction</button>
              {adding === 'faction' && <Record head="New faction" values={{ standing: 0 }} fields={FACTION} onSave={(p) => add('faction', p)} />}
            </>}
          </div>
        </div>
      )}
    </>
  );
}

const PERSON = [{ key: 'name', name: 'Name', type: 'text' as const }, { key: 'role', name: 'Role', type: 'text' as const }, { key: 'where', name: 'Where (zone id)', type: 'text' as const },
  { key: 'attitude', name: 'Attitude (−3 to +3)', type: 'num' as const }, { key: 'status', name: 'Status', type: 'select' as const, options: ['alive', 'dead', 'missing', 'unknown'] }, { key: 'importance', name: 'Importance (1–5)', type: 'num' as const }, { key: 'notes', name: 'Notes', type: 'area' as const }];
const THREAD = [{ key: 'title', name: 'Title', type: 'text' as const }, { key: 'kind', name: 'Kind', type: 'select' as const, options: ['quest', 'promise', 'mystery', 'debt', 'rumour', 'goal'] },
  { key: 'status', name: 'Status', type: 'select' as const, options: ['open', 'done', 'failed', 'dropped'] }, { key: 'importance', name: 'Importance (1–5)', type: 'num' as const }, { key: 'text', name: 'What it is', type: 'area' as const }];
const FACT = [{ key: 'text', name: 'Fact', type: 'area' as const }, { key: 'importance', name: 'Importance (1–5)', type: 'num' as const }, { key: 'secret', name: 'Secret (the party doesn\'t know)', type: 'check' as const }];
const FACTION = [{ key: 'name', name: 'Name', type: 'text' as const }, { key: 'standing', name: 'Standing (−100 to +100)', type: 'num' as const }, { key: 'notes', name: 'Notes', type: 'area' as const }];
