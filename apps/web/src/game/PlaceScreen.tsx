// Every safe node but the shop as a full-screen place (rules 1.46; survival-spec 8.3 "The Forge uses this frame"): the
// Forge (the armourer: Upgrade, Mods and pieces, Armour fitting, Give), a training ground (the drill sergeant), a shrine
// (its rolled patron's portrait), a crossroads (the broker), a rest (the medic). Drawn in FullScreenFrame: the face on
// the left with its line, large choice cards in the middle (what you gain, what it costs, the engine's reason when it
// can't), your character on the right, the visit's log along the bottom. Everything comes from `placeView` (the options
// are progress.ts's `runOptions`); every action is the engine's own, sent through the store. "To the path map" closes
// the place on this screen only (the squad walks on from the map; the map's panel opens it again).
import React from 'react';
import { act, getState } from './store';
import { placeView, type PlaceCardV, type PlaceViewV, type MeV } from '@engine';
import { gearIconUri } from './gearIcons';
import { tipProps, openTipOn } from './actionTip';
import { FullScreenFrame, FRAME_INK as I, type FrameTab } from './FullScreenFrame';
import { patronPortrait } from './faithArt';
import { GiveTab } from './GiveTab';
import { UpgradeCard } from './UpgradeCard';
import ASSETS from './assets.json';

const A = ASSETS as Record<string, string>;
const art = (k: string) => (k ? A[k + '-lg'] || A[k] || '' : '');
const kick: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: I.muted };
const GRID: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 28 };
/** The words over each group of cards (the engine names the group; the client its heading and its note). */
const HEAD: Record<string, [string, string]> = {
  grade: ['The grade step', 'one a visit, cheaper than a shop\'s'], relic: ['The Relic step', 'pick one named property: it stays on the weapon and counts on your cap'],
  forge: ['Mods and worn pieces', 'made for what the squad carries'], fit: ['Armour fitting', 'the next armour class, fitted to you'],
  train: ['Training', 'what you learn here is yours for the run'], shrine: ['The shrine', 'each of you takes one'], trade: ['Trades', 'one each, or walk on'],
};
const NOTHING: Record<string, string> = { upgrade: 'Nothing you carry takes a grade step: a weapon or a focus does.', stock: 'The armourer has nothing for the squad today.', fit: 'Your armour class is as high as the armourer fits.' };

function ChoiceCard({ x, big }: { x: PlaceCardV; big?: boolean }) {
  const o = x.o, icon = x.id ? gearIconUri(x.id, undefined, { large: true }) : '';
  return (
    <button type="button" data-phc-choice={o.key} data-phc-why={o.why ? '' : undefined} aria-disabled={o.why ? 'true' : undefined} {...tipProps(o.why)}
      onClick={(e) => { if (o.why) openTipOn(e.currentTarget); else act(o.action as any); }}
      style={{ gridColumn: big ? 'span 2' : undefined, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 200, padding: 18, borderRadius: 16, textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', color: I.text,
        background: 'linear-gradient(180deg, rgba(28,37,54,0.96), rgba(16,21,31,0.96))', border: '1px solid ' + (o.why ? I.line : '#7A879E'), opacity: o.why ? 0.8 : 1 }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {icon ? <span style={{ flexShrink: 0, width: 72, height: 72, display: 'grid', placeItems: 'center', borderRadius: 12, background: 'radial-gradient(closest-side, rgba(231,235,243,0.14), rgba(231,235,243,0.02))' }}><img src={icon} alt="" width={64} height={64} style={{ objectFit: 'contain' }} /></span> : null}
        <span style={{ fontFamily: "'Spectral', serif", fontSize: big ? 24 : 20, fontWeight: 600, lineHeight: 1.2 }}>{o.label}</span>
      </div>
      {o.detail ? <span style={{ fontSize: 14, lineHeight: 1.45, color: '#DCE2EC' }}>{o.detail}</span> : null}
      {x.worth ? <span style={{ fontSize: 13, color: I.white }}>Worth {x.worth}.</span> : null}
      <span style={{ marginTop: 'auto', display: 'flex', alignItems: 'flex-end', gap: 10 }}>
        <span style={{ display: 'flex', flexDirection: 'column' }}>
          <span data-phc-price="" style={{ fontSize: 24, fontWeight: 700, color: I.white, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{o.price ? o.price.toLocaleString('en') : 'Free'}</span>
          {o.price ? <span style={{ fontSize: 11, color: I.muted, letterSpacing: '0.08em' }}>CREDITS</span> : <span style={{ fontSize: 11, color: I.muted, letterSpacing: '0.08em' }}>COSTS THE NODE</span>}
        </span>
        <span style={{ marginLeft: 'auto', minHeight: 40, padding: '0 16px', display: 'inline-grid', placeItems: 'center', borderRadius: 10, background: o.why ? 'transparent' : I.text, outline: o.why ? '1px solid #3B475D' : 'none', color: o.why ? I.muted : I.ground, fontWeight: 700, fontSize: 15 }}>Take it</span>
      </span>
      <span data-phc-status="" style={{ minHeight: 18, fontSize: 13, color: o.why ? I.muted : I.ok }}>{o.why || '✓ You can take this'}</span>
    </button>
  );
}

function You({ m, worth }: { m: MeV | null; worth: string }) {
  if (!m) return <p style={{ color: I.muted }}>Bring a character.</p>;
  const pct = Math.min(100, Math.round((m.kg / Math.max(1, m.limit)) * 100)), over = m.kg > m.limit;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {m.portrait ? <img src={m.portrait} alt="" width={56} height={70} style={{ objectFit: 'cover', borderRadius: 10, border: '1px solid #3B475D' }} /> : <span style={{ width: 56, height: 70, borderRadius: 10, background: I.raised, display: 'inline-block' }} />}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: "'Spectral', serif", fontSize: 22, fontWeight: 600 }}>{m.name}</span>
          <span style={{ fontSize: 12, color: I.muted }}>Level {m.level} · Armour class {m.armourClass}</span>
          <span style={{ fontSize: 12, color: I.muted }}>Run power {worth}</span>
        </div>
      </div>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={kick}>HANDS AND WORN</span>
        <span style={{ fontSize: 13.5 }}><span style={{ color: I.muted }}>Main · </span>{m.hand}{m.handRarity !== 'standard' ? ' (' + m.handRarity + ')' : ''}</span>
        {m.off ? <span style={{ fontSize: 13.5 }}><span style={{ color: I.muted }}>Off · </span>{m.off}</span> : null}
        {m.worn.map((w) => <span key={w.slot} style={{ fontSize: 13.5 }}><span style={{ color: I.muted }}>{w.slot} · </span>{w.name}</span>)}
      </section>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={kick}>THE PACK</span>
        <div aria-label={'Carrying ' + m.kg + ' of ' + m.limit + ' kg'} style={{ height: 8, borderRadius: 4, background: I.raised, overflow: 'hidden' }}><div style={{ width: pct + '%', height: '100%', background: over ? I.hp : I.text }} /></div>
        <span style={{ fontSize: 12, color: over ? I.hp : I.muted }}>{m.kg} of {m.limit} kg{over ? ' · over the limit' : ''}</span>
        {m.pack.map((p, i) => <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12.5, lineHeight: 1.35 }}><span style={{ flex: 1, minWidth: 0 }}>{p.label}</span><span style={{ color: I.muted, fontVariantNumeric: 'tabular-nums' }}>{p.kg} kg</span></div>)}
      </section>
    </div>
  );
}

/** The groups of a tab, drawn as large cards (the grade steps as upgrade cards with their numbers before and after). */
function TabBody({ v, tab }: { v: PlaceViewV; tab: string }) {
  const t = v.tabs.find((x) => x.id === tab)!;
  const groups = t.groups.filter((gname) => v.cards.some((x) => x.o.group === gname));
  if (!groups.length) return <p data-phc-place-empty="" style={{ fontSize: 15, color: I.muted, lineHeight: 1.6, maxWidth: 560 }}>{NOTHING[tab] || 'Nothing here for you.'}</p>;
  return (
    <div data-phc-choices={v.me?.id || ''}>
      {groups.map((gname) => (
        <section key={gname} data-phc-group={gname}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '6px 0 12px' }}>
            <h2 style={{ margin: 0, fontFamily: "'Spectral', serif", fontWeight: 600, fontSize: 24 }}>{HEAD[gname]?.[0] || gname}</h2>
            <span style={{ fontSize: 12, color: I.muted }}>{HEAD[gname]?.[1] || ''}</span>
            <span aria-hidden="true" style={{ flex: 1, height: 1, background: I.line, alignSelf: 'center' }} />
          </div>
          <div style={GRID}>
            {v.cards.filter((x) => x.o.group === gname).map((x) => gname === 'grade'
              ? <UpgradeCard key={x.o.key} choice s={{ key: x.o.key, title: x.o.label, id: x.id, price: x.o.price, why: x.o.why, note: x.o.detail, lines: x.lines, action: x.o.action as any }} />
              : <ChoiceCard key={x.o.key} x={x} big={gname === 'relic'} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

export function PlaceScreen({ onLeave }: { onLeave: () => void }) {
  const st = getState(), g = st.game, me = st.me.id;
  const v = g ? placeView(g as any, me) : null;
  const [tab, setTab] = React.useState<string>(v?.tabs[0]?.id || 'give');
  if (!g || !v) return null;
  const on = v.tabs.some((t) => t.id === tab) ? tab : v.tabs[0].id;
  const tabs: FrameTab[] = v.tabs.map((t) => ({ id: t.id, label: t.label }));
  const portrait = v.face.patron ? patronPortrait(v.face.patron, true) || '' : v.face.portraitPending ? (v.face.fallback ? art('char-' + v.face.fallback) : '') : art(v.face.portrait);
  const backdrop = v.face.backdropPending ? (v.face.backdropFallback ? art('ill-' + v.face.backdropFallback) : '') : art(v.face.backdrop);
  return (
    <div data-phc-place={v.kind}>
      <FullScreenFrame backdrop={backdrop} portrait={portrait} name={v.face.name} role={v.face.role + ' · ' + v.word + ' · ' + v.setting} line={v.face.line} lineKey={v.node}
        tabs={tabs} tab={on} onTab={setTab} purse={v.me?.credits ?? 0}
        party={v.party.map((p) => ({ id: p.id, name: p.name, initials: p.initials, color: p.color, ready: p.marked, online: p.online, mine: p.mine }))} ready={false} isHost={false} waiting={[]} hideClose marks={['NEXT NODE MARKED', 'HERE']}
        onReady={onLeave} onClose={onLeave} closeTip="" readyWord="To the path map ›" log={v.log} emptyLog="Nothing taken here yet."
        side={<You m={v.me} worth={v.worth} />}>
        {on === 'give' ? <GiveTab /> : <TabBody v={v} tab={on} />}
      </FullScreenFrame>
    </div>
  );
}
