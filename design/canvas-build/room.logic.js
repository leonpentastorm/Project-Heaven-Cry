const D = __DATA__;
const pill = (on) => 'min-height: 42px; padding: 0 16px; border-radius: 10px; font-family: inherit; font-weight: 600; cursor: pointer; ' + (on ? 'border: 1px solid #E7EBF3; background: #1C2536; color: #E7EBF3' : 'border: 1px solid #232D3F; background: transparent; color: #A3AEC2');
// Player colours mark ownership only; always shown with the player's initials (colour-system.md, "Players").
const PLAYERS = [['leon', 'Leon', 'LE', '#7FD4FF', 'Host · plays 2'], ['guest1', 'Mai', 'MA', '#FF9EC7', 'Plays 1'], ['guest2', 'Tuan', 'TU', '#B8E986', 'Building a character'], ['open', 'Open seat', '+', '#3B475D', 'Invite someone']];
const PC = {}; PLAYERS.forEach((p) => { PC[p[0]] = p; });
const STARTS = [
  ['m813', 'M813', 'M813 · ONE-SHOT · 2–3 SESSIONS', 'The Last Ship Out', 'center 45%', 'Outpost-813: the rear landing pad under B813',
    ['27 July 4084, Central City reckoning. Regiment 093 of the Thousand World Legion has met its quota on M813 and is pulling out. The Colonel has ordered a hundred infantry robots and twenty medic robots to hold the line.',
     'Five squads hold it. What\'s left of them walks back to the rear pad, where one ship is still loading, and its hold is full of platinum.'], 'You play the 258th Medical Unit\'s robots. Starts on the rear pad.'],
  ['godplot', 'A god-plot', 'EARTH SECTOR · CAMPAIGN START', 'A God-Plot on a Mining World', 'center 70%', 'Placeholder art',
    ['A Celestial once played god on a Thousand-Planet extraction world, then got bored and left. The plot didn\'t. The shrine still demands worship at every shift change, and the miners have started to give it.',
     'The quota is due in nine days. The local Anti-Heaven chapter wants the shrine quiet before anyone counts the missing.'], 'Centre vs frontier, saints vs demons.'],
  ['curse', 'The lifted town', 'EARTH SECTOR · CAMPAIGN START', 'The Town Where the Curse Is Lifted', 'left 40%', 'Placeholder art',
    ['Inside one Crawler town\'s walls, every human sees the Crawlers as people: children, grandmothers, a baker with too many hands to be anything but kind. Nobody knows which Celestial did it, or why.',
     'Outside the walls, the Hellraisers are coming, and they still see monsters.'], 'Curse vs love.'],
  ['summoning', 'A summoning', 'EARTH SECTOR · CAMPAIGN START', 'A Summoning in Central City', 'right 50%', 'Placeholder art',
    ['Someone in Central City\'s inner ring summoned a Celestial on purpose. It came. It is still here, in a penthouse, ordering room service and asking questions about the Progenitors.',
     'The headquarters chapter wants it buried before anyone learns what it is, or what it already knows.'], 'Every tension at once.'],
  ['own', 'Narrator\'s own', 'EARTH SECTOR · CUSTOM', 'The Narrator\'s Own Start', 'center', 'Placeholder art',
    ['The Narrator writes the first scene. Start from a Celestial\'s mess, let a local Anti-Heaven chapter answer it, and see which tension it lands on.'], 'Uses the Sector sheet and chapter template.'],
];

class Component extends DCLogic {
  constructor(props) { super(props); this.state = { mode: 'ai', tone: 'Grim', start: 'm813' }; }

  renderVals() {
    const S = this.state;
    const players = PLAYERS.map(([id, name, initials, color, note]) => ({ name, initials, note,
      badgeStyle: 'display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; flex: none; font-size: 12px; font-weight: 700; ' + (id === 'open' ? 'border: 1px dashed #3B475D; color: #A3AEC2' : 'background: ' + color + '; color: #0A0D13'),
      style: 'display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 10px; background: #10151F; border: 1px solid ' + (id === 'open' ? '#232D3F' : color) }));
    const squad = [
      { owner: 'leon', name: 'MPAT', img: D.pc, line: 'Robot · Thousand-Planet frontier · Field Medic preset', locked: true },
      { owner: 'leon', name: '4-Ten', img: null, line: 'Robot · Thousand-Planet frontier · Bulwark preset · second character', locked: true },
      { owner: 'guest1', name: 'Ninety-Two', img: D.p2, line: 'Robot · Thousand-Planet frontier · Bodyguard preset', locked: true },
      { owner: 'guest2', name: 'Drava Keel', img: D.p3, line: 'Human · Mandestra and the trade lanes', locked: false },
    ].map((c) => { const p = PC[c.owner]; return { ...c, hasImg: !!c.img, noImg: !c.img, img: c.img || '', owner: p[2] + ' · ' + p[1].toUpperCase(),
      ownerStyle: 'align-self: flex-start; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; background: ' + p[3] + '; color: #0A0D13',
      state: c.locked ? '✓ LOCKED IN' : '◆ STILL BUILDING', stateStyle: 'font-size: 12px; font-weight: 700; letter-spacing: 0.12em; color: ' + (c.locked ? '#6FEA77' : '#FFFFFF'),
      style: 'display: flex; flex-direction: column; gap: 8px; padding: 14px; border-radius: 12px; background: #10151F; border: 1px solid #232D3F; border-left: 4px solid ' + p[3] }; });
    const st = STARTS.find((x) => x[0] === S.start);
    const starts = STARTS.map(([id, short]) => ({ short, pick: () => this.setState({ start: id }), pressed: S.start === id ? 'true' : 'false', style: pill(S.start === id) }));
    const start = { kicker: st[2], title: st[3], img: st[0] === 'm813' ? D.outpost : D.pilot, imgStyle: 'display: block; width: 100%; height: 300px; object-fit: cover; object-position: ' + st[4], artNote: st[5], lore: st[6].map((text) => ({ text })), meta: st[7] };
    const modes = [['ai', 'AI Narrator', 'Bring your own key, any provider.'], ['human', "I'll narrate", 'A private Narrator screen.']].map(([id, name, desc]) => ({ name, desc, pick: () => this.setState({ mode: id }), pressed: S.mode === id ? 'true' : 'false',
      style: 'display: flex; flex-direction: column; align-items: flex-start; gap: 4px; text-align: left; padding: 14px; border-radius: 12px; font-family: inherit; color: #E7EBF3; cursor: pointer; ' + (S.mode === id ? 'border: 1px solid #E7EBF3; background: #1C2536' : 'border: 1px solid #232D3F; background: #10151F') }));
    const tones = ['Grim', 'Pulp', 'Literary'].map((t) => ({ name: t, pick: () => this.setState({ tone: t }), pressed: S.tone === t ? 'true' : 'false', style: pill(S.tone === t) }));
    const notReady = true;
    return { players, squad, starts, start, modes, isAI: S.mode === 'ai', isHuman: S.mode === 'human', tones, notReady,
      startLabel: 'Start session · waiting for Tuan to lock in Drava Keel',
      startStyle: 'min-height: 52px; border-radius: 12px; border: 0; font-family: inherit; font-size: 15px; font-weight: 700; ' + (notReady ? 'background: #1C2536; color: #A3AEC2' : 'background: #6FEA77; color: #0A0D13; cursor: pointer') };
  }
}
