// @vitest-environment happy-dom
import {readFileSync} from 'node:fs';
import {expect, it, vi} from 'vitest';

it('loads the bank once on explicit public intent, preserves the public surface, and reuses that root on bank navigation', async () => {
  history.replaceState(null, '', '/explore/');
  document.head.innerHTML = '<title>Explore</title><link rel="canonical" href="https://bankeiz.com/explore/">';
  document.body.innerHTML = '<div id="public-explore-root" data-public-runtime="explore"><main>Public asset</main><a href="/">Bank</a></div>';
  const data = document.createElement('script'); data.id = 'receiz-navigation';
  data.textContent = JSON.stringify({pages: {'/explore/': {runtime: 'explore', head: '<title>Explore</title>', content: '<main>Explore</main>', entry: '/explore.js'}}, bank: {styles: ['/bank.css'], css: {'/bank.css': '.bank{color:navy}'}, head: '<title>Bank</title>', content: '<main>Opening account</main>', entry: '/bank.js'}}); document.body.append(data);
  let finish!: () => void;
  const load = vi.fn(() => new Promise<void>(resolve => {finish = resolve;})), scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const source = '// All public guides' + readFileSync('public/learn/learn.js', 'utf8').split('// All public guides')[1];
  try {
    new Function('loadModule', source.replaceAll('import(', 'loadModule('))(load);
    expect(load).not.toHaveBeenCalled(); expect(document.getElementById('root')).toBeNull();
    const requests = [0, 1].map(() => new Promise<void>((resolve, reject) => {const detail = {resolve, reject, handled: false}; dispatchEvent(new CustomEvent('bankeiz:request-bank-runtime', {detail})); expect(detail.handled).toBe(true);}));
    const bankRoot = document.getElementById('root')!;
    expect(bankRoot.hidden).toBe(true); expect(bankRoot.hasAttribute('inert')).toBe(true); expect(load).toHaveBeenCalledExactlyOnceWith('/bank.js');
    expect(location.pathname).toBe('/explore/'); expect(document.title).toBe('Explore'); expect(document.body.dataset.bankSurface).toBe('explore');
    expect(document.querySelector('link[href="/bank.css"]')).toBeNull();
    document.querySelector<HTMLAnchorElement>('#public-explore-root a')!.click();
    expect(document.getElementById('root')).toBe(bankRoot); expect(document.querySelectorAll('#root')).toHaveLength(1); expect(bankRoot.hidden).toBe(false);
    finish(); await Promise.all(requests); await Promise.resolve();
    expect(load).toHaveBeenCalledOnce(); expect(location.pathname).toBe('/'); expect(document.title).toBe('Bank');
  } finally {scroll.mockRestore(); history.replaceState(null, '', '/');}
});
