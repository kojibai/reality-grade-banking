// Presentation only: no identity reads, requests, account changes, or third-party runtime.
(() => {
  const root = document.documentElement;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let revealObserver;
  let motionObserver;
  const configureMotion = event => {
    revealObserver?.disconnect();
    motionObserver?.disconnect();
    root.classList.remove('motion-ready');
    if (reducedMotion.matches || !('IntersectionObserver' in window)) return;
    const regions = document.querySelectorAll('.motion-region');
    const reveals = document.querySelectorAll('.reveal');
    // User navigation paints already-carried public content immediately.
    // A second entrance animation must not make the next page look unloaded.
    if (event?.type === 'receiz-learn:page') reveals.forEach(node => node.classList.add('visible'));
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
  addEventListener('receiz-learn:page', schedule);
  readProgress();
})();

// All public guides and legal notices are preloaded, public build output. Keep the mounted
// account DOM and device session when entering/returning from the guides.
(() => {
  const element = document.getElementById('receiz-navigation');
  if (!element) return;
  const { pages, bank } = JSON.parse(element.textContent);
  let publicRoot = document.getElementById('public-learn-root'), bankRoot = document.getElementById('root');
  let bankLoaded = Boolean(bankRoot), bankUrl = '/', bankFocus = null;
  const pathname = path => /^\/explorer\/?$/.test(path) ? '/explore/' : path === '/' ? '/' : path.endsWith('/') ? path : path + '/';
  const pageAt = path => pages[pathname(path)] || (/^\/verify\/[a-f0-9]{64}\/?$/.test(path) ? pages['/verify/'] : undefined);
  const publicPath = path => Boolean(pageAt(path));
  let renderedPublicPath = publicRoot && publicPath(location.pathname) ? pathname(location.pathname) : null;
  const runtimeRoots = new Map([...document.querySelectorAll('[data-public-runtime]')].map(root => [root.dataset.publicRuntime, root]));
  const loaded = new Set(runtimeRoots.keys());
  const hide = root => { if (root) { root.hidden = true; root.setAttribute('inert', ''); } };
  const show = root => { root.hidden = false; root.removeAttribute('inert'); };
  const loadRuntime = (page, root) => {
    if (loaded.has(page.runtime)) return;
    loaded.add(page.runtime);
    // Markup and exact CSS paint synchronously. Execute only the selected
    // public workspace; retained workspaces never remount on return.
    void import(page.entry).catch(() => {
      loaded.delete(page.runtime);
      const status = document.createElement('p'), retry = document.createElement('button');
      status.setAttribute('role', 'status'); status.textContent = 'This workspace could not open. ';
      retry.textContent = 'Try again'; retry.onclick = () => { status.remove(); loadRuntime(page, root); };
      status.append(retry); root.append(status);
    });
  };
  const snapshot = () => ({ url: location.pathname + location.search + location.hash, scroll: scrollY });
  const remember = () => history.replaceState({ ...history.state, publicNavigation: snapshot() }, '');
  const restoreHead = head => {
    const template = document.createElement('template'); template.innerHTML = head;
    const selector = 'title,meta[name="viewport"],meta[name="description"],meta[name="theme-color"],meta[name="robots"],meta[name="referrer"],meta[name^="apple-"],meta[property^="og:"],meta[name^="twitter:"],link[rel="canonical"],link[rel="manifest"],link[rel="icon"],link[rel="apple-touch-icon"],script[type="application/ld+json"],style[data-public-page-style]';
    // Keep shared viewport, icons and other unchanged metadata attached. Replacing
    // the viewport on each guide can relayout mobile browser chrome.
    const key = node => node.tagName + ':' + (node.getAttribute('name') || node.getAttribute('property') || node.getAttribute('rel') || node.getAttribute('type') || '');
    const retained = new Map();
    document.head.querySelectorAll(selector).forEach(node => {
      const name = key(node); if (!retained.has(name)) retained.set(name, []);
      retained.get(name).push(node);
    });
    template.content.querySelectorAll(selector).forEach(next => {
      const current = retained.get(key(next))?.shift();
      if (!current) { document.head.append(next); return; }
      for (const attribute of [...current.attributes]) if (!next.hasAttribute(attribute.name)) current.removeAttribute(attribute.name);
      for (const attribute of next.attributes) if (current.getAttribute(attribute.name) !== attribute.value) current.setAttribute(attribute.name, attribute.value);
      if (current.textContent !== next.textContent) current.textContent = next.textContent;
    });
    for (const remaining of retained.values()) remaining.forEach(node => node.remove());
  };
  const renderPublicContent = content => {
    const template = document.createElement('template'); template.innerHTML = content;
    const header = publicRoot.querySelector(':scope > .learn-header'), nextHeader = template.content.querySelector('.learn-header');
    const skip = publicRoot.querySelector(':scope > .skip-link');
    if (!header || !nextHeader) { publicRoot.replaceChildren(template.content); return; }
    nextHeader.remove();
    if (skip) template.content.querySelector('.skip-link')?.remove();
    // Do not detach the retained header, even into a fragment: its painted
    // surface, scroll state and focused navigation remain continuous.
    for (const child of [...publicRoot.childNodes]) if (child !== header && child !== skip) child.remove();
    publicRoot.append(template.content);
  };
  const styles = on => {
    const critical = document.getElementById('bankeiz-opening-critical'); if (critical) critical.media = on ? 'all' : 'not all';
    for (const url of bank.styles) {
      let embedded = [...document.head.querySelectorAll('style[data-bank-stylesheet]')].find(item => item.dataset.bankStylesheet === url);
      if (!embedded && on && bank.css?.[url]) { embedded = document.createElement('style'); embedded.dataset.bankStylesheet = url; embedded.textContent = bank.css[url]; document.head.append(embedded); }
      if (embedded) { embedded.media = on ? 'all' : 'not all'; continue; }
      let link = [...document.head.querySelectorAll('link[rel="stylesheet"]')].find(item => item.getAttribute('href') === url);
      if (!link && on) { link = document.createElement('link'); link.rel = 'stylesheet'; link.href = url; document.head.append(link); }
      if (link) link.disabled = !on;
    }
  };
  const render = async (restoring = false) => {
    const path = pathname(location.pathname), page = pageAt(path), learn = Boolean(page && !page.runtime);
    let focusPublic = false, destination;
    if (!page && path !== '/') return;
    document.documentElement.classList.toggle('learn-surface', learn);
    document.body.dataset.bankSurface = page?.runtime || (learn ? 'learn' : 'bank');
    for (const root of runtimeRoots.values()) hide(root);
    if (page) {
      document.documentElement.classList.add('public-navigation-instant');
      if (bankRoot?.contains(document.activeElement)) bankFocus = document.activeElement;
      hide(bankRoot);
      if (page.runtime) {
        hide(publicRoot);
        let root = runtimeRoots.get(page.runtime);
        if (!root) {
          root = document.createElement('div'); root.id = 'public-' + page.runtime + '-root'; root.dataset.publicRuntime = page.runtime;
          root.innerHTML = page.content; runtimeRoots.set(page.runtime, root); document.body.append(root);
        }
        show(root); destination = root; focusPublic = true;
      } else {
        if (!publicRoot) { publicRoot = document.createElement('div'); publicRoot.id = 'public-learn-root'; document.body.append(publicRoot); }
        const returning = publicRoot.hidden; show(publicRoot); destination = publicRoot;
        const changed = renderedPublicPath !== path;
        if (changed) { renderPublicContent(page.content); renderedPublicPath = path; }
        focusPublic = changed || returning;
        if (changed) window.dispatchEvent(new Event('receiz-learn:page'));
      }
      restoreHead(page.head); styles(false);
    } else {
      hide(publicRoot);
      if (!bankRoot) { bankRoot = document.createElement('div'); bankRoot.id = 'root'; bankRoot.innerHTML = bank.content || ''; document.body.append(bankRoot); }
      show(bankRoot); destination = bankRoot; restoreHead(bank.head); styles(true);
      if (!bankLoaded) { bankLoaded = true; try { await import(bank.entry); } catch { bankLoaded = false; bankRoot.textContent = 'The bank could not open. Please check your connection and try again.'; } }
    }
    // Pause hidden feeds, live clocks and dialogs before destination focus and
    // scroll. Public workspaces retain their exact React state and file input.
    window.dispatchEvent(new Event('receiz-bank:surface'));
    if (focusPublic) { const main = destination.querySelector('main'); if (main) { main.tabIndex = -1; main.focus({ preventScroll: true }); } }
    if (!page) requestAnimationFrame(() => { if (document.body.dataset.bankSurface !== 'bank') return; const target = bankFocus?.isConnected ? bankFocus : bankRoot.querySelector('h1,main'); if (target) { if (!bankFocus) target.tabIndex = -1; target.focus({ preventScroll: true }); } });
    if (restoring && history.state?.publicNavigation?.url === snapshot().url) scrollTo(0, history.state.publicNavigation.scroll);
    else {
      let id; try { id = decodeURIComponent(location.hash.slice(1)); } catch { id = ''; }
      const target = page && id ? destination.querySelector('[id="' + CSS.escape(id) + '"]') : null;
      if (target) { target.classList.add('visible'); target.querySelectorAll('.reveal').forEach(node => node.classList.add('visible')); target.scrollIntoView({ behavior: 'instant' }); }
      else scrollTo({ top: 0, behavior: 'instant' });
    }
    if (page?.runtime) loadRuntime(page, destination);
  };
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]'); if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.download || link.target && link.target !== '_self') return;
    const url = new URL(link.href, location.href); if (url.origin !== location.origin || url.search || !publicPath(url.pathname) && url.pathname !== '/' || !publicPath(location.pathname) && location.pathname !== '/') return;
    if (pathname(url.pathname) === pathname(location.pathname) && publicPath(url.pathname)) {
      if (url.hash) return; // ordinary same-page anchor navigation
      if (!location.hash) { event.preventDefault(); scrollTo({top:0,behavior:'instant'}); return; }
    }
    if (!publicPath(location.pathname)) bankUrl = location.pathname + location.search + location.hash;
    const target = url.pathname === '/' && publicPath(location.pathname) && bankLoaded ? bankUrl : url.pathname + url.hash;
    event.preventDefault(); remember(); history.pushState({ publicNavigation: { url: target, scroll: 0 } }, '', target); void render();
  });
  window.addEventListener('popstate', () => void render(true));
  window.addEventListener('bankeiz:receipt', () => {if (pages['/receipt/'] && pathname(location.pathname) === '/receipt/') void render();});
  if (publicPath(location.pathname)) { styles(false); if (!publicRoot) void render(); }
  // Pointer/keyboard intent fetches code bytes only; no account module or
  // hidden workspace executes before navigation selects that destination.
  const preload = event => {
    const link = event.target.closest?.('a[href]'); if (!link) return;
    const url = new URL(link.href, location.href); if (url.origin !== location.origin || url.search) return;
    const page = pageAt(url.pathname), entry = page?.entry || (url.pathname === '/' ? bank.entry : null);
    if (!entry || page?.runtime && loaded.has(page.runtime) || url.pathname === '/' && bankLoaded) return;
    if ([...document.head.querySelectorAll('link[rel="modulepreload"]')].some(node => node.getAttribute('href') === entry)) return;
    const code = document.createElement('link'); code.rel = 'modulepreload'; code.href = entry; document.head.append(code);
  };
  document.addEventListener('pointerover', preload, { passive: true });
  document.addEventListener('focusin', preload);
})();
