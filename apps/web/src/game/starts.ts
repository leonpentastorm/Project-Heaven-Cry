// Campaign starts offered in the Room (from the Room prototype). The AI Narrator plays any of them from the premise.
export interface Start { id: string; short: string; kicker: string; title: string; focus: string; artNote: string; lore: string[]; meta: string }
export const STARTS: Start[] = [
  { id: 'm813', short: 'M813', kicker: 'M813 · ONE-SHOT · 2–3 SESSIONS', title: 'The Last Ship Out', focus: 'center 45%', artNote: 'Outpost-813: the rear landing pad under B813',
    lore: ['27 July 4084, Central City reckoning. Regiment 093 of the Thousand World Legion has met its quota on M813 and is pulling out. The Colonel has ordered a hundred infantry robots and twenty medic robots to hold the line.',
      'Five squads hold it. What\'s left of them walks back to the rear pad, where one ship is still loading, and its hold is full of platinum.'], meta: 'You play the 258th Medical Unit\'s robots. Starts on the rear pad.' },
  { id: 'godplot', short: 'A god-plot', kicker: 'EARTH SECTOR · CAMPAIGN START', title: 'A God-Plot on a Mining World', focus: 'center 70%', artNote: 'Placeholder art',
    lore: ['A Celestial once played god on a Thousand-Planet extraction world, then got bored and left. The plot didn\'t. The shrine still demands worship at every shift change, and the miners have started to give it.',
      'The quota is due in nine days. The local Anti-Heaven chapter wants the shrine quiet before anyone counts the missing.'], meta: 'Centre vs frontier, saints vs demons.' },
  { id: 'curse', short: 'The lifted town', kicker: 'EARTH SECTOR · CAMPAIGN START', title: 'The Town Where the Curse Is Lifted', focus: 'left 40%', artNote: 'Placeholder art',
    lore: ['Inside one Crawler town\'s walls, every human sees the Crawlers as people: children, grandmothers, a baker with too many hands to be anything but kind. Nobody knows which Celestial did it, or why.',
      'Outside the walls, the Hellraisers are coming, and they still see monsters.'], meta: 'Curse vs love.' },
  { id: 'summoning', short: 'A summoning', kicker: 'EARTH SECTOR · CAMPAIGN START', title: 'A Summoning in Central City', focus: 'right 50%', artNote: 'Placeholder art',
    lore: ['Someone in Central City\'s inner ring summoned a Celestial on purpose. It came. It is still here, in a penthouse, ordering room service and asking questions about the Progenitors.',
      'The headquarters chapter wants it buried before anyone learns what it is, or what it already knows.'], meta: 'Every tension at once.' },
  { id: 'own', short: 'Narrator\'s own', kicker: 'EARTH SECTOR · CUSTOM', title: 'The Narrator\'s Own Start', focus: 'center', artNote: 'Placeholder art',
    lore: ['The Narrator writes the first scene. Start from a Celestial\'s mess, let a local Anti-Heaven chapter answer it, and see which tension it lands on.'], meta: 'Uses the Sector sheet and chapter template.' },
];
