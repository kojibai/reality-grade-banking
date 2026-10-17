// Restoring a modal's opener must preserve keyboard focus without painting a
// page-sized button outline after a touch. The next key restores normal rings.
const armed = new WeakSet<Document>();
export function restorePanelFocus(target: HTMLElement, pointer: boolean) {
  const doc = target.ownerDocument;
  if (pointer) {
    target.dataset.pointerFocusReturn = '';
    if (!armed.has(doc)) {
      armed.add(doc);
      doc.addEventListener('keydown', () => {
        doc.querySelectorAll('[data-pointer-focus-return]').forEach(node => node.removeAttribute('data-pointer-focus-return'));
        armed.delete(doc);
      }, { once: true, capture: true });
    }
  } else target.removeAttribute('data-pointer-focus-return');
  target.focus({ preventScroll: true });
}
