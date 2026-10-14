let depth = 0;
let restore: (() => void) | null = null;
export function lockDocumentScroll(): () => void {
  if (depth++ === 0) {
    const body = document.body, html = document.documentElement, x = window.scrollX, y = window.scrollY;
    const styles = ['position', 'top', 'left', 'width', 'overflow', 'padding-right'] as const;
    const previous = styles.map(name => [name, body.style.getPropertyValue(name), body.style.getPropertyPriority(name)]);
    const overflow = html.style.overflow, overscroll = html.style.overscrollBehavior;
    const gutter = window.innerWidth - html.clientWidth;
    body.style.position = 'fixed'; body.style.top = `${-y}px`; body.style.left = `${-x}px`; body.style.width = '100%'; body.style.overflow = 'hidden';
    if (gutter > 0) body.style.paddingRight = `${parseFloat(getComputedStyle(body).paddingRight || '0') + gutter}px`;
    html.style.overflow = 'hidden'; html.style.overscrollBehavior = 'none';
    restore = () => { for (const [name, value, priority] of previous) value ? body.style.setProperty(name, value, priority) : body.style.removeProperty(name); html.style.overflow = overflow; html.style.overscrollBehavior = overscroll; window.scrollTo(x, y); };
  }
  let released = false;
  return () => { if (released) return; released = true; if (--depth === 0) { restore?.(); restore = null; } };
}
