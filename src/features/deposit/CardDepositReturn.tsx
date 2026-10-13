import { useEffect } from 'react';
export function readCardReturn(search: string): string | null {
  const query = new URLSearchParams(search); const session = query.get('session_id');
  return query.get('cardReturn') === '1' && query.getAll('session_id').length === 1 && /^cs_[a-zA-Z0-9_]{8,200}$/.test(session ?? '') ? session : null;
}
// Provider return is only a signal to check Receiz. It opens no identity and
// cannot assert payment or settlement.
export function CardDepositReturn({ sessionId }: { sessionId: string }) {
  useEffect(() => { if (window.parent !== window) window.parent.postMessage({ source: 'receiz-bank-card-return', type: 'checkout-returned', sessionId }, location.origin); }, [sessionId]);
  return <main className="entrance-content"><h1>Returning to your deposit.</h1><p className="body-copy">Receiz Bank will check the payment and your Reserve credit.</p><a className="primary-button" href="/#account/deposit" target="_top">Return to my account</a></main>;
}
