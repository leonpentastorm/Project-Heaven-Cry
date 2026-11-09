// The shell: the right-hand cluster of every in-game header (UI pass, docs/design/ui-pass-shell.md section 1): the
// room, Save, the settings cog, Report and Leave, the same markup on the story, combat and room screens
// (templates/shell.template.html, put in by expand() at <!--SHELL-->), fed by shellVals(self, screen). The story
// screen also gets the Narrator chip and its menu (narratorVals) and the Area map button; keys: M opens the area map,
// Ctrl/⌘+S saves, Escape closes the Narrator menu.
import { getState, go, leaveRoom, saveNow, retryNarrator, toast } from '../game/store';
import { openReport, openSpend } from '../game/report';
import { openSettings } from '../game/settings';
import { askConfirm, dialogOpen } from '../game/dialog';
import { leaveProvingGround } from '../game/sandbox';
import { openMemory } from '../game/memory';
import { voiceState, voiceChip, voicePrefs } from '../game/voice';
import { providerInfo } from '../narrator/providers';
import { MODELS } from '../narrator/anthropic';

const SAVED_MS = 4000;
const btnStyle = (on) => 'min-height: 34px; padding: 0 14px; border-radius: 8px; font-family: inherit; font-size: 12px; font-weight: 700; letter-spacing: 0.06em; cursor: pointer; white-space: nowrap; ' +
  (on ? 'border: 1px solid #6FEA77; background: transparent; color: #6FEA77' : 'border: 1px solid #2E3A50; background: transparent; color: #E7EBF3');

/** Save, with the button saying so (Saved ✓ for 4 s). */
export function saveWithFeedback(self) {
  saveNow();
  if (self) setTimeout(() => { try { self.setState({}); } catch { /* gone */ } }, SAVED_MS + 50);
}

/** Leave, asked in the game's own dialog. The host saves first (here and on the room server); a guest's character
 *  stays in the squad; the Proving Ground has its own leave (it closes or gives the room back). */
export async function leaveFlow() {
  const st = getState(), g = st.game;
  if (g && g.sandbox) return leaveProvingGround(true);
  const host = st.role === 'host', fight = !!g && g.phase === 'combat', code = st.code || (g && g.code) || '';
  const ok = await askConfirm(host
    ? { title: 'Leave the room?', body: 'The game saves first, here and on the room server. Resume it from Saved sessions on the title screen; your friends stay in the room until you come back.' + (fight ? '\nThe fight is saved where it is.' : ''), confirm: 'Save and leave', cancel: 'Stay' }
    : { title: 'Leave the room?', body: 'Your character stays in the squad; rejoin any time with code ' + code + '.' + (fight ? '\nThe fight goes on without you until you come back.' : ''), confirm: 'Leave', cancel: 'Stay' });
  if (!ok) return;
  if (host) {
    try { saveNow(); } catch (e) {
      const anyway = await askConfirm({ title: 'The save failed', body: String((e && e.message) || e) + '\nLeave without saving? The last automatic save is kept.', confirm: 'Leave without saving', cancel: 'Stay', danger: true });
      if (!anyway) return;
    }
  }
  leaveRoom();
}

/** The cluster's values (sh.*) for a screen: 'main', 'combat' or 'room'. */
export function shellVals(self, screen) {
  const st = getState(), g = st.game, isHost = st.role === 'host', SB = !!(g && g.sandbox);
  LIVE = { self, screen };
  const saved = !!st.savedAt && Date.now() - st.savedAt < SAVED_MS;
  return { sh: {
    code: (g && g.code) || st.code || '',
    showRoom: screen !== 'room', toRoom: () => go('room'),
    showBack: screen === 'room' && !!g && g.phase !== 'lobby', toSession: () => go(g && g.phase === 'combat' ? 'combat' : 'main'),
    isHost, save: () => saveWithFeedback(self), saveLabel: saved ? 'Saved ✓' : 'Save', saveName: saved ? 'Saved' : 'Save', saveStyle: btnStyle(saved),
    saveTitle: 'Save now (Ctrl+S). The game also saves itself after every action, in this browser and on the room server.',
    settings: () => openSettings(), report: openReport,
    leave: () => { leaveFlow(); },
    leaveName: SB ? 'Leave the Proving Ground' : 'Leave the room',
    leaveTitle: SB ? (isHost ? 'Close the Proving Ground' : 'Leave the Proving Ground: your fighter goes with you') : isHost ? 'Save and go back to the title screen. Resume any time from Saved sessions.' : 'Back to the title screen. Your character stays in the squad.',
  } };
}

/** The story screen's Narrator chip (a button with a menu) and the Area map / Back to the fight button. */
export function narratorVals(self, g, opts) {
  const st = getState(), isHost = st.role === 'host', SB = !!g.sandbox, n = g.narrator || {}, err = n.error, busy = !!n.busy;
  const host = g.players.find((p) => p.id === g.hostId) || { name: 'The host' };
  const VS = voiceState(), vtxt = voiceChip(VS, voicePrefs()), loadingVoice = /Loading|Installing/.test(vtxt);
  const open = !!self.state.shNarr && !SB;
  const u = n.usage || { calls: 0, costUsd: 0 };
  const NS = st.narrator || {}, p = providerInfo(NS.provider), model = (MODELS.find((m) => m.id === NS.model) || {}).label || NS.model || p.defaultModel || '';
  const word = SB ? 'PROVING GROUND · ' + g.players.length + (g.players.length === 1 ? ' PLAYER' : ' PLAYERS')
    : err ? 'NARRATOR STUCK' : busy ? 'NARRATOR · THINKING…' : VS.speaking ? 'NARRATOR · SPEAKING' : loadingVoice ? 'NARRATOR · LOADING VOICE'
    : 'NARRATOR · ' + (isHost ? 'YOUR KEY' : (host.name || '').toUpperCase() + '’S KEY');
  const dot = err ? '▲' : '●', live = busy || VS.speaking || loadingVoice;
  const ink = err ? '#F65157' : live ? '#FFFFFF' : '#E7EBF3';
  const close = () => self.setState({ shNarr: false });
  const inFight = g.phase === 'combat';
  return {
    nc: {
      word, dot, sandbox: SB, notSandbox: !SB, open, expanded: open ? 'true' : 'false', headZ: open ? 46 : 12,
      toggle: () => (SB ? null : self.setState({ shNarr: !self.state.shNarr })), close,
      style: 'display: inline-flex; align-items: center; gap: 8px; min-height: 34px; max-width: 300px; padding: 0 12px; border-radius: 999px; font-family: inherit; font-size: 12px; font-weight: 700; letter-spacing: 0.1em; white-space: nowrap; ' +
        'border: 1px solid ' + (err ? '#F65157' : open ? '#E7EBF3' : '#2E3A50') + '; background: ' + (err ? 'rgba(246, 81, 87, 0.08)' : '#10151F') + '; color: ' + ink + (SB ? '; cursor: default' : '; cursor: pointer'),
      dotStyle: 'font-size: 11px; color: ' + ink + (live ? '; animation: phcPulse 1.2s ease-in-out infinite' : ''),
      title: SB ? 'The Proving Ground has no Narrator' : 'The Narrator: state, spend, voice, key' + (err ? ' · stuck: ' + err : ''),
      stuck: !!err && !SB, retryHost: !!err && isHost && !SB, retry: () => { retryNarrator(); close(); },
      voice: vtxt, voiceTitle: VS.status === 'ready' ? 'Kokoro on ' + (VS.device === 'webgpu' ? 'WebGPU · ' + VS.gpu : 'the CPU' + (VS.fellBack ? ' (WebGPU failed: ' + VS.fellBack + ')' : '')) + ' · ' + VS.dtype : VS.status === 'failed' ? 'Kokoro failed: ' + VS.error : 'Settings › Voice: install Kokoro, or pick a voice',
      // The menu.
      stateLine: (err ? '▲ Stuck' : busy ? '● Writing' : '● Ready') + ' · ' + (isHost && model ? model + ' · ' : '') + (isHost ? 'your key' : host.name + '’s key'),
      isHost, cost: (u.calls ? '$' + u.costUsd.toFixed(2) + ' · ' + u.calls + ' Narrator turn' + (u.calls === 1 ? '' : 's') : 'no Narrator turns yet'),
      spend: () => { close(); openSpend(); }, voiceSettings: () => { close(); openSettings('voice'); },
      changeKey: () => { close(); go('room', { roomFocus: 'narrator' }); }, memory: () => { close(); openMemory(); },
      errText: err ? String(err) : '', guestStuck: !!err && !isHost,
      guestNote: 'The host retries: ' + host.name + ' has a Retry on their screen.',
    },
    // The one navigation button: the area map, or the way back to a fight that is on.
    nav: {
      fight: inFight, map: !inFight,
      toFight: () => go('combat'),
      openMap: () => opts.openArea(),
    },
  };
}

// ---------- keys ----------
let LIVE = null;
const typing = (t) => !!t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') window.addEventListener('keydown', (e) => {
  if (!LIVE || dialogOpen()) return;
  const st = getState();
  if (!st.role || st.screen !== LIVE.screen) return;
  const self = LIVE.self;
  if (e.key === 'Escape' && self.state && self.state.shNarr) { self.setState({ shNarr: false }); return; }
  if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 's' || e.key === 'S')) {
    e.preventDefault();
    if (st.role === 'host') saveWithFeedback(self); else toast('The host\'s browser keeps the save for everyone.');
    return;
  }
  if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.metaKey && !e.altKey && !typing(e.target) && LIVE.screen === 'main' && typeof self.toggleArea === 'function'
) { e.preventDefault(); self.toggleArea(); }
});
