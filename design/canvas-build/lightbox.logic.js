// Click-to-enlarge for character portraits, skill portraits and Wick icons. build.py inlines this at /*LIGHTBOX*/.
// D.big maps each small canvas image to its large upload (800 x 1000 portraits, 512 px icons).
const LB_BIG = D.big || {};
const LB_KIND = { portrait: 'CHARACTER PORTRAIT', skill: 'SKILL PORTRAIT', icon: 'WICK ICON', perk: 'WICK PERK ICON' };
// Returns a click handler that opens the image large. kind: portrait | skill | icon | perk.
function zoomer(self, img, caption, kind) { return () => self.setState({ lb: { img: LB_BIG[img] || img, caption: caption || '', kind: kind || 'portrait' } }); }
const zoomBtn = 'display: block; flex: none; padding: 0; border: 0; background: none; cursor: zoom-in; border-radius: inherit';
function lightboxVals(self) {
  const L = self.state.lb, closeLb = () => self.setState({ lb: null });
  if (!L) return { lbOpen: false, closeLb, lb: { img: '', caption: '', kind: '', imgStyle: '' }, zoomBtn };
  const icon = L.kind === 'icon' || L.kind === 'perk';
  return { lbOpen: true, closeLb, zoomBtn, lb: { img: L.img, caption: L.caption, kind: LB_KIND[L.kind] || '',
    imgStyle: 'display: block; max-width: min(92vw, ' + (icon ? '512px' : '800px') + '); max-height: 80vh; object-fit: contain; border-radius: ' + (icon ? '16px; background: #10151F; padding: 24px' : '10px; background: #000') } };
}
