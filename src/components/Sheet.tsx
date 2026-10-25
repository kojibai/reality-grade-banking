import { useLayoutEffect, useId, useRef, type ReactNode } from 'react';
import { restorePanelFocus } from '../core/return-focus';
import { X } from 'lucide-react';
import { lockDocumentScroll } from '../core/scroll-lock';

export function Sheet({ title, children, onClose, active = true }: { title: string; children: ReactNode; onClose: () => void; active?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null), returnFocus = useRef<HTMLElement | null>(null);
  const titleId = useId(), pointerReturn = useRef(false);
  useLayoutEffect(() => {
    if (!active) return;
    const dialog = ref.current;
    if (!returnFocus.current?.isConnected) { returnFocus.current = document.activeElement as HTMLElement | null; pointerReturn.current = !returnFocus.current?.matches(':focus-visible'); }
    dialog?.showModal();
    const unlock = lockDocumentScroll();
    return () => {
      dialog?.close(); unlock();
      // Keep the original opener through public-page suspension. Restore after
      // React removes the closing dialog, without focusing a hidden bank.
      queueMicrotask(() => { const focus = returnFocus.current; if (!dialog?.open && focus?.isConnected && !focus.closest('[hidden],[inert]')) restorePanelFocus(focus, pointerReturn.current); });
    };
  }, [active]);
  return <dialog onPointerDownCapture={() => { pointerReturn.current = true; }} onKeyDownCapture={() => { pointerReturn.current = false; }} ref={ref} className="sheet" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }}><div className="sheet-header"><h2 id={titleId}>{title}</h2><button className="icon-button" aria-label="Close" onClick={onClose}><X size={22} /></button></div><div className="sheet-body">{children}</div></dialog>;
}
