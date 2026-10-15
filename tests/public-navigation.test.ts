// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
const source = '// All four public pages' + readFileSync('public/learn/learn.js', 'utf8').split('// All four public pages')[1];
it('switches guides and returns to the same mounted bank DOM without a document reload', async () => {
  document.body.innerHTML = '<div id="root"><input value="retained input"><a href="/learn/">Learn</a></div>';
  const root = document.getElementById('root'), input = root!.querySelector('input'), originalDocument = document;
  const data = document.createElement('script'); data.id = 'receiz-navigation'; data.type = 'application/json';
  data.textContent = JSON.stringify({ pages: { '/learn/': { content: '<main><h1>Learn</h1></main><a href="/learn/guide/">Guide</a><a href="/">Enter bank</a>', head: '<title>Learn title</title><link rel="canonical" href="https://bank.receiz.com/learn/">' }, '/learn/guide/': { content: '<main><h1 id="guide-heading">Guide</h1></main><a href="/learn/">All guides</a>', head: '<title>Guide title</title>' } }, bank: { head: '<title>Bank title</title><meta name="viewport" content="width=device-width,viewport-fit=cover"><link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="/icon-192.png">', styles: [], entry: '/unused.js' } }); document.body.append(data);
  history.replaceState({}, '', '/#market'); const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  // Execute only the production public router; private runtime import is never reached in this warm-account test.
  new Function('window', 'document', 'location', 'history', 'scrollTo', 'Event', 'URL', source)(window, document, location, history, scroll, Event, URL);
  root!.querySelector('a')!.click();
  expect(location.pathname).toBe('/learn/'); expect(document.title).toBe('Learn title'); expect(root!.hidden).toBe(true);
  document.querySelector<HTMLAnchorElement>('#public-learn-root a[href="/learn/guide/"]')!.click();
  expect(location.pathname).toBe('/learn/guide/'); expect(document.title).toBe('Guide title'); expect(document.activeElement?.tagName).toBe('MAIN'); expect(document).toBe(originalDocument);
  // Hash navigation can dispatch popstate with state copied from the page's
  // original entry. Its old scroll position must not override the new anchor.
  const anchorScroll = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {});
  history.replaceState({ publicNavigation: { url: '/learn/guide/', scroll: 0 } }, '', '/learn/guide/#guide-heading');
  window.dispatchEvent(new PopStateEvent('popstate'));
  expect(anchorScroll).toHaveBeenCalled();
  anchorScroll.mockRestore();
  document.querySelector<HTMLAnchorElement>('#public-learn-root a')!.click();
  document.querySelector<HTMLAnchorElement>('#public-learn-root a[href="/"]')!.click();
  expect(location.hash).toBe('#market'); expect(root!.hidden).toBe(false); expect(document.title).toBe('Bank title'); expect(document.querySelector('link[rel="manifest"]')).not.toBeNull(); expect(document.querySelector('meta[name="viewport"]')?.getAttribute('content')).toContain('viewport-fit=cover'); expect(root!.querySelector('input')).toBe(input); expect(input!.value).toBe('retained input');
  let intercepted = true; const suppressTestNavigation = (event: MouseEvent) => { intercepted = event.defaultPrevented; event.preventDefault(); }; window.addEventListener('click', suppressTestNavigation);
  const external = document.createElement('a'); external.href = 'https://receiz.com/wallet';
  document.body.append(external); const modified = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }); external.dispatchEvent(modified); expect(intercepted).toBe(false);
  const payment = document.createElement('a'); payment.href = '/?pay=kept'; document.body.append(payment); const click = new MouseEvent('click', { bubbles: true, cancelable: true }); payment.dispatchEvent(click); expect(intercepted).toBe(false); window.removeEventListener('click', suppressTestNavigation);
  scroll.mockRestore();
});
