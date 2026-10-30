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
    if (reducedMotion.matches || !window.IntersectionObserver) return;
    const regions = document.querySelectorAll('.motion-region');
    const reveals = document.querySelectorAll('.reveal');
    // User navigation paints already-carried public content immediately.
    // A second entrance animation must not make the next page look unloaded.
    if (event?.type === 'receiz-learn:page') reveals.forEach(node => node.classList.add('visible'));
    // Anchor navigation must never depend on an observer firing to reveal its destination.

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

      let id; try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
      const target = document.getElementById(id);
      target?.querySelectorAll('.reveal').forEach(node => node.classList.add('visible'));
      target?.classList.add('visible');
  };
  configureMotion();
  window.addEventListener('receiz-learn:page', configureMotion);
  const loadPublic=file=>file&&import('/learn/'+file+'.js').then(module=>module.init()).catch(()=>{});const fit=()=>{loadPublic(document.querySelector('[data-fit-directory]')?'business-fit':document.querySelector('.meet-public')?'meet':document.querySelector('[data-coop]')?'cooperatives':document.querySelector('.moments-page')?'moments':'');loadPublic(document.querySelector('[data-economy-interfaces],[data-economy-circle],[data-economy-numbers]')?'economy':'');};fit();addEventListener('receiz-learn:page',fit);
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
  if (!element?.textContent) return;
  const { pages, bank, aliases={}, styles:sharedStyleBlocks=[], reserved=['api','asset','assets','auth','docs','market','native','offline','source'] } = JSON.parse(element.textContent);
  // The parsed catalog is retained below; do not retain a second multi-megabyte
  // serialized copy in the document throughout every public workspace.
  // Keep the empty router marker: receipt return uses it to retain this root.
  element.textContent = '';
  // Shared CSS is carried once. Expand only the visited page, retaining its
  // exact head for subsequent visits. Legacy saved documents still use strings.
  for (const page of [...Object.values(pages),bank,bank.css]) for(const field in page) if (field!=='styles'&&Array.isArray(page[field])) {
    const parts = page[field];
    Object.defineProperty(page, field, {get() {
      const value = parts.map(part => typeof part === 'number' ? sharedStyleBlocks[part] : part).join('');
      Object.defineProperty(page, field, {value, writable:true});
      return value;
    }});
  }
  let publicRoot = document.getElementById('public-learn-root'), bankRoot = document.getElementById('root');
  let bankLoaded = !!bankRoot, bankUrl = '/', bankFocus = null;
  let bankLoading = null;
  const pathname = path => aliases[path=path.endsWith('/')?path:path+'/']||(path==='/explorer/'?'/explore/':path);
  const assetMetadata=new Map(),assetEntries=new Map();
  const profileNames=new Set(reserved);
  const profileName=path=>{const match=/^\/(?:u\/)?([a-z0-9_]{3,24})\/?$/.exec(path);return match&&(path.startsWith('/u/')||!(pages[pathname(path)]||profileNames.has(match[1])))?match[1]:null;};
  const keepAsset=value=>{if(value&&typeof value.id==='string'&&value.id.length<=256&&typeof value.title==='string'){assetMetadata.set(value.id,{...value,description:value.description??value.summary});assetEntries.delete(value.id);if(assetMetadata.size>48){const first=assetMetadata.keys().next().value;assetMetadata.delete(first);assetEntries.delete(first);}}};
  try{keepAsset(JSON.parse(document.getElementById('public-asset-seed')?.textContent??'null'));}catch{}
  const assetAt=path=>{
    const name=profileName(path),match=/^\/(asset|shares)\/([^/]+)\/?$/.exec(path),certificate=match?.[1]==='shares',base=pages['/explore/'];if(!base||!name&&!match)return;
    let id;try{id=name?'@'+name:(certificate?'certificate:':'')+decodeURIComponent(match[2]);}catch{return;}if(!id||id.length>256||/[\x00-\x1f\x7f]/.test(id))return;
    if(assetEntries.has(id))return assetEntries.get(id);
    const meta=assetMetadata.get(id),title=(meta?.title||(name?'@'+name:certificate?'Share certificate':'Public asset'))+' | Bankeiz',description=String(meta?.description||(name?'Public assets. Original work. Connected history.':'Ownership, value, proof.')).slice(0,300),url='https://bankeiz.com'+(name||certificate?path:'/asset/'+encodeURIComponent(id)+'/'),image=certificate?null:name?meta?.image:url+'og.png';
    const template=document.createElement('template');template.innerHTML=base.head;
    template.content.querySelector('title').textContent=title;
    for(const node of template.content.querySelectorAll('meta')){const key=node.getAttribute('property')||node.name;if(/^(og:|twitter:)?description$/.test(key))node.content=description;else if(/^(og|twitter):(title|image:alt)$/.test(key))node.content=title;else if(key==='og:url')node.content=url;else if(key==='og:type'&&name)node.content='profile';else if(/^(og:image(:secure_url)?|twitter:image)$/.test(key)&&image)node.content=image;else if(key==='robots')node.content=meta?'index,follow,max-image-preview:large':'noindex,follow';}
    if(!name&&meta?.media){
      for(const key in meta.media){
        const attribute=key[0]==='o'?'property':'name',node=template.content.querySelector(`meta[${attribute}="${key}"]`)||document.createElement('meta');
        node.setAttribute(attribute,key);node.content=meta.media[key];template.content.append(node);
      }
      template.content.append(Object.assign(document.createElement('link'),{rel:'alternate',type:'application/json+oembed',href:meta.oembed}));
    }
    template.content.querySelector('link[rel="canonical"]').href=url;
    template.content.querySelectorAll('script[type="application/ld+json"]').forEach(node=>node.remove());
    const schema=document.createElement('script');schema.type='application/ld+json';schema.textContent=JSON.stringify({'@context':'https://schema.org','@type':name?'ProfilePage':'WebPage','@id':url+'#page',url,name:title,description});template.content.append(schema);
    const preview=document.createElement('main');preview.className='public-entry-placeholder';const heading=document.createElement('h1'),copy=document.createElement('p');heading.textContent=meta?.title||(name?'Profile':'Asset');copy.textContent=description;preview.append(heading,copy);
    const entry={...base,title,head:template.innerHTML,content:preview.outerHTML};assetEntries.set(id,entry);if(assetEntries.size>48)assetEntries.delete(assetEntries.keys().next().value);return entry;
  };
  addEventListener('bankeiz:asset-metadata',event=>{keepAsset(event.detail);if(pathname(location.pathname)==='/asset/'+encodeURIComponent(event.detail?.id)+'/'){const page=assetAt(pathname(location.pathname));if(page)restoreHead(page.head);}});
  addEventListener('bankeiz:profile-metadata',event=>{const value=event.detail;if(!value||!profileName('/u/'+value.username+'/'))return;keepAsset({...value,id:'@'+value.username});if(profileName(pathname(location.pathname))===value.username){const page=assetAt(pathname(location.pathname));if(page)restoreHead(page.head);}});
  const pageAt = path => pages[pathname(path)] || assetAt(pathname(path)) || (/^\/verify\/[a-f0-9]{64}\/?$/.test(path) ? pages['/verify/'] : undefined);
  // An offline deep link can be served by the retained Learn document. Its
  // canonical identifies the markup actually present, not the requested URL.
  // The current document already owns its visible runtime; initialization is
  // not a navigation and must preserve its head, focus and scroll.
  const runtimeRoots = new Map([...document.querySelectorAll('[data-public-runtime]')].map(root => [root.dataset.publicRuntime, root]));
  const loaded = new Set(runtimeRoots.keys());
  let renderedPublicPath = pathname(new URL(document.querySelector('link[rel="canonical"]')?.href||location.href).pathname);
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
  const positions = new Map();
  // This router restores retained views after their destination DOM commits.
  // Disable native history restoration so it cannot race the same transition.
  history.scrollRestoration = 'manual';
  const currentScroll = () => document.body.style.position==='fixed' ? Math.max(0,-parseFloat(document.body.style.top)||0) : scrollY;
  const snapshot = () => ({ url: location.pathname + location.search + location.hash, scroll: currentScroll() });
  let displayedUrl=snapshot().url;
  const rememberPosition = (url,scroll) => {
    const source=new URL(url,location.origin),key=source.pathname+source.search;
    const bankPanel=source.pathname==='/'&&/^#(account|market|assets|ledger)(?:\/|$)/.exec(source.hash)?.[1];
    for(const value of new Set([url,...(bankPanel?['/#'+bankPanel]:[]),...(pageAt(source.pathname)?.runtime==='explore'&&!/^\/asset\//.test(source.pathname)?[key]:[])])){positions.delete(value);positions.set(value,scroll);}
    while(positions.size>96)positions.delete(positions.keys().next().value);
  };
  const remember = () => {
    const current=snapshot();rememberPosition(current.url,current.scroll);
    history.replaceState({ ...history.state, publicNavigation: current }, '');
  };
  const restoreHead = head => {
    const template = document.createElement('template'); template.innerHTML = head;
    const selector = 'title,meta[name="viewport"],meta[name="description"],meta[name="theme-color"],meta[name="robots"],meta[name="referrer"],meta[name^="apple-"],meta[property^="og:"],meta[name^="twitter:"],link[rel="canonical"],link[rel="alternate"],link[rel="manifest"],link[rel="icon"],link[rel="apple-touch-icon"],script[type="application/ld+json"],style[data-public-page-style]';
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
  // Both ordinary bank navigation and an explicit public asset action use this
  // one retained root and import. Loading alone does not select a page or head.
  const ensureBankRuntime = () => {
    if (!bankRoot) { bankRoot = document.createElement('div'); bankRoot.id = 'root'; bankRoot.innerHTML = bank.content || ''; hide(bankRoot); document.body.append(bankRoot); }
    if (bankLoaded) return Promise.resolve();
    if (!bankLoading) bankLoading = import(bank.entry).then(() => { bankLoaded = true; }).finally(() => { bankLoading = null; });
    return bankLoading;
  };
  addEventListener('bankeiz:request-bank-runtime', event => {
    const request = event.detail;
    if (!request || typeof request.resolve !== 'function' || typeof request.reject !== 'function') return;
    request.handled = true;
    void ensureBankRuntime().then(request.resolve, request.reject);
  });
  const anchorTarget = root => {
    try { return root?.querySelector('#' + CSS.escape(decodeURIComponent(location.hash.slice(1)))); } catch { return null; }
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
      const opening = ensureBankRuntime();
      show(bankRoot); destination = bankRoot; restoreHead(bank.head); styles(true);
      try { await opening; } catch { bankRoot.textContent = 'The bank could not open. Please check your connection and try again.'; }
    }
    // Pause hidden feeds, live clocks and dialogs before destination focus and
    // scroll. Public workspaces retain their exact React state and file input.
    window.dispatchEvent(new Event('receiz-bank:surface'));
    if (focusPublic) { const main = destination.querySelector('main'); if (main) { main.tabIndex = -1; main.focus({ preventScroll: true }); } }
    if (!page) requestAnimationFrame(() => { if (document.body.dataset.bankSurface !== 'bank') return; const target = bankFocus?.isConnected ? bankFocus : bankRoot.querySelector('h1,main'); if (target) { if (!bankFocus) target.tabIndex = -1; target.focus({ preventScroll: true }); } });
    const url=snapshot().url;
    if (restoring && (positions.has(url)||history.state?.publicNavigation?.url === url)) scrollTo({top:positions.get(url)??history.state.publicNavigation.scroll,behavior:'instant'});
    else {
      const target = page ? anchorTarget(destination) : null;
      if (target) { target.classList.add('visible'); target.querySelectorAll('.reveal').forEach(node => node.classList.add('visible')); target.scrollIntoView({ behavior: 'instant' }); }
      else scrollTo({ top: 0, behavior: 'instant' });
    }
    displayedUrl=url;
    if (page?.runtime) loadRuntime(page, destination);
  };
  const navigate = target => {
    const leavingAsset=/^\/asset\//.test(location.pathname),enteringAsset=/^\/asset\//.test(target);
    const returning = leavingAsset && (pageAt(target)?.runtime === 'explore' && !enteringAsset || /^\/#(?:account|market|assets|ledger)$/.test(target));
    const panel=location.pathname==='/'&&/^#(account|market|assets|ledger)(?:\/|$)/.exec(location.hash)?.[1];
    const assetReturnPath=enteringAsset?(leavingAsset?history.state?.assetReturnPath:panel?'/#'+panel:location.pathname):undefined;
    remember(); history.pushState({ ...(assetReturnPath?{assetReturnPath}:{}),publicNavigation: { url: target, scroll: returning ? positions.get(target) ?? 0 : 0 } }, '', target); void render(returning);
  };
  // Lazy public destinations reuse this retained router and catalog by reference.
  Object.assign(element,{pages,navigate});
  addEventListener('bankeiz:navigate-public',event=>{const path=event.detail?.path;if(typeof path==='string'&&path.length<100&&profileName(path)){navigate(path);}});
  // Retained call controls can return from a public workspace without a
  // synthetic link, a second router, or a document navigation.
  addEventListener('bankeiz:navigate-bank', event => {
    const request = event.detail;
    if (!request || typeof request.hash !== 'string' || request.hash.length > 2048 || !/^#(?:account|market|assets|ledger)(?:\/[^\s?#]*)?$/.test(request.hash)) return;
    if (!pageAt(location.pathname) && location.pathname !== '/') return;
    request.handled = true;
    navigate('/' + request.hash);
  });
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]'); if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.download || link.target && link.target !== '_self') return;
    const url = new URL(link.href, location.href); if (url.origin !== location.origin || url.search || !pageAt(url.pathname) && url.pathname !== '/' || !pageAt(location.pathname) && location.pathname !== '/') return;
    if (pathname(url.pathname) === pathname(location.pathname) && pageAt(url.pathname)) {
      if (url.hash) {
        // An explicit repeat click must reach the existing destination even when
        // the URL anchor is unchanged. Keep the conversation and history intact.
        if (url.hash === location.hash && !publicRoot?.hidden) {
          const target = anchorTarget(publicRoot);
          if (target) { event.preventDefault(); target.scrollIntoView(); }
        }
        return;
      }
      if (!location.hash) { event.preventDefault(); scrollTo({top:0,behavior:'instant'}); return; }
    }
    if (!pageAt(location.pathname)) bankUrl = location.pathname + location.search + location.hash;
    const target = url.pathname === '/' && !url.hash && pageAt(location.pathname) && bankLoaded ? bankUrl : url.pathname + url.hash;
    event.preventDefault(); navigate(target);
  });
  // popstate already exposes the destination URL. Save the view being left
  // under its retained URL before switching, so Forward also restores it.
  window.addEventListener('popstate', () => {rememberPosition(displayedUrl,currentScroll());void render(true);});
  window.addEventListener('bankeiz:receipt', () => {if (pages['/receipt/'] && pathname(location.pathname) === '/receipt/') void render();});
  if (pageAt(location.pathname)) { styles(false); if (renderedPublicPath!==pathname(location.pathname)) void render(); }
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
// Guide enhancements operate only on carried public markup. They never read an
// identity, fetch account data or execute an illustrative financial action.
document.addEventListener('click',event=>{
 const button=event.target.closest?.('[data-learning-step]');if(!button)return;
 const region=button.closest('.learning-visual'),selected=button.dataset.learningStep;
 region.dataset.learningStage=selected;
 region.querySelectorAll('[data-learning-step]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
 region.querySelectorAll('[data-learning-panel]').forEach(item=>{item.hidden=item.dataset.learningPanel!==selected;});
});
document.addEventListener('input',event=>{
 if(!event.target.matches?.('[data-example-input]'))return;
 const region=event.target.closest('[data-learning-funding]'),amount=Number(event.target.value),reserve=Math.min(amount,60),settlement=amount-reserve;
 region.querySelector('[data-example-amount]').textContent=`$${amount}`;
 region.querySelector('[data-example-title]').textContent='Settlement Note';
 region.querySelector('[data-example-reserve]').textContent=`$${reserve}`;
 region.querySelector('[data-example-settlement]').textContent=`$${settlement}`;
});
