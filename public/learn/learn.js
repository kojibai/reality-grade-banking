// Presentation only: no identity reads, requests, account changes, or third-party runtime.
(() => {
  const root = document.documentElement;
  const header = document.querySelector('.learn-header');
  const progress = document.querySelector('.reading-progress');
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
    header?.classList.toggle('scrolled', scrollY > 12);
    const range = root.scrollHeight - innerHeight;
    if (progress) progress.style.transform = `scaleX(${range > 0 ? Math.min(1, Math.max(0, scrollY / range)) : 0})`;
  };
  const schedule = () => { if (!scheduled) { scheduled = true; requestAnimationFrame(readProgress); } };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  readProgress();
})();
