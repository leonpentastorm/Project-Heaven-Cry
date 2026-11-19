// The MAGIC tab's FIGMENTS section (rules 1.34; 0.28.2, Leon from the playtest: "visualization feels underwhelming, no
// unlocks, no nothing, there isn't even a special icon for each summon"). Three things, every one from the engine:
//   the ladder   figmentLadderView: every step of figments.json `ladder`, open or locked with the Visualization it needs,
//                the latest step reached shown as NEW (with its forms' icons) and the next one to open
//   the designs  figmentDesignView: the designs kept (form icon, traits, charge, why one can't be pictured now), and a
//                small editor (a name, a form, its traits) whose every option and refusal is the view's (draftWhy is
//                the reducer's own check); Save sends figments/design, Drop sends it with `drop`
//   the summon   in a fight, Picture's chips offer the ready designs first, then the bare forms (the engine's pick list)
//   the forks    rules 1.56 (Figments 2.0): pendingDoorPicks, the choices the ladder has opened (one form of a fork, or
//                one more), each option a chip that sends door/pick; the engine refuses in a fight and says why
// This file is screen glue: state (figDraft), words and styles. Icons: game/figmentIcons.ts, by each row's `icon`.
import { figmentLadderView, figmentDesignView, figmentLookOf, pendingDoorPicks } from '@engine';
import { act, toast } from '../game/store';
import { figmentIconUri, FIG_INK, FIG_LINE } from '../game/figmentIcons';
import { groupedSection } from '../game/workshopGroups';
import { doorLineOf } from '../game/doorView';

const MUTED = '#7F8BA1', TEXT = '#E7EBF3';
const chip = (on, off) => 'display: inline-flex; align-items: center; gap: 6px; min-height: 32px; padding: 0 10px 0 6px; border-radius: 999px; font-family: inherit; font-size: var(--fs-sub); font-weight: 700; cursor: ' + (off ? 'default; opacity: 0.5' : 'pointer')
  + '; ' + (on ? 'border: 1px solid ' + FIG_LINE + '; background: rgba(83, 148, 172, 0.22); color: #FFFFFF' : 'border: 1px solid #2E3A50; background: #10151F; color: ' + TEXT);
const forms = (list, ink) => list.map((f) => ({ key: f.id, name: f.name, icon: figmentIconUri(f.icon, ink), title: f.name + ': ' + f.text }));

/** The values the FIGMENTS section reads (mg.fig.*). sc: the main screen (state figDraft). */
export function figmentSectionVals(sc, g, c, rerender) {
  const none = { show: false, ws: { groups: [] }, steps: [], newForms: [], nextForms: [], designs: [], ed: { open: false, forms: [], traits: [] } };
  if (!c) return none;
  const p = c.skills?.visualization || 0, kept = c.figments || [];
  if (p < 1 && !kept.length) return none;
  const L = figmentLadderView(p, c), V = figmentDesignView(c, { inFight: g.phase === 'combat' && !!g.combat });
  const S = sc.state, set = (patch) => sc.setState({ figDraft: patch === null ? null : { ...(sc.state.figDraft || {}), ...patch } });

  // the ladder: what Visualization opens, step by step
  const steps = L.steps.map((st) => {
    const ink = st.open ? FIG_LINE : MUTED;
    // a fork's forms (rules 1.56) beside the step's own: the ones chosen in white, the rest in the step's ink
    const fork = st.choose ? st.choose.of.map((f) => ({ ...forms([f], st.choose.chosen.includes(f.id) ? '#FFFFFF' : MUTED)[0], name: f.name + (st.choose.chosen.includes(f.id) ? ' ✓' : '') })) : [];
    return { key: 'v' + st.points, at: 'VISUALIZATION ' + st.points, text: st.text, forms: [...forms(st.forms, ink), ...fork], hasForms: st.forms.length + fork.length > 0,
      state: st.latest ? 'NEW' : st.open ? '✓ OPEN' : 'LOCKED', open: st.open, locked: !st.open,
      stateStyle: 'margin-left: auto; flex: none; font-size: var(--fs-sub); font-weight: 700; letter-spacing: 0.08em; color: ' + (st.latest ? '#FFFFFF' : st.open ? '#6FEA77' : MUTED),
      style: 'display: flex; flex-direction: column; gap: 4px; padding: 8px 10px; border-radius: 8px; ' + (st.latest ? 'border: 1px solid ' + FIG_LINE + '; background: rgba(83, 148, 172, 0.14)' : st.open ? 'border: 1px solid #2E3A50; background: #10151F' : 'border: 1px dashed #2E3A50; background: transparent'),
      textStyle: 'font-size: var(--fs-sub); line-height: 1.4; color: ' + (st.open ? '#C9D3E3' : MUTED) };
  });
  const latest = L.latest, next = L.next;

  // the forks: what the ladder lets this character choose now (door/pick, kept for good)
  const choose = pendingDoorPicks(c, L.door).map((pd) => ({ key: pd.grant, head: 'CHOOSE · ' + pd.why,
    opts: pd.options.map((o) => ({ key: o.id, name: o.label, icon: figmentIconUri(o.icon, FIG_LINE), title: (figmentLookOf(o.id) || { text: '' }).text + (V.fightWhy ? ' · Choose after the fight.' : ''),
      style: chip(false, !!V.fightWhy), pick: () => (V.fightWhy ? toast('Choose after the fight.') : act({ type: 'door/pick', charId: c.id, door: L.door, option: o.id })) })) }));

  // the designs kept
  const designs = V.designs.map((d) => ({ key: d.id, name: d.name, icon: figmentIconUri(d.look ? d.look.icon : '', FIG_LINE),
    line: (d.look ? d.look.name : d.form) + (d.traits.length ? ' + ' + d.traits.map((t) => t.name).join(', ') : '') + ' · charge ' + d.charge,
    hasWhy: !!d.why, why: d.why || '', ready: d.ready,
    edit: () => { if (V.fightWhy) return toast(V.fightWhy); set({ id: d.id, name: d.name, form: d.form, traits: d.traits.map((t) => t.id) }); },
    drop: () => { if (V.fightWhy) return toast(V.fightWhy); act({ type: 'figments/design', charId: c.id, drop: d.id }); if (S.figDraft && S.figDraft.id === d.id) set(null); },
    off: !!V.fightWhy, offTitle: V.fightWhy || '' }));
  const firstOpen = V.forms.find((f) => f.open);
  const canNew = !V.newWhy && !!firstOpen;

  // the editor
  const D = S.figDraft || null;
  let ed = none.ed;
  if (D) {
    const draft = { id: D.id || '', name: D.name || '', form: D.form, traits: D.traits || [] };
    const why = V.draftWhy(draft), withName = (x) => ({ ...x, name: x.name || '-' });
    ed = { open: true, title: D.id ? 'EDIT ' + (D.name || 'DESIGN').toUpperCase() : 'NEW FIGMENT DESIGN', name: draft.name,
      onName: (e) => set({ name: String(e.target.value || '').slice(0, 40) }),
      forms: V.forms.map((f) => { const on = f.id === draft.form;
        return { key: f.id, label: f.name + ' · ' + f.charge, icon: figmentIconUri(f.icon, on ? '#FFFFFF' : f.open ? FIG_LINE : MUTED), pressed: on ? 'true' : 'false', off: !f.open, title: f.why || f.text,
          style: chip(on, !f.open), pick: () => { if (f.open) set({ form: f.id }); else toast(f.why); } }; }),
      traitsHead: 'TRAITS · ' + draft.traits.length + ' / ' + V.traitsMax + ' · +' + V.traitCharge + ' charge each',
      traits: V.traits.map((t) => { const on = draft.traits.includes(t.id), nextTraits = on ? draft.traits.filter((x) => x !== t.id) : [...draft.traits, t.id];
        const tWhy = on ? null : V.draftWhy(withName({ ...draft, traits: nextTraits }));
        return { key: t.id, label: t.name + (t.charge !== V.traitCharge ? ' (' + (t.charge > 0 ? '+' : '') + t.charge + ')' : ''), pressed: on ? 'true' : 'false', off: !!tWhy, text: t.text, title: tWhy || '', // the trait's line on the face; the hover only says why it can't be added
          style: chip(on, !!tWhy).replace('padding: 0 10px 0 6px', 'padding: 0 10px'), pick: () => { if (tWhy) return toast(tWhy); set({ traits: nextTraits }); } }; }),
      verdict: why || 'Ready: ' + V.chargeOf(draft.form, draft.traits) + ' charge from the Visualizer to picture it.',
      verdictStyle: 'font-size: var(--fs-sub); line-height: 1.4; font-weight: 700; color: ' + (why ? MUTED : '#6FEA77'),
      cantSave: !!why, save: () => { if (why) return toast(why); act({ type: 'figments/design', charId: c.id, design: draft }); set(null); },
      cancel: () => set(null), saveLabel: D.id ? 'Save changes' : 'Keep this design' };
  }

  const ws = groupedSection('magic.figments', [
    { key: 'ladder', label: 'What Visualization opens', count: L.steps.filter((s) => s.open).length + ' / ' + L.steps.length, items: [{ key: 'ladder', isLadder: true }] },
    { key: 'designs', label: 'Designs', count: V.designs.length + ' / ' + V.designsMax, items: [{ key: 'designs', isDesigns: true }] },
  ], { ink: FIG_INK, rerender, keepEmpty: true });

  return {
    show: true, ws, head: 'FIGMENTS · EXPRESSION · VISUALIZATION ' + p,
    hasNew: !!latest, newHead: latest ? 'NEW · VISUALIZATION ' + latest.points : '', newForms: latest ? forms(latest.forms, FIG_LINE) : [], hasNewForms: !!latest && latest.forms.length > 0, newText: latest ? latest.text : '',
    newLine: latest ? (latest.forms.length ? 'New: ' + latest.forms.map((f) => f.name).join(', ') : 'New: ' + latest.text) : '',
    hasNext: !!next, nextHead: next ? 'NEXT · VISUALIZATION ' + next.points : '', nextForms: next ? forms(next.forms, MUTED) : [], hasNextForms: !!next && next.forms.length > 0, nextText: next ? next.text : '',
    hasChoose: choose.length > 0, choose,
    steps, designs, noDesigns: !designs.length, noDesignsText: V.designsMax ? 'No designs kept yet: a design is a form with its traits, named, ready to picture.' : (V.newWhy || ''),
    canNew, newWhy: canNew ? '' : V.newWhy || '', hasNewWhy: !canNew && !!V.newWhy,
    newDesign: () => { if (!canNew) return toast(V.newWhy || 'Not now.'); set({ id: null, name: '', form: firstOpen.id, traits: [] }); },
    pictureNote: doorLineOf('visualization'), // the door's one line (skills.json door_line, the one reader: game/doorView.ts)
    ed,
  };
}
