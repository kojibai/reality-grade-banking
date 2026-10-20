import {ChevronDown} from 'lucide-react';

/** Static explanation. Opening it performs no custody probe or network work. */
export function NoteContinuityDetails(){
  return <details className="note-continuity-details">
    <summary>Offline creation standard<ChevronDown size={15} aria-hidden="true"/></summary>
    <p>Creating a Note offline requires protected state that cannot authorize the same value twice. This device or browser path does not expose the required conforming custody.</p>
    <p>You can still receive and retain a completed Note offline. Connect before creating the next Note from your balance.</p>
    <a href="/conformance/#note-continuity">Requirements and platform integration</a>
  </details>;
}
