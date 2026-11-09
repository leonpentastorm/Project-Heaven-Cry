// The in-game dialog (UI pass, docs/design/ui-pass-shell.md section 8): every question the game asks goes through
// here, never through the browser's confirm(), prompt() or alert() (some antivirus software flags pages that use them,
// and they freeze the game's sound and animation). One dialog at a time; a second ask waits in the queue.
//   askConfirm({ title, body, confirm, cancel, danger }) → true on Confirm; false on Cancel, Escape or the backdrop
//   askText({ …, placeholder, initial, multiline, optional, maxLength }) → the text ('' if optional and empty); null on Cancel
//   tell({ title, body, ok }) → resolves when closed
// Keyboard: Escape cancels; Enter confirms (Ctrl/⌘+Enter in a multiline field). Focus goes to the safe button for a
// dangerous ask, otherwise to the primary; it is trapped inside and given back on close. Other keyboard handlers ask
// dialogOpen() first.
import React from 'react';
import { presenceCls } from './presence';

export interface DialogOpts { title: string; body?: string; confirm?: string; cancel?: string; danger?: boolean }
export interface TextOpts extends DialogOpts { placeholder?: string; initial?: string; multiline?: boolean; optional?: boolean; maxLength?: number }

type Kind = 'confirm' | 'text' | 'tell';
interface Req { id: number; kind: Kind; o: TextOpts & { ok?: string }; done: (v: any) => void }
const queue: Req[] = [];
const subs = new Set<() => void>();
let seq = 0;
const emit = () => { for (const f of subs) f(); };
function push(kind: Kind, o: Req['o']): Promise<any> {
  return new Promise((done) => { queue.push({ id: ++seq, kind, o, done }); emit(); });
}
/** Settle the dialog on screen (the head of the queue) and show the next one. */
function settle(id: number, v: any) {
  const i = queue.findIndex((r) => r.id === id); if (i < 0) return;
  const [r] = queue.splice(i, 1); r.done(v); emit();
}

export const askConfirm = (o: DialogOpts): Promise<boolean> => push('confirm', o);
export const askText = (o: TextOpts): Promise<string | null> => push('text', o);
export const tell = (o: { title: string; body?: string; ok?: string }): Promise<void> => push('tell', o).then(() => undefined);
/** True while a dialog is on screen (or waiting): keyboard shortcuts elsewhere skip their keys. */
export const dialogOpen = () => queue.length > 0;
/** The dialog on screen now (for tests). */
export const currentDialog = (): { kind: Kind; title: string } | null => (queue[0] ? { kind: queue[0].kind, title: queue[0].o.title } : null);
/** Answer the dialog on screen as if its button was pressed (for tests): confirm → its value, else cancel. */
export function answerDialog(confirm: boolean, text?: string) {
  const r = queue[0]; if (!r) return;
  settle(r.id, valueOf(r, confirm, text ?? r.o.initial ?? ''));
}
function valueOf(r: Req, confirm: boolean, text: string) {
  if (r.kind === 'tell') return undefined;
  if (r.kind === 'confirm') return confirm;
  if (!confirm) return null;
  const t = text.trim();
  return t || r.o.optional ? t : null;
}

const C = { ground: '#0A0D13', panel: '#10151F', raised: '#1C2536', line: '#3B475D', text: '#E7EBF3', body: '#C9D3E3', muted: '#A3AEC2', red: '#F65157', white: '#FFFFFF' };
const UI = "'Chakra Petch', sans-serif";
const btnBase: React.CSSProperties = { minHeight: 40, padding: '0 18px', borderRadius: 10, fontFamily: UI, fontSize: 14, fontWeight: 700, cursor: 'pointer' };
const primary = (danger?: boolean): React.CSSProperties => danger
  ? { ...btnBase, border: '1px solid ' + C.red, background: 'transparent', color: C.red }
  : { ...btnBase, border: 0, background: C.white, color: C.ground };
const secondary: React.CSSProperties = { ...btnBase, border: '1px solid ' + C.line, background: 'transparent', color: C.text };

/** Mounted once (App.tsx and the title screen): shows the head of the queue. */
export function DialogHost() {
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => { subs.add(force); return () => { subs.delete(force); }; }, []);
  const r = queue[0] || null;
  return r ? <DialogCard key={r.id} r={r} /> : null;
}

function DialogCard({ r }: { r: Req }) {
  const { kind, o } = r;
  const [text, setText] = React.useState(o.initial || '');
  const [closing, setClosing] = React.useState(false);
  const card = React.useRef<HTMLDivElement>(null), field = React.useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const okBtn = React.useRef<HTMLButtonElement>(null), cancelBtn = React.useRef<HTMLButtonElement>(null);
  const before = React.useRef<Element | null>(typeof document !== 'undefined' ? document.activeElement : null);
  const answer = (confirm: boolean) => {
    if (closing) return;
    const v = valueOf(r, confirm, text);
    if (kind === 'text' && confirm && v === null) { field.current?.focus(); return; } // a required answer is still empty
    setClosing(true);
    // The fade out is short; the answer goes at once so the caller is never held by an animation.
    settle(r.id, v);
  };
  // Focus: the field, else the safe button for a dangerous ask, else the primary. Given back on close.
  React.useEffect(() => {
    const t = setTimeout(() => { (kind === 'text' ? field.current : o.danger ? cancelBtn.current || okBtn.current : okBtn.current)?.focus(); }, 0);
    const back = before.current as HTMLElement | null;
    return () => { clearTimeout(t); if (back && typeof back.focus === 'function' && document.contains(back) && !queue.length) back.focus({ preventScroll: true }); };
  }, []);
  // Keys, in the capture phase so nothing underneath (the combat keys, the title's arrows) sees them.
  React.useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); answer(false); return; }
      if (e.key === 'Enter') {
        const inArea = (e.target as HTMLElement | null)?.tagName === 'TEXTAREA';
        if (inArea && !(e.ctrlKey || e.metaKey)) { e.stopPropagation(); return; }
        const onBtn = (e.target as HTMLElement | null)?.tagName === 'BUTTON';
        if (onBtn) { e.stopPropagation(); return; } // the focused button presses itself
        e.preventDefault(); e.stopPropagation(); answer(true); return;
      }
      if (e.key === 'Tab') {
        const els = [...(card.current?.querySelectorAll<HTMLElement>('button, input, textarea') || [])].filter((x) => !(x as HTMLButtonElement).disabled);
        if (!els.length) return;
        const i = els.indexOf(document.activeElement as HTMLElement), n = e.shiftKey ? (i <= 0 ? els.length - 1 : i - 1) : (i < 0 || i === els.length - 1 ? 0 : i + 1);
        e.preventDefault(); e.stopPropagation(); els[n].focus();
        return;
      }
      // Every other key stays with the dialog (typing in its field still works: the field gets it first).
      if (!card.current?.contains(e.target as Node)) e.stopPropagation();
    };
    window.addEventListener('keydown', k, true); return () => window.removeEventListener('keydown', k, true);
  });
  const okLabel = kind === 'tell' ? (o.ok || 'OK') : (o.confirm || (kind === 'text' ? 'OK' : 'Confirm'));
  const cancelLabel = o.cancel || 'Cancel';
  const fieldStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, border: '1px solid #2E3A50', background: C.ground, color: C.text, fontFamily: UI, fontSize: 15, resize: 'vertical' };
  return (
    <div data-phc-dialog="" className={presenceCls('phc-a-fade', closing)} onMouseDown={(e) => { if (e.target === e.currentTarget) answer(false); }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(5, 7, 11, 0.78)', display: 'grid', placeItems: 'center', padding: 16 }}>
      <div ref={card} role="alertdialog" aria-modal="true" aria-labelledby={'phc-dlg-t' + r.id} aria-describedby={o.body ? 'phc-dlg-b' + r.id : undefined}
        className={presenceCls('phc-a-pop', closing)}
        style={{ width: 'min(460px, 100%)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 14, padding: '20px 22px', borderRadius: 16, background: C.panel, border: '1px solid ' + C.line, boxShadow: '0 18px 60px rgba(0,0,0,0.6)', fontFamily: UI, color: C.text }}>
        <h2 id={'phc-dlg-t' + r.id} style={{ margin: 0, fontFamily: "'Spectral', serif", fontSize: 22, fontWeight: 600, lineHeight: 1.25 }}>{o.title}</h2>
        {o.body && <p id={'phc-dlg-b' + r.id} style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: C.body, whiteSpace: 'pre-line' }}>{o.body}</p>}
        {kind === 'text' && (o.multiline
          ? <textarea ref={field} value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={o.maxLength} placeholder={o.placeholder} aria-label={o.title} style={fieldStyle} />
          : <input ref={field} value={text} onChange={(e) => setText(e.target.value)} maxLength={o.maxLength} placeholder={o.placeholder} aria-label={o.title} style={fieldStyle} />)}
        {kind === 'text' && o.multiline && <span style={{ fontSize: 11, color: C.muted }}>{(o.optional ? 'Optional. ' : '') + 'Ctrl+Enter to send.'}</span>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
          {kind !== 'tell' && <button ref={cancelBtn} type="button" data-sfx="back" onClick={() => answer(false)} style={secondary}>{cancelLabel}</button>}
          <button ref={okBtn} type="button" onClick={() => answer(true)} style={primary(o.danger)}>{okLabel}</button>
        </div>
      </div>
    </div>
  );
}
