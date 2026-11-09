// The shared, collapsible, grouped workshop (Sigil 1.5 spec section 7; Outburst 4.0 spec section 8). One model, two
// renderers:
//  · groupedSection(...) returns plain values for the prototype templates (the Magic tab in main.template.html): a
//    section header that opens and closes, and its groups, each with its own header that opens and closes.
//  · <Groups> is the same thing for React (the Proving Ground's cheat menu in sandbox.tsx).
// Open and closed are a per-browser preference (localStorage 'phc.ws.<section>' and 'phc.ws.<section>.<group>'),
// never game state. A section or group nobody has touched uses its default (sections open, groups open unless the
// caller says otherwise).
//
// The groups used today (both magics, both places, one look: a ▾/▸ header button with a count, open state remembered):
//  · Sigil: the five word groups, Subjects, Reach, Delivery, Burst and Filter (sigilWordGroups below), on the sheet
//    ('magic.sigil', and 'magic.learn' in Learn a word) and in the Proving Ground ('sb.sigil').
//  · Outburst 4.0 (rules 1.8, its spec section 8): on the sheet ('magic.soul') the designs, the one-click templates,
//    the feelings and the modules by gate skill, each gate a group of its own ('magic.soul.modules'; the advanced
//    classes' modules listed locked, never hidden); in the Proving Ground ('sb.soul') schools and tones, modules by
//    gate skill (each gate a group of its own, 'sb.soul.modules', through <GroupList>), feelings, practice, and the
//    sound and effects test.
//  · Add new group keys; don't rename the old ones, so each player's saved open/closed state still applies.
import React from 'react';
import { SIGIL } from '@engine';

const KEY = 'phc.ws.';
const mem: Record<string, boolean> = {};
let listeners: (() => void)[] = [];
/** Is a section (group omitted) or one of its groups open? */
export function isOpen(section: string, group?: string, dflt = true): boolean {
  const k = KEY + section + (group ? '.' + group : '');
  if (k in mem) return mem[k];
  try { const v = typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null; if (v === '1' || v === '0') return (mem[k] = v === '1'); } catch { /* private mode */ }
  return dflt;
}
/** Open or close a section or a group; remembered in this browser. */
export function setOpen(section: string, group: string | undefined, open: boolean) {
  const k = KEY + section + (group ? '.' + group : '');
  mem[k] = open;
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(k, open ? '1' : '0'); } catch { /* kept for this visit */ }
  for (const f of listeners) f();
}
/** Forget the cache (tests). */
export function resetOpenCache() { for (const k of Object.keys(mem)) delete mem[k]; }

export interface Group<T> { key: string; label: string; items: T[]; locked?: boolean; note?: string; dflt?: boolean; /** the count shown, when items aren't one per entry (a row of chips) */ n?: number; /** the count as text ("3 / 25 FELT"), over n */ count?: string }
export interface GroupVals<T> { key: string; label: string; count: string; open: boolean; expanded: string; toggle: () => void; chev: string; items: T[]; hasItems: boolean; empty: boolean; note: string; hasNote: boolean; headStyle: string }
export interface SectionVals<T> { open: boolean; expanded: string; toggle: () => void; chev: string; groups: GroupVals<T>[]; headStyle: string }

const headCss = (ink: string, big: boolean) => 'display: flex; align-items: center; gap: 6px; width: 100%; padding: ' + (big ? '2px 0' : '4px 0') + '; border: 0; background: transparent; text-align: left; cursor: pointer; '
  + "font-family: 'Chakra Petch', sans-serif; font-size: " + (big ? 11 : 10) + 'px; font-weight: 700; letter-spacing: ' + (big ? '0.16em' : '0.14em') + '; color: ' + ink + (big ? '' : '; border-bottom: 1px solid #1C2536');

/** Values for a template: the section's header toggle and its groups (empty groups are dropped unless keepEmpty).
 * rerender is called after a toggle (the screen's setState or poke). */
export function groupedSection<T>(section: string, groups: Group<T>[], o: { ink: string; rerender: () => void; keepEmpty?: boolean }): SectionVals<T> {
  const open = isOpen(section);
  return {
    open, expanded: open ? 'true' : 'false', chev: open ? '▾' : '▸', headStyle: headCss(o.ink, true),
    toggle: () => { setOpen(section, undefined, !isOpen(section)); o.rerender(); },
    groups: groups.filter((g) => o.keepEmpty || g.items.length > 0).map((g) => { const go = isOpen(section, g.key, g.dflt ?? true);
      return { key: g.key, label: g.label.toUpperCase(), count: (g.count ?? String(g.n ?? g.items.length)) + (g.locked ? ' · LOCKED' : ''), open: go, expanded: go ? 'true' : 'false', chev: go ? '▾' : '▸',
        toggle: () => { setOpen(section, g.key, !isOpen(section, g.key, g.dflt ?? true)); o.rerender(); }, items: g.items, hasItems: go && g.items.length > 0, empty: go && !g.items.length,
        note: g.note || '', hasNote: go && !!g.note, headStyle: headCss(o.ink, false) }; }),
  };
}

// ---------- the groups ----------
export const SIGIL_GROUPS: { key: string; label: string }[] = [
  { key: 'subject', label: 'Subjects' }, { key: 'reach', label: 'Reach' }, { key: 'delivery', label: 'Delivery' }, { key: 'burst', label: 'Burst' }, { key: 'filter', label: 'Filter' }];
const CLASS_ORDER = ['subject_element', 'subject_affliction', 'subject_boon', 'subject_working', 'reach', 'delivery', 'burst', 'filter'];
/** Words (or anything with a word id) in the five Sigil word groups, Subjects sorted Element, Affliction, Boon, Working.
 * The order inside a class is kept. A word of no known group goes to "Other". */
export function sigilWordGroups<T>(items: T[], idOf: (t: T) => string): Group<T>[] {
  const cls = (t: T) => CLASS_ORDER.indexOf(SIGIL[idOf(t)]?.class || '');
  const out: Group<T>[] = SIGIL_GROUPS.map((g) => ({ key: g.key, label: g.label, items: items.filter((t) => SIGIL[idOf(t)]?.group === g.key).map((t, i) => [t, i] as const).sort((a, b) => cls(a[0]) - cls(b[0]) || a[1] - b[1]).map((x) => x[0]) }));
  const other = items.filter((t) => !SIGIL_GROUPS.some((g) => g.key === SIGIL[idOf(t)]?.group));
  if (other.length) out.push({ key: 'other', label: 'Other', items: other });
  return out;
}

// ---------- React (the Proving Ground) ----------
function useOpenTick() { const [, set] = React.useState(0); React.useEffect(() => { const f = () => set((n) => n + 1); listeners.push(f); return () => { listeners = listeners.filter((x) => x !== f); }; }, []); }
/** A collapsible section of collapsible groups. render draws one group's items. The section header is drawn fully in
 * the magic's ink, as headCss(ink, true) is in the template. */
export function Groups<T>({ section, title, ink, groups, render, aria }: { section: string; title: string; ink: string; groups: Group<T>[]; render: (items: T[], g: Group<T>) => React.ReactNode; aria?: string }) {
  useOpenTick();
  const open = isOpen(section);
  return <section aria-label={aria || title} data-ws-section={section} style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
    <button type="button" aria-expanded={open} data-ws-head={section} onClick={() => setOpen(section, undefined, !open)} style={cssOf(headCss(ink, true))}><span aria-hidden="true">{open ? '▾' : '▸'}</span>{title}</button>
    {open && <GroupList section={section} ink={ink} groups={groups} render={render} />}
  </section>;
}
/** The groups alone, no section header: for groups nested inside another group (the Proving Ground's modules by gate
 * skill, 'sb.soul.modules', as the sheet's 'magic.soul.modules'). Each is collapsible and remembered under `section`. */
export function GroupList<T>({ section, ink, groups, render }: { section: string; ink: string; groups: Group<T>[]; render: (items: T[], g: Group<T>) => React.ReactNode }) {
  useOpenTick();
  return <>{groups.filter((g) => g.items.length > 0).map((g) => { const go = isOpen(section, g.key, g.dflt ?? true);
    return <div key={g.key} role="group" aria-label={g.label} data-ws-group={g.key} style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <button type="button" data-ws-toggle="1" aria-expanded={go} onClick={() => setOpen(section, g.key, !go)} style={cssOf(headCss(ink, false))}><span aria-hidden="true">{go ? '▾' : '▸'}</span>{g.label.toUpperCase()}<span style={{ marginLeft: 'auto', paddingLeft: 8, flex: 'none', whiteSpace: 'nowrap', color: '#7F8BA1' }}>{g.count ?? g.n ?? g.items.length}{g.locked ? ' · LOCKED' : ''}</span></button>
      {go && g.note && <span style={{ fontSize: 11, color: '#A3AEC2' }}>{g.note}</span>}
      {go && render(g.items, g)}
    </div>; })}</>;
}
/** A CSS string to a React style object (the template styles above, reused). */
function cssOf(s: string): React.CSSProperties {
  const o: Record<string, string> = {};
  for (const part of s.split(';')) { const i = part.indexOf(':'); if (i < 0) continue; const k = part.slice(0, i).trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase()); o[k] = part.slice(i + 1).trim(); }
  return o as React.CSSProperties;
}
