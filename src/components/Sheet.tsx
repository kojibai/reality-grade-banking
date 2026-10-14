import { useLayoutEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { lockDocumentScroll } from '../core/scroll-lock';

export function Sheet({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useLayoutEffect(() => {
    const dialog = ref.current;
    const focus = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    const unlock = lockDocumentScroll();
    return () => { dialog?.close(); unlock(); focus?.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} className="sheet" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }}><div className="sheet-header"><h2 id={titleId}>{title}</h2><button className="icon-button" aria-label="Close" onClick={onClose}><X size={22} /></button></div><div className="sheet-body">{children}</div></dialog>;
}
