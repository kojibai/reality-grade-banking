import type {PublicMarketItem} from './public-market';

const endpoint = 'https://receiz.com/api/profile/analytics/track';
const clientKey = 'receiz.profile.analytics.client_id.v1';
const sessionKey = 'receiz.profile.analytics.session_id.v1';
const usernamePattern = /^[a-z0-9_]{3,24}$/;
const originalPattern = /^(?:[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}|imported-[a-f0-9]{64})$/i;
export type EngagementSubject = {username: string; receizId: string; mediaKind?: string | null};
type EventName = 'original_impression' | 'original_open' | 'original_detail_view' | 'original_page_read' | 'original_download_click' | 'original_stream_play' | 'original_stream_pause' | 'original_stream_complete';
type Meta = Record<string, string | number | boolean | null>;
type Event = {subject: EngagementSubject; event: EventName; source: string; ts: string; durationSeconds?: number; meta?: Meta};

export function publicOriginalEngagement(item: PublicMarketItem | null | undefined) {
  if (item?.category !== 'proof' || !item.ownerIdentity || !originalPattern.test(item.assetId)) return;
  const username = item.ownerIdentity.username;
  if (!usernamePattern.test(username) || username !== item.ownerUsername) return;
  const path = '/' + username + '/verified/' + item.assetId;
  if (item.sourceUrl !== 'https://receiz.com' + path && item.sourceUrl !== 'https://receiz.com' + path + '/') return;
  return {username, receizId: item.assetId, mediaKind: item.mediaKind};
}

let clientId: string | undefined, sessionId: string | undefined;
let pending: Event[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;
const impressions = new Set<string>();
let impressionObserver: IntersectionObserver | undefined;
const impressionEntries = new WeakMap<Element, () => void>();
const impressionKey = (subject: EngagementSubject) => subject.username + ':' + subject.receizId;

export function observeOriginalImpression(element: Element, subject: EngagementSubject | undefined, source: string) {
  if (!subject || impressions.has(impressionKey(subject)) || typeof IntersectionObserver === 'undefined') return;
  impressionObserver ??= new IntersectionObserver(entries => {
    if (document.visibilityState === 'hidden') return;
    for (const entry of entries) {
      if (entry.isIntersecting && entry.intersectionRatio >= .48) impressionEntries.get(entry.target)?.();
    }
  }, {threshold: .48});
  const stop = () => {
    impressionObserver?.unobserve(element);
    impressionEntries.delete(element);
  };
  impressionEntries.set(element, () => {
    stop();
    trackPublicEngagement(subject, 'original_impression', source);
  });
  impressionObserver.observe(element);
  return stop;
}
const newId = () => crypto.randomUUID();
function storageId(key: string, storage: 'localStorage' | 'sessionStorage') {
  try {
    const existing = window[storage].getItem(key);
    if (existing) return existing;
    const id = newId();
    window[storage].setItem(key, id);
    return id;
  } catch {
    return newId();
  }
}

function sendPending() {
  clearTimeout(timer);
  window.removeEventListener('pagehide', sendPending);
  timer = undefined;
  const events = pending;
  pending = [];
  if (!events.length) return;
  clientId ??= storageId(clientKey, 'localStorage');
  sessionId ??= storageId(sessionKey, 'sessionStorage');
  for (const {subject, meta, ...data} of events) {
    const {username, receizId, mediaKind} = subject;
    if (data.event === 'original_impression') {
      try {
        const key = 'receiz.profile.analytics.once.impression:' + impressionKey(subject);
        if (sessionStorage.getItem(key)) continue;
        sessionStorage.setItem(key, '1');
      } catch { /* The current document still deduplicates impressions. */ }
    }
    const body = JSON.stringify({...data, username, receizId, actorClientId: clientId, actorSessionId: sessionId,
      meta: {...meta, mediaKind: mediaKind ?? null, attributionSource: 'bankeiz.com', attributionType: 'referrer'}});
    // A plain-text JSON body uses the existing receiver without a preflight.
    // Analytics has no credentials and the response is never needed by the UI.
    void fetch(endpoint, {method: 'POST', body, mode: 'no-cors', credentials: 'omit', referrerPolicy: 'no-referrer', keepalive: true}).catch(() => {});
  }
}

export function trackPublicEngagement(subject: EngagementSubject | undefined, event: EventName, source: string, durationSeconds?: number, meta?: Meta) {
  if (!subject || !usernamePattern.test(subject.username) || typeof window === 'undefined') return;
  if ((navigator as Navigator & {globalPrivacyControl?: boolean}).globalPrivacyControl || navigator.doNotTrack === '1') return;
  if (event === 'original_impression') {
    const key = impressionKey(subject);
    if (impressions.has(key)) return;
    if (impressions.size >= 2048) impressions.delete(impressions.values().next().value!);
    impressions.add(key);
  }
  if (timer === undefined) {
    window.addEventListener('pagehide', sendPending, {once: true});
    timer = setTimeout(sendPending, 0);
  }
  pending.push({subject, event, source, ts: new Date().toISOString(), durationSeconds, meta});
}

export function observePublicEngagement(subject: EngagementSubject | undefined, source: string, pageNumber?: number) {
  if (!subject || typeof window === 'undefined') return;
  let started: number | undefined;
  let opened = false;
  const flush = () => {
    if (started === undefined) return;
    const elapsed = (performance.now() - started) / 1000;
    started = undefined;
    if (pageNumber !== undefined) {
      if (elapsed >= 1.5) trackPublicEngagement(subject, 'original_page_read', source, Math.min(180, elapsed), {pageNumber});
    } else if (elapsed > .25) {
      trackPublicEngagement(subject, 'original_detail_view', source, elapsed, {durationOnly: true});
    }
  };
  const visibility = () => {
    if (document.visibilityState === 'hidden') { flush(); return; }
    started ??= performance.now();
    if (opened || pageNumber !== undefined) return;
    opened = true;
    trackPublicEngagement(subject, 'original_detail_view', source);
  };
  const pagehide = () => { flush(); sendPending(); };
  visibility();
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pagehide', pagehide);
  window.addEventListener('pageshow', visibility);
  return () => {
    flush();
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('pagehide', pagehide);
    window.removeEventListener('pageshow', visibility);
  };
}

export function observePublicPlayback(media: HTMLMediaElement, subject: EngagementSubject | undefined, source: string) {
  if (!subject || typeof window === 'undefined') return;
  let playbackSessionId: string | undefined;
  let started: number | undefined;
  let seconds = 0, sentSeconds = 0, position = 0;
  let completed = false, reportPlay = true;
  const stopClock = () => {
    if (started !== undefined) seconds += (performance.now() - started) / 1000 * media.playbackRate;
    started = undefined;
  };
  const playing = () => {
    if (!playbackSessionId) {
      playbackSessionId = newId();
      seconds = sentSeconds = 0;
      completed = false;
      reportPlay = true;
    }
    if (reportPlay) {
      trackPublicEngagement(subject, 'original_stream_play', source, undefined, {playbackSessionId});
      reportPlay = false;
    }
    started ??= performance.now();
  };
  const flush = (complete = false) => {
    stopClock();
    if (!playbackSessionId || (!complete && seconds <= sentSeconds)) return;
    sentSeconds = seconds;
    trackPublicEngagement(subject, complete ? 'original_stream_complete' : 'original_stream_pause', source, seconds, {playbackSessionId});
  };
  const pause = () => flush();
  const paused = () => {
    if (media.ended) return;
    pause();
    reportPlay = true;
  };
  const end = () => {
    if (!completed) flush(true);
    playbackSessionId = undefined;
  };
  const completeLoop = () => {
    // Native looping seeks back to zero instead of dispatching ended. A seek
    // that never played the end of the media must not count as a completion.
    if (!media.loop || completed || !(media.duration > 0) || position <= media.duration - .5 || media.currentTime >= .5) return;
    const played = media.played;
    if (!played.length || played.end(played.length - 1) < media.duration - .02) return;
    flush(true);
    completed = true;
  };
  const time = () => {
    completeLoop();
    position = media.currentTime;
    // Reuse the browser's running clock for the same bounded witness cadence.
    if (started !== undefined && seconds + (performance.now() - started) / 1000 * media.playbackRate >= sentSeconds + 15) {
      flush();
      started = performance.now();
    }
  };
  const seeking = () => { completeLoop(); position = media.currentTime; stopClock(); };
  const seeked = () => { if (playbackSessionId && !media.paused && media.readyState >= 3) started ??= performance.now(); };
  const emptied = () => { pause(); playbackSessionId = undefined; position = 0; };
  const pagehide = () => { pause(); sendPending(); };
  const resume = () => { if (!media.paused && media.readyState >= 3) playing(); };
  const listeners = {playing, pause: paused, ended: end, waiting: stopClock, seeking, seeked, timeupdate: time, emptied};
  for (const [name, handle] of Object.entries(listeners)) media.addEventListener(name, handle, true);
  window.addEventListener('pagehide', pagehide);
  window.addEventListener('pageshow', resume);
  resume();
  return () => {
    pause();
    for (const [name, handle] of Object.entries(listeners)) media.removeEventListener(name, handle, true);
    window.removeEventListener('pagehide', pagehide);
    window.removeEventListener('pageshow', resume);
  };
}
