// The mana forecast (Leon, 9 Nov 2026): the ambient mana meter as a weather report, in its own movable panel on the
// combat screen (combatLayout.ts panel 'mana'), no longer a chip in the header. Today's sky (the band, the number, the
// gauge with the four bands), the trend (since this round began, and last round), the outlook (how far to the next band
// up or down, in the events that move the air), what this air does to magic, and what moves it. Every number comes from
// the rules data (rules.json mana.meter: bands and events; soul_modules.json stage_shift) and the engine (manaBand,
// riderShift); nothing here sets a rule. The trend is the client's memory of the meter at each round's start, per fight.
import { MANA_BANDS, MANA_START, RULES, SOUL_RULES, manaBand } from '@engine';

export const BAND_WORD: Record<string, string> = { thin: 'Thin', normal: 'Normal', rich: 'Rich', flooded: 'Flooded' };
/** The sky each band reads as (light only; the band is always named beside it). Mind cyan to Soul violet: thin air is
 *  cold and clear, flooded air is a violet storm. */
export const BAND_INK: Record<string, string> = { thin: '#8FB4CC', normal: '#C9D3E3', rich: '#AE9BFF', flooded: '#D6A8FF' };
/** The forecaster's line for each band. */
export const BAND_SKY: Record<string, string> = {
  thin: 'Clear and dry: little in the air. Outbursts cost more and heal less.',
  normal: 'Fair: the usual air. Magic at its plain price.',
  rich: 'Heavy and humid with bots: Outbursts come cheap and heal strong.',
  flooded: 'Storm: the air is saturated. Outbursts are cheapest and strike a stage harder, but every heart strains more.',
};
const METER = (): any => RULES?.mana?.meter || { min: 0, max: 40, events: [] };
const ev = (id: string): any => (METER().events || []).find((e: any) => e.event === id)?.delta;
const r2 = (n: number) => Math.round(n * 100) / 100;
const pct = (m: number) => Math.round((m - 1) * 100);
const signed = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n);

// ---------- the client's memory of the meter, per fight ----------
/** The meter at the start of each round seen, per fight (keyed by the fight's name and map). Kept in memory only. */
const HISTORY = new Map<string, Record<number, number>>();
const keyOf = (cb: any) => String(cb?.name || '') + '|' + String(cb?.map?.id || '') + '|' + String((cb?.order || []).length);
/** Note the meter now: the first reading of a round is that round's start. Returns the fight's readings. */
export function noteMana(cb: any): Record<number, number> {
  if (!cb) return {};
  const k = keyOf(cb), h = HISTORY.get(k) || {};
  const r = Number(cb.round) || 1, m = cb.mana ?? MANA_START;
  if (h[r] == null) h[r] = m;
  HISTORY.set(k, h); if (HISTORY.size > 20) HISTORY.delete(HISTORY.keys().next().value as string);
  return h;
}
export const _resetManaHistory = () => HISTORY.clear();

// ---------- the forecast ----------
export interface Segment { id: string; name: string; from: number; to: number; ink: string; style: string; now: boolean }
export interface Outlook { dir: 'up' | 'down'; band: string; at: number; need: number; text: string }
export interface ManaForecast {
  mana: number; max: number; band: string; bandName: string; ink: string; sky: string; icon: string;
  headline: string; gauge: Segment[]; marker: string;
  trend: { thisRound: number; lastRound: number | null; arrow: string; text: string };
  outlook: Outlook[]; outlookText: string;
  effects: string[]; movers: string[]; title: string;
}
/** What moves the air (rules.json mana.meter.events), in words. */
export function movers(): string[] {
  const d = (id: string) => ev(id);
  const out: string[] = [];
  if (d('person_dies') != null) out.push('A person dies: +' + d('person_dies') + (d('beast_dies') != null ? ' (a beast +' + d('beast_dies') + ', a robot +' + d('robot_destroyed') + ')' : ''));
  out.push('A Sigil mage vents Flux: + the Flux vented');
  if (d('enhanced_round_hit') != null) out.push('An enhanced round hits: +' + d('enhanced_round_hit'));
  out.push('An Outburst begins: − its MP ÷ 10 (rounded up); a heart let go: +1');
  if (d('syphon') != null) out.push('Syphon: ' + signed(d('syphon')));
  if (d('crystallise') != null) out.push('Crystallise: ' + signed(d('crystallise')));
  if (d('prayer') != null) out.push('A prayer answered: ' + signed(d('prayer')));
  return out;
}
/** What this band does to magic, from its data row. */
export function bandEffects(id: string): string[] {
  const b = MANA_BANDS.find((x) => x.id === id) || MANA_BANDS[1], out: string[] = [];
  out.push('Outbursts cost ' + (b.soul_cost_mult === 1 ? 'their plain MP' : '×' + r2(b.soul_cost_mult) + ' MP (' + signed(pct(b.soul_cost_mult)) + '%)'));
  out.push('Syphon draws ' + b.syphon_mp + ' MP');
  out.push('Magical healing ' + (b.healing_given_mult === 1 ? 'at full' : '×' + r2(b.healing_given_mult)));
  const shift = id === 'flooded' ? SOUL_RULES?.stage_shift?.flooded ?? 1 : id === 'thin' ? SOUL_RULES?.stage_shift?.thin ?? -1 : 0;
  if (shift) out.push('Outburst riders read a stage ' + (shift > 0 ? 'higher' : 'lower'));
  if (b.strain_per_cast_extra) out.push('+' + b.strain_per_cast_extra + ' Strain on every Begin and swell');
  return out;
}
/** How far to the next band either way, and in what events (a death +5, a Crystallise −10). */
export function outlookOf(mana: number): Outlook[] {
  const out: Outlook[] = [], cur = manaBand(mana), i = MANA_BANDS.findIndex((b) => b.id === cur.id);
  const death = Number(ev('person_dies')) || 5, cry = Math.abs(Number(ev('crystallise')) || 10);
  const up = MANA_BANDS[i + 1], down = MANA_BANDS[i - 1];
  if (up) { const need = up.min - mana, n = Math.ceil(need / death); out.push({ dir: 'up', band: up.id, at: up.min, need, text: BAND_WORD[up.id] + ' at ' + up.min + ': ' + need + ' to go (' + n + ' death' + (n === 1 ? '' : 's') + ')' }); }
  if (down) { const need = mana - down.max, n = Math.ceil(need / cry); out.push({ dir: 'down', band: down.id, at: down.max, need, text: BAND_WORD[down.id] + ' at ' + down.max + ': ' + need + ' below (' + (n === 1 ? 'one Crystallise' : n + ' Crystallises') + ')' }); }
  return out;
}
/** The forecast for a fight now. history: noteMana's readings (round → the meter at its start). */
export function manaForecast(cb: any, history: Record<number, number> = {}): ManaForecast {
  const max = Number(METER().max) || 40, mana = Math.max(0, Math.min(max, Math.round(cb?.mana ?? MANA_START)));
  const b = manaBand(mana), id = b.id, ink = BAND_INK[id] || '#C9D3E3', r = Number(cb?.round) || 1;
  const start = history[r] ?? mana, prev = history[r - 1];
  const thisRound = mana - start, lastRound = prev != null && history[r] != null ? history[r] - prev : null;
  const arrow = thisRound > 0 ? '▲' : thisRound < 0 ? '▼' : '▬';
  const trendText = (thisRound ? signed(thisRound) + ' this round' : 'steady this round') + (lastRound != null ? ' · ' + (lastRound ? signed(lastRound) : '±0') + ' last round' : '');
  const gauge: Segment[] = MANA_BANDS.map((x) => { const w = ((Math.min(max, x.max + 1) - x.min) / (max + 1)) * 100, now = x.id === id, c = BAND_INK[x.id] || '#C9D3E3';
    return { id: x.id, name: BAND_WORD[x.id] || x.id, from: x.min, to: x.max, ink: c, now,
      style: 'flex: 0 0 ' + w.toFixed(2) + '%; height: 100%; background: ' + c + (now ? '' : '; opacity: 0.28') + '; border-right: 1px solid #0A0D13' }; });
  const outlook = outlookOf(mana), effects = bandEffects(id), mv = movers();
  return {
    mana, max, band: id, bandName: BAND_WORD[id] || id, ink, sky: BAND_SKY[id] || '', icon: skyIcon(id, ink),
    headline: (BAND_WORD[id] || id).toUpperCase() + ' AIR · ' + mana + ' / ' + max,
    gauge, marker: 'position: absolute; top: -3px; bottom: -3px; width: 3px; border-radius: 2px; background: #FFFFFF; box-shadow: 0 0 6px #FFFFFF; left: calc(' + ((mana + 0.5) / (max + 1) * 100).toFixed(2) + '% - 1.5px)',
    trend: { thisRound, lastRound, arrow, text: trendText },
    outlook, outlookText: outlook.map((o) => (o.dir === 'up' ? '↑ ' : '↓ ') + o.text).join(' · '),
    effects, movers: mv,
    title: 'The ambient mana meter (0 to ' + max + '): ' + (BAND_WORD[id] || id) + ' air. ' + effects.join('; ') + '. What moves it: ' + mv.join('; ') + '.',
  };
}

// ---------- the sky's icon (drawn in code: lines and shapes, the band's light) ----------
/** A weather mark for each band as an SVG data URI: Thin a pale sun, Normal a sun behind a cloud, Rich a cloud heavy
 *  with motes, Flooded a storm cloud with a bolt. */
export function skyIcon(band: string, ink: string): string {
  const st = 'fill="none" stroke="' + ink + '" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';
  const cloud = (dy = 0) => '<path ' + st + ' d="M7 ' + (17 + dy) + 'h10a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6-1.4A3.8 3.8 0 0 0 7 ' + (17 + dy) + 'z"/>';
  const rays = (cx: number, cy: number, r: number) => [0, 45, 90, 135, 180, 225, 270, 315].map((a) => { const t = (a * Math.PI) / 180; return '<path ' + st + ' d="M' + (cx + Math.cos(t) * (r + 2)).toFixed(1) + ' ' + (cy + Math.sin(t) * (r + 2)).toFixed(1) + 'L' + (cx + Math.cos(t) * (r + 4)).toFixed(1) + ' ' + (cy + Math.sin(t) * (r + 4)).toFixed(1) + '"/>'; }).join('');
  let inner = '';
  if (band === 'thin') inner = '<circle ' + st + ' cx="12" cy="12" r="4"/>' + rays(12, 12, 4);
  else if (band === 'normal') inner = '<circle ' + st + ' cx="9" cy="8" r="3"/>' + rays(9, 8, 3).split('<path').slice(0, 5).join('<path') + cloud(1);
  else if (band === 'rich') inner = cloud(-3) + '<circle fill="' + ink + '" cx="8" cy="19" r="1"/><circle fill="' + ink + '" cx="12" cy="21" r="1"/><circle fill="' + ink + '" cx="16" cy="19" r="1"/>';
  else inner = cloud(-4) + '<path fill="' + ink + '" d="M12.5 14.5 9.5 19h2.4l-1.2 4 4.1-5.6h-2.5l1.4-2.9z"/>';
  return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">' + inner + '</svg>');
}

// ---------- the panel's template values (screens/combat.js) ----------
/** Everything the forecast panel's markup reads (templates/combat.template.html, PANEL:mana). */
/** inSide: the panel sits in the action column (its details open in place and scroll there); in the map zone they open
 *  as a dropdown over the map, so opening them never shrinks the map. */
export function forecastVals(cb: any, open: boolean, toggle: () => void, inSide = false) {
  const f = manaForecast(cb, noteMana(cb));
  const tInk = f.trend.thisRound > 0 ? f.ink : f.trend.thisRound < 0 ? '#C9D3E3' : '#A3AEC2';
  return {
    ...f, open, openStr: open ? 'true' : 'false', toggle, toggleLabel: open ? 'Less ▾' : 'More ▸',
    arrow: f.trend.arrow, trend: f.trend.text, outlook: f.outlookText,
    gauge: f.gauge.map((g) => ({ ...g, title: g.name + ' ' + g.from + '–' + g.to + (g.now ? ' (now)' : '') })),
    effects: f.effects.map((text, i) => ({ key: 'e' + i, text })), movers: f.movers.map((text, i) => ({ key: 'm' + i, text })),
    headStyle: 'font-size: 15px; font-weight: 700; letter-spacing: 0.08em; white-space: nowrap; color: ' + f.ink,
    trendStyle: 'font-size: 11px; font-weight: 700; white-space: nowrap; color: ' + tInk,
    boxStyle: 'display: flex; flex-direction: column; padding: 8px 12px; border-radius: 12px; background: #10151F; border: 1px solid #232D3F; border-left: 3px solid ' + f.ink,
    detailsStyle: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 6px 16px; padding: 8px 12px; border-top: 1px solid #232D3F' + (inSide ? '; margin-top: 6px' : '; position: absolute; left: 0; right: 0; top: calc(100% + 4px); z-index: 7; border-radius: 12px; background: #10151F; border: 1px solid #2E3A50; border-left: 3px solid ' + f.ink + '; box-shadow: 0 12px 28px rgba(0, 0, 0, 0.55)'),
  };
}
