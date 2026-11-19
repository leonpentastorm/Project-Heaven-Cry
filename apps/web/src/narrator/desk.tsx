// The human Narrator's desk, the rest of the turn, and the Narrator's private view (rules 1.84, items 7202 to 7204).
//
// ONE PATH. The desk writes the same turn the AI Narrator hands in: the AI's `submit_turn` tool (context.ts submitTool)
// is read here as the desk's form. Every property of that tool's input is a labelled field, built from the tool's own
// schema (its types, its fixed choices, its descriptions); what the desk sends is that tool's input, through the same
// action (`narrator/turn`), checked by the engine the same way. A field added to the AI's tool shows on the desk with
// no change here. The template's desk (main.template.html [data-gm-desk]) keeps its own first fields (the narration,
// the scene title, the checks, the rulings, a prepared fight); everything else is drawn here, portalled into the
// desk's [data-gm-more] slot.
//
// The private view: what the human Narrator's seat sees and the players never do (the engine's viewFor keeps it for the
// seat only, narratorSeat): the voice hooks with their TN and truth, the open checks, lurking people, hidden objects and
// hazards, triggers. It fills the left panel's [data-gm-notes] slot on the Narrator's screen: the left panel never shows
// a guest's character there (rules 1.84 item 7203).
import React from 'react';
import { createPortal } from 'react-dom';
import { SKILL, WEAPON, ITEM, refOf, narratorSeat, type GameState, type NarratorTurn } from '@engine';
import { submitTool } from './context';

type Schema = { type?: string; enum?: any[]; items?: Schema; properties?: Record<string, Schema>; required?: string[]; anyOf?: Schema[]; description?: string; minimum?: number; maximum?: number };

/** The fields the template's desk draws itself (gmDeskVals in screens/main.js). */
export const DESK_OWN = ['narration', 'sceneTitle', 'checks', 'perkRulings'];

/** How the fields are grouped and named on the desk. Presentation only: a property not named here still shows, under
 * MORE, with a name made from its key. */
const GROUPS: [string, string][] = [['scene', 'THE SCENE'], ['world', 'PEOPLE AND PLACES'], ['rewards', 'XP, LOOT AND REWARDS'], ['state', 'WHAT HAPPENS TO THEM'], ['fight', 'A FIGHT'], ['missions', 'MISSIONS'], ['memory', 'MEMORY'], ['more', 'MORE']];
const HEAD: Record<string, [string, string]> = {
  hooks: ['scene', 'Voice hooks'], ooc: ['scene', 'Answer out of character'], moment: ['scene', 'Show a story moment'], mana: ['scene', 'Mana here'], days: ['scene', 'Days that pass'], rest: ['scene', 'The party rests'],
  travel: ['scene', 'Travel to'], moves: ['scene', 'Move characters'], endScene: ['scene', 'End the scene'], actions: ['scene', 'Actions the players declared'],
  npcs: ['world', 'People and enemies'], objects: ['world', 'Objects and points of interest'], hazards: ['world', 'Hazards'], triggers: ['world', 'Triggers'], ground: ['world', 'Things on the ground'],
  xp: ['rewards', 'XP'], loot: ['rewards', 'Loot'], echo: ['rewards', 'Echo'], karma: ['rewards', 'Karma'], deeds: ['rewards', 'Deeds (perks)'], legends: ['rewards', 'Legendary deeds'], magic: ['rewards', 'Magic learned'],
  conditions: ['state', 'Conditions'], harm: ['state', 'Harm'], treat: ['state', 'Injuries treated'], overreach: ['state', 'Overreach'], traitState: ['state', 'Trait state'], identify: ['state', 'Understood now'],
  faith: ['state', 'Faith'], patronMood: ['state', 'A patron\'s mood'], perkLines: ['state', 'Private lines'], tutors: ['state', 'Tutors'],
  combat: ['fight', 'A fight made up on the spot'],
  missions: ['missions', 'Missions'], missionNext: ['missions', 'The next mission'], side: ['missions', 'Side jobs'],
  memory: ['memory', 'Memory'], chapter: ['memory', 'A chapter (when one is due)'],
};
/** Words for the keys inside the fields. */
const WORD: Record<string, string> = { charId: 'Who', tn: 'TN', at: 'Tile', to: 'To', qty: 'How many', id: 'Id', objId: 'Object', skill: 'Skill', skills: 'Skills', truth: 'Truth', line: 'Line',
  level_shift: 'Level shift', perkId: 'Perk', classId: 'Class', n: 'Amount' };
const words = (k: string) => WORD[k] || k.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (x) => x.toUpperCase());

/** The desk's fields: every property of the AI's submit_turn tool the template does not draw itself. */
export function deskFields(g: GameState): { key: string; label: string; group: string; hint: string; schema: Schema }[] {
  const props = (submitTool(g).input_schema as Schema).properties || {};
  return Object.entries(props).filter(([k]) => !DESK_OWN.includes(k)).map(([key, schema]) => {
    const [group, label] = HEAD[key] || ['more', words(key)];
    return { key, label, group, hint: schema.description || (schema.anyOf || []).map((x) => x.description || '').join(' ').trim(), schema };
  });
}

// ---------- the values: kept here until the turn is sent ----------
let extra: Record<string, any> = {};
const subs = new Set<() => void>();
const changed = () => subs.forEach((f) => f());
/** Forget what was written (the turn was sent). */
export function resetDesk() { extra = {}; changed(); }
/** For tests: set a field's raw value as the desk holds it. */
export function setDeskField(key: string, v: any) { extra = { ...extra, [key]: v }; changed(); }

const objectOf = (s: Schema): Schema | null => (s.type === 'object' ? s : (s.anyOf || []).find((x) => x.type === 'object') || null);
/** A "null or a value" choice that is not an object (the mana meter): the value's own schema, with the parent's words. */
const plain = (s: Schema): Schema => (s.anyOf && !objectOf(s) ? { ...(s.anyOf.find((x) => x.type !== 'null') || {}), description: s.description } : s);
/** A value as the AI's tool would carry it: numbers as numbers, lists as lists, nothing empty. undefined: leave it out. */
export function clean(s0: Schema, v: any): any {
  const s = plain(s0);
  if (v === undefined || v === null || v === '') return undefined;
  if (s.anyOf) { const o = objectOf(s); return o && v && typeof v === 'object' ? clean(o, v) : undefined; }
  if (s.enum && s.type !== 'array') return s.enum.includes(v) || s.enum.map(String).includes(String(v)) ? (s.type === 'integer' ? Number(v) : v) : undefined;
  switch (s.type) {
    case 'integer': case 'number': { const n = Number(v); return Number.isFinite(n) ? (s.type === 'integer' ? Math.round(n) : n) : undefined; }
    case 'boolean': return v === true ? true : undefined;
    case 'string': return String(v).trim() || undefined;
    case 'array': {
      const it = s.items || {};
      if (!Array.isArray(v)) return undefined;
      const out = v.map((x) => clean(it, x)).filter((x) => x !== undefined);
      return out.length ? out : undefined;
    }
    case 'object': {
      if (!s.properties) { if (typeof v === 'object') return Object.keys(v).length ? v : undefined; try { const j = JSON.parse(String(v)); return j && typeof j === 'object' ? j : undefined; } catch { return undefined; } }
      const out: Record<string, any> = {};
      for (const [k, ps] of Object.entries(s.properties)) { const x = clean(ps, v[k]); if (x !== undefined) out[k] = x; }
      return Object.keys(out).length ? out : undefined;
    }
    default: return v;
  }
}
/** What the desk adds to the turn: the submit_turn fields written on it, in the tool's own shape. */
export function deskTurn(g: GameState): Partial<NarratorTurn> {
  const out: Record<string, any> = {};
  for (const f of deskFields(g)) { const x = clean(f.schema, extra[f.key]); if (x !== undefined) out[f.key] = x; }
  return out as Partial<NarratorTurn>;
}

/** A new entry of a list: each fixed choice at its first value (an entry is whole from the start), the rest empty. */
function blank(s: Schema): any {
  if (s.type === 'object' && s.properties) return Object.fromEntries(Object.entries(s.properties).filter(([, p]) => p.enum && p.type !== 'array').map(([k, p]) => [k, p.enum!.find((x) => x !== '') ?? p.enum![0]]));
  if (s.enum) return s.enum[0];
  return '';
}

// ---------- the form ----------
const ink = { ground: '#0A0D13', panel: '#10151F', line: '#2E3A50', text: '#E7EBF3', muted: '#A3AEC2', white: '#FFFFFF' };
const box: React.CSSProperties = { minHeight: 32, maxWidth: '100%', padding: '0 8px', borderRadius: 8, border: '1px solid ' + ink.line, background: ink.ground, color: ink.text, fontFamily: 'inherit', fontSize: 'var(--fs-sub)' };
const smallBtn: React.CSSProperties = { minHeight: 30, padding: '0 10px', borderRadius: 8, border: '1px solid ' + ink.line, background: 'transparent', color: ink.text, fontFamily: 'inherit', fontSize: 'var(--fs-sub)', fontWeight: 700, cursor: 'pointer' };
const kick: React.CSSProperties = { fontSize: 'var(--fs-sub)', fontWeight: 700, letterSpacing: '0.12em', color: ink.muted };

type Ctx = { g: GameState; chars: { value: string; label: string }[] };
/** A list the field's key offers (a datalist id), or a fixed list of choices. */
function choicesFor(key: string, s: Schema, ctx: Ctx): { opts?: { value: string; label: string }[]; list?: string } {
  if (key === 'charId' || key === 'footnote') {
    const all = s.enum ? s.enum.includes('all') : false;
    return { opts: [...(key === 'footnote' ? [{ value: '', label: 'Nobody' }] : []), ...ctx.chars, ...(all ? [{ value: 'all', label: 'Everyone' }] : [])] };
  }
  if (key === 'skill' || key === 'skills') return { opts: Object.values(SKILL).map((k: any) => ({ value: k.id, label: k.name })).sort((a, b) => a.label.localeCompare(b.label)) };
  if (s.enum) return { opts: s.enum.map((x) => ({ value: String(x), label: x === '' ? '(none)' : x === 'none' && key === 'charId' ? 'Nobody' : String(x) })) };
  if (key === 'weapon') return { list: 'gm-dl-weapons' };
  if (key === 'item' || key === 'failItem') return { list: 'gm-dl-items' };
  if (['target', 'targetId', 'id', 'objId'].includes(key)) return { list: 'gm-dl-ids' };
  return {};
}

function Field({ k, s: s0, v, set, ctx, path, name, top }: { k: string; s: Schema; v: any; set: (x: any) => void; ctx: Ctx; path: string; name?: string; top?: string }) {
  const s = plain(s0), label = name || words(k), hint = top != null ? top : s.description || '';
  const o = objectOf(s);
  const head = top != null && (o || s.type === 'array') ? <><span style={{ fontSize: 'var(--fs-sub)', fontWeight: 700, color: ink.text }}>{label}</span>{hint ? <span style={{ fontSize: 'var(--fs-sub)', lineHeight: 1.4, color: '#7F8BA1' }}>{hint}</span> : null}</> : null;
  if (s.anyOf && o) { // null or an object: a box to include it
    const on = !!v && typeof v === 'object';
    return <div data-gm-field={path} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{head}
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 'var(--fs-sub)', color: ink.text }}><input type="checkbox" aria-label={'Include ' + label.toLowerCase()} checked={on} onChange={(e) => set(e.target.checked ? blank(o) : undefined)} />Include {label.toLowerCase()}</label>
      {!head && hint && <span style={{ fontSize: 'var(--fs-sub)', color: ink.muted }}>{hint}</span>}
      {on && <Obj s={o} v={v} set={set} ctx={ctx} path={path} />}
    </div>;
  }
  if (s.type === 'array' && s.items && (s.items.type === 'object' && s.items.properties)) {
    const list: any[] = Array.isArray(v) ? v : [];
    return <div data-gm-field={path} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{head}
      {list.map((x, i) => <div key={i} data-gm-entry={path + '.' + i} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 8, borderRadius: 8, border: '1px solid #232D3F', background: '#0D1119' }}>
        <span style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}><span style={kick}>{label.toUpperCase()} {i + 1}</span>
          <button type="button" style={smallBtn} aria-label={'Remove ' + label.toLowerCase() + ' ' + (i + 1)} onClick={() => set(list.filter((_, j) => j !== i))}>×</button></span>
        <Obj s={s.items!} v={x} set={(y) => set(list.map((z, j) => (j === i ? y : z)))} ctx={ctx} path={path + '.' + i} />
      </div>)}
      <button type="button" data-gm-add={path} style={{ ...smallBtn, alignSelf: 'flex-start' }} onClick={() => set([...list, blank(s.items!)])}>+ {label}</button>
    </div>;
  }
  if (s.type === 'array') { // a list of words: a multi-pick where the key offers choices, else words split by commas
    const list: any[] = Array.isArray(v) ? v : [];
    const ch = choicesFor(k, s.items || {}, ctx);
    if (ch.opts) return <label data-gm-field={path} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 'var(--fs-sub)', color: ink.muted }}>{label}
      <select multiple aria-label={label} value={list.map(String)} onChange={(e) => set([...e.target.selectedOptions].map((x) => x.value))} style={{ ...box, minHeight: 64 }}>{ch.opts.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></label>;
    if (s.items && s.items.type === 'object') return <Json label={label} hint={hint} v={v} set={set} path={path} />;
    return <label data-gm-field={path} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 'var(--fs-sub)', color: ink.muted }}>{label}{hint ? ' · ' + hint : ''}
      <input aria-label={label} value={list.join(', ')} placeholder="separated by commas" onChange={(e) => set(e.target.value.split(',').map((x) => x.trim()).filter(Boolean))} style={box} /></label>;
  }
  if (s.type === 'object' && s.properties) return <div data-gm-field={path} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><span style={kick}>{label.toUpperCase()}</span><Obj s={s} v={v || {}} set={set} ctx={ctx} path={path} /></div>;
  if (s.type === 'object') return <Json label={label} hint={hint} v={v} set={set} path={path} />;
  if (s.type === 'boolean') return <label data-gm-field={path} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 'var(--fs-sub)', color: ink.text }}><input type="checkbox" aria-label={label} checked={v === true} onChange={(e) => set(e.target.checked || undefined)} />{label}{hint ? <span style={{ color: ink.muted }}> · {hint}</span> : null}</label>;
  const ch = choicesFor(k, s, ctx);
  const long = k === 'text' || k === 'line' || k === 'summary' || k === 'saga' || k === 'notes' || k === 'ooc' || k === 'stakes' || k === 'deed';
  return <label data-gm-field={path} style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: long ? '1 1 100%' : '1 1 140px', minWidth: 0, fontSize: 'var(--fs-sub)', color: ink.muted }}>
    <span>{label}{hint && hint.length < 90 ? <span style={{ color: '#7F8BA1' }}> · {hint}</span> : null}</span>
    {ch.opts ? <select aria-label={label} value={v == null ? '' : String(v)} onChange={(e) => set(e.target.value)} style={box}>{(ch.opts.some((x) => x.value === '') ? [] : [<option key="" value="">—</option>]).concat(ch.opts.map((x) => <option key={x.value} value={x.value}>{x.label}</option>))}</select>
      : long ? <textarea aria-label={label} rows={2} value={v == null ? '' : String(v)} onChange={(e) => set(e.target.value)} style={{ ...box, padding: '6px 8px', resize: 'vertical' }} />
      : <input aria-label={label} list={ch.list} type={s.type === 'integer' || s.type === 'number' ? 'number' : 'text'} min={s.minimum} max={s.maximum} value={v == null ? '' : String(v)} onChange={(e) => set(e.target.value)} placeholder={k === 'at' || k === 'to' ? 'C7' : ''} style={box} />}
    {hint && hint.length >= 90 ? <span style={{ color: '#7F8BA1' }}>{hint}</span> : null}
  </label>;
}
function Obj({ s, v, set, ctx, path }: { s: Schema; v: any; set: (x: any) => void; ctx: Ctx; path: string }) {
  const val = v && typeof v === 'object' ? v : {};
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' }}>
    {Object.entries(s.properties || {}).map(([k, ps]) => <Field key={k} k={k} s={ps} v={val[k]} set={(x) => set({ ...val, [k]: x })} ctx={ctx} path={path + '.' + k} />)}
  </div>;
}
/** A field whose shape the AI's tool leaves open (a spawn list, a drop table): written as JSON. */
function Json({ label, hint, v, set, path }: { label: string; hint: string; v: any; set: (x: any) => void; path: string }) {
  const [txt, setTxt] = React.useState(v == null ? '' : typeof v === 'string' ? v : JSON.stringify(v));
  let bad = false; if (txt.trim()) { try { JSON.parse(txt); } catch { bad = true; } }
  return <label data-gm-field={path} style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 100%', fontSize: 'var(--fs-sub)', color: ink.muted }}>{label} (as JSON){hint ? ' · ' + hint : ''}
    <textarea aria-label={label + ' (as JSON)'} rows={2} value={txt} onChange={(e) => { setTxt(e.target.value); try { set(e.target.value.trim() ? JSON.parse(e.target.value) : undefined); } catch { /* kept as typed until it reads */ } }} style={{ ...box, padding: '6px 8px', fontFamily: 'monospace', borderColor: bad ? '#F65157' : ink.line }} />
    {bad && <span role="alert" style={{ color: '#F65157' }}>Not JSON yet: this field is left out until it reads.</span>}
  </label>;
}

function useDesk() { const [, bump] = React.useReducer((x: number) => x + 1, 0); React.useEffect(() => { subs.add(bump); return () => { subs.delete(bump); }; }, []); }

function Slot({ at, children }: { at: string; children: React.ReactNode }) {
  const [host, setHost] = React.useState<Element | null>(null);
  React.useLayoutEffect(() => { const el = document.querySelector(at); if (el !== host) setHost(el); });
  return host && host.isConnected ? createPortal(children, host) : null;
}

/** The rest of the turn, under the template's desk. */
function DeskMore({ g }: { g: GameState }) {
  useDesk();
  const fields = React.useMemo(() => deskFields(g), [g.characters, g.campaign, g.story.zone]);
  const chars = Object.values(g.characters).map((c) => ({ value: c.id, label: c.name }));
  const ctx: Ctx = { g, chars };
  const ids = [...(g.story.npcs || []).map((n) => [n.id, n.name]), ...(g.story.objects || []).map((o) => [o.id, o.name]), ...chars.map((c) => [c.value, c.label])];
  const filled = (k: string) => clean(fields.find((f) => f.key === k)!.schema, extra[k]) !== undefined;
  return <div data-gm-more-fields="" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <datalist id="gm-dl-weapons">{Object.keys(WEAPON).map((id) => <option key={id} value={id}>{(WEAPON as any)[id].name}</option>)}</datalist>
    <datalist id="gm-dl-items">{[...Object.keys(ITEM), ...Object.keys(WEAPON)].map((id) => <option key={id} value={id}>{((ITEM as any)[id] || (WEAPON as any)[id]).name}</option>)}</datalist>
    <datalist id="gm-dl-ids">{ids.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</datalist>
    <span style={{ fontSize: 'var(--fs-sub)', lineHeight: 1.45, color: ink.muted }}>The rest of the turn: the same fields the AI Narrator fills. Leave a field empty and it is left out; the engine checks every one.</span>
    {GROUPS.map(([gid, head]) => { const fs = fields.filter((f) => f.group === gid); if (!fs.length) return null; const n = fs.filter((f) => filled(f.key)).length;
      return <details key={gid} data-gm-group={gid} style={{ borderTop: '1px solid #232D3F', paddingTop: 6 }}>
        <summary style={{ ...kick, cursor: 'pointer', color: n ? ink.white : ink.muted }}>{head}{n ? ' · ' + n + ' FILLED' : ''}</summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 8 }}>
          {fs.map((f) => <div key={f.key} data-gm-top={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Field k={f.key} name={f.label} top={f.hint} s={f.schema} v={extra[f.key]} set={(x) => setDeskField(f.key, x)} ctx={ctx} path={f.key} />
          </div>)}
        </div>
      </details>; })}
  </div>;
}

// ---------- the private view ----------
const TRUTH: Record<string, string> = { true: 'TRUE', partial: 'PARTIAL', misleading: 'MISLEADING' };
function Notes({ g }: { g: GameState }) {
  const sc = g.story.scene, name = (id: string) => g.characters[id]?.name || id, at = (k?: string) => (k ? refOf(k) : '?');
  const heard = (hid: string) => Object.values(g.characters).filter((c) => sc.revealed.includes(c.id + ':' + hid)).map((c) => c.name);
  const lurk = (g.story.npcs || []).filter((n) => n.hidden), hidObj = (g.story.objects || []).filter((o) => o.hidden);
  const hz = ((g.story as any).hazards || []).filter((h: any) => h.hidden), trg: any[] = (g.story as any).triggers || [];
  const open = (g.checks || []).filter((k: any) => !k.done);
  const people = (g.story.npcs || []).filter((n) => !n.hidden && (n.wants || n.knows));
  const sec = (head: string, id: string, rows: React.ReactNode[], none: string) => <section data-gm-notes-sec={id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <span style={kick}>{head}</span>{rows.length ? rows : <span style={{ fontSize: 'var(--fs-sub)', color: '#7F8BA1' }}>{none}</span>}</section>;
  const row = (key: string, text: React.ReactNode) => <span key={key} style={{ fontSize: 'var(--fs-sub)', lineHeight: 1.45, color: ink.text }}>{text}</span>;
  return <div data-gm-notes-view="" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontFamily: "'Spectral', serif", fontSize: 24, fontWeight: 600 }}>The Narrator's notes</span>
      <span style={{ fontSize: 'var(--fs-sub)', lineHeight: 1.45, color: ink.muted }}>Only you see this: what the story hides from the players. You narrate; you have no character of your own here.</span>
    </div>
    {sec('THE PARTY', 'party', Object.values(g.characters).map((c) => row(c.id, <>{c.name} · level {c.level} · {c.dead ? 'dead' : 'HP ' + c.hp} · {g.players.find((p) => p.id === c.owner)?.name || '?'}</>)), 'No characters yet.')}
    {sec('VOICE HOOKS · THIS SCENE', 'hooks', sc.hooks.map((h) => { const who = heard(h.id); return row(h.id, <><b>{(SKILL as any)[h.skill]?.name || h.skill}</b> · TN {h.tn} · <span data-gm-truth={h.truth}>{TRUTH[h.truth] || h.truth}</span> · "{h.line}"{who.length ? ' · heard by ' + who.join(', ') : ' · nobody heard it'}</>); }), 'No hooks in this scene.')}
    {sec('CHECKS WAITING', 'checks', open.map((k: any) => row(k.id, <>{name(k.charId)} · {(k.skills || []).map((s: string) => (SKILL as any)[s]?.name || s).join(' or ')} · TN {k.tn} · {k.stakes}</>)), 'None.')}
    {sec('LURKING', 'lurkers', lurk.map((n) => row(n.id, <><b>{n.name}</b> at {at(n.pos)} · {n.side} {n.tier}{n.weapon ? ' · ' + ((WEAPON as any)[n.weapon]?.name || n.weapon) : ''}{n.wants ? ' · wants: ' + n.wants : ''}</>)), 'Nobody hidden.')}
    {sec('HIDDEN THINGS', 'objects', [...hidObj.map((o) => row(o.id, <><b>{o.name}</b> ({o.kind}) at {at(o.pos)}</>)), ...hz.map((h: any) => row('hz' + h.id, <><b>{h.name || h.kind}</b> ({h.kind}, {h.severity}) on {(h.tiles || []).length} tiles</>))], 'Nothing hidden.')}
    {sec('TRIGGERS', 'triggers', trg.map((t, i) => row('t' + (t.id || i), <>{t.name || t.id}: when {t.when}{t.objId ? ' ' + t.objId : ''}{t.objective ? ' ' + t.objective : ''}{t.tiles && t.tiles.length ? ' (' + t.tiles.length + ' tiles)' : ''}, then {t.then}{t.text ? ' · "' + t.text + '"' : ''}</>)), 'No triggers.')}
    {sec('WHAT PEOPLE WANT AND KNOW', 'people', people.map((n) => row(n.id, <><b>{n.name}</b>{n.wants ? ' · wants: ' + n.wants + (n.wantsShown ? ' (told)' : '') : ''}{n.knows && n.knows.objective ? ' · knows: ' + n.knows.hint + (n.informed ? ' (told)' : '') : ''}</>)), 'Nobody with a secret here.')}
  </div>;
}

/** Mounted once (App.tsx): on the human Narrator's own screen only, the desk's rest and the private notes. */
export function NarratorSeat({ game, meId }: { game: GameState | null; meId: string }) {
  if (!game || !narratorSeat(game, meId)) return null;
  return <>
    <Slot at="[data-gm-more]"><DeskMore g={game} /></Slot>
    <Slot at="[data-gm-notes]"><Notes g={game} /></Slot>
  </>;
}
