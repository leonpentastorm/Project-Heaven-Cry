// The Room: players, the squad, where the story starts, who narrates, and Start. Ported from room.logic.js,
// now reading the real room (players online, characters locked in) and the host's Narrator settings.
import { DCLogic } from '../dc/runtime';
import { D, IMG, lightboxVals, zoomer, closeAnim } from './shared';
import { ART, ART_BIG } from './shared';
import { STARTS, startsFor, startOf } from '../game/starts';
import { MODELS } from '../narrator/anthropic';
import { PROVIDERS, providerInfo, keyMismatch, notReadyReason, isPriced, listModels, testKey, baseOf } from '../narrator/providers';
import { act, getState, go, retryNarrator, setNarrator, toast, homeScreen } from '../game/store';
import { shellVals } from './shell';
import { openReport } from '../game/report';
import { importCharacter } from '../game/charfile';
import { validateSheet, CLASS } from '@engine';
import { openProvingGround } from '../game/sandbox';
import { classOf } from '../game/commands';
import { modeCards, radioKey, narratorOptional, startsRun, testSeed } from '../game/modes';
import { openTipOn } from '../game/actionTip';
import { modeOf, playOf, runRetireProblem } from '@engine';

const pill = (on) => 'min-height: 42px; padding: 0 16px; border-radius: 10px; font-family: inherit; font-weight: 600; cursor: pointer; ' + (on ? 'border: 1px solid #E7EBF3; background: #1C2536; color: #E7EBF3' : 'border: 1px solid #232D3F; background: transparent; color: #A3AEC2');

export class RoomLogic extends DCLogic {
  constructor(props) {
    super(props); this.state = { narrOpen: false, bring: false, copied: false, loaded: null, loading: false, loadNote: '', keySaved: false, keyChanged: false, testing: false, test: null };
    // Arriving from the Narrator chip's "Change key": scroll to the Narrator box and put the cursor in the key.
    if (getState().roomFocus === 'narrator') setTimeout(() => {
      go('room', { roomFocus: null });
      const box = document.querySelector('aside[aria-label="Narrator"]'), key = document.querySelector('input[data-narrator-key]');
      if (box && box.scrollIntoView) box.scrollIntoView({ block: 'start', behavior: 'smooth' });
      if (key) key.focus({ preventScroll: true });
    }, 120);
  }
  /** A Narrator setting changed (UI pass 2.2): say so once the typing stops, and forget an old test result. */
  noteChange() {
    clearTimeout(this._keyT); this.setState({ keySaved: false, keyChanged: true, test: null });
    this._keyT = setTimeout(() => this.setState({ keySaved: true }), 400);
  }
  /** Test key: the service's models list (no tokens spent). */
  testKey() {
    const n = getState().narrator, at = n.provider + '|' + n.key + '|' + n.baseUrl;
    this.setState({ testing: true, test: null });
    testKey(n).then((r) => { const m = getState().narrator; if (m.provider + '|' + m.key + '|' + m.baseUrl !== at) return this.setState({ testing: false }); this.setState({ testing: false, test: r }); });
  }
  /** Back to the session (the big button and the header's): say so when the Narrator's settings changed here. */
  backToSession(g) {
    if (this.state.keyChanged && getState().role === 'host' && g.settings.mode === 'ai') toast('Narrator settings updated: used from its next turn.', true);
    go(homeScreen(g));
  }
  /** "Load models": ask the picked service which models this key can use. */
  loadModels() {
    const n = getState().narrator, p = providerInfo(n.provider), at = p.id + '|' + n.baseUrl;
    this.setState({ loading: true, loadNote: 'Asking ' + p.label + '…' });
    listModels(n).then((ids) => {
      if (providerInfo(getState().narrator.provider).id + '|' + getState().narrator.baseUrl !== at) return;
      this.setState({ loading: false, loaded: { at, ids }, loadNote: ids.length ? ids.length + ' models · type to filter, or pick one' : 'The service listed no models: type the model name it shows.' });
      if (ids.length && !getState().narrator.model) setNarrator({ model: ids[0] });
    }, (e) => this.setState({ loading: false, loadNote: String((e && e.message) || e) }));
  }
  /** Under the key (UI pass 2.2): that it is saved and when it is used, Test key, and Retry now when stuck. */
  keyVals(g, isHost) {
    const st = getState(), n = st.narrator, S = this.state, inSession = g.phase !== 'lobby', T = S.test;
    return {
      keySavedShow: !!S.keySaved && S.keyChanged,
      keySavedText: '✓ Saved for this session' + (inSession ? ' · the Narrator uses it from its next turn.' : ' · used when the session starts.'),
      rememberNote: !!n.key && !n.remember ? 'Not remembered in this browser: tick "Remember the key" to keep it after you close the tab.' : '',
      testKey: () => this.testKey(), testOff: S.testing || (providerInfo(n.provider).needsKey && !n.key) || (providerInfo(n.provider).editableBase && !baseOf(n)), testLabel: S.testing ? 'Testing…' : 'Test key',
      testShow: !!T || S.testing, testText: S.testing ? 'Asking ' + providerInfo(n.provider).label.replace(/ \(.*\)$/, '') + '…' : T ? (T.ok ? '✓ ' : '✗ ') + T.text : '',
      testStyle: 'font-size: 13px; line-height: 1.45; color: ' + (S.testing ? '#A3AEC2' : T && T.ok ? '#6FEA77' : '#F65157'),
      retryNow: isHost && inSession && !!(g.narrator && g.narrator.error) && S.keyChanged,
      retryNarr: () => { retryNarrator(); this.backToSession(g); },
    };
  }
  /** The Narrator settings (host, AI mode): which service, its address, the key, the model. */
  narratorVals() {
    const n = getState().narrator, p = providerInfo(n.provider), anth = p.id === 'anthropic';
    const mis = keyMismatch(p.id, n.key), loaded = this.state.loaded && this.state.loaded.at === p.id + '|' + n.baseUrl ? this.state.loaded.ids : null;
    const model = MODELS.find((m) => m.id === n.model) || MODELS[0];
    return {
      provider: p.id, providers: PROVIDERS.map((x) => ({ id: x.id, label: x.label })),
      onProvider: (e) => { this.setState({ loaded: null, loadNote: '' }); setNarrator({ provider: e.target.value }); this.noteChange(); },
      editableBase: p.editableBase, baseUrl: n.baseUrl, basePlaceholder: p.baseUrl || 'https://… (from the site, usually ending in /v1)',
      onBase: (e) => { this.setState({ loaded: null, loadNote: '' }); setNarrator({ baseUrl: e.target.value.trim() }); this.noteChange(); },
      keyLabel: p.needsKey ? 'API KEY' : 'API KEY (OPTIONAL)', keyPlaceholder: p.keyPlaceholder,
      keyHint: mis ? mis.text + ' Switch to ' + providerInfo(mis.to).label + '?' : '', switchLabel: mis ? 'Use ' + providerInfo(mis.to).label : '',
      switchToGuess: () => { if (mis) { this.setState({ loaded: null, loadNote: '' }); setNarrator({ provider: mis.to, key: n.key }); } },
      modelPick: anth, modelFree: !anth, models: MODELS.map((m) => ({ id: m.id, label: m.label + ' · $' + m.input + ' / $' + m.output + ' per M tokens' })), model: n.model,
      onModel: (e) => { setNarrator({ model: e.target.value }); this.noteChange(); }, onModelText: (e) => { setNarrator({ model: e.target.value.trim() }); this.noteChange(); },
      modelPlaceholder: p.modelPlaceholder, modelSuggest: (loaded || p.suggest).map((id) => ({ key: id, id })),
      loadModels: () => this.loadModels(), loadDisabled: this.state.loading || (p.needsKey && !n.key) || (p.editableBase && !n.baseUrl && !p.baseUrl),
      loadLabel: this.state.loading ? 'Loading…' : 'Load models', loadNote: this.state.loadNote || (p.needsKey && !n.key ? 'Add the key first, then load the models it can use.' : ''),
      showEffort: p.format === 'anthropic', effort: n.effort, onEffort: (e) => setNarrator({ effort: e.target.value }),
      privacyNote: p.id === 'ollama' ? 'Nothing leaves your computer.' : 'The key stays in this browser and goes only to ' + (p.editableBase ? 'the address above' : p.label.replace(/ \(.*\)$/, '')) + '.',
      providerNote: p.note,
      costNote: isPriced(n) ? 'Estimated cost with ' + model.label + ': about $' + (model.input <= 0.1 ? '0.40' : model.input <= 2 ? '5' : model.input <= 4 ? '10' : '25') + ' per 3-hour session for the whole room.'
        : 'The spend meter counts tokens; the service bills you.',
    };
  }
  renderVals() {
    const st = getState(), g = st.game, isHost = st.role === 'host';
    if (!g) return { ...lightboxVals(this), ...shellVals(this, 'room'), report: openReport, code: st.code || '', connText: 'CONNECTING…', connStyle: 'font-size: 12px; color: #A3AEC2', players: [], squad: [], starts: [], start: { lore: [] }, modes: [], modeCards: [], showModes: false, narrOpen: true, tones: [], notReady: true, startLabel: 'Waiting for the host…', startStyle: 'min-height: 52px; border-radius: 12px; border: 0; background: #1C2536; color: #A3AEC2', copyInvite: () => {}, copyLabel: 'Copy invite link', create: () => {}, toggleBring: () => {}, saved: [], cantAdd: true };
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
      // The class, not the starting kit: classes are earned at level 3 (a kit is only gear).
      const cls = classOf(c), kit = cls ? cls.name : 'Classless';
      return { key: c.id, name: c.name, img: c.portrait, hasImg: !!c.portrait, noImg: !c.portrait, zoom: zoomer(this, c.portrait, c.name, 'portrait'),
        line: [c.origin, kit, 'Level ' + c.level].filter(Boolean).join(' · '), hasCls: !!cls, clsIcon: cls ? cls.icon : '', owner: p.initials + ' · ' + p.name.toUpperCase(),
        ownerStyle: 'align-self: flex-start; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; background: ' + p.color + '; color: #0A0D13',
        state: '✓ LOCKED IN', stateStyle: 'font-size: 12px; font-weight: 700; letter-spacing: 0.12em; color: #6FEA77',
        canRemove: g.phase === 'lobby' && (c.owner === me || isHost), remove: () => act({ type: 'char/remove', charId: c.id }),
        style: 'display: flex; flex-direction: column; gap: 8px; padding: 14px; border-radius: 12px; background: #10151F; border: 1px solid #232D3F; border-left: 4px solid ' + p.color };
    });
    const st0 = startOf(g);
    // The mode picker (rules 1.39, survival-spec 8.1): three cards; the host picks an open one; a locked one or a guest's
    // click opens the card's own hover card with the reason (game/actionTip.ts openTipOn), never a toast.
    const cards = modeCards(g, isHost, (play) => act({ type: 'settings', patch: { play } }));
    // rules 1.41: a run under way shows its panel here (Back to the run); a run that is over leaves the room in its lobby
    // with the cards, and its score on the panel above them
    const run = g.run && g.run.state !== undefined ? g.run : null, runLive = !!run && run.state !== 'over', runsMode = startsRun(g), optional = narratorOptional(g), mode = modeOf(playOf(g));
    const modeCardsV = cards.map((m, i) => ({ ...m, lockedStr: m.locked ? 'true' : 'false', tabindex: m.selected || (!cards.some((c) => c.selected) && i === 0) ? '0' : '-1',
      hasArt: !!(m.art && (IMG[m.art] || ART(m.art))), noArt: !(m.art && (IMG[m.art] || ART(m.art))), img: IMG[m.art] || ART(m.art),
      onClick: (e) => (m.pick ? m.pick() : m.tip ? openTipOn(e && e.currentTarget) : null),
      onKey: (e) => { const j = radioKey(e.key, i, cards.length); if (j != null) { e.preventDefault(); const all = e.currentTarget.parentElement.querySelectorAll('[role="radio"]'); if (all[j]) all[j].focus(); } },
      style: 'position: relative; display: flex; flex-direction: column; min-width: 0; padding: 0; overflow: hidden; text-align: left; border-radius: 14px; font-family: inherit; color: #E7EBF3; cursor: ' + (m.pick || m.selected ? 'pointer' : 'not-allowed') + '; background: #10151F; '
        + (m.selected ? 'border: 2px solid #FFFFFF; box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.18)' : 'border: 2px solid #232D3F') + (m.locked ? '; opacity: 0.62' : ''),
      artBox: 'position: relative; display: grid; place-items: center; width: 100%; height: clamp(96px, 10vw, 220px); overflow: hidden; background: #1C2536; border-bottom: 1px solid #232D3F' + (m.locked ? '; filter: grayscale(0.7)' : ''),
      nameStyle: 'font-size: 20px; font-weight: 700; letter-spacing: 0.14em; color: ' + (m.locked ? '#A3AEC2' : '#E7EBF3'),
      statusStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: ' + (m.locked ? '#A3AEC2' : '#FFFFFF'),
      lineStyle: 'font-size: 13px; line-height: 1.45; color: ' + (m.locked ? '#A3AEC2' : '#C9D3E3') }));
    const fights = run ? (run.stats && run.stats.fights) || [] : [];
    const runV = run ? { kicker: 'SURVIVAL · STAGE ' + run.stage + ' · SEED ' + run.seed, title: run.state === 'over' ? 'The last run' : 'The run is under way',
      text: run.state === 'over' && run.end ? (run.end.how === 'retired' ? 'The squad retired' : 'The squad fell') + ' after ' + run.end.cleared + (run.end.cleared === 1 ? ' stage' : ' stages') + ' cleared and ' + run.end.nodes + (run.end.nodes === 1 ? ' node' : ' nodes') + ' walked, '
          + fights.filter((f) => f.outcome === 'win').length + ' of ' + fights.length + (fights.length === 1 ? ' fight' : ' fights') + ' won. Levels reached: ' + Object.entries(run.end.levels || {}).map(([id, lv]) => (g.characters[id] ? g.characters[id].name : id) + ' ' + lv).join(', ') + '. A new run starts from level 1 characters.'
        : 'Stage ' + run.stage + ', node ' + run.path.length + ' of 15. The path map is the run\'s own screen.',
      canRetire: isHost && !runRetireProblem(g, me), retire: () => act({ type: 'run/retire' }), live: runLive, toRun: () => go('run') } : null;
    const hostPick = (patch) => () => (isHost ? act({ type: 'settings', patch }) : toast('Only the host picks this.'));
    const starts = startsFor(g).map((x) => ({ short: x.short + (x.soon ? ' · soon' : ''), pick: x.soon ? () => toast(x.title + ' is coming after the systems are done. Fight in the Proving Ground, or load your own campaign.') : hostPick({ start: x.id }), pressed: S.start === x.id ? 'true' : 'false', style: pill(S.start === x.id) }));
    const startImg = IMG[st0.art] || ART(st0.art) || IMG['world-pilot'];
    const start = { zoom: zoomer(this, ART_BIG(st0.art) || startImg, st0.title + ' · ' + st0.artNote, 'world'), kicker: st0.kicker, title: st0.title, img: startImg, imgStyle: 'display: block; width: 100%; height: 300px; object-fit: cover; object-position: ' + st0.focus, artNote: st0.artNote, lore: st0.lore.map((text) => ({ text })), meta: st0.meta };
    const modes = [['ai', 'AI Narrator', 'Your own API key: Anthropic, OpenRouter, OpenAI, Gemini, a local model or another site. Plays every start.'], ['human', "I'll narrate", 'Coming soon: a private Narrator screen.']].map(([id, name, desc]) => ({ name, desc, pick: id === 'human' ? () => toast('Human Narrator mode is coming soon. Use the AI Narrator for now.') : hostPick({ mode: id }), pressed: S.mode === id ? 'true' : 'false',
      style: 'display: flex; flex-direction: column; align-items: flex-start; gap: 4px; text-align: left; padding: 14px; border-radius: 12px; font-family: inherit; color: #E7EBF3; cursor: pointer; ' + (S.mode === id ? 'border: 1px solid #E7EBF3; background: #1C2536' : 'border: 1px solid #232D3F; background: #10151F' + (id === 'human' ? '; opacity: 0.6' : '')) }));
    const tones = ['Grim', 'Pulp', 'Literary'].map((t) => ({ name: t, pick: hostPick({ tone: t }), pressed: S.tone === t ? 'true' : 'false', style: pill(S.tone === t) }));
    // Start: host only, at least one locked-in character, and (AI) a key.
    const offline = g.players.filter((p) => p.online && !Object.values(g.characters).some((c) => c.owner === p.id) && p.id !== g.hostId);
    // A finished campaign (spec: OOC, missions and end states): the save is complete; the room says so.
    const why = g.story && g.story.complete ? 'Campaign complete ✓ · ' + ((g.campaign && g.campaign.title) || 'the story') + ' is finished'
      : g.phase !== 'lobby' ? null : !isHost ? 'Waiting for ' + (host?.name || 'the host') + ' to start'
      : g.phase !== 'lobby' ? null : !squad.length ? 'Lock in a character to start'
      : S.mode === 'ai' && !st.narrator.scripted && !optional ? notReadyReason(st.narrator) : null;
    const notReady = !!why;
    const lib = st.library.filter((c) => !c.draft && !validateSheet(c));
    return {
      ...lightboxVals(this), code: g.code, connText: st.conn === 'online' ? '● ONLINE' : st.conn === 'host-away' ? '● HOST AWAY' : '● RECONNECTING',
      connStyle: 'font-size: 12px; font-weight: 700; letter-spacing: 0.1em; color: ' + (st.conn === 'online' ? '#6FEA77' : '#FFFFFF'),
      copyLabel: this.state.copied ? 'Copied ✓' : 'Copy invite link',
      copyInvite: () => { const url = location.origin + '/?room=' + g.code; navigator.clipboard?.writeText(url).then(() => { this.setState({ copied: true }); setTimeout(() => this.setState({ copied: false }), 2000); }, () => toast('Invite link: ' + url, true)); },
      canLoad: isHost && g.phase === 'lobby', loadCampaign: (e) => { const f = e.target.files && e.target.files[0]; if (!f) return;
        f.text().then((t) => { let c; try { c = JSON.parse(t); } catch { return toast('That file is not JSON.'); } act({ type: 'campaign/load', campaign: c }); e.target.value = ''; }); },
      // The header's cluster (UI pass, screens/shell.js): Back to the session, Save, ⚙, ⚑, Leave (it asks, and the
      // host's saves first; in the Proving Ground it ends it).
      // The header's Back to the session › goes the same way as the big button (with the "settings updated" toast).
      ...((sv) => { sv.sh.toSession = () => this.backToSession(g); return sv; })(shellVals(this, 'room')),
      inSession: g.phase !== 'lobby', backToSession: () => this.backToSession(g),
      players, squad, starts, start, modes, isAI: S.mode === 'ai', isHuman: S.mode === 'human', hostAI: S.mode === 'ai' && isHost, guestAI: S.mode === 'ai' && !isHost, hostName: host?.name || 'The host', tones,
      create: () => go('create', { draft: null }), cantAdd: g.phase !== 'lobby' || mine.length >= 2,
      report: openReport, importChar: () => importCharacter().then((c) => { if (c && !c.draft) { const { savedAt, draft, ...sheet } = c; act({ type: 'char/add', sheet }); this.setState({ bring: false }); } }),
      toggleBring: () => (this.state.bring ? closeAnim(this, 'bring', () => this.setState({ bring: false })) : this.setState({ bring: true })), bringOpen: this.state.bring,
      bringCls: 'phc-a-drop' + ((this.state.closing || {}).bring ? ' phc-closing' : ''), noSaved: !lib.length,
      saved: lib.map((c) => ({ key: c.name, name: c.name, img: c.portrait, line: c.origin, bring: () => { const { savedAt, draft, ...sheet } = c; act({ type: 'char/add', sheet }); this.setState({ bring: false }); } })),
      key: st.narrator.key, onKey: (e) => { setNarrator({ key: e.target.value.trim() }); this.noteChange(); },
      ...this.keyVals(g, isHost), remember: st.narrator.remember, onRemember: (e) => setNarrator({ remember: e.target.checked }),
      ...this.narratorVals(),
      // In session the big button is the way back (UI pass 2.1), never a greyed "In session".
      notReady, startLabel: why || (g.phase !== 'lobby' ? 'Return to the session ›' : runsMode ? 'Start the run' : g.players.length > 1 && offline.length ? 'Start session · ' + offline.map((p) => p.name).join(', ') + ' has no character yet' : 'Start session'),
      startSession: () => (g.phase !== 'lobby' ? this.backToSession(g) : act(runsMode ? { type: 'run/start', ...(testSeed() ? { seed: testSeed() } : {}) } : { type: 'session/start' })),
      startNote: g.phase !== 'lobby' && !(g.story && g.story.complete) ? (isHost ? 'Changes here apply from the Narrator\'s next turn.' : 'The session is on: this only takes you back.') : '',
      returnStory: !!(g.story && g.story.complete), toStory: () => this.backToSession(g),
      // The Proving Ground (practice mode): endless waves, no Narrator, no key needed; the squad as locked in, or a test character.
      proveCan: isHost && g.phase === 'lobby', proveGuest: !isHost && g.phase === 'lobby', openProve: () => openProvingGround(mine.length ? undefined : 'sharpshooter'),
      proveLabel: '⚔ Proving Ground · practice range' + (mine.length ? '' : ' · with a test character'),
      modeCards: modeCardsV, modeWho: isHost ? 'YOU PICK' : 'THE HOST PICKS', seal: IMG['emblem-ahoc-seal'] || ART('emblem-ahoc-seal'), showModes: !runLive,
      showCampaign: !runLive && playOf(g) === 'campaign', runOn: !!run, run: runV || {},
      // The Narrator panel (survival-spec 8.1 item 8): collapsed, not hidden, where a Narrator is optional flavour
      narrCollapsed: optional && !this.state.narrOpen, narrOpen: !optional || this.state.narrOpen, narrCanHide: optional && this.state.narrOpen,
      narrNone: (mode ? mode.name : 'This mode') + ' needs no Narrator.' + (isHost ? '' : ' Nobody here needs a key.'), narrCanAdd: isHost, narrAddLabel: 'Add a Narrator for flavour (optional)',
      narrExpand: () => this.setState({ narrOpen: true }), narrCollapse: () => this.setState({ narrOpen: false }), modeName: mode ? mode.name : '',
      startStyle: 'min-height: 52px; border-radius: 12px; border: 0; font-family: inherit; font-size: 15px; font-weight: 700; ' + (notReady ? 'background: #1C2536; color: #A3AEC2' : 'background: #6FEA77; color: #0A0D13; cursor: pointer'),
    };
  }
}
