// The Narrator-side brief lines (lane G, plan 4.3) for items whose own lane has written none: the Narrator-ruled
// remainder of each perk, trait and class move with an explicit Narrator part, in about 15 words. characterBrief prints
// it after the item's id and "*"; the full text stays one wiki_lookup away. A lane's own brief() always wins: this file
// registers a line only for items that have none when it runs, and a later lane's brief replaces it (register() merges,
// and the later brief wins). Items whose only Narrator part is effects nobody runs yet get no line here: their lanes
// close those gaps, and until then the "*" and the wiki cover them.
import { register, handlerOf, itemKey } from '../effects';

/** id (a perk or trait id, or "<classId>.<moveId>") → its brief line. Keep them short, in-world, judgement only. */
export const BRIEFS: Record<string, string> = {
  // traits (lane H's items, until it writes its own)
  bottle_butts_for_eyes: 'rain, smoke or a grapple can knock the glasses off; enemies may aim at them',
  the_mask: 'people who met them masked don\'t know them unmasked, and the other way round',
  machine_faced: 'robots and machines treat them as one of their own; children and animals panic',
  oil_in_my_mind: 'reads any artwork or designed object: who made it, how, and where from',
  oil_in_my_soul: 'reads any artwork: the maker\'s emotional state and intent',
  worldline_fracture: 'if the whole squad has it, impossible events replace the area\'s normal ones',
  symbol_of_order: 'once a scene, invoking law or rank: an official answers one question truthfully',
  insomniac: 'takes a watch with no penalty; never ambushed while the squad rests',
  wanted: 'bounty hunters turn up when you decide; Central City officials start hostile',
  company_man: 'RTC sends jobs they can\'t refuse; once a campaign RTC extracts them from anywhere',
  inner_ring_heir: 'one family favour a session; the house\'s enemies know them; summons can\'t be refused',
  occultist: 'once a session a creature\'s weakness; wards take 10 minutes; the book whispers one false line',
  ace_pilot: 'drives or pilots anything with an engine',
  market_blood: 'touching an item tells its true value and whether it\'s fake',
  // class moves (lanes I, J and K, until they write their own)
  'trickster.rewrite': 'the opposite of an exotic buff is yours to pick',
  'hexer.puppet': 'what counts as the puppet harming itself is yours to rule',
  'rtc_contractor.strike_call': 'no strike where the Company has no signal',
  'rtc_contractor.extraction': 'where the flyer can land, and what follows',
  'circuit_mage.fusion': 'a Fusion seen by the world risks the Knowing: does a Celestial take interest?',
};

for (const [id, line] of Object.entries(BRIEFS)) {
  const key = itemKey(id, id.includes('.') ? 'class' : undefined);
  if (handlerOf(key)?.brief) continue; // the item's own lane wrote one
  register({ id, ...(id.includes('.') ? { kind: 'class' as const } : {}), brief: () => line });
}
