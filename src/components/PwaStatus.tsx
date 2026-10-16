import { useEffect, useState } from 'react';
import { readOfflineReadiness } from '../pwa/offline-status';
export function PwaStatus() {
  const [status, setStatus] = useState(import.meta.env.PROD ? 'Preparing offline shell' : 'Available in production build');
  useEffect(() => {
    if (!import.meta.env.PROD) return;
    const container = navigator.serviceWorker; let mounted = true;
    const refresh = () => { void readOfflineReadiness(container).then(value => { if (mounted) setStatus(value); }); };
    refresh(); if (container) void container.ready.then(refresh);
    container?.addEventListener('controllerchange', refresh); window.addEventListener('online', refresh); window.addEventListener('pageshow', refresh);
    return () => { mounted = false; container?.removeEventListener('controllerchange', refresh); window.removeEventListener('online', refresh); window.removeEventListener('pageshow', refresh); };
  }, []);
  return <div className="pwa-status"><span>Installable app</span><strong>{status}</strong><p>Use your browser’s Install or Add to Home Screen action.</p></div>;
}
