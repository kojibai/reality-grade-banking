import type { DeliveryInstructions } from '../../receiz/custody-delivery';
import { RECEIZ_DELIVERY_DESTINATION } from '../../receiz/custody-delivery';
export function CustodyDelivery({ instructions }: { instructions?: DeliveryInstructions }) {
  const destination = instructions ?? RECEIZ_DELIVERY_DESTINATION;
  return <div className="custody-delivery"><h3>{instructions ? 'Send your item to' : 'Delivery to'} {destination.recipient}</h3><address>{destination.recipient}<br />{destination.addressLines.map(line => <span key={line}>{line}<br /></span>)}</address>{instructions && <><span className="muted">Deposit reference</span><code className="proof-coordinate">{instructions.reference}</code><p className="body-copy small-copy">Include this reference with your item. Ownership becomes transferable after it is received and verified.</p></>}</div>;
}
