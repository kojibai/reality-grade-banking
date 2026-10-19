// @vitest-environment happy-dom
import { expect, it } from 'vitest';
import { openingShellHtml } from '../scripts/opening-shell.mjs';
import { AccountOpening } from '../src/features/identity/AccountOpening';

it('ships visible entrance artwork without waiting for any script or stylesheet', () => {
  const html = openingShellHtml('<html><head></head><body><div id="root"></div><script type="module" src="/assets/bank.js"></script></body></html>', AccountOpening);
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  expect(parsed.querySelector('#root .account-opening-screen[data-entry=resume] svg')).not.toBeNull();
  expect(parsed.querySelector('head style')?.textContent).toContain('.account-opening-screen');
  expect(parsed.querySelector('#root [role=status]')?.textContent).toContain('Restoring your saved account');
  expect(parsed.querySelectorAll('#root script, #root img, #root link')).toHaveLength(0);
  expect(parsed.querySelector('noscript a')?.getAttribute('href')).toBe('/learn/');
});
