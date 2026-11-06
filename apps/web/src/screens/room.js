// The Room: players, the squad, where the story starts, who narrates, and Start. Ported from room.logic.js,
// now reading the real room (players online, characters locked in) and the host's Narrator settings.
import { DCLogic } from '../dc/runtime';
import { D, IMG, lightboxVals, zoomer } from './shared';
import { STARTS, startsFor, startOf } from '../game/starts';
import { MODELS } from '../narrator/anthropic';
import { act, getState, go, leaveRoom, saveNow, setNarrator, toast } from '../game/store';
import { validateSheet } from '@engine';

const pill = (on) => 'min-height: 42px; padding: 0 16px; border-radius: 10px; font-family: inherit; font-weight: 600; cursor: pointer; ' + (on ? 'border: 1px solid #E7EBF3; background: #1C2536; color: #E7EBF3' : 'border: 1px solid #232D3F; background: transparent; color: #A3AEC2');

export class RoomLogic extends DCLogic {
  constructor(props) { super(props); this.state = { bring: false, copied: false }; }
  renderVals() {
    const st = getState(), g = st.game, isHost = st.role === 'host';
    if (!g) return { ...lightboxVals(this), code: st.code || '', connText: 'CONNECTING…', connStyle: 'font-size: 12px; color: #A3AEC2', players: [], squad: [], starts: [], start: { lore: [] }, modes: [], tones: [], notReady: true, startLabel: 'Waiting for the host…', startStyle: 'min-height: 52px; border-radius: 12px; border: 0; background: #1C2536; color: #A3AEC2', copyInvite: () => {}, copyLabel: 'Copy invite link', leave: () => leaveRoom(), create: () => {}, toggleBring: () => {}, saved: [], cantAdd: true };
    const S = g.settings, me = st.me.id, host = g.players.find((p) => p.id === g.hostId);
    const mine = Object.values(g.characters).filter((c) => c.owner === me);
    const players = [...g.players, ...Array(Math.max(0, 4 - g.players.length)).fill(null)].map((p) => {
      if (!p) return { name: 'Open seat', initials: '+', note: 'Share the room code', badgeStyle: 'display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; flex: none; font-size: 12px; font-weight: 700; border: 1px dashed #3B475D; color: #A3AEC2', style: 'display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 10px; background: #10151F; border: 1px solid #232D3F' };
      const n = Object.values(g.characters).filter((c) => c.owner === p.id).length;
      return { key: p.id, name: p.name + (p.id === me ? ' (you)' : ''), initials: p.initials, note: (p.id === g.hostId ? 'Host · ' : '') + (p.online ? (n ? 'Plays ' + n : 'Building a character') : 'Offline'),
        badgeStyle: 'display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; flex: none; font-size: 12px; font-weight: 700; background: ' + p.color + '; color: #0A0D13' + (p.online ? '' : '; opacity: 0.4'),
        style: 'display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 10px; background: #10151F; border: 1px solid ' + p.color };
    });
    const squad = Object.values(g.characters).map((c) => {
      const p = g.players.find((x) => x.id === c.owner) || { name: '?', initials: '?', color: '#A3AEC2' };
      const kit = (D.kits.find((k) => k.id === c.kit) || {}).name || '';
      return { key: c.id, name: c.name, img: c.portrait, hasImg: !!c.portrait, noImg: !c.portrait, zoom: zoomer(this, c.portrait, c.name, 'portrait'),
        line: [c.origin, kit, 'Level ' + c.level].filter(Boolean).join(' · '), owner: p.initials + ' · ' + p.name.toUpperCase(),
        ownerStyle: 'align-self: flex-start; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; background: ' + p.color + '; color: #0A0D13',
        state: '✓ LOCKED IN', stateStyle: 'font-size: 12px; font-weight: 700; letter-spacing: 0.12em; color: #6FEA77',
        canRemove: g.phase === 'lobby' && (c.owner === me || isHost), remove: () => act({ type: 'char/remove', charId: c.id }),
        style: 'display: flex; flex-direction: column; gap: 8px; padding: 14px; border-radius: 12px; background: #10151F; border: 1px solid #232D3F; border-left: 4px solid ' + p.color };
    });
    const st0 = startOf(g);
    const hostPick = (patch) => () => (isHost ? act({ type: 'settings', patch }) : toast('Only the host picks this.'));
    const starts = startsFor(g).map((x) => ({ short: x.short, pick: hostPick({ start: x.id }), pressed: S.start === x.id ? 'true' : 'false', style: pill(S.start === x.id) }));
    const startImg = IMG[st0.art] || IMG['world-pilot'];
    const start = { zoom: zoomer(this, startImg, st0.title + ' · ' + st0.artNote, 'world'), kicker: st0.kicker, title: st0.title, img: startImg, imgStyle: 'display: block; width: 100%; height: 300px; object-fit: cover; object-position: ' + st0.focus, artNote: st0.artNote, lore: st0.lore.map((text) => ({ text })), meta: st0.meta };
    const modes = [['ai', 'AI Narrator', 'Your own Anthropic key. Plays every start.'], ['human', "I'll narrate", 'Coming soon: a private Narrator screen.']].map(([id, name, desc]) => ({ name, desc, pick: id === 'human' ? () => toast('Human Narrator mode is coming soon. Use the AI Narrator for now.') : hostPick({ mode: id }), pressed: S.mode === id ? 'true' : 'false',
      style: 'display: flex; flex-direction: column; align-items: flex-start; gap: 4px; text-align: left; padding: 14px; border-radius: 12px; font-family: inherit; color: #E7EBF3; cursor: pointer; ' + (S.mode === id ? 'border: 1px solid #E7EBF3; background: #1C2536' : 'border: 1px solid #232D3F; background: #10151F' + (id === 'human' ? '; opacity: 0.6' : '')) }));
    const tones = ['Grim', 'Pulp', 'Literary'].map((t) => ({ name: t, pick: hostPick({ tone: t }), pressed: S.tone === t ? 'true' : 'false', style: pill(S.tone === t) }));
    // Start: host only, at least one locked-in character, and (AI) a key.
    const offline = g.players.filter((p) => p.online && !Object.values(g.characters).some((c) => c.owner === p.id) && p.id !== g.hostId);
    const why = !isHost ? 'Waiting for ' + (host?.name || 'the host') + ' to start'
      : g.phase !== 'lobby' ? 'In session' : !squad.length ? 'Lock in a character to start'
      : !st.narrator.key && !st.narrator.scripted ? 'Add your Anthropic API key to start' : null;
    const notReady = !!why;
    const lib = st.library.filter((c) => !c.draft && !validateSheet(c));
    const model = MODELS.find((m) => m.id === st.narrator.model) || MODELS[0];
    return {
      ...lightboxVals(this), code: g.code, connText: st.conn === 'online' ? '● ONLINE' : st.conn === 'host-away' ? '● HOST AWAY' : '● RECONNECTING',
      connStyle: 'font-size: 12px; font-weight: 700; letter-spacing: 0.1em; color: ' + (st.conn === 'online' ? '#6FEA77' : '#FFFFFF'),
      copyLabel: this.state.copied ? 'Copied ✓' : 'Copy invite link',
      copyInvite: () => { const url = location.origin + '/?room=' + g.code; navigator.clipboard?.writeText(url).then(() => { this.setState({ copied: true }); setTimeout(() => this.setState({ copied: false }), 2000); }, () => toast('Invite link: ' + url)); },
      canLoad: isHost && g.phase === 'lobby', loadCampaign: (e) => { const f = e.target.files && e.target.files[0]; if (!f) return;
        f.text().then((t) => { let c; try { c = JSON.parse(t); } catch { return toast('That file is not JSON.'); } act({ type: 'campaign/load', campaign: c }); e.target.value = ''; }); },
      leave: () => leaveRoom(), leaveLabel: isHost ? 'Save and leave' : 'Leave', leaveTitle: 'Back to the title screen. Resume this room any time from Saved sessions.',
      isHost, save: () => saveNow(), saveLabel: st.savedAt && Date.now() - st.savedAt < 4000 ? 'Saved ✓' : 'Save',
      saveTitle: 'The game also saves itself after every action, in this browser and on the room server.',
      inSession: g.phase !== 'lobby', backToSession: () => go(g.phase === 'combat' ? 'combat' : 'main'),
      players, squad, starts, start, modes, isAI: S.mode === 'ai', isHuman: S.mode === 'human', hostAI: S.mode === 'ai' && isHost, guestAI: S.mode === 'ai' && !isHost, hostName: host?.name || 'The host', tones,
      create: () => go('create', { draft: null }), cantAdd: g.phase !== 'lobby' || mine.length >= 2,
      toggleBring: () => this.setState({ bring: !this.state.bring }), bringOpen: this.state.bring, noSaved: !lib.length,
      saved: lib.map((c) => ({ key: c.name, name: c.name, img: c.portrait, line: c.origin, bring: () => { const { savedAt, draft, ...sheet } = c; act({ type: 'char/add', sheet }); this.setState({ bring: false }); } })),
      key: st.narrator.key, onKey: (e) => setNarrator({ key: e.target.value.trim() }), remember: st.narrator.remember, onRemember: (e) => setNarrator({ remember: e.target.checked }),
      models: MODELS.map((m) => ({ id: m.id, label: m.label + ' · $' + m.input + ' / $' + m.output + ' per M tokens' })), model: st.narrator.model, onModel: (e) => setNarrator({ model: e.target.value }),
      effort: st.narrator.effort, onEffort: (e) => setNarrator({ effort: e.target.value }),
      costNote: 'Estimated cost with ' + model.label + ': about $' + (model.input <= 0.1 ? '0.40' : model.input <= 2 ? '5' : model.input <= 4 ? '10' : '25') + ' per 3-hour session for the whole room.',
      notReady, startLabel: why || (g.players.length > 1 && offline.length ? 'Start session · ' + offline.map((p) => p.name).join(', ') + ' has no character yet' : 'Start session'),
      startSession: () => act({ type: 'session/start' }),
      startStyle: 'min-height: 52px; border-radius: 12px; border: 0; font-family: inherit; font-size: 15px; font-weight: 700; ' + (notReady ? 'background: #1C2536; color: #A3AEC2' : 'background: #6FEA77; color: #0A0D13; cursor: pointer'),
    };
  }
}
