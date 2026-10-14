import { useEffect, useRef, useState } from 'react';
import type { CardCheckout } from '../../receiz/card-deposit';
const ORIGIN = 'https://receiz.com';
// Receiz owns the card runtime. The bank never collects card details or calls Stripe.
export function ReceizCardCheckout({ checkout, onCheck }: { checkout: CardCheckout; onCheck: () => Promise<void> }) {
  const frame = useRef<HTMLIFrameElement>(null), check = useRef(onCheck); check.current = onCheck;
  const [error, setError] = useState(''), [ready, setReady] = useState(false), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setReady(false); setError('');
    const timeout = setTimeout(() => setError('The secure card form did not load. Receiz’s checkout must allow this bank to embed it. Your deposit stays pending; no payment is confirmed.'), 20_000);
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || !event.data || typeof event.data !== 'object') return;
      const data = event.data;
      const native = event.origin === ORIGIN && data.source === 'receiz-pay-embed';
      const returned = event.origin === location.origin && data.source === 'receiz-bank-card-return';
      if (!native && !returned) return;
      if (native && data.type === 'checkout-error' && data.sessionId === null) { setError('Receiz could not open this checkout session. Check deposit status before trying again.'); clearTimeout(timeout); return; }
      if (data.sessionId !== checkout.sessionId) return;
      if (native && data.type === 'checkout-ready') { setReady(true); setError(''); clearTimeout(timeout); }
      if (native && data.type === 'checkout-complete' || returned && data.type === 'checkout-returned') void check.current();
      if (data.type === 'checkout-error') setError('Secure checkout needs attention. Check the deposit status before trying again.');
    };
    addEventListener('message', receive); return () => { clearTimeout(timeout); removeEventListener('message', receive); };
  }, [checkout.sessionId, attempt]);
  // Receiz accepts its bootstrap in the fragment as well as window.name.
  // A fragment never reaches the HTTP request or Referrer; Safari may clear
  // window.name across origins. The short-lived secret stays inside this frame.
  const name = JSON.stringify({ source: 'receiz-pay-embed-bootstrap', clientSecret: checkout.clientSecret, sessionId: checkout.sessionId, amountUsdCents: checkout.amountUsdCents });
  const fragment = new URLSearchParams({ client_secret: checkout.clientSecret, session_id: checkout.sessionId, amount_usd_cents: checkout.amountUsdCents });
  return <>{!ready && !error && <p className="body-copy" role="status">Loading secure card form…</p>}{error && <div className="note-box" role="status"><p>{error}</p></div>}<iframe key={attempt} ref={frame} title="Secure Receiz card deposit" className="receiz-card-frame" hidden={Boolean(error)} src={`${ORIGIN}/payments/embed/checkout#${fragment}`} name={name} referrerPolicy="no-referrer" allow="payment" />{error && <button className="secondary-button" onClick={() => setAttempt(value => value + 1)}>Reload secure form</button>}<button className="secondary-button" onClick={() => void onCheck()}>Check deposit status</button></>;
}
