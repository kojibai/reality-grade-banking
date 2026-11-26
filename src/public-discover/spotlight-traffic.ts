const path = '/api/bank/spotlight/in-view';
const minimumRatio = 0.5;
const minimumMs = 1_000;

const targets = new Map<Element, boolean>();
let observer: IntersectionObserver | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
let candidate: Element | undefined;
let sampled = false;

const foreground = () => document.visibilityState === 'visible';
const permitsMeasurement = () => (navigator as Navigator & {globalPrivacyControl?: boolean}).globalPrivacyControl !== true
  && navigator.doNotTrack !== '1';

function updateVisibility(entries: readonly IntersectionObserverEntry[]) {
  for (const entry of entries) {
    if (targets.has(entry.target)) targets.set(entry.target, entry.isIntersecting && entry.intersectionRatio >= minimumRatio);
  }
}

function clearCandidate() {
  clearTimeout(timer);
  timer = undefined;
  candidate = undefined;
}

function stopObserving() {
  clearCandidate();
  observer?.disconnect();
  observer = undefined;
  targets.clear();
  document.removeEventListener('visibilitychange', selectCandidate);
}

function selectCandidate() {
  const maySample = foreground() && permitsMeasurement();
  if (candidate && maySample && targets.get(candidate)) return;
  clearCandidate();
  if (!maySample) return;
  candidate = [...targets].find(([element, inView]) => inView && element.isConnected)?.[0];
  if (!candidate) return;

  timer = setTimeout(() => {
    updateVisibility(observer?.takeRecords() ?? []);
    if (!candidate?.isConnected || !targets.get(candidate) || !foreground() || !permitsMeasurement()) {
      clearCandidate();
      selectCandidate();
      return;
    }
    sampled = true;
    stopObserving();
    // The optional measurement has no response or state dependency in Discover.
    void fetch(path, {
      method: 'POST', mode: 'same-origin', credentials: 'omit', keepalive: true, referrerPolicy: 'same-origin',
    }).catch(() => {});
  }, minimumMs);
}

export function observeDiscoverVenueAudience(element: Element) {
  if (sampled || !permitsMeasurement() || typeof IntersectionObserver === 'undefined') return;
  if (!observer) {
    observer = new IntersectionObserver(entries => {
      updateVisibility(entries);
      selectCandidate();
    }, {threshold: minimumRatio});
    document.addEventListener('visibilitychange', selectCandidate);
  }
  targets.set(element, false);
  observer.observe(element);
  return () => {
    observer?.unobserve(element);
    targets.delete(element);
    if (targets.size === 0) stopObserving();
    else selectCandidate();
  };
}
