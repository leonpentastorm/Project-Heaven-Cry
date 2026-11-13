// Physical 2.0 on the combat screen (rules 1.12; docs/design/handoffs/physical-2.0-C-client.md, part 2): the Attack tab
// as one block per held weapon (its plain attack and its Techniques pad), and Hold a shot (the Watches). Every cost,
// refusal and line is the engine's (techniquePad, previewTechnique, physView): this module only arranges them.
//
// Action ids (one list for the panel, the turn card and Customise):
//   tq:<hand>:<id>   a technique to use (the plain attack row, or a chip picked from a pad)
//   tpad:<hand>      a weapon's Techniques row (selecting it opens the pad)
//   twatch           Hold a shot (selecting it opens the Watches)
import { WEAPON, ITEM, phys, parseTechId, techParts } from '@engine';
import { tipAttrs } from './actionTip';
type PadEntry = phys.PadEntry; type PadGroup = phys.PadGroup;
import { heatLimit } from '@engine';
const { techniquePad, packPad, pairedPad, physView, weaponSystem, propText, TECHNIQUE, shieldOf } = phys;
import { gearIconUri, GEAR_INK_OFF } from './gearIcons';

export const TQ = 'tq:';
export const TPAD = 'tpad:';
export const TWATCH = 'twatch';
/** 'both': two weapons of one kind, a technique made with each in turn (the third block of the Attack tab) */
export type Hand = 'main' | 'off' | 'both';
/** `item`: what a technique is used with when it isn't in the hand (a pack entry's index, a carried throwable's id). */
export const techAction = (hand: Hand, id: string, item?: string | number | null) => TQ + hand + ':' + id + (item != null && item !== '' ? '@' + item : '');
export const padAction = (hand: Hand) => TPAD + hand;
/** A technique action's hand and id, or null. */
/** A technique's id parsed (the engine's: tq:<hand>:<id>[@<item>]). */
export const parseTech = parseTechId;
/** The pad an action belongs to: a Techniques row (its hand), Hold a shot, or none. */
export function padOf(a: string | null | undefined): { kind: 'tech'; hand: Hand } | { kind: 'watch' } | null {
  if (!a) return null;
  if (a === TWATCH) return { kind: 'watch' };
  if (a.startsWith(TPAD)) { const h = a.slice(TPAD.length); return h === 'main' || h === 'off' || h === 'both' ? { kind: 'tech', hand: h } : null; }
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
  /** used with something that isn't in the hand: the pack entry or throwable (the engine's args.item) */ item?: string | number;
  /** an Answer: it has no button, it happens by itself on its trigger (a shield's Shield Wall, Interpose) */ reaction?: boolean;
  /** its hover card (game/actionTip.ts) as data-tip, and the same in words */ tip: string; tipText: string;
}
export interface ChipGroup { key: string; label: string; chips: TechChip[] }
export interface WeaponBlock {
  hand: Hand; weaponId: string; name: string; icon: string; iconOff: string; system: 'melee' | 'ranged';
  /** the meter in the header: Momentum pips (melee), or rounds loaded and Heat (ranged) */
  meter: string; pips: { key: string; on: boolean }[]; meterHint: string;
  /** this gun is jammed (each gun jams on its own; Hands 5d) */ jammed?: boolean;
  plain: TechChip | null; groups: ChipGroup[]; usable: number; total: number;
  watch: TechChip[];
  /** the off hand's shield (rules 1.13): its meter is Guard, its pad holds the shield's techniques and its reactions */ shield?: boolean;
  /** which pool the pips count */ meterKind?: 'momentum' | 'guard';
}
/** A technique's requirement as a sentence for its card ("Needs a Pressed target. "), or '' when it has none. */
export function needsText(id: string): string {
  const d: any = TECHNIQUE[id]; if (!d) return '';
  const n = d.needs || {}, out: string[] = [];
  // the Momentum rework (Leon, 10 Nov 2026): a Strike and an Opener spend 1 each; the free ones (Cut, Pull Out) and a
  // technique whose data says it costs none (Ambush) don't
  const spends = d.system === 'melee' && !d.free && d.numbers?.momentum_cost !== 0;
  if (d.group === 'opener') out.push('An Opener can only be your first melee technique of the turn.' + (spends ? ' It costs 1 Momentum, but your first Opener of a fight is free.' : ''));
  if (d.group === 'strike' && spends) out.push('A Strike costs 1 Momentum.');
  if (n.momentum) out.push('Needs ' + n.momentum + ' Momentum or more, and spends all of it. It ends your chain for the turn.');
  if (n.held && !/^Only on a target/.test(d.text || '')) out.push('Needs a target you have Grappled or Bound.');
  if (n.pressed) out.push('Needs a Pressed target (Pressure 2 or more), and lowers that Pressure by 2. You can make one Take a turn.');
  if (n.hidden) out.push('Only while you are Hidden.');
  if (n.last_round && !/^Only with the last/.test(d.text || '')) out.push('Only with the last round in the weapon.');
  if (n.stowed) out.push('Used with a weapon in your pack, not the one in your hand.');
  return out.length ? out.join(' ') + ' ' : '';
}
const chipOf = (e: PadEntry, reaction = false): TechChip => {
  const rounds = e.rounds === 'all' ? 'all rounds' : e.rounds ? e.rounds + (e.rounds === 1 ? ' round' : ' rounds') : '';
  const mark = e.signature ? '◆' : e.lent ? '◇' : '';
  const markTitle = e.signature ? '' : e.lent ? 'This is the weapon\'s signature technique. You can use it while you hold the weapon. Drill it to keep it.' : '';
  const why = e.ok ? '' : (e.why || 'Not now.').replace(/\.+$/, '') + '.';
  // the property behind the line, explained in the engine's own words (its glossary): "Point: …"
  const ln = e.line ? (TECHNIQUE[e.id]?.lines || []).find((l: any) => l.text === e.line) : null;
  const why1 = ln ? ln.props.map((p: string) => (propText(p) ? p.charAt(0).toUpperCase() + p.slice(1) + ': ' + propText(p) : '')).filter(Boolean).join(' ') : '';
  const full = (t: string) => (/[.!?:)]$/.test(t.trim()) ? t.trim() : t.trim() + '.');
  // what it needs before it can be used at all, said first and in plain words (Leon, 10 Nov 2026)
  const help = needsText(e.id) + full(e.text) + (e.line ? ' With this weapon: ' + full(e.line) : '') + (why1 ? ' (' + why1.trim() + ')' : '');
  // the hover card: a line each (what it needs, what it does, the weapon's line, its traits, the signature note, why not)
  const parts = techParts(e), card = (cost: string[]) => tipAttrs({ name: e.name, cost, needs: parts.needs, text: parts.text, line: parts.line, traits: parts.traits, notes: markTitle ? [{ label: 'Signature', text: markTitle }] : [], why: why || null });
  return { key: e.id, id: e.id, name: e.name, ap: e.ap, apText: e.ap + ' AP', rounds, line: e.line || '', ok: e.ok, why, lent: e.lent, signature: e.signature, built: e.built,
    mark, markTitle, title: e.name + ' · ' + e.ap + ' AP' + (rounds ? ' · ' + rounds : '') + '. ' + help + (why ? ' (' + why + ')' : '') + (markTitle ? ' ' + markTitle : ''), help, aim: e.aim, choices: e.choices || [],
    ...card(reaction ? ['reaction'] : [e.ap + ' AP', ...(rounds ? [rounds] : [])]) };
};
/** An Answer on a pad: not a button. What it costs and when it happens are in its text; a refusal (no Guard) is kept. */
const reactionChip = (c: TechChip): TechChip => ({ ...c, reaction: true, apText: 'reaction', title: c.name + ' · a reaction. ' + c.help + (c.why ? ' (' + c.why + ')' : ''), line: c.line || c.help });
/** The unit's held weapons as blocks, main hand first, then the off hand if it holds a weapon. Pure on the view. */
export function weaponBlocks(g: any, cb: any, u: any): WeaponBlock[] {
  if (!cb || !u) return [];
  const shieldId = !u.offWeapon ? (() => { try { return shieldOf(u); } catch { return null; } })() : null;
  const hands: Hand[] = ['main', ...((u.offWeapon && (WEAPON as any)[u.offWeapon]) || shieldId ? ['off' as Hand] : [])];
  const pv = (() => { try { return physView(cb, u, u.side, g); } catch { return null; } })();
  const blocks = hands.map((hand): WeaponBlock | null => {
    // A shield in the off hand: its own block. Shield Bash and Raise Shield are chips; Shield Wall and Interpose are
    // reactions (listed to read: they happen by themselves, for 1 Guard). The meter is the Guard pool.
    if (hand === 'off' && shieldId) {
      let pad: PadGroup[] = []; try { pad = techniquePad(cb, u, 'off', g); } catch { pad = []; }
      // Interpose is a skill's Answer: with a melee weapon in the main hand the engine lists it on that hand's pad, whose
      // Answers have no row on screen. Everything that spends Guard is read here, on the shield.
      try { const have = new Set(pad.flatMap((gr) => gr.entries.map((e) => e.id)));
        const more = (techniquePad(cb, u, 'main', g).find((gr) => gr.group === 'answer')?.entries || []).filter((e) => !have.has(e.id) && (TECHNIQUE[e.id]?.numbers as any)?.guard_cost);
        if (more.length) { const ans = pad.find((gr) => gr.group === 'answer'); if (ans) pad = pad.map((gr) => (gr === ans ? { ...gr, entries: [...gr.entries, ...more] } : gr)); else pad = [...pad, { group: 'answer' as any, label: 'Answers', entries: more }]; }
      } catch { /* the shield's own pad stands */ }
      const groups = pad.filter((gr) => gr.group !== 'watch').map((gr) => ({ key: gr.group, label: gr.group === 'answer' ? 'REACTIONS · THEY HAPPEN BY THEMSELVES' : gr.label.toUpperCase(),
        chips: gr.entries.filter((e) => !e.plain).map((e) => (gr.group === 'answer' ? reactionChip(chipOf(e, true)) : chipOf(e))) })).filter((gr) => gr.chips.length);
      const chips = groups.flatMap((gr) => gr.chips).filter((c) => !c.reaction), gd = pv && pv.guard;
      return { hand, weaponId: shieldId, name: (ITEM as any)[shieldId]?.name || 'Shield', icon: gearIconUri(shieldId), iconOff: gearIconUri(shieldId, GEAR_INK_OFF), system: 'melee', shield: true, meterKind: 'guard',
        meter: gd ? 'Guard ' + gd.now + ' / ' + gd.max : 'No Guard pool', pips: gd ? Array.from({ length: gd.max }, (_, i) => ({ key: 'g' + i, on: i < gd.now })) : [],
        meterHint: gd ? 'Each Guard point takes ' + gd.soak + ' damage off a hit. Brace gives ' + gd.braceGain + ' Guard and the Guard technique gives ' + gd.gain + '. Raise Shield turns Momentum into Guard.' : 'You need a point of Durability to hold Guard.',
        plain: null, groups, usable: chips.filter((c) => c.ok).length, total: chips.length, watch: [] };
    }
    const weaponId = hand === 'off' ? u.offWeapon : u.weapon, w: any = (WEAPON as any)[weaponId]; if (!w) return null;
    let pad: PadGroup[] = []; try { pad = techniquePad(cb, u, hand as 'main' | 'off', g); } catch { pad = []; }
    const system = weaponSystem(weaponId) as 'melee' | 'ranged';
    const all = pad.flatMap((gr) => gr.entries), plainE = all.find((e) => e.plain) || null;
    const groups = pad.filter((gr) => gr.group !== 'watch' && gr.group !== 'answer').map((gr) => ({ key: gr.group, label: gr.label.toUpperCase(), chips: gr.entries.filter((e) => !e.plain).map((e) => chipOf(e)) })).filter((gr) => gr.chips.length);
    const watch = (pad.find((gr) => gr.group === 'watch')?.entries || []).map((e) => chipOf(e));
    // what a ready technique can do with a weapon in the pack (Draw Cut, Snap Shot) or a carried throwable (Lob, Rout):
    // one group per item, on the main hand's pad
    if (hand === 'main') { let packs: any[] = []; try { packs = packPad(cb, u, g); } catch { packs = []; }
      for (const pk of packs) groups.push({ key: ('pack-' + pk.item) as any, label: (pk.kind === 'stowed' ? 'DRAW · ' : 'THROW · ') + String(pk.name).toUpperCase() + (pk.count != null ? ' ×' + pk.count : ''),
        chips: pk.entries.map((e: PadEntry) => ({ ...chipOf(e), key: e.id + '@' + pk.item, item: pk.item })) }); }
    const chips = groups.flatMap((gr) => gr.chips);
    // the header's meter: Momentum for a melee weapon, rounds and Heat for a ranged one
    let meter = '', pips: { key: string; on: boolean }[] = [], meterHint = '';
    if (system === 'melee' && pv && pv.momentum) {
      meter = 'Momentum ' + pv.momentum.now + ' / ' + pv.momentum.max; meterHint = pv.momentum.hint || '';
      pips = Array.from({ length: pv.momentum.max }, (_, i) => ({ key: 'm' + i, on: i < pv.momentum!.now }));
    } else if (system === 'ranged') {
      const loaded = hand === 'off' ? u.offAmmo ?? 0 : u.ammo ?? 0;
      meter = (w.magazine != null ? loaded + ' / ' + w.magazine + ' loaded' : '') + (w.heat_limit ? (w.magazine != null ? ' · ' : '') + 'Heat ' + (u.heat || 0) + ' / ' + heatLimit(u, w) : '');
    }
    return { hand, weaponId, name: (hand === 'main' ? u.weaponName : null) || w.name, icon: gearIconUri(weaponId), iconOff: gearIconUri(weaponId, GEAR_INK_OFF), system, meter, pips, meterHint, jammed: system === 'ranged' && !!(hand === 'off' ? u.offJammed : u.jammed),
      plain: plainE ? chipOf(plainE) : null, groups, usable: chips.filter((c) => c.ok).length, total: chips.length, watch, ...(system === 'melee' && pips.length ? { meterKind: 'momentum' as const } : {}) };
  }).filter((b): b is WeaponBlock => !!b);
  // Two weapons of one kind (two guns, two melee weapons): a third block for what both do together (Leon, 10 Nov 2026):
  // the paired attack, the techniques that can be made with each in turn, and (the screen adds it) reloading both.
  const bm = blocks.find((b) => b.hand === 'main'), bo = blocks.find((b) => b.hand === 'off');
  if (bm && bo && !bo.shield && bm.system === bo.system) {
    let pe: PadEntry[] = []; try { pe = pairedPad(cb, u, g); } catch { pe = []; }
    const chips = pe.map((e) => chipOf(e));
    blocks.push({ hand: 'both', weaponId: bm.weaponId, name: 'Both hands', icon: bm.icon, iconOff: bm.iconOff, system: bm.system, meter: bm.name + ' + ' + bo.name, pips: [], meterHint: 'The main hand is at −1 to hit and the off hand at −3, improved by 1 for every 3 points of Dexterity, up to −1. It costs the higher of the two AP costs, plus 1.',
      plain: null, groups: chips.length ? [{ key: 'paired' as any, label: 'WITH BOTH WEAPONS · EACH IN TURN', chips }] : [], usable: chips.filter((c) => c.ok).length, total: chips.length, watch: [] });
  }
  return blocks;
}
/** The row of the paired attack (the engine's combat/paired), the first row of the both-hands block. */
export const PAIRED = 'paired';

/** The Attack tab's rows for the blocks: [id, label, cost, text, why] as the action list wants them. */
export function blockItems(blocks: WeaponBlock[]): [string, string, string, string, (string | null)?][] {
  const out: [string, string, string, string, (string | null)?][] = [];
  // (each block's header names the weapon and its hand, so the rows don't repeat it)
  for (const b of blocks) {
    if (b.plain) out.push([techAction(b.hand, b.plain.id), b.plain.name, b.plain.apText, b.plain.help, b.plain.ok ? null : b.plain.why]);
    if (b.hand === 'both') out.push(['paired', b.system === 'melee' ? 'Strike with both' : 'Fire both', 'AP +1', 'Make one attack with each weapon at the same target. It costs the higher of the two AP costs, plus 1. The main hand is at −1 to hit and the off hand at −3, improved by 1 for every 3 points of Dexterity, up to −1.']);
    if (b.hand === 'both' && !b.total) continue; // no shared technique: only the paired attack
    if (b.shield) { out.push([padAction(b.hand), 'Shield techniques · ' + b.usable, b.total ? b.usable + ' of ' + b.total + ' now' : '', 'What you can do with the ' + b.name + '. Pick Shield Bash or Raise Shield in the pad. Its reactions happen by themselves.', b.total ? null : 'No shield techniques.']); continue; }
    out.push([padAction(b.hand), 'Techniques · ' + b.usable, b.total ? b.usable + ' of ' + b.total + ' now' : '', (b.hand === 'both' ? 'Use one technique with each weapon in turn, the main hand at −1 to hit and the off hand at −3, for 1 AP more' : 'What you can do with the ' + b.name) + '. Pick one in the pad, then its target.', b.total ? null : 'No techniques ready for this weapon.']);
  }
  const watch = watchChips(blocks);
  // Its cost is its Watches' (the engine's AP on each chip): one number, or the range ("2–3 AP"). No row is without a price.
  const wAp = watch.map((c) => c.ap).filter((n) => typeof n === 'number'), wLo = Math.min(...wAp), wHi = Math.max(...wAp);
  if (watch.length) out.push([TWATCH, 'Hold a shot', !wAp.length ? '' : wLo === wHi ? wLo + ' AP' : wLo + '–' + wHi + ' AP', 'Hold a shot until its trigger happens: Overwatch, Deny, Cover Me or Dead to Rights. It fires on the enemy\'s turn, as your reaction.', watch.some((c) => c.ok) ? null : watch[0].why]);
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
export function padView(blocks: WeaponBlock[], pad: ReturnType<typeof padOf>, sel: { hand: Hand; id: string; item?: string | number } | null) {
  if (!pad) return null;
  if (pad.kind === 'watch') {
    const chips = watchChips(blocks);
    return { key: TWATCH, title: 'HOLD A SHOT · PICK ONE, THEN ITS TILE OR ALLY', groups: [{ key: 'watch', label: 'WATCHES', chips: chips.map((c) => ({ ...c, action: techAction(c.hand, c.id), pressed: !!sel && sel.id === c.id })) }] };
  }
  const b = blocks.find((x) => x.hand === pad.hand); if (!b) return null;
  return { key: padAction(b.hand), title: b.name.toUpperCase() + ' · PICK A TECHNIQUE, THEN ITS TARGET',
    groups: b.groups.map((gr) => ({ ...gr, chips: gr.chips.map((c) => ({ ...c, action: techAction(b.hand, c.id, c.item), pressed: !!sel && sel.hand === b.hand && sel.id === c.id && (sel as any).item == c.item })) })) };
}

// ---------- the selected technique ----------
// A picked technique is on the one action flow (game/actionFlow.ts): what to click next, its preview in words, its
// red area and what Confirm sends are the engine's descriptor (descriptors.ts).
/** Whether a technique aims at an ally (the pad's chip keeps the screen's target for the others). */
export const needsAlly = (id: string) => ((TECHNIQUE as any)[id]?.aim || 'enemy') === 'ally';
/** A property's explanation (the engine's glossary), for the chips' and the help's hover. */
export const propHelp = (prop: string) => propText(prop);

// ---------- Pressure, Watches and Stopped on the map and the You card (part 3) ----------
type PhysView = ReturnType<typeof phys.physView>;
/** A unit's meters as this side may see them (null when the engine has none for it). */
export function physOf(g: any, cb: any, u: any, side: 'pc' | 'foe' = 'pc'): PhysView | null {
  try { return physView(cb, u, side, g); } catch { return null; }
}
const PRESS_INK: Record<string, string> = { '': '#E7EBF3', pressed: '#F2A54A', suppressed: '#F65157', broken: '#F65157' };
/** The pips over a token: up to the unit's cap, filled to its Pressure (public: no Analyze needed), and the state word
 *  for its hover card and aria-label. Pips a Silent weapon put on a unit are already left out of its own side's view. */
export function pressureLook(v: PhysView | null): { has: boolean; pips: { key: string; style: string }[]; word: string; title: string; style: string } {
  const p = v?.pressure; if (!p || !p.now) return { has: false, pips: [], word: '', title: '', style: '' };
  const ink = PRESS_INK[p.state] || '#E7EBF3', n = Math.min(4, p.max);
  const pips = Array.from({ length: n }, (_, i) => ({ key: 'p' + i, style: 'width: 6px; height: 6px; border-radius: 50%; box-sizing: border-box; ' + (i < p.now ? 'background: ' + ink : 'border: 1px solid rgba(231, 235, 243, 0.55); background: rgba(5, 7, 11, 0.7)') }));
  const word = p.word || 'Under fire';
  return { has: true, pips, word, title: 'Pressure ' + p.now + ' / ' + p.max + ' · ' + word + (p.cost ? ': ' + p.cost : ''),
    style: 'position: absolute; left: 50%; top: 0; transform: translateX(-50%); z-index: 4; display: flex; gap: 2px; padding: 1px 2px; border-radius: 4px; pointer-events: none; background: rgba(5, 7, 11, 0.6)' };
}
/** The hover card's lines for a unit: its Pressure and state, and that it can't be stopped again this round. */
export function physLines(v: PhysView | null): string[] {
  if (!v) return [];
  const out: string[] = [];
  if (v.pressure && v.pressure.now) out.push((v.pressure.word || 'Under fire') + ' (Pressure ' + v.pressure.now + ' / ' + v.pressure.max + ')' + (v.pressure.cost ? ': ' + v.pressure.cost : ''));
  if (v.stopped) out.push('Stopped once: ' + v.stopped.text.charAt(0).toLowerCase() + v.stopped.text.slice(1));
  if (v.watch) out.push('Holding ' + v.watch.name + (v.watch.tile ? ' on ' + v.watch.tile : ''));
  return out;
}
/** The You card's chips (key, k: the short word, t: what it means, style): your Pressure with its state, cost and who
 *  put it there; your held Watch with its trigger; Stopped once. */
export function physChips(v: PhysView | null, refOf: (k: string) => string, style: string): { key: string; k: string; t: string; style: string }[] {
  if (!v) return [];
  const out: { key: string; k: string; t: string; style: string }[] = [];
  const p = v.pressure;
  if (p && p.now) out.push({ key: 'pressure', k: (p.word || 'Under fire').toUpperCase() + ' · ' + p.now + '/' + p.max, style,
    t: 'Pressure ' + p.now + ' of ' + p.max + (p.cost ? '. ' + p.cost + '.' : '.') + (p.by && p.by.length ? ' From ' + p.by.map((b) => b.name).join(', ') + '.' : '') });
  if (v.watch && v.watch.mine) out.push({ key: 'watch', k: v.watch.name.toUpperCase() + (v.watch.tile ? ' · ' + refOf(v.watch.tile) : ''), style,
    t: 'Holding ' + v.watch.name + ': it fires when ' + ({ moves: 'an enemy moves in your sight', enters_tile: 'someone steps onto the tile', attacks_ally: 'someone attacks the ally you cover', acts: 'the target acts' } as Record<string, string>)[v.watch.trigger] + '.' });
  if (v.stopped) out.push({ key: 'stopped', k: 'STOPPED ONCE', style, t: v.stopped.text + '.' });
  return out;
}
/** Every held Watch your side can see, on the map: its tiles tinted (red for an enemy's, white for your side's), a
 *  dotted line from the watcher to them, and a chip on the watcher. */
export function watchMarks(g: any, cb: any, side: 'pc' | 'foe' = 'pc'): { tiles: Map<string, { style: string; title: string }>; chips: Map<string, { text: string; title: string; style: string }> } {
  const tiles = new Map<string, { style: string; title: string }>(), chips = new Map<string, { text: string; title: string; style: string }>();
  for (const u of cb?.units || []) {
    if (u.dead || u.downed) continue;
    const v = physOf(g, cb, u, side), w = v && v.watch; if (!w) continue;
    const ours = u.side === side, ink = ours ? '#E7EBF3' : '#F65157', rgb = ours ? '231, 235, 243' : '246, 81, 87';
    const title = (ours ? '' : 'Enemy ') + w.name + ' held by ' + u.name;
    chips.set(u.id, { text: '◎ ' + w.name.toUpperCase(), title, style: 'position: absolute; left: 50%; bottom: -13px; transform: translateX(-50%); z-index: 5; padding: 0 4px; border-radius: 4px; font-size: 9px; font-weight: 700; letter-spacing: 0.06em; white-space: nowrap; pointer-events: none; background: #0A0D13; color: ' + ink + '; border: 1px solid ' + ink });
    for (const k of w.tiles) tiles.set(k, { title, style: 'position: absolute; inset: 0; z-index: 1; pointer-events: none; box-sizing: border-box; border-radius: 4px; background: rgba(' + rgb + ', ' + (ours ? 0.08 : 0.16) + '); border: 1px dashed rgba(' + rgb + ', 0.85)' });
    // the line: the tiles between the watcher and the nearest watched tile, a dot on each
    const to = w.tiles.length ? w.tiles.reduce((a: string, b: string) => (dist2(u.pos, b) < dist2(u.pos, a) ? b : a), w.tiles[0]) : null;
    if (to) for (const k of lineTiles(u.pos, to)) if (!tiles.has(k) && k !== u.pos) tiles.set(k, { title, style: 'position: absolute; left: 50%; top: 50%; width: 6px; height: 6px; margin: -3px 0 0 -3px; z-index: 1; border-radius: 50%; pointer-events: none; background: ' + ink + '; opacity: 0.7' });
  }
  return { tiles, chips };
}
const xy = (k: string) => k.split(',').map(Number);
const dist2 = (a: string, b: string) => { const [ax, ay] = xy(a), [bx, by] = xy(b); return (ax - bx) ** 2 + (ay - by) ** 2; };
/** The tiles on a straight line between two tiles (both ends left out). */
export function lineTiles(a: string, b: string): string[] {
  const [x0, y0] = xy(a), [x1, y1] = xy(b), n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)), out: string[] = [];
  for (let i = 1; i < n; i++) out.push(Math.round(x0 + ((x1 - x0) * i) / n) + ',' + Math.round(y0 + ((y1 - y0) * i) / n));
  return out;
}

/** The choices a technique's text offers beyond its property line, and what is sent when nothing is picked: the engine's. */
export { TECH_OPTIONS as TECH_OPTS, techOpt as techOptOf } from '@engine';
