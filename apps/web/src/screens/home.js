// Title screen: name, host or join a room, resume, and the character library (new; the prototypes had none).
import { DCLogic } from '../dc/runtime';
import { D, IMG } from './shared';
import { getState, go, hostRoom, joinRoom, lastRoom, removeFromLibrary, resumeRoom, setName } from '../game/store';

export class HomeLogic extends DCLogic {
  constructor(props) { super(props); this.state = { code: (new URLSearchParams(location.search).get('room') || '').toUpperCase().slice(0, 6) }; }
  renderVals() {
    const st = getState(), last = lastRoom();
    const kitName = (k) => (D.kits.find((x) => x.id === k) || {}).name || 'no kit';
    return {
      mark: IMG['wick-welcome'], seal: IMG['emblem-ahoc-seal'],
      name: st.me.name, onName: (e) => setName(e.target.value),
      code: this.state.code, onCode: (e) => this.setState({ code: e.target.value.toUpperCase() }),
      host: () => hostRoom(), join: () => joinRoom(this.state.code),
      hasLast: !!last, lastCode: last?.code || '', lastRole: last?.role === 'host' ? 'You host this room.' : 'You joined this room.', resume: () => resumeRoom(),
      create: () => go('create', { draft: null }),
      libCount: st.library.length, noLib: !st.library.length,
      lib: st.library.map((c) => ({ key: c.name, name: c.name + (c.draft ? ' (draft)' : ''), img: c.portrait, line: [c.origin || 'no origin', kitName(c.kit)].join(' · '),
        edit: () => go('create', { draft: c }), del: () => { if (confirm('Delete ' + c.name + ' from this browser?')) removeFromLibrary(c.name); } })),
    };
  }
}
