// UI sounds (spec: docs/design/title-screen.md §7). Small files played through Web Audio so they start instantly and
// overlap cleanly; until a file is chosen (or if it fails to load) each event has a tiny synthesised stand-in.
// Nothing plays before the first key press or click (browsers forbid it anyway). Ducks under the Narrator's voice.
import { voiceState } from './voice';

export type Sfx = 'hover' | 'click' | 'start' | 'back' | 'slide' | 'slide_back' | 'error' | 'toggle' | 'tab' | 'wick_hello' | 'wick_steps'
  | 'shot' | 'hit' | 'miss' | 'reload' | 'melee' | 'down'
  // The creation Lock in: the AHOC seal stamped onto the record (screens/create.js).
  | 'stamp'
  // Magic (docs/design/magic-presentation.md): Sigils are synthetic and snap; Outbursts are organic and swell.
  | 'draw' | 'evoke' | 'overload' | 'outburst' | 'release' | 'short'
  // Combat feel (game/fx/FxLayer.tsx plays these from the engine's presentation events, in sync with the visuals).
  | CombatSfx;
/** Weapons, impacts, reloads, bodies, doors, spells: public/sfx/cb (credits in game/sfxCredits.ts). */
export type CombatSfx = 'gun_pistol' | 'gun_revolver' | 'gun_magnum' | 'gun_smg' | 'gun_rifle' | 'gun_sniper' | 'gun_lever' | 'gun_shotgun' | 'gun_heavy'
  | 'burst_smg' | 'burst_rifle' | 'auto_smg' | 'auto_rifle' | 'auto_heavy'
  | 'reload_pistol' | 'reload_mag' | 'reload_rifle' | 'reload_shells' | 'rack' | 'jam_clear' | 'round_in' | 'mag_in' | 'dry_click'
  | 'hit_flesh' | 'hit_heavy' | 'hit_metal' | 'hit_wood' | 'body_fall' | 'step' | 'swish' | 'whiz' | 'slice' | 'chop'
  | 'explosion' | 'explosion_boom' | 'door_open' | 'door_close' | 'stim'
  | 'sigil_draw' | 'sigil_evoke' | 'sigil_core' | 'sigil_overload' | 'soul_hold' | 'heartbeat' | 'soul_release' | 'crystal' | 'vent'
  | ElementSfx | WordSfx | SoulSfx | FeelSfx | FaithSfx;
/** Faith 2.2 (rules 1.6.3): the Miracle cut-in's heavenly sting (game/cutIn.ts). */
export type FaithSfx = 'miracle_sting';
/** The eight feeling families (data/feelings.json `families`). */
export type FeelingFamily = 'warm' | 'cold' | 'sharp' | 'low' | 'bright' | 'hollow' | 'wild' | 'holy';
export const FEELING_FAMILIES: FeelingFamily[] = ['warm', 'cold', 'sharp', 'low', 'bright', 'hollow', 'wild', 'holy'];
/** Outburst 4.0 (rules 1.8): feelings. A family's layer over the pump heartbeat (short; pitched up per stage), a quieter
 *  residue sting (a residue tile laid or ticking), the unlock ("You have felt X"), Revert pump's soft rewind, and the
 *  multiplier counter's shake tick. */
export type FeelSfx = `feel_pump_${FeelingFamily}` | `feel_residue_${FeelingFamily}` | 'feel_unlock' | 'feel_revert' | 'feel_tick';
/** A feeling family's pump layer and residue sting (an unknown family sounds warm). */
export function FEELING_FAMILY_SFX(family: string): { pump: Sfx; residue: Sfx } {
  const f = (FEELING_FAMILIES as string[]).includes(family) ? family as FeelingFamily : 'warm';
  return { pump: `feel_pump_${f}`, residue: `feel_residue_${f}` };
}
/** Outburst 2.0 (rules 1.5): the heart. A breath in (Begin), a thump per Pump, a gasp (Heart Overwatch), a long breath
 *  out (calming, Steady), a violet sigh (Let go), a crack (Strain burns, a Mana Short), the choir under a big release; and
 *  the held elemental aura's sound beds (the Sigil field loops played lower and softer, a stone rumble of its own). */
export type SoulSfx = 'soul_breath_in' | 'soul_breath_out' | 'soul_sigh' | 'soul_gasp' | 'soul_thump' | 'soul_choir' | 'soul_crack'
  | 'soul_fire_loop' | 'soul_storm_loop' | 'soul_frost_loop' | 'soul_stone_loop' | 'soul_gale_loop' | 'soul_acid_loop';
/** Element impacts and field loops (game/fx/elements.ts; shared by Sigils now and Soul Outbursts later). */
export type ElementSfx = 'el_fire' | 'el_freeze' | 'el_shatter' | 'el_shock' | 'el_zap' | 'el_stone' | 'el_stone_rise' | 'el_stone_crumble' | 'el_gale' | 'el_spark' | 'el_acid'
  | 'el_fire_loop' | 'el_freeze_loop' | 'el_shock_loop' | 'el_gale_loop' | 'el_acid_loop';
/** Sigil word cues (rules 1.4): STEP, MASK, LEECH, NULL, the boons, traps, turrets, a fizzle. */
export type WordSfx = 'sg_blink' | 'sg_mask' | 'sg_leech' | 'sg_null' | 'sg_quicken' | 'sg_sharpen' | 'sg_mend' | 'sg_ward' | 'sg_command' | 'sg_trap_set' | 'sg_trap_sprung'
  | 'sg_light' | 'sg_turret' | 'sg_turret_break' | 'sg_fizzle' | 'sg_cleanse';
/** The looping sounds (a field's bed under the fight); they play through setSfxLoops, never through sfx(). */
export const LOOP_SFX: Sfx[] = ['el_fire_loop', 'el_freeze_loop', 'el_shock_loop', 'el_gale_loop', 'el_acid_loop',
  'soul_fire_loop', 'soul_storm_loop', 'soul_frost_loop', 'soul_stone_loop', 'soul_gale_loop', 'soul_acid_loop'];
/** How a loop is played: the Soul aura beds reuse the Sigil field files, slowed and darkened (rate, low-pass in Hz). */
export const LOOP_OPTS: Partial<Record<Sfx, { rate?: number; lowpass?: number }>> = {
  soul_fire_loop: { rate: 0.8, lowpass: 1600 }, soul_storm_loop: { rate: 0.75, lowpass: 2200 }, soul_frost_loop: { rate: 0.8, lowpass: 2600 },
  soul_stone_loop: { rate: 1, lowpass: 900 }, soul_gale_loop: { rate: 0.82, lowpass: 1400 }, soul_acid_loop: { rate: 0.75, lowpass: 1500 },
};
const CB = (...n: string[]) => n.map((x) => '/sfx/cb/' + x + '.ogg');

/** The chosen files (public/sfx/…, CC0; credits in game/sfxCredits.ts). A list plays one at random. Missing means the
 *  synthesised stand-in (Wick's footsteps are synthesised on purpose: tiny metal taps). */
export const SFX_FILES: Partial<Record<Sfx, string | string[]>> = {
  hover: '/sfx/select_001.ogg', click: '/sfx/click_001.ogg', start: '/sfx/confirmation_002.ogg',
  back: '/sfx/back_001.ogg', slide: '/sfx/maximize_004.ogg', slide_back: '/sfx/minimize_004.ogg', error: '/sfx/error_004.ogg',
  toggle: ['/sfx/toggle_001.ogg', '/sfx/toggle_002.ogg'], tab: '/sfx/pluck_001.ogg', wick_hello: '/sfx/wick_hello.ogg', stamp: '/sfx/stamp.ogg',
  gun_pistol: CB('shot_pistol_1', 'shot_pistol_2', 'shot_pistol_3'), gun_revolver: CB('shot_revolver_1', 'shot_revolver_2'), gun_magnum: CB('shot_magnum'),
  gun_smg: CB('shot_smg'), gun_rifle: CB('shot_rifle_1', 'shot_rifle_2'), gun_sniper: CB('shot_sniper'), gun_lever: CB('shot_lever'),
  gun_shotgun: CB('shot_shotgun_1', 'shot_shotgun_2'), gun_heavy: CB('shot_heavy'),
  burst_smg: CB('burst_smg'), burst_rifle: CB('burst_rifle'), auto_smg: CB('auto_smg'), auto_rifle: CB('auto_rifle'), auto_heavy: CB('auto_heavy'),
  reload_pistol: CB('reload_pistol'), reload_mag: CB('reload_mag', 'reload_mag_2'), reload_rifle: CB('reload_rifle'), reload_shells: CB('reload_shells'),
  rack: CB('rack'), jam_clear: CB('jam_clear'), round_in: CB('round_in'), mag_in: CB('mag_in'), dry_click: CB('dry_click'),
  hit_flesh: CB('hit_flesh_1', 'hit_flesh_2'), hit_heavy: CB('hit_heavy'), hit_metal: CB('hit_metal_1', 'hit_metal_2'), hit_wood: CB('hit_wood'), body_fall: CB('body_fall'),
  step: CB('step_1', 'step_2', 'step_3'), swish: CB('swish_1', 'swish_2'), whiz: CB('whiz'), slice: CB('slice'), chop: CB('chop'),
  explosion: CB('explosion_1', 'explosion_2'), explosion_boom: CB('explosion_boom'), door_open: CB('door_open'), door_close: CB('door_close'), stim: CB('stim_hiss'),
  sigil_draw: CB('sigil_draw'), sigil_evoke: CB('sigil_evoke'), sigil_core: CB('sigil_core'), sigil_overload: CB('sigil_overload'),
  soul_hold: CB('soul_hold'), heartbeat: CB('heartbeat'), soul_release: CB('soul_release'), crystal: CB('crystal'), vent: CB('vent'),
  el_fire: CB('el_fire_1', 'el_fire_2'), el_freeze: CB('el_freeze_1', 'el_freeze_2'), el_shatter: CB('el_shatter_1', 'el_shatter_2'), el_shock: CB('el_shock_1', 'el_shock_2'), el_zap: CB('el_zap'),
  el_stone: CB('el_stone_1', 'el_stone_2'), el_stone_rise: CB('el_stone_rise'), el_stone_crumble: CB('el_stone_crumble'), el_gale: CB('el_gale_1'), el_spark: CB('el_spark_1', 'el_spark_2'), el_acid: CB('el_acid_1', 'el_acid_2'),
  el_fire_loop: CB('el_fire_loop'), el_freeze_loop: CB('el_freeze_loop'), el_shock_loop: CB('el_shock_loop'), el_gale_loop: CB('el_gale_loop'), el_acid_loop: CB('el_acid_loop'),
  sg_blink: CB('sg_blink'), sg_mask: CB('sg_mask'), sg_leech: CB('sg_leech'), sg_null: CB('sg_null'), sg_quicken: CB('sg_quicken'), sg_sharpen: CB('sg_sharpen'), sg_mend: CB('sg_mend'),
  sg_ward: CB('sg_ward'), sg_command: CB('sg_command'), sg_trap_set: CB('sg_trap_set'), sg_trap_sprung: CB('sg_trap_sprung'), sg_light: CB('sg_light'), sg_turret: CB('sg_turret'),
  sg_turret_break: CB('sg_turret_break'), sg_fizzle: CB('sg_fizzle'), sg_cleanse: CB('sg_cleanse'),
  soul_breath_in: CB('soul_breath_in'), soul_breath_out: CB('soul_breath_out'), soul_sigh: CB('soul_sigh'), soul_gasp: CB('soul_gasp'),
  soul_thump: CB('soul_thump'), soul_choir: CB('soul_choir'), soul_crack: CB('soul_crack'),
  soul_fire_loop: CB('el_fire_loop'), soul_storm_loop: CB('el_shock_loop'), soul_frost_loop: CB('el_freeze_loop'), soul_stone_loop: CB('soul_stone_loop'),
  soul_gale_loop: CB('el_gale_loop'), soul_acid_loop: CB('el_acid_loop'),
  // Outburst 4.0 (rules 1.8): feelings (public/sfx/cb/feel_*.ogg; trimmed, mono, levelled).
  feel_pump_warm: CB('feel_pump_warm'), feel_pump_cold: CB('feel_pump_cold'), feel_pump_sharp: CB('feel_pump_sharp'), feel_pump_low: CB('feel_pump_low'),
  feel_pump_bright: CB('feel_pump_bright'), feel_pump_hollow: CB('feel_pump_hollow'), feel_pump_wild: CB('feel_pump_wild'), feel_pump_holy: CB('feel_pump_holy'),
  feel_residue_warm: CB('feel_residue_warm'), feel_residue_cold: CB('feel_residue_cold'), feel_residue_sharp: CB('feel_residue_sharp'), feel_residue_low: CB('feel_residue_low'),
  feel_residue_bright: CB('feel_residue_bright'), feel_residue_hollow: CB('feel_residue_hollow'), feel_residue_wild: CB('feel_residue_wild'), feel_residue_holy: CB('feel_residue_holy'),
  feel_unlock: CB('feel_unlock'), feel_revert: CB('feel_revert'), feel_tick: CB('feel_tick'),
  // Faith 2.2: the Miracle cut-in's sting (leohpaz's revive, CC BY 4.0: trimmed to its first rising run, mono, levelled).
  miracle_sting: CB('miracle_sting'),
};
/** Combat sounds load when a game is on screen (preloadCombatSfx), not on the title screen's first key press. */
const isCombatFile = (f: string) => f.startsWith('/sfx/cb/');
/** Combat names fall back to the old synthesised stand-ins until their file has loaded. */
const STAND_IN: Partial<Record<CombatSfx, Sfx>> = {
  reload_pistol: 'reload', reload_mag: 'reload', reload_rifle: 'reload', reload_shells: 'reload', rack: 'reload', jam_clear: 'reload', round_in: 'reload', mag_in: 'reload',
  hit_flesh: 'hit', hit_heavy: 'hit', hit_metal: 'hit', hit_wood: 'hit', body_fall: 'down', swish: 'melee', slice: 'melee', chop: 'melee', whiz: 'miss',
  explosion: 'shot', explosion_boom: 'hit', sigil_draw: 'draw', sigil_evoke: 'evoke', sigil_overload: 'overload', soul_hold: 'outburst', soul_release: 'release',
  el_fire: 'hit', el_freeze: 'hit', el_shatter: 'miss', el_shock: 'evoke', el_zap: 'draw', el_stone: 'hit', el_stone_rise: 'hit', el_stone_crumble: 'down', el_gale: 'miss', el_spark: 'draw', el_acid: 'hit',
  sg_blink: 'evoke', sg_mask: 'release', sg_leech: 'outburst', sg_null: 'overload', sg_quicken: 'start', sg_sharpen: 'melee', sg_mend: 'start', sg_ward: 'draw', sg_command: 'evoke',
  sg_trap_set: 'draw', sg_trap_sprung: 'evoke', sg_light: 'start', sg_turret: 'draw', sg_turret_break: 'hit', sg_fizzle: 'error', sg_cleanse: 'draw',
  soul_breath_in: 'outburst', soul_breath_out: 'release', soul_sigh: 'release', soul_gasp: 'miss', soul_thump: 'outburst', soul_choir: 'outburst', soul_crack: 'short',
  miracle_sting: 'start',
};
/** The mix: how loud each event sits under the master UI volume. */
const MIX: Partial<Record<Sfx, number>> = {
  gun_pistol: 0.5, gun_revolver: 0.55, gun_magnum: 0.6, gun_smg: 0.45, gun_rifle: 0.55, gun_sniper: 0.6, gun_lever: 0.55, gun_shotgun: 0.6, gun_heavy: 0.65,
  burst_smg: 0.5, burst_rifle: 0.55, auto_smg: 0.5, auto_rifle: 0.55, auto_heavy: 0.6,
  reload_pistol: 0.45, reload_mag: 0.45, reload_rifle: 0.45, reload_shells: 0.45, rack: 0.45, jam_clear: 0.5, round_in: 0.35, mag_in: 0.4, dry_click: 0.35,
  hit_flesh: 0.45, hit_heavy: 0.5, hit_metal: 0.35, hit_wood: 0.35, body_fall: 0.5, step: 0.2, swish: 0.4, whiz: 0.25, slice: 0.4, chop: 0.45,
  explosion: 0.65, explosion_boom: 0.6, door_open: 0.4, door_close: 0.4, stim: 0.35,
  el_fire: 0.45, el_freeze: 0.4, el_shatter: 0.35, el_shock: 0.4, el_zap: 0.35, el_stone: 0.5, el_stone_rise: 0.45, el_stone_crumble: 0.4, el_gale: 0.35, el_spark: 0.3, el_acid: 0.4,
  el_fire_loop: 0.16, el_freeze_loop: 0.08, el_shock_loop: 0.07, el_gale_loop: 0.12, el_acid_loop: 0.12,
  sg_blink: 0.4, sg_mask: 0.35, sg_leech: 0.4, sg_null: 0.45, sg_quicken: 0.35, sg_sharpen: 0.35, sg_mend: 0.35, sg_ward: 0.35, sg_command: 0.35,
  sg_trap_set: 0.2, sg_trap_sprung: 0.45, sg_light: 0.3, sg_turret: 0.35, sg_turret_break: 0.4, sg_fizzle: 0.35, sg_cleanse: 0.35,
  soul_breath_in: 0.4, soul_breath_out: 0.32, soul_sigh: 0.3, soul_gasp: 0.42, soul_thump: 0.55, soul_choir: 0.32, soul_crack: 0.5,
  soul_fire_loop: 0.12, soul_storm_loop: 0.06, soul_frost_loop: 0.07, soul_stone_loop: 0.14, soul_gale_loop: 0.1, soul_acid_loop: 0.1,
  // Feelings: the pump layer sits under the thump (0.55); residue stings are quieter still.
  feel_pump_warm: 0.4, feel_pump_cold: 0.4, feel_pump_sharp: 0.38, feel_pump_low: 0.45, feel_pump_bright: 0.45, feel_pump_hollow: 0.45, feel_pump_wild: 0.4, feel_pump_holy: 0.4,
  feel_residue_warm: 0.28, feel_residue_cold: 0.28, feel_residue_sharp: 0.3, feel_residue_low: 0.3, feel_residue_bright: 0.28, feel_residue_hollow: 0.3, feel_residue_wild: 0.3, feel_residue_holy: 0.3,
  feel_unlock: 0.5, feel_revert: 0.35, feel_tick: 0.3, miracle_sting: 0.55,
  sigil_draw: 0.3, sigil_evoke: 0.4, sigil_core: 0.35, sigil_overload: 0.45, soul_hold: 0.35, heartbeat: 0.55, soul_release: 0.5, crystal: 0.35, vent: 0.3, draw: 0.35, evoke: 0.45, overload: 0.45, outburst: 0.45, release: 0.5, short: 0.55, shot: 0.5, hit: 0.45, miss: 0.3, reload: 0.4, melee: 0.45, down: 0.5, hover: 0.22, click: 0.45, start: 0.6, back: 0.4, slide: 0.35, slide_back: 0.35, error: 0.45, toggle: 0.35, tab: 0.35, wick_hello: 0.5, wick_steps: 0.5, stamp: 0.75 };
const files = (s: Sfx) => { const f = SFX_FILES[s]; return f ? (Array.isArray(f) ? f : [f]) : []; };

// ---------- settings (shared with the title screen's Settings) ----------
const LS = 'phc.ui';
export interface UiPrefs { sfx: number; music: number; mute: boolean; reduceMotion: boolean }
let prefs: UiPrefs = (() => { try { return { sfx: 60, music: 70, mute: false, reduceMotion: false, ...JSON.parse(localStorage.getItem(LS) || '{}') }; } catch { return { sfx: 60, music: 70, mute: false, reduceMotion: false }; } })();
const subs = new Set<() => void>();
export const uiPrefs = () => prefs;
export const onUiPrefs = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export function setUiPrefs(p: Partial<UiPrefs>) { prefs = { ...prefs, ...p }; try { localStorage.setItem(LS, JSON.stringify(prefs)); } catch { /* */ } for (const f of subs) f(); }
/** Reduce motion: our toggle, or the system setting. */
export const reducedMotion = () => prefs.reduceMotion || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);

// ---------- playback ----------
let ctx: AudioContext | null = null, out: GainNode | null = null, unlocked = false, noAudio = false;
const buffers = new Map<string, AudioBuffer | null>();
/** The audio context, or null where the browser has none (then the game is silent, never broken). */
function audio(): AudioContext | null {
  if (!ctx && !noAudio) {
    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) { noAudio = true; return null; }
      ctx = new AC() as AudioContext; out = ctx.createGain();
      // A limiter, so overlapping sounds at full volume never clip.
      const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.08;
      out.connect(lim); lim.connect(ctx.destination);
    } catch { noAudio = true; ctx = null; return null; }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
/** Call from a user gesture: sound is allowed from then on. */
export function unlockSfx() { unlocked = true; if (!audio()) return; for (const s of Object.keys(SFX_FILES) as Sfx[]) for (const f of files(s)) if (!isCombatFile(f) || combatWanted) load(f); }
let combatWanted = false;
/** Fetch the combat sounds (once a game is on screen); before the first gesture they load as sound is unlocked. */
export function preloadCombatSfx() { combatWanted = true; if (!unlocked || !audio()) return; for (const s of Object.keys(SFX_FILES) as Sfx[]) for (const f of files(s)) if (isCombatFile(f)) load(f); }
// Touch only grants permission on the finger lifting, so listen to every kind of gesture and resume a suspended context.
if (typeof window !== 'undefined') for (const ev of ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click']) window.addEventListener(ev, () => { if (!unlocked) unlockSfx(); else if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); }, { capture: true });
async function load(url: string) {
  if (buffers.has(url)) return buffers.get(url) || null;
  const ac = audio(); if (!ac) return null;
  buffers.set(url, null);
  try { const b = await ac.decodeAudioData(await (await fetch(url)).arrayBuffer()); buffers.set(url, b); return b; } catch { return null; }
}
const level = () => (prefs.mute ? 0 : prefs.sfx / 100) * (voiceState().speaking ? 0.4 : 1);
let lastHover = 0;

/** Options for one sound: rate (pitch and speed, 1 = as recorded), gain (× its mix), delay in ms (scheduled on the
 *  audio clock), pan (−1 left … 1 right, from where it happens on screen). */
export interface SfxOpts { rate?: number; gain?: number; delay?: number; pan?: number; lowpass?: number }
export function sfx(name: Sfx, o: SfxOpts = {}) {
  if (!unlocked || level() <= 0 || LOOP_SFX.includes(name)) return;
  if (name === 'hover') { const t = performance.now(); if (t - lastHover < 60) return; lastHover = t; }
  try {
    const ac = audio(); if (!ac || !out) return;
    const g = ac.createGain(); g.gain.value = Math.min(1, level() * (MIX[name] ?? 0.4) * 2 * (o.gain ?? 1));
    let dest: AudioNode = out;
    if (o.pan && (ac as any).createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, o.pan)); p.connect(out); dest = p; }
    g.connect(dest);
    // A low-pass (the Soul family's softer, rounder take on a shared sound) sits between the source and its gain.
    let into: AudioNode = g;
    if (o.lowpass) { const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.lowpass; lp.Q.value = 0.5; lp.connect(g); into = lp; }
    const list = files(name), file = list[Math.floor(Math.random() * list.length)], buf = file ? buffers.get(file) : null;
    const at = ac.currentTime + Math.max(0, (o.delay || 0) / 1000);
    if (buf) { const s = ac.createBufferSource(); s.buffer = buf; if (o.rate) s.playbackRate.value = o.rate; s.connect(into); s.start(at); return; }
    if (file && !buffers.has(file)) load(file);
    const stand = (STAND_IN as Record<string, Sfx>)[name] || (name.startsWith('gun_') || name.startsWith('burst_') || name.startsWith('auto_') ? 'shot' : name);
    if (o.delay) setTimeout(() => synth(ac, g, stand), o.delay); else synth(ac, g, stand);
  } catch { /* sound must never break the game */ }
}

/** Everything drops near silent for a moment and comes back (a Mana Short: the heart stops, the room goes quiet).
 *  Rides the master bus, so loops and sounds already playing duck too. */
export function duckSfx(to = 0.08, ms = 900, back = 500) {
  const ac = unlocked ? audio() : null; if (!ac || !out) return;
  try {
    const t = ac.currentTime, gn = out.gain;
    gn.cancelScheduledValues(t); gn.setValueAtTime(gn.value, t); gn.linearRampToValueAtTime(Math.max(0.0001, to), t + 0.12);
    gn.setValueAtTime(Math.max(0.0001, to), t + ms / 1000); gn.linearRampToValueAtTime(1, t + (ms + back) / 1000);
  } catch { /* */ }
}

// ---------- loops (a field's bed: fire crackle, storm static, wind, bubbling) ----------
interface Loop { src: AudioBufferSourceNode; gain: GainNode; want: number }
const loops = new Map<Sfx, Loop>();
let loopWant: Partial<Record<Sfx, number>> = {};
/** Which loops should be playing and how loud (0 … 1 × their mix): the effects layer calls this from the game state
 *  (the fields on the map), so a loop never outlives what makes it. Missing names fade out. Silent until sound is
 *  allowed and the file has loaded; follows the volume, mute and the Narrator's ducking on each call. */
export function setSfxLoops(want: Partial<Record<Sfx, number>>) {
  loopWant = want;
  const ac = unlocked ? audio() : null;
  for (const [name, l] of [...loops]) if (!(want[name]! > 0) || !ac) { fadeLoop(l, 0, true); loops.delete(name); }
  if (!ac || !out) return;
  for (const [name, w] of Object.entries(want) as [Sfx, number][]) {
    if (!(w > 0)) continue;
    const target = Math.min(1, level() * (MIX[name] ?? 0.1) * 2 * w), had = loops.get(name);
    if (had) { if (Math.abs(had.want - target) > 0.005) { had.want = target; fadeLoop(had, target); } continue; }
    const file = files(name)[0], buf = file ? buffers.get(file) : null;
    if (!buf) { if (file && !buffers.has(file)) load(file).then(() => { if ((loopWant[name] || 0) > 0 && !loops.has(name)) setSfxLoops(loopWant); }); continue; }
    try {
      const src = ac.createBufferSource(), g = ac.createGain(), lo = LOOP_OPTS[name]; src.buffer = buf; src.loop = true; g.gain.value = 0.0001;
      if (lo?.rate) src.playbackRate.value = lo.rate;
      if (lo?.lowpass) { const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = lo.lowpass; lp.Q.value = 0.5; src.connect(lp); lp.connect(g); } else src.connect(g);
      g.connect(out); src.start(ac.currentTime, Math.random() * Math.max(0, buf.duration - 0.1));
      const l = { src, gain: g, want: target }; loops.set(name, l); fadeLoop(l, target);
    } catch { /* never break the game */ }
  }
}
/** The loops playing now and their target gains (for tests and the Proving Ground). */
export const sfxLoopsPlaying = () => Object.fromEntries([...loops].map(([k, l]) => [k, l.want]));
function fadeLoop(l: Loop, to: number, stop = false) {
  try {
    const ac = ctx!; const t = ac.currentTime;
    l.gain.gain.cancelScheduledValues(t); l.gain.gain.setValueAtTime(Math.max(0.0001, l.gain.gain.value), t); l.gain.gain.linearRampToValueAtTime(Math.max(0.0001, to), t + 0.6);
    if (stop) l.src.stop(t + 0.65);
  } catch { /* */ }
}
if (typeof window !== 'undefined') onUiPrefs(() => { if (loops.size || Object.keys(loopWant).length) setSfxLoops(loopWant); });

/** Stand-ins: a few oscillator blips, quiet and short. */
function synth(ac: AudioContext, dest: GainNode, name: Sfx) {
  const t = ac.currentTime;
  const tone = (f0: number, f1: number, dur: number, type: OscillatorType = 'sine', vol = 0.18, at = 0) => {
    const o = ac.createOscillator(), e = ac.createGain(); o.type = type;
    o.frequency.setValueAtTime(f0, t + at); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + at + dur);
    e.gain.setValueAtTime(0.0001, t + at); e.gain.exponentialRampToValueAtTime(vol, t + at + 0.006); e.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
    o.connect(e); e.connect(dest); o.start(t + at); o.stop(t + at + dur + 0.02);
  };
  const noise = (dur: number, f: number, vol = 0.12, at = 0) => {
    const n = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate), d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = ac.createBufferSource(), bp = ac.createBiquadFilter(), e = ac.createGain(); s.buffer = n; bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 0.8;
    e.gain.value = vol; s.connect(bp); bp.connect(e); e.connect(dest); s.start(t + at);
  };
  /** A soft swell: slow attack and release (Soul sounds never click in). */
  const swell = (f0: number, f1: number, dur: number, type: OscillatorType = 'sine', vol = 0.15, at = 0) => {
    const o = ac.createOscillator(), e = ac.createGain(); o.type = type;
    o.frequency.setValueAtTime(f0, t + at); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + at + dur);
    e.gain.setValueAtTime(0.0001, t + at); e.gain.linearRampToValueAtTime(vol, t + at + dur * 0.45); e.gain.linearRampToValueAtTime(0.0001, t + at + dur);
    o.connect(e); e.connect(dest); o.start(t + at); o.stop(t + at + dur + 0.02);
  };
  /** A heartbeat: lub-dub, two low thumps. */
  const beat = (at = 0, vol = 0.3) => { tone(70, 42, 0.13, 'sine', vol, at); tone(62, 38, 0.11, 'sine', vol * 0.7, at + 0.17); };
  // Feelings (until their file loads): a family's colour in one tone; the residue is the same, softer and longer.
  const fam = /^feel_(pump|residue)_(\w+)$/.exec(name);
  if (fam) {
    const r = fam[1] === 'residue', v = r ? 0.6 : 1, d = r ? 1.8 : 1;
    switch (fam[2]) {
      case 'warm': swell(262, 392, 0.3 * d, 'sine', 0.12 * v); break;
      case 'cold': tone(1900, 1880, 0.25 * d, 'sine', 0.06 * v); break;
      case 'sharp': tone(5600, 5300, 0.12 * d, 'triangle', 0.04 * v); break;
      case 'low': tone(150, 55, 0.3 * d, 'sine', 0.28 * v); break;
      case 'bright': tone(1240, 1480, 0.18 * d, 'sine', 0.07 * v); tone(2480, 2960, 0.12 * d, 'sine', 0.03 * v, 0.04); break;
      case 'hollow': tone(230, 220, 0.12 * d, 'triangle', 0.16 * v); break;
      case 'wild': noise(0.3 * d, 420, 0.16 * v); tone(90, 60, 0.25 * d, 'sawtooth', 0.05 * v); break;
      case 'holy': swell(312, 312, 0.5 * d, 'sine', 0.1 * v); swell(624, 624, 0.5 * d, 'sine', 0.04 * v); break;
    }
    return;
  }
  switch (name) {
    case 'feel_unlock': [392, 494, 587, 784].forEach((f, i) => swell(f, f, 0.6, 'sine', 0.07, i * 0.12)); break;
    case 'feel_revert': swell(600, 280, 0.35, 'sine', 0.12); break;
    case 'feel_tick': tone(800, 800, 0.02, 'square', 0.03); break;
    // Sigils: a tone per word that locks with a click.
    case 'draw': tone(660, 660, 0.09, 'triangle', 0.1); tone(990, 990, 0.05, 'square', 0.035, 0.03); tone(2400, 1800, 0.015, 'square', 0.06, 0.1); break;
    case 'evoke': [523, 659, 784].forEach((f, i) => tone(f, f, 0.07, 'square', 0.05, i * 0.055)); tone(1568, 392, 0.16, 'sawtooth', 0.07, 0.17); noise(0.08, 5200, 0.12, 0.17); break;
    case 'overload': for (let i = 0; i < 7; i++) tone(200 + Math.random() * 1800, 80 + Math.random() * 400, 0.03, 'square', 0.06, i * 0.028); noise(0.2, 900, 0.18, 0.05); break;
    // Soul: a held breath and a heartbeat; a release rushes out; a Mana Short drops to silence.
    case 'outburst': swell(196, 294, 0.7, 'sine', 0.12); swell(392, 588, 0.7, 'triangle', 0.04, 0.05); beat(0.08, 0.28); break;
    case 'release': swell(294, 784, 0.45, 'sine', 0.14); noise(0.5, 700, 0.1, 0.02); beat(0, 0.22); break;
    case 'short': tone(58, 28, 0.6, 'sine', 0.4); break;
    case 'hover': tone(1800, 1600, 0.03, 'sine', 0.05); break;
    case 'click': tone(900, 500, 0.06, 'triangle', 0.16); break;
    case 'start': tone(220, 440, 0.18, 'triangle', 0.18); tone(330, 660, 0.25, 'sine', 0.1, 0.06); break;
    case 'back': tone(500, 260, 0.08, 'triangle', 0.12); break;
    case 'slide': case 'slide_back': noise(0.28, 900, 0.07); break;
    case 'error': tone(180, 160, 0.07, 'square', 0.06); tone(180, 150, 0.07, 'square', 0.06, 0.1); break;
    case 'toggle': tone(1200, 1000, 0.04, 'square', 0.05); break;
    case 'tab': noise(0.05, 2400, 0.08); break;
    case 'wick_hello': tone(880, 1320, 0.07, 'square', 0.06); tone(1320, 1760, 0.09, 'square', 0.06, 0.09); tone(1760, 2200, 0.06, 'square', 0.05, 0.2); break;
    case 'stamp': tone(110, 38, 0.32, 'sine', 0.45); noise(0.09, 700, 0.3); noise(0.03, 2600, 0.12); break;
    case 'wick_steps': for (let i = 0; i < 4; i++) noise(0.025, 3200, 0.05, i * 0.07); break;
    // Combat stand-ins until real files are chosen (spec: more effects later).
    case 'shot': noise(0.09, 1800, 0.35); tone(140, 50, 0.12, 'sine', 0.3); break;
    case 'hit': tone(120, 60, 0.14, 'sine', 0.3); noise(0.05, 600, 0.15, 0.01); break;
    case 'miss': noise(0.18, 4200, 0.06, 0.02); tone(2400, 900, 0.16, 'sine', 0.03, 0.02); break;
    case 'reload': tone(1400, 1200, 0.03, 'square', 0.07); tone(900, 800, 0.04, 'square', 0.08, 0.18); noise(0.03, 2500, 0.08, 0.2); break;
    case 'melee': noise(0.12, 900, 0.2); tone(90, 50, 0.15, 'sine', 0.25, 0.03); break;
    case 'down': tone(300, 70, 0.5, 'sawtooth', 0.08); break;
  }
}

/** Every button in the game clicks (spec §7); a button can name its own sound with data-sfx, or "none". */
export function installButtonSounds() {
  if (typeof document === 'undefined' || (window as any).__phcSfx) return; (window as any).__phcSfx = true;
  document.addEventListener('click', (e) => {
    const b = (e.target as Element | null)?.closest?.('button, [role="tab"], input[type="checkbox"], select');
    if (!b || (b as HTMLButtonElement).disabled) return;
    const want = b.getAttribute('data-sfx');
    if (want === 'none') return;
    sfx((want as Sfx) || (b.getAttribute('role') === 'tab' ? 'tab' : b.matches('input[type="checkbox"]') ? 'toggle' : /^(‹|close|back|cancel|✕)/i.test((b.textContent || '').trim()) ? 'back' : 'click'));
  }, { capture: true });
}

/** Combat and area-map feedback: each new log line that describes a shot, a hit, a miss or a reload sounds. */
const RE_RELOAD = /\breload|\bloads? (a|the|loose|\d+)\b|speedloader|clears? the jam/;
const RE_SHOT = /\b(fires|shoots|opens fire|aimed shot|burst|full auto)\b/;
const RE_MELEE = /\b(strikes|smashes|punches|slashes|stabs|swings)\b/;
const RE_DOWN = /\b(is downed|goes down|drops to 0|is dead|dies)\b/;
// Magic lines (engine: packages/engine/src/magic.ts). Checked before the guns: a spell's line can mention damage too.
const RE_SHORT = /mana short:/;
const RE_OVERLOAD = /\boverload:/;
const RE_EVOKE = /\bevokes\b/;
const RE_DRAW = /\bdraws [a-z]+ at [a-z]+\d+|\bscuffs out\b|\bvents \d+ flux\b/;
const RE_HOLD = /\bbegins .+ and holds it\b|\blets .+ go\b|outburst grows to stage|\bsyphons \d+ mp\b|\bcrystallises a mana core\b/;
const RE_RELEASE = /\breleases\b|outburst bursts into the air/;
const RE_WALL = /\bcrosses the .+ wall\b/;
const RE_HURT = /\d+ damage|critical/;
const isMagicLine = (t: string) => RE_SHORT.test(t) || RE_OVERLOAD.test(t) || RE_EVOKE.test(t) || RE_DRAW.test(t) || RE_HOLD.test(t) || RE_RELEASE.test(t) || RE_WALL.test(t);
/** Whether a log line makes any sound (so a burst of quiet lines never crowds out the shot). */
export const hasSfx = (text: string) => { const t = text.toLowerCase(); return !/death save/.test(t) && (isMagicLine(t) || RE_RELOAD.test(t) || RE_SHOT.test(t) || RE_MELEE.test(t) || /\bmiss/.test(t) || RE_DOWN.test(t)); };
export function sfxForLine(text: string) {
  const t = text.toLowerCase();
  if (/death save/.test(t)) return; // every turn while Downed: no sound
  if (RE_SHORT.test(t)) return sfx('short');
  if (RE_OVERLOAD.test(t)) { if (RE_DRAW.test(t)) sfx('draw'); setTimeout(() => sfx('overload'), 90); return; }
  if (RE_EVOKE.test(t)) { sfx('evoke'); if (/\bmiss/.test(t) && !RE_HURT.test(t)) setTimeout(() => sfx('miss'), 220); else if (RE_HURT.test(t)) setTimeout(() => sfx('hit'), 220); return; }
  if (RE_DRAW.test(t)) return sfx('draw');
  if (RE_RELEASE.test(t)) { sfx('release'); if (RE_HURT.test(t)) setTimeout(() => sfx('hit'), 260); return; }
  if (RE_HOLD.test(t)) return sfx('outburst');
  if (RE_WALL.test(t)) return sfx('hit');
  if (RE_RELOAD.test(t)) return sfx('reload');
  if (RE_SHOT.test(t)) { sfx('shot'); if (/\bmiss|jams/.test(t)) setTimeout(() => sfx('miss'), 90); else if (/· (critical|hit)\b|\d+ damage|\d+ dmg|−\d+ hp/.test(t)) setTimeout(() => sfx('hit'), 90); return; }
  if (RE_MELEE.test(t)) return sfx('melee');
  if (/\bmiss/.test(t)) return sfx('miss');
  if (RE_DOWN.test(t)) return sfx('down');
}
