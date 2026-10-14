// Presentation only: no identity reads, requests, account changes, or third-party runtime.
(() => {
  const root = document.documentElement;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let revealObserver;
  let motionObserver;
  const configureMotion = () => {
    revealObserver?.disconnect();
    motionObserver?.disconnect();
    root.classList.remove('motion-ready');
    if (reducedMotion.matches || !('IntersectionObserver' in window)) return;
    const regions = document.querySelectorAll('.motion-region');
    const reveals = document.querySelectorAll('.reveal');
    // Anchor navigation must never depend on an observer firing to reveal its destination.
    const showHash = () => {
      let id; try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
      const target = document.getElementById(id);
      target?.querySelectorAll('.reveal').forEach(node => node.classList.add('visible'));
      target?.classList.add('visible');
    };
    revealObserver = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -30px 0px', threshold: .08 });
    motionObserver = new IntersectionObserver(entries => {
      for (const entry of entries) entry.target.classList.toggle('in-view', entry.isIntersecting);
    }, { rootMargin: '100px', threshold: 0 });
    regions.forEach(node => motionObserver.observe(node));
    reveals.forEach(node => revealObserver.observe(node));
    root.classList.add('motion-ready');
    showHash();
  };
  configureMotion();
  window.addEventListener('receiz-learn:page', configureMotion);
  reducedMotion.addEventListener?.('change', configureMotion);
  addEventListener('hashchange', () => {
    // Restrict selectors to a DOM id, including malformed user-supplied hashes.
    let id; try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    target?.classList.add('visible');
    target?.querySelectorAll('.reveal').forEach(node => node.classList.add('visible'));
  });
  const visibility = () => root.classList.toggle('document-hidden', document.hidden);
  visibility();
  document.addEventListener('visibilitychange', visibility);
  let scheduled = false;
  const readProgress = () => {
    scheduled = false;
    const header = document.querySelector('.learn-header'), progress = document.querySelector('.reading-progress');
    header?.classList.toggle('scrolled', scrollY > 12);
    const range = root.scrollHeight - innerHeight;
    if (progress) progress.style.transform = `scaleX(${range > 0 ? Math.min(1, Math.max(0, scrollY / range)) : 0})`;
  };
  const schedule = () => { if (!scheduled) { scheduled = true; requestAnimationFrame(readProgress); } };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  readProgress();
})();

// All four public pages are preloaded, public build output. Keep the mounted
// account DOM and device session when entering/returning from the guides.
(() => {
  const element = document.getElementById('receiz-navigation');
  if (!element) return;
  const { pages, bank } = JSON.parse(element.textContent);
  let publicRoot = document.getElementById('public-learn-root'), bankRoot = document.getElementById('root');
  let bankLoaded = Boolean(bankRoot), bankUrl = '/', bankFocus = null;
  const pathname = path => path === '/' ? '/' : path.endsWith('/') ? path : path + '/';
  const publicPath = path => Object.hasOwn(pages, pathname(path));
  const snapshot = () => ({ url: location.pathname + location.search + location.hash, scroll: scrollY });
  const remember = () => history.replaceState({ ...history.state, publicNavigation: snapshot() }, '');
  const restoreHead = head => {
    const template = document.createElement('template'); template.innerHTML = head;
    const selector = 'title,meta[name="viewport"],meta[name="description"],meta[name="theme-color"],meta[name="robots"],meta[name^="apple-"],meta[property^="og:"],meta[name^="twitter:"],link[rel="canonical"],link[rel="manifest"],link[rel="icon"],link[rel="apple-touch-icon"],script[type="application/ld+json"]';
    document.head.querySelectorAll(selector).forEach(node => node.remove());
    template.content.querySelectorAll(selector).forEach(node => document.head.append(node));
  };
  const styles = on => {
    for (const url of bank.styles) {
      let link = [...document.head.querySelectorAll('link[rel="stylesheet"]')].find(item => item.getAttribute('href') === url);
      if (!link && on) { link = document.createElement('link'); link.rel = 'stylesheet'; link.href = url; document.head.append(link); }
      if (link) link.disabled = !on;
    }
  };
  const render = async (restoring = false) => {
    const path = pathname(location.pathname), learn = publicPath(path);
    if (!learn && path !== '/') return;
    document.documentElement.classList.toggle('learn-surface', learn); document.body.dataset.bankSurface = learn ? 'learn' : 'bank';
    if (learn) {
      if (bankRoot) { if (bankRoot.contains(document.activeElement)) bankFocus = document.activeElement; bankRoot.hidden = true; bankRoot.setAttribute('inert', ''); }
      if (!publicRoot) { publicRoot = document.createElement('div'); publicRoot.id = 'public-learn-root'; document.body.append(publicRoot); }
      publicRoot.hidden = false; publicRoot.innerHTML = pages[path].content; restoreHead(pages[path].head); styles(false);
      window.dispatchEvent(new Event('receiz-learn:page'));
      const main = publicRoot.querySelector('main'); if (main) { main.tabIndex = -1; main.focus({ preventScroll: true }); }
    } else {
      if (publicRoot) publicRoot.hidden = true;
      if (!bankRoot) { bankRoot = document.createElement('div'); bankRoot.id = 'root'; document.body.append(bankRoot); }
      bankRoot.hidden = false; bankRoot.removeAttribute('inert'); restoreHead(bank.head); styles(true);
      if (!bankLoaded) { bankLoaded = true; try { await import(bank.entry); } catch { bankLoaded = false; bankRoot.textContent = 'The bank could not open. Please check your connection and try again.'; } }
    }
    window.dispatchEvent(new Event('receiz-bank:surface'));
    if (!learn) requestAnimationFrame(() => { if (document.body.dataset.bankSurface !== 'bank') return; const target = bankFocus?.isConnected ? bankFocus : bankRoot.querySelector('h1,main'); if (target) { if (!bankFocus) target.tabIndex = -1; target.focus({ preventScroll: true }); } });
    if (restoring && history.state?.publicNavigation) scrollTo(0, history.state.publicNavigation.scroll);
    else {
      let id; try { id = decodeURIComponent(location.hash.slice(1)); } catch { id = ''; }
      const target = learn && id ? document.getElementById(id) : null;
      if (target) { target.classList.add('visible'); target.querySelectorAll('.reveal').forEach(node => node.classList.add('visible')); target.scrollIntoView({ behavior: 'instant' }); }
      else scrollTo({ top: 0, behavior: 'instant' });
    }
  };
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]'); if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.download || link.target && link.target !== '_self') return;
    const url = new URL(link.href, location.href); if (url.origin !== location.origin || url.search || !publicPath(url.pathname) && url.pathname !== '/' || !publicPath(location.pathname) && location.pathname !== '/') return;
    if (pathname(url.pathname) === pathname(location.pathname) && publicPath(url.pathname)) return; // ordinary anchor navigation
    if (!publicPath(location.pathname)) bankUrl = location.pathname + location.search + location.hash;
    const target = url.pathname === '/' && publicPath(location.pathname) && bankLoaded ? bankUrl : url.pathname + url.hash;
    event.preventDefault(); remember(); history.pushState({ publicNavigation: { url: target, scroll: 0 } }, '', target); void render();
  });
  window.addEventListener('popstate', () => void render(true));
  if (publicPath(location.pathname)) { styles(false); if (!publicRoot) void render(); }
  // Intent preloads public code bytes only; no identity module executes here.
  document.addEventListener('pointerover', event => {
    if (bankLoaded || !event.target.closest?.('a[href="/"]') || document.getElementById('bank-code-preload')) return;
    const preload = document.createElement('link'); preload.id = 'bank-code-preload'; preload.rel = 'modulepreload'; preload.href = bank.entry; document.head.append(preload);
  }, { passive: true });
})();
