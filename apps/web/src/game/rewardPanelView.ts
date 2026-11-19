// The reward panel, as data (rules 1.64, Leon on live 0.31.1: the rewards were a section above the path map, and a
// player zoomed into the map never saw it and clicked the map again and again). After a won fight's field (and at the
// vault's chest), while the run is in its reward state, the panel shows the viewer's own pay and picks over the middle.
// Every number is the engine's: the fight record's `paid` (what each character was paid as the fight was won, after its
// items' changes and Tithe), the node's note (the supply pack, who stood up; a cache's or the vault's pay), the
// character's XP and credits now (creditsOf), `levelUpDue`. The picks are runView's (the same cards). Words: data
// (survival.json run.reward_panel).
import { type GameState, creditsOf, levelUpDue, survivalRun } from '@engine';
import type { RunViewV, OfferV, ChoiceCharV } from './runView';

export interface RewardPayV {
  charId: string; name: string;
  /** the XP and credits this character took here (null: none paid here) */ xp: number | null; credits: number | null;
  /** the character's XP, level and credits now */ xpTotal: number; level: number; creditsTotal: number;
  /** a level-up waits on the sheet (the engine's levelUpDue) */ levelUp: boolean;
  /** the supply pack, in the engine's words (magazines, cores, MP) */ supply: string[];
  /** stood up after the fight (rule 5) */ back: boolean;
}
export interface RewardPanelV {
  /** which reward this is (a node visited at a point of the path): a panel closed early stays closed for this one only */ key: string;
  /** the fight's name (or the node's kicker), and the note's title ("Won in 3 rounds") */ kicker: string; title: string;
  pay: RewardPayV[];
  /** the viewer's own picks (the same cards as the run screen's) and picks of kit */ offers: OfferV[]; kits: ChoiceCharV[];
  /** the viewer still has a pick to make */ owe: boolean;
  /** "Still choosing: …" (the other characters with a pick waiting), or null */ still: string | null;
}

const W = () => survivalRun.reward_panel;
const andList = (l: string[]): string => (l.length < 2 ? l.join('') : l.slice(0, -1).join(', ') + ' and ' + l[l.length - 1]);

/** The reward panel's view for the player `me`, or null when the run is not waiting on rewards. */
export function rewardPanelView(g: GameState, me: string, v: RunViewV): RewardPanelV | null {
  const r = g.run; if (!r || r.state !== 'reward') return null;
  const n = r.note && r.note.node === r.at ? r.note : null;
  const fights = r.stats?.fights || [], f = fights.length ? fights[fights.length - 1] : null;
  const rec = f && f.node === r.at && f.outcome === 'win' ? f : null; // the fight won at this node (none at the vault's chest)
  const mineIds = Object.values(g.characters).filter((c) => c.owner === me).map((c) => c.id);
  const pay: RewardPayV[] = mineIds.map((id) => {
    const c = g.characters[id], paid = rec?.paid?.[id];
    return { charId: id, name: c.name,
      xp: paid ? paid.xp : n?.xp ?? null, credits: paid ? paid.credits : n?.credits ?? null,
      xpTotal: c.xp, level: c.level, creditsTotal: creditsOf(c), levelUp: levelUpDue(c),
      supply: [...(n?.ammo?.[id] || [])], back: !!n?.back?.includes(id) };
  });
  const offers = v.offers.filter((o) => o.mine), kits = v.kits.filter((k) => k.mine);
  const others = [...v.offers.filter((o) => !o.mine).map((o) => o.name), ...v.kits.filter((k) => !k.mine).map((k) => k.name)];
  const names = [...new Set(others)];
  const kicker = (rec && g.combat?.name) || v.note?.kicker || W().title, title = v.note?.title || W().title;
  return {
    key: (r.at || 'camp') + '#' + r.path.length + '#' + r.stage,
    kicker, title: sameWord(kicker, title) ? '' : title,
    pay, offers, kits, owe: offers.length + kits.length > 0,
    still: names.length ? W().still.replace('{names}', andList(names)) : null,
  };
}
/** The title says nothing the kicker does not (0.32 B9: "VAULT · STOP 9 OF 15 · vault"): the title is the kicker's first
 * word, its kind, in other case. */
const sameWord = (kicker: string, title: string): boolean => !!title && kicker.split(' · ')[0].trim().toLowerCase() === title.trim().toLowerCase();
/** The pay line's pieces (0.32 B9): the XP and the credits paid here, each only when paid; a dash alone when neither was
 * ("+702 credits" at a vault, never "– · +702 credits"). */
export function payPieces(p: Pick<RewardPayV, 'xp' | 'credits'>): { kind: 'xp' | 'credits' | 'none'; text: string }[] {
  const out: { kind: 'xp' | 'credits' | 'none'; text: string }[] = [];
  if (p.xp) out.push({ kind: 'xp', text: '+' + p.xp + ' ' + W().xp });
  if (p.credits) out.push({ kind: 'credits', text: '+' + p.credits + ' ' + W().credits.toLowerCase() });
  return out.length ? out : [{ kind: 'none', text: '–' }];
}
