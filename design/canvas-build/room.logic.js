const D = __DATA__;
const pill = (on) => 'min-height: 42px; padding: 0 16px; border-radius: 10px; font-family: inherit; font-weight: 600; cursor: pointer; ' + (on ? 'border: 1px solid #E7EBF3; background: #1C2536; color: #E7EBF3' : 'border: 1px solid #232D3F; background: transparent; color: #A3AEC2');

class Component extends DCLogic {
  constructor(props) { super(props); this.state = { mode: 'ai', tone: 'Grim', seat3: false }; }

  renderVals() {
    const S = this.state;
    const seats = [
      { n: 1, player: 'LEON (HOST)', name: 'MPAT', img: D.pc, line: 'Robot · Thousand-Planet frontier · Field Medic preset', locked: true },
      { n: 2, player: 'GUEST', name: 'Ninety-Two', img: D.p2, line: 'Robot · Thousand-Planet frontier · Bulwark preset', locked: true },
      { n: 3, player: 'GUEST', name: 'Drava Keel', img: D.p3, line: 'Human · Mandestra and the trade lanes', locked: false },
      { n: 4 },
    ].map((s) => ({ ...s, filled: !!s.name, empty: !s.name, state: s.locked ? '✓ LOCKED IN' : '◆ STILL BUILDING',
      stateStyle: 'font-size: 12px; font-weight: 700; letter-spacing: 0.12em; color: ' + (s.locked ? '#6FEA77' : '#FFFFFF'),
      style: 'display: flex; flex-direction: column; gap: 10px; padding: 16px; border-radius: 12px; background: #10151F; border: 1px solid ' + (s.name ? (s.locked ? '#232D3F' : '#FFFFFF') : '#232D3F') }));
    const modes = [['ai', 'AI Narrator', 'Bring your own key, any provider.'], ['human', "I'll narrate", 'A private Narrator screen.']].map(([id, name, desc]) => ({ name, desc, pick: () => this.setState({ mode: id }), pressed: S.mode === id ? 'true' : 'false',
      style: 'display: flex; flex-direction: column; align-items: flex-start; gap: 4px; text-align: left; padding: 14px; border-radius: 12px; font-family: inherit; color: #E7EBF3; cursor: pointer; ' + (S.mode === id ? 'border: 1px solid #E7EBF3; background: #1C2536' : 'border: 1px solid #232D3F; background: #10151F') }));
    const tones = ['Grim', 'Pulp', 'Literary'].map((t) => ({ name: t, pick: () => this.setState({ tone: t }), pressed: S.tone === t ? 'true' : 'false', style: pill(S.tone === t) }));
    const notReady = true;
    return { seats, modes, isAI: S.mode === 'ai', isHuman: S.mode === 'human', tones, notReady,
      startLabel: 'Start session · waiting for Drava Keel to lock in',
      startStyle: 'min-height: 52px; border-radius: 12px; border: 0; font-family: inherit; font-size: 15px; font-weight: 700; ' + (notReady ? 'background: #1C2536; color: #A3AEC2' : 'background: #6FEA77; color: #0A0D13; cursor: pointer') };
  }
}
