// Character files (spec: Character files): a character is a .phc.zip anyone can download and send to a friend:
// character.json (the sheet) plus portrait.jpg at full size when the portrait is your own upload. The room only
// ever carries a small copy of an uploaded portrait (320 × 400), so rooms stay light whatever people upload.
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { validateSheet, ARCHETYPES, SIGIL, SCHOOL, MODULE, type Sheet } from '@engine';
import { getState, saveToLibrary, toast } from './store';
import PD from './protodata.json';

/** The identity fields a character file may carry, each a short string. */
export const ID_KEYS = ['gender', 'blood', 'hand', 'association', 'song', 'songTitle', 'songArtist', 'dream', 'history'];
const ID_LEN: Record<string, number> = { dream: 2000, history: 4000 };
const BUILT_IN = new Set((PD as any).portraits.map((p: any) => p.img));

const THUMB = [320, 400], FULL = [1200, 1500];
const FORMAT = 'phc-character', VERSION = 1;

// ---------- full-size portraits, kept in this browser (IndexedDB), keyed by their small copy ----------
const db = (() => { let p: Promise<IDBDatabase | null> | null = null; return () => (p ||= new Promise((res) => { try { const r = indexedDB.open('phc-files', 1); r.onupgradeneeded = () => r.result.createObjectStore('portraits'); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch { res(null); } })); })();
const keyOf = (thumb: string) => { let h = 2166136261; for (let i = 0; i < thumb.length; i++) h = Math.imul(h ^ thumb.charCodeAt(i), 16777619); return 'p' + (h >>> 0).toString(36) + '-' + thumb.length; };
async function keepFull(thumb: string, full: Blob) { const d = await db(); if (!d) return; try { d.transaction('portraits', 'readwrite').objectStore('portraits').put(full, keyOf(thumb)); } catch { /* */ } }
async function fullFor(thumb: string): Promise<Blob | null> { const d = await db(); if (!d) return null; return new Promise((res) => { try { const r = d.transaction('portraits', 'readonly').objectStore('portraits').get(keyOf(thumb)); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); } catch { res(null); } }); }

// ---------- images ----------
const loadImage = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('not an image')); i.src = src; });
/** Crop to 4:5 (centred) at this size. */
function crop(img: HTMLImageElement, [W, H]: number[]) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const r = Math.max(W / img.width, H / img.height), w = img.width * r, h = img.height * r, x = c.getContext('2d')!;
  x.fillStyle = '#000'; x.fillRect(0, 0, W, H); x.drawImage(img, (W - w) / 2, (H - h) / 2, w, h); return c;
}
const toBlob = (c: HTMLCanvasElement, q: number) => new Promise<Blob>((res) => c.toBlob((b) => res(b!), 'image/jpeg', q));
/** A portrait from any image: the small copy for the sheet (a data URL) and the full one kept in this browser. */
export async function portraitFrom(src: Blob): Promise<string> {
  const url = URL.createObjectURL(src);
  try {
    const img = await loadImage(url), thumb = crop(img, THUMB).toDataURL('image/jpeg', 0.82);
    // Full size: as big as the image allows at 4:5, up to 1200 × 1500.
    const w = Math.max(THUMB[0], Math.round(Math.min(FULL[0], img.width, img.height * 0.8)));
    await keepFull(thumb, await toBlob(crop(img, [w, Math.round(w * 1.25)]), 0.92));
    return thumb;
  } finally { URL.revokeObjectURL(url); }
}
const pick = (accept: string) => new Promise<File | null>((res) => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.onchange = () => res(i.files?.[0] || null); i.click(); });
/** The creation screen's Upload button. */
export async function uploadPortrait(done: (thumb: string) => void) {
  const f = await pick('image/*'); if (!f) return;
  try { done(await portraitFrom(f)); } catch { toast('That file is not an image this browser can read.'); }
}
/** The biggest copy of a portrait this browser has (for enlarging your own uploaded portrait). */
export async function bigPortrait(thumb: string): Promise<string> { if (!/^data:/.test(thumb)) return thumb; const b = await fullFor(thumb); return b ? URL.createObjectURL(b) : thumb; }

// ---------- export and import ----------
const slug = (s: string) => (s || 'character').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 40) || 'character';
export async function exportCharacter(sheet: Sheet & { savedAt?: number; draft?: boolean }) {
  const { savedAt, ...rest } = sheet as any;
  const files: Record<string, Uint8Array> = {};
  const own = /^data:image\//.test(sheet.portrait || '');
  if (own) { const b = (await fullFor(sheet.portrait)) || (await (await fetch(sheet.portrait)).blob()); files['portrait.jpg'] = new Uint8Array(await b.arrayBuffer()); }
  files['character.json'] = strToU8(JSON.stringify({ format: FORMAT, version: VERSION, sheet: { ...rest, portrait: own ? 'portrait.jpg' : sheet.portrait } }, null, 2));
  const blob = new Blob([zipSync(files, { level: 6 })], { type: 'application/zip' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = slug(sheet.name) + '.phc.zip'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
/** An imported file's cut-in framing (the uploaded portrait's eye line, decision 111): kept only with the file's own
 *  portrait, as a finite number clamped as the engine does (0.05–0.70, two decimals). Pure (tests). */
export function importedEye(v: unknown, ownPortrait: boolean): number | undefined {
  if (!ownPortrait || v == null || v === '' || typeof v === 'boolean') return undefined;
  const y = Number(v); if (!Number.isFinite(y)) return undefined;
  return Math.round(Math.min(0.7, Math.max(0.05, y)) * 100) / 100;
}
/** Read a character file into a sheet (its portrait made into the small copy). Throws with a plain message. */
export async function readCharacterFile(f: Blob): Promise<Sheet & { draft?: boolean }> {
  const bytes = new Uint8Array(await f.arrayBuffer());
  let json: any, portrait: Uint8Array | null = null;
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    let files: Record<string, Uint8Array>;
    // Unpack only the two files we read, and refuse anything that would inflate past 21 MB.
    let total = 0;
    try { files = unzipSync(bytes, { filter: (x) => {
      const want = /(^|\/)character\.json$/.test(x.name) ? x.originalSize < 1_000_000 : /(^|\/)portrait\.(jpe?g|png|webp)$/i.test(x.name) ? x.originalSize < 20_000_000 : false;
      return want && (total += x.originalSize) <= 21_000_000; } }); } catch { throw new Error('That zip is damaged.'); }
    const name = Object.keys(files).find((n) => /(^|\/)character\.json$/.test(n));
    if (!name) throw new Error('No character.json in that zip.');
    json = JSON.parse(strFromU8(files[name]));
    const pn = Object.keys(files).find((n) => /(^|\/)portrait\.(jpe?g|png|webp)$/i.test(n)); if (pn) portrait = files[pn];
  } else { try { json = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new Error('That is not a character file.'); } }
  if (!json || json.format !== FORMAT || !json.sheet || typeof json.sheet.name !== 'string') throw new Error('That is not a character file.');
  const s = json.sheet;
  // A file is untrusted: keep only what a sheet has, as plain numbers and short strings.
  const nums = (o: any) => Object.fromEntries(Object.entries(o && typeof o === 'object' ? o : {}).filter(([k, v]) => k.length < 40 && typeof v === 'number').slice(0, 40));
  const idIn = s.identity && typeof s.identity === 'object' ? s.identity : {};
  const sheet: any = { name: String(s.name).slice(0, 60), portrait: '', origin: String(s.origin || '').slice(0, 80), kit: String(s.kit || '').slice(0, 40),
    traits: Array.isArray(s.traits) ? s.traits.slice(0, 4).map((t: unknown) => String(t).slice(0, 60)) : [],
    skills: nums(s.skills), attrs: nums(s.attrs), cores: nums(s.cores),
    identity: Object.fromEntries(ID_KEYS.filter((k) => typeof idIn[k] === 'string').map((k) => [k, idIn[k].slice(0, ID_LEN[k] || 300)])),
    archetype: typeof s.archetype === 'string' && ARCHETYPES.some((a: any) => a.id === s.archetype) ? s.archetype : null };
  // Starting magic picks (spec: The Magic panel): known word, school and module ids only.
  // Only for a build that can cast, as on the Create screen: Brain Power 1+ or the Sigil student kit for words,
  // Will Power 1+ or the Soul initiate kit for an Outburst. An edited or older file can't hand magic to anyone else.
  const canSigil = (sheet.skills.brain_power || 0) >= 1 || sheet.kit === 'sigil', canSoul = (sheet.skills.will_power || 0) >= 1 || sheet.kit === 'soul';
  if (canSigil && Array.isArray(s.sigils)) sheet.sigils = s.sigils.filter((w: unknown) => typeof w === 'string' && SIGIL[w]).slice(0, 2);
  const ob = s.outburst;
  if (canSoul && ob && typeof ob === 'object' && typeof ob.school === 'string' && SCHOOL[ob.school]) sheet.outburst = { school: ob.school,
    modules: Array.isArray(ob.modules) ? ob.modules.filter((m: unknown) => typeof m === 'string' && MODULE[m]).slice(0, 8) : [],
    ...(typeof ob.name === 'string' && ob.name.trim() ? { name: ob.name.slice(0, 40) } : {}), ...(typeof ob.option === 'string' ? { option: ob.option.slice(0, 40) } : {}) };
  if (portrait) sheet.portrait = await portraitFrom(new Blob([portrait as BlobPart]));
  else if (typeof s.portrait === 'string' && BUILT_IN.has(s.portrait)) sheet.portrait = s.portrait; // a built-in portrait, never an outside link
  // The cut-in framing an uploaded portrait was given (decision 111): only with that portrait.
  { const eye = importedEye(s.portraitEye, !!portrait); if (eye != null) sheet.portraitEye = eye; }
  if (s.draft || validateSheet(sheet)) sheet.draft = true;
  return sheet;
}
/** The Import button: pick a file, add it to this browser's characters. */
export async function importCharacter(): Promise<(Sheet & { draft?: boolean }) | null> {
  const f = await pick('.zip,.json,application/zip,application/json'); if (!f) return null;
  try {
    const sheet = await readCharacterFile(f);
    // Never overwrite a character you already have: the import takes a free name.
    const taken = new Set(getState().library.map((x) => x.name));
    if (taken.has(sheet.name)) { const base = sheet.name.slice(0, 54); let n = 2; while (taken.has(base + ' (' + n + ')')) n++; sheet.name = base + ' (' + n + ')'; }
    saveToLibrary(sheet as any);
    toast(sheet.draft ? sheet.name + ' imported as a draft: open it to finish or fix it.' : sheet.name + ' imported to your characters.', true);
    return sheet;
  } catch (e: any) { toast(e?.message || 'Could not read that file.'); return null; }
}
