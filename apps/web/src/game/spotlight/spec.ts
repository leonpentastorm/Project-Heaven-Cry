// What a spotlight cut-in shows (docs/design/cutin-spec.md 3–5): the engine's `spotlight` events turned into strips (whose
// eyes, in which ink), a label and a caption. Pure apart from the art lookups (tests).
import { type GameState, type FxEvent, ATTRS, CLASS, FAITH_PATRON, SKILL, SPOTLIGHT_PRIORITY, type SpotlightKind } from '@engine';
import { ART, ART_BIG, IMG } from '../../screens/shared';
import { ATTR_INK } from '../classView';
import { accentOf, patronPortrait, FAITH_INK } from '../faithArt';
import EYES from '../eyelines.json';

export type CutInKind = SpotlightKind;
export interface Eye { x: number; y: number }
export interface CutInStrip {
  /** Unique per character ('c:<id>') or patron ('p:<id>'): Once per scene counts these. */
  key: string;
  img: string; eye: Eye;
  /** The strip's ink (the lip, the label, the name chip). */
  ink: string;
  name: string;
  /** The word that goes with the ink (the attribute, or the patron): colour is never the only signal. */
  word: string;
  god?: boolean;
  /** A small square avatar (Wick's placeholder robot): shown whole in a window fitted to it, not cropped to its eyes. */
  whole?: boolean;
  /** No face at all (a companion with no portrait): its token's initials, large in the eye window. */
  badge?: string;
}
export interface CutInSpec {
  id?: string; seed?: number | string;
  kind: CutInKind;
  strips: CutInStrip[];
  /** Chakra Petch label: "TAKEDOWN · AGILITY", "INTERVENTION · THE TOLL-KEEPER". */
  label: string;
  /** Spectral italic: "Took down Warden". */
  caption?: string;
  /** Spoken words (a god's line, a deed), shown in quotes before the caption. */
  line?: string;
  /** Strips past the fourth (the caption ends "+N more"). */
  more?: number;
  /** The scene or fight key (Once per scene). */
  scene?: string;
  /** Screen readers' one line. */
  aria?: string;
  /** A crit in a fight (decision 113): the short cut-in (one strip, about 2.24 s at Fast, × the combat speed; its words
   *  held timing.ts CRIT_READ_MS to be read). */
  short?: boolean;
}

/** Where the eyes sit when a portrait has no eye line (an upload with no framing set). */
export const DEFAULT_EYE: Eye = { x: 0.5, y: 0.38 };
const EYE_MAP = EYES as unknown as Record<string, [number, number]>;
/** An art library portrait's eye line by asset name ('char-…', 'patron-…'). */
export function eyeFor(asset: string | null | undefined): Eye | null {
  const e = asset ? EYE_MAP[asset] : null; return e ? { x: e[0], y: e[1] } : null;
}

const ATTR_NAME: Record<string, string> = Object.fromEntries(ATTRS.map((a) => [a.id, a.name]));
/** A character's colour: the ink of their highest attribute; a tie goes to their class's attribute, else the tree's
 *  order (Endurance … Virtue). */
export function inkOfChar(ch: any): { attr: string; name: string; ink: string } {
  const attrs: Record<string, number> = ch?.attrs || {};
  const top = Math.max(1, ...ATTRS.map((a) => Number(attrs[a.id]) || 0));
  const tied = ATTRS.filter((a) => (Number(attrs[a.id]) || 0) === top).map((a) => a.id);
  const cls = ch?.classId && (CLASS as any)[ch.classId]?.attribute;
  const id = tied.length ? (cls && tied.includes(cls) ? cls : tied[0]) : 'endurance';
  return { attr: id, name: ATTR_NAME[id] || id, ink: ATTR_INK[id] || '#A3AEC2' };
}

/** The asset name behind a portrait value: a name ('char-mallow-3') or a built URL ('/assets/char-mallow-3.webp'). */
export const assetName = (p: string | null | undefined): string => { const m = String(p || '').match(/^\/assets\/([\w-]+?)(?:-lg)?\.webp$/); return m ? m[1] : String(p || ''); };
/** Faces that are not Heavenprint paintings (no eye line in the art catalog), framed by hand: Wick's placeholder robot (the
 *  Proving Ground recruit's face; its screen-eyes about a third of the way down) and Wick's welcome pose (the face of a
 *  character with no portrait at all, as the HUD shows it). `whole`: a small square avatar, shown whole (centred in a
 *  window fitted to it), never blown up into a blurred close-up of its eyes. `small`: use the small copy, the one the HUD
 *  shows; the large copy is a different picture (wick-narrator-placeholder-lg is Wick's model-study sheet, the Narrator's
 *  zoom, built by tools/build_web_assets.py from art/style-guide/references/wick-model-study.png). */
export const FRAMES: Record<string, Eye & { whole?: boolean; small?: boolean }> = {
  'wick-narrator-placeholder': { x: 0.5, y: 0.33, whole: true, small: true },
  'wick-welcome': { x: 0.5, y: 0.34, whole: true },
};
/** A face as the token and the HUD resolve it (the art library's name or a URL, an upload), in the large copy where there
 *  is one, with its eye line: the art's, the hand-set frame, the sheet's own (portraitEye, for an upload), else the default.
 *  With nothing that resolves (no portrait, an archived id), Wick's welcome pose: what the HUD shows. Never someone else's. */
export function faceFor(p: string | null | undefined, ownEye?: number | null): { img: string; eye: Eye; whole: boolean; asset: string } {
  const v = String(p || ''), name = assetName(v), ok = !!(ART(v) || ART(name));
  const asset = ok ? name : 'wick-welcome', fr = FRAMES[asset];
  const src = ok ? ((fr?.small ? ART(name) : ASSET_BIG(name)) || ART(v)) : (ART_BIG('wick-welcome') || IMG['wick-welcome'] || '');
  const eye = eyeFor(asset) || (fr ? { x: fr.x, y: fr.y } : null) || (ok && typeof ownEye === 'number' ? { x: 0.5, y: ownEye } : null) || DEFAULT_EYE;
  return { img: src, eye, whole: !!fr?.whole, asset };
}
/** The large copy of an art library name ('' for a URL or an upload, which ART passes through as it is). */
const ASSET_BIG = (name: string) => (/^(\/|https?:|data:|blob:)/.test(name) ? '' : ART_BIG(name));
/** A character's strip: their own portrait exactly as their token and the HUD show it (the large copy), its framing,
 *  their ink. A character with no portrait of their own gets Wick's welcome pose, as the HUD does (never an archetype's). */
export function stripForChar(g: GameState | null | undefined, charId: string | null | undefined): CutInStrip | null {
  const ch: any = charId && g?.characters?.[charId]; if (!ch) return null;
  const k = inkOfChar(ch), f = faceFor(ch.portrait, ch.portraitEye);
  return { key: 'c:' + ch.id, img: f.img, eye: f.eye, ...(f.whole ? { whole: true } : {}), ink: k.ink, name: ch.name || 'Someone', word: k.name };
}
/** A fighter's strip by unit id: a character's is theirs (stripForChar); a companion's (a drone, a beast, a twin) is its
 *  own face as its token draws it (its initials when it has none), in its controller's ink. */
export function stripForUnit(g: GameState | null | undefined, unitId: string | null | undefined): CutInStrip | null {
  const u: any = unitId && (g as any)?.combat?.units?.find((x: any) => x.id === unitId); if (!u) return null;
  if (u.charId) return stripForChar(g, u.charId);
  const owner: any = u.ctrl ? g?.characters?.[u.ctrl] : null, k = inkOfChar(owner);
  const has = !!(u.img && ART(u.img)), f = has ? faceFor(u.img) : null;
  return { key: 'u:' + u.id, img: f ? f.img : '', eye: f ? f.eye : DEFAULT_EYE, ...(f?.whole ? { whole: true } : {}), ...(f ? {} : { badge: String(u.short || u.name || '?').slice(0, 3) }),
    ink: k.ink, name: u.name || 'A companion', word: k.name };
}

/** A patron's data (data/patrons.json), under either form of its id ('toll_keeper' and 'the_toll_keeper'). */
export function patronData(id: string | null | undefined): any {
  const s = String(id || ''); return FAITH_PATRON[s] || FAITH_PATRON[s.replace(/^the_/, '')] || FAITH_PATRON['the_' + s] || null;
}
/** A patron's strip: the painted portrait, its eye line, the patron's accent (the data's first). */
export function stripForPatron(id: string | null | undefined): CutInStrip | null {
  if (!id) return null;
  const pd = patronData(id), keys = ['patron-' + id, 'patron-the_' + id, 'patron-' + String(id).replace(/^the_/, '')];
  const asset = keys.find((k) => eyeFor(k)) || null;
  return {
    key: 'p:' + (pd?.id || id), god: true, img: patronPortrait(String(id), true) || '', eye: eyeFor(asset) || { x: 0.5, y: 0.18 },
    ink: accentOf(String(id), pd?.accent), name: pd?.name || String(id).replace(/^the_/, '').replace(/_/g, ' '), word: (pd?.name || 'a patron').toUpperCase(),
  };
}

const KIND_WORD: Record<CutInKind, string> = { crit: 'CRITICAL SUCCESS', takedown: 'TAKEDOWN', revive: 'REVIVE', ultimate: 'ULTIMATE', legend: 'LEGENDARY DEED', song: 'THEIR SONG', god: 'INTERVENTION' };
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const low = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
/** One moment's caption (Spectral italic), from the engine's event. */
export function captionOf(e: any, g?: GameState | null): string {
  switch (e.kind as CutInKind) {
    case 'crit': {
      // A crit in a fight (decision 113): "Critical hit on Rook", the spell's kind beside it ("· Sigil", "· Outburst").
      if (e.via) return cap(String(e.reason || 'a critical hit').replace(/(^|: )a critical/, '$1critical')) + (e.via === 'sigil' ? ' · Sigil' : e.via === 'outburst' ? ' · Outburst' : '');
      const sk = e.skill && SKILL[e.skill] ? ' on ' + SKILL[e.skill].name : ''; return 'Natural 20' + sk + ' · ' + (Number(e.tn) >= 20 ? 'Heroic' : 'Hard'); }
    case 'takedown': return 'Took down ' + (e.targetName || 'an unseen hostile');
    case 'revive': return 'Brought ' + (e.targetName || (e.targetChar && g?.characters?.[e.targetChar]?.name) || 'an ally') + ' back';
    case 'ultimate': return 'An Ultimate, earned'; // never the perk's name: the secrecy rule (its own award screen names it)
    case 'legend': return 'A legendary deed';
    case 'song': return 'Plays their song'; // never the title (the Unspoken Name)
    case 'god': return cap(String(e.reason || (e.interject ? 'speaks' : 'intervenes')));
    default: return cap(String(e.reason || ''));
  }
}

/** Who acted in a moment: the unit (a companion has no character of its own), else the character. */
function leadStripOf(g: GameState | null | undefined, e: any): CutInStrip | null {
  const u: any = e?.unit && (g as any)?.combat?.units?.find((x: any) => x.id === e.unit);
  return u && !u.charId && u.companion ? stripForUnit(g, e.unit) : stripForChar(g, e?.char);
}

/** Order spotlight events by the lead priority (god > takedown > revive > legend > ultimate > crit > song). */
export const byPriority = (a: any, b: any) => SPOTLIGHT_PRIORITY.indexOf(a.kind) - SPOTLIGHT_PRIORITY.indexOf(b.kind);

/**
 * One cut-in from the spotlight events of one moment (one action in a fight, one state update out of it). Strips: the
 * gods first, then the lead's character, the revived or saved ally, the group; unique; four at most ("+N more").
 * Returns null when nothing can be shown (no known character or patron).
 */
export function cutInFromFx(g: GameState | null | undefined, events: FxEvent[], stream = ''): CutInSpec | null {
  const evs = (events || []).filter((e: any) => e && e.k === 'spotlight').slice().sort(byPriority);
  if (!evs.length) return null;
  const lead: any = evs[0];
  const strips: CutInStrip[] = [], seen = new Set<string>();
  const add = (s: CutInStrip | null) => { if (s && !seen.has(s.key)) { seen.add(s.key); strips.push(s); } };
  for (const e of evs as any[]) if (e.kind === 'god') add(stripForPatron(e.patron));
  // The lead's strip is the one who acted: a companion's own face when a companion did it (its unit), else the character's.
  const leadStrip = leadStripOf(g, lead);
  add(leadStrip);
  for (const e of evs as any[]) add(stripForChar(g, e.char));
  for (const e of evs as any[]) add(stripForChar(g, e.targetChar));
  for (const e of evs as any[]) for (const id of e.group || []) add(stripForChar(g, id));
  if (!strips.length) return null;
  // A crit in a fight leads only when nothing bigger came in its action: the short form, the lead's strip alone.
  const short = lead.kind === 'crit' && !!lead.via;
  const shown = strips.slice(0, short ? 1 : 4), more = short ? 0 : strips.length - shown.length;
  const leadChar = leadStrip;
  const word = lead.kind === 'god' ? (patronData(lead.patron)?.name || 'a patron').toUpperCase() : (leadChar ? leadChar.word.toUpperCase() : '');
  // A god interjection (lead.interject: the patron speaks up, nothing intervenes) is labelled with the bare name.
  const kw = lead.kind === 'crit' && lead.via ? 'CRITICAL HIT' : KIND_WORD[lead.kind as CutInKind];
  const label = lead.kind === 'god' && lead.interject ? word : kw + (word ? ' · ' + word : '');
  // A companion's strip already names it: its caption drops the "Combat drone: " the engine's line starts with.
  const byless = (t: string) => (leadStrip && leadStrip.key.startsWith('u:') && lead.by && t.startsWith(lead.by + ': ') ? cap(t.slice(lead.by.length + 2)) : t);
  const caps = [byless(captionOf(lead, g)), ...evs.slice(1).filter((e: any) => e.kind !== lead.kind || e.reason !== lead.reason).map((e) => low(captionOf(e, g)))];
  const caption = [...new Set(caps)].join(' · ') + (more > 0 ? ' · +' + more + ' more' : '');
  const line = lead.kind === 'legend' ? (lead.line ? cut(String(lead.line), 90) : undefined) : lead.line ? cut(String(lead.line), 140) : undefined;
  const who = lead.kind === 'god' ? (patronData(lead.patron)?.name || 'A patron') + (leadChar ? ' for ' + leadChar.name : '') : leadChar?.name || shown[0].name;
  return {
    id: (stream || 'fx') + '|' + lead.n, seed: (stream || 'fx') + '|' + lead.n, kind: lead.kind, strips: shown, label, caption, ...(line ? { line } : {}),
    ...(more > 0 ? { more } : {}), ...(short ? { short: true } : {}), scene: lead.scene, aria: 'Spotlight: ' + who + ', ' + low(byless(captionOf(lead, g))) + '.',
  };
}

/** The words colour for a god's label (faith words take Virtue ink; the accent is light only). */
export const GOD_WORD_INK = FAITH_INK;
