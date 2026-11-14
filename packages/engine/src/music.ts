// Music (spec: Music). The room hears one song at a time. Area music comes from the campaign; fight music is the
// game's own soundtrack (OST), chosen by how the fight stands; a player's favourite song takes over for a spotlight
// (something amazing) and, for the music traits, can be pinned. The engine decides what plays and why; each browser
// plays it (YouTube, or the game's own file) and may pause it for itself, which changes nothing here.
import type { GameState } from './game';
import type { Character } from './character';
import { type Combat, visibility } from './combat';
import { SKILL, TRAITS } from './data';
import { seedFrom } from './rng';
import { costOf } from './effects/cost';
import { runSetting, runNode } from './run/state';
import './datatext'; // fills the texts' {=placeholders} before any data is read
import survivalJ from '../../../data/survival.json';

/** The game's own fight music (spec: Music): files the web client ships (apps/web/public/music). */
export type OstId = 'gunline' | 'heaven_falls' | 'last_rounds'
  | 'brass_on_the_floor' | 'danger_close' | 'flank_left' | 'held_breath' | 'hold_the_line' | 'line_of_four' | 'mag_check' | 'suppressing_fire'
  | 'gearing_up'
  // Survival mode's own tracks (audio/SUNO-PROMPTS-survival.md): which plays when is data (survival.json `music`, runMusic).
  | 'surv_camp' | 'surv_map' | 'surv_map_ahoc' | 'surv_map_city' | 'surv_map_field' | 'surv_map_works' | 'surv_map_shrine' | 'surv_map_rim'
  | 'surv_boon' | 'surv_shop' | 'surv_forge' | 'surv_rest';
/** A track: a YouTube video (yt), or one of the game's own tracks (ost), and its credit. */
export interface Track { yt?: string; ost?: OstId; title: string; artist: string; start?: number; length?: number; licence?: string }
export const OST_ARTIST = 'Project Heaven Cry OST';
export const OST: Record<OstId, Track & { ost: OstId }> = {
  gunline: { ost: 'gunline', title: 'Gunline', artist: OST_ARTIST, length: 70 },
  heaven_falls: { ost: 'heaven_falls', title: 'Heaven Falls', artist: OST_ARTIST, length: 137 },
  last_rounds: { ost: 'last_rounds', title: 'Last Rounds', artist: OST_ARTIST, length: 82 },
  brass_on_the_floor: { ost: 'brass_on_the_floor', title: 'Brass on the Floor', artist: OST_ARTIST, length: 57 },
  danger_close: { ost: 'danger_close', title: 'Danger Close', artist: OST_ARTIST, length: 60 },
  flank_left: { ost: 'flank_left', title: 'Flank Left', artist: OST_ARTIST, length: 62 },
  held_breath: { ost: 'held_breath', title: 'Held Breath', artist: OST_ARTIST, length: 61 },
  hold_the_line: { ost: 'hold_the_line', title: 'Hold the Line', artist: OST_ARTIST, length: 61 },
  line_of_four: { ost: 'line_of_four', title: 'Line of Four', artist: OST_ARTIST, length: 70 },
  mag_check: { ost: 'mag_check', title: 'Mag Check', artist: OST_ARTIST, length: 62 },
  suppressing_fire: { ost: 'suppressing_fire', title: 'Suppressing Fire', artist: OST_ARTIST, length: 59 },
  gearing_up: { ost: 'gearing_up', title: 'Gearing Up', artist: OST_ARTIST, length: 179 },
  surv_camp: { ost: 'surv_camp', title: 'Survival: Camp', artist: OST_ARTIST, length: 120 },
  surv_map: { ost: 'surv_map', title: 'Survival: Path Map', artist: OST_ARTIST, length: 120 },
  surv_map_ahoc: { ost: 'surv_map_ahoc', title: 'Survival: Path Map, AHOC outpost', artist: OST_ARTIST, length: 120 },
  surv_map_city: { ost: 'surv_map_city', title: 'Survival: Path Map, Central City', artist: OST_ARTIST, length: 120 },
  surv_map_field: { ost: 'surv_map_field', title: 'Survival: Path Map, old battlefield', artist: OST_ARTIST, length: 120 },
  surv_map_works: { ost: 'surv_map_works', title: 'Survival: Path Map, machine works', artist: OST_ARTIST, length: 119 },
  surv_map_shrine: { ost: 'surv_map_shrine', title: 'Survival: Path Map, shrine district', artist: OST_ARTIST, length: 120 },
  surv_map_rim: { ost: 'surv_map_rim', title: 'Survival: Path Map, Rim station', artist: OST_ARTIST, length: 119 },
  surv_boon: { ost: 'surv_boon', title: 'Survival: Boon', artist: OST_ARTIST, length: 119 },
  surv_shop: { ost: 'surv_shop', title: 'Survival: Shop', artist: OST_ARTIST, length: 120 },
  surv_forge: { ost: 'surv_forge', title: 'Survival: Forge', artist: OST_ARTIST, length: 163 },
  surv_rest: { ost: 'surv_rest', title: 'Survival: Rest', artist: OST_ARTIST, length: 200 },
};
/** The ordinary fight's songs (spec: Music, The fight's song): one is picked for each fight. */
export const FIGHT_POOL: readonly OstId[] = ['gunline', 'brass_on_the_floor', 'danger_close', 'flank_left', 'held_breath', 'hold_the_line', 'line_of_four', 'mag_check', 'suppressing_fire'];
/** The Proving Ground's music while the squad is gearing up (spec: Music, The Proving Ground). */
export const GEARING_UP: OstId = 'gearing_up';
/** Survival's music by situation (data/survival.json `music`, rules 1.54): the camp, the path map by setting (else
 * `default`), a place by its node's kind, the boon pick. One lookup, runMusic. */
export const RUN_MUSIC: { camp: OstId; map: Record<string, OstId>; place: Record<string, OstId>; boon: OstId } = (survivalJ as any).music;
/**
 * The track a Survival run plays now (rules 1.54), or null when nothing here is the run's own (a fight, which keeps the
 * fight music, or the summary, which keeps what plays today). The camp plays camp; the boon pick plays boon; a place
 * the party stands in plays its node kind's track, and a place with none (and the map, a reward, the next tile) plays
 * the setting's map track, else the default.
 */
export function runMusic(g: Pick<GameState, 'run'>): { id: OstId; why: string } | null {
  const r = g.run; if (!r || r.state === 'over' || r.state === 'fight') return null;
  if (r.state === 'loadout') return { id: RUN_MUSIC.camp, why: 'Survival: the camp' };
  if (r.state === 'boon') return { id: RUN_MUSIC.boon, why: 'Survival: the boon pick' };
  // A place's screen is open: the shop's (state 'shop'; once left, its visit stays on the map), or a safe node's visit on the map.
  const at = runNode(r, r.at), open = r.state === 'shop' || (r.state === 'map' && r.visit?.node === r.at && r.visit.kind !== 'shop');
  const kind = open ? at?.kind : undefined;
  const own = kind ? RUN_MUSIC.place[kind] : undefined;
  if (own) return { id: own, why: 'Survival: ' + kind };
  const setting = runSetting(r);
  return { id: RUN_MUSIC.map[setting] || RUN_MUSIC.map.default, why: 'Survival: the path map' };
}
/** A track's identity, for "has the song changed?": the OST id or the YouTube id. */
export const trackKey = (t: Track | null | undefined) => (t ? (t.ost ? 'ost:' + t.ost : 'yt:' + (t.yt || '')) : '');

/**
 * Which of the game's fight tracks fits this fight (spec: Music): Last Rounds while at least half the party is Downed
 * (or dead), Heaven Falls once the party has seen an elite or a boss in it (or in a Hard or Boss fight), else the
 * fight's own song (cb.song, picked from the pool when the fight began: noteFightSong; Gunline for a fight without one).
 * The party is every fighter on the players' side. What the party has seen is cb.sighted (shared sight, kept by the
 * engine as hostiles come into view), so every player in the room gets the same track and label, and an elite or boss
 * still in the fog of war changes nothing: neither the track nor the label gives it away. Heaven Falls holds for the
 * whole fight once one has been seen; Last Rounds hands back as soon as enough of the party is up again.
 */
export function fightTheme(cb: Pick<Combat, 'units' | 'difficulty'> & Partial<Pick<Combat, 'sighted' | 'map' | 'over' | 'song'>>): { id: OstId; why: string } {
  const party = cb.units.filter((u) => u.side === 'pc'), down = party.filter((u) => u.downed || u.dead).length;
  if (party.length && down * 2 >= party.length) return { id: 'last_rounds', why: down === party.length ? 'Last rounds: the party is down' : 'Last rounds: half the party is down' };
  // Old saves have no sighted list yet: what the party sees right now.
  const seen = new Set(cb.sighted ?? (cb.map ? [...visibility(cb as Combat, 'pc').seen] : []));
  const foes = cb.units.filter((u) => u.side === 'foe' && seen.has(u.id));
  if (foes.some((u) => u.tier === 'boss')) return { id: 'heaven_falls', why: 'Fight: a boss' };
  if (foes.some((u) => u.tier === 'elite')) return { id: 'heaven_falls', why: 'Fight: an elite' };
  if (cb.difficulty === 'boss' || cb.difficulty === 'hard') return { id: 'heaven_falls', why: 'Fight: a hard one' };
  return { id: cb.song && FIGHT_POOL.includes(cb.song) ? cb.song : 'gunline', why: 'Fight' };
}
/**
 * The fight's song (spec: Music, The fight's song), called by apply() after every action: a fight without one gets one
 * from the pool, once, and keeps it (it is in the state, so every player hears the same one, and a re-render, a
 * reconnect or Heaven Falls / Last Rounds handing back never changes it). Never the last ordinary fight's song. The
 * pick hashes the dice's state and the count of picks without rolling them, so it changes no roll. `carried`: the
 * fight was already under way without a song (a save from before the pool): it keeps Gunline, which it was playing.
 */
export function noteFightSong(g: GameState, carried = false) {
  const cb = g.combat;
  if (!cb || (cb.song && FIGHT_POOL.includes(cb.song))) return;
  const m = musicOf(g);
  if (carried) cb.song = 'gunline';
  else {
    const pool = FIGHT_POOL.filter((id) => id !== m.lastSong), n = m.picks = (m.picks || 0) + 1;
    cb.song = pool[(seedFrom(g.rng.state + ':song:' + n) >>> 0) % pool.length];
  }
  // A fight that begins on Heaven Falls is not an ordinary fight: its song may never be heard, so it isn't "the last".
  if (fightTheme(cb).id !== 'heaven_falls') m.lastSong = cb.song;
}
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
  /** The last ordinary fight's song (the next fight picks another), and how many picks were made (spec: The fight's song). */
  lastSong?: OstId; picks?: number;
  /** A player's view only (viewFor): musicFor worked out on the whole game, which the view no longer holds all of. */
  view?: ReturnType<typeof musicFor>;
}

export const PIN_AREAS = 2;
export const SONG_AP: number = costOf('song');
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

/**
 * What the room should hear now: the spotlight or pin, else the fight's music, else the area's. Fight music: Last
 * Rounds when half the party is down (over everything but a spotlight or pin), else the campaign's own theme for that
 * named encounter, else the game's fight track (fightTheme). Campaigns' generic combat tracks are no longer played.
 * A fight with no enemies in it has no fight music. A Proving Ground gearing up (no fight on) plays Gearing Up in
 * place of the area's music.
 */
export function musicFor(g: GameState): { key: string; layer: 'spotlight' | 'pin' | 'encounter' | 'combat' | 'ambient'; track: Track | null; reason: string; charId?: string; seq?: number } {
  const pre = g.music?.view; if (pre) return pre; // a player's view: picked on the whole fight (viewFor)
  const m = g.music?.now;
  if (m) return { key: 's' + m.seq, layer: m.layer, track: m.track, reason: m.reason, charId: m.charId, seq: m.seq };
  const camp = g.campaign, zone = camp?.zones.find((z) => z.id === (g.combat && g.phase === 'combat' ? g.combat.map.id : g.story.zone));
  if (g.phase === 'combat' && g.combat && g.combat.units.some((u) => u.side === 'foe')) {
    const th = fightTheme(g.combat);
    if (th.id !== 'last_rounds') {
      const enc = camp?.encounters?.find((e) => e.music && e.name.toLowerCase() === g.combat!.name.toLowerCase());
      if (enc?.music) return { key: 'e:' + enc.name + ':' + trackKey(enc.music), layer: 'encounter', track: enc.music, reason: 'Fight: ' + enc.name };
    }
    return { key: 'c:' + th.id, layer: 'combat', track: OST[th.id], reason: th.why };
  }
  const run = runMusic(g);
  if (run) return { key: 'sv:' + run.id, layer: 'ambient', track: OST[run.id], reason: run.why };
  if (g.sandbox) return { key: 'pg:' + GEARING_UP, layer: 'ambient', track: OST[GEARING_UP], reason: 'Proving Ground: gearing up' };
  const t = zone?.music?.ambient || camp?.music?.ambient || null;
  return { key: 'a:' + trackKey(t), layer: 'ambient', track: t, reason: zone ? 'Area: ' + zone.name : 'Area' };
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
