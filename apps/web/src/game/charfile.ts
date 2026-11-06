// Character files (spec: Character files): a character is a .phc.zip anyone can download and send to a friend:
// character.json (the sheet) plus portrait.jpg at full size when the portrait is your own upload. The room only
// ever carries a small copy of an uploaded portrait (320 × 400), so rooms stay light whatever people upload.
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { validateSheet, type Sheet } from '@engine';
import { saveToLibrary, toast } from './store';

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
/** Read a character file into a sheet (its portrait made into the small copy). Throws with a plain message. */
export async function readCharacterFile(f: Blob): Promise<Sheet & { draft?: boolean }> {
  const bytes = new Uint8Array(await f.arrayBuffer());
  let json: any, portrait: Uint8Array | null = null;
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    let files: Record<string, Uint8Array>;
    try { files = unzipSync(bytes, { filter: (x) => x.originalSize < 30_000_000 }); } catch { throw new Error('That zip is damaged.'); }
    const name = Object.keys(files).find((n) => /(^|\/)character\.json$/.test(n));
    if (!name) throw new Error('No character.json in that zip.');
    json = JSON.parse(strFromU8(files[name]));
    const pn = Object.keys(files).find((n) => /(^|\/)portrait\.(jpe?g|png|webp)$/i.test(n)); if (pn) portrait = files[pn];
  } else { try { json = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new Error('That is not a character file.'); } }
  if (!json || json.format !== FORMAT || !json.sheet || typeof json.sheet.name !== 'string') throw new Error('That is not a character file.');
  const s = json.sheet;
  const sheet: any = { name: String(s.name).slice(0, 60), portrait: '', origin: String(s.origin || ''), kit: String(s.kit || ''), traits: Array.isArray(s.traits) ? s.traits.map(String) : [],
    skills: { ...(s.skills || {}) }, attrs: { ...(s.attrs || {}) }, cores: { ...(s.cores || {}) }, identity: { ...(s.identity || {}) }, archetype: s.archetype || null };
  if (portrait) sheet.portrait = await portraitFrom(new Blob([portrait as BlobPart]));
  else if (typeof s.portrait === 'string' && /^\/[\w\-./]+$/.test(s.portrait)) sheet.portrait = s.portrait; // a built-in portrait
  if (s.draft || validateSheet(sheet)) sheet.draft = true;
  return sheet;
}
/** The Import button: pick a file, add it to this browser's characters. */
export async function importCharacter(): Promise<(Sheet & { draft?: boolean }) | null> {
  const f = await pick('.zip,.json,application/zip,application/json'); if (!f) return null;
  try {
    const sheet = await readCharacterFile(f);
    saveToLibrary(sheet as any);
    toast(sheet.draft ? sheet.name + ' imported as a draft: open it to finish or fix it.' : sheet.name + ' imported to your characters.', true);
    return sheet;
  } catch (e: any) { toast(e?.message || 'Could not read that file.'); return null; }
}
