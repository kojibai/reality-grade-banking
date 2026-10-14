// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest';
import { lockDocumentScroll } from '../src/core/scroll-lock';
it('locks background scroll until the final sheet closes and restores the exact prior position and styles', () => {
  document.body.style.position = 'relative'; document.body.style.width = '95%';
  const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 245 });
  Object.defineProperty(window, 'scrollX', { configurable: true, value: 3 });
  const one = lockDocumentScroll(), two = lockDocumentScroll();
  expect(document.body.style.position).toBe('fixed'); expect(document.body.style.top).toBe('-245px');
  one(); one(); expect(document.body.style.position).toBe('fixed');
  two(); expect(document.body.style.position).toBe('relative'); expect(document.body.style.width).toBe('95%');
  expect(scroll).toHaveBeenCalledWith(3, 245);
  scroll.mockRestore(); document.body.removeAttribute('style');
});
