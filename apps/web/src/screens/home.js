// Title screen: name, host or join a room, resume, and the character library (new; the prototypes had none).
import { DCLogic } from '../dc/runtime';
import { D, IMG } from './shared';
import { forgetSession, getState, go, hostRoom, joinRoom, lastRoom, listSessions, removeFromLibrary, resumeSession, setName } from '../game/store';

const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };

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
      sessions: listSessions().map((x) => { const on = last?.code === x.code;
        return { key: x.code, code: 'ROOM ' + x.code, title: x.title, line: [x.chars || 'no characters yet', x.players].filter(Boolean).join(' · '),
          meta: (x.role === 'host' ? 'YOU HOST · SAVED IN THIS BROWSER' : 'YOU JOINED · THE HOST KEEPS THE SAVE') + ' · ' + (x.phase === 'lobby' ? 'LOBBY' : x.phase === 'combat' ? 'IN A FIGHT' : 'ROUND ' + x.round) + ' · ' + ago(x.savedAt).toUpperCase(),
          active: on, badge: on ? 'ACTIVE' : '', resume: () => resumeSession(x.code), resumeLabel: on ? 'Continue ›' : 'Resume ›',
          forget: () => { if (confirm('Remove room ' + x.code + ' from this list?' + (x.role === 'host' ? ' This deletes the save in this browser.' : ''))) forgetSession(x.code); },
          style: 'display: flex; gap: 12px; align-items: center; flex-wrap: wrap; padding: 12px 14px; border-radius: 12px; background: #10151F; border: 1px solid ' + (on ? '#FFFFFF' : '#232D3F') }; }),
      noSessions: !listSessions().length,
      create: () => go('create', { draft: null }),
      libCount: st.library.length, noLib: !st.library.length,
      lib: st.library.map((c) => ({ key: c.name, name: c.name + (c.draft ? ' (draft)' : ''), img: c.portrait, line: [c.origin || 'no origin', kitName(c.kit)].join(' · '),
        edit: () => go('create', { draft: c }), del: () => { if (confirm('Delete ' + c.name + ' from this browser?')) removeFromLibrary(c.name); } })),
    };
  }
}
