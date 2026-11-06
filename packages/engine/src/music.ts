// Music (spec: Music). The room hears one song at a time. Area and combat music come from the campaign; a player's
// favourite song takes over for a spotlight (something amazing) and, for the music traits, can be pinned. The engine
// decides what plays and why; each browser plays it (YouTube) and may pause it for itself, which changes nothing here.
import type { GameState } from './game';
import type { Character } from './character';
import { SKILL, TRAITS } from './data';

/** A track: a YouTube video and its credit. */
export interface Track { yt: string; title: string; artist: string; start?: number; length?: number; licence?: string }
export interface MusicNow {
  seq: number; layer: 'spotlight' | 'pin'; charId: string; track: Track; reason: string;
  /** Started during a fight: it plays until the fight ends. Otherwise one full play. */
  inCombat: boolean;
  /** A pin's area changes left. */
  areasLeft?: number;
}
export interface MusicState {
  seq: number; now: MusicNow | null; fight: number;
  /** Spotlight used, per character: the scene or fight it was used in (once each). */
  used: Record<string, string>;
  /** Music traits: area changes since the character's song last played. */
  silent: Record<string, number>;
}

export const PIN_AREAS = 2;
export const SONG_AP = 2;
const START_SILENT = 2;

/** The YouTube video id in a link ("youtu.be/…", "watch?v=…", "embed/…", "shorts/…") or a bare id. */
export function ytId(s: string | undefined | null): string | null {
  const t = String(s || '').trim();
  if (/^[\w-]{11}$/.test(t)) return t;
  const m = t.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);
  return m ? m[1] : null;
}
/** The start time in a link (t=90, t=1m30s), in seconds. */
export function ytStart(s: string | undefined | null): number {
  const m = String(s || '').match(/[?&#](?:t|start)=(\d+h)?(\d+m)?(\d+)?s?/);
  if (!m) return 0;
  return (parseInt(m[1] || '0') * 3600) + (parseInt(m[2] || '0') * 60) + parseInt(m[3] || '0');
}

/** A character's favourite song, from the identity fields (song link, title, artist, start, length). */
export function songOf(c: Pick<Character, 'identity'> | null | undefined): Track | null {
  const I = c?.identity || {}, yt = ytId(I.song);
  if (!yt) return null;
  return { yt, title: I.songTitle || 'Favourite song', artist: I.songArtist || '', start: Number(I.songStart) || ytStart(I.song) || 0, length: Number(I.songLength) || 0 };
}

/** The music trait a character has (Soundscape of the Soul, Headbanger, Underground Sound), if any. */
export function musicTraitOf(c: Pick<Character, 'traits'> | null | undefined) {
  return TRAITS.find((t) => (c?.traits || []).includes(t.id) && t.effects.some((e: any) => e.op === 'song_state')) || null;
}

export function musicOf(g: GameState): MusicState {
  return (g.music ||= { seq: 0, now: null, fight: 0, used: {}, silent: {} });
}

/** What the room should hear now: the spotlight or pin, else the fight's music, else the area's. */
export function musicFor(g: GameState): { key: string; layer: 'spotlight' | 'pin' | 'encounter' | 'combat' | 'ambient'; track: Track | null; reason: string; charId?: string; seq?: number } {
  const m = g.music?.now;
  if (m) return { key: 's' + m.seq, layer: m.layer, track: m.track, reason: m.reason, charId: m.charId, seq: m.seq };
  const camp = g.campaign, zone = camp?.zones.find((z) => z.id === (g.combat && g.phase === 'combat' ? g.combat.map.id : g.story.zone));
  if (g.phase === 'combat' && g.combat) {
    const enc = camp?.encounters?.find((e) => e.music && e.name.toLowerCase() === g.combat!.name.toLowerCase());
    if (enc?.music) return { key: 'e:' + enc.name + ':' + enc.music.yt, layer: 'encounter', track: enc.music, reason: 'Fight: ' + enc.name };
    const t = zone?.music?.combat || camp?.music?.combat || null;
    return { key: 'c:' + (t?.yt || ''), layer: 'combat', track: t, reason: 'Fight' };
  }
  const t = zone?.music?.ambient || camp?.music?.ambient || null;
  return { key: 'a:' + (t?.yt || ''), layer: 'ambient', track: t, reason: zone ? 'Area: ' + zone.name : 'Area' };
}

const usedKey = (g: GameState) => (g.phase === 'combat' ? 'fight' + musicOf(g).fight : 'scene' + g.story.scene.n);

/**
 * A character's song takes over the room. `kind`: 'spotlight' (anyone, once per scene or fight), 'trait' (a music
 * trait's own triggers: no limit) or 'manual' (a music trait's Play my song; it can take over another holder's pin).
 * A song that is already playing is never cut off, except a pin by a manual play. Returns whether it started.
 */
export function startSong(g: GameState, c: Character, reason: string, kind: 'spotlight' | 'trait' | 'manual', log: (t: string) => void): boolean {
  const m = musicOf(g), track = songOf(c);
  if (!track || c.dead) return false;
  if (kind !== 'spotlight' && !musicTraitOf(c)) return false;
  if (m.now) {
    if (m.now.charId === c.id) return false;
    if (!(kind === 'manual' && m.now.layer === 'pin')) return false;
  }
  if (kind === 'spotlight' && m.used[c.id] === usedKey(g)) return false;
  if (kind === 'spotlight') m.used[c.id] = usedKey(g);
  m.now = { seq: ++m.seq, layer: 'spotlight', charId: c.id, track, reason, inCombat: g.phase === 'combat' };
  m.silent[c.id] = 0;
  log('♪ ' + c.name + '\'s song: ' + reason + '.');
  return true;
}

/** The host's browser says a song finished its one full play. A song started in a fight waits for the fight to end. */
export function songEnded(g: GameState, seq: number) {
  const m = musicOf(g);
  if (m.now && m.now.seq === seq && m.now.layer === 'spotlight' && !(m.now.inCombat && g.phase === 'combat')) m.now = null;
}
/** A music-trait holder keeps their playing song on for everyone, for 2 area changes. */
export function pinSong(g: GameState, c: Character): string | null {
  const m = musicOf(g);
  if (!musicTraitOf(c)) return 'Only a music trait can keep the song playing.';
  if (!m.now || m.now.charId !== c.id) return 'Your song isn\'t playing.';
  m.now = { ...m.now, layer: 'pin', areasLeft: PIN_AREAS };
  return null;
}
export function unpinSong(g: GameState, c: Character): string | null {
  const m = musicOf(g);
  if (!m.now || m.now.charId !== c.id) return 'Your song isn\'t playing.';
  m.now = null;
  return null;
}
/** The fight ended: a song started in it stops. */
export function musicAfterFight(g: GameState) {
  const m = musicOf(g);
  if (m.now && m.now.layer === 'spotlight' && m.now.inCombat) m.now = null;
}
/** The party moved to another area: pins count down, music traits count the silence. */
export function musicOnTravel(g: GameState) {
  const m = musicOf(g);
  if (m.now?.layer === 'pin') { m.now.areasLeft = (m.now.areasLeft ?? PIN_AREAS) - 1; if (m.now.areasLeft <= 0) m.now = null; }
  for (const c of Object.values(g.characters)) if (musicTraitOf(c)) m.silent[c.id] = m.now?.charId === c.id ? 0 : (m.silent[c.id] ?? START_SILENT) + 1;
}

/** Music traits: is the bonus on (song playing, or under 2 area changes since), or the penalty (4 or more)? */
export function songStateOf(g: GameState, c: Character): 'on' | 'off' | 'neutral' | null {
  if (!musicTraitOf(c)) return null;
  const m = g.music, playing = m?.now?.charId === c.id, s = m?.silent[c.id] ?? START_SILENT;
  return playing || s < 2 ? 'on' : s >= 4 ? 'off' : 'neutral';
}
/** The music trait's modifier to one skill right now. */
export function songMod(g: GameState, c: Character, skill: string): number {
  const t = musicTraitOf(c), st = songStateOf(g, c);
  if (!t || !st || st === 'neutral') return 0;
  const tags: string[] = SKILL[skill] ? (SKILL[skill] as any).tags || ['core:' + SKILL[skill].core] : [];
  let v = 0;
  for (const e of t.effects) if (e.op === 'song_state') for (const x of (e[st] || [])) if (x.op === 'skill_mod_tag' && tags.includes(x.tag)) v += x.value;
  return v;
}
