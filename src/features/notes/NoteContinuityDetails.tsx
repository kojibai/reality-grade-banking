import {ChevronDown} from 'lucide-react';

/** Static explanation. Opening it performs no custody probe or network work. */
export function NoteContinuityDetails(){
  return <details className="note-continuity-details">
    <summary>Using Notes offline<ChevronDown size={15} aria-hidden="true"/></summary>
    <p>Your original stays with you offline. Each send must be confirmed once. Qualified custody can do that on your device; other custody requires a connection for the next send.</p>
    <p>Receiving a completed transfer and being ready to send again are separate. An incoming transfer awaiting confirmation stays pending.</p>
    <p>Connected Note sending is not yet enabled in this integration.</p>
    <a href="/conformance/#note-continuity">Device support and technical requirements</a>
  </details>;
}
