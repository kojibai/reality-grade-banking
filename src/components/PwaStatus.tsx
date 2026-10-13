import { useEffect, useState } from 'react';
export function PwaStatus() {
  const [status, setStatus] = useState(import.meta.env.PROD ? 'Preparing offline shell' : 'Available in production build');
  useEffect(() => { if (!import.meta.env.PROD) return; if (!('serviceWorker' in navigator)) { setStatus('Not supported in this browser'); return; } navigator.serviceWorker.ready.then(() => setStatus('Ready for offline use')).catch(() => setStatus('Offline shell unavailable')); }, []);
  return <div className="pwa-status"><span>Installable app</span><strong>{status}</strong><p>Use your browser’s Install or Add to Home Screen action.</p></div>;
}
