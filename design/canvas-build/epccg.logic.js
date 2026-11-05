// EPCCG "?" pop-up, shared by Create, Main and LevelUp. build.py inlines this file at /*EPCCG*/.
// Each skill in D.skills carries `ep` (data/skills.json `epccg`, plus the First-Patch Revival portrait blob).
const EP_SLOT = { alpha: 'α', beta: 'β', gamma: 'γ' };
const EP_ATTR = {}; D.attrs.forEach((a) => { EP_ATTR[a.id] = a; });
const EP_BLANK = { zoom: () => {}, title: '', kicker: '', name: '', line: '', img: '', alt: '', pictured: '', caption: '', speaker: '', intro: '', note: '', quote: [], rows: [], boxStyle: '', nameStyle: '', quoteStyle: '' };
// The "?" button that opens a skill's entry. `ink` is the attribute's UI ink.
const epBtnStyle = (ink, extra) => 'display: grid; place-items: center; width: 28px; height: 28px; flex: none; padding: 0; border-radius: 50%; border: 1px solid ' + ink + '; background: rgba(10, 13, 19, 0.85); color: ' + ink + '; font-family: inherit; font-size: 14px; font-weight: 700; line-height: 1; cursor: pointer' + (extra ? '; ' + extra : '');
function epccgVals(self) {
  const id = self.state.epccg, s = id && D.skills.find((x) => x.id === id);
  const closeEpccg = () => self.setState({ epccg: null });
  if (!s) return { epOpen: false, ep: EP_BLANK, closeEpccg };
  const e = s.ep, a = EP_ATTR[s.attr], ink = a.ink;
  const same = e.speaker.indexOf(e.portrait.split(' ').slice(-1)[0]) >= 0;
  return { epOpen: true, closeEpccg, ep: {
    title: s.name + ': EPCCG entry', kicker: 'EPCCG · ARTICLE 5 · ENTRY ' + String(e.entry).padStart(2, '0'),
    name: s.name, line: EP_SLOT[s.slot] + ' skill of ' + a.name + ' · ' + s.core.charAt(0).toUpperCase() + s.core.slice(1),
    img: e.img, zoom: zoomer(self, e.img, e.portrait, 'portrait'), alt: e.portrait + ', First-Patch Revival portrait for ' + s.name, pictured: e.portrait,
    caption: same ? 'Speaks for ' + s.name + ' in the EPCCG.' : 'The one these words are about. Words by ' + e.speaker + '.',
    quote: e.quote.map((t) => { const stage = /^\*.*\*$/.test(t); return { text: stage ? t.slice(1, -1) : t.replace(/\*/g, ''),
      style: 'margin: 0; font-family: \'Spectral\', serif; line-height: 1.55; ' + (stage ? 'font-size: 14px; color: #A3AEC2; letter-spacing: 0.04em' : 'font-size: 17px; font-style: italic; color: #E7EBF3') }; }),
    speaker: '— ' + e.speaker, intro: e.intro,
    rows: [['EFFECT', e.effect], ['AT HIGH LEVELS', e.high], ['GOOD FOR', e.good], ['BAD FOR', e.bad]].filter((r) => r[1]).map(([k, v]) => ({ k, v: v.charAt(0).toUpperCase() + v.slice(1) })),
    note: 'From the EPCCG, the Anti-Heaven Operations Command\'s own guide (2020 text). The effect line is the Command\'s wording; the rules on the sheet are what the engine uses.',
    boxStyle: 'width: min(960px, 100%); max-height: calc(100vh - 40px); overflow-y: auto; box-sizing: border-box; display: flex; flex-direction: column; gap: 18px; padding: 22px 24px; border-radius: 16px; background: #10151F; border: 1px solid #232D3F; border-top: 4px solid ' + ink,
    nameStyle: 'margin: 0; font-family: \'Spectral\', serif; font-size: 32px; font-weight: 600; color: ' + ink,
    quoteStyle: 'margin: 0; display: flex; flex-direction: column; gap: 8px; padding: 4px 0 4px 16px; border-left: 3px solid ' + ink,
  } };
}
