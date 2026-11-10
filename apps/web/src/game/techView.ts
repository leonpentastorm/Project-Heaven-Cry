// Physical 2.0 on the combat screen (rules 1.12; docs/design/handoffs/physical-2.0-C-client.md, part 2): the Attack tab
// as one block per held weapon (its plain attack and its Techniques pad), and Hold a shot (the Watches). Every cost,
// refusal and line is the engine's (techniquePad, previewTechnique, physView): this module only arranges them.
//
// Action ids (one list for the panel, the turn card and Customise):
//   tq:<hand>:<id>   a technique to use (the plain attack row, or a chip picked from a pad)
//   tpad:<hand>      a weapon's Techniques row (selecting it opens the pad)
//   twatch           Hold a shot (selecting it opens the Watches)
import { WEAPON, phys } from '@engine';
type PadEntry = phys.PadEntry; type PadGroup = phys.PadGroup; type TechPreview = phys.TechPreview;
const { techniquePad, previewTechnique, physView, weaponSystem, propText, TECHNIQUE } = phys;
import { gearIconUri, GEAR_INK_OFF } from './gearIcons';

export const TQ = 'tq:';
export const TPAD = 'tpad:';
export const TWATCH = 'twatch';
export type Hand = 'main' | 'off';
export const techAction = (hand: Hand, id: string) => TQ + hand + ':' + id;
export const padAction = (hand: Hand) => TPAD + hand;
/** A technique action's hand and id, or null. */
export function parseTech(a: string | null | undefined): { hand: Hand; id: string } | null {
  if (!a || !a.startsWith(TQ)) return null;
  const [hand, id] = a.slice(TQ.length).split(':');
  return (hand === 'main' || hand === 'off') && id ? { hand, id } : null;
}
/** The pad an action belongs to: a Techniques row (its hand), Hold a shot, or none. */
export function padOf(a: string | null | undefined): { kind: 'tech'; hand: Hand } | { kind: 'watch' } | null {
  if (!a) return null;
  if (a === TWATCH) return { kind: 'watch' };
  if (a.startsWith(TPAD)) { const h = a.slice(TPAD.length); return h === 'main' || h === 'off' ? { kind: 'tech', hand: h } : null; }
  return null;
}
/** Whether this id is one of the Attack tab's technique rows or chips. */
export const isTechId = (a: string | null | undefined) => !!a && (a.startsWith(TQ) || a.startsWith(TPAD) || a === TWATCH);

/** The attack modes the old rows used (combat/attack). Kept as one list for the screen's checks; the Attack tab no
 *  longer shows them as rows (the engine still takes them: the turn card's saved picks map onto the plain attack). */
export const ATTACK_MODES = ['shot', 'aimed', 'melee', 'burst', 'auto'] as const;
export const isAttackMode = (a: string | null | undefined) => !!a && (ATTACK_MODES as readonly string[]).includes(a);
/** Old attack ids a saved turn-card pick may still hold, and the technique row that replaces each. */
export function legacyAttack(a: string, hasOff: boolean): string | null {
  if (a === 'shot' || a === 'melee' || a === 'aimed' || a === 'burst' || a === 'auto' || a === 'skill') return 'plain:main';
  if (a === 'overwatch') return TWATCH;
  void hasOff; return null;
}

// ---------- the weapon blocks ----------
export interface TechChip {
  key: string; id: string; name: string; ap: number; apText: string; rounds: string; line: string; ok: boolean; why: string;
  lent: boolean; signature: boolean; built: boolean; mark: string; markTitle: string; title: string; help: string; aim: string;
  choices: { prop: string; text: string }[];
}
export interface ChipGroup { key: string; label: string; chips: TechChip[] }
export interface WeaponBlock {
  hand: Hand; weaponId: string; name: string; icon: string; iconOff: string; system: 'melee' | 'ranged';
  /** the meter in the header: Momentum pips (melee), or rounds loaded and Heat (ranged) */
  meter: string; pips: { key: string; on: boolean }[]; meterHint: string;
  plain: TechChip | null; groups: ChipGroup[]; usable: number; total: number;
  watch: TechChip[];
}
const chipOf = (e: PadEntry): TechChip => {
  const rounds = e.rounds === 'all' ? 'all rounds' : e.rounds ? e.rounds + (e.rounds === 1 ? ' round' : ' rounds') : '';
  const mark = e.signature ? '◆' : e.lent ? '◇' : '';
  const markTitle = e.signature ? 'A signature you learned: yours with any weapon that can use it.' : e.lent ? 'This weapon\'s signature: lent while you hold it (drill it to keep it).' : '';
  const why = e.ok ? '' : e.why || 'Not now.';
  const help = e.text + (e.line ? ' With this weapon: ' + e.line : '');
  return { key: e.id, id: e.id, name: e.name, ap: e.ap, apText: e.ap + ' AP', rounds, line: e.line || '', ok: e.ok, why, lent: e.lent, signature: e.signature, built: e.built,
    mark, markTitle, title: e.name + ' · ' + e.ap + ' AP' + (rounds ? ' · ' + rounds : '') + '. ' + help + (why ? ' (' + why + ')' : '') + (markTitle ? ' ' + markTitle : ''), help, aim: e.aim, choices: e.choices || [] };
};
/** The unit's held weapons as blocks, main hand first, then the off hand if it holds a weapon. Pure on the view. */
export function weaponBlocks(g: any, cb: any, u: any): WeaponBlock[] {
  if (!cb || !u) return [];
  const hands: Hand[] = ['main', ...(u.offWeapon && (WEAPON as any)[u.offWeapon] ? ['off' as Hand] : [])];
  const pv = (() => { try { return physView(cb, u, u.side, g); } catch { return null; } })();
  return hands.map((hand): WeaponBlock | null => {
    const weaponId = hand === 'off' ? u.offWeapon : u.weapon, w: any = (WEAPON as any)[weaponId]; if (!w) return null;
    let pad: PadGroup[] = []; try { pad = techniquePad(cb, u, hand, g); } catch { pad = []; }
    const system = weaponSystem(weaponId) as 'melee' | 'ranged';
    const all = pad.flatMap((gr) => gr.entries), plainE = all.find((e) => e.plain) || null;
    const groups = pad.filter((gr) => gr.group !== 'watch' && gr.group !== 'answer').map((gr) => ({ key: gr.group, label: gr.label.toUpperCase(), chips: gr.entries.filter((e) => !e.plain).map(chipOf) })).filter((gr) => gr.chips.length);
    const watch = (pad.find((gr) => gr.group === 'watch')?.entries || []).map(chipOf);
    const chips = groups.flatMap((gr) => gr.chips);
    // the header's meter: Momentum for a melee weapon, rounds and Heat for a ranged one
    let meter = '', pips: { key: string; on: boolean }[] = [], meterHint = '';
    if (system === 'melee' && pv && pv.momentum) {
      meter = 'Momentum ' + pv.momentum.now + ' / ' + pv.momentum.max; meterHint = pv.momentum.hint || '';
      pips = Array.from({ length: pv.momentum.max }, (_, i) => ({ key: 'm' + i, on: i < pv.momentum!.now }));
    } else if (system === 'ranged') {
      const loaded = hand === 'off' ? u.offAmmo ?? 0 : u.ammo ?? 0;
      meter = (w.magazine != null ? loaded + ' / ' + w.magazine + ' loaded' : '') + (w.heat_limit ? (w.magazine != null ? ' · ' : '') + 'Heat ' + (hand === 'main' ? u.heat || 0 : 0) + ' / ' + w.heat_limit : '');
    }
    return { hand, weaponId, name: (hand === 'main' ? u.weaponName : null) || w.name, icon: gearIconUri(weaponId), iconOff: gearIconUri(weaponId, GEAR_INK_OFF), system, meter, pips, meterHint,
      plain: plainE ? chipOf(plainE) : null, groups, usable: chips.filter((c) => c.ok).length, total: chips.length, watch };
  }).filter((b): b is WeaponBlock => !!b);
}

/** The Attack tab's rows for the blocks: [id, label, cost, text, why] as the action list wants them. */
export function blockItems(blocks: WeaponBlock[]): [string, string, string, string, (string | null)?][] {
  const two = blocks.length > 1, out: [string, string, string, string, (string | null)?][] = [];
  for (const b of blocks) {
    const tag = two ? ' · ' + (b.hand === 'main' ? 'main' : 'off') : '';
    if (b.plain) out.push([techAction(b.hand, b.plain.id), b.plain.name + tag, b.plain.apText, b.plain.help, b.plain.ok ? null : b.plain.why]);
    out.push([padAction(b.hand), 'Techniques · ' + b.usable + tag, b.total ? b.usable + ' / ' + b.total : '', 'What you can do with the ' + b.name + ': pick one in the pad, then its target.', b.total ? null : 'No techniques ready for this weapon.']);
  }
  const watch = watchChips(blocks);
  if (watch.length) out.push([TWATCH, 'Hold a shot', '', 'Hold a shot until its trigger: Overwatch, Deny, Cover Me, Dead to Rights. It fires on the enemy\'s turn.', watch.some((c) => c.ok) ? null : watch[0].why]);
  return out;
}
/** The Watches of every ranged weapon held, each with its hand (the first ranged hand that offers it). */
export function watchChips(blocks: WeaponBlock[]): (TechChip & { hand: Hand })[] {
  const seen = new Set<string>(), out: (TechChip & { hand: Hand })[] = [];
  for (const b of blocks) for (const c of b.watch) if (!seen.has(c.id)) { seen.add(c.id); out.push({ ...c, hand: b.hand }); }
  return out;
}

// ---------- the pad ----------
/** The chips a pad shows: a weapon's Techniques by group, or Hold a shot's Watches. sel: the technique picked. */
export function padView(blocks: WeaponBlock[], pad: ReturnType<typeof padOf>, sel: { hand: Hand; id: string } | null) {
  if (!pad) return null;
  if (pad.kind === 'watch') {
    const chips = watchChips(blocks);
    return { key: TWATCH, title: 'HOLD A SHOT · PICK ONE, THEN ITS TILE OR ALLY', groups: [{ key: 'watch', label: 'WATCHES', chips: chips.map((c) => ({ ...c, action: techAction(c.hand, c.id), pressed: !!sel && sel.id === c.id })) }] };
  }
  const b = blocks.find((x) => x.hand === pad.hand); if (!b) return null;
  return { key: padAction(b.hand), title: b.name.toUpperCase() + ' · PICK A TECHNIQUE, THEN ITS TARGET',
    groups: b.groups.map((gr) => ({ ...gr, chips: gr.chips.map((c) => ({ ...c, action: techAction(b.hand, c.id), pressed: !!sel && sel.hand === b.hand && sel.id === c.id })) })) };
}

// ---------- the selected technique ----------
/** The arguments a technique needs from the grid, by what it aims at. */
export const aimOf = (id: string): string => TECHNIQUE[id]?.aim || 'enemy';
export const needsEnemy = (id: string) => aimOf(id) === 'enemy' || aimOf(id).startsWith('enemy');
export const needsTile = (id: string) => aimOf(id) === 'tile' || aimOf(id).endsWith('+tile');
export const needsAlly = (id: string) => aimOf(id) === 'ally';
/** What to ask the player for next, in words (null: nothing more to pick). */
export function techPrompt(id: string, have: { target?: any; tile?: string | null; ally?: any }): string | null {
  if (needsEnemy(id) && !have.target) return 'Click an enemy on the map.';
  if (needsAlly(id) && !have.ally) return 'Click an ally on the map.';
  if (needsTile(id) && !have.tile) return aimOf(id) === 'enemy+tile' ? 'Now click the tile.' : 'Click a tile on the map.';
  return null;
}
/** The engine's preview of the picked technique (null when it can't be asked yet). */
export function techPreview(g: any, cb: any, u: any, sel: { hand: Hand; id: string }, args: { targetId?: string; tile?: string | null; allyId?: string; line?: string | null }): TechPreview | null {
  try { return previewTechnique(cb, u, sel.id, { hand: sel.hand, ...(args.targetId ? { targetId: args.targetId } : {}), ...(args.tile ? { tile: args.tile } : {}), ...(args.allyId ? { allyId: args.allyId } : {}), ...(args.line ? { line: args.line } : {}) }, g); }
  catch (e) { return { ok: false, why: String((e as any)?.message || e), id: sel.id, ap: 0, rounds: 0, attacks: [], notes: [] }; }
}
const STATE: Record<string, string> = { pressed: 'Pressed', suppressed: 'Suppressed', broken: 'Broken', under_fire: 'Under fire', '': '' };
/** The preview as lines for the selected card: each roll's odds, the damage, the notes, Momentum, Pressure, saves. */
export function previewLines(cb: any, pv: TechPreview | null): { odds: string[]; notes: string[]; meters: string[]; saves: string[] } {
  const out = { odds: [] as string[], notes: [] as string[], meters: [] as string[], saves: [] as string[] };
  if (!pv) return out;
  const nameOf = (id: string) => cb.units.find((x: any) => x.id === id)?.name || id;
  for (const a of pv.attacks || []) {
    const p: any = a.pv; if (!p) continue;
    out.odds.push(nameOf(a.target) + ': ' + (p.ok ? 'hit ' + p.pct + '% · need ' + p.need + (p.dmg && p.dmg.total != null ? ' · ' + p.dmg.total + ' damage' : '') : p.why || 'can\'t attack'));
  }
  out.notes = [...(pv.notes || [])];
  if (pv.momentum) out.meters.push('Momentum ' + pv.momentum.now + ' → ' + pv.momentum.after + (pv.ends ? ' · ends your chain' : ''));
  for (const p of pv.pressure || []) out.meters.push(nameOf(p.unit) + ': Pressure ' + (p.add >= 0 ? '+' : '') + p.add + ' → ' + p.after + (p.state ? ' (' + (STATE[p.state] || p.state) + ')' : '') + (p.onHit ? ' on a hit' : ''));
  for (const s of pv.saves || []) out.saves.push(nameOf(s.unit) + ' saves with ' + s.skills.map((k) => k.replace(/_/g, ' ')).join(' or ') + ' vs TN ' + s.tn);
  return out;
}
/** A property's explanation (the engine's glossary), for the chips' and the help's hover. */
export const propHelp = (prop: string) => propText(prop);
