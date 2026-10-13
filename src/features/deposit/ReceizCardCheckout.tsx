import { useEffect, useRef, useState } from 'react';
import type { CardCheckout } from '../../receiz/card-deposit';
const ORIGIN = 'https://receiz.com';
// Receiz owns the card runtime. The bank never collects card details or calls Stripe.
export function ReceizCardCheckout({ checkout, onCheck }: { checkout: CardCheckout; onCheck: () => Promise<void> }) {
  const frame = useRef<HTMLIFrameElement>(null), check = useRef(onCheck); check.current = onCheck;
  const [error, setError] = useState('');
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || !event.data || typeof event.data !== 'object') return;
      const data = event.data;
      const native = event.origin === ORIGIN && data.source === 'receiz-pay-embed';
      const returned = event.origin === location.origin && data.source === 'receiz-bank-card-return';
      if ((!native && !returned) || data.sessionId !== checkout.sessionId) return;
      if (native && data.type === 'checkout-complete' || returned && data.type === 'checkout-returned') void check.current();
      if (data.type === 'checkout-error') setError('Secure checkout needs attention. Check the deposit status before trying again.');
    };
    addEventListener('message', receive); return () => removeEventListener('message', receive);
  }, [checkout.sessionId]);
  // The native Receiz bootstrap uses window.name, keeping the credential out of URLs/referrers.
  const name = JSON.stringify({ source: 'receiz-pay-embed-bootstrap', clientSecret: checkout.clientSecret, sessionId: checkout.sessionId, amountUsdCents: checkout.amountUsdCents });
  return <><iframe ref={frame} title="Secure Receiz card deposit" className="receiz-card-frame" src={`${ORIGIN}/payments/embed/checkout`} name={name} referrerPolicy="no-referrer" allow="payment" />{error && <p role="status" className="error-message">{error}</p>}<button className="secondary-button" onClick={() => void onCheck()}>Check deposit status</button></>;
}
